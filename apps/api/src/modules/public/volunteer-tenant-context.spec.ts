import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public volunteer tenant context", () => {
  const controller = readFileSync("src/modules/public/public.controller.ts", "utf8");
  const service = readFileSync("src/modules/public/public.service.ts", "utf8");

  it("applies the volunteer entitlement and tenant context to every public entry", () => {
    const volunteerSection = controller.slice(controller.indexOf('@Get("volunteer/tasks")'), controller.indexOf('@Get("activities")'));
    const myVolunteerSection = controller.slice(controller.indexOf('@Get("me/volunteer")'), controller.indexOf('@Get("me/registrations")'));
    expect(volunteerSection.match(/assertFeatureGateEnabled\(context, "volunteer"\)/g)).toHaveLength(6);
    expect(myVolunteerSection).toContain('assertFeatureGateEnabled(context, "volunteer")');
    for (const call of [
      "volunteerTasks(city, context)",
      "applyVolunteer(dto, await user, context)",
      "applyVolunteerTask(id, dto, await user, context)",
      "cancelVolunteerTaskApplication(id, dto, user, context)",
      "submitVolunteerAttendance(id, dto, user, context)",
      "confirmVolunteerServiceRecord(id, dto, user, context)",
      "myVolunteer(user, context)"
    ]) expect(controller).toContain(call);
  });

  it("scopes task discovery and task applications to the resolved tenant", () => {
    expect(service).toContain('builder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id })');
    expect(service).toContain('else builder.andWhere("task.tenantId IS NULL")');
    expect(service).toContain('taskBuilder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id })');
    expect(service).toContain('else taskBuilder.andWhere("task.tenantId IS NULL")');
    expect(service).toContain('leftJoin("application.task", "task").where("application.businessKey = :businessKey"');
    expect(service).toContain('Number(replay.tenantId || 0) !== Number(tenant?.id || 0)');
    const taskApply = service.slice(service.indexOf("async applyVolunteerTask"), service.indexOf("async myVolunteer"));
    expect(taskApply).toContain('accessBuilder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id })');
    expect(taskApply.indexOf("const accessibleTask = await accessBuilder.getRawOne"))
      .toBeLessThan(taskApply.indexOf("const profile = await this.upsertVolunteerProfile"));
  });

  it("scopes all personal volunteer collections to the task tenant", () => {
    for (const builder of ["applicationBuilder", "recordBuilder", "attendanceBuilder"]) {
      expect(service).toContain(`${builder}.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id })`);
      expect(service).toContain(`${builder}.andWhere("task.tenantId IS NULL")`);
    }
  });

  it("returns scalar task DTOs without exposing tenant entity relationships", () => {
    expect(service).toContain("getRawMany<any>()");
    expect(service).toContain("getRawOne<{ id: number; status: string }>()");
    expect(service).toContain('where("application.taskId = :taskId"');
    expect(service).toContain('where("application.applicationIdentityKey = :identityKey"');
    expect(service).toContain("task: this.publicVolunteerTask(row.task)");
    const taskView = service.slice(service.indexOf("private publicVolunteerTask"), service.indexOf("private publicVolunteerApplication"));
    expect(taskView).toContain("id: task.id");
    expect(taskView).not.toContain("tenant:");
    expect(taskView).not.toContain("project:");
    const volunteerSection = service.slice(service.indexOf("async volunteerTasks"), service.indexOf("private async promoteVolunteerWaitlist"));
    expect(volunteerSection).not.toContain("this.volunteerProfiles.findOne");
    expect(volunteerSection).not.toContain("this.volunteerTaskApplicationsRepo.findOne");
    expect(volunteerSection).not.toContain("applicationRepo.count({ where: { task:");
    expect(volunteerSection).not.toContain("this.volunteerTrainingRecords.find(");
    expect(volunteerSection).not.toContain("this.volunteerHourAdjustments.find(");
    expect(volunteerSection).not.toContain("this.volunteerBadgeAwards.find(");
    expect(volunteerSection).not.toContain("this.volunteerServiceProofs.find(");
  });

  it("rechecks tenant ownership for cancellation, attendance and service confirmation", () => {
    expect(service).toContain('assertTenantOwnedResourceAccess(row.task, tenant, "志愿任务报名不存在")');
    expect(service).toContain('assertTenantOwnedResourceAccess(application.task, tenant, "志愿任务报名不存在")');
    expect(service).toContain('assertTenantOwnedResourceAccess(row.task, tenant, "志愿服务记录不存在")');
    expect(service).toContain('if (!row.task) throw new NotFoundException("志愿服务记录不存在")');
  });

  it("only replays attendance after user and tenant ownership checks", () => {
    const attendance = service.slice(service.indexOf("async submitVolunteerAttendance"), service.indexOf("async confirmVolunteerServiceRecord"));
    const userCheck = attendance.indexOf("application.user?.id !== user.id");
    const tenantCheck = attendance.indexOf("assertTenantOwnedResourceAccess(application.task, tenant");
    const replay = attendance.indexOf("attendanceRepo.findOne({ where: { businessKey, application: { id } } })");
    expect(userCheck).toBeGreaterThan(-1);
    expect(tenantCheck).toBeGreaterThan(userCheck);
    expect(replay).toBeGreaterThan(tenantCheck);
  });
});
