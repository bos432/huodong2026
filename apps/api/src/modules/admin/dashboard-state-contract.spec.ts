import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../../apps/admin/src/views/Dashboard.vue"), "utf8");

describe("admin dashboard state contract", () => {
  it("surfaces mall merchant switch failures through the shared page error state", () => {
    expect(source).toContain("async function handleMallMerchantChange()");
    expect(source).toContain("errorMessage.value = error.message || \"商城经营数据加载失败\"");
    expect(source).toContain("catch (error: any)");
  });

  it("keeps dashboard reload available after a failed merchant switch", () => {
    expect(source).toContain("<el-alert v-if=\"errorMessage\"");
    expect(source).toContain("@click=\"load\"");
  });

  it("exposes an accessible page-level loading state before dashboard data exists", () => {
    expect(source).toContain('<div class="page" :aria-busy="loading">');
    expect(source).toContain('v-if="loading && !data && !mallMerchants.length"');
    expect(source).toContain('role="status" aria-live="polite"');
  });

  it("shows a recoverable empty state when the dashboard returns no data", () => {
    expect(source).toContain('v-if="!loading && !errorMessage && !data && !mallMerchants.length && !mallWorkbenchMode"');
    expect(source).toContain('description="暂时没有可展示的运营数据"');
    expect(source).toContain('<el-button @click="load">重新加载</el-button>');
  });
});
