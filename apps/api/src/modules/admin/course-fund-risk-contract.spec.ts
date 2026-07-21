import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const service = readFileSync(resolve(process.cwd(), "src/modules/admin/fund-risk-monitor.service.ts"), "utf8");
const moduleSource = readFileSync(resolve(process.cwd(), "src/modules/admin/admin.module.ts"), "utf8");

describe("course fund risk coverage", () => {
  it("detects course payment mismatches, failed refunds, and duplicate successful payments", () => {
    expect(service).toContain("coursePaymentDiffs");
    expect(service).toContain("failedCourseRefunds");
    expect(service).toContain("duplicateCoursePayments");
    expect(service).toContain('`reconcile:course:${r.id}`');
    expect(service).toContain('`refund:course:${r.id}`');
    expect(service).toContain('`payment:duplicate:course:${r.businessOrderNo}`');
  });

  it("registers course refunds in the admin repository scope", () => {
    expect(moduleSource).toContain("FundRiskAlert, CourseRefund, MallPaymentCallbackLog");
  });

  it("separates observed immutable history from newly detected risks", () => {
    expect(service).toContain("observedCount: candidates.length");
    expect(service).toContain("ignoredResolvedCount");
    expect(service).toContain("detectedCount += 1");
  });

  it("serializes scans and protects alert state transitions", () => {
    expect(service).toContain('SELECT GET_LOCK(?, 10) AS acquired');
    expect(service).toContain('SELECT RELEASE_LOCK(?) AS released');
    expect(service).toContain('.setLock("pessimistic_write")');
    expect(service).toContain("allowedTransitions");
    expect(service).toContain("operationApplied: false");
    expect(service).toContain("operationApplied: true");
    expect(service).toContain("处理依据不能超过500个字符");
  });
});
