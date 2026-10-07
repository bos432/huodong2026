import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./checkin.vue", import.meta.url), "utf8");

describe("legacy check-in route", () => {
  it("redirects legacy entries to the canonical local challenge page", () => {
    expect(source).toContain("uni.redirectTo");
    expect(source).toContain('withTenantCode("/pages/checkin/index")');
    expect(source).not.toContain("今日任务");
  });
});
