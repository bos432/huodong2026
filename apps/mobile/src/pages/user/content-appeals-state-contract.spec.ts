import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "content-appeals.vue"), "utf8");

describe("content appeals shared state contract", () => {
  it("uses shared states for loading, failure and empty records", () => {
    expect(source).toContain('<LoadingState v-if="loading"');
    expect(source).toContain('<EmptyState v-else-if="loadError" variant="error"');
    expect(source).toContain('action-text="重新加载"');
    expect(source).toContain('<EmptyState v-if="!sanctions.length"');
    expect(source).toContain('<EmptyState v-if="!appeals.length"');
  });

  it("keeps submission errors separate from page data states", () => {
    expect(source).toContain('v-if="actionError"');
    expect(source).toContain('role="alert" aria-live="assertive"');
  });
});
