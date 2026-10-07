import type { PublicMemberRegistrationRecord } from "@activity/shared";

const activeRegistrationStatuses = new Set(["pending_payment", "pending_review", "approved", "checked_in"]);

export function findActiveRegistrationForActivity(rows: PublicMemberRegistrationRecord[], activityId: number) {
  return rows.find((row) => Number(row.activityId || row.activity?.id || 0) === activityId && activeRegistrationStatuses.has(String(row.status || "")));
}
