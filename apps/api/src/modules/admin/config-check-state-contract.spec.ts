import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../admin/src/views/ConfigCheck.vue"), "utf8");

describe("configuration check page state contract", () => {
  it("clears stale inspection conclusions before and after a failed request", () => {
    expect(source).toContain('loadError.value = "";\n  report.value = null;');
    expect(source).toContain('if (generation !== loadGeneration.value) return;\n    report.value = null;');
  });

  it("protects the report with a request generation", () => {
    expect(source).toContain("const loadGeneration = ref(0)");
    expect(source).toContain("const generation = ++loadGeneration.value");
    expect(source).toContain("if (generation === loadGeneration.value) loading.value = false");
  });

  it("validates the inspection response before rendering it", () => {
    expect(source).toContain('["ok", "warning", "error"].includes(result.status)');
    expect(source).toContain("Array.isArray(result.checks)");
    expect(source).toContain('throw new Error("上线体检响应格式异常")');
  });

  it("stacks the toolbar, recovery action, and summary cards on narrow screens", () => {
    expect(source).toContain("@media (max-width: 640px)");
    expect(source).toContain(".toolbar { flex-direction: column; }");
    expect(source).toContain(".error-recovery { align-items: stretch; flex-direction: column; }");
    expect(source).toContain(".summary-grid { grid-template-columns: 1fr; }");
  });
});
