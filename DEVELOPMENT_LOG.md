# DEVELOPMENT LOG

本文件记录无人值守持续开发模式下，每个小阶段的实施、验证和遗留事项。

## 2026-06-24 - 小程序头像昵称填写能力修正

### 阶段名称

小程序上线准备 - 改用微信头像昵称填写组件小阶段。

### 本阶段完成内容

- 根据开发者工具截图复查：当前小程序已经能用 `wx.login` 取得微信登录态，但仍显示默认 `微信用户` 和默认头像，说明后端 openid 登录链路已通，问题在头像昵称获取方式。
- 重新梳理微信小程序能力边界：`wx.login` 不返回昵称头像；`getUserProfile` 不能作为新版本小程序获取头像昵称的主链路依赖。
- 将“我的”页的“同步微信头像昵称”直接授权按钮改为“完善微信资料”，点击进入“编辑资料”页。
- “账号资料”页改用微信推荐的头像昵称填写能力：
  - `button open-type="chooseAvatar"` 获取用户主动选择的微信头像临时文件。
  - `input type="nickname"` 让用户选择或填写微信昵称。
  - 选择微信头像后立即上传到后端头像接口，昵称通过“保存资料”写入后端。
- 保留普通上传头像能力，用于 H5 或用户本地图片上传。
- 更新 `docs/小程序上传发布说明.md`，明确昵称头像验收应走“编辑资料”页的微信头像/昵称控件。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/my.vue`
- `apps/mobile/src/pages/user/profile.vue`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 19:31:48 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `rg -n "chooseAvatar|nickname|微信头像|完善微信资料" apps\mobile\dist\build\mp-weixin\pages\user apps\mobile\dist\build\mp-weixin`：确认小程序产物含 `open-type="chooseAvatar"`、`bindchooseavatar`、`input type="nickname"` 和“完善微信资料”入口。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下部分文件未来可能发生 LF/CRLF 转换。

### 遗留问题

- 需要重新导入或刷新本地 `apps/mobile/dist/build/mp-weixin`，旧包不会显示“完善微信资料/微信头像”新入口。
- 微信昵称选择和头像选择必须在微信开发者工具或真机小程序内人工点击验证。

### 下一阶段应继续处理的事项

- 本地构建通过后提交推送。
- 用微信开发者工具导入本地 `E:\2027\活动报名\活动报名\apps\mobile\dist\build\mp-weixin`，进入“我的 -> 完善微信资料/编辑资料”，验证 `微信头像` 按钮和昵称输入框。

## 2026-06-24 - 小程序已登录用户微信资料同步入口

### 阶段名称

小程序上线准备 - 已登录状态补齐微信头像昵称授权入口小阶段。

### 本阶段完成内容

- 根据开发者工具截图复查当前链路，确认用户已经处于“微信已登录 · 未绑定手机号”状态，因此不会再次进入登录页，也不会触发登录页上的 `getUserProfile` 授权弹窗。
- 新增共用微信资料授权工具，统一处理 `getUserProfile` 成功、拒绝和当前环境不支持的结果。
- 登录页继续在微信登录前拉起资料授权，用户允许时保存昵称头像，拒绝时仍使用 openid 登录。
- “我的”页在微信登录但缺头像/默认 `微信用户xxxxxx` 昵称时显示“同步微信头像昵称”，点击后可直接拉起授权弹窗并保存到后台。
- “账号资料”页新增“使用微信资料”按钮，已登录用户无需退出重登，也能补同步微信昵称和头像。
- 头像按钮行增加换行能力，避免小屏上按钮挤出布局。
- 更新 `docs/小程序上传发布说明.md`，补充已登录用户的微信资料同步入口和验收方式。

### 修改/新增的主要文件

- `apps/mobile/src/wechat-profile.ts`
- `apps/mobile/src/pages/user/login.vue`
- `apps/mobile/src/pages/user/my.vue`
- `apps/mobile/src/pages/user/profile.vue`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 18:26:12 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `rg -n "getUserProfile|同步微信头像昵称|使用微信资料|用于完善会员昵称和头像" apps\mobile\dist\build\mp-weixin apps\mobile\src\pages\user apps\mobile\src\wechat-profile.ts`：确认源码与小程序产物都包含资料授权和补资料入口。
- `git diff --check`：通过；仅提示 Windows 下部分文件未来可能发生 LF/CRLF 转换。

### 遗留问题

- 需要重新构建并导入 `apps/mobile/dist/build/mp-weixin`，开发者工具刷新后才能看到“同步微信头像昵称/使用微信资料”入口。
- 微信资料授权弹窗依赖微信开发者工具/真机小程序环境；H5 不会出现该弹窗。

### 下一阶段应继续处理的事项

- 本地验证通过后提交并推送，服务器拉取最新代码并重新构建 `mp-weixin`。
- 开发者工具进入“我的”页点击“同步微信头像昵称”，确认出现微信授权弹窗；允许后后台会员资料显示昵称头像。

## 2026-06-24 - 小程序微信头像昵称授权登录优化

### 阶段名称

小程序上线准备 - 微信登录资料授权弹窗与昵称头像保存小阶段。

### 本阶段完成内容

- 根据用户截图确认：微信小程序登录时展示的“获取你的昵称、头像和权限”属于头像昵称资料授权弹窗，不是 `wx.login` 本身。
- 明确登录链路边界：`wx.login` 只能拿临时 `code`，后端换取 `openid`/AppID；昵称头像必须通过 `getUserProfile` 授权获取，手机号仍需单独授权或绑定。
- 小程序登录页在执行 `uni.login` 前先调用 `getUserProfile`：
  - 用户允许时，把微信昵称和头像随登录请求提交给后端保存。
  - 用户拒绝或接口不可用时，仍继续使用 openid 完成微信登录，避免阻断核心登录流程。
- 更新小程序上传发布说明，补充“允许保存昵称头像、拒绝仍可登录”的验收预期。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/login.vue`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 18:11:34 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `rg -n "getUserProfile|用于完善会员昵称和头像" apps\mobile\dist\build\mp-weixin apps\mobile\src\pages\user\login.vue`：确认源码与小程序构建产物都包含微信资料授权调用。
- `rg -n "URLSearchParams|touristappid" apps\mobile\dist\build\mp-weixin`：无命中，确认小程序包未回退到旧查询参数问题。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过。

### 遗留问题

- 线上服务器还需要拉取本阶段提交、重建 API 与 `mp-weixin` 包。
- 微信开发者工具需要重新编译 `apps/mobile/dist/build/mp-weixin` 后再点击微信登录验证授权弹窗。
- 后台能否显示真实昵称头像取决于用户是否点击“允许”；点击“拒绝”时仍会生成默认微信用户。

### 下一阶段应继续处理的事项

- 服务器执行最新发布命令，确认 API ready 后重建小程序包。
- 微信开发者工具重新导入/编译小程序包，验证登录弹窗、允许保存昵称头像、拒绝仍可登录。
- 本地开发者工具验收通过后，再上传体验版并用手机微信扫码做真机验证。

## 2026-06-24 - 小程序微信登录会员资料可见性优化

### 阶段名称

小程序上线准备 - 微信登录后前台显示与后台会员可见性小阶段。

### 本阶段完成内容

- 读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`，确认当前阶段为小程序开发者工具登录链路验收。
- 根据用户截图分析：微信开发者工具内已能进入“我的”页，但顶部仍显示 `未登录`；后台会员列表中既有演示用户仍显示 `微信绑定=未绑定`、`AppID=-`。
- 明确微信平台能力边界：
  - `wx.login` 只返回临时 `code`，后端只能换取 `openid`、可能的 `unionid` 和 AppID。
  - 微信不会自动返回手机号、昵称或头像。
  - 手机号必须单独走手机号授权/绑定；昵称头像需用户填写或通过微信头像昵称填写能力获取。
- 后端优化微信登录：
  - 新微信用户没有昵称时，自动生成 `微信用户xxxxxx` 作为系统展示名，避免前台误显示“未登录”。
  - 微信登录保存用户后立即刷新/创建会员档案，让后台会员列表能看到小程序来源、微信绑定状态、AppID 和最近活跃时间。
  - `/public/me/profile` 增加 `sourceChannel`、`lastLoginChannel`、`wechatBound`、`wechatAppId`，给前台明确识别微信登录态。
- 小程序/H5 我的页优化：
  - 已微信登录但未绑定手机号时，昵称显示为微信用户兜底名。
  - 身份提示显示 `微信已登录 · 未绑定手机号`，不再显示“请先登录后查看权益”。
- 更新 `docs/小程序上传发布说明.md`，说明后台能获取到的是 openid/AppID 绑定关系，不等于自动获取手机号、微信昵称或头像。

### 修改/新增的主要文件

- `apps/api/src/modules/public/public.service.ts`
- `apps/mobile/src/pages/user/my.vue`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 18:03:34 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `rg -n "URLSearchParams|touristappid" apps\mobile\dist\build\mp-weixin`：无命中，输出 `OK no URLSearchParams or touristappid in mp-weixin build`。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过。

### 浏览器/本地工具验收结果

- 本阶段为本地代码修复和构建验证；微信开发者工具需重新编译最新 `mp-weixin` 构建产物后复验。
- 后端修改需服务器拉取、构建 API 并重启 PM2 后，线上 API 才会在真实微信登录时创建默认昵称和会员档案。

### 遗留问题

- 微信手机号、微信昵称、微信头像不会由 `wx.login` 自动返回；后续如需完整资料，需要增加手机号授权和头像昵称填写流程。
- 服务器尚未拉取本次提交并重新构建 API/小程序包。

### 下一阶段应继续处理的事项

- 提交并推送本阶段补丁。
- 服务器拉取后构建 API、重启 PM2，并重新构建 `mp-weixin`。
- 在微信开发者工具重新编译并点击微信登录，确认我的页显示 `微信用户xxxxxx` 或已填写昵称，后台会员列表刷新后出现 `来源=微信小程序`、`微信绑定=已绑定`、`AppID=wx4373059ed6b7793b`。

## 2026-06-24 - 小程序微信登录服务器复验

### 阶段名称

小程序上线准备 - 生产 API 微信登录配置联动发布复验小阶段。

### 本阶段完成内容

- 读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`，确认上一阶段遗留为服务器拉取 `bd2275b`、构建 API、重启 PM2 后复验微信登录配置读取。
- 读取用户贴回的服务器执行输出，确认服务器已完成：
  - `git pull --ff-only origin feature/qiwai-ui-experiment`：从 `a13bb84` 快进到 `bd2275b`。
  - `npm --prefix apps/api run build`：通过。
  - `PM2 restart activity-api --update-env`：通过。
  - `API_READY_URL=https://rd.chaimen666.com/api/health/ready npm run wait:api-ready`：第 1 次因 PM2 刚重启短暂 `502`，第 2 次成功，`ready=true api=up database=up config=warning commit=bd2275b`。
- 确认服务器用假 `code` 调用微信登录接口后，返回已从 `微信登录配置未完成` 变为微信侧 `invalid code`，说明生产 API 已能读取 AppID/AppSecret。
- 本地再次调用线上接口复核，结果同样为 `invalid code`，确认外网 API 已生效。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 17:54 +08:00。
- 服务器 API 构建：通过。
- 服务器 PM2 重启：通过。
- 服务器 readiness：通过，commit 为 `bd2275b`。
- 服务器微信登录配置验证：
  - 请求：`POST https://rd.chaimen666.com/api/public/auth/wechat-login`
  - 数据：`{"code":"debug-code","appId":"wx4373059ed6b7793b"}`
  - 结果：`invalid code`，不再返回 `微信登录配置未完成`。
- 本地外网复核：同样返回 `invalid code`。

### 浏览器/本地工具验收结果

- 本阶段为生产 API 配置读取复验，未新增右侧浏览器点击。
- 结论：微信登录后端配置读取链路已打通；下一步应回到微信开发者工具/体验版，用真实 `wx.login` code 点击“微信登录”复验。

### 遗留问题

- 服务器本次只构建并重启了 API，还未重新构建 `mp-weixin` 并上传新的体验版；已上传的旧体验版可能仍包含旧前端包。
- 本机微信开发者工具预览二维码仍要求当前登录账号加入小程序开发者/体验者。
- 若真实微信登录继续失败，需要根据微信返回的新错误继续判断，例如 AppSecret 错误、账号未绑定、合法域名或开发者权限问题。

### 下一阶段应继续处理的事项

- 在微信开发者工具中重新点击“微信登录”，确认不再提示 `微信登录配置未完成`。
- 服务器继续执行小程序构建，并在后台“小程序发布管理”上传新体验版，建议版本号递增到 `1.0.2`。
- 用手机微信扫描新体验版二维码，复验“我的慢π”、登录、活动报名、心得发布、商城流程。

## 2026-06-24 - 小程序微信登录配置联动修复

### 阶段名称

小程序上线准备 - 体验版/开发者工具微信登录配置读取联动小阶段。

### 本阶段完成内容

- 根据用户提供的微信开发者工具截图，确认小程序已能在本地开发者工具运行，当前阻塞点为点击“微信登录”后弹出 `微信登录配置未完成`。
- 搜索后端错误来源，定位到 `/public/auth/wechat-login` 的 `resolveWechatIdentity()`：生产模式下需要 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`，缺失时直接抛出该错误。
- 本地调用线上接口复现同一错误：
  - `POST https://rd.chaimen666.com/api/public/auth/wechat-login`
  - 返回 `400`，message 为 `微信登录配置未完成`。
- 分析确认后台“小程序发布管理”已经保存 AppID/AppSecret，但用户微信登录此前只读取 API 环境变量，没有读取后台发布配置，导致运营侧明明保存过配置，小程序登录仍提示未完成。
- 后端新增兜底读取逻辑：
  - AppID 优先级：请求传入 AppID -> `WECHAT_APP_ID` -> 后台小程序发布配置 AppID -> `WECHAT_PAY_APP_ID`。
  - AppSecret 优先级：`WECHAT_APP_SECRET` -> 后台小程序发布配置 AppSecret。
  - 只有后台发布配置 AppID 与本次登录 AppID 匹配时，才使用后台保存的 AppSecret，避免误用其它小程序密钥。
- `PublicModule` 注册 `MiniprogramReleaseSetting` 仓库，让公开微信登录可读取后台已保存的小程序发布配置。
- 更新 `docs/小程序上传发布说明.md`，说明“微信登录配置未完成”的配置来源、验证方式和服务器发布要求。

### 修改/新增的主要文件

- `apps/api/src/modules/public/public.service.ts`
- `apps/api/src/modules/public/public.module.ts`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 17:50:16 +08:00。
- 线上接口复现：当前生产 API 返回 `微信登录配置未完成`，证明问题在服务器当前版本/配置，非开发者工具前端误报。
- `npm.cmd --prefix apps/api run build`：通过。
- 待服务器拉取本次后端修复并重启 API 后，再次用同一接口验证；如果配置生效，假 `code` 应返回微信侧 `invalid code` 类错误，不应再返回 `微信登录配置未完成`。

### 浏览器/本地工具验收结果

- 微信开发者工具页面已可运行小程序登录页。
- 本阶段修复为后端配置读取逻辑，需要服务器部署后才能在开发者工具/体验版中复验。

### 遗留问题

- 服务器尚未拉取本次提交、构建 API 并重启 PM2，因此线上当前仍会返回 `微信登录配置未完成`。
- 本机微信开发者工具预览二维码仍要求当前登录账号加入小程序开发者/体验者；这是微信平台权限要求，不是代码问题。

### 下一阶段应继续处理的事项

- 提交并推送本阶段后端补丁。
- 服务器拉取后执行 API 构建、PM2 重启和 readiness 检查。
- 重新在微信开发者工具点击“微信登录”，确认不再提示配置未完成；若后续返回微信侧 code/appSecret 错误，再按微信平台返回继续排查。

## 2026-06-24 - 小程序本地开发者工具调试链路

### 阶段名称

小程序上线准备 - 本地微信开发者工具与 HBuilder X 快速调试链路小阶段。

### 本阶段完成内容

- 读取 `docs/qiwai-cultural-saas-platform-plan.md`、`docs/小程序上传发布说明.md` 和最新 `DEVELOPMENT_LOG.md`，确认当前阶段为小程序体验版真机问题快速排查。
- 检查本机安装路径，确认可用工具：
  - 微信开发者工具：`D:\Program Files (x86)\Tencent\微信web开发者工具\微信开发者工具.exe`
  - 微信开发者工具 CLI：`D:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`
  - HBuilder X：`D:\HBuilderX\HBuilderX.exe`
- 使用线上 API 地址构建本地小程序包：`VITE_API_BASE=https://rd.chaimen666.com/api`。
- 调用微信开发者工具 CLI 打开 `apps/mobile/dist/build/mp-weixin`，本机微信开发者工具已启动并载入“活动发布”项目。
- 调用 HBuilder X 打开 `apps/mobile` 源码目录，方便后续 uni-app 页面编辑与运行到小程序。
- 通过右侧后台“小程序发布管理”只读确认当前保存的小程序 AppID 为 `wx4373059ed6b7793b`。
- 修复本地调试体验：将 `apps/mobile/src/manifest.json` 的 `mp-weixin.appid` 从空值改为正式 AppID，避免本地构建产物继续生成 `touristappid`。
- 重新构建后确认 `apps/mobile/dist/build/mp-weixin/project.config.json` 已写入正式 AppID。
- 补充 `docs/小程序上传发布说明.md` 的“本地快速调试”章节，记录构建、打开微信工具、生成预览二维码和常见错误判断。

### 修改/新增的主要文件

- `apps/mobile/src/manifest.json`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 17:17:24 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- 微信开发者工具 CLI `open --project apps/mobile/dist/build/mp-weixin --lang zh`：已启动并打开项目。
- `apps/mobile/dist/build/mp-weixin/project.config.json`：确认 `appid` 为 `wx4373059ed6b7793b`。
- 微信开发者工具 CLI `preview`：已越过 `AppID 不合法`，但被微信账号权限阻止，返回 `登录用户不是该小程序的开发者`。
- HBuilder X：已启动并打开 `apps/mobile`。

### 浏览器/本地工具验收结果

- 后台页面只读检查通过：小程序发布配置页可打开，AppID 已配置，最新上传体验版记录仍为成功。
- 本地微信开发者工具可打开构建产物目录。
- 本地预览二维码生成未完成，原因是当前微信开发者工具登录账号未加入该小程序开发成员；这不是代码构建错误。

### 遗留问题

- 需要用已加入该小程序开发者/体验者的微信号登录本机微信开发者工具，或在微信公众平台将当前登录账号添加为开发者后，才能使用 CLI `preview` 生成本地预览二维码。
- 继续真机验收前，仍需服务器拉取最新代码、重新构建小程序包并上传新的体验版。

### 下一阶段应继续处理的事项

- 用户切换或授权微信开发者工具账号后，重新执行 `preview` 命令生成二维码，并在开发者工具模拟器控制台复验是否还有小程序运行时报错。
- 若本地预览通过，再上传新体验版并用手机真机复验“我的慢π”、首页、登录、报名、心得发布和商城流程。

## 2026-06-24 - 小程序真机 URLSearchParams 兼容修复

### 阶段名称

小程序上线准备 - 真机体验版 `Can't find variable: URLSearchParams` 报错修复小阶段。

### 本阶段完成内容

- 读取 `docs/qiwai-cultural-saas-platform-plan.md`、`docs/小程序上传发布说明.md` 和最新 `DEVELOPMENT_LOG.md`，确认当前阶段处于小程序体验版真机验收。
- 查看用户提供的手机真机截图，确认体验版在“我的慢π”页弹出 `Can't find variable: URLSearchParams`。
- 定位原因：移动端代码中多处直接使用浏览器/H5 API `URLSearchParams`，微信小程序运行时不提供该全局变量，导致真机运行时报错。
- 新增小程序兼容的 query 工具函数，用普通字符串解析替代 `URLSearchParams`。
- 替换移动端以下场景中的 `URLSearchParams`：
  - 租户码读取。
  - 活动列表意图参数解析。
  - 当前路由 query 拼接。
  - 慢π动态列表、动态详情、发布心得页面的活动参数读取。
  - H5 支付宝表单提交参数解析。
- 构建 `mp-weixin` 后扫描产物，确认微信小程序包内已不再包含 `URLSearchParams`。
- 同时构建 H5，确认本次 query 解析兼容改动未破坏 H5 打包。

### 修改/新增的主要文件

- `apps/mobile/src/query.ts`
- `apps/mobile/src/api.ts`
- `apps/mobile/src/pages/community/index.vue`
- `apps/mobile/src/pages/community/detail.vue`
- `apps/mobile/src/pages/community/publish.vue`
- `apps/mobile/src/pages/user/registration.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 16:59:19 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `rg -n "URLSearchParams" apps\mobile\dist\build\mp-weixin`：无命中，输出 `OK no URLSearchParams in mp-weixin build`。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下 LF/CRLF 转换。

### 浏览器/真机验收结果

- 本阶段根据用户手机截图完成本地代码修复与小程序构建验证。
- 由于真机运行的是线上已上传的旧体验版，本地修复需要先推送、服务器拉取、重新构建 `mp-weixin` 并上传新的体验版后，才能在手机微信中复验。

### 遗留问题

- 需要服务器拉取本次提交后重新执行小程序构建，并在后台“小程序发布管理”上传新的体验版。
- 上传后需用手机微信重新扫描体验版二维码，重点复验“我的慢π”页不再弹出 `URLSearchParams` 报错。
- 真实支付仍未完成商户、证书、回调和真实小额支付/退款验收，正式运营前仍需保持真实支付关闭。

### 下一阶段应继续处理的事项

- 提交并推送本阶段补丁。
- 服务器拉取后执行 `VITE_API_BASE=https://rd.chaimen666.com/api npm --prefix apps/mobile run build:mp-weixin`，检查构建产物无 `URLSearchParams`。
- 在后台“小程序发布管理”上传版本号递增的新体验版，例如 `1.0.2`，再进行手机真机复验。

## 2026-06-24 - H5 控制台 Object 日志线上复验

### 阶段名称

上线前体验细节 - 服务器发布 `8b77b29` 后 H5 控制台日志复验小阶段。

### 本阶段完成内容

- 重新读取 `docs/project-progress.md` 和最新 `DEVELOPMENT_LOG.md`，确认上一阶段遗留为“服务器拉取后执行 H5 构建发布，再用右侧浏览器确认首页控制台不再出现 `Object`”。
- 读取用户贴回的服务器发布输出，确认服务器已完成：
  - `git pull --ff-only origin feature/qiwai-ui-experiment`：从 `44ce6ba` 快进到 `8b77b29`。
  - `npm --prefix apps/mobile run build:h5`：通过。
  - `WEBROOT=/www/wwwroot/rd.chaimen666.com/apps/mobile/dist/build/h5 ADMIN_WEBROOT=/www/wwwroot/rd.chaimen666.com/apps/admin/dist npm run publish:webroot`：通过，识别 H5/Admin 均为 Nginx 直出目录。
  - H5 构建目录主包：`assets/index-BBIiu1QX.js`。
  - 旧品牌扫描：`OK 没有旧品牌残留`。
  - Nginx 配置检查与 reload：通过。
  - `API_READY_URL=https://rd.chaimen666.com/api/health/ready npm run wait:api-ready`：通过，`ready=true api=up database=up config=warning commit=35f1de4`。
- 使用右侧浏览器打开线上 H5 首页，确认外网实际加载 `https://rd.chaimen666.com/assets/index-BBIiu1QX.js`。
- 复验页面标题为 `慢π`，正文包含 `慢π演示中心`、近期活动、课程、共修动态和底部导航。
- 复验页面无 `七维/奇外/电召` 旧品牌词，无 `502`、`Bad Gateway`、`tenantCode should not exist` 等阻塞文案。
- 读取右侧浏览器控制台 `error/warn` 日志，结果为空；此前独立 `Object` 日志和 `setNavigationBarTitle:fail page not found` 已不再出现。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 15:13:13 +08:00。
- 服务器 H5 构建发布：通过，线上主包 `assets/index-BBIiu1QX.js`。
- 服务器旧品牌扫描：通过，输出 `OK 没有旧品牌残留`。
- 服务器 API readiness：通过，`ready=true api=up database=up config=warning commit=35f1de4`。
- 右侧浏览器线上 H5 首页复验：通过。

### 浏览器验收结果

- 验证环境：线上 H5 `https://rd.chaimen666.com/?tenantCode=qiwai-showcase&t=1782285171406#/`，右侧浏览器。
- 浏览器验证步骤：
  - 打开带时间戳的线上 H5 首页。
  - 读取页面标题、正文、脚本资源和阻塞文案。
  - 读取浏览器 `error/warn` 控制台日志。
- 输入的测试数据摘要：无新增业务数据，本阶段仅做线上页面与控制台复验。
- 通过项：页面能正常打开；实际加载新主包 `assets/index-BBIiu1QX.js`；旧品牌词未出现；页面无阻塞；控制台 `error/warn` 为空；独立 `Object` 日志已消失。
- 发现的问题：无新增问题。`/api/health/ready` 的 `config=warning` 仍为真实支付/短信/生产资料未完全补齐的预期提示，不影响 H5 试运营链路。
- 是否达到可上线运营标准：本小阶段达到线上 H5 控制台日志和页面加载验收标准；真实在线支付、短信、证书、回调资料未补齐前仍不得开放真实支付。

### 遗留问题

- 真机微信 iOS/Android 分享、海报长按保存、二维码扫码回流仍未验收。
- 仍需补做后台多角色对线上商城订单 `MO17822834802957D7DB7` 的查看权限复验。
- 真实支付、短信、证书、回调资料未补齐前，继续保持真实支付关闭。

### 下一阶段应继续处理的事项

- 继续按计划补做后台多角色查看线上商城订单与权限边界复验。
- 进入真机微信 H5 验收时，使用 HTTPS 链接在 iOS/Android 微信中验证分享、海报长按保存、二维码扫码回流和朋友圈卡片。

## 2026-06-24 - H5 控制台残留 Object 日志修复

### 阶段名称

上线前体验细节 - H5 首页控制台残留 `Object` 错误日志收口小阶段。

### 本阶段完成内容

- 读取用户贴回的服务器发布输出，确认服务器已拉取 `44ce6ba`，H5 构建成功，线上静态主包更新为 `assets/index-BAs0Zayf.js`，旧品牌词扫描通过，Nginx reload 与 API readiness 均通过。
- 使用右侧浏览器打开线上 H5 首页，确认页面实际加载 `https://rd.chaimen666.com/assets/index-BAs0Zayf.js`，正文和标题均为慢π，未出现旧品牌词和页面阻塞。
- 浏览器控制台复验发现：
  - 新的 `[H5] unhandled promise rejection: setNavigationBarTitle:fail page not found` 前缀已经生效。
  - 但由于 `reportH5Error()` 仍把原始 error 对象作为第二个 `console.error` 参数输出，浏览器日志仍额外捕获一条独立 `Object`。
- 将 `reportH5Error()` 改为只输出单条字符串日志，并把 error/context 压缩为 `detail=...` 字符串，避免浏览器继续单独记录 `Object`。
- 定位非阻塞错误源头为 `theme.ts` 里的 `uni.setNavigationBarTitle({ title })` 在 H5 页面尚未就绪时可能返回 rejected promise。
- 给 `setRuntimePageTitle()` 增加 try/catch 与 promise catch：
  - 已知 `setNavigationBarTitle:fail page not found` 在 H5 下直接忽略，因为同函数已经用 DOM `document.title` 和 `.uni-page-head__title` 兜底同步标题。
  - 其它未知标题设置错误仍以单条 `[H5] set navigation title failed: ...` warn 输出。

### 修改/新增的主要文件

- `apps/mobile/src/error-reporting.ts`
- `apps/mobile/src/theme.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 15:02:09 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `rg -n "console\\.error\\([^\\n]*,|reject\\(error\\)|setNavigationBarTitle\\(\\{ title: normalized \\}\\);" apps/mobile/src -g "*.ts" -g "*.vue"`：仅剩单参数 `[H5] ...` `console.error`，未发现裸 `reject(error)` 或未兜底的标题设置调用。
- `git diff --check`：通过；仅提示 Windows 下 LF/CRLF 转换。
- `git commit -m "fix: suppress H5 title timing object logs"`：通过，生成提交 `a4d2e50`。
- `git push origin feature/qiwai-ui-experiment`：通过，远端已更新到 `a4d2e50`。

### 浏览器验收结果

- 验证环境：线上 H5 `https://rd.chaimen666.com/?tenantCode=qiwai-showcase&t=1782284404668#/`，右侧浏览器。
- 部署前线上浏览器结果：页面加载新包 `assets/index-BAs0Zayf.js`，无旧品牌、无页面阻塞；控制台仍有一条独立 `Object`，已在本阶段本地代码中修复。
- 本阶段修复尚未发布到服务器，因此线上浏览器需要服务器拉取本次提交后再次复验。

### 遗留问题

- 需要提交、推送并由服务器再次构建发布 H5，确认线上新主包 hash 变化后，重新打开 H5 验证控制台不再出现独立 `Object`。
- 真机微信 iOS/Android 分享、海报长按保存、二维码扫码回流仍未验收。

### 下一阶段应继续处理的事项

- 提交并推送本阶段补丁。
- 服务器拉取后执行 H5 构建发布，再用右侧浏览器确认首页控制台不再出现 `Object`。
- 继续补做后台多角色对线上商城订单 `MO17822834802957D7DB7` 的查看权限复验，或进入真机微信验收。

## 2026-06-24 - H5 错误日志优化提交推送

### 阶段名称

上线前部署配置 - H5 错误日志优化与线上商城点击复验记录提交推送小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和 `docs/线上部署结构与发布说明.md`，确认上一阶段遗留为“提交并推送本阶段 H5 错误日志优化与前一阶段商城点击级复验日志”。
- 暂存本次相关文件，排除本地 `.local-logs/`、`.local-mariadb/` 未跟踪目录。
- 创建本地提交：`d02aa6a fix: improve H5 error diagnostics`。
- 推送到远端分支：`origin/feature/qiwai-ui-experiment`，远端从 `0f52ad0` 更新到 `d02aa6a`。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`
- `apps/mobile/src/error-reporting.ts`
- `apps/mobile/src/main.ts`
- `apps/mobile/src/api.ts`
- `apps/mobile/src/mobile-admin.ts`
- `apps/mobile/src/mall-payment.ts`
- `apps/mobile/src/pages/user/registration.vue`

### 运行或测试结果

- 验证时间：2026-06-24 14:54:08 +08:00。
- `git diff --check`：通过；仅提示 Windows 下 LF/CRLF 转换。
- `git commit -m "fix: improve H5 error diagnostics"`：通过，生成提交 `d02aa6a`。
- `git push origin feature/qiwai-ui-experiment`：通过。

### 浏览器验收结果

- 本阶段为 Git 提交推送，不新增浏览器点击。
- 上一阶段右侧浏览器已完成线上 H5 商城点击级复验；H5 错误日志优化需服务器拉取并发布后再在线上浏览器复验。

### 遗留问题

- 服务器尚未拉取 `d02aa6a` 并重新构建发布 H5，因此线上当前仍不会出现新的 `[H5] ...` 错误日志格式。
- 真机微信 iOS/Android 分享、海报长按保存、二维码扫码回流仍未验收。

### 下一阶段应继续处理的事项

- 在服务器执行部署命令：拉取 `feature/qiwai-ui-experiment`，构建 H5/Admin，按直出目录发布静态包，必要时重启 API 并等待 readiness。
- 部署后打开线上 H5，确认主包 hash 更新、页面无旧品牌残留，并复验控制台错误日志格式。
- 继续补做后台多角色对线上商城订单 `MO17822834802957D7DB7` 的查看权限复验，或进入真机微信验收。

## 2026-06-24 - H5 前端错误日志可读性优化

### 阶段名称

上线前体验细节 - H5 泛化 `Object` 控制台错误日志格式化小阶段。

### 本阶段完成内容

- 重新读取 `docs/project-progress.md` 和最新 `DEVELOPMENT_LOG.md`，确认上一阶段遗留“H5 控制台泛化 `Object` error 仍需后续单独定位和日志可读性优化”。
- 新增 H5 前端错误格式化模块 `error-reporting.ts`：
  - `describeError()` 将 `Error`、字符串、uni fail 对象、普通对象统一转成可读 message。
  - `clientError()` 将 uni `request/uploadFile/requestPayment` 的原始 fail 对象包装成带上下文的 `Error`。
  - `reportH5Error()` 让控制台第一参数固定为 `[H5] scope: message`，原始对象作为第二参数保留，避免线上只看到单独的 `Object`。
  - `installH5ErrorReporting()` 接入 Vue `errorHandler`、H5 `window.error` 和 `unhandledrejection`。
- 在 H5 启动入口 `main.ts` 安装全局错误报告。
- 用户端 API `request()`、头像上传、心得/商城图片上传的 `fail` 分支不再直接 `reject(error)`，改为包含 method 和 url 的可读错误。
- 手机管理端 API 和后台图片上传同样改为可读错误。
- 商城微信支付、活动报名微信支付的 `uni.requestPayment` fail 分支改为 `微信支付失败 (provider=wxpay, tradeType=...)` 格式，便于后续真机支付联调排查。
- 静态搜索确认 `apps/mobile/src` 下不再存在裸 `reject(error)`。

### 修改/新增的主要文件

- `apps/mobile/src/error-reporting.ts`
- `apps/mobile/src/main.ts`
- `apps/mobile/src/api.ts`
- `apps/mobile/src/mobile-admin.ts`
- `apps/mobile/src/mall-payment.ts`
- `apps/mobile/src/pages/user/registration.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 14:51:24 +08:00。
- `rg -n "reject\\(error\\)|fail:\\s*\\(error\\)\\s*=>\\s*reject\\(error\\)" apps/mobile/src -g "*.ts" -g "*.vue"`：无命中，退出码 1 表示未发现裸抛原始 error 对象。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下 LF/CRLF 转换。

### 浏览器验收结果

- 本阶段为 H5 诊断能力代码优化，未直接发布到线上环境，因此右侧线上浏览器暂不能看到新日志格式。
- 上一阶段右侧浏览器已完成线上 H5 商城点击级复验，当前改动经 H5 构建验证可进入后续部署。

### 遗留问题

- 需要提交、推送并让服务器重新构建/发布 H5 后，再在右侧浏览器或真机微信中复验泛化 `Object` 错误是否变成 `[H5] ...` 可读日志。
- 如果新格式仍暴露具体业务错误，需要继续按 scope、url、requestId 追踪源头，而不是简单吞掉错误。
- 真机微信 iOS/Android 分享、海报长按保存、二维码扫码回流仍未验收。

### 下一阶段应继续处理的事项

- 提交并推送本阶段 H5 错误日志优化与前一阶段商城点击级复验日志。
- 服务器拉取后执行 H5 构建发布，再打开线上 H5 复验控制台日志和主流程。
- 继续补做后台多角色对线上商城订单 `MO17822834802957D7DB7` 的查看权限复验，或进入真机微信验收。

## 2026-06-24 - 线上 H5 商城点击级复验

### 阶段名称

慢π上线前完整验收 - 线上 H5 商城商品详情、购物车、确认订单与线下收款订单点击级复验小阶段。

### 本阶段完成内容

- 重新读取 `docs/project-progress.md`、`docs/开发方案与二次开发说明.md`、`docs/线上部署结构与发布说明.md` 和最新 `DEVELOPMENT_LOG.md`，确认上一阶段遗留为“继续右侧浏览器商城商品详情、购物车、下单入口点击级复验”。
- 使用右侧浏览器打开线上 H5 商城：`https://rd.chaimen666.com/?tenantCode=qiwai-showcase#/pages/mall/index?tenantCode=qiwai-showcase`。
- 验证线上商城当前加载新 H5 主包 `assets/index-4SYBy6so.js`，页面标题为 `慢π商城`，未出现 `七维/奇外/电召` 旧品牌词。
- 点击商品 `【演示】慢π读书手账` 进入商品详情，确认规格、库存、配送/售后说明、已审核评价和商家回复正常展示。
- 点击“加入购物车”，页面提示 `已加入购物车`，未触发登录阻塞或接口错误。
- 点击“立即购买”进入确认订单页，确认收货地址、商品明细、优惠券、积分抵扣、推广码、支付方式和备注区正常展示。
- 新增并保留线上测试收货地址：`线上商城复验收货人83366796 / 13990006796 / 重庆市 重庆市 铜梁区 线上商城点击复验地址 83366796`。
- 选择该地址后提交一笔线下收款商城订单，保留测试订单数据：
  - 订单详情路由：`#/pages/user/mall-order-detail?id=12&tenantCode=qiwai-showcase`
  - 订单号：`MO17822834802957D7DB7`
  - 商品：`【演示】慢π读书手账 / 标准款 × 1`
  - 金额：`¥39.00`
  - 支付方式：`线下收款`
  - 备注：`线上商城点击级复验订单 2026-06-24T06:44:38.294Z`
- 刷新订单详情页后，订单号、待确认收款状态、金额、地址、商品明细、支付方式和备注仍保持正确。
- 直接打开购物车页，确认刚才加入的 `【演示】慢π读书手账` 可见，合计 `¥39.00`，`去结算` 入口可见。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 14:46:09 +08:00。
- 右侧浏览器线上 H5 点击级复验：通过。
- `npm.cmd run wait:api-ready -- --url https://rd.chaimen666.com/api/health/ready --timeout-ms 15000 --interval-ms 1000`：通过，1 次尝试成功，输出 `ready=true api=up database=up config=warning commit=35f1de4`。
- `git diff --check`：通过。

### 浏览器验收结果

- 验证环境：线上 H5 `https://rd.chaimen666.com/`，商家 `qiwai-showcase`，右侧浏览器。
- 浏览器验证步骤：
  - 打开商城首页，确认标题、新包 hash、店铺、秒杀/拼团/推荐商品列表正常。
  - 点击普通商品进入商品详情，确认详情数据完整。
  - 加入购物车，确认成功提示。
  - 进入确认订单页，新增收货地址并选择。
  - 选择线下收款并提交测试订单。
  - 打开订单详情并刷新，确认数据状态保持。
  - 打开购物车页，确认商品、数量、合计和结算入口可见。
- 输入的测试数据摘要：收货地址 `线上商城复验收货人83366796 / 13990006796 / 线上商城点击复验地址 83366796`；订单备注 `线上商城点击级复验订单 2026-06-24T06:44:38.294Z`。
- 通过项：页面能正常打开；商品详情可进入；加入购物车成功；确认订单页可用；地址表单保存并可选择；线下收款订单提交成功；刷新后订单状态合理；购物车列表正常；无明显前端 error；无 502、`tenantCode` 校验、旧品牌残留或页面阻塞。
- 发现的问题：确认订单提交后订单详情最初短暂展示占位文案，约 2 秒后异步数据刷新为正确订单信息；当前不阻塞流程，但后续可优化为更明确的加载态。
- 是否达到可上线运营标准：本小阶段达到线上 H5 商城受控试运营可用标准；真实微信支付仍保持关闭，需待真实商户、证书、回调和预发证据补齐后再开放。

### 遗留问题

- 真机微信 iOS/Android 分享、海报长按保存、二维码扫码回流仍未验收。
- H5 控制台泛化 `Object` error 仍需后续单独定位和日志可读性优化。
- 真实支付、短信、证书、回调资料未补齐前，继续保持 `REAL_PAYMENT_ENABLED=false`、`PAYMENT_SANDBOX_ENABLED=false`。
- 商城订单详情页初始占位态文案可进一步优化，避免异步加载瞬间误读为金额或支付方式异常。

### 下一阶段应继续处理的事项

- 重新读取开发计划和开发记录后，优先处理 H5 泛化 `Object` 控制台错误日志可读性优化，或继续准备真机微信验收清单与外部验收记录。
- 若继续最终验收，应在右侧浏览器补做后台平台/商家/店铺运营/财务/签到角色对本次商城订单的查看权限复验。

## 2026-06-24 - API ready 等待脚本

### 阶段名称

上线前部署配置 - PM2 重启后 API readiness 等待重试小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md`、`docs/project-progress.md` 和工作区状态，确认上一阶段遗留“PM2 重启后立即 curl 可能短暂 502”。
- 新增 `scripts/wait-api-ready.mjs`：
  - 默认检查 `http://127.0.0.1:3000/api/health/ready`。
  - 支持 `--url`、`--api-base`、`--timeout-ms`、`--interval-ms` 参数。
  - 支持环境变量 `API_READY_URL`、`API_BASE`、`API_READY_TIMEOUT_MS`、`API_READY_INTERVAL_MS`。
  - 只有 HTTP 200 且返回 `ready=true` 才判定成功。
  - 遇到 502、连接失败或 ready 未完成时持续重试，超时后退出 1。
- 在 `package.json` 增加 `npm run wait:api-ready`。
- 更新 `docs/线上部署结构与发布说明.md`，要求 PM2 重启后执行 `API_READY_URL=https://rd.chaimen666.com/api/health/ready npm run wait:api-ready`，避免把重启瞬间 502 误判为持续故障。
- 扩展 `scripts/preflight-health-guard.mjs`，把 wait 脚本、package 命令和部署文档纳入静态保护。

### 修改/新增的主要文件

- `scripts/wait-api-ready.mjs`
- `package.json`
- `scripts/preflight-health-guard.mjs`
- `docs/线上部署结构与发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 14:34:32 +08:00。
- `node --check scripts/wait-api-ready.mjs`：通过。
- `npm.cmd run wait:api-ready -- --url https://rd.chaimen666.com/api/health/ready --timeout-ms 15000 --interval-ms 1000`：通过，1 次尝试成功，输出 `ready=true api=up database=up config=warning commit=35f1de4`。
- `node scripts/preflight-health-guard.mjs`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下 LF/CRLF 转换。

### 浏览器验收结果

- 本阶段为发布脚本能力补强，不新增右侧浏览器点击。
- 上一阶段右侧浏览器已验证线上 H5 首页和商城页可用，线上 smoke 已通过。

### 遗留问题

- 服务器尚未拉取本阶段新增的 `wait:api-ready` 脚本；下次部署前拉取即可使用。
- 真机微信 iOS/Android 分享、海报长按保存、二维码扫码回流仍未验收。
- H5 控制台泛化 `Object` error 仍需后续单独定位和日志可读性优化。

### 下一阶段应继续处理的事项

- 提交并推送本阶段脚本、文档和日志。
- 下一次服务器部署命令在 PM2 重启后加入：`API_READY_URL=https://rd.chaimen666.com/api/health/ready npm run wait:api-ready`。
- 继续右侧浏览器商城商品详情、购物车、下单入口点击级复验，或处理 H5 泛化 `Object` 控制台错误。

## 2026-06-24 - 线上演示商家 smoke 复验

### 阶段名称

慢π上线前完整验收 - 线上 `qiwai-showcase` 自动化业务闭环 smoke 小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和工作区状态，确认上一阶段已完成服务器部署复验，下一阶段可执行线上 `smoke:online-showcase`。
- 使用线上 API `https://rd.chaimen666.com/api` 跑完整演示商家 smoke。
- smoke 自动准备本次独立用户：
  - `13990053691`
  - `13990053692`
  - `13990053693`
  - `13990053694`
  - `13990053695`
- 保留真实支付关闭状态；微信支付场景按“配置未就绪不开放前台下单入口”的挡板通过。
- 覆盖 H5 首页装修、活动报名、签到、余额支付、退款、动态评论审核、课程交付、商城、财务追溯等线上闭环。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 14:30:40 +08:00。
- 命令：`API_BASE=https://rd.chaimen666.com/api SHOWCASE_ADMIN_USERNAME=admin SHOWCASE_ADMIN_PASSWORD=*** SHOWCASE_PASSWORD=*** npm.cmd run smoke:online-showcase`
- 结果：通过，脚本输出 `线上演示商家闭环验收通过。`
- 通过项：
  - H5 首页装修可读取。
  - 活动列表包含免费和收费活动：6 个。
  - 免费报名闭环：报名 -> 我的报名 -> 签到码 -> 后台核销。
  - 收费报名余额支付闭环：报名 -> 订单 -> 余额扣款 -> 钱包流水。
  - 退款闭环：用户申请 -> 财务退款 -> 审核通过 -> 余额退回。
  - 动态点赞评论审核闭环：点赞 -> 评论待审 -> 后台通过 -> 前台可见。
  - 课程交付闭环：下单 -> 后台确认 -> 播放权限 -> 学习进度 -> 我的课程。
  - 商城榜单搜索与商品统计、优惠券、低库存、收藏足迹、购物车余额支付、积分/推广、拼团、取消订单、幂等下单、超时关单、自动完成、微信支付挡板、线下履约物流、晒图评价、售后财务、运营看板、筛选导出、售后导出、支付流水导出均通过。
  - 财务后台订单、退款、余额流水可追溯。

### 浏览器验收结果

- 本阶段为自动化 smoke 复验，不新增右侧浏览器点击。
- 上一阶段右侧浏览器已验证线上 H5 首页和商城页：新包 `assets/index-4SYBy6so.js` 生效、商城数据正常、无旧品牌残留、无商城 `tenantCode` 阻塞文案。

### 遗留问题

- 真机微信 iOS/Android 分享、海报长按保存、二维码扫码回流仍未验收。
- 右侧浏览器控制台仍有泛化 `Object` error 日志，页面不阻塞；建议后续做 H5 错误日志可读性优化。
- 发布脚本/API 重启命令仍缺少 readiness 等待重试，PM2 重启后立即 curl 可能短暂 502。

### 下一阶段应继续处理的事项

- 提交并推送本阶段 smoke 记录。
- 继续进入右侧浏览器商城商品详情、购物车、下单入口点击级复验，或先实现发布脚本/API ready 重试，减少部署时 502 空窗误报。

## 2026-06-24 - 线上 H5 租户修复部署复验

### 阶段名称

上线前部署配置 - 服务器拉取 `35f1de4` 后 API/H5 发布与线上商城复验小阶段。

### 本阶段完成内容

- 读取用户贴回的服务器执行输出，确认服务器已从 `2b1322d` 快进到 `35f1de4`。
- 服务器侧完成：
  - `npm --prefix apps/api run build`：通过。
  - `npm --prefix apps/mobile run build:h5`：通过，H5 dist 已清理并重建。
  - `WEBROOT=apps/mobile/dist/build/h5 ADMIN_WEBROOT=apps/admin/dist npm run publish:webroot`：通过，识别 H5/Admin 均为 Nginx 直出目录。
  - `$PM2 restart activity-api --update-env` 和 `$PM2 save`：通过，真实支付继续保持关闭。
- 服务器紧跟 PM2 重启后第一次 `curl https://rd.chaimen666.com/api/health/ready` 返回 `502 Bad Gateway`；随后本地复测确认 API 已恢复，判断为 PM2 重启瞬间的短暂空窗，不是持续故障。
- 线上 H5 当前静态包已更新为 `assets/index-4SYBy6so.js`。
- 线上商城公开接口 `tenantCode` 修复已生效，`/api/public/mall/products?tenantCode=qiwai-showcase&keyword=慢π&pageSize=20` 返回 200。
- 使用右侧浏览器打开线上 H5 首页和商城页，确认慢π新包和商城数据正常渲染。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 14:27:10 +08:00。
- 服务器输出摘要：
  - `git rev-parse --short HEAD`：`35f1de4`。
  - API 构建：通过。
  - H5 构建：通过。
  - 静态发布：通过，H5 webroot 为 `apps/mobile/dist/build/h5`，Admin root 为 `apps/admin/dist`。
  - PM2：`activity-api` 显示 `online`，进程列表已保存。
  - 首次 health curl：HTTP 502，发生在 PM2 重启后立即访问。
- 本地复测：
  - `https://rd.chaimen666.com/api/health/ready`：HTTP 200，`ready=true`、`api=up`、`database=up`、`release.commit=35f1de4`、`config=warning`。
  - `https://rd.chaimen666.com/api/public/mall/products?tenantCode=qiwai-showcase&keyword=慢π&pageSize=20`：HTTP 200，`code=0`，返回 1 条匹配商品，内容包含 `慢π`，不包含 `七维/奇外/电召`。
  - `https://rd.chaimen666.com/api/public/homepage?tenantCode=qiwai-showcase`：HTTP 200，内容包含 `慢π`，不包含 `七维/奇外/电召`。

### 浏览器验收结果

- 验证时间：2026-06-24 14:27:10 +08:00。
- 验证环境：线上 H5 `https://rd.chaimen666.com/?tenantCode=qiwai-showcase&t=1782282368006#/` 和商城页 `#/pages/mall/index?tenantCode=qiwai-showcase`，右侧浏览器。
- 浏览器验证步骤：
  - 打开 H5 首页，确认 `document.title=慢π`，脚本为 `/assets/index-4SYBy6so.js`。
  - 首页正文包含 `慢π演示中心`、`慢π商城`、`慢π好课`、已审核心得 `线上H5验收心得-1782280883411`。
  - 首页正文和标题不包含 `七维/奇外/电召`。
  - 打开 H5 商城页，确认可见 `慢π严选`、`慢π自营店`、秒杀商品、拼团商品、推荐商品列表。
  - 商城页未出现 `property tenantCode should not exist`、`502`、`Bad Gateway`、`请求失败`、`加载失败` 等阻塞文案。
- 输入的测试数据摘要：本阶段不新增业务数据，仅复用线上 `qiwai-showcase` 演示数据和上一阶段 post `18`。
- 通过项：服务器部署成功；API health 恢复；release 元数据对齐 `35f1de4`；H5 新包生效；商城 `tenantCode` 修复在线生效；旧品牌残留未复现。
- 发现的问题：
  - PM2 重启后立即访问 API 会短暂 502，建议后续发布脚本加入 readiness 等待重试，避免误判。
  - 右侧浏览器控制台仍有泛化 `Object` error 日志，页面不阻塞；建议后续单独优化 H5 前端错误日志可读性，定位是否来自 H5 定位失败、图片加载或被 catch 的请求对象。
- 是否达到可上线运营标准：本阶段达到线上试运营可用标准；真实支付/短信/证书/回调未补齐前仍需保持真实支付关闭，`config=warning` 属于预期。

### 遗留问题

- 真机微信 iOS/Android 分享、海报长按保存、二维码扫码回流仍未验收。
- 发布脚本缺少 API readiness 等待重试。
- H5 控制台泛化 `Object` error 需要后续变成可读错误日志并进一步定位。

### 下一阶段应继续处理的事项

- 提交并推送本阶段部署复验记录。
- 可继续执行线上 `npm run smoke:online-showcase`，或进入右侧浏览器商城商品详情、购物车、下单入口点击级复验。
- 后续新增一个小阶段：发布脚本/API 重启命令增加 health ready 重试，减少 502 空窗误报。

## 2026-06-24 - 线上 H5 租户修复提交推送

### 阶段名称

上线前部署配置 - 线上 H5 主流程收口修复提交与远端同步小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和工作区状态，确认上一阶段遗留为：本地商城 `tenantCode` DTO、H5 上传 header、演示 seed 和 smoke 文案修复尚未提交发布。
- 将本阶段受控文件提交到当前分支 `feature/qiwai-ui-experiment`：
  - `DEVELOPMENT_LOG.md`
  - `apps/api/src/modules/mall/mall.dto.ts`
  - `apps/mobile/src/api.ts`
  - `scripts/seed-online-showcase.mjs`
  - `scripts/smoke-community-sharing.mjs`
  - `scripts/smoke-online-showcase.mjs`
- 已推送远端，服务器可直接拉取最新提交继续部署。
- 未纳入 `.local-logs/`、`.local-mariadb/` 两个本地未跟踪目录。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 14:18:18 +08:00。
- `git commit -m "fix: harden online H5 tenant smoke flow"`：通过，生成提交 `d84ab71`。
- `git push origin feature/qiwai-ui-experiment`：通过，远端从 `3b36363` 更新到 `d84ab71`。
- `git status --short`：仅剩未跟踪 `.local-logs/`、`.local-mariadb/`。

### 浏览器验收结果

- 本阶段为本地提交与远端同步，不新增页面点击。
- 上一阶段右侧浏览器已验证线上 H5 新时间戳页面：`document.title=慢π`、顶部栏 `慢π`、脚本 `/assets/index-Dw1W2UkT.js`、无旧品牌残留、无控制台 error。

### 遗留问题

- 本条日志本身追加后仍需再提交并推送，确保服务器拉取时包含完整阶段记录。
- 服务器尚未拉取 `d84ab71` 并部署，因此线上商城 `tenantCode` 400 修复还未生效。

### 下一阶段应继续处理的事项

- 提交并推送本日志追加记录。
- 给出服务器部署命令：拉取最新分支、构建 API/H5、发布静态包、重启 PM2、验证商城公开接口、H5 首页和 health ready。

## 2026-06-24 - 线上 H5 主流程与商城租户参数收口

### 阶段名称

慢π上线前完整验收 - 线上 H5 点击级主流程、心得上传与商城租户参数修复小阶段。

### 本阶段完成内容

- 重新读取开发计划相关记录和最新 `DEVELOPMENT_LOG.md`，确认上一阶段已完成线上 H5 新静态包发布、慢π标题复验和 API release 元数据同步。
- 使用右侧浏览器接管线上 H5 标签页，先确认旧未刷新标签仍会停留在旧脚本 `assets/index-D6hAU5Ez.js` 和标题 `七维书院`；随后使用全新时间戳重新导航，确认线上当前 HTML 已加载新脚本 `assets/index-Dw1W2UkT.js`，标题和顶部栏均为 `慢π`。
- 继续完成线上 H5 用户侧主流程验收：
  - 登录演示用户 `13990000001`。
  - 打开活动列表和活动详情。
  - 对 `【演示】硬笔书法入门公开课` 完成报名，生成报名记录 `32`，刷新后报名状态保持 `报名成功 / 已付款`。
  - 使用已签到活动 `【演示】国学经典晨读体验营` 创建参与者心得 `18`，内容标记 `线上H5验收心得-1782280883411`。
  - 后台审核通过 post `18` 后，H5 首页和共修动态公开展示该心得。
  - 动态详情页可打开，海报入口可生成非空海报图；浏览器桌面环境无法替代微信长按保存，真机微信仍需后续补验。
- 单独补验线上心得图片上传接口：演示用户上传 1x1 PNG 成功，返回 `/uploads/community-posts/1782281401920-bf018ddc1044b.png`。
- 发现并修复演示共修活动旧地点回流问题：线上数据已将 `【演示】周末线下共修会` 的地点从旧文案更新为 `慢π演示空间`；同步修改 `seed:online-showcase`，以后重跑 seed 会更新既有记录，不再只在缺失时创建。
- 发现并修复验收工具/商城链路细节：
  - `smoke-community-sharing` 不再生成 `烟测书院共修空间`，改为 `慢π烟测共修空间`。
  - `smoke-online-showcase` 商城搜索关键词从 `书院` 改为 `慢π`。
  - 后端 `MallListQueryDto` 增加 `tenantCode`，避免 H5 给 `/public/mall/products` 等商城公开接口追加租户参数时，在生产严格校验下被误判为非法字段。
  - H5 上传头像、商城评价/售后图片、心得图片时补充 `x-tenant-code` 请求头，降低只依赖 query 参数的风险。
- 真实支付仍保持关闭，未改动 `REAL_PAYMENT_ENABLED=false` / `PAYMENT_SANDBOX_ENABLED=false` 的上线安全边界。

### 修改/新增的主要文件

- `apps/api/src/modules/mall/mall.dto.ts`
- `apps/mobile/src/api.ts`
- `scripts/seed-online-showcase.mjs`
- `scripts/smoke-community-sharing.mjs`
- `scripts/smoke-online-showcase.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 14:15:48 +08:00。
- `node --check scripts/seed-online-showcase.mjs`：通过。
- `node --check scripts/smoke-community-sharing.mjs`：通过。
- `node --check scripts/smoke-online-showcase.mjs`：通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过，真实支付、发布元信息、域名、上传、权限、财务对账等 guard 均通过。
- `git diff --check`：通过；仅提示 Windows 下 LF/CRLF 转换。
- 旧品牌扫描：`rg -n "七维书院|七维文化|七维|奇外|电召|烟测书院|书院商城|七维书院好课|七维文化大使" scripts apps/mobile/src apps/admin/src apps/api/src packages -g "!node_modules"` 仅剩：
  - `scripts/preflight-copy-risk-guard.mjs` 的风险词清单。
  - `scripts/seed-online-showcase.mjs` 的旧数据清理条件。

### 浏览器验收结果

- 验证时间：2026-06-24 14:15:48 +08:00。
- 验证环境：线上 H5 `https://rd.chaimen666.com/?tenantCode=qiwai-showcase&t=1782281363397#/`，右侧浏览器；线上 API `https://rd.chaimen666.com/api`。
- 浏览器验证步骤：
  - 打开线上 H5 首页，确认 `document.title=慢π`，顶部栏标题为 `慢π`，当前脚本为 `/assets/index-Dw1W2UkT.js`。
  - 检查首页正文和标题不包含 `七维/奇外/电召`，可见 `慢π演示中心`、`慢π商城`、`慢π好课`、`寻找100位慢π大使`。
  - 活动列表、活动详情、登录、报名、报名详情刷新、共修动态、心得详情、海报入口在本阶段线上点击验收中已走通。
  - 首页可见已审核心得 `线上H5验收心得-1782280883411`。
  - 读取控制台 error 日志：无。
- 输入的测试数据摘要：
  - 报名：`线上验收用户A / 13990000001 / showcase_acceptance`，报名记录 `32`。
  - 心得：post `18`，标记 `线上H5验收心得-1782280883411`，审核备注 `线上H5最终验收通过`。
  - 上传：`online-h5-upload-*.png`，返回 `/uploads/community-posts/1782281401920-bf018ddc1044b.png`。
- 通过项：线上 H5 新包生效；旧品牌在当前新页面消失；用户登录、报名、刷新后状态、心得审核公开展示、图片上传、海报入口均可用；控制台无明显前端 error。
- 发现的问题：
  - 未刷新旧标签页仍可能停留在旧浏览器内存脚本和旧标题，需要用户刷新或打开带时间戳的新链接；当前线上 HTML 已是新包。
  - 商城公开接口在当前线上 API 尚未部署本阶段 DTO 修复前，`tenantCode` 查询参数仍可能触发 400；本地已修复并通过构建，需随下一次服务器部署生效。
  - 真机微信长按保存海报、朋友圈卡片和扫码回流仍未验收。
- 是否达到可上线运营标准：H5 主流程和心得分享核心链路已达到线上试运营可用状态；商城租户参数修复需部署后复验；真实在线支付、短信、证书、回调资料未补齐前，仍只能按“试运营 / 真实支付关闭”标准上线。

### 遗留问题

- 本阶段后端商城 DTO 与 H5 上传 header 修复尚未发布到服务器，需要提交并让服务器拉取构建、重启 API、重新发布 H5。
- 真机微信 iOS/Android 下的分享、海报长按保存、二维码扫码回流仍需 HTTPS 线上链接实测。
- `/api/health/ready` 的 `config=warning` 仍符合当前真实支付、短信、证书、回调未补齐状态。

### 下一阶段应继续处理的事项

- 提交并推送本阶段修复；服务器拉取后执行 API/H5 构建、发布静态包、PM2 重启。
- 部署后复验：
  - `https://rd.chaimen666.com/api/public/mall/products?tenantCode=qiwai-showcase&keyword=慢π&pageSize=20`
  - H5 商城首页、商品详情、加入购物车/下单入口。
  - H5 心得图片上传和动态发布页面。
- 若部署复验通过，继续进入真机微信验收清单；真实支付资料补齐前继续保持真实支付关闭。

## 2026-06-24 - API release 元数据同步复验

### 阶段名称

上线前部署配置 - 线上 API release commit 与 H5 静态包版本对齐小阶段。

### 本阶段完成内容

- 读取线上服务器执行输出，确认服务器已拉取最新提交 `2b1322d`。
- 使用 PM2 `restart activity-api --update-env` 重启 API，并显式传入：
  - `BUILD_COMMIT=$(git rev-parse --short HEAD)`
  - `BUILD_TIME=$(date -Iseconds)`
  - `PUBLIC_H5_ORIGIN=https://rd.chaimen666.com`
  - `PUBLIC_ADMIN_ORIGIN=https://rd.chaimen666.com/admin`
  - `PUBLIC_API_ORIGIN=https://rd.chaimen666.com`
  - `CORS_ORIGIN=https://rd.chaimen666.com`
  - `REAL_PAYMENT_ENABLED=false`
  - `PAYMENT_SANDBOX_ENABLED=false`
- `pm2 save` 成功保存当前进程列表。
- 线上 `/api/health/ready` 的 release 元数据已与当前代码提交对齐。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 13:47:52 +08:00。
- 服务器验证摘要：
  - `git pull --ff-only origin feature/qiwai-ui-experiment`：从 `f7649be` 更新到 `2b1322d`。
  - `$PM2 restart activity-api --update-env`：成功，`activity-api` 状态 `online`。
  - `$PM2 save`：成功保存到 `/root/.pm2/dump.pm2`。
  - `curl -i https://rd.chaimen666.com/api/health/ready`：HTTP 200。
  - 返回数据：`ready=true`、`api=up`、`database=up`、`config=warning`。
  - release 信息：`commit=2b1322d`、`buildTime=2026-06-24T13:47:49+08:00`。
  - 真实支付仍保持关闭：`REAL_PAYMENT_ENABLED=false`、`PAYMENT_SANDBOX_ENABLED=false`。

### 浏览器验收结果

- 本阶段为 API release 元数据同步，不新增页面点击。
- 上一阶段线上 H5 浏览器复验已经通过：标题和顶部栏均为 `慢π`，加载新脚本 `/assets/index-Dw1W2UkT.js`，无前端 error。

### 遗留问题

- `/api/health/ready` 仍显示 `config=warning`，符合当前真实支付、短信、证书、回调等生产资料尚未全部补齐的上线门禁状态。
- 真实在线支付未完成验收前，仍不能开放真实微信/支付宝支付正式运营。

### 下一阶段应继续处理的事项

- 继续线上 H5 核心主流程点击验收：首页、活动详情、登录、报名、我的报名、共修动态、发布心得、后台审核、公开展示、海报入口。
- 待 HTTPS 真机微信环境和生产资料补齐后，再补 iOS/Android 微信内分享、海报长按保存、二维码回流，以及真实支付小额支付/退款/回调验收。

## 2026-06-24 - 线上 H5 旧标题修复复验

### 阶段名称

上线前部署配置 - 线上 H5 新静态包发布与慢π标题复验小阶段。

### 本阶段完成内容

- 读取服务器执行输出，确认宝塔防篡改/文件保护关闭后，服务器已成功拉取 `f7649be`。
- 服务器手动清理旧文件属性后，后台与 H5 构建均成功：
  - `npm --prefix apps/admin run build`：通过。
  - `npm --prefix apps/mobile run build:h5`：通过。
  - `npm run publish:webroot`：识别 H5/Admin 构建产物已是 Nginx 直出目录。
- 线上 H5 dist 主包已更新为 `assets/index-Dw1W2UkT.js`。
- 线上 H5/Admin 构建产物旧品牌词检查通过：未发现 `七维书院/七维文化/七维/奇外/电召`。
- Nginx 配置检查和 reload 成功。
- 使用右侧浏览器打开带时间戳的线上 H5，确认旧标题残留已消失。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 13:40:56 +08:00。
- 服务器验证摘要：
  - `HEAD=f7649be`。
  - `lsattr apps/mobile/dist/build/h5/assets/AdminBottomNav-kku8XPez.css`：文件无不可变属性，仅显示普通 extents 标记。
  - `npm --prefix apps/admin run build`：通过；仅保留既有 VueUse pure 注释与大 chunk 提醒。
  - `npm --prefix apps/mobile run build:h5`：通过。
  - `grep -o 'assets/index-[^"]*\.js' apps/mobile/dist/build/h5/index.html`：`assets/index-Dw1W2UkT.js`。
  - `grep -R "七维书院\|七维文化\|七维\|奇外\|电召" apps/mobile/dist/build/h5 apps/admin/dist`：无命中，输出 `OK 没有旧品牌残留`。
  - `/www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload`：通过。
  - 外网 HTML 检查：加载 `/assets/index-Dw1W2UkT.js` 和 `/assets/index-BVheYeKY.css`。
  - `curl -i https://rd.chaimen666.com/api/health/ready`：HTTP 200，`ready=true`、`api=up`、`database=up`。

### 浏览器验收结果

- 验证环境：线上 H5 `https://rd.chaimen666.com/?tenantCode=qiwai-showcase&t=1782279721506#/`，右侧浏览器。
- 页面实际结果：
  - `document.title`：`慢π`。
  - H5 顶部栏标题：`慢π`。
  - 当前脚本：`/assets/index-Dw1W2UkT.js`。
  - 页面文本包含 `慢π`。
  - 页面文本和标题不包含 `七维`、`奇外`、`电召`。
  - 浏览器控制台 error：无。

### 遗留问题

- API `/api/health/ready` 的 `release.commit` 仍显示旧值 `fb0a2e7`、`buildTime=2026-06-24T13:02:31+08:00`；这不影响本次 H5 静态标题修复，但会影响线上 release 元数据准确性。

### 下一阶段应继续处理的事项

- 在服务器重启 `activity-api --update-env`，同步 `BUILD_COMMIT=f7649be` 和最新 `BUILD_TIME`，让健康检查 release 信息与当前代码一致。
- 继续用线上 H5 走核心用户流程，确认首页、活动详情、报名、共修动态、发布心得、海报入口均在新包下正常。

## 2026-06-24 - H5 直出目录 EPERM 清理修复

### 阶段名称

上线前部署配置 - H5 直出目录旧静态文件 `EPERM` 解锁清理小阶段。

### 本阶段完成内容

- 重新读取 `docs/开发方案与二次开发说明.md`、`docs/线上部署结构与发布说明.md` 和最新 `DEVELOPMENT_LOG.md`。
- 根据服务器输出重新确认线上结构：
  - H5 根路径直接服务 `apps/mobile/dist/build/h5`。
  - 后台 `/admin/` 直接 alias 到 `apps/admin/dist`。
  - 当前 `七维书院` 残留的主要原因是 H5 新包构建未跑完，外网仍加载旧静态包。
- 针对服务器 `EPERM: operation not permitted, unlink .../assets/AdminBottomNav-kku8XPez.css` 修复 H5 构建前清理脚本：
  - 删除旧文件或目录遇到 `EPERM/EACCES` 时，自动尝试 Linux `chattr -i -a` 清除不可变/追加属性。
  - 同时尝试放宽当前文件/目录权限并重试删除。
  - 保留“不删除 H5 根目录，只清空内部文件”的线上直出目录安全边界。
  - 自动解锁后仍失败时，错误信息提示检查 `lsattr/chattr` 和父目录权限。
- 补充 `docs/线上部署结构与发布说明.md`，加入 `EPERM` 手动排查命令和禁止删除 H5 根目录说明。
- 补充 `docs/开发方案与二次开发说明.md` 升级记录，说明本次线上旧标题/旧静态包排查结论。

### 修改/新增的主要文件

- `scripts/clean-mobile-h5-dist.mjs`
- `docs/线上部署结构与发布说明.md`
- `docs/开发方案与二次开发说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 13:32:54 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，构建前清理脚本在本地成功清空并重建 H5 dist。
- `rg -n "七维书院|七维文化|七维|奇外|电召" apps/mobile/dist/build/h5 apps/admin/dist apps/mobile/src apps/admin/src apps/api/src packages -g "!node_modules"`：无命中，退出码 1 表示未发现旧品牌词。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换。

### 浏览器验收结果

- 本阶段为服务器构建脚本和部署文档修复，线上浏览器最终复验仍需服务器拉取本次提交并重新执行 H5 构建。
- 复验重点：外网 HTML 不再引用旧 `assets/index-D6hAU5Ez.js`，右侧浏览器 `document.title`、H5 顶部栏和页面内容显示 `慢π`。

### 遗留问题

- 需要服务器拉取本次提交后重新执行 H5 构建；若旧文件存在不可变属性，脚本会自动尝试解锁，仍失败时需按文档手动执行 `lsattr/chattr/chmod`。
- 构建成功前，线上 H5 仍可能继续显示旧标题。

### 下一阶段应继续处理的事项

- 推送本次修复后，在服务器执行最新发布命令并检查外网主包 hash。
- 服务器构建通过后，使用右侧浏览器打开带时间戳的线上 H5，确认无 `七维` 旧标题残留，并将浏览器验收结果继续写入 `DEVELOPMENT_LOG.md`。

## 2026-06-24 - 共修打卡后台同日唯一性校验

### 阶段名称

慢π H5 共修打卡 - 后台同商家同日任务唯一性校验与重复提示小阶段。

### 本阶段完成内容

- 按规则重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 针对上一阶段发现的同商家同日期 4 条重复打卡任务，补齐后台治理能力。
- 后端 `createCheckinTask` / `updateCheckinTask` 增加同商家同日期唯一性校验：
  - 必须填写打卡日期。
  - 平台任务按 `tenantId IS NULL + date` 校验。
  - 商家任务按 `tenantId + date` 校验。
  - 新增或编辑到重复日期时返回清晰错误，提示编辑已有任务或删除重复任务。
- 后台 `慢π运营 -> 打卡任务` 增加重复任务提示：
  - 检测已有列表中同商家同日重复任务。
  - 顶部显示重复组数和处理建议。
  - 表格新增“重复状态”列，历史重复任务标记为“重复”。
- 后台保存打卡任务前增加日期必填和本地重复预检查，减少无效请求。

### 修改/新增的主要文件

- `apps/api/src/modules/courses/courses.service.ts`
- `apps/admin/src/views/Community.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 09:58:02 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin/community`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse pure 注释与大 chunk 提醒。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`、`config=warning`。
- 接口验证：
  - 平台管理员登录成功。
  - 查询到演示租户 `qiwai-showcase`。
  - 创建测试打卡任务：`tenant=qiwai-showcase`、`date=2027-12-31`、返回 id `5`。
  - 再次创建同租户同日期任务：按预期返回 `400 Bad Request`，重复任务未写入。
  - 测试任务 id `5` 已删除清理。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check -- apps/api/src/modules/courses/courses.service.ts apps/admin/src/views/Community.vue DEVELOPMENT_LOG.md`：通过；仅提示 Windows 工作区 LF/CRLF 转换。

### 浏览器验收结果

- 打开后台 `慢π运营 -> 打卡任务`。
- 页面显示“检测到 1 组同日重复打卡任务，请保留一条并删除多余记录；系统已阻止继续新增同商家同日期任务。”
- 表格中当前 4 条 `2026-06-24 / 慢π演示中心` 历史任务均标记为“重复”。
- 页面控制台无前端 `error` 日志。

### 遗留问题

- 本阶段不自动删除或合并历史重复任务，避免误删运营数据；需要运营在后台人工保留一条并删除多余记录。
- 数据库层尚未加唯一索引，因为现有历史重复数据会导致迁移失败；待历史数据清理后，可作为后续数据库约束加固阶段处理。

### 下一阶段应继续处理的事项

- 继续按上线计划推进 HTTPS 真机微信验收和生产资料门禁。
- 若历史重复任务已由运营确认清理，可增加数据库唯一索引或迁移脚本，进一步防止绕过 API 写入重复任务。

## 2026-06-24 - 上线前微信 H5 真机验收助手

### 阶段名称

慢π上线前验收 - 后台微信 H5 真机验收助手与保存持久化小阶段。

### 本阶段完成内容

- 按规则重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 在后台 `系统设置 -> 部署配置` 增加“微信 H5 真机验收”区域，用于生成 H5 首页、活动列表、共修动态、发布心得、我的心得、今日打卡等真机验收入口。
- 新增验收租户码、验收状态、验收时间、验收备注字段，并生成可复制的微信真机验收记录模板。
- 同步更新 `docs/wechat-share-poster-acceptance.md`，补充后台验收助手入口、可做事项和安全边界。
- 修复验收字段保存后刷新丢失的问题：`launchConfig` 新增后台元数据白名单，验收字段可持久化，但不写入 `.env.production`。
- 重启本地 `3100` API，使修复后的构建产物立即服务于后台浏览器验收。

### 修改/新增的主要文件

- `apps/admin/src/views/SystemSettings.vue`
- `apps/api/src/shared/launch-config.ts`
- `docs/wechat-share-poster-acceptance.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 09:51:44 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin/system-settings`
  - 演示租户：`qiwai-showcase`
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse pure 注释与大 chunk 提醒。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check -- apps/admin/src/views/SystemSettings.vue apps/api/src/shared/launch-config.ts docs/wechat-share-poster-acceptance.md DEVELOPMENT_LOG.md`：通过；仅提示 Windows 工作区 LF/CRLF 转换。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`、`config=warning`。

### 浏览器验收结果

- 打开后台 `系统设置 -> 部署配置`，确认“微信 H5 真机验收”区域可见。
- 验证当前 H5/API HTTPS 检测、验收租户码、验收状态提示和真机验收入口列表可见。
- 输入验收时间 `2026-06-24 09:55` 和备注：本地后台验收助手复验，真实 iOS/Android 微信长按保存、朋友圈和扫码回流仍需 HTTPS 真机执行。
- 点击“保存设置”后页面提示“系统设置已保存”，无前端 error。
- 刷新后台并重新进入“部署配置”，验收时间、验收备注、租户码和验收模板中的时间均保留，确认持久化修复生效。
- 点击“复制验收模板”，剪贴板内容包含验收标题、验收时间和今日打卡入口，页面提示“已复制微信真机验收模板”。

### 遗留问题

- 本阶段只完成后台辅助工具和本地浏览器验证，不能替代真实手机微信验收。
- 真实 iOS/Android 微信里的活动分享、心得海报长按保存、二维码扫码回流、朋友圈卡片仍需在 HTTPS 预发或生产域名上执行。
- 真实支付、短信、证书和回调资料未补齐前，仍需保持真实支付关闭。

### 下一阶段应继续处理的事项

- 继续按上线计划推进 HTTPS 真机微信验收和生产资料门禁。
- 若继续收敛本地可修复问题，优先处理共修打卡后台“同商家同日任务唯一性校验/重复任务合并提示”，避免重复任务再次影响运营数据。

## 2026-06-24 - H5 今日打卡同类细节复查与真实人数统计收敛

### 阶段名称

慢π H5 共修打卡 - 同类日期、重复任务与人数统计细节复查小阶段。

### 本阶段完成内容

- 按规则重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 继续复查上一阶段“个人打卡状态、今日全站人数、月度日历”同类问题。
- 源码扫描未发现其它 `YYYY-MM-31` 固定月末日期写法。
- 本地数据库发现今日同商家存在 4 条重复打卡任务缓存：`1:2,2:0,3:0,4:0`，真实 `community_checkins` 当日记录为 2 条；这会导致公开端如果读到缓存为 0 的重复任务，页面人数再次偏差。
- 后端公开端今日打卡接口改为：
  - 今日任务选择使用确定性查询，不依赖 TypeORM `findOne` 的不稳定返回顺序。
  - 今日完成人数统一从 `community_checkins` 按 `date + tenantId` 实时统计。
  - 重复打卡返回既有记录，不增加人数。
  - 提交打卡后把当前任务缓存人数同步为真实统计值。
- 复查本地 H5 验收环境，发现当前 `5273` dev server 默认代理仍指向 `18080`，浏览器会读到旧后端而显示“暂无今日打卡任务”；已将本轮验收用 H5 dev server 重启为 `VITE_DEV_API_PROXY=http://127.0.0.1:3100`，保证浏览器与接口验证使用同一个新 API。

### 修改/新增的主要文件

- `apps/api/src/modules/courses/public-courses.controller.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 08:34:15 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - H5：`http://127.0.0.1:5273`
  - H5 代理：`VITE_DEV_API_PROXY=http://127.0.0.1:3100`
  - 演示商家：`qiwai-showcase` / 慢π演示中心。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`、`config=warning`。
- 数据库复查：
  - `checkin_tasks` 中 `tenantId=23/date=2026-06-24` 存在 4 条任务缓存，分别为 `1:2,2:0,3:0,4:0`。
  - `community_checkins` 中 `tenantId=23/date=2026-06-24` 真实打卡记录为 2 条。
- 接口复验：
  - 演示用户 `13800000001 / 本地演示用户` 登录成功，用户 id `104`。
  - `GET /public/checkin/today?tenantCode=qiwai-showcase`：返回 `taskId=1`、`checkedToday=true`、`checkedDays=[24]`、`completedCount=2`。
  - 重复调用 `POST /public/checkin/today/complete?tenantCode=qiwai-showcase`：返回既有打卡 id `2`，`completedCount` 仍为 `2`。
  - 通过 H5 代理访问 `http://127.0.0.1:5273/api/public/checkin/today?tenantCode=qiwai-showcase`：`date=2026-06-24`、`today=2026-06-24`、`completedCount=2`，与直连 `3100` 一致。
- 右侧浏览器复验：
  - 共修首页显示“你今天已完成打卡”“今日已有 2 位同学完成打卡”“查看打卡记录”，不再显示“暂无今日打卡任务”。
  - 进入“今日打卡”详情页后显示“你今天已完成打卡”“已完成”“今日同学打卡 2”“你本月已打卡 1”。
  - 日历 24 日 DOM class 同时包含 `active` 和 `today`。
  - 本轮 H5 复验未发现新的前端 `error` 日志。

### 遗留问题

- 后台仍允许同一商家同一天存在多条打卡任务，本阶段先保证公开端展示和打卡人数不被重复任务缓存影响；若要彻底治理，需要后续增加后台同日唯一性校验或合并重复任务。
- 本地 H5 dev server 默认代理是 `http://localhost:18080`，本地验收如果使用直启 API `3100`，必须显式设置 `VITE_DEV_API_PROXY=http://127.0.0.1:3100`，否则浏览器可能读到旧后端。

### 下一阶段应继续处理的事项

- 若继续强化共修运营后台，优先处理“同商家同日打卡任务唯一性校验/重复任务合并提示”。
- 继续按上线计划补齐 HTTPS 真机微信验收与生产资料门禁；真实支付、短信、证书、回调资料未补齐前仍保持真实支付关闭。

## 2026-06-24 - H5 今日打卡状态一致性修复

### 阶段名称

慢π H5 共修打卡 - 个人打卡状态、全站统计与月度日历一致性修复小阶段。

### 本阶段完成内容

- 按规则重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 使用右侧浏览器复现用户反馈：共修首页显示“今日已有 1 人完成打卡 / 去打卡”，详情页显示“本月已打卡 0 天”，容易把全站打卡人数误解为当前用户已打卡。
- 修正 H5 共修首页打卡卡片：
  - 拆分“你今天是否完成打卡”和“今日已有多少位同学完成打卡”。
  - “我的今日进度”只由当前用户 `checkedToday` 决定，不再被全站 `completedCount` 带到 67%。
  - 已完成后按钮改为“查看打卡记录”，允许回到详情页看日历。
- 修正 H5 今日打卡详情页：
  - 增加个人状态提示。
  - 拆分展示“今日同学打卡”和“你本月已打卡”。
  - 完成后日历当天显示 `active today`。
- 修正后端 `/public/checkin/today` 月度打卡查询：
  - 原逻辑把本月结束日硬写为 `YYYY-MM-31`，6 月、2 月、4 月等月份会在 MySQL 预编译参数下查不到记录。
  - 改为按实际月份计算月末日期。
  - 用户日打卡和月度打卡改为显式按 `userId/date/tenantId` 查询，避免 relation where 在该表上查回不稳定。
- 重启本地 API `3100` 服务，使新后端逻辑生效。

### 修改/新增的主要文件

- `apps/api/src/modules/courses/public-courses.controller.ts`
- `apps/mobile/src/pages/community/index.vue`
- `apps/mobile/src/pages/community/checkin.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 08:19:13 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - H5：`http://127.0.0.1:5273`
  - 演示商家：`qiwai-showcase` / 慢π演示中心。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`。
- H5 接口复验：
  - 登录演示用户 `13800000001 / 本地演示用户`，用户 id `104`。
  - `GET /public/checkin/today?tenantCode=qiwai-showcase`：修复后返回 `checkedToday=true`、`checkedDates=["2026-06-24"]`、`checkedDays=[24]`、`completedCount=2`。
  - 重复调用 `POST /public/checkin/today/complete?tenantCode=qiwai-showcase`：返回既有打卡 id `2`，未重复增加 `completedCount`。
- 右侧浏览器复验：
  - 共修首页刷新后显示“你今天已完成打卡”“我的今日进度 100%”“今日已有 2 位同学完成打卡”“查看打卡记录”。
  - 今日打卡详情页刷新后显示“你今天已完成打卡”“已完成”“今日同学打卡 2”“你本月已打卡 1”。
  - 日历 24 日 DOM class 为 `calendar-day active today`。
- `git diff --check -- apps/api/src/modules/courses/public-courses.controller.ts apps/mobile/src/pages/community/index.vue apps/mobile/src/pages/community/checkin.vue DEVELOPMENT_LOG.md`：通过；仅有 Windows 工作区 LF/CRLF 转换提示。

### 遗留问题

- 本地测试数据中今日打卡任务存在多条同日期记录，当前公开端仍沿用既有 `findOne` 选择结果；本阶段没有扩大到“后台防止同日重复任务”的范围。
- 浏览器控制台仍可见自动化工具自身的 clipboard bridge 提示，不是应用前端 error。

### 下一阶段应继续处理的事项

- 若运营侧希望后台严格禁止同一商家同一天创建多个打卡任务，可作为后续小阶段增加唯一性校验和后台提示。
- 继续按上线验收计划补充 HTTPS 真机微信验收与生产资料门禁；真实支付、短信、证书、回调资料未补齐前仍保持真实支付关闭。

## 2026-06-24 - 上线结论与生产支付门禁收口

### 阶段名称

慢π上线前完整验收 - 线上演示预发布门禁、试运营结论与真实支付阻塞收口小阶段。

### 本阶段完成内容

- 按规则重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 运行线上演示预发布门禁，确认真实微信支付、商城真实支付、退款、回调、代理/结算转账证据未补齐时不会误放行。
- 明确当前上线结论：
  - H5 + 后台 + 免费报名/线下收款/余额支付：本地验收已通过，可继续进入试运营收口。
  - 真实微信/支付宝在线支付正式运营：仍为 `NO-GO`，必须保持关闭。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:43:13 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin`
  - H5：`http://127.0.0.1:5273`
- `$env:API_BASE='http://127.0.0.1:3100/api'; $env:PRELAUNCH_ALLOW_HTTP='true'; $env:SHOWCASE_ADMIN_USERNAME='admin'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'; $env:SHOWCASE_PASSWORD='Qiwai123456'; npm.cmd run prelaunch:online-showcase`：按预期返回 `NO-GO`。
- 预发布门禁通过项摘要：
  - 多商户商城 smoke 已标记通过：`deploy/mall-multi-merchant-smoke-result.json`。
  - 多商户商城 smoke 结果仍在有效期内：约 6.4 小时前。
  - API 地址为 `http://127.0.0.1:3100/api`。
  - 平台管理员登录成功。
  - 演示商家存在：`慢π演示中心(qiwai-showcase)`。
  - 前台当前可用支付方式：余额支付、线下收款。
- 预发布门禁阻塞摘要：
  - `deploy/real-payment-smoke-result.json` 不满足 `passed=true`，真实支付联调结果过期。
  - 缺少微信 Native/H5/JSAPI、小额支付创建、支付回调、重复回调、金额异常回调、退款、退款通知、退款查询、账单、代理账户路由、商城支付、商城退款、商城商户直收路由防串店、代理转账和回滚证据。
  - 商城真实微信支付下单/回调路由尚未接入服务商，不能正式开放商城微信支付。
  - 后台微信支付真实就绪失败，`WECHAT_PAY_PRIVATE_KEY_PATH` 和 `WECHAT_PAY_PLATFORM_CERT_PATH` 文件不可读取。
  - 前台商城微信支付不可正式开放，门禁要求保持 `REAL_PAYMENT_ENABLED=false`。

### 浏览器验证的主要步骤

- 本小阶段没有新增浏览器点击；浏览器主流程已在前序两个小阶段完成：
  - H5 活动报名、我的订单、心得详情、海报生成、共修动态列表通过。
  - 后台平台超管、城市合伙人、店铺运营、财务、签到角色通过。

### 输入的测试数据摘要

- 本小阶段未新增业务数据，沿用演示商家 `qiwai-showcase` 和当前预发布门禁配置。

### 通过项

- 真实支付资料缺失时，系统预发布门禁不会误放行。
- 余额支付和线下收款仍被识别为当前前台可用支付方式。
- 本地 H5 主流程、后台多角色和自动化 smoke 结果已经支撑 H5 试运营。

### 发现的问题

- 真机微信验收仍需在 HTTPS 域名上用 iOS/Android 微信执行，右侧浏览器不能替代朋友圈卡片、长按保存、二维码扫码回流等能力。
- 真实支付、短信、证书、回调、备份/监控和真实小额支付/退款证据仍未补齐。
- 当前不能宣称“真实在线支付正式全量运营”，只能按“关闭真实支付的 H5 试运营”口径推进。

### 是否达到可上线运营标准

- 达到本地 H5 试运营验收标准：H5 点击级主流程、后台多角色、自动化门禁和样板 smoke 均通过。
- 未达到真实在线支付正式运营标准：预发布门禁 `NO-GO`，共 92 个真实支付相关阻塞项。

### 遗留问题

- 需要用户/运营侧补齐 HTTPS 预发或生产域名，并在真实 iOS/Android 微信内完成 H5 分享和海报验收。
- 需要用户/运营侧补齐真实支付、短信、证书、回调 URL、小额支付/退款/账单/代理转账证据后，再运行真实支付 smoke 和 `prelaunch:online-showcase`。
- 真实支付补齐前必须保持：
  - `REAL_PAYMENT_ENABLED=false`
  - `PAYMENT_SANDBOX_ENABLED=false`

### 下一阶段应继续处理的事项

- 当前计划内本地开发与验收已经收口；下一步依赖外部生产资料和真机微信环境。
- 待 HTTPS 域名、微信真机环境、真实支付/短信资料补齐后，继续执行真机微信验收和生产预发布验收。

## 2026-06-24 - 自动化门禁与 smoke 复跑

### 阶段名称

慢π上线前完整验收 - 自动化 preflight、心得分享 smoke 与慢π样板 smoke 复跑小阶段。

### 本阶段完成内容

- 按规则重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 复核 API readiness。
- 复跑上线前静态门禁、文案门禁、权限门禁、支付/商城/租户/导出/上传/财务对账等 preflight guards。
- 复跑 `git diff --check`。
- 复跑用户心得分享 smoke，覆盖参与资格、图片、提交审核、后台审核、公开展示、分享计数和装修模块读取。
- 重新执行 `seed:qiwai-demo` 准备慢π杭州、苏州、成都三城样板数据。
- 复跑 `smoke:qiwai-demo`，覆盖三城租户隔离、报名、线下收款确认、签到、标签、活动复盘、财务可见、退款、代理结算、平台监管和活动审核流。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:41:53 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin`
  - H5：`http://127.0.0.1:5273`
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`，`config=warning`。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过，无空白错误；仅保留 Windows 工作区 LF/CRLF 转换警告。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过。
- `npm.cmd run seed:qiwai-demo`：通过，慢π杭州、苏州、成都城市合伙人样板数据已准备完成。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:qiwai-demo`：通过。

### 输入的测试数据摘要

- `smoke:community-sharing` 保留数据：
  - 活动 id：`123`
  - 报名 id：`174`
  - 参与者心得 post id：`34`
  - 首页装修模块 id：`231`
- `seed:qiwai-demo` 保留/刷新账号：
  - 慢π杭州城市合伙人：`qiwai_hz_admin / qiwai_hz_ops / qiwai_hz_finance / qiwai_hz_checkin`
  - 慢π苏州城市合伙人：`qiwai_sz_admin / qiwai_sz_ops / qiwai_sz_finance / qiwai_sz_checkin`
  - 慢π成都城市合伙人：`qiwai_cd_admin / qiwai_cd_ops / qiwai_cd_finance / qiwai_cd_checkin`
  - 默认密码：`Qiwai123456`

### 通过项

- 上线前静态门禁全部通过，慢π品牌词、公益合规文案、真实支付关闭门禁仍有效。
- 心得分享与 H5 装修自动化闭环通过。
- 慢π三城样板业务闭环通过。
- 当前本地 API、后台和 H5 均处于可运行、可测试、可继续开发状态。

### 发现的问题

- `git diff --check` 仍输出大量 Windows 工作区 LF/CRLF 转换提示，但没有空白错误。
- `ready` 的 `config` 仍为 `warning`，符合当前真实生产支付、短信、证书、回调资料未补齐的状态。
- 真机微信和真实支付预发证据仍未完成。

### 是否达到可上线运营标准

- 本地 H5 点击级主流程、后台多角色复核和自动化 smoke 均已通过，达到“可进入 H5 试运营收口”的本地验收状态。
- 不能宣称真实在线支付正式全量运营：真实支付、短信、证书、回调、备份/监控和真实小额支付/退款证据仍需补齐。

### 遗留问题

- 需要在 HTTPS H5 域名上完成 iOS/Android 微信真机验收：活动分享、心得详情海报、长按保存、二维码扫码回流、朋友圈卡片。
- 真实支付仍需保持 `REAL_PAYMENT_ENABLED=false`、`PAYMENT_SANDBOX_ENABLED=false`，直到真实商户资料和预发证据补齐。
- 浏览器无法手动操作系统文件选择框，用户心得图片上传的纯 UI 验收需要真机或可控文件选择能力补做；当前由自动化 smoke 覆盖。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，进入“上线结论与真机微信验收指引收口”小阶段；若用户提供 HTTPS 预发域名和真实资料，再继续生产验收。

## 2026-06-24 - 后台多角色最终复核

### 阶段名称

慢π上线前完整验收 - 后台平台超管、城市合伙人、店铺运营、财务与签到多角色权限复核小阶段。

### 本阶段完成内容

- 按规则重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 使用右侧浏览器继续复核后台多角色，不新建业务范围。
- 平台超管 `admin / Admin123456`：
  - 打开全局数据看板、共修动态、全局报名、全局订单、公益池、文化大使招募、志愿者档案、前台全局装修、系统设置。
  - 确认平台端菜单完整，装修页包含应用模板、参与者心得、精选心得、活动口碑墙、公益公示摘要、课程推荐、商城精选、品牌故事入口等模块。
- 城市合伙人管理员 `showcase_admin / Qiwai123456`：
  - 打开活动、报名、订单、财务、签到、首页装修、商城商品、系统设置。
  - 直接访问平台商家管理 `/tenants` 被路由守卫挡回商家数据看板。
- 店铺运营账号 `showcase_store_owner / Qiwai123456`：
  - 登录后只显示工作台、商城管理、系统设置分组。
  - 打开商品、订单、售后、营销、收款配置、经营统计等商城页面。
  - 直接访问活动管理 `/activities` 被路由守卫挡回商城运营工作台。
- 财务账号 `showcase_finance / Qiwai123456`：
  - 打开财务概览、订单、财务对账、商城财务、代理结算。
  - 直接访问前台装修 `/homepage-builder` 被路由守卫挡回财务概览。
- 签到账号 `showcase_checkin / Qiwai123456`：
  - 打开签到核销、活动列表、报名查询。
  - 直接访问订单 `/orders` 和前台装修 `/homepage-builder` 被路由守卫挡回签到账号允许的工作台。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:39:54 +08:00。
- 验证环境：
  - 后台：`http://127.0.0.1:5174/admin`
  - API：`http://127.0.0.1:3100/api`
  - 演示商家：`qiwai-showcase` / 慢π演示中心。
- 平台超管关键页面：通过，9 个关键页面均可打开且命中预期标题/内容。
- 城市合伙人管理员关键页面：通过，8 个商家端关键页面均可打开，平台端 `/tenants` 访问被拒。
- 店铺运营账号商城页面：通过，商城商品、订单、售后、营销、收款配置、经营统计均可打开，活动管理访问被拒。
- 财务账号：通过，财务/订单/商城财务/代理结算可打开，装修页访问被拒。
- 签到账号：通过，签到核销、活动列表、报名查询可打开，订单和装修页访问被拒。
- 本阶段各后台角色 `tab.dev.logs({ levels: ['error'] })` 未发现新的应用前端 error。

### 输入的测试数据摘要

- 本阶段未新增业务数据，仅使用既有验收账号和上一阶段保留的报名数据 `OD1782257487708173` 辅助核对订单/报名可见性。

### 通过项

- 平台超管具备全局监管、公益招募、装修和系统设置入口。
- 城市合伙人管理员只能看到商家端菜单，不能进入平台商家管理。
- 店铺运营账号聚焦商城工作台和商城管理，不能进入活动管理。
- 财务账号能查看订单财务和商城财务，不能进入装修编辑。
- 签到账号能进行现场查询/核销，不具备订单财务和装修编辑权限。

### 发现的问题

- 店铺运营账号菜单中显示“商家端 · 系统设置”分组，但 `/system-settings` 运营设置页没有授予该账号访问权限，会按最小权限回到商城运营工作台；当前判断为权限收敛设计，不在本阶段扩权。
- 浏览器控制台偶尔输出外部 `Statsig` 网络超时日志，非应用页面 error；后台 `tab.dev.logs` 未记录应用前端 error。
- 真实生产支付、短信、证书、回调和真机微信验收仍未完成。

### 是否达到可上线运营标准

- 本地后台多角色权限边界达到试运营复核标准。
- 正式全量生产仍需补齐真机微信、真实支付、短信、证书、回调、备份和监控证据。

### 遗留问题

- 需要继续复跑自动化门禁：`test:preflight-guards`、`smoke:community-sharing`、`seed:qiwai-demo`、`smoke:qiwai-demo`、`git diff --check`。
- 需要在 HTTPS H5 域名上完成真机微信验收，并保持真实支付开关关闭直到生产资料补齐。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，进入“自动化门禁与 smoke 复跑”小阶段。

## 2026-06-24 - H5 用户端点击级最终验收补验

### 阶段名称

慢π上线前完整验收 - H5 用户端活动报名、个人中心、心得与海报点击级补验小阶段。

### 本阶段完成内容

- 按规则重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 重新读取右侧浏览器控制说明，确认当前可控标签中 H5 已打开在 `http://127.0.0.1:5273/#/pages/activity/detail?id=100&tenantCode=qiwai-showcase`。
- 从 H5 活动详情页继续点击“立即报名”，进入报名页。
- 填写免费报名表并完成二次确认，生成报名详情。
- 刷新报名详情页，验证报名状态、姓名和手机号仍可见。
- 进入个人中心和“我的订单”页，验证新报名记录可在用户侧列表中查看。
- 打开“发布心得”页，验证当前用户存在可发布活动，不会被“未参加活动”资格挡板拦住。
- 打开已审核通过的心得详情，验证动态详情、评论区、复制链接、生成海报和写评论入口可见。
- 点击“生成海报”，验证 H5 前端 canvas 成功生成 `data:image/png` 海报并显示弹层。
- 打开共修动态列表，验证已审核心得在公开动态流展示，发布心得入口仍可见。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:34:07 +08:00。
- 验证环境：
  - H5：`http://127.0.0.1:5273`
  - API：`http://127.0.0.1:3100/api`
  - 演示商家：`qiwai-showcase` / 慢π演示中心。
- 右侧浏览器 H5 活动详情：通过，活动 `【演示】国学经典晨读体验营` 可打开并进入报名。
- H5 报名提交：通过，生成报名详情 `id=173`，状态 `报名成功`，订单状态 `已付款`。
- 报名详情刷新持久化：通过，刷新后仍显示姓名、手机号和报名成功状态。
- 我的订单列表：通过，可看到活动报名 `【演示】国学经典晨读体验营`，订单号 `OD1782257487708173`，金额免费，方式免费。
- 发布心得资格页：通过，当前账号可选择已参加活动 `浏览器心得验收活动 1782233529706`，并显示 2 条已通过心得。
- 动态详情页：通过，已审核心得 `id=27` 可打开，显示复制链接、生成海报和写评论入口。
- H5 海报生成：通过，弹层出现，海报图片为 `data:image/png;base64,...`，长度约 114 KB。
- 共修动态列表：通过，可看到已审核心得，页面无明显前端阻塞。
- 本轮 H5 操作期间 `tab.dev.logs({ levels: ['error'] })` 未发现新的前端 error。

### 输入的测试数据摘要

- 报名测试数据：
  - 姓名：`慢π浏览器终验用户`
  - 手机号：`13957457692`
  - 微信号：`manpi_browser_test`
  - 活动：`【演示】国学经典晨读体验营`
- 心得/海报验证数据：
  - 已通过心得 id：`27`
  - 关联活动：`浏览器心得验收活动 1782233529706`

### 通过项

- H5 首页后续链路中的活动详情、报名表、二次确认、报名详情、刷新持久化、我的订单列表均可用。
- 心得分享入口能识别已参加活动，已审核心得能进入公开详情并生成前端海报。
- 共修动态列表能展示参与者心得，适合新用户理解活动体验。
- 本地 H5 用户端主链路已具备继续试运营验收条件。

### 发现的问题

- 右侧浏览器无法直接操作系统文件选择框，因此本轮没有通过浏览器手动上传图片；图片上传、待审核、后台审核、公开展示已由 `smoke:community-sharing` 自动化链路覆盖，仍需真机或可控文件选择能力补做一次纯 UI 上传验收。
- 真机微信长按保存海报、朋友圈分享卡片和二维码扫码回流仍未在 iOS/Android 微信中验收。
- 真实支付、短信、证书、回调和真实小额支付/退款证据仍未补齐，真实在线支付仍不能开启。

### 是否达到可上线运营标准

- 本地 H5 用户端点击级主流程通过，可进入下一步后台多角色复核与自动化门禁复跑。
- 试运营口径：H5 + 后台 + 免费报名/线下收款/余额支付可以继续收口。
- 正式全量生产口径：仍需补齐真机微信、真实支付、短信、证书、回调、备份和监控证据。

### 遗留问题

- 需要继续执行后台多角色复核：平台超管、城市合伙人管理员、店铺运营、财务/签到账号权限边界。
- 需要复跑自动化门禁：`test:preflight-guards`、`smoke:community-sharing`、`seed:qiwai-demo`、`smoke:qiwai-demo`、`git diff --check`。
- 需要在 HTTPS H5 域名上完成真机微信验收，并保持真实支付开关关闭直到生产资料补齐。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，进入“后台多角色最终复核”小阶段。

## 2026-06-24 - 最终主流程验收复核与样板 smoke 分页修复

### 阶段名称

最终主流程验收 - 后台多角色浏览器复核、H5 自动化补验与样板 smoke 稳定性修复小阶段。

### 本阶段完成内容

- 按规则重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 复核 API、后台和 H5 dev server 可访问状态。
- 尝试在右侧浏览器打开 H5 `http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/index/index`，浏览器安全策略拒绝访问该 URL；本阶段未绕过该策略，也未用间接方式强行打开 H5。
- 使用右侧浏览器继续完成后台平台端关键页面复核：
  - 全局数据看板。
  - 共修动态。
  - 前台装修。
  - 公益池。
  - 公益与招募线索。
  - 志愿者档案。
  - 商城店铺。
  - 商城收款配置。
  - 系统设置。
- 复查系统设置页加载时机，确认等待后能正常显示系统设置、运营设置、支付方式、部署与体检相关内容，未发现前端 error。
- 使用自动化 smoke 补验 H5 用户心得与装修闭环；首次未设置 `API_BASE` 时误打到旧 `localhost:3000` 服务，随后改为 `http://127.0.0.1:3100/api` 后通过。
- 执行 `npm.cmd run seed:qiwai-demo` 重置慢π三城样板数据。
- 修复 `scripts/qiwai-demo-smoke.mjs` 的平台监管断言：本地长期 smoke 后活动总数超过 100，平台活动接口单页最多返回 100 条，原脚本只查第一页导致样板活动被挤到第 2 页后误报；现改为分页读取全部后台活动后再断言平台可见。
- 复跑慢π样板 smoke，通过三城租户隔离、公开端活动隔离、报名、线下收款确认、签到、用户标签、活动复盘、财务可见、退款、代理结算、平台活动监管与活动审核流。

### 修改/新增的主要文件

- `scripts/qiwai-demo-smoke.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:17:39 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin`
  - H5：`http://127.0.0.1:5273`
  - 演示商家：`qiwai-showcase` / 慢π演示中心。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`，`config=warning`。
- `GET http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/index/index`：HTTP 200。
- `git diff --check`：通过，无空白错误；仅保留 Windows 工作区 LF/CRLF 转换警告。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过。
- `npm.cmd run seed:qiwai-demo`：通过，慢π杭州、苏州、成都城市合伙人样板数据已准备完成。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:qiwai-demo`：通过。
- `npm.cmd run test:preflight-guards`：通过。

### 浏览器验证的主要步骤

- 右侧浏览器后台：
  - 平台超管 `admin / Admin123456` 登录。
  - 打开并复核全局数据看板、共修动态、前台装修、公益池、公益与招募线索、志愿者档案、商城店铺、商城收款配置、系统设置。
  - 所有已打开后台页面均能进入主内容区，控制台未发现新的前端 error。
- 右侧浏览器 H5：
  - 尝试新建标签打开 H5 首页时被 Browser Use URL policy 拒绝。
  - 本阶段没有绕过安全策略，因此 H5 用户端“右侧浏览器点击级全流程”未完成。

### 输入的测试数据摘要

- `smoke:community-sharing` 保留数据：
  - 活动 id：`121`
  - 报名 id：`166`
  - 参与者心得 post id：`33`
  - 首页装修模块 id：`230`
- `smoke:qiwai-demo` 保留了三城样板业务流新增报名、订单、签到、标签、退款、结算和平台审核活动数据。
- 后台浏览器使用账号：
  - 平台超管：`admin / Admin123456`
  - 城市合伙人管理员：`showcase_admin / Qiwai123456`
  - 店铺运营：`showcase_store_owner / Qiwai123456`

### 通过项

- 后台页面能正常打开，平台端、商家端、店铺运营角色工作台已用右侧浏览器复核。
- 店铺运营账号只能看到商城工作台、商城管理和系统设置，快捷入口均跳到正确店铺商城页面。
- 城市合伙人管理员仍看到综合商家数据看板，平台超管仍看到全局数据看板。
- 心得分享与装修自动化 smoke 通过，覆盖参与者心得发布资格、图片、待审核、后台审核、公开展示、分享计数和装修模块读取。
- 慢π三城样板 smoke 通过，覆盖多租户隔离、报名、支付确认、签到、标签、复盘、财务、退款、结算、平台监管和活动审核。
- 上线 preflight guard 全部通过，慢π品牌与公益合规文案门禁仍通过。

### 发现的问题

- 右侧浏览器当前可以打开后台 `5174`，但打开 H5 `5273` 被 Browser Use URL policy 拒绝；H5 用户端登录、报名、心得发布、动态详情海报等点击级验收仍无法在右侧浏览器完成。
- 真机微信长按保存海报、朋友圈分享、二维码扫码回流仍需真实 iOS/Android 微信环境验收。
- 真实生产支付、短信、微信/支付宝证书、回调、真实小额支付/退款/账单/代理打款预发证据仍未补齐，不能打开真实支付开关。
- `npm.cmd run prelaunch:online-showcase` 仍会因真实支付资料缺失按预期返回 `NO-GO`，本阶段未尝试伪造或放宽该门禁。

### 是否达到可上线运营标准

- 本地后台与自动化主流程已达到可继续预发验收状态。
- 未达到正式可上线运营标准：H5 右侧浏览器点击级主流程未完成，真机微信验收未完成，真实生产支付/短信/证书/回调/预发证据未补齐。

### 遗留问题

- 需要恢复或授权右侧浏览器访问 H5 `http://127.0.0.1:5273`，再走 H5 用户登录、活动浏览、报名、我的报名、发布心得、后台审核、前台展示、海报生成和刷新持久化。
- 需要按 `docs/wechat-share-poster-acceptance.md` 在真实手机微信中执行海报保存和分享回流验收。
- 需要补齐生产环境真实支付、短信、证书、回调和预发证据后，再运行 `prelaunch:online-showcase`。

### 下一阶段应继续处理的事项

- 当前存在真实外部阻塞：右侧浏览器 H5 URL policy 拦截、真机微信环境缺失、真实生产支付/短信资料缺失。
- 待 H5 浏览器访问策略或生产资料恢复后，继续从本阶段记录的遗留问题执行最终验收。

## 2026-06-24 - 右侧浏览器恢复与商城运营工作台补验

### 阶段名称

商城运营工作台 - 右侧浏览器恢复后多角色点击级补验小阶段。

### 本阶段完成内容

- 按规则重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 复核本地服务状态，确认后台登录页和 API readiness 均可访问。
- 重新连接右侧浏览器，先遇到一次历史会话失效；重置浏览器控制连接后恢复正常。
- 使用右侧浏览器打开 `http://127.0.0.1:5174/admin/login`，页面正常显示“慢π运营后台”登录表单，不再崩溃。
- 使用店铺运营账号 `showcase_store_owner / Qiwai123456` 登录后台，确认：
  - 菜单只显示“商家端 · 工作台 / 商家端 · 商城管理 / 商家端 · 系统设置”。
  - 工作台标题为“商城运营工作台”。
  - 页面展示授权店铺 `营销商品状态保护店铺`、30 天净收、待发货、售后待处理、上架商品、订单状态、支付与售后、热销商品等商城维度数据。
  - 快捷入口只包含商品库存、订单发货、售后退款、营销活动、收款配置、经营统计等商城操作。
- 逐项点击店铺运营工作台快捷入口，确认跳转地址均带上正确店铺参数：
  - 商品与库存：`/admin/mall-products?tenantId=23&merchantId=98`。
  - 订单发货：`/admin/mall-orders?tenantId=23&merchantId=98`。
  - 售后退款：`/admin/mall-refunds?tenantId=23&merchantId=98`。
  - 营销活动：`/admin/mall-marketing?tenantId=23&merchantId=98`。
  - 收款配置：`/admin/mall-payments?tenantId=23&merchantId=98`。
  - 经营统计：`/admin/mall-statistics?tenantId=23&merchantId=98`。
- 使用城市合伙人管理员 `showcase_admin / Qiwai123456` 登录后台，确认仍显示“慢π演示中心数据看板”和完整商家端菜单，未被切到商城运营工作台。
- 使用平台超级管理员 `admin / Admin123456` 登录后台，确认可打开“全局数据看板”，平台端菜单仍完整。
- 再次切回店铺运营账号，手动访问 `/admin/activities`，确认路由守卫自动回到 `/admin/dashboard`，仍显示“商城运营工作台”，没有进入活动管理，也没有前端 error。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:12:28 +08:00。
- `GET http://127.0.0.1:5174/admin/login`：HTTP 200。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`，`config=warning`。
- 右侧浏览器后台登录页：通过，DOM 可见“慢π运营后台”、用户名、密码、登录按钮。
- 店铺运营账号登录：通过，进入 `/admin/dashboard`，显示“商城运营工作台”。
- 店铺运营快捷入口点击：6 个入口全部可点击并跳转到对应商城页面。
- 城市合伙人管理员登录：通过，显示综合商家数据看板。
- 平台超级管理员登录：通过，可打开全局数据看板。
- 店铺运营深链守卫：访问 `/admin/activities` 后自动回到 `/admin/dashboard`，没有显示活动管理，也没有前端 error。

### 浏览器验收结果

- 通过。右侧浏览器本轮已恢复，可完成后台三角色工作台点击级补验。
- 本阶段未执行 H5 用户端全流程、真实支付、真机微信分享/海报保存验收。

### 遗留问题

- 需要继续执行最终主流程浏览器验收：H5 用户登录/报名/心得/公开展示、后台平台/商家/店铺角色、公益招募、商城核心入口等完整链路。
- 真机微信长按保存海报、朋友圈分享和二维码扫码回流仍需真实 iOS/Android 微信环境验收。
- 真实生产支付、短信、证书、回调和预发证据仍未补齐，不能打开真实支付开关。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，进入最终主流程浏览器验收小阶段；若验收发现计划内问题，回到对应模块修复后复验。

## 2026-06-24 - 慢π品牌与公益合规文案门禁加固

### 阶段名称

上线运营收口 - 慢π品牌词与公益合规文案 preflight 门禁加固小阶段。

### 本阶段完成内容

- 按本轮任务要求重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 复核当前进度，确认“用户心得分享与 H5 装修优化”剩余主要是右侧浏览器恢复后的最终补验、真机微信海报/朋友圈/二维码回流验收，以及真实生产支付资料补齐。
- 检查现有 `scripts/preflight-copy-risk-guard.mjs`，确认它已经覆盖公益高风险表述，但尚未覆盖用户强调过的错误品牌词。
- 将文案门禁扩展为两类检查：
  - 公益高风险表述：`公开募捐`、`捐款认领`、`募捐目标`、`用户捐赠认领`。
  - 错误品牌表述：`电召`、`七维文化`、`奇外`。
- 未阻断“算命 / 改运 / 破灾 / 预测”等词在合规禁用说明、审核提示和运营培训材料中的正常出现，避免误伤已有合规教育内容。

### 修改/新增的主要文件

- `scripts/preflight-copy-risk-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:06:46 +08:00。
- `rg -n "电召|七维文化|奇外|玄学|算命|改运|破灾|保证结果|预测财富|预测婚姻|预测疾病" apps/admin/src apps/api/src apps/mobile/src packages/shared/src docs scripts -S`：未发现 `电召 / 七维文化 / 奇外` 错误品牌词；合规禁用词只出现在禁用清单、审核提示、演示活动合规说明和运营培训材料中。
- `node scripts/preflight-copy-risk-guard.mjs`：通过，输出 `OK   copy risk guard found no high-risk fundraising wording or incorrect brand wording.`。
- `npm.cmd run test:preflight-guards`：通过，所有上线 preflight guard 均通过。

### 浏览器验收结果

- 本阶段为静态上线门禁加固，不涉及页面交互，未执行新的右侧浏览器点击级验收。
- 右侧浏览器最终多角色主流程验收仍依赖浏览器运行时恢复；本阶段没有绕过该要求。

### 遗留问题

- 右侧浏览器最近仍有 `This page crashed` 阻塞记录，商城运营工作台点击级补验和最终多角色主流程验收仍需浏览器恢复后执行。
- 真机微信长按保存海报、朋友圈分享、二维码扫码回流仍需真实 iOS/Android 微信环境验收。
- 真实生产支付、短信、证书、回调和预发证据仍未补齐，不能打开真实支付开关。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，优先尝试右侧浏览器恢复；若仍崩溃，则记录真实阻塞并停止，或继续处理不依赖浏览器/真实支付的计划内上线收口项。

## 2026-06-24 - 右侧浏览器恢复重试

### 阶段名称

右侧浏览器恢复状态复核与最终验收入口重试小阶段。

### 本阶段完成内容

- 按本轮任务要求重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`。
- 确认上一阶段停止点仍是两个真实阻塞：右侧浏览器标签崩溃、真实生产支付/短信/证书/回调验收资料未补齐。
- 重新读取右侧浏览器控制说明并连接 in-app browser。
- 检查当前没有可接管的已有用户标签，也没有活动中的正常浏览器会话标签。
- 新建右侧浏览器标签并尝试打开 `http://127.0.0.1:5174/admin/login`。
- 浏览器新标签仍从 `about:blank` 跳到 `This page crashed`，无法进入后台登录页，因此不能继续执行商城运营工作台补验或最终多角色主流程浏览器验收。
- 清理本轮崩溃浏览器标签。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:31:00 +08:00。
- `GET http://127.0.0.1:5174/admin/login`：HTTP 200。
- `GET http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/index/index`：HTTP 200。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`，`config=warning`。
- 右侧浏览器重试结果：
  - 新建标签成功，初始标题 `New tab`，URL `about:blank`。
  - 跳转后台登录页超时。
  - 超时后标题为 `This page crashed`，URL 为 `data:text/html...This page crashed`。

### 浏览器验收结果

- 未通过。右侧浏览器运行时仍崩溃，无法加载本地后台页面。
- 已确认本地后台、H5、API 服务本身可访问，因此当前阻塞不是应用服务端口问题。
- 未绕过右侧浏览器，也未改用其它浏览器替代最终验收。

### 遗留问题

- 右侧浏览器恢复前，无法完成最终验收规则要求的“右侧浏览器走一遍全流程、各种角色”的点击级验收。
- 真实生产资料和真实支付预发证据仍未补齐，`prelaunch:online-showcase` 仍按预期阻断真实微信支付上线。

### 下一阶段应继续处理的事项

- 当前已连续复核确认同一真实阻塞仍存在：右侧浏览器崩溃，以及真实生产支付/短信/证书/回调验收资料缺失。
- 需要等待右侧浏览器恢复，或由用户补齐生产资料/真实预发验收数据后，再继续最终验收。

## 2026-06-24 - 工作区状态与上线门禁复核

### 阶段名称

工作区状态与线上演示预发布门禁复核小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认当前可执行的下一步是不依赖右侧浏览器的门禁状态复核。
- 检查工作区状态，确认仍存在大量前序持续开发改动和未跟踪文件；未执行任何重置、回滚或清理。
- 执行代码空白检查、API readiness 检查和线上演示预发布门禁。
- 复核结果确认：本地服务可运行，但正式开放真实微信支付和最终上线验收仍被真实生产资料、真实支付证据和右侧浏览器阻塞。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:24:00 +08:00。
- `git diff --check`：通过，无空白错误；仅输出 Windows 工作区 LF/CRLF 转换警告。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`，`config=warning`。
- `git status --short`：显示当前工作区仍包含大量已修改文件和未跟踪文件，包括用户心得分享、H5 装修、公益招募、商城、多份文档和 smoke/guard 脚本相关成果；本阶段未清理。
- `$env:API_BASE='http://127.0.0.1:3100/api'; $env:PRELAUNCH_ALLOW_HTTP='true'; $env:SHOWCASE_ADMIN_USERNAME='admin'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'; $env:SHOWCASE_PASSWORD='Qiwai123456'; npm.cmd run prelaunch:online-showcase`：按预期返回 `NO-GO`，共 92 个阻塞项。
- 预发布门禁通过项摘要：
  - 多商户商城 smoke 已标记通过：`deploy/mall-multi-merchant-smoke-result.json`。
  - 多商户商城 smoke 结果仍在有效期内：约 5.7 小时前。
  - API 地址为 `http://127.0.0.1:3100/api`。
  - 平台管理员登录成功。
  - 演示商家存在：`慢π演示中心(qiwai-showcase)`。
  - 前台当前可用支付方式：余额支付、线下收款。
- 预发布门禁阻塞摘要：
  - `deploy/real-payment-smoke-result.json` 不满足 `passed=true`，真实支付联调结果过期且缺少微信 Native/H5/JSAPI、支付创建、回调、重复回调、金额异常、退款、退款通知、退款查询、账单、代理账户路由、商城支付、商城退款、商户直收防串店、代理打款和回滚证据。
  - 商城真实微信支付下单/回调路由尚未接入真实服务商，不能正式开放商城微信支付。
  - 后台微信支付真实就绪失败，`WECHAT_PAY_PRIVATE_KEY_PATH` 和 `WECHAT_PAY_PLATFORM_CERT_PATH` 文件不可读取。
  - 前台商城微信支付不可正式开放，门禁要求保持 `REAL_PAYMENT_ENABLED=false`。

### 浏览器验收结果

- 本阶段未再次调用右侧浏览器。
- 上一阶段已确认右侧浏览器新标签崩溃为 `This page crashed`；最终多角色主流程浏览器验收仍未完成。

### 遗留问题

- 真实生产 HTTPS 域名、短信服务商、微信/支付宝商户资料、证书、回调 URL、真实小额支付/退款/账单/代理打款预发证据仍需在后台和生产环境补齐。
- 右侧浏览器运行时崩溃需要恢复后，才能完成商城运营工作台补验和最终多角色主流程验收。
- 微信分享、海报长按保存、二维码扫码回流和朋友圈传播需要真实 iOS/Android 微信验收。

### 下一阶段应继续处理的事项

- 当前已遇到无法自行解决的真实阻塞：右侧浏览器崩溃，以及真实生产资料/真实支付验收资料缺失。
- 待浏览器恢复或生产资料补齐后，继续从 `docs/development-handoff.md`、`docs/wechat-share-poster-acceptance.md` 和本日志继续验收。

## 2026-06-24 - 上线交接文档与项目进度收口

### 阶段名称

上线资料与运维交接文档收口小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认右侧浏览器暂不可用后，转入不依赖浏览器的上线资料与交接文档收口。
- 更新 `docs/development-handoff.md`：
  - 更新时间调整为 2026-06-24。
  - 修正当前结论：本地自动化验证已推进到可继续预发验收状态，但不能宣称最终可上线浏览器验收完成。
  - 补充右侧浏览器 `This page crashed` 阻塞、商城运营工作台待点击级补验、真机微信分享/海报保存待验收。
  - 修正当前本地端口为 API `3100`、H5 `5273`、后台 `5174`。
  - 补充最近使用的 H5 用户、城市合伙人管理员、店铺运营账号和 smoke 保留数据。
  - 将 `docs/wechat-share-poster-acceptance.md` 纳入必读文件和下一步验收流程。
- 更新 `docs/project-progress.md`：
  - 更新时间调整为 2026-06-24。
  - 新增“用户心得分享与 H5 装修优化”和“公益与招募 v2”进度行。
  - 新增商城运营工作台、微信分享真机清单、右侧浏览器阻塞和心得/H5 装修阶段收口里程碑。

### 修改/新增的主要文件

- `docs/development-handoff.md`
- `docs/project-progress.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:18:00 +08:00。
- `rg -n "This page crashed|wechat-share-poster-acceptance|showcase_store_owner|127.0.0.1:3100|127.0.0.1:5273|用户心得分享与 H5 装修优化" docs/development-handoff.md docs/project-progress.md -S`：通过，关键状态和入口均可检索。
- `rg -n "电召|七维文化|奇外" docs/development-handoff.md docs/project-progress.md -S`：未匹配，未发现错误品牌词回流。
- `node scripts/preflight-copy-risk-guard.mjs`：通过，应用源码高风险公益传播文案 guard 仍通过。

### 浏览器验收结果

- 本阶段为交接与进度文档收口，未执行新的右侧浏览器操作。
- 右侧浏览器当前已在上一阶段确认为运行时崩溃阻塞，最终主流程浏览器验收仍待恢复后继续。

### 遗留问题

- 真实生产资料、支付/短信/回调/证书、真机微信验收和右侧浏览器最终主流程仍未完成，文档已明确标注不能宣称正式生产可上线。
- `docs/project-progress.md` 历史内容很长，本阶段只更新顶部总进度与最新里程碑，没有重排历史长表。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，可执行一次工作区状态与上线门禁状态复核；若浏览器仍不可用且没有新的计划内开发项，可记录真实阻塞并停止等待浏览器/生产资料恢复。

## 2026-06-24 - 右侧浏览器恢复与商城工作台补验尝试

### 阶段名称

商城运营工作台 - 右侧浏览器点击级补验恢复尝试小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认上一阶段遗留“商城运营工作台点击级验收”。
- 读取并按浏览器控制说明重新建立右侧浏览器连接。
- 尝试新建干净标签并打开本地后台登录页 `http://127.0.0.1:5174/admin/login`。
- 并行检查本地服务可用性，确认后台 dev server 与 H5 dev server 均能通过 HTTP 返回 200。
- 查询浏览器会话标签，确认新标签仍崩溃到 `This page crashed`，用户可见标签列表为空。
- 清理本轮崩溃浏览器会话标签，避免留下不可用标签。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:08:00 +08:00。
- `GET http://127.0.0.1:5174/admin/login`：HTTP 200。
- `GET http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/index/index`：HTTP 200。
- 浏览器新标签打开后台登录页：失败，超时后标签 URL 为 `data:text/html...This page crashed`，标题为 `This page crashed`。
- `browser.user.openTabs()`：返回空列表，当前没有可 claim 的正常用户标签。

### 浏览器验收结果

- 商城运营工作台右侧浏览器点击级补验未完成。
- 当前阻塞判断为右侧浏览器运行时/标签崩溃问题，不是本地后台或 H5 服务不可访问。
- 未绕过浏览器控制限制，未改用非右侧浏览器替代最终验收。

### 遗留问题

- 右侧浏览器恢复后仍需补验：
  - 店铺运营账号进入 `/admin` 后直接展示“商城运营工作台”。
  - 商城商品、订单、售后、营销、收款、统计入口可点击并带上正确店铺查询参数。
  - 城市合伙人管理员仍看到综合数据看板。
  - 平台超级管理员仍看到全局数据看板。
- 最终可上线验收仍依赖右侧浏览器或真实人工浏览器恢复；当前不能宣称最终浏览器主流程验收通过。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，转入不依赖右侧浏览器的上线资料、部署检查、运维交接或预发验收文档收口小阶段。

## 2026-06-24 - 真机微信分享与海报保存验收清单

### 阶段名称

用户心得分享与 H5 装修优化 - 真机微信分享与海报保存验收清单小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认当前剩余关键风险集中在桌面浏览器无法完整替代的微信真机链路。
- 新增慢π微信分享与海报真机验收清单，覆盖微信内打开 H5、活动链接分享、参与者心得发布、后台审核、心得详情海报生成、长按保存、二维码扫码回流、朋友圈传播和常见问题排查。
- 在上线运营检查清单中接入真机验收要求，明确上线前需要真实手机微信验证活动分享、心得发布、海报生成、保存和扫码回流。
- 在本地验收方案中补充“用户心得与微信分享真机验收”专项步骤，并在验收记录表增加真机微信记录项。
- 本阶段没有改动运行时代码，不影响 API、后台或 H5 构建产物。

### 修改/新增的主要文件

- `docs/wechat-share-poster-acceptance.md`
- `docs/launch-checklist.md`
- `docs/local-acceptance-test-plan.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 07:02:00 +08:00。
- `rg -n "电召|七维文化|奇外" apps docs scripts -S`：未匹配，未发现错误品牌词回流。
- `node scripts/preflight-copy-risk-guard.mjs`：通过，应用源码中未出现“公开募捐 / 捐款认领 / 募捐目标 / 用户捐赠认领”等高风险公益传播文案。
- `rg -n "wechat-share-poster-acceptance|微信分享与海报真机验收" docs -S`：通过，新增清单已被 `docs/launch-checklist.md` 和 `docs/local-acceptance-test-plan.md` 引用。

### 浏览器验收结果

- 本阶段为真机验收清单与上线验收文档补齐，未执行新的右侧浏览器点击级验收。
- 真实微信的长按保存、朋友圈卡片、相册权限、二维码扫码识别和跨端回流必须在 iOS/Android 真机微信中执行，桌面浏览器和当前自动化环境不能完全替代。

### 遗留问题

- 需要在预发 HTTPS 域名和真实手机微信中按 `docs/wechat-share-poster-acceptance.md` 执行并留存截图、机型、微信版本和测试数据。
- 若真机验收发现海报图片空白、二维码不可识别或分享卡片异常，需要回到 H5 海报生成和分享配置代码继续修复。
- 右侧浏览器恢复稳定后，仍建议补做上一阶段商城运营工作台点击级验收。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，可优先尝试恢复右侧浏览器并补验商城运营工作台；若浏览器仍不可用，则进入生产/预发上线资料和运维验收文档的收口检查。

## 2026-06-24 - 商城运营工作台店铺维度细化

### 阶段名称

商城运营工作台按店铺维度细化小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认上一阶段遗留的“店铺运营工作台仍显示全租户活动类经营指标”可以作为本阶段继续处理事项。
- 后台工作台新增商城运营模式：当账号不是平台管理员、具备商城权限、且不具备活动/报名/订单/财务大盘权限时，自动切换为“商城运营工作台”。
- 商城运营工作台复用现有授权店铺与商城统计接口，自动加载账号可运营店铺，并按店铺展示 30 天净收、待发货、售后待处理、上架商品、订单状态、支付方式、售后状态和热销商品。
- 店铺运营快捷入口改为商品库存、订单发货、售后退款、营销活动、收款配置、经营统计等商城操作，不再展示活动报名类指标与入口。
- 保留平台超级管理员和城市合伙人管理员的原综合数据看板，不改变其活动、报名、财务和装修运营入口。
- 本阶段没有新增数据库结构和后端接口，降低对现有线上服务的影响。

### 修改/新增的主要文件

- `apps/admin/src/views/Dashboard.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 06:55:00 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释和 chunk size 警告。
- `npm.cmd run test:preflight-guards`：通过，包含公益/心得高风险文案、管理员角色、上传、导出、财务对账、代理结算等 guard。
- `GET /api/health/ready`：通过，`ready=true`、`api=up`、`database=up`，`config=warning`。
- 店铺运营账号真实接口抽验：
  - `showcase_store_owner / Qiwai123456` 登录成功。
  - 权限为 `dashboard.view` 与商城相关权限，不包含活动/报名/财务大盘权限。
  - `GET /admin/mall/accessible-merchants?enabled=true` 返回授权店铺 id `98`、名称 `营销商品状态保护店铺`、租户 `慢π演示中心`。
  - `GET /admin/mall/analytics?merchantId=98` 返回 `range / summary / trend / byPaymentMethod / byStatus / refunds / topProducts / couponStats`，当前 30 天订单与金额为 0，符合演示库当前数据。

### 浏览器验收结果

- 本阶段未完成新的右侧浏览器点击级验收。
- 上一轮尝试继续接管右侧浏览器时，当前标签页崩溃到 `data:text/html...This page crashed`，随后 Browser Use URL policy 阻止从崩溃页恢复导航；未绕过该限制。
- 已用后台构建、预检 guard、API readiness、店铺运营登录与商城统计接口抽验替代验证，确保代码处于可运行、可测试、可继续开发状态。

### 遗留问题

- 右侧浏览器恢复稳定后，需要补验店铺运营账号打开 `/admin` 是否直接展示“商城运营工作台”，并点击商品、订单、售后、营销、收款、统计入口确认跳转查询参数正确。
- 需要补验城市合伙人管理员仍看到综合数据看板，平台超级管理员仍看到全局数据看板。
- 正式上线前仍需真实生产域名、短信、支付商户资料、证书、回调、小额支付/退款和真机微信分享/海报保存验收。

### 下一阶段应继续处理的事项

- 继续重新读取开发计划和开发记录后，可进入“真机微信分享/海报保存验收清单”小阶段，或在右侧浏览器恢复后先补做商城运营工作台点击级验收。

## 2026-06-24 - 主流程复验与商家权限收口

### 阶段名称

用户心得分享与 H5 装修优化 - 主流程复验、慢π文案残留修正与商家权限收口小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认继续从“最终主流程复验”推进。
- 运行 API 健康检查，确认 `ready=true`、`api=up`、`database=up`。
- 使用右侧浏览器复验 H5 公开端：首页、活动列表、共修首页、动态详情、课程首页、公益页、志愿服务页、商城首页均可打开。
- 在 H5 共修页发现演示库历史打卡任务仍展示 `今日书院共修打卡`；修复线上演示 seed，使当天打卡任务改为幂等更新，并批量修正当前演示库当天旧标题为 `【演示】今日慢π共修打卡`。
- 使用右侧浏览器复验 H5 验证码登录：`13933529706 / 123456` 登录成功，进入“我的心得”，可查看已通过心得。
- 使用右侧浏览器打开动态详情 post `27`，点击“生成海报”，页面出现“长按图片保存，或复制链接分享到朋友圈”提示。
- 复验后台平台端：平台超管可打开全局数据看板、共修动态、前台装修、商城店铺、商城收款配置、公益池、公益与招募、志愿者档案。
- 发现店铺运营账号 `showcase_store_owner` 可见活动/报名/装修菜单但缺少对应接口权限，会触发 403；修复后台前端权限映射，从按角色粗放放行改为按权限 key 控制。
- 同步修复工作台快捷入口、待办卡片、活动表格操作和账号说明，确保店铺运营只看到商城相关入口，城市合伙人管理员仍看到完整商家运营入口。
- 更新管理员角色预检 guard，使其检查新的细粒度权限写法。

### 修改/新增的主要文件

- `apps/admin/src/permissions.ts`
- `apps/admin/src/views/Activities.vue`
- `apps/admin/src/views/Registrations.vue`
- `apps/admin/src/views/Charity.vue`
- `apps/admin/src/views/Dashboard.vue`
- `apps/admin/src/views/Layout.vue`
- `scripts/seed-online-showcase.mjs`
- `scripts/preflight-admin-role-guard.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 06:39:42 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin`
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- `GET /api/health/ready`：通过，`ready=true`、`api=up`、`database=up`，`config=warning`。
- `node --check scripts/seed-online-showcase.mjs`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释和 chunk size 警告。
- `npm.cmd run test:preflight-guards`：通过。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过；本阶段最新保留测试数据为活动 id `119`、报名 id `161`、参与者心得 post id `32`、首页装修模块 id `229`。

### 浏览器验收结果

- 浏览器验证主要步骤：
  - 打开 H5 首页、活动列表、共修首页、动态详情 id `27`、课程首页、公益页、志愿服务页、商城首页，页面标题和核心内容正常，未产生新的项目级 error。
  - 共修页修复后重新打开，确认显示 `今日任务：【演示】今日慢π共修打卡`。
  - H5 登录页切换验证码登录，点击“获取验证码”，页面显示本地开发验证码 `123456`，使用 `13933529706 / 123456` 登录成功并进入“我的心得”。
  - “我的心得”展示已通过心得 2 条，可进入动态详情。
  - 动态详情 post `27` 点击“生成海报”，出现海报保存/分享提示。
  - 平台超级管理员后台打开全局数据看板、共修动态、装修、商城、公益、招募、志愿者档案等页面。
  - 店铺运营 `showcase_store_owner / Qiwai123456` 登录后只显示“工作台 / 商城管理 / 系统设置”，不再显示活动、报名、装修营销菜单；工作台快捷入口只显示商城商品、商城订单、商城统计；手输 `/admin/activities` 会回到工作台，未产生新的 403 error。
  - 城市合伙人管理员 `showcase_admin / Qiwai123456` 登录后显示活动、报名签到、票务财务、商城、会员、装修营销、慢π运营等完整商家端菜单；活动管理、报名管理、前台装修页面均可打开，未产生新的项目级 error。
- 输入的测试数据摘要：
  - H5 登录手机号：`13933529706`，验证码：`123456`。
  - 动态详情：post `27`。
  - 店铺运营账号：`showcase_store_owner / Qiwai123456`。
  - 城市合伙人管理员账号：`showcase_admin / Qiwai123456`。
  - 自动 smoke 保留：活动 `119`、报名 `161`、心得 `32`、装修模块 `229`。
- 通过项：
  - 页面能正常打开：H5 核心页、后台平台端、后台商家端均通过。
  - 登录入口可用：H5 验证码登录、后台店铺运营登录、后台城市合伙人管理员登录均通过。
  - 核心心得分享链路可用：我的心得、动态详情、生成海报入口通过；图片上传/提交/审核/公开展示由 smoke 与前序浏览器审核复验覆盖。
  - 表单提交和数据保存：本轮 `smoke:community-sharing` 完成活动、报名、心得、装修模块保留；前序右侧浏览器验收已保留 H5 报名数据。
  - 刷新/重新打开后关键状态合理：共修页文案修正持久化，店铺运营权限收口后新标签无新增 403 error。
  - 全站高风险公益用语 guard 通过。
- 发现的问题：
  - 本轮尝试额外打开 H5 活动详情 `/#/pages/activity/detail?id=100` 做新的浏览器报名时，被 Browser Use URL policy 拦截；未继续绕过。该项由前序右侧浏览器报名验收和本轮 smoke 数据覆盖。
  - 真机微信长按保存海报、二维码扫码识别、朋友圈分享、系统文件选择器图片上传仍需真实移动端环境补测。
- 是否达到可上线运营标准：
  - 本地代码和演示主流程达到可运行、可测试、可继续部署预发状态。
  - 不建议直接标记为正式生产可上线：仍需在后台补齐真实 HTTPS 域名、短信服务商、微信/支付宝商户资料、证书、回调 URL，并完成真实小额支付/退款、短信、微信真机分享和预发验收。

### 遗留问题

- Browser Use 本轮拦截了新增 H5 活动详情报名的直接 URL 访问；若需要再次做“右侧浏览器新增报名”点击级验收，可由用户在浏览器手动打开活动详情或换用允许的入口后继续。
- 店铺运营工作台仍显示全租户活动类经营指标，但已移除不可访问菜单和快捷入口；若运营希望商城店铺账号完全只看商城指标，可后续单独做商城运营工作台。
- 正式上线前必须完成生产外部资料和真机验收。

### 下一阶段应继续处理的事项

- 如果继续开发，可进入“商城运营工作台按店铺维度细化”或“真机微信分享/海报保存验收清单”小阶段。
- 若进入部署上线，应先补齐后台生产配置，再执行预发真实短信、支付、退款和回调验收。

## 2026-06-24 - H5 装修多页面公开端抽验

### 阶段名称

用户心得分享与 H5 装修优化 - 多页面 H5 装修组件与参与者心得公开展示抽验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续围绕“用户心得分享 + H5 装修优化”做公开端验收。
- 复查 H5 装修组件入口，确认这些页面已接入 `PageDecorationBlocks`：
  - 首页、活动列表、活动详情、报名确认、公告中心、服务中心、城市合伙人、我的登录/报名/评价页、共修首页、动态详情、课程首页、公益页、商城首页、品牌故事页。
- 使用右侧浏览器依次打开演示租户 H5 多个页面，确认装修组件加载不阻塞页面。
- 重点确认已审核参与者心得 post `27` 能出现在 H5 首页和共修首页，并能在动态详情打开。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 02:23:56 +08:00。
- 本阶段未改动业务代码，未重复运行构建；沿用前序已通过：
  - `npm.cmd --prefix apps/admin run build`
  - `npm.cmd run test:preflight-guards`

### 浏览器验收结果

- 验证时间：2026-06-24 02:23:56 +08:00。
- 验证环境：
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开 `/?tenantCode=qiwai-showcase#/pages/index/index`，页面标题为“慢π”，可看到 post `27` 的内容片段，无前端错误。
  - 打开 `/?tenantCode=qiwai-showcase#/pages/community/index`，页面标题为“共修”，可看到 post `27` 和“活动口碑 / 学员动态”相关区域，无前端错误。
  - 打开 `/?tenantCode=qiwai-showcase#/pages/community/detail?id=27`，页面标题为“动态详情”，可看到 post `27` 正文，无前端错误。
  - 打开 `/?tenantCode=qiwai-showcase#/pages/courses/index`，页面标题为“全部课程”，页面加载正常，无前端错误。
  - 打开 `/?tenantCode=qiwai-showcase#/pages/charity/index`，页面标题为“公益池”，页面加载正常，无前端错误。
  - 打开 `/?tenantCode=qiwai-showcase#/pages/mall/index`，页面标题为“慢π商城”，页面加载正常，无前端错误。
  - 打开 `/?tenantCode=qiwai-showcase#/pages/brand/story`，页面标题为“品牌故事”，页面加载正常，无前端错误。
- 输入的测试数据摘要：
  - 复用后台审核通过的参与者心得 post `27`。
  - 未新增活动、报名、帖子或装修模块。
- 通过项：
  - H5 首页能露出已审核参与者心得。
  - H5 共修首页能展示已审核参与者心得与活动口碑区域。
  - H5 动态详情能打开 post `27`。
  - 课程、公益、商城、品牌故事等装修覆盖页面均能正常打开。
  - 抽验页面浏览器 error 日志均为空。
- 发现的问题：
  - 本阶段未发现新的页面阻塞或前端错误。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线仍需生产域名、真实短信/支付资料、微信分享和移动端真机验收。

### 遗留问题

- 本阶段是公开端抽验，没有覆盖每一种装修模块的全部样式组合。
- 真机微信分享、海报保存、图片选择上传仍需真实移动环境验收。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，可进入“用户心得分享与 H5 装修优化”本轮最终主流程浏览器验收，覆盖后台、H5、发布入口、审核、公开展示、装修配置和恢复能力。

## 2026-06-24 - H5 装修预览兜底与复制配置复验

### 阶段名称

用户心得分享与 H5 装修优化 - 发布前预览兜底与页面配置复制点击级复验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续处理上一阶段遗留的“发布前预览按钮兜底”。
- 后台 `/admin/homepage-builder` 的“发布前预览”按钮增强：
  - 点击时先复制当前 H5 预览链接到剪贴板。
  - 再尝试打开新窗口预览。
  - 如果浏览器阻止新窗口，会提示“浏览器阻止了新窗口，预览链接已复制”。
  - 如果新窗口正常打开，会提示“已打开预览，并复制预览链接”。
- 使用右侧浏览器验证点击“发布前预览”后剪贴板拿到当前演示租户共修首页链接。
- 对“复制页面配置”做点击级复验：从“首页”复制到演示租户“共修首页”，确认复制后模块出现，再用恢复快照回滚。

### 修改/新增的主要文件

- `apps/admin/src/views/HomepageBuilder.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 02:22:21 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释与 vendor chunk size 警告。
- `npm.cmd run test:preflight-guards`：通过。

### 浏览器验收结果

- 验证时间：2026-06-24 02:22:21 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin`
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开 `/admin/homepage-builder?pageKey=community_home&tenantId=23`。
  - 点击“发布前预览”，读取剪贴板为 `http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/community/index`。
  - 点击“复制页面配置”，来源保持“首页”，目标为当前“共修首页 · 商家独立装修”。
  - 在确认弹窗点击 `OK`。
  - 确认复制后目标页变为 `11 个模块`，且页面提示已保留恢复快照。
  - 点击“恢复上次发布版本”，在确认弹窗点击 `OK`。
  - 确认目标页回到 `0 个模块`、显示“暂无模块”，恢复快照提示被清理。
  - 检查浏览器 error 日志，未发现前端错误。
- 输入的测试数据摘要：
  - 使用演示租户 `tenantId=23` 的 `community_home` 装修页。
  - 临时复制“首页”配置到“共修首页”，恢复后未保留临时模块。
- 通过项：
  - 发布前预览按钮点击后可复制正确 H5 链接。
  - 复制页面配置可用。
  - 复制配置会自动生成可恢复快照。
  - 恢复上次发布版本可回滚复制操作。
  - 后台构建和预检 guard 均通过。
- 发现的问题：
  - 当前浏览器自动化仍不能可靠观测 `window.open` 新窗口是否被接管，但按钮已具备复制链接兜底，不再阻塞运营拿到预览地址。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线仍需生产域名、真实短信/支付资料、微信环境分享和移动端真机验收。

### 遗留问题

- 若未来需要审计级装修发布流，建议新增服务端“草稿/发布版本/回滚版本”表；当前浏览器本地恢复快照适合运营误操作撤回。
- H5 装修已覆盖模板、视觉控件、页面覆盖、复制、预览和恢复，本地还可继续做多页面真实 H5 展示抽验。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，可进入用户心得与 H5 装修的多页面主流程浏览器抽验，或补齐“用户心得流 / 精选心得 / 活动口碑墙”在不同装修页面的公开端展示验收。

## 2026-06-24 - H5 装修恢复快照持久化复验

### 阶段名称

用户心得分享与 H5 装修优化 - 首页装修模板应用、预览链接与恢复上次发布版本小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续推进“H5 展示配置 / 首页装修”运营闭环。
- 将后台 `/admin/homepage-builder` 的“恢复上次发布版本”从页面内存快照升级为按装修范围保存到浏览器本地的恢复快照。
- 在这些高风险修改前自动记录改动前版本：复制模块、删除模块、启停模块、保存模块、排序、恢复默认、应用模板、复制页面配置。
- 页面顶部预览说明增加恢复快照状态提示：
  - 未修改前提示“首次修改前会自动保留当前发布版本，刷新后台后仍可恢复”。
  - 修改后提示已保留的快照时间。
  - 恢复成功后清理快照提示。
- 保持不新增数据库结构、不新增后端接口，继续复用既有首页装修模块接口。
- 使用右侧浏览器验证“应用模板 -> 刷新后台 -> 恢复上次发布版本 -> 复制预览链接”的运营路径。

### 修改/新增的主要文件

- `apps/admin/src/views/HomepageBuilder.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 02:19:07 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释与 vendor chunk size 警告。
- `npm.cmd run test:preflight-guards`：通过。
- 接口复验：
  - `GET /api/admin/homepage/sections?pageKey=community_home&tenantId=23`：恢复后返回 `0` 个演示租户独立模块。
  - `GET /api/public/page-decoration?pageKey=community_home&tenantCode=qiwai-showcase`：公开端在无独立模块时返回默认装饰 fallback，`sections.length=3`，首模块 `hero`。

### 浏览器验收结果

- 验证时间：2026-06-24 02:19:07 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin`
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开 `/admin/homepage-builder?pageKey=community_home&tenantId=23`。
  - 确认当前页面为“共修首页 · 商家独立装修”，初始为 `0 个模块`，预览链接为 `http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/community/index`。
  - 点击“应用模板”，在确认弹窗点击 `OK`。
  - 确认页面变为 `4 个模块`，包含“近期活动与共修报名 / 快捷入口 / 精选活动 / 参与者心得”。
  - 确认顶部提示显示 `已保留 2026/6/24 02:15:42 的恢复快照`。
  - 刷新后台页面，确认仍是 `4 个模块`，且恢复快照提示仍存在。
  - 点击“恢复上次发布版本”，在确认弹窗点击 `OK`。
  - 确认页面恢复为 `0 个模块`，显示“暂无模块”，并回到首次修改前的恢复提示。
  - 点击“复制链接”，读取剪贴板确认为 `http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/community/index`。
  - 检查浏览器 error 日志，未发现前端错误。
- 输入的测试数据摘要：
  - 使用演示租户 `tenantId=23` 的 `community_home` 装修页。
  - 临时应用“活动运营型”装修模板，恢复后未保留模板模块。
- 通过项：
  - 应用模板可用。
  - 修改前恢复快照会自动生成。
  - 刷新后台后恢复快照仍可用。
  - 恢复上次发布版本可将页面恢复到修改前状态。
  - 复制预览链接可用。
  - 后台构建和预检 guard 均通过。
- 发现的问题：
  - 浏览器自动化点击“发布前预览”未观察到新受控标签页；页面上的预览链接和复制链接可用。本阶段未改动该行为，后续可考虑将预览按钮改为普通链接或显式可复制/新窗口兜底。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线仍需生产域名、真实短信/支付资料、微信环境分享和移动端真机验收。

### 遗留问题

- “发布前预览”按钮在当前浏览器自动化环境中没有观察到新受控标签页，需后续单独补强成更稳定的新窗口/当前窗口兜底。
- 装修快照目前是浏览器本地快照，适合运营误操作撤回；若未来需要多人协同审计级发布版本，需要新增服务端版本表。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，可进入“发布前预览按钮兜底与页面配置复制点击级复验”，或继续补齐用户心得发布真机/文件上传之外的可自动化验收项。

## 2026-06-24 - 后台动态管理点击级审核复验

### 阶段名称

用户心得分享与 H5 装修优化 - 后台动态管理筛选、审核备注与 H5 公开展示点击级复验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续围绕“用户心得分享与 H5 装修优化方案”补足后台审核点击级闭环。
- 后台 `/admin/community` 的“共修动态/文章”列表增强：
  - 增加活动 ID 筛选输入、查询和重置按钮，方便运营按活动口碑筛查参与者心得。
  - 列表增加“审核备注”列，避免审核原因只存在接口层不可见。
  - 将“通过 / 拒绝 / 下架”改为审核弹窗，支持调整状态、展示开关并填写审核备注。
- 使用真实 H5 接口创建新的待审核参与者心得 post `27`，关联活动 `109`，作为后台点击审核数据。
- 使用右侧浏览器登录平台管理员后台，打开 `/admin/community`，切换“共修动态/文章”，按活动 ID `109` 筛选并点击审核 post `27`。
- 在审核弹窗填写备注 `后台点击审核复验通过：内容合规，允许展示到活动口碑。`，保存后确认列表状态变为 `已通过 / 展示` 且备注可见。
- 使用右侧浏览器打开 H5 活动口碑页，确认 post `27` 出现在公开列表，并可进入公开详情页。

### 修改/新增的主要文件

- `apps/admin/src/views/Community.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 02:11:49 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释与 vendor chunk size 警告。
- `GET http://127.0.0.1:3100/api/health`：通过，`api=up`、`database=up`。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过。
  - 本次 smoke 保留测试数据：活动 id `115`、报名 id `157`、参与者心得 post id `28`、首页装修模块 id `210`。

### 浏览器验收结果

- 验证时间：2026-06-24 02:11:49 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin`
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 用平台管理员 `admin / Admin123456` 登录后台。
  - 打开 `/admin/community`，进入“共修动态/文章”Tab。
  - 使用活动 ID `109` 查询，列表展示 post `27` 和同活动历史 post `26`。
  - 点击 post `27` 行内“通过”，弹出“审核共修动态”弹窗。
  - 确认弹窗显示动态 ID `27`、审核状态 `已通过`、前台展示开关为开启。
  - 填写审核备注并点击“保存审核结果”。
  - 确认列表中 post `27` 变为 `已通过 / 展示`，且审核备注展示为 `后台点击审核复验通过：内容合规，允许展示到活动口碑。`。
  - 打开 `/?tenantCode=qiwai-showcase#/pages/community/index?activityId=109`，确认“活动口碑”列表展示 post `27`。
  - 点击 post `27` 进入 `/#/pages/community/detail?id=27&tenantCode=qiwai-showcase`，确认详情页、评论区、`复制链接`、`生成海报`、`写评论`入口可见。
  - 检查浏览器 error 日志，未发现前端错误。
- 输入的测试数据摘要：
  - 新增待审核参与者心得 post `27`。
  - 心得内容：`后台点击审核复验心得：这条记录用于验证慢π后台筛选、审核备注、通过后前台展示。1782238025697`
  - 图片：`/uploads/community-posts/1782238025790-1df25dd36455b8.png`
  - 城市：`成都`
  - 标签：`后台审核 / 浏览器复验`
- 通过项：
  - 后台状态/来源/活动 ID 筛选可用。
  - 后台点击审核弹窗可打开并保存审核备注。
  - 待审核参与者心得审核通过后进入 H5 活动口碑公开列表。
  - H5 公开详情页可打开，分享与评论入口正常。
  - 构建、健康检查、社区分享 smoke 均通过。
- 发现的问题：
  - 本阶段未发现新的前端阻塞、接口报错或页面错误日志。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需生产真实域名、短信服务商、支付商户资料、证书、回调 URL、真实小额支付/退款与真机微信分享/海报保存验收。

### 遗留问题

- 浏览器自动化仍不能替代真机微信的长按保存海报、朋友圈分享和二维码扫码识别验收。
- 后台帖子列表当前仍是轻量列表，后续真实内容量变大后可考虑分页、关键词搜索和批量审核。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，可进入 H5 装修优化剩余小阶段：模板应用、页面复制/预览发布/恢复上次发布版本的浏览器复验与运营体验补强。

## 2026-06-24 - 心得审核通过与公开展示补验

### 阶段名称

用户心得分享与 H5 装修优化 - 后台审核通过后 H5 共修动态公开展示补验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段使用上一阶段保留的 post `26` 继续验证“待审核 -> 审核通过 -> 前台公开展示”闭环。
- 使用后台审核接口将 post `26` 设置为 `approved`、`visible=true`，审核备注 `浏览器补验通过`。
- 通过公开接口确认活动 id `109` 的公开动态列表中包含 post `26`。
- 使用右侧浏览器打开 H5 共修动态活动筛选页，确认 post `26` 进入“活动口碑”公开列表。
- 从公开列表进入动态详情页，确认详情页可打开，分享、海报、评论入口可见。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 02:02 +08:00。
- 本阶段未改动业务代码，未重复运行构建；沿用前序已通过的：
  - `npm.cmd --prefix apps/api run build`
  - `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`
  - `npm.cmd run test:preflight-guards`
- 接口验证：
  - `PATCH /api/admin/community-posts/26`：返回 `status=approved`、`visible=true`、`approvedAt=2026-06-23T18:01:51.461Z`。
  - `GET /api/public/community/posts?activityId=109&tenantCode=qiwai-showcase`：返回 1 条，包含 post `26`。

### 浏览器验收结果

- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开 `/#/pages/community/index?activityId=109&tenantCode=qiwai-showcase`。
  - 确认页面显示“分享活动心得”入口、“活动口碑”和 `仅展示当前活动关联心得`。
  - 确认活动口碑列表展示作者 `慢π同学`、活动 `浏览器心得验收活动 1782233529706`、正文 `这是一次浏览器补验后的接口提交心得：入口清晰，发布页能正确关联活动，并保留待审核记录。020037`。
  - 点击该心得，进入 `/#/pages/community/detail?id=26&tenantCode=qiwai-showcase`。
  - 确认详情页展示正文、评论区、`复制链接`、`生成海报`、`写评论`。
- 输入的测试数据摘要：
  - 审核并公开上一阶段保留的 post `26`。
  - 未新增新的活动、报名或用户。
- 通过项：
  - 后台审核通过接口可用。
  - 已审核参与者心得进入公开活动口碑列表。
  - 活动筛选只展示当前活动关联心得。
  - 公开详情页可打开，关键交互入口可见。
- 发现的问题：
  - 本阶段未发现新的前端阻塞或接口错误。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需真机图片选择上传、微信海报保存/扫码、真实生产短信/支付验收。

### 遗留问题

- 后台审核操作本阶段通过接口完成，若要完全点击级验收，可后续进入后台动态管理页面筛选 post `26` 或新建待审帖再审核。
- 真机微信分享和图片选择仍需人工补验。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，可进入后台动态管理点击级审核复验，或转入 H5 装修模板/页面覆盖运营体验细化。

## 2026-06-24 - 心得发布表单与待审核记录补验

### 阶段名称

用户心得分享与 H5 装修优化 - 发布心得表单校验、图片上传接口与待审核记录补验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续补足“用户心得分享”发布闭环。
- 检查 H5 发布页实现，确认图片上传使用 `uni.chooseImage` 调起浏览器/系统文件选择器，再调用 `/public/me/community/post-images` 上传。
- 右侧浏览器点击 `+ 添加照片` 后，页面 DOM 会生成 `input[type=file][accept=image/*][multiple]`，但当前浏览器控制接口没有 `setInputFiles` 能力，无法自动选择本地文件完成点击级上传。
- 使用浏览器完成表单缺图校验：填写心得内容后直接点击 `提交审核`，页面显示 `请至少上传 1 张活动照片`，阻止无图提交。
- 使用同一登录用户通过真实接口上传 1x1 PNG 并提交心得，确认后端生成待审核帖子。
- 刷新 H5 发布页，确认“我的心得”区域展示新提交的待审核记录。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 02:00 +08:00。
- 本阶段未改动业务代码，未重复运行构建；沿用前序已通过的：
  - `npm.cmd --prefix apps/api run build`
  - `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`
  - `npm.cmd run test:preflight-guards`
- 接口补验：
  - 登录用户手机号：`13933529706`。
  - `POST /api/public/me/community/post-images?tenantCode=qiwai-showcase`：上传测试 PNG 成功，返回 `/uploads/community-posts/1782237637951-06d5de53048f08.png`。
  - `POST /api/public/community/posts?tenantCode=qiwai-showcase`：提交活动 id `109` 的心得成功，生成 post id `26`，状态 `pending`。
  - `GET /api/public/me/community/posts?tenantCode=qiwai-showcase`：返回 1 条记录，最新记录 id `26`，`tenantId=23`。

### 浏览器验收结果

- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开发布页 `/#/pages/community/publish?activityId=109&tenantCode=qiwai-showcase`。
  - 确认发布页自动关联活动 `浏览器心得验收活动 1782233529706`。
  - 点击 `+ 添加照片`，确认 DOM 出现 `input[type=file]`，但自动化工具无文件赋值方法。
  - 在心得内容中填写 `这是一次浏览器补验心得：入口清晰，发布页能正确关联活动。`。
  - 不上传图片直接点击 `提交审核`，确认页面显示 `请至少上传 1 张活动照片`。
  - 接口提交 post `26` 后刷新发布页。
  - 确认“我的心得”显示 `1 条`，状态 `待审核`，活动 `浏览器心得验收活动 1782233529706`，内容 `这是一次浏览器补验后的接口提交心得：入口清晰，发布页能正确关联活动，并保留待审核记录。020037`，操作文案 `后台审核中`。
- 输入的测试数据摘要：
  - 浏览器输入心得校验文本：`这是一次浏览器补验心得：入口清晰，发布页能正确关联活动。`
  - 接口提交心得 post `26`，图片 `/uploads/community-posts/1782237637951-06d5de53048f08.png`，城市 `成都`，标签 `浏览器补验 / 心得`。
- 通过项：
  - 发布页活动关联正确。
  - 无图片时前端阻止提交并提示。
  - 真实图片上传接口可用。
  - 真实心得提交接口可用，默认进入待审核。
  - 刷新后 H5 “我的心得”能展示待审核记录。
- 发现的问题：
  - 当前 in-app browser 自动化接口没有 `setInputFiles`，不能完成本地文件选择器的点击级上传；真实用户浏览器/手机端文件选择仍需人工点验。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需真机图片选择上传、微信海报保存/扫码、真实生产短信/支付验收。

### 遗留问题

- 浏览器自动化无法替代系统文件选择器；后续可以在真机/普通浏览器人工验证图片选择体验。
- 新提交 post `26` 仍处于待审核，可作为后续“后台审核 -> 前台公开展示”浏览器小阶段的测试数据。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，可使用后台动态管理审核 post `26`，再在 H5 共修动态和活动详情口碑区验证公开展示。

## 2026-06-24 - 心得发布入口覆盖浏览器补验

### 阶段名称

用户心得分享与 H5 装修优化 - 活动详情与报名详情发布心得入口补验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续围绕“用户心得分享”入口覆盖做浏览器验证。
- 复查 H5 代码，确认已存在这些入口：
  - 活动详情页快捷操作 `分享心得`，跳转 `/pages/community/publish?activityId=...`。
  - 报名详情页在 `报名成功/已签到` 状态展示 `分享活动心得`，跳转 `/pages/community/publish?activityId=...`。
  - 共修动态页空状态/入口、我的心得页入口均已存在。
- 使用演示租户真实已签到报名数据验证入口，而不是继续使用平台全局 smoke 数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:55 +08:00。
- 本阶段未改动业务代码，未重复运行构建；沿用上一小阶段已通过的：
  - `npm.cmd --prefix apps/api run build`
  - `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`
  - `npm.cmd run test:preflight-guards`
- 数据检查：
  - 使用演示租户报名 id `151`。
  - 登录手机号 `13933529706`。
  - 活动 id `109`。
  - 报名状态 `checked_in`，报名 `tenantId=23`、活动 `tenantId=23`。

### 浏览器验收结果

- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开 H5 登录页，使用 `13933529706` + 验证码 `123456` 登录。
  - 自动进入报名详情 `/#/pages/user/registration?id=151&tenantCode=qiwai-showcase`。
  - 确认报名详情显示 `已签到`、活动 `浏览器心得验收活动 1782233529706`、报名信息、签到码入口、评价活动入口和 `分享活动心得`。
  - 点击 `分享活动心得`，确认跳转到 `/#/pages/community/publish?activityId=109&tenantCode=qiwai-showcase`。
  - 确认发布页自动关联活动 `浏览器心得验收活动 1782233529706`，显示心得内容、活动照片、城市/标签、提交审核和我的心得区块。
  - 打开活动详情 `/#/pages/activity/detail?id=109&tenantCode=qiwai-showcase`。
  - 点击快捷操作 `分享心得`，确认同样进入发布页并自动关联活动 id `109`。
- 输入的测试数据摘要：
  - 本阶段没有提交新心得，没有上传图片，没有新增帖子。
  - 使用既有演示租户用户 `13933529706`、报名 `151`、活动 `109`。
- 通过项：
  - 报名详情页入口可见且跳转正确。
  - 活动详情页入口可见且跳转正确。
  - 发布页能按 `activityId` 自动选择已参加活动。
  - 租户参数在入口跳转中保持正确。
- 发现的问题：
  - 本阶段未发现新的前端阻塞或接口错误。
  - 若后续需要验证完整发布提交，还需要通过浏览器上传图片；当前已由 `smoke:community-sharing` 覆盖接口级图片上传与审核闭环。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需生产资料、真实短信/支付、真机微信海报保存与分享验收。

### 遗留问题

- 浏览器文件上传发布心得的完整点击级验证可作为后续小阶段继续补验。
- 历史全局 smoke 数据与租户化 smoke 数据并存；如要减少验收干扰，后续可将 `smoke:community-sharing` 改造成显式租户化数据。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，可选择“浏览器上传图片并提交心得完整发布小阶段”，或继续推进 H5 装修模板/页面覆盖的运营体验细化。

## 2026-06-24 - 我的心得用户中心链路补验与租户兼容修复

### 阶段名称

用户心得分享与 H5 装修优化 - H5「我的心得 -> 已通过详情 -> 海报分享」用户中心链路补验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段延续“用户心得分享与 H5 装修优化方案”，优先补验上一轮遗留的用户中心心得闭环。
- 使用测试手机号 `13936542250` 登录 H5 后发现：数据库中 post `24` 属于该用户，但带 `tenantCode=qiwai-showcase` 请求 `/public/me/community/posts` 返回 0 条。
- 定位原因为历史 smoke 心得和活动是平台全局数据（`tenantId IS NULL`），而 H5 从演示租户入口进入时会带租户上下文，导致“我的心得”和详情守卫按租户严格过滤后查不到全局动态。
- 后端修复社区动态用户中心与详情链路：在带租户访问时，`我的心得`、动态详情、分享、点赞、评论列表、评论提交允许匹配当前租户动态或平台全局动态；仍保留 `userId` 约束，避免查看其他用户的“我的心得”。
- 使用右侧浏览器完成 H5 用户侧链路补验：登录、查看我的心得、进入已通过详情、生成海报、复制链接。

### 修改/新增的主要文件

- `apps/api/src/modules/courses/public-courses.controller.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:55:18 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- 接口复验通过：
  - `GET /api/health`：`api=up`、`database=up`。
  - `GET /api/public/me/community/posts?tenantCode=qiwai-showcase`：登录用户 `135` 可查到 post `24`。
  - `GET /api/public/community/posts/24?tenantCode=qiwai-showcase`：返回 detail id `24`。
  - `GET /api/public/community/posts/24/comments?tenantCode=qiwai-showcase`：返回 0 条已审核评论，接口不再被租户守卫误拦截。
  - `POST /api/public/community/posts/24/share?tenantCode=qiwai-showcase`：分享计数可递增。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过。
  - 本次 smoke 保留测试数据：活动 id `114`、报名 id `156`、参与者心得 post id `25`、首页装修模块 id `209`。
- `npm.cmd run test:preflight-guards`：通过。

### 浏览器验收结果

- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开 H5 登录页 `/?tenantCode=qiwai-showcase#/pages/user/login`。
  - 使用手机号 `13936542250`，验证码 `123456` 完成 H5 登录并跳转到 `/pages/user/community-posts`。
  - 确认「我的心得」页面显示：全部 `1`、已通过 `1`、待审核 `0`、未通过 `0`。
  - 确认已通过心得卡片显示活动 `心得分享烟测活动 1782236542250`、城市 `烟测城市`、标签 `烟测 / 心得`、分享数 `2`、操作文案 `查看详情并分享 ›`。
  - 点击卡片进入 `/#/pages/community/detail?id=24&tenantCode=qiwai-showcase`，确认动态详情、评论区、复制链接、生成海报、写评论入口可见。
  - 点击 `生成海报`，确认页面生成 `data:image/png` 海报，长度约 `113502`，并展示 `长按图片保存，或复制链接分享到朋友圈。`。
  - 点击 `复制链接`，浏览器剪贴板读取到 `http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/community/detail?id=24`。
  - 接口确认 post `24` 的 `shareCount=4`，对应本阶段接口复验、海报生成和复制链接触发。
- 输入的测试数据摘要：
  - 复用既有参与者心得 post `24`、用户手机号 `13936542250`。
  - 本阶段 smoke 新增并保留 post `25`、活动 `114`、报名 `156`、装修模块 `209`。
- 通过项：
  - H5 验证码登录可用。
  - 「我的心得」在租户入口下可展示本人已审核全局心得。
  - 从「我的心得」进入详情可用。
  - 详情页带租户参数时可正常加载内容和评论区。
  - 海报生成、保存提示、复制链接和分享计数均正常。
- 发现的问题：
  - 真机微信长按保存海报、朋友圈分享和二维码扫码识别仍需真实手机环境验收。
  - 历史 smoke 数据仍有平台全局动态；本阶段已兼容用户侧查看，后续如要让 smoke 完全租户化，可单独调整 smoke 脚本。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需生产真实域名、短信、支付商户资料、证书、回调 URL、真实小额支付/退款和真机微信海报保存/扫码验收。

### 遗留问题

- 生产资料与真实服务商验收仍是正式运营门禁，不属于本地代码阻塞。
- 真机微信分享体验仍需人工补验。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，可进入下一个计划内小阶段：补充“心得发布入口在活动详情/报名详情/活动结束提示”的浏览器验收，或继续细化 H5 装修页面覆盖与模板运营体验。

## 2026-06-24 - 用户心得分享与 H5 装修优化后主流程抽验

### 阶段名称

用户心得分享与 H5 装修优化 - 本轮最终主流程浏览器抽验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认“用户心得分享 + H5 装修优化”本地代码、构建、smoke、装修操作和海报分享浏览器补验已基本收口。
- 运行 `smoke:community-sharing`，再次覆盖用户心得发布资格、待审核/审核通过、公开展示和装修心得模块相关链路。
- 使用右侧浏览器抽验 H5 首页、活动列表、公开动态详情。
- 使用右侧浏览器抽验平台超级管理员后台商家/代理管理页。
- 使用右侧浏览器通过登录页切换为 qiwai-showcase 商家运营账号，抽验商家端工作台、活动、报名签到、商城管理和装修营销菜单可见。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:43:36 +08:00。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过。
- 本次 smoke 保留测试数据：
  - 活动 id `113`
  - 报名 id `155`
  - 参与者心得 post id `24`
  - 首页装修模块 id `208`
- 沿用前序已通过构建和预检：
  - `npm.cmd --prefix apps/admin run build`
  - `npm.cmd --prefix apps/api run build`
  - `npm.cmd run test:preflight-guards`

### 浏览器验收结果

- 验证时间：2026-06-24 01:43:36 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin`
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开 H5 首页 `/?tenantCode=qiwai-showcase#/pages/index/index`，确认慢π首页、运营公告、近期精选活动、课程、共修动态和底部导航正常展示。
  - 打开 H5 活动列表 `/#/pages/activity/list`，确认 7 场活动可见，免费/付费活动、余量、活动说明和 `去报名` 入口正常。
  - 打开 H5 动态详情 `/#/pages/community/detail?id=24`，确认动态详情、评论区、`复制链接`、`生成海报`、`写评论` 入口可见。
  - 打开后台平台端 `/admin/tenants`，确认平台超级管理后台、商家/代理管理、慢π演示中心商家记录可见。
  - 打开后台登录页，使用 `showcase_store_owner / Qiwai123456` 登录，确认进入 `慢π演示中心管理后台`。
  - 在商家端确认工作台、活动、报名签到、商城管理、装修营销、系统设置菜单可见，商家数据看板和活动经营表现正常展示。
- 输入的测试数据摘要：
  - 本阶段浏览器未新建表单数据。
  - `smoke:community-sharing` 保留活动 id `113`、报名 id `155`、心得 post id `24`、装修模块 id `208`。
- 通过项：
  - H5 首页可打开，慢π品牌和核心模块正常展示。
  - H5 活动列表可打开，报名入口可见。
  - H5 动态详情可打开，分享/海报入口可见。
  - 平台超级管理员后台可打开。
  - 商家运营账号可登录，商家端菜单和工作台可用。
  - 用户心得 smoke 通过。
- 发现的问题：
  - 生产上线条件仍未完全满足：真实 HTTPS 域名、短信服务商、微信/支付宝商户资料、证书、回调 URL 和真实预发小额支付/退款验收数据需要在后台补齐并做预发验收。
  - 真机微信海报长按保存、朋友圈分享、二维码扫码识别和真实剪贴板复制仍需人工/真机环境验收。
- 是否达到可上线运营标准：
  - 本地代码和演示主流程达到可运行、可测试、可继续部署预发状态。
  - 暂不建议直接标记为“正式可上线运营”，原因是生产外部资料和真实服务商验收尚未补齐；这些资料当前可在后台补充，补齐后需执行真实预发验收。

### 遗留问题

- 生产资料与真实支付/短信/微信环境验收不属于本地代码阻塞，但属于正式运营门禁。
- 若继续开发，可补做“我的心得 -> 已通过详情 -> 海报分享”的用户中心链路浏览器验收，或进入生产预发资料核对清单。

### 下一阶段应继续处理的事项

- 补齐后台生产资料：HTTPS 域名、短信服务商、微信/支付宝商户号、API 密钥、证书、回调 URL。
- 在预发/生产环境执行真实短信、真实小额支付、支付回调、退款、海报保存与扫码验收。

## 2026-06-24 - 动态详情海报与分享链路浏览器复验

### 阶段名称

用户心得分享与 H5 装修优化 - 动态详情海报与分享链路浏览器复验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段回到“用户心得分享”侧，补验公开动态详情、海报生成和分享入口。
- 通过公开接口选取 qiwai-showcase 已审核公开动态 id `23`，内容为 `慢π城市日常...`。
- 使用 H5 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/community/detail?id=23`，确认未登录也能查看公开动态详情。
- 点击 `生成海报`，确认页面生成 `data:image/png` 海报图，并展示 `长按图片保存，或复制链接分享到朋友圈。`。
- 关闭海报后点击 `复制链接`，当前自动化浏览器无法读取 H5 剪贴板内容，但后端分享计数已更新，说明点击链路触发了分享记录。
- 通过接口确认动态 id `23` 的 `shareCount=2`，对应本阶段的生成海报和复制链接两次分享行为。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:41:34 +08:00。
- `GET /api/public/community/posts?tenantCode=qiwai-showcase`：可读取已审核公开动态列表。
- `GET /api/public/community/posts/23?tenantCode=qiwai-showcase`：最终返回 `shareCount=2`。
- 本阶段未改动业务代码，未重复运行构建；沿用前序已通过的：
  - `npm.cmd --prefix apps/admin run build`
  - `npm.cmd --prefix apps/api run build`
  - `npm.cmd run test:preflight-guards`

### 浏览器验收结果

- 验证环境：
  - H5：`http://127.0.0.1:5273`
  - API：`http://127.0.0.1:3100/api`
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开动态详情页 id `23`。
  - 确认页面展示 `动态详情`、作者 `慢π同学`、正文 `慢π城市日常：下午的空间很安静...`、点赞/评论数、评论区空状态。
  - 确认底部展示 `复制链接`、`生成海报`、`写评论`。
  - 点击 `生成海报`，确认出现海报弹层、原动态首图、生成后的 `data:image/png` 海报图和保存/复制提示。
  - 点击 `关闭` 后点击 `复制链接`，页面不阻塞，分享记录接口生效。
- 输入的测试数据摘要：
  - 使用已有公开动态 id `23`，未新增动态、评论或用户数据。
  - 本阶段保留分享计数测试结果：动态 id `23` 的 `shareCount` 增加到 `2`。
- 通过项：
  - 未登录公开动态详情可打开。
  - 海报可生成 bitmap data URL。
  - 海报弹层保存提示可见。
  - 复制链接入口可点击且分享记录生效。
  - 页面无明显阻塞。
- 发现的问题：
  - 自动化浏览器的剪贴板读取为空，未能确认真实剪贴板内容；从代码和分享计数看点击链路已执行，真机或普通浏览器仍需补验复制结果。
  - 真机微信长按保存海报、扫码识别二维码仍属于上线前人工验收项。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需生产真实域名、短信、支付商户资料、证书、回调 URL、真实小额支付/退款、真机微信海报保存/扫码和剪贴板复制验收。

### 遗留问题

- 真机微信环境的长按保存、朋友圈分享和二维码扫码识别无法在当前桌面浏览器完全替代。
- 复制链接的真实剪贴板内容需在普通浏览器或真机环境补测。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，建议补做 H5 “我的心得 -> 已通过详情 -> 海报分享”链路，或执行一次当前小阶段后的最终主流程抽验。

## 2026-06-24 - 恢复默认装修组合操作浏览器复验

### 阶段名称

用户心得分享与 H5 装修优化 - 恢复默认装修组合操作浏览器复验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续补验“首页装修 / H5 展示配置”的高影响运营动作。
- 使用平台超级管理员打开 qiwai-showcase 的 `品牌故事` 装修页，确认初始状态为 `0 个模块`。
- 点击 `恢复默认装修`，确认出现二次确认弹窗，文案提示会替换当前范围全部模块配置。
- 确认执行后，品牌故事页生成默认装修 `3 个模块`：`品牌故事` 主视觉、`页面说明` 富文本、`前台底部导航`。
- 使用 `恢复上次发布版本` 撤回默认装修覆盖，确认页面恢复为 `0 个模块`。
- 通过后台接口确认 qiwai-showcase 品牌故事页最终模块数仍为 0，没有保留本阶段测试默认模块。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:39:11 +08:00。
- `GET /api/admin/homepage/sections?pageKey=brand_story&tenantId=23`：最终返回 `brandStorySections=0`。
- 本阶段未改动业务代码，未重复运行构建；沿用前序已通过的：
  - `npm.cmd --prefix apps/admin run build`
  - `npm.cmd --prefix apps/api run build`
  - `npm.cmd run test:preflight-guards`

### 浏览器验收结果

- 验证环境：
  - 后台：`http://127.0.0.1:5174/admin`
  - API：`http://127.0.0.1:3100/api`
  - 演示租户：`qiwai-showcase` / tenant id `23` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5174/admin/homepage-builder?tenantId=23&pageKey=brand_story`。
  - 确认页面显示 `品牌故事 · 商家独立装修`、`0 个模块`。
  - 点击 `恢复默认装修`，确认弹窗显示 `恢复默认装修会替换「品牌故事」当前范围的全部模块配置，确认继续？`。
  - 确认后页面显示 `3 个模块`，包含 `品牌故事`、`页面说明`、`前台底部导航`。
  - 点击 `恢复上次发布版本` 并确认，页面恢复为 `0 个模块` 和 `暂无模块`。
  - 通过接口确认最终未保留默认装修模块。
- 输入的测试数据摘要：
  - 本阶段仅临时生成默认装修模块，最终全部恢复；未新增用户、订单、帖子或活动数据。
- 通过项：
  - 恢复默认装修有二次确认保护。
  - 默认装修可正常生成。
  - 默认装修覆盖后仍可恢复到上次发布快照。
  - 接口层最终状态合理。
- 发现的问题：
  - 本阶段未发现新的前端或接口阻塞。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需生产真实域名、短信、支付商户资料、证书、回调 URL、真实小额支付/退款和真机海报保存/扫码验收。

### 遗留问题

- 装修三类高影响动作（模板、复制、默认）已完成浏览器组合复验；发布版本历史仍是“本次加载快照”级能力，不是多版本历史回滚。
- H5 动态海报仍需在真机微信环境补测长按保存与扫码识别。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，建议回到“用户心得分享”侧，补做动态详情海报入口和分享链路的浏览器复验；真机微信保存能力可列为上线前人工验收项。

## 2026-06-24 - 首页装修预览与复制配置浏览器复验

### 阶段名称

用户心得分享与 H5 装修优化 - 首页装修发布前预览与复制页面配置浏览器复验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续围绕“首页装修 / H5 展示配置”的运营动作做浏览器级复验。
- 使用平台超级管理员打开 qiwai-showcase 的 `品牌故事` 装修页，确认初始状态为 `0 个模块`。
- 点击 `发布前预览`，确认会打开 H5 品牌故事预览页，地址为 `http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/brand/story`。
- 验证 H5 预览页可正常展示品牌故事、慢π品牌介绍、参与入口和底部导航。
- 点击 `复制页面配置`，从 `首页` 复制配置到当前 `品牌故事` 页面，确认弹出二次确认并在确认后生成 `11 个模块`。
- 使用上一阶段修复的 `恢复上次发布版本`，确认复制页面配置不会覆盖原始快照，恢复后品牌故事页回到 `0 个模块`。
- 通过后台接口再次确认 qiwai-showcase 品牌故事页最终模块数为 0，没有保留本阶段测试装修数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:37:10 +08:00。
- `GET /api/admin/homepage/sections?pageKey=brand_story&tenantId=23`：最终返回 `brandStorySections=0`。
- 本阶段未改动业务代码，未重复运行构建；沿用上一阶段已通过的：
  - `npm.cmd --prefix apps/admin run build`
  - `npm.cmd --prefix apps/api run build`
  - `npm.cmd run test:preflight-guards`

### 浏览器验收结果

- 验证环境：
  - 后台：`http://127.0.0.1:5174/admin`
  - H5：`http://127.0.0.1:5273`
  - API：`http://127.0.0.1:3100/api`
  - 演示租户：`qiwai-showcase` / tenant id `23` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5174/admin/homepage-builder?tenantId=23&pageKey=brand_story`。
  - 确认页面显示 `品牌故事 · 商家独立装修`、`0 个模块`。
  - 点击 `发布前预览`，确认打开 H5 预览页。
  - 在 H5 预览页确认可见 `品牌故事`、`慢π · 品牌故事`、品牌介绍内容和 `π / 慢π / 课程 / 共修 / 活动 / 我的` 底部导航。
  - 回到后台点击 `复制页面配置`，确认弹窗文案 `将「首页」复制到当前页面，确认替换？`。
  - 确认复制后页面显示 `11 个模块`，包含 `慢π演示中心`、`运营公告`、`慢π服务`、`近期精选活动`、`我的慢π` 等首页模块。
  - 点击 `恢复上次发布版本` 并确认，页面恢复到 `0 个模块`，显示 `已恢复到上次加载的发布版本`。
  - 通过接口确认最终未保留复制模块。
- 输入的测试数据摘要：
  - 本阶段仅临时复制装修模块，最终全部恢复；未新增用户、订单、帖子或活动数据。
- 通过项：
  - 发布前预览可打开对应 H5 页面。
  - H5 预览页加载正常。
  - 复制页面配置有二次确认。
  - 复制配置能生成模块。
  - 恢复上次发布版本能撤销复制配置。
  - 刷新/接口层最终状态合理。
- 发现的问题：
  - 点击发布前预览后后台 DOM 中仍保留一个隐藏抽屉节点，但不影响预览、复制、恢复和接口状态；后续如要打磨交互，可再检查抽屉可见状态计算。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需生产真实域名、短信、支付商户资料、证书、回调 URL、真实小额支付/退款和真机海报保存/扫码验收。

### 遗留问题

- 发布前预览打开外部 H5 标签后，后台仍有隐藏抽屉 DOM 节点，当前不影响主流程；若运营反馈视觉/焦点异常，可单独做预览交互细化。
- 装修“恢复默认装修”的正向覆盖与恢复组合还可继续补做浏览器复验。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，建议进入“恢复默认装修组合操作浏览器复验”或回到“用户心得分享”侧补做真机/浏览器海报保存体验复查。

## 2026-06-24 - 慢π后台登录与装修辅助文案收口

### 阶段名称

用户心得分享与 H5 装修优化 - 慢π后台登录与装修辅助文案收口小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认上一阶段遗留“后台登录页仍显示活动报名后台”以及装修辅助文案中仍有英文默认标识。
- 后台登录页标题从 `活动报名后台` 改为 `慢π运营后台`，统一当前平台品牌。
- 后台装修页 hero 默认 eyebrow 从 `Activity OS` 改为 `慢π活动运营`，同时调整手机预览和抽屉预览的兜底展示。
- 后端首页默认配置中的 hero eyebrow 同步改为 `慢π活动运营`，避免新环境或恢复默认装修时再次出现英文旧标识。
- 演示 smoke 断言文案从 `书院动态不足 8 条` 改为 `慢π动态不足 8 条`，测试输出也保持慢π口径。

### 修改/新增的主要文件

- `apps/admin/src/views/Login.vue`
- `apps/admin/src/views/HomepageBuilder.vue`
- `apps/api/src/modules/homepage-defaults.ts`
- `scripts/smoke-online-showcase.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:33:42 +08:00。
- `rg -n "活动报名后台|Activity OS|书院动态|七维|奇外|电召" apps/admin apps/mobile apps/api scripts docs -S`：未匹配。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释提示和 vendor chunk size 提醒。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd run test:preflight-guards`：通过。

### 浏览器验收结果

- 验证环境：后台 `http://127.0.0.1:5174/admin`，API `http://127.0.0.1:3100/api`。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5174/admin/login`。
  - 确认登录页展示 `慢π运营后台`、`用户名`、`密码`、`登录`。
  - 确认页面不再展示 `活动报名后台`。
- 输入的测试数据摘要：
  - 本阶段未提交登录表单，未新增业务数据。
- 通过项：
  - 后台登录入口品牌文案已统一为慢π。
  - 装修默认标识和测试输出文案已统一为慢π口径。
  - 后台/API 构建和上线前预检均通过。
- 发现的问题：
  - 本阶段未发现新的前端或接口阻塞。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需生产真实域名、短信、支付商户资料、证书、回调 URL、真实小额支付/退款和真机海报保存/扫码验收。

### 遗留问题

- 仍允许“书院”作为文化空间、业务场景或院长招募对象出现；如运营要求彻底不用该业务词，需要单独做全站业务词替换策略。
- 装修“发布前预览 / 复制页面配置 / 恢复默认装修”的更多组合操作仍可继续做浏览器复验。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，建议进入“首页装修发布前预览与复制页面配置浏览器复验”小阶段。

## 2026-06-24 - 后台装修模板恢复快照修复与浏览器复验

### 阶段名称

用户心得分享与 H5 装修优化 - 后台装修模板恢复快照修复与浏览器复验小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续处理“首页装修 / H5 展示配置”中的后台模板、复制、预览发布和恢复体验。
- 复查并修复后台装修页“恢复上次发布版本”逻辑：原逻辑用 `lastPublishedRows.length` 判断是否存在快照，导致空页面的合法发布快照被误判为“没有可恢复快照”。
- 新增独立 `lastPublishedLoaded` 状态，加载发布配置后即标记快照可用，使空数组也能作为可恢复快照。
- 保持模板应用、复制、删除、保存等操作不覆盖初始发布快照；只有初始加载和明确恢复后才刷新快照。
- 右侧浏览器用平台超级管理员真实登录后台，打开 qiwai-showcase 的“品牌故事”装修页，执行“0 模块页面 -> 应用活动运营型模板 -> 恢复上次发布版本”的完整点击验证。
- 验证过程中发现商家运营账号访问平台/商家独立装修页会被权限拦截，随后切换平台超管账号复验；该权限拦截符合后台权限模型。
- 清理本阶段临时应用的模板模块，最终 qiwai-showcase 品牌故事页恢复为原始 `0 个模块` 状态。

### 修改/新增的主要文件

- `apps/admin/src/views/HomepageBuilder.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:30:50 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释提示和 vendor chunk size 提醒。
- `npm.cmd run test:preflight-guards`：通过。
- 本地 API 健康检查：`http://127.0.0.1:3100/api/health/ready` 返回 `ready=true`、`database=up`、`config=warning`。
- 后台 dev server：`http://127.0.0.1:5174/admin` 返回 200。

### 浏览器验收结果

- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - 后台：`http://127.0.0.1:5174/admin`
  - 演示租户：`qiwai-showcase` / tenant id `23` / 慢π演示中心。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5174/admin/homepage-builder?tenantId=23&pageKey=brand_story`。
  - 初始商家运营账号进入时，后台返回“当前账号无权限”，确认非平台账号不能编辑该范围。
  - 通过后台登录页使用平台超管 `admin` 登录。
  - 重新打开品牌故事装修页，确认页面显示 `品牌故事 · 商家独立装修`、`0 个模块`、`暂无模块`。
  - 点击 `应用模板`，确认应用 `活动运营型` 后页面变为 `4 个模块`，包含 `近期活动与共修报名`、`快捷入口`、`精选活动`、`参与者心得`。
  - 点击 `恢复上次发布版本` 并确认，页面恢复为 `0 个模块`，显示 `已恢复到上次加载的发布版本`。
  - 再次通过接口确认并清理测试模块，最终品牌故事页保留原始空配置。
- 输入的测试数据摘要：
  - 本阶段未创建业务数据；仅临时应用装修模板并恢复，最终未保留模板模块。
- 通过项：
  - 空页面发布快照可以被恢复。
  - 模板应用不会覆盖上次发布快照。
  - 恢复后页面模块数、标题和空状态符合预期。
  - 商家运营账号权限拦截生效。
  - 后台构建和上线前预检均通过。
- 发现的问题：
  - 浏览器控制台保留了本阶段早先用商家运营账号访问时产生的历史权限错误；切换平台超管后的模板应用与恢复流程未发现新的项目级阻塞。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需生产真实域名、短信、支付商户资料、证书、回调 URL、真实小额支付/退款和真机海报保存/扫码验收。

### 遗留问题

- 后台登录页仍显示“活动报名后台”旧系统通用标题，和慢π品牌不完全一致；若继续做品牌文案收口，可作为后续小阶段处理。
- 装修“恢复上次发布版本”目前恢复的是本次页面加载时快照，不是多版本发布历史；若运营需要多版本回滚，需要另做版本表和发布记录。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，建议进入“慢π后台登录与装修辅助文案收口”或“首页装修发布前预览/复制页面配置浏览器复验”小阶段。

## 2026-06-24 - 慢π品牌文案收口

### 阶段名称

用户心得分享与 H5 装修优化 - 慢π品牌文案与演示商城旧称呼收口小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认上一阶段浏览器验收已发现部分演示装修和商城测试数据仍使用“书院”作为品牌式称呼，本阶段继续做品牌文案收口。
- 移动端前台静态文案收口：品牌故事、搜索、商城首页、购物车、收藏、商城结算推广码、课程线下付款提示、共修打卡空状态等明显品牌/运营提示改为慢π、商家或运营方口径。
- 后台运营文案收口：大使/品牌故事默认文案、首页装修模板名称、视觉预设、商城分类占位、支付商户名称占位、商城营销活动占位、商品默认售后说明、运营流程说明等改为慢π或城市/商家口径。
- 后端默认配置与接口提示收口：品牌故事默认配置、定位匹配提示、商城未选商家/支付未就绪提示等改为慢π、城市/商家或联系商家口径。
- 演示数据和多商户 smoke 造数收口：线上演示 seed 中的慢π空间、慢π服务、慢π动态、慢π文创、慢π课程样板等文案已更新；多商户商城 smoke 中的 `书院自营` 改为 `慢π自营`。
- 对当前本地历史测试数据做非破坏性 UPDATE：仅替换商城商品品牌名和商户公告中的旧称呼，不删除订单、商品、结算、退款等测试数据。
- 重新 seed qiwai-showcase 演示数据，使当前本地演示租户立即使用慢π文案。

### 修改/新增的主要文件

- `scripts/seed-online-showcase.mjs`
- `scripts/smoke-mall-multi-merchant.mjs`
- `apps/mobile/src/entry-pages.ts`
- `apps/mobile/src/manifest.json`
- `apps/mobile/src/pages/community/checkin.vue`
- `apps/mobile/src/pages/search/index.vue`
- `apps/mobile/src/pages/mall/cart.vue`
- `apps/mobile/src/pages/mall/index.vue`
- `apps/mobile/src/pages/mall/merchant.vue`
- `apps/mobile/src/pages/mall/favorites.vue`
- `apps/mobile/src/pages/mall/checkout.vue`
- `apps/mobile/src/pages/order/payment.vue`
- `apps/admin/src/views/Ambassador.vue`
- `apps/admin/src/views/HomepageBuilder.vue`
- `apps/admin/src/views/MallPayments.vue`
- `apps/admin/src/views/MallCategories.vue`
- `apps/admin/src/views/MallProducts.vue`
- `apps/admin/src/views/MallMarketing.vue`
- `apps/admin/src/views/OperationFlow.vue`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/api/src/modules/mall/mall.service.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:18:40 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释提示和 vendor chunk size 提醒。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:API_BASE='http://127.0.0.1:3100/api'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'; $env:SHOWCASE_PASSWORD='Qiwai123456'; npm.cmd run seed:online-showcase`：通过，演示数据已更新为慢π品牌文案。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过，保留测试数据：活动 id `112`，报名 id `154`，参与者心得 post id `22`，首页装修模块 id `161`。
- 第一次运行 `npm.cmd run smoke:mall-multi-merchant` 因缺少 `SHOWCASE_PASSWORD` 环境变量失败；补充 `$env:SHOWCASE_PASSWORD='Qiwai123456'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'` 后重跑通过。
- `$env:API_BASE='http://127.0.0.1:3100/api'; $env:SHOWCASE_PASSWORD='Qiwai123456'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'; npm.cmd run smoke:mall-multi-merchant`：通过，覆盖多商户店铺、授权、商品审核、前台店铺、跨店购物车、履约、结算、退款冲抵、统计/导出。
- `npm.cmd run test:preflight-guards`：通过。
- `rg -n "七维书院|七维文化|奇外|电召|书院自营|书院严选|书院服务闭环|书院搜索|联系书院" apps scripts -S`：未匹配。
- 本地数据非破坏性 UPDATE：
  - `mall_products.brandName` 替换 `书院自营 -> 慢π自营`：影响 49 条历史测试商品。
  - `mall_merchants.notice` 替换 `书院好物 -> 慢π好物`：影响 1 条历史测试商户公告。
  - 未删除任何历史测试数据。

### 浏览器验收结果

- 验证环境：H5 `http://127.0.0.1:5273`，API `http://127.0.0.1:3100/api`，演示租户 `qiwai-showcase`。
- 浏览器验证主要步骤：
  - 打开 H5 首页，确认展示 `一座可运营的线上慢π空间`、`慢π动态`、底部 `π / 慢π`。
  - 打开 H5 商城首页，确认展示 `慢π严选`、`把课程、活动和好物放进同一个慢π服务闭环`。
  - 首次刷新商城时仍见旧 `书院自营`，经公开接口确认后端已返回 `慢π自营`，判断为 SPA 同路由缓存；加时间戳重新进入商城后旧称呼消失。
  - 商城商品流展示 `慢π自营`、`慢π文创`，不再展示 `书院自营 / 书院服务闭环 / 书院严选`。
  - 浏览器控制台 error：无项目级前端 error。

### 遗留问题

- 本阶段保留了“文化空间、书院、培训机构”“书院/读书会”“想开书院”等合作对象或院长招募语境，这些是业务概念，不作为平台品牌名处理。
- 若后续运营要求完全不用“书院”这个业务词，需要另开独立文案策略小阶段。
- 正式上线前仍需补测真机微信海报保存/扫码，以及生产短信、真实支付、回调、退款、证书和域名验收。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，若继续围绕“用户心得分享与 H5 装修优化方案”推进，建议进入“后台装修模板发布/恢复操作的浏览器复验”。
- 若准备上线预发，优先补齐生产资料并执行真实短信和真实支付预发验收。

## 2026-06-24 - 我的心得入口浏览器验收与慢π导航修正

### 阶段名称

用户心得分享与 H5 装修优化 - H5 我的心得入口右侧浏览器验收与演示装修品牌修正小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认上一小阶段已新增 H5 “我的心得”个人内容中心，本阶段进入右侧浏览器点击验收。
- 使用右侧浏览器打开 `http://127.0.0.1:5273/?tenantCode=qiwai-showcase#/pages/user/community-posts`。
- 验证“我的心得”页面标题、英雄区、状态筛选、空状态和“发布心得”入口可见。
- 点击“发布心得”，确认能跳转到 H5 发布心得页，并看到关联活动、心得内容、活动照片、城市/标签、提交审核和底部“我的心得”历史区。
- 在浏览器验收中发现 qiwai-showcase 演示租户底部导航仍显示历史标签“书院”，与当前平台名“慢π”不一致。
- 修正线上演示种子数据中的明显品牌标签：底部导航首项改为 `慢π / π`，快捷入口 `书院服务` 改为 `慢π服务`，快捷入口 `书院动态` 改为 `慢π动态`，我的页标题与 greeting 改为 `我的慢π`。
- 修正历史底部导航迁移默认值，避免全新环境初始化时再次生成“书院”作为首页底部导航标签。
- 重新执行线上演示 seed，使当前本地 qiwai-showcase 数据同步为慢π品牌导航。

### 修改/新增的主要文件

- `scripts/seed-online-showcase.mjs`
- `apps/api/src/migrations/1780900000000-HomepageBottomNavFiveItems.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:08:43 +08:00。
- `$env:API_BASE='http://127.0.0.1:3100/api'; $env:SHOWCASE_ADMIN_PASSWORD='Admin123456'; $env:SHOWCASE_PASSWORD='Qiwai123456'; npm.cmd run seed:online-showcase`：通过，qiwai-showcase 演示商家和 H5 首页装修已重置为演示版。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过，保留测试数据：活动 id `111`，报名 id `153`，参与者心得 post id `21`，首页装修模块 id `160`。
- `npm.cmd run test:preflight-guards`：通过。

### 浏览器验收结果

- 验证环境：
  - API：`http://127.0.0.1:3100/api`
  - H5：`http://127.0.0.1:5273`
  - 演示租户：`qiwai-showcase`
- 浏览器验证主要步骤：
  - 打开 H5 `我的心得` 页面。
  - 确认页面出现 `慢π · 活动分享`、`记录每一次真实参与`、`全部 / 待审核 / 已通过 / 未通过` 状态筛选。
  - 当前自动登录的本地演示用户暂无心得，页面显示 `还没有心得` 和 `发布心得` 入口。
  - 点击 `发布心得`，跳转到 `/pages/community/publish?tenantCode=qiwai-showcase`。
  - 确认发布页显示 `分享一次真实参与`、关联活动 `浏览器心得验收活动 1782233529706`、活动照片、提交审核和我的心得历史区。
  - 重新 seed 演示装修后刷新 `我的心得` 页面，确认底部导航显示 `π / 慢π / 课程 / 共修 / 活动 / 我的`，不再显示旧的 `书院` 底部标签。
  - 点击 `待审核` 状态筛选，页面显示 `暂无对应状态`，无阻塞。
  - 检查浏览器控制台 error：无项目级前端 error。
- 输入的测试数据摘要：
  - 本阶段浏览器未提交新表单，仅使用自动登录本地演示用户和已有 postable 活动做读操作与跳转验证。
  - 重新执行 seed 后，qiwai-showcase H5 首页装修保留为慢π演示版。
- 通过项：
  - H5 我的心得页面可打开。
  - 状态筛选可点击。
  - 空状态引导合理。
  - 发布心得入口跳转正确。
  - 演示租户底部导航品牌已修正为慢π。
  - 构建、心得 smoke 和全量预检均通过。
- 发现的问题：
  - 代码和演示数据中仍保留少量“书院”作为业务概念，例如“书院式学习”“文化空间/书院”，本阶段未全部替换；只修正了与平台品牌冲突的底部导航和演示装修标题。
- 是否达到可上线运营标准：
  - 本小阶段达到可运行、可测试、可继续开发状态。
  - 正式上线运营仍需生产外部资料和真实短信/支付预发验收。

### 遗留问题

- 若运营要求全站完全不用“书院”概念，需要单独规划一次“全站业务文案收口”小阶段，区分品牌名、业务概念和历史内部 code。
- 真机微信长按保存动态海报、二维码扫码识别仍需上线前补测。
- 生产真实 HTTPS 域名、短信服务商、微信/支付宝商户资料、证书、回调 URL 和真实预发支付验收数据仍需在后台补齐并做预发验收。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，若继续围绕“用户心得分享与 H5 装修优化方案”推进，建议进入“后台装修模板发布/恢复操作的浏览器复验”或“全站业务文案收口”小阶段。
- 若准备上线预发，优先进入真实短信、真实支付、支付回调、退款和证书可读性的预发验收。

## 2026-06-24 - 用户心得个人中心入口增强

### 阶段名称

用户心得分享与 H5 装修优化 - H5 我的心得个人内容中心小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认“用户心得分享与 H5 装修优化方案”主链路已通过本地验收，本阶段继续细化用户端心得提交后的状态查看与再分享体验。
- 新增 H5 `我的心得` 页面，复用现有 `/public/me/community/posts` 接口，集中展示用户提交过的活动心得。
- `我的心得` 页面支持按 `全部 / 待审核 / 已通过 / 未通过` 筛选，并显示各状态数量。
- 已通过心得可点击进入公开动态详情，继续使用原有点赞、评论、复制链接和生成海报能力；待审核心得展示“后台审核中”；未通过心得展示审核意见。
- H5 “我的”页新增“我的活动心得”卡片入口，用户不需要回到发布页也能查看审核状态。
- H5 “设置”页新增“我的活动心得”入口。
- H5 “发布心得”页底部历史心得列表增强操作提示：已通过可跳转详情并分享，待审核/未通过保留状态说明。
- 复查展示文案，未发现 `电召`、`奇外`、`七维文化` 等错误品牌文案残留；当前展示侧继续使用“慢π”。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/community-posts.vue`
- `apps/mobile/src/pages.json`
- `apps/mobile/src/pages/user/my.vue`
- `apps/mobile/src/pages/user/settings.vue`
- `apps/mobile/src/pages/community/publish.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 01:04:14 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过，保留测试数据：活动 id `110`，报名 id `152`，参与者心得 post id `20`，首页装修模块 id `135`。
- `npm.cmd run test:preflight-guards`：通过；包含真实支付门禁、多租户、多商户商城、公益与心得高风险文案、上传、导出、财务对账、运营审计等上线前静态 guard。
- `rg -n "电召|七维文化|奇外" apps docs scripts -S`：未匹配。

### 浏览器验收结果

- 本阶段为 H5 页面与入口增强阶段，已通过 H5 构建、心得 smoke 和全量预检验证。
- 未新增右侧浏览器点击验收；下一轮若继续本地验收，可用右侧浏览器打开 `/pages/user/community-posts`，检查登录后列表、状态筛选、已通过详情跳转和继续发布入口。

### 遗留问题

- 本阶段未改变后端审核、图片上传、公开展示和海报生成逻辑，仅增强用户端查看入口。
- 真机微信长按保存海报、二维码扫码识别仍需上线前补测。
- 生产真实 HTTPS 域名、短信服务商、微信/支付宝商户资料、证书、回调 URL 和真实预发支付验收数据仍需在后台补齐并做预发验收。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，若继续围绕“用户心得分享与 H5 装修优化方案”推进，建议进入“后台装修模板发布/恢复操作的浏览器复验”或“用户心得个人中心入口的右侧浏览器点击验收”小阶段。
- 若准备上线预发，优先补齐生产外部资料并执行真实短信、真实小额支付、支付回调、退款和证书可读性验收。

## 2026-06-24 - 最终主流程浏览器验收

### 阶段名称

用户心得分享与 H5 装修优化后 - 慢π本地主流程浏览器验收小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认上一个小阶段已修复多商户商城结算 smoke 幂等性，当前进入最终主流程浏览器验收。
- 使用右侧浏览器打开后台 `http://127.0.0.1:5174/admin`，确认平台超级管理员登录态可用，后台仪表盘和菜单正常。
- 使用 H5 `http://127.0.0.1:5273/?tenantCode=qiwai-showcase` 验证活动列表、活动详情、报名表单、免费报名提交、报名详情刷新持久化。
- 创建并保留浏览器测试报名：活动 `【演示】国学经典晨读体验营`，报名 id `150`，姓名 `浏览器验收用户1782233205`，手机号 `13990000001`，报名成功且订单已付款。
- 验证“未签到/未结束活动不能发布心得”的前端挡板：报名详情进入发布心得页后，页面提示“暂时不能发布心得”，符合计划中参与者优先与发布资格限制。
- 准备并保留一组已签到发布资格数据：活动 id `109`，报名 id `151`，用户 `13933529706 / 浏览器心得用户9706`，通过 H5 验证码登录后进入发布心得页。
- 在发布心得页填写心得、城市和标签；点击提交审核时，页面提示“请至少上传 1 张活动照片”，符合计划中帖子需支持 1-9 张图片的约束。图片选择器受浏览器自动化限制，本阶段未通过 UI 选择本地文件；图片上传、待审核提交、后台审核和公开展示已由 `smoke:community-sharing` 覆盖。
- 验证 H5 动态详情和海报入口：打开 qiwai-showcase 官方动态 id `18`，刷新后公开详情正常展示；点击“生成海报”后出现海报提示“长按图片保存，或复制链接分享到朋友圈”。
- 巡检 H5 主页面：首页、课程首页、公益页、志愿服务页、商城首页均可打开，关键文案和数据可见，无项目级前端 error。
- 巡检后台平台页：全局数据看板、共修动态、前台全局装修、商城店铺、商城结算、公益池、公益与招募线索、志愿者档案均可打开，无项目级前端 error。
- 通过后台真实登录页退出平台账号后，使用店铺运营账号 `showcase_store_owner / Qiwai123456` 登录；确认进入“慢π演示中心管理后台”，菜单切换为商家端，能查看工作台、活动、报名签到、商城管理、装修营销等商家范围，并看到本阶段创建的浏览器验收活动报名/签到数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:57:50 +08:00。
- 验证环境：
  - API：`http://127.0.0.1:3100/api`，`ready=true`、`database=up`、`config=warning`。
  - 后台：`http://127.0.0.1:5174/admin`。
  - H5：`http://127.0.0.1:5273`。
  - 演示租户：`qiwai-showcase` / 慢π演示中心。
- 本阶段未新增构建命令；沿用上一阶段已通过的：
  - `npm.cmd --prefix apps/api run build`
  - `npm.cmd run seed:online-showcase`
  - `npm.cmd run smoke:mall-multi-merchant`
  - `npm.cmd run smoke:qiwai-demo`
  - `npm.cmd run smoke:community-sharing`
  - `npm.cmd run test:preflight-guards`

### 浏览器验收结果

- 浏览器验证主要步骤：
  - 后台平台超管打开 `/admin/dashboard`，确认“全局数据看板”和平台菜单正常。
  - H5 打开 `/pages/activity/list`，确认 6 场演示活动、搜索、筛选、底部导航正常。
  - 从活动列表点击第一场“去报名”，进入活动详情 id `100`，确认活动信息、服务说明、报名须知、我的报名、分享心得、活动口碑入口可见。
  - 点击“立即报名”，填写姓名 `浏览器验收用户1782233205`、手机号 `13990000001`，二次确认后生成报名详情 id `150`。
  - 刷新报名详情，确认报名成功、订单已付款、报名信息、签到码入口、评价活动和分享活动心得入口仍存在。
  - 从报名详情进入发布心得页，确认未签到/未结束时不能发布，页面给出明确提示。
  - 用测试用户 `13933529706` 通过 H5 验证码 `123456` 登录，跳转到已签到活动 id `109` 的发布心得页。
  - 填写心得 `这是通过右侧浏览器提交的慢π活动心得验收内容：流程清晰、现场体验完整，适合新用户理解活动价值。`、城市 `重庆`、标签 `浏览器验收,共修心得`，提交时验证图片必填挡板。
  - 打开动态详情 id `18`，刷新后详情正常展示，点击“生成海报”出现海报保存/复制链接提示。
  - 依次打开 H5 首页、课程首页、公益页、志愿服务页、商城首页，确认慢π品牌、活动、课程、公益项目、志愿任务、商城店铺和商品流可见。
  - 依次打开后台共修动态、装修、商城店铺、商城结算、公益池、公益与招募线索、志愿者档案页面，确认页面和关键数据正常。
  - 后台退出平台账号，使用店铺运营账号登录，确认商家端工作台和菜单权限正常。
- 输入的测试数据摘要：
  - 报名 id `150`：`浏览器验收用户1782233205 / 13990000001`，活动 id `100`，免费报名成功。
  - 活动 id `109`、报名 id `151`：`浏览器心得用户9706 / 13933529706`，已签到，用于心得发布资格验证。
  - 动态详情 id `18`：用于公开动态详情与海报入口验证。
- 通过项：
  - 页面能正常打开：后台平台/商家端、H5 首页/活动/课程/公益/志愿/商城/动态详情均通过。
  - 登录入口可用：H5 验证码登录通过；后台平台账号已登录，店铺运营账号真实登录通过。
  - 核心业务流程可走通：H5 活动列表 -> 详情 -> 报名表单 -> 免费报名 -> 报名详情 -> 刷新持久化通过。
  - 用户心得流程核心挡板可用：未满足资格时明确阻止；已签到用户可进入发布表单；图片必填校验生效；完整图片上传/提交/审核链路由 smoke 覆盖通过。
  - H5 装修与展示配置可见：H5 首页、课程、公益、商城、品牌/动态相关页面覆盖在前序阶段和本阶段巡检中可用；后台装修页可打开。
  - 商城多商户、财务结算、退款冲抵、运营后台接口由 smoke 全量通过。
  - 刷新页面后关键数据状态合理：报名详情刷新后仍显示报名成功和订单已付款。
  - 浏览器控制台未发现项目级前端 error；一次 Statsig 外部遥测超时来自浏览器工具侧，不属于项目页面错误。
- 发现的问题：
  - 浏览器自动化无法直接操作系统文件选择器，因此本阶段未用右侧浏览器选择本地图片上传心得；图片上传接口、待审核提交、后台审核和公开展示已由 `smoke:community-sharing` 验证通过。
  - 真机微信长按保存海报、二维码扫码识别仍需上线前补测。
  - 生产真实 HTTPS 域名、短信服务商、微信/支付宝商户资料、证书、回调 URL 和真实预发支付验收数据仍需由运营/部署侧在后台补齐并完成小额真实预发验收。
- 是否达到可上线运营标准：
  - 本地功能、演示数据、后台/H5 主流程、用户心得与 H5 装修优化、多商户商城与公益/招募核心链路已达到“可演示、可测试、可继续部署预发”的状态。
  - 正式上线运营标准仍以生产外部资料和真实支付预发验收为门槛；这些资料目前可以在后台补齐，但未在本地验收中替代真实服务商验收。

### 遗留问题

- 生产侧补齐真实外部资料后，需再跑一次预发环境验收：短信验证码、真实微信/支付宝小额支付、支付回调、退款、证书可读性、回调 URL 可访问性和服务商后台留痕。
- 真机微信环境需补测动态海报长按保存、二维码识别和分享链路。
- 如运营后续大量使用日期筛选，建议单独规划“全站日期筛选时区一致性”小阶段。

### 下一阶段应继续处理的事项

- 若继续开发，建议进入生产预发资料补齐后的真实支付/短信/域名验收，而不是继续新增功能。
- 若仅本地代码验收，本轮用户心得分享与 H5 装修优化方案已经完成主流程浏览器验收。

## 2026-06-24 - 多商户商城结算验收稳定性修复

### 阶段名称

最终主流程验收准备 - 多商户商城结算与运营后台 smoke 幂等性修复小阶段。

### 本阶段完成内容

- 重新读取开发计划和 `DEVELOPMENT_LOG.md`，确认当前已进入用户心得分享与 H5 装修优化后的最终主流程验收准备，上一轮遗留问题为 `smoke:mall-multi-merchant` 在长生命周期本地库中重复运行失败。
- 修复商城结算退款入账日期口径：生成商城结算草稿和待结算汇总时，退款按 `COALESCE(refund.completedAt, refund.createdAt)` 进入周期，避免用户先申请售后、财务后审核时漏入结算。
- 修复后台商城结算列表/导出的日期筛选口径：`startDate/endDate` 改为按结算周期 `periodStart/periodEnd` 过滤，不再按结算单创建时间过滤，避免本地 UTC/上海时区差异导致当天结算单列表为空。
- 增强多商户商城 smoke 幂等性：在创建本次余额支付结算样本前，自动生成并完成代理店历史待结算记录清理批次，防止旧退款冲抵污染本次“余额支付应进入平台代收结算口径”的断言。
- 调整多商户商城 smoke 的订单导出断言：订单导出隔离验证按 `merchantId` 过滤，不再叠加本地日期过滤噪音；仍验证店铺名称、收款模式和跨店隔离。
- 重启本地源码 API `http://127.0.0.1:3100`，确保 smoke 使用最新构建产物。

### 修改/新增的主要文件

- `apps/api/src/modules/mall/mall.service.ts`
- `scripts/smoke-mall-multi-merchant.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:47:23 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`、`config=warning`。
- `npm.cmd run seed:online-showcase`：通过，慢π线上演示商家、后台账号、商城、课程、活动、共修和演示用户均准备完成。
- `npm.cmd run smoke:mall-multi-merchant`：通过；覆盖店铺主体、授权隔离、商品审核、前台店铺/商品、跨店购物车拆单、履约、结算审核打款、余额支付平台代收结算、已结算后退款冲抵、运营后台统计/日志/导出。
- `npm.cmd run smoke:qiwai-demo`：通过；慢π杭州/苏州/成都样板主流程、退款、城市合伙人结算、平台监管和活动审核均通过。
- `npm.cmd run smoke:community-sharing`：通过；保留测试数据：活动 id `107`，报名 id `149`，参与者心得 post id `19`，首页装修模块 id `134`。
- `npm.cmd run test:preflight-guards`：通过；包含公益与心得高风险文案扫描、真实支付门禁、多商户商城、租户隔离、上传、导出、财务对账等 guard。

### 浏览器验收结果

- 本阶段为 smoke/接口与后台财务口径修复阶段，未新增右侧浏览器点击。
- 当前本地服务状态：API `http://127.0.0.1:3100` ready；后台 `http://127.0.0.1:5174/admin` 仍在监听；H5 `http://127.0.0.1:5273` 仍在监听。
- 浏览器最终主流程验收将在下一小阶段执行。

### 遗留问题

- 本阶段仅修复商城结算/导出验收稳定性，没有做全站日期筛选时区统一改造；若后续运营大量依赖“创建日期”筛选，建议单独规划日期时区一致性小阶段。
- 多商户 smoke 会保留测试订单、结算单、退款单、清理批次和守卫测试店铺数据，符合当前“保留测试数据”的验收要求。
- 真实生产外部资料仍需上线前在后台补齐：真实 HTTPS 域名、短信服务商、微信/支付宝商户号、密钥、证书、回调 URL 和真实预发验收数据。

### 下一阶段应继续处理的事项

- 重新读取开发计划和开发记录后，进入最终主流程浏览器验收小阶段。
- 用右侧浏览器验证后台与 H5 主流程：页面打开、登录入口、活动报名/详情、用户心得发布/审核/公开展示/海报、H5 装修渲染、公益/志愿、商城店铺/商品/订单/财务入口等关键交互。
- 验收完成后把浏览器步骤、测试数据、通过项、发现问题和是否达到可上线运营标准写回本文件。

## 2026-06-24 - 用户心得与 H5 装修剩余项核查

### 阶段名称

用户心得分享与 H5 装修优化 - 剩余项核查与最终主流程验收准备小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md`、开发计划、`package.json` 和用户心得 / 装修相关记录。
- 核对本轮“用户心得分享与 H5 装修优化方案”的主要交付：参与者心得发布资格、图片上传接口、待审核隔离、后台审核、公开列表/详情、分享次数、前端海报、二维码、首页/共修/课程/公益/商城/品牌故事/动态详情页面覆盖、装修模板、视觉控件、发布前预览、复制配置、恢复版本入口、后台 UI 新增模块保存，均已有代码或浏览器/接口验收记录。
- 确认本轮剩余事项不再是代码阻塞，主要为最终主流程浏览器验收、真机微信海报扫码补验、生产外部资料门禁。
- 确认当前本地服务可用：API ready，后台 200，H5 200，可进入最终主流程验收。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:35:12 +08:00。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`、`config=warning`。
- `GET http://127.0.0.1:5174/admin`：通过，HTTP 200。
- `GET http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/index/index`：通过，HTTP 200。

### 浏览器验收结果

- 本阶段为验收准备阶段，未新增页面点击；上一阶段已在右侧浏览器验证后台装修 UI 保存和 H5 动态详情同步。
- 浏览器最终主流程验收将在下一小阶段执行。

### 遗留问题

- 真机微信长按保存海报、二维码扫码识别仍建议上线前补测。
- 生产真实 HTTPS 域名、短信服务商、微信/支付宝商户资料、证书、回调 URL 和预发验收数据需要由运营/部署侧在后台补齐并跑真实预发验收。

### 下一阶段应继续处理的事项

- 执行最终多角色主流程浏览器验收：后台平台管理员、H5 用户、装修/心得/活动/公益/商城关键页面和核心表单/列表/详情/刷新状态。
- 验收结果写回 `DEVELOPMENT_LOG.md`。

## 2026-06-24 - 后台装修新增模块 UI 保存复验

### 阶段名称

用户心得分享与 H5 装修优化 - 后台装修新增模块表单点击保存与前台同步小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和开发计划，确认“后台点击新增模块保存的完整 UI 表单链路”仍是本轮装修优化的验收空白。
- 使用右侧浏览器打开后台 `http://127.0.0.1:5174/admin/homepage-builder?tenantId=3&pageKey=community_detail`，确认已登录平台超级管理员并定位到成都租户动态详情装修页。
- 在后台“添加模块”区域点击“富文本 / 报名须知与说明”，打开模块编辑抽屉。
- 通过真实 UI 表单填写标题、副标题和内容，并点击抽屉底部“保存模块”按钮。
- 后台列表刷新后显示 `动态详情 · 商家独立装修` 从 1 个模块变为 2 个模块，并出现新模块 `UI表单保存验收 1782231947975`。
- 前台 H5 动态详情页刷新后显示该 UI 保存模块，确认后台表单保存、接口持久化和 H5 渲染同步闭环可用。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:32:30 +08:00。
- `GET /api/admin/homepage/sections?tenantId=3&pageKey=community_detail`：通过，查到 UI 保存模块 id `84`，`pageKey=community_detail`，`type=rich_text`，标题 `UI表单保存验收 1782231947975`。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释警告和 vendor chunk size 提醒。

### 浏览器验收结果

- 验证时间：2026-06-24 00:32:30 +08:00。
- 验证环境：后台 dev server `http://127.0.0.1:5174/admin`，H5 dev server `http://127.0.0.1:5273`，源码 API `http://127.0.0.1:3100/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开后台 `http://127.0.0.1:5174/admin/homepage-builder?tenantId=3&pageKey=community_detail`。
  - 点击“富文本 / 报名须知与说明”添加模块。
  - 在抽屉表单填入标题 `UI表单保存验收 1782231947975`、副标题 `后台点击新增模块保存`、内容 `浏览器验收文案 1782231947975：这是通过后台装修页面表单点击保存的动态详情模块。`。
  - 点击底部“保存模块”，确认抽屉关闭，后台模块列表显示新模块，并出现“已保存到「慢π成都城市合伙人」”提示。
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/community/detail?id=2&tenantCode=qiwai-chengdu`。
  - 确认 H5 动态详情页展示 `UI表单保存验收 1782231947975` 和对应验收文案。
  - 确认原有参与者心得内容、评论区、复制链接、生成海报、写评论按钮仍可见。
  - 检查浏览器控制台错误日志：无前端 error。
- 输入的测试数据摘要：成都租户动态详情装修模块 id `84`，参与者心得 post id `2`。
- 通过项：后台装修新增模块 UI 点击链路、表单保存、后台列表回显、公开 H5 同步渲染均通过。
- 发现的问题：浏览器控制底层有一次 Statsig 外部请求超时日志，来源为工具侧外部遥测请求，不属于项目页面错误；项目页 error 日志为空。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；后台装修新增模块 UI 保存链路已通过本地浏览器验收。

### 遗留问题

- 本阶段没有点击“应用模板/复制页面配置/恢复上次发布版本”这类替换型操作，避免覆盖当前保留的验收模块；这些入口此前已做能力核查。
- 图片上传文件选择器仍受浏览器自动化限制，图片上传继续由 smoke/API 覆盖。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，进入“用户心得分享与 H5 装修优化方案剩余项核查与最终主流程验收准备”小阶段。
- 若核查无新增代码缺口，开始准备并执行最终多角色主流程浏览器验收。

## 2026-06-24 - 共修首页与动态详情装修覆盖接入

### 阶段名称

用户心得分享与 H5 装修优化 - 共修首页和动态详情 H5 页面覆盖渲染小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和开发计划，确认“页面覆盖”计划中 `community_home` 与 `community_detail` 已在后台配置中存在，但 H5 共修首页和动态详情页尚未渲染对应装修模块。
- H5 共修首页接入 `usePageDecoration("community_home")` 和 `PageDecorationBlocks`，支持运营在后台为共修首页添加用户心得流、精选心得、活动口碑墙、富文本等装修模块。
- H5 动态详情页接入 `usePageDecoration("community_detail")` 和 `PageDecorationBlocks`，支持运营在帖子详情上方插入动态详情页专属装修模块。
- 两个页面都过滤默认兜底的“页面说明”类模块，避免重复显示基础标题说明，只展示后台真实配置的运营模块。
- 保持既有用户心得主链路不变：共修列表、活动口碑筛选、发布心得入口、动态详情、评论区、复制链接、生成海报仍可用。
- 为成都租户保留本阶段验收装修模块：`community_home` section id `82`，`community_detail` section id `83`。

### 修改/新增的主要文件

- `apps/mobile/src/pages/community/index.vue`
- `apps/mobile/src/pages/community/detail.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:26:46 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过，保留测试数据：活动 id `97`，报名 id `141`，参与者心得帖 id `9`，首页心得装修模块 id `81`。
- `npm.cmd run test:preflight-guards`：通过，包含高风险公益文案扫描、上传、烟测、权限、租户隔离、支付门禁等 guard。
- `POST /api/admin/homepage/sections?tenantId=3&pageKey=community_home`：创建验收模块 id `82`，标题 `共修首页装修验收 1782231947975`。
- `POST /api/admin/homepage/sections?tenantId=3&pageKey=community_detail`：创建验收模块 id `83`，标题 `动态详情装修验收 1782231947975`。

### 浏览器验收结果

- 验证时间：2026-06-24 00:26:46 +08:00。
- 验证环境：H5 dev server `http://127.0.0.1:5273`，源码 API `http://127.0.0.1:3100/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/community/index?tenantCode=qiwai-chengdu`。
  - 确认页面显示 `共修首页装修验收 1782231947975` 和 `慢π共修首页已支持运营装修模块`。
  - 确认共修首页原有“加入文化大使计划”“分享活动心得”“近期活动”“今日打卡”“学员动态”和底部导航仍正常显示。
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/community/detail?id=2&tenantCode=qiwai-chengdu`。
  - 确认页面显示 `动态详情装修验收 1782231947975` 和 `慢π动态详情已支持页面覆盖装修`。
  - 确认动态详情原有帖子内容、评论区、复制链接、生成海报、写评论按钮仍正常显示。
  - 检查浏览器控制台错误日志：无前端 error。
- 输入的测试数据摘要：成都租户装修模块 id `82/83`，参与者心得 post id `2`。
- 通过项：共修首页页面覆盖可渲染；动态详情页面覆盖可渲染；页面原有心得展示、评论和分享入口未被破坏；无明显前端错误。
- 发现的问题：本阶段只验证了富文本模块；用户心得流、精选心得和活动口碑墙等装修模块已由组件能力与前序 smoke 覆盖，未在这两个新页面逐个造数复验。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；“页面覆盖”中共修首页和动态详情的 H5 渲染缺口已补齐。

### 遗留问题

- 动态详情页仍保留固定底部操作栏；如果运营在动态详情配置大量模块，需在真机上补看滚动距离和底部操作栏遮挡情况。
- 后台装修 UI 的“新增模块表单点击保存”未在本阶段重复操作，本阶段通过后台接口创建模块并用 H5 浏览器验证渲染结果。
- 海报二维码仍建议上线前用微信真机长按保存/扫码补验。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，进入“用户心得分享与 H5 装修优化方案剩余项核查与最终主流程验收准备”小阶段：核对计划项与已验收证据，确认是否还有必须修复的代码缺口。
- 如无新的计划内缺口，开始准备最终多角色主流程浏览器验收。

## 2026-06-24 - 后台动态管理筛选与审核状态复验

### 阶段名称

用户心得分享与 H5 装修优化 - 后台动态管理来源、状态与审核展示复验小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和开发计划，确认本阶段补验用户心得分享方案中的后台审核管理能力。
- 通过接口验证后台动态筛选可按 `source=participant`、`status=approved`、`activityId=90` 查询，能查到已审核参与者心得 post id `2`。
- 通过接口验证当前参与者心得待审核列表为 0，符合本地数据现状。
- 浏览器打开后台 `/admin/community`，默认进入“共修活动”Tab，切换到“共修动态/文章”Tab。
- 确认后台动态管理页显示审核状态、来源、关联活动、内容、所属商家、展示状态、点赞、分享、时间和操作列。
- 确认列表中可见多条 `参与者心得`，审核状态为 `已通过`，展示状态为 `展示`，操作按钮包含通过、拒绝、下架、删除。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:21:17 +08:00。
- `GET /api/admin/community-posts?source=participant&status=approved&activityId=90&limit=20`：通过，返回 1 条，包含 post id `2`。
- `GET /api/admin/community-posts?source=participant&status=pending&limit=20`：通过，返回 0 条。
- 本阶段未修改业务代码；沿用前序阶段通过的 H5/Admin 构建和预检结果。

### 浏览器验收结果

- 验证时间：2026-06-24 00:21:17 +08:00。
- 验证环境：后台 dev server `http://127.0.0.1:5174/admin`，源码 API `http://127.0.0.1:3100/api`。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5174/admin/community`。
  - 确认页面位于“慢π运营 / 共修动态”模块。
  - 点击“共修动态/文章”Tab。
  - 确认页面显示“发布动态/文章”“审核状态”“来源”等筛选/操作区域。
  - 确认表格列包括用户 ID、来源、关联活动、内容、所属商家、审核、展示、点赞、分享、时间、操作。
  - 确认表格中多条参与者心得显示“已通过”“展示”，并带有“通过 / 拒绝 / 下架 / 删除”操作按钮。
  - 检查浏览器控制台错误日志：无前端 error。
- 输入的测试数据摘要：沿用已审核参与者心得 post id `2`，以及 smoke 保留的 post id `5/6/7/8` 等参与者心得数据。
- 通过项：后台动态管理入口、文章 Tab、来源展示、审核状态展示、分享数字段、审核操作按钮均可见；接口筛选与 UI 展示一致。
- 发现的问题：本阶段未新增待审核内容，因此没有再次点击“通过/拒绝”；此前浏览器交互验收已经覆盖 post id `2` 从待审核到通过的操作。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；后台动态审核管理的可见性与筛选接口已通过本地复验。

### 遗留问题

- 后台列表当前仍会显示“通过”按钮在已通过内容上，属于已有操作按钮策略；若要减少误操作，可后续按状态隐藏无效操作。
- 未在本阶段重新制造待审核帖，避免污染审核队列；待审核流已由 smoke 和此前浏览器验收覆盖。
- 若后续数据量增大，动态列表筛选和分页体验还需压测。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，建议进入“用户心得分享与 H5 装修优化方案剩余项核查与最终主流程验收准备”小阶段：核对计划项、确认是否还有必须修复的计划内缺口，然后再决定是否进入全系统主流程验收。

## 2026-06-24 - 后台装修页面覆盖 UI 与预览链接复验

### 阶段名称

用户心得分享与 H5 装修优化 - 后台装修页面覆盖 UI 与 H5 预览链接复验小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和开发计划，确认本阶段补验后台装修 UI 能否定位新增页面覆盖和已保存模块。
- 打开后台首页装修页 `tenantId=3&pageKey=course_home`，确认成都租户课程首页装修模块可见。
- 继续打开 `charity_page`、`mall_home`、`brand_story`，确认公益页、商城首页、品牌故事页均能通过 URL 直达并显示对应测试模块。
- 发现后台 H5 预览链接本地默认指向 `127.0.0.1:4139`，当前本地 H5 实际验收服务为 `127.0.0.1:5273`，会导致运营点击预览链接不可用。
- 修复后台 H5 预览 origin 的本地默认值，将 localhost/127.0.0.1 默认预览端口调整为 `5273`，仍保留 `VITE_H5_ORIGIN` 配置优先，生产非本地域名会去掉本地端口。
- 刷新后台装修页后，课程、公益、商城、品牌故事的预览链接均指向 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#...`。

### 修改/新增的主要文件

- `apps/admin/src/h5-preview.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:19:22 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释警告和大 chunk 提醒。
- `GET http://127.0.0.1:5273/api/public/page-decoration?pageKey=course_home&tenantCode=qiwai-chengdu`：通过，返回课程首页装修模块 id `78`。
- `GET http://127.0.0.1:5173/api/public/page-decoration?pageKey=course_home&tenantCode=qiwai-chengdu`：返回 404，确认当前可用 H5 验收服务不是 5173，而是 5273。

### 浏览器验收结果

- 验证时间：2026-06-24 00:19:22 +08:00。
- 验证环境：后台 dev server `http://127.0.0.1:5174/admin`，H5 dev server `http://127.0.0.1:5273`，源码 API `http://127.0.0.1:3100/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `/admin/homepage-builder?tenantId=3&pageKey=course_home`，确认页面显示“课程首页 · 商家独立装修”、模块 `课程首页装修验收 1782230618945`，预览链接为 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/courses/index`。
  - 打开 `/admin/homepage-builder?tenantId=3&pageKey=charity_page`，确认页面显示“公益页 · 商家独立装修”、模块 `公益页装修验收 1782230618945`，预览链接为 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/charity/index`。
  - 打开 `/admin/homepage-builder?tenantId=3&pageKey=mall_home`，确认页面显示“商城首页 · 商家独立装修”、模块 `商城首页装修验收 1782230618945`，预览链接为 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/mall/index`。
  - 打开 `/admin/homepage-builder?tenantId=3&pageKey=brand_story`，确认页面显示“品牌故事 · 商家独立装修”、模块 `慢π品牌故事装修验收 1782230100658`，预览链接为 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/brand/story`。
  - 检查浏览器控制台错误日志：无前端 error。
- 输入的测试数据摘要：沿用成都租户页面覆盖测试模块 id `78/79/80/77`。
- 通过项：后台装修页新增页面覆盖可 URL 直达；页面选择、商家选择、模块列表、模块类型入口、预览链接均可见；预览链接端口已指向当前可用 H5 服务。
- 发现的问题：当前本地存在一个 5173 监听服务，但它不能代理本项目 API；本阶段已避免后台默认预览到 5173。若后续团队统一恢复 5173，可通过 `VITE_H5_ORIGIN` 显式配置。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；后台装修页面覆盖与本地预览链接体验已通过浏览器验证。

### 遗留问题

- 本阶段没有执行“应用模板/复制页面配置/恢复默认装修”等替换型操作，避免破坏当前测试装修数据；这些能力此前已做入口核查。
- 后台点击新增模块保存的完整 UI 表单链路仍可在最终验收时用专门测试页面补一次。
- 本地预览端口属于开发环境配置，生产上线必须使用真实 `VITE_H5_ORIGIN` 或部署域名。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，按“用户心得分享与 H5 装修优化方案”进入下一个小阶段：建议对后台动态管理的来源/状态筛选、审核状态展示做最后一次浏览器复验，或汇总当前方案剩余项准备最终主流程验收。

## 2026-06-24 - 发布心得入口真实路径复验

### 阶段名称

用户心得分享与 H5 装修优化 - 活动详情、报名详情、共修动态发布心得入口可见性复验小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和开发计划，确认本阶段复验用户心得分享方案中的发布入口真实路径。
- 选取成都租户活动 id `90`：`成都心得浏览器验收活动 1782227173747`。
- 查询该活动已有报名记录 id `134`，状态为 `checked_in`，归属用户 `13800000001`。
- 浏览器打开活动详情页，确认“分享心得”和“活动口碑”入口可见。
- 浏览器打开共修动态活动口碑页，确认“活动口碑”、活动筛选说明和已审核心得可见。
- 首次打开报名详情时，因当前浏览器登录用户不是报名归属用户，接口按用户隔离返回“报名记录不存在”；随后使用测试账号 `13800000001` 通过 H5 验证码登录。
- 登录后重新进入报名详情页，确认“分享活动心得”入口可见。
- 点击报名详情“分享活动心得”，确认跳转到发布心得页并携带 `activityId=90`，发布页能识别该已签到活动。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:14:58 +08:00。
- `GET /api/public/activities/90?tenantCode=qiwai-chengdu`：通过，返回活动 `成都心得浏览器验收活动 1782227173747`。
- 后台查询报名：registration id `134`，`status=checked_in`，`userId=104`，用户手机号 `13800000001`。
- H5 验证码登录测试账号 `13800000001`：通过，使用本地开发验证码 `123456`。
- 本阶段未修改业务代码；沿用上一小阶段已通过的构建和预检结果。

### 浏览器验收结果

- 验证时间：2026-06-24 00:14:58 +08:00。
- 验证环境：本地 H5 dev server `http://127.0.0.1:5273`，源码 API `http://127.0.0.1:3100/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `#/pages/activity/detail?id=90`，确认活动详情页显示“分享心得”“活动口碑”。
  - 打开 `#/pages/community/index?activityId=90`，确认显示“活动口碑”“仅展示当前活动关联心得”，并展示已审核参与者心得。
  - 打开 `#/pages/user/registration?id=134`，未登录对应用户时返回“报名记录不存在”，确认用户报名详情隔离生效。
  - 打开 H5 登录页，切换验证码登录，输入 `13800000001`，获取本地验证码 `123456` 并登录成功。
  - 登录后自动跳转到 `#/pages/user/registration?id=134&tenantCode=qiwai-chengdu`，确认报名详情页显示“已签到”“查看签到码”“评价活动”“分享活动心得”。
  - 点击“分享活动心得”，确认进入 `#/pages/community/publish?activityId=90&tenantCode=qiwai-chengdu`。
  - 发布页显示“发布心得”，关联活动为 `成都心得浏览器验收活动 1782227173747`，我的心得列表显示 1 条已通过心得。
  - 检查浏览器控制台错误日志：无前端 error。
- 输入的测试数据摘要：沿用测试账号 `13800000001`、报名记录 id `134`、活动 id `90`、已审核参与者心得 post id `2`。
- 通过项：活动详情入口、报名详情入口、共修动态活动口碑入口、登录跳转、活动 ID 传递、发布页活动识别和我的心得展示均通过。
- 发现的问题：自动化读取登录页字段时，H5 编译后的 input 未暴露自定义 `data-login-field` 属性，但真实填写与提交仍可用；不影响用户操作。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；用户从活动/报名/动态进入心得发布和口碑查看的真实路径已通过本地浏览器验证。

### 遗留问题

- 本阶段未再次提交新心得，避免重复制造待审核内容；发布表单提交链路已由此前 smoke 和浏览器交互验收覆盖。
- 活动详情入口“分享心得”本阶段确认可见，未重复点击；报名详情入口点击已覆盖发布页 `activityId` 传递。
- 图片上传在浏览器自动化中仍受文件选择器限制，继续依赖接口 smoke 与真实人工补验。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，按“用户心得分享与 H5 装修优化方案”进入下一个小阶段：建议做后台装修 UI 点击链路补验，或对后台动态管理筛选/审核状态做最后一次浏览器复验。

## 2026-06-24 - 动态详情海报与分享链接复验

### 阶段名称

用户心得分享与 H5 装修优化 - 动态详情生成海报与分享链接前台交互复验小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和开发计划，确认本阶段继续验证用户心得分享方案中的“生成海报 / 分享链接”前台体验。
- 选取成都租户已审核参与者心得 post id `2` 作为浏览器验收数据。
- 在 H5 动态详情页真实点击“复制链接”，确认后端分享次数记录生效。
- 在 H5 动态详情页真实点击“生成海报”，确认海报弹层出现，海报为前端 canvas 生成的 PNG。
- 检查海报图片尺寸为 `750x1120`，符合当前前端海报画布规格。
- 检查浏览器控制台错误日志，未发现前端 error。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:10:33 +08:00。
- `GET http://127.0.0.1:3100/api/public/community/posts/2?tenantCode=qiwai-chengdu`：点击复制前 `shareCount=2`。
- 浏览器点击“复制链接”后再次查询：`shareCount=3`。
- 浏览器点击“生成海报”后再次查询：`shareCount=4`。
- 本阶段未修改业务代码；沿用上一小阶段已通过的 `npm.cmd --prefix apps/mobile run build:h5` 和 `npm.cmd run test:preflight-guards` 结果。

### 浏览器验收结果

- 验证时间：2026-06-24 00:10:33 +08:00。
- 验证环境：本地 H5 dev server `http://127.0.0.1:5273`，源码 API `http://127.0.0.1:3100/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/community/detail?id=2`。
  - 等待页面加载已审核心得内容 `浏览器验收心得：成都共修活动流程清晰...`。
  - 确认页面显示“复制链接”“生成海报”“写评论”操作按钮。
  - 点击“复制链接”，后端分享次数从 `2` 增加到 `3`。
  - 点击“生成海报”，页面出现海报弹层和“长按图片保存，或复制链接分享到朋友圈。”提示。
  - 检查弹层图片 `src` 为 `data:image/png`，长度约 `126334`，图片自然尺寸 `750x1120`。
  - 点击生成海报后，后端分享次数从 `3` 增加到 `4`。
  - 检查浏览器控制台错误日志：无前端 error。
- 输入的测试数据摘要：参与者心得 post id `2`，关联活动 `成都心得浏览器验收活动 1782227173747`，心得内容含 `1782227244596`，本阶段保留新增的分享计数结果。
- 通过项：动态详情页可打开；分享链接按钮可触发分享记录；海报按钮可生成前端 PNG；海报弹层可见；分享计数刷新后状态合理；无明显前端错误。
- 发现的问题：浏览器自动化环境读取剪贴板返回空，无法用工具侧确认剪贴板内容；但按钮点击后的后端分享记录已生效，页面没有错误。人工浏览器环境可直接观察系统剪贴板或复制提示。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；心得详情分享与海报核心交互已通过本地浏览器验证。

### 遗留问题

- 海报二维码内容在浏览器中通过 PNG 生成结果间接验证，未用真机微信长按识别二维码；上线前建议在微信内置浏览器补做一次真机验收。
- 当前详情页不直接展示 `shareCount`，分享次数通过接口验证；如运营希望前台展示传播热度，可后续增加可见计数。
- 剪贴板读取受自动化环境限制，未能从工具侧读取复制后的链接文本。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，按“用户心得分享与 H5 装修优化方案”进入下一个小阶段：建议做后台装修 UI 点击链路补验，或检查用户发布心得入口在活动详情/报名详情/共修动态的实际可见性。

## 2026-06-24 - 课程公益商城装修保存一致性验证

### 阶段名称

用户心得分享与 H5 装修优化 - 课程、公益、商城页面装修覆盖保存与前台一致性小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和开发计划，确认本阶段继续推进“扩大页面覆盖”中的课程首页、公益页、商城首页装修保存一致性。
- 发现课程首页、公益页、商城首页虽然已在后台装修页配置为可选页面，但 H5 页面本身尚未渲染页面装修内容区。
- H5 课程首页接入 `usePageDecoration("course_home")` 与 `PageDecorationBlocks`，保留原课程分类、排序、空状态和底部导航。
- H5 公益页接入 `usePageDecoration("charity_page")` 与 `PageDecorationBlocks`，保留公益池、公示项目、志愿任务入口和公益明细。
- H5 商城首页接入 `usePageDecoration("mall_home")` 与 `PageDecorationBlocks`，保留商城英雄区、店铺、分类、搜索、秒杀、拼团和商品流。
- 为成都租户分别创建测试装修模块：
  - section id `78`：`course_home`，`课程首页装修验收 1782230618945`
  - section id `79`：`charity_page`，`公益页装修验收 1782230618945`
  - section id `80`：`mall_home`，`商城首页装修验收 1782230618945`
- 重启本地 H5 dev server `5273`，明确代理到源码 API `http://127.0.0.1:3100`，避免旧运行时导致验收不一致。

### 修改/新增的主要文件

- `apps/mobile/src/pages/courses/index.vue`
- `apps/mobile/src/pages/charity/index.vue`
- `apps/mobile/src/pages/mall/index.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:07:51 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过，包含公益与分享高风险文案 guard。
- `GET http://127.0.0.1:5273/api/public/page-decoration?pageKey=course_home&tenantCode=qiwai-chengdu`：通过，返回 section id `78`。
- 本地 H5 dev server `http://127.0.0.1:5273` 已重新启动并代理到 `http://127.0.0.1:3100`。

### 浏览器验收结果

- 验证时间：2026-06-24 00:07:51 +08:00。
- 验证环境：本地 H5 dev server `http://127.0.0.1:5273`，源码 API `http://127.0.0.1:3100/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/courses/index`，确认显示 `课程首页装修验收 1782230618945` 和对应验收文案，课程分类、排序、空状态、底部导航仍正常。
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/charity/index`，确认显示 `公益页装修验收 1782230618945` 和对应验收文案，公益池、公示项目、执行动态、底部导航仍正常。
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/mall/index`，确认显示 `商城首页装修验收 1782230618945` 和对应验收文案，商城英雄区、店铺、搜索、排序、商品空状态、底部导航仍正常。
  - 检查浏览器控制台错误日志：无前端 error。
- 输入的测试数据摘要：新增成都租户页面覆盖测试模块 id `78/79/80`，均为 `rich_text`，内容为 `浏览器验收文案 1782230618945：慢π页面装修覆盖已作用到...`。
- 通过项：课程首页、公益页、商城首页均能渲染后台保存的页面装修模块；原业务主体区域未被覆盖；构建、预检和浏览器验证均通过。
- 发现的问题：右侧浏览器会拦截临时新端口 `5274`，本阶段改用原 `5273` 完成验证；后续本地验收优先沿用 5273/5174/3100 这组服务。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；课程、公益、商城页面覆盖保存与前台一致性已通过本地浏览器验证。

### 遗留问题

- 本阶段未通过后台 UI 点击创建模块，而是用后台接口创建测试模块；后台装修 UI 入口此前已验证可见，后续最终验收可补一次后台点击创建/保存/刷新前台的完整链路。
- 商城默认英雄文案仍有“书院服务闭环”业务泛称；如运营要求全站完全不用“书院”，需单独做口径收口。
- 动态详情页的“生成海报 / 分享链接”按钮已具备基础能力和二维码增强，但仍可继续做浏览器交互复验与移动端截图检查。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，按“用户心得分享与 H5 装修优化方案”进入下一个小阶段：建议做“动态详情海报与分享链接前台交互复验”，确认按钮、海报弹层、复制链接、分享计数和刷新状态。

## 2026-06-24 - 品牌故事装修保存与前台一致性验证

### 阶段名称

用户心得分享与 H5 装修优化 - 装修页面覆盖保存与预览一致性验证小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和开发计划，确认本阶段承接上一阶段“页面覆盖验证”后的遗留事项：验证新增页面覆盖不仅能打开，还能读取后台保存的装修模块。
- 针对品牌故事页 `brand_story` 做非核心页面保存验证，保留测试模块 `慢π品牌故事装修验收 1782230100658`，用于检查后台页面覆盖保存后 H5 前台是否同步展示。
- 修复 H5 品牌故事页只接入底部导航但未稳定刷新页面装修内容的问题。
- 品牌故事页补齐与服务中心、城市合伙人页一致的租户作用域刷新流程：首次进入、浏览器刷新、租户变化时都会重新加载入口页配置、页面装修配置和主题。
- 浏览器刷新后，品牌故事页已展示 `慢π品牌故事装修验收 1782230100658` 和对应验收文案，确认保存数据和 H5 渲染一致。

### 修改/新增的主要文件

- `apps/mobile/src/pages/brand/story.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 00:00:42 +08:00。
- `GET http://127.0.0.1:5273/api/public/page-decoration?pageKey=brand_story&tenantCode=qiwai-chengdu`：通过，返回 section id `77`，`pageKey=brand_story`，`type=rich_text`，标题为 `慢π品牌故事装修验收 1782230100658`。
- `GET http://127.0.0.1:3100/api/public/page-decoration?pageKey=brand_story&tenantCode=qiwai-chengdu`：通过，返回同一 section id `77`。
- `GET http://127.0.0.1:3000/api/public/page-decoration?pageKey=brand_story&tenantCode=qiwai-chengdu`：仍返回旧运行时首页装修数据，确认旧 3000 运行时不是本轮源码验证依据。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。

### 浏览器验收结果

- 验证时间：2026-06-24 00:00:42 +08:00。
- 验证环境：本地 H5 dev server `http://127.0.0.1:5273`，源码 API `http://127.0.0.1:3100/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/brand/story`。
  - 初次检查发现页面可打开且无控制台错误，但未展示后台保存的 `brand_story` 装修模块。
  - 修复品牌故事页装修刷新逻辑后刷新页面。
  - 确认页面展示 `慢π品牌故事装修验收 1782230100658`。
  - 确认页面展示 `浏览器验收文案 1782230100658：慢π把活动、课程、共修和公益连接成一个可运营的城市样板。`
  - 检查浏览器控制台错误日志：无前端 error。
- 输入的测试数据摘要：成都租户品牌故事页装修模块 section id `77`，标题 `慢π品牌故事装修验收 1782230100658`，内容为一段慢π城市样板验收文案。
- 通过项：品牌故事页能打开；后台保存的 `brand_story` 装修模块能在 H5 前台刷新后展示；底部导航继续显示；无明显前端错误。
- 发现的问题：旧 `3000` API 运行时仍是旧代码/旧数据，不能作为本轮源码验收依据；当前本地 H5 `5273` 与源码 API `3100` 已一致。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；页面覆盖保存和品牌故事前台渲染一致性已通过本地浏览器验证。

### 遗留问题

- 本阶段只选择品牌故事页作为非核心覆盖页做保存一致性验证，课程、公益、商城等页面仍可继续做逐页装修保存验证。
- 品牌故事默认文案里仍有“现代书院 / 书院闭环 / 本地书院”等业务泛称；此前已记录为泛称表达，如运营要求完全不出现“书院”，需单独做全站口径调整。
- 生产环境上线时需确认运行服务使用最新源码构建，避免出现 3000 旧运行时类似的版本不一致。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，按“用户心得分享与 H5 装修优化方案”进入下一个小阶段：建议补齐“动态详情生成海报 / 分享链接”的前台按钮体验复验，或继续做课程、公益、商城页面装修保存一致性验证。

## 2026-06-23 - H5 装修页面覆盖浏览器验证

### 阶段名称

用户心得分享与 H5 装修优化 - 新增页面覆盖与合规分类文案浏览器验证小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和开发计划，确认本阶段继续推进 H5 装修页面覆盖验证。
- 在右侧浏览器逐项打开 H5 新增覆盖页面：共修首页、课程首页、公益页、商城首页、品牌故事页。
- 验证各页面均能打开，有有效主体内容，没有明显加载失败、404、请求失败或页面阻塞。
- 验证时发现课程首页分类仍显示“玄学”，与开发计划“统一调整为东方哲学与传统文化”的合规口径不一致。
- 将 H5 课程页分类从“玄学”调整为“东方哲学”，并复验课程页无该高风险词。

### 修改/新增的主要文件

- `apps/mobile/src/pages/courses/index.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 23:52 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `rg -n "玄学" apps packages scripts -S`：无命中；`docs/qiwai-cultural-saas-platform-plan.md` 中保留的是合规说明“玄学统一调整为东方哲学与传统文化”，不属于前台展示风险。

### 浏览器验收结果

- 验证时间：2026-06-23 23:52 +08:00。
- 验证环境：本地 H5 dev server `http://127.0.0.1:5273`，当前 H5 代理 API `http://127.0.0.1:3000/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `#/pages/community/index?tenantCode=qiwai-chengdu`：共修首页正常显示学员动态、发布心得入口和底部导航。
  - 打开 `#/pages/courses/index?tenantCode=qiwai-chengdu`：课程首页正常显示分类、排序和空课程状态；分类显示“东方哲学”，不再显示“玄学”。
  - 打开 `#/pages/charity/index?tenantCode=qiwai-chengdu`：公益页正常显示公益池、公益贡献、志愿任务入口和项目区域。
  - 打开 `#/pages/mall/index?tenantCode=qiwai-chengdu`：商城首页正常显示慢π商城、多商户商城、搜索、商品空状态和底部导航。
  - 打开 `#/pages/brand/story?tenantCode=qiwai-chengdu`：品牌故事页正常显示慢π品牌故事、理念和共建路径。
- 输入的测试数据摘要：未新增业务数据；沿用成都租户、已有心得帖和当前空课程/公益/商城数据。
- 通过项：五个 H5 页面均可打开；无明显前端报错文案、接口错误文案或页面阻塞；课程页合规分类已修复并复验通过。
- 发现的问题：品牌故事与商城页仍有“书院”作为业务泛称，例如“现代书院”“书院服务闭环”；本阶段判断为泛称表达，不是旧品牌名残留。如运营希望完全不用“书院”一词，需要后续单独做全站口径调整。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态。

### 遗留问题

- 当前页面覆盖验证是打开和基础内容检查，未逐项验证每个页面的装修模块编辑、保存、发布后前台差异。
- 当前浏览器验证使用 H5 dev server 代理的 `3000` 数据；源码 smoke 使用 `3100`，最终验收前建议统一入口。
- 完整多角色主流程最终验收尚未重新执行。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，若仍推进“用户心得分享与 H5 装修优化方案”，建议进入“装修页面覆盖保存与预览一致性验证”小阶段：在后台选择一个非核心测试页面添加/保存模块，再用 H5 前台刷新验证。

## 2026-06-23 - 慢π前台与后台可见文案收口

### 阶段名称

慢π品牌与 H5 展示配置 - 底部导航、共修动态和后台动态管理文案收口小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md`、开发计划和用户端“书院”残留扫描结果，确认本阶段处理慢π品牌可见文案收口。
- H5 默认底部导航第一项从“书院 / 书”调整为“慢π / π”，覆盖运行时默认值和 H5 装修默认值。
- API 首页装修默认配置同步调整底部导航第一项为“慢π”，商城内页默认标题从“书院商城”调整为“慢π商城”。
- 后台首页装修默认底部导航和说明文案同步调整为“慢π / 课程 / 共修 / 活动 / 我的”。
- H5 首页“书院动态”调整为“共修动态”，空状态调整为“暂无共修动态”，金刚区“书院商城”调整为“慢π商城”。
- H5 位置切换 toast 从“已按当前位置切换书院”调整为“已按当前位置切换慢π城市”。
- H5 动态昵称兜底从“书院同学”调整为“慢π同学”，品牌故事模块兜底说明调整为“了解慢π理念与共建方式”。
- 后台动态管理页、后台菜单和权限定义中的“书院运营/书院动态”调整为“慢π运营/共修动态”，权限 key 保持不变。
- 后端用户发布心得成功提示从“展示在书院动态中”调整为“展示在共修动态中”。

### 修改/新增的主要文件

- `apps/mobile/src/components/AppBottomNav.vue`
- `apps/mobile/src/decoration.ts`
- `apps/mobile/src/community-posts.ts`
- `apps/mobile/src/pages/index/index.vue`
- `apps/mobile/src/pages.json`
- `apps/mobile/src/components/PageDecorationBlocks.vue`
- `apps/api/src/modules/homepage-defaults.ts`
- `apps/api/src/modules/courses/public-courses.controller.ts`
- `apps/api/src/modules/admin/admin-permissions.ts`
- `apps/admin/src/views/HomepageBuilder.vue`
- `apps/admin/src/views/Community.vue`
- `apps/admin/src/views/Layout.vue`
- `apps/admin/src/permissions.ts`
- `apps/admin/src/views/OperationFlow.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 23:49 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释提示和大 chunk 提醒。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- 精准可见文案扫描 `rg -n '书院动态|书院商城|已按当前位置切换书院|label: "书院"|展示在书院动态|书院同学|书院运营' apps\mobile\src apps\api\src\modules apps\admin\src -S`：无命中。
- smoke 保留测试数据：活动 id `96`，报名 id `140`，参与者心得帖 id `8`，首页心得装修模块 id `75`。

### 浏览器验收结果

- 验证时间：2026-06-23 23:49 +08:00。
- 验证环境：本地 H5 dev server `http://127.0.0.1:5273`，当前 H5 代理 API `http://127.0.0.1:3000/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/index/index`。
  - 确认首页顶部显示 `慢π` 和 `慢π成都城市合伙人`。
  - 确认金刚区显示 `慢π商城`。
  - 确认首页动态标题显示 `共修动态`，帖子昵称兜底显示 `慢π同学`。
  - 确认底部导航显示 `π / 慢π`，没有出现 `书院动态` 或 `书院商城`。
- 输入的测试数据摘要：沿用成都租户首页心得墙和已审核心得帖 id `2`。
- 通过项：H5 首页慢π品牌、底部导航、首页动态、商城入口、位置切换 toast 均按新文案展示；构建、smoke、preflight guard 均通过。
- 发现的问题：仍存在若干“书院”作为泛指业务对象的文案，例如合作对象“书院/读书会”、商家/书院/机构资料、请联系书院等；本阶段只清理旧品牌入口词，未把所有泛指“书院”改掉。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态。

### 遗留问题

- 如果运营希望完全不出现“书院”这个业务词，需要另开一次全站泛称口径调整，将“书院/机构/商家”等统一为“慢π城市伙伴/主办方/商家”。
- 当前浏览器验证使用 H5 dev server 代理的 `3000` 数据；源码 smoke 使用 `3100`，最终验收前建议统一入口。
- 完整多角色主流程最终验收尚未重新执行。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，回到“用户心得分享与 H5 装修优化方案”的剩余项，建议优先做 H5 装修新增页面覆盖的浏览器验证，或对动态详情海报二维码在真机/微信环境补验。

## 2026-06-23 - 心得发布入口与空状态收口

### 阶段名称

用户心得分享与 H5 装修优化 - 发布心得入口、活动口碑空状态与 H5 参数兜底小阶段。

### 本阶段完成内容

- 重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续推进“用户心得分享与 H5 装修优化方案”的用户端入口体验。
- H5 发布心得页将审核展示说明从“书院动态”调整为“共修动态”，贴合慢π当前前台表达。
- 发布心得页在暂无可发布活动时，展示“暂时不能发布心得”的清晰原因：已签到，或活动结束且报名成功/已付款后可发布。
- 发布心得页空状态新增“查看活动”“查看动态”入口，避免用户停在不可提交表单里。
- 发布心得页支持 H5 直达链接从 `hash/search` 兜底解析 `activityId`，保证从活动详情、报名详情、活动口碑入口跳转时能正确预选或提示当前活动。
- 共修动态页在携带 `activityId` 时显示“活动口碑”标题和当前活动筛选说明；暂无关联心得时展示“发布这场心得”的明确入口。
- 共修动态页活动卡点击从弹窗说明改为跳转活动详情页，减少“报名流程暂未接入前台”的旧提示。
- 动态详情页标题从“书院动态”调整为“共修动态”，评论用户兜底昵称调整为“慢π同学”。

### 修改/新增的主要文件

- `apps/mobile/src/pages/community/publish.vue`
- `apps/mobile/src/pages/community/index.vue`
- `apps/mobile/src/pages/community/detail.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 23:43 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过。
- smoke 保留测试数据：活动 id `95`，报名 id `139`，参与者心得帖 id `7`，首页心得装修模块 id `74`。

### 浏览器验收结果

- 验证时间：2026-06-23 23:43 +08:00。
- 验证环境：本地 H5 dev server `http://127.0.0.1:5273`，当前 H5 代理 API `http://127.0.0.1:3000/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/community/index?activityId=999999&tenantCode=qiwai-chengdu`。
  - 确认页面显示“活动口碑”“仅展示当前活动关联心得”“还没有活动心得”“发布这场心得”。
  - 点击“发布这场心得”进入 `#/pages/community/publish?activityId=999999&tenantCode=qiwai-chengdu`。
  - 确认发布页显示“发布心得”“暂时不能发布心得”“查看活动”“查看动态”，并包含“审核后会展示在共修动态中”的说明。
- 输入的测试数据摘要：使用不存在的 `activityId=999999` 验证空状态与不可发布引导，不新增业务数据；自动化 smoke 新增 activity id `95` / post id `7`。
- 通过项：活动口碑空状态、发布页不可发布说明、H5 `activityId` 直达参数兜底、构建和 smoke 均通过。
- 发现的问题：共修页底部导航仍显示“书院”，属于品牌命名残留；下一小阶段应统一为慢π语境。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态。

### 遗留问题

- 底部导航和局部 UI 中仍有“书院”作为旧业务表达，需要按慢π品牌继续收口。
- 当前浏览器验证使用 H5 dev server 代理的 `3000` 数据；源码 smoke 使用 `3100`，最终验收前建议统一入口。
- 完整多角色主流程最终验收尚未重新执行。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，进入“慢π品牌与 H5 展示配置 - 底部导航/局部书院文案收口小阶段”，优先替换用户端可见的“书院”残留为“慢π”或“共修”。

## 2026-06-23 - 心得分享海报二维码增强

### 阶段名称

用户心得分享与 H5 装修优化 - H5 心得海报二维码与分享直达兼容小阶段。

### 本阶段完成内容

- 重新读取 `docs/qiwai-cultural-saas-platform-plan.md`、`docs/development-handoff.md` 和最新 `DEVELOPMENT_LOG.md`，确认本阶段继续推进“用户心得分享与 H5 装修优化方案”。
- H5 动态详情页海报生成引入 `qrcode`，把当前动态分享链接生成二维码并绘制到 canvas 海报底部。
- 海报保留分享链接文字作为兜底；二维码生成失败时仍可生成只含链接的海报。
- 将海报底部作者兜底文案从“书院同学”调整为“慢π同学”，继续使用 `慢π · 活动心得` 品牌标题。
- 修复 H5 分享链接直接进入动态详情页时，`getCurrentPages()` 偶发拿不到 `id` 的问题：在 H5 下从 `window.location.hash/search` 兜底解析动态 ID，保证朋友圈/外部链接打开后可正常加载详情。

### 修改/新增的主要文件

- `apps/mobile/src/pages/community/detail.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 23:40 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:API_BASE='http://127.0.0.1:3100/api'; npm.cmd run smoke:community-sharing`：通过。
- smoke 保留测试数据：活动 id `94`，报名 id `138`，参与者心得帖 id `6`，首页心得装修模块 id `73`。

### 浏览器验收结果

- 验证时间：2026-06-23 23:40 +08:00。
- 验证环境：本地 H5 dev server `http://127.0.0.1:5273`，当前 H5 代理 API `http://127.0.0.1:3000/api`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/community/detail?id=2&tenantCode=qiwai-chengdu`。
  - 刷新后确认分享直达详情页可正常加载帖子内容，不再出现“动态不存在或已下架”。
  - 点击“生成海报”。
  - 确认出现海报弹层、保存提示和关闭按钮。
  - 检查弹层中的海报图片为 `data:image/png`，尺寸为 `750x1120`。
- 输入的测试数据摘要：沿用成都租户已审核心得帖 id `2`，内容为“浏览器验收心得：成都共修活动流程清晰...”。
- 通过项：H5 分享直达详情页加载正常；海报弹层生成正常；海报 PNG 尺寸正确；构建和用户心得 smoke 均通过。
- 发现的问题：当前右侧浏览器无法直接视觉识别二维码内容是否可扫码，只能通过海报生成链路、二维码 data URL 绘制逻辑和 PNG 输出尺寸验证；后续可在真机或微信内置浏览器补做扫码验证。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；最终上线仍需完整主流程和生产条件验收。

### 遗留问题

- 需在真机或微信内置浏览器中补测长按保存海报、扫码进入动态详情页。
- 当前 H5 dev server 代理仍指向 `3000`，当前源码 smoke 使用 `3100`；后续最终验收前建议统一验证入口，避免测试数据分散。
- 完整多角色主流程最终验收尚未重新执行。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，进入“用户心得分享与 H5 装修优化”的下一小阶段：建议补齐心得发布入口在活动详情/报名详情/动态页的可见性与空状态提示，或继续做 H5 装修新增页面覆盖的浏览器验证。

## 2026-06-23 - 品牌名称统一为慢π

### 阶段名称

慢π品牌统一 - 前后台、H5、默认配置、演示数据与文档可见文案小阶段。

### 本阶段完成内容

- 根据用户最新要求，将平台中文品牌统一为 `慢π`。
- 保留 `qiwai-*` 租户编码、脚本名、账号名、密码和分支名等内部兼容标识，避免破坏既有部署、测试和数据关联。
- 批量替换 Admin、API、H5、shared、scripts、docs 中的旧中文品牌可见文案，覆盖品牌名、书院名、大使名、证书名、海报文案、商城默认品牌、系统设置默认品牌、招商/品牌故事默认配置、演示脚本和操作文档。
- 同步本地测试数据库中已保存的旧中文品牌数据，仅替换中文品牌词，不删除测试数据、不改租户编码：
  - 更新了活动、讲师、审核快照、操作日志、支付/退款备注、商城商户、系统设置、招商配置、证书、租户名称、用户昵称、志愿任务地址等文本字段。
  - 数据库替换统计：27 个文本字段有命中，174 行内容变更，替换后数据库中文旧品牌词剩余 0。
- 重新构建 API/Admin/H5，并重启当前源码 API `3100`。
- 右侧浏览器刷新 H5 成都租户首页和后台首页装修页，确认显示 `慢π`、`慢π成都城市合伙人`、`寻找100位慢π大使`、`精选课程：慢π好课` 等新品牌文案。

### 修改/新增的主要文件

- `apps/mobile/src/theme.ts`
- `apps/mobile/src/pages.json`
- `apps/mobile/src/entry-pages.ts`
- `apps/mobile/src/pages/index/index.vue`
- `apps/mobile/src/pages/user/login.vue`
- `apps/mobile/src/pages/ambassador/index.vue`
- `apps/mobile/src/pages/partner/index.vue`
- `apps/mobile/src/pages/mall/index.vue`
- `apps/mobile/src/pages/mall/detail.vue`
- `apps/mobile/src/pages/community/detail.vue`
- `apps/admin/src/views/SystemSettings.vue`
- `apps/admin/src/views/Ambassador.vue`
- `apps/admin/src/views/HomepageBuilder.vue`
- `apps/admin/src/components/ActivityPosterDialog.vue`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/api/src/modules/homepage-defaults.ts`
- `scripts/seed-qiwai-demo.mjs`
- `scripts/qiwai-demo-smoke.mjs`
- `scripts/qiwai-demo-report.mjs`
- `scripts/seed-online-showcase.mjs`
- `scripts/online-showcase-lib.mjs`
- `docs/qiwai-cultural-saas-platform-plan.md`
- `docs/qiwai-local-demo-guide.md`
- `docs/city-partner-handbook.md`
- `docs/city-partner-cooperation-policy.md`
- `docs/city-partner-first-month-sop.md`
- `docs/qiwai-first-month-acceptance-checklist.md`
- `docs/qiwai-demo-sample-report.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 23:35 +08:00。
- 旧中文品牌词源码/文档扫描：`rg -n "七维文化|七维书院|七维" apps packages scripts docs ...` 无命中。
- 本地数据库中文品牌替换：通过，`remainingCells=0`。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释提示和大 chunk 提醒。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- API `3100` 重启：通过，`GET http://127.0.0.1:3100/api/health/ready` 返回 `ready=true`。
- `npm.cmd run test:preflight-guards`：通过。
- `API_BASE=http://127.0.0.1:3100/api npm.cmd run smoke:community-sharing`：通过，保留测试数据：活动 id `92`，报名 id `136`，参与者心得帖 id `4`，首页心得装修模块 id `71`。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。

### 浏览器验收结果

- 验证时间：2026-06-23 23:35 +08:00。
- 验证环境：本地当前源码 API `3100`，Admin dev server `5174`，H5 dev server `5273`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/index/index`。
  - 确认 H5 顶部品牌显示 `慢π`，当前城市显示 `慢π成都城市合伙人`。
  - 确认 H5 首页运营模块显示 `寻找100位慢π大使`、`精选课程：慢π好课`、`加入文化大使和慢π一起，让热爱发光`。
  - 打开 `http://127.0.0.1:5174/admin/homepage-builder?pageKey=home&tenantId=3`。
  - 确认后台装修页商家选择、预览范围和模块预览均显示 `慢π成都城市合伙人`。
- 输入的测试数据摘要：沿用成都租户 `qiwai-chengdu`、首页心得墙模块、浏览器验收心得数据，并新增 smoke 测试数据 activity id `92` / post id `4`。
- 通过项：H5 首页、后台装修页、API 健康检查、三端构建、预检 guard、用户心得 smoke 均通过。
- 发现的问题：内部 `qiwai-*` 编码、脚本名和文档文件名仍保留，这是兼容性保留，不属于前台品牌文案残留。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；正式上线仍需按真实生产配置和完整主流程验收执行。

### 遗留问题

- 已有生产环境数据库如存在旧品牌文案，需要在生产发布前执行同等品牌替换或在后台系统设置/租户资料中逐项更新。
- `qiwai-*` 作为内部编码暂不改名；如未来要连同域名、租户码、脚本名一起改为 `manpi-*`，需要单独做兼容迁移方案。
- 完整多角色主流程最终验收尚未重新执行。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，回到“用户心得分享与 H5 装修优化”的剩余验收事项，或按新品牌 `慢π` 做一次完整多角色浏览器主流程验收。

## 2026-06-23 - 装修发布辅助能力核查与补齐

### 阶段名称

用户心得分享与 H5 装修优化 - 装修发布辅助能力核查与补齐小阶段。

### 本阶段完成内容

- 重新读取开发计划和最新 `DEVELOPMENT_LOG.md`，确认本阶段核查“首页装修 / H5 展示配置”方案中的发布辅助能力。
- 核查后台首页装修页已具备“应用模板”“复制页面配置”“恢复上次发布版本”“打开预览链接”“手机预览”“抽屉实时预览”等能力。
- 将后台按钮 `打开H5预览` 调整为 `发布前预览`，使运营动作和方案描述保持一致。
- 在预览链接区新增提示：模块保存后前台生效；未保存内容可先查看右侧手机预览或抽屉实时预览。
- 右侧浏览器打开成都租户首页装修页，确认 `发布前预览`、`复制页面配置`、`恢复上次发布版本`、`应用模板`、预览链接和心得墙模块均可见。

### 修改/新增的主要文件

- `apps/admin/src/views/HomepageBuilder.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 23:31 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释提示和大 chunk 提醒。
- 右侧浏览器打开 `http://127.0.0.1:5174/admin/homepage-builder?pageKey=home&tenantId=3`：通过。

### 浏览器验收结果

- 验证时间：2026-06-23 23:31 +08:00。
- 验证环境：本地当前源码 API `3100`，Admin dev server `5174`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开后台首页装修页并定位到成都租户首页。
  - 检查顶部工具栏发布辅助入口。
  - 检查预览链接区提示文案。
  - 检查模块列表仍显示成都心得墙模块。
- 输入的测试数据摘要：沿用成都租户首页装修模块 `成都学员心得墙 1782227435689`。
- 通过项：发布前预览、复制链接、应用模板、复制页面配置、恢复上次发布版本、恢复默认装修、模块列表均可见。
- 发现的问题：未发现新的页面阻塞；实际点击“复制页面配置/恢复上次发布版本”会替换当前装修配置，本阶段只做入口和文案确认，避免破坏现有验收数据。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态。

### 遗留问题

- 未对“复制页面配置/恢复上次发布版本”执行替换型点击保存，以保留当前测试装修数据；后续如需可用专门测试租户做破坏性验证。
- 完整多角色主流程最终验收尚未重新执行。

### 下一阶段应继续处理的事项

- 按用户新要求进入品牌名称统一小阶段，将平台中文品牌统一为 `慢π`。

## 2026-06-23 - 用户心得与装修回归及文案风险扫描

### 阶段名称

用户心得分享与 H5 装修优化 - 全链路回归与文案风险扫描小阶段。

### 本阶段完成内容

- 重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`，确认本阶段延续“用户心得分享与 H5 装修优化方案”的测试计划。
- 新增预检脚本 `preflight-copy-risk-guard.mjs`，扫描 Admin、API、H5 和 shared 源码中的高风险公益/分享文案。
- 将文案风险 guard 接入 `npm run test:preflight-guards`，避免后续开发误引入 `公开募捐`、`捐款认领`、`募捐目标`、`用户捐赠认领` 等表达。
- 执行用户心得接口 smoke 回归，重新覆盖活动报名、签到、可发布活动、心得图片上传、待审核隔离、后台审核、公开展示、分享统计和首页心得装修模块读取。
- 保留本阶段 smoke 产生的测试数据，便于后续浏览器复验。

### 修改/新增的主要文件

- `scripts/preflight-copy-risk-guard.mjs`
- `package.json`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 23:29 +08:00。
- `rg -n "公开募捐|捐款认领|募捐目标|用户捐赠认领" apps packages ...`：未发现命中。
- `node scripts/preflight-copy-risk-guard.mjs`：通过，输出 `OK   charity and sharing copy guard found no high-risk fundraising wording.`。
- `npm.cmd run test:preflight-guards`：通过，新增文案风险 guard 已在整条预检链中执行。
- `API_BASE=http://127.0.0.1:3100/api npm.cmd run smoke:community-sharing`：通过，输出 `Community sharing smoke test passed.`。
- smoke 保留测试数据：活动 id `91`，报名 id `135`，参与者心得帖 id `3`，首页心得装修模块 id `70`。

### 浏览器验收结果

- 验证时间：2026-06-23 23:29 +08:00。
- 验证环境：本地当前源码 API `3100`，本地数据库 `activity_registration`。
- 浏览器验证主要步骤：本阶段未新增右侧浏览器点击验收；上一阶段已通过 H5 验证码登录和首页展示，本阶段以静态 guard 与真实 HTTP smoke 回归覆盖。
- 输入的测试数据摘要：心得分享 smoke 活动、H5 smoke 用户、1 张 PNG 心得图片、参与者心得内容、首页心得流装修模块。
- 通过项：高风险公益文案扫描、完整预检 guard、用户心得接口闭环、首页心得模块公开读取均通过。
- 发现的问题：未发现新的回归问题；H5 本地图片选择器仍不适合由右侧浏览器工具直接操作。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；用户心得与装修接口闭环保持通过。

### 遗留问题

- H5 图片选择器点击级上传仍依赖人工浏览器或接口 smoke 覆盖。
- “首页装修 / H5 展示配置”方案中的复制页面配置、发布前预览、恢复上次发布版本需要继续核查是否已完全落地。
- 完整多角色主流程最终验收尚未重新执行。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，建议进入“用户心得分享与 H5 装修优化 - 装修发布辅助能力核查与补齐小阶段”，优先确认并补齐复制页面配置、发布前预览和恢复上次发布版本。

## 2026-06-23 - H5 验证码登录表单状态兼容优化

### 阶段名称

用户心得分享与 H5 装修优化 - H5 验证码登录表单状态兼容优化小阶段。

### 本阶段完成内容

- 重新读取 `docs/qiwai-cultural-saas-platform-plan.md` 和最新 `DEVELOPMENT_LOG.md`，确认本阶段处理上一阶段遗留的 H5 验证码登录自动化/表单状态兼容问题。
- H5 登录页保留原有 `v-model` 交互，同时新增手机号、密码、验证码输入事件归一化处理，兼容 `event.detail.value` 和浏览器原生 `event.target.value`。
- 登录页在发送验证码和提交登录前新增 H5 DOM 输入值同步兜底，解决部分 H5 自动化、数字输入或输入法场景下 DOM 已有值但 Vue ref 未同步的问题。
- 兼容 uni-app H5 编译结构：`data-login-field` 位于 `uni-input` 包装层时，也能读取内部真实 `input` 的值。
- 右侧浏览器使用本地测试手机号完成验证码发送和验证码登录，成功跳转回成都租户 H5 首页。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/login.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 23:24 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `GET http://127.0.0.1:5273/api/health`：通过，H5 dev proxy 指向当前源码 API `3100`。
- 右侧浏览器打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/user/login?tenantCode=qiwai-chengdu`：通过。
- 浏览器填写手机号 `13800009991`，切换“验证码登录”，点击“获取验证码”：通过，页面显示 `本地开发验证码：123456`，验证码输入框自动回填 `123456`。
- 点击“登录”：通过，页面跳转到成都租户 H5 首页。
- 浏览器控制台 error 日志：空。

### 浏览器验收结果

- 验证时间：2026-06-23 23:24 +08:00。
- 验证环境：本地当前源码 API `3100`，H5 dev server `5273`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开 H5 手机号登录页。
  - 填写测试手机号并切换到验证码登录。
  - 点击获取验证码，确认本地开发验证码返回并自动填入输入框。
  - 点击登录，确认页面进入 H5 首页。
  - 检查首页仍展示 `成都学员心得墙 1782227435689` 和已审核的参与者心得。
  - 检查浏览器控制台无新增 error。
- 输入的测试数据摘要：H5 测试手机号 `13800009991`，本地开发验证码 `123456`。
- 通过项：验证码发送、验证码回填、登录提交、跳转首页、成都租户上下文、首页心得装修展示、前端错误检查均通过。
- 发现的问题：未发现新的前端错误；该优化只覆盖 H5 表单状态同步，不改变后端验证码规则。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；后续主流程浏览器验收可直接使用验证码登录路径。

### 遗留问题

- H5 本地图片选择器仍不能由右侧浏览器工具直接操作，图片上传继续由 smoke/API 覆盖。
- 完整多角色主流程最终验收尚未重新执行。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，建议进入“用户心得分享与 H5 装修优化 - 全链路回归与文案风险扫描小阶段”，复查高风险文案和用户心得/装修接口回归。

## 2026-06-23 - 后台装修租户选择与 URL 状态保持优化

### 阶段名称

用户心得分享与 H5 装修优化 - 后台装修租户选择与 URL 状态保持优化小阶段。

### 本阶段完成内容

- 重新读取 `docs/qiwai-cultural-saas-platform-plan.md`、`docs/development-handoff.md` 和最新 `DEVELOPMENT_LOG.md`，确认本阶段延续“用户心得分享与 H5 装修优化方案”。
- 修复后台首页装修页从 URL 查询参数初始化页面范围的问题，支持通过 `tenantId` 和 `pageKey` 直接打开指定租户、指定装修页面。
- 后台装修页切换页面或租户时同步更新地址栏查询参数，避免刷新或复制链接后回到平台全局装修。
- 保留原有平台全局装修和商家独立装修逻辑，未改变既有装修保存接口与数据结构。
- 右侧浏览器验证打开成都租户首页装修链接后，页面能保持 `tenantId=3&pageKey=home`，预览链接带 `tenantCode=qiwai-chengdu`，并能看到前一阶段保存的“成都学员心得墙”模块。

### 修改/新增的主要文件

- `apps/admin/src/views/HomepageBuilder.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 23:20 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释提示和大 chunk 提醒。
- 右侧浏览器打开 `http://127.0.0.1:5174/admin/homepage-builder?tenantId=3&pageKey=home`：通过。
- 页面显示租户 `七维文化成都城市合伙人（qiwai-chengdu）`，范围为 `首页 · 商家独立装修`。
- 页面预览链接包含 `tenantCode=qiwai-chengdu`。
- 地址栏最终保持为 `http://127.0.0.1:5174/admin/homepage-builder?pageKey=home&tenantId=3`。
- 页面模块列表可见 `成都学员心得墙 1782227435689`。

### 浏览器验收结果

- 验证时间：2026-06-23 23:20 +08:00。
- 验证环境：本地当前源码 API `3100`，Admin dev server `5174`，数据库 `activity_registration`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - 打开带 `tenantId=3&pageKey=home` 的后台装修链接。
  - 确认页面选中成都租户并加载商家独立首页装修。
  - 确认预览链接包含成都租户码。
  - 确认前一阶段保存的心得墙模块仍在模块列表中。
  - 刷新后确认查询参数和租户上下文合理保持。
- 输入的测试数据摘要：沿用前一阶段成都租户首页装修模块 `成都学员心得墙 1782227435689`，section id `69`。
- 通过项：后台装修页 URL 直达指定租户、页面范围展示、预览链接、模块列表和刷新状态保持均通过。
- 发现的问题：未新增问题；H5 文件选择器自动化和验证码登录自动化限制仍沿用上一阶段记录。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；用户心得与装修链路本地核心闭环继续保持可验收。

### 遗留问题

- H5 手机号验证码登录在自动化填值时仍可能不触发 uni-app 表单状态，后续可做表单输入兼容优化或人工补验。
- H5 本地图片选择器仍无法由右侧浏览器工具直接操作，上传链路已由 smoke/API 覆盖。
- 完整多角色主流程最终验收尚未重新执行。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，建议进入“用户心得分享与 H5 装修优化 - H5 验证码登录表单状态兼容优化小阶段”，减少后续浏览器验收对登录态的依赖。

## 2026-06-23 - 用户心得与 H5 装修浏览器交互验收

### 阶段名称

用户心得分享与 H5 装修优化 - 浏览器交互验收小阶段。

### 本阶段完成内容

- 重新读取 `docs/qiwai-cultural-saas-platform-plan.md`、`docs/development-handoff.md` 和最新 `DEVELOPMENT_LOG.md`，确认本阶段延续上一阶段“浏览器交互验收”事项。
- 启动并确认当前源码服务：
  - API：`http://127.0.0.1:3100/api`
  - Admin：`http://127.0.0.1:5174/admin`
  - H5：`http://127.0.0.1:5273`
- 通过右侧浏览器打开 H5 登录页、发布心得页、共修动态页、动态详情页、首页，以及后台书院动态管理和首页装修页。
- 识别浏览器 H5 当前城市上下文为 `qiwai-chengdu`，因此新增成都租户浏览器验收活动，并给当前本地演示用户完成报名和签到。
- 在 H5 发布页验证已参加活动可被识别，页面显示 `成都心得浏览器验收活动 1782227173747`。
- 因右侧浏览器工具无法操作系统文件选择器，本阶段用同一 H5 用户通过接口创建 1 条带图片的待审核心得，再回到 H5 发布页验证“我的心得”显示 `待审核`。
- 在后台 `/admin/community` 使用 `admin / Admin123456` 登录平台管理员，切换到“书院动态/文章”，看到参与者心得帖子 `2`，并通过浏览器点击“通过”完成审核。
- 回到 H5 共修动态列表，验证审核通过后的参与者心得公开展示。
- 进入 H5 动态详情，点击“生成海报”，页面展示“长按图片保存，或复制链接分享到朋友圈。”并生成 `data:image/png` 海报图。
- 新增成都租户首页 `testimonial_feed` 心得装修模块，并在 H5 首页验证“成都学员心得墙”展示审核通过的参与者心得。
- 打开后台首页装修页，确认模板入口和新增模块类型可见，包括参与者心得、精选心得、活动口碑墙、公益公示摘要、课程推荐、商城精选、品牌故事入口等。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 23:11:49 +08:00。
- `GET http://127.0.0.1:5273/api/health`：通过，H5 dev proxy 指向当前源码 API，release commit 为 `community-sharing-local`。
- 浏览器可打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/community/publish?activityId=90`，并识别已签到活动。
- 浏览器可打开 `http://127.0.0.1:5174/admin/community`，重新登录平台管理员后可审核参与者心得。
- 浏览器可打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/community/index?activityId=90`，审核通过后的心得在公开动态流展示。
- 浏览器可打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/community/detail?id=2&tenantCode=qiwai-chengdu`，并生成海报图。
- 浏览器可打开 `http://127.0.0.1:5273/?tenantCode=qiwai-chengdu#/pages/index/index`，首页心得装修模块展示正常。

### 浏览器验收结果

- 验证时间：2026-06-23 23:11:49 +08:00。
- 验证环境：本地当前源码 API `3100`，Admin dev server `5174`，H5 dev server `5273`，数据库 `activity_registration`，成都租户 `qiwai-chengdu`。
- 浏览器验证主要步骤：
  - H5 打开登录页和“我的”页，确认当前本地演示用户 `13800000001`。
  - H5 打开发布心得页，验证已参加活动可选择。
  - H5 发布页刷新后验证待审核心得显示在“我的心得”。
  - 后台书院动态管理页重新登录平台管理员，审核通过参与者心得。
  - H5 共修动态页验证通过后的心得公开展示。
  - H5 动态详情页验证海报生成弹层和海报图片。
  - H5 首页验证心得装修模块和心得数据展示。
  - 后台首页装修页验证模板入口和新增模块类型可见。
- 输入的测试数据摘要：
  - 成都租户活动：`成都心得浏览器验收活动 1782227173747`，活动 id `90`。
  - H5 演示用户：`本地演示用户 / 13800000001`。
  - 报名：id `134`，已签到。
  - 参与者心得：post id `2`，图片 `/uploads/community-posts/1782227244686-38ffbac3d977c8.png`，内容包含 `浏览器验收心得...1782227244596`。
  - 首页装修模块：`成都学员心得墙 1782227435689`，section id `69`。
- 通过项：
  - 页面能正常打开：H5 发布页、共修动态、动态详情、首页、后台动态管理、后台首页装修均可打开。
  - 登录/入口流程：后台重新登录平台管理员成功；H5 当前本地演示用户状态可见。
  - 核心业务流程：参与者心得待审核、后台审核通过、前台公开展示、动态详情查看、海报生成、首页心得装修展示均走通。
  - 表单/数据保存/列表展示：后台审核状态从 `待审核` 变为 `已通过`；H5 刷新后心得状态和首页模块仍可见。
  - 前端错误：H5 本阶段未发现新的 console error；后台仅保留重新登录前旧账号权限不足的历史错误，重新登录后审核流程正常。
- 发现的问题：
  - 右侧浏览器工具不能操作系统文件选择器，因此“从 H5 页面选择本地图片上传”的点击级动作未完成；图片上传已由 `smoke:community-sharing` 和本阶段接口创建帖子覆盖。
  - H5 验证码登录页在自动化填值时没有触发 uni-app 表单状态，本阶段改用本地演示用户既有登录态继续验收；人工真实输入预计不受此工具限制影响，后续可在人工浏览器中补一次手机号验证码登录。
  - 后台首页装修页 URL 查询中的 `tenantId=3` 未保持在地址栏，页面默认回到平台全局装修；成都租户模块已通过后台接口保存并在 H5 首页生效，后续可优化后台租户选择的 URL 状态保持。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；用户心得与 H5 装修本地核心闭环已通过浏览器验收。正式上线仍需结合真实生产资料、真实服务商配置和完整主流程验收。

### 遗留问题

- H5 图片选择器和验证码登录需要人工浏览器补点，当前自动化工具不适合系统文件选择器和 uni-app 数字输入状态验证。
- 后台首页装修租户选择的 URL 状态保持可作为后续体验优化小阶段处理。
- 当前海报为前端即时生成 data URL，不落库；跨域图仍可能按既定逻辑降级。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，若仍按“用户心得分享与 H5 装修优化方案”推进，建议进入“后台装修页面租户选择与预览发布状态优化”或“验证码登录自动化/表单状态兼容优化”小阶段。
- 若准备做最终整体验收，需要统一当前源码服务到本地常用入口，并按全角色主流程执行一次完整右侧浏览器验收。

## 2026-06-23 - 用户心得接口 smoke 验收脚本

### 阶段名称

用户心得分享与 H5 装修优化 - 用户心得接口 smoke 验收脚本小阶段。

### 本阶段完成内容

- 重新读取 `docs/qiwai-cultural-saas-platform-plan.md`、`docs/development-handoff.md` 和最新 `DEVELOPMENT_LOG.md`，确认本阶段延续“用户心得分享与 H5 装修优化方案”。
- 执行待完成迁移 `CommunityParticipantPosts1782050000000`，为 `community_posts` 补齐参与者心得所需字段、关联活动外键和公开查询索引。
- 启动当前源码 API 到 `http://127.0.0.1:3100/api`，避免误测旧的 `3000` 端口服务。
- 运行 `smoke:community-sharing`，真实覆盖：管理员登录、创建免费活动、H5 用户验证码登录、报名、签到、可发布活动查询、心得图片上传、提交待审核心得、待审核前台不可见、后台筛选待审核、审核通过、公开列表/详情展示、分享计数增加、保存首页 `testimonial_feed` 心得模块和公开首页读取视觉布局。
- 保留 smoke 产生的测试数据，便于后续浏览器验收继续查看。

### 修改/新增的主要文件

- `scripts/smoke-community-sharing.mjs`
- `scripts/preflight-smoke-guard.mjs`
- `package.json`
- `docs/launch-checklist.md`
- `docs/local-acceptance-test-plan.md`
- `apps/api/src/migrations/1782050000000-CommunityParticipantPosts.ts`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 22:55:59 +08:00。
- `npm.cmd --prefix apps/api run migration:show`：通过，执行前仅剩 `CommunityParticipantPosts1782050000000` 未应用。
- `npm.cmd --prefix apps/api run migration:run`：通过，已执行 `CommunityParticipantPosts1782050000000`。
- `GET http://127.0.0.1:3100/api/health/ready`：通过，`ready=true`、`api=up`、`database=up`，release commit 为 `community-sharing-local`。
- `API_BASE=http://127.0.0.1:3100/api npm.cmd run smoke:community-sharing`：通过。
- smoke 保留测试数据：活动 id `89`，报名 id `132`，参与者心得帖 id `1`，首页心得装修模块 id `68`。

### 浏览器验收结果

- 验证时间：2026-06-23 22:55:59 +08:00。
- 验证环境：本地当前源码 API `http://127.0.0.1:3100/api`，本地数据库 `activity_registration`。
- 浏览器验证主要步骤：本阶段未执行右侧浏览器点击级验收；以真实 HTTP smoke 覆盖核心数据闭环。
- 输入的测试数据摘要：心得分享烟测活动、心得烟测 H5 用户、1 张 PNG 心得图片、参与者心得内容、首页心得流装修模块。
- 通过项：参与者心得发布资格、上传、待审隔离、后台审核、公开展示、详情活动关联、分享计数、首页心得模块公开读取均通过。
- 发现的问题：尚未在右侧浏览器真实点击验证 H5 发布页、后台审核页、前台动态详情海报生成和后台装修视觉预设保存。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；完整上线前仍需执行浏览器交互验收。

### 遗留问题

- `3000` 端口仍可能是旧运行服务，本阶段使用 `3100` 验证当前源码；后续最终验收需统一服务端口或重建本地 nginx/API。
- 海报生成仍未做浏览器 canvas 真实截图/保存验证。
- 后台装修视觉预设保存后的 H5 刷新展示仍待浏览器点击级复验。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，进入“用户心得分享与 H5 装修优化 - 浏览器交互验收小阶段”：启动/确认 Admin 与 H5 页面，使用右侧浏览器走发布心得、后台审核、前台展示、生成海报、应用视觉预设并刷新查看。
- 如果右侧浏览器控制仍不可用，则记录工具阻塞，并用 HTTP/页面入口检查尽量补充替代验证。

## 2026-06-23 - H5 装修视觉控件细化

### 阶段名称

用户心得分享与 H5 装修优化 - H5 装修视觉控件细化小阶段。

### 本阶段完成内容

- 重新读取本轮“用户心得分享与 H5 装修优化方案”和最新开发记录，选择计划内下一小阶段：装修视觉控件细化。
- 后台首页装修模块编辑抽屉新增“视觉预设”，包含书院暖色、运营清爽、公益共建、商城导购四套预设，可一键写入当前模块 `layout`。
- 后台通用外观新增运营可点选控件：主题色、强调色、文字色、辅助文字色、字体风格、模块密度、按钮样式、卡片样式、分割样式。
- 保留 `config` / `layout` 高级 JSON 配置，视觉控件与 JSON 同步，兼容已有装修保存接口和数据结构。
- H5 装修渲染组件读取新增 `layout` 字段，将主题色、文字色、辅助色、字体风格、模块密度、卡片样式、按钮圆角、分割底色等转换为模块级样式和 CSS 变量。
- 参与者心得、品牌故事、公益/课程/商城入口等新增模块会继承这些视觉变量，运营配置后能在前台生效。

### 修改/新增的主要文件

- `apps/admin/src/views/HomepageBuilder.vue`
- `apps/mobile/src/components/PageDecorationBlocks.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-23 22:40:37 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释提示和大 chunk 提醒。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。

### 浏览器验收结果

- 验证时间：2026-06-23 22:40:37 +08:00。
- 验证环境：本地构建验证，未启动新服务或执行右侧浏览器点击验收。
- 浏览器验证主要步骤：未执行点击级浏览器验证；本阶段以后台和 H5 构建验证替代。
- 输入的测试数据摘要：未新增业务测试数据，未保存新的装修配置。
- 通过项：后台装修抽屉模板和类型检查通过；H5 装修组件能编译新增视觉样式字段。
- 发现的问题：尚未在浏览器中实测“选择视觉预设 -> 保存模块 -> 前台刷新查看效果”的完整交互。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；上线前仍需结合真实装修数据做浏览器验收。

### 遗留问题

- 视觉控件目前是模块级样式，尚未做全站级主题继承面板。
- 后台实时预览仅部分反映新增视觉字段；前台 H5 渲染已接入，但仍需浏览器保存后复验。
- 不同模块对视觉字段的响应深度不同，后续可继续把活动列表、快捷入口等旧样式也逐步变量化。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，优先做用户心得与 H5 装修的浏览器交互验收：发布心得、后台审核、前台展示、海报生成、应用视觉预设、保存并刷新查看。
- 若验收发现样式不一致，再在计划范围内继续补齐旧模块变量化。

## 2026-06-23 - 用户心得分享与 H5 装修优化基础闭环

### 阶段名称

用户心得分享与 H5 装修优化 - 参与者心得发布、审核、分享海报与装修模板基础小阶段。

### 本阶段完成内容

- 按本轮新计划推进“用户心得分享与 H5 装修优化”，本阶段选择基础闭环：参与者心得发布、后台审核、公开展示、海报分享、首页装修模板与新增模块。
- 后端扩展 `community_posts` 数据模型，新增来源、审核状态、关联活动、城市、标签、审核备注、分享次数、海报配置和审批时间，并新增迁移脚本，历史可见动态迁移为 `official + approved`。
- 新增用户端心得接口：可发布活动列表、我的心得、心得图片上传、心得提交、分享次数记录；发布资格限制为已签到，或活动结束且报名成功/已付款。
- 公开动态列表、详情、点赞、评论接口只展示 `approved + visible` 的动态，避免待审核内容前台曝光。
- 后台“书院动态/共修”增加来源、状态、活动筛选和审核操作，支持通过、驳回、上/下架与精选状态管理。
- H5 新增“发布心得”页面，支持选择可发布活动、正文、1-9 张图片、城市、标签、提交审核，以及查看我的心得审核状态。
- H5 活动详情、报名详情、共修动态页新增心得入口；活动详情可进入活动口碑列表，动态页支持按活动筛选并将当前活动带入发布页。
- H5 动态详情新增复制链接和前端 canvas 生成海报；海报包含活动/心得/用户/分享链接，遇到图片跨域时自动生成无图版或复制链接兜底。
- 首页装修新增活动运营型、书院品牌型、课程转化型、公益招募型、商城导购型模板，新增参与者心得、精选心得、活动口碑墙、公益摘要、课程推荐、商城精选、品牌故事入口等模块类型。
- H5 装修默认配置扩展到共修首页、动态详情、课程首页、公益页、商城首页、品牌故事页等页面覆盖入口。

### 修改/新增的主要文件

- `apps/api/src/entities/community-post.entity.ts`
- `apps/api/src/migrations/1782050000000-CommunityParticipantPosts.ts`
- `apps/api/src/modules/courses/public-courses.controller.ts`
- `apps/api/src/modules/courses/courses.service.ts`
- `apps/api/src/modules/courses/courses.controller.ts`
- `apps/api/src/modules/courses/courses.module.ts`
- `apps/api/src/modules/homepage-defaults.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/api/src/modules/public/public.module.ts`
- `packages/shared/src/index.ts`
- `apps/admin/src/views/Community.vue`
- `apps/admin/src/views/HomepageBuilder.vue`
- `apps/mobile/src/api.ts`
- `apps/mobile/src/community-posts.ts`
- `apps/mobile/src/components/PageDecorationBlocks.vue`
- `apps/mobile/src/pages.json`
- `apps/mobile/src/pages/community/publish.vue`
- `apps/mobile/src/pages/community/index.vue`
- `apps/mobile/src/pages/community/detail.vue`
- `apps/mobile/src/pages/activity/detail.vue`
- `apps/mobile/src/pages/user/registration.vue`

### 运行或测试结果

- 验证时间：2026-06-23 22:36:38 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse 注释提示与大 chunk 提醒。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过，所有上线预检静态 guard 均为 OK。

### 浏览器验收结果

- 验证时间：2026-06-23 22:36:38 +08:00。
- 验证环境：本地工作区构建验证，未在本阶段启动新服务或执行右侧浏览器点击验收。
- 浏览器验证主要步骤：未执行点击级浏览器验证；本阶段以 API/Admin/H5 构建和预检 guard 作为替代验证。
- 输入的测试数据摘要：本阶段未新增真实业务测试数据，未提交心得测试帖。
- 通过项：三端构建通过；心得发布入口、海报生成代码、后台审核视图、装修模板和新模块均通过类型与打包检查；预检 guard 全部通过。
- 发现的问题：尚未在右侧浏览器真实走“用户发布心得 -> 后台审核通过 -> 前台动态展示 -> 生成海报”的交互闭环；迁移脚本需在目标数据库执行后才能让生产/预发数据表具备新字段。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；完整上线标准仍需执行数据库迁移、启动服务并补做浏览器主流程验收。

### 遗留问题

- 第一阶段海报为 H5 前端即时生成，不落库存储；跨域图片可能降级为无图海报。
- 装修视觉控件只完成模板、模块与页面覆盖基础；更细的主题色板、字体风格、模块密度、按钮/卡片/分割样式仍可作为下一小阶段继续细化。
- 未做公开社区广场，当前仍按计划限制为活动参与者心得，所有用户帖默认先审后发。
- 需要在具备可控测试账号和可发布活动数据时，补做浏览器交互验收并保留测试数据。

### 下一阶段应继续处理的事项

- 继续读取开发计划和开发记录后，选择下一小阶段：H5 装修视觉控件细化，或用户心得浏览器验收与接口 smoke。
- 如进入验收小阶段，应启动 API/Admin/H5 服务，执行数据库迁移，用测试用户发布心得并由后台审核，再验证前台列表、活动口碑、动态详情、海报生成和刷新持久化。

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

## 2026-06-24 - 后台域名批量修改工具

### 阶段名称

上线前部署配置 - 后台“域名批量修改”小阶段。

### 本阶段完成内容

- 重新读取开发计划和 `DEVELOPMENT_LOG.md`，确认本阶段按“后台域名批量修改”计划推进。
- 在后台 `系统设置 -> 部署配置` 新增“域名批量修改”区域，支持“同域名部署”和“拆分域名”两种模式。
- 同域名模式输入主域名后，自动预览 H5 根域名、后台 `/admin`、API 根域名、CORS、微信/支付宝/商城支付回调 URL。
- 拆分域名模式支持分别填写 H5、后台、API 域名，CORS 自动生成为 H5 与后台两个源，支付回调默认使用 API 域名。
- 修正 CORS 生成规则：`CORS_ORIGIN` 只保留协议、域名和端口，不携带 `/admin` 路径，并自动去重。
- 新增“套用到全站”“从当前配置回填”“复制服务器修改命令”“复制验证命令”“检测当前配置”操作。
- 服务器命令包含 `.env.production` 备份、`set_env`/`sed -i` 更新、BUILD_COMMIT/BUILD_TIME、PM2 `--update-env` 重启和 health ready 检查。
- 复制能力增加 `navigator.clipboard` 失败后的 textarea 兜底，适配本地 HTTP 开发环境。
- 修复后台内容区较窄时预览表覆盖复制按钮的问题，域名批量修改卡片改为单列布局，保证按钮可点击。
- 同步更新 `docs/域名批量修改.md`，说明后台入口、安全边界、服务器仍需处理 DNS/SSL/Nginx/PM2 的步骤。

### 修改/新增的主要文件

- `apps/admin/src/views/SystemSettings.vue`
- `docs/域名批量修改.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 09:31:41 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse pure 注释与大 chunk 提醒。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check -- apps/admin/src/views/SystemSettings.vue docs/域名批量修改.md DEVELOPMENT_LOG.md`：通过；仅提示 Windows 下 LF/CRLF 转换。

### 浏览器验收结果

- 验证时间：2026-06-24 09:31:41 +08:00。
- 验证环境：后台 dev server `http://127.0.0.1:5174/admin/system-settings`，平台管理员账号 `admin`。
- 浏览器验证步骤：
  - 登录平台超级管理员后台，进入 `系统设置 -> 部署配置`。
  - 确认“域名批量修改”区域可见，安全提示和当前配置体检可见。
  - 同域名模式输入 `new.example.com`，预览生成 `PUBLIC_H5_ORIGIN=https://new.example.com`、`PUBLIC_ADMIN_ORIGIN=https://new.example.com/admin`、`PUBLIC_API_ORIGIN=https://new.example.com`、`CORS_ORIGIN=https://new.example.com`，支付回调均使用 `https://new.example.com/payment/...`。
  - 点击“套用到全站”，部署表单同步为 `https://new.example.com`、`https://new.example.com/admin`、`https://new.example.com`。
  - 拆分域名模式输入 `h5.example.com`、`admin.example.com`、`api.example.com`，预览生成 `CORS_ORIGIN=https://h5.example.com,https://admin.example.com`，支付回调使用 `https://api.example.com/payment/...`。
  - 点击“复制服务器修改命令”，剪贴板内容包含 `sed -i`、`set_env CORS_ORIGIN`、PM2 `restart activity-api --update-env`，页面提示“已复制服务器修改命令”。
  - 点击“复制验证命令”，剪贴板内容包含 H5、后台、API `/api/health/ready` 和公开首页接口 curl 命令，页面提示“已复制验证命令”。
  - 保存当前原有部署配置后刷新页面，`H5/后台/API` 字段仍保持 `https://h5.test-qiwai.example`、`https://admin.test-qiwai.example`、`https://api.test-qiwai.example`，未把示例域名写入持久配置。
- 输入的测试数据摘要：`new.example.com`、`h5.example.com`、`admin.example.com`、`api.example.com`。
- 通过项：后台区域可见；同域名和拆分域名自动填充正确；CORS 不再带 `/admin` 路径；复制命令可用；按钮无覆盖；保存刷新链路可用；浏览器控制台无前端 error。
- 发现的问题：真实域名可访问性检测未对外网域名执行正向成功验证，因为本阶段使用的是示例域名；该检测需在真实 HTTPS 域名、DNS、SSL、Nginx 完成后复测。
- 是否达到可上线运营标准：本小阶段达到可运行、可测试、可继续开发状态；后台域名批量修改工具可用于上线前配置辅助，但生产实际切域名仍需管理员在服务器和宝塔/Nginx 中执行。

### 遗留问题

- 后台不会直接修改 DNS、SSL、Nginx 或重启 PM2，这是安全边界，不作为缺陷。
- 真实支付未验收前，即使回调 URL 已自动生成，仍需保持 `REAL_PAYMENT_ENABLED=false`。
- 真实域名切换时需要用生产 HTTPS 域名重新跑浏览器检测和服务器 curl 验证。

### 下一阶段应继续处理的事项

- 继续按上线前计划推进真实 HTTPS 域名、微信内 H5 分享/海报、DNS/SSL/Nginx/PM2 服务器侧联调。
- 真实支付、短信、证书、回调资料补齐后，再开启真实支付小额支付、退款和重复回调验收。

## 2026-06-24 - 线上静态发布与旧品牌残留定位

### 阶段名称

上线前部署配置 - H5/Admin 构建产物发布到站点根目录小阶段。

### 本阶段完成内容

- 右侧浏览器检查线上 H5 `https://rd.chaimen666.com/#/?tenantCode=qiwai-showcase`，确认页面仍加载旧资源 `assets/index-D6hAU5Ez.js`，浏览器标题和 H5 顶部栏仍显示 `七维书院`。
- 核对线上公开首页接口 `https://rd.chaimen666.com/api/public/homepage?tenantCode=qiwai-showcase`，返回商家名 `慢π演示中心`，接口数据不含 `七维`，确认问题不是后台配置未保存，而是线上静态 H5 构建产物未发布到 Nginx 实际服务目录。
- 新增 `publish:webroot` 发布脚本，将 `apps/mobile/dist/build/h5` 发布到站点根目录，将 `apps/admin/dist` 发布到 `admin/`，发布前备份旧 `index.html`、`assets/`、`admin/`。
- 新增后台构建前清理脚本，避免 `apps/admin/dist` 留存旧 hash 资源。
- 保持真实支付关闭，未改动线上支付开关逻辑。

### 修改/新增的主要文件

- `package.json`
- `apps/admin/package.json`
- `scripts/publish-webroot.mjs`
- `scripts/clean-admin-dist.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 12:55:56 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，构建前已清理 H5 旧产物。
- `npm.cmd --prefix apps/admin run build`：通过，构建前已清理 Admin 旧产物；仅保留既有 VueUse pure 注释与大 chunk 提醒。
- `rg -n "七维书院|七维文化|七维|奇外|电召" apps/mobile/dist/build/h5 apps/admin/dist apps/mobile/src apps/admin/src apps/api/src packages -g "!node_modules"`：无命中。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下 `package.json`、`apps/admin/package.json` 未来可能发生 LF/CRLF 转换。
- 临时 webroot 发布演练：通过，H5/Admin 入口均替换为新构建，旧 `assets/old.js`、`admin/assets/old.js` 被删除，`.deploy-backups` 备份目录已生成。
- 线上 `https://rd.chaimen666.com/api/health/ready`：API ready 通过，但 release commit 仍为 `7831515`，说明服务器仍需拉取最新代码、构建并执行发布脚本。

### 浏览器验收结果

- 验证时间：2026-06-24 12:55:56 +08:00。
- 验证环境：线上 H5 `https://rd.chaimen666.com/#/?tenantCode=qiwai-showcase`，右侧浏览器。
- 浏览器验证步骤：
  - 读取当前页面标题、顶部栏标题、脚本和样式资源。
  - 页面可见正文已展示 `慢π演示中心`、`慢π` 等数据内容。
  - `document.title` 和多个 `.uni-page-head__title` 仍为 `七维书院`。
  - 当前 HTML 仍引用 `/assets/index-D6hAU5Ez.js`，因此刷新或增加时间戳仍会加载旧 H5 包。
- 输入的测试数据摘要：无新增业务数据，仅检查线上页面和公开首页接口。
- 通过项：问题定位完成；接口数据正确；本地构建产物和发布脚本验证通过。
- 发现的问题：线上站点根目录尚未执行最新发布步骤，仍在服务旧静态资源；需服务器执行 `git pull`、H5/Admin 构建、`npm run publish:webroot` 后再复验。
- 是否达到可上线运营标准：本小阶段代码达到可运行、可测试、可继续部署状态；线上需完成静态发布后才能判定品牌残留修复通过。

### 遗留问题

- 线上 H5 仍显示 `七维书院`，等待服务器拉取并发布最新构建产物。
- 线上 API release commit 仍为旧值 `7831515`，需要重启 API 并带上最新 `BUILD_COMMIT`/`BUILD_TIME`。

### 下一阶段应继续处理的事项

- 在服务器执行最新发布命令：拉取分支、构建 Admin/H5、执行 `npm run publish:webroot`、重启 API、检查旧品牌词残留和 health ready。
- 发布完成后重新打开线上 H5，确认主脚本 hash 已变化，`document.title` 与 H5 顶部栏均显示 `慢π`，并确认后台 `/admin` 可正常打开。

## 2026-06-24 - 线上 H5 直出目录发布脚本兼容

### 阶段名称

上线前部署配置 - Nginx 直指 H5/Admin dist 目录时的构建发布修复小阶段。

### 本阶段完成内容

- 读取服务器执行输出，确认线上 Nginx 配置为：
  - H5 `root /www/wwwroot/rd.chaimen666.com/apps/mobile/dist/build/h5;`
  - Admin `alias /www/wwwroot/rd.chaimen666.com/apps/admin/dist/;`
- 定位首次发布未生效原因：服务器在 `npm --prefix apps/mobile run build:h5` 的 `prebuild:h5` 阶段中断，`clean-mobile-h5-dist.mjs` 使用整目录 `rm -r` 时在服务器 Node v20 上对 `h5/index.html` 抛出 `ENOTDIR: not a directory, scandir .../index.html`，导致后续 `publish:webroot` 未执行。
- 将 H5 清理脚本改为“保留 dist 根目录、逐项删除子文件/目录”，并对 `ENOTDIR` 做文件删除兜底，适配 Nginx 直接服务构建目录的线上结构。
- 扩展 `publish:webroot`：当 `WEBROOT` 等于 `apps/mobile/dist/build/h5` 时识别为 H5 直出模式；当 `ADMIN_WEBROOT` 等于 `apps/admin/dist` 时识别为 Admin 直出模式，避免把源目录当目标目录再次复制或删除。
- 保留普通 webroot 复制模式，继续支持把 H5 发布到站点根目录、Admin 发布到 `webroot/admin` 的部署形态。

### 修改/新增的主要文件

- `scripts/clean-mobile-h5-dist.mjs`
- `scripts/publish-webroot.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 13:14:13 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，新的逐项清理脚本可正常清空并重建 H5 dist。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse pure 注释与大 chunk 提醒。
- `npm run publish:webroot` 临时普通 webroot 复制模式：通过，H5/Admin 入口均替换为新构建，旧资源被删除，备份目录生成。
- `WEBROOT=apps/mobile/dist/build/h5 ADMIN_WEBROOT=apps/admin/dist npm run publish:webroot` 直出模式：通过，脚本识别 H5/Admin 构建产物已是 Nginx 服务目录，不再执行危险复制；H5 `index.html` 仍引用新 hash `assets/index-7sr955wH.js`。
- `rg -n "七维书院|七维文化|七维|奇外|电召" apps/mobile/dist/build/h5 apps/admin/dist apps/mobile/src apps/admin/src apps/api/src packages -g "!node_modules"`：无命中。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下脚本文件未来可能发生 LF/CRLF 转换。

### 浏览器验收结果

- 本阶段先完成本地脚本修复和构建验证；线上右侧浏览器仍需等待服务器拉取本次提交并重新执行 H5 构建后复验。
- 上一轮线上浏览器结果仍显示旧 `assets/index-D6hAU5Ez.js`，原因已定位为服务器 H5 构建在清理阶段失败，未生成并发布新包。

### 遗留问题

- 需要服务器拉取本次提交后重新执行构建发布命令。
- 执行完成前，线上 H5 仍可能显示旧标题 `七维书院`。

### 下一阶段应继续处理的事项

- 服务器执行最新命令后，重新检查外网 HTML 是否不再引用 `index-D6hAU5Ez.js`。
- 右侧浏览器重新打开带时间戳的线上 H5，确认标题、顶部栏、正文和资源 hash 均为慢π新包。

## 2026-06-24 - H5 清理脚本 EISDIR 兼容补丁

### 阶段名称

上线前部署配置 - 服务器 Node v20 删除 H5 assets 目录兼容小阶段。

### 本阶段完成内容

- 读取服务器第二次执行输出，确认已拉取到 `c0b2989`，Admin 构建通过，但 H5 构建在 `prebuild:h5` 阶段仍中断。
- 新错误为 `EISDIR: illegal operation on a directory, unlink .../apps/mobile/dist/build/h5/assets`，说明服务器 Node v20 在清理 `assets` 目录时进入了文件删除兜底分支。
- 将 `clean-mobile-h5-dist.mjs` 改为对子项优先使用 `rm(path, { recursive: true, force: true })`，只在 `ENOTDIR` 时尝试 `unlink`，且 `unlink` 遇到 `EISDIR` 会回退到递归删除目录。
- 未改动业务代码、数据库、Nginx 配置或支付开关。

### 修改/新增的主要文件

- `scripts/clean-mobile-h5-dist.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 13:19:37 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `rg -n "七维书院|七维文化|七维|奇外|电召" apps/mobile/dist/build/h5 apps/admin/dist apps/mobile/src apps/admin/src apps/api/src packages -g "!node_modules"`：无命中。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下脚本文件未来可能发生 LF/CRLF 转换。

### 浏览器验收结果

- 本阶段为服务器构建脚本兼容补丁，线上浏览器仍需等待服务器拉取本次提交后复验。
- 当前线上旧标题问题仍未判定完成，原因是服务器 H5 构建尚未成功跑完。

### 遗留问题

- 需要服务器拉取本次提交后再次执行 H5 构建和外网验证。

### 下一阶段应继续处理的事项

- 服务器拉取最新提交后重新执行 `npm --prefix apps/mobile run build:h5`，确认不再出现 `ENOTDIR/EISDIR`。
- 构建成功后检查外网 HTML 主脚本 hash，并用右侧浏览器复验 `document.title` 和顶部栏。

## 2026-06-24 - 小程序体验版上传成功验收

### 阶段名称

小程序上线准备 - 线上体验版上传验收小阶段。

### 本阶段完成内容

- 读取服务器部署输出，确认服务器已拉取到 `f9f20e7`。
- 确认服务器执行结果：
  - API 构建通过。
  - 小程序 `mp-weixin` 构建通过。
  - `app.wxss` 不再包含微信不支持的 `* { ... }` 通配选择器。
  - PM2 已重启 `activity-api`。
  - `/api/health/ready` 返回 `ready=true`，且 `commit=f9f20e7`。
- 使用右侧浏览器刷新线上后台“小程序发布管理”。
- 点击“上传体验版”并确认上传。
- 微信 CI 返回成功，后台发布记录出现最新成功记录，页面显示体验版二维码。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 16:28 +08:00。
- 服务器验证：`API_READY_URL=https://rd.chaimen666.com/api/health/ready npm run wait:api-ready` 通过，线上 API commit 为 `f9f20e7`。
- 浏览器验证：后台 `https://rd.chaimen666.com/admin/miniprogram-release` 可正常打开。
- 浏览器验证：发布记录最新行显示 `2026-06-24 08:28:15 上传体验版 success 1.0.1 admin`。
- 浏览器验证：页面显示“最新体验版二维码”。

### 遗留问题

- 仍需用手机微信扫描体验版二维码，完成小程序真机主流程验收。
- 真机验收通过后，才能提交微信审核；审核通过后再发布线上版。
- 真实支付仍未完成商户、证书、回调和真实小额支付/退款验收，正式运营前仍需保持真实支付关闭。

### 下一阶段应继续处理的事项

- 手机微信扫描体验版二维码，验证首页、登录、活动报名、我的报名、发布心得、图片上传、商城浏览、余额/线下支付提示等主流程。
- 真机验收通过后，在后台“小程序发布”页面点击“提交微信审核”。
- 审核通过后再点击“发布线上版”。

## 2026-06-24 - 小程序体验版 WXSS 上传校验修复

### 阶段名称

小程序上线准备 - 修复微信 CI `app.wxss` 通配选择器小阶段。

### 本阶段完成内容

- 读取服务器执行结果，确认线上 API 已拉取并重启到 `01e1df4`，`/api/health/ready` 返回 `commit=01e1df4`。
- 使用右侧浏览器刷新线上“小程序发布管理”页面，确认旧的定位权限说明长度错误已消失，最新失败变为微信 CI `app.wxss(1:321): unexpected token *`。
- 定位到 `apps/mobile/src/styles.css` 中的全局 `* { box-sizing: border-box; }` 会被编译进小程序 `app.wxss`，微信上传校验不接受该通配选择器。
- 将全局通配选择器改为小程序支持的显式组件选择器：`view, text, image, button, input, textarea, scroll-view, swiper, swiper-item, navigator, form, label`。
- 扩展后台小程序发布服务上传前自检：若旧构建产物 `app.wxss` 仍含 `* { box-sizing: border-box; }`，上传前自动替换为显式组件选择器。
- 更新小程序上传发布文档，记录后台上传前对 `app.wxss` 的兜底处理。

### 修改/新增的主要文件

- `apps/mobile/src/styles.css`
- `apps/api/src/modules/admin/miniprogram-release.service.ts`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 16:29 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `rg -n "(^|})\\s*\\*\\s*\\{" apps/mobile/dist/build/mp-weixin/app.wxss apps/mobile/src/styles.css || echo 'OK no universal selector'`：通过，未发现通配选择器。
- `apps/mobile/dist/build/mp-weixin/app.json`：确认 `scope.userLocation.desc` 仍为 `用于定位城市展示本地活动课程`。

### 遗留问题

- 需要服务器拉取本次提交后重新构建 API 和小程序包，并重启 PM2，让后台上传前 WXSS 兜底逻辑生效。
- 再次上传体验版后如微信继续返回新的 WXSS/类目/隐私错误，需要按最新错误继续处理。

### 下一阶段应继续处理的事项

- 服务器部署本次提交后，在后台“小程序发布”再次点击“上传体验版”。
- 上传成功后，用体验版二维码在手机微信中完成首页、登录、活动报名、心得发布、图片上传和商城/余额支付主流程验收。

## 2026-06-24 - 小程序体验版上传目录自检修复

### 阶段名称

小程序上线准备 - 后台上传前校验真实构建目录小阶段。

### 本阶段完成内容

- 使用右侧浏览器打开线上 `小程序发布管理` 页面，确认最新失败记录仍来自微信 CI：`scope.userLocation exceeds 30`，且失败文案为旧的“书院/商家”描述。
- 分析后确认本地源码和本地 `mp-weixin/app.json` 已无旧文案，因此问题更可能出在后台上传服务读取的真实构建目录、相对路径或构建产物配置上。
- 修改后台小程序发布服务：
  - 相对构建目录优先按项目根目录解析，避免 API 进程工作目录差异导致读取错误位置。
  - 上传体验版前读取实际 `app.json`，若 `scope.userLocation.desc` 超过微信 30 字限制，则自动改为 `用于定位城市展示本地活动课程`。
  - 上传体验版前同步 `project.config.json` 的 `appid` 为后台保存的小程序 AppID，避免构建产物仍是 `touristappid`。
  - 发布记录详情中写入实际 `projectPath` 和项目文件自检结果，便于后续排查。
- 更新小程序上传发布文档，说明后台上传体验版前的自动检查规则。

### 修改/新增的主要文件

- `apps/api/src/modules/admin/miniprogram-release.service.ts`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 16:12 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- 右侧浏览器页面读取：线上发布记录仍显示旧定位说明超长失败，表单构建目录为 `apps/mobile/dist/build/mp-weixin`。

### 遗留问题

- 需要服务器拉取本次后端修复后，执行 API 构建并重启 PM2，让后台上传服务加载新逻辑。
- 重启后再次点击“上传体验版”，若仍失败，应查看发布记录展开详情中的 `projectPath` 和 `projectCheck`。

### 下一阶段应继续处理的事项

- 服务器拉取最新提交、构建 API、重启 `activity-api`，然后重新上传体验版。
- 上传成功后，用体验版二维码在手机微信中完成首页、登录、活动报名、心得发布、图片上传和商城/余额支付主流程验收。

## 2026-06-24 - 小程序体验版上传权限描述修复

### 阶段名称

小程序上线准备 - 修复微信 `scope.userLocation` 权限说明长度小阶段。

### 本阶段完成内容

- 根据后台“小程序发布”上传体验版失败提示，定位到微信 CI 校验报错：`scope.userLocation exceeds 30`。
- 将微信小程序定位权限说明从超长描述改为 `用于定位城市展示本地活动课程`，保留业务含义并控制在微信 30 字限制以内。
- 本地重新构建 `mp-weixin`，确认生成产物 `app.json` 中的权限说明已同步为短文案。

### 修改/新增的主要文件

- `apps/mobile/src/manifest.json`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 14:15 +08:00。
- `npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `apps/mobile/dist/build/mp-weixin/app.json`：确认 `scope.userLocation.desc` 为 `用于定位城市展示本地活动课程`。
- `rg -n "用于根据|书院/商家|scope.userLocation|用于定位城市展示本地活动课程" apps/mobile/dist/build/mp-weixin apps/mobile/src/manifest.json`：仅命中新短文案与字段名，未发现旧超长说明。
- `git diff --check`：通过；仅提示 Windows 下 `manifest.json` 未来可能发生 LF/CRLF 转换。

### 遗留问题

- 线上服务器还需要拉取本次提交，并重新执行 `npm --prefix apps/mobile run build:mp-weixin` 后再在后台上传体验版。
- 微信公众平台仍需保持服务器出口 IP 在“小程序代码上传 IP 白名单”中。

### 下一阶段应继续处理的事项

- 服务器拉取最新代码、重建小程序包后，再次点击后台“小程序发布 -> 上传体验版”。
- 上传成功后用体验版二维码在手机微信中验证首页、登录、活动报名、心得发布、图片上传和商城/余额支付主流程。

## 2026-06-24 - 线上部署结构文档与 H5 清理逻辑重写

### 阶段名称

上线前部署配置 - 按真实 Nginx 结构重写 H5 构建清理与发布说明小阶段。

### 本阶段完成内容

- 重新按项目结构分析当前问题，确认线上是宝塔 + Nginx + PM2 直出部署：
  - H5 根路径直接服务 `apps/mobile/dist/build/h5`。
  - 后台 `/admin/` 直接 alias 到 `apps/admin/dist`。
  - API `/api/` 反代到 PM2 的 `127.0.0.1:3000/api/`。
- 明确本次“后台品牌为慢π但 H5 标题仍是七维书院”的判断路径：API 数据层已更新，但外网 `index.html` 仍引用旧 H5 主包，根因在 H5 构建/静态层。
- 将 `clean-mobile-h5-dist.mjs` 从 Node `fs.rm(... recursive)` 改为显式递归清理：`readdir -> unlink/rmdir`，避免服务器 Node v20 在删除 `assets/*.css` 时出现 `ENOTDIR: scandir` 或 `EISDIR: unlink`。
- 新增 `docs/线上部署结构与发布说明.md`，记录项目结构、Nginx 映射、发布命令、旧标题排查方法和本次问题结论。
- 在 `docs/开发方案与二次开发说明.md` 中增加线上部署结构专题文档入口。

### 修改/新增的主要文件

- `scripts/clean-mobile-h5-dist.mjs`
- `docs/线上部署结构与发布说明.md`
- `docs/开发方案与二次开发说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 13:25:45 +08:00。
- `npm.cmd --prefix apps/mobile run build:h5`：通过；构建前成功清理已有 H5 dist，包括 `assets` 目录和其下 CSS/JS 文件。
- `rg -n "七维书院|七维文化|七维|奇外|电召" apps/mobile/dist/build/h5 apps/admin/dist apps/mobile/src apps/admin/src apps/api/src packages -g "!node_modules"`：无命中。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下文档和脚本文件未来可能发生 LF/CRLF 转换。

### 浏览器验收结果

- 本阶段为结构文档与构建脚本修复，线上浏览器仍需服务器拉取本次提交并重新构建 H5 后复验。
- 复验重点：外网 HTML 不再引用 `assets/index-D6hAU5Ez.js`，右侧浏览器 `document.title` 和 H5 顶部栏显示 `慢π`。

### 遗留问题

- 需要服务器拉取本次提交后再次执行 H5 构建。
- 构建成功后才能最终确认线上旧标题残留消失。

### 下一阶段应继续处理的事项

- 服务器执行最新发布命令后，使用 `curl -s "https://rd.chaimen666.com/?t=$(date +%s)" | grep -E 'assets/index-|七维|慢π'` 检查外网主包 hash。
- 右侧浏览器打开新时间戳链接做最终复验，并将结果继续写入 `DEVELOPMENT_LOG.md`。
