import { describe, expect, it } from "vitest";
import { canTransitionSupportWorkOrder, supportWorkOrderDueHours } from "./support-work-order-lifecycle";
describe("support work order lifecycle", () => {
  it("supports the normal service flow", () => {
    expect(canTransitionSupportWorkOrder("open", "processing")).toBe(true);
    expect(canTransitionSupportWorkOrder("processing", "resolved")).toBe(true);
    expect(canTransitionSupportWorkOrder("resolved", "closed")).toBe(true);
    expect(canTransitionSupportWorkOrder("closed", "processing")).toBe(true);
  });
  it("rejects invalid regressions", () => expect(canTransitionSupportWorkOrder("closed", "open")).toBe(false));
  it("assigns shorter SLA to urgent work", () => expect([supportWorkOrderDueHours("urgent"), supportWorkOrderDueHours("normal"), supportWorkOrderDueHours("low")]).toEqual([2, 24, 72]));
});
