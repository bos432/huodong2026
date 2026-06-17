# 移动端 2.0 页面状态清单

更新时间：2026-06-18

## 判断口径

- `2.0`：已切到“七维书院”新中式视觉语言，典型特征包括 `TabBar` 新底部导航、米白/朱砂红/石青配色、首页同系卡片和标题风格。
- `混合`：已经接入 2.0 的租户装修/页面装修能力，或接入了新业务链路，但视觉仍偏旧版本。
- `1.0`：页面仍以旧样式为主，未统一到首页 2.0 视觉语言。
- `独立运营台 2.0`：手机管理端页面，属于商家/运营移动工作台，不使用普通学员底部菜单，但视觉必须和前台 2.0 同系。

## 已是 2.0

- `apps/mobile/src/pages/index/index.vue`
- `apps/mobile/src/pages/activity/list.vue`
- `apps/mobile/src/pages/activity/detail.vue`
- `apps/mobile/src/pages/community/index.vue`
- `apps/mobile/src/pages/courses/index.vue`
- `apps/mobile/src/pages/user/my.vue`

## 混合状态

- `apps/mobile/src/pages/activity/register.vue`
- `apps/mobile/src/pages/announcement/list.vue`
- `apps/mobile/src/pages/partner/index.vue`
- `apps/mobile/src/pages/service/index.vue`
- `apps/mobile/src/pages/user/login.vue`
- `apps/mobile/src/pages/user/registration.vue`
- `apps/mobile/src/pages/user/review.vue`

说明：

- 这批页面多数已经接入 `usePageDecoration`、`TenantSwitcher`、`TenantContextBadge`、`PageDecorationBlocks` 等 2.0 装修能力。
- 但视觉主框架仍偏旧后台装修风，和首页的新中式 2.0 不完全统一。

## 仍是 1.0

- `apps/mobile/src/pages/charity/index.vue`
- `apps/mobile/src/pages/community/checkin.vue`
- `apps/mobile/src/pages/community/detail.vue`
- `apps/mobile/src/pages/course/detail.vue`
- `apps/mobile/src/pages/course/player.vue`
- `apps/mobile/src/pages/order/confirm.vue`
- `apps/mobile/src/pages/order/payment.vue`
- `apps/mobile/src/pages/search/index.vue`
- `apps/mobile/src/pages/user/certificates.vue`
- `apps/mobile/src/pages/user/courses.vue`
- `apps/mobile/src/pages/user/favorites.vue`
- `apps/mobile/src/pages/user/learning.vue`
- `apps/mobile/src/pages/user/profile.vue`
- `apps/mobile/src/pages/user/security.vue`
- `apps/mobile/src/pages/user/settings.vue`
- `apps/mobile/src/pages/user/wallet.vue`

## 独立运营台 2.0

以下页面属于手机管理端，不建议套用普通学员 `书院 / 课程 / 共修 / 活动 / 我的` 底部菜单。

验收口径：

- 底部菜单使用运营专属结构：`工作台 / 活动 / 报名 / 订单 / 签到`。
- 菜单入口根据运营权限过滤，无报名、订单、签到权限时不显示对应入口。
- 页面视觉使用 2.0 暖色背景、圆角卡片、石青主按钮，不再使用 1.0 黑色头部和旧式三/四项底栏。
- 这些页面面向商家管理员、运营、签到人员，不面向普通学员。

当前已统一：

- `apps/mobile/src/pages/admin/home.vue`
- `apps/mobile/src/pages/admin/login.vue`
- `apps/mobile/src/pages/admin/orders.vue`
- `apps/mobile/src/pages/admin/registrations.vue`
- `apps/mobile/src/pages/admin/check-in.vue`
- `apps/mobile/src/pages/admin/activity/list.vue`
- `apps/mobile/src/pages/admin/activity/edit.vue`
- `apps/mobile/src/pages/admin/activity/preview.vue`

## 另外一类页面

- `apps/mobile/src/pages/ambassador/index.vue`

说明：

- 这页不是首页同系 2.0，也不是 1.0 老页面。
- 它更像一张独立专题落地页，视觉已经比较完整，但风格与首页 2.0 并不统一。

## 当前优先级建议

如果按用户主链路继续推进，建议优先顺序是：

1. `activity/register`
2. `user/registration`
3. `user/login`
4. `service/index`
5. `announcement/list`
6. `community/detail` / `community/checkin`
7. `course/detail` / `order/confirm` / `order/payment`

## 上线验收结论

- 可上线：主首页、活动列表、活动详情、课程列表、共修列表、我的首页、商家手机管理台基础运营页。
- 可上线但需备注：报名确认、报名详情、登录、服务中心、公告、课程详情、课程订单、我的课程等页面仍需继续做 2.0 细节统一，但不应阻塞基础运营。
- 不可上线必须修：真实收钱链路、退款链路、课程播放进度、学员动态评论审核、跨商家数据隔离、区域定位分发等核心闭环一旦发现异常，必须先修再正式运营收费。
