import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAdminRoutePermission } from "./admin-permissions";

const root = path.resolve(__dirname, "../../../../../");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("activity funnel and recap governance contract", () => {
  it("freezes explicit activity, registration, channel, ticket, and city attribution", () => {
    const activity = read("apps/api/src/entities/activity.entity.ts");
    const registration = read("apps/api/src/entities/registration.entity.ts");
    const event = read("apps/api/src/entities/conversion-event.entity.ts");
    const migration = read("apps/api/src/migrations/1783910000000-ActivityFunnelAttribution.ts");
    expect(activity).toContain("locationCity");
    expect(registration).toContain("attributionChannelCode");
    expect(registration).toContain("attributionCapturedAt");
    expect(event).toContain("ticketTypeIdSnapshot");
    expect(event).toContain("channelCodeSnapshot");
    expect(event).toContain("citySnapshot");
    expect(migration).toContain("IDX_conversion_events_registration_type");
    expect(migration).toContain("activity_match.location LIKE CONCAT");
    expect(migration).toContain("registration.attributionSource");
  });

  it("uses one event ledger for totals and ticket, channel, and city reconciliation", () => {
    const service = read("apps/api/src/modules/v1/v1.service.ts");
    expect(service).toContain("buildActivityFunnel");
    expect(service).toContain("dimensions: { ticketTypes, channels, cities }");
    expect(service).toContain("ticketTypes: reconciles(ticketTypes, false)");
    expect(service).toContain("channels: reconciles(channels, true)");
    expect(service).toContain("cities: reconciles(cities, true)");
    expect(service).toContain("attributionMismatchCount === 0");
    expect(service).toContain("grossAmountFen");
    expect(service).toContain("refundAmountFen");
    expect(service).toContain("netAmountFen");
  });

  it("stores immutable recap versions and supports designated-version export", () => {
    const entity = read("apps/api/src/entities/activity-recap-version.entity.ts");
    const migration = read("apps/api/src/migrations/1783920000000-ActivityRecapVersions.ts");
    const controller = read("apps/api/src/modules/v1/v1-admin.controller.ts");
    const service = read("apps/api/src/modules/v1/v1.service.ts");
    expect(entity).toContain("metricSnapshot");
    expect(entity).toContain("actionItems");
    expect(migration).toContain("trg_activity_recap_versions_immutable_update");
    expect(migration).toContain("trg_activity_recap_versions_immutable_delete");
    expect(controller).toContain('@Post("activities/:id/recap/versions")');
    expect(controller).toContain('@Query("version") version');
    expect(service).toContain("createActivityRecapVersion");
    expect(service).toContain("activity_recap.export");
  });

  it("separates recap viewing, version creation, and export permissions", () => {
    expect(resolveAdminRoutePermission("GET", "activities/:id/funnel")).toBe("analytics.view");
    expect(resolveAdminRoutePermission("GET", "activities/:id/recap")).toBe("analytics.view");
    expect(resolveAdminRoutePermission("GET", "activities/:id/recap/versions")).toBe("analytics.view");
    expect(resolveAdminRoutePermission("POST", "activities/:id/recap/versions")).toBe("analytics.manage");
    expect(resolveAdminRoutePermission("GET", "activities/:id/recap/export")).toBe("analytics.export");
  });

  it("keeps PC funnel and recap pages on analytics-only activity options", () => {
    const funnels = read("apps/admin/src/views/Funnels.vue");
    const recaps = read("apps/admin/src/views/Recaps.vue");
    const router = read("apps/admin/src/router.ts");
    expect(funnels).toContain("/admin/analytics/activity-options");
    expect(funnels).toContain("票种拆分");
    expect(funnels).toContain("城市归因");
    expect(recaps).toContain("保存不可变版本");
    expect(recaps).toContain("analytics.manage");
    expect(recaps).toContain("analytics.export");
    expect(router).toContain('{ path: "recaps", component: Recaps, meta: { roles: ["analytics.view"]');
  });
});
