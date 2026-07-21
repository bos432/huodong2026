import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("content governance timestamp contract", () => {
  const publicController = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const service = readFileSync("src/modules/courses/courses.service.ts", "utf8");
  const v1Service = readFileSync("src/modules/v1/v1.service.ts", "utf8");

  it("writes application timestamps for appeals and community reports", () => {
    const appeals = publicController.slice(publicController.indexOf("const appeal = this.contentAppeals.create"), publicController.indexOf("try {", publicController.indexOf("const appeal = this.contentAppeals.create")));
    expect(appeals).toContain("createdAt: new Date()");
    expect(appeals).toContain("updatedAt: new Date()");
    const reports = publicController.slice(publicController.indexOf('@Post("community/posts/:id/report")'), publicController.indexOf('@Post("community/users/:id/follow")'));
    expect(reports.match(/createdAt, updatedAt: createdAt/g)?.length).toBe(2);
  });

  it("writes application timestamps for sanctions", () => {
    const block = service.slice(service.indexOf("async createContentSanction"), service.indexOf("async revokeContentSanction"));
    expect(block).toContain("const createdAt = new Date()");
    expect(block).toContain("createdAt,");
  });

  it("writes application timestamps for unified notification records", () => {
    const block = v1Service.slice(v1Service.indexOf("private async createAndDeliverNotification"), v1Service.indexOf("private async deliverNotification"));
    expect(block).toContain("const createdAt = new Date()");
    expect(block).toMatch(/remark: input\.remark \|\| null,\s*createdAt/);
  });
});
