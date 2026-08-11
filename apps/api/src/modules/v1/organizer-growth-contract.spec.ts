import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("organizer growth contract", () => {
  it("keeps follow writes authenticated, tenant scoped and unique", () => {
    const controller = read("apps/api/src/modules/v1/v1-public.controller.ts");
    const service = read("apps/api/src/modules/v1/v1.service.ts");
    const entity = read("apps/api/src/entities/tenant-follower.entity.ts");
    expect(controller).toContain('@Post("organizers/:tenantId/follow")');
    expect(controller).toContain("requireUserFromAuthorization");
    expect(service).toContain("scopedTenant.id !== tenant.id");
    expect(service).toContain("this.tenantFollowers.manager.transaction");
    expect(entity).toContain('@Index("UQ_tenant_followers_tenant_user", ["tenant", "user"], { unique: true })');
  });

  it("exposes safe trust and related activity summaries to the mobile detail", () => {
    const service = read("apps/api/src/modules/v1/v1.service.ts");
    const mobile = read("apps/mobile/src/pages/activity/detail.vue");
    expect(service).toContain("organizerTrust, relatedActivities");
    expect(service).toContain("organizerProfile: this.publicOrganizerProfile(activity.tenant)");
    expect(mobile).toContain("activity.organizerTrust.fulfillmentRate");
    expect(mobile).toContain("activity.relatedActivities");
  });
});
