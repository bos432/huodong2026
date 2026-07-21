# 会员标签与动态分群权限、自动刷新和快照追溯验收报告

## 1. 验收结论

本报告对应持续开发计划 `11.01.47`。会员标签与动态分群已形成“租户作用域唯一键 + 严格规则 DTO + 行为标签自动刷新账本 + 分群预览 + 幂等快照 + 不可变成员明细 + 通知作用域隔离”的服务端闭环。

验收结论：通过。migration `1783890000000-MemberSegmentGovernance` 已在主库执行；真实 API 专项、并发与幂等、主库数据审计、权限专项、API 全量测试、Shared/API/PC/H5/微信小程序构建、完整 preflight、Docker 重建和 readiness 均通过。

应用内浏览器已完成维护、只读、敏感三类账号以及桌面和 390x844 响应式验收。最终新增的最高积分、最高成长值、最高消费金额和沉睡天数输入已通过 PC 类型检查和生产构建；本轮尝试补录新截图时应用内 Browser 页面无法附着，因此保留为截图补录项，不影响已完成的代码和构建验收结论。

## 2. 数据模型与迁移

- `user_tags`、`member_segments`、`member_segment_snapshots` 增加非空 `tenantScopeKey`，平台数据使用 `platform`，商家数据使用 `tenant:{id}`。
- 标签唯一键升级为 `tenantScopeKey + userId + name`，平台 `tenantId=NULL` 不再绕过 MySQL 唯一约束。
- 分群唯一键升级为 `tenantScopeKey + name`，平台和商家可拥有同名分群，但同一作用域不可重复。
- 标签租户外键改为 `ON DELETE CASCADE`，删除商家不会把历史标签转成平台标签。
- 分群快照增加 `businessKey`，唯一键为 `tenantScopeKey + segmentId + businessKey`，并发重放返回同一快照。
- 新增 `member_behavior_tag_runs`，记录幂等键、批次键、状态、会员数、新增数、删除数、保留数、规则快照、错误和操作者。
- 快照主表及成员表增加四个数据库 trigger，UPDATE/DELETE 均由数据库拒绝。
- 快照成员与主快照在同一事务内计算并写入，成员按 1000 条分块落库。

主库升级前备份：

- `backups/mysql/activity_registration-20260719-064745.sql.gz`
- SHA-256：`0128AB89201B20DFF4D78E7B734F3F6D5B9A1BD31E19D4680DF5E6652061E437`

## 3. 权限与作用域

- `tag.view`：查看标签、分群、预览、快照、成员和行为刷新历史。
- `tag.manage`：创建、修改、删除标签，创建分群、生成快照、刷新行为标签和发送分群通知。
- `tag.sensitive`：查看完整手机号和行为刷新操作者，不自动获得写权限。
- 标签敏感字段统一使用有效权限展开结果，不再仅检查原始权限数组。
- 标签 CRUD、分群匹配、快照、成员下钻和通知统一按 `tenantScopeKey` 过滤。
- 岗位活动数据范围继续作用于标签会员、分群预览、快照成员和行为标签刷新。
- 商家分群引用平台会员等级返回 400，平台和商家同名标签不会串范围。

## 4. 规则、刷新与快照

- 分群请求体使用严格 DTO，拒绝未知字段、空规则、非法数值、超长数组和冲突范围。
- 支持最低/最高积分、最低/最高成长值、最低/最高消费金额、最低报名/核销次数、最近活跃、沉睡天数、来源、地区、等级和标签条件。
- 行为标签刷新使用作用域命名锁、数据库事务、持久幂等和批量增删；重复请求返回同一运行批次。
- 自动刷新通过 BusinessJob 调度，默认每小时为平台和所有启用商家发布独立任务。
- 分群快照业务键在前端失败重试时保持不变，只有成功后才清除，避免网络重试产生重复快照。
- 通知目标超过 10000 人时明确拒绝，不再使用 `.take(300)` 静默截断。
- 快照展示业务键、声明成员数和不可变成员明细，历史口径不随后续标签或会员属性变化。

## 5. 主库审计

| 检查 | 结果 |
|---|---|
| migration 记录 | 182，最新为 `1783890000000` |
| 标签总数 | 755 |
| 行为标签 | 705 |
| 标签作用域错配 | 0 |
| 标签唯一键重复 | 0 |
| 分群唯一键重复 | 0 |
| 快照业务键重复 | 0 |
| 快照声明成员 / 实际成员 | 281 / 281 |
| 不可变 trigger | 4 个，均存在并已真实拒绝写入 |
| 行为刷新运行 | 59 条，59 completed，0 failed |
| 行为刷新 BusinessJob | 56 条，56 completed，0 failed |

行为刷新任务数量在本报告生成时高于最初专项结果，是自动调度器继续为平台和启用商家执行所致；所有新增运行均成功完成。

## 6. 保留账号与测试数据

后台账号密码均为 `Qiwai123456`：

| 账号 | 用途 |
|---|---|
| `showcase_staff_read` | 标签与分群只读，无刷新、新建、保存、添加和删除按钮 |
| `showcase_staff_manager` | 标签、分群、快照、行为刷新和通知维护 |
| `showcase_staff_security` | 查看完整手机号和敏感运行信息，无写权限 |

最新真实 API 证据：`.local-logs/tag-permission-1784415155724/result.json`。

| 对象 | 保留编号 |
|---|---|
| 会员 | `31088` |
| 商家标签 | `759` |
| 商家分群 | `7` |
| 商家快照 | `5` |
| 行为刷新运行 | `30` |
| 平台标签 | `762` |
| 平台分群 | `9` |

## 7. 真实 API 与并发验收

| 场景 | 结果 |
|---|---|
| 并发创建同名标签 | 两次请求返回同一标签，一次实际执行、一次幂等 |
| 并发创建同名分群 | `201/400`，无 500 |
| 并发生成同业务键快照 | `201/201`，同一快照 ID，一次实际执行、一次幂等 |
| 并发刷新行为标签 | 同一运行批次，一次实际执行、一次幂等 |
| 商家引用平台等级 | 400 |
| 平台/商家同名标签通知 | 各匹配正确的 1 人，无跨作用域发送 |
| 快照成员一致性 | 声明 281，实际 281 |
| 快照 UPDATE/DELETE | 数据库 trigger 拒绝 |
| 大人群通知 | 超过 10000 人明确报错 |

## 8. 应用内浏览器验收

浏览器截图保存在 `.local-logs/member-point-browser-1784411739630/`：

- `tags-desktop.png`
- `tags-mobile-390x844.png`
- `tags-mobile-segments-fixed.png`
- `tags-mobile-segment-list-fixed.png`

已验证：

- 维护账号可刷新行为标签、创建分群、生成快照并查看业务键和不可变成员。
- 只读账号可查看运行历史，但无刷新、新建、保存、添加或删除按钮。
- 敏感账号可查看完整手机号，但无写按钮。
- 390x844 下文档宽度为 `375/375`，无页面级横向溢出；宽表仅在内部横向滚动。
- 桌面视口文档宽度为 `999/999`，无页面级横向溢出。
- 三类账号控制台 error 为 0。
- 长分群名称已改为单行横向工作表，不再挤压移动端列表布局。

待补录项：最终新增的最高积分、最高成长值、最高消费金额和沉睡天数四个输入未生成新的应用内截图。对应源码已进入本轮 PC 生产构建，`UserTags` 页面构建产物生成成功。

## 9. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 标签/分群专项 | 4 个文件，66 项通过 |
| API 全量测试 | 144 个测试文件，819 项通过 |
| Shared/API/PC/H5 构建 | 通过 |
| PC 构建 | 1946 模块 |
| 微信小程序构建 | 通过 |
| 完整 `npm run preflight` | 通过 |
| 权限目录 | 138 项通过 |
| 主库 migration | 最新 `1783890000000` 已执行 |
| Docker | API、MySQL healthy，Nginx running |
| readiness | `ready=true`、阻塞配置 0 |
| `git diff --check` | 通过，仅既有 CRLF 提示 |

preflight 仅提示正式短信环境变量未配置；readiness 的生产密钥、域名、对象存储、HSTS、真实认证和外部通知通道警告属于全项目上线前配置项。

## 10. 复测命令

```powershell
npm run acceptance:tag-permissions
npm test
npm run build
npm run build:mobile:mp-weixin
npm run preflight
npm --prefix apps/api run migration:show
docker compose -p activity-registration up -d --build api
docker compose -p activity-registration ps
Invoke-RestMethod http://127.0.0.1:3000/api/health/ready
git diff --check
```
