# 交付资料清单

交付时间：2026-07-06 08:55 +08:00

工作副本：

```text
E:\2027\AI全自动开发1.0\活动报名-重编排工作副本
```

## 1. 文档

| 文档 | 用途 |
| --- | --- |
| `docs/ui-backend-reorchestration-plan-20260706.md` | UI 与后端重编排正式方案 |
| `docs/local-full-flow-acceptance-report-20260706.md` | 本地全流程测试报告 |
| `docs/local-deployment-guide-20260706.md` | 本地部署与启动说明 |
| `docs/remediation-execution-plan-20260706.md` | 整改方案、执行记录和剩余上线事项 |
| `docs/delivery-guide-ui-reorchestration-20260706.md` | 给客户/运营团队的完整使用教程 |

## 2. 验收证据

| 目录 | 内容 |
| --- | --- |
| `.local-logs/browser-acceptance-20260706004503` | PC 后台 + H5 页面级验收 `result.json` 和截图 |
| `.local-logs/mobile-admin-acceptance-20260706004617` | 手机管理端页面级验收 `result.json` 和截图 |

## 3. 构建产物

| 目录 | 内容 |
| --- | --- |
| `apps/admin/dist` | PC 后台静态包 |
| `apps/mobile/dist/build/h5` | H5 静态包 |
| `apps/mobile/dist/build/mp-weixin` | 微信小程序包，优先通过后台“小程序发布”上传审核，开发者工具为兜底 |
| `apps/api/dist` | API 构建产物 |
| `packages/shared/dist` | shared 包构建产物 |

## 4. 交付账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 平台超管 | `admin` | `Admin123456` |
| 商家管理员 | `showcase_admin` | `Qiwai123456` |
| 商家运营/手机管理员 | `showcase_ops` | `Qiwai123456` |
| 财务 | `showcase_finance` | `Qiwai123456` |
| 签到员 | `showcase_checkin` | `Qiwai123456` |
| 店铺负责人 | `showcase_store_owner` | `Qiwai123456` |
| 店铺财务 | `showcase_store_finance` | `Qiwai123456` |
| 代理负责人 | `showcase_agent_owner` | `Qiwai123456` |
| 演示会员 | `13990000001` - `13990000005` | `Qiwai123456` |

## 5. 必须交代给客户的事项

- 本次涉及小程序端代码，必须重新构建、上传体验版并提交微信审核。
- 本地验证码、默认密码、沙箱支付只能用于演示，生产必须替换。
- Node 25 不适合当前 uni 小程序构建，建议 Node 22/24。
- 真实支付、短信、备份、监控、域名和 HTTPS 是正式上线前置条件。
