import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../admin/src/views/OperationLogs.vue"), "utf8");

describe("operation log page state contract", () => {
  it("clears stale logs, totals, and tenant options", () => {
    expect(source).toContain('rows.value = [];\n  total.value = 0;');
    expect(source).toContain('tenantsErrorMessage.value = "";\n  tenants.value = [];');
  });

  it("protects list and option reads with request generations", () => {
    expect(source).toContain("const loadGeneration = ref(0)");
    expect(source).toContain("const tenantGeneration = ref(0)");
    expect(source).toContain("const generation = ++loadGeneration.value");
    expect(source).toContain("const generation = ++tenantGeneration.value");
  });

  it("validates list and tenant option response shapes", () => {
    expect(source).toContain("Array.isArray(result.items)");
    expect(source).toContain('throw new Error("操作日志响应格式异常")');
    expect(source).toContain("Array.isArray(result.tenants)");
    expect(source).toContain('throw new Error("商家选项响应格式异常")');
  });

  it("freezes export filters and locks filtering and pagination", () => {
    expect(source).toContain("const snapshot = { tenantId: filters.tenantId, action: filters.action.trim()");
    expect(source).toContain("const interactionLocked = computed(() => loading.value || tenantsLoading.value || exporting.value)");
    expect(source).toContain(':disabled="interactionLocked" :total="total"');
  });

  it("clears stale results when a date range is invalid", () => {
    expect(source.indexOf("rows.value = [];")).toBeLessThan(source.indexOf('errorMessage.value = "开始日期不能晚于结束日期"'));
  });
});
