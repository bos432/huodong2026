# 生产监控与 API 回滚演练记录

演练时间：2026-07-14 14:18-14:26 +08:00

## 监控能力

`/api/health/metrics` 在原有 API、数据库、配置、进程和版本指标基础上，新增：

- `activity_operational_metrics_up`
- `activity_business_jobs_due`
- `activity_business_jobs_dead_letter`
- `activity_business_jobs_stale_processing`
- `activity_payment_callback_failures_15m`
- `activity_refund_provider_failures`
- `activity_inventory_anomalies_open`
- `activity_fund_risk_alerts_open`

`npm run monitor:health` 同时检查 health、ready 和 metrics，支持 critical/warning 分级、告警指纹去重、恢复事件、JSON 结果留档和可选 webhook。默认结果文件为 `deploy/monitor-health-result.json`。

本次实跑结果：API up、数据库 up、配置阻塞错误 0、业务指标查询正常、到期任务 0、死信 0、过期锁 0、15 分钟支付回调失败 0、退款服务商失败 0、库存异常 0、资金风险告警 0，最终状态 `ok`。

使用测试阈值制造 1 条 warning 后恢复默认阈值，脚本完成 warning 指纹更新和 recovered 状态切换。正式 webhook 尚未配置，因此通知结果为 `webhook_not_configured`，但退出码、状态文件和结果文件均正常。

## 运行时依赖安全

- 项目固定 `npm@11.6.2`，Docker 和 GitHub Actions 使用同一 npm 版本。
- ExcelJS 与腾讯云 SDK 的嵌套 `uuid` 统一覆盖为 `11.1.1`。
- 最终 API 运行镜像执行 `npm audit --omit=dev --audit-level=moderate`：0 漏洞。
- 镜像依赖树确认 ExcelJS、腾讯云 SDK、TypeORM 和根依赖均解析到 `uuid@11.1.1`。
- Dockerfile 使用独立 `production-dependencies` 阶段执行 `npm ci --omit=dev`，业务代码变化不再重复运行耗时的生产依赖 prune。

## API 回滚演练

- baseline：`activity-registration-api:rollback-baseline-20260714T062555`
- baseline image：`sha256:f3b1caea4b1276896d47f4a533602b306cf9b6fc39735d01fbdd38d4a2753c3e`
- 故障候选：`activity-registration-api:rollback-candidate-20260714T062555`
- candidate image：`sha256:9b0c9b6c4ca0bdcea6a4a0359a11cf6d9cce9a7085284f058011080d06b48484`
- 故障注入：候选镜像 CMD 仅执行 `sleep 600`，不启动 HTTP 服务。
- readiness 故障识别：通过。
- 自动恢复 baseline：通过。
- 回滚到 ready：5.82 秒。
- 演练总时长：14.03 秒。
- 结果文件：`deploy/rollback-drill-result.json`。
- 数据库和持久化卷：未修改。

## 尚待完成

- 配置真实企业微信、钉钉、飞书或监控平台 webhook，执行真实通知和恢复通知验收。
- 接入 Prometheus/Grafana 或同等平台，验证采集、告警规则、静默和升级策略。
- 对后台/H5 静态制品、Nginx 配置和真实灰度流量执行组合回滚演练。
- 在生产等规模环境演练支付回调积压、任务死信、数据库不可用和对象存储故障。

## 2026-07-16 增量复核

- API 回滚演练再次通过：故障候选 readiness 识别成功，baseline 自动恢复成功；恢复 ready `6.1s`，总耗时 `19.79s`，结果已写入 `deploy/rollback-drill-result.json`。
- `npm run monitor:health` 返回 `ok`、告警 `0`；当前业务任务、支付回调、退款、库存和资金风险指标均为 `0`。通知结果为 `unchanged`，真实 webhook 仍未配置。
