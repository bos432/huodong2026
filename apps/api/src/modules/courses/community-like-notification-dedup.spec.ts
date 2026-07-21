import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("community like notification deduplication", () => {
  const source = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const start = source.indexOf("async togglePostLike");
  const end = source.indexOf('@Post("community/posts/:id/favorite")', start);
  const block = source.slice(start, end);

  it("keeps one notification per post, receiver and actor", () => {
    expect(block).toContain('findOneBy({userId:locked.userId,type:"like",postId:id,actorUserId:userId})');
    expect(block).toContain("if(!existing)await notificationRepo.save");
  });
});
