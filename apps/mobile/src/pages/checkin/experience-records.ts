export type ExperienceVisibility = "private" | "public_review";
export type ExperienceModerationStatus = "not_submitted" | "demo_pending_review";

export interface ExperienceRecordDraft {
  discovery: string;
  lightNote: string;
  feeling: string;
  photoPath: string;
  visibility: ExperienceVisibility;
}

export interface ExperienceRecord extends ExperienceRecordDraft {
  id: string;
  recordType: "slow_experience";
  moderationStatus: ExperienceModerationStatus;
  createdAt: string;
}

export const EXPERIENCE_RECORDS_STORAGE_KEY = "manpi-slow-experience-records-v1";
export interface ExperienceStorage {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
}

export function experienceDraftError(draft: ExperienceRecordDraft): string {
  if (draft.discovery.trim().length < 5) return "先写下一处你留意到的细节，至少 5 个字。";
  if (!draft.photoPath && draft.lightNote.trim().length < 5) return "拍一张照片，或用至少 5 个字描述今天的光线。";
  if (draft.feeling.trim().length < 5) return "再留一句此刻的感受，至少 5 个字。";
  return "";
}

export function createExperienceRecord(draft: ExperienceRecordDraft, createdAt = new Date().toISOString()): ExperienceRecord {
  const visibility = draft.visibility === "public_review" ? "public_review" : "private";
  return {
    id: `slow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recordType: "slow_experience",
    discovery: draft.discovery.trim(),
    lightNote: draft.lightNote.trim(),
    feeling: draft.feeling.trim(),
    photoPath: draft.photoPath.trim(),
    visibility,
    moderationStatus: visibility === "public_review" ? "demo_pending_review" : "not_submitted",
    createdAt
  };
}

export function normalizeExperienceRecords(value: unknown): ExperienceRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ExperienceRecord => {
      if (!item || typeof item !== "object") return false;
      const row = item as Partial<ExperienceRecord>;
      return row.recordType === "slow_experience"
        && typeof row.id === "string"
        && typeof row.createdAt === "string"
        && Number.isFinite(Date.parse(row.createdAt))
        && typeof row.discovery === "string"
        && typeof row.lightNote === "string"
        && typeof row.feeling === "string"
        && typeof row.photoPath === "string"
        && (row.visibility === "private" || row.visibility === "public_review")
        && (row.moderationStatus === "not_submitted" || row.moderationStatus === "demo_pending_review");
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function saveExperienceRecord(storage: ExperienceStorage, draft: ExperienceRecordDraft, now?: string): ExperienceRecord {
  const record = createExperienceRecord(draft, now);
  const current = normalizeExperienceRecords(storage.getStorageSync(EXPERIENCE_RECORDS_STORAGE_KEY));
  storage.setStorageSync(EXPERIENCE_RECORDS_STORAGE_KEY, normalizeExperienceRecords([record, ...current]));
  return record;
}

export function readExperienceRecords(storage: Pick<ExperienceStorage, "getStorageSync">): ExperienceRecord[] {
  return normalizeExperienceRecords(storage.getStorageSync(EXPERIENCE_RECORDS_STORAGE_KEY));
}
