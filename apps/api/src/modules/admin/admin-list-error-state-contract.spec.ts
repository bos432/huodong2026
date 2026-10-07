import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const activitiesSource = readFileSync(resolve(__dirname, "../../../../../apps/admin/src/views/Activities.vue"), "utf8");
const registrationsSource = readFileSync(resolve(__dirname, "../../../../../apps/admin/src/views/Registrations.vue"), "utf8");
const notificationsSource = readFileSync(resolve(__dirname, "../../../../../apps/admin/src/views/Notifications.vue"), "utf8");
const financeSource = readFileSync(resolve(__dirname, "../../../../../apps/admin/src/views/Finance.vue"), "utf8");

describe("admin list error state contract", () => {
  it("clears stale activities when the current list request fails", () => {
    expect(activitiesSource).toContain('rows.value = [];\n    errorMessage.value = error.message || "加载活动失败"');
  });

  it("exposes an accessible loading state for the activities list before rows exist", () => {
    expect(activitiesSource).toContain('<div class="page activity-management" :aria-busy="loading">');
    expect(activitiesSource).toContain('v-if="loading && !rows.length"');
    expect(activitiesSource).toContain('role="status" aria-live="polite"');
  });

  it("offers a recovery action when activity filters return no rows", () => {
    expect(activitiesSource).toContain('v-if="!loading && !errorMessage && !rows.length"');
    expect(activitiesSource).toContain('description="暂无符合条件的活动"');
    expect(activitiesSource).toContain('@click="resetFilters"');
  });

  it("clears stale registrations when the current list request fails", () => {
    expect(registrationsSource).toContain('rows.value = [];\n    errorMessage.value = error.message || "加载报名失败"');
  });

  it("exposes an accessible page loading state before registration rows exist", () => {
    expect(registrationsSource).toContain('<div class="page" :aria-busy="loading">');
    expect(registrationsSource).toContain('v-if="loading && !rows.length"');
    expect(registrationsSource).toContain('role="status" aria-live="polite"');
  });

  it("clears stale notification data when the current scoped request fails", () => {
    expect(notificationsSource).toContain('templates.value = [];\n    notifications.value = [];\n    schedules.value = [];\n    providers.value = [];');
    expect(notificationsSource).toContain('activities.value = [];\n    tags.value = [];\n    preferences.value = [];');
    expect(notificationsSource).toContain('monitor.value = null;\n    errorMessage.value = error.message || "通知中心加载失败"');
  });

  it("keeps finance data and refund actions bound to the current tenant scope", () => {
    expect(financeSource).toContain("let financeRequestId = 0");
    expect(financeSource).toContain("const snapshot = financeScopeSnapshot()");
    expect(financeSource).toContain("data.value = undefined;");
    expect(financeSource).toContain("if (requestId !== financeRequestId || snapshot !== financeScopeSnapshot()) return;");
    expect(financeSource).toContain("if (snapshot !== financeScopeSnapshot()) throw new Error(\"商家范围已变化，请重新加载后再操作\")");
  });

  it("exposes an accessible finance loading state before dashboard data exists", () => {
    expect(financeSource).toContain('<div class="page" :aria-busy="loading">');
    expect(financeSource).toContain('v-if="loading && !data"');
    expect(financeSource).toContain('role="status" aria-live="polite"');
  });

  it("does not show the finance empty state together with a load error", () => {
    expect(financeSource).toContain('v-else-if="!loading && !errorMessage" description="暂无财务数据"');
  });
});
