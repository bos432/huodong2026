import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("CSV export controller responses", () => {
  it("sends analytics CSV through the native response instead of the JSON interceptor", () => {
    const source = readFileSync(join(__dirname, "admin.controller.ts"), "utf8");
    for (const method of ["analyticsBusinessExport", "analyticsGrowthExport", "analyticsMetricsExport"]) {
      const start = source.indexOf(`async ${method}`);
      expect(start).toBeGreaterThan(-1);
      expect(source.slice(start, start + 500)).toContain("res.send(await this.service.");
    }
  });

  it("sends course assessment CSV through the native response", () => {
    const source = readFileSync(join(__dirname, "../courses/courses.controller.ts"), "utf8");
    const start = source.indexOf("async exportAttempts");
    expect(start).toBeGreaterThan(-1);
    expect(source.slice(start, start + 500)).toContain("res.send(await this.service.exportAssessmentAttempts");
  });
});
