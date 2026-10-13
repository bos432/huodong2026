import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, IsNull, Repository } from "typeorm";
import { SlowExperienceRecord } from "../../entities/slow-experience-record.entity";
import { SlowExperienceEvent } from "../../entities/slow-experience-event.entity";
import { User } from "../../entities/user.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { ContentKeywordRule } from "../../entities/content-keyword-rule.entity";
import { ContentUserSanction } from "../../entities/content-user-sanction.entity";
import { sanctionApplies, screenGovernedContent } from "../../shared/content-governance";
import { effectivePermissionsForAdmin } from "../admin/admin-permissions";
import { claimPrivateDocument, privateDocumentExists, readPrivateDocument, removePrivateDocument, storePrivateDocument } from "../../shared/private-document";
import { createPrivateAssetToken, verifyPrivateAssetToken } from "../../shared/private-asset-token";
import { validatedUploadFile } from "../../shared/upload-security";
import { assertUploadMalwareSafe, uploadMalwareScanConfig } from "../../shared/upload-malware-scan";
import { applyRecordDraft, moderateRecord, recordIsPublic, SlowRecordDraft } from "./record-policy";

type Actor = { id: number; role?: string; tenantId?: number | null };
const scope = (tenantId: number | null) => tenantId ? `tenant:${tenantId}` : "platform";

@Injectable()
export class SlowExperienceService {
  private readonly logger = new Logger(SlowExperienceService.name);
  constructor(@InjectRepository(SlowExperienceRecord) private readonly records: Repository<SlowExperienceRecord>, private readonly dataSource: DataSource, private readonly config: ConfigService) {}

  async create(userId: number, tenantId: number | null, draft: SlowRecordDraft, businessKey: string, file?: Express.Multer.File) {
    if (!/^[a-zA-Z0-9:_-]{8,120}$/.test(String(businessKey || ""))) throw new BadRequestException("提交标识无效，请重新提交");
    const validated = file ? await this.validatePhoto(file) : null;
    let createdPhoto: string | null = null;
    try { return await this.dataSource.transaction(async manager => {
      const user = await manager.getRepository(User).findOne({ where: { id: userId }, lock: { mode: "pessimistic_write" } });
      if (!user) throw new ForbiddenException("请重新登录");
      const repository = manager.getRepository(SlowExperienceRecord);
      const previous = await repository.findOne({ where: { ownerUserId: userId, tenantScopeKey: scope(tenantId), businessKey } });
      if (previous) {
        if (previous.deletedAt) throw new BadRequestException("该提交已删除，请重新提交");
        return this.project(previous, "owner");
      }
      const row = repository.create({ ownerUserId: userId, tenantId, tenantScopeKey: scope(tenantId), businessKey, revision: 0, photoReference: null, photoMime: null, photoSize: null, deletedAt: null });
      const screened = await this.screenPublicDraft(manager, userId, tenantId, draft);
      if (validated) {
        createdPhoto = storePrivateDocument(validated, "slow-experience");
        claimPrivateDocument(createdPhoto);
        Object.assign(row, { photoReference: createdPhoto, photoMime: validated.mimetype, photoSize: validated.buffer.length });
      }
      applyRecordDraft(row, screened);
      await repository.save(row);
      await this.event(manager, row, userId, "member", "create", null);
      return this.project(row, "owner");
    }); } catch (error) { this.cleanup(createdPhoto); throw error; }
  }

  async mine(userId: number, tenantId: number | null, page = 1) {
    const rows = await this.records.find({ where: { ownerUserId: userId, tenantScopeKey: scope(tenantId), deletedAt: IsNull() }, order: { id: "DESC" }, take: 20, skip: this.offset(page) });
    return rows.map(row => this.project(row, "owner"));
  }

  async publicList(tenantId: number | null, page = 1) {
    const rows = await this.records.find({ where: { tenantScopeKey: scope(tenantId), visibility: "public_review", moderationStatus: "approved", deletedAt: IsNull() }, order: { id: "DESC" }, take: 20, skip: this.offset(page) });
    return rows.map(row => this.project(row, "public"));
  }

  async ownedDetail(id: number, userId: number, tenantId: number | null) {
    const row = await this.records.findOne({ where: { id, ownerUserId: userId, tenantScopeKey: scope(tenantId), deletedAt: IsNull() } });
    if (!row) throw new NotFoundException("记录不存在");
    return this.project(row, "owner");
  }
  async publicDetail(id: number, tenantId: number | null) {
    const row = await this.records.findOne({ where: { id, tenantScopeKey: scope(tenantId), visibility: "public_review", moderationStatus: "approved", deletedAt: IsNull() } });
    if (!row) throw new NotFoundException("手记不存在或已撤回公开");
    return this.project(row, "public");
  }

  async update(id: number, userId: number, tenantId: number | null, draft: SlowRecordDraft & { revision?: number; removePhoto?: boolean }, file?: Express.Multer.File) {
    if (file && draft.removePhoto) throw new BadRequestException("请先选择替换照片或移除照片");
    const validated = file ? await this.validatePhoto(file) : null;
    let created: string | null = null;
    let replaced: string | null = null;
    try {
      const result = await this.mutate(id, async (row, manager) => {
        this.assertOwner(row, userId, tenantId);
        if (draft.revision !== undefined && draft.revision !== row.revision) throw new ConflictException("手记已更新，请重新加载后再保存");
        const previous = row.moderationStatus;
        const next = { ...row };
        const screened = await this.screenPublicDraft(manager, userId, tenantId, draft);
        if (validated || draft.removePhoto) {
          replaced = row.photoReference;
          if (validated) { created = storePrivateDocument(validated, "slow-experience"); claimPrivateDocument(created); }
          Object.assign(next, { photoReference: created, photoMime: validated?.mimetype ?? null, photoSize: validated?.buffer.length ?? null });
        }
        applyRecordDraft(next, screened);
        Object.assign(row, next);
        await manager.getRepository(SlowExperienceRecord).save(row);
        await this.event(manager, row, userId, "member", "edit", previous);
        return this.project(row, "owner");
      });
      this.cleanup(replaced);
      return result;
    } catch (error) { this.cleanup(created); throw error; }
  }

  async uploadPhoto(id: number, userId: number, tenantId: number | null, file?: Express.Multer.File) {
    const validated = await this.validatePhoto(file);
    let created: string | null = null;
    let replaced: string | null = null;
    try {
      const result = await this.mutate(id, async (row, manager) => {
        this.assertOwner(row, userId, tenantId);
        const previous = row.moderationStatus;
        const screened = await this.screenPublicDraft(manager, userId, tenantId, row);
        replaced = row.photoReference;
        created = storePrivateDocument(validated, "slow-experience");
        claimPrivateDocument(created);
        row.photoReference = created;
        row.photoMime = validated.mimetype;
        row.photoSize = validated.buffer.length;
        applyRecordDraft(row, screened);
        await manager.getRepository(SlowExperienceRecord).save(row);
        await this.event(manager, row, userId, "member", "photo", previous);
        return this.project(row, "owner");
      });
      this.cleanup(replaced);
      return result;
    } catch (error) { this.cleanup(created); throw error; }
  }

  async remove(id: number, userId: number, tenantId: number | null) {
    let photo: string | null = null;
    await this.mutate(id, async (row, manager) => {
      this.assertOwner(row, userId, tenantId);
      const previous = row.moderationStatus;
      photo = row.photoReference;
      Object.assign(row, { deletedAt: new Date(), discovery: "", lightNote: "", feeling: "", photoReference: null, photoMime: null, photoSize: null, visibility: "private", moderationStatus: "not_submitted", reviewedAt: null, reviewedBy: null, reviewRemark: null, revision: row.revision + 1 });
      await manager.getRepository(SlowExperienceRecord).save(row);
      await this.event(manager, row, userId, "member", "delete", previous);
    });
    this.cleanup(photo);
    return { deleted: true };
  }

  async adminList(admin: Actor, page = 1) {
    this.assertAdmin(admin);
    const rows = await this.records.find({ where: { ...(admin.tenantId ? { tenantScopeKey: scope(admin.tenantId) } : {}), visibility: "public_review", moderationStatus: "pending", deletedAt: IsNull() }, order: { id: "ASC" }, take: 20, skip: this.offset(page) });
    return rows.map(row => ({ ...this.project(row, "admin", admin.id), tenantId: row.tenantId }));
  }

  async review(id: number, admin: Actor, status: "approved" | "rejected", revision: number, remark: string) {
    this.assertAdmin(admin);
    return this.mutate(id, async (row, manager) => {
      if (admin.tenantId && row.tenantId !== admin.tenantId) throw new NotFoundException("记录不存在");
      const previous = row.moderationStatus;
      if (status === "approved") {
        const screened = await this.screenPublicDraft(manager, row.ownerUserId, row.tenantId, row);
        if (["discovery", "lightNote", "feeling"].some(key => screened[key as keyof SlowRecordDraft] !== row[key as "discovery" | "lightNote" | "feeling"])) throw new ConflictException("内容治理规则已更新，请退回作者调整后重新申请公开");
      }
      moderateRecord(row, status, revision, admin.id, remark);
      await manager.getRepository(SlowExperienceRecord).save(row);
      await this.event(manager, row, admin.id, "admin", "review", previous);
      return this.project(row, "admin", admin.id);
    });
  }

  async photo(token: string) {
    const grant = verifyPrivateAssetToken(token, this.signingSecret());
    if (!grant || grant.purpose !== "slow_experience_photo" || !grant.contextId || !grant.expiresAt || grant.expiresAt <= Date.now()) throw new NotFoundException("照片访问已失效，请刷新页面");
    const row = await this.records.findOne({ where: { id: grant.contextId } });
    if (!row || row.deletedAt || row.tenantId !== grant.tenantId || row.photoReference !== grant.reference || row.photoMime !== grant.mimetype || row.photoSize !== grant.size) throw new NotFoundException("照片不存在");
    if (grant.ownerAdminId) {
      const admin = await this.dataSource.getRepository(AdminUser).findOne({ where: { id: grant.ownerAdminId, enabled: true }, relations: { tenant: true } });
      if (!admin) throw new NotFoundException("照片不存在");
      this.assertAdmin({ id: admin.id, role: admin.role, tenantId: admin.tenant?.id });
      if (!effectivePermissionsForAdmin({ role: admin.role, tenantId: admin.tenant?.id, permissions: admin.permissions }).includes("community.manage")) throw new NotFoundException("照片不存在");
      if (admin.tenant && admin.tenant.id !== row.tenantId) throw new NotFoundException("照片不存在");
    } else if (grant.ownerUserId) {
      if (grant.ownerUserId !== row.ownerUserId) throw new NotFoundException("照片不存在");
    } else if (!recordIsPublic(row)) throw new NotFoundException("照片已转为私密或待审核");
    if (!privateDocumentExists(grant.reference)) throw new NotFoundException("照片不存在");
    return { buffer: readPrivateDocument(grant.reference), mimetype: row.photoMime!, tenantId: row.tenantId, public: !grant.ownerUserId && !grant.ownerAdminId };
  }

  private project(row: SlowExperienceRecord, audience: "owner" | "public" | "admin", adminId?: number) {
    const photoUrl = row.photoReference && row.photoMime && row.photoSize ? `/api/public/slow-experiences/photos/${createPrivateAssetToken({ v: 1, purpose: "slow_experience_photo", reference: row.photoReference, tenantId: row.tenantId, contextId: row.id, ownerUserId: audience === "owner" ? row.ownerUserId : null, ownerAdminId: audience === "admin" ? adminId : null, expiresAt: Date.now() + 5 * 60_000, originalName: "experience-photo", mimetype: row.photoMime, size: row.photoSize }, this.signingSecret())}` : null;
    return { id: row.id, discovery: row.discovery, lightNote: row.lightNote, feeling: row.feeling, photoUrl, visibility: row.visibility, moderationStatus: row.moderationStatus, revision: row.revision, ...(audience !== "public" ? { reviewRemark: row.reviewRemark } : {}), createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  private assertOwner(row: SlowExperienceRecord, userId: number, tenantId: number | null) {
    if (row.deletedAt || row.ownerUserId !== userId || row.tenantScopeKey !== scope(tenantId)) throw new NotFoundException("记录不存在");
  }
  private async screenPublicDraft(manager: EntityManager, userId: number, tenantId: number | null, draft: SlowRecordDraft): Promise<SlowRecordDraft> {
    if (draft.visibility !== "public_review") return draft;
    const tenantScopes = tenantId ? [IsNull(), { id: tenantId }] : [IsNull()];
    const sanctions = await manager.getRepository(ContentUserSanction).find({ where: tenantScopes.map(tenant => ({ tenant, userId, status: "active" as const, scope: In(["all", "community"]) })) });
    if (sanctions.some(row => sanctionApplies(row, "community"))) throw new ForbiddenException("当前账号暂不可申请公开，请联系平台了解账号状态");
    const rules = await manager.getRepository(ContentKeywordRule).find({ where: tenantScopes.map(tenant => ({ tenant, enabled: true, scope: In(["all", "community"]) })), order: { tenant: { id: "DESC" }, id: "ASC" } });
    const screened = { ...draft };
    for (const key of ["discovery", "lightNote", "feeling"] as const) {
      const result = screenGovernedContent(String(draft[key] || ""), rules);
      if (result.rejected) throw new BadRequestException("内容包含禁止公开的词语，请调整后重新申请");
      screened[key] = result.text;
    }
    return screened;
  }
  private assertAdmin(admin: Actor) {
    if (!admin.id || !["super_admin", "admin", "operator"].includes(String(admin.role)) || (!admin.tenantId && !["super_admin", "admin"].includes(String(admin.role)))) throw new ForbiddenException("没有内容审核权限");
  }
  private offset(page: number) { return (Math.max(1, Math.min(10000, Math.floor(Number(page) || 1))) - 1) * 20; }
  private async validatePhoto(file?: Express.Multer.File) {
    const validated = validatedUploadFile(file, new Set(["image/jpeg", "image/png", "image/webp"]));
    if (!validated || validated.buffer.length > 5 * 1024 * 1024) throw new BadRequestException("请上传 5MB 以内的 JPG、PNG 或 WebP 照片");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    return validated;
  }
  private signingSecret() { return this.config.get<string>("PRIVATE_ASSET_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me"); }
  private cleanup(reference: string | null) { if (reference) try { removePrivateDocument(reference); } catch { this.logger.warn("Private experience photo cleanup requires retry"); } }
  private mutate<T>(id: number, operation: (row: SlowExperienceRecord, manager: EntityManager) => Promise<T>) {
    return this.dataSource.transaction(async manager => {
      const row = await manager.getRepository(SlowExperienceRecord).findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("记录不存在");
      return operation(row, manager);
    });
  }
  private async event(manager: EntityManager, row: SlowExperienceRecord, actorId: number, actorType: "member" | "admin", action: string, previousStatus: string | null) {
    await manager.getRepository(SlowExperienceEvent).save({ recordId: row.id, actorId, actorType, action, previousStatus, nextStatus: row.moderationStatus, revision: row.revision });
  }
}
