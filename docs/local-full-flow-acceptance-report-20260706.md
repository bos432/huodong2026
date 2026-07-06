# UI 与后端重编排本地全流程验收报告

生成时间：2026-07-06 08:55 +08:00

## 1. 验收结论

本次验收对象为工作副本：

```text
E:\2027\AI全自动开发1.0\活动报名-重编排工作副本
```

验收结论：通过本地部署、接口闭环、后台/H5 页面级自动化、手机管理端页面级自动化、构建和单元测试。测试数据已按要求保留在本地 MariaDB 数据库中。

说明：本轮 Codex 会话未暴露右侧 Browser 的控制工具，无法真实驱动右侧内嵌浏览器面板。因此页面级验收使用 Playwright Chromium 自动化完成，并保留截图与 `result.json`。未伪称完成右侧面板手工点击。

## 2. 本地服务

| 服务 | 地址 | 当前状态 |
| --- | --- | --- |
| API | `http://127.0.0.1:3000/api` | `ready=true` |
| API ready | `http://127.0.0.1:3000/api/health/ready` | 通过 |
| PC 后台 | `http://127.0.0.1:5174/admin/login` | 通过 |
| H5 | `http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/` | 通过 |
| MariaDB | `127.0.0.1:13306/activity_registration` | 通过 |

当前进程：

| 服务 | PID | 说明 |
| --- | ---: | --- |
| MariaDB | `54264` | 使用原项目 `.local-mariadb\data` |
| API | `15292` | `node --enable-source-maps apps/api/dist/main` |
| Admin dev | `63972` | Vite `5174` |
| Mobile H5 dev | `59420` | uni H5 `5173` |

API ready 的本地配置为 `warning`，无 blocking error。告警集中在生产前必须替换的 JWT、数据库密码、公网域名、H5 登录模式、支付沙箱、短信/邮件/订阅消息和调度任务等配置。

## 3. 测试账号

| 角色 | 账号 | 密码/验证码 | 说明 |
| --- | --- | --- | --- |
| 平台超管 | `admin` | `Admin123456` | 平台视角、商家、系统设置、小程序发布 |
| 商家管理员 | `showcase_admin` | `Qiwai123456` | 商家后台全功能演示 |
| 商家运营 | `showcase_ops` | `Qiwai123456` | 活动、报名、营销、手机管理端 |
| 财务 | `showcase_finance` | `Qiwai123456` | 订单、收款、退款、对账 |
| 签到员 | `showcase_checkin` | `Qiwai123456` | 签到核销 |
| 店铺负责人 | `showcase_store_owner` | `Qiwai123456` | 商城商品与订单 |
| 店铺财务 | `showcase_store_finance` | `Qiwai123456` | 商城订单与结算 |
| 代理负责人 | `showcase_agent_owner` | `Qiwai123456` | 代理结算与商城订单 |
| 演示会员 A-E | `13990000001` - `13990000005` | `Qiwai123456` | seed 保留演示用户 |
| 本次 H5 验收用户 | `13998703705` | 本地验证码登录，开发码 `123456` 或页面返回码 | 报名、收款、签到闭环保留 |

租户：`qiwai-showcase`，名称：`慢π演示中心`。

## 4. 保留测试数据

| 数据 | 值 |
| --- | --- |
| 页面级验收活动 | `id=52`，`【演示】亲子沟通工作坊`，`59.00` |
| 页面级 H5 手机号 | `13998703705` |
| 页面级报名 | `registrationId=139` |
| 页面级订单 | `orderId=139`，`orderNo=OD1783298707098139` |
| 页面级签到码 | `419082cf-fb50-450d-83f5-a41d23390a24` |
| 手机管理端验收活动 | `id=55`，`【手机验收保留】活动发布 20260706004617` |
| 演示广告计划 | `浏览器验收首页顶部广告` |
| 演示营销弹窗 | `浏览器验收首页弹窗` |

## 5. 自动化验收记录

| 命令 | 结果 |
| --- | --- |
| `npm run seed:online-showcase` | 通过，创建/更新演示商家、账号、活动、首页装修、营销弹窗、广告位、商城等数据 |
| `npm run smoke:online-showcase` | 通过，覆盖免费报名、余额支付、退款、动态评论审核、专题内容、商城、财务追溯 |
| `npm run browser:online-showcase` | 通过，覆盖 H5 登录报名、财务确认收款、签到核销、8 类后台角色权限、广告和装修入口 |
| `npm run browser:mobile-admin` | 通过，覆盖手机管理端登录、活动创建发布、报名、订单、签到页 |
| `npm --prefix apps/api run test` | 通过，15 个测试文件、179 个用例 |
| `npm --prefix apps/api run build` | 通过 |
| `npm --prefix apps/admin run build` | 通过，有大 chunk 体积提示 |
| `npm --prefix apps/mobile run build:h5` | 通过 |
| `npm --prefix apps/mobile run build:mp-weixin` | 通过，需使用 Node 22/24；Node 25 会触发 uni 原生崩溃 |
| `npm --prefix packages/shared run build` | 通过 |

## 6. 截图与结果文件

PC 后台 + H5 页面级验收：

```text
E:\2027\AI全自动开发1.0\活动报名-重编排工作副本\.local-logs\browser-acceptance-20260706004503\result.json
E:\2027\AI全自动开发1.0\活动报名-重编排工作副本\.local-logs\browser-acceptance-20260706004503\*.png
```

手机管理端页面级验收：

```text
E:\2027\AI全自动开发1.0\活动报名-重编排工作副本\.local-logs\mobile-admin-acceptance-20260706004617\result.json
E:\2027\AI全自动开发1.0\活动报名-重编排工作副本\.local-logs\mobile-admin-acceptance-20260706004617\*.png
```

## 7. 重要说明

- 本次修改了 `apps/mobile`，合并后必须重新构建微信小程序、上传体验版并提交审核。
- 本地 H5 使用 `H5_AUTH_MODE=dev`，正式交付生产环境必须切到真实短信验证码。
- 当前真实微信/支付宝支付未配置，本地仅验证沙箱/余额/线下确认链路，不代表真实资金链路已可上线。
- Node 25 运行 `uni build -p mp-weixin` 会出现 Windows 原生崩溃码 `-1073740791`；使用 Node 22/24 构建通过。
