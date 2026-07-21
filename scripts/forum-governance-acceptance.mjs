const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const PASSWORD = process.env.ACCEPTANCE_PASSWORD || "Qiwai123456";
const TENANT_CODE = "qiwai-hangzhou";
const stamp = Date.now();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function raw(path, { method = "GET", token, tenantCode, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(tenantCode ? { "x-tenant-code": tenantCode } : {})
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
  const result = await request("/admin/auth/login", { method: "POST", body: { username, password: PASSWORD } });
  assert(result.token, `${username} 登录未返回 token`);
  return result.token;
}

async function userLogin(phone, tenantCode) {
  const result = await request("/public/auth/password-login", {
    method: "POST",
    tenantCode,
    body: { phone, password: PASSWORD, nickname: `论坛验收${String(stamp).slice(-6)}` }
  });
  assert(result.userAccessToken, "会员登录未返回 token");
  return result;
}

async function main() {
  const hangzhouAdmin = await adminLogin("qiwai_hz_ops");
  const showcaseAdmin = await adminLogin("showcase_ops");
  const phone = `135${String(stamp).slice(-8)}`;
  const user = await userLogin(phone, TENANT_CODE);

  const category = await request("/admin/forum/categories", {
    method: "POST",
    token: hangzhouAdmin,
    body: {
      name: `08.03 论坛治理验收保留 ${stamp}`,
      description: "并发楼层、锁帖、引用快照与版主租户边界",
      sortOrder: 1,
      enabled: true,
      postPermission: "user",
      auditMode: "post"
    }
  });

  const created = await request(`/public/forum/topics?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    token: user.userAccessToken,
    tenantCode: TENANT_CODE,
    body: {
      categoryId: category.id,
      title: `08.03 并发楼层验收保留 ${stamp}`,
      content: "用于验证稳定楼层、锁帖竞态、引用快照和租户隔离。",
      tags: ["08.03", "并发", "治理"]
    }
  });
  const topicId = created.topic.id;
  assert(created.topic.status === "approved", "后审版块帖子应直接通过");

  const replies = await Promise.all(Array.from({ length: 8 }, (_, index) => request(
    `/public/forum/topics/${topicId}/replies?tenantCode=${TENANT_CODE}`,
    {
      method: "POST",
      token: user.userAccessToken,
      tenantCode: TENANT_CODE,
      body: { content: `并发一级回复 ${index + 1} / ${stamp}` }
    }
  )));
  const floorNos = replies.map((item) => Number(item.reply.floorNo)).sort((a, b) => a - b);
  assert(new Set(floorNos).size === 8, `并发楼层号重复: ${floorNos.join(",")}`);
  assert(floorNos.every((floor, index) => floor === index + 1), `并发楼层不连续: ${floorNos.join(",")}`);

  const quotedParent = replies[0].reply;
  const child = await request(`/public/forum/replies/${quotedParent.id}/replies?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    token: user.userAccessToken,
    tenantCode: TENANT_CODE,
    body: { content: `引用回复快照 ${stamp}` }
  });
  assert(child.reply.depth === 2, "楼中楼深度应为 2");
  assert(child.reply.quote?.replyId === quotedParent.id, "引用快照缺少原回复 ID");
  assert(Number(child.reply.quote?.floorNo) === Number(quotedParent.floorNo), "引用快照楼层不一致");
  assert(String(child.reply.quote?.content || "").includes("并发一级回复"), "引用快照未保存原内容");

  await request(`/admin/forum/topics/${topicId}/pin`, { method: "POST", token: hangzhouAdmin, body: { pinned: true } });
  await request(`/admin/forum/topics/${topicId}/feature`, { method: "POST", token: hangzhouAdmin, body: { featured: true } });
  await request(`/admin/forum/topics/${topicId}/lock`, {
    method: "POST",
    token: hangzhouAdmin,
    body: { locked: true, reason: "08.03 验收锁帖，暂停回复" }
  });
  const blocked = await Promise.all(Array.from({ length: 8 }, (_, index) => raw(
    `/public/forum/topics/${topicId}/replies?tenantCode=${TENANT_CODE}`,
    {
      method: "POST",
      token: user.userAccessToken,
      tenantCode: TENANT_CODE,
      body: { content: `锁帖后应拒绝 ${index + 1}` }
    }
  )));
  assert(blocked.every((item) => item.status === 400 && item.message.includes("暂停回复")), "锁帖后仍有回复写入成功");

  const detail = await request(`/public/forum/topics/${topicId}?tenantCode=${TENANT_CODE}`, {
    token: user.userAccessToken,
    tenantCode: TENANT_CODE
  });
  assert(detail.locked && detail.pinned && detail.featured, "详情未返回锁帖、置顶和精华状态");
  assert(detail.lockReason === "08.03 验收锁帖，暂停回复", "锁帖原因不一致");

  const candidates = await request("/admin/forum/moderator-candidates", { token: hangzhouAdmin });
  assert(candidates.length > 0, "杭州租户没有可分配版主候选人");
  const moderator = await request(`/admin/forum/categories/${category.id}/moderators`, {
    method: "POST",
    token: hangzhouAdmin,
    body: { adminId: candidates[0].id, permissions: ["topic_review", "reply_review", "topic_lock", "topic_feature"] }
  });
  assert(moderator.id, "版主分配失败");
  const crossTenantModerator = await raw(`/admin/forum/categories/${category.id}/moderators`, {
    method: "POST",
    token: showcaseAdmin,
    body: { adminId: candidates[0].id }
  });
  assert([403, 404].includes(crossTenantModerator.status), `跨租户版主分配应拒绝，实际 ${crossTenantModerator.status}`);

  const disabledForum = await raw("/public/forum/categories?tenantCode=qiwai-showcase", {
    token: user.userAccessToken,
    tenantCode: "qiwai-showcase"
  });
  assert([403, 404].includes(disabledForum.status), `未开通论坛租户应隐藏或拒绝论坛，实际 ${disabledForum.status}`);

  console.log(JSON.stringify({
    ok: true,
    tenantCode: TENANT_CODE,
    user: { id: user.user.id, phone },
    categoryId: category.id,
    topicId,
    replyIds: replies.map((item) => item.reply.id),
    floorNos,
    childReplyId: child.reply.id,
    moderatorId: moderator.id,
    lockedReplyAttempts: blocked.length,
    crossTenantModeratorStatus: crossTenantModerator.status,
    disabledForumStatus: disabledForum.status
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
