import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("refund business job contracts", () => {
  const mall = readFileSync("src/modules/mall/mall.service.ts", "utf8");
  const courses = readFileSync("src/modules/courses/courses.service.ts", "utf8");
  const courseEntity = readFileSync("src/entities/course-refund.entity.ts", "utf8");
  const migration = readFileSync("src/migrations/1783970000000-CourseRefundProviderRecovery.ts", "utf8");

  it("registers tenant-bound handlers for mall and course provider queries", () => {
    expect(mall).toContain('register("mall-refund.provider-query"');
    expect(mall).toContain('Number(payload.tenantId || 0) !== Number(job.tenantId || 0)');
    expect(mall).toContain('tenantId: job.tenantId || null }, refundId');
    expect(courses).toContain('register("course-refund.provider-query"');
    expect(courses).toContain('Number(payload.tenantId || 0) !== Number(job.tenantId || 0)');
    expect(courses).toContain('queryCourseProviderRefund(refundId, job.tenantId || 0)');
  });

  it("publishes stable retry jobs only for processing refunds", () => {
    expect(mall).toContain('if (refund.status !== "processing") return null;');
    expect(mall).toContain('type: "mall-refund.provider-query"');
    expect(mall).toContain('idempotencyKey: `mall-refund:${refund.id}`');
    expect(courses).toContain('type: "course-refund.provider-query"');
    expect(courses).toContain('idempotencyKey: `course-refund:${refund.id}`');
    expect(courses).toContain('if (refund.status !== "processing") return null;');
  });

  it("keeps processing results retryable and completes terminal results transactionally", () => {
    expect(mall).toContain('if (refund.status === "processing") throw new Error');
    expect(courses).toContain('if (refund.status === "processing") throw new Error');
    expect(courses).toContain('this.paymentProvider.requestRefund');
    expect(courses).toContain('this.paymentProvider.queryRefund');
    expect(courses).toContain('return this.completeCourseRefundInTransaction');
    expect(courses).toContain('lock: { mode: "pessimistic_write" }');
  });

  it("versions all course provider recovery fields with a reversible migration", () => {
    for (const field of ["providerRefundStatus", "providerRefundSyncedAt", "providerRefundPayload", "providerRefundRetryCount", "providerRefundNextQueryAt"]) {
      expect(courseEntity).toContain(field);
      expect(migration).toContain(field);
    }
    expect(migration).toContain("async down(queryRunner: QueryRunner)");
    expect(migration).toContain("dropColumn");
  });
});
