import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../../apps/admin/src/views/HomepageBuilder.vue"), "utf8");

describe("homepage builder scope error state contract", () => {
  it("clears stale sections when the current page or tenant scope fails to load", () => {
    expect(source).toContain("rows.value = [];\n    publicationStatus.value = null;");
    expect(source).toContain("lastPublishedRows.value = [];\n    lastPublishedLoaded.value = false;");
  });

  it("exposes a page-level loading state while a new decoration scope is loading", () => {
    expect(source).toContain('<div class="builder-page" :aria-busy="loading">');
    expect(source).toContain('v-if="loading && !rows.length"');
    expect(source).toContain('role="status" aria-live="polite"');
  });
});
