import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { usesMemberNavigation } from "./member-navigation";

describe("member transaction navigation", () => {
  it("uses approved navigation on orders, registration and review routes including queries", () => {
    for (const path of ["/pages/user/orders?status=all", "/pages/user/registration?id=65", "/pages/user/review?id=65"])
      expect(usesMemberNavigation(path)).toBe(true);
  });
  it("does not override other decorated tenant surfaces", () => {
    for (const path of ["/pages/courses/index", "/pages/user/login", "/pages/user/wallet", "/pages/user/review-extra"])
      expect(usesMemberNavigation(path)).toBe(false);
  });
  it("wires the standalone shared navigation without adding an empty screen", () => {
    const nav = readFileSync(resolve(__dirname, "components/AppBottomNav.vue"), "utf8");
    const shell = readFileSync(resolve(__dirname, "components/layout/MobileShell.vue"), "utf8");
    const orders = readFileSync(resolve(__dirname, "pages/user/orders.vue"), "utf8");
    const registration = readFileSync(resolve(__dirname, "pages/user/registration.vue"), "utf8");
    const review = readFileSync(resolve(__dirname, "pages/user/review.vue"), "utf8");
    expect(nav).toContain('v-if="usesMemberNavigation(currentPath)"');
    expect(nav).toContain('navigation-only');
    expect(shell).toContain('v-if="!navigationOnly"');
    expect(orders).toContain('current-path="/pages/user/orders"');
    expect(registration).toContain('current-path="/pages/user/registration"');
    expect(review).toContain('current-path="/pages/user/review"');
  });
});
