# 慢π API 与路由兼容清单

**采集时间：** 2026-10-02（Asia/Shanghai）  
**规则：** 下列入口属于兼容边界。后续内部重构可以更换 Service，但不得删除、改名或改变主要响应语义。

## 1. 用户端路由边界

### 活动主链路

- `pages/index/index`
- `pages/activity/list`
- `pages/activity/detail`
- `pages/activity/register`
- `pages/activity/space`
- `pages/user/registration`
- `pages/user/orders`
- `pages/user/review`
- `pages/user/activity-reviews`

### 登录、我的和内容

- `pages/user/login`
- `pages/user/my`
- `pages/user/profile`
- `pages/user/security`
- `pages/user/settings`
- `pages/community/index`
- `pages/community/detail`
- `pages/community/publish`
- `pages/community/social`
- `pages/community/social-profile`
- `pages/community/card`
- `pages/community/connections`

### 其他既有模块

专题、商城、公益、志愿服务、公告、客服、城市合伙人、体验项目和法律页面继续保留现有 `pages.json` 路径。活动升级不得通过删除或改名这些路径来解决 UI 问题。

## 2. 管理端路由边界

现有 `apps/admin/src/router.ts` 和 `apps/admin/src/navigation/admin-menu.ts` 是后台兼容来源。活动、报名、订单、退款、通知、首页装修、系统设置、会员、社区、内容审核、小程序发布、租户和运营日志路径必须继续可访问。任何路径迁移必须同时保留兼容重定向和权限校验。

## 3. 公开 API 边界

### 登录、租户和首页

```text
POST /public/auth/h5-login
POST /public/auth/password-login
POST /public/auth/h5-code
POST /public/auth/wechat-login
GET  /public/categories
GET  /public/tenants
GET  /public/tenants/bootstrap
GET  /public/tenants/resolve
GET  /public/homepage
GET  /public/page-decoration
GET  /public/settings/operation
```

### 活动、报名和支付

```text
GET  /public/activities
GET  /public/activities/:id
POST /public/activities/:id/quote
POST /public/activities/:id/register
GET  /public/me/registrations
GET  /public/me/registrations/:id
POST /public/me/registrations/:id/cancel
POST /public/me/registrations/:id/refund-request
GET  /public/me/registrations/:id/check-in-code
GET  /public/me/registrations/:id/payment-status
POST /public/me/registrations/:id/payment-close
POST /public/orders/:id/pay/mock
POST /public/orders/:id/pay/wechat
POST /public/orders/:id/pay/balance
POST /public/orders/:id/pay/alipay
POST /payment/mock/callback
POST /payment/wechat/callback
POST /payment/alipay/callback
POST /payment/wechat/refund-callback
POST /payment/alipay/refund-callback
```

### 活动空间、评价和内容

```text
GET  /public/activities/:id/enhanced
GET  /public/activities/:id/reviews
POST /public/registrations/:id/review
GET  /public/activities/:id/space
POST /public/activities/:id/space/posts
POST /public/activities/:id/space/posts/:postId/report
POST /public/reviews/:id/report
```

### 通知和订阅

```text
GET  /public/wechat-subscriptions/templates
POST /public/me/wechat-subscriptions
GET  /public/me/wechat-subscriptions
```

后台通知模板、通知记录、Provider、偏好、计划、发送、预览和重试入口由 `apps/api/src/modules/v1/v1-admin.controller.ts` 继续提供兼容入口。

## 4. 必须持续验证的契约

- 所有公开请求必须解析明确的租户上下文，不能因缺少租户参数而读取另一个租户的数据。
- 活动公开摘要不得返回原始手机号、支付凭据、访问令牌或未审核内容。
- 报名、支付、退款和通知的重复请求返回已有业务结果，不创建重复记录。
- API 错误仍遵循现有错误封装和登录失效处理。
- 新增字段只能向后兼容；旧客户端忽略新增字段时仍能完成原流程。
