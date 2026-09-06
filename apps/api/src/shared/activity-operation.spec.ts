import { describe, it, expect } from 'vitest';
import { defaultOperationPlan, normalizeOperationPlan, operationSummary } from './activity-operation';
import { isPlanningActivity, activityPublishReadinessIssues } from '../modules/admin/activity-lifecycle';
import { resolveAdminRoutePermission } from '../modules/admin/admin-permissions';

describe('activity operating account', () => {
  it('subtracts refunds once and excludes partner ticket turnover', () => {
    const plan = { ...defaultOperationPlan(), entries: [{ label: '场地', kind: 'cost' as const, amountFen: 30000 }, { label: '赞助', kind: 'income' as const, amountFen: 10000 }] };
    expect(operationSummary(plan, 100000, 20000)).toMatchObject({ incomeFen: 90000, costsFen: 30000, contributionFen: 60000 });
    expect(operationSummary({ ...plan, mode: 'partner' }, 100000, 20000)).toMatchObject({ incomeFen: 10000, contributionFen: -20000 });
  });
  it('rejects malformed money and drops unknown properties', () => {
    for (const amount of [-1, 1.2, Infinity, '12', null, 100_000_000_01]) expect(() => normalizeOperationPlan({ ...defaultOperationPlan(), budgetFen: amount })).toThrow();
    expect(normalizeOperationPlan({ ...defaultOperationPlan(), tenantId: 999 })).not.toHaveProperty('tenantId');
    expect(() => normalizeOperationPlan({ ...defaultOperationPlan(), entries: [{ kind: 'cost', label: '', amountFen: 1 }] })).toThrow();
  });
  it('protects financial data with finance permissions', () => {
    expect(resolveAdminRoutePermission('GET', 'activities/12/operation')).toBe('finance.view');
    expect(resolveAdminRoutePermission('PUT', 'activities/12/operation')).toBe('finance.manage');
  });
  it('blocks planning placeholders during publication', () => {
    expect(isPlanningActivity({ title: '【策划草稿】周末共读' })).toBe(true);
    const issues = activityPublishReadinessIssues({ title: '读书会', location: '场地待确认', startTime: '2099-01-02', endTime: '2099-01-03', registrationDeadline: '2099-01-01' });
    expect(issues.some(issue => issue.field === 'planning' && issue.blocking)).toBe(true);
  });
});
