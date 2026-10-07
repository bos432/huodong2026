import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./me.vue", import.meta.url), "utf8");

describe("slowpi profile page visual contract", () => {
  it("uses the shared mobile shell and page heading", () => {
    expect(source).toContain('<MobileShell active-tab="me"');
    expect(source).toContain('class="page-heading"');
    expect(source).toContain('class="heading-title">我的</text>');
  });

  it("uses the shared surface token for the refreshed card overrides", () => {
    expect(source).toContain("var(--mp-bg-surface)");
    expect(source).toContain(".identity,");
    expect(source).toContain(".stats { grid-template-columns: repeat(3");
  });
});
