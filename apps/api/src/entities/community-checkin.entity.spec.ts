import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("community tenant index metadata", () => {
  it("keeps migration-created tenant foreign-key indexes explicit", () => {
    const expected = [
      ["community-activity.entity.ts", "IDX_community_activities_tenantId"],
      ["community-post.entity.ts", "IDX_community_posts_tenantId"],
      ["checkin-task.entity.ts", "IDX_checkin_tasks_tenantId"],
      ["community-checkin.entity.ts", "IDX_community_checkins_tenantId"]
    ] as const;

    for (const [file, name] of expected) {
      const source = fs.readFileSync(path.join(__dirname, file), "utf8");
      expect(source).toContain(`@Index("${name}", ["tenant"])`);
    }
  });
});
