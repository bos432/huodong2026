const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const adminToken = String(process.env.ADMIN_TOKEN || "").trim();
const userToken = String(process.env.USER_TOKEN || "").trim();
const tenantCode = String(process.env.TENANT_CODE || "").trim();
const orderId = Number(process.env.MALL_SHIPMENT_ORDER_ID || 0);
const orderItemId = Number(process.env.MALL_SHIPMENT_ORDER_ITEM_ID || 0);
const firstQuantity = Math.max(Math.trunc(Number(process.env.MALL_SHIPMENT_FIRST_QUANTITY || 1)), 1);
const secondQuantity = Math.max(Math.trunc(Number(process.env.MALL_SHIPMENT_SECOND_QUANTITY || 1)), 1);
if (!adminToken) throw new Error("ADMIN_TOKEN is required");
if (!userToken) throw new Error("USER_TOKEN is required");
if (!tenantCode) throw new Error("TENANT_CODE is required");
if (!Number.isInteger(orderId) || orderId <= 0) throw new Error("MALL_SHIPMENT_ORDER_ID must be a paid order owned by USER_TOKEN");
if (!Number.isInteger(orderItemId) || orderItemId <= 0) throw new Error("MALL_SHIPMENT_ORDER_ITEM_ID must belong to MALL_SHIPMENT_ORDER_ID and have enough quantity for both packages");

async function request(path, token, method = "GET", data) {
  const url = `${baseUrl}${path}${path.includes("?") ? "&" : "?"}tenantCode=${encodeURIComponent(tenantCode)}`;
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { ok: response.ok, status: response.status, payload: payload?.data ?? payload };
}

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const firstBody = { businessKey: `split-shipment:first:${stamp}`, expressCompany: "验收快递A", expressNo: `SPLIT-A-${stamp}`, remark: `分包验收第一包 ${stamp}`, items: [{ orderItemId, quantity: firstQuantity }] };
const first = await request(`/admin/mall/orders/${orderId}/ship`, adminToken, "POST", firstBody);
if (!first.ok) throw new Error(`first shipment failed: ${JSON.stringify(first)}`);
const firstReplay = await request(`/admin/mall/orders/${orderId}/ship`, adminToken, "POST", firstBody);
const firstShipment = (first.payload?.shipments || []).find((row) => row.expressNo === `SPLIT-A-${stamp}`);
if (!firstShipment) throw new Error("first shipment was not returned");
const shipmentReplayIdempotent = firstReplay.ok && (firstReplay.payload?.shipments || []).filter((row) => row.expressNo === `SPLIT-A-${stamp}`).length === 1;
const partialStayedPaid = first.payload?.status === "paid" && first.payload?.fulfillmentStatus === "partial_shipped";

const changed = await request(`/admin/mall/orders/${orderId}/shipments/${firstShipment.id}`, adminToken, "PATCH", { expressCompany: "验收快递A", expressNo: `SPLIT-A-UPDATED-${stamp}`, reason: `验收改单号 ${stamp}` });
if (!changed.ok) throw new Error(`tracking update failed: ${JSON.stringify(changed)}`);
const trackingSync = await request(`/admin/mall/orders/${orderId}/shipments/${firstShipment.id}/sync-tracking`, adminToken, "POST");
const trackingStored = trackingSync.ok && Array.isArray(trackingSync.payload?.events) && trackingSync.payload.events.length > 0;

const second = await request(`/admin/mall/orders/${orderId}/ship`, adminToken, "POST", { businessKey: `split-shipment:second:${stamp}`, expressCompany: "验收快递B", expressNo: `SPLIT-B-${stamp}`, remark: `分包验收第二包 ${stamp}`, items: [{ orderItemId, quantity: secondQuantity }] });
if (!second.ok) throw new Error(`second shipment failed: ${JSON.stringify(second)}`);
const secondShipment = (second.payload?.shipments || []).find((row) => row.expressNo === `SPLIT-B-${stamp}`);
if (!secondShipment) throw new Error("second shipment was not returned");
const fullyShipped = second.payload?.status === "shipped" && second.payload?.fulfillmentStatus === "shipped";

const receiveFirst = await request(`/public/me/mall/orders/${orderId}/shipments/${firstShipment.id}/confirm-received`, userToken, "POST");
const firstReceiptStayedOpen = receiveFirst.ok && receiveFirst.payload?.status === "shipped";
const receiveSecond = await request(`/public/me/mall/orders/${orderId}/shipments/${secondShipment.id}/confirm-received`, userToken, "POST");
const completed = receiveSecond.ok && receiveSecond.payload?.status === "completed" && receiveSecond.payload?.fulfillmentStatus === "received";
const logistics = await request(`/public/me/mall/orders/${orderId}/logistics`, userToken);
const events = Array.isArray(logistics.payload?.events) ? logistics.payload.events : [];
const audited = events.some((event) => event.eventType === "shipment_tracking_updated" && event.remark === `验收改单号 ${stamp}`);
const retainedShipmentIds = (logistics.payload?.shipments || []).filter((row) => String(row.expressNo || "").includes(stamp)).map((row) => row.id);
const passed = shipmentReplayIdempotent && partialStayedPaid && trackingStored && fullyShipped && firstReceiptStayedOpen && completed && logistics.ok && audited && retainedShipmentIds.length === 2;

console.log(JSON.stringify({ testedAt: new Date().toISOString(), baseUrl, tenantCode, retainedOrderId: orderId, retainedShipmentIds, shipmentReplayIdempotent, partialStayedPaid, trackingStored, fullyShipped, firstReceiptStayedOpen, completed, audited, passed, first, firstReplay, changed, trackingSync, second, receiveFirst, receiveSecond, logistics }, null, 2));
if (!passed) process.exitCode = 1;
