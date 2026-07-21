import { describe, expect, it } from "vitest";
import { forumQuoteSnapshot, forumReplyLockMessage, nextForumFloorNo } from "./forum-governance";

describe("forum governance", () => {
  it("normalizes the next stable floor number", () => {
    expect(nextForumFloorNo(8)).toBe(8);
    expect(nextForumFloorNo(0)).toBe(1);
    expect(nextForumFloorNo("bad")).toBe(1);
  });

  it("returns a deterministic lock message", () => {
    expect(forumReplyLockMessage({ locked: false })).toBeNull();
    expect(forumReplyLockMessage({ locked: true, lockReason: "话题已结束" })).toBe("话题已结束");
    expect(forumReplyLockMessage({ locked: true })).toBe("帖子已锁定，暂停回复");
  });

  it("freezes quote author, floor and content", () => {
    expect(forumQuoteSnapshot({ id: 9, floorNo: 3, content: "原始内容", userId: 7, user: { nickname: "小慢" } })).toEqual({
      replyId: 9,
      floorNo: 3,
      authorName: "小慢",
      content: "原始内容"
    });
  });
});
