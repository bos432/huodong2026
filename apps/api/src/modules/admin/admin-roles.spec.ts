import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { defaultPermissionsForRole, effectivePermissionsForAdmin } from "./admin-permissions";
import { AdminRole, normalizeAdminRole } from "./admin-roles";
import { adminSessionVersionMatches } from "./admin-session";

function canAccess(role: string, allowed: AdminRole[]) {
  const normalized = normalizeAdminRole(role);
  if (!allowed.includes(normalized as AdminRole)) throw new ForbiddenException("当前账号无权限，请联系超级管理员");
  return true;
}

function canOperatePlatformWallet(role: string, tenantId?: number | null) {
  if (normalizeAdminRole(role) !== AdminRole.SuperAdmin || tenantId) throw new ForbiddenException("Only platform super admin can operate");
  return true;
}

describe("admin role permissions", () => {
  it("treats legacy admin role as super admin", () => {
    expect(normalizeAdminRole("admin")).toBe(AdminRole.SuperAdmin);
    expect(canAccess("admin", [AdminRole.SuperAdmin])).toBe(true);
  });

  it("blocks operator from finance endpoints", () => {
    expect(() => canAccess(AdminRole.Operator, [AdminRole.SuperAdmin, AdminRole.Finance])).toThrow("当前账号无权限");
  });

  it("blocks finance from system settings", () => {
    expect(() => canAccess(AdminRole.Finance, [AdminRole.SuperAdmin])).toThrow("当前账号无权限");
  });

  it("allows check-in staff only for check-in scope", () => {
    expect(canAccess(AdminRole.CheckInStaff, [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.CheckInStaff])).toBe(true);
    expect(() => canAccess(AdminRole.CheckInStaff, [AdminRole.SuperAdmin, AdminRole.Operator])).toThrow("当前账号无权限");
  });

  it("allows homepage builder only for operation roles", () => {
    const operationRoles = [AdminRole.SuperAdmin, AdminRole.Operator];
    expect(canAccess(AdminRole.SuperAdmin, operationRoles)).toBe(true);
    expect(canAccess(AdminRole.Operator, operationRoles)).toBe(true);
    expect(() => canAccess(AdminRole.Finance, operationRoles)).toThrow("当前账号无权限");
    expect(() => canAccess(AdminRole.CheckInStaff, operationRoles)).toThrow("当前账号无权限");
  });

  it("allows finance to read merchant overview without operation permissions", () => {
    const overviewRoles = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance];
    const operationRoles = [AdminRole.SuperAdmin, AdminRole.Operator];
    expect(canAccess(AdminRole.Finance, overviewRoles)).toBe(true);
    expect(() => canAccess(AdminRole.Finance, operationRoles)).toThrow(ForbiddenException);
  });

  it("allows finance and check-in staff to read registrations but not operate them", () => {
    const registrationViewRoles = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff];
    const operationRoles = [AdminRole.SuperAdmin, AdminRole.Operator];
    expect(canAccess(AdminRole.Finance, registrationViewRoles)).toBe(true);
    expect(() => canAccess(AdminRole.Finance, operationRoles)).toThrow("当前账号无权限");
    expect(canAccess(AdminRole.CheckInStaff, registrationViewRoles)).toBe(true);
    expect(() => canAccess(AdminRole.CheckInStaff, operationRoles)).toThrow("当前账号无权限");
  });

  it("allows only platform super admin to operate user wallet balance", () => {
    expect(canOperatePlatformWallet(AdminRole.SuperAdmin, null)).toBe(true);
    expect(() => canOperatePlatformWallet(AdminRole.SuperAdmin, 10)).toThrow("Only platform super admin");
    expect(() => canOperatePlatformWallet(AdminRole.Finance, null)).toThrow("Only platform super admin");
    expect(() => canOperatePlatformWallet(AdminRole.Operator, null)).toThrow("Only platform super admin");
  });

  it("invalidates old admin tokens after the account session version changes", () => {
    expect(adminSessionVersionMatches(3, 3)).toBe(true);
    expect(adminSessionVersionMatches(2, 3)).toBe(false);
    expect(adminSessionVersionMatches(undefined, 0)).toBe(false);
  });

  it("does not grant platform settlement operations to tenant finance accounts", () => {
    expect(defaultPermissionsForRole(AdminRole.Finance, false)).toContain("mall.settlement.manage");
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).not.toContain("mall.settlement.manage");
    expect(effectivePermissionsForAdmin({ role: AdminRole.Finance, tenantId: 23, permissions: ["mall.finance.view", "mall.settlement.manage"] })).toEqual([
      "mall.finance.view",
      "mall.merchant.view",
      "mall.order.view"
    ]);
  });

  it("expands mall management permissions with the minimum read dependencies", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["mall.order.manage"] })).toEqual([
      "mall.order.manage",
      "mall.merchant.view",
      "mall.order.view"
    ]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Finance, tenantId: 23, permissions: ["mall.refund.manage"] })).toEqual([
      "mall.refund.manage",
      "mall.merchant.view",
      "mall.order.view",
      "mall.finance.view"
    ]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Finance, tenantId: 23, permissions: ["mall.payment.manage"] })).toEqual([
      "mall.payment.manage",
      "mall.merchant.view",
      "mall.finance.view",
      "mall.order.view"
    ]);
  });

  it("keeps support read, handling, and sensitive permissions independently assignable", () => {
    expect(defaultPermissionsForRole(AdminRole.Operator, true)).toEqual(expect.arrayContaining(["support.view", "support.manage", "support.sensitive"]));
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).toContain("support.view");
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).not.toContain("support.manage");
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).not.toContain("support.sensitive");
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["support.manage"] })).toEqual(["support.manage", "support.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["support.sensitive"] })).toEqual(["support.sensitive", "support.view"]);
  });

  it("keeps analytics viewing, exports, and recomputation independently assignable", () => {
    expect(defaultPermissionsForRole(AdminRole.Operator, true)).toEqual(expect.arrayContaining(["analytics.view", "analytics.export", "analytics.manage"]));
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).toEqual(expect.arrayContaining(["analytics.view", "analytics.export"]));
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).not.toContain("analytics.manage");
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["analytics.export"] })).toEqual(["analytics.export", "analytics.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["analytics.manage"] })).toEqual(["analytics.manage", "analytics.view"]);
  });

  it("keeps payment account viewing, maintenance, and sensitive disclosure independently assignable", () => {
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).toContain("payment_account.view");
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).not.toContain("payment_account.manage");
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).not.toContain("payment_account.sensitive");
    expect(effectivePermissionsForAdmin({ role: AdminRole.Finance, tenantId: 23, permissions: ["payment_account.manage"] })).toEqual(["payment_account.manage", "payment_account.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Finance, tenantId: 23, permissions: ["payment_account.sensitive"] })).toEqual(["payment_account.sensitive", "payment_account.view"]);
  });

  it("keeps agent settlement actions independently assignable while inheriting viewing", () => {
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).toEqual(expect.arrayContaining(["agent_settlement.view", "agent_settlement.manage", "agent_settlement.pay", "agent_settlement.transfer", "agent_settlement.sensitive", "agent_settlement.export"]));
    for (const permission of ["agent_settlement.manage", "agent_settlement.pay", "agent_settlement.transfer", "agent_settlement.sensitive", "agent_settlement.export"]) {
      expect(effectivePermissionsForAdmin({ role: AdminRole.Finance, tenantId: 23, permissions: [permission] })).toEqual([permission, "agent_settlement.view"]);
    }
    expect(effectivePermissionsForAdmin({ role: AdminRole.Finance, tenantId: 23, permissions: ["agent_settlement.view"] })).toEqual(["agent_settlement.view"]);
  });

  it("keeps member center actions independently assignable while inheriting viewing", () => {
    expect(defaultPermissionsForRole(AdminRole.Operator, true)).toEqual(expect.arrayContaining(["member.view", "member.manage", "member.password", "member.points.manage", "member.lifecycle.manage", "member.export"]));
    expect(defaultPermissionsForRole(AdminRole.Operator, true)).not.toContain("member.sensitive");
    for (const permission of ["member.manage", "member.password", "member.points.manage", "member.lifecycle.manage", "member.sensitive", "member.export"] as const) {
      expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: [permission] })).toEqual([permission, "member.view"]);
    }
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["member.view"] })).toEqual(["member.view"]);
  });

  it("keeps business job viewing and handling independently assignable", () => {
    expect(defaultPermissionsForRole(AdminRole.Operator, true)).toEqual(expect.arrayContaining(["business_job.view", "business_job.manage"]));
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).toContain("business_job.view");
    expect(defaultPermissionsForRole(AdminRole.Finance, true)).not.toContain("business_job.manage");
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["business_job.manage"] })).toEqual(["business_job.manage", "business_job.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Finance, tenantId: 23, permissions: ["business_job.view"] })).toEqual(["business_job.view"]);
  });

  it("keeps admin account viewing, maintenance, and security operations independently assignable", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["admin.view"] })).toEqual(["admin.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["admin.manage"] })).toEqual(["admin.manage", "admin.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["admin.security.manage"] })).toEqual(["admin.security.manage", "admin.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["admin.manage"] })).toEqual(["admin.manage", "admin.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["admin.security.manage"] })).toEqual(["admin.security.manage", "admin.view"]);
  });

  it("keeps operation and platform security log permissions read-first and independently assignable", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["logs.sensitive"] })).toEqual(["logs.sensitive", "logs.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["logs.export"] })).toEqual(["logs.export", "logs.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["security_log.sensitive"] })).toEqual(["security_log.sensitive", "security_log.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["security_log.export"] })).toEqual(["security_log.export", "security_log.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["security_log.view", "security_log.sensitive", "security_log.export"] })).toEqual([]);
  });

  it("keeps activity category and ticket maintenance read-first", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["category.manage"] })).toEqual(["category.manage", "category.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["ticket.manage"] })).toEqual(["ticket.manage", "ticket.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["activity.manage"] })).toEqual(["activity.manage", "activity.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["category.view", "ticket.view"] })).toEqual(["category.view", "ticket.view"]);
  });

  it("keeps coupon and redemption code viewing, maintenance, and exports independently assignable", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["coupon.manage"] })).toEqual(["coupon.manage", "coupon.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["coupon.export"] })).toEqual(["coupon.export", "coupon.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["redemption_code.manage"] })).toEqual(["redemption_code.manage", "redemption_code.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["redemption_code.export"] })).toEqual(["redemption_code.export", "redemption_code.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["coupon.view", "redemption_code.view"] })).toEqual(["coupon.view", "redemption_code.view"]);
  });

  it("keeps platform and tenant configuration permissions scoped and read-first", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["system.manage"] })).toEqual(["system.manage", "system.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["system.view", "system.manage"] })).toEqual([]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["operation_settings.manage"] })).toEqual(["operation_settings.manage", "operation_settings.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["operation_settings.view"] })).toEqual(["operation_settings.view"]);
  });

  it("keeps mini program release permissions platform-scoped and read-first", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["miniprogram_release.manage"] })).toEqual(["miniprogram_release.manage", "miniprogram_release.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["miniprogram_release.view"] })).toEqual(["miniprogram_release.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["miniprogram_release.view", "miniprogram_release.manage"] })).toEqual([]);
  });

  it("keeps notification capabilities independently assignable with legacy management compatibility", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["notification.template.manage"] })).toEqual(["notification.template.manage", "notification.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["notification.send"] })).toEqual(["notification.send", "notification.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["notification.preference.manage"] })).toEqual(["notification.preference.manage", "notification.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["notification.sensitive"] })).toEqual(["notification.sensitive", "notification.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["notification.manage"] })).toEqual([
      "notification.manage",
      "notification.view",
      "notification.template.manage",
      "notification.send",
      "notification.preference.manage"
    ]);
  });

  it("keeps announcement viewing independently assignable from maintenance", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["announcement.view"] })).toEqual(["announcement.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["announcement.manage"] })).toEqual(["announcement.manage", "announcement.view"]);
  });

  it("keeps marketing popup viewing independently assignable from maintenance", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["marketing_popup.view"] })).toEqual(["marketing_popup.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["marketing_popup.manage"] })).toEqual(["marketing_popup.manage", "marketing_popup.view"]);
  });

  it("keeps ambassador viewing, management, sensitive disclosure, and exports independently assignable", () => {
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["ambassador.manage"] })).toEqual(["ambassador.manage", "ambassador.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["ambassador.sensitive"] })).toEqual(["ambassador.sensitive", "ambassador.view"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: null, permissions: ["ambassador.export"] })).toEqual(["ambassador.export", "ambassador.view", "ambassador.sensitive"]);
    expect(effectivePermissionsForAdmin({ role: AdminRole.Operator, tenantId: 23, permissions: ["ambassador.manage", "ambassador.sensitive", "ambassador.export"] })).toEqual([]);
  });
});
