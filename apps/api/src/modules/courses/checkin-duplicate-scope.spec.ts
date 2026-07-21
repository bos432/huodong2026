import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("check-in task duplicate scope", () => {
  const source = readFileSync("src/modules/courses/courses.service.ts", "utf8");
  const block = source.slice(source.indexOf("private async duplicateCheckinTaskSummary"), source.indexOf("private startOfToday"));

  it("groups duplicate warnings by tenant, activity and date", () => {
    expect(block).toContain('.addSelect("task.activityId", "activityId")');
    expect(block).toContain('.addGroupBy("task.activityId")');
  });
});
