import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const API_BASE = String(process.env.API_BASE_URL || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = process.env.TENANT_CODE || "qiwai-showcase";
const PASSWORD = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const ADMIN_USERNAME = process.env.SHOWCASE_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.SHOWCASE_ADMIN_PASSWORD || (ADMIN_USERNAME === "admin" ? "Admin123456" : PASSWORD);

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function raw(pathname, { method = "GET", token, body, deviceId = "membership-referral-acceptance" } = {}) {
  const separator = pathname.includes("?") ? "&" : "?";
  const response = await fetch(`${API_BASE}${pathname}${separator}tenantCode=${encodeURIComponent(TENANT_CODE)}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Device-Id": deviceId,
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { ok: response.ok, status: response.status, data: payload?.data ?? payload };
}

async function request(pathname, options) {
  const result = await raw(pathname, options);
  if (!result.ok) throw new Error(`${options?.method || "GET"} ${pathname} failed (${result.status}): ${JSON.stringify(result.data)}`);
  return result.data;
}

async function ensureMember(adminToken, phone, nickname) {
  await request("/admin/members", { method: "POST", token: adminToken, body: { phone, password: PASSWORD, nickname, remark: "会员单层推广实库验收保留账号" } });
  const login = await request("/public/auth/password-login", { method: "POST", body: { phone, password: PASSWORD } });
  assert(login.userAccessToken && login.user?.id, `${phone} 登录失败`);
  return { token: login.userAccessToken, user: login.user };
}

async function ensureAddress(token, phone, label) {
  const result = await raw("/public/me/mall/addresses", { token });
  if (!result.ok && result.status !== 404) throw new Error(`GET /public/me/mall/addresses failed (${result.status}): ${JSON.stringify(result.data)}`);
  const rows = result.ok ? (Array.isArray(result.data) ? result.data : result.data?.items || []) : [];
  if (rows[0]) return rows[0];
  return request("/public/me/mall/addresses", {
    method: "POST",
    token,
    body: { receiverName: label, receiverPhone: phone, province: "重庆市", city: "重庆市", district: "铜梁区", detail: "会员单层推广验收保留地址", isDefault: true }
  });
}

async function createOfflineOrder(token, addressId, skuId, clientOrderKey, promotionCode) {
  const item = { skuId, quantity: 1 };
  const quote = await request("/public/mall/quote", { method: "POST", token, body: { items: [item], promotionCode } });
  const order = await request("/public/mall/orders", {
    method: "POST",
    token,
    body: { items: [item], addressId, paymentMethod: "offline", quoteToken: quote.quoteToken, clientOrderKey, promotionCode, buyerRemark: "会员单层推广验收保留订单" }
  });
  return { quote, order };
}

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration",
  timezone: "+08:00"
});

try {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const admin = await request("/admin/auth/login", { method: "POST", body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
  const adminToken = admin.token;
  assert(adminToken, "平台管理员登录失败");

  const [[tenant]] = await db.query("SELECT id FROM tenants WHERE code=? LIMIT 1", [TENANT_CODE]);
  assert(tenant?.id, "验收租户不存在");
  const promoter = await ensureMember(adminToken, "13990009101", "会员推广验收甲");
  const buyer = await ensureMember(adminToken, "13990009102", "会员推广验收乙");
  const promoterAddress = await ensureAddress(promoter.token, "13990009101", "验收甲");
  const buyerAddress = await ensureAddress(buyer.token, "13990009102", "验收乙");

  const merchants = await request(`/admin/mall/merchants?tenantId=${tenant.id}`, { token: adminToken });
  const merchant = merchants.find((row) => row.status === "active" && row.mallEnabled) || merchants[0];
  assert(merchant?.id, "缺少可运营商城店铺");
  const configuredMerchant = await request(`/admin/mall/merchants/${merchant.id}`, {
    method: "PATCH",
    token: adminToken,
    body: { tenantId: tenant.id, name: merchant.name, membershipEnabled: true, memberDiscountRate: 0.8 }
  });
  assert(Number(configuredMerchant.memberDiscountRate) === 0.8, "店铺会员折扣未保存为八折");

  const membershipProduct = await request("/admin/mall/products", {
    method: "POST",
    token: adminToken,
    body: {
      tenantId: tenant.id,
      merchantId: merchant.id,
      title: `【保留验收】399元年度商城会员 ${stamp}`,
      description: "正常销售的年度会员服务，支付后获得本店商品八折和单层真实订单推广资格。",
      price: 399,
      originalPrice: 399,
      membershipProduct: true,
      membershipValidityDays: 365,
      status: "published",
      featured: true,
      deliveryNote: "虚拟会员服务，支付成功后自动生效。",
      afterSaleNote: "退款完成后自动撤销对应会员权益。",
      skus: [{ name: "年度会员", price: 399, originalPrice: 399, stock: 100, enabled: true }]
    }
  });
  const regularProduct = await request("/admin/mall/products", {
    method: "POST",
    token: adminToken,
    body: {
      tenantId: tenant.id,
      merchantId: merchant.id,
      title: `【保留验收】会员八折普通商品 ${stamp}`,
      description: "用于验证商城会员八折权益。",
      price: 100,
      originalPrice: 100,
      status: "published",
      skus: [{ name: "标准款", price: 100, originalPrice: 100, stock: 100, enabled: true }]
    }
  });
  const membershipSku = membershipProduct.skus?.[0];
  const regularSku = regularProduct.skus?.[0];
  assert(membershipSku?.id && regularSku?.id, "验收商品缺少可售 SKU");

  const membershipPurchase = await createOfflineOrder(promoter.token, promoterAddress.id, membershipSku.id, `membership-${stamp}`);
  await request(`/admin/mall/orders/${membershipPurchase.order.id}/confirm-offline-payment`, { method: "POST", token: adminToken, body: {} });
  const activeMembership = await request(`/public/me/mall/membership?merchantId=${merchant.id}`, { token: promoter.token });
  assert(activeMembership.isMember && activeMembership.memberDiscountPercent === 80, "399 元商品支付后未激活八折会员");

  const referral = await request(`/public/me/mall/membership/referral?merchantId=${merchant.id}`, { method: "POST", token: promoter.token, body: {} });
  assert(referral.code && referral.mode === "direct_order_only", "会员推广码生成失败");
  const rule = await request("/admin/mall/commission-rules", {
    method: "POST",
    token: adminToken,
    body: { tenantId: tenant.id, promotionCodeId: (await db.query("SELECT id FROM mall_promotion_codes WHERE code=? LIMIT 1", [referral.code]))[0][0].id, ruleKey: `membership-fixed-${stamp}`, name: `399会员商品固定200元单层推广 ${stamp}`, scopeType: "channel", priority: 1000, directRateBps: 0, directFixedAmount: 200, remark: "仅真实支付订单，禁止自购佣金" }
  });
  assert(Number(rule.directFixedAmount) === 200, "固定 200 元佣金规则保存失败");

  const memberQuote = await request("/public/mall/quote", { method: "POST", token: promoter.token, body: { items: [{ skuId: regularSku.id, quantity: 1 }] } });
  assert(Number(memberQuote.goodsAmount) === 80 && Number(memberQuote.memberDiscountAmount) === 20, "普通商品未按会员八折报价");

  const referredPurchase = await createOfflineOrder(buyer.token, buyerAddress.id, membershipSku.id, `referred-${stamp}`, referral.code);
  await request(`/admin/mall/orders/${referredPurchase.order.id}/confirm-offline-payment`, { method: "POST", token: adminToken, body: {} });
  const commissions = await request(`/admin/mall/commissions?tenantId=${tenant.id}&merchantId=${merchant.id}&keyword=${encodeURIComponent(referredPurchase.order.orderNo)}`, { token: adminToken });
  assert(commissions.length === 1, `真实推广订单必须只产生 1 条佣金，实际 ${commissions.length}`);
  assert(Number(commissions[0].commissionAmount) === 200 && commissions[0].beneficiaryType === "promoter", "真实推广订单未产生固定 200 元会员佣金");
  const promoterIncome = await request(`/public/me/mall/referral-commissions?merchantId=${merchant.id}`, { token: promoter.token });
  assert(promoterIncome.mode === "direct_order_only" && promoterIncome.items.some((row) => row.id === commissions[0].id), "推广会员端未显示本人佣金");
  assert(Number(promoterIncome.summary.pendingAmount) >= 200, "推广会员端待结算汇总不正确");
  assert(!JSON.stringify(promoterIncome).includes("13990009102"), "推广收益接口不应暴露买家手机号");
  const buyerIncome = await request(`/public/me/mall/referral-commissions?merchantId=${merchant.id}`, { token: buyer.token });
  assert(!buyerIncome.items.some((row) => row.id === commissions[0].id), "购买人不应看到推广人的佣金记录");

  const selfPurchase = await createOfflineOrder(promoter.token, promoterAddress.id, regularSku.id, `self-${stamp}`, referral.code);
  await request(`/admin/mall/orders/${selfPurchase.order.id}/confirm-offline-payment`, { method: "POST", token: adminToken, body: {} });
  const selfCommissions = await request(`/admin/mall/commissions?tenantId=${tenant.id}&merchantId=${merchant.id}&keyword=${encodeURIComponent(selfPurchase.order.orderNo)}`, { token: adminToken });
  assert(selfCommissions.length === 0, "会员使用本人推广码自购时不应产生佣金");

  const detail = await request(`/public/me/mall/orders/${membershipPurchase.order.id}`, { token: promoter.token });
  const refund = await request(`/public/me/mall/orders/${membershipPurchase.order.id}/refund-request`, {
    method: "POST",
    token: promoter.token,
    body: { type: "refund_only", amount: Number(membershipPurchase.order.amount), reason: `会员撤权验收 ${stamp}`, businessKey: `membership-refund-${stamp}`, items: [{ orderItemId: detail.items[0].id, quantity: 1 }], images: [] }
  });
  await request(`/admin/mall/refunds/${refund.id}/approve`, { method: "POST", token: adminToken, body: { remark: `会员撤权验收 ${stamp}`, responsibility: "merchant" } });
  const revokedMembership = await request(`/public/me/mall/membership?merchantId=${merchant.id}`, { token: promoter.token });
  assert(!revokedMembership.isMember, "会员商品退款完成后未撤销会员权益");

  console.log(JSON.stringify({
    testedAt: new Date().toISOString(),
    tenantCode: TENANT_CODE,
    retainedUserIds: [promoter.user.id, buyer.user.id],
    retainedMerchantId: merchant.id,
    retainedMembershipProductId: membershipProduct.id,
    retainedRegularProductId: regularProduct.id,
    retainedMembershipOrderId: membershipPurchase.order.id,
    retainedReferredOrderId: referredPurchase.order.id,
    retainedSelfPurchaseOrderId: selfPurchase.order.id,
    retainedReferralCode: referral.code,
    retainedRuleId: rule.id,
    retainedCommissionId: commissions[0].id,
    retainedRefundId: refund.id,
    memberPrice: memberQuote.goodsAmount,
    memberDiscount: memberQuote.memberDiscountAmount,
    directCommission: commissions[0].commissionAmount,
    promoterIncomeVisible: promoterIncome.items.some((row) => row.id === commissions[0].id),
    buyerIncomeCount: buyerIncome.items.length,
    selfPurchaseCommissionCount: selfCommissions.length,
    membershipRevoked: !revokedMembership.isMember,
    passed: true
  }, null, 2));
} finally {
  await db.end();
}
