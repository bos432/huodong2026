import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("src/modules/v1/v1.service.ts", "utf8");
const publicController = readFileSync("src/modules/v1/v1-public.controller.ts", "utf8");
const adminController = readFileSync("src/modules/v1/v1-admin.controller.ts", "utf8");
const migration = readFileSync("src/migrations/1784100000000-ActivitySpace.ts", "utf8");

function methodBody(start: string, end: string) {
  return service.slice(service.indexOf(start), service.indexOf(end));
}

describe("activity space governance", () => {
  it("requires an approved registration before a member can read, write, or report", () => {
    const access = methodBody("private async activitySpaceAccess", "private async activitySpaceSummary");
    expect(access).toContain("RegistrationStatus.Approved");
    expect(access).toContain("RegistrationStatus.CheckedIn");
    for (const body of [
      methodBody("async publicActivitySpace", "async createActivitySpacePost"),
      methodBody("async createActivitySpacePost", "async reportActivitySpacePost"),
      methodBody("async reportActivitySpacePost", "private publicSpaceAnnouncement")
    ]) expect(body).toContain("assertPublicActivityTenantAccess");
  });

  it("only returns a masked participant projection and keeps pending posts private to their author", () => {
    const space = methodBody("async publicActivitySpace", "async createActivitySpacePost");
    expect(space).toContain("post.status = 'pending' AND post.userId = :userId");
    expect(space).toContain("nickname: this.publicUserDisplayName(row.user)");
    expect(space).not.toContain("answers:");
    expect(space).not.toContain("phone:");
  });

  it("sends new questions through moderation and makes duplicate reports idempotent", () => {
    const create = methodBody("async createActivitySpacePost", "async reportActivitySpacePost");
    const report = methodBody("async reportActivitySpacePost", "private publicSpaceAnnouncement");
    expect(create).toContain('status: "pending"');
    expect(report).toContain("isDuplicateEntryError(error)");
    expect(report).toContain("return { idempotent: true }");
  });

  it("keeps the HTTP surface authenticated and persists the report uniqueness invariant", () => {
    expect(publicController).toContain('Get("activities/:id/space")');
    expect(publicController).toContain("requireUserFromAuthorization");
    expect(adminController).toContain('Get("activity-space-posts")');
    expect(migration).toContain("activity_space_announcements");
    expect(migration).toContain("activity_space_posts");
    expect(migration).toContain("activity_space_post_reports");
    expect(migration).toContain("UQ_activity_space_post_reports_post_user");
  });
});
