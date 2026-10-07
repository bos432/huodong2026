import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile core recovery actions accessibility contract", () => {
  it("keeps recommendations and registration errors keyboard reachable", () => {
    const myPage = readFileSync(resolve(process.cwd(), "../mobile/src/pages/user/my.vue"), "utf8");
    const registrationPage = readFileSync(resolve(process.cwd(), "../mobile/src/pages/user/registration.vue"), "utf8");
    expect(myPage).toContain('@keyup.space.prevent="openRecommendedActivity(item.id)"');
    expect(registrationPage).toContain('aria-label="关闭报名操作错误"');
    expect(registrationPage).toContain('@keyup.space.prevent="actionError = \'\'"');
  });
});
