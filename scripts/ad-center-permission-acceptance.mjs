import fs from "node:fs";
import path from "node:path";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const stamp = Date.now();
const runId = `ad-center-permission-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function request(pathname, token, method = "GET", body) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...(token ? auth(token) : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const contentType = response.headers.get("content-type") || "";
  const raw = contentType.includes("application/json") ? await response.text() : "";
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { payload = raw; }
  return { status: response.status, payload, data: payload?.data, contentType };
}

function expectDenied(result, label, statuses = [403]) {
  assert(statuses.includes(result.status), `${label} 应为 ${statuses.join("/")}，实际 ${result.status}`);
}

function assertMinimalTenant(tenant, label) {
  const keys = Object.keys(tenant || {}).sort();
  assert(JSON.stringify(keys) === JSON.stringify(["code", "enabled", "id", "name"]), `${label} 字段不是最小投影：${keys.join(",")}`);
  for (const key of ["settings", "contactName", "contactPhone", "remark", "createdAt", "updatedAt"]) assert(!JSON.stringify(tenant).includes(`"${key}"`), `${label} 泄露 ${key}`);
}

const readAdmin = await loginShowcaseAdmin("showcase_staff_read");
const manageAdmin = await loginShowcaseAdmin("showcase_staff_manager");
const financeAdmin = await loginShowcaseAdmin("showcase_finance");
const platformAdmin = await loginPlatformAdmin();

const options = await api("/admin/ad-center/options", { headers: auth(readAdmin.token) });
const platformOptions = await api("/admin/ad-center/options", { headers: auth(platformAdmin.token) });
assert(options.tenants?.length === 1, "商家只读账号应只获得当前商家选项");
assert(options.memberLevels?.length > 0, "广告中心 options 未返回启用会员等级");
assert(Array.isArray(options.advertisers) && Array.isArray(options.contracts), "广告中心 options 未返回广告主/合同选项");
const optionTenant = options.tenants[0];
const optionTenantKeys = Object.keys(optionTenant).sort();
assert(JSON.stringify(optionTenantKeys) === JSON.stringify(["code", "defaultAdImageUrl", "enabled", "id", "name"]), `广告中心 options 商家字段异常：${optionTenantKeys.join(",")}`);
assert(!JSON.stringify(optionTenant).includes('"settings"'), "广告中心 options 泄露完整 settings");
const tenantId = Number(optionTenant.id);
const memberLevelId = Number(options.memberLevels[0].id);
const otherTenant = platformOptions.tenants.find((item) => Number(item.id) !== tenantId);

expectDenied(await request("/admin/ad-advertisers?pageSize=101", readAdmin.token), "非法广告中心分页", [400]);
expectDenied(await request("/admin/ad-campaigns?source=unknown", readAdmin.token), "非法广告来源筛选", [400]);
expectDenied(await request("/admin/ad-advertisers", readAdmin.token, "POST", { companyName: "无权创建" }), "只读账号创建广告主");
expectDenied(await request("/admin/ad-campaigns", financeAdmin.token, "POST", { name: "财务无权投放", title: "财务无权投放" }), "财务创建广告计划");
expectDenied(await request("/admin/ad-settlements/generate", manageAdmin.token, "POST", { contractId: 1, periodStart: "2026-07-01", periodEnd: "2026-07-31" }), "维护账号生成结算");
expectDenied(await request("/admin/ad-campaigns/export", readAdmin.token), "只读账号导出投放");

const advertiserBody = {
  companyName: `广告主-${runId}`,
  contactName: "广告验收联系人",
  contactPhone: "13912345678",
  wechat: `wechat_${String(stamp).slice(-8)}`,
  licenseUrl: "https://rd.chaimen666.com/uploads/showcase/ad-license.pdf",
  remark: `保留广告主敏感验收数据 ${runId}`,
  status: "active"
};
expectDenied(await request("/admin/ad-advertisers", manageAdmin.token, "POST", { ...advertiserBody, status: "unknown" }), "非法广告主状态", [400]);
expectDenied(await request("/admin/ad-advertisers", manageAdmin.token, "POST", { ...advertiserBody, licenseUrl: "http://unsafe.example/license.pdf" }), "非 HTTPS 广告主资质", [400]);
const advertiser = await api("/admin/ad-advertisers", { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify(advertiserBody) });
assert(advertiser.id && advertiser.contactPhone === advertiserBody.contactPhone && advertiser.licenseUrl === advertiserBody.licenseUrl, "敏感账号创建广告主响应不完整");
assertMinimalTenant(advertiser.tenant, "广告主创建响应商家");

const readAdvertisers = await api(`/admin/ad-advertisers?keyword=${encodeURIComponent(runId)}&page=1&pageSize=10`, { headers: auth(readAdmin.token) });
const readAdvertiser = readAdvertisers.items.find((item) => item.id === advertiser.id);
assert(readAdvertiser && readAdvertiser.contactPhone === "139****5678", "只读广告主手机号未服务端脱敏");
assert(readAdvertiser.wechat !== advertiserBody.wechat && readAdvertiser.licenseUrl === null && readAdvertiser.remark === null, "只读广告主敏感资料泄露");
assertMinimalTenant(readAdvertiser.tenant, "广告主列表商家");
const financeAdvertisers = await api(`/admin/ad-advertisers?keyword=${encodeURIComponent(runId)}&page=1&pageSize=10`, { headers: auth(financeAdmin.token) });
assert(financeAdvertisers.items[0]?.contactPhone === "139****5678", "财务账号不应获得完整广告主手机号");

const contractBody = {
  advertiserId: advertiser.id,
  contractNo: `ADC-${String(stamp).slice(-10)}`,
  title: `广告合同-${runId}`,
  billingModel: "mixed",
  amount: 1200,
  fixedFee: 100,
  cpmPrice: 8.5,
  cpcPrice: 1.2,
  startAt: "2026-07-01 00:00:00",
  endAt: "2026-12-31 23:59:59",
  paymentStatus: "partial",
  attachmentUrl: "https://rd.chaimen666.com/uploads/showcase/ad-contract.pdf",
  remark: `保留广告合同敏感验收数据 ${runId}`,
  status: "active"
};
expectDenied(await request("/admin/ad-contracts", manageAdmin.token, "POST", { ...contractBody, cpmPrice: -1 }), "负数广告合同单价", [400]);
const contract = await api("/admin/ad-contracts", { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify(contractBody) });
assert(contract.id && contract.attachmentUrl === contractBody.attachmentUrl, "广告合同创建响应不完整");
const readContracts = await api(`/admin/ad-contracts?keyword=${encodeURIComponent(runId)}&page=1&pageSize=10`, { headers: auth(readAdmin.token) });
const readContract = readContracts.items.find((item) => item.id === contract.id);
assert(readContract && readContract.attachmentUrl === null && readContract.remark === null, "只读广告合同敏感资料泄露");
assertMinimalTenant(readContract.tenant, "广告合同列表商家");

const campaignBody = {
  advertiserId: advertiser.id,
  contractId: contract.id,
  name: `首页广告-${runId}`,
  title: "慢π活动推荐",
  subtitle: "广告中心权限与资金闭环验收",
  imageUrl: "https://rd.chaimen666.com/uploads/showcase/ad-banner.jpg",
  imageUrls: ["https://rd.chaimen666.com/uploads/showcase/ad-banner.jpg"],
  source: "custom",
  format: "banner",
  slotKey: "home_top_banner",
  pageKey: "home",
  platforms: ["h5"],
  audience: { mode: "member_levels", memberLevelIds: [memberLevelId] },
  link: "/pages/index/index",
  billingModel: "mixed",
  fixedFee: 100,
  cpmPrice: 8.5,
  cpcPrice: 1.2,
  totalBudget: 1200,
  dailyBudget: 100,
  impressionLimit: 100000,
  clickLimit: 10000,
  frequency: "once_per_day",
  priority: 9000,
  enabled: true,
  startAt: null,
  endAt: null
};
expectDenied(await request("/admin/ad-campaigns", manageAdmin.token, "POST", { ...campaignBody, imageUrl: "http://unsafe.example/ad.jpg", imageUrls: ["http://unsafe.example/ad.jpg"] }), "非 HTTPS 广告图片", [400]);
expectDenied(await request("/admin/ad-campaigns", manageAdmin.token, "POST", { ...campaignBody, platforms: ["mp-weixin"], link: "https://example.com" }), "小程序普通外链", [400]);
expectDenied(await request("/admin/ad-campaigns", manageAdmin.token, "POST", { ...campaignBody, audience: { mode: "member_levels", memberLevelIds: [] } }), "空会员等级广告受众", [400]);
expectDenied(await request("/admin/ad-campaigns", manageAdmin.token, "POST", { ...campaignBody, source: "wechat_official", format: "official_banner", platforms: ["h5"], officialAdUnitId: "adunit-demo", officialAdType: "banner" }), "官方广告错误平台", [400]);
const campaign = await api("/admin/ad-campaigns", { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify(campaignBody) });
assert(campaign.id && campaign.audience?.memberLevelIds?.includes(memberLevelId), "广告计划创建响应错误");
assertMinimalTenant(campaign.tenant, "广告计划创建响应商家");
const campaignPage = await api(`/admin/ad-campaigns?keyword=${encodeURIComponent(runId)}&source=custom&enabled=true&page=1&pageSize=10`, { headers: auth(readAdmin.token) });
assert(campaignPage.items.some((item) => item.id === campaign.id) && campaignPage.total >= 1 && campaignPage.pageSize === 10, "广告计划筛选分页未命中");

const periodStart = "2026-07-01";
const periodEnd = `2026-07-${String(10 + Number(String(stamp).slice(-1))).padStart(2, "0")}`;
const settlementBody = { contractId: contract.id, periodStart, periodEnd, remark: `保留结算验收数据 ${runId}` };
const settlementRace = await Promise.all([
  request("/admin/ad-settlements/generate", financeAdmin.token, "POST", settlementBody),
  request("/admin/ad-settlements/generate", financeAdmin.token, "POST", settlementBody)
]);
assert(settlementRace.some((item) => item.status === 201) && settlementRace.some((item) => item.status === 400), `重复结算并发状态异常：${settlementRace.map((item) => item.status).join("/")}`);
const settlement = settlementRace.find((item) => item.status === 201)?.data;
assert(settlement?.id && settlement.items?.length, "结算单主单和明细未同时生成");
expectDenied(await request(`/admin/ad-settlements/${settlement.id}/confirm`, financeAdmin.token, "PATCH", { status: "paid" }), "结算跳级到已收款", [400]);
assert((await request(`/admin/ad-settlements/${settlement.id}/confirm`, financeAdmin.token, "PATCH", { status: "confirmed" })).status === 200, "结算确认失败");
assert((await request(`/admin/ad-settlements/${settlement.id}/confirm`, financeAdmin.token, "PATCH", { status: "invoiced" })).status === 200, "结算开票失败");
assert((await request(`/admin/ad-settlements/${settlement.id}/confirm`, financeAdmin.token, "PATCH", { status: "paid" })).status === 200, "结算收款失败");
assert((await request(`/admin/ad-settlements/${settlement.id}/confirm`, financeAdmin.token, "PATCH", { status: "paid" })).status === 200, "结算同状态幂等失败");
expectDenied(await request(`/admin/ad-settlements/${settlement.id}/confirm`, financeAdmin.token, "PATCH", { status: "voided" }), "已收款结算回退作废", [400]);

const importDate = `2026-08-${String(10 + Number(String(stamp).slice(-2)) % 18).padStart(2, "0")}`;
const revenueBody = { importDate, revenueAmount: 88.66, impressionCount: 12000, clickCount: 360, ecpm: 7.3883, fileUrl: "https://rd.chaimen666.com/uploads/showcase/ad-revenue.xlsx", remark: `保留官方收益验收数据 ${runId}` };
const revenueRace = await Promise.all([
  request("/admin/ad-official-revenue-imports", financeAdmin.token, "POST", revenueBody),
  request("/admin/ad-official-revenue-imports", financeAdmin.token, "POST", revenueBody)
]);
assert(revenueRace.some((item) => item.status === 201) && revenueRace.some((item) => item.status === 400), `重复官方收益并发状态异常：${revenueRace.map((item) => item.status).join("/")}`);
const revenue = revenueRace.find((item) => item.status === 201)?.data;

const campaignExport = await request(`/admin/ad-campaigns/export?keyword=${encodeURIComponent(runId)}`, financeAdmin.token);
const settlementExport = await request(`/admin/ad-settlements/export?contractId=${contract.id}`, financeAdmin.token);
assert(campaignExport.status === 200 && campaignExport.contentType.includes("spreadsheetml"), "投放服务端导出失败");
assert(settlementExport.status === 200 && settlementExport.contentType.includes("spreadsheetml"), "结算服务端导出失败");

let crossTenantAdvertiserId = null;
if (otherTenant) {
  const crossTenantAdvertiser = await api("/admin/ad-advertisers", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ ...advertiserBody, tenantId: otherTenant.id, companyName: `跨商家广告主-${runId}` }) });
  crossTenantAdvertiserId = crossTenantAdvertiser.id;
  expectDenied(await request(`/admin/ad-advertisers/${crossTenantAdvertiser.id}`, manageAdmin.token, "PATCH", { ...advertiserBody, companyName: "跨商家更新" }), "跨商家广告主更新", [404]);
  expectDenied(await request(`/admin/ad-advertisers/${crossTenantAdvertiser.id}`, manageAdmin.token, "DELETE"), "跨商家广告主删除", [404]);
}

const audits = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const audit = (action, targetId) => audits.items.find((item) => item.action === action && (targetId === undefined || Number(item.targetId) === Number(targetId)));
assert(audit("ad.advertiser.create", advertiser.id), "广告主创建审计缺失");
assert(audit("ad.contract.create", contract.id), "广告合同创建审计缺失");
assert(audit("ad.campaign.create", campaign.id), "广告计划创建审计缺失");
assert(audit("ad.settlement.generate", settlement.id), "广告结算生成审计缺失");
assert(audit("ad.official_revenue.import", revenue.id), "官方收益导入审计缺失");
assert(audit("export.ad_campaigns") && audit("export.ad_settlements"), "广告中心导出审计缺失");

const result = {
  runId,
  tenantId,
  retained: { advertiserId: advertiser.id, contractId: contract.id, campaignId: campaign.id, settlementId: settlement.id, settlementNo: settlement.settlementNo, revenueId: revenue.id, importDate, crossTenantAdvertiserId },
  privacy: { readPhone: readAdvertiser.contactPhone, readWechat: readAdvertiser.wechat, readLicense: readAdvertiser.licenseUrl, financePhone: financeAdvertisers.items[0]?.contactPhone },
  races: { settlementStatuses: settlementRace.map((item) => item.status), revenueStatuses: revenueRace.map((item) => item.status) },
  exports: { campaign: campaignExport.status, settlement: settlementExport.status },
  pagination: { advertisers: readAdvertisers.total, contracts: readContracts.total, campaigns: campaignPage.total },
  createdAt: new Date().toISOString()
};

fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
