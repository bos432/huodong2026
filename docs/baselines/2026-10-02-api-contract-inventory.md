# 慢π接口与兼容面清单

**日期：** 2026-10-02
**规则：** 下列入口是兼容边界。内部可以通过 bounded service 和 Worker 渐进重构，但不得随意改名、删除或改变主要响应 envelope。

## 用户端公开入口

控制器：`apps/api/src/modules/public/public.controller.ts`

- 身份：`/public/auth/*`、微信登录
- 租户与首页：`/public/tenants*`、`/public/homepage`、`/public/page-decoration`、`/public/settings/operation`
- 活动：`/public/categories`、`/public/activities`、活动详情、报价、报名
- 订单与支付：活动订单支付、课程订单支付、支付状态、关闭订单、支付/退款回调
- 我的：钱包、资料、常用报名人、订单概览、活动历史、报名详情、退款申请、签到码
- 通知：微信订阅模板查询与订阅记录
- 内容与验证：评价、社区/课程/收藏、证书、凭证、公益和志愿者公开入口

## 管理端兼容面

控制器与路由仍位于 `apps/api/src/modules/*` 和 `apps/admin/src/router.ts`。主要兼容模块包括：

- 活动、报名、订单、退款、签到
- 首页装修、通知、公告、运营设置、内容审核和申诉
- 租户、城市区域、会员、权限、操作日志
- 小程序发布、系统设置、配置检查、Worker/业务任务
- 商城、课程、公益、志愿者、城市合伙人等既有业务

后台旧菜单路径继续保留，具体菜单权限以 `apps/admin/src/navigation/admin-menu.ts` 为准。

## 移动端路由兼容面

用户端入口由 `apps/mobile/src/pages.json` 定义，核心活动闭环路由为：

```text
pages/index/index
pages/activity/list
pages/activity/detail
pages/activity/register
pages/activity/space
pages/user/my
pages/user/orders
pages/user/registration
pages/user/review
pages/user/activity-reviews
pages/community/social
pages/community/social-profile
pages/community/connections
```

专题、社区、商城、公益、志愿者、公告、服务中心、城市合伙人和设置等既有页面继续保留，不因本次 UI 升级整体重写。

## 共享契约边界

`packages/shared/src/index.ts` 只承载公开字段和跨端状态契约，不允许放入 TypeORM 实体、访问令牌、原始手机号、支付凭据、Provider 密钥或私有文件路径。当前已接入活动、报名、订单、退款、签到、活动空间和通知的首批公开契约。

## 多租户与权限不变量

- 每个公开请求必须保留租户上下文，切换租户后不得复用旧租户的活动、分类、装修或报名状态。
- 管理端继续按角色、权限、租户范围和资源归属校验。
- 活动空间、签到码、成员摘要、群二维码和履约内容继续受报名/审核/活动状态限制。
- API、Worker、通知和回调不得绕过租户边界；详细验证以既有 acceptance/preflight 套件为准。
