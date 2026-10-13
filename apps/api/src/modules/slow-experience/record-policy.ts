import { BadRequestException, ConflictException } from "@nestjs/common";
import type { SlowExperienceRecord } from "../../entities/slow-experience-record.entity";

export interface SlowRecordDraft { discovery: string; lightNote: string; feeling: string; visibility: "private" | "public_review" }

export function recordIsPublic(row: SlowExperienceRecord) {
  return !row.deletedAt && row.visibility === "public_review" && row.moderationStatus === "approved";
}

export function applyRecordDraft(row: SlowExperienceRecord, draft: SlowRecordDraft) {
  if (!draft || !["private", "public_review"].includes(draft.visibility)) throw new BadRequestException("请选择仅自己可见或申请公开");
  const fields = { discovery: String(draft.discovery || "").trim(), lightNote: String(draft.lightNote || "").trim(), feeling: String(draft.feeling || "").trim() };
  if (fields.discovery.length < 5 || fields.feeling.length < 5 || (!row.photoReference && fields.lightNote.length < 5)) throw new BadRequestException("请填写观察细节、光线记录和此刻感受，每项至少 5 个字；光线记录可用照片代替");
  if (Object.values(fields).some(value => value.length > 2000)) throw new BadRequestException("每项记录最多 2000 个字");
  Object.assign(row, fields, { visibility: draft.visibility, moderationStatus: draft.visibility === "private" ? "not_submitted" : "pending", revision: (row.revision || 0) + 1, reviewRemark: null, reviewedBy: null, reviewedAt: null });
}

export function moderateRecord(row: SlowExperienceRecord, status: "approved" | "rejected", revision: number, adminId: number, remark: string) {
  if (row.deletedAt || row.visibility !== "public_review" || row.moderationStatus !== "pending" || row.revision !== revision) throw new ConflictException("记录已变更，请重新加载待审核内容");
  if (!["approved", "rejected"].includes(status)) throw new BadRequestException("审核状态无效");
  if (status === "rejected" && !String(remark || "").trim()) throw new BadRequestException("请填写未通过的原因");
  Object.assign(row, { moderationStatus: status, reviewedBy: adminId, reviewedAt: new Date(), reviewRemark: String(remark || "").trim().slice(0, 1000) || null });
}
