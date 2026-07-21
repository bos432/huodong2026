import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { AdminUser } from "../../entities/admin-user.entity";
import { AidApplicationEvent } from "../../entities/aid-application-event.entity";
import { AidApplicationMaterial } from "../../entities/aid-application-material.entity";
import { AidApplication, AidApplicationStatus } from "../../entities/aid-application.entity";
import { Tenant } from "../../entities/tenant.entity";
import { User } from "../../entities/user.entity";
import { aidPhoneLookupHash, AidSensitivePayload, maskAidIdentity, maskAidName, nextAidApplicationNo, openAidPayload, sealAidPayload } from "../../shared/aid-privacy";
import { AID_APPLICATION_DAILY_LIMIT, aidMaterialFileName, aidUtcDayRange, detectAidMaterialMime } from "../../shared/aid-material-security";
import { maskPhone } from "../../shared/data-masking";
import { claimPrivateDocument, privateDocumentExists, readPrivateDocument, removePrivateDocument, storePrivateDocument } from "../../shared/private-document";
import { decryptStoredSecret, encryptStoredSecret } from "../../shared/secret-storage";
import { assertUploadMalwareSafe } from "../../shared/upload-malware-scan";

type AdminContext = { id?: number; username?: string; tenantId?: number | null };
export type AidCreateInput = AidSensitivePayload & { type: "personal" | "project"; city: string; supportCategory: string; consentAccepted: boolean; consentVersion: string; businessKey: string };
export type AidSupplementInput = { content: string; businessKey: string };
export type AidMaterialInput = { category: string; businessKey: string };
export type AidAdminActionInput = { action: "assign" | "request_supplement" | "approve" | "reject" | "close" | "followup"; assigneeId?: number | null; remark?: string | null; businessKey: string };
export type AidAdminQuery = { status?: string; type?: string; city?: string; keyword?: string; page?: number; pageSize?: number };

@Injectable()
export class AidService {
  constructor(
    @InjectRepository(AidApplication) private readonly applications: Repository<AidApplication>,
    @InjectRepository(AidApplicationMaterial) private readonly materials: Repository<AidApplicationMaterial>,
    @InjectRepository(AidApplicationEvent) private readonly events: Repository<AidApplicationEvent>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    private readonly dataSource: DataSource
  ) {}

  async createApplication(input: AidCreateInput, user: User, tenantCode?: string | null) {
    const businessKey = this.businessKey(input.businessKey, "申请业务键");
    const replay = await this.applications.findOne({ where: { submitBusinessKey: businessKey } });
    if (replay) {
      if (replay.user.id !== user.id) throw new BadRequestException("申请业务键已被其他用户使用");
      return this.myApplicationView(replay);
    }
    if (!input.consentAccepted) throw new BadRequestException("请阅读并同意敏感信息处理授权");
    const payload = this.normalizePayload(input);
    if (user.phone && payload.phone !== user.phone) throw new BadRequestException("申请手机号必须与当前登录账号一致");
    const tenant = await this.tenantByCode(tenantCode);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(AidApplication);
        const lockedUser = await manager.getRepository(User).findOne({ where: { id: user.id }, lock: { mode: "pessimistic_write" } });
        if (!lockedUser) throw new ForbiddenException("当前登录用户不存在");
        const lockedReplay = await repo.findOne({ where: { submitBusinessKey: businessKey }, lock: { mode: "pessimistic_write" } });
        if (lockedReplay) {
          if (lockedReplay.user.id !== user.id) throw new BadRequestException("申请业务键已被其他用户使用");
          return this.myApplicationView(lockedReplay);
        }
        const { start, end } = aidUtcDayRange();
        const dailyCount = await repo.createQueryBuilder("application")
          .where("application.userId = :userId", { userId: user.id })
          .andWhere("application.createdAt >= :start AND application.createdAt < :end", { start, end })
          .getCount();
        if (dailyCount >= AID_APPLICATION_DAILY_LIMIT) throw new BadRequestException(`每位用户每天最多提交 ${AID_APPLICATION_DAILY_LIMIT} 份援助申请`);
        const row = await repo.save(repo.create({
          applicationNo: nextAidApplicationNo(), submitBusinessKey: businessKey, tenant, user, assignee: null, reviewer: null,
          type: input.type, status: "submitted", city: this.text(input.city, 80, "所在城市"), supportCategory: this.text(input.supportCategory, 80, "帮扶方向"),
          sensitivePayloadEncrypted: sealAidPayload(payload), phoneLookupHash: aidPhoneLookupHash(payload.phone), applicantNameMasked: maskAidName(payload.applicantName), phoneMasked: maskPhone(payload.phone),
          materialCount: 0, consentVersion: this.text(input.consentVersion, 40, "授权版本"), consentAt: new Date(), supplementRequestEncrypted: null, reviewRemarkEncrypted: null, reviewBusinessKey: null, reviewedAt: null, closedAt: null
        }));
        await this.saveEvent(manager, row, { businessKey, action: "submitted", fromStatus: null, toStatus: row.status, user, snapshot: { type: row.type, city: row.city, supportCategory: row.supportCategory, consentVersion: row.consentVersion } });
        return this.myApplicationView(row);
      });
    } catch (error) {
      if (!this.isDuplicateError(error)) throw error;
      const existing = await this.applications.findOne({ where: { submitBusinessKey: businessKey } });
      if (existing) {
        if (existing.user.id !== user.id) throw new BadRequestException("申请业务键已被其他用户使用");
        return this.myApplicationView(existing);
      }
      if (await this.events.findOne({ where: { businessKey } })) throw new BadRequestException("申请业务键已被其他操作使用");
      throw new BadRequestException("申请编号冲突，请重新提交");
    }
  }

  async myApplications(user: User, tenantCode?: string | null) {
    const tenant = await this.tenantByCode(tenantCode);
    const builder = this.applications.createQueryBuilder("application").where("application.userId = :userId", { userId: user.id }).orderBy("application.createdAt", "DESC");
    if (tenant) builder.andWhere("application.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("application.tenantId IS NULL");
    const rows = await builder.getMany();
    return Promise.all(rows.map((row) => this.myApplicationWithMaterials(row)));
  }

  async addMaterial(applicationId: number, input: AidMaterialInput, file: Express.Multer.File & { buffer: Buffer }, user: User, tenantCode?: string | null) {
    if (!file?.buffer?.length) throw new BadRequestException("请选择申请材料");
    const detectedMimetype = detectAidMaterialMime(file.buffer);
    if (!detectedMimetype || detectedMimetype !== file.mimetype) throw new BadRequestException("材料内容与文件类型不一致，仅支持 JPG、PNG、WEBP 或 PDF");
    await assertUploadMalwareSafe(file.buffer, { mode: process.env.UPLOAD_MALWARE_SCAN_MODE, host: process.env.CLAMAV_HOST, port: Number(process.env.CLAMAV_PORT || 3310), timeoutMs: Number(process.env.CLAMAV_TIMEOUT_MS || 10_000) });
    const businessKey = this.businessKey(input.businessKey, "材料上传业务键");
    const tenant = await this.tenantByCode(tenantCode);
    let storedReference: string | null = null;
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(AidApplication);
        const application = await repo.findOne({ where: { id: applicationId }, lock: { mode: "pessimistic_write" } });
        if (!application || application.user.id !== user.id) throw new NotFoundException("援助申请不存在");
        this.assertApplicationTenant(application, tenant);
        const lockedReplay = await manager.getRepository(AidApplicationEvent).findOne({ where: { businessKey } });
        if (lockedReplay) {
          if (lockedReplay.application.id !== applicationId || lockedReplay.action !== "material_uploaded") throw new BadRequestException("材料上传业务键已被其他操作使用");
          return { id: Number(lockedReplay.snapshot?.materialId || 0), replayed: true };
        }
        if (["approved", "rejected", "closed"].includes(application.status)) throw new BadRequestException("当前申请状态不能继续上传材料");
        if (application.materialCount >= 10) throw new BadRequestException("每份申请最多上传 10 份材料");
        const normalizedFile = { ...file, originalname: aidMaterialFileName(file.originalname, detectedMimetype), mimetype: detectedMimetype };
        const reference = storePrivateDocument(normalizedFile);
        storedReference = reference;
        const materialRepo = manager.getRepository(AidApplicationMaterial);
        const material = await materialRepo.save(materialRepo.create({ application, tenant: application.tenant || null, uploadedByUser: user, uploadedByAdmin: null, category: this.text(input.category, 40, "材料类型"), originalNameEncrypted: encryptStoredSecret(normalizedFile.originalname)!, mimetype: detectedMimetype, size: file.size, encryptedReference: reference, status: "active" }));
        claimPrivateDocument(reference);
        application.materialCount += 1;
        await repo.save(application);
        await this.saveEvent(manager, application, { businessKey, action: "material_uploaded", fromStatus: application.status, toStatus: application.status, user, snapshot: { materialId: material.id, category: material.category, size: material.size } });
        return this.materialView(material, true);
      });
    } catch (error) {
      if (storedReference) removePrivateDocument(storedReference);
      throw error;
    }
  }

  async submitSupplement(applicationId: number, input: AidSupplementInput, user: User, tenantCode?: string | null) {
    const businessKey = this.businessKey(input.businessKey, "补件业务键");
    const content = this.text(input.content, 2000, "补件说明");
    const tenant = await this.tenantByCode(tenantCode);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AidApplication);
      const row = await repo.findOne({ where: { id: applicationId }, lock: { mode: "pessimistic_write" } });
      if (!row || row.user.id !== user.id) throw new NotFoundException("援助申请不存在");
      this.assertApplicationTenant(row, tenant);
      const eventReplay = await manager.getRepository(AidApplicationEvent).findOne({ where: { businessKey } });
      if (eventReplay) {
        if (eventReplay.application.id !== row.id || eventReplay.action !== "supplement_submitted") throw new BadRequestException("补件业务键已被其他操作使用");
        return this.myApplicationView(row);
      }
      if (row.status !== "supplement_required") throw new BadRequestException("当前申请不需要补件");
      const fromStatus = row.status;
      row.status = "pending_review";
      await repo.save(row);
      await this.saveEvent(manager, row, { businessKey, action: "supplement_submitted", fromStatus, toStatus: row.status, user, content, snapshot: { materialCount: row.materialCount } });
      return this.myApplicationView(row);
    });
  }

  async adminList(query: AidAdminQuery = {}, admin?: AdminContext) {
    this.assertPlatform(admin);
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 30), 1), 100);
    const builder = this.applications.createQueryBuilder("application").leftJoinAndSelect("application.tenant", "tenant").leftJoinAndSelect("application.assignee", "assignee").leftJoinAndSelect("application.reviewer", "reviewer").orderBy("application.createdAt", "DESC");
    if (query.status?.trim()) builder.andWhere("application.status = :status", { status: query.status.trim() });
    if (query.type?.trim()) builder.andWhere("application.type = :type", { type: query.type.trim() });
    if (query.city?.trim()) builder.andWhere("application.city LIKE :city", { city: `%${query.city.trim()}%` });
    if (query.keyword?.trim()) builder.andWhere("(application.applicationNo LIKE :keyword OR application.applicantNameMasked LIKE :keyword OR application.phoneMasked LIKE :keyword OR application.supportCategory LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((row) => this.adminApplicationView(row)), total, page, pageSize };
  }

  async adminDetail(id: number, admin?: AdminContext) {
    this.assertPlatform(admin);
    const application = await this.applications.findOne({ where: { id } });
    if (!application) throw new NotFoundException("援助申请不存在");
    const [materials, events] = await Promise.all([this.materials.find({ where: { application: { id }, status: "active" }, order: { createdAt: "ASC" } }), this.events.find({ where: { application: { id } }, order: { createdAt: "ASC", id: "ASC" } })]);
    return { application: this.adminApplicationView(application), materials: materials.map((row) => this.materialView(row, false)), events: events.map((row) => this.eventView(row, false)) };
  }

  async revealSensitive(id: number, admin?: AdminContext) {
    this.assertPlatform(admin);
    if (!admin?.id) throw new ForbiddenException("敏感信息查看必须记录管理员");
    const application = await this.applications.findOne({ where: { id } });
    if (!application) throw new NotFoundException("援助申请不存在");
    const payload = openAidPayload(application.sensitivePayloadEncrypted);
    const [events, materials] = await Promise.all([this.events.find({ where: { application: { id } }, order: { createdAt: "ASC", id: "ASC" } }), this.materials.find({ where: { application: { id }, status: "active" }, order: { createdAt: "ASC" } })]);
    await this.dataSource.transaction((manager) => this.saveEvent(manager, application, { businessKey: `aid-reveal:${id}:${admin.id}:${Date.now()}:${Math.random().toString(16).slice(2)}`, action: "sensitive_revealed", fromStatus: application.status, toStatus: application.status, admin, snapshot: { fields: ["applicantName", "phone", "wechat", "identityNo", "address", "situation", "requestedSupport"] } }));
    return { payload: { ...payload, identityNoMasked: maskAidIdentity(payload.identityNo) }, supplementRequest: this.decryptText(application.supplementRequestEncrypted), reviewRemark: this.decryptText(application.reviewRemarkEncrypted), materials: materials.map((row) => this.materialView(row, true)), eventContents: events.filter((row) => row.contentEncrypted).map((row) => ({ id: row.id, action: row.action, content: this.decryptText(row.contentEncrypted), createdAt: row.createdAt })) };
  }

  async adminAction(id: number, input: AidAdminActionInput, admin?: AdminContext) {
    this.assertPlatform(admin);
    if (!admin?.id) throw new ForbiddenException("援助申请操作必须记录管理员");
    const businessKey = this.businessKey(input.businessKey, "操作业务键");
    const remark = input.remark ? this.text(input.remark, 2000, "操作说明") : null;
    return this.dataSource.transaction(async (manager) => {
      const eventRepo = manager.getRepository(AidApplicationEvent);
      const repo = manager.getRepository(AidApplication);
      const row = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("援助申请不存在");
      const replay = await eventRepo.findOne({ where: { businessKey } });
      if (replay) {
        if (replay.application.id !== row.id || replay.action !== input.action) throw new BadRequestException("操作业务键已被其他操作使用");
        return this.adminApplicationView(row);
      }
      const operator = await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } });
      if (!operator || !operator.enabled) throw new ForbiddenException("操作管理员不存在或已停用");
      if (row.status === "closed") throw new BadRequestException("已关闭申请不能继续处理");
      const fromStatus = row.status;
      if (input.action === "assign") {
        row.assignee = input.assigneeId ? await this.enabledPlatformAdmin(manager, input.assigneeId) : null;
      } else if (input.action === "request_supplement") {
        if (!["submitted", "pending_review"].includes(row.status)) throw new BadRequestException("当前状态不能发起补件");
        if (!remark) throw new BadRequestException("请填写补件要求");
        row.status = "supplement_required";
        row.supplementRequestEncrypted = encryptStoredSecret(remark);
      } else if (["approve", "reject"].includes(input.action)) {
        if (!["submitted", "pending_review"].includes(row.status)) throw new BadRequestException("当前状态不能审核");
        if (!remark) throw new BadRequestException("请填写审核意见");
        if (row.assignee?.id === operator.id) throw new BadRequestException("援助申请跟进人与最终审核人必须不同");
        row.status = input.action === "approve" ? "approved" : "rejected";
        row.reviewer = operator;
        row.reviewRemarkEncrypted = encryptStoredSecret(remark);
        row.reviewBusinessKey = businessKey;
        row.reviewedAt = new Date();
      } else if (input.action === "close") {
        if (!["approved", "rejected"].includes(row.status)) throw new BadRequestException("只有已审核申请可以关闭");
        row.status = "closed";
        row.closedAt = new Date();
      } else if (input.action === "followup") {
        if (!remark) throw new BadRequestException("请填写跟进记录");
      }
      const saved = await repo.save(row);
      await this.saveEvent(manager, saved, { businessKey, action: input.action, fromStatus, toStatus: saved.status, admin, content: remark, snapshot: { assigneeId: saved.assignee?.id || null, reviewerId: saved.reviewer?.id || null, materialCount: saved.materialCount } });
      return this.adminApplicationView(saved);
    });
  }

  async readMaterial(materialId: number, admin?: AdminContext) {
    this.assertPlatform(admin);
    if (!admin?.id) throw new ForbiddenException("敏感材料下载必须记录管理员");
    const material = await this.materials.findOne({ where: { id: materialId, status: "active" } });
    if (!material || !privateDocumentExists(material.encryptedReference)) throw new NotFoundException("申请材料不存在");
    await this.dataSource.transaction((manager) => this.saveEvent(manager, material.application, { businessKey: `aid-material-read:${material.id}:${admin.id}:${Date.now()}:${Math.random().toString(16).slice(2)}`, action: "material_downloaded", fromStatus: material.application.status, toStatus: material.application.status, admin, snapshot: { materialId: material.id, category: material.category } }));
    return { buffer: readPrivateDocument(material.encryptedReference), originalName: this.decryptText(material.originalNameEncrypted) || `aid-material-${material.id}`, mimetype: material.mimetype };
  }

  private async myApplicationWithMaterials(row: AidApplication) {
    const materials = await this.materials.find({ where: { application: { id: row.id }, status: "active" }, order: { createdAt: "ASC" } });
    return { ...this.myApplicationView(row), materials: materials.map((item) => this.materialView(item, true)) };
  }

  private myApplicationView(row: AidApplication) {
    return { id: row.id, applicationNo: row.applicationNo, type: row.type, status: row.status, city: row.city, supportCategory: row.supportCategory, applicantNameMasked: row.applicantNameMasked, phoneMasked: row.phoneMasked, materialCount: row.materialCount, supplementRequest: this.decryptText(row.supplementRequestEncrypted), reviewRemark: this.decryptText(row.reviewRemarkEncrypted), submittedAt: row.createdAt, updatedAt: row.updatedAt };
  }

  private adminApplicationView(row: AidApplication) {
    return { id: row.id, applicationNo: row.applicationNo, tenant: row.tenant ? { id: row.tenant.id, code: row.tenant.code, name: row.tenant.name } : null, type: row.type, status: row.status, city: row.city, supportCategory: row.supportCategory, applicantNameMasked: row.applicantNameMasked, phoneMasked: row.phoneMasked, materialCount: row.materialCount, consentVersion: row.consentVersion, consentAt: row.consentAt, assignee: row.assignee ? { id: row.assignee.id, username: row.assignee.username } : null, reviewer: row.reviewer ? { id: row.reviewer.id, username: row.reviewer.username } : null, reviewedAt: row.reviewedAt, closedAt: row.closedAt, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  private materialView(row: AidApplicationMaterial, reveal: boolean) {
    const extension = row.mimetype === "application/pdf" ? ".pdf" : row.mimetype === "image/png" ? ".png" : row.mimetype === "image/webp" ? ".webp" : ".jpg";
    return { id: row.id, category: row.category, originalName: reveal ? this.decryptText(row.originalNameEncrypted) : `加密材料-${row.id}${extension}`, mimetype: row.mimetype, size: Number(row.size || 0), status: row.status, createdAt: row.createdAt };
  }

  private eventView(row: AidApplicationEvent, reveal: boolean) {
    return { id: row.id, action: row.action, fromStatus: row.fromStatus, toStatus: row.toStatus, operator: row.admin ? { id: row.admin.id, username: row.admin.username } : row.user ? { id: row.user.id, username: "申请人" } : null, content: reveal ? this.decryptText(row.contentEncrypted) : row.contentEncrypted ? "已加密记录" : null, snapshot: row.snapshot, createdAt: row.createdAt };
  }

  private async saveEvent(manager: Pick<DataSource["manager"], "getRepository">, application: AidApplication, input: { businessKey: string; action: string; fromStatus: string | null; toStatus: string; user?: User | null; admin?: AdminContext; content?: string | null; snapshot?: Record<string, unknown> }) {
    const repo = manager.getRepository(AidApplicationEvent);
    const existing = await repo.findOne({ where: { businessKey: input.businessKey } });
    if (existing) return existing;
    const admin = input.admin?.id ? await manager.getRepository(AdminUser).findOne({ where: { id: input.admin.id } }) : null;
    return repo.save(repo.create({ application, tenant: application.tenant || null, user: input.user || null, admin, businessKey: input.businessKey, action: input.action, fromStatus: input.fromStatus, toStatus: input.toStatus, contentEncrypted: input.content ? encryptStoredSecret(input.content) : null, snapshot: input.snapshot || null }));
  }

  private normalizePayload(input: AidCreateInput): AidSensitivePayload {
    const phone = String(input.phone || "").trim();
    if (!/^1\d{10}$/.test(phone)) throw new BadRequestException("请填写正确手机号");
    return { applicantName: this.text(input.applicantName, 40, "申请人姓名"), phone, wechat: this.text(input.wechat, 80, "微信号"), organizationName: input.organizationName ? this.text(input.organizationName, 120, "机构名称") : null, identityNo: input.identityNo ? this.text(input.identityNo, 40, "证件号码") : null, address: input.address ? this.text(input.address, 200, "联系地址") : null, emergencyContact: input.emergencyContact ? this.text(input.emergencyContact, 120, "紧急联系人") : null, requestedSupport: this.text(input.requestedSupport, 1000, "申请需求"), situation: this.text(input.situation, 3000, "情况说明") };
  }

  private async tenantByCode(code?: string | null) {
    const normalized = String(code || "").trim();
    if (!normalized || normalized === "platform") return null;
    const tenant = await this.tenants.findOne({ where: { code: normalized, enabled: true } });
    if (!tenant) throw new NotFoundException("当前商家不存在或已停用");
    return tenant;
  }

  private async enabledPlatformAdmin(manager: Pick<DataSource["manager"], "getRepository">, id: number) {
    const admin = await manager.getRepository(AdminUser).findOne({ where: { id } });
    if (!admin || !admin.enabled || admin.tenant) throw new BadRequestException("援助申请负责人必须是启用的平台管理员");
    return admin;
  }

  private assertPlatform(admin?: AdminContext) {
    if (!admin?.id || admin.tenantId) throw new ForbiddenException("援助申请仅允许平台授权人员处理");
  }

  private assertApplicationTenant(application: AidApplication, tenant: Tenant | null) {
    if ((application.tenant?.id || null) !== (tenant?.id || null)) throw new NotFoundException("援助申请不存在");
  }

  private businessKey(value: unknown, label: string) {
    const key = String(value || "").trim();
    if (!/^[A-Za-z0-9:_-]{8,160}$/.test(key)) throw new BadRequestException(`${label}格式不正确`);
    return key;
  }

  private text(value: unknown, max: number, label: string) {
    const text = String(value || "").trim();
    if (!text) throw new BadRequestException(`请填写${label}`);
    return text.slice(0, max);
  }

  private decryptText(value?: string | null) { return value ? decryptStoredSecret(value) : null; }
  private isDuplicateError(error: any) { return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || error?.driverError?.code === "ER_DUP_ENTRY" || error?.driverError?.errno === 1062; }
}
