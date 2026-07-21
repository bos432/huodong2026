import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../admin/src/views/BusinessJobs.vue"), "utf8");

describe("business job page state contract", () => {
  it("clears stale task data and validates the paged response", () => {
    expect(source).toContain('rows.value = []; total.value = 0');
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
    expect(source).toContain(':disabled="loading || Boolean(actionKey)" @click="load"');
    expect(source).toContain(':disabled="loading || Boolean(actionKey)" :total="total"');
  });
});
