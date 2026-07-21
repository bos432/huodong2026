import { describe, expect, it } from "vitest";
import { offlineCheckInPolicy } from "./offline-check-in-policy";

describe("offline check-in policy", () => {
  it("uses controlled defaults", () => expect(offlineCheckInPolicy({})).toEqual({ hours: 8, maxRows: 5000 }));
  it("caps manifest lifetime and size", () => expect(offlineCheckInPolicy({ configuredHours: 72, configuredMaxRows: 99999 })).toEqual({ hours: 24, maxRows: 10000 }));
  it("enforces minimum useful bounds", () => expect(offlineCheckInPolicy({ configuredHours: 0, configuredMaxRows: 1 })).toEqual({ hours: 8, maxRows: 100 }));
});
