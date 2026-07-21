# 优惠券与兑换码权限及业务闭环验收报告

## 1. 验收范围

本报告对应持续开发计划 `11.01.34`，覆盖活动优惠券、统一兑换码的查看/维护/导出权限分离，真实权益目标、领取与兑换流水、租户边界、数据投影、并发额度、操作审计和 PC 双工作台。

验收页面：

- `/admin/coupons`

主要接口：

- `GET/POST /admin/coupons`
- `PATCH /admin/coupons/:id`
- `GET /admin/coupons/options`
- `GET /admin/coupon-claims`
- `GET /admin/coupon-usages`
- `GET /admin/coupons/export`
- `GET/POST /admin/redemption-codes`
- `PATCH /admin/redemption-codes/:id`
- `GET /admin/redemption-codes/options`
- `GET /admin/redemption-code-usages`
- `GET /admin/redemption-codes/export`

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `coupon.view` | 查看当前商家活动优惠券、领取记录和使用记录 |
| `coupon.manage` | 新增、编辑活动优惠券，自动包含 `coupon.view` |
| `coupon.export` | 导出优惠券及领取、使用台账，自动包含 `coupon.view` |
| `redemption_code.view` | 查看当前商家统一兑换码、权益选项和兑换记录 |
| `redemption_code.manage` | 新增、编辑统一兑换码，自动包含 `redemption_code.view` |
| `redemption_code.export` | 导出兑换码及兑换记录，自动包含 `redemption_code.view` |

两类业务权限互不借权；维护和导出各自只继承对应查看权限，敏感流水导出不会因维护权限自动开放。

## 3. 本轮实现与整改

- 将原单一 `coupon.manage` 拆为六项权限，并同步后端路由、PC 权限目录、路由、菜单、默认运营角色和演示 seed。
- PC 页面重做为“活动优惠券 / 统一兑换码”双工作台，按权限展示只读、维护和导出状态。
- 新增优惠券和兑换码专属 options；活动券、商城券、课程权益均从当前商家真实业务对象生成，不再输入裸 ID。
- 新增领取记录、使用记录和兑换记录分页接口；会员手机号由服务端固定脱敏，PC 再通过 `maskPhone` 显式渲染。
- 优惠券、兑换码列表及关联对象改为最小响应投影，商家对象不返回 settings、联系人或电话。
- 活动优惠券和统一兑换码均建立商家内唯一约束；平台、当前商家和其他商家可使用相同券码但不能互相接管。
- 商家账号不能读取或编辑 `tenant=null`、其他商家的券码；平台管理员也不能通过修改限定活动把既有优惠券迁移到另一商家。
- 兑换目标严格校验当前商家归属；已使用兑换码不能修改券码或权益，额度和每人上限不能低于历史使用量。
- 活动券兑换校验启用、有效期、总量和每人限领；商城券兑换同步校验并正确增加 `claimedCount`；已拥有课程权限时不重复消耗兑换码。
- 优惠券创建/更新、兑换码创建/更新以及两类导出均写统一操作审计。
- 新增 migration `1783850000000-CouponTenantGovernance.ts`，建立两个唯一约束和三个流水查询索引。

## 4. 数据库与备份

迁移前备份：

- `backups/mysql/activity_registration-20260718-174253.sql.gz`

真实 MySQL 已执行：

- `UQ_coupons_tenant_code`
- `UQ_redemption_codes_tenant_code`
- 优惠券领取、使用和兑换码使用流水查询索引

最终 `migration:show` 共显示 179 个 migration，全部为 `[X]`；MySQL 容器和数据卷未重建。

## 5. 保留测试账号与数据

密码均为 `Qiwai123456`。

| 账号 | 用途 |
|---|---|
| `showcase_staff_read` | 两类券码只读 |
| `showcase_staff_manager` | 两类券码维护，不可导出 |
| `showcase_staff_security` | 两类券码导出，不可维护 |

最终真实专项保留：

- 商家 `#23`
- 活动优惠券 `#21`
- 优惠券领取记录 `#6`
- 统一兑换码 `#9`
- 兑换记录 `#8`
- 平台边界优惠券 `#22`
- 平台边界兑换码 `#10`
- 其他商家同码优惠券 `#23`

前序失败和修复验证数据同样按要求保留，包括优惠券 `#18-#20`、兑换码 `#7/#8` 及对应流水和审计。

## 6. 真实 API 验收

执行命令：

```powershell
$env:PLATFORM_ADMIN_USERNAME='admin'
$env:PLATFORM_ADMIN_PASSWORD='Admin123456'
$env:SHOWCASE_PASSWORD='Qiwai123456'
$env:SHOWCASE_ADMIN_PASSWORD='Qiwai123456'
npm run acceptance:coupon-redemption-permissions
```

最新结果：`.local-logs/coupon-redemption-permission-1784369868355/result.json`

| 场景 | 实际结果 |
|---|---|
| 优惠券只读 | 当前商家列表正常；创建和导出均 403 |
| 优惠券维护 | 创建 `#21`、更新名称和金额成功；领取记录 `#6` 生成 |
| 兑换码只读 | 权益 options 正常；创建和导出均 403 |
| 兑换码维护 | 创建 `#9`、更新成功；会员兑换后记录 `#8` 生成 |
| 真实权益选项 | 活动 44、活动券 5、商城券 18、课程 15 |
| 流水隐私 | 领取和兑换手机号均为固定脱敏值，会员对象仅保留最小字段 |
| 商家内唯一 | 当前商家重复码被拒绝；平台和其他商家可保留同码独立对象 |
| 商家边界 | 商家读取、更新平台或其他商家券码返回 404 |
| 平台迁移边界 | 平台管理员不能通过更换限定活动迁移已有优惠券商家归属 |
| 活动归属 | 使用其他商家活动创建或更新当前商家优惠券被拒绝 |
| 历史额度保护 | 总次数、每人上限低于历史使用量被拒绝 |
| 已使用权益保护 | 已使用兑换码不能修改券码或权益目标 |
| 导出 | 优惠券 XLSX 9642 bytes；兑换码 XLSX 8792 bytes |
| 操作审计 | `coupon.create #9502`、`coupon.update #9503`、`redemption_code.create #9504`、`redemption_code.update #9505`、导出 `#9509/#9510` |

## 7. 应用内浏览器验收

- `showcase_staff_read` 仅显示两类查看能力，无新建、编辑和导出按钮。
- `showcase_staff_manager` 显示两类新建和编辑能力，无导出按钮；弹窗取消无写入副作用。
- `showcase_staff_security` 仅显示两类导出按钮，无写操作。
- 活动优惠券页显示真实活动选项，统一兑换码页显示当前商家的活动券、商城券和课程权益。
- 最新构建刷新后，领取和兑换记录只出现 `139****0001`、`139****0005` 等脱敏号码，演示明文手机号数量为 0。
- 默认视口文档宽度 `999/999`，无外层横向溢出；前序 390×844 验收页面 `351/351`、卡片 `309/309`、弹窗 `366/366`、表单区 `334/334`。
- 本轮没有新增 warning/error；日志只保留约 7 小时前其他页面产生的 Element Plus radio 历史警告。

## 8. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 权限专项 | 4 文件、70 项通过 |
| API 全量测试 | 132 文件、724 项通过 |
| API 构建 | 通过 |
| PC 生产构建 | 通过，1946 个模块 |
| 真实 API 专项 | 通过 |
| 权限目录 | 113 项，前后端一致 |
| 管理后台隐私门禁 | 通过，禁止直接渲染个人手机号 |
| 完整 `npm run preflight` | 通过 |
| migration | 179 个全部 `[X]` |
| API Docker | healthy |
| `git diff --check` | 通过，仅有既有 LF/CRLF 提示 |

预检仅保留既有上线提醒：正式短信环境变量尚未填写时，必须在系统设置中配置生产短信服务商凭证。

## 9. 验收结论

`11.01.34` 已达到本批完成标准：优惠券与兑换码六权分离、真实权益 options、流水分页与双层脱敏、严格租户边界、额度和已使用数据保护、唯一约束、操作审计、Excel 导出及 PC 双工作台均已形成闭环。本批发现的隐私静态门禁问题已整改并完成全量回归。
