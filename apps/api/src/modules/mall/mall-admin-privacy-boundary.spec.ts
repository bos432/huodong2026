import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mall admin privacy boundary", () => {
  const service = readFileSync("src/modules/mall/mall.service.ts", "utf8");

  it("projects order users without credential fields", () => {
    expect(service).toContain("const publicOrderUser = order.user ? { id: order.user.id, nickname: order.user.nickname, phone: order.user.phone } : null;");
    expect(service.match(/return \{ \.\.\.order, user: publicOrderUser/g)?.length).toBe(2);
  });

  it("allows merchant finance viewers to read refund logs", () => {
    expect(service).toContain('["finance.view", "refund.view", "refund.manage"]');
  });
});
