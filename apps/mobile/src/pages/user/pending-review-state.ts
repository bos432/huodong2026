import type { PublicMemberRegistrationRecord } from "@activity/shared";

export function pendingReviewState(registrations: PublicMemberRegistrationRecord[]) {
  return {
    rows: registrations.filter((row) => row.canReview === true),
    unknown: registrations.some((row) => row.status === "checked_in" && typeof row.canReview !== "boolean")
  };
}
