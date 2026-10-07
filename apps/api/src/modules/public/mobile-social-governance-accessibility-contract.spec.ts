import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile social and governance accessibility contract", () => {
  it("keeps social history controls keyboard reachable", () => {
    const source = readFileSync(resolve(process.cwd(), "../mobile/src/pages/user/community-social.vue"), "utf8");
    expect(source).toContain('@keyup.space.prevent="goBack"');
    expect(source).toContain('@keyup.space.prevent="tab = item.key"');
    expect(source).toContain('@keyup.space.prevent="openPost(item)"');
    expect(source).toContain('@keyup.space.prevent="openNotification(item)"');
  });

  it("keeps appeals, favorites, and course attachment actions keyboard reachable", () => {
    const appeals = readFileSync(resolve(process.cwd(), "../mobile/src/pages/user/content-appeals.vue"), "utf8");
    const favorites = readFileSync(resolve(process.cwd(), "../mobile/src/pages/user/favorites.vue"), "utf8");
    const player = readFileSync(resolve(process.cwd(), "../mobile/src/pages/course/player.vue"), "utf8");
    expect(appeals).toContain('@keyup.space.prevent="goBack"');
    expect(appeals).toContain('@keyup.space.prevent="load"');
    expect(appeals).toContain('@keyup.space.prevent="selectSanction(item)"');
    expect(appeals).toContain('@keyup.space.prevent="submitAppeal"');
    expect(favorites).toContain('tabindex="0"');
    expect(favorites).toContain('@keyup.space.prevent="goBack"');
    expect(favorites).toContain('@keyup.space.prevent="goDetail(c)"');
    expect(player).toContain('@keyup.space.prevent="openAttachment"');
  });
});
