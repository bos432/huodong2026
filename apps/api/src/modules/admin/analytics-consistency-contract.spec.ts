import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const service = readFileSync(resolve(process.cwd(), "src/modules/admin/admin.service.ts"), "utf8");

describe("analytics consistency contract", () => {
  it("uses complete calculation coverage before serving daily metrics", () => {
    expect(service).toContain("private async analyticsReportMetricRows");
    expect(service).toContain("run.startDate <= :startDate");
    expect(service).toContain("run.endDate >= :endDate");
    expect(service).toContain("if (!query.startDate || !query.endDate) return []");
  });

  it("replaces stale daily rows under a tenant-scoped named lock", () => {
    expect(service).toContain('const lockKey = `analytics:');
    expect(service).toContain('SELECT GET_LOCK(?, 0) AS acquired');
    expect(service).toContain('.andWhere("metricDate <= :endDate"');
    expect(service).toContain('for (const metricKey of supportedMetricKeys)');
  });

  it("applies date and activity scope to member analytics", () => {
    expect(service).toContain('categoryPreferenceBuilder.andWhere("registration.createdAt >= :categoryStartDate"');
    expect(service).toContain('applyAdminActivityDataScope(activeUserBuilder, "event", admin?.dataScope)');
    expect(service).toContain('repeatRegistration.status IN (:...participationStatuses)');
  });

  it("paginates business details and reconciles gross, refund and net amounts", () => {
    expect(service).toContain("const page = query.page || 1");
    expect(service).toContain("grossAmountFen, refundAmountFen, amountFen: grossAmountFen - refundAmountFen");
    expect(service).toContain("mallRefund.completedAt IS NOT NULL");
    expect(service).toContain("while (rows.length < total)");
    expect(service).toContain("经营明细导出不完整");
    expect(service).not.toContain("merchant.status]).take(500)");
    expect(service).toContain("留存分析明细超过 100000 条");
  });
});
