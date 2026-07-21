import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const API_BASE = String(process.env.API_BASE_URL || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = process.env.TENANT_CODE || "qiwai-showcase";
const BUYER_PHONE = process.env.BUYER_PHONE || "13990024134";

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function raw(pathname, { method = "GET", token, body, deviceId = "09.09-commission-device" } = {}) {
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
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { ok: response.ok, status: response.status, data: payload?.data ?? payload };
}

async function request(pathname, options) {
  const result = await raw(pathname, options);
  if (!result.ok) throw new Error(`${options?.method || "GET"} ${pathname} failed (${result.status}): ${JSON.stringify(result.data)}`);
  return result.data;
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
  const adminLogin = await request("/admin/auth/login", { method: "POST", body: { username: "admin", password: "Admin123456" } });
  const buyerLogin = await request("/public/auth/password-login", { method: "POST", body: { phone: BUYER_PHONE, password: "Qiwai123456" } });
  const adminToken = adminLogin.token;
  const userToken = buyerLogin.userAccessToken;
  assert(adminToken && userToken, "佣金验收账号登录失败");

  const [[tenant]] = await db.query("SELECT id FROM tenants WHERE code=? LIMIT 1", [TENANT_CODE]);
  const [[buyer]] = await db.query("SELECT id FROM users WHERE phone=? LIMIT 1", [BUYER_PHONE]);
  const [[sku]] = await db.query(
    "SELECT s.id,s.price,p.id productId,p.merchantId FROM mall_skus s JOIN mall_products p ON p.id=s.productId WHERE p.tenantId=? AND p.status='published' AND (s.stock-s.lockedStock)>=2 ORDER BY (s.stock-s.lockedStock) DESC LIMIT 1",
    [tenant.id]
  );
  const [[address]] = await db.query("SELECT id FROM mall_addresses WHERE tenantId=? AND userId=? ORDER BY isDefault DESC,id DESC LIMIT 1", [tenant.id, buyer.id]);
  assert(tenant?.id && buyer?.id && sku?.id && address?.id, "缺少佣金验收租户、会员地址或可售库存");

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const parentLevel2 = await request("/admin/agents", {
    method: "POST",
    token: adminToken,
    body: { tenantId: tenant.id, name: `09.09 二级代理 ${stamp}`, region: "Commission acceptance", contactName: "L2", contactPhone: "13990029992", enabled: true }
  });
  const parentLevel1 = await request("/admin/agents", {
    method: "POST",
    token: adminToken,
    body: { tenantId: tenant.id, parentAgentId: parentLevel2.id, name: `09.09 一级代理 ${stamp}`, region: "Commission acceptance", contactName: "L1", contactPhone: "13990029991", enabled: true }
  });
  const directAgent = await request("/admin/agents", {
    method: "POST",
    token: adminToken,
    body: { tenantId: tenant.id, parentAgentId: parentLevel1.id, name: `09.09 直属代理 ${stamp}`, region: "Commission acceptance", contactName: "Direct", contactPhone: "13990029990", enabled: true }
  });

  const promotionCode = await request("/admin/mall/promotion-codes", {
    method: "POST",
    token: adminToken,
    body: {
      tenantId: tenant.id,
      merchantId: sku.merchantId,
      agentId: directAgent.id,
      code: `C${Date.now()}`,
      name: `09.09 多级代理推广 ${stamp}`,
      commissionRate: 0,
      enabled: true,
      remark: `佣金治理保留数据 ${stamp}`
    }
  });

  const rule = await request("/admin/mall/commission-rules", {
    method: "POST",
    token: adminToken,
    body: {
      tenantId: tenant.id,
      promotionCodeId: promotionCode.id,
      ruleKey: `acceptance-channel-${promotionCode.id}`,
      name: `09.09 佣金验收规则 ${stamp}`,
      scopeType: "channel",
      priority: 999,
      directRateBps: 500,
      agentLevelRatesBps: [200, 100],
      remark: `保留验收版本 ${stamp}`
    }
  });

  const item = { skuId: sku.id, quantity: 1 };
  const quote = await request("/public/mall/quote", { method: "POST", token: userToken, body: { items: [item], promotionCode: promotionCode.code } });
  const order = await request("/public/mall/orders", {
    method: "POST",
    token: userToken,
    body: {
      items: [item],
      addressId: address.id,
      paymentMethod: "offline",
      quoteToken: quote.quoteToken,
      clientOrderKey: `commission-${stamp}`,
      promotionCode: promotionCode.code,
      buyerRemark: `09.09 佣金验收 ${stamp}`
    }
  });
  const paidOrder = await request(`/admin/mall/orders/${order.id}/confirm-offline-payment`, { method: "POST", token: adminToken, body: {} });

  let commissions = await request(`/admin/mall/commissions?tenantId=${tenant.id}&merchantId=${sku.merchantId}&keyword=${encodeURIComponent(order.orderNo)}`, { token: adminToken });
  assert(commissions.length === 3, `多级代理应生成 3 条佣金，实际 ${commissions.length}`);
  assert(commissions.every((row) => row.ruleSnapshot?.version === rule.version && row.calculationSnapshot?.orderItemId), "佣金未冻结规则版本和商品行计算快照");
  assert(new Set(commissions.map((row) => row.beneficiarySnapshot?.level ?? row.calculationSnapshot?.beneficiaryLevel)).size === 3, "佣金受益层级快照不完整");

  for (const row of commissions.filter((itemRow) => itemRow.status === "risk_review")) {
    await request(`/admin/mall/commissions/${row.id}/risk-review`, { method: "POST", token: adminToken, body: { decision: "approve", remark: `验收风险放行 ${stamp}` } });
  }
  commissions = await request(`/admin/mall/commissions?tenantId=${tenant.id}&merchantId=${sku.merchantId}&keyword=${encodeURIComponent(order.orderNo)}`, { token: adminToken });
  const pending = commissions.find((row) => row.status === "pending");
  assert(pending, "风险复核后没有待结佣金");

  const settleBody = { businessKey: `commission-settle:${stamp}`, remark: `验收结算 ${stamp}` };
  const [settledA, settledB] = await Promise.all([
    request(`/admin/mall/commissions/${pending.id}/settle`, { method: "POST", token: adminToken, body: settleBody }),
    request(`/admin/mall/commissions/${pending.id}/settle`, { method: "POST", token: adminToken, body: settleBody })
  ]);
  assert(settledA.id === settledB.id && settledA.status === "settled", "佣金并发结算未幂等返回同一记录");

  const detail = await request(`/public/me/mall/orders/${order.id}`, { token: userToken });
  const orderItem = detail.items?.[0];
  assert(orderItem?.id, "保留订单未返回商品行");
  const refund = await request(`/public/me/mall/orders/${order.id}/refund-request`, {
    method: "POST",
    token: userToken,
    body: {
      type: "refund_only",
      amount: Number(order.amount),
      reason: `09.09 退款扣回验收 ${stamp}`,
      businessKey: `commission-refund:${stamp}`,
      items: [{ orderItemId: orderItem.id, quantity: orderItem.quantity || 1 }],
      images: []
    }
  });
  await request(`/admin/mall/refunds/${refund.id}/approve`, { method: "POST", token: adminToken, body: { remark: `验收全额退款 ${stamp}`, responsibility: "merchant" } });

  commissions = await request(`/admin/mall/commissions?tenantId=${tenant.id}&merchantId=${sku.merchantId}&keyword=${encodeURIComponent(order.orderNo)}`, { token: adminToken });
  const clawback = commissions.find((row) => row.id === pending.id);
  assert(clawback?.clawbackStatus === "pending" && Number(clawback.clawbackAmount || 0) > 0, "已结佣金退款后未生成待扣回");
  const clawbackBody = { businessKey: `commission-clawback:${stamp}`, remark: `验收扣回凭证 ${stamp}` };
  const [clawbackA, clawbackB] = await Promise.all([
    request(`/admin/mall/commissions/${clawback.id}/clawback-settle`, { method: "POST", token: adminToken, body: clawbackBody }),
    request(`/admin/mall/commissions/${clawback.id}/clawback-settle`, { method: "POST", token: adminToken, body: clawbackBody })
  ]);
  assert(clawbackA.id === clawbackB.id && clawbackA.clawbackStatus === "settled", "佣金并发扣回未幂等返回同一记录");

  const adjustments = await request(`/admin/mall/commission-adjustments?tenantId=${tenant.id}&merchantId=${sku.merchantId}&keyword=${encodeURIComponent(order.orderNo)}`, { token: adminToken });
  for (const type of ["settlement", "refund_clawback", "clawback_settlement"]) {
    assert(adjustments.some((row) => row.type === type), `缺少不可变佣金调整流水：${type}`);
  }

  console.log(JSON.stringify({
    testedAt: new Date().toISOString(),
    tenantCode: TENANT_CODE,
    retainedAgentIds: [directAgent.id, parentLevel1.id, parentLevel2.id],
    retainedPromotionCodeId: promotionCode.id,
    retainedPromotionCode: promotionCode.code,
    retainedRuleId: rule.id,
    retainedRuleVersion: rule.version,
    retainedOrderId: paidOrder.id,
    retainedOrderNo: paidOrder.orderNo,
    retainedRefundId: refund.id,
    retainedCommissionIds: commissions.map((row) => row.id),
    retainedAdjustmentIds: adjustments.map((row) => row.id),
    commissionRowCount: commissions.length,
    settleReplay: settledA.id === settledB.id,
    clawbackReplay: clawbackA.id === clawbackB.id,
    passed: true
  }, null, 2));
} finally {
  await db.end();
}
