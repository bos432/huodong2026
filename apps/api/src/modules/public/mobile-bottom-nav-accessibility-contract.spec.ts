import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile bottom navigation accessibility contract", () => {
  it("keeps each configured navigation item keyboard reachable and stateful", () => {
    const source = readFileSync(resolve(process.cwd(), "../mobile/src/components/AppBottomNav.vue"), "utf8");
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain('tabindex="0"');
    expect(source).toContain(":aria-label=\"navLabel(item)\"");
    expect(source).toContain(":aria-selected=\"isCurrent(item.link)\"");
    expect(source).toContain("@keyup.enter=\"goDecoratedLink(item.link, item.action)\"");
    expect(source).toContain("@keyup.space.prevent=\"goDecoratedLink(item.link, item.action)\"");
  });
});
