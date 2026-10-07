import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sharedSource = readFileSync(resolve(process.cwd(), "../../packages/shared/src/index.ts"), "utf8");

describe("shared homepage section order", () => {
  it("uses sortOrder ascending, id as the legacy tie-breaker, and keeps invalid rows last", () => {
    expect(sharedSource).toContain("export function sortHomepageSections");
    expect(sharedSource).toContain("const leftSortValue = left.section.sortOrder");
    expect(sharedSource).toContain("leftSortValue === null || leftSortValue === undefined");
    expect(sharedSource).toContain("const leftId = Number(left.section.id)");
    expect(sharedSource).toContain("return left.index - right.index");
  });
});
