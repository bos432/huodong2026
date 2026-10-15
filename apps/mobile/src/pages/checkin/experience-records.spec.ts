import { describe, expect, it } from "vitest";
import { createExperienceRecord, normalizeExperienceRecords, readExperienceRecords, saveExperienceRecord, type ExperienceRecordDraft } from "../../experience-records";

const draft: ExperienceRecordDraft = {
  discovery: "老墙缝里长出了一片很小的绿叶",
  lightNote: "阳光落在旧街的青石路上",
  feeling: "今天没有赶路，心里安静了一点",
  photoPath: "file:///local/photo.jpg",
  visibility: "private"
};

describe("slow experience records", () => {
  it("creates a private local note without implying activity attendance", () => {
    const record = createExperienceRecord(draft, "2026-10-13T08:00:00.000Z");
    expect(record).toMatchObject({
      discovery: draft.discovery,
      lightNote: draft.lightNote,
      feeling: draft.feeling,
      photoPath: draft.photoPath,
      visibility: "private",
      moderationStatus: "not_submitted",
      recordType: "slow_experience"
    });
    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBe("2026-10-13T08:00:00.000Z");
  });

  it("keeps a public request in simulated review and never marks it approved", () => {
    const record = createExperienceRecord({ ...draft, visibility: "public_review" }, "2026-10-13T08:00:00.000Z");
    expect(record.visibility).toBe("public_review");
    expect(record.moderationStatus).toBe("demo_pending_review");
    expect(record.moderationStatus).not.toBe("approved");
  });

  it("drops malformed stored rows and normalizes newest-first", () => {
    const rows = normalizeExperienceRecords([
      { ...createExperienceRecord(draft, "2026-10-12T08:00:00.000Z"), id: "older" },
      { ...createExperienceRecord(draft, "2026-10-13T08:00:00.000Z"), id: "newer" },
      { id: "bad", recordType: "activity_attendance", createdAt: "invalid" }
    ]);
    expect(rows.map((row) => row.id)).toEqual(["newer", "older"]);
  });

  it("persists records under the local experience key and reads them back", () => {
    const data = new Map<string, unknown>();
    const storage = {
      getStorageSync: (key: string) => data.get(key),
      setStorageSync: (key: string, value: unknown) => data.set(key, value)
    };
    const saved = saveExperienceRecord(storage, draft, "2026-10-13T08:00:00.000Z");
    expect(readExperienceRecords(storage)).toEqual([saved]);
  });
});
