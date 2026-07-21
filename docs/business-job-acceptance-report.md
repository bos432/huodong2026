# 01.11 业务任务权限、并发与 Worker 验收报告

## 验收时间与环境

- 验收时间：2026-07-18
- 环境：Docker Compose 项目 `activity-registration`，真实 MySQL、API、PC 管理后台
- 数据库备份：`backups/mysql/activity_registration-20260718-095811.sql.gz`
- 数据库 migration：`BusinessJobObservability1783840000000`
- 最终自动化结果：`.local-logs/business-job-1784340948060/result.json`

## 完成范围

- 将原先依赖 `dashboard.view` 的任务能力拆分为 `business_job.view` 和 `business_job.manage`。
- 运营默认具备查看和管理权限，财务默认只读，超级管理员具备全部权限。
- 列表、路由、菜单和最小权限登录回退使用 `business_job.view`。
- 重放、取消和到期任务扫描使用 `business_job.manage`；平台手工扫描继续要求平台超级管理员。
- 重放和取消在数据库事务内使用 `pessimistic_write` 锁，同一任务的并发重复请求仅一次实际生效。
- 只有 `operationApplied=true` 的重放或取消写入操作审计，避免并发重复审计。
- 列表增加状态、类型、关键词、租户和分页参数边界校验。
- payload、result 和 lastError 在列表、详情及写操作响应中统一执行敏感字段脱敏。
- 任务新增 `lastWorkerId`、`lastStartedAt`、`lastFinishedAt`，PC 工作台同步展示 Worker、执行时间、锁、请求编号和死信时间。

## 自动化验收

| 检查 | 结果 | 证据 |
|---|---|---|
| 权限、角色、菜单、任务服务专项 | 通过，5 个文件 74 项 | API Vitest 专项 |
| 只读列表与详情脱敏 | 通过 | `readonly-list-and-redaction` |
| 只读重放、取消、扫描越权 | 均返回 403 | `readonly-write-denied` |
| 并发取消 | 仅一次 `operationApplied=true` | `concurrent-cancel-idempotent` |
| 并发重放 | 仅一次实际迁移 | `concurrent-replay-idempotent` |
| 跨租户任务操作 | 返回 404 | `tenant-boundary-and-query-validation` |
| 非法状态筛选 | 返回 400 | `tenant-boundary-and-query-validation` |
| 重放/取消审计 | 各仅一条 | `operation-audit-once` |
| API/PC 构建 | 通过 | `npm run build:api`、`npm run build:admin` |

## 双独立 Worker 竞争演练

- 演练前缀：`worker-race-1784340116405`
- 插入 80 条到期任务，由两个独立 API Worker 并发竞争处理。
- `api-1` 处理 20 条，`api-2` 处理 60 条，两个 Worker 均真实参与。
- 总任务数 80、总尝试数 80，`attemptCount != 1` 的任务为 0。
- 非死信任务为 0，开始时间、结束时间和 Worker 标识缺失均为 0。
- 临时容器 `activity-api-worker-2-1784340116405` 已自动停止，无残留容器。

## 浏览器验收

### 只读账号

- 账号：`showcase_business_job_readonly / Qiwai123456`
- 登录后自动落地 `/admin/business-jobs`，菜单仅显示“业务任务”。
- 页面显示只读说明，无操作列、重放、取消和手工扫描按钮。
- 展开任务 `122` 后，`accessToken` 和 `password` 均显示为 `********`。
- Worker、开始时间、结束时间、请求编号和死信时间完整展示。

### 管理账号

- 账号：`showcase_business_job_manager / Qiwai123456`
- 任务 `124`：先取消确认框验证“取消”无副作用且操作锁恢复，再确认取消，状态变为 `cancelled`。
- 任务 `125`：先重放确认框验证“取消”无副作用且操作锁恢复，再确认重放，任务从 `dead_letter` 返回待执行队列。
- 桌面视口 `scrollWidth=clientWidth=1164`。
- 390×844 视口 `scrollWidth=clientWidth=375`。
- 页面刷新后本轮新增 console warning/error 为 0。

## 保留测试数据

- 任务 `121`：并发取消验收样本，`cancelled`。
- 任务 `122`：并发重放及 Worker 执行样本，保留完整 Worker 观测字段。
- 任务 `123`：其他租户边界样本。
- 任务 `124`：浏览器取消样本，`cancelled`。
- 任务 `125`：浏览器死信重放样本；重放后由 `api-1` 完成 3 次真实重试，当前重新进入 `dead_letter`，Worker 观测字段完整。
- 最终自动化回归另保留任务 `206-210`，分别覆盖并发取消、并发重放、跨租户边界及后续浏览器样本。
- 双 Worker 演练任务：前缀 `worker-race-1784340116405`，共 80 条，全部保留。

## 生产复核项

代码、真实数据库 migration、权限、并发、幂等、审计、双独立 Worker 和 PC 浏览器流程已完成。正式短信/微信通知、真实退款查询、代理结算回执等外部补偿通道，以及异地任务恢复，需在生产密钥、正式渠道和异地基础设施就绪后复核，不阻塞后续不依赖外部配置的开发工作包。
