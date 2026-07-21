import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const API_BASE = String(process.env.API_BASE_URL || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = process.env.TENANT_CODE || "qiwai-showcase";

function assert(value, message) { if (!value) throw new Error(message); }
async function raw(pathname, { method = "GET", token, body, deviceId = "09.08-acceptance-device" } = {}) {
  const separator = pathname.includes("?") ? "&" : "?";
  const url = `${API_BASE}${pathname}${separator}tenantCode=${encodeURIComponent(TENANT_CODE)}`;
  const response = await fetch(url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "X-Device-Id": deviceId, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text(); let payload; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { ok: response.ok, status: response.status, data: payload?.data ?? payload };
}
async function request(pathname, options) { const result = await raw(pathname, options); if (!result.ok) throw new Error(`${options?.method || "GET"} ${pathname} failed (${result.status}): ${JSON.stringify(result.data)}`); return result.data; }

const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });
try {
  const admin = await request("/admin/auth/login", { method: "POST", body: { username: "admin", password: "Admin123456" } });
  const ownerLogin = await request(`/public/auth/password-login`, { method: "POST", body: { phone: "13990024134", password: "Qiwai123456" } });
  const reporterLogin = await request(`/public/auth/password-login`, { method: "POST", body: { phone: "13990014006", password: "Qiwai123456" } });
  const adminToken = admin.token, ownerToken = ownerLogin.userAccessToken, reporterToken = reporterLogin.userAccessToken;
  assert(adminToken && ownerToken && reporterToken, "营销验收账号登录失败");

  const [[tenant]] = await db.query("SELECT id FROM tenants WHERE code=? LIMIT 1", [TENANT_CODE]);
  const [[owner]] = await db.query("SELECT id FROM users WHERE phone='13990024134' LIMIT 1");
  const [[review]] = await db.query("SELECT id FROM mall_reviews WHERE userId=? AND status='approved' AND appendContent IS NULL ORDER BY id DESC LIMIT 1", [owner.id]);
  const [[sku]] = await db.query("SELECT s.id,s.price,p.id productId,p.merchantId FROM mall_skus s JOIN mall_products p ON p.id=s.productId WHERE p.tenantId=? AND p.status='published' AND (s.stock-s.lockedStock)>=20 ORDER BY (s.stock-s.lockedStock) DESC LIMIT 1", [tenant.id]);
  assert(review?.id && sku?.id, "缺少可追评评价或营销验收库存");
  let addresses = await request(`/public/me/mall/addresses`, { token: ownerToken }); addresses = Array.isArray(addresses) ? addresses : addresses?.items || [];
  const address = addresses.find((item) => item.isDefault) || addresses[0]; assert(address?.id, "营销验收会员缺少地址");

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const appended = await request(`/public/me/mall/reviews/${review.id}/append`, { method: "POST", token: ownerToken, body: { content: `09.08 追评验收 ${stamp}`, images: [] } });
  assert(appended.appendStatus === "pending", "追评未进入待审核");
  const appendApproved = await request(`/admin/mall/reviews/${review.id}`, { method: "PATCH", token: adminToken, body: { target: "append", status: "approved", reviewRemark: `追评验收通过 ${stamp}` } });

  const [reportA, reportB] = await Promise.all([
    request(`/public/me/mall/reviews/${review.id}/report`, { method: "POST", token: reporterToken, body: { reason: `09.08 重复举报 ${stamp}`, images: [] } }),
    request(`/public/me/mall/reviews/${review.id}/report`, { method: "POST", token: reporterToken, body: { reason: `09.08 重复举报 ${stamp}`, images: [] } })
  ]);
  assert(reportA.id === reportB.id, "并发重复举报未返回同一记录");
  const reportResolved = await request(`/admin/mall/review-reports/${reportA.id}/review`, { method: "POST", token: adminToken, body: { status: "rejected", resolution: `举报不成立 ${stamp}`, hideReview: false } });

  const coupon = await request("/admin/mall/coupons", { method: "POST", token: adminToken, body: { tenantId: tenant.id, merchantId: sku.merchantId, issuerScope: "merchant", code: `ACC${Date.now()}`, name: `09.08 并发领券 ${stamp}`, minAmount: 0, discountAmount: 1, scope: "product", scopeProductId: sku.productId, issuanceLimit: 20, usageLimit: 20, perUserLimit: 1, refundReleasePolicy: "full_refund", enabled: true } });
  const claims = await Promise.all(Array.from({ length: 8 }, () => request(`/public/me/mall/coupons/${coupon.id}/claim?merchantId=${sku.merchantId}`, { method: "POST", token: ownerToken })));
  assert(new Set(claims.map((row) => row.id)).size === 1, "8 路并发领券生成重复记录");

  const now = Date.now();
  const [[activeFlashSale]] = await db.query("SELECT id FROM mall_flash_sales WHERE tenantId=? AND skuId=? AND status='active' AND startsAt<=NOW() AND endsAt>=NOW() ORDER BY id DESC LIMIT 1", [tenant.id, sku.id]);
  const flashSale = activeFlashSale || await request("/admin/mall/flash-sales", { method: "POST", token: adminToken, body: { tenantId: tenant.id, merchantId: sku.merchantId, productId: sku.productId, skuId: sku.id, title: `09.08 秒杀频控 ${stamp}`, salePrice: Math.max(Number(sku.price) - 1, 0.01), saleStock: 20, perUserLimit: 20, startsAt: new Date(now - 60_000).toISOString(), endsAt: new Date(now + 3600_000).toISOString(), status: "active" } });
  const item = { skuId: sku.id, quantity: 1, flashSaleId: flashSale.id };
  const quote = await request("/public/mall/quote", { method: "POST", token: ownerToken, body: { items: [item] } });
  const clientOrderKey = `marketing-${stamp}`;
  const orderBody = { items: [item], addressId: address.id, paymentMethod: "offline", quoteToken: quote.quoteToken, clientOrderKey, deviceId: `marketing-device-${stamp}`, buyerRemark: `09.08 营销幂等验收 ${stamp}` };
  const [orderA, orderB] = await Promise.all([request("/public/mall/orders", { method: "POST", token: ownerToken, body: orderBody, deviceId: `marketing-device-${stamp}` }), request("/public/mall/orders", { method: "POST", token: ownerToken, body: orderBody, deviceId: `marketing-device-${stamp}` })]);
  assert(orderA.id === orderB.id, "秒杀订单幂等重放生成重复订单");

  const burst = await Promise.all(Array.from({ length: 8 }, async (_, index) => {
    const q = await request("/public/mall/quote", { method: "POST", token: ownerToken, body: { items: [item] }, deviceId: `burst-device-${stamp}` });
    return raw("/public/mall/orders", { method: "POST", token: ownerToken, deviceId: `burst-device-${stamp}`, body: { ...orderBody, quoteToken: q.quoteToken, clientOrderKey: `marketing-burst-${index}-${stamp}` } });
  }));
  const rateLimited = burst.filter((row) => row.status === 429).length;
  assert(rateLimited >= 1 && burst.every((row) => row.ok || row.status === 429), "秒杀突发频控未稳定返回 429");

  const [[claimCount]] = await db.query("SELECT COUNT(*) count FROM mall_coupon_claims WHERE couponId=? AND userId=?", [coupon.id, owner.id]);
  const [[riskCount]] = await db.query("SELECT COUNT(*) count FROM mall_promotion_risk_events WHERE tenantId=? AND createdAt>=DATE_SUB(NOW(),INTERVAL 5 MINUTE)", [tenant.id]);
  assert(Number(claimCount.count) === 1, "领券关系表存在重复记录");
  assert(Number(riskCount.count) >= 1, "营销尝试未写入风险事件");

  console.log(JSON.stringify({ testedAt: new Date().toISOString(), tenantCode: TENANT_CODE, retainedReviewId: review.id, retainedReportId: reportA.id, retainedCouponId: coupon.id, retainedCouponClaimId: claims[0].id, retainedFlashSaleId: flashSale.id, retainedOrderId: orderA.id, appendStatus: appendApproved.appendStatus, reportStatus: reportResolved.status, claimReplayCount: new Set(claims.map((row) => row.id)).size, promotionOrderReplay: orderA.id === orderB.id, burstSuccessCount: burst.filter((row) => row.ok).length, rateLimitedCount: rateLimited, recentRiskEventCount: Number(riskCount.count), passed: true }, null, 2));
} finally { await db.end(); }
