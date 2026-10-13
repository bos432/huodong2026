export const reviewedReleaseMigrations = Object.freeze([
  'InitialApplicationSchema1780480000000',
  'ActivityOperationVersions1788566400000',
  'ActivitySeries1788652800000',
  'ActivityFollowups1788652900000',
  'ActivityTestFlag1788653000000',
  'SocialConnections1788653100000',
  'AiOperationDrafts1788653200000',
  'MallMembershipAndDirectReferral1788653300000',
  'ExperienceProjects1788653400000',
  'CreateReleaseReadinessCenter1788653500000',
  'AddRefundFailureReason1788653600000',
  'MemberNotificationReadState1788653700000',
  'MemberHostApplicationOwnership1788653800000',
  'SlowExperienceRecords1788653900000'
]);

export function assertReviewedMigrations(pending, reviewed) {
  if (!Array.isArray(pending) || !Array.isArray(reviewed)) throw new Error('Migration lists must be arrays.');
  let previous = -1;
  for (const name of pending) {
    const position = reviewed.indexOf(name);
    if (position < 0 || position <= previous) throw new Error(`Unexpected, duplicate or unordered migration: ${name}`);
    previous = position;
  }
}
