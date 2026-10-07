import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "experience.module.ts"), "utf8");

describe("experience module contract", () => {
  it("returns the user's feedback state with their experience application", () => {
    expect(source).toContain("feedbackByApplication");
    expect(source).toContain("status: feedback.status");
    expect(source).toContain("reviewRemark: feedback.reviewRemark");
  });

  it("keeps public project visibility limited to open projects", () => {
    expect(source).toContain('status: "open"');
    expect(source).toContain("async list(code?: string)");
  });

  it("represents an unlimited quota explicitly instead of showing zero remaining", () => {
    expect(source).toContain("remaining: row.quota > 0 ? Math.max(row.quota - row.approvedCount, 0) : -1");
  });

  it("checks tenant ownership when linking an activity", () => {
    expect(source).toContain("关联活动不存在或不属于当前商家");
    expect(source).toContain("tenant: { id: tenant.id }");
  });

  it("prevents reducing quota below approved applications", () => {
    expect(source).toContain("名额不能低于已通过人数");
    expect(source).toContain("approvedCount");
  });

  it("locks the project while approving an application", () => {
    expect(source).toContain("pessimistic_write");
    expect(source).toContain("feedback_submitted");
    expect(source).toContain("不能重复占用体验名额");
  });

  it("serializes duplicate experience applications on the project row", () => {
    expect(source).toContain("async apply(projectId: number, userId: number");
    expect(source).toContain("project.tenantId = :tenantId");
    expect(source).toContain("if (exists) return exists");
  });

  it("keeps persistence uniqueness aligned with the migration", () => {
    const application = readFileSync(resolve(__dirname, "../../entities/experience-application.entity.ts"), "utf8");
    const feedback = readFileSync(resolve(__dirname, "../../entities/experience-feedback.entity.ts"), "utf8");
    expect(application).toContain("UQ_experience_application_user_project");
    expect(feedback).toContain("UQ_experience_feedback_application");
  });

  it("serializes duplicate feedback submissions on the application row", () => {
    expect(source).toContain("async feedback(applicationId: number, userId: number");
    expect(source).toContain("application.tenantId = :tenantId");
    expect(source).toContain("if (existing) return existing");
  });

  it("exposes operational conversion metrics", () => {
    expect(source).toContain("approvalRate");
    expect(source).toContain("approvedFeedbackCount");
    expect(source).toContain("openProjectCount");
  });
});
