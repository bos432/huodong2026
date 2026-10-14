import type { PublicMemberRegistrationRecord } from "@activity/shared";
import { getJourneyGroup, sortJourneyRegistrations } from "../checkin/journey-state";

export function summarizeProfileRegistrations(rows: PublicMemberRegistrationRecord[], now = Date.now()) {
  const active = rows.filter((row) => ["upcoming", "completed"].includes(getJourneyGroup(row, now)));
  const records = active.filter((row) => ["checked_in", "completed"].includes(String(row.status).toLowerCase()));
  return {
    attendedCount: records.length,
    records: [...records].sort((left, right) => new Date(right.activity?.startTime || 0).getTime() - new Date(left.activity?.startTime || 0).getTime()),
    upcoming: sortJourneyRegistrations(active.filter((row) => getJourneyGroup(row, now) === "upcoming")),
    reviewable: records.filter((row) => row.canReview === true),
    reviewEligibilityKnown: records.every((row) => typeof row.canReview === "boolean"),
    ticketCount: active.filter((row) => ["approved", "checked_in", "completed"].includes(String(row.status).toLowerCase())).length
  };
}
