import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile tenant switcher accessibility contract", () => {
  it("keeps the compact switcher and sheet controls keyboard reachable", () => {
    const source = readFileSync(resolve(process.cwd(), "../mobile/src/components/TenantSwitcher.vue"), "utf8");
    expect(source).toContain('role="button"');
    expect(source).toContain('tabindex="0"');
    expect(source).toContain('aria-label="切换城市合伙人"');
    expect(source).toContain('aria-label="关闭商家切换"');
    expect(source).toContain("@keyup.enter=\"show\"");
    expect(source).toContain("@keyup.space.prevent=\"show\"");
    expect(source).toContain("@keyup.enter=\"hide\"");
    expect(source).toContain("@keyup.space.prevent=\"hide\"");
    expect(source).toContain(".tenant-entry { min-width: 0;");
    expect(source).toContain(".tenant-entry > view:first-child { min-width: 0;");
    expect(source).toContain("max-width: 100%;");
  });

  it("keeps the slow-pi discovery top bar usable on narrow phones", () => {
    const source = readFileSync(resolve(process.cwd(), "../mobile/src/pages/home/index.vue"), "utf8");
    expect(source).toContain("@media screen and (max-width: 420px)");
    expect(source).toContain("grid-template-columns:auto minmax(0,1fr) auto");
    expect(source).toContain(".search{min-width:0;flex:1 1 auto");
  });
});
