import type { MessageItem } from "../../types/message";
import type { PublicMemberNotificationRecord } from "@activity/shared";
import { formatShanghaiDateTime } from "../../tenant-load-guard";

export type InboxMessage = MessageItem & { source: "personal" | "announcement"; activityId?: number | null };
export type MemberNotification = PublicMemberNotificationRecord;
export type Announcement = { id: number; title: string; content: string; publishAt?: string | null; createdAt?: string | null };

export function memberMessage(row: MemberNotification): InboxMessage {
  return { id: row.id, source: "personal", activityId: row.activityId, type: row.activityId ? "activity" : "system", title: row.title, summary: String(row.content || "").slice(0, 90), content: String(row.content || ""), createdAt: formatShanghaiDateTime(row.createdAt, ""), unread: !row.readAt };
}

export function announcementMessage(row: Announcement): InboxMessage {
  return { id: row.id, source: "announcement", type: "system", title: row.title, summary: String(row.content || "").replace(/<[^>]*>/g, "").slice(0, 90), content: String(row.content || ""), createdAt: formatShanghaiDateTime(row.publishAt || row.createdAt, ""), unread: false };
}
