import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("tenant member level governance contract", () => {
  const levelEntity = read("src/entities/member-level.entity.ts");
  const profileEntity = read("src/entities/member-profile.entity.ts");
  const historyEntity = read("src/entities/member-level-change.entity.ts");
  const admin = read("src/modules/admin/admin.service.ts");
  const publicService = read("src/modules/public/public.service.ts");
  const mall = read("src/modules/mall/mall.service.ts");
  const courses = read("src/modules/courses/courses.service.ts");
  const migration = read("src/migrations/1783870000000-MemberLevelTenantGovernance.ts");
  const memberPage = read("../admin/src/views/Members.vue");

  it("scopes level names and keeps template lineage", () => {
    expect(levelEntity).toContain('@Unique(["tenantScopeKey", "name"])');
    expect(levelEntity).toContain("tenant!: Tenant | null");
    expect(levelEntity).toContain("templateLevel!: MemberLevel | null");
    expect(levelEntity).toContain("templateLevelId!: number | null");
    expect(levelEntity).toContain("version!: number");
  });

  it("stores entitlement snapshots and immutable level transitions", () => {
    expect(profileEntity).toContain("levelSnapshot!: Record<string, unknown> | null");
    expect(historyEntity).toContain('@Entity("member_level_changes")');
    expect(historyEntity).toContain("fromLevel!: MemberLevel | null");
    expect(historyEntity).toContain("toLevel!: MemberLevel | null");
    expect(historyEntity).toContain("benefitSnapshot!: Record<string, unknown> | null");
    expect(migration).toContain("@member_level_operator_admin_id");
    expect(migration).toContain("@member_level_reason");
  });

  it("resolves automatic levels inside the member tenant scope", () => {
    expect(admin).toContain("resolveMemberLevel(row.growthValue, tenant)");
    expect(publicService).toContain("resolveMemberLevel(profile.growthValue, tenant)");
    expect(mall).toContain("resolveMallMemberLevel(profile.growthValue, tenant)");
    for (const source of [admin, publicService, mall]) expect(source).toContain("tenantScopeKey: memberLevelScopeKey(tenant)");
  });

  it("blocks cross-tenant level selections in business configuration", () => {
    expect(admin).toContain("会员等级不存在、已停用或不属于所选商家");
    expect(admin).toContain("公告受众包含不存在、已停用或不属于当前商家的会员等级");
    expect(admin).toContain("广告受众包含不存在、已停用或不属于当前商家的会员等级");
    expect(admin).toContain("营销弹窗受众包含不存在、已停用或不属于当前商家的会员等级");
    expect(courses).toContain("会员等级不存在或不属于当前商家");
  });

  it("keeps activity editor options aligned with each selected tenant", () => {
    const activities = read("../admin/src/views/Activities.vue");
    const mobileActivityEditor = read("../mobile/src/pages/admin/activity/edit.vue");
    expect(admin).toContain("this.activityManagementOptions(admin)");
    expect(admin).toContain("private applyActivityOptionScope");
    expect(admin).toContain("const where = this.isTenantScoped(admin)");
    expect(activities).toContain("return tenantId ? !optionTenantId || optionTenantId === tenantId : !optionTenantId;");
    expect(mobileActivityEditor).toContain("const availableCategories");
    expect(mobileActivityEditor).toContain("const availableMemberLevels");
    expect(mobileActivityEditor).toContain("watch(selectedTenantId");
  });

  it("uses frozen entitlements for pricing and course access", () => {
    expect(publicService).toContain("memberLevelSnapshotData?.discountRate");
    expect(publicService).toContain("levelSnapshot?.sortOrder");
    expect(publicService).toContain("levelSnapshot?.benefits");
    expect(publicService).toContain("memberLevel: quote.memberLevelSnapshot");
    expect(publicService).toContain("businessSnapshot: courseOrderSnapshot");
    expect(publicService).toContain("requiredMemberLevel: memberLevelSnapshot(course.requiredMemberLevel)");
    expect(publicService).toContain("memberLevel: currentMemberLevelSnapshot");
  });

  it("supports audited manual changes and tenant instance management", () => {
    expect(admin).toContain("async adjustMemberLevel(");
    expect(admin).toContain("SET @member_level_source = ?, @member_level_reason = ?, @member_level_operator_admin_id = ?");
    expect(admin).toContain("levelChanges: payload.levelChanges.map");
    expect(memberPage).toContain("levelScopeTenantId");
    expect(memberPage).toContain("等级历史");
    expect(memberPage).toContain("/level`");
    for (const source of [admin, publicService, mall]) expect(source).toContain("manualLevelOverrideActive");
  });
});
