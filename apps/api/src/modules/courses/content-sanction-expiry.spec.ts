import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("content sanction expiry", () => {
  const publicController = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const service = readFileSync("src/modules/courses/courses.service.ts", "utf8");

  it("archives elapsed sanctions before public enforcement and member listing", () => {
    const enforcement = publicController.slice(publicController.indexOf("private async assertContentWriteAllowed"), publicController.indexOf("private async screenContent"));
    const memberList = publicController.slice(publicController.indexOf('async myContentSanctions'), publicController.indexOf('@Get("me/content/appeals")'));
    expect(enforcement).toContain("await this.markExpiredContentSanctions(now)");
    expect(memberList).toContain("await this.markExpiredContentSanctions()");
    expect(publicController).toContain('.set({ status: "expired" })');
    expect(publicController).toContain('"endsAt <= :now"');
  });

  it("archives elapsed sanctions before the admin list is returned", () => {
    const list = service.slice(service.indexOf("async listContentSanctions"), service.indexOf("async createContentSanction"));
    expect(list).toContain("await this.markExpiredContentSanctions()");
    expect(service).toContain('.set({ status: "expired" })');
  });
});
