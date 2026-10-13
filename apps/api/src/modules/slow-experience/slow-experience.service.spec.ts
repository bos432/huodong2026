import { describe, expect, it, vi } from "vitest";
const files = vi.hoisted(() => new Map<string, Buffer>());
vi.mock("../../entities/content-user-sanction.entity", () => ({ ContentUserSanction: class ContentUserSanction {} }));
vi.mock("../../shared/private-document", () => ({
  storePrivateDocument: (file: any) => { const key = `secure-private-document://slow-experience/photo-${files.size + 1}.enc`; files.set(key, file.buffer); return key; },
  claimPrivateDocument: () => true,
  privateDocumentExists: (key: string) => files.has(key),
  readPrivateDocument: (key: string) => files.get(key),
  removePrivateDocument: (key: string) => files.delete(key)
}));
import { SlowExperienceService } from "./slow-experience.service";
import { SlowExperienceRecord } from "../../entities/slow-experience-record.entity";
import { SlowExperienceEvent } from "../../entities/slow-experience-event.entity";
import { User } from "../../entities/user.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { ContentKeywordRule } from "../../entities/content-keyword-rule.entity";
import { ContentUserSanction } from "../../entities/content-user-sanction.entity";
import { createPrivateAssetToken, verifyPrivateAssetToken } from "../../shared/private-asset-token";

const draft = { discovery: "A quiet corner", lightNote: "Gentle afternoon light", feeling: "Feeling rested", visibility: "private" as const };
const reviewer = { id: 9, role: "operator", tenantId: 10 };
const png = { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]), mimetype: "image/png", originalname: "photo.png", size: 9 } as any;

function setup() {
  files.clear();
  const rows: SlowExperienceRecord[] = [];
  const events: any[] = [];
  const rules: any[] = [];
  const sanctions: any[] = [];
  const matches = (row: any, where: any): boolean => Array.isArray(where) ? where.some(item => matches(row, item)) : Object.entries(where).every(([key, value]: any) => value?._type === "isNull" ? row[key] == null : value?._type === "in" ? value._value.includes(row[key]) : value && typeof value === "object" ? matches(row[key] || {}, value) : row[key] === value);
  const records = {
    create: (value: any) => ({ createdAt: new Date(), updatedAt: new Date(), ...value }),
    save: async (row: any) => { if (!row.id) { row.id = rows.length + 1; rows.push(row); } return row; },
    findOne: async ({ where }: any) => rows.find(row => matches(row, where)) || null,
    find: async ({ where }: any) => rows.filter(row => matches(row, where))
  };
  const repository = (entity: any) => entity === SlowExperienceRecord ? records : entity === SlowExperienceEvent ? { save: async (event: any) => events.push(event) } : entity === User ? { findOne: async ({ where }: any) => ({ id: where.id }) } : entity === AdminUser ? { findOne: async () => ({ ...reviewer, enabled: true, tenant: { id: 10 } }) } : entity === ContentKeywordRule ? { find: async ({ where }: any) => rules.filter(row => matches(row, where)) } : entity === ContentUserSanction ? { find: async ({ where }: any) => sanctions.filter(row => matches(row, where)) } : null;
  const manager = { getRepository: repository };
  const ds = { transaction: async (fn: any) => fn(manager), getRepository: repository };
  const config = { get: (key: string, fallback?: any) => key === "JWT_SECRET" ? "test-secret" : fallback };
  return { service: new SlowExperienceService(records as any, ds as any, config as any), rows, events, rules, sanctions };
}
function photoToken(row: any) { return row.photoUrl.split("/").pop(); }

describe("account-owned slow-experience records", () => {
  it("keeps private writing intact but blocks a sanctioned user's public submission", async () => {
    const { service, sanctions } = setup();
    sanctions.push({ userId: 1, tenant: null, scope: "community", status: "active", startsAt: new Date(0), endsAt: null, type: "mute" });
    const own = await service.create(1, 10, draft, "private-sanction");
    await expect(service.update(own.id, 1, 10, { ...draft, visibility: "public_review" })).rejects.toThrow("暂不可申请公开");
    expect((await service.mine(1, 10))[0].visibility).toBe("private");
    await service.remove(own.id, 1, 10);
    expect(await service.mine(1, 10)).toEqual([]);
  });
  it("applies global and current-tenant keyword rules without leaking another city's policy", async () => {
    const { service, rules } = setup();
    rules.push({ id: 1, tenant: null, enabled: true, scope: "all", keyword: "prohibited", matchMode: "contains", action: "reject" });
    rules.push({ id: 2, tenant: { id: 20 }, enabled: true, scope: "community", keyword: "quiet", matchMode: "contains", action: "reject" });
    const publicDraft = { ...draft, visibility: "public_review" as const };
    await service.create(1, 10, publicDraft, "other-city-rules");
    await expect(service.create(1, 10, { ...publicDraft, feeling: "A prohibited feeling" }, "keyword-reject")).rejects.toThrow("禁止公开");
    await expect(service.create(1, 20, publicDraft, "own-city-reject")).rejects.toThrow("禁止公开");
    await service.create(1, 10, { ...draft, feeling: "A prohibited feeling" }, "private-keyword");
  });
  it("masks a public submission consistently while retaining manual review", async () => {
    const { service, rules } = setup();
    rules.push({ id: 1, tenant: null, enabled: true, scope: "community", keyword: "corner", matchMode: "contains", action: "mask", replacement: "place" });
    const own = await service.create(1, 10, draft, "mask-private");
    expect(own.discovery).toBe(draft.discovery);
    const submitted = await service.update(own.id, 1, 10, { ...draft, visibility: "public_review" });
    expect(submitted.discovery).toBe("A quiet place");
    expect(submitted.moderationStatus).toBe("pending");
  });
  it("rechecks newly active policy at approval and allows rejection or privacy reversal", async () => {
    const { service, rules, sanctions } = setup();
    const own = await service.create(1, 10, { ...draft, visibility: "public_review" }, "policy-review");
    rules.push({ id: 1, tenant: null, enabled: true, scope: "community", keyword: "corner", matchMode: "contains", action: "reject" });
    await expect(service.review(own.id, reviewer, "approved", own.revision, "")).rejects.toThrow("禁止公开");
    expect(await service.publicList(10)).toEqual([]);
    await service.review(own.id, reviewer, "rejected", own.revision, "Please adjust text");
    sanctions.push({ userId: 1, tenant: { id: 10 }, scope: "all", status: "active", startsAt: new Date(0), endsAt: null });
    const privateRow = await service.update(own.id, 1, 10, draft);
    expect(privateRow.visibility).toBe("private");
  });
  it("ignores expired, future, foreign-user and forum-only sanctions", async () => {
    const { service, sanctions } = setup();
    const base = { userId: 1, tenant: null, scope: "community", status: "active", startsAt: new Date(0), endsAt: null };
    sanctions.push({ ...base, endsAt: new Date(1) }, { ...base, startsAt: new Date(Date.now() + 60_000) }, { ...base, userId: 2 }, { ...base, scope: "forum" }, { ...base, tenant: { id: 20 } });
    const own = await service.create(1, 10, { ...draft, visibility: "public_review" }, "inactive-sanctions");
    expect(own.moderationStatus).toBe("pending");
  });
  it("refuses approval when masking policy changed after the reviewer loaded the text", async () => {
    const { service, rules } = setup();
    const own = await service.create(1, 10, { ...draft, visibility: "public_review" }, "changed-mask-rule");
    rules.push({ id: 1, tenant: null, enabled: true, scope: "community", keyword: "corner", matchMode: "contains", action: "mask", replacement: "place" });
    await expect(service.review(own.id, reviewer, "approved", own.revision, "")).rejects.toThrow("内容治理规则已更新");
    expect((await service.mine(1, 10))[0].discovery).toBe(draft.discovery);
    expect(await service.publicList(10)).toEqual([]);
  });
  it("refuses approval if the author was sanctioned after submission", async () => {
    const { service, sanctions } = setup();
    const own = await service.create(1, 10, { ...draft, visibility: "public_review" }, "changed-sanction");
    sanctions.push({ userId: 1, tenant: { id: 10 }, scope: "community", status: "active", startsAt: new Date(0), endsAt: null });
    await expect(service.review(own.id, reviewer, "approved", own.revision, "")).rejects.toThrow("暂不可申请公开");
    expect(await service.publicList(10)).toEqual([]);
  });
  it("offers an owner detail but never a private or foreign public detail", async () => {
    const { service } = setup();
    const one = await service.create(1, 10, draft, "attempt-detail");
    expect((await service.ownedDetail(one.id, 1, 10)).id).toBe(one.id);
    await expect(service.ownedDetail(one.id, 2, 10)).rejects.toThrow("记录不存在");
    await expect(service.publicDetail(one.id, 10)).rejects.toThrow("手记不存在或已撤回公开");
    const pending = await service.update(one.id, 1, 10, { ...draft, visibility: "public_review" });
    await service.review(one.id, reviewer, "approved", pending.revision, "");
    expect((await service.publicDetail(one.id, 10)).id).toBe(one.id);
    await expect(service.publicDetail(one.id, 20)).rejects.toThrow();
  });
  it("rejects stale author edits without changing the latest content", async () => {
    const { service } = setup();
    const one = await service.create(1, 10, draft, "attempt-edit");
    const next = await service.update(one.id, 1, 10, { ...draft, discovery: "A new street detail", revision: one.revision });
    await expect(service.update(one.id, 1, 10, { ...draft, revision: one.revision })).rejects.toThrow("手记已更新，请重新加载后再保存");
    expect((await service.mine(1, 10))[0].discovery).toBe(next.discovery);
  });
  it("edits text and replaces a photo atomically, returns to review and revokes the previous grants", async () => {
    const { service, events } = setup();
    const one = await service.create(1, 10, { ...draft, visibility: "public_review" }, "attempt-edit-photo", png);
    await service.review(one.id, reviewer, "approved", one.revision, "");
    const [published] = await service.publicList(10);
    const edited = await service.update(one.id, 1, 10, { ...draft, visibility: "public_review", discovery: "Changed street detail", revision: one.revision }, png);
    expect(edited.moderationStatus).toBe("pending");
    expect(edited.revision).toBe(one.revision + 1);
    expect(edited.discovery).toBe("Changed street detail");
    await expect(service.photo(photoToken(published))).rejects.toThrow();
    expect(files.size).toBe(1);
    expect(events.at(-1).action).toBe("edit");
    const removed = await service.update(one.id, 1, 10, { ...draft, removePhoto: true, revision: edited.revision });
    expect(removed.photoUrl).toBeNull();
    expect(files.size).toBe(0);
  });
  it("replays a creation only within the owner/tenant scope without duplicating events", async () => {
    const { service, events } = setup();
    const one = await service.create(1, 10, draft, "attempt-one");
    expect((await service.create(1, 10, draft, "attempt-one")).id).toBe(one.id);
    expect((await service.create(2, 10, draft, "attempt-one")).id).not.toBe(one.id);
    expect((await service.create(1, 20, draft, "attempt-one")).id).not.toBe(one.id);
    expect(events).toHaveLength(3);
    expect(await service.mine(2, 20)).toEqual([]);
    expect(await service.publicList(10)).toEqual([]);
  });
  it("rejects foreign updates, deletes, photos and tenant-crossing reviews", async () => {
    const { service } = setup();
    const one = await service.create(1, 10, draft, "attempt-one");
    await expect(service.update(one.id, 2, 10, draft)).rejects.toThrow("记录不存在");
    await expect(service.remove(one.id, 1, 20)).rejects.toThrow("记录不存在");
    await expect(service.uploadPhoto(one.id, 2, 10, png)).rejects.toThrow("记录不存在");
    await expect(service.review(one.id, { ...reviewer, tenantId: 20 }, "approved", 1, "")).rejects.toThrow("记录不存在");
    await expect(service.adminList({ id: 9, role: "operator" })).rejects.toThrow("没有内容审核权限");
    await expect(service.adminList({ id: 9, role: "finance", tenantId: 10 })).rejects.toThrow("没有内容审核权限");
  });
  it("publishes only reviewed content and invalidates public photo links on privacy reversal", async () => {
    const { service, rows } = setup();
    const one = await service.create(1, 10, { ...draft, visibility: "public_review", lightNote: "" }, "attempt-one", png);
    expect(one.moderationStatus).toBe("pending");
    expect(await service.publicList(10)).toEqual([]);
    await service.review(one.id, reviewer, "approved", one.revision, "");
    const [published] = await service.publicList(10);
    expect(published).not.toHaveProperty("ownerUserId");
    expect(published).not.toHaveProperty("photoReference");
    expect((await service.photo(photoToken(published))).buffer).toEqual(png.buffer);
    await service.update(one.id, 1, 10, draft);
    await expect(service.photo(photoToken(published))).rejects.toThrow();
    expect(await service.publicList(10)).toEqual([]);
    expect(rows[0].moderationStatus).toBe("not_submitted");
  });
  it("deletes contents and revokes owner photo grants, retaining only the audit event", async () => {
    const { service, rows, events } = setup();
    const one = await service.create(1, 10, draft, "attempt-one", png);
    const token = photoToken(one);
    expect((await service.photo(token)).buffer).toEqual(png.buffer);
    await service.remove(one.id, 1, 10);
    expect(await service.mine(1, 10)).toEqual([]);
    await expect(service.photo(token)).rejects.toThrow();
    expect(rows[0].discovery).toBe("");
    expect(rows[0].photoReference).toBeNull();
    expect(files.size).toBe(0);
    expect(events.at(-1).action).toBe("delete");
    await expect(service.create(1, 10, draft, "attempt-one")).rejects.toThrow("该提交已删除");
  });
  it("rejects expired, tampered and other-purpose photo grants", async () => {
    const { service } = setup();
    const one = await service.create(1, 10, draft, "attempt-one", png);
    const token = photoToken(one);
    const payload = verifyPrivateAssetToken(token, "test-secret")!;
    await expect(service.photo(token + "x")).rejects.toThrow();
    await expect(service.photo(createPrivateAssetToken({ ...payload, expiresAt: Date.now() - 1 }, "test-secret"))).rejects.toThrow();
    await expect(service.photo(createPrivateAssetToken({ ...payload, purpose: "settlement_proof" }, "test-secret"))).rejects.toThrow();
    await expect(service.photo(createPrivateAssetToken({ ...payload, ownerUserId: 2 }, "test-secret"))).rejects.toThrow();
  });
  it("rejects disguised image content and resubmits changed photos for review", async () => {
    const { service } = setup();
    await expect(service.create(1, 10, draft, "attempt-one", { ...png, buffer: Buffer.from("<svg></svg>") })).rejects.toThrow();
    const one = await service.create(1, 10, { ...draft, visibility: "public_review" }, "attempt-one", png);
    await service.review(one.id, reviewer, "approved", one.revision, "");
    const edited = await service.uploadPhoto(one.id, 1, 10, png);
    expect(edited.moderationStatus).toBe("pending");
    expect(edited.revision).toBe(one.revision + 1);
    expect(await service.publicList(10)).toEqual([]);
    await expect(service.review(one.id, reviewer, "approved", one.revision, "")).rejects.toThrow();
  });
});
