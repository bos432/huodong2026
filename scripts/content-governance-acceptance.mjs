const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const PASSWORD = process.env.ACCEPTANCE_PASSWORD || "Qiwai123456";
const TENANT_CODE = "qiwai-showcase";
const POST_ID = Number(process.env.CONTENT_GOVERNANCE_POST_ID || 42);
const stamp = Date.now();

function assert(value, message) { if (!value) throw new Error(message); }

async function raw(path, { method = "GET", token, tenantCode, idempotencyKey, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(tenantCode ? { "x-tenant-code": tenantCode } : {}),
      ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, data: payload?.data, message: payload?.message || text };
}

async function request(path, options = {}) {
  const result = await raw(path, options);
  if (result.status < 200 || result.status >= 300 || result.data === undefined) {
    throw new Error(`${options.method || "GET"} ${path} failed (${result.status}): ${result.message}`);
  }
  return result.data;
}

async function adminLogin(username) {
  const data = await request("/admin/auth/login", { method: "POST", body: { username, password: PASSWORD } });
  return data.token;
}

async function main() {
  const adminToken = await adminLogin("showcase_ops");
  const crossTenantToken = await adminLogin("qiwai_hz_ops");
  const phone = `130${String(stamp).slice(-8)}`;
  const login = await request("/public/auth/password-login", {
    method: "POST",
    tenantCode: TENANT_CODE,
    body: { phone, password: PASSWORD, nickname: `内容治理验收${String(stamp).slice(-6)}` }
  });
  const userToken = login.userAccessToken;
  const userId = login.user.id;
  assert((await request(`/public/community/posts/${POST_ID}?tenantCode=${TENANT_CODE}`, { token: userToken, tenantCode: TENANT_CODE }))?.id === POST_ID, "验收动态不可见");

  const maskKeyword = `治理敏感词${String(stamp).slice(-5)}`;
  const maskRule = await request("/admin/content-keyword-rules", {
    method: "POST",
    token: adminToken,
    body: { keyword: maskKeyword, scope: "community", matchMode: "contains", action: "mask", replacement: "[已过滤]", enabled: true }
  });
  const masked = await request(`/public/community/posts/${POST_ID}/comments?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    token: userToken,
    tenantCode: TENANT_CODE,
    body: { content: `这是${maskKeyword}的替换验收` }
  });
  assert(masked.comment.content === "这是[已过滤]的替换验收", "关键词替换未生效");
  await request(`/admin/content-keyword-rules/${maskRule.id}`, { method: "DELETE", token: adminToken });

  const rejectKeyword = `禁止发布${String(stamp).slice(-5)}`;
  const rejectRule = await request("/admin/content-keyword-rules", {
    method: "POST",
    token: adminToken,
    body: { keyword: rejectKeyword, scope: "community", matchMode: "exact", action: "reject", enabled: true }
  });
  const rejected = await raw(`/public/community/posts/${POST_ID}/comments?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    token: userToken,
    tenantCode: TENANT_CODE,
    body: { content: rejectKeyword }
  });
  assert(rejected.status === 400 && rejected.message.includes(rejectKeyword), "禁止发布关键词未拦截");
  const crossTenantRuleDelete = await raw(`/admin/content-keyword-rules/${rejectRule.id}`, { method: "DELETE", token: crossTenantToken });
  assert([403, 404].includes(crossTenantRuleDelete.status), "跨租户关键词删除未拒绝");
  await request(`/admin/content-keyword-rules/${rejectRule.id}`, { method: "DELETE", token: adminToken });

  const blockingSanction = await request("/admin/content-sanctions", {
    method: "POST",
    token: adminToken,
    body: { userId, type: "mute", scope: "community", startsAt: new Date(Date.now() - 86400000).toISOString(), reason: "08.04 发布阻止验收" }
  });
  const blockedBeforeExpiry = await raw(`/public/community/posts/${POST_ID}/comments?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    token: userToken,
    tenantCode: TENANT_CODE,
    body: { content: "处罚到期前应阻止发布" }
  });
  assert(blockedBeforeExpiry.status === 403, "处罚到期前未阻止发布");
  await request(`/admin/content-sanctions/${blockingSanction.id}/revoke`, {
    method: "POST",
    token: adminToken,
    body: { remark: "发布阻止验证完成，解除长期处罚" }
  });
  const elapsedSanction = await request("/admin/content-sanctions", {
    method: "POST",
    token: adminToken,
    body: {
      userId,
      type: "mute",
      scope: "community",
      startsAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      endsAt: new Date(Date.now() - 86400000).toISOString(),
      reason: "08.04 已过截止时间归档验收"
    }
  });
  const allowedAfterExpiry = await request(`/public/community/posts/${POST_ID}/comments?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    token: userToken,
    tenantCode: TENANT_CODE,
    body: { content: "处罚到期后恢复发布权限" }
  });
  assert(allowedAfterExpiry.comment.id, "处罚到期后仍无法发布");
  const sanctionsAfterExpiry = await request(`/public/me/content/sanctions?tenantCode=${TENANT_CODE}`, { token: userToken, tenantCode: TENANT_CODE });
  assert(sanctionsAfterExpiry.find((item) => item.id === elapsedSanction.id)?.status === "expired", "到期处罚未归档为 expired");

  const appealSanction = await request("/admin/content-sanctions", {
    method: "POST",
    token: adminToken,
    body: { userId, type: "mute", scope: "community", startsAt: new Date(Date.now() - 86400000).toISOString(), reason: "08.04 申诉解禁验收" }
  });
  const appealKey = `content-governance:${stamp}`;
  const appeals = await Promise.all(Array.from({ length: 8 }, () => request(
    `/public/me/content/appeals?tenantCode=${TENANT_CODE}`,
    {
      method: "POST",
      token: userToken,
      tenantCode: TENANT_CODE,
      idempotencyKey: appealKey,
      body: { sanctionId: appealSanction.id, reason: "处罚存在误判，请结合上下文重新审核。" }
    }
  )));
  assert(new Set(appeals.map((item) => item.id)).size === 1, "并发申诉未幂等");
  const appealId = appeals[0].id;
  const crossTenantAppeal = await raw(`/admin/content-appeals/${appealId}/review`, {
    method: "POST",
    token: crossTenantToken,
    body: { status: "approved", handleRemark: "跨租户不应成功" }
  });
  assert([403, 404].includes(crossTenantAppeal.status), "跨租户申诉审核未拒绝");
  await request(`/admin/content-appeals/${appealId}/review`, {
    method: "POST",
    token: adminToken,
    body: { status: "approved", handleRemark: "复核确认无违规，申诉通过并解除处罚。" }
  });
  const sanctionsAfterAppeal = await request(`/public/me/content/sanctions?tenantCode=${TENANT_CODE}`, { token: userToken, tenantCode: TENANT_CODE });
  assert(sanctionsAfterAppeal.find((item) => item.id === appealSanction.id)?.status === "revoked", "申诉通过后处罚未解除");
  const appealsAfterReview = await request(`/public/me/content/appeals?tenantCode=${TENANT_CODE}`, { token: userToken, tenantCode: TENANT_CODE });
  assert(appealsAfterReview.find((item) => item.id === appealId)?.status === "approved", "申诉结果未回显");

  const report = await request(`/public/community/posts/${POST_ID}/report?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    token: userToken,
    tenantCode: TENANT_CODE,
    body: { type: "other", description: "08.04 重复举报与租户隔离验收，不隐藏原内容。" }
  });
  const duplicateReport = await raw(`/public/community/posts/${POST_ID}/report?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    token: userToken,
    tenantCode: TENANT_CODE,
    body: { type: "other", description: "重复举报" }
  });
  assert(duplicateReport.status === 400 && duplicateReport.message.includes("已在处理"), "重复举报未拦截");
  const crossTenantReports = await request("/admin/community-content-reports?status=pending", { token: crossTenantToken });
  assert(!crossTenantReports.some((item) => item.id === report.id), "跨租户举报列表泄露");
  await request(`/admin/community-content-reports/${report.id}/review`, {
    method: "POST",
    token: adminToken,
    body: { status: "rejected", action: "none", handleRemark: "验收复核未发现违规，举报不予采纳。" }
  });
  const notifications = await request("/admin/notifications", { token: adminToken });
  const userNotifications = notifications.filter((item) => Number(item.user?.id) === userId);
  for (const title of ["社区账号处罚通知", "社区处罚已解除", "内容申诉已通过", "社区举报处理结果"]) {
    assert(userNotifications.some((item) => item.title === title && ["sent", "suppressed"].includes(item.status)), `缺少已发送或按频控抑制的治理通知：${title}`);
    assert(!userNotifications.some((item) => item.title === title && item.status === "failed"), `治理通知发送失败：${title}`);
  }

  console.log(JSON.stringify({
    ok: true,
    user: { id: userId, phone },
    postId: POST_ID,
    maskedCommentId: masked.comment.id,
    allowedAfterExpiryCommentId: allowedAfterExpiry.comment.id,
    blockingSanctionId: blockingSanction.id,
    elapsedSanctionId: elapsedSanction.id,
    appealSanctionId: appealSanction.id,
    appealId,
    concurrentAppeals: appeals.length,
    reportId: report.id,
    notificationCount: userNotifications.length,
    crossTenantRuleDeleteStatus: crossTenantRuleDelete.status,
    crossTenantAppealStatus: crossTenantAppeal.status
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
