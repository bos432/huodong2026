import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../../apps/mobile/src/styles.css"), "utf8");
const tenantSwitcher = readFileSync(resolve(__dirname, "../../../../../apps/mobile/src/components/TenantSwitcher.vue"), "utf8");

describe("mobile motion contract", () => {
  it("keeps media motion as a finite transform-only entrance", () => {
    const mediaBlock = source.slice(source.indexOf(".app-media-motion"), source.indexOf(".app-press"));
    expect(mediaBlock).toContain("animation: app-media-breathe");
    expect(mediaBlock).not.toContain("infinite");
    expect(mediaBlock).not.toContain("alternate");
  });

  it("routes the tenant switcher sheet through the shared motion adapter", () => {
    expect(tenantSwitcher).toContain('import { motionStyle } from "../motion/platform-adapter";');
    expect(tenantSwitcher).toContain('<view class="tenant-sheet" :style="motionStyle(0, 220)"');
    expect(tenantSwitcher).not.toContain("animation: app-sheet-rise 220ms ease-out both");
  });
});
