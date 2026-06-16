import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AdminRole, normalizeAdminRole } from "./admin-roles";

function canAccess(role: string, allowed: AdminRole[]) {
  const normalized = normalizeAdminRole(role);
  if (!allowed.includes(normalized as AdminRole)) throw new ForbiddenException("当前账号无权限，请联系超级管理员");
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
});
