import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { AdminUser } from "../../entities/admin-user.entity";
import { Certificate } from "../../entities/certificate.entity";
import { CharityFundTransaction } from "../../entities/charity-fund-transaction.entity";
import { CredentialTemplate } from "../../entities/credential-template.entity";
import { CredentialTemplateVersion } from "../../entities/credential-template-version.entity";
import { Tenant } from "../../entities/tenant.entity";
import { CredentialTemplateConfig, CredentialTemplateKey, credentialTemplateKeys, credentialTemplateLabel, defaultCredentialTemplate, normalizeCredentialTemplate } from "../../shared/credential-template";

export type CredentialTemplateAdmin = { id?: number; username?: string; tenantId?: number | null };

@Injectable()
export class CredentialTemplateService {
  constructor(
    @InjectRepository(CredentialTemplate) private readonly templates: Repository<CredentialTemplate>,
    @InjectRepository(CredentialTemplateVersion) private readonly versions: Repository<CredentialTemplateVersion>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    @InjectRepository(CharityFundTransaction) private readonly charityTransactions: Repository<CharityFundTransaction>,
    private readonly dataSource: DataSource
  ) {}

  async list(admin?: CredentialTemplateAdmin) {
    const scopeKey = this.scopeKey(admin?.tenantId);
    const rows = await this.templates.find({ where: { scopeKey }, relations: ["updatedBy", "publishedBy"], order: { templateKey: "ASC" } });
    const byKey = new Map(rows.map((row) => [row.templateKey, row]));
    return Promise.all(credentialTemplateKeys.map(async (key) => this.view(byKey.get(key) || null, key, admin?.tenantId || null)));
  }

  async saveDraft(key: string, config: unknown, admin?: CredentialTemplateAdmin) {
    const templateKey = this.key(key);
    const row = await this.localTemplate(templateKey, admin, true);
    row.draftConfig = normalizeCredentialTemplate(templateKey, config);
    row.updatedBy = await this.admin(admin);
    return this.view(await this.templates.save(row), templateKey, admin?.tenantId || null);
  }

  async publish(key: string, note: unknown, admin?: CredentialTemplateAdmin) {
    const templateKey = this.key(key);
    const result = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(CredentialTemplate);
      let row = await repository.findOne({ where: { scopeKey: this.scopeKey(admin?.tenantId), templateKey }, lock: { mode: "pessimistic_write" } });
      if (!row) row = await this.createTemplate(repository, templateKey, admin);
      const version = Number(row.publishedVersion || 0) + 1;
      const config = normalizeCredentialTemplate(templateKey, row.draftConfig);
      const actor = await this.admin(admin, manager.getRepository(AdminUser));
      row.publishedConfig = config;
      row.publishedVersion = version;
      row.publishedBy = actor;
      row.updatedBy = actor;
      row.publishedAt = new Date();
      row = await repository.save(row);
      await manager.getRepository(CredentialTemplateVersion).save(manager.getRepository(CredentialTemplateVersion).create({ templateId: row.id, template: row, version, config, note: String(note || "").trim().slice(0, 300) || null, publishedBy: actor }));
      return row;
    });
    return this.view(result, templateKey, admin?.tenantId || null);
  }

  async history(key: string, admin?: CredentialTemplateAdmin) {
    const templateKey = this.key(key);
    const row = await this.localTemplate(templateKey, admin, false);
    if (!row) return [];
    return (await this.versions.find({ where: { templateId: row.id }, relations: ["publishedBy"], order: { version: "DESC" }, take: 50 })).map((item) => ({ id: item.id, version: item.version, config: item.config, note: item.note, publishedBy: item.publishedBy ? { id: item.publishedBy.id, username: item.publishedBy.username } : null, createdAt: item.createdAt }));
  }

  async restore(key: string, version: number, admin?: CredentialTemplateAdmin) {
    const templateKey = this.key(key);
    const row = await this.localTemplate(templateKey, admin, false);
    if (!row) throw new NotFoundException("证书模板不存在");
    const historical = await this.versions.findOne({ where: { templateId: row.id, version } });
    if (!historical) throw new NotFoundException("证书模板历史版本不存在");
    row.draftConfig = normalizeCredentialTemplate(templateKey, historical.config);
    row.updatedBy = await this.admin(admin);
    return this.view(await this.templates.save(row), templateKey, admin?.tenantId || null);
  }

  async publishedSnapshot(key: CredentialTemplateKey, tenantId?: number | null) {
    const local = await this.templates.findOne({ where: { scopeKey: this.scopeKey(tenantId), templateKey: key } });
    if (local?.publishedConfig) return { version: local.publishedVersion, config: normalizeCredentialTemplate(key, local.publishedConfig), source: tenantId ? "tenant" : "platform" } as const;
    if (tenantId) {
      const platform = await this.templates.findOne({ where: { scopeKey: "platform", templateKey: key } });
      if (platform?.publishedConfig) return { version: platform.publishedVersion, config: normalizeCredentialTemplate(key, platform.publishedConfig), source: "platform" } as const;
    }
    return { version: 0, config: defaultCredentialTemplate(key), source: "default" } as const;
  }

  async ensureCertificateSnapshot(certificate: Certificate) {
    if (certificate.templateSnapshot) return { version: certificate.templateVersion || 0, config: normalizeCredentialTemplate(certificate.templateKey, certificate.templateSnapshot) };
    const snapshot = await this.publishedSnapshot(certificate.templateKey, certificate.tenantId);
    certificate.templateVersion = snapshot.version;
    certificate.templateSnapshot = snapshot.config;
    await this.certificates.save(certificate);
    return snapshot;
  }

  async ensureCharitySnapshot(transaction: CharityFundTransaction) {
    if (transaction.certificateTemplateSnapshot) return { version: transaction.certificateTemplateVersion || 0, config: normalizeCredentialTemplate("charity_contribution", transaction.certificateTemplateSnapshot) };
    const snapshot = await this.publishedSnapshot("charity_contribution", transaction.tenant?.id || null);
    transaction.certificateTemplateVersion = snapshot.version;
    transaction.certificateTemplateSnapshot = snapshot.config;
    await this.charityTransactions.save(transaction);
    return snapshot;
  }

  normalizePreview(key: string, config: unknown) {
    const templateKey = this.key(key);
    return { key: templateKey, label: credentialTemplateLabel(templateKey), config: normalizeCredentialTemplate(templateKey, config) };
  }

  private async view(row: CredentialTemplate | null, key: CredentialTemplateKey, tenantId: number | null) {
    const effective = await this.publishedSnapshot(key, tenantId);
    const draft = normalizeCredentialTemplate(key, row?.draftConfig || effective.config);
    return {
      id: row?.id || null,
      templateKey: key,
      label: credentialTemplateLabel(key),
      scopeKey: this.scopeKey(tenantId),
      draftConfig: draft,
      publishedConfig: row?.publishedConfig ? normalizeCredentialTemplate(key, row.publishedConfig) : null,
      publishedVersion: row?.publishedVersion || 0,
      publishedAt: row?.publishedAt || null,
      updatedAt: row?.updatedAt || null,
      updatedBy: row?.updatedBy ? { id: row.updatedBy.id, username: row.updatedBy.username } : null,
      publishedBy: row?.publishedBy ? { id: row.publishedBy.id, username: row.publishedBy.username } : null,
      effectiveConfig: effective.config,
      effectiveVersion: effective.version,
      effectiveSource: effective.source,
      hasUnpublishedChanges: JSON.stringify(draft) !== JSON.stringify(row?.publishedConfig ? normalizeCredentialTemplate(key, row.publishedConfig) : effective.config)
    };
  }

  private async localTemplate(key: CredentialTemplateKey, admin: CredentialTemplateAdmin | undefined, create: true): Promise<CredentialTemplate>;
  private async localTemplate(key: CredentialTemplateKey, admin: CredentialTemplateAdmin | undefined, create: false): Promise<CredentialTemplate | null>;
  private async localTemplate(key: CredentialTemplateKey, admin: CredentialTemplateAdmin | undefined, create: boolean): Promise<CredentialTemplate | null> {
    const scopeKey = this.scopeKey(admin?.tenantId);
    const existing = await this.templates.findOne({ where: { scopeKey, templateKey: key }, relations: ["updatedBy", "publishedBy"] });
    if (existing || !create) return existing;
    return this.createTemplate(this.templates, key, admin);
  }

  private async createTemplate(repository: Repository<CredentialTemplate>, key: CredentialTemplateKey, admin?: CredentialTemplateAdmin) {
    const tenantRepository = repository.manager.getRepository(Tenant);
    const adminRepository = repository.manager.getRepository(AdminUser);
    const tenant = admin?.tenantId ? await tenantRepository.findOneBy({ id: admin.tenantId }) : null;
    if (admin?.tenantId && !tenant) throw new NotFoundException("当前商家不存在");
    return repository.save(repository.create({ scopeKey: this.scopeKey(admin?.tenantId), templateKey: key, tenant, draftConfig: defaultCredentialTemplate(key), publishedConfig: null, publishedVersion: 0, updatedBy: await this.admin(admin, adminRepository), publishedBy: null, publishedAt: null }));
  }

  private key(value: string) {
    if (!credentialTemplateKeys.includes(value as CredentialTemplateKey)) throw new BadRequestException("不支持的证书模板类型");
    return value as CredentialTemplateKey;
  }

  private scopeKey(tenantId?: number | null) { return tenantId ? `tenant:${tenantId}` : "platform"; }
  private async admin(admin?: CredentialTemplateAdmin, repository = this.admins) { return admin?.id ? repository.findOneBy({ id: admin.id }) : null; }
}
