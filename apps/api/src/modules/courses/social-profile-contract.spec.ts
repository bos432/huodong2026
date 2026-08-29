import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const publicController = readFileSync(join(__dirname, "public-courses.controller.ts"), "utf8");
const adminService = readFileSync(join(__dirname, "courses.service.ts"), "utf8");

describe("social profile contracts", () => {
  it("requires login and scopes public profiles to the current tenant", () => {
    const block = publicController.slice(publicController.indexOf('@Get("social/profiles")'), publicController.indexOf('@Get("me/social-profile")'));
    expect(block).toContain("requireUserId");
    expect(block).toContain("tenantScopeKey");
    expect(block).toContain("profile.status = 'approved'");
    expect(block).toContain("profile.visible = 1");
  });

  it("returns only voluntary public fields and never exposes contact details", () => {
    const block = publicController.slice(publicController.indexOf("private publicSocialProfile"), publicController.indexOf("private optionalText"));
    expect(block).toContain("displayName");
    expect(block).toContain("offers");
    expect(block).toContain("needs");
    expect(block).not.toContain("phone");
    expect(block).not.toContain("openid");
    expect(block).not.toContain("wechat");
  });

  it("resets edited profiles to pending and exposes tenant-scoped moderation", () => {
    const save = publicController.slice(publicController.indexOf('@Post("me/social-profile")'), publicController.indexOf('@Get("me/community/postable-activities")'));
    expect(save).toContain('status: "pending"');
    expect(save).toContain("assertContentWriteAllowed");
    expect(adminService).toContain("applyTenantScopeToQuery(builder, \"profile\", admin)");
    expect(adminService).toContain("assertTenantAccessForActor(profile, admin");
  });

  it("stores keyword-screened social fields instead of the original text", () => {
    const save = publicController.slice(publicController.indexOf('@Post("me/social-profile")'), publicController.indexOf('@Get("me/community/postable-activities")'));
    expect(save).toContain("const sanitizedText");
    expect(save).toContain("socialFields.offers.map(() => screened[screenedIndex++].text)");
    expect(save).toContain("screened.some((result) => result.requiresReview)");
  });
});
