import { describe, expect, it } from "vitest";
import { resolveTicketPrice } from "./ticket-pricing";

describe("ticket pricing", () => {
  const now = new Date("2026-07-13T00:00:00Z");
  it("applies the active sales tier", () => expect(resolveTicketPrice({ basePrice: 100, soldCount: 20, now, isMember: false, tierPrices: [{ minSold: 10, price: 90 }, { minSold: 20, price: 80 }] })).toEqual({ price: 80, rule: "tier:20" }));
  it("uses a lower active early bird price", () => expect(resolveTicketPrice({ basePrice: 100, soldCount: 0, now, isMember: false, earlyBirdPrice: 70, earlyBirdEndsAt: new Date("2026-07-14T00:00:00Z") })).toEqual({ price: 70, rule: "early_bird" }));
  it("uses the explicit member price only for members", () => {
    expect(resolveTicketPrice({ basePrice: 100, soldCount: 0, now, isMember: true, memberPrice: 60 })).toEqual({ price: 60, rule: "member" });
    expect(resolveTicketPrice({ basePrice: 100, soldCount: 0, now, isMember: false, memberPrice: 60 })).toEqual({ price: 100, rule: "base" });
  });
});
