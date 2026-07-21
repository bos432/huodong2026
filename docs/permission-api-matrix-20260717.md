# 权限与接口矩阵

更新时间：2026-07-17

## 1. 权威实现

权限目录和后台路由映射的唯一代码来源：

- `apps/api/src/modules/admin/admin-permissions.ts`
- `apps/api/src/modules/admin/admin-roles.ts`
- `apps/api/src/modules/admin/roles.guard.ts`
- `apps/api/src/modules/admin/admin.controller.ts`

当前权限目录由源码门禁校验为 75 项。接口权限先经过 JWT 身份校验，再经过角色/权限校验，最后执行租户、岗位数据范围、套餐权益和功能开关校验。

## 2. 角色基线

| 角色 | 默认权限范围 | 数据范围 |
|---|---|---|
| `super_admin` | 平台级全权限；租户管理员登录时自动移除平台专属权限 | 平台可跨租户；租户账号仅当前租户 |
| `operator` | 活动、报名、会员、通知、内容、课程、社区和商城运营权限 | 当前租户及岗位授权活动/店铺 |
| `finance` | 订单、退款、钱包、对账、支付账户、商城财务、代理结算 | 当前租户及授权店铺 |
| `checkin_staff` | 查看活动/报名和签到核销 | 被授权活动、核销点和设备 |
| 商户/店员 | 通过商城店铺授权获得商品、订单、物流和售后能力 | 被授权店铺 |
| 讲师 | 通过课程关联获得课程内容、考核和学习数据能力 | 被授权课程 |
| 会员/志愿者 | 使用公开端业务 API | 当前登录用户、当前租户和已获权益 |

## 3. 权限分组

| 分组 | 主要权限键 |
|---|---|
| 总览 | `dashboard.view`, `analytics.view` |
| 平台管理 | `tenant.manage`, `tenant_region.manage`, `admin.manage`, `support.view` |
| 系统安全 | `logs.view`, `system.manage`, `miniprogram_release.manage` |
| 活动 | `activity.view`, `activity.manage`, `activity.approve`, `category.manage`, `ticket.manage`, `coupon.manage` |
| 报名签到 | `registration.view`, `registration.manage`, `registration.export`, `waitlist.manage`, `checkin.manage` |
| 订单财务 | `order.view`, `order.manage`, `order.refund`, `order.export`, `finance.view`, `finance.manage`, `finance.export`, `finance.wallet_adjust`, `payment_account.view`, `payment_account.manage`, `agent_settlement.view`, `agent_settlement.manage`, `agent_settlement.pay`, `agent_settlement.transfer`, `agent_settlement.export` |
| 商城 | `mall.merchant.manage`, `mall.merchant.view`, `mall.product.manage`, `mall.product.audit`, `mall.review.manage`, `mall.logistics.manage`, `mall.order.view`, `mall.order.manage`, `mall.refund.manage`, `mall.finance.view`, `mall.payment.manage`, `mall.settlement.manage`, `mall.statistics.view` |
| 会员运营 | `member.view`, `member.manage`, `member.password`, `member_level.manage`, `tag.manage`, `notification.manage`, `review.manage` |
| 装修营销 | `homepage.manage`, `marketing_popup.manage`, `ad_center.manage`, `announcement.manage`, `operation_settings.manage` |
| 商家设置 | `tenant_profile.manage` |
| 公益招募 | `charity.view`, `charity.manage`, `charity.finance`, `aid.view`, `aid.manage`, `aid.sensitive`, `ambassador.manage`, `partner.manage` |
| 内容学习 | `course.manage`, `community.manage`, `forum.manage`, `forum.moderate` |
| 通用能力 | `upload.image`, `upload.settlement_proof` |

## 4. API 模块到权限入口

| API 模块 | 控制器入口 | 关键权限 |
|---|---|---|
| 管理后台 | `/api/admin/*` | 按 `resolveAdminRoutePermission()` 映射到上述权限键 |
| 租户/账号 | `/api/admin/tenants*`, `/api/admin/admins*` | `tenant.manage`, `admin.manage` |
| 活动报名 | `/api/admin/activities*`, `/api/admin/registrations*` | `activity.*`, `registration.*`, `waitlist.manage`, `checkin.manage` |
| 财务 | `/api/admin/orders*`, `/api/admin/refunds*`, `/api/admin/finance*` | `order.*`, `finance.*`, `payment_account.*`, `agent_settlement.*` |
| 商城 | `/api/admin/mall/*` | `mall.*`，并叠加店铺授权 |
| 会员通知 | `/api/admin/members*`, `/api/admin/notifications*` | `member.*`, `tag.manage`, `notification.manage` |
| 课程社区 | `/api/admin/courses*`, `/api/admin/community*`, `/api/admin/forum*` | `course.manage`, `community.manage`, `forum.*` |
| 公益生态 | `/api/admin/charity*`, `/api/admin/aid*`, `/api/admin/partners*`, `/api/admin/volunteers*` | `charity.*`, `aid.*`, `partner.manage` 等 |
| 公开端 | `/api/public/*`, `/api/v1/*` | 用户登录态、租户上下文、业务拥有权和状态机；不接受前端权限字段作为授权依据 |
| 健康检查 | `/api/health/*` | 公开存活检查；ready、metrics 和诊断信息按部署策略限制 |

## 5. 高风险接口规则

- 导出接口必须复用列表权限查询，并写入导出审计。
- 退款、钱包、公益拨款、商城结算、代理打款和证书撤销必须执行角色权限、租户范围、状态机、幂等键和审计。
- `aid.sensitive` 仅允许查看必要敏感材料，并记录理由和访问审计。
- `checkin.manage` 不能跨活动、跨核销点或跨租户核销。
- 商城接口除权限外必须校验店铺授权，订单和售后不能通过篡改 ID 越权。
- 公开响应使用白名单 DTO，不返回密码哈希、openid、unionid、完整手机号、业务快照或内部配置。

## 6. 验证命令

```powershell
npm run test:preflight-guards
npm run test
npm run audit:runtime
```

相关源码测试包括 `admin-permissions.spec.ts`、`admin-roles.spec.ts`、租户范围、导出、敏感数据和各业务模块专项测试。该矩阵描述当前实现和验证边界，不替代正式生产密钥、真机及外部通道验收。
