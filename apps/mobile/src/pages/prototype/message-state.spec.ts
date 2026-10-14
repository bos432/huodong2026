import { describe, expect, it } from "vitest";
import { announcementMessage, memberMessage } from "./message-state";

describe("formal message projections", () => {
  it("uses server read timestamps and preserves activity navigation", () => {
    const record = { id: 8, title: "活动提醒", content: "集合地点已更新", scene: "activityReminder", activityId: 4, readAt: null, createdAt: "2026-10-13T00:00:00Z" };
    expect(memberMessage(record)).toMatchObject({ source: "personal", type: "activity", unread: true, activityId: 4 });
    expect(memberMessage({ ...record, readAt: "2026-10-13T01:00:00Z" }).unread).toBe(false);
    expect(record.readAt).toBeNull();
  });
  it("never invents an unread receipt for public announcements", () => {
    expect(announcementMessage({ id: 8, title: "公告", content: "正式公告", createdAt: "" })).toMatchObject({ source: "announcement", type: "system", unread: false });
  });
});
