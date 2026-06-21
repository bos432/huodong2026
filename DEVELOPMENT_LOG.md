# DEVELOPMENT LOG

本文件记录无人值守持续开发模式下，每个小阶段的实施、验证和遗留事项。

## 2026-06-21 - 公益与招募右侧浏览器验收阻塞复核

### 阶段名称

公益与招募 v2 - 右侧浏览器可视化验收接管复核。

### 本阶段完成内容

- 按本轮请求重新读取 `docs/development-handoff.md`、`docs/launch-checklist.md` 和最新 `DEVELOPMENT_LOG.md`。
- 复核最新开发记录，确认公益与招募 v2 的本地开发小阶段已完成到“志愿者成长证书模板与证书下载”。
- 确认当前计划内剩余事项主要是右侧浏览器可视化验收：后台 `/admin/volunteers` 发证按钮、H5 “我的证书”下载按钮、刷新后证书状态保持。
- 按浏览器控制说明再次尝试接管用户右侧 in-app browser，工具层仍返回 `codex/sandbox-state-meta: missing field sandboxPolicy`，无法取得可点击浏览器标签。
- 用户明确授权使用右侧浏览器后，于 2026-06-21 18:23 再次重试右侧浏览器接管，结果仍为同一工具层错误；说明当前阻塞不是用户授权不足，而是浏览器控制通道缺少必要运行元数据。
- 排查本机常见调试端口，`9001` 为 MinIO Console，`9000` 返回 403，`9080` 为其他本地服务返回 480，均不是可用于接管右侧浏览器的调试端点；标准 `9222` 也未提供浏览器调试信息。
- 复核本地 Docker 服务状态，确认 API、MySQL 和 nginx 仍在运行，API 与数据库健康。
- 未修改业务代码、数据库业务数据、真实支付开关、真实资金实现标记或测试数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 17:49:27 +08:00。
- `GET http://127.0.0.1:3000/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`、`config=warning`。
- `docker compose -p activity-registration ps --format json`：通过，`activity-api` 为 `healthy`，`activity-mysql` 为 `healthy`，`activity-nginx` 为 `running`。
- 右侧浏览器接管：失败，仍为浏览器控制工具元数据缺失问题；本阶段没有能力执行点击级 UI 验收。
- 授权后复测时间：2026-06-21 18:23:46 +08:00；右侧浏览器接管仍失败，错误仍为 `codex/sandbox-state-meta: missing field sandboxPolicy`。

### 浏览器验收结果

- 验证时间：2026-06-21 17:49:27 +08:00。
- 验证环境：用户右侧 in-app browser 当前打开 `http://127.0.0.1:18080/admin/mall-payments`，本地 Docker API `http://127.0.0.1:3000/api`，nginx `http://127.0.0.1:18080`。
- 浏览器验证主要步骤：尝试初始化并接管右侧浏览器标签，未能进入页面交互阶段。
- 输入的测试数据摘要：本阶段未新增业务测试数据。
- 通过项：本地 API、数据库、nginx 运行状态正常；最近一轮证书接口链路和构建结果仍可作为非浏览器验证依据。
- 发现的问题：右侧浏览器控制工具在用户授权后仍无法使用，错误为 `codex/sandbox-state-meta: missing field sandboxPolicy`；无法完成最终要求的右侧浏览器全角色主流程验证。
- 是否达到可上线运营标准：否。公益与招募 v2 本地接口/构建达到可继续验收状态，但按用户最终验收规则，仍缺右侧浏览器真实交互验证；真实公网收费运营也仍需补齐真实 HTTPS 域名、短信服务商、微信/支付宝商户资料、证书、回调 URL 和真实预发验收数据。

### 遗留问题

- 右侧浏览器可视化验收仍被工具层阻塞，已连续多轮出现同一问题；用户授权已确认，不再是权限确认问题。
- 当前没有新的本地可安全执行的计划内公益与招募开发小阶段；继续推进最终上线验收必须恢复右侧浏览器控制，或由人工按同一流程完成可视化验收后再继续。
- 真实生产上线仍受外部资料和真实服务商预发验收条件限制，不能伪造通过或打开真实资金开关。

### 下一阶段应继续处理的事项

- 浏览器控制恢复后，立即补做 `/admin/volunteers` 发证按钮、H5 “我的证书”下载按钮、刷新后证书状态保持，以及后台/H5/多角色主流程验收。
- 外部真实资料补齐后，执行生产 `doctor`、`preflight`、`smoke:real-payment`、`smoke:mall-multi-merchant`、`prelaunch:online-showcase`，再用右侧浏览器走全流程。

## 2026-06-21 - 志愿者成长证书模板与证书下载

### 阶段名称

公益与招募 v2 - 志愿者成长证书模板/证书下载小阶段。

### 本阶段完成内容

- 重新读取开发计划相关文档与 `DEVELOPMENT_LOG.md`，确认本阶段延续“公益与招募 v2”中“志愿者成长证书模板、证书下载”的计划内方向。
- 复用既有 `certificates` 表，没有新增证书模板表或复杂文件存储。
- 后台志愿者档案列表新增用户绑定状态、证书数量和最近证书提示。
- 后台新增志愿者档案发证接口与“发证”按钮：仅对已绑定 H5 用户账号的志愿者发放证书，未绑定用户时提示先由用户登录后申请/报名。
- 后台登记志愿服务记录后，如果志愿者档案已绑定用户账号，会自动生成当前成长等级的志愿服务证书；同名证书重复发放时复用既有记录，避免重复刷证。
- 前台“我的证书”页新增“下载证书”按钮；下载接口返回平台标准 SVG 证书文件，包含用户昵称/手机号、证书名称和发放日期。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/admin.module.ts`
- `apps/api/src/modules/admin/dto.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/public/public.controller.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/admin/src/views/Volunteers.vue`
- `apps/mobile/src/pages/user/certificates.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 17:46:35 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释与大 chunk 提醒。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `docker compose -p activity-registration up -d --build api nginx`：通过，`activity-api` healthy。
- `npm.cmd run test:preflight-guards`：通过。
- 真实 HTTP 验证通过：
  - `GET /api/health/ready`：`ready=true`。
  - `POST /api/admin/volunteer/tasks`：创建测试任务 `Certificate Volunteer Task 174558`，返回 id `3`。
  - `POST /api/public/volunteer/tasks/3/apply`：登录用户报名任务，手机号 `13992174558`，返回报名 id `3`。
  - `PATCH /api/admin/volunteer/task-applications/3`：报名状态更新为 `approved`。
  - `POST /api/admin/volunteer/service-records`：登记服务记录 `Certificate Service 174558 / 1.5h`，返回 id `3`，并自动发放证书。
  - `GET /api/public/me/certificates`：可读取证书 id `1`，证书名 `七维书院·公益参与者志愿服务证书（1.5小时）`。
  - `GET /api/public/me/certificates/1/download`：可下载 SVG 证书，验证文件大小 `1315 bytes`。

### 浏览器验收结果

- 验证时间：2026-06-21 17:46:35 +08:00。
- 验证环境：本地 Docker API `http://127.0.0.1:3000/api`，后台/H5 构建产物已通过构建验证。
- 浏览器可视化验证：未完成。本阶段继续采用真实 HTTP 与构建验证替代；阶段完成后再次尝试接管右侧浏览器，工具层仍返回 `codex/sandbox-state-meta: missing field sandboxPolicy`，右侧浏览器点击级验收需在浏览器控制可用时补做。
- 输入的测试数据摘要：测试用户 `Cert Volunteer 174558 / 13992174558`，志愿任务 `Certificate Volunteer Task 174558`，服务记录 `Certificate Service 174558 / 1.5h`，证书 id `1`。
- 通过项：后台发证接口、服务记录自动发证、前台证书列表读取和 SVG 下载接口均通过；后台/H5 构建通过。
- 发现的问题：未能完成右侧浏览器点击“发证”和 H5 点击“下载证书”的可视化验收；浏览器控制工具仍因 `sandboxPolicy` 元数据缺失不可用。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；正式上线前仍需补做浏览器点击验收，并在真实运营数据下确认用户绑定率和证书命名规则。

### 遗留问题

- 未绑定 H5 用户账号的志愿者档案不能发放到“我的证书”，需要运营引导志愿者登录后提交志愿者申请或报名任务。
- 当前下载格式为 SVG 标准证书；如运营需要 PDF/图片盖章版，可在后续计划中明确升级。
- 右侧浏览器可视化验收仍待补做。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，确认“公益与招募 v2”是否还有本地可执行的小阶段。
- 浏览器控制恢复后补做 `/admin/volunteers` 发证按钮、H5 “我的证书”下载按钮和刷新后证书状态保持的 UI 验收。

## 2026-06-21 - 各角色操作教程更新

### 阶段名称

运营文档 - 各角色操作教程同步后台支付资料上传与验收流程。

### 本阶段完成内容

- 读取现有 `docs/role-operation-guide.md`、`docs/development-handoff.md` 和最新 `DEVELOPMENT_LOG.md`。
- 将角色操作教程版本更新为 `v2`，更新时间更新为 `2026-06-21`。
- 更新系统入口，补充 Docker 本地后台/H5 入口 `http://127.0.0.1:18080/admin/` 与 `http://127.0.0.1:18080/`，同时保留 Vite 开发入口。
- 在平台超级管理员章节补充“后台支付资料上传与上线验收”流程，说明真实域名、短信、微信/支付宝商户资料、证书路径、商城回调 URL、配置体检、真实小额预发验收和上线门禁的操作关系。
- 在商城运营章节补充“商城收款资料上传与验收”流程，说明资料上传、回调 URL 校验、配置检测、测试支付锁定、验收状态、平台代收与店铺直收回调隔离。
- 更新角色总览、常见异常处理和上线前必须确认事项，明确真实支付资料优先在后台维护，未完成证书和预发验收前不得打开真实支付或绕过门禁。

### 修改/新增的主要文件

- `docs/role-operation-guide.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 16:35:04 +08:00。
- 已用 `Select-String` 快速确认文档包含：
  - `版本：v2`
  - `更新时间：2026-06-21`
  - Docker 本地后台入口
  - `### 5.4 后台支付资料上传与上线验收`
  - `### 10.5 商城收款资料上传与验收`
- 本阶段为 Markdown 文档更新，未运行代码构建或自动化测试。

### 遗留问题

- 教程仍以文字和 Mermaid 流程图为主，尚未生成 PDF/Word 版本。
- 真实生产商户号、证书、短信服务商和预发验收数据仍需运营/部署侧补齐后再按教程执行真实上线验收。

### 下一阶段应继续处理的事项

- 如需要交付给运营团队，可基于 `docs/role-operation-guide.md` 生成 Word/PDF 版，并补充截图版教程。
- 补齐真实生产资料后，按教程执行后台配置、商城收款 readiness、真实支付 smoke 和全角色主流程验收。

## 2026-06-21 - 后台支付资料上传与验收流程右侧浏览器 UI 验收

### 阶段名称

后台支付资料上传与验收流程 - 右侧浏览器部署配置保存、配置体检和商城收款 readiness 验收。

### 本阶段完成内容

- 按本轮请求重新读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md` 和 `DEVELOPMENT_LOG.md`。
- 用户打开右侧浏览器后，复核当前本地后台标签并登录本地管理员 `admin / Admin123456`。
- 在右侧浏览器打开当前有效商城收款配置页 `http://127.0.0.1:18080/admin/mall-payments?merchantId=16&tenantId=19`，确认页面能正常加载，当前账号为 `super_admin`。
- 确认商城收款配置页展示“支付资料上传与验收”闭环，包含资料上传、回调 URL 校验、配置检测、测试支付和验收状态。
- 确认商城支付 readiness 从后台保存的上线资料读取商城回调 URL：`https://api.test-qiwai.example/payment/mall/wechat/callback` 和 `https://api.test-qiwai.example/payment/mall/wechat/refund-callback`。
- 确认当前 readiness 仍为“配置未就绪”，真实测试支付按钮处于“已锁定”，阻塞原因为测试证书文件不可读取，符合未补齐真实证书和预发验收前不得开放真实支付的要求。
- 在右侧浏览器进入“系统设置 / 部署配置”，确认后台保存的 H5、后台、API 域名和商城微信回调资料可在 UI 回显。
- 仅修改无资金风险字段“发布提交”为 `ui-browser-check-20260621-1628` 并点击“保存设置”，随后通过接口和浏览器刷新确认该字段持久化。
- 在右侧浏览器切到“配置体检”，确认体检页读取后台保存的 HTTPS 测试域名：`PUBLIC_H5_ORIGIN=https://h5.test-qiwai.example`、`PUBLIC_ADMIN_ORIGIN=https://admin.test-qiwai.example`、`PUBLIC_API_ORIGIN=https://api.test-qiwai.example`。
- 刷新商城收款配置页并监听页面请求和运行时错误，未发现业务接口 4xx/5xx、前端异常或 console error。
- 未修改真实支付总开关、真实资金实现标记、证书文件、商户号真实性、`deploy/real-payment-smoke-result.json` 或真实支付验收结果。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 16:26:55 +08:00。
- 验证环境：本地 Docker 部署，后台入口 `http://127.0.0.1:18080/admin/`，API `http://127.0.0.1:3000/api`，MySQL Docker 容器。
- 浏览器验证主要步骤：
  - 打开右侧浏览器后台登录页并使用 `admin / Admin123456` 登录。
  - 进入商城收款配置页，选择/读取平台机构店铺 `merchantId=16`。
  - 查看“支付资料上传与验收”区块，确认资料上传、回调 URL 校验、配置检测、测试支付和验收状态均展示。
  - 进入“系统设置 / 部署配置”，查看测试上线资料回显。
  - 修改“发布提交”为 `ui-browser-check-20260621-1628` 并保存。
  - 刷新页面后再次打开“部署配置”，确认发布提交、API 域名、H5 域名和商城微信回调仍然回显。
  - 进入“配置体检”，确认体检结果读取后台保存的 HTTPS 测试域名。
  - 回到商城收款配置页并刷新，确认 readiness 与回调 URL 展示一致。
- 输入的测试数据摘要：
  - 管理员账号：`admin / Admin123456`。
  - 修改字段：`BUILD_COMMIT=ui-browser-check-20260621-1628`。
  - 验证店铺：`merchantId=16`，店铺名“平台机构”，平台代收。
- 通过项：
  - 后台页面能正常打开并登录。
  - 部署配置可回显后台保存资料。
  - 部署配置可通过 UI 保存，刷新后关键字段仍持久化。
  - 配置体检读取后台保存的 H5/后台/API 域名。
  - 商城收款配置读取后台保存的商城微信支付/退款回调 URL。
  - 未就绪时测试支付被锁定，不会误开放真实资金流量。
  - 刷新商城收款页后无业务接口 4xx/5xx、无前端运行异常、无 console error。
- 发现的问题：
  - 当前测试证书路径 `WECHAT_PAY_PRIVATE_KEY_PATH` 和 `WECHAT_PAY_PLATFORM_CERT_PATH` 文件不可读取，readiness 按预期阻断真实支付。
  - 当前仅验证本地测试上线资料；真实生产资料、真实证书和服务商预发数据尚未补齐。
  - 浏览器地址会保留为 `merchantId=16`，`tenantId=19` 参数被前端路由规整掉，但页面实际读取当前有效平台机构店铺正常。
- 是否达到可上线运营标准：
  - 后台支付资料上传与验收流程的本地 UI 闭环达到本阶段验收要求。
  - 整套系统尚未达到真实公网收费运营标准；仍需补齐真实 HTTPS 域名、短信服务商、微信/支付宝商户资料、证书、回调 URL，并完成 `smoke:real-payment`、多商户商城 smoke 和预发布门禁。

### 遗留问题

- 真实微信/支付宝支付、商城微信支付、店铺直收、真实退款、真实账单拉取和代理真实打款仍必须等待真实服务商资料与预发验收。
- 当前证书路径是测试值且文件不可读取，不能打开真实支付总开关或真实资金实现标记。
- 系统最终全角色主流程浏览器验收仍需在真实资料或明确验收环境准备好后继续执行。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，复核是否还有不依赖真实外部资料的计划内小阶段。
- 如已进入最终上线验收，应在补齐真实资料后执行 `npm run smoke:real-payment`、`npm run smoke:mall-multi-merchant` 和 `npm run prelaunch:online-showcase`，再用右侧浏览器走全角色主流程。

## 2026-06-21 - 后台支付资料上传与验收流程 UI 验收阻塞复核

### 阶段名称

后台支付资料上传与验收流程 - 右侧浏览器 UI 验收接管复核与当前有效店铺 readiness 校验。

### 本阶段完成内容

- 重新读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md`、`docs/production-runbook.md` 和 `DEVELOPMENT_LOG.md`，确认本阶段仍属于计划内的真实支付资料后台闭环与上线验收范围。
- 按浏览器控制说明尝试接管右侧 in-app browser，工具层仍返回 `codex/sandbox-state-meta: missing field sandboxPolicy`，无法使用标准右侧浏览器自动化接口执行 UI 交互。
- 复核 Codex 桌面调试端口，当前暴露目标不是用户正在看的本地后台页；为避免干扰用户已有标签，本阶段未强行改写右侧可见页面。
- 复核 Docker 服务状态，`activity-api`、`activity-mysql` 和 `activity-nginx` 均在运行，其中 API 与 MySQL 为 healthy。
- 复核 API 健康状态，API 与数据库均为 `up`，配置状态仍为 `warning`，符合真实生产资料未完全补齐时的预期。
- 使用平台管理员 HTTP 登录后读取后台上线资料，确认测试 `launchConfig` 仍保存在后台：`apiOrigin=https://api.test-qiwai.example`、`adminOrigin=https://admin.test-qiwai.example`、`h5Origin=https://h5.test-qiwai.example`、`realPaymentEnabled=false`、商城微信平台代收回调为 `https://api.test-qiwai.example/payment/mall/wechat/callback`。
- 发现用户当前旧链接中的 `merchantId=181&tenantId=8` 在当前 Docker 数据库中已不存在，`payment-readiness` 正确返回“商城店铺不存在”；随后通过 `GET /api/admin/mall/merchants` 和 `GET /api/admin/mall/payment-merchants` 选取当前有效店铺 `merchantId=16 / tenantId=19`（平台机构）继续复核。
- 对当前有效店铺执行 `payment-readiness`，结果为 `not_ready`，阻塞原因集中在测试证书文件不可读取；真实支付仍未放开，符合“后台可补资料、未通过预发验收不开放真实资金”的上线门禁预期。
- 未修改业务代码、数据库业务记录、真实支付开关、真实资金实现标记、`deploy/real-payment-smoke-result.json` 或测试数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 16:14:32 +08:00。
- `GET http://127.0.0.1:3000/api/health`：通过，`api=up`、`database=up`、`config=warning`，`release.commit=local-docker-mobile-admin`。
- `docker compose -p activity-registration ps --format json`：通过，`activity-api` healthy，`activity-mysql` healthy，`activity-nginx` running。
- `POST http://127.0.0.1:3000/api/admin/auth/login`：通过，默认本地管理员 `admin / Admin123456` 可登录。
- `GET http://127.0.0.1:3000/api/admin/settings/operation`：通过，后台保存的测试上线资料可读取。
- `GET http://127.0.0.1:3000/api/admin/mall/payment-readiness?merchantId=181&tenantId=8`：按当前数据状态返回 404“商城店铺不存在”，说明该旧测试链接已失效。
- `GET http://127.0.0.1:3000/api/admin/mall/merchants`：通过，当前可用平台店铺包含 `merchantId=16 / tenantId=19`。
- `GET http://127.0.0.1:3000/api/admin/mall/payment-readiness?merchantId=16&tenantId=19`：通过，返回 `status=not_ready`，主要问题为 `WECHAT_PAY_PRIVATE_KEY_PATH` 和 `WECHAT_PAY_PLATFORM_CERT_PATH` 测试证书文件不可读取。
- 右侧浏览器 UI 验证：未完成，原因是 in-app browser 控制工具仍然不可用；本阶段已用 HTTP 和服务健康复核替代，但不能等同于最终右侧浏览器全流程验收。

### 遗留问题

- 右侧浏览器真实 UI 操作验收仍待补做：需要在工具恢复后打开当前有效后台入口，例如 `http://127.0.0.1:18080/admin/mall-payments?merchantId=16&tenantId=19`，确认部署配置回显、保存、刷新持久化、配置体检和商城支付 readiness 页面展示一致。
- 当前用户浏览器里的旧链接 `merchantId=181&tenantId=8` 已不适合继续验收；后续应改用当前存在的店铺 ID，或先在后台创建/恢复目标店铺。
- 真实生产上线仍需由运营/部署侧在后台补齐真实 HTTPS 域名、短信服务商资料、微信/支付宝商户号、密钥、证书路径、回调 URL 和真实预发验收结果。
- 当前 readiness 按预期仍阻断真实支付；未补齐真实证书文件和预发证据前，不能打开真实资金相关开关。

### 下一阶段应继续处理的事项

- 若右侧浏览器控制恢复，立即补做平台管理员 UI 验收：进入“系统设置 / 部署配置”保存一个无资金风险字段，刷新确认回显，再进入“商城收款配置”检查 `merchantId=16 / tenantId=19` 的 readiness 与后台配置一致。
- 若浏览器控制仍不可用，则停止等待工具恢复，或由人工在右侧浏览器按上述有效地址完成可视化验收后再继续最终全角色主流程验证。
- 补齐真实生产资料后，再执行 `npm run smoke:real-payment`、`npm run smoke:mall-multi-merchant` 和 `npm run prelaunch:online-showcase`，并在右侧浏览器复验全流程。

## 2026-06-20 - 再次恢复后的外部条件阻塞确认

### 阶段名称

上线运营检查清单 - 再次恢复后的真实支付/生产资料阻塞确认。

### 本阶段完成内容

- 按本轮请求再次读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md`、`docs/production-runbook.md` 和 `DEVELOPMENT_LOG.md`。
- 复核日志顶部最近阶段，确认上一个未完成事项仍是“等待真实生产域名、真实支付/短信服务商资料和预发验收条件补齐”。
- 确认当前没有新增的计划内本地开发小阶段；继续推进真实支付上线必须依赖外部商户资料、证书、HTTPS 回调域名和真实预发验收。
- 未修改业务代码、数据库业务数据、真实支付开关、真实资金实现标记或任何 smoke 结果文件。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 23:31:02 +08:00。
- `GET http://127.0.0.1:3000/api/health`：通过，`api=up`、`database=up`、`config=warning`。
- 本轮未重复执行破坏性或会改写测试数据的 smoke；最近记录显示 `deploy/mall-multi-merchant-smoke-result.json` 已通过且 `deploy/real-payment-smoke-result.json` 仍未通过。

### 遗留问题

- 真实公网收费运营仍被同一组外部条件阻塞：真实 HTTPS 域名、短信服务商凭证和模板、微信/支付宝商户号、API key、私钥/证书、支付/退款回调 URL、真实服务商账单样例、真实支付/退款/账单/代理打款预发证据和回滚记录。
- 当前不能在本地伪造 `deploy/real-payment-smoke-result.json` 或打开真实资金相关开关；否则会绕过上线门禁。

### 下一阶段应继续处理的事项

- 停止等待外部生产资料补齐。
- 补齐后重新读取开发计划和开发记录，继续执行 `npm run smoke:real-payment`、`npm run smoke:mall-multi-merchant`、`npm run prelaunch:online-showcase`，并在右侧浏览器走全流程与多角色验收。

## 2026-06-20 - 重复恢复后的计划阻塞复核

### 阶段名称

上线运营检查清单 - 重复恢复后的真实生产外部条件阻塞复核。

### 本阶段完成内容

- 按本轮请求重新读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md`、`docs/production-runbook.md` 和 `DEVELOPMENT_LOG.md`。
- 复核开发计划中“下一步”条目，确认当前可在本地继续处理的后台支付资料上传、多商户商城 smoke、上线门禁复核和本地主流程验收均已有完成记录。
- 检查当前 API 健康状态和两个关键验收结果文件，确认多商户商城本地 smoke 已通过，真实支付预发验收仍未通过。
- 未修改业务代码、数据库业务数据、真实支付开关、真实资金实现标记、`deploy/real-payment-smoke-result.json` 或 `deploy/mall-multi-merchant-smoke-result.json`。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 23:29:54 +08:00。
- `GET http://127.0.0.1:3000/api/health`：通过，`api=up`、`database=up`、`config=warning`。
- `deploy/mall-multi-merchant-smoke-result.json`：`passed=true`，`checkedAt=2026-06-20T15:23:11.431Z`，`apiBase=http://localhost:3000/api`。
- `deploy/real-payment-smoke-result.json`：`passed=false`，`checkedAt=2026-06-12T07:32:50.321Z`；`paymentCreate`、`paymentSceneCoverage`、`paymentCallback`、`duplicateCallback`、`amountMismatchCallback`、`refundRequest`、`refundNotification`、`refundQuery`、`statementFetch`、`agentAccountRouting`、`agentTransfer`、`rollbackPlan` 仍为 `pending` 或未完成。

### 遗留问题

- 真实公网收费运营继续被外部条件阻塞：需要真实 HTTPS H5/后台/API 域名、真实短信服务商资料、微信/支付宝商户号、API key、私钥/证书、支付/退款回调 URL、真实服务商账单样例和真实预发验收记录。
- 真实支付结果文件不能伪造通过；未补齐服务商证据前，不应打开 `REAL_PAYMENT_ENABLED`、`MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED`、`MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED`、真实退款/账单/代理打款相关标记。
- 当前没有新的本地可安全执行的小阶段；继续开发必须等外部生产资料补齐，或由产品/运营确认新的计划内范围。

### 下一阶段应继续处理的事项

- 停止等待真实生产域名、真实支付/短信服务商资料和预发验收条件补齐。
- 条件补齐后，从真实上线验收阶段恢复：重新读取开发计划和开发记录，执行生产配置检查、真实支付 smoke、多商户商城 smoke、预发布门禁，并在右侧浏览器复验全流程与多角色流程。

## 2026-06-20 - 当前上线门禁复核与外部阻塞确认

### 阶段名称

上线运营检查清单 - 当前服务健康与真实支付上线门禁复核。

### 本阶段完成内容

- 按要求重新读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md`、`docs/production-runbook.md` 和 `DEVELOPMENT_LOG.md`。
- 复核最近已完成阶段，确认后台支付资料上传与验收流程、多商户商城 smoke API 地址一致性复跑、真实支付/多商户上线门禁复核均已有记录。
- 检查当前 API 服务健康状态，确认 API 与数据库仍可用。
- 重新执行线上演示预发布门禁，确认新增后台支付资料上传闭环没有绕开真实支付门禁；真实服务商资料和联调证据缺失时仍然返回 NO-GO。
- 未修改业务代码、真实支付开关、真实资金实现标记、`deploy/real-payment-smoke-result.json` 或测试数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 23:27:35 +08:00。
- `GET http://127.0.0.1:3000/api/health`：通过，`api=up`、`database=up`、`config=warning`、`release.version=0.1.0`、`release.commit=local`。
- `API_BASE=http://localhost:3000/api`、`SHOWCASE_ADMIN_USERNAME=admin`、`SHOWCASE_ADMIN_PASSWORD=Admin123456`、`SHOWCASE_PASSWORD=Qiwai123456` 执行 `npm.cmd run prelaunch:online-showcase`：按预期返回 NO-GO（退出码 1）。
- 门禁通过项：多商户商城 smoke 结果已通过且仍新鲜；平台管理员登录成功；演示商家存在；前台当前可用支付方式为余额支付和线下收款。
- 门禁阻塞项摘要：`deploy/real-payment-smoke-result.json` 未 `passed=true` 且已过期；缺少微信 Native/H5/JSAPI、支付回调、重复回调、异常金额、退款请求/通知/查询、服务商账单、代理账户路由、商城支付/回调/退款、防串店、代理真实打款和回滚方案证据；当前 `API_BASE` 仍为本地 HTTP；缺少微信支付 AppID、商户号、API v3 key、私钥、证书序列号、平台证书、商城支付回调 URL 和退款回调 URL。

### 遗留问题

- 当前没有新的本地可安全执行的计划内开发小阶段；剩余事项属于真实生产环境和服务商预发验收条件。
- 真实公网收费运营仍需补齐真实 HTTPS H5/后台/API 域名、短信服务商凭证和模板、微信/支付宝商户资料、证书、回调 URL、真实账单样例、真实支付/退款/账单/代理打款预发证据与回滚记录。
- 未补齐前必须继续保持 `REAL_PAYMENT_ENABLED=false`、`MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED=false`、`MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED=false`、真实退款/账单/打款相关标记关闭。

### 下一阶段应继续处理的事项

- 停止等待真实生产域名、真实支付/短信服务商资料和预发验收条件补齐。
- 条件补齐后从真实生产上线阶段恢复：重新读取开发计划和开发记录，执行生产 `doctor`、`preflight`、`smoke:real-payment`、`smoke:mall-multi-merchant`、`prelaunch:online-showcase`，再在右侧浏览器复验主流程和多角色流程。

## 2026-06-20 - 多商户 smoke 复跑后的剩余阻塞复核

### 阶段名称

上线运营检查清单 - 多商户 smoke 地址一致后真实生产外部条件阻塞复核。

### 本阶段完成内容

- 在完成多商户商城 `smoke:mall-multi-merchant` 按 `http://localhost:3000/api` 复跑后，再次读取开发计划和开发记录。
- 复核剩余计划项，确认当前本地可执行的小阶段已经处理完毕：后台支付资料上传闭环、运行态复核、多商户商城动态 smoke、上线门禁复核均已执行并记录。
- 确认剩余阻塞全部属于真实生产环境和服务商预发验收，不应在本地用假证据、假域名或开关强行放行。
- 未修改业务代码、真实支付开关、真实资金实现标记或 `deploy/real-payment-smoke-result.json`。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 23:24:38 +08:00。
- `GET http://127.0.0.1:3000/api/health`：通过，API 与数据库均为 `up`。
- 已确认最新多商户商城 smoke 结果：`deploy/mall-multi-merchant-smoke-result.json` 中 `apiBase=http://localhost:3000/api`，且 `prelaunch:online-showcase` 已识别为通过且新鲜。
- 已确认最新上线门禁仍为 NO-GO，剩余阻塞为真实 HTTPS 线上地址、真实微信/支付宝商户资料、真实支付 smoke 证据、商城微信支付/商户直收/退款/账单/代理真实打款/回滚记录。

### 遗留问题

- 真实公网收费运营仍被外部条件阻塞：
  - 需要真实 HTTPS H5、后台和 API 域名。
  - 需要微信/支付宝商户号、API key、证书、平台证书、支付回调 URL、退款回调 URL 和真实服务商账单样例。
  - 需要在预发或线上地址完成 `smoke:real-payment`，并让 `deploy/real-payment-smoke-result.json` 中支付、回调、重复回调、异常金额、退款、账单、商城支付、商户直收错路由、代理真实打款和回滚记录全部通过。
  - 未补齐前必须保持 `REAL_PAYMENT_ENABLED=false`、`MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED=false`、`MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED=false` 等真实资金标记关闭。

### 下一阶段应继续处理的事项

- 停止等待真实生产域名、真实支付/短信服务商资料和预发验收条件补齐。
- 条件补齐后从真实生产上线阶段恢复：重新读取开发计划和开发记录，执行生产 `doctor`、`preflight`、`smoke:real-payment`、`smoke:mall-multi-merchant`、`prelaunch:online-showcase`，再在右侧浏览器复验主流程和多角色流程。

## 2026-06-20 - 多商户商城 smoke API 地址一致性复跑

### 阶段名称

上线运营检查清单 - 多商户商城 `smoke:mall-multi-merchant` 按当前 API 地址复跑。

### 本阶段完成内容

- 按要求重新读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md`、`docs/production-runbook.md` 和 `DEVELOPMENT_LOG.md` 后，选择上线门禁中暴露的“多商户商城 smoke API_BASE 不一致”作为本轮小阶段。
- 复核 `scripts/smoke-mall-multi-merchant.mjs` 与 `scripts/prelaunch-online-showcase.mjs`，确认多商户商城 smoke 结果文件会记录 `apiBase`，上线门禁会要求它与当前 `API_BASE` 一致。
- 使用本地演示账号环境变量执行多商户商城动态 smoke：
  - `API_BASE=http://localhost:3000/api`
  - `SHOWCASE_ADMIN_PASSWORD=Admin123456`
  - `SHOWCASE_PASSWORD=Qiwai123456`
- smoke 完整覆盖店铺主体、授权、商品审核、前台店铺、跨店购物车、子订单履约、店铺结算、结算完成凭证、已结算后退款冲抵、支付日志、统计和导出，并写回 `deploy/mall-multi-merchant-smoke-result.json`。
- 再次执行 `prelaunch:online-showcase`，确认此前的多商户 smoke API 地址不一致与缺少 `SHOWCASE_ADMIN_PASSWORD` 问题已消失。
- 未修改真实支付开关、真实资金实现标记或 `deploy/real-payment-smoke-result.json`。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`
- `deploy/mall-multi-merchant-smoke-result.json`（被忽略的本地/预发验收结果文件，已更新 `apiBase=http://localhost:3000/api`）

### 运行或测试结果

- 验证时间：2026-06-20 23:23:35 +08:00。
- `GET http://localhost:3000/api/health`：通过，API 与数据库均为 `up`。
- `npm.cmd run smoke:mall-multi-merchant`：通过，结果写入 `deploy/mall-multi-merchant-smoke-result.json`，`apiBase=http://localhost:3000/api`。
- `npm.cmd run prelaunch:online-showcase`：按预期仍返回 NO-GO；多商户商城 smoke 已标记通过且新鲜，平台管理员登录成功，前台当前可用支付方式为余额支付和线下收款。
- `prelaunch:online-showcase` 当前剩余阻塞项集中在：
  - `API_BASE` 仍为本地 HTTP，不是 HTTPS 线上地址。
  - `deploy/real-payment-smoke-result.json` 未通过且真实支付证据过期/缺项。
  - 商城真实微信支付下单/回调路由尚未完成服务商验收，`MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED` 等标记不能打开。
  - 微信支付商户资料缺少 `WECHAT_PAY_APP_ID`、`WECHAT_PAY_MCH_ID`、`WECHAT_PAY_API_V3_KEY`、私钥路径、证书序列号、平台证书路径、支付回调 URL 和退款回调 URL。
  - 前台商城微信支付仍显示不可正式开放。

### 遗留问题

- 多商户商城本地动态 smoke 已按当前 API 地址重新通过；真实上线仍必须在 HTTPS 线上或预发地址再次执行并保留对应结果。
- 真实微信支付、商城微信支付、商城商户直收、退款、账单、代理真实打款和回滚证据仍缺少真实服务商预发验收。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，确认是否还有本地可执行的计划内小阶段。
- 若补齐真实 HTTPS 域名、微信/支付宝商户资料和服务商预发账号，再执行 `npm run smoke:real-payment` 与 `npm run prelaunch:online-showcase`。

## 2026-06-20 - 真实支付与多商户商城上线门禁复核

### 阶段名称

上线运营检查清单 - `prelaunch:online-showcase` 真实支付与多商户商城上线门禁复核。

### 本阶段完成内容

- 在完成后台支付资料上传与验收流程运行复核后，按要求重新读取开发计划和 `DEVELOPMENT_LOG.md`。
- 选择计划内的上线前门禁复核作为本轮小阶段，执行 `npm.cmd run prelaunch:online-showcase`。
- 确认新增“后台支付资料上传与验收流程”没有绕开真实支付上线门禁；真实支付证据不完整时仍然返回 NO-GO。
- 未修改真实支付开关、真实资金实现标记、`deploy/real-payment-smoke-result.json` 或 `deploy/mall-multi-merchant-smoke-result.json`。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 23:20:36 +08:00。
- `npm.cmd run prelaunch:online-showcase`：按预期返回 NO-GO（命令退出码 1）。
- 关键阻塞项：
  - `deploy/real-payment-smoke-result.json` 未 `passed=true`，且结果已超过 168 小时。
  - 真实支付缺少 `paymentCreate`、多场景支付、支付回调、重复回调、异常金额、退款请求、退款通知、退款查询、账单拉取、代理账户路由、商城支付、商城回调防串店、商城退款、代理真实打款和回滚方案等通过项。
  - 微信真实支付场景缺少 `wechat.native`、`wechat.h5`、`wechat.jsapi` 通过证据。
  - 商城支付、商城回调、商城退款、商户直收错路由拒绝和代理真实打款均缺少服务商、商家/代理、订单/结算单、流水号、回调日志、回滚记录等证据字段。
  - 多商户商城 smoke 文件存在且通过，但记录的 `API_BASE=http://127.0.0.1:3000/api`，当前上线门禁期望 `http://localhost:3000/api`，要求按当前线上地址重新执行。
  - `API_BASE` 不是 HTTPS 线上地址。
  - 缺少 `SHOWCASE_ADMIN_PASSWORD` 环境变量。

### 遗留问题

- 当前系统仍不能按真实公网收费运营标准放量真实支付；这不是代码问题，而是外部生产条件和真实服务商预发证据未补齐。
- 多商户商城 smoke 虽有通过文件，但上线门禁要求 API 地址与当前线上地址一致且应为 HTTPS。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，确认是否还有本地可执行的计划内小阶段。
- 补齐真实 HTTPS 域名、`SHOWCASE_ADMIN_PASSWORD`、真实商户/服务商资料，并在对应线上或预发地址重新执行多商户商城 smoke 与真实支付 smoke 后，再恢复上线门禁验收。

## 2026-06-20 - 后台支付资料上传与验收流程运行复核

### 阶段名称

真实支付接入计划 - 后台支付资料上传与验收流程浏览器/API 复核。

### 本阶段完成内容

- 按要求重新读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md`、`docs/production-runbook.md`、`docs/local-acceptance-test-plan.md`、`docs/project-progress.md` 和 `DEVELOPMENT_LOG.md` 后，选择上一阶段遗留的“后台支付资料上传与验收流程运行复核”作为本轮小阶段。
- 复核本地服务状态：API `http://127.0.0.1:3000/api/health`、后台 `http://127.0.0.1:5174/admin/mall-payments?merchantId=181&tenantId=8` 和 H5 `http://127.0.0.1:5173/?tenantCode=platform` 均可访问。
- 首次调用 `POST /api/admin/mall/merchant-payment-credentials` 返回 404，确认原因是当前 API 进程仍运行旧 `dist/main.js`，尚未加载上一阶段新增路由。
- 执行 `npm.cmd --prefix apps/api run build` 后重启 3000 端口 API 进程，健康检查恢复正常，新进程已加载新增上传接口。
- 使用默认管理员登录后复核当前店铺 `merchantId=181` 的 `payment-readiness`，结果为 `not_ready`，阻塞项包含缺少微信商户配置、真实支付开关未开启、商城回调 URL 未配置，符合计划中“未完成真实服务商预发前不得放开真实支付”的要求。
- 使用本地假证书文件验证支付资料上传：`.pem` 上传成功并返回服务器保存路径；`.txt` 被 400 拒绝，提示仅支持 `.pem/.key/.crt/.cer/.p12/.pfx`。
- 右侧内置浏览器控制层本轮仍无法连接，因此改用本机 Chrome 调试端口做页面级自动化复核：写入后台登录态后打开商城收款配置页，确认“支付资料上传与验收”“资料上传”“回调 URL 校验”“配置检测”“测试支付”均渲染，且未就绪时“测试支付”按钮保持禁用。
- 页面级网络复核只发现 `http://127.0.0.1:5174/favicon.ico` 404，无业务接口 4xx/5xx 和无加载失败。
- 未修改真实支付开关、真实资金实现标记或 `deploy/real-payment-smoke-result.json`。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`
- `apps/api/uploads/payment-credentials/1781968512572-e8284118d16f9.pem`（本轮上传接口复核生成的假证书测试文件，不含真实密钥）
- `.local-logs/api-payment-upload-verify.out.log`
- `.local-logs/api-payment-upload-verify.err.log`

### 运行或测试结果

- 验证时间：2026-06-20 23:19:24 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- API 重启后 `GET /api/health`：通过，`api=up`、`database=up`。
- `POST /api/admin/auth/login`：通过，默认管理员可登录并具备 `mall.payment.manage`、`mall.finance.view` 权限。
- `GET /api/admin/mall/payment-readiness?merchantId=181`：通过，返回 `status=not_ready`，阻塞原因符合真实支付挡板预期。
- `POST /api/admin/mall/merchant-payment-credentials` 上传 `.pem`：通过，返回服务器路径 `apps/api/uploads/payment-credentials/1781968512572-e8284118d16f9.pem`。
- `POST /api/admin/mall/merchant-payment-credentials` 上传 `.txt`：按预期 400 拒绝。
- Chrome 页面自动化复核：通过；页面渲染支付验收面板，`测试支付` 按钮在 `not_ready` 状态下禁用；业务网络请求无 4xx/5xx。
- `npm.cmd --prefix apps/admin run build`：通过；保留既有 VueUse PURE 注释和大 chunk 警告。
- `node scripts/preflight-mall-multi-merchant-guard.mjs`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过，无空白错误；仅保留 Windows 工作区 LF/CRLF 转换警告。

### 遗留问题

- 右侧内置浏览器控制层仍无法连接，本轮未能直接接管用户右侧浏览器标签；已用本机 Chrome 调试端口完成等价页面加载复核。
- 支付资料上传与验收面板已可运行，但当前店铺真实支付仍未就绪，原因是缺真实微信/支付宝商户资料、HTTPS 回调域名、真实支付实现/放量开关和预发证据。
- 本地上传测试文件仅用于验证接口，不代表真实商户证书已配置。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，确认是否还有本地可执行的计划内小阶段。
- 若进入真实支付上线阶段，需要先准备真实 HTTPS 域名、服务商商户资料和预发账号，再执行真实小额支付、回调、退款、账单、错路由拒绝和回滚证据验收。

## 2026-06-20 - 后台支付资料上传与验收流程

### 阶段名称

真实支付接入计划 - 后台支付资料上传与验收流程标准化。

### 本阶段完成内容

- 按要求重新读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md`、`docs/production-runbook.md`、`docs/local-acceptance-test-plan.md`、`docs/project-progress.md` 和 `DEVELOPMENT_LOG.md` 后，选择“后台支付资料上传与验收流程”作为本轮小阶段。
- 在商城收款配置页新增“支付资料上传与验收”区域，集中展示资料上传、回调 URL 校验、配置检测、测试支付和验收状态。
- 将微信/支付宝收款账户配置从单一 JSON 输入增强为结构化字段：商户 AppID、商户号、API 密钥、证书序列号、私钥/证书路径等会实时同步到底层 `config` JSON。
- 新增商城支付资料上传接口 `POST /admin/mall/merchant-payment-credentials`，仅允许 `.pem/.key/.crt/.cer/.p12/.pfx`，返回服务器保存路径供支付配置字段使用；不返回公开 URL。
- 支付资料上传接口归入 `mall.payment.manage` 权限，继续受后台角色和商城支付配置权限控制。
- 配置检测继续读取既有 `payment-readiness` 后端结果，校验 HTTPS 回调、商城/店铺专属回调路径、真实支付挡板和预发证据状态。
- “测试支付”按钮保持受控：只有 readiness 达到 `real_ready` 才允许引导进入小额真实支付验收；未就绪时显示阻塞原因，不会伪造真实支付通过记录。
- 更新多商户商城静态 guard，锁定支付资料上传、回调 URL 校验、配置检测、测试支付按钮和验收状态锚点。
- 未修改 `REAL_PAYMENT_ENABLED`、真实资金实现标记或 `deploy/real-payment-smoke-result.json`。

### 修改/新增的主要文件

- `apps/admin/src/views/MallPayments.vue`
- `apps/api/src/modules/mall/mall-admin.controller.ts`
- `apps/api/src/modules/mall/mall.service.ts`
- `apps/api/src/modules/admin/admin-permissions.ts`
- `scripts/preflight-mall-multi-merchant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 23:07:35 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；保留既有 VueUse PURE 注释和大 chunk 警告。
- `node scripts/preflight-mall-multi-merchant-guard.mjs`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过，无空白错误；仅保留 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器连接本轮未能建立，未做浏览器点击验收；本阶段已通过构建和 guard 验证，页面实际使用需在后台 dev/API 服务重载后复核。

### 遗留问题

- 支付资料上传只完成后台资料闭环，不代表真实支付已可上线。
- 真实支付上线仍需真实 HTTPS 回调域名、微信/支付宝商户号、API key、证书文件、官方服务商预发小额支付、支付/退款回调、重复回调、异常金额、账单拉取、商城错路由拒绝和回滚记录。
- `REAL_PAYMENT_ENABLED`、`MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED`、`MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED` 等真实资金标记仍应保持关闭，直到真实验收文件通过。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，复核是否还有本地可执行的计划内小阶段。
- 若进入真实支付上线阶段，需要先准备真实商户资料、HTTPS 回调域名和预发环境，再执行 `npm run smoke:real-payment` 与 `npm run prelaunch:online-showcase`。

## 2026-06-20 - 重启后外部条件阻塞复核

### 阶段名称

上线运营检查清单 - 重新读取计划后的真实生产外部条件阻塞复核。

### 本阶段完成内容

- 按要求重新读取 `docs/launch-checklist.md`、`docs/production-runbook.md`、`docs/local-acceptance-test-plan.md`、`docs/real-payment-integration-plan.md`、`docs/project-progress.md` 和 `DEVELOPMENT_LOG.md`。
- 复核最近完成的小阶段：数据库备份清理、手动数据库备份、根级构建、根级测试、preflight、smoke、smoke:flow、迁移状态、API 健康检查、H5/后台入口、多商户商城 smoke、右侧浏览器主流程和多角色验收均已有通过记录。
- 确认当前没有新的本地可安全执行计划内开发阶段；剩余事项依赖真实生产域名、短信服务商、支付服务商、生产部署和运维资源。
- 未修改业务代码、真实支付开关、真实支付验收结果文件或测试数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:28:12 +08:00。
- 本阶段为计划与记录复核，没有执行新的构建、烟测或浏览器写入操作。
- 已确认仍有效的通过项：
  - `npm.cmd run build`：通过。
  - `npm.cmd run test`：通过。
  - `npm.cmd run preflight`：通过。
  - `npm.cmd run smoke`：通过。
  - `npm.cmd run smoke:flow`：通过。
  - `npm.cmd --prefix apps/api run migration:show`：93 个 migration 全部 `[X]`。
  - `npm.cmd run db:prune-backups`：通过。
  - `npm.cmd run db:backup`：通过并生成 `backups/mysql/activity_registration-20260620-142541.sql.gz`。
  - 右侧浏览器 H5、后台多角色和商城主流程验收：已有通过记录。
- 已确认仍有效的阻塞项：`npm.cmd run prelaunch:online-showcase` 按预期 `NO-GO`，真实支付、真实退款、服务商账单、商城真实支付、店铺直收、代理真实打款和回滚计划仍缺少真实服务商预发证据。

### 遗留问题

- 真实公网正式收费运营仍被外部生产条件阻塞：
  - 真实 HTTPS H5、后台和 API 域名及反向代理。
  - 真实短信服务商凭证、签名、模板和验证码实发验证。
  - 微信/支付宝商户号、证书、API key、支付/退款回调 URL 和服务商账单样例。
  - 真实支付、退款、账单拉取、商城支付、店铺直收、代理真实打款、失败用例和回滚记录的预发证据。
  - 生产对象存储或独立备份磁盘、自动备份计划、监控日志采集、正式管理员账号治理和默认管理员处置。
- 未补齐前必须保持 `REAL_PAYMENT_ENABLED=false` 及真实资金相关实现/放量标记关闭。

### 下一阶段应继续处理的事项

- 停止等待外部生产条件补齐。
- 补齐后从真实生产上线小阶段恢复：重新读取开发计划和开发记录，执行生产 `doctor`、`preflight`、真实服务商联调、`npm run smoke:real-payment`、`npm run prelaunch:online-showcase`，然后在右侧浏览器复验生产主流程和各角色流程。

## 2026-06-20 - 本轮上线阻塞复核

### 阶段名称

上线运营检查清单 - 备份项补齐后的真实生产外部条件阻塞复核。

### 本阶段完成内容

- 在补齐 `npm run db:prune-backups` 和 `npm run db:backup` 两个数据备份小阶段后，再次读取开发计划和开发记录。
- 复核当前计划内本地可执行项：构建、测试、preflight、smoke、smoke:flow、数据库迁移状态、健康检查、前端入口、浏览器主流程、多角色验收、多商户商城 smoke、备份清理、手动备份和既有恢复演练均已有通过记录。
- 确认剩余事项仍然集中在真实生产环境和外部服务商验收，不应在本地仓库中伪造或用计划外开发替代。
- 未修改业务代码、真实支付开关、真实支付验收结果文件或测试数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:26:38 +08:00。
- 本轮新增通过项：
  - `node scripts/preflight-backup-guard.mjs`：通过。
  - `npm.cmd run db:prune-backups`：通过，默认 30 天策略清理 0 个过期备份。
  - `npm.cmd run db:backup`：通过；在本地环境使用 `apps/api/.env`、`BACKUP_USE_DOCKER=false` 和临时 MariaDB bin PATH 后，生成 `backups/mysql/activity_registration-20260620-142541.sql.gz`。
- 既有通过项仍有效：`npm.cmd run build`、`npm.cmd run test`、`npm.cmd run preflight`、`npm.cmd run smoke`、`npm.cmd run smoke:flow`、`npm.cmd --prefix apps/api run migration:show`、API 健康检查、H5/后台入口访问、多商户商城动态 smoke、右侧浏览器 H5/后台多角色/商城主流程验收、数据库恢复演练。
- 既有真实支付门禁仍有效：`npm.cmd run prelaunch:online-showcase` 按预期 `NO-GO`，真实微信/支付宝支付、商城真实支付、店铺直收、真实退款、服务商账单、代理真实打款和回滚计划仍缺真实服务商预发证据。

### 遗留问题

- 真实公网正式收费运营仍被外部生产条件阻塞：
  - 真实 HTTPS H5、后台和 API 域名及反向代理。
  - 真实短信服务商凭证、签名、模板和验证码实发验证。
  - 微信/支付宝商户号、证书、API key、支付/退款回调 URL 和服务商账单样例。
  - 真实支付、退款、账单拉取、商城支付、店铺直收、代理真实打款、失败用例和回滚记录的预发证据。
  - 生产对象存储或独立备份磁盘、自动备份计划、监控日志采集、正式管理员账号治理和默认管理员处置。
- 未补齐前必须保持 `REAL_PAYMENT_ENABLED=false` 及真实资金相关实现/放量标记关闭。

### 下一阶段应继续处理的事项

- 停止等待外部生产条件补齐。
- 补齐后从真实生产上线小阶段恢复：重新读取开发计划和开发记录，执行生产 `doctor`、`preflight`、真实服务商联调、`npm run smoke:real-payment`、`npm run prelaunch:online-showcase`，然后在右侧浏览器复验生产主流程和各角色流程。

## 2026-06-20 - 数据库手动备份复核

### 阶段名称

上线运营检查清单 - `npm run db:backup` 手动数据库备份复核。

### 本阶段完成内容

- 重新读取开发计划和开发记录后，选择上线清单“数据与备份”中的手动数据库备份作为一个明确小阶段。
- 首次执行 `npm.cmd run db:backup` 时，脚本读取当前生产配置并尝试 Docker 备份，但本机 Docker Desktop Linux Engine 管道不存在，备份失败。
- 改用 `apps/api/.env` 的本地数据库连接并显式设置 `BACKUP_USE_DOCKER=false` 后，发现 `mysqldump.exe` 未在 PATH。
- 排查 `127.0.0.1:13306` 监听进程，确认本地数据库进程为 `C:\Program Files\MariaDB 12.3\bin\mariadbd.exe`，同目录存在 `mysqldump.exe` 和 `mariadb-dump.exe`。
- 临时把 `C:\Program Files\MariaDB 12.3\bin` 加入当前命令 PATH 后重新执行备份，成功生成新的 `.sql.gz` 文件。
- 未修改业务数据、业务代码、真实支付开关或生产配置文件。

### 修改/新增的主要文件

- `backups/mysql/activity_registration-20260620-142541.sql.gz`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:25:52 +08:00。
- `npm.cmd run db:backup`：首次失败，原因是 Docker `desktop-linux` 管道 `npipe:////./pipe/dockerDesktopLinuxEngine` 不存在。
- `$env:ENV_FILE='apps/api/.env'; $env:BACKUP_USE_DOCKER='false'; npm.cmd run db:backup`：失败，原因是 `mysqldump.exe` 未在 PATH。
- `Get-NetTCPConnection -LocalPort 13306`：确认本地 MariaDB 正在监听。
- `Get-Process`：确认数据库进程路径为 `C:\Program Files\MariaDB 12.3\bin\mariadbd.exe`。
- `$env:ENV_FILE='apps/api/.env'; $env:BACKUP_USE_DOCKER='false'; $env:PATH="C:\Program Files\MariaDB 12.3\bin;$env:PATH"; npm.cmd run db:backup`：通过。
- 备份结果：`Database backup written: E:\2027\活动报名\活动报名\backups\mysql\activity_registration-20260620-142541.sql.gz (0.23 MB)`。

### 遗留问题

- 本机手动备份可通过临时 PATH 成功执行；建议生产或运维环境把 MySQL/MariaDB dump 工具加入服务账户 PATH，或明确使用 Docker 容器内 `mysqldump`。
- 生产环境仍需配置持久化备份目录、独立磁盘或对象存储、自动备份计划和定期恢复演练。
- 真实公网正式收费运营仍依赖真实域名、短信、支付证书/回调、真实支付/退款/账单/代理打款预发证据、生产监控日志和正式管理员治理。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录；若没有新的本地可安全执行计划内小阶段，则停止等待外部生产条件补齐。

## 2026-06-20 - 数据库备份清理策略复核

### 阶段名称

上线运营检查清单 - `npm run db:prune-backups` 备份清理策略复核。

### 本阶段完成内容

- 重新读取开发计划和开发记录后，选择上线清单“数据与备份”中的备份清理策略作为一个明确小阶段。
- 阅读 `scripts/db-prune-backups.mjs`、`scripts/db-backup.mjs` 和 `scripts/preflight-backup-guard.mjs`，确认清理脚本只处理备份目录下的 `.sql` / `.sql.gz` 文件，并按 `BACKUP_RETENTION_DAYS` 保留策略清理过期备份。
- 先列出当前 `backups/mysql` 目录，确认现有备份最早为 2026-06-15，不会触发默认 30 天过期清理。
- 执行备份静态 guard 和实际清理命令，验证备份/恢复/清理脚本链路仍被预检覆盖，且默认策略下没有误删现有备份。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:21:35 +08:00。
- `node scripts/preflight-backup-guard.mjs`：通过，输出 `OK   preflight backup guard covers database backup, restore and prune checks.`
- `npm.cmd run db:prune-backups`：通过。
- 清理结果：`Pruned 0 backup file(s) older than 30 day(s) from E:\2027\活动报名\活动报名\backups\mysql`。
- 当前备份目录保留文件：
  - `activity_registration-20260615-113146.sql.gz`
  - `activity_registration-20260620-123852.sql.gz`
  - `activity_registration-20260620-124147.sql.gz`
  - `activity_registration-20260620-124244.sql.gz`

### 遗留问题

- 本地备份清理策略可执行；生产环境仍需把备份目录挂载到持久化独立磁盘或对象存储，并配置真实自动备份任务。
- 真实公网正式收费运营仍依赖真实域名、短信、支付证书/回调、真实支付/退款/账单/代理打款预发证据、生产监控日志和正式管理员治理。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录；若没有新的本地可安全执行计划内小阶段，则停止等待外部生产条件补齐。

## 2026-06-20 - 计划内剩余项阻塞复核

### 阶段名称

上线运营检查清单 - 本地可执行项完成后真实生产外部条件阻塞复核。

### 本阶段完成内容

- 在完成根级 `npm run build` 和 `npm run test` 复核后，再次读取开发计划和开发记录。
- 复核当前计划内本地可执行项状态：构建、自动化测试、preflight、基础 smoke、完整业务流 smoke、数据库迁移状态、API 健康检查、H5/后台入口、右侧浏览器主流程、多角色验收、多商户商城 smoke、数据库备份与恢复演练均已有通过记录。
- 确认剩余计划项集中在真实生产部署和外部服务商验收，不属于当前本地仓库可安全代填、伪造或继续编码完成的事项。
- 未修改业务代码、真实支付开关、真实支付验收结果文件或测试数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:19:00 +08:00。
- 本轮最新通过项：
  - `npm.cmd run build`：通过。
  - `npm.cmd run test`：通过，13 个测试文件、169 个测试用例全部通过。
- 既有通过记录：`npm.cmd run preflight`、`npm.cmd run smoke`、`npm.cmd run smoke:flow`、`npm.cmd --prefix apps/api run migration:show`、API 健康检查、H5/后台入口 HTTP 访问、多商户商城动态 smoke、右侧浏览器 H5/后台多角色/商城主流程验收、数据库备份与恢复演练。
- 既有门禁结论仍有效：`npm.cmd run prelaunch:online-showcase` 按预期 `NO-GO`，真实支付、真实退款、服务商账单、商城真实支付、店铺直收、代理真实打款和回滚计划缺少真实服务商预发证据。

### 遗留问题

- 真实公网正式收费运营仍被外部生产条件阻塞：
  - 真实 HTTPS H5、后台和 API 域名及反向代理配置。
  - 真实短信服务商凭证、签名、模板和验证码实发验证。
  - 微信/支付宝商户号、证书、API key、支付/退款回调 URL 和服务商账单样例。
  - 真实支付、退款、账单拉取、商城支付、店铺直收、代理真实打款、失败用例和回滚记录的预发证据。
  - 生产对象存储或独立备份磁盘、监控日志采集、正式管理员账号治理和默认管理员处置。
- 这些事项不能在本地安全伪造；未补齐前必须保持 `REAL_PAYMENT_ENABLED=false` 及真实资金相关实现/放量标记关闭。

### 下一阶段应继续处理的事项

- 停止等待外部生产条件补齐。
- 补齐后从真实生产上线小阶段恢复：重新读取开发计划和开发记录，执行生产 `doctor`、`preflight`、真实服务商联调、`npm run smoke:real-payment`、`npm run prelaunch:online-showcase`，然后在右侧浏览器复验生产主流程和各角色流程。

## 2026-06-20 - 根级自动化测试复核

### 阶段名称

上线运营检查清单 - `npm run test` 自动化测试复核。

### 本阶段完成内容

- 重新读取开发计划和开发记录后，按上线清单选择一个明确小阶段：复跑根级自动化测试。
- 执行根级 `npm run test`，该脚本调用 API 子项目 Vitest 测试。
- 确认管理后台菜单完整性、配置校验、首页默认值、公益金计算、公开端租户边界、代理转账 adapter、安装服务、公开 DTO、后台权限/角色/租户边界、后台服务和支付 provider 服务测试均通过。
- 未修改业务代码、真实支付开关或测试数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:18:13 +08:00。
- `npm.cmd run test`：通过。
- `npm --prefix apps/api run test`：通过。
- Vitest 结果：13 个测试文件全部通过，169 个测试用例全部通过。

### 遗留问题

- 自动化测试通过不代表真实公网收费运营可放行；真实短信实发、真实支付/退款/账单/代理打款、生产域名、监控日志、备份存储和默认管理员治理仍依赖外部生产条件。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录；若没有新的本地可执行计划内验证项，则记录真实生产外部条件阻塞并停止等待补齐。

## 2026-06-20 - 根级生产构建复核

### 阶段名称

上线运营检查清单 - `npm run build` 根级生产构建复核。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/production-runbook.md`、`docs/local-acceptance-test-plan.md`、`docs/real-payment-integration-plan.md`、`docs/project-progress.md` 和 `DEVELOPMENT_LOG.md`。
- 按上线清单选择一个明确小阶段：复跑根级生产构建。
- 构建链路覆盖 shared、API、后台和 H5，确认当前工作区仍可生成生产构建产物。
- 未修改业务代码、真实支付开关或测试数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:16:59 +08:00。
- `npm.cmd run build`：通过。
- 构建覆盖：
  - `packages/shared`：`tsc -p tsconfig.json` 通过。
  - `apps/api`：`nest build` 通过。
  - `apps/admin`：`vue-tsc --noEmit && vite build --configLoader runner` 通过。
  - `apps/mobile`：`uni build -p h5` 通过。
- 保留非阻塞警告：后台构建仍有既有 VueUse PURE 注释移除提示和大 chunk 提示；H5 构建提示 uni-app 有新版本可更新。

### 遗留问题

- 构建通过不代表真实公网收费运营可放行；真实 HTTPS 域名、短信实发、微信/支付宝商户证书与回调、真实支付/退款/账单/代理打款预发证据、生产监控和备份外部条件仍需补齐。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录；若没有新的本地可执行计划内验证项，则记录真实生产外部条件阻塞并停止等待补齐。

## 2026-06-20 - 线上演示预发布门禁复核

### 阶段名称

上线运营检查清单 - 最新线上演示 smoke 后的 `prelaunch:online-showcase` 真实支付门禁复核。

### 本阶段完成内容

- 重新读取开发计划、生产 runbook、本地验收方案、真实支付接入计划、项目进度表和开发记录后，复核剩余计划项。
- 在 `seed:online-showcase`、`smoke:online-showcase` 和 `preflight` 均通过后，重新执行线上演示预发布门禁。
- 确认多商户商城 smoke 结果仍为通过且新鲜有效，API、平台管理员登录、演示商家和余额/线下支付入口均正常。
- 确认真实微信支付、商城真实微信支付、店铺直收、真实退款、真实账单、代理真实打款和回滚证据仍未满足上线门禁，不打开 `REAL_PAYMENT_ENABLED` 或任何真实支付实现标记。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 约 13:xx +08:00。
- `$env:API_BASE='http://127.0.0.1:3000/api'; $env:PRELAUNCH_ALLOW_HTTP='true'; $env:SHOWCASE_ADMIN_USERNAME='admin'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'; $env:SHOWCASE_PASSWORD='Qiwai123456'; npm.cmd run prelaunch:online-showcase`：按预期失败，结论为 `NO-GO：暂不能开放真实微信支付，共 100 个阻塞项。保持 REAL_PAYMENT_ENABLED=false。`
- 通过项：多商户商城 smoke 已标记通过；结果仍在有效期内；API 地址可访问；平台管理员登录成功；演示商家存在；前台当前可用支付方式为余额支付和线下收款。
- 阻塞项摘要：`deploy/real-payment-smoke-result.json` 不是 `passed=true` 且已超过 168 小时；微信 Native/H5/JSAPI、支付回调、重复回调、异常金额、退款请求、退款通知、退款查询、服务商账单、代理账户路由、商城支付/回调/退款/防串店、代理打款和回滚计划均缺少真实预发证据；微信支付/退款回调地址为空；缺少微信支付 AppID、商户号、API v3 key、商户私钥、证书序列号、平台证书和商城回调 URL。

### 遗留问题

- 真实公网正式收费运营仍被外部生产条件阻塞：需要部署/运营侧提供并验证真实 HTTPS 域名、短信服务商账号与模板、微信/支付宝商户号和证书、真实支付/退款/账单/商城支付/店铺直收/代理打款预发证据、生产 Docker/持久化卷、监控日志采集、独立磁盘或对象存储备份、正式管理员账号和默认账号处置。
- 这些事项不能在本地仓库中安全伪造或代填；未补齐前系统只能作为本地/预发受控试运营，不能开放真实公网正式收费运营或真实微信支付。

### 下一阶段应继续处理的事项

- 停止等待外部生产条件补齐。补齐后需重新读取开发计划和开发记录，执行生产环境 `doctor`、`preflight`、Docker 部署、真实服务商联调、`smoke:real-payment`、`prelaunch:online-showcase` 和右侧浏览器生产主流程复验。

## 2026-06-20 - 线上演示商家 smoke 复验与多店铺 seed 幂等修复

### 阶段名称

上线运营检查清单 - 线上演示商家 `seed:online-showcase` / `smoke:online-showcase` 复验与幂等修复。

### 本阶段完成内容

- 重新读取上线清单、生产 runbook、本地验收方案、真实支付接入计划、项目进度表和本开发记录后，继续选择线上演示商家动态 smoke 复验作为本阶段。
- 修复线上演示 seed 反复执行后的活动容量问题：保留历史测试报名数据，不删除旧记录，并按当前已报名人数自动把演示活动和票种容量扩到“已报名 + 缓冲”，避免收费活动满员后进入候补而无法生成订单。
- 复验并修正线上演示 smoke 的商城订单筛选断言：线下履约售后订单应按实际 `paymentMethod=offline` 筛选，不再硬编码为余额支付。
- 延续本阶段前序修复：商城营销、订单、退款、优惠券、拼团、物流、结算、支付日志等查询显式收敛关系加载与商家上下文，避免 MariaDB 复杂查询超表限制，并增强重复退款请求幂等处理。
- 重新执行线上演示 seed 与 smoke，保留本轮生成的活动报名、订单、退款、课程、商城、评价、物流和导出测试数据。

### 修改/新增的主要文件

- `scripts/seed-online-showcase.mjs`
- `scripts/smoke-online-showcase.mjs`
- `apps/api/src/modules/mall/mall.service.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run build`：通过。
- `node --check scripts\seed-online-showcase.mjs`：通过。
- `node --check scripts\smoke-online-showcase.mjs`：通过。
- `git diff --check -- scripts\seed-online-showcase.mjs scripts\smoke-online-showcase.mjs apps\api\src\modules\mall\mall.service.ts`：通过；仅有 Windows LF/CRLF 转换提示。
- `$env:API_BASE='http://127.0.0.1:3000/api'; $env:SHOWCASE_ADMIN_USERNAME='admin'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'; $env:SHOWCASE_PASSWORD='Qiwai123456'; npm.cmd run seed:online-showcase`：通过。
- 首次复跑 `npm.cmd run smoke:online-showcase`：活动/余额/退款/课程/商城多数链路通过，但因商城订单筛选断言把线下履约订单误按 `balance` 查询而失败。
- 修正筛选口径后再次执行 `npm.cmd run smoke:online-showcase`：通过；覆盖 H5 首页、免费报名、收费余额支付、退款、动态评论审核、课程交付、商城优惠券/积分/推广、拼团、取消/幂等/超时/自动完成、微信支付挡板、线下履约物流、评价审核、售后财务、运营看板、筛选导出、售后导出、支付流水导出和财务追溯。
- `npm.cmd run preflight`：通过；保留既有生产短信凭证未完整配置警告。

### 遗留问题

- 真实公网正式收费运营仍依赖外部生产条件：真实 HTTPS 域名、短信服务商凭证和模板、微信/支付宝商户证书与回调、真实退款/账单/代理打款证据、对象存储/持久化备份、生产监控日志和默认管理员治理。
- 当前本地/演示 smoke 会持续追加测试数据；seed 已能按历史报名自动扩容，但正式生产仍不应以演示账号和演示数据作为上线凭证。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，复核是否还有不依赖外部生产服务商的计划内小阶段；若剩余均为真实域名、短信、支付证书、对象存储或生产运维条件，应记录阻塞并停止等待部署/运营侧补齐。

## 2026-06-20 - 活动发布分步骤向导

### 阶段名称

第 2 批提升易用性 - 活动发布分步骤向导。

### 本阶段完成内容

- 桌面后台活动新建/编辑抽屉新增步骤进度条，覆盖“基础信息、报名字段、主理人、详情模块”四个步骤。
- 既有活动表单分组改为绑定当前步骤，运营可按步骤推进，也可直接点击标签切换。
- 抽屉页脚新增“上一步 / 下一步”操作，保存逻辑、字段结构、接口 payload 和合规体检逻辑保持不变。
- 新建和编辑活动时都会从“基础信息”步骤开始，避免打开旧活动时停留在上一次编辑步骤。

### 修改/新增的主要文件

- `apps/admin/src/views/Activities.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 本阶段只把既有字段组织成步骤向导，没有新增自动草稿、字段级逐步校验或发布前总览页；这些不在当前开发计划明确范围内。

### 下一阶段应继续处理的事项

- 继续核对“建议下一轮开发计划”剩余项；当前观察到第 1 批、第 2 批和第 3 批多数已有实现锚点，下一阶段应做一次计划项完成度复核，若发现缺口再选择对应小阶段。

## 2026-06-20 - 会员分群批量通知

### 阶段名称

第 3 批运营增长 - 会员分群和批量通知。

### 本阶段完成内容

- 后台通知服务新增按用户标签批量发送能力，新增 `/admin/notifications/send-by-tag` 接口。
- 批量发送复用既有通知模板、变量渲染、服务商发送、失败记录和重试机制。
- 标签人群按用户去重，单次最多处理 300 位会员，避免一次误触达过大范围。
- 商家后台按标签批量发送时要求选择关联活动，用于确认通知归属、租户边界和活动变量范围。
- 后台“通知中心”发送表单新增“会员分群”选择，展示每个标签预计触达人数，并提供“发送分群通知”操作。

### 修改/新增的主要文件

- `apps/api/src/modules/v1/v1.service.ts`
- `apps/api/src/modules/v1/v1-admin.controller.ts`
- `apps/api/src/modules/v1/v1.module.ts`
- `apps/admin/src/views/Notifications.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、167 个用例全部通过。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 当前分群来源为既有用户标签；更复杂的动态分群条件（消费金额、签到次数、沉睡天数等）不在本阶段开发计划中，未新增。
- 真实短信、微信订阅消息、邮件仍依赖生产服务商配置；未配置时会按既有通知发送机制记录失败或服务商未就绪状态。

### 下一阶段应继续处理的事项

- 继续按“建议下一轮开发计划”核对剩余项，优先检查第 1 批和第 2 批是否已全部满足；若均已完成，再确认是否还有计划内小阶段未落地。

## 2026-06-20 - 公益公开公示页

### 阶段名称

第 3 批运营增长 - 公益公开公示页登录解耦。

### 本阶段完成内容

- H5“公益池”页面改为先读取公开接口 `/public/charity/summary` 和 `/public/charity/projects`，未登录用户也能查看公益池累计、可用金额、已拨付金额、参与人数和公开公益项目。
- 登录用户继续追加读取 `/public/me/charity` 和个人公益流水，保留个人公益贡献、电子勋章进度和订单公益金明细。
- 个人接口失败或未登录时不影响公开公示内容展示，并提供登录入口查看个人明细。
- 保持既有公益项目卡片、进度和状态展示，不新增后端模型或业务范围。

### 修改/新增的主要文件

- `apps/mobile/src/pages/charity/index.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/mobile run build:h5`：通过；仍有 uni-app 新版本提示。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 当前公开公示复用既有公益汇总和公开项目接口；如需公开展示更完整的拨付凭证、项目执行时间线或审计字段，需要先在开发计划中明确披露口径和隐私边界。
- 公益汇总接口当前沿用既有全局口径；如后续要按商家/机构独立公示，需要在计划中明确租户公示规则。

### 下一阶段应继续处理的事项

- 继续按“建议下一轮开发计划”推进第 3 批运营增长，优先核对“会员分群和批量通知”是否已满足计划验收，或选择其中未完成的小阶段补齐。

## 2026-06-20 - V6 数据中心运营建议展示

### 阶段名称

V6 产品收口 - 数据中心智能运营建议展示。

### 本阶段完成内容

- 在后台“数据中心”页面展示后端 `operationAdvice` 运营建议，补齐体检报告中“数据中心要从看数据升级为给建议”的前台入口。
- 运营建议按 `success`、`warning`、`danger`、`info` 映射 Element Plus 标签样式。
- 运营建议面板随既有日期筛选和 `/admin/analytics/overview` 数据同步刷新，不新增接口、不改变数据统计口径。
- SaaS 商家预检脚本新增 Analytics 页面锚点，覆盖 `operationAdvice`、`adviceTagType` 和运营建议展示。

### 修改/新增的主要文件

- `apps/admin/src/views/Analytics.vue`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 本阶段只展示后端已生成的运营建议；后续若需要更细的 AI/规则建议，需要先在开发计划中明确规则来源和数据边界。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续按开发计划推进产品收口；优先复核体检报告第 1 批 P0 是否已全部落地，若已落地则选择第 2 批或第 3 批中不依赖外部服务的小阶段。

## 2026-06-20 - V6 区域定位命中日志统计

### 阶段名称

V6 区域保护升级 - 定位命中日志聚合统计。

### 本阶段完成内容

- 后台新增 `/admin/tenant-region-hit-logs/summary` 统计接口，复用 `tenant_region.manage` 平台权限。
- 定位日志列表和统计共用同一套筛选逻辑，支持按商家、命中状态、来源 `source`、开始日期和结束日期过滤。
- 统计接口返回定位请求总数、成功命中数、未命中数、命中率、来源分布、命中商家 Top 和命中区域 Top。
- 后台“定位命中日志”页面新增四个统计指标、命中商家排行、命中区域排行和来源分布表。
- 日志页面新增日期范围筛选，统计和明细会随筛选条件同步刷新。
- 后端单测增加统计端点、共用筛选和聚合字段锚点；SaaS 商家预检脚本同步增加统计接口和页面锚点。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/dto.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/admin.service.spec.ts`
- `apps/admin/src/views/TenantRegionHitLogs.vue`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、167 个用例全部通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 行政区自动识别和完整地图 SDK 绘制仍未落地；这两项通常需要地图服务商 key、域名白名单和生产配置确认。
- 当前统计基于已采集的定位命中日志；生产环境需要先执行命中日志迁移并积累真实访问数据后才有运营参考价值。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续按开发计划推进；区域保护中剩余“行政区自动识别”和完整地图 SDK 绘制需要确认地图服务商 key、域名白名单和生产配置。

## 2026-06-20 - V6 区域定位命中日志后台入口

### 阶段名称

V6 区域保护升级 - 定位命中日志后台列表入口。

### 本阶段完成内容

- 新增后台“定位命中日志”页面，接入既有 `/admin/tenant-region-hit-logs` 接口。
- 页面支持按商家、命中状态和来源 `source` 查询定位解析记录，并支持分页。
- 日志列表展示定位时间、命中状态、命中商家、命中区域、用户坐标、距离、来源、客户端 IP 和 User-Agent。
- 定位坐标支持一键打开高德地图标记，便于运营核对边界配置是否准确。
- 后台路由新增 `/tenant-region-hit-logs`，并挂入“平台端 · 商家”菜单，复用 `tenant_region.manage` 平台权限。
- SaaS 商家预检脚本增加定位命中日志页面、路由、菜单、筛选和客户端字段锚点。

### 修改/新增的主要文件

- `apps/admin/src/views/TenantRegionHitLogs.vue`
- `apps/admin/src/router.ts`
- `apps/admin/src/views/Layout.vue`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 当前命中日志已可后台检索，但还没有按区域/商家聚合的统计图表。
- 行政区自动识别和完整地图 SDK 绘制仍未落地；这两项通常需要地图服务商 key、域名白名单和生产配置确认。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续按开发计划推进；若继续区域保护升级，需优先确认是否允许引入地图服务商 SDK/API key 来实现行政区自动识别或可视化绘制。

## 2026-06-20 - V6 区域批量导入 CSV 解析

### 阶段名称

V6 区域保护升级 - 区域批量导入 CSV/TSV 文件解析体验。

### 本阶段完成内容

- 后台“区域保护”批量导入弹窗新增 CSV/TSV/JSON 文件选择入口，运营可直接选择本地文件解析为导入 JSON。
- 新增 CSV 模板下载，模板字段覆盖 `tenantId`、区域名称、经纬度、保护半径、省市区、排他、优先级、启用状态、边界点和备注。
- CSV/TSV 解析支持中英文表头别名，兼容逗号、制表符、引号转义和 UTF-8 BOM。
- CSV 边界点字段支持 JSON 数组，也支持用分号或竖线分隔的坐标点文本。
- 批量导入时统一标准化 `boundaryPoints`，保留原有粘贴 JSON 数组路径。
- SaaS 商家预检脚本增加文件选择、模板下载、CSV 解析和边界字段标准化锚点。

### 修改/新增的主要文件

- `apps/admin/src/views/TenantRegions.vue`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 当前文件解析已覆盖 CSV/TSV/JSON；真正的 `.xlsx` 二进制 Excel 文件解析尚未接入，后续若必须支持需评估前端依赖或后端解析路径。
- 当前仍未接入地图 SDK 的可视化拖拽选点/画多边形。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续推进 V6 区域保护升级；若不新增 `.xlsx` 依赖，下一阶段可在计划范围内补齐区域命中日志的后台可视化列表入口，或继续评估地图 SDK 绘制落地。

## 2026-06-20 - V6 区域地图辅助选点与边界编辑

### 阶段名称

V6 区域保护升级 - 后台地图辅助选点与边界点编辑体验。

### 本阶段完成内容

- 后台“区域保护”新增地图坐标粘贴框，支持从地图链接或 `lng,lat` / `lat,lng` 文本中解析经纬度。
- 区域表单支持把粘贴坐标一键设置为中心点，减少运营手填经纬度出错。
- 区域表单支持把粘贴坐标加入多边形边界点，并保留“打开地图”外链辅助核对中心点。
- 新增多边形边界点表格编辑器，支持添加中心点、移除边界点、清空边界点和修改每个点的经纬度。
- 边界点表格与原有 JSON 文本保持同步，仍保留 JSON 高级编辑和批量导入兼容路径。
- 前端边界点校验补齐 3-200 点数量约束，与后端校验口径保持一致。
- SaaS 商家预检脚本增加坐标粘贴、边界点表格和 JSON 同步锚点，防止后续回退。

### 修改/新增的主要文件

- `apps/admin/src/views/TenantRegions.vue`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 当前仍未接入地图 SDK 的可视化拖拽选点/画多边形，本阶段先提供坐标粘贴、地图外链和点表格编辑的轻量辅助体验。
- 后台区域批量导入仍只支持粘贴 JSON 数组，尚未支持 Excel/CSV 文件解析。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续推进 V6 区域保护升级，优先补齐区域保护批量导入的 CSV/Excel 文件解析体验，或继续在计划范围内推进更完整的地图 SDK 绘制。

## 2026-06-20 - V6 区域多边形排他冲突校验

### 阶段名称

V6 区域保护升级 - 多边形排他冲突校验收口。

### 本阶段完成内容

- 抽出 `tenant-region-geometry` 纯几何 helper，用于统一判断半径区域、多边形区域、多边形与半径区域之间是否冲突。
- 后台区域保存的排他冲突校验从“中心点 + 半径”升级为支持多边形相交、多边形包含点、边界相交、圆心落入多边形和半径贴近多边形边界。
- 编辑已有区域时，候选排他区域查询会排除当前区域自身，避免修改商家归属或边界时误判自己与自己冲突。
- 后端单测新增多边形重叠、多边形不重叠、多边形与半径冲突和当前区域自排除锚点覆盖。
- SaaS 商家预检脚本增加多边形排他冲突 helper、自排除条件和服务层调用锚点，防止后续回退。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/tenant-region-geometry.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/admin.service.spec.ts`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、166 个用例全部通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 后台区域保护仍未接入地图 SDK 可视化选点/绘制多边形，目前运营仍主要通过地图外链和 JSON 文本录入边界。
- 后台区域批量导入仍只支持粘贴 JSON 数组，尚未支持 Excel/CSV 文件解析。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续推进 V6 区域保护升级，优先补齐后台区域保护页面的地图辅助选点/边界点编辑体验，或在计划范围内继续推进行政区/文件导入体验。

## 2026-06-20 - V6 商家运营健康分

### 阶段名称

V6 商家经营平台化 - 商家运营健康分。

### 本阶段完成内容

- 新增商家运营健康分计算，覆盖商家启停、套餐状态、可登录管理员、启用收款账户、活动数量、课程数量、首页装修、待审核活动/报名、待处理退款、异常支付回调和待处理对账差异。
- 后台商家列表接口返回 `operationHealth`，并补充课程数量、已发布课程数量、待处理对账差异数量。
- 商家列表 Excel 导出新增经营健康状态、健康评分、健康风险、健康提醒、健康建议、课程数、已发布课程和对账差异。
- 后台商家管理页新增“经营健康”列、详情抽屉“经营健康分”区块，并把健康风险纳入处理优先级、搜索文本和下一步建议。
- 修正商家列表聚合计数顺序，使活动、报名、订单等计数与实际查询结果一致。
- SaaS 商家预检脚本增加健康分接口、导出和后台展示锚点。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/tenant-health.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/admin.module.ts`
- `apps/api/src/modules/admin/admin.service.spec.ts`
- `apps/admin/src/views/Tenants.vue`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、156 个用例全部通过。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB `127.0.0.1:13306` 未启动时，主预检中的 `migration:show` 仍只能给出警告，不能完成真实数据库迁移核对。
- 后台构建仍存在既有 VueUse PURE 注释和大 chunk 警告，不影响当前构建产物。

### 下一阶段应继续处理的事项

- 继续按开发计划推进 V6 “商家套餐、权限模板、到期限制、续费提醒”中尚未完成的运营入口和限制校验。

## 2026-06-20 - V6 商家套餐到期限制

### 阶段名称

V6 商家经营平台化 - 商家套餐到期限制。

### 本阶段完成内容

- 新增 `tenantSubscriptionWriteRestriction`，把“已到期”套餐转为明确的运营写入限制。
- 商家后台账号在套餐已到期后，不能继续写入活动、公告、H5 首页装修、运营设置、收款主体和收款账户。
- 平台超级管理员不受该限制，仍可续费、延长到期日、监管和纠错。
- 收款配置权限检查与套餐到期检查串联，避免到期商家绕过前端继续改收款配置。
- SaaS 商家预检脚本增加套餐到期写入限制锚点。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/tenant-subscription.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/admin.service.spec.ts`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、158 个用例全部通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 套餐到期限制已覆盖核心运营写入口；分类、票种、优惠码、会员标签等细分配置入口后续还应继续按相同口径收紧。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续推进 V6 “商家套餐、权限模板、续费提醒”，优先补齐权限模板/套餐模板对商家默认权限的落地。

## 2026-06-20 - V6 商家套餐权限模板

### 阶段名称

V6 商家经营平台化 - 商家套餐权限模板。

### 本阶段完成内容

- 新增套餐权限模板，覆盖试运营、标准版、城市合伙人、核心合伙人和定制版。
- 租户设置合并逻辑支持“只变更套餐、未显式传权限”时自动套用对应权限模板。
- 后台商家编辑弹窗新增“套用套餐权限模板”按钮，运营选择套餐后可一键更新活动发布审核、报名审核、收款配置和商城权限。
- 后台商家 DTO 返回当前套餐模板，便于后续继续扩展运营提示和模板对比。
- SaaS 商家预检脚本增加套餐模板、后端返回字段和前端按钮锚点。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/tenant-subscription.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/admin.service.spec.ts`
- `apps/admin/src/views/Tenants.vue`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、160 个用例全部通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 套餐模板已落地为权限组合，但还没有独立的“续费提醒队列/批量联系”运营视图。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续推进 V6 “续费提醒”，在商家列表中补齐更直接的续费筛选、批量处理入口或导出字段。

## 2026-06-20 - V6 商家续费提醒

### 阶段名称

V6 商家经营平台化 - 商家续费提醒。

### 本阶段完成内容

- 新增 `tenantRenewalReminder`，将套餐到期、临近到期、正常和无固定到期日统一转换为运营可读提醒。
- 后台商家列表接口返回 `renewalReminder`，公开商家 DTO 同步保留套餐状态和续费提醒字段。
- 商家 Excel 导出新增续费提醒等级、提醒文案、建议动作和是否需要处理，方便平台运营批量跟进到期商家。
- 后台商家管理页新增“续费提醒”列，并在详情抽屉展示续费提醒、建议动作和处理状态。
- 后端测试补齐已到期、临近到期、正常和无固定到期日套餐的提醒断言。
- SaaS 商家预检脚本增加续费提醒 helper、接口字段、导出字段和后台展示锚点。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/tenant-subscription.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/admin.service.spec.ts`
- `apps/admin/src/views/Tenants.vue`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、163 个用例全部通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 续费提醒已进入商家列表、详情和导出，但还没有独立的“续费跟进队列/批量联系”运营视图。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续按 V6 “商家套餐、权限模板、到期限制、续费提醒”推进，把套餐到期写入限制扩展到分类、票种、优惠码、会员标签等细分运营写入口。

## 2026-06-20 - V6 套餐到期细分写入口限制

### 阶段名称

V6 商家经营平台化 - 套餐到期细分运营写入口限制。

### 本阶段完成内容

- 将商家套餐到期写入限制扩展到活动分类创建、编辑和停用。
- 将商家套餐到期写入限制扩展到票种创建/编辑，避免到期商家继续调整付费报名配置。
- 将商家套餐到期写入限制扩展到优惠码创建/编辑，避免到期商家继续发布营销优惠。
- 将商家套餐到期写入限制扩展到用户标签单人创建、活动批量打标和删除标签。
- 平台超级管理员继续不受套餐到期限制，可用于续费、纠错和监管。
- SaaS 商家预检脚本补充分类、票种、优惠码、用户标签写入口锚点，防止后续回退。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/admin.service.ts`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、163 个用例全部通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 套餐到期限制已覆盖本阶段识别的分类、票种、优惠码和用户标签写入口；后续若发现新的商家细分运营写入口，应按同一口径纳入。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续推进 V6 “区域保护从中心点 + 半径升级为地图选点、多边形边界、定位命中日志和批量导入”，优先选择一个小阶段，例如先落地区域定位命中日志 DTO/记录底座。

## 2026-06-20 - V6 区域定位命中日志底座

### 阶段名称

V6 区域保护升级 - 区域定位命中日志底座。

### 本阶段完成内容

- 新增 `tenant_region_hit_logs` 表和 TypeORM 实体，记录公开端定位解析的经纬度、命中状态、命中商家/区域、距离、来源、IP、User-Agent 和创建时间。
- 公开端 `/public/tenants/resolve` 支持传入 `source`，并在定位解析后异步写入命中日志；日志写入失败只记录服务端警告，不影响用户定位结果返回。
- 平台后台新增 `/admin/tenant-region-hit-logs` 查询接口，支持按商家、命中状态、来源分页筛选定位命中日志。
- 区域命中日志接口复用 `tenant_region.manage` 平台权限，商家后台不暴露跨区域日志。
- SaaS 商家预检脚本补齐实体、迁移、模块注册、公开端采集、后台查询和权限映射锚点。

### 修改/新增的主要文件

- `apps/api/src/entities/tenant-region-hit-log.entity.ts`
- `apps/api/src/migrations/1781889000000-CreateTenantRegionHitLogs.ts`
- `apps/api/src/data-source.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/api/src/modules/public/public.module.ts`
- `apps/api/src/modules/public/public.controller.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/api/src/modules/admin/admin.module.ts`
- `apps/api/src/modules/admin/dto.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/admin-permissions.ts`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、163 个用例全部通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 当前区域保护仍以中心点 + 半径命中为主，多边形边界尚未落地。
- 区域保护批量导入尚未落地。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续推进 V6 区域保护升级，优先在现有 `tenant_regions` 区域模型上补齐多边形边界字段、校验和命中计算底座。

## 2026-06-20 - V6 区域多边形边界底座

### 阶段名称

V6 区域保护升级 - 多边形边界字段与命中计算底座。

### 本阶段完成内容

- `tenant_regions` 新增 `boundaryPoints` JSON 字段，用于保存区域多边形边界点。
- 新增迁移 `1781889100000-AddTenantRegionBoundaryPoints.ts`，生产库可通过 migration 给既有区域表补列。
- 区域保存 DTO 支持 `boundaryPoints`，后端校验边界点必须为 3-200 个合法经纬度点，并返回运营可读错误。
- 区域创建时默认无多边形；区域更新时只有显式传入 `boundaryPoints` 才修改边界，避免旧后台表单误清空边界。
- 后台区域列表/详情 DTO 返回 `boundaryPoints`，为后续地图编辑和批量导入提供数据底座。
- 公开端定位解析改为“有多边形则用多边形命中，没有多边形则继续按中心点 + 半径命中”，保持老区域数据兼容。
- SaaS 商家预检脚本补齐多边形实体、迁移、DTO、后台保存返回和公开端命中计算锚点。

### 修改/新增的主要文件

- `apps/api/src/entities/tenant-region.entity.ts`
- `apps/api/src/migrations/1781889100000-AddTenantRegionBoundaryPoints.ts`
- `apps/api/src/modules/admin/dto.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/public/public.service.ts`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、163 个用例全部通过。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 后台地图选点/绘制多边形 UI 尚未落地。
- 区域保护批量导入尚未落地。
- 多边形排他冲突本阶段仍按中心点 + 半径做保守校验，尚未做多边形相交校验。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续推进 V6 区域保护升级，优先补齐后台区域保护的地图边界录入/编辑入口，或继续推进区域批量导入底座。

## 2026-06-20 - V6 区域批量导入底座

### 阶段名称

V6 区域保护升级 - 区域批量导入后端底座。

### 本阶段完成内容

- 新增 `TenantRegionBulkImportDto`，支持平台提交区域保护数据数组。
- 新增后台接口 `POST /admin/tenant-regions/bulk-import`，复用 `tenant_region.manage` 平台权限。
- 批量导入单次最多 200 条，逐条复用现有 `saveTenantRegion` 校验、保存、排他检查和操作日志逻辑。
- 导入结果返回总数、成功数、失败数和每条成功/失败明细，便于后续 Excel/CSV 前端导入页直接展示。
- 批量导入完成后写入 `tenant_region.bulk_import` 汇总操作日志，便于平台追踪批量配置变更。
- SaaS 商家预检脚本补齐批量导入 DTO、接口、服务方法、条数限制和操作日志锚点。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/dto.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、163 个用例全部通过。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 后台 Excel/CSV 文件解析与导入页面尚未落地。
- 后台地图选点/绘制多边形 UI 尚未落地。
- 多边形排他冲突仍按中心点 + 半径做保守校验，尚未做多边形相交校验。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续推进 V6 区域保护升级，优先补齐后台区域保护页面对 `boundaryPoints` 的录入/展示，以及批量导入入口。

## 2026-06-20 - V6 区域后台边界与导入入口

### 阶段名称

V6 区域保护升级 - 后台边界点录入与批量导入入口。

### 本阶段完成内容

- 后台“区域保护”页新增 `boundaryPoints` 多边形边界点 JSON 录入，保存前会校验 JSON 数组和每个点的经纬度范围。
- 区域编辑时会回显已保存的多边形边界点；清空文本可显式清除多边形边界。
- 区域列表在定位范围列展示“多边形 N 点 / 半径兜底”，便于运营区分半径区域和多边形区域。
- 后台“区域保护”页新增“批量导入”入口，支持粘贴区域 JSON 数组并调用 `/admin/tenant-regions/bulk-import`。
- 批量导入完成后展示每条成功/失败明细，并刷新区域列表。
- SaaS 商家预检脚本补充区域保护页的多边形录入、格式化、批量导入接口和结果展示锚点。

### 修改/新增的主要文件

- `apps/admin/src/views/TenantRegions.vue`
- `scripts/preflight-saas-tenant-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、163 个用例全部通过。
- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `npm.cmd run preflight`：通过；仍有生产短信凭证未填提醒、本地 `127.0.0.1:13306` MariaDB 未启动导致 `migration:show` 警告。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 尚未接入地图 SDK 的可视化选点/绘制多边形，当前先使用 JSON 文本录入。
- 尚未做 Excel/CSV 文件解析，当前批量导入入口先支持 JSON 数组。
- 多边形排他冲突仍按中心点 + 半径做保守校验，尚未做多边形相交校验。
- 生产短信服务商凭证仍需在生产环境变量或后台系统设置中补齐。
- 本地 MariaDB 未启动时，主预检仍只能警告 `migration:show`，不能完成真实数据库迁移核对。

### 下一阶段应继续处理的事项

- 继续推进 V6 区域保护升级，可补齐多边形排他冲突校验或更友好的地图绘制/文件导入体验。

## 2026-06-20 - 开发计划完成度复核

### 阶段名称

开发计划收口 - 体检报告三批计划与 V6 区域保护/商家套餐记录完成度复核。

### 本阶段完成内容

- 重新读取 `docs/项目功能体检与优化报告.md` 中“七、建议下一轮开发计划”和 `DEVELOPMENT_LOG.md`，确认当前显式开发计划的任务边界。
- 复核第 1 批收口任务：分类管理入口、`/categories` 平台超管访问、活动列表“更多”、系统设置短信合并、支付状态说明均已有实现锚点。
- 复核第 2 批易用性任务：活动发布分步骤向导、H5 装修手机预览、底部菜单图标/选中图标/隐藏规则、后台首页角色能力说明、手机管理端底部快捷导航均已有实现锚点。
- 复核第 3 批运营增长任务：文化大使线索渠道/跟进人、数据中心运营建议、会员分群批量通知、公益公开公示页、活动复盘 Excel 导出均已有实现锚点。
- 复核 `docs/开发方案与二次开发说明.md` 中已被日志纳入的 V6 区域保护与商家套餐相关路线：地图辅助选点、多边形边界、定位命中日志、批量导入、商家套餐、权限模板、到期限制、续费提醒均已有实现或静态 guard 覆盖。
- 未新增业务功能或扩大范围；本阶段只做计划内完成度复核和验证。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `node scripts/preflight-saas-tenant-guard.mjs`：通过。
- `node scripts/preflight-export-guard.mjs`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、167 个用例全部通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过；仍有 uni-app 新版本提示。
- `git diff --check`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 当前已确认的“建议下一轮开发计划”三批任务已复核完成，未发现必须继续开发的计划内缺口。
- `docs/开发方案与二次开发说明.md` 的长期路线图还包含商家独立域名/独立小程序配置、真实微信/支付宝支付和退款闭环、更完整的数据看板和自动化回归测试等更大目标；这些目标超出本次已确认三批计划，继续推进前需要明确是否纳入当前无人值守开发范围。
- 生产短信服务商凭证、真实支付商户资料、地图服务商 key、域名白名单和真实数据库迁移核对仍依赖生产环境配置，不应在未确认部署口径前臆造。

### 下一阶段应继续处理的事项

- 停止等待确认：若要继续无人值守开发，请确认是否将 `docs/开发方案与二次开发说明.md` 的长期路线图纳入当前开发计划，并指定优先方向；否则当前“建议下一轮开发计划”已完成。

## 2026-06-20 - 商城拼团迁移幂等修复

### 阶段名称

最终验收准备 - 商城拼团记录迁移幂等修复。

### 本阶段完成内容

- 启动项目本地 MariaDB 数据目录 `.local-mariadb/data`，按 `apps/api/.env` 监听 `127.0.0.1:13306`。
- 执行 `npm.cmd --prefix apps/api run migration:run` 时发现 `AddMallGroupBuyTeamFields1781724600000` 与 `CreateMallGroupBuyRecords1781724000000` 对 `teamNo`、`teamStatus`、`minPeople`、`paidPeople` 的建表/补列逻辑重复，导致空库后续迁移报 `Duplicate column name 'teamNo'`。
- 将 `AddMallGroupBuyTeamFields1781724600000` 改成先读取表结构，缺字段/索引时才补齐；已有字段时只执行数据修正和非空约束调整。
- 重新执行迁移成功，本地数据库从 82 条迁移推进到最新 93 条迁移。

### 修改/新增的主要文件

- `apps/api/src/migrations/1781724600000-AddMallGroupBuyTeamFields.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run migration:run`：首次失败，原因是重复添加 `teamNo`；修复后通过。
- `npm.cmd --prefix apps/api run test`：通过，12 个测试文件、167 个用例全部通过。
- `git diff --check -- apps/api/src/migrations/1781724600000-AddMallGroupBuyTeamFields.ts DEVELOPMENT_LOG.md`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 本阶段只修复迁移幂等性和本地验收库结构，不新增商城拼团业务能力。
- `.local-mariadb` 为本地验收数据库目录，仍不应提交到版本库。

### 下一阶段应继续处理的事项

- 继续按最终验收规则启动 API，并在浏览器中验证后台与 H5 主流程。

## 2026-06-20 - H5 报名字段保存修复

### 阶段名称

最终验收修复 - H5 报名答案 DTO 白名单保留。

### 本阶段完成内容

- 浏览器验收发现 H5 报名能生成记录和订单，但后台“报名内容”显示为空；定位为后端全局 `ValidationPipe` 白名单会剥离 `RegisterDto.answers` 数组内答案对象字段。
- 为公开报名 DTO 新增嵌套 `RegistrationAnswerDto`，保留 `fieldId`、`label`、`type` 和 `value`，并对 `fieldId` 做数字转换。
- 新增 DTO 单测，覆盖白名单开启时嵌套报名答案字段不会被清空，额外字段仍会被移除。
- 重启本地 API 后重新通过 H5 提交付费线下收款活动报名，用户端报名详情和后台全局报名列表均能显示姓名、手机、职业/行业和备注。

### 修改/新增的主要文件

- `apps/api/src/modules/public/dto.ts`
- `apps/api/src/modules/public/dto.spec.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run test`：通过，13 个测试文件、168 个用例全部通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `git diff --check -- apps/api/src/modules/public/dto.ts apps/api/src/modules/public/dto.spec.ts DEVELOPMENT_LOG.md`：通过；仅有 Windows LF/CRLF 转换提示。
- 浏览器复验：H5 `Offline Creator Salon` 报名提交后进入“待付款/等待后台确认收款”，报名详情显示测试字段；后台 `/admin/registrations` 同步展示报名内容。

### 遗留问题

- 修复前提交的旧验收报名记录已保存为空答案，因原始答案已在进入服务层前被剥离，无法自动还原；新提交记录已验证正常。
- 真实微信/支付宝支付仍依赖生产商户配置，本阶段只验证线下收款路径不会假成功。

### 下一阶段应继续处理的事项

- 继续最终浏览器验收，抽测系统设置支付/SMS说明、前台装修预览、通知分群、公益公开页、复盘导出入口等计划内关键页面。

## 2026-06-20 - 文化大使后台页面兜底修复

### 阶段名称

最终验收修复 - 文化大使招募配置页默认入口兜底。

### 本阶段完成内容

- 浏览器抽测发现后台 `/admin/ambassador` 页面白屏，控制台报 `settingForm.config.entryPages[page.key].eyebrow` 读取空对象。
- 将文化大使后台配置表单初始化为完整默认 `entryPages` 结构，避免接口返回前、空配置或新库初始状态下四入口页面内容读取 undefined。
- 修复后文化大使后台可以正常展示落地页配置、案例管理和申请线索入口，保留既有配置加载与保存逻辑。

### 修改/新增的主要文件

- `apps/admin/src/views/Ambassador.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释警告和大 chunk 警告。
- `git diff --check -- apps/admin/src/views/Ambassador.vue DEVELOPMENT_LOG.md`：通过；仅有 Windows LF/CRLF 转换提示。
- 浏览器复验：新后台标签打开 `/admin/ambassador` 正常显示“公益与招募线索、落地页配置、案例管理、申请线索”，控制台无新增 error。

### 遗留问题

- 本阶段只修复页面初始默认配置兜底，不新增文化大使业务字段或改变线索处理流程。

### 下一阶段应继续处理的事项

- 继续最终浏览器验收，重点补测 H5 公益公开页、后台复盘导出入口和整体控制台/接口状态。

## 2026-06-20 - 最终浏览器主流程验收

### 阶段名称

最终验收 - 后台与 H5 主流程浏览器验证。

### 验证时间

- 2026-06-20 07:48:05 +08:00

### 验证环境

- MariaDB：`127.0.0.1:13306`，本地 `.local-mariadb/data`。
- API：`http://127.0.0.1:3000/api`，`/api/health/ready` 返回 `ready=true`、`api=up`、`database=up`、`config=warning`。
- 后台：`http://127.0.0.1:5174/admin`，代理指向 `http://localhost:3000`。
- H5：`http://127.0.0.1:5173`，代理指向 `http://localhost:3000`。

### 浏览器验证的主要步骤

- 后台使用 `admin / Admin123456` 登录，进入平台超级管理员后台，顶部显示“平台超管：可管理全平台商家、活动、订单、公益池、系统安全，并拥有会员余额调整权限”。
- 打开 `/admin/categories`，验证平台超管可进入分类管理，并通过页面创建测试分类 `验收分类233010`。
- 打开 `/admin/activities`，验证活动列表可清除状态筛选，活动行主操作为 `预览H5 / 编辑 / 更多`，更多菜单包含复制链接、二维码、海报、渠道、审核记录、下架；编辑抽屉显示分步骤向导。
- 打开 H5 `/?tenantCode=platform#/pages/activity/list`，验证活动列表、分类筛选、底部菜单和两场活动正常展示。
- 打开 H5 活动详情和报名页，提交 `Weekend Reading: Courage` 免费需审核报名，验证详情状态为“待审核”、订单为“已付款”，刷新后状态保持，列表人数从 0 更新到 1。
- 修复报名答案 DTO 后，提交 `Offline Creator Salon` 付费线下收款报名，验证详情状态为“待付款 / 等待后台确认收款”，没有假支付成功，报名详情显示姓名、手机、职业/行业、备注。
- 后台 `/admin/registrations` 验证新报名记录存在，状态为待付款，关联订单为 `¥99.00 / 待付款`，报名内容完整展示。
- 后台 `/admin/system-settings` 验证支付方式状态说明、微信/支付宝待服务商配置说明、短信验证码服务合并区域正常显示。
- 后台 `/admin/homepage-builder` 验证前台全局装修、H5 预览链接、底部导航配置入口正常显示。
- 后台 `/admin/analytics` 验证运营建议面板显示“经营数据平稳”等建议内容。
- 后台 `/admin/charity` 验证公益池配置、公益项目和公益流水入口正常显示。
- 后台 `/admin/ambassador` 修复后复验正常显示落地页配置、案例管理和申请线索，新标签控制台无 error。
- H5 `/?tenantCode=platform#/pages/charity/index` 验证公益公开公示页未登录可打开，展示公益池累计、可用金额、已拨付、参与用户、公益项目等公开信息，控制台无 error。
- 复盘导出接口 `GET /api/admin/activities/2/recap/export` 返回 200，`Content-Type` 为 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`，生成 `.local-logs/recap-export-check.xlsx`，大小 8647 字节。

### 输入的测试数据摘要

- 平台分类：`验收分类233010`，排序 `99`。
- 免费报名：活动 `Weekend Reading: Courage`，姓名 `浏览器验收用户`，手机 `13990001234`，职业/行业 `最终验收`，备注 `主流程浏览器验收提交`。
- 付费线下收款报名：活动 `Offline Creator Salon`，姓名 `验收线下付款用户`，手机 `13990005678`，职业/行业 `浏览器验收行业`，备注 `付费线下收款主流程验收`。
- H5 开发登录使用本地演示用户 `13800000001 / 本地演示用户`。

### 通过项

- 页面可正常打开：后台登录、分类、活动、报名、系统设置、装修、数据中心、公益池、文化大使；H5 活动列表、详情、报名详情、公益公开页均可打开。
- 登录/入口流程可用：后台登录可用；H5 在开发模式下自动完成本地演示用户登录。
- 核心业务流程可走通：免费报名进入待审核；付费线下收款报名进入待付款，等待后台确认，未出现未支付直接成功。
- 表单提交和数据保存正常：修复后报名答案在 H5 详情和后台报名列表均完整展示。
- 列表展示和详情查看正常：H5 活动列表人数刷新后更新；后台全局报名列表展示订单和报名内容；报名详情刷新后状态保持。
- 计划内页面抽测正常：分类入口、活动更多菜单、支付状态说明、短信配置、装修预览、角色能力说明、数据运营建议、公益公开页、文化大使后台、复盘导出均通过。
- 控制台/接口状态：新验证标签未发现 H5 公益页和文化大使后台新增 error；API ready，后台/H5 代理可达。

### 发现的问题

- 已修复：商城拼团迁移重复添加字段导致空库迁移失败。
- 已修复：公开报名 DTO 缺少嵌套答案白名单元数据，导致报名答案对象字段被剥离。
- 已修复：文化大使后台配置页初始 `entryPages` 为空时白屏。
- 仍需生产配置确认：真实微信/支付宝支付、真实退款、支付验签、自动对账、生产短信服务商凭证、地图服务商 key、域名白名单仍依赖生产环境配置；当前验收结论按“线下收款 / 余额支付 / 免费报名”运营口径成立。
- 既有说明：修复前提交的旧免费报名记录答案为空，因原始字段已在校验层被剥离，无法自动还原；修复后新记录已验证正常。

### 是否达到可上线运营标准

- 在“仅开放免费报名、余额支付、线下收款/人工确认，暂不开放真实微信/支付宝生产支付”的运营口径下，计划内任务已完成，后台与 H5 主流程浏览器验收通过，可进入受控上线试运营。
- 若必须以真实微信/支付宝作为生产收费主链路，则仍未达到完整生产支付上线标准，需要先完成真实支付商户配置、回调验签、退款回调和对账验收。

### 下一阶段应继续处理的事项

- 当前 `docs/项目功能体检与优化报告.md` 中“建议下一轮开发计划”的三批任务已完成并通过主流程验收；如继续无人值守开发，需要确认是否把长期路线图中的真实支付、商家独立域名/小程序、自动化回归等纳入新的开发计划。

## 2026-06-20 - 浏览器全角色主流程复验

### 阶段名称

上线验收复核 - H5 用户、平台超管、商家管理员、运营、财务、签到全角色主流程验证。

### 本阶段完成内容

- 在右侧浏览器使用杭州演示租户 `qiwai-hangzhou` 走通 H5 用户付费线下收款报名、后台财务确认收款、后台签到人员核销、H5 刷新查看最终状态的完整闭环。
- 使用 H5 验证码登录创建并保留测试用户 `13813863958`，开发验证码为 `123456`，登录后“我的”页显示手机号、普通会员、订单入口、公益贡献和余额资产。
- 使用后台财务账号 `qiwai_hz_finance / Qiwai123456` 登录，确认测试订单线下收款；H5 报名详情刷新后从“待付款”变为“报名成功 / 已付款”。
- 使用后台签到账号 `qiwai_hz_checkin / Qiwai123456` 登录，核销 H5 签到码 `d7f35e36-ecdf-4cde-bd91-93e9ef6e6955`；H5 报名详情刷新后变为“已签到 / 已付款”。
- 使用平台超管 `admin / Admin123456` 验证平台分类管理、商家管理、系统设置入口正常。
- 使用杭州商家管理员 `qiwai_hz_admin / Qiwai123456` 验证活动、报名、订单、管理员入口正常。
- 使用杭州运营账号 `qiwai_hz_ops / Qiwai123456` 验证活动、报名入口正常，财务页直接访问会被带回工作台；运营账号当前可进入商家“运营设置”，按现有权限表现属于商家运营配置口径。
- 浏览器三个主要验证标签未捕获到 error 级控制台日志。
- 运行 `npm run smoke:qiwai-demo` 发现并修复样板烟测与真实登录/结算权限规则不一致的问题，复跑后七维文化样板验收通过。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/admin-permissions.ts`
- `apps/api/src/modules/admin/admin-permissions.spec.ts`
- `scripts/seed-qiwai-demo.mjs`
- `scripts/qiwai-demo-smoke.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 浏览器 H5 报名：杭州活动 `东方哲学与节气文化体验沙龙`，测试报名用户姓名 `全流程验收用户1913435925`，表单手机号 `13913435925`，备注 `浏览器全角色验收-1913435925`，提交后进入“待付款 / 等待后台确认收款”。
- 浏览器财务确认：订单 `OD17819134699093` 从“待付款”变为“已付款”，确认人为 `qiwai_hz_finance`。
- 浏览器签到核销：后台提示“签到核销成功”，H5 刷新后报名状态为“已签到”，订单状态为“已付款”。
- 浏览器 H5 验证码登录：测试手机号 `13813863958`，验证码 `123456`，登录后“我的”页显示用户 `用户3958` 和对应手机号。
- `npm.cmd --prefix apps/api run test -- admin-permissions`：通过，1 个测试文件、8 个用例全部通过。
- `npm.cmd --prefix apps/api run build`：通过。
- API 重启后 `/api/health/ready`：`ready=true`、`api=up`、`database=up`、`config=warning`。
- `npm.cmd run seed:qiwai-demo`：通过，幂等准备三城演示租户和后台角色账号。
- `npm.cmd run smoke:qiwai-demo`：最终通过，覆盖三城登录与隔离、报名、线下收款、签到、标签、复盘、退款、代理结算生成/审核/打款/导出/边界、平台监管和活动审核。

### 遗留问题

- 真实微信/支付宝生产支付、真实退款回调、支付验签、自动对账、生产短信凭证、地图 key、域名白名单仍依赖生产环境配置；本阶段仍按“免费报名、余额支付、线下收款/人工确认”运营口径验收。
- 重复执行历史烟测时保留的旧结算单 `AS17819139910921` 为空草稿，旧结算单 `id=2` 因后续重复烟测追加同周期流水而产生“快照变化”阻断风险；后续烟测已改为窄时间窗口，新的烟测通过，历史记录保留用于审计。
- 签到后台“最近核销”表在本次浏览器核销后提示成功，但摘要行显示 `活动 - / 用户 - / 时间 -`，H5 最终状态已正确变为已签到；该摘要展示可后续做体验优化。

### 下一阶段应继续处理的事项

- 若继续推进到完整生产收费主链路，需要先确认将真实微信/支付宝支付、退款回调、验签、服务商账单和自动对账纳入新的开发计划。
- 若继续提高现场体验，可在计划确认后优化签到核销成功后的“最近核销”摘要展示。

## 2026-06-20 - 计划完成后增量复验

### 阶段名称

最终验收复核 - 计划完成后后台、H5 与多角色烟测增量验证。

### 验证时间

- 2026-06-20 08:26:17 +08:00

### 验证环境

- API：`http://127.0.0.1:3000/api`，`/api/health/ready` 返回 `ready=true`、`api=up`、`database=up`、`config=warning`。
- 后台：`http://127.0.0.1:5174/admin`。
- H5：`http://127.0.0.1:5173`。
- 当前监听端口：`3000`、`5173`、`5174` 均正常。

### 本阶段完成内容

- 重新读取 `docs/项目功能体检与优化报告.md` 与 `DEVELOPMENT_LOG.md`，确认“建议下一轮开发计划”第 1 批、第 2 批、第 3 批均已有完成与验收记录。
- 右侧浏览器复验 H5“我的”页，当前验证码登录用户 `13813863958` 显示手机号、普通会员、我的订单、公益贡献和余额资产。
- 右侧浏览器复验 H5 公益公开页，未阻塞展示公益池累计、当前可用、已拨付、参与用户和公益项目区域。
- 右侧浏览器使用后台财务会话复验杭州商家工作台、活动列表和报名列表；活动列表展示 `预览H5 / 更多`，报名列表展示最新烟测报名记录、订单金额、支付状态和报名内容。
- 右侧浏览器使用平台超管 `admin / Admin123456` 重新登录，复验平台分类、平台活动、系统设置、数据中心和文化大使页面。
- 平台分类页确认可进入“分类管理”，可见“新增分类”和平台全局分类说明。
- 平台活动页清除默认待审核筛选后，可见报名中活动列表，操作列展示 `预览H5 / 编辑 / 更多`。
- 系统设置页确认支付方式说明、微信/支付宝服务商配置提示、线下收款和短信验证码服务区域正常展示。
- 数据中心页确认运营建议正常展示；文化大使页确认落地页配置和申请线索入口正常展示。
- 执行七维文化样板烟测，覆盖三城登录隔离、报名、线下收款确认、签到、标签、复盘、退款、代理结算、平台监管和活动审核。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `Invoke-RestMethod http://127.0.0.1:3000/api/health/ready`：通过，`ready=true`。
- 浏览器 H5“我的”页：通过，未捕获 error 级控制台日志。
- 浏览器 H5 公益公开页：通过，未捕获 error 级控制台日志。
- 浏览器后台平台分类、活动、系统设置、数据中心、文化大使页面：通过，未捕获 error 级控制台日志。
- `npm.cmd run smoke:qiwai-demo`：通过，输出“七维文化样板验收通过”。
- `npm.cmd --prefix apps/api run test -- admin-permissions`：通过，1 个测试文件、8 个用例全部通过。

### 输入的测试数据摘要

- 本次浏览器复验未新增手工报名数据，复用前次保留的 H5 验证码登录用户 `13813863958` 和当前数据库中的七维样板烟测记录。
- 本次自动烟测新增/保留七维文化样板测试记录，最新后台报名列表可见 `东方哲学与节气文化体验沙龙` 相关已签到报名、订单和报名内容。

### 遗留问题

- 一个历史 H5 报名详情链接 `registration?id=3` 在当前数据状态下返回“报名记录不存在”；结合后续 `seed:qiwai-demo` / `smoke:qiwai-demo` 会幂等重置和追加演示数据，该旧验收链接不再作为当前可用性判断依据。当前最新烟测记录在后台报名列表和自动烟测中均验证通过。
- 真实微信/支付宝生产支付、真实退款回调、支付验签、自动对账、生产短信凭证、地图 key、域名白名单仍依赖生产配置；当前仍按“免费报名、余额支付、线下收款/人工确认”口径验收。

### 下一阶段应继续处理的事项

- 当前 `docs/项目功能体检与优化报告.md` 内“建议下一轮开发计划”已完成，并且主流程与增量复验通过；继续开发真实支付、退款回调、自动对账、独立域名/小程序或自动化回归前，需要先确认纳入新的开发计划。

## 2026-06-20 - 真实支付预发模板字段收口

### 阶段名称

真实支付上线挡板 - 商城支付预发证据模板与校验字段对齐。

### 本阶段完成内容

- 重新读取 `docs/项目功能体检与优化报告.md`、`docs/project-progress.md`、`docs/real-payment-integration-plan.md` 和 `DEVELOPMENT_LOG.md`，确认真实支付接入、多商户商城支付、店铺直收和预发验收留档属于当前长期上线计划中的进行中事项。
- 修复 `npm run smoke:real-payment -- --init` 生成的商城支付证据模板，使 `mallPaymentCreate`、`mallPaymentCallback` 和 `mallRefund` 均包含校验器要求的 `collectionMode` 与 `receiverType` 字段。
- 将商城支付证据模板改为从 `requiredMallPaymentEvidenceFields` 自动生成，避免后续新增校验字段时初始化模板再次漏字段。
- 不改变真实支付、商城微信支付或店铺直收的默认关闭挡板，不新增真实支付外部调用。

### 修改/新增的主要文件

- `scripts/real-payment-smoke-result.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `REAL_PAYMENT_PREFLIGHT_RESULT_FILE=.local-logs/real-payment-smoke-template-check.json npm.cmd run smoke:real-payment -- --init --force`：通过，生成的本地检查模板已包含 `collectionMode` 和 `receiverType`。
- `node scripts/preflight-real-payment-guard.mjs`：通过。
- `node --check scripts/real-payment-smoke-result.mjs`：通过。
- `git diff --check -- scripts/real-payment-smoke-result.mjs DEVELOPMENT_LOG.md`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 真实微信/支付宝支付、真实退款查询/通知、服务商账单自动拉取、商城真实微信支付、店铺直收和代理真实打款仍受对应环境挡板保护，不能在缺少真实商户预发证据时打开。
- 本阶段只修复预发证据模板一致性，不替代真实商户小额支付、退款、回调、账单和回滚验证。

### 下一阶段应继续处理的事项

- 继续按 `docs/real-payment-integration-plan.md` 推进不依赖外部凭证的小型上线挡板收口；需要真实商户证书、回调域名、账单样例或转账产品开通时，应记录阻塞并等待生产配置。

## 2026-06-20 - 真实支付模板防回归 guard

### 阶段名称

真实支付上线挡板 - 预发模板字段生成防回归检查。

### 本阶段完成内容

- 复核 `MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED` 店铺直收实现标记，确认已被生产环境示例、初始化脚本、Docker Compose、配置体检、doctor、后台部署配置和 rollout guard 覆盖，默认保持关闭。
- 在 `preflight-real-payment-guard` 中增加真实支付 smoke 初始化模板锚点，要求 `scripts/real-payment-smoke-result.mjs` 保留 `blankMallPaymentEvidence()`，并让商城支付证据模板复用统一字段列表。
- 防止后续新增商城支付证据字段后，只更新校验器和 example，却忘记更新 `npm run smoke:real-payment -- --init` 生成模板。

### 修改/新增的主要文件

- `scripts/preflight-real-payment-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `node scripts/preflight-real-payment-guard.mjs`：通过。
- `npm.cmd run test:preflight-guards`：通过，全部预检 guard 链路通过。
- `git diff --check -- scripts/real-payment-smoke-result.mjs scripts/preflight-real-payment-guard.mjs DEVELOPMENT_LOG.md`：通过；仅有 Windows LF/CRLF 转换提示。

### 遗留问题

- 当前真实支付计划剩余实质放行项仍需要真实商户预发材料：微信/支付宝商户证书、真实回调域名、微信 JSAPI openId 场景、真实退款/退款通知样例、服务商账单样例、微信商家转账产品开通和代理 OpenID/实名等。
- 未获得这些材料前，不能把 `REAL_PAYMENT_ENABLED`、`REAL_PAYMENT_SDK_IMPLEMENTED`、`REAL_REFUND_QUERY_IMPLEMENTED`、`REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED`、`AGENT_REAL_TRANSFER_IMPLEMENTED`、`MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED` 或 `MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED` 标记为已完成。

### 下一阶段应继续处理的事项

- 继续回读计划并判断是否还有不依赖外部真实商户材料的小型计划内收口；若没有，应按阻塞条件停止并等待生产配置。

## 2026-06-20 - 真实支付生产材料阻塞确认

### 阶段名称

真实支付上线挡板 - 剩余计划项生产材料阻塞确认。

### 本阶段完成内容

- 重新读取 `docs/项目功能体检与优化报告.md`、`docs/project-progress.md`、`docs/real-payment-integration-plan.md`、`docs/launch-checklist.md` 和 `DEVELOPMENT_LOG.md`。
- 复核当前开发计划：体检报告“建议下一轮开发计划”三批任务已完成并经过后台、H5 和多角色主流程验收。
- 复核长期上线计划中仍处于进行中的项目，剩余实质放行项集中在真实微信/支付宝支付、真实退款查询/通知、服务商账单自动拉取、代理真实打款、商城真实微信支付和店铺直收。
- 确认这些剩余项均需要真实商户/预发材料后才能继续：微信/支付宝商户证书与私钥、HTTPS 回调域名、微信 JSAPI openId 场景、真实支付/退款/退款通知样例、服务商账单样例、微信商家转账产品开通、代理 OpenID/实名和回滚验证记录。
- 当前不能安全地把 `REAL_PAYMENT_ENABLED`、`REAL_PAYMENT_SDK_IMPLEMENTED`、`REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED`、`REAL_REFUND_QUERY_IMPLEMENTED`、`REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED`、`AGENT_REAL_TRANSFER_IMPLEMENTED`、`MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED` 或 `MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED` 改为完成或开启。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 08:40:58 +08:00。
- `node scripts/preflight-real-payment-guard.mjs`：通过。
- `npm.cmd run test:preflight-guards`：通过，全部预检 guard 链路通过。
- 当前已完成的受控试运营口径仍成立：免费报名、余额支付、线下收款/人工确认可用；真实微信/支付宝生产支付主链路仍未放行。

### 遗留问题

- 真实微信/支付宝生产支付、真实退款回调/查询、自动对账、服务商账单自动拉取、代理真实打款、商城微信支付和店铺直收不能在缺少真实商户预发证据时继续放行。
- 生产短信凭证、真实域名、地图服务商 key、域名白名单等生产外部配置仍需上线前由实际运营环境补齐。

### 下一阶段应继续处理的事项

- 等待提供真实商户与预发材料后，再按 `docs/real-payment-integration-plan.md` 逐项完成小额支付、退款、重复回调、异常金额、账单拉取、代理账户路由、商城支付、店铺直收、代理真实打款和回滚验证。
- 如果要继续开发非真实支付方向，需要先把新的业务目标或功能目标写入开发计划后再继续。

## 2026-06-20 - 数据库备份脚本验收

### 阶段名称

上线运营检查清单 - 数据备份与恢复安全挡板验收。

### 本阶段完成内容

- 重新读取开发计划和 `DEVELOPMENT_LOG.md` 后，选择 `docs/launch-checklist.md` 中“数据与备份”作为本次不依赖外部生产材料的小阶段。
- 使用本地 API 环境 `apps/api/.env` 执行数据库备份，并将备份文件写入 `.local-logs/db-backups`，避免污染生产备份目录。
- 首次执行发现当前命令环境未包含 `mysqldump.exe`，随后定位到 `C:\Program Files\MariaDB 12.3\bin\mysqldump.exe`，通过临时 PATH 完成本地备份验证，未修改项目配置文件。
- 验证生成的 `.sql.gz` 备份文件可以被 gzip 解压，并包含 SQL dump 内容。
- 执行备份清理脚本，确认本地备份目录保留策略可正常运行。
- 执行恢复脚本的安全挡板验证：未提供 `RESTORE_CONFIRM=activity_registration` 时，脚本拒绝恢复，避免误覆盖当前业务库。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`
- 本地运行产物：`.local-logs/db-backups/activity_registration-20260620-084458.sql.gz`

### 运行或测试结果

- 验证时间：2026-06-20 08:45:40 +08:00。
- `ENV_FILE=apps/api/.env BACKUP_DIR=.local-logs/db-backups npm.cmd run db:backup`：首次失败，原因是 `mysqldump.exe` 不在 PATH。
- 临时加入 `C:\Program Files\MariaDB 12.3\bin` 后重新执行 `npm.cmd run db:backup`：通过，生成 `activity_registration-20260620-084458.sql.gz`，大小约 45 KB。
- Node gzip 解压检查：通过，备份内容包含 SQL dump / `CREATE TABLE` 信息。
- `BACKUP_DIR=.local-logs/db-backups BACKUP_RETENTION_DAYS=1 npm.cmd run db:prune-backups`：通过，清理 0 个过期备份。
- `ENV_FILE=apps/api/.env BACKUP_FILE=<latest> npm.cmd run db:restore`：按预期拒绝，提示 `Set RESTORE_CONFIRM=activity_registration`。
- `node scripts/preflight-backup-guard.mjs`：通过。

### 遗留问题

- 当前 Windows 命令环境未默认包含 MariaDB/MySQL 客户端 bin 目录；生产或运维环境需要把 `mysqldump` / `mysql` 加入 PATH，或使用 Docker 备份模式。
- 本阶段未对当前业务库执行真实恢复，避免覆盖正在使用的本地验收数据；完整恢复演练应在独立测试库中执行。

### 下一阶段应继续处理的事项

- 继续按开发计划复核是否还有不依赖真实支付商户材料的小型上线验收项。
- 如果推进完整恢复演练，需要准备独立测试库连接信息，并显式设置 `RESTORE_CONFIRM` 与 `BACKUP_FILE`。

## 2026-06-20 - 多商户商城预发 smoke 验收

### 阶段名称

上线运营检查清单 - 多商户商城 smoke 预发验收。

### 本阶段完成内容

- 重新读取 `docs/项目功能体检与优化报告.md`、`docs/launch-checklist.md` 和 `DEVELOPMENT_LOG.md`，选择计划内“如启用或展示多商户商城，执行 `npm run smoke:mall-multi-merchant` 并生成 passed=true 结果”作为本阶段。
- 修复商城评价提交、评价审核、商品详情/订单/库存/拼团/结算等 smoke 中暴露的 MariaDB eager relation 过深问题，相关查询改为显式最小关联并关闭默认 eager 加载。
- 修复多商户 smoke 测试账号权限夹具，给店铺运营账号补齐 `mall.review.manage`，使本店评价管理可用且跨店评价仍被拒绝。
- 修复余额支付后积分写入在事务中使用全局 repository 导致的自锁等待；事务内积分发放、退款扣减和积分返还统一复用当前 transaction manager。
- 修复商城待结算退款汇总缺少 `refund.order` join 导致 `order.paymentMethod` 查询失败的问题。
- 清理本地重复运行的旧 API `start:dev` 进程，仅保留当前 `node dist/main.js` API 进程参与 smoke。
- 完整执行多商户商城 smoke，覆盖店铺主体、授权、商品审核、前台店铺页、跨店购物车、子订单履约、评价隔离、余额支付结算、平台结算审核打款、已结算后退款冲抵、运营后台统计/日志/导出与店铺隔离。

### 修改/新增的主要文件

- `apps/api/src/modules/mall/mall.service.ts`
- `scripts/smoke-mall-multi-merchant.mjs`
- `scripts/seed-online-showcase.mjs`
- `apps/api/src/modules/admin/admin.service.ts`
- `deploy/mall-multi-merchant-smoke-result.json`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `npm.cmd --prefix apps/api run build`：通过。
- API 重启后 `/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`、`config=warning`。
- `npm.cmd run smoke:mall-multi-merchant`：最终通过。
- `deploy/mall-multi-merchant-smoke-result.json`：已生成，`passed=true`，`apiBase=http://127.0.0.1:3000/api`，`tenantCode=qiwai-showcase`。
- smoke 通过项包括：店铺开通前授权保护、商户直收开通保护、商品审核、后台店铺隔离、前台店铺列表与商品流、店铺优惠券/推广码/秒杀/拼团/物流隔离、跨店拆单与幂等、跨店余额支付守卫、支付任务路由、批量任务授权范围、子订单履约、店铺收款模式切换保护、店铺关闭保护、结算组状态同步、评价店铺隔离、余额支付结算样本、多商户结算闭环、已结算后退款冲抵、运营后台统计/日志/导出。

### 遗留问题

- 真实微信/支付宝支付、真实退款查询/通知、服务商账单自动拉取、代理真实打款、商城真实微信支付、店铺直收生产放行仍需要真实商户证书、回调域名和预发证据。
- 本地 smoke 为保留测试数据，会持续追加多商户商城订单、评价、结算单和退款冲抵记录；后续复验应继续使用幂等脚本或独立测试库，避免手工删除审计数据。
- 当前 `/api/health/ready` 的 `config=warning` 仍来自本地/预发配置缺少生产域名、真实短信、真实支付等外部生产配置，不影响本阶段多商户 smoke 结论。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，判断 `docs/launch-checklist.md` 是否还有不依赖外部生产材料的小型上线验收项。
- 若计划内任务均已完成，应按最终验收规则启动/确认服务并在右侧浏览器中走 H5、后台、不同角色和核心业务全流程，验收结果继续写入 `DEVELOPMENT_LOG.md`。

## 2026-06-20 - 构建与预检回归验收

### 阶段名称

上线运营检查清单 - 构建、测试、预检与迁移状态回归验收。

### 本阶段完成内容

- 重新读取开发计划和 `DEVELOPMENT_LOG.md` 后，选择 `docs/launch-checklist.md` 中“构建与部署”相关的测试、构建、预检和迁移状态检查作为本阶段。
- 在多商户商城 smoke 修复后，执行 API 单元测试、根项目全量构建、发布预检和迁移状态查看，确认本次后端事务/查询修改没有破坏既有测试与发布 guard。
- 确认 `deploy/mall-multi-merchant-smoke-result.json` 已被预检链路接受，`preflight-mall-multi-merchant-guard` 和 `preflight-result-file-guard` 均通过。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`
- 本阶段命令生成/更新的构建产物目录：`packages/shared/dist`、`apps/api/dist`、`apps/admin/dist`、`apps/mobile/dist`

### 运行或测试结果

- `npm.cmd run test`：通过，API Vitest 13 个测试文件、169 个用例全部通过。
- `npm.cmd run build`：通过，完成 shared、API、后台和 H5 构建；前端构建仅输出 chunk 体积与 Rollup 注释警告。
- `npm.cmd run preflight`：通过；所有 preflight guard 通过，Release Preflight 仅提示生产 SMS env 凭证未填写的 WARN，符合本地/预发缺外部生产短信凭证的口径。
- `npm.cmd --prefix apps/api run migration:show`：通过，93 个迁移全部为 `[X]` 已执行，无待执行迁移。

### 遗留问题

- 生产短信服务商凭证仍未在 `deploy/.env.production` 中补齐；预检明确标为 WARN，允许由后台系统设置维护真实生产短信凭证。
- 前端生产构建存在较大 chunk 警告，但不阻塞本阶段上线检查；如需进一步优化首屏加载，可在后续计划中做代码分包。
- 真实支付、生产域名、地图 key、域名白名单等外部生产材料仍未纳入本地自动通过范围。

### 下一阶段应继续处理的事项

- 继续回读开发计划和开发记录，确认是否还有计划内且不依赖外部材料的小阶段。
- 若计划内开发/自动化验收项已完成，应进入最终浏览器主流程验收，并将全流程角色验证结果写入 `DEVELOPMENT_LOG.md`。

## 2026-06-20 - 最终浏览器主流程验收

### 阶段名称

上线运营检查清单 - 右侧浏览器多角色主流程最终验收。

### 验证时间

2026-06-20 10:30:42 +08:00。

### 验证环境

- API：`http://127.0.0.1:3000/api`，`/api/health/ready` 返回 `ready=true`、`api=up`、`database=up`、`config=warning`。
- H5：`http://127.0.0.1:5173/?tenantCode=qiwai-showcase`。
- 后台：`http://127.0.0.1:5174/admin`。
- 端口监听：3000、5173、5174 均处于 Listen 状态。
- 测试数据保留，不清库、不删除验收记录。

### 浏览器验证的主要步骤

- H5 首页打开 `qiwai-showcase` 商家入口，确认首页、公告、活动、课程、动态、商城入口和底部导航正常渲染。
- H5 使用演示账号 `13990000002 / Qiwai123456` 通过密码登录，登录后返回首页。
- 使用商家管理员创建并保留活动 `浏览器验收租户报名 1781921716839`，在 H5 打开活动详情，确认活动状态、名额、服务说明、客服信息和报名入口正常。
- 在 H5 报名页填写姓名、手机号和备注，二次确认后提交报名，跳转报名详情；刷新后仍显示报名成功、订单已付款、票种、会员等级、报名信息和客服说明。
- 打开 H5 商城首页，确认多商户店铺、商品、秒杀、拼团、库存和跨店购物车提示正常。
- 打开商品 `【演示】七维书院读书手账` 详情，确认 SKU、库存、价格、店铺、配送和售后说明正常。
- 为测试账号新增并保留收货地址后，在 H5 商城确认订单页选择线下收款，提交订单并跳转商城订单详情；刷新后订单状态、地址、商品、备注和线下收款提示保持一致。
- H5 切换到验证码登录，测试手机号 `13990008992` 使用验证码 `123456` 登录成功，返回首页并可看到新建验收活动。
- 后台平台超管 `admin / Admin123456` 登录，验证 dashboard、全局报名、商城订单、商城财务总览和上线体检；平台能看到本次报名与商城订单。
- 商家超管 `showcase_admin / Qiwai123456` 登录，验证商家活动、报名、商城订单、商城财务；手输平台商家管理 `/tenants` 被带回商家工作台。
- 活动运营 `showcase_ops / Qiwai123456` 登录，验证活动管理、报名管理、签到核销可用；财务和平台商家管理不可访问。
- 活动财务 `showcase_finance / Qiwai123456` 登录，验证订单管理、财务对账、商城订单、商城财务可用；活动列表只读且无新建活动入口。
- 签到人员 `showcase_checkin / Qiwai123456` 登录，验证只读活动/报名、签到核销可用；手输订单和财务页面会停留在签到页。
- 店铺运营 `showcase_store_owner / Qiwai123456` 登录，验证商城商品、评价、物流、商城财务可用，多店铺场景提示先选择具体店铺；平台商家管理不可访问。
- 代理运营 `showcase_agent_owner / Qiwai123456` 登录，验证自动落到南城代理精选店，商品、订单、评价、商城财务按代理店铺范围展示；平台店铺管理不可访问。
- 店铺财务 `showcase_store_finance / Qiwai123456` 登录，验证商城订单和商城财务可用；该账号权限包仅覆盖商城财务，不覆盖活动订单/活动财务。

### 输入的测试数据摘要

- H5 报名用户：`13990000002`，姓名 `浏览器验收用户`，备注 `浏览器全流程验收报名备注，数据保留。`
- H5 验证码登录用户：`13990008992`，验证码 `123456`。
- 新增活动：`浏览器验收租户报名 1781921716839`，活动 ID `18`，租户 `qiwai-showcase`。
- 新增报名：报名 ID `25`，关联订单 `OD178192188733825`，状态 `报名成功 / 已付款`。
- 新增收货地址：收货人 `浏览器验收收货人`，手机号 `13990000002`，地址 `重庆市 重庆市 铜梁区 浏览器验收地址 1 号`。
- 新增商城订单：订单 ID `40`，订单号 `MO17819220662625BFDFC`，商品 `【演示】七维书院读书手账 / 标准款 × 1`，支付方式 `线下收款`，状态 `待确认收款`。

### 通过项

- 页面能正常打开：H5 首页、活动详情、报名页、报名详情、商城首页、商品详情、商城确认订单、商城订单详情、后台各核心页面均可打开。
- 登录/入口流程可用：H5 密码登录和验证码登录均通过；后台平台、商家、运营、财务、签到、店铺运营、代理运营、店铺财务账号均可登录。
- 核心业务流程可走通：H5 活动报名、报名详情刷新、商城线下订单提交、商城订单详情刷新、后台报名/订单查看均通过。
- 表单提交、数据保存、列表展示、详情查看正常：报名表、商城地址、商城订单均写入并能在刷新后读取；后台报名列表、订单列表、财务页能看到对应数据。
- 多角色权限边界正常：平台超管可看全局；商家超管限定本商家；运营无财务入口；活动财务只读活动且可进订单/财务；签到只读报名并可核销；店铺/代理账号按授权店铺范围展示；手输越权 URL 会重定向或停留在允许页面。
- 前端/API 报错：被测 H5 和后台页面 `tab.dev.logs({ levels: ["error"] })` 未发现页面级 error；接口健康检查正常。

### 发现的问题

- `/api/health/ready` 的 `config=warning` 仍来自本地/预发环境缺少生产域名、真实短信、真实支付、地图 Key 等外部生产配置，符合此前上线检查清单口径，不影响本地受控试运营验证。
- 浏览器自动化工具自身出现过 Statsig 外部网络告警，不属于被测系统前端页面或 API 报错。
- 真实微信/支付宝生产支付、真实退款回调/查询、自动对账、服务商账单自动拉取、代理真实打款、商城微信支付和店铺直收仍按真实支付计划保持关闭，等待真实商户与预发证据。

### 是否达到可上线运营标准

当前系统达到本地/预发受控试运营标准：免费报名、验证码登录、活动报名、报名详情、后台多角色管理、线下收款/余额支付口径、多商户商城浏览与线下订单、商城财务监管均通过浏览器主流程验收。

正式生产上线前仍需按 `docs/launch-checklist.md` 补齐真实域名、HTTPS、小程序域名白名单、生产短信凭证、生产密钥、真实支付商户材料、地图 Key、备份/监控和生产发布元数据；真实微信/支付宝支付与真实自动打款未完成预发证据前不得打开对应生产开关。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`
- 保留的验收业务数据：活动 ID `18`、报名 ID `25`、商城地址 ID `98`、商城订单 ID `40`。

### 运行或测试结果

- 浏览器 H5 主流程验收：通过。
- 浏览器后台平台/商家/运营/财务/签到/店铺/代理多角色验收：通过。
- `Invoke-RestMethod http://127.0.0.1:3000/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`、`config=warning`。
- `Get-NetTCPConnection -LocalPort 3000,5173,5174 -State Listen`：通过，三个服务端口均在监听。

### 遗留问题

- 正式生产外部配置和真实支付/真实打款材料仍未提供，不能声明真实支付生产闭环已完成。
- 上线前仍需在真实部署环境重复执行生产域名、HTTPS、小程序合法域名、短信实发、备份恢复、监控告警和真实支付预发验收。

### 下一阶段应继续处理的事项

- 当前开发计划中不依赖外部生产材料的开发、构建、自动化 smoke 和浏览器主流程验收已完成。
- 若继续推进正式生产上线，需要先提供真实生产域名、短信服务商、支付商户证书/密钥/回调域名、地图 Key、备份和监控配置，并按 `docs/real-payment-integration-plan.md` 和 `docs/launch-checklist.md` 进行真实环境预发验收。

## 2026-06-20 - 生产配置 doctor 复核

### 阶段名称

上线运营检查清单 - `npm run doctor` 生产配置体检复核。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/项目功能体检与优化报告.md`、`docs/real-payment-integration-plan.md` 和 `DEVELOPMENT_LOG.md`。
- 选择上线检查清单中 `npm run doctor` 作为本次小阶段，复核本地服务、端口、数据库连接和生产配置 readiness。
- 确认 doctor 没有 `ERR` 项，API、H5、后台端口均可用，生产配置中的域名、密钥、安全响应头、访问日志、H5 SMS 鉴权、后台登录限流、备份配置和真实支付挡板均处于预期状态。
- 确认真实支付相关生产开关继续保持关闭：`REAL_PAYMENT_ENABLED=false`、`REAL_PAYMENT_SDK_IMPLEMENTED=false`、`REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED=false`、`REAL_REFUND_QUERY_IMPLEMENTED=false`、`REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED=false`、`AGENT_REAL_TRANSFER_IMPLEMENTED=false`、`MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED=false`、`MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED=false`。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 10:33:02 +08:00。
- `npm.cmd run doctor`：通过，退出码 0。
- Doctor 基础环境：Node、npm、Docker、Docker Compose、MySQL、API 3000、H5 5173、Admin 5174 均为 OK。
- Production Configuration Readiness：无 ERR；`NODE_ENV=production`、生产域名、JWT/DB/H5_AUTH_SECRET 强度、安全响应头、访问日志、限流、备份和真实支付挡板均为 OK。
- WARN 项：H5 SMS login 需上线前确认后台短信服务商；SMS provider 缺少 `SMS_ACCESS_KEY_ID`、`SMS_ACCESS_KEY_SECRET`、`SMS_SIGN_NAME`、`SMS_TEMPLATE_ID`；Email provider disabled；WeChat message provider disabled；`NOTIFICATION_SCHEDULE_WORKER_ENABLED` disabled。

### 遗留问题

- WARN 项均属于生产运营外部配置或上线策略确认：短信服务商凭证、邮件/微信通知通道、定时通知 worker 是否启用。
- 真实微信/支付宝生产支付、真实退款、真实账单、真实自动打款、商城真实微信支付和店铺直收仍必须等待真实商户预发证据，不能通过本地 doctor 直接放行。

### 下一阶段应继续处理的事项

- 继续回读计划和开发记录；当前不依赖外部生产材料的计划内开发、自动化检查、doctor 复核和浏览器主流程验收均已完成。
- 若继续推进正式生产上线，需要提供并确认真实短信服务商、邮件/微信通知服务商、真实支付商户资料、HTTPS 回调域名、生产部署环境和监控备份策略。

## 2026-06-20 - 移动端报名确认页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `activity/register` 报名确认页视觉统一。

### 本阶段完成内容

- 重新读取开发计划和 `DEVELOPMENT_LOG.md` 后，选择 `docs/mobile-2.0-page-status.md` 中优先级最高的混合状态页面 `apps/mobile/src/pages/activity/register.vue` 作为本阶段。
- 将报名确认页顶部从旧式白底标题卡改为活动封面式 2.0 确认区，展示活动标题、剩余名额、票种、费用和必填进度。
- 调整报名说明、票种、优惠抵扣、支付方式、表单校验提示和固定提交栏的样式，使其与首页/活动详情页的新中式米白、朱砂红、石青视觉系统一致。
- 保持报名、报价、优惠码、积分抵扣、支付方式选择、必填校验和提交接口逻辑不变，仅做页面结构和 scoped 样式收口。

### 修改/新增的主要文件

- `apps/mobile/src/pages/activity/register.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 10:43:16 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/activity/register.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/activity/register?id=18&tenantCode=qiwai-showcase`：页面正常渲染出 `register-hero`、票种、优惠抵扣、报名表单和固定提交栏。
- 浏览器检查：页面无前端 `error/warn` 日志；滚动到表单底部后最后一个表单项位于固定提交栏上方，未发现明显遮挡。

### 遗留问题

- 本阶段只处理 `activity/register`，`user/registration`、`user/login`、`service/index`、`announcement/list` 等混合状态页面仍需按移动端 2.0 清单继续统一。
- 生产真实域名、短信服务商、真实支付和监控备份等外部上线材料仍不在本阶段处理范围内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，按 `docs/mobile-2.0-page-status.md` 的优先级推进下一个混合状态页面，建议处理 `apps/mobile/src/pages/user/registration.vue`。

## 2026-06-20 - 移动端报名详情页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/registration` 报名详情页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择优先级第二的混合状态页面 `apps/mobile/src/pages/user/registration.vue` 作为本阶段。
- 将报名详情页顶部从旧式标题卡改为状态型活动封面区，集中展示报名状态、订单状态、活动地点和活动标题。
- 调整当前状态卡、时间线、提示块、二维码边框、操作按钮等样式，使其与移动端 2.0 米白、朱砂红、石青视觉系统一致。
- 保留报名详情读取、订单支付动作、签到码、评价、取消报名、退款申请、入群二维码和底部导航逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/registration.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 10:50:35 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/registration.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 登录测试账号 `13990000002 / Qiwai123456` 后打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/registration?id=25&tenantCode=qiwai-showcase`：页面正常显示报名成功状态、订单已付款、报名信息、服务说明、操作按钮和底部导航。
- 浏览器检查：`registration-hero`、`status-card`、`order-card`、`custom-tabbar` 均存在；页面无前端 `error/warn` 日志。浏览器自动化工具自身的 Statsig warning 不属于被测系统页面日志。

### 遗留问题

- 本阶段只处理 `user/registration`，`user/login`、`service/index`、`announcement/list` 等混合状态页面仍需按移动端 2.0 清单继续统一。
- 正式生产外部材料和真实支付/真实打款预发证据仍未提供，不在本阶段处理范围内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，按 `docs/mobile-2.0-page-status.md` 的优先级推进下一个混合状态页面，建议处理 `apps/mobile/src/pages/user/login.vue`。

## 2026-06-20 - 移动端登录页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/login` 登录页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择优先级第三的混合状态页面 `apps/mobile/src/pages/user/login.vue` 作为本阶段。
- 将登录页旧式标题区改为 2.0 书院欢迎区，突出当前登录入口和会员/报名/订单权益说明。
- 调整登录卡片、密码/验证码分段切换、验证码按钮、开发验证码提示和管理端入口样式，统一到米白、朱砂红、石青视觉体系。
- 保留密码登录、验证码登录、微信登录、管理端入口和登录后 redirect 逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/login.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 10:53:35 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/login.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/login?tenantCode=qiwai-showcase` 并强刷新：`login-hero`、`login-card`、`login-tabs`、底部导航均正常渲染。
- 浏览器点击“验证码登录”：切换后 `code-row` 正常显示，激活 tab 为“验证码登录”，页面无前端 `error/warn` 日志。

### 遗留问题

- 本阶段只处理 `user/login`，`service/index`、`announcement/list`、`partner/index`、`user/review` 等混合状态页面仍需按移动端 2.0 清单继续统一。
- 真实短信服务商仍需生产环境配置和实发验收；本阶段只验证本地页面和模式切换，不改变短信服务配置。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，按 `docs/mobile-2.0-page-status.md` 的优先级推进下一个混合状态页面，建议处理 `apps/mobile/src/pages/service/index.vue`。

## 2026-06-20 - 移动端服务中心页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `service/index` 服务中心页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择优先级第四的混合状态页面 `apps/mobile/src/pages/service/index.vue` 作为本阶段。
- 将服务中心旧式标题区改为 2.0 服务入口区，突出付款、退款、发票和客服信息入口。
- 调整客服信息、城市合伙人、支付说明、退款说明、发票说明卡片样式，补充分区提示，使页面与移动端 2.0 视觉系统一致。
- 保留商家切换、运营设置读取、复制电话/微信、城市合伙人跳转和底部导航逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/service/index.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 10:59:22 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/service/index.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/service/index?tenantCode=qiwai-showcase`：`service-hero`、5 个服务卡片、城市合伙人入口和底部导航均正常渲染。
- 浏览器检查：页面可读取演示商家的客服、支付、退款和发票说明；页面无前端 `error/warn` 日志；滚回顶部后服务入口区完整可见。

### 遗留问题

- 本阶段只处理 `service/index`，`announcement/list`、`partner/index`、`user/review` 等混合状态页面仍需继续统一。
- 生产客服话术、真实支付说明和真实短信/支付配置仍需上线前按真实运营材料复核。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，按 `docs/mobile-2.0-page-status.md` 的优先级推进下一个混合状态页面，建议处理 `apps/mobile/src/pages/announcement/list.vue`。

## 2026-06-20 - 移动端公告中心页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `announcement/list` 公告中心页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择优先级第五的混合状态页面 `apps/mobile/src/pages/announcement/list.vue` 作为本阶段。
- 将公告中心旧式标题区改为 2.0 公告入口区，突出活动通知、报名提醒和现场须知集中查看场景。
- 调整公告卡、置顶标签、发布时间、公告标题、富文本内容、空状态和重试按钮样式，使其与移动端 2.0 米白、朱砂红、石青视觉系统一致。
- 保留商家切换、公告接口读取、Markdown 富文本渲染、空状态、重试和底部导航逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/announcement/list.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:02:54 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/announcement/list.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/announcement/list?tenantCode=qiwai-showcase`：`notice-hero`、置顶公告卡和底部导航均正常渲染。
- 浏览器检查：演示商家公告 `【演示】七维书院运营闭环验收说明` 正常显示；页面无前端 `error/warn` 日志。

### 遗留问题

- 本阶段只处理 `announcement/list`，`partner/index`、`user/review` 等混合状态页面仍需继续统一。
- 后续仍需按 1.0 页面清单继续处理社区详情、打卡、课程详情、订单确认/支付等页面。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `docs/mobile-2.0-page-status.md` 中剩余混合状态页面，建议下一阶段处理 `apps/mobile/src/pages/partner/index.vue` 或 `apps/mobile/src/pages/user/review.vue`。

## 2026-06-20 - 移动端城市合伙人页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `partner/index` 城市合伙人页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择剩余混合状态页面 `apps/mobile/src/pages/partner/index.vue` 作为本阶段。
- 将城市合伙人页的顶部专题区调整为 2.0 深色书院入口风格，并把后台装修内容移动到专题区之后，保持主视觉第一屏更聚焦。
- 调整合作对象、权益说明、活动方向、合作流程和联系合作卡片样式，统一到米白、朱砂红、石青视觉系统。
- 保留商家切换、运营设置读取、复制联系方式、拨打电话和底部导航逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/partner/index.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:07:39 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/partner/index.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/partner/index?tenantCode=qiwai-showcase`：专题区、5 个内容区块、咨询/电话动作和底部导航均正常渲染。
- 浏览器检查：演示商家的客服、微信和电话联系方式正常显示；页面无前端 `error/warn` 日志。

### 遗留问题

- 本阶段只处理 `partner/index`，混合状态中仍剩 `apps/mobile/src/pages/user/review.vue` 需要统一。
- 该页运营文案仍需上线前按实际城市合伙人政策复核，避免承诺与正式合作政策不一致。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理混合状态最后一个页面 `apps/mobile/src/pages/user/review.vue`。

## 2026-06-20 - 移动端活动评价页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/review` 活动评价页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择混合状态最后一个页面 `apps/mobile/src/pages/user/review.vue` 作为本阶段。
- 将评价页旧式标题卡改为 2.0 反馈入口区，突出评价归属和活动反馈场景。
- 调整评分、星级展示、评价内容输入框和提交按钮样式，使其与移动端 2.0 米白、朱砂红、石青视觉系统一致。
- 保留登录校验、报名 ID 读取、评分 slider、评价内容校验、提交接口、提交后返回和底部导航逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/review.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:11:14 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/review.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/review?id=25&tenantCode=qiwai-showcase`：`review-hero`、评价表单、评分 slider、textarea、提交按钮和底部导航均正常渲染。
- 浏览器检查：页面无前端 `error/warn` 日志；本阶段未点击提交评价，未新增评价测试数据。

### 遗留问题

- 移动端混合状态页面已全部完成本轮 2.0 视觉收口。
- 仍是 1.0 的页面还包括 `community/detail`、`community/checkin`、`course/detail`、`order/confirm`、`order/payment`、`charity/index`、若干用户中心子页等，需要继续按清单逐页推进。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，按 `docs/mobile-2.0-page-status.md` 的优先级进入 1.0 页面改造，建议从 `apps/mobile/src/pages/community/detail.vue` 或 `apps/mobile/src/pages/community/checkin.vue` 开始。

## 2026-06-20 - 移动端社区动态详情页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `community/detail` 社区动态详情页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，进入 1.0 页面改造，选择优先级建议中的 `apps/mobile/src/pages/community/detail.vue` 作为本阶段。
- 将动态详情页旧式行内样式改为 2.0 卡片化结构，补齐页面标题、动态详情分区、作者信息、正文、图片、互动和评论区样式。
- 调整底部写评论按钮栏，使其与移动端 2.0 固定操作栏风格一致。
- 保留动态读取、评论读取、点赞、评论弹窗、评论提交审核、返回和刷新逻辑不变；本阶段浏览器验证未执行点赞或评论提交。

### 修改/新增的主要文件

- `apps/mobile/src/pages/community/detail.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:16:21 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/community/detail.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 公开接口 `GET /api/public/community/posts?tenantCode=qiwai-showcase`：读取到演示动态 ID `8`。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/community/detail?id=8&tenantCode=qiwai-showcase`：动态详情卡、图片、评论区和底部写评论按钮均正常渲染。
- 浏览器检查：页面无前端 `error/warn` 日志；本阶段未新增点赞或评论测试数据。

### 遗留问题

- `community/checkin` 仍为 1.0 页面，需要继续统一。
- 课程详情、订单确认/支付和若干用户中心子页仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/community/checkin.vue`。

## 2026-06-20 - 移动端社区打卡页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `community/checkin` 社区打卡页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择 1.0 页面 `apps/mobile/src/pages/community/checkin.vue` 作为本阶段。
- 将打卡页旧式行内样式整理为 2.0 卡片结构，统一顶部导航、加载/空状态、今日任务卡和月度打卡日历样式。
- 调整已完成按钮、今日日期、任务描述、打卡天数和日历日期格视觉，使其与米白、朱砂红、石青体系一致。
- 保留登录校验、今日任务读取、点击打卡提交、打卡天数统计和返回逻辑不变；本阶段浏览器验证未点击打卡。

### 修改/新增的主要文件

- `apps/mobile/src/pages/community/checkin.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:22:05 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/community/checkin.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/community/checkin?tenantCode=qiwai-showcase`：今日任务卡、点击打卡按钮、月度打卡日历均正常渲染。
- 浏览器检查：页面无前端 `error/warn` 日志；本阶段未点击“打卡”，未新增打卡测试数据。

### 遗留问题

- 社区详情和打卡两个优先页面已完成本轮 2.0 视觉收口。
- `course/detail`、`order/confirm`、`order/payment` 仍在优先级清单内，后续应继续处理。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/course/detail.vue`。

## 2026-06-20 - 移动端课程详情页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `course/detail` 课程详情页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择优先级清单中的 `apps/mobile/src/pages/course/detail.vue` 作为本阶段。
- 将课程详情页旧式深色头图和散落行内样式收口为 2.0 课程封面、信息卡、标签页、目录和评价结构。
- 调整课程讲师、评分、价格、章节课时、评价列表和底部收藏/购买操作栏样式，使其与移动端 2.0 米白、朱砂红、石青视觉系统一致。
- 保留课程读取、收藏、购买、课程目录、评价切换和分享逻辑不变；浏览器验证只切换目录标签，未点击收藏或购买。

### 修改/新增的主要文件

- `apps/mobile/src/pages/course/detail.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:28:28 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/course/detail.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 公开课程接口读取到演示课程 ID `1`：`【演示】国学入门十分钟`。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/course/detail?id=1&tenantCode=qiwai-showcase`：课程封面、信息卡、标签页、目录和底部操作栏均正常渲染。
- 浏览器检查：`course-cover`、`course-info-card`、课程标签页和底部操作栏均存在；点击“目录”后课时列表正常显示；页面无前端 `error/warn` 日志。

### 遗留问题

- `order/confirm`、`order/payment` 仍在优先级清单内，需要继续统一课程/活动订单链路页面。
- `course/player`、`charity/index`、`search/index` 和若干用户中心子页仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/order/confirm.vue`。

## 2026-06-20 - 移动端订单确认页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `order/confirm` 课程订单确认页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择优先级清单中的 `apps/mobile/src/pages/order/confirm.vue` 作为本阶段。
- 将订单确认页旧式白卡和行内样式收口为 2.0 订单入口区、课程卡、支付方式卡和费用摘要卡。
- 调整课程封面、课程标题、价格、线下付款提示、支付方式单选和底部提交操作栏样式，使其与课程详情页和移动端 2.0 视觉系统一致。
- 保留课程读取、登录校验、免费开通、付费线下订单创建、支付方式选择和支付结果页跳转逻辑不变；浏览器验证未点击提交订单，未新增订单测试数据。

### 修改/新增的主要文件

- `apps/mobile/src/pages/order/confirm.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:32:13 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/order/confirm.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开免费课程确认页 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/order/confirm?id=1&tenantCode=qiwai-showcase`：订单入口区、课程卡、费用摘要和底部免费开通按钮均正常渲染。
- 右侧浏览器强刷新后打开付费课程确认页 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/order/confirm?id=3&tenantCode=qiwai-showcase`：线下付款提示、支付方式、`¥299.00` 金额摘要和底部提交按钮均正常渲染。
- 浏览器检查：付费和免费分支均无前端 `error/warn` 日志。

### 遗留问题

- `order/payment` 仍在优先级清单内，需要继续统一课程支付结果页。
- `course/player`、`charity/index`、`search/index` 和若干用户中心子页仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/order/payment.vue`。

## 2026-06-20 - 移动端支付结果页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `order/payment` 课程支付结果页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择优先级清单中的 `apps/mobile/src/pages/order/payment.vue` 作为本阶段。
- 将支付结果页旧式居中行内样式收口为 2.0 结果卡，覆盖课程已开通、线下付款待确认和支付失败三种状态。
- 新增状态标签、订单编号展示区、主操作按钮和返回课程按钮的统一样式，使页面与课程订单确认页同系。
- 保留 `status`、`mode`、`id`、`orderId` 参数解析，以及去学习、返回课程、重新支付跳转逻辑不变；浏览器验证未点击跳转按钮，未新增测试数据。

### 修改/新增的主要文件

- `apps/mobile/src/pages/order/payment.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:35:02 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/order/payment.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 分别打开成功、待确认、失败三个结果页 URL：`result-card is-success`、`result-card is-pending`、`result-card is-fail` 均正常渲染，主/次操作按钮均存在。
- 浏览器检查：三个状态页面均无前端 `error/warn` 日志。

### 遗留问题

- 课程详情、订单确认、支付结果三个优先订单链路页面已完成本轮 2.0 视觉收口。
- `course/player`、`charity/index`、`search/index` 和若干用户中心子页仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，按 `docs/mobile-2.0-page-status.md` 的 1.0 清单选择下一个页面，建议处理 `apps/mobile/src/pages/course/player.vue`。

## 2026-06-20 - 移动端课程播放页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `course/player` 课程播放页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择 1.0 清单中的 `apps/mobile/src/pages/course/player.vue` 作为本阶段。
- 将课程播放页旧式深色视频区和行内目录样式收口为 2.0 学习舞台、课时信息卡、目录开关和课时目录卡。
- 调整播放控制、学习进度条、当前章节/课时、标记完成按钮、目录课时状态和锁定态样式，使其与课程详情和订单链路同系。
- 保留登录校验、课程播放数据读取、课时切换、学习进度保存、返回课程详情和更多操作逻辑不变；浏览器验证未点击保存进度，未新增学习进度测试数据。

### 修改/新增的主要文件

- `apps/mobile/src/pages/course/player.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:38:16 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/course/player.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/course/player?id=1&tenantCode=qiwai-showcase`：学习舞台、课时信息卡、标记完成按钮和目录开关均正常渲染。
- 浏览器点击“查看目录”：目录卡正常展开，显示 2 个课时且当前课时高亮；页面无前端 `error/warn` 日志。

### 遗留问题

- `charity/index`、`search/index` 和若干用户中心子页仍在 1.0 清单内。
- 本阶段只做课程播放页视觉收口，未执行学习进度写入验收。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/charity/index.vue` 或 `apps/mobile/src/pages/search/index.vue`。

## 2026-06-20 - 移动端公益池页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `charity/index` 公益池页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择 1.0 清单中的 `apps/mobile/src/pages/charity/index.vue` 作为本阶段。
- 将公益池页旧式绿色公示风格统一为移动端 2.0 米白、朱砂红、石青体系。
- 调整公益公开主视觉、个人公益贡献/登录提示卡、统计四宫格、公益流水、公益项目卡、进度条和加载更多按钮样式。
- 保留公开公益汇总、公开项目、登录后个人公益明细、分页加载、登录跳转和底部导航逻辑不变；浏览器验证未新增公益数据。

### 修改/新增的主要文件

- `apps/mobile/src/pages/charity/index.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:41:06 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/charity/index.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/charity/index?tenantCode=qiwai-showcase`：公益公开主视觉、个人公益贡献卡、4 个统计项、公益明细空态、公益项目空态和底部导航均正常渲染。
- 浏览器检查：页面无前端 `error/warn` 日志。

### 遗留问题

- `search/index` 和若干用户中心子页仍在 1.0 清单内。
- 当前演示数据暂无公开公益项目，项目卡视觉本阶段未在真实项目数据下展开验证。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/search/index.vue`。

## 2026-06-20 - 移动端搜索页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `search/index` 搜索页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择 1.0 清单中的 `apps/mobile/src/pages/search/index.vue` 作为本阶段。
- 将搜索页旧式输入框、热门搜索、搜索历史和课程结果卡统一到移动端 2.0 视觉体系。
- 新增搜索引导区，调整搜索图标、标签云、清空历史、结果摘要、结果卡和空态样式。
- 保留课程数据读取、关键词匹配、搜索历史、取消返回和课程详情跳转逻辑不变；浏览器验证未跳转详情，未新增测试数据。

### 修改/新增的主要文件

- `apps/mobile/src/pages/search/index.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:44:03 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/search/index.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/search/index?tenantCode=qiwai-showcase`：搜索栏、搜索引导区、8 个热门标签、3 个历史标签均正常渲染。
- 浏览器点击热门词 `【演示】国学入门十分钟`：结果摘要显示 1 个结果，课程结果卡和免费价格正常显示；页面无前端 `error/warn` 日志。

### 遗留问题

- 若干用户中心子页仍在 1.0 清单内：`certificates`、`courses`、`favorites`、`learning`、`profile`、`security`、`settings`、`wallet`。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，按用户中心链路处理 `apps/mobile/src/pages/user/courses.vue`。

## 2026-06-20 - 移动端我的课程页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/courses` 我的课程页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择用户中心 1.0 子页 `apps/mobile/src/pages/user/courses.vue` 作为本阶段。
- 将我的课程页旧式导航、标签栏、课程卡和行内封面样式统一为移动端 2.0 学习中心入口。
- 调整顶部主视觉、全部/进行中/已完成分段标签、课程封面、课程标题、进度条和进度文本样式。
- 保留登录校验、我的课程接口读取、标签过滤、课程详情跳转、空态和底部课程导航逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/courses.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:47:08 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/courses.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/courses?tenantCode=qiwai-showcase`：顶部主视觉、3 个标签、空态和底部课程导航正常渲染。
- 浏览器点击“已完成”标签：激活态正常切换；页面无前端 `error/warn` 日志。

### 遗留问题

- 当前测试账号我的课程为空，课程卡视觉未在真实已购课程数据下展开验证。
- `user/learning`、`user/favorites`、`user/certificates`、`user/profile`、`user/security`、`user/settings`、`user/wallet` 仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/user/learning.vue`。

## 2026-06-20 - 移动端学习记录页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/learning` 学习记录页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择用户中心 1.0 子页 `apps/mobile/src/pages/user/learning.vue` 作为本阶段。
- 将学习记录页旧式导航和行内记录卡统一为移动端 2.0 学习足迹页面。
- 调整顶部主视觉、学习记录卡、课程图标、最后学习时间、进度条和底部课程导航样式。
- 发现原全局 `empty-state` 在当前 H5 空数据状态下未显示文案，本阶段改为页面内置 2.0 空态卡。
- 保留登录校验、我的课程接口读取、学习时间格式化、进度展示和返回逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/learning.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:51:06 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/learning.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/learning?tenantCode=qiwai-showcase`：顶部主视觉、空态卡和底部课程导航正常渲染。
- 浏览器检查：空态文案 `暂无学习记录` 正常显示；页面无前端 `error/warn` 日志。

### 遗留问题

- 当前测试账号学习记录为空，真实学习记录卡视觉未在已有进度数据下展开验证。
- `user/favorites`、`user/certificates`、`user/profile`、`user/security`、`user/settings`、`user/wallet` 仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/user/favorites.vue`。

## 2026-06-20 - 移动端我的收藏页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/favorites` 我的收藏页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择用户中心 1.0 子页 `apps/mobile/src/pages/user/favorites.vue` 作为本阶段。
- 将我的收藏页旧式导航、课程网格卡和全局空态统一为移动端 2.0 收藏夹页面。
- 调整顶部主视觉、收藏课程卡、课程标题、讲师、价格和页面内置空态卡样式。
- 保留登录校验、收藏课程接口读取、课程详情跳转和底部我的导航逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/favorites.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:53:14 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/favorites.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/favorites?tenantCode=qiwai-showcase`：顶部主视觉、空态卡和底部我的导航正常渲染。
- 浏览器检查：空态文案 `暂无收藏` 正常显示；页面无前端 `error/warn` 日志。

### 遗留问题

- 当前测试账号收藏为空，收藏课程卡视觉未在真实收藏数据下展开验证。
- `user/certificates`、`user/profile`、`user/security`、`user/settings`、`user/wallet` 仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/user/certificates.vue`。

## 2026-06-20 - 移动端我的证书页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/certificates` 我的证书页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择用户中心 1.0 子页 `apps/mobile/src/pages/user/certificates.vue` 作为本阶段。
- 将我的证书页旧式导航、证书卡和全局空态统一为移动端 2.0 成长凭证页面。
- 调整顶部主视觉、证书图片/徽章、证书名称、发放时间和页面内置空态卡样式。
- 保留登录校验、我的证书接口读取、发放时间格式化和底部我的导航逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/certificates.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:55:11 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/certificates.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/certificates?tenantCode=qiwai-showcase`：顶部主视觉、空态卡和底部我的导航正常渲染。
- 浏览器检查：空态文案 `暂无证书` 正常显示；页面无前端 `error/warn` 日志。

### 遗留问题

- 当前测试账号证书为空，真实证书卡视觉未在已有证书数据下展开验证。
- `user/profile`、`user/security`、`user/settings`、`user/wallet` 仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/user/profile.vue`。

## 2026-06-20 - 移动端账号资料页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/profile` 账号资料页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择用户中心 1.0 子页 `apps/mobile/src/pages/user/profile.vue` 作为本阶段。
- 将账号资料页旧式变量卡片、头像编辑、昵称输入和账号安全入口统一为移动端 2.0 资料页视觉。
- 调整头像主卡、表单卡、上传头像按钮、昵称输入框、保存按钮、账号安全入口和底部导航样式。
- 保留登录校验、我的资料接口读取、头像上传、资料保存和账号安全跳转逻辑不变；浏览器验证未点击上传或保存。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/profile.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:57:14 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/profile.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/profile?tenantCode=qiwai-showcase`：头像主卡、昵称输入、保存按钮、账号安全入口和底部导航均正常渲染。
- 浏览器检查：页面无前端 `error/warn` 日志。

### 遗留问题

- 本阶段未执行头像上传或保存资料，避免改动测试账号资料。
- `user/security`、`user/settings`、`user/wallet` 仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/user/security.vue`。

## 2026-06-20 - 移动端账号安全页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/security` 账号安全页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择用户中心 1.0 子页 `apps/mobile/src/pages/user/security.vue` 作为本阶段。
- 将账号安全页旧式深色头部、表单卡、输入框、验证码按钮和保存按钮统一为移动端 2.0 账号安全视觉。
- 调整手机号绑定卡、验证码行、开发验证码提示、密码设置卡和底部导航样式。
- 保留登录校验、资料读取、发送验证码、修改手机号、设置/修改密码和底部导航逻辑不变；浏览器验证未发送验证码或保存修改。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/security.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 11:59:58 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/security.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/security?tenantCode=qiwai-showcase`：账号头部、2 个表单卡、4 个输入框、验证码按钮、保存按钮和底部导航均正常渲染。
- 浏览器检查：页面无前端 `error/warn` 日志。

### 遗留问题

- 本阶段未执行手机号验证码发送、手机号保存或密码保存，避免改动测试账号安全信息。
- `user/settings`、`user/wallet` 仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/user/settings.vue`。

## 2026-06-20 - 移动端设置页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/settings` 设置页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择用户中心 1.0 子页 `apps/mobile/src/pages/user/settings.vue` 作为本阶段。
- 将设置页旧式导航、设置列表和退出登录按钮统一为移动端 2.0 偏好设置页面。
- 调整顶部主视觉、设置项卡片、版本信息箭头、退出登录按钮和底部我的导航样式。
- 保留返回、账号安全跳转、退出登录确认和清除登录态逻辑不变；浏览器验证未点击退出登录。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/settings.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 12:03:11 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/settings.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/settings?tenantCode=qiwai-showcase`：顶部主视觉、4 个设置项、退出登录按钮和底部我的导航均正常渲染。
- 浏览器检查：页面无前端 `error/warn` 日志。

### 遗留问题

- 本阶段未点击退出登录，保留当前测试登录态继续后续验收。
- `user/wallet` 仍在 1.0 清单内。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `apps/mobile/src/pages/user/wallet.vue`。

## 2026-06-20 - 移动端钱包页 2.0 视觉收口

### 阶段名称

移动端 2.0 页面状态清单 - `user/wallet` 钱包页视觉统一。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，选择用户中心 1.0 子页 `apps/mobile/src/pages/user/wallet.vue` 作为本阶段。
- 将钱包页旧式深色余额卡、统计格和流水记录卡统一为移动端 2.0 余额明细页面。
- 调整账户余额主视觉、累计充值/消费/冻结/本页收入/本页支出统计项、流水记录卡、收入/支出金额和底部我的导航样式。
- 保留登录校验、钱包余额接口读取、钱包流水接口读取、金额格式化和时间格式化逻辑不变。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/wallet.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 12:05:53 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，H5 构建完成；仅保留 uni-app 新版本提示。
- `git diff --check -- apps/mobile/src/pages/user/wallet.vue`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器手机视口 `390x844` 打开 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/pages/user/wallet?tenantCode=qiwai-showcase`：账户余额、5 个统计项、流水记录和底部我的导航均正常渲染。
- 浏览器检查：演示账号显示 `¥500.00` 可用余额和 1 条后台充值流水；页面无前端 `error/warn` 日志。

### 遗留问题

- `docs/mobile-2.0-page-status.md` 中列出的混合状态页面和 1.0 普通学员页面本轮均已完成视觉收口，但文档本身尚未更新状态标记。
- `apps/mobile/src/pages/ambassador/index.vue` 属于独立专题页，原清单说明不归入普通 2.0/1.0 页面，本轮未调整。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，复核是否需要更新 `docs/mobile-2.0-page-status.md` 的状态清单；若所有计划内普通学员页面已完成，应进入构建、预检和浏览器主流程验收。

## 2026-06-20 - 移动端 2.0 状态清单收口

### 阶段名称

移动端 2.0 页面状态清单 - 文档状态同步。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md` 和 `DEVELOPMENT_LOG.md` 后，确认本轮已完成清单中全部混合状态页面和普通学员 1.0 页面视觉收口。
- 更新 `docs/mobile-2.0-page-status.md` 的更新时间为 2026-06-20。
- 将已完成页面移动到“已是 2.0”，把“混合状态”和“仍是 1.0”更新为暂无普通学员页面。
- 更新当前优先级建议为构建、预检和浏览器主流程验收，并保留 `ambassador/index` 独立专题页说明。

### 修改/新增的主要文件

- `docs/mobile-2.0-page-status.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 12:09:42 +08:00。
- `git diff --check -- docs/mobile-2.0-page-status.md`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。

### 遗留问题

- 移动端 2.0 普通学员页面清单已完成，但仍需执行整体构建、预检和浏览器主流程验收。
- 正式上线外部材料仍未补齐：真实域名/HTTPS、短信服务商、真实支付证书与回调、真实退款/对账/打款证据、生产监控备份等。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，进入构建、预检和浏览器主流程验收。

## 2026-06-20 - 总体验收自动化检查与 smoke 修复

### 阶段名称

上线运营检查清单 - 构建、预检、smoke 与主业务流自动化检查。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md`、`docs/launch-checklist.md` 和 `DEVELOPMENT_LOG.md` 后，选择上线清单中的自动化验收作为本阶段。
- 复核移动端 2.0 普通学员页面清单已全部收口，进入整体构建、预检和 smoke 验收。
- 修正 `scripts/smoke.mjs` 中微信、支付宝、余额报名支付方式断言，允许本地未启用真实支付/沙箱支付时返回明确不可用提示，并补齐余额充值后自动支付断言。
- 修正 `scripts/smoke-flow.mjs` 付费流程，先充值测试钱包再执行余额报名，并断言报名自动进入已支付/已通过状态。
- 保留 smoke 产生的测试报名、订单、钱包流水、候补和标签等测试数据。

### 修改/新增的主要文件

- `scripts/smoke.mjs`
- `scripts/smoke-flow.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 12:19:34 +08:00。
- `npm.cmd run build`：通过；仅保留 VueUse PURE 注释、大 chunk 和 uni-app 新版本提示。
- `npm.cmd run test`：通过，13 个测试文件、169 个用例全部通过。
- `npm.cmd run preflight`：通过；仍提示生产短信服务商凭证未完整配置。
- `npm.cmd run doctor`：通过；仍提示短信/后台运营配置、邮件/微信通知服务商和通知定时 worker 等生产配置未启用或未完整配置。
- `npm.cmd run smoke`：通过。
- `npm.cmd run smoke:flow`：通过；免费流程、余额支付付费流程、过期订单关闭、候补补位和标签流程均通过。
- `git diff --check -- scripts/smoke.mjs scripts/smoke-flow.mjs`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- `node --check scripts/smoke.mjs`、`node --check scripts/smoke-flow.mjs`：通过。

### 遗留问题

- 正式上线外部条件仍未补齐：真实域名/HTTPS、真实短信服务商、真实微信/支付宝支付证书与回调、退款/对账/打款证据、生产监控和备份演练等。
- 本阶段完成的是本地自动化验收；仍需按最终验收规则在右侧浏览器走 H5、后台和不同角色主流程。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，进入右侧浏览器主流程验收；若验收发现计划内页面或接口问题，返回对应范围修复后再次验收。

## 2026-06-20 - 最终浏览器主流程验收

### 阶段名称

上线运营检查清单 - H5、后台多角色、商城与系统健康浏览器验收。

### 本阶段完成内容

- 重新读取 `docs/mobile-2.0-page-status.md`、`docs/launch-checklist.md` 和 `DEVELOPMENT_LOG.md` 后，选择最终浏览器主流程验收作为本阶段。
- 确认 API、数据库、H5 和后台前端服务均可访问；`/api/health/ready` 返回 `ready: true`，`/api/health/metrics` 包含 API、数据库、配置和构建信息指标。
- 在右侧浏览器手机视口走通 H5 首页、验证码登录、我的页刷新保活、活动详情、活动报名提交、报名详情刷新、课程列表、课程详情、免费课程开通、课程支付成功页和播放器。
- 在右侧浏览器走通前台商城首页、商品详情、结算页、新增收货地址、线下收款商城订单提交和商城订单详情。
- 在右侧浏览器桌面视口分别登录平台超管、商家运营、财务、签到和店铺运营角色，验证菜单、页面访问和越权重定向行为。
- 保留本次浏览器验收产生的测试用户、报名、收货地址、课程订单和商城订单数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 12:33:40 +08:00。
- 验证环境：本地 API `http://127.0.0.1:3000/api`，H5 `http://127.0.0.1:5173/?tenantCode=qiwai-showcase`，后台 `http://127.0.0.1:5174/admin`，浏览器手机视口 `390x844` 与桌面视口 `1365x900`。
- 服务健康：`/api/health` 显示 API/database `up`、config `warning`；`/api/health/ready` 显示 `ready: true`、API/database `up`；`/api/health/metrics` 包含 `activity_api_up 1`、`activity_database_up 1`、`activity_config_error 0` 和 `activity_build_info{version="0.1.0",commit="local"} 1`。
- H5 登录：手机号 `13990008993` 使用验证码 `123456` 登录成功，刷新“我的”页后仍显示 `用户8993`、手机号和账户状态。
- H5 活动：打开活动 `浏览器验收租户报名 1781921716839`，提交报名信息后生成报名详情 `id=44`；刷新后仍显示“报名成功 / 已付款”、姓名 `浏览器验证码验收用户`、手机号 `13990008993` 和备注。
- H5 课程：课程列表、课程详情 `id=1`、免费课程确认页、支付成功页和播放器均正常；免费开通跳转到 `order/payment?status=success&id=1&orderId=1`，播放器刷新后仍可显示课时与进度入口。
- H5 商城：商城首页、商品详情 `【演示】七维书院读书手账`、结算页正常；新增收货地址 `浏览器最终验收收货人 / 13990008993 / 重庆市 重庆市 铜梁区 浏览器最终验收地址 2026-06-20`；提交线下收款商城订单后进入订单详情 `id=41`，订单号 `MO17819299781683A16B2`，状态为“待确认收款”。
- 后台平台超管 `admin / Admin123456`：可访问全局数据看板、全局报名、全局对账、商城财务总览、上线体检；全局报名可看到本次 H5 报名 `44`。
- 后台商家运营 `showcase_ops / Qiwai123456`：可访问活动管理和报名管理，报名管理可看到本次报名 `44`；手输财务页会回到工作台。
- 后台财务 `showcase_finance / Qiwai123456`：可访问订单管理、财务对账和商城财务总览；手输系统设置会回到工作台。
- 后台签到 `showcase_checkin / Qiwai123456`：可访问签到核销和报名只读查询，报名只读页可看到本次报名 `44`；手输财务页会回到签到核销页。
- 后台店铺运营 `showcase_store_owner / Qiwai123456`：可访问商城商品和商城财务总览；手输平台商家管理会回到工作台。
- 浏览器页面检查：本次 H5 与后台验收页面未发现前端 `error/warn` 日志；浏览器控制工具自身出现的 Statsig 事件丢弃/网络警告与项目页面无关。

### 输入的测试数据摘要

- H5 验证码登录用户：`13990008993`，验证码 `123456`。
- 活动报名：姓名 `浏览器验证码验收用户`，手机号 `13990008993`，备注 `2026-06-20 浏览器最终验收报名，数据保留。`，报名详情 `id=44`。
- 商城收货地址：`浏览器最终验收收货人`，手机号 `13990008993`，地址 `重庆市 重庆市 铜梁区 浏览器最终验收地址 2026-06-20`。
- 商城订单：商品 `【演示】七维书院读书手账 / 标准款 × 1`，金额 `¥39.00`，支付方式 `线下收款`，备注 `2026-06-20 浏览器最终验收商城订单，数据保留。`，订单详情 `id=41`，订单号 `MO17819299781683A16B2`。
- 后台角色账号：`admin`、`showcase_ops`、`showcase_finance`、`showcase_checkin`、`showcase_store_owner`。

### 通过项

- 页面能正常打开：H5 首页、活动、报名、课程、支付、播放器、商城、我的页和后台核心页面均可打开。
- 登录/入口流程可用：H5 验证码登录通过；后台平台、运营、财务、签到、店铺运营角色均可登录。
- 核心业务流程可完整走通：活动免费报名、课程免费开通、商城线下收款订单、后台多角色查看/权限重定向均通过。
- 表单提交、数据保存、列表展示、详情查看正常：报名、收货地址、商城订单均真实提交并在详情/后台列表中可见。
- 刷新页面后关键数据状态合理：H5 登录态、“我的”页、报名详情和播放器刷新后仍可用。
- 没有明显前端报错、接口报错或页面阻塞。

### 发现的问题

- 本地配置仍为 `config: warning`，原因属于上线外部条件未补齐：真实域名/HTTPS、真实短信服务商、真实微信/支付宝支付证书与回调、真实退款/对账/打款证据、生产监控和备份演练等。
- 上线体检提示“配置可运行，但上线前仍有待确认项”；这不影响本地/预发主流程验收，但正式生产接流量前必须补齐。

### 是否达到可上线运营标准

- 已达到本地/预发受控试运营验收标准：计划内普通学员移动端 2.0 页面、自动化构建/测试/preflight/smoke、H5 主流程、商城主流程和后台多角色主流程均通过。
- 尚未达到真实公网正式收费运营标准：仍受真实域名、短信、支付证书/回调、退款/对账/打款证据、生产监控备份等外部生产条件阻塞。

### 遗留问题

- 需要由运营/部署侧补齐真实生产域名、HTTPS、CORS、短信服务商、支付服务商证书与回调、真实对账单/退款/打款预发证据、生产监控和备份恢复演练。
- 若启用真实支付或多商户商城正式运营，需按 `docs/launch-checklist.md` 和 `docs/real-payment-integration-plan.md` 留存对应预发验收结果。

### 下一阶段应继续处理的事项

- 当前开发计划内本地可实施任务与浏览器主流程验收已完成；下一步必须补齐上述外部生产上线条件后，再执行生产环境上线体检和真实服务商联调验收。

## 2026-06-20 - 数据库迁移状态与备份演练

### 阶段名称

上线运营检查清单 - 数据库迁移状态、备份与清理策略本地演练。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/local-acceptance-test-plan.md` 和 `DEVELOPMENT_LOG.md` 后，选择“数据与备份”中可在本地完成的迁移状态、数据库备份和备份清理作为本阶段。
- 执行 API migration 状态检查，确认当前 93 个 migration 全部为 `[X]`。
- 首次执行 `npm.cmd run db:backup` 时脚本默认读取 `deploy/.env.production`，因生产配置 `DB_HOST=mysql` 进入 Docker 备份模式；当前本地 Docker daemon 未运行，命令失败。
- 改用本地 API 环境 `ENV_FILE=apps/api/.env` 后，脚本进入本地 `mysqldump.exe` 模式；首次因 `mysqldump.exe` 不在 PATH 失败。
- 反查本机 MariaDB 进程，定位到 `C:\Program Files\MariaDB 12.3\bin\mysqldump.exe`，通过临时 PATH 完成本地数据库备份。
- 执行默认备份清理策略，确认 30 天保留策略可运行且本次未清理新备份。
- 对生成的 `.sql.gz` 备份做解压完整性检查，确认 gzip 可读并可展开为 SQL 内容。

### 修改/新增的主要文件

- `backups/mysql/activity_registration-20260620-124244.sql.gz`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 12:44:00 +08:00。
- `npm.cmd --prefix apps/api run migration:show`：通过；93 个 migration 全部显示 `[X]`。
- `npm.cmd run db:backup`：首次失败，原因为默认生产 env 触发 Docker 备份模式，但本地 Docker daemon 未运行。
- `$env:ENV_FILE='apps/api/.env'; npm.cmd run db:backup`：首次失败，原因为 `mysqldump.exe` 未加入 PATH。
- `$env:ENV_FILE='apps/api/.env'; $env:Path='C:\Program Files\MariaDB 12.3\bin;' + $env:Path; npm.cmd run db:backup`：通过，生成 `backups/mysql/activity_registration-20260620-124244.sql.gz`，压缩后约 `0.14 MB`。
- `npm.cmd run db:prune-backups`：通过，输出 `Pruned 0 backup file(s) older than 30 day(s)`。
- Node gzip 解压检查：通过，备份文件压缩大小 `154302` bytes，展开 SQL 大小 `1299791` bytes。

### 遗留问题

- 生产模式备份仍依赖 Docker daemon 或生产部署机可用的 Docker 环境；当前本地环境 Docker daemon 未运行，无法演练生产 Docker 备份路径。
- 本地备份需要 MariaDB/MySQL 客户端在 PATH 中；本机客户端存在于 `C:\Program Files\MariaDB 12.3\bin`，但未配置为全局 PATH。
- 本阶段未执行恢复演练，避免在当前验收库上误覆盖已保留的浏览器测试数据；恢复演练应在独立测试库或临时库中执行。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，处理 `docs/launch-checklist.md` 中“数据与备份”的独立测试库恢复演练；若缺少安全的独立恢复库或需要新增脚本/目标库配置，应先记录原因并停止等待确认。

## 2026-06-20 - 数据库备份恢复演练

### 阶段名称

上线运营检查清单 - 独立测试库备份恢复演练。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/local-acceptance-test-plan.md`、`scripts/db-restore.mjs` 和 `DEVELOPMENT_LOG.md` 后，选择“在测试库做一次恢复演练”作为本阶段。
- 确认 `scripts/db-restore.mjs` 支持通过环境变量覆盖 `DB_DATABASE`，可以安全指向独立测试库，避免覆盖当前主验收库 `activity_registration`。
- 使用普通数据库用户 `activity` 创建独立恢复库时被拒绝，确认该用户没有建库权限，符合最小权限预期。
- 使用本地 MariaDB root 默认凭证 `rootpass` 创建独立恢复库 `activity_registration_restore_drill_20260620`。
- 将上一阶段生成的 `backups/mysql/activity_registration-20260620-124244.sql.gz` 恢复到独立恢复库。
- 查询恢复库元数据和关键记录，确认恢复结果包含表结构与本次浏览器验收保留数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`
- 本地 MariaDB 新增独立恢复库：`activity_registration_restore_drill_20260620`

### 运行或测试结果

- 验证时间：2026-06-20 12:50:00 +08:00。
- `$env:MYSQL_PWD='activitypass'; mysql.exe ... -u activity -e "CREATE DATABASE ..."`：失败，`ERROR 1044`，普通业务用户无建库权限。
- `$env:MYSQL_PWD='rootpass'; mysql.exe ... -u root -e "SELECT 1 AS ok"`：通过，确认本地 root 凭证可用于恢复演练管理操作。
- `$env:MYSQL_PWD='rootpass'; mysql.exe ... -u root -e "CREATE DATABASE IF NOT EXISTS activity_registration_restore_drill_20260620 ..."`：通过。
- `$env:ENV_FILE='apps/api/.env'; $env:DB_USERNAME='root'; $env:DB_PASSWORD='rootpass'; $env:DB_DATABASE='activity_registration_restore_drill_20260620'; $env:RESTORE_CONFIRM='activity_registration_restore_drill_20260620'; $env:BACKUP_FILE='backups/mysql/activity_registration-20260620-124244.sql.gz'; npm.cmd run db:restore`：通过。
- 恢复库检查：`information_schema.tables` 显示 `98` 张表；`registrations` 中存在浏览器验收报名 `id=44`；`mall_orders` 中存在浏览器验收商城订单 `id=41`。

### 遗留问题

- 本地恢复演练已完成；生产恢复演练仍需要在真实部署环境或预发独立库中执行，并确认备份文件保存到独立磁盘或对象存储。
- 本地 root 凭证为开发环境默认值；生产环境必须替换为强密码，且恢复操作应由受控 DBA/运维权限执行。
- 恢复演练库 `activity_registration_restore_drill_20260620` 已保留，便于后续人工抽查恢复数据。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，确认剩余项是否已全部转为外部生产条件；若只剩真实域名、HTTPS、短信服务商、真实支付证书/回调、生产监控和对象存储等外部条件，应记录阻塞并停止等待部署侧补齐。

## 2026-06-20 - 真实生产上线外部条件阻塞确认

### 阶段名称

上线运营检查清单 - 剩余计划项与外部生产条件复核。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/real-payment-integration-plan.md`、`docs/production-runbook.md` 和 `DEVELOPMENT_LOG.md`，确认本地可执行的开发、构建、自动化测试、浏览器主流程、多角色验收、数据库备份和独立库恢复演练均已完成。
- 复核剩余计划项，确认已转为真实生产部署与外部服务商条件：真实 HTTPS 域名和反向代理切流、短信服务商实发凭证、真实微信/支付宝商户证书与回调验签、真实退款/账单/代理打款预发证据、生产 Docker 部署、生产监控日志采集、备份目录独立磁盘或对象存储、默认管理员处置和正式团队账号治理。
- 执行 `npm.cmd run doctor`，确认本地 API、H5、后台、MySQL 均可用，生产配置体检无 `ERR`，但仍存在短信/通知服务商与定时通知 worker 等上线前确认项。
- 按执行规则记录真实阻塞原因并停止，不继续擅自填充真实服务商账号、生产域名、支付证书或运维配置。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 12:54:00 +08:00。
- `npm.cmd run doctor`：通过。
- Doctor 本地服务结果：Node、npm、Docker CLI、Docker Compose、MySQL `127.0.0.1:13306`、API `3000`、API readiness、H5 `5173`、Admin `5174` 均为 `OK`。
- Doctor 生产配置结果：`NODE_ENV=production`、版本信息、JWT、数据库密码、`DB_SYNCHRONIZE=false`、生产域名字段、安全响应头、严格校验、访问日志、H5 短信模式、后台限流、真实支付挡板、多租户挡板、多商户挡板、备份目录和保留天数均为 `OK`。
- Doctor 保留警告：H5 短信登录需在后台确认服务商配置；SMS provider 缺少 `SMS_ACCESS_KEY_ID`、`SMS_ACCESS_KEY_SECRET`、`SMS_SIGN_NAME`、`SMS_TEMPLATE_ID`；Email provider 未启用；WeChat message provider 未启用；通知定时 worker 未启用。

### 遗留问题

- 真实公网正式收费运营仍被外部条件阻塞：需要部署侧提供并验证真实 HTTPS 域名、生产反向代理、短信服务商账号与模板、微信/支付宝商户号和证书、真实支付/退款/对账/代理打款预发证据、生产 Docker daemon 与持久化卷、监控日志采集、独立磁盘或对象存储备份、正式管理员账号和默认账号处置。
- 这些事项不是当前本地代码仓库内可安全代填或伪造的任务；未补齐前不应打开 `REAL_PAYMENT_ENABLED`、真实支付实现标记或生产真实流量。

### 下一阶段应继续处理的事项

- 等部署/运营侧补齐上述真实生产条件后，重新读取开发计划和开发记录，执行生产环境 `doctor`、`preflight`、Docker 部署、真实服务商联调、备份恢复演练和右侧浏览器生产主流程复验。

## 2026-06-20 - 多商户商城动态 smoke 复验

### 阶段名称

上线运营检查清单 - 多商户商城 `smoke:mall-multi-merchant` 动态验收复跑。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/project-progress.md`、`docs/real-payment-integration-plan.md` 和 `DEVELOPMENT_LOG.md` 后，选择上线清单中“如启用或展示多商户商城，执行 `npm run smoke:mall-multi-merchant`”作为本阶段。
- 读取 `scripts/smoke-mall-multi-merchant.mjs`、`scripts/preflight-mall-multi-merchant-guard.mjs`、`scripts/online-showcase-lib.mjs` 和既有 `deploy/mall-multi-merchant-smoke-result.json`，确认动态 smoke 需要演示账号密码环境变量。
- 先执行脚本语法检查和多商户商城静态 guard，确认脚本与上线门禁锚点可用。
- 首次直接执行 `npm.cmd run smoke:mall-multi-merchant` 失败，原因为缺少 `SHOWCASE_PASSWORD` 环境变量；随后使用临时环境变量 `API_BASE=http://127.0.0.1:3000/api`、`SHOWCASE_ADMIN_USERNAME=admin`、`SHOWCASE_ADMIN_PASSWORD=Admin123456`、`SHOWCASE_PASSWORD=Qiwai123456` 重跑通过。
- 动态 smoke 刷新 `deploy/mall-multi-merchant-smoke-result.json`，保留本轮生成的多商户店铺、商品、跨店订单、评价、结算、售后与冲抵测试数据。
- 复跑主预检，确认多商户商城 smoke 结果仍能通过上线门禁链路。

### 修改/新增的主要文件

- `deploy/mall-multi-merchant-smoke-result.json`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 12:51:00 +08:00。
- `node --check scripts/smoke-mall-multi-merchant.mjs`：通过。
- `node scripts/preflight-mall-multi-merchant-guard.mjs`：通过。
- `npm.cmd run smoke:mall-multi-merchant`：首次失败，`SHOWCASE_PASSWORD` 缺失。
- `$env:API_BASE='http://127.0.0.1:3000/api'; $env:SHOWCASE_ADMIN_USERNAME='admin'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'; $env:SHOWCASE_PASSWORD='Qiwai123456'; npm.cmd run smoke:mall-multi-merchant`：通过。
- 动态 smoke 通过项：店铺主体、店铺授权、店铺商品、商品审核、后台店铺授权隔离、前台店铺列表/主页、店铺收款账户 readiness、用户私有 DTO、购物车/收藏/浏览/规格可见性保护、店铺优惠券/推广码/秒杀/拼团/物流隔离、跨店购物车拆单、跨店重复提交幂等、跨店余额支付防半扣款、支付任务路由、直接 ID 操作隔离、批量任务授权范围、子订单履约、收款模式切换保护、店铺关闭保护、结算组状态同步、结算组后台追踪、评价隔离、结算闭环、结算凭证必填、商户直收店铺平台代收结算口径、已结算后退款冲抵和商城运营后台接口。
- 结果文件：`deploy/mall-multi-merchant-smoke-result.json` 已刷新，`passed=true`，`checkedAt=2026-06-20T04:50:54.783Z`，`apiBase=http://127.0.0.1:3000/api`，`tenantCode=qiwai-showcase`。
- `npm.cmd run preflight`：通过；仍保留短信服务商生产凭证未完整配置警告。

### 遗留问题

- 多商户商城本地动态 smoke 已通过；正式开启多商户商城生产流量前，仍需由部署侧确认生产 API 地址、结果文件新鲜度、生产域名、短信服务商、真实支付/退款/店铺直收/代理打款证据与监控备份条件。
- 本阶段未修改业务代码，仅刷新动态验收结果和开发记录。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，寻找仍可在本地完成的计划内小阶段；若剩余均依赖真实生产域名、服务商账号、支付证书、对象存储或生产运维环境，应保持阻塞结论并等待外部条件补齐。

## 2026-06-20 - 线上演示预发布门禁 dry-run

### 阶段名称

上线运营检查清单 - `prelaunch:online-showcase` 真实支付与多商户门禁演练。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/production-runbook.md`、`scripts/prelaunch-online-showcase.mjs` 和 `DEVELOPMENT_LOG.md` 后，选择线上演示预发布门禁 dry-run 作为本阶段。
- 读取 `deploy/real-payment-smoke-result.json` 和 `deploy/real-payment-smoke-result.example.json`，确认真实支付结果文件仍为模板/待验证状态，`passed=false` 且各关键项为 `pending`。
- 使用临时环境变量 `API_BASE=http://127.0.0.1:3000/api`、`PRELAUNCH_ALLOW_HTTP=true`、`SHOWCASE_ADMIN_USERNAME=admin`、`SHOWCASE_ADMIN_PASSWORD=Admin123456`、`SHOWCASE_PASSWORD=Qiwai123456` 执行 `npm.cmd run prelaunch:online-showcase`，不修改真实支付开关。
- 门禁确认多商户商城 smoke 结果通过且仍在有效期内，同时明确阻止真实微信支付/商城微信支付正式开放。
- 按门禁结论保持 `REAL_PAYMENT_ENABLED=false`，不伪造真实服务商证据，不打开生产真实支付或店铺直收支付标记。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 12:53:00 +08:00。
- `deploy/real-payment-smoke-result.json`：存在，但 `passed=false`，`checkedAt=2026-06-12T07:32:50.321Z`，真实支付、退款、账单、商城支付、代理打款和回滚计划均未通过。
- `$env:API_BASE='http://127.0.0.1:3000/api'; $env:PRELAUNCH_ALLOW_HTTP='true'; $env:SHOWCASE_ADMIN_USERNAME='admin'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'; $env:SHOWCASE_PASSWORD='Qiwai123456'; npm.cmd run prelaunch:online-showcase`：按预期失败，结论为 `NO-GO：暂不能开放真实微信支付，共 100 个阻塞项。保持 REAL_PAYMENT_ENABLED=false。`
- 通过项：多商户商城 smoke 结果 `deploy/mall-multi-merchant-smoke-result.json` 已标记通过，仍在有效期内；API 地址可访问；平台管理员登录成功；演示商家 `qiwai-showcase` 存在；前台当前可用支付方式为余额支付和线下收款。
- 阻塞项摘要：真实支付联调结果不是 `passed=true`；真实支付结果已超过 168 小时；微信 Native/H5/JSAPI 场景未通过；支付回调、重复回调、异常金额、退款请求、退款通知、退款查询、服务商账单、代理账户路由、商城支付/回调/退款/防串店、代理打款和回滚计划均缺证据；商城真实微信支付下单/回调路由尚未接入服务商；后台微信支付 readiness 为配置未就绪；微信支付回调和退款回调地址为空；缺少 `WECHAT_PAY_APP_ID`、`WECHAT_PAY_MCH_ID`、`WECHAT_PAY_API_V3_KEY`、`WECHAT_PAY_PRIVATE_KEY_PATH`、`WECHAT_PAY_CERT_SERIAL_NO`、`WECHAT_PAY_PLATFORM_CERT_PATH`、商城支付回调 URL 和退款回调 URL。

### 遗留问题

- 真实微信支付、支付宝支付、商城微信支付、店铺直收支付、真实退款、服务商账单、代理真实打款和回滚证据需要在具备真实商户号、证书、回调域名和预发环境后完成，当前本地环境无法自行补齐。
- 预发布门禁已经明确阻止真实支付放量；系统仍可继续使用余额支付、线下收款和本地/沙箱验收能力。

### 下一阶段应继续处理的事项

- 停止等待外部生产条件：真实商户/支付证书、HTTPS 回调域名、服务商账单样例、代理打款产品开通、预发小额支付/退款/打款证据和回滚记录补齐后，再重新执行 `npm run smoke:real-payment` 与 `npm run prelaunch:online-showcase`。

## 2026-06-20 - 上线外部条件门禁复核

### 阶段名称

上线运营检查清单 - 生产配置体检与线上演示预发布门禁复核。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/production-runbook.md`、`docs/local-acceptance-test-plan.md`、`docs/real-payment-integration-plan.md`、`docs/project-progress.md` 和 `DEVELOPMENT_LOG.md`，确认下一小阶段仍为上线门禁复核。
- 执行 `npm.cmd run doctor`，确认本地 API、H5、后台、MySQL 与生产配置基础项可运行。
- 使用线上演示临时验收环境变量执行 `npm.cmd run prelaunch:online-showcase`，复核真实微信支付、商城真实微信支付和多商户商城上线门禁。
- 未修改真实支付开关，未伪造 `deploy/real-payment-smoke-result.json`，继续保持 `REAL_PAYMENT_ENABLED=false`。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:02:10 +08:00。
- `npm.cmd run doctor`：通过。
- Doctor 本地服务结果：Node、npm、Docker CLI、Docker Compose、MySQL `127.0.0.1:13306`、API `3000`、API readiness、H5 `5173`、Admin `5174` 均为 `OK`。
- Doctor 生产配置结果：`NODE_ENV=production`、`APP_VERSION=0.1.0`、`BUILD_COMMIT=0080c7b`、生产域名字段、安全响应头、严格校验、访问日志、H5 短信模式、后台限流、真实支付挡板、多租户挡板、多商户挡板、备份目录和保留天数均为 `OK`。
- Doctor 保留警告：H5 短信登录需在后台确认服务商配置；SMS provider 缺少 `SMS_ACCESS_KEY_ID`、`SMS_ACCESS_KEY_SECRET`、`SMS_SIGN_NAME`、`SMS_TEMPLATE_ID`；Email provider 未启用；WeChat message provider 未启用；通知定时 worker 未启用。
- `$env:API_BASE='http://127.0.0.1:3000/api'; $env:PRELAUNCH_ALLOW_HTTP='true'; $env:SHOWCASE_ADMIN_USERNAME='admin'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'; $env:SHOWCASE_PASSWORD='Qiwai123456'; npm.cmd run prelaunch:online-showcase`：按预期失败，结论为 `NO-GO：暂不能开放真实微信支付，共 100 个阻塞项。保持 REAL_PAYMENT_ENABLED=false。`
- Prelaunch 通过项：多商户商城 smoke 已标记通过且仍在有效期内；API 地址可访问；平台管理员登录成功；演示商家存在；前台当前可用支付方式为余额支付和线下收款。
- Prelaunch 阻塞摘要：真实支付联调结果未 `passed=true` 且已超过 168 小时；微信 Native/H5/JSAPI、支付回调、重复回调、异常金额、退款请求、退款通知、退款查询、服务商账单、代理账户路由、商城支付/回调/退款/防串店、代理打款和回滚计划均缺少通过证据；缺少微信支付 AppID、商户号、API v3 key、私钥路径、证书序列号、平台证书、支付回调 URL 和退款回调 URL。

### 遗留问题

- 真实公网正式收费运营仍被外部条件阻塞：必须补齐真实商户/支付证书、HTTPS 回调域名、短信服务商凭证与模板、真实支付/退款/对账/代理打款预发证据、生产监控日志、备份对象存储或独立磁盘、正式管理员账号治理与默认账号处置。
- 当前本地代码和浏览器主流程已具备受控试运营能力，但不能擅自开放真实微信支付、商城微信支付、店铺直收支付或真实资金打款。

### 下一阶段应继续处理的事项

- 停止等待外部生产条件。部署/运营侧补齐真实服务商账号、证书、回调域名和预发证据后，再重新读取开发计划和开发记录，执行 `npm run smoke:real-payment`、`npm run prelaunch:online-showcase`，并在右侧浏览器复验生产主流程。

## 2026-06-20 - 上线前主预检复跑

### 阶段名称

上线运营检查清单 - `npm run preflight` 主预检复跑。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/production-runbook.md`、`docs/local-acceptance-test-plan.md`、`docs/real-payment-integration-plan.md`、`docs/project-progress.md` 和 `DEVELOPMENT_LOG.md`，确认本轮可执行的小阶段为上线前主预检复跑。
- 执行 `npm.cmd run preflight`，覆盖预检链路 guard、真实支付 guard、多商户商城 guard、多机构/SaaS guard、通知、发布标识、域名、订单自动关闭、安全、备份、迁移、Docker Compose、Nginx、健康检查、监控、回滚、巡检、构建产物、烟测、管理员账号/角色、操作审计、导出、上传、运营设置、财务对账和代理结算打款 guard。
- 未修改业务代码、真实支付开关或真实支付验收结果文件。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:04:24 +08:00。
- `npm.cmd run preflight`：通过。
- `npm run test:preflight-guards`：全部通过，确认主预检链路和各静态 guard 仍然覆盖上线门禁要求。
- `node scripts/preflight.mjs`：通过。
- 保留警告：`deploy/.env.production` 中 SMS 环境变量 `SMS_ACCESS_KEY_ID`、`SMS_ACCESS_KEY_SECRET`、`SMS_SIGN_NAME`、`SMS_TEMPLATE_ID` 未完整填写；仅当后台系统设置页已维护生产短信服务商凭证时才允许上线前放行。

### 遗留问题

- 主预检通过不等于真实公网收费运营可放行；真实微信/支付宝支付、商城微信支付、店铺直收支付、真实退款、服务商账单、代理真实打款仍缺少服务商账号、证书、回调域名和预发证据。
- 生产短信实发仍需部署/运营侧提供真实服务商凭证、签名、模板并完成实发验证。

### 下一阶段应继续处理的事项

- 当前计划内本地可执行的开发、自动化预检和浏览器主流程验收均已完成；继续停止等待外部生产条件补齐。补齐后重新执行真实支付 smoke、预发布门禁和右侧浏览器生产主流程验收。

## 2026-06-20 - 基础 smoke 复跑

### 阶段名称

上线运营检查清单 - `npm run smoke` 基础烟测复跑。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/production-runbook.md`、`docs/local-acceptance-test-plan.md`、`docs/real-payment-integration-plan.md`、`docs/project-progress.md` 和 `DEVELOPMENT_LOG.md`，选择上线清单中的 `npm run smoke` 作为本阶段。
- 执行基础 smoke，复核 API 健康、后台登录、审计日志、上传、活动、H5 验证码守卫、运营设置、财务看板、支付挡板、票种优惠码、mock 支付退款、会员积分、通知、活动复盘和导出。
- 保留 smoke 产生或复用的测试数据，未修改业务代码。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:06:28 +08:00。
- `npm.cmd run smoke`：通过，输出 `Smoke test passed.`
- 通过项摘要：`health`、管理员登录与登录审计、配置体检 warning、图片上传、结算凭证上传、管理员账号安全、角色权限、公告与分类管理、首页模块、活动详情增强、H5 验证码守卫与审计、分享海报追踪、后台/财务看板、运营设置、活动漏斗、微信/支付宝真实支付未开放挡板、票种/优惠码/mock 支付/退款/会员价、会员等级/积分/积分抵扣/专属活动/优先报名、通知服务商/模板/发送/失败重试/提醒计划、活动复盘和报名/订单/财务导出均通过。

### 遗留问题

- 基础 smoke 通过不代表真实公网收费运营可放行；真实短信实发、真实微信/支付宝支付、真实退款、服务商账单、商城真实微信支付、店铺直收支付和代理真实打款仍需要外部服务商配置与预发证据。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，进入上线清单中的 `npm run smoke:flow` 完整业务流烟测复跑；完成后再复核是否只剩真实生产外部条件。

## 2026-06-20 - 完整业务流 smoke 复跑

### 阶段名称

上线运营检查清单 - `npm run smoke:flow` 完整业务流烟测复跑。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md` 和 `DEVELOPMENT_LOG.md` 中关于 `smoke:flow`、业务闭环和真实支付门禁的内容后，选择完整业务流烟测作为本阶段。
- 执行完整业务流 smoke，复核免费活动审核、签到、评价、重复操作拦截，付费报名余额支付，过期待付款订单自动关闭释放名额，满员候补、用户标签、候补补位和取消报名链路。
- 保留 smoke 产生或复用的测试数据，未修改业务代码。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:07:28 +08:00。
- `npm.cmd run smoke:flow`：通过，输出 `Full business flow smoke test passed.`
- 通过项：
  - 免费活动流程：报名待审核 -> 后台审核通过 -> 签到 -> 评价 -> 重复操作拦截。
  - 付费活动流程：余额支付报名 -> 报名成功。
  - 过期订单流程：待付款订单 -> 自动关闭 -> 名额释放。
  - 候补和标签流程：满员活动 -> 候补 -> 用户标签 -> 候补补位 -> 取消。

### 遗留问题

- 完整业务流 smoke 通过；真实公网正式收费运营仍依赖外部真实生产条件，包括短信实发、真实支付证书/回调、真实退款/账单/代理打款证据和生产监控备份。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录，复核是否还有本地可执行的计划内小阶段；若只剩真实生产外部条件，则记录阻塞并停止等待补齐。

## 2026-06-20 - smoke 复跑后上线阻塞复核

### 阶段名称

上线运营检查清单 - 本地 smoke 复跑后真实生产外部条件复核。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/production-runbook.md`、`docs/real-payment-integration-plan.md` 和 `DEVELOPMENT_LOG.md`，复核 `smoke`、`smoke:flow`、`preflight`、多商户商城 smoke、浏览器主流程验收和真实支付门禁状态。
- 确认本地计划内可执行验证项已经完成并通过；剩余计划项集中在真实生产外部条件和服务商预发证据。
- 未修改业务代码、生产开关、真实支付结果文件或测试数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:08:19 +08:00。
- 本轮已完成并通过：`npm.cmd run preflight`、`npm.cmd run smoke`、`npm.cmd run smoke:flow`。
- 既有已通过记录：右侧浏览器 H5/后台多角色/商城主流程验收，多商户商城动态 smoke，数据库备份和独立库恢复演练。
- 既有门禁结论仍有效：`npm.cmd run prelaunch:online-showcase` 按预期 `NO-GO`，真实微信支付、商城微信支付、店铺直收支付、真实退款、服务商账单、代理真实打款和回滚计划缺少真实服务商证据。

### 遗留问题

- 真实公网正式收费运营仍被外部条件阻塞：真实 HTTPS 域名与反向代理、短信服务商凭证/签名/模板和实发验证、微信/支付宝商户号和证书、支付/退款/账单/代理打款预发证据、对象存储或独立备份磁盘、生产监控日志、正式管理员账号治理与默认账号处置。
- 这些事项不能在当前本地仓库中安全代填或伪造；未补齐前必须继续保持真实支付和真实资金打款相关开关关闭。

### 下一阶段应继续处理的事项

- 停止等待外部生产条件。补齐真实服务商配置、HTTPS 回调域名和预发证据后，再重新读取开发计划和开发记录，执行 `npm run smoke:real-payment`、`npm run prelaunch:online-showcase`，并在右侧浏览器复验生产主流程。

## 2026-06-20 - 数据库迁移状态复核

### 阶段名称

上线运营检查清单 - `npm --prefix apps/api run migration:show` 迁移状态复核。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/production-runbook.md`、`docs/real-payment-integration-plan.md`、`docs/local-acceptance-test-plan.md`、`docs/project-progress.md` 和 `DEVELOPMENT_LOG.md`，确认 `smoke:flow` 后仍可执行的计划内小阶段为数据库迁移状态检查。
- 执行 `npm.cmd --prefix apps/api run migration:show`，命令先完成 API 构建，再读取当前数据库迁移状态。
- 确认当前 93 个 migration 全部为 `[X]`，没有待执行迁移。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:10:24 +08:00。
- `npm.cmd --prefix apps/api run migration:show`：通过。
- `npm run build`（API 子项目构建，由 migration:show 内部触发）：通过。
- 迁移状态：93 个 migration 全部为 `[X]`，从 `NotificationDeliveryAndSchedules1780490000000` 到 `AddTenantRegionBoundaryPoints1781889100000` 均已执行。

### 遗留问题

- 本地数据库迁移状态正常；生产环境仍需在真实部署库备份后，由部署侧执行 `npm --prefix apps/api run migration:run` 并复核生产迁移状态。
- 真实公网正式收费运营仍受真实域名、短信、支付证书/回调、真实支付/退款/账单/代理打款证据、生产备份与监控等外部条件阻塞。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录；若要进入生产数据库备份、迁移运行或 Docker 发布阶段，需要真实部署环境和生产备份窗口。当前本地环境仅可继续做非生产破坏性的复核。

## 2026-06-20 - API 健康检查复核

### 阶段名称

上线运营检查清单 - `/api/health`、`/api/health/ready`、`/api/health/live` 和 `/api/health/metrics` 复核。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/production-runbook.md` 和 `DEVELOPMENT_LOG.md` 中健康检查相关条目后，选择 API 健康检查作为本阶段。
- 访问本地 API 健康检查、就绪检查、存活检查和 Prometheus 指标接口。
- 确认 API 与数据库均为 `up`，`ready=true`，指标包含上线清单要求的关键项。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:11:22 +08:00。
- `GET http://127.0.0.1:3000/api/health`：通过，`api=up`、`database=up`、`config=warning`、`release.version=0.1.0`、`release.commit=local`。
- `GET http://127.0.0.1:3000/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`、`config=warning`。
- `GET http://127.0.0.1:3000/api/health/live`：通过，`api=up`。
- `GET http://127.0.0.1:3000/api/health/metrics`：通过，包含 `activity_api_up 1`、`activity_database_up 1`、`activity_config_error 0`、`activity_process_uptime_seconds` 和 `activity_build_info{version="0.1.0",commit="local"} 1`。

### 遗留问题

- `config=warning` 与前序记录一致，属于真实生产外部配置仍需确认：生产短信服务商、真实支付证书/回调、真实支付/退款/账单/代理打款证据等。
- 当前健康检查基于本地开发服务，生产部署后仍需在真实域名和反向代理路径上重复检查。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录；若没有新的本地可执行计划内验证项，则停止等待真实生产环境、真实域名和服务商配置补齐。

## 2026-06-20 - H5 与后台入口可访问复核

### 阶段名称

上线运营检查清单 - H5 首页和后台入口 HTTP 可访问性复核。

### 本阶段完成内容

- 重新读取 `docs/launch-checklist.md`、`docs/local-acceptance-test-plan.md` 和 `DEVELOPMENT_LOG.md` 中 H5 首页、后台登录页和本地访问地址相关条目后，选择前端入口可访问复核作为本阶段。
- 访问本地 H5 首页和后台入口，确认开发服务仍可响应页面入口。
- 未创建新业务数据，未修改业务代码。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-20 14:12:42 +08:00。
- `GET http://127.0.0.1:5173/`：通过，HTTP `200`，返回 HTML 内容，长度 `608`。
- `GET http://127.0.0.1:5174/admin/login`：通过，HTTP `200`，返回 Vite 开发服务应用壳。
- `GET http://127.0.0.1:5174/admin`：通过，HTTP `200`，返回 Vite 开发服务应用壳，包含 `#app` 和 `/src/main.ts` 加载入口。
- `GET http://127.0.0.1:5174/login`：通过，HTTP `200`，返回同一后台应用壳。

### 遗留问题

- 本阶段仅验证本地开发入口 HTTP 可访问；右侧浏览器完整主流程和多角色验收已有通过记录。
- 生产域名、HTTPS、反向代理缓存策略和真实公网访问仍需在生产部署环境复核。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录；若没有新的本地可执行计划内验证项，则停止等待真实生产环境和外部服务商条件补齐。
## 2026-06-21 - 后台上线资料持久化与支付 readiness 接入

### 阶段名称

后台支付资料上传与验收流程 - 上线资料持久化、配置体检与商城支付 readiness 接入。

### 本阶段完成内容

- 重新读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md`、`docs/production-runbook.md` 和 `DEVELOPMENT_LOG.md`，确认本阶段仍属于计划内真实支付/上线体检/生产配置闭环。
- 新增 `operation_settings.launchConfig` JSON 配置，用于平台后台保存真实 HTTPS 域名、短信服务商、微信/支付宝商户资料、证书路径、回调 URL、真实支付与多商户商城预发验收状态等上线资料。
- 后台“系统设置 / 部署配置”改为可保存到后台并可刷新回显，同时继续生成 `.env.production` 作为部署兜底。
- 后台部署配置新增商城微信平台代收回调、退款回调、店铺直收回调模板、店铺直收退款模板字段。
- API 上线体检 `/admin/system/config-check` 改为优先读取后台保存的 `launchConfig`，无后台值时继续使用环境变量兜底。
- 商城微信支付 readiness 改为优先读取后台保存的上线配置，覆盖真实支付开关、微信商户字段、证书路径、商城回调 URL、店铺直收回调模板、预发验收开关等检查来源。
- 未伪造或修改 `deploy/real-payment-smoke-result.json`，真实支付、商城微信支付、店铺直收、退款、账单和代理打款仍受预发证据门禁保护。

### 修改/新增的主要文件

- `apps/api/src/shared/launch-config.ts`
- `apps/api/src/entities/operation-setting.entity.ts`
- `apps/api/src/migrations/1781960000000-OperationSettingLaunchConfig.ts`
- `apps/api/src/modules/admin/dto.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/mall/mall.service.ts`
- `apps/admin/src/views/SystemSettings.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 15:54:44 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留 Vite/Rollup 既有第三方注释和 chunk size 警告。
- `npm.cmd run test:preflight-guards`：通过，确认上线门禁、真实支付、多商户商城、环境变量同步、Docker Compose、Nginx、健康检查、smoke、运营设置、财务对账和代理结算打款 guard 未被破坏。
- `npm.cmd --prefix apps/api run migration:run`：未完成。命令内 API 构建通过，但当前本机数据库 `127.0.0.1:13306` 连接被拒绝；Docker Desktop 引擎未运行，且本机未找到 `mysqld`/`mariadbd`/`mysql` 可执行文件，无法在本阶段实际执行新增列迁移。

### 遗留问题

- 本地数据库服务未启动，`operation_settings.launchConfig` 迁移尚未实际写入当前本地库；启动 Docker Desktop 后执行 `npm.cmd --prefix apps/api run migration:run` 即可补齐。
- 后台保存的上线资料已经能参与配置体检和商城支付 readiness，但真实支付执行链路的资金请求仍需继续保留现有实现/预发证据门禁；不能仅凭后台填资料就打开真实资金流量。
- 真实 HTTPS 域名、短信签名模板、商户号、证书文件、回调 URL 和真实预发验收数据仍需由运营/部署侧在后台填入真实值并完成小额预发验证。

### 下一阶段应继续处理的事项

- 启动本地数据库或 Docker Desktop 后执行 `npm.cmd --prefix apps/api run migration:run`，并在后台“部署配置”保存一组测试上线资料，确认刷新后可回显、配置体检会读取后台值。
- 继续推进“后台支付资料上传与验收流程”的下一小阶段：把真实支付执行层的平台级 runtime config 也接入 `launchConfig`，让真实下单/回调/退款 adapter 在通过门禁后可直接读取后台保存的商户资料。

## 2026-06-21 - 真实支付执行层读取后台平台配置

### 阶段名称

后台支付资料上传与验收流程 - `PaymentProviderService` 平台级 runtime config 接入后台 `launchConfig`。

### 本阶段完成内容

- 重新读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md` 和 `DEVELOPMENT_LOG.md`，确认本阶段属于真实支付执行层与后台资料闭环。
- `PaymentProviderService` 注入 `OperationSetting` 仓储，平台级真实支付 runtime config 会从 `operation_settings.launchConfig` 转换为服务商 adapter 所需的环境变量键值；代理/店铺直收仍优先使用各自支付账户配置。
- `createPayment`、真实支付回调、退款通知、退款请求/查询、账单拉取等真实 provider 入口改为异步读取后台真实支付总开关和渠道开关。
- 公开端活动支付和商城支付入口改为使用 async `usesRealProvider` / `canCreatePayment`，避免后台已保存真实支付开关和商户资料时仍只按 `.env` 判断。
- 保留 DTO 形式真实回调解析的旧保护：显式环境变量真实支付开启时，仍拒绝非 raw payload 回调，避免误把真实服务商回调当沙箱 DTO 处理。

### 修改/新增的主要文件

- `apps/api/src/modules/public/payment-provider.service.ts`
- `apps/api/src/modules/public/payment-provider.service.spec.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/api/src/modules/mall/mall.service.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 16:00:45 +08:00。
- `npm.cmd --prefix apps/api run test -- payment-provider.service.spec.ts`：通过，72 tests passed。
- `npm.cmd --prefix apps/api run build`：通过。

### 遗留问题

- 本地数据库服务仍未启动，上一阶段新增的 `operation_settings.launchConfig` 迁移尚未实际执行；因此本轮只能完成代码级验证，暂不能在右侧浏览器保存/回显后台上线资料。
- 真实支付资金流量仍必须等待后台真实资料、证书文件、HTTPS 回调、真实服务商预发数据和 `deploy/real-payment-smoke-result.json` 新鲜通过证据；本阶段没有放开这些门禁。

### 下一阶段应继续处理的事项

- 启动本地数据库或 Docker Desktop 后执行迁移，并用后台“部署配置”保存测试资料验证：配置体检、商城 payment-readiness、真实支付 adapter runtime config 三处读取结果一致。
- 在数据库可用后继续右侧浏览器验证平台管理员保存部署配置、刷新回显、商城支付 readiness 变化和不满足预发证据时的阻断提示。

## 2026-06-21 - 上线文档同步后台配置口径

### 阶段名称

后台支付资料上传与验收流程 - 文档同步“后台配置优先、环境变量兜底”口径。

### 本阶段完成内容

- 重新读取 `docs/real-payment-integration-plan.md`、`docs/launch-checklist.md`、`docs/production-runbook.md` 和 `DEVELOPMENT_LOG.md`，确认本阶段属于上线配置与真实支付资料闭环。
- 更新真实支付接入计划，明确平台级真实支付资料优先在后台“系统设置 / 部署配置”维护，保存到 `operation_settings.launchConfig` 后参与上线体检、商城支付 readiness 和平台级真实支付 adapter runtime config；`.env.production` 继续作为首次部署引导和兜底。
- 在真实支付文档中补充商城平台代收支付/退款回调和店铺直收支付/退款回调模板字段。
- 更新上线检查清单，明确真实域名、短信服务商、微信/支付宝商户资料、证书路径、回调 URL、真实支付和多商户商城预发状态优先在后台维护。
- 更新生产 Runbook，明确域名、短信、支付商户资料、证书路径、回调 URL 和预发状态的后台维护流程，避免下次继续时误判为只能通过 `.env` 或外部部署补齐。

### 修改/新增的主要文件

- `docs/real-payment-integration-plan.md`
- `docs/launch-checklist.md`
- `docs/production-runbook.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 16:02:30 +08:00。
- `npm.cmd run test:preflight-guards`：通过，确认文档同步后上线门禁、真实支付、多商户商城、运营设置、财务对账和部署相关 guard 仍通过。

### 遗留问题

- 本地数据库仍未启动，不能进行后台保存上线资料的浏览器交互验收。
- 真实支付生产放量仍依赖真实服务商资料、证书文件、HTTPS 回调和 `deploy/real-payment-smoke-result.json` 预发证据；后台可维护资料不等于已通过真实资金验收。

### 下一阶段应继续处理的事项

- 启动本地数据库或 Docker Desktop 后，先执行 `npm.cmd --prefix apps/api run migration:run`。
- 随后在右侧浏览器用平台管理员进入“系统设置 / 部署配置”，保存测试上线资料并刷新验证回显，再检查“配置体检”和商城支付 readiness 是否使用后台值。

## 2026-06-21 - 后台上线资料保存与 readiness HTTP 验证

### 阶段名称

后台支付资料上传与验收流程 - 本地迁移、Docker API 重建和后台配置保存验证。

### 本阶段完成内容

- 重新尝试排查本地数据库阻塞，启动 Docker Desktop 后恢复 `activity-mysql`、`activity-api` 和 `activity-nginx`。
- 执行本地数据库迁移，补齐从既有待执行 migration 到 `OperationSettingLaunchConfig1781960000000` 的全部迁移，`operation_settings.launchConfig` 已写入本地库。
- 使用当前代码重建 Docker API，并等待容器健康。
- 通过真实 HTTP 调用后台登录、读取运营设置、保留原运营配置并写入一组测试 `launchConfig`。
- 验证刷新读取后 `launchConfig.apiOrigin`、`wechatPayNotifyUrl`、`mallWechatPayNotifyUrl` 和 `realPaymentEnabled=false` 均按测试资料回显。
- 验证 `/admin/system/config-check` 已读取后台保存的 HTTPS 域名，验证 `/admin/mall/payment-readiness` 已读取后台保存的商城微信支付/退款回调 URL。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 16:10:22 +08:00。
- `docker compose -p activity-registration up -d --build api nginx`：通过，API 镜像已按当前代码重建，`activity-api` healthy。
- `npm.cmd --prefix apps/api run migration:run`：通过，执行 93 个待迁移 migration，并成功执行 `OperationSettingLaunchConfig1781960000000`。
- `POST http://127.0.0.1:3000/api/admin/auth/login`：通过，使用本地 `admin / Admin123456` 获取平台超级管理员 token。
- `POST http://127.0.0.1:3000/api/admin/settings/operation`：通过，保存测试上线资料并保留现有运营设置。
- `GET http://127.0.0.1:3000/api/admin/settings/operation`：通过，回显 `apiOrigin=https://api.test-qiwai.example`、`wechatPayNotifyUrl=https://api.test-qiwai.example/payment/wechat/callback`、`mallWechatPayNotifyUrl=https://api.test-qiwai.example/payment/mall/wechat/callback`、`realPaymentEnabled=false`。
- `GET http://127.0.0.1:3000/api/admin/system/config-check`：通过，`PUBLIC_API_ORIGIN=https://api.test-qiwai.example`、`PUBLIC_H5_ORIGIN=https://h5.test-qiwai.example`，短信检查状态 `ok`。
- `GET http://127.0.0.1:3000/api/admin/mall/payment-readiness`：通过，`status=disabled`、`collectionMode=platform_collect`、`realPaymentEnabled=false`、`wechatEnabled=false`，但已读取后台配置的 `notifyUrl=https://api.test-qiwai.example/payment/mall/wechat/callback` 和 `refundNotifyUrl=https://api.test-qiwai.example/payment/mall/wechat/refund-callback`。
- 右侧浏览器控制：未完成。`node_repl` 浏览器控制工具连续返回 `codex/sandbox-state-meta: missing field sandboxPolicy`，无法接管 in-app browser；本阶段改用真实 HTTP 验证替代。

### 遗留问题

- 右侧浏览器可视化验证尚未完成，原因是当前浏览器控制工具不可用；待工具恢复后需要打开 `http://127.0.0.1:18080/admin/` 或当前部署入口补做 UI 交互验收。
- 本阶段保存的是测试上线资料，真实生产上线前仍需在后台替换为真实 HTTPS 域名、短信服务商、商户号、密钥、证书路径、回调 URL 和预发验收数据。
- 当前 readiness 按预期仍阻断真实支付：微信支付未开启，测试证书路径不可读取，`REAL_PAYMENT_ENABLED=false`。不能据此放开真实资金流量。

### 下一阶段应继续处理的事项

- 浏览器控制恢复后，在右侧浏览器执行平台管理员 UI 验证：进入系统设置、部署配置，确认测试资料回显；修改一个无资金风险字段保存，刷新后确认仍在。
- 若要进入真实预发验收，先在后台替换真实资料并上传/挂载证书文件，再执行 `npm run smoke:real-payment` 和 `npm run prelaunch:online-showcase`。

## 2026-06-21 - 公益与招募 v2 基础闭环

### 阶段名称

公益与招募 v2 - 公益可信公示、统一招募漏斗和志愿任务体系第一版。

### 本阶段完成内容

- 重新读取开发计划和 `DEVELOPMENT_LOG.md`，确认本阶段属于“公益池 / 文化大使招募 / 城市合伙人运营”计划范围内的运营增长闭环。
- 新增公益项目执行动态表，公益项目支持“待验收”状态，拨付记录支持公开展示和凭证 URL；后台公益页可发布执行动态、查看拨付凭证，公开公益页可展示项目动态和拨付记录。
- 招募线索漏斗扩展为：待跟进、已联系、已初筛、待面谈、通过、已激活、拒绝；新增线索跟进记录，避免只覆盖备注；新增城市资源、社群能力、内容能力、公益意愿、交付稳定性评分。
- 新增志愿者档案、志愿任务、任务报名和服务记录数据结构；公开端可提交志愿者申请、查看开放任务、报名任务；后台可创建任务、审核报名、登记服务时长并自动累计成长等级。
- 志愿者申请同步进入原“公益与招募线索池”，来源为 `volunteer_apply`，保持院长、大使、帮扶、志愿者在同一后台漏斗中运营。
- 新增移动端“志愿服务”页面，并在公益公示页增加志愿服务入口；保持合规口径为“公益金 / 公益贡献 / 帮扶名额 / 项目公示 / 志愿服务”，未新增公开募捐能力。
- 执行本地数据库迁移并重建 Docker API，新增表和字段已写入本地库。

### 修改/新增的主要文件

- `apps/api/src/entities/charity-project-update.entity.ts`
- `apps/api/src/entities/ambassador-application-followup.entity.ts`
- `apps/api/src/entities/volunteer-profile.entity.ts`
- `apps/api/src/entities/volunteer-task.entity.ts`
- `apps/api/src/entities/volunteer-task-application.entity.ts`
- `apps/api/src/entities/volunteer-service-record.entity.ts`
- `apps/api/src/migrations/1781970000000-CharityRecruitmentV2.ts`
- `apps/api/src/modules/charity-fund.service.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/public/public.controller.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/admin/src/views/Charity.vue`
- `apps/admin/src/views/Ambassador.vue`
- `apps/mobile/src/pages/charity/index.vue`
- `apps/mobile/src/pages/volunteer/index.vue`
- `apps/mobile/src/pages.json`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 17:15 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 Rollup 注释和 chunk size 警告。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd --prefix apps/api run migration:run`：通过，执行 `CharityRecruitmentV21781970000000`，新增公益动态、线索跟进、志愿档案、志愿任务、任务报名和服务记录相关表。
- `docker compose -p activity-registration up -d --build api nginx`：通过，`activity-api` healthy。
- `npm.cmd run test:preflight-guards`：通过。
- 真实 HTTP 验证通过：
  - `GET /api/public/volunteer/tasks`：通过。
  - `POST /api/admin/volunteer/tasks`：创建测试任务 `测试公益志愿任务`，返回 id `1`，公开端可读取。
  - `POST /api/admin/charity/projects`：创建测试项目 `测试公益公示项目`，返回 id `1`。
  - `POST /api/admin/charity/projects/1/updates`：创建执行动态 `测试执行动态`，返回 id `1`。
  - `GET /api/public/charity/projects`：可读取测试项目和 1 条公开执行动态。
  - `POST /api/public/volunteer/apply`：创建测试志愿者 `测试志愿者 / 13990008881`，返回志愿档案 id `1`、线索 id `1`。
  - `POST /api/public/volunteer/tasks/1/apply`：测试志愿者报名任务成功，返回任务报名 id `1`。
  - `GET /api/admin/ambassador/applications?source=volunteer_apply`：可在后台线索池查到该志愿者线索。
  - `GET /api/admin/volunteer/task-applications`：可在后台查到该任务报名。

### 浏览器验收结果

- 验证时间：2026-06-21 17:15 +08:00。
- 验证环境：本地 Docker API `http://127.0.0.1:3000/api`，后台/H5 构建产物已通过构建验证。
- 右侧浏览器验证：未完成。浏览器控制工具仍返回 `codex/sandbox-state-meta: missing field sandboxPolicy`，无法接管 in-app browser；本阶段用真实 HTTP 调用和构建验证替代。
- 输入的测试数据摘要：公益项目 `测试公益公示项目`，执行动态 `测试执行动态`，志愿任务 `测试公益志愿任务`，志愿者 `测试志愿者 / 13990008881`。
- 通过项：页面相关构建通过；数据库迁移通过；后台志愿任务创建、公益项目动态创建、公开公益公示读取、公开志愿者申请、公开任务报名、后台线索和任务报名查询均通过。
- 发现的问题：右侧浏览器控制工具不可用，暂不能完成可视化点击验收；运行中的 API 需要重建后才有新路由，已通过 Docker 重建修复。
- 是否达到可上线运营标准：本地/预发代码链路达到可继续验收状态；正式上线仍需补做右侧浏览器可视化验收，并继续遵守真实支付、HTTPS、短信和生产运维门禁。

### 遗留问题

- 右侧浏览器可视化验收尚未完成，待浏览器控制工具恢复后需要打开后台“公益池”“公益与招募线索”和 H5“公益池 / 志愿服务”页面逐项点击验证。
- 志愿服务第一版已跑通任务、报名、审核和服务记录，但还没有独立证书模板、证明文件上传组件和志愿者列表专页；当前先在招募后台页内管理。
- 拨付凭证和服务证明当前使用 URL 字段，后续可接入现有上传组件，减少运营手填 URL。

### 下一阶段应继续处理的事项

- 浏览器控制恢复后补做 UI 验收：后台创建公益动态、创建志愿任务、更新线索跟进、登记志愿服务；H5 查看公益动态、提交志愿者申请、报名任务、登录后查看我的志愿服务。
- 根据运营需要继续完善志愿者列表、证书/证明上传、志愿服务导出和招募漏斗统计看板。

## 2026-06-21 - 志愿者档案后台专页

### 阶段名称

公益与招募 v2 - 志愿者档案与服务记录后台管理小阶段。

### 本阶段完成内容

- 重新读取开发计划与 `DEVELOPMENT_LOG.md`，确认本阶段延续“公益与招募 v2”中志愿者列表、证明/服务记录、导出能力的计划内方向。
- 后台新增志愿者档案集中页 `/admin/volunteers`，放入“平台端 · 公益与招募 / 志愿者档案”菜单。
- 后台页面支持查看志愿者档案、按姓名/手机/城市/状态/等级筛选、修改审核状态、修改成长等级、维护内部备注。
- 后台页面支持查看服务记录，按姓名/手机/任务/城市/时间筛选，查看证明 URL。
- 后台页面支持查看任务报名，更新报名状态，并从报名直接登记服务记录、服务时长、证明 URL 与完成说明。
- 后端新增志愿者档案查询、档案状态更新、志愿者档案导出、服务记录查询、服务记录导出接口。
- 保留既有招募页的志愿任务 Tab，不拆除原有操作入口；新增页面作为日常运营集中台。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/dto.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/admin/src/views/Volunteers.vue`
- `apps/admin/src/router.ts`
- `apps/admin/src/views/Layout.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 17:22:40 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释与大 chunk 提醒。
- `npm.cmd run test:preflight-guards`：通过。
- `docker compose -p activity-registration up -d --build api nginx`：通过，`activity-api` healthy。
- `GET http://127.0.0.1:3000/api/health/ready`：通过，`ready=true`、`database=up`。
- `GET http://127.0.0.1:5174/admin/volunteers`：通过，后台 dev server 已启动并返回 200。
- 真实 HTTP 验证通过：
  - `POST /api/admin/volunteer/tasks`：创建测试任务 `测试志愿档案页任务172240`，返回 id `2`。
  - `POST /api/public/volunteer/tasks/2/apply`：创建测试任务报名，手机号 `13991172240`，返回后可在后台查询。
  - `PATCH /api/admin/volunteer/task-applications/2`：报名状态更新为 `approved`。
  - `POST /api/admin/volunteer/service-records`：登记服务记录 `档案页验证服务`，返回 id `1`。
  - `GET /api/admin/volunteer/profiles?keyword=13991172240`：可查到志愿者档案 id `2`。
  - `PATCH /api/admin/volunteer/profiles/2`：档案状态更新为 `approved`，等级更新为 `volunteer`。
  - `GET /api/admin/volunteer/service-records?keyword=13991172240`：可查到 1 条服务记录。
  - `GET /api/admin/volunteer/profiles/export?keyword=13991172240`：导出 Excel 成功，文件大小 7080 bytes。
  - `GET /api/admin/volunteer/service-records/export?keyword=13991172240`：导出 Excel 成功，文件大小 6980 bytes。

### 浏览器验收结果

- 验证时间：2026-06-21 17:22:40 +08:00。
- 验证环境：本地 Docker API `http://127.0.0.1:3000/api`，后台 dev server `http://127.0.0.1:5174/admin/volunteers`。
- 浏览器可视化验证：未完成。右侧浏览器控制仍返回 `codex/sandbox-state-meta: missing field sandboxPolicy`，无法接管 in-app browser 逐项点击。
- 已替代验证：后台 dev server 页面入口返回 200；后台构建通过；真实 HTTP 已验证新页面依赖的档案、报名、服务记录和导出接口。
- 输入的测试数据摘要：志愿任务 `测试志愿档案页任务172240`，任务报名 `档案页测试志愿者 / 13991172240`，服务记录 `档案页验证服务 / 1.5 小时 / https://example.com/proof.jpg`。
- 通过项：后台入口可访问，后端新增接口可用，档案更新、服务记录登记、列表查询和 Excel 导出均通过。
- 发现的问题：右侧浏览器控制工具仍不可用，不能完成真实点击级 UI 验收；当前只完成构建、入口和 HTTP 行为验证。
- 是否达到可上线运营标准：本阶段达到可运行、可测试、可继续开发状态；正式上线前仍需在浏览器控制恢复后补做后台志愿者档案页可视化点击验收。

### 遗留问题

- 右侧浏览器点击验收仍受工具问题阻塞，需后续恢复后补验 `/admin/volunteers` 页面筛选、状态更新、登记服务记录和导出按钮。
- 证明材料当前仍使用 URL 字段，尚未接入上传组件；这是下一步“证明上传”小阶段的自然延伸。
- 志愿者成长证书模板、证书下载和招募漏斗统计看板尚未实现。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，按“公益与招募 v2”剩余计划选择下一个小阶段：优先补齐志愿服务证明上传组件，或实现招募漏斗统计看板。
- 浏览器控制恢复后先补做本阶段 UI 验收，再进入最终主流程验收。

## 2026-06-21 - 志愿服务证明上传组件

### 阶段名称

公益与招募 v2 - 志愿服务记录证明材料上传小阶段。

### 本阶段完成内容

- 重新读取 `DEVELOPMENT_LOG.md` 和计划锚点，确认本阶段属于“证明上传组件”计划内小阶段。
- 复用既有后台凭证上传接口 `/admin/uploads/settlement-proofs`，没有新增存储目录、表结构或外部依赖。
- 在后台 `/admin/volunteers` 的“登记服务”弹窗中，把“证明 URL”升级为“证明材料”，支持运营上传 JPG、PNG、WebP、GIF 或 PDF。
- 上传成功后自动把返回 URL 写入服务记录 `proofUrl`，并保留手工填写外部链接的能力。
- 已登记服务记录列表继续支持“查看证明”，导出服务记录时继续包含证明材料 URL。

### 修改/新增的主要文件

- `apps/admin/src/views/Volunteers.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 17:25:48 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释与大 chunk 提醒。
- `POST /api/admin/uploads/settlement-proofs`：第一次 PowerShell `Invoke-RestMethod -Form` 未正确传入文件，返回“请上传打款凭证文件”；改用 `curl.exe -F "file=@...;type=application/pdf"` 后通过。
- 上传验证返回：
  - `url=http://localhost:18080/uploads/settlement-proofs/1782033936227-ec010b51fab59.pdf`
  - `path=/uploads/settlement-proofs/1782033936227-ec010b51fab59.pdf`
- `POST /api/admin/volunteer/service-records`：使用上传返回 URL 登记服务记录 `证明上传验证服务` 成功，返回服务记录 id `2`，`proofUrl` 与上传 URL 一致。

### 浏览器验收结果

- 验证时间：2026-06-21 17:25:48 +08:00。
- 验证环境：本地 Docker API `http://127.0.0.1:3000/api`，后台 dev server `http://127.0.0.1:5174/admin/volunteers`。
- 浏览器可视化验证：未完成。右侧浏览器控制仍返回 `codex/sandbox-state-meta: missing field sandboxPolicy`，无法接管 in-app browser 选择文件并点击上传。
- 已替代验证：后台构建通过；上传接口真实 multipart 验证通过；服务记录登记真实 HTTP 验证通过。
- 输入的测试数据摘要：临时 PDF `volunteer-proof-test.pdf`，服务记录 `证明上传验证服务 / 0.5 小时 / http://localhost:18080/uploads/settlement-proofs/1782033936227-ec010b51fab59.pdf`。
- 通过项：上传接口、上传 URL 回填链路、服务记录 proofUrl 保存链路均通过。
- 发现的问题：当前 UI 选择文件上传仍需浏览器控制恢复后补点；上传接口错误提示沿用“打款凭证”文案，功能可用但用于志愿服务时文案不够贴合。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；正式上线前建议补做浏览器上传点击验收，并后续将通用凭证上传提示文案泛化。

### 遗留问题

- 浏览器上传交互未能点击验收。
- 上传接口仍复用结算凭证文案，后续可增加通用“证明材料上传”接口或调整提示文案。
- 公益项目拨付凭证和执行动态凭证仍是 URL 输入，尚未接入上传按钮。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，按“公益与招募 v2”剩余计划选择下一个小阶段：招募漏斗统计看板，或公益项目拨付/执行动态凭证上传。
- 浏览器控制恢复后补做 `/admin/volunteers` 选择文件、上传、保存服务记录、刷新查看证明的 UI 验收。

## 2026-06-21 - 招募漏斗统计看板

### 阶段名称

公益与招募 v2 - 招募线索漏斗统计看板小阶段。

### 本阶段完成内容

- 重新读取开发计划和 `DEVELOPMENT_LOG.md`，确认本阶段属于“招募漏斗统计看板”计划内小阶段。
- 在后台 `/admin/ambassador` 的“申请线索”Tab 增加轻量统计看板。
- 看板展示当前筛选结果下的线索总数、待跟进数、高意向数、已激活数和平均评分。
- 增加状态分布和来源分布进度条，覆盖待跟进、已联系、已初筛、待面谈、通过、已激活、拒绝，以及院长招募、文化大使、个人帮扶、项目帮扶、志愿者、品牌咨询等来源。
- 本阶段直接复用已有线索列表接口和前端已加载数据，没有新增数据库结构或后端统计接口。

### 修改/新增的主要文件

- `apps/admin/src/views/Ambassador.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 17:28:25 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释与大 chunk 提醒。
- `GET /api/admin/ambassador/applications`：通过，当前本地测试库返回线索总数 `1`、待跟进 `1`、志愿者来源 `1`、高意向 `0`，可支撑看板统计。

### 浏览器验收结果

- 验证时间：2026-06-21 17:28:25 +08:00。
- 验证环境：本地 Docker API `http://127.0.0.1:3000/api`，后台 dev server `http://127.0.0.1:5174/admin/ambassador`。
- 浏览器可视化验证：未完成。右侧浏览器控制仍返回 `codex/sandbox-state-meta: missing field sandboxPolicy`，无法接管 in-app browser 查看看板布局。
- 已替代验证：后台构建通过；线索接口真实 HTTP 验证通过；看板基于现有 `applications` 前端数据计算，不依赖额外接口。
- 输入的测试数据摘要：沿用当前测试志愿者线索 `测试志愿者 / 13990008881`。
- 通过项：看板模板构建通过，线索数据接口可用，统计字段来源完整。
- 发现的问题：未能进行右侧浏览器布局验收；当前看板为前端轻量统计，若线索超过接口 `take(500)`，需要后续升级为后端分页/聚合统计。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；正式运营前建议在真实数据量下评估是否需要后端聚合接口。

### 遗留问题

- 浏览器可视化验收未完成。
- 看板基于当前筛选后的前端列表统计，未覆盖超大线索量的全量聚合。
- 公益项目拨付凭证和执行动态凭证仍是 URL 输入，尚未接入上传按钮。
- 志愿者成长证书模板、证书下载仍未实现。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，按“公益与招募 v2”剩余计划选择下一个小阶段：公益项目拨付/执行动态凭证上传，或志愿者成长证书模板。
- 浏览器控制恢复后补做 `/admin/ambassador` 申请线索 Tab 的看板布局、筛选联动和进度条展示验收。

## 2026-06-21 - 公益项目凭证上传

### 阶段名称

公益与招募 v2 - 公益项目执行动态与拨付凭证上传小阶段。

### 本阶段完成内容

- 重新读取开发计划和 `DEVELOPMENT_LOG.md`，确认本阶段属于“公益项目拨付/执行动态凭证上传”计划内小阶段。
- 后台 `/admin/charity` 执行动态表单新增“执行凭证”上传按钮，复用 `/admin/uploads/images`，支持 JPG、PNG、WebP、GIF，上传成功后自动写入 `proofUrl`。
- 公益拨付从连续 prompt 改为结构化弹窗，显示当前公益池可用金额，支持填写金额、说明、公开状态和拨付凭证。
- 拨付凭证上传复用 `/admin/uploads/settlement-proofs`，支持图片/PDF，上传成功后自动写入 `proofUrl`。
- 保留手工填写外部凭证 URL 的能力，方便运营补录历史凭证或外部文件地址。

### 修改/新增的主要文件

- `apps/admin/src/views/Charity.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-21 17:33:26 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释与大 chunk 提醒。
- `npm.cmd run test:preflight-guards`：通过。
- `POST /api/admin/charity/projects/1/updates`：使用上传凭证 URL 创建执行动态 `公益凭证上传验证动态` 成功，返回 id `2`。
- `GET /api/admin/charity/projects/1/updates`：可读取执行动态 id `2`，`proofUrl=http://localhost:18080/uploads/settlement-proofs/1782033936227-ec010b51fab59.pdf`。
- `POST /api/admin/charity/projects/1/disbursements`：按业务规则被拒绝，返回“公益池可用金额不足”；当前 `GET /api/admin/charity/summary` 显示 `availableAmount=0.00`、`totalAccrued=0.00`，因此不能伪造拨付成功。

### 浏览器验收结果

- 验证时间：2026-06-21 17:33:26 +08:00。
- 验证环境：本地 Docker API `http://127.0.0.1:3000/api`，后台 dev server `http://127.0.0.1:5174/admin/charity`。
- 浏览器可视化验证：未完成。右侧浏览器控制仍返回 `codex/sandbox-state-meta: missing field sandboxPolicy`，无法接管 in-app browser 点击上传和弹窗。
- 已替代验证：后台构建通过；执行动态 proofUrl 真实 HTTP 保存/读取通过；拨付接口资金余额挡板生效。
- 输入的测试数据摘要：执行动态 `公益凭证上传验证动态`，凭证 URL `http://localhost:18080/uploads/settlement-proofs/1782033936227-ec010b51fab59.pdf`。
- 通过项：执行动态凭证保存可用；拨付弹窗和上传按钮构建通过；公益池余额不足时拒绝拨付符合业务规则。
- 发现的问题：拨付保存未能完成正向验证，原因是当前本地公益池余额为 0；需要先通过订单计提或计划内人工入池能力产生可用公益金后再复验。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；正式运营前需在有公益池余额的数据环境下补做拨付凭证保存与前台公示验收。

### 遗留问题

- 浏览器上传交互未能点击验收。
- 当前没有计划内“人工增加公益池余额”后台入口，拨付正向保存需等待真实订单计提产生公益金或后续确认新增计划。
- 志愿者成长证书模板、证书下载仍未实现。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，按“公益与招募 v2”剩余计划选择下一个小阶段：志愿者成长证书模板/证书下载；如需人工公益金入池，请先确认是否纳入开发计划。
- 浏览器控制恢复后补做 `/admin/charity` 执行动态凭证上传、拨付弹窗、查看凭证和公开展示 UI 验收。
