import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("community notification owner scope", () => {
  const source = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const start = source.indexOf("async myCommunityNotifications");
  const end = source.indexOf('@Post("me/community/notifications/:id/read")', start);
  const block = source.slice(start, end);

  it("loads notifications by the authenticated user before tenant visibility filtering", () => {
    expect(block).toContain("this.communityNotifications.find({where:{userId}");
    expect(block).toContain("visiblePostIds.has(row.postId)");
    expect(block).not.toContain("createQueryBuilder");
  });
});
