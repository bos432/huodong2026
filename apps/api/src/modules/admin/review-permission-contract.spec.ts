import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("activity review permission and privacy contract", () => {
  const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
  const controller = read("apps/api/src/modules/v1/v1-admin.controller.ts");
  const service = read("apps/api/src/modules/v1/v1.service.ts");
  const page = read("apps/admin/src/views/Reviews.vue");
  const router = read("apps/admin/src/router.ts");
  const menu = read("apps/admin/src/navigation/admin-menu.ts");

  it("separates review view, manage, and sensitive permissions", () => {
    expect(permissions).toContain('{ key: "review.view"');
    expect(permissions).toContain('"review.manage": ["review.view"]');
    expect(permissions).toContain('"review.sensitive": ["review.view"]');
    expect(permissions).toContain('path === "reviews/options"');
    expect(router).toContain('path: "reviews", component: Reviews, meta: { roles: ["review.view"]');
    expect(menu).toContain('label: "评价管理", roles: ["review.view"]');
    expect(page).toContain('hasPermission("review.manage")');
    expect(page).toContain('hasPermission("review.sensitive")');
    expect(page).toContain('v-if="canManage" label="操作"');
  });

  it("uses dedicated options and independent paginated lists", () => {
    expect(controller).toContain('@Get("reviews/options")');
    expect(controller).toContain('@Query("page") page?: string');
    expect(page).toContain('api.get<any, { activities: any[] }>("/admin/reviews/options")');
    expect(page).toContain('v-model:current-page="reviewPage"');
    expect(page).toContain('v-model:current-page="reportPage"');
    expect(service).toContain('applyAdminActivityDataScope(builder, "review", admin?.dataScope)');
    expect(service).toContain('getManyAndCount()');
  });

  it("returns minimal masked projections without eager entities", () => {
    expect(service).toContain('this.publicAdminReview(row, includeSensitive)');
    expect(service).toContain('phone: includeSensitive ? row.user.phone : maskPhone(row.user.phone)');
    expect(service).toContain('registration: row.registration ? { id: row.registration.id, status: row.registration.status } : null');
    expect(service).toContain('handledBy: includeSensitive ? row.handledBy : null');
    expect(page).toContain('displayPhone(row)');
  });

  it("locks moderation, enforces report state, and writes audit logs", () => {
    expect(service).toContain('.setLock("pessimistic_write")');
    expect(service).toContain('if (report.status !== "pending") throw new BadRequestException("只有待处理举报可以处置")');
    expect(service).toContain('adminCanAccessActivity(admin?.dataScope, row.activity.id)');
    expect(service).toContain('logReviewOperation(admin, "review.moderate"');
    expect(service).toContain('logReviewOperation(admin, "review_report.handle"');
    expect(service).toContain('getRepository(AdminOperationLog)');
  });
});
