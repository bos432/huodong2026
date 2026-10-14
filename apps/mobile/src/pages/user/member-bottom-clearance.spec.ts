import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("member transaction safe-area clearance", () => {
  for (const name of ["orders", "registration", "review"]) {
    it(`reserves enough fixed-navigation clearance on ${name}`, () => {
      const source = readFileSync(resolve(__dirname, `${name}.vue`), "utf8");
      expect(source).toContain("padding-bottom: calc(100px + env(safe-area-inset-bottom))");
    });
  }
  it("uses slowpi tokens for the feedback header, not the old hardcoded palette", () => {
    const source = readFileSync(resolve(__dirname, "review.vue"), "utf8");
    expect(source).not.toContain('style="background:#0f766e"');
    expect(source).toContain("background:var(--mp-brand-primary)");
  });
});
