import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("community learning tenant context", () => {
  const source = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const service = readFileSync("src/modules/courses/courses.service.ts", "utf8");
  const appModule = readFileSync("src/modules/app.module.ts", "utf8");
  const dataSource = readFileSync("src/data-source.ts", "utf8");
  const method = (name: string, next: string) => source.slice(source.indexOf(`async ${name}`), source.indexOf(next, source.indexOf(`async ${name}`)));

  it("keeps general daily check-ins separate from program tasks", () => {
    const today = method("getTodayCheckin", '@Post("checkin/today/complete")');
    const complete = method("completeTodayCheckin", '@Get("community/activities/:id/program")');
    expect(today).toContain("await this.assertCommunityEnabled(req, tenantCode)");
    expect(today).toContain("this.countTaskCheckins(task.id, tenant)");
    expect(complete).toContain("activityId: IsNull()");
    expect(complete).toContain("this.findUserTaskCheckin(userId, lockedTask.id, today, tenant, checkinRepo)");
    const helpers = source.slice(source.indexOf("private findTodayCheckinTask"), source.indexOf("private async hasCourseAccess"));
    expect(helpers).toContain('task.activityId IS NULL');
    expect(helpers).toContain('checkin.activityId IS NULL');
    expect(helpers).toContain('checkin.taskId = :taskId');
  });

  it("scopes program detail, join and check-in submission to the active tenant", () => {
    for (const [name, next] of [
      ["communityProgram", '@Post("community/activities/:id/join")'],
      ["joinCommunityProgram", '@Post("community/activities/:id/checkins")'],
      ["submitProgramCheckin", "private applyTenantOrGlobalAliasScope"]
    ]) {
      const block = method(name, next);
      expect(block).toContain('@Query("tenantCode") tenantCode?: string');
      expect(block).toContain("await this.assertCommunityEnabled(req, tenantCode)");
      expect(block).toContain("await this.resolveTenant(req, tenantCode)");
      expect(block).toContain("this.exactTenantWhere(");
    }
  });

  it("serializes task counters and makes repeated program submissions idempotent", () => {
    const submit = method("submitProgramCheckin", "private applyTenantOrGlobalAliasScope");
    expect(submit).toContain("this.dataSource.transaction");
    expect(submit).toContain('if (!activity) throw new NotFoundException("共学活动不存在")');
    expect(submit).toContain('lock: { mode: "pessimistic_write" }');
    expect(submit).toContain('row && row.status !== "rejected"');
    expect(submit).toContain("idempotent: true");
    expect(submit).toContain("Object.assign(row, values)");
    expect(submit).toContain('status: "approved"');
    expect(submit).toContain("task.completedCount = await checkinRepo.count");
  });

  it("returns explicit public views without invite codes or tenant graphs", () => {
    const views = source.slice(source.indexOf("private publicCommunityActivity"), source.indexOf("private applyTenantOrGlobalScope"));
    expect(views).toContain("private publicCommunityMembership");
    expect(views).toContain("private publicCheckinTask");
    expect(views).toContain("private publicCommunityCheckin");
    expect(views).not.toContain("inviteCode:");
    expect(views).not.toContain("tenant:");
    expect(views).not.toContain("userId:");
  });

  it("uses an exact global-or-tenant predicate instead of an unscoped fallback", () => {
    const exactScope = source.slice(source.indexOf("private exactTenantWhere"), source.indexOf("private courseBelongsToTenant"));
    expect(exactScope).toContain("tenant ? { id: tenant.id } : IsNull()");
  });

  it("recalculates approved task totals when an administrator reviews a check-in", () => {
    const review = service.slice(service.indexOf("async reviewCommunityCheckin"), service.indexOf("async listForumTopics", service.indexOf("async reviewCommunityCheckin")));
    expect(review).toContain("this.dataSource.transaction");
    expect(review).toContain('lock: { mode: "pessimistic_write" }');
    expect(review).toContain('checkin.status = :status');
    expect(review).toContain("task.completedCount = await countBuilder.getCount()");
  });

  it("preserves MySQL DATE columns as date-only strings in runtime and migrations", () => {
    expect(appModule).toContain('dateStrings: ["DATE"]');
    expect(dataSource).toContain('dateStrings: ["DATE"]');
  });
});
