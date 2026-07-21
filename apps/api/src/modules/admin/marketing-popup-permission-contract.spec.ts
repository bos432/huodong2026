import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("marketing popup permission, tenant, and event contract", () => {
  const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
  const controller = read("apps/api/src/modules/admin/admin.controller.ts");
  const service = read("apps/api/src/modules/admin/admin.service.ts");
  const publicController = read("apps/api/src/modules/public/public.controller.ts");
  const publicService = read("apps/api/src/modules/public/public.service.ts");
  const page = read("apps/admin/src/views/MarketingPopups.vue");
  const mobile = read("apps/mobile/src/components/MarketingPopup.vue");
  const router = read("apps/admin/src/router.ts");
  const menu = read("apps/admin/src/navigation/admin-menu.ts");

  it("separates read and write access across API and PC navigation", () => {
    expect(permissions).toContain('{ key: "marketing_popup.view"');
    expect(permissions).toContain('"marketing_popup.manage": ["marketing_popup.view"]');
    expect(router).toContain('path: "marketing-popups", component: MarketingPopups, meta: { roles: ["marketing_popup.view"]');
    expect(menu).toContain('label: "营销弹窗", roles: ["marketing_popup.view"]');
    expect(page).toContain('hasPermission("marketing_popup.manage")');
    expect(page).toContain('v-if="!canWrite"');
  });

  it("uses dedicated minimal options, SQL filtering, and pagination", () => {
    expect(controller).toContain('@Get("marketing-popups/options")');
    expect(controller).toContain('@Query() query: MarketingPopupQueryDto');
    expect(page).toContain('api.get<any, PopupOptions>("/admin/marketing-popups/options")');
    expect(page).not.toContain('"/admin/tenants"');
    expect(page).not.toContain('"/admin/member-levels"');
    expect(service).toContain('JSON_CONTAINS(popup.platforms');
    expect(service).toContain('JSON_CONTAINS(popup.placements');
    expect(service).toContain('items: rows.map((row) => this.publicMarketingPopupAdmin(row))');
    expect(service).toContain('pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100)');
  });

  it("validates assets and audience while serializing update/delete writes", () => {
    expect(service).toContain('弹窗图片只允许 HTTPS 或 /uploads/ 地址');
    expect(service).toContain('营销弹窗受众包含不存在、已停用或不属于当前商家的会员等级');
    expect(service).toContain('.setLock("pessimistic_write")');
    expect(service).toContain('marketingPopupAuditSnapshot');
    expect(service).toContain('contentHash: createHash("sha256")');
    expect(page).toContain('while (rows.length < 2) rows.push({ text: "", link: "", style: "primary" })');
  });

  it("binds public event counters to the resolved tenant, page, platform, and audience", () => {
    expect(publicController).toContain('dto.pageKey, dto.platform, this.tenantContext(req, tenantCode)');
    expect(publicService).toContain('builder.andWhere("popup.tenantId = :tenantId"');
    expect(publicService).toContain('this.marketingPopupMatches(row.platforms, platform)');
    expect(publicService).toContain('contentAudienceMatches(row.audience, context?.userId, memberLevelId)');
    expect(mobile).toContain('data: { event, pageKey: currentPageKey(), platform }');
  });

  it("binds list, options, effective checks, and writes to the current popup scope", () => {
    expect(page).toContain("let listLoadSequence = 0");
    expect(page).toContain("let optionLoadSequence = 0");
    expect(page).toContain("let checkLoadSequence = 0");
    expect(page).toContain("function popupScopeKey");
    expect(page).toContain("function capturePopupTarget");
    expect(page).toContain("function assertPopupTarget");
    expect(page).toContain("function effectiveCheckKey");
    expect(page).toContain("弹窗列表或筛选范围已变化，请刷新后重新操作");
    expect(page).toContain("rows.value = []");
    expect(page).toContain("pagination.total = 0");
    expect(page).toContain("checkResult.value = null");
    expect(page).toContain("if (sequence !== checkLoadSequence || checkKey !== effectiveCheckKey()) return");
    expect(page).toContain('const scopeLocked = computed(() => writeLocked.value || drawer.value || checkDialog.value)');
    expect(page).toContain("assertPopupTarget(target)");
  });
});
