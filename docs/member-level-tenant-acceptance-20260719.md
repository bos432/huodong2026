# 会员等级租户化、权益快照与升降级追溯验收报告

## 1. 验收结论

本报告对应持续开发计划 `11.01.45`。会员等级已从全局共享模型升级为“平台模板 + 租户实例”，活动、课程、活动订单、公告、营销弹窗和广告投放均执行等级租户边界校验；会员档案、活动订单和课程订单保存不可随配置变化回写的权益快照；自动升降级、有效期、人工调整和历史追溯已形成服务端闭环。

验收结论：通过。migration 已在隔离数据库完成 `up/down/up` 演练并在主库执行，数据库现有 180 个 migration 全部执行。真实 API、应用内浏览器、全量测试、全端构建、完整 preflight、主库审计和 Docker readiness 均通过。

正式短信、微信、支付、对象存储、生产域名、HTTPS 和安全密钥仍属于全项目上线前外部配置项，不影响本工作包代码验收结论。

## 2. 数据模型与迁移

- `member_levels` 增加租户作用域、模板来源和版本信息，平台等级保留为模板，各租户使用独立实例。
- `member_profiles` 保存当前等级权益快照、等级起止时间、来源和人工覆盖信息。
- 新增 `member_level_changes`，记录前后等级、成长值、权益快照、来源、原因、操作者和发生时间。
- 数据库 trigger 自动记录等级变化，并拒绝修改或删除历史记录。
- 活动、课程、活动订单及公告、营销弹窗、广告受众中的旧等级引用已迁移到对应租户实例。
- migration `1783870000000-MemberLevelTenantGovernance` 支持回滚到模板引用；存在无模板租户自定义等级时拒绝危险回滚。

迁移前备份：

- `backups/mysql/activity_registration-20260719-033731.sql.gz`
- 基线备份 `backups/mysql/activity_registration-20260719-030749.sql.gz`

隔离演练数据库：`activity_registration_member_level_test`。

隔离演练证据：`.local-logs/member-level-migration-1784401923168/`，包含 `final-baseline.json`、`final-up.json`、`up-1.json`、`down.json` 和 `up-2.json`。

## 3. 租户边界与等级规则

- 同名等级允许分别存在于不同租户，但同一作用域内保持唯一。
- 租户后台只能读取、选择和维护本租户等级；平台后台可切换平台模板或指定租户实例。
- 活动最低等级、优先报名等级、课程所需等级、公告受众、营销弹窗受众和广告受众均由服务端复核租户归属。
- 跨租户等级 ID 不会被静默接受，创建或更新请求返回 400。
- 自动升降级只匹配会员档案所属 `tenantScopeKey`，不会命中其他租户同名或同门槛等级。
- 人工等级覆盖在有效期内优先于成长值自动重算；覆盖到期后恢复自动等级计算。

## 4. 权益快照与历史追溯

- 会员获得等级时冻结等级名称、版本、成长门槛、有效天数、折扣率、优先报名和结构化权益。
- 修改等级配置后，旧会员权益快照保持原版本，新获得等级的会员冻结新版本。
- 活动订单保存会员等级权益快照，历史优惠不随等级配置变更。
- 课程订单同时保存会员当时权益快照和课程当前所需等级快照，便于后续退款、权限回收和审计。
- `POST /admin/members/:userId/level` 要求目标等级和非空原因，服务端记录管理员、来源、前后等级与权益快照。
- 会员详情返回等级历史，PC 可查看版本、操作者、原因、起止时间和权益摘要。

## 5. 主库审计

最新审计命令：

```powershell
$env:DB_DATABASE='activity_registration'
npm run audit:member-level-migration
```

审计结果：

| 检查 | 结果 |
|---|---|
| migration 记录 | 180 |
| 会员等级 | 181，其中平台模板 25、租户实例 156 |
| 同作用域重名 | 0 |
| 有等级会员档案 | 419 |
| 权益快照缺失 | 0 |
| 快照等级 ID 错配 | 0 |
| 快照租户作用域错配 | 0 |
| 五类关系引用跨租户错配 | 0 |
| 公告/弹窗/广告受众跨租户错配 | 0 |
| 等级历史 | 431 |
| 防修改、防删除及自动历史 trigger | 3 个均存在 |

活动订单、课程订单、商城订单、支付、退款和钱包六类资金汇总在迁移前后保持一致。

## 6. 保留账号与测试数据

后台账号：

| 账号 | 密码 | 用途 |
|---|---|---|
| `admin` | 现有平台管理员密码 | 平台模板和指定租户切换 |
| `showcase_admin` | `Qiwai123456` | 慢π演示中心等级、会员调整和历史查看 |

最新真实 API 证据：`.local-logs/member-level-tenant-1784405452641/result.json`。

| 对象 | 保留数据 |
|---|---|
| 商家 | `#23 qiwai-showcase`、`#1 qiwai-hangzhou` |
| 同名等级 | `#180`（商家 23，v2）、`#181`（商家 1，v1） |
| 旧快照会员 | 用户 `#31079`，手机 `13605452641`，密码 `Qiwai123456`，权益 v1 |
| 新快照会员 | 用户 `#31080`，手机 `13505452641`，密码 `Qiwai123456`，权益 v2 |
| 人工调整历史 | `#529`，操作者 `showcase_admin` |
| 课程 | `#19` |
| 课程订单 | `#92 / CO17844054540610F6D71` |

上一轮浏览器验收使用等级 `#178/#179`、会员 `#31077/#31078`、历史 `#523`、课程 `#18` 和课程订单 `#91`，数据同样保留。

## 7. 真实 API 验收

| 场景 | 结果 |
|---|---|
| 两租户创建同名等级 | 通过 |
| 同租户等级唯一性 | 通过 |
| 跨租户公告等级 | 400 |
| 跨租户课程等级 | 400 |
| 跨租户活动等级 | 400 |
| 自动升档作用域 | 仅命中当前租户 |
| 旧会员权益快照 | 等级配置升级后保持 v1 |
| 新会员权益快照 | 冻结 v2 |
| 人工调整 | 原因、管理员和前后快照正确落库 |
| 人工覆盖优先级 | 有效期内不会被自动升档覆盖 |
| 历史 UPDATE | `SQLSTATE 45000` 拒绝 |
| 历史 DELETE | `SQLSTATE 45000` 拒绝 |
| 课程订单快照 | 会员权益 v1、所需等级 v2 均冻结 |

首轮专项发现人工降级后读取详情会立即被成长值自动升回，现已统一通过 `manualLevelOverrideActive()` 修复，并完成真实 API 回归。

## 8. 应用内浏览器验收

浏览器证据目录：`.local-logs/member-level-tenant-1784404292270/`。

- 租户管理员会员页显示当前商家范围、等级版本和完整等级历史。
- 会员详情可发起等级调整，弹窗展示目标等级及版本；本次取消操作无数据副作用。
- 历史展示成长升档、人工降级和人工恢复，包含操作者与原因。
- 平台管理员可在“平台等级模板”和指定商家之间切换，并正确显示商家 `#23` 的等级实例。
- 390x844 下 `innerWidth=390`，页面无横向溢出。
- 两类页面控制台 error 均为 0。

截图：

- `.local-logs/member-level-tenant-1784404292270/browser-member-history.png`
- `.local-logs/member-level-tenant-1784404292270/browser-platform-scope.png`
- `.local-logs/member-level-tenant-1784404292270/browser-platform-scope-mobile.png`

## 9. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| API 全量测试 | 143 个测试文件，803 项通过 |
| Shared/API/PC/H5 构建 | 通过 |
| PC 构建 | 1946 模块 |
| 微信小程序构建 | 通过 |
| 专项 API 验收 | 通过 |
| migration 隔离演练 | `up/down/up` 通过 |
| 主库 migration | 180 个全部 `[X]` |
| 主库一致性审计 | 通过 |
| 完整 `npm run preflight` | 通过 |
| Docker | API、MySQL healthy，Nginx running |
| readiness | `ready=true`、阻塞配置 0 |
| `git diff --check` | 通过 |

preflight 仅提示正式短信凭证未配置。readiness 中的 15 项 `before_launch` 警告为生产密钥、数据库密码、域名、对象存储、HSTS、正式认证和支付沙箱等上线前配置，需在正式部署阶段按部署文档补齐。

## 10. 复测命令

```powershell
npm run acceptance:member-level-tenant
$env:DB_DATABASE='activity_registration'
npm run audit:member-level-migration
npm --prefix apps/api run migration:show
npm test
npm run build
npm run build:mobile:mp-weixin
npm run preflight
docker compose -p activity-registration ps
Invoke-RestMethod http://127.0.0.1:3000/api/health/ready
git diff --check
```
