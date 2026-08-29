import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, Repository } from "typeorm";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberPointEventType, MemberPointRule } from "../../entities/member-point-rule.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { Tenant } from "../../entities/tenant.entity";
import { User } from "../../entities/user.entity";
import { growthFromPointLog, levelExpiry, manualLevelOverrideActive, memberLevelScopeKey, memberLevelSnapshot, resolveGrowthLevel } from "../../shared/member-level-engine";
import { applyPointMutation, calculatePointRuleAward, replayPointAvailability } from "../../shared/member-point-ledger";

export type PointNegativePolicy = "reject" | "debt";

export type PostMemberPointsInput = {
  user: User;
  tenant?: Tenant | null;
  points: number;
  sourceType: string;
  sourceId: string | number;
  remark?: string | null;
  expiresAt?: Date | null;
  growthValue?: number;
  type?: "earn" | "deduct" | "adjust";
  negativePolicy?: PointNegativePolicy;
  relatedLog?: MemberPointLog | null;
  batchKey?: string | null;
  ruleSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type PostMemberPointsResult = {
  log: MemberPointLog;
  profile: MemberProfile;
  idempotent: boolean;
  debtRecoveryLog: MemberPointLog | null;
};

type PointEntityManager = Pick<EntityManager, "getRepository">;

export type AwardMemberPointEventInput = Omit<PostMemberPointsInput, "points" | "growthValue" | "expiresAt" | "ruleSnapshot"> & {
  eventType: MemberPointEventType;
  amountFen?: number;
  occurredAt?: Date;
};

@Injectable()
export class MemberPointsService {
  private readonly logger = new Logger(MemberPointsService.name);

  constructor(private readonly dataSource: DataSource) {}

  post(input: PostMemberPointsInput, manager?: PointEntityManager) {
    if (manager) return this.postInTransaction(manager, input);
    return this.dataSource.transaction((transactionManager) => this.postInTransaction(transactionManager, input));
  }

  async awardEvent(input: AwardMemberPointEventInput, manager?: PointEntityManager) {
    const repo = manager ? manager.getRepository(MemberPointRule) : this.dataSource.getRepository(MemberPointRule);
    const tenantScopeKey = memberLevelScopeKey(input.tenant || null);
    const rule = await repo.findOne({ where: { tenantScopeKey, eventType: input.eventType } })
      || await repo.findOne({ where: { tenantScopeKey: "platform", eventType: input.eventType } });
    // Points are a post-commit benefit. A missing tenant rule must not turn a
    // successful payment, check-in, or refund into a failed business action.
    if (!rule) {
      this.logger.warn(`Skipping member points award: rule missing scope=${tenantScopeKey} event=${input.eventType}`);
      return { rule: null, award: { points: 0, growthValue: 0 }, result: null, skipped: true as const };
    }
    const award = calculatePointRuleAward(rule, input.amountFen || 0);
    if (!award.points) return { rule, award, result: null };
    const occurredAt = input.occurredAt || new Date();
    const expiresAt = rule.validityDays ? new Date(occurredAt.getTime() + Math.max(rule.validityDays, 1) * 86400000) : null;
    const result = await this.post({
      ...input,
      points: award.points,
      growthValue: award.growthValue,
      expiresAt,
      ruleSnapshot: {
        id: rule.id,
        eventType: rule.eventType,
        name: rule.name,
        version: rule.version,
        tenantScopeKey: rule.tenantScopeKey,
        enabled: rule.enabled,
        calculationMode: rule.calculationMode,
        fixedPoints: rule.fixedPoints,
        amountFenPerPoint: rule.amountFenPerPoint,
        growthMode: rule.growthMode,
        fixedGrowth: rule.fixedGrowth,
        validityDays: rule.validityDays
      }
    }, manager);
    return { rule, award, result };
  }

  async activeBalance(userId: number, tenantScopeKey: string, manager?: PointEntityManager, now = new Date()) {
    return Math.max(await this.rawActiveBalance(userId, tenantScopeKey, manager, now), 0);
  }

  async reconcileExpiredAccount(input: { user: User; tenant?: Tenant | null; batchKey: string; now?: Date }, manager?: PointEntityManager) {
    if (manager) return this.reconcileExpiredAccountInTransaction(manager, input);
    return this.dataSource.transaction((transactionManager) => this.reconcileExpiredAccountInTransaction(transactionManager, input));
  }

  private async rawActiveBalance(userId: number, tenantScopeKey: string, manager?: PointEntityManager, now = new Date()) {
    const repo = manager ? manager.getRepository(MemberPointLog) : this.dataSource.getRepository(MemberPointLog);
    const row = await repo.createQueryBuilder("log")
      .select("COALESCE(SUM(log.points), 0)", "balance")
      .where("log.userId = :userId", { userId })
      .andWhere("log.tenantScopeKey = :tenantScopeKey", { tenantScopeKey })
      .andWhere("log.reversedAt IS NULL")
      .andWhere("(log.expiresAt IS NULL OR log.expiresAt > :now)", { now })
      .getRawOne<{ balance: string }>();
    return Number(row?.balance || 0);
  }

  private async reconcileExpiredAccountInTransaction(manager: PointEntityManager, input: { user: User; tenant?: Tenant | null; batchKey: string; now?: Date }) {
    const now = input.now || new Date();
    const tenant = input.tenant || null;
    const tenantScopeKey = memberLevelScopeKey(tenant);
    const logRepo = manager.getRepository(MemberPointLog);
    const profileRepo = manager.getRepository(MemberProfile);
    const profile = await this.lockProfile(profileRepo, input.user, tenant, tenantScopeKey);
    const entries = await logRepo.find({ where: { user: { id: input.user.id }, tenantScopeKey }, order: { createdAt: "ASC", id: "ASC" } });
    const replay = replayPointAvailability(entries, now);
    const rawBalance = await this.rawActiveBalance(input.user.id, tenantScopeKey, manager, now);
    const adjustment = replay.availablePoints - rawBalance;
    let reconciliationLog = await logRepo.findOne({ where: { tenantScopeKey, user: { id: input.user.id }, sourceType: "points_expiry_reconciliation", sourceId: input.batchKey } });
    if (!reconciliationLog && adjustment) {
      reconciliationLog = await logRepo.save(logRepo.create({
        user: input.user,
        tenant,
        tenantScopeKey,
        points: adjustment,
        requestedPoints: adjustment,
        balanceBefore: rawBalance,
        balanceAfter: replay.availablePoints,
        growthValue: 0,
        expiresAt: null,
        expiryProcessedAt: null,
        reversedAt: null,
        type: "adjust",
        sourceType: "points_expiry_reconciliation",
        sourceId: input.batchKey,
        relatedLog: null,
        batchKey: input.batchKey,
        ruleSnapshot: { mode: "earliest_expiry_first" },
        metadata: { expiredPoints: replay.expiredPoints, rawBalance, availablePoints: replay.availablePoints },
        remark: "积分到期批次余额校准"
      }));
    }
    profile.points = replay.availablePoints;
    await profileRepo.save(profile);
    return { profile, reconciliationLog, adjustment, expiredPoints: replay.expiredPoints };
  }

  private async postInTransaction(manager: PointEntityManager, input: PostMemberPointsInput): Promise<PostMemberPointsResult> {
    const requestedPoints = Math.trunc(Number(input.points || 0));
    if (!requestedPoints) throw new BadRequestException("积分变动不能为 0");
    const tenant = input.tenant || null;
    const tenantScopeKey = memberLevelScopeKey(tenant);
    const sourceType = String(input.sourceType || "").trim();
    const sourceId = String(input.sourceId ?? "").trim();
    if (!sourceType || !sourceId) throw new BadRequestException("积分业务来源不能为空");

    const logRepo = manager.getRepository(MemberPointLog);
    const profileRepo = manager.getRepository(MemberProfile);
    const profile = await this.lockProfile(profileRepo, input.user, tenant, tenantScopeKey);
    const existing = await logRepo.findOne({ where: { tenantScopeKey, user: { id: input.user.id }, sourceType, sourceId } });
    if (existing) return { log: existing, profile, idempotent: true, debtRecoveryLog: null };
    const currentBalance = await this.activeBalance(input.user.id, tenantScopeKey, manager);
    profile.points = currentBalance;
    profile.pointDebt = Math.max(Number(profile.pointDebt || 0), 0);

    const mutation = applyPointMutation({ balance: currentBalance, debt: profile.pointDebt, requestedPoints, negativePolicy: input.negativePolicy });
    if (!mutation.allowed) throw new BadRequestException("可用积分不足，不能形成负余额");
    const { appliedPoints, debtAdded } = mutation;

    const balanceAfterPrimary = currentBalance + appliedPoints;
    const log = await logRepo.save(logRepo.create({
      user: input.user,
      tenant,
      tenantScopeKey,
      points: appliedPoints,
      requestedPoints,
      balanceBefore: currentBalance,
      balanceAfter: balanceAfterPrimary,
      growthValue: input.growthValue ?? growthFromPointLog({ points: appliedPoints, sourceType }),
      expiresAt: input.expiresAt || null,
      expiryProcessedAt: null,
      reversedAt: null,
      type: input.type || (appliedPoints >= 0 ? "earn" : "deduct"),
      sourceType,
      sourceId,
      relatedLog: input.relatedLog || null,
      batchKey: input.batchKey || null,
      ruleSnapshot: input.ruleSnapshot || null,
      metadata: { ...(input.metadata || {}), ...(debtAdded ? { unappliedPoints: debtAdded } : {}) },
      remark: input.remark || null
    }));

    profile.points = Math.max(balanceAfterPrimary, 0);
    profile.pointDebt += debtAdded;
    profile.growthValue = Math.max(Number(profile.growthValue || 0) + Number(log.growthValue || 0), 0);

    let debtRecoveryLog: MemberPointLog | null = null;
    if (mutation.debtRecovery > 0) {
      const recovered = mutation.debtRecovery;
      debtRecoveryLog = await logRepo.save(logRepo.create({
        user: input.user,
        tenant,
        tenantScopeKey,
        points: -recovered,
        requestedPoints: -recovered,
        balanceBefore: profile.points,
        balanceAfter: profile.points - recovered,
        growthValue: 0,
        expiresAt: input.expiresAt || null,
        expiryProcessedAt: null,
        reversedAt: null,
        type: "deduct",
        sourceType: "points_debt_recovery",
        sourceId: String(log.id),
        relatedLog: log,
        batchKey: input.batchKey || null,
        ruleSnapshot: null,
        metadata: { recoveredDebt: recovered },
        remark: "积分欠额自动扣回"
      }));
      profile.points -= recovered;
      profile.pointDebt -= recovered;
    }

    if (!manualLevelOverrideActive(profile.levelSource, profile.levelExpiresAt)) {
      const previousLevelId = profile.level?.id || null;
      const levels = await manager.getRepository(MemberLevel).find({ where: { tenantScopeKey, enabled: true }, order: { minGrowth: "DESC" } });
      profile.level = resolveGrowthLevel(levels, profile.growthValue) as MemberLevel | null;
      if ((profile.level?.id || null) !== previousLevelId) {
        profile.levelStartedAt = new Date();
        profile.levelExpiresAt = levelExpiry(profile.level, profile.levelStartedAt);
        profile.levelSource = "growth";
        profile.levelSnapshot = memberLevelSnapshot(profile.level);
      }
    }
    profile.lastActiveAt = new Date();
    await profileRepo.save(profile);
    return { log, profile, idempotent: false, debtRecoveryLog };
  }

  private async lockProfile(profileRepo: Repository<MemberProfile>, user: User, tenant: Tenant | null, tenantScopeKey: string) {
    let profile = await profileRepo.createQueryBuilder("profile")
      .leftJoinAndSelect("profile.level", "level")
      .where("profile.userId = :userId", { userId: user.id })
      .andWhere("profile.tenantScopeKey = :tenantScopeKey", { tenantScopeKey })
      .setLock("pessimistic_write")
      .getOne();
    if (profile) return profile;
    try {
      await profileRepo.save(profileRepo.create({ user, tenant, tenantScopeKey, level: null, levelSnapshot: null, points: 0, pointDebt: 0, growthValue: 0, levelSource: "growth" }));
    } catch (error: any) {
      if (error?.code !== "ER_DUP_ENTRY") throw error;
    }
    profile = await profileRepo.createQueryBuilder("profile")
      .leftJoinAndSelect("profile.level", "level")
      .where("profile.userId = :userId", { userId: user.id })
      .andWhere("profile.tenantScopeKey = :tenantScopeKey", { tenantScopeKey })
      .setLock("pessimistic_write")
      .getOne();
    if (!profile) throw new BadRequestException("会员积分账户初始化失败");
    return profile;
  }
}
