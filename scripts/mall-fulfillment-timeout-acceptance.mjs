import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");

const API_BASE = String(process.env.API_BASE_URL || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = process.env.TENANT_CODE || "qiwai-showcase";
const ADMIN_USERNAME = process.env.SHOWCASE_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.SHOWCASE_ADMIN_PASSWORD || "Admin123456";
const USER_PHONE = process.env.MALL_TIMEOUT_USER_PHONE || "13990014006";
const USER_PASSWORD = process.env.MALL_TIMEOUT_USER_PASSWORD || "Qiwai123456";

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function request(pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  const data = payload?.data ?? payload;
  if (!response.ok) throw new Error(`${method} ${pathname} failed (${response.status}): ${JSON.stringify(data)}`);
  return data;
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
  const adminLogin = await request("/admin/auth/login", { method: "POST", body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
  const userLogin = await request(`/public/auth/password-login?tenantCode=${encodeURIComponent(TENANT_CODE)}`, { method: "POST", body: { phone: USER_PHONE, password: USER_PASSWORD } });
  const adminToken = adminLogin.token;
  const userToken = userLogin.userAccessToken || userLogin.accessToken || userLogin.token;
  assert(adminToken && userToken, "验收账号登录未返回 token");

  const [[tenant]] = await db.query("SELECT id FROM tenants WHERE code = ? LIMIT 1", [TENANT_CODE]);
  assert(tenant?.id, "验收租户不存在");
  const [[sku]] = await db.query(
    `SELECT s.id, s.stock, s.lockedStock, p.id AS productId, p.merchantId
       FROM mall_skus s
       JOIN mall_products p ON p.id = s.productId
       JOIN mall_merchants m ON m.id = p.merchantId
      WHERE p.tenantId = ? AND p.status = 'published' AND m.status = 'active'
        AND (s.stock - s.lockedStock) >= 2
      ORDER BY (s.stock - s.lockedStock) DESC, s.id ASC
      LIMIT 1`,
    [tenant.id]
  );
  assert(sku?.id, "没有至少 2 件可售库存的验收 SKU");

  let addresses = await request(`/public/me/mall/addresses?tenantCode=${encodeURIComponent(TENANT_CODE)}`, { token: userToken });
  addresses = Array.isArray(addresses) ? addresses : addresses?.items || [];
  let address = addresses.find((item) => item.isDefault) || addresses[0];
  if (!address) {
    address = await request(`/public/me/mall/addresses?tenantCode=${encodeURIComponent(TENANT_CODE)}`, {
      method: "POST",
      token: userToken,
      body: { receiverName: "09.06 超时验收", receiverPhone: USER_PHONE, province: "重庆市", city: "重庆市", district: "铜梁区", detail: "订单履约超时任务验收地址", isDefault: true }
    });
  }

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const createOfflineOrder = (suffix) => request(`/public/mall/orders?tenantCode=${encodeURIComponent(TENANT_CODE)}`, {
    method: "POST",
    token: userToken,
    body: {
      items: [{ skuId: sku.id, quantity: 1 }],
      paymentMethod: "offline",
      addressId: address.id,
      clientOrderKey: `fulfillment-timeout-${suffix}-${stamp}`,
      buyerRemark: `09.06 ${suffix}超时任务验收保留订单 ${stamp}`
    }
  });

  const lockedBeforeClose = Number(sku.lockedStock || 0);
  const closeOrder = await createOfflineOrder("close");
  assert(closeOrder.status === "pending_confirm", "超时关闭验收订单未进入 pending_confirm");
  const [[lockedAfterCreateRow]] = await db.query("SELECT lockedStock FROM mall_skus WHERE id = ?", [sku.id]);
  assert(Number(lockedAfterCreateRow?.lockedStock) === lockedBeforeClose + 1, "待关闭订单未精确锁定 1 件库存");
  await db.query("UPDATE mall_orders SET expiresAt = DATE_SUB(NOW(), INTERVAL 10 MINUTE) WHERE id = ?", [closeOrder.id]);
  const closeResults = await Promise.all([
    request("/admin/mall/orders/close-expired", { method: "POST", token: adminToken, body: {} }),
    request("/admin/mall/orders/close-expired", { method: "POST", token: adminToken, body: {} })
  ]);
  const [[closedRow]] = await db.query("SELECT status, fulfillmentStatus, closeReason FROM mall_orders WHERE id = ?", [closeOrder.id]);
  const [[lockedAfterCloseRow]] = await db.query("SELECT lockedStock FROM mall_skus WHERE id = ?", [sku.id]);
  const [[releaseLogRow]] = await db.query("SELECT COUNT(*) AS count FROM mall_inventory_logs WHERE orderId = ? AND type = 'release'", [closeOrder.id]);
  const [[closeEventRow]] = await db.query("SELECT COUNT(*) AS count FROM mall_order_events WHERE orderId = ? AND eventType = 'order_closed' AND source = 'worker'", [closeOrder.id]);
  assert(closedRow?.status === "closed" && closedRow?.fulfillmentStatus === "cancelled", "超时订单未关闭并取消履约");
  assert(Number(lockedAfterCloseRow?.lockedStock) <= lockedBeforeClose, "超时关闭后锁定库存未释放");
  assert(Number(releaseLogRow?.count) === 1, "超时关闭未写入唯一库存释放流水");
  assert(Number(closeEventRow?.count) === 1, "并发超时关闭重复写入事件账本");

  const completeOrder = await createOfflineOrder("complete");
  const paidOrder = await request(`/admin/mall/orders/${completeOrder.id}/confirm-offline-payment`, { method: "POST", token: adminToken, body: {} });
  assert(paidOrder.status === "paid", "自动完成验收订单确认收款失败");
  const orderDetail = await request(`/admin/mall/orders/${completeOrder.id}`, { token: adminToken });
  const orderItem = orderDetail.items?.[0];
  assert(orderItem?.id, "自动完成验收订单缺少商品行");
  const shippedOrder = await request(`/admin/mall/orders/${completeOrder.id}/ship`, {
    method: "POST",
    token: adminToken,
    body: {
      businessKey: `fulfillment-timeout-ship-${stamp}`,
      expressCompany: "09.06 验收快递",
      expressNo: `TIMEOUT-${stamp}`,
      remark: `09.06 自动完成超时验收 ${stamp}`,
      items: [{ orderItemId: orderItem.id, quantity: 1 }]
    }
  });
  assert(shippedOrder.status === "shipped", "自动完成验收订单发货失败");
  await db.query("UPDATE mall_orders SET shippedAt = DATE_SUB(NOW(), INTERVAL 30 DAY) WHERE id = ?", [completeOrder.id]);
  const completeResults = await Promise.all([
    request("/admin/mall/orders/complete-expired-shipped", { method: "POST", token: adminToken, body: {} }),
    request("/admin/mall/orders/complete-expired-shipped", { method: "POST", token: adminToken, body: {} })
  ]);
  const [[completedRow]] = await db.query("SELECT status, fulfillmentStatus, completedAt FROM mall_orders WHERE id = ?", [completeOrder.id]);
  const [[shipmentRow]] = await db.query("SELECT status, deliveredAt FROM mall_shipments WHERE orderId = ? LIMIT 1", [completeOrder.id]);
  const [[completeEventRow]] = await db.query("SELECT COUNT(*) AS count FROM mall_order_events WHERE orderId = ? AND eventType = 'order_auto_completed' AND source = 'worker'", [completeOrder.id]);
  assert(completedRow?.status === "completed" && completedRow?.fulfillmentStatus === "received" && completedRow?.completedAt, "已发货超时订单未自动完成");
  assert(shipmentRow?.status === "delivered" && shipmentRow?.deliveredAt, "自动完成后包裹未同步签收");
  assert(Number(completeEventRow?.count) === 1, "并发自动完成重复写入事件账本");

  console.log(JSON.stringify({
    testedAt: new Date().toISOString(),
    tenantCode: TENANT_CODE,
    skuId: sku.id,
    retainedCloseOrderId: closeOrder.id,
    retainedCompleteOrderId: completeOrder.id,
    closeResults,
    completeResults,
    closeState: closedRow,
    completeState: completedRow,
    shipmentState: shipmentRow,
    closeEventCount: Number(closeEventRow.count),
    completeEventCount: Number(completeEventRow.count),
    inventoryReleased: Number(releaseLogRow.count) === 1 && Number(lockedAfterCloseRow.lockedStock) <= lockedBeforeClose,
    passed: true
  }, null, 2));
} finally {
  await db.end();
}
