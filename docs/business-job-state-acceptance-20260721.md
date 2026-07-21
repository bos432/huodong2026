# 业务任务状态闭环验收（2026-07-21）

## 范围

- 页面：`/admin/business-jobs`
- 账号：`showcase_admin`，租户 `#23 / 慢π演示中心`
- 补齐任务列表故障清空、请求代次、筛选快照、响应校验和高风险操作目标复核。
- 故障演练仅停止并恢复 `activity-api`，未创建、取消、重放或执行业务任务。

## 实现

- 列表读取增加请求代次和状态、类型、关键词、分页快照，迟到响应不能覆盖当前范围。
- 请求开始、响应异常或失败时清空旧任务和 total，故障态不再保留历史成功数据。
- 对 `items/total/page/pageSize` 执行响应结构校验。
- 重放和取消在确认后复核任务仍在当前列表、状态未变化、筛选和列表代次仍一致。
- 死信重放和待执行/死信取消增加函数层状态限制。
- 手工扫描在确认后复核筛选及列表代次；确认或写操作期间锁定筛选、重试和分页。

## 浏览器验收

- 正常态：任务总数 128、首屏 20 条，桌面 `1066/1066`，控制台 warning/error 0。
- 停止 API 后刷新，任务行清空且分页归零为 `Total 0`，请求完成后持久显示 HTTP 502 和独立重试。
- 恢复 API healthy 后点击重试，完整恢复为 128 条、首屏 20 条。
- 当前租户待执行与死信任务均为 0；为保留数据未人工制造任务或执行行级写操作，目标复核由专项合同覆盖。
- 390x844 视口 `clientWidth=scrollWidth=390`，标题高度 31px，控制台 warning/error 0。
- 截图：`.local-logs/business-job-state-20260721/mobile.png`。
- 最终恢复桌面工作台 `1081/1081`，控制台 warning/error 0。

## 自动化与运行态

- PC 类型检查和生产构建通过。
- 专项 3 文件、68 项通过。
- 完整 `npm.cmd run ci:verify` 用时 177.7 秒并退出 0；运行依赖 high/critical 0，全部测试、preflight 和 Shared/API/PC/H5/微信小程序构建通过。
- 监控 `status=ok`、`alerts=0`。
- 统一资金 `healthy=true`、`issueCount=0`；活动订单 330、课程订单 91、商城订单 815、钱包流水 463、商城结算 26。
- readiness `ready=true`、`blockingCount=0`。
- `activity-api`、`activity-mysql` healthy，`activity-nginx` running；差异检查无空白错误。

## 结论

计划表 `11.01.72` 业务任务状态闭环通过。现有业务任务与历史验收数据全部保留。
