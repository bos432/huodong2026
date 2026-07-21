const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const PASSWORD = process.env.ACCEPTANCE_PASSWORD || "Qiwai123456";
const TENANT_CODE = process.env.ACCEPTANCE_TENANT_CODE || "qiwai-showcase";
const TENANT_ID = Number(process.env.ACCEPTANCE_TENANT_ID || 23);
const MERCHANT_ID = Number(process.env.ACCEPTANCE_MERCHANT_ID || 112);
const stamp = Date.now();

function assert(value, message) { if (!value) throw new Error(message); }

async function raw(path, { method = "GET", token, tenantCode, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(tenantCode ? { "x-tenant-code": tenantCode } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, data: payload?.data, message: payload?.message || text };
}

async function request(path, options = {}) {
  const result = await raw(path, options);
  if (result.status < 200 || result.status >= 300 || result.data === undefined) {
    throw new Error(`${options.method || "GET"} ${path} failed (${result.status}): ${result.message}`);
  }
  return result.data;
}

async function adminLogin(username) {
  return (await request("/admin/auth/login", { method: "POST", body: { username, password: PASSWORD } })).token;
}

async function main() {
  const tenantToken = await adminLogin("accept_110421_admin");
  const platformToken = await adminLogin("acceptance_platform_reviewer");
  const crossTenantToken = await adminLogin("qiwai_hz_admin");
  const suffix = String(stamp).slice(-10).toUpperCase();

  const platformRoot = await request("/admin/mall/categories", {
    method: "POST", token: platformToken,
    body: { tenantId: TENANT_ID, scope: "platform", code: `PC${suffix}`, name: `09.02平台类目${suffix}`, sortOrder: 900 }
  });
  const platformChild = await request("/admin/mall/categories", {
    method: "POST", token: platformToken,
    body: { tenantId: TENANT_ID, scope: "platform", code: `PCC${suffix}`, parentId: platformRoot.id, name: `09.02平台子类${suffix}`, sortOrder: 901 }
  });
  assert(platformChild.parent?.id === platformRoot.id, "平台类目层级未保存");

  const brand = await request("/admin/mall/brands", {
    method: "POST", token: platformToken,
    body: { tenantId: TENANT_ID, code: `BR${suffix}`, name: `09.02验收品牌${suffix}`, description: "商品目录治理验收保留品牌", status: "active", sortOrder: 900 }
  });
  const duplicateBrand = await raw("/admin/mall/brands", {
    method: "POST", token: platformToken,
    body: { tenantId: TENANT_ID, code: brand.code, name: "重复品牌编码" }
  });
  assert(duplicateBrand.status === 400, "租户品牌编码重复未拦截");

  const storeCategory = await request("/admin/mall/categories", {
    method: "POST", token: tenantToken,
    body: { tenantId: TENANT_ID, merchantId: MERCHANT_ID, scope: "merchant", code: `SC${suffix}`, name: `09.02店铺分类${suffix}`, sortOrder: 900 }
  });
  const crossCategory = await raw("/admin/mall/categories", {
    method: "POST", token: crossTenantToken,
    body: { tenantId: TENANT_ID, merchantId: MERCHANT_ID, scope: "merchant", code: `CROSS${suffix}`, name: "跨租户分类" }
  });
  assert([403, 404].includes(crossCategory.status), "跨租户店铺分类写入未拒绝");

  const productCode = `SPU${suffix}`;
  const skuCode = `SKU${suffix}`;
  const barcode = `69${String(stamp).slice(-11)}`;
  const coverUrl = "http://127.0.0.1:3000/uploads/images-t23-a164/2026-07-17/1784277325514-c568f20833d1cb0d.jpg";
  const productBody = {
    tenantId: TENANT_ID,
    merchantId: MERCHANT_ID,
    categoryId: storeCategory.id,
    platformCategoryId: platformChild.id,
    brandId: brand.id,
    productCode,
    title: `09.02商品目录验收${suffix}`,
    coverUrl,
    description: "用于验证 SPU、SKU、审核轨迹与订单历史快照。",
    galleryUrls: [coverUrl],
    detailBlocks: [{ type: "text", content: "09.02 商品详情块" }],
    attributes: { material: "陶瓷", origin: "杭州" },
    status: "published",
    featured: true,
    deliveryNote: "默认快递发货",
    afterSaleNote: "未发货支持退款",
    skus: [{ name: "标准款", skuCode, barcode, attributes: { color: "白色", capacity: "350ml" }, weightGrams: 520, price: 88.8, originalPrice: 128, stock: 30, enabled: true }]
  };

  const concurrentCreates = await Promise.all(Array.from({ length: 8 }, () => raw("/admin/mall/products", { method: "POST", token: tenantToken, body: productBody })));
  const createdRows = concurrentCreates.filter((item) => item.status >= 200 && item.status < 300).map((item) => item.data);
  assert(createdRows.length === 1, `并发 SPU 唯一约束异常，成功 ${createdRows.length} 次：${JSON.stringify(concurrentCreates.map((item) => ({ status: item.status, message: item.message })))}`);
  assert(concurrentCreates.filter((item) => item.status === 400 || item.status === 409).length === 7, `并发重复 SPU 未稳定返回业务冲突：${JSON.stringify(concurrentCreates.map((item) => ({ status: item.status, message: item.message })))}`);
  let product = createdRows[0];
  assert(product.status === "pending_review", "租户提交发布商品未进入待审核");
  const sku = product.skus[0];
  assert(sku.skuCode === skuCode && sku.barcode === barcode && sku.weightGrams === 520, "SKU 完整字段未保存");

  const duplicateSkuBody = { ...productBody, productCode: `SPU2${suffix}`, title: `09.02重复SKU${suffix}` };
  const duplicateSku = await raw("/admin/mall/products", { method: "POST", token: tenantToken, body: duplicateSkuBody });
  assert(duplicateSku.status === 400 || duplicateSku.status === 409, "店铺内重复 SKU 编码/条码未拦截");

  const crossProduct = await raw(`/admin/mall/products/${product.id}`, { token: crossTenantToken });
  assert([403, 404].includes(crossProduct.status), "跨租户商品详情读取未拒绝");
  const missingRejectReason = await raw(`/admin/mall/products/${product.id}/reject`, { method: "POST", token: platformToken, body: {} });
  assert(missingRejectReason.status === 400, "商品驳回未强制填写原因");
  product = await request(`/admin/mall/products/${product.id}/reject`, { method: "POST", token: platformToken, body: { remark: "详情图说明不足，请补充材质说明" } });
  assert(product.status === "draft" && product.reviewRemark.includes("材质"), "商品驳回状态或原因不正确");

  const resubmitBody = { ...productBody, title: `${productBody.title}（已补充）`, description: `${productBody.description} 已补充材质和容量说明。`, status: "published", skus: product.skus.map((item) => ({ id: item.id, name: item.name, skuCode: item.skuCode, barcode: item.barcode, attributes: item.attributes, weightGrams: item.weightGrams, price: Number(item.price), originalPrice: Number(item.originalPrice), stock: item.stock, enabled: item.enabled })) };
  product = await request(`/admin/mall/products/${product.id}`, { method: "PATCH", token: tenantToken, body: resubmitBody });
  assert(product.status === "pending_review" && product.contentVersion >= 2, "商品重新提交或内容版本未生效");
  product = await request(`/admin/mall/products/${product.id}/approve`, { method: "POST", token: platformToken, body: { remark: "补充完整，审核通过" } });
  assert(product.status === "published" && product.publishedSnapshot?.productCode === productCode, "商品发布快照未生成");
  const history = await request(`/admin/mall/products/${product.id}/audit-history`, { token: tenantToken });
  for (const action of ["submit", "reject", "resubmit", "approve"]) assert(history.some((item) => item.action === action), `缺少商品审核轨迹 ${action}`);

  const phone = `133${String(stamp).slice(-8)}`;
  const user = await request("/public/auth/password-login", { method: "POST", tenantCode: TENANT_CODE, body: { phone, password: PASSWORD, nickname: `商品快照验收${suffix.slice(-5)}` } });
  const userToken = user.userAccessToken;
  const address = await request(`/public/me/mall/addresses?tenantCode=${TENANT_CODE}`, {
    method: "POST", token: userToken, tenantCode: TENANT_CODE,
    body: { receiverName: "快照验收", receiverPhone: phone, province: "浙江省", city: "杭州市", district: "西湖区", detail: "文三路09.02验收地址", isDefault: true }
  });
  const quote = await request(`/public/mall/quote?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, tenantCode: TENANT_CODE, body: { items: [{ skuId: sku.id, quantity: 1 }] } });
  const order = await request(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST", token: userToken, tenantCode: TENANT_CODE,
    body: { items: [{ skuId: sku.id, quantity: 1 }], addressId: address.id, paymentMethod: "offline", quoteToken: quote.quoteToken, clientOrderKey: `catalog-snapshot-${stamp}`, buyerRemark: "09.02 历史快照验收" }
  });
  const orderBeforeEdit = await request(`/public/me/mall/orders/${order.id}?tenantCode=${TENANT_CODE}`, { token: userToken, tenantCode: TENANT_CODE });
  const orderItemBefore = orderBeforeEdit.items[0];
  assert(orderItemBefore.productSnapshot.productCode === productCode && orderItemBefore.skuSnapshot.skuCode === skuCode, "订单未冻结 SPU/SKU 快照");

  const editedBody = { ...resubmitBody, title: `${resubmitBody.title}（订单后改名）`, attributes: { material: "玻璃", origin: "宁波" }, status: "draft", skus: resubmitBody.skus.map((item) => ({ ...item, attributes: { color: "透明", capacity: "500ml" }, price: 99.9 })) };
  await request(`/admin/mall/products/${product.id}`, { method: "PATCH", token: tenantToken, body: editedBody });
  const orderAfterEdit = await request(`/public/me/mall/orders/${order.id}?tenantCode=${TENANT_CODE}`, { token: userToken, tenantCode: TENANT_CODE });
  const orderItemAfter = orderAfterEdit.items[0];
  assert(JSON.stringify(orderItemAfter.productSnapshot) === JSON.stringify(orderItemBefore.productSnapshot), "商品修改后订单商品快照被改写");
  assert(JSON.stringify(orderItemAfter.skuSnapshot) === JSON.stringify(orderItemBefore.skuSnapshot), "SKU 修改后订单规格快照被改写");
  const finalSubmission = await request(`/admin/mall/products/${product.id}`, { method: "PATCH", token: tenantToken, body: { ...editedBody, status: "published" } });
  assert(finalSubmission.status === "pending_review", "修改后商品未重新进入审核");
  const finalProduct = await request(`/admin/mall/products/${product.id}/approve`, { method: "POST", token: platformToken, body: { remark: "订单快照验证完成，修改版重新发布" } });
  assert(finalProduct.status === "published", "修改版商品未重新发布");

  console.log(JSON.stringify({
    tenantId: TENANT_ID,
    merchantId: MERCHANT_ID,
    platformCategoryIds: [platformRoot.id, platformChild.id],
    brandId: brand.id,
    storeCategoryId: storeCategory.id,
    productId: product.id,
    finalContentVersion: finalProduct.contentVersion,
    skuId: sku.id,
    auditActions: history.map((item) => item.action),
    member: { id: user.user.id, phone, password: PASSWORD },
    addressId: address.id,
    orderId: order.id,
    orderNo: order.orderNo,
    snapshotProductCode: orderItemAfter.productSnapshot.productCode,
    snapshotSkuCode: orderItemAfter.skuSnapshot.skuCode
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
