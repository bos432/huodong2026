import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("activity member access login contract", () => {
  const publicService = readFileSync("src/modules/public/public.service.ts", "utf8");
  const v1Service = readFileSync("src/modules/v1/v1.service.ts", "utf8");

  it.each([
    ["public activity detail", publicService],
    ["enhanced activity detail", v1Service]
  ])("marks gated guests as requiring login in %s", (_name, source) => {
    expect(source).toContain('eligible: false, loginRequired: true, message: "登录后可查看会员等级和报名资格"');
    expect(source).toContain("eligible: true, loginRequired: false");
    expect(source).toContain("eligible,\n      loginRequired: false,");
  });

  it("treats a missing authenticated user as an expired login", () => {
    expect(publicService).toContain('loginRequired: true, message: "登录状态已失效，请重新登录"');
  });
});
