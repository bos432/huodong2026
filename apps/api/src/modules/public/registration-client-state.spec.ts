import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("../mobile/src/registration-flow-state.ts", "utf8");

describe("mobile registration flow state contract", () => {
  it("keeps the explicit booking state machine transitions", () => {
    for (const state of ["editing", "validating", "submitting", "payment_pending", "success", "waitlist", "review_pending", "error"]) {
      expect(source).toContain(`| "${state}"`);
    }
    for (const event of ["validate", "submit", "payment_required", "completed", "waitlisted", "review_required", "failed", "retry"]) {
      expect(source).toContain(`| "${event}"`);
    }
    expect(source).toContain('if (event === "payment_required") return "payment_pending"');
    expect(source).toContain('if (event === "waitlisted") return "waitlist"');
    expect(source).toContain('if (event === "review_required") return "review_pending"');
  });

  it("only treats validation and network submission as duplicate-submit busy states", () => {
    expect(source).toContain('new Set<RegistrationFlowState>(["validating", "submitting"])');
    expect(source).toContain('review_pending: "等待审核"');
  });
});
