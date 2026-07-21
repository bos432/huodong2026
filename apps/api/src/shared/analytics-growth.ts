export type UserActivityPoint = { userId: number; occurredAt: Date | string; paid?: boolean };

function dayDiff(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function growthCohortSummary(points: UserActivityPoint[], options: { asOf?: Date | string; cohortStart?: Date | string; cohortEnd?: Date | string } = {}) {
  const byUser = new Map<number, Array<{ at: Date; paid: boolean }>>();
  for (const point of points) {
    const at = new Date(point.occurredAt);
    if (!Number.isInteger(point.userId) || point.userId <= 0 || Number.isNaN(at.getTime())) continue;
    const rows = byUser.get(point.userId) || [];
    rows.push({ at, paid: point.paid === true });
    byUser.set(point.userId, rows);
  }
  let retained7 = 0;
  let retained30 = 0;
  let retention7EligibleUsers = 0;
  let retention30EligibleUsers = 0;
  let repeatUsers = 0;
  let paidUsers = 0;
  let repeatPaidUsers = 0;
  let users = 0;
  const asOfValue = options.asOf ? new Date(options.asOf) : new Date();
  const asOf = Number.isNaN(asOfValue.getTime()) ? new Date() : asOfValue;
  const cohortStartValue = options.cohortStart ? new Date(options.cohortStart) : null;
  const cohortEndValue = options.cohortEnd ? new Date(options.cohortEnd) : null;
  const cohortStart = cohortStartValue && !Number.isNaN(cohortStartValue.getTime()) ? cohortStartValue : null;
  const cohortEnd = cohortEndValue && !Number.isNaN(cohortEndValue.getTime()) ? cohortEndValue : null;
  for (const rows of byUser.values()) {
    rows.sort((a, b) => a.at.getTime() - b.at.getTime());
    const first = rows[0].at;
    if ((cohortStart && first < cohortStart) || (cohortEnd && first >= cohortEnd)) continue;
    users++;
    const ageDays = dayDiff(first, asOf);
    if (ageDays >= 7) {
      retention7EligibleUsers++;
      if (rows.some((row) => { const days = dayDiff(first, row.at); return days >= 1 && days <= 7; })) retained7++;
    }
    if (ageDays >= 30) {
      retention30EligibleUsers++;
      if (rows.some((row) => { const days = dayDiff(first, row.at); return days >= 1 && days <= 30; })) retained30++;
    }
    if (rows.length >= 2) repeatUsers++;
    let paidCount = 0;
    for (const row of rows) if (row.paid) paidCount++;
    if (paidCount) paidUsers++;
    if (paidCount >= 2) repeatPaidUsers++;
  }
  const rate = (value: number, total: number) => total ? Math.round(value * 1000 / total) / 10 : 0;
  return { users, retained7, retained30, retention7EligibleUsers, retention30EligibleUsers, retention7Rate: rate(retained7, retention7EligibleUsers), retention30Rate: rate(retained30, retention30EligibleUsers), repeatUsers, repeatRate: rate(repeatUsers, users), paidUsers, repeatPaidUsers, repurchaseRate: rate(repeatPaidUsers, paidUsers) };
}
