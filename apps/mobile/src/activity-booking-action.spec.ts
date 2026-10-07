import { describe, expect, it } from "vitest";
import { existingActivityBooking } from "./activity-booking-action";

describe("existing activity booking CTA state", () => {
  it.each([
    ["pending_payment", "查看待付款", false],
    ["pending_review", "查看审核进度", false],
    ["approved", "报名已完成", false],
    ["checked_in", "查看参与记录", false]
  ])("maps %s to a stable detail action", (status, label, waiting) => {
    expect(existingActivityBooking({ myBooking: { registration: { id: 21, status } } })).toEqual(expect.objectContaining({ registrationId: 21, label, waiting }));
  });

  it("keeps a waitlist record on the waitlist action without inventing a registration id", () => {
    expect(existingActivityBooking({ myBooking: { registration: null, waitlist: { id: 9, status: "waiting" } } })).toEqual(expect.objectContaining({ label: "已加入候补", waiting: true, registrationId: 0 }));
  });

  it("allows the normal activity CTA when there is no active booking", () => {
    expect(existingActivityBooking({ myBooking: { registration: { id: 21, status: "cancelled" }, waitlist: null } })).toBeNull();
    expect(existingActivityBooking(null)).toBeNull();
  });
});
