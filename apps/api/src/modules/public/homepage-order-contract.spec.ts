import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sharedOrderSource = readFileSync("../../packages/shared/src/index.ts", "utf8");
const mobileOrderSource = readFileSync("../../apps/mobile/src/homepage-order.ts", "utf8");
const adminBuilderSource = readFileSync("../../apps/admin/src/views/HomepageBuilder.vue", "utf8");
const decorationSource = readFileSync("../../apps/mobile/src/decoration.ts", "utf8");

describe("homepage decoration order contract", () => {
  it("uses one shared order implementation across clients", () => {
    expect(sharedOrderSource).toContain("export function sortHomepageSections");
    expect(sharedOrderSource).toContain("const leftId = Number(left.section.id)");
    expect(sharedOrderSource).toContain("return leftId - rightId");
    expect(mobileOrderSource).toContain('export { sortHomepageSections } from "@activity/shared"');
    expect(decorationSource).toContain('import { sortHomepageSections } from "@activity/shared"');
    expect(decorationSource).toContain("return sortHomepageSections(rows)");
    expect(adminBuilderSource).toContain('import { sortHomepageSections } from "@activity/shared"');
    expect(adminBuilderSource).toContain("const orderedRows = computed(() => sortHomepageSections(rows.value))");
  });
});
