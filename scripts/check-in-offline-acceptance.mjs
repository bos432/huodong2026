const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const token = String(process.env.ADMIN_TOKEN || "").trim();
const activityId = Number(process.env.CHECKIN_TEST_ACTIVITY_ID || 0);
const pointId = Number(process.env.CHECKIN_TEST_POINT_ID || 0);
const registrationId = Number(process.env.CHECKIN_TEST_REGISTRATION_ID || 0) || undefined;

if (!token) throw new Error("ADMIN_TOKEN is required");
if (!activityId) throw new Error("CHECKIN_TEST_ACTIVITY_ID is required");
if (!pointId) throw new Error("CHECKIN_TEST_POINT_ID is required");

async function request(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) throw new Error(`${response.status} ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  return payload?.data ?? payload;
}

const stamp = Date.now();
const firstDeviceId = `offline-acceptance-a-${stamp}`;
const secondDeviceId = `offline-acceptance-b-${stamp}`;
const manifest = await request("/admin/check-ins/offline-manifest", { activityId, pointId, deviceId: firstDeviceId });
const ticket = registrationId
  ? manifest.tickets?.find((item) => Number(item.registrationId) === registrationId)
  : manifest.tickets?.[0];
if (!ticket) throw new Error(registrationId ? `Registration ${registrationId} is not eligible in the offline manifest` : "Offline manifest has no eligible ticket");

const scannedAt = new Date().toISOString();
const first = await request("/admin/check-ins/offline-sync", {
  deviceId: firstDeviceId,
  items: [{ localId: `${firstDeviceId}:${ticket.registrationId}`, code: ticket.code, scannedAt, pointId }]
});
const second = await request("/admin/check-ins/offline-sync", {
  deviceId: secondDeviceId,
  items: [{ localId: `${secondDeviceId}:${ticket.registrationId}`, code: ticket.code, scannedAt, pointId }]
});

const passed = manifest.version === 1
  && Number(manifest.activity?.id) === activityId
  && Number(manifest.point?.id) === pointId
  && first.successCount === 1
  && first.conflictCount === 0
  && second.successCount === 0
  && second.conflictCount === 1;

console.log(JSON.stringify({
  testedAt: new Date().toISOString(),
  passed,
  manifest: { version: manifest.version, ticketCount: manifest.tickets?.length || 0, expiresAt: manifest.expiresAt },
  retainedRegistrationId: ticket.registrationId,
  retainedCheckInId: first.results?.[0]?.checkInId || null,
  firstSync: { successCount: first.successCount, conflictCount: first.conflictCount },
  replaySync: { successCount: second.successCount, conflictCount: second.conflictCount, message: second.results?.[0]?.message || null }
}, null, 2));
if (!passed) process.exitCode = 1;
