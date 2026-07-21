import { describe, expect, it } from "vitest";
import { courseCertificateEligible, courseRefundOutcome } from "./course-engagement-policy";
describe("course engagement policy", () => {
  it("requires completion and all published assessments when configured", () => { expect(courseCertificateEligible({ progress:100,threshold:90,requireAssessmentPass:true,publishedAssessments:2,passedAssessments:1 })).toBe(false); expect(courseCertificateEligible({ progress:100,threshold:90,requireAssessmentPass:true,publishedAssessments:2,passedAssessments:2 })).toBe(true); });
  it("keeps access after partial refund and revokes it after full refund", () => { expect(courseRefundOutcome({orderAmountFen:10000,refundedBeforeFen:0,refundAmountFen:3000}).revokeAccess).toBe(false); expect(courseRefundOutcome({orderAmountFen:10000,refundedBeforeFen:3000,refundAmountFen:7000}).revokeAccess).toBe(true); });
  it("rejects over-refunds", () => { expect(() => courseRefundOutcome({orderAmountFen:10000,refundedBeforeFen:7000,refundAmountFen:4000})).toThrow("退款金额超过可退金额"); });
});
