const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const token = String(process.env.ADMIN_TOKEN || "").trim();
const registrationApproveId = Number(process.env.REGISTRATION_APPROVE_ID || 0);
const registrationRejectId = Number(process.env.REGISTRATION_REJECT_ID || 0);
const offlineOrderId = Number(process.env.OFFLINE_ORDER_ID || 0);
const refundRejectId = Number(process.env.REFUND_REJECT_ID || 0);

if (!token) throw new Error("ADMIN_TOKEN is required");
for (const [name, value] of Object.entries({ registrationApproveId, registrationRejectId, offlineOrderId, refundRejectId })) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
}

async function request(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, ok: response.ok, payload };
}

async function concurrent(name, path, body) {
  const results = await Promise.all([
    request(path, { ...body, remark: `${body.remark} device-A` }),
    request(path, { ...body, remark: `${body.remark} device-B` })
  ]);
  return {
    name,
    passed: results.every((item) => item.ok && item.status < 500),
    results: results.map((item) => ({
      status: item.status,
      ok: item.ok,
      requestId: item.payload?.requestId || item.payload?.data?.requestId || null,
      recordId: item.payload?.data?.id || item.payload?.data?.refund?.id || null,
      recordStatus: item.payload?.data?.status || item.payload?.data?.refund?.status || item.payload?.data?.savedOrder?.status || null,
      message: item.payload?.message || null
    }))
  };
}

const checks = [];
checks.push(await concurrent("registration-approve", `/admin/registrations/${registrationApproveId}/approve`, { remark: "并发验收通过" }));
checks.push(await concurrent("registration-reject", `/admin/registrations/${registrationRejectId}/reject`, { remark: "并发验收拒绝" }));
checks.push(await concurrent("offline-payment", `/admin/orders/${offlineOrderId}/confirm-offline-payment`, { remark: "并发验收线下收款" }));
checks.push(await concurrent("refund-reject", `/admin/refunds/${refundRejectId}/reject`, { remark: "并发验收退款拒绝" }));

const report = {
  testedAt: new Date().toISOString(),
  baseUrl,
  ids: { registrationApproveId, registrationRejectId, offlineOrderId, refundRejectId },
  passed: checks.every((check) => check.passed),
  checks
};
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
