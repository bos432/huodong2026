import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const page = fs.readFileSync(path.join(repoRoot, "apps/admin/src/views/Reviews.vue"), "utf8");

describe("activity review state contract", () => {
  it("protects the three read regions with generations and validation", () => {
    expect(page).toContain("const reviewGeneration = ref(0)");
    expect(page).toContain("const reportGeneration = ref(0)");
    expect(page).toContain("const optionsGeneration = ref(0)");
    expect(page).toContain("评价列表响应格式无效");
    expect(page).toContain("举报列表响应格式无效");
    expect(page).toContain("活动选项响应格式无效");
    expect(page).toContain("Promise.allSettled([loadOptions(), loadReviews(), loadReports()])");
  });

  it("clears stale rows, totals and options before reads", () => {
    expect(page).toContain("rows.value = []");
    expect(page).toContain("reviewTotal.value = 0");
    expect(page).toContain("reports.value = []");
    expect(page).toContain("reportTotal.value = 0");
    expect(page).toContain("activities.value = []");
    expect(page).toContain("reviewError ? '评价加载失败' : '暂无评价'");
    expect(page).toContain("reportError ? '举报加载失败' : '暂无待处理举报'");
  });

  it("binds review and report responses to query snapshots", () => {
    expect(page).toContain("const snapshot = reviewQuerySnapshot()");
    expect(page).toContain("const snapshot = reportQuerySnapshot()");
    expect(page).toContain("generation !== reviewGeneration.value || !sameReviewQuery(snapshot)");
    expect(page).toContain("generation !== reportGeneration.value || !sameReportQuery(snapshot)");
  });

  it("locks and revalidates review and report write targets", () => {
    expect(page).toContain("const scopeLocked = computed(");
    expect(page).toContain("current.status !== targetStatus");
    expect(page).toContain('current.status !== "pending"');
    expect(page).toContain("current.review?.id !== targetReviewId");
    expect(page).toContain(':disabled="scopeLocked" :total="reviewTotal"');
    expect(page).toContain(':disabled="scopeLocked" :total="reportTotal"');
  });
});
