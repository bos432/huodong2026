import { describe, expect, it } from "vitest";
import { normalizeFixtureInput } from "./release-readiness-fixture-input";

describe("release readiness fixture input", () => {
  it("accepts only a complete masked fixture and trims fields", () => {
    expect(normalizeFixtureInput({
      kind: " test_account ",
      label: " 真机验收账号 ",
      maskedIdentifier: " wx***1234 ",
      status: " planned ",
      notes: " 仅用于体验版  "
    })).toEqual({
      kind: "test_account",
      label: "真机验收账号",
      maskedIdentifier: "wx***1234",
      status: "planned",
      notes: "仅用于体验版"
    });
  });

  it("rejects missing or unmasked identifiers", () => {
    expect(() => normalizeFixtureInput({ kind: "test_order", label: "订单", maskedIdentifier: "" })).toThrow("类型、名称和脱敏标识");
    expect(() => normalizeFixtureInput({ kind: "test_account", label: "账号", maskedIdentifier: "13800138000" })).toThrow("脱敏标识");
  });
});
