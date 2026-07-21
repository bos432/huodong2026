# 安全与发布门禁验收记录

验收日期：2026-07-17

## 结果

- `npm run security:secrets` 通过，扫描 3376 个已跟踪或未忽略源文件，未发现密钥泄露。
- `npm run test:preflight-guards` 全部通过，包含安全、备份、迁移、限流、防刷、上传、健康、监控、回滚和制品门禁。
- 权限目录门禁确认 75 项权限定义和路由映射。
- 候选 ZIP 中未发现 `.env.production`、`.env.local` 或真实密钥文件；只包含脱敏模板和构建代码。

## 发布边界

安全扫描和代码门禁通过不等于生产外部验收完成。真实支付、短信、微信、对象存储、域名证书、外部告警、真机和生产灰度仍需在正式环境执行并留存凭据。

## 证据

- 候选包：`delivery/activity-registration-candidate-20260717-r3.zip`
- 生产运维：[production-runbook.md](production-runbook.md)
- 启动清单：[launch-checklist.md](launch-checklist.md)
- 运行时审计：`npm run audit:runtime`
