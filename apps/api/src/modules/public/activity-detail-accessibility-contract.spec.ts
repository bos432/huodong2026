import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile activity detail accessibility contract", () => {
  it("keeps secondary activity actions keyboard reachable", () => {
    const source = readFileSync(resolve(process.cwd(), "../mobile/src/pages/activity/detail.vue"), "utf8");
    expect(source).toContain('@keyup.space.prevent="openLocation"');
    expect(source).toContain('@keyup.space.prevent="closeMoreActions"');
    expect(source).toContain('@keyup.space.prevent="closeMoreActions(); goActivitySpace()"');
    expect(source).toContain('@keyup.space.prevent="closeMoreActions(); goPublish()"');
    expect(source).toContain('@keyup.space.prevent="closeMoreActions(); goCommunity()"');
    expect(source).toContain('@keyup.space.prevent="goRelatedActivity(item)"');
    expect(source).toContain('@keyup.space.prevent="posterUrl = \'\'"');
  });
});
