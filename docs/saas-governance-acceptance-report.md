# SaaS 租户隔离与统一鉴权验收报告

## 1. 范围

本批覆盖 `01.01-01.02` 的真实租户上下文、角色权限、套餐权益、功能开关、导出、文件存储和异步任务边界。

- 双租户 API/数据库 smoke：`.local-logs/saas-tenant-acceptance-1784210500000/result.json`
- 治理专项 API：`.local-logs/saas-governance-1784210800000/result.json`
- PC 浏览器：`.local-logs/browser-saas-governance-1784210783542/result.json`
- 环境：最终 Docker API、MySQL 8.4、Nginx PC/H5

## 2. 实际缺陷与整改

首次保存新租户运营配置时，数据库没有 `operation_settings` 记录。旧逻辑使用 `{ id: tenantId }` 关系占位创建记录，随后订阅校验读取不到 `enabled` 字段，把正常租户误判为停用，导致第一次保存返回 404，第二次才成功。

整改：

- 新增 `loadOperationSettingTenantForCreate`，首次创建前加载并校验完整启用租户实体。
- 新租户配置关系保存使用完整实体，不再把 `{ id }` 占位对象交给后续订阅检查。
- 增加缺失租户、停用租户、平台配置和首次保存成功 3 项回归测试。
- 建数脚本支持显式套餐计划，双租户治理验收使用 `city_partner` 验证代理结算边界；现有业务租户数据未删除。
- 租户 smoke 脚本同步当前会员 Bearer 鉴权、明确微信支付方式，并以财务列表复核支付回调，避免旧断言依赖已脱敏的租户实体。

## 3. API/数据库证据

保留测试租户：

- A：`saas-final-a`，租户 ID `42`，运营 `saas_final_a_admin`，财务 `saas_final_a_finance`。
- B：`saas-final-b`，租户 ID `43`，运营 `saas_final_b_admin`，财务 `saas_final_b_finance`。
- 测试租户密码：A 为 `SaasFinal123456Aa`，B 为 `SaasFinal123456Bb`。

| 验收项 | 结果 |
| --- | --- |
| 首页、公告、运营配置 | A/B 各自写入并读取自己的内容，对方内容不可见 |
| 活动列表和详情 | 各自活动可见；跨租户活动 ID 猜测返回失败 |
| 报名导出 | A/B Excel 只包含本租户活动和报名 |
| 角色权限 | 运营访问财务看板返回 403；财务可执行财务查询 |
| 套餐权益 | 标准版代理结算被拦截；`city_partner` 验收租户可执行结算边界流程 |
| 支付回调 | 回调伪造 `tenantId`/`tenantCode` 后，A 财务仍看到 A 订单已支付，B 查询不到该订单 |
| 图片文件 | A 对象键含 `images-t42-a173`，B 对象键含 `images-t43-a175` |
| 异步任务唯一键 | A/B 使用相同 type/idempotencyKey 可各自创建，证明唯一键含 tenantId |
| 异步任务列表 | A/B 只能看到自己的任务 |
| 异步任务操作 | B 取消 A 任务返回 404；A/B 各自取消本租户任务成功 |

保留异步任务：A `64`、B `65`，幂等键 `saas-governance-1784210691624`。

## 4. 浏览器证据

PC 1440x1000 浏览器通过：

- `saas-final-a` 运营账号活动列表只显示 A 活动，财务路由被拦截。
- `saas-final-b` 运营账号活动列表只显示 B 活动，财务路由被拦截。

截图：

- `.local-logs/browser-saas-governance-1784210783542/saas-final-a-activities.png`
- `.local-logs/browser-saas-governance-1784210783542/saas-final-b-activities.png`

## 5. 回归与制品

- API：93 个测试文件、546 项测试通过。
- 全部 preflight guards、`git diff --check` 通过。
- 最终 API 镜像：`sha256:3dc6f2443895147a84c8a5fae3b1ef94285361266154f72dcbf1963361059d55`。
- 完整线上演示 smoke 通过；健康监控 `ok`、告警 0。
- 备份：`backups/mysql/activity_registration-20260716-221627.sql.gz`。
- 备份大小 `922,367` bytes，解压 `12,786,198` bytes，gzip 校验通过。
- SHA-256：`714E3385258857FB1554061734AC0EC275EFBEF998AAC347E3D431A1E706E796`。

## 6. 当前边界

本报告证明真实本地生产形态的核心租户、角色、导出、文件和任务边界。仍需在后续全量治理阶段继续完成未逐模块覆盖的缓存键审计、生产对象存储私有桶策略、异地任务/备份演练、真机和正式外部通道验收，因此本批不宣布全项目完成。
