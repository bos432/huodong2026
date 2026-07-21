import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("course admin strict tenant scope", () => {
  const source = readFileSync("src/modules/courses/courses.service.ts", "utf8");

  it("requires exact tenant ownership for course detail access", () => {
    const block = source.slice(source.indexOf("private async assertCourseAccess"), source.indexOf("private async assertChapterAccess"));
    expect(block).toContain("admin?.tenantId && course.tenant?.id !== admin.tenantId");
    expect(block).not.toContain("assertTenantAccessForActor(course");
  });

  it("adds an exact tenant predicate while preserving platform access", () => {
    const block = source.slice(source.indexOf("private applyStrictCourseTenantScope"), source.lastIndexOf("}"));
    expect(block).toContain("applyTenantScopeToQuery");
    expect(block).toContain("if (admin?.tenantId)");
    expect(block).toContain("strictCourseTenantId: admin.tenantId");
  });

  it("uses strict scope across course administration queries", () => {
    const occurrences = source.match(/applyStrictCourseTenantScope\(/g) || [];
    expect(occurrences.length).toBeGreaterThanOrEqual(13);
    for (const marker of ["listCourses", "listCourseAssessments", "listAssessmentAttempts", "listCourseOrders", "runCourseLearningReminders"]) {
      const start = source.indexOf(`async ${marker}`);
      const end = source.indexOf("\n  async ", start + 8);
      expect(source.slice(start, end > start ? end : undefined)).toContain("applyStrictCourseTenantScope");
    }
  });

  it("calculates course gross, completed refunds, and signed net amount within the same scope", () => {
    const block = source.slice(source.indexOf("async coursesOverview"), source.indexOf("async communityOverview"));
    expect(block).toContain("scopedCourseOrderQuery(admin, query.tenantId)");
    expect(block).toContain("scopedCourseRefundQuery(admin, query.tenantId)");
    expect(block).toContain("CourseOrderStatus.PartiallyRefunded");
    expect(block).toContain("CourseOrderStatus.Refunded");
    expect(block).toContain('completedRefundStatus: "completed"');
    expect(block).toContain("const netAmountFen = grossAmountFen - refundAmountFen");
  });

  it("enforces an optional linked-teacher scope in collection and detail paths", () => {
    expect(source).toContain('admin.permissions?.includes("course.teacher_scope")');
    expect(source).toContain("scoped_course_teacher.adminUserId = :courseTeacherAdminId");
    expect(source).toContain("course.teacher?.id !== ownTeacher.id");
    expect(source).toContain("讲师账号只能维护本人课程");
    expect(source).toContain("当前账号未绑定启用的讲师档案");
  });

  it("returns only safe account fields for teacher bindings", () => {
    const projection = source.slice(source.indexOf("private publicCourseTeacher"), source.lastIndexOf("}"));
    expect(projection).toContain("username: teacher.adminUser.username");
    expect(projection).not.toContain("passwordHash");
  });

  it("provides course-scoped member level options without requiring member access", () => {
    const serviceBlock = source.slice(source.indexOf("async listCourseMemberLevelOptions"), source.indexOf("async saveCourseTeacher"));
    const page = readFileSync("../admin/src/views/Courses.vue", "utf8");
    expect(serviceBlock).toContain("memberLevelScopeKey({ id: targetTenantId })");
    expect(serviceBlock).toContain("id: level.id, name: level.name, sortOrder: level.sortOrder, tenantId: level.tenant?.id || null");
    expect(page).toContain('api.get<any, any[]>("/admin/course-member-level-options", { params })');
    expect(page).not.toContain('api.get<any, any[]>("/admin/member-levels"');
  });

  it("provides course-level money and completion drilldowns under the same course access boundary", () => {
    const insightBlock = source.slice(source.indexOf("async courseInsights"), source.indexOf("async communityOverview"));
    expect(insightBlock.match(/assertCourseAccess\(courseId, admin\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(insightBlock).toContain("const summary = await this.courseInsights(courseId, admin)");
    expect(insightBlock).toContain("await this.listCourseLearners(courseId");
    expect(insightBlock).toContain("grossAmountFen - refundAmountFen");
    expect(insightBlock).toContain("completedLearnerCount / learnerCount");
    expect(insightBlock).toContain("phone: maskPhone(row.phone)");
    expect(insightBlock).toContain("first.total > 10000");
    expect(insightBlock).toContain('workbook.addWorksheet("课程汇总"');
    expect(insightBlock).toContain('workbook.addWorksheet("学员明细"');
  });

  it("shows scoped insight controls and hides exports without course export permission", () => {
    const page = readFileSync("../admin/src/views/Courses.vue", "utf8");
    expect(page).toContain('const canExportCourse = hasPermission("course.export")');
    expect(page).toContain('@click="openCourseInsights(row)"');
    expect(page).toContain('v-if="canExportCourse" :loading="courseInsightsExporting"');
    expect(page).toContain("/insights/export?");
  });
});
