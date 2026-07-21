import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("content appeal idempotency and long-tail state", () => {
  const controller = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const courseService = readFileSync("src/modules/courses/courses.service.ts", "utf8");
  const publicService = readFileSync("src/modules/public/public.service.ts", "utf8");
  const entity = readFileSync("src/entities/content-appeal.entity.ts", "utf8");
  const migration = readFileSync("src/migrations/1783790000000-ContentAppealIdempotency.ts", "utf8");

  it("adds reversible unique request and pending identity keys", () => {
    expect(entity).toContain('businessKey!: string');
    expect(entity).toContain('pendingKey!: string | null');
    expect(migration).toContain('UQ_content_appeal_business_key');
    expect(migration).toContain('UQ_content_appeal_pending_key');
    expect(migration).toContain('changeColumn("content_appeals", "businessKey"');
    expect(migration).toContain('dropColumn("content_appeals", "pendingKey")');
    expect(migration).toContain('dropColumn("content_appeals", "businessKey")');
  });

  it("replays identical requests and concurrent pending identities", () => {
    const submit = controller.slice(controller.indexOf("async submitContentAppeal"), controller.indexOf("private applyTenantOrGlobalAliasScope"));
    expect(submit).toContain('req.headers?.["x-idempotency-key"]');
    expect(submit).toContain('const businessKey = `content-appeal:');
    expect(submit).toContain('const pendingKey = `content-appeal-pending:');
    expect(submit).toContain('findOneBy({ businessKey })');
    expect(submit).toContain('findOneBy({ pendingKey })');
    expect(submit).toContain('if (!this.isDuplicateKeyError(error)) throw error');
    expect(submit).toContain('idempotent: true');
  });

  it("hides internal tenant, operator and idempotency fields from member responses", () => {
    const views = controller.slice(controller.indexOf("private publicContentSanction"), controller.indexOf("private applyTenantOrGlobalScope"));
    expect(views).toContain("private publicContentAppeal");
    for (const field of ["tenant:", "userId:", "issuedByAdminId:", "handledByAdminId:", "businessKey:", "pendingKey:"]) {
      expect(views).not.toContain(field);
    }
    expect(controller).toContain("map((row) => this.publicContentSanction(row))");
    expect(controller).toContain("map((row) => this.publicContentAppeal(row))");
  });

  it("releases the pending identity after an administrator resolves an appeal", () => {
    const review = courseService.slice(courseService.indexOf("async reviewContentAppeal"), courseService.indexOf("private scopedCourseQuery"));
    expect(review).toContain("row.pendingKey = null");
    expect(review.indexOf("row.pendingKey = null")).toBeLessThan(review.indexOf("this.contentAppeals.save(row)"));
  });

  it("serializes course favorite toggles with the existing unique constraint", () => {
    const toggle = publicService.slice(publicService.indexOf("async toggleFavoriteCourse"), publicService.indexOf("async updateMyProfile"));
    expect(toggle).toContain("this.dataSource.transaction");
    expect(toggle).toContain('lock: { mode: "pessimistic_write" }');
    expect(toggle).toContain("manager.getRepository(UserFavorite)");
    expect(toggle).toContain("this.isDuplicateKeyError(error)");
  });
});
