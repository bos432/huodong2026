const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const token = String(process.env.USER_TOKEN || "").trim();
const tenantCode = String(process.env.TENANT_CODE || "").trim();
const skuIds = String(process.env.MALL_CHECKOUT_GROUP_SKU_IDS || "").split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0);
const addressId = Number(process.env.MALL_CHECKOUT_TEST_ADDRESS_ID || 0);
const paymentMethod = String(process.env.MALL_CHECKOUT_GROUP_PAYMENT_METHOD || "offline").trim();
const couponCode = String(process.env.MALL_CHECKOUT_GROUP_COUPON_CODE || "").trim();
const pointsToUse = Math.max(Math.trunc(Number(process.env.MALL_CHECKOUT_GROUP_POINTS || 0)), 0);
if (!token) throw new Error("USER_TOKEN is required");
if (!tenantCode) throw new Error("TENANT_CODE is required");
if (skuIds.length < 2) throw new Error("MALL_CHECKOUT_GROUP_SKU_IDS requires at least two sellable SKU ids from different merchants");
if (!Number.isInteger(addressId) || addressId <= 0) throw new Error("MALL_CHECKOUT_TEST_ADDRESS_ID must belong to USER_TOKEN");
if (!["offline", "balance", "wechat"].includes(paymentMethod)) throw new Error("MALL_CHECKOUT_GROUP_PAYMENT_METHOD must be offline, balance or wechat");

async function request(path, method = "GET", data) {
  const response = await fetch(`${baseUrl}${path}${path.includes("?") ? "&" : "?"}tenantCode=${encodeURIComponent(tenantCode)}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, ok: response.ok, payload: payload?.data ?? payload };
}

const items = skuIds.map((skuId) => ({ skuId, quantity: 1 }));
const quoteBody = { items, couponCode: couponCode || undefined, pointsToUse: pointsToUse || undefined };
const quote = await request("/public/mall/quote", "POST", quoteBody);
if (!quote.ok || !quote.payload?.quoteToken) throw new Error(`quote failed: ${JSON.stringify(quote)}`);
const allocations = Array.isArray(quote.payload.allocations) ? quote.payload.allocations : [];
if (allocations.length < 2) throw new Error("configured SKUs did not produce a cross-merchant quote");
const sum = (field) => allocations.reduce((total, row) => total + Number(row[field] || 0), 0);
const quoteExact = sum("goodsFen") === Math.round(Number(quote.payload.goodsAmount || 0) * 100)
  && sum("freightFen") === Math.round(Number(quote.payload.freightAmount || 0) * 100)
  && sum("discountFen") === Math.round(Number(quote.payload.discountAmount || 0) * 100)
  && sum("payableFen") === Math.round(Number(quote.payload.payableAmount || 0) * 100);

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const clientOrderKey = `checkout-group-${stamp}`;
const createBody = { ...quoteBody, addressId, paymentMethod, quoteToken: quote.payload.quoteToken, clientOrderKey, buyerRemark: `跨店统一结算验收 ${stamp}` };
const first = await request("/public/mall/checkout-groups", "POST", createBody);
const replay = await request("/public/mall/checkout-groups", "POST", createBody);
const orders = Array.isArray(first.payload?.orders) ? first.payload.orders : [];
const orderPayableFen = orders.reduce((total, order) => total + Math.round(Number(order.amount || 0) * 100), 0);
const sameGroup = first.ok && replay.ok && first.payload?.id === replay.payload?.id && first.payload?.groupNo === replay.payload?.groupNo;
const balancePaid = paymentMethod !== "balance" || orders.every((order) => ["paid", "shipped", "completed"].includes(order.status));
let wechatPayment = null;
let wechatCallback = null;
let wechatCallbackReplay = null;
let wechatStatus = null;
let wechatUnified = paymentMethod !== "wechat";
if (paymentMethod === "wechat" && first.payload?.id) {
  wechatPayment = await request(`/public/mall/checkout-groups/${first.payload.id}/pay/wechat`, "POST", { paymentScene: "h5" });
  if (wechatPayment.ok && wechatPayment.payload?.mode === "sandbox") {
    const callbackPath = wechatPayment.payload.callbackPath || wechatPayment.payload.payParams?.callbackPath || "/payment/mall/wechat/callback";
    const callbackBody = { ...wechatPayment.payload.payParams, amount: Number(wechatPayment.payload.amount) };
    wechatCallback = await request(callbackPath, "POST", callbackBody);
    wechatCallbackReplay = await request(callbackPath, "POST", callbackBody);
    wechatStatus = await request(`/public/me/mall/checkout-groups/${first.payload.id}/payment-status`);
    wechatUnified = wechatCallback.ok && wechatCallbackReplay.ok && wechatStatus.ok && wechatStatus.payload?.localStatus === "paid";
  } else {
    wechatUnified = wechatPayment.ok;
  }
}
const passed = quoteExact && first.ok && orders.length === allocations.length && orderPayableFen === sum("payableFen") && sameGroup && balancePaid && wechatUnified;

console.log(JSON.stringify({
  testedAt: new Date().toISOString(),
  baseUrl,
  tenantCode,
  skuIds,
  paymentMethod,
  quote: { goodsAmount: quote.payload.goodsAmount, freightAmount: quote.payload.freightAmount, discountAmount: quote.payload.discountAmount, payableAmount: quote.payload.payableAmount, allocations },
  quoteExact,
  retainedCheckoutGroupId: first.payload?.id || null,
  retainedCheckoutGroupNo: first.payload?.groupNo || null,
  retainedOrderIds: orders.map((order) => order.id),
  idempotentReplay: sameGroup,
  balancePaid,
  wechatUnified,
  passed,
  first,
  replay,
  wechatPayment,
  wechatCallback,
  wechatCallbackReplay,
  wechatStatus
}, null, 2));
if (!passed) process.exitCode = 1;
