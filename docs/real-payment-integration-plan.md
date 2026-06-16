# 真实支付接入计划

当前系统已经具备订单、支付流水、支付回调审计、退款审核、对账差异和沙箱签名回调能力，但微信/支付宝接口仍是 HMAC 沙箱骨架。真实支付上线前按本文推进，避免测试端点误接生产订单。

## 当前状态

- `PAYMENT_SANDBOX_ENABLED=false` 时，生产环境会拒绝 mock/沙箱支付端点。
- `POST /public/orders/:id/pay/wechat`、`POST /public/orders/:id/pay/alipay` 已预留真实 provider adapter 路径；微信 Native/H5/JSAPI 和支付宝预创建/WAP/PAGE 下单的签名请求、HTTP 执行、响应验签与支付参数归一化底座已完成，但仍受 `REAL_PAYMENT_SDK_IMPLEMENTED=false` 挡板保护，未通过预发验收前不会发起真实下单。
- `POST /payment/wechat/callback`、`POST /payment/alipay/callback` 在真实 provider adapter 未实现前仍只校验内部 HMAC 签名，不是服务商官方验签。
- `PaymentProviderService` 已经承载沙箱支付参数生成、沙箱回调解析、沙箱开关判断、真实 provider adapter 合同、真实下单 HTTP 执行底座、真实回调 raw payload 入口、真实退款请求合同、真实退款查询合同、退款请求/查询结果归一化 helper、微信/支付宝退款请求和查询签名请求草稿、退款 HTTP 执行底座、退款响应验签底座、退款通知解析底座、退款通知 provider 合同、真实账单拉取合同、账单下载地址签名请求和 CSV 解析底座；后续真实微信/支付宝能力扩展应继续在这一层实现，不要继续把服务商细节塞回 `PublicService`。
- `WechatPayAdapter`、`AlipayAdapter` 已具备必需商户配置校验、金额分转换、订单标题生成、微信 Native/H5/JSAPI 下单草稿、支付宝预创建/WAP/PAGE 下单参数、退款草稿和 raw callback payload 前置校验。
- 支付创建链路已改为 async，并已接入真实下单 HTTP 执行、响应验签和多场景支付参数生成底座；当前默认仍关闭 `REAL_PAYMENT_SDK_IMPLEMENTED`，等待真实商户预发样例确认后再放行。
- API 已开启 `rawBody`，微信/支付宝回调控制器会把 body、headers 和 rawBody 传入 provider adapter，供官方证书验签使用。
- 微信回调已解析 `wechatpay-timestamp`、`wechatpay-nonce`、`wechatpay-signature`、`wechatpay-serial` 并用平台证书验签，随后用 API v3 key 解密 `resource`，只接受 `trade_state=SUCCESS` 的成功支付并归一化订单号、交易号和金额；支付宝回调已解析 `app_id`、`charset`、`sign`、`sign_type`、`trade_no`、`out_trade_no`、`trade_status` 和金额字段，并用支付宝公钥证书验签后只接受 `TRADE_SUCCESS` / `TRADE_FINISHED`。
- 后台退款审核已预留真实退款挂点；真实微信/支付宝退款成功后会记录服务商退款单号、服务商状态、同步时间、失败原因、重试次数、下次查询时间和原始 payload。服务商返回处理中时，本地订单/报名/积分保持不变，待退款查询或通知确认成功后再完成本地退款。当前已新增微信/支付宝退款请求和退款查询返回结构归一化 helper，可把成功、处理中、失败状态映射为统一结果，并对未知状态直接拒绝；同时已生成微信 API v3 退款申请/单笔退款查询 Authorization 草稿、支付宝 `alipay.trade.refund` / `alipay.trade.fastpay.refund.query` 表单签名草稿、HTTP 执行底座和响应验签底座，能解析 JSON、拦截 HTTP/业务错误、解包支付宝响应，并校验微信响应头签名与支付宝网关响应签名。退款通知公网入口第一版已完成，微信/支付宝通知会按订单选择代理收款配置后验签/解析并同步服务商退款状态；成功通知、退款查询成功和后台本地退款已统一复用 `RefundCompletionService`，不会绕过超退、积分和报名状态保护。真实退款请求、`queryRefund` 和退款通知仍受 `REAL_REFUND_QUERY_IMPLEMENTED` 挡板保护；打开标记前还需要预发真实样例和回滚方案。
- 多商家/地区代理收款已开始建模：活动可绑定代理，订单创建时会锁定代理，真实支付下单、退款和回调验签会按订单代理读取该代理自己的微信/支付宝收款账户；缺代理收款配置时会拒绝支付或回调处理，避免串账。
- 后台已新增“代理收款”和“代理结算”页面，可维护代理资料、微信/支付宝支付账户、商户号和支付配置 JSON；敏感配置字段返回时会脱敏。订单和财务页面已支持按代理筛选，财务看板会展示代理收款汇总，财务可按代理周期生成结算单、审核、核对明细、发现重算差异、拦截打款风险、上传打款凭证、查看结算审计、标记线下打款并导出。
- 代理结算页已新增自动打款能力评估；系统会检查真实支付开关、微信/支付宝渠道开关、转账产品系统参数和代理收款人资料，输出“手动登记 / 未就绪 / 可沙箱验证 / 可真实验证”等状态。微信商家转账请求和查询已接入签名、实名加密、HTTP 执行和响应验签；支付宝真实转账仍保持草稿挡板。
- 已新增代理结算沙箱打款演练；财务可对已审核且无阻断风险的结算单发起沙箱成功或失败回执，成功会按沙箱回执标记已打款，失败只写入结算审计且不改变结算单状态。
- 已新增 `AgentSettlementTransfer` 打款记录表；沙箱打款会持久化幂等转账单号、支付账户、渠道、服务商回执号、状态、失败原因、同步时间和 payload，代理结算核对页可查看打款回执，并可手动触发回执补偿扫描。
- 已新增真实转账请求/查询 adapter 合同和后端入口；微信商家转账会使用结算单幂等转账单号发起真实请求，并通过补偿扫描按转账单号查询结果。未完成配置、预发证据或支付机构产品开通前，真实入口仍由能力评估和 `AGENT_REAL_TRANSFER_IMPLEMENTED` 挡板保护。
- 财务页已能查看支付流水、回调日志、对账差异和退款审核，并可手动扫描退款回执、导入服务商 JSON 账单、触发服务商账单自动拉取和查看账单匹配结果。当前已新增微信交易账单下载地址 API v3 签名草稿、支付宝 `alipay.data.dataservice.bill.downloadurl.query` 表单签名草稿、账单下载执行、CSV 文本解析、gzip 解包、zip 包内 CSV/TXT 提取、异常列名兼容、1200 行大文件解析回归、代理账户路由和跨机构拒绝用例；仍受 `REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED=false` 挡板保护，打开前还需要真实商户账单样例验证服务商真实列名差异和预发账号路由。

## 配置开关

真实支付正式启用前，生产环境保持：

```bash
PAYMENT_SANDBOX_ENABLED=false
REAL_PAYMENT_ENABLED=false
WECHAT_PAY_ENABLED=false
ALIPAY_ENABLED=false
```

接入真实支付时至少启用一个渠道，并配置对应字段：

```bash
REAL_PAYMENT_ENABLED=true
REAL_PAYMENT_SDK_IMPLEMENTED=false
REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED=false
REAL_REFUND_QUERY_IMPLEMENTED=false
REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED=false
AGENT_REAL_TRANSFER_IMPLEMENTED=false
REAL_PAYMENT_PREFLIGHT_PASSED=false
REAL_PAYMENT_PREFLIGHT_RESULT_FILE=deploy/real-payment-smoke-result.json
REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS=168

WECHAT_PAY_ENABLED=true
WECHAT_PAY_APP_ID=<公众号或小程序 AppID>
WECHAT_PAY_MCH_ID=<商户号>
WECHAT_PAY_API_V3_KEY=<API v3 key>
WECHAT_PAY_PRIVATE_KEY_PATH=<商户私钥文件路径>
WECHAT_PAY_CERT_SERIAL_NO=<商户证书序列号>
WECHAT_PAY_NOTIFY_URL=https://api.example.com/payment/wechat/callback

ALIPAY_ENABLED=true
ALIPAY_APP_ID=<支付宝应用 ID>
ALIPAY_PRIVATE_KEY_PATH=<应用私钥路径>
ALIPAY_PUBLIC_CERT_PATH=<支付宝公钥证书路径>
ALIPAY_ROOT_CERT_PATH=<支付宝根证书路径>
ALIPAY_NOTIFY_URL=https://api.example.com/payment/alipay/callback
```

如要推进代理自动打款，还需要按支付机构实际开通产品补充转账字段。当前字段仅作为沙箱验证前置评估，不能代表真实接口已可调用：

```bash
WECHAT_TRANSFER_APP_ID=<商家转账 AppID>
WECHAT_TRANSFER_SCENE_ID=<商家转账场景 ID>
WECHAT_TRANSFER_REMARK=<默认转账备注>

ALIPAY_TRANSFER_PRODUCT_CODE=<支付宝转账产品码>
ALIPAY_TRANSFER_REMARK=<默认转账备注>
```

每个代理支付账户还需要在后台配置对应收款人字段：

```json
{
  "WECHAT_TRANSFER_OPENID": "<代理收款人 OpenID>",
  "WECHAT_TRANSFER_REAL_NAME": "<代理收款人实名>",
  "ALIPAY_PAYEE_ACCOUNT": "<代理支付宝账号>",
  "ALIPAY_PAYEE_REAL_NAME": "<代理支付宝实名>"
}
```

## 后端改造步骤

1. 已完成：在 `PaymentProviderService` 中新增真实 provider 合同，保持 `PublicService` 只处理订单校验、幂等更新和对账差异。
2. 已完成：新增代理、代理支付账户和代理结算模型，真实支付下单、退款和回调验签已根据 `order.agent` 选择收款账户；活动、订单、财务页面已补充代理归属展示、筛选、代理收款汇总，以及结算生成、审核、打款登记和导出。
3. 进行中：微信支付 adapter 已具备配置校验、Native/H5/JSAPI 下单签名请求、HTTP 执行、响应验签、`code_url` / `h5_url` / JSAPI 参数归一化；下一步用真实商户预发样例确认 openId 获取、H5 客户端 IP、代理账户路由和回滚方案。
4. 进行中：支付宝 adapter 已具备配置校验、`alipay.trade.precreate` / `alipay.trade.wap.pay` / `alipay.trade.page.pay` 签名请求、HTTP 执行、响应验签、`qr_code` 与 WAP/PAGE 表单参数归一化；下一步用真实商户预发样例确认 `returnUrl`、代理账户路由和回滚方案。
5. 已完成代码底座：回调接口已接入 raw body 管道，微信已完成平台证书验签、API v3 resource 解密、`SUCCESS` 状态保护和成功支付归一化；支付宝已完成证书验签、`TRADE_SUCCESS` / `TRADE_FINISHED` 状态保护和成功支付归一化。下一步在预发验证重复回调、异常金额、证书轮换、代理收款账户和真实服务商样例 payload。
6. 回调验签成功后继续复用现有 `applySuccessfulPayment` 幂等逻辑。
7. 回调金额不一致继续写入 `payment_transactions` 对账差异，不修改订单状态。
8. 进行中：退款审核通过后可调用真实退款接口；已新增退款请求和查询合同、退款回执扫描入口、处理中状态保护、微信/支付宝退款请求和查询结果归一化 helper、签名请求草稿、HTTP 执行底座、响应验签底座、退款通知解析底座、退款通知公网入口第一版和本地退款完成共享服务。下一步补齐真实商户预发样例、开关验收和回滚记录。
9. 已完成：新增代理自动打款能力评估接口和转账适配器骨架；微信商家转账已支持真实请求、查询、响应验签和成功/失败/处理中归一化，支付宝仍只生成配置评估和转账草稿。
10. 已完成：新增代理沙箱打款接口，支持成功回执标记已打款，以及失败回执只写审计不改状态。
11. 已完成：新增代理结算打款记录表和补偿扫描接口，沙箱打款不再只依赖操作日志，后续真实 SDK 可直接回填结构化转账记录。
12. 已完成：新增真实转账请求/查询合同和失败保护入口；微信真实打款不会在请求未成功或查询未确认成功时标记结算单已打款，失败会保留结构化回执和审计。
13. 下一步：确认微信商家转账产品已开通，补齐 `WECHAT_TRANSFER_APP_ID`、`WECHAT_TRANSFER_SCENE_ID` 和代理 OpenID/实名，完成小额预发成功查询、失败用例和回滚记录；支付宝单笔转账另行排期。
14. 进行中：已新增服务商账单原始记录表、手动导入入口、自动拉取 provider 合同、后台触发入口、微信/支付宝账单下载地址签名请求、下载执行、CSV 文本解析、gzip 解包、zip 包内 CSV/TXT 提取、异常列名兼容、1200 行大文件解析回归、代理账户路由和跨机构拒绝用例；导入后会匹配本地订单并把金额不一致、未知订单、订单状态异常落入现有财务对账差异。下一步用真实商户账单样例验证服务商真实列名差异和预发账号路由。
15. 已完成挡板：上线体检和 `npm run preflight` 已加入真实支付 SDK、回调验签、退款查询、账单拉取和代理真实打款实现状态检查；这些标记默认必须保持 `false`，只有代码实现和预发验收完成后才逐项改为 `true`。
16. 已完成验收留档底座：新增 `npm run smoke:real-payment -- --init` 生成 `deploy/real-payment-smoke-result.json` 模板，预发跑通真实支付后把支付下单、多场景覆盖、支付回调、重复回调、异常金额、退款请求、退款通知、退款查询、账单拉取、代理账户路由、代理真实打款和回滚方案标记为 passed。代理真实打款必须留存 provider、代理、结算单、幂等转账单号、服务商转账单号、金额、成功查询、失败用例和回滚记录。`REAL_PAYMENT_ENABLED=true` 或任何真实支付实现标记改为 `true` 时，`npm run preflight` 会要求 `REAL_PAYMENT_PREFLIGHT_PASSED=true` 且结果文件新鲜有效。

## 验收清单

- 生产环境 `PAYMENT_SANDBOX_ENABLED=false`，mock/沙箱端点不能修改生产订单。
- 微信/支付宝支付参数由官方 SDK 或官方签名算法生成。
- 代理活动产生的订单必须支付到订单锁定代理的收款账户，不能使用平台默认商户或其他代理商户。
- 财务后台必须能按代理筛选订单、流水、退款、回调和对账差异，并能查看每个代理的实收、退款、净收入。
- 财务后台必须能按代理周期生成结算单，记录实收、退款、净收入、佣金、应打款、审核状态和线下打款凭证，避免代理收款后缺少结算闭环。
- 标记代理结算已打款前必须完成重算核对；若存在结算快照差异或待处理对账差异，后台必须阻断打款登记。
- 线下打款必须至少记录转账流水号或上传图片/PDF 凭证，结算核对页应展示凭证和生成、提交、审核、打款等操作审计。
- 自动打款上线前，后台必须展示每个代理支付账户的转账能力评估，未通过沙箱小额验证的代理不能开放真实自动打款。
- 沙箱打款演练必须覆盖成功和失败两类回执；失败回执只能写入审计，不能把结算单标记为已打款。
- 真实自动打款必须以结算单号生成幂等转账单号，成功/失败回执必须回写 `AgentSettlementTransfer` 和结算审计，失败时不得把结算单标记为已打款。
- 真实支付预发验收必须包含代理真实打款证据；缺少成功查询、失败用例或回滚记录时，不允许把真实支付或代理真实打款实现标记改为已完成。
- 官方 SDK 未接入前，后台不得展示真实打款按钮；真实入口若被调用，只能落失败回执，不能产生资金状态假阳性。
- 回执查询补偿必须能扫描 pending/processing/failed 转账记录，记录重试次数、同步时间、下一次查询时间和原始 payload。
- 真实回调必须先解析订单号定位订单和代理账户，再使用该代理账户配置验签，随后校验金额并幂等更新订单。
- 重复回调不会重复生成支付流水或重复加积分。
- 金额异常回调不会修改订单，会生成待处理对账差异。
- 退款审核通过后能拿到服务商退款单号，退款结果可通过回调或查询同步。
- 服务商退款处理中时不得提前修改本地订单、报名和积分，且处理中金额必须占用可退额度，避免重复申请导致超退。
- 服务商对账单导入或自动拉取后必须保留原始账单行；未知订单、金额不一致和订单状态异常必须进入财务待处理列表。
- 财务导出包含真实服务商交易号、退款号、对账状态和处理备注。
- 预发环境完整跑通：下单、支付、回调、重复回调、异常金额回调、退款、退款回调、对账扫描。
