# 当前持续开发交接（2026-07-21 11:45 +08:00）

## 续接目标

继续依据以下文件完成 P0-P3 全部功能，不缩减范围、不清理现有测试数据、不回退脏工作树：

- `交付包-20260711/10-项目全功能分析报告.md`
- `交付包-20260711/11-全功能持续开发计划表.md`
- `DEVELOPMENT_LOG.md`

最新已归档：业务任务至商家资料 `11.01.72-11.01.82 / 11.01.91-11.01.101`、最终 release audit、角色审计、最新数据库/私有数据备份、H5 预览地址整改、论坛底栏补齐及首页底栏草稿/发布回归整改。

当前剩余周期估算：本地证书整改与 r36 候选组装剩余 0；志愿勋章/服务证明独立图片版式继续作为体验优化，正式生产外部终验取决于配置与生产窗口。

## 最新完成工作包

H5 预览地址整改已完成：

- 本地 Docker/Nginx 部署跟随当前 `http://127.0.0.1:18080` origin，不再跳转未监听的 `5273`。
- 后台开发端口 `5174` 映射标准 H5 开发端口 `5173`；正式分域部署仍优先使用 `VITE_H5_ORIGIN`。
- 源码合同 5 项、PC 生产构建、活动 `192` 详情和首页装修浏览器验收通过，warning/error 0。
- 证据见 `docs/h5-preview-origin-acceptance-20260721.md`。
- `delivery/activity-registration-candidate-20260721-r33.zip` 已从空目录组装，包含本次修复；Manifest 3,112 个文件、ZIP 3,244 个条目、敏感路径 0。
- 论坛首页、帖子详情和“我的论坛”底部导航已补齐；390x844 高亮、固定底栏、无溢出及控制台验收通过，证据见 `docs/forum-bottom-navigation-acceptance-20260721.md`。
- `delivery/activity-registration-candidate-20260721-r34.zip` 已从空目录组装，包含预览与论坛导航修复；Manifest 3,114 个文件、ZIP 3,246 个条目、敏感路径 0。
- 首页装修保存与发布已明确分离，停用 `bottom_nav/my_page/inner_pages` 单例会作为明确停用标记公开，发布快照比较使用稳定键序；当前草稿已发布为版本 `5`，H5 只显示“慢π、活动、我的”。
- 专项 2 文件 5 项、API 全量 172 文件 979 项、API/PC 构建及 390x844 浏览器验收通过，证据见 `docs/homepage-bottom-nav-publication-acceptance-20260721.md`。
- `delivery/activity-registration-candidate-20260721-r35.zip` 已从空目录组装，包含上述全部修复；Manifest 3,116 个文件、ZIP 3,248 个条目、敏感路径 0。
- 全部正式证书类型已接入 1200x840 SVG 成品图；后台具备预览、下载、验真和撤销，H5 默认显示脱敏证书缩略图。桌面与 390x844 浏览器验收、173 文件 982 项 API 回归通过，证据见 `docs/certificate-visual-experience-acceptance-20260721.md`。
- `delivery/activity-registration-candidate-20260721-r36.zip` 已从空目录组装；Manifest 3,122 个文件、ZIP 3,254 个条目、敏感路径 0。
- 公益池已增加“公益贡献凭证”：稳定编号、1200x840 自适应 SVG、本人下载、公开脱敏图片与验真、退款后自动调整/冲正；后台和 H5 入口完整。
- 修复凭证查询 eager 关系超过 MySQL 61 表限制的问题。真实接口权限和冲正状态、桌面及 390x844 浏览器、174 文件 989 项 API 全量回归、API/PC/H5 构建与监控均通过，证据见 `docs/charity-contribution-certificate-acceptance-20260721.md`。
- `delivery/activity-registration-candidate-20260721-r37.zip` 已组装并通过正式校验：33,325,573 bytes，SHA-256 `C46F4A46CBE150C10B85DDCCC56F534AFF6FD2BCBD573C990C9098D2083D574D`，Manifest 3,126 个文件、ZIP 3,258 个条目、敏感路径 0。
- 公益后台分页分类、贡献凭证文字重叠及全后台页面巡检已完成。公益四标签、志愿者三列表分页、系统设置五分段、管理员默认 10 条均已上线本地静态目录；62 路由无页面级横向溢出，证据见 `docs/admin-workspace-pagination-audit-20260721.md`。
- `delivery/activity-registration-candidate-20260721-r38.zip` 已组装并通过正式校验：33,339,969 bytes，SHA-256 `7F319FF7E8817932F9A52D83A2882CC595A77AD0D480BB28D7EEB7CAE156257B`，Manifest 3,130 个文件、ZIP 3,262 个条目、敏感路径 0。
- 最终发布审计和 Git 边界整改已打入 `delivery/activity-registration-candidate-20260721-r39.zip`：33,346,906 bytes，SHA-256 `7A8939B61CC52F5BA6CC9E852280A2870AF79E3D5098E8A19A5B3D8A889B94EC`，Manifest 3,132 个文件、ZIP 3,264 个条目、敏感路径 0。
- 生产空库演示种子保护已打入最终候选 `delivery/activity-registration-candidate-20260721-r40.zip`：33,349,543 bytes，SHA-256 `47CCA15A0BDB77240FE1D7FF46D91D514942E59B79A3D7F777A5D6EBF99BC889`，Manifest 3,132 个文件、ZIP 3,264 个条目、敏感路径 0。
- 公益凭证姓名与预览整改已打入最终候选 `delivery/activity-registration-candidate-20260721-r41.zip`：33,354,792 bytes，SHA-256 `4077565F706B6A9DC5BA77662AE08C9A290843B1C8EE171BDFCDC30E75165129`，Manifest 3,134 个文件、ZIP 3,266 个条目、敏感路径 0。
- 五类证书模板完整自定义已完成：平台/商家分级模板、草稿/预览/发布/历史恢复、素材与隐私设置、发证快照、课程模板融合和权限回填均已落地；API 全量 175 文件 997 项、全端构建、平台/租户真实 API 及桌面/移动浏览器验收通过，详见 `docs/credential-template-customization-acceptance-20260721.md`。
- `delivery/activity-registration-candidate-20260721-r42.zip` 已组装并通过 package/source 正式校验：33,421,285 bytes，SHA-256 `F8D1EF2E6B7FD125D5E13680ECC8B8DAFA438D8C0EB0E6EB894CCE3978CFE254`，Manifest 3,157 个文件、ZIP 3,291 个条目、禁入条目 0；r42 为当前最终候选。
- 前台全局装修已重构为三栏工作台：页面结构、375/430 真实 H5 风格预览、模块属性；模块库支持搜索分类，低频操作已进入“更多”，未保存草稿实时合并进预览。
- 装修重构 API 全量 175 文件 998 项、四端构建、桌面/390x844 浏览器、密钥扫描和监控均通过；未保存/发布测试装修，22 个原模块和发布数据完整。证据见 `docs/homepage-builder-live-preview-acceptance-20260721.md`。
- 下一步仅组装并校验 `20260721-r43`，不得覆盖 r42；r43 完成后更新本文件和校验清单。当前本地开发剩余周期：交付包收尾。
- `delivery/activity-registration-candidate-20260721-r43.zip` 已组装并通过 package/source 正式校验：33,442,719 bytes，SHA-256 `6B5FA1AAF1F9351B1147B8B8922DAEEC68FDA780969B4D29F74FC7C06F196D31`，Manifest 3,160 个文件、ZIP 3,294 个条目、禁入条目 0；r43 为当前最终候选。
- 本轮装修工作台重构、本地融合测试、全量回归和交付组装全部完成，剩余周期 0；下一步为用户 Git 上传与生产环境外部终验。
- 活动心得未开放流程已整改：报名详情入口由后台 `community + communityPublish` 开关控制，关闭时隐藏、开启后自动显示；直接访问受限页仍明确提示并优先返回。175 文件 999 项和双端构建通过，证据见 `docs/community-publish-disabled-flow-acceptance-20260721.md`。
- r43 早于本次修复，下一候选必须为 r44；保留 r43 和全部历史数据。
- `delivery/activity-registration-candidate-20260721-r44.zip` 已组装并通过 package/source 正式校验：33,448,281 bytes，SHA-256 `3A91AB112FC90957E4D2B5AEFD3975AE8385A0E634D262749FE0C295A25A802B`，Manifest 3,162 个文件、ZIP 3,296 个条目、禁入条目 0；r44 为当前最终候选，本轮剩余周期 0。
- r44 早于“后台关闭时隐藏心得入口”调整，下一候选必须为 r45，保留 r44。
- `delivery/activity-registration-candidate-20260721-r45.zip` 已组装并通过 package/source 正式校验：33,448,817 bytes，SHA-256 `EB37251582460484398DE40B784D1F7AD7E8A8708A83AAD3CF45E9FB0AB386C4`，Manifest 3,162 个文件、ZIP 3,296 个条目、禁入条目 0；r45 为当前最终候选，剩余周期 0。
- 功能开关依赖已自动化：`communityPublish -> community`、`forumPost -> forum`。后台开启子功能会同步开启父功能，关闭父功能会同步关闭子功能，卡片内有常驻说明；教程仅作为补充。
- 真实后台桌面/390x844 联动和不保存刷新验收通过，原配置未改变；API 全量 175 文件 1000 项、后台构建、密钥扫描和监控通过。
- `delivery/activity-registration-candidate-20260721-r46.zip` 已组装：33,452,093 bytes，SHA-256 `90EE17A82B0DB86A91BDA72C894578793CE25CAD15CE8C2C32E6521F53D70744`，Manifest 3,162 个文件、ZIP 3,296 个条目；r46 为当前最终候选并保留全部历史包和数据。

r32 本地交付候选已完成：

- release audit 8 个命令全部通过，172 个 API 文件、978 项测试，0 失败、0 阻塞。
- 最终角色审计 10 个后台角色、4 个会员角色、22 个允许检查和 9 个拒绝检查通过。
- 最新数据库与私有数据备份完整性和 SHA-256 已核对。
- r32 Manifest 3,106 个文件、ZIP 3,238 个条目、敏感路径 0，候选 source preflight 和正式 package verifier 均通过。
- 正式生产外部验收边界见 `docs/delivery-status-20260717.md`。

## 已通过验证

- `delivery/activity-registration-candidate-20260721-r41.zip`：33,354,792 bytes，SHA-256 `4077565F706B6A9DC5BA77662AE08C9A290843B1C8EE171BDFCDC30E75165129`；当前最终候选。

- `delivery/activity-registration-candidate-20260721-r40.zip`：33,349,543 bytes，SHA-256 `47CCA15A0BDB77240FE1D7FF46D91D514942E59B79A3D7F777A5D6EBF99BC889`；当前最终候选。

- `delivery/activity-registration-candidate-20260721-r39.zip`：33,346,906 bytes，SHA-256 `7A8939B61CC52F5BA6CC9E852280A2870AF79E3D5098E8A19A5B3D8A889B94EC`；当前最终候选。

- `delivery/activity-registration-candidate-20260721-r38.zip`：33,339,969 bytes，SHA-256 `7F319FF7E8817932F9A52D83A2882CC595A77AD0D480BB28D7EEB7CAE156257B`；正式 package verifier 退出 0。
- `delivery/activity-registration-candidate-20260721-r37.zip`：33,325,573 bytes，SHA-256 `C46F4A46CBE150C10B85DDCCC56F534AFF6FD2BCBD573C990C9098D2083D574D`；正式 package verifier 退出 0。
- `delivery/activity-registration-candidate-20260721-r36.zip`：33,309,697 bytes。
- SHA-256：`72ED3E83B8C15C211FE1EB75DCF616271A691A0A1B9A7EF440D5C462856D680D`。
- 正式 package verifier 退出 0：3,254 个 ZIP 条目、3,122 个 Manifest 文件、146 个 PC 制品文件、8 个必需目录、5 个源码入口，禁入条目 0。
- `delivery/activity-registration-candidate-20260721-r35.zip`：33,297,030 bytes。
- SHA-256：`E6BD6472A43C9A3AC2A127C64FAAFA8C8F9DD363E3AB7FD374D231879F6EE9A4`。
- 正式 package verifier 退出 0：3,248 个 ZIP 条目、3,116 个 Manifest 文件、146 个 PC 制品文件、8 个必需目录、5 个源码入口，禁入条目 0。
- `delivery/activity-registration-candidate-20260721-r34.zip`：33,289,941 bytes。
- SHA-256：`47EF62976805BA72A548FCC897DF8BF9CB80B87C84BACEBA21A66D948B39260F`。
- `delivery/activity-registration-candidate-20260721-r33.zip`：33,284,710 bytes。
- SHA-256：`70C180E727F07E107B0A60FE5EF0B132DCA0AC388556A7249276A38A240A000E`。
- `delivery/activity-registration-candidate-20260721-r32.zip`：33,250,235 bytes。
- SHA-256：`4A34CA3540006317413476C1C5E6A398A5D426A0D590DBC0A46AAB852EBDDEC0`。
- 数据库备份：`backups/mysql/activity_registration-20260721-095916.sql.gz`。
- 私有数据备份：`backups/private-data/private-data-20260721-095920.tar.gz`。
- 浏览器恢复 `showcase_admin` 工作台，控制台 warning/error 0。
- 监控 `status=ok/alerts=0`；统一资金 `healthy=true/issueCount=0`；readiness `ready=true/blockingCount=0`。
- `activity-api`、`activity-mysql` healthy，`activity-nginx` running；`git diff --check` 退出 0。
- 浏览器已恢复 `http://127.0.0.1:18080/admin/dashboard`，桌面宽度 `1066/1066`，warning/error 0。

## 新对话立即执行

- 证书模板本地功能和融合验收已完成；继续时保留模板发布历史、交易 #155 快照、数据库、测试账号、备份和 r1-r42 历史候选。当前仅剩生产外部配置、Git 提交/推送和服务器部署终验。

- 公益贡献凭证姓名展示已按场景整改：本人/后台授权预览显示完整名称，公开验真保持自然脱敏；后台改为页面内弹窗，桌面及 390×844 浏览器验收通过，详见 `docs/charity-certificate-holder-privacy-acceptance-20260721.md`。

- 生产空库初始化已增加演示种子保护：`NODE_ENV=production` 时不创建演示分类和英文演示活动，仅保留必要默认管理员、会员等级和首页基础装修；专项 45 项及 API 构建通过。

- 最终发布审计已完成，详见 `docs/final-release-audit-20260721.md`：release-check 8/8 通过，API 174 文件 992 项、全端与小程序构建、浏览器验收、密钥扫描、交付源码预检和运行健康均通过。
- Git 发布边界已整改：本地发布备份、静态发布副本、本地工具、delivery 解包目录和 ZIP 均已忽略且未删除；推送前需完整提交正式源码、迁移、测试、CI、脚本和文档。
- 当前 `origin` 是本地镜像路径，不是 GitHub；上传时必须使用发布报告中的显式 GitHub 地址或正确配置远端。

1. 公益贡献凭证本地整改及 r37 候选校验已完成；保留全部既有改动、数据、备份、候选包和验收证据。
2. 外部配置到位后按 `docs/launch-checklist.md`、`docs/production-runbook.md` 和 `docs/delivery-status-20260717.md` 执行生产终验。
3. 志愿勋章/服务证明独立图片版式及外部终验有新结果时继续追加证据并在新版本号下组装候选，不覆盖 r36。

## 安全约束

- 工作树包含大量既有未提交改动和测试制品，禁止 reset、checkout、clean 或删除未跟踪文件。
- 所有手工源码和文档编辑使用 `apply_patch`。
- 保留数据库、测试账号、业务编号、验收截图和现有 delivery 制品。
- 正式微信、支付、短信、对象存储和真机依赖不可用时记录外部待验收项，并继续其他不受阻工作包。
