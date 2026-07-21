import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../admin/src/views/H5CodeLogs.vue"), "utf8");

describe("H5 verification code log state contract", () => {
  it("clears stale rows, summaries, and totals before and after failures", () => {
    expect(source).toContain('rows.value = [];\n  summary.value = {};\n  total.value = 0;');
    expect(source.match(/rows\.value = \[\];/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("protects list writes with a request generation and filter snapshot", () => {
    expect(source).toContain("const loadGeneration = ref(0)");
    expect(source).toContain("const generation = ++loadGeneration.value");
    expect(source).toContain("snapshot.phone !== query.phone.trim()");
  });

  it("validates the log response before rendering it", () => {
    expect(source).toContain("Array.isArray(data.items)");
    expect(source).toContain("Number.isFinite(data.total)");
    expect(source).toContain('throw new Error("验证码日志响应格式异常")');
  });

  it("freezes export filters and locks interactions while exporting", () => {
    expect(source).toContain("const snapshot = { phone: query.phone.trim(), status: query.status, mode: query.mode }");
    expect(source).toContain("const interactionLocked = computed(() => loading.value || exporting.value)");
    expect(source).toContain(':disabled="interactionLocked"');
  });
});
