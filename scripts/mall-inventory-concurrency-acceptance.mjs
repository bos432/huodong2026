const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const token = String(process.env.USER_TOKEN || "").trim();
const tenantCode = String(process.env.TENANT_CODE || "").trim();
const skuId = Number(process.env.MALL_INVENTORY_TEST_SKU_ID || 0);
const addressId = Number(process.env.MALL_INVENTORY_TEST_ADDRESS_ID || 0);
const availableStock = Number(process.env.MALL_INVENTORY_TEST_AVAILABLE_STOCK || 0);
const requestCount = Number(process.env.MALL_INVENTORY_TEST_REQUEST_COUNT || availableStock + 2);
const quantity = Number(process.env.MALL_INVENTORY_TEST_QUANTITY || 1);

if (!token) throw new Error("USER_TOKEN is required");
if (!tenantCode) throw new Error("TENANT_CODE is required");
if (!Number.isInteger(skuId) || skuId <= 0) throw new Error("MALL_INVENTORY_TEST_SKU_ID must be a sellable SKU id");
if (!Number.isInteger(addressId) || addressId <= 0) throw new Error("MALL_INVENTORY_TEST_ADDRESS_ID must belong to USER_TOKEN");
if (!Number.isInteger(availableStock) || availableStock <= 0) throw new Error("MALL_INVENTORY_TEST_AVAILABLE_STOCK must be the SKU available stock before the test");
if (!Number.isInteger(requestCount) || requestCount < 2 || !Number.isInteger(quantity) || quantity <= 0) throw new Error("request count and quantity must be positive integers");

async function createOrder(index, stamp) {
  const response = await fetch(`${baseUrl}/public/mall/orders?tenantCode=${encodeURIComponent(tenantCode)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ skuId, quantity }], addressId, paymentMethod: "offline", clientOrderKey: `inventory-concurrency-${stamp}-${index + 1}`, buyerRemark: `库存并发验收 ${stamp} 第 ${index + 1} 单` })
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { index: index + 1, status: response.status, ok: response.ok, payload: payload?.data ?? payload };
}

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const results = await Promise.all(Array.from({ length: requestCount }, (_, index) => createOrder(index, stamp)));
const accepted = results.filter((item) => item.ok);
const rejected = results.filter((item) => !item.ok);
const acceptedQuantity = accepted.length * quantity;
const capacityProtected = acceptedQuantity <= availableStock;
const contentionObserved = requestCount * quantity <= availableStock || rejected.length > 0;
const noServerErrors = results.every((item) => item.status < 500);
const report = {
  testedAt: new Date().toISOString(),
  baseUrl,
  tenantCode,
  skuId,
  availableStock,
  quantity,
  requestCount,
  acceptedCount: accepted.length,
  acceptedQuantity,
  rejectedCount: rejected.length,
  retainedOrderIds: accepted.map((item) => item.payload?.id).filter(Boolean),
  capacityProtected,
  contentionObserved,
  noServerErrors,
  results
};
console.log(JSON.stringify(report, null, 2));
if (!capacityProtected || !contentionObserved || !noServerErrors) process.exitCode = 1;
