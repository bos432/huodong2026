import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(__dirname, "../../../../../apps/mobile/src/pages/charity/index.vue"), "utf8");

describe("charity page shared state contract", () => {
  it("uses the shared state component for personal and public charity empty/error states", () => {
    expect(source).toContain('<EmptyState v-if="myLoadError"');
    expect(source).toContain('<EmptyState v-else-if="!hasMyCharity"');
    expect(source).toContain('<EmptyState v-else-if="!transactions.length"');
    expect(source).toContain('<EmptyState v-if="!projects.length"');
    expect(source).not.toContain('class="empty error-copy"');
    expect(source).not.toContain('class="empty">暂无公开公益项目');
  });
});
