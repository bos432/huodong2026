# 定位命中日志状态闭环验收（2026-07-21）

## 范围

- 页面：`/admin/tenant-region-hit-logs`
- 平台验收账号：`admin`
- 补齐商家选项、定位汇总和日志列表三类读取的失败清空、请求代次、范围快照、响应校验与独立重试。
- 保留既有敏感字段权限、脱敏、导出权限和 `docs/tenant-region-hit-log-permission-acceptance-20260718.md`；本轮未执行导出或业务写操作。

## 实现

- 商家选项、日志列表和定位汇总使用独立 loading、错误、请求代次及重试入口，任一分区失败不会遮蔽其他分区状态。
- 请求开始、响应结构异常或失败时仅清空对应旧数据；列表同时清空 total，汇总同时清空指标和 Top 表。
- 日志和汇总绑定商家、命中状态、日期及来源筛选快照；迟到响应不得覆盖当前筛选，非法日期范围清空列表、总数和汇总。
- 查询分别刷新列表和汇总；导出冻结当前筛选。读取或导出期间锁定筛选、刷新、查询、重试和分页。

## 浏览器验收

- 正常态：27 个商家选项、10 条日志、首屏 10 条；定位请求 10、成功命中 7、未命中 3、命中率 70.0%。
- 桌面宽度 `1066/1066`，控制台 warning/error 0。
- 停止 `activity-api` 并重载后，商家选项清空，日志为 `Total 0`，汇总指标、命中商家 Top、命中区域 Top 和来源分布均清空；三个分区分别持久显示 HTTP 502。
- API 恢复 healthy 后逐个点击“重试商家选项”“重试定位汇总”“重试定位日志”，三类真实数据分别恢复。
- 390x844 下 `clientWidth=scrollWidth=375`，标题完整可见，控制台 warning/error 0。
- 截图：`.local-logs/tenant-region-hit-log-state-20260721/mobile.png`。
- 最终恢复 `showcase_admin` 工作台，桌面 `1066/1066`，控制台 warning/error 0。

## 自动化与运行态

- PC 类型检查和生产构建通过，耗时 39.3 秒。
- 专项 3 文件、39 项通过。
- 完整 `ci:verify` 132.1 秒退出 0；运行依赖 high/critical 0，全部测试、preflight 和 Shared/API/PC/H5/微信小程序构建通过。
- 监控 `status=ok`、`alerts=0`；readiness `ready=true`、`blockingCount=0`。
- 统一资金 `healthy=true`、`issueCount=0`；活动订单 539、课程订单 93、商城订单 815、钱包流水 471、商城结算 26。
- API/MySQL healthy，Nginx running；`git diff --check` 退出 0，仅有既有 LF/CRLF 提示。

## 结论

计划表 `11.01.77` 定位命中日志状态闭环通过，全部历史定位日志、权限账号和审计数据保留。
