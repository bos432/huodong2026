const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = "qiwai-showcase";
const stamp = Date.now();

function assert(condition, message) { if (!condition) throw new Error(message); }
function shanghaiDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
async function raw(path, { method = "GET", token, body, tenantCode = TENANT_CODE } = {}) {
  const response = await fetch(`${API_BASE}${path}`, { method, headers: { "content-type": "application/json", "x-tenant-code": tenantCode, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload, text };
}
async function request(path, options = {}) {
  const result = await raw(path, options);
  assert(result.response.ok && result.payload?.code === 0, `${options.method || "GET"} ${path} failed (${result.response.status}): ${result.text}`);
  return result.payload.data;
}
async function member(phonePrefix) {
  const phone = `${phonePrefix}${String(stamp).slice(-7)}`;
  const login = await request("/public/auth/password-login", { method: "POST", body: { phone, password: "Qiwai123456" } });
  return { phone, id: Number(login.user.id), token: login.userAccessToken };
}

const ops = await request("/admin/auth/login", { method: "POST", body: { username: "showcase_ops", password: "Qiwai123456" } });
const learner = await member("1348");
const approvalLearner = await member("1338");
const inviteLearner = await member("1328");
const startTime = new Date(Date.now() - 3 * 86400000).toISOString();
const endTime = new Date(Date.now() + 7 * 86400000).toISOString();

const openActivity = await request("/admin/community-activities", { method: "POST", token: ops.token, body: { title: `08.01 开放共学验收保留 ${stamp}`, description: "并发加入、补卡、审核和连续天数验收", startTime, endTime, joinMode: "open", memberLimit: 100, status: "published", sortOrder: 801 } });
const approvalActivity = await request("/admin/community-activities", { method: "POST", token: ops.token, body: { title: `08.01 审核共学验收保留 ${stamp}`, startTime, endTime, joinMode: "approval", memberLimit: 100, status: "published", sortOrder: 802 } });
const inviteCode = `COMM${String(stamp).slice(-8)}`;
const inviteActivity = await request("/admin/community-activities", { method: "POST", token: ops.token, body: { title: `08.01 邀请共学验收保留 ${stamp}`, startTime, endTime, joinMode: "invite", inviteCode, memberLimit: 100, status: "published", sortOrder: 803 } });

const joins = await Promise.all(Array.from({ length: 8 }, () => request(`/public/community/activities/${openActivity.id}/join?tenantCode=${TENANT_CODE}`, { method: "POST", token: learner.token, body: { applyRemark: "08.01 并发加入" } })));
assert(joins.every((item) => item.status === "joined") && new Set(joins.map((item) => item.id)).size === 1, "concurrent open joins did not return one joined membership");
const openMembers = await request(`/admin/community-activities/${openActivity.id}/members`, { token: ops.token });
assert(openMembers.filter((item) => Number(item.userId) === learner.id).length === 1, "concurrent join created duplicate memberships");

const pending = await request(`/public/community/activities/${approvalActivity.id}/join?tenantCode=${TENANT_CODE}`, { method: "POST", token: approvalLearner.token, body: { applyRemark: "申请参加审核制共学" } });
assert(pending.status === "pending", "approval join did not enter pending");
await request(`/admin/community-activity-members/${pending.id}/review`, { method: "POST", token: ops.token, body: { action: "approve", reviewRemark: "08.01 审核通过" } });
const approvalProgram = await request(`/public/community/activities/${approvalActivity.id}/program?tenantCode=${TENANT_CODE}`, { token: approvalLearner.token });
assert(approvalProgram.membership?.status === "joined", "approved member did not become joined");

const wrongInvite = await raw(`/public/community/activities/${inviteActivity.id}/join?tenantCode=${TENANT_CODE}`, { method: "POST", token: inviteLearner.token, body: { inviteCode: "WRONG" } });
assert(wrongInvite.response.status === 400, `wrong invite code returned ${wrongInvite.response.status}`);
const invited = await request(`/public/community/activities/${inviteActivity.id}/join?tenantCode=${TENANT_CODE}`, { method: "POST", token: inviteLearner.token, body: { inviteCode } });
assert(invited.status === "joined", "valid invite did not join activity");

const yesterdayTask = await request("/admin/checkin-tasks", { method: "POST", token: ops.token, body: { activityId: openActivity.id, date: shanghaiDate(-1), title: "08.01 昨日补卡审核任务", description: "补卡后由运营审核", checkinType: "text", requireApproval: true, allowMakeup: true, makeupWithinDays: 3, enabled: true } });
const todayTask = await request("/admin/checkin-tasks", { method: "POST", token: ops.token, body: { activityId: openActivity.id, date: shanghaiDate(0), title: "08.01 今日自动通过任务", description: "今日文本打卡", checkinType: "text", requireApproval: false, allowMakeup: false, enabled: true } });

const makeup = await request(`/public/community/activities/${openActivity.id}/checkins?tenantCode=${TENANT_CODE}`, { method: "POST", token: learner.token, body: { taskId: yesterdayTask.id, date: shanghaiDate(-1), content: "08.01 昨日补卡内容" } });
assert(makeup.checkin.status === "pending" && makeup.checkin.makeup === true && makeup.streak?.current === 0, `makeup check-in status or streak is incorrect before review: ${JSON.stringify(makeup)}`);
await request(`/admin/community-checkins/${makeup.checkin.id}/review`, { method: "POST", token: ops.token, body: { action: "approve", reviewRemark: "补卡审核通过" } });

const todaySubmits = await Promise.all(Array.from({ length: 8 }, () => request(`/public/community/activities/${openActivity.id}/checkins?tenantCode=${TENANT_CODE}`, { method: "POST", token: learner.token, body: { taskId: todayTask.id, date: shanghaiDate(0), content: "08.01 今日并发打卡内容" } })));
const todayIds = new Set(todaySubmits.map((item) => item.checkin.id));
assert(todayIds.size === 1 && todaySubmits.every((item) => item.checkin.status === "approved"), "concurrent daily check-in created duplicates or wrong status");
assert(todaySubmits.some((item) => item.idempotent === true), "repeated daily check-in was not idempotent");

const program = await request(`/public/community/activities/${openActivity.id}/program?tenantCode=${TENANT_CODE}`, { token: learner.token });
assert(program.membership?.status === "joined" && program.tasks.length === 2 && program.checkins.length === 2 && program.streak?.current === 2 && program.streak?.longest >= 2 && program.streak?.total === 2, `program result is incorrect: ${JSON.stringify({ membership: program.membership?.status, tasks: program.tasks.length, checkins: program.checkins.length, streak: program.streak })}`);
const crossTenant = await raw(`/public/community/activities/${openActivity.id}/program?tenantCode=qiwai-hangzhou`, { token: learner.token, tenantCode: "qiwai-hangzhou" });
assert(crossTenant.response.status === 404, `cross-tenant program access returned ${crossTenant.response.status}`);
const futureDate = await raw(`/public/community/activities/${openActivity.id}/checkins?tenantCode=${TENANT_CODE}`, { method: "POST", token: learner.token, body: { taskId: todayTask.id, date: shanghaiDate(1), content: "未来日期非法打卡" } });
assert(futureDate.response.status === 400, `future-date check-in returned ${futureDate.response.status}`);

console.log(JSON.stringify({ ok: true, openActivityId: openActivity.id, approvalActivityId: approvalActivity.id, inviteActivityId: inviteActivity.id, learner: { id: learner.id, phone: learner.phone }, approvalLearner: { id: approvalLearner.id, phone: approvalLearner.phone }, inviteLearner: { id: inviteLearner.id, phone: inviteLearner.phone }, openMembershipId: joins[0].id, approvalMembershipId: pending.id, inviteMembershipId: invited.id, yesterdayTaskId: yesterdayTask.id, todayTaskId: todayTask.id, makeupCheckinId: makeup.checkin.id, todayCheckinId: todaySubmits[0].checkin.id, concurrentJoins: joins.length, concurrentCheckins: todaySubmits.length, streak: program.streak, crossTenantStatus: crossTenant.response.status, futureDateStatus: futureDate.response.status }, null, 2));
