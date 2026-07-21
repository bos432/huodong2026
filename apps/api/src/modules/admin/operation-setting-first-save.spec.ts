import { describe, expect, it, vi } from "vitest";
import { loadOperationSettingTenantForCreate } from "./operation-setting-tenant";

describe("operation setting first save", () => {
  it("hydrates the tenant before creating its first operation setting", async () => {
    const tenant = { id: 40, code: "tenant-a", enabled: true, settings: null };
    const loadTenant = vi.fn().mockResolvedValue(tenant);

    const result = await loadOperationSettingTenantForCreate({ role: "operator", tenantId: tenant.id }, loadTenant);

    expect(loadTenant).toHaveBeenCalledWith(tenant.id);
    expect(result).toBe(tenant);
    expect(result?.enabled).toBe(true);
  });

  it("does not load a tenant for the platform setting", async () => {
    const loadTenant = vi.fn();

    await expect(loadOperationSettingTenantForCreate({ role: "super_admin", tenantId: null }, loadTenant)).resolves.toBeNull();
    expect(loadTenant).not.toHaveBeenCalled();
  });

  it("rejects missing or disabled tenants before the first save", async () => {
    await expect(loadOperationSettingTenantForCreate({ role: "operator", tenantId: 40 }, async () => null)).rejects.toThrow("当前商家不存在或已停用");
    await expect(loadOperationSettingTenantForCreate({ role: "operator", tenantId: 40 }, async () => ({ id: 40, enabled: false }))).rejects.toThrow("当前商家不存在或已停用");
  });
});
