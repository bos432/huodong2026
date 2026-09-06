function aliasName(value: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error('Invalid report alias');
  return value;
}
export function liveActivityEventSql(value = 'event') {
  return scopedActivityEventSql(value, false);
}
export function scopedActivityEventSql(value = 'event', includeTest = false) {
  const a = aliasName(value);
  return `EXISTS (SELECT 1 FROM activities report_activity WHERE report_activity.id = ${a}.activityId ${includeTest ? '' : 'AND report_activity.isTest = 0'} AND COALESCE(report_activity.tenantId, 0) = COALESCE(${a}.tenantId, 0))${includeTest ? '' : ` AND NOT EXISTS (SELECT 1 FROM users report_user WHERE report_user.id = ${a}.userId AND report_user.sourceChannel = 'test')`}`;
}
export function activityEventAmountSql(value = 'event') {
  const a = aliasName(value);
  // Old admin confirmation events sometimes omitted amount. The order is canonical.
  return `CASE WHEN ${a}.type = 'pay' THEN COALESCE((SELECT report_order.amount FROM orders report_order INNER JOIN registrations report_registration ON report_registration.id = report_order.registrationId WHERE report_order.id = ${a}.orderId AND report_registration.activityId = ${a}.activityId), ${a}.amount) WHEN ${a}.type = 'refund' THEN ABS(${a}.amount) ELSE 0 END`;
}
export function nonTestUserSql(value: string) {
  const a = aliasName(value);
  return `NOT EXISTS (SELECT 1 FROM users report_user WHERE report_user.id = ${a}.userId AND report_user.sourceChannel = 'test')`;
}
