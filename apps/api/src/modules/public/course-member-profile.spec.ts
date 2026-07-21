import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("course access member profile", () => {
  const source = readFileSync("src/modules/public/public.service.ts", "utf8");
  const block = source.slice(source.indexOf("private async grantCourseAccess"), source.indexOf("private tenantCourseWhere"));

  it("creates or refreshes the tenant member profile whenever course access is granted", () => {
    expect(block).toContain("await this.userLearning.save(row)");
    expect(block).toContain("await this.refreshMemberProfile(user, course.tenant || null)");
  });
});
