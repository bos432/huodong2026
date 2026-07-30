import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, LessThanOrEqual, Repository } from "typeorm";
import { BusinessJob, BusinessJobStatus } from "../../entities/business-job.entity";
import { nextJobFailureState } from "./job-retry-policy";
import { sanitizeAuditValue } from "../admin/audit-sanitizer";

export type BusinessJobHandler = (payload: Record<string, unknown>, job: BusinessJob) => Promise<Record<string, unknown> | void>;

@Injectable()
export class BusinessJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BusinessJobService.name);
  private readonly handlers = new Map<string, BusinessJobHandler>();
  private workerTimer: NodeJS.Timeout | null = null;

  constructor(@InjectRepository(BusinessJob) private readonly jobs: Repository<BusinessJob>, private readonly dataSource: DataSource, private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.config.get("BUSINESS_JOB_WORKER_ENABLED", "true") !== "true") return;
    const intervalSeconds = Math.max(10, Number(this.config.get("BUSINESS_JOB_WORKER_INTERVAL_SECONDS", 30)));
    const workerId = this.config.get("BUSINESS_JOB_WORKER_ID", `${process.pid}`);
    this.workerTimer = setInterval(() => this.runDue(workerId).catch((error) => this.logger.error("Business job worker scan failed", error)), intervalSeconds * 1000);
    this.workerTimer.unref();
  }

  onModuleDestroy() {
    if (this.workerTimer) clearInterval(this.workerTimer);
  }

  register(type: string, handler: BusinessJobHandler) {
    if (this.handlers.has(type)) throw new Error(`Business job handler already registered: ${type}`);
    this.handlers.set(type, handler);
  }

  async publish(input: { tenantId?: number | null; type: string; idempotencyKey: string; payload: Record<string, unknown>; maxAttempts?: number; runAt?: Date; requestId?: string | null }) {
    const tenantId = input.tenantId ?? 0;
    const existing = await this.jobs.findOne({ where: { tenantId, type: input.type, idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
    try {
      return await this.jobs.save(this.jobs.create({ tenantId, type: input.type, idempotencyKey: input.idempotencyKey, payload: input.payload, status: "pending", attemptCount: 0, maxAttempts: Math.max(1, input.maxAttempts || 5), nextAttemptAt: input.runAt || new Date(), lockedUntil: null, lockedBy: null, lastError: null, result: null, requestId: input.requestId || null, completedAt: null, deadLetteredAt: null }));
    } catch (error) {
      const concurrent = await this.jobs.findOne({ where: { tenantId, type: input.type, idempotencyKey: input.idempotencyKey } });
      if (concurrent) return concurrent;
      throw error;
    }
  }

  async runDue(workerId: string, limit = 20, now = new Date()) {
    const candidates = await this.jobs.find({ where: { status: "pending", nextAttemptAt: LessThanOrEqual(now) }, order: { nextAttemptAt: "ASC", id: "ASC" }, take: Math.max(1, Math.min(limit, 100)) });
    let completed = 0;
    let failed = 0;
    for (const candidate of candidates) {
      const claimed = await this.claim(candidate.id, workerId, now);
      if (!claimed) continue;
      const handler = this.handlers.get(claimed.type);
      if (!handler) {
        await this.fail(claimed, new Error(`No handler registered for ${claimed.type}`), now);
        failed += 1;
        continue;
      }
      try {
        const result = await handler(claimed.payload, claimed);
        await this.complete(claimed, result || {}, now);
        completed += 1;
      } catch (error) {
        await this.fail(claimed, error, now);
        failed += 1;
      }
    }
    return { scanned: candidates.length, completed, failed };
  }

  async replayDeadLetter(id: number, runAt = new Date()) {
    return this.replayForActor(id, null, runAt);
  }

  async retryByIdentity(type: string, idempotencyKey: string, actorTenantId?: number | null, runAt = new Date()) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(BusinessJob);
      const builder = repository.createQueryBuilder("job").setLock("pessimistic_write")
        .where("job.type = :type AND job.idempotencyKey = :idempotencyKey", { type, idempotencyKey });
      if (actorTenantId) builder.andWhere("job.tenantId = :actorTenantId", { actorTenantId });
      const job = await builder.getOne();
      if (!job) throw new NotFoundException("Notification business job not found");
      if (!["pending", "dead_letter"].includes(job.status)) throw new BadRequestException("当前通知任务状态不可重试");
      const wasDeadLetter = job.status === "dead_letter";
      job.status = "pending";
      job.attemptCount = wasDeadLetter ? 0 : job.attemptCount;
      job.nextAttemptAt = runAt;
      job.lockedUntil = null;
      job.lockedBy = null;
      job.lastError = null;
      job.deadLetteredAt = null;
      await repository.save(job);
      return { ...this.serializeForAdmin(job), operationApplied: true };
    });
  }

  async notificationSummary(actorTenantId?: number | null) {
    const types = ["notification.deliver", "automatic-sms.deliver", "automatic-wechat.deliver", "automatic-sms.activity-fanout", "automatic-wechat.activity-fanout", "post-event.notification"];
    const builder = this.jobs.createQueryBuilder("job")
      .select("job.status", "status")
      .addSelect("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(job.attemptCount), 0)", "attempts")
      .where("job.type IN (:...types)", { types })
      .groupBy("job.status");
    if (actorTenantId) builder.andWhere("job.tenantId = :actorTenantId", { actorTenantId });
    const rows = await builder.getRawMany<{ status: string; count: string; attempts: string }>();
    const result: Record<string, number> = { pending: 0, processing: 0, completed: 0, dead_letter: 0, cancelled: 0, attempts: 0 };
    for (const row of rows) {
      result[row.status] = Number(row.count || 0);
      result.attempts += Number(row.attempts || 0);
    }
    return result;
  }

  async list(query: { status?: string; type?: string; tenantId?: number; keyword?: string; page?: number; pageSize?: number }, actorTenantId?: number | null) {
    const rawPage = Number(query.page || 1);
    const rawPageSize = Number(query.pageSize || 20);
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const pageSize = Number.isInteger(rawPageSize) ? Math.max(1, Math.min(100, rawPageSize)) : 20;
    const allowedStatuses = new Set<BusinessJobStatus>(["pending", "processing", "completed", "dead_letter", "cancelled"]);
    if (query.status && !allowedStatuses.has(query.status as BusinessJobStatus)) throw new BadRequestException("业务任务状态筛选无效");
    const type = query.type?.trim() || "";
    const keyword = query.keyword?.trim() || "";
    if (type.length > 80) throw new BadRequestException("业务任务类型不能超过 80 个字符");
    if (keyword.length > 200) throw new BadRequestException("业务任务关键词不能超过 200 个字符");
    const builder = this.jobs.createQueryBuilder("job").orderBy("job.createdAt", "DESC").addOrderBy("job.id", "DESC");
    if (actorTenantId) builder.andWhere("job.tenantId = :actorTenantId", { actorTenantId });
    else if (query.tenantId !== undefined) {
      if (!Number.isInteger(query.tenantId) || Number(query.tenantId) < 0) throw new BadRequestException("业务任务商家筛选无效");
      builder.andWhere("job.tenantId = :tenantId", { tenantId: query.tenantId });
    }
    if (query.status) builder.andWhere("job.status = :status", { status: query.status });
    if (type) builder.andWhere("job.type = :type", { type });
    if (keyword) builder.andWhere("(job.idempotencyKey LIKE :keyword OR job.lastError LIKE :keyword OR job.requestId LIKE :keyword)", { keyword: `%${keyword}%` });
    const [items, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: items.map((job) => this.serializeForAdmin(job)), total, page, pageSize };
  }

  async replayForActor(id: number, actorTenantId?: number | null, runAt = new Date()) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(BusinessJob);
      const job = await repository.createQueryBuilder("job").setLock("pessimistic_write").where("job.id = :id", { id }).getOne();
      if (!job) throw new NotFoundException("Business job not found");
      this.assertActorTenant(job, actorTenantId);
      let operationApplied = false;
      if (job.status === "dead_letter") {
        job.status = "pending";
        job.attemptCount = 0;
        job.nextAttemptAt = runAt;
        job.lockedUntil = null;
        job.lockedBy = null;
        job.lastError = null;
        job.deadLetteredAt = null;
        await repository.save(job);
        operationApplied = true;
      }
      return { ...this.serializeForAdmin(job), operationApplied };
    });
  }

  async cancelForActor(id: number, actorTenantId?: number | null) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(BusinessJob);
      const job = await repository.createQueryBuilder("job").setLock("pessimistic_write").where("job.id = :id", { id }).getOne();
      if (!job) throw new NotFoundException("Business job not found");
      this.assertActorTenant(job, actorTenantId);
      let operationApplied = false;
      if (["pending", "dead_letter"].includes(job.status)) {
        job.status = "cancelled";
        job.lockedBy = null;
        job.lockedUntil = null;
        await repository.save(job);
        operationApplied = true;
      }
      return { ...this.serializeForAdmin(job), operationApplied };
    });
  }

  private assertActorTenant(job: BusinessJob, actorTenantId?: number | null) {
    if (actorTenantId && job.tenantId !== actorTenantId) throw new NotFoundException("Business job not found in current tenant");
  }

  private serializeForAdmin(job: BusinessJob) {
    return {
      ...job,
      payload: sanitizeAuditValue(job.payload),
      result: sanitizeAuditValue(job.result),
      lastError: job.lastError?.replace(/(password|passwd|secret|token|api[_-]?key|authorization|cookie)(\s*[:=]\s*)[^\s,;]+/gi, "$1$2********") || null
    };
  }

  private claim(id: number, workerId: string, now: Date) {
    const lockedUntil = new Date(now.getTime() + 5 * 60_000);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(BusinessJob);
      const job = await repository.createQueryBuilder("job").setLock("pessimistic_write").where("job.id = :id", { id }).getOne();
      if (!job || job.status !== "pending" || job.nextAttemptAt > now || (job.lockedUntil && job.lockedUntil > now)) return null;
      job.status = "processing";
      job.attemptCount += 1;
      job.lockedBy = workerId.slice(0, 80);
      job.lockedUntil = lockedUntil;
      job.lastWorkerId = workerId.slice(0, 80);
      job.lastStartedAt = now;
      job.lastFinishedAt = null;
      return repository.save(job);
    });
  }

  private complete(job: BusinessJob, result: Record<string, unknown>, now: Date) {
    job.status = "completed";
    job.result = result;
    job.completedAt = now;
    job.lastFinishedAt = now;
    job.lockedBy = null;
    job.lockedUntil = null;
    job.lastError = null;
    return this.jobs.save(job);
  }

  private async fail(job: BusinessJob, error: unknown, now: Date) {
    const failure = nextJobFailureState(job.attemptCount, job.maxAttempts, now);
    const message = error instanceof Error ? error.message : String(error);
    await this.jobs.update(job.id, { ...failure, lockedBy: null, lockedUntil: null, lastWorkerId: job.lastWorkerId, lastFinishedAt: now, lastError: message.slice(0, 1000) });
    this.logger.warn(`Business job ${job.id} (${job.type}) failed on attempt ${job.attemptCount}: ${message}`);
  }
}
