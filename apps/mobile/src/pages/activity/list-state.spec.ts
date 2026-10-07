import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeActivityListStatus, resetActivityListFilters } from "./list-state";

describe("resetActivityListFilters", () => {
  const source = readFileSync(new URL("./list.vue", import.meta.url), "utf8");

  it("clears category, status and keyword filters together", () => {
    expect(resetActivityListFilters({ categoryId: 12, status: "ended", keyword: "读书" })).toEqual({
      categoryId: "all",
      status: "all",
      keyword: ""
    });
  });

  it("keeps the result summary neutral while the list is loading or failed", () => {
    expect(source).toContain('const resultCountText = computed(() => loading.value || error.value ? "活动列表"');
    expect(source).toContain('const resultCountDescription = computed(() => loading.value || error.value ? "正在同步活动列表"');
  });

  it("does not expose ended activities when the archive is disabled", () => {
    expect(normalizeActivityListStatus("ended", false)).toEqual({ status: "all", archiveBlocked: true });
    expect(normalizeActivityListStatus("ended", true)).toEqual({ status: "ended", archiveBlocked: false });
  });
});
