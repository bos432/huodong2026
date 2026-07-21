const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
let token = String(process.env.USER_TOKEN || "").trim();
const tenantCode = String(process.env.TENANT_CODE || "").trim();
const skuId = Number(process.env.MALL_CHECKOUT_TEST_SKU_ID || 128);
const addressId = Number(process.env.MALL_CHECKOUT_TEST_ADDRESS_ID || 419);
const effectiveTenantCode = tenantCode || "qiwai-showcase";
if (!token) {
  const phone = process.env.ACCEPTANCE_PHONE || "13377779731";
  const codeResponse = await fetch(`${baseUrl}/public/auth/h5-code?tenantCode=${encodeURIComponent(effectiveTenantCode)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
  const codePayload = await codeResponse.json();
  const code = codePayload?.data;
  const loginResponse = await fetch(`${baseUrl}/public/auth/h5-login?tenantCode=${encodeURIComponent(effectiveTenantCode)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, nickname: "09.04确认订单验收", verificationToken: code?.verificationToken, verificationCode: code?.devCode || "000000" }) });
  const loginPayload = await loginResponse.json();
  token = String(loginPayload?.data?.userAccessToken || "");
}
if (!token) throw new Error("USER_TOKEN is required and automatic H5 login failed");
if (!Number.isInteger(skuId) || skuId <= 0) throw new Error("MALL_CHECKOUT_TEST_SKU_ID must be a sellable SKU id");
if (!Number.isInteger(addressId) || addressId <= 0) throw new Error("MALL_CHECKOUT_TEST_ADDRESS_ID must belong to USER_TOKEN");

async function request(path, method = "GET", data) {
  const response = await fetch(`${baseUrl}${path}${path.includes("?") ? "&" : "?"}tenantCode=${encodeURIComponent(effectiveTenantCode)}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, ok: response.ok, payload: payload?.data ?? payload };
}

const quote = await request("/public/mall/quote", "POST", { items: [{ skuId, quantity: 1 }] });
if (!quote.ok || !quote.payload?.quoteToken) throw new Error(`quote failed: ${JSON.stringify(quote)}`);
const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const tampered = await request("/public/mall/orders", "POST", { items: [{ skuId, quantity: 1 }], addressId, paymentMethod: "offline", quoteToken: `${quote.payload.quoteToken}x`, clientOrderKey: `checkout-tampered-${stamp}` });
const valid = await request("/public/mall/orders", "POST", { items: [{ skuId, quantity: 1 }], addressId, paymentMethod: "offline", quoteToken: quote.payload.quoteToken, clientOrderKey: `checkout-valid-${stamp}`, buyerRemark: `确认订单报价验收 ${stamp}` });
const passed = !tampered.ok && tampered.status < 500 && valid.ok && Boolean(valid.payload?.id);
console.log(JSON.stringify({ testedAt: new Date().toISOString(), baseUrl, tenantCode: effectiveTenantCode, skuId, quote: { goodsAmount: quote.payload.goodsAmount, payableAmount: quote.payload.payableAmount, quoteExpiresAt: quote.payload.quoteExpiresAt }, tamperedRejected: !tampered.ok, retainedOrderId: valid.payload?.id || null, passed, tampered, valid }, null, 2));
if (!passed) process.exitCode = 1;
