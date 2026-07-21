# 09.02 商品目录与审核治理验收报告（2026-07-17）

## 验收范围

- 平台类目层级、店铺分类、租户品牌库。
- SPU、SKU 编码、条码、规格属性、重量、图集、详情块和内容版本。
- 商品提交、驳回、重新提交、通过、发布快照与审核历史。
- 订单商品/SKU 快照及商品修改后的历史不变性。
- PC 商品工作台与 H5 商品详情。

## 本次整改

1. 新建分类时空上级与未生成 ID 被误判为自引用，现仅在真实上级存在时检查。
2. 合法详情块被 DTO 错误拒绝，现保留结构化数组并由服务层执行对象过滤和数量限制。
3. 后台商品详情复用公开序列化导致驳回原因、审核时间和发布快照丢失，现新增后台专用序列化且不向公开接口泄露审核信息。
4. 驳回后的再次提交原记录为 `submit`，现准确记录为 `resubmit`。
5. 并发唯一键冲突原有部分请求返回 500，现数据库重复键统一映射为 409 和稳定提示。
6. 库存异常列表的 CASE 排序表达式被 TypeORM 误识别为别名，现改为显式选择别名排序。
7. MySQL `NOW()` 原为 UTC、TypeORM 按 `+08:00` 读取，数据库默认时间少 8 小时；Compose 已统一 `Asia/Shanghai` 与 `--default-time-zone=+08:00`。
8. PC 商品时间明确按 `Asia/Shanghai` 展示。

## 自动化与数据库验收

执行：`npm run acceptance:mall-product-catalog`

- 平台父子类目、店铺分类和品牌创建成功；品牌编码重复返回 400。
- 杭州租户无法为演示中心店铺写分类或读取商品详情。
- 8 路并发创建相同 SPU 仅 1 路成功，其余稳定返回 400/409，无 500。
- 店铺内重复 SKU 编码/条码被拒绝。
- 商品由租户提交后进入待审核；无驳回原因请求被拒绝。
- 审核轨迹包含 `submit`、`reject`、`resubmit`、`approve`，每条保存操作人、状态变化和商品/SKU 快照。
- 发布时生成 `publishedSnapshot`，内容版本最终为 4。
- 创建线下订单后修改商品名称、属性、规格和价格，订单 `productSnapshot`、`skuSnapshot` 保持不变。
- 真实 MySQL 已确认以下唯一索引可见：
  - `UQ_mall_product_merchant_code`
  - `UQ_mall_sku_merchant_code`
  - `UQ_mall_sku_merchant_barcode`
  - `UQ_mall_category_tenant_scope_code`
  - `UQ_mall_brand_tenant_code`

最新保留数据：

- 平台类目：ID `97`、`98`；品牌：ID `12`；店铺分类：ID `99`。
- 商品：ID `102`；SKU：ID `129`；最终状态 `published`。
- 会员：ID `31031`，手机号 `13377779731`，密码 `Qiwai123456`。
- 地址：ID `419`；订单：ID `967`。
- 订单快照编码：SPU `SPU4277779731`，SKU `SKU4277779731`。
- 平台商城审核账号：`acceptance_platform_reviewer / Qiwai123456`。

## 浏览器验收

- PC `/admin/mall-products?merchantId=112&keyword=4277779731`：显示品牌、平台类目、店铺分类、SPU、库存、价格、发布状态和北京时间 `2026/7/17 16:43:00`。
- 审核记录弹窗完整显示提交、驳回、重新提交和两次通过记录，驳回原因与操作人正确。
- 库存异常统计不再出现 QueryBuilder CASE 别名错误。
- H5 商品详情显示真实本地上传商品图、品牌、SPU、平台类目、店铺、价格、规格属性、商品属性、配送和售后说明。

## 回归结果

- API：115 个测试文件，628 项测试全部通过。
- shared、API、PC、H5 构建通过。
- 微信小程序构建通过，产物位于 `apps/mobile/dist/build/mp-weixin`。
- API Docker 镜像已重建，MySQL/API 健康检查通过。

## 外部待验收

- 微信开发者工具真机图集滑动与正式对象存储域名需在生产配置到位后统一终验，本次不伪造正式环境结论。
