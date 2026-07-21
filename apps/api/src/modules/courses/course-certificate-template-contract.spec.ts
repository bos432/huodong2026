import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("course certificate template read contract", () => {
  const service = readFileSync("src/modules/courses/courses.service.ts", "utf8");
  const controller = readFileSync("src/modules/courses/courses.controller.ts", "utf8");

  it("loads the saved template through strict course access", () => {
    expect(service).toContain("async getCourseCertificateTemplate");
    expect(service).toContain("await this.assertCourseAccess(courseId,admin)");
    expect(controller).toContain('@Get("courses/:id/certificate-template")');
  });
});
