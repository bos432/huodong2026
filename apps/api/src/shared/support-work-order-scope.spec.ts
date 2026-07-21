import { describe, expect, it } from "vitest";
import { supportWorkOrderBelongsToActor, supportWorkOrderScopeKey } from "./support-work-order-scope";

describe("support work order scope", () => {
  it("builds stable scope keys", () => {
    expect(supportWorkOrderScopeKey()).toBe("platform");
    expect(supportWorkOrderScopeKey(23)).toBe("tenant:23");
  });

  it("does not expose platform or another tenant work order to tenant staff", () => {
    expect(supportWorkOrderBelongsToActor("tenant:23", 23)).toBe(true);
    expect(supportWorkOrderBelongsToActor("tenant:42", 23)).toBe(false);
    expect(supportWorkOrderBelongsToActor("platform", 23)).toBe(false);
  });

  it("allows platform administrators to inspect explicit support scopes", () => {
    expect(supportWorkOrderBelongsToActor("platform", null)).toBe(true);
    expect(supportWorkOrderBelongsToActor("tenant:23", null)).toBe(true);
  });
});
