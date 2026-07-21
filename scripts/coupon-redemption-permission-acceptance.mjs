import fs from "node:fs";
import path from "node:path";
import { API_BASE, TENANT_CODE, api, assert, auth, demoUsers, loginPlatformAdmin, loginShowcaseAdmin, loginUser, userAuth } from "./online-showcase-lib.mjs";

const stamp = Date.now();
const runId = `coupon-redemption-permission-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function raw(pathname, token, method = "GET", body, extraHeaders = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...auth(token), ...extraHeaders, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, payload };
}

async function binary(pathname, token) {
  const response = await fetch(`${API_BASE}${pathname}`, { headers: auth(token) });
  const buffer = Buffer.from(await response.arrayBuffer());
  return { status: response.status, buffer, contentType: response.headers.get("content-type") || "" };
}

function expectDenied(result, label, statuses = [403]) {
  assert(statuses.includes(result.status), `${label} 应为 ${statuses.join("/")}，实际 ${result.status}`);
}

function assertMinimalTenant(value, label) {
  if (!value) return;
  assert(!Object.prototype.hasOwnProperty.call(value, "settings"), `${label} 泄露商家 settings`);
  assert(!Object.prototype.hasOwnProperty.call(value, "contactPhone"), `${label} 泄露联系电话`);
}

function assertMaskedPhone(value, label) {
  const phone = String(value || "");
  assert(!/^1\d{10}$/.test(phone) && phone.includes("****"), `${label} 未脱敏：${phone}`);
}

const readAdmin = await loginShowcaseAdmin("showcase_staff_read");
const manageAdmin = await loginShowcaseAdmin("showcase_staff_manager");
const exportAdmin = await loginShowcaseAdmin("showcase_staff_security");
const platformAdmin = await loginPlatformAdmin();
const user = await loginUser(demoUsers[0].phone, demoUsers[0].nickname);

const couponOptions = await api("/admin/coupons/options", { headers: auth(readAdmin.token) });
assert(couponOptions.activities?.length > 0, "优惠券只读账号未获得活动选项");
assert(couponOptions.activities.every((item) => Object.keys(item).every((key) => ["id", "title", "status", "tenant"].includes(key))), "优惠券活动选项字段过多");
const tenantId = Number(couponOptions.activities[0]?.tenant?.id || 0);
assert(tenantId > 0, "未识别当前验收商家");

const initialCoupons = await api("/admin/coupons", { headers: auth(readAdmin.token) });
assert(initialCoupons.every((item) => Number(item.tenant?.id || 0) === tenantId), "优惠券只读列表泄露其他商家或平台数据");
initialCoupons.slice(0, 20).forEach((item) => {
  assertMinimalTenant(item.tenant, "优惠券列表");
  if (item.activity) assert(Object.keys(item.activity).every((key) => ["id", "title", "status"].includes(key)), "优惠券活动关联字段过多");
});
expectDenied(await raw("/admin/coupons", readAdmin.token, "POST", { code: `DENIED${stamp}`, name: "只读拒绝", discountType: "fixed", discountValue: 1, minAmount: 0, claimMode: "claim", perUserLimit: 1, enabled: true }), "优惠券只读账号创建");
expectDenied(await raw("/admin/redemption-codes", readAdmin.token, "POST", { code: `RD${stamp}`, name: "只读拒绝", targetType: "points", points: 1, usageLimit: 1, perUserLimit: 1, enabled: true }), "兑换码只读账号创建");
expectDenied(await raw("/admin/coupons/export", readAdmin.token), "优惠券只读账号导出");
expectDenied(await raw("/admin/redemption-codes/export", readAdmin.token), "兑换码只读账号导出");

const couponCode = `CP${String(stamp).slice(-10)}`;
const couponPayload = {
  activityId: couponOptions.activities[0].id,
  code: couponCode,
  name: `优惠券权限验收-${runId}`,
  discountType: "fixed",
  discountValue: 6.66,
  minAmount: 10,
  usageLimit: 20,
  claimMode: "claim",
  perUserLimit: 2,
  enabled: true
};
const coupon = await api("/admin/coupons", { method: "POST", headers: auth(manageAdmin.token), body: JSON.stringify(couponPayload) });
assert(Number(coupon.tenant?.id || 0) === tenantId && coupon.code === couponCode, "新建活动优惠券归属错误");
const updatedCoupon = await api(`/admin/coupons/${coupon.id}`, { method: "PATCH", headers: auth(manageAdmin.token), body: JSON.stringify({ ...couponPayload, name: `${couponPayload.name}-已更新`, discountValue: 7.77 }) });
assert(updatedCoupon.name.endsWith("-已更新") && Number(updatedCoupon.discountValue) === 7.77, "活动优惠券更新未生效");

await api(`/public/coupons/${coupon.id}/claim?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(user.userAccessToken), body: JSON.stringify({}) });
const claimPage = await api(`/admin/coupon-claims?couponId=${coupon.id}&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
const retainedClaim = claimPage.items?.find((item) => item.coupon?.id === coupon.id && item.user?.id === user.user.id);
assert(retainedClaim, "优惠券领取记录未生成");
assertMaskedPhone(retainedClaim.user.phone, "优惠券领取记录手机号");
assert(Object.keys(retainedClaim.user).every((key) => ["id", "nickname", "phone"].includes(key)), "优惠券领取记录会员字段过多");
const usagePage = await api(`/admin/coupon-usages?couponId=${coupon.id}&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
assert(Array.isArray(usagePage.items), "优惠券使用记录接口未返回分页结构");

const redemptionOptions = await api("/admin/redemption-codes/options", { headers: auth(readAdmin.token) });
assert(redemptionOptions.activityCoupons.some((item) => item.id === coupon.id), "兑换码目标选项缺少新建活动优惠券");
assert(redemptionOptions.courses.every((item) => Object.keys(item).every((key) => ["id", "title", "status", "accessMode"].includes(key))), "兑换码课程选项字段过多");

const redemptionCode = `RC${String(stamp).slice(-10)}`;
const redemptionPayload = { code: redemptionCode, name: `兑换码权限验收-${runId}`, targetType: "points", points: 88, usageLimit: 2, perUserLimit: 1, enabled: true };
const redemption = await api("/admin/redemption-codes", { method: "POST", headers: auth(manageAdmin.token), body: JSON.stringify(redemptionPayload) });
assert(Number(redemption.tenant?.id || 0) === tenantId && redemption.code === redemptionCode, "新建统一兑换码归属错误");
await api(`/public/redemption-codes/redeem?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(user.userAccessToken), body: JSON.stringify({ code: redemptionCode }) });
const duplicateRedeem = await raw(`/public/redemption-codes/redeem?tenantCode=${TENANT_CODE}`, user.userAccessToken, "POST", { code: redemptionCode }, { "x-tenant-code": TENANT_CODE });
expectDenied(duplicateRedeem, "兑换码每人上限", [400]);
const redemptionUsagePage = await api(`/admin/redemption-code-usages?redemptionCodeId=${redemption.id}&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
const retainedRedemptionUsage = redemptionUsagePage.items?.find((item) => item.redemptionCode?.id === redemption.id && item.user?.id === user.user.id);
assert(retainedRedemptionUsage?.usedCount === 1, "统一兑换码使用记录不正确");
assertMaskedPhone(retainedRedemptionUsage.user.phone, "兑换记录手机号");
expectDenied(await raw(`/admin/redemption-codes/${redemption.id}`, manageAdmin.token, "PATCH", { ...redemptionPayload, targetType: "points", points: 99 }), "已使用兑换码修改权益", [400]);
const renamedRedemption = await api(`/admin/redemption-codes/${redemption.id}`, { method: "PATCH", headers: auth(manageAdmin.token), body: JSON.stringify({ ...redemptionPayload, name: `${redemptionPayload.name}-已更新` }) });
assert(renamedRedemption.name.endsWith("-已更新"), "已使用兑换码非权益字段更新失败");

const platformCoupon = await api("/admin/coupons", { method: "POST", headers: auth(platformAdmin.token), body: JSON.stringify({ code: `GLOBAL${String(stamp).slice(-8)}`, name: `平台优惠券边界-${runId}`, discountType: "fixed", discountValue: 1, minAmount: 0, claimMode: "code", perUserLimit: 1, enabled: true }) });
assert(platformCoupon.tenant === null, "平台边界优惠券不应归属商家");
expectDenied(await raw(`/admin/coupons/${platformCoupon.id}`, manageAdmin.token, "PATCH", { code: platformCoupon.code, name: "cross-tenant", discountType: "fixed", discountValue: 1, minAmount: 0, claimMode: "code", perUserLimit: 1, enabled: true }), "商家账号接管平台优惠券", [404]);
const platformRedemption = await api("/admin/redemption-codes", { method: "POST", headers: auth(platformAdmin.token), body: JSON.stringify({ code: `GR${String(stamp).slice(-10)}`, name: `平台兑换码边界-${runId}`, targetType: "points", points: 1, usageLimit: 1, perUserLimit: 1, enabled: true }) });
assert(platformRedemption.tenant === null, "平台边界兑换码不应归属商家");
expectDenied(await raw(`/admin/redemption-codes/${platformRedemption.id}`, manageAdmin.token, "PATCH", { code: platformRedemption.code, name: "cross-tenant", targetType: "points", points: 1, usageLimit: 1, perUserLimit: 1, enabled: true }), "商家账号接管平台兑换码", [404]);

const allActivities = await api("/admin/activities?page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const otherTenantActivity = allActivities.items?.find((item) => item.tenant?.id && Number(item.tenant.id) !== tenantId);
let otherTenantCoupon = null;
if (otherTenantActivity) {
  otherTenantCoupon = await api("/admin/coupons", { method: "POST", headers: auth(platformAdmin.token), body: JSON.stringify({ ...couponPayload, activityId: otherTenantActivity.id, name: `跨商家同码-${runId}` }) });
  assert(otherTenantCoupon.code === couponCode && Number(otherTenantCoupon.tenant?.id || 0) !== tenantId, "商家内唯一券码未允许其他商家使用同码");
  expectDenied(await raw(`/admin/coupons/${otherTenantCoupon.id}`, manageAdmin.token, "PATCH", { ...couponPayload, name: "cross-tenant" }), "优惠券跨商家 ID 更新", [404]);
  expectDenied(await raw(`/admin/coupons/${otherTenantCoupon.id}`, platformAdmin.token, "PATCH", { ...couponPayload, name: "platform-cross-tenant" }), "平台编辑已有优惠券时迁移商家归属", [400]);
  expectDenied(await raw("/admin/redemption-codes", manageAdmin.token, "POST", { code: `XT${String(stamp).slice(-10)}`, name: "跨商家目标", targetType: "activity_coupon", targetId: otherTenantCoupon.id, usageLimit: 1, perUserLimit: 1, enabled: true }), "兑换码跨商家目标", [400]);
}

expectDenied(await raw("/admin/coupons/export", manageAdmin.token), "优惠券维护账号越权导出");
expectDenied(await raw("/admin/redemption-codes/export", manageAdmin.token), "兑换码维护账号越权导出");
expectDenied(await raw("/admin/coupons", exportAdmin.token, "POST", couponPayload), "优惠券导出账号越权创建");
expectDenied(await raw("/admin/redemption-codes", exportAdmin.token, "POST", redemptionPayload), "兑换码导出账号越权创建");
const couponExport = await binary("/admin/coupons/export", exportAdmin.token);
const redemptionExport = await binary("/admin/redemption-codes/export", exportAdmin.token);
assert(couponExport.status === 200 && couponExport.buffer.length > 5000 && couponExport.contentType.includes("spreadsheetml"), "活动优惠券 XLSX 导出失败");
assert(redemptionExport.status === 200 && redemptionExport.buffer.length > 5000 && redemptionExport.contentType.includes("spreadsheetml"), "统一兑换码 XLSX 导出失败");
fs.writeFileSync(path.join(outputDir, "activity-coupons.xlsx"), couponExport.buffer);
fs.writeFileSync(path.join(outputDir, "redemption-codes.xlsx"), redemptionExport.buffer);

const auditIds = {};
const auditTargets = {
  "coupon.create": String(coupon.id),
  "coupon.update": String(coupon.id),
  "redemption_code.create": String(redemption.id),
  "redemption_code.update": String(redemption.id)
};
for (const action of ["coupon.create", "coupon.update", "redemption_code.create", "redemption_code.update", "export.activity_coupons", "export.redemption_codes"]) {
  const page = await api(`/admin/operation-logs?action=${encodeURIComponent(action)}&page=1&pageSize=100`, { headers: auth(platformAdmin.token) });
  const row = page.items?.find((item) => item.action === action && (action.startsWith("export.") || String(item.targetId || "") === auditTargets[action]));
  assert(row, `未找到 ${action} 审计`);
  auditIds[action] = row.id;
}

const result = {
  runId,
  tenantId,
  counts: { coupons: initialCoupons.length, activities: couponOptions.activities.length, activityCouponOptions: redemptionOptions.activityCoupons.length, mallCouponOptions: redemptionOptions.mallCoupons.length, courseOptions: redemptionOptions.courses.length, claims: claimPage.total, couponUsages: usagePage.total, redemptionUsages: redemptionUsagePage.total },
  retained: { couponId: coupon.id, couponClaimId: retainedClaim.id, redemptionCodeId: redemption.id, redemptionUsageId: retainedRedemptionUsage.id, platformCouponId: platformCoupon.id, platformRedemptionCodeId: platformRedemption.id, otherTenantCouponId: otherTenantCoupon?.id || null },
  exports: { couponBytes: couponExport.buffer.length, redemptionBytes: redemptionExport.buffer.length },
  otherTenantActivityChecked: Boolean(otherTenantActivity),
  auditIds,
  createdAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
