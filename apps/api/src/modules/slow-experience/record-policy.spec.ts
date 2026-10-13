import { describe, expect, it } from "vitest";
import { applyRecordDraft, moderateRecord, recordIsPublic } from "./record-policy";

const row = () => ({ discovery: "A quiet corner", lightNote: "Soft light", feeling: "Feeling rested", visibility: "public_review", moderationStatus: "approved", revision: 2, deletedAt: null, reviewedAt: new Date(), reviewedBy: 1, reviewRemark: null } as any);

describe("slow-experience visibility lifecycle", () => {
  it("does not infer approval from a public request", () => {
    const record = row();
    applyRecordDraft(record, { discovery: "Another quiet corner", lightNote: "Soft light", feeling: "Feeling rested", visibility: "public_review" });
    expect(record.moderationStatus).toBe("pending");
    expect(recordIsPublic(record)).toBe(false);
    expect(record.reviewedBy).toBeNull();
    expect(record.revision).toBe(3);
  });
  it("immediately withdraws a record when made private", () => {
    const record = row();
    applyRecordDraft(record, { ...record, visibility: "private" });
    expect(record.moderationStatus).toBe("not_submitted");
    expect(recordIsPublic(record)).toBe(false);
  });
  it("rejects a stale moderation decision and never approves private or deleted content", () => {
    expect(() => moderateRecord(row(), "approved", 1, 7, "")).toThrow();
    expect(() => moderateRecord({ ...row(), visibility: "private", moderationStatus: "pending" }, "approved", 2, 7, "")).toThrow();
    expect(() => moderateRecord({ ...row(), deletedAt: new Date(), moderationStatus: "pending" }, "approved", 2, 7, "")).toThrow();
  });
  it("requires a rejection reason and supports approval of exactly the pending revision", () => {
    const record = { ...row(), moderationStatus: "pending" };
    expect(() => moderateRecord(record, "rejected", 2, 7, "")).toThrow();
    moderateRecord(record, "approved", 2, 7, "");
    expect(recordIsPublic(record)).toBe(true);
    expect(record.reviewedBy).toBe(7);
  });
  it("validates content and never accepts an arbitrary public visibility or empty entry", () => {
    expect(() => applyRecordDraft(row(), { discovery: "", lightNote: "", feeling: "", visibility: "private" })).toThrow();
    expect(() => applyRecordDraft(row(), { ...row(), visibility: "public" })).toThrow();
  });
});
