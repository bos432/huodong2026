import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin, tenantHeader } from "./online-showcase-lib.mjs";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const stamp = Date.now();
const runId = `member-level-tenant-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function request(pathname, token, method = "GET", body, extraHeaders = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...(token ? auth(token) : {}), ...extraHeaders, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload, data: payload?.data };
}

function expectRejected(result, label, statuses = [400]) {
  assert(statuses.includes(result.status), `${label} 应返回 ${statuses.join("/")}，实际 ${result.status}`);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration"
});

try {
  const platformAdmin = await loginPlatformAdmin();
  const tenantAdmin = await loginShowcaseAdmin("showcase_admin");
  const [[showcaseTenant]] = await connection.query("SELECT id, code, name FROM tenants WHERE code = 'qiwai-showcase' LIMIT 1");
  const [[otherTenant]] = await connection.query("SELECT id, code, name FROM tenants WHERE enabled = 1 AND id <> ? ORDER BY id LIMIT 1", [showcaseTenant.id]);
  assert(showcaseTenant?.id && otherTenant?.id, "未找到两个可用于等级租户化验收的商家");

  const sharedName = `同名成长等级-${stamp}`;
  const baseLevelPayload = {
    name: sharedName,
    minPoints: 900000,
    minGrowth: 900000,
    validityDays: 365,
    benefits: [{ key: `tenant-growth-${stamp}`, name: "租户成长权益", description: runId }],
    discountRate: 0.88,
    priorityBooking: true,
    enabled: true,
    sortOrder: 9000
  };
  const levelA = await api("/admin/member-levels", { method: "POST", headers: auth(platformAdmin.token), body: JSON.stringify({ ...baseLevelPayload, tenantId: showcaseTenant.id }) });
  const levelB = await api("/admin/member-levels", { method: "POST", headers: auth(platformAdmin.token), body: JSON.stringify({ ...baseLevelPayload, tenantId: otherTenant.id, benefits: [{ key: `other-tenant-${stamp}`, name: "其他租户权益" }] }) });
  assert(levelA.name === levelB.name && levelA.id !== levelB.id, "两个租户未能创建同名独立等级");

  const crossAnnouncement = await request("/admin/announcements", platformAdmin.token, "POST", {
    tenantId: otherTenant.id,
    title: `跨租户受众拒绝-${stamp}`,
    content: runId,
    type: "notice",
    enabled: true,
    pinned: false,
    audience: { mode: "member_levels", memberLevelIds: [levelA.id] }
  });
  expectRejected(crossAnnouncement, "跨租户公告受众");

  const crossCourse = await request("/admin/courses", platformAdmin.token, "POST", {
    tenantId: otherTenant.id,
    title: `跨租户课程拒绝-${stamp}`,
    description: runId,
    price: 0,
    originalPrice: 0,
    accessMode: "member",
    requiredMemberLevelId: levelA.id,
    completionThreshold: 100,
    status: "draft",
    tags: [runId],
    sortOrder: 9000
  });
  expectRejected(crossCourse, "跨租户课程等级");

  const now = Date.now();
  const crossActivity = await request("/admin/activities", platformAdmin.token, "POST", {
    tenantId: otherTenant.id,
    title: `跨租户活动拒绝-${stamp}`,
    description: runId,
    location: "验收场地",
    startTime: new Date(now + 7 * 86400000).toISOString(),
    endTime: new Date(now + 7 * 86400000 + 7200000).toISOString(),
    registrationDeadline: new Date(now + 6 * 86400000).toISOString(),
    capacity: 20,
    price: 0,
    status: "draft",
    featured: false,
    requireReview: false,
    allowCancel: true,
    minMemberLevelId: levelA.id,
    fields: []
  });
  expectRejected(crossActivity, "跨租户活动等级");

  const memberPassword = "Qiwai123456";
  const phoneA = `136${String(stamp).slice(-8)}`;
  const phoneB = `135${String(stamp).slice(-8)}`;
  const memberA = await api("/admin/members", { method: "POST", headers: auth(tenantAdmin.token), body: JSON.stringify({ phone: phoneA, password: memberPassword, nickname: `等级快照旧会员-${stamp}`, remark: runId }) });
  const memberB = await api("/admin/members", { method: "POST", headers: auth(tenantAdmin.token), body: JSON.stringify({ phone: phoneB, password: memberPassword, nickname: `等级快照新会员-${stamp}`, remark: runId }) });
  const userAId = Number(memberA.user.id);
  const userBId = Number(memberB.user.id);

  await api(`/admin/members/${userAId}/points/adjust`, { method: "POST", headers: auth(tenantAdmin.token), body: JSON.stringify({ points: 900000, remark: runId, idempotencyKey: `${runId}:points:a` }) });
  const detailA1 = await api(`/admin/members/${userAId}`, { headers: auth(tenantAdmin.token) });
  assert(Number(detailA1.profile.level?.id) === Number(levelA.id), "自动升档未命中当前租户等级");
  assert(Number(detailA1.profile.levelSnapshot?.version) === 1, "旧会员初始权益快照版本不正确");

  const levelA2 = await api(`/admin/member-levels/${levelA.id}`, {
    method: "PATCH",
    headers: auth(platformAdmin.token),
    body: JSON.stringify({ ...baseLevelPayload, tenantId: showcaseTenant.id, discountRate: 0.76, benefits: [{ key: `tenant-growth-${stamp}`, name: "租户成长权益 v2", description: `${runId}:v2` }] })
  });
  assert(Number(levelA2.version) === 2, "会员等级更新后版本未递增");
  const detailA2 = await api(`/admin/members/${userAId}`, { headers: auth(tenantAdmin.token) });
  assert(Number(detailA2.profile.level?.version) === 2, "会员关联等级未读取最新版本");
  assert(Number(detailA2.profile.levelSnapshot?.version) === 1, "旧会员权益快照被等级配置更新覆盖");
  assert(Number(detailA2.profile.levelSnapshot?.discountRate) === 0.88, "旧会员折扣快照被等级配置更新覆盖");

  await api(`/admin/members/${userBId}/points/adjust`, { method: "POST", headers: auth(tenantAdmin.token), body: JSON.stringify({ points: 900000, remark: runId, idempotencyKey: `${runId}:points:b` }) });
  const detailB1 = await api(`/admin/members/${userBId}`, { headers: auth(tenantAdmin.token) });
  assert(Number(detailB1.profile.level?.id) === Number(levelA.id), "新会员自动升档未命中当前租户等级");
  assert(Number(detailB1.profile.levelSnapshot?.version) === 2, "新会员未冻结新版本权益");
  assert(Number(detailB1.profile.levelSnapshot?.discountRate) === 0.76, "新会员未冻结新版本折扣");

  await api(`/admin/members/${userBId}/level`, { method: "POST", headers: auth(tenantAdmin.token), body: JSON.stringify({ reason: `人工降级验收-${stamp}` }) });
  const manualAdjustment = await api(`/admin/members/${userBId}/level`, { method: "POST", headers: auth(tenantAdmin.token), body: JSON.stringify({ levelId: levelA.id, reason: `人工恢复等级-${stamp}` }) });
  assert(manualAdjustment.history?.reason === `人工恢复等级-${stamp}`, "人工调整原因未写入等级历史");
  assert(manualAdjustment.history?.operator?.username === tenantAdmin.admin.username, "人工调整操作者未写入等级历史");

  const course = await api("/admin/courses", {
    method: "POST",
    headers: auth(tenantAdmin.token),
    body: JSON.stringify({ title: `会员权益快照课程-${stamp}`, description: runId, price: 0, originalPrice: 0, accessMode: "member", requiredMemberLevelId: levelA.id, completionThreshold: 100, status: "published", tags: [runId], sortOrder: 9000 })
  });
  const userLogin = await api("/public/auth/password-login", { method: "POST", headers: tenantHeader(showcaseTenant.code), body: JSON.stringify({ phone: phoneA, password: memberPassword }) });
  const courseOrderResult = await api(`/public/courses/${course.id}/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userLogin.userAccessToken}`, ...tenantHeader(showcaseTenant.code) },
    body: JSON.stringify({ clientOrderKey: `${runId}:course-order` })
  });
  assert(courseOrderResult.order?.id, "会员课程未生成权益订单");
  const [[courseOrderRow]] = await connection.query("SELECT id, businessSnapshot FROM course_orders WHERE id = ?", [courseOrderResult.order.id]);
  const courseSnapshot = typeof courseOrderRow.businessSnapshot === "string" ? JSON.parse(courseOrderRow.businessSnapshot) : courseOrderRow.businessSnapshot;
  assert(Number(courseSnapshot.memberLevel?.version) === 1, "课程订单未冻结旧会员权益版本");
  assert(Number(courseSnapshot.requiredMemberLevel?.version) === 2, "课程订单未冻结下单时课程等级版本");

  let updateBlocked = false;
  let deleteBlocked = false;
  try { await connection.query("UPDATE member_level_changes SET reason = 'tamper' WHERE id = ?", [manualAdjustment.history.id]); } catch (error) { updateBlocked = String(error?.sqlState || "") === "45000"; }
  try { await connection.query("DELETE FROM member_level_changes WHERE id = ?", [manualAdjustment.history.id]); } catch (error) { deleteBlocked = String(error?.sqlState || "") === "45000"; }
  assert(updateBlocked && deleteBlocked, "等级历史不可变 trigger 未同时阻止更新和删除");

  const result = {
    runId,
    generatedAt: new Date().toISOString(),
    tenants: { showcase: showcaseTenant, other: otherTenant },
    levels: { tenantA: levelA2, tenantB: levelB },
    members: [
      { userId: userAId, phone: phoneA, password: memberPassword, snapshotVersion: detailA2.profile.levelSnapshot.version },
      { userId: userBId, phone: phoneB, password: memberPassword, snapshotVersion: manualAdjustment.profile.levelSnapshot.version }
    ],
    manualHistory: manualAdjustment.history,
    course: { id: course.id, title: course.title, orderId: courseOrderResult.order.id, orderNo: courseOrderResult.order.orderNo, businessSnapshot: courseSnapshot },
    crossTenantRejections: { announcement: crossAnnouncement.status, course: crossCourse.status, activity: crossActivity.status },
    immutableHistory: { updateBlocked, deleteBlocked }
  };
  fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
} finally {
  await connection.end();
}
