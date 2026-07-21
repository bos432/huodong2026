import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");

const API_BASE = String(process.env.API_BASE_URL || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = process.env.TENANT_CODE || "qiwai-showcase";
const CROSS_TENANT_CODE = process.env.CROSS_TENANT_CODE || "qiwai-hz";
const USER_PHONE = process.env.MALL_AFTER_SALE_USER_PHONE || "13990014006";
const USER_PASSWORD = process.env.MALL_AFTER_SALE_USER_PASSWORD || "Qiwai123456";

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function raw(pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
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

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration",
  timezone: "+08:00"
});

try {
  const admin = await request("/admin/auth/login", { method: "POST", body: { username: process.env.SHOWCASE_ADMIN_USERNAME || "admin", password: process.env.SHOWCASE_ADMIN_PASSWORD || "Admin123456" } });
  const login = await request(`/public/auth/password-login?tenantCode=${TENANT_CODE}`, { method: "POST", body: { phone: USER_PHONE, password: USER_PASSWORD } });
  const adminToken = admin.token;
  const userToken = login.userAccessToken;
  assert(adminToken && userToken, "售后验收账号登录失败");

  const [[tenant]] = await db.query("SELECT id FROM tenants WHERE code = ? LIMIT 1", [TENANT_CODE]);
  const [[sku]] = await db.query(
    `SELECT s.id, p.merchantId FROM mall_skus s JOIN mall_products p ON p.id=s.productId JOIN mall_merchants m ON m.id=p.merchantId
      WHERE p.tenantId=? AND p.status='published' AND m.status='active' AND (s.stock-s.lockedStock)>=3
      ORDER BY (s.stock-s.lockedStock) DESC,s.id LIMIT 1`,
    [tenant.id]
  );
  assert(sku?.id, "没有至少 3 件可售库存的售后验收 SKU");

  let addresses = await request(`/public/me/mall/addresses?tenantCode=${TENANT_CODE}`, { token: userToken });
  addresses = Array.isArray(addresses) ? addresses : addresses?.items || [];
  let address = addresses.find((item) => item.isDefault) || addresses[0];
  if (!address) address = await request(`/public/me/mall/addresses?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: { receiverName: "09.07 售后验收", receiverPhone: USER_PHONE, province: "重庆市", city: "重庆市", district: "铜梁区", detail: "售后治理验收地址", isDefault: true } });

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  async function completedOrder(kind) {
    const order = await request(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
      method: "POST", token: userToken,
      body: { items: [{ skuId: sku.id, quantity: 1 }], paymentMethod: "offline", addressId: address.id, clientOrderKey: `after-sale-${kind}-${stamp}`, buyerRemark: `09.07 ${kind}售后验收保留订单 ${stamp}` }
    });
    await request(`/admin/mall/orders/${order.id}/confirm-offline-payment`, { method: "POST", token: adminToken, body: {} });
    const detail = await request(`/admin/mall/orders/${order.id}`, { token: adminToken });
    const item = detail.items?.[0];
    assert(item?.id, `${kind} 订单缺少商品行`);
    const shipped = await request(`/admin/mall/orders/${order.id}/ship`, { method: "POST", token: adminToken, body: { businessKey: `after-sale-ship-${kind}-${stamp}`, expressCompany: "09.07 验收快递", expressNo: `AS-${kind}-${stamp}`, remark: `${kind} 售前履约`, items: [{ orderItemId: item.id, quantity: 1 }] } });
    const shipment = shipped.shipments?.find((row) => row.expressNo === `AS-${kind}-${stamp}`);
    assert(shipment?.id, `${kind} 订单缺少包裹`);
    await request(`/public/me/mall/orders/${order.id}/shipments/${shipment.id}/confirm-received?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: {} });
    return { orderId: order.id, orderItemId: item.id, shipmentId: shipment.id, amount: Number(order.amount) };
  }

  const refundOrder = await completedOrder("refund");
  const returnOrder = await completedOrder("return");
  const exchangeOrder = await completedOrder("exchange");

  const applyBody = (type, row, amount, businessKey) => ({ type, amount, reason: `09.07 商城售后验收 ${type} ${stamp}`, businessKey, items: [{ orderItemId: row.orderItemId, quantity: 1 }], images: [] });
  const refundKey = `after-sale-refund-${stamp}`;
  const [refundApplyA, refundApplyB] = await Promise.all([
    request(`/public/me/mall/orders/${refundOrder.orderId}/refund-request?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: applyBody("refund_only", refundOrder, refundOrder.amount, refundKey) }),
    request(`/public/me/mall/orders/${refundOrder.orderId}/refund-request?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: applyBody("refund_only", refundOrder, refundOrder.amount, refundKey) })
  ]);
  assert(refundApplyA.id === refundApplyB.id, "并发重复售后申请未返回同一售后单");
  await request(`/public/me/mall/refunds/${refundApplyA.id}/messages?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: { content: `补充仅退款举证 ${stamp}`, images: [] } });
  const refundApproved = await request(`/admin/mall/refunds/${refundApplyA.id}/approve`, { method: "POST", token: adminToken, body: { remark: `同意仅退款 ${stamp}`, responsibility: "merchant" } });

  const returnCase = await request(`/public/me/mall/orders/${returnOrder.orderId}/refund-request?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: applyBody("return_refund", returnOrder, returnOrder.amount, `after-sale-return-${stamp}`) });
  await request(`/public/me/mall/refunds/${returnCase.id}/intervention?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: { content: `申请平台介入 ${stamp}`, images: [] } });
  const returnApproved = await request(`/admin/mall/refunds/${returnCase.id}/approve`, { method: "POST", token: adminToken, body: { remark: `平台裁决同意退货 ${stamp}`, responsibility: "merchant", returnAddress: { receiverName: "售后验收", receiverPhone: "13800000000", province: "重庆市", city: "重庆市", district: "铜梁区", detail: "09.07 验收退货地址" } } });
  await request(`/public/me/mall/refunds/${returnCase.id}/return-shipment?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: { expressCompany: "09.07 验收快递", expressNo: `RETURN-${stamp}`, remark: "退货寄回验收" } });
  const returnReceived = await request(`/admin/mall/refunds/${returnCase.id}/receive-return`, { method: "POST", token: adminToken, body: { remark: `确认收到退货 ${stamp}`, responsibility: "merchant" } });

  const exchangeCase = await request(`/public/me/mall/orders/${exchangeOrder.orderId}/refund-request?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: applyBody("exchange", exchangeOrder, 0, `after-sale-exchange-${stamp}`) });
  const exchangeApproved = await request(`/admin/mall/refunds/${exchangeCase.id}/approve`, { method: "POST", token: adminToken, body: { remark: `同意换货 ${stamp}`, responsibility: "merchant", returnAddress: { receiverName: "售后验收", receiverPhone: "13800000000", province: "重庆市", city: "重庆市", district: "铜梁区", detail: "09.07 验收换货地址" } } });
  await request(`/public/me/mall/refunds/${exchangeCase.id}/return-shipment?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: { expressCompany: "09.07 验收快递", expressNo: `EXCHANGE-RETURN-${stamp}`, remark: "换货寄回验收" } });
  await request(`/admin/mall/refunds/${exchangeCase.id}/receive-return`, { method: "POST", token: adminToken, body: { remark: `确认收到换货商品 ${stamp}`, responsibility: "merchant" } });
  const exchangeShipped = await request(`/admin/mall/refunds/${exchangeCase.id}/ship-exchange`, { method: "POST", token: adminToken, body: { expressCompany: "09.07 验收快递", expressNo: `EXCHANGE-OUT-${stamp}`, businessKey: `exchange-out-${stamp}`, remark: "寄出换货商品" } });
  const exchangeCompletedOrder = await request(`/public/me/mall/orders/${exchangeOrder.orderId}/shipments/${exchangeShipped.exchangeShipment.id}/confirm-received?tenantCode=${TENANT_CODE}`, { method: "POST", token: userToken, body: {} });
  const exchangeCompleted = exchangeCompletedOrder.refunds?.find((row) => row.id === exchangeCase.id);

  const crossTenant = await raw(`/public/me/mall/refunds/${returnCase.id}?tenantCode=${CROSS_TENANT_CODE}`, { token: userToken });
  const [[refundKeyCount]] = await db.query("SELECT COUNT(*) AS count FROM mall_refunds WHERE businessKey=?", [refundKey]);
  const [[refundItemCount]] = await db.query("SELECT COUNT(*) AS count FROM mall_refund_items WHERE refundId IN (?,?,?)", [refundApplyA.id, returnCase.id, exchangeCase.id]);
  const [[messageCount]] = await db.query("SELECT COUNT(*) AS count FROM mall_refund_messages WHERE refundId IN (?,?,?)", [refundApplyA.id, returnCase.id, exchangeCase.id]);

  assert(["approved", "processing"].includes(refundApproved.status), "仅退款未完成");
  assert(returnApproved.status === "awaiting_buyer_return" && ["approved", "processing"].includes(returnReceived.status), "退货退款状态机未完成");
  assert(exchangeApproved.status === "awaiting_buyer_return" && exchangeShipped.status === "exchange_shipped" && exchangeCompleted?.status === "approved", "换货状态机未完成");
  assert(crossTenant.status === 404, "跨租户读取售后单未返回 404");
  assert(Number(refundKeyCount.count) === 1, "并发申请生成了重复售后单");
  assert(Number(refundItemCount.count) === 3 && Number(messageCount.count) >= 2, "售后商品或协商时间线未完整落库");
  const responseText = JSON.stringify([refundApproved, returnApproved, returnReceived, exchangeApproved, exchangeShipped]);
  for (const field of ["passwordHash", "openid", "unionid", "businessSnapshot", "providerPayload"]) assert(!responseText.includes(`\"${field}\"`), `售后后台响应泄露敏感字段 ${field}`);

  console.log(JSON.stringify({ testedAt: new Date().toISOString(), tenantCode: TENANT_CODE, retainedOrderIds: [refundOrder.orderId, returnOrder.orderId, exchangeOrder.orderId], retainedRefundIds: [refundApplyA.id, returnCase.id, exchangeCase.id], states: { refund: refundApproved.status, returnApproved: returnApproved.status, returnReceived: returnReceived.status, exchangeApproved: exchangeApproved.status, exchangeShipped: exchangeShipped.status, exchangeCompleted: exchangeCompleted.status }, crossTenantStatus: crossTenant.status, refundBusinessKeyCount: Number(refundKeyCount.count), refundItemCount: Number(refundItemCount.count), messageCount: Number(messageCount.count), sensitiveResponseFields: [], passed: true }, null, 2));
} finally {
  await db.end();
}
