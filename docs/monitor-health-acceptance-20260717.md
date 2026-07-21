# 本地监控健康检查记录

日期：2026-07-17

## 结果

- `npm run monitor:health`：通过。
- 状态：`ok`。
- 告警数：0。
- API：up；数据库：up；ready：true。
- 配置错误：0。
- 业务任务到期：0；死信：0；过期处理中：0。
- 15 分钟支付回调失败：0；退款服务商失败：0。
- 库存异常：0；资金风险告警：0。
- 结果文件：`deploy/monitor-health-result.json`。
- 外部 webhook 未配置，本轮通知为 `sent=false/reason=unchanged`，没有发送外部通知。

## 待外部验收

接入真实 Prometheus/Grafana、企业 webhook 或短信/IM 告警渠道后，需要再次验证告警触发、去重、恢复通知和渠道接收记录。
