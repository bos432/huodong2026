import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../admin/src/views/AdminLoginLogs.vue"), "utf8");

describe("admin login log state contract", () => {
  it("clears stale logs, summaries, totals, and tenant options", () => {
    expect(source).toContain('rows.value = [];\n  summary.value = {};\n  total.value = 0;');
    expect(source).toContain('tenantsErrorMessage.value = "";\n  tenants.value = [];');
  });

  it("protects both remote reads with request generations", () => {
    expect(source).toContain("const loadGeneration = ref(0)");
    expect(source).toContain("const tenantGeneration = ref(0)");
    expect(source).toContain("const generation = ++loadGeneration.value");
    expect(source).toContain("const generation = ++tenantGeneration.value");
  });

  it("validates list and option response shapes", () => {
    expect(source).toContain("Array.isArray(data.items)");
    expect(source).toContain('throw new Error("登录日志响应格式异常")');
    expect(source).toContain("Array.isArray(result.tenants)");
    expect(source).toContain('throw new Error("商家选项响应格式异常")');
  });

  it("freezes export filters and locks the page while exporting", () => {
    expect(source).toContain("const snapshot = { username: query.username.trim(), status: query.status, tenantId: query.tenantId }");
    expect(source).toContain("const interactionLocked = computed(() => loading.value || tenantsLoading.value || exporting.value)");
    expect(source).toContain(':disabled="interactionLocked"');
  });
});
