import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("content governance notification membership", () => {
  const service = readFileSync("src/modules/courses/courses.service.ts", "utf8");

  it("establishes the tenant member profile before governance notifications", () => {
    const report = service.slice(service.indexOf("async reviewCommunityContentReport"), service.indexOf("async listContentKeywordRules"));
    expect(report).toContain("ensureGovernanceMemberProfile(report.reporterId");
    expect(report).toContain("ensureGovernanceMemberProfile(report.targetUserId");
    const sanction = service.slice(service.indexOf("async createContentSanction"), service.indexOf("async revokeContentSanction"));
    expect(sanction).toContain("ensureGovernanceMemberProfile(userId");
    const appeal = service.slice(service.indexOf("async reviewContentAppeal"), service.indexOf("private async markExpiredContentSanctions"));
    expect(appeal).toContain("ensureGovernanceMemberProfile(row.userId");
  });

  it("creates the profile idempotently in the governance tenant scope", () => {
    const helper = service.slice(service.indexOf("private async ensureGovernanceMemberProfile"), service.indexOf("private scopedCourseQuery"));
    expect(helper).toContain("this.dataSource.getRepository(MemberProfile)");
    expect(helper).toContain("tenantScopeKey = tenant ? `tenant:${tenant.id}` : \"platform\"");
    expect(helper).toContain("if (!isDuplicateEntryError(error)) throw error");
  });
});
