import fs from "node:fs";
import path from "node:path";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const stamp = Date.now();
const runId = `tag-permission-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function request(pathname, token, method = "GET", body) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...(token ? auth(token) : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, payload, data: payload?.data };
}

function expectDenied(result, label, statuses = [403]) {
  assert(statuses.includes(result.status), `${label} 应为 ${statuses.join("/")}，实际 ${result.status}`);
}

function assertMaskedPhone(value, label) {
  const phone = String(value || "");
  assert(phone.includes("****") && !/^1\d{10}$/.test(phone), `${label} 未脱敏：${phone}`);
}

function assertMinimal(value, label) {
  const text = JSON.stringify(value);
  for (const key of ["passwordHash", "openid", "unionid", "wechatAppId", "lastLoginChannel", "settings", "answers", "formSnapshot", "checkInCode", "sessionVersion"]) {
    assert(!text.includes(`\"${key}\"`), `${label} 泄露内部字段 ${key}`);
  }
}

const readAdmin = await loginShowcaseAdmin("showcase_staff_read");
const manageAdmin = await loginShowcaseAdmin("showcase_staff_manager");
const sensitiveAdmin = await loginShowcaseAdmin("showcase_staff_security");
const platformAdmin = await loginPlatformAdmin();

const options = await api("/admin/tags/options", { headers: auth(readAdmin.token) });
assert(options.activities?.length > 0, "标签只读账号未获得活动选项");
assert(options.levels?.length > 0, "标签只读账号未获得会员等级选项");
const tenantId = Number(options.activities[0]?.tenant?.id || 0);
assert(tenantId > 0, "未识别标签验收商家");
assertMinimal(options, "标签 options");

expectDenied(await request("/admin/tags?pageSize=101", readAdmin.token), "标签非法分页", [400]);
expectDenied(await request("/admin/member-segments/preview", readAdmin.token, "POST", { rules: {}, page: 1, pageSize: 101 }), "分群预览非法分页", [400]);

const sensitivePreview = await api("/admin/member-segments/preview", { method: "POST", headers: { ...auth(sensitiveAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ rules: {}, page: 1, pageSize: 100 }) });
const targetProfile = sensitivePreview.items?.find((item) => /^1\d{10}$/.test(String(item.user?.phone || "")));
assert(targetProfile, "没有可用于标签权限验收的完整手机号会员");
const secondProfile = sensitivePreview.items?.find((item) => item.user?.id !== targetProfile.user.id);
assert(secondProfile, "没有第二个可用于跨作用域通知验收的会员");
assert(targetProfile.sensitiveMasked === false, "敏感分群预览标记错误");
assertMinimal(targetProfile, "敏感分群预览");

const readPreview = await api("/admin/member-segments/preview", { method: "POST", headers: { ...auth(readAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ rules: {}, page: 1, pageSize: 100 }) });
const readTargetProfile = readPreview.items.find((item) => item.user?.id === targetProfile.user.id);
assert(readTargetProfile?.sensitiveMasked === true, "只读分群预览敏感标记错误");
assertMaskedPhone(readTargetProfile.user.phone, "只读分群预览手机号");

const tagName = `权限验收标签-${runId}`;
const tagBody = { userId: targetProfile.user.id, name: tagName, color: "success", remark: `并发幂等验收-${runId}` };
expectDenied(await request("/admin/tags", readAdmin.token, "POST", tagBody), "标签只读账号新增");
expectDenied(await request("/admin/tags", sensitiveAdmin.token, "POST", tagBody), "标签敏感账号新增");
expectDenied(await request("/admin/tags/refresh-behavior", readAdmin.token, "POST", { idempotencyKey: `behavior-read-${runId}` }), "标签只读账号刷新行为标签");
expectDenied(await request("/admin/tags", manageAdmin.token, "POST", { ...tagBody, name: "x".repeat(41) }), "超长标签名", [400]);
expectDenied(await request("/admin/tags", manageAdmin.token, "POST", { ...tagBody, color: "purple" }), "非法标签颜色", [400]);

const tagRace = await Promise.all([
  request("/admin/tags", manageAdmin.token, "POST", tagBody),
  request("/admin/tags", manageAdmin.token, "POST", tagBody)
]);
assert(tagRace.every((item) => item.status === 201), `并发标签新增状态错误：${tagRace.map((item) => item.status).join("/")}`);
const tagRaceRows = tagRace.map((item) => item.data);
assert(tagRaceRows.filter((item) => item?.idempotent === false).length === 1, "并发标签新增应仅一次实际创建");
assert(tagRaceRows.filter((item) => item?.idempotent === true).length === 1, "并发标签新增应返回一次幂等命中");
const retainedTag = tagRaceRows[0];

const readTags = await api(`/admin/tags?userId=${targetProfile.user.id}&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
const readTag = readTags.items.find((item) => item.name === tagName);
assert(readTag?.sensitiveMasked === true, "只读标签敏感标记错误");
assertMaskedPhone(readTag.user.phone, "只读标签手机号");
assertMinimal(readTag, "只读标签响应");

const sensitiveTags = await api(`/admin/tags?userId=${targetProfile.user.id}&page=1&pageSize=20`, { headers: auth(sensitiveAdmin.token) });
const sensitiveTag = sensitiveTags.items.find((item) => item.name === tagName);
assert(sensitiveTag?.user?.phone === targetProfile.user.phone && sensitiveTag.sensitiveMasked === false, "敏感标签账号未获得完整手机号");

const deleteName = `删除审计标签-${runId}`;
const deleteTag = await api("/admin/tags", { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ userId: targetProfile.user.id, name: deleteName, color: "warning", remark: runId }) });
await api(`/admin/tags/${deleteTag.id}/delete`, { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: "{}" });

const segmentName = `权限验收分群-${runId}`;
const segmentBody = { name: segmentName, description: `按专项标签固化-${runId}`, enabled: true, rules: { anyTags: [tagName] } };
expectDenied(await request("/admin/member-segments", readAdmin.token, "POST", segmentBody), "分群只读账号新增");
expectDenied(await request("/admin/member-segments", sensitiveAdmin.token, "POST", segmentBody), "分群敏感账号新增");
expectDenied(await request("/admin/member-segments", manageAdmin.token, "POST", { ...segmentBody, name: "x".repeat(101) }), "超长分群名", [400]);
const segment = await api("/admin/member-segments", { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify(segmentBody) });

const raceSegmentBody = { name: `并发同名分群-${runId}`, description: runId, enabled: true, rules: {} };
const segmentRace = await Promise.all([
  request("/admin/member-segments", manageAdmin.token, "POST", raceSegmentBody),
  request("/admin/member-segments", manageAdmin.token, "POST", raceSegmentBody)
]);
assert(segmentRace.map((item) => item.status).sort().join("/") === "201/400", `同名分群并发状态错误：${segmentRace.map((item) => item.status).join("/")}`);
assert(!segmentRace.some((item) => item.status >= 500), "同名分群并发不应返回 500");

const platformOptions = await api("/admin/tags/options", { headers: auth(platformAdmin.token) });
assert(platformOptions.levels?.length > 0 && platformOptions.levels.every((item) => item.tenantScopeKey === "platform"), "平台标签选项混入商家等级");
expectDenied(await request("/admin/member-segments", manageAdmin.token, "POST", { name: `跨作用域等级-${runId}`, enabled: true, rules: { levelIds: [platformOptions.levels[0].id] } }), "商家分群引用平台等级", [400]);

const matchedPreview = await api("/admin/member-segments/preview", { method: "POST", headers: { ...auth(readAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ rules: segmentBody.rules, page: 1, pageSize: 20 }) });
assert(matchedPreview.items.some((item) => item.user?.id === targetProfile.user.id), "专项标签分群未匹配目标会员");
assertMaskedPhone(matchedPreview.items.find((item) => item.user?.id === targetProfile.user.id).user.phone, "分群匹配手机号");

expectDenied(await request(`/admin/member-segments/${segment.id}/snapshots`, readAdmin.token, "POST", {}), "分群只读账号创建快照");
expectDenied(await request(`/admin/member-segments/${segment.id}/snapshots`, sensitiveAdmin.token, "POST", {}), "分群敏感账号创建快照");
const snapshotKey = `snapshot-${runId}`;
const snapshotRace = await Promise.all([
  request(`/admin/member-segments/${segment.id}/snapshots`, manageAdmin.token, "POST", { idempotencyKey: snapshotKey }),
  request(`/admin/member-segments/${segment.id}/snapshots`, manageAdmin.token, "POST", { idempotencyKey: snapshotKey })
]);
assert(snapshotRace.every((item) => item.status === 201), `快照并发状态错误：${snapshotRace.map((item) => item.status).join("/")}`);
assert(new Set(snapshotRace.map((item) => item.data.id)).size === 1, "同业务键快照并发生成了多个快照");
assert(snapshotRace.filter((item) => item.data.idempotent === false).length === 1 && snapshotRace.filter((item) => item.data.idempotent === true).length === 1, "快照并发幂等标记错误");
const snapshot = snapshotRace[0].data;

const behaviorKey = `behavior-${runId}`;
const behaviorRace = await Promise.all([
  request("/admin/tags/refresh-behavior", manageAdmin.token, "POST", { idempotencyKey: behaviorKey }),
  request("/admin/tags/refresh-behavior", manageAdmin.token, "POST", { idempotencyKey: behaviorKey })
]);
assert(behaviorRace.every((item) => item.status === 201), `行为标签并发状态错误：${behaviorRace.map((item) => item.status).join("/")}`);
assert(new Set(behaviorRace.map((item) => item.data.id)).size === 1, "同幂等键行为刷新生成了多个运行批次");
assert(behaviorRace.filter((item) => item.data.idempotent === false).length === 1 && behaviorRace.filter((item) => item.data.idempotent === true).length === 1, "行为刷新并发幂等标记错误");
const behaviorRun = behaviorRace[0].data;
const behaviorRuns = await api("/admin/tags/behavior-runs?page=1&pageSize=20", { headers: auth(readAdmin.token) });
assert(behaviorRuns.items.some((item) => item.id === behaviorRun.id), "只读账号未能查看行为标签运行记录");

const readSnapshots = await api(`/admin/member-segments/${segment.id}/snapshots`, { headers: auth(readAdmin.token) });
const readSnapshot = readSnapshots.find((item) => item.id === snapshot.id);
assert(readSnapshot?.createdBy === null && readSnapshot.sensitiveMasked === true, "只读快照创建人未隐藏");
const readMembers = await api(`/admin/member-segment-snapshots/${snapshot.id}/members?page=1&pageSize=20`, { headers: auth(readAdmin.token) });
const readSnapshotMember = readMembers.items.find((item) => item.user?.id === targetProfile.user.id);
assertMaskedPhone(readSnapshotMember.user.phone, "只读快照成员手机号");
assertMinimal(readMembers, "只读快照成员响应");

const sensitiveMembers = await api(`/admin/member-segment-snapshots/${snapshot.id}/members?page=1&pageSize=20`, { headers: auth(sensitiveAdmin.token) });
const sensitiveSnapshotMember = sensitiveMembers.items.find((item) => item.user?.id === targetProfile.user.id);
assert(sensitiveSnapshotMember?.user?.phone === targetProfile.user.phone, "敏感快照成员未显示完整手机号");
assert(sensitiveMembers.snapshot?.createdBy === "showcase_staff_manager", "敏感快照未显示创建人");

const platformTag = await api("/admin/tags", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ userId: targetProfile.user.id, name: `平台边界标签-${runId}`, color: "info", remark: runId }) });
expectDenied(await request(`/admin/tags/${platformTag.id}/delete`, manageAdmin.token, "POST", {}), "商家删除平台标签", [404]);
const platformSegment = await api("/admin/member-segments", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ name: `平台边界分群-${runId}`, description: runId, enabled: true, rules: {} }) });
expectDenied(await request(`/admin/member-segments/${platformSegment.id}/snapshots`, readAdmin.token), "商家读取平台分群快照", [404]);

const sharedTagName = `同名通知隔离-${runId}`;
await api("/admin/tags", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ userId: targetProfile.user.id, name: sharedTagName, color: "info", remark: "platform-notification-scope" }) });
await api("/admin/tags", { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ userId: secondProfile.user.id, name: sharedTagName, color: "success", remark: "tenant-notification-scope" }) });
const platformNotification = await api("/admin/notifications/send-by-tag", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ tagName: sharedTagName, channel: "site", title: `平台范围通知-${runId}`, content: "平台标签通知隔离验收" }) });
assert(platformNotification.matchedCount === 1 && platformNotification.records[0]?.user?.id === targetProfile.user.id, "平台同名标签通知混入商家会员");
const tenantActivity = options.activities.find((item) => Number(item.tenant?.id) === tenantId);
assert(tenantActivity, "没有可用于商家标签通知归属的活动");
const tenantNotification = await api("/admin/notifications/send-by-tag", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ activityId: tenantActivity.id, tagName: sharedTagName, channel: "site", title: `商家范围通知-${runId}`, content: "商家标签通知隔离验收" }) });
assert(tenantNotification.matchedCount === 1 && tenantNotification.records[0]?.user?.id === secondProfile.user.id, "商家同名标签通知混入平台会员");

const auditPage = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const createAudit = auditPage.items.find((item) => item.action === "user_tag.create" && Number(item.targetId) === Number(retainedTag.id));
const deleteAudit = auditPage.items.find((item) => item.action === "user_tag.delete" && Number(item.targetId) === Number(deleteTag.id));
const segmentAudit = auditPage.items.find((item) => item.action === "member_segment.create" && Number(item.targetId) === Number(segment.id));
const snapshotAudit = auditPage.items.find((item) => item.action === "member_segment.snapshot" && Number(item.targetId) === Number(snapshot.id));
assert(createAudit && deleteAudit && segmentAudit && snapshotAudit, "标签与分群操作审计不完整");

const result = {
  runId,
  tenantId,
  counts: { activities: options.activities.length, levels: options.levels.length, previewMembers: sensitivePreview.total, tagRows: readTags.total, snapshotMembers: readMembers.total },
  retained: { userId: targetProfile.user.id, tagId: retainedTag.id, segmentId: segment.id, snapshotId: snapshot.id, behaviorRunId: behaviorRun.id, platformTagId: platformTag.id, platformSegmentId: platformSegment.id },
  tagRace: tagRaceRows.map((item) => ({ id: item.id, idempotent: item.idempotent })),
  segmentRace: segmentRace.map((item) => item.status),
  snapshotRace: snapshotRace.map((item) => ({ status: item.status, id: item.data.id, idempotent: item.data.idempotent })),
  behaviorRace: behaviorRace.map((item) => ({ status: item.status, id: item.data.id, idempotent: item.data.idempotent })),
  notificationIsolation: { platformMatched: platformNotification.matchedCount, tenantMatched: tenantNotification.matchedCount },
  auditIds: { create: createAudit.id, delete: deleteAudit.id, segment: segmentAudit.id, snapshot: snapshotAudit.id },
  createdAt: new Date().toISOString()
};

fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
