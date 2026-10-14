import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ token: "owner-a", tenant: "city-a", calls: [] as any[] }));
vi.mock("./api", () => ({
  API_BASE: "", getUserToken: () => state.token, getCurrentTenantCode: () => state.tenant,
  request: vi.fn(async (path, options) => { state.calls.push({ path, options }); return { id: 17 }; })
}));
vi.mock("./api-base", () => ({ API_BASE: "/api", ASSET_API_BASE: "https://local.test/api" }));
vi.mock("./asset-response", () => ({ normalizeAssetResponse: (value: unknown) => value }));
import { captureExperienceAccount, createCloudExperience, experienceAccountIsCurrent, loadCloudExperiences, cloudVisibilityLabel, updateCloudExperience, changeCloudExperienceVisibility, loadPublicExperience } from "./slow-experience-client";
const draft = { discovery: "Quiet street corner", lightNote: "Warm afternoon light", feeling: "Feeling calm today", visibility: "private" as const };
beforeEach(() => { state.calls = []; state.token = "owner-a"; state.tenant = "city-a"; });
describe("account-owned slow experience requests", () => {
  it("sends the content revision for author edits and privacy withdrawal", async () => {
    const account = captureExperienceAccount()!;
    await updateCloudExperience(account, 17, draft, 4, "", true);
    expect(state.calls[0].options.data).toMatchObject({ ...draft, revision: 4, removePhoto: true });
    await changeCloudExperienceVisibility(account, { ...draft, id: 17, revision: 5 } as any, "private");
    expect(state.calls[1].options.data.revision).toBe(5);
  });
  it("reads public details in the selected city without member authorization", async () => {
    await loadPublicExperience("city-b", 17);
    expect(state.calls[0]).toEqual({ path: "/public/slow-experiences/17", options: { tenantCode: "city-b", userToken: "" } });
  });
  it("uses POST-compatible photo editing and never sends a device path as a form field", async () => {
    const uploadFile = vi.fn(options => { options.success({ statusCode: 201, data: JSON.stringify({ code: 0, data: { id: 17 } }) }); });
    vi.stubGlobal("uni", { uploadFile });
    await updateCloudExperience(captureExperienceAccount()!, 17, { ...draft, photoPath: "local-only" } as any, 3, "blob:new-photo");
    expect(uploadFile.mock.calls[0][0]).toMatchObject({ url: "/api/public/me/slow-experiences/17/edit?tenantCode=city-a", formData: { revision: "3" } });
    expect(uploadFile.mock.calls[0][0].formData).not.toHaveProperty("photoPath");
  });
  it("captures exact account and city for requests even after active session changes", async () => {
    const account = captureExperienceAccount();
    state.token = "owner-b"; state.tenant = "city-b";
    await loadCloudExperiences(account!, 2);
    expect(state.calls[0]).toEqual({ path: "/public/me/slow-experiences?page=2", options: { userToken: "owner-a", tenantCode: "city-a" } });
    expect(experienceAccountIsCurrent(account!)).toBe(false);
  });
  it("keeps supplied retry identity and does not send device-local photo paths in JSON", async () => {
    await createCloudExperience(captureExperienceAccount()!, draft, "retry-key-one");
    expect(state.calls[0].options.data).toEqual({ ...draft, businessKey: "retry-key-one" });
  });
  it("uploads photo and text together with the captured authorization", async () => {
    const uploadFile = vi.fn(options => { options.success({ statusCode: 201, data: JSON.stringify({ code: 0, data: { id: 18 } }) }); });
    vi.stubGlobal("uni", { uploadFile });
    const account = captureExperienceAccount()!;
    state.token = "owner-b";
    expect(await createCloudExperience(account, draft, "photo-key", "blob:local-photo")).toEqual({ id: 18 });
    expect(uploadFile.mock.calls[0][0]).toMatchObject({ filePath: "blob:local-photo", name: "file", header: { Authorization: "Bearer owner-a", "x-tenant-code": "city-a" }, formData: { ...draft, businessKey: "photo-key" } });
    expect(state.calls).toHaveLength(0);
  });
  it("does not invent a cloud account for guests", () => { state.token = ""; expect(captureExperienceAccount()).toBeNull(); });
  it("distinguishes real review states without implying private notes are public", () => {
    expect(cloudVisibilityLabel({ visibility: "private", moderationStatus: "approved" })).toBe("仅自己可见");
    expect(cloudVisibilityLabel({ visibility: "public_review", moderationStatus: "pending" })).toBe("公开审核中");
    expect(cloudVisibilityLabel({ visibility: "public_review", moderationStatus: "approved" })).toBe("已公开");
    expect(cloudVisibilityLabel({ visibility: "public_review", moderationStatus: "rejected" })).toBe("公开申请未通过");
  });
});
