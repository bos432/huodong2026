import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "index.vue"), "utf8");

describe("volunteer page shared state contract", () => {
  it("uses shared states for page loading, failure and empty tasks", () => {
    expect(source).toContain('<LoadingState v-if="loading"');
    expect(source).toContain('<EmptyState v-else-if="loadError" variant="error"');
    expect(source).toContain('action-text="重新加载"');
    expect(source).toContain('<EmptyState v-if="!tasks.length"');
  });

  it("keeps member profile synchronization warning separate from page failure", () => {
    expect(source).toContain('v-if="mineLoadError"');
    expect(source).toContain('class="inline-warning"');
    expect(source).toContain('@click="load"');
  });
});
