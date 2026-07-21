import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("course payment statement reconciliation contract", () => {
  const service = readFileSync("src/modules/admin/admin.service.ts", "utf8");
  const entity = readFileSync("src/entities/payment-statement-record.entity.ts", "utf8");
  const migration = readFileSync("src/migrations/1783980000000-CoursePaymentStatementReconciliation.ts", "utf8");
  const finance = readFileSync("../admin/src/views/Finance.vue", "utf8");

  it("persists a reversible course statement relation and business discriminator", () => {
    expect(entity).toContain("courseOrder!: CourseOrder | null");
    expect(entity).toContain('default: "activity"');
    expect(migration).toContain('name: "courseOrderId"');
    expect(migration).toContain('name: "FK_payment_statement_course_order"');
    expect(migration).toContain("async down(queryRunner: QueryRunner)");
  });

  it("matches activity first and then tenant-scoped course orders", () => {
    const block = service.slice(service.indexOf("async importPaymentStatements("), service.indexOf("async fetchPaymentStatements("));
    expect(block).toContain("findCourseOrderForStatement");
    expect(block).toContain('businessType: courseOrder ? "course" : "activity"');
    expect(block).toContain("reconcileStatementWithCourseOrder");
    expect(block).toContain("upsertCourseStatementPaymentTransaction");
    expect(service).toContain('builder.andWhere("course.tenantId = :tenantId"');
  });

  it("includes course flows in difference scans and manual resolution", () => {
    expect(service).toContain('financeBusinessTypes: ["activity", "course"]');
    expect(service).toContain('businessTypes: ["activity", "course"]');
    expect(service).toContain("courseOrderByNo");
    expect(service).toContain("CourseOrderStatus.PartiallyRefunded");
  });

  it("returns a provider-payload-free whitelist and labels course rows in finance", () => {
    const projection = service.slice(service.indexOf("private publicPaymentStatement("), service.indexOf("private statementString("));
    expect(projection).not.toContain("rawPayload");
    expect(projection).toContain("courseOrder:");
    expect(finance).toContain('row.businessType === "course" ? "课程" : "活动"');
    expect(finance).toContain("row.courseOrder?.course?.title");
  });
});
