import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { applyTenantScopeToQuery, assertTenantAccessForActor, tenantRelationForActor } from "../../shared/tenant-scope";
import { AdminRole } from "./admin-roles";

describe("admin tenant scope", () => {
  it("adds tenant filter for tenant-scoped admins", () => {
    const admin = { id: 1, role: AdminRole.Operator, tenantId: 10 };
    const builder = { andWhere: vi.fn() };

    applyTenantScopeToQuery(builder, "activity", admin);

    expect(builder.andWhere).toHaveBeenCalledWith("activity.tenantId = :tenantId", { tenantId: 10 });
  });

  it("keeps tenant-bound super admins scoped to their tenant", () => {
    const admin = { id: 1, role: AdminRole.SuperAdmin, tenantId: 10 };
    const builder = { andWhere: vi.fn() };

    applyTenantScopeToQuery(builder, "activity", admin);

    expect(builder.andWhere).toHaveBeenCalledWith("activity.tenantId = :tenantId", { tenantId: 10 });
  });

  it("keeps platform super admins global when tenantId is empty", () => {
    const admin = { id: 1, role: AdminRole.SuperAdmin, tenantId: null };
    const builder = { andWhere: vi.fn() };

    applyTenantScopeToQuery(builder, "activity", admin);

    expect(builder.andWhere).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant resource access", () => {
    const admin = { id: 1, role: AdminRole.Finance, tenantId: 10 };
    const row = { tenant: { id: 20 } };

    expect(() => assertTenantAccessForActor(row, admin)).toThrow(NotFoundException);
  });

  it("allows same-tenant resources and nullable legacy tenant rows", () => {
    const admin = { id: 1, role: AdminRole.Operator, tenantId: 10 };

    expect(() => assertTenantAccessForActor({ tenant: { id: 10 } }, admin)).not.toThrow();
    expect(() => assertTenantAccessForActor({ tenant: null }, admin)).not.toThrow();
    expect(() => assertTenantAccessForActor({}, admin)).not.toThrow();
  });

  it("uses current admin tenant as write relation for tenant admins", () => {
    const admin = { id: 1, role: AdminRole.Operator, tenantId: 10 };

    expect(tenantRelationForActor(admin, { id: 99 })).toEqual({ id: 10 });
  });
});
