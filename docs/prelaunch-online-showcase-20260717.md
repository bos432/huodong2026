# 线上演示商家上线前检查记录

检查日期：2026-07-17

执行命令：`npm run prelaunch:online-showcase`

## 结论

`NO-GO`，保持 `REAL_PAYMENT_ENABLED=false`。本次检查发现 8 个上线阻塞项，均属于正式环境依赖或真实支付适配条件，不代表本地代码测试失败。

## 已通过

- 平台管理员登录成功。
- 演示商家 `qiwai-showcase` 存在。
- 微信支付和退款回调地址模板存在。
- 当前余额支付、线下收款处于 ready。

## 阻塞项

- 缺少 `deploy/real-payment-smoke-result.json`。
- 缺少 `deploy/mall-multi-merchant-smoke-result.json`。
- 当前 `API_BASE` 为本地 HTTP，不是线上 HTTPS。
- 商城真实微信支付下单/回调服务商路由尚未达到正式开放条件。
- 后台微信支付配置未就绪。
- `WECHAT_PAY_PRIVATE_KEY_PATH` 文件不可读取。
- `WECHAT_PAY_PLATFORM_CERT_PATH` 文件不可读取。
- 前台商城微信支付仍被服务端关闭。

## 处理要求

正式主体提供支付商户号、私钥、平台证书、HTTPS API 域名和真实联调回执后，依次执行真实支付 smoke、多商户商城 smoke、线上演示 smoke，再重新运行本检查。未完成前继续使用余额支付、线下收款或沙箱，不开启真实支付开关。
