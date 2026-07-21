export function nextForumFloorNo(value: unknown) {
  const floor = Math.trunc(Number(value));
  return Number.isFinite(floor) && floor > 0 ? floor : 1;
}

export function forumReplyLockMessage(topic: { locked?: boolean; lockReason?: string | null }) {
  if (!topic.locked) return null;
  return String(topic.lockReason || "").trim() || "帖子已锁定，暂停回复";
}

export function forumQuoteSnapshot(reply: {
  id: number;
  floorNo?: number | null;
  content?: string | null;
  userId?: number | null;
  user?: { nickname?: string | null; phone?: string | null } | null;
}) {
  return {
    replyId: reply.id,
    floorNo: reply.floorNo || null,
    authorName: reply.user?.nickname || reply.user?.phone || (reply.userId ? `用户${reply.userId}` : "平台运营"),
    content: String(reply.content || "").slice(0, 500) || null
  };
}
