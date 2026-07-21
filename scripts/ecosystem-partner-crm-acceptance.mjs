const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const tenantCode = String(process.env.TENANT_CODE || "platform").trim();
const managerToken = String(process.env.ECOSYSTEM_MANAGER_TOKEN || "").trim();
const reviewerToken = String(process.env.ECOSYSTEM_REVIEWER_TOKEN || "").trim();
if (!managerToken || !reviewerToken) throw new Error("ECOSYSTEM_MANAGER_TOKEN and ECOSYSTEM_REVIEWER_TOKEN are required");

async function raw(path, token, method = "GET", data) {
  const url = `${baseUrl}${path}${path.includes("?") ? "&" : "?"}tenantCode=${encodeURIComponent(tenantCode)}`;
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  const text = await response.text(); let payload; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}
async function request(path, token, method = "GET", data) { const result = await raw(path, token, method, data); if (!result.response.ok) throw new Error(`${method} ${path} failed (${result.response.status}): ${JSON.stringify(result.payload)}`); return result.payload?.code === 0 ? result.payload.data : result.payload; }

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const phone = `139${String(Date.now()).slice(-8)}`;
const ambassador = await request("/public/ambassador/applications", "", "POST", { businessKey: `ecosystem:ambassador-submit:${stamp}`, kind: "ambassador", name: `大使验收${stamp}`, phone, city: "成都", expertise: "活动共创", experience: `大使验收经历 ${stamp}`, wechat: `amb-${stamp}`, source: "ambassador_apply" });
for (const status of ["contacted", "screened", "approved", "activated"]) await request(`/admin/ambassador/applications/${ambassador.id}`, managerToken, "PATCH", { status, kind: "ambassador", remark: `推进到 ${status}` });
const profiles = await request("/admin/ambassador/profiles", managerToken);
const profile = profiles.find((row) => row.application?.id === ambassador.id);
if (!profile || profile.status !== "active" || profile.level !== "starter") throw new Error("ambassador activation did not create a valid profile");
const taskNow = Date.now();
const quotaTask = await request("/admin/ambassador/tasks", managerToken, "POST", { title: `名额并发验收 ${stamp}`, city: "成都", description: "仅开放一个贡献名额", pointValue: 10, quota: 1, status: "open", startsAt: new Date(taskNow - 60_000).toISOString(), endsAt: new Date(taskNow + 3_600_000).toISOString() });
const quotaAttempts = await Promise.all([
  raw("/admin/ambassador/contributions", managerToken, "POST", { businessKey: `ecosystem:task-slot-a:${stamp}`, profileId: profile.id, taskId: quotaTask.id, sourceType: "task", title: `任务名额 A ${stamp}`, quantity: 1, points: 0, evidence: "名额并发 A" }),
  raw("/admin/ambassador/contributions", managerToken, "POST", { businessKey: `ecosystem:task-slot-b:${stamp}`, profileId: profile.id, taskId: quotaTask.id, sourceType: "task", title: `任务名额 B ${stamp}`, quantity: 1, points: 0, evidence: "名额并发 B" })
]);
if (quotaAttempts.filter((item) => item.response.ok).length !== 1 || quotaAttempts.filter((item) => item.response.status === 400).length !== 1) throw new Error("ambassador task quota concurrency did not allow exactly one contribution");
const contribution = await request("/admin/ambassador/contributions", managerToken, "POST", { businessKey: `ecosystem:contribution:${stamp}`, profileId: profile.id, sourceType: "manual", title: `验收贡献 ${stamp}`, quantity: 1, points: 120, evidence: `验收凭据 ${stamp}` });
const selfReview = await raw(`/admin/ambassador/contributions/${contribution.id}/actions`, managerToken, "POST", { action: "approve", businessKey: `ecosystem:contribution-self-review:${stamp}`, remark: "创建人不能自审" });
if (selfReview.response.ok) throw new Error("ambassador contribution creator was allowed to self-review");
const contributionApproveBody = { action: "approve", businessKey: `ecosystem:contribution-approve:${stamp}`, remark: "贡献复核通过" };
const [contributionApproved, contributionApproveReplay] = await Promise.all([
  request(`/admin/ambassador/contributions/${contribution.id}/actions`, reviewerToken, "POST", contributionApproveBody),
  request(`/admin/ambassador/contributions/${contribution.id}/actions`, reviewerToken, "POST", contributionApproveBody)
]);
if (contributionApproved.id !== contributionApproveReplay.id || contributionApproved.status !== "approved") throw new Error("ambassador contribution approval replay was not idempotent");
const upgradedProfiles = await request("/admin/ambassador/profiles", managerToken);
const upgraded = upgradedProfiles.find((row) => row.id === profile.id);
if (upgraded?.contributionPoints !== 120 || upgraded?.level !== "bronze") throw new Error("approved contribution did not update ambassador points and level");

const partnerPhone = `137${String(Date.now() + 1).slice(-8)}`;
const partner = await request("/public/ambassador/applications", "", "POST", { businessKey: `ecosystem:partner-submit:${stamp}`, kind: "partner", name: `伙伴验收${stamp}`, phone: partnerPhone, city: "成都", organizationName: `伙伴机构${stamp}`, cooperationIntent: "城市站与商城", expertise: "场地与社群", experience: `伙伴验收经历 ${stamp}`, wechat: `partner-${stamp}`, source: "dean_recruit" });
for (const status of ["contacted", "screened", "approved"]) await request(`/admin/ambassador/applications/${partner.id}`, managerToken, "PATCH", { status, kind: "partner", remark: `伙伴推进到 ${status}` });
const now = new Date(); const startsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); const end = new Date(now.getTime()); end.setUTCFullYear(end.getUTCFullYear() + 1);
const contract = await request("/admin/partner/contracts", managerToken, "POST", { businessKey: `ecosystem:contract:${stamp}`, applicationId: partner.id, cooperationType: "tenant_and_merchant", startsAt: startsAt.toISOString(), endsAt: end.toISOString(), signedAt: now.toISOString(), terms: `验收合同条款 ${stamp}`, documentReference: `PRIVATE-CONTRACT-${stamp}` });
const selfContractReview = await raw(`/admin/partner/contracts/${contract.id}/actions`, managerToken, "POST", { action: "activate", businessKey: `ecosystem:contract-self-review:${stamp}`, remark: "创建人不能自审" });
if (selfContractReview.response.ok) throw new Error("partner contract creator was allowed to self-review");
const contractActivateBody = { action: "activate", businessKey: `ecosystem:contract-activate:${stamp}`, remark: "合同复核通过" };
const [contractActivated, contractActivateReplay] = await Promise.all([
  request(`/admin/partner/contracts/${contract.id}/actions`, reviewerToken, "POST", contractActivateBody),
  request(`/admin/partner/contracts/${contract.id}/actions`, reviewerToken, "POST", contractActivateBody)
]);
if (contractActivated.id !== contractActivateReplay.id || contractActivated.status !== "active") throw new Error("partner contract activation replay was not idempotent");
const suffix = String(Date.now()).slice(-8);
const conversionPayload = { businessKey: `ecosystem:partner-convert:${stamp}`, tenantCode: `partner_${suffix}`, tenantName: `伙伴商家${stamp}`, createMerchant: true, merchantCode: `partner_store_${suffix}`, merchantName: `伙伴店铺${stamp}` };
const [converted, replayed] = await Promise.all([
  request(`/admin/partner/applications/${partner.id}/convert`, reviewerToken, "POST", conversionPayload),
  request(`/admin/partner/applications/${partner.id}/convert`, reviewerToken, "POST", conversionPayload)
]);
if (converted.tenant.enabled !== false || converted.merchant?.status !== "disabled" || replayed.tenant.id !== converted.tenant.id) throw new Error("partner conversion was not disabled-by-default and idempotent");

const reverseBody = { action: "reverse", businessKey: `ecosystem:contribution-reverse:${stamp}`, remark: "验收撤销贡献并扣回积分" };
const [reversed, reverseReplay] = await Promise.all([
  request(`/admin/ambassador/contributions/${contribution.id}/actions`, reviewerToken, "POST", reverseBody),
  request(`/admin/ambassador/contributions/${contribution.id}/actions`, reviewerToken, "POST", reverseBody)
]);
if (reversed.id !== reverseReplay.id || reversed.status !== "reversed") throw new Error("ambassador contribution reversal replay was not idempotent");
const reversedProfiles = await request("/admin/ambassador/profiles", managerToken);
const reversedProfile = reversedProfiles.find((row) => row.id === profile.id);
if (reversedProfile?.contributionPoints !== 0 || reversedProfile?.level !== "starter") throw new Error("reversed contribution did not deduct points and downgrade the ambassador");

const terminateBody = { action: "terminate", businessKey: `ecosystem:contract-terminate:${stamp}`, remark: "转换完成后终止验收合同" };
const [terminated, terminateReplay] = await Promise.all([
  request(`/admin/partner/contracts/${contract.id}/actions`, reviewerToken, "POST", terminateBody),
  request(`/admin/partner/contracts/${contract.id}/actions`, reviewerToken, "POST", terminateBody)
]);
if (terminated.id !== terminateReplay.id || terminated.status !== "terminated") throw new Error("partner contract termination replay was not idempotent");

console.log(JSON.stringify({ testedAt: new Date().toISOString(), retainedAmbassadorApplicationId: ambassador.id, retainedAmbassadorProfileId: profile.id, retainedTaskId: quotaTask.id, quotaSuccessCount: quotaAttempts.filter((item) => item.response.ok).length, retainedContributionId: contribution.id, contributionStatus: reversed.status, retainedPartnerApplicationId: partner.id, retainedContractId: contract.id, contractStatus: terminated.status, retainedTenant: converted.tenant, retainedMerchant: converted.merchant, passed: true }, null, 2));
