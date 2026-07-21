import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const service = read("apps/api/src/modules/admin/admin.service.ts");
const controller = read("apps/api/src/modules/admin/admin.controller.ts");
const categoriesPage = read("apps/admin/src/views/Categories.vue");
const ticketsPage = read("apps/admin/src/views/TicketTypes.vue");
const activitiesPage = read("apps/admin/src/views/Activities.vue");
const router = read("apps/admin/src/router.ts");
const menu = read("apps/admin/src/navigation/admin-menu.ts");
const frontendPermissions = read("apps/admin/src/permissions.ts");

describe("activity category and ticket permission contract", () => {
  it("exposes dedicated management options without unrelated module permissions", () => {
    expect(controller).toContain('@Get("activities/options")');
    expect(controller).toContain('@Get("ticket-types/options")');
    expect(activitiesPage).toContain('"/admin/activities/options"');
    expect(activitiesPage).not.toContain('api.get<any, any[]>("/admin/agents")');
    expect(activitiesPage).not.toContain('api.get<any, any[]>("/admin/member-levels")');
    expect(ticketsPage).toContain('"/admin/ticket-types/options"');
    expect(ticketsPage).not.toContain('api.get<any, any>("/admin/activities"');
  });

  it("keeps read-only category and ticket pages free of write controls", () => {
    expect(categoriesPage).toContain('hasPermission("category.manage")');
    expect(categoriesPage).toContain('v-if="canManage" type="primary"');
    expect(categoriesPage).toContain('v-if="canManage" label="操作"');
    expect(ticketsPage).toContain('hasPermission("ticket.manage")');
    expect(ticketsPage).toContain('v-if="canManage" type="primary"');
    expect(ticketsPage).toContain('v-if="canManage" label="操作"');
    expect(router).toContain('path: "categories", component: Categories, meta: { roles: ["category.view"]');
    expect(router).toContain('path: "ticket-types", component: TicketTypes, meta: { roles: ["ticket.view"]');
    expect(menu).toContain('label: "分类管理", roles: ["category.view"]');
    expect(menu).toContain('label: "票种管理", roles: ["ticket.view"]');
    expect(frontendPermissions).toContain('{ key: "category.view", label: "查看活动分类" }');
    expect(frontendPermissions).toContain('{ key: "ticket.view", label: "查看票种" }');
  });

  it("projects minimal relations and rejects cross-tenant activity metadata", () => {
    expect(service).toContain('return rows.map((row) => this.publicCategory(row))');
    expect(service).toContain('return rows.map((row) => this.publicTicketType(row))');
    expect(service).toContain('activity: row.activity ? { id: row.activity.id, title: row.activity.title, status: row.activity.status } : null');
    expect(service).toContain('if (category?.tenant?.id && category.tenant.id !== tenant?.id)');
    expect(service).toContain('if (agent?.tenant?.id && agent.tenant.id !== tenant?.id)');
    expect(service).toContain('category?.tenant?.id !== admin?.tenantId');
    expect(service).toContain('"category.create"');
    expect(service).toContain('"ticket_type.create"');
  });
});
