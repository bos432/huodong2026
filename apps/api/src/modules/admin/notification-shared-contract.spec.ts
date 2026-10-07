import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin notification shared contract", () => {
  const page = () => readFileSync(resolve(process.cwd(), "../admin/src/views/Notifications.vue"), "utf8");
  const shared = () => readFileSync(resolve(process.cwd(), "../../packages/shared/src/index.ts"), "utf8");

  it("defines the notification center response shapes in shared types", () => {
    const source = shared();
    expect(source).toContain("export interface AdminNotificationTemplate");
    expect(source).toContain("export interface AdminNotificationSchedule");
    expect(source).toContain("export interface AdminNotificationProviderStatus");
    expect(source).toContain("export interface AdminNotificationMonitor");
    expect(source).toContain("export interface AdminNotificationOptions");
    expect(source).toContain("export interface AdminNotificationPreferencesPage");
    expect(source).toContain("export interface AdminNotificationsPage");
    expect(source).toContain("export interface AdminNotificationDeliveryResult");
    expect(source).toContain("export interface AdminNotificationBatchResult");
    expect(source).toContain("export interface AdminNotificationScheduleRunResult");
  });

  it("keeps notification center reads explicitly typed", () => {
    const source = page();
    expect(source).toContain("import type {");
    expect(source).toContain("AdminNotificationTemplate");
    expect(source).toContain("AdminNotificationsPage");
    expect(source).not.toContain('api.get<any, any[]>("/admin/notification-templates"');
    expect(source).not.toContain('api.get<any, { items: any[]; total: number }>("/admin/notifications"');
    expect(source).not.toContain('api.get<any, any>("/admin/notifications/monitor"');
    expect(source).not.toContain('api.post<any, any>("/admin/notifications/send"');
    expect(source).not.toContain('api.post<any, any>(`/admin/notification-templates/${row.id}/test`');
  });
});
