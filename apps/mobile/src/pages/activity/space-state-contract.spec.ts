import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "space.vue"), "utf8");

describe("activity space shared state contract", () => {
  it("uses shared states for space loading and failure", () => {
    expect(source).toContain('<LoadingState v-if="loading"');
    expect(source).toContain('<EmptyState v-else-if="error" variant="error"');
    expect(source).toContain('action-text="重新加载"');
  });

  it("keeps post-event content and section empty states", () => {
    expect(source).toContain('variant="space"');
    expect(source).toContain('variant="social"');
    expect(source).toContain('variant="service"');
    expect(source).toContain('activityStage.ended');
  });
});
