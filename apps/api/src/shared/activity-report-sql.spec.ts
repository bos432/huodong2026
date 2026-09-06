import { describe, expect, it } from 'vitest';
import { liveActivityEventSql, scopedActivityEventSql, activityEventAmountSql } from './activity-report-sql';
import { growthCohortSummary } from './analytics-growth';
describe('activity reporting population', () => {
  it('filters tests and validates both activity and tenant links', () => {
    expect(liveActivityEventSql()).toContain('isTest = 0');
    expect(liveActivityEventSql()).toContain("sourceChannel = 'test'");
    expect(liveActivityEventSql()).toContain('report_activity.tenantId');
    expect(scopedActivityEventSql('event', true)).not.toContain('isTest = 0');
  });
  it('resolves payment amount only from an order belonging to the same activity', () => {
    expect(activityEventAmountSql()).toContain('report_registration.activityId = event.activityId');
    expect(() => activityEventAmountSql('event;DROP')).toThrow();
  });
  it('does not count observations after the reporting cutoff', () => {
    const result = growthCohortSummary([{ userId: 1, occurredAt: '2026-09-01', paid: true }, { userId: 1, occurredAt: '2026-10-01', paid: true }], { asOf: '2026-09-10' });
    expect(result.repeatPaidUsers).toBe(0); expect(result.repeatUsers).toBe(0);
  });
});
