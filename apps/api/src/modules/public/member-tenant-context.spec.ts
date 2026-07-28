import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("member tenant context and login recovery", () => {
  const controller = readFileSync("src/modules/public/public.controller.ts", "utf8");
  const service = readFileSync("src/modules/public/public.service.ts", "utf8");
  const featureGates = readFileSync("../mobile/src/feature-gates.ts", "utf8");
  const decoration = readFileSync("../mobile/src/decoration.ts", "utf8");
  const theme = readFileSync("../mobile/src/theme.ts", "utf8");
  const loginRedirect = readFileSync("../mobile/src/login-redirect.ts", "utf8");
  const loginPage = readFileSync("../mobile/src/pages/user/login.vue", "utf8");
  const tenantLoadGuard = readFileSync("../mobile/src/tenant-load-guard.ts", "utf8");
  const mobileApi = readFileSync("../mobile/src/api.ts", "utf8");
  const memberOrderOverview = readFileSync("../mobile/src/member-order-overview.ts", "utf8");
  const memberPages = ["my.vue", "orders.vue", "courses.vue", "wallet.vue", "certificates.vue", "mall-orders.vue"]
    .map((name) => readFileSync(`../mobile/src/pages/user/${name}`, "utf8"));

  it("replaces stale tenant codes and preserves safe redirect query values", () => {
    expect(loginRedirect).toContain('if (!key || key === "tenantCode") continue');
    expect(loginRedirect).toContain("if (tenantCode) params.tenantCode = tenantCode");
    expect(loginRedirect).toContain("PAGE_PATH_PATTERN.test(path)");
    expect(loginRedirect).toContain("path === LOGIN_PAGE_URL");
    expect(loginPage).toContain("normalizeLoginRedirectTarget(options.redirect, getCurrentTenantCode())");
    expect(loginPage).toContain("uni.reLaunch({ url: target })");
    expect(mobileApi).toContain("const hashParams = new URLSearchParams");
    expect(mobileApi).toContain("hashParams.set(\"tenantCode\", code)");
  });

  it("rejects responses from an older tenant or older request generation", () => {
    expect(tenantLoadGuard).toContain("token.id === latestId");
    expect(tenantLoadGuard).toContain("token.tenantCode === readTenantCode()");
    expect(tenantLoadGuard).toContain("id: ++latestId");
  });

  it("scopes certificates, downloads, favorites and profile mutation responses", () => {
    expect(controller).toContain("this.service.myCertificates(user, this.tenantContext(req, tenantCode))");
    expect(controller).toContain("this.service.myCertificateDownload(user, id, this.tenantContext(req, tenantCode))");
    expect(controller).toContain("this.service.myFavoriteCourses(user, this.tenantContext(req, tenantCode))");
    expect(controller).toContain("this.service.toggleFavoriteCourse(id, user, this.tenantContext(req, tenantCode))");
    expect(controller).toContain("this.service.updateMyProfile(user, dto, this.tenantContext(req, tenantCode))");
    expect(service).toContain("tenantId: tenant?.id ?? IsNull()");
    expect(service).toContain("this.tenantCourseWhere({ id: In(rows.map((row) => row.courseId)), status: \"published\" }, tenant)");
    expect(service).toContain("return this.myProfile(await this.users.save(row), context)");
  });

  it("prevents old tenant configuration and member assets from overwriting current state", () => {
    expect(featureGates).toContain("loadingRequest?.tenantCode === tenantCode");
    expect(featureGates).toContain("getCurrentTenantCode() === tenantCode");
    expect(decoration).toContain("createTenantLoadGuard");
    expect(theme).toContain("tenantCode !== getCurrentTenantCode()");
    for (const page of memberPages) expect(page).toContain("createTenantLoadGuard");
    expect(mobileApi).toContain("options.tenantCode === undefined ? getCurrentTenantCode()");
    expect(memberOrderOverview).toContain("tenantCode: session.tenantCode");
    expect(memberOrderOverview).toContain("userToken: session.userToken");
    expect(memberOrderOverview).toContain("responseTenantCode !== session.tenantCode");
  });

  it("keeps public member refresh growth and business totals in the active tenant", () => {
    expect(service).toContain('const tenantFilter = tenant ? " = :memberTenantId" : " IS NULL"');
    expect(service).toContain('andWhere(`r.tenantId${tenantFilter}`');
    expect(service).toContain('andWhere(`o.tenantId${tenantFilter}`');
    expect(service).toContain('profile.growthValue = Number(growthSum?.sum || 0)');
    expect(service).toContain('andWhere("(:growthCycle IS NULL OR p.createdAt >= :growthCycle)"');
  });
});
