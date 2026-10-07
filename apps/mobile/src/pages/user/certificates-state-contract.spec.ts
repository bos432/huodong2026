import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "certificates.vue"), "utf8");

describe("certificates shared state contract", () => {
  it("uses shared states for loading, failure and empty certificates", () => {
    expect(source).toContain('<LoadingState v-if="loading"');
    expect(source).toContain('<EmptyState v-else-if="loadError" variant="error"');
    expect(source).toContain('action-text="重新加载"');
    expect(source).toContain('<EmptyState v-if="!loading && !loadError && !certificates.length"');
  });

  it("keeps volunteer synchronization and download errors separate", () => {
    expect(source).toContain('v-if="volunteerWarning"');
    expect(source).toContain('v-if="downloadError"');
    expect(source).toContain('role="alert" aria-live="assertive"');
  });
});
