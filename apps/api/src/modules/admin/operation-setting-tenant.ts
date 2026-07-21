import { NotFoundException } from "@nestjs/common";
import { isTenantScopedActor, TenantScopedActor } from "../../shared/tenant-scope";

type OperationSettingTenant = { id: number; enabled: boolean };

export async function loadOperationSettingTenantForCreate<T extends OperationSettingTenant>(
  admin: TenantScopedActor | null | undefined,
  loadTenant: (tenantId: number) => Promise<T | null>
) {
  if (!isTenantScopedActor(admin)) return null;
  const tenant = await loadTenant(Number(admin?.tenantId));
  if (!tenant || !tenant.enabled) throw new NotFoundException("当前商家不存在或已停用");
  return tenant;
}
