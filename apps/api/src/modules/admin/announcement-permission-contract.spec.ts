import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("announcement center permission and tenant contract", () => {
  const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
  const controller = read("apps/api/src/modules/admin/admin.controller.ts");
  const legacyController = read("apps/api/src/modules/v1/v1-admin.controller.ts");
  const service = read("apps/api/src/modules/admin/admin.service.ts");
  const page = read("apps/admin/src/views/Announcements.vue");
  const router = read("apps/admin/src/router.ts");
  const menu = read("apps/admin/src/navigation/admin-menu.ts");

  it("separates read and write access across API and PC navigation", () => {
    expect(permissions).toContain('{ key: "announcement.view"');
    expect(permissions).toContain('"announcement.manage": ["announcement.view"]');
    expect(router).toContain('path: "announcements", component: Announcements, meta: { roles: ["announcement.view"]');
    expect(menu).toContain('label: "公告管理", roles: ["announcement.view"]');
    expect(page).toContain('hasPermission("announcement.manage")');
    expect(page).toContain('v-if="!canWrite"');
    expect(legacyController).not.toContain('@Get("announcements")');
    expect(legacyController).not.toContain('@Post("announcements")');
  });

  it("uses dedicated minimal options and paginated projections", () => {
    expect(controller).toContain('@Get("announcements/options")');
    expect(controller).toContain('@Query() query: AnnouncementQueryDto');
    expect(page).toContain('api.get<any, AnnouncementOptions>("/admin/announcements/options")');
    expect(page).not.toContain('"/admin/tenants"');
    expect(page).not.toContain('"/admin/member-levels"');
    expect(service).toContain('"tenant.id", "tenant.code", "tenant.name", "tenant.enabled"');
    expect(service).toContain('items: rows.map((row) => this.publicAnnouncement(row))');
    expect(service).toContain('pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100)');
  });

  it("validates audience and serializes update/delete writes", () => {
    expect(service).toContain('指定会员等级受众时至少选择一个启用等级');
    expect(service).toContain('公告受众包含不存在、已停用或不属于当前商家的会员等级');
    expect(service).toContain('.setLock("pessimistic_write")');
    expect(service).toContain('announcementAuditSnapshot');
    expect(service).toContain('contentHash: createHash("sha256")');
  });

  it("binds list, options, and writes to the current announcement scope", () => {
    expect(page).toContain("let listLoadSequence = 0");
    expect(page).toContain("let optionLoadSequence = 0");
    expect(page).toContain("function announcementScopeKey");
    expect(page).toContain("function captureAnnouncementTarget");
    expect(page).toContain("function assertAnnouncementTarget");
    expect(page).toContain("公告列表或筛选范围已变化，请刷新后重新操作");
    expect(page).toContain("rows.value = []");
    expect(page).toContain("pagination.total = 0");
    expect(page).toContain("if (sequence !== listLoadSequence || scopeKey !== announcementScopeKey()) return");
    expect(page).toContain('const scopeLocked = computed(() => writeLocked.value || drawer.value)');
    expect(page).toContain(':disabled="scopeLocked" @change="applyFilters"');
    expect(page).toContain("assertAnnouncementTarget(target)");
  });
});
