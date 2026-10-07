import { describe, expect, it } from "vitest";
import { mobileTabRoute } from "./mobile-tab-routes";

describe("mobile bottom navigation routes", () => {
  it("uses the slowpi user-facing pages for every bottom tab", () => {
    expect(mobileTabRoute("home")).toBe("/pages/home/index");
    expect(mobileTabRoute("checkin")).toBe("/pages/checkin/index");
    expect(mobileTabRoute("messages")).toBe("/pages/prototype/message");
    expect(mobileTabRoute("me")).toBe("/pages/prototype/me");
  });

  it("keeps the activity record center as the canonical slowpi profile surface", () => {
    expect(mobileTabRoute("me")).toBe("/pages/prototype/me");
  });
});
