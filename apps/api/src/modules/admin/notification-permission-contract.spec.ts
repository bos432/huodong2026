import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("notification center permission and privacy contract", () => {
  const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
  const controller = read("apps/api/src/modules/v1/v1-admin.controller.ts");
  const service = read("apps/api/src/modules/v1/v1.service.ts");
  const page = read("apps/admin/src/views/Notifications.vue");
  const router = read("apps/admin/src/router.ts");
  const menu = read("apps/admin/src/navigation/admin-menu.ts");

  it("separates view, template, send, preference, and sensitive permissions", () => {
    expect(permissions).toContain('{ key: "notification.view"');
    expect(permissions).toContain('"notification.template.manage": ["notification.view"]');
    expect(permissions).toContain('"notification.send": ["notification.view"]');
    expect(permissions).toContain('"notification.preference.manage": ["notification.view"]');
    expect(permissions).toContain('"notification.sensitive": ["notification.view"]');
    expect(permissions).toContain('"notification.manage": ["notification.view", "notification.template.manage", "notification.send", "notification.preference.manage"]');
    expect(router).toContain('path: "notifications", component: Notifications, meta: { roles: ["notification.view"]');
    expect(menu).toContain('label: "通知中心", roles: ["notification.view"]');
    expect(page).toContain('hasPermission("notification.template.manage")');
    expect(page).toContain('hasPermission("notification.send")');
    expect(page).toContain('hasPermission("notification.preference.manage")');
    expect(page).toContain('hasPermission("notification.sensitive")');
  });

  it("uses dedicated options, pagination, and activity/member data scope", () => {
    expect(controller).toContain('@Get("notifications/options")');
    expect(controller).toContain('@Query("page") page?: string');
    expect(page).toContain('api.get<any, { activities: any[]; tags: any[] }>("/admin/notifications/options")');
    expect(page).not.toContain('"/admin/activities"');
    expect(page).not.toContain('"/admin/tags"');
    expect(service).toContain('this.notificationPagination(query.page, query.pageSize)');
    expect(service).toContain('this.applyNotificationActivityDataScope(builder, "notification", admin)');
    expect(service).toContain('this.applyNotificationMemberDataScope(builder, "user", admin)');
    expect(service).toContain('this.assertNotificationUserAccess(userId, admin)');
    expect(service).toContain('applyAdminActivityDataScope(builder, "activity", admin?.dataScope)');
  });

  it("requires a single target and returns masked minimal projections", () => {
    expect(service).toContain('if (id) this.assertNotificationTemplateWriteAccess(row, admin)');
    expect(service).toContain('row.tenant = row.tenant || tenantRelationForActor<Tenant>(admin)');
    expect(service).toContain('if (!input.userId) throw new BadRequestException("发送单条通知必须选择目标会员")');
    expect(service).toContain('phone: includeSensitive ? user.phone : maskPhone(user.phone)');
    expect(service).toContain('providerMessageId: includeSensitive ? row.providerMessageId : null');
    expect(service).toContain('errorMessage: includeSensitive ? row.errorMessage : null');
    expect(service).toContain('result.checkInCode = `${result.checkInCode.slice(0, 2)}****${result.checkInCode.slice(-2)}`');
    expect(service).toContain('result = result.replace(/(^|\\D)(1\\d{10})(?!\\d)/g');
    expect(service).toContain('sensitiveMasked: !includeSensitive');
    expect(page).toContain('maskPhone(phone)');
  });

  it("serializes rate limiting and retry claims with tenant-bound compensation", () => {
    expect(service).toContain('.setLock("pessimistic_write")');
    expect(service).toContain('const lockedUser = await manager.getRepository(User)');
    expect(service).toContain('notification.status !== "failed"');
    expect(service).toContain('this.notificationRetryCoolingDown(notification)');
    expect(service).toContain('tenantId: saved.tenant?.id || saved.activity?.tenant?.id || null');
    expect(service).toContain('notificationTenantId !== Number(job.tenantId || 0)');
    expect(service).toContain('idempotencyKey: `notification:${saved.id}`');
  });

  it("audits all notification maintenance and delivery operations", () => {
    expect(service).toContain('"notification_template.create"');
    expect(service).toContain('"notification_preference.update"');
    expect(service).toContain('"notification.send"');
    expect(service).toContain('"notification.activity_send"');
    expect(service).toContain('"notification.tag_send"');
    expect(service).toContain('"notification.retry"');
    expect(service).toContain('"notification_schedule.create"');
    expect(service).toContain('"notification_schedule.run_due"');
  });
});
