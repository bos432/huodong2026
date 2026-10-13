import type { PublicSlowExperienceRecord } from "@activity/shared";
import { getUserToken, getCurrentTenantCode, request } from "./api";
import { API_BASE, ASSET_API_BASE } from "./api-base";
import { normalizeAssetResponse } from "./asset-response";

export type ExperienceAccount = { userToken: string; tenantCode: string };
export type CloudExperienceDraft = Pick<PublicSlowExperienceRecord, "discovery" | "lightNote" | "feeling" | "visibility">;
export function captureExperienceAccount(): ExperienceAccount | null {
  const userToken = getUserToken();
  return userToken ? { userToken, tenantCode: getCurrentTenantCode() } : null;
}
export function experienceAccountIsCurrent(account: ExperienceAccount) {
  return account.userToken === getUserToken() && account.tenantCode === getCurrentTenantCode();
}
export function loadCloudExperiences(account: ExperienceAccount, page = 1) {
  return request<PublicSlowExperienceRecord[]>(`/public/me/slow-experiences?page=${page}`, account);
}
export function createCloudExperience(account: ExperienceAccount, draft: CloudExperienceDraft, businessKey: string, photoPath = ""): Promise<PublicSlowExperienceRecord> {
  const data = { discovery: draft.discovery, lightNote: draft.lightNote, feeling: draft.feeling, visibility: draft.visibility, businessKey };
  if (!photoPath) return request("/public/me/slow-experiences", { ...account, method: "POST", data });
  return uploadExperience(account, "/public/me/slow-experiences", data, photoPath);
}
function uploadExperience(account: ExperienceAccount, path: string, data: Record<string, string>, photoPath: string): Promise<PublicSlowExperienceRecord> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE}${path}?tenantCode=${encodeURIComponent(account.tenantCode)}`,
      filePath: photoPath, name: "file", formData: data, timeout: 30_000,
      header: { Authorization: `Bearer ${account.userToken}`, ...(account.tenantCode ? { "x-tenant-code": account.tenantCode } : {}) },
      success(response) {
        let body: any;
        try { body = JSON.parse(response.data); } catch { reject(new Error("服务器返回异常，请重试")); return; }
        if (response.statusCode >= 200 && response.statusCode < 300 && body?.code === 0) resolve(normalizeAssetResponse(body.data, ASSET_API_BASE));
        else reject(new Error(body?.message || "照片和手记保存失败，请重试"));
      },
      fail() { reject(new Error("照片和手记未能确认保存，请检查网络后重试")); }
    });
  });
}
export function changeCloudExperienceVisibility(account: ExperienceAccount, record: PublicSlowExperienceRecord, visibility: CloudExperienceDraft["visibility"]) {
  return request<PublicSlowExperienceRecord>(`/public/me/slow-experiences/${record.id}`, { ...account, method: "PATCH", data: { discovery: record.discovery, lightNote: record.lightNote, feeling: record.feeling, visibility, revision: record.revision } });
}
export function loadOwnedExperience(account: ExperienceAccount, id: number) {
  return request<PublicSlowExperienceRecord>(`/public/me/slow-experiences/${id}`, account);
}
export function updateCloudExperience(account: ExperienceAccount, id: number, draft: CloudExperienceDraft, revision: number, photoPath = "", removePhoto = false) {
  const data = { discovery: draft.discovery, lightNote: draft.lightNote, feeling: draft.feeling, visibility: draft.visibility, revision, removePhoto };
  if (!photoPath) return request<PublicSlowExperienceRecord>(`/public/me/slow-experiences/${id}`, { ...account, method: "PATCH", data });
  return uploadExperience(account, `/public/me/slow-experiences/${id}/edit`, { discovery: data.discovery, lightNote: data.lightNote, feeling: data.feeling, visibility: data.visibility, revision: String(revision), removePhoto: String(removePhoto) }, photoPath);
}
export function loadPublicExperiences(tenantCode: string, page = 1) {
  return request<PublicSlowExperienceRecord[]>(`/public/slow-experiences?page=${page}`, { tenantCode, userToken: "" });
}
export function loadPublicExperience(tenantCode: string, id: number) {
  return request<PublicSlowExperienceRecord>(`/public/slow-experiences/${id}`, { tenantCode, userToken: "" });
}
export function deleteCloudExperience(account: ExperienceAccount, id: number) {
  return request(`/public/me/slow-experiences/${id}`, { ...account, method: "DELETE" });
}
export function cloudVisibilityLabel(record: Pick<PublicSlowExperienceRecord, "visibility" | "moderationStatus">) {
  if (record.visibility === "private") return "仅自己可见";
  return record.moderationStatus === "approved" ? "已公开" : record.moderationStatus === "rejected" ? "公开申请未通过" : "公开审核中";
}
