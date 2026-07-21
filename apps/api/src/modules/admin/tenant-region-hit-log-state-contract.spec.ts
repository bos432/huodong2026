import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../admin/src/views/TenantRegionHitLogs.vue"), "utf8");

describe("tenant region hit log state contract", () => {
  it("uses independent option, list, and summary state boundaries", () => {
    expect(source).toContain("const optionsGeneration = ref(0)");
    expect(source).toContain("const listGeneration = ref(0)");
    expect(source).toContain("const summaryGeneration = ref(0)");
    expect(source).toContain("Promise.allSettled([loadOptions(), loadList(), loadSummary()])");
  });

  it("clears stale data and validates each response", () => {
    expect(source).toContain("tenants.value = []");
    expect(source).toContain('rows.value = [];\n  total.value = 0;');
    expect(source).toContain("summary.value = emptySummary()");
    expect(source).toContain('throw new Error("商家选项响应格式异常")');
    expect(source).toContain('throw new Error("定位日志响应格式异常")');
    expect(source).toContain('throw new Error("定位汇总响应格式异常")');
  });

  it("binds list and summary writes to the current filter snapshot", () => {
    expect(source).toContain("function filterSnapshot()")
    expect(source).toContain("function isCurrentSnapshot(snapshot:");
    expect(source).toContain("generation !== listGeneration.value || !isCurrentSnapshot(snapshot)");
    expect(source).toContain("generation !== summaryGeneration.value || !isCurrentSnapshot(snapshot)");
  });

  it("freezes export filters and locks page interactions", () => {
    expect(source).toContain("const snapshot = filterSnapshot()");
    expect(source).toContain("buildParams(snapshot, false)");
    expect(source).toContain("const interactionLocked = computed(() => loading.value || exporting.value)");
    expect(source).toContain(':disabled="interactionLocked"');
  });
});
