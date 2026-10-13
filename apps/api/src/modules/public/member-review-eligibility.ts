type ReviewRegistration = { id: number; status: string; activity?: { endTime?: string | Date | null } | null };

export async function loadMemberReviewEligibility(
  rows: ReviewRegistration[],
  loadReviewedIds: (ids: number[]) => Promise<number[]>,
  now = Date.now()
) {
  const candidates = rows.filter((row) => {
    const end = new Date(row.activity?.endTime || "").getTime();
    return row.status === "checked_in" && Number.isFinite(end) && end > 0 && end <= now;
  });
  if (!candidates.length) return new Set<number>();
  const reviewed = new Set(await loadReviewedIds(candidates.map((row) => row.id)));
  return new Set(candidates.filter((row) => !reviewed.has(row.id)).map((row) => row.id));
}
