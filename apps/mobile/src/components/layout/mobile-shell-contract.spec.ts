import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./MobileShell.vue", import.meta.url), "utf8");
const publishSheet = readFileSync(new URL("./PublishEntrySheet.vue", import.meta.url), "utf8");
const profile = readFileSync(new URL("../../pages/prototype/me.vue", import.meta.url), "utf8");

describe("MobileShell publish entry", () => {
  it("opens the profile host entry in place without navigating or changing storage", () => {
    const handler = profile.match(/function openPublishEntry\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
    expect(handler).toContain("mobileShell.value?.openPublish()");
    expect(handler).not.toContain("reLaunch");
    expect(handler).not.toContain("setStorageSync");
    expect(profile).toContain('ref="mobileShell"');
    expect(source).toContain("defineExpose({ openPublish })");
  });
  it("keeps publish as a labeled bottom-navigation action", () => {
    expect(source).toContain('class="mobile-publish"');
    expect(source).toContain("<small>发布</small>");
    expect(source).not.toContain('class="mobile-fab"');
  });

  it("matches the approved five-position navigation with a distinct centered publish action", () => {
    expect(source).toMatch(/grid-template-columns:\s*1fr\s+1fr\s+64px\s+1fr\s+1fr/);
    expect(source).toContain('class="publish-circle"');
    expect(source).toContain('name="plus"');
    expect(source).toContain('aria-label="慢π主导航"');
  });

  it("consumes the cross-tab request to open the shared publish sheet", () => {
    expect(source).toContain('uni.getStorageSync("open_publish_sheet")');
    expect(source).toContain("publishOpen.value = true");
    expect(source).toContain('uni.removeStorageSync("open_publish_sheet")');
  });

  it("keeps publish choices readable as full-width rows on narrow phones", () => {
    expect(publishSheet).toContain(".publish-entry{display:grid;grid-template-columns:1fr;gap:8px");
    expect(publishSheet).toContain(".publish-action{min-height:64px;display:flex;align-items:flex-start;justify-content:center;flex-direction:column");
    expect(publishSheet).toContain("text-align:left");
  });
});
