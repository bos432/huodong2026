import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("ad center permission, privacy, and finance contract", () => {
  const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
  const controller = read("apps/api/src/modules/admin/admin.controller.ts");
  const service = read("apps/api/src/modules/admin/admin.service.ts");
  const page = read("apps/admin/src/views/AdCenter.vue");
  const router = read("apps/admin/src/router.ts");
  const menu = read("apps/admin/src/navigation/admin-menu.ts");

  it("separates view, maintenance, finance, sensitive, and export access", () => {
    for (const permission of ["ad_center.view", "ad_center.manage", "ad_center.finance", "ad_center.sensitive", "ad_center.export"]) expect(permissions).toContain(`{ key: "${permission}"`);
    expect(router).toContain('path: "ad-center", component: AdCenter, meta: { roles: ["ad_center.view"]');
    expect(menu).toContain('label: "广告中心", roles: ["ad_center.view"]');
    expect(page).toContain('hasPermission("ad_center.manage")');
    expect(page).toContain('hasPermission("ad_center.finance")');
    expect(page).toContain('hasPermission("ad_center.sensitive")');
    expect(page).toContain('canSensitive ? (row.contactPhone || "-") : maskPhone(row.contactPhone)');
    expect(page).toContain('size="min(760px, 100vw)"');
    expect(page).toContain('size="min(520px, 100vw)"');
    expect(page).toContain('hasPermission("ad_center.export")');
  });

  it("uses dedicated options, DTO queries, paginated white-list projections, and server exports", () => {
    expect(controller).toContain('@Get("ad-center/options")');
    expect(controller).toContain('@Query() query: AdCenterQueryDto');
    expect(controller).toContain('@Get("ad-campaigns/export")');
    expect(controller).toContain('@Get("ad-settlements/export")');
    expect(page).toContain('api.get<any, AdCenterOptions>("/admin/ad-center/options")');
    expect(page).not.toContain('"/admin/tenants"');
    expect(page).not.toContain('"/admin/member-levels"');
    expect(page).not.toContain("exportCampaignCsv");
    expect(page).not.toContain("exportSettlementCsv");
    expect(service).toContain("this.publicAdAdvertiser(row, includeSensitive)");
    expect(service).toContain("this.publicAdContract(row, includeSensitive)");
    expect(service).toContain("this.publicAdCampaign(row)");
    expect(service).toContain("this.publicAdSettlement(row, grouped.get(row.id) || [])");
    expect(service).toContain("pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100)");
    expect(service).toContain('this.logExport(admin, "ad_campaigns"');
    expect(service).toContain('this.logExport(admin, "ad_settlements"');
  });

  it("masks sensitive fields and serializes updates, settlement transitions, and duplicate imports", () => {
    expect(service).toContain("contactPhone: includeSensitive ? row.contactPhone : maskPhone(row.contactPhone)");
    expect(service).toContain("wechat: includeSensitive ? row.wechat : maskContactHandle(row.wechat)");
    expect(service).toContain("licenseUrl: includeSensitive ? row.licenseUrl : null");
    expect(service).toContain("attachmentUrl: includeSensitive ? row.attachmentUrl : null");
    expect(service).toContain('.setLock("pessimistic_write")');
    expect(service).toContain('pending: ["confirmed", "voided"]');
    expect(service).toContain('confirmed: ["invoiced", "voided"]');
    expect(service).toContain('invoiced: ["paid", "voided"]');
    expect(service).toContain("已存在结算单");
    expect(service).toContain("SELECT GET_LOCK(?, 5) AS acquired");
    expect(service).toContain('existingBuilder.setLock("pessimistic_write")');
    expect(service).toContain("的官方收益已经导入");
  });

  it("validates official ads, links, assets, and member-level audiences on the server", () => {
    expect(service).toContain("自有广告不能使用微信官方广告形式");
    expect(service).toContain("小程序投放仅支持站内页面路径");
    expect(service).toContain("微信官方流量主仅支持微信小程序平台");
    expect(service).toContain("微信官方流量主必须填写广告位 ID");
    expect(service).toContain("广告受众包含不存在、已停用或不属于当前商家的会员等级");
    expect(service).toContain("广告图必须使用 HTTPS 或 /uploads/ 地址");
  });

  it("binds ad center sections and writes to the current tenant scope", () => {
    for (const sequence of ["metadataLoadSequence", "advertiserLoadSequence", "contractLoadSequence", "campaignLoadSequence", "settlementLoadSequence", "summaryLoadSequence", "allLoadSequence"]) {
      expect(page).toContain(`let ${sequence} = 0`);
    }
    expect(page).toContain("function adScopeKey");
    expect(page).toContain("function captureAdTarget");
    expect(page).toContain("function assertAdTarget");
    expect(page).toContain("广告中心列表或筛选范围已变化，请刷新后重新操作");
    expect(page).toContain("Promise.allSettled([loadAdvertisers(), loadContracts(), loadCampaigns(), loadSettlements(), loadSummary()])");
    expect(page).toContain("advertisers.value = []");
    expect(page).toContain("contracts.value = []");
    expect(page).toContain("campaigns.value = []");
    expect(page).toContain("settlements.value = []");
    expect(page).toContain("summary.value = { totals: {} }");
    expect(page).toContain('const scopeLocked = computed(() => writeLocked.value || advertiserDrawer.value || contractDrawer.value || campaignDrawer.value)');
    expect(page).toContain(':before-leave="guardTabChange"');
    expect(page).toContain("assertAdTarget(target)");
    expect(page).toContain('"确认结算状态"');
    expect(page).toContain('actionKey.value = "export:campaigns"');
    expect(page).toContain('actionKey.value = "export:settlements"');
  });
});
