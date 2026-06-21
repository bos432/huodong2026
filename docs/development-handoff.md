# 开发交接说明

更新时间：2026-06-20 14:30 +08:00

本文用于下次继续开发或上线验收时快速恢复上下文。当前任务按普通对话执行，不使用 Codex Goal 功能。

## 当前结论

系统本地开发、自动化验证和右侧浏览器主流程验收已经基本完成，可作为本地/预发受控试运营状态继续使用。

真实公网正式收费运营尚未放行。当前阻塞不是本地代码缺口，而是外部生产条件缺失：真实 HTTPS 域名、短信服务商实发、微信/支付宝商户证书与回调、真实支付/退款/账单/代理打款预发证据、生产备份存储、监控日志和正式管理员治理。

未补齐前必须保持：

```bash
REAL_PAYMENT_ENABLED=false
PAYMENT_SANDBOX_ENABLED=false
MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED=false
MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED=false
AGENT_REAL_TRANSFER_IMPLEMENTED=false
```

不要伪造 `deploy/real-payment-smoke-result.json`，不要为了通过门禁手动把真实支付相关结果改成 `passed=true`。

## 必读文件

每次继续前先读：

- `docs/launch-checklist.md`
- `docs/production-runbook.md`
- `docs/local-acceptance-test-plan.md`
- `docs/real-payment-integration-plan.md`
- `docs/project-progress.md`
- `DEVELOPMENT_LOG.md`

## 已完成验证

最近已通过或已有通过记录：

- `npm.cmd run build`
- `npm.cmd run test`
- `npm.cmd run preflight`
- `npm.cmd run smoke`
- `npm.cmd run smoke:flow`
- `npm.cmd --prefix apps/api run migration:show`
- API health / ready / live / metrics 检查
- H5 和后台入口 HTTP 可访问检查
- 右侧浏览器 H5、后台多角色、商城主流程验收
- 多商户商城动态 smoke
- 数据库备份清理：`npm.cmd run db:prune-backups`
- 数据库手动备份：`npm.cmd run db:backup`
- 数据库恢复演练已有通过记录

最近生成的本地备份：

```text
backups/mysql/activity_registration-20260620-142541.sql.gz
```

本机执行数据库备份时，如 `mysqldump.exe` 不在 PATH，可临时使用：

```powershell
$env:ENV_FILE='apps/api/.env'
$env:BACKUP_USE_DOCKER='false'
$env:PATH="C:\Program Files\MariaDB 12.3\bin;$env:PATH"
npm.cmd run db:backup
```

## 已知本地服务

最近使用的本地地址：

- API: `http://127.0.0.1:3000/api`
- H5: `http://127.0.0.1:5173`
- Admin: `http://127.0.0.1:5174/admin`

常用演示/测试账号和数据见 `DEVELOPMENT_LOG.md`。最近浏览器验收中使用过：

- H5 手机号：`13990008993`
- 验证码：`123456`
- 管理员：`admin / Admin123456`
- 演示商家：`qiwai-showcase`
- 示例活动报名详情 id：`44`
- 示例商城订单 id：`41`

## 当前阻塞

`npm.cmd run prelaunch:online-showcase` 最近按预期返回 `NO-GO`。原因包括：

- `deploy/real-payment-smoke-result.json` 不是真实通过结果，且缺少新鲜有效的真实服务商预发证据。
- 微信 Native/H5/JSAPI、支付宝支付场景、真实支付回调、重复回调、异常金额、退款请求、退款通知、退款查询、服务商账单、代理账户路由、商城支付、商城回调防串店、商城退款、店铺直收、代理真实打款和回滚计划均缺少真实预发证据。
- 缺少真实微信/支付宝商户配置、证书、API key、支付回调 URL、退款回调 URL 和服务商账单样例。
- 生产短信凭证、签名、模板和验证码实发验证仍需部署/运营侧提供。
- 生产对象存储或独立备份磁盘、自动备份计划、监控日志采集和正式管理员账号治理仍需落地。

## 下次继续步骤

如果外部生产条件还没有补齐：

1. 重新读取必读文件。
2. 不要新增计划外功能。
3. 不要打开真实支付或真实资金相关开关。
4. 可以只做状态复核并记录到 `DEVELOPMENT_LOG.md`。

如果外部生产条件已经补齐：

1. 重新读取必读文件和最新 `DEVELOPMENT_LOG.md`。
2. 执行生产配置体检：

```powershell
npm.cmd run doctor
npm.cmd run preflight
```

3. 执行真实支付预发验收：

```powershell
npm.cmd run smoke:real-payment
```

4. 执行线上演示预发布门禁：

```powershell
$env:API_BASE='http://127.0.0.1:3000/api'
$env:PRELAUNCH_ALLOW_HTTP='true'
$env:SHOWCASE_ADMIN_USERNAME='admin'
$env:SHOWCASE_ADMIN_PASSWORD='Admin123456'
$env:SHOWCASE_PASSWORD='Qiwai123456'
npm.cmd run prelaunch:online-showcase
```

5. 门禁通过后，再在右侧浏览器按 H5 用户、平台管理员、运营、财务、签到、商家/店铺角色走完整主流程。
6. 把验收时间、环境、测试数据、通过项、发现问题和是否达到可上线运营标准写入 `DEVELOPMENT_LOG.md`。

## 工作区提醒

当前工作区有大量已修改和未跟踪文件，属于前序持续开发成果。继续时不要执行 `git reset --hard`、`git checkout --` 或其它会丢失现有修改的命令，除非用户明确要求。

