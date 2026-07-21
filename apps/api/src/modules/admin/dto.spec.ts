import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { ActivityStatus, FieldType, PaymentMethod } from "../../shared/domain";
import { AcceptAdminInviteDto, ActivityDto, AdCampaignDto, AdCenterQueryDto, AdContractDto, AdOfficialRevenueImportDto, AdSettlementGenerateDto, AdSettlementStatusDto, AgentDto, AgentPaymentAccountDto, AgentSettlementPayDto, AgentSettlementQueryDto, AgentSettlementSandboxTransferDto, AnalyticsBusinessQueryDto, AnalyticsQueryDto, AnalyticsRecomputeDto, AnnouncementDto, AnnouncementQueryDto, BulkRegistrationReviewDto, CharityDisbursementCancelDto, CharityDisbursementDto, CharityDisbursementPayDto, CharityDisbursementReviewDto, CharityProjectActionDto, CharityProjectReviewDto, CreateAdminInviteDto, HomepageReplaceDto, MarketingPopupDto, MarketingPopupEffectiveCheckQueryDto, MarketingPopupQueryDto, MemberBehaviorTagRefreshDto, MemberPointAdjustDto, MemberPointRuleDto, MemberQueryDto, MemberSegmentPreviewDto, MemberSegmentSaveDto, MemberSegmentSnapshotCreateDto, MiniprogramReleaseSettingDto, MiniprogramReleaseVersionDto, OrderQueryDto, PaymentAccountQueryDto, RefundQueryDto, RegistrationQueryDto, TenantPermissionDto, TenantProfileDto, TenantSubscriptionChangeDto } from "./dto";

describe("admin activity dto", () => {
  it("keeps registration field option label and value with whitelist validation", async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    });

    const result = await pipe.transform(
      {
        title: "Test activity",
        location: "Test location",
        description: "Test description",
        featured: false,
        requireReview: false,
        allowCancel: true,
        status: ActivityStatus.Open,
        startTime: "2026-07-07 10:00:00",
        endTime: "2026-07-07 12:00:00",
        registrationDeadline: "2026-07-07 09:00:00",
        capacity: 10,
        price: 0,
        fields: [
          {
            label: "Interest",
            type: FieldType.SingleChoice,
            required: false,
            sortOrder: 1,
            options: [{ label: "Culture", value: "culture" }]
          }
        ]
      },
      { type: "body", metatype: ActivityDto }
    );

    expect(result.fields[0].options).toEqual([{ label: "Culture", value: "culture" }]);
  });
});

describe("payment account governance dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

  it("accepts bounded agent, account, and query input", async () => {
    const agent = await pipe.transform({ name: "华东代理", tenantId: "23", parentAgentId: "2", region: "上海", contactName: "负责人", contactPhone: "13912345678", enabled: true }, { type: "body", metatype: AgentDto });
    const account = await pipe.transform({ agentId: "3", provider: PaymentMethod.Wechat, merchantName: "测试商户", merchantNo: "MCH123", enabled: true, config: { WECHAT_PAY_APP_ID: "wx-test" } }, { type: "body", metatype: AgentPaymentAccountDto });
    const query = await pipe.transform({ tenantId: "23", agentId: "3", provider: PaymentMethod.Alipay, includeDisabled: "true", page: "2", pageSize: "50" }, { type: "query", metatype: PaymentAccountQueryDto });
    expect(agent).toMatchObject({ tenantId: 23, parentAgentId: 2 });
    expect(account).toMatchObject({ agentId: 3, provider: PaymentMethod.Wechat });
    expect(query).toMatchObject({ tenantId: 23, agentId: 3, page: 2, pageSize: 50 });
  });

  it("rejects unsupported providers, oversized fields, and invalid pagination", async () => {
    await expect(pipe.transform({ name: "x".repeat(121) }, { type: "body", metatype: AgentDto })).rejects.toThrow();
    await expect(pipe.transform({ agentId: 1, provider: PaymentMethod.Balance }, { type: "body", metatype: AgentPaymentAccountDto })).rejects.toThrow();
    await expect(pipe.transform({ agentId: 1, provider: PaymentMethod.Wechat, merchantNo: "x".repeat(129) }, { type: "body", metatype: AgentPaymentAccountDto })).rejects.toThrow();
    await expect(pipe.transform({ includeDisabled: "yes" }, { type: "query", metatype: PaymentAccountQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ pageSize: "101" }, { type: "query", metatype: PaymentAccountQueryDto })).rejects.toThrow();
  });
});

describe("agent settlement governance dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

  it("accepts bounded filters, payment proof metadata, and transfer controls", async () => {
    const query = await pipe.transform({ tenantId: "23", agentId: "3", keyword: "AS2026", status: "approved", periodStart: "2026-07-01", periodEnd: "2026-08-01", page: "2", pageSize: "50" }, { type: "query", metatype: AgentSettlementQueryDto });
    const pay = await pipe.transform({ paidReference: "BANK-001", paidProofUrl: "/api/admin/private-settlement-proofs/token.pdf/download", remark: "已核对" }, { type: "body", metatype: AgentSettlementPayDto });
    const transfer = await pipe.transform({ provider: "wechat", simulateStatus: "failed", failureReason: "余额不足", remark: "沙箱演练" }, { type: "body", metatype: AgentSettlementSandboxTransferDto });
    expect(query).toMatchObject({ tenantId: 23, agentId: 3, status: "approved", page: 2, pageSize: 50 });
    expect(pay.paidReference).toBe("BANK-001");
    expect(transfer).toMatchObject({ provider: "wechat", simulateStatus: "failed" });
  });

  it("rejects unsupported states, channels, and oversized fields", async () => {
    await expect(pipe.transform({ status: "unknown" }, { type: "query", metatype: AgentSettlementQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ pageSize: "101" }, { type: "query", metatype: AgentSettlementQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ provider: "balance" }, { type: "body", metatype: AgentSettlementSandboxTransferDto })).rejects.toThrow();
    await expect(pipe.transform({ paidReference: "x".repeat(129) }, { type: "body", metatype: AgentSettlementPayDto })).rejects.toThrow();
  });
});

describe("member governance dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

  it("accepts bounded member filters and idempotent point adjustments", async () => {
    const query = await pipe.transform({ activityId: "23", page: "2", pageSize: "50", sourceChannel: "mp_weixin", wechatBound: "true", levelId: "3", quickFilter: "active7", sortBy: "points", sortOrder: "ASC" }, { type: "query", metatype: MemberQueryDto });
    const points = await pipe.transform({ points: "100", remark: "活动补发", idempotencyKey: "member-points-0001", expiresAt: "2030-01-01T23:59:59" }, { type: "body", metatype: MemberPointAdjustDto });
    expect(query).toMatchObject({ activityId: 23, page: 2, pageSize: 50, sourceChannel: "mp_weixin", wechatBound: "true", sortBy: "points", sortOrder: "ASC" });
    expect(points).toMatchObject({ points: 100, remark: "活动补发", idempotencyKey: "member-points-0001" });
  });

  it("rejects unsupported member filters and incomplete point evidence", async () => {
    await expect(pipe.transform({ pageSize: "101" }, { type: "query", metatype: MemberQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ sourceChannel: "unknown" }, { type: "query", metatype: MemberQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ quickFilter: "unknown" }, { type: "query", metatype: MemberQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ points: 1, remark: "", idempotencyKey: "short" }, { type: "body", metatype: MemberPointAdjustDto })).rejects.toThrow();
  });

  it("accepts versioned tenant point rules and rejects invalid award settings", async () => {
    const rule = await pipe.transform({ enabled: true, calculationMode: "amount_ratio", fixedPoints: "2", amountFenPerPoint: "100", growthMode: "fixed", fixedGrowth: "3", validityDays: "365" }, { type: "body", metatype: MemberPointRuleDto });
    expect(rule).toMatchObject({ enabled: true, calculationMode: "amount_ratio", fixedPoints: 2, amountFenPerPoint: 100, growthMode: "fixed", fixedGrowth: 3, validityDays: 365 });
    await expect(pipe.transform({ enabled: true, calculationMode: "ratio", fixedPoints: -1, amountFenPerPoint: 0, growthMode: "unknown", fixedGrowth: -1 }, { type: "body", metatype: MemberPointRuleDto })).rejects.toThrow();
  });
});

describe("member segment governance dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } });

  it("accepts nested rules, pagination, and stable idempotency keys", async () => {
    const segment = await pipe.transform({ name: "活跃会员", description: "近七日", enabled: true, rules: { levelIds: ["2"], minPoints: "10", minSpent: "12.5", sourceChannels: ["h5"] } }, { type: "body", metatype: MemberSegmentSaveDto });
    const preview = await pipe.transform({ rules: { activeWithinDays: "7" }, page: "2", pageSize: "50" }, { type: "body", metatype: MemberSegmentPreviewDto });
    const snapshot = await pipe.transform({ idempotencyKey: "snapshot-0001" }, { type: "body", metatype: MemberSegmentSnapshotCreateDto });
    const refresh = await pipe.transform({ idempotencyKey: "behavior-0001" }, { type: "body", metatype: MemberBehaviorTagRefreshDto });
    expect(segment.rules).toMatchObject({ levelIds: [2], minPoints: 10, minSpent: 12.5, sourceChannels: ["h5"] });
    expect(preview).toMatchObject({ page: 2, pageSize: 50 });
    expect(snapshot.idempotencyKey).toBe("snapshot-0001");
    expect(refresh.idempotencyKey).toBe("behavior-0001");
  });

  it("rejects unknown nested rules, invalid channels, and short idempotency keys", async () => {
    await expect(pipe.transform({ name: "非法分群", rules: { unknown: true } }, { type: "body", metatype: MemberSegmentSaveDto })).rejects.toThrow();
    await expect(pipe.transform({ rules: { sourceChannels: ["unknown"] } }, { type: "body", metatype: MemberSegmentPreviewDto })).rejects.toThrow();
    await expect(pipe.transform({ idempotencyKey: "short" }, { type: "body", metatype: MemberSegmentSnapshotCreateDto })).rejects.toThrow();
  });
});

describe("bulk registration review dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

  it("accepts numeric registration ids", async () => {
    const result = await pipe.transform({ ids: ["1", 2], remark: "统一审核" }, { type: "body", metatype: BulkRegistrationReviewDto });
    expect(result).toEqual({ ids: [1, 2], remark: "统一审核" });
  });

  it("rejects an empty registration selection", async () => {
    await expect(pipe.transform({ ids: [] }, { type: "body", metatype: BulkRegistrationReviewDto })).rejects.toThrow();
  });
});

describe("announcement governance dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

  it("accepts supported announcement types and bounded pagination", async () => {
    const body = await pipe.transform({ tenantId: "23", title: "公告", content: "正文", type: "operation", enabled: true }, { type: "body", metatype: AnnouncementDto });
    const query = await pipe.transform({ tenantId: "23", type: "notice", enabled: "false", page: "2", pageSize: "50" }, { type: "query", metatype: AnnouncementQueryDto });
    expect(body.tenantId).toBe(23);
    expect(query).toMatchObject({ tenantId: 23, type: "notice", enabled: "false", page: 2, pageSize: 50 });
  });

  it("rejects oversized, unsupported, or invalid announcement input", async () => {
    await expect(pipe.transform({ title: "x".repeat(121), content: "正文" }, { type: "body", metatype: AnnouncementDto })).rejects.toThrow();
    await expect(pipe.transform({ title: "公告", content: "正文", type: "unknown" }, { type: "body", metatype: AnnouncementDto })).rejects.toThrow();
    await expect(pipe.transform({ pageSize: "101" }, { type: "query", metatype: AnnouncementQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ enabled: "yes" }, { type: "query", metatype: AnnouncementQueryDto })).rejects.toThrow();
  });
});

describe("marketing popup governance dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });
  const body = {
    tenantId: "23",
    title: "营销提醒",
    type: "notice",
    platforms: ["h5"],
    placements: ["home"],
    buttons: [{ text: "查看详情", link: "/pages/index/index", style: "primary" }],
    frequency: "once_per_day",
    priority: "10"
  };

  it("accepts supported values and bounded list/effective queries", async () => {
    const result = await pipe.transform(body, { type: "body", metatype: MarketingPopupDto });
    const query = await pipe.transform({ tenantId: "23", enabled: "true", platform: "h5", placement: "home", page: "2", pageSize: "50" }, { type: "query", metatype: MarketingPopupQueryDto });
    const effective = await pipe.transform({ id: "1", tenantId: "23", pageKey: "home", platform: "mp-weixin" }, { type: "query", metatype: MarketingPopupEffectiveCheckQueryDto });
    expect(result).toMatchObject({ tenantId: 23, priority: 10, platforms: ["h5"], placements: ["home"] });
    expect(query).toMatchObject({ tenantId: 23, enabled: "true", page: 2, pageSize: 50 });
    expect(effective).toMatchObject({ id: 1, tenantId: 23, pageKey: "home", platform: "mp-weixin" });
  });

  it("rejects unsupported enums, oversized buttons, and invalid pagination", async () => {
    await expect(pipe.transform({ ...body, type: "unknown" }, { type: "body", metatype: MarketingPopupDto })).rejects.toThrow();
    await expect(pipe.transform({ ...body, platforms: ["native-app"] }, { type: "body", metatype: MarketingPopupDto })).rejects.toThrow();
    await expect(pipe.transform({ ...body, buttons: [{ text: "x".repeat(25) }] }, { type: "body", metatype: MarketingPopupDto })).rejects.toThrow();
    await expect(pipe.transform({ pageSize: "101" }, { type: "query", metatype: MarketingPopupQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ pageKey: "unknown" }, { type: "query", metatype: MarketingPopupEffectiveCheckQueryDto })).rejects.toThrow();
  });
});

describe("ad center governance dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

  it("accepts bounded campaign, contract, settlement, revenue, and query input", async () => {
    const campaign = await pipe.transform({ tenantId: "23", name: "首页投放", title: "活动推荐", imageUrls: ["https://example.com/ad.png"], source: "custom", format: "banner", slotKey: "home_top_banner", pageKey: "home", platforms: ["h5"], audience: { mode: "authenticated" }, link: "https://example.com/activity", totalBudget: "100", priority: "10" }, { type: "body", metatype: AdCampaignDto });
    const contract = await pipe.transform({ tenantId: "23", advertiserId: "1", contractNo: "AD-2026-001", title: "年度广告合同", billingModel: "mixed", amount: "1000", cpmPrice: "1.5" }, { type: "body", metatype: AdContractDto });
    const settlement = await pipe.transform({ tenantId: "23", contractId: "1", periodStart: "2026-07-01", periodEnd: "2026-07-31" }, { type: "body", metatype: AdSettlementGenerateDto });
    const revenue = await pipe.transform({ tenantId: "23", importDate: "2026-07-18", revenueAmount: "12.34", impressionCount: "100" }, { type: "body", metatype: AdOfficialRevenueImportDto });
    const query = await pipe.transform({ tenantId: "23", enabled: "false", source: "custom", page: "2", pageSize: "50" }, { type: "query", metatype: AdCenterQueryDto });
    expect(campaign).toMatchObject({ tenantId: 23, totalBudget: 100, priority: 10, audience: { mode: "authenticated" } });
    expect(contract).toMatchObject({ tenantId: 23, advertiserId: 1, amount: 1000, cpmPrice: 1.5 });
    expect(settlement).toMatchObject({ tenantId: 23, contractId: 1 });
    expect(revenue).toMatchObject({ tenantId: 23, revenueAmount: 12.34, impressionCount: 100 });
    expect(query).toMatchObject({ tenantId: 23, page: 2, pageSize: 50 });
  });

  it("rejects unsupported enums, negative money, oversized lists, and invalid state", async () => {
    await expect(pipe.transform({ name: "广告", title: "标题", source: "unknown" }, { type: "body", metatype: AdCampaignDto })).rejects.toThrow();
    await expect(pipe.transform({ name: "广告", title: "标题", imageUrls: Array.from({ length: 11 }, (_, index) => `https://example.com/${index}.png`) }, { type: "body", metatype: AdCampaignDto })).rejects.toThrow();
    await expect(pipe.transform({ name: "广告", title: "标题", totalBudget: -1 }, { type: "body", metatype: AdCampaignDto })).rejects.toThrow();
    await expect(pipe.transform({ contractNo: "A", title: "合同", billingModel: "invalid" }, { type: "body", metatype: AdContractDto })).rejects.toThrow();
    await expect(pipe.transform({ periodStart: "2026-07-01", periodEnd: "2026-07-31", remark: "x".repeat(5001) }, { type: "body", metatype: AdSettlementGenerateDto })).rejects.toThrow();
    await expect(pipe.transform({ status: "rollback" }, { type: "body", metatype: AdSettlementStatusDto })).rejects.toThrow();
    await expect(pipe.transform({ importDate: "2026-07-18", revenueAmount: -0.01 }, { type: "body", metatype: AdOfficialRevenueImportDto })).rejects.toThrow();
    await expect(pipe.transform({ pageSize: "101" }, { type: "query", metatype: AdCenterQueryDto })).rejects.toThrow();
  });
});

describe("homepage transactional replacement dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it("accepts structured replacement rows and strips row-level scope fields", async () => {
    const result = await pipe.transform({ rows: [{ pageKey: "other", type: "hero", title: "事务模板", enabled: true, sortOrder: 99, config: { button: "报名" }, layout: { backgroundColor: "#ffffff" } }] }, { type: "body", metatype: HomepageReplaceDto });
    expect(result.rows).toEqual([{ type: "hero", title: "事务模板", enabled: true, sortOrder: 99, config: { button: "报名" }, layout: { backgroundColor: "#ffffff" } }]);
  });

  it("supports an intentional empty page but rejects malformed rows", async () => {
    const empty = await pipe.transform({ rows: [] }, { type: "body", metatype: HomepageReplaceDto });
    expect(empty.rows).toEqual([]);
    await expect(pipe.transform({ rows: [{ title: "缺少类型" }] }, { type: "body", metatype: HomepageReplaceDto })).rejects.toThrow();
  });
});

describe("tenant entitlement dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it("preserves structured entitlement overrides", async () => {
    const entitlements = { features: { mall: false }, quotas: { adminUsers: 5 } };
    const result = await pipe.transform({ packagePlan: "standard", entitlements }, { type: "body", metatype: TenantPermissionDto });
    expect(result.entitlements).toEqual(entitlements);
  });

  it("rejects non-object entitlement overrides", async () => {
    await expect(pipe.transform({ entitlements: "invalid" }, { type: "body", metatype: TenantPermissionDto })).rejects.toThrow();
  });
});

describe("tenant profile dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it("accepts profile fields within database column limits", async () => {
    const result = await pipe.transform({ name: "演示商家", region: "上海", contactName: "运营负责人", contactPhone: "021-12345678" }, { type: "body", metatype: TenantProfileDto });
    expect(result).toMatchObject({ name: "演示商家", region: "上海", contactName: "运营负责人", contactPhone: "021-12345678" });
  });

  it("rejects profile fields that exceed database column limits", async () => {
    await expect(pipe.transform({ name: "a".repeat(121) }, { type: "body", metatype: TenantProfileDto })).rejects.toThrow();
    await expect(pipe.transform({ name: "演示商家", contactPhone: "1".repeat(41) }, { type: "body", metatype: TenantProfileDto })).rejects.toThrow();
  });
});

describe("refund query dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

  it("accepts refund lifecycle filters and numeric scope fields", async () => {
    const result = await pipe.transform({ status: "failed", tenantId: "3", activityId: "8", keyword: "RF2026" }, { type: "query", metatype: RefundQueryDto });
    expect(result).toMatchObject({ status: "failed", tenantId: 3, activityId: 8, keyword: "RF2026" });
  });

  it("rejects order states and unknown values on the refund endpoint", async () => {
    await expect(pipe.transform({ status: "paid" }, { type: "query", metatype: RefundQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ status: "unknown" }, { type: "query", metatype: RefundQueryDto })).rejects.toThrow();
  });
});

describe("support user scope query dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

  it("accepts a positive user id for registration and order lookup", async () => {
    const registration = await pipe.transform({ userId: "42" }, { type: "query", metatype: RegistrationQueryDto });
    const order = await pipe.transform({ userId: "42" }, { type: "query", metatype: OrderQueryDto });
    expect(registration.userId).toBe(42);
    expect(order.userId).toBe(42);
  });

  it("rejects a non-positive support user id", async () => {
    await expect(pipe.transform({ userId: "0" }, { type: "query", metatype: RegistrationQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ userId: "-1" }, { type: "query", metatype: OrderQueryDto })).rejects.toThrow();
  });
});

describe("admin invitation dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });
  it("accepts a bounded invitation expiry", async () => {
    const result = await pipe.transform({ username: "new_operator", role: "operator", expiresInHours: 24, dataScope: { type: "activity_ids", activityIds: [1, 2] } }, { type: "body", metatype: CreateAdminInviteDto });
    expect(result.expiresInHours).toBe(24);
    expect(result.dataScope).toEqual({ type: "activity_ids", activityIds: [1, 2] });
  });
  it("rejects invitation expiry longer than seven days", async () => {
    await expect(pipe.transform({ username: "new_operator", expiresInHours: 169 }, { type: "body", metatype: CreateAdminInviteDto })).rejects.toThrow();
  });
  it("requires token and password when accepting an invitation", async () => {
    await expect(pipe.transform({ token: "short" }, { type: "body", metatype: AcceptAdminInviteDto })).rejects.toThrow();
  });
});

describe("tenant subscription change dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  it("accepts supported lifecycle actions", async () => {
    const result = await pipe.transform({ action: "renew", packageExpiresAt: "2027-12-31", remark: "年度续费" }, { type: "body", metatype: TenantSubscriptionChangeDto });
    expect(result.action).toBe("renew");
  });
  it("rejects unknown lifecycle actions", async () => {
    await expect(pipe.transform({ action: "delete" }, { type: "body", metatype: TenantSubscriptionChangeDto })).rejects.toThrow();
  });
});

describe("analytics date dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it("accepts date-only ranges", async () => {
    const query = await pipe.transform({ startDate: "2026-07-15", endDate: "2026-07-17" }, { type: "query", metatype: AnalyticsQueryDto });
    const recompute = await pipe.transform({ startDate: "2026-07-15", endDate: "2026-07-17" }, { type: "body", metatype: AnalyticsRecomputeDto });
    expect(query.endDate).toBe("2026-07-17");
    expect(recompute.startDate).toBe("2026-07-15");
  });

  it("rejects timestamp and non-padded date inputs", async () => {
    await expect(pipe.transform({ startDate: "2026-07-15T00:00:00Z" }, { type: "query", metatype: AnalyticsQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ startDate: "2026-7-5", endDate: "2026-07-17" }, { type: "body", metatype: AnalyticsRecomputeDto })).rejects.toThrow();
  });

  it("bounds business detail pagination", async () => {
    const result = await pipe.transform({ module: "mall", page: "2", pageSize: "100" }, { type: "query", metatype: AnalyticsBusinessQueryDto });
    expect(result).toMatchObject({ module: "mall", page: 2, pageSize: 100 });
    await expect(pipe.transform({ module: "mall", pageSize: "101" }, { type: "query", metatype: AnalyticsBusinessQueryDto })).rejects.toThrow();
  });
});

describe("charity disbursement governance dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

  it("requires a business key and transforms a staged disbursement request", async () => {
    const result = await pipe.transform({ amount: "100.25", stageNo: "2", businessKey: "charity-request-001" }, { type: "body", metatype: CharityDisbursementDto });
    expect(result.amount).toBe(100.25);
    expect(result.stageNo).toBe(2);
  });

  it("requires a review decision, opinion and business key", async () => {
    await expect(pipe.transform({ decision: "approve" }, { type: "body", metatype: CharityDisbursementReviewDto })).rejects.toThrow();
  });

  it("accepts payment evidence with a business key", async () => {
    const result = await pipe.transform({ paidReference: "BANK-001", businessKey: "charity-pay-001" }, { type: "body", metatype: CharityDisbursementPayDto });
    expect(result.paidReference).toBe("BANK-001");
  });

  it("requires a cancellation reason and business key", async () => {
    const result = await pipe.transform({ remark: "预算方案撤回", businessKey: "charity-cancel-001" }, { type: "body", metatype: CharityDisbursementCancelDto });
    expect(result.remark).toBe("预算方案撤回");
    await expect(pipe.transform({ businessKey: "charity-cancel-002" }, { type: "body", metatype: CharityDisbursementCancelDto })).rejects.toThrow();
  });

  it("accepts governed project transitions and review decisions", async () => {
    const action = await pipe.transform({ action: "submit_acceptance", businessKey: "charity-project-action-001" }, { type: "body", metatype: CharityProjectActionDto });
    const review = await pipe.transform({ decision: "approve", remark: "资料完整", businessKey: "charity-project-review-001" }, { type: "body", metatype: CharityProjectReviewDto });
    expect(action.action).toBe("submit_acceptance");
    expect(review.decision).toBe("approve");
  });
});

describe("mini program release dto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it("accepts values within persisted column limits", async () => {
    const result = await pipe.transform(
      { appId: "wx-demo", version: "1.0.1", description: "release", projectPath: "apps/mobile/dist/build/mp-weixin", auditItem: {} },
      { type: "body", metatype: MiniprogramReleaseSettingDto }
    );
    expect(result.appId).toBe("wx-demo");
  });

  it("rejects oversized configuration and upload metadata", async () => {
    await expect(pipe.transform({ appId: "x".repeat(81) }, { type: "body", metatype: MiniprogramReleaseSettingDto })).rejects.toThrow();
    await expect(pipe.transform({ version: "v".repeat(41) }, { type: "body", metatype: MiniprogramReleaseVersionDto })).rejects.toThrow();
    await expect(pipe.transform({ description: "d".repeat(501) }, { type: "body", metatype: MiniprogramReleaseVersionDto })).rejects.toThrow();
  });
});
