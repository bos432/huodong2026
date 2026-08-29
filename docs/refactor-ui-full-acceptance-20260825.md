# 全平台架构与 UI 升级验收记录

## 版本与范围

- 日期：2026-08-25
- 分支：`feature/qiwai-ui-experiment`
- 基线提交：`881f4341a15caa6d9e19c5690b238b9cb8962c73`
- 工作区状态：本轮改动尚未提交，发布前必须生成唯一提交号并锁定构建产物。
- 范围：移动端 H5、微信小程序构建、管理后台动效、API Worker 启动契约和生产运行说明。
- 数据：未删除、未覆盖本地或线上业务数据；`.video-analysis/` 与 `商业计划书/` 不属于本轮交付。

## 已实现

1. 移动端统一动效适配器：核心活动链路页面统一使用 `motionStyle`，支持微信端可编译的 CSS 降级和减少动效策略。
2. 管理后台页面切换：使用 GSAP `context` 管理进入动画，路由切换和组件卸载时清理动画，只动画透明度和位移。
3. 移动端基础令牌：统一慢π青绿色、状态动效变量、按压反馈、卡片圆角和安全底部导航；移除移动端固定背景造成的低端设备滚动问题。
4. 独立 Worker：新增 `apps/api/dist/worker.js` 启动入口，external 模式下 API 不重复消费业务任务。
5. Worker 可观测性：新增 `runtime/activity-worker-heartbeat.json`、`/api/health/worker` 和 `npm run wait:worker-ready`。
6. 依赖安全：后台 `nanoid` 固定到 `3.3.18`，生产依赖审计为 high=0、critical=0。
7. 自动短信监控补强：总开关或场景开关关闭时仍写入幂等的 `suppressed` 记录，不创建发送任务、不调用服务商，运营方可以明确区分“被抑制”和“未触发”。

## 自动化结果

| 检查 | 结果 |
| --- | --- |
| API 全量测试 | 189 个测试文件通过，1078 个测试通过 |
| Worker/Health 专项 | 16 个测试通过 |
| `npm run audit:runtime` | 通过，high=0、critical=0 |
| `npm run test:preflight-guards` | 通过 |
| API 构建 | 通过 |
| 管理后台构建 | 通过，保留既有大 chunk 和 VueUse 注释提示 |
| H5 构建 | 通过，产物写入 `apps/mobile/dist/build/h5` |
| MP-Weixin 构建 | 通过，产物依赖检查通过 |

## 本地浏览器验收

本轮本地服务已启动并使用真实 MySQL 数据完成验收：

- H5：`http://127.0.0.1:5206`，通过同源 `/api` 代理访问本地 API `http://127.0.0.1:3000`。
- 管理后台：`http://127.0.0.1:5174/admin/login`，通过同源代理访问本地 API。
- Worker：external 模式，`/api/health/worker` ready；数据库容器使用 `127.0.0.1:13306`，未重置既有业务数据。
- 首页：`qiwai-hangzhou` 在装修返回空活动模块时仍能展示真实开放活动；空的历史心得模块不会重复挤占首屏；主推区已展示全部活动时，空活动流自动收起。
- 活动列表、搜索、详情：真实活动、日期、地点、价格、报名人数、余量和状态均可读取；无横向溢出。
- 普通用户：验证码登录、填写报名资料、创建线下付款订单、财务确认收款、报名成功、签到码、我的会员中心和订单状态均通过；本次验收保留测试报名记录，当前报名 `30702` 已完成现场核销并进入 `checked_in`。
- 活动空间：付款成功后可进入，公告、脱敏成员、问答、地点、签到码、邀请和客服入口可渲染；未达成报名资格时接口按权限返回安全空态/不存在，不泄露活动空间内容。
- 退款链路：本次测试报名 `30702` 对应退款 `URF1787627629851698` 已由财务审核完成，数据库状态为 `completed`，用户订单状态为 `partially_refunded`；报名资格和活动空间仍按活动规则保留，页面明确显示部分退款。
- 商家运营账号：仪表盘、活动、活动空间运营、首页装修、通知中心、报名管理、会员管理、系统设置和签到页面可打开；短信服务未启用时页面明确显示“未启用”。
- 通知中心：页面提供渠道、场景、状态、关键词筛选，发送记录展示会员 ID、状态、重试次数和失败/抑制信息；本地短信服务未启用时不会伪造送达，自动场景会留下“已抑制”审计记录。
- 财务账号：订单列表、线下收款确认和收款后用户状态流转通过。
- 平台超管：全局看板、商家、平台活动池、小程序发布和上线体检可打开；上线体检从旧加密配置无法解密的 500 修复为可读 warning，阻断项为 0。
- 签到账号：签到核销、待核销名单和扫码/手动核销入口可打开；普通用户签到码核销成功后，重复提交同一码不会新增有效记录（数据库仅保留 `check_ins.id=169`）；访问财务路由会保留在签到页面，未越权展示财务内容。
- 商家切换：弹层可展示城市、商家名称和编码，长名称未造成页面横向溢出。
- 响应式：本轮 H5 页面实际检查的视口下，`document.body.scrollWidth` 与 `document.documentElement.scrollWidth` 未超过视口；移动端全链路沿用既有 375/390/760 档位检查。
- 控制台：核心页面未发现前端异常；报名原生确认弹窗需点击弹窗自己的确认按钮，自动化不能把底层提交按钮当作弹窗按钮，已记录为可访问性改进项。

## 角色验收矩阵

| 角色 | 实际检查页面/动作 | 结果 |
| --- | --- | --- |
| 普通用户 `13933529706` | 首页、活动列表、活动详情、订单全部/待处理/待参与/退款售后/已完成、报名详情、活动空间、分享邀请码 | 通过；订单无无限加载，邀请链接包含活动、邀请码和租户上下文 |
| 普通用户 `13933529706` | 线下收款后的报名记录 `30702`、签到码和活动空间成员 | 通过；退款后仍可访问合格活动空间，成员未暴露手机号 |
| 商家运营 `qiwai_hz_ops` | `/admin/dashboard`、`activities`、`activity-space`、`homepage-builder`、`notifications`、`registrations`、`members`、`system-settings`、`check-in` | 通过；活动、装修、通知和运营入口可用；访问 `/admin/finance` 回到工作台 |
| 商家财务 `qiwai_hz_finance` | `/admin/finance`、`orders`、退款审核、活动只读页 | 通过；财务与退款可用，活动页无新建/编辑操作，装修和签到路由被限制 |
| 平台管理员 `admin` | `/admin/tenants`、`activities`、`miniprogram-release`、`config-check`、`finance`、`notifications`、`admins`；平台视角切换到 `qiwai-hangzhou` | 通过；可跨租户查看，杭州活动数据与租户筛选一致，体检阻断项为 0 |
| 签到员 `qiwai_hz_checkin` | `/admin/check-in`、手动输入签到码、同码重复提交、财务路由越权检查 | 通过；报名 `30702` 核销成功，重复提交未新增有效核销记录 |

## 保留测试数据

- 用户：`userId=131`，手机号 `13933529706`。
- 活动：`activityId=17`，租户 `qiwai-hangzhou`，活动“东方哲学与节气文化体验沙龙”。
- 报名：`registrationId=30702`，最终状态 `checked_in`。
- 订单：`orderId=698`，订单号 `OD178762615965930702`，状态 `partially_refunded`。
- 退款：`URF1787627629851698`，金额 `¥94.05`，状态 `completed`。
- 核销：`check_ins.id=169`，签到员 `qiwai_hz_checkin`；同一签到码重复提交后有效记录仍为 1 条。
- 邀请码：本次生成的活动专属邀请码已保留在分享追踪数据中；没有伪造报名人数或头像。
- 通知：`checkInSucceeded` 短信记录为 `suppressed`，会员 ID `131`，原因“自动短信场景已关闭”；没有调用真实短信服务商。

## 可选补充验收

- 活动空间“提问 -> 运营审核/回复 -> 用户看到回复”会新增一条待审核用户内容。本次未提交，避免未经确认写入面向用户的测试内容；接口契约、后台审核/回复入口和用户端表单已验证。后续需要做内容运营专项验收时，再使用专用验收文案并保留审核记录。

## 必须由发布环境完成

- 启动 API 和独立 `activity-worker`，分别检查 `/api/health/ready` 与 `/api/health/worker`。
- 使用测试账号在后台完成平台管理员、商家管理员、财务、签到员和普通用户流程；密码不写入仓库文档。
- 在微信开发者工具导入 `apps/mobile/dist/build/mp-weixin`，再用真机验收登录、扫码签到、长按群二维码识别、分享、客服和深链返回。
- 用沙箱或真实预发配置验收支付、退款、短信和微信订阅消息；生产真实支付开关保持关闭，直到证据齐全。
- 执行现有 smoke、备份、migration、readiness 和回滚演练后再发布。

## 发布前命令

```bash
set -Eeuo pipefail
cd /www/wwwroot/rd.chaimen666.com
export PATH=/www/server/nodejs/v22.22.3/bin:$PATH
BRANCH=feature/qiwai-ui-experiment

git fetch origin "$BRANCH"
git merge --ff-only "origin/$BRANCH"
COMMIT=$(git rev-parse --short=8 HEAD)
export NODE_ENV=production
export BUILD_COMMIT="$COMMIT"
export BUILD_TIME="$(date -Iseconds)"
export VITE_API_BASE=https://rd.chaimen666.com/api
export VITE_H5_ORIGIN=https://rd.chaimen666.com
export VITE_DEFAULT_TENANT_CODE=qiwai-showcase

npm run audit:runtime
npm run preflight
npm run db:backup
npm --prefix apps/api run migration:show
npm --prefix apps/api run migration:run
npm run build
npm run build:mobile:mp-weixin

WEBROOT=/www/wwwroot/rd.chaimen666.com/apps/mobile/dist/build/h5 \
ADMIN_WEBROOT=/www/wwwroot/rd.chaimen666.com/apps/admin/dist \
npm run publish:webroot

PM2=/www/server/nodejs/v22.22.3/lib/node_modules/pm2/bin/pm2
export APP_PROCESS_ROLE=api
export BUSINESS_JOB_WORKER_MODE=external
export BUSINESS_JOB_WORKER_ENABLED=false
"$PM2" restart activity-api --update-env

export APP_PROCESS_ROLE=worker
export BUSINESS_JOB_WORKER_MODE=external
export BUSINESS_JOB_WORKER_ENABLED=true
"$PM2" start apps/api/dist/worker.js --name activity-worker --update-env || "$PM2" restart activity-worker --update-env
"$PM2" save
API_READY_URL=https://rd.chaimen666.com/api/health/ready npm run wait:api-ready
npm run wait:worker-ready
/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload
curl -fsS https://rd.chaimen666.com/api/health/worker
curl -fsS https://rd.chaimen666.com/version.json
echo "发布完成：$COMMIT"
```

微信小程序不会随服务器静态发布自动更新。必须在微信开发者工具重新导入 `apps/mobile/dist/build/mp-weixin`，上传新的体验版并完成真机验收。

## 回滚

记录发布前的 API/H5/后台提交号和版本文件；出现阻断时先停止新流量，再回滚代码和静态产物、重启 API 与 Worker、检查两个 readiness、执行 smoke。不要删除业务数据，也不要在未评估的情况下反向执行数据库 migration。
