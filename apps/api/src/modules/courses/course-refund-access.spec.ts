import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("course refund access and cross-client consistency guard", () => {
  const publicCourses = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const coursesService = readFileSync("src/modules/courses/courses.service.ts", "utf8");
  const publicService = readFileSync("src/modules/public/public.service.ts", "utf8");
  const ordersPage = readFileSync("../mobile/src/pages/user/orders.vue", "utf8");
  const courseDetail = readFileSync("../mobile/src/pages/course/detail.vue", "utf8");
  const certificatesPage = readFileSync("../mobile/src/pages/user/certificates.vue", "utf8");

  it("serializes member refund creation and reuses active refunds", () => {
    const method = publicCourses.slice(publicCourses.indexOf("async requestCourseRefund("), publicCourses.indexOf('@Post("community/posts")'));
    expect(method).toContain("this.dataSource.transaction");
    expect(method).toContain('lock: { mode: "pessimistic_write" }');
    expect(method).toContain('["pending", "approved", "processing", "failed"]');
    expect(method).toContain("idempotent: true");
    expect(method).toContain("idempotent: false");
  });

  it("completes refunds under locks and revokes only the course entitlement", () => {
    const block = coursesService.slice(coursesService.indexOf("async reviewCourseRefund("), coursesService.indexOf("async listCourseOrders("));
    expect(block).toContain('lock: { mode: "pessimistic_write" }');
    expect(block).toContain("completeCourseRefundInTransaction");
    expect(block).toContain("otherPaidOrders > 0");
    expect(block).toContain("delete({ userId, courseId, lessonId: 0 })");
    expect(block).not.toContain("delete({userId:order.user.id,courseId:order.course.id})");
    expect(block).toContain('certificate.status = "revoked"');
  });

  it("blocks an already-open assessment after course access is revoked", () => {
    const method = publicCourses.slice(publicCourses.indexOf("async submitAssessment("), publicCourses.indexOf('@Get("course-assessment-attempts/:id")'));
    expect(method).toContain("courseId: attempt.courseId, lessonId: 0");
    expect(method).toContain("课程学习权限已失效，不能继续提交考核");
    expect(method.indexOf("hasAccess")).toBeLessThan(method.indexOf('attempt.status !== "in_progress"'));
  });

  it("exposes refund truth and refreshes member assets on every foreground return", () => {
    expect(publicService).toContain("latestRefundByOrder");
    expect(publicService).toContain("refundedAmountFen: Number(completedRefundFenByOrder.get(order.id) || 0)");
    expect(publicService).toContain("refundableAmountFen");
    expect(ordersPage).toContain("requestCourseRefund(item)");
    expect(ordersPage).toContain("退款待审核");
    expect(ordersPage).toContain("已累计退款");
    expect(ordersPage).toContain("本订单课程权益和有效证书已撤销");
    expect(courseDetail).toContain("course.owned ? \"继续观看\"");
    expect(courseDetail).toContain("onShow(() => { void loadCourse(); });");
    expect(certificatesPage).toContain("onShow(() => { void loadCertificates(); });");
    expect(publicCourses).toContain("issueBusinessKey = `course_completion:${course.id}:${userId}:${learning.id}`");
    expect(publicCourses).toContain("loadEagerRelations: false");
  });

  it("verifies revoked certificates without loading unrelated eager graphs", () => {
    const method = publicService.slice(publicService.indexOf("async verifyCertificate("), publicService.indexOf("async myCertificateDownload("));
    expect(method).toContain("loadEagerRelations: false");
    expect(method).toContain("certificateVerificationView(certificate");
  });

  it("projects course refund members and provider details through an API whitelist", () => {
    const block = coursesService.slice(coursesService.indexOf("private publicCourseRefundForAdmin("), coursesService.indexOf("private async completeCourseRefundInTransaction("));
    expect(coursesService).toContain("map((row)=>this.publicCourseRefundForAdmin(row))");
    expect(block).toContain("phone: maskPhone(row.order.user.phone)");
    expect(block).not.toContain("passwordHash");
    expect(block).not.toContain("openid");
    expect(block).not.toContain("unionid");
    expect(block).not.toContain("providerRefundPayload");
  });
});
