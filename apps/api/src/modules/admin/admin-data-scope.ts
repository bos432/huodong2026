export type AdminDataScope = { type: "all" } | { type: "activity_ids"; activityIds: number[] };

export function normalizeAdminDataScope(value: unknown): AdminDataScope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { type: "all" };
  const input = value as Record<string, unknown>;
  if (input.type !== "activity_ids") return { type: "all" };
  const activityIds = Array.from(new Set((Array.isArray(input.activityIds) ? input.activityIds : []).map(Number).filter((id) => Number.isInteger(id) && id > 0))).slice(0, 500);
  return { type: "activity_ids", activityIds };
}

export function adminActivityScopeIds(value: unknown) {
  const scope = normalizeAdminDataScope(value);
  return scope.type === "activity_ids" ? scope.activityIds : null;
}

export function adminCanAccessActivity(value: unknown, activityId: unknown) {
  const ids = adminActivityScopeIds(value);
  return ids === null || ids.includes(Number(activityId));
}

export function activityIdFromScopedRow(row: any): number | null {
  const value = row?.activity?.id ?? row?.registration?.activity?.id ?? row?.order?.registration?.activity?.id ?? row?.ticketType?.activity?.id;
  const id = Number(value || 0);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function applyAdminActivityDataScope(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, value: unknown) {
  const ids = adminActivityScopeIds(value);
  if (ids === null) return;
  if (!ids.length) { builder.andWhere("1 = 0"); return; }
  const directAliases = new Set(["activity", "registration", "waitlist", "ticket", "ticketType", "coupon", "channel", "review", "view", "event"]);
  if (alias === "activity") builder.andWhere(`${alias}.id IN (:...dataScopeActivityIds)`, { dataScopeActivityIds: ids });
  else if (directAliases.has(alias)) builder.andWhere(`${alias}.activityId IN (:...dataScopeActivityIds)`, { dataScopeActivityIds: ids });
  else if (alias === "order") builder.andWhere(`${alias}.id IN (SELECT scoped_order.id FROM orders scoped_order JOIN registrations scoped_registration ON scoped_registration.id = scoped_order.registrationId WHERE scoped_registration.activityId IN (:...dataScopeActivityIds))`, { dataScopeActivityIds: ids });
  else if (["refund", "transaction", "statement", "callback"].includes(alias)) builder.andWhere(`${alias}.orderId IN (SELECT scoped_order.id FROM orders scoped_order JOIN registrations scoped_registration ON scoped_registration.id = scoped_order.registrationId WHERE scoped_registration.activityId IN (:...dataScopeActivityIds))`, { dataScopeActivityIds: ids });
  else if (["checkin", "checkIn"].includes(alias)) builder.andWhere(`${alias}.registrationId IN (SELECT scoped_registration.id FROM registrations scoped_registration WHERE scoped_registration.activityId IN (:...dataScopeActivityIds))`, { dataScopeActivityIds: ids });
}
