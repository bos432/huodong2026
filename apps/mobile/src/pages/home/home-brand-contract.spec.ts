import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.vue", import.meta.url), "utf8");

describe("home uses Manpi brand tokens", () => {
  it("uses the approved paper, clay, and mist tokens instead of the retired green palette", () => {
    expect(source).toContain("background:var(--mp-bg-page)");
    expect(source).toContain("background:var(--mp-brand-soft)");
    expect(source).toContain("background:var(--mp-brand-primary)");
    expect(source).toContain("color:var(--mp-brand-primary-dark)");
    expect(source).not.toMatch(/#(?:19ba83|1bfa92|d3f9e7|08753f)/i);
  });

  it("labels the recommendation feed according to its data source", () => {
    expect(source).toContain("当前仅用于页面展示");
    expect(source).toContain("来自活动服务的公开信息");
  });
});
