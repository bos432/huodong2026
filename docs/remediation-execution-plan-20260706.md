# 优化整改方案与执行记录

生成时间：2026-07-06 10:35 +08:00

## 1. 整改结论

本次验收发现的问题均已直接执行整改并复验通过。当前没有阻塞本地交付的代码问题；剩余事项主要是生产环境配置、真实支付/短信/微信端审核等外部上线条件。

## 2. 已执行整改

| 问题 | 影响 | 处理 | 复验 |
| --- | --- | --- | --- |
| 接口 smoke 选中了保留旧数据里的已截止活动 | `npm run smoke:online-showcase` 报“报名已截止” | 修改 `scripts/smoke-online-showcase.mjs`，只从 `displayStatus === "open"` 的活动中选择免费/收费报名活动 | `npm run smoke:online-showcase` 通过 |
| 页面验收脚本默认 H5/Admin 同域 | 本地 H5 `5173`、Admin `5174` 分离时无法跑完整页面验收 | 修改 `scripts/browser-online-showcase-acceptance.cjs`，新增 `ADMIN_WEB_BASE` | `npm run browser:online-showcase` 通过 |
| 演示 seed 未创建广告中心自有广告计划 | 广告位公开接口返回 `null`，页面验收失败 | 修改 `scripts/seed-online-showcase.mjs`，新增幂等 `ensureAdCampaign` | 公开广告位返回 `resolvedImageUrl`，页面验收通过 |
| 菜单抽取后测试仍读取旧 `Layout.vue` | API 测试 `menu-integrity.spec.ts` 失败 | 修改 `apps/api/src/modules/admin/menu-integrity.spec.ts`，改为读取 `apps/admin/src/navigation/admin-menu.ts` | API 测试通过，当前 180/180 |
| Node 25 运行小程序构建时 uni 原生崩溃 | `build:mp-weixin` 退出码 `-1073740791` | 改用 Node 24 执行标准命令，并记录为部署要求 | `npm --prefix apps/mobile run build:mp-weixin` 通过 |
| 商城商品编辑保存提交后端只读字段 | 生产严格 DTO 校验报 `property id/tenant/merchant/category/createdAt/updatedAt/salesStats should not exist`，导致后台商品无法保存 | 修改 `apps/admin/src/views/MallProducts.vue`，编辑表单只接收可编辑字段，保存时构造白名单 payload；SKU 只提交 `id/name/skuCode/price/originalPrice/stock/sortOrder/enabled` | 后台构建通过；浏览器抓包保存 `productId=172`，PATCH 请求体无非法字段 |
| 商城优惠券保存/启停存在同类整行提交风险 | 可能在严格 DTO 校验下提交 `tenant/merchant/runtimeStatus/usedCount` 等展示字段 | 修改 `apps/admin/src/views/MallProducts.vue`，优惠券保存和启停统一构造白名单 payload | 浏览器抓包保存 `couponId=4`，PATCH 请求体无非法字段 |

## 3. 第一阶段落地内容

| 范围 | 文件 | 说明 |
| --- | --- | --- |
| 后台菜单重排 | `apps/admin/src/navigation/admin-menu.ts` | 抽出菜单配置，按平台/商家、活动/报名/订单/会员/装修/扩展模块重新组织 |
| 后台布局接线 | `apps/admin/src/views/Layout.vue` | 使用菜单配置渲染，保留原有权限过滤和租户视角逻辑 |
| 移动端首页重排 | `apps/mobile/src/pages/index/index.vue` | 首页增加活动报名主入口和精选活动预览，金刚区顺序改为活动主流程优先 |
| 设计规范沉淀 | `docs/ui-backend-reorchestration-plan-20260706.md` | 形成 UI 与后端重编排正式方案 |
| 验收脚本补强 | `scripts/*online-showcase*` | 适配保留旧数据、双前端端口、广告位演示数据 |

## 4. 复验结果

| 验证 | 结果 |
| --- | --- |
| `npm run seed:online-showcase` | 通过 |
| `npm run smoke:online-showcase` | 通过 |
| `npm run browser:online-showcase` | 通过 |
| `npm run browser:mobile-admin` | 通过 |
| 商城商品保存定向回归 | 通过，商品 PATCH payload 已去除 `tenant/merchant/category/createdAt/updatedAt/salesStats` |
| 商城优惠券保存定向回归 | 通过，优惠券 PATCH payload 已去除关联对象和运行态字段 |
| `npm --prefix apps/api run test` | 通过，180 个用例 |
| `npm --prefix apps/api run build` | 通过 |
| `npm --prefix apps/admin run build` | 通过 |
| `npm --prefix apps/mobile run build:h5` | 通过 |
| `npm --prefix apps/mobile run build:mp-weixin` | 通过，Node 24 |
| `npm --prefix packages/shared run build` | 通过 |

## 5. 剩余非代码事项

这些不是本地交付阻塞，但正式上线前必须处理：

- 替换默认管理员密码，禁用或改密 `admin / Admin123456`。
- 配置真实短信服务，生产关闭 `H5_AUTH_MODE=dev`。
- 配置正式域名、HTTPS、CORS、JWT 强密钥、数据库强密码、备份和监控。
- 真实微信/支付宝支付、退款、回调、账单和代理打款必须在预发环境专项验收。
- 小程序因 `apps/mobile` 变更，必须重新构建、上传体验版并提交微信审核。
- 右侧 Browser 面板本轮不可被工具控制，若客户要求“右侧面板人工验收截图”，需要在 Browser 工具恢复后补一次手工点击留痕。
