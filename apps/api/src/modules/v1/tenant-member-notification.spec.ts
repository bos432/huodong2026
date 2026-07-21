import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("tenant member notifications without an activity", () => {
  const source = readFileSync("src/modules/v1/v1.service.ts", "utf8");
  const block = source.slice(source.indexOf("private async prepareNotification"), source.indexOf("private notificationVariables"));
  const access = source.slice(source.indexOf("private async assertNotificationUserAccess"), source.indexOf("private async notificationTemplateForActor"));

  it("allows a tenant notification when the target has a tenant member profile", () => {
    expect(block).toContain("assertTenantAccessForActor(scopedActivity, admin");
    expect(block).toContain("this.assertNotificationActivityAccess(scopedActivity, admin)");
    expect(access).toContain("const tenantScopeKey = `tenant:${admin?.tenantId}`");
    expect(access).toContain("this.memberProfiles.findOne");
  });

  it("rejects targets outside the tenant and notifications without a target", () => {
    expect(block).toContain("租户通知必须关联活动、报名或本租户会员");
    expect(access).toContain("用户不存在或不属于当前商家");
  });
});
