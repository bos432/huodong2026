# 验收死信监控整改记录

## 问题

2026-07-20 完整门禁通过后，`npm run monitor:health` 报告 `dead_letter_jobs=90`。逐条分组确认：87 条为 `acceptance.permission` 或 `acceptance.worker-race` 并发/权限验收任务，3 条为通知权限验收中标题带 `[fail]` 的模拟供应商强制失败任务。任务均创建于 2026-07-18，不是当前真实业务故障。

验收样本永久停留在 `dead_letter` 会让运行态监控持续处于 critical，从而掩盖之后真正需要处理的死信。

## 整改

- 新增 `npm run maintenance:archive-acceptance-dead-letters`。
- 命令默认 dry-run，只输出候选，不修改数据。
- 只有设置 `ACCEPTANCE_DEAD_LETTER_ARCHIVE_CONFIRM=true` 才执行归档。
- 候选严格限制为 `acceptance.*`，以及存在明确 `Mock provider forced failure` 证据且共享同一通知幂等键的任务。
- 归档调用现有平台管理 API，将状态改为 `cancelled`，保留 payload、错误、Worker、时间和审计记录，不删除测试数据。
- 真实退款、支付、库存、通知或其他业务死信不匹配上述规则，必须继续人工分析、重放或处置。

## 操作

```powershell
npm run maintenance:archive-acceptance-dead-letters
$env:ACCEPTANCE_DEAD_LETTER_ARCHIVE_CONFIRM="true"
npm run maintenance:archive-acceptance-dead-letters
Remove-Item Env:ACCEPTANCE_DEAD_LETTER_ARCHIVE_CONFIRM
npm run monitor:health
```

结构化结果保存在 `.local-logs/acceptance-dead-letter-archive-*/result.json`。

## 执行结果

- dry-run：`beforeCount=90`、`candidateCount=90`、`archivedCount=0`。
- 确认执行：`beforeCount=90`、`candidateCount=90`、`archivedCount=90`、`afterCount=0`。
- 结果：90 条记录全部保留为 `cancelled`，没有删除业务或测试数据。
- 复验：`npm run monitor:health` 返回 `status=ok`、`alerts=0`；统一资金 `healthy=true`、`issueCount=0`；readiness 为 `ready=true`、`blockingCount=0`。
