# PC 后台弹窗、抽屉与长表单移动端验收报告

## 1. 验收范围

- 日期：2026-07-20
- 环境：`http://127.0.0.1:18080/admin`
- 视口：390 x 844、320 x 568、844 x 390
- 账号：平台超级管理员，商家范围 `tenantId=23`
- 覆盖：修改密码弹窗、活动编辑抽屉、会员详情抽屉、课程数据大弹窗、订单退款弹窗。

## 2. 统一整改

- 移动端弹窗宽度限制为视口减 24px，最大高度使用动态视口并保留上下安全区。
- 弹窗改为纵向 flex，标题和底部命令固定，内容区独立滚动。
- 左右抽屉最大宽度限制为视口减 12px，抽屉内容区独立滚动。
- 固定 `label-width` 的弹窗、抽屉表单在移动端统一改为顶部标签。
- 选择器和日期控件限制在内容宽度内，底部命令支持换行和底部安全区。
- 活动五步向导改为每步 112px、标题不换行的横向滚动导航，消除逐字竖排。
- 平板宽度或 600px 以下矮屏同样限制弹窗/抽屉边界，避免横屏绕过手机断点。

## 3. 浏览器结果

| 场景 | 原始声明 | 实测边界 | 内容滚动 | 页面溢出 | 控制台 |
| --- | ---: | --- | --- | --- | --- |
| 修改密码 | 420px dialog | x=12, width=366, right=378 | `overflow:auto` | 390/390 | 0 warning/error |
| 活动编辑 | 900px drawer | x=12, width=378, right=390 | 708/2683px | 390/390 | 0 warning/error |
| 会员详情 | 大抽屉 | x=12, width=378, right=390 | 770/3416px | 390/390 | 0 warning/error |
| 课程数据 | 1180px dialog | x=16, width=358, right=374 | 748/4421px | 390/390 | 0 warning/error |
| 订单退款 | 520px dialog | x=12, width=366, right=378 | `overflow:auto` | 390/390 | 0 warning/error |
| 活动编辑横屏 | 900px drawer | 修复前 x=-56；修复后 x=12, width=832 | 254/2696px | 844/844 | 0 warning/error |
| 课程数据横屏 | 1180px dialog | x=16, width=812, height=366 | 294/4397px | 844/844 | 0 warning/error |

活动编辑底部“上一步、下一步、取消、保存”均保持在视口内；订单退款底部“取消、提交申请”完整可见。弹窗语义容器具备 `role=dialog`、`aria-modal=true` 和标题标签，打开后焦点保持在弹窗内。

活动向导整改后容器 `clientWidth=323`、`scrollWidth=612`，五个步骤宽度均为 112px，标题 `white-space=nowrap`，页面仍为 `clientWidth=390 / scrollWidth=390`。

320 x 568 下活动抽屉宽 308px、x=12，内容区 400/2716px 独立滚动，页面 `clientWidth=320 / scrollWidth=320`。844 x 390 横屏下五个步骤仍为 112px，标题高度均为 20px 且不换行。

## 4. 截图证据

- `.local-logs/admin-overlay-responsive-20260720/password-before-390x844.png`
- `.local-logs/admin-overlay-responsive-20260720/password-after-390x844.png`
- `.local-logs/admin-overlay-responsive-20260720/activity-drawer-390x844.png`
- `.local-logs/admin-overlay-responsive-20260720/activity-drawer-wizard-after-390x844.png`
- `.local-logs/admin-overlay-responsive-20260720/member-detail-390x844.png`
- `.local-logs/admin-overlay-responsive-20260720/course-insights-390x844.png`
- `.local-logs/admin-overlay-responsive-20260720/order-refund-390x844.png`
- `.local-logs/admin-overlay-responsive-20260720/nested-overlay-320x568.png`
- `.local-logs/admin-overlay-responsive-20260720/activity-drawer-before-844x390.png`
- `.local-logs/admin-overlay-responsive-20260720/activity-drawer-after-844x390.png`
- `.local-logs/admin-overlay-responsive-20260720/activity-drawer-wizard-after-844x390.png`
- `.local-logs/admin-overlay-responsive-20260720/course-insights-844x390.png`

## 5. 自动化与运行门禁

- 响应式合同：1 文件、6 项通过。
- API 全量：156 文件、882 项通过。
- PC：类型检查及 1946 模块生产构建通过。
- 完整 `npm run preflight` 通过；仅保留正式短信凭据未配置警告。
- `git diff --check` 无空白错误。
- Docker：`activity-api`、`activity-mysql` healthy。
- Readiness：`ready=true`、`blockingCount=0`。
- 统一资金：`healthy=true`、`issueCount=0`，核对活动订单 539、课程订单 92、商城订单 815、钱包流水 471、商城结算 26。

## 6. 剩余终验

- iOS/Android 微信真机软键盘抬升、刘海屏/底部 Home Indicator 安全区。
- 真实设备极窄屏和横屏下全部高风险弹窗的焦点循环与读屏抽查。
- 正式微信内置浏览器、相机和系统日期选择器联动。

以上依赖真实设备的项目继续保留在 `11.05` 最终真机验收，不影响本批 PC 浏览器与代码整改完成判定。
