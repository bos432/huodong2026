import { describe, expect, it } from "vitest";
import { mobileTabRoute } from "./mobile-tab-routes";

describe("mobile bottom navigation routes", () => {
  it("uses production pages for every user-facing tab", () => {
    expect(mobileTabRoute("home")).toBe("/pages/home/index");
    expect(mobileTabRoute("checkin")).toBe("/pages/checkin/index");
    expect(mobileTabRoute("messages")).toBe("/pages/user/notifications");
    expect(mobileTabRoute("me")).toBe("/pages/user/my");
  });

  it("does not route user tabs through prototype pages", () => {
    for (const tab of ["checkin", "messages", "me"] as const) {
      expect(mobileTabRoute(tab)).not.toContain("/pages/prototype/");
    }
  });
});
