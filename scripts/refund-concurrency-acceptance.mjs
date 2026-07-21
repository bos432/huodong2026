const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const token = String(process.env.ADMIN_TOKEN || "").trim();
const orderId = Number(process.env.REFUND_TEST_ORDER_ID || 0);
const amounts = String(process.env.REFUND_TEST_AMOUNTS || "0.01,0.01").split(",").map((value) => value.trim());
const remainingFen = Math.round(Number(process.env.REFUND_TEST_REMAINING_AMOUNT || 0) * 100);

if (!token) throw new Error("ADMIN_TOKEN is required");
if (!Number.isInteger(orderId) || orderId <= 0) throw new Error("REFUND_TEST_ORDER_ID must be a paid activity order id");
if (amounts.length !== 2 || amounts.some((value) => !value)) throw new Error("REFUND_TEST_AMOUNTS must contain two comma-separated amounts");
if (!Number.isSafeInteger(remainingFen) || remainingFen <= 0) throw new Error("REFUND_TEST_REMAINING_AMOUNT must be the order's refundable amount before this test");

async function request(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try {
    const body = text ? JSON.parse(text) : null;
    payload = body?.data ?? body;
  } catch { payload = text; }
  return { status: response.status, ok: response.ok, payload };
}

const stamp = `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
const requests = amounts.map((amount, index) => request(`/admin/orders/${orderId}/refund`, {
  amount,
  refundNo: `CONCURRENCY_${stamp}_${index + 1}`,
  reason: `并发退款验收 ${stamp} 第 ${index + 1} 笔`
}));
const results = await Promise.all(requests);
const accepted = results.filter((item) => item.ok);
const rejected = results.filter((item) => !item.ok);
const acceptedFen = accepted.reduce((sum, item) => sum + Math.round(Number(item.payload?.refund?.amount || 0) * 100), 0);

const report = {
  testedAt: new Date().toISOString(),
  baseUrl,
  orderId,
  amounts,
  remainingAmount: (remainingFen / 100).toFixed(2),
  acceptedAmount: (acceptedFen / 100).toFixed(2),
  acceptedCount: accepted.length,
  rejectedCount: rejected.length,
  capacityProtected: acceptedFen <= remainingFen,
  results: results.map((item) => ({
    status: item.status,
    ok: item.ok,
    refundId: item.payload?.refund?.id,
    refundAmount: item.payload?.refund?.amount,
    refundStatus: item.payload?.refund?.status,
    message: item.payload?.message
  }))
};
console.log(JSON.stringify(report, null, 2));
if (acceptedFen > remainingFen || results.some((item) => item.status >= 500)) process.exitCode = 1;
