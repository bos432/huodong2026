import { describe, expect, it } from "vitest";
import { findActiveRegistrationForActivity } from "./registration-retry";

describe("findActiveRegistrationForActivity", () => {
  it("recovers the existing active registration instead of creating another one", () => {
    const row = findActiveRegistrationForActivity([
      { id: 8, activityId: 12, status: "cancelled" },
      { id: 9, activityId: 12, status: "pending_payment" },
      { id: 10, activityId: 13, status: "approved" }
    ], 12);

    expect(row?.id).toBe(9);
  });

  it("does not recover an unrelated or terminal registration", () => {
    expect(findActiveRegistrationForActivity([{ id: 8, activityId: 12, status: "cancelled" }], 12)).toBeUndefined();
  });
});
