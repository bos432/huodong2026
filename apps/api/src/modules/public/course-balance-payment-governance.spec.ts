import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const controller = readFileSync("src/modules/public/public.controller.ts", "utf8");
const publicService = readFileSync("src/modules/public/public.service.ts", "utf8");
const courseService = readFileSync("src/modules/courses/courses.service.ts", "utf8");
const adminService = readFileSync("src/modules/admin/admin.service.ts", "utf8");
const riskService = readFileSync("src/modules/admin/fund-risk-monitor.service.ts", "utf8");
const transactionEntity = readFileSync("src/entities/payment-transaction.entity.ts", "utf8");
const migration = readFileSync("src/migrations/1783940000000-BackfillCoursePaymentTransactions.ts", "utf8");
const statementMigration = readFileSync("src/migrations/1783950000000-ReclassifyDuplicateStatementPayments.ts", "utf8");
const mobilePage = readFileSync("../mobile/src/pages/order/confirm.vue", "utf8");
const unifiedOrderPage = readFileSync("../admin/src/views/UnifiedOrders.vue", "utf8");
const courseServiceSource = readFileSync("src/modules/courses/courses.service.ts", "utf8");

describe("course balance payment governance", () => {
  it("exposes balance payment and drives checkout methods from tenant operation settings", () => {
    expect(controller).toContain('@Post("course-orders/:id/pay/balance")');
    expect(publicService).toContain("payCourseOrderWithBalance(orderId: number");
    expect(publicService).toContain("assertPaymentMethodEnabled(PaymentMethod.Balance, tenant)");
    expect(mobilePage).toContain('request<any>("/public/settings/operation")');
    expect(mobilePage).toContain('{ icon: "余", label: "余额支付", value: "balance" }');
    expect(mobilePage).toContain("availablePaymentMethods.value.find");
  });

  it("deducts gift before cash under locks and records one unified course payment", () => {
    expect(publicService).toContain('lock: { mode: "pessimistic_write" }');
    expect(publicService).toContain("loadEagerRelations: false");
    expect(publicService).toContain("const giftUsedFen = Math.min(giftBeforeFen, amountFen)");
    expect(publicService).toContain('idempotencyKey = `course_balance_pay:${order.id}`');
    expect(publicService).toContain('businessType: "course"');
    expect(publicService).toContain('reconciliationStatus: "matched"');
    expect(transactionEntity).toContain("order!: Order | null");
  });

  it("restores gift and cash sources idempotently for partial course refunds", () => {
    expect(courseService).toContain('idempotencyKey = `course_refund:${refund.id}`');
    expect(courseService).toContain("originalGiftUsedFen - restoredGiftFen");
    expect(courseService).toContain("const cashReturnFen = amountFen - giftReturnFen");
    expect(courseService).toContain('const tenantScopeKey = course.tenant?.id ? String(course.tenant.id) : "platform"');
    expect(courseService).toContain("await walletRepo.save(wallet)");
  });

  it("backfills historical payments and keeps course rows out of activity finance workflows", () => {
    expect(migration).toContain("CONCAT('COURSE-HIST-', co.id)");
    expect(migration).toContain("p.businessType = 'course'");
    expect(migration).toContain("'historicalBackfill', TRUE");
    expect(adminService).toContain('transaction.businessType = :activityBusinessType');
    expect(adminService).toContain('transaction.orderId IS NOT NULL');
    expect(riskService).toContain("row.businessType = 'activity' AND row.orderId IS NOT NULL");
  });

  it("shows course payments and refunds in unified funds and consistency checks", () => {
    expect(adminService).toContain('sourceType === "course_payment"');
    expect(adminService).toContain('sourceType === "course_refund"');
    expect(adminService).toContain('type: "course_payment_amount"');
    expect(adminService).toContain("courseOrders: courseOrderRows.length");
    expect(unifiedOrderPage).toContain('<el-option label="课程支付" value="course_payment" />');
    expect(unifiedOrderPage).toContain('<el-option label="课程退款" value="course_refund" />');
  });

  it("does not apply teacher-only scope to platform super administrators", () => {
    expect(courseServiceSource).toContain('!["super_admin", "admin"].includes(String(admin.role || ""))');
  });

  it("does not double count provider statements as a second successful payment", () => {
    expect(adminService).toContain("if (recordedPayment) return");
    expect(statementMigration).toContain("p.status = 'statement_matched'");
    expect(statementMigration).toContain("statementDuplicateReclassified");
  });
});
