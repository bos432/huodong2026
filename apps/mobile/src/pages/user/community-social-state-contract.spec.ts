import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "community-social.vue"), "utf8");

describe("community social shared state contract", () => {
  it("uses shared states for loading, failure and empty records", () => {
    expect(source).toContain('<LoadingState v-if="loading"');
    expect(source).toContain('<EmptyState v-else-if="currentFailed" variant="error"');
    expect(source).toContain('action-text="重新加载"');
    expect(source).toContain('<EmptyState v-if="!currentRows.length" variant="social"');
  });

  it("keeps notification processing errors as action feedback", () => {
    expect(source).toContain('uni.showToast({ title: reviewSafeText(error?.message || "消息处理失败")');
  });
});
