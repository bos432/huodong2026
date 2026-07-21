# DEVELOPMENT LOG

# 2026-07-16 - 01.07 区域授权、定位与租户切换真实验收

- 真实区域验收发现审批接口未二次检查冲突：创建时虽进入 `pending`，审批仍可直接变成 `approved`。已在 `approveTenantRegion` 增加半径/多边形冲突复核，冲突批准返回 400，并新增回归测试。
- 最终保留区域 A `11`、B 远端 `12`、B 冲突驳回 `13`；API 通过非冲突批准、冲突待审、冲突批准拦截、驳回、有效期、定位命中、定位兜底和命中日志查询。
- 浏览器结果 `.local-logs/browser-tenant-region-1784214047119/result.json` 通过，PC 区域保护与定位日志、H5 城市切换资产边界提示及手动租户持久化均通过，共 3 张截图。
- 全量回归通过：API 93 个测试文件、547 项，全部 preflight，最终镜像 `sha256:a5a9027cb7ba03975d808710a2fad63bbd075b0018fc9c1d94f6ee7bf714a1e7`，监控 `ok`、告警 0。
- 最终备份 `backups/mysql/activity_registration-20260716-230456.sql.gz` 为 925,412 bytes，解压 12,817,790 bytes，SHA-256 `4633C4BA0262C3B3F7D36C1AE1F345070C4F310B781E0E0913B07EA1A9F3764A`。完整报告见 `docs/tenant-region-acceptance-report.md`。

# 2026-07-16 - 01.01/01.02 SaaS 隔离、角色与统一鉴权真实验收

- 双租户真实 smoke 首次暴露新租户运营配置首次保存误判停用：`operation_settings` 关系使用 `{ id }` 占位，订阅校验缺少 `enabled`。新增 `loadOperationSettingTenantForCreate`，先加载完整启用租户再保存；新增 3 项回归测试，最终新租户首次保存成功。
- 租户 smoke 同步修复两处验收落后：报名接口补会员 Bearer 令牌，付费报名明确 `paymentMethod=wechat`；支付回调复核改为 A 财务订单已支付/B 财务查不到，符合当前支付响应脱敏合同。
- 最终双租户 `saas-final-a`/`saas-final-b`（ID `42/43`，`city_partner` 验收套餐）通过首页/公告/活动 ID 猜测/导出/支付回调/代理结算边界。专项 API 结果 `.local-logs/saas-governance-1784210800000/result.json` 通过，覆盖运营拒绝财务、文件对象键和异步任务隔离；PC 结果 `.local-logs/browser-saas-governance-1784210783542/result.json` 通过，A/B 活动列表互不泄露且运营账号财务越权被拦截。
- 保留对象键：A `images-t42-a173`，B `images-t43-a175`；保留业务任务 `64/65`，相同幂等键 `saas-governance-1784210691624` 在不同租户可独立存在，跨租户取消返回 404。
- 全量回归通过：API 93 个测试文件、546 项，全部 preflight，`git diff --check`，最终镜像 `sha256:3dc6f2443895147a84c8a5fae3b1ef94285361266154f72dcbf1963361059d55`；完整线上 smoke 通过，监控 `ok`、告警 0。
- 最终备份 `backups/mysql/activity_registration-20260716-221627.sql.gz` 为 922,367 bytes，解压 12,786,198 bytes，gzip 校验通过，SHA-256 `714E3385258857FB1554061734AC0EC275EFBEF998AAC347E3D431A1E706E796`。完整报告见 `docs/saas-governance-acceptance-report.md`。

本文件记录无人值守持续开发模式下，每个小阶段的实施、验证和遗留事项。

## 2026-07-01 - 线上全流程多角色验收与整改方案

### 阶段名称

上线前真实浏览器全流程验收 - H5 用户、财务确认、签到核销、多角色权限与新增运营页面验收小阶段。

### 本阶段完成内容

- 按用户要求在右侧浏览器和线上 API 完成真实验收，测试数据保留不删除。
- 复用并继续上一轮已创建的保留测试会员和订单：
  - 会员手机号 `13907011300`，昵称 `验收用户ACCEPT-20260701-1300`。
  - 报名 ID `36`，订单 ID `36`，订单号 `OD178288224539436`。
- H5 用户流程验证：
  - H5 首页可打开，首页装修、活动列表、广告位和底部导航可展示。
  - H5 密码登录成功。
  - 报名详情在财务确认后显示 `报名成功 / 订单已付款`。
  - 核销后刷新显示 `已签到 / 订单已付款`。
- 财务流程验证：
  - `showcase_finance` 登录后台成功。
  - 订单页可查看测试订单。
  - 通过后台确认线下收款接口完成收款，确认人写入 `showcase_finance`。
  - 订单状态从 `pending_payment` 变为 `paid`，报名状态从 `pending_payment` 变为 `approved`。
- 签到流程验证：
  - `showcase_checkin` 登录后台成功。
  - 核销接口成功创建核销记录 ID `16`，报名状态变为 `checked_in`。
  - 浏览器复查发现签到核销页在窄屏下输入框宽度为 0，记录为高优先级整改项。
- 多角色权限验证：
  - 平台超管、商家管理员、运营、财务、签到账号登录和主要权限边界符合预期。
  - 财务访问营销弹窗被拦截回工作台，签到账号访问订单/会员/广告中心被 API 拒绝。
  - 店铺/代理相关账号当前密码不可用，未完成验收。
- 新增页面验证：
  - 会员管理可筛选到保留会员，并显示消费、报名、签到统计。
  - 前台装修页可打开，UI 模板套装、版本历史、模板库、生效检测入口可见。
  - 营销弹窗页可打开，当前保留弹窗为停用状态，公开接口返回空。
  - 广告中心可打开，保留广告计划、广告主、合同、结算数据可见。
- 新增详细测试文档和优化整改方案。

### 修改/新增的主要文件

- `docs/线上全流程验收报告与整改方案-20260701.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-07-01 13:04 - 13:18 +08:00。
- 验证环境：线上 `https://rd.chaimen666.com`，商家 `qiwai-showcase`。
- API 健康检查：`ready=true`，`api=up`，`database=up`，`config=warning`。
- API release：`9260d75`，构建时间 `2026-06-25T14:17:10+08:00`。
- H5 报名详情最终状态：
  - 报名：`已签到`
  - 订单：`已付款`
  - 活动：`【演示】家庭教育沟通工作坊`
- 后台订单最终状态：
  - 订单 `OD178288224539436` 状态 `paid`
  - 确认人 `showcase_finance`
  - 收款备注 `ACCEPT-20260701-1300 财务验收确认收款`
- 后台核销最终状态：
  - 核销记录 ID `16`
  - 报名状态 `checked_in`
  - 核销备注 `ACCEPT-20260701-1300 现场核销验收`
- 页面控制台：
  - H5 登录、首页、报名详情：未发现 error。
  - 会员管理、装修、营销弹窗、广告中心：未发现业务页面 error。
- 公开接口抽查：
  - `/public/marketing-popups` 返回 `null`，原因是当前弹窗停用。
  - `/public/ad-slots` 可返回首页广告，但广告图片为空。

### 遗留问题

- P0：短信服务未配置，新用户验证码登录失败，正式上线前必须处理。
- P1：签到核销页在窄屏浏览器下主内容被侧边栏挤压，输入框宽度为 0，现场手动核销受影响。
- P1：店铺/代理相关测试账号当前密码不可用，未完成店铺、代理、店铺财务角色验收。
- P1：营销弹窗缺少“未生效原因/生效检测”，当前停用状态容易被误认为功能失效。
- P2：广告中心保留广告计划缺少图片，正式投放视觉不完整。
- P2：线上 API release commit 与本地当前分支 HEAD 不一致，需要增强三端版本可观测性。

### 下一阶段应继续处理的事项

- 优先修复短信服务配置和签到页窄屏布局。
- 重置或重建店铺/代理演示账号后补测商城店铺、代理结算、店铺财务角色。
- 给营销弹窗增加生效检测与前台预览，减少运营误判。
- 给广告计划增加图片必填/兜底图校验。
- 完成 P0/P1 后再跑一次最终上线验收。

## 2026-06-25 - 后台装修中等宽度线上复验完成

### 阶段名称

试运营装修体验增强 - 线上二次部署后 UI 模板预览与实时预览最终复验小阶段。

### 本阶段完成内容

- 用户反馈服务器部署命令已执行两次；确认重复执行不会造成问题，最终以最后一次构建结果为准。
- 在线上后台打开 `https://rd.chaimen666.com/admin/homepage-builder?pageKey=home&t=codex-deploy-6dd30a7`，绕过旧缓存复验最新后台静态包。
- 使用 1060px 宽度复现之前右侧浏览器宽度，验证中等宽度补丁已经生效：
  - 页面加载到新的 `HomepageBuilder` 资源。
  - `UI 模板套装`、`实时预览`、`生效检测` 均可见。
  - `.phone-preview` 不再隐藏，显示为 `display:grid`。
  - 手机预览保持 `position: sticky`。
- 打开 `UI 模板套装` 弹窗，确认 7 张模板卡片和右侧模板手机预览可见。
- 切换到 `五行暖金商业版`，确认右侧预览标题切换为该模板并展示暖金/商城相关内容。
- 刷新关闭弹窗后向下滚动页面，确认顶部工具条、手机实时预览和生效检测按钮保持可见。
- 验证完成后恢复浏览器默认视口，未修改线上装修数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-25 15:58 +08:00。
- 验证环境：线上 `https://rd.chaimen666.com`，后台 `/admin/homepage-builder?pageKey=home`，右侧浏览器。
- 线上加载资源：
  - `https://rd.chaimen666.com/admin/assets/HomepageBuilder-BQ7999_M.js`
  - `https://rd.chaimen666.com/admin/assets/HomepageBuilder-vVkmTYpd.css`
- 1060px 视口滚动后关键检测值：
  - `innerWidth=1060`
  - `scrollY=950`
  - `mainOverflow=visible`
  - `.phone-preview display=grid`
  - `.phone-preview position=sticky`
  - 手机预览位置：`top=248`，宽度 `240`，高度 `566`
  - 手机框位置：`top=366`，宽度 `220`，高度 `420`
  - 可见 `生效检测` 按钮数：`2`
- 控制台 error 级日志：空。

### 遗留问题

- 1060px 宽度下右侧配置面板位于手机预览下方，这是中等宽度下优先保证实时预览可见后的布局取舍。
- 小程序前台装修展示仍需要在重新构建/上传小程序后单独验收；本阶段只覆盖线上后台装修编辑器。

### 下一阶段应继续处理的事项

- 如运营继续反馈中等屏幕拥挤，可增加“预览/配置”右侧标签切换或可折叠配置面板。
- 若要让小程序端也吃到最新默认装修静态包，需要单独执行小程序构建、导入微信开发者工具和真机验收。

## 2026-06-25 - 后台装修中等宽度实时预览补强

### 阶段名称

试运营装修体验增强 - 线上部署后中等宽度预览显示补强小阶段。

### 本阶段完成内容

- 读取用户服务器部署输出，确认线上已经拉取 `66defa1`、后台构建成功、Nginx 检查和重载成功。
- 在线上右侧浏览器刷新 `/admin/homepage-builder?pageKey=home&t=codex-deploy-66defa1`，确认新功能已经加载：
  - `UI 模板套装` 按钮可见。
  - `实时预览` 文案可见。
  - `生效检测` 按钮可见。
- 打开线上 `UI 模板套装` 弹窗，确认 7 张模板卡片和右侧手机模板预览可见。
- 切换到 `五行暖金商业版`，确认右侧预览标题切换为该模板。
- 复验时发现右侧浏览器实际可视宽度约 `1060px`，原有 `@media (max-width: 1280px)` 会隐藏 `.phone-preview`，导致线上在当前窗口宽度仍看不到实时预览。
- 修复中等宽度布局：
  - `max-width: 1280px` 不再隐藏手机预览。
  - 改为 3 列紧凑布局：左模块、中列表、右侧上方手机预览/下方配置面板。
  - 手机预览在中等宽度下缩小到 `220px` 宽，并继续保持 sticky。
  - 吸顶距离调整到工具条下方，避免被多行工具按钮遮挡。
  - `max-width: 1024px` 时改为堆叠显示，避免窄屏横向挤压。

### 修改/新增的主要文件

- `apps/admin/src/views/HomepageBuilder.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-25 15:38 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅有既有 VueUse/Rollup PURE 注释和 chunk 体积提示。
- `git diff --check`：通过；仅有 Windows 工作区 LF/CRLF 转换提示。
- 本地浏览器 1060px 视口复验：
  - `.phone-preview` 显示为 `display:grid`。
  - 手机预览 `position: sticky`。
  - 页面滚动后手机预览吸顶位置为工具条下方。
  - `实时预览` 文案可见。
  - `生效检测` 可见按钮数为 2。

### 遗留问题

- 本阶段补丁尚未部署到线上；线上仍是上一版 `HomepageBuilder-CpwWOz5g.js`，需要用户在服务器再次拉取最新提交并构建后台静态包。
- 1060px 宽度下空间有限，右侧配置面板排在手机预览下方；这是为了优先保证运营能看到实时预览和生效检测。

### 下一阶段应继续处理的事项

- 提交并推送本阶段修复。
- 用户执行服务器后台静态包部署命令后，再刷新线上装修页做 1060px 宽度复验。

## 2026-06-25 - 后台装修优化提交与部署准备

### 阶段名称

试运营装修体验增强 - 后台静态包提交推送与线上发布命令准备小阶段。

### 本阶段完成内容

- 将后台装修 UI 模板预览、实时预览和吸顶检测改动提交到本地 Git。
- 推送当前分支 `feature/qiwai-ui-experiment` 到远端 `origin`。
- 尝试通过 SSH 直连 `rd.chaimen666.com` 进行线上部署，但当前本机没有服务器 SSH 免密授权，返回 `Permission denied`。
- 确认本次只涉及后台前端静态资源和开发日志，不需要执行数据库 migration，不需要重启 API。
- 准备宝塔终端部署命令：服务器拉取最新分支后，只需构建 `apps/admin` 并重载 Nginx。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-25 15:10 +08:00。
- `git commit -m "feat: improve homepage builder live preview"`：通过，提交 `cfacd934`。
- `git push origin feature/qiwai-ui-experiment`：通过。
- SSH 探测：
  - 首次连接因本机未记录 host key 失败。
  - 使用 `StrictHostKeyChecking=accept-new` 接受新指纹后，服务器返回 `Permission denied (publickey,gssapi-keyex,gssapi-with-mic,password)`。
- 当前本地工作区仅剩 `.local-logs/`、`.local-mariadb/` 本地运行目录未跟踪，未纳入提交。

### 遗留问题

- 由于本机没有服务器 SSH 免密授权，线上后台静态包需要用户在宝塔终端执行部署命令。
- 部署后需要在右侧浏览器刷新线上 `/admin/homepage-builder?pageKey=home`，确认 UI 模板预览、实时预览和吸顶生效。

### 下一阶段应继续处理的事项

- 用户在服务器终端执行部署命令后，继续做线上后台装修页浏览器复验。
- 如需我直接部署，需要先提供可用的 SSH 登录方式或在服务器侧配置本机公钥。

## 2026-06-25 - 后台装修 UI 模板预览与实时预览优化

### 阶段名称

试运营装修体验增强 - UI 模板可预览、装修实时预览与生效检测吸顶小阶段。

### 本阶段完成内容

- `UI 模板套装` 弹窗改为左右布局：左侧模板卡片列表，右侧手机实时预览。
- 模板卡片支持点击切换预览，新增 `预览` 按钮；选中模板高亮展示。
- 右侧模板预览复用装修模块渲染规则，能在应用前看到整套模板的大致页面效果，避免盲目覆盖当前装修。
- 装修页面主工具条改为顶部吸顶，向下滚动时仍可使用保存、模板、版本、检测等关键操作。
- 页面中间手机预览增加 `实时预览` 标识和快捷操作；编辑模块标题、样式、图片、跳转等配置时，预览同步刷新，不需要先保存。
- 手机预览和右侧配置面板改为随页面滚动吸顶，内部各自滚动，便于查看整体布局和长配置。
- 修复 Element Plus `el-main` 默认滚动容器导致 sticky 不生效的问题：仅在 `/homepage-builder` 页面放开主内容 overflow。

### 修改/新增的主要文件

- `apps/admin/src/views/HomepageBuilder.vue`
- `apps/admin/src/views/Layout.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-25 15:02 +08:00。
- 验证环境：本地后台 `http://127.0.0.1:5184/admin/homepage-builder?pageKey=home`，代理本地 API `http://127.0.0.1:18080`。
- `npm.cmd --prefix apps/admin run build`：通过；仅有既有 VueUse/Rollup PURE 注释和 chunk 体积提示。
- `git diff --check`：通过；仅有 Windows 工作区 LF/CRLF 转换提示。
- 右侧浏览器验证：
  - 使用本地后台账号登录后打开 `前台全局装修`。
  - 打开 `UI 模板套装`，确认 7 张模板卡片可见，右侧出现手机模板预览。
  - 切换到 `五行暖金商业版`，确认预览内容随模板切换为暖金商城风格。
  - 页面滚动到较深位置后，确认顶部工具条、手机实时预览和右侧配置面板仍保持可见。
  - 临时把模块标题改为 `实时预览验收标题`，未保存时手机预览立即同步显示；随后刷新页面丢弃临时改动，确认没有污染测试数据。
  - 浏览器控制台未发现本阶段新增 error 级日志。

### 遗留问题

- 本阶段修改只影响后台装修编辑体验，线上需要重新构建并发布后台静态包后生效。
- 窄屏下手机预览仍沿用既有响应式规则隐藏，主要面向桌面后台运营场景验证。
- H5 与小程序前台展示仍需在装修保存后分别通过 H5 刷新和小程序重新构建/上传验证。

### 下一阶段应继续处理的事项

- 如需线上立即使用，提交推送后在服务器拉取最新代码，重新构建 `apps/admin` 并发布后台静态资源。
- 继续观察运营在真实装修数据上的使用反馈，必要时再补充模板缩略图、组件级更细预览或预览设备切换。

## 2026-06-25 - 广告中心平台超管浏览器补验完成

### 阶段名称

试运营商业化增强 - 广告中心线上平台超管权限与页面补验小阶段。

### 本阶段完成内容

- 用户提供线上平台超管当前有效密码后，使用 `admin` 账号在右侧浏览器完成登录补验。
- 登录成功后进入 `https://rd.chaimen666.com/admin/tenants`，页面显示 `平台超级管理后台 · 超级管理员`。
- 打开 `https://rd.chaimen666.com/admin/ad-center?t=adcenter-platform-super`，确认平台超管可访问广告中心。
- 验证平台超管广告中心 6 个标签均可见：
  - 投放计划
  - 广告位配置
  - 广告主管理
  - 合同管理
  - 结算对账
  - 数据报表 / 接入教程
- 验证平台超管可查看线上保留测试投放、广告主、合同、统计和结算单。
- 验证广告位配置页包含内置广告位和官方流量主相关广告形式。
- 验证数据报表 / 接入教程页包含自有广告收入、官方流量主收入、收益导入和官方流量主接入说明。
- 本阶段只做只读补验和页面切换，没有新增、修改或删除线上业务数据。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-25 14:40 +08:00。
- 验证环境：线上 `https://rd.chaimen666.com`，右侧浏览器。
- 浏览器验证主要步骤：
  - 从签到账号后台退出，进入线上后台登录页。
  - 使用 `admin` 账号和用户提供的新密码登录。
  - 确认后台身份为 `平台超级管理后台 · 超级管理员`。
  - 打开 `/admin/ad-center?t=adcenter-platform-super`。
  - 确认广告中心标题、`新增投放`、`刷新`、6 个标签和提示说明可见。
  - 在投放计划页确认 `Codex线上首页广告-0625142315` 可见，统计显示曝光、点击和消耗金额。
  - 切换到 `结算对账`，确认结算单 `AD202606250623270001`、合同 `ADX-0625142315`、广告主 `Codex线上广告主-0625142315` 和金额 `¥1.50` 可见。
  - 切换到 `数据报表 / 接入教程`，确认自有广告收入、官方流量主收入、广告总收入、官方流量主收益导入和接入教程可见。
  - 切换到 `广告位配置`，确认 `app_splash`、`home_top_banner`、`home_feed_inline`、`activity_detail_middle`、`course_detail_middle` 等内置广告位和 `official_banner / official_grid / official_interstitial` 等官方广告形式可见。
  - 切换到 `广告主管理` 和 `合同管理`，确认保留测试广告主、合同和新增入口可见。
- 控制台错误检查：当前超管广告中心标签 `error` 级日志为空。
- 通过项：
  - 平台超管线上登录恢复正常。
  - 平台超管可访问广告中心和全部 6 个标签。
  - 自有广告投放、广告位配置、广告主、合同、结算、官方流量主收益导入和接入教程在超管视角均可见。
  - 运营、财务、签到角色的权限验收沿用上一阶段结果：运营/财务可访问，签到角色被拦截。

### 遗留问题

- 小程序官方广告组件仍需重新构建上传后，在微信开发者工具和真机中验收；本阶段只覆盖线上后台和 H5 相关浏览器能力。
- 真实支付、沙箱支付、商城真实微信支付、店铺直收和代理真实打款仍未放行，必须继续保持关闭。
- 广告中心已经达到试运营后台配置和 H5 自有广告展示可用标准，但官方流量主实际收益仍以微信公众平台为准。

### 下一阶段应继续处理的事项

- 如要继续广告商业化，可进入小程序官方流量主真机/开发者工具验收小阶段。
- 如要继续上线总验收，可按最新开发记录继续验证 H5 用户主流程、后台多角色主流程和小程序体验版。
- 如果暂无新功能开发，应把当前远端提交同步到服务器，便于线上也保留最新验收日志。

## 2026-06-25 - 广告中心线上部署与浏览器验收完成

### 阶段名称

试运营商业化增强 - 广告中心服务器部署后线上多角色验收小阶段。

### 本阶段完成内容

- 用户已在服务器执行广告中心部署命令，线上代码、API、后台和 H5 静态资源已更新。
- 验证线上 API ready 状态，确认服务器 release commit 为 `9260d75`，数据库连通。
- 验证公开广告位接口 `GET /api/public/ad-slots` 正常返回线上广告数据，无 404/500 回退。
- 在右侧浏览器按真实线上地址完成广告中心主流程验收：
  - 运营账号进入 `/admin/ad-center`，能看到广告中心和 6 个标签。
  - 创建并保留线上测试广告主、合同、投放计划。
  - 上报曝光和点击事件。
  - 生成结算单并在后台列表看到曝光、点击和消耗金额。
  - 打开 H5 首页，确认首页顶部广告位能展示自有广告。
  - 财务账号可进入广告中心查看投放与结算数据。
  - 签到账号直接访问广告中心会被拦截并回到后台首页。
- 线上测试数据按用户要求保留，便于后续继续查看和排查。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-25 14:30 +08:00。
- 验证环境：线上 `https://rd.chaimen666.com`，后台 `/admin/ad-center`，H5 `/?tenantCode=qiwai-showcase`。
- `GET https://rd.chaimen666.com/api/health/ready?t=adcenter-log-verify`：通过，`ready=true`，`api=up`，`database=up`，`commit=9260d75`。
- `GET https://rd.chaimen666.com/api/public/ad-slots?tenantCode=qiwai-showcase&pageKey=home&slotKey=home_top_banner&platform=h5`：通过，返回广告 `Codex线上广告验收`。
- 右侧浏览器验证步骤：
  - 使用 `showcase_ops / Qiwai123456` 登录后台，打开广告中心，确认 6 个标签可见。
  - 创建保留测试数据：广告主 `Codex线上广告主-0625142315`、合同 `ADX-0625142315`、投放 `Codex线上首页广告-0625142315`。
  - 公开 H5 首页展示文案 `Codex线上广告验收` 和 `首页顶部广告位联调保留数据 0625142315`。
  - 后台投放列表显示统计结果：曝光、点击、消耗金额正常回写。
  - 生成结算单 `AD202606250623270001`，结算金额 `1.50`。
  - 使用 `showcase_finance / Qiwai123456` 登录后台，确认可访问广告中心并查看数据。
  - 使用 `showcase_checkin / Qiwai123456` 登录后台，确认无广告中心菜单，直接访问 `/admin/ad-center` 被权限拦截。
- 角色/API 权限验证：
  - `showcase_ops`：`ad_center.manage=true`，`/admin/ad-campaigns` 返回 `200`。
  - `showcase_finance`：`ad_center.manage=true`，`/admin/ad-campaigns` 返回 `200`。
  - `showcase_checkin`：`ad_center.manage=false`，`/admin/ad-campaigns` 返回 `403`。
- 页面错误检查：H5 展示期间未发现业务前端错误；浏览器工具曾出现一次外部 Statsig 超时，不属于应用接口错误。
- `git status --short`：仅剩 `.local-logs/`、`.local-mariadb/` 本地未跟踪目录。

### 遗留问题

- `admin / Admin123456` 线上平台管理员登录返回“用户名或密码错误”，平台超管角色的浏览器验收未完成；需要用户提供当前有效平台超管账号后再补验。
- 微信官方流量主真实广告收益仍以微信公众平台后台为准，本系统当前只做广告位配置、事件统计和收益手动导入。
- 真实支付、沙箱支付、商城真实微信支付、店铺直收和代理真实打款仍未放行，不能把广告中心上线等同于真实资金全链路上线。

### 下一阶段应继续处理的事项

- 如果用户提供有效平台超管账号，补测平台超管进入广告中心、配置官方广告位、导入官方收益和查看全局报表。
- 小程序端需要重新构建、上传体验版或正式版后，再在微信开发者工具和真机中验证官方广告组件展示。
- 继续保持真实支付相关开关关闭，直到真实商户配置和预发证据补齐。

## 2026-06-25 - 广告中心服务器部署命令准备

### 阶段名称

试运营商业化增强 - 广告中心线上部署命令与发布顺序准备小阶段。

### 本阶段完成内容

- 重新读取最新 `DEVELOPMENT_LOG.md` 和 `docs/线上部署结构与发布说明.md`，确认线上为宝塔 + Nginx + PM2 直出部署。
- 确认远端分支 `feature/qiwai-ui-experiment` 最新提交为 `e5734d7f`，包含广告中心实现和日志补记。
- 整理服务器部署顺序：拉取代码、导出生产数据库环境变量、执行 API migration、构建 API、重启 PM2、构建 Admin/H5、发布 webroot、重载 Nginx、等待 API ready。
- 明确小程序上传前还需要单独执行 `build:mp-weixin`，并使用 `VITE_API_BASE=https://rd.chaimen666.com/api`、`VITE_DEFAULT_TENANT_CODE=qiwai-showcase`。

### 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `git rev-parse --short HEAD`：`e5734d7f`。
- `git status --short`：仅剩 `.local-logs/`、`.local-mariadb/` 本地未跟踪目录。

### 遗留问题

- 我当前没有服务器交互 shell，不能直接替用户在 `/www/wwwroot/rd.chaimen666.com` 执行部署命令。
- 线上右侧浏览器仍是部署前状态，广告中心线上全流程验收需要服务器执行部署命令后继续。

### 下一阶段应继续处理的事项

- 用户在服务器终端执行本次部署命令后，继续右侧浏览器线上验收广告中心和多角色权限。
- 如部署时 migration、构建、PM2 或 Nginx reload 报错，按报错继续排查并记录新小阶段。

## 2026-06-25 - 广告中心提交推送完成

### 阶段名称

试运营商业化增强 - 广告中心代码提交与远端同步小阶段。

### 本阶段完成内容

- 暂存广告中心相关源码、migration、H5/小程序组件、后台页面和文档记录。
- 明确排除本地测试目录 `.local-logs/`、`.local-mariadb/`，不提交本地数据库和运行日志。
- 创建提交 `f8d77492 feat: add ad center monetization workflows`。
- 推送当前分支 `feature/qiwai-ui-experiment` 到远端 `origin`。

### 修改/新增的主要文件

- 广告中心相关已在提交 `f8d77492` 中同步到远端。
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `git diff --cached --check`：通过。
- `git commit -m "feat: add ad center monetization workflows"`：通过，生成提交 `f8d77492`。
- `git push origin feature/qiwai-ui-experiment`：通过，远端分支从 `e85b441a` 更新到 `f8d77492`。

### 遗留问题

- 服务器还没有拉取 `f8d77492`，线上广告中心表和静态资源尚未发布。
- 推送后本地会继续保留 `.local-logs/`、`.local-mariadb/` 未跟踪目录，属于本地测试运行产物。

### 下一阶段应继续处理的事项

- 进入服务器部署命令准备与线上部署后验收小阶段。
- 服务器部署必须先执行数据库备份和 `npm --prefix apps/api run migration:run`，再重启 API、构建后台/H5、小程序包和发布静态资源。

## 2026-06-25 - 广告中心交付文档与提交准备

### 阶段名称

试运营商业化增强 - 广告中心二开文档、项目进度和部署注意事项收口小阶段。

### 本阶段完成内容

- 按持续开发规则重新读取 `DEVELOPMENT_LOG.md`、开发交接说明、慢π SaaS 落地方案、上线清单、生产 Runbook、本地验收方案、微信分享海报真机验收清单、真实支付接入计划和项目进度表。
- 确认广告中心第一版已经完成本地实现与构建验证，但尚未提交和线上部署。
- 补充 `docs/project-progress.md`，将 V3 商业化交易进度更新为包含广告中心第一版，并新增广告中心商业化第一版里程碑。
- 补充 `docs/开发方案与二次开发说明.md` 升级记录，明确广告中心新增表、后台/API/H5/小程序影响、migration 和线上发布注意事项。
- 再次确认真实支付、沙箱支付、商城真实微信支付、店铺直收和代理真实打款开关仍不得打开；广告中心只涉及广告投放与统计，不代表真实资金结算已上线。

### 修改/新增的主要文件

- `docs/project-progress.md`
- `docs/开发方案与二次开发说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `git diff --check`：通过；仅有 Windows 工作区 LF/CRLF 转换警告。

### 遗留问题

- 广告中心代码仍需完成 git 提交和推送，服务器尚未拉取、执行 migration、构建和发布。
- 线上部署后还需要在右侧浏览器走广告中心创建广告主、合同、投放、事件统计、结算和多角色权限流程。

### 下一阶段应继续处理的事项

- 进入 git 提交推送小阶段，排除 `.local-logs/` 和 `.local-mariadb/` 本地测试目录。
- 提供并记录服务器部署命令，确保先执行 API migration 再重启 API 与发布前端静态资源。

## 2026-06-25 - 广告中心与商业化结算第一版开发完成

### 阶段名称

试运营商业化增强 - 广告中心、官方流量主、自有广告投放与结算对账小阶段。

### 本阶段完成内容

- 新增独立后台菜单 `广告中心`，权限为 `ad_center.manage`，放在 `装修营销` 下。
- 后台广告中心包含投放计划、广告位配置、广告主管理、合同管理、结算对账、数据报表/接入教程 6 个标签。
- 新增广告主、合同、投放计划、日统计、结算单、结算明细、官方流量主收益导入 7 张表和 migration。
- 支持自有开屏、Banner、信息流、内页植入广告，以及微信官方 banner/video/grid/插屏/激励视频配置。
- 支持固定费用、CPM、CPC、组合计费，曝光/点击/预算上限达到后自动停投。
- 新增公开广告接口，前台按 `tenantCode + pageKey + slotKey + platform` 拉取广告并回传曝光、点击、关闭、跳过、加载、错误、激励事件。
- H5/小程序新增 `AdSlotRenderer` 和 `SplashAd`，接入首页顶部、首页信息流、活动详情、课程详情、商品详情、共修信息流、我的页横幅和开屏广告。
- 微信官方流量主广告仅在小程序端渲染；H5 遇到官方广告配置不会展示。
- 修复广告事件首次写入日统计时计数字段未初始化导致的 `NaN` 入库问题，避免曝光/点击上报失败。

### 修改/新增的主要文件

- `apps/api/src/entities/ad-advertiser.entity.ts`
- `apps/api/src/entities/ad-contract.entity.ts`
- `apps/api/src/entities/ad-campaign.entity.ts`
- `apps/api/src/entities/ad-daily-stat.entity.ts`
- `apps/api/src/entities/ad-settlement.entity.ts`
- `apps/api/src/entities/ad-settlement-item.entity.ts`
- `apps/api/src/entities/ad-official-revenue-import.entity.ts`
- `apps/api/src/migrations/1782200000000-AdCenter.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/public/public.controller.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/admin/src/views/AdCenter.vue`
- `apps/admin/src/views/Layout.vue`
- `apps/mobile/src/components/AdSlotRenderer.vue`
- `apps/mobile/src/components/SplashAd.vue`
- `apps/mobile/src/pages/index/index.vue`
- `apps/mobile/src/pages/activity/detail.vue`
- `apps/mobile/src/pages/course/detail.vue`
- `apps/mobile/src/pages/mall/detail.vue`
- `apps/mobile/src/pages/community/index.vue`
- `apps/mobile/src/pages/user/my.vue`

### 运行或测试结果

- 本地执行 `npm.cmd --prefix apps/api run migration:run`：通过，广告中心 migration 已在本地库无待执行项。
- 本地浏览器打开 `http://127.0.0.1:5182/admin/ad-center`：通过，菜单和 6 个标签页正常显示。
- 本地接口闭环验证：创建 `Codex广告中心本地测试-*` 广告主、固定费用/CPM/CPC 合同与投放计划，公开广告位按 `tenantCode=qiwai-showcase` 返回正确广告。
- 本地事件与结算验证：5 次 CPM 曝光生成 `0.10` 消耗，2 次 CPC 点击生成 `3.00` 消耗并触发点击上限自动停投，固定费用结算生成 `88.00` 且可确认。
- 本地官方流量主收益导入验证：导入 `12.34` 后报表总收入为自有广告 `3.10` + 官方收入 `12.34` = `15.44`。
- 本地角色验证：`showcase_ops`、`showcase_finance` 可访问广告中心接口，`showcase_checkin` 访问广告中心接口返回 `403`。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅有既有 Rollup PURE 注释和 chunk 体积提示。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; $env:VITE_DEFAULT_TENANT_CODE='qiwai-showcase'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅有 Windows 工作区 LF/CRLF 转换警告。

### 遗留问题

- 服务器部署时需要执行新增 migration，线上后台才会出现广告中心相关表。
- 线上角色如果是历史账号，可能需要给运营/财务角色补 `ad_center.manage` 权限。
- 微信官方流量主收益以微信公众平台为准，本系统第一版只做广告位配置、事件记录和收益手动导入。

## 2026-06-25 - 营销弹窗商家角色权限补齐

### 阶段名称

试运营装修营销增强 - 演示商家运营角色营销弹窗权限补齐小阶段。

### 本阶段完成内容

- 线上角色只读登录验证发现：
  - `showcase_admin`、`showcase_ops` 登录正常且拥有 `homepage.manage`。
  - 两个运营账号缺少新增的 `marketing_popup.manage`，导致商家侧无法看到/进入营销弹窗菜单。
  - `showcase_finance` 和 `showcase_checkin` 不应拥有营销弹窗权限，保持不变。
- 修复 `scripts/seed-online-showcase.mjs` 的演示商家权限清单，新增 `marketing_popup.manage`，后续重跑 seed 会自动补齐运营角色。

### 修改/新增的主要文件

- `scripts/seed-online-showcase.mjs`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 线上只读登录接口验证：`showcase_admin`、`showcase_ops` 当前缺少 `marketing_popup.manage`，定位为历史账号权限数组未随新增权限自动回填。

### 遗留问题

- 服务器需要执行一次现有账号权限回填命令，给 `showcase_admin`、`showcase_ops` 增加 `marketing_popup.manage`。

## 2026-06-25 - 营销弹窗线上触发链路修复

### 阶段名称

试运营装修营销增强 - 营销弹窗 H5/小程序真实挂载修复与线上联调小阶段。

### 本阶段完成内容

- 右侧浏览器复查线上营销弹窗，确认原测试弹窗保存为 `平台/未归属`，带 `tenantCode=qiwai-showcase` 的公开接口不会返回，因此演示商家前台不展示。
- 在后台保留创建测试数据：`Codex联调弹窗-慢π首页`，归属 `慢π演示中心（qiwai-showcase）`，投放首页、全部平台、每次进入、优先级 20。
- 继续复查发现公开接口已正常返回商家级弹窗，但 H5 页面 DOM 未出现弹窗组件；根因是 `App.vue` 模板不适合作为 uni-app 多端页面渲染挂载点。
- 将 `MarketingPopup` 改为可自触发页面 `onShow` 的组件。
- 从 `App.vue` 移除无效弹窗模板挂载，避免误判为全局组件已渲染。
- 将营销弹窗挂载到 `PageDecorationBlocks`，覆盖首页、活动、课程、商城、共修、详情页等装修渲染链路。
- 单独在 `pages/user/my.vue` 挂载营销弹窗，覆盖“我的”页投放。

### 修改/新增的主要文件

- `apps/mobile/src/App.vue`
- `apps/mobile/src/components/MarketingPopup.vue`
- `apps/mobile/src/components/PageDecorationBlocks.vue`
- `apps/mobile/src/pages/user/my.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- `curl https://rd.chaimen666.com/api/public/marketing-popups?tenantCode=qiwai-showcase&pageKey=home&platform=h5`：通过，返回 `Codex联调弹窗-慢π首页`。
- `curl https://rd.chaimen666.com/api/public/marketing-popups?tenantCode=qiwai-showcase&pageKey=home&platform=mp-weixin`：通过，返回同一条弹窗。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; $env:VITE_DEFAULT_TENANT_CODE='qiwai-showcase'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。

### 遗留问题

- 当前修复需要提交并部署服务器后，线上 H5 才能在右侧浏览器完成最终弹出、关闭和统计回写验证。
- 小程序端需要重新构建并导入/上传新包后才能看到弹窗组件。

## 2026-06-24 - 个人中心微信资料授权重写

### 阶段名称

小程序上线准备 - 重写个人中心默认微信用户补资料小阶段。

### 本阶段完成内容

- 根据本地开发者工具截图复查：当前用户已经处于“微信已登录”状态，但个人中心仍显示默认头像和 `微信用户`，说明登录页授权流程不会再触发已有登录态用户。
- 重写“我的”页微信资料补全入口：
  - 当 `wechatBound=true` 且头像为空或昵称仍是默认 `微信用户` 时，顶部显示“授权微信头像昵称”按钮。
  - 在个人中心头部下方新增“完善微信头像和昵称”提示卡片，避免入口被“编辑资料”弱化。
  - 检测到默认微信资料时自动弹出“获取你的昵称、头像和会员权限”面板。
  - 面板头像使用微信官方 `button open-type=chooseAvatar`，昵称使用 `input type=nickname`。
  - 用户必须同时选择头像并填写/选择昵称，点击“允许”后上传头像并调用 `/public/me/profile` 同步后台会员资料。
  - 点击“稍后再说”只关闭当前面板，不修改已有用户资料。
- 更新小程序上传发布说明，明确已登录用户也会在个人中心触发头像昵称授权补全。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/my.vue`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 20:33 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `rg -n '授权微信头像昵称|完善微信头像和昵称|获取你的昵称、头像和会员权限|chooseAvatar|type="nickname"|bindchooseavatar|微信资料已同步|请选择头像并填写昵称' apps\mobile\dist\build\mp-weixin\pages\user\my.wxml apps\mobile\dist\build\mp-weixin\pages\user\my.js apps\mobile\dist\build\mp-weixin\pages\user\my.wxss apps\mobile\src\pages\user\my.vue`：通过，确认个人中心小程序产物包含官方头像昵称填写组件。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下部分文件未来可能发生 LF/CRLF 转换。

### 遗留问题

- 开发者工具对 `input type=nickname` 的候选昵称表现可能不完整，最终仍需手机微信扫码预览验证。
- 若微信开发者工具缓存了旧包，需要重新构建并重新导入 `apps/mobile/dist/build/mp-weixin`，必要时清缓存/重新编译。

### 下一阶段应继续处理的事项

- 服务器或本地重新构建小程序包后，在微信开发者工具中进入“我的”页，确认默认微信用户会弹出补资料面板。
- 选择微信头像、填写/选择昵称并点击“允许”，检查个人中心头像昵称刷新，后台会员资料同步。

## 2026-06-24 - 小程序登录页头像昵称授权面板

### 阶段名称

小程序上线准备 - 登录页接入官方头像昵称填写能力小阶段。

### 本阶段完成内容

- 继续核对微信官方文档：
  - `wx.getUserProfile` 文档仍说明点击后可弹授权窗口，但也提示用户头像昵称获取规则已调整。
  - “头像昵称填写”文档明确推荐 `button open-type=chooseAvatar` 和 `input type=nickname`，并提示开发者工具对昵称输入是 Web 模拟，部分表现需真机验证。
- 修改小程序登录页：
  - 微信登录按钮从普通 `view` 改成原生 `button`，保证点击事件更贴近微信官方示例。
  - 登录时仍先尝试 `wx.getUserProfile`；若弹窗可用且返回头像/昵称，则直接登录并同步后台。
  - 若旧资料授权不弹窗或不返回资料，立即打开“获取你的昵称、头像和登录权限”面板。
  - 面板内头像使用微信官方 `open-type=chooseAvatar`，昵称使用 `input type=nickname`，用户点击“允许”后再执行 `uni.login`、后端微信登录和头像上传。
  - 用户点击“拒绝”会关闭面板，不再静默登录成默认 `微信用户`。
- 更新小程序上传发布说明，明确开发者工具与真机表现差异、登录页授权面板和后台同步规则。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/login.vue`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 20:13 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `rg -n 'chooseAvatar|type="nickname"|获取你的昵称、头像和登录权限|auth-action|微信登录|bindchooseavatar' apps\mobile\dist\build\mp-weixin\pages\user\login.wxml apps\mobile\dist\build\mp-weixin\pages\user\login.js apps\mobile\dist\build\mp-weixin\pages\user\login.wxss apps\mobile\src\pages\user\login.vue`：通过，确认小程序产物内已有官方头像昵称填写组件。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下部分文件未来可能发生 LF/CRLF 转换。

### 遗留问题

- 开发者工具可能无法完整模拟 `input type=nickname` 的真机候选昵称体验；需要扫码到手机微信真机验证。
- 如果后续必须做成微信系统级统一授权页而不是小程序内承接面板，需要走多端身份管理完整链路：`wx.weixinMiniProgramLogin`、多端应用 AppID/Secret、服务端 `code2Verifyinfo`，当前普通小程序 `jscode2session` 后端不能直接复用。

### 下一阶段应继续处理的事项

- 服务器拉取本次提交，重新构建小程序包。
- 用微信开发者工具导入最新 `apps/mobile/dist/build/mp-weixin`，在手机微信扫码预览测试：点击微信登录、选择头像、选择/填写昵称、允许登录、后台会员资料查看昵称头像是否同步。

## 2026-06-24 - 小程序微信授权弹窗与登录服务配置补齐

### 阶段名称

小程序上线准备 - 按微信官方文档补齐授权页配置小阶段。

### 本阶段完成内容

- 阅读微信“小程序登录服务配置”和“支持的登录方式介绍”文档，确认其属于多端身份管理/小程序登录服务能力，不是普通 `wx.login` 自动返回头像昵称。
- 修复登录页头像昵称授权调用：优先使用微信原生 `wx.getUserProfile`，再兜底 `uni.getUserProfile`，避免 uni 运行时未封装该 API 时静默跳过授权弹窗。
- 新增小程序构建后补丁脚本，自动给 `mp-weixin` 构建产物补齐：
  - `app.json` 的 `miniApp.useAuthorizePage=true`。
  - `app.miniapp.json` 的 `identityServiceConfig`。
- 后台“小程序发布”上传体验版前增加同样的构建产物自检，防止服务器上传旧包或缺少官方授权页配置。
- 保持 `adaptWxLogin=false` 默认值，避免把现有 `wx.login -> jscode2session` 登录链路自动改成需要多端应用 `code2Verifyinfo` 的登录码。
- 更新小程序上传发布文档，说明微信资料弹窗、头像昵称填写能力、`app.miniapp.json` 和 `code2Verifyinfo` 的边界。

### 修改/新增的主要文件

- `apps/mobile/src/wechat-profile.ts`
- `apps/mobile/package.json`
- `scripts/patch-mobile-mp-weixin-auth.mjs`
- `apps/api/src/modules/admin/miniprogram-release.service.ts`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 19:52 +08:00。
- 首次执行 `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin` 暴露脚本路径问题：`npm --prefix apps/mobile` 下工作目录变为 `apps/mobile`，已修复为按脚本所在目录反推仓库根目录。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过；构建后输出 `app.miniapp.json`，并确认 `app.json` 含 `miniApp.useAuthorizePage=true`。
- `rg -n '"miniApp"|"useAuthorizePage"|"identityServiceConfig"|"authorizeMiniprogramType"|"adaptWxLogin"|getUserProfile|用于完善会员昵称和头像' apps\mobile\dist\build\mp-weixin apps\mobile\src\wechat-profile.ts scripts\patch-mobile-mp-weixin-auth.mjs`：通过，确认构建产物含官方授权页配置和微信原生 `getUserProfile` 调用。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 下部分文件未来可能发生 LF/CRLF 转换。

### 遗留问题

- `wx.getUserProfile` 是否返回真实昵称头像仍受微信基础库和账号授权规则限制；若微信侧不再返回真实资料，需要继续使用“编辑资料”页的 `chooseAvatar` 和 `input type=nickname`。
- 如果后续要完整接入文档里的多端身份管理 `wx.weixinMiniProgramLogin`，需要新增多端应用 AppID/Secret 配置，并在后端接 `code2Verifyinfo`，不能直接复用当前普通小程序 AppSecret。

### 下一阶段应继续处理的事项

- 本地重建小程序包并用微信开发者工具导入 `apps/mobile/dist/build/mp-weixin` 验证授权弹窗和构建配置。
- 服务器拉取本次提交后重新构建 API 与小程序包，再在后台“小程序发布”上传体验版。

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
## 2026-06-24 - 个人中心微信资料点击预填

### 阶段名称

小程序真机验收 - 个人中心微信头像昵称授权体验小阶段。

### 本阶段完成内容

- 根据微信小程序头像昵称授权规则复核个人中心逻辑：页面打开后不能静默自动获取微信头像昵称，必须由用户点击触发。
- 优化“我的”页微信资料补全弹窗：
  - 用户点击“授权微信头像昵称 / 去授权”后，先尝试调用微信资料接口预填头像昵称。
  - 用户点击“允许”时，如果头像或昵称仍缺失，会再次在点击手势内尝试读取微信资料。
  - 微信返回旧式资料时自动填入弹窗；微信不返回时，继续使用官方 `chooseAvatar` 和 `input type=nickname` 让用户选择头像、昵称。
  - 增加“获取中”状态，避免重复点击造成并发请求。
- 更新小程序上传发布说明，明确“不能无点击自动获取，只能点击后合规预填”的口径。

### 修改/新增的主要文件

- `apps/mobile/src/pages/user/my.vue`
- `docs/小程序上传发布说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 20:24 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过；构建后 `patch-mobile-mp-weixin-auth.mjs` 已补齐 `miniApp.useAuthorizePage=true` 和 `app.miniapp.json`。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `rg -n -F "获取中" apps/mobile/dist/build/mp-weixin apps/mobile/src/pages/user/my.vue`：通过，确认小程序构建产物包含按钮状态。
- `rg -n -F "已从微信读取头像昵称" apps/mobile/dist/build/mp-weixin apps/mobile/src/pages/user/my.vue`：通过，确认预填成功提示进入构建产物。
- `rg -n -F "微信未自动返回头像昵称" apps/mobile/dist/build/mp-weixin apps/mobile/src/pages/user/my.vue`：通过，确认回落提示进入构建产物。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。

### 遗留问题

- 开发者工具对 `input type=nickname` 和头像昵称候选的模拟不一定等同真机，仍需手机微信扫码预览验证。
- 微信现行规则下不能实现页面无点击自动获取头像昵称；只能在用户点击登录、授权入口或允许按钮后触发。

### 下一阶段应继续处理的事项

- 重新导入或刷新本地 `apps/mobile/dist/build/mp-weixin`，在微信开发者工具和手机微信预览中验证个人中心授权弹窗。
- 若真机点击后仍不返回旧式资料，按当前回落流程选择头像与昵称，确认后台会员列表能同步显示头像昵称。

## 2026-06-24 - 小程序登录手机号绑定与会员管理优化

### 阶段名称

小程序试运营前 - 登录、手机号绑定、个人中心和会员管理体验优化小阶段。

### 本阶段完成内容

- 新增微信手机号授权绑定链路：
  - 后端新增 `POST /public/me/phone/wechat`，使用小程序 AppID/AppSecret 换取 `access_token`，再调用微信 `wxa/business/getuserphonenumber` 获取手机号。
  - 授权手机号写入当前用户 `users.phone`，并刷新会员资料；若手机号已属于其他会员账号，返回明确提示，暂不自动合并账号。
  - 移动端新增复用组件 `WechatPhoneBindSheet`，小程序端使用官方 `button open-type="getPhoneNumber"`，H5 端引导到账号安全页。
- 优化小程序登录与个人中心：
  - 登录页调整为小程序端优先展示“微信登录”，手机号/密码/验证码入口保留为次级入口。
  - 微信登录成功但未绑定手机号时，展示手机号绑定面板；用户可绑定后继续，也可稍后进入。
  - “我的”页顶部改为会员身份卡，集中展示头像昵称、手机号状态、会员等级、积分、余额、报名和订单数据。
  - 资料页新增“微信授权绑定手机号”入口，和原账号安全的短信改绑并存。
- 接入关键动作手机号绑定：
  - 活动报名提交前检查手机号，未绑定则弹出授权面板，绑定后继续提交。
  - 课程免费加入、付费确认下单前检查手机号。
  - 商城提交订单前检查手机号。
  - 钱包余额入口读取资产前检查手机号。
- 增强后台会员管理：
  - `GET /admin/members` 保持旧数组兼容；传入 `page/pageSize` 时返回 `{ items, total, page, pageSize, summary }`。
  - 会员列表新增关键词、来源、手机号绑定、微信绑定、会员等级、活跃时间、排序和分页。
  - 页面顶部新增总会员、已绑手机号、微信绑定、小程序来源、近 7 日活跃概览。
  - 筛选条件同步到 URL，刷新后可恢复。

### 修改/新增的主要文件

- `apps/api/src/modules/public/dto.ts`
- `apps/api/src/modules/public/public.controller.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/mobile/src/api.ts`
- `apps/mobile/src/components/WechatPhoneBindSheet.vue`
- `apps/mobile/src/pages/user/login.vue`
- `apps/mobile/src/pages/user/my.vue`
- `apps/mobile/src/pages/user/profile.vue`
- `apps/mobile/src/pages/user/wallet.vue`
- `apps/mobile/src/pages/activity/register.vue`
- `apps/mobile/src/pages/course/detail.vue`
- `apps/mobile/src/pages/order/confirm.vue`
- `apps/mobile/src/pages/mall/checkout.vue`
- `apps/admin/src/views/Members.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 20:55 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅有既有 Rollup 注释和大 chunk 提示。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过；`patch-mobile-mp-weixin-auth.mjs` 正常补齐授权配置。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅有 Windows 工作区 LF/CRLF 转换提示。
- 构建产物检查：`apps/mobile/dist/build/mp-weixin/components/WechatPhoneBindSheet.wxml` 已包含 `open-type="getPhoneNumber"`。

### 遗留问题

- 本阶段未做真机微信手机号授权实测；需要在微信开发者工具和手机微信预览/体验版中点击“微信授权绑定手机号”，确认微信返回 `code` 且线上 AppSecret 配置可用。
- 微信头像昵称仍受官方限制，不能静默自动获取，仍需用户点击头像/昵称授权入口。
- 手机号冲突暂不自动合并账号，需要后台人工处理。

### 下一阶段应继续处理的事项

- 将本次提交部署到服务器后，重新构建 API、H5 和小程序包，并重启 `activity-api`。
- 在微信开发者工具导入最新 `apps/mobile/dist/build/mp-weixin`，验证微信登录、手机号授权绑定、个人中心资料展示、活动报名、课程下单、商城下单和钱包入口。
- 在后台会员管理验证分页、筛选、排序、详情抽屉和 URL 条件恢复；确认小程序绑定手机号后后台会员列表显示“手机号已绑定”。

## 2026-06-24 - 小程序动态海报生成与会员管理发布核对

### 阶段名称

小程序试运营前 - 动态详情海报按钮与会员管理线上发布核对小阶段。

### 本阶段完成内容

- 定位“生成海报也是复制链接”的原因：动态详情页原先只有 H5 DOM canvas 海报生成，小程序端没有 canvas 生成链路，点击后会回退到复制分享路径。
- 为小程序动态详情页新增隐藏 canvas，点击“生成海报”时在小程序端绘制海报图片：
  - 绘制慢π活动心得标题、动态内容、作者和可保存图片。
  - 使用 `qrcode` 的二维码矩阵直接绘制二维码，避免小程序端再走 dataURL 图片转换。
  - 小程序构建时若 `VITE_API_BASE` 是公网 HTTPS API，会把 `/pages/community/detail?id=...` 转成 `https://rd.chaimen666.com/#/pages/community/detail?id=...` 形式，复制链接和海报二维码不再优先暴露裸小程序内部路径。
  - 保留失败兜底：如果 canvas 生成失败，才复制链接并提示“海报生成失败，已复制链接”。
- 核对会员管理增强状态：本地 `apps/admin/src/views/Members.vue` 与构建产物已包含运营概览、筛选、排序、分页、来源端、微信绑定、手机号绑定和详情身份状态；线上页面若仍旧，判断为后台静态包未重新构建/发布或浏览器缓存未刷新。

### 修改/新增的主要文件

- `apps/mobile/src/pages/community/detail.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 21:30 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过；小程序产物包含 `communityPosterCanvas`、`扫码查看动态` 和 H5 公网链接生成逻辑。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释和大 chunk 提示。
- `Get-ChildItem apps/admin/dist/assets -Filter 'Members-*' | Select-String -Pattern 'summary-grid|member-filters|sourceChannel|pageSize'`：通过，本地后台构建产物确认包含会员管理增强关键字。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。

### 遗留问题

- 本阶段没有新增官方微信小程序码后端接口；海报二维码当前指向公网 H5 动态详情链接，能解决“复制裸路径/没有海报图”的体验问题。若后续要求扫码直接进入小程序指定页，需要新增后端调用微信 `getwxacodeunlimit` 并缓存小程序码图片。
- 需要在微信开发者工具重新导入最新 `apps/mobile/dist/build/mp-weixin`，真机验证长按保存海报和扫码打开 H5 动态详情。
- 线上会员管理若仍显示旧版，需要服务器重新构建并发布 `apps/admin/dist`，然后浏览器强刷或退出重登。

### 下一阶段应继续处理的事项

- 将本次提交部署到服务器后，重新构建 H5、后台和小程序包；本次只改前端，不需要 API 重启。
- 在微信开发者工具中打开动态详情，点击“生成海报”，确认弹出海报图片而不是仅复制链接。
- 打开线上后台“会员管理”，确认出现总会员、已绑手机号、微信绑定、小程序来源、近 7 日活跃概览，以及筛选、排序和分页。

## 2026-06-25 - 后台装修底部导航生效修复

### 阶段名称

小程序试运营前 - 前台装修底部导航保存与前台渲染一致性小阶段。

### 本阶段完成内容

- 根据用户截图复核“前台底部导航”装修：后台预览能看到菜单开关变化，但 H5/小程序仍可能显示旧底栏或默认 5 项。
- 修复公开装修接口的默认回退逻辑：当某个商家/平台范围已经有装修记录但全部停用时，公开接口不再误判为“无配置”并回退系统默认装修。
- 修复移动端底栏渲染：
  - 装修接口成功返回但没有 `bottom_nav` 时，不再自动补默认底栏。
  - `AppBottomNav` 在未显式传入装修模块的页面会自动读取首页全局底栏配置，避免资料页、余额页、志愿服务等页面漏用后台配置。
  - 底栏列数按启用菜单数量自适应，关闭单个菜单后剩余菜单会铺满底部。
  - 登录页改为遵守 `inner_pages.login_page.showBottomNav`，默认不显示底栏。
- 修复后台装修编辑器预览：
  - 底部导航默认配置和新增菜单都显式写入 `enabled: true`。
  - 右侧手机预览和抽屉实时预览都按启用项计算列数，禁用项不再留下空白列。
- 更新后台装修教程和二次开发说明，补充底部导航生效规则、商家范围和小程序重新构建要求。

### 修改/新增的主要文件

- `apps/api/src/modules/public/public.service.ts`
- `apps/mobile/src/decoration.ts`
- `apps/mobile/src/components/AppBottomNav.vue`
- `apps/mobile/src/styles.css`
- `apps/mobile/src/pages/user/login.vue`
- `apps/admin/src/views/HomepageBuilder.vue`
- `docs/后台装修使用教程.md`
- `docs/开发方案与二次开发说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-25 00:02 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; $env:VITE_H5_ORIGIN='https://rd.chaimen666.com'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过，并完成小程序授权配置 patch。
- `npm.cmd --prefix apps/admin run build`：通过；仍有既有 VueUse PURE 注释和大 chunk 提示。
- `npm.cmd run test:preflight-guards`：通过。
- 构建产物抽查：H5、小程序和后台产物均包含底部导航启用项、动态列数或后台预览逻辑关键字。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。

### 遗留问题

- 本地未直接操作线上后台保存“关闭课程菜单”的测试数据，避免误改用户当前线上装修；需要部署后在测试商家实际点一次保存、刷新 H5 验证。
- 小程序端仍必须重新构建并导入微信开发者工具；仅改后台配置不会改变已导入的旧小程序包。

### 下一阶段应继续处理的事项

- 将本次提交部署到服务器后，重启 API，并重新构建发布 H5、后台静态包。
- 微信开发者工具重新导入最新 `apps/mobile/dist/build/mp-weixin`，打开首页确认底栏和后台“前台底部导航”一致。
- 在后台用测试商家验证：关闭一个底栏入口、保存模块、刷新 H5，确认前台只显示启用菜单且列数铺满。

## 2026-06-24 - 小程序动态海报路径文案修正

### 阶段名称

小程序试运营前 - 动态海报不暴露内部页面路径小阶段。

### 本阶段完成内容

- 根据微信开发者工具截图复核动态海报效果，确认上一阶段虽然已经生成海报和二维码，但海报底部仍会显示 `/pages/community/detail?id=...` 这类小程序内部页面路径，用户观感不专业，扫码目标在未设置构建域名时也不够稳定。
- 将“二维码目标链接”和“海报展示文案”拆开：
  - 二维码和复制链接优先使用 `VITE_H5_ORIGIN`。
  - 未设置 `VITE_H5_ORIGIN` 时，自动从 `VITE_API_BASE` 推导同域名 H5 地址。
  - 再无构建环境变量时，当前线上包兜底使用 `https://rd.chaimen666.com`。
  - 海报底部不再绘制真实 URL 或 `/pages/...` 内部路径，只展示“扫码查看慢π动态详情，长按保存后分享给好友”。
- 保留失败兜底：二维码生成失败时仍提示复制链接，但不在海报视觉上展示内部路径。

### 修改/新增的主要文件

- `apps/mobile/src/pages/community/detail.vue`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 22:28 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; $env:VITE_H5_ORIGIN='https://rd.chaimen666.com'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `rg -n "扫码查看慢π动态详情|请点击页面复制链接分享动态详情|rd\\.chaimen666\\.com|VITE_H5_ORIGIN|/pages/community/detail" apps/mobile/dist/build/mp-weixin/pages/community/detail.js apps/mobile/src/pages/community/detail.vue`：通过，确认小程序构建产物中二维码目标为公网 H5 链接，海报展示文案不再直接绘制内部路径。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。

### 遗留问题

- 当前二维码仍是普通 H5 链接二维码，不是微信官方小程序码；扫码会进入 H5 动态详情。若后续要扫码直接打开小程序详情页，需要新增后端调用微信 `getwxacodeunlimit` 并缓存图片。
- 需要重新构建并导入最新 `apps/mobile/dist/build/mp-weixin`，在微信开发者工具或真机预览中点击“生成海报”复验。

### 下一阶段应继续处理的事项

- 服务器拉取本次提交后，构建小程序包时同时设置 `VITE_H5_ORIGIN=https://rd.chaimen666.com` 和 `VITE_API_BASE=https://rd.chaimen666.com/api`。
- 真机微信预览中长按保存海报、扫码回流 H5 动态详情，确认视觉和链路都符合上线试运营要求。

## 2026-06-24 - 后台装修教程与小程序海报默认取图修复

### 阶段名称

小程序试运营前 - 后台装修说明与动态海报图片展示小阶段。

### 本阶段完成内容

- 根据后台装修页截图补充“装修教程”入口：
  - 在后台“前台全局装修”工具条新增“装修教程”按钮。
  - 弹窗解释页面选择、商家范围、发布前预览、复制链接、应用模板、复制页面配置、恢复上次发布版本、恢复默认装修和刷新分别是什么意思。
  - 明确平台默认装修和商家独立装修的区别，提示“应用模板/复制页面配置/恢复默认装修”会替换当前页面模块。
- 新增文档 `docs/后台装修使用教程.md`：
  - 面向运营说明后台装修入口、平台默认装修、商家独立装修、红框工具条、推荐操作流程、模块含义、上线前检查清单和风险提醒。
- 修复小程序动态详情海报默认不显示动态图片的问题：
  - 海报取图优先级改为“动态首图 -> 关联活动封面 -> 占位图”。
  - 小程序端绘制海报前先用 `uni.getImageInfo` 把远程/上传图片转成可绘制的本地路径，再用 canvas `drawImage` 绘制。
  - 支持 `/uploads/...` 相对路径自动转成当前 H5 域名绝对路径。
  - 图片加载失败时仍回退占位图，不影响海报生成和二维码绘制。
- 同步更新 `docs/开发方案与二次开发说明.md` 升级记录。

### 修改/新增的主要文件

- `apps/mobile/src/pages/community/detail.vue`
- `apps/admin/src/views/HomepageBuilder.vue`
- `docs/后台装修使用教程.md`
- `docs/开发方案与二次开发说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 23:29 +08:00。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; $env:VITE_H5_ORIGIN='https://rd.chaimen666.com'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过；小程序产物包含 `getImageInfo`、`drawImage`、海报文案和二维码绘制逻辑。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅有既有 Rollup PURE 注释和大 chunk 提示。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 线上接口抽查：`https://rd.chaimen666.com/api/public/community/posts/18?tenantCode=qiwai-showcase` 返回动态首图和活动封面，符合本次海报取图逻辑。

### 遗留问题

- 当前演示动态首图来自 `images.unsplash.com`。微信小程序正式版若没有把第三方域名加入合法 `downloadFile` 域名，`getImageInfo` 可能加载失败并回退占位图；正式运营建议用户上传图片走本系统 `/uploads/community-posts/`，或后续增加图片代理/转存能力。
- 本阶段没有在微信开发者工具里做真实点击验证，需要重新导入最新 `apps/mobile/dist/build/mp-weixin` 后点击动态详情“生成海报”复验。
- 后台“装修教程”已进入本地构建产物，线上要重新构建发布后台静态包后才能看到。

### 下一阶段应继续处理的事项

- 服务器拉取本次提交后，重新构建后台和小程序包。
- 微信开发者工具导入最新 `apps/mobile/dist/build/mp-weixin`，打开 `/pages/community/detail?id=18&tenantCode=qiwai-showcase`，确认海报顶部显示动态首图或活动封面。
- 打开线上后台“前台全局装修”，确认工具条出现“装修教程”按钮，弹窗说明可正常阅读。

## 2026-06-24 - 后台前台装修跨商家复制

### 阶段名称

运营效率增强 - 前台装修跨商家复制小阶段。

### 本阶段完成内容

- 在后台“前台全局装修”工具条新增“跨商家复制”按钮，仅平台超管可见。
- 新增“跨商家复制”弹窗：
  - 支持选择来源商家和目标商家。
  - 支持复制“当前页面”：来源页面和目标页面可分别选择。
  - 支持复制“全部页面”：按页面 key 逐页复制来源商家有装修模块的页面。
  - 执行前显示复制计划并二次确认，避免来源和目标选反。
  - 来源商家和目标商家相同时禁止执行；同商家内页面复制继续使用既有“复制页面配置”。
  - 全部页面模式下，来源为空的页面会跳过，不清空目标商家已有装修。
  - 如果目标商家正好是当前正在编辑的范围，复制完成后自动刷新当前列表。
- 同步更新 `docs/后台装修使用教程.md`，增加“从其他商家复制装修”的操作步骤和风险提醒。
- 同步更新 `docs/开发方案与二次开发说明.md` 升级记录。

### 修改/新增的主要文件

- `apps/admin/src/views/HomepageBuilder.vue`
- `docs/后台装修使用教程.md`
- `docs/开发方案与二次开发说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-24 23:45 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅有既有 Rollup PURE 注释和大 chunk 提示。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 构建产物检查：`apps/admin/dist/assets` 中已包含“跨商家复制”、`executeCrossTenantCopy` 和“来源为空的页面会跳过”等关键字。

### 遗留问题

- 本阶段复用现有装修接口，没有新增后端批量复制接口；复制多个页面时会按页面逐步删除目标模块再创建新模块。若后续商家数量和页面模块大幅增长，可再升级为后端事务型批量接口。
- 本阶段未在右侧浏览器进行真实点击复制，避免误覆盖线上演示商家的装修数据；上线后建议先用两个测试商家验证一次。

### 下一阶段应继续处理的事项

- 服务器拉取本次提交后，重新构建并发布后台静态包，无需 API 重启。
- 使用平台超管进入“前台全局装修”，点击“跨商家复制”，用两个测试商家验证当前页面复制和全部页面复制。
- 复制后打开目标商家的 H5 链接，确认页面模块、顺序、图片和底部导航符合预期。

## 2026-06-25 - 小程序装修租户与底栏重复修复

### 阶段名称

小程序试运营前 - 装修配置在小程序开发工具不生效排查与修复小阶段。

### 本阶段完成内容

- 根据用户截图复核：H5 已显示慢π演示中心的 4 个底栏入口，但小程序开发工具裸打开 `pages/index/index` 仍显示旧的“书院/课程/共修/活动/我的”。
- 线上接口对比确认：
  - `https://rd.chaimen666.com/api/public/homepage?tenantCode=qiwai-showcase` 返回慢π演示中心商家装修，底栏中“课程”为停用状态。
  - `https://rd.chaimen666.com/api/public/homepage` 不带租户时返回平台默认装修，且平台范围历史上残留两个 `bottom_nav` 模块，旧模块排在前面。
- 移动端新增 `VITE_DEFAULT_TENANT_CODE` 支持：小程序/ H5 无路由租户、无本地租户缓存时，可按构建环境默认进入指定商家。
- 移动端装修消费侧新增全局单例去重：`bottom_nav`、`my_page`、`inner_pages` 如果有重复配置，只保留接口排序中最后一份，避免旧模块抢先显示。
- API 公开装修输出层同步去重，减少旧小程序包或缓存页面读到重复全局装修模块的概率。
- 更新后台装修教程和二次开发说明，补充小程序默认商家构建命令、清缓存重编译提示和重复底栏处理规则。

### 修改/新增的主要文件

- `apps/mobile/src/api.ts`
- `apps/mobile/src/decoration.ts`
- `apps/api/src/modules/public/public.service.ts`
- `docs/后台装修使用教程.md`
- `docs/开发方案与二次开发说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 线上接口抽查：不带 `tenantCode` 的首页返回平台默认装修且存在历史重复底栏；带 `tenantCode=qiwai-showcase` 的首页返回慢π演示中心装修和 4 个有效底栏入口。
- `npm.cmd --prefix apps/api run build`：通过。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; $env:VITE_H5_ORIGIN='https://rd.chaimen666.com'; $env:VITE_DEFAULT_TENANT_CODE='qiwai-showcase'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过，并完成小程序授权配置 patch。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 小程序产物抽查：`apps/mobile/dist/build/mp-weixin/api.js` 已包含 `qiwai-showcase` 默认租户；`decoration.js` 已包含 `bottom_nav/my_page/inner_pages` 去重逻辑；旧“书院”未作为底栏标签残留。

### 遗留问题

- 微信开发者工具已经打开的旧包不会自动变化，必须重新构建小程序包，并在开发者工具中“清缓存 -> 清除全部缓存”后重新编译。
- 平台默认装修历史上仍有旧底栏数据；本次通过前端/API 去重规避，后续可在后台人工删除旧模块，让运营列表更清爽。

### 下一阶段应继续处理的事项

- 部署本次提交后，在服务器端带 `VITE_DEFAULT_TENANT_CODE=qiwai-showcase` 重新构建小程序包。
- 微信开发者工具导入最新 `apps/mobile/dist/build/mp-weixin`，清缓存后打开首页，确认顶部和底栏均来自慢π演示中心。
- 如果仍显示旧内容，检查开发工具是否导入了错误目录，必须是项目下的 `apps/mobile/dist/build/mp-weixin`。

## 2026-06-25 - DIY 装修系统第一阶段优化

### 阶段名称

上线试运营前 - 后台前台全局装修三栏编辑器与生效检测小阶段。

### 本阶段完成内容

- 将后台“前台全局装修”从原来的“模块列表 + 抽屉编辑”升级为更接近运营 DIY 的三栏体验：
  - 左侧继续保留模块添加、模块列表、排序、复制、删除、启停。
  - 中间手机预览支持点击已保存模块直接打开右侧配置。
  - 右侧新增“模块配置”面板，按内容、样式、跳转、数据源、兼容性分组。
- 新增链接选择器：
  - 支持系统页面、详情页、外部 H5 三类链接。
  - 活动详情、课程详情、商品详情、动态详情只需要输入 ID，自动生成 `/pages/.../detail?id=...` 路径。
  - 右侧跳转标签里不再要求运营手写路径。
- 新增装修生效检测：
  - 检查重复底部导航/我的页/内页布局、底部导航超过 5 项、图片广告缺图片、非 HTTPS 图片、空跳转、无法识别路径、小程序外链业务域名风险、平台默认装修/指定商家范围风险。
  - 检测结果分为错误和提醒，并支持定位到对应模块。
- 保留现有 `homepage_sections` 数据结构和后台装修接口，没有新增 migration。
- 更新后台装修教程，补充三栏编辑器、链接选择器、生效检测和上线前检查说明。
- 更新二次开发说明升级记录。

### 修改/新增的主要文件

- `apps/admin/src/views/HomepageBuilder.vue`
- `docs/后台装修使用教程.md`
- `docs/开发方案与二次开发说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-25 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；仅有既有 Rollup PURE 注释和大 chunk 提示。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; $env:VITE_H5_ORIGIN='https://rd.chaimen666.com'; $env:VITE_DEFAULT_TENANT_CODE='qiwai-showcase'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过，并完成小程序授权配置 patch。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。
- 右侧浏览器本地验证：
  - 打开 `http://127.0.0.1:5174/admin/homepage-builder?pageKey=home`，页面可进入后台装修页。
  - 确认“生效检测”和“模块配置”区域可见。
  - 点击模块列表第一条模块，右侧配置面板出现“内容 / 样式 / 跳转 / 数据源 / 兼容性”标签和“保存模块”按钮。
  - 点击“生效检测”，弹出“装修生效检测”结果，并能提示当前正在编辑平台默认装修的范围风险。
  - 在“跳转”标签打开链接选择器，确认系统页面、详情页、外部 H5 三类入口可见。
  - 切换到详情页并输入 ID `18`，确认能生成详情页路径。

### 遗留问题

- 本阶段仍是“立即保存到 live 配置”，没有引入草稿/发布/版本回滚表；第二阶段再做版本化。
- 详情页链接选择器当前采用“输入 ID 自动生成路径”，未直接拉取活动/课程/商品/动态列表做可搜索选择；后续可增强为真正的数据选择器。
- 手机预览是后台模拟预览，不能完全替代 H5/小程序真实端渲染；上线前仍需打开前台实际页面和微信开发者工具复验。
- 小程序端装修内容如果依赖静态包默认商家或页面包逻辑，仍需重新构建并上传体验版/正式版。

### 下一阶段应继续处理的事项

- 第二阶段开发装修模板库、草稿发布、版本历史和一键回滚。
- 将详情链接选择器升级为可搜索活动、课程、商品、动态数据的选择弹窗。
- 将生效检测结果接入“保存前提醒”或“发布前检查”，避免运营带错误项上线。

## 2026-06-25 - DIY 装修系统第二阶段实现

### 阶段名称

上线试运营前 - 后台前台全局装修版本历史与模板库小阶段。

### 本阶段完成内容

- 在后台前台装修体系上新增两张数据库旁路表：
  - `homepage_decoration_versions`：保存当前页面、当前范围的装修快照，支持版本历史和回滚。
  - `homepage_decoration_templates`：保存可复用模板，支持模板库应用和删除。
- 后端新增装修版本/模板接口：
  - 保存当前版本、查看版本历史、恢复版本、删除版本。
  - 保存当前页面为模板、查看模板库、应用模板、删除模板。
- 后端继续沿用 `homepage_sections` 作为前台 live 配置，版本和模板只保存快照，不改变公开读取链路。
- 后台“前台全局装修”新增：
  - “保存版本”
  - “版本历史”
  - “保存为模板”
  - “模板库”
  - 版本历史弹窗支持恢复、删除和刷新。
  - 模板库弹窗支持保存当前页面为模板、应用、删除和刷新。
- 文档同步：
  - 更新《后台装修使用教程》，补充版本历史、模板库和操作建议。
  - 更新《开发方案与二次开发说明》的升级记录。

### 修改/新增的主要文件

- `apps/api/src/entities/homepage-decoration-version.entity.ts`
- `apps/api/src/entities/homepage-decoration-template.entity.ts`
- `apps/api/src/migrations/1782060000000-HomepageDecorationVersionsAndTemplates.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.module.ts`
- `apps/api/src/modules/admin/admin-permissions.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/dto.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/admin/src/views/HomepageBuilder.vue`
- `docs/后台装修使用教程.md`
- `docs/开发方案与二次开发说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-25 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅有既有 Rollup PURE 注释和 chunk 提示。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅提示 Windows 工作区 LF/CRLF 转换警告。

### 遗留问题

- 版本历史和模板库尚未做右侧浏览器的真实点击验收，需确认弹窗打开、保存、恢复、删除和应用都能正常走通。
- `homepage_decoration_versions` / `homepage_decoration_templates` 需要在服务器上跑对应 migration，才能在生产库里真正可用。

### 下一阶段应继续处理的事项

- 在右侧浏览器打开后台装修页，逐项验收“保存版本 / 版本历史 / 保存为模板 / 模板库”。
- 如果浏览器验收发现问题，优先在本轮范围内修复后再回归。
- 验收通过后，再补最终上线验收记录。

## 2026-06-25 - DIY 装修系统第二阶段浏览器验收完成

### 阶段名称

上线试运营前 - 后台前台全局装修版本历史与模板库浏览器验收小阶段。

### 本阶段完成内容

- 在本地 Docker API 上执行装修版本/模板 migration，创建 `homepage_decoration_versions` 与 `homepage_decoration_templates`。
- 重建本地 `activity-api` 容器，使后台开发页命中新接口而不是旧 404 服务。
- 在右侧浏览器完成后台装修页真交互验收：
  - 保存装修版本。
  - 打开版本历史。
  - 恢复刚保存的版本。
  - 删除刚保存的版本。
  - 保存当前页面为模板。
  - 打开模板库。
  - 应用刚保存的模板。
  - 删除刚保存的模板。
- 验证本轮测试数据已回收，数据库中不再残留本阶段创建的测试版本和测试模板。

### 修改/新增的主要文件

- `apps/api/src/entities/homepage-decoration-version.entity.ts`
- `apps/api/src/entities/homepage-decoration-template.entity.ts`
- `apps/api/src/migrations/1782060000000-HomepageDecorationVersionsAndTemplates.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.module.ts`
- `apps/api/src/modules/admin/admin-permissions.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/dto.ts`
- `apps/api/src/modules/app.module.ts`
- `apps/admin/src/views/HomepageBuilder.vue`
- `docs/后台装修使用教程.md`
- `docs/开发方案与二次开发说明.md`
- `DEVELOPMENT_LOG.md`

### 运行或测试结果

- 验证时间：2026-06-25 08:13 +08:00。
- `npm.cmd --prefix apps/api run migration:run`：通过；已创建两张装修版本/模板表。
- `docker compose -p activity-registration -f docker-compose.yml up -d --build api`：通过；本地 `activity-api` 已切到当前代码。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `git diff --check`：通过，仅有 Windows 工作区 LF/CRLF 警告。
- 浏览器验收结果：
  - 5177 端口后台能正确代理到 `http://127.0.0.1:18080`。
  - 商家 `tenantId=3` 的装修页可正常打开。
  - 版本历史可见新保存版本，恢复后页面仍为 1 个模块。
  - 刚创建的版本可被删除，版本历史回到空状态。
  - 模板库可保存模板、显示模板、应用模板并删除模板。
  - 浏览器控制台未出现本轮新增的 5177 前端 error/warn。

### 遗留问题

- 本轮浏览器验收过程中，旧的 5174 dev 进程仍指向 `VITE_DEV_API_PROXY=http://127.0.0.1:3100`，会报历史 500；本轮已改用 5177 作为验收端口。
- 装修页仍会显示部分历史烟测模块，这属于既有本地测试数据，不影响版本/模板链路验收。

### 下一阶段应继续处理的事项

- 服务器端同步这次提交后，重新构建并发布后台静态包。
- 如需继续扩展 DIY 装修能力，再进入模板库管理、发布版本库、历史回滚增强等后续阶段。

## 2026-06-25 - UI 模板套装与营销弹窗开发完成

### 阶段名称

试运营装修营销增强 - UI 模板套装、五行暖金特色模板与营销弹窗投放小阶段。

### 本阶段完成内容

- 后台前台全局装修新增 `UI 模板套装` 入口，支持整套应用和只套视觉风格。
- 新增 `五行暖金商业版` 特色模板，保留慢π默认风格不变。
- 新增独立后台菜单 `营销弹窗`，支持多条弹窗投放、筛选、预览、启停、删除和统计展示。
- 新增营销弹窗后端表、管理接口、公开接口和曝光/点击/关闭计数接口。
- H5/小程序端新增全局 `MarketingPopup` 组件，按当前页面、平台、商家和频次展示弹窗。
- 增强装修模块移动端渲染，使五行暖金模板的卡片底色、宫格底色、圆角、间距等 layout 字段生效。

### 修改/新增的主要文件

- `apps/api/src/entities/marketing-popup.entity.ts`
- `apps/api/src/migrations/1782070000000-MarketingPopups.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/public/public.controller.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/admin/src/views/MarketingPopups.vue`
- `apps/admin/src/views/HomepageBuilder.vue`
- `apps/mobile/src/components/MarketingPopup.vue`
- `apps/mobile/src/components/PageDecorationBlocks.vue`

### 运行或测试结果

- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅有既有 Rollup PURE 注释和 chunk 体积提示。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; $env:VITE_DEFAULT_TENANT_CODE='qiwai-showcase'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过。
- `npm.cmd run test:preflight-guards`：通过。
- `git diff --check`：通过；仅有 Windows 工作区 LF/CRLF 转换警告。

### 遗留问题

- 本阶段尚未在右侧浏览器做真实创建弹窗、前台弹出、统计回写的交互验收。
- `marketing_popups` 需要在服务器执行 migration 后才会在线上可用。
- 系统 UI 模板定义本轮仍在装修页内维护，后续可继续抽成独立模板模块以降低 `HomepageBuilder.vue` 体积。

### 下一阶段应继续处理的事项

- 在本地或线上后台创建一条 `五行暖金通知` 弹窗，验证 H5 首页首次弹出、关闭频次和点击跳转。
- 服务器部署时执行新增 migration，并重新构建发布 API、后台、H5 与小程序包。
# 2026-07-01 - 上线整改 P0/P1 短信与签到页修复

## 阶段名称

上线整改第一阶段 - 真实短信发送能力与后台签到核销响应式修复。

## 本阶段完成内容

- 在通知发送服务中新增腾讯云短信真实发送适配 `tencent-cloud-sms`，通过腾讯云官方 SDK 调用 `SendSms`。
- H5 验证码发送继续使用原接口 `POST /public/auth/h5-code`，但现在会读取后台系统设置中的短信服务商、Key、Secret、签名、模板和 `SmsSdkAppId`。
- 生产环境禁止 `mock-sms` 假成功；`aliyun-sms` 返回明确未适配提示，避免静默失败。
- 新增后台测试短信接口 `POST /admin/settings/sms/test`，权限归属 `operation_settings.manage`，发送结果写入验证码日志。
- 后台系统设置页新增“短信 AppID”和“发送测试短信”入口，可跳转验证码日志查看 provider、messageId 和失败原因。
- 修复后台窄屏布局：小于 768px 时侧边栏转为顶部横向菜单，主内容占满视口，顶部按钮允许换行。
- 重做签到核销页现场模式布局：大号输入框、扫码/核销/清空按钮、最近核销活动/用户/手机号/时间展示，窄屏下按钮纵向排列。

## 修改/新增的主要文件

- `apps/api/src/modules/v1/notification-provider.service.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/admin.module.ts`
- `apps/api/src/modules/admin/admin-permissions.ts`
- `apps/api/src/modules/admin/dto.ts`
- `apps/api/src/entities/operation-setting.entity.ts`
- `apps/api/src/migrations/1782880000000-OperationSettingSmsSdkAppId.ts`
- `apps/api/src/shared/launch-config.ts`
- `apps/api/src/shared/config-validation.ts`
- `apps/admin/src/views/SystemSettings.vue`
- `apps/admin/src/views/Layout.vue`
- `apps/admin/src/views/CheckIn.vue`
- `apps/api/package.json`
- `apps/api/package-lock.json`

## 运行或测试结果

- 验证时间：2026-07-01 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 Rollup PURE 注释和 chunk 体积提示。

## 遗留问题

- 腾讯云短信真实发送需要运营在后台填入已审核通过的 `SmsSdkAppId`、短信签名和模板 ID；本地未使用真实腾讯云凭证发送。
- 新增 `smsSdkAppId` 字段需要服务器执行 migration 后才能保存。
- 尚未完成右侧浏览器 375px/768px/1280px 签到页截图验收。

## 下一阶段应继续处理的事项

- 恢复店铺/代理/店铺财务演示账号，并补角色权限验收脚本和文档。
- 继续营销弹窗生效检测、广告图片强校验和会员管理增强。

# 2026-07-01 - 上线整改 P1 店铺/代理演示账号恢复

## 阶段名称

上线整改第二阶段 - 店铺/代理/店铺财务演示账号幂等恢复与角色验收脚本。

## 本阶段完成内容

- 更新线上演示商家 seed 脚本，新增并幂等重置：
  - `showcase_store_owner`
  - `showcase_agent_owner`
  - `showcase_store_finance`
- 账号密码继续从 `SHOWCASE_PASSWORD` 环境变量读取，脚本和公开文档不写明文密码。
- 为店铺负责人分配授权店铺的商品、订单、售后、物流、商城财务和统计权限。
- 为店铺财务分配店铺订单、售后、财务、支付、结算和统计权限，不包含 `mall.product.manage`。
- 为代理负责人分配订单查看、财务查看、代理结算和商城订单/财务查看权限，不包含商品编辑权限。
- 默认商城店铺授权扩展到新增账号，店铺负责人为 `manager`，店铺财务为 `finance`，代理负责人为 `viewer`。
- 新增 `scripts/verify-online-showcase-roles.mjs`，用于线上部署后验证三类账号登录、允许访问页面和禁止访问页面。
- 更新 `docs/role-operation-guide.md`，补充线上演示账号清单和每周权限抽查要求。

## 修改/新增的主要文件

- `scripts/seed-online-showcase.mjs`
- `scripts/verify-online-showcase-roles.mjs`
- `docs/role-operation-guide.md`
- `DEVELOPMENT_LOG.md`

## 运行或测试结果

- 验证时间：2026-07-01 +08:00。
- `node --check scripts/seed-online-showcase.mjs`：通过。
- `node --check scripts/verify-online-showcase-roles.mjs`：通过。
- `npm.cmd --prefix apps/api run test -- admin-permissions`：通过，8 个权限映射用例全部通过。

## 遗留问题

- 新脚本尚未在线上服务器执行；执行后才能真正重置线上账号密码并补齐授权。
- 店铺/代理账号仍需右侧浏览器真实登录验收，并保留测试数据。

## 下一阶段应继续处理的事项

- 实现营销弹窗生效检测和前台预览辅助，解决运营“不知道为什么不弹”的问题。
- 继续广告图片强校验和会员管理增强。

# 2026-07-01 - 上线整改 P1 营销弹窗生效检测

## 阶段名称

上线整改第三阶段 - 营销弹窗生效检测、未命中原因解释与前台预览辅助。

## 本阶段完成内容

- 新增后台接口 `GET /admin/marketing-popups/effective-check`，支持按弹窗 ID、商家、页面和平台模拟公开投放命中。
- 检测结果返回：
  - 是否命中。
  - 当前会被公开接口返回的弹窗摘要。
  - 每条弹窗的未命中原因：停用、未开始、已过期、商家不匹配、页面不匹配、平台不匹配。
  - 风险提醒：图片非 HTTPS/非 `/uploads/`、小程序端按钮配置普通外链等。
- 后台“营销弹窗”列表新增“生效检测”入口：
  - 工具条可检测当前页面/平台整体命中情况。
  - 每行可检测单条弹窗为什么不弹。
  - 检测弹窗支持选择商家、页面、平台，展示命中结果和原因。
- 后台增加“前台预览”和“清频次缓存”辅助：
  - 前台预览打开带时间戳参数的 H5 首页。
  - 清频次缓存会移除当前浏览器 `marketing_popup:*` 频次缓存，便于反复测试。
- 补齐营销弹窗投放页面枚举 `mall_product_detail`，便于商品详情页后续投放和检测。
- 保持前端 `MarketingPopup` 一次只展示最高优先级一条的规则不变。

## 修改/新增的主要文件

- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/admin/src/views/MarketingPopups.vue`
- `DEVELOPMENT_LOG.md`

## 运行或测试结果

- 验证时间：2026-07-01 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse PURE 注释和 chunk 体积提示。

## 遗留问题

- 本阶段尚未在右侧浏览器创建/启用真实弹窗并验证 H5 首页弹出与统计回写。
- “今日频次已拦截”目前由前端本地缓存控制，后台接口无法读取用户当前浏览器缓存，只能提供清缓存辅助。
- 图片和跳转异常当前为风险提醒，不改变既有公开投放规则；若后续希望强制拦截，需要另起策略变更。

## 下一阶段应继续处理的事项

- 继续实现广告中心图片强校验、兜底图和公开接口 `resolvedImageUrl`。
- 后续浏览器验收时补测营销弹窗生效检测、前台预览、清缓存和 H5 实际弹出。

# 2026-07-01 - 上线整改 P2 广告图片校验与兜底图

## 阶段名称

上线整改第四阶段 - 广告中心自有广告启用强校验、默认广告图兜底与前台展示字段增强。

## 本阶段完成内容

- 后端广告计划保存逻辑增强：
  - 自有广告可保存草稿/停用状态。
  - 自有广告启用时必须有标题、跳转链接、可用广告图或商家默认广告图。
  - 广告计划图仅允许 `https://` 或 `/uploads/` 地址。
  - 官方流量主广告仍按原规则配置，不强制自有广告图。
- 公开广告接口 `GET /public/ad-slots` 新增 `resolvedImageUrl`：
  - 优先广告计划图。
  - 其次读取商家配置中的 `defaultAdImageUrl`、`defaultShareImageUrl`、`shareImageUrl`。
  - 最后使用系统 HTTPS 占位图。
  - 原 `imageUrl` 字段保留兼容旧前端。
- H5/小程序广告组件 `AdSlotRenderer` 优先使用 `resolvedImageUrl`，旧字段继续兼容。
- 后台广告中心增加启用前本地提示：
  - 缺标题、缺图、图片地址异常、缺跳转链接会直接提示。
  - 平台超管可基于商家设置判断是否存在默认广告图。
  - 列表 warning 能提示“使用商家默认广告图兜底”。

## 修改/新增的主要文件

- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/public/public.service.ts`
- `apps/admin/src/views/AdCenter.vue`
- `apps/mobile/src/components/AdSlotRenderer.vue`
- `DEVELOPMENT_LOG.md`

## 运行或测试结果

- 验证时间：2026-07-01 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `npm.cmd --prefix apps/admin run build`：第一次因前端校验函数类型过窄失败，已修复后复跑通过；仅保留既有 VueUse PURE 注释和 chunk 体积提示。

## 遗留问题

- 商家默认广告图字段当前采用兼容读取 `tenant.settings.defaultAdImageUrl/defaultShareImageUrl/shareImageUrl`，后台暂未新增专门表单字段。
- 系统兜底图使用外部 HTTPS 占位图；正式品牌上线前建议替换成自有 OSS/CDN 默认广告图。
- 尚未在右侧浏览器创建缺图广告并验证启用拦截、有图广告前台展示。

## 下一阶段应继续处理的事项

- 继续会员管理增强：快捷筛选、详情时间线和批量打标签。
- 后续浏览器验收时补测广告缺图启用拦截、有图广告 H5 展示和 `resolvedImageUrl` 返回。

# 2026-07-01 - 上线整改 P2 会员管理增强

## 阶段名称

上线整改第五阶段 - 会员管理快捷筛选、批量标签与用户时间线。

## 本阶段完成内容

- 后台会员列表筛选增强：
  - 新增标签筛选。
  - 新增快捷筛选：已/未绑定手机号、已/未绑定微信、近 7 日活跃、近 30 日未活跃、有/无消费、有/无报名。
  - 继续保持 `GET /admin/members` 旧数组模式兼容；带 `page/pageSize` 时仍返回分页对象。
- 会员详情增强：
  - 返回用户标签 `tags`。
  - 返回统一 `timeline`，覆盖登录、报名、订单付款、核销、退款、积分变动、余额变动、评价。
  - 后台详情抽屉新增标签展示和“用户时间线”标签页。
- 新增批量打标签能力：
  - 后端新增 `POST /admin/tags/bulk-members`。
  - 前端会员表格支持多选后批量添加标签。
  - 重复标签自动跳过，完成后可直接按该标签筛选会员。
- 保留原有会员编辑、重置密码、余额调整、等级管理能力。

## 修改/新增的主要文件

- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/admin/src/views/Members.vue`
- `DEVELOPMENT_LOG.md`

## 运行或测试结果

- 验证时间：2026-07-01 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse PURE 注释和 chunk 体积提示。

## 遗留问题

- 批量标签和时间线尚未在右侧浏览器做真实点击验收。
- 时间线第一版为运营视角聚合，不做复杂关联详情跳转；后续可增加点击跳转订单/报名详情。
- 标签颜色沿用现有 `default/success/warning/danger` 简化枚举，未新增标签字典管理。

## 下一阶段应继续处理的事项

- 实现版本信息可观测：Admin/H5 静态版本文件、构建元信息和后台版本检查卡片。
- 实现首页装修“上线简洁版模板”入口。

# 2026-07-01 - 上线整改 P2 版本可观测与上线简洁版模板

## 阶段名称

上线整改第六阶段 - 三端版本信息可观测、静态版本文件发布和首页上线简洁版模板。

## 本阶段完成内容

- 新增静态版本写入脚本，Admin/H5 构建完成后自动生成 `version.json`，包含端类型、Git commit 和 buildTime。
- Admin/H5 构建脚本接入静态版本写入：
  - Admin 输出 `apps/admin/dist/version.json`。
  - H5 输出 `apps/mobile/dist/build/h5/version.json`。
- 后台系统设置的部署健康区新增三端版本卡片：
  - API commit/buildTime 来自 `/api/health/ready`。
  - Admin 静态包来自 `/admin/version.json`。
  - H5 静态包来自 `/version.json`。
  - 三端 commit 不一致时显示提醒，但不阻断运行。
- 发布脚本增强：静态包复制发布时同步发布 Admin/H5 的 `version.json`，并在备份中保留旧版本文件。
- 前台全局装修新增“上线简洁版”内置模板，模块控制为搜索、主视觉、公告、精选活动、商城广告入口、课程入口、动态入口和底部导航。
- 装修工具条新增“应用上线简洁版模板”入口，应用前会自动保存当前装修版本，便于回滚。
- `UI 模板套装` 同步展示“上线简洁版”，支持预览和整套应用。

## 修改/新增的主要文件

- `scripts/write-static-version.mjs`
- `scripts/publish-webroot.mjs`
- `apps/admin/package.json`
- `apps/mobile/package.json`
- `apps/admin/src/views/SystemSettings.vue`
- `apps/admin/src/views/HomepageBuilder.vue`
- `DEVELOPMENT_LOG.md`

## 运行或测试结果

- 验证时间：2026-07-01 +08:00。
- `npm.cmd --prefix apps/admin run build`：通过；生成 `apps/admin/dist/version.json`。
- `npm.cmd --prefix apps/mobile run build:h5`：通过；生成 `apps/mobile/dist/build/h5/version.json`。
- `node --check scripts/write-static-version.mjs`：通过。
- `node --check scripts/publish-webroot.mjs`：通过。
- `git diff --check`：通过；仅保留 Windows 工作区 LF/CRLF 转换提示。
- 本地生成版本文件示例：
  - Admin commit：`a6fffcb1`
  - H5 commit：`a6fffcb1`

## 遗留问题

- 上线简洁版模板尚未在右侧浏览器执行真实应用，避免在未确认前覆盖线上装修；后续浏览器验收时只做预览或在测试商家范围内应用。
- 线上部署后需要重新构建并发布 Admin/H5，后台系统设置页才能读到最新 `/admin/version.json` 和 `/version.json`。

## 下一阶段应继续处理的事项

- 执行最终构建与静态预检：API、Admin、H5、小程序包、preflight guards 和 diff 检查。
- 通过后进入右侧浏览器主流程验收，覆盖 H5、后台多角色、签到、营销弹窗、广告中心和会员管理。

# 2026-07-01 - 上线整改最终构建与静态预检

## 阶段名称

上线整改第七阶段 - API/Admin/H5/小程序构建与预检守卫全量验证。

## 本阶段完成内容

- 按上线整改测试计划执行 API、后台、H5、小程序包构建。
- 小程序构建继续导出到 `apps/mobile/dist/build/mp-weixin`，并完成授权配置 patch。
- 修复构建产物预检脚本对 `build:h5` 的旧格式写死判断，允许 H5 构建后追加静态版本文件写入，同时强制检查 Admin/H5 都接入 `write-static-version.mjs`。
- 复跑全量 preflight guards，确认版本写入改动没有破坏上线守卫。

## 修改/新增的主要文件

- `scripts/preflight-build-artifact-guard.mjs`
- `DEVELOPMENT_LOG.md`

## 运行或测试结果

- 验证时间：2026-07-01 +08:00。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse/Rollup PURE 注释和 chunk 体积提示。
- `npm.cmd --prefix apps/mobile run build:h5`：通过。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; $env:VITE_DEFAULT_TENANT_CODE='qiwai-showcase'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过，并完成 `patch-mobile-mp-weixin-auth.mjs`。
- `npm.cmd run test:preflight-guards`：通过，全部上线守卫为 OK。
- `git diff --check`：通过；仅保留 Windows 工作区 LF/CRLF 转换提示。

## 遗留问题

- 本阶段只覆盖本地构建和静态预检，尚未完成右侧浏览器主流程验收。
- 小程序包已生成，但仍需要微信开发者工具导入或上传体验版后做真机/开发者工具验收。

## 下一阶段应继续处理的事项

- 启动或复用本地 API/Admin/H5 服务。
- 在右侧浏览器执行主流程验收：页面打开、后台多角色、签到核销响应式、会员管理、营销弹窗检测、广告中心缺图拦截与有图展示、版本信息卡片。

# 2026-07-01 - 上线整改最终浏览器验收

## 阶段名称

上线整改第八阶段 - 本地 Docker 环境全流程复验、多角色权限抽查和上线剩余项确认。

## 本阶段完成内容

- 复用本地 Docker/Nginx/API 环境完成右侧浏览器验收，验证地址为 `http://127.0.0.1:18080`，租户为 `qiwai-showcase`。
- H5 首页可正常打开，装修内容、营销弹窗和广告位可展示，页面控制台未发现阻塞型前端错误。
- 后台平台/运营入口可登录，工作台、系统设置、前台装修、营销弹窗、广告中心、会员管理、签到核销页面可打开。
- 签到核销页完成 375px、768px、1280px 三档视口复验，窄屏下输入框和操作按钮可用，无横向挤压到不可操作的问题。
- 营销弹窗完成后台创建、启用、生效检测和 H5 首页展示复验：
  - 测试弹窗：`Codex验收弹窗-20260701065627`
  - 测试弹窗 ID：`2`
  - 生效检测返回命中，H5 首页可弹出。
- 广告中心完成缺图启用拦截、有图广告启用和公开接口展示复验：
  - 缺图广告启用被拦截，提示“请上传广告图或选择商家默认广告图后再启用”。
  - 有图广告：`Codex有图广告-20260701065627`
  - 广告 ID：`7`
  - 前台标题：`Codex上线验收广告`
  - `GET /public/ad-slots` 返回 `resolvedImageUrl`，H5 广告位优先展示该字段。
- 会员管理完成分页模式、旧数组模式、详情时间线、批量标签和快捷筛选 API/页面复验：
  - 测试标签：`上线验收-20260701`
  - 会员详情时间线返回 7 条记录。
- 系统设置完成短信与部署版本卡片复验：
  - 租户后台可见 SMS AppID 和“发送测试短信”入口。
  - 平台部署配置页可见 API/Admin/H5 三端版本卡片。
  - 本地 API commit 为 `local-docker-mobile-admin`，Admin/H5 静态 commit 为 `a6fffcb1`，系统能提示版本不一致。
- 多角色浏览器和脚本复验通过：
  - `showcase_finance` 不能访问营销弹窗。
  - `showcase_checkin` 不能访问广告中心。
  - `showcase_store_owner` 可访问店铺商品/订单。
  - `showcase_store_finance` 可访问店铺订单/结算，不可编辑商品。
  - `showcase_agent_owner` 可访问代理结算。
- 本地演示数据脚本和角色验证脚本已修复并通过，支持重复执行恢复店铺/代理/财务测试账号。

## 修改/新增的主要文件

- `DEVELOPMENT_LOG.md`
- `docs/线上全流程验收报告与整改方案-20260701.md`

## 运行或测试结果

- 验证时间：2026-07-01 15:07:19 +08:00。
- 验证环境：Windows 本地工作区 + Docker Compose，入口 `http://127.0.0.1:18080`，API ready 为 `ready=true/api=up/database=up/config=warning`。
- `npm.cmd --prefix apps/api run build`：通过。
- `npm.cmd --prefix apps/admin run build`：通过；仅保留既有 VueUse/Rollup PURE 注释和 chunk 体积提示。
- `npm.cmd --prefix apps/mobile run build:h5`：通过，生成 `apps/mobile/dist/build/h5/version.json`。
- `$env:VITE_API_BASE='https://rd.chaimen666.com/api'; $env:VITE_DEFAULT_TENANT_CODE='qiwai-showcase'; npm.cmd --prefix apps/mobile run build:mp-weixin`：通过，生成小程序包并完成授权配置 patch。
- `npm.cmd run test:preflight-guards`：通过。
- `node --check scripts/seed-online-showcase.mjs`：通过。
- `node --check scripts/verify-online-showcase-roles.mjs`：通过。
- `node scripts/verify-online-showcase-roles.mjs`：本地通过，店铺/代理/店铺财务权限符合预期。
- `git diff --check`：通过；仅保留 Windows 工作区 LF/CRLF 转换提示。

## 遗留问题

- 本地验证码环境为 `H5_AUTH_MODE=dev`，公开 H5 验证码接口会返回开发验证码；正式上线仍必须在服务器配置腾讯云短信参数并保持生产环境短信模式。
- 本地 SMS 测试接口在未启用短信时会明确失败：`sms provider is not enabled`，符合预期；线上需要补全真实短信签名、模板、SDK AppID 和密钥后复测。
- 小程序包已构建通过，但仍需导入微信开发者工具或上传体验版后完成开发者工具/真机验收。
- 本地 API/Admin/H5 版本卡片能工作；线上部署后仍需确认服务器 API commit、Admin 静态包、H5 静态包是否一致。

## 下一阶段应继续处理的事项

- 提交代码并部署服务器后，执行生产 migration、API 重启、Admin/H5 静态发布和 Nginx reload。
- 在服务器配置真实腾讯云短信后，复测 `POST /admin/settings/sms/test` 和 `POST /public/auth/h5-code`。
- 使用微信开发者工具导入 `apps/mobile/dist/build/mp-weixin`，复验首页装修、营销弹窗、广告位、微信登录/手机号绑定和官方广告位。
- 线上右侧浏览器再跑一遍保留数据闭环：新用户验证码登录、报名收费活动、财务确认线下收款、签到账号核销、会员管理统计更新。

## 是否达到可上线运营标准

- 本地代码和浏览器复验结论：整改计划内功能已完成，达到“可部署到线上进行最终上线验收”的状态。
- 正式上线结论依赖生产环境两项外部配置：真实腾讯云短信配置、小程序开发者工具/体验版验收。完成这两项后，可按当前版本进入正式运营。

# 2026-07-11 - 依赖升级、最终全流程验收与交付包

## 本阶段完成内容

- 将 API 从 NestJS 10 升级到 NestJS 11，并完成 182 个单元测试回归。
- 修复迁移索引与 TypeORM 实体元数据不一致问题，补充社区签到实体回归测试。
- 将 `miniprogram-ci` 移到开发依赖，运行时审计从 81 个漏洞（含 42 个严重）降到 3 个中危、0 高危、0 严重。
- 新增 GitHub Actions 质量门禁、`ci:install`、`ci:verify` 和统一小程序构建脚本。
- 修复移动管理后台统计读取旧字段问题，并增加活动/报名非零自动化断言。
- 完成 H5 用户、平台、商家、运营、财务、签到、店铺、店铺财务、代理多角色验收。
- 在右侧浏览器复核报名 ID `219` 的已付款/已签到状态和移动管理统计，控制台无 warning/error。
- 保留用户、订单、签到和移动活动测试数据。
- 生成 `交付包-20260711`，包含测试、部署、教程、账号、整改、限制和交付检查表。

## 最终验证

- `npm run ci:verify`：通过。
- API：17 个测试文件、182 个测试通过。
- API/Admin/H5/mp-weixin 构建：通过。
- `npm run codex:release-check`：8 个阶段全部通过，0 阻塞。
- Docker API/MySQL 健康，Nginx 入口 `http://127.0.0.1:18080` 可用。
- 运行时依赖审计：3 moderate、0 high、0 critical。

## 交付结论

- 本地源码、构建和业务闭环已达到可交付、可部署状态。
- 没有未执行的代码级优化整改项。
- 正式运营仍需甲方提供真实短信、支付证书/商户参数，并完成微信开发者工具和真机验收。

# 2026-07-11 - 功能性升级补充

## 完成功能

- PC 后台报名管理新增待审核报名多选、批量通过和批量拒绝。
- 批量接口逐条复用原审核逻辑，返回成功/失败明细，并记录单条及汇总操作日志。
- 新增 `acceptance:functional-upgrades` 自动验收脚本。
- H5 活动详情和报名详情新增“添加到日历”。
- H5 生成标准 `.ics` 文件，微信小程序调用 `wx.addPhoneCalendar`，其他平台复制活动信息兜底。
- 删除原来只弹“提醒已记录”但没有实际提醒能力的占位行为。

## 验收数据

- 保留活动 ID：`143`。
- 批量通过报名：`221`、`222`。
- 批量拒绝报名：`223`、`224`。
- API 验收脚本通过，批量操作失败数为 0。
- Admin、H5、mp-weixin 构建通过。

## 部署影响

- 需要重新构建 API、Admin、H5。
- 因修改 `apps/mobile`，微信小程序需要重新上传体验版并提交审核。

# 2026-07-13 - 09.03 商城库存治理

## 完成功能

- 新增库存治理 migration `1783560000000`，为 SKU、秒杀和拼团库存增加数据库不变量约束。
- 库存流水增加租户内唯一业务操作键及来源字段，锁定、扣减、释放、回补、营销库存和人工调库均可幂等追踪。
- 支付扣库存改为库存不足即中止事务，线下收款确认与库存扣减合并到同一事务。
- 新增库存异常实体、待履约订单锁定量核对、营销库存超分配扫描、自动恢复关闭、人工忽略和审计修复。
- 新增 15 分钟库存治理定时扫描，PC 商品页和独立库存工作台均可查看、扫描和处理异常。
- 人工调库增加前端稳定 `businessKey`，重复提交不重复改数。
- 新增 `scripts/mall-inventory-concurrency-acceptance.mjs` 和 `acceptance:mall-inventory-concurrency`。

## 验证结果

- 库存治理专项测试：4 项通过。
- API 全量测试：60 个测试文件、320 项测试通过。
- API 生产构建：通过。
- PC 后台生产构建：通过。
- 并发验收脚本语法和根 `package.json` 校验：通过。

## 待环境验收

- 本机 MySQL 3306 未运行，migration、CHECK 约束和异常扫描真实数据验收待数据库恢复后执行。
- 同 SKU 并发下单、重复支付/关闭/退款、跨店失败补偿和 PC 浏览器操作流程待 API/数据库环境恢复后执行，脚本及页面入口已就绪。

# 2026-07-13 - 09.04 购物车与确认订单

## 完成功能

- 修复购物车数量减到 0 被 DTO 校验拦截的问题，并将加入/修改购物车改为 SKU 与购物车一致锁顺序的事务操作。
- 服务端报价返回逐项最新价格、库存、商品版本和店铺信息，并生成带用户、租户、优惠和积分口径的 10 分钟签名报价令牌。
- 下单时验签并重新计算报价，在 SKU 悲观锁内再次核对商品版本、规格、营销价和最终应付金额；变化时整单回滚并要求重新确认。
- H5/小程序确认订单使用服务端逐项报价，报价失败会阻止提交，价格或优惠变化后自动刷新并提示用户重新核对。
- 地址默认规则事务化：首个地址自动默认、默认地址删除后自动递补、最多 20 个地址，并增加手机号和字段长度校验。
- 收藏页支持直接移除，足迹支持单条删除和一键清空。
- 新增 migration `1783570000000`，补充地址、购物车和足迹高频索引。
- 新增 `acceptance:mall-checkout-quote`，覆盖篡改报价拒绝与有效报价下单保留数据。

## 验证结果

- 报价签名专项测试：3 项通过。
- 商城 DTO 专项测试：3 项通过。
- API 全量回归：62 个测试文件、326 项测试通过。
- API、PC、H5、微信小程序生产构建通过。
- 两个商城库存/报价验收脚本语法检查和 `git diff --check` 通过，仅有行尾提示。

## 待环境验收

- 待 MySQL 恢复后执行 migration，并验证报价篡改、过期、后台改价、购物车并发更新和默认地址并发。
- 待浏览器和微信环境恢复后走购物车、收藏、足迹、地址、确认订单及改价重新确认全流程。

# 2026-07-13 - 09.05 跨店拆单、统一支付、运费优惠分摊

- 新增 migration `1783580000000`，为店铺增加运费配置，为结算组增加运费总额和分摊快照，为子订单增加分摊快照。
- 新增整数分“最大余数法”分摊工具，按“优惠券适用商品→券后积分→店铺应付”顺序分配，店铺券不会跨店漂移，优惠、积分、运费和应付合计不丢分。
- 结算组汇总和公开订单结果已纳入运费及分摊快照字段，子订单冻结券、积分、运费、推广码和最终应付业务快照。
- 店铺 DTO 和保存逻辑已支持基础运费、包邮门槛和启停配置；新建店铺默认免运费。
- 跨店子单创建后锁定结算组、全部子单、优惠券和会员积分档案，复核实际商品及运费后一次性消费优惠券和积分；异常时关闭已生成子单并释放库存、优惠券和积分。
- 余额支付改为结算组钱包一次扣款，所有子单同事务进入已支付、扣减库存、记录积分及佣金，重复请求不重复扣款；修复跨店子订单误触发逐单余额支付的风险。
- 平台代收微信子单支持按 `groupNo` 统一下单、统一回调、主动查单和整体关单；回调锁定全部子单并同事务入账，重复回调幂等。商户直收混合结算明确降级为逐店支付，避免收款主体混用。
- 推广码只写入其所属店铺子单；H5/小程序已开放跨店优惠券和积分，展示每店商品、运费、优惠分摊和应付，并支持统一余额及统一微信支付。
- 新增 `acceptance:mall-checkout-group`，覆盖跨店分摊合计、重复提交、统一余额、微信沙箱回调和回调重放，测试订单默认保留。
- 分摊专项 4 项测试通过；API 全量 63 个测试文件、330 项测试以及 API、PC、H5、微信小程序生产构建全部通过。
- 当前 MySQL `3306` 不可用且 Docker daemon 停止，待环境恢复后执行 migration、真实事务锁、优惠券/积分并发、余额重复扣款、微信沙箱/真实回调、商户直收降级和浏览器/微信真机验收。

# 2026-07-13 - 09.06 订单履约、分包物流和超时任务

- 新增 migration `1783590000000` 和 `mall_order_events`，按订单保存唯一事件键、事件类型、前后状态、来源、操作者、说明、业务详情和发生时间，事件不能被后续订单字段覆盖。
- 商城订单创建、单店/跨店余额支付、单店/跨店微信回调、线下收款确认已写入幂等事件；跨店支付每个子订单保留结算组号和渠道流水快照。
- 后台发货、用户确认收货、未支付/未确认收款关闭及发货超时自动完成已改为状态变更与事件写入同事务；发货、收货、自动完成增加悲观锁，重复请求或 worker 竞态不会重复推进状态。
- 用户和后台物流接口在原有阶段时间线之外返回服务端订单事件列表；物流说明不再把临时拼接时间线当作完整历史。
- 新增 migration `1783600000000`，订单增加独立履约状态、总商品数量和已发数量；新增包裹与包裹商品数量模型。部分发货保持交易状态 `paid`，全部数量发出后进入 `shipped`，避免交易状态和履约状态混用。
- 分包发货支持按订单商品填写本包裹数量，服务端在订单锁内核对累计数量，禁止超发；发货业务键在订单内唯一，重复提交不会重复生成包裹或累计数量。
- 新增包裹物流单号修改接口，必须填写原因并记录修改前后值；PC 订单详情展示包裹、商品、履约进度和事件历史，订单列表使用轻量查询，打开详情后再加载完整履约数据。
- 用户可逐包确认收货，也可对全部包裹统一确认；只有所有商品已发且全部有效包裹签收后，订单才进入完成。自动完成 worker 同步更新包裹签收状态。
- 新增 migration `1783610000000` 和可替换物流供应商适配层，兼容 `events`、`traces`、`data.events`、`data.traces` 返回结构，轨迹按包裹事件键去重保存；后台可手动同步，worker 定时同步，供应商确认签收后自动汇总包裹和订单。
- 环境模板增加物流轨迹 sandbox/provider 配置；H5/小程序物流页展示多包裹、商品数量、承运轨迹和订单事件，订单详情支持复制各包裹单号和逐包收货。
- 新增 `acceptance:mall-split-shipment`，保留测试订单和两个包裹，覆盖部分发货、幂等重放、改单号、轨迹同步、全部发货、逐包签收和整单完成。
- 履约状态专项 3 项、轨迹解析专项 2 项、商城 DTO 6 项通过；API 全量 65 个测试文件、338 项测试及 API、PC、H5、微信小程序生产构建全部通过。
- 当前 MySQL `3306` 和 Docker 仍不可用；待恢复后执行 migration、分包并发、累计数量约束、worker 竞态、浏览器/真机和正式物流供应商验收。

# 2026-07-14 - 09.07 商城完整售后体系

- 新增 migration `1783620000000`，扩展售后单的业务幂等键、退货地址、寄回物流、换货包裹、责任归属、平台介入和响应期限；新增售后商品数量表、协商与举证时间线。
- 用户可按订单商品和剩余数量分别申请仅退款、退货退款或换货；服务端基于整单全部商品按整数分计算所选商品可退金额，拦截重复数量占用、超数量和超金额请求。
- 退货退款改为“审核同意→买家寄回→商家确认收货→支付退款”，不再审核通过即退款；换货改为“寄回→确认收货→独立换货包裹→用户/物流确认签收→售后完成”。
- 换货包裹使用 `shipmentType=exchange` 和售后关联，物流轨迹可同步，但不会计入原订单已发数量、原包裹签收和订单完成判断。
- 部分退款按售后商品精确回补基础库存及秒杀/拼团已售库存；全额退款才将订单置为已退款，部分退款保持待发货、待收货或已完成状态。
- 退款积分扣回改为按售后单幂等；全额退款才返还抵扣积分。待结佣金按净订单金额重算，已结佣金记录待扣回金额；商户结算继续逐笔纳入已通过退款。
- 同一售后单的审核、确认退货收货、支付退款和换货发货加入售后单悲观锁并在锁内重验状态，避免并发重复退款或重复发货。
- 新增售后响应 worker：商家超时未响应或履约超时自动转平台介入，买家超过寄回期限未填写物流自动取消并留存系统消息。
- PC 独立售后管理页与订单详情均支持商品明细、协商记录、责任归属、退货地址/物流、确认收货、换货发货、平台裁决和退款重试。
- H5/小程序订单详情支持选择售后类型和商品数量、补充凭证、填写寄回物流、申请平台介入、查看协商时间线和确认换货包裹收货。
- 新增 `scripts/mall-after-sale-acceptance.mjs` 和 `acceptance:mall-after-sale`，覆盖仅退款、平台介入后的退货退款、换货发货及签收，测试售后单和订单默认保留。

## 验证结果

- 售后金额与状态机专项测试：5 项通过。
- API 全量测试：66 个测试文件、343 项测试通过。
- API、PC、H5、微信小程序生产构建通过。
- 微信小程序在系统 Node 25 下会触发 uni-app 编译器原生异常退出；切换工作区 Node 24 后构建通过，属于工具链兼容问题，不是业务模板错误。
- 售后验收脚本语法检查通过。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 仍不可用，migration、悲观锁并发、库存/佣金/结算数据一致性和测试数据保留待数据库恢复后执行。
- 真实微信退款、余额退款、线下退款凭证、退货物流轨迹、浏览器多角色和微信真机流程待正式环境恢复后验收。

# 2026-07-14 - 09.08 评价与营销治理（持续开发批次 1）

- 商城评价增加追评内容、图片、独立审核状态、审核备注和审核人时间；用户追评使用评价行悲观锁，只允许首评通过后 180 天内提交一次，商品详情只展示审核通过的追评。
- 评价举报增加用户唯一约束、重复请求幂等、举报计数、租户/店铺权限校验、处理结论和违规隐藏；PC 评价工作台支持首评、追评和举报分开处理。
- `1783630000000` migration 会把历史重复评价完整快照归档到 `mall_review_duplicate_archives`，按最小 ID 保留主记录后再建立唯一索引，不再忽略索引创建失败。
- 优惠券新增独立发放总量和已领取数量，migration 从历史领取记录回填；发放额度与核销额度分开校验，显式领券和首次直接用券均在优惠券锁内占用发放额度，已有券用户在总量领完后仍可继续按核销额度使用。
- 秒杀/拼团订单必须携带 `clientOrderKey`；拼团限制每单 1 件，加入队伍时锁定队伍记录，拦截同用户重复参团和满员后继续占位，成团人数按独立付费用户计算。
- 推广码阻止推广用户本人下单产生佣金，并写入可解释订单事件；首评创建和领券唯一键冲突统一返回已落库记录。
- 新增 `mall-review-marketing-governance` 策略测试和 `acceptance:mall-review-marketing`，验收数据默认保留。

## 验证结果

- 评价与营销策略专项测试：7 项通过。
- API 全量回归：67 个测试文件、351 项测试通过。
- API、PC、H5、微信小程序生产构建通过，`git diff --check` 无空白错误。
- 验收脚本完成代码与语法准备；MySQL `3306` 和 Docker daemon 当前不可用，尚未执行真实 migration、事务并发和数据保留验收。

## 下一批

- 继续平台券/店铺券/商品券统一语义、退款释放口径、秒杀请求频控、推广归因有效期与异常归因审计。

# 2026-07-14 - 09.08 评价与营销治理（持续开发批次 2）

- 新增 migration `1783650000000`，商城优惠券增加 `issuerScope` 和 `refundReleasePolicy`，推广码增加 `startsAt`、`endsAt`；历史无店铺优惠券回填为平台券。
- 商城券明确区分租户平台券和店铺券：平台分类券按商品平台类目匹配，店铺分类券按店铺分类匹配；平台商品券可选择租户范围商品，店铺券仍受所属店铺限制。
- 优惠券订单快照冻结发行范围和退款返券策略；只有累计已通过退款达到整单金额且策略为 `full_refund` 时才释放使用记录和领取占用，部分退款和 `never` 策略不返券，重复释放保持幂等。
- 推广码创建订单时校验未开始和已过期状态；订单快照冻结推广码 ID、推广用户、代理、佣金比例、所属店铺、有效期、手工码来源和应用时间，支付后按冻结归因生成佣金，后续配置变化不改写历史订单佣金。
- 平台券及租户级商品范围增加数据范围保护，只允许具备全部店铺数据范围的管理员维护；受限店铺账号仍可读取影响本店的租户平台券，但不能越权修改租户级规则。
- `MallMarketing.vue` 和 `MallOrders.vue` 两个 PC 管理入口均补齐平台券/店铺券选择、平台/店铺分类与商品选项、退款返券策略、推广有效期编辑和列表展示；编辑、保存和启停请求完整保留新增字段。
- 新增平台/店铺分类匹配、全额退款返券、推广有效期和 migration 回填合同测试，并增加冻结推广归因源码合同断言。

## 验证结果

- 定向策略与 migration 测试：2 个文件、15 项通过。
- API 全量回归：67 个测试文件、355 项测试通过。
- API、PC、H5、微信小程序生产构建全部通过；微信小程序使用工作区 Node 24 构建。
- `acceptance:mall-review-marketing` 语法检查和 `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 仍不可用，migration 实跑、平台券跨店核销、累计部分退款达到全额后的返券、推广快照支付后归因及并发释放待数据库恢复后验证。
- PC 浏览器、H5/微信小程序和真实支付退款流程待运行环境恢复后执行，测试数据继续保留。

## 下一批

- 继续秒杀/拼团高频请求限制、设备与用户维度防刷、异常推广归因审计和营销活动风险告警。

# 2026-07-14 - 09.08 评价与营销治理（持续开发批次 3）

- 新增 migration `1783660000000` 和 `mall_promotion_rate_limits`，按租户、维度、HMAC 键和时间窗建立唯一计数；使用 MySQL `INSERT ... ON DUPLICATE KEY UPDATE count = count + 1` 原子累加，支持多实例共享频控状态。
- 秒杀/拼团新下单默认执行 60 秒用户 6 次、设备 10 次、IP 20 次限制，阈值和窗口可通过环境变量配置；超限返回 HTTP 429。已有订单/结算组的相同 `clientOrderKey` 重放在频控前返回原结果，不误伤网络重试。
- 新增 `mall_promotion_risk_events`，记录租户、店铺、用户、促销类型/ID、请求 ID、业务幂等键、窗口计数、阈值、放行/拦截结果和原因；设备、IP、User-Agent 均使用独立密钥 HMAC 指纹，不落原始敏感值。
- PC 商城营销页增加促销请求风控记录，可按放行/拦截筛选，查看用户、活动、用户/设备/IP 窗口计数、脱敏指纹、请求编号和拦截原因；接口继续执行店铺数据范围校验。
- H5/微信小程序结算页持久化匿名设备标识并随下单提交，旧客户端未传设备标识时仍由用户与 IP 维度保护。
- 环境模板增加促销频控窗口、三维阈值和独立风险哈希密钥；验收脚本补充设备标识。

## 验证结果

- 评价与营销策略专项增加三维频控边界测试，migration 合同增加频控窗口和风险事件表检查。
- API 全量回归：67 个测试文件、357 项测试通过。
- API、PC、H5、微信小程序生产构建全部通过。
- 验收脚本语法与 `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 仍不可用，原子计数、并发突发请求、窗口切换、过期清理、429 响应和店铺风险记录隔离待数据库恢复后实测。
- 浏览器与微信真机需验证同设备多账号、同 IP 多设备、幂等重试不重复计数及后台风控记录展示。

## 下一批

- 继续异常推广归因规则、风险告警、优惠券批量领取/多账号关联识别和秒杀/拼团组合防刷。

# 2026-07-14 - 09.08 评价与营销治理（持续开发批次 4）

- 新增 migration `1783670000000` 和 `mall_promotion_risk_alerts`；促销频控唯一窗口增加 `action`，领券、秒杀、拼团等动作独立计数，避免不同业务互相消耗阈值。
- 优惠券领取在已有领取记录幂等返回之后执行用户、设备、IP 三维频控，并检测同设备和同 IP 的短时多账号聚集；高风险领取返回 HTTP 429，重复请求不会重复计数或占用发放额度。
- 推广归因增加推广人自购、同设备买家聚集和同 IP 买家聚集规则；允许、复核、拦截结论及原因冻结到订单 `promotionSnapshot`，拦截只阻止佣金生成，不影响合法购买，IP 聚集可进入人工复核并保持佣金待处理。
- 风险事件按租户、店铺、业务对象和风险类型聚合为告警，支持 `open`、`resolved`、`ignored` 状态、重新打开、发生次数、首次/最近发生时间、操作人和处理备注；处置接口执行租户与商户数据范围校验。
- PC 商城营销页增加放行/复核/拦截筛选、业务中文标签和风险告警处置；移动端 API 全局发送持久化 `X-Device-Id`，覆盖领券及下单链路。
- `acceptance:mall-review-marketing` 已覆盖新增设备标识和营销治理路径，风险策略专项测试增加多账号与归因判定边界。

## 验证结果

- API 全量回归：67 个测试文件、359 项测试通过。
- API、PC、H5、微信小程序生产构建全部通过；微信小程序使用工作区 Node 24 构建。
- 验收脚本语法检查和 `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 仍不可用，待恢复后执行 migration、action 窗口唯一约束、并发领券、同设备/同 IP 多账号识别、告警聚合和佣金复核隔离实测。
- PC 浏览器、H5/微信小程序和真实支付流程待运行环境恢复后执行，测试数据继续保留。

## 下一批

- 进入 `09.09`：佣金规则版本、商品/商户/渠道/多级代理优先级、退款扣回、风险复核隔离、结算幂等和财务可解释明细。

# 2026-07-14 - 09.09 佣金规则、多级代理和退款扣回

- 新增 migration `1783680000000`、`mall_commission_rules` 和 `mall_commission_adjustments`；代理增加同租户上级代理关系，保存时拦截自关联、跨租户和层级循环。
- 佣金规则支持租户、店铺、推广渠道、商品四种范围，按“商品 > 渠道 > 店铺 > 租户”、同范围优先级和最新版本选择；规则修改通过发布新版本完成，旧版本自动停用，历史订单不被新配置改写。
- 商城佣金取消一订单一条限制，改为按订单商品、规则、受益对象和层级生成多条唯一业务明细；扣除运费后的净实付按商品行整数分精确分摊，规则、商品、计佣基数、比例、受益人和层级全部冻结快照。
- 支持推广用户直接佣金、代理直接佣金及最多 10 级上级代理佣金；推广码未配置新版规则时继续使用原佣金比例，保留历史兼容。
- 推广归因结论为 `review` 时佣金直接进入 `risk_review`，不能被单笔或批量结算；财务可人工通过转待结算或拒绝作废，处理结果、操作人和说明写入不可变调整流水。
- 单笔结算和批量结算改为事务内悲观锁与业务键幂等，批量查询只选择 `pending`，并发请求不会重复结算；每笔结算保存独立调整流水。
- 待结佣金在退款后按累计退款后的净额重算并记录减佣流水；已结佣金生成累计扣回金额，已确认扣回金额单独保存，后续退款只处理新增差额，财务必须填写扣款流水、冲抵批次或线下凭证后才能确认完成。
- PC 商城营销中心新增佣金规则版本工作台，支持范围、商品/渠道、直接比例、三级常用代理比例、优先级、有效期、新版本和停用；代理管理增加上级代理选择和展示。
- PC 商城支付日志增加风险复核、规则版本、商品、受益层级、原始/当前佣金、待扣回、单笔/批量结算、扣回确认和不可变调整流水；佣金明细及推广对象汇总导出补齐风险和扣回字段。
- 新增 `scripts/mall-commission-governance-acceptance.mjs` 和 `acceptance:mall-commission-governance`，覆盖规则发布、订单计佣、风险放行、佣金结算、全额退款扣回、扣回确认及保留测试数据。
- 更新多商户预检合同，使其匹配跨店统一余额、完整售后和佣金财务闭环的当前实现。

## 验证结果

- 佣金规则与 migration 专项：12 项通过；商城 DTO 增至 8 项通过。
- API 全量回归：68 个测试文件、366 项测试通过。
- API、PC、H5、微信小程序生产构建全部通过；微信小程序使用工作区 Node 24 构建。
- `preflight-mall-multi-merchant-guard`、佣金验收脚本语法和 `git diff --check` 通过，静态检查只有 Windows 行尾转换提示。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 仍不可用，待恢复后执行 migration、旧佣金唯一约束迁移、规则并发发布、同订单多商品多层级生成、结算锁和累计退款扣回实测。
- PC 浏览器需验证佣金规则版本、代理层级、风险复核、批量结算、扣回确认和导出；H5/微信小程序需验证推广订单、支付和退款闭环，测试数据继续保留。

## 下一批

- 进入 `09.10`：商户结算单逐笔核对、锁单、复核、付款凭证、佣金/退款/平台费口径和财务统计一致性。

# 2026-07-14 - 09.10 商户逐笔结算、复核和付款治理

- 新增 migration `1783690000000`、`mall_settlement_lines` 和 `mall_settlement_events`，把结算从单个 JSON ID 快照升级为主单、逐笔明细和不可变事件账本；旧单回填 `legacy_v1`，新单使用 `settlement_v2`。
- 结算主单新增业务防重键、净交易额、平台代收、商户直收、佣金成本、佣金返还、财务调整、明细行数、计算版本、锁定时间、操作人 ID、复核说明、付款说明、账户快照和乐观版本。
- 生成结算改为事务流程：先锁店铺，再锁订单、退款和佣金；同店并发生成串行化，业务键重放返回原结算单。草稿、已审核和已付款结算锁定来源，拒绝结算释放来源后可重新生成。
- 每笔订单、退款、佣金、佣金扣回/减佣返还、平台服务费和手工调整保存独立结算行；行内冻结业务编号、收款模式、支付方式、金额、规则与业务快照。主单与明细不一致时禁止审核和付款。
- 所有结算金额使用整数分计算，服务费使用基点并对正负金额执行对称四舍五入；应结金额统一为“平台代收净额 - 服务费 - 佣金 + 佣金返还 + 财务调整”。
- 佣金风险复核未完成时禁止生成商户结算。待付佣金在商户已被扣款后发生退款减佣，后续结算自动返还差额；尚未向商户扣过的佣金直接按退款后净额结算，不重复返还。已结佣金仅在扣回实际确认后返还商户。
- 草稿结算支持追加正负财务调整，必须填写原因和业务键；调整行与调整事件只追加不覆盖。审核、拒绝和付款均在事务内悲观锁定结算单、重验状态并写唯一事件，网络重放不会重复推进。
- 付款前必须填写流水号或上传凭证，完成后冻结店铺结算配置、联系人和启用收款账户摘要；审核后结算金额与明细不可修改。
- PC 商城结算工作台增加平台代收、佣金、扣回、调整和应结财务汇总；结算单支持打开逐笔对账抽屉，查看金额一致性、订单/退款/佣金/平台费/调整行和完整状态时间线，并可在草稿阶段记入调整。
- 结算导出补齐净额、平台/商户收款、佣金、扣回、调整、行数和计算版本；待生成汇总纳入佣金、佣金返还及风险复核数量。
- 新增 `scripts/mall-settlement-ledger-acceptance.mjs` 和 `acceptance:mall-settlement-ledger`，覆盖生成重放、逐笔一致性、调整重放、审核重放、无凭证拒绝、付款重放和保留测试结算数据。

## 验证结果

- 商户结算整数分策略 3 项、商城 DTO 10 项通过；migration 合同通过。
- API 全量回归：69 个测试文件、371 项测试通过。
- API、PC、H5、微信小程序生产构建全部通过；微信小程序使用工作区 Node 24 构建。
- `preflight-mall-multi-merchant-guard`、结算验收脚本语法、`package.json` 解析和 `git diff --check` 通过；静态检查仅有 Windows 行尾转换提示。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 仍不可用，待恢复后执行 migration、旧结算回填、唯一业务键、同店并发生成、订单/退款/佣金锁、拒绝后重新生成、草稿期间退款、审核付款并发重放和金额一致性实测。
- PC 浏览器需验证结算汇总、逐笔明细抽屉、财务调整、复核、拒绝、付款凭证、事件时间线和导出；真实付款账户与凭证需在正式配置下验收，测试数据继续保留。

## 下一批

- 进入 `10.01`：爱心资金池、公益项目申请/审核/执行/结项、分阶段拨款、双人复核、付款凭证和公众资金披露。

# 2026-07-14 - 10.01 公益资金、项目与公开披露治理

- 新增 `charity_fund_accounts` 独立资金账户，按平台或租户范围保存整数分余额、冻结金额、累计收入、累计支出、账本序号和链头哈希；所有写入使用账户悲观锁。
- 公益流水扩展余额前后值、序号、前序哈希、条目哈希、业务快照、项目和拨款关联；新增流水使用 SHA-256 链式校验，后台汇总返回完整性结果和旧版流水数量。
- 订单公益计提、退款冲回和项目拨付统一通过不可变账本追加；并发部分退款在账户锁内统计已冲回金额，累计冲回不超过原计提。退款保留不再修改原计提行，改为独立 `charity_retention` 零金额审计事件。
- 公益项目新增项目编号、申请人、审核人、业务防重键、申请快照和版本号；状态机覆盖草稿、提交审核、驳回重提、审核通过、开始执行、提交验收、结项和归档，所有动作写入不可变项目事件。
- 项目提交后冻结标题、目标金额、封面和说明，避免已审核公开项目被直接改写；PC 仅允许草稿和驳回项目继续编辑。
- 分阶段拨款改为“申请、复核冻结、独立付款”流程，申请人、复核人、付款人必须是三个不同管理员；预算承诺统计包含待复核、已复核和已付款，超项目目标直接拒绝。
- 付款必须填写流水号或凭证，支付时释放冻结并写哈希扣款流水；待复核或已复核未付款拨款支持填写原因后取消，已冻结金额同事务释放，取消与审批、付款均支持业务键重放。
- 拨款申请、复核、付款和取消均写入项目事件时间线；PC 公益工作台增加三人分离提示、取消拨款、取消原因和操作人展示。
- 公众公益接口改为严格字段白名单：草稿/待审/驳回项目不可见，只返回已付款且公开的拨款，付款号脱敏，不返回管理员、业务键、申请快照、密码、OpenID 或完整内部实体。
- 公众汇总增加脱敏资金来源/用途列表；后台公益流水同样改为安全视图，会员个人流水只返回页面所需字段。
- 新增 `charity-fund-governance` 规则测试、`charityLedgerBusinessKey` 有界哈希键、`acceptance:charity-fund-governance` 多角色验收脚本和 `preflight-charity-governance-guard`。
- 上线门禁回归时修复既有生产配置漂移：去除生产环境示例中的重复邮件键，补齐正式环境新增键和 Docker API 环境透传，并将操作审计、上传门禁更新到分页审计和对象存储现状。

## 验证结果

- API 全量回归：71 个测试文件、380 项测试通过。
- API、PC 后台、H5、微信小程序生产构建全部通过；微信小程序使用工作区 Node 24 构建。
- 全部上线前 preflight guard、公益验收脚本语法、`package.json` 解析和 `git diff --check` 通过；差异检查仅有 Windows 行尾转换提示。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 不可用，尚未实跑 `1783700000000`、`1783710000000` migration、旧流水账户回填、唯一键和外键回滚。
- 待数据库恢复后执行同项目并发申请、同账户并发审批、退款冲回与拨款竞态、审批/付款/取消重放、哈希篡改检测和余额/冻结/项目拨付一致性验收。
- 待启动完整环境后使用申请人、复核人、付款人三个独立账号执行 PC 浏览器与 H5 公开披露流程，测试项目、拨款、取消记录和付款凭证按要求保留。

## 下一批

- 进入 `10.02`：援助申请、敏感材料加密、补件、审批、批准/拒绝、跟进和最小权限访问治理。

# 2026-07-14 - 10.02 援助申请、敏感材料与审批治理

- 新增 `aid_applications`、`aid_application_materials`、`aid_application_events` 和 migration `1783720000000`，将旧大使申请中的明文帮扶记录拆成独立援助申请领域。
- 申请人姓名、手机号、微信、证件号、地址、紧急联系人、申请需求和情况说明统一封装为 AES-GCM 加密载荷；手机号额外保存 HMAC 盲索引，列表仅保存脱敏姓名和手机号。
- 状态机覆盖 `submitted -> supplement_required -> pending_review -> approved/rejected -> closed`，提交、补件、分派、要求补件、审核、关闭和跟进均写入不可变事件。
- 所有关键写操作接受业务幂等键；同用户提交先锁用户再检查 UTC 自然日次数，每日最多 3 份，并保证相同业务键重放先于限流返回。并发补件、材料上传和后台动作在锁定申请后复查事件键。
- 申请跟进人与最终审核人强制分离；批准和拒绝必须填写加密审核意见，关闭仅允许从已批准或已拒绝状态进入。
- 材料使用独立私有目录和随机加密引用，Nginx 不挂载私有卷；文件内容、原始文件名均加密，未授权详情只展示“加密材料-ID.扩展名”。
- 上传限制 JPG、PNG、WebP、PDF 和 10 MB/10 份，使用真实文件头检测并要求与声明 MIME 一致，规范化下载扩展名；事务回滚时删除已写入的孤儿加密文件。
- 平台入口、租户编码和独立域名统一解析真实租户，申请、列表、补件和上传均重新检查公益功能开关及申请租户归属。
- 后台新增 `aid.view`、`aid.manage`、`aid.sensitive` 三类权限；敏感查看和材料下载必须记录管理员并追加访问审计事件，租户管理员不能跨到平台援助工作台。
- PC 新增援助申请工作台，支持脱敏筛选、详情、授权查看、材料下载、分派、补件、审核、跟进和关闭；H5/微信小程序新增登录申请、敏感信息授权、材料上传、申请进度与补件入口。
- 新增援助隐私与文件魔数专项测试、`acceptance:aid-application-governance` 和 `preflight-aid-privacy-guard`，验收脚本覆盖角色权限、自审拦截、MIME 伪造拒绝、加密解密与审计记录。
- 新增 `private-data:backup`、`private-data:restore`，备份援助材料及私有支付凭证；恢复前校验归档条目必须位于 `private-data/` 且不得包含路径穿越，并要求显式确认。过期数据库与私有数据备份统一清理。

## 验证结果

- API 全量回归：73 个测试文件、391 项测试通过。
- API、PC 后台、H5、微信小程序生产构建全部通过；微信小程序使用工作区 Node 24 构建。
- 全部上线前 preflight guard、援助专项脚本语法和 `git diff --check` 通过；差异检查仅有 Windows 行尾转换提示。
- 使用隔离测试目录完成私有数据“归档、恢复、SHA-256 哈希比对”演练，恢复文件哈希为 `3AA8B2C562E8AB07C5CA9D2119462F41897AA062DEB900323C89A2D611295F18`，演练临时文件已清理。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 不可用，尚未实跑 migration `1783720000000`、数据库密文/盲索引核对、Docker 命名卷归档恢复和回滚。
- 待数据库恢复后执行同用户不同业务键并发提交、相同业务键重放、材料上限竞态、补件/审核并发、事件唯一键冲突和事务失败孤儿文件清理实测。
- 待完整环境启动后使用查看、管理、敏感信息三个独立后台角色，以及 H5/微信申请人完成浏览器和真机流程，并执行上传伪造、越权猜测、下载审计与敏感响应泄漏检查；测试数据继续保留。

## 下一批

- 进入 `10.03`：爱心大使 CRM、区域与有效期、任务贡献等级，以及合作伙伴招募、销售阶段、负责人、跟进、合同和转租户/商户闭环。

# 2026-07-14 - 10.03 大使 CRM、伙伴合同与转化闭环

- 新增 migration `1783730000000`，保留旧 `ambassador_applications` 数据并回填 `ambassador/partner` 类型与 `legacy-ecosystem:{id}` 业务键；新增机构、合作意向、省市区、正式负责人、转换租户/店铺、转换业务键和版本字段。
- 公开申请 DTO 增加申请类型和幂等键，大使首页、大使申请页、院长招募页均在网络重试期间复用同一业务键；服务端按大使/伙伴功能开关放行，并限制同手机号 24 小时最多提交 3 次同类申请。
- 招募线索状态机限制非法跳转，负责人可关联启用的平台管理员；新跟进记录保存业务键、前后状态和 AES-GCM 加密正文，线索备注同步改为加密存储，旧明文记录保留兼容读取。
- 新增 `ambassador_profiles`，大使激活后自动生成唯一档案编号、脱敏手机号、独立 HMAC 盲索引、区域授权、开始/到期时间、身份状态、贡献积分和等级；有效身份默认 1 年，支持暂停、到期和不可恢复撤销。
- 新增 `ambassador_tasks` 与 `ambassador_contributions`，任务支持草稿、开放、关闭、取消、城市、时段、名额和积分；同任务登记锁定任务后统计待审/已通过占用，防止并发超额。
- 贡献登记、复核和撤销使用独立业务键；登记人与复核人必须不同，只有通过后才增加积分，撤销扣回积分，等级按 100/500/1500/5000 分自动计算为青铜、白银、黄金和核心。
- 新增 `partner_contracts`，合同按伙伴线索递增版本，合同号、创建键、审核键和终止键唯一；关键条款、私有归档引用和审核说明加密，创建人与复核人分离，只有已签署待复核合同可生效。
- 同伙伴合同版本创建锁定线索，避免并发产生重复版本；合同生效、驳回和终止锁定合同，转换时同时锁定伙伴线索和有效合同，避免终止/转换竞态。
- 伙伴转换要求线索已通过且存在当前有效合同；事务内创建停用租户，默认 `trial + packageSuspended`，可按合同权益同时创建停用店铺。生成对象必须在租户、区域、商城、资质、支付和品牌配置完成后手工启用。
- 新增 `partner.manage` 高风险权限；基础线索、大使身份与贡献使用 `ambassador.manage`，合同和转换接口使用 `partner.manage`，租户管理员被平台范围守卫拦截。
- PC “大使与伙伴 CRM”增加身份档案、有效期、任务、贡献复核账本、伙伴合同版本、双人复核、合同终止和转商家/店铺面板，保留原落地页、案例、历史线索和志愿任务入口。
- 新增 `ECOSYSTEM_LOOKUP_HASH_SECRET` 并同步 API/生产/本地 Docker 环境模板、实际生产环境和 Docker Compose；生产配置校验要求独立至少 32 位密钥。
- 新增大使等级/有效期/合同有效性规则测试、`acceptance:ecosystem-partner-crm` 多管理员验收脚本和 `preflight-ecosystem-crm-guard`。

## 验证结果

- API 全量回归：74 个测试文件、395 项测试通过。
- API、PC 后台、H5、微信小程序生产构建全部通过；微信小程序使用工作区 Node 24 构建。
- 全部上线前 preflight guard、大使伙伴专项验收脚本语法和 `git diff --check` 通过；差异检查仅有 Windows 行尾转换提示。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 不可用，尚未实跑 migration `1783730000000`、旧线索类型/业务键回填、外键与唯一索引、合同/贡献加密值和回滚。
- 待数据库恢复后执行同任务名额并发、同伙伴合同版本并发、贡献通过/撤销重放、合同审核/终止重放、合同终止与伙伴转换竞态、同业务键跨对象碰撞和转换唯一编码冲突测试。
- 待完整环境启动后使用线索运营、伙伴合同复核两名独立管理员走 PC 浏览器流程，并在 H5/微信真机提交大使与伙伴申请；保留大使档案、贡献、合同、停用租户和停用店铺验收数据。

## 下一批

- 进入 `10.04`：志愿者实名档案、技能/培训/资格/可服务时间、志愿任务发布报名录取、签到、工时确认、取消和替补闭环。

# 2026-07-14 - 10.04 志愿者档案、任务、签到和工时治理

- 新增 migration `1783740000000`，在保留历史志愿者、任务、报名和服务记录的前提下补充档案编号、业务键、技能、可服务时间、实名状态、资格状态和到期时间；手机号新写入使用 AES-GCM 加密值、HMAC 盲索引和脱敏字段，PC 列表、导出和公开接口不再返回完整手机号。
- 新增培训资格记录、签到签退记录和不可变工时调整流水；培训审核后按有效期重算资格，任务可要求资格、技能和最低培训时长。
- 任务增加招募窗口、候补、取消截止、签到窗口、经纬度、租户/公益项目归属和任务业务键；报名新增幂等键、报名身份键、候补序号、录取/取消/签到/完成审计字段，状态机覆盖待审核、录取、候补、拒绝、取消、替补、已签到和已完成。
- 任务报名在任务悲观锁下核算名额，重复报名只返回原记录；取消录取后自动按候补序号递补，替补操作锁定同一任务并写入替补关系。
- 新增 HMAC 签名签到凭证，支持移动端凭证提交和 PC 手工签到/签退；签退按真实签到时长生成待确认服务记录，限制签到窗口、重复签到和凭证重放。
- 服务工时由管理员登记为待志愿者确认，志愿者确认后进入待运营复核，复核通过才累计时长；驳回和冲销不覆盖原记录，累计时长按已确认服务记录和调整流水重算，并保留证书联动。
- PC 志愿任务表单增加报名窗口、候补、资格和培训门槛；志愿者工作台增加培训登记、工时复核/冲销；移动端增加报名取消、签到凭证提交和服务工时确认。
- 新增 `volunteer-governance.spec.ts` 规则测试、`preflight-volunteer-governance-guard.mjs` 和 `volunteer-governance-acceptance.mjs`；API 全量回归 75 个测试文件、398 项测试通过，API/PC/H5 构建通过，preflight 和 `git diff --check` 通过。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 不可用，尚未实跑 migration `1783740000000`、历史手机号盲索引回填、唯一索引/外键和回滚；历史明文手机号保留在兼容列，需数据库恢复后按私有迁移窗口逐步加密清理。
- 待完整环境执行同任务并发报名、同任务并发录取/取消/候补递补、签到凭证重放、重复签退、工时双确认重放、工时冲销和培训到期核验。
- 待使用管理员和志愿者独立账号执行 `acceptance:volunteer-governance`，保留任务、报名、档案、签到、服务记录和调整流水；浏览器/微信真机流程需要 Node/uni 小程序编译环境稳定后继续验收。

## 下一批

- 进入 `10.05`：勋章、志愿证明、证书版本、撤销和公开验真。

# 2026-07-14 - 10.05 志愿勋章、服务证明、证书版本与公开验真

- 新增 migration `1783750000000`，证书补充发证业务键、证书版本和加密撤销原因；已有证书保留兼容读取，后续发证按志愿者、模板和名称生成稳定幂等键，避免重复发证。
- 新增 `volunteer_badge_definitions`、`volunteer_badge_awards` 和 `volunteer_service_proofs`；确认工时重算时自动创建 1/8/30/80 小时四档服务勋章，授予业务键唯一，勋章支持受控撤销。
- 服务记录确认后可在 PC 工作台生成志愿服务证明，证明保存唯一编号、任务/服务/时长/日期快照和加密凭据引用，不跟随后续任务或档案变化；证明支持撤销并保留原因。
- 新增 `GET /public/volunteer-proofs/:proofNo/verify`，证书和服务证明公开验真均只返回脱敏持有人信息；撤销后返回无效，不返回快照敏感字段。
- PC 志愿者工作台增加凭证查看、服务证明生成和撤销后的状态展示；移动端“我的证书”增加志愿勋章和服务证明列表。
- 新增 `preflight-volunteer-credentials-guard.mjs`，并扩展 `volunteer-governance-acceptance.mjs` 覆盖自动勋章、证明生成、公开验真和撤销验真。

## 验证结果

- API 全量回归：75 个测试文件、398 项测试通过。
- API 构建通过；PC 后台构建通过；H5 构建通过；微信小程序产物目录已生成且认证补丁脚本通过，但当前 uni 编译命令仍返回无诊断码退出码 1，待工具链稳定后重跑。
- `preflight-volunteer-governance-guard`、`preflight-volunteer-credentials-guard` 和 `git diff --check` 通过；差异检查仅有 Windows 行尾转换提示。

## 待环境验收

- 本机 MySQL `3306` 和 Docker daemon 不可用，尚未实跑 migration `1783750000000`、证书版本/发证键回填、勋章阈值并发和证明/证书撤销回滚。
- 待完整环境使用管理员和志愿者独立账号执行志愿治理验收脚本，保留勋章、服务证明、证书、撤销记录和公开验真结果；待浏览器和微信真机执行凭证入口验收。

## 下一批

- 进入 `11.01`：PC 后台完整页面和操作状态，继续补齐列表、详情、表单、批量、导出以及统一加载/空态/错误/无权限状态。

# 2026-07-14 - 11.01 PC 后台页面状态与凭证幂等加固

- 修复 `app.module.ts` 实体注册遗漏，将 `MallSettlementEvent` 加回 TypeORM `entities` 列表，避免结算事件迁移存在但运行时无法映射。
- 志愿勋章和服务证明新增撤销业务键及唯一索引，撤销动作改为事务内悲观锁，重复请求按业务键幂等返回，已被其他请求撤销时明确拒绝。
- 志愿服务证明签发改为事务内锁定已确认服务记录，按服务记录和档案范围复核，证明编号改用 UUID 后缀降低并发碰撞风险，保留冻结快照。
- PC 活动、报名、志愿者工作台补充可见的加载失败提示和重试按钮；报名列表对手机号统一脱敏显示，仍保留批量审核、通知、标签、打印和导出操作。

## 验证结果

- API 全量回归：75 个测试文件、398 项测试通过。
- API `tsc --noEmit` 通过；API 构建通过；PC 后台构建通过。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

- 继续补齐统一订单中心、统一资金流水、援助申请和后台登录日志的加载失败提示与重试入口；统一订单中心用户手机号改为脱敏展示。
- 数据看板增加全局加载失败恢复入口，商城工作台和平台数据看板共用同一重试路径。
- 通知中心补充全量依赖加载失败提示与重试入口，避免模板、活动、服务商或标签接口异常时页面静默空白。
- Vue 类型检查通过；API 全量回归仍为 75 个测试文件、398 项测试；志愿者凭证和治理 preflight 均通过。

## 待环境验收

- 新增 migration `1783760000000` 尚未在真实 MySQL 执行，需验证撤销业务键唯一索引、旧数据兼容和回滚。
- 待继续审计后台其余页面的详情、批量、导出、无权限和错误恢复状态，并执行 PC 浏览器全流程。

## 下一批

- 继续 `11.01`：审计财务、商城、会员、课程、公益、社区和系统配置页面，补齐缺失的详情/批量/导出与异常恢复状态。

# 2026-07-14 - 11.02 移动管理端退款与操作状态

- 新增移动端退款审核页 `pages/admin/refunds`，支持退款状态筛选、退款号/订单号/手机号搜索、待审核通过/拒绝、失败状态提示和逐条防重复提交。
- 后端新增 `RefundQueryDto`，修复 `/admin/finance/refunds` 复用订单状态 DTO 的问题；退款列表现在按退款生命周期状态、活动和关键词过滤，并加载关联用户用于检索。
- 移动管理端底部导航接入退款入口；订单和报名页面增加错误面板、重试入口、逐条操作锁和手机号脱敏。
- 活动列表增加加载失败恢复和下架操作锁；活动编辑增加持久错误面板；核销概览不再静默吞错，核销成功结果手机号改为脱敏展示。
- 移动 bootstrap 增加 `canViewRefunds`/`canManageRefunds`，退款入口改用财务查看权限，退款审核改用 `order.refund` 权限；核销页改为加载服务端真实权限，避免核销员看到无权访问的财务入口。

## 验证结果

- API 全量回归：75 个测试文件、400 项测试通过；新增退款查询 DTO 测试覆盖合法退款状态和非法订单状态。
- API 类型检查与构建通过；PC Vue 类型检查通过；H5 构建通过。
- API 全量回归保持 75 个测试文件、400 项测试；H5 再次构建通过。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 待环境验收

- 微信小程序 `uni build -p mp-weixin` 在当前工具链仍无诊断退出码 1，需环境稳定后重跑；H5 产物已生成。
- 待移动管理端继续补齐活动编辑、退款真实处理和核销真机流程，并执行浏览器/微信真机验收。

# 2026-07-14 - 11.03 H5/小程序公共规则与账号资产对齐

- 公共移动 API 错误增加 HTTP 状态码；公共请求、二维码下载在 401/403 时统一清理用户会话，`ensureUser` 可据此重新进入登录流程，避免页面继续使用失效 token。
- 手机号/密码登录和微信登录在服务端未返回新 token 时清理旧 token；微信登录切换到未绑定手机号账号时清理旧账号手机号，避免账号资产串号。
- 课程订单支付复用统一微信支付处理器：H5 使用 H5 场景，小程序使用 JSAPI 场景；支持沙箱回调、H5 跳转和小程序 `requestPayment`，课程支付回调路径使用 `/payment/course/wechat/callback`。
- 我的订单页不再把报名、课程和课程订单接口错误静默转换为空列表；活动详情默认来源按 H5/微信小程序区分，继续保留分享链接中的租户、渠道和邀请码归因。
- 报名页加载失败增加真实重试入口，避免只能跳转登录；公共支付帮助函数导出后供课程和商城共用。

## 验证结果

- H5 实际构建通过，静态版本文件已写入 `apps/mobile/dist/build/h5/version.json`。
- 根目录全量构建通过（shared、API、PC、H5）。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。
- 微信小程序编译仍待当前 uni/Node 工具链稳定后重跑，不能以 H5 构建替代小程序验收。

## 待环境验收

- MySQL、Docker、正式支付/短信/微信配置仍不可用，尚未执行真实 migration、渠道回调和真机支付。
- 继续审计 H5/小程序商城、志愿者、帮扶、分享和移动管理端流程，并在环境恢复后执行浏览器与微信真机全角色验收。

# 2026-07-14 - 11.03 志愿者、帮扶与小程序编译复验

- 志愿者申请、任务报名、取消、签到签退和服务工时确认改为页面内稳定业务幂等键，网络超时后重试不会生成新的业务记录。
- 帮扶申请提交、补件上传和补件提交补充稳定幂等键、上传失败提示及逐条提交锁；成功完成并刷新列表后才释放下一次业务键。
- 商城售后申请补充稳定业务键和提交中锁，避免快速重复点击创建多张售后单。
- 当前 uni/Node 工具链已恢复：`npm run build:mobile:mp-weixin` 成功，微信小程序产物生成并完成认证配置补丁；此前的无诊断退出问题已解除。

## 验证结果

- API 全量回归：75 个测试文件、400 项测试通过。
- H5 构建通过并写入静态版本文件。
- 微信小程序构建通过，产物位于 `apps/mobile/dist/build/mp-weixin`，认证补丁成功。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 待环境验收

- 仍待真实 MySQL migration、支付/短信/微信正式配置、浏览器全角色流程和微信开发者工具/真机实际操作；构建通过不等于真机验收完成。
- 下一步继续审计商城、课程、社区、论坛和移动管理端的页面级错误恢复、空态、权限及重复提交状态。

# 2026-07-14 - 11.04 高频用户页面错误、空态与重试治理

- 商城首页增加主商品加载失败、店铺/分类/秒杀/拼团部分同步失败和加载中状态；部分辅助接口失败时继续保留商品浏览能力，并明确提示可重新同步，不再静默显示为空。
- 钱包页取消余额与流水接口的空值兜底，接口失败时不再显示虚假的 0 元余额，新增独立错误卡片和重试入口；未绑定手机号流程保持原有快捷绑定逻辑。
- 课程学习页将考核、公告和答疑改为 `Promise.allSettled` 部分加载，课程主内容可继续播放，同时显示未同步数量和重新同步入口；主内容加载失败增加原页重试。
- 志愿服务页增加公开任务加载失败状态、个人档案/报名/工时部分加载失败提示和重试入口；取消、签到签退及工时确认按钮接入统一提交锁。
- 公益页区分公开公示失败、个人公益信息失败和真实未登录状态；个人接口失败不再误导为“请登录”，分页加载失败会显示可见提示。
- 使用本地 H5 产物在应用内浏览器以 390×844 视口验证商城、公益和志愿错误状态；页面宽度与滚动宽度一致，无横向溢出，志愿重试按钮可正常重复触发。

## 验证结果

- H5 构建通过并写入静态版本文件。
- 微信小程序构建通过并完成认证配置补丁。
- API 全量回归：75 个测试文件、400 项测试通过。
- PC 后台 Vue 类型检查和生产构建通过。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 待环境验收

- 本轮浏览器验证使用后端不可达状态验证错误恢复；真实数据加载、登录后钱包/课程/个人公益和志愿档案仍需 MySQL 与 API 环境恢复后复验。
- 继续审计商城结算、课程互动、社区、论坛、个人中心和移动管理端剩余页面的权限、空态、长文本及重复提交状态。

# 2026-07-14 - 11.04 社区、论坛、商城结算与个人中心状态治理

- 社区首页将近期活动、今日打卡和参与者动态拆分为独立加载区，接口失败时保留明确错误卡片与分区重试，不再清空数据后显示真实空态；点赞和评论按动态增加操作锁，防止快速重复请求。
- 社区发布页将可发布活动设为关键依赖，将我的心得设为可降级依赖；采用部分加载结果，关键数据失败时禁止提交，辅助数据失败时保留填写能力并显示同步告警。
- 论坛列表、详情和发布页补齐加载中、持久错误、重试和禁用状态；主帖失败时不再显示回复空态，收藏、回复、楼中楼回复和举报使用统一操作锁，发布页在版块未就绪时禁止提交。
- 商城结算页取消地址、支付方式、优惠券、秒杀和拼团接口的静默空数组回退；商品、营销价格和报价失败阻断提交，地址与支付方式失败提供独立重试，优惠券按部分成功展示告警；稳定 `clientOrderKey` 保持在页面加载时生成，重试不更换业务键。
- 个人中心改为主资料关键加载、钱包/公益/课程/报名/课程订单/商城订单分区加载；部分接口失败时列出失败资产并显示 `--`，管理权限同步失败时默认关闭入口，游客态不再把未加载资产展示为真实 0。
- 应用内浏览器以 390×844 验证论坛、社区和个人中心：错误卡片与重试入口可见，论坛发布按钮在版块失败时禁用，论坛详情主帖失败不再显示回复数量，游客资产显示 `--`，所有抽查页面 `scrollWidth` 与视口一致。

## 验证结果

- H5 构建通过并写入静态版本文件。
- 微信小程序构建通过并完成认证配置补丁。
- API 全量回归：75 个测试文件、400 项测试通过。
- PC 后台 Vue 类型检查和生产构建通过。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 待环境验收

- 商城结算与个人中心登录后真实数据仍需 MySQL/API 环境恢复后复验；正式微信支付、余额支付和跨店拆单尚未在正式通道验收。
- 继续审计社区详情、课程互动、个人内容中心、商城购物车/地址及移动管理端剩余页面的错误恢复、权限和重复提交状态。

# 2026-07-14 - 11.04 商城辅助流程与社区详情补强

- 购物车增加持久加载错误和重试，不再在接口失败时清空后显示空购物车；数量增减和移除按商品加锁，移除增加二次确认与失败提示，加载或操作未完成时禁止进入结算。
- 地址簿增加加载中、错误卡片和重试，真实空地址与接口故障分离；保存和删除均增加操作锁，删除失败可见，地址接口异常时不会误显示空地址。
- 我的论坛将帖子、回复和收藏改为独立部分加载，当前标签接口失败时显示对应错误和重试，不再显示“暂无记录”。
- 社区详情将主帖和评论拆分为关键/辅助加载：评论接口失败不再导致整篇动态消失；点赞、收藏、关注和举报增加统一操作锁与弹窗锁。

## 验证结果

- H5 构建通过。
- 微信小程序构建通过并完成认证配置补丁。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。
- 本批仅修改移动端；API 仍沿用本轮已通过的 75 个测试文件、400 项测试结果，PC 后台生产构建仍为通过。

## 下一批

- 继续审计课程详情/考核、我的社区内容与互动消息、商城券包和个人学习页的错误恢复、提交锁与真实空态。

# 2026-07-14 - 07.04 / 11.04 真实课程评价与个人内容状态治理

- 课程详情取消两条写死演示评价，接入 `/public/courses/:id/reviews` 真实审核通过评价，展示评分、内容、时间和讲师回复；评价加载失败作为辅助错误展示，不阻断课程主内容。
- 公开课程评价接口改为明确公开字段响应，移除完整课程和租户关系实体，仅返回匿名学员名、评分、内容、图片、回复和时间字段。
- 修复游客打开公开课程详情时调用 `ensureUser()` 导致被强制跳转登录的问题；仅在本地已有登录 token 时同步收藏状态。课程收藏和加入操作增加按钮锁，付费、免费和会员权益入口统一防重复点击。
- 商城券包取消接口失败空数组回退，按当前标签显示持久错误和重试；领取优惠券按券 ID 加锁，真实空券包与加载失败分离。
- 学习记录取消静默清空，增加错误卡片与原页重试；我的心得保留已加载数据并增加加载错误、删除锁；社区互动将收藏、消息和关注改为独立部分加载，消息已读增加逐条操作锁。
- 应用内浏览器以 390×844 验证游客课程详情：后端不可达时停留在课程页显示重试，不再跳登录，页面无横向溢出，重试可重复触发。

## 验证结果

- API 全量回归：75 个测试文件、400 项测试通过；API 生产构建通过。
- H5 构建通过。
- 微信小程序构建通过并完成认证配置补丁。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 下一批

- 审计课程考核提交确认与结果恢复、免费/会员课程订单服务端幂等、我的课程/证书页面和商城收藏/足迹的错误状态。

# 2026-07-14 - 07.02 课程订单业务幂等

- 新增 migration `1783770000000-CourseOrderIdempotency.ts`，为 `course_orders` 增加 `clientOrderKey`，建立用户 ID + 业务键唯一索引，migration 支持重复执行检查和完整回滚。
- `CreateCourseOrderDto` 增加最长 120 字符业务键校验；课程订单实体将业务键写入金额/支付方式业务快照。
- 服务端创建课程订单前按用户和业务键查重，同一键复用到其他课程时明确冲突；免费/会员订单和付费待支付订单在并发撞唯一键时查询并返回原订单。
- 课程详情免费/会员领取和确认订单页均在页面生命周期生成稳定业务键，手机号绑定、网络失败和支付重试不会重新生成键。
- 新增 DTO 白名单/长度测试及 migration 唯一索引合同测试。

## 验证结果

- API 全量回归：75 个测试文件、402 项测试通过；API 生产构建通过。
- H5 构建通过。
- 微信小程序构建通过并完成认证配置补丁。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 待环境验收

- migration `1783770000000` 尚未在真实 MySQL 执行；需验证旧订单空键兼容、用户级唯一索引、同键并发创建和 down 回滚。
- 正式微信/支付宝支付、超时重试和支付回调仍需真实通道验收。

# 2026-07-14 - 07.03 / 11.04 考核恢复与学习资产页面

- 重构移动课程考核页：提交前统计未作答题目并二次确认，提交成功后立即退出作答状态并展示 attempt 状态，结果详情加载失败改为独立告警和重试，不再把“已提交但详情失败”误报为提交失败。
- 考核提交接口在同一 attempt 已为待批、通过或未通过时返回原 attempt 与答案，支持响应丢失后的幂等重试；待批和通过状态只允许返回课程，失败/退回才开启再次作答。
- 我的课程增加加载中、持久错误和重试，接口失败不再显示为空课程；返回页面时自动重新同步进度。
- 我的证书将证书主列表与志愿勋章/证明改为部分加载，主列表失败显示错误，志愿凭证失败显示辅助告警；证书下载增加逐条锁。
- 商城收藏和足迹增加持久错误与重试，真实空态与接口故障分离；移除收藏、删除足迹和清空足迹增加失败提示与操作锁。

## 验证结果

- API 全量回归：75 个测试文件、402 项测试通过；API 生产构建通过。
- H5 构建通过。
- 微信小程序构建通过并完成认证配置补丁。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 下一批

- 继续审计个人设置/安全、商城物流和订单支付结果、课程证书公开验真、移动管理端剩余页面及 PC 后台批量/导出错误恢复。

# 2026-07-14 - 07.04 / 11.03-11.04 安全、设置、支付结果与物流状态治理

- 账号安全页增加加载失败、重新加载和手机号/密码提交状态；手机号验证码仅允许绑定当前已申请的新手机号，手机号发生变化时自动清理旧验证码、验证码令牌和开发验证码，避免旧验证码误用于新号码。
- 设置页补齐会员中心、消息通知和关于页面入口；社区互动页支持从设置页直接进入通知列表。
- 支付结果页对带订单号的成功/失败结果执行服务端订单核验，不再信任 URL 中的成功参数；无订单号的课程已拥有场景增加课程权限核验，避免未登录或伪造参数直接进入学习页。
- 商城物流页增加加载错误、重新加载、物流单号复制保护和 HTTPS/HTTP tracking URL 校验；无效查询地址不再直接打开，包裹物流与履约记录仍保持分区展示。

## 验证结果

- 上述修改已写入计划表 11.03 与 11.04，待本轮 API、H5、微信小程序和差异检查回归。

## 下一批

- 继续抽查移动管理端活动、订单、退款和核销页面，随后审计 PC 后台列表的详情、批量操作、导出、无权限和异常恢复；课程证书公开验真与通知提醒一并补齐。

# 2026-07-14 - 11.02 移动管理端权限与异常恢复

- 手机管理首页将 bootstrap、经营概览和最近活动拆分加载；经营概览失败时统计显示 `--`，最近活动失败时显示错误与重试，不再把接口故障伪装成 0 或空列表。
- 移动 bootstrap 增加 `canManageOrders`，订单查看与线下收款操作按 `order.view`、`order.manage` 分离；只读账号仅显示等待确认提示，不再出现可点击收款按钮。
- 活动预览页增加活动编号校验、加载中、失败重试和无效状态操作拦截。
- 报名拒绝和退款拒绝强制填写原因；通过退款仍允许使用默认审核备注。
- 核销点加载失败改为页面内提示，不再静默降级为空核销点列表。

## 验证结果

- API 全量回归：75 个测试文件、402 项测试通过。
- Shared、API、PC 后台和 H5 全量生产构建通过。
- 微信小程序构建通过并完成认证配置补丁。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 下一批

- 审计 PC 后台列表、详情、批量操作和导出错误恢复；随后补课程证书公开验真入口与通知提醒页面状态。

# 2026-07-14 - 11.01 PC 后台候补、标签、资金与志愿者状态治理

- 统一订单中心的统一资金流水导出和资金一致性检查增加独立操作锁、失败提示和异常明细缺失兜底，避免重复请求与未处理异常。
- 候补管理增加列表错误、活动筛选项部分错误和重试；接口故障不再显示“暂无记录”，补位/取消按行加锁，取消候补强制填写原因并正确处理用户取消弹窗。
- 用户标签和动态人群分群增加标签列表/分群列表持久错误、重试，补齐分群预览、保存、快照加载/创建、行为标签刷新、标签新增/删除的异常处理和操作锁。
- 志愿者档案与服务记录导出增加失败反馈和操作锁；档案、任务报名手机号统一脱敏，证明材料只允许打开 HTTP(S) 或同源相对地址，无效协议直接拦截。

## 验证结果

- PC 后台 Vue 类型检查与生产构建通过。
- API 生产构建通过。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 下一批

- 继续审计 PC 后台剩余列表和导出；补课程证书公开验真入口、课程通知提醒状态，并进入 11.05 响应式与无障碍抽查。

# 2026-07-14 - 07.04 / 10.05 / 11.05 公开验真与课程提醒

- 新增统一公开凭证验真页，支持课程/志愿证书和志愿服务证明两种模式，可输入编号查询，也可从“我的证书”单条直达验真。
- 证书公开验真不再复用包含完整业务快照的个人证书 DTO；新增严格白名单投影，只公开凭证编号、名称、脱敏持有人、状态、发放时间和允许披露的课程字段，撤销后隐藏持有人及课程详情。
- 课程证书缺少 holderName 时使用证书所属用户昵称或手机号生成脱敏显示，不公开用户 ID、手机号、租户 ID、课程 ID、模板 ID 和内部备注。
- PC 课程运营弹窗将评价、答疑、公告和退款改为分区容错；部分接口失败时保留已加载分区并显示重新同步入口。
- 课程公告保存增加标题/内容校验、操作锁和失败处理；发布并通知学员时显示成功/失败数量。学习提醒限制 1-90 天，增加操作锁、取消/失败处理和发送统计。
- 公开验真页在 390×844 和 1280×800 应用内浏览器完成检查，长编号无横向溢出；桌面工作区限制 760px 居中，移动端保持全宽。

## 验证结果

- 新增证书公开白名单测试 3 项；API 全量回归 76 个测试文件、405 项测试通过。
- Shared、API、PC 后台、H5 生产构建通过。
- 微信小程序构建通过并完成认证配置补丁。
- 浏览器无登录打开验真页、证书/服务证明切换、无效编号错误恢复、390px/1280px 响应式检查通过。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 待环境验收

- 当前浏览器使用静态 H5 构建验证页面和错误恢复，尚未连接真实 MySQL 凭证数据；有效证书、已撤销证书和志愿证明真实编号仍需实库与微信真机验收。

## 下一批

- 继续 11.05：课程播放器附件安全、键盘遮挡、超长内容、焦点与无障碍；继续审计 PC 后台课程考核/退款操作锁和导出错误恢复。

# 2026-07-14 - 07.01 / 07.03 / 11.05 课程资源与高风险操作加固

- 课程播放器附件只允许 HTTP(S) 或可解析的同源绝对路径，非法协议和无法解析的相对路径直接拦截；H5 新窗口使用 `noopener,noreferrer`，小程序下载/打开全流程维护操作锁和失败状态。
- 附件名称、公告、答疑长文本补安全换行，避免超长文件名撑破移动布局。
- 课程评价限制 1-5 整数评分和至少 5 字内容；课程提问限制至少 2 字标题和 5 字描述；评价与提问共享提交锁，防止弹窗和网络重试产生重复提交。
- PC 成绩导出增加操作锁和失败反馈；逐题批改增加提交锁、异常恢复，退回补交必须填写原因。
- 证书模板保存增加名称校验、操作锁和失败反馈；课程退款审核增加逐单锁、通过确认、拒绝原因和异常恢复。

## 验证结果

- PC 后台 Vue 类型检查和生产构建通过。
- H5 与微信小程序构建通过，小程序认证配置补丁成功。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 下一批

- 继续 PC 课程题库维护、讲师保存、评价/答疑审核的异常状态；继续移动端真实键盘、安全区、附件下载和课程互动真机验收。

# 2026-07-14 - 07.01 / 07.03 / 11.05 课程运营与移动体验继续加固

- PC 课程管理补齐课程主数据加载失败与重试、讲师保存锁和异常反馈、资源访问审计加载错误、考核/题目/提交记录加载状态与重试入口。
- 课程考核、题目、补考授权、逐题批改、评价审核、评价回复和答疑回复增加输入校验、取消处理、独立操作锁和失败反馈；选择题校验选项、答案来源，多选题至少两个答案，题目分值必须大于 0。
- 移动课程播放器、商城结算、账号安全、移动订单和退款页面补齐底部安全区预留、输入键盘间距、确认键语义、输入长度限制以及超长标题/备注/答复换行，避免刘海屏遮挡和长文本撑破布局。

## 验证结果

- PC 后台 `vue-tsc` 与生产构建通过。
- H5 生产构建通过；微信小程序构建通过并完成认证配置补丁。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 下一批

- 继续审计剩余 PC 列表的详情、批量操作和导出 Promise；随后进入生产运维批次，检查 migration、备份恢复、健康检查、监控、安全扫描、CI 和回滚门禁。

# 2026-07-14 - 12.02 Docker migration 与备份恢复演练

- 修复 `deploy/.env.local-docker.example` 误开 `DB_SYNCHRONIZE=true`，本地 Docker 与生产统一关闭 TypeORM 自动同步；migration guard 和上线清单增加防回归约束。
- API 容器恢复 healthy，`/api/health` 数据库为 up，`/api/health/ready` 返回 ready；Docker CLI 确认全部 migration 已执行。
- 新生成 `backups/mysql/activity_registration-20260714-124901.sql.gz`，SHA-256 为 `40036599C368BC43EE0FD526ACABDCCF7ED211E4E469AE5AE2853D724854BD36`。
- 在独立库 `activity_registration_restore_drill_20260714` 完成恢复；源库和恢复库 199 张表逐表行数无差异，核心订单、钱包和公益金额一致。
- 恢复核对发现 58 条历史公益流水仍为 `legacy_v1` 且缺少哈希；新增 migration `1783780000000-CharityLedgerHistoryBackfill.ts`，复用运行时 SHA-256 规范重建余额、序号、前后哈希和账户头哈希。
- 演练库完成 migration run、逐笔哈希校验、revert、旧态校验和再次 run；随后在备份和停止 API 写入条件下升级源库。源库现为 171 条 migration，公益历史流水 0、缺失哈希 0、校验问题 0。
- 新 API 镜像已重建并恢复 healthy；备份约 2.7 秒、独立库恢复约 21.8 秒、源库维护恢复窗口约 22 秒。

## 验证结果

- API 全量回归：77 个测试文件、408 项测试通过。
- 全部 preflight guard、完整 preflight、Shared/API/PC/H5/微信小程序生产构建通过。
- migration 新增专项：2 个测试文件、14 项通过；公益治理 guard 通过。
- 备份恢复详细证据见 `docs/backup-restore-drill-20260714.md`。

## 下一批

- 审计并处理 API 运行时 3 个 moderate 依赖漏洞；随后继续监控、CI/回滚演练、剩余 PC 状态治理和浏览器全角色验收。

# 2026-07-14 - 12.03-12.05 监控、依赖安全与 API 回滚演练

- `/health/metrics` 新增任务到期、死信、过期处理锁、15 分钟支付回调失败、退款服务商失败、库存异常和资金风险告警指标；指标查询失败单独暴露 `activity_operational_metrics_up=0`，不伪装成业务数量 0。
- 新增 `monitor:health`，支持 health/ready/metrics 聚合、critical/warning 分级、告警指纹去重、恢复事件、JSON 留档和可选 webhook；统一响应包和裸 Prometheus 文本均可解析。
- 运行时依赖统一到 npm 11.6.2；ExcelJS 和腾讯云 SDK 的嵌套 uuid 固定为 11.1.1，最终 Docker 运行镜像审计为 0 漏洞。
- Dockerfile 拆分 `production-dependencies` 阶段，使用 `npm ci --omit=dev` 生成生产依赖，业务代码变化后镜像构建由约 149 秒降到约 35 秒。
- 新增 `drill:rollback:api`，保留 baseline、生成无 HTTP 服务的故障候选、探测 readiness 失败、自动恢复 baseline 并校验容器镜像 ID。
- API 回滚演练通过：故障识别成功，5.82 秒恢复 ready，总演练 14.03 秒，数据库和持久卷未修改。

## 验证结果

- 新增 health controller 2 项测试通过；API 全量回归 77 个测试文件、409 项测试通过。
- 运行时安全门禁、监控 guard、回滚 guard、全部 preflight guard 和 API 构建通过。
- `npm run monitor:health` 正常状态为 `ok`；warning 注入和恢复状态切换通过。
- `deploy/rollback-drill-result.json` 为 `passed=true`；详细证据见 `docs/operations-monitoring-rollback-drill-20260714.md`。

## 下一批

- 继续 PC 后台剩余列表/详情/批量/导出异常恢复审计，并进入浏览器全角色真实 MySQL 流程；同步补后台/H5 静态制品和 Nginx 组合回滚演练。

# 2026-07-14 - 11.01 PC 构建稳定性与运营页面浏览器回归

- 后台 Vite 在 1938 个模块 transform 后曾无诊断退出；确认页面代码可正常产出后，将生产构建改为使用 `node --max-old-space-size=8192` 执行 Vite，并由构建制品 guard 校验，避免资源紧张时重复出现静默退出。
- 优惠码与统一兑换码补齐分区加载、错误重试、输入校验、保存后独立刷新和操作锁；浏览器验证空表单不会提交，页面和弹窗无控制台错误。
- 增长分析补日期范围校验、查询/导出锁和失败反馈；浏览器验证综合增长真实数据、非法日期拦截和筛选重置。
- 活动复盘补活动列表/复盘错误恢复、重试和导出锁；浏览器连接 Docker MySQL 验证活动、漏斗、运营建议和最近评价区正常加载。
- 评价与举报补分区容错、精选、显示/隐藏、成立/驳回、取消处理和逐行锁；浏览器验证评价及待处理举报真实空态、筛选控件和控制台状态。
- 浏览器回归发现“单活动漏斗”仍把分页活动响应当数组使用，导致活动下拉为空；现已兼容数组及 `{ items }` 两种响应并请求 100 条活动，修复后浏览器已显示首个活动、漏斗指标、转化率和邀请榜。
- 保留租户测试账号 `showcase_admin`，密码重置为 `Showcase123456Aa`，所属测试租户为 `qiwai-showcase`（ID 23），供后续全角色验收复用。

## 验证结果

- 后台生产构建连续通过，构建制品包含 Coupons、Funnels、Recaps、Reviews 独立 chunk；构建 guard 通过。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。
- 应用内浏览器使用真实 Docker API/MySQL 完成四页回归，无控制台错误；单活动漏斗缺陷修复前后均有明确复现与验证证据。

## 下一批

- 继续审计 PC 后台剩余列表、详情、批量操作和导出 Promise；优先检查仍直接假设活动/订单接口返回数组的页面，并继续全角色真实 MySQL 浏览器流程。

# 2026-07-14 - 11.01 数据中心、订单、财务与商家治理状态加固

- 数据中心增加主加载持久错误与重试、日期范围校验、指标下钻和经营明细独立错误态；失败时清空旧明细，避免把上一次数据误认为当前筛选结果。
- 活动订单增加列表错误态、代理/商家筛选项失败反馈、导出锁、线下收款逐行锁和取消处理；备注、退款申请与关闭过期订单完成后等待列表刷新，退款原因必填，订单用户手机号默认脱敏。
- 财务对账将主看板与资金异常告警拆分容错；告警加载失败不再拖垮收支、退款和对账主数据。导出、退款审核/拒绝/重试、扫描对账、扫描退款回执和差异处理增加操作锁、必填依据及取消恢复。
- 商家治理新增列表持久错误与重试、可见的 Excel 导出入口、导出锁和批量操作全局锁；批量逐商家执行中断时明确报告已处理数量，避免把部分成功误报为全部失败。商家列表和详情联系人手机号默认脱敏，编辑表单仍保留授权修改能力。

## 浏览器验证

- 租户运营账号实测数据中心真实指标、订单、财务流水、退款和资金告警区均正常加载，无控制台错误；非法日期查询被拦截。
- 财务“扫描对账”确认弹窗取消后按钮恢复可用，无未处理 Promise 或控制台异常，未触发扫描副作用。
- 平台管理员实测商家治理 18 条数据正常加载，新增导出入口可见；列表联系人已显示为 `139****9999` 等脱敏格式，无控制台错误。

## 验证结果

- PC 后台 Vue 类型检查和生产构建通过；1938 个模块完成 transform、chunk 渲染及静态版本写入。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。
- `npm run ci:verify` 全链路通过：运行时依赖审计无 high/critical，API 全量测试、全部 preflight guard、Shared/API/PC/H5 生产构建及微信小程序构建全部成功。

## 下一批

- 执行全量 `ci:verify`；通过后继续审计财务账单导入/拉取弹窗、商家批量权限真实取消流程，以及其余后台页面的未处理 Promise、详情错误态和导出锁。

# 2026-07-14 - 11.01 财务弹窗、援助权限与志愿者操作状态继续加固

- 财务账单导入和自动拉取从第一步开始持有全流程锁，统一校验 `wechat/alipay`、`YYYY-MM-DD`、非空 JSON 数组、交易号、订单号和金额；应用内浏览器分别进入第二步后取消，两个主按钮均恢复可用，无请求副作用和控制台错误。
- 商家治理使用真实 18 条数据筛选并选中 `qiwai-mall-access-guard`，批量停用及批量关闭商城均在确认弹窗取消；操作锁恢复，商家仍为启用、商城仍为已授权，无控制台错误。
- 援助申请补详情加载/重试、敏感查看锁、材料下载锁和审批跟进逐行锁；取消提示框不会再形成未处理 Promise，详情失败不会伪装成空内容。
- 浏览器发现后端、路由和菜单已使用 `aid.view / aid.manage / aid.sensitive`，但 PC 权限白名单漏配，登录时会过滤三项权限并把超级管理员重定向出页面；已补齐权限目录并重新登录验证菜单和路由可访问。
- 援助申请列表、详情和敏感查看仍错误解构 Axios `{ data }`，与项目统一 API 拦截器返回业务数据本身的约定冲突；已统一调用方式，页面从持续报错恢复为真实空态且无控制台错误。
- 新增 `preflight-admin-permission-catalog-guard.mjs`，自动比对 API 与 PC 权限目录，当前 75 项完全一致，并接入全部发布门禁。
- 志愿者档案为状态修改、培训、发证、任务报名、工时确认/驳回/冲销、证明生成、证书撤销和服务登记增加独立操作锁；保存失败重新拉取服务端状态，证书详情增加加载、持久错误和重试状态。

## 验证结果

- PC 后台类型检查和生产构建通过，1938 个模块完成 transform、chunk 渲染和静态版本写入。
- 应用内浏览器验证援助申请权限修复后可直接进入，真实数据库当前无援助及志愿者保留记录，页面正确展示空态且无控制台错误；后续需运行专项多角色验收生成并保留记录后继续详情与审批流程。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。
- `npm run ci:verify` 用时约 156 秒并全链路通过：运行时依赖 high/critical 为 0，API 全量测试、全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建全部成功。

## 下一批

- 继续审计 PC 后台其余列表、详情、批量操作和导出 Promise；优先处理仍缺少逐行锁、详情错误态或取消恢复的公益、广告、结算和账号治理页面。
- 准备援助申请 viewer/manager/sensitive/reviewer 与志愿者多角色专项账号令牌，运行真实 MySQL 验收脚本并保留申请、材料、证书、工时和审计测试数据，再完成浏览器详情、敏感查看、审批分离与撤销流程。

# 2026-07-14 - 11.01.01 后台账号、公益、代理结算与广告中心继续加固

- 后台账号页补管理员列表、商家列表、活动数据范围、邀请列表和会员搜索的持久错误态与重试；撤销邀请、强制下线、复制角色、重置密码和启停操作统一持有逐行锁，取消弹窗不会再产生未处理 Promise；编辑管理员保存增加独立锁。
- 公益池补主加载错误重试、项目审核/状态流转逐行锁、执行动态和拨款记录加载失败重试；拨款申请、复核、付款、取消和动态发布增加重复提交保护、必填校验和取消恢复。公益流水用户手机号默认脱敏，执行凭证改为只允许 HTTP(S) 地址打开。
- 代理结算将确认框纳入统一结算操作锁，取消审核/提交/沙箱打款不会再弹出错误提示；结算列表、代理基础数据、自动打款能力评估和详情核对补持久错误态与重试，详情和上传凭证地址增加安全校验。
- 广告中心补广告主/合同/投放删除、投放启停、广告结算状态和官方收益导入锁；结算日期顺序、收益和曝光点击非负校验补齐；基础数据和广告主列表加载失败可重试，联系人手机号默认脱敏。

## 浏览器验证

- 平台管理员真实 `admin` 会话验证管理员页，开启烟测账号后加载 151 条记录；对 `legacy_admin_20` 执行禁用并取消确认，账号仍保持启用，按钮锁恢复，无控制台错误。
- 租户运营 `showcase_admin / Showcase123456Aa` 进入代理结算，真实显示租户代理能力评估和空结算单；打开“生成结算”后取消，按钮恢复，无副作用和控制台错误。
- 公益池真实加载资金、项目和流水空态，刷新完成后无错误；广告中心真实加载空投放数据，打开新增投放后取消，按钮恢复，无控制台错误。
- 平台管理员访问租户范围代理结算被正确重定向到平台看板，租户范围保护正常。

## 验证结果

- PC 后台 `vue-tsc --noEmit` 和生产构建通过，1938 个模块完成构建。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。
- `npm run ci:verify` 全链路通过，耗时约 146 秒；运行时依赖 high/critical 为 0，API 全量测试、全部 preflight guard、Shared/API/PC/H5/微信小程序构建全部成功。

## 下一批

- 继续审计剩余 PC 页面，优先检查课程、社区、通知、商城结算和支持工单的详情错误态、批量操作及导出锁；随后补齐援助、公益和志愿者真实保留数据的多角色浏览器验收。

# 2026-07-15 - 11.01 商城结算、支付日志与财务总览继续加固

- 商城结算页补齐生成结算、审核、拒绝、打款/扣回、财务调整和逐笔明细的操作锁；确认或输入弹窗取消后统一释放锁，审核意见、拒绝原因和调整依据强制必填，凭证地址继续限制 HTTP(S)。
- 商城支付日志新增租户、授权店铺和主支付数据的持久错误态与页面重试；支付流水、回调、佣金明细、推广人汇总和渠道账单导出使用互斥导出锁，避免重复下载请求。
- 渠道账单拉取、JSON 导入、差异认领、重勾兑、确认解决和忽略接入统一操作锁；处理依据必填，取消二次确认不产生请求或未处理 Promise。
- 单笔/批量佣金结算、风险复核和扣回确认接入统一资金动作锁，行级按钮展示明确 loading；既有结算和扣回业务幂等键保持不变。
- 商城财务总览新增商家、授权店铺和财务主数据的持久错误态与重试；订单、售后、支付流水和结算导出互斥，接口失败不再仅弹一次消息后保留无法判断的新旧数据状态。

## 浏览器验证

- 租户运营 `showcase_admin` 真实进入商城支付日志和财务总览；授权店铺、筛选、导出、支付/退款/佣金/结算区域均加载成功，真实数据库当前无支付、佣金或结算记录，正确显示空态，控制台无错误。
- 平台管理员 `admin` 真实进入商城结算和支付日志；全局监管提示、未选店铺时的生成/账单动作禁用、空结算及空支付数据状态正确，控制台无错误。
- 当前数据库缺少支付、佣金、渠道账单和结算保留记录，因此审核、打款、差异处理和佣金行级动作仍标记为待构造保留数据后复测，不以空态代替资金流程验收。

## 验证结果

- PC 后台 Vue 类型检查和生产构建通过，1938 个模块完成 transform、chunk 渲染和静态版本写入。
- API 全量 78 个测试文件、411 项测试通过；商城多商户、财务对账、导出和高风险操作审计专项门禁通过。
- `npm run ci:verify` 全链路通过，耗时约 327 秒：运行时依赖 high/critical 为 0，全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建全部成功。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。

## 下一批

- 继续审计社区审核、举报、处罚、客服工单和通知模板/计划规则的真实写操作失败恢复；为商城资金中心准备可保留的支付、账单差异、佣金和结算测试数据，随后完成行级资金动作浏览器验收。

# 2026-07-15 - 11.01 社区、论坛与内容治理操作状态加固

- 社区运营页为活动、任务、动态、评论、论坛、举报、关键词、处罚和申诉等 15 路聚合请求增加整页 loading、持久错误态和页面重试；接口失败不再只显示一次消息后把旧数据或空数据当作当前结果。
- 社区举报的隐藏、处罚、驳回，关键词保存/删除，处罚创建/解除，申诉通过/驳回和论坛版主增删接入统一操作锁；处理说明、解除说明和申诉结论强制必填，取消或关闭弹窗后恢复按钮。
- 论坛帖子审核、拒绝、隐藏、置顶、精华、锁帖，回复审核/拒绝/隐藏，论坛举报处理和社区评论审核增加逐行 loading 与防重复提交；拒绝、隐藏、锁帖和举报处理要求填写依据。
- 共修活动、打卡任务、动态和论坛版块删除，以及动态转帖补齐确认阶段锁、逐行 loading 和取消/关闭恢复；确认取消不会再产生未处理 Promise。
- 成员列表和打卡审核拆出独立 loading、持久错误与重试状态；成员通过/拒绝及打卡通过/拒绝增加逐行锁，切换到打卡审核标签时自动加载，不再依赖用户首次手工刷新。

## 浏览器与测试验证

- 平台管理员真实进入社区运营页，聚合数据加载出 4 个共修活动、8 个打卡任务，并正确展示同日重复任务治理告警；内容治理页真实空态正确。
- 打开“新增关键词规则”弹窗后取消，弹窗关闭、按钮恢复可用，未创建规则且控制台无错误。
- 真实打开 `【演示】周末线下共修会` 成员抽屉，接口成功返回空成员；切换打卡审核后自动加载 2 条已通过记录，刷新按钮可用且控制台无错误，未执行删除、转帖或审核写操作。
- PC 后台 Vue 类型检查和生产构建通过，1938 个模块完成构建；共修、内容治理、论坛治理和社区互动 4 个专项测试文件共 12 项通过；`git diff --check` 通过，仅有 Windows 行尾转换提示。

## 下一批

- 准备共修待审成员、待审打卡、举报、处罚和申诉保留数据完成多角色浏览器写流程；继续审计其余 PC 页面和移动端异常状态。

# 2026-07-15 - 11.01.04 商城物流与分类管理操作状态加固

- 商城物流页补商家、授权店铺和物流列表持久错误态及重试；物流查询地址只允许 HTTP(S)，保存增加重复提交保护，启停改为不污染编辑表单的独立请求并增加逐行锁、确认取消恢复和店铺/租户范围参数。
- 活动分类页补持久加载错误和页面重试；停用确认纳入逐行操作锁，取消或关闭不再形成未处理 Promise；编辑、启停和新增互斥，图标与封面上传使用独立 loading，上传期间禁止重复选择或提前保存。
- 商城分类页补商家、授权店铺和分类列表的持久错误态及分区重试；新增分类防重复，行内名称、图标、排序、启停和保存按分类 ID 加锁，加载失败不再清空旧列表并伪装成真实空态。
- 票种管理将活动列表与票种列表拆分为持久错误态和独立重试，筛选刷新不再留下未处理 Promise；保存防重复并等待列表刷新完成，补齐容量、限购、销售起止、早鸟截止、会员价以及阶梯数量/价格/重复阈值校验，新增阶梯默认从上一阈值递增。

## 浏览器与构建验证

- 平台管理员真实加载商城物流 5 条记录，对“自营店履约专线”执行停用并取消：记录保持启用、停用按钮恢复、弹窗关闭且控制台无错误，没有请求副作用。
- 平台管理员真实加载活动分类，对“沙龙”执行停用并取消：分类保持启用、按钮恢复且控制台无错误；验证了原未处理取消 Promise 已修复。
- 商城分类全局模式真实加载 63 条、覆盖 45 个店铺；切换租户 `23`、店铺 `39` 后加载“自营文创”，保存原值时按钮立即禁用，完成后恢复且控制台无错误，更新时间 `2026-07-15 02:40:41` 作为保留测试记录。
- 租户运营 `showcase_admin` 真实加载 10 条票种记录，打开“【演示】个人成长与副业定位活动 / 演示标准票”编辑弹窗后取消，弹窗正常销毁、数据无变化且控制台无错误。
- PC 后台 `vue-tsc --noEmit`、生产构建和 `git diff --check` 通过，1938 个模块完成构建；本批仅涉及 PC 页面，完整 `ci:verify` 留到下一批合并执行。

## 下一批

- 继续审计 PC 后台剩余页面的持久错误态、取消 Promise、逐行/批量操作锁和导出互斥；优先处理公告与营销内容等仍可独立推进的页面。

# 2026-07-15 - 11.01.05 公告与营销弹窗操作状态加固

- 公告列表、公告归属和会员等级选项增加持久错误态与独立重试；保存增加重复提交保护、发布时间/失效时间顺序和指定会员等级必选校验，保存后列表刷新纳入同一完成链路。
- 公告链接及图片 URL 提示框统一增加 HTTP(S)/站内路径校验、操作互斥和取消恢复；图片上传增加类型、5 MB 大小及独立 loading，上传期间禁止保存或关闭；启停、置顶和删除增加逐行锁，删除确认取消不再形成未处理 Promise。
- 营销弹窗列表、归属/会员等级选项和生效检测增加持久错误态及重试；保存增加时间范围、指定会员等级、HTTPS 或 `/uploads/` 图片地址和按钮跳转校验，小程序或全平台投放不再允许普通外链按钮。
- 营销弹窗新增/编辑/上传/启停/删除/生效检测互斥；停用和删除确认从确认阶段即持有逐行锁，取消后恢复；上传限制图片类型及 5 MB，生效检测失败不再只弹瞬时消息后保留旧结果。

## 浏览器验证

- 租户运营 `showcase_admin` 真实加载 1 条公告保留数据；打开公告编辑后进入“插入链接”提示框并取消，链接按钮恢复且无未处理异常；删除公告确认取消后记录仍存在、按钮恢复、控制台无错误。
- 租户运营真实加载 3 条营销弹窗；对“浏览器验收首页弹窗”执行停用并取消，记录保持投放中且按钮恢复；生效检测真实返回“将展示：浏览器验收首页弹窗 / 生效中 / 会被公开接口返回”，未改动曝光、点击或关闭数据。
- 平台管理员全局公告页真实加载 7 条跨租户记录，所属商家列、受众和有效期正常；平台营销弹窗页真实加载 3 条记录，筛选与平台视角正常，两个页面控制台均无错误。

## 验证结果

- `git diff --check`、PC Vue 类型检查和生产构建通过，1938 个模块完成构建；受众规则专项 3 项测试通过。
- 完整 `npm run ci:verify` 用时约 251 秒并全链路通过：运行时依赖 high/critical 为 0，API 全量测试、全部 preflight guard、Shared/API/PC/H5 生产构建及微信小程序构建全部成功。

## 下一批

- 继续审计剩余 PC 页面，优先处理仍只有瞬时错误提示、缺少取消恢复或写操作互斥的列表与详情；随后回到移动管理端、H5/小程序剩余异常状态和多角色保留数据验收。

# 2026-07-15 - 11.01.06 活动状态机与运营操作状态加固

- 活动列表、分类/代理/会员等级元数据、审核记录、活动版本和渠道推广增加持久错误态、独立重试及加载失败后的旧数据保留；接口故障不再伪装为真实空态。
- 编辑、复制、版本恢复、提交审核、通过/驳回、撤回审核、重新上架、定时发布、取消活动、结束活动和下架统一接入全局逐活动操作锁；确认或提示框取消后释放锁，不再产生未处理 Promise。
- 驳回和取消活动原因强制必填；活动取消成功信息展示取消报名、关闭订单和创建退款申请数量，便于运营核对取消后的联动结果。
- 定时发布前端与后端共享同一时间窗口规则：发布时间必须晚于当前时间且早于活动结束时间；新增边界测试覆盖等于结束时间、晚于结束时间和有效窗口。
- 活动“下架”菜单仅在报名中状态展示，与后端允许的状态迁移保持一致；保存、复制和版本恢复删除重复列表刷新，避免额外请求和界面闪动。

## 浏览器验证

- 租户运营 `showcase_admin` 真实加载 25 个活动：草稿 4、报名中 15、已结束 6；复制活动确认取消后总数仍为 25，目标活动仍为报名中，按钮锁恢复且控制台无错误。
- 打开 `【手机验收保留】活动发布 20260711003315` 版本记录，真实接口返回空列表，页面正确显示“暂无版本记录”，没有把错误当空态。
- 对同一活动输入 `2026-07-19 09:00:00`，其活动结束时间为 `2026-07-18`；确认设置时显示“定时发布时间必须早于活动结束时间”，弹窗保持打开且未产生状态变化。
- 对草稿 `【手机验收保留】活动发布 20260706130756` 打开提交审核后取消，记录仍为草稿、操作按钮恢复且控制台无错误。
- 平台管理员此前真实加载 144 个活动：草稿 4、报名中 17、已下架 16、已结束 107；对 `【批量审核验收保留】1783740028878` 打开结束活动确认后取消，记录保持报名中且控制台无错误。

## 验证结果

- 活动生命周期和票价专项共 2 个测试文件、7 项测试通过；API 与 PC 生产构建及 PC Vue 类型检查通过。
- 完整 `npm run ci:verify` 用时约 142 秒并全链路通过：运行时依赖 high/critical 为 0，API 全量 78 个测试文件、412 项测试、全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建全部成功。
- `git diff --check` 通过，仅有 Windows 行尾转换提示。
- 当前 Docker API 容器未更新到本批 API 构建；服务端定时发布边界已经单测和生产构建验证，待下次容器部署后补真实接口回归，不把旧容器结果冒充新后端验收。

## 下一批

- 继续审计剩余 PC 后台页面的持久错误、详情/批量锁、取消恢复和导出互斥，优先从尚未形成独立工作包的页面中选择可完整闭环的一组。
- 同步推进移动管理端活动、订单、退款和核销的真实保留数据流程；外部微信真机或正式通道暂不可用时记录待验收项并继续其他不受阻功能。

# 2026-07-15 - 11.01.07 操作、登录与验证码安全日志加固

- 操作日志在已有动作、管理员、请求编号、日期、商家筛选和服务端分页基础上，增加日期倒置拦截；开始日期晚于结束日期时不请求接口，并区分可重试的接口故障与不可重试的输入校验错误。
- 操作日志请求期间禁用商家筛选、文本筛选、日期、分页、刷新和查询入口，避免筛选变化与分页并发覆盖结果。
- 操作日志和后台登录日志的商家选项拆为独立 loading、持久错误和重试；挂载阶段商家接口失败不再中断主日志加载或形成未处理 Promise。
- 后台登录日志、验证码日志的刷新和查询展示 loading，重置在请求期间禁用；验证码手机号继续默认显示为中间四位脱敏格式。

## 浏览器验证

- 平台管理员真实加载操作日志 3127 条，服务端分页每页 30 条；商家、管理员角色、IP、动作、对象、请求编号和脱敏详情正常显示，控制台无错误。
- 后台登录日志真实统计登录成功 947、登录失败 44、触发限流 0、当前筛选 991；列表按接口安全上限展示 300 条，商家选项和主数据均加载完成，无错误态和控制台错误。
- H5 验证码日志真实统计发送成功 210、发送失败 2、触发限流 0、当前筛选 212；列表加载 212 条，抽查前 20 行仅发现 `136****8784`、`136****8783` 等脱敏手机号，没有发现 11 位明文手机号，控制台无错误。
- Element Plus 日期框通过浏览器控制直接填值只改变了输入 DOM，未提交 Vue 的 `v-model`，因此日期倒置未以这种方式形成有效浏览器验收；保留一次真实日期面板手点复测，不将自动填充结果计为通过。

## 验证结果

- PC Vue 类型检查、生产构建和 `git diff --check` 通过，1938 个模块完成构建。
- 完整 `npm run ci:verify` 用时约 112 秒并全链路通过：运行时依赖 high/critical 为 0，API 全量 78 个测试文件、412 项测试、全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建全部成功。

## 下一批

- 继续审计剩余 PC 后台页面，优先处理仍缺少独立元数据错误态、重复请求锁或筛选校验的简单列表，再回到移动管理端真实退款和核销流程。
- 在可稳定操作 Element Plus 日期面板的浏览器会话中补操作日志日期倒置手点复测；该待验收项不阻塞其他功能继续开发。

# 2026-07-15 - 11.02.01 移动订单、报名与退款分页及请求并发

- 移动订单和报名列表补上一页、下一页、当前页/总页数及记录总数，搜索统一回到第一页，解决接口只返回前 20 条但页面无法访问后续记录的问题。
- 订单、报名和退款请求增加递增请求序号，仅允许最新请求写入列表、总数和错误状态；刷新、搜索、标签切换及翻页期间禁用重复入口，避免慢响应覆盖新筛选。
- 三页均先完成移动管理端权限 bootstrap，再请求受保护数据；报名页补明确的无查看权限状态，退款数据不再在权限未知时提前请求。
- 后台退款接口在提供 `pageSize` 时返回 `{ items, total, page, pageSize }`，页大小上限 100；未提供 `pageSize` 时继续返回旧数组，保障尚未升级的客户端兼容。退款页同时兼容两种响应合同。

## 浏览器验证

- 租户运营 `showcase_admin` 的手机管理首页真实显示 25 个活动、46 条报名。
- 移动订单真实共 46 条，第 1 页显示 20 张卡片和 `第 1 / 3 页`，进入第 2 页后显示另外 20 条。
- 移动报名“全部”真实共 46 条，第 1 页显示 20 张卡片和 `第 1 / 3 页`，第 2 页正常加载；手机号显示为 `139****3301` 等脱敏格式。
- 移动退款“待处理”显示真实空态，“已完成”加载 9 条保留退款；其中 `URF1783728726843218` 对应订单 `OD1783728726692218`，余额退款状态为已完成。三页均无控制台错误，本批未执行退款、收款或报名状态写操作。

## 验证结果

- 退款分页和 DTO 专项 2 个测试文件、19 项测试通过；API 生产构建、移动 H5 构建和 `git diff --check` 通过。
- 完整 `npm run ci:verify` 用时约 122 秒并全链路通过：运行时依赖 high/critical 为 0，API 全量 79 个测试文件、414 项测试、全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建全部成功。
- 已定位 Docker Compose 项目名异常源于空的 `COMPOSE_PROJECT_NAME` 环境值；显式使用 `-p activity-registration` 后，先生成 `backups/mysql/activity_registration-20260715-131543.sql.gz`（0.33 MB），再仅构建并重建 API 服务。MySQL 容器 ID 和 `activity-registration_mysql-data` 卷保持不变，API 健康检查通过。
- 新版真实接口以 `page=1&pageSize=2` 返回 `{ items, total: 9, page: 1, pageSize: 2 }` 和 2 条记录，不带 `pageSize` 仍返回 9 条旧数组；浏览器重新加载后“已完成”页显示全部 9 条保留退款且页面错误日志为空，旧容器待验收项已关闭。

## 下一批

- 推进移动核销保留数据流程，执行双设备并发核销验收，并验证受控离线清单、断网入队、恢复同步和冲突记录；真机能力暂不可用时保留待验收项并继续不受阻功能。
- 后续本地 Compose 命令继续显式使用 `-p activity-registration`，避免空环境变量覆盖项目名；任何结构升级仍先备份并单独执行 migration。

# 2026-07-15 - 11.02.02 移动核销并发、现场概览与受控离线恢复

- 创建保留核销点 `1 / 【验收保留】主会场核销点` 和 `2 / 【验收保留】成长课主入口`，作为移动核销、离线清单和现场统计的持续验收数据。
- 真实执行双设备并发核销：报名 `173` 仅 device-A 成功并生成核销 `89`，device-B 收到 400“已被其他设备核销”；修复验收脚本对统一响应包的解析后，报名 `213` 再次通过并正确报告保留核销 `92`。
- 新增 `npm run acceptance:checkin-offline`：在线签发绑定活动、核销点和设备的限时清单，选择指定报名首次补传，再使用第二设备重放同一签名票；报名 `217` 首次补传生成核销 `91`，第二设备得到明确冲突，清单共 4 张票且有效 8 小时。
- 浏览器核销页首次加载发现现场概览 500；API 日志确认查询连接别名为 `linkedCheckIn`，代码却错误引用 `checkIn.revokedAt`。删除错误别名条件，并在核销统计和最近核销列表统一增加 `checkIn.revokedAt IS NULL`，保证撤销记录不计入实时到场。
- 新增源码回归断言，锁定待核销查询只使用 `linkedCheckIn`，现场核销统计两处必须过滤撤销记录。

## 浏览器验证

- 修复前页面明确显示带请求编号的数据库字段错误，不把接口故障伪装为空态；修复部署后错误面板消失，全局现场概览显示到场 28、待核销 18、核销率 60.9%。
- 在活动选择器中选择 `【演示】国学经典晨读体验营` 后，概览显示到场 11、待核销 0、核销率 100%；核销点加载出 `【验收保留】主会场核销点`，选择后成功下载受控离线清单并显示活动、核销点和有效期，页面错误日志为空。
- 当前活动在三条保留核销完成后无剩余待核销票，因此浏览器下载提示 0 张；有票清单、首次同步及跨设备冲突已由真实 API/MySQL 验收脚本执行并保留记录。

## 验证结果

- `admin.service.spec.ts` 36 项通过，API 生产构建、验收脚本语法和 `git diff --check` 通过。
- 完整 `npm run ci:verify` 用时约 114 秒并全链路通过：运行时依赖 high/critical 为 0，API 全量 79 个测试文件、415 项测试、全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建全部成功。
- 修复版 API 已通过显式 Compose 项目名仅重建 API 并健康运行，MySQL 容器和数据卷未变化。

## 待环境验收

- 微信真机相机扫码、操作系统级真实断网切换、离线存储人工篡改及万级名单性能仍需相应设备或数据规模；代码、策略单测、真实补传和跨设备冲突不因这些外部项停工。

## 下一批

- 继续 11.02 移动活动创建/编辑/预览的保留数据完整流程，并复核移动退款、报名审核和订单线下收款的角色权限边界；随后推进 11.03 H5/小程序账号资产一致性。

# 2026-07-15 - 11.02.03 移动活动分页、编辑校验、状态机与公开预览

- 移动活动列表改为先完成权限 bootstrap，再加载活动数据；增加最新请求序号，旧响应不能覆盖当前筛选。搜索回到第一页，列表新增上一页、下一页、当前页/总页数和总记录数。
- 生命周期操作从打开确认框时即锁定，取消、确认成功和接口失败均释放；成功后等待列表刷新再结束。仅报名中活动显示下架，已下架活动显示重新上架，租户待审活动显示撤回审核，草稿、已结束和已取消不再出现非法下架入口。
- 编辑页普通保存保持报名中、待审、已下架、已取消和已结束的原状态，仅已驳回回到草稿；发布或提交审核仅在草稿和已驳回状态显示，关闭状态不能再通过普通保存直接变草稿或报名中。
- 保存前新增开始/结束/报名截止/优先报名时间顺序、正整数名额、非负两位小数金额、单选/多选至少两项且去重，以及地图、封面、二维码、详情图片 HTTP(S)/系统上传地址校验。
- 保存请求成功但详情刷新失败时明确显示“保存成功，但刷新失败”，不再把成功写入误报为保存失败并诱导重复提交。
- 修复活动时间回填将 API ISO 时间按浏览器时区再次换算的问题；业务年月日时分按服务端字段原值回填，避免每次编辑保存把时间推迟 8 小时。
- 修复编辑页头部装饰伪元素覆盖“预览”按钮的问题：装饰层不再接收指针事件，预览按钮提升层级。权限 preflight guard 已加入移动列表分页、状态操作、编辑状态保护、时间回填和按钮可点击约束。

## 浏览器验证

- 租户运营真实加载 25 条活动，第一页 20 条、第二页 5 条，页码显示 `第 1 / 2 页` 和 `第 2 / 2 页`；创建保留活动后总数变为 26，分页仍正确。
- 已结束活动 `105 / 【演示】个人成长与副业定位课` 编辑页只显示保存、不显示发布；把结束时间改到开始时间之前后，前端显示“结束时间必须晚于开始时间”，未请求保存接口。
- 创建并发布 `145 / 【移动状态机验收保留】完整活动 202607151342`，详情模块、地点、30 个名额和免费规则保存成功，状态为报名中；公开详情显示标题、介绍、10:00-12:00、剩余 30/30 和立即报名，控制台无错误。
- 修复前预览按钮中心命中元素为 `.head`，点击两次均不跳转；修复后命中 `.preview`，可进入移动预览页并继续打开真实公开活动详情。
- 活动 `145` 回到编辑页后时间保持 10:00-12:00，重复保存后仍保持不变。执行下架后列表统计从报名中 16/下架 0 变为 15/1，卡片只显示重新上架；重新上架后恢复 16/0 和报名中。数据库审批日志保留 create、update、close、reopen 四条记录，最终状态为 open。

## 验证结果

- 移动权限 guard、H5 构建和 `git diff --check` 通过。
- 完整 `npm run ci:verify` 用时约 152 秒并全链路通过：运行时依赖 high/critical 为 0，API 全量 79 个测试文件、415 项测试、全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建全部成功。

## 下一批

- 继续 11.02 移动报名审核、订单线下收款和退款处理的多角色权限及保留数据写流程；随后推进 11.03 H5/小程序账号资产一致性与真机待验收项。

# 2026-07-15 - 11.02.04 移动报名、线下收款和退款并发及角色流程

- 报名通过/拒绝、订单线下收款和退款通过/拒绝在打开确认框前立即写入 `actionId`；取消、弹窗调用失败、拒绝原因为空、接口失败和列表刷新结束均释放操作锁，解决连续点击打开多个弹窗的问题。
- 报名、订单和退款列表的异常分支增加请求序号校验，旧请求失败不再覆盖当前筛选的成功数据和错误状态。
- 报名通过/拒绝、线下收款和退款拒绝改为数据库事务内悲观写锁；重复请求命中终态时幂等返回，只有首次认领者发送通知和写审计。线下支付单、订单已付款状态和报名后续状态在同一事务提交。
- 报名详情及上述写入口统一执行活动数据范围校验，阻止仅有租户权限但不在 `activity_ids` 范围内的管理员直接猜测 ID 操作。
- 新增 `npm run acceptance:mobile-admin-writes`，覆盖报名通过、报名拒绝、线下收款和退款拒绝的双设备并发请求，并将报告收敛为状态、请求编号和业务记录编号。
- 浏览器退款通过时发现“业务已完成但接口返回 500”：公益流水实体 eager 加载订单和退款形成循环关联，超过 MySQL 61 张关联表限制。公益流水幂等键查询现显式关闭 eager 关系加载，修复后完整余额退款返回 201。

## 真实数据与并发验证

- 并发报名通过 `229` 和拒绝 `230` 的两次请求均幂等成功；数据库各保留 1 条通知和 1 条操作审计。
- 并发线下订单 `229 / MWOC20260715071611233` 仅生成支付单 `142`、积分来源 `order_paid:229` 和操作审计各 1 条，报名 `233` 流转为已通过。
- 并发退款拒绝 `32 / MWRC20260715071611220` 最终为 rejected，操作审计仅 1 条。
- 浏览器保留报名 `231`、`232`，线下订单 `230 / MWOB20260715071611234`，退款 `33 / MWRB20260715071611219` 和修复回归退款 `34 / MWRF20260715074034219`；两笔余额退款钱包流水 `refund_return:33`、`refund_return:34` 各返还 0.01 元。

## 浏览器角色验证

- `showcase_ops`：报名确认框打开时搜索和其他操作立即禁用，取消后按钮恢复且无请求；随后完成报名 `232` 通过和 `231` 拒绝，待审核数量从 2 变为 0。首页无退款入口。
- `showcase_finance`：线下收款确认框取消后按钮恢复，随后订单 `230` 从待付款变为已付款；退款确认框取消后恢复，退款 `34` 修复回归后返回成功并从待审核列表消失。
- `showcase_checkin`：首页只有活动、报名和核销入口；直达订单页显示“当前账号没有订单查看权限”，直达退款页显示“当前账号没有财务退款查看权限”，无写操作按钮。
- 手机号均保持 `139****0002` 等脱敏格式；最终浏览器 warning/error 日志为空。

## 验证结果

- 部署前生成 `backups/mysql/activity_registration-20260715-150330.sql.gz`（0.33 MB）；修复版 API 通过 `--no-deps` 单独重建，MySQL 数据卷未变，API 和 MySQL 健康。
- `git diff --check` 通过；专项 `admin.service.spec.ts` 39 项和移动角色 guard 通过。
- 完整 `npm run ci:verify` 用时约 116 秒并通过：运行时 high/critical 为 0，API 79 个测试文件、418 项测试、全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建全部成功。

## 下一批

- 继续 11.03 H5/微信小程序业务规则与账号资产一致性，优先审计课程播放器、个人订单/退款和登录态跨端恢复；微信真机相机、真实断网和安全区验收继续保留为外部设备项，不阻塞其余开发。

# 2026-07-15 - 11.03.01 课程登录态、跨端进度和最近学习恢复

- 公共会员请求只在 HTTP 401 时清理本地 token、用户和手机号；业务权限不足返回 403 时保留有效会话，避免进入受限课程或资产后被误登出。
- `user_learning` ORM 元数据补齐数据库已有的用户、课程、小节唯一索引；进度保存使用 MySQL 原子 `ON DUPLICATE KEY UPDATE`，以 `GREATEST` 合并进度并保持完成时间单调，解决两个终端同时首次写入或旧终端晚到覆盖新进度的问题。
- 进度接口拒绝非数字、非有限值和范围外数据；播放器响应增加 `recentLessonId` 和 `learningUpdatedAt`，显式路由小节优先，否则恢复服务端最近学习小节。
- 视频和音频自动保存限制为每小节每 30 秒桶一次，失败后允许该桶重试；播放器补上一节、下一节和外置可访问控制条，返回页面时重新同步课程、考核、公告和答疑。
- “我的内容”直接打开最近学习小节；“我的订单”以服务端 `owned` 为观看权限真值，已付款但退款或撤权的课程不再错误显示“去观看”，从支付、详情或播放器返回时重新加载资产状态。

## 真实并发与浏览器验证

- 保留会员 `230 / 13990014006 / Qiwai123456`、课程 `8 / 【演示】传统文化专题服务`、小节 `13 / 小节 1：内容介绍与参与目标`。
- 真实 MySQL/API 并发写入 68 和 41 后最终为 68，再并发写入 72 和 55 后最终为 72；非法值 `invalid-progress` 返回 HTTP 400，最近学习小节保持 13。此前 35% 进度和本批 68%、72% 演进均保留在现有测试数据中。
- 浏览器从“我的内容”恢复小节 13 和 68%，外部并发更新并刷新后显示 72%；“我的订单”中已拥有课程可进入播放器，返回订单页后数据重新加载。
- 初次浏览器检查发现 H5 原生 `<video>` 覆盖播放器内部上一节/下一节控件；将控制条移至视频容器外并改为带 `role=button`、`aria-label` 的交互元素后，下一节可进入小节 14，上一节可返回小节 13 并恢复进度，最终 warning/error 日志为空。

## 验证结果

- 课程学习并发专项 3 项测试通过，真实并发验收脚本 `acceptance:course-progress-concurrency` 通过，`git diff --check` 通过。
- 完整 `npm run ci:verify` 用时约 155 秒并全链路通过：运行时依赖 high/critical 为 0，API 80 个测试文件、421 项测试、全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建全部成功。
- `activity-api`、`activity-mysql` 和 `activity-nginx` 均健康运行；保留现有数据库、容器卷和全部验收数据。

## 下一批

- 继续 11.03 个人活动订单、退款申请与支付返回状态一致性，核对 H5/小程序的服务端真值、重复提交保护和登录/租户上下文恢复。
- 随后复核课程退款后的学习权限、考核与证书撤销联动；微信真机和正式支付通道仍按外部环境待验收，不阻塞其余开发。

# 2026-07-15 - 11.03.02 活动订单、退款并发和返回状态一致性

- 报名详情由仅首次挂载读取改为每次 `onShow` 重新同步，支付外跳、评价页、订单列表或其他页面返回后不再保留旧订单/退款状态；递增请求编号保证过期响应不能覆盖当前详情。
- 取消报名和退款申请在打开确认框前锁定，弹窗取消、弹窗失败、接口失败和刷新完成后均释放；支付、查单和关单使用统一互斥状态，关单同样从确认阶段锁定，避免多个弹窗或交叉写操作。
- 用户退款申请改为数据库事务内悲观锁定活动订单，再检查退款状态和创建退款；第二设备等待同一订单锁后返回已有 pending/processing 退款和 `idempotent: true`，不存在退款时才创建并返回 `idempotent: false`。
- 新增 `acceptance:registration-refund-concurrency`，验证两个设备并发响应指向同一退款，并再次读取报名详情确认只有一条处理中退款。
- `/public/me/registrations` 增加轻量 `latestRefund` 摘要，不触发退款实体的循环 eager 关系；“我的订单”以服务端退款状态优先展示退款处理中、已退款或退款未通过，并将筛选改为“待处理”，已退款记录可进入“已完成”。

## 真实并发与浏览器验证

- 使用保留会员 `208 / 13990085739 / Qiwai123456`、报名 `205`、订单 `205 / OD1783476637163205 / 59.00 元` 执行双设备并发退款。
- 两次请求均成功并指向退款 `35 / URF1784107906345205 / 56.05 元`；一次实际创建、一次幂等复用。详情和数据库均确认订单 205 只有 1 条 active 退款，状态 pending，公益金 2.95 元按规则保留。
- 浏览器“我的订单”进入报名 205，详情显示退款申请处理中和 56.05 元；打开取消报名确认时按钮立即变为“取消中...”，关闭弹窗后按钮恢复且未取消报名。
- 从详情进入评价页再返回后，API 再次读取报名 205，退款和取消入口状态保持正确；最终订单列表卡片及“待处理”筛选均显示“退款处理中”和申请金额 56.05 元，warning/error 日志为空。

## 验证结果

- 部署前生成数据库备份 `backups/mysql/activity_registration-20260715-171439.sql.gz`（0.33 MB），使用显式 Compose 项目名仅重建 API；MySQL 数据卷和保留数据未变化，`/api/health/ready` 返回 ready，三个容器健康。
- 退款并发与跨端状态专项 4 项测试、API/H5 构建、真实并发脚本及 `git diff --check` 通过。
- 完整 `npm run ci:verify` 用时约 134 秒并全链路通过：运行时依赖 high/critical 为 0，API 81 个测试文件、425 项测试、全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建全部成功。

## 下一批

- 继续 11.03 课程退款后的学习权限、考核记录和证书撤销联动，验证退款申请、审核、完成和失败各状态在 H5/小程序一致呈现。
- 随后复核登录重定向与租户切换后的会员资产恢复；外部微信真机和正式支付通道验收继续单列，不阻塞其余代码开发。

# 2026-07-15 - 11.03.03 课程退款、学习权限、考核与证书联动

- 会员课程退款申请、后台审核和退款完成均改为事务内悲观锁定课程订单；同一订单的并发申请复用 pending、approved、processing 或 failed 退款，并返回明确幂等标记。
- 全额退款完成后仅删除 `user_learning.lessonId=0` 的课程权限行，保留各小节学习进度、考核尝试和答案；撤销该课程有效证书。若用户还有同课程的 paid 或 partially_refunded 订单，则不撤销权限和证书。部分退款继续保留学习权益。
- 考核提交在处理新提交和幂等返回前均检查课程权限，阻止退款前打开、退款后继续提交的旧考核页面绕过撤权。
- `/public/me/course-orders` 返回 `latestRefund`、`refundableAmountFen` 和服务端权威 `owned`；会员订单页支持课程退款申请、审核/处理/失败/驳回/完成状态，确认弹窗阶段即锁定操作并在 `onShow` 刷新。课程详情和证书列表同样在返回前台时重新同步。
- 课程证书签发关闭 eager 关系加载，以 `course_completion:{courseId}:{userId}:{entitlementLearningId}` 作为唯一业务键，并处理唯一键竞争；退款后重新购买会基于新的权限行生成新证书，不复用已撤销证书。
- 浏览器公开验真时发现证书查询加载 eager 关系图导致接口超过 15 秒不返回；改为最小无 eager 查询并增加回归守卫，撤销证书验真恢复到约 293ms。

## 真实并发、数据和浏览器验证

- 保留会员 `230 / 13990014006 / Qiwai123456`、课程 `8 / 【演示】传统文化专题服务`、课程订单 `19 / CO178372872754832CC95 / 299.00 元`。
- 退款前将课程进度写到 100%，证书请求在 82ms 内返回并只生成证书 `8 / CRS-8-230-MRLY2J20-C639 / course_completion:8:230:27`；浏览器订单显示可退 299.00 元和“去观看”，课程详情显示“继续观看”，证书状态有效。
- `acceptance:course-refund-access` 的双设备申请只创建退款 `1 / CRF178411201976019 / 29900 分`，返回一次 `idempotent=false` 和一次 `true`；两次并发财务审核均幂等完成。订单最终为 refunded，`owned=false`，播放器不再报告付费拥有状态。
- 数据库确认课程权限行 27 已删除，小节 13/14 的 100% 进度仍保留；证书 8 保留记录并变为 revoked，没有活动证书；退款单仅 1 条且为 completed。
- 浏览器退款后订单显示“已退款”和权益撤销说明，退款按钮消失；订单打开课程详情而非播放器，课程按钮变为重新加入；证书列表显示“已撤销”，公开验真显示“凭证已失效 / 无效”，隐藏持有人和课程业务详情，warning/error 日志为空。

## 验证结果

- 部署前生成 `backups/mysql/activity_registration-20260715-183152.sql.gz`（0.33 MB），两次仅重建 API，MySQL 数据卷和历史数据未变化；API/MySQL 健康。
- 课程退款访问专项 5 项、课程进度并发专项 3 项、活动退款状态守卫 4 项通过，API 和 H5 构建及 `git diff --check` 通过。
- 完整 `npm run ci:verify` 用时约 121 秒并全链路通过：运行时依赖 high/critical 为 0，API 82 个测试文件 430 项，全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建成功。

## 下一批

- 继续 11.03 登录重定向、租户切换后的会员账号和资产恢复一致性，覆盖旧 token、切换前后缓存、无权限返回和多端状态刷新。
- 微信真机相机、真实断网、安全区和正式支付通道继续作为外部环境验收项记录，不阻塞其余可执行开发。

# 2026-07-15 - 11.03.04 登录回跳、租户切换与会员资产恢复一致性

- 新增安全登录回跳规范化：仅接受合法 `/pages/...` 内部路由，拒绝登录页递归回跳、外部 URL、反斜杠、Hash 和控制字符；结构化保留 status、keyword 等业务参数，删除目标携带的旧 `tenantCode` 并写入当前租户。
- 主页面登录后改为使用完整规范化目标执行 `reLaunch`，不再因去掉查询串而丢失订单筛选或活动搜索条件。
- H5 手动切换城市时同时改写顶层查询和 Hash 查询中的 `tenantCode`，避免复制链接出现两个冲突城市编码。
- 功能开关的进行中请求按租户区分；旧租户请求完成后只有在租户仍一致时才更新响应式状态和本地缓存。页面装修、品牌主题、首页活动与活动列表增加租户和请求代次校验，旧响应、旧失败及旧 finally 不再覆盖当前城市页面。
- 个人中心、订单、课程、钱包、证书和商城订单接入统一租户加载守卫；切换时先清理旧城市可见资产，允许新请求越过旧 loading 状态，并仅由最新且租户一致的请求提交结果。
- 后端“我的证书”和证书下载按用户及 `tenantId` 双重过滤；课程收藏列表、状态和切换先按当前租户查找课程；资料编辑、手机号变更和微信手机号绑定返回当前租户会员档案，避免操作后短暂显示平台级积分或等级。

## 真实 API 与浏览器验证

- 保留会员 `230 / 13990014006 / Qiwai123456`。演示中心 `qiwai-showcase / tenant 23` 返回余额 `721.00`、课程 1、课程订单 2、证书 1；证书为 `8 / CRS-8-230-MRLY2J20-C639 / revoked`。
- 同一 user token 查询杭州 `qiwai-hangzhou / tenant 1` 时，会员范围正确变为杭州，余额 `0.00`，课程、课程订单和证书均为 0；演示中心证书 8 在杭州下载返回 404，课程 8 收藏状态跨租户查询同样返回 404，正确租户分别返回 200。
- 浏览器从演示中心手动切到杭州，确认弹窗明确资产按城市展示；账号保持登录，个人中心积分/成长/余额/报名均显示杭州资产 0，证书页显示暂无证书。
- 从杭州切回演示中心后，顶层 URL 与 Hash 均同步为 `qiwai-showcase`，首页装修与活动恢复，个人中心余额恢复为 `721.00`、课程订单数恢复为 2，撤销证书重新出现。
- 使用登录目标 `/pages/user/orders?status=completed&tenantCode=qiwai-hangzhou` 在演示中心重新登录，最终地址为演示中心且保留 `status=completed`，页面只显示已完成的退款课程订单；浏览器 warning/error 日志为空。

## 验证结果

- 部署前生成 `backups/mysql/activity_registration-20260715-191150.sql.gz`（0.33 MB），只重建 API，MySQL 数据卷和保留数据未变化；API、MySQL 健康。
- 新增会员租户上下文专项 4 项，课程退款专项 5 项保持通过；API 编译、H5 构建和 `git diff --check` 通过。
- 完整 `npm run ci:verify` 用时约 131 秒并全链路通过：运行时依赖 high/critical 为 0，API 83 个测试文件 434 项，全部 preflight guard、Shared/API/PC/H5 生产构建和微信小程序构建成功。

## 下一批

- 继续 11.04 全端加载、空态、错误、断网、无权限与重复提交状态抽查，优先处理尚未接入请求代次保护的社区、论坛、公益和商城详情页。
- 微信真机相机、真实断网、安全区和正式支付通道继续作为外部环境验收项记录，不阻塞其余可执行开发。

# 2026-07-15 - 11.04.01 社区、论坛、公益和商城详情异步一致性

- 社区首页的近期活动、动态和今日打卡分别接入租户请求代次守卫，页面每次返回前台重新读取路由、功能开关、主题、三类业务数据和装修；旧租户或旧刷新响应不再覆盖当前状态。
- 社区详情的动态和评论使用独立守卫，每次 `onShow` 刷新；写评论在确认框打开前即锁定，取消、空内容、弹窗失败、请求失败和成功刷新后均释放。
- 论坛列表的版块和帖子、论坛详情及发布页版块接入独立守卫，快速搜索、筛选、租户切换或重复刷新时仅最新请求可以提交数据、错误和 loading 状态。
- 公益页改为 `onShow` 刷新，整页加载开始时废弃旧分页 token；加载更多提交前同时校验租户、请求代次和预期页码，避免旧页追加到新租户或新列表。
- 商城详情增加主商品 loading、页面级错误与重试，商品加载失败时清空旧商品且隐藏购买栏；秒杀、拼团和团队请求独立校验商品、SKU、团 ID 和请求代次，辅助营销失败显示非阻塞警告，不再用空数组掩盖故障。
- 商城收藏、评价举报和加入购物车增加统一操作锁；举报从弹窗打开阶段锁定，取消、空原因、登录失败和请求结束均释放。
- 新增 `client-state-consistency.spec.ts`，以 `readFileSync` 检查移动端源码合同，未直接 import 移动端模块，避免在 `apps/mobile/src` 生成误编译 `.js` 文件。

## 套餐权益一致性修复

- 浏览器进入演示中心论坛时发现页面仍显示发帖入口，但版块和帖子接口均返回“论坛暂未开放”。根因为 `/public/settings/operation` 只返回配置开关，而论坛接口还校验套餐权益。
- 公开运营配置现对每个功能开关继续合并租户套餐权益，前端入口和服务端接口使用相同最终值。演示中心有效开关中 `forum/forumPost/charity/volunteer` 等受套餐限制的模块均返回 false。
- 浏览器复验社区首页不再显示论坛入口，论坛和公益直达均由现有页面功能守卫回到首页；当前公开租户套餐均未启用论坛与公益，因此启用套餐后的论坛快速筛选和公益分页浏览继续作为数据条件验收，不虚报为已执行。

## 浏览器与验证结果

- 商品 `11 / 【演示】慢π读书手账` 正常展示价格、两个 SKU、库存、商户和 7 条评价；商品 `999999` 刷新后仅显示“商品不存在或已下架”及重新加载，不显示购买栏。
- 社区首页正常展示 1 场近期活动和 17 条动态；动态 `40` 展示 5 条评论，点击写评论后底部按钮立即变为“提交中...”，取消后恢复“写评论”，未创建额外评论。
- 论坛/公益无套餐权限回退、社区论坛入口隐藏均通过；浏览器 warning/error 日志为空。商城加购使用现有会员登录态执行一次并保留测试数据。
- 部署前备份 `backups/mysql/activity_registration-20260715-195549.sql.gz`（0.33 MB）；仅重建 API，MySQL 数据卷和历史测试数据未变化，API/MySQL 健康，配置健康仍仅因正式环境密钥/域名显示 warning。
- 专项源码契约 5 项、API/H5 构建和 `git diff --check` 通过。完整 `npm run ci:verify` 用时约 114 秒：运行时依赖 high/critical 为 0，84 个测试文件 439 项、全部预检 guard、Shared/API/PC/H5 和微信小程序构建成功。

## 下一批

- 继续 11.04 抽查尚未统一请求代次的商城商户页、订单详情、活动评价与志愿/合作申请详情，补齐返回前台刷新、主错误与辅助错误分层以及确认阶段互斥。
- 在具备论坛/公益套餐的租户数据后补快速筛选、帖子详情/发布和公益流水分页浏览；微信真机断网、相机、安全区及正式支付通道继续按外部环境待验收，不阻塞其余开发。

# 2026-07-15 - 11.04.02 商户、商城订单、活动评价和合作页状态一致性

- 商户页的店铺详情、分类、秒杀、拼团和商品列表改为同一批 `Promise.allSettled` 加载并接入租户请求代次守卫；店铺或商品列表失败作为主错误显示页面级重试，分类或营销失败作为辅助警告，删除静默 `.catch(() => [])`。
- 搜索、分类、排序、返回前台和租户切换均只允许最新请求提交；新请求开始即清除旧店铺、商品和营销数据，避免跨租户短暂展示旧商户。
- 商城订单详情新增页面 loading、错误、重试及跨店拆单辅助警告；订单和同结算组订单响应均校验租户、请求代次、订单 ID 与结算组编号。
- 余额支付、微信支付、支付查单、关闭支付、取消订单、整单收货、分包收货统一使用 `activeAction`；关闭、取消和收货确认在弹窗打开前进入 `*-prompt` 状态，取消、弹窗失败、接口失败和成功刷新后均释放。
- 评价、追评、售后补充材料、寄回物流和平台介入增加提交互斥；售后申请沿用既有 `refundSubmitting` 与稳定业务幂等键，上传锁继续独立处理。
- 活动评价页每次 `onShow` 读取本人报名详情，显示活动名称并以服务端报名状态判断评价资格；未完成现场签到时明确禁用提交，加载失败提供重试。成功提交后保持 `submitted` 锁，延迟返回期间不能重复发评价。
- 合作页联系方式每次返回前台重新同步，接入租户请求守卫和错误重试；当前租户套餐未启用 partner，浏览器直达由全局功能守卫回首页。

## 浏览器与保留数据

- 商户 `38 / 慢π自营店` 正常展示 4 件商品、分类、秒杀和拼团；搜索“书签”后仅展示 `【演示】东方美学书签套装`。店铺 `999999` 只显示“店铺不存在或未开通商城”及重新加载。
- 会员 `230 / 13990014006 / Qiwai123456` 的订单 `105 / MO17837287290216EADA1` 正常显示待发货、拼团、地址和商品；订单 `999999` 只显示错误与重试。
- 临时切换会员 `208 / 13990085739 / Qiwai123456`，报名 `205 / approved` 的评价页显示活动名称和“完成现场签到后才能评价”，提交入口不可用；不存在报名显示错误重试。验收后已恢复会员 230 登录。
- 通过商品 SKU 20 创建并保留线下订单 `114 / MO1784118152220E4A98A / 39.00 元 / pending_confirm`。点击取消订单后，确认框打开期间页面按钮立即变为“取消中...”；关闭弹窗后订单仍为待确认收款，未释放库存或改变订单状态。
- 浏览器 warning/error 日志为空；没有具备 partner 套餐的公开租户，因此本批只验证合作页无权限回退，启用套餐后的联系方式错误重试继续作为数据条件验收。

## 验证结果

- `client-state-consistency.spec.ts` 增至 8 项，API/H5 构建和全工作区 `git diff --check` 通过。
- 完整 `npm run ci:verify` 用时约 137 秒：运行时依赖 high/critical 为 0，84 个测试文件 442 项、全部预检 guard、Shared/API/PC/H5 和微信小程序构建成功。
- 本批无数据库结构或 API 运行代码变更，未重建 API 和未额外生成数据库备份；现有 MySQL 数据卷、此前备份和全部测试数据保持不变。

## 下一批

- 继续 11.04 整改志愿者任务页、援助/大使申请页和商户入驻页，拆分公开数据与个人数据错误，增加返回前台刷新、逐操作锁和确认阶段保护。
- 随后抽查课程播放、考核、社区发布和商城结算之外的长尾页面；微信真机断网、相机、安全区、正式支付及未启用套餐模块继续按环境条件验收。

# 2026-07-15 - 11.04.03 志愿、援助、大使和商户入驻状态一致性

- 志愿公开控制器的任务列表、档案申请、任务报名、取消、签到、工时确认和个人中心全部接收 `tenantCode`，统一校验 `volunteer` 套餐权益并向服务层传递租户上下文。
- 任务列表仅返回当前租户任务；任务报名在档案写入前完成租户范围预检，事务锁内再次按 `tenantId` 校验；幂等重放先比较任务租户。个人报名、服务记录和签到记录均按任务租户过滤，取消、签到和工时确认在锁内复核资源租户，签到重放位于用户和租户校验之后。
- 真实有租户任务暴露 TypeORM eager 自关联会让 `find/count` 元数据解析进入 100% CPU 循环。公开任务、报名幂等、重复报名、档案查找、名额统计和个人辅助集合改为显式 QueryBuilder/标量 DTO，不再展开租户实体、大使申请和报名自关联；API 有数据请求恢复稳定，空列表与有数据路径均通过。
- 志愿页拆分任务主错误与个人数据警告，两组请求分别使用租户代次守卫；档案、任务报名、取消、签到和工时确认使用可识别操作锁，取消确认框打开即显示“取消中...”，取消确认后释放，成功写入后清理业务键。
- 援助页增加申请记录 loading/error/retry 和租户请求守卫；材料与补件从打开系统选择器前锁定。申请主体创建后逐份移除成功附件，部分上传失败时保留主体 ID、同一业务键和剩余文件，仅续传附件而不重复创建申请。
- 大使申请改为每次返回前台刷新配置并展示持久提交错误；商户入驻删除申请记录 `.catch(() => [])`，记录失败作为阻塞主错误，会员资料失败作为非阻塞警告，上传从打开图片/类型选择器前锁定。
- 四页 `onShow` 均强制刷新套餐权益并执行当前页守卫，修复标准套餐仍能直达援助和大使表单、直到提交才被服务端拒绝的不一致。

## 真实 API、浏览器与保留数据

- 新建并保留城市伙伴租户 `31 / codex-volunteer-a`、`32 / codex-volunteer-b`，开放任务 `8 / VLT-CODEX-110403-A`、`9 / VLT-CODEX-110403-B`。A 列表只返回任务 8，B 列表只返回任务 9，历史 7 条全局任务不再进入租户结果。
- A 上下文报名 B 的任务返回 404，志愿档案保持 7→7、报名保持 7→7；匿名在 A 报名生成并保留 `档案 8 / 报名 8 / acceptance:110403:tenant-a-apply`。同租户业务键重放返回 `replayed=true`，改用 B 上下文重放仍返回 404。
- 会员 `230 / 13990014006 / Qiwai123456` 在浏览器报名任务 8，保留 `档案 9 / 报名 9 / pending`。页面刷新后显示本人档案和待审核报名；打开取消确认框时按钮即时变为“取消中...”，关闭弹窗后报名仍待审核。
- 商户入驻页确认申请记录加载成功后才显示表单，并正确回填会员联系人。城市伙伴援助和大使申请页正常显示；`qiwai-showcase` 标准套餐直达志愿、援助和大使页均回首页。浏览器 warning/error 日志为空。

## 验证结果

- 部署前备份 `activity_registration-20260715-205021.sql.gz`，保留验收数据后生成最终备份 `activity_registration-20260715-215438.sql.gz`；仅重建 API，MySQL 数据卷和既有数据未清理。
- 新增志愿租户上下文源码合同 6 项，移动端状态合同增至 12 项；专项共 18 项、API/H5 构建和 `git diff --check` 通过。
- 完整 `npm run ci:verify` 用时约 146 秒：运行时依赖 high/critical 为 0，85 个测试文件 452 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。API/MySQL 最终健康，配置健康仅正式密钥、域名和外部通道显示 warning，无 blocking/error。

## 下一批

- 继续 11.04 抽查课程考核、社区发布、商城地址/优惠券及账号资料等长尾页面的主错误/辅助错误、返回刷新、请求代次和逐操作互斥。
- 并行推进 11.05 的 390×844 与桌面视口适配、键盘遮挡、安全区、长文本和无障碍抽查；微信真机相机、真实断网及正式支付通道继续按外部环境待验收。

# 2026-07-15 - 11.04.04 课程考核、社区发布、商城地址/优惠券和账号资料状态一致性

- 课程考核页接入套餐权益与租户请求代次守卫，改为 `onShow` 返回刷新；未提交考次在返回页面时保留作答，已提交考次只刷新结果。结果请求同时校验请求代次和考次 ID，提交确认框打开前即进入 `confirming` 状态并阻止重复确认。
- 社区发布页在返回前台时重新加载套餐和可发布活动，活动、个人心得及旧租户数据按主次错误分层；图片选择前即进入上传锁，返回刷新不清空已填写正文和已上传图片。
- 商城地址页新增主列表错误、重试、租户代次和保存前置条件；删除确认框打开前即设置删除锁，取消或弹窗失败后释放。商城优惠券按租户、状态和商户筛选共同校验请求代次，快速筛选只允许最新结果落地，切租户后旧领取结果不再提示。
- 账号资料页改为 `onShow` 刷新并增加页面加载错误、保存错误和租户代次；加载新租户前清理旧资料，本地头像、微信头像和资料保存互斥，选择器打开前即锁定，提交完成后复核租户仍一致。
- 课程公开考核开始、提交、结果、评价、答疑、公告和课程退款接口统一接收 `tenantCode` 并解析租户上下文；课程、考核和考次必须属于当前租户。考核列表和开始接口改用显式公开 DTO，不再返回完整课程、租户、配置或联系方式实体快照。

## 真实 API、浏览器与保留数据

- 创建并保留课程 `3 / 【演示】国学入门十分钟 / tenant 23`、考核 `1 / 11.04.04 Tenant Context Quiz`、题目 `1/2` 和会员 `230` 的根学习权限 `26`；保留考次 `1 / in_progress`。
- 在 `qiwai-hangzhou` 上下文开始考核返回 404 且考次数保持 0；在 `qiwai-showcase` 上下文创建考次 1，API 容器更新后再次开始只复用该考次。返回的 assessment 仅包含公开标量字段，不含 `tenant` 或完整 `course`。
- 杭州租户读取考次 1 和提交考次 1 均返回 404；数据库仍只有 1 条会员 230、考核 1 的考次，状态保持 `in_progress`。
- 浏览器确认地址删除按钮在确认框打开期间显示“删除中”，取消后地址保留；优惠券快速切换最终只展示最新“已用”筛选；账号资料保存原资料成功；社区发布正确显示无可发布活动。
- 浏览器进入考核 1 后复用第 1 次考次，选择两题并点击提交时，确认框打开期间按钮显示“确认中...”；取消后按钮恢复，刷新仍为第 1 次且没有新增考次。页面 warning/error 日志为空，最终恢复会员 `230 / 13990014006 / Qiwai123456` 和演示中心租户。

## 验证结果

- 新增课程租户上下文源码合同 5 项，移动端状态一致性合同由 12 项增至 16 项；课程退款访问合同 5 项继续通过，专项共 26 项通过，API 和 H5 构建通过。
- 仅重建 API，MySQL 数据卷和现有数据未清理；API/MySQL 健康，配置健康仅正式密钥、域名和外部通道为 warning，无 blocking/error。
- 完整 `npm run ci:verify` 用时约 140 秒：运行时依赖 high/critical 为 0，86 个测试文件 461 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功；全工作区 `git diff --check` 通过。
- 部署前备份 `activity_registration-20260715-222613.sql.gz`，保留考核数据后的最终备份 `activity_registration-20260715-224008.sql.gz`；最终备份 gzip 解压和 schema/考次表检查通过，SHA-256 为 `F60AF7F26FE66673EC96934EA433A35A7491D7ECD1B40A2728FA83FF5134E5FA`。

## 下一批

- 继续 11.04 抽查剩余长尾页面的返回刷新、主/辅助错误、租户请求代次和确认阶段互斥，完成可执行的数据条件验收。
- 同步推进 11.05 的移动/桌面响应式、键盘、安全区、超长内容、焦点顺序和无障碍标签检查；微信真机相机、真实断网和正式支付通道按外部环境待验收，不阻塞其他开发。

# 2026-07-15 - 11.04.05 共学计划、今日打卡、租户隔离和纯日期治理

- 共学计划页从早期单行实现重构为完整状态页面：`onShow` 强制刷新套餐权益并执行页面守卫，主数据接入租户请求代次；切租户或活动时清除旧数据和草稿，同租户同活动返回前台时保留未提交内容、图片和位置。
- 加入、打卡、图片上传和位置选择改为可识别的逐操作锁；图片和位置在打开系统选择器前即锁定，所有完成回调复核租户与活动仍一致。页面增加参数错误、加载错误、操作错误、重试、申请驳回说明、打卡驳回说明、未开始/过期/可补卡/待审核/完成状态和客户端必填校验。
- 共学页面补齐语义按钮、`aria-label`、动态错误播报、安全区、长文本换行、稳定统计栅格和 760px 桌面工作区；活动 `datetime` 用 `Asia/Shanghai` 格式化，不再直接截取 UTC 字符串。
- 今日打卡页改为 `onShow` 刷新，加入套餐守卫、租户请求代次、页面错误/重试、操作租户复核、语义按钮、动态播报、安全区和桌面工作区；接口失败不再被显示成“暂无今日任务”。
- 公开共学详情、加入和提交均接收 `tenantCode`，先解析租户并使用 `exactTenantWhere` 严格匹配租户或平台空租户；错误租户统一 404。活动、成员、任务和打卡改为显式公开 DTO，响应不再暴露邀请码、租户实体、完整活动图或用户 ID。
- 共学打卡提交在事务内锁定任务和既有记录；待审核/已通过重复请求返回同一记录并标记幂等，被驳回记录可沿用原 ID 修改重提。任务 `completedCount` 按当前租户已通过明细重算；后台审核同样在事务内锁定打卡和任务并重算人数。
- 通用今日任务明确限制 `activityId IS NULL`；本人月度记录、今日状态和人数按通用任务及租户过滤，不再把同日共学计划任务混入。通用打卡完成使用任务悲观锁和唯一键兜底，多请求只保留一条记录。
- 真实 API 发现 MySQL `DATE=2026-07-15` 经 TypeORM 在 UTC 容器内水合为 `2026-07-14`。运行连接与 migration 数据源统一增加 `dateStrings: ["DATE"]`，按实体声明直接保留纯日期字符串；同类修复同时覆盖统计日期、结算周期、合同和资质有效期等 DATE 字段。

## 真实 API、浏览器与保留数据

- 创建并保留演示中心活动 `6 / 【11.04.05验收】共学租户隔离计划 / invite`、共学任务 `10 / question / requireApproval`、同日通用任务 `11`、会员 `230` 的成员 `1 / joined`、通用打卡 `3 / approved` 和共学打卡 `4 / approved`。
- 正确租户详情响应不含 `inviteCode` 或 `tenant`；杭州租户读取活动、加入活动和提交任务均返回 404。错误邀请码返回 400，正确邀请码创建成员 1；重复提交任务 10 返回打卡 4 且 `idempotent=true`。
- 运营 `showcase_ops / Qiwai123456` 将打卡 4 驳回并写入原因；会员 230 修改内容后以原 ID 4 重提，运营再次审核通过。任务 10 与通用任务 11 的 `completedCount` 最终各为 1，通用页面只显示任务 11，本月日期为 `2026-07-15`。
- 浏览器中活动起止时间正确显示为上海时区 `2026-07-14 09:00` 至 `2026-07-22 22:00`，共学任务显示 7 月 15 日和已完成；切到杭州只显示带请求编号的错误与重试，未残留演示中心内容。今日页显示 7 月 15 日、已完成、今日 1 人和本月 1 天，warning/error 日志为空。
- 390×844 下两个页面 `scrollWidth` 均未超过视口；1280×800 下共学工作区宽 760px、左右居中且无横向溢出。验收后浏览器恢复演示中心会员 230。

## 验证结果

- 新增共学租户与日期治理合同 7 项，移动端状态一致性合同由 16 项增至 18 项；专项 28 项通过，API/H5 构建和 `git diff --check` 通过。
- 完整 `npm run ci:verify` 用时约 134 秒：运行时依赖 high/critical 为 0，87 个测试文件 470 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。
- 部署前备份 `activity_registration-20260715-230027.sql.gz`；保留验收数据后的最终备份 `activity_registration-20260715-234117.sql.gz` 已通过 gzip、schema 和共学数据检查，SHA-256 为 `2C447F9604A2D8FD80A3F311FF4B168082721B736DFBD05680214D8184F31B64`。
- 仅重建 API，MySQL 数据卷和既有业务数据未清理；API/MySQL 健康，配置健康仅正式密钥、域名和外部通道为 warning，无 blocking/error。

## 下一批

- 继续 11.04 审计搜索、服务中心、课程收藏、内容申诉和设置等长尾页面，补齐返回刷新、主错误、租户请求代次、重复提交保护和真实数据验收。
- 同步推进 11.05 的键盘遮挡、焦点顺序、长输入、超长错误信息和无障碍名称检查；微信真机相机、位置权限、真实断网和正式支付通道继续按外部环境待验收。

# 2026-07-16 - 11.04.06 搜索、服务中心、课程收藏、内容申诉和设置状态一致性

- 搜索页改为 `onShow` 刷新并接入课程套餐守卫、租户请求代次和持久错误重试；搜索历史按租户编码分别存储，补齐语义搜索框、按钮名称、安全区和 760px 桌面工作区。
- 服务中心每次返回前台重新读取装修和运营设置，两组辅助请求使用 `Promise.allSettled`；页面显示商家真实 `offlinePaymentInstructions`，客服复制和合作入口增加操作锁、租户复核、套餐判断及错误恢复。
- 课程收藏页增加 `onShow`、套餐守卫、租户请求代次、加载/错误/重试和安全区，接口故障不再伪装成空收藏。服务端切换收藏在事务内悲观锁定课程及收藏行，并以唯一键冲突作为并发幂等兜底。
- 内容申诉页完成加载、页面错误、操作错误、重试、租户请求代次和稳定请求幂等键；失败后保留同一键重试，成功后才清理。申诉时间使用明确的上海时区两位年月日时分，修复单数字月日被固定截取为 `16:24:` 的浏览器缺陷。
- 内容申诉新增 `businessKey` 和可空 `pendingKey`，分别建立唯一索引；相同 `x-idempotency-key` 重放返回原记录，不同请求键对同一待处理处罚/目标仍复用原记录，审核完成后释放 `pendingKey`。会员处罚和申诉响应改为公开 DTO，不再暴露租户、用户、管理员和幂等字段。
- 设置页的关于和退出弹窗在打开前即设置操作锁，取消、失败和完成路径均释放；退出后的回跳保留 `tenantCode`，所有入口补语义按钮和安全区。

## Migration、真实 API 与保留数据

- 迁移前备份 `activity_registration-20260716-001809.sql.gz`。执行 `migration:run` 后 172 条 migration 全部为 `[X]`；实际执行 `migration:revert` 验证 `businessKey/pendingKey` 两列可移除，再次 `migration:run` 恢复两列及 `UQ_content_appeal_business_key`、`UQ_content_appeal_pending_key`。
- 使用租户运营 `showcase_ops / Qiwai123456` 为会员 `230 / 13990014006 / Qiwai123456` 创建并保留处罚 `1 / active`。同一请求键两次提交和不同请求键的同待处理对象均返回申诉 `1`；运营驳回申诉 1 后成功创建申诉 `2 / pending`，证明审核释放待处理键。
- 正确租户处罚和申诉公开字段检查通过，不含 `tenantId/userId/handledByAdminId/businessKey/pendingKey`；杭州上下文不返回处罚 1，并以处罚 1 提交申诉返回 404。
- 会员 230 对演示中心课程 `3 / 【演示】国学入门十分钟` 同时发起两次收藏切换，两次均成功，结果依次为收藏/取消，最终状态与串行两次切换一致且无 500；恢复为已收藏后 `user_favorites` 仅一条记录。杭州收藏列表不包含课程 3。
- 仅重建 API 容器，MySQL 和 Nginx 未重建，数据卷及既有数据未清理；API/MySQL 最终健康。

## 浏览器验收

- 搜索页展示真实课程、讲师和分类热门词；输入“国学”只返回课程 3，重新进入后历史保留“国学”。
- 服务中心展示慢π演示客服 `13990009999 / qiwai_showcase_service` 和后台真实支付说明，合作入口、退款和开票文案正常。
- 演示中心收藏页展示课程 3；切换杭州后显示“暂无收藏”，没有残留演示中心内容。演示中心申诉页显示处罚 1、驳回申诉 1 和待处理申诉 2；杭州页处罚与申诉均为空。
- 设置页点击退出后按钮即时变为“确认中...”，确认框关闭后按钮恢复且会员仍登录。浏览器最终恢复 `qiwai-showcase` 会员 230 的个人中心。
- 搜索、服务中心、课程收藏、内容申诉和设置五页在 390×844 与 1280×800 的 `scrollWidth` 均未超过视口；浏览器 warning/error 日志为空。

## 验证结果

- 新增内容申诉并发幂等合同 5 项，移动端状态一致性合同由 18 项增至 23 项；三组专项测试共 40 项通过，API 和 H5 构建通过。
- 完整 `npm run ci:verify` 用时约 138 秒：运行时依赖 high/critical 为 0，88 个测试文件 480 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功；`git diff --check` 通过。
- 首次最终备份命令被当前 PowerShell 的本地数据库环境变量覆盖并产生 20 字节失败文件，该文件已删除；显式指定 Docker 容器后生成 `activity_registration-20260716-005330.sql.gz`（353425 bytes）。最终备份已通过 gzip 解压和 `content_appeals/content_user_sanctions/user_favorites` 表检查，SHA-256 为 `7DE450410F101E17F9B90F09D5FD3FFCC8179B3529FFBD2D1F44CC54705256B3`。

## 下一批

- 继续 11.04 审计剩余长尾页面的返回刷新、错误分层、租户请求代次、选择器/确认框前置锁和真实数据条件验收。
- 同步推进 11.05 的焦点顺序、长输入、超长错误、键盘遮挡和无障碍名称检查；微信真机相机、位置权限、真实断网及正式支付/短信/微信通道继续按外部环境待验收，不阻塞其他开发。

# 2026-07-16 - 11.04.07 公告、品牌故事、课程目录、社区互动和会员登录状态一致性

- 公告 API 严格区分租户与平台空租户，增加发布时间、失效时间和游客/登录/会员等级受众的服务端过滤，响应收敛为公开 DTO；课程目录增加服务端标签分类查询，未指定租户不再返回全部租户课程，课程列表只返回公开 DTO，`categoryName` 使用首个标签。
- 社区收藏、消息、消息已读和关注展示按当前租户可见内容过滤；关注目标必须在当前租户存在可见动态，关注列表仅返回展示名，动态公开视图不再展开完整实体或租户实体；`community-social` 纳入 `community` 功能开关。
- 公告、品牌故事、课程目录、社区互动和会员登录增加租户请求代次、返回前台刷新、持久错误重试、语义按钮、安全区和 760px 桌面工作区。品牌配置失败保留默认内容并展示非阻塞警告；登录页增加验证码 60 秒冷却、两位上海时区、输入语义、确认键和安全回跳。

## 真实 API、浏览器与保留数据

- 保留公告 `24-29`：全部用户、登录用户、游客、未来发布、已失效和会员等级 1 六种规则。游客只返回 `24/26`，会员 230 只返回 `24/25/29`；杭州和无租户入口均不返回演示中心公告，未来与失效公告不公开，公告响应仅含 9 个安全字段。
- 演示中心课程目录共 7 门，分类“国学”只返回课程 `3 / 【演示】国学入门十分钟`；杭州和无租户入口返回 0，课程响应不包含租户实体。
- 保留社区动态 `41`、消息 `1`、会员 230 收藏动态 `40` 和关注记录 `1 / smoke-user`；杭州收藏、消息和关注均为空，杭州标记消息 1 已读返回 404。错误密码展示带请求编号的持久错误，正确登录按原参数回跳社区关注页，验证码使用 `123456` 并显示 60 秒冷却。
- 五页在 390×844 与 1280×800 均无横向溢出且无 warning/error。完整 CI 重建 H5 后使用 cachebuster 恢复会员 `230 / 13990014006 / Qiwai123456` 的演示中心个人中心，余额 `721.00`、订单及课程资产正常，1280 桌面视口 `scrollWidth=clientWidth=1280`，控制台 warning/error 为空。

## 验证结果

- 公告/课程/社区公开边界与客户端状态专项 34 项、既有课程租户测试 5 项通过。完整 `npm run ci:verify` 用时约 123 秒：运行时依赖 high/critical 为 0，89 个测试文件 491 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。
- 使用最终源码重建 API，Compose 项目固定为 `activity-registration`，MySQL 数据卷和既有数据未清理。API 与数据库就绪，配置检查 `error=0 / blocking=0`，仅正式密钥、域名和外部通道为 warning。
- 部署前备份 `activity_registration-20260716-013256.sql.gz`；保留验收数据后的最终备份 `activity_registration-20260716-021435.sql.gz` 为 354780 bytes，已完整解压并确认 `announcements/community_posts/community_notifications/community_post_favorites/community_user_follows/courses` 六张表，SHA-256 为 `32AAA31ED29C49F7B59A1874FA3CB1BDEE8B3E09E6A0747A658E71E61EDE2811`。

## 下一批

- 继续 11.04 审计首页、活动订单确认/支付、公告详情和学习资产等剩余长尾页面，补齐返回刷新、错误分层、租户请求代次、确认阶段互斥及服务端公开边界。
- 同步推进 11.05 的键盘遮挡、焦点顺序、超长文本和无障碍名称检查；微信真机、真实支付/短信/微信和正式域名继续按外部环境待验收，不阻塞其他开发。

# 2026-07-16 - 11.04.08 首页、学习足迹、课程订单确认与支付结果状态一致性

- 首页近期活动增加独立 loading、持久错误、重试和动态错误播报；接口故障不再被清空成“无活动”，同租户失败保留旧数据，切租户时清除旧活动。活动与装修改用 `Promise.allSettled` 独立落地，返回前台和位置/手工切租户均使用请求代次保护。
- 学习足迹从首次挂载改为 `onShow` 刷新，增加租户请求代次、跨租户旧数据清理、公开错误脱敏、上海时区两位时间、语义返回/重试按钮和 760px 桌面工作区。
- 课程订单确认页改为 `onShow` 刷新并增加租户请求代次；课程 ID 或租户变化时清除旧课程并生成新的稳定 `clientOrderKey`，同一上下文网络重试继续复用原键。
- 支付结果页每次返回前台自动核验订单或课程权益，并使用租户请求代次拒绝旧响应；关闭订单从确认框打开前即进入互斥状态，取消、弹窗失败和请求完成均释放，提交前再次复核租户没有变化。

## 真实浏览器与保留数据

- 会员 `230 / 13990014006 / Qiwai123456` 在演示中心首页显示 3 条近期活动；学习足迹显示课程 `3 / 【演示】国学入门十分钟`，切至杭州后显示真实空态且无演示中心残留。课程 3 免费确认页和无订单号权益核验结果均正确。
- 通过课程 `5 / 【演示】传统文化专题服务 / 299.00 元` 创建并保留线下课程订单 `20 / pending_payment / offline`。支付结果页打开关闭确认框时按钮立即变为“关闭中...”，取消后恢复且订单仍待确认；杭州上下文读取订单 20 返回带请求编号的 404，不显示订单内容。
- 首页、学习足迹、确认页和支付结果页在 390×844 与 1280×800 均满足 `scrollWidth=clientWidth`，控制台 warning/error 为空。完整 CI 重建 H5 后恢复演示中心会员个人中心，余额 `721.00`、待付款 `2`，资产正常。

## 验证结果

- 客户端状态一致性专项由 28 项增至 31 项，API 与 H5 单独构建通过。完整 `npm run ci:verify` 用时约 117 秒：运行时依赖 high/critical 为 0，89 个测试文件 494 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功；全工作区 `git diff --check` 通过。
- API、MySQL 和 Nginx 容器健康，ready 返回 `api=up / database=up / error=0 / blocking=0`，仅正式密钥、域名及外部通道为 warning。
- 首次备份受本地数据库环境覆盖产生 20 字节失败文件，已在确认路径和大小后删除；显式使用 Docker 容器生成最终备份 `activity_registration-20260716-022731.sql.gz`（354891 bytes），完整解压确认 `courses/course_orders/user_learning` 表和订单 20，SHA-256 为 `9C703CB335C56D1ECB5DEC953A36DD6DA1D48A5905C37BA6FAC1647D8C12ECC4`。

## 下一批

- 继续 11.04 审计活动分享/评价之外的剩余个人资产、公告长内容交互、课程播放器辅助请求和移动管理端长尾状态，按真实数据条件逐项完成。
- 同步推进 11.05 的焦点顺序、键盘遮挡、超长内容和无障碍名称；微信真机和正式支付、短信、微信、域名继续按外部环境待验收，不阻塞其他开发。

# 2026-07-16 - 11.04.09 账号安全、课程播放器和移动管理长尾状态一致性

- 账号安全页从首次挂载改为 `onShow` 返回刷新，增加租户请求代次和跨租户旧资料/验证码清理；资料失败使用脱敏持久错误。换号验证码增加 60 秒前端冷却、操作租户复核和持久操作错误；手机号有效性与发送冷却条件拆分，确保冷却期间仍可提交已取得的验证码。页面补动态错误播报、语义验证码按钮和 760px 桌面工作区。
- 课程播放器的主数据、考核、公告和答疑统一接入租户请求代次；切租户清除旧课程和辅助内容，旧响应不得回填。三类辅助请求独立落地，失败时明确列出失败分区并保留同租户已有可用内容。进度保存绑定租户和小节，评价/提问从首个输入框打开前锁定，提交前复核租户，失败持久展示；公告时间改为上海时区两位格式，页面增加 760px 桌面工作区。
- 移动管理首页、活动、订单和报名列表从 `onMounted` 改为 `onShow` 返回前台刷新；首页增加请求序号和主错误，dashboard/活动辅助失败不再清空已有数据。四页在 900px 以上限制为 760px 工作区，修复 1280px 下搜索、筛选和列表横向铺满导致扫描距离过长的问题。

## 浏览器验收

- 会员 `230 / 13990014006 / Qiwai123456` 的账号安全页正确显示绑定手机号；发送验证码后自动填入 `123456`，按钮显示 `60 秒后重试`，同时“保存手机号”保持可用，本批未实际提交手机号或密码变更。
- 演示中心课程 `3 / 【演示】国学入门十分钟` 播放器显示章节、小节和考核 `1`；打开课程评价弹窗时评价和提问按钮同时显示“提交中...”，取消后恢复且不产生评价。切到杭州后课程 3 只显示“内容不存在或未发布”，没有演示中心内容残留。
- 核销员 `showcase_checkin` 的移动管理首页显示 26 场活动、52 条报名，活动列表分页为 2 页；报名切换“全部”后显示 52 条，手机号脱敏。切换租户运营 `showcase_ops / Qiwai123456` 后显示订单入口和 48 笔订单，手机号继续脱敏。
- 六页在 390×844 与 1280×800 均满足 `scrollWidth=clientWidth`，控制台 warning/error 为空。移动管理 1280px 工作区实测宽 760px、左右居中；完整 CI 后使用 cachebuster 复核租户运营首页和会员中心并恢复演示中心会员。

## 验证结果

- 客户端状态一致性专项由 31 项增至 34 项，API/H5 单独构建和差异检查通过。完整 `npm run ci:verify` 用时约 116 秒：运行时依赖 high/critical 为 0，89 个测试文件 497 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。
- API、MySQL 和 Nginx 容器健康，ready 返回 `api=up / database=up / error=0 / blocking=0`，仅正式密钥、域名和外部通道为 warning。
- 最终备份 `activity_registration-20260716-024529.sql.gz` 为 355013 bytes，已完整解压并确认 `users/courses/course_orders/admin_users/registrations/orders` 六张表和保留订单 20；SHA-256 为 `EF85EA7E5E89BFDD1140C6C1AD93297E3D344D0B76E6A092D76D2C987C9F454E`。

## 下一批

- 继续 11.04 审计移动核销页返回生命周期、活动编辑/预览、个人心得删除确认和证书辅助错误等长尾状态，逐项补齐并使用现有数据验收。
- 同步推进 11.05 的焦点顺序、相机/键盘安全区和桌面工作区；微信真机相机及正式支付、短信、微信、域名继续按外部环境待验收，不阻塞其他开发。

# 2026-07-16 - 11.04.10 移动核销、活动编辑预览、个人心得和证书状态一致性

- 移动核销从首次挂载改为页面显隐生命周期：显示时加载并启动 5 秒概览轮询，隐藏时停止扫码、轮询并废弃旧请求；概览、核销点和页面加载分别使用请求代次。活动切换会清理旧结果并重新加载核销点与概览，离线清单下载、离线同步和核销错误改为持久错误。
- 活动编辑深度监听表单、字段、主办方和详情模块，区分初始化水合与真实修改；返回预览后保留未保存草稿，仅在没有修改、保存或上传时刷新。图片选择前设置互斥锁，加载请求加入代次；预览页改为每次返回前台刷新并拒绝旧响应。
- 个人心得增加租户请求代次、跨租户清理和持久操作错误；删除锁在确认框打开前设置，取消、弹窗失败和请求结束均释放，删除前后复核租户。证书辅助接口失败时保留同租户已有勋章和证明，下载增加持久错误及租户、证书 ID 复核；两页时间统一为上海时区。

## 浏览器、数据与验证

- 使用租户运营 `showcase_ops / Qiwai123456` 和会员 `230 / 13990014006 / Qiwai123456` 验收；保留活动 `145 / 【移动状态机验收保留】完整活动 202607151342 / open`、心得 `41 / approved / deletedAt NULL`、证书 `8 / CRS-8-230-MRLY2J20-C639 / revoked` 和课程订单 `20 / pending_payment`。
- 核销工作台显示到场 30、待核销 20、核销率 60%。活动 145 临时追加未保存标题，进入预览后返回草稿仍保留且数据库原标题不变；心得 41 打开删除确认时按钮立即显示删除中，取消后恢复且数据库不变。演示中心显示证书 8，杭州租户为空且无跨租户泄露。
- 五页在 390×844 与 1280×800 均无横向溢出，桌面工作区为 760px。完整 CI 构建后以 `t=110410final` 复核核销页，控制台 warning/error 为空；浏览器最终恢复演示中心会员 230 的个人中心。未申请相机权限，微信真机扫码保留为外部条件验收。
- 客户端状态一致性合同由 34 项增至 38 项。完整 `npm run ci:verify` 用时约 149 秒：运行时依赖 high/critical 为 0，89 个测试文件 501 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。
- API、MySQL 和 Nginx 容器健康，ready 返回 `api=up / database=up / error=0 / blocking=0`，仅正式密钥、域名及外部通道为 warning。最终备份 `activity_registration-20260716-030814.sql.gz` 为 355013 bytes，完整解压后确认 `activities/community_posts/certificates/check_ins/course_orders` 五张表及四项保留数据，SHA-256 为 `A0ED027EA3C9D62E8D4A3EF70719B7F057449E6247F2B9E0D91F24E66D3E9273`。

## 下一批

- 继续 11.04 审计移动管理登录、活动编辑剩余选择器、个人证书真实下载和其他个人资产页的返回刷新、错误分层、租户请求代次及互斥状态。
- 同步推进 11.05 的焦点顺序、键盘遮挡、超长错误和无障碍名称检查；微信真机相机、真实文件下载及正式支付、短信、微信、域名继续按外部环境待验收，不阻塞其他开发。

# 2026-07-16 - 11.04.11 移动管理登录与退款审核状态一致性

- 移动管理登录将失败从 toast 改为带请求编号的持久错误区，增加账号/密码语义标签、密码显示切换、输入长度、提交中状态、安全区和 760px 桌面工作区；成功后仅保存管理账号名，不再以会员手机号作为管理账号默认值。
- 移动退款页从首次挂载改为每次返回前台强制刷新权限和列表，认证跳转纳入加载异常路径；主加载错误和审核操作错误分层。审核确认打开前锁定，取消、弹窗失败和请求结束均释放，提交前复核管理 token 及租户，时间使用上海时区，桌面工作区限制 760px。

## 浏览器、数据与验证

- 运营 `showcase_ops / Qiwai123456` 正确显示无财务退款查看权限；错误密码登录持久显示“用户名或密码错误”和请求编号。财务 `showcase_finance / Qiwai123456` 显示待审核退款 `35 / URF1784107906345205 / 56.05 元`。
- 打开“通过退款”确认时搜索与处理按钮立即互斥，取消后按钮恢复；数据库复核退款仍为 `pending / 56.05`，未产生退款业务写入。两页在 390×844 与 1280×800 均无横向溢出，桌面工作区 760px，控制台 warning/error 为空；完整 CI 后用 `t=110411final` 再次复核并恢复会员 230 的演示中心个人中心。
- 客户端状态一致性合同由 38 项增至 40 项。完整 `npm run ci:verify` 用时约 117 秒：运行时依赖 high/critical 为 0，89 个测试文件 503 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。
- 最终备份 `activity_registration-20260716-031825.sql.gz` 为 355091 bytes，完整解压后确认 `admin_users/admin_login_logs/refunds/orders` 四张表、财务与运营账号及退款单，SHA-256 为 `C05AF98240A7774C8B8A92A789492B9E4DE410B6E3D68F0CE754B5568DDC0903`。

## 下一批

- 继续 11.04 审计个人报名详情、课程/论坛个人列表和活动编辑剩余选择器，补齐旧响应保护、主辅错误、返回刷新和确认阶段互斥。
- 同步推进 11.05 的焦点顺序、键盘遮挡、超长错误和无障碍名称检查；微信真机相机、真实文件下载及正式支付、短信、微信、域名继续按外部环境待验收，不阻塞其他开发。

# 2026-07-16 - 11.04.12 报名详情、个人内容、活动选择器和登录响应安全

- 报名详情以租户编码和报名 ID 建立加载上下文，切租户或换报名时立即清理旧详情，旧响应不得回填；支付、退款、取消、关单、查单和签到码统一捕获租户、报名和订单上下文并在请求前后复核。业务错误改为持久错误区，装修和业务数据每次返回前台独立刷新，时间统一上海时区。
- 论坛个人记录接入租户请求代次，跨租户清理旧帖子/回复/收藏；同租户单项接口失败保留已有数据并标记失败分区，套餐未启用时按功能守卫回首页。我的课程补错误脱敏、语义标签、安全区和 760px 桌面工作区；活动编辑的商家、分类、代理、会员和字段类型选择器在保存或上传期间禁用。
- 真实密码登录 API 验收发现响应直接返回用户实体，包含 `passwordHash`。验证码、密码和微信登录现统一经 8 字段白名单 DTO 返回，仅含 ID、昵称、头像、手机号、来源、最近渠道、微信绑定标记和微信 AppId；不再暴露密码哈希、openid、unionid、内部时间等字段。

## 浏览器、API 与保留数据

- 使用会员 `122 / 13990000002 / Qiwai123456` 验收报名 `234 / approved` 和订单 `230 / paid`：详情正确显示报名状态、订单、客服、报名信息和签名签到码；打开取消确认时按钮立即显示取消中，取消后恢复，数据库报名仍为 `approved`。
- 切换杭州读取报名 234 返回带请求编号的 404，页面不包含演示中心活动标题。会员 230 的课程 3 正常展示，论坛套餐关闭时个人论坛直达回首页。报名和课程在 390×844 与 1280×800 均无横向溢出，桌面工作区 760px；最终恢复会员 `230 / 13990014006 / Qiwai123456`，控制台 warning/error 为空。
- 重建 API 后真实密码登录只返回 `id,nickname,avatarUrl,phone,sourceChannel,lastLoginChannel,wechatBound,wechatAppId`，`passwordHash/openid` 均不存在。登录边界合同覆盖验证码、密码和微信三种流程。

## 验证结果

- 客户端状态一致性合同由 40 项增至 42 项，公开内容边界由 6 项增至 7 项；旧报名退款刷新合同升级为租户上下文守卫合同。完整 `npm run ci:verify` 用时约 119 秒：运行时依赖 high/critical 为 0，89 个测试文件 506 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。
- 最终备份 `activity_registration-20260716-034343.sql.gz` 为 355125 bytes，完整解压后确认 `users/registrations/orders/user_learning/forum_topics` 五张表、会员 122/230、报名 234 和活动 145，SHA-256 为 `6B79C2140668A8DBC5A361518D2C8D2C413BF1738A5E6AC578A9D52C1090987F`。

## 下一批

- 继续审计剩余个人资产和活动详情长尾，重点检查公开响应实体泄露、文件下载响应头、返回刷新、错误分层和跨租户旧内容清理。
- 同步推进 11.05 的焦点顺序、键盘遮挡、超长错误和无障碍名称；微信真机、正式支付/短信/微信/域名和对象存储继续按外部环境待验收，不阻塞其他开发。

# 2026-07-16 - 11.04.13 公开活动交易响应、钱包与证书下载安全

- 活动、报名、订单、退款、票种、会员等级、候补、钱包、钱包流水、支付结果、优惠券和领取记录统一改为显式白名单 DTO。报名创建、详情、取消、退款申请、余额支付和优惠券领取不再直接返回 TypeORM eager 实体；活动资格规则不公开黑名单手机号，钱包流水不公开账本哈希、幂等键和关联对象，支付结果不公开业务快照及内部对账字段。
- 证书下载文件名移除控制字符、路径字符并限制长度；响应使用 RFC 5987 UTF-8 文件名与固定 ASCII 回退名，并增加 `Cache-Control: private, no-store`、`Content-Security-Policy: sandbox`、`X-Content-Type-Options: nosniff` 和 `X-Download-Options: noopen`。运营设置预检守卫同步从旧的“展开后删除字段”合同升级为显式白名单合同。

## API、浏览器与验证

- 会员 `122 / 13990000002 / Qiwai123456` 的报名 `234`、订单 `230`、钱包和 16 条流水真实响应扫描 `passwordHash/openid/unionid/businessSnapshot/providerPayload/checkInCode/idempotencyKey/previousHash/entryHash/smsAccessKeySecret` 均为空；杭州租户读取报名 234 返回 404。会员 230 的证书 `8` 下载返回 200，UTF-8 文件名和全部安全头实际生效。
- 报名详情仍正确展示票种、订单、报名资料和签名签到码；钱包仍显示余额 `721.00`、累计充值 `800.00`、累计消费 `79.00` 及流水。两页在 390×844 与 1280×800 均满足 `scrollWidth=clientWidth`，控制台 warning/error 为空；浏览器最终恢复会员 `230 / 13990014006 / Qiwai123456` 的演示中心个人页。
- 公开内容边界合同由 7 项增至 10 项，退款并发、支付适配和客户端状态专项共 120 项通过。完整 `npm run ci:verify` 用时约 129 秒：运行时依赖 high/critical 为 0，89 个测试文件 509 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。API、MySQL 和 Nginx 健康，ready 为 `error=0 / blocking=0`。
- 最终备份 `activity_registration-20260716-042044.sql.gz` 为 355254 bytes，完整解压为 2891302 bytes，并确认 `users/registrations/orders/refunds/user_wallets/wallet_transactions/certificates`、会员 122/230 和报名 234；SHA-256 为 `B5583575B876505269E8164851435DCEDFF10F1B81D3C054FADEF4CC3188A34C`。

## 下一批

- 继续 11.04/11.05 审计其余公开个人资产、上传与下载端点、长文本、焦点顺序和无障碍名称，并对可复现缺口直接整改。
- 微信真机以及正式支付、短信、微信、域名和对象存储继续按外部环境待验收，不阻塞其他不依赖外部配置的开发。

# 2026-07-16 - 11.04.14 上传签名、课程考核与论坛个人资产安全

- 新增统一上传文件签名检测，覆盖 JPG、PNG、WebP、GIF 和 PDF。会员头像、报名附件、商城评价/售后图片、商户资质、社区动态图片以及后台活动图片/结算凭证均要求声明 MIME 与实际文件魔数一致；文件名移除控制字符与路径字符，存储键加入租户、会员或管理员作用域，公开响应不再返回 `path/key/provider`。
- 对象存储配置改为统一归一化；配置缺失、远端 SDK 失败和公开访问域名缺失均返回稳定、脱敏的 503，不再向客户端暴露 `Region is missing` 等 SDK 内部错误。上传预检守卫同步覆盖公开、社区、商城、后台上传和安全失败处理。
- 课程考核尝试、答案、退款、评价、答疑、公告、学习进度和新发证书，社区评论/举报以及论坛版块、个人回复/收藏、新回复统一改为白名单 DTO。课程查询在无租户时严格匹配平台空租户，指定租户时严格匹配当前租户；论坛不再公开完整租户实体、管理员登录名或 eager 用户实体。
- 课程考核页补功能关闭和请求代次失效后的错误/重试兜底；租户切换后不再出现只剩标题的空白页面。

## API、浏览器与验证

- MIME 欺骗攻击使用声明为 `image/png` 的脚本文本：会员评价图片端点和平台后台图片端点均返回 400，未进入对象存储。真实 PNG 上传只返回 `url,size,mimetype`；演示中心和杭州对象键分别包含 `mall-reviews-t23-u230`、`mall-reviews-t1-u230`，验证租户/会员作用域。
- 会员 `230 / 13990014006 / Qiwai123456` 的课程 `3`、考核 `1`、考次 `1` 返回尝试字段仅为 ID、次数、状态、成绩和时间，不含 `userId/courseId/assessmentId/reviewedByAdminId`。杭州读取考核返回 404；动态 `40` 的 5 条评论只返回安全作者视图。浏览器正确恢复第 1 次考次和两道题，本批未提交答案；杭州上下文显示可重试错误且不泄露题目。
- 考核页在 390×844 与 1280×800 均满足 `scrollWidth=clientWidth`，控制台 warning/error 为空；完整构建后恢复会员 230 的演示中心个人页，余额 `721.00`。
- 公开内容边界合同由 10 项增至 14 项，新增上传签名 7 项。完整 `npm run ci:verify` 用时约 130 秒；独立复核为 90 个测试文件 520 项，运行时 high/critical 为 0，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。API、MySQL、Nginx 健康，ready 为 `error=0 / blocking=0`。
- 最终备份 `activity_registration-20260716-050851.sql.gz` 为 355433 bytes，完整解压为 2893441 bytes，确认 `users/courses/course_assessments/course_assessment_attempts/course_assessment_answers/course_refunds/forum_replies/forum_favorites/community_post_comments/admin_login_logs` 和保留考核数据；SHA-256 为 `BDFAC405E48824348613D6538E6D96B8251DBC6EB3D3ABAE76462228D2F64347`。

## 下一批

- 继续审计商城公开订单/售后/商户申请和 V1 公开内容的 eager 实体、敏感字段与精确租户边界，并直接修复可复现缺口。
- 继续 11.05 的焦点顺序、长文本、键盘与无障碍检查；正式对象存储、支付、短信、微信、域名及真机仍按外部环境待验收，不阻塞其他开发。

# 2026-07-16 - 11.04.15 商城与 V1 公共响应边界

- 真实接口确认增强活动直接展开活动实体，公开了租户联系人、手机号、套餐和交易配置；活动 `13` 的评价展开完整用户和报名对象，包含手机号、登录渠道、签到码、报名答案及 `passwordHash/openid/unionid` 字段；会员 230 新建并保留商户入驻申请 `1`，创建响应展开申请人密码哈希、微信字段、完整租户配置和后台审核人 ID。
- 增强活动改为显式字段 DTO，只返回租户、分类、代理和会员等级公开摘要；资格规则移除 `blacklistPhones`。活动评价、创建评价、评价举报和分享访问全部改为安全 DTO，手机号仅在无昵称时脱敏显示。分享海报不再回退完整手机号。
- 分享归因不再信任请求体 `userId`，控制器只使用访问令牌解析的会员 ID；邀请码查询同时绑定当前活动，跨活动邀请码不会关联或增加次数；来源和场景统一清洗并限制长度。
- 商户申请创建和本人列表统一公共 DTO，不返回申请人、内部用户 ID、后台审核人或租户配置；商城评价举报返回安全回执。公开商城商品移除审核意见、提交/审核时间，会员本人评价移除后台追评审核人。
- 标准 Docker 备份和恢复脚本改为使用 MySQL 容器当前实际凭据及目标库，避免 `deploy/.env.production` 与运行容器凭据不一致导致备份/恢复失败；非 Docker 模式继续使用显式 `DB_*` 凭据。

## API、浏览器与验证

- 修复前已实际捕获活动租户配置、评价用户/报名和商户申请密码哈希；修复后活动 `100`、评价活动 `13`、商户申请 `1` 的响应扫描敏感字段命中数为 0。错误租户读取评价返回 404。
- 匿名请求提交伪造 `userId=230` 和成都活动邀请码到演示中心活动 `100`，安全响应仅含 `id,recorded,createdAt`；保留访问记录 `13` 的 `visitorId/inviteCodeId` 均为空，邀请码访问数保持 `1 -> 1`。
- 活动详情在 390×844 和 1280×800 均满足 `scrollWidth=clientWidth`，标题、讲师和内容分区完整，控制台 warning/error 为空；浏览器最终恢复会员 `230 / 13990014006 / Qiwai123456` 的演示中心个人页，余额 `721.00`。
- 公开内容边界合同增至 17 项。完整 `npm run ci:verify` 用时约 135 秒：90 个测试文件 523 项，运行时依赖 high/critical 为 0，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。API、MySQL 和 Nginx 健康，ready 为 `error=0 / blocking=0`。
- 标准 `npm run db:backup` 已在不覆盖凭据的情况下成功。最终备份 `activity_registration-20260716-053015.sql.gz` 为 355850 bytes，完整解压为 2894295 bytes，包含商户申请、活动评价和分享边界测试数据；SHA-256 为 `F249B4D78CC82614647D4ACEB89E0E8746E4E7416CCB2209B79B96C068BA6C61`。

## 下一批

- 继续审计商城公开优惠券、秒杀、拼团、商品评价和个人营销资产的 DTO、租户归属及并发边界，发现可复现缺口直接整改。
- 同步推进 11.05 的焦点顺序、长输入、键盘遮挡、超长错误和无障碍名称检查；正式对象存储、支付、短信、微信、域名和真机继续按外部环境待验收，不阻塞其他开发。

# 2026-07-16 - 11.04.16 商城营销公开边界与不可用券体验

- 真实接口确认商户 `38` 的公开优惠券直接返回后台 DTO，包含 `usageLimit/issuanceLimit/claimedCount/usedCount/refundReleasePolicy/enabled/createdAt/updatedAt`；演示中心公开秒杀和拼团返回总库存、已售库存、后台状态、排序及内部时间。商品评价把脱敏展示名同时放入 `phone`，并公开固定的审核状态。
- 新增独立公开优惠券视图，领取中心、本人券包和券码校验不再返回全局发行、领取、使用、退款回收和后台状态字段；仍保留前台所需的面额、范围、时效、每人限制、可领取余量和运行状态。后台管理继续使用完整 DTO。
- 秒杀和拼团的总库存、锁定库存、已售库存、后台状态、排序及创建/更新时间仅在后台调用 `includeInternalStock=true` 时返回；公网只返回可售库存、活动价格、限购、时效和运行状态。公开商品评价只返回安全昵称，不再伪装手机号或返回审核状态。
- 本人券包增加 `unavailable` 聚合筛选，覆盖 `expired/disabled/not_started/claimed_out`；兼容旧 `expired` 查询并同时返回过期和停用券。优惠券 H5 标签补 `tablist/tab`、`aria-selected`、Enter/Space、加载播报、错误 alert、重试及领取/使用无障碍名称。
- 商城多商户预检守卫从旧的“仅锁定库存不公开”升级为优惠券全局账务、秒杀/拼团全部内部库存和管理元数据均不公开的合同。

## API、浏览器与验证

- 修复后商户 `38` 的优惠券顶层仅保留 18 个公开字段；演示中心秒杀和拼团分别仅保留 14/15 个公开字段；商品评价不含 `phone/status`。杭州租户携带演示中心店铺 `38` 查询优惠券、秒杀和拼团均返回 404。
- 运营账号 `showcase_ops` 创建并保留优惠券 `13 / BOUNDARY0716055523 / 【验收】不可用券分组测试`，会员 `230` 领取记录为 `25`，随后运营停用。`status=unavailable` 返回一条 `disabled` 记录，券视图未命中全局计数、退款策略或账号敏感字段。
- 浏览器点击、Enter 和 Space 均可切换“可用/不可用”标签；不可用页正确显示测试券和“已停用”。390×844 与 1280×800 均满足 `scrollWidth=clientWidth`，长券名不溢出，控制台 warning/error 为空；最终恢复会员 `230 / 13990014006 / Qiwai123456` 的演示中心个人页，余额 `721.00`。
- 公开内容边界合同增至 19 项。完整 `npm run ci:verify` 用时约 131 秒：90 个测试文件 525 项，运行时依赖 high/critical 为 0，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。API、MySQL 和 Nginx 健康，ready 为 `error=0 / blocking=0`。
- 最终备份 `activity_registration-20260716-060041.sql.gz` 为 356454 bytes，完整解压为 2896607 bytes，包含测试券和领取记录；SHA-256 为 `18536E18136DFC6AF58E8F30E5D1E3D0BB36CF5B0D6F15512811BD7D71C80E29`。

## 下一批

- 继续审计商城推广码归因、报价/结算响应和营销风控公开边界，并验证重复推广、自购、跨店和跨租户场景。
- 同步推进 11.05 的商城详情/结算焦点顺序、键盘遮挡、长输入、错误播报和无障碍名称；正式支付、短信、微信、对象存储、域名和真机继续按外部环境待验收。

# 2026-07-16 - 11.04.17 商城推广归因、签名报价与支付响应边界

- 推广码进入商城报价 DTO 和 HMAC 签名载荷。报价阶段校验租户、启停、有效期和结算店铺，返回安全的推广名称、适用店铺、自购佣金资格和提示；提交时重新解析当前推广码并与签名报价比较，报价后新增、删除或替换推广码均拒绝下单。
- 跨店结算继续只把店铺推广码传给所属店铺子单，其他子单不保存推广码；自购在归因风控快照中标记 blocked，支付完成后的佣金生成入口再次按买家/推广人 ID 拦截并写幂等订单事件，不产生可结算佣金。
- 商城微信支付公开响应改为显式最小字段。真实支付参数只允许 `tradeType/h5Url/codeUrl/appId/timeStamp/nonceStr/package/signType/paySign`，不再返回服务端 callbackPath、routing、tenantId、tenantName、merchantScope 和 `mall*` 路由扩展；沙箱仅在顶层保留本地回调路径及签名参数，供本地验收回调使用。真实支付预检守卫同步升级为公开参数白名单合同。
- H5 结算页新增推广码校验按钮、待校验状态、自购不计佣提示和无效码持久错误；修改推广码立即使旧报价失效。加载、地址、支付方式、报价和提交错误增加 `status/alert/aria-live`，地址、领券、券片、重试和提交补键盘语义，四类输入补无障碍名称，提交失败可持久重试，桌面工作区限制 760px。

## API、数据库与浏览器验收

- 保留推广码 `3 / SELFBOUND07160615 / 店铺 38 / 推广会员 230`；自购报价返回 `commissionEligible=false` 和“本人推广码可记录来源，但自购不产生佣金”。删除推广码后沿用原报价提交返回 400，数据库 `tamperOrders=0`。
- 保留跨店结算组 `8 / MCG1784153782133DB74DD`，两个子订单为 `115/116`，只订单 115（店铺 38）保存 `SHOWMALL5`，订单 116（店铺 39）无推广码；重复 `clientOrderKey` 返回同一结算组，数据库仅一组两单。
- 保留自购线下订单 `117 / MO1784153782713A6F82F / paid / 39.00 元`。运营确认线下收款后佣金记录为 0，订单事件存在一条 `promotion_attribution_blocked`；会员钱包仍为余额 721.00、累计充值 800.00、累计消费 79.00。
- 正式微信支付发起在当前环境被 `WECHAT_PAY_PRIVATE_KEY_PATH 文件不可读取` 挡板拒绝，未创建支付测试单；代码、适配器专项和公开响应合同均通过，正式证书挂载与真实小额支付继续作为外部配置验收，不影响其他开发。
- 浏览器在 390×844 验证推广码修改后提交禁用、合法自购提示、无效码请求编号错误和清空恢复；在 1280×800 验证 760px 居中工作区，两种视口均 `scrollWidth=clientWidth`，控制台 warning/error 为空。最终恢复会员 `230 / 13990014006 / Qiwai123456` 的演示中心个人页，余额 `721.00`。

## 验证结果

- 专项 3 个测试文件 35 项通过；完整 `npm run ci:verify` 用时约 118 秒：运行时依赖 high/critical 为 0，90 个测试文件 528 项，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。API、MySQL、Nginx 健康。
- 最终备份 `activity_registration-20260716-063834.sql.gz` 为 359067 bytes，完整解压为 2916120 bytes，确认推广码、跨店结算组、订单、佣金表以及本批三个业务编号，SHA-256 为 `C726B76624A3B373F2384DD5F6542E919488DF2243B7E087E85D7287E4F22D0F`。

## 下一批

- 继续审计商城支付状态查询/关单、会员订单列表和支付任务 DTO 的长尾边界，重点检查正式渠道失败后的前端恢复、跨店部分支付和订单过期状态一致性。
- 同步推进 11.05 其余页面的焦点顺序、键盘遮挡、长错误和无障碍名称；正式支付、短信、微信、对象存储、域名和真机继续按外部环境待验收，不阻塞其他功能开发。

# 2026-07-16 - 11.04.18 商城支付查单关单、跨店部分支付和会员订单状态一致性

- 商城单订单与跨店结算组的支付查单、关单统一改为显式白名单 DTO，仅返回渠道、模式、业务单号、渠道流水号、金额、公开状态、本地状态、状态文案和下一步操作，不再返回渠道 `raw`。已支付、已发货、完成、退款中、已退款和已关闭订单直接返回本地可信状态，避免正式支付证书暂不可用时连本地结果也无法查询。
- 新增跨店支付状态纯函数：全待付款为 `pending`，全关闭为 `closed`，全支付类状态为 `success`，支付类与待付/关闭混合为 `partial`。`partial` 不再调用统一支付补偿，避免部分子订单已入账后重复整体入账。
- 跨店关单支持“部分子订单已关闭、其余仍待付款”的恢复路径；剩余待付款子单在同一个数据库事务内加锁、关闭，并释放库存、优惠券和积分。结算组、租户和会员均参与查单/关单绑定，跨租户和跨会员 ID 猜测返回 404。
- 会员订单列表显式加载 `merchant`、`merchant.tenant`、`checkoutGroup` 和 `coupon`，修复按跨店结算组聚焦时因关系缺失而显示 0 单。订单列表和详情补齐加载、持久主错误、持久操作错误、重试、返回刷新、操作互斥、确认框前置锁、租户/订单上下文复核、键盘语义和无障碍名称；时间统一为 `Asia/Shanghai`，桌面工作区限制 760px。

## API、浏览器与保留数据

- 会员 `230 / 13990014006 / Qiwai123456` 查询自购订单 `117 / MO1784153782713A6F82F` 返回 `success / paid`，查询跨店结算组 `8 / MCG1784153782133DB74DD` 返回安全本地状态，两者均不含 `raw`。杭州租户读取订单 117 返回 404，其他会员读取结算组 8 返回 404。
- 会员 `227 / 13990014003 / Qiwai123456` 对已关闭订单 `112` 重复关单返回 `already_closed / 已关闭，无需重复操作`，响应不含渠道原始报文。
- 浏览器跨店列表正确显示两个子订单、合计 `75.00`、待确认 `2`，店铺 38/39 均正确；取消确认打开时两个订单操作均锁定，取消后恢复且数据库不变，Enter 可切换“待确认”标签。订单 115 详情正确显示跨店拆单，列表和详情时间均为上海时间 `2026-07-15 22:16`。390×844 与 1280×800 均无横向溢出，宽屏页面及底部操作栏为 760px，控制台 warning/error 为空。

## 验证结果

- 新增跨店支付状态纯函数测试，并扩展公开响应边界、客户端状态一致性和商城多商户预检合同。完整 `npm run ci:verify` 用时约 152 秒：91 个测试文件 533 项，运行时依赖 high/critical 为 0，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。
- API、MySQL 和 Nginx 健康。最终备份 `activity_registration-20260716-070732.sql.gz` 为 359074 bytes，完整解压为 2916120 bytes，确认 `mall_checkout_groups/mall_orders/mall_payment_transactions` 以及 `MCG1784153782133DB74DD`、`MO1784153782713A6F82F`，SHA-256 为 `27DA565E49EC188D2FDDB6490C62735E74870D7E0BFA0DE762D0871CC7C137CE`。

## 下一批

- 继续审计商城正式渠道失败恢复、跨店支付任务展示、待支付订单过期任务与库存/优惠券/积分释放一致性，发现可复现缺口直接整改。
- 继续 11.05 其余页面的焦点顺序、键盘遮挡、超长错误和无障碍名称；正式支付、短信、微信、对象存储、域名和真机继续按外部环境待验收，不阻塞其他开发。

# 2026-07-16 - 11.04.19 跨店支付任务展示、统一支付入口和结算组详情安全

- 修复跨店结算组已有统一微信支付接口、但支付任务始终标记“各子订单独立支付”且会员订单详情完全不展示任务的矛盾。新增 `GET /public/me/mall/checkout-groups/:id`，服务端同时绑定租户、会员和结算组；其他会员或其他租户猜测 ID 均返回 404。
- 支付任务公开 DTO 增加 `canCombinePayment`、`requiresSeparatePayment` 和 `combineBlockedReason`，仍不返回支付配置诊断明细及内部收款路由对象。结算组余额与平台代理微信标记为可统一支付，商户直收微信和线下确认标记为必须逐店处理。
- 商城订单详情新增支付任务区，逐店展示收款路径、收款主体摘要、金额、状态、不可用原因和下一步操作。完整待付的平台代理微信结算统一走结算组支付、查单和关单，并隐藏容易制造部分支付的子单入口；已经部分支付、商户直收或线下收款仍按子单处理。
- 商城发布门禁新增会员结算组详情路由、租户上下文和支付任务合并决策字段合同，客户端状态合同增加任务展示及组级支付/关单入口检查。

## API、浏览器与验证

- 会员 `230 / 13990014006 / Qiwai123456` 读取结算组 `8 / MCG1784153782133DB74DD`，返回两个子订单和两个安全支付任务；店铺 38/39 均为线下收款、`canCombinePayment=false`、`requiresSeparatePayment=true`、待线下确认。会员 227 读取返回 404，杭州租户读取返回 404。
- 浏览器订单 `115` 正确展示两家店铺的支付任务、收款路径、金额、状态和逐店确认原因；本批未执行确认收款、取消或关单，订单和结算组状态保持不变。390×844 的 `scrollWidth=clientWidth=390`，1280×800 页面及底部操作栏均为 760px，控制台 warning/error 为 0。
- 专项 3 个测试文件 68 项、API 编译、H5 构建和商城预检通过。完整 `npm run ci:verify` 用时约 130 秒：91 个测试文件 533 项，运行时依赖 high/critical 为 0，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。
- API、MySQL、Nginx 健康。最终备份 `activity_registration-20260716-073647.sql.gz` 为 359100 bytes，完整解压为 2916100 bytes，确认商城结算组/订单/支付交易表、两个保留业务编号和会员手机号，SHA-256 为 `54511E35C129D1B109C980228B00A9E18EFB04F4A5963F3215E1911151AD3D21`。

## 外部验收与下一批

- 当前正式微信私钥未挂载，数据库也暂无待付微信跨店结算组，因此组级统一微信调起仍为外部配置待验收；代码、路由、构建和状态门禁均已完成，不阻塞后续开发。
- 下一批继续执行待支付订单过期任务与库存、优惠券、积分释放一致性验收，并审计任务单条失败记录、重试和监控可见性；同步推进 11.05 其余页面的键盘、长错误和无障碍检查。

# 2026-07-16 - 11.04.20 跨店优惠释放、积分库存一致性和自动过期任务可观测性

- 修复跨店优惠券使用记录只挂在一个锚点子单上造成的两类风险：先关闭锚点、后关闭其他子单时可能永远不释放；部分子单已经支付时关闭锚点又可能提前释放。服务端现根据每个子单分摊快照中的 `couponDiscountFen` 识别实际受益订单，仅当全部受益子单均为 `closed/refunded` 时，按整组订单查找唯一使用记录并释放。旧数据没有分摊快照时保守等待整组终态。
- 新增 `mallCheckoutCouponReleaseEligible` 领域规则及测试。关闭过程继续在订单事务内完成状态、库存、促销库存、优惠券和积分处理；使用记录、领取使用次数及券总使用次数均保持幂等。
- 自动过期扫描不再静默吞掉所有异常：精确返回 `closedCount`、`skippedConcurrentCount`、`failedCount` 和受限失败明细。并发已支付/已关闭单独计数；仍处于待处理状态的真实失败写入 `mall.order.auto_close_failed` 操作审计，非业务异常不回传内部错误。
- PC 后台“清理超时订单”展示检查、关闭、并发跳过和失败数量，存在失败时列出订单号并提示查看操作日志。商城自动关单定时任务严格受 `ORDER_CLOSE_WORKER_ENABLED=true` 控制，修复健康检查显示关闭但商城任务仍无条件执行的配置矛盾；手动清理接口不受开关影响。

## 真实数据一致性验收

- 创建并保留平台券 `14 / EXPIRY07160747 / 【验收】跨店过期释放一致性券`，会员 230 的领取记录为 `26`。
- 整组关闭场景：结算组 `9 / MCG17841593387593F79D6`，订单 `118/119` 均分到 5 元券优惠和 5 积分抵扣。先关闭锚点订单 118 后，使用记录 `22` 仍为 `used`，会员积分从 29 只返到 34，SKU 20 锁定库存恢复；关闭订单 119 后使用记录只释放一次，券 `usedCount=0`、领取 `usedCount=0`、积分恢复 39，SKU 1/20 锁定库存均回到基线，结算组为 `closed`。
- 部分支付场景：复用同一张券创建结算组 `10 / MCG1784159414467755878`，订单 `120/121` 均获得券和积分分摊。订单 120 确认线下支付、订单 121 关闭后，结算组为 `partial_paid`，使用记录 `23` 仍为 `used`，券和领取使用次数均为 1；SKU 20 库存实际扣减 1、SKU 1 锁定释放。积分最终为 `39 - 10 抵扣 + 33 支付奖励 + 5 关闭返还 = 67`，与四条业务动作一致。
- 自动扫描场景：创建订单 `122 / MO1784159458745789CF6`，将测试截止时间设为过去后调用平台清理接口，返回 `checked=1 / closed=1 / skippedConcurrent=0 / failed=0`。订单关闭、SKU 1 锁定库存从 2 回到 1，并写入 `mall.order.auto_close` 审计。

## 浏览器、测试与备份

- PC 后台平台管理员按订单号搜索订单 122，正确显示“已关闭”和“超过 1440 分钟未确认收款，系统自动关闭”；确认收款、发货和关闭按钮均禁用，筛选只命中一条，控制台 warning/error 为 0。本批未再次触发清理。
- 专项规则/边界 25 项、API/PC 构建、商城及订单任务门禁通过。完整 `npm run ci:verify` 用时约 141 秒：92 个测试文件 536 项，运行时依赖 high/critical 为 0，全部 preflight guard、Shared/API/PC/H5 和微信小程序构建成功。
- 最终备份 `activity_registration-20260716-080714.sql.gz` 为 362416 bytes，完整解压为 2952925 bytes，确认商城结算组、订单、优惠券使用、库存和积分表及本批三个业务编号；SHA-256 为 `2957FEF17AA40E953E1CDB367238D48928D5920A3CB8F2B5EE669E17D56EF9D5`。

## 下一批

- 继续审计商城自动任务重入、批次超过 50 单的续扫和监控指标，并验证优惠券全额退款、整组混合退款/关闭的最终释放行为。
- 同步推进 11.05 其余 PC/H5 页面长文本、焦点、键盘和无障碍抽查；正式微信支付、短信、对象存储、域名和真机继续按外部环境待验收。

# 2026-07-16 - 11.04.21 自动任务续扫、混合退款终态与 MySQL eager 关系整改

- 商城过期订单扫描新增 `MALL_PENDING_ORDER_BATCH_SIZE`（默认 50、最大 200）和 `MALL_PENDING_ORDER_MAX_BATCHES`（默认 20、最大 100），按已尝试 ID 续扫，返回 `batchCount/batchSize/maxBatches/hasMore`；周期任务增加 `previous_cycle_running` 防重入，自动关单、物流、自动完成、拼团、退款和售后扫描统一在一个周期内收口。
- 新增配置已覆盖 API、Docker 本地/生产模板、Compose、运行时健康检查、doctor、preflight 和上线清单；订单 worker guard 与 Compose 环境 guard 通过。
- 临时 `batchSize=1` 真实创建并保留结算组 11（订单 123/124）和结算组 12（订单 125/126），后台清理接口返回 `closedCount=2/checkedCount=2/batchCount=2/batchSize=1/hasMore=false`，两笔订单均关闭且库存锁定释放。
- 真实退款验收发现并修复三类缺陷：MySQL BIGINT 金额读取为字符串导致用户售后详情报错；退款审批锁定与售后明细 eager 关系展开超过 MySQL 61 表连接上限；TypeORM 对带 eager 关系的交易实体 save 触发同类连接问题。修复为金额字符串安全归一化、无关联行锁、分步外键加载和定向 update，并补充金额回归测试。
- 订单 120 全额退款 `33.75` 元，订单 121 已关闭；审批成功后订单 120=`refunded`、结算组 10=`closed`、券 14 与领取 26 使用次数均为 0、会员 230 积分为 39、SKU 20 库存回补 1。用户侧订单详情和售后明细正常返回。
- 专项金额/退款/优惠释放测试 11 项通过，API 编译与最新容器部署通过；调试日志已移除。待收尾：完整 `npm run ci:verify`、最终备份、浏览器恢复会员会话并继续 11.05。
2026-07-16 - 11.04.21 收尾与 11.05 会员中心无障碍抽查

- 补齐 `deploy/.env.production` 的商城过期订单批处理参数，完整 preflight guard 通过。
- 分拆 CI 验证：运行时 high/critical=0，API 537 项测试通过，全部 preflight guard、Shared/API/PC/H5/微信小程序构建通过；组合 `ci:verify` 超过单次工具时限，分拆结果无失败项。
- 生成并校验最终备份 `backups/mysql/activity_registration-20260716-093333.sql.gz`，SHA-256 `FE9B7FABE245CAA4EF194101C7951F558253B2549777F0E8873505B62DA2351A`，GZip 完整解压 2,985,250 bytes。
- API、MySQL healthy，`/api/health/ready` 返回 `ready=true`；正式短信、微信支付、对象存储、生产密钥等仍是外部配置项。
- 会员 230 浏览器页面恢复完成：手机号 `13990014006`、余额 `721.00`、积分 `39`，控制台无 warning/error。
- `apps/mobile/src/pages/user/my.vue` 补齐入口键盘 Enter/Space、tabindex/aria-label、重试播报、兑换码确认键与键盘间距、760px 宽屏工作区、安全区和长文本换行。
- 移动管理登录、订单、报名页补齐刷新/重试/搜索/筛选/分页/审核/收款的键盘语义、动态状态播报、输入键盘间距、长度限制、安全区和长文本约束。
- H5 浏览器回归：订单页横向宽度等于视口、9 个可聚焦控件、控制台无 warning/error；会员中心恢复手机号 `13990014006` 与余额 `721.00`，控制台无 warning/error。
- 微信小程序构建通过，生成 `apps/mobile/dist/build/mp-weixin` 并保留授权配置修补结果。
- 移动管理退款页补齐刷新、重试、搜索、状态筛选、分页、通过/拒绝的键盘语义和状态播报，增加安全区、760px 工作区与长文本约束；H5 构建通过，浏览器无横向溢出、控制台无 warning/error，会员 230 页面已恢复。
- 移动管理核销页补齐活动/核销点选择、离线清单下载/同步、扫码、手工核销、错误重试的键盘语义、输入长度和键盘间距、动态状态播报、安全区及长文本约束；H5 与微信小程序构建通过，浏览器无横向溢出、控制台无 warning/error，最终会员页面恢复手机号 `13990014006`、余额 `721.00`、积分 `39`。
- 活动编辑页补齐预览、步骤标签、加载错误重试、表单标题/介绍/地点语义、报名开关、公开链接、底部导航与保存按钮的键盘操作和状态语义，增加输入长度、键盘间距、安全区、760px 工作区与长文本约束；H5 构建通过。浏览器加载保留活动 `145`，12 个可聚焦控件、12 个标签控件、无横向溢出和控制台错误；财务验收账号无写权限，保存按钮按权限禁用，未修改测试数据。
- 活动预览页补齐加载错误重试、公开链接复制、打开预览的键盘语义和动态错误播报，增加安全区、760px 工作区与长链接换行；H5 构建通过。浏览器验证活动 `145`，3 个可聚焦控件、3 个标签控件、无横向溢出和控制台错误，会员 230 页面已恢复。
- 公开活动详情与报名页补齐地图/邀请/通知/客服/报名操作、票种/支付方式、优惠码/积分、报名字段、附件和提交按钮的键盘语义、动态状态、输入长度、键盘间距、安全区与长文本约束；H5 构建通过。活动 `145` 详情页 6 个可聚焦控件、报名页 3 个可聚焦控件，均无横向溢出和控制台 warning/error；会员 230 页面恢复且数据未改变。
- 课程订单确认与支付结果页补齐返回、错误重试、支付方式、支付状态刷新、关单、继续操作和底部动作的键盘语义、状态播报、安全区、760px 工作区与长文本约束；H5 构建通过。浏览器只读验证课程 `3` 确认页 2 个可聚焦控件、保留课程订单 `20` 支付结果页 3 个可聚焦控件，均无横向溢出和控制台 warning/error；会员 230 页面已恢复。
- 课程详情与播放器补齐返回/分享、课程标签、评价重试、收藏/加入、播放器上一节/下一节、目录、考核、进度完成、评价和提问的键盘语义、状态播报、安全区、760px 工作区与长文本约束；H5 构建通过。浏览器只读验证课程 `3` 详情页 7 个可聚焦控件、播放器 10 个可聚焦控件，均无横向溢出和控制台 warning/error；会员 230 页面已恢复。
- 学习中心、证书和账号安全页补齐返回、课程切换、加载/下载错误、证书验真/下载、验证码和手机号/密码保存的键盘语义与状态播报；课程列表错误重试、证书证明验真和安全操作增加明确标签，保留输入长度与验证码冷却规则。H5 构建通过。浏览器验证我的课程 5 个、证书 3 个、安全页 2 个可聚焦控件，均无横向溢出和控制台 warning/error；会员 230 页面已恢复。
- 会员设置、资料、论坛列表/详情补齐返回、入口导航、搜索/版块筛选、帖子详情收藏/举报/回复、资料保存和退出登录的键盘语义、错误播报和操作状态；商城订单原有状态锁与按钮语义保持。H5 构建通过。浏览器验证设置页 7 个、论坛列表 5 个、商城订单 21 个可聚焦控件，均无横向溢出和控制台 warning/error；会员 230 页面已恢复。
- 社区动态详情补齐返回/刷新、点赞/评论/收藏/关注/举报、评论重试、复制链接和海报入口的键盘语义与状态播报；商城订单详情补齐拆单同步、售后材料、寄回物流、平台介入和换货收货入口的键盘语义，保留原有售后状态机和幂等锁。H5 构建通过。浏览器验证社区动态 `40` 详情页 10 个、商城订单详情页 2 个可聚焦控件，均无横向溢出和控制台 warning/error；会员 230 页面已恢复。
- 社区发布和论坛发布页补齐返回/刷新、活动/版块选择、错误重试、图片上传、表单输入和提交按钮的键盘语义、长度限制、键盘间距、安全区与长文本约束。H5 构建通过。浏览器验证社区发布页 6 个、论坛发布页 2 个可聚焦控件，均无横向溢出和控制台 warning/error；会员 230 页面已恢复，未提交新内容。
- 商城订单详情的评价、售后申请和售后补充弹窗补齐星级选择、评价/原因/金额/物流输入、图片凭证上传、取消和提交的标签、长度限制、键盘间距及状态语义；H5 构建通过。浏览器只读验证订单 `105 / MO17837287290216EADA1 / paid`，页面无横向溢出和控制台 warning/error，订单状态及数据未修改；会员 230 页面已恢复。
- 阶段性全端回归通过：API `92` 个测试文件、`537` 项测试全部通过；全部 preflight guard 通过；微信小程序构建通过并保留授权配置修补结果。当前页面整改未写入数据库，保留测试数据不变。

# 2026-07-16 - 12.02/12.04 备份恢复、依赖安全和验证码防刷整改

- 新增数据库恢复流 `scripts/lib/sql-definer-sanitizer.mjs`，恢复时仅移除 mysqldump 的 `/*!50017 DEFINER=...*/` 元数据，使普通业务账号可以在独立恢复库重建触发器；补充分块输入、截断输入和触发器保留测试。此前恢复演练暴露的 `SUPER/SET_ANY_DEFINER` 错误已修复。
- 当前备份 `backups/mysql/activity_registration-20260716-131331.sql.gz` 已生成并通过 GZip 解压校验，SHA-256 为 `68FAD7406FFA8358E077AD544132AC052B346B72445B332A1ABA452AD3680F22`，解压数据 `2,988,764` bytes；私有数据备份 `private-data-20260716-115949.tar.gz` 也已在隔离目录恢复。
- 恢复库 `activity_registration_restore_drill_20260716` 逐表核对 `199/199` 张基础表无行数差异，订单、支付、退款、钱包、商城和公益金额分（fen）汇总全部一致；共 `172` 条 migration，最后一条回退后重跑成功，恢复库 API ready 验证不影响源库。
- 新增只扫描 Git 跟踪/未忽略源码的 `scripts/secret-scan.mjs`，接入 `security:secrets`、GitHub Quality Gate 和 `preflight-security-guard`；本轮扫描 `994` 个源文件，无凭据模式命中。API、PC、H5 和小程序生产依赖审计均为 0 high/critical。
- 移动端保持已验收 UniApp 版本，采用兼容的底层依赖 overrides（Babel 7.29.7、Intlify 9.14.5、esbuild 0.25.0、jpeg-js 0.4.4、phin 3.7.1、PostCSS 8.5.19、ws 8.21.1）；Node 22 下 H5 与微信小程序构建均通过。增加 Node 22 前置检查，避免 Node 25 导致小程序 worker 原生崩溃。
- 动态安全验收：会员 `230 / 13990014006` 的脚本伪装 PNG、MIME 不一致 PNG、超限文件、无授权上传分别返回 `400/400/413/401`；受控当前时间验证码记录返回 `400` 冷却提示。会员余额仍为 `72100` 分，租户 `23` 积分仍为 `39`。
- 验证结果：API `92` 个测试文件、`537` 项测试通过；全部 preflight guards、密钥扫描、API/PC 构建、H5/小程序构建和 API ready 通过。正式异地对象存储、真实短信/支付/微信密钥、真实设备和生产告警通道仍保留为外部验收项。
- 浏览器收尾复核：会员 `230` 页面已恢复到 `http://127.0.0.1:18080/?tenantCode=qiwai-showcase&t=1105final12#/pages/user/my?tenantCode=qiwai-showcase`，显示手机号 `13990014006`、余额 `¥721.00`、积分 `39`；`scrollWidth=viewportWidth=1181`，控制台 warning/error 为 0。
- 12.05 回滚/监控复核：`drill:rollback:api` 检测故障候选并自动恢复 baseline，ready 恢复 `6.1s`、总耗时 `19.79s`，结果文件为 `deploy/rollback-drill-result.json`；`monitor:health` 状态 `ok`、告警 `0`，任务积压/死信/过期锁/支付回调失败/退款失败/库存异常/资金风险均为 `0`。真实静态制品、Nginx、灰度流量和外部告警通道仍待验收。
- 回滚重启 API 后已在浏览器重新登录会员 230 并恢复到会员中心；手机号、余额、积分、无横向溢出和控制台 0 warning/error 再次确认。
- 最终数据备份（含本轮防刷审计记录）：`backups/mysql/activity_registration-20260716-131951.sql.gz`，大小 `364933` bytes，SHA-256 `3B0814AD4897F332A9E0904393396188846334E977BF3F4B7638EEC0129FF3F8`，GZip 解压 `2,988,764` bytes；API ready 仍为 `true`。
# 2026-07-16 - 13.01/13.02 移动管理及角色浏览器验收续跑

- `npm run browser:mobile-admin` 通过：移动管理端登录、工作台、活动列表、新建并保存草稿、发布活动、报名列表、订单列表和签到核销页全流程通过；结果：`.local-logs/mobile-admin-acceptance-20260716054637/result.json`。
- 线上演示商家全流程最新结果保持通过：H5 登录/付费报名、财务线下收款、报名详情/签到码、签到核销、平台及商家多角色权限、营销弹窗、标准版广告关闭、会员时间线、首页模板、系统设置和 H5 首屏均通过；结果：`.local-logs/browser-acceptance-20260716053906/result.json`。
- 修复 `scripts/browser-operations-forum-acceptance.cjs` 将 `showcase_admin` 管理员密码误复用会员密码的问题，新增 `SHOWCASE_ADMIN_PASSWORD`。重跑时服务端按标准版权益返回“当前套餐未开通此功能”，证明论坛后台能力关闭被服务端拦截，未写入论坛验收数据；已保留该边界证据，待启用论坛权益的测试租户继续执行正向浏览器流程。
- 并发验收首批未执行到业务逻辑：脚本要求 `ADMIN_TOKEN` 及测试订单/报名/核销编号等统一上下文，直接运行仅因缺少环境变量退出；下一批先从现有保留数据生成短期令牌和业务编号映射，再逐项执行并保存结果，不改变生产账号密码。
- 本轮回归：API `92` 个测试文件、`538` 项测试通过；全部 preflight guards 通过。`npm run build` 的 Shared/API/PC 阶段通过，H5 首次受当前 Node `25.2.1` 前置检查拦截，切换 Node `22.14.0` 后 H5 构建通过；微信小程序构建通过并完成 `useAuthorizePage/authorizeMiniprogramType` 配置修补。
- 本轮未修改数据库业务数据；工作区仍保留既有测试账号、验收活动、订单、报名、会员余额和积分。正式短信/支付/微信、异地对象存储、真实告警通道、真机相机/断网和生产灰度仍属于后续外部验收项。
- `npm run acceptance:functional-upgrades` 首次发现验收脚本未兼容分页操作日志响应，已修复为同时支持数组和 `{ items }`；重跑通过。保留活动 `148`，报名 `245/246` 批量通过、`247/248` 批量拒绝，审计日志断言通过。

# 2026-07-16 - 13.01 商城并发、导出路由与完整业务 smoke 收尾

- 真实并发验收完成并保留数据：活动订单 `233` 的两笔并发 59.00 元退款仅退款 `42` 成功，另一笔被剩余可退容量拦截；活动 `145`、报名 `234` 的双设备在线核销仅生成核销 `98`；核销点 `3`、报名 `233` 的离线首次同步生成核销 `99`，第二设备重放冲突；课程 `3`、课时 `2` 的 31%/67% 并发写入最终保持 67%，非法进度返回 400。
- 商城报价签名、拆单和库存竞争通过：篡改 SKU `20` 报价令牌被拒绝并保留有效订单 `127`；SKU `1/20` 跨店结算组 `13 / MCG1784184617492E51060` 生成子订单 `128/129`，金额分摊一致且重复请求幂等；热库存事务锁等待限制为 5 秒并将 `ER_LOCK_WAIT_TIMEOUT` 转换为 409 可重试冲突，10 并发和大数量竞争均无 500，监控恢复 `ok`。
- 整改拼团自动退款的 MySQL 61 表联接上限：报名、订单、钱包、积分和佣金改为显式锁查询并关闭隐式 eager 展开；真实过期拼团扫描返回 `failedTeamCount=1 / refundedOrderCount=1 / skippedOrderCount=0 / failures=[]`。店铺 `finance` 默认授权补齐商城收款、订单、退款和结算，财务账号真实确认商城线下订单 `264` 后状态为 `paid`。
- 完整 `smoke:online-showcase` 首次推进到商城导出时发现 `GET /admin/mall/orders/export` 被更早注册的 `orders/:id` 捕获，`export` 经 `ParseIntPipe` 返回 `Validation failed (numeric string is expected)`。已将静态导出路由移到动态详情路由之前，并在 `preflight-export-guard` 增加路由顺序断言，防止控制器重排后复发。
- 新 API 镜像部署后，财务账号按店铺 `38` 真实下载商城订单、带支付/售后过滤的订单、售后和支付流水四类 Excel，均返回 200，文件大小分别为 `27297 / 10219 / 9036 / 6931` bytes。
- `smoke:online-showcase` 完整通过，保留本轮独立会员 `13990072063` 至 `13990072067`，覆盖免费报名核销、余额付费报名、退款、社区评论审核、课程交付、商城优惠券/积分/推广归因、拼团、超时关闭、自动收货、线下履约、评价、售后、看板、筛选导出和财务追溯。
- 全量回归通过：API `92` 个测试文件、`538` 项测试，全部 preflight guards，运行时依赖 high/critical 为 0，Shared/API/PC 构建通过；Node `22.14.0` 下 H5 和微信小程序构建通过并完成小程序授权配置修补。`monitor:health` 为 `ok`、告警 0，API ready 为 true，`git diff --check` 无空白错误。
- 外部待验收项保持不变：正式微信支付、短信、对象存储、生产域名/证书、外部告警通道、真机相机与真实断网、生产灰度，以及论坛/公益/志愿者等需启用相应套餐后的正向浏览器流程；继续推进不依赖这些外部条件的性能与角色验收。

# 2026-07-16 - 13.01 万级名单、报名高峰与完整导出性能验收

- 新增 `scripts/performance-acceptance.mjs` 和 `npm run acceptance:performance`，通过专用性能活动幂等准备 10,000 条隔离名单，再以真实 HTTP 接口执行现场概览、后台分页、100 独立会员同时报名和完整 Excel 导出；结果写入 `.local-logs/performance-acceptance-<timestamp>/result.json`，测试数据不清理。
- 新增 `preflight-performance-guard.mjs` 并接入全量 preflight 链，固定检查万级默认规模、同时报名、现场概览、完整导出、p95 指标和证据文件，避免性能验收退化为手工描述。
- 首次执行暴露两个夹具问题：活动创建要求至少一个报名字段；MySQL 预处理语句不接受参数化 `LIMIT`。分别改为一个非必填姓名字段和经正整数校验后的固定 LIMIT；两次失败均发生在正式负载前，基础用户幂等保留后继续执行。
- 最终保留租户 `23` 的活动 `149 / [PERF] 10k registration acceptance`、10,100 条报名和高峰会员 `18656594000-18656594099`。现场概览 30 请求/并发 10 的 p50/p95 为 `202.46/257.74 ms`、39.97 req/s；100 行名单分页为 `237.10/273.26 ms`、37.09 req/s；均无错误。
- 100 用户同时报名全部成功，报名数从 10,000 精确增加到 10,100，p50/p95 为 `5,328.00/5,587.69 ms`，总耗时 `5,795.35 ms`，吞吐 17.26 req/s，无业务拒绝、容量误判或 500。
- 完整报名 Excel 导出 10,100 行，文件 `543,052 bytes`，耗时 `1,790.98 ms`。结果文件为 `.local-logs/performance-acceptance-1784193356594/result.json`。
- MySQL `EXPLAIN ANALYZE` 确认资格统计使用 `IDX_registrations_activity_status_created` 覆盖索引，10,100 行约 5.67 ms；最新名单约 3.17 ms；未核销 antijoin 使用报名索引和核销 `registrationId` 索引，约 12.4 ms。完整报告写入 `docs/performance-acceptance-report.md`。
- 生成备份 `backups/mysql/activity_registration-20260716-171919.sql.gz`，文件 675,784 bytes，完整解压 9,380,105 bytes，SHA-256 `3F12F6DA65AF055F4256B9EF2AF65913F5B99D2A09C3D477A00963D846F27399`；备份后数据库复核活动 149 仍为 10,100 条报名，高峰手机号区间共 100 个用户。
- 本批不提前关闭 13.01：商城高峰下单、生产规格持续压测、CPU/内存/连接池曲线、全角色 E2E 和真机仍继续推进。

# 2026-07-16 - 13.01 商城高峰下单、锁治理和订单索引整改

- 新增 `acceptance:mall-performance`，稳定准备店铺 `99/100`、商品 `63/64`、SKU `118/119` 和独立会员/地址，通过真实 API 同时执行单店报价/下单、跨店报价/拆单、库存核对和幂等重放；结果写入 `.local-logs/mall-performance-acceptance-<timestamp>/result.json` 并保留订单。
- 结构审计发现 `mall_orders` 当前只有主键，早期建表 migration 中声明的订单号、租户、用户、状态和 clientOrderKey 索引未实际存在。218 笔历史订单的 orderNo 及非空 tenant+user+clientOrderKey 重复审计均为 0；新增并实跑 `1783800000000-MallOrderPerformanceIndexes`，补齐两项唯一约束和六项热路径索引，实体元数据同步声明。
- 索引前会员订单查询扫描 218 行、约 0.62 ms，索引后使用 `IDX_mall_orders_tenant_user_created` 覆盖索引约 0.25 ms；过期订单扫描改用 `IDX_mall_orders_status_expires` 范围扫描约 0.02 ms。migration contract 12 项和 API 编译通过。
- 首次高峰执行：报价 100/100，但单店下单只有 19/100 成功、p95 约 48.54 秒；跨店仅 4/50 成功。库存无超卖。根因是订单事务持有 SKU 行锁后，`computeMallPointsQuote` 使用全局 Repository 再申请连接，100 个持锁事务耗尽连接池并相互等待。
- 积分查询改为复用订单事务 EntityManager 后，单店 100/100 成功、p95 6.21 秒；跨店提升到 36/50，但 InnoDB 捕获 14 个死锁。死锁图证明带关联的 SKU `FOR UPDATE` 同时锁定商品、商户和租户，形成“商户 B -> 租户”和“租户 -> 商户 B”反向锁序。
- `findSellableSkuRow` 现先按 SKU ID+tenantId 仅锁 `mall_skus` 主表行，再无锁加载商品/商户/租户关系并使用锁定行库存值；`ER_LOCK_DEADLOCK` 与 `ER_LOCK_WAIT_TIMEOUT` 统一转换为 409 可重试业务冲突，避免底层 SQL 泄露。
- 最终结果 `.local-logs/mall-performance-acceptance-1784195824789/result.json`：单店报价 100/100，p95 1,461.57 ms；热 SKU 下单 100/100，p95 6,325.02 ms、15.51 req/s；跨店报价 50/50，p95 697.41 ms；跨店拆单 50/50、生成 100 子单，p95 8,818.50 ms、5.61 group/s。SKU 118 锁定库存精确增加 150，SKU 119 增加 50，10 次幂等重放均返回原组，最终 500/409/死锁/锁等待均为 0。
- 回归通过：API 92 个测试文件 538 项、全部 preflight guards、API 构建、完整 `smoke:online-showcase` 和 `monitor:health`；最新 smoke 保留会员 `13990068816-13990068820`，监控告警 0。
- 最终备份 `backups/mysql/activity_registration-20260716-180035.sql.gz` 为 756,780 bytes，完整解压 11,162,551 bytes，SHA-256 `E6840E2F4E63BF4DA37E35AFCE250C498A0FFEFABE2FE7E7F2B31ED878DE90E3`；备份后复核最终批次 100 个单店订单、50 个跨店组、100 个跨店子单，SKU 118/119 的库存快照与性能结果一致。

# 2026-07-16 - 13.02 增值套餐多角色正向验收与志愿性能整改

- 新增 `scripts/premium-role-acceptance.mjs` 与 `acceptance:premium-roles`，临时启用 `city_partner` 权益并完成论坛、公益三人分岗、援助敏感权限、大使伙伴双人复核、志愿者治理及 H5/PC 浏览器六条流程；最终结果 `.local-logs/premium-role-acceptance-1784202384798/result.json` 为 `passed`，套餐恢复 `standard`，`showcase_admin/showcase_ops/showcase_finance` 权限逐项回读一致。
- 真实数据暴露志愿总览、录取、发证和证明查询因 TypeORM eager 循环关系展开导致 CPU 100% 且永久不返回。总览改为显式 QueryBuilder，录取/名额/幂等/证书/服务记录/证明改为关闭 eager 的参数化标量查询；真实录取约 59 ms、总览约 18-65 ms、发证约 54 ms。志愿证书同时修复 `tenantId` 缺失，现可在租户“我的证书”中查询。
- 论坛回复响应补 `status/depth`，预审回复可识别 `pending` 和楼中楼深度；验收脚本统一 `{ code, data }` 解包、合法报名窗口、租户上下文、双确认工时、合同时间边界、手机号脱敏和每步 180 秒超时。
- 编排器恢复套餐、角色权限和密码增加有限重试及回读断言；修复 `showcase_admin` 临时密码污染和浏览器脚本误用会员密码。最新浏览器结果 `.local-logs/browser-operations-forum-20260716114632/result.json` 通过，保留论坛主题 `34` 和 5 张截图。
- 保留数据：公益项目 `11 / CP20260716114629D33B2243`、拨款 `17/18`、流水 `103`、79 条一致账本；援助 `9 / AID20260716CEAC7D3B61`；大使申请/档案/贡献 `17/8/8`；伙伴申请/合同 `18/8`；停用转换租户 `39`、店铺 `107`；志愿任务/报名/档案 `33/31/47`、服务/调整/勋章 `26/5/18`、证明 `5 / VPR202607162affb9da52ab4268`。
- 新增 `scripts/build-mobile-h5.mjs`，根构建在 Node 25 环境自动使用仓库 Node `22.14.0`，保持移动端版本门禁。全量回归为 API 92 个文件 541 项、全部 preflight、Shared/API/PC/H5/微信小程序构建通过，`git diff --check` 无空白错误。
- 最终源码镜像 `sha256:cba62259735379c8dd6c60ad010242f731b458a586deea6c6eaa39f84f58c25d` 已部署且健康；新镜像上 `monitor:health` 告警 0、完整 `smoke:online-showcase` 通过。备份 `activity_registration-20260716-194826.sql.gz` 为 861,888 bytes，解压 12,134,458 bytes，SHA-256 `0A7CC2C3906DC42869E187508399A1C42E569276305020D64DA8562B433780CA`。专项报告见 `docs/premium-role-acceptance-report.md`。
- `13.02` 仍不标记完成：正式微信支付、短信、对象存储、生产域名/证书、外部告警通道、微信真机、相机扫码、真实断网恢复和生产灰度继续等待外部条件并保留在当前开发范围。

# 2026-07-16 - 02.05/02.06/02.07 活动报名商业闭环真实验收

- 新增 `acceptance:activity-commerce` 和 `browser:activity-commerce`，以租户 `23 / qiwai-showcase` 临时开启报名审核后执行资格失败分支、V1/V2 表单快照、批量审核/通知/标签、名单导出、签到评价、回复精选、举报和复盘；结束后回读恢复 `registrationReviewEnabled=false` 和标准套餐。
- 首次真实创建 `number/region` 字段时 API 返回 MySQL 500 `Data truncated for column 'type'`。审计确认源码/DTO/前端支持 13 种字段类型，但真实 `activity_fields.type` 仍是早期 6 值枚举。新增并实跑 `1783810000000-ActivityFieldTypes`，扩展为完整 13 值；回滚遇到新类型数据时拒绝执行，migration contract 和 preflight migration guard 同步固定该契约。
- 最终 API 结果 `.local-logs/activity-commerce-acceptance-1784204514616/result.json` 为 `passed`。保留活动 `152`，报名 `10389/10390`，表单快照版本 `1/2`、字段数 `4/5`，评价 `7/8`，已驳回举报 `3`；批量审核、通知、标签均 2/2 成功。
- 真实名单 Excel 为 `7,131` bytes；活动复盘报名/签到/评价精确为 `2/2/2`、通知 4，复盘 Excel 为 `8,857` bytes，包含复盘概览、邀请榜和评价三个工作表。
- 浏览器结果 `.local-logs/browser-activity-commerce-20260716122208/result.json` 为 `passed`，覆盖 H5 活动详情、V2 动态表单/同行人/隐私政策、PC 报名批量运营、评价精选/回复/待处理举报 `4` 和活动复盘；保留 5 张 390x844/1440x1000 截图。
- 全量回归通过：API 92 个测试文件 542 项、全部 preflight guards、Shared/API/PC/H5/微信小程序构建、最终镜像健康和完整 `smoke:online-showcase`；最终 API 镜像 `sha256:2d8aa38f0f031fab6ab1c9275fd90a02df106e9acd413fecceff3da9be7c449a`。
- 迁移后备份 `backups/mysql/activity_registration-20260716-202343.sql.gz` 为 875,041 bytes，解压 12,263,557 bytes，SHA-256 `5B41F9933540BA293168D510F9FED37C6A8029957716C0326DC62C99E19D210A`；内容确认包含新 migration、活动字段结构及活动 `152`。完整报告见 `docs/activity-commerce-acceptance-report.md`。

# 2026-07-16 - 02.01/02.02/02.03/02.04 活动生命周期与票种定价真实验收

- 新增 `acceptance:activity-lifecycle-pricing` 和 `browser:activity-lifecycle-pricing`，在最终 Docker API、真实 MySQL、PC 和 H5 上完成活动向导、版本恢复、复制、发布检查、审核发布状态机、渠道归因及早鸟/会员/阶梯定价与库存并发验收。
- 首次付费活动发布检查错误提示未配置支付方式。根因是 `paymentMethods` 实际为 JSON 对象，旧代码错误读取 `.length`；新增 `hasPaidPaymentMethod` 并补齐免费、空配置、禁用和启用渠道共 5 项测试，最终镜像复测通过。
- 最终 API 结果 `.local-logs/activity-lifecycle-pricing-1784207058474/result.json` 为 `passed`。保留分类 `25`、生命周期活动 `161`、取消副本 `162`、渠道 `4 / LIFE07058474`、渠道报名 `10399`、邀请码 `A161U20805HEYL`、票种活动 `163`、票种 `57` 和并发成功报名 `10401`。
- 活动 `161` 完成 V1/V2、恢复 V1 后生成 V3；提交、撤回、再提交、驳回、通过、下架、重新上架、定时发布 worker、手动结束及副本取消联动均通过。渠道访问 1、报名 1，报名率 100%。
- 票种早鸟价 70.00 元、会员价 60.00 元和阶梯价由服务端报价；容量 1 的两名会员并发报名仅一笔成功，另一笔返回 400 售罄，无超卖。四个保留会员为 `13107058474-13407058474`，密码均为 `Qiwai123456`。
- 浏览器结果 `.local-logs/browser-activity-lifecycle-pricing-20260716130522/result.json` 为 `passed`，覆盖 H5 地图/主办方、售罄票种，PC 五步向导、V1/V2/V3、渠道转化和票种规则，共保留 6 张截图及浏览器会员 `13016130522`。
- 全量回归通过：API 92 个测试文件 543 项、全部 preflight guards、Shared/API/PC/H5/微信小程序构建和 `git diff --check`；最终镜像 `sha256:81b984d8ce4a551f254fa18cbca1ed2c1f13fb1a61ec2877d57446f3fb2b5204` 上完整 `smoke:online-showcase` 通过，监控 `ok`、告警 0。
- 最终备份 `backups/mysql/activity_registration-20260716-211558.sql.gz` 为 896,077 bytes，解压 12,497,068 bytes且 gzip 校验通过，SHA-256 `C88C476084DA9DDA7B503D2883715CDD3BE60B0C1621FB85FF03320DD2EE1A16`。完整报告见 `docs/activity-lifecycle-pricing-acceptance-report.md`。
# 2026-07-16 - 01.11 业务任务工作台与租户边界验收

- 新增 PC 业务任务工作台 `/admin/business-jobs`，支持状态/类型/关键词筛选、分页、详情展开、死信重放、待执行/死信取消和平台手工扫描；补充设置菜单、路由权限和租户作用域。
- 服务端列表响应统一脱敏 payload/result 及错误文本中的凭据字段，避免任务详情泄露 API key、token、password 等敏感值；新增脱敏单测。
- 真实 Docker API/MySQL 验收通过：payload 脱敏、租户运营禁止手工 run-due、本租户取消、跨租户重放返回 404；结果 `.local-logs/business-job-1784215335448/result.json`。
- PC 浏览器实测租户 A 运营账号仅显示本租户业务任务，页面展示状态、重试、幂等键、时间和详情入口；双租户列表与取消结果保持通过。
- API/PC 构建、RBAC 菜单路由预检、专项 6 项测试通过。01.11 继续保持待验收，剩余独立 worker 并发、真实补偿通道和异地任务恢复演练继续推进。

# 2026-07-16 - 03.01 商城整数分实库一致性整改

- `migration:show` 确认截至 `1783810000000` 的 174 项迁移均已实跑，随后对订单、商城订单、结算组、支付流水和退款执行元/分逐行校验。
- 发现商城订单创建先保存 `0.00` 占位，再计算最终价格；`BeforeInsert` 只冻结了占位金额，第二次保存未同步 `amountFen`，导致 697 条商城订单中 394 条不一致，163 个跨店结算组中 20 个不一致。
- 创建路径在最终报价后显式同步 `savedOrder.amountFen`，新增并执行 migration `1783820000000-RepairMallIntegerAmounts` 回填历史商城订单和结算组。
- 迁移前备份 `backups/mysql/activity_registration-20260716-233137.sql.gz`（约 0.88 MB）；迁移后活动订单 421、商城订单 697、结算组 163、支付流水 183、退款 57 的不一致数量全部为 0。
- 新 API 镜像已构建并部署，ready 通过；金额转换专项 5 项测试及 `git diff --check` 通过。03.01 继续执行新下单和统一订单中心多角色浏览器验收。
- `smoke:online-showcase` 在新镜像上完整通过，保留本轮独立用户 `13990043488-13990043492` 及商城业务数据；最近 20 分钟新增 10 条商城订单，`amountFen` 不一致为 0。
- 租户财务账号浏览器打开统一订单中心，展示订单金额与分、业务类型、支付方式、状态、所属商家和统一资金流水；运营账号访问该路由按权限回退，边界符合预期。

# 2026-07-16 - 03.02 支付中心本地验收续跑

- `payment-provider.service.spec.ts` 支付专项 74 项全部通过，覆盖 sandbox 查单/关单状态归一化、微信/支付宝真实请求草案、签名和响应边界；`preflight-real-payment-guard.mjs` 通过，API 构建通过。
- 新镜像 `smoke:online-showcase` 完整通过，真实本地闭环覆盖活动余额支付、商城余额支付、线下收款确认、支付流水和退款追溯；正式微信/支付宝密钥未挂载，真实渠道回调保留外部验收状态。

# 2026-07-16 - 03.03 退款并发与响应安全整改

- 使用财务账号对订单 `423` 执行两笔并发 40.00 元退款申请：仅退款 `59` 创建成功，另一笔返回 400“退款金额不能超过订单可退金额”，累计接受 40.00 元不超过剩余 59.00 元；真实结果保留在终端验收记录，退款申请数据不清理。
- 财务审批退款 `59` 后状态为 `completed`，原活动订单变为 `partially_refunded`，余额支付退款回流、`amountFen=4000` 和业务快照保持一致。
- 整改发现退款审批响应嵌套返回用户 `passwordHash` 和租户内部配置。控制器对退款申请、审批、拒绝、重试响应统一执行递归敏感字段脱敏；新增脱敏回归测试，重新部署镜像后复验 bcrypt 原文/API 凭据均未返回。
- API 退款专项、脱敏专项、构建通过；正式渠道退款、失败重试任务和财务 PC 最终浏览器验收继续保留待验收项。
# 2026-07-17 - 03.03 财务退款工作台浏览器验收与状态一致性整改

- 演示租户财务账号真实打开 PC 财务对账页，验证已完成并发退款 `CONCURRENCY_1784216696119a51cde_1` 展示金额 `40.00`、状态和原订单关联。
- 保留两条受控失败退款记录，验证失败原因、服务商状态和“重试”入口；确认弹窗要求财务复核原退款单号，确认后操作按钮锁定，余额退款最终完成。
- 浏览器发现重试完成后仍残留旧 `providerRefundStatus=failed`。新增 `resetRefundProviderForRetry`，重试前清理服务商退款号、状态、同步时间、载荷、失败原因和下次查询时间，保留累计重试次数；新增共享回归测试。
- 重新构建部署后复验记录 `UI_FAILED_REFUND_RESET_1784217600000`：状态“已完成”，服务商退款号/状态/失败原因均为 `-`，与本地余额退款终态一致。
- 财务点击“扫描退款回执”，完成二次确认，提示已扫描 0 条退款回执，无 500；专项报告见 `docs/refund-finance-browser-acceptance-report.md`。
- API 全量 93 个测试文件、550 项测试通过；preflight 全部通过；API 构建和 Docker 健康检查通过。正式渠道退款、独立 worker 积压/异地恢复继续作为外部待验收项。

# 2026-07-17 - 03.04 钱包真实库检查与响应安全整改

- 真实 MySQL 已确认钱包金额治理 migration `1783290000000` 和哈希链 migration `1783300000000` 均已执行；钱包流水 391 条，金额分不一致 0，空哈希链记录 0，`wallet_transactions_hash_chain_before_insert` 触发器存在。
- 通过真实管理员接口对演示会员 `20846` 执行 `0.01` 元充值并用同一业务幂等键重放：首次 `idempotent=false`，重放 `idempotent=true`，钱包余额分镜像和流水 `amountFen=1` 正确，哈希链前后指针存在；测试数据保留。
- 验收暴露钱包后台查询/调整响应会连带会员 `passwordHash` 和租户 `settings`。新增钱包专用响应裁剪：仅保留用户/租户必要摘要，同时保留钱包、流水、金额分、余额快照和哈希字段；复验确认 password hash、bcrypt、settings 均不返回，`amountFen` 和 `walletTransaction` 保留。
- 会员 H5 钱包页已真实登录 `13990043490`，展示余额 `797.05`、退款返还、余额支付和充值流水，现金/冻结/分页统计正常。冻结、赠送金、并发负数和多设备钱包操作仍继续验收。
- 真实管理员接口继续验收会员 `20847`：赠送金发放 `5.00` 成功，幂等重放复用同一流水；充值 `3.00` 后冻结 `2.00`、解冻 `2.00` 均成功，现金和冻结金额分镜像恢复；对无余额扣减 `999999`、无现金冻结和无冻结解冻均返回 400，未产生负数或流水。
- 实库校验更新为钱包流水 399 条，金额分不一致 0、缺失哈希链字段 0、负余额钱包 0、重复业务幂等键 0；本批钱包测试数据全部保留。
- 真实并发验收：对会员 `20847` 同时发起 10 笔 `0.50` 元扣减，6 笔成功、4 笔因余额不足返回 400，最终可用余额为 `0.00`，无 500、无负数、无超扣；说明钱包悲观锁和金额分保护生效。租户财务账号查询 tenant `24` 返回 404，跨租户边界通过。

# 2026-07-17 - 03.05 活动渠道账单导入与双账本对账整改

- 真实库确认活动/商城账单 migration `1783310000000`、`1783320000000` 已执行，`payment_statement_records` 与 `mall_payment_statement_records` 均存在。
- 财务账号真实导入匹配账单：`BAL1784216196375424 / OD178421619629110428 / 59.00` 自动匹配；导入 `MISMATCH1784220300000 / 58.97` 生成金额差异和待处理支付流水。
- 真实解决差异时发现响应连带返回会员 password hash、签到码、报名答案、租户设置和业务快照。新增财务流水专用响应裁剪，复验 passwordHash/bcrypt/checkInCode/settings/answers 均不返回，流水号和解决状态保留。
- 浏览器发现支付流水解决后服务商账单仍显示待处理。整改为同一事务锁定支付流水并同步对应 provider+transactionNo 的账单记录，同时写 `finance.reconciliation_resolve` 操作审计；复验流水和账单均为 `resolved`，PC 页面两个表均显示“已处理”。
- API 构建、新镜像健康、对账专项 49 项、财务对账 preflight 和差异检查通过；测试账单和差异记录全部保留。正式渠道自动拉取继续作为外部待验收项。

# 2026-07-17 - 03.05 商城渠道账单工作台浏览器验收与响应安全整改

- 演示租户商户 `38 / 慢π自营店` 真实导入商城账单：`54.00` 元匹配记录 `MALLSTMT_MATCH_1784221000000`，`53.99` 元差异记录 `MALLSTMT_DIFF_1784221000000`。
- 首次导入响应暴露完整商城订单、会员 password hash、收货地址、优惠券快照和租户设置。商城账单导入/认领/解决接口新增专用响应裁剪；日期序列化同时修复为 ISO 字符串，复验敏感字段均不返回。
- 财务账号真实完成差异认领 `showcase_finance`、解决并填写依据；另保留 `MALLSTMT_IGNORE_1784221000000` 并完成忽略流程。商城账单导出返回 200，文件 7235 bytes。
- PC `/admin/mall-payment-logs` 浏览器确认匹配、`resolved` 和 `ignored` 三种状态均可见，认领/处理和导出入口存在，状态和处理依据正确。
- 商城账单与支付流水、操作审计测试数据均保留；API 构建、Docker 健康和专项测试通过。正式渠道拉取、更多商户直收/平台代收和商城财务最终回归继续推进。

# 2026-07-17 - 第三阶段财务回归、备份及 03.06 资金告警整改

- 第三阶段阶段性全量回归通过：API 94 个测试文件、552 项测试，全部 preflight，API/PC 生产构建和 `monitor:health` 通过，监控状态 `ok`、告警 0。
- 真实库复核：活动账单 16 条（matched 13、pending 2、resolved 1），商城账单 3 条（matched/resolved/ignored 各 1）；钱包流水 405 条，金额分异常 0、哈希链缺失 0、负余额 0。
- 备份 `backups/mysql/activity_registration-20260717-010055.sql.gz` 为 942,957 bytes，SHA-256 `F8D6316563A31E78CFA264638C613928EE151E7373FE6B4E1047DF2BD22C2986`。
- 03.06 首次真实执行资金异常扫描返回 500 `Field 'type' doesn't have a default value`。根因是新告警候选字段被未初始化生命周期对象覆盖；调整合并顺序并新增回归测试。
- 二次扫描虽成功但告警 tenantId 为空。根因是 QueryBuilder 不执行 eager 关系加载；所有活动/商城回调、支付流水、账单、退款和钱包风险查询现显式加载 tenant，错误作用域的两条本批记录已按原账单归属修复为 tenant `23`。
- 最终扫描检测 2 条活动渠道账单差异，openCount=2；财务账号完成确认跟进、填写依据解决和人工重新打开。PC 财务页显示高风险、业务单号、发现次数、处理人、处理依据及“确认跟进/解决”操作，无 500。
- 新增受控风险源完成其余类型验收：活动支付回调失败、活动退款失败、同订单重复成功支付和钱包负余额均被识别为 critical；扫描 detectedCount=6/openCount=6，类型聚合和业务编号正确。租户 `42` 财务账号查询不到 tenant `23` 告警，跨租户边界通过。
- 负余额钱包 `90` 扫描后立即恢复为现金 0、赠送金 500 分并解决告警；PC 财务页真实显示回调失败、退款失败、重复支付及严重级别。其余受控源在验收后转为已核对终态，历史告警和证据保留。
- 同步修复两条支付流水已解决但账单仍 pending 的历史记录；最终资金扫描 detectedCount=0/openCount=0，`monitor:health` 恢复 `ok`、告警 0。

# 2026-07-17 - 03.06 商城风险联动验收

- 真实受控触发商城支付回调失败、商城退款失败和商城重复支付：扫描检测 3 条，分别生成 `callback_failed`、`refund_failed`、`duplicate_payment` critical 告警，业务单号、退款号和证据快照正确。
- PC 财务页真实展示“商城支付回调失败”“商城退款失败”“商城订单疑似重复支付”及严重级别；租户/商户范围沿用前序隔离规则。
- 新增并保留商城库存异常记录 `RISK_INV_1784223000000`，通过商城库存异常接口执行忽略处理；原始异常、告警和操作记录均保留。
- 商城三类风险告警完成财务复核解决，库存异常状态为 `ignored`；监控最终恢复 `ok`、告警 0，底层受控回调/退款源也转为已核对终态，未留下运行时失败指标。

# 2026-07-17 - 04.01/04.04 核销并发与受控离线验收

- 使用真实 Docker API/MySQL 和保留报名 `10428 / activity 132` 执行双设备并发核销：仅 1 笔返回 201，另一笔返回 400“该报名已被其他设备核销”，保留核销记录 `121`。
- 创建并保留核销点 `03.06 现场测试核销点`，真实签发受控离线清单：32 张票、有效期 8 小时；首次同步成功 1、冲突 0，重放同步成功 0、冲突 1，提示重复核销，保留核销记录 `122`。
- 现有 `acceptance:checkin-concurrency` 通过；`acceptance:checkin-offline` 通过；签名票据、并发锁、核销点和离线冲突路径均在真实数据库执行。微信真机相机、真实断网仍待外部设备条件。

# 2026-07-17 - 04.02 核销员权限、撤销核销和响应安全整改

- `showcase_checkin`（checkin_staff）真实核销报名 `10427`，生成核销记录 `123`；按 120 分钟规则撤销返回 400“仅超级管理员可撤销”。超级管理员随后填写原因成功撤销，报名恢复 `approved`，撤销原因和原核销员/时间保留。
- 真实撤销响应暴露操作员 password hash、签到码、报名答案和租户设置。控制器改为等待服务结果后执行现场响应裁剪；复验核销记录 `124` 的撤销响应中 passwordHash/bcrypt/checkInCode/settings/answers 均不返回，撤销原因和报名恢复状态保留。
- API 46 项专项测试、API 构建和 Docker 健康通过；此前 04.01 并发、04.04 离线验收数据继续保留。
- 移动管理端真实登录 `showcase_checkin` 并进入 `#/pages/admin/check-in`，页面展示活动选择、核销点选择、离线清单下载、扫码核销、签到码输入、备注和确认核销控件；账号无活动编辑权限但可进入核销工作台，符合角色边界。活动选项较多时仍保留在选择器中，继续进行真机相机和选项交互验收。
- 最新备份 `activity_registration-20260717-014051.sql.gz` 为 946,502 bytes，SHA-256 `C54D4DE0E167A5D55D1BF107FFF69BA7A57CB1E0BF5314285C087D8BDDA8AC19`；监控 `ok`、告警 0。

# 2026-07-17 - 04.03 现场工作台与万级名单当前镜像回归

- 当前镜像重复执行 `acceptance:performance` 通过：活动 `149` 名单从 10,100 增至 10,200，现场概览 30 请求并发 10 的 p95 `260.50ms`，报名分页 p95 `301.30ms`，100 用户同时报名 p95 `5875.73ms`、100/100 成功，完整导出 10,200 行耗时 `1889.94ms`、548,068 bytes，错误 0；结果 `.local-logs/performance-acceptance-1784223750148/result.json`，数据保留。
- 移动管理端现场核销页真实显示当前到场、待核销和核销率统计，提供活动选择、核销点选择、扫码、手工签到码、备注、离线清单和同步控件；选择器活动较多，继续真机交互验收。
- 性能验收后备份 `activity_registration-20260717-014340.sql.gz` 为 954,900 bytes，SHA-256 `18245DF1698AFBAA01F712B01DA96AD6B092F9F31BCC73B178808395B0F06739`。

# 2026-07-17 - 05.01/05.02 会员与动态分群安全整改及真实验收推进

- 真实 API 首次检查发现 `GET /admin/members/:userId` 的会员全景会递归返回用户 passwordHash、签到码、报名答案、表单快照、租户 settings 和原始业务 payload；已在 `admin.service.ts` 增加会员全景专用响应裁剪，移除上述字段并保留会员业务统计、积分、资产和时间线。
- 同步收紧动态分群实时预览、快照成员明细和标签列表响应，避免通过关联 user 实体泄露 passwordHash 或通过活动/租户关联泄露内部配置；API 构建通过，审计脱敏专项 3 项测试通过，Docker API 已按新镜像重建并启动。
- 真实平台管理员创建并保留分群 `05.01-积分验收分群-20260717`、快照 `MS17842242641718AC0B9`，规则 `minPoints=1`，快照成员数 165；首轮平台预览复核已确认旧响应的 passwordHash 泄露，整改后会员详情关键敏感字段均不存在。
- 真实租户财务账号无 `member.manage/tag.manage` 权限，积分调整和分群写入返回 403，符合财务角色边界；租户管理员账号 `showcase_admin` 当前密码未通过登录，租户管理员积分、分群及浏览器页面仍待可用账号/凭据恢复后继续验收，不阻塞后续通知中心开发。

# 2026-07-17 - 05.03 通知中心响应安全与退订频控验收

- 通知列表、发送结果、批量活动提醒、标签通知和失败重试统一改为专用公开响应，仅返回用户 ID/昵称/手机号、活动 ID/标题及通知业务字段；不再返回用户 `passwordHash`、openid、租户 settings 或关联实体内部字段。
- 通知偏好列表和保存响应同步裁剪用户实体，保留渠道、订阅状态、退订原因和时间字段。
- 修复失败通知重试的租户校验关系未加载问题：重试前显式加载活动及活动租户，租户管理员可正确校验所属通知。
- 真实 API 验收：会员 `20846` 的站内信偏好设置为退订，发送 `05.03通知验收` 被记录为 `suppressed`，provider=`preference`，原因为 `05.03 退订验收`；通知列表 100 条记录中 `passwordHash/openid/settings` 均不存在。
- API 通知模板/供应商测试 8 项通过，API 构建通过，Docker API 新镜像健康；短信、微信、SMTP 正式通道因外部密钥未配置继续保留为外部验收项。

# 2026-07-17 - 05.04 优惠券/推广码专项回归启动

- 已复核活动券、商城券、推广码和退款释放代码路径，确认商城优惠券领取使用事务包含悲观锁、租户作用域、个人限制和幂等检查，报价与下单继续保存优惠快照。
- 专项单元回归通过：4 个测试文件、19 项测试，覆盖优惠券退款释放、商城报价分摊、推广限制和营销治理。
- 05.04 真实 MySQL 并发领取/使用、活动 H5/商城浏览器及真机流程仍待本轮继续执行；不以单元测试通过提前标记工作包完成。

# 2026-07-17 - 05.06 客服工单响应安全整改

- 客服工单列表和详情原先直接返回 eager 用户、负责人及操作员实体，存在 passwordHash、租户设置和完整手机号泄露风险；已改为专用工单响应，手机号默认脱敏，仅返回用户/负责人/租户摘要和处理轨迹。
- 客服工单生命周期、手机号脱敏、权限映射专项回归通过：3 个测试文件、17 项测试；API 构建通过。
- 05.06 真实工单创建、改派、处理、解决、关闭、重开和浏览器流程继续待数据库/浏览器验收。

# 2026-07-17 - 05.06 工单真实状态机与运行镜像复验

- 使用平台管理员真实创建并保留工单 `WO202607166563E041`（记录 `1`），完成 `open -> processing -> resolved -> closed -> processing` 全状态链路，处理日志 5 条保留。
- 首次真实响应检查发现 Docker 运行镜像尚未包含源码 DTO，返回了完整用户和操作员实体；已重建 API 镜像并复验。
- 当前真实详情手机号为 `139****3490`，`passwordHash`、完整手机号、租户 settings 均不返回；状态、工单编号、处理结论和日志数量正确。

# 2026-07-17 - 06.01 经营指标真实重算与一致性验收

- 统计口径专项测试通过：指标定义 5 项、增长分析 2 项。
- 平台管理员真实执行 `2026-07-15` 至 `2026-07-17` 指标重算，运行记录 `AR178422535724345E6AD` 完成，来源事件 `358`、根维度汇总 `358`、指标行 `74`、差异 `0`，一致性结论为 `true`，计算版本 `activity-metrics-v1`。
- 真实接口 `analytics/overview`、`analytics/growth`、`analytics/metrics` 和运行记录查询通过；平台维度指标查询返回 5 条，日期、指标键、数量、金额分和运行批次均正确，数据保留。

# 2026-07-17 - 06.02 多级经营看板与明细真实 API 验收

- 平台管理员真实查询经营总览、增长漏斗、活动/课程/商城/公益四域明细和活动经营 CSV 导出，接口均返回成功；明细数量分别为活动 `33`、课程 `3`、商城 `4`、公益 `10`，导出响应 200、内容长度 `5011` bytes。
- 平台增长漏斗真实数据保留：浏览 `24`、报名 `294`、支付 `4`、签到 `32`，其余指标按当前日期范围返回 0，未进行数据清理或伪造。
- 租户财务账号 `showcase_finance` 登录成功，经营总览按 tenant `23` 返回四个业务域，租户范围查询通过；财务账号仍受既有分析权限限制，未改变角色权限。

# 2026-07-17 - 06.03 漏斗、留存、复购、渠道和地域真实验收

- 平台范围 `2026-07-01` 至 `2026-07-17` 真实增长分析：基准用户 `10,345`、7/30 日留存用户各 `6`、重复参与用户 `6`、付费用户 `340`、重复付费用户 `2`；来源 10 类、渠道 4 条、地域 2 条。
- tenant `23` 财务账号同范围返回基准用户 `10,311`、付费用户 `308`、重复付费用户 `2`，来源 9 类、渠道 4 条、地域 0 条；平台与租户统计数量不同，证明租户过滤生效。
- 租户增长分析 CSV 导出返回 200、`1325` bytes；留存率、复购率在零分母和低比例场景按既有安全口径输出，数据保留。

# 2026-07-17 - 07.01-07.04 课程专项回归与资源边界验收启动

- 课程租户隔离、学习进度并发、退款权限、准入模式、考核评分、评价答疑证书策略和资源鉴权专项回归通过：7 个测试文件、22 项测试。
- 演示会员 `13990000005` 真实密码登录成功；公开课程列表 tenant `qiwai-showcase` 返回 7 门课程。
- 未购用户访问付费课程 `5`：试看课时 `5` 保留视频地址和正文且 `locked=false`，非试看课时 `6` 的视频地址与正文均为 null 且 `locked=true`，资源脱敏边界真实通过。
- 学习进度并发与全额退款真实脚本仍需现有课程权限/订单夹具，继续从数据库保留数据中选择或创建不破坏现有业务的测试订单后执行。

# 2026-07-17 - 07.02 学习进度真实并发验收

- 使用演示会员 `13990000005`、免费课程 `3`、课时 `2` 执行真实双请求并发进度上报；31% 与 67% 同时写入后最终进度为 67%，最近学习课时为 `2`，低进度未覆盖高进度。
- 非法进度请求返回 400，脚本 `acceptance:course-progress-concurrency` 完整通过，两个请求 ID 已保留在执行结果中。
- 并发写入后课程根学习权限已生成，真实查询课程 `3` 的已发布考核返回 1 项（考核 `1`），为后续测验提交与批改验收提供保留夹具。

# 2026-07-17 - 07.03 测验提交、自动评分与导出真实验收

- 演示会员开始考核 `1`，生成 attempt `2`，题目包含单选和判断各 1 题，总分 100。
- 按正确答案提交后自动评分 `100.00`，状态 `passed`；重复提交同一 attempt 返回原结果并标记 `idempotent=true`，未重复生成成绩或覆盖历史答案。
- 学员结果页在通过后返回 2 道题、正确答案和解析；考核成绩 CSV 导出返回 200、`670` bytes，真实提交记录保留。
- 当前夹具无问答题，因此人工逐题批改、退回补交和补考授权继续使用后续作业/问答夹具验收，不以本次客观题通过代替。

# 2026-07-17 - 07.03 问答作业人工批改、退回补交和补考授权验收

- 在课程 `3` 创建并保留作业 `2`「07.03 人工作业验收保留」和问答题 `3`，总分 100、及格线 60、默认尝试 1 次。
- 演示会员提交 attempt `3` 后进入 `pending_review`；后台填写退回原因后状态变为 `returned`，学员重新开始恢复同一 attempt 为 `in_progress`，补充答案后再次进入 `pending_review`。
- 后台逐题人工评分 90 分并填写反馈，最终 `manualScore=90.00`、`totalScore=90.00`、状态 `passed`；历史 attempt 未被新建或覆盖。
- 额外授予该会员 2 次补考机会并保留原因，补考授权记录真实落库。至此客观题自动评分、问答人工评分、退回补交、重复提交恢复和补考授权均有真实证据。

# 2026-07-17 - 07.04 评价、答疑、公告通知和证书验真真实验收

- 演示会员提交课程 `3` 评价 `1`，后台审核通过并回复“感谢反馈，课程会持续优化。”；提交答疑 `1`，后台答复并设为精选，评价和答疑数据保留。
- 创建并发布公告 `1`「07.04 公告验收保留」，通知学员成功 `26`、失败 `0`；学员端公告列表可见 1 条，站内通知链路真实通过，正式外部通道仍待配置。
- 保存课程证书模板 `2`，完成阈值 100、无需额外考核门槛；发现课程 `3` 实际存在 4 个已发布课时而非最初目录中的 2 个，补齐课时 `9/10` 后课程总进度准确达到 `100.00`。
- 幂等签发课程证书 `21`，编号 `CRS-3-125-MRNU9TMU-72E8`；公开验真返回有效、持有人脱敏、课程标题/发证单位/完成进度正确，未泄露 businessSnapshot、courseId 或 templateId。

# 2026-07-17 - 07.04 课程购买、线下收款和全额退款联动验收

- 演示会员为付费课程 `5` 创建课程订单 `53`，订单号 `CO178422645923101D1BA`，金额 `299.00`（`29900` 分），后台确认线下收款后订单进入 `paid`，订单数据和金额快照保留。
- 使用两台设备并发申请全额退款，退款单 `2`、退款号 `CRF178422647754253`，一笔创建、一笔幂等返回；后台并发审核和并发确认均返回 `completed`，无重复退款。
- 退款完成后订单进入 `refunded`，会员 `owned=false`，课程播放器仍可访问基础响应但 `owned=false`，有效课程证书数量为 0；课程学习权限和证书联动撤销通过。

# 2026-07-17 - 08.01-08.04 社区/论坛专项回归

- 共学租户上下文、社区互动幂等、论坛楼层/锁帖治理、内容关键词/处罚和申诉幂等专项回归通过：6 个测试文件、24 项测试。
- 既有运营论坛真实验收脚本需要 `showcase_admin` 可用密码和动态验收账号，当前租户管理员凭据仍不可用；不阻塞专项代码回归，真实论坛/社区浏览器验收继续待可用账号。

# 2026-07-17 - 08.05/09.01-09.09 安全与商城专项回归

- 图片上传、对象存储、公益材料安全、商城库存、商户治理、售后策略和结算策略专项回归通过：7 个测试文件、32 项测试。
- 覆盖 MIME/魔数校验、非法协议拦截、对象存储路径隔离、商户权限范围、库存并发策略、退款售后状态和结算退款扣回规则。
- 09 阶段真实高并发、拆单、售后、营销和佣金脚本已有历史证据；当前继续补充当前镜像的真实浏览器和正式支付/物流条件验收，未以单元测试提前标记商城全部完成。

# 2026-07-17 - 10.01-10.05 公益与合作生态专项回归

- 公益资金治理、公益账本哈希、援助隐私与材料安全、伙伴 CRM、志愿者治理和证书验真专项回归通过：7 个测试文件、23 项测试。
- 相关生产前置门禁全部通过：公益治理、援助隐私、生态 CRM、志愿者治理、志愿者证书共 5 个 preflight guard 返回 OK。
- 覆盖独立资金池与不可变流水、敏感材料加密/私有存储、伙伴合同和转换、志愿者资格/名额/签到/工时双确认、勋章/证明/证书撤销验真。
- 三人多角色真实公益拨款、援助材料私有卷、伙伴转换竞态、志愿者并发和浏览器/真机验收继续待当前环境逐项执行。

# 2026-07-17 - 11/12 全端构建、门禁和运行依赖验收

- 全端生产构建通过：shared、API、PC 管理端、移动 H5 均成功构建；微信小程序 `build:mobile:mp-weixin` 也成功生成产物并完成认证配置补丁。
- 完整 `test:preflight-guards` 全部通过，包含租户、支付、商城多商户、公益、援助隐私、生态 CRM、志愿者、通知、迁移、备份、安全、回滚、健康、监控、导出和权限门禁。
- `audit:runtime` 通过：高风险/严重依赖漏洞 0，uuid 有效版本为 `11.1.1`。
- H5 构建仍有 Rollup 大 chunk 提示但不影响构建；正式微信/短信/支付、真实设备和生产域名证书仍需外部环境验收。

# 2026-07-17 - 最终 CI 质量门禁回归

- `npm run ci:verify` 全部通过：运行依赖审计、API 全量测试、完整 preflight、shared/API/PC/H5 构建及微信小程序构建均成功。
- 当前全量 API 回归结果：94 个测试文件、552 项测试全部通过。
- 移动 H5 和微信小程序产物已重新生成，版本文件和小程序认证配置补丁均写入；构建仅保留 Rollup 大 chunk 非阻塞提示。

# 2026-07-17 - 交付索引与最新备份

- 新增 `docs/delivery-status-20260717.md`，同步记录当前 CI 证据、保留测试数据、最新备份、外部待验收项和最终交付判定口径。
- 执行 `npm run db:backup` 成功，生成 `backups/mysql/activity_registration-20260717-024256.sql.gz`，大小 `962,309` bytes，SHA-256 为 `719BBCFAE799C11497EFA3FA19B9E608FD3913A2D162EC4D28835EDEC412BA29`。

# 2026-07-17 - 应用内浏览器现场核销页复验

- 应用内浏览器复用已登录移动管理端，打开 `http://127.0.0.1:18080/?tenantCode=qiwai-showcase#/pages/admin/check-in`。
- 页面真实显示活动选择、核销点选择、离线清单下载、离线同步、扫码核销、手工签到码、备注、确认核销和现场统计；当前统计显示到场 `60`、待核销 `10252`、核销率 `0.6%`。
- 已完成当前页 DOM 状态检查并保存现场截图；相机权限、真实设备扫码和真实断网恢复仍按外部真机条件待验收。

# 2026-07-17 - 持续回归补充

- 重新执行 `npm run ci:verify` 时，执行器在 122 秒达到超时上限；输出仅包含既有 Rollup 大 chunk 非阻塞警告，未出现编译错误，因此本轮记为“未完成的超时尝试”，不覆盖此前已通过的完整 CI 证据。
- 当前环境复核：Docker 服务为 stopped，3306 端口无监听；真实 MySQL migration、备份恢复演练和依赖真实通道的验收继续保留为待外部环境项。
- 拆分回归已完成：`npm run test:preflight-guards` 全部通过，`npm run audit:runtime` 通过（high=0、critical=0、uuid=11.1.1）。一次错误尝试 `npm run test --workspace apps/api` 因仓库未声明该 workspace 被 npm 拒绝，未影响代码和数据。

# 2026-07-17 - 13.04 交付手册首版

- 新增 `docs/delivery-handbook-20260717.md`，汇总本地入口、已确认测试账号、保留业务数据、常用命令、角色操作摘要、上线前检查、外部待验收项和证据索引。
- 计划表 13.04 从“待开发”更新为“开发中”；最终接口矩阵、权限矩阵、逐角色截图和交付包校验值仍需在后续验收中补齐，未提前标记最终交付。

# 2026-07-17 - 13.04 权限与接口矩阵

- 新增 `docs/permission-api-matrix-20260717.md`，依据 `admin-permissions.ts`、角色定义、路由权限映射和控制器边界整理 75 项权限目录、角色基线、API 模块映射及高风险接口规则。
- 更新交付手册和计划表索引；`npm run test:preflight-guards` 全部通过，权限目录门禁确认 75 项，`npm run audit:runtime` 通过（high=0、critical=0、uuid=11.1.1）。

# 2026-07-17 - 现场核销应用内浏览器复验

- 在应用内浏览器复用已登录核销账号访问移动管理端核销页，真实确认活动/核销点选择、离线清单下载与同步、扫码、手工签到码、备注、确认核销和现场统计控件均存在。
- 页面数据显示到场 `60`、待核销 `10252`、核销率 `0.6%`，控制台 error/warning 为 0；未执行写操作，现有数据保持不变。
- 新增 `docs/browser-checkin-acceptance-20260717.md`；相机权限、真断网恢复、清单篡改和真机性能继续列为外部待验收。

# 2026-07-17 - API 回归与 H5 构建复核

- `npm test` 通过：94 个测试文件、552 项测试全部通过，业务任务测试中的 provider unavailable 为预期重试分支日志。
- `npm run build:mobile:h5` 通过，重新生成 H5 产物和 `apps/mobile/dist/build/h5/version.json`；仅有 uni-app 更新提示，无构建错误。

# 2026-07-17 - 交付制品校验清单

- 新增 `docs/delivery-artifact-checksums-20260717.md`，记录 package、Compose、生产环境模板、H5/小程序版本文件和最新数据库备份的字节数与 SHA-256。
- 清单明确标注当前为候选版本；生产构建、真实配置或备份变化后必须重新生成，最终完整构建目录归档校验值仍待交付打包阶段补齐。

# 2026-07-17 - 候选交付包归档

- 生成 `delivery/activity-registration-candidate-20260717-r1.zip`，大小 `4,550,927` bytes，SHA-256：`5CA1CF65BA1099BCE8309698AF03B58937A19320BB7AC95D70F97045A871F025`。
- 包内包含交付文档、部署配置、API/后台/H5/微信小程序构建产物、全部 migration、最新数据库备份和文件级 `MANIFEST.txt`；该包仍标记为候选包，待外部通道、真机、生产灰度和最终签收后再生成正式包。

# 2026-07-17 - 交付归档结构整改

- 校验发现 r1 将 API 与后台 `dist` 放入同一目录，存在制品边界不清风险；r2 又因通配符复制参数错误未包含四端构建物，均标记为过程文件，不得交付。
- 已生成有效候选包 `delivery/activity-registration-candidate-20260717-r3.zip`，大小 `4,550,423` bytes，SHA-256：`34AAD95995D340DD4C877504D6A792741511447CA804419D49DDD7C90AF3EDA7`。
- r3 压缩前检查四端文件数：API 593、PC 管理端 143、H5 172、微信小程序 341；构建产物分目录保存并写入文件级 `MANIFEST.txt`。

# 2026-07-17 - 安全与发布门禁复核

- `npm run security:secrets` 通过，扫描 3376 个源文件；候选包未包含真实 `.env.production`、`.env.local` 或密钥文件。
- `npm run test:preflight-guards` 全部通过，新增 `docs/security-release-acceptance-20260717.md`；真实通道、真机和生产灰度仍按外部环境待验收。

# 2026-07-17 - 最新候选交付包 r4

- 因 r3 生成后新增安全与浏览器验收文档，重新生成有效候选包 `delivery/activity-registration-candidate-20260717-r4.zip`。
- r4 大小 `4,552,985` bytes，SHA-256：`7916DE54EDA1738B557F8EBC768FB12C9864D8EE22B0229950DE588551759B38`。
- r4 包含最新文档和四端构建物，目录文件数保持 API 593、PC 143、H5 172、微信小程序 341；r1/r2/r3 均不作为交付包。

# 2026-07-17 - Docker/MySQL 恢复后的真实核对

- `npm run doctor` 确认 Docker、MySQL `127.0.0.1:13306`、API 3000 和 readiness 均正常；H5 5173 与后台 5174 当前未启动，已保留为开发服务提示。
- `npm --prefix apps/api run migration:show` 显示当前 176 条 migration 全部 `[X]` 已执行。
- `GET /api/health/ready` 返回 `ready=true`、`api=up`、`database=up`，无 blocking 配置错误；正式通道和生产配置仍有 warning。
- 执行 `npm run db:backup` 生成 `backups/mysql/activity_registration-20260717-030811.sql.gz`，大小 `962,309` bytes，SHA-256：`C41079B3E0BD9864EF9FD3FCF6B1F0D8BA47B17BD4E80D9CAC560D903AA318C0`。

# 2026-07-17 - 最新候选交付包 r5

- 重新生成包含最新数据库备份的 `delivery/activity-registration-candidate-20260717-r5.zip`。
- r5 大小 `4,553,457` bytes，SHA-256：`434C16DAE4722EDB8222C31C2D840E1B25190D5223BEBC7D0B244482E431DA07`。
- r5 四端文件数保持 API 593、PC 143、H5 172、微信小程序 341；r1-r4 均不作为当前交付包。

# 2026-07-17 - 本地全端服务恢复

- 创建运行日志目录并以隐藏后台进程启动 H5 与 PC 管理端开发服务；H5 `http://127.0.0.1:5173/` 和后台 `http://127.0.0.1:5174/login` 均返回 HTTP 200。
- 重新执行 `npm run doctor`，Node、npm、Docker、Compose、MySQL、API、API readiness、H5 和后台端口全部为 OK；短信、邮件、微信消息和通知调度仍为正式环境配置 warning。

# 2026-07-17 - 平台管理员 PC 浏览器复验

- 使用平台管理员登录 `http://127.0.0.1:5174/login`，成功进入 `/admin/tenants`；1440x900 桌面视口下侧栏、统计、筛选和商家表格正常显示。
- 真实加载 31 个租户，可上线 5、可灰度 2、暂不可上线 24、财务风险 2、套餐到期 7；联系人手机号保持脱敏，控制台 error/warning 为 0。
- 新增 `docs/browser-platform-admin-acceptance-20260717.md`；本轮仅登录和读取，未修改业务数据。

# 2026-07-17 - 财务角色浏览器验收与转化率整改

- 使用 `showcase_finance` 登录慢π演示中心，财务菜单和租户范围正确，真实显示待确认收款 3、待退款 8、净收入 3500.75 元、实收 5228.02 元、退款 1727.27 元，控制台无错误。
- 浏览器发现压测报名缺少浏览事件导致“浏览转报名”显示 `10117.6%`；新增 `dashboard-metrics.ts` 的 `boundedPercentage()`，统一将比例限制在 0%-100%，总览和活动排行共同使用。
- 新增 3 项比例测试；专项 2 文件 46 项测试和 API 构建通过。仅重建 API 容器，MySQL 和数据卷未变化；readiness 恢复后浏览器复验显示 `100%`。
- 新增 `docs/browser-finance-acceptance-20260717.md`；本轮未执行任何资金写操作。

# 2026-07-17 - 转化率整改全量回归

- 首次并行执行全量测试与构建因执行器 124 秒整体超时无法判定，随后拆分逐项执行。
- `npm test` 全量通过：95 个测试文件、555 项测试；新增 dashboard metrics 3 项已纳入全量门禁。
- `npm run build` 通过，Shared、API、PC 管理端和 H5 均成功生成生产产物；PC 仅保留 Element Plus vendor chunk 大小提示，H5 仅保留既有 Rollup 注释和大 chunk 提示。
- `npm run build:mobile:mp-weixin` 通过，并重新写入小程序授权配置补丁。

# 2026-07-17 - Doctor 子进程警告整改

- `npm run doctor` 曾因 Windows 下对 npm 使用 `shell: true` 触发 Node `DEP0190`，并在移除 shell 后出现 `spawn EINVAL`。
- 已改为 Windows 下通过 `cmd.exe /d /s /c npm --version` 执行版本探测，避免 shell 拼接和 EINVAL；复验 Node、npm 11.6.2、Docker、Compose、MySQL、API、H5 和后台检查均为 OK，输出不再包含 `DEP0190` 或 `spawn EINVAL`。

# 2026-07-17 - H5 游客首页浏览器验收

- 使用 H5 游客地址访问慢π演示中心首页，真实加载城市切换、活动列表、免费/付费活动卡片、公告、专题/共修/动态入口和“我的报名”。
- 首页营销弹窗命中“浏览器验收首页弹窗”，显示“验收通过”；控制台 error/warning 为 0，未登录状态未被错误送往登录页。
- 新增 `docs/browser-h5-home-acceptance-20260717.md`；本轮未提交报名或修改业务数据。

# 2026-07-17 - H5 活动详情 UTC 时区整改

- 游客详情页验收发现 UTC ISO 时间被直接截断显示，造成首页时间与详情时间不一致；API 状态和报名截止判断本身正确。
- 修复 `apps/mobile/src/pages/activity/detail.vue` 的 `formatTime()`，改为浏览器本地时区格式化并保留非法日期降级。
- 活动 `131` 复验显示 `2026-07-17 23:00 - 2026-07-18 01:00`、截止 `2026-07-17 06:00`，控制台无错误；H5 构建和全部 preflight guards 通过。
- 新增 `docs/browser-h5-activity-detail-acceptance-20260717.md`，未提交报名或修改业务数据。

# 2026-07-17 - 最新候选交付包 r7

- 将 H5 时间本地化修复后的构建、首页/详情浏览器验收文档和现有 API/PC/小程序制品重新归档为 `delivery/activity-registration-candidate-20260717-r7.zip`。
- r7 大小 `4,560,418` bytes，SHA-256：`9911E198C7B47753BF31F0AF2188CA4C7314B310CE0B88AC55B94835CDFA376D`。
- r7 四端文件数保持 API 595、PC 143、H5 172、微信小程序 341；r1-r6 均不作为当前交付包。

# 2026-07-17 - H5/doctor 整改后安全门禁复核

- `npm run security:secrets` 通过，扫描 9161 个已跟踪或未忽略源文件。
- `npm run audit:runtime` 通过：high=0、critical=0、uuid=11.1.1。
- `npm run test:preflight-guards` 全部通过，权限目录仍为 75 项；H5 时区整改和 doctor 子进程整改未引入门禁回归。

# 2026-07-17 - 完整 CI 质量门禁

- `npm run ci:verify` 完整通过，耗时约 117.8 秒。
- 运行时审计 high=0、critical=0、uuid=11.1.1；API 全量 95 个测试文件、555 项测试通过；全部 preflight guards 通过；Shared、API、PC、H5 和微信小程序构建均通过。
- 构建仅保留既有 Rollup 注释/大 chunk 非阻塞提示；微信小程序授权配置补丁重新生成。

# 2026-07-17 - API 故障与回滚演练

- `npm run drill:rollback:api` 通过：候选 API 故障被 readiness 检测，baseline 自动恢复成功，回滚耗时 `6.12s`，总耗时 `15.12s`。
- 恢复后 API readiness 为 ready、API up、database up；MySQL 13306 端口和数据卷保持正常，演练未执行 migration 或业务数据写入。
- 新增 `docs/rollback-drill-20260717.md`；生产镜像、真实流量和正式备份策略下的回滚仍需外部环境复演。

# 2026-07-17 - 最新候选交付包 r8

- 将回滚演练记录和计划表更新后的交付资料归档为 `delivery/activity-registration-candidate-20260717-r8.zip`。
- r8 大小 `4,561,778` bytes，SHA-256：`68CF625386148A5E7C685290C519CC0C086D07D1FEF23168F364C71B92B422E1`。
- r8 四端文件数保持 API 595、PC 143、H5 172、微信小程序 341；r1-r7 均不作为当前交付包。

# 2026-07-17 - 私有数据备份复核

- `npm run private-data:backup` 通过，生成 `backups/private-data/private-data-20260717-034135.tar.gz`，大小 `1,425` bytes，SHA-256：`FF723FD0A22021D87DFDA3A3A78723B134688B639E48DDFAB50FBE811F3FC6A1`。
- 归档包含 10 份加密援助材料，已验证路径安全；新增 `docs/private-data-backup-20260717.md`。
- 私有恢复脚本会写回 API 容器私有卷，本轮未设置确认变量、未覆盖当前私有数据；隔离容器/明确回滚点下的恢复演练继续待执行。

# 2026-07-17 - 监控健康检查

- `npm run monitor:health` 通过，状态 `ok`、告警 0；API/数据库 up、ready=true，业务任务积压/死信/过期锁、支付回调失败、退款失败、库存异常和资金风险均为 0。
- 结果写入 `deploy/monitor-health-result.json`，外部 webhook 未配置且告警指纹未变化，因此未发送外部通知。
- 新增 `docs/monitor-health-acceptance-20260717.md`，真实监控渠道接入后的触发/恢复通知继续待验收。

# 2026-07-17 - 线上演示上线前检查

- 执行 `npm run prelaunch:online-showcase`，真实结论为 `NO-GO`，共 8 个阻塞项；保持 `REAL_PAYMENT_ENABLED=false`。
- 阻塞原因包括缺少真实支付和多商户 smoke 结果、API_BASE 非 HTTPS、微信支付私钥/平台证书不可读、商城真实支付路由和服务商配置未就绪。
- 平台管理员登录、演示商家存在、回调地址模板、余额支付和线下收款均通过；新增 `docs/prelaunch-online-showcase-20260717.md`，不伪造外部证据文件。

# 2026-07-17 - 最新候选交付包 r10

- 将上线前 NO-GO 检查记录和质量复核后的最新资料归档为 `delivery/activity-registration-candidate-20260717-r10.zip`。
- r10 大小 `4,566,936` bytes，SHA-256：`D2BC3755E40ECBEC0E85EA0A81B340A3D7CCCEB6D9DEF9B7BE35A79AA20A3579`。
- r10 四端文件数保持 API 595、PC 143、H5 172、微信小程序 341；r1-r9 均不作为当前交付包。

# 2026-07-17 - 交付状态索引汇总

- 更新 `docs/delivery-status-20260717.md`，集中记录完整 CI、回滚演练、监控健康、私有备份、最新候选包和正式上线 NO-GO 阻塞项。
- 明确正式支付开关继续关闭，外部依赖和真机验收不以本地代码门禁通过替代。

# 2026-07-17 - 线上演示商家 Smoke 全流程

- 使用保留密码 `Qiwai123456` 执行 `npm run smoke:online-showcase`，线上演示商家完整闭环验收通过；脚本创建并保留独立用户 `13990054363` 至 `13990054367`。
- 覆盖免费/收费活动、报名/核销、余额支付、退款、课程、商城佣金边界、榜单搜索、优惠券、库存、收藏足迹、购物车、积分推广、拼团、取消/超时订单、线下物流、评价、售后、看板和财务导出追溯。
- 微信支付未就绪挡板验证通过，真实支付开关保持关闭；新增 `docs/online-showcase-smoke-acceptance-20260717.md`。

# 2026-07-17 - 最新候选交付包 r11

- 将 H5 无会话报名回跳记录和最新 13.04 交付索引资料纳入 `delivery/activity-registration-candidate-20260717-r11.zip`。
- r11 大小 `4,569,529` bytes，SHA-256：`BE9AD66422B413EF09F25E6C15B1B4BFD05C5841B3737B919A4E973E8EE2E1D8`。
- r11 四端文件数保持 API 595、PC 143、H5 172、微信小程序 341；r1-r10 均不作为当前交付包。

# 2026-07-17 - 最新候选交付包 r12

- 将线上演示商家完整 smoke 报告纳入 `delivery/activity-registration-candidate-20260717-r12.zip`。
- r12 大小 `4,571,087` bytes，SHA-256：`2B35BBADF2FFD5EE360CCA13A35D92445C40C72A74524F334487FBB4484A8A0A`。
- r12 四端文件数保持 API 595、PC 143、H5 172、微信小程序 341；r1-r11 均不作为当前交付包。

# 2026-07-17 - H5 报名确认页只读验收

- 从活动 `131` 详情页进入 H5 报名确认页，当前浏览器复用保留会员登录态，真实加载免费体验票、剩余 103、优惠码、积分抵扣、会员优惠和姓名/手机号/微信号/参与兴趣字段。
- URL 正确保留活动 ID、`source=h5` 和 `tenantCode=qiwai-showcase`；控制台 error/warning 为 0。
- 未点击确认提交，未产生报名、订单、积分或库存变化；未清除现有会话，因此游客登录拦截保留为独立无会话环境待验收。
- 新增 `docs/browser-h5-registration-page-acceptance-20260717.md`。

# 2026-07-17 - H5 无会话报名登录回跳

- 通过 H5“我的”页面退出保留会员账号后重新访问活动 `131`，点击“立即报名”成功跳转 `/pages/user/login`。
- `redirect` 保留报名路径、活动 ID、`source=h5` 和 `tenantCode`，登录页显示手机号/密码入口和“登录后沿用”，控制台无错误。
- 退出和跳转未改变报名、订单、积分或库存数据；补充证据已写入 `docs/browser-h5-registration-page-acceptance-20260717.md`。

# 2026-07-17 - H5 交付证据归档索引

- 计划表 13.04 补充 H5 首页、详情、报名确认和无会话登录回跳四类独立验收文档；13.02 继续保留真实支付、微信真机和生产环境待验收边界。

# 2026-07-17 - 最新候选交付包 r9

- 将监控健康检查、私有数据备份记录和最新数据库/私有数据备份纳入 `delivery/activity-registration-candidate-20260717-r9.zip`。
- r9 大小 `4,565,476` bytes，SHA-256：`B9065991BDAEAF1ECA77C942B019918D2B704D29A532F20A27ECF527DB3B7794`。
- r9 四端文件数保持 API 595、PC 143、H5 172、微信小程序 341；r1-r8 均不作为当前交付包。

# 2026-07-17 - 最新候选交付包 r6

- 将转化率整改后的 API、最新全端构建和平台/财务浏览器验收文档重新归档为 `delivery/activity-registration-candidate-20260717-r6.zip`。
- r6 大小 `4,557,697` bytes，SHA-256：`3838588029DB05E3AB61B74843EBC96F5B3F6778AB24A574F6918935959838C0`。
- r6 文件数：API 595、PC 管理端 143、H5 172、微信小程序 341；r1-r5 均不作为当前交付包。
# 2026-07-17 - 持续开发质量门禁复验

- 首次执行 `npm run ci:verify` 在 120 秒命令上限内未结束，不能作为失败结论；随后拆分执行全部环节并完成。
- `npm test` 通过：95 个测试文件、555 项测试全部通过。
- `npm run audit:runtime` 通过：high=0、critical=0，uuid 有效版本为 11.1.1。
- `npm run test:preflight-guards` 通过：全部生产、安全、权限、迁移、备份、监控、发布和交付门禁通过。
- `npm run build` 与 `npm run build:mobile:mp-weixin` 通过：Shared、API、PC、H5 和微信小程序产物均生成，微信小程序授权配置补丁成功应用。
- 构建仍提示第三方 Rollup 注释和大 chunk 警告，但未产生构建错误；外部正式支付/短信/微信真机/HTTPS 仍按计划表保持待配置或待验收。
# 2026-07-17 - 候选交付包 r13

- 以 r12 构建产物为基础纳入最新开发日志、浏览器验收、监控、备份和上线检查文档，生成 `delivery/activity-registration-candidate-20260717-r13.zip`。
- r13 大小 `4,854,737` bytes，SHA-256：`CA7A188B56D0529442C244307368A257AA485C4F3EB4CB89832D4E710BFC1960`；候选目录文件数 1515。
- 已同步更新 `docs/delivery-artifact-checksums-20260717.md`。r13 仍是候选交付包，不代表正式支付、真机、HTTPS、外部告警或生产灰度已验收。
# 2026-07-17 - 密钥扫描大工作区兼容整改

- 发现 Windows 上 `git ls-files -z` 文件列表超过 Node 默认 `execFileSync` 缓冲区，导致密钥扫描出现 `ENOBUFS`，并非密钥命中。
- `scripts/secret-scan.mjs` 增加 16 MiB 输出上限并保留 NUL 分隔解析；复验通过，扫描 `17,939` 个 tracked/unignored 源文件，未发现密钥。
- `npm run audit:runtime` 仍通过；正式上线检查仍为 `NO-GO`，外部支付、HTTPS 和证书阻塞项未改变。
# 2026-07-17 - 后台 DTO 白名单与静态审计整改

- 发布级静态审计发现 5 个后台提交载荷候选；已将社区关键词、讲师、考核、题目和课程公告保存改为显式字段白名单，避免 UI 字段、关联实体或只读 ID 被提交到 API。
- 修正 `scripts/codex-audit.mjs` 对“服务端记录复制到本地表单”的误报，只对实际 mutation payload 保持告警。
- PC 后台类型检查和生产构建通过；复验后 Admin DTO payload risk 已通过，自动审计仅剩工作区存在既有未提交改动的提示，不属于功能缺陷。
# 2026-07-17 - 候选交付包 r14

- 将后台 DTO 白名单整改后的最新 PC 生产构建、自动审计报告、开发日志及交付文档归档为 `delivery/activity-registration-candidate-20260717-r14.zip`。
- r14 大小 `5,390,486` bytes，SHA-256：`AC8F461C99BD297CE77770BCA5F281C228769D76EE1A9818AA2A1D8D7FB57A14`，候选目录文件数 1,584。
- r14 仍是候选交付包；正式支付、短信、HTTPS、微信真机、外部告警和生产灰度仍按实际状态待验收。
# 2026-07-17 - 干净候选交付包 r15

- 为消除 r14 覆盖复制可能遗留旧哈希静态资源的风险，从空目录重新组装 API、PC、H5 和微信小程序构建，不继承旧 `build` 目录。
- r15 大小 `4,855,460` bytes，SHA-256：`EEA1B5A34F65190114CA0486EAE92F4B20104FFBF77BCA8D9FA7B954CF67DBD9`，总文件数 1,515；PC 构建文件数严格恢复为 143。
- r15 取代 r14 作为当前有效候选包；仍不代表正式渠道和生产环境验收已完成。
# 2026-07-17 - r15 整改回归与计划同步

- 后台 DTO 白名单、密钥扫描缓冲区和自动审计规则整改后，API 全量 95 个测试文件、555 项测试再次全部通过。
- 持续开发计划表 12.04 已补 17,939 文件密钥扫描证据；13.05 已补 r15 干净归档、文件数量和 SHA-256。
# 2026-07-17 - 交付包自动结构校验

- 新增 `scripts/verify-delivery-package.mjs` 与 `npm run verify:delivery-package`，自动选择最新候选包或接受显式路径。
- 校验覆盖 API、PC、H5、小程序、database、deploy、docs 必需目录，重复 ZIP 条目、当前 PC 构建文件数、包大小和 SHA-256。
- r15 实跑通过：1,516 个 ZIP 目录项、143 个 PC 文件、SHA-256 `EEA1B5A34F65190114CA0486EAE92F4B20104FFBF77BCA8D9FA7B954CF67DBD9`。
# 2026-07-17 - 交付包校验接入发布门禁

- `preflight-build-artifact-guard.mjs` 现强制检查 `verify:delivery-package` 命令、四端目录、重复条目保护、PC 文件数一致性和交付文档命令。
- 构建产物 guard 与 r15 交付包结构校验均实跑通过；后续删除或弱化交付包验证会直接导致 preflight 失败。
# 2026-07-17 - 发布门禁链回归

- 全部 preflight guards 再次通过，确认交付包结构校验已由构建制品 guard 纳入完整发布门禁链。
- 无参数执行 `npm run verify:delivery-package` 能自动选择 r15，结构、143 个 PC 文件、1,516 个目录项和 SHA-256 全部通过。
# 2026-07-17 - 服务端字段契约复核与候选包 r16

- 对显式后台 DTO 与课程服务实际字段逐项复核，发现并补回考核 `sortOrder` 和课程公告 `expiresAt`，避免编辑旧记录时排序或失效时间被重置。
- PC 类型检查和生产构建通过；从空目录生成 r16 并自动校验通过：大小 `4,856,304` bytes、1,516 个 ZIP 目录项、143 个 PC 文件，SHA-256 `5E47E77BCA6D99BD8A16B99BE0C875E6BF30ED29811E65F2A63C094E60F7AE9C`。
# 2026-07-17 - Manifest 一致性整改与候选包 r17

- 发现 r16 的 `MANIFEST.txt` 继承早期候选包，PC 哈希文件名与当前构建不一致；新增 `generate:delivery-manifest`，按候选目录实际文件重新生成逐文件 SHA-256 清单。
- 交付包校验器新增 `MANIFEST.txt` 必需检查。r17 Manifest 覆盖 1,514 个文件，抽查已对应当前 `Activities-H3yBUUBj.js`、`AdCenter-D7ai3fN7.js` 等构建文件。
- r17 自动结构校验通过：大小 `4,859,709` bytes、1,516 个 ZIP 目录项、143 个 PC 文件，整包 SHA-256 `2C4691D910975F813DFB7757C939C67D1AB79CC72CA025FCECE2AB32BCB9C06B`。
# 2026-07-17 - Manifest 逐文件验证门禁

- 交付包校验器不再只检查 Manifest 存在：候选目录存在时会校验 Manifest 语法、重复记录、缺失/额外文件，并复算每个文件 SHA-256。
- r17 逐项复验通过，Manifest 文件数 `1,514`；构建制品 guard 已固定文件集合与哈希不一致检查，防止退回仅存在性校验。
# 2026-07-17 - 交付包期望校验值门禁

- 交付包校验器现读取 `docs/delivery-artifact-checksums-20260717.md`，强制比较候选包记录的大小和 SHA-256；不再只打印实际计算值。
- r17 实跑通过，输出 `checksumRecordMatched=true`；构建制品 guard 已固定检查该比较逻辑。
# 2026-07-17 - 交付校验全链回归

- 构建制品 guard、完整 preflight guards 和无参数交付包校验全部通过。
- r17 校验确认 `checksumRecordMatched=true`、Manifest `1,514` 文件、PC `143` 文件、ZIP `1,516` 目录项，整包哈希与清单一致。
# 2026-07-17 - 全端构建回归与干净候选包 r19

- Shared、API、PC、H5、微信小程序全端生产构建通过；构建警告仅为第三方 Rollup 注释和大 chunk 提示。
- r18 覆盖复制被 Manifest 正确发现旧资源残留，未作为交付；r19 改从空目录组装，API/PC/H5/小程序目录均只复制当前产物。
- r19 文件数 1,515（Manifest 覆盖 1,514）、PC 文件 143、ZIP 目录项 1,516，大小 `4,860,341` bytes，SHA-256 `31D43DEC28D316B5DBE9012CEBE471CCC36989B448F2E9D404722082BF5F2266`。
# 2026-07-17 - 私有数据隔离恢复演练

- `private-data-restore.mjs` 新增 `PRIVATE_DATA_RESTORE_TARGET_DIR`，目标路径强制限制在工作区内，设置后跳过 API 容器写入，仅执行隔离解压。
- 使用现有加密备份实跑恢复到 `.local-logs/private-data-restore-drill-20260717`，归档安全校验通过，恢复 9 个文件、1,368 bytes；现有 API 私有卷和业务数据未修改。
- 备份 preflight 已加入隔离恢复能力检查。
# 2026-07-17 - 运维证据同步与候选包 r20

- 将私有数据隔离恢复脚本、恢复演练记录和最新交付文档同步到候选包 r20；四端构建沿用 r19 已验证的干净目录。
- r20 Manifest 覆盖 1,515 个实际文件，候选目录总文件 1,516；大小 `4,862,513` bytes，SHA-256 `CE4BFA2EFEAC7B40CE9E9F5564A6AC909F05DE87A01370C27173CD7F3B9EB082`。
# 2026-07-17 - 发布级浏览器验收脚本整改

- release audit 首次因失效 `showcase_admin` 凭据失败；使用平台账号后发现脚本错误地把平台超管当作租户管理员，并把套餐开启等同于代理账号已授权。
- 脚本现拆分平台/租户边界：平台超管不再要求进入租户装修页；代理正向验收需显式 `RUN_AGENT_SETTLEMENT_ROLE=true`，否则记录待授权。
- 受控环境下完整 release audit 通过 doctor、preflight、release preflight、555 项 API 测试、全端构建、微信小程序构建、线上演示浏览器和移动管理浏览器验收。最终仅剩工作区持续开发改动提示，无阻塞问题。
# 2026-07-17 - 源码交付补齐与候选包 r21

- 审计发现此前候选包以构建、数据库、部署和文档为主，未完整包含最终交付要求中的可构建源码；r21 新增 `source/`。
- 源码树包含 API/PC/H5小程序/共享包源代码、全部脚本、CI 工作流、Dockerfile、TypeScript/Vite/Nest 配置及四个 workspace 的 package lock，共 920 个文件；不包含 node_modules、构建缓存和本地日志。
- r21 总文件 2,436，Manifest 覆盖 2,435；大小 `7,577,965` bytes，SHA-256 `2087200D866FEAFA933C3B93E273F6E53272F31C5D31097FBD1FE9FA59697E1B`。
# 2026-07-17 - 自包含源码树与候选包 r22

- 检查发现 r21 `source/` 缺少 deploy、docs 和正确的 `.github/workflows` 路径，导致解压后不能完整运行 preflight。
- r22 补齐生产环境模板、部署配置、交付/运维文档、CI 工作流、开发日志和 `.gitignore`；source 文件增至 1,012。
- r22 总文件 2,528，Manifest 覆盖 2,527；大小 `8,208,130` bytes，SHA-256 `34FF2434F3B8A1DB59AD335E9B58640FE5242413D307E8BDFAAD4106E6534517`。校验器新增自包含源码入口检查。
# 2026-07-17 - r22 源码树独立门禁验收

- 直接以 `delivery/candidate-20260717-r22/source` 为工作目录执行 `npm run test:preflight-guards`，全部 guard 和 75 项权限目录检查通过。
- 证明源码树中的 apps、packages、scripts、deploy、docs、CI 和根配置路径完整，可独立执行发布静态门禁；未借用工作区外层相对文件。
# 2026-07-17 - r22 敏感文件事故整改与安全候选包 r23

- 源码包审计发现 r22 的 `source/deploy` 包含真实 `.env.production`、真实支付 smoke 和多商户 smoke 结果；r22 立即作废，不得交付。
- r23 从安全基线重建，source/deploy 仅复制 `.env.local-docker.example`、`.env.production.example` 和 Nginx 配置，不复制真实环境或结果文件。
- 交付校验器新增禁止项：`.env.production`、真实支付/多商户结果以及 `.pem/.p12/.pfx/.key`；构建制品 guard 固定该规则。
- r23 source 文件 1,005、总文件 2,521、Manifest 2,520；大小 `8,198,339` bytes，SHA-256 `23A14907B3B69A6A024311BA5E0B7F5E467E11B3AEF28928ECDBDE58D1749290`。
# 2026-07-17 - r22 敏感副本清理复验

- 删除 r22 候选目录中的真实 `source/deploy/.env.production`，并强制重建 r22 ZIP，确认压缩包内已无该路径；r22 仍保持作废状态，不得交付。
- 全工作区密钥扫描复验通过，扫描 36,589 个 tracked/unignored 文件无命中。
- r23 校验输出 `forbiddenEntries=0`；`source/scripts/real-payment-smoke-result.mjs` 是验收脚本源码，不是禁止的结果 JSON。
# 2026-07-17 - 模板门禁模式与安全候选包 r24

- r23 源码树独立门禁发现缺少真实支付、多商户和租户 smoke 的 `.example.json` 合同模板；这些模板不含真实交易数据，已安全补齐。
- `preflight-env-sync-guard` 新增显式 `PREFLIGHT_ALLOW_ENV_TEMPLATE_ONLY=true`：仅用于源码交付包静态验证；默认未设置时仍强制要求真实 `deploy/.env.production`，生产安全要求未放宽。
- r24 source 内完整 preflight guards 和 75 项权限目录检查通过；source 文件 1,008、总文件 2,524、Manifest 2,523。
- r24 大小 `8,203,940` bytes，SHA-256 `8E28B1052E401D745FCD3A4784EC64D5F32C37600CA53B6978E6F1943F160C70`。
# 2026-07-17 - r24 安全与默认生产门禁复验

- 全工作区密钥扫描通过，覆盖 39,110 个 tracked/unignored 文件；新增 smoke 示例和模板模式无密钥命中。
- 工作区默认模式完整 preflight guards 通过，证明模板模式未放宽正常生产门禁。
- r24 交付校验通过：期望哈希匹配、Manifest 2,523、source 入口 5/5、禁止文件 0。
# 2026-07-17 - 统一源码验证命令与候选包 r25

- 新增 `npm run verify:delivery-source [source-directory]`，自动定位最新候选源码树，禁止真实 `.env.production`，并注入模板静态验证模式运行完整 preflight。
- Windows 首次 `spawnSync npm.cmd` 返回 EINVAL，已改为 `cmd.exe /d /s /c`；自动验证 r24 source 全部通过。
- r25 同步新命令到外层和 source，Manifest 覆盖 2,524 个文件；大小 `8,206,706` bytes，SHA-256 `82786FCF60EBF6C0D0A1C0713B0DD417EF009C3D6C4173CB7D2E67C5144D76E0`。

# 2026-07-17 - r25 源码锁文件干净安装验证

- 在 `delivery/activity-registration-candidate-20260717-r25/source` 内分别执行 Shared、API、PC 的 `npm ci --dry-run --ignore-scripts`，以及 H5/微信小程序 workspace 的 `npm ci --dry-run --ignore-scripts --legacy-peer-deps`，四个锁文件均以退出码 0 通过。
- dry-run 后复核四个 workspace 均未生成 `node_modules`，候选源码树未被安装产物污染；该证据验证 r25 的 package lock 可供交付方执行可重复干净安装，但不替代正式环境安装、构建和外部渠道验收。

# 2026-07-17 - 课程资源文件签名与类型治理

- 审计计划表 `08.05` 时发现课程资源上传仅校验客户端声明 MIME，且允许 `application/octet-stream`，伪造视频/附件可能被写入公开上传目录。
- 扩展共享文件签名识别，覆盖 MP4、WebM、MP3、WAV、Ogg、ZIP/DOCX 和旧版 DOC；新增课程资源分类验证器，严格匹配视频、音频、图片和附件白名单，统一清理原文件名并保留安全扩展名。
- 课程对象键加入租户和后台操作者归属；脚本、可执行文件、未知二进制、声明 MIME 与内容不一致的文件现在全部拒绝。
- 上传专项测试、API 构建和 `preflight-upload-guard` 通过。计划表 `08.05` 更新为开发中；私有附件鉴权下载、病毒扫描、生命周期和生产私有桶策略仍继续开发/验收，未提前标记完成。
- 最终全量 API 回归通过：`95` 个测试文件、`563` 项测试；计划表 `13.01` 的当前测试基线已同步更新。

# 2026-07-17 - 报名附件加密存储与鉴权下载

- 新报名附件不再写入公开 `/uploads`：文件经现有加密私有文档能力保存到 `private-data/registration-attachments`，返回包含用途、会员、租户、文件名、MIME、大小和加密引用的 HMAC 防篡改令牌地址。
- 报名提交时再次验证令牌签名、用途、会员归属、租户归属及文件存在性，阻止复制其他会员或其他租户附件；旧 HTTP/`/uploads` 答案继续兼容，保留现有报名数据。
- 新增会员本人下载和后台授权下载接口；会员接口要求当前登录用户与令牌 owner 一致，后台接口要求运营角色、`registration.view` 权限和租户匹配，均返回 `private, no-store`。
- 私有文档工具升级为兼容旧援助材料 scheme 的多命名空间存储；私有数据备份原本覆盖整个 `private-data`，因此新报名附件自动进入现有备份/隔离恢复链路。
- API 全量回归通过：`96` 个测试文件、`565` 项测试；API 构建、上传 guard、生产环境键同步 guard 和 Compose 环境 guard 全部通过。
- 完整 `test:preflight-guards` 再次通过，包括 75 项后台权限目录；由于当前源码已晚于 r25，r25 仅保留为历史可复验候选，不再代表最新工作树，下一候选包将在本批私有文件治理完成后从空目录重建。

# 2026-07-17 - 代理打款回单私有化

- 发现公益项目公开披露与代理结算共用原 `/admin/uploads/settlement-proofs`；为避免破坏公益透明披露，保留原公开端点，并新增仅财务角色可用的 `/admin/uploads/private-settlement-proofs`。
- 代理结算上传改走私有端点，文件加密保存到 `private-data/settlement-proofs`，令牌绑定用途、租户和上传管理员；标记结算已打款时再次验证令牌签名、文件存在性和当前租户，阻止跨租户凭证复制。
- PC 查看私有回单改用统一 `downloadFile` 携带后台 Bearer token 下载，不再用无鉴权 `window.open`；历史 HTTP(S) 回单继续兼容。
- API 全量 `96` 个测试文件、`566` 项通过；API/PC 生产构建、上传 guard 和完整 preflight guards 全部通过。

# 2026-07-17 - 课程原文件私有化与短时媒体访问

- 后台课程资源上传现在必须携带 `courseId`，服务端确认课程存在并执行租户数据范围；新视频、音频和附件加密保存到 `private-data/course-resources`，数据库仅保存 `private-course-resource://` 私有引用。
- 课程公开详情和播放器仍先执行购买/免费/试看权限；只有可访问课时才把私有引用转换为 15 分钟 HMAC 短时 URL，无权限响应继续清空视频、音频、附件和正文。
- 新媒体读取接口验证用途、签名、过期时间与文件存在性，支持 `Range`、`206 Partial Content`、`Content-Range` 和非法区间 `416`；视频/音频 inline，附件强制下载。
- H5 与微信小程序播放器统一解析视频、音频和附件相对 API 地址，避免小程序媒体组件无法播放相对短链。
- API 全量 `96` 个测试文件、`566` 项通过；API、PC、H5、微信小程序构建、上传 guard 和全部 preflight guards 通过。真实大文件、短链过期、Range 播放、恢复和微信真机仍待可执行验收。

# 2026-07-17 - 统一上传恶意文件扫描适配

- 新增 ClamAV `INSTREAM` 客户端，支持 `disabled`、`optional`、`required` 三种模式；所有模式均先拦截 EICAR 标准风险特征，`required` 在 ClamAV 不可用、超时、异常响应或发现风险时拒绝上传。
- 扫描已接入会员头像、社区图片、商城评价/售后凭证、商户资质、报名附件、援助材料、后台图片、公开/私有打款凭证和课程视频/音频/附件，扫描在持久化之前执行。
- API 与生产环境模板、真实部署环境和 Compose 增加 `UPLOAD_MALWARE_SCAN_MODE`、`CLAMAV_HOST`、`CLAMAV_PORT`、`CLAMAV_TIMEOUT_MS`；当前保持 `disabled` 兼容，正式运营必须在真实 ClamAV 拒绝与中断演练通过后切换 `required`。
- 专项覆盖普通文件、EICAR 拒绝和 required 模式服务不可用拒绝；API 全量 `97` 个测试文件、`569` 项通过，API 构建、环境同步、Compose、上传 guard 和全部 preflight guards 通过。

# 2026-07-17 - 私有文件认领与孤立文件清理演练

- 私有文件写入时同步生成受控 `.meta.json`，记录命名空间、文件 ID、创建时间、认领时间、原文件名、MIME 和大小；历史无元数据文件保持不动。
- 报名附件在报名答案校验通过时认领，代理回单在结算保存时认领，课程资源在课时保存时认领并二次验证课程/租户归属，援助材料在入库事务中认领。
- 新增 `npm run private-data:prune-unclaimed`：默认 dry-run，只有设置 `PRIVATE_DATA_PRUNE_CONFIRM=delete-unclaimed-private-data` 才删除超过 `PRIVATE_DATA_UNCLAIMED_RETENTION_HOURS` 的未认领文件；每次运行写 `.local-logs` JSON 审计记录。
- 隔离目录演练创建 1 个 48 小时未认领文件和 1 个已认领文件；dry-run 扫描 2、候选 1、删除 0，确认删除后只移除孤立文件及元数据，已认领文件和元数据均保留。记录为 `.local-logs/private-data-prune-1784238682171.json` 和 `private-data-prune-1784238682323.json`。
- API 全量 `97` 个测试文件、`569` 项和完整 preflight guards 再次通过；计划表 `08.05` 更新为待验收。

# 2026-07-17 - 私有文件治理全端回归与候选包 r26

- Shared、API、PC、H5、微信小程序生产构建全部通过；随后从空目录组装 r26，没有沿用 r25 构建目录。
- r26 source 包含当前 apps、packages、scripts、docs、deploy 模板和 CI，共 1,050 个文件；排除 node_modules、dist、delivery、本地日志、私有数据、备份、真实 `.env.production`、真实 smoke 结果和密钥文件。
- 候选目录共 2,570 个文件，Manifest 覆盖 2,569，PC 构建 143 个文件；ZIP 大小 `8,321,383` bytes，SHA-256 `8B27D8CA61FF43B8B81F847F6A382610BEC3017D5165D8997996CF753D2CA733`。
- r26 交付包验证通过：ZIP 条目 2,577、期望哈希匹配、源码入口 5/5、禁止文件 0、Manifest 文件集合及逐文件 SHA-256 全部一致。
- r26 source 独立执行完整 preflight guards 和 75 项权限目录通过；Shared/API/PC/H5小程序四个锁文件分别完成 `npm ci --dry-run --ignore-scripts`（移动端含 `--legacy-peer-deps`），均退出 0 且未生成 node_modules。
- r26 正式取代 r25 为当前有效候选；真实支付、微信真机、正式 ClamAV、生产私有存储和生产发布仍保持待外部验收，未宣布最终交付完成。

# 2026-07-17 - 统一订单与资金权限边界整改

- 后台页面审计发现 `/unified-orders` 仅要求 `order.view`，但挂载时无条件请求需要 `finance.view` 的资金列表，导致只读订单账号进入后出现 403；页面现在仅对具备 `finance.view` 的账号加载和展示资金区。
- 统一资金导出按钮进一步要求 `finance.export`；一致性检查继续要求 `finance.view`。服务端权限解析补齐 `/unified-funds/consistency` 和 `/unified-funds/export` 的显式映射，避免高风险资金接口落入未命中目录的状态。
- 专项权限测试 `12` 项通过，PC TypeScript 检查和生产构建通过，前后端 `75` 项权限目录一致性门禁通过。r26 早于本次代码变更，继续作为上一有效候选；后续实质批次完成后重建新候选。

# 2026-07-17 - 后台全控制器细粒度权限覆盖门禁

- 权限路径规范化原正则会把资源名 `admins` 和 `admin-invitations` 的开头误当作 `/admin` 路由前缀移除，导致账号管理接口无法命中 `admin.manage`，只能退回粗粒度超级管理员角色判断；现仅移除完整的 `admin/` 路径段，并补相对路径、完整 API 路径回归测试。
- 新增基于 Nest 路由元数据的自动化门禁，遍历主后台、课程、商城和 v1 后台控制器；所有声明 `@AdminRoles` 的 GET/POST/PUT/PATCH/DELETE 路由必须由 `resolveAdminRoutePermission` 显式映射，公开登录、本人改密和邀请接受等无角色路由不误纳入。
- 补齐业务任务、套餐事件和变更、账号与邀请、代理更新、用户钱包、配置连通性、课程内容/考核/退款、共学任务、内容治理、商户申请/资质/合同、品牌、营销风险、佣金规则、评价举报、库存异常和渠道账单的权限归属。专项 14 项、API 全量 97 个测试文件 573 项、API 构建、后台角色门禁、75 项权限目录门禁及 `git diff --check` 全部通过。
- r26 不包含本次权限修复；待下一批实质变更完成后从空目录重建新候选，不以旧包冒充最新源码。

# 2026-07-17 - 课程退款财务工作台与入口闭环

- 权限行为审计发现课程退款接口允许财务角色，但 PC 仅在要求 `course.manage` 的课程管理弹窗提供入口，财务账号无法进入；运营账号进入课程运营弹窗后又会无条件请求要求 `order.refund` 的接口并显示部分加载失败。
- 新增 `/course-refunds` 独立财务页面并接入平台/租户财务菜单和路由，严格要求 `order.refund`；支持状态与课程筛选、加载错误重试、会员手机号脱敏、审核通过/拒绝、退款通道成功确认和失败登记，确认或输入弹窗打开后全局互斥，取消可靠恢复。
- 课程运营聚合加载仅在具备 `order.refund` 时请求退款接口，不再把权限拒绝伪装成课程运营同步故障。退款完成继续复用服务端事务规则：部分退款保留学习权限，全额退款撤销课程权限与有效证书。
- PC TypeScript 检查和生产构建通过，课程退款/权限专项测试通过，后台角色门禁和差异检查通过。使用保留账号 `showcase_finance` 浏览器真实进入新页面并加载退款 `CRF178422647754253`、`CRF178411201976019`，共 2 条；页面无 console warning/error、无横向溢出，测试数据保持不变。

# 2026-07-17 - 商城支付日志读写权限拆分

- 审计发现 `/mall-payment-logs` 路由只要求 `mall.finance.view`，但页面无条件展示渠道账单拉取/导入/认领/解决和佣金结算/复核/扣回，细粒度只读账号只能在点击后收到 403。
- 页面新增 `mall.payment.manage` 和 `mall.settlement.manage` 判定：前者控制收款配置、账单拉取/导入及差异处理，后者控制商城结算入口和全部佣金写操作；查看、筛选与导出继续由 `mall.finance.view` 提供。所有写函数同时增加权限入口保护，避免残留组件状态或脚本调用发出请求。
- `menu-integrity.spec.ts` 新增源码契约，固定按钮级权限和函数级保护。PC TypeScript 检查与生产构建、菜单/全路由权限专项、后台角色门禁及差异检查通过。
- 使用 `showcase_finance` 浏览器验证完整财务权限下三个写入口正常展示，页面无 console warning/error、无横向溢出。仅 `mall.finance.view` 的真实自定义账号尚未创建，保留到全角色矩阵验收批次执行；本次未修改业务数据。

# 2026-07-17 - 商城结算平台权限收紧与真实查询 500 修复

- 结算工作台已在 UI 限制只有平台账号可生成、审核、调整和付款，但 `mall.settlement.manage` 未标记为平台专属，租户财务默认及历史持久权限仍可能通过接口直接操作。前后端权限目录现将其标记为 `platformOnly`；所有角色的租户默认权限统一过滤平台权限，有历史持久权限的租户账号在计算有效权限时也会即时剔除。
- 租户财务浏览器验收发现 `/api/admin/mall/settlements?merchantId=38` 返回 500，原始错误为 `Unknown column 'distinctAlias.line_id' in 'field list'`。数据库迁移 176 项全部已执行，`mall_settlement_lines.id` 实际存在；根因是仅选择 `sourceType/sourceId` 后仍使用 TypeORM `take().getMany()`，框架分页包装要求子查询包含主键。
- `settledMallSnapshotIds` 改用带稳定别名的 `getRawMany` 标量查询，并新增源码回归契约，避免再次回退为实体分页。专项 3 个测试文件 29 项、API/PC 生产构建和权限门禁通过。
- 使用项目名 `activity-registration` 重建 API 容器，MySQL 数据卷保持不变；readiness 第 3 次检查通过。重新登录 `showcase_finance` 后结算接口返回 200、39 ms，页面加载 15 行表格，生成、审核、拒绝、打款、扣回和调整按钮均未出现，无 console warning/error、无横向溢出，API 日志无 `distinctAlias.line_id` 或新 `api_error`。

# 2026-07-17 - 商城订单页写操作细粒度权限整改

- `/mall-orders` 同时允许商城订单和财务查看权限进入，但原页面把订单确认/关闭/发货、售后审批、物流配置、营销配置和佣金结算全部直接展示；现分别由 `mall.order.manage`、`mall.refund.manage`、`mall.logistics.manage`、`mall.product.manage` 和 `mall.settlement.manage` 控制。
- 高风险按钮和表格操作列按权限隐藏，所有对应写函数增加同口径入口保护，避免残留弹窗状态或脚本调用绕过页面展示限制。只读能力继续保留订单、售后、支付、佣金和结算数据查看及现有权限允许的导出。
- 新增菜单完整性源码契约；PC 生产构建、20 项权限专项、后台角色门禁和差异检查通过。浏览器页面无 console warning/error、无横向溢出。
- 保留财务角色既有业务语义：当前默认财务岗包含订单、售后和支付操作权限，因此 `showcase_finance` 不作为纯只读账号伪造验收；仅 `mall.finance.view` 的自定义只读账号继续列入全角色矩阵验收，测试数据未修改。

# 2026-07-17 - 商城物流只读模式、营销佣金隔离与专用验收账号

- 独立物流页路由允许 `mall.order.manage` 的履约人员进入查看快递公司，但原页面仍展示新增、编辑和启停配置；现新增 `mall.logistics.manage` 双态，履约人员只见列表和明确只读提示，配置表单、操作列及写函数全部受物流权限保护。
- 营销中心仅要求 `mall.product.manage`，原先无条件加载要求平台 `mall.settlement.manage` 的佣金规则，租户营销账号会收到 403；佣金规则标签、加载、保存和停用现全部由平台结算权限控制，未授权的 `?tab=commissions` 深链接自动回落优惠券页。
- 新增并保留 `showcase_mall_readonly`（商城财务只读）和 `showcase_mall_fulfillment`（商城订单履约）账号，密码均为 `Qiwai123456`；两账号及最小店铺权限已纳入 `seed-online-showcase.mjs`，可重复初始化。
- 浏览器真实验收：只读财务加载 263 笔订单，仅保留查看、刷新和导出入口；履约账号物流页显示只读提示且无配置表单/操作列；租户店铺运营账号营销中心仅有优惠券、秒杀、拼团、推广码四个标签，佣金规则不出现。三页均无 console warning/error、无横向溢出，未修改订单和营销业务数据。
- PC 生产构建、3 文件 31 项权限专项、后台角色门禁、种子脚本语法和差异检查全部通过。

# 2026-07-17 - 商城管理权限依赖展开与最小售后角色闭环

- 自定义角色可只勾选管理权限，但商城读取接口使用独立查看权限：仅有 `mall.order.manage`、`mall.refund.manage`、`mall.payment.manage` 等权限时会出现“能处理但打不开列表”的反向缺口。
- 前后端统一增加权限依赖展开：商城订单管理自动包含店铺/订单查看，售后管理自动包含店铺、订单和商城财务查看，支付与平台结算管理自动包含商城财务查看；商品、审核、评价、物流和统计管理自动包含店铺查看。租户上下文仍先剔除平台专属权限，再展开安全的读取依赖，不会恢复 `mall.settlement.manage`。
- 新增并保留 `showcase_mall_refund_only / Qiwai123456`，数据库显式权限仅为 `mall.refund.manage`；登录响应自动补齐 `mall.merchant.view,mall.order.view,mall.finance.view`，真实请求店铺 38 售后接口返回 200、42 条记录，请求号 `242510fd-e27c-4d52-9f05-4555be07a691`。
- 浏览器以该最小角色打开售后工作台，展示 42 条售后、23 条待处理和完整审核按钮，无 console warning/error、无横向溢出；跨模块快捷入口同步按权限收口，没有 `mall.statistics.view` 时不再显示经营统计。
- API/PC 生产构建、32 项权限专项、75 项权限目录和角色门禁通过；API 容器已重建并在第 3 次 readiness 检查通过，MySQL 数据卷及既有业务数据保持不变。账号已加入演示种子脚本。

# 2026-07-17 - 商城 PC 工作台跨模块入口与财务分区容错

- 库存、评价、财务总览和店铺治理页面存在跨模块快捷入口未按权限展示的问题：商品运营、订单查看、经营统计和支付配置账号会在点击后才被路由或接口拒绝。现分别按 `mall.product.manage`、`mall.order.view`、`mall.statistics.view`、`mall.payment.manage` 和 `mall.finance.view` 收口入口。
- 店铺治理页仅有 `mall.merchant.manage` 时不再批量请求支付体检，也不展示商品和收款配置；打开/保存收款账户的函数入口增加支付配置权限保护，避免残留弹窗或脚本调用越界。
- 最小售后角色打开商城财务总览时，订单汇总、支付流水、退款日志和佣金汇总均为 200，但店铺授权未含 `settlement.view`，原 `Promise.all` 会把结算分区 403 升级成整页失败。现结算列表独立加载与容错，失败时只清空结算数据、显示权限警告并隐藏结算入口和导出，核心财务数据保持可用。
- 浏览器使用 `showcase_mall_refund_only` 复测店铺 38：核心数据加载为订单 263、实收 10991.75 元、净收 9955.00 元、退款 1036.75 元、待处理售后 23；结算权限警告单独展示，结算快捷入口和导出均隐藏，无全页错误、无 console warning/error、无横向溢出。
- PC 生产构建、菜单完整性 9 项及组合专项 20 项通过，差异检查通过；未修改订单、退款、资金和结算业务数据。

# 2026-07-17 - 多权限路由快捷入口收口与最小运营设置账号

- 继续审计 PC 多权限路由：商城结算页允许结算管理或财务查看进入，但订单、统计、支付日志快捷入口原先无条件展示；现分别要求 `mall.order.view`、`mall.statistics.view` 和 `mall.finance.view`。
- 系统/运营设置共用页面允许 `system.manage` 或 `operation_settings.manage` 进入，原“管理入口”会向仅有运营设置权限的租户账号展示分类、首页装修、员工账号和操作日志卡片。入口现分别要求分类、首页、租户、账号、日志或系统管理权限；没有任何目标权限时整张“管理入口”标签页不再显示。
- 新增并保留 `showcase_operation_settings_only / Qiwai123456`，显式权限仅为 `operation_settings.manage`，并加入演示种子脚本。
- 浏览器真实登录该账号后，菜单仅有运营设置；页面只显示“运营设置”标签，不出现空的管理入口或分类、装修、账号、日志入口，无 console warning/error、无横向溢出，未保存或修改运营配置。
- PC 生产构建、`vue-tsc --noEmit`、24 项组合权限专项、菜单完整性 10 项、种子脚本语法和差异检查通过。

# 2026-07-17 - 运营设置日志与图片上传权限收口

- 最小运营设置账号浏览器快照继续发现：没有 `logs.view` 仍显示验证码日志入口，没有 `upload.image` 仍显示默认群二维码、品牌 Logo 和背景图上传控件，点击后只能收到接口拒绝。
- 验证码日志按钮现要求 `logs.view`；三类图片上传控件现要求 `upload.image`。上传前置校验同步增加权限保护，即使残留组件状态或脚本调用触发选择文件，也会在发送请求前拒绝。
- 使用 `showcase_operation_settings_only` 浏览器复测：页面仅有运营设置标签，不显示管理入口、上传二维码、上传 Logo、上传背景图或验证码日志，无 console warning/error、无横向溢出，未执行上传和配置保存。
- `vue-tsc --noEmit`、菜单完整性 10 项和差异检查通过。

# 2026-07-17 - 权限整改批次全量回归

- 对商城订单、售后、物流、营销、结算、库存、评价、财务、店铺治理及系统/运营设置的连续权限整改执行全量回归，不以窄专项代替整体证据。
- API 全量 `97` 个测试文件、`582` 项全部通过，耗时 14.40 秒；覆盖租户上下文、公开数据边界、资金/库存/退款并发、上传安全、migration 可逆、权限目录和菜单完整性等。
- 完整 `preflight.mjs` 退出 0；唯一提示为正式短信环境变量未完整配置，允许由后台系统设置提供生产短信凭据，继续保持外部正式通道验收状态，没有被误报为已完成。
- Shared、API 和 PC 生产构建全部通过；PC 共转换 1,944 个模块并生成最新静态版本。全工作树 `git diff --check` 无空白错误，仅有 Windows LF/CRLF 提示。
- 本次回归未发现新的代码缺陷，不修改数据库和保留测试数据；目标仍未完成，继续 H5/小程序、移动管理、生产运维与最终交付工作包。

# 2026-07-17 - 候选交付包可重复组装与 r31 校验

- 新增 `scripts/assemble-delivery-candidate.mjs` 和 `assemble:delivery-candidate`，从空目录按白名单组装 API、PC、H5、微信小程序构建产物、最新数据库/私有数据备份、全量 migration、部署模板、文档和自包含源码，并自动生成逐文件 SHA-256 Manifest 和 ZIP。
- 源码复制明确排除 `node_modules`、`dist`、历史交付目录、备份源目录、运行日志、实际 `.env`、`.env.production`、密钥和证书文件；首次扫描发现普通 `apps/api/.env` 风险后立即收紧规则并废弃中间候选，不以验证器最低规则代替敏感信息治理。
- r31 从空目录组装 2,573 个 Manifest 文件，使用数据库备份 `activity_registration-20260717-030811.sql.gz` 和私有数据备份 `private-data-20260717-034135.tar.gz`；ZIP 大小 9,405,047 bytes，SHA-256 `706CFE0D47FCD6582DD668D0B891C6B56F06C8E3839ADB54CF08B7EDFA9A538A`。
- r31 source 独立执行全部 preflight guards 通过；ZIP 使用标准顶层条目且敏感路径扫描未发现实际环境文件、私钥、证书、依赖目录或源码构建目录。正式支付、短信、微信、对象存储、HTTPS 和真机验收仍保持外部待验收状态。

# 2026-07-17 - 移动管理端退款异常处置闭环

- 在既有移动退款审核页上补齐全部、待审核、提交中、处理中、失败、已通过、已完成和已拒绝状态筛选；查看权限与退款处理权限继续由 mobile bootstrap 分离，最小财务查看账号不会获得写入口。
- 失败退款不再要求返回 PC：移动端支持填写渠道核对说明后使用原退款号重试，并在提交前复核登录 token 和租户上下文；新增渠道回执扫描入口。加载、搜索、翻页、审核、重试和扫描使用统一互斥状态，避免重复提交和筛选竞态。
- 新增源码契约固定退款路由、底部导航权限、审核、失败重试、回执扫描和账号/租户切换保护。菜单完整性 11 项、H5 和微信小程序生产构建通过。
- 使用 `showcase_finance` 在应用内浏览器真实加载 8 条待审核退款，验证 8 类状态筛选、审核确认弹窗和操作锁；390 x 844 视口无横向溢出，console warning/error 为 0。仅打开并取消弹窗，未修改退款或资金数据，详见 `docs/browser-mobile-refund-acceptance-20260717.md`。

# 2026-07-17 - 移动管理端经营统计闭环

- mobile bootstrap 新增 `canViewAnalytics`，严格复用 `analytics.view`；首页和底部导航只向有权限账号展示统计入口，无权限账号请求统计接口继续由统一路由权限返回 403。
- 新增移动经营统计页，默认近 30 天并支持 7/30/90 天切换；复用统一概览、趋势和渠道接口，展示浏览/报名/支付/净收入、五阶段漏斗、退款/回调/对账风险、近 14 条日趋势、前 10 个渠道和运营建议。三个数据分区使用 `Promise.allSettled` 独立容错。
- 专项 2 个测试文件 55 项、API/H5/微信小程序构建通过；API 容器切换至最新镜像并健康，MySQL 容器和数据卷保持不变。
- `showcase_finance` 浏览器真实显示近 30 天浏览 24、报名 168、签到 32、待处理退款 8、4 个渠道和运营建议；时间范围切换正常，390 x 844 无横向溢出，console warning/error 为 0。详见 `docs/browser-mobile-analytics-acceptance-20260717.md`。

# 2026-07-17 - 移动管理端资金异常处置闭环

- mobile bootstrap 将资金风险查看和处置拆为 `canViewFinanceRisks` / `canManageFinanceRisks`，分别来自 `finance.view` / `finance.manage`；统计风险卡和首页增加异常处置入口，但只向具备查看权限的账号展示。
- 新增移动资金异常台，支持待处理、跟进中、已解决、全部状态及支付、回调、账实、账单、退款、钱包类型筛选；展示风险级别、业务编号、发现次数、处理人和依据。管理权限可扫描、确认跟进、填写依据解决和重新打开，写操作校验账号/租户未切换并全局互斥。
- 资金风险、菜单契约和后台服务专项 3 个文件 57 项，API/H5/微信小程序构建通过；API 容器已更新并健康，MySQL 数据卷保持不变。
- 财务账号真实加载 9 条已解决保留告警，钱包负余额筛选命中 1 条，重新打开弹窗打开后取消；390 x 844 无横向溢出、console warning/error 为 0。只读代理财务可列表 200、扫描 403，详见 `docs/browser-mobile-fund-risk-acceptance-20260717.md`。

# 2026-07-17 - 会员动态分群快照闭环与平台数据越权修复

- 演示租户创建并保留分群 `验收保留-已报名会员-20260717`（ID 2），最低报名 1 次真实预览 113 人；固化快照 `MS17842464906133F6440`（ID 2）同样包含 113 人。行为标签刷新覆盖 168 个档案，新增 139 条系统标签、移除 0 条。
- 真实验收发现租户账号可读取平台分群 1 快照，根因是分群误用了允许平台公共对象的通用租户断言。新增严格平台/租户作用域判定，分群更新、快照创建、快照列表和快照成员均要求 actor tenantId 与对象 tenantId 完全一致。
- 修复后租户读取平台快照列表、平台快照成员和更新平台分群三条路径均返回 404；自身分群快照和 113 名成员继续返回 200。作用域规则新增 5 项单测。
- PC 分群页补齐快照成员下钻、独立错误重试、关闭和分页；浏览器真实展示 113 人、每页 20 条并切换第 2 页，无 console warning/error 和横向溢出。
- 分群专项 3 文件 21 项、API 全量 98 文件 591 项、API/PC 构建通过。详见 `docs/member-segment-browser-acceptance-20260717.md`。
# 2026-07-17 - 05.01 会员成长、资产与列表作用域验收完成

- 双档案用户 192 的 tenant:23 流水 712 增加 3 分后按租户档案响应；过期扫描后租户积分回到 0，平台积分保持 20。
- 修复积分响应、标签筛选、档案并发创建、会员列表超时和跨租户列表越权。
- 旧超时请求误生成的 9,992 条 tenant:23 档案已按明确时间边界删除，数据库恢复 platform 213、tenant:23 168、tenant:42 4、tenant:1 2。
- PC 显示 168 条租户会员；H5 会员 13990000005 显示等级、积分、成长、余额 6500.00 和订单资产；两端均无横向溢出。
- API 全量测试及 API、PC、H5、微信小程序构建通过。记录：`docs/member-growth-assets-acceptance-20260717.md`。
# 2026-07-17 - 05.03 统一通知中心真实站内信验收

- 修复无活动租户通知失败重试只检查活动租户、误拒绝本租户记录的问题；现优先按通知自身 tenantScopeKey 判断，旧数据才回退活动租户。
- 保留通知 128（site 已发送）、129（退订抑制）和 130（无活动失败通知重试成功）；会员 192 的 site 偏好已恢复订阅。
- PC 通知中心展示渠道状态、偏好和保留记录，无横向溢出；API 全量测试及 API/PC 构建通过。
- 正式短信、微信订阅消息和 SMTP 仍待生产密钥验收。记录：`docs/notification-center-acceptance-20260717.md`。
# 2026-07-17 - 05.04 优惠券、兑换码与推广归因验收完成

- 保留活动券 13/14、积分兑换码 1/2；完成同会员 8 路并发、每人上限、总量耗尽和账本唯一性验收。
- 并发领取与兑换均只有一次成功；第二会员耗尽总量后，第三会员分别收到“优惠券已领完”和“兑换码已兑完”。
- 修复公共端会员刷新把积分过期条件错误用于成长值，以及报名次数/消费额未按租户过滤的问题；用户 192 最终积分 8、成长 3、报名 1。
- 修正 H5 券领取反馈为“已领取并应用”；PC 优惠码后台与 H5 报名/会员资产页面均无横向溢出。
- API 全量测试及 API、PC、H5、微信小程序构建通过。记录：`docs/coupon-redemption-acceptance-20260717.md`。
# 2026-07-17 - 05.05 首页装修、公告弹窗与广告验收完成

- tenant:23 建立正式首页发布快照，保留版本 2/3/4；完成草稿隔离、发布生效、恢复只改草稿和回滚重新发布验证。
- 保留公告 44-47，游客、登录会员、指定等级和失效内容的服务端受众过滤全部正确。
- 保留弹窗 4-6，完成会员/游客受众、once_per_day 关闭频控和失效事件不累计验收。
- 修复弹窗并发曝光丢数，20 路并发由错误累计 2 改为数据库原子累计 20；修正装修页“保存立即生效”的错误说明。
- 广告计划 9 在 10 路并发下只计费 3 次，正好达到 0.30 元预算后自动停用；临时 ads 权益已恢复 false。
- PC/H5 浏览器、API 全量测试及 API/PC/H5/微信小程序构建通过。记录：`docs/homepage-marketing-acceptance-20260717.md`。
# 2026-07-17 - 05.06 客服工作台真实闭环与越权整改

- 新增并保留最小客服账号 `showcase_support / Qiwai123456`，显式权限仅 `support.view`；演示租户后台账号额度按真实账号矩阵从 10 调整为 30，账号加入可重复 seed。
- 新增 `acceptance:support-work-order`，真实验证脱敏检索、敏感查看理由、审计、同租户负责人、平台工单 ID 猜测、紧急 SLA 和 assigned/processing/waiting_user/resolved/closed/reopened 完整状态机。
- 验收发现租户客服可读取平台工单；新增严格客服作用域，租户列表/详情/更新仅允许 `tenant:<id>`，创建关联用户再次校验租户归属，平台工单现返回 404。
- 浏览器发现报名聚合响应泄露完整手机号，已改为服务端脱敏；最小客服页面的会员、报名、订单和订单打开快捷入口同步按权限隐藏。
- SLA 改为数据库按 `createdAt + dueHours` 计算，避免应用 `+08:00` 与 MySQL UTC `datetime` 混用造成 8 小时偏移；优先级调整时同步重算未结束工单截止时间。
- 保留工单 `WO20260717CC7569E5`（ID 5）最终 processing，7 条轨迹完整；PC 搜索用户 192 无 11 位明文手机号、无横向溢出、console warning/error 为 0。
- API 全量 102 个测试文件、602 项通过，API/PC 生产构建和 Docker 健康检查通过。证据：`docs/support-work-order-acceptance-20260717.md`。
# 2026-07-17 - 06.01-06.03 经营分析真实闭环与口径整改

- 新增 `acceptance:analytics-governance`，平台真实重算 `2026-07-15` 至 `2026-07-17`，保留运行 `AR1784254043898BD6A2C`：来源事件 379、指标行 77、差异 0、一致性 true、版本 `activity-metrics-v1`。
- 修复租户新增用户使用平台 users 总表、会员等级未过滤 tenantScopeKey、重复参与按全平台次数判断三处口径问题；租户 `23` 当前新增档案 163，平台新增用户 10,720，等级和偏好范围独立。
- 验证租户账号伪造 `tenantId=42` 不改变自身增长响应，平台/租户 cohort、来源和渠道数据保持明确差异。
- 四业务域明细真实返回活动 33、课程 3、商城 4、公益 10；租户增长 CSV 928 bytes、平台指标 CSV 8,792 bytes。
- 发现分析 CSV 和课程成绩 CSV 被统一响应拦截器包装成 JSON，已改为原生 Response 发送，并新增 2 项控制器合同测试。
- 平台数据中心可见最新运行、趋势、风险、排行及四域入口；租户财务增长页可见漏斗、留存、复购、来源、渠道和地域空态。两页无横向溢出、console warning/error 为 0。
- API 全量 103 个测试文件、604 项及 API 构建通过。证据：`docs/analytics-governance-acceptance-20260717.md`。
# 2026-07-17 - 07.01 课程私有资源真实文件与短链验收

- 新增 `acceptance:course-resource`，真实上传 2 MB 文本附件并绑定付费课程 `5` 的保留章节 `12`、课时 `20`；游客响应锁定且不返回正文/附件，会员 `13990000005` 获得短时签名地址。
- 完整下载 200 且解密内容逐字节一致；0-15 字节 Range 返回 206，越界返回 416，篡改签名和有效签名过期均返回 404。
- Docker 私有卷仅保存 `.enc` 密文和 claimed metadata；访问日志记录用户、课程、课时、资源类型、IP 和终端。
- H5 浏览器发现“打开附件”使用可点击 view 但无按钮语义，已补 `role=button`、tabindex、回车操作和 aria-label；复测可识别为“打开附件 course-resource-acceptance.txt”，无横向溢出和控制台错误。
- 最新私有数据备份 `private-data-20260717-105033.tar.gz` 为 4.04 MB，确认包含 course-resources 密文和 metadata。
- 课程资源/私有令牌专项 6 项、上传 preflight、H5 与微信小程序生产构建通过。证据：`docs/course-private-resource-acceptance-20260717.md`。
# 2026-07-17 - 07.02 课程准入、订单幂等与多端进度真实闭环

- 新增 `acceptance:course-order-idempotency`：新会员 `30960` 的免费课程 8 路并发只生成订单 57，付费课程 8 路并发只保留订单 65；同键跨课程 409、跨租户课程 404，线下确认后 paid 并授予权限。
- 新增 `acceptance:course-access-modes`：会员专享课程 16 在等级不足时 403，升级后生成零金额 paid 订单 75 并保存 member 权益快照，降级后既有权限保留；兑换专享课程 17 普通下单 400，兑换码 `COURSE4257934595` 8 路并发 1 成功/7 受限，杭州租户 404。
- 进度脚本改为自包含登录，两个设备 User-Agent 并发上报后均读取相同最高进度，非法进度 400。
- 验收发现租户用户归属只看活动报名，课程会员无法由 CRM 服务；`assertUserTenantAccess` 现同时认可当前租户会员档案。
- H5 兑换会员 `13727934596` 打开课程 17 显示“继续观看”，无横向溢出和 console warning/error。
- API 全量 103 文件 604 项、API 构建和课程专项通过。证据：`docs/course-access-progress-acceptance-20260717.md`。

# 2026-07-17 - 07.03 课程考核并发、批改与租户隔离验收完成

- 新增 `acceptance:course-assessment` 的可重复平台注册夹具：考核 3、提交 11；平台管理员读取 200，租户运营详情读取 404，租户 CSV 不包含平台提交，杭州租户开始演示租户考核返回 404。
- 修复课程后台复用通用公共对象作用域导致的平台注册课程越权：课程、考核、提交、订单、评价、答疑、公告、退款、资源日志和学习提醒统一按课程 tenantId 严格隔离。
- 8 路并发开始仅生成提交 10，8 路提交均返回 passed 100，其中 7 路幂等恢复；保留人工作业提交 3 的逐题人工分 90、反馈“说明完整”和总评“人工批改通过”。
- PC 运营后台真实展示考核 1/2、提交记录和人工批改详情，无横向溢出，console warning/error 为 0；API 全量 104 文件 607 项及 API/PC 构建通过。证据：`docs/course-assessment-acceptance-20260717.md`。

# 2026-07-17 - 07.04 课程运营、通知、证书与退款真实闭环

- 新增 `acceptance:course-engagement`，保留会员 30982、评价 10、答疑 9、公告 9、证书 28；评价审核回复、答疑回看、公告有效期、5 课时完成、证书幂等签发及公开脱敏验真全部通过。
- 修复统一通知中心强制关联活动导致课程通知全部失败；无活动通知现可发送给本租户会员。课程授权同步建立租户会员档案，并通过 `repair:course-member-profiles` 补齐 20 个历史课程学员，缺失降为 0；最终公告 42/42、提醒 18/18 sent。
- 新增证书模板读取接口并接入 PC 回显；H5 可选志愿模块未开通时不再显示为课程证书错误。PC/H5 证书模板、资产和公开验真无溢出及控制台错误。
- `acceptance:course-refund-access` 改为自包含，保留订单 90、退款 3；双申请一新建一幂等，双审核/确认完成，全额退款后 owned false、有效课程证书 0。
- API 全量 107 文件 611 项，API/PC/H5/微信小程序构建通过。证据：`docs/course-engagement-certificate-acceptance-20260717.md`。

# 2026-07-17 - 08.01 共学加入、任务、补卡与连续天数真实闭环

- 新增 `acceptance:community-learning`，保留开放/审核/邀请活动 16/17/18，学员 30993/30994/30995，任务 18/19 和打卡 9/10。
- 8 路并发加入只保留成员 11，8 路今日打卡只保留记录 10；审核制和邀请码流程通过，昨日补卡审核后 current/longest/total 均为 2，未来日期 400、跨租户 404。
- 修复 PC 共学页把论坛 403 扩散为整页空数据：核心共学接口独立加载，可选论坛分区容错；修复重复任务告警漏掉 activityId 导致不同活动同日任务误报。
- PC 显示 11 个共学活动、16 个任务且错误告警消失；H5 显示两条已完成任务和连续 2 天，两端无溢出及控制台错误。
- API 全量 108 文件 612 项，API/PC/H5/微信小程序构建通过。证据：`docs/community-learning-acceptance-20260717.md`。

# 2026-07-17 - 08.02 社区互动并发、消息隔离与软删除闭环

- 新增 `acceptance:community-interactions`，最新保留作者 122、评论者 31000、活动 145、帖子 46、评论 35 和回复 36；8 路并发点赞、收藏均只生成一条关系。
- 修复社区消息列表跨用户泄露：先按当前 `userId` 查询，再按当前租户可见帖子或演员内容过滤；评论者 H5 只看到自己的一条提及消息。
- 修复并发点赞重复通知，在帖子行锁事务内按接收人、类型、帖子和演员去重；8 路点赞最终只有一条 like 通知。
- 公开详情、列表、收藏和个人内容均排除软删除帖子；跨租户与软删除详情返回空数据。
- PC 打卡任务判重统一为租户、共学活动和日期组合，不再误报不同活动同日任务。
- PC/H5 浏览器无横向溢出及控制台错误；API 全量 110 文件 614 项，API/PC/H5/微信小程序构建通过。证据：`docs/community-interactions-acceptance-20260717.md`。

# 2026-07-17 - 08.03 论坛楼层、锁帖、版主和引用快照闭环

- 新增 `acceptance:forum-governance`，保留杭州会员 31004、版块 36、主题 36、一级回复 55-62、楼中楼 63 和版主关系 2。
- 8 路并发一级回复生成连续且唯一的 1-8 楼；楼中楼保存原回复 ID、楼层、作者和内容快照。
- 主题置顶、精华和锁帖成功，锁帖后 8 路并发回复全部 400；跨租户版主分配 404，未开通论坛租户不暴露入口。
- 杭州论坛权益仅在验收窗口临时开启，结束后删除临时 entitlements 并确认恢复原配置。
- H5 显示锁帖原因、完整楼层和引用；PC 显示版块、版主、帖子和回复治理状态，两端无溢出及控制台错误。
- API 全量 110 文件 614 项及 API/PC/H5/微信小程序构建通过。证据：`docs/forum-governance-acceptance-20260717.md`。

# 2026-07-17 - 08.04 内容治理、处罚申诉和通知闭环

- 新增 `acceptance:content-governance`，最新保留会员 31013、评论 53/54、处罚 18/19/20、申诉 17 和举报 5。
- 真实验证关键词替换/精确拒绝、跨租户规则操作 404、处罚阻止、到期归档、8 路申诉幂等、跨租户申诉 404、申诉自动解禁和重复举报拦截。
- 修复处罚截止后状态仍显示 active；发布校验、用户列表和后台列表现在先把已结束处罚归档为 expired。
- 修复治理用户缺少租户会员档案导致所有处罚/申诉/举报通知被静默丢弃；现幂等建立 tenant:23 档案，最新 7 条通知 sent 或按频控 suppressed，无 failed。
- 修复内容申诉、举报、处罚和统一通知创建时间的 UTC/+08:00 混用；H5 最新申诉显示上海时间 13:42。
- 修复 PC 申诉工作台只显示 pending，现可回看待处理、已通过和已驳回历史。
- PC/H5 无横向溢出及控制台错误；API 全量 114 文件 622 项和 shared/API/PC/H5/微信小程序构建通过。证据：`docs/content-governance-acceptance-20260717.md`。

# 2026-07-17 - 08.05 上传安全、私有大文件与备份恢复闭环

- 修复商城支付证书/私钥上传漏过统一恶意扫描；真实 EICAR `.pem` 上传返回 415，未写入凭证存储。
- ClamAV 协议测试验证 INSTREAM、64 KiB 分块、OK、FOUND 和 required 服务不可用拒绝。
- 16 MB 私有课程附件保留为课程 5、章节 13、课时 21；完整下载 200、Range 206、越界 416、篡改 404。
- H5 会员 13990000005 可打开最新附件，无横向溢出或控制台错误。
- Docker 私有卷隔离恢复 17/17 文件哈希一致；清理 dry-run 扫描 4 份元数据均已认领且零误删。
- 最新备份 `private-data-20260717-144307.tar.gz` 为 21,162,901 bytes，SHA-256 `6CBEDE34EAA54A8EC5FA4770EE02F5B9A09423CAAA5D01F447EDEF183C1E238B`。
- API 全量 115 文件 626 项、上传 preflight 和 shared/API/PC/H5/微信小程序构建通过。证据：`docs/upload-storage-governance-acceptance-20260717.md`。

## 2026-07-17 15:48 - 09.01 商户入驻治理完成

- 新增 `scripts/merchant-governance-acceptance.mjs` 与 `acceptance:merchant-governance`，真实 MySQL/API 覆盖文件上传、申请去重、跨租户审核、自动建店、合同门禁、费率同步、店员授权和到期扫描。
- 修复租户超级管理员无法进入商户治理、授权 ID 可改写归属、平台账号可跨租户授权、默认授权时间偏移、PC 租户初始化被 `/admin/tenants` 403 中断、H5 申请时间少 8 小时。
- 保留会员 31024（13173749107）、申请 11、店铺 112、合同 3、到期授权 263；验收临时商户配额已恢复为 1。
- 浏览器通过 H5 申请历史和 PC 店铺/入驻审核台；API 115 文件 626 项通过，shared/API/PC/H5/mp-weixin 构建通过。
- 验收报告：`docs/merchant-governance-acceptance-20260717.md`。计划表 09.01 标记完成，继续 09.02。

## 2026-07-17 16:58 - 09.02 商品目录与审核治理完成

- 新增 `scripts/mall-product-catalog-acceptance.mjs` 与 `acceptance:mall-product-catalog`，覆盖类目/品牌、并发 SPU、SKU 唯一、审核轨迹、发布快照和订单历史快照。
- 修复分类空上级误判、详情块 DTO 拒绝、后台审核字段丢失、驳回后重提动作错误、数据库重复键 500、库存异常排序别名错误。
- Docker MySQL/API 统一 `Asia/Shanghai`，MySQL 默认时区改为 `+08:00`；新商品和审核时间浏览器显示正确北京时间。
- 保留商品 102、SKU 129、会员 31031、订单 967；平台审核账号 `acceptance_platform_reviewer` 已增加商城审核权限。
- PC 商品工作台/审核记录和 H5 商品详情真实图片验收通过；API 115 文件 628 项、四端构建通过。
- 验收报告：`docs/mall-product-catalog-acceptance-20260717.md`。计划表 09.02 标记完成，继续 09.03。

## 2026-07-17 17:40 - 09.03 库存治理与防超卖闭环

- 修复 PC 库存调整按钮因商品摘要缺少店铺运营字段而误禁用；修复后台商品接口复用公开库存序列化，现分别返回总库存、锁定库存和可售库存，并补齐店铺运营状态。
- PC 实际完成 SKU 129 人工盘点和一致性扫描；并发前数据库/后台一致显示总库存 31、锁定 1、可售 30，扫描待处理异常为 0。
- `acceptance:mall-inventory-concurrency` 以 32 路请求竞争 30 件可售库存，30 单成功、2 单返回库存不足，无 500；保留订单 968-997，最终总库存 31、锁定 31、可售 0，与 31 笔待确认订单完全一致。
- H5 并发前库存和数量上限均为 30，耗尽后显示“已售罄 / 不可购买”；PC/H5 控制台 warning/error 为 0。
- API 115 文件 629 项，shared/API/PC/H5/微信小程序构建通过，Docker API 健康。
- 验收报告：`docs/mall-inventory-governance-acceptance-20260717.md`。计划表 09.03 标记完成，继续 09.04。

## 2026-07-17 18:02 - 09.04 购物车、地址与确认订单闭环

- migration 1783570000000 已在真实 MySQL 执行；新增 `acceptance:mall-cart-address`，8 路并发加购仅保留购物车 85 一条记录且数量精确为 8。
- 两个验收地址并发设为默认后，仅地址 421 为默认；H5 确认订单自动选中该地址，地址页 419/420/421 状态一致。
- 修复同用户同商品并发记录足迹触发唯一键 409，现通过商品行悲观锁幂等累加；保留收藏 44、足迹 48。
- `acceptance:mall-checkout-quote` 升级为自登录，篡改报价稳定返回 400，有效报价保留订单 1000/1001。
- H5 购物车、确认订单和地址页金额、可购量、优惠、积分、支付状态完整，控制台 warning/error 为 0。
- API 115 文件 629 项，shared/API/PC/H5/微信小程序构建通过。验收报告：`docs/mall-cart-checkout-acceptance-20260717.md`。计划表 09.04 标记完成，继续 09.05。

## 2026-07-17 18:25 - 09.05 跨店拆单与统一支付闭环

- 线下、余额、微信沙箱三种跨店结算均按 19.80 元拆成商户 99/100 各 9.90 元，保留结算组 164-167 和子订单 1002-1009；幂等重放不重复建单。
- 余额结算组 165 只生成钱包流水 432 一次，余额 2042.00→2022.20，两个子订单同步 paid。
- 微信沙箱首次/重复回调和聚合查单通过；验收窗口结束后平台沙箱配置恢复为关闭。
- 修复支付任务摘要漏读租户 paymentMethods 导致的假禁用，复测结算组 167 两个任务均 `paymentReady=true`。
- H5 按履约店铺展示微信已支付和线下待确认子订单，控制台 warning/error 为 0。
- API 115 文件 629 项，shared/API/PC/H5/微信小程序构建通过。验收报告：`docs/mall-multi-merchant-checkout-acceptance-20260717.md`。计划表 09.05 标记完成，继续 09.06。

## 2026-07-17 19:01 - 09.06 订单履约、物流与超时任务闭环

- 保留订单 1012、包裹 17/18：两包各 1 件，业务键重放、改单号审计、沙箱轨迹去重、逐包签收和整单完成通过；H5 与 PC 均显示 2/2、两包明细、最新轨迹和 8 条事件账本。
- 修复物流同步查询加载过多 eager relation 触发 MySQL 61 表 join 上限；订单详情、轨迹同步查询已关闭无关 eager relations，重复同步返回已有事件而不重复入库。
- 新增 `acceptance:mall-fulfillment-timeout`，保留超时关闭订单 1017 和自动完成订单 1018；两路并发关闭/自动完成均只有一路实际推进，库存释放流水、worker 关闭事件和自动完成事件均唯一。
- provider 模式未配置正式 URL 时返回明确 400，不再返回 500；验收后保持 `MALL_LOGISTICS_TRACKING_MODE=provider`、`MALL_LOGISTICS_SANDBOX_AUTO_DELIVER=false`。
- PC 详情弹窗和页面无横向溢出，PC/H5 控制台 warning/error 为 0；API 115 文件 629 项，shared/API/PC/H5/微信小程序构建通过。
- 验收报告：`docs/mall-fulfillment-logistics-acceptance-20260717.md`。计划表 09.06 标记完成，继续 09.07 售后治理真实验收。

## 2026-07-17 19:24 - 09.07 商城售后治理闭环

- `acceptance:mall-after-sale` 升级为自登录、自建三张已完成订单的真实专项脚本；保留订单 1034-1036、售后单 63-65。
- 并发同业务键申请仅生成一张售后单；仅退款、平台介入退货退款、换货寄回/发货/签收全部通过，跨租户读取返回 404。
- 修复确认收到退货触发 MySQL 61 表 join 上限、换货发货 tenantId 为空、换货签收时间线 tenantId 为空三项真实 500 缺陷。
- 后台售后 DTO 改为显式白名单，手机号脱敏，移除 passwordHash、OpenID、UnionID、订单及售后内部业务快照；专项增加敏感字段断言。
- PC 售后工作台显示三类售后和退款日志；H5 订单 1036 显示原包裹、换货包裹、退货地址、寄回/换货物流和完整时间线，两端无溢出或控制台错误。
- API 115 文件 629 项，shared/API/PC/H5/微信小程序构建通过。验收报告：`docs/mall-after-sale-governance-acceptance-20260717.md`。计划表 09.07 标记完成，继续 09.08。

## 2026-07-17 19:52 - 09.08 评价与营销风控闭环

- `acceptance:mall-review-marketing` 已通过；保留评价 29、举报 5、优惠券 18、领券 60、秒杀 10 和订单 1039。
- 8 路并发领券只生成一条关系；同业务键两路秒杀下单均返回订单 1039；8 路突发下单 4 路成功、4 路稳定返回 429，最近五分钟记录 26 条风险事件。
- 修复追评、举报和举报处理三处 eager relation 导致的 MySQL 61 表 join 上限；并发订单唯一键冲突改为按租户、用户和业务键回读原单。
- PC 显示 5 张可用券、当前秒杀、促销风控记录和风险告警；H5 会员 13990024134 可打开订单 1039 并核对秒杀快照，两端无溢出或控制台错误。
- API 115 文件 629 项，shared/API/PC/H5/微信小程序构建及 `git diff --check` 通过。验收报告：`docs/mall-review-marketing-governance-acceptance-20260717.md`。计划表 09.08 标记完成，继续 09.09 佣金治理。

## 2026-07-17 20:08 - 09.09 佣金与多级代理治理闭环

- `acceptance:mall-commission-governance` 升级为自登录、自建直属/L1/L2 代理、推广码、规则、订单和退款的完整脚本；保留代理 21-23、推广码 7、规则 4、订单 1047、退款 67、佣金 28-30 和调整流水 2-6。
- 三层佣金按 5%/2%/1% 生成并冻结规则、商品行和受益层级；并发结算与并发扣回均幂等返回同一记录。
- 修复佣金结算、批量结算、风险复核和扣回 eager relation 触发 MySQL 61 表 join 上限；修复退款重算佣金缺失租户关系导致调整流水 `tenantId` 为空。
- PC 显示规则 v1、L0/L1/L2 佣金及结算/退款减佣/扣回流水；H5 订单 1047 显示推广码和退款 67，两端无溢出或控制台错误。
- API 115 文件 629 项，shared/API/PC/H5/微信小程序构建及 `git diff --check` 通过。验收报告：`docs/mall-commission-governance-acceptance-20260717.md`。计划表 09.09 标记完成，继续 09.10 商户结算。

## 2026-07-17 20:24 - 09.10 商户结算逐笔账本闭环

- `acceptance:mall-settlement-ledger` 升级为自登录、自动选择真实资金店铺和生成/调整/复核/付款四阶段并发重放脚本；保留结算单 27、明细 34/35、事件 7-10。
- 同店同业务键并发生成、调整、复核和付款均返回同一对象，各状态事件唯一；缺少付款凭证稳定返回 400。
- 修复并发生成时唯一键 409 和等待店铺锁后误报无可结算数据；生成事务改为先锁店铺，再用当前读检查业务键，并保留唯一键回读恢复。
- 修复结算详情、逐笔明细、事件和一致性校验 eager relation 触发 MySQL 61 表 join 上限。
- PC 显示退款 -9.90、调整 +1.23、应扣回 8.67、付款凭证和 generated/adjusted/approved/paid 时间线，无溢出或控制台错误。
- API 115 文件 629 项，shared/API/PC/H5/微信小程序构建及 `git diff --check` 通过。验收报告：`docs/mall-settlement-ledger-governance-acceptance-20260717.md`。计划表 09.10 标记完成，继续 10.01 公益资金与项目治理。

## 2026-07-17 20:33 - 10.01 公益资金与项目公开披露闭环

- 公益专项改为复核、付款和取消的真实并发重放；`acceptance:premium-roles` 完整通过并恢复临时套餐与权限。
- 保留项目 12、付款拨款 19、取消拨款 20 和哈希流水 137；申请、复核、付款分别由 showcase_admin/showcase_ops/showcase_finance 完成。
- 自审、自付、超预算、缺付款依据被拦截；并发动作没有重复冻结、扣款或事件，取消后冻结为 0。
- 1 个公益账户 109 条流水哈希链全部一致；哈希单测验证篡改金额后校验失败，真实流水修改测试已事务回滚。
- PC 显示账本正常、项目 50% 和拨款状态；H5 仅公开付款拨款并脱敏付款号，取消拨款不泄露，两端无溢出或控制台错误。
- API 115 文件 629 项，shared/API/PC/H5/微信小程序构建及 `git diff --check` 通过。验收报告：`docs/charity-fund-governance-acceptance-20260717.md`。计划表 10.01 标记完成，继续 10.02 援助申请治理。

## 2026-07-17 20:42 - 10.02 援助申请与敏感材料闭环

- 援助专项增加并发提交、补件和审批重放；保留申请 11、材料 11、会员 13994664467 及四个分权管理员。
- 数据库核对敏感 JSON、补件、审核意见和原文件名均为 `enc:v1` 密文，姓名/身份证/补件明文命中为 0，手机号仅保留 HMAC 盲索引和脱敏值。
- 只读账号不能 reveal，跟进人不能终审，敏感账号解密后写审计；伪造 PDF MIME 返回 400。
- Docker 私有卷备份恢复通过，材料原卷与恢复副本 SHA-256 同为 `4c6780eb2203b2325177f2569c89f8c1c5d89a0167aa25dbb303aa3eba6600c7`。
- PC 脱敏列表和 H5 我的申请均通过，临时套餐权益已恢复，两端无溢出或控制台错误。
- API 115 文件 629 项，shared/API/PC/H5/微信小程序构建及 `git diff --check` 通过。验收报告：`docs/aid-application-governance-acceptance-20260717.md`。计划表 10.02 标记完成，继续 10.03 大使与伙伴 CRM。

## 2026-07-17 21:05 - 10.03 大使 CRM 与伙伴转化闭环

- `acceptance:premium-roles` 完整通过；保留大使申请 28、档案 14、任务 3、贡献 17、伙伴申请 29、合同 13、停用租户 50 和停用店铺 117。
- quota=1 的大使任务两路不同业务键并发登记仅一路成功；修复 Repeatable Read 早期快照导致普通 count 看不到首事务提交并超额的问题，任务锁后改用悲观当前读统计。
- 贡献复核/撤销、合同激活/终止和伙伴转换均执行真实并发重放；登记人与复核人职责分离，撤销后积分为 0、等级回到 starter。
- 修复后台伙伴列表 QueryBuilder 未加载转换租户/店铺关系导致“转换结果”显示 `-`；接口仅返回负责人、租户和店铺摘要，避免暴露内部配置。
- PC 显示已转商家 12 及最新转换主体，H5 大使页和城市伙伴页完整可用，两端控制台 warning/error 为 0；临时增值权益已恢复原配置。
- API 115 文件 629 项，shared/API/PC/H5/微信小程序构建、API Docker 重建健康及 `git diff --check` 通过。验收报告：`docs/ecosystem-partner-crm-governance-acceptance-20260717.md`。计划表 10.03 标记完成，继续 10.04 志愿者治理。

## 2026-07-17 21:15 - 10.04 志愿者治理闭环

- 志愿专项升级为录取、签到、签退、志愿者工时确认和运营工时确认的真实双请求并发重放，并增加培训资格有效期检查。
- 并发验收发现并修复两项 Repeatable Read 竞态：签到/签退第二请求读不到首请求记录，以及运营工时确认第二请求在状态推进后误报 400；锁定业务对象后增加业务键当前读回放。
- 保留任务 50、报名 48、档案 81、服务记录 42、工时调整 11、培训 1、勋章 33 和服务证明 11；证明撤销后公开验真无效。
- 修复旧大使/伙伴线索生成的志愿档案显示 `[encrypted]` 占位符，新档案改为读取线索密文并重新加密保存。
- PC 显示档案 81、累计服务 106.5 小时和完整操作工作台；H5 显示档案、开放任务、已完成报名和 confirmed 工时记录，两端控制台 warning/error 为 0。
- 临时 city_partner 权益已恢复 standard；API 115 文件 629 项，shared/API/PC/H5/微信小程序构建及 `git diff --check` 通过。验收报告：`docs/volunteer-governance-acceptance-20260717.md`。计划表 10.04 标记完成，继续下一未完成项。

## 2026-07-17 21:31 - 10.05 志愿凭证与公开验真闭环

- 志愿专项将档案 93 推进到 80.8 小时，四档阈值勋章 `service_first/service_8h/service_30h/service_80h` 各生成一次，保留授予记录 45-48。
- 后台受控签发证书 41 `MPCB20260717497217`；保留有效证明 12 和撤销证明 13，三种真实编号公开验真均通过。
- 浏览器确认有效证书展示脱敏持有人和 80.8 小时，有效证明展示任务快照，撤销证明显示无效并隐藏持有人。
- 发现并修复撤销证明仍返回标题和时长、违反页面“隐藏业务详情”承诺的问题；撤销结果现仅保留编号、状态和时间，新增公开内容边界门禁。
- 无效编号显示明确错误、请求编号和重新查询入口；PC/H5 控制台 warning/error 为 0。
- API 115 文件 630 项，shared/API/PC/H5/微信小程序构建及 `git diff --check` 通过。验收报告：`docs/volunteer-credentials-verification-acceptance-20260717.md`。计划表 10.05 标记完成，继续阶段 11-13 未完成项。

## 2026-07-17 21:39 - 11.01 PC 后台状态审计：现场核销工作台

- 全量扫描后台视图的加载、持久错误、写操作锁和导入导出状态，优先整改高频现场核销页。
- 现场概览和核销点同步失败改为页面持久错误与明确重试；5 秒静默刷新失败不再持续弹出 toast，旧现场数据继续保留。
- 新增核销点从第一个确认框打开前开始互斥，核销提交增加重复进入保护，扫码/填码在提交期间禁用。
- 撤销核销从确认框打开前锁定整组撤销操作，取消、失败和成功均释放；其他行在处理期间禁用，避免重复弹窗和双提交。
- PC 类型检查和生产构建通过；11.01 保持开发中，继续其余后台页面与租户角色浏览器矩阵。

## 2026-07-17 21:45 - 11.01 PC 后台状态审计：商城商品审核

- 商品审核的商家、可访问店铺和待审核列表增加持久错误区及统一重试，接口失败不再伪装成“暂无待审核商品”，同范围旧数据继续保留。
- 通过/驳回从确认框打开前锁定全部审核操作；当前行显示 loading，其余行及商品跳转禁用，取消、失败和成功均释放。
- 平台管理员浏览器真实加载待审核商品 10 条；打开首条“通过商品审核”确认框后全部行操作禁用，取消后恢复且未修改商品状态。
- 页面控制台 warning/error 为 0，PC 类型检查、生产构建和差异检查通过；11.01 继续推进库存异常及剩余后台页面。

## 2026-07-17 21:52 - 11.01 PC 后台状态审计：商城库存与异常

- 商品库存、低库存、库存流水、库存异常和店铺授权范围分别增加持久错误区与独立重试，单个分区故障不再把旧数据覆盖成空列表。
- 一致性扫描、异常修复/忽略和人工库存调整统一互斥；异常确认框打开前锁定，扫描或异常处理期间禁止打开库存调整。
- 人工调整提交增加重复进入保护，提交期间不能关闭弹窗；低库存和 SKU 调整入口在任一库存写操作执行时禁用。
- 平台管理员浏览器真实加载 87 个规格、总库存 32009、锁定 45、可售 31964、1 条低库存和 200 条流水；打开唯一低库存调整弹窗后核对总库存 31/锁定 31，取消后弹窗关闭且未改库存。
- 页面控制台 warning/error 为 0，PC 类型检查、生产构建和差异检查通过；11.01 继续其余后台页面和角色权限矩阵。

## 2026-07-17 22:08 - 11.01 PC 后台状态审计：商城评价与举报

- 商家、授权店铺和评价列表增加持久错误区及统一重试，接口失败不再静默伪装成空评价；评价和举报处理从确认框打开前开始全局互斥，取消、失败和成功均释放。
- 评价用户与举报人统一采用前端脱敏兜底，避免后端历史数据或接口退化时直接展示完整手机号；评价列表同时补齐追评内容、追评状态和举报数量。
- 平台管理员浏览器真实加载 5 条评价举报，举报人均显示为 `139****4006`；当前待审核评价为 0，保留 1 条待处理举报 `09.08 重复举报 1784288069195-c5fea1`。
- 打开该举报的“处理并隐藏”确认框后，页面 10 个举报处理入口全部禁用；取消后目标按钮恢复，记录仍为待处理，未改变评价或举报数据。
- 页面控制台 warning/error 为 0，PC 类型检查、生产构建和差异检查通过；商城财务总览经静态审计已有分区错误、重试和导出互斥，11.01 继续商城结算等资金写操作页面。

## 2026-07-17 22:17 - 11.01 PC 后台状态审计：商城结算资金操作

- 商城结算店铺授权加载失败补充页面级持久错误和完整范围重试，不再只显示瞬时提示；失败时清空不可确认的店铺授权范围，避免沿用旧范围处理资金。
- 审核、拒绝、打款或扣回确认框打开期间，统一禁用租户、店铺、结算状态、日期、刷新、导出和全部资金写入口，防止确认期间切换范围导致提交后刷新到其它账套。
- 平台管理员浏览器真实加载 26 张结算单，其中草稿 2 张、待生成店铺 3 个；选取草稿结算单 `MS202607172017220169`（应扣回 29.70 元）打开审核提示。
- 确认框出现后全部生成、审核、拒绝、打款/扣回入口均不可用，范围筛选与导出同步锁定；取消后审核按钮恢复，单据仍为草稿，未产生结算事件或资金变化。
- 页面控制台 warning/error 为 0，PC 类型检查、生产构建和差异检查通过；11.01 保持开发中，继续剩余后台写操作页和租户角色矩阵。

## 2026-07-17 22:31 - 11.01 PC 后台状态审计：商城售后与退款

- 商家列表、授权店铺和售后数据加载补齐页面级持久错误与完整重试，接口失败不再只显示瞬时消息；授权范围失败时清空不可确认的店铺列表。
- 仅退款、退货退款、确认收货、换货发货、售后协商、退款重试和拒绝统一纳入确认框前置全局锁，写操作期间同步禁用租户、店铺、状态、关键词、支付方式、日志状态、结算组、日期、刷新、导出和跳转入口。
- 售后用户手机号增加前端脱敏兜底，并保留后端已经脱敏的号码格式，避免历史接口或数据退化时暴露完整手机号。
- 平台管理员浏览器真实加载 73 条售后、24 条待处理、1 条退款异常和已通过金额 1562.95 元；选取待处理单 `MR1784289658373A3BC62` 打开“通过商城售后”提示。
- 确认框出现后页面 438 个售后动作入口全部禁用，范围筛选和导出同步锁定；取消后目标按钮恢复，售后单仍为待处理，未触发退款、库存回补或结算变化。
- 页面控制台 warning/error 为 0，PC 类型检查、生产构建和差异检查通过；11.01 继续报名、订单等剩余高频写操作页和租户角色矩阵。

## 2026-07-17 22:43 - 11.01 PC 后台状态审计：活动订单资金与批量任务

- 线下收款、退款申请、内部备注、关闭过期订单和导出统一纳入页面写操作互斥；确认或提交期间禁用商家、代理、状态、关键词、筛选、分页、时间线和全部行级操作。
- 退款与备注弹窗提交期间禁止遮罩、Escape 和关闭按钮退出，避免请求已发出但操作员误认为取消；提交入口增加重复进入保护。
- 商家和代理筛选项加载失败增加页面级持久错误与统一重试，不再只显示瞬时消息。
- 平台管理员浏览器真实加载慢π演示中心 324 条活动订单；打开“关闭过期订单”确认框后，当前页 80 个备注、时间线、收款和退款入口全部禁用，筛选、分页、导出同步锁定。
- 取消批量关闭后按钮恢复，订单总数仍为 324，未关闭订单、取消报名或释放名额；页面控制台 warning/error 为 0。
- PC 类型检查、生产构建和差异检查通过；11.01 保持开发中，继续报名审核与批量通知等高频运营页面。

## 2026-07-17 22:57 - 11.01 PC 后台状态审计：报名审核、通知与隐私

- 单条通过、拒绝、取消、手动核销以及批量通过、批量拒绝、批量通知、会员标签统一使用确认框前置 `actionKey`；取消、关闭、失败和成功均释放全页锁。
- 写操作期间禁用商家、活动、状态、关键词、筛选、勾选、批量操作、打印、导出、分页和全部行级动作，避免确认期间更换名单或作用范围。
- 单条拒绝和取消补齐取消异常处理与页面错误提示；商家及活动筛选加载失败改为页面级持久错误和统一重试。
- 修复用户列已脱敏但动态报名答案仍展示完整手机号的问题；手机号、电话、mobile 和 phone 类型答案统一脱敏，打印名单复用同一安全文本。
- 平台管理员浏览器真实加载慢π演示中心 10328 条报名；首屏完整手机号答案由多条降为 0，检测到 8 条手机号答案均显示 `139****xxxx`。
- 选取报名 20531 打开取消确认后，当前页 80 个核销、通过、拒绝和取消入口全部禁用，筛选、导出、打印、选择和分页同步锁定；返回后仍为报名成功，数据未变化，控制台 warning/error 为 0。
- PC 类型检查、生产构建和差异检查通过；11.01 继续剩余后台页面与租户角色权限矩阵。

## 2026-07-17 23:33 - 11.01 PC 后台角色矩阵与活动订单权限整改

- 应用内浏览器完成 `showcase_ops`、`showcase_finance`、`showcase_checkin`、`showcase_store_owner`、`showcase_store_finance` 五类保留账号验收，测试数据未修改。
- 运营账号报名页可执行核销和取消，活动订单可备注、查看时间线和关闭过期订单，财务路由拒绝；核销员报名页无批量、打印、导出和取消入口，仅保留核销，订单及财务路由均拒绝。
- 财务账号活动订单显示导出、备注和退款入口，活动页只读且无创建、编辑、发布操作；店铺负责人可进入商品和商城订单，活动及平台财务拒绝；店铺财务可进入商城订单和结算，商品路由拒绝。
- 浏览器发现运营订单页无 `order.export` 仍显示导出按钮，并因无代理权限请求 `/admin/agents` 产生持久 403。`Orders.vue` 已按 `order.manage`、`order.refund`、`order.export` 和 `agent_settlement.view` 拆分工具栏、行级操作、函数入口、查询参数与代理筛选加载。
- 修复后运营订单页无权限告警、代理筛选 0、导出 0、退款 0；保留关闭过期订单 1、备注 20、时间线 20。财务账号仍保留代理筛选、导出和退款能力。
- PC 生产构建及 `git diff --check` 通过；11.01 继续审计剩余后台页面，尚未标记完成。

## 2026-07-17 23:46 - 11.01 会员 CRM 只读权限与隐私整改

- 财务账号仅有 `member.view`，浏览器却仍显示扫描到期权益、新增会员、新建等级和批量打标签；同时 GET `/admin/member-levels` 被映射为 `member_level.manage`，导致会员、等级并行加载整体失败并显示 0 条假空态。
- 后端将会员等级 GET 调整为 `member.view`，POST/PATCH 继续要求 `member_level.manage`，新增权限映射契约测试覆盖读写分离。
- PC 会员页按 `member.manage`、`member.password`、`member_level.manage`、`tag.manage`、`finance.wallet_adjust` 分别控制生命周期、资料、密码、等级、标签和钱包入口，模板隐藏和函数入口双重保护。
- 会员加载增加持久错误与重试；列表手机号统一前端脱敏，避免历史接口或数据退化暴露完整号码。
- 仅重建 API 容器，MySQL、缓存和数据卷未变；健康检查 ready=true、database=up、blockingCount=0。
- 财务账号浏览器真实加载 208 位会员、208 位已绑手机号、166 位近 7 日活跃会员及完整会员等级；首屏 20 个号码全部脱敏，完整手机号 0。
- 打开真实会员详情后，编辑资料、重置密码、调整积分及钱包写入口均为 0；页面无权限告警和控制台 warning/error。
- `admin-permissions.spec.ts` 15 项、PC 生产构建、API Docker 构建和差异检查通过；11.01 继续其余后台页面。

## 2026-07-17 23:58 - 11.01 商城订单只读角色与收货隐私整改

- 使用保留账号 `showcase_mall_readonly` 和授权店铺 `[PERF] Mall merchant B #100` 验收；接口真实返回 95 条订单，近 30 天 3 单、实收/净收 29.70 元。
- 只读账号原页面仍为每行渲染确认收款、发货和关闭按钮，并展示商品管理、收款配置、售后处理、营销工具等无权模块快捷入口；函数虽会拒绝提交，但 UI 权限边界不完整。
- 商城订单页现按 `mall.order.manage`、`mall.product.manage`、`mall.payment.manage`、`mall.refund.manage` 和 `mall.statistics.view` 控制行级动作及店铺快捷入口，保留函数入口二次校验。
- 发现订单列表收货人、详情买家、售后退货地址、拼团记录、券使用等多处展示完整手机号；现统一复用 `maskedPhone`，订单列表、详情和各聚合子表均脱敏。
- 浏览器复测只读账号的收款、发货、关闭、商品、收款配置、售后和营销入口均为 0；保留导出订单、经营统计、H5 店铺和 50 个当前页详情入口。
- 当前页检测完整手机号 0、脱敏号码 100；打开订单 `MO17842856856910BF955` 后买家及收货手机号均为 `139****4006`，详情完整手机号 0，写按钮 0。
- 页面无权限告警和控制台 warning/error；PC 生产构建及差异检查通过，测试数据未修改。11.01 继续统一订单与商城资金页。

## 2026-07-17 23:12 - 11.01 商城支付日志只读数据与订单凭证字段整改

- `showcase_mall_readonly` 打开店铺 #100 支付日志时，支付流水和回调请求返回 200，但退款日志因商户子权限缺少 `refund.view` 返回 403，整组并行加载失败后页面显示 0 条假空态。
- 商城退款日志读取现接受 `finance.view/refund.view/refund.manage` 任一店铺子权限，后台路由仍要求 `mall.finance.view`；只读财务无需获得售后写权限即可核对退款流水。
- API 调试发现 `/admin/mall/orders` 返回的订单用户实体包含 `passwordHash`、微信标识和登录字段；`publicOrderWithItems` 现强制将用户投影为 `id/nickname/phone`，覆盖列表、详情及复用该方法的订单写返回。
- 新增 `mall-admin-privacy-boundary.spec.ts` 两项源码契约，固定用户凭证字段不得回流，并固定商户财务可读取退款日志。
- 仅重建 API 容器，MySQL 和数据卷未变化；健康检查 ready=true。真实接口返回订单总数 95，`passwordHashPresent=false`，用户字段仅 `id,nickname,phone`，退款日志请求 200。
- 浏览器支付日志恢复显示 2 条成功支付流水；回调、退款和佣金为真实空态，无权限告警。导出支付流水、回调、佣金明细、佣金汇总和账单继续可用，所有账单/佣金资金写入口为 0。
- 页面控制台 warning/error 为 0；API 构建、隐私专项 2 项、Docker 构建和差异检查通过，测试数据未修改。

## 2026-07-18 06:37 - 11.01 统一资金一致性修复与历史流水补录

- 财务账号在统一订单中心真实加载统一订单和 695 条资金流水；手机号首屏 20 条全部脱敏，页面分区无权限或加载错误。
- 浏览器执行“一致性检查”后发现 96 项异常；接口复核分类为 `mall_payment_amount=94`、`mall_settlement_amount=2`，不是可忽略测试噪声。
- 94 个商城订单全部为线下收款，订单已有 `transactionNo/paidAt`，但 `mall_payment_transactions` 无成功流水；根因是 `adminConfirmOffline` 只推进订单、库存、积分和佣金，没有写统一支付流水。
- 商城线下确认现于同一数据库事务创建 `provider=offline` 的成功支付流水；并发重放在订单锁后按交易号复用，避免重复入账。
- 2 张结算单均为退款 9.90 元并含调整 `+1.23` 元，实际应扣回 8.67 元；一致性算法原先漏算 `adjustmentAmount`，现按 `订单-直收-退款+直退-服务费+调整` 计算。
- 一致性检查原先对 324 个活动订单和 805 个商城订单逐单查询支付/退款，约产生 2000 多次查询并耗时 14.2 秒；现改为支付与退款各自聚合查询，返回计数直接复用已加载集合。
- 迁移前备份 `backups/mysql/activity_registration-20260718-063124.sql.gz`（1.15 MB）；migration `1783830000000-BackfillMallOfflinePaymentTransactions.ts` 成功执行，新增历史线下支付流水 94 条、合计 335185 分，不修改订单、退款和钱包原记录。
- 整改后连续三次检查分别耗时 251ms、232ms、220ms，均 `healthy=true, issueCount=0`；核对范围为活动订单 324、商城订单 805、钱包流水 416、结算单 26。
- API 构建、统一资金治理 3 项、商城隐私 2 项和权限映射 15 项，共 20 项测试通过；Docker API 重建后 ready=true、database=up。
- 最终应用内浏览器刷新被本地 URL policy 拦截，未绕过安全策略；保留下一浏览器会话点击“检查通过”提示复测项。此前页面真实异常弹窗、修复后接口与数据库结果均已记录，测试数据和补录流水保留。

## 2026-07-18 06:54 - 11.01 PC 后台手机号统一脱敏与源码门禁

- 新增统一前端 `maskPhone` helper，并完成后台账号、社区、课程、漏斗、商城营销、商城商户、商城订单、支付日志、会员、通知、复盘和志愿者等页面的批量收口。
- 本批继续整改数据中心下钻、文化大使申请和任务报名、客服查询台验证码/报名/订单/工单、统一订单以及活动评价/举报；后端已脱敏的数据仍由前端再次兜底，避免历史接口或返回合同退化时直接显示完整手机号。
- 援助申请敏感详情继续由 `aid.sensitive` 权限和审计控制；客服完整手机号继续走填写业务理由、服务端授权和审计记录的 reveal 流程，不纳入普通脱敏展示。
- 新增 `scripts/preflight-admin-privacy-guard.mjs` 并接入完整发布门禁，禁止表格直接绑定 `phone/user.phone/contactPhone/receiverPhone`，也禁止模板在未调用脱敏或受控 reveal helper 时输出个人手机号。
- 门禁首次单独执行发现 `Reviews.vue` 仍有 2 处手工切片脱敏，现统一改为共享 helper；修复后隐私门禁、全部 preflight guards、PC 类型检查/生产构建及 `git diff --check` 通过。

## 2026-07-18 06:55 - 11.01 商城统计只读权限与统一资金浏览器复测

- 商城统计页为商家列表、授权店铺和统计数据分别增加持久错误、独立重试和旧数据保留，接口故障不再只显示瞬时 toast 或覆盖成空看板。
- 店铺快捷入口按商城订单查看、商品营销、支付配置和物流设置权限分别展示，并在路由函数入口二次校验。
- 应用内浏览器使用 `showcase_mall_readonly / Qiwai123456` 打开店铺 #100，真实加载近 30 天 3 单、实收/净收 29.70 元；只保留订单管理、H5 和复制链接，营销、收款配置、物流入口为 0。
- 切换 `showcase_finance / Qiwai123456` 打开统一订单中心，真实加载统一订单 1205 条、资金流水 789 条；点击一致性检查显示“活动订单 324，商城订单 805，钱包流水 416”全部通过，补齐 `11.01.12` 浏览器待验收项。
- 统一订单首屏手机号均为脱敏格式；页面刷新后本次控制台 warning/error 为 0，测试数据和 94 条历史补录流水全部保留。

## 2026-07-18 07:10 - 11.01 客服脱敏用户精确跳转报名与订单

- 客服查询结果已统一返回脱敏手机号，但原“会员/报名/订单”快捷操作仍把脱敏号码作为关键词传递，导致目标页无法精确定位用户。
- 会员跳转改为用户 ID 关键词；报名和订单 API 新增正整数 `userId` 查询参数，查询继续先执行租户与岗位活动范围，再叠加用户条件，不通过手机号回传或恢复明文。
- 报名和订单页面支持从 URL 恢复用户 ID 范围，展示“已按客服用户 ID 精确筛选”提示和清除入口；手工输入新关键词时自动移除用户 ID，避免隐形组合条件。
- 报名及订单导出沿用 `userId` 范围，确保列表与导出口径一致；DTO 增加正数校验，`0/-1` 被拒绝。
- API DTO 专项 19 项、API 构建、PC 类型检查/生产构建、隐私门禁和差异检查通过。首次专项命令因从仓库根目录运行而扫描到历史交付候选，当前源码 19 项实际已通过；随后在 `apps/api` 包内限定路径重跑，结果 1 文件 19 项全绿，未修改历史候选。
- 仅重建 `activity-api`，MySQL 容器和数据卷未变化；容器最终 healthy，`/api/health/ready` 返回 200、`data.ready=true`。
- 平台管理员浏览器从客服搜索用户 `31062` 点击“订单”，URL 正确进入 `/admin/orders?userId=31062`；保留商城用户 `20783` 精确返回 1 条订单，完整手机号 0。
- 保留活动用户 `104` 精确返回 4 条报名，页面完整手机号 0、脱敏号码 7 个；刷新后本次控制台 warning/error 为 0，未修改任何业务数据。

## 2026-07-18 07:25 - 11.01 客服权限分层与只读工单验收

- 审计确认 `support.view` 原先同时放行客服检索、工单创建/改派/状态处理和完整手机号查看，财务或自定义只读客服角色可越过最小权限边界。
- 新增 `support.manage` 和 `support.sensitive`，分别控制工单写操作与受控手机号查看；二者自动包含最低 `support.view`，运营默认具备三项，财务默认仅保留查询权限。
- 后端路由现将客服搜索、工单列表和详情映射到 `support.view`，负责人列表及工单 POST/PATCH 映射到 `support.manage`，手机号 reveal 映射到 `support.sensitive`；可指派负责人也必须具备工单处理权限。
- PC 客服页增加权限感知：只读账号不加载负责人列表，不显示完整手机号查看、建工单、新建工单、负责人下拉及状态处理按钮；工单详情仍可查看处理轨迹。所有写函数和敏感查看函数保留入口二次校验。
- 演示数据脚本保留 `showcase_support` 作为处理账号，并新增 `showcase_support_readonly` 作为只读账号；客服验收脚本同时验证只读 403 边界和处理账号完整状态机。
- 真实 API 验收创建并保留工单 `WO20260717D3152969`，最终状态 `processing`、7 条不可变轨迹；只读账号可搜索用户和查看工单，敏感手机号、负责人列表及工单创建均返回 403。
- 应用内浏览器使用 `showcase_support_readonly` 查询用户 `192`：完整手机号 0、脱敏号码 8 个、建单按钮 0；打开工单详情后按钮 0、负责人下拉 0。切换 `showcase_support` 后恢复敏感查看、建单、负责人下拉和状态动作，查看理由 `11.01.16 浏览器权限分层验收 2026-07-18` 已写审计。
- 权限/菜单专项 3 文件 44 项、API 构建、PC 生产构建（1945 模块）、全部 preflight guards、API Docker 重建和 ready 健康检查通过；权限目录由 75 项增至 77 项，本轮新增控制台 warning/error 为 0，MySQL 容器和数据卷未重建。

## 2026-07-18 07:44 - 11.01 数据中心权限分层与转化率口径修复

- 审计发现 `analytics.view` 同时放行数据查看、经营/指标/增长导出和统计重算，任何只读分析账号均可触发高成本写任务和批量导出；新增 `analytics.export`、`analytics.manage`，并为两者建立最低 `analytics.view` 依赖。
- 后端将所有分析导出映射到 `analytics.export`、手工重算映射到 `analytics.manage`，其余总览、趋势、渠道、会员、经营明细、统计任务和指标下钻继续使用 `analytics.view`。运营默认拥有查看/导出/重算，财务默认拥有查看/导出但不具备重算。
- 增长分析菜单和路由从 `activity.view` 调整为 `analytics.view`；页面将综合增长独立加载，只有具备活动查看权限时才加载活动列表和显示单活动漏斗，避免核销员误入后 403，也允许纯分析角色独立查看增长数据。
- 旧版 `activities/:id/funnel` 接口原受控制器类级角色限制，财务即使有分析权限也会在权限守卫前被拒绝；现补财务角色并将路由权限映射为 `analytics.view`。
- 数据中心业务卡片、经营明细和商城店铺快捷入口按 `activity.view`、`course.manage`、`mall.statistics.view`、`charity.view` 分别展示，函数入口再次校验；纯分析账号仅保留“明细”，不会被带入无权模块。
- 浏览器首次登录纯分析账号时，API 返回 201 但固定跳转 `/dashboard` 后因路由回退列表缺少数据中心再次回到登录页；现增加 `/analytics` 回退候选，`showcase_analytics_readonly` 可直接落地商家数据中心。
- 浏览器真实数据暴露商家“浏览 25、报名 168、报名转化 672%”；根因是数据中心和增长分析仍使用未限幅的私有比例函数。现后台总览、增长来源/渠道和旧版单活动漏斗统一复用 `boundedPercentage`，浏览器复测显示报名转化 `100%`，验收脚本新增所有比例必须处于 0-100% 的硬断言。
- 新增并保留 `showcase_analytics_readonly` 和 `showcase_analytics_exporter`。只读账号可访问数据中心、增长和经营明细，重算、指标导出、增长导出、经营导出均返回 403；浏览器无导出/重算按钮，四个业务卡片均仅显示明细，商城店铺无操作列，增长页仅显示综合增长。导出账号显示指标和经营导出，仅在有 `activity.view` 的活动模块显示查看入口，不具备重算按钮。
- 最新真实重算运行 `AR17843317749633E12C3`：来源事件 379、指标行 77、差异 0；经营明细活动 33、课程 7、商城 4、公益 10，增长 CSV 928 bytes、指标 CSV 8792 bytes。
- 权限/角色/菜单/比例专项 4 文件 50 项、API 构建、PC 生产构建（1945 模块）、完整分析治理脚本、全部 preflight guards、API Docker 重建和 ready 健康检查通过；权限目录由 77 项增至 79 项，本轮浏览器新增 warning/error 为 0，MySQL 容器和数据卷未重建。

## 2026-07-18 08:35 - 11.01 文化大使隐私与权限分层

- 将文化大使后台拆为 `ambassador.view`、`ambassador.manage`、`ambassador.sensitive`、`ambassador.export`；管理、敏感查看和导出权限自动包含最低查看权限，租户账号继续不能获得平台生态权限。
- 后端申请列表、概览最近记录、跟进、档案、任务和贡献统一改为安全投影；手机号、微信号默认脱敏，移除加密列、查询哈希和完整关联实体。新增带理由的联系方式 reveal 接口，记录操作者、字段、原因、请求 ID 和审计时间；明文 Excel 导出独立授权并保留导出审计。
- PC 页面只读账号仅显示申请线索和大使身份贡献，行内写控件为 0；敏感查看账号可填写业务理由查看目标申请完整手机号和微信号，但无写入和导出；管理账号恢复落地页、案例、申请、身份贡献、志愿任务五个标签及写控件。
- 修复委派的平台运营账号登录后被服务层 `assertPlatformAdmin`、前端 `scope=platform`、本地功能开关和外壳标题再次当作租户账号拒绝的问题。路由守卫把本次 required permission 传入业务上下文，仅大使/伙伴生态权限可通过对应平台范围断言；其他超级管理员接口不放宽。
- 平台委派账号外壳改为“平台运营后台”，平台功能菜单不再受历史商家功能开关隐藏；无运营设置权限时改读公开品牌配置，浏览器刷新不再产生 `/admin/settings/operation` 403。
- 新增保留账号 `showcase_ambassador_readonly`、`showcase_ambassador_sensitive`、`showcase_ambassador_manager`，密码均为 `Qiwai123456`。专项脚本 `npm run acceptance:ambassador-privacy` 验证列表脱敏、存储字段不外泄、只读越权 403、敏感账号仅 reveal、管理更新和 Excel 导出、两类查看审计落库，全部通过。
- 应用内浏览器确认只读账号自动落地 `/admin/ambassador`，仅两个只读标签、完整手机号 0、当前行编辑控件 0；敏感账号显示 41 个“查看联系方式”入口，填写理由后仅首行恢复完整联系方式且按钮数降为 40；管理账号显示五标签、申请表 571 个编辑控件、41 个跟进按钮和导出入口，浏览器导出请求返回 200。
- API 全量 117 文件 649 项、PC 生产构建（1945 模块）、82 项权限目录、全部 preflight guards、完整 `npm run preflight`、API Docker healthy 和 `git diff --check` 通过。预检仅保留既有生产短信凭证配置提示；MySQL 容器和数据卷未重建，验收审计与测试数据全部保留。

## 2026-07-18 09:08 - 11.01 合作伙伴 CRM 隐私与权限分层

- 审计确认伙伴合同和转换原来只有 `partner.manage`，只读、合同敏感信息、导出和写操作无法独立授权；伙伴页面又依赖 `ambassador.view` 才能进入并获取线索。
- 新增 `partner.view`、`partner.sensitive`、`partner.export`，保留 `partner.manage`；管理、敏感和导出权限自动包含最低查看权限，权限目录由 82 项增至 85 项。
- 新增伙伴专属线索列表、状态更新、跟进列表/创建和联系方式 reveal 接口；伙伴账号不再需要文化大使权限。伙伴列表固定只返回 `kind=partner`，手机号和微信号默认脱敏，存储加密列与查询哈希不返回。
- 合同列表仅返回安全摘要和敏感字段存在标记，默认不解密条款、归档号和复核说明；新增带业务理由的合同 reveal，联系方式与合同敏感查看分别记录 `partner.application.sensitive_reveal`、`partner.contract.sensitive_reveal`。
- 新增 `/admin/partner/export` 双工作表 Excel，分别导出伙伴线索和合同版本；明文联系方式、跟进备注、合同条款、归档号和复核说明仅对 `partner.export` 开放，并记录统一导出审计。
- 合同 GET 原先会把到期合同直接写成 `expired`，只读账号可间接触发数据库写入；现改为响应时计算到期状态，终止操作也拒绝已到期合同。
- PC `/admin/ambassador` 路由和菜单允许 `ambassador.view` 或 `partner.view` 独立进入。伙伴只读账号仅显示伙伴看板、脱敏线索、合同摘要和跟进记录；敏感账号显示逐条联系方式/合同查看；管理账号可推进等级、负责人、日期、状态、跟进、合同和商家转换，导出权限单独控制。
- 新增保留账号 `showcase_partner_readonly`、`showcase_partner_sensitive`、`showcase_partner_manager`，密码均为 `Qiwai123456`。保留伙伴申请 #41（`伙伴验收1784294495527-dc37a5`）、合同 #19（`PCT2026071770E6BFDB48`）以及 `showcase_partner_manager` 新增的浏览器跟进记录。
- 专项脚本 `npm run acceptance:partner-privacy` 在最终 API Docker 镜像上通过：只读账号可读且 reveal/PATCH/导出均 403；敏感账号可带理由查看联系方式和合同但写入/导出 403；管理账号可更新、查看和导出，Excel 大于 1KB，两类敏感审计均包含管理和敏感账号。
- 应用内浏览器真实加载 19 条伙伴线索和 19 份合同。只读账号完整手机号 0、编辑控件 0、敏感/导出/写按钮 0；跟进弹窗输入和保存按钮均为 0。敏感账号有 19 个联系方式和 19 个合同查看入口，填写理由后各降为 18，目标行显示完整手机号以及归档号、条款和复核说明，写控件与导出仍为 0。管理账号有 76 个表格编辑控件、19 个新合同入口、1 个待转换入口、19 个联系方式/合同查看入口和 1 个导出入口；浏览器导出 API 返回 200，新增跟进 API 返回 201。
- 演示 seed 后续整改已完成：演示商家固定使用可用套餐并恢复到 `2027-12-31`，广告计划改由平台令牌配置；推广码直接查询与佣金计数关闭递归 eager 联查，钱包充值增加稳定幂等键。完整 seed 已成功生成活动、课程、社区、商城营销和演示用户余额，原套餐兼容待整改项关闭。
- 最终回归为 API 全量 118 文件 652 项、PC 生产构建（1945 模块）、API 构建、伙伴隐私专项、全部 preflight guards、完整 `npm run preflight`、API Docker healthy 和 `git diff --check` 通过。预检仅保留既有生产短信凭证配置提示；MySQL 容器和数据卷未重建。

## 2026-07-18 09:25 - 完整演示 seed 查询边界与幂等整改

- 完整 seed 在商城推广码更新时触发 MySQL `Too many tables; MySQL can only use 61 tables in a join`。四处 `promotionCodes.findOne` 均显式关闭 eager，仅加载租户、店铺、推广用户和代理等必要关系；推广码已有佣金判断改用 QueryBuilder 按 `promotionCodeId` 直接计数，不再展开 `MallCommission` 的递归 eager 关系。
- 新增 `mall-promotion-code-query-boundary.spec.ts` 两项源码边界测试，固定推广码直接查询和佣金计数均不得恢复递归 eager；专项、API 编译及最终 Docker 镜像通过。
- seed 越过商城阶段后继续发现钱包调整 DTO 已要求 8-128 位幂等键，旧 seed 未传该字段；现使用 `showcase-wallet:online-showcase:<tenantId>:<userKey>` 稳定业务键，重复执行不会重复充值。
- `npm run seed:online-showcase` 已完整成功，保留 6 个活动、4 项课程内容、共修/社区数据、4 个商城商品、优惠券、推广码、秒杀、拼团、物流配置以及 `13990000001-13990000005` 演示用户和余额。
- API 全量 118 文件 652 项、`acceptance:partner-privacy`、PC 生产构建（1945 模块）、全部 preflight guards、完整 `npm run preflight` 均通过；权限目录 85 项。预检仅提示正式短信凭证需在生产环境变量或系统设置中补齐，API/MySQL 健康，MySQL 容器与数据卷未重建。

## 2026-07-18 09:42 - 11.01.20 商家资料最小权限与错误恢复闭环

- 商家资料页原加载/保存失败仅弹瞬时提示，刷新可覆盖编辑，确认取消依赖未捕获 Promise，且没有恢复原值和服务端列长度保护；现增加加载/保存持久错误、独立重试、请求互斥、变更检测、恢复原值、取消可靠返回和保存后规范化回填。
- `TenantProfileDto` 按数据库列增加名称 120、地区 80、联系人 100、联系电话 40 字符上限；真实 API 使用 121 字符名称返回 400，再次读取名称保持不变。
- 新增保留账号 `showcase_tenant_profile_only / Qiwai123456`，显式权限仅 `tenant_profile.manage`。浏览器首次登录发现固定跳转 `/dashboard` 后的回退候选缺少商家资料，账号会被送回登录页；现将 `/tenant-profile` 加入最小权限回退并增加菜单契约测试。
- 应用内浏览器复测：账号登录后自动落地 `/admin/tenant-profile`，菜单仅有“商家资料”；直接访问 `/admin/admins` 自动回到资料页。将地区改为临时验收值后取消保存，数据库无变化；恢复原值后保存/恢复按钮重新禁用。最终保存联系人 `慢π演示运营（资料验收）`，页面回显成功并写入 `tenant.profile.update` 审计。
- 桌面视口 `scrollWidth=clientWidth=1179`，390×844 下 `scrollWidth=clientWidth=375`，本轮控制台 warning/error 为 0。API 全量 118 文件 655 项、PC 生产构建（1945 模块）、完整 seed、完整 `npm run preflight`、API Docker healthy 和 `git diff --check` 通过；预检仅保留正式短信凭证既有提醒，MySQL 容器与数据卷未重建。

## 2026-07-18 10:15 - 11.01.21 业务任务权限、并发审计与双 Worker 闭环

- 业务任务从原先依赖 `dashboard.view` 拆为 `business_job.view` 和 `business_job.manage`，管理权限自动包含查看权限；运营默认可查看/管理，财务默认只读，权限目录由 85 项增至 87 项。PC 路由、菜单和最小权限回退使用查看权限，重放、取消和到期扫描使用管理权限，平台手工扫描继续限制平台超级管理员。
- `BusinessJobService` 的重放和取消改为事务加 `pessimistic_write`，并发重复调用返回 `operationApplied=false`，仅第一次实际改变状态；`AdminService` 统一记录 `business_job.replay/cancel/run_due`，重放和取消仅在实际生效时写审计。列表增加状态、类型、关键词、租户和分页边界校验，写操作响应与详情统一执行 payload/result/lastError 脱敏。
- 新增 migration `1783840000000-BusinessJobObservability.ts`，在真实 MySQL 增加 `lastWorkerId`、`lastStartedAt`、`lastFinishedAt`；执行前备份 `backups/mysql/activity_registration-20260718-095811.sql.gz`，migration 表已登记 `BusinessJobObservability1783840000000`。API Docker 已重建并保持 healthy。
- 新增并保留 `showcase_business_job_readonly`、`showcase_business_job_manager`，密码均为 `Qiwai123456`。专项 `npm run acceptance:business-jobs` 最终回归通过，结果 `.local-logs/business-job-1784340948060/result.json`；只读重放/取消/扫描均 403，并发取消与重放均仅一次实际生效，跨租户取消 404，非法状态筛选 400，取消/重放审计各仅一条，最终另保留任务 `206-210`。
- 双独立 Worker 演练插入前缀 `worker-race-1784340116405` 的 80 条到期任务，`api-1` 处理 20 条、`api-2` 处理 60 条；总尝试数 80，尝试次数不为 1、非死信、开始/结束时间缺失均为 0。临时容器 `activity-api-worker-2-1784340116405` 已自动停止，无残留。
- 应用内浏览器确认只读账号自动落地 `/admin/business-jobs`，菜单仅业务任务，无操作列、重放、取消和手工扫描；展开任务 `122` 后 `accessToken/password` 均为 `********`，Worker、请求编号和执行时间完整。管理账号对任务 `124` 先取消确认框验证取消无副作用，再确认后状态变为已取消；对任务 `125` 先验证重放确认取消可恢复，再确认重放进入待执行队列。
- 桌面视口 `scrollWidth=clientWidth=1164`，390×844 下 `scrollWidth=clientWidth=375`，刷新后本轮新增 console warning/error 为 0。最终门禁为 API 全量 118 文件 660 项、API/PC 生产构建（PC 1945 模块）、`acceptance:business-jobs`、双租户 `acceptance:saas-governance`、完整 preflight、`git diff --check` 全部通过；SaaS 新结果 `.local-logs/saas-governance-1784340994873/result.json`，API/MySQL healthy，临时 Worker 容器 0。预检仅保留正式短信凭证既有提醒；验收报告更新为 `docs/business-job-acceptance-report.md`。

## 2026-07-18 10:43 - 11.01.22 首页装修事务替换与错误恢复闭环

- 审计发现首页装修应用内置模板、复制页面、跨商家复制和本地快照恢复原先由 PC 先逐条删除全部模块、再逐条创建；任何中途失败都可能留下半套或空页面。新增 `POST /admin/homepage/sections/replace`，服务端先规范化完整快照，再在同一 `dataSource.transaction` 内删除和批量保存。
- 内置模板、上线简洁版、UI 整套模板、视觉风格、同商家页面复制、跨商家复制和本地发布快照恢复统一改用事务接口；恢复默认装修也改为复用同一事务 helper。空页面是合法发布/恢复状态，DTO 支持空数组事务清空，同时限制最多 100 个模块并逐项校验。
- PC 首页装修增加 `homepage.manage` 二次判权；主加载、平台商家列表、版本历史和模板库增加持久错误及独立重试。发布、应用模板、复制页面、恢复发布版本、恢复默认装修增加主工具栏互斥；模块复制、启停、删除、排序增加行级互斥；确认框取消统一可靠恢复，不再产生未处理 Promise。
- 新增 `homepage-replace-contract.spec.ts`、DTO 两项事务替换验证和 `acceptance:homepage-replace`。首次从仓库根直接调用 Vitest 扫描到历史 `delivery/candidate-*` 旧源码而失败，当前源码 4 文件 65 项实际通过；随后在 `apps/api` 包内限定路径重跑全部通过，未修改历史交付候选。
- 真实 MySQL 使用原本为空的 `login_page`：成功事务创建 2 个模块；再用 121 字符标题触发数据库写入失败，原 2 模块数量和标记完整保留；最后使用空数组事务清空并恢复原空页面。最终结果 `.local-logs/homepage-replace-1784342241424/result.json`，验收标记 `事务替换验收-1784342241660` 已清理。
- 应用内浏览器使用 `showcase_admin / Qiwai123456` 打开首页装修，真实加载 11 个模块；恢复默认装修确认取消后仍为 11 个模块且首模块“慢π演示中心”不变，按钮恢复可用。版本历史加载 3 条保留版本，模板库真实空态正常。
- 桌面视口 `scrollWidth=clientWidth=1164`，390×844 下 `scrollWidth=clientWidth=375`，刷新后新增 console warning/error 为 0。API 全量 119 文件 664 项、API/PC 生产构建（PC 1945 模块）、完整 preflight、API Docker 重建和 healthy 均通过；预检仍仅提示正式短信凭证。报告见 `docs/homepage-builder-transaction-acceptance-20260718.md`。

## 2026-07-18 11:24 - 11.01.23 生产配置中心权限与只读闭环

- 将配置中心拆为平台 `system.view/manage` 和商家 `operation_settings.view/manage`，管理权限自动包含查看权限，平台权限对租户账号强制剔除；权限目录由 87 项增至 89 项。
- `resolveAdminRoutePermission` 接收管理员租户作用域：平台读取运营配置和配置体检使用 `system.view`，平台保存、短信测试和连通检测使用 `system.manage`；商家读取使用 `operation_settings.view`，保存与检测使用 `operation_settings.manage`。`RolesGuard` 将真实 `tenantId` 传入解析器，平台委派账号不再出现路由可进但首接口 403。
- 平台委派系统权限沿用 `requiredPermission` 精确放行，仅限 `system.view/manage`，并保留原生态 CRM 委派授权变量和门禁；其他超级管理员服务断言没有放宽。
- GET 配置改为先查找并返回安全投影，记录不存在时只生成内存默认值，不再通过 `ensureOperationSetting` 隐式写库；保存仍负责首次持久化。短信密钥和 launch config 密钥继续掩码返回，专项固定不得泄露加密存储值。
- PC 配置页使用 `isPlatformScopedAdmin()` 判断平台页面，另以具体 manage 权限决定可编辑状态。只读账号仅可刷新和查看，保存、测试短信、连通检测、上传、密钥清除及部署写控件隐藏或禁用；加载、保存、配置体检和连通性检测增加持久错误、独立重试和请求互斥。修复支付说明/退款/发票及数字步进控件绕过父表单只读状态的问题，并将 Element Plus 单选按钮升级到 `value` API，最终控制台无新增警告。
- 新增并保留 `showcase_operation_settings_read`、`showcase_operation_settings_only`、`showcase_system_settings_read`、`showcase_system_settings_manager`，密码均为 `Qiwai123456`。首次 seed 使用的两个建议只读账号名超过 32 字符校验被拒绝，已改为当前合法固定账号名，完整 seed 随后成功且原数据保留。
- 最终真实专项 `npm run acceptance:operation-settings` 结果 `.local-logs/operation-settings-1784345023796/result.json`：四类账号读取成功；两个只读账号保存、短信测试、连通检测均 403；商家不能访问平台体检；平台委派管理账号保存、体检和连通检测成功；商家管理账号保存和连通检测成功；平台记录 `1` 与租户 `23` 数据不串用。
- 应用内浏览器确认平台只读账号菜单显示系统设置与独立上线体检，运营、部署和体检可查看但写控件不可用；平台管理账号显示保存/检测并成功保存，配置体检显示 development、版本 0.1.0、待确认 11、需修复 0；商家只读账号自动落地运营设置，菜单仅一项，保存/短信测试/连通检测/上传入口为 0，表单不可编辑。桌面与 390×844 无横向溢出，最终刷新后新增 warning/error 为 0。
- 最终门禁为 API 全量 120 文件 668 项、配置权限专项 4 文件 59 项、API/PC 生产构建（PC 1945 模块）、89 项权限目录、完整 `npm run preflight`、`git diff --check`、API Docker 重建及 ready 健康检查全部通过。预检仅保留正式短信凭证既有提醒；正式短信、微信、支付和对象存储继续按外部配置验收，不阻塞后续不依赖功能开发。

## 2026-07-18 11:40 - 11.01.24 独立上线体检权限与失败恢复闭环

- 独立上线体检页只调用只读 `GET /admin/system/config-check`，原先仍要求超级管理员角色，导致已具备 `system.view` 的平台委派只读账号只能在系统设置内查看体检，无法进入专门页面；现将 PC 路由和平台菜单统一改为 `system.view`，商家账号继续受 platform scope 与服务端权限双重隔离。
- `ConfigCheck.vue` 新增持久 `loadError`、独立“重试体检”和请求互斥；接口失败时保留明确错误，不再同时渲染“暂无体检结果”，重新检查、重试和空态启动按钮均在请求期间禁用。
- 新增 `config-check-permission-contract.spec.ts`，固定路由、菜单、服务端 GET 权限和错误恢复契约；同步更新角色、运营设置及操作日志 preflight 里的旧权限断言。操作日志仍使用 `logs.view`，配置中心仍使用 `system.view/operation_settings.view`，未为通过门禁恢复超级管理员硬编码。
- 应用内浏览器使用保留账号 `showcase_system_settings_read / Qiwai123456` 验证：平台菜单显示“系统设置、上线体检”，独立 `/admin/config-check` 正常加载版本 `0.1.0`、环境 `development`、正常 45、待确认 11、需修复 0；“重新检查”成功。桌面与 390×844 视口均无明显横向溢出，本轮新增 console warning/error 为 0。
- 最终门禁为限定测试 4 文件 45 项、API 全量 121 文件 670 项、PC 生产构建（1945 模块）、89 项权限目录、完整 `npm run test:preflight-guards`、完整 `npm run preflight` 和 `git diff --check` 通过。预检仅保留正式短信凭证既有提醒，正式短信、微信、支付和对象存储继续按外部配置验收。

## 2026-07-18 12:02 - 11.01.25 小程序发布权限、日志脱敏与操作状态闭环

- 小程序发布原只有平台专属 `miniprogram_release.manage`，配置读取、发布记录和真实上传/提审/发布不能独立授权；现新增 `miniprogram_release.view`，管理权限自动包含查看权限。GET 配置/日志映射到查看权限，保存配置、上传、提审、查询审核和发布继续映射管理权限，PC 路由、平台菜单和最小权限登录回退统一使用查看权限，租户账号继续剔除两项平台权限。
- `MiniprogramReleaseService.logsList` 对非法 limit 回退 30，并在响应前移除 stack，递归掩码 secret、token、private key、password、authorization 和 cookie 等敏感键；数据库保留原始审计记录，前端只接收安全投影。配置和上传 DTO 按实体列补齐 AppID 80、Secret 255、私钥 65535、版本 40、描述 500 和构建目录 255 字符边界。
- PC 页面增加配置/日志独立加载状态、持久错误与重试，保存和发布动作持久错误，加载/保存/上传/提审/查询/发布全局互斥；所有确认框取消可靠返回。只读账号显示明确提示，7 个配置字段全部禁用，保存和四个发布动作隐藏；管理账号保留完整编辑和发布流程。
- 完整 seed 首次重跑发现 `ensureAccounts` 把 `showcase_admin` 密码设置为 `SHOWCASE_PASSWORD`，而 `loginShowcaseAdmin` 默认使用不同的 `SHOWCASE_ADMIN_PASSWORD`，导致账号更新完成后流程中断。共享助手现优先使用显式专用密码，未配置时继承统一 `SHOWCASE_PASSWORD`；随后完整 seed 成功保留活动、课程、社区、商城和演示用户余额。
- 新增并保留平台账号 `showcase_miniprogram_read`、`showcase_miniprogram_manager`，密码均为 `Qiwai123456`。专项 `npm run acceptance:miniprogram-release` 验证只读账号读取配置/脱敏日志成功、保存 403，商家运营设置账号跨作用域读取 403，管理账号使用原配置保存且不改变 Secret/私钥配置状态；结果 `.local-logs/miniprogram-release-1784347022346/result.json`，保留配置 `#1`、AppID `wx-showcase-acceptance` 和管理保存日志。
- 应用内浏览器确认只读账号菜单仅“小程序发布”，保存按钮 0、发布动作 0、7/7 字段禁用；管理账号保存按钮 1、发布动作 4、7/7 字段可编辑。点击发布线上版后取消，记录保持 1 条、按钮恢复可用且无接口副作用；浏览器保存原配置成功，记录增至 2 条并保留。桌面 `scrollWidth=clientWidth=1265`，390×844 下 `scrollWidth=clientWidth=375`，刷新后新增 console warning/error 为 0。
- 最终门禁为限定测试 6 文件 88 项、API 全量 123 文件 678 项、Shared/API/PC/H5 完整构建（PC 1945 模块）、90 项权限目录、完整 seed、真实 API 专项、完整 `npm run preflight`、`git diff --check`、API Docker 重建及 healthy 全部通过。预检仅保留正式短信凭证既有提醒；真实微信 CI 上传、提审、审核查询和线上发布等待项目主体提供 AppID、AppSecret、CI 私钥、IP 白名单和审核类目后在正式环境验收。

## 2026-07-18 12:13 - 11.01.26 运营巡检双作用域与状态隔离闭环

- 运营巡检原路由和平台菜单要求 `system.manage`，实际页面只维护本地检查清单，没有服务器写操作；商家运营无法使用。现路由允许 `system.view` 或 `dashboard.view` 且作用域为 `tenantOrPlatformAdmin`，平台菜单向系统查看账号开放，商家设置菜单向工作台账号增加“运营巡检”。
- 原 12 个巡检项无视当前权限全部展示，平台账号会看到只能由租户进入的代理结算，最小系统账号会看到财务、日志和账号管理等不可达入口。每项现声明 `platformRoles/tenantRoles`，`canUseItem` 按当前平台或商家作用域和真实权限过滤；分组数量、完成数量和总数只统计可达项。
- 原状态键为 `ops-routine:${UTC日期}`，同一浏览器所有管理员、平台和商家共享完成状态，并在上海时区 00:00-07:59 记到前一天。现改为 `平台或tenantId + admin_username + 本地日期`，跨账号、跨租户和跨本地日期完全隔离。localStorage 写入失败时不更新内存状态并显示持久操作反馈。
- “重置今日状态”增加确认框和取消可靠恢复；只有确认后才清空当前账号当天状态并提示成功，不影响其他账号或租户。
- 应用内浏览器使用 `showcase_system_settings_read` 进入平台巡检：菜单为系统设置、上线体检、运营巡检；可达项共 4 个，每日为上线体检和报名通道，勾选后显示每日 `1/2`、总计 `1/4`。切换 `showcase_admin` 后商家独立从 `0/8` 开始，每日仅财务对账和报名通道，周巡检 4 项、月巡检 2 项；不显示平台登录日志、验证码日志、上线体检和备份恢复。勾选财务对账后取消重置，仍保持每日 `1/2`、总计 `1/8`。
- 桌面 `scrollWidth=clientWidth=1265`；390×844 下页面 `scrollWidth=clientWidth=375`，宽表 `scrollWidth=1136/clientWidth=277` 仅在表格内部横向滚动，页面外壳不溢出。最终刷新新增 console warning/error 为 0。
- 新增 `ops-routine-access-contract.spec.ts`，限定测试 2 文件 24 项、API 全量 124 文件 681 项、PC 生产构建（1945 模块）、90 项权限目录、完整 `npm run preflight` 和 `git diff --check` 通过。API 源码未变，沿用上一批已重建且 healthy 的 Docker 容器；预检仍仅保留正式短信凭证提醒。

## 2026-07-18 12:52 - 11.01.27 运维教程权限、实体目录与移动布局闭环

- 运维教程路由和平台菜单由 `system.manage` 改为 `system.view`；`system.view` 可查看完整教程和数据库目录，仅 `system.manage` 显示命令复制按钮。高风险迁移、恢复、回滚命令继续二次确认，取消后剪贴板不变、确认框关闭且按钮恢复。
- 新增构建前脚本 `scripts/generate-operation-guide-catalog.mjs`，从 API `@Entity` 自动生成 PC 数据库目录，当前 197 张实体表全部覆盖；原 67 张人工说明继续作为优先覆盖，其余 130 张使用分类、业务说明和注意事项生成。目录新增关键词和分类筛选，构建前自动刷新，避免新增实体后教程漏表。
- 首轮生成器仅对完整表名做单数化，出现 `ADDRESSE`、`ALERT`、`ADVERTISER`、`PUBLICATION` 等机器拼词。现改为逐 token 尝试原词、`ies -> y`、去 `es`、去 `s`，只有命中字典才转换，并补代理、账户、审批、告警、地址、审核、课程章节、工单等业务词典与核销、拼团、小程序发布等精确表名覆盖。preflight 和契约测试固定生成目录不得出现 H5、SKU 之外的未翻译大写词元。
- PM2 命令删除无效 `/www/server/nodejs/v22.22.3/bin/pm2`，统一使用 `/www/server/nodejs/v22.22.3/lib/node_modules/pm2/bin/pm2`。教程去除营销式渐变头图，改为紧凑的运维工作台布局。
- 浏览器发现普通复制在嵌入式环境中 `navigator.clipboard.writeText` 被拒绝。运维教程改用公共 `copyToClipboard`，公共工具增加异常捕获、只读隐藏文本框、显式聚焦、完整选区和 `execCommand("copy")` 降级，降级失败才返回错误；页面复测显示“命令已复制”。应用内浏览器的自动化剪贴板与页面剪贴板彼此隔离，自动化粘贴仍读取测试哨兵，此限制写入验收报告，不影响标准 Chrome/Edge 的同源复制路径。
- 应用内浏览器使用 `showcase_system_settings_read / Qiwai123456`：菜单显示系统设置、上线体检、运维教程、运营巡检；只读提示可见、复制按钮 0、数据库目录 `197/197`，四个问题表名均为自然中文，搜索 `mall_refunds` 返回 `1/197`。切换 `showcase_system_settings_manager / Qiwai123456` 后复制按钮 32、只读提示消失；只读账号保留“数据库”标签，管理账号独立从“常用命令”开始，证明位置按账号隔离。
- 管理账号在数据库页点击“执行迁移”复制后取消：测试哨兵保持不变、复制按钮恢复、确认按钮为 0；普通“查看迁移状态”复制显示成功提示。页面侧兼容复制返回成功，应用内浏览器自动化剪贴板隔离按上述限制记录。
- 首次 390×844 截图发现页面容器 351px，但标签页子内容最小宽度撑到 638px 后被主容器裁切，页头标签和数据库筛选区不可完整阅读。现为页面及标签页子项补 `min-width:0`，手机页头改上下布局、标签允许换行、数据库筛选改单列、表格限定 100% 并在内部滚动。复测页面/页头/筛选区分别为 351/311/311px，外层 `scrollWidth=clientWidth=375`，长文本溢出 0，`mall_refunds` 手机筛选仍为 `1/197`；最终恢复桌面后页面 `scrollWidth=clientWidth=999`，近 5 分钟新增本地 warning/error 为 0。
- 限定测试 2 文件 25 项、API 全量 125 文件 685 项、PC 生产构建（1946 模块）、90 项权限目录和完整 `npm run preflight` 通过；完整预检仍仅提示正式短信环境变量可由系统设置提供。专项报告见 `docs/operation-guide-permission-acceptance-20260718.md`。

## 2026-07-18 13:34 - 11.01.28 定位命中日志权限、敏感投影与导出闭环

- 新增平台专属 `tenant_region_hit_log.view`、`tenant_region_hit_log.sensitive`、`tenant_region_hit_log.export`，敏感和导出权限自动包含查看权限，租户账号强制剔除三项权限；区域保护继续独立使用 `tenant_region.manage`。权限目录由 90 项增至 93 项。
- 新增日志专属 `GET /admin/tenant-region-hit-logs/options` 和最多 10000 条的 Excel 导出接口；普通查看响应隐藏精确坐标和 User-Agent、脱敏 IP，敏感账号返回完整字段，导出写入 `export.tenant_region_hit_logs` 审计。修复服务层超级管理员断言对平台委派日志账号的二次拒绝。
- PC 页面改用专属筛选选项，不再无条件请求 `/admin/tenants`；补加载/导出持久错误、重试、请求互斥和最小权限登录回退。只读模式隐藏地图和完整终端，导出按钮仅导出权限显示；去除营销式渐变页头，修复移动端日期范围和分页撑宽。
- 新增并保留 `showcase_region_log_read`、`showcase_region_log_sensitive`、`showcase_region_log_export`，密码均为 `Qiwai123456`。完整 seed 成功重跑且原数据保留。真实专项 `npm run acceptance:tenant-region-hit-log` 验证只读 options 24、日志 1 条且导出 403；敏感账号完整字段且导出 403；导出账号获得 7135 bytes XLSX 和审计 `#7832`；租户跨作用域 403。结果 `.local-logs/tenant-region-hit-log-1784351861621/result.json`，日志 `#10` 保留。
- 应用内浏览器完成三账号验收：只读账号无导出/地图且精确坐标全部隐藏；敏感账号完整坐标、IP、User-Agent 可见但不可导出；导出账号显示导出按钮并恢复可用。嵌入式浏览器对 `fetch -> Blob -> a.click()` 未产生 download event，真实 API 已验证 XLSX 文件、SHA-256 和审计，因此如实记录为浏览器能力限制。
- 390×844 下文档 `375/375`、页面 `351/351`、工具栏和分页 `269/269`，长文本溢出 0；最终恢复默认视口，页面宽 `999/999`。同批将社区和商城商家页面遗留的 Element Plus 单选按钮由 `label` 改为 `value`，新构建刷新没有新增 warning/error，日志中仅剩旧时间戳历史记录。
- 最终门禁为 API 全量 126 文件 689 项、API/PC 构建（PC 1946 模块）、93 项权限目录、完整 `npm run preflight` 通过；预检仅保留正式短信凭证既有提醒。专项报告见 `docs/tenant-region-hit-log-permission-acceptance-20260718.md`。

## 2026-07-18 14:02 - 11.01.29 区域保护三权分离与操作状态闭环

- 将平台区域保护由单一 `tenant_region.manage` 拆为 `tenant_region.view`、`tenant_region.manage`、`tenant_region.approve`；维护和审批分别自动包含查看权限但互不包含，三项均为 platform-only，权限目录由 93 项增至 95 项。GET 列表/options 使用查看权限，新增、编辑、删除和批量导入使用维护权限，冲突审批使用独立审批权限。
- 新增 `GET /admin/tenant-regions/options`，PC 不再为加载筛选项请求需要 `tenant.manage` 的 `/admin/tenants`；区域列表的商家对象裁剪为 `id/code/name/region/enabled`，移除联系人、电话、套餐设置和完整配置。`assertPlatformAdmin` 增加区域委派权限白名单，最小权限平台运营账号不再被服务层二次拒绝。
- 审批服务端增加状态机约束，仅 `pending` 可批准或驳回，已批准/已驳回记录重复审批返回 400。PC 新增加载持久错误和重试、只读/维护/审批提示、函数权限二次校验及删除/审批操作锁，确认取消后数据不变且按钮恢复；移除渐变页头和“下一阶段升级”文案，准确展示当前半径与多边形能力。
- 新增并保留 `showcase_region_read`、`showcase_region_manager`、`showcase_region_approve`，密码均为 `Qiwai123456`；完整 seed 成功重跑且原数据保留，seed 结束账号输出改为按账号数组动态生成，后续新增验收账号不会再漏报。
- 最新真实专项 `npm run acceptance:tenant-region-permissions` 结果 `.local-logs/tenant-region-permission-1784354302515/result.json`：只读 options 42、原区域 17，创建/审批 403；维护账号创建 `#18`、更新成功、批量导入 `#19`、审批 403；审批账号创建/删除 403、驳回冲突区域 `#20`、重复审批 400；租户账号访问 403；审批审计 `#7986`。首次专项区域 `#14/#15/#16` 同样保留。
- 应用内浏览器只读账号写按钮均为 0、保留 16 个地图入口；维护账号显示新增/导入和 16 组编辑/删除，无审批按钮，对 `区域维护权限验收-1784353774381-已更新` 删除确认取消后数据仍在且按钮恢复；审批账号仅对待审批区域 `#17 / 区域浏览器审批待处理-1784353998203` 显示批准/驳回，批准确认取消后仍为 pending 且按钮恢复。
- 390×844 下文档/body `375/375`、页面 `351/351`、卡片 `309/309`，宽表仅在内部滚动，页面外壳无横向溢出；恢复默认视口后文档 `999/999`，本批新增 warning/error 为 0。
- 专项 5 文件 68 项、最终限定 3 文件 30 项、API 全量 127 文件 694 项、API/PC 构建（PC 1946 模块）、95 项权限目录和完整 `npm run preflight` 全部通过；API Docker 已重建并 ready，MySQL 和数据卷未重建。预检仅保留正式短信凭证既有提醒；报告见 `docs/tenant-region-permission-acceptance-20260718.md`。

## 2026-07-18 15:03 - 11.01.30 商家管理五权分离与移动管理闭环

- 将原 `tenant.manage` 拆为平台专属 `tenant.view`、`tenant.manage`、`tenant.permissions.manage`、`tenant.subscription.manage`、`tenant.export`；后四项分别包含查看权限但互不包含，租户账号强制剔除五项，权限目录由 95 项增至 99 项。GET 列表、Excel 导出、资料写入、权益写入、套餐读取/变更分别映射到对应权限。
- 商家列表默认安全投影：无资料维护权限时联系电话服务端脱敏并标记 `sensitiveMasked`，Excel 导出显式读取完整数据并写 `export.tenants` 审计。PC 列表和详情继续统一肩窥脱敏；新建、编辑、权益开关、套餐表单、导出和后台账号/收款/活动/报名/财务/日志入口按真实权限显示，套餐历史增加持久错误、重试和 loading。
- 验收发现资料管理员仍可借 `TenantDto.settings` 夹带修改权益和套餐，权益接口也接受套餐字段。现资料服务按操作者权限筛选允许设置键，权益 DTO/服务仅允许四项业务权益和自定义 entitlements；资料弹窗不显示未授权套餐/权益，提交载荷不携带未授权 settings，权益更新只提交明确字段。同步修复商家备注未持久化及批量启停只传 enabled 不满足 DTO 的问题。
- 浏览器套餐流程发现相同到期日续费仍会生成事件；服务端现要求续费/延期日期晚于当前到期日，真实专项复测返回 400。规则修复前的浏览器测试事件和审计 `#8141` 按要求保留，后续请求已被新规则拦截。
- 移动管理端首次登录回跳，根因依次为 bootstrap 内部商家列表沿用 `activity.view` 上下文、无收款权限仍同步调用代理列表，以及平台 `dashboard.view` 被服务层二次限制。现商家列表显式使用 `tenant.view`，代理列表按 `payment_account.view` 条件加载，平台委派 dashboard/收款权限可通过服务断言。`showcase_tenant_read` 增加移动首页最小只读权限 `dashboard.view + activity.view + tenant.view`，写操作仍全部 403。
- 保留账号 `showcase_tenant_read/manager/rights/plan/export`，密码均为 `Qiwai123456`。最新专项 `.local-logs/tenant-permission-1784357852536/result.json` 保留商家 `#59 / permission_tenant_1784357853367`：只读电话 `138****8000`，资料夹带设置无效，权益更新成功，套餐升级事件 `#4`，相同日期续费 400，XLSX `14696` bytes，移动 bootstrap 返回 45 个脱敏商家且 `canSelectTenant=true`，平台看板 `scope=platform`，租户账号 403；审计 `#8456/#8458/#8459/#8460`。
- 应用内浏览器使用商家 `#57` 完成五账号页面验收：只读无写按钮，资料编辑无套餐/权益字段，权益账号关闭商城后立即回显未开通并保留审计 `#8140`，套餐账号查看历史并完成写流程，导出账号仅显示导出。嵌入式浏览器未触发 Blob download event，真实 API XLSX 与审计已通过。390×844 PC 外壳无横向溢出；移动管理端只读账号进入首页，展示平台统计和最近活动，并明确提示不能创建或编辑，页面 `scrollWidth=clientWidth=390`。最终恢复默认视口并停留 `/admin/tenants`，登录 `showcase_tenant_export`。
- 最终门禁：权限专项 5 文件 90 项、API 全量 128 文件 700 项、API 构建、PC 生产构建 1946 模块、完整 seed、真实 API 专项、完整 `npm run preflight`、99 项权限目录、API Docker healthy 和 `git diff --check` 全部通过。预检仅保留正式短信凭证既有提醒；报告见 `docs/tenant-administration-permission-acceptance-20260718.md`。

## 2026-07-18 15:38 - 11.01.31 后台账号管理三权分离与数据范围闭环

- 将单一 `admin.manage` 拆为 `admin.view`、`admin.manage`、`admin.security.manage`；维护和安全权限分别自动包含查看权限但互不包含，权限目录由 99 项增至 101 项。账号列表、账号 options 和邀请列表使用查看权限；创建、编辑、角色复制、邀请创建/撤销使用维护权限；重置密码、启停和强制下线使用安全权限。
- 新增 `GET /admin/admins/options`，平台账号按所选商家获得最小商家/活动选项，商家账号无论传入何种 tenantId 均只获得当前商家；页面不再依赖 `tenant.view` 或 `activity.view`。账号列表商家对象裁剪为 `id/code/name/region/enabled`，不再携带完整商家设置。
- 平台委派账号可查看全平台账号，但只能操作商家员工，不能创建平台账号、设置超级管理员角色或对平台账号重置密码/启停/强制下线。商家账号只能处理本商家账号和邀请，跨租户 ID 猜测返回 404。
- 编辑接口仅在启用状态实际变化时要求 `admin.security.manage`，阻止维护账号通过 PATCH 夹带停用；跨商家角色复制固定返回 400。创建、编辑和邀请会校验活动数据范围全部属于目标商家，平台账号不能设置商家活动范围。
- PC 页面识别平台委派范围，形成只读、账号维护和账号安全三种界面状态；只读仍可查看邀请记录，维护弹窗无安全权限时显示状态标签且不发送 enabled，安全账号不显示创建/编辑/复制角色。无 `member.view` 时隐藏“从会员选择”，避免无关敏感查询。
- 新增并保留 `showcase_admin_read/manager/security` 与 `showcase_staff_read/manager/security`，密码均为 `Qiwai123456`。真实专项 `.local-logs/admin-account-permission-1784359954776/result.json` 保留员工 `#222 / admin_perm_1784359955758`、撤销邀请 `#2`；前两轮中断数据 `#220/#221` 和邀请 `#1` 同样保留。专项验证夹带停用 403、委派提权 403、跨租户 404、跨商家范围/角色复制 400、强制下线旧 token 401、停用登录 401，审计 `#8627/#8631/#8633-#8636/#8629/#8630`。
- 应用内浏览器完成平台只读、维护和安全账号验收：只读无写操作，维护仅有创建/编辑/复制，安全仅有重置/启停/强制下线；禁用确认取消后账号仍启用且按钮恢复。390×844 下只读/安全页面、创建卡片和权限面板均无外层横向溢出，最终恢复默认视口并停留 `/admin/admins?tenantId=23`，登录 `showcase_admin_manager`。
- 最终门禁：专项 4 文件 65 项、API 全量 129 文件 706 项、API/PC 构建（PC 1946 模块）、完整 seed、真实 API 专项、完整 `npm run preflight`、101 项权限目录和 API Docker healthy 全部通过；预检仅保留正式短信凭证既有提醒。报告见 `docs/admin-account-permission-acceptance-20260718.md`。

## 2026-07-18 16:27 - 11.01.32 日志权限、脱敏与导出闭环

- 将操作日志拆为 `logs.view/sensitive/export`，将后台登录与 H5 验证码日志拆为平台专属 `security_log.view/sensitive/export`；敏感和导出分别继承查看但互不包含，商家账号不能访问平台安全日志，权限目录由 101 项增至 106 项。
- 新增操作日志和安全日志专属 options，页面不再依赖商家管理权限；普通操作日志脱敏 IP、隐藏 User-Agent，并递归处理详情中的手机号、IP、终端、身份证、银行账号、地址和经纬度。登录日志脱敏 IP并隐藏 User-Agent，验证码日志脱敏手机号/IP并隐藏服务商消息号。
- 新增操作日志、后台登录日志和 H5 验证码日志 Excel 导出，分别记录 `export.operation_logs`、`export.admin_login_logs`、`export.h5_code_logs`；敏感权限不能导出，导出权限也不会自动获得敏感字段。
- PC 三页按权限显示敏感说明、终端列和导出按钮，补加载/导出错误反馈与互斥；验证码手机号改为显式 `displayPhone` 安全渲染，通过后台隐私静态门禁。390×844 下卡片从 `309/325` 修复为 `309/309`，筛选区从 `277/309` 修复为 `277/277`。
- 保留平台账号 `showcase_log_read/sensitive/export`、`showcase_security_log_read/sensitive/export`，并复用商家账号 `showcase_staff_read/manager/security` 避免突破套餐 `adminUsers=30`；密码均为 `Qiwai123456`。
- 最新真实专项 `.local-logs/log-permission-1784362687313/result.json`：平台操作日志 9098 条、商家操作日志 4274 条、后台登录日志 2481 条、验证码日志 275 条；四份 XLSX 分别为 634446、254410、84724、18774 bytes，导出审计 `#9100/#9101/#9102`，全部证据和测试数据保留。
- 应用内浏览器确认普通操作日志详情显示 `139****0005` 且不存在 `13990000005`；三类账号页面状态和作用域边界通过，验证码正式构建首行手机号 `133****9731`，无导出按钮；恢复默认视口后页面无外层溢出，本轮没有新增控制台 warning/error。
- 最终门禁：日志专项 4 文件 66 项、API 全量 130 文件 712 项、API/PC 构建（PC 1946 模块）、完整 seed、真实 API 专项、106 项权限目录、完整 `npm run preflight` 和 API Docker healthy 全部通过；MySQL 和数据卷未重建。预检仅保留正式短信凭证既有提醒，报告见 `docs/log-permission-acceptance-20260718.md`。

## 2026-07-18 17:13 - 11.01.33 活动分类与票种权限及编辑 options 闭环

- 新增 `category.view`、`ticket.view`，分类和票种管理权限分别自动包含查看；分类/票种 GET、写接口、PC 路由、菜单、最小回退和页面控件完成分层，权限目录由 106 项增至 108 项。
- 新增 `GET /admin/ticket-types/options`，只返回当前商家和活动数据范围内的最小活动对象；票种页面不再请求 `/admin/activities`，最小票种只读账号可独立使用。
- 新增 `GET /admin/activities/options`，活动维护账号一次获得分类、代理、会员等级和商家最小编辑元数据，不再依赖 `payment_account.view/member.view/tenant.view`。商家设置只返回 `registrationReviewEnabled`，平台表单按所选商家过滤分类和代理。
- 分类列表和票种列表改为显式安全投影，分类商家对象不含 settings/联系人/电话，票种活动对象仅含 `id/title/status`；分类新增/更新/停用和票种新增/更新补统一操作审计。
- 首轮真实专项 `.local-logs/category-ticket-permission-1784364886785` 发现商家维护账号直接更新平台全局分类 `#26` 返回 200，并把分类改归当前商家。现分类编辑/停用增加严格 `category.tenant.id === admin.tenantId` 断言，平台全局和其他商家分类统一 404；修复前分类 `#26 / cross-tenant` 按要求保留。
- 浏览器首次登录 `showcase_category_read` 时 API 返回 201 但仍停留登录页，根因是 PC 静态权限目录遗漏新权限并在保存会话时过滤。现前后端目录同步，权限目录 guard 固定 108 项，账号自动落地 `/admin/categories`。
- 保留平台账号 `showcase_category_read/manager`，并为 `showcase_staff_read/manager/security` 增加分类票种只读/维护和活动 options 验收权限；密码均为 `Qiwai123456`。最终专项 `.local-logs/category-ticket-permission-1784365061211/result.json` 保留平台分类 `#27`、商家分类 `#28`、票种 `#58`，跨商家分类与活动均 404，审计 `#9293-#9296`。
- 应用内浏览器确认平台分类只读账号 28 行、写按钮 0，维护账号新增 1/编辑 28；商家只读分类 6 行、票种 13 行且写按钮 0，维护账号票种新增 1/编辑 13；最小活动维护账号打开新建向导后分类、代理和会员门槛字段正常，未出现 options 错误。新增弹窗取消均无副作用。
- 390×844 下分类文档/页面/卡片为 `375/375`、`351/351`、`309/309`；票种卡片 `309/309`、筛选表单 `277/277`，外层无溢出。默认视口恢复 `999/999`，本轮页面没有新增 warning/error。
- 最终门禁：专项 4 文件 67 项、API 全量 131 文件 717 项、API/PC 构建（PC 1946 模块）、完整 seed、真实 API 专项、108 项权限目录、完整 `npm run preflight`、API Docker healthy 和 `git diff --check` 全部通过；MySQL 和数据卷未重建。报告见 `docs/category-ticket-permission-acceptance-20260718.md`。

## 2026-07-18 18:25 - 11.01.34 优惠券与兑换码六权分离及业务闭环

- 将原 `coupon.manage` 拆为 `coupon.view/manage/export` 和 `redemption_code.view/manage/export`；维护、导出分别只继承对应查看，两类业务互不借权。API、PC 权限目录、路由、菜单、默认运营角色和 seed 已同步，权限目录由 108 项增至 113 项。
- 新增优惠券/兑换码专属 options、优惠券领取与使用记录、兑换码使用记录和两类 XLSX 导出；活动优惠券、商城券、课程权益均由当前商家真实对象生成。列表、关联对象和会员响应改为最小投影，手机号服务端固定脱敏，PC 通过 `maskPhone` 二次渲染。
- 商家内优惠券和兑换码建立唯一约束；商家账号不能读取或接管平台及其他商家券码，平台管理员不能通过更换限定活动迁移已有优惠券商家归属。兑换目标严格校验当前商家；已使用兑换码禁止修改券码和权益，总量/个人上限不能低于历史使用量。
- 活动券兑换校验启停、有效期、总量和每人限领；商城券兑换同步校验并正确增加 `claimedCount`；用户已有课程权限时不重复消耗课程兑换码。优惠券和兑换码创建、更新、导出均写操作审计。
- migration `1783850000000-CouponTenantGovernance.ts` 已在真实 MySQL 执行，迁移前备份 `backups/mysql/activity_registration-20260718-174253.sql.gz`；179 个 migration 全部 `[X]`，MySQL 和数据卷未重建。
- 保留 `showcase_staff_read/manager/security`，密码均为 `Qiwai123456`。最新专项 `.local-logs/coupon-redemption-permission-1784369868355/result.json` 保留优惠券 `#21`、领取 `#6`、兑换码 `#9`、兑换记录 `#8`、平台边界对象 `#22/#10` 和其他商家同码券 `#23`；两类导出 9642/8792 bytes，审计 `#9502-#9505/#9509/#9510`。
- 应用内浏览器确认只读、维护、导出三种状态，最新构建的领取/兑换记录只显示脱敏手机号，演示明文手机号数量为 0；默认视口 `999/999`，本轮没有新增 warning/error。
- 完整 preflight 首轮捕获 `Coupons.vue` 两处直接手机号渲染，已使用现有隐私 helper 整改并重建。最终门禁为专项 4 文件 70 项、API 全量 132 文件 724 项、API/PC 构建（PC 1946 模块）、113 项权限目录、真实 API 专项、完整 `npm run preflight`、179 个 migration、API Docker healthy 和 `git diff --check` 全部通过。报告见 `docs/coupon-redemption-permission-acceptance-20260718.md`。

## 2026-07-18 18:58 - 11.01.35 候补权限、隐私和并发闭环

- 将单一 `waitlist.manage` 拆为 `waitlist.view/manage/sensitive`；维护和敏感分别只继承查看且互不包含。API、PC 权限目录、路由、菜单、默认运营角色和 seed 已同步，权限目录由 113 项增至 115 项。
- 新增 `GET /admin/waitlists/options`，返回当前商家和岗位活动范围内的最小活动选项，候补最小账号不再依赖 `activity.view`。候补列表升级为 page/pageSize 分页，最多 100 条，并补状态、活动 ID 和分页边界 DTO 校验。
- 原候补列表多组 `leftJoinAndSelect` 会返回完整活动、商家、代理、会员和补位报名实体，且没有岗位活动数据范围。现改为显式列选择和白名单 DTO，列表与 options 同时应用 `activity_ids` 数据范围；自动化扫描 passwordHash、openid、unionid、settings、checkInCode、sessionVersion、agent 和 eligibilityRules 均为 0。
- 普通查看和维护账号的手机号、姓名、身份证、地址、微信、邮箱及答案内 11 位手机号执行服务端语义脱敏，PC 再使用公共 `maskPhone`；`waitlist.sensitive` 可查看完整报名信息但不能执行补位或取消。
- 取消候补改为事务 `pessimistic_write` 行锁，在锁后复核状态并强制非空原因；补位保留原事务锁。真实同一候补并发补位仅一次成功 `400/201`，并发取消仅一次成功 `201/400`。
- 保留账号 `showcase_staff_read/manager/security`，密码均为 `Qiwai123456`。最新专项 `.local-logs/waitlist-permission-1784371870367/result.json` 保留活动 `#186`、正式报名 `#20537/#20538`、候补 `#9/#10/#11` 和其他商家候补 `#12`；跨商家补位/取消均 404，审计 `#9700/#9701`。
- 应用内浏览器确认只读账号无操作列且全部脱敏，敏感账号完整显示报名信息但无写操作，维护账号显示补位/取消且仍脱敏；对候补 `#11` 打开取消确认后返回，状态保持 waiting，无接口副作用。390×844 下文档/页面/卡片为 `375/375`、`351/351`、`309/309`，本批页面没有新增 warning/error。
- 最终门禁为限定 5 文件 95 项、API 全量 133 文件 728 项、API/PC 构建（PC 1946 模块）、完整 seed、真实 API 专项、115 项权限目录、完整 `npm run preflight`、API/MySQL healthy 和 `git diff --check` 全部通过；本批无 migration，现有 179 个继续全部 `[X]`。报告见 `docs/waitlist-permission-acceptance-20260718.md`。

## 2026-07-18 19:28 - 11.01.36 活动评价/举报权限、隐私和并发闭环

- 将单一 `review.manage` 拆为 `review.view/manage/sensitive`；维护和敏感分别只继承查看且互不包含。API、PC 权限目录、路由、菜单、默认运营角色和 seed 已同步，权限目录由 115 项增至 117 项。
- 新增 `GET /admin/reviews/options`，只返回当前商家和岗位 `activity_ids` 数据范围内的最小活动对象。评价与举报列表改为独立 page/pageSize 分页，最多 100 条，并补活动、状态和分页参数校验。
- 评价、举报、活动、会员、报名和处理人响应改为显式字段选择与白名单 DTO；普通查看和维护账号手机号服务端固定脱敏，PC 再使用公共 `maskPhone`，只有 `review.sensitive` 可见完整手机号和举报处理人。
- 评价和举报处置均改为事务 `pessimistic_write` 行锁；举报仅 `pending` 可处置，处理说明必填且最长 500 字，管理员回复最长 255 字。隐藏评价会自动取消精选，跨商家和岗位范围外对象返回 404。
- 评价处置和举报处理分别记录 `review.moderate`、`review_report.handle` 审计。真实同一举报并发处置仅一次成功 `200/400`，重复处置返回 400，最终评价 `hidden` 且 `featured=false`。
- 保留账号 `showcase_staff_read/manager/security`，密码均为 `Qiwai123456`。最新专项 `.local-logs/review-permission-1784373486819/result.json` 保留商家 `#23`、评价 `#8`、活动 `#152`、报名 `#10390`、举报 `#5`、举报会员 `#121`，审计 `#9890/#9891`。
- 应用内浏览器确认只读账号无操作列且全部脱敏，敏感账号显示 6 个完整手机号但无写操作，维护账号显示评价和举报操作列且仍脱敏；旧举报驳回弹窗取消后数据和按钮恢复。390×844 下文档/页面 `375/375`、`351/351`，两个卡片均 `309/309`；恢复默认视口后 `999/999`，本批没有新增 warning/error。
- 最终门禁为限定 5 文件 72 项、API 全量 134 文件 732 项、API/PC 构建（PC 1946 模块）、完整 seed、真实 API 专项、117 项权限目录、完整 `npm run preflight`、178 个实际 migration 全部执行、API/MySQL healthy 和 `git diff --check` 全部通过；本批无 migration。最大历史序号 179 是因序号 172 空缺；预检仅保留正式短信凭证既有提醒，报告见 `docs/review-permission-acceptance-20260718.md`。

## 2026-07-18 20:02 - 11.01.37 用户标签/动态分群权限、隐私和快照闭环

- 将单一 `tag.manage` 拆为 `tag.view/manage/sensitive`；维护和敏感分别只继承查看且互不包含。API、PC 权限目录、路由、菜单、默认运营角色和 seed 已同步，权限目录由 117 项增至 119 项。
- 新增 `GET /admin/tags/options`，返回当前商家和岗位 `activity_ids` 范围内的最小活动对象与启用会员等级；标签列表升级为 page/pageSize 分页，每页最多 100 条。PC 增加真实活动筛选和会员等级规则选择。
- 原标签、分群预览和快照成员通过 eager relation/`leftJoinAndSelect` 返回完整用户实体，`sanitizeMemberDetail` 仍会泄露 openid、unionid、wechatAppId 和完整手机号。现改为显式字段选择与白名单 DTO，普通账号服务端固定脱敏并由 PC `maskPhone` 二次保护，敏感账号才可见完整手机号和快照创建人。
- 标签列表、单用户操作、批量会员标签、分群查询、快照成员和行为标签刷新统一应用岗位活动数据范围；范围外会员返回 404。删除标签改为严格租户归属，修复租户猜测平台 `tenant=null` 标签 ID 后可删除的越权。
- 标签名、颜色、备注、分群名称、说明和分页补边界校验；停用分群禁止创建快照。并发相同标签依赖唯一约束与重复键处理，仅一次实际创建，另一请求返回 `idempotent=true`；单条新增/删除和既有批量、分群、快照操作均有审计。
- 首轮真实专项发现专属活动 options 使用 `take(500)` 后，TypeORM 分页子查询需要排序字段 `activity.createdAt` 进入内部选择；已补内部排序列，返回 DTO 不暴露该字段，无需 migration。
- 保留账号 `showcase_staff_read/manager/security`，密码均为 `Qiwai123456`。最新专项 `.local-logs/tag-permission-1784375223235/result.json` 保留会员 `#121`、标签 `#182`、分群 `#3`、快照 `#3`、平台边界标签 `#185`、平台边界分群 `#4`，审计 `#10079/#10081/#10082/#10083`。
- 应用内浏览器确认只读账号无写按钮且标签/快照手机号均脱敏，维护账号可写但仍脱敏，敏感账号显示完整手机号但无写操作；标签 `#182` 删除确认取消后仍存在且按钮恢复。390×844 首轮页面 `351/384`、卡片 `309/363`，整改后文档/页面 `375/375`、`351/351`，两张卡片 `309/309`、筛选区 `277/277`；默认视口恢复 `999/999`。
- 最终门禁为限定 4 文件 75 项、API 全量 135 文件 737 项、API/PC 构建（PC 1946 模块）、完整 seed、真实 API 专项、119 项权限目录、完整 `npm run preflight`、API/MySQL healthy 和 `git diff --check` 全部通过；本批无 migration。仓库实际 178 个 migration 文件全部 `[X]`，最大历史序号 179 是因序号 172 空缺。预检仅保留正式短信凭证既有提醒，报告见 `docs/tag-segment-permission-acceptance-20260718.md`。

## 2026-07-18 20:45 - 11.01.38 通知中心权限、隐私和发送治理闭环

- 将通知中心拆为 `notification.view/template.manage/send/preference.manage/sensitive` 五类能力；模板、发送、偏好和敏感分别继承查看，兼容 `notification.manage` 组合查看、模板、发送和偏好但不包含敏感。API、PC 路由、菜单、权限目录和演示 seed 已同步，权限目录由 119 项增至 124 项。
- 新增 `GET /admin/notifications/options`，最小通知账号无需活动或标签模块权限即可获得当前商家及岗位范围内的活动和标签选项。通知记录和偏好升级为 page/pageSize 分页，补状态、渠道、模板、规则、标题、正文和分页边界校验。
- 通知模板、规则、偏好、通知记录和会员响应统一使用白名单 DTO；普通账号服务端脱敏手机号与签到码，标题/正文中的 11 位手机号也会替换，服务商消息号和错误详情固定隐藏。`notification.sensitive` 可查看完整变量、手机号、服务商消息号和失败详情，但不能写。
- 修复三个真实缺陷：活动提醒路由被通用活动规则提前匹配为 `activity.manage`；租户新建模板把空实体当跨商家对象返回 404；无活动失败通知发布业务任务时只取活动租户，错误落入平台任务域。现分别改为 `notification.send`、仅更新时执行模板归属断言、优先使用通知自身租户并在任务处理时复核租户。
- 通知创建前对目标会员加事务 `pessimistic_write` 锁，在同一事务内完成偏好、频控和发送记录写入，真实 6 次发送为 5 次 sent、第 6 次 suppressed/rate-limit。后台重试与异步补偿都只从 failed 抢占，并增加短冷却窗口；同一失败通知并发重试仅一次受理，结果 `201/400`。
- 保留账号 `showcase_business_job_readonly`、`showcase_staff_read/manager/security` 和 `qiwai_hz_admin`，密码均为 `Qiwai123456`。最新专项 `.local-logs/notification-permission-1784378065761/result.json` 保留商家 `#23`、活动 `#186`、会员 `#31069/#31070/#31071`、模板 `#15`、通知 `#334/#335/#342`、杭州边界会员/模板/规则/通知 `#31072/#16/#11/#343`，审计 `#10373/#10374/#10375/#10385/#10388`。
- 应用内浏览器确认只读账号无写按钮且手机号脱敏；维护账号可模板、发送、偏好和重试但敏感信息仍隐藏；敏感账号显示完整手机号、消息号和失败详情但无写操作。重试确认取消后次数不变。390×844 下文档 `375/375`、页面 `351/351`、三个表格容器 `277/277`，控制台 error 为 0；证据在 `.local-logs/notification-permission-1784378065761/browser/`。
- 最终门禁为限定 5 文件 76 项、API 全量 136 文件 744 项、API/PC 构建（PC 1946 模块）、完整杭州和线上展示 seed、真实 API 专项、124 项权限目录、完整 `npm run preflight`、178 个实际 migration 全部执行、API/MySQL healthy 和 `git diff --check` 全部通过；本批无 migration。预检仅保留正式短信/微信/SMTP 凭证提醒，本地 webroot 发布还需正式制品注入 API `BUILD_COMMIT`。报告见 `docs/notification-permission-acceptance-20260718.md`。

## 2026-07-18 21:25 - 11.01.39 公告中心权限、租户边界和并发治理闭环

- 将公告中心拆为 `announcement.view/manage`，维护只继承查看；GET 与写接口、PC 路由、平台/商家菜单、权限目录、默认角色和线上展示 seed 已同步，权限目录由 124 项增至 125 项。只读账号可独立进入页面，不再借用商家或会员模块权限。
- 新增 `GET /admin/announcements/options`，返回当前范围内最小商家、启用会员等级和公告类型；列表升级为 keyword/type/enabled/tenantId/page/pageSize 分页。原列表完整租户实体直出，现只返回 `tenant.id/code/name/enabled`。
- 标题 120、内容 50000、日期 40、pageSize 1-100 和类型枚举补 DTO 边界；类型兼容 `notice/guide/activity/operation`。会员等级受众必须至少一个启用等级，不存在或停用 ID 返回 400。
- 公告更新、启停、置顶和删除在事务内执行 `pessimistic_write`，锁后复核租户、套餐写状态、日期和受众。更新审计记录前后快照，正文仅记录长度和 SHA-256；并发更新 `200/200`，更新/删除竞争 `404/200`。
- 清理 AdminModule/V1Module 同路径旧公告 GET/POST/PATCH 及死写方法，避免未来路由顺序变化绕过分页、受众校验、审计和事务锁；公开公告的时间、租户和受众过滤保持原有契约。全量测试曾因旧契约使用已删除方法作为字符串切片锚点失败，修正为公共投影自身边界后 137 文件 751 项全部通过。
- 保留账号 `showcase_staff_read/manager`，密码 `Qiwai123456`。真实专项 `.local-logs/announcement-permission-1784380017014/result.json` 保留商家 `#23`、等级 `#1`、公告 `#48`、其他商家公告 `#50`，审计 `#10578/#10580/#10582`；跨商家更新、删除均 404。
- 应用内浏览器确认只读账号无新增/编辑按钮，维护账号有完整写入口且没有 `upload.image` 时正确隐藏上传按钮；公告 `#48` 删除确认取消后仍存在。默认视口 `1014/1014`，390×844 下页面 `375/375`、表格仅容器受控滚动、编辑抽屉 `390/390`，控制台 error 为 0。
- 最终门禁为限定 4 文件 80 项、API 全量 137 文件 751 项、API/PC 构建（PC 1946 模块）、完整线上展示 seed、真实 API 专项、125 项权限目录、完整 `npm run preflight`、178 个实际 migration 全部执行、最新 API/MySQL Docker healthy 和 `git diff --check` 通过；最新镜像只读查询专项公告总数 1、ID `#48`。本批无 migration、无正式外部渠道依赖。报告见 `docs/announcement-permission-acceptance-20260718.md`。

## 2026-07-18 22:20 - 11.01.40 营销弹窗权限、投放校验和统计边界闭环

- 将营销弹窗拆为 `marketing_popup.view/manage`，维护自动继承查看；GET 列表、专属 options 和生效检测使用查看权限，POST/PATCH/DELETE 使用维护权限。PC 路由、平台/商家菜单、权限目录、默认角色和线上展示 seed 同步，权限目录由 125 项增至 126 项。
- 新增 `GET /admin/marketing-popups/options`，返回当前范围内最小商家、启用会员等级和类型/平台/页面/频次枚举。列表由固定 300 条后内存筛选改为 MySQL `JSON_CONTAINS` + page/pageSize，响应统一白名单并裁剪租户为 `id/code/name/enabled`。
- DTO 和服务层共同校验标题、副标题、正文、重点文案、图片、按钮、类型、平台、页面、频次、优先级、排期和受众；图片只允许 HTTPS 或 `/uploads/`，小程序拒绝普通外链，指定会员等级必须存在且启用，未知模式和非法值返回 400，不再静默修正。
- 更新和删除在事务内使用 `pessimistic_write`，锁后复核租户与套餐写状态；更新审计记录安全前后快照，正文只保存长度和 SHA-256。公共事件接口必须提交 `event/pageKey/platform`，服务端结合请求租户、可选登录会员、排期、投放平台/页面和受众后再在行锁事务内计数。
- 保留账号 `showcase_staff_read/manager`，密码 `Qiwai123456`。真实专项 `.local-logs/marketing-popup-permission-1784383277724/result.json` 保留商家 `#23`、等级 `#1`、弹窗 `#7/#8`、其他商家边界弹窗 `#10`，审计 `#10868/#10871/#10873`；正确曝光 `0->1`，错误页面和其他商家点击均被忽略，跨商家更新/删除 404，并发更新 `200/200`，更新/删除竞争 `404/200`。
- 应用内浏览器确认只读账号无写按钮但生效检测命中，维护账号有完整写和上传入口，删除取消无副作用，关键词筛选 `Total 1`。浏览器验收发现单按钮弹窗打开编辑时会自动补第二按钮，已修复并回归为 `查看详情/空`。390×844 下页面 `375<=390`，抽屉 `390/390`，控制台 error 为 0；证据在 `.local-logs/marketing-popup-permission-1784383277724/browser/`。
- 最终门禁为限定 6 文件 90 项、API 全量 138 文件 760 项、API/PC/H5/微信小程序构建（PC 1946 模块）、完整线上展示 seed、真实 API 专项、126 项权限目录、完整 `npm run preflight`、178 个实际 migration 全部执行、最新 API/MySQL Docker healthy 和 `git diff --check` 通过。本批无 migration，预检仅保留全项目正式短信、密钥、域名和对象存储上线前配置提醒。报告见 `docs/marketing-popup-permission-acceptance-20260718.md`。

## 2026-07-18 23:30 - 11.01.41 广告中心权限、隐私和资金并发治理闭环

- 将广告中心拆为 `ad_center.view/manage/finance/sensitive/export` 五类权限，API、PC 路由、平台/商家菜单、默认角色和线上展示 seed 已同步。运营具备完整权限；财务仅查看、结算和导出；维护账号可维护广告主/合同/投放并查看敏感资料，但不能操作结算；只读账号仅查看。
- 新增 `GET /admin/ad-center/options`，四类列表统一服务端分页，商家投影仅 `id/code/name/enabled`，options 只额外返回单个默认广告图。DTO 补齐分页、ID、长度、金额、枚举、图片附件、官方广告形式/类型/平台和会员等级受众校验；小程序自有广告拒绝普通 HTTPS 外链。
- 普通查看和财务账号的手机号、微信服务端脱敏，资质、附件和备注隐藏；敏感账号可查看完整资料并写 `ad.sensitive.view` 审计。无敏感权限维护普通字段时保留原敏感值，避免编辑时误清空。投放和结算由服务端 ExcelJS 导出，最多 10000 条并记录导出审计。
- 广告主、合同、投放更新/删除统一使用事务行锁。结算主单与明细同事务、合同锁、同周期防重和单向状态机；官方收益使用 MySQL `GET_LOCK` 并保持到事务提交。首轮真实并发曾暴露一致性快照在等待锁前建立，导致结算和收益均为 `201/201`；改为当前锁定读后稳定为 `201/400`，错误重复数据已纠正，回归证据 `.local-logs/ad-center-concurrency-regression-20260718.json`。
- 最新专项 `.local-logs/ad-center-permission-1784388183370/result.json` 保留商家 `#23`、广告主 `#7`、合同 `#10`、投放 `#13`、结算 `#8 / AD20260718152304BAD1A01A`、官方收益 `#5` 和跨商家广告主 `#8`；只读/财务手机号均为 `139****5678`，跨商家写 404，两类导出 200。
- 应用内浏览器确认只读账号无写和导出入口，维护账号有投放维护与完整敏感资料但无结算动作，财务账号有结算生成、导出和状态动作但无投放编辑。390×844 下页面无横向溢出、抽屉 `390/390`，控制台 error 为 0；证据在 `.local-logs/ad-center-permission-1784387253418/browser/`。
- 最终门禁为限定 5 文件 109 项、API 全量 139 文件 767 项、Shared/API/PC/H5/微信小程序构建（PC 1946 模块）、完整线上展示 seed、真实 API 专项、130 项权限目录、完整 `npm run preflight`、178 个实际 migration 全部执行、API/MySQL healthy、ready=true。预检仅保留正式短信及全项目生产密钥、域名、对象存储等上线前配置提醒。报告见 `docs/ad-center-permission-acceptance-20260718.md`。

## 2026-07-19 00:45 - 11.01.42 收款账户权限、隐私、密钥保留和并发治理闭环

- 将收款账户拆为 `payment_account.view/manage/sensitive`；维护和敏感分别只继承查看且互不包含。API、PC 权限目录、路由、菜单、默认角色和线上展示 seed 已同步，权限目录由 130 项增至 131 项。
- 新增 `GET /admin/payment-accounts/options`，代理和账户列表升级为服务端分页，支持关键词、渠道、启停、商家和代理筛选；tenant、agent、parentAgent 全部改为白名单投影，PC 不再依赖 `/admin/tenants`。
- 普通查看和维护账号的手机号、商户号服务端脱敏；只读账号只获取 `configKeys/configuredKeyCount`。敏感只读账号可看完整手机号、商户号和脱敏配置，但不能写。PC 代理列表补权限感知 `displayPhone` 二次保护，全局隐私门禁通过。
- 配置对象递归识别密钥和身份字段并返回 `***`；更新时递归保留星号对应原值，API V3 Key、openid、嵌套 apiKey 和 merchantNo 均不会被占位符覆盖。无敏感权限维护普通字段时保留原手机号和商户号。
- 禁止代理跨商家迁移，禁止账户更换代理或支付渠道；同代理同渠道启用账户使用 MySQL `GET_LOCK`、事务行锁和锁后重复检查。真实并发创建仅一次成功，结果 `201/400`。
- 首版生成列唯一索引 migration 因旧外键表重建不兼容而在事务中完整回滚；兼容版停用历史重复启用行并新增 `IDX_agent_payment_accounts_agent_provider`。迁移前备份 `backups/mysql/activity_registration-20260718-235649.sql.gz`，migration `1783860000000-AgentPaymentAccountGovernance` 已真实执行，数据未丢失。
- 最新专项 `.local-logs/payment-account-permission-1784392467631/result.json` 保留商家 `#23`、代理 `#47/#48/#49`、账户 `#15/#16`；只读手机号/商户号 `139****5678/MCH4****7631`，敏感账号显示完整值，密钥保留全部为 true。
- 应用内浏览器完成只读、维护、敏感账号验收；390×844 下页面无横向溢出，编辑支付账户对话框 `390/390`，恢复桌面视口后 body `999/999`，控制台 error 0。证据在 `.local-logs/payment-account-permission-1784391097414/browser/`。
- 完整 preflight 首轮发现代理列表直接渲染手机号，第二轮发现旧结算就绪度提示文案缺失，均已整改并重建。最终门禁为限定 6 文件 150 项、API 全量 140 文件 776 项、Shared/API/PC/H5/微信小程序构建（PC 1946 模块）、完整展示 seed、真实 API 专项、131 项权限目录、完整 `npm run preflight`、179 个实际 migration 全部 `[X]`、API/MySQL healthy、ready=true。报告见 `docs/payment-account-permission-acceptance-20260719.md`。

## 2026-07-19 01:40 - 11.01.43 代理结算六权、隐私投影和资金并发闭环

- 将代理结算拆为 `agent_settlement.view/manage/pay/transfer/sensitive/export` 六类能力；维护、打款、转账、敏感和导出分别只继承查看。API、PC 路由、菜单、权限目录、默认角色和线上展示 seed 已同步，权限目录由 131 项增至 132 项。
- 新增 `GET /admin/agent-settlements/options`；列表改为服务端分页，支持关键词、状态、代理、商家和周期筛选，响应包含 items、total、page、pageSize 和 summary。导出改用独立最多 10000 条查询，不再受页面分页限制。
- 结算、转账、支付流水、退款、操作审计、代理、商家和收款账户统一使用白名单 DTO；普通账号脱敏打款人、流水号和商户号，隐藏凭证、备注、服务商回执及失败原因。敏感账号可查看完整回执但仍不能获得内部 payload、账户配置、租户 settings 或完整订单。
- 自动转账响应通过 `publicAgentSettlementTransferResult` 投影，未成功和成功分支分别返回 `markedPaid=false/true`。旧预检仍匹配重构前对象字面量，现已升级为验证公共投影函数和两条调用分支，单独 guard 与完整 preflight 均通过。
- 同代理周期结算生成使用 MySQL `GET_LOCK`、事务和代理/结算行锁；提交、审核、拒绝和登记打款使用同结算命名锁及事务锁；回执扫描使用全局命名锁。手工打款必须提供流水号或凭证，审核通过和拒绝均要求非空意见。
- 最新真实专项 `.local-logs/agent-settlement-permission-1784396030124/result.json` 保留商家 `#23`、代理 `#52/#53`、结算 `#26/#27/#28/#29` 和转账 `#2`。只读流水号 `BANK****0124`、凭证 null；敏感流水号 `BANK-1784396030124`、服务商回执 `WX-1784396030124`；payload 泄露 false，跨商家详情 404，Excel 导出 200。
- 三组并发结果稳定为周期生成 `201/400`、审核通过/拒绝竞争 `201/400`、并发登记打款 `201/400`。敏感审计最新包含 `#12216/#12217`，全部专项数据保留。
- 应用内浏览器证据 `.local-logs/agent-settlement-permission-1784394708885/browser/result.json`：六个最小权限账号按钮边界全部通过，敏感账号显示完整回执和失败原因但无内部 payload；390x844 下页面与详情抽屉无横向溢出，恢复桌面后 body `999/999`，控制台 error 为 0。
- 最终门禁为限定 5 文件 139 项、API 全量 141 文件 784 项、Shared/API/PC/H5/微信小程序构建（PC 1946 模块）、完整线上展示 seed、真实 API 专项、132 项权限目录、完整 `npm run preflight`、179 个 migration 文件与数据库 179 条记录一致、API/MySQL healthy、ready=true 和 `git diff --check` 通过。本批无新增 migration；报告见 `docs/agent-settlement-permission-acceptance-20260719.md`。

## 2026-07-19 02:40 - 11.01.44 会员中心七权、身份隐私和积分并发治理闭环

- 将会员中心拆为 `member.view/manage/password/points.manage/lifecycle.manage/sensitive/export` 七类能力；维护、密码、积分、生命周期、敏感和导出分别只继承查看。API、PC 路由、菜单、权限目录、默认角色和线上展示 seed 已同步，权限目录由 132 项增至 136 项。
- 新增 `GET /admin/members/options` 和 `GET /admin/members/export`；列表完成服务端分页、排序、绑定状态、活跃时间、等级、标签和活动数据范围筛选。会员列表、详情及课程、商城、社区、钱包资产统一白名单投影，不再返回完整用户、payload、订单快照、地址和内部账户字段。
- 普通账号手机号服务端脱敏，OpenID、UnionID 和 AppID 返回 null；敏感账号显示完整身份并写 `member.sensitive.view` 审计。无敏感权限编辑资料不提交手机号；维护账号不能夹带初始密码；租户账号不能重置同时属于其他商家的全局用户密码。
- 积分调整必须提供稳定业务幂等键、原因和数值边界，使用会员/租户命名锁与事务；未知结果重试复用业务键。生命周期扫描使用租户级命名锁。最新真实并发两次同键请求为 `201/201`，一次真实执行、一次幂等返回，积分仅 `0->37` 且只有一条流水；两次生命周期扫描均安全返回，到期记录只处理一次。
- 最新专项 `.local-logs/member-permission-1784399142527/result.json` 保留商家 `#23`、会员 `#31074`、积分流水 `#780/#781`、跨租户会员 `#31072` 和审计 `#12439-#12449`；普通手机号 `138****2527`，敏感手机号 `13899142527`，XLSX 导出手机号仍脱敏。
- 应用内浏览器完成七个最小权限账号验收；390x844 下页面和详情抽屉 `390/390`、边界 `0/390`，999x900 下页面 `999/999`，控制台 error 0。完整 preflight 首轮发现三处手机号虽依赖后端脱敏但未经过统一前端隐私展示函数，已改为权限感知 `displayPhone()` + 公共 `maskPhone()` 并重建复验。证据位于 `.local-logs/member-permission-1784397988414/browser/` 和 `.local-logs/member-permission-1784399142527/browser/`。
- 最终门禁为限定 4 文件 116 项、API 全量 142 文件 793 项、Shared/API/PC/H5/微信小程序构建（PC 1946 模块）、完整线上展示 seed、真实 API 专项、136 项权限目录、完整 `npm run preflight`、179 个 migration 文件与数据库 179 条记录一致、API/MySQL healthy、ready=true 和 `git diff --check` 通过。本批无新增 migration；报告见 `docs/member-permission-acceptance-20260719.md`。
- 会员等级仍是全局模型，不能据此把会员 CRM 阶段整体标记完成；已建立 `11.01.45` 继续推进等级租户化、权益快照和升降级追溯。

## 2026-07-19 04:18 - 11.01.45 会员等级租户化、权益快照和升降级追溯闭环

- `member_levels` 已从全局共享模型升级为“平台模板 + 租户实例”，增加 `tenantScopeKey/templateLevelId/version`；45 个租户从平台模板生成 150 个等级实例。会员档案、活动最低/优先等级、课程所需等级、活动订单以及公告、营销弹窗和广告受众中的旧引用已按租户重写。
- 新增不可变 `member_level_changes` 历史表及三个数据库 trigger，自动记录等级前后值、成长值、权益快照、来源、原因和操作者；历史 UPDATE/DELETE 均由 `SQLSTATE 45000` 拒绝。后台新增 `POST /admin/members/:userId/level`，人工调整必须填写原因。
- 会员档案、活动订单和课程订单冻结等级权益快照；课程订单同时保存会员当时权益版本和课程当前所需等级版本。等级配置升级后旧会员保持旧版本，新会员使用新版本，历史交易不随配置变化。
- 自动升降级统一按 `tenantScopeKey` 选择等级；活动、课程、公告、营销弹窗和广告等级选择均严格复核租户。首轮真实专项发现人工降级后读取详情会立即被成长值自动升回，已通过 `manualLevelOverrideActive()` 统一修复，人工覆盖有效期内优先于自动重算。
- migration `1783870000000-MemberLevelTenantGovernance` 已在隔离数据库 `activity_registration_member_level_test` 从原始备份完成 `up/down/up`；精确表比较仅新增 150 个租户等级、413 条基线历史和 1 条 migration，六类资金汇总完全一致。证据位于 `.local-logs/member-level-migration-1784401923168/`，迁移前备份为 `backups/mysql/activity_registration-20260719-033731.sql.gz`。
- 主库已执行到 180 个 migration。最新审计显示 181 个等级、419 个有等级会员档案，快照缺失、等级 ID 错配、scope 错配、五类关系引用错配和三类受众错配均为 0；431 条历史和三个 trigger 均存在。
- 最新真实专项 `.local-logs/member-level-tenant-1784405452641/result.json` 保留商家 `#23/#1`、同名等级 `#180/#181`、会员 `#31079/#31080`、人工历史 `#529`、课程 `#19` 和课程订单 `#92 / CO17844054540610F6D71`。跨商家公告、课程和活动等级均返回 400，旧/新会员权益分别冻结 v1/v2，历史修改和删除均被拒绝。
- 应用内浏览器完成租户管理员会员等级版本、人工调整入口和历史追溯，以及平台管理员“平台模板/指定商家”切换；390x844 无横向溢出，控制台 error 0。证据和截图位于 `.local-logs/member-level-tenant-1784404292270/`。
- 最终门禁为 API 全量 143 文件 803 项、Shared/API/PC/H5/微信小程序构建（PC 1946 模块）、完整 `npm run preflight`、真实 API 专项、主库迁移审计、180 个 migration 全部 `[X]`、API/MySQL healthy、ready=true 和 `git diff --check` 通过。正式短信、支付、微信、对象存储、生产域名、HTTPS 和密钥仍按上线配置清单验收；报告见 `docs/member-level-tenant-acceptance-20260719.md`。
- 已建立 `11.01.46`，继续审计并开发会员积分规则租户化、业务事件幂等、批次过期和冲正追溯，不等待用户重复发出继续指令。

## 2026-07-19 06:15 - 11.01.46 会员积分规则租户化、批次过期和冲正追溯闭环

- 新增平台模板与租户实例 `member_point_rules`，支持固定积分、金额比例、成长值、有效天数和版本；租户更新不会修改平台模板，历史流水冻结规则快照。主库现有 184 条规则，其中平台模板 4 条，租户规则缺模板为 0。
- 积分账本增加 `requestedPoints/balanceBefore/balanceAfter/relatedLogId/batchKey/ruleSnapshot/metadata`，唯一键升级为租户作用域 + 用户 + 来源；会员档案增加 `pointDebt`。活动支付、核销、评价、商城支付及退款均按业务租户落账。
- 活动和商城拆分退款按累计退款比例计算净新增扣回，兼容商城历史订单 ID、退款 ID 和退款号三类来源。退款时积分不足形成欠额，不产生负余额；后续奖励先入账再自动生成 `points_debt_recovery` 偿还流水。
- 同会员写操作在数据库命名锁前增加进程内按键排队，修复十路并发占满连接池导致的池饥饿；真实十路并发仅生成一条积分流水，普通超额扣减返回 400。
- 批次消费按最早到期优先，生命周期扫描生成 `points_expiry_reconciliation` 校准流水并记录处理时间；同一批次重复扫描只生成一条校准流水。
- migration `1783880000000-MemberPointLedgerGovernance` 已在隔离库多轮 `revert/run`，主库升级前备份 `backups/mysql/activity_registration-20260719-053709.sql.gz`，SHA-256 `14325BA372F2D3002F26F6DAEDFECED8832BDDBEBC6225E5DAF8646E7391F203`。主库 181 条 migration 全部执行。
- 主库审计：历史退款修复 5 条、净 `-77`；活动/商城退款未关联 0，负余额 0，档案余额差异 0，评价跨租户错配 0，活动 54 个退款账户及商城 45 个退款账户累计扣回差异均为 0。
- 最新真实专项 `.local-logs/member-point-governance-1784411739630/result.json` 保留会员 `#31085-#31088`、退款订单 `#538`、退款 `#66/#67`、评价 `#10` 和到期校准流水 `#818`。两次拆分退款请求积分 `-1/-4`、实际变动 0，后续奖励 8 分自动偿还欠额 5 分，最终积分 3。
- 修复租户会员详情按业务来源白名单过滤积分流水的问题，现按可信 `userId + tenantScopeKey` 直接读取完整账本并加载关联原流水；真实 API 断言两条 `order_refund`、`points_debt_recovery` 和 `points_expiry_reconciliation` 全部可见。
- PC 积分表增加中文来源、来源编号和关联流水；390x844 首轮发现长昵称/长等级名卡片重叠以及积分表列压缩，现已改为卡片内换行和表内横向滚动。页面/抽屉保持 390px，表内滚动宽度 1220px，控制台 error 0；证据位于 `.local-logs/member-point-browser-1784411739630/`。
- API 全量测试首轮发现商城评价举报测试仍断言旧实体直返，当前实现实际使用安全投影幂等返回；更新门禁后 144 文件 812 项全部通过。Shared/API/PC/H5/微信小程序构建、PC 1946 模块、138 项权限目录、完整 `npm run preflight`、Docker healthy、ready=true 和 `git diff --check` 均通过。
- 报告见 `docs/member-point-governance-acceptance-20260719.md`。已建立 `11.01.47`，继续开发会员标签与动态分群权限、自动刷新、快照追溯和大人群治理，不等待用户重复发出继续指令。

## 2026-07-19 07:31 - 11.01.47 会员标签、动态分群、自动刷新和快照追溯闭环

- 标签、分群和快照增加非空 `tenantScopeKey`，修复平台 `tenantId=NULL` 唯一键失效、跨租户 ID 猜测及删除商家后标签转成平台数据的问题；标签和分群唯一键、作用域查询及最小索引已统一。
- 快照增加 `businessKey`，并发同业务键返回同一快照；成员在同一事务内计算并按 1000 条分块写入。快照主表和成员表增加四个数据库不可变 trigger，真实 UPDATE/DELETE 已被拒绝。
- 新增 `member_behavior_tag_runs` 刷新账本；行为标签刷新使用作用域命名锁、事务、批量增删、持久幂等和运行历史。BusinessJob 默认每小时调度平台和启用商家，本报告生成时 59 个刷新运行和 56 个自动任务全部 completed、失败 0。
- 分群 DTO 改为严格校验，覆盖最低/最高积分、成长值、消费、报名、核销、活跃、沉睡、来源、地区、等级和标签；拒绝未知字段、非法数值、冲突范围、超长数组和跨作用域等级。
- 标签 CRUD、分群预览、快照成员和通知统一按 `tenantScopeKey` 及岗位活动数据范围；敏感手机号使用统一有效权限，平台和商家同名标签通知各匹配正确的 1 人。移除通知 `.take(300)` 静默截断，超过 10000 人明确报错。
- PC 增加行为刷新运行批次及新增/删除/保留数量、快照业务键和最高积分/成长/消费/沉睡筛选；失败重试保留幂等键。移动端长分群名称改为内部横向工作表。
- 主库 migration `1783890000000` 已执行，升级前备份 `backups/mysql/activity_registration-20260719-064745.sql.gz`，SHA-256 `0128AB89201B20DFF4D78E7B734F3F6D5B9A1BD31E19D4680DF5E6652061E437`。当前标签 755、行为标签 705、作用域错配/标签重复/分群重复/快照业务键重复均为 0，快照声明/实际成员为 281/281。
- 最新真实专项 `.local-logs/tag-permission-1784415155724/result.json` 保留会员 `#31088`、标签 `#759/#762`、分群 `#7/#9`、快照 `#5` 和行为运行 `#30`；并发标签、快照、行为刷新均只执行一次，并发同名分群为 `201/400`，无 500。
- 浏览器证据位于 `.local-logs/member-point-browser-1784411739630/`，维护/只读/敏感三账号、桌面和 390x844 无页面溢出且控制台 error 0。最终四个上限筛选输入已进入 PC 构建，但本轮应用内 Browser 页面无法附着，截图补录项已在报告中如实记录。
- 最终门禁为 API 144 文件 819 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、138 项权限目录、完整 `npm run preflight`、182 条 migration、Docker API/MySQL healthy、ready=true 和 `git diff --check` 通过。报告见 `docs/member-segment-governance-acceptance-20260719.md`。
- 已建立 `11.01.48`，继续开发经营指标口径、会员留存复购、漏斗下钻、退款口径和统计重算一致性，不等待用户重复发出继续指令。

## 2026-07-19 07:54 - 11.01.48 第一批：日期、指标覆盖、重算和留存分母一致性

- 审计发现统计查询直接 `new Date(YYYY-MM-DD)` 按 UTC 零点解析，实时明细与北京时间日指标错开 8 小时；结束日期同时被当成排除边界，重算 `15-17` 实际查询只读取 `15-16`。现 DTO 严格要求 `YYYY-MM-DD`，服务端验证真实日历日期，按北京时间起止并包含所选结束日。
- 经营总览、趋势和渠道原先只要存在任意日指标就把整段查询标记为 `daily_metrics`，默认无日期查询也会误读历史局部重算。现仅在开始/结束日期齐全且存在 completed、差异 0、完整覆盖所选范围的运行批次时使用日指标；无边界、局部覆盖和岗位活动范围账号回退实时明细。
- 统计重算增加租户作用域命名锁，冲突请求立即返回；每个自然日预置浏览、分享、报名、支付、核销、评价、取消和退款 8 个根指标，零事件日期也形成完整覆盖。事务内先删除所选范围旧指标再 upsert 新指标，事件删除或归类变化后不会残留旧行。
- 统计一致性校验只比较支持的转化事件与根指标，不再被未知事件类型造成假差异；自动任务运行类型标记为 `scheduled`，人工任务保持 `manual`。
- 会员分析的活跃人数、重复参与、分类偏好补日期范围、有效报名状态和岗位活动数据范围；会员等级和新增会员同样按岗位可见会员收口。指标下钻、总览支付/退款和渠道实时明细补岗位活动范围。
- 付费复购排除完全退款订单；7/30 日留存增加成熟分母，未满 7/30 天的会员不再稀释留存率。PC 显示“留存人数 / 成熟人数”，增长 CSV 新增 7 日留存、30 日留存、重复参与和付费复购四类汇总行。
- 最新真实证据 `.local-logs/analytics-governance-1784418690851/result.json`：平台运行 `AR1784418690194C4084A`、商家 `#23` 运行 `AR178441869028082BEBD` 均 completed、差异 0；结束日根指标存在，完整范围使用日指标，无日期范围使用实时明细，非法日期和逆序日期均为 400，只读账号重算及三类导出均为 403。
- 主库审计：平台和 `tenant:23` 在 `2026-07-15` 至 `2026-07-17` 各有 24 个根指标、3 个日期、8 个指标键和 1 个运行批次；范围内旧运行批次残留均为 0。统计运行累计 157 completed、0 failed。
- 门禁为专项 4 文件 52 项、API 全量 145 文件 825 项、API/PC 构建、PC 1946 模块、完整 `npm run preflight`、Docker API/MySQL healthy、ready=true 和 `git diff --check` 通过。应用内 Browser 仍无法附着，浏览器补验继续保留在本工作包，不提前标记完成。
- 下一批继续实现真正 cohort 获取、活动/课程/商城/公益净收入与退款口径统一、业务明细分页下钻、维度对账和可追溯导出。

## 2026-07-19 08:35 - 11.01.48 第二批：cohort、经营净额、分页导出和三方对账闭环

- cohort 改为读取统计结束日前的完整历史有效报名，并按用户首次参与是否落在统计区间选择 cohort；不再把统计期内再次参与的老会员当新用户。超过 100000 条来源明细明确报错，聚合改为单次用户遍历。
- 活动、课程、商城统一 `grossAmountFen/refundAmountFen/amountFen`。活动总览从支付流水改为与明细同源的活动订单和退款单，收款按 `paidAt`、退款按 `completedAt`；完全退款订单保留毛额并由退款扣减。
- 真实验收发现活动 `#105` 在统计期有 2 分跨期退款、原支付不在本期，逐维度 `Math.max(0, gross-refund)` 会吞掉退款并造成总览/明细差 2 分。净额现统一为有符号 `gross-refund`，允许负净额，平台汇总与全部维度严格一致。
- 经营明细返回 `{items,total,page,pageSize}`，PC 弹窗增加服务端分页，模块卡片、店铺表和明细表展示毛额、退款和净额。导出按 500 条分批读取直到达到 total，数量不一致明确失败；店铺排行移除 500 家静默截断。
- 最新真实专项 `.local-logs/analytics-governance-1784420689045/result.json` 保留平台运行 `AR1784420687985EF8C2`、商家运行 `AR178442068806590A08F`，379 个源事件、95 个指标行、差异 0。活动 191、课程 18、商城 108、公益 22 条明细，第一页/第二页 ID 不重叠，CSV 行数等于 total。
- 数据库直接对账：平台活动 `269102/100387/168715`、课程 `627900/89700/538200`、商城 `686965/80195/606770`，商家 `#23` 活动 `265502/100387/165115`（毛额/退款/净额分），均与总览和全部分页明细一致；商家 45 个活动跨租户错配 0，165 个统计运行全部 completed。
- 最终门禁为分析专项 4 文件 55 项、API 全量 145 文件 829 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、完整 `npm run preflight`、183 个 migration 全部 `[X]`、Docker API/MySQL healthy、ready=true 和 `git diff --check` 通过。
- 应用内 Browser 可发现实例，但新标签无法附着到当前任务会话；按工具要求未切换其他后端，经营分析桌面和 390x844 新截图保留为待补录项。报告见 `docs/analytics-business-governance-acceptance-20260719.md`。
- 已建立 `11.01.49`，继续开发活动漏斗票种/渠道/城市拆分、事件去重和复盘历史版本闭环，不等待用户重复发出继续指令。

## 2026-07-19 09:05 - 11.01.49 第一批：转化事件唯一账本、历史回填和并发去重

- 审计发现主库有 10543 条报名、505 个成功或退款后订单、130 个有效核销、16 次分享、10 条评价和 57 个完成退款，但 `conversion_events` 只有 595 条，报名仅 406、支付仅 4，分享/评价/取消/退款全部缺失；统计重算因此只处理 379 个范围事件。
- 新增 migration `1783900000000-ConversionEventGovernance`：先清理重复幂等键，再增加 `UQ_conversion_events_idempotency_key` 唯一索引；按报名、支付、有效核销、评价、分享、取消、完成退款和缺失浏览回填历史事件。撤销核销对应事件在 migration 和实时撤销流程中均删除。
- 公共报名取消、后台报名取消、活动评价、分享访问和退款完成补实时转化事件；浏览事件日键由 UTC 日期改为北京时间日期。公共、后台、V1 和退款服务统一使用 `INSERT IGNORE`，并关闭 TypeORM 的实体回写，重复请求不再抛出“entity id 未设置”500。
- migration 前备份 `backups/mysql/activity_registration-20260719-084432.sql.gz`，大小 1.74 MB。隔离库 `activity_registration_conversion_event_test` 完成 `up/down/up`；回填后 11411 个事件和幂等键全部唯一，撤销核销残留 0，订单/退款/钱包/商城金额分汇总与主库备份完全一致。
- 首轮真实 20 路并发中数据库只写 1 条但 19 请求返回 500，定位为 TypeORM `orIgnore()` 仍尝试回写被忽略实体；增加 `.updateEntity(false)` 后二轮 20/20 全部 200，事件 1 条、浏览日志 1 条。
- 最新专项 `.local-logs/conversion-event-governance-1784422960330/result.json` 保留活动 `#191`、测试 IP `203.0.113.82` 和幂等键 `view:191:203.0.113.82:2026-07-19:none`；主库现有 11414 个事件，八类齐全，11414 个幂等键全部唯一。
- 历史回填后重新执行经营分析专项 `.local-logs/analytics-governance-1784422321205/result.json`，统计范围源事件从 379 增至 10723、指标行从 95 增至 155，差异仍为 0，经营金额与租户边界结论不变。
- 最终门禁为 API 全量 146 文件 831 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、完整 `npm run preflight`、最新 migration 全部 `[X]`、Docker API/MySQL healthy、ready=true 和 `git diff --check` 通过。
- `11.01.49` 继续开发中；下一批实现票种/渠道/城市拆分、漏斗总览与明细对账，再进入复盘历史版本、图片、问题和权限化导出。

## 2026-07-19 10:18 - 11.01.49 第二批：票种渠道城市归因与复盘不可变版本闭环

- 活动增加明确省、市、区，报名冻结来源、渠道、行政区和捕获时间，转化事件冻结票种、渠道及城市快照；支付、核销、评价、取消和退款沿用报名归因，免费订单及候补补位补齐实时报名/支付事件。
- 单活动漏斗统一从 `conversion_events` 账本计算，返回票种、渠道和城市拆分；每类均覆盖浏览、分享访问、报名、支付、审核通过、核销、评价、取消、退款、毛额、退款额和有符号净额，并返回逐项对账结果。无可靠行政区的历史数据归为“未知”，不使用租户区域代替活动城市。
- 新增不可变 `activity_recap_versions`，保存完整指标快照、总结、问题、行动项、图片和创建人；事务与唯一约束保证并发版本号连续唯一，数据库 trigger 拒绝 UPDATE/DELETE。实时复盘和指定历史版本均可查看，指定版本 Excel 包含概览、票种、渠道、城市、邀请榜、评价和复盘内容。
- 漏斗/复盘查看、版本创建、导出分别收口到 `analytics.view/manage/export`；新增分析专用活动 options，分析账号无需活动管理权限。PC 支持实时/历史切换、版本创建、内容查看和权限化导出，活动表单可维护省市区。
- migration `1783910000000-ActivityFunnelAttribution` 和 `1783920000000-ActivityRecapVersions` 已在隔离库 `activity_registration_funnel_recap_test` 完成 `up/down/up`，升级前备份为 `backups/mysql/activity_registration-20260719-093034.sql.gz`；主库最新 migration 均为 `[X]`。
- 主库审计显示 10543 条报名归因缺失 0、11416 条转化事件幂等键重复 0、报名与下游事件归因差异 0；活动订单总额 1498602 分、退款总额 224045 分，迁移前后保持一致。
- 最新真实专项 `.local-logs/activity-funnel-recap-1784425891715/result.json` 保留活动 `#149`，10200 条报名，票种/渠道/城市拆分 `1/4/2` 行；所有阶段和金额对账为 true，并发创建 `v1/v2`，历史浏览量保持 1、实时增长到 2，指定版本 Excel 为 12719 bytes。浏览器另创建 `v3`。
- 应用内浏览器完成管理、导出、只读三账号验收；桌面和 390x844 无页面横向溢出，移动复盘工具栏分行后标题不再竖排，控制台 warning/error 为 0。截图位于 `.local-logs/activity-funnel-recap-1784425891715/`。下载事件未被 Browser 捕获，但真实 API 已确认 XLSX 200、类型正确且文件非空。
- 最终门禁为专项 4 文件 59 项、API 全量 147 文件 836 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、完整 `npm run preflight`、Docker API/MySQL healthy、ready=true、blocking 0 和 `git diff --check` 通过。报告见 `docs/activity-funnel-recap-governance-acceptance-20260719.md`。
- `11.01.49` 已完成本批；继续从全功能分析报告和计划表审计下一个真实未完成工作包，不等待用户重复发出继续指令。

## 2026-07-19 10:31 - 11.01.50 第一批：课程收益整数分口径与财务权限回归

- 对照全功能计划“讲师数据范围、课程收益统计和内容资源鉴权”，确认资源鉴权已完成，但课程总览仅有订单数量，缺少课程毛额、退款和净额；讲师账号绑定及本人课程范围仍未形成闭环，因此建立 `11.01.50` 持续推进。
- `coursesOverview` 新增严格作用域内课程毛额、完成退款和有符号净额。毛额纳入 `paid/partially_refunded/refunded` 课程订单，退款仅纳入 `completed` 课程退款，净额统一为毛额减退款，不对跨期负净额截零。
- 新增 `scopedCourseRefundQuery`，与课程、课程订单查询共同执行当前商家和平台指定商家过滤；租户账号不能通过 query 参数切换其他商家。
- PC 课程总览增加“课程毛额、已退金额、课程净额”三张指标卡，桌面改为三列稳定网格，1100 以下保持两列，不按视口缩放字体。
- 课程退款路由合同补齐 GET、审核和结果确认三条断言，固定映射到 `order.refund`，防止以后被 `course-* -> course.manage` 通配规则覆盖。真实 `showcase_finance / Qiwai123456` 请求 `/admin/course-refunds` 返回 200，共 3 条已完成退款。
- Docker API 重建后，商家 `#23` 课程总览真实返回：17 门已发布、78 张课程订单、1 张待确认收款、毛额 897000 分、完成退款 89700 分、净额 807300 分；MySQL 直接查询为 `897000/89700`，与 API 一致。
- 应用内浏览器使用 `showcase_ops / Qiwai123456` 验收 `/admin/courses`：桌面显示 `¥8970.00 / ¥897.00 / ¥8073.00`；390 宽度九张指标卡为两列，body 与 viewport 同宽，无横向溢出，控制台 warning/error 为 0，未修改业务数据。
- 最终门禁为课程范围与权限专项 2 文件 35 项、API 全量 147 文件 837 项、API/PC 构建、PC 1946 模块、Docker API 重建、ready=true、完整 `npm run preflight` 和差异检查通过。
- 下一批继续实现讲师档案与后台账号一对一绑定、讲师只能访问本人课程及关联订单/考核/评价/答疑/公告/资源日志、课程级收益与完课下钻和权限化导出。

## 2026-07-19 11:16 - 11.01.50 第二批：讲师账号本人课程范围与课程选项权限闭环

- `course_teachers` 增加后台账号一对一绑定，migration `1783930000000-CourseTeacherAdminScope` 已完成隔离库 `up/down/up` 和主库升级；升级前备份为 `backups/mysql/activity_registration-20260719-103637.sql.gz`，当前 186 个实际 migration 全部 `[X]`。
- 新增 `course.teacher_scope`、`course_order.view`、`course_order.manage`，并保持 `order.view/manage` 对课程订单的兼容继承；讲师角色不授予通用 `order.view`、`member.view` 或确认课程收款权限。
- 服务端在集合 SQL 和详情/写接口双重执行绑定讲师范围。课程、章节、课时、上传资源、资源日志、考核、成绩、订单、退款、评价、答疑、公告、证书和学习提醒均只能访问本人课程；未绑定或停用讲师档案不回退为全商家权限。
- 讲师档案和 API 投影只返回安全后台账号字段，不返回 `passwordHash/sessionVersion`；同一后台账号并发绑定由唯一索引和业务错误共同保护，讲师不能新增、删除或改绑其他讲师档案。
- 修复 PC 课程页把通用 `/admin/member-levels` 放入主 `Promise.all` 导致讲师整页 403 的问题。新增 `/admin/course-member-level-options`，路由明确映射 `course.manage`，按当前课程商家作用域返回最小 `{id,name,sortOrder,tenantId}`，平台未指定商家时可加载全部作用域供课程编辑器切换。
- 专项 `scripts/course-teacher-scope-acceptance.mjs` 最新结果为 `.local-logs/course-teacher-scope-1784430351949/result.json`：保留账号 `showcase_course_teacher / Qiwai123456`（后台账号 `#267`）、讲师 `#1`、课程 `#3`；仅可见课程 `#3`、41 张课程订单和 8 条本商家等级选项。跨讲师详情/更新为 404，通用订单、通用会员等级和确认课程收款均为 403，安全投影通过。
- 应用内浏览器完成桌面和 390x844 验收：菜单只有“扩展 · 专题共修 / 课程管理”，页面正常显示 1 门课程和 41 张订单；无确认收款按钮；“讲师资料”弹窗只有本人档案，无新增/删除；390px 页面 `scrollWidth <= viewportWidth`，控制台 warning/error 0。截图保存在同一专项目录。
- 最终门禁为专项 2 文件 38 项、API 全量 147 文件 840 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、完整 `npm run preflight`、Docker API/MySQL healthy、`ready=true`、`blockingCount=0` 和 `git diff --check` 通过。开发环境仍有 15 项上线前密钥/域名/安全配置 warning 和 5 项可选通道 warning，不阻塞本地验收。
- 报告见 `docs/course-teacher-scope-acceptance-20260719.md`。`11.01.50` 继续开发课程级收益、学员、完课下钻和权限化导出，不等待用户重复发出继续指令。

## 2026-07-20 10:10 - 11.01.50 第三批：课程经营学员下钻与独立导出权限闭环

- 新增课程经营汇总、学员分页和经营导出接口，统一返回整数分订单毛额、完成退款和有符号净额，并覆盖学员学习状态、平均进度、完课率、证书、订单和退款。学员支持关键词、状态、排序和分页，超过 10000 人明确拒绝导出。
- Excel 包含“课程汇总”和“学员明细”两个工作表。新增 `course.export` 独立权限，普通 `course.manage` 不自动继承导出；`course.teacher_scope` 仅在本人课程范围内获得课程导出和课程订单查看，不获得通用订单或会员权限。经营导出与考核成绩导出统一由 `course.export` 控制。
- 真实专项 `.local-logs/course-insights-1784432609868/result.json`：课程 `#8` 有效支付订单 22、完成退款 1、学员 21，毛额/退款/净额 `657800/29900/627900` 分，与 MySQL 直接查询完全一致；Excel 9893 bytes、21 行学员明细。讲师课程 `#3` 有 42 位学员，讲师跨课程汇总、学员和导出均为 404，本人课程 Excel 11657 bytes。
- 保留 `showcase_course_export / Qiwai123456`（账号 `#268`）和 `showcase_course_no_export / Qiwai123456`（账号 `#269`）。无导出账号经营和考核导出均为 403；浏览器确认课程数据可查看但两个导出按钮均不存在。讲师和无导出账号均完成桌面及 390x844 验收，无页面级横向溢出，控制台 warning/error 0。
- 完整 preflight 首轮发现课程弹窗直接渲染服务端已脱敏 `phone` 字段，PC 改为统一 `maskPhone` 再次脱敏，隐私门禁随后通过。最终 API 全量 147 文件 842 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、完整 preflight、187 个 migration 全部 `[X]`、Docker API/MySQL healthy、`ready=true`、`blockingCount=0` 和 `git diff --check` 通过。
- `11.01.50` 已完成本批，报告和截图见 `docs/course-teacher-scope-acceptance-20260719.md` 与 `.local-logs/course-insights-1784432609868/`。继续审计全功能分析报告中的下一个真实未完成工作包，不等待用户重复发出继续指令。

## 2026-07-20 11:20 - 11.01.51：统一订单详情导出、岗位范围与隐私闭环

- 新增活动、课程、商城统一订单详情与统一 Excel；三业务查看权限独立判定，导出要求 `order.export`，活动岗位范围、商城店铺授权和租户范围在列表、详情、导出一致执行。
- 统一响应改为白名单投影，用户手机号服务端脱敏，业务快照递归移除密码、微信身份、渠道原始报文、地址、收件人和联系方式；PC 详情金额构成改为中文业务标签。
- 浏览器发现最小权限账号默认订单页 500，数据库错误为 `Unknown column 'order.orderId'`。公共活动数据范围现区分主订单 `order.id` 与退款/支付/账单/回调的 `alias.orderId`，精确 SQL 合同已补；修复后默认入口显示指定活动 200 张订单。
- 统一订单此前只有路由没有菜单，现补平台和租户“统一订单中心”菜单，并纳入平台商家切换范围同步。最小账号可从菜单进入，总计 278 张（指定活动 200 + 课程 78），无导出和资金流水；跨活动详情 404、商城和导出 403。
- 财务账号可见活动、课程、商城共 671 张订单；三类详情与 MySQL 一致。课程 Excel 78 行、13243 bytes；商城样例 `#961 / MO17842316539097F718F` 为 5900 分，含支付、退款和商品明细。
- 财务和最小账号完成桌面与 390x844 浏览器验收，抽屉稳定宽度 374.39px，无页面级横向溢出、原始手机号或控制台 warning/error。截图位于 `.local-logs/unified-order-governance-1784515137114/`，最新真实专项位于 `.local-logs/unified-order-governance-1784517096415/result.json`。
- 最终门禁为专项 4 文件 66 项、API 全量 148 文件 846 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、完整 preflight、187 个 migration 全部 `[X]`、Docker API/MySQL healthy、`ready=true`、`blockingCount=0` 和 `git diff --check` 通过。
- `03.01` 已完成；下一工作包进入 `03.02` 支付中心多端场景、查关单、真实适配层回调和业务任务补偿闭环，外部密钥不可用的终验项继续记录但不阻塞本地开发。

## 2026-07-20 12:15 - 11.01.52：课程余额支付、来源退款与统一资金口径闭环

- 课程结算页改为读取租户 `/public/settings/operation` 支付开关，按实际配置展示微信、支付宝、余额和线下方式；新增 `POST /public/course-orders/:id/pay/balance`，订单与钱包使用悲观锁，`course_balance_pay:{orderId}` 保证并发幂等，赠送金优先、现金后扣。
- 课程 mock、微信/支付宝回调、主动查单和余额支付统一写入 `payment_transactions`，使用 `businessType=course`、业务订单号和价格快照；统一资金中心新增课程支付与课程退款来源，课程详情能关联支付及退款。
- 课程余额退款使用 `course_refund:{refundId}` 幂等键，根据原支付流水计算赠送金使用量，分次退款先恢复剩余赠送金、再恢复现金；修正曾误用 `tenant:23` 会员等级键的问题，钱包统一使用 `23` 商家键。
- 真实验收发现并修复钱包幂等查询因 eager 关系生成超过 MySQL 61 表 JOIN、平台超级管理员因拥有全部权限被错误限制到本人讲师课程，以及渠道账单导入重复创建成功支付流水三项缺陷。12 条历史账单复制流水通过 migration `1783950000000` 重分类为 `statement_matched`，不删除审计记录。
- migration `1783940000000` 为历史已支付课程订单补统一支付流水；两条 migration 均已在主库执行。失败验收产生的退款错钱包通过 `course_refund_repair:5:debit/credit` 双向补偿流水修复，钱包哈希链由数据库触发器续接，错误租户键非零钱包数量为 0。
- 真实专项 `.local-logs/course-balance-payment-1784520155100/result.json` 保留会员 `13780155100 / Qiwai123456`、跨用户账号 `13680155101 / Qiwai123456`、课程 `#5`、订单 `#98 / CO17845201556990248CF` 和退款 `#10/#11`。6 个并发余额支付请求仅一次实际扣款；10000 分退款恢复赠送金，后续 19900 分退款恢复剩余赠送金和现金，钱包最终回到现金 10000 分、赠送金 25000 分；跨用户、跨租户均 404。
- 应用内浏览器在 390x844 完成 H5 密码登录、租户支付方式、余额选择和支付成功验收，新增保留订单 `#99 / CO1784520428682F1EFA7`；页面无横向溢出、控制台 warning/error 为 0。PC 统一资金中心可检索对应 29900 分课程支付，手机号显示 `137****5100`，截图位于同一证据目录。
- 最终门禁为 API 149 文件 853 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、完整 preflight、全部 migration `[X]`、Docker API/MySQL healthy、`ready=true`、`blockingCount=0`、统一资金 `healthy=true`、活动重复成功支付订单 0 和差异检查通过。
- `03.02` 本地和沙箱范围已完成；正式微信/支付宝证书密钥、小程序真机支付和真实回调仍按生产挡板记录为外部终验项。下一工作包继续 `03.03/03.04` 正式退款补偿与多端钱包最终归档，不等待用户重复发出继续指令。

## 2026-07-20 12:50 - 11.01.53：钱包四资金桶、冻结赠送金与全链路幂等闭环

- 后台钱包冻结/解冻新增 `cash/gift/mixed` 资金来源；混合模式赠送金优先。可用现金、冻结现金、可用赠送金和冻结赠送金在同一钱包悲观锁事务内以整数分原子流转，四类余额均禁止为负。
- 钱包流水新增 `frozenGiftBefore/frozenGiftAfter`，共享哈希 canonical、资金一致性扫描和 MySQL 触发器升级为四桶快照。migration `1783960000000-WalletFrozenGiftLedger` 全量重算历史链；旧 migration `1783300000000` 固化旧算法，保证空库重放时旧触发器和旧哈希一致。
- 后台幂等查询关闭 eager 全图并校验用户、租户、类型、方向和金额；钱包锁后使用 `pessimistic_read` 当前读再次检查，解决 MySQL `REPEATABLE READ` 下同键并发第二请求看不到首笔提交的问题。首次钱包创建改为唯一约束配合 `INSERT IGNORE`。
- 所有活动、课程、商城余额支付及退款流水补冻结赠送金快照；商城普通和跨店余额支付把现金/赠送金分摊冻结到订单 `walletFunding` 快照，部分退款与拼团失败退款按原来源恢复。
- PC 会员详情显示四桶和冻结赠送金流水；H5 钱包增加赠送金、冻结赠送金及流水快照，冻结/解冻内部转移不再误计本页收入和支出。
- 首轮 PC 浏览器发现会员全景直接 `walletTransactions.find()` 触发 eager 订单全图，MySQL 超过 61 表 JOIN；平台和租户分支现统一使用轻量 `visibleWalletTransactionsForUser()`，浏览器复验稳定打开。
- migration 前备份 `backups/mysql/activity_registration-20260720-122811.sql.gz`（1.90 MB），主库完成 `up/down/up`，当前 189 条 migration 全部 `[X]`、两个新列存在。
- 真实专项 `.local-logs/wallet-frozen-gift-1784522268354/result.json` 保留会员 `13572268354 / Qiwai123456`（user `#31108`）：同键并发一次执行/一次重放，两个不同键并发冻结 300 元仅一笔成功，语义冲突返回 409，8 条流水逐条哈希通过，跨租户四桶为 0。
- 首次失败验收会员 `#31107 / 13572177425` 只成功冻结一次，已通过补偿流水 `#479 / wallet-failed-acceptance-31107-compensation` 恢复现金 100 元、赠送金 250 元、冻结为 0；失败和补偿审计均保留。
- 应用内浏览器完成 PC 与 H5 390x844 验收，页面无横向溢出、控制台 warning/error 0；截图在同一证据目录。最终 API 全量 151 文件 858 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、完整 preflight、Docker healthy、readiness `ready=true/blockingCount=0`、统一资金 `healthy=true/issueCount=0` 和差异检查通过。
- `03.04` 已完成本地与沙箱归档，正式微信真机保留到生产复核。下一工作包继续 `03.03/03.05/03.06` 退款补偿、渠道对账和资金告警最终财务归档，不等待用户重复发出继续指令。

## 2026-07-20 13:05 - 11.01.54：课程资金风险、不可变回调归档与告警积压清零

- 审计发现统一支付已包含课程，但资金告警只扫描活动和商城；`FundRiskMonitorService` 现新增课程支付待对账、按 `businessOrderNo` 的重复成功支付和课程退款失败，课程退款通过 `order.course.tenant` 执行租户范围。
- 真实专项 `.local-logs/course-fund-risk-1784523215698/result.json` 保留课程订单 `#100 / CFRISK1784523215698`、退款 `#12`、支付流水 `#236` 和告警 `#34-36`。受控制造支付差异、重复支付和退款失败后准确生成三类告警；底层来源恢复为 matched/单成功支付/rejected 后，三条告警带依据解决并保持 resolved。
- 全局复扫暴露 27 条开放积压：25 条是历史签名失败、金额不一致及商城受控回调，另 2 条是 `03.06` 商城重复支付和失败退款夹具。不可变回调日志无法改为成功，旧扫描器却会让同一已解决日志每次重开，造成告警永不清零。
- 新增 `shouldRediscoverFundRisk`：`callback_failed` 按日志 ID 表示一次独立事件，带依据解决后保持解决；负余额、重复支付、支付差异和退款失败等可变风险仍在来源持续时重开。扫描响应拆分 `observedCount/detectedCount/ignoredResolvedCount/openCount`。
- 积压整改脚本 `.local-logs/fund-risk-backlog-1784523429888/result.json` 逐条核对 25 条回调，只接受签名失败、金额不一致和明确 `03.06` 受控消息；全部填写处理依据。商城订单 `#948` 第二条受控支付重分类为 `statement_matched`，商城失败退款 `RISK_MALL_RF_1784223000000` 恢复为 rejected，对应告警解决。
- 最终扫描 `observed=25/detected=0/ignoredResolved=25/open=0`，开放与跟进告警均为 0；统一资金 `healthy=true/issueCount=0`，readiness `ready=true/blockingCount=0`，Docker API healthy。
- PC 财务页显示异常提醒 0，已解决列表包含课程三类告警、业务编号、处理人和依据；告警容器无溢出，控制台 warning/error 0，截图在课程风险证据目录。
- 最终资金风险专项 3 文件 7 项、API 全量 152 文件 862 项、API 构建、完整 preflight 和差异检查通过。`03.06` 本地归档完成，外部告警通道与正式渠道故障演练随 `12.03` 生产终验。
- 下一工作包继续 `03.03/03.05` 正式退款补偿与多商户渠道对账最终归档，不等待用户重复发出继续指令。

## 2026-07-20 13:38 - 11.01.55：三业务退款补偿任务、死信恢复与课程退款隐私闭环

- 活动退款既有 `refund.provider-query` 保持不变；商城新增 `mall-refund.provider-query`，课程新增 `course-refund.provider-query`。商城退款提交为 processing 后自动发布任务；课程真实微信/支付宝审核会提交渠道退款并发布查询任务，余额、线下及沙箱退款在事务内直接完成。
- 课程退款实体新增渠道状态、同步时间、内部回执、查询次数和下次查询时间，migration `1783970000000` 已在主库完成 `up/down/up`。升级前备份为 `backups/mysql/activity_registration-20260720-131530.sql.gz`，当前 190 条 migration 全部执行。
- 两类任务使用稳定退款 ID 幂等键，执行时校验 job tenant、payload tenant 和退款 tenant；processing 抛错进入业务任务退避，终态完成，支持死信与重放。真实专项停止 API 后形成积压，重启后任务 `#611/#612` 各尝试一次进入死信；课程退款 `#13`、商城退款 `#74` 受控拒绝后重放完成。跨租户任务 `#613` 对商家 `#23` 不可见、取消 404，重复键被数据库唯一约束拒绝。
- 浏览器后真实 API 审计发现课程退款列表原样返回会员 `passwordHash/openid/unionid` 和新增渠道原始报文。接口现统一白名单投影，仅返回 `id/nickname/脱敏手机号` 和必要业务字段；创建、审核、确认、列表四个出口均收口。真实 API 复验敏感字段全部不存在。
- PC 课程退款页新增渠道状态、单号、失败原因、查询次数和下次查询时间；截图发现固定操作列覆盖中间内容后取消固定列，表格统一横向滚动。业务任务和课程退款页面桌面及 390x844 无页面级溢出，控制台 warning/error 0，证据位于 `.local-logs/refund-business-job-1784524888503/`。
- 课程余额专项再次通过：6 并发支付仅一次扣款，两次退款按原来源恢复现金 100 元、赠送金 250 元，统一资金健康。最终 API 全量 153 文件 867 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、完整 preflight、Docker API/MySQL healthy、readiness `ready=true/blockingCount=0`、统一资金 `healthy=true/issueCount=0` 和差异检查通过。
- `03.03` 本地与沙箱范围归档完成，正式微信/支付宝证书、真实退款回执和渠道到账随生产配置终验。下一工作包继续 `03.05` 正式渠道及多商户对账本地最终归档，不等待用户重复发出继续指令。

## 2026-07-20 14:42 - 11.01.56：课程与多商户渠道对账、隐私和双账本闭环

- 统一渠道账单补课程订单匹配、课程业务类型、课程名称及统一支付流水同步；真实课程账单完成匹配、金额差异、人工解决、重复导入和外租户不误匹配。
- 商城账单强化 `provider + accountScope + transactionNo`：平台代收和两家商户直收可复用同一渠道交易号，同一平台收款账户内跨店改绑返回 400；重复导入区分新增/更新，金额更新同步整数分。
- 商城账单解决、忽略和重新勾兑同步支付流水。真实专项保留账单 `#10-15`、订单 `#1059-1063`；金额差异已解决、未知订单已忽略、延迟订单重勾兑匹配，其他店铺财务列表与操作均被拒绝。
- 最终专项前两次失败均保留：首次脚本误用不存在的 `users.tenantId`，未写业务数据；第二次前六组业务通过但发现列表泄漏 `rawPayload`、租户设置和地址快照。列表、拉取、导入和处理响应现全部统一脱敏。
- 浏览器发现并修复财务工具栏窄屏裁切、商城账单固定操作列覆盖内容及旧 PC 静态构建未显示课程名称。桌面和 390x844 无页面级横向溢出，浏览器控制台 warning/error 0。
- 最终 API 155 文件 876 项、Shared/API/PC/H5/微信小程序构建、PC 1946 模块、完整 preflight、191 条 migration、Docker API/MySQL healthy、readiness `ready=true/blockingCount=0`、统一资金 `healthy=true/issueCount=0` 和差异检查通过。
- 报告见 `docs/course-and-multi-merchant-statement-acceptance-20260720.md`。`03.05` 本地与模拟通道归档完成，正式微信/支付宝账单拉取随生产配置终验；下一工作包转入全端体验和最终验收缺口审计，不等待用户重复发出继续指令。

## 2026-07-20 14:51 - 11.01.57：PC 后台全局移动抽屉导航

- 浏览器复盘发现 390px 下 PC 后台仍把全部一级菜单做成横向滚动条，分组被截断且占据顶部空间；该问题属于全局 Layout，不再逐页修补。
- 桌面继续保留 248px 常驻侧栏；移动端改为 54px 品牌栏、唯一菜单图标和左侧抽屉。抽屉复用相同权限过滤菜单，选择页面及路由变化时自动关闭，当前路由按 `route.path` 高亮。
- 打开/关闭按钮增加无障碍名称和 title；抽屉内部纵向滚动。首次浏览器截图发现 teleported 抽屉未命中 scoped 样式，品牌白字落在白底，现用明确全局抽屉类修复背景和 padding。
- 390x844 真实浏览器确认页面 `scrollWidth=375`、可见桌面 aside 为 0、抽屉 body 深色且 padding 0；“支付日志”选择后抽屉关闭，控制台 warning/error 0。截图位于 `.local-logs/admin-mobile-navigation-20260720/`。
- 响应式导航合同 3 项、API 全量 156 文件 879 项、PC 1946 模块构建和完整 preflight 通过。报告见 `docs/admin-mobile-navigation-acceptance-20260720.md`。
- `11.05` 保持开发中，继续真机键盘、安全区、焦点与其余后台页面窄屏抽查，不等待用户重复发出继续指令。

## 2026-07-20 15:01 - 11.01.58：39 页 72 处固定列移动遮挡统一整改

- 全量扫描发现 PC 后台 39 个页面存在 72 处左右固定列。390px 活动订单页的 300px 操作列实际覆盖 `49-349px`，页面无 overflow 告警但核心订单字段不可见。
- Element Plus 当前版本使用同表 sticky 单元格，现于全局 `max-width:768px` 断点取消左右 inset 和阴影，不隐藏操作列；所有字段和命令仍在表格内部横向滚动流中。通用 page/card padding、toolbar 换行和 form-grid 单列同步收口。
- 真实抽查活动订单、管理员、商城售后和志愿者：300/500/470/190px 操作列均移到表格末尾，页面级无横向溢出；志愿者左侧姓名保持首列。1280px 活动订单操作列仍 sticky 且 `right=0`。
- 响应式合同 4 项、API 全量 156 文件 880 项、PC 1946 模块构建和完整 preflight 通过；四个代表页浏览器控制台 warning/error 0。
- 前后截图和坐标详见 `docs/admin-table-responsive-acceptance-20260720.md` 与 `.local-logs/admin-table-responsive-20260720/`。`11.05` 继续特殊表格、弹窗、横屏和真机输入抽查。

## 2026-07-20 15:24 - 11.01.59：弹窗、抽屉、长表单和活动步骤导航移动整改

- PC 后台移动断点统一限制 Element Plus 弹窗和抽屉边界：弹窗采用动态视口最大高度、纵向 flex 和独立 body 滚动，左右抽屉最大宽度为视口减 12px；底部命令保留安全区并可换行，固定标签宽度统一转顶部标签。
- 390x844 浏览器实测修改密码 420px 弹窗、活动 900px 抽屉、会员详情抽屉、课程 1180px 数据弹窗和订单退款 520px 弹窗，全部位于视口内，页面 `scrollWidth=390`，内容区可滚动，底部命令可见，控制台 warning/error 0。
- 视觉复核发现活动五步向导标题在窄屏逐字竖排；现改为 112px 固定步骤宽度、标题不换行和抽屉内横向滚动。复验五步标题高度均为 20px，页面无新增横向溢出。
- 后续 844x390 横屏验收发现 900px 活动抽屉绕过 768px 断点，左侧被裁掉 56px；新增 1024px 平板/600px 矮屏约束后，活动抽屉为 x=12/width=832，1180px 课程弹窗为 x=16/width=812/height=366，内容区独立滚动且页面无溢出。活动步骤可读规则同步覆盖 1024px，五个标题保持单行。
- 320x568 极窄屏活动抽屉宽 308px、x=12，内容区 400/2716px 可滚动，页面 320/320 无溢出；浏览器控制台 warning/error 0。
- 修改密码三个表单标签均位于输入框上方；订单退款语义容器具备 `role=dialog`、`aria-modal=true` 和可访问标题，打开后焦点留在弹窗内。
- 最终响应式合同 6 项、API 全量 156 文件 882 项、PC 1946 模块构建、完整 preflight、Docker API/MySQL healthy、readiness `ready=true/blockingCount=0`、统一资金 `healthy=true/issueCount=0` 和差异检查通过。
- 报告及截图见 `docs/admin-overlay-responsive-acceptance-20260720.md` 与 `.local-logs/admin-overlay-responsive-20260720/`。`11.05` 继续真机软键盘、安全区、横屏、焦点循环和读屏终验，不等待用户重复发出继续指令。

## 2026-07-20 15:58 - 11.01.60：PC 后台纯图标按钮、页面播报与切页焦点闭环

- 使用 Vue SFC/模板 AST 审计 70 个后台 Vue 文件，发现活动编辑 1 个、首页装修 10 个纯图标按钮没有可访问名称；全部补对象级 `aria-label` 和命令 `title`，复扫未命名按钮从 11 降为 0。
- 后台 Layout 新增 `role=status`、`aria-live=polite`、`aria-atomic=true` 的页面播报区，名称复用权限菜单标签；主内容增加动态 `aria-label` 和 `tabindex=-1`，路由切换后主动获得焦点。
- 首次实现误把 Element Plus `el-main` 组件引用当作原生元素，浏览器证据显示播报更新但焦点仍在 `BODY`；现兼容原生元素和组件 `$el`。从会员资料切至全部活动后，状态和主内容均为“已进入全部活动”，当前焦点精确为 `MAIN`。
- 前台全局装修浏览器实测页面播报、主内容焦点和模块按钮名称通过；可见未命名图标按钮为 0，控制台 warning/error 0。
- 新增无障碍合同测试，固定图标按钮命名、tooltip、状态播报和组件 `$el` 焦点解析。专项 2 文件 8 项、API 全量 157 文件 884 项、PC 1946 模块构建、完整 preflight 和差异检查通过。
- 报告及截图见 `docs/admin-accessibility-acceptance-20260720.md` 与 `.local-logs/admin-accessibility-20260720/`。`11.05` 继续弹窗焦点循环、Esc 焦点返回、复杂表格读屏及真实辅助技术终验。

## 2026-07-20 16:22 - 11.01.61：嵌套草稿确认、活动抽屉与 Esc 焦点返回闭环

- 修改密码和订单退款单层弹窗基线通过：打开焦点在 `role=dialog/aria-modal=true` 内，Esc 关闭后分别返回“修改密码”和原订单行“申请退款”按钮。
- 活动编辑嵌套草稿确认暴露真实缺陷：关闭确认框后焦点掉到 `BODY`，继续关闭抽屉也无法返回原“编辑”按钮。现于打开编辑器前记录触发元素，草稿确认实际消失后使用 `MutationObserver` 将焦点移入活动抽屉，抽屉 `closed` 后返回仍连接的触发按钮，失效时回退主内容。
- 桌面 1280x800 和移动 390x844 均完成双层 Esc：第一次关闭草稿确认后焦点为抽屉 `Close this dialog` 按钮，第二次关闭抽屉后精确返回活动 `候补权限验收-waitlist-permission-1784371870367` 所在行“编辑”按钮；移动页面 375/375 无溢出，控制台 warning/error 0。
- 首次补丁将 `runPrimaryAction` 误插入样式块，专项字符串测试通过但 PC 类型检查失败；函数已移回脚本区，合同测试新增 `</script>` 前位置断言，防止同类假阳性。
- 最终无障碍合同 3 项、API 全量 157 文件 885 项、PC 1946 模块构建、完整 preflight、readiness `ready=true/blockingCount=0`、统一资金 `healthy=true/issueCount=0` 和差异检查通过。
- 报告与截图见 `docs/admin-dialog-focus-acceptance-20260720.md` 和 `.local-logs/admin-dialog-focus-20260720/`。`11.05` 继续第二批复杂弹窗、真实读屏和真机外接键盘终验。

## 2026-07-20 16:46 - 11.01.62：复杂键盘控件、动态表格命名与嵌套考核焦点闭环

- 审计 70 个 PC 后台 Vue 模板，排除仅承担遮罩语义的 `click.self/click.stop` 后，21 个真实非原生点击控件全部补齐 `role=button`、`tabindex=0`、Enter、Space 和统一 `focus-visible` 轮廓；覆盖扫码、活动状态、看板待办/告警、首页装修、巡检周期、订单备注及系统快捷入口，AST 复扫剩余缺口为 0。
- 审计 59 个后台页面、245 个 Element Plus 表格，原有表格自身可访问名称为 0。新增全局动态命名适配器，优先使用弹窗标题，其次使用卡片/标签页/分区/页面标题，同上下文多表自动编号，异步表格由 `MutationObserver` 补标且不覆盖人工名称，Layout 卸载时断开观察器。
- 应用内浏览器确认课程主表分别为“课程管理数据表 1/2”，课程考核弹窗表为“课程考核 - 【演示】国学入门十分钟数据表”，列头继续输出 `columnheader`；双层考核弹窗逐层 Esc 后分别返回“新增考核”和原课程行“考核”按钮。
- 前台全局装修 `.section-main` 可通过 Enter 打开模块编辑，Esc 后焦点保持在原模块按钮；可见未命名 role-button 为 0，控制台 warning/error 0。保留课程和首页装修三张验收截图。
- 最终无障碍合同 5 项、API 全量 157 文件 887 项、PC 1947 模块构建、完整 preflight、Docker API/MySQL healthy、readiness `ready=true/blockingCount=0`、统一资金 `healthy=true/issueCount=0` 和差异检查全部通过；preflight 仅保留正式短信凭据配置提醒。
- 报告与截图见 `docs/admin-complex-accessibility-acceptance-20260720.md` 和 `.local-logs/admin-complex-a11y-20260720/`。`11.05` 继续 NVDA/VoiceOver、微信真机外接键盘、软键盘安全区和横屏组合终验。

## 2026-07-20 17:01 - 11.01.63：大使与院长招募租户状态、故障恢复和提交防重闭环

- 对 71 个移动页面与客户端状态合同做差集审计，发现 18 个页面尚未纳入合同；本批优先处理文化大使和院长招募两个业务写入口，合同覆盖由 53 页增至 55 页。
- 文化大使招募新增租户请求代次守卫，只有当前商家和当前请求可以写入配置与案例；两个页面统一在 `onShow` 刷新套餐功能门，补加载中、持久错误、重新加载和 `role=alert/aria-live` 播报，错误时不再把默认配置伪装成真实加载结果。
- 两个申请入口均在函数开始处拦截 `submitting/submitted`，请求前加锁并保留稳定业务幂等键；提交失败写入页面安全文本，成功后锁定表单。院长招募此前缺少功能门、持久提交错误及入口级防重的问题一并修复。
- H5 使用 `qiwai-showcase` 真实配置加载两页；390×844 下均为 390/390，无横向溢出。停止本地 API 后，院长页真实显示“请求失败 / 重新加载”；恢复 API 后单击重试恢复完整配置，告警归零，控制台 warning/error 0，未提交申请或修改业务数据。
- 客户端状态专项 44 项、API 全量 157 文件 888 项、H5 与微信小程序构建、完整 preflight、readiness `ready=true/blockingCount=0` 和差异检查全部通过；API/MySQL 最终 healthy，preflight 仅保留正式短信凭据提醒。
- 报告与截图见 `docs/recruit-page-state-acceptance-20260720.md` 和 `.local-logs/recruit-state-20260720/`。`11.04` 继续活动、课程、商城和会员资产等剩余 16 个未纳入合同页面的状态审计。

## 2026-07-20 17:48 - 11.01.64：高流量业务、商城确认订单与旧分包恢复闭环

- 客户端状态合同覆盖由 55/71 页增至 63/71 页。活动详情/报名、课程详情、商城首页/购物车/收藏/足迹/确认订单均补租户请求代次，拒绝旧商家、旧活动、旧课程及旧筛选响应覆盖当前页面。
- 商城搜索历史和收货地址选择分别改为租户键；购物车删除、足迹清空、报名确认及确认订单跨店确认均在系统弹窗出现前加锁。确认订单为页面、地址、商品、券、报价、支付方式和提交建立独立守卫，下单和统一支付结果复核原提交上下文。
- 商品详情加购新增租户动作守卫和 SKU 复核；收藏、加购、购买和重试补按钮、键盘及忙碌语义。
- H5 新增旧哈希分包恢复。首次真实版本切换发现 Vue `errorHandler` 只上报不恢复，页面仍显示“连接服务器超时”；现 Vue、window error 和 unhandled rejection 统一进入恢复函数，并以 sessionStorage 60 秒挡板防循环。
- 真实版本 A/B 验收：旧会话请求已删除 `pages-mall-detail.DBLAIudE.js`，仅产生 1 次预期资源错误，URL 自动加入 `__h5_reload=1784540535465`，随后商品 `63` 正常加载；等待后未循环。确认订单 SKU `118` 加载 9.90 元报价，因账号无地址正确禁用提交，390x844 为 390/390。
- 修复 API 测试跨目录导入 H5 源码导致 `migration:show` 编译 TS6059 的问题，并清理该失败编译生成的源码旁 CommonJS 文件；195 条 migration 重新显示全部已执行。
- 最终专项 2 文件 54 项、API 全量 158 文件 898 项、H5/微信小程序构建、完整 preflight、Docker API/MySQL healthy、readiness `ready=true/blockingCount=0` 和差异检查通过；preflight 仅保留正式短信凭据提醒。
- 报告与截图见 `docs/high-traffic-and-mall-state-acceptance-20260720.md` 和 `.local-logs/high-traffic-state-20260720/`。`11.04` 继续剩余 8 页状态审计，不等待用户重复发出继续指令。

## 2026-07-20 18:02 - 11.01.65：商城物流租户订单上下文与真实包裹验收

- 商城物流页新增租户请求代次和 `tenantCode:orderId` 页面上下文；切换商家或订单时先清空旧详情，迟到响应、错误和 loading 只允许原上下文写回。无订单参数显示持久错误，不再渲染空白物流页。
- 复制快递单号的异步成功提示复核租户与订单上下文；加载、错误和重试补 `status/alert/button`、aria-live 与 Enter/Space 键盘语义。
- 使用保留会员 `13990008991 / Qiwai123456` 登录并读取订单 `1012 / MO1784284067059304D87`；页面显示验收快递 A/B 两个包裹、已发 2/2 件、物流轨迹、完整履约事件、快递查询和收货信息，未执行确认收货、退款或其他写操作。
- 390x844 下页面 `scrollWidth=clientWidth=390`，控制台 warning/error 0；截图与结构化结果位于 `.local-logs/mall-logistics-state-20260720/`。
- 客户端状态专项 49 项、API 全量 158 文件 899 项、H5/微信小程序构建、完整 preflight、readiness `ready=true/blockingCount=0` 和差异检查全部通过；preflight 仅保留正式短信凭据提醒。
- 状态合同覆盖增至 64/71 页；`11.04` 继续活动列表、移动统计/风险、公开验真和会员资产等剩余 7 页，不等待用户重复发出继续指令。

## 2026-07-20 18:22 - 11.01.66：活动列表租户切换、辅助失败隔离与键盘筛选闭环

- 活动列表已有请求代次，但商家切换时先等待分类和装修，旧列表仍可能在等待期间回写。现切换瞬间失效旧列表请求并清空行、总数、分页和错误，再按新租户启动加载。
- 活动列表、分类和页面装修改为真正并发；分类失败写独立持久告警和重试，不再伪装成“没有分类”，也不阻塞核心活动列表进入成功或错误状态。
- 活动时间明确按 `Asia/Shanghai` 格式化；搜索清空、分类/状态标签、活动卡片、列表重试和加载更多补按钮/标签页语义、aria 状态及 Enter/Space 操作。
- 390x844 浏览器正常加载 18 场、首屏 8 场，Enter 选择“报名中”后为 17 场。首次 API 故障验收发现装修阻塞主列表请求，整改并发后再次停止 API，分类和主列表分别显示“请求失败/重新同步”和“请求失败/重试”，加载态结束且未显示空态。
- API 恢复后分别点击分类与列表重试，分类和 18 场活动全部恢复；页面 390/390，控制台 warning/error 0。证据位于 `.local-logs/activity-list-state-20260720/`。
- 客户端状态专项 50 项、API 全量 158 文件 900 项、H5/微信小程序构建、完整 preflight、Docker API/MySQL healthy、readiness `ready=true/blockingCount=0` 和差异检查通过；仅保留正式短信凭据提醒。
- 状态合同覆盖增至 65/71 页；`11.04` 继续移动统计/风险、公开验真、个人中心、活动订单和钱包等剩余 6 页。

## 2026-07-20 18:45 - 11.01.67：公开凭证验真状态、竞态与无障碍闭环

- 公开验真查询捕获凭证编号、类型和请求序号；输入或类型变化立即使旧请求失效并清除旧结果，迟到成功/失败不能覆盖当前编号。
- 签发及有效期按 `Asia/Shanghai` 展示；返回、类型标签、编号输入、查询、错误和结果区域补齐按钮、标签页、状态播报和键盘语义。
- 390x844 浏览器验证有效证书 `MPCB20260717497217`、有效证明 `VPR20260717ff8a4d106ddc447c`、输入变化清理和无效编号重试，页面 390/390，控制台 warning/error 0；证据位于 `.local-logs/credential-verify-state-20260720/`。
- 客户端状态专项增至 51 项，API 全量 158 文件 901 项、H5/微信小程序构建、完整 preflight、Docker readiness `ready=true/blockingCount=0` 和差异检查通过。
- 状态合同覆盖增至 66/71 页；`11.04` 继续钱包、活动订单、个人中心、移动统计和风险告警等剩余 5 页。

## 2026-07-20 19:00 - 11.01.68：会员钱包租户会话、故障恢复与真实流水闭环

- 钱包页面在租户守卫上增加会员 ID 和访问令牌复核；同租户切换账号会立即清空旧资产，资料、钱包、流水以及异常/加载结束均只允许原会话写回。
- 资料读取不再通过带本地会话副作用的辅助函数；钱包和流水补响应结构校验，主数据失败显示持久错误，不再被渲染为零余额；流水时间统一按 `Asia/Shanghai`。
- 加载、错误、空态和重试补状态播报、告警、按钮、Enter/Space 键盘语义。390x844 浏览器读取保留会员余额 1962.80 元和 24 条流水，页面 390/390。
- 停止 API 后页面清除旧余额并显示唯一“重新加载”按钮；恢复 API 后点击重试回到 1962.80 元及 24 条流水，未执行充值、扣款、支付等资金写操作。截图和结果位于 `.local-logs/wallet-state-20260720/`。
- 状态专项 52 项、API 全量 158 文件 902 项、H5/微信小程序构建、完整 preflight、readiness `ready=true/blockingCount=0` 和差异检查通过。
- 状态合同覆盖增至 67/71 页；`11.04` 继续活动订单、个人中心、移动统计和风险告警等剩余 4 页。

## 2026-07-20 19:15 - 11.01.69：会员活动/课程订单会话、退款口径与故障恢复闭环

- 我的订单页绑定租户、会员 ID 和访问令牌；同租户切换账号立即清空旧订单，迟到成功、失败和 loading 均不能写回新会话。
- 活动报名、学习记录和课程订单三路读取改为 `Promise.allSettled`：部分成功时展示已同步数据并列出失败分区，三路全失败才进入阻塞错误；筛选、刷新、卡片、退款和错误关闭补完整键盘及读屏语义，时间统一上海时区。
- 课程退款确认捕获原租户、会员、令牌、订单和可退金额，确认前再次校验服务端页面真值；确认框打开即锁定，取消后恢复。账号 `13780155100` 打开订单 `99 / CO1784520428682F1EFA7 / 299.00 元` 退款框后取消，数据库保持 paid 且退款记录为 0。
- 浏览器发现活动订单 `OD1783729160570219 / 199.00 元` 只有部分退款却显示“已退款”；现按订单 `partially_refunded` 显示“部分退款”，并明确最近一笔退款金额。课程订单 `98` 有 100+199 元两笔完成退款，接口新增 `refundedAmountFen=29900`，页面不再把最近 199 元误报为累计金额。
- 活动账号 `13990000002` 显示 3 条报名；课程账号 `13990014006` 的待处理、待观看、已完成各 1 条；退款账号显示 2 条课程订单。停止 API 后页面旧订单为 0，仅显示唯一重试；恢复后回到 2 条及累计退款 299 元。390x844、1280x800 均无横向溢出，恢复后控制台 warning/error 0。
- API 容器使用既有 Compose 项目名重建，MySQL、上传和私有文件卷保留；专项 63 项、API 全量 158 文件 903 项、H5/微信小程序构建、完整 preflight、readiness `ready=true/blockingCount=0` 和差异检查通过。证据位于 `.local-logs/member-orders-state-20260720/`。
- 状态合同覆盖增至 68/71 页；`11.04` 继续个人中心、移动统计和风险告警等剩余 3 页。

## 2026-07-20 19:45 - 11.01.70：会员个人中心会话、资产分区与订单角标闭环

- 个人中心主资料及钱包、公益、管理权限、学习、活动报名、课程订单和商城订单七个资产分区绑定租户、会员 ID 和访问令牌；同租户切换账号时立即清空旧资产、兑换错误和操作锁，迟到响应不能回写。
- 主资料改为直接请求并校验有效对象，各资产分区分别校验对象/数组结构；失败分区以 `--` 表示未知，不再渲染默认 0。功能开关、页面装修和会员资料改为并发，API 故障从两轮超时缩短为一轮。
- 浏览器故障验收发现资料未知时误显示“未登录/未绑定手机号”；现加载中显示“正在同步会员资料”，故障显示“资料同步失败/状态未知/登录状态待同步”，并隐藏绑定入口。
- “我的订单”角标移除商城订单混算，按目标订单页的活动、课程订单和无订单学习资产统一；待观看排除已退款历史单。课程会员 `13780155100` 为全部/待观看/已完成 `2/1/1`，活动会员 `13990000002` 为全部/已完成 `3/3`。
- 兑换、微信资料同步、手机号绑定回调和退出确认增加当前会话复核。无效码 `INVALID-STATE-CHECK-20260720` 显示持久错误，会员 `31105` 同期兑换使用记录为 0；退出确认打开即锁定，取消后仍登录且按钮恢复。
- 两账号切换由余额 51.00 元、订单 2 切换到余额 6801.02 元、报名 3、订单 3，旧兑换错误清除。停止 API 后旧余额不可见、主资料失败可重试；恢复后资产完整。390x844 无溢出，1280x800 内容宽 760px，恢复后控制台 warning/error 0；证据位于 `.local-logs/member-center-state-20260720/`。
- 状态专项 54 项、API 全量 158 文件 904 项、H5/微信小程序构建、完整 preflight、readiness `ready=true/blockingCount=0` 和差异检查通过。
- 状态合同覆盖增至 69/71 页；`11.04` 继续移动经营统计和风险告警剩余 2 页。

## 2026-07-20 20:05 - 11.01.71：移动经营统计会话、故障恢复与权限状态闭环

- 经营统计请求绑定管理令牌、租户、角色及 7/30/90 天范围；上下文切换立即清空旧概览、趋势和渠道，所有成功、失败及 loading 只接受原管理会话和范围。
- 概览、趋势和渠道增加响应结构校验、独立错误与重试；主概览失败清除旧指标，日期按 `Asia/Shanghai` 展示，刷新、范围标签和风险入口补按钮、Enter/Space 与状态播报语义。
- 公共移动管理请求仅在 401 清会话；浏览器进一步发现工作台仍在 403 时跳登录，现同步收口为仅 401 跳转并补契约断言，最小权限账号不会因无权访问工作台进入登录循环。
- 财务账号 `showcase_finance` 的 30 天真实指标为浏览 89、报名 10334、支付 327、净收入 3857.70 元、退款 1804.32 元；Enter 和 Space 分别切换 7 天、90 天成功。390x844 与 1280x800 均无横向溢出。
- 停止 API 后旧指标全部清除，只显示一个持久错误和一个重试入口；恢复 API 后重试回到完整数据。`showcase_operation_settings_only` 显示明确无权限，页面刷新后仍停留经营统计且无登录框、无旧指标，管理会话保持。
- 客户端状态专项 55 项、API 全量 158 文件 905 项、H5 与微信小程序构建、完整 preflight、readiness `ready=true/blockingCount=0`、统一资金 `healthy=true/issueCount=0` 和差异检查通过；本轮正式短信凭据继续作为生产配置提醒。
- 证据位于 `.local-logs/mobile-analytics-state-20260720/`，汇总报告见 `docs/high-traffic-and-mall-state-acceptance-20260720.md`。状态合同覆盖增至 70/71 页；`11.04` 继续最后一页移动风险告警。

## 2026-07-20 20:25 - 11.01.72：移动资金异常会话、并发状态机与故障恢复闭环

- 告警列表绑定管理令牌、租户、角色、状态和类型筛选；上下文变化立即清除旧卡片，bootstrap 与列表执行结构校验，迟到成功、失败和 loading 不得写回新会话。
- 主加载错误和扫描/处置错误分层；主请求失败清除旧卡片，只显示一个持久错误和一个重试。状态、类型、扫描、刷新、重试和行操作补按钮/标签页、Enter、Space、忙碌及禁用语义，时间统一 `Asia/Shanghai`。
- 扫描和处置增加操作序号与会话复核；处置确认冻结告警 ID、原状态、标题和业务编号，提交前复核当前权限、管理会话及行状态，取消、弹窗失败和请求结束均可靠解锁。
- 服务端扫描新增全局 MySQL 命名锁；处置在事务中悲观锁定告警，执行 open/acknowledged/resolved 状态机，同状态重复请求幂等返回 `operationApplied=false`，非法筛选和超过 500 字处理依据明确返回 400。
- 真实 API 对告警 `#7` 双并发重新打开均返回 201，但仅一次 `operationApplied=true`；随后恢复 resolved 并保留依据。非法状态筛选 400，只读账号扫描 403，最终资金一致性 healthy、issueCount 0。
- 浏览器财务账号加载 12 条已解决告警，Enter/Space 筛选回调后 2 条；重新打开弹窗取消后状态不变且控件解锁。API 停止后旧卡片从 2 清为 0，仅一个重试，恢复后回到 2 条。只读账号显示 2 条且扫描/处置入口均为 0。
- 390x844 与 1280x800 均无横向溢出，本轮控制台 warning/error 0。专项 2 文件 60 项、API 全量 158 文件 907 项、API/H5/微信小程序构建、完整 preflight、readiness `ready=true/blockingCount=0` 和差异检查通过。
- 报告见 `docs/mobile-risk-state-acceptance-20260720.md`，证据位于 `.local-logs/mobile-risk-state-20260720/`。移动客户端状态合同达到 71/71；继续 PC 长尾、真实辅助技术、微信真机和全角色最终验收，不将状态合同完成误报为全项目交付完成。

## 2026-07-20 20:50 - 11.01.73：H5、后台与 Nginx 静态制品自动回滚闭环

- 新增 `npm run drill:rollback:static`。脚本在故障注入前检查 Nginx 配置、H5/后台入口、版本文件、首屏 JS/CSS 和 API readiness，并读取两个首页的原始字节与 SHA-256。
- 受控候选仅临时替换 H5 和后台 `index.html`，不修改 assets、API、MySQL、上传或私有文件卷；两个入口均返回唯一故障标记且 API 保持 ready 后判定故障检测成功。
- 正常及异常路径都先恢复原始首页；恢复后 H5/后台 SHA-256 分别与基线 `9c84e03f...f577`、`3bf14436...a28` 完全一致，H5 3 个和后台 7 个首屏资产全部 HTTP 200 且非空，Nginx 配置前后有效。
- 自动回滚耗时 0.23 秒，总演练 0.74 秒，未重启 API、未执行 migration、未修改数据库。应用内浏览器复验 H5 资金异常页与 PC `/admin/dashboard` 均成功挂载，故障标记为 0。
- 回滚门禁现固定 package 命令、故障标记、Nginx 探针、紧急恢复、哈希对比、结果路径和数据库未触碰声明；本地结果文件加入 `.gitignore`，避免反复演练污染源码状态。
- 报告见 `docs/static-artifact-rollback-drill-20260720.md`，结构化证据为 `deploy/static-rollback-drill-result.json`。`12.05` 继续真实 CDN/负载均衡灰度、缓存失效及 API+静态组合故障演练。

## 2026-07-20 21:20 - 13.02：租户管理员当前版本浏览器复验与角色矩阵归档

- 恢复并实测 `showcase_admin / Qiwai123456`：管理员 ID 130、角色 `operator`、租户 `23 / 慢π演示中心`，当前会话加载 94 项权限。
- 应用内浏览器逐页验证工作台、活动、报名、活动订单、会员、首页装修、商城商品、商城订单和运营设置；8 个核心业务页均未跳登录或出现真实 403，控制台 warning/error 为 0，文档宽度均未超过视口。
- 活动列表显示 45 条、首屏 20 条；打开五步创建向导并保留已有自动草稿。对活动 `候补权限验收-waitlist-permission-1784371870367` 打开取消活动确认后返回，活动仍为报名中，未产生写入副作用。
- 新增 `docs/role-matrix-final-acceptance-20260720.md`，汇总平台、租户管理员、运营、财务、核销、店铺、讲师、会员、志愿者和伙伴账号、结论与证据；同步修正交付手册、状态索引和计划表中 `showcase_admin` 不可用的过期说明。
- `13.02` 仍保持开发中：正式支付、短信、对象存储、生产域名证书、外部告警、微信真机、相机扫码、真实弱网和生产灰度继续按外部配置终验，不以本地结果冒充最终签收。

## 2026-07-20 21:35 - 12.03：验收死信与运行态监控隔离整改

- 完整 `ci:verify` 通过后，运行态监控发现 `dead_letter_jobs=90` 并正确进入 critical。数据库分组确认 87 条为 `acceptance.permission/acceptance.worker-race` 验收任务，3 条为通知权限脚本的模拟供应商强制失败任务，均创建于 2026-07-18。
- 新增 `maintenance:archive-acceptance-dead-letters`：默认 dry-run，只有显式设置 `ACCEPTANCE_DEAD_LETTER_ARCHIVE_CONFIRM=true` 才通过平台管理 API 将严格白名单命中的验收死信归档为 cancelled。
- 归档保留任务 payload、错误、Worker、时间和操作审计；不删除测试数据，不匹配真实业务死信。说明见 `docs/acceptance-dead-letter-remediation-20260720.md`。
- dry-run 精确命中 90/90 条；确认执行后 90 条均转为 cancelled，dead-letter 剩余 0。监控由 critical 恢复为 `status=ok/alerts=0`，统一资金 `healthy=true/issueCount=0`，readiness `ready=true/blockingCount=0`。
- 本轮完整 `ci:verify` 用时 199.1 秒并退出 0：运行时 high/critical 为 0，API 158 文件 907 项、全部 preflight、Shared/API/PC/H5/微信小程序构建通过；最终差异检查退出 0。

## 2026-07-20 21:45 - 13.02：全角色当前账号审计与讲师登录落地整改

- 新增 `acceptance:final-role-accounts`，使用当前凭据登录平台、租户管理员、运营、财务、核销、店铺负责人、店铺财务、代理负责人、讲师和伙伴管理 10 个后台角色；有效权限分别为 142/94/79/36/4/13/9/17/4/4，22 个允许接口和 9 个拒绝接口通过。
- 活动会员 122、课程会员 31105、商城会员 120、志愿者 20760 均通过密码登录，随后读取 `qiwai-showcase` 个人资料并核对登录 ID 与资料 ID 一致。
- 浏览器发现 `showcase_course_teacher` API 登录成功但页面停留登录页。根因为登录先跳工作台，而路由回退候选漏掉课程；现补齐所有权限保护后台页面，并新增自动提取路由的完整性合同，新增页面漏配回退会直接测试失败。
- 应用内浏览器复验讲师全新登录直达 `/admin/courses`，仅显示授权课程 3；访问活动页自动回到课程。伙伴管理直达 `/admin/ambassador`，显示 19 条线索、10 份生效合同、18 个已转商家及 19 个脱敏手机号；访问租户页自动回到伙伴 CRM。两页无 warning/error 或横向溢出，最终恢复 `showcase_admin` 工作台。
- 菜单/路由合同 22 项和 PC 生产构建通过，报告见 `docs/final-role-account-audit-20260720.md`，最新结构化证据见 `.local-logs/final-role-account-audit-1784554738719/result.json`。
- 随后完整 `ci:verify` 用时 131.3 秒并退出 0：API 158 文件 908 项，全部 preflight、Shared/API/PC/H5/微信小程序构建通过；监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/blockingCount=0` 和差异检查均通过。

## 2026-07-20 21:56 - 11.01.74：伙伴与大使工作台分区失败和故障恢复闭环

- PC 长尾审计发现伙伴/大使工作台采用单组 `Promise.all`：任一子接口失败时只弹瞬时消息，旧线索、合同和看板仍可能留在页面；连续刷新也没有请求代次保护。
- 现按有效权限动态生成概览、配置、案例、线索、志愿任务、大使档案、贡献和伙伴合同分区，使用 `Promise.allSettled` 保留成功分区；刷新开始和分区失败时清空对应旧数据，请求代次只允许最后一轮结果写回。
- 敏感联系方式和合同揭示结果随刷新清空；增加持久错误正文、具体失败分区、唯一“重新同步”入口和 `aria-live`。首次浏览器故障验收又发现 Element Plus 默认插槽覆盖错误描述，改为正文渲染后重新完成故障恢复验收。
- 伙伴账号正常显示 19 条线索、10 份生效合同、18 个已转商家；停止 API 后两个列表清零并显示两个 HTTP 502 分区，恢复后点击重试完整回归。故障注入未停止 MySQL、未执行 migration、未改变测试数据。
- 桌面 `1265/1265`、390x844 页面 `375/375`，控制台 warning/error 0；截图位于 `.local-logs/partner-state-20260720/`，报告见 `docs/partner-workbench-state-acceptance-20260720.md`。
- 专项 1 文件 23 项、完整 `ci:verify` 用时 147.1 秒并退出 0；API 158 文件 909 项、运行时 high/critical 0、全部 preflight 和 Shared/API/PC/H5/微信小程序构建通过。`11.01` 继续其余 PC 长尾页面。
- 最终复核监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/configSummary.blockingCount=0`；API/MySQL healthy、Nginx 运行正常，`git diff --check` 退出 0。浏览器恢复 `showcase_admin` 工作台。

## 2026-07-20 22:38 - 11.01.75：商城店铺治理分区失败、代理选项与移动布局闭环

- 商城店铺治理页为主列表、租户/代理选项、支付就绪度、入驻申请、授权、资质合同和收款账户增加独立持久错误；请求开始与失败均清除对应旧数据，主列表、支付和入驻使用请求代次拒绝迟到响应。
- 授权、资质合同和收款账户读取捕获当前店铺 ID，切换店铺后旧响应不能写回；资质和合同改为 `Promise.allSettled`，单分区故障不再抹掉成功分区。
- 浏览器发现 `/admin/agents` 当前返回分页对象而页面仍按数组处理；现兼容数组和 `items`，固定 `page=1/pageSize=100`，真实新增店铺弹窗完整显示当前租户 39 个代理，取消弹窗后无新增写入。
- 平台管理员正常显示 68 个店铺、60 个待配置、8 个支付待联调；样例店铺授权 2 条、资质合同 3 条、收款账户为空。停止 API 后收款账户及主列表清零并显示持久 502，汇总归零；恢复 API 后点击重试完整回归，未停止 MySQL、未执行 migration、未修改测试数据。
- 390x844 首次截图虽无横向溢出，但标题和说明被筛选区压成窄列；补移动断点后头部、说明、筛选与操作区改为全宽纵向布局。最终桌面 `1265/1265`、移动 `375/375`，控制台 warning/error 0，证据位于 `.local-logs/mall-merchant-state-20260720/`。
- 商城治理状态合同增至 24 项；完整 `ci:verify` 用时 145.1 秒并退出 0，API 158 文件 910 项、运行时 high/critical 0、全部 preflight 和 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`，统一资金 `healthy=true/issueCount=0`，readiness `ready=true/blockingCount=0`，`git diff --check` 退出 0；浏览器恢复 `showcase_admin / Qiwai123456` 工作台。下一工作包继续商城订单或商品 PC 长尾状态治理。

## 2026-07-20 22:52 - 11.01.76：商城订单核心读取分区、旧数据清理与故障恢复闭环

- 商城订单页的店铺范围、订单列表/汇总、经营看板、售后、支付与佣金、结算和跨店结算组追踪均增加独立持久错误、重试入口、响应结构校验和请求代次；刷新开始即清除对应旧数据，迟到响应不能覆盖当前筛选或店铺。
- 订单列表与汇总使用 `Promise.allSettled` 分别报告失败；支付流水、支付回调、退款日志、佣金明细、佣金汇总、推广人汇总和支付就绪度七分区独立恢复；跨店追踪八分区同时绑定当前结算组号。
- 正常浏览器口径为筛选订单 265、近 30 天订单 193、实收 10993.77 元、净收 9957.02 元、已退 1036.75 元和待处理售后 21；支付分区为流水 48、回调 1、退款日志 18。
- 停止 API 后主刷新将订单行和所有金额清零，订单/汇总和经营看板显示持久失败；支付刷新将 48/1/18 条旧数据及支付就绪度清除，并明确列出七个失败分区。API 恢复后分别点击重试，所有真实数据完整回归；MySQL、migration 和测试数据未改动。
- 专项合同增至 25 项；完整 `ci:verify` 用时 130 秒并退出 0，API 158 文件 911 项、运行时 high/critical 0、全部 preflight 和 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/blockingCount=0`、`git diff --check` 通过；浏览器恢复 `showcase_admin` 工作台。下一批继续订单详情、跨店子单、分包发货、物流和营销弹窗状态治理。

## 2026-07-20 23:16 - 11.01.77：商城订单详情、发货、物流与营销弹窗上下文闭环

- 订单详情接口失败不再静默回退列表行；详情和跨店子单分别捕获订单 ID、结算组及请求代次，打开另一订单、关闭抽屉或切换店铺后，旧响应不能写回。
- 发货上下文从可变 `currentOrder` 拆为独立 `shipOrderTarget`，提交前复核目标订单；发货物流选项与物流配置列表拆分，分别绑定订单所属店铺和当前配置店铺。店铺范围变化会关闭全部订单、发货、物流和营销弹窗。
- 优惠券范围、优惠券、使用记录、秒杀、拼团、参团记录、推广代理及推广码增加旧数据清理、请求代次、响应校验、持久错误和独立重试；失败未恢复时禁用相关保存操作。
- 推广代理接口兼容数组和分页对象，固定 `page=1/pageSize=100`；真实推广码弹窗完整显示当前 39 个代理，不再因分页契约变化渲染空选项。
- 浏览器订单 `MO178423165292480EF14` 显示商品 59 元、优惠 5 元、实付 54 元和完整地址；发货弹窗保持同一订单及 `0/1` 数量，取消后无写入。物流设置显示顺丰、中通、京东 3 条。
- 停止 API 后详情只显示 502 且不再出现订单号或列表残片；推广代理和推广码清零、双错误持久显示、新增禁用。恢复 API 后详情及推广数据完整回归。390x844 抽屉 `378/378` 无溢出，控制台 warning/error 0。
- 专项 25 项、完整 `ci:verify` 用时 165.9 秒并退出 0；API 158 文件 911 项、运行时 high/critical 0、全部 preflight 和 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/blockingCount=0`、`git diff --check` 通过；浏览器恢复 `showcase_admin` 工作台。下一批进入独立商城商品页面状态治理。

## 2026-07-21 00:08 - 11.01.78（计划表 11.01.59）：商城商品、SKU、库存与审核弹窗上下文闭环

- 商品主列表、分类品牌、低库存和库存异常增加请求代次、旧数据清理、响应校验、持久错误及独立重试；页面目录与商品表单目录分离，编辑其他店铺商品不再污染主筛选。
- 商品编辑改为按 ID 读取独立详情并复核商品、商家和店铺，详情成功前只保留不可变 ID/归属，不显示列表快照且禁用保存；平台新建商品使用独立店铺选项，不再改写主页面店铺范围。
- 优惠券、库存流水和审核记录绑定打开时目标并支持故障恢复；库存调整冻结商品、商家、店铺、SKU 集合和业务幂等键，范围切换统一关闭弹窗并使迟到响应失效。
- 浏览器正常态保留店铺 #38 的 4 个商品；商品 #11 为 SPU `P11`、标准款/礼盒款两个 SKU，库存流水 200 行，优惠券 6 条。两轮受控停止 API 后，主列表、优惠券和详情均清除旧数据、显示持久 502、禁用写操作，恢复后完整回归；MySQL、migration 和测试数据未改动。
- 390x844 首次验收发现标题被操作区挤成单字竖排，补移动断点后标题宽 327px、高 31px，页面 `375/375`，商品编辑弹窗 `390/390`，无横向溢出。截图位于 `.local-logs/mall-product-state-20260720/`，报告见 `docs/mall-product-state-acceptance-20260720.md`。
- `menu-integrity.spec.ts` 26/26；API 全量 158 文件 912 项；完整 `ci:verify` 用时 130.5 秒并退出 0，运行时 high/critical 0，全部 preflight 和 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`，统一资金 `healthy=true/issueCount=0`（活动 330、课程 91、商城 815、钱包流水 463、结算 26），readiness `ready=true/blockingCount=0`，`git diff --check` 退出 0。下一批继续商城库存、审核或其他 PC 长尾页面。

## 2026-07-21 00:36 - 11.01.79（计划表 11.01.60）：商城库存预警与独立商品审核状态闭环

- 库存商品、低库存、库存流水和库存异常四分区增加独立请求代次、范围复核、响应结构校验、加载态、旧数据清理、持久错误与重试；商家/店铺范围失败同时清除旧库存。
- 路由关键词、清空店铺和外部深链变化现均正确重载。库存调整冻结商品、商家、店铺、允许 SKU 集合和业务幂等键；库存异常确认后复核列表代次与异常 ID。
- 商品审核拆分范围错误和列表错误；审核列表增加请求代次、范围复核与清空，确认期间锁定筛选及全部行操作，通过/驳回前复核商品、商家、店铺和列表代次。
- 新增并保留待审核商品 `#105 / AUDIT-STATE-20260721 / 【验收保留】商品审核状态治理`，店铺 #38，审核规格 19.90 元、库存 8；驳回弹窗只打开并取消，状态未变。
- 库存正常态 4 商品、8 SKU、总库存 720、流水 200；故障时 8 个汇总和四分区全部清零并分别显示 502，恢复后四个入口独立回归。审核全局 11 条、2 店铺；故障时列表与汇总清零但范围说明保留，恢复后完整回归。
- 浏览器发现审核错误正文被 Element Plus 默认插槽遮挡，改为正文显式渲染后再次故障验收。390x844 两页均 `375/375`，标题宽 323px、高 31px；截图位于 `.local-logs/mall-inventory-audit-state-20260721/`，报告见 `docs/mall-inventory-audit-state-acceptance-20260721.md`。
- 首轮完整 CI 中 158 文件 913 项测试通过，但商城 preflight 要求保留 `${row.id}` 审核路径表达；在目标复核不变的前提下等价恢复，专项 27/27 和完整 `ci:verify` 重跑 130.2 秒退出 0，运行时 high/critical 0，全部 preflight 与全端构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 330、课程 91、商城 815、钱包流水 463、结算 26）、readiness `ready=true/blockingCount=0`、`git diff --check` 通过；浏览器恢复 `showcase_admin` 工作台。

## 2026-07-21 01:07 - 11.01.80（计划表 11.01.61）：商城评价、举报、售后与退款日志状态闭环

- 商城评价、评价举报、售后申请和退款日志拆为四个独立读取分区，各自增加请求代次、范围复核、响应结构校验、加载态、旧数据清理、持久错误正文和独立重试；租户/店铺范围失败同步清除业务数据。
- 评价审核与举报处置确认后复核记录、商品/评价、店铺、筛选上下文和列表代次；售后通过、确认收货、换货发货、协商、退款重试和拒绝统一复核售后单、订单、店铺和列表代次，写操作期间锁定全部范围筛选。
- 店铺 #38 正常读取已展示评价 19 条、举报 5 条、售后 42 条、退款日志 18 条。停止 API 后四分区和全部汇总清零，四个错误正文及独立重试入口可见；恢复 API 后真实数据完整回归，未修改业务状态或测试数据。
- 390x844 下两页均为 `375/375`，内容区 `351/351`，标题 323x31px，无横向溢出；截图位于 `.local-logs/mall-review-refund-state-20260721/`，报告见 `docs/mall-review-refund-state-acceptance-20260721.md`。
- `menu-integrity.spec.ts` 28/28；API 全量 158 文件 914 项；完整 `ci:verify` 130.5 秒退出 0，运行时 high/critical 0，全部 preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 539、课程 93、商城 815、钱包流水 471、结算 26）、readiness `ready=true/blockingCount=0`、`git diff --check` 通过；浏览器恢复 `showcase_admin` 工作台。下一批继续商城结算、统计或其他 PC 长尾页面。

## 2026-07-21 01:28 - 11.01.81（计划表 11.01.62）：商城结算、财务总览与经营统计状态闭环

- 结算列表增加租户、店铺、状态、周期和请求代次复核；刷新开始清空旧数据并关闭明细。明细按结算单和店铺复核，失败不显示列表残片。
- 生成结算单补二次确认并冻结店铺、周期和待生成列表；审核、拒绝、打款/扣回确认后复核结算单、店铺和列表代次；财务调整绑定明细目标。
- 财务总览拆为订单摘要、支付流水、退款日志、佣金摘要和结算风险五个独立分区；经营统计补租户/店铺/统计请求代次、响应校验、旧数据清理和显式错误正文。
- 店铺 #38 正常态为财务订单 265、支付 48、退款 18、结算风险 1、佣金 37.10 元；30 天统计订单 193；结算待生成 1、结算单 1。平台明细显示 1 行/1 事件，运营账号越权 403；审核弹窗锁定全部筛选，取消后仍为草稿。
- 停止 API 后财务五分区、统计聚合和结算列表全部清空，十九项汇总及所有明细归零，HTTP 502 正文和独立重试可见；恢复后完整回归，未修改业务或资金数据。
- 390x844 三页均 `375/375`、内容区 `351/351`、标题 323x31px；截图位于 `.local-logs/mall-finance-state-20260721/`，报告见 `docs/mall-finance-state-acceptance-20260721.md`。
- `menu-integrity.spec.ts` 29/29，API 全量 158 文件 915 项；完整 `ci:verify` 130.1 秒退出 0，运行时 high/critical 0，全部 preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 539、课程 93、商城 815、钱包流水 471、结算 26）、readiness `ready=true/blockingCount=0`、`git diff --check` 通过；浏览器恢复 `showcase_admin / Qiwai123456` 工作台。下一批继续其他 PC 长尾页面。

## 2026-07-21 01:57 - 11.01.82（计划表 11.01.63）：商城收款配置与支付日志分区状态闭环

- 商城收款配置的店铺列表、支付就绪度和收款账户增加独立请求代次、旧数据清理、持久错误与重试；店铺加载失败会清除选中店铺和全部旧收款资料，配置检测与账户保存复核原店铺，账户保存同时冻结账户 ID 和 provider。
- 商城支付日志由单个八接口 `Promise.all` 拆成支付流水、支付回调、退款日志、佣金组和渠道账单五分区；刷新开始清空对应旧数据。佣金明细、摘要、推广人和调整流水使用 `Promise.allSettled`，允许部分成功并逐项显示失败来源。
- 佣金单笔/批量结算、风险复核、扣回和渠道账单拉取/导入/认领/重勾兑/解决/忽略均在提交前复核记录 ID、订单或交易号、店铺、筛选上下文和列表代次；写操作或导出期间全部范围筛选锁定。
- 店铺 #38 正常读取支付流水 48、支付回调 1、退款日志 18、佣金明细 14、渠道账单 5。停止 API 后五分区及汇总全部归零，分别显示 HTTP 502，佣金错误明确列出四个失败来源；恢复后五个独立重试入口完整回归。
- 收款配置页故障时店铺、选中店铺和账户旧数据清空，恢复后店铺 #38、就绪度和账户区完整回归。支付就绪度如实显示正式微信证书未配置，不将本地状态误报为生产通道通过。
- 浏览器只打开“拉取渠道账单”确认弹窗并取消；弹窗期间租户/店铺/日期/状态筛选全部禁用，取消后恢复，未提交资金写操作。390x844 两页均为 `375/375`，标题完整；截图位于 `.local-logs/mall-payment-state-20260721/`，报告见 `docs/mall-payment-state-acceptance-20260721.md`。
- `menu-integrity.spec.ts` 30/30，API 全量 158 文件 916 项；完整 `ci:verify` 131.7 秒退出 0，运行时 high/critical 0，全部 preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 539、课程 93、商城 815、钱包流水 471、结算 26）、readiness `ready=true/blockingCount=0`、`git diff --check` 通过；浏览器恢复 `showcase_admin / Qiwai123456` 工作台。下一工作包进入商城营销中心及其余 PC 长尾页面。

## 2026-07-21 02:25 - 11.01.83（计划表 11.01.64）：商城营销中心状态与权限提示闭环

- 营销中心将店铺/平台目录、优惠券及使用记录、秒杀、拼团及参团、推广代理及推广码、风控事件及告警、佣金规则拆为独立读取边界；请求开始和失败清除旧数据，请求代次阻止迟到响应覆盖当前范围。
- 运营账号读取平台商品目录被数据范围拒绝时，错误现与店铺必需目录分流；店铺券正常态不再显示全局红色错误，仅选择平台券时显示平台范围不完整提示。
- 启停、风险处置、佣金规则停用和表单保存均复核原记录、店铺、筛选及列表代次，写操作期间锁定范围。
- 浏览器正常态为优惠券 6、秒杀 1、拼团 48、推广码 2；停止 API 后四项汇总归零、旧券码清除并显示分区 502，恢复后完整回归。打开 `BOUNDARY0716055523` 启用确认后取消，优惠券仍为停用，未写入业务状态。
- 390x844 下页面为 `375/375`，标题 323x31px，控制台 warning/error 0；截图位于 `.local-logs/mall-marketing-state-20260721/`，报告见 `docs/mall-marketing-state-acceptance-20260721.md`。
- `menu-integrity.spec.ts` 31/31；完整 `ci:verify` 131 秒退出 0，运行时 high/critical 0，全部 preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/blockingCount=0`，API/MySQL healthy，`git diff --check` 退出 0；浏览器恢复 `showcase_admin` 工作台。计划表总体阶段摘要已按明细验收事实同步，下一批继续其余 PC 长尾页面。

## 2026-07-21 02:37 - 11.01.84（计划表 11.01.65）：商城物流状态与跨店铺写操作闭环

- 商家、授权店铺和物流公司读取增加独立请求代次；物流响应绑定租户、店铺、关键词及启停状态，读取开始和失败均清空旧行，迟到响应不再覆盖当前范围。
- 编辑表单及启停操作冻结物流公司、租户、店铺、筛选和列表代次，确认后重新从当前列表取值并复核目标；写操作期间锁定全部顶部范围控件。
- 店铺 #38 正常显示顺丰、中通、京东 3 条且全部启用。停止 API 后列表和 3/3 汇总立即清零，随后显示持久 HTTP 502；恢复 API 后点击独立重试，3 条数据完整回归。
- 只打开顺丰停用确认并取消，顺丰仍为启用，未写入物流状态。390x844 下页面 `375/375`、标题 323x31px，控制台 warning/error 0；截图位于 `.local-logs/mall-logistics-state-20260721/`。
- `menu-integrity.spec.ts` 32/32；完整 `ci:verify` 130.5 秒退出 0，运行时 high/critical 0，全部 preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/blockingCount=0`，API/MySQL healthy，差异格式检查退出 0。报告见 `docs/mall-logistics-state-acceptance-20260721.md`；浏览器恢复 `showcase_admin` 工作台，下一批继续商城分类及其余 PC 长尾页面。

## 2026-07-21 02:51 - 11.01.85（计划表 11.01.66）：商城分类状态与原地编辑目标保护闭环

- 商家、授权店铺和分类读取增加独立请求代次；分类响应绑定租户、店铺、状态和关键词，读取开始及失败均清空旧行，迟到响应不能覆盖当前范围。
- 分类总数、启用数、停用数和覆盖店铺数全部由当前列表计算，故障时随列表同步归零；新增和原地编辑保存冻结分类 ID、租户、店铺、筛选及列表代次，写请求期间锁定顶部范围控件。
- 店铺 #38 正常态为 `5/5/0/1`。停止 API 后对“书院文创”执行无改值保存，23 个输入及 12 个按钮锁定；请求失败且分类名称、`2026/7/14 04:02:19` 更新时间均保持原值。
- 继续在 API 停止状态点击刷新，四项汇总立即归零并显示 HTTP 502；恢复后点击独立重试，5 个分类完整回归。390x844 下页面 `375/375`、标题 323x31px，控制台 warning/error 0。
- 首轮完整 CI 的 158 文件、919 项测试通过，但商城预检要求分类更新路径保留 `${row.id}` 源码表达；在目标快照和提交前复核不变的前提下等价恢复，专项 33/33、商城预检及完整 `ci:verify` 重跑 130.7 秒退出 0。
- 最终运行时 high/critical 0，全部 preflight 与 Shared/API/PC/H5/微信小程序构建通过；监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/blockingCount=0`，API/MySQL healthy，差异格式检查退出 0。
- 报告见 `docs/mall-category-state-acceptance-20260721.md`，截图位于 `.local-logs/mall-category-state-20260721/`；浏览器恢复 `showcase_admin` 工作台，下一批继续公告、营销弹窗及其余 PC 长尾页面。

## 2026-07-21 03:08 - 11.01.86（计划表 11.01.67）：公告与营销弹窗状态闭环

- 公告列表/选项和营销弹窗列表/选项分别增加请求代次、范围快照、响应结构校验及失败清空；列表总数同步归零，迟到响应不能覆盖当前租户、筛选或分页。
- 公告与弹窗的新增/编辑、快捷状态操作和删除冻结记录、租户、筛选及列表代次，提交或确认后再次复核；编辑抽屉、上传和写请求期间锁定顶部范围，既有记录归属不可在编辑时改变。
- 弹窗生效检测增加独立请求代次，绑定检测记录、租户、页面、平台和当前列表；新检测先清空旧结果，迟到结果不再回写。
- 浏览器正常态公告 12 条、弹窗 8 条；首页/H5 生效检测命中权限验收弹窗并返回 8 条明细。停止 API 后公告选项/列表和弹窗列表分别显示 HTTP 502，两页均为 `Total 0` 且旧数据消失；恢复后独立重试回到 12/8。
- 两页首条编辑抽屉只打开后取消，公告 3 个、弹窗 4 个筛选输入锁定，未写业务数据。390x844 两页均 `375/375`，控制台 warning/error 0；截图位于 `.local-logs/announcement-popup-state-20260721/`。
- 专项 2 文件 9 项、完整 `ci:verify` 131 秒退出 0，API 158 文件 921 项、运行时 high/critical 0、全部 preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/blockingCount=0`，API/MySQL healthy，差异格式检查退出 0。报告见 `docs/announcement-popup-state-acceptance-20260721.md`；浏览器恢复 `showcase_admin` 工作台，下一批继续广告中心及其余 PC 长尾页面。

## 2026-07-21 04:01 - 11.01.87（计划表 11.01.68）：广告中心状态闭环

- 广告主、合同、广告计划、结算和经营汇总五个远程分区补独立错误重试、请求代次、范围快照和失败清空；写操作冻结记录、租户、筛选和列表代次，抽屉与确认期间锁定顶部范围，既有广告主、合同和投放计划禁止变更归属。
- 正常态真实数据为投放 13、广告位 8、广告主 6、合同 10、结算 8；经营汇总曝光 13、点击 2、CTR 15.38%、自有收入 3.40 元、官方收入 278.32 元、总收入 281.72 元。
- 受控停止 API 后刷新，五个远程分区分别显示 HTTP 502 和独立重试，本地广告位仍显示 8 行；API 恢复 healthy 后逐项点击重试，全部真实数量和经营汇总恢复。
- 打开首条广告计划编辑抽屉时关键词、刷新、投放筛选和标签切换均锁定，取消后无写入。390x844 初验无横向溢出；浏览器发现投放平台复选框旧 `label` API 产生 3 条 Element Plus 弃用告警，改为 `value`、构建发布后用新页面复验 `390/390` 且 warning/error 0。
- 专项 1 文件 5 项、PC 类型检查与构建通过；完整 `ci:verify` 173.2 秒退出 0，运行时 high/critical 0，全部测试、preflight 和全端构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/blockingCount=0`，API/MySQL healthy，差异格式检查退出 0。报告见 `docs/ad-center-state-acceptance-20260721.md`，截图位于 `.local-logs/ad-center-state-20260721/`；浏览器恢复 `showcase_admin` 工作台，下一批继续其余 PC 长尾页面。

## 2026-07-21 05:03 - 11.01.88（计划表 11.01.69）：收款方式状态闭环

- 商家选项、代理列表和支付账户拆为独立 loading、错误与重试；读取开始和失败均清空旧数据及汇总，三类请求增加代次保护，代理与账户绑定租户、关键词、渠道、停用筛选、页码和当前代理快照。
- 代理和账户保存冻结目标记录、租户、筛选及列表代次，提交前复核目标；编辑既有账户时代理与支付渠道只读且函数层再次拒绝迁移。抽屉、保存和加载期间锁定范围控件、分页、代理选择、刷新与行操作。
- 正常态代理 39、启用 39；验收代理账户 1、启用 1。停止 API 后刷新，商家选项与代理列表分别显示 HTTP 502，五项汇总归零；恢复后独立重试回到 39/39。
- 第二次受控停止 API 时仅切换代理触发账户读取，代理列表 20 行保持，支付账户清零并独立显示 HTTP 502；恢复后“重试支付账户”回到 1/1。编辑弹窗打开后筛选锁定、代理与渠道只读，取消无写入。
- 390x844 下页面 `390/390`，控制台 warning/error 0；专项 2 文件 9 项与 PC 构建通过。完整 `ci:verify` 170.4 秒退出 0，运行时 high/critical 0，全部测试、preflight 和全端构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/blockingCount=0`，API/MySQL healthy，差异格式检查退出 0。报告见 `docs/payment-account-state-acceptance-20260721.md`；浏览器恢复 `showcase_admin` 工作台，下一批继续其余 PC 长尾页面。

## 2026-07-21 06:03 - 11.01.89（计划表 11.01.70）：代理结算状态闭环

- 结算选项、列表、自动打款能力和详情增加独立请求代次；列表与能力读取开始和失败清空旧数据，四项列表汇总同步归零，迟到响应不能覆盖当前筛选或详情目标。
- 生成结算冻结代理、筛选和列表代次；提交、通过、拒绝、沙箱转账与打款登记复核当前结算状态、范围和代次；回执扫描绑定当前范围，导出补齐租户、代理、关键词和状态筛选。
- 弹窗、详情抽屉、能力评估、导出或写操作期间锁定顶部动作、筛选、分页和行操作；生成和打款保存期间禁止关闭弹窗。
- 正常态结算 6、已打款 4；能力评估启用代理 39、支付账户 6、缺账户代理 33。停止 API 后列表/汇总和能力分别清空并显示 HTTP 502，恢复后独立重试全部回归。
- 生成弹窗打开后刷新、评估、扫描、导出、生成及筛选全部锁定，取消无写入。390x844 下页面 `375/375`、标题 31px，控制台 warning/error 0。
- 专项 2 文件 10 项通过。首轮完整 CI 因转账预检固定要求 `${row.id}` 路径表达失败，目标状态复核不变地等价恢复后，代理转账预检和完整 `ci:verify` 164 秒均退出 0。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`、readiness `ready=true/blockingCount=0`，API/MySQL healthy，差异格式检查退出 0。报告见 `docs/agent-settlement-state-acceptance-20260721.md`；浏览器恢复工作台，下一批继续其余 PC 长尾页面。

## 2026-07-21 06:24 - 11.01.90（计划表 11.01.71）：课程退款状态闭环

- 退款列表增加请求代次及课程、状态、关键词和分页快照；读取开始、响应结构异常或失败时清空旧行、总数与总计/待审核/处理中/失败四项汇总，迟到响应不能覆盖当前筛选。
- 课程 ID 只接受正整数；审核和结果确认冻结退款记录、当前状态、筛选及列表代次，确认后再次复核当前行。确认框打开即锁定刷新、筛选、查询、分页和全部行操作。
- 浏览器正常态为退款 15、待审核 1、处理中 0、失败 0；课程 ID `abc` 被客户端阻止。停止 API 后行与汇总全部归零并显示 HTTP 502，恢复后独立重试完整回归。
- 打开待审核退款通过确认框后验证全部范围锁定，点击 `Cancel` 取消，未改变退款数据。390x844 下页面 `375/375`、标题 31px，控制台 warning/error 0；截图位于 `.local-logs/course-refund-state-20260721/mobile.png`。
- PC 构建、专项 3 文件 15 项通过；完整 `ci:verify` 131.2 秒退出 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 330、课程 91、商城 815、钱包流水 463、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，差异格式检查退出 0。报告见 `docs/course-refund-state-acceptance-20260721.md`；浏览器恢复 `showcase_admin` 工作台，下一批继续其余 PC 长尾页面。

## 2026-07-21 06:36 - 11.01.91（计划表 11.01.72）：业务任务状态闭环

- 任务列表增加请求代次及状态、类型、关键词和分页快照；读取开始、响应结构异常或失败时清空旧任务和 total，并校验 `items/total/page/pageSize`，迟到响应不能覆盖当前范围。
- 重放、取消在确认后复核任务仍在当前列表、状态未变化、筛选与列表代次一致；函数层限制死信重放和待执行/死信取消。手工扫描同样复核确认前后的范围，确认或写操作期间锁定筛选、重试和分页。
- 浏览器正常态为任务 128、首屏 20 条；停止 API 后列表清空、分页归零为 `Total 0` 并持久显示 HTTP 502，恢复后点击独立重试完整回归。
- 当前租户待执行和死信任务均为 0；为保留数据未制造任务或执行取消/重放，行级目标复核由专项合同覆盖。390x844 为 `390/390`、标题 31px，控制台 warning/error 0；截图位于 `.local-logs/business-job-state-20260721/mobile.png`。
- PC 构建和专项 3 文件 68 项通过；完整 `ci:verify` 177.7 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 330、课程 91、商城 815、钱包流水 463、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，差异检查无空白错误。报告见 `docs/business-job-state-acceptance-20260721.md`；浏览器恢复工作台，下一批继续其余 PC 长尾页面。

## 2026-07-21 06:55 - 11.01.92（计划表 11.01.73）：上线体检状态闭环

- 配置体检每轮读取增加请求代次；请求开始、响应异常或失败时清空上一轮总体结论、十项汇总和配置明细，并校验总体状态、汇总对象与检查项数组。
- 390px 窄屏下头部、错误恢复和汇总卡改为纵向布局，不修改配置判定规则、配置值或后端口径。
- 平台账号正常态读取 56 项：正常 45、待确认 11、阻断 0、上线前确认 6、按需确认 5。停止 API 后十项汇总和 56 条明细立即清空，请求完成后持久显示 HTTP 502 与“重试体检”；恢复后完整回归。
- 390x844 为 `375/375`、标题 31px，控制台 warning/error 0；截图位于 `.local-logs/config-check-state-20260721/mobile.png`。验收后恢复 `showcase_admin` 工作台。
- PC 构建和专项 3 文件 8 项通过；完整 `ci:verify` 146.8 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 330、课程 91、商城 815、钱包流水 463、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，差异检查无空白错误。报告见 `docs/config-check-state-acceptance-20260721.md`，下一批继续其余 PC 长尾页面。

## 2026-07-21 07:18 - 11.01.93（计划表 11.01.74）：后台登录日志状态闭环

- 登录日志列表绑定账号、状态、商家筛选快照和请求代次；读取开始、响应结构异常或失败时清空旧行、总数及成功/失败/限流汇总。商家选项独立增加请求代次、失败清空和响应校验。
- 导出冻结账号、状态和商家筛选；导出期间锁定刷新、筛选、查询、重置和重试入口，权限化敏感字段与服务端脱敏规则保持不变。
- 平台账号正常态为日志 3014、成功 2938、失败 76、限流 0，商家选项 94。停止 API 后日志和四项汇总归零并显示 HTTP 502；故障态重载后商家选项与日志分别显示 502，旧商家范围和日志均未残留；恢复后完整回归。
- 390x844 为 `375/375`、标题 31px，控制台 warning/error 0；截图位于 `.local-logs/login-log-state-20260721/mobile.png`。未执行导出下载或修改日志，最终恢复 `showcase_admin` 工作台。
- PC 构建和专项 3 文件 39 项通过；完整 `ci:verify` 206 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 330、课程 91、商城 815、钱包流水 463、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，差异检查无空白错误。报告见 `docs/login-log-state-acceptance-20260721.md`，下一批继续其余 PC 长尾页面。

## 2026-07-21 08:08 - 11.01.94（计划表 11.01.75）：H5 验证码日志状态闭环

- 验证码日志读取绑定手机号、状态、模式筛选快照和请求代次；读取开始、响应结构异常或失败时清空旧行、总数和成功/失败/限流汇总，并校验 `items/total/summary`。
- 导出冻结当前筛选，导出期间锁定刷新、筛选、查询、重置和重试；手机号、IP 和服务商消息号的权限与脱敏规则保持不变。
- 平台账号正常态为日志 278、成功 274、失败 2、限流 2。停止 API 后日志行和四项汇总全部归零；恢复后完整回归。未触发验证码发送、导出或修改日志。
- 390x844 为 `375/375`、标题 31px，控制台 warning/error 0；截图位于 `.local-logs/h5-code-log-state-20260721/mobile.png`。最终恢复 `showcase_admin` 工作台。
- PC 构建和专项 3 文件 39 项通过；完整 `ci:verify` 158.7 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 330、课程 91、商城 815、钱包流水 463、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，差异检查无空白错误。报告见 `docs/h5-code-log-state-acceptance-20260721.md`，下一批继续其余 PC 长尾页面。

## 2026-07-21 08:30 - 11.01.95（计划表 11.01.76）：操作日志状态闭环

- 操作日志读取绑定商家、动作、管理员、请求编号、日期、页码和页大小快照及请求代次；读取开始、日期非法、响应结构异常或失败时清空旧行和 total。商家选项独立增加请求代次、失败清空与响应校验。
- 导出冻结全部当前筛选；读取或导出期间锁定商家及明细筛选、刷新、查询、重置、重试和分页，终端敏感字段权限与脱敏规则保持不变。
- 平台账号正常态 5778 条、首屏 30 条。停止 API 并重载后清空至 `Total 0`，商家选项和日志分别持久显示 502；恢复后为 5779 条，新增 1 条是本轮平台账号重新登录产生的正常审计记录。
- 390x844 为 `375/375`、标题 31px，控制台 warning/error 0；截图位于 `.local-logs/operation-log-state-20260721/mobile.png`。未执行导出或业务写操作，最终恢复 `showcase_admin` 工作台。
- PC 构建和专项 3 文件 40 项通过；完整 `ci:verify` 133.2 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 330、课程 91、商城 815、钱包流水 463、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，差异检查无空白错误。报告见 `docs/operation-log-state-acceptance-20260721.md`，下一批继续其余 PC 长尾页面。
- 剩余周期：本地 P0-P3 长尾、最终回归和交付包预计 7-14 小时；正式支付、短信、对象存储、生产域名证书、微信真机和灰度等外部终验另计。

## 2026-07-21 08:31 - 11.01.96（计划表 11.01.77）：定位命中日志状态闭环

- 商家选项、定位汇总和日志列表拆分为独立 loading、持久错误、请求代次和重试；请求开始、结构异常或失败时分别清空对应旧数据，列表 total 和汇总指标/Top 表同步清空。
- 日志和汇总绑定商家、命中状态、日期及来源筛选快照；非法日期清空列表与汇总，查询分别刷新两类业务数据，导出冻结当前筛选，读取或导出期间锁定筛选、刷新、重试和分页。
- 平台正常态为 27 个商家选项、10 条日志、首屏 10 条；汇总 10 次请求、7 次命中、3 次未命中、70.0%。停止 API 并重载后，商家、汇总、日志三分区全部清空并分别持久显示 HTTP 502；恢复 healthy 后逐个点击三路重试，真实数据完整回归。
- 390x844 为 `375/375`、标题完整，控制台 warning/error 0；截图位于 `.local-logs/tenant-region-hit-log-state-20260721/mobile.png`。未执行导出或业务写操作，既有权限报告、日志、账号和审计数据均保留；最终恢复 `showcase_admin` 工作台。
- PC 构建和专项 3 文件 39 项通过；完整 `ci:verify` 132.1 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 539、课程 93、商城 815、钱包流水 471、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，差异检查无空白错误。报告见 `docs/tenant-region-hit-log-state-acceptance-20260721.md`。
- 剩余周期：本地 P0-P3 长尾、最终回归和交付包预计 6-12 小时；正式支付、短信、对象存储、生产域名证书、微信真机和灰度等外部终验另计。

## 2026-07-21 08:43 - 11.01.97（计划表 11.01.78）：区域保护状态闭环

- 商家选项和区域列表拆为独立 loading、持久错误、请求代次、响应校验与重试；顶部刷新用 `Promise.allSettled` 并行刷新，商家筛选只刷新列表，列表绑定筛选快照且读取开始、异常或失败时清空旧区域。
- 新增/编辑、审批、删除和批量导入冻结区域 ID、授权状态、当前筛选和列表代次，确认后再次复核目标；编辑既有区域时所属商家只读且函数层拒绝迁移，读写、编辑或导入弹窗期间锁定范围和行操作。
- 平台正常态为 45 个商家选项、20 条区域、待审批 1 条。打开“演示城市核心区”编辑弹窗确认归属锁定并取消；打开待审批区域批准提示后点击 `Cancel`，该区域仍为待审批，均未写业务数据。
- 停止 API 并重载后，商家选项和区域列表分别清空并持久显示 HTTP 502；恢复 healthy 后逐项重试，45 个商家选项、20 条区域和 1 条待审批记录完整回归。
- 390x844 为 `375/375`、标题完整，控制台 warning/error 0；截图位于 `.local-logs/tenant-region-state-20260721/mobile.png`。既有权限报告、账号、围栏、授权和审计数据均保留；最终恢复 `showcase_admin` 工作台。
- PC 构建和专项 3 文件 12 项通过；完整 `ci:verify` 132 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 539、课程 93、商城 815、钱包流水 471、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，差异检查无空白错误。报告见 `docs/tenant-region-state-acceptance-20260721.md`。
- 剩余周期：本地 P0-P3 长尾、最终回归和交付包预计 5-10 小时；正式支付、短信、对象存储、生产域名证书、微信真机和灰度等外部终验另计。

## 2026-07-21 08:55 - 11.01.98（计划表 11.01.79）：候补名单状态闭环

- 活动选项和候补列表拆为独立 loading、持久错误、请求代次、响应校验与重试；列表绑定活动、状态、页码和页大小快照，请求开始、结构异常或失败时清空旧行和 total，首次加载用 `Promise.allSettled` 并行读取两区。
- 补位和取消冻结候补 ID、当前状态、筛选及列表代次，确认后再次复核目标仍在当前列表且仍为候补中；读取、确认或写入期间锁定筛选、重试、分页和全部行操作。
- `showcase_admin` 正常态为候补 1 条，记录 `#11`，活动 `候补权限验收-waitlist-permission-1784371870367`，敏感字段继续脱敏。打开取消确认后范围和操作均锁定，点击“返回”后记录仍为候补中且无写入。
- 停止 API 并重载后旧行和 `Total 1` 立即清空，活动选项与候补列表分别持久显示 HTTP 502；恢复 healthy 后分别重试，1 条候补及 `Total 1` 完整回归。
- 390x844 为 `390/390`、标题完整，控制台 warning/error 0；截图位于 `.local-logs/waitlist-state-20260721/mobile.png`。既有权限账号、活动、候补、并发结果和审计数据全部保留；最终恢复 `showcase_admin` 工作台。
- PC 生产构建 39.7 秒通过；并行包装进程在成功构建后触发 Windows Node `UV_HANDLE_CLOSING` 断言，串行专项复跑 3 文件 38 项通过，确认不是源码或构建失败。完整 `ci:verify` 130.8 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 539、课程 93、商城 815、钱包流水 471、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，差异检查无空白错误。报告见 `docs/waitlist-state-acceptance-20260721.md`。
- 剩余周期：本地 P0-P3 长尾、最终回归和交付包预计 4-8 小时；正式支付、短信、对象存储、生产域名证书、微信真机和灰度等外部终验另计。

## 2026-07-21 09:15 - 11.01.99（计划表 11.01.80）：活动评价与举报状态闭环

- 活动选项、评价列表和待处理举报拆为独立 loading、持久错误、请求代次、响应校验与重试；评价绑定活动、状态和页码快照，举报绑定 pending 状态和页码快照，请求开始、结构异常或失败时清空旧选项、旧行和 total。
- 精选、显示/隐藏和举报处置冻结目标 ID、原状态、关联评价、筛选及列表代次，弹窗确认后再次复核；任一读取、确认或写入期间锁定筛选、分页、重试及评价和举报的全部行操作。
- `showcase_admin` 正常态为活动选项 45、评价 6、待处理举报 2，页面识别 8 处脱敏手机号。对举报“浏览器待处理举报验收 20260716122208”打开驳回提示后全页范围锁定，点击取消后仍为 `Total 6 / Total 2` 且无写入。
- 停止 API 并重载后旧评价、旧举报和分页总数立即清空，三分区分别持久显示 HTTP 502；浏览器发现错误态仍显示“暂无数据”，现整改为“评价加载失败/举报加载失败”。恢复 healthy 后逐项点击三路重试，全部真实数据完整回归。
- 390x844 为 `375/375`，两张业务卡片均为 `325/325`、标题 96x31，控制台 warning/error 0；截图位于 `.local-logs/review-state-20260721/mobile.png`。既有权限账号、评价、举报、并发结果和审计数据全部保留；最终恢复 `showcase_admin` 工作台。
- PC `vue-tsc` 与生产构建通过，最终构建 39.3 秒、1947 个模块；专项 2 文件 8 项通过。完整 `ci:verify` 171.8 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 539、课程 93、商城 815、钱包流水 471、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，完整差异检查无空白错误。报告见 `docs/review-state-acceptance-20260721.md`。
- 剩余周期：本地 P0-P3 长尾、最终回归和交付包预计 3-6 小时；正式支付、短信、对象存储、生产域名证书、微信真机和灰度等外部终验另计。

## 2026-07-21 09:27 - 11.01.100（计划表 11.01.81）：票种管理状态闭环

- 活动选项和票种列表拆为独立 loading、持久错误、请求代次、响应校验与重试；票种响应绑定当前活动筛选快照，请求开始、结构异常或失败时清空旧选项和旧票种，顶部刷新用 `Promise.allSettled` 并行读取两区。
- 新建/编辑冻结活动筛选和票种列表代次，编辑额外冻结票种 ID 与原活动 ID；既有票种所属活动在界面只读且函数层拒绝迁移，保存前再次复核当前目标。读取、弹窗或保存期间锁定新建、筛选、刷新和全部编辑入口。
- `showcase_admin` 正常态为活动选项 45、票种 13。打开保留票种 `#58 / 票种权限验收-category-ticket-permission-1784365061211-已更新` 后活动归属锁定，顶部和 13 个行操作禁用；取消后票价 13.45、容量 20、限购 3、会员价 10.50 和启用状态保持不变。
- 停止 API 并重载后旧活动选项和 13 条票种立即清空，两分区分别持久显示 HTTP 502，票种表格明确显示“票种加载失败”；恢复 healthy 后逐项点击两路重试，45 个选项和 13 条票种完整回归。
- 390x844 为 `375/375`，业务卡片 `325/325`、标题 96x31，控制台 warning/error 0；截图位于 `.local-logs/ticket-type-state-20260721/mobile.png`。既有权限账号、票种、分类、活动选项和审计数据全部保留；最终恢复 `showcase_admin` 工作台。
- PC `vue-tsc` 与生产构建 39.4 秒通过，1947 个模块；专项 2 文件 6 项通过。完整 `ci:verify` 131.8 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 539、课程 93、商城 815、钱包流水 471、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，完整差异检查无空白错误。报告见 `docs/ticket-type-state-acceptance-20260721.md`。
- 剩余周期：本地 P0-P3 长尾、最终回归和交付包预计 2-5 小时；正式支付、短信、对象存储、生产域名证书、微信真机和灰度等外部终验另计。

## 2026-07-21 09:54 - 11.01.101（计划表 11.01.82）：商家资料状态闭环

- 商家资料读取增加请求代次、响应结构校验和失败清空；请求开始、结构异常或失败时清空旧 profile、四字段表单、已保存快照和保存错误，资料头与表单仅在有效响应后挂载。
- 保存前冻结规范化表单、商家 ID、编码和读取代次，确认后再次复核；确认框出现前设置 confirming 锁，读取、确认或保存期间锁定刷新、四个字段、恢复原值和保存。保存响应再次校验结构、ID 和编码后才回填。
- `showcase_admin` 正常态为名称 `慢π演示中心`、编码 `qiwai-showcase`、地区 `演示城市`、联系人 `慢π演示运营`、电话 `13990009999`。临时修改联系人后打开保存确认，全部范围锁定；点击“再检查一下”并恢复原值后保存按钮重新禁用，未写资料。
- 停止 API 并重载后资料头和表单立即清空，HTTP 502 后仅显示“重新加载”，未残留名称、联系人或伪启停状态；恢复 healthy 后点击重试，全部资料完整回归。
- 390x844 为 `375/375`，业务卡片 `325/325`，控制台 warning/error 0；截图位于 `.local-logs/tenant-profile-state-20260721/mobile.png`。既有最小权限账号、资料和审计数据全部保留；最终恢复 `showcase_admin` 工作台。
- 首轮专项中状态合同通过，菜单完整性合同仍固定旧取消与禁用表达式；合同升级到 confirming/scopeLocked 语义后，专项 2 文件 35 项通过。PC `vue-tsc` 与生产构建 40.1 秒通过，1947 个模块；完整 `ci:verify` 131.7 秒退出 0，运行依赖 high/critical 0，全部测试、preflight 与 Shared/API/PC/H5/微信小程序构建通过。
- 最终监控 `status=ok/alerts=0`、统一资金 `healthy=true/issueCount=0`（活动 539、课程 93、商城 815、钱包流水 471、结算 26）、readiness `ready=true/blockingCount=0`；API/MySQL healthy、Nginx running，完整差异检查无空白错误。报告见 `docs/tenant-profile-state-acceptance-20260721.md`。
- 剩余周期：本地最终核对、回归和交付候选组装预计 1.5-4 小时；正式支付、短信、对象存储、生产域名证书、微信真机和灰度等外部终验另计。

## 2026-07-21 10:22 - 最终本地回归、备份与 r32 交付候选

- 生成数据库备份 `activity_registration-20260721-095916.sql.gz`，2,055,476 bytes，完整解压 25,186,322 bytes，SHA-256 `8D9A3F7497448DB06B611166402F43CC333BCFB341E69F22FE9B836341FBD87E`；生成私有数据备份 `private-data-20260721-095920.tar.gz`，21,165,379 bytes、46 个条目，SHA-256 `F1697FED5F9DF5C743972EC1C512735CC45B74595078616F20E6C85FDD062621`。
- 最终角色审计复跑通过：10 个后台角色、4 个会员角色、22 个允许检查和 9 个拒绝检查；结果 `.local-logs/final-role-account-audit-1784599225393/result.json`。
- release audit 的 doctor、完整 preflight、172 个 API 文件/978 项测试、完整 Web/微信小程序构建、在线浏览器和移动管理浏览器 8 个命令全部通过；唯一 P2 warning 为按要求保留的 1049 个未提交持续开发文件，命令失败 0、检查失败 0、阻塞 0。
- 从空目录组装 `delivery/activity-registration-candidate-20260721-r32.zip`，使用上述最新备份；Manifest 3,106 个文件、ZIP 3,238 个条目、敏感路径 0，候选 source 全部 preflight 独立通过。ZIP 33,250,235 bytes，SHA-256 `4A34CA3540006317413476C1C5E6A398A5D426A0D590DBC0A46AAB852EBDDEC0`。
- 本地 P0-P3 功能开发、整改、浏览器验收、全量回归和候选交付包完成。正式支付、短信、对象存储、生产域名证书、微信真机、外部告警、生产灰度与正式签收继续作为外部验收，不伪标完成。
- 剩余周期：本地仅余交付包校验命令和最终索引复核，预计 0.5-1.5 小时；外部终验周期取决于配置与生产窗口。

## 2026-07-21 10:25 - r32 交付包正式校验与本地开发收口

- `npm run verify:delivery-package -- delivery/activity-registration-candidate-20260721-r32.zip` 退出 0：整包大小和 SHA-256 与根目录清单一致，3,238 个 ZIP 条目无重复，8 个必需目录和 5 个源码入口完整，PC 146 个制品文件与当前构建一致。
- 候选目录 Manifest 的 3,106 个文件集合及逐文件 SHA-256 全部匹配，敏感/真实环境条目 0；候选 source 的全部 preflight guards 独立通过。
- 计划表 `13.01-13.05` 更新为本地完成或本地候选完成，正式生产配置、真机、灰度和签收继续明确列为外部验收，不伪标生产最终签收。
- 本地剩余周期：0；正式支付、短信、对象存储、域名证书、外部告警、微信真机、生产灰度和正式签收周期取决于外部配置与窗口。

## 2026-07-21 10:55 - 本地 H5 预览地址整改

- 用户测试发现活动及多类 H5 预览打开 `127.0.0.1:5273` 后连接被拒绝。根因是后台公共预览工具对所有本地主机强制使用历史开发端口，而当前 Docker/Nginx 统一入口为 `18080`。
- 预览地址现优先使用显式 `VITE_H5_ORIGIN`；后台开发端口 `5174` 映射标准 H5 开发端口 `5173`；Docker/Nginx 等部署场景跟随当前页面 origin，故本地活动、商家 H5、装修、海报、二维码和复制链接统一使用 `18080`。
- 源码合同 5 项和 PC 生产构建通过。浏览器确认首页装修显示 `http://127.0.0.1:18080/?tenantCode=qiwai-showcase#/pages/index/index`；活动 `192` 详情和慢π演示中心首页正常渲染，页面无横向溢出，控制台 warning/error 0。详见 `docs/h5-preview-origin-acceptance-20260721.md`。
- 本次本地缺陷整改剩余周期：0；r32 交付包早于本次修复，后续重新组装候选时必须包含该改动，不得继续把 r32 标记为最新源码候选。

## 2026-07-21 11:00 - H5 预览修复候选包 r33

- 从空目录组装 `delivery/activity-registration-candidate-20260721-r33.zip`，包含 H5 预览地址同源修复、回归合同及验收报告；沿用已校验的最新数据库和私有数据备份。
- r33 Manifest 3,112 个文件、ZIP 3,244 个条目、敏感路径 0；大小 33,284,710 bytes，SHA-256 `70C180E727F07E107B0A60FE5EF0B132DCA0AC388556A7249276A38A240A000E`。
- 本地功能整改与候选组装剩余周期：0；正式支付、短信、对象存储、域名证书、外部告警、微信真机、生产灰度和正式签收仍取决于外部配置与窗口。

## 2026-07-21 11:20 - 论坛底部导航整改

- 用户测试发现“我的论坛”空数据页没有底部菜单。源码确认页面未渲染 `TabBar`，且没有页面内返回入口，不是装修配置关闭导致。
- “我的论坛”现增加顶部返回、标题、刷新和统一底部导航，帖子/回复/收藏标签补键盘操作及选中语义；论坛首页和帖子详情增加底部导航。个人记录页高亮“我的”，论坛浏览页高亮“共修”；发帖编辑页保留无底栏，避免误触离开丢失输入。
- 客户端状态合同 56 项和 H5 生产构建通过。390x844 浏览器确认“我的论坛”底栏为 390x62.39 并固定在视口底部，论坛首页底栏同样可见；两页均无横向溢出，控制台 warning/error 0。详见 `docs/forum-bottom-navigation-acceptance-20260721.md`。
- 本地功能整改剩余周期：0；r33 早于本次导航修复，下一候选必须包含本次改动。

## 2026-07-21 11:25 - 论坛导航修复候选包 r34

- H5 和微信小程序生产构建通过后，从空目录组装 `delivery/activity-registration-candidate-20260721-r34.zip`，包含 H5 预览同源修复、论坛底部导航修复、回归合同和验收报告。
- r34 Manifest 3,114 个文件、ZIP 3,246 个条目、敏感路径 0；大小 33,289,941 bytes，SHA-256 `47EF62976805BA72A548FCC897DF8BF9CB80B87C84BACEBA21A66D948B39260F`。
- 本地功能整改与候选组装剩余周期：0；生产外部终验周期仍取决于配置和上线窗口。

## 2026-07-21 15:00 - Git 与服务器上传前最终发布审计

- 完整 release audit 8 个命令全部通过，0 失败、0 阻塞：doctor、全部 preflight、发布预检、174 个 API 测试文件 992 项测试、全端生产构建、小程序构建和两组浏览器验收均成功。
- 密钥扫描覆盖 1,343 个已跟踪或应提交文件，未发现私钥或常见云平台令牌；r38 正式包校验和候选 source preflight 均通过，监控 `status=ok/alerts=0`，API/MySQL healthy、Nginx running。
- 修复 Git 文件边界：忽略 `.deploy-backups`、`.local-tools`、根静态发布副本及 delivery 候选解包目录/ZIP。未删除数据库、上传文件、备份、测试账号或历史候选包，避免 `git add -A` 误加入七万余个生成文件。
- 当前 `origin` 仍指向本地镜像路径，GitHub 上传必须使用显式远端地址或重新配置远端；工作树内正式源码、迁移、测试、脚本、CI 和验收文档尚需形成完整提交。
- 详细证据见 `docs/final-release-audit-20260721.md`；本地发布审计剩余周期：仅 r39 候选组装和最终哈希登记。

## 2026-07-21 15:08 - 最终发布审计候选包 r39

- 从空目录组装 `delivery/activity-registration-candidate-20260721-r39.zip`，包含 r38 全部功能、最终发布审计报告和 Git 文件边界整改；历史候选包、数据库、私有数据和备份均保留。
- r39 Manifest 3,132 个文件、ZIP 3,264 个条目；大小 33,346,906 bytes，SHA-256 `7A8939B61CC52F5BA6CC9E852280A2870AF79E3D5098E8A19A5B3D8A889B94EC`。
- 本地发布前整改剩余周期：0；后续仅需完成 Git 提交/推送和服务器生产配置验收。

## 2026-07-21 15:23 - 生产空库演示种子保护

- 上线数据清理审计确认现有清理脚本只停用演示租户和 smoke 管理员，不适合跨支付、公益、证书及审计账本执行物理级联删除；正式上线改用全新生产数据库执行 migration，本地测试库和备份继续保留。
- 修复生产空库启动仍自动创建三类演示分类和两条英文演示活动的问题；`NODE_ENV=production` 时仅初始化默认管理员、会员等级和首页基础装修，开发环境行为不变。
- `admin.service.spec.ts` 45 项和 API production build 通过，差异检查退出 0。

## 2026-07-21 15:26 - 生产种子保护候选包 r40

- r40 Manifest 3,132 个文件、ZIP 3,264 个条目；大小 33,349,543 bytes，SHA-256 `47CCA15A0BDB77240FE1D7FF46D91D514942E59B79A3D7F777A5D6EBF99BC889`。
- r40 为当前最终候选，r39 及更早版本不再作为生产源码交付。

## 2026-07-21 16:02 - 公益贡献凭证姓名展示与预览整改

- 公开凭证继续遵守隐私边界，但默认“用户+数字”昵称由生硬的 `用****6` 改为 `用户***`；普通中文姓名保持 `张*明`，手机号保持中间四位脱敏。
- 本人下载保持完整名称；后台新增受财务角色、登录态和租户范围约束的完整姓名图片接口，响应使用 `private, no-store`。公开图片仍为脱敏版本和短时公开缓存。
- 后台预览由新窗口改为页面内图片弹窗，解决浏览器弹窗拦截导致预览打不开的问题。真实凭证公开/后台/未登录分别为 200/200/401，后台完整名称 `用户7776`，公开名称 `用户***`。
- 专项 2 文件 13 项、API/后台构建、桌面与 390×844 浏览器验收通过，无横向溢出，控制台 warning/error 0。证据见 `docs/charity-certificate-holder-privacy-acceptance-20260721.md`。

## 2026-07-21 16:05 - 公益凭证姓名整改候选包 r41

- API 全量 174 文件 993 项通过；密钥扫描 1,345 个文件无命中，监控 `status=ok/alerts=0`。
- r41 Manifest 3,134 个文件、ZIP 3,266 个条目；大小 33,354,792 bytes，SHA-256 `4077565F706B6A9DC5BA77662AE08C9A290843B1C8EE171BDFCDC30E75165129`。
- r41 为当前最终候选，r40 及更早版本不再作为生产源码交付。

## 2026-07-21 17:30 - 五类证书模板完整自定义与融合验收

- 新增统一证书模板、发布版本和证书/公益快照模型，覆盖公益贡献、公益大使、志愿服务、城市共建、课程结业五类证书；平台、商家、系统默认三级回退。
- 后台新增“证书模板”工作台，支持文字、颜色、Logo/背景/印章/签名、编号前缀、公开姓名策略、实时预览、草稿、发布、版本历史和恢复。
- 新发证书固化版本快照，历史证书首次查看固化；课程局部模板与统一视觉模板合并，公益稳定编号保持兼容。
- 新增模板查看/管理权限，并通过独立幂等迁移回填原本具备公益或课程管理能力的现有显式权限账号，不扩大财务和只读账号权限。
- 专项 104 项、API 全量 175 文件 997 项、API/后台/H5/微信小程序构建、真实平台/租户 API、桌面和 390×844 浏览器、密钥扫描及监控均通过。
- 详细证据见 `docs/credential-template-customization-acceptance-20260721.md`；本地功能开发剩余周期：仅最终复验、文档与 r42 候选组装。

## 2026-07-21 17:50 - 证书模板候选包 r42

- 从空目录组装 `delivery/activity-registration-candidate-20260721-r42.zip`，包含 r41 全部功能、五类证书模板完整自定义、两条新增迁移、最新数据库备份和融合验收文档。
- r42 Manifest 3,157 个文件、ZIP 3,291 个条目；大小 33,421,285 bytes，SHA-256 `F8D1EF2E6B7FD125D5E13680ECC8B8DAFA438D8C0EB0E6EB894CCE3978CFE254`。
- 正式 package verifier 与 candidate source preflight 均退出 0；148 个后台制品文件、8 个必需目录、5 个源码入口完整，禁入条目 0。
- 历史候选包、数据库、上传文件、私有数据、测试账号和发布历史全部保留；r42 为当前最终候选。

## 2026-07-21 18:55 - 前台装修工作台实时预览重构

- 原四栏装修页重构为页面结构、真实手机预览、模块属性三栏；高频命令留在顶部，模板、历史、复制和恢复收纳到“更多”，添加模块支持搜索与分类。
- 新增真实 H5 风格预览，覆盖 20 类模块和 375/430 设备画布；当前未保存表单会替换/追加到预览，点击预览可联动属性面板。
- 桌面和 390x844 浏览器完成布局、活动/心得卡片、模块库、设备切换、更多菜单、未保存标题实时回显测试；页面及属性面板无横向溢出，控制台 warning/error 0。
- 首次全测发现图标按钮缺少 `title`，整改后 API 全量 175 文件 998 项通过；API/后台/H5/微信小程序构建、密钥扫描和监控全部通过。
- 未保存或发布测试装修，原 22 个模块、发布历史、模板、多租户数据及底部导航隐藏规则保持不变。详细证据见 `docs/homepage-builder-live-preview-acceptance-20260721.md`。
- 本地功能整改剩余周期：仅 r43 组装与校验。

## 2026-07-21 19:05 - 装修工作台候选包 r43

- 从空目录组装 `delivery/activity-registration-candidate-20260721-r43.zip`，保留 r42、数据库、上传、私有数据、测试账号和发布历史。
- r43 Manifest 3,160 个文件、ZIP 3,294 个条目；大小 33,442,719 bytes，SHA-256 `6B5FA1AAF1F9351B1147B8B8922DAEEC68FDA780969B4D29F74FC7C06F196D31`。
- 正式 package verifier 与 candidate source preflight 均退出 0；148 个后台制品文件、8 个必需目录、5 个源码入口完整，禁入条目 0。
- r43 为当前最终候选；本地装修重构开发、融合验收与交付组装剩余周期：0。

## 2026-07-21 19:20 - 活动心得未开放提示与返回流程整改

- 修复“分享活动心得”在功能关闭时短暂 Toast 后跳首页、用户看不到原因的问题。
- 报名详情现在由后台开关控制入口：关闭时隐藏“分享活动心得”，同时开启 `community` 与 `communityPublish` 后自动显示；直接访问受限页时显示确认弹窗并优先返回上一页。
- 真实 `qiwai-showcase` 报名 `234`、390x844、控制台与返回路径验收通过；专项 62 项、API 全量 175 文件 999 项、H5/微信小程序构建、安全扫描和监控通过。
- 证据见 `docs/community-publish-disabled-flow-acceptance-20260721.md`；下一候选为 r44，不覆盖 r43。

## 2026-07-21 19:25 - 活动心得流程候选包 r44

- 从空目录组装 `delivery/activity-registration-candidate-20260721-r44.zip`；Manifest 3,162 个文件、ZIP 3,296 个条目。
- 大小 33,448,281 bytes，SHA-256 `3A91AB112FC90957E4D2B5AEFD3975AE8385A0E634D262749FE0C295A25A802B`；r43 和历史数据完整保留。
- package verifier 与 candidate source preflight 均退出 0；148 个后台制品文件、8 个必需目录、5 个源码入口完整，禁入条目 0。
- 本轮功能整改、融合测试与候选组装剩余周期：0。

## 2026-07-21 19:36 - 活动心得入口后台显隐优化

- 根据用户复核，将未开放状态从灰色提示按钮调整为直接隐藏入口；后台功能开关是唯一控制源，开启后自动恢复。
- 真实 `qiwai-showcase` 报名 `234` 验证入口数量 0，评价按钮正常，页面无溢出、控制台 0；直接链接守卫弹窗继续保留。
- 专项 61 项、API 全量 175 文件 999 项、H5/微信小程序构建通过；r44 早于本次调整，下一候选为 r45。

## 2026-07-21 19:38 - 后台显隐优化候选包 r45

- `delivery/activity-registration-candidate-20260721-r45.zip` 从空目录组装；大小 33,448,817 bytes，SHA-256 `EB37251582460484398DE40B784D1F7AD7E8A8708A83AAD3CF45E9FB0AB386C4`。
- Manifest 3,162 个文件、ZIP 3,296 个条目；r44 与历史数据完整保留。
- package verifier 与 candidate source preflight 均退出 0，禁入条目 0；r45 为当前最终候选，剩余周期 0。

## 2026-07-21 20:06 - 功能开关依赖自动联动

- 后台功能开关新增父子依赖模型：`communityPublish -> community`、`forumPost -> forum`；开启子功能自动开启父功能，关闭父功能自动关闭子功能。
- 系统设置卡片常驻显示依赖说明，运营人员无需依赖教程记忆正确组合；配置规范化也会关闭缺少父功能的孤立子开关。
- 真实后台完成开启、关闭、刷新不保存验收；桌面和 390x844 无横向溢出或文字重叠，控制台 warning/error 0，原真实配置未改变。
- API 全量 175 文件 1000 项、后台生产构建、密钥扫描、健康监控和差异检查通过；r45 早于本次整改，下一候选为 r46。

## 2026-07-21 20:08 - 功能依赖候选包 r46

- 从空目录组装 `delivery/activity-registration-candidate-20260721-r46.zip`，保留 r45、数据库、测试数据、发布记录、备份和全部历史候选包。
- r46 Manifest 3,162 个文件、ZIP 3,296 个条目；大小 33,452,093 bytes，SHA-256 `90EE17A82B0DB86A91BDA72C894578793CE25CAD15CE8C2C32E6521F53D70744`。
- r46 包含功能开关父子依赖、自动联动、配置规范化、内联说明、合同测试和浏览器验收记录；本轮本地整改与交付剩余周期 0。

## 2026-07-21 13:54 - 后台分页分类与全页面视觉巡检

- 公益后台拆分为概览、配置、项目、流水四个标签；项目客户端分页 10 条，流水服务端分页 20 条并支持关键词、类型、来源筛选，旧接口兼容保留。
- 公益贡献凭证将日期、订单号、凭证编号拆为两行，长字段安全截断，冲正水印降低干扰；真实冲正凭证可见文字碰撞数 0。
- 浏览器逐个巡检 62 个后台路由，页面级横向溢出 0。发现并整改志愿者档案 9,835px 长列表：三个标签分别分页，整改后 2,017px。
- 系统设置运营表单新增五个二级分段，桌面高度从 6,125px 降至 3,176px；管理员默认分页从 20 调整为 10。
- 公益、志愿者、系统设置在 390px 均无横向溢出，控制台 warning/error 0。专项 13 项、API 全量 174 文件 992 项、API/PC 构建和监控通过。详见 `docs/admin-workspace-pagination-audit-20260721.md`。
- 本地功能整改剩余周期：0；下一候选为 r38，不覆盖 r37。

## 2026-07-21 13:58 - 后台分页分类巡检候选包 r38

- 从空目录组装 `delivery/activity-registration-candidate-20260721-r38.zip`，保留 r37 和全部历史数据、备份、测试账号及交付包。
- r38 Manifest 3,130 个文件、ZIP 3,262 个条目、敏感路径 0；大小 33,339,969 bytes，SHA-256 `7F319FF7E8817932F9A52D83A2882CC595A77AD0D480BB28D7EEB7CAE156257B`。
- 正式 package verifier 退出 0，外层校验、包内逐文件 Manifest、146 个 PC 制品文件、8 个必需目录和 5 个源码入口全部通过。
- 本地功能整改与候选组装剩余周期：0；生产外部终验周期仍取决于配置和上线窗口。

## 2026-07-21 12:38 - 公益贡献凭证完整交付

- 公益池新增“公益贡献凭证”，严格说明公益金由平台从订单收入计提，非用户额外捐款或公益捐赠票据；凭证支持稳定编号、成品 SVG、本人下载、公开脱敏图片与公开验真。
- 退款冲回后按同订单公益账本净额自动显示有效、已调整或已冲正。真实样本 `MPCG20260718-000152-7F0EF82D` 已显示 `reversed`。
- 真实接口验收发现并修复 TypeORM eager 关系超过 MySQL 61 表限制，凭证查询现仅加载用户和订单；公开验真/图片 200、本人下载 200、非本人 404。
- 后台 55 笔流水显示预览/验真；H5 测试账号 `13990000002` 显示查看、下载、验真。桌面和 390x844 无横向溢出、控制台 warning/error 0，SVG 在 390px 窗口自适应为 390x273。
- 专项 3 文件 35 项、API 全量 174 文件 989 项、API/PC/H5 生产构建和差异检查通过；监控 `status=ok/alerts=0`。详见 `docs/charity-contribution-certificate-acceptance-20260721.md`。
- 本地功能整改剩余周期：0；下一候选为 r37，不覆盖 r36。

## 2026-07-21 12:42 - 公益贡献凭证候选包 r37

- 从空目录组装 `delivery/activity-registration-candidate-20260721-r37.zip`，保留 r36、数据库、私有数据备份和全部测试数据。
- r37 Manifest 3,126 个文件、ZIP 3,258 个条目、敏感路径 0；大小 33,325,573 bytes，SHA-256 `C46F4A46CBE150C10B85DDCCC56F534AFF6FD2BCBD573C990C9098D2083D574D`。
- 正式 package verifier 退出 0：146 个 PC 制品文件、8 个必需目录、5 个源码入口完整，外层校验记录、Manifest 文件集合及逐文件哈希匹配。
- 本地功能整改与候选组装剩余周期：0；生产外部终验周期仍取决于配置和上线窗口。

## 2026-07-21 12:05 - 证书成品预览、下载与多端展示整改

- 用户实测发现志愿者证书弹窗只有表格且右侧列被裁切，H5 无自定义 `imageUrl` 时也只显示“证”字占位。现新增统一 1200x840 SVG 渲染器，覆盖志愿服务、公益大使、城市共建和课程结业证书，撤销证书带水印。
- 后台证书弹窗改为列表与成品预览双栏，增加预览、下载、公开验真和撤销入口；H5 默认使用公开脱敏证书缩略图，本人下载仍使用受登录和租户约束的完整姓名版本。文件名、XML 转义、CSP、nosniff 和缓存安全边界保留。
- 真实证书 `#41 / MPCB20260717497217` 的后台完整图和公开脱敏图均返回 200。桌面原图 1200x840、弹窗 980px、无横向溢出；390x844 弹窗 366px、画布 302x211、单列布局，控制台 warning/error 0。
- 专项 4 文件 93 项、API 全量 173 文件 982 项、API/PC/H5 生产构建、志愿凭证 preflight 和差异检查通过；监控 `status=ok/alerts=0`，API/MySQL healthy。详见 `docs/certificate-visual-experience-acceptance-20260721.md`。
- 志愿勋章和志愿服务证明是独立凭证类型，当前具备列表、状态和公开验真，独立图片版式继续列为后续体验优化。

## 2026-07-21 12:10 - 证书体验修复候选包 r36

- 从空目录组装 `delivery/activity-registration-candidate-20260721-r36.zip`；Manifest 3,122 个文件、ZIP 3,254 个条目、敏感路径 0。
- r36 大小 33,309,697 bytes，SHA-256 `72ED3E83B8C15C211FE1EB75DCF616271A691A0A1B9A7EF440D5C462856D680D`，包含此前全部修复及证书成品视觉整改。
- `npm run verify:delivery-package -- delivery/activity-registration-candidate-20260721-r36.zip` 退出 0：整包哈希匹配，146 个 PC 制品文件、8 个必需目录、5 个源码入口完整，Manifest 文件集合及逐文件哈希匹配，禁入条目 0。

## 2026-07-21 11:45 - 首页底部导航发布与隐藏回归整改

- 用户在装修草稿中停用“专题、共修”，H5 仍显示 5 项。核对草稿、发布快照和公开接口后确认：草稿已正确保存两项 `enabled=false`，但公开端仍读取 2026-07-17 的版本 `4`；装修保存成功提示错误承诺“刷新前台即可查看”，导致草稿/发布边界被误解。
- 修复公开装修候选规则：停用 `bottom_nav/my_page/inner_pages` 单例仍传到客户端作为明确停用标记，普通停用内容继续过滤，防止整块底栏因缺失而被默认配置复活。发布快照比较改为稳定 JSON 键序，修复刚发布后仍误报未发布修改。
- 后台按钮和提示统一为“保存草稿”“当前线上H5”，未发布时显示醒目警告和“立即发布到 H5”；底栏编辑提示明确保存、发布和小程序重建三阶段。
- 用户当前草稿已发布为版本 `5`，发布后 `hasUnpublishedChanges=false`。公开配置为可见“慢π、活动、我的”，隐藏“专题、共修”；390x844 H5 实屏仅渲染 3 项，底栏 390/390 固定在视口底部，无横向溢出，控制台 warning/error 0。后台装修页显示“已是发布版本”，无未发布警告。
- 专项 2 文件 5 项、API 全量 172 文件 979 项、API 构建、PC 生产构建和差异检查通过；最终监控 `status=ok/alerts=0`，API/MySQL healthy。详见 `docs/homepage-bottom-nav-publication-acceptance-20260721.md`。
- 本地功能整改剩余周期：0；r34 早于本次修复，下一候选必须包含本次改动。

## 2026-07-21 11:45 - 首页底部导航修复候选包 r35

- 从空目录组装 `delivery/activity-registration-candidate-20260721-r35.zip`，包含 H5 预览同源、论坛底栏及首页底栏草稿/发布回归修复；既有数据库、测试数据、发布版本、备份和历史候选包全部保留。
- r35 Manifest 3,116 个文件、ZIP 3,248 个条目、敏感路径 0；大小 33,297,030 bytes，SHA-256 `E6BD6472A43C9A3AC2A127C64FAAFA8C8F9DD363E3AB7FD374D231879F6EE9A4`。
- `npm run verify:delivery-package -- delivery/activity-registration-candidate-20260721-r35.zip` 退出 0：整包哈希和校验清单一致，146 个 PC 制品文件、8 个必需目录、5 个源码入口完整，Manifest 文件集合及逐文件哈希匹配，禁入条目 0。
- 本地功能整改与候选组装剩余周期：0；生产外部终验周期仍取决于配置和上线窗口。
