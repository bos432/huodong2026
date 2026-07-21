const apiBase = String(process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const tenantCode = String(process.env.TENANT_CODE || "qiwai-showcase").trim();
const token = String(process.env.USER_TOKEN || "").trim();
const registrationId = Number(process.env.REGISTRATION_ID || 0);

if (!token) throw new Error("USER_TOKEN is required");
if (!Number.isInteger(registrationId) || registrationId <= 0) throw new Error("REGISTRATION_ID must be a positive integer");

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}${path.includes("?") ? "&" : "?"}tenantCode=${encodeURIComponent(tenantCode)}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "x-tenant-code": tenantCode,
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.code !== 0) throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${body?.message || "invalid response"}`);
  return body.data;
}

const path = `/public/me/registrations/${registrationId}/refund-request`;
const results = await Promise.all([
  request(path, { method: "POST", body: "{}", headers: { "x-device-id": "refund-acceptance-a" } }),
  request(path, { method: "POST", body: "{}", headers: { "x-device-id": "refund-acceptance-b" } })
]);
const refundIds = results.map((item) => Number(item?.refund?.id || 0));
if (!refundIds[0] || refundIds[0] !== refundIds[1]) throw new Error(`concurrent requests returned different refunds: ${refundIds.join(", ")}`);
if (!results.some((item) => item?.idempotent === false) || !results.some((item) => item?.idempotent === true)) {
  throw new Error(`expected one created and one idempotent response: ${JSON.stringify(results.map((item) => item?.idempotent))}`);
}

const detail = await request(`/public/me/registrations/${registrationId}`);
const activeRefunds = (detail?.refunds || []).filter((item) => ["pending", "processing"].includes(String(item.status)));
if (activeRefunds.length !== 1 || Number(activeRefunds[0].id) !== refundIds[0]) {
  throw new Error(`expected exactly one active refund ${refundIds[0]}, received ${activeRefunds.map((item) => item.id).join(", ")}`);
}

console.log(JSON.stringify({
  registrationId,
  refundId: refundIds[0],
  refundNo: results[0]?.refund?.refundNo,
  amount: results[0]?.refund?.amount,
  responses: results.map((item) => ({ idempotent: item.idempotent, requestRefundId: item?.refund?.id })),
  activeRefundCount: activeRefunds.length
}, null, 2));
