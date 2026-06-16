# 生产运营 Runbook

这份 Runbook 用于系统上线后的日常运营、故障排查和发布回滚。上线前仍先执行 `docs/launch-checklist.md`，上线后按本文维护运行状态。

## 1. 发布记录

每次发布都记录以下信息：

- 发布时间。
- 发布负责人。
- `APP_VERSION`。
- `BUILD_COMMIT`。
- `BUILD_TIME`。
- 数据库 migration 状态。
- 是否执行过 `npm run preflight`、`npm run smoke`、`npm run smoke:flow`。
- 回滚版本和回滚方式。

生产环境应在 `deploy/.env.production` 中设置：

```bash
APP_VERSION=0.1.0
BUILD_COMMIT=<git-commit-or-image-digest>
BUILD_TIME=<iso-build-time>
```

## 1.1 生产域名

生产环境必须在 `deploy/.env.production` 中替换真实 HTTPS 域名：

- `CORS_ORIGIN`：填写真实 H5 和后台域名。
- `PUBLIC_H5_ORIGIN`：填写真实 H5 入口。
- `PUBLIC_ADMIN_ORIGIN`：填写真实后台入口。
- `PUBLIC_API_ORIGIN`：填写真实 API 入口或反向代理地址。

不要继续使用 `localhost`、`127.0.0.1`、`0.0.0.0` 或 `example.com`；这些值会被 `npm run doctor`、`npm run preflight` 和 API 生产配置校验拦截。

## 2. 发布流程

1. 本地或 CI 执行 `npm run test`。
2. 执行 `npm run build`。
3. 后台构建脚本已固定使用 Vite `--configLoader runner`；CI 若单独构建后台，应继续执行 `npm --prefix apps/admin run build`，不要改回裸 `vite build`。
4. 执行 `npm run init:production-env` 生成或补齐 `deploy/.env.production`；已有文件会保留已填写的真实值，只补模板新增字段或替换仍为占位值的本地密钥。之后确认真实域名、`BUILD_COMMIT`、短信服务商和备份配置均已替换。
5. 确认 `MULTI_TENANT_ENABLED=false`，除非 Tenant 表、核心表 `tenantId` 迁移、后台权限过滤、公开端边界和跨机构预发验收已经全部完成。
6. 执行 `npm run preflight`。
7. 生产数据库备份：`npm run db:backup`。
8. 如有 migration，执行 `npm --prefix apps/api run migration:show`，确认后执行 `npm --prefix apps/api run migration:run`。
9. 发布：`docker compose --env-file deploy/.env.production up -d --build`。
10. 检查 `/api/health/ready` 返回 `ready: true`。
11. 检查 `/api/health` 中的 `release.version` 和 `release.commit` 与发布记录一致。
12. 顺序执行 `npm run smoke` 和 `npm run smoke:flow`。两条烟测都会改写共享测试数据，其中 `npm run smoke` 会临时切换全站报名开关，不要并发运行。

## 3. 健康检查

- `/api/health/live`：进程存活。
- `/api/health/ready`：数据库和生产配置可接流量。
- `/api/health`：API、数据库、配置状态和发布版本。
- `/api/health/metrics`：Prometheus 文本指标，包含 `activity_api_up`、`activity_database_up`、`activity_config_error`、`activity_process_uptime_seconds`、`activity_build_info`。

如果 `ready` 不通过，不要切流量；优先检查数据库连通、生产配置体检和容器日志。

## 4. 请求排障

API 每个响应都会带 `X-Request-Id`，错误响应体也会包含 `requestId`。用户反馈报名、付款、签到失败时，先收集：

- 页面显示的请求编号。
- 操作时间。
- 用户手机号。
- 活动名称。
- 报名或订单编号。

日志排查顺序：

1. 在 API JSON 访问日志中按 `requestId` 搜索。
2. 查看状态码、路径、耗时、客户端 IP 和 userAgent。
3. 到后台操作日志查看对应人工操作。
4. 支付问题继续查看财务对账页和支付回调日志。
5. 验证码问题查看 H5 验证码日志。
6. 后台登录问题查看后台登录日志。

## 5. 全站报名开关

当出现支付异常、活动库存需要核对、短信/通知服务异常、临时维护或运营规则调整时，可在后台“运营设置”中关闭“报名通道”。

关闭后：

- H5 活动详情和报名页会展示暂停报名提示。
- Public 报名接口会拒绝新的报名请求。
- 已产生的报名、订单、审核、线下收款、退款和签到不受影响。

恢复后：

1. 在“运营设置”中重新开启报名通道。
2. 检查 H5 活动详情页按钮恢复为可报名状态。
3. 执行一次免费活动或测试活动报名。
4. 查看后台操作日志，确认设置变更记录完整。

## 5.1 支付模式

生产环境默认使用线下收款，保持 `PAYMENT_SANDBOX_ENABLED=false` 和 `REAL_PAYMENT_ENABLED=false`。

真实微信/支付宝支付上线前，必须先完成官方 SDK 签名、证书验签、退款回调、真实对账单拉取、代理真实打款和预发验收。实施步骤见 `docs/real-payment-integration-plan.md`。预发验收结果写入 `deploy/real-payment-smoke-result.json`，可用 `npm run smoke:real-payment -- --init` 生成模板；结果文件中每个启用渠道的支付场景（微信 Native/H5/JSAPI、支付宝 precreate/WAP/PAGE）及其证据字段必须全部验证为 passed，`agentTransfer` 也必须保留代理、结算单、转账单号、服务商回执号、成功查询、失败用例和回滚记录；未通过前不要打开 `REAL_PAYMENT_ENABLED`，也不要在生产流量中启用沙箱支付端点。

## 6. 备份与恢复

每日至少自动备份一次 MySQL。备份目录必须在持久化磁盘，或同步到对象存储。

手动备份：

```bash
npm run db:backup
```

清理过期备份：

```bash
npm run db:prune-backups
```

恢复前先确认目标库名，避免误恢复：

```bash
RESTORE_CONFIRM=activity_registration BACKUP_FILE=backups/mysql/activity_registration-YYYYMMDD-HHMMSS.sql.gz npm run db:restore
```

每月至少在测试库做一次恢复演练。

## 7. 回滚流程

1. 停止新流量或切维护页。
2. 记录当前 `/api/health` 的 release 信息。
3. 回滚 API 镜像或代码版本。
4. 回滚后台和 H5 静态构建产物。
5. 如果数据库 migration 已执行，先评估是否需要恢复备份；不要盲目反向迁移生产库。
6. 检查 `/api/health/ready`。
7. 执行 `npm run smoke`。
8. 恢复流量，并记录回滚结果。

## 8. 日常巡检

每日：

- 检查 `/api/health/ready`。
- 检查容器状态和重启次数。
- 检查昨日备份是否成功。
- 检查全站报名开关是否处于预期状态，确认没有误停报名通道。
- 查看是否有支付对账差异、服务商账单待处理记录、待审核退款、异常验证码发送量。

每周：

- 检查后台登录失败和限流记录。
- 检查操作日志中高风险动作。
- 抽查管理员角色，确认 `finance`、`operator`、`checkin_staff` 没有被误授予超级管理员权限。
- 抽样验证免费活动、付费活动、签到、评价、导出、服务商账单导入、上传目录公开访问和代理结算打款凭证。

每月：

- 做一次备份恢复演练。
- 检查短信、邮件、微信通知服务商余额和模板状态。
- 检查默认管理员是否已禁用或更换。
