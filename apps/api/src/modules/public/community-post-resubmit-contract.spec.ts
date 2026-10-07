import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("participant community post resubmission contract", () => {
  const source = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");

  it("allows only rejected participant posts to re-enter moderation", () => {
    const start = source.indexOf('@Patch("me/community/posts/:id")');
    const end = source.indexOf('@Delete("me/community/posts/:id")');
    const method = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(method).toContain("requireUserId");
    expect(method).toContain("resolveTenant");
    expect(method).toContain('post.status !== "rejected"');
    expect(method).toContain("postableActivities");
    expect(method).toContain("screenContent");
    expect(method).toContain("normalizeImageUrls");
    expect(method).toContain('status: "pending"');
    expect(method).toContain("reviewRemark: null");
    expect(method).toContain("visible: true");
  });

  it("does not expose an edit path for approved or pending posts", () => {
    const start = source.indexOf('@Patch("me/community/posts/:id")');
    const end = source.indexOf('@Delete("me/community/posts/:id")');
    const method = source.slice(start, end);

    expect(method).toContain("userId, deletedAt: IsNull()");
    expect(method).toContain("post.source !== \"participant\"");
    expect(method).not.toContain('status = "approved"');
    expect(method).not.toContain('status = "pending"');
  });

  it("keeps deletion scoped to the active tenant", () => {
    const start = source.indexOf('@Delete("me/community/posts/:id")');
    const end = source.indexOf('@Post("me/community/post-images")');
    const method = source.slice(start, end);

    expect(method).toContain('@Query("tenantCode") tenantCode?: string');
    expect(method).toContain("resolveTenant");
    expect(method).toContain("exactTenantWhere");
  });
});
