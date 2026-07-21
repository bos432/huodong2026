const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const tenantCode = String(process.env.TENANT_CODE || "platform").trim();
const userToken = String(process.env.AID_USER_TOKEN || "").trim();
const userPhone = String(process.env.AID_USER_PHONE || "").trim();
const viewerToken = String(process.env.AID_VIEWER_TOKEN || "").trim();
const managerToken = String(process.env.AID_MANAGER_TOKEN || "").trim();
const managerAdminId = Number(process.env.AID_MANAGER_ADMIN_ID || 0);
const sensitiveToken = String(process.env.AID_SENSITIVE_TOKEN || "").trim();
const reviewerToken = String(process.env.AID_REVIEWER_TOKEN || "").trim();
if (!userToken || !/^1\d{10}$/.test(userPhone) || !viewerToken || !managerToken || !managerAdminId || !sensitiveToken || !reviewerToken) throw new Error("AID_USER_TOKEN, AID_USER_PHONE, AID_VIEWER_TOKEN, AID_MANAGER_TOKEN, AID_MANAGER_ADMIN_ID, AID_SENSITIVE_TOKEN and AID_REVIEWER_TOKEN are required");

async function raw(path, token, method = "GET", data, form) {
  const url = `${baseUrl}${path}${path.includes("?") ? "&" : "?"}tenantCode=${encodeURIComponent(tenantCode)}`;
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, ...(form ? {} : { "Content-Type": "application/json" }) }, body: form || (data === undefined ? undefined : JSON.stringify(data)) });
  const text = await response.text(); let payload; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}
async function request(path, token, method = "GET", data, form) { const result = await raw(path, token, method, data, form); if (!result.response.ok) throw new Error(`${method} ${path} failed (${result.response.status}): ${JSON.stringify(result.payload)}`); return result.payload?.code === 0 ? result.payload.data : result.payload; }

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const sensitiveName = `援助验收用户${stamp}`;
const applicationBody = { type: "personal", applicantName: sensitiveName, phone: userPhone, city: "成都", wechat: `aid-wx-${stamp}`, identityNo: "510000199001011234", address: `敏感地址 ${stamp}`, supportCategory: "活动名额支持", requestedSupport: `验收援助需求 ${stamp}`, situation: `验收敏感情况 ${stamp}`, consentAccepted: true, consentVersion: "aid-privacy-v1", businessKey: `aid-submit:${stamp}` };
const [application, applicationReplay] = await Promise.all([
  request("/public/aid/applications", userToken, "POST", applicationBody),
  request("/public/aid/applications", userToken, "POST", applicationBody)
]);
if (applicationReplay.id !== application.id) throw new Error("aid application concurrent replay created a duplicate application");
if (!application.applicationNo || application.applicantNameMasked.includes(sensitiveName)) throw new Error("aid application was not returned as masked metadata");

const form = new FormData(); form.set("category", "identity"); form.set("businessKey", `aid-material:${stamp}`); form.set("file", new Blob([`%PDF-1.4\n% private aid material ${stamp}\n`], { type: "application/pdf" }), `aid-${stamp}.pdf`);
await request(`/public/me/aid-applications/${application.id}/materials`, userToken, "POST", undefined, form);
const spoofedForm = new FormData(); spoofedForm.set("category", "identity"); spoofedForm.set("businessKey", `aid-material-spoof:${stamp}`); spoofedForm.set("file", new Blob(["not a real pdf"], { type: "application/pdf" }), `spoof-${stamp}.pdf`);
const spoofedUpload = await raw(`/public/me/aid-applications/${application.id}/materials`, userToken, "POST", undefined, spoofedForm);
if (spoofedUpload.response.status !== 400) throw new Error("aid material MIME spoofing was not rejected");

const viewerList = await request("/admin/aid-applications", viewerToken);
const viewerRow = viewerList.items.find((row) => row.id === application.id);
if (!viewerRow || JSON.stringify(viewerRow).includes(sensitiveName) || "sensitivePayloadEncrypted" in viewerRow) throw new Error("aid masked list leaked sensitive payload");
const viewerReveal = await raw(`/admin/aid-applications/${application.id}/reveal`, viewerToken, "POST", {});
if (viewerReveal.response.ok) throw new Error("aid viewer permission could reveal sensitive data");

await request(`/admin/aid-applications/${application.id}/actions`, managerToken, "POST", { action: "assign", assigneeId: managerAdminId, businessKey: `aid-assign:${stamp}` });
await request(`/admin/aid-applications/${application.id}/actions`, managerToken, "POST", { action: "request_supplement", remark: `请补充说明 ${stamp}`, businessKey: `aid-request-supplement:${stamp}` });
const supplementBody = { content: `补件说明 ${stamp}`, businessKey: `aid-supplement:${stamp}` };
const [supplemented, supplementReplay] = await Promise.all([
  request(`/public/me/aid-applications/${application.id}/supplement`, userToken, "POST", supplementBody),
  request(`/public/me/aid-applications/${application.id}/supplement`, userToken, "POST", supplementBody)
]);
if (supplemented.id !== supplementReplay.id) throw new Error("aid supplement concurrent replay was not idempotent");
const selfReview = await raw(`/admin/aid-applications/${application.id}/actions`, managerToken, "POST", { action: "approve", remark: "跟进人不能自审", businessKey: `aid-self-review:${stamp}` });
if (selfReview.response.ok) throw new Error("aid assignee was allowed to perform final approval");
const approveBody = { action: "approve", remark: `审核通过 ${stamp}`, businessKey: `aid-approve:${stamp}` };
const [approved, approveReplay] = await Promise.all([
  request(`/admin/aid-applications/${application.id}/actions`, reviewerToken, "POST", approveBody),
  request(`/admin/aid-applications/${application.id}/actions`, reviewerToken, "POST", approveBody)
]);
if (approved.status !== "approved") throw new Error("aid application was not approved");
if (approveReplay.id !== approved.id || approveReplay.status !== "approved") throw new Error("aid approval concurrent replay was not idempotent");

const revealed = await request(`/admin/aid-applications/${application.id}/reveal`, sensitiveToken, "POST", {});
if (revealed.payload.applicantName !== sensitiveName || revealed.payload.identityNo !== "510000199001011234") throw new Error("authorized aid reveal did not decrypt the original payload");
const detail = await request(`/admin/aid-applications/${application.id}`, viewerToken);
if (!detail.events.some((event) => event.action === "sensitive_revealed") || !detail.events.some((event) => event.action === "material_uploaded")) throw new Error("aid access or material audit event is missing");

console.log(JSON.stringify({ testedAt: new Date().toISOString(), tenantCode, retainedApplicationId: application.id, retainedApplicationNo: application.applicationNo, retainedMaterialCount: approved.materialCount, status: approved.status, passed: true }, null, 2));
