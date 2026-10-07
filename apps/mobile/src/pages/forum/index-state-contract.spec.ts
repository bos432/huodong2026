import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "index.vue"), "utf8");

describe("forum list shared state contract", () => {
  it("uses shared states for category and topic loading failures", () => {
    expect(source).toContain('<EmptyState v-if="categoryError" variant="error"');
    expect(source).toContain('action-text="重新加载版块"');
    expect(source).toContain('<LoadingState v-if="loading"');
    expect(source).toContain('<EmptyState v-else-if="topicsError" variant="error"');
    expect(source).toContain('action-text="重新加载帖子"');
  });

  it("keeps the publish action available in the empty forum state", () => {
    expect(source).toContain('<EmptyState v-if="!loading && !topicsError && !topics.length"');
    expect(source).toContain(':action-text="canPost ? \'发布帖子\' : \'\'"');
    expect(source).toContain('@action="goPublish"');
  });
});
