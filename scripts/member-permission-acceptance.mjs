import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin, tenantHeader } from "./online-showcase-lib.mjs";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const ExcelJS = require("exceljs");
const stamp = Date.now();
const runId = `member-permission-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function request(pathname, token, method = "GET", body, extraHeaders = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...(token ? auth(token) : {}), ...extraHeaders, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const contentType = response.headers.get("content-type") || "";
  const buffer = Buffer.from(await response.arrayBuffer());
  let payload = null;
  if (contentType.includes("json")) {
    try { payload = JSON.parse(buffer.toString("utf8")); } catch { payload = buffer.toString("utf8"); }
  }
  return { status: response.status, contentType, payload, data: payload?.data, buffer };
}

function expectDenied(result, label, statuses = [403]) {
  assert(statuses.includes(result.status), `${label} 应为 ${statuses.join("/")}，实际 ${result.status}`);
}

function findBlockedKey(value, blocked, pathName = "root") {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findBlockedKey(value[index], blocked, `${pathName}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  for (const [key, item] of Object.entries(value)) {
    if (blocked.has(key)) return `${pathName}.${key}`;
    const found = findBlockedKey(item, blocked, `${pathName}.${key}`);
    if (found) return found;
  }
  return null;
}

const readAdmin = await loginShowcaseAdmin("showcase_member_read");
const manageAdmin = await loginShowcaseAdmin("showcase_member_manager");
const passwordAdmin = await loginShowcaseAdmin("showcase_member_password");
const pointsAdmin = await loginShowcaseAdmin("showcase_member_points");
const lifecycleAdmin = await loginShowcaseAdmin("showcase_member_lifecycle");
const sensitiveAdmin = await loginShowcaseAdmin("showcase_member_sensitive");
const exportAdmin = await loginShowcaseAdmin("showcase_member_export");
const showcaseAdmin = await loginShowcaseAdmin("showcase_admin");
const platformAdmin = await loginPlatformAdmin();

const options = await api("/admin/members/options", { headers: auth(readAdmin.token) });
assert(Array.isArray(options.levels), "会员只读账号未获得等级 options");
assert(Array.isArray(options.tenants) && options.tenants.length === 0, "租户会员只读账号不应获得平台商家钱包 options");

expectDenied(await request("/admin/members", readAdmin.token, "POST", { nickname: "越权会员" }), "只读账号新增会员");
expectDenied(await request("/admin/members/lifecycle-scan", readAdmin.token, "POST", {}), "只读账号扫描生命周期");
expectDenied(await request("/admin/members/export", readAdmin.token), "只读账号导出会员");
expectDenied(await request("/admin/members?pageSize=101", readAdmin.token), "非法会员分页", [400]);
expectDenied(await request("/admin/members?quickFilter=unknown", readAdmin.token), "非法会员快捷筛选", [400]);

const phone = `139${String(stamp).slice(-8)}`;
const nextPhone = `138${String(stamp).slice(-8)}`;
const created = await api("/admin/members", {
  method: "POST",
  headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" },
  body: JSON.stringify({ phone, nickname: `会员治理-${runId}`, remark: runId })
});
assert(created?.user?.id, "会员维护账号未创建会员");
const userId = Number(created.user.id);
expectDenied(await request("/admin/members", manageAdmin.token, "POST", { phone: `137${String(stamp).slice(-8)}`, nickname: "密码绕过", password: "Member123456" }), "维护账号夹带初始密码");
expectDenied(await request(`/admin/members/${userId}`, manageAdmin.token, "PATCH", { phone: nextPhone }), "维护账号修改敏感手机号");

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration"
});

const openid = `openid-${runId}`;
const unionid = `unionid-${runId}`;
const wechatAppId = `wx-${String(stamp).slice(-12)}`;
await connection.query("UPDATE users SET openid = ?, unionid = ?, wechatAppId = ? WHERE id = ?", [openid, unionid, wechatAppId, userId]);

await api(`/admin/members/${userId}`, {
  method: "PATCH",
  headers: { ...auth(showcaseAdmin.token), "Content-Type": "application/json" },
  body: JSON.stringify({ phone: nextPhone, nickname: `会员治理已更新-${runId}` })
});

const readList = await api(`/admin/members?keyword=${encodeURIComponent(nextPhone)}&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
assert(readList.items?.length === 1, "会员只读列表未命中保留会员");
const readUser = readList.items[0].user;
assert(readUser.phone === `${nextPhone.slice(0, 3)}****${nextPhone.slice(-4)}`, `只读手机号未脱敏：${readUser.phone}`);
assert(readUser.wechatBound === true && readUser.phoneBound === true, "会员绑定状态投影不正确");
assert(readUser.openid === null && readUser.unionid === null && readUser.wechatAppId === null, "只读列表泄露微信身份");
assert(!Object.prototype.hasOwnProperty.call(readUser, "passwordHash"), "只读列表泄露密码哈希");

const readDetail = await api(`/admin/members/${userId}`, { headers: auth(readAdmin.token) });
assert(readDetail.profile.user.phone === `${nextPhone.slice(0, 3)}****${nextPhone.slice(-4)}`, "会员详情手机号未脱敏");
assert(readDetail.profile.user.openid === null && readDetail.profile.user.unionid === null, "会员详情泄露微信身份");
const blockedPath = findBlockedKey(readDetail, new Set(["passwordHash", "answers", "formSnapshot", "companions", "checkInCode", "settings", "payload", "rawPayload", "businessSnapshot", "addressSnapshot", "receiverPhone"]));
assert(!blockedPath, `会员详情泄露内部字段：${blockedPath}`);

const sensitiveList = await api(`/admin/members?keyword=${encodeURIComponent(nextPhone)}&page=1&pageSize=20`, { headers: auth(sensitiveAdmin.token) });
assert(sensitiveList.items?.[0]?.user?.phone === nextPhone, "敏感账号未获得完整手机号");
assert(sensitiveList.items?.[0]?.user?.openid === openid, "敏感账号未获得完整 OpenID");
const sensitiveDetail = await api(`/admin/members/${userId}`, { headers: auth(sensitiveAdmin.token) });
assert(sensitiveDetail.profile.user.unionid === unionid && sensitiveDetail.profile.user.wechatAppId === wechatAppId, "敏感会员详情身份字段不完整");
expectDenied(await request(`/admin/members/${userId}`, sensitiveAdmin.token, "PATCH", { nickname: "敏感越权写" }), "敏感账号编辑会员");

const passwordValue = "Member123456";
await api(`/admin/members/${userId}/password`, { method: "POST", headers: { ...auth(passwordAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ password: passwordValue }) });
const userLogin = await request("/public/auth/password-login", null, "POST", { phone: nextPhone, password: passwordValue }, tenantHeader());
assert(userLogin.status === 201 && userLogin.data?.userAccessToken, "会员密码重置后登录失败");
expectDenied(await request(`/admin/members/${userId}/points/adjust`, passwordAdmin.token, "POST", { points: 10, remark: "越权积分", idempotencyKey: `deny-${runId}` }), "密码账号调整积分");

const beforePoints = Number((await api(`/admin/members/${userId}`, { headers: auth(pointsAdmin.token) })).profile.points || 0);
const pointKey = `member-points-${runId}`;
const pointBody = { points: 37, remark: `并发积分-${runId}`, idempotencyKey: pointKey };
const pointRace = await Promise.all([
  request(`/admin/members/${userId}/points/adjust`, pointsAdmin.token, "POST", pointBody),
  request(`/admin/members/${userId}/points/adjust`, pointsAdmin.token, "POST", pointBody)
]);
assert(pointRace.every((item) => item.status === 201), `同键积分并发应全部成功，实际 ${pointRace.map((item) => item.status).join("/")}`);
assert(pointRace.filter((item) => item.data?.idempotent === false).length === 1 && pointRace.filter((item) => item.data?.idempotent === true).length === 1, "同键积分并发未形成一次写入一次幂等命中");
const afterPoints = Number((await api(`/admin/members/${userId}`, { headers: auth(pointsAdmin.token) })).profile.points || 0);
assert(afterPoints - beforePoints === 37, `同键积分并发重复入账：${beforePoints} -> ${afterPoints}`);
const [pointLogRows] = await connection.query("SELECT id, sourceId FROM member_point_logs WHERE userId = ? AND sourceType = 'admin_point_adjust' AND remark = ?", [userId, pointBody.remark]);
assert(pointLogRows.length === 1, `同键积分流水应只有 1 条，实际 ${pointLogRows.length}`);

const expiredSource = `expired-${runId}`;
await connection.query("INSERT INTO member_point_logs (userId, tenantId, tenantScopeKey, growthValue, expiresAt, expiryProcessedAt, reversedAt, points, type, sourceType, sourceId, remark, createdAt) VALUES (?, 23, 'tenant:23', 0, DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL, 5, 'earn', 'acceptance_expired', ?, ?, NOW())", [userId, expiredSource, runId]);
const lifecycleRace = await Promise.all([
  request("/admin/members/lifecycle-scan", lifecycleAdmin.token, "POST", {}),
  request("/admin/members/lifecycle-scan", lifecycleAdmin.token, "POST", {})
]);
assert(lifecycleRace.every((item) => item.status === 201), `生命周期并发应串行成功，实际 ${lifecycleRace.map((item) => item.status).join("/")}`);
const [expiredRows] = await connection.query("SELECT id, expiryProcessedAt FROM member_point_logs WHERE sourceType = 'acceptance_expired' AND sourceId = ?", [expiredSource]);
assert(expiredRows.length === 1 && expiredRows[0].expiryProcessedAt, "生命周期扫描未处理保留过期积分");

const exportResult = await request(`/admin/members/export?keyword=${encodeURIComponent(nextPhone)}`, exportAdmin.token);
assert(exportResult.status === 200 && exportResult.contentType.includes("spreadsheetml"), "会员 Excel 导出失败");
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(exportResult.buffer);
const sheet = workbook.worksheets[0];
let exportedPhone = "";
sheet.eachRow((row, rowNumber) => {
  if (rowNumber > 1 && Number(row.getCell(1).value) === userId) exportedPhone = String(row.getCell(3).value || "");
});
assert(exportedPhone === `${nextPhone.slice(0, 3)}****${nextPhone.slice(-4)}`, `独立导出账号应导出脱敏手机号，实际 ${exportedPhone}`);
expectDenied(await request(`/admin/members/${userId}/points/adjust`, exportAdmin.token, "POST", { points: 1, remark: "导出越权", idempotencyKey: `export-deny-${runId}` }), "导出账号调整积分");

const [crossRows] = await connection.query("SELECT p.userId FROM member_profiles p WHERE p.tenantId IS NOT NULL AND p.tenantId <> 23 AND NOT EXISTS (SELECT 1 FROM member_profiles own WHERE own.userId = p.userId AND own.tenantId = 23) LIMIT 1");
let crossTenantUserId = null;
if (crossRows.length) {
  crossTenantUserId = Number(crossRows[0].userId);
  expectDenied(await request(`/admin/members/${crossTenantUserId}`, readAdmin.token), "跨商家会员详情", [404]);
}

const [auditRows] = await connection.query("SELECT id, action FROM admin_operation_logs WHERE action IN ('member.sensitive.view', 'member.points.adjust', 'member.password.reset', 'member.lifecycle.scan', 'export.members') ORDER BY id DESC LIMIT 20");
assert(auditRows.some((row) => row.action === "member.sensitive.view"), "缺少会员敏感查看审计");
assert(auditRows.some((row) => row.action === "member.points.adjust"), "缺少会员积分调整审计");
assert(auditRows.some((row) => row.action === "export.members"), "缺少会员导出审计");

await connection.end();

const result = {
  runId,
  tenantId: 23,
  retained: { userId, pointLogId: Number(pointLogRows[0].id), expiredPointLogId: Number(expiredRows[0].id), crossTenantUserId },
  privacy: { readPhone: readUser.phone, sensitivePhone: sensitiveList.items[0].user.phone, sensitiveOpenid: sensitiveList.items[0].user.openid, blockedPath },
  pointRace: { statuses: pointRace.map((item) => item.status), idempotent: pointRace.map((item) => item.data?.idempotent), beforePoints, afterPoints, logCount: pointLogRows.length },
  lifecycleRace: { statuses: lifecycleRace.map((item) => item.status), expiredProcessedAt: expiredRows[0].expiryProcessedAt },
  export: { status: exportResult.status, contentType: exportResult.contentType, exportedPhone },
  audits: auditRows.map((row) => ({ id: Number(row.id), action: row.action })),
  createdAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
