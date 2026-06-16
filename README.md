# 活动报名小程序 + H5

一套从 0 开始实现的活动报名系统，面向沙龙、读书会、培训、线下聚会等多商家 / 城市合伙人 SaaS 活动运营场景。

当前业务落地以“线下文化活动 + 课程报名 + 城市合伙人运营 SaaS”为主线，七维文化平台的产品范围、角色体系和 18 个月路线图见 [七维文化活动与课程 SaaS 平台落地方案](docs/qiwai-cultural-saas-platform-plan.md)。

城市合伙人招商、结算和首月执行材料见 [城市合伙人说明书](docs/city-partner-handbook.md)、[合作与结算规则](docs/city-partner-cooperation-policy.md) 和 [首月运营 SOP](docs/city-partner-first-month-sop.md)。
本地演示地址和账号见 [七维文化本地演示指南](docs/qiwai-local-demo-guide.md)。

## 技术栈

- 用户端：uni-app + Vue 3 + TypeScript
- 管理后台：Vue 3 + Vite + Element Plus
- 后端：NestJS + TypeScript + MySQL
- 共享类型：packages/shared
- 部署：Docker Compose + Nginx

## 项目结构

```text
apps/
  api/      NestJS 后端接口
  admin/    Vue 管理后台
  mobile/   uni-app 用户端，发布 H5 和微信小程序
packages/
  shared/   共享枚举、类型和状态文案
deploy/
  nginx/    Nginx 配置
```

## 本地联调

第一次安装依赖：

```bash
npm run install:all
```

启动 MySQL：

```bash
docker compose up -d mysql
```

启动三端开发服务：

```bash
npm run dev:api
npm run dev:admin
npm run dev:mobile:h5
```

默认开发地址：

- H5：`http://localhost:5173/`
- 管理后台：`http://localhost:5174/login`
- API 健康检查：`http://localhost:3000/api/health`
- API 就绪检查：`http://localhost:3000/api/health/ready`
- API 指标：`http://localhost:3000/api/health/metrics`

健康检查：

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/ready
```

`/api/health/live` 只表示 API 进程存活；`/api/health/ready` 会同时检查数据库和生产配置，适合给负载均衡或发布脚本判断是否可接流量；`/api/health/metrics` 输出 Prometheus 文本格式的基础指标。

环境诊断：

```bash
npm run doctor
```

`npm run doctor` 会同时检查本地依赖、端口连通性和上线配置体检项。后台登录后也可以进入“上线体检”页面查看 `JWT_SECRET`、数据库密码、生产域名、支付沙箱端点、通知服务商凭证和自动关单任务是否已准备好。

API 烟测：

```bash
npm run smoke
npm run smoke:flow
npm run smoke:tenant:seed
npm run smoke:tenant
```

`npm run smoke` 默认请求 `http://localhost:3000/api`，如需测试其他地址可设置 `API_BASE`。`npm run smoke:flow` 会创建烟测活动和用户，自动验证免费活动审核、签到、评价，以及付费活动线下收款确认。两条烟测都会改写共享测试数据，其中 `npm run smoke` 会临时切换全站报名开关，建议按顺序执行，不要并发运行。

`npm run smoke:tenant` 用于预发多机构隔离验收。可以先用 `npm run smoke:tenant:seed` 幂等准备 A/B 两个机构、各自的运营账号、财务账号、smoke 代理和代理支付账户：

```bash
TENANT_A_CODE=tenant-a TENANT_A_ADMIN=tenant_a_ops TENANT_A_PASSWORD=...
TENANT_B_CODE=tenant-b TENANT_B_ADMIN=tenant_b_ops TENANT_B_PASSWORD=...
ENV_FILE=deploy/.env.production npm run smoke:tenant:seed
API_BASE=https://api.example.com/api TENANT_A_CODE=tenant-a TENANT_A_ADMIN=tenant_a_ops TENANT_A_PASSWORD=... TENANT_B_CODE=tenant-b TENANT_B_ADMIN=tenant_b_ops TENANT_B_PASSWORD=... npm run smoke:tenant
```

脚本会验证后台活动、首页配置、运营设置、公告、公开端 `tenantCode`、跨机构详情访问、订单支付入口和沙箱回调归属隔离。通过后会写入 `deploy/tenant-smoke-result.json`，生产 `npm run preflight` 在 `MULTI_TENANT_ENABLED=true` 或 `MULTI_TENANT_PREFLIGHT_PASSED=true` 时会校验这份验收记录是否通过且未过期。预发未开启沙箱支付时，可临时设置 `TENANT_SMOKE_SKIP_PAYMENT=true` 跳过支付回调段，但跳过支付段的结果不会让生产 preflight 放行。

财务账号默认使用 `${TENANT_A_ADMIN}_finance` / `${TENANT_B_ADMIN}_finance`，密码默认复用对应机构密码；如需自定义可设置 `TENANT_A_FINANCE_ADMIN`、`TENANT_A_FINANCE_PASSWORD`、`TENANT_B_FINANCE_ADMIN`、`TENANT_B_FINANCE_PASSWORD`。完整验收还会解析 Excel 导出文件并验证报名导出、代理结算列表/详情/导出不串机构。

Docker MySQL 默认监听 `127.0.0.1:3306`。当前 `apps/api/.env` 可按你的本地环境调整；如果使用本机临时 MySQL，请保持 `.env` 中的端口和实际 MySQL 端口一致。本地开发默认 `DB_SYNCHRONIZE=true`，便于快速建表。

本地 Docker 全栈验收建议使用开发专用环境文件，避免直接用生产默认值触发生产配置校验：

```bash
docker compose -p activity-registration --env-file deploy/.env.local-docker.example up -d --build
```

正式发布必须改用 `deploy/.env.production`，并替换真实域名、密钥、发布标识和服务商配置。

如果当前 Windows 环境无法使用 Docker，可启动本机 MySQL 8，并把 `apps/api/.env` 中的 `DB_HOST`、`DB_PORT`、账号和密码改为对应配置。建议 MySQL 数据目录使用不含中文和空格的路径，避免 Windows 配置文件编码问题。

## V1 增强版能力

本项目已经在 MVP 基础上补齐第一阶段商业版能力：

- H5 首页展示公告、分类、推荐活动和最新活动。
- 活动详情支持主理人、活动亮点、适合人群、活动流程、常见问题、报名须知和评价。
- 我的报名详情展示状态时间线、线下付款提示、签到码和评价入口。
- 后台支持公告管理、评价管理、首页推荐配置和数据看板。
- 后台活动编辑支持报名字段、主理人和结构化详情模块。
- 后台活动封面支持本地图片上传，API 会写入 `UPLOAD_DIR` 并通过 `/uploads/` 对外访问。
- 后台新增运营设置，可维护全站报名开关、暂停报名提示、线下付款说明、客服联系方式、退款说明和发票说明，H5 活动详情、报名页和报名详情实时展示。
- 后台新增操作日志，记录活动、报名、订单、退款、签到、候补和运营设置等关键操作的操作者、时间、对象和摘要。
- 后台管理员账号支持创建、重置密码、启用、禁用和当前账号自助修改密码；上线前可处理默认 `admin` 账号，并防止禁用最后一个可用管理员。

后续仍需继续推进真实支付服务商、生产级监控和真实城市样板验收。

## V2 运营增长进度

已开始实现运营增长能力：

- H5 活动详情可生成专属邀请码和邀请链接。
- API 支持分享访问追踪：`POST /public/activities/:id/track-share`。
- API 支持邀请数据生成：`POST /public/activities/:id/share-poster`。
- 后台新增活动漏斗：浏览、分享访问、邀请码、报名、付款、成功、签到、评价。
- H5 满员活动报名会进入候补名单，后台可查看候补并在释放名额后补位。
- 后台新增用户标签，可标记重点用户、嘉宾、黑名单、候补等运营身份。
- 后台新增通知中心，可管理站内/微信/短信/邮件模板占位，并记录发送历史。
- 通知模板支持变量渲染和预览：活动名、用户昵称、时间地点、手机号、签到码等。
- 后台支持按活动批量发送提醒，当前以站内发送记录模拟，后续可替换为短信/邮件/微信 provider。
- API 已加入通知 provider 抽象、发送状态、服务商消息号、失败原因、失败重试和基础发送频控。
- 后台可查看通知服务商状态；生产启用短信、邮件或微信订阅消息时会校验必填凭证。
- 后台支持活动前提醒规则，可手动执行到期提醒；API 预留可选 worker 自动执行。
- 后台新增活动复盘页，集中查看漏斗、签到率、评价均分、最近评价和通知触达。
- 后台新增财务对账页，展示订单数、实收、退款、净收入、支付流水、退款记录和支付对账差异。
- 订单记录、财务流水和活动复盘均支持 Excel 导出。
- `npm run smoke` 已覆盖邀请生成、分享追踪、活动漏斗、通知服务商状态、通知预览、通知发送、失败重试、活动批量提醒、提醒规则和活动复盘接口。
- `npm run smoke:flow` 已覆盖候补补位和用户标签接口。

## V3 商业化进度

已开始落地商业化交易能力：

- 后台 API 支持活动票种管理：`GET/POST/PATCH /admin/ticket-types`。
- 后台已新增票种管理页面，可按活动筛选、创建、编辑、启停票种。
- 后台 API 支持优惠码管理：`GET/POST/PATCH /admin/coupons`，包含固定金额、折扣比例、使用门槛、活动限定、有效期和使用次数限制。
- 后台已新增优惠码管理页面，可创建、编辑、启停优惠码并查看使用量。
- 用户端 API 支持活动报价：`POST /public/activities/:id/quote`，报名时可选择票种和优惠码。
- H5 报名页已支持选择票种、输入优惠码、实时查看原价、优惠金额和应付金额。
- 付费报名订单已保存原价、优惠金额、实付金额、票种和优惠码。
- 本地 mock 支付支持主动支付和回调入口：`POST /public/orders/:id/pay/mock`、`POST /payment/mock/callback`。
- 微信支付、支付宝已具备沙箱 provider 骨架：`POST /public/orders/:id/pay/wechat`、`POST /public/orders/:id/pay/alipay`。
- 沙箱支付回调已加入 HMAC 签名验签：`POST /payment/wechat/callback`、`POST /payment/alipay/callback`；签名错误会拒绝回调且不修改订单。
- 沙箱签名密钥支持 `PAYMENT_SANDBOX_SECRET`、`WECHAT_PAY_SANDBOX_SECRET`、`ALIPAY_PAY_SANDBOX_SECRET` 配置。
- `NODE_ENV=production` 时默认关闭 mock/沙箱支付端点，避免测试支付接口误改生产订单；如需预发沙箱联调，必须显式设置 `PAYMENT_SANDBOX_ENABLED=true`。
- 支付回调会写入审计日志，记录服务商、订单号、交易号、金额、验签结果、处理结果和原始 payload，后台财务页可查看最近回调日志。
- 支付回调按交易号幂等处理，重复回调不会重复修改订单和报名状态。
- 支付回调金额异常不会修改订单，会沉淀为待处理对账差异，后台财务页可扫描并标记已处理。
- 后台支持支付对账差异接口：`POST /admin/finance/reconciliation/scan`、`POST /admin/finance/transactions/:id/resolve`。
- 后台支持订单退款申请：`POST /admin/orders/:id/refund`，按退款号幂等处理，退款申请先进入财务待审核。
- 后台财务页支持退款审核：`POST /admin/refunds/:id/approve`、`POST /admin/refunds/:id/reject`，审核通过后才更新订单状态、报名状态和积分账。
- 后台订单管理页已展示票种、优惠码、原价、优惠金额、实付金额，并支持发起退款申请。
- H5 报名详情页已展示票种、优惠码、原价、优惠金额、实付金额和退款状态。
- 待付款订单会记录付款截止时间，后台可手动关闭过期待付款订单并释放报名名额。
- 可通过 `OFFLINE_PAYMENT_EXPIRE_MINUTES`、`ORDER_CLOSE_WORKER_ENABLED` 和 `ORDER_CLOSE_WORKER_INTERVAL_SECONDS` 配置线下付款有效期及自动关闭 worker。
- 新增会员等级、会员档案和积分记录模型。
- 后台新增会员管理页，可查看会员等级、积分、累计消费、报名/签到/评价统计和会员详情。
- 线下收款、mock 支付、审核通过的退款、签到和评价会写入幂等积分记录，并刷新会员档案。
- 报价和报名下单已接入会员等级折扣，订单会记录会员等级和会员优惠金额。
- H5 报名页、H5 报名详情页和后台订单页均可展示会员优惠明细。
- 报价和报名下单已支持积分抵扣，默认 100 积分抵 1 元，订单会记录使用积分和积分抵扣金额。
- 用户取消、后台拒绝/取消、全额退款时会幂等返还已使用积分，避免积分账不平。
- 后台活动表单支持设置会员门槛，可将活动限定为指定会员等级及以上用户报名。
- 后台活动表单支持设置优先报名窗口，可在指定时间前仅允许指定会员等级及以上用户报名。
- H5 活动详情和报名页会展示会员专属、优先报名提示、当前等级和不可报名原因；API 会在提交报名和候补补位时做最终拦截。
- 后台运营设置支持全站暂停新报名，可在维护、支付异常、库存核对或活动调整时阻止新报名，已产生的报名、订单、审核、收款和签到流程不受影响。
- 后台运营设置支持线下付款、客服、退款和发票文案配置，减少上线后改代码调整运营说明。
- 后台操作日志支持追踪关键人工动作，便于上线后处理收款、退款、名额和签到争议。
- 新增迁移 `TicketsCouponsAndRefundStatuses1780492000000`，覆盖票种、优惠码和订单金额字段。
- 新增迁移 `MembersLevelsAndPoints1780493000000`，覆盖会员等级、会员档案和积分记录。
- 新增迁移 `MemberDiscountOrders1780494000000`，覆盖订单会员等级和会员优惠金额。
- 新增迁移 `OrderPointsRedemption1780495000000`，覆盖订单积分抵扣和积分返还标记。
- 新增迁移 `ActivityMemberAccess1780496000000`，覆盖活动会员门槛字段。
- 新增迁移 `OrderExpiryAndClose1780497000000`，覆盖待付款订单过期关闭字段。
- 新增迁移 `RefundReviewFlow1780498000000`，覆盖退款审核人、审核备注和审核时间字段。
- 新增迁移 `PaymentReconciliation1780499000000`，覆盖支付流水对账状态、差异类型、处理人和处理备注字段。
- 新增迁移 `ActivityPriorityBooking1780500000000`，覆盖活动优先报名会员等级和优先报名截止时间字段。
- 新增迁移 `PaymentCallbackLogs1780501000000`，覆盖支付回调审计日志。
- 新增迁移 `OperationSettings1780502000000`，覆盖单机构运营配置。
- 新增迁移 `AdminOperationLogs1780503000000`，覆盖后台关键操作审计日志。
- 新增迁移 `H5AuthCodeLogs1780504000000`，覆盖 H5 验证码发送、失败和限流审计。
- 新增迁移 `AdminLoginLogs1780505000000`，覆盖后台登录成功、失败和限流审计。
- `npm run smoke` 已覆盖运营设置、全站暂停报名拦截、操作日志、后台登录审计、H5 验证码审计、支付沙箱开关体检、票种、优惠码、报价、折扣报名、mock 支付、微信/支付宝沙箱支付、签名错误拦截、重复回调、支付回调审计日志、异常回调对账差异、对账差异处理、退款申请、重复退款幂等、退款审核通过、会员等级、会员档案、积分记录、会员价下单、积分抵扣、取消返还、会员专属活动报名拦截和优先报名窗口。

当前项目进度、阻塞项和下一步见 [项目进度表](docs/project-progress.md)。

下一批 V3 能力建议继续做：真实微信支付/支付宝 SDK 与证书接入、退款回调、真实对账单拉取和多机构隔离。真实支付接入前请按 [真实支付接入计划](docs/real-payment-integration-plan.md) 推进，并保持 `REAL_PAYMENT_ENABLED=false`。

## 默认后台账号

- 用户名：`admin`
- 密码：`Admin123456`

请在生产环境首次登录后立即修改。
后台登录页不会预填默认账号密码；本地开发如需使用默认账号，请手动输入。

## 开发种子数据

开发环境 API 启动时会自动补齐：

- 分类：沙龙、读书会、培训
- 免费读书会：需要审核
- 付费沙龙：线下收款，后台确认付款

H5 本地演示用户固定为：`13800000001 / 本地演示用户`，刷新页面不会反复生成新用户。

七维文化城市合伙人演示数据可手动准备：

```bash
npm run seed:qiwai-demo
```

脚本会创建杭州、苏州、成都 3 个城市合伙人租户、商家管理员/运营/财务/签到账号、演示收款主体和每个商家的样板活动。默认密码为 `Qiwai123456`，可用 `QIWAI_DEMO_PASSWORD=...` 覆盖。

演示前可运行样板验收：

```bash
npm run smoke:qiwai-demo
```

验收会检查 3 个城市合伙人后台账号登录、后台活动租户隔离、公开端 `tenantCode` 活动隔离和招商页依赖的客服联系方式。
同时会对杭州、苏州、成都三城样板活动各跑一笔业务闭环：H5 用户报名、财务确认线下收款、签到账号核销、用户标签、活动复盘、财务订单可见；并验证杭州部分退款、平台超级管理员跨商家监管和活动发布审核流。

生成三城样板经营报告：

```bash
npm run report:qiwai-demo
```

报告会输出到 `docs/qiwai-demo-sample-report.md`，汇总活动数、报名、已收款订单、GMV、退款、净收入、签到率和城市状态。

H5 登录模式：

- 本地开发默认使用 `H5_AUTH_MODE=dev`，前端会自动获取开发验证码并登录本地演示用户。
- 生产环境必须使用 `H5_AUTH_MODE=sms`，并配置强 `H5_AUTH_SECRET`；短信服务商凭证优先在后台“系统设置/运营设置”中维护，`.env.production` 可保留 `SMS_PROVIDER_ENABLED` 和短信字段作为初始引导。
- `/public/auth/h5-login` 必须携带 `/public/auth/h5-code` 返回的 `verificationToken` 和用户输入的 6 位验证码；`npm run smoke` 会验证无验证码不能登录。
- `/public/auth/h5-code` 会写入 `h5_auth_code_logs` 审计表，并按手机号、IP 和冷却时间做发送频控；本地开发默认放宽，生产示例默认开启严格限制。

## 校验命令

```bash
npm run test
npm run build
npm run doctor
npm run preflight
npm run smoke
npm run smoke:flow
```

生产迁移准备：

```bash
npm run init:production-env
npm --prefix apps/api run migration:show
npm --prefix apps/api run migration:run
```

当前开发环境默认 `DB_SYNCHRONIZE=true`。生产环境必须设置 `DB_SYNCHRONIZE=false`，先备份数据库，再执行 migration。

`npm run preflight` 用于正式发布前检查构建产物、真实生产环境变量、Nginx 安全配置、Docker Compose 关键变量和迁移状态；没有 `deploy/.env.production` 或仍使用示例域名/密钥时会失败。

数据库备份：

```bash
npm run db:backup
npm run db:prune-backups
```

恢复备份需要显式确认目标库名，避免误恢复：

```bash
RESTORE_CONFIRM=activity_registration BACKUP_FILE=backups/mysql/activity_registration-YYYYMMDD-HHMMSS.sql.gz npm run db:restore
```

## 上线运营

上线前请阅读 [上线运营检查清单](docs/launch-checklist.md)，上线后按 [生产运营 Runbook](docs/production-runbook.md) 做发布记录、监控、排障、备份恢复和回滚。生产部署建议先执行 `npm run init:production-env` 生成 `deploy/.env.production`，脚本会写入随机密钥且不会覆盖已有文件；随后替换真实域名、`BUILD_COMMIT`、短信服务商凭证和可选通知服务商凭证。

Docker Compose 支持环境变量覆盖端口和密码：

```bash
docker compose --env-file deploy/.env.production up -d --build
```

生产环境上线前需要重点确认：

- `JWT_SECRET` 已替换为强随机值。
- `H5_AUTH_MODE=sms`、`H5_AUTH_SECRET` 和短信服务商凭证已配置，H5 手机号验证码登录可用。
- H5 验证码频控参数已按预计流量配置，发送、失败和限流记录可在 `h5_auth_code_logs` 表审计。
- 后台登录失败频控参数已配置，成功、失败和限流记录可在后台“登录日志”页面审计。
- `SECURITY_HEADERS_ENABLED=true`、生产 `SECURITY_HSTS_ENABLED=true`、生产 `VALIDATION_FORBID_NON_WHITELISTED=true`，并根据反向代理设置 `TRUST_PROXY`。
- `ACCESS_LOG_ENABLED=true`，API 响应会带 `X-Request-Id`，访问日志会输出 JSON，便于按请求排查报名、支付和签到问题。
- `APP_VERSION`、`BUILD_COMMIT`、`BUILD_TIME` 已注入发布信息，`/api/health` 和 `/api/health/metrics` 可看到当前版本。
- `CORS_ORIGIN` 已替换为真实 H5 和后台域名。
- `DB_PASSWORD` 已替换为强密码，`DB_SYNCHRONIZE=false` 已确认。
- 默认后台账号已修改或禁用。
- MySQL 已配置自动备份。
- `BACKUP_DIR` 位于持久化磁盘或会同步到对象存储，并已做过一次 `db:backup` 与测试库恢复演练。
- `/api/health`、H5 首页和后台登录页均可访问。
- `/api/health/ready` 返回 `ready: true`，`/api/health/metrics` 可被监控系统抓取。
- 后台“上线体检”页面没有 `需修复` 项；`npm run doctor` 的生产配置检查没有 `ERR` 项。
- `npm run preflight` 已通过；若提示缺少 `deploy/.env.production`，请先执行 `npm run init:production-env`，再替换真实域名、`BUILD_COMMIT` 和服务商凭证。
- `PUBLIC_API_ORIGIN` 和 `UPLOAD_DIR` 已配置；Docker 部署时上传目录已挂载持久化卷，Nginx 可访问 `/uploads/`。

API 在 `NODE_ENV=production` 时会自动校验 `JWT_SECRET`、`DB_PASSWORD`、`DB_SYNCHRONIZE`、`CORS_ORIGIN`、公开域名、安全响应头、严格请求字段校验、支付沙箱端点和已启用通知服务商凭证；仍使用默认值、生产开启数据库自动同步、生产开启沙箱支付或缺少必填凭证会拒绝启动。

## Windows 说明

当前项目没有使用 npm workspaces 安装依赖，因为部分 Windows 环境默认不允许创建 workspace symlink。请使用 `npm run install:all` 分别安装各子项目依赖。

uni-app 依赖固定到 DCloud `vue3` 发行线，避免 npm 默认解析到旧 alpha 版本导致 H5 构建失败。
