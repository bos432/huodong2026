import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("waitlist permission and privacy contract", () => {
  const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
  const controller = read("apps/api/src/modules/admin/admin.controller.ts");
  const service = read("apps/api/src/modules/admin/admin.service.ts");
  const page = read("apps/admin/src/views/Waitlists.vue");
  const router = read("apps/admin/src/router.ts");
  const menu = read("apps/admin/src/navigation/admin-menu.ts");

  it("separates view, manage, and sensitive permissions", () => {
    expect(permissions).toContain('{ key: "waitlist.view"');
    expect(permissions).toContain('"waitlist.manage": ["waitlist.view"]');
    expect(permissions).toContain('"waitlist.sensitive": ["waitlist.view"]');
    expect(permissions).toContain('path === "waitlists/options"');
    expect(router).toContain('path: "waitlists", component: Waitlists, meta: { roles: ["waitlist.view"]');
    expect(menu).toContain('label: "候补管理", roles: ["waitlist.view"]');
    expect(page).toContain('hasPermission("waitlist.manage")');
    expect(page).toContain('hasPermission("waitlist.sensitive")');
    expect(page).toContain('v-if="canManage" label="操作"');
  });

  it("uses dedicated options, pagination, and activity data scope", () => {
    expect(controller).toContain('@Get("waitlists/options")');
    expect(controller).toContain('@Query() query: WaitlistQueryDto');
    expect(page).toContain('api.get<any, { activities: any[] }>("/admin/waitlists/options")');
    expect(page).not.toContain('"/admin/activities"');
    expect(page).toContain('v-model:current-page="query.page"');
    expect(service).toContain('applyAdminActivityDataScope(builder, "activity", admin?.dataScope)');
    expect(service).toContain('getManyAndCount()');
  });

  it("returns a minimal projection and masks sensitive answers", () => {
    expect(service).toContain('this.publicWaitlist(row, includeSensitive)');
    expect(service).toContain('phone: includeSensitive ? row.user.phone : maskPhone(row.user.phone)');
    expect(service).toContain('maskWaitlistAnswers(row.answers)');
    expect(service).toContain('promotedRegistration: row.promotedRegistration ? { id: row.promotedRegistration.id, status: row.promotedRegistration.status } : null');
    expect(page).toContain('maskPhone(row.user?.phone)');
  });

  it("serializes cancel operations with a database row lock", () => {
    expect(controller).toContain('@Body() body: WaitlistCancelDto');
    expect(service).toContain('async cancelWaitlist(id: number, remark?: string, admin?: AdminContext)');
    expect(service).toContain('.setLock("pessimistic_write")');
    expect(service).toContain('if (!reason) throw new BadRequestException("请填写取消原因")');
    expect(service).toContain('return this.publicWaitlist(saved, Boolean(admin?.permissions?.includes("waitlist.sensitive")))');
  });
});
