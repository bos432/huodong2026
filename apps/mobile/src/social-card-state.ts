export function socialCardState(profile: { userId?: number; status?: string; visible?: boolean } | null, sharedUserId: number) {
  // The public endpoint returns approved, visible records without moderation fields.
  const publicResult = sharedUserId > 0 && profile?.userId === sharedUserId && profile?.visible === true;
  const canPreview = Boolean(profile && (sharedUserId ? publicResult : profile.status === 'approved'));
  return { canPreview, canShare: canPreview && profile?.visible === true };
}
