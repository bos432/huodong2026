import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(__dirname, "MarketingPopup.vue"), "utf8");

describe("marketing popup accessibility contract", () => {
  it("exposes dialog semantics and a keyboard-operable close control", () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="marketing-popup-title"');
    expect(source).toContain('role="button" tabindex="0" aria-label="关闭弹窗"');
    expect(source).toContain('@keyup.enter="closePopup"');
    expect(source).toContain('@keyup.space.prevent="closePopup"');
  });
});
