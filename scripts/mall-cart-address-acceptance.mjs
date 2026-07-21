const baseUrl = String(process.env.API_BASE_URL || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const tenantCode = process.env.TENANT_CODE || "qiwai-showcase";
const phone = process.env.ACCEPTANCE_PHONE || "13377779731";
const skuId = Number(process.env.MALL_CART_TEST_SKU_ID || 128);
const productId = Number(process.env.MALL_CART_TEST_PRODUCT_ID || 95);
const concurrency = Number(process.env.MALL_CART_TEST_CONCURRENCY || 8);

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function raw(path, { method = "GET", token, body } = {}) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${baseUrl}${path}${separator}tenantCode=${encodeURIComponent(tenantCode)}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, ok: response.ok, data: payload?.data ?? payload, message: payload?.message || text };
}

async function request(path, options = {}) {
  const result = await raw(path, options);
  if (!result.ok) throw new Error(`${options.method || "GET"} ${path} failed (${result.status}): ${result.message}`);
  return result.data;
}

const verification = await request("/public/auth/h5-code", { method: "POST", body: { phone } });
const login = await request("/public/auth/h5-login", {
  method: "POST",
  body: { phone, nickname: "09.04购物车地址验收", verificationToken: verification.verificationToken, verificationCode: verification.devCode || "000000" }
});
const token = login.userAccessToken;
assert(token, "H5 login token missing");

const cartBefore = await request("/public/me/mall/cart", { token });
const existing = cartBefore.find((row) => Number(row.sku?.id || row.skuId) === skuId);
if (existing) await request(`/public/me/mall/cart/${existing.id}`, { method: "PUT", token, body: { quantity: 0 } });
const initialQuantity = 0;
const addResults = await Promise.all(Array.from({ length: concurrency }, () => raw("/public/me/mall/cart", { method: "POST", token, body: { skuId, quantity: 1 } })));
assert(addResults.every((row) => row.ok), `concurrent cart add failed: ${JSON.stringify(addResults.filter((row) => !row.ok))}`);
const cartAfter = await request("/public/me/mall/cart", { token });
const targetRows = cartAfter.filter((row) => Number(row.sku?.id || row.skuId) === skuId);
assert(targetRows.length === 1, `cart unique row mismatch: ${targetRows.length}`);
assert(Number(targetRows[0].quantity) === initialQuantity + concurrency, `cart quantity mismatch: ${targetRows[0].quantity}`);
assert(typeof targetRows[0].purchasable === "boolean", "cart purchasable state missing");
assert(Number(targetRows[0].lineAmount || 0) >= 0, "cart server line amount missing");

await raw(`/public/me/mall/products/${productId}/favorite`, { method: "DELETE", token });
const favorite = await request(`/public/me/mall/products/${productId}/favorite`, { method: "POST", token });
assert(favorite.favorited === true, "favorite create failed");
const favoriteStatus = await request(`/public/me/mall/products/${productId}/favorite`, { token });
assert(favoriteStatus.favorited === true, "favorite status mismatch");

await Promise.all([
  request(`/public/me/mall/products/${productId}/browse`, { method: "POST", token }),
  request(`/public/me/mall/products/${productId}/browse`, { method: "POST", token })
]);
const histories = await request("/public/me/mall/browse-histories", { token });
assert(histories.some((row) => Number(row.product?.id || row.productId) === productId), "browse history missing");

const stamp = String(Date.now()).slice(-8);
const addressBodies = [1, 2].map((index) => ({
  receiverName: `09.04并发默认地址${index}`,
  receiverPhone: `133${stamp.slice(0, 7)}${index}`,
  province: "浙江省",
  city: "杭州市",
  district: "西湖区",
  detail: `文三路09.04默认地址并发验收${stamp}-${index}`,
  isDefault: true
}));
const addressesBefore = await request("/public/me/mall/addresses", { token });
const addressResults = await Promise.all(addressBodies.map((body, index) => {
  const existingAddress = addressesBefore.find((row) => row.receiverName === body.receiverName);
  return raw(existingAddress ? `/public/me/mall/addresses/${existingAddress.id}` : "/public/me/mall/addresses", { method: existingAddress ? "PUT" : "POST", token, body });
}));
assert(addressResults.every((row) => row.ok), `concurrent address create failed: ${JSON.stringify(addressResults)}`);
const addresses = await request("/public/me/mall/addresses", { token });
const defaults = addresses.filter((row) => row.isDefault);
assert(defaults.length === 1, `default address count mismatch: ${defaults.length}`);

console.log(JSON.stringify({
  testedAt: new Date().toISOString(),
  tenantCode,
  userId: login.user?.id || null,
  cart: { skuId, concurrency, initialQuantity, finalQuantity: targetRows[0].quantity, cartItemId: targetRows[0].id, purchasable: targetRows[0].purchasable, unavailableReason: targetRows[0].unavailableReason || null, lineAmount: targetRows[0].lineAmount },
  favorite: { productId, favorited: favoriteStatus.favorited },
  browseHistoryCount: histories.length,
  addresses: { retainedIds: addressResults.map((row) => row.data?.id).filter(Boolean), total: addresses.length, defaultCount: defaults.length, defaultId: defaults[0]?.id || null },
  passed: true
}, null, 2));
