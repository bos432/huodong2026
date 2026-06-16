import { isTenantScopedActor, TenantScopedActor } from "../../shared/tenant-scope";

export function paymentStatementOrderWhere(orderNo: string, admin?: TenantScopedActor | null) {
  const where: Record<string, unknown> = { orderNo };
  if (isTenantScopedActor(admin)) where.tenant = { id: admin?.tenantId };
  return where;
}
