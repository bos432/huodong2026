const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const token = String(process.env.ADMIN_TOKEN || "").trim();
const code = String(process.env.CHECKIN_TEST_CODE || "").trim();
const expectedActivityId = Number(process.env.CHECKIN_TEST_ACTIVITY_ID || 0) || undefined;
const pointId = Number(process.env.CHECKIN_TEST_POINT_ID || 0) || undefined;
if (!token) throw new Error("ADMIN_TOKEN is required");
if (!code) throw new Error("CHECKIN_TEST_CODE must be an approved, not-yet-checked-in ticket");

async function checkIn(device) {
  const response = await fetch(`${baseUrl}/admin/check-ins`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ code, expectedActivityId, pointId, remark: `多设备并发验收 ${device}` }) });
  const text = await response.text(); let payload; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { device, status: response.status, ok: response.ok, payload, data: payload?.data ?? payload };
}

const results = await Promise.all([checkIn("device-A"), checkIn("device-B")]);
const accepted = results.filter(item => item.ok);
const rejected = results.filter(item => !item.ok);
const passed = accepted.length === 1 && rejected.length === 1 && rejected[0].status < 500;
console.log(JSON.stringify({ testedAt: new Date().toISOString(), acceptedCount: accepted.length, rejectedCount: rejected.length, singleUseProtected: passed, retainedCheckInId: accepted[0]?.data?.id || null, results: results.map(({ data, ...item }) => item) }, null, 2));
if (!passed) process.exitCode = 1;
