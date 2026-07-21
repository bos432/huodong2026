import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public course tenant context", () => {
  const source = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const method = (name: string, next: string) => source.slice(source.indexOf(`async ${name}`), source.indexOf(next, source.indexOf(`async ${name}`)));

  it("scopes assessment start, submit and result to the active tenant", () => {
    const start = method("startAssessment", '@Post("course-assessment-attempts/:id/submit")');
    const submit = method("submitAssessment", '@Get("course-assessment-attempts/:id")');
    const result = method("assessmentAttemptResult", '@Get("courses/:id/reviews")');
    for (const block of [start, submit, result]) {
      expect(block).toContain('@Query("tenantCode") tenantCode?: string');
      expect(block).toContain("await this.resolveTenant(req, tenantCode)");
      expect(block).toContain("this.assessmentBelongsToTenant(assessment, tenant)");
    }
    expect(submit).toContain("attempt.courseId !== assessment.course.id");
    expect(result).toContain("attempt.courseId !== assessment.course.id");
  });

  it("scopes learner reviews, questions and announcements to the active tenant", () => {
    for (const [name, next] of [
      ["submitCourseReview", '@Get("courses/:id/qa")'],
      ["courseQaList", '@Post("courses/:id/qa")'],
      ["submitCourseQa", '@Get("courses/:id/announcements")'],
      ["learnerCourseAnnouncements", '@Post("course-orders/:id/refunds")']
    ]) {
      const block = method(name, next);
      expect(block).toContain('@Query("tenantCode") tenantCode?:string');
      expect(block).toContain("await this.resolveTenant(req,tenantCode)");
      expect(block).toContain("this.tenantWhere({id},tenant)");
    }
  });

  it("rejects course refunds outside the current tenant", () => {
    const refund = method("requestCourseRefund", '@Post("community/posts")');
    expect(refund).toContain('@Query("tenantCode") tenantCode?: string');
    expect(refund).toContain("await this.resolveTenant(req, tenantCode)");
    expect(refund).toContain("!this.courseBelongsToTenant(order.course, tenant)");
  });

  it("requires direct and assessment tenant ownership to agree", () => {
    const helper = source.slice(source.indexOf("private courseBelongsToTenant"), source.indexOf("private applyTenantOrGlobalScope"));
    expect(helper).toContain("course?.tenant?.id || null");
    expect(helper).toContain("assessment.tenant?.id");
    expect(helper).toContain("assessment.course?.tenant?.id");
    expect(helper).toContain("tenantIds.every((value) => value === tenant.id)");
  });

  it("returns assessment DTOs without tenant or course entity snapshots", () => {
    expect(source).toContain("...this.publicCourseAssessment(row)");
    expect(source).toContain("assessment: this.publicCourseAssessment(assessment)");
    const view = source.slice(source.indexOf("private publicCourseAssessment"), source.indexOf("private applyTenantOrGlobalScope"));
    expect(view).toContain("courseId: assessment.course.id");
    expect(view).not.toContain("tenant:");
    expect(view).not.toContain("course:");
  });
});
