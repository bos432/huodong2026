import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../admin/src/views/BusinessJobs.vue"), "utf8");

describe("business job page state contract", () => {
  it("clears stale task data and validates the paged response", () => {
    expect(source).toContain('rows.value = []');
    expect(source).toContain('total.value = 0');
    expect(source).toContain('Array.isArray(result.items)');
    expect(source).toContain('throw new Error("业务任务响应格式异常")');
  });

  it("protects list writes with request generation and filter snapshots", () => {
    expect(source).toContain("const loadGeneration = ref(0)");
    expect(source).toContain("const generation = ++loadGeneration.value");
    expect(source).toContain("function filterSnapshot()")
    expect(source).toContain("generation !== loadGeneration.value || !isCurrentSnapshot(snapshot)");
  });

  it("rechecks the current task and status after confirmation", () => {
    expect(source).toContain("rows.value.find((item) => item.id === row.id)");
    expect(source).toContain("current.status !== expectedStatus");
    expect(source).toContain('current.status !== "dead_letter"');
    expect(source).toContain('["pending", "dead_letter"].includes(current.status)');
  });

  it("locks retry and pagination while a confirmation or action is active", () => {
    expect(source).toContain(':disabled="loading || Boolean(actionKey)"');
    expect(source).toContain(':total="total"');
  });

  it("exposes an accessible first-load state and a recovery path for empty filters", () => {
    expect(source).toContain("const hasLoaded = ref(false)");
    expect(source).toContain(':aria-busy="loading"');
    expect(source).toContain('role="status"');
    expect(source).toContain("暂无符合条件的业务任务");
    expect(source).toContain("清除筛选并重新加载");
  });

  it("uses the compatibility-preserving lifecycle state mapping for operator display", () => {
    expect(source).toContain('businessJobLifecycleState');
    expect(source).toContain('lifecycleStateText');
    expect(source).toContain('lifecycleStateType');
    expect(readFileSync(resolve(__dirname, "../../../../../packages/shared/src/index.ts"), "utf8")).toContain('export interface AdminBusinessJob');
    expect(readFileSync(resolve(__dirname, "../../../../../packages/shared/src/index.ts"), "utf8")).toContain('export interface AdminBusinessJobPage');
    expect(readFileSync(resolve(__dirname, "../../../../../packages/shared/src/index.ts"), "utf8")).toContain('export type BusinessJobLifecycleState');
  });
});
