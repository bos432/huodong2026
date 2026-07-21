const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const adminToken = String(process.env.VOLUNTEER_ADMIN_TOKEN || "").trim();
const userToken = String(process.env.VOLUNTEER_USER_TOKEN || "").trim();
const tenantId = Number(process.env.VOLUNTEER_TENANT_ID || 0);
const tenantCode = String(process.env.TENANT_CODE || "").trim();
if (!adminToken || !userToken || !Number.isInteger(tenantId) || tenantId <= 0 || !tenantCode) throw new Error("VOLUNTEER_ADMIN_TOKEN, VOLUNTEER_USER_TOKEN, VOLUNTEER_TENANT_ID and TENANT_CODE are required");

async function raw(path, token, method = "GET", data) {
  const url = `${baseUrl}${path}${path.includes("?") ? "&" : "?"}tenantCode=${encodeURIComponent(tenantCode)}`;
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-tenant-code": tenantCode }, body: data === undefined ? undefined : JSON.stringify(data) });
  const text = await response.text(); let payload; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}
async function request(path, token, method = "GET", data) { const result = await raw(path, token, method, data); if (!result.response.ok) throw new Error(`${method} ${path} failed (${result.response.status}): ${JSON.stringify(result.payload)}`); return result.payload?.code === 0 ? result.payload.data : result.payload; }
async function expectFailure(path, token, method, data, label) { const result = await raw(path, token, method, data); if (result.response.ok) throw new Error(`${label} unexpectedly succeeded`); return result; }
async function concurrentReplay(path, token, method, data, label) {
  const rows = await Promise.all([request(path, token, method, data), request(path, token, method, data)]);
  if (!rows[0]?.id || rows[0].id !== rows[1]?.id) throw new Error(`${label} concurrent replay returned different records`);
  return rows[0];
}

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const now = Date.now();
const task = await request("/admin/volunteer/tasks", adminToken, "POST", {
  businessKey: `volunteer:acceptance-task:${stamp}`, title: `志愿治理验收任务 ${stamp}`, type: "现场支持", city: "成都", status: "open", quota: 1, waitlistEnabled: true,
  tenantId,
  startAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(), endAt: new Date(now + 4 * 60 * 60 * 1000).toISOString(), recruitmentStartsAt: new Date(now - 60 * 60 * 1000).toISOString(), recruitmentEndsAt: new Date(now + 60 * 60 * 1000).toISOString(), cancellationDeadlineHours: 0
});
const user = await request("/public/volunteer/tasks", userToken);
if (!user.some((row) => row.id === task.id)) throw new Error("new volunteer task is not publicly visible");
const applied = await request(`/public/volunteer/tasks/${task.id}/apply`, userToken, "POST", { businessKey: `volunteer:acceptance-apply:${stamp}`, name: `志愿验收${stamp}`, phone: `139${String(Date.now()).slice(-8)}`, city: "成都", message: "验收报名" });
const replayed = await request(`/public/volunteer/tasks/${task.id}/apply`, userToken, "POST", { businessKey: `volunteer:acceptance-apply:${stamp}`, name: `志愿验收${stamp}`, phone: `139${String(Date.now()).slice(-8)}`, city: "成都", message: "验收报名" });
if (replayed.id !== applied.id) throw new Error("volunteer task application is not idempotent");
await concurrentReplay(`/admin/volunteer/task-applications/${applied.id}`, adminToken, "PATCH", { status: "admitted", businessKey: `volunteer:acceptance-admit:${stamp}`, remark: "验收录取" }, "volunteer admission");
const applications = await request("/admin/volunteer/task-applications", adminToken);
const admitted = applications.find((row) => row.id === applied.id);
if (!admitted || admitted.status !== "admitted" || !String(admitted.phone).includes("****")) throw new Error("admission or phone masking failed");
await expectFailure(`/admin/volunteer/task-applications/${applied.id}`, adminToken, "PATCH", { status: "completed", businessKey: `volunteer:acceptance-invalid:${stamp}` }, "invalid application transition");
const profile = (await request("/public/me/volunteer", userToken)).profile;
const checkIn = new Date(now - 60 * 60 * 1000).toISOString();
const checkOut = new Date(now - 10 * 60 * 1000).toISOString();
await concurrentReplay(`/admin/volunteer/task-applications/${applied.id}/attendance`, adminToken, "POST", { action: "check_in", businessKey: `volunteer:acceptance-checkin:${stamp}`, occurredAt: checkIn }, "volunteer check-in");
await concurrentReplay(`/admin/volunteer/task-applications/${applied.id}/attendance`, adminToken, "POST", { action: "check_out", businessKey: `volunteer:acceptance-checkout:${stamp}`, occurredAt: checkOut }, "volunteer check-out");
const mineAfterAttendance = await request("/public/me/volunteer", userToken);
const service = mineAfterAttendance.records.find((row) => row.applicationId === applied.id);
if (!service || service.status !== "pending_volunteer" || Number(service.submittedHours) <= 0) throw new Error("attendance did not create pending service hours");
await concurrentReplay(`/public/me/volunteer/service-records/${service.id}/confirm`, userToken, "POST", { businessKey: `volunteer:acceptance-volunteer-confirm:${stamp}` }, "volunteer hour confirmation");
await concurrentReplay(`/admin/volunteer/service-records/${service.id}/action`, adminToken, "PATCH", { action: "confirm", businessKey: `volunteer:acceptance-supervisor-confirm:${stamp}` }, "supervisor hour confirmation");
const completed = await request("/public/me/volunteer", userToken);
const completedService = completed.records.find((row) => row.id === service.id);
if (!completedService || completedService.status !== "confirmed" || Number(completedService.hours) <= 0) throw new Error("dual service confirmation failed");
const adjusted = await request(`/admin/volunteer/profiles/${profile.id}/hour-adjustments`, adminToken, "POST", { businessKey: `volunteer:acceptance-adjustment:${stamp}`, deltaHours: 80, reason: "验收四档勋章阈值" });
const adjustmentReplay = await request(`/admin/volunteer/profiles/${profile.id}/hour-adjustments`, adminToken, "POST", { businessKey: `volunteer:acceptance-adjustment:${stamp}`, deltaHours: 80, reason: "验收四档勋章阈值" });
if (adjustmentReplay.id !== adjusted.id) throw new Error("hour adjustment is not idempotent");
const training = await request(`/admin/volunteer/profiles/${profile.id}/training-records`, adminToken, "POST", {
  businessKey: `volunteer:acceptance-training:${stamp}`,
  title: `志愿者基础培训 ${stamp}`,
  provider: "慢π验收中心",
  trainingHours: 2,
  completedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
  expiresAt: new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString(),
  certificateReference: `TRAINING-${stamp}`
});
const approvedTraining = await concurrentReplay(`/admin/volunteer/training-records/${training.id}`, adminToken, "PATCH", { status: "approved", businessKey: `volunteer:acceptance-training-review:${stamp}`, remark: "专项验收通过" }, "volunteer training review");
if (approvedTraining.status !== "approved" || new Date(approvedTraining.expiresAt).getTime() <= Date.now()) throw new Error("training qualification validity failed");
const badges = await request(`/admin/volunteer/profiles/${profile.id}/badges`, adminToken);
const activeBadgeCodes = badges.filter((item) => item.status === "active").map((item) => item.definition?.code).filter(Boolean).sort();
for (const code of ["service_first", "service_8h", "service_30h", "service_80h"]) if (!activeBadgeCodes.includes(code)) throw new Error(`volunteer badge threshold missing: ${code}`);
await request(`/admin/volunteer/profiles/${profile.id}/certificates`, adminToken, "POST", {});
const certificates = await request("/public/me/certificates", userToken);
const certificate = certificates.find((item) => ["volunteer_service", "charity_ambassador", "city_builder"].includes(item.templateKey));
if (!certificate?.certificateNo) throw new Error("confirmed service did not issue a volunteer certificate");
const verifiedCertificate = await request(`/public/certificates/${encodeURIComponent(certificate.certificateNo)}/verify`, userToken);
if (verifiedCertificate.verify?.valid !== true || !verifiedCertificate.holderName?.includes("*")) throw new Error("public certificate verification did not mask holder identity");
const activeProof = await request(`/admin/volunteer/profiles/${profile.id}/proofs`, adminToken, "POST", { businessKey: `volunteer:acceptance-proof-active:${stamp}`, serviceRecordId: service.id, title: `有效服务证明 ${stamp}` });
const activeProofVerification = await request(`/public/volunteer-proofs/${encodeURIComponent(activeProof.proofNo)}/verify`, userToken);
if (activeProofVerification.verify?.valid !== true || !activeProofVerification.holderName?.includes("*")) throw new Error("public proof verification did not mask holder identity");
const proof = await request(`/admin/volunteer/profiles/${profile.id}/proofs`, adminToken, "POST", { businessKey: `volunteer:acceptance-proof-revoked:${stamp}`, serviceRecordId: service.id, title: `撤销服务证明 ${stamp}` });
const revokedProof = await request(`/admin/volunteer/proofs/${proof.id}`, adminToken, "PATCH", { action: "revoke", businessKey: `volunteer:acceptance-proof-revoke:${stamp}`, reason: "验收撤销" });
const revokedVerification = await request(`/public/volunteer-proofs/${encodeURIComponent(proof.proofNo)}/verify`, userToken);
if (revokedProof.status !== "revoked" || revokedVerification.verify?.valid !== false) throw new Error("proof revocation verification failed");

console.log(JSON.stringify({ testedAt: new Date().toISOString(), retainedTaskId: task.id, retainedApplicationId: applied.id, retainedProfileId: profile.id, retainedServiceRecordId: service.id, retainedAdjustmentId: adjusted.id, retainedTrainingId: training.id, retainedBadgeIds: badges.map((item) => item.id), retainedBadgeCodes: activeBadgeCodes, retainedCertificateId: certificate.id, retainedCertificateNo: certificate.certificateNo, retainedActiveProofId: activeProof.id, retainedActiveProofNo: activeProof.proofNo, retainedRevokedProofId: proof.id, retainedRevokedProofNo: proof.proofNo, passed: true }, null, 2));
