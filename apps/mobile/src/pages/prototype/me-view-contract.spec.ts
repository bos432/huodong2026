import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "me.vue"), "utf8");

describe("slowpi profile view contract", () => {
  it("keeps the demo identity label separate from the nickname", () => {
    expect(source).toContain('class="eyebrow">演示用户</text>');
    expect(source).not.toContain("演示用户 · 慢π体验者");
  });

  it("defines the profile surfaces instead of falling back to browser defaults", () => {
    expect(source).toContain(".identity-head");
    expect(source).toContain(".todo-grid");
    expect(source).toContain(".setting-list");
    expect(source).toContain("border-radius:var(--mp-radius-lg)");
  });
});
