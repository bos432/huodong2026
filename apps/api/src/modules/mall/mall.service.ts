import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHmac } from "crypto";
import ExcelJS from "exceljs";
import { existsSync } from "fs";
import { DataSource, In, IsNull, LessThan, Not, Repository, SelectQueryBuilder } from "typeorm";
import { AdminMallMerchantAccess } from "../../entities/admin-mall-merchant-access.entity";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { Agent } from "../../entities/agent.entity";
import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { MallAddress } from "../../entities/mall-address.entity";
import { MallBrowseHistory } from "../../entities/mall-browse-history.entity";
import { MallBrand } from "../../entities/mall-brand.entity";
import { MallCartItem } from "../../entities/mall-cart-item.entity";
import { MallCategory } from "../../entities/mall-category.entity";
import { MallCheckoutGroup } from "../../entities/mall-checkout-group.entity";
import { MallCommissionAdjustment } from "../../entities/mall-commission-adjustment.entity";
import { MallCommissionRule } from "../../entities/mall-commission-rule.entity";
import { MallCommission } from "../../entities/mall-commission.entity";
import { MallCouponClaim } from "../../entities/mall-coupon-claim.entity";
import { MallCoupon } from "../../entities/mall-coupon.entity";
import { MallCouponUsage } from "../../entities/mall-coupon-usage.entity";
import { MallFavorite } from "../../entities/mall-favorite.entity";
import { MallFlashSale } from "../../entities/mall-flash-sale.entity";
import { MallGroupBuy } from "../../entities/mall-group-buy.entity";
import { MallGroupBuyRecord } from "../../entities/mall-group-buy-record.entity";
import { MallInventoryLog } from "../../entities/mall-inventory-log.entity";
import { MallInventoryAnomaly } from "../../entities/mall-inventory-anomaly.entity";
import { MallLogisticsCompany } from "../../entities/mall-logistics-company.entity";
import { MallMerchant } from "../../entities/mall-merchant.entity";
import { MallMerchantApplication } from "../../entities/mall-merchant-application.entity";
import { MallMerchantQualification } from "../../entities/mall-merchant-qualification.entity";
import { MallMerchantContract } from "../../entities/mall-merchant-contract.entity";
import { MallMerchantPaymentAccount } from "../../entities/mall-merchant-payment-account.entity";
import { MallOrderItem } from "../../entities/mall-order-item.entity";
import { MallOrderEvent } from "../../entities/mall-order-event.entity";
import { MallShipment } from "../../entities/mall-shipment.entity";
import { MallShipmentItem } from "../../entities/mall-shipment-item.entity";
import { MallShipmentTrackingEvent } from "../../entities/mall-shipment-tracking-event.entity";
import { MallOrder, MallOrderStatus } from "../../entities/mall-order.entity";
import { MallPaymentCallbackLog } from "../../entities/mall-payment-callback-log.entity";
import { MallPaymentTransaction } from "../../entities/mall-payment-transaction.entity";
import { MallPaymentStatementRecord } from "../../entities/mall-payment-statement-record.entity";
import { MallProduct } from "../../entities/mall-product.entity";
import { MallProductAuditLog } from "../../entities/mall-product-audit-log.entity";
import { MallPromotionCode } from "../../entities/mall-promotion-code.entity";
import { MallPromotionRateLimit } from "../../entities/mall-promotion-rate-limit.entity";
import { MallPromotionRiskEvent } from "../../entities/mall-promotion-risk-event.entity";
import { MallPromotionRiskAlert } from "../../entities/mall-promotion-risk-alert.entity";
import { MallRefund } from "../../entities/mall-refund.entity";
import { MallRefundItem } from "../../entities/mall-refund-item.entity";
import { MallRefundLog } from "../../entities/mall-refund-log.entity";
import { MallRefundMessage } from "../../entities/mall-refund-message.entity";
import { MallReview, MallReviewStatus } from "../../entities/mall-review.entity";
import { MallReviewReport } from "../../entities/mall-review-report.entity";
import { MallSettlement } from "../../entities/mall-settlement.entity";
import { MallSettlementEvent } from "../../entities/mall-settlement-event.entity";
import { MallSettlementLine } from "../../entities/mall-settlement-line.entity";
import { MallSku } from "../../entities/mall-sku.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Order } from "../../entities/order.entity";
import { Tenant } from "../../entities/tenant.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { User } from "../../entities/user.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { PaymentMethod } from "../../shared/domain";
import { maskPhone } from "../../shared/data-masking";
import { fenToYuan, sameMoneyAmount, yuanToFen } from "../../shared/money";
import { reconcileMallStatement } from "../../shared/mall-statement-reconciliation";
import { merchantAccessAllows, merchantAccessIsActive, merchantGovernanceTenantScopeId, MerchantPermissionRequirement, normalizedMerchantFeeBps } from "../../shared/mall-merchant-governance";
import { mallOrderProductSnapshot, mallOrderSkuSnapshot, normalizeMallCatalogAttributes, normalizeMallCatalogCode } from "../../shared/mall-product-catalog";
import { detectMallPromotionInventoryIssues, detectMallSkuInventoryIssues, mallInventoryStockSummary, repairMallPromotionInventoryState, repairMallSkuInventoryState } from "../../shared/mall-inventory-governance";
import { comparableMallOrderQuote, MallOrderQuoteTokenPayload, signMallOrderQuote, verifyMallOrderQuote } from "../../shared/mall-order-quote";
import { buildMallCheckoutDiscountAllocations, mallFreightFen } from "../../shared/mall-order-allocation";
import { mallCheckoutPaymentQueryState } from "../../shared/mall-checkout-payment-state";
import { mallCheckoutCouponReleaseEligible } from "../../shared/mall-checkout-coupon-release";
import { resolveMallFulfillmentState } from "../../shared/mall-fulfillment-policy";
import { allocateMallAfterSaleAmount, assertMallAfterSaleTransition, nextMallOrderStatusAfterRefund } from "../../shared/mall-after-sale-policy";
import { parseMallTrackingPayload } from "../../shared/mall-logistics-tracking";
import { allocateMallCommissionBaseFen, buildMallCommissionBeneficiaries, commissionAmountFen, refundedCommissionFen, selectMallCommissionRule } from "../../shared/mall-commission-policy";
import { calculateMallSettlementAmounts, mallSettlementConsistency } from "../../shared/mall-settlement-policy";
import { isSelfPurchasePromotion, mallAppendReviewError, mallCouponCategoryMatches, mallCouponClaimError, mallCouponIdentityRisk, mallGroupBuyJoinError, MallMarketingRiskDecision, mallPromotionAttributionRisk, mallPromotionOrderError, mallPromotionRateLimitError, mallPromotionValidityError, publicMallReviewAppend, saveWithUniqueReplay, shouldReleaseMallCouponAfterRefund } from "../../shared/mall-review-marketing-governance";
import { assertRefundCapacity } from "../../shared/refund-capacity";
import { configWithLaunchOverrides } from "../../shared/launch-config";
import { assertTenantAccessForActor, normalizeTenantCode } from "../../shared/tenant-scope";
import { PaymentProviderRuntimeConfig, PaymentProviderService, ProviderRefundNotificationResult, RealPaymentCallbackContext } from "../public/payment-provider.service";
import { CreateMallOrderDto, MallAddressDto, MallBrandDto, MallCartItemDto, MallCartQuantityDto, MallCategoryDto, MallCommissionBatchSettleDto, MallCommissionRiskReviewDto, MallCommissionRuleDto, MallCommissionSettleDto, MallCouponDto, MallFlashSaleDto, MallGroupBuyDto, MallInventoryAdjustDto, MallInventoryAnomalyResolveDto, MallListQueryDto, MallLogisticsCompanyDto, MallMerchantAccessDto, MallMerchantApplicationDto, MallMerchantApplicationReviewDto, MallMerchantContractDto, MallMerchantDto, MallMerchantPaymentAccountDto, MallMerchantQualificationDto, MallMerchantQualificationReviewDto, MallOrderCloseDto, MallOrderQuoteDto, MallProductDto, MallProductReviewDto, MallPromotionCodeDto, MallProviderPaymentCallbackDto, MallProviderPayDto, MallRefundExchangeShipmentDto, MallRefundMessageDto, MallRefundRequestDto, MallRefundReturnShipmentDto, MallRefundReviewDto, MallReviewAppendDto, MallReviewDto, MallReviewModerationDto, MallReviewReportDto, MallReviewReportReviewDto, MallSettlementAdjustmentDto, MallSettlementGenerateDto, MallSettlementPaidDto, MallSettlementReviewDto, MallShipDto, MallShipmentUpdateDto, MallStatementFetchDto, MallStatementImportDto, MallStatementResolveDto } from "./mall.dto";
import { tenantFeatureAccess, tenantQuotaAccess, tenantSubscriptionWriteRestriction } from "../admin/tenant-subscription";
import { privateCredentialExists, storePrivateCredential } from "../../shared/private-credential";
import { assertUploadMalwareSafe, uploadMalwareScanConfig } from "../../shared/upload-malware-scan";
import { growthFromPointLog, levelExpiry, manualLevelOverrideActive, memberLevelScopeKey, memberLevelSnapshot, resolveGrowthLevel } from "../../shared/member-level-engine";
import { cumulativePointClawbackTarget } from "../../shared/member-point-ledger";
import { V1Service } from "../v1/v1.service";
import { MemberPointsService } from "../member-points/member-points.service";
import { BusinessJobService } from "../reliability/business-job.service";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null };
type PublicTenantContext = { tenantId?: number | null; tenantCode?: string | null; host?: string | null };
type MallRiskContext = { clientIp?: string | null; userAgent?: string | null; requestId?: string | null; deviceId?: string | null };
type MallOrderPreviewItem = { productId: number; categoryId: number | null; platformCategoryId: number | null; merchantId: number | null; amount: number };
type MallOrderPreviewLine = { skuId: number; productId: number; productTitle: string; productVersion: number; skuName: string; quantity: number; unitPrice: string; lineAmount: string; availableStock: number; merchant: Record<string, unknown> | null; flashSaleId: number | null; groupBuyId: number | null };
type MallOrderInputItem = { skuId: number; quantity: number; flashSaleId?: number; groupBuyId?: number; joinTeamNo?: string };
type MallOrderWithItemsResult = Omit<MallOrder, "freezeBusinessMoney" | "user"> & {
  user: { id: number; nickname: string | null; phone: string | null } | null;
  items: Array<MallOrderItem & { review?: MallReview | null }>;
  refund: MallRefund | null;
  refunds: MallRefund[];
  groupBuyTeams: Array<Record<string, unknown>>;
  shipments: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
};
type MallOrderPublicResult = Record<string, unknown> & { id: number; amount: string; goodsAmount: string; discountAmount: string; status: MallOrderStatus };
type MallCheckoutGroupResult = Record<string, unknown> & { id: number; orders: MallOrderPublicResult[] };
type MallCreateOrderResult = MallOrderPublicResult | MallCheckoutGroupResult;
type MallCalculatedQuote = {
  items: MallOrderPreviewLine[];
  goodsAmount: string;
  coupon: { id: number; code: string; name: string; minAmount: string; discountAmount: string; scope: string; scopeCategoryId: number | null; scopeProductId: number | null } | null;
  couponDiscountAmount: string;
  availablePoints: number;
  pointsUsed: number;
  pointsDiscountAmount: string;
  discountAmount: string;
  freightAmount: string;
  payableAmount: string;
  allocations: Array<{ merchantId: number; merchantName: string; goodsFen: number; freightFen: number; couponDiscountFen: number; pointsDiscountFen: number; discountFen: number; payableFen: number }>;
};
type MallMerchantScope = { tenant: Tenant | null; merchant: MallMerchant | null };
type MallBatchScope = { type: "system" | "platform" | "authorized_merchants"; tenantId: number | null; merchantIds: number[] | null };
type MallRefundProviderPlan = {
  status: "approved" | "processing" | "failed";
  provider: string;
  action: string;
  logStatus: string;
  message: string;
  completedAt: Date | null;
  providerRefundNo: string | null;
  providerRefundStatus: string | null;
  providerRefundSyncedAt: Date | null;
  providerRefundPayload: Record<string, unknown> | null;
  providerRefundFailureReason: string | null;
  providerRefundRetryCount: number;
  providerRefundNextQueryAt: Date | null;
};
const MINUTE_MS = 60 * 1000;
const MALL_PROVIDER_PAYLOAD_MASK = "***";
const MALL_PROVIDER_PAYLOAD_MAX_DEPTH = 6;
const MALL_PROVIDER_PAYLOAD_MAX_KEYS = 80;
const MALL_PROVIDER_PAYLOAD_MAX_ARRAY = 20;
const MALL_PROVIDER_PAYLOAD_MAX_STRING = 300;

@Injectable()
export class MallService implements OnModuleInit, OnModuleDestroy {
  private readonly pendingOrderWorker?: NodeJS.Timeout;
  private pendingOrderWorkerCycleRunning = false;
  private readonly merchantGovernanceWorker?: NodeJS.Timeout;
  private readonly inventoryGovernanceWorker?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AdminUser) private readonly adminUsers: Repository<AdminUser>,
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    @InjectRepository(AgentPaymentAccount) private readonly agentPaymentAccounts: Repository<AgentPaymentAccount>,
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    @InjectRepository(AdminOperationLog) private readonly operationLogs: Repository<AdminOperationLog>,
    @InjectRepository(AdminMallMerchantAccess) private readonly merchantAccess: Repository<AdminMallMerchantAccess>,
    @InjectRepository(MallMerchant) private readonly merchants: Repository<MallMerchant>,
    @InjectRepository(MallMerchantApplication) private readonly merchantApplications: Repository<MallMerchantApplication>,
    @InjectRepository(MallMerchantQualification) private readonly merchantQualifications: Repository<MallMerchantQualification>,
    @InjectRepository(MallMerchantContract) private readonly merchantContracts: Repository<MallMerchantContract>,
    @InjectRepository(MallMerchantPaymentAccount) private readonly merchantPaymentAccounts: Repository<MallMerchantPaymentAccount>,
    @InjectRepository(MallCheckoutGroup) private readonly checkoutGroups: Repository<MallCheckoutGroup>,
    @InjectRepository(MallCategory) private readonly categories: Repository<MallCategory>,
    @InjectRepository(MallBrand) private readonly brands: Repository<MallBrand>,
    @InjectRepository(MallCoupon) private readonly coupons: Repository<MallCoupon>,
    @InjectRepository(MallCouponClaim) private readonly couponClaims: Repository<MallCouponClaim>,
    @InjectRepository(MallCouponUsage) private readonly couponUsages: Repository<MallCouponUsage>,
    @InjectRepository(MallCommission) private readonly commissions: Repository<MallCommission>,
    @InjectRepository(MallCommissionRule) private readonly commissionRules: Repository<MallCommissionRule>,
    @InjectRepository(MallCommissionAdjustment) private readonly commissionAdjustments: Repository<MallCommissionAdjustment>,
    @InjectRepository(MallPromotionCode) private readonly promotionCodes: Repository<MallPromotionCode>,
    @InjectRepository(MallPromotionRateLimit) private readonly promotionRateLimits: Repository<MallPromotionRateLimit>,
    @InjectRepository(MallPromotionRiskEvent) private readonly promotionRiskEvents: Repository<MallPromotionRiskEvent>,
    @InjectRepository(MallPromotionRiskAlert) private readonly promotionRiskAlerts: Repository<MallPromotionRiskAlert>,
    @InjectRepository(MallLogisticsCompany) private readonly logisticsCompanies: Repository<MallLogisticsCompany>,
    @InjectRepository(MallProduct) private readonly products: Repository<MallProduct>,
    @InjectRepository(MallProductAuditLog) private readonly productAuditLogs: Repository<MallProductAuditLog>,
    @InjectRepository(MallSku) private readonly skus: Repository<MallSku>,
    @InjectRepository(MallInventoryLog) private readonly inventoryLogs: Repository<MallInventoryLog>,
    @InjectRepository(MallInventoryAnomaly) private readonly inventoryAnomalies: Repository<MallInventoryAnomaly>,
    @InjectRepository(MallAddress) private readonly addresses: Repository<MallAddress>,
    @InjectRepository(MallCartItem) private readonly cartItems: Repository<MallCartItem>,
    @InjectRepository(MallFavorite) private readonly favorites: Repository<MallFavorite>,
    @InjectRepository(MallBrowseHistory) private readonly browseHistories: Repository<MallBrowseHistory>,
    @InjectRepository(MallFlashSale) private readonly flashSales: Repository<MallFlashSale>,
    @InjectRepository(MallGroupBuy) private readonly groupBuys: Repository<MallGroupBuy>,
    @InjectRepository(MallGroupBuyRecord) private readonly groupBuyRecords: Repository<MallGroupBuyRecord>,
    @InjectRepository(MallOrder) private readonly orders: Repository<MallOrder>,
    @InjectRepository(MallOrderItem) private readonly orderItems: Repository<MallOrderItem>,
    @InjectRepository(MallOrderEvent) private readonly orderEvents: Repository<MallOrderEvent>,
    @InjectRepository(MallShipment) private readonly shipments: Repository<MallShipment>,
    @InjectRepository(MallShipmentItem) private readonly shipmentItems: Repository<MallShipmentItem>,
    @InjectRepository(MallShipmentTrackingEvent) private readonly shipmentTrackingEvents: Repository<MallShipmentTrackingEvent>,
    @InjectRepository(MallPaymentCallbackLog) private readonly paymentCallbackLogs: Repository<MallPaymentCallbackLog>,
    @InjectRepository(MallPaymentTransaction) private readonly paymentTransactions: Repository<MallPaymentTransaction>,
    @InjectRepository(MallPaymentStatementRecord) private readonly paymentStatements: Repository<MallPaymentStatementRecord>,
    @InjectRepository(MallRefund) private readonly refunds: Repository<MallRefund>,
    @InjectRepository(MallRefundItem) private readonly refundItems: Repository<MallRefundItem>,
    @InjectRepository(MallRefundMessage) private readonly refundMessages: Repository<MallRefundMessage>,
    @InjectRepository(MallRefundLog) private readonly refundLogs: Repository<MallRefundLog>,
    @InjectRepository(MallReview) private readonly reviews: Repository<MallReview>,
    @InjectRepository(MallReviewReport) private readonly reviewReports: Repository<MallReviewReport>,
    @InjectRepository(MallSettlement) private readonly settlements: Repository<MallSettlement>,
    @InjectRepository(MallSettlementLine) private readonly settlementLines: Repository<MallSettlementLine>,
    @InjectRepository(MallSettlementEvent) private readonly settlementEvents: Repository<MallSettlementEvent>,
    @InjectRepository(MemberLevel) private readonly memberLevels: Repository<MemberLevel>,
    @InjectRepository(MemberProfile) private readonly memberProfiles: Repository<MemberProfile>,
    @InjectRepository(MemberPointLog) private readonly memberPointLogs: Repository<MemberPointLog>,
    @InjectRepository(UserWallet) private readonly userWallets: Repository<UserWallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactions: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly paymentProvider: PaymentProviderService,
    private readonly notifications: V1Service,
    private readonly memberPoints: MemberPointsService,
    private readonly businessJobs: BusinessJobService
  ) {
    this.pendingOrderWorker = this.startPendingOrderWorker();
    this.merchantGovernanceWorker = this.startMerchantGovernanceWorker();
    this.inventoryGovernanceWorker = this.startInventoryGovernanceWorker();
  }

  onModuleInit() {
    this.businessJobs.register("mall-refund.provider-query", async (payload, job) => {
      const refundId = Number(payload.refundId || 0);
      if (!refundId) throw new Error("Mall refund job payload is invalid");
      if (Number(payload.tenantId || 0) !== Number(job.tenantId || 0)) throw new Error("Mall refund job tenant does not match payload");
      await this.scanProviderRefunds({ username: "business-job-worker", tenantId: job.tenantId || null }, refundId);
      const refund = await this.refunds.findOne({ where: { id: refundId }, relations: { tenant: true }, loadEagerRelations: false });
      if (!refund || Number(refund.tenant?.id || 0) !== Number(job.tenantId || 0)) return { skipped: true, reason: "refund_not_found" };
      if (refund.status === "processing") throw new Error(refund.providerRefundFailureReason || "Mall provider refund remains processing");
      return { refundId, status: refund.status, providerRefundStatus: refund.providerRefundStatus || null };
    });
  }

  onModuleDestroy() {
    if (this.pendingOrderWorker) clearInterval(this.pendingOrderWorker);
    if (this.merchantGovernanceWorker) clearInterval(this.merchantGovernanceWorker);
    if (this.inventoryGovernanceWorker) clearInterval(this.inventoryGovernanceWorker);
  }

  async adminMerchants(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.merchants
      .createQueryBuilder("merchant")
      .leftJoinAndSelect("merchant.tenant", "tenant")
      .leftJoinAndSelect("merchant.agent", "agent")
      .orderBy("merchant.id", "DESC");
    if (tenant) builder.andWhere("merchant.tenantId = :tenantId", { tenantId: tenant.id });
    if (query.merchantId) builder.andWhere("merchant.id = :merchantId", { merchantId: Number(query.merchantId) });
    if (query.status) builder.andWhere("merchant.status = :status", { status: query.status });
    if (query.enabled === "true") builder.andWhere("merchant.mallEnabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("merchant.mallEnabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) {
      builder.andWhere("(merchant.name LIKE :keyword OR merchant.code LIKE :keyword OR merchant.region LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    const rows = await builder.take(300).getMany();
    const allowedIds = await this.adminAllowedMerchantIds(admin);
    const scopedRows = allowedIds === null ? rows : rows.filter((row) => allowedIds.includes(row.id));
    const summaries = await this.adminMerchantOperationSummaries(scopedRows.map((row) => row.id));
    return scopedRows.map((row) => ({ ...row, operationSummary: summaries[row.id] || this.emptyMerchantOperationSummary() }));
  }

  async submitMerchantApplication(user: User, dto: MallMerchantApplicationDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const pending = await this.merchantApplications.findOne({ where: { applicantUserId: user.id, tenant: { id: tenant.id }, status: "pending" } });
    if (pending) throw new BadRequestException("已有待审核的商户入驻申请");
    const creditCode = String(dto.unifiedSocialCreditCode || "").trim().toUpperCase();
    if (!/^[0-9A-Z]{15,20}$/.test(creditCode)) throw new BadRequestException("统一社会信用代码格式不正确");
    const duplicate = await this.merchantApplications.createQueryBuilder("application")
      .where("application.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("application.unifiedSocialCreditCode = :creditCode", { creditCode })
      .andWhere("application.status IN (:...statuses)", { statuses: ["pending", "approved"] })
      .getOne();
    if (duplicate) throw new BadRequestException("该主体已提交或已通过入驻审核");
    const files = Array.isArray(dto.qualificationFiles) ? dto.qualificationFiles
      .map((item) => ({ type: String(item?.type || "other").slice(0, 40), name: String(item?.name || "资质文件").slice(0, 120), url: String(item?.url || "").trim().slice(0, 500), number: item?.number ? String(item.number).slice(0, 120) : undefined, validUntil: item?.validUntil ? String(item.validUntil).slice(0, 10) : undefined }))
      .filter((item) => item.url).slice(0, 20) : [];
    const saved = await this.merchantApplications.save(this.merchantApplications.create({
      tenant,
      applicantUserId: user.id,
      applicant: user,
      merchant: null,
      desiredName: this.requiredString(dto.desiredName, "店铺名称").slice(0, 120),
      legalName: this.requiredString(dto.legalName, "主体名称").slice(0, 160),
      unifiedSocialCreditCode: creditCode,
      legalRepresentative: this.requiredString(dto.legalRepresentative, "法定代表人").slice(0, 80),
      contactName: this.requiredString(dto.contactName, "联系人").slice(0, 100),
      contactPhone: this.requiredString(dto.contactPhone, "联系电话").slice(0, 40),
      region: this.optionalString(dto.region) || tenant.region || null,
      businessLicenseUrl: this.requiredString(dto.businessLicenseUrl, "营业执照").slice(0, 500),
      qualificationFiles: files.length ? files : null,
      status: "pending",
      applyRemark: this.optionalString(dto.applyRemark),
      reviewRemark: null,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedByAdminId: null
    }));
    return this.publicMerchantApplication(saved);
  }

  async myMerchantApplications(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.merchantApplications.find({ where: { applicantUserId: user.id, tenant: { id: tenant.id } }, order: { createdAt: "DESC" }, take: 50 });
    return rows.map((row) => this.publicMerchantApplication(row));
  }

  async adminMerchantApplications(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.merchantApplications.createQueryBuilder("application")
      .leftJoinAndSelect("application.tenant", "tenant")
      .leftJoinAndSelect("application.applicant", "applicant")
      .leftJoinAndSelect("application.merchant", "merchant")
      .orderBy("application.id", "DESC");
    if (tenant) builder.andWhere("application.tenantId = :tenantId", { tenantId: tenant.id });
    if (query.status) builder.andWhere("application.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(application.desiredName LIKE :keyword OR application.legalName LIKE :keyword OR application.unifiedSocialCreditCode LIKE :keyword OR application.contactPhone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(300).getMany();
  }

  async reviewMerchantApplication(id: number, dto: MallMerchantApplicationReviewDto, admin?: AdminContext) {
    const result = await this.dataSource.transaction(async (manager) => {
      const applicationRepo = manager.getRepository(MallMerchantApplication);
      const merchantRepo = manager.getRepository(MallMerchant);
      const qualificationRepo = manager.getRepository(MallMerchantQualification);
      const application = await applicationRepo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!application) throw new NotFoundException("入驻申请不存在");
      if (admin?.tenantId && application.tenant.id !== admin.tenantId) throw new ForbiddenException("入驻申请不属于当前商家");
      if (application.status !== "pending") throw new BadRequestException("入驻申请已处理");
      application.status = dto.status;
      application.reviewRemark = this.requiredString(dto.reviewRemark, "审核说明").slice(0, 1000);
      application.reviewedAt = new Date();
      application.reviewedByAdminId = admin?.id || null;
      if (dto.status === "rejected") return { application: await applicationRepo.save(application), merchant: null };
      this.assertMallQuota(application.tenant, "merchants", await merchantRepo.count({ where: { tenant: { id: application.tenant.id } } }));
      const code = this.normalizeMerchantCode(dto.merchantCode || `merchant_${application.tenant.id}_${application.id}`);
      if (await merchantRepo.findOne({ where: { code } })) throw new BadRequestException("店铺编码已存在");
      const merchant = await merchantRepo.save(merchantRepo.create({
        code,
        name: application.desiredName,
        ownerType: "tenant",
        tenant: application.tenant,
        agent: null,
        status: "disabled",
        onboardingStatus: "approved",
        contractRequired: true,
        platformCommissionBps: 0,
        serviceFeeBps: 0,
        settlementCycleDays: 30,
        suspendedAt: null,
        suspensionReason: null,
        mallEnabled: false,
        productAuditRequired: true,
        paymentMode: "platform_collect",
        region: application.region,
        contactName: application.contactName,
        contactPhone: application.contactPhone,
        logoUrl: null,
        notice: null,
        settlementConfig: { source: "merchant_application", applicationId: application.id, legalName: application.legalName, creditCode: application.unifiedSocialCreditCode },
        freightConfig: { enabled: true, baseFreightFen: 0, freeThresholdFen: 0 },
        remark: application.applyRemark
      }));
      application.merchant = merchant;
      const initialFiles = [{ type: "business_license", name: "营业执照", url: application.businessLicenseUrl }, ...(application.qualificationFiles || [])];
      for (const file of initialFiles) {
        await qualificationRepo.save(qualificationRepo.create({ tenant: application.tenant, merchant, type: file.type, name: file.name, certificateNo: file.number || (file.type === "business_license" ? application.unifiedSocialCreditCode : null), fileUrls: [file.url], validFrom: null, validUntil: file.validUntil || null, status: "approved", reviewRemark: "入驻审核通过", reviewedByAdminId: admin?.id || null, reviewedAt: new Date() }));
      }
      return { application: await applicationRepo.save(application), merchant };
    });
    await this.logOperation(admin, `mall.merchant_application.${dto.status}`, "mall_merchant_application", id, `商户入驻申请${dto.status === "approved" ? "通过" : "驳回"}：${result.application.desiredName}`, result.application.tenant.id);
    await this.notifications.sendNotification({
      userId: result.application.applicantUserId,
      channel: "site",
      title: "商户入驻审核结果",
      content: dto.status === "approved"
        ? `你的店铺「${result.application.desiredName}」已通过入驻审核。请等待合同生效、资质确认和店铺开通。`
        : `你的店铺「${result.application.desiredName}」未通过入驻审核：${result.application.reviewRemark}`,
      remark: `商户入驻审核:${result.application.id}`
    }).catch(() => null);
    return result;
  }

  private emptyMerchantOperationSummary() {
    return {
      productCount: 0,
      publishedProductCount: 0,
      pendingReviewProductCount: 0,
      enabledAccessCount: 0,
      enabledPaymentAccountCount: 0,
      order30dCount: 0,
      received30dAmount: "0.00",
      pendingRefundCount: 0,
      failedRefundCount: 0
    };
  }

  private async adminMerchantOperationSummaries(merchantIds: number[]) {
    if (!merchantIds.length) return {} as Record<number, ReturnType<MallService["emptyMerchantOperationSummary"]>>;
    const [productRows, accessRows, accountRows, orderRows, refundRows] = await Promise.all([
      this.products
        .createQueryBuilder("product")
        .select("product.merchantId", "merchantId")
        .addSelect("COUNT(product.id)", "productCount")
        .addSelect("SUM(CASE WHEN product.status = 'published' THEN 1 ELSE 0 END)", "publishedProductCount")
        .addSelect("SUM(CASE WHEN product.status = 'pending_review' THEN 1 ELSE 0 END)", "pendingReviewProductCount")
        .where("product.merchantId IN (:...merchantIds)", { merchantIds })
        .groupBy("product.merchantId")
        .getRawMany<Record<string, string>>(),
      this.merchantAccess
        .createQueryBuilder("access")
        .select("access.merchantId", "merchantId")
        .addSelect("COUNT(access.id)", "enabledAccessCount")
        .where("access.merchantId IN (:...merchantIds)", { merchantIds })
        .andWhere("access.enabled = :enabled", { enabled: true })
        .groupBy("access.merchantId")
        .getRawMany<Record<string, string>>(),
      this.merchantPaymentAccounts
        .createQueryBuilder("account")
        .select("account.merchantId", "merchantId")
        .addSelect("COUNT(account.id)", "enabledPaymentAccountCount")
        .where("account.merchantId IN (:...merchantIds)", { merchantIds })
        .andWhere("account.enabled = :enabled", { enabled: true })
        .groupBy("account.merchantId")
        .getRawMany<Record<string, string>>(),
      this.orders
        .createQueryBuilder("order")
        .select("order.merchantId", "merchantId")
        .addSelect("COUNT(order.id)", "order30dCount")
        .addSelect("COALESCE(SUM(CASE WHEN order.status IN ('paid','shipped','completed','refund_pending','refunded') THEN order.amount ELSE 0 END), 0)", "received30dAmount")
        .where("order.merchantId IN (:...merchantIds)", { merchantIds })
        .andWhere("order.createdAt >= :since", { since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
        .groupBy("order.merchantId")
        .getRawMany<Record<string, string>>(),
      this.refunds
        .createQueryBuilder("refund")
        .select("refund.merchantId", "merchantId")
        .addSelect("SUM(CASE WHEN refund.status IN ('pending','processing') THEN 1 ELSE 0 END)", "pendingRefundCount")
        .addSelect("SUM(CASE WHEN refund.status = 'failed' THEN 1 ELSE 0 END)", "failedRefundCount")
        .where("refund.merchantId IN (:...merchantIds)", { merchantIds })
        .groupBy("refund.merchantId")
        .getRawMany<Record<string, string>>()
    ]);
    const summaries = Object.fromEntries(merchantIds.map((id) => [id, this.emptyMerchantOperationSummary()])) as Record<number, ReturnType<MallService["emptyMerchantOperationSummary"]>>;
    const mergeNumber = (rows: Record<string, string>[], keys: string[]) => {
      for (const row of rows) {
        const merchantId = Number(row.merchantId || 0);
        if (!summaries[merchantId]) continue;
        for (const key of keys) (summaries[merchantId] as any)[key] = Number(row[key] || 0);
      }
    };
    mergeNumber(productRows, ["productCount", "publishedProductCount", "pendingReviewProductCount"]);
    mergeNumber(accessRows, ["enabledAccessCount"]);
    mergeNumber(accountRows, ["enabledPaymentAccountCount"]);
    mergeNumber(refundRows, ["pendingRefundCount", "failedRefundCount"]);
    for (const row of orderRows) {
      const merchantId = Number(row.merchantId || 0);
      if (!summaries[merchantId]) continue;
      summaries[merchantId].order30dCount = Number(row.order30dCount || 0);
      summaries[merchantId].received30dAmount = Number(row.received30dAmount || 0).toFixed(2);
    }
    return summaries;
  }

  async saveMerchant(dto: MallMerchantDto, id?: number, admin?: AdminContext) {
    const ownerType = dto.ownerType || (dto.agentId ? "agent" : "tenant");
    const agent = ownerType === "agent" ? await this.agents.findOne({ where: { id: Number(dto.agentId || 0) } }) : null;
    if (ownerType === "agent" && !agent) throw new BadRequestException("请选择要开通商城店铺的代理");
    const tenant = dto.tenantId
      ? await this.adminTargetTenant(admin, dto.tenantId)
      : agent?.tenant
        ? await this.adminTargetTenant(admin, agent.tenant.id)
        : null;
    if (!tenant) throw new BadRequestException("请选择店铺所属商家");
    this.assertMallWritable(tenant);
    if (!id) this.assertMallQuota(tenant, "merchants", await this.merchants.count({ where: { tenant: { id: tenant.id } } }));
    const row = id ? await this.merchants.findOne({ where: { id } }) : this.merchants.create();
    if (!row) throw new NotFoundException("商城店铺不存在");
    const nextCode = this.normalizeMerchantCode(dto.code || row.code || `${ownerType}_${ownerType === "agent" ? agent?.id : tenant.id}`);
    const nextPaymentMode = dto.paymentMode || row.paymentMode || "platform_collect";
    const nextStatus = dto.status ?? row.status ?? (id ? "active" : "disabled");
    const nextMallEnabled = dto.mallEnabled ?? row.mallEnabled ?? (id ? true : false);
    if (id) await this.assertMerchantIdentityCanChange(row, { ownerType, tenant, agent, code: nextCode });
    if (id) await this.assertMerchantPaymentModeCanChange(row, row.paymentMode, nextPaymentMode);
    if (id) await this.assertMerchantCloseAllowed(row, nextStatus, nextMallEnabled);
    await this.assertMerchantOpenReady(row, nextStatus, nextMallEnabled);
    row.ownerType = ownerType;
    row.tenant = tenant;
    row.agent = agent;
    row.code = nextCode;
    row.name = this.requiredString(dto.name, "店铺名称");
    row.status = nextStatus;
    row.onboardingStatus = row.onboardingStatus || "legacy_approved";
    row.contractRequired = Boolean(row.contractRequired);
    row.platformCommissionBps = Math.max(0, Number(row.platformCommissionBps || 0));
    row.serviceFeeBps = Math.max(0, Number(row.serviceFeeBps || 0));
    row.settlementCycleDays = Math.max(1, Number(row.settlementCycleDays || 30));
    row.suspendedAt = row.suspendedAt || null;
    row.suspensionReason = row.suspensionReason || null;
    row.mallEnabled = nextMallEnabled;
    row.productAuditRequired = dto.productAuditRequired !== false;
    row.paymentMode = nextPaymentMode;
    row.region = this.optionalString(dto.region) || agent?.region || tenant.region || null;
    row.contactName = this.optionalString(dto.contactName) || agent?.contactName || tenant.contactName || null;
    row.contactPhone = this.optionalString(dto.contactPhone) || agent?.contactPhone || tenant.contactPhone || null;
    row.logoUrl = this.optionalString(dto.logoUrl);
    row.notice = this.optionalString(dto.notice);
    row.remark = this.optionalString(dto.remark);
    row.settlementConfig = row.settlementConfig || (agent?.settlementConfig ?? { source: ownerType === "agent" ? "agent_store" : "tenant_store" });
    row.freightConfig = {
      enabled: dto.freightEnabled ?? row.freightConfig?.enabled ?? true,
      baseFreightFen: dto.baseFreight === undefined ? Number(row.freightConfig?.baseFreightFen || 0) : yuanToFen(dto.baseFreight),
      freeThresholdFen: dto.freeShippingThreshold === undefined ? Number(row.freightConfig?.freeThresholdFen || 0) : yuanToFen(dto.freeShippingThreshold)
    };
    await this.assertMerchantDirectOpenReady(row);
    const saved = await this.merchants.save(row);
    await this.logOperation(admin, id ? "mall.merchant.update" : "mall.merchant.create", "mall_merchant", saved.id, `${id ? "更新" : "创建"}商城店铺：${saved.name}`, saved.tenant.id);
    return saved;
  }

  async adminMerchantAccess(query: MallListQueryDto & { adminId?: number }, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.merchantAccess
      .createQueryBuilder("access")
      .leftJoinAndSelect("access.admin", "admin")
      .leftJoinAndSelect("access.merchant", "merchant")
      .leftJoinAndSelect("access.tenant", "tenant")
      .orderBy("access.id", "DESC");
    if (tenant) builder.andWhere("access.tenantId = :tenantId", { tenantId: tenant.id });
    if (query.adminId) builder.andWhere("admin.id = :adminId", { adminId: Number(query.adminId) });
    if (query.merchantId) builder.andWhere("merchant.id = :merchantId", { merchantId: Number(query.merchantId) });
    if (query.enabled === "true") builder.andWhere("access.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("access.enabled = :enabled", { enabled: false });
    return builder.take(300).getMany();
  }

  async saveMerchantAccess(dto: MallMerchantAccessDto, id?: number, admin?: AdminContext) {
    const adminUser = await this.adminUsers.findOne({ where: { id: Number(dto.adminId || 0) } });
    if (!adminUser) throw new NotFoundException("后台账号不存在");
    const merchant = await this.merchants.findOne({ where: { id: Number(dto.merchantId || 0) } });
    if (!merchant) throw new NotFoundException("商城店铺不存在");
    if (admin?.tenantId && merchant.tenant.id !== admin.tenantId) throw new ForbiddenException("店铺不属于当前商家");
    if (!adminUser.tenant || adminUser.tenant.id !== merchant.tenant.id) {
      const accountTenantName = adminUser.tenant?.name || "平台";
      throw new BadRequestException(`被授权账号「${adminUser.username}」属于「${accountTenantName}」，不能授权管理「${merchant.tenant.name}」的店铺；请使用与店铺同一商家的后台账号。`);
    }
    const row = id ? await this.merchantAccess.findOne({ where: { id } }) : await this.merchantAccess.findOne({ where: { admin: { id: adminUser.id }, merchant: { id: merchant.id } } });
    if (row) {
      if (admin?.tenantId && row.tenant?.id !== admin.tenantId) throw new ForbiddenException("店员授权不属于当前商家");
      if (row.admin.id !== adminUser.id || row.merchant.id !== merchant.id) throw new BadRequestException("店员授权的账号和店铺不可变更，请新建授权");
    }
    const access = row || this.merchantAccess.create();
    access.admin = adminUser;
    access.merchant = merchant;
    access.tenant = merchant.tenant;
    access.accessRole = this.optionalString(dto.accessRole) || "manager";
    const requestedPermissions = Array.isArray(dto.permissions) ? Array.from(new Set(dto.permissions.map((item) => String(item).trim()).filter(Boolean))).slice(0, 30) : null;
    access.permissions = requestedPermissions?.length ? requestedPermissions : access.permissions?.length ? access.permissions : this.defaultMerchantAccessPermissions(access.accessRole);
    access.validFrom = dto.validFrom ? this.optionalDate(dto.validFrom) : row ? access.validFrom : null;
    access.validUntil = dto.validUntil ? this.optionalDate(dto.validUntil) : null;
    if (access.validUntil && access.validFrom && access.validUntil <= access.validFrom) throw new BadRequestException("授权到期时间必须晚于生效时间");
    access.enabled = dto.enabled !== false;
    access.disabledReason = access.enabled ? null : this.optionalString(dto.disabledReason) || "手工停用";
    await this.assertMerchantAccessDisableAllowed(access);
    const saved = await this.merchantAccess.save(access);
    await this.logOperation(admin, id ? "mall.merchant_access.update" : "mall.merchant_access.create", "admin_mall_merchant_access", saved.id, `授权后台账号 ${adminUser.username} 管理店铺：${merchant.name}`, merchant.tenant.id);
    return saved;
  }

  async adminMerchantPaymentAccounts(query: MallListQueryDto, admin?: AdminContext) {
    const { merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, false, false, "merchant.manage");
    if (!merchant) throw new BadRequestException("请选择要查看收款账户的商城店铺");
    const rows = await this.merchantPaymentAccounts.find({ where: { merchant: { id: merchant.id } }, order: { id: "DESC" } });
    return rows.map((row) => this.publicMerchantPaymentAccount(row));
  }

  async saveMerchantPaymentAccount(dto: MallMerchantPaymentAccountDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, undefined, dto.merchantId, false, false, "merchant.manage");
    if (!tenant || !merchant) throw new BadRequestException("请选择要配置收款账户的商城店铺");
    const row = id
      ? await this.merchantPaymentAccounts.findOne({ where: { id } })
      : await this.merchantPaymentAccounts.findOne({ where: { merchant: { id: merchant.id }, provider: dto.provider } });
    const account = row || this.merchantPaymentAccounts.create();
    if (row && row.merchant.id !== merchant.id) throw new ForbiddenException("收款账户不属于当前店铺");
    account.tenant = tenant;
    account.merchant = merchant;
    account.provider = dto.provider;
    account.merchantName = this.optionalString(dto.merchantName);
    account.merchantNo = this.optionalString(dto.merchantNo);
    account.enabled = dto.enabled !== false;
    account.config = dto.config === undefined ? account.config : this.mergeMaskedPaymentConfig(dto.config || null, account.config);
    if (account.enabled) this.assertMerchantPaymentAccountReady(account);
    else await this.assertMerchantPaymentAccountDisableAllowed(account);
    const saved = await this.merchantPaymentAccounts.save(account);
    await this.logOperation(admin, id ? "mall.merchant_payment_account.update" : "mall.merchant_payment_account.create", "mall_merchant_payment_account", saved.id, `${id ? "更新" : "创建"}店铺收款账户：${merchant.name}`, tenant.id);
    return this.publicMerchantPaymentAccount(saved);
  }

  async uploadedMerchantPaymentCredential(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("请上传 .pem/.key/.crt/.cer/.p12/.pfx 格式的支付证书或密钥文件");
    const buffered = file as Express.Multer.File & { buffer: Buffer };
    await assertUploadMalwareSafe(buffered.buffer, uploadMalwareScanConfig(this.config));
    const path = storePrivateCredential(buffered);
    return {
      path,
      filename: path.slice("secure-credential://".length),
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    };
  }

  async publicMerchants(query: MallListQueryDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const builder = this.merchants
      .createQueryBuilder("merchant")
      .leftJoinAndSelect("merchant.tenant", "tenant")
      .leftJoinAndSelect("merchant.agent", "agent")
      .where("merchant.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("merchant.status = :status", { status: "active" })
      .andWhere("merchant.mallEnabled = :enabled", { enabled: true })
      .andWhere("merchant.onboardingStatus NOT IN (:...blockedOnboardingStatuses)", { blockedOnboardingStatuses: ["suspended", "expired", "rejected"] })
      .andWhere((qb) => {
        const publishedProduct = qb.subQuery()
          .select("1")
          .from(MallProduct, "publishedProduct")
          .innerJoin(MallSku, "publishedSku", "publishedSku.productId = publishedProduct.id AND publishedSku.enabled = :enabledSku")
          .where("publishedProduct.merchantId = merchant.id")
          .andWhere("publishedProduct.status = :publishedStatus")
          .getQuery();
        return `EXISTS ${publishedProduct}`;
      })
      .setParameter("publishedStatus", "published")
      .setParameter("enabledSku", true)
      .orderBy("merchant.id", "ASC");
    if (query.keyword?.trim()) builder.andWhere("(merchant.name LIKE :keyword OR merchant.region LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const rows = await builder.take(100).getMany();
    return rows.map((row) => this.publicMerchantSummary(row));
  }

  async publicMerchantDetail(id: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = await this.merchants.findOne({ where: { id, tenant: { id: tenant.id }, status: "active", mallEnabled: true } });
    if (!merchant) throw new NotFoundException("店铺不存在或未开通商城");
    this.assertMerchantEnabled(merchant);
    const productCount = await this.merchantPublishedProductCount(merchant.id);
    if (!productCount) throw new NotFoundException("店铺暂无已上架商品，暂未对外展示");
    return this.publicMerchantSummary(merchant, { productCount });
  }

  async adminBrands(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.brands.createQueryBuilder("brand").leftJoinAndSelect("brand.tenant", "tenant").orderBy("brand.sortOrder", "ASC").addOrderBy("brand.id", "DESC");
    if (tenant) builder.andWhere("brand.tenantId = :tenantId", { tenantId: tenant.id });
    if (query.status) builder.andWhere("brand.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(brand.code LIKE :keyword OR brand.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(300).getMany();
  }

  async saveBrand(dto: MallBrandDto, id?: number, admin?: AdminContext) {
    if (!this.isPlatformAdminContext(admin)) throw new ForbiddenException("平台品牌只能由平台超级管理员维护");
    const tenant = await this.adminTargetTenant(admin, dto.tenantId);
    if (!tenant) throw new BadRequestException("请选择品牌所属商家");
    const row = id ? await this.brands.findOne({ where: { id } }) : this.brands.create();
    if (!row) throw new NotFoundException("商城品牌不存在");
    if (id && row.tenant.id !== tenant.id) throw new ForbiddenException("品牌不属于所选商家");
    const code = this.normalizeCatalogCode(dto.code, "品牌编码");
    const duplicate = await this.brands.findOne({ where: { tenant: { id: tenant.id }, code } });
    if (duplicate && duplicate.id !== row.id) throw new BadRequestException("品牌编码已存在");
    row.tenant = tenant;
    row.code = code;
    row.name = this.requiredString(dto.name, "品牌名称").slice(0, 120);
    row.logoUrl = this.optionalString(dto.logoUrl);
    row.description = this.optionalString(dto.description);
    row.status = dto.status === "disabled" ? "disabled" : "active";
    row.sortOrder = Number(dto.sortOrder || 0);
    const saved = await this.brands.save(row);
    await this.logOperation(admin, id ? "mall.brand.update" : "mall.brand.create", "mall_brand", saved.id, `${id ? "更新" : "创建"}商城品牌：${saved.name}`, tenant.id);
    return saved;
  }

  async adminCategories(query: MallListQueryDto, admin?: AdminContext) {
    const scope = query.scope === "platform" ? "platform" : "merchant";
    const target = scope === "platform"
      ? { tenant: await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId), merchant: null }
      : await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "product.manage");
    const { tenant, merchant } = target;
    const builder = this.categories
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.tenant", "tenant")
      .leftJoinAndSelect("category.merchant", "merchant")
      .leftJoinAndSelect("category.parent", "parent")
      .orderBy("category.sortOrder", "ASC")
      .addOrderBy("category.id", "ASC");
    builder.andWhere("category.scope = :scope", { scope });
    if (tenant) this.applyTenantFilter(builder, "category", tenant);
    if (merchant) this.applyMerchantFilter(builder, "category", merchant);
    if (scope === "platform") builder.andWhere("category.merchantId IS NULL");
    if (query.enabled === "true") builder.andWhere("category.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("category.enabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) builder.andWhere("(category.code LIKE :keyword OR category.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.getMany();
  }

  async saveCategory(dto: MallCategoryDto, id?: number, admin?: AdminContext) {
    const scope = dto.scope === "platform" ? "platform" : "merchant";
    if (scope === "platform" && !this.isPlatformAdminContext(admin)) throw new ForbiddenException("平台类目只能由平台超级管理员维护");
    const target = scope === "platform"
      ? { tenant: await this.adminTargetTenant(admin, dto.tenantId), merchant: null }
      : await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId, false, true, "product.manage");
    const { tenant, merchant } = target;
    if (!tenant || (scope === "merchant" && !merchant)) throw new BadRequestException(scope === "platform" ? "请选择平台类目所属商家" : "请选择要维护分类的店铺");
    const row = id ? await this.categories.findOne({ where: { id } }) : this.categories.create();
    if (!row) throw new NotFoundException("商城分类不存在");
    this.assertAdminTenantAccess(row, admin);
    if (id && row.scope !== scope) throw new BadRequestException("分类创建后不能切换平台类目和店铺分类");
    if (id && scope === "merchant") await this.assertExistingMerchantScope(row, merchant!, admin, "商城分类");
    const parent = dto.parentId ? await this.categories.findOne({ where: { id: Number(dto.parentId), tenant: { id: tenant.id }, scope } }) : null;
    if (dto.parentId && !parent) throw new BadRequestException("上级分类不存在或分类范围不一致");
    if (parent && parent.id === row.id) throw new BadRequestException("分类不能选择自己作为上级");
    const code = this.normalizeCatalogCode(dto.code || `C${row.id || Date.now()}`, "分类编码");
    const duplicate = await this.categories.findOne({ where: { tenant: { id: tenant.id }, scope, code } });
    if (duplicate && duplicate.id !== row.id) throw new BadRequestException("分类编码已存在");
    row.tenant = tenant;
    row.merchant = merchant;
    row.scope = scope;
    row.code = code;
    row.parent = parent;
    row.name = this.requiredString(dto.name, "分类名称");
    row.iconUrl = this.optionalString(dto.iconUrl);
    row.sortOrder = Number(dto.sortOrder || 0);
    row.enabled = dto.enabled !== false;
    const saved = await this.categories.save(row);
    await this.logOperation(admin, id ? "mall.category.update" : "mall.category.create", "mall_category", saved.id, `${id ? "更新" : "创建"}商城分类：${saved.name}`, saved.tenant.id);
    return saved;
  }

  async adminCoupons(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "marketing.manage");
    const builder = this.coupons.createQueryBuilder("coupon").leftJoinAndSelect("coupon.tenant", "tenant").leftJoinAndSelect("coupon.merchant", "merchant").orderBy("coupon.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "coupon", tenant);
    if (merchant) builder.andWhere("(coupon.merchantId IS NULL OR coupon.merchantId = :merchantId)", { merchantId: merchant.id });
    if (query.enabled === "true") builder.andWhere("coupon.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("coupon.enabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) builder.andWhere("(coupon.code LIKE :keyword OR coupon.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const coupons = await builder.take(200).getMany();
    const rows = coupons.map((coupon) => this.adminCoupon(coupon));
    if (!query.status) return rows;
    return rows.filter((coupon) => coupon.runtimeStatus === query.status);
  }

  async saveCoupon(dto: MallCouponDto, id?: number, admin?: AdminContext) {
    const row = id ? await this.coupons.findOne({ where: { id } }) : this.coupons.create();
    if (!row) throw new NotFoundException("商城优惠券不存在");
    this.assertAdminTenantAccess(row, admin);
    const issuerScope = dto.issuerScope === "platform" ? "platform" : dto.issuerScope === "merchant" ? "merchant" : row.issuerScope || "merchant";
    if (issuerScope === "platform") await this.assertTenantWideMallPermission(admin, "marketing.manage", "平台券");
    const target = issuerScope === "platform"
      ? { tenant: await this.adminTargetTenant(admin, dto.tenantId || row.tenant?.id, false), merchant: null }
      : await this.adminTargetMerchant(admin, dto.tenantId || row.tenant?.id, dto.merchantId || row.merchant?.id, false, true, "marketing.manage");
    const { tenant, merchant } = target;
    if (!tenant || (issuerScope === "merchant" && !merchant)) throw new BadRequestException(issuerScope === "platform" ? "请选择平台券所属商家" : "请选择要发券的店铺");
    if (id && (Number(row.usedCount || 0) > 0 || Number(row.claimedCount || 0) > 0) && row.issuerScope !== issuerScope) throw new BadRequestException("优惠券已有领取或使用记录，不能切换平台券和店铺券");
    if (id && issuerScope === "merchant") await this.assertExistingMerchantScope(row, merchant!, admin, "商城优惠券");
    row.tenant = tenant;
    row.merchant = merchant;
    row.issuerScope = issuerScope;
    const code = this.normalizeCouponCode(dto.code);
    await this.assertCouponCodeAvailable(tenant, code, id);
    row.code = code;
    row.name = this.requiredString(dto.name, "优惠券名称");
    const minAmount = Math.max(Number(dto.minAmount || 0), 0);
    const discountAmount = Math.max(Number(dto.discountAmount || 0), 0);
    if (!discountAmount) throw new BadRequestException("优惠金额必须大于 0");
    row.minAmount = minAmount.toFixed(2);
    row.discountAmount = discountAmount.toFixed(2);
    row.scope = this.normalizeCouponScope(dto.scope);
    row.scopeCategoryId = null;
    row.scopeProductId = null;
    if (row.scope === "category") {
      const category = issuerScope === "platform"
        ? await this.categories.findOne({ where: { id: Number(dto.scopeCategoryId || 0), tenant: { id: tenant.id }, scope: "platform" } })
        : await this.categories.findOne({ where: { id: Number(dto.scopeCategoryId || 0), tenant: { id: tenant.id }, merchant: { id: merchant!.id }, scope: "merchant" } });
      if (!category) throw new BadRequestException("请选择有效的适用分类");
      row.scopeCategoryId = category.id;
    }
    if (row.scope === "product") {
      const product = issuerScope === "platform"
        ? await this.products.findOne({ where: { id: Number(dto.scopeProductId || 0), tenant: { id: tenant.id } } })
        : await this.products.findOne({ where: { id: Number(dto.scopeProductId || 0), tenant: { id: tenant.id }, merchant: { id: merchant!.id } } });
      if (!product) throw new BadRequestException("请选择有效的适用商品");
      row.scopeProductId = product.id;
    }
    const usageLimit = Math.max(Math.trunc(Number(dto.usageLimit || 0)), 0);
    const issuanceLimit = Math.max(Math.trunc(Number(dto.issuanceLimit || 0)), 0);
    const perUserLimit = Math.max(Math.trunc(Number(dto.perUserLimit || 0)), 0);
    this.assertCouponConfigurationValid(row, minAmount, discountAmount, usageLimit, issuanceLimit, perUserLimit);
    row.usageLimit = usageLimit;
    row.issuanceLimit = issuanceLimit;
    row.refundReleasePolicy = dto.refundReleasePolicy === "never" ? "never" : dto.refundReleasePolicy === "full_refund" ? "full_refund" : row.refundReleasePolicy || "full_refund";
    row.perUserLimit = perUserLimit;
    row.enabled = dto.enabled !== false;
    row.startsAt = this.optionalDate(dto.startsAt);
    row.endsAt = this.optionalDate(dto.endsAt);
    if (row.startsAt && row.endsAt && row.startsAt > row.endsAt) throw new BadRequestException("结束时间不能早于开始时间");
    const saved = await this.coupons.save(row);
    await this.logOperation(admin, id ? "mall.coupon.update" : "mall.coupon.create", "mall_coupon", saved.id, `${id ? "更新" : "创建"}商城优惠券：${saved.name}`, saved.tenant.id);
    return saved;
  }

  async adminCouponUsages(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "marketing.manage");
    const builder = this.couponUsages.createQueryBuilder("usage")
      .leftJoinAndSelect("usage.tenant", "tenant")
      .leftJoinAndSelect("usage.merchant", "merchant")
      .leftJoinAndSelect("usage.coupon", "coupon")
      .leftJoinAndSelect("usage.order", "order")
      .leftJoinAndSelect("usage.user", "user")
      .orderBy("usage.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "usage", tenant);
    if (merchant) this.applyMerchantFilter(builder, "usage", merchant);
    if (query.status) builder.andWhere("usage.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(usage.code LIKE :keyword OR coupon.name LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    return builder.take(200).getMany();
  }

  async adminPromotionCodes(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "marketing.manage");
    const builder = this.promotionCodes.createQueryBuilder("code").leftJoinAndSelect("code.tenant", "tenant").leftJoinAndSelect("code.merchant", "merchant").leftJoinAndSelect("code.promoterUser", "promoterUser").leftJoinAndSelect("code.agent", "agent").orderBy("code.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "code", tenant);
    if (merchant) this.applyMerchantFilter(builder, "code", merchant);
    if (query.enabled === "true") builder.andWhere("code.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("code.enabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) builder.andWhere("(code.code LIKE :keyword OR code.name LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(200).getMany();
  }

  async savePromotionCode(dto: MallPromotionCodeDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId, false, true, "marketing.manage");
    if (!tenant || !merchant) throw new BadRequestException("请选择要配置推广码的店铺");
    const row = id ? await this.promotionCodes.findOne({ where: { id }, relations: ["tenant", "merchant", "promoterUser", "agent"], loadEagerRelations: false }) : this.promotionCodes.create();
    if (!row) throw new NotFoundException("商城推广码不存在");
    this.assertAdminTenantAccess(row, admin);
    if (id) await this.assertExistingMerchantScope(row, merchant, admin, "商城推广码");
    const code = this.normalizePromotionCode(dto.code);
    if (!code) throw new BadRequestException("请填写推广码");
    await this.assertPromotionCodeAvailable(code, row.id);
    const promoterUser = dto.promoterUserId ? await this.users.findOne({ where: { id: Number(dto.promoterUserId) } }) : null;
    const agent = dto.agentId ? await this.agents.findOne({ where: { id: Number(dto.agentId) } }) : null;
    if (dto.promoterUserId && !promoterUser) throw new NotFoundException("推广用户不存在");
    if (dto.agentId && !agent) throw new NotFoundException("代理不存在");
    const commissionRate = Number(dto.commissionRate || 0);
    if (commissionRate < 0 || commissionRate > 1) throw new BadRequestException("佣金比例必须在 0% 到 100% 之间");
    this.assertPromotionTargetScope(tenant, promoterUser, agent);
    if (id) await this.assertPromotionCodeAccountingFieldsCanChange(row, { code, promoterUser, agent, commissionRate });
    row.tenant = tenant;
    row.merchant = merchant;
    row.code = code;
    row.name = this.requiredString(dto.name, "推广码名称");
    row.promoterUser = promoterUser;
    row.agent = agent;
    row.commissionRate = commissionRate.toFixed(4);
    row.enabled = dto.enabled !== false;
    if (!id || dto.startsAt !== undefined) row.startsAt = this.optionalDate(dto.startsAt);
    if (!id || dto.endsAt !== undefined) row.endsAt = this.optionalDate(dto.endsAt);
    if (row.startsAt && row.endsAt && row.startsAt > row.endsAt) throw new BadRequestException("推广码结束时间不能早于开始时间");
    row.remark = this.optionalString(dto.remark);
    const saved = await this.promotionCodes.save(row);
    await this.logOperation(admin, id ? "mall.promotion_code.update" : "mall.promotion_code.create", "mall_promotion_code", saved.id, `${id ? "更新" : "创建"}商城推广码：${saved.code}`, saved.tenant.id);
    return saved;
  }

  async adminFlashSales(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "marketing.manage");
    const builder = this.flashSales.createQueryBuilder("sale")
      .leftJoinAndSelect("sale.tenant", "tenant")
      .leftJoinAndSelect("sale.merchant", "merchant")
      .leftJoinAndSelect("sale.product", "product")
      .leftJoinAndSelect("sale.sku", "sku")
      .orderBy("sale.sortOrder", "ASC")
      .addOrderBy("sale.id", "DESC");
    if (tenant) this.applyTenantFilter(builder, "sale", tenant);
    if (merchant) this.applyMerchantFilter(builder, "sale", merchant);
    if (query.status) builder.andWhere("sale.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(sale.title LIKE :keyword OR product.title LIKE :keyword OR sku.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const rows = await builder.take(200).getMany();
    return rows.map((row) => this.publicFlashSale(row, true));
  }

  async saveFlashSale(dto: MallFlashSaleDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId, false, true, "marketing.manage");
    if (!tenant || !merchant) throw new BadRequestException("请选择要配置秒杀的店铺");
    const row = id ? await this.flashSales.findOne({ where: { id } }) : this.flashSales.create();
    if (!row) throw new NotFoundException("秒杀活动不存在");
    if (id) {
      this.assertAdminTenantAccess(row, admin);
      await this.assertExistingMerchantScope(row, merchant, admin, "秒杀活动");
    }
    else this.assertAdminTenantAccess({ tenant }, admin);
    const sku = await this.skus.findOne({ where: { id: Number(dto.skuId || 0), tenant: { id: tenant.id }, merchant: { id: merchant.id } } });
    if (!sku || sku.product.id !== Number(dto.productId || 0)) throw new BadRequestException("请选择有效的秒杀商品规格");
    const salePrice = Math.max(Number(dto.salePrice || 0), 0);
    const saleStock = Math.max(Math.trunc(Number(dto.saleStock || 0)), 0);
    if (salePrice <= 0) throw new BadRequestException("秒杀价必须大于 0");
    if (saleStock <= 0) throw new BadRequestException("秒杀库存必须大于 0");
    if (salePrice >= Number(sku.price || 0)) throw new BadRequestException("秒杀价必须低于当前售价");
    const title = this.requiredString(dto.title, "秒杀活动标题");
    await this.assertFlashSaleTitleAvailable(merchant, sku, title, row.id);
    const existingFlashLockedStock = Number(row.lockedStock || 0);
    const existingFlashSoldStock = Number(row.soldStock || 0);
    if (id && existingFlashLockedStock + existingFlashSoldStock > 0) {
      if (row.sku?.id !== sku.id) throw new BadRequestException("秒杀已有订单或锁定库存，不能更换商品规格");
      if (title !== row.title) throw new BadRequestException("秒杀已有订单或锁定库存，不能修改活动标题；如需调整前台展示文案，请停用旧活动后新建。");
    }
    this.assertMarketingActivityStockWithinSku(sku, saleStock, existingFlashSoldStock, existingFlashLockedStock, "秒杀");
    const startsAt = this.optionalDate(dto.startsAt);
    const endsAt = this.optionalDate(dto.endsAt);
    if (!startsAt || !endsAt) throw new BadRequestException("请设置秒杀开始和结束时间");
    if (startsAt >= endsAt) throw new BadRequestException("秒杀结束时间必须晚于开始时间");
    const nextStatus = ["draft", "active", "disabled"].includes(String(dto.status)) ? dto.status as MallFlashSale["status"] : "draft";
    if (nextStatus === "active") await this.assertFlashSaleTimeNotOverlapping(merchant, sku, startsAt, endsAt, row.id);
    row.tenant = tenant;
    row.merchant = merchant;
    row.product = sku.product;
    row.sku = sku;
    row.title = title;
    row.salePrice = salePrice.toFixed(2);
    row.saleStock = saleStock;
    row.perUserLimit = Math.max(Math.trunc(Number(dto.perUserLimit ?? 1)), 0);
    row.startsAt = startsAt;
    row.endsAt = endsAt;
    row.status = nextStatus;
    row.sortOrder = Number(dto.sortOrder || 0);
    const saved = await this.flashSales.save(row);
    await this.logOperation(admin, id ? "mall.flash_sale.update" : "mall.flash_sale.create", "mall_flash_sale", saved.id, `${id ? "更新" : "创建"}商城秒杀：${saved.title}`, saved.tenant.id);
    return this.publicFlashSale(saved, true);
  }

  async publicFlashSales(context?: PublicTenantContext, merchantId?: number) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = merchantId ? await this.publicTargetMerchant(tenant, merchantId) : null;
    const now = new Date();
    const where: any = { tenant: { id: tenant.id }, status: "active" };
    if (merchant) where.merchant = { id: merchant.id };
    const rows = await this.flashSales.find({ where, order: { sortOrder: "ASC", id: "DESC" } });
    return rows.filter((row) => this.isPublicMallActivityProductVisible(row) && row.startsAt <= now && row.endsAt >= now && this.availableFlashSaleStock(row) > 0).map((row) => this.publicFlashSale(row));
  }

  async adminGroupBuys(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "marketing.manage");
    const builder = this.groupBuys.createQueryBuilder("groupBuy")
      .leftJoinAndSelect("groupBuy.tenant", "tenant")
      .leftJoinAndSelect("groupBuy.merchant", "merchant")
      .leftJoinAndSelect("groupBuy.product", "product")
      .leftJoinAndSelect("groupBuy.sku", "sku")
      .orderBy("groupBuy.sortOrder", "ASC")
      .addOrderBy("groupBuy.id", "DESC");
    if (tenant) this.applyTenantFilter(builder, "groupBuy", tenant);
    if (merchant) this.applyMerchantFilter(builder, "groupBuy", merchant);
    if (query.status) builder.andWhere("groupBuy.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(groupBuy.title LIKE :keyword OR product.title LIKE :keyword OR sku.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const rows = await builder.take(200).getMany();
    return rows.map((row) => this.publicGroupBuy(row, true));
  }

  async adminGroupBuyRecords(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "marketing.manage");
    const builder = this.groupBuyRecords.createQueryBuilder("record")
      .leftJoinAndSelect("record.tenant", "tenant")
      .leftJoinAndSelect("record.merchant", "merchant")
      .leftJoinAndSelect("record.groupBuy", "groupBuy")
      .leftJoinAndSelect("record.order", "order")
      .leftJoinAndSelect("record.user", "user")
      .leftJoinAndSelect("record.product", "product")
      .leftJoinAndSelect("record.sku", "sku")
      .orderBy("record.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "record", tenant);
    if (merchant) this.applyMerchantFilter(builder, "record", merchant);
    if (query.status) builder.andWhere("record.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(record.title LIKE :keyword OR record.teamNo LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword OR product.title LIKE :keyword OR sku.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    return builder.take(Math.min(Math.max(Number(query.pageSize || 100), 1), 200)).getMany();
  }

  async saveGroupBuy(dto: MallGroupBuyDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId, false, true, "marketing.manage");
    if (!tenant || !merchant) throw new BadRequestException("请选择要配置拼团的店铺");
    const row = id ? await this.groupBuys.findOne({ where: { id } }) : this.groupBuys.create();
    if (!row) throw new NotFoundException("拼团活动不存在");
    if (id) {
      this.assertAdminTenantAccess(row, admin);
      await this.assertExistingMerchantScope(row, merchant, admin, "拼团活动");
    }
    else this.assertAdminTenantAccess({ tenant }, admin);
    const sku = await this.skus.findOne({ where: { id: Number(dto.skuId || 0), tenant: { id: tenant.id }, merchant: { id: merchant.id } } });
    if (!sku || sku.product.id !== Number(dto.productId || 0)) throw new BadRequestException("请选择有效的拼团商品规格");
    const groupPrice = Math.max(Number(dto.groupPrice || 0), 0);
    const groupStock = Math.max(Math.trunc(Number(dto.groupStock || 0)), 0);
    if (groupPrice <= 0) throw new BadRequestException("拼团价必须大于 0");
    if (groupStock <= 0) throw new BadRequestException("拼团库存必须大于 0");
    if (groupPrice >= Number(sku.price || 0)) throw new BadRequestException("拼团价必须低于当前售价");
    const title = this.requiredString(dto.title, "拼团活动标题");
    await this.assertGroupBuyTitleAvailable(merchant, sku, title, row.id);
    const existingGroupLockedStock = Number(row.lockedStock || 0);
    const existingGroupSoldStock = Number(row.soldStock || 0);
    if (id && existingGroupLockedStock + existingGroupSoldStock > 0) {
      if (row.sku?.id !== sku.id) throw new BadRequestException("拼团已有订单或锁定库存，不能更换商品规格");
      if (title !== row.title) throw new BadRequestException("拼团已有订单或锁定库存，不能修改活动标题；如需调整前台展示文案，请停用旧活动后新建。");
    }
    this.assertMarketingActivityStockWithinSku(sku, groupStock, existingGroupSoldStock, existingGroupLockedStock, "拼团");
    const startsAt = this.optionalDate(dto.startsAt);
    const endsAt = this.optionalDate(dto.endsAt);
    if (!startsAt || !endsAt) throw new BadRequestException("请设置拼团开始和结束时间");
    if (startsAt >= endsAt) throw new BadRequestException("拼团结束时间必须晚于开始时间");
    const nextStatus = ["draft", "active", "disabled"].includes(String(dto.status)) ? dto.status as MallGroupBuy["status"] : "draft";
    if (nextStatus === "active") await this.assertGroupBuyTimeNotOverlapping(merchant, sku, startsAt, endsAt, row.id);
    row.tenant = tenant;
    row.merchant = merchant;
    row.product = sku.product;
    row.sku = sku;
    row.title = title;
    row.groupPrice = groupPrice.toFixed(2);
    row.minPeople = Math.max(Math.trunc(Number(dto.minPeople || 2)), 2);
    row.groupStock = groupStock;
    row.perUserLimit = Math.max(Math.trunc(Number(dto.perUserLimit ?? 1)), 0);
    row.startsAt = startsAt;
    row.endsAt = endsAt;
    row.status = nextStatus;
    row.sortOrder = Number(dto.sortOrder || 0);
    const saved = await this.groupBuys.save(row);
    await this.logOperation(admin, id ? "mall.group_buy.update" : "mall.group_buy.create", "mall_group_buy", saved.id, `${id ? "更新" : "创建"}商城拼团：${saved.title}`, saved.tenant.id);
    return this.publicGroupBuy(saved, true);
  }

  async publicGroupBuys(context?: PublicTenantContext, merchantId?: number) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = merchantId ? await this.publicTargetMerchant(tenant, merchantId) : null;
    const now = new Date();
    const where: any = { tenant: { id: tenant.id }, status: "active" };
    if (merchant) where.merchant = { id: merchant.id };
    const rows = await this.groupBuys.find({ where, relations: ["merchant", "product", "sku"], loadEagerRelations: false, order: { sortOrder: "ASC", id: "DESC" } });
    return rows.filter((row) => this.isPublicMallActivityProductVisible(row) && row.startsAt <= now && row.endsAt >= now && this.availableGroupBuyStock(row) > 0).map((row) => this.publicGroupBuy(row));
  }

  async publicGroupBuyTeams(id: number, context?: PublicTenantContext, merchantId?: number) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = merchantId ? await this.publicTargetMerchant(tenant, merchantId) : null;
    const groupBuy = await this.groupBuys.findOne({
      where: { id, tenant: { id: tenant.id }, status: "active" },
      relations: ["merchant", "product", "sku"],
      loadEagerRelations: false
    });
    const now = new Date();
    if (!groupBuy || groupBuy.startsAt > now || groupBuy.endsAt < now || this.availableGroupBuyStock(groupBuy) <= 0) return [];
    if (!this.isPublicMallActivityProductVisible(groupBuy)) return [];
    if (merchant && groupBuy.merchant?.id !== merchant.id) return [];
    const rows = await this.groupBuyRecords.find({
      where: { tenant: { id: tenant.id }, groupBuy: { id: groupBuy.id }, teamStatus: "forming", status: "paid" },
      relations: ["user"],
      loadEagerRelations: false,
      order: { paidAt: "ASC", id: "ASC" }
    });
    const teams = new Map<string, MallGroupBuyRecord[]>();
    for (const row of rows) teams.set(row.teamNo, [...(teams.get(row.teamNo) || []), row]);
    return [...teams.entries()].map(([teamNo, records]) => {
      const leader = records[0]?.user;
      const paidPeople = Math.max(...records.map((record) => Number(record.paidPeople || 0)), records.length);
      const minPeople = Math.max(Number(records[0]?.minPeople || groupBuy.minPeople || 2), 1);
      return {
        teamNo,
        title: groupBuy.title,
        teamStatus: "forming",
        minPeople,
        paidPeople,
        remainingPeople: Math.max(minPeople - paidPeople, 0),
        leaderName: this.maskMallGroupBuyUser(leader),
        endsAt: groupBuy.endsAt
      };
    }).filter((team) => team.remainingPeople > 0).sort((a, b) => a.remainingPeople - b.remainingPeople || a.teamNo.localeCompare(b.teamNo)).slice(0, 5);
  }

  async publicCoupons(context?: PublicTenantContext, amount?: number, merchantId?: number) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = merchantId ? await this.publicTargetMerchant(tenant, merchantId) : null;
    const now = new Date();
    const builder = this.coupons.createQueryBuilder("coupon")
      .leftJoinAndSelect("coupon.tenant", "tenant")
      .leftJoinAndSelect("coupon.merchant", "merchant")
      .where("coupon.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("coupon.enabled = :enabled", { enabled: true })
      .andWhere("(coupon.startsAt IS NULL OR coupon.startsAt <= :now)", { now })
      .andWhere("(coupon.endsAt IS NULL OR coupon.endsAt >= :now)", { now })
      .andWhere("(coupon.usageLimit = 0 OR coupon.usedCount < coupon.usageLimit)")
      .andWhere("(merchant.id IS NULL OR (merchant.status = :merchantStatus AND merchant.mallEnabled = :merchantEnabled))", { merchantStatus: "active", merchantEnabled: true })
      .orderBy("coupon.discountAmount", "DESC");
    if (merchant) builder.andWhere("(coupon.merchantId IS NULL OR coupon.merchantId = :merchantId)", { merchantId: merchant.id });
    else builder.andWhere("coupon.merchantId IS NULL");
    if (amount !== undefined && Number.isFinite(amount)) builder.andWhere("coupon.minAmount <= :amount", { amount: Number(amount || 0) });
    const coupons = await builder.getMany();
    return coupons.map((coupon) => this.publicCoupon(coupon));
  }

  async myAvailableCoupons(user: User, context?: PublicTenantContext, amount?: number, merchantId?: number) {
    const coupons = await this.publicCoupons(context, amount, merchantId);
    const claimMap = await this.couponClaimMap(user, coupons.map((coupon) => coupon.id));
    return coupons.map((coupon) => this.publicCouponWithClaim(coupon, claimMap.get(coupon.id)));
  }

  async myCouponClaims(user: User, context?: PublicTenantContext, status?: string, merchantId?: number) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = merchantId ? await this.publicTargetMerchant(tenant, merchantId) : null;
    const rows = await this.couponClaims.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { updatedAt: "DESC" } });
    const mapped = rows.filter((claim) => this.isPublicCouponMerchantVisible(claim.coupon)).map((claim) => this.publicCouponClaim(claim));
    const scoped = merchant ? mapped.filter((item) => !item.coupon?.merchant?.id || item.coupon.merchant.id === merchant.id) : mapped;
    if (!status) return scoped;
    if (status === "unavailable") return scoped.filter((item) => ["expired", "disabled", "not_started", "claimed_out"].includes(item.status));
    if (status === "expired") return scoped.filter((item) => ["expired", "disabled"].includes(item.status));
    return scoped.filter((item) => item.status === status);
  }

  async claimCoupon(user: User, id: number, context?: PublicTenantContext, merchantId?: number, riskContext?: MallRiskContext) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = merchantId ? await this.publicTargetMerchant(tenant, merchantId) : null;
    const replay = await this.couponClaims.findOne({ where: { tenant: { id: tenant.id }, coupon: { id }, user: { id: user.id } } });
    if (replay) return this.publicCouponClaim(replay);
    const riskCoupon = await this.resolveCoupon(tenant, id, 0, [], undefined, user, "id", merchant);
    await this.consumeCouponClaimRisk(tenant, user, riskCoupon, riskContext);
    const claim = await this.dataSource.transaction(async (manager) => {
      const coupon = await this.resolveCoupon(tenant, id, 0, [], manager, user, "id", merchant);
      const repo = manager.getRepository(MallCouponClaim);
      const existing = await repo.findOne({ where: { tenant: { id: tenant.id }, coupon: { id: coupon.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
      if (existing) return existing;
      const claimError = mallCouponClaimError({ issuanceLimit: coupon.issuanceLimit, claimedCount: coupon.claimedCount, hasClaim: false });
      if (claimError) throw new BadRequestException(claimError);
      coupon.claimedCount = Number(coupon.claimedCount || 0) + 1;
      await manager.getRepository(MallCoupon).save(coupon);
      return saveWithUniqueReplay(
        () => repo.save(repo.create({ tenant, merchant: coupon.merchant || null, coupon, user, claimedCount: 1, usedCount: 0 })),
        () => repo.findOne({ where: { tenant: { id: tenant.id }, coupon: { id: coupon.id }, user: { id: user.id } } })
      );
    });
    return this.publicCouponClaim(claim);
  }

  async validatePublicCoupon(context: PublicTenantContext | undefined, code: unknown, amount: number, merchantId?: number) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = merchantId ? await this.publicTargetMerchant(tenant, merchantId) : null;
    const previewItems = merchant ? [{ productId: 0, categoryId: null, platformCategoryId: null, merchantId: merchant.id, amount: Number(amount || 0) }] : [];
    const coupon = await this.resolveCoupon(tenant, code, amount, previewItems, undefined, undefined, "code", merchant);
    if (coupon.scope && coupon.scope !== "all") throw new BadRequestException("该优惠券需在确认订单页按商品范围校验");
    const discountAmount = this.computeCouponDiscount(coupon, amount, previewItems);
    return { valid: true, coupon: this.publicCoupon(coupon), discountAmount: discountAmount.toFixed(2), payableAmount: Math.max(amount - discountAmount, 0).toFixed(2) };
  }

  async adminLogisticsCompanies(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, ["shipment.view", "shipment.manage"]);
    const builder = this.logisticsCompanies.createQueryBuilder("company").leftJoinAndSelect("company.tenant", "tenant").leftJoinAndSelect("company.merchant", "merchant").orderBy("company.sortOrder", "ASC").addOrderBy("company.id", "ASC");
    if (tenant) this.applyTenantFilter(builder, "company", tenant);
    if (merchant) this.applyMerchantFilter(builder, "company", merchant);
    if (query.enabled === "true") builder.andWhere("company.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("company.enabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) builder.andWhere("(company.name LIKE :keyword OR company.code LIKE :keyword OR company.servicePhone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(200).getMany();
  }

  async saveLogisticsCompany(dto: MallLogisticsCompanyDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId, false, true, "shipment.manage");
    if (!tenant || !merchant) throw new BadRequestException("请选择要配置物流的店铺");
    const row = id ? await this.logisticsCompanies.findOne({ where: { id } }) : this.logisticsCompanies.create();
    if (!row) throw new NotFoundException("物流公司不存在");
    this.assertAdminTenantAccess(row, admin);
    if (id) await this.assertExistingMerchantScope(row, merchant, admin, "物流公司");
    row.tenant = tenant;
    row.merchant = merchant;
    row.name = this.requiredString(dto.name, "物流公司名称");
    row.code = this.optionalString(dto.code);
    row.servicePhone = this.optionalString(dto.servicePhone);
    row.trackingUrl = this.optionalString(dto.trackingUrl);
    row.sortOrder = Number(dto.sortOrder || 0);
    row.enabled = dto.enabled !== false;
    const saved = await this.logisticsCompanies.save(row);
    await this.logOperation(admin, id ? "mall.logistics.update" : "mall.logistics.create", "mall_logistics_company", saved.id, `${id ? "更新" : "创建"}商城物流公司：${saved.name}`, saved.tenant.id);
    return saved;
  }

  async publicLogisticsCompanies(context?: PublicTenantContext, merchantId?: number) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = merchantId ? await this.publicTargetMerchant(tenant, merchantId) : null;
    const where: any = { tenant: { id: tenant.id }, enabled: true };
    where.merchant = merchant ? { id: merchant.id } : IsNull();
    const rows = await this.logisticsCompanies.find({ where, order: { sortOrder: "ASC", id: "ASC" } });
    return rows.map((row) => this.publicLogisticsCompany(row));
  }

  async adminProducts(query: MallListQueryDto, admin?: AdminContext) {
    if (query.scope === "platform") await this.assertTenantWideMallPermission(admin, "product.manage", "租户级商品范围");
    const target = query.scope === "platform"
      ? { tenant: await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId), merchant: null }
      : await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "product.manage");
    const { tenant, merchant } = target;
    const builder = this.products
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.tenant", "tenant")
      .leftJoinAndSelect("product.merchant", "merchant")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.platformCategory", "platformCategory")
      .leftJoinAndSelect("product.brand", "brand")
      .orderBy("product.sortOrder", "ASC")
      .addOrderBy("product.id", "DESC");
    if (tenant) this.applyTenantFilter(builder, "product", tenant);
    if (merchant) this.applyMerchantFilter(builder, "product", merchant);
    if (query.status) builder.andWhere("product.status = :status", { status: query.status });
    if (query.categoryId) builder.andWhere("category.id = :categoryId", { categoryId: query.categoryId });
    if (query.platformCategoryId) builder.andWhere("platformCategory.id = :platformCategoryId", { platformCategoryId: query.platformCategoryId });
    if (query.brandId) builder.andWhere("brand.id = :brandId", { brandId: query.brandId });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR product.brandName LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 50), 1), 100);
    const [items, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const skuRows = items.length ? await this.skus.find({ where: { product: { id: In(items.map((item) => item.id)) } }, order: { sortOrder: "ASC", id: "ASC" } }) : [];
    const salesMap = await this.productSalesStatsMap(items.map((item) => item.id));
    return { items: items.map((item) => ({ ...this.adminProduct(item, skuRows.filter((sku) => sku.product.id === item.id)), salesStats: salesMap.get(item.id) || { salesCount: 0, salesAmount: "0.00" } })), total, page, pageSize };
  }

  async exportAdminProductSales(query: MallListQueryDto, admin?: AdminContext) {
    const result = await this.adminProducts({ ...query, page: 1, pageSize: 500 }, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商品销售统计");
    sheet.columns = [
      { header: "商品ID", key: "id", width: 10 },
      { header: "商家", key: "tenant", width: 22 },
      { header: "商品名称", key: "title", width: 32 },
      { header: "品牌", key: "brandName", width: 18 },
      { header: "分类", key: "category", width: 16 },
      { header: "状态", key: "status", width: 12 },
      { header: "售价", key: "price", width: 12 },
      { header: "库存", key: "stock", width: 10 },
      { header: "已售数量", key: "salesCount", width: 12 },
      { header: "销售金额", key: "salesAmount", width: 14 },
      { header: "是否推荐", key: "featured", width: 10 },
      { header: "排序", key: "sortOrder", width: 10 },
      { header: "创建时间", key: "createdAt", width: 22 }
    ];
    for (const row of result.items || []) {
      sheet.addRow({
        id: row.id,
        tenant: row.tenant?.name || row.tenant?.code || "-",
        title: row.title,
        brandName: row.brandName || "",
        category: row.category?.name || "未分类",
        status: row.status === "published" ? "已上架" : row.status === "offline" ? "已下架" : "草稿",
        price: row.price,
        stock: row.stock || 0,
        salesCount: row.salesStats?.salesCount || 0,
        salesAmount: row.salesStats?.salesAmount || "0.00",
        featured: row.featured ? "是" : "否",
        sortOrder: row.sortOrder || 0,
        createdAt: row.createdAt
      });
    }
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async adminLowStockProducts(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "product.manage");
    const threshold = Math.max(Math.trunc(Number(query.lowStockThreshold ?? 10)), 0);
    const builder = this.skus
      .createQueryBuilder("sku")
      .leftJoinAndSelect("sku.tenant", "tenant")
      .leftJoinAndSelect("sku.merchant", "merchant")
      .leftJoinAndSelect("sku.product", "product")
      .leftJoinAndSelect("product.category", "category")
      .where("sku.enabled = :enabled", { enabled: true })
      .andWhere("product.status = :status", { status: "published" })
      .andWhere("(sku.stock - sku.lockedStock) <= :threshold", { threshold })
      .addSelect("sku.stock - sku.lockedStock", "availableStock")
      .orderBy("availableStock", "ASC")
      .addOrderBy("product.id", "DESC")
      .addOrderBy("sku.sortOrder", "ASC")
      .take(Math.min(Math.max(Number(query.pageSize || 50), 1), 200));
    if (tenant) this.applyTenantFilter(builder, "sku", tenant);
    if (merchant) this.applyMerchantFilter(builder, "sku", merchant);
    if (query.categoryId) builder.andWhere("category.id = :categoryId", { categoryId: query.categoryId });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR product.brandName LIKE :keyword OR sku.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const skus = await builder.getMany();
    return {
      threshold,
      items: skus.map((sku) => ({
        id: sku.id,
        name: sku.name,
        skuCode: sku.skuCode,
        price: sku.price,
        stock: sku.stock,
        lockedStock: sku.lockedStock,
        availableStock: Math.max(Number(sku.stock || 0) - Number(sku.lockedStock || 0), 0),
        enabled: sku.enabled,
        tenant: sku.tenant,
        merchant: sku.merchant,
        product: sku.product
      }))
    };
  }

  async saveProduct(dto: MallProductDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId, false, true, "product.manage");
    if (!tenant || !merchant) throw new BadRequestException("请选择要发布商品的店铺");
    this.assertMallWritable(tenant);
    if (!id) this.assertMallQuota(tenant, "products", await this.products.count({ where: { tenant: { id: tenant.id } } }));
    const row = id ? await this.products.findOne({ where: { id } }) : this.products.create();
    if (!row) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(row, admin);
    if (id) await this.assertExistingMerchantScope(row, merchant, admin, "商城商品");
    const previousStatus = row.status || "draft";
    const resubmittingRejectedProduct = previousStatus === "draft" && Boolean(row.reviewedAt && row.reviewRemark);
    const category = dto.categoryId ? await this.categories.findOne({ where: { id: Number(dto.categoryId), tenant: { id: tenant.id }, merchant: { id: merchant.id }, scope: "merchant" } }) : null;
    if (dto.categoryId && !category) throw new NotFoundException("商城分类不存在");
    const platformCategory = dto.platformCategoryId ? await this.categories.findOne({ where: { id: Number(dto.platformCategoryId), tenant: { id: tenant.id }, scope: "platform", enabled: true } }) : null;
    if (dto.platformCategoryId && !platformCategory) throw new NotFoundException("平台类目不存在或已停用");
    const brand = dto.brandId ? await this.brands.findOne({ where: { id: Number(dto.brandId), tenant: { id: tenant.id }, status: "active" } }) : null;
    if (dto.brandId && !brand) throw new NotFoundException("品牌不存在或已停用");
    const productCode = this.normalizeCatalogCode(dto.productCode || row.productCode || `P${row.id || Date.now()}`, "SPU 编码");
    const duplicateProduct = await this.products.findOne({ where: { merchant: { id: merchant.id }, productCode } });
    if (duplicateProduct && duplicateProduct.id !== row.id) throw new BadRequestException("当前店铺的 SPU 编码已存在");
    row.tenant = tenant;
    row.merchant = merchant;
    row.category = category;
    row.platformCategory = platformCategory;
    row.brand = brand;
    row.productCode = productCode;
    row.title = this.requiredString(dto.title, "商品名称");
    row.coverUrl = this.optionalString(dto.coverUrl);
    row.description = this.optionalString(dto.description);
    row.brandName = brand?.name || this.optionalString(dto.brandName);
    row.galleryUrls = this.normalizeUrlList(dto.galleryUrls, row.coverUrl);
    row.detailBlocks = Array.isArray(dto.detailBlocks) ? dto.detailBlocks.filter((item) => item && typeof item === "object" && !Array.isArray(item)).slice(0, 100) : null;
    row.attributes = this.normalizeStringMap(dto.attributes);
    const requestedStatus = dto.status || "draft";
    row.status = requestedStatus === "published" && merchant.productAuditRequired && !this.isPlatformAdminContext(admin) ? "pending_review" : requestedStatus;
    row.contentVersion = Math.max(Number(row.contentVersion || 0) + (id ? 1 : 0), 1);
    if (row.status === "pending_review") {
      row.submittedAt = new Date();
      row.reviewRemark = null;
      row.reviewedAt = null;
      row.reviewedByAdminId = null;
    }
    row.featured = Boolean(dto.featured);
    row.sortOrder = Number(dto.sortOrder || 0);
    row.deliveryNote = this.optionalString(dto.deliveryNote);
    row.afterSaleNote = this.optionalString(dto.afterSaleNote);
    const skuInputs = Array.isArray(dto.skus) && dto.skus.length ? dto.skus : [{ name: "默认规格", price: Number(dto.price || 0), originalPrice: Number(dto.originalPrice || 0), stock: 0, enabled: true }];
    const minPrice = Math.min(...skuInputs.map((sku) => Number(sku.price || 0)).filter((price) => Number.isFinite(price)));
    row.price = (Number.isFinite(minPrice) ? minPrice : Number(dto.price || 0)).toFixed(2);
    row.originalPrice = Number(dto.originalPrice || skuInputs[0]?.originalPrice || 0).toFixed(2);
    const saved = await this.products.save(row);
    await this.replaceSkus(saved, tenant, merchant, skuInputs);
    if (saved.status === "published") {
      saved.reviewRemark = null;
      saved.reviewedAt = new Date();
      saved.reviewedByAdminId = admin?.id || null;
      saved.publishedSnapshot = await this.productGovernanceSnapshot(saved);
      await this.products.save(saved);
    }
    if (saved.status === "pending_review" && previousStatus !== "pending_review") await this.recordProductAudit(saved, previousStatus === "published" || resubmittingRejectedProduct ? "resubmit" : "submit", previousStatus, saved.status, null, admin);
    if (saved.status === "offline" && previousStatus !== "offline") await this.recordProductAudit(saved, "offline", previousStatus, saved.status, null, admin);
    await this.logOperation(admin, id ? "mall.product.update" : "mall.product.create", "mall_product", saved.id, `${id ? "更新" : "创建"}商品：${saved.title}`, saved.tenant.id);
    return this.productDetail(saved.id, admin);
  }

  async productDetail(id: number, admin?: AdminContext) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(product, admin);
    await this.assertAdminRowMerchantAccess(product, admin, "商城商品");
    const skus = await this.skus.find({ where: { product: { id } }, order: { sortOrder: "ASC", id: "ASC" } });
    return this.adminProduct(product, skus);
  }

  async adminProductAudits(query: MallListQueryDto, admin?: AdminContext) {
    return this.adminProducts({ ...query, status: "pending_review" }, admin);
  }

  async productAuditHistory(id: number, admin?: AdminContext) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(product, admin);
    await this.assertAdminRowMerchantAccess(product, admin, "商城商品", "product.manage");
    return this.productAuditLogs.find({ where: { product: { id } }, order: { createdAt: "DESC" }, take: 100 });
  }

  async approveProduct(id: number, dto: MallProductReviewDto = {}, admin?: AdminContext) {
    this.assertPlatformMallAuditAdmin(admin);
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(product, admin);
    await this.assertAdminRowMerchantAccess(product, admin, "商城商品");
    if (product.status !== "pending_review") throw new BadRequestException("只有待审核商品可以通过审核");
    const previousStatus = product.status;
    product.status = "published";
    product.reviewRemark = this.optionalString(dto.remark);
    product.reviewedAt = new Date();
    product.reviewedByAdminId = admin?.id || null;
    product.publishedSnapshot = await this.productGovernanceSnapshot(product);
    const saved = await this.products.save(product);
    await this.recordProductAudit(saved, "approve", previousStatus, saved.status, saved.reviewRemark, admin);
    await this.logOperation(admin, "mall.product.approve", "mall_product", saved.id, `通过商品审核：${saved.title}`, saved.tenant.id);
    return this.productDetail(saved.id, admin);
  }

  async rejectProduct(id: number, dto: MallProductReviewDto = {}, admin?: AdminContext) {
    this.assertPlatformMallAuditAdmin(admin);
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(product, admin);
    await this.assertAdminRowMerchantAccess(product, admin, "商城商品");
    if (product.status !== "pending_review") throw new BadRequestException("只有待审核商品可以驳回");
    const previousStatus = product.status;
    product.status = "draft";
    product.reviewRemark = this.requiredString(dto.remark, "驳回原因").slice(0, 1000);
    product.reviewedAt = new Date();
    product.reviewedByAdminId = admin?.id || null;
    const saved = await this.products.save(product);
    await this.recordProductAudit(saved, "reject", previousStatus, saved.status, saved.reviewRemark, admin);
    await this.logOperation(admin, "mall.product.reject", "mall_product", saved.id, `驳回商品审核：${saved.title}`, saved.tenant.id);
    return this.productDetail(saved.id, admin);
  }

  async publicCategories(query: MallListQueryDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = query.merchantId ? await this.publicTargetMerchant(tenant, query.merchantId) : null;
    const builder = this.categories
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.merchant", "merchant")
      .leftJoinAndSelect("category.parent", "parent")
      .where("category.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("category.scope = :scope", { scope: "merchant" })
      .andWhere("category.enabled = :enabled", { enabled: true })
      .andWhere("(merchant.id IS NULL OR (merchant.status = :merchantStatus AND merchant.mallEnabled = :merchantEnabled))", { merchantStatus: "active", merchantEnabled: true })
      .andWhere((qb) => {
        const visibleProduct = qb.subQuery()
          .select("1")
          .from(MallProduct, "categoryProduct")
          .leftJoin("categoryProduct.merchant", "categoryProductMerchant")
          .innerJoin(MallSku, "categoryProductSku", "categoryProductSku.productId = categoryProduct.id AND categoryProductSku.enabled = :enabledSku")
          .where("categoryProduct.categoryId = category.id")
          .andWhere("categoryProduct.status = :publishedStatus")
          .andWhere("(categoryProductMerchant.id IS NULL OR (categoryProductMerchant.status = :merchantStatus AND categoryProductMerchant.mallEnabled = :merchantEnabled))")
          .getQuery();
        return `EXISTS ${visibleProduct}`;
      })
      .setParameter("publishedStatus", "published")
      .setParameter("enabledSku", true)
      .orderBy("category.sortOrder", "ASC")
      .addOrderBy("category.id", "ASC");
    if (merchant) builder.andWhere("category.merchantId = :merchantId", { merchantId: merchant.id });
    const rows = await builder.getMany();
    return rows.map((row) => this.publicCategory(row));
  }

  async publicProducts(query: MallListQueryDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = query.merchantId ? await this.publicTargetMerchant(tenant, query.merchantId) : null;
    const sort = ["featured", "newest", "hot"].includes(String(query.sort || "")) ? String(query.sort) : "featured";
    const builder = this.products
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.platformCategory", "platformCategory")
      .leftJoinAndSelect("product.brand", "brand")
      .leftJoinAndSelect("product.merchant", "merchant")
      .where("product.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("product.status = :status", { status: "published" })
      .andWhere("(merchant.id IS NULL OR (merchant.status = :merchantStatus AND merchant.mallEnabled = :merchantEnabled))", { merchantStatus: "active", merchantEnabled: true })
      .andWhere((qb) => {
        const enabledSku = qb.subQuery()
          .select("1")
          .from(MallSku, "publicSku")
          .where("publicSku.productId = product.id")
          .andWhere("publicSku.enabled = :enabledSku")
          .getQuery();
        return `EXISTS ${enabledSku}`;
      })
      .setParameter("enabledSku", true);
    if (merchant) builder.andWhere("product.merchantId = :merchantId", { merchantId: merchant.id });
    if (sort === "hot") {
      builder
        .leftJoin(MallOrderItem, "hotItem", "hotItem.productId = product.id")
        .leftJoin("hotItem.order", "hotOrder", "hotOrder.status IN (:...hotStatuses)", { hotStatuses: ["paid", "shipped", "completed", "refund_pending", "refunded"] })
        .addSelect("COALESCE(SUM(CASE WHEN hotOrder.id IS NULL THEN 0 ELSE hotItem.quantity END), 0)", "salesCount")
        .groupBy("product.id")
        .addGroupBy("category.id")
        .orderBy("salesCount", "DESC")
        .addOrderBy("product.featured", "DESC")
        .addOrderBy("product.sortOrder", "ASC")
        .addOrderBy("product.id", "DESC");
    } else if (sort === "newest") {
      builder.orderBy("product.id", "DESC");
    } else {
      builder.orderBy("product.featured", "DESC").addOrderBy("product.sortOrder", "ASC").addOrderBy("product.id", "DESC");
    }
    if (query.categoryId) builder.andWhere("category.id = :categoryId", { categoryId: query.categoryId });
    if (query.platformCategoryId) builder.andWhere("platformCategory.id = :platformCategoryId", { platformCategoryId: query.platformCategoryId });
    if (query.brandId) builder.andWhere("brand.id = :brandId", { brandId: query.brandId });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR product.brandName LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 50);
    const items = await builder.skip((page - 1) * pageSize).take(pageSize).getMany();
    const total = await this.publicProductCount(tenant, query, merchant);
    const skuRows = items.length ? await this.skus.find({ where: { product: { id: In(items.map((item) => item.id)) }, enabled: true }, order: { sortOrder: "ASC", id: "ASC" } }) : [];
    const salesMap = await this.productSalesMap(items.map((item) => item.id));
    return { items: items.map((item) => ({ ...this.publicProduct(item, skuRows.filter((sku) => sku.product.id === item.id)), salesCount: salesMap.get(item.id) || 0 })), total, page, pageSize, sort };
  }

  async publicProductDetail(id: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const product = await this.findPublicProductRow(id, tenant.id, true);
    this.assertPublicProductVisible(product);
    const skus = await this.skus.find({ where: { product: { id }, enabled: true }, relations: ["merchant"], loadEagerRelations: false, order: { sortOrder: "ASC", id: "ASC" } });
    if (!skus.length) throw new NotFoundException("商品暂无可售规格");
    const reviews = await this.publicProductReviews(id, context);
    return { ...this.publicProduct(product, skus), reviews };
  }

  async publicProductReviews(productId: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const product = await this.findPublicProductRow(productId, tenant.id);
    this.assertPublicProductVisible(product);
    await this.assertPublicProductSellable(product.id);
    const rows = await this.reviews.find({
      where: { tenant: { id: tenant.id }, product: { id: productId }, status: "approved" },
      relations: ["user", "merchant", "product", "sku"],
      loadEagerRelations: false,
      order: { createdAt: "DESC" },
      take: 20
    });
    return rows.map((row) => this.publicReview(row));
  }

  async favoriteStatus(user: User, productId: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const product = await this.findPublicProductRow(Number(productId), tenant.id);
    if (!product || !this.isPublicProductVisible(product) || !(await this.productHasEnabledSku(product.id))) return { favorited: false, favoriteId: null };
    const row = await this.favorites.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, product: { id: Number(productId) } } });
    return { favorited: Boolean(row), favoriteId: row?.id || null };
  }

  async toggleFavorite(user: User, productId: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const product = await this.findPublicProductRow(Number(productId), tenant.id);
    this.assertPublicProductVisible(product);
    await this.assertPublicProductSellable(product.id);
    const existing = await this.favorites.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, product: { id: product.id } } });
    if (existing) {
      await this.favorites.delete({ id: existing.id });
      return { favorited: false };
    }
    const saved = await this.favorites.save(this.favorites.create({ tenant, user, product, merchant: product.merchant || null }));
    return { favorited: true, favoriteId: saved.id };
  }

  async removeFavorite(user: User, productId: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const result = await this.favorites.delete({ tenant: { id: tenant.id }, user: { id: user.id }, product: { id: Number(productId) } });
    return { success: true, removed: Number(result.affected || 0) > 0 };
  }

  async myFavorites(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.favorites.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { createdAt: "DESC" }, take: 100 });
    const visibleRows = rows.filter((row) => this.isPublicProductVisible(row.product));
    const sellableProductIds = await this.productIdsWithEnabledSkus(visibleRows.map((row) => row.product.id));
    return visibleRows.filter((row) => sellableProductIds.has(row.product.id)).map((row) => this.publicFavorite(row));
  }

  async recordBrowse(user: User, productId: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const product = await this.findPublicProductRow(Number(productId), tenant.id);
    this.assertPublicProductVisible(product);
    await this.assertPublicProductSellable(product.id);
    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(MallProduct);
      const historyRepo = manager.getRepository(MallBrowseHistory);
      const lockedProduct = await productRepo.findOne({ where: { id: product.id, tenant: { id: tenant.id } }, relations: ["merchant"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!lockedProduct) throw new NotFoundException("商品不存在");
      const existing = await historyRepo.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, product: { id: product.id } } });
      const now = new Date();
      const row = existing || historyRepo.create({ tenant, user, product: lockedProduct, merchant: lockedProduct.merchant || null, viewCount: 0, lastViewedAt: now });
      row.viewCount = Number(row.viewCount || 0) + 1;
      row.lastViewedAt = now;
      const saved = await historyRepo.save(row);
      return { success: true, viewCount: saved.viewCount };
    });
  }

  async myBrowseHistories(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.browseHistories.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { lastViewedAt: "DESC" }, take: 100 });
    const visibleRows = rows.filter((row) => this.isPublicProductVisible(row.product));
    const sellableProductIds = await this.productIdsWithEnabledSkus(visibleRows.map((row) => row.product.id));
    return visibleRows.filter((row) => sellableProductIds.has(row.product.id)).map((row) => this.publicBrowseHistory(row));
  }

  async removeBrowseHistory(user: User, id: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const result = await this.browseHistories.delete({ id: Number(id), tenant: { id: tenant.id }, user: { id: user.id } });
    return { success: true, removed: Number(result.affected || 0) > 0 };
  }

  async clearBrowseHistories(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const result = await this.browseHistories.delete({ tenant: { id: tenant.id }, user: { id: user.id } });
    return { success: true, removedCount: Number(result.affected || 0) };
  }

  async myAddresses(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.addresses.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { isDefault: "DESC", id: "DESC" } });
    return rows.map((row) => this.publicAddress(row));
  }

  async saveMyAddress(user: User, dto: MallAddressDto, id?: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MallAddress);
      const existingRows = await repo.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { id: "ASC" }, lock: { mode: "pessimistic_write" } });
      if (!id && existingRows.length >= 20) throw new BadRequestException("最多保存 20 个收货地址，请删除不再使用的地址后重试");
      const row = id ? existingRows.find((item) => item.id === id) : repo.create();
      if (!row) throw new NotFoundException("收货地址不存在");
      row.tenant = tenant;
      row.user = user;
      this.assignAddress(row, dto);
      if (!existingRows.length) row.isDefault = true;
      if (row.isDefault) for (const item of existingRows) if (item.id !== row.id) item.isDefault = false;
      if (!row.isDefault && !existingRows.some((item) => item.id !== row.id && item.isDefault)) row.isDefault = true;
      if (existingRows.length) await repo.save(existingRows);
      return this.publicAddress(await repo.save(row));
    });
  }

  async deleteMyAddress(user: User, id: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MallAddress);
      const rows = await repo.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { id: "DESC" }, lock: { mode: "pessimistic_write" } });
      const target = rows.find((item) => item.id === id);
      if (!target) return { success: true, removed: false };
      await repo.delete({ id: target.id });
      if (target.isDefault) {
        const next = rows.find((item) => item.id !== target.id);
        if (next) { next.isDefault = true; await repo.save(next); }
      }
      return { success: true, removed: true };
    });
  }

  async myCart(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.cartItems.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { updatedAt: "DESC", id: "DESC" } });
    return rows.map((row) => this.publicCartItem(row));
  }

  async addCartItem(user: User, dto: MallCartItemDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    return this.dataSource.transaction(async (manager) => {
      const skuRepo = manager.getRepository(MallSku);
      const cartRepo = manager.getRepository(MallCartItem);
      const sku = await this.findSellableSkuRow(skuRepo, Number(dto.skuId), tenant.id, { mode: "pessimistic_write" });
      if (!sku || sku.product.status !== "published") throw new NotFoundException("商品规格不存在或已下架");
      const merchant = await this.resolvePublicSkuMerchant(tenant, sku);
      const addQuantity = Math.max(Number(dto.quantity || 1), 1);
      const available = Number(sku.stock || 0) - Number(sku.lockedStock || 0);
      const existing = await cartRepo.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, sku: { id: sku.id } }, lock: { mode: "pessimistic_write" } });
      const nextQuantity = (existing?.quantity || 0) + addQuantity;
      if (available < nextQuantity) throw new BadRequestException("购物车数量超过可购买库存");
      const row = existing || cartRepo.create({ tenant, merchant, user, product: sku.product, sku });
      row.merchant = merchant;
      row.product = sku.product;
      row.sku = sku;
      row.quantity = nextQuantity;
      return this.publicCartItem(await cartRepo.save(row));
    });
  }

  async updateCartItem(user: User, id: number, dto: MallCartQuantityDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    return this.dataSource.transaction(async (manager) => {
      const cartRepo = manager.getRepository(MallCartItem);
      const candidate = await cartRepo.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
      if (!candidate) throw new NotFoundException("购物车商品不存在");
      const sku = await this.findSellableSkuRow(manager.getRepository(MallSku), candidate.sku.id, tenant.id, { mode: "pessimistic_write" });
      const row = await cartRepo.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("购物车商品不存在");
      const quantity = Math.max(Number(dto.quantity || 0), 0);
      if (!quantity) {
        await cartRepo.delete({ id: row.id });
        return { success: true, deleted: true };
      }
      if (!sku || !sku.enabled || sku.product.status !== "published") throw new BadRequestException("商品已下架，请删除后重新选择");
      const available = Number(sku.stock || 0) - Number(sku.lockedStock || 0);
      const merchant = await this.resolvePublicSkuMerchant(tenant, sku);
      if (available < quantity) throw new BadRequestException("购物车数量超过可购买库存");
      row.merchant = merchant;
      row.product = sku.product;
      row.sku = sku;
      row.quantity = quantity;
      return this.publicCartItem(await cartRepo.save(row));
    });
  }

  async deleteCartItem(user: User, id: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    await this.cartItems.delete({ id, tenant: { id: tenant.id }, user: { id: user.id } });
    return { success: true };
  }

  async quoteOrder(user: User, dto: MallOrderQuoteDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const { items } = await this.resolveOrderInputItems(user, tenant, dto);
    const quote = await this.calculateMallOrderQuote(user, tenant, items, dto);
    const promotion = await this.resolvePromotionForQuote(tenant, items, dto.promotionCode);
    const issuedAt = Date.now();
    const expiresAt = issuedAt + this.configNumber("MALL_ORDER_QUOTE_EXPIRE_MINUTES", 10) * MINUTE_MS;
    const payload: MallOrderQuoteTokenPayload = { version: 1, tenantId: tenant.id, userId: user.id, issuedAt, expiresAt, items: quote.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity, unitPrice: item.unitPrice, productVersion: item.productVersion, flashSaleId: item.flashSaleId, groupBuyId: item.groupBuyId })), couponCode: quote.coupon?.code || null, promotionCode: promotion?.code || null, pointsUsed: quote.pointsUsed, goodsAmount: quote.goodsAmount, discountAmount: quote.discountAmount, freightAmount: quote.freightAmount, payableAmount: quote.payableAmount, allocations: quote.allocations.map((item) => ({ merchantId: item.merchantId, goodsFen: item.goodsFen, freightFen: item.freightFen, discountFen: item.discountFen, payableFen: item.payableFen })) };
    return {
      ...quote,
      promotion: promotion ? {
        code: promotion.code,
        name: promotion.name,
        merchantId: promotion.merchant?.id || null,
        merchantName: promotion.merchant?.name || null,
        commissionEligible: !isSelfPurchasePromotion(promotion.promoterUser?.id || null, user.id),
        notice: isSelfPurchasePromotion(promotion.promoterUser?.id || null, user.id) ? "本人推广码可记录来源，但自购不产生佣金" : "推广来源已校验并锁定到本次报价"
      } : null,
      quoteToken: signMallOrderQuote(payload, this.mallOrderQuoteSecret()),
      quoteExpiresAt: new Date(expiresAt).toISOString()
    };
  }

  private async resolvePromotionForQuote(tenant: Tenant, items: MallOrderInputItem[], value?: unknown) {
    const promotion = await this.resolvePromotionCode(tenant, value);
    if (!promotion) return null;
    const groups = await this.resolveOrderMerchantGroups(tenant, items);
    if (promotion.merchant && !groups.some((group) => group.merchant.id === promotion.merchant!.id)) throw new BadRequestException("该推广码所属店铺不在本次结算商品中");
    return promotion;
  }

  private async calculateMallOrderQuote(user: User, tenant: Tenant, items: MallOrderInputItem[], dto: MallOrderQuoteDto | CreateMallOrderDto) {
    const preview = await this.previewGoodsAmount(tenant, items, user);
    const goodsAmount = preview.goodsAmount;
    const coupon = dto.couponCode ? await this.resolveCoupon(tenant, dto.couponCode, goodsAmount, preview.items, undefined, user) : null;
    const couponDiscountAmount = coupon ? this.computeCouponDiscount(coupon, goodsAmount, preview.items) : 0;
    const pointsQuote = await this.computeMallPointsQuote(user, tenant, goodsAmount - couponDiscountAmount, dto.pointsToUse);
    const discountAmount = couponDiscountAmount + pointsQuote.pointsDiscountAmount;
    const goodsByMerchant = new Map<number, number>();
    for (const item of preview.items) if (item.merchantId) goodsByMerchant.set(item.merchantId, (goodsByMerchant.get(item.merchantId) || 0) + yuanToFen(item.amount));
    const merchantIds = [...goodsByMerchant.keys()];
    const merchants = merchantIds.length ? await this.merchants.find({ where: { id: In(merchantIds) } }) : [];
    const merchantMap = new Map(merchants.map((merchant) => [merchant.id, merchant]));
    const allocationRows = merchantIds.map((merchantId) => {
      const merchantItems = preview.items.filter((item) => item.merchantId === merchantId);
      const merchantGoodsFen = goodsByMerchant.get(merchantId) || 0;
      const couponEligibleFen = coupon && (!coupon.merchant || coupon.merchant.id === merchantId)
        ? yuanToFen(this.couponEligibleAmount(coupon, merchantGoodsFen / 100, merchantItems))
        : 0;
      return { key: String(merchantId), goodsFen: merchantGoodsFen, freightFen: mallFreightFen(merchantGoodsFen, merchantMap.get(merchantId)?.freightConfig), couponEligibleFen };
    });
    const allocations = buildMallCheckoutDiscountAllocations(allocationRows, yuanToFen(couponDiscountAmount), yuanToFen(pointsQuote.pointsDiscountAmount)).map((item) => ({ merchantId: Number(item.key), merchantName: merchantMap.get(Number(item.key))?.name || "店铺", ...item }));
    const freightFen = allocations.reduce((sum, item) => sum + item.freightFen, 0);
    const payableFen = allocations.reduce((sum, item) => sum + item.payableFen, 0);
    return {
      items: preview.lines,
      goodsAmount: goodsAmount.toFixed(2),
      coupon: coupon ? { id: coupon.id, code: coupon.code, name: coupon.name, minAmount: coupon.minAmount, discountAmount: couponDiscountAmount.toFixed(2), scope: coupon.scope, scopeCategoryId: coupon.scopeCategoryId, scopeProductId: coupon.scopeProductId } : null,
      couponDiscountAmount: couponDiscountAmount.toFixed(2),
      availablePoints: pointsQuote.availablePoints,
      pointsUsed: pointsQuote.pointsUsed,
      pointsDiscountAmount: pointsQuote.pointsDiscountAmount.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      freightAmount: fenToYuan(freightFen),
      payableAmount: fenToYuan(payableFen),
      allocations
    };
  }

  private async assertCurrentMallOrderQuote(user: User, tenant: Tenant, items: MallOrderInputItem[], dto: CreateMallOrderDto) {
    if (!dto.quoteToken) return null;
    let quoted: MallOrderQuoteTokenPayload;
    try {
      quoted = verifyMallOrderQuote(dto.quoteToken, this.mallOrderQuoteSecret());
    } catch (error: any) {
      if (error?.message === "expired_quote_token") throw new BadRequestException("订单报价已过期，请刷新确认订单后重新提交");
      throw new BadRequestException("订单报价校验失败，请刷新确认订单后重新提交");
    }
    if (quoted.tenantId !== tenant.id || quoted.userId !== user.id) throw new BadRequestException("订单报价不属于当前账号或商家，请刷新后重试");
    const current = await this.calculateMallOrderQuote(user, tenant, items, dto);
    const promotion = await this.resolvePromotionForQuote(tenant, items, dto.promotionCode);
    const currentPayload: MallOrderQuoteTokenPayload = { version: 1, tenantId: tenant.id, userId: user.id, issuedAt: quoted.issuedAt, expiresAt: quoted.expiresAt, items: current.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity, unitPrice: item.unitPrice, productVersion: item.productVersion, flashSaleId: item.flashSaleId, groupBuyId: item.groupBuyId })), couponCode: current.coupon?.code || null, promotionCode: promotion?.code || null, pointsUsed: current.pointsUsed, goodsAmount: current.goodsAmount, discountAmount: current.discountAmount, freightAmount: current.freightAmount, payableAmount: current.payableAmount, allocations: current.allocations.map((item) => ({ merchantId: item.merchantId, goodsFen: item.goodsFen, freightFen: item.freightFen, discountFen: item.discountFen, payableFen: item.payableFen })) };
    if (JSON.stringify(comparableMallOrderQuote(quoted)) !== JSON.stringify(comparableMallOrderQuote(currentPayload))) throw new BadRequestException("商品价格、库存或优惠已变化，请刷新确认订单后重新提交");
    return { ...quoted, currentQuote: current };
  }

  private mallOrderQuoteSecret() {
    return this.config.get<string>("MALL_ORDER_QUOTE_SECRET") || this.config.get<string>("JWT_SECRET") || "dev-mall-order-quote-secret";
  }

  async createCheckoutGroup(user: User, dto: CreateMallOrderDto, context?: PublicTenantContext, riskContext?: MallRiskContext): Promise<MallCreateOrderResult> {
    return this.createOrder(user, dto, context, null, riskContext);
  }

  async createOrder(user: User, dto: CreateMallOrderDto, context?: PublicTenantContext, checkoutGroup?: MallCheckoutGroup | null, riskContext?: MallRiskContext): Promise<MallCreateOrderResult> {
    const tenant = await this.requirePublicTenant(context);
    this.assertMallWritable(tenant);
    const paymentMethod = dto.paymentMethod || PaymentMethod.Offline;
    if (![PaymentMethod.Balance, PaymentMethod.Offline, PaymentMethod.Wechat].includes(paymentMethod)) throw new BadRequestException("商城暂不支持该支付方式");
    await this.assertPaymentMethodOperationEnabled(paymentMethod, tenant);
    const clientOrderKey = this.normalizeClientOrderKey(dto.clientOrderKey);
    if (clientOrderKey) {
      const existing = await this.orders.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, clientOrderKey } });
      if (existing) return this.orderDetailForUser(existing.id, user, context);
      const existingGroup = await this.checkoutGroups.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, clientOrderKey } });
      if (existingGroup) {
        const existingResult = await this.checkoutGroupResultForUser(existingGroup, user);
        if (existingResult) return existingResult;
        throw new BadRequestException("上一次跨店结算未生成有效子订单，请刷新页面后重新提交，避免重复创建订单。");
      }
    }
    const expiresAt = this.mallOrderExpiresAt(paymentMethod);
    const address = await this.resolveOrderAddress(user, tenant, dto);
    const { cartRows, items } = await this.resolveOrderInputItems(user, tenant, dto);
    if (!items.length) throw new BadRequestException("请选择要购买的商品");
    const promotionOrderError = mallPromotionOrderError({ hasPromotion: items.some((item) => Boolean(item.flashSaleId || item.groupBuyId)), clientOrderKey });
    if (promotionOrderError) throw new BadRequestException(promotionOrderError);
    if (!checkoutGroup && items.some((item) => Boolean(item.flashSaleId || item.groupBuyId))) {
      await this.consumePromotionOrderRateLimit(tenant, user, items, clientOrderKey, riskContext);
    }
    const quotedOrder = await this.assertCurrentMallOrderQuote(user, tenant, items, dto);
    const merchantGroups = await this.resolveOrderMerchantGroups(tenant, items);
    if (!checkoutGroup && merchantGroups.length > 1) {
      return this.createCheckoutGroupFromResolved(user, dto, context, tenant, cartRows, merchantGroups, riskContext);
    }
    const merchant = merchantGroups[0]?.merchant || await this.ensureDefaultMerchant(tenant);
    const promotion = await this.resolvePromotionCode(tenant, dto.promotionCode, merchant);
    const promotionRisk = promotion ? await this.assessPromotionAttributionRisk(tenant, user, promotion, riskContext) : null;
    await this.assertPaymentMethodEnabled(paymentMethod, tenant, merchant);
    let order: MallOrder;
    try {
      order = await this.dataSource.transaction(async (manager) => {
        // Fail fast on hot inventory rows so contention becomes a retryable business response.
        await manager.query("SET SESSION innodb_lock_wait_timeout = 5");
      const skuRepo = manager.getRepository(MallSku);
      const orderRepo = manager.getRepository(MallOrder);
      const itemRepo = manager.getRepository(MallOrderItem);
      const inventoryRepo = manager.getRepository(MallInventoryLog);
      const orderItems: MallOrderItem[] = [];
      const couponItems: MallOrderPreviewItem[] = [];
      let amount = 0;
      const savedOrder = await orderRepo.save(orderRepo.create({
        orderNo: this.generateOrderNo(),
        tenant,
        merchant,
        checkoutGroup: checkoutGroup || null,
        user,
        amount: "0.00",
        goodsAmount: "0.00",
        discountAmount: "0.00",
        coupon: null,
        couponSnapshot: null,
        freightAmount: "0.00",
        allocationSnapshot: null,
        paymentMethod,
        clientOrderKey,
        status: paymentMethod === PaymentMethod.Offline ? "pending_confirm" : "pending_payment",
        promotionCode: promotion?.code || null,
        promotionSnapshot: promotion ? this.promotionSnapshot(promotion, promotionRisk) : null,
        addressSnapshot: address,
        buyerRemark: this.optionalString(dto.buyerRemark),
        adminRemark: null,
        expiresAt
      }));
      const groupBuyRecords: MallGroupBuyRecord[] = [];
      for (const [lineIndex, input] of items.entries()) {
        const quantity = Math.max(Number(input.quantity || 0), 0);
        if (!quantity) throw new BadRequestException("购买数量必须大于 0");
        if (input.flashSaleId && input.groupBuyId) throw new BadRequestException("秒杀和拼团不能同时使用");
        const sku = await this.findSellableSkuRow(skuRepo, Number(input.skuId), tenant.id, { mode: "pessimistic_write" });
        if (!sku || sku.product.status !== "published") throw new NotFoundException("商品规格不存在或已下架");
        const skuMerchant = sku.merchant || sku.product.merchant || merchant;
        if (skuMerchant.id !== merchant.id) throw new BadRequestException("一个商城子订单只能包含同一店铺的商品");
        const available = Number(sku.stock || 0) - Number(sku.lockedStock || 0);
        if (available < quantity) throw new BadRequestException(`「${sku.product.title}」库存不足`);
        const beforeStock = sku.stock;
        const beforeLocked = sku.lockedStock;
        sku.lockedStock += quantity;
        await skuRepo.save(sku);
        const orderLineKey = `${savedOrder.id}:${orderItems.length + 1}`;
        await inventoryRepo.save(inventoryRepo.create({ tenant, merchant, sku, order: savedOrder, type: "lock", operationKey: `order-line:${orderLineKey}:sku:${sku.id}:base:lock`, sourceType: "mall_order_line", sourceId: orderLineKey, quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: "商城下单锁库存" }));
        const flashSale = input.flashSaleId ? await this.resolveActiveFlashSale(manager, tenant, input.flashSaleId, sku, user, quantity) : null;
        if (flashSale) {
          const beforeSaleLocked = flashSale.lockedStock;
          flashSale.lockedStock += quantity;
          await manager.getRepository(MallFlashSale).save(flashSale);
          await inventoryRepo.save(inventoryRepo.create({ tenant, merchant, sku, order: savedOrder, type: "lock", operationKey: `order-line:${orderLineKey}:flash:${flashSale.id}:lock`, sourceType: "flash_sale", sourceId: String(flashSale.id), quantity, stockBefore: flashSale.saleStock - flashSale.soldStock, stockAfter: flashSale.saleStock - flashSale.soldStock, lockedBefore: beforeSaleLocked, lockedAfter: flashSale.lockedStock, remark: `商城秒杀锁库存：${flashSale.title}` }));
        }
        const groupBuy = input.groupBuyId ? await this.resolveActiveGroupBuy(manager, tenant, input.groupBuyId, sku, user, quantity) : null;
        if (groupBuy) {
          const beforeGroupLocked = groupBuy.lockedStock;
          groupBuy.lockedStock += quantity;
          await manager.getRepository(MallGroupBuy).save(groupBuy);
          await inventoryRepo.save(inventoryRepo.create({ tenant, merchant, sku, order: savedOrder, type: "lock", operationKey: `order-line:${orderLineKey}:group:${groupBuy.id}:lock`, sourceType: "group_buy", sourceId: String(groupBuy.id), quantity, stockBefore: groupBuy.groupStock - groupBuy.soldStock, stockAfter: groupBuy.groupStock - groupBuy.soldStock, lockedBefore: beforeGroupLocked, lockedAfter: groupBuy.lockedStock, remark: `商城拼团锁库存：${groupBuy.title}` }));
        }
        const itemPrice = flashSale ? Number(flashSale.salePrice || 0) : groupBuy ? Number(groupBuy.groupPrice || 0) : Number(sku.price);
        const quotedLine = quotedOrder?.items[lineIndex];
        if (quotedLine && (quotedLine.skuId !== sku.id || quotedLine.quantity !== quantity || quotedLine.unitPrice !== itemPrice.toFixed(2) || quotedLine.productVersion !== Number(sku.product.contentVersion || 1) || quotedLine.flashSaleId !== (flashSale?.id || null) || quotedLine.groupBuyId !== (groupBuy?.id || null))) throw new BadRequestException("商品价格或规格信息已变化，请刷新确认订单后重新提交");
        const itemTotal = itemPrice * quantity;
        amount += itemTotal;
        couponItems.push({ productId: sku.product.id, categoryId: sku.product.category?.id || null, platformCategoryId: sku.product.platformCategory?.id || null, merchantId: skuMerchant.id, amount: itemTotal });
        const skuName = flashSale ? `${sku.name}（秒杀：${flashSale.title}）` : groupBuy ? `${sku.name}（拼团：${groupBuy.title}）` : sku.name;
        orderItems.push(itemRepo.create({ tenant, merchant, order: savedOrder, product: sku.product, sku, flashSale, groupBuy, productTitle: sku.product.title, skuName, coverUrl: sku.product.coverUrl, price: itemPrice.toFixed(2), quantity, totalAmount: itemTotal.toFixed(2), productSnapshot: this.orderProductSnapshot(sku.product), skuSnapshot: this.orderSkuSnapshot(sku, skuName, itemPrice) }));
        if (groupBuy) {
          const teamNo = await this.resolveGroupBuyTeamNo(manager, tenant, groupBuy, user, quantity, input.joinTeamNo);
          groupBuyRecords.push(manager.getRepository(MallGroupBuyRecord).create({ tenant, merchant, groupBuy, order: savedOrder, user, product: sku.product, sku, title: groupBuy.title, groupPrice: Number(groupBuy.groupPrice || 0).toFixed(2), quantity, amount: itemTotal.toFixed(2), teamNo, teamStatus: "forming", minPeople: groupBuy.minPeople, paidPeople: 0, status: "pending" }));
        }
      }
      const coupon = dto.couponCode ? await this.resolveCoupon(tenant, dto.couponCode, amount, couponItems, manager, user) : null;
      const couponDiscountAmount = coupon ? this.computeCouponDiscount(coupon, amount, couponItems) : 0;
      const pointsQuote = await this.computeMallPointsQuote(user, tenant, amount - couponDiscountAmount, dto.pointsToUse, manager);
      const discountAmount = couponDiscountAmount + pointsQuote.pointsDiscountAmount;
      if (coupon) {
        coupon.usedCount += 1;
        await manager.getRepository(MallCoupon).save(coupon);
        savedOrder.coupon = coupon;
        savedOrder.couponSnapshot = { id: coupon.id, code: coupon.code, name: coupon.name, issuerScope: coupon.issuerScope, refundReleasePolicy: coupon.refundReleasePolicy, minAmount: coupon.minAmount, discountAmount: couponDiscountAmount.toFixed(2), scope: coupon.scope, scopeCategoryId: coupon.scopeCategoryId, scopeProductId: coupon.scopeProductId };
        await manager.getRepository(MallCouponUsage).save(manager.getRepository(MallCouponUsage).create({ tenant, merchant, coupon, order: savedOrder, user, code: coupon.code, discountAmount: couponDiscountAmount.toFixed(2), status: "used" }));
        await this.markCouponClaimUsed(manager, tenant, merchant, coupon, user);
      }
      const freightFen = mallFreightFen(yuanToFen(amount), merchant.freightConfig);
      const payableFen = Math.max(yuanToFen(amount) + freightFen - yuanToFen(discountAmount), 0);
      savedOrder.amount = fenToYuan(payableFen);
      savedOrder.goodsAmount = amount.toFixed(2);
      savedOrder.discountAmount = discountAmount.toFixed(2);
      savedOrder.freightAmount = fenToYuan(freightFen);
      savedOrder.pointsUsed = pointsQuote.pointsUsed;
      savedOrder.pointsDiscountAmount = pointsQuote.pointsDiscountAmount.toFixed(2);
      savedOrder.totalQuantity = orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      savedOrder.shippedQuantity = 0;
      savedOrder.fulfillmentStatus = "unshipped";
      savedOrder.businessSnapshot = { ...(savedOrder.businessSnapshot || {}), totalQuantity: savedOrder.totalQuantity, shippedQuantity: 0, fulfillmentStatus: savedOrder.fulfillmentStatus };
      savedOrder.allocationSnapshot = { source: checkoutGroup ? "checkout_group_child" : "single_order", merchantId: merchant.id, goodsFen: yuanToFen(savedOrder.goodsAmount), freightFen, discountFen: yuanToFen(savedOrder.discountAmount), payableFen };
      // The order is inserted as a zero placeholder before SKU pricing is known.
      savedOrder.amountFen = yuanToFen(savedOrder.amount);
      if (quotedOrder && (quotedOrder.goodsAmount !== savedOrder.goodsAmount || quotedOrder.discountAmount !== savedOrder.discountAmount || quotedOrder.freightAmount !== savedOrder.freightAmount || quotedOrder.payableAmount !== savedOrder.amount || quotedOrder.pointsUsed !== savedOrder.pointsUsed || quotedOrder.couponCode !== (coupon?.code || null))) throw new BadRequestException("订单金额、运费或优惠已变化，请刷新确认订单后重新提交");
      await orderRepo.save(savedOrder);
      await itemRepo.save(orderItems);
      if (groupBuyRecords.length) await manager.getRepository(MallGroupBuyRecord).save(groupBuyRecords);
      if (pointsQuote.pointsUsed > 0) await this.awardMallPoints(user, -pointsQuote.pointsUsed, "mall_points_redeem", savedOrder.id, "商城订单积分抵扣", savedOrder.tenant, manager);
      await this.recordMallOrderEvent(manager, savedOrder, { eventKey: "created", eventType: "order_created", toStatus: savedOrder.status, source: "user", operator: String(user.id), remark: checkoutGroup ? `跨店结算组 ${checkoutGroup.groupNo} 创建子订单` : "用户提交商城订单", detail: { checkoutGroupId: checkoutGroup?.id || null, paymentMethod: savedOrder.paymentMethod } });
        return savedOrder;
      });
    } catch (error: any) {
      const message = String(error?.driverError?.message || error?.message || "");
      const code = String(error?.driverError?.code || error?.code || "");
      if (clientOrderKey && (code === "ER_DUP_ENTRY" || message.includes("Duplicate entry"))) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const existing = await this.orders.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, clientOrderKey }, loadEagerRelations: false });
          if (existing) return this.orderDetailForUser(existing.id, user, context);
          const existingGroup = await this.checkoutGroups.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, clientOrderKey }, loadEagerRelations: false });
          if (existingGroup) {
            const existingResult = await this.checkoutGroupResultForUser(existingGroup, user);
            if (existingResult) return existingResult;
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
      if (code === "ER_LOCK_WAIT_TIMEOUT" || code === "ER_LOCK_DEADLOCK" || message.includes("Lock wait timeout exceeded") || message.includes("Deadlock found")) {
        throw new ConflictException("库存正在被其他请求处理，请稍后重试");
      }
      throw error;
    }
    if (paymentMethod === PaymentMethod.Balance && !checkoutGroup) {
      let paidOrder: Awaited<ReturnType<MallService["payOrderWithBalance"]>>;
      try {
        paidOrder = await this.payOrderWithBalance(order.id, user, context);
      } catch (error) {
        await this.closeOrderAndReleaseLockedInventory(order.id, "余额支付失败自动关闭");
        throw error;
      }
      if (cartRows.length) await this.cartItems.delete({ id: In(cartRows.map((row) => row.id)) });
      return paidOrder;
    }
    if (cartRows.length) await this.cartItems.delete({ id: In(cartRows.map((row) => row.id)) });
    return this.orderDetailForUser(order.id, user, context);
  }

  async createWechatPayment(orderId: number, user: User, dto: MallProviderPayDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.orders.findOne({ where: { id: orderId, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!order) throw new NotFoundException("商城订单不存在");
    if (order.paymentMethod !== PaymentMethod.Wechat) throw new BadRequestException("订单支付方式不匹配，请重新下单或联系商家处理");
    if (order.status === "paid") return { order: await this.orderDetailForUser(order.id, user, context), idempotent: true };
    if (order.status !== "pending_payment") throw new BadRequestException("当前商城订单不能发起微信支付");
    if (this.isExpiredMallOrder(order)) {
      await this.closeOrderAndReleaseLockedInventory(order.id, "商城订单超时未支付，系统已关闭");
      throw new BadRequestException("订单已超时关闭，库存已释放，请重新下单");
    }
    await this.assertPaymentMethodEnabled(PaymentMethod.Wechat, tenant, order.merchant);
    if (await this.paymentProvider.usesRealProvider("wechat")) return this.createWechatRealPayment(order, dto);
    return this.createWechatSandboxPayment(order, dto);
  }

  async createCheckoutGroupWechatPayment(groupId: number, user: User, dto: MallProviderPayDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const group = await this.checkoutGroups.findOne({ where: { id: groupId, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!group) throw new NotFoundException("跨店结算组不存在");
    const orders = await this.orders.find({ where: { checkoutGroup: { id: group.id }, tenant: { id: tenant.id }, user: { id: user.id } }, order: { id: "ASC" } });
    if (!orders.length) throw new BadRequestException("跨店结算组没有可支付子订单");
    if (orders.every((order) => ["paid", "shipped", "completed"].includes(order.status))) return { checkoutGroup: this.publicCheckoutGroup(group, await Promise.all(orders.map((order) => this.publicUserOrderWithItems(order, user)))), idempotent: true };
    if (orders.some((order) => order.paymentMethod !== PaymentMethod.Wechat || order.status !== "pending_payment")) throw new BadRequestException("结算组包含非待支付微信子订单，不能统一支付");
    if (orders.some((order) => this.isExpiredMallOrder(order))) throw new BadRequestException("结算组中存在已超时子订单，请返回订单列表重新下单");
    const directOrders = orders.filter((order) => order.merchant?.paymentMode === "merchant_direct");
    if (directOrders.length) throw new BadRequestException(`本次结算包含 ${directOrders.length} 个商户直收店铺，收款主体不同，需在我的订单中按店铺分别支付`);
    await Promise.all(orders.map((order) => this.assertPaymentMethodEnabled(PaymentMethod.Wechat, tenant, order.merchant)));
    const paymentView = this.mallCheckoutGroupPaymentView(group, tenant);
    if (await this.paymentProvider.usesRealProvider("wechat")) {
      const callbackPath = "/payment/mall/wechat/callback";
      const result = await this.paymentProvider.createPayment("wechat", paymentView, dto, { notifyUrl: this.mallWechatNotifyUrl(), callbackPath });
      return { provider: result.provider, mode: result.mode, orderNo: result.orderNo, amount: result.amount, transactionNo: result.transactionNo, checkoutGroupId: group.id, groupNo: group.groupNo, paymentMode: "platform_collect", collectionMode: "platform_collect", payParams: this.publicMallWechatPayParams(result.payParams) };
    }
    return this.createCheckoutGroupWechatSandboxPayment(group, dto);
  }

  async wechatPaymentCallback(dto: MallProviderPaymentCallbackDto | Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    if (await this.paymentProvider.usesRealProvider("wechat")) return this.wechatRealPaymentCallback(dto as Record<string, unknown>, rawContext);
    return this.wechatSandboxPaymentCallback(dto as Record<string, unknown>);
  }

  async wechatMerchantPaymentCallback(merchantId: number, dto: MallProviderPaymentCallbackDto | Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    if (!(await this.paymentProvider.usesRealProvider("wechat"))) return this.wechatSandboxPaymentCallback(dto as Record<string, unknown>);
    const merchant = await this.merchants.findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException("商城店铺不存在");
    if (merchant.paymentMode !== "merchant_direct") throw new BadRequestException("该店铺不是商户直收模式，请使用平台代收微信回调地址");
    return this.wechatRealPaymentCallbackForMerchant(merchant, dto as Record<string, unknown>, rawContext);
  }

  async wechatRefundNotification(dto: Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    if (!(await this.paymentProvider.usesRealProvider("wechat"))) throw new BadRequestException("商城真实微信退款通知需要先启用真实支付渠道");
    const context = { body: dto, headers: rawContext?.headers, rawBody: rawContext?.rawBody };
    const notification = await this.paymentProvider.parseRealRefundNotification("wechat", context);
    return this.applyMallRefundNotification(notification, null, dto);
  }

  async wechatMerchantRefundNotification(merchantId: number, dto: Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    if (!(await this.paymentProvider.usesRealProvider("wechat"))) throw new BadRequestException("商城真实微信退款通知需要先启用真实支付渠道");
    const merchant = await this.merchants.findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException("商城店铺不存在");
    if (merchant.paymentMode !== "merchant_direct") throw new BadRequestException("该店铺不是商户直收模式，请使用平台代收微信退款回调地址");
    const context = { body: dto, headers: rawContext?.headers, rawBody: rawContext?.rawBody };
    const runtimeConfig = await this.mallMerchantWechatRuntimeConfig(merchant, true);
    const notification = await this.paymentProvider.parseRealRefundNotificationForOrder("wechat", this.mallMerchantPaymentRoutingView(merchant), context, runtimeConfig);
    return this.applyMallRefundNotification(notification, merchant, dto);
  }

  private async wechatSandboxPaymentCallback(dto: Record<string, unknown>) {
    const payload = dto as Record<string, unknown>;
    const callback = this.parseWechatSandboxCallback(payload);
    const order = await this.orders.findOne({ where: { orderNo: callback.orderNo } });
    const checkoutGroup = order ? null : await this.checkoutGroups.findOne({ where: { groupNo: callback.orderNo } });
    const log = await this.createPaymentCallbackLog("wechat", payload, order, callback.signatureValid);
    if (checkoutGroup) log.tenant = checkoutGroup.tenant;
    if (!callback.signatureValid) {
      await this.finishPaymentCallbackLog(log, "failed", "商城微信支付回调签名验证失败", order);
      throw new BadRequestException("支付回调签名验证失败");
    }
    if (!order && !checkoutGroup) {
      await this.finishPaymentCallbackLog(log, "failed", "商城订单不存在", null);
      throw new NotFoundException("商城订单不存在");
    }
    if (checkoutGroup) {
      if (checkoutGroup.paymentMethod !== PaymentMethod.Wechat) {
        await this.finishPaymentCallbackLog(log, "failed", "结算组支付方式不是微信支付", null);
        throw new BadRequestException("结算组支付方式不是微信支付");
      }
      if (!sameMoneyAmount(checkoutGroup.amount, callback.amount)) {
        await this.finishPaymentCallbackLog(log, "failed", "回调金额与结算组金额不一致", null);
        throw new BadRequestException("回调金额与结算组金额不一致");
      }
      try {
        const result = await this.applySuccessfulCheckoutGroupPayment(checkoutGroup, callback.transactionNo, "wechat", "商城跨店微信统一支付回调");
        await this.finishPaymentCallbackLog(log, result.idempotent ? "idempotent" : "success", result.idempotent ? "重复回调，已按结算组幂等处理" : "商城跨店微信统一支付回调处理成功", null);
        return result;
      } catch (error: any) {
        await this.finishPaymentCallbackLog(log, "failed", error.message || "商城跨店微信统一支付回调处理失败", null);
        throw error;
      }
    }
    if (!order) throw new NotFoundException("商城订单不存在");
    if (order.paymentMethod !== PaymentMethod.Wechat) {
      await this.finishPaymentCallbackLog(log, "failed", "订单支付方式不是微信支付", order);
      throw new BadRequestException("订单支付方式不是微信支付");
    }
    if (!sameMoneyAmount(order.amount, callback.amount)) {
      await this.recordMallPaymentDiscrepancy(order, callback.transactionNo, callback.amount, "amount_mismatch", "商城微信支付回调金额与订单金额不一致");
      await this.finishPaymentCallbackLog(log, "failed", "回调金额与订单金额不一致", order);
      throw new BadRequestException("回调金额与订单金额不一致");
    }
    try {
      const result = await this.applySuccessfulMallPayment(order, callback.transactionNo, "wechat", "商城微信支付回调", PaymentMethod.Wechat);
      await this.finishPaymentCallbackLog(log, result.idempotent ? "idempotent" : "success", result.idempotent ? "重复回调，已按幂等处理" : "商城微信支付回调处理成功", result.order);
      return result;
    } catch (error: any) {
      await this.finishPaymentCallbackLog(log, "failed", error.message || "商城微信支付回调处理失败", order);
      throw error;
    }
  }

  private async wechatRealPaymentCallback(payload: Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    const context = { body: payload, headers: rawContext?.headers, rawBody: rawContext?.rawBody };
    let callback: Awaited<ReturnType<PaymentProviderService["parseRealPaymentCallback"]>>;
    try {
      callback = await this.paymentProvider.parseRealPaymentCallback("wechat", context);
    } catch (error: any) {
      const failedLog = await this.createPaymentCallbackLog("wechat", payload, null, false);
      await this.finishPaymentCallbackLog(failedLog, "failed", error.message || "商城真实微信支付回调验签或解密失败", null);
      throw error;
    }

    const order = await this.orders.findOne({ where: { orderNo: callback.orderNo } });
    const checkoutGroup = order ? null : await this.checkoutGroups.findOne({ where: { groupNo: callback.orderNo } });
    const callbackPayload = { ...payload, ...(callback.raw || {}), orderNo: callback.orderNo, transactionNo: callback.transactionNo, amount: callback.amount };
    const log = await this.createPaymentCallbackLog("wechat", callbackPayload, order, callback.signatureValid);
    if (checkoutGroup) log.tenant = checkoutGroup.tenant;
    if (!callback.signatureValid) {
      await this.finishPaymentCallbackLog(log, "failed", "商城真实微信支付回调签名验证失败", order);
      throw new BadRequestException("支付回调签名验证失败");
    }
    if (!order && !checkoutGroup) {
      await this.finishPaymentCallbackLog(log, "failed", "商城订单不存在", null);
      throw new NotFoundException("商城订单不存在");
    }
    if (checkoutGroup) {
      if (checkoutGroup.paymentMethod !== PaymentMethod.Wechat) {
        await this.finishPaymentCallbackLog(log, "failed", "结算组支付方式不是微信支付", null);
        throw new BadRequestException("结算组支付方式不是微信支付");
      }
      if (!sameMoneyAmount(checkoutGroup.amount, callback.amount)) {
        await this.finishPaymentCallbackLog(log, "failed", "回调金额与结算组金额不一致", null);
        throw new BadRequestException("回调金额与结算组金额不一致");
      }
      try {
        const result = await this.applySuccessfulCheckoutGroupPayment(checkoutGroup, callback.transactionNo, "wechat", "商城跨店真实微信统一支付回调");
        await this.finishPaymentCallbackLog(log, result.idempotent ? "idempotent" : "success", result.idempotent ? "重复回调，已按结算组幂等处理" : "商城跨店真实微信统一支付回调处理成功", null);
        return result;
      } catch (error: any) {
        await this.finishPaymentCallbackLog(log, "failed", error.message || "商城跨店真实微信统一支付回调处理失败", null);
        throw error;
      }
    }
    if (!order) throw new NotFoundException("商城订单不存在");
    if (order.merchant?.paymentMode === "merchant_direct") {
      const expectedPath = `/payment/mall/merchants/${order.merchant.id}/wechat/callback`;
      await this.finishPaymentCallbackLog(log, "failed", `商户直收订单误走平台微信回调地址，应使用 ${expectedPath}`, order);
      throw new BadRequestException(`商户直收订单不能走平台微信回调地址，请在微信商户平台配置店铺专属支付回调：${expectedPath}`);
    }
    if (order.paymentMethod !== PaymentMethod.Wechat) {
      await this.finishPaymentCallbackLog(log, "failed", "订单支付方式不是微信支付", order);
      throw new BadRequestException("订单支付方式不是微信支付");
    }
    if (!sameMoneyAmount(order.amount, callback.amount)) {
      await this.recordMallPaymentDiscrepancy(order, callback.transactionNo, callback.amount, "amount_mismatch", "商城真实微信支付回调金额与订单金额不一致");
      await this.finishPaymentCallbackLog(log, "failed", "回调金额与订单金额不一致", order);
      throw new BadRequestException("回调金额与订单金额不一致");
    }
    try {
      const result = await this.applySuccessfulMallPayment(order, callback.transactionNo, "wechat", "商城真实微信支付回调", PaymentMethod.Wechat);
      await this.finishPaymentCallbackLog(log, result.idempotent ? "idempotent" : "success", result.idempotent ? "重复回调，已按幂等处理" : "商城真实微信支付回调处理成功", result.order);
      return result;
    } catch (error: any) {
      await this.finishPaymentCallbackLog(log, "failed", error.message || "商城真实微信支付回调处理失败", order);
      throw error;
    }
  }

  private async wechatRealPaymentCallbackForMerchant(merchant: MallMerchant, payload: Record<string, unknown>, rawContext?: Omit<RealPaymentCallbackContext, "body">) {
    const context = { body: payload, headers: rawContext?.headers, rawBody: rawContext?.rawBody };
    let callback: Awaited<ReturnType<PaymentProviderService["parseRealPaymentCallbackForOrder"]>>;
    try {
      const runtimeConfig = await this.mallMerchantWechatRuntimeConfig(merchant, true);
      callback = await this.paymentProvider.parseRealPaymentCallbackForOrder("wechat", this.mallMerchantPaymentRoutingView(merchant), context, runtimeConfig);
    } catch (error: any) {
      const failedLog = await this.createPaymentCallbackLog("wechat", { ...payload, merchantId: merchant.id }, null, false);
      failedLog.merchant = merchant;
      failedLog.tenant = merchant.tenant;
      await this.finishPaymentCallbackLog(failedLog, "failed", error.message || "商户直收微信支付回调验签或解密失败", null);
      throw error;
    }

    const order = await this.orders.findOne({ where: { orderNo: callback.orderNo } });
    const callbackPayload = { ...payload, ...(callback.raw || {}), merchantId: merchant.id, orderNo: callback.orderNo, transactionNo: callback.transactionNo, amount: callback.amount };
    const log = await this.createPaymentCallbackLog("wechat", callbackPayload, order, callback.signatureValid);
    log.merchant = order?.merchant || merchant;
    log.tenant = order?.tenant || merchant.tenant;
    if (!callback.signatureValid) {
      await this.finishPaymentCallbackLog(log, "failed", "商户直收微信支付回调签名验证失败", order);
      throw new BadRequestException("支付回调签名验证失败");
    }
    if (!order) {
      await this.finishPaymentCallbackLog(log, "failed", "商城订单不存在", null);
      throw new NotFoundException("商城订单不存在");
    }
    if (order.merchant?.id !== merchant.id) {
      await this.finishPaymentCallbackLog(log, "failed", "回调店铺与订单店铺不一致", order);
      throw new BadRequestException("回调店铺与订单店铺不一致，请核对微信支付回调地址");
    }
    if (order.paymentMethod !== PaymentMethod.Wechat) {
      await this.finishPaymentCallbackLog(log, "failed", "订单支付方式不是微信支付", order);
      throw new BadRequestException("订单支付方式不是微信支付");
    }
    if (!sameMoneyAmount(order.amount, callback.amount)) {
      await this.recordMallPaymentDiscrepancy(order, callback.transactionNo, callback.amount, "amount_mismatch", "商户直收微信支付回调金额与订单金额不一致");
      await this.finishPaymentCallbackLog(log, "failed", "回调金额与订单金额不一致", order);
      throw new BadRequestException("回调金额与订单金额不一致");
    }
    try {
      const result = await this.applySuccessfulMallPayment(order, callback.transactionNo, "wechat", "商户直收微信支付回调", PaymentMethod.Wechat);
      await this.finishPaymentCallbackLog(log, result.idempotent ? "idempotent" : "success", result.idempotent ? "重复回调，已按幂等处理" : "商户直收微信支付回调处理成功", result.order);
      return result;
    } catch (error: any) {
      await this.finishPaymentCallbackLog(log, "failed", error.message || "商户直收微信支付回调处理失败", order);
      throw error;
    }
  }

  private async createWechatRealPayment(order: MallOrder, dto: MallProviderPayDto) {
    const merchantDirect = order.merchant?.paymentMode === "merchant_direct";
    const runtimeConfig = merchantDirect ? await this.mallMerchantWechatRuntimeConfig(order.merchant!, true) : null;
    const callbackPath = merchantDirect ? `/payment/mall/merchants/${order.merchant!.id}/wechat/callback` : "/payment/mall/wechat/callback";
    const result = await this.paymentProvider.createPayment("wechat", this.mallOrderPaymentView(order), dto, {
      notifyUrl: merchantDirect ? this.mallWechatMerchantNotifyUrl(order.merchant!) : this.mallWechatNotifyUrl(),
      callbackPath,
      runtimeConfig
    });
    return {
      provider: result.provider,
      mode: result.mode,
      orderNo: result.orderNo,
      amount: result.amount,
      transactionNo: result.transactionNo,
      merchantId: order.merchant?.id || null,
      merchantName: order.merchant?.name || null,
      paymentMode: order.merchant?.paymentMode || "platform_collect",
      collectionMode: order.merchant?.paymentMode === "merchant_direct" ? "merchant_direct" : "platform_collect",
      payParams: this.publicMallWechatPayParams(result.payParams)
    };
  }

  private mallWechatPaymentRoutingSummary(order: MallOrder, runtimeConfig: PaymentProviderRuntimeConfig | null, callbackPath: string) {
    const merchant = order.merchant || null;
    const paymentMode = merchant?.paymentMode || "platform_collect";
    const merchantDirect = paymentMode === "merchant_direct";
    const merchantScope = merchantDirect ? runtimeConfig?.scope || "merchant" : "platform";
    return {
      provider: "wechat",
      orderNo: order.orderNo,
      merchantId: merchant?.id || null,
      merchantName: merchant?.name || null,
      tenantId: order.tenant?.id || null,
      tenantName: order.tenant?.name || null,
      agentId: merchant?.agent?.id || null,
      paymentMode,
      collectionMode: paymentMode,
      collectionModeText: this.mallPaymentModeText(paymentMode),
      merchantScope,
      receiverType: merchantDirect ? "merchant" : "platform",
      receiverName: merchantDirect ? merchant?.name || "店铺" : order.tenant?.name || "平台",
      callbackPath
    };
  }

  private mallOrderPaymentView(order: MallOrder): Order {
    return {
      id: order.id,
      orderNo: order.orderNo,
      amount: order.amount,
      tenant: order.tenant,
      agent: order.merchant?.paymentMode === "merchant_direct" ? order.merchant.agent : null,
      registration: { activity: { title: `商城订单 ${order.orderNo}` } }
    } as Order;
  }

  private mallMerchantPaymentRoutingView(merchant: MallMerchant): Order {
    return {
      id: 0,
      orderNo: `MALL_MERCHANT_${merchant.id}`,
      amount: "0.01",
      tenant: merchant.tenant,
      agent: merchant.agent,
      registration: { activity: { title: `商城店铺 ${merchant.name}` } }
    } as Order;
  }

  private async mallMerchantWechatRuntimeConfig(merchant: MallMerchant, required = true): Promise<PaymentProviderRuntimeConfig | null> {
    const account = await this.merchantPaymentAccounts.findOne({ where: { merchant: { id: merchant.id }, provider: PaymentMethod.Wechat, enabled: true } });
    if (account) {
      return { scope: "merchant", agentId: merchant.agent?.id || null, merchantId: merchant.id, values: this.paymentConfigValues(account.config) };
    }
    if (merchant.agent?.id) {
      const legacyAgentAccount = await this.agentPaymentAccounts.findOne({ where: { agent: { id: merchant.agent.id }, provider: PaymentMethod.Wechat, enabled: true } });
      if (legacyAgentAccount) {
        return { scope: "agent", agentId: merchant.agent.id, merchantId: merchant.id, values: this.paymentConfigValues(legacyAgentAccount.config) };
      }
    }
    if (!required) return null;
    throw new BadRequestException("店铺未配置启用的微信支付账户，请在「商城店铺」中维护收款账户后再启用商户直收");
  }

  async cancelMyOrder(id: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.orders.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!order) throw new NotFoundException("商城订单不存在");
    if (!["pending_payment", "pending_confirm"].includes(order.status)) throw new BadRequestException("当前商城订单不能取消");
    await this.closeOrderAndReleaseLockedInventory(order.id, "用户取消商城订单");
    return this.orderDetailForUser(order.id, user, context);
  }

  async queryMyOrderPayment(id: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.orders.findOne({
      where: { id, tenant: { id: tenant.id }, user: { id: user.id } },
      relations: ["tenant", "merchant", "merchant.agent"],
      loadEagerRelations: false
    });
    if (!order) throw new NotFoundException("商城订单不存在");
    if (["paid", "shipped", "completed", "refund_pending", "refunded", "closed"].includes(order.status)) {
      return this.publicMallPaymentQueryResult({ provider: order.paymentMethod, mode: "local", orderNo: order.orderNo, transactionNo: order.transactionNo || null, amount: order.amount, status: order.status === "closed" ? "closed" : "success" }, order.status);
    }
    if (order.paymentMethod !== PaymentMethod.Wechat) {
      return this.publicMallPaymentQueryResult({ provider: order.paymentMethod, mode: "local", orderNo: order.orderNo, transactionNo: order.transactionNo || null, amount: order.amount, status: "pending" }, order.status);
    }
    const runtimeConfig = order.merchant?.paymentMode === "merchant_direct" ? await this.mallMerchantWechatRuntimeConfig(order.merchant, true) : null;
    const result = await this.paymentProvider.queryPayment("wechat", this.mallOrderPaymentView(order), runtimeConfig);
    if (result.status === "success" && order.status === "pending_payment") {
      if (!sameMoneyAmount(order.amount, result.amount)) {
        await this.recordMallPaymentDiscrepancy(order, result.transactionNo || "QUERY", result.amount, "amount_mismatch", "商城支付查单金额与订单金额不一致");
        throw new BadRequestException("支付渠道金额与商城订单金额不一致，请联系管理员处理");
      }
      await this.applySuccessfulMallPayment(order, result.transactionNo || `QUERY_${order.orderNo}`, "wechat", "商城支付主动查单补偿", PaymentMethod.Wechat);
    }
    return this.publicMallPaymentQueryResult(result, (await this.orders.findOneByOrFail({ id: order.id })).status);
  }

  async closeMyOrderPayment(id: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.orders.findOne({
      where: { id, tenant: { id: tenant.id }, user: { id: user.id } },
      relations: ["tenant", "merchant", "merchant.agent"],
      loadEagerRelations: false
    });
    if (!order) throw new NotFoundException("商城订单不存在");
    if (order.status === "paid") throw new BadRequestException("订单已支付，不能关闭");
    if (order.status === "closed") return { ...this.publicMallPaymentCloseResult({ provider: order.paymentMethod, mode: "local", orderNo: order.orderNo, status: "already_closed" }), order: await this.orderDetailForUser(order.id, user, context) };
    if (order.status !== "pending_payment") throw new BadRequestException("当前商城订单不能关闭支付");
    let providerResult: Record<string, unknown> = { provider: order.paymentMethod, mode: "local", orderNo: order.orderNo, status: "closed" };
    if (order.paymentMethod === PaymentMethod.Wechat) {
      const runtimeConfig = order.merchant?.paymentMode === "merchant_direct" ? await this.mallMerchantWechatRuntimeConfig(order.merchant, true) : null;
      const result = await this.paymentProvider.closePayment("wechat", this.mallOrderPaymentView(order), runtimeConfig);
      if (result.status === "paid") throw new BadRequestException("支付渠道显示订单已支付，请刷新支付状态");
      providerResult = result;
    }
    await this.closeOrderAndReleaseLockedInventory(order.id, "用户关闭商城支付订单");
    return { ...this.publicMallPaymentCloseResult(providerResult), order: await this.orderDetailForUser(order.id, user, context) };
  }

  async queryMyCheckoutGroupPayment(id: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const group = await this.checkoutGroups.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!group) throw new NotFoundException("跨店结算组不存在");
    const orders = await this.orders.find({ where: { checkoutGroup: { id: group.id }, tenant: { id: tenant.id }, user: { id: user.id } }, order: { id: "ASC" } });
    if (!orders.length) throw new BadRequestException("跨店结算组没有可查询的子订单");
    if (orders.some((order) => order.merchant?.paymentMode === "merchant_direct")) throw new BadRequestException("该结算组包含商户直收订单，请按店铺子订单分别查询支付状态");
    const refreshedBeforeQuery = await this.refreshCheckoutGroupStatus(group.id) || group;
    const pending = orders.filter((order) => order.status === "pending_payment");
    const paymentState = mallCheckoutPaymentQueryState(orders.map((order) => order.status));
    if (paymentState === "partial") {
      return this.publicMallPaymentQueryResult({ provider: group.paymentMethod, mode: "local", orderNo: group.groupNo, transactionNo: null, amount: group.amount, status: "partial" }, "partial_paid", "结算组已有部分子订单完成支付，请按店铺查看剩余待付款订单，系统不会重复整体入账。");
    }
    if (!pending.length) {
      const status = paymentState;
      return this.publicMallPaymentQueryResult({ provider: group.paymentMethod, mode: "local", orderNo: group.groupNo, transactionNo: null, amount: group.amount, status }, refreshedBeforeQuery.status);
    }
    if (group.paymentMethod !== PaymentMethod.Wechat) return this.publicMallPaymentQueryResult({ provider: group.paymentMethod, mode: "local", orderNo: group.groupNo, transactionNo: null, amount: group.amount, status: "pending" }, refreshedBeforeQuery.status);
    const result = await this.paymentProvider.queryPayment("wechat", this.mallCheckoutGroupPaymentView(group, tenant));
    if (result.status === "success" && !orders.every((order) => ["paid", "shipped", "completed"].includes(order.status))) {
      if (!sameMoneyAmount(group.amount, result.amount)) throw new BadRequestException("支付渠道金额与跨店结算组金额不一致，请联系管理员处理");
      await this.applySuccessfulCheckoutGroupPayment(group, result.transactionNo || `QUERY_${group.groupNo}`, "wechat", "商城跨店支付主动查单补偿");
    }
    const refreshed = await this.checkoutGroups.findOneByOrFail({ id: group.id });
    return this.publicMallPaymentQueryResult(result, refreshed.status);
  }

  async myCheckoutGroup(id: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const group = await this.checkoutGroups.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!group) throw new NotFoundException("跨店结算组不存在");
    const result = await this.checkoutGroupResultForUser(group, user);
    if (!result) throw new NotFoundException("跨店结算组不存在");
    return result;
  }

  async closeMyCheckoutGroupPayment(id: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const group = await this.checkoutGroups.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!group) throw new NotFoundException("跨店结算组不存在");
    const orders = await this.orders.find({ where: { checkoutGroup: { id: group.id }, tenant: { id: tenant.id }, user: { id: user.id } }, order: { id: "ASC" } });
    if (!orders.length) throw new BadRequestException("跨店结算组没有可关闭的子订单");
    if (orders.every((order) => order.status === "closed")) return { ...this.publicMallPaymentCloseResult({ provider: group.paymentMethod, mode: "local", orderNo: group.groupNo, status: "already_closed" }), checkoutGroup: await this.checkoutGroupResultForUser(group, user) };
    if (orders.some((order) => ["paid", "shipped", "completed"].includes(order.status))) throw new BadRequestException("结算组已有已支付子订单，不能整体关闭");
    if (orders.some((order) => !["pending_payment", "closed"].includes(order.status))) throw new BadRequestException("当前结算组不能整体关闭支付");
    if (orders.some((order) => order.merchant?.paymentMode === "merchant_direct")) throw new BadRequestException("该结算组包含商户直收订单，请按店铺子订单分别关闭支付");
    let providerResult: Record<string, unknown> = { provider: group.paymentMethod, mode: "local", orderNo: group.groupNo, status: "closed" };
    if (group.paymentMethod === PaymentMethod.Wechat) {
      const result = await this.paymentProvider.closePayment("wechat", this.mallCheckoutGroupPaymentView(group, tenant));
      if (result.status === "paid") throw new BadRequestException("支付渠道显示结算组已支付，请刷新支付状态");
      providerResult = result;
    }
    await this.closeCheckoutGroupPendingOrders(group.id, user.id, tenant.id, "用户关闭商城跨店结算支付");
    const refreshed = await this.checkoutGroups.findOneByOrFail({ id: group.id });
    return { ...this.publicMallPaymentCloseResult(providerResult), checkoutGroup: await this.checkoutGroupResultForUser(refreshed, user) };
  }

  private publicMallPaymentQueryResult(result: Record<string, unknown>, localStatus: string, nextAction?: string) {
    const status = String(result.status || "pending");
    return {
      provider: result.provider || null,
      mode: result.mode || "local",
      orderNo: result.orderNo || null,
      transactionNo: result.transactionNo || null,
      amount: result.amount || null,
      status,
      statusText: ({ pending: "待支付", success: "支付成功", closed: "已关闭", failed: "查询异常", partial: "部分已支付" } as Record<string, string>)[status] || status,
      localStatus,
      localStatusText: this.mallOrderStatusText(localStatus),
      nextAction: nextAction || (status === "success" ? "支付已确认，无需重复支付。" : status === "closed" ? "渠道订单已关闭，如仍需购买请重新下单。" : status === "failed" ? "支付状态暂时无法确认，请稍后重试或联系平台。" : "暂未确认支付，请完成支付或稍后刷新。")
    };
  }

  private publicMallPaymentCloseResult(result: Record<string, unknown>) {
    const status = String(result.status || "closed");
    return {
      provider: result.provider || null,
      mode: result.mode || "local",
      orderNo: result.orderNo || null,
      status,
      statusText: status === "already_closed" ? "已关闭，无需重复操作" : status === "paid" ? "渠道已支付，不能关闭" : "已关闭"
    };
  }

  async payOrderWithBalance(orderId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.orders.findOne({ where: { id: orderId, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!order) throw new NotFoundException("商城订单不存在");
    if (order.paymentMethod !== PaymentMethod.Balance) throw new BadRequestException("订单支付方式不匹配");
    if (order.status === "paid") return this.orderDetailForUser(order.id, user, context);
    if (order.status !== "pending_payment") throw new BadRequestException("当前商城订单不能使用余额支付");
    await this.assertPaymentMethodEnabled(PaymentMethod.Balance, tenant);
    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(UserWallet);
      const walletTxRepo = manager.getRepository(WalletTransaction);
      const orderRepo = manager.getRepository(MallOrder);
      const lockedOrder = await orderRepo.findOne({
        where: { id: order.id },
        relations: ["tenant", "merchant", "checkoutGroup", "user", "coupon"],
        loadEagerRelations: false,
        lock: { mode: "pessimistic_write" }
      });
      if (!lockedOrder || lockedOrder.status !== "pending_payment") return;
      const tenantScopeKey = this.walletTenantScopeKey(tenant);
      let wallet = await walletRepo.findOne({ where: { user: { id: user.id }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
      if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user, tenant, tenantScopeKey }));
      const amount = Number(lockedOrder.amount || 0);
      const amountFen = yuanToFen(amount);
      const beforeFen = yuanToFen(wallet.availableBalance || 0);
      const giftBeforeFen = yuanToFen(wallet.giftBalance || 0);
      if (beforeFen + giftBeforeFen < amountFen) throw new BadRequestException("余额不足，请联系后台充值或选择线下收款");
      const giftUsedFen = Math.min(giftBeforeFen, amountFen);
      const cashUsedFen = amountFen - giftUsedFen;
      const afterFen = beforeFen - cashUsedFen;
      const giftAfterFen = giftBeforeFen - giftUsedFen;
      wallet.availableBalance = fenToYuan(afterFen);
      wallet.giftBalance = fenToYuan(giftAfterFen);
      wallet.totalSpent = (Number(wallet.totalSpent || 0) + amount).toFixed(2);
      await walletRepo.save(wallet);
      const tx = await walletTxRepo.save(walletTxRepo.create({ wallet, user, tenant, order: null, transactionNo: `MALBAL${Date.now()}${lockedOrder.id}`, direction: "debit", type: "balance_pay", amount: amount.toFixed(2), balanceBefore: fenToYuan(beforeFen), balanceAfter: fenToYuan(afterFen), frozenBefore: wallet.frozenBalance || "0.00", frozenAfter: wallet.frozenBalance || "0.00", giftBefore: fenToYuan(giftBeforeFen), giftAfter: fenToYuan(giftAfterFen), frozenGiftBefore: wallet.frozenGiftBalance || "0.00", frozenGiftAfter: wallet.frozenGiftBalance || "0.00", operator: "user", remark: `商城订单余额支付：${lockedOrder.orderNo}`, idempotencyKey: `mall_balance_pay:${lockedOrder.id}` }));
      lockedOrder.businessSnapshot = { ...(lockedOrder.businessSnapshot || {}), walletFunding: { cashFen: cashUsedFen, giftFen: giftUsedFen, transactionNo: tx.transactionNo } };
      lockedOrder.status = "paid";
      lockedOrder.transactionNo = tx.transactionNo;
      lockedOrder.paidAt = new Date();
      lockedOrder.expiresAt = null;
      await orderRepo.save(lockedOrder);
      await this.recordMallOrderEvent(manager, lockedOrder, { eventKey: `paid:balance:${tx.transactionNo}`, eventType: "payment_confirmed", fromStatus: "pending_payment", toStatus: "paid", source: "user", operator: String(user.id), remark: "用户余额支付商城订单", detail: { transactionNo: tx.transactionNo, amount: lockedOrder.amount } });
      await this.updateGroupBuyRecordsForOrder(manager, lockedOrder, "paid");
      await this.deductLockedInventory(manager, lockedOrder);
      await this.awardMallPurchasePoints(lockedOrder, manager);
      await this.createMallCommissionForOrder(manager, lockedOrder);
    });
    await this.refreshCheckoutGroupStatusForOrder(order);
    return this.orderDetailForUser(order.id, user, context);
  }

  async myOrders(user: User, context?: PublicTenantContext, status?: string) {
    const tenant = await this.requirePublicTenant(context);
    const builder = this.orders.createQueryBuilder("order")
      .leftJoinAndSelect("order.tenant", "tenant")
      .leftJoinAndSelect("order.merchant", "merchant")
      .leftJoinAndSelect("merchant.tenant", "merchantTenant")
      .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
      .leftJoinAndSelect("order.user", "user")
      .leftJoinAndSelect("order.coupon", "coupon")
      .where("tenant.id = :tenantId", { tenantId: tenant.id })
      .andWhere("user.id = :userId", { userId: user.id })
      .orderBy("order.createdAt", "DESC");
    if (status && status !== "all") {
      if (!this.isMallOrderStatus(status)) throw new BadRequestException("订单状态不正确");
      builder.andWhere("order.status = :status", { status });
    }
    const orders = await builder.getMany();
    return Promise.all(orders.map((order) => this.publicUserOrderWithItems(order, user)));
  }

  async orderDetailForUser(id: number, user: User, context?: PublicTenantContext): Promise<MallOrderPublicResult> {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.orders.findOne({
      where: { id, tenant: { id: tenant.id }, user: { id: user.id } },
      relations: ["tenant", "merchant", "merchant.tenant", "checkoutGroup", "user", "coupon"],
      loadEagerRelations: false
    });
    if (!order) throw new NotFoundException("商城订单不存在");
    return this.publicUserOrderWithItems(order, user);
  }

  async mallOrderLogisticsForUser(id: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.orders.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!order) throw new NotFoundException("商城订单不存在");
    return this.mallOrderLogistics(order);
  }

  async confirmReceived(id: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MallOrder);
      const locked = await repo.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } }, relations: ["tenant", "merchant", "checkoutGroup", "user"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!locked) throw new NotFoundException("商城订单不存在");
      if (locked.status === "completed") return locked;
      if (locked.status !== "shipped") throw new BadRequestException("当前订单不能确认收货");
      const shipmentRepo = manager.getRepository(MallShipment);
      const shipments = await shipmentRepo.find({ where: { order: { id: locked.id }, status: "shipped", shipmentType: "order" }, lock: { mode: "pessimistic_write" } });
      const deliveredAt = new Date();
      for (const shipment of shipments) {
        shipment.status = "delivered";
        shipment.deliveredAt = deliveredAt;
        await this.recordMallOrderEvent(manager, locked, { eventKey: `shipment:${shipment.id}:delivered`, eventType: "shipment_delivered", fromStatus: "shipped", toStatus: "shipped", source: "user", operator: String(user.id), remark: `用户确认包裹 ${shipment.shipmentNo} 收货`, detail: { shipmentId: shipment.id, shipmentNo: shipment.shipmentNo, expressCompany: shipment.expressCompany, expressNo: shipment.expressNo }, occurredAt: deliveredAt });
      }
      if (shipments.length) await shipmentRepo.save(shipments);
      locked.status = "completed";
      locked.fulfillmentStatus = "received";
      locked.completedAt = deliveredAt;
      await repo.save(locked);
      await this.recordMallOrderEvent(manager, locked, { eventKey: "completed:user", eventType: "order_completed", fromStatus: "shipped", toStatus: "completed", source: "user", operator: String(user.id), remark: "用户确认全部包裹收货", detail: { shipmentIds: shipments.map((shipment) => shipment.id) }, occurredAt: locked.completedAt });
      return locked;
    });
    await this.refreshCheckoutGroupStatusForOrder(order);
    return this.publicUserOrderWithItems(order, user);
  }

  async confirmShipmentReceived(orderId: number, shipmentId: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(MallOrder);
      const shipmentRepo = manager.getRepository(MallShipment);
      const lockedOrder = await orderRepo.findOne({ where: { id: orderId, tenant: { id: tenant.id }, user: { id: user.id } }, relations: ["tenant", "merchant", "checkoutGroup", "user"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!lockedOrder) throw new NotFoundException("商城订单不存在");
      const shipment = await shipmentRepo.findOne({ where: { id: shipmentId, order: { id: lockedOrder.id } }, relations: ["refund", "refund.tenant", "refund.merchant", "refund.user", "refund.order"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!shipment) throw new NotFoundException("物流包裹不存在");
      if (shipment.status === "cancelled") throw new BadRequestException("已取消包裹不能确认收货");
      if (shipment.status !== "delivered") {
        shipment.status = "delivered";
        shipment.deliveredAt = new Date();
        await shipmentRepo.save(shipment);
        await this.recordMallOrderEvent(manager, lockedOrder, { eventKey: `shipment:${shipment.id}:delivered`, eventType: "shipment_delivered", fromStatus: lockedOrder.status, toStatus: lockedOrder.status, source: "user", operator: String(user.id), remark: `用户确认包裹 ${shipment.shipmentNo} 收货`, detail: { shipmentId: shipment.id, shipmentNo: shipment.shipmentNo, expressCompany: shipment.expressCompany, expressNo: shipment.expressNo }, occurredAt: shipment.deliveredAt });
      }
      if (shipment.shipmentType === "exchange" && shipment.refund) {
        shipment.refund.status = "approved";
        shipment.refund.completedAt = shipment.deliveredAt || new Date();
        shipment.refund.responseDeadlineAt = null;
        await manager.getRepository(MallRefund).save(shipment.refund);
        await this.createMallRefundMessage(shipment.refund, "user", user.phone || user.nickname || String(user.id), { content: "换货商品已确认收货，售后完成", images: [] }, "status", { shipmentId: shipment.id }, manager);
        return lockedOrder;
      }
      const activeShipments = await shipmentRepo.find({ where: { order: { id: lockedOrder.id }, status: In(["shipped", "delivered"]), shipmentType: "order" }, loadEagerRelations: false });
      const fulfillment = resolveMallFulfillmentState({ totalQuantity: lockedOrder.totalQuantity, shippedQuantity: lockedOrder.shippedQuantity, activeShipmentCount: activeShipments.length, deliveredShipmentCount: activeShipments.filter((row) => row.status === "delivered").length });
      if (fulfillment.fullyReceived && lockedOrder.status === "shipped") {
        lockedOrder.status = "completed";
        lockedOrder.fulfillmentStatus = "received";
        lockedOrder.completedAt = new Date();
        await orderRepo.save(lockedOrder);
        await this.recordMallOrderEvent(manager, lockedOrder, { eventKey: "completed:all_shipments", eventType: "order_completed", fromStatus: "shipped", toStatus: "completed", source: "user", operator: String(user.id), remark: "全部包裹已确认收货", detail: { shipmentIds: activeShipments.map((row) => row.id) }, occurredAt: lockedOrder.completedAt });
      }
      return lockedOrder;
    });
    await this.refreshCheckoutGroupStatusForOrder(order);
    return this.publicUserOrderWithItems(order, user);
  }

  async requestRefund(id: number, user: User, dto: MallRefundRequestDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const images = Array.isArray(dto.images) ? dto.images.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [];
    const result = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(MallOrder);
      const refundRepo = manager.getRepository(MallRefund);
      const refundItemRepo = manager.getRepository(MallRefundItem);
      const messageRepo = manager.getRepository(MallRefundMessage);
      const order = await orderRepo.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
      if (!order) throw new NotFoundException("商城订单不存在");
      if (!["paid", "shipped", "completed"].includes(order.status)) throw new BadRequestException("当前订单不能申请售后");
      const businessKey = this.optionalString(dto.businessKey);
      if (businessKey) {
        const replay = await refundRepo.findOne({ where: { order: { id: order.id }, businessKey } });
        if (replay) return { refund: replay, order };
      }
      const orderItems = await manager.getRepository(MallOrderItem).find({ where: { order: { id: order.id } }, relations: ["product", "sku", "flashSale", "groupBuy"], loadEagerRelations: false });
      const requested = dto.items?.length ? dto.items : orderItems.map((item) => ({ orderItemId: item.id, quantity: item.quantity }));
      const requestedIds = Array.from(new Set(requested.map((item) => Number(item.orderItemId || 0)).filter(Boolean)));
      if (!requestedIds.length || requestedIds.length !== requested.length) throw new BadRequestException("售后商品明细不正确");
      const itemMap = new Map(orderItems.map((item) => [item.id, item]));
      const requestMap = new Map(requested.map((item) => [Number(item.orderItemId), Number(item.quantity || 0)]));
      if (requestedIds.some((itemId) => !itemMap.has(itemId))) throw new BadRequestException("售后商品不属于当前订单");
      const occupiedRows = await refundItemRepo.createQueryBuilder("refundItem")
        .leftJoin("refundItem.refund", "refund")
        .select("refundItem.orderItemId", "orderItemId")
        .addSelect("COALESCE(SUM(refundItem.requestedQuantity), 0)", "quantity")
        .where("refundItem.orderId = :orderId", { orderId: order.id })
        .andWhere("refund.status NOT IN (:...statuses)", { statuses: ["rejected", "cancelled"] })
        .groupBy("refundItem.orderItemId")
        .getRawMany<{ orderItemId: string; quantity: string }>();
      const occupied = new Map(occupiedRows.map((row) => [Number(row.orderItemId), Number(row.quantity || 0)]));
      let allocation;
      try {
        allocation = allocateMallAfterSaleAmount(order.amount, orderItems.map((item) => ({ orderItemId: item.id, quantity: item.quantity, requestedQuantity: requestMap.get(item.id) || 0, occupiedQuantity: occupied.get(item.id) || 0, lineAmount: item.totalAmount })));
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : "售后商品金额计算失败");
      }
      const reservedRow = await refundRepo.createQueryBuilder("refund").select("COALESCE(SUM(refund.amountFen), 0)", "sum").where("refund.orderId = :orderId", { orderId: order.id }).andWhere("refund.status NOT IN (:...statuses)", { statuses: ["rejected", "cancelled"] }).getRawOne<{ sum: string }>();
      const type = dto.type || "refund_only";
      const requestedAmount = type === "exchange" ? 0 : dto.amount ?? allocation.refundableFen / 100;
      const amountFen = type === "exchange" ? 0 : assertRefundCapacity(order.amount, reservedRow?.sum, requestedAmount).requestFen;
      if (type !== "exchange" && amountFen > allocation.refundableFen) throw new BadRequestException("退款金额不能超过所选商品可退金额");
      const refund = await refundRepo.save(refundRepo.create({ refundNo: this.generateRefundNo(), tenant, merchant: order.merchant || null, user, order, type, amount: (amountFen / 100).toFixed(2), status: "pending", reason: this.optionalString(dto.reason), images, businessKey, responsibility: "undetermined", platformInterventionRequested: false, responseDeadlineAt: new Date(Date.now() + 48 * 60 * MINUTE_MS), businessSnapshot: { orderNo: order.orderNo, orderAmount: order.amount, paymentMethod: order.paymentMethod, type, amountFen, allocation } }));
      await refundItemRepo.save(allocation.allocations.map((row) => {
        const item = itemMap.get(row.orderItemId)!;
        return refundItemRepo.create({ tenant, refund, order, orderItem: item, requestedQuantity: row.quantity, approvedQuantity: 0, receivedQuantity: 0, stockRestoredQuantity: 0, refundableAmountFen: row.refundableFen, refundedAmountFen: 0, itemSnapshot: { orderItemId: item.id, productId: item.product.id, skuId: item.sku.id, productTitle: item.productTitle, skuName: item.skuName, coverUrl: item.coverUrl, price: item.price, quantity: item.quantity, requestedQuantity: row.quantity, totalAmount: item.totalAmount } });
      }));
      await messageRepo.save(messageRepo.create({ tenant, refund, actorType: "user", actorName: user.phone || user.nickname || String(user.id), messageType: images.length ? "evidence" : "message", content: this.optionalString(dto.reason) || "用户提交售后申请", images, detail: { type, amountFen } }));
      return { refund, order };
    });
    const { refund: saved, order } = result;
    await this.refreshCheckoutGroupStatusForOrder(order);
    return this.publicUserRefundDetails(saved, order.paymentMethod);
  }

  async addUserRefundMessage(id: number, user: User, dto: MallRefundMessageDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const refund = await this.refunds.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!refund) throw new NotFoundException("售后单不存在");
    if (["approved", "rejected", "cancelled"].includes(refund.status)) throw new BadRequestException("当前售后单已结束，不能补充材料");
    await this.createMallRefundMessage(refund, "user", user.phone || user.nickname || String(user.id), dto, dto.images?.length ? "evidence" : "message");
    return this.publicUserRefundDetails(refund, refund.order.paymentMethod);
  }

  async submitRefundReturn(id: number, user: User, dto: MallRefundReturnShipmentDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const refund = await this.refunds.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertMallAfterSaleAction(refund.status, "submit_return");
    refund.returnExpressCompany = this.optionalString(dto.expressCompany);
    refund.returnExpressNo = this.requiredString(dto.expressNo, "退货物流单号");
    refund.returnRemark = this.optionalString(dto.remark);
    refund.returnedAt = new Date();
    refund.status = "returning";
    refund.responseDeadlineAt = new Date(Date.now() + 15 * 24 * 60 * MINUTE_MS);
    await this.refunds.save(refund);
    await this.createMallRefundMessage(refund, "user", user.phone || user.nickname || String(user.id), { content: `买家已寄回：${refund.returnExpressCompany || "快递"} ${refund.returnExpressNo}`, images: [] }, "status", { expressCompany: refund.returnExpressCompany, expressNo: refund.returnExpressNo });
    return this.publicUserRefundDetails(refund, refund.order.paymentMethod);
  }

  async requestRefundIntervention(id: number, user: User, dto: MallRefundMessageDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const refund = await this.refunds.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertMallAfterSaleAction(refund.status, "request_intervention");
    refund.platformInterventionRequested = true;
    refund.status = "platform_intervening";
    refund.interventionAt = new Date();
    await this.refunds.save(refund);
    await this.createMallRefundMessage(refund, "user", user.phone || user.nickname || String(user.id), dto, "intervention");
    return this.publicUserRefundDetails(refund, refund.order.paymentMethod);
  }

  async cancelRefund(id: number, user: User, dto: MallRefundMessageDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const refund = await this.refunds.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertMallAfterSaleAction(refund.status, "cancel");
    refund.status = "cancelled";
    await this.refunds.save(refund);
    await this.createMallRefundMessage(refund, "user", user.phone || user.nickname || String(user.id), dto, "status");
    return this.publicUserRefundDetails(refund, refund.order.paymentMethod);
  }

  async createReview(user: User, dto: MallReviewDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const orderItem = await this.orderItems.findOne({
      where: { id: Number(dto.orderItemId), tenant: { id: tenant.id } },
      relations: ["merchant", "order", "order.user", "order.merchant", "product", "product.merchant", "sku"],
      loadEagerRelations: false
    });
    if (!orderItem || orderItem.order.user.id !== user.id) throw new NotFoundException("商城订单商品不存在");
    if (orderItem.order.status !== "completed") throw new BadRequestException("确认收货后才能评价");
    const exists = await this.reviews.findOne({ where: { orderItem: { id: orderItem.id }, user: { id: user.id } }, loadEagerRelations: false });
    if (exists) throw new BadRequestException("该商品已评价，请勿重复提交");
    const merchant = orderItem.merchant || orderItem.order?.merchant || orderItem.product?.merchant || await this.ensureDefaultMerchant(tenant);
    const rating = Math.min(Math.max(Math.trunc(Number(dto.rating || 5)), 1), 5);
    const content = this.requiredString(dto.content, "评价内容").slice(0, 500);
    const images = Array.isArray(dto.images) ? dto.images.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [];
    const saved = await saveWithUniqueReplay(
      () => this.reviews.save(this.reviews.create({ tenant, merchant, user, order: orderItem.order, orderItem, product: orderItem.product, sku: orderItem.sku, rating, content, images, status: "pending" })),
      () => this.reviews.findOne({ where: { orderItem: { id: orderItem.id }, user: { id: user.id } } })
    );
    return this.publicUserReview(saved);
  }

  async appendReview(id: number, user: User, dto: MallReviewAppendDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    return this.dataSource.transaction(async (manager) => {
      const reviewRepo = manager.getRepository(MallReview);
      const review = await reviewRepo.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } }, relations: ["tenant", "merchant", "user", "product", "sku", "orderItem"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!review) throw new NotFoundException("商城评价不存在");
      const appendError = mallAppendReviewError({ reviewStatus: review.status, appendedAt: review.appendedAt, createdAt: review.createdAt });
      if (appendError) throw new BadRequestException(appendError);
      review.appendContent = this.requiredString(dto.content, "追评内容").slice(0, 500);
      review.appendImages = Array.isArray(dto.images) ? dto.images.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [];
      review.appendedAt = new Date();
      review.appendStatus = "pending";
      review.appendReviewRemark = null;
      review.appendReviewedBy = null;
      review.appendReviewedAt = null;
      return this.publicUserReview(await reviewRepo.save(review));
    });
  }

  async reportReview(id: number, user: User, dto: MallReviewReportDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    return this.dataSource.transaction(async (manager) => {
      const reviewRepo = manager.getRepository(MallReview);
      const reportRepo = manager.getRepository(MallReviewReport);
      const review = await reviewRepo.findOne({ where: { id, tenant: { id: tenant.id }, status: "approved" }, relations: ["tenant", "merchant", "user", "product", "sku", "orderItem"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!review) throw new NotFoundException("评价不存在或已隐藏");
      if (review.user.id === user.id) throw new BadRequestException("不能举报自己的评价");
      const exists = await reportRepo.findOne({ where: { review: { id: review.id }, user: { id: user.id } }, relations: ["tenant", "review", "user"], loadEagerRelations: false });
      if (exists) return this.publicMallReviewReport(exists);
      const saved = await reportRepo.save(reportRepo.create({ tenant, review, user, reason: this.requiredString(dto.reason, "举报原因").slice(0, 255), images: Array.isArray(dto.images) ? dto.images.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [], status: "pending", resolution: null, reviewedBy: null, reviewedAt: null }));
      review.reportCount = Number(review.reportCount || 0) + 1;
      await reviewRepo.save(review);
      return this.publicMallReviewReport(saved);
    });
  }

  async adminReviewReports(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, ["review.manage", "merchant.manage"]);
    const builder = this.reviewReports.createQueryBuilder("report").leftJoinAndSelect("report.tenant", "tenant").leftJoinAndSelect("report.review", "review").leftJoinAndSelect("review.merchant", "merchant").leftJoinAndSelect("review.product", "product").leftJoinAndSelect("report.user", "user").orderBy("report.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "report", tenant);
    if (merchant) builder.andWhere("merchant.id = :merchantId", { merchantId: merchant.id });
    if (query.status) builder.andWhere("report.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(report.reason LIKE :keyword OR product.title LIKE :keyword OR user.phone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(200).getMany();
  }

  async adminPromotionRiskEvents(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, false, "marketing.manage");
    const builder = this.promotionRiskEvents.createQueryBuilder("event")
      .leftJoinAndSelect("event.tenant", "tenant")
      .leftJoinAndSelect("event.merchant", "merchant")
      .leftJoinAndSelect("event.user", "user")
      .orderBy("event.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "event", tenant);
    if (merchant) this.applyMerchantFilter(builder, "event", merchant);
    if (["allowed", "review", "blocked"].includes(String(query.status || ""))) builder.andWhere("event.outcome = :outcome", { outcome: query.status });
    if (query.startDate) builder.andWhere("event.createdAt >= :startDate", { startDate: new Date(query.startDate) });
    if (query.endDate) builder.andWhere("event.createdAt <= :endDate", { endDate: new Date(query.endDate) });
    if (query.keyword?.trim()) builder.andWhere("(event.clientOrderKey LIKE :keyword OR event.requestId LIKE :keyword OR event.reason LIKE :keyword OR user.phone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const rows = await builder.take(300).getMany();
    return rows.map((row) => ({
      id: row.id,
      tenant: this.publicTenantSummary(row.tenant),
      merchant: this.publicMerchantSummary(row.merchant),
      user: row.user ? { id: row.user.id, phone: row.user.phone, nickname: row.user.nickname } : null,
      action: row.action,
      promotionType: row.promotionType,
      promotionId: row.promotionId,
      requestId: row.requestId,
      clientOrderKey: row.clientOrderKey,
      outcome: row.outcome,
      ruleCode: row.ruleCode,
      severity: row.severity,
      reason: row.reason,
      deviceFingerprint: row.deviceHash?.slice(0, 12) || null,
      ipFingerprint: row.ipHash?.slice(0, 12) || null,
      detail: row.detail,
      createdAt: row.createdAt
    }));
  }

  async adminPromotionRiskAlerts(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, false, "marketing.manage");
    const builder = this.promotionRiskAlerts.createQueryBuilder("alert")
      .leftJoinAndSelect("alert.tenant", "tenant")
      .leftJoinAndSelect("alert.merchant", "merchant")
      .orderBy("alert.lastDetectedAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "alert", tenant);
    if (merchant) this.applyMerchantFilter(builder, "alert", merchant);
    if (["open", "resolved", "ignored"].includes(String(query.status || ""))) builder.andWhere("alert.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(alert.ruleCode LIKE :keyword OR alert.title LIKE :keyword OR alert.message LIKE :keyword OR alert.subjectId LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(200).getMany();
  }

  async reviewPromotionRiskAlert(id: number, dto: { status?: string; remark?: string }, admin?: AdminContext) {
    const row = await this.promotionRiskAlerts.findOne({ where: { id } });
    if (!row) throw new NotFoundException("营销风险告警不存在");
    this.assertAdminTenantAccess(row, admin);
    if (row.merchant) await this.assertAdminMerchantAccess(row.merchant, admin, "marketing.manage");
    else await this.assertTenantWideMallPermission(admin, "marketing.manage", "租户级营销风险告警");
    const status = String(dto.status || "");
    if (!["open", "resolved", "ignored"].includes(status)) throw new BadRequestException("风险告警状态不正确");
    row.status = status as MallPromotionRiskAlert["status"];
    row.resolutionRemark = this.optionalString(dto.remark)?.slice(0, 1000) || null;
    if (status === "open") {
      row.resolvedByAdminId = null;
      row.resolvedBy = null;
      row.resolvedAt = null;
    } else {
      row.resolvedByAdminId = admin?.id || null;
      row.resolvedBy = admin?.username?.slice(0, 100) || null;
      row.resolvedAt = new Date();
    }
    const saved = await this.promotionRiskAlerts.save(row);
    await this.logOperation(admin, "mall.promotion_risk_alert.review", "mall_promotion_risk_alert", saved.id, `处理营销风险告警：${saved.title} -> ${saved.status}`, saved.tenant.id);
    return saved;
  }

  async reviewReviewReport(id: number, dto: MallReviewReportReviewDto, admin?: AdminContext) {
    const report = await this.reviewReports.findOne({ where: { id }, relations: ["tenant", "user", "review", "review.merchant", "review.order", "review.order.merchant"], loadEagerRelations: false });
    if (!report) throw new NotFoundException("评价举报不存在");
    this.assertAdminTenantAccess(report, admin);
    const merchant = report.review.merchant || report.review.order?.merchant || await this.ensureDefaultMerchant(report.tenant);
    await this.assertAdminMerchantAccess(merchant, admin, ["review.manage", "merchant.manage"]);
    if (report.status !== "pending") throw new BadRequestException("该举报已处理");
    report.status = dto.status;
    report.resolution = this.requiredString(dto.resolution, "处理结论").slice(0, 255);
    report.reviewedBy = admin?.username || "system";
    report.reviewedAt = new Date();
    if (dto.hideReview && dto.status === "resolved") {
      report.review.status = "hidden";
      report.review.hiddenAt = new Date();
      report.review.hiddenReason = report.resolution;
      await this.reviews.save(report.review);
    }
    const saved = await this.reviewReports.save(report);
    await this.logOperation(admin, "mall.review_report.review", "mall_review_report", saved.id, `处理商城评价举报：${saved.status}`, saved.tenant.id);
    return saved;
  }

  async adminReviews(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, ["review.manage", "merchant.manage"]);
    const builder = this.reviews.createQueryBuilder("review")
      .leftJoinAndSelect("review.tenant", "tenant")
      .leftJoinAndSelect("review.merchant", "merchant")
      .leftJoinAndSelect("review.user", "user")
      .leftJoinAndSelect("review.order", "order")
      .leftJoinAndSelect("review.product", "product")
      .leftJoinAndSelect("review.sku", "sku")
      .orderBy("review.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "review", tenant);
    if (merchant) this.applyMerchantFilter(builder, "review", merchant);
    if (query.status === "pending") builder.andWhere("(review.status = :pendingStatus OR review.appendStatus = :pendingStatus)", { pendingStatus: "pending" });
    else if (query.status === "review_pending") builder.andWhere("review.status = :pendingStatus", { pendingStatus: "pending" });
    else if (query.status === "append_pending") builder.andWhere("review.appendStatus = :pendingStatus", { pendingStatus: "pending" });
    else if (query.status) builder.andWhere("review.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR review.content LIKE :keyword OR review.appendContent LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const rows = await builder.take(100).getMany();
    return rows;
  }

  async moderateReview(id: number, dto: MallReviewModerationDto, admin?: AdminContext) {
    const review = await this.reviews.findOne({
      where: { id },
      relations: ["tenant", "merchant", "order", "order.merchant", "orderItem", "orderItem.merchant", "product", "product.merchant", "sku"],
      loadEagerRelations: false
    });
    if (!review) throw new NotFoundException("商城评价不存在");
    this.assertAdminTenantAccess(review, admin);
    const merchant = review.merchant || review.order?.merchant || review.orderItem?.merchant || review.product?.merchant || await this.ensureDefaultMerchant(review.tenant);
    await this.assertAdminMerchantAccess(merchant, admin, ["review.manage", "merchant.manage"]);
    const nextStatus = dto.status === "approved" ? "approved" : dto.status === "rejected" ? "rejected" : dto.status === "hidden" ? "hidden" : null;
    if (!nextStatus) throw new BadRequestException("评价审核状态不正确");
    review.merchant = review.merchant || merchant;
    if (dto.target === "append") {
      if (!review.appendContent || !review.appendedAt) throw new BadRequestException("该评价尚未提交追评");
      if (nextStatus === "hidden") throw new BadRequestException("追评仅支持通过或拒绝；隐藏首评会同时停止展示追评");
      review.appendStatus = nextStatus;
      review.appendReviewRemark = this.optionalString(dto.reviewRemark);
      review.appendReviewedBy = admin?.username || "system";
      review.appendReviewedAt = new Date();
      const saved = await this.reviews.save(review);
      await this.logOperation(admin, "mall.review.append.moderate", "mall_review", saved.id, `审核商城追评：${saved.appendStatus}`, saved.tenant.id);
      return saved;
    }
    review.status = nextStatus as MallReviewStatus;
    review.reviewRemark = this.optionalString(dto.reviewRemark);
    const merchantReply = this.optionalString(dto.merchantReply);
    review.merchantReply = merchantReply ? merchantReply.slice(0, 500) : null;
    review.repliedBy = merchantReply ? admin?.username || "system" : null;
    review.repliedAt = merchantReply ? new Date() : null;
    review.reviewedBy = admin?.username || "system";
    review.reviewedAt = new Date();
    review.hiddenAt = nextStatus === "hidden" ? new Date() : null;
    review.hiddenReason = nextStatus === "hidden" ? review.reviewRemark || "后台隐藏评价" : null;
    const saved = await this.reviews.save(review);
    await this.logOperation(admin, "mall.review.moderate", "mall_review", saved.id, `审核商城评价：${saved.status}`, saved.tenant.id);
    return saved;
  }

  async adminOrders(query: MallListQueryDto, admin?: AdminContext) {
    const { items, total, page, pageSize } = await this.adminOrderRows(query, admin);
    return { items: await Promise.all(items.map((order) => this.publicOrderWithItems(order, undefined, false))), total, page, pageSize };
  }

  async adminOrderLogistics(id: number, admin?: AdminContext) {
    const order = await this.findAdminOrder(id, admin, ["shipment.view", "shipment.manage"]);
    return this.mallOrderLogistics(order);
  }

  async adminOrderDetail(id: number, admin?: AdminContext) {
    const order = await this.findAdminOrder(id, admin, "order.view");
    return this.publicOrderWithItems(order, undefined, true);
  }

  async adminOrderSummary(query: MallListQueryDto, admin?: AdminContext) {
    const builder = await this.adminOrderBaseQuery(query, admin);
    const rows = await builder.select("order.status", "status").addSelect("COUNT(order.id)", "count").addSelect("COALESCE(SUM(order.amount), 0)", "amount").groupBy("order.status").getRawMany<{ status: MallOrderStatus; count: string; amount: string }>();
    const refundBuilder = this.refunds.createQueryBuilder("refund").leftJoin("refund.tenant", "tenant").leftJoin("refund.merchant", "merchant").leftJoin("refund.order", "order").leftJoin("order.checkoutGroup", "checkoutGroup").leftJoin("order.user", "user");
    const { tenant, merchant: refundMerchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    if (tenant) this.applyTenantFilter(refundBuilder, "refund", tenant);
    if (refundMerchant) this.applyMerchantFilter(refundBuilder, "refund", refundMerchant);
    if (query.status) refundBuilder.andWhere("order.status = :status", { status: query.status });
    if (query.paymentMethod) refundBuilder.andWhere("order.paymentMethod = :paymentMethod", { paymentMethod: query.paymentMethod });
    if (query.refundStatus && query.refundStatus !== "none") refundBuilder.andWhere("refund.status = :refundStatus", { refundStatus: query.refundStatus });
    if (query.refundStatus === "none") refundBuilder.andWhere("1 = 0");
    this.applyDateRangeFilter(refundBuilder, "order", query);
    if (query.keyword?.trim()) refundBuilder.andWhere("(order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    if (query.checkoutGroupNo?.trim()) refundBuilder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    const refundRows = await refundBuilder.select("refund.status", "status").addSelect("COUNT(refund.id)", "count").addSelect("COALESCE(SUM(refund.amount), 0)", "amount").groupBy("refund.status").getRawMany<{ status: string; count: string; amount: string }>();
    const methodRows = await (await this.adminOrderBaseQuery({ ...query, status: undefined }, admin))
      .andWhere("order.status IN (:...receivedStatuses)", { receivedStatuses: ["paid", "shipped", "completed", "refund_pending", "refunded"] })
      .select("order.paymentMethod", "paymentMethod")
      .addSelect("COUNT(order.id)", "count")
      .addSelect("COALESCE(SUM(order.amount), 0)", "amount")
      .groupBy("order.paymentMethod")
      .getRawMany<{ paymentMethod: PaymentMethod; count: string; amount: string }>();
    const statusMap = Object.fromEntries(rows.map((row) => [row.status, { count: Number(row.count || 0), amount: Number(row.amount || 0) }])) as Record<string, { count: number; amount: number }>;
    const refundMap = Object.fromEntries(refundRows.map((row) => [row.status, { count: Number(row.count || 0), amount: Number(row.amount || 0) }])) as Record<string, { count: number; amount: number }>;
    const methodMap = Object.fromEntries(methodRows.map((row) => [row.paymentMethod, { count: Number(row.count || 0), amount: Number(row.amount || 0) }])) as Record<string, { count: number; amount: number }>;
    const sumStatuses = (statuses: MallOrderStatus[], field: "count" | "amount") => statuses.reduce((sum, status) => sum + Number(statusMap[status]?.[field] || 0), 0);
    const receivedAmount = sumStatuses(["paid", "shipped", "completed", "refund_pending", "refunded"], "amount");
    const approvedRefundAmount = Number(refundMap.approved?.amount || 0);
    return {
      orderCount: rows.reduce((sum, row) => sum + Number(row.count || 0), 0),
      pendingPaymentCount: sumStatuses(["pending_payment"], "count"),
      pendingConfirmCount: sumStatuses(["pending_confirm"], "count"),
      pendingAmount: sumStatuses(["pending_payment", "pending_confirm"], "amount").toFixed(2),
      paidCount: sumStatuses(["paid", "shipped", "completed", "refund_pending"], "count"),
      paidAmount: sumStatuses(["paid", "shipped", "completed", "refund_pending"], "amount").toFixed(2),
      receivedAmount: receivedAmount.toFixed(2),
      netReceivedAmount: Math.max(receivedAmount - approvedRefundAmount, 0).toFixed(2),
      wechatReceivedAmount: Number(methodMap[PaymentMethod.Wechat]?.amount || 0).toFixed(2),
      balanceReceivedAmount: Number(methodMap[PaymentMethod.Balance]?.amount || 0).toFixed(2),
      offlineReceivedAmount: Number(methodMap[PaymentMethod.Offline]?.amount || 0).toFixed(2),
      shippedCount: sumStatuses(["shipped"], "count"),
      completedCount: sumStatuses(["completed"], "count"),
      closedCount: sumStatuses(["closed"], "count"),
      refundedCount: sumStatuses(["refunded"], "count"),
      pendingRefundCount: Number(refundMap.pending?.count || 0),
      processingRefundCount: Number(refundMap.processing?.count || 0),
      failedRefundCount: Number(refundMap.failed?.count || 0),
      approvedRefundAmount: approvedRefundAmount.toFixed(2),
      byPaymentMethod: methodMap,
      byStatus: statusMap
    };
  }

  async adminAnalytics(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const receivedStatuses: MallOrderStatus[] = ["paid", "shipped", "completed", "refund_pending", "refunded"];
    const orderBase = () => {
      const builder = this.orders.createQueryBuilder("order").leftJoin("order.tenant", "tenant").leftJoin("order.merchant", "merchant").where("order.createdAt >= :since", { since });
      if (tenant) this.applyTenantFilter(builder, "order", tenant);
      if (merchant) this.applyMerchantFilter(builder, "order", merchant);
      return builder;
    };
    const refundBase = () => {
      const builder = this.refunds.createQueryBuilder("refund").leftJoin("refund.tenant", "tenant").leftJoin("refund.merchant", "merchant").where("refund.createdAt >= :since", { since });
      if (tenant) this.applyTenantFilter(builder, "refund", tenant);
      if (merchant) this.applyMerchantFilter(builder, "refund", merchant);
      return builder;
    };
    const [trendRows, paymentRows, statusRows, refundRows, productRows, couponUsageRows, couponClaimRows] = await Promise.all([
      orderBase()
        .andWhere("order.status IN (:...statuses)", { statuses: receivedStatuses })
        .select("DATE_FORMAT(order.createdAt, '%Y-%m-%d')", "date")
        .addSelect("COUNT(order.id)", "orderCount")
        .addSelect("COALESCE(SUM(order.amount), 0)", "receivedAmount")
        .addSelect("COALESCE(SUM(order.discountAmount), 0)", "discountAmount")
        .groupBy("date")
        .orderBy("date", "ASC")
        .getRawMany<{ date: string; orderCount: string; receivedAmount: string; discountAmount: string }>(),
      orderBase()
        .andWhere("order.status IN (:...statuses)", { statuses: receivedStatuses })
        .select("order.paymentMethod", "paymentMethod")
        .addSelect("COUNT(order.id)", "orderCount")
        .addSelect("COALESCE(SUM(order.amount), 0)", "amount")
        .groupBy("order.paymentMethod")
        .getRawMany<{ paymentMethod: string; orderCount: string; amount: string }>(),
      orderBase()
        .select("order.status", "status")
        .addSelect("COUNT(order.id)", "orderCount")
        .addSelect("COALESCE(SUM(order.amount), 0)", "amount")
        .groupBy("order.status")
        .getRawMany<{ status: string; orderCount: string; amount: string }>(),
      refundBase()
        .select("refund.status", "status")
        .addSelect("COUNT(refund.id)", "refundCount")
        .addSelect("COALESCE(SUM(refund.amount), 0)", "amount")
        .groupBy("refund.status")
        .getRawMany<{ status: string; refundCount: string; amount: string }>(),
      this.orderItems.createQueryBuilder("item")
        .leftJoin("item.order", "order")
        .leftJoin("item.tenant", "tenant")
        .where("order.createdAt >= :since", { since })
        .andWhere("order.status IN (:...statuses)", { statuses: receivedStatuses })
        .andWhere(tenant ? "item.tenantId = :tenantId" : "1=1", tenant ? { tenantId: tenant.id } : {})
        .andWhere(merchant ? "item.merchantId = :merchantId" : "1=1", merchant ? { merchantId: merchant.id } : {})
        .select("item.productId", "productId")
        .addSelect("item.productTitle", "productTitle")
        .addSelect("COALESCE(SUM(item.quantity), 0)", "quantity")
        .addSelect("COALESCE(SUM(item.totalAmount), 0)", "grossAmount")
        .groupBy("item.productId")
        .addGroupBy("item.productTitle")
        .orderBy("quantity", "DESC")
        .limit(10)
        .getRawMany<{ productId: string; productTitle: string; quantity: string; grossAmount: string }>(),
      this.couponUsages.createQueryBuilder("usage")
        .leftJoin("usage.tenant", "tenant")
        .where("usage.createdAt >= :since", { since })
        .andWhere(tenant ? "usage.tenantId = :tenantId" : "1=1", tenant ? { tenantId: tenant.id } : {})
        .andWhere(merchant ? "usage.merchantId = :merchantId" : "1=1", merchant ? { merchantId: merchant.id } : {})
        .select("usage.code", "code")
        .addSelect("usage.status", "status")
        .addSelect("COUNT(usage.id)", "count")
        .addSelect("COALESCE(SUM(usage.discountAmount), 0)", "discountAmount")
        .groupBy("usage.code")
        .addGroupBy("usage.status")
        .getRawMany<{ code: string; status: string; count: string; discountAmount: string }>(),
      this.couponClaims.createQueryBuilder("claim")
        .leftJoin("claim.tenant", "tenant")
        .leftJoin("claim.coupon", "coupon")
        .where("claim.createdAt >= :since", { since })
        .andWhere(tenant ? "claim.tenantId = :tenantId" : "1=1", tenant ? { tenantId: tenant.id } : {})
        .andWhere(merchant ? "claim.merchantId = :merchantId" : "1=1", merchant ? { merchantId: merchant.id } : {})
        .select("coupon.code", "code")
        .addSelect("coupon.name", "name")
        .addSelect("COUNT(claim.id)", "claimUsers")
        .addSelect("COALESCE(SUM(claim.claimedCount), 0)", "claimedCount")
        .addSelect("COALESCE(SUM(claim.usedCount), 0)", "usedCount")
        .groupBy("coupon.code")
        .addGroupBy("coupon.name")
        .getRawMany<{ code: string; name: string; claimUsers: string; claimedCount: string; usedCount: string }>()
    ]);
    const receivedAmount = trendRows.reduce((sum, row) => sum + Number(row.receivedAmount || 0), 0);
    const discountAmount = trendRows.reduce((sum, row) => sum + Number(row.discountAmount || 0), 0);
    const approvedRefundAmount = refundRows.filter((row) => row.status === "approved").reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const couponMap = new Map<string, any>();
    for (const row of couponClaimRows) {
      couponMap.set(row.code, { code: row.code, name: row.name, claimUsers: Number(row.claimUsers || 0), claimedCount: Number(row.claimedCount || 0), usedCount: Number(row.usedCount || 0), releasedCount: 0, discountAmount: "0.00" });
    }
    for (const row of couponUsageRows) {
      const current = couponMap.get(row.code) || { code: row.code, name: row.code, claimUsers: 0, claimedCount: 0, usedCount: 0, releasedCount: 0, discountAmount: "0.00" };
      if (row.status === "used") current.usedCount = Math.max(Number(current.usedCount || 0), Number(row.count || 0));
      if (row.status === "released") current.releasedCount = Number(row.count || 0);
      current.discountAmount = (Number(current.discountAmount || 0) + Number(row.discountAmount || 0)).toFixed(2);
      couponMap.set(row.code, current);
    }
    const couponStats = [...couponMap.values()].map((row) => ({ ...row, useRate: Number(row.claimedCount || 0) > 0 ? `${((Number(row.usedCount || 0) / Number(row.claimedCount || 0)) * 100).toFixed(1)}%` : "-" })).sort((a, b) => Number(b.usedCount || 0) - Number(a.usedCount || 0)).slice(0, 10);
    return {
      range: { since, days: 30 },
      summary: {
        orderCount: trendRows.reduce((sum, row) => sum + Number(row.orderCount || 0), 0),
        receivedAmount: receivedAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        approvedRefundAmount: approvedRefundAmount.toFixed(2),
        netReceivedAmount: Math.max(receivedAmount - approvedRefundAmount, 0).toFixed(2)
      },
      trend: trendRows.map((row) => ({ date: row.date, orderCount: Number(row.orderCount || 0), receivedAmount: Number(row.receivedAmount || 0).toFixed(2), discountAmount: Number(row.discountAmount || 0).toFixed(2) })),
      byPaymentMethod: paymentRows.map((row) => ({ paymentMethod: row.paymentMethod, orderCount: Number(row.orderCount || 0), amount: Number(row.amount || 0).toFixed(2) })),
      byStatus: statusRows.map((row) => ({ status: row.status, orderCount: Number(row.orderCount || 0), amount: Number(row.amount || 0).toFixed(2) })),
      refunds: refundRows.map((row) => ({ status: row.status, refundCount: Number(row.refundCount || 0), amount: Number(row.amount || 0).toFixed(2) })),
      topProducts: productRows.map((row) => ({ productId: Number(row.productId), productTitle: row.productTitle, quantity: Number(row.quantity || 0), grossAmount: Number(row.grossAmount || 0).toFixed(2) })),
      couponStats
    };
  }

  async adminPaymentTransactions(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "finance.view");
    const builder = this.paymentTransactions.createQueryBuilder("tx")
      .leftJoinAndSelect("tx.tenant", "tenant")
      .leftJoinAndSelect("tx.merchant", "merchant")
      .leftJoinAndSelect("tx.order", "order")
      .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
      .leftJoinAndSelect("order.user", "user")
      .orderBy("tx.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "tx", tenant);
    if (merchant) this.applyMerchantFilter(builder, "tx", merchant);
    if (query.status) builder.andWhere("tx.status = :status", { status: query.status });
    if (query.paymentMethod) builder.andWhere("tx.paymentMethod = :paymentMethod", { paymentMethod: query.paymentMethod });
    this.applyDateRangeFilter(builder, "tx", query);
    if (query.keyword?.trim()) {
      builder.andWhere("(tx.transactionNo LIKE :keyword OR tx.provider LIKE :keyword OR tx.remark LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.checkoutGroupNo?.trim()) builder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    return builder.take(100).getMany();
  }

  async exportAdminPaymentTransactions(query: MallListQueryDto, admin?: AdminContext) {
    const rows = await this.adminPaymentTransactions(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商城支付流水");
    sheet.columns = [
      { header: "订单号", key: "orderNo", width: 28 },
      { header: "结算组号", key: "checkoutGroupNo", width: 24 },
      { header: "交易号", key: "transactionNo", width: 30 },
      { header: "商家", key: "tenant", width: 22 },
      { header: "商家编码", key: "tenantCode", width: 18 },
      { header: "用户手机", key: "phone", width: 16 },
      { header: "支付渠道", key: "paymentMethod", width: 14 },
      { header: "Provider", key: "provider", width: 14 },
      { header: "金额", key: "amount", width: 12 },
      { header: "流水状态", key: "status", width: 12 },
      { header: "对账状态", key: "reconciliationStatus", width: 14 },
      { header: "差异类型", key: "discrepancyType", width: 18 },
      { header: "说明", key: "remark", width: 36 },
      { header: "创建时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) => {
      sheet.addRow({
        orderNo: row.order?.orderNo || "",
        checkoutGroupNo: row.order?.checkoutGroup?.groupNo || "",
        transactionNo: row.transactionNo,
        tenant: row.tenant?.name || row.tenant?.code || row.order?.tenant?.name || "-",
        tenantCode: row.tenant?.code || row.order?.tenant?.code || "",
        phone: row.order?.user?.phone || row.order?.user?.nickname || "-",
        paymentMethod: this.paymentMethodText(row.paymentMethod || row.provider),
        provider: row.provider,
        amount: row.amount,
        status: this.mallPaymentTransactionStatusText(row.status),
        reconciliationStatus: row.reconciliationStatus || "",
        discrepancyType: row.discrepancyType || "",
        remark: row.remark || "",
        createdAt: row.createdAt
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async adminCommissionRules(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId && !query.tenantId);
    const builder = this.commissionRules.createQueryBuilder("rule")
      .leftJoinAndSelect("rule.tenant", "tenant")
      .leftJoinAndSelect("rule.merchant", "merchant")
      .leftJoinAndSelect("rule.product", "product")
      .leftJoinAndSelect("rule.promotionCode", "promotionCode")
      .orderBy("rule.createdAt", "DESC");
    if (tenant) builder.andWhere("rule.tenantId = :tenantId", { tenantId: tenant.id });
    if (query.merchantId) {
      const scope = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, false, false, "marketing.manage");
      builder.andWhere("(rule.merchantId = :merchantId OR rule.scopeType = 'tenant')", { merchantId: scope.merchant?.id });
    } else if (tenant) {
      const allowedIds = await this.adminAllowedMerchantIds(admin, "marketing.manage");
      if (allowedIds !== null) builder.andWhere("(rule.merchantId IN (:...merchantIds) OR rule.scopeType = 'tenant')", { merchantIds: allowedIds.length ? allowedIds : [-1] });
    }
    if (query.status) builder.andWhere("rule.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(rule.ruleKey LIKE :keyword OR rule.name LIKE :keyword OR merchant.name LIKE :keyword OR product.title LIKE :keyword OR promotionCode.code LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(300).getMany();
  }

  async saveCommissionRule(dto: MallCommissionRuleDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, dto.tenantId);
    if (!tenant) throw new BadRequestException("请选择所属商家");
    const merchant = dto.merchantId ? (await this.adminTargetMerchant(admin, tenant.id, dto.merchantId, false, false, "marketing.manage")).merchant : null;
    const product = dto.productId ? await this.products.findOne({ where: { id: Number(dto.productId), tenant: { id: tenant.id } } }) : null;
    const promotionCode = dto.promotionCodeId ? await this.promotionCodes.findOne({ where: { id: Number(dto.promotionCodeId), tenant: { id: tenant.id } }, relations: ["tenant", "merchant"], loadEagerRelations: false }) : null;
    if (dto.productId && !product) throw new NotFoundException("佣金规则商品不存在");
    if (dto.promotionCodeId && !promotionCode) throw new NotFoundException("佣金规则推广渠道不存在");
    if (product?.merchant) await this.assertAdminMerchantAccess(product.merchant, admin, "marketing.manage");
    if (promotionCode?.merchant) await this.assertAdminMerchantAccess(promotionCode.merchant, admin, "marketing.manage");
    if (dto.scopeType === "tenant") await this.assertTenantWideMallPermission(admin, "marketing.manage", "租户级佣金规则");
    if (dto.scopeType === "merchant" && !merchant) throw new BadRequestException("店铺佣金规则必须选择店铺");
    if (dto.scopeType === "product" && !product) throw new BadRequestException("商品佣金规则必须选择商品");
    if (dto.scopeType === "channel" && !promotionCode) throw new BadRequestException("渠道佣金规则必须选择推广码");
    const scopeMerchant = dto.scopeType === "merchant" ? merchant : dto.scopeType === "product" ? product?.merchant || null : dto.scopeType === "channel" ? promotionCode?.merchant || null : null;
    if (merchant && scopeMerchant && merchant.id !== scopeMerchant.id) throw new BadRequestException("规则店铺与商品或推广渠道所属店铺不一致");
    const directRateBps = Math.max(Math.trunc(Number(dto.directRateBps || 0)), 0);
    const agentLevelRatesBps = (dto.agentLevelRatesBps || []).map((rate) => Math.max(Math.trunc(Number(rate || 0)), 0)).slice(0, 10);
    if (directRateBps + agentLevelRatesBps.reduce((sum, rate) => sum + rate, 0) > 10000) throw new BadRequestException("同一佣金规则的直接佣金和多级代理佣金合计不能超过 100%");
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (startsAt && endsAt && startsAt >= endsAt) throw new BadRequestException("佣金规则结束时间必须晚于开始时间");
    const scopeId = dto.scopeType === "product" ? product?.id : dto.scopeType === "channel" ? promotionCode?.id : dto.scopeType === "merchant" ? merchant?.id : tenant.id;
    const baseKey = dto.ruleKey?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || `${dto.scopeType}-${scopeId}`;
    const latest = await this.commissionRules.findOne({ where: { tenant: { id: tenant.id }, ruleKey: baseKey }, order: { version: "DESC" } });
    if (latest?.status === "active") {
      latest.status = "retired";
      await this.commissionRules.save(latest);
    }
    const saved = await this.commissionRules.save(this.commissionRules.create({
      tenant,
      merchant: scopeMerchant,
      product: dto.scopeType === "product" ? product : null,
      promotionCode: dto.scopeType === "channel" ? promotionCode : null,
      ruleKey: baseKey,
      name: this.requiredString(dto.name, "规则名称"),
      scopeType: dto.scopeType,
      version: Number(latest?.version || 0) + 1,
      priority: Math.trunc(Number(dto.priority || 0)),
      directRateBps,
      agentLevelRatesBps,
      status: "active",
      startsAt,
      endsAt,
      createdByAdminId: admin?.id || null,
      createdBy: admin?.username || "后台运营",
      remark: this.optionalString(dto.remark)
    }));
    await this.logOperation(admin, "mall.commission_rule.create_version", "mall_commission_rule", saved.id, `发布佣金规则：${saved.name} v${saved.version}`, tenant.id);
    return saved;
  }

  async retireCommissionRule(id: number, admin?: AdminContext) {
    const row = await this.commissionRules.findOne({ where: { id } });
    if (!row) throw new NotFoundException("佣金规则不存在");
    this.assertAdminTenantAccess(row, admin);
    if (row.merchant) await this.assertAdminMerchantAccess(row.merchant, admin, "marketing.manage");
    else await this.assertTenantWideMallPermission(admin, "marketing.manage", "租户级佣金规则");
    if (row.status === "retired") return row;
    row.status = "retired";
    const saved = await this.commissionRules.save(row);
    await this.logOperation(admin, "mall.commission_rule.retire", "mall_commission_rule", saved.id, `停用佣金规则：${saved.name} v${saved.version}`, saved.tenant.id);
    return saved;
  }

  async adminCommissionAdjustments(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "finance.view");
    const builder = this.commissionAdjustments.createQueryBuilder("adjustment")
      .leftJoinAndSelect("adjustment.tenant", "tenant")
      .leftJoinAndSelect("adjustment.merchant", "merchant")
      .leftJoinAndSelect("adjustment.commission", "commission")
      .leftJoinAndSelect("adjustment.order", "order")
      .leftJoinAndSelect("adjustment.refund", "refund")
      .orderBy("adjustment.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "adjustment", tenant);
    if (merchant) this.applyMerchantFilter(builder, "adjustment", merchant);
    if (query.keyword?.trim()) builder.andWhere("(adjustment.operationKey LIKE :keyword OR order.orderNo LIKE :keyword OR refund.refundNo LIKE :keyword OR commission.code LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    this.applyDateRangeFilter(builder, "adjustment", query);
    return builder.take(300).getMany();
  }

  async adminCommissions(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "finance.view");
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoinAndSelect("commission.tenant", "tenant")
      .leftJoinAndSelect("commission.merchant", "merchant")
      .leftJoinAndSelect("commission.order", "order")
      .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
      .leftJoinAndSelect("order.user", "buyer")
      .leftJoinAndSelect("commission.promotionCode", "promotionCode")
      .leftJoinAndSelect("commission.promoterUser", "promoterUser")
      .leftJoinAndSelect("commission.agent", "agent")
      .leftJoinAndSelect("commission.orderItem", "orderItem")
      .leftJoinAndSelect("commission.product", "product")
      .leftJoinAndSelect("commission.rule", "rule")
      .orderBy("commission.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "commission", tenant);
    if (merchant) this.applyMerchantFilter(builder, "commission", merchant);
    if (query.status) builder.andWhere("commission.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(commission.code LIKE :keyword OR order.orderNo LIKE :keyword OR buyer.phone LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.checkoutGroupNo?.trim()) builder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    return builder.take(200).getMany();
  }

  async adminCommissionSummary(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoin("commission.tenant", "tenant")
      .leftJoin("commission.merchant", "merchant")
      .leftJoin("commission.order", "order")
      .leftJoin("order.checkoutGroup", "checkoutGroup")
      .leftJoin("order.user", "buyer")
      .leftJoin("commission.promoterUser", "promoterUser")
      .leftJoin("commission.agent", "agent");
    if (tenant) this.applyTenantFilter(builder, "commission", tenant);
    if (merchant) this.applyMerchantFilter(builder, "commission", merchant);
    if (query.status) builder.andWhere("commission.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(commission.code LIKE :keyword OR order.orderNo LIKE :keyword OR buyer.phone LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.checkoutGroupNo?.trim()) builder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    const clawback = await builder.clone()
      .select("SUM(CASE WHEN commission.clawbackStatus = 'pending' THEN 1 ELSE 0 END)", "count")
      .addSelect("COALESCE(SUM(CASE WHEN commission.clawbackStatus = 'pending' THEN commission.clawbackAmount - commission.clawbackSettledAmount ELSE 0 END), 0)", "amount")
      .getRawOne<{ count: string; amount: string }>();
    const rows = await builder
      .select("commission.status", "status")
      .addSelect("COUNT(commission.id)", "count")
      .addSelect("COALESCE(SUM(commission.commissionAmount), 0)", "amount")
      .groupBy("commission.status")
      .getRawMany<{ status: string; count: string; amount: string }>();
    const map = Object.fromEntries(rows.map((row) => [row.status, { count: Number(row.count || 0), amount: Number(row.amount || 0) }])) as Record<string, { count: number; amount: number }>;
    const totalCount = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
    const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return {
      totalCount,
      totalAmount: totalAmount.toFixed(2),
      pendingCount: Number(map.pending?.count || 0),
      pendingAmount: Number(map.pending?.amount || 0).toFixed(2),
      settledCount: Number(map.settled?.count || 0),
      settledAmount: Number(map.settled?.amount || 0).toFixed(2),
      riskReviewCount: Number(map.risk_review?.count || 0),
      riskReviewAmount: Number(map.risk_review?.amount || 0).toFixed(2),
      voidCount: Number(map.void?.count || 0),
      voidAmount: Number(map.void?.amount || 0).toFixed(2),
      clawbackPendingCount: Number(clawback?.count || 0),
      clawbackPendingAmount: Number(clawback?.amount || 0).toFixed(2),
      byStatus: map
    };
  }

  async adminCommissionPromoterSummary(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoin("commission.tenant", "tenant")
      .leftJoin("commission.merchant", "merchant")
      .leftJoin("commission.order", "order")
      .leftJoin("order.checkoutGroup", "checkoutGroup")
      .leftJoin("order.user", "buyer")
      .leftJoin("commission.promoterUser", "promoterUser")
      .leftJoin("commission.agent", "agent");
    if (tenant) this.applyTenantFilter(builder, "commission", tenant);
    if (merchant) this.applyMerchantFilter(builder, "commission", merchant);
    if (query.status) builder.andWhere("commission.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(commission.code LIKE :keyword OR order.orderNo LIKE :keyword OR buyer.phone LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.checkoutGroupNo?.trim()) builder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    const rows = await builder
      .select("COALESCE(agent.id, 0)", "agentId")
      .addSelect("COALESCE(agent.name, '')", "agentName")
      .addSelect("COALESCE(promoterUser.id, 0)", "promoterUserId")
      .addSelect("COALESCE(promoterUser.phone, promoterUser.nickname, '')", "promoterName")
      .addSelect("COUNT(commission.id)", "count")
      .addSelect("COALESCE(SUM(commission.orderAmount), 0)", "orderAmount")
      .addSelect("COALESCE(SUM(commission.commissionAmount), 0)", "commissionAmount")
      .addSelect("COALESCE(SUM(CASE WHEN commission.status = 'pending' THEN commission.commissionAmount ELSE 0 END), 0)", "pendingAmount")
      .addSelect("SUM(CASE WHEN commission.status = 'pending' THEN 1 ELSE 0 END)", "pendingCount")
      .addSelect("COALESCE(SUM(CASE WHEN commission.status = 'risk_review' THEN commission.commissionAmount ELSE 0 END), 0)", "riskReviewAmount")
      .addSelect("SUM(CASE WHEN commission.status = 'risk_review' THEN 1 ELSE 0 END)", "riskReviewCount")
      .addSelect("COALESCE(SUM(CASE WHEN commission.status = 'settled' THEN commission.commissionAmount ELSE 0 END), 0)", "settledAmount")
      .addSelect("SUM(CASE WHEN commission.status = 'settled' THEN 1 ELSE 0 END)", "settledCount")
      .addSelect("COALESCE(SUM(CASE WHEN commission.status = 'void' THEN commission.commissionAmount ELSE 0 END), 0)", "voidAmount")
      .addSelect("SUM(CASE WHEN commission.status = 'void' THEN 1 ELSE 0 END)", "voidCount")
      .addSelect("COALESCE(SUM(CASE WHEN commission.clawbackStatus = 'pending' THEN commission.clawbackAmount - commission.clawbackSettledAmount ELSE 0 END), 0)", "clawbackAmount")
      .groupBy("agent.id")
      .addGroupBy("agent.name")
      .addGroupBy("promoterUser.id")
      .addGroupBy("promoterUser.phone")
      .addGroupBy("promoterUser.nickname")
      .orderBy("commissionAmount", "DESC")
      .limit(100)
      .getRawMany<Record<string, string>>();
    return rows.map((row) => {
      const agentId = Number(row.agentId || 0);
      const promoterUserId = Number(row.promoterUserId || 0);
      return {
        type: agentId ? "agent" : promoterUserId ? "promoter" : "unassigned",
        agentId: agentId || null,
        agentName: row.agentName || null,
        promoterUserId: promoterUserId || null,
        promoterName: row.promoterName || null,
        displayName: row.agentName || row.promoterName || "未绑定推广对象",
        count: Number(row.count || 0),
        orderAmount: Number(row.orderAmount || 0).toFixed(2),
        commissionAmount: Number(row.commissionAmount || 0).toFixed(2),
        pendingCount: Number(row.pendingCount || 0),
        pendingAmount: Number(row.pendingAmount || 0).toFixed(2),
        riskReviewCount: Number(row.riskReviewCount || 0),
        riskReviewAmount: Number(row.riskReviewAmount || 0).toFixed(2),
        settledCount: Number(row.settledCount || 0),
        settledAmount: Number(row.settledAmount || 0).toFixed(2),
        voidCount: Number(row.voidCount || 0),
        voidAmount: Number(row.voidAmount || 0).toFixed(2),
        clawbackAmount: Number(row.clawbackAmount || 0).toFixed(2)
      };
    });
  }

  async exportAdminCommissions(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoinAndSelect("commission.tenant", "tenant")
      .leftJoinAndSelect("commission.merchant", "merchant")
      .leftJoinAndSelect("commission.order", "order")
      .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
      .leftJoinAndSelect("order.user", "buyer")
      .leftJoinAndSelect("commission.promoterUser", "promoterUser")
      .leftJoinAndSelect("commission.agent", "agent")
      .leftJoinAndSelect("commission.orderItem", "orderItem")
      .leftJoinAndSelect("commission.product", "product")
      .leftJoinAndSelect("commission.rule", "rule")
      .orderBy("commission.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "commission", tenant);
    if (merchant) this.applyMerchantFilter(builder, "commission", merchant);
    if (query.status) builder.andWhere("commission.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(commission.code LIKE :keyword OR order.orderNo LIKE :keyword OR buyer.phone LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.checkoutGroupNo?.trim()) builder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    const rows = await builder.take(1000).getMany();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商城推广佣金");
    sheet.columns = [
      { header: "佣金ID", key: "id", width: 10 },
      { header: "商家", key: "tenant", width: 22 },
      { header: "店铺", key: "merchant", width: 22 },
      { header: "订单号", key: "orderNo", width: 28 },
      { header: "结算组号", key: "checkoutGroupNo", width: 24 },
      { header: "买家手机", key: "buyerPhone", width: 16 },
      { header: "推广码", key: "code", width: 16 },
      { header: "推广人", key: "promoter", width: 18 },
      { header: "代理", key: "agent", width: 18 },
      { header: "商品", key: "product", width: 24 },
      { header: "规则", key: "rule", width: 26 },
      { header: "受益层级", key: "beneficiary", width: 16 },
      { header: "计佣基数", key: "orderAmount", width: 12 },
      { header: "佣金比例", key: "commissionRate", width: 12 },
      { header: "原始佣金", key: "originalCommissionAmount", width: 12 },
      { header: "佣金金额", key: "commissionAmount", width: 12 },
      { header: "累计退款", key: "refundedOrderAmount", width: 12 },
      { header: "待扣回", key: "clawbackAmount", width: 12 },
      { header: "状态", key: "status", width: 12 },
      { header: "风险复核", key: "riskReview", width: 28 },
      { header: "作废原因", key: "voidReason", width: 24 },
      { header: "结算人", key: "settledBy", width: 16 },
      { header: "结算备注", key: "settleRemark", width: 28 },
      { header: "结算时间", key: "settledAt", width: 22 },
      { header: "创建时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) => {
      sheet.addRow({
        id: row.id,
        tenant: row.tenant?.name || row.tenant?.code || "-",
        merchant: row.merchant?.name || "-",
        orderNo: row.order?.orderNo || "",
        checkoutGroupNo: row.order?.checkoutGroup?.groupNo || "",
        buyerPhone: row.order?.user?.phone || row.order?.user?.nickname || "",
        code: row.code,
        promoter: row.promoterUser?.phone || row.promoterUser?.nickname || "",
        agent: row.agent?.name || "",
        product: row.product?.title || row.orderItem?.productTitle || "",
        rule: row.rule ? `${row.rule.name} v${row.rule.version}` : String(row.ruleSnapshot?.name || "历史推广码比例"),
        beneficiary: `${row.beneficiaryType === "promoter" ? "推广人" : row.beneficiaryType === "agent" ? "代理" : "未绑定"} / L${row.beneficiaryLevel}`,
        orderAmount: row.orderAmount,
        commissionRate: `${(Number(row.commissionRate || 0) * 100).toFixed(2)}%`,
        originalCommissionAmount: row.originalCommissionAmount,
        commissionAmount: row.commissionAmount,
        refundedOrderAmount: row.refundedOrderAmount,
        clawbackAmount: fenToYuan(Math.max(yuanToFen(row.clawbackAmount) - yuanToFen(row.clawbackSettledAmount), 0)),
        status: this.mallCommissionStatusText(row.status),
        riskReview: row.riskReviewReason || "",
        voidReason: row.voidReason || "",
        settledBy: row.settledBy || "",
        settleRemark: row.settleRemark || "",
        settledAt: row.settledAt || "",
        createdAt: row.createdAt
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async exportAdminCommissionPromoterSummary(query: MallListQueryDto, admin?: AdminContext) {
    const rows = await this.adminCommissionPromoterSummary(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("推广对象佣金汇总");
    sheet.columns = [
      { header: "类型", key: "type", width: 12 },
      { header: "代理/推广人", key: "displayName", width: 24 },
      { header: "代理ID", key: "agentId", width: 10 },
      { header: "推广用户ID", key: "promoterUserId", width: 12 },
      { header: "订单笔数", key: "count", width: 10 },
      { header: "订单金额", key: "orderAmount", width: 14 },
      { header: "总佣金", key: "commissionAmount", width: 14 },
      { header: "待结算笔数", key: "pendingCount", width: 12 },
      { header: "待结算金额", key: "pendingAmount", width: 14 },
      { header: "风险复核笔数", key: "riskReviewCount", width: 12 },
      { header: "风险复核金额", key: "riskReviewAmount", width: 14 },
      { header: "已结算笔数", key: "settledCount", width: 12 },
      { header: "已结算金额", key: "settledAmount", width: 14 },
      { header: "已作废笔数", key: "voidCount", width: 12 },
      { header: "已作废金额", key: "voidAmount", width: 14 },
      { header: "待扣回金额", key: "clawbackAmount", width: 14 }
    ];
    rows.forEach((row) => {
      sheet.addRow({
        type: row.type === "agent" ? "代理" : row.type === "promoter" ? "推广用户" : "未绑定",
        displayName: row.displayName,
        agentId: row.agentId || "",
        promoterUserId: row.promoterUserId || "",
        count: row.count,
        orderAmount: row.orderAmount,
        commissionAmount: row.commissionAmount,
        pendingCount: row.pendingCount,
        pendingAmount: row.pendingAmount,
        riskReviewCount: row.riskReviewCount,
        riskReviewAmount: row.riskReviewAmount,
        settledCount: row.settledCount,
        settledAmount: row.settledAmount,
        voidCount: row.voidCount,
        voidAmount: row.voidAmount,
        clawbackAmount: row.clawbackAmount
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async settleCommission(id: number, dto: MallCommissionSettleDto, admin?: AdminContext) {
    const operationKey = this.optionalString(dto.businessKey) || `commission:${id}:settle`;
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MallCommission);
      const commission = await repo.findOne({
        where: { id },
        relations: ["tenant", "merchant", "order"],
        loadEagerRelations: false,
        lock: { mode: "pessimistic_write" }
      });
      if (!commission) throw new NotFoundException("商城佣金记录不存在");
      this.assertAdminTenantAccess(commission, admin);
      if (commission.merchant) await this.assertAdminMerchantAccess(commission.merchant, admin);
      if (commission.status === "settled" && commission.settleOperationKey === operationKey) return commission;
      if (commission.status === "risk_review") throw new BadRequestException("风险复核中的佣金不能结算，请先完成人工复核");
      if (commission.status !== "pending") throw new BadRequestException("只有待结算佣金可以结算");
      commission.status = "settled";
      commission.settledAt = new Date();
      commission.settledBy = admin?.username || "后台财务";
      commission.settleRemark = this.optionalString(dto.remark);
      commission.settleOperationKey = operationKey;
      const result = await repo.save(commission);
      await this.saveCommissionAdjustment(manager, result, {
        operationKey: `commission-settlement:${operationKey}:${result.id}`,
        type: "settlement",
        direction: "debit",
        amountFen: yuanToFen(result.commissionAmount),
        beforeFen: yuanToFen(result.commissionAmount),
        afterFen: yuanToFen(result.commissionAmount),
        operatorAdminId: admin?.id || null,
        operator: admin?.username || "后台财务",
        remark: result.settleRemark || "佣金结算"
      });
      return result;
    });
    await this.logOperation(admin, "mall.commission.settle", "mall_commission", saved.id, `结算商城佣金：${saved.code} ¥${saved.commissionAmount}`, saved.tenant.id);
    return saved;
  }

  async batchSettleCommissions(dto: MallCommissionBatchSettleDto, admin?: AdminContext) {
    const remark = this.requiredString(dto.remark, "结算备注");
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId, !admin?.tenantId && !dto.merchantId);
    const operationKey = this.optionalString(dto.businessKey) || `commission-batch:${admin?.id || 0}:${Date.now()}`;
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MallCommission);
      const replay = await repo.find({ where: { settleOperationKey: operationKey, status: "settled" }, relations: ["tenant", "merchant", "order"], loadEagerRelations: false });
      if (replay.length) return replay;
      const builder = repo.createQueryBuilder("commission")
        .leftJoin("commission.tenant", "tenant")
        .leftJoin("commission.merchant", "merchant")
        .leftJoin("commission.order", "order")
        .leftJoin("order.user", "buyer")
        .leftJoin("commission.promoterUser", "promoterUser")
        .leftJoin("commission.agent", "agent")
        .select("commission.id", "id")
        .where("commission.status = :status", { status: "pending" })
        .orderBy("commission.createdAt", "ASC")
        .take(200);
      if (tenant) this.applyTenantFilter(builder, "commission", tenant);
      if (merchant) this.applyMerchantFilter(builder, "commission", merchant);
      if (dto.keyword?.trim()) builder.andWhere("(commission.code LIKE :keyword OR order.orderNo LIKE :keyword OR buyer.phone LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${dto.keyword.trim()}%` });
      if (dto.agentId) builder.andWhere("agent.id = :agentId", { agentId: Number(dto.agentId) });
      if (dto.promoterUserId) builder.andWhere("promoterUser.id = :promoterUserId", { promoterUserId: Number(dto.promoterUserId) });
      if (dto.unassigned) builder.andWhere("agent.id IS NULL AND promoterUser.id IS NULL");
      const ids = (await builder.getRawMany<{ id: string }>()).map((row) => Number(row.id)).filter(Boolean);
      if (!ids.length) return [];
      const rows = await repo.find({ where: { id: In(ids), status: "pending" }, relations: ["tenant", "merchant", "order"], loadEagerRelations: false, order: { createdAt: "ASC" }, lock: { mode: "pessimistic_write" } });
      const now = new Date();
      for (const row of rows) {
        row.status = "settled";
        row.settledAt = now;
        row.settledBy = admin?.username || "后台财务";
        row.settleRemark = remark;
        row.settleOperationKey = operationKey;
      }
      const results = await repo.save(rows);
      for (const row of results) {
        await this.saveCommissionAdjustment(manager, row, { operationKey: `commission-settlement:${operationKey}:${row.id}`, type: "settlement", direction: "debit", amountFen: yuanToFen(row.commissionAmount), beforeFen: yuanToFen(row.commissionAmount), afterFen: yuanToFen(row.commissionAmount), operatorAdminId: admin?.id || null, operator: admin?.username || "后台财务", remark });
      }
      return results;
    });
    if (!saved.length) return { settledCount: 0, settledAmount: "0.00", ids: [] };
    const amount = saved.reduce((sum, row) => sum + Number(row.commissionAmount || 0), 0);
    await this.logOperation(admin, "mall.commission.batch_settle", "mall_commission", saved.map((row) => row.id).join(","), `批量结算商城佣金：${saved.length} 笔 ¥${amount.toFixed(2)}`, saved[0]?.tenant?.id);
    return { settledCount: saved.length, settledAmount: amount.toFixed(2), ids: saved.map((row) => row.id) };
  }

  async reviewCommissionRisk(id: number, dto: MallCommissionRiskReviewDto, admin?: AdminContext) {
    const remark = this.requiredString(dto.remark, "复核说明");
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MallCommission);
      const row = await repo.findOne({ where: { id }, relations: ["tenant", "merchant", "order"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("商城佣金记录不存在");
      this.assertAdminTenantAccess(row, admin);
      if (row.merchant) await this.assertAdminMerchantAccess(row.merchant, admin);
      if (row.status !== "risk_review") {
        const replay = await manager.getRepository(MallCommissionAdjustment).findOne({ where: { operationKey: `commission-risk:${row.id}:${dto.decision}` }, loadEagerRelations: false });
        if (replay) return row;
        throw new BadRequestException("只有风险复核中的佣金可以处理");
      }
      const beforeFen = yuanToFen(row.commissionAmount);
      row.riskReviewedByAdminId = admin?.id || null;
      row.riskReviewedBy = admin?.username || "后台财务";
      row.riskReviewedAt = new Date();
      row.riskReviewReason = remark;
      if (dto.decision === "approve") {
        row.status = "pending";
      } else {
        row.status = "void";
        row.voidReason = `推广归因风险复核拒绝：${remark}`;
        row.voidedAt = new Date();
      }
      const result = await repo.save(row);
      await this.saveCommissionAdjustment(manager, result, { operationKey: `commission-risk:${result.id}:${dto.decision}`, type: dto.decision === "approve" ? "risk_release" : "risk_reject", direction: dto.decision === "approve" ? "credit" : "debit", amountFen: dto.decision === "approve" ? 0 : beforeFen, beforeFen, afterFen: dto.decision === "approve" ? beforeFen : 0, operatorAdminId: admin?.id || null, operator: admin?.username || "后台财务", remark });
      return result;
    });
    await this.logOperation(admin, `mall.commission.risk_${dto.decision}`, "mall_commission", saved.id, `${dto.decision === "approve" ? "通过" : "拒绝"}佣金风险复核：${saved.code}`, saved.tenant.id);
    return saved;
  }

  async settleCommissionClawback(id: number, dto: MallCommissionSettleDto, admin?: AdminContext) {
    const remark = this.requiredString(dto.remark, "扣回凭证或说明");
    const operationKey = this.optionalString(dto.businessKey) || `commission:${id}:clawback-settle`;
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MallCommission);
      const row = await repo.findOne({ where: { id }, relations: ["tenant", "merchant", "order"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("商城佣金记录不存在");
      this.assertAdminTenantAccess(row, admin);
      if (row.merchant) await this.assertAdminMerchantAccess(row.merchant, admin);
      if (row.clawbackStatus === "settled" && row.clawbackOperationKey === operationKey) return row;
      const pendingClawbackFen = Math.max(yuanToFen(row.clawbackAmount) - yuanToFen(row.clawbackSettledAmount), 0);
      if (row.clawbackStatus !== "pending" || pendingClawbackFen <= 0) throw new BadRequestException("当前佣金没有待处理的退款扣回");
      row.clawbackStatus = "settled";
      row.clawbackSettledAt = new Date();
      row.clawbackSettledByAdminId = admin?.id || null;
      row.clawbackSettledBy = admin?.username || "后台财务";
      row.clawbackSettleRemark = remark;
      row.clawbackOperationKey = operationKey;
      row.clawbackSettledAmount = row.clawbackAmount;
      const result = await repo.save(row);
      await this.saveCommissionAdjustment(manager, result, { operationKey: `commission-clawback-settlement:${operationKey}:${result.id}`, type: "clawback_settlement", direction: "credit", amountFen: pendingClawbackFen, beforeFen: pendingClawbackFen, afterFen: 0, operatorAdminId: admin?.id || null, operator: admin?.username || "后台财务", remark });
      return result;
    });
    await this.logOperation(admin, "mall.commission.clawback_settle", "mall_commission", saved.id, `确认佣金扣回：${saved.code} ¥${saved.clawbackAmount}`, saved.tenant.id);
    return saved;
  }

  async adminPaymentCallbackLogs(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "finance.view");
    const builder = this.paymentCallbackLogs.createQueryBuilder("log")
      .leftJoinAndSelect("log.tenant", "tenant")
      .leftJoinAndSelect("log.merchant", "merchant")
      .leftJoinAndSelect("log.order", "order")
      .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
      .leftJoinAndSelect("order.user", "user")
      .orderBy("log.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "log", tenant);
    if (merchant) this.applyMerchantFilter(builder, "log", merchant);
    if (query.status) builder.andWhere("log.resultStatus = :status", { status: query.status });
    this.applyDateRangeFilter(builder, "log", query);
    if (query.keyword?.trim()) {
      builder.andWhere("(log.orderNo LIKE :keyword OR log.transactionNo LIKE :keyword OR log.provider LIKE :keyword OR log.resultMessage LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.checkoutGroupNo?.trim()) builder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    const rows = await builder.take(100).getMany();
    return rows.map((row) => this.publicMallPaymentCallbackLog(row));
  }

  async exportAdminPaymentCallbackLogs(query: MallListQueryDto, admin?: AdminContext) {
    const rows = await this.adminPaymentCallbackLogs(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商城支付回调日志");
    sheet.columns = [
      { header: "订单号", key: "orderNo", width: 28 },
      { header: "结算组号", key: "checkoutGroupNo", width: 24 },
      { header: "交易号", key: "transactionNo", width: 30 },
      { header: "商家", key: "tenant", width: 22 },
      { header: "商家编码", key: "tenantCode", width: 18 },
      { header: "用户手机", key: "phone", width: 16 },
      { header: "Provider", key: "provider", width: 14 },
      { header: "金额", key: "amount", width: 12 },
      { header: "签名校验", key: "signatureValid", width: 12 },
      { header: "处理结果", key: "resultStatus", width: 12 },
      { header: "结果说明", key: "resultMessage", width: 36 },
      { header: "处理时间", key: "processedAt", width: 22 },
      { header: "接收时间", key: "createdAt", width: 22 },
      { header: "原始回调摘要", key: "payload", width: 70 }
    ];
    rows.forEach((row) => {
      sheet.addRow({
        orderNo: row.orderNo || row.order?.orderNo || "",
        checkoutGroupNo: row.order?.checkoutGroup?.groupNo || "",
        transactionNo: row.transactionNo || "",
        tenant: row.tenant?.name || row.tenant?.code || row.order?.tenant?.name || "-",
        tenantCode: row.tenant?.code || row.order?.tenant?.code || "",
        phone: row.order?.user?.phone || row.order?.user?.nickname || "-",
        provider: row.provider,
        amount: row.amount || "",
        signatureValid: row.signatureValid === null || row.signatureValid === undefined ? "未校验" : row.signatureValid ? "通过" : "失败",
        resultStatus: this.mallPaymentCallbackStatusText(row.resultStatus),
        resultMessage: row.resultMessage || "",
        processedAt: row.processedAt || "",
        createdAt: row.createdAt,
        payload: JSON.stringify(this.sanitizeMallProviderPayload(row.payload || {})).slice(0, 1000)
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async adminRefundLogs(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, ["finance.view", "refund.view", "refund.manage"]);
    const builder = this.refundLogs.createQueryBuilder("log")
      .leftJoinAndSelect("log.tenant", "tenant")
      .leftJoinAndSelect("log.merchant", "merchant")
      .leftJoinAndSelect("log.refund", "refund")
      .leftJoinAndSelect("log.order", "order")
      .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
      .leftJoinAndSelect("order.user", "user")
      .orderBy("log.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "log", tenant);
    if (merchant) this.applyMerchantFilter(builder, "log", merchant);
    if (query.status) builder.andWhere("log.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(log.providerRefundNo LIKE :keyword OR log.provider LIKE :keyword OR log.message LIKE :keyword OR refund.refundNo LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.checkoutGroupNo?.trim()) builder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    const rows = await builder.take(100).getMany();
    return rows.map((row) => this.publicMallRefundLog(row));
  }

  async adminPaymentReadiness(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, false, ["finance.view", "merchant.manage"]);
    const setting = tenant ? await this.operationSettings.findOne({ where: { tenant: { id: tenant.id } } }) : null;
    return this.mallWechatPaymentReadinessForMerchant(tenant, merchant, this.normalizePaymentMethods(setting?.paymentMethods));
  }

  async adminSettlements(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "settlement.view");
    const settlementBuilder = this.settlements
      .createQueryBuilder("settlement")
      .leftJoinAndSelect("settlement.tenant", "tenant")
      .leftJoinAndSelect("settlement.merchant", "merchant")
      .orderBy("settlement.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(settlementBuilder, "settlement", tenant);
    if (merchant) this.applyMerchantFilter(settlementBuilder, "settlement", merchant);
    if (query.status) settlementBuilder.andWhere("settlement.status = :status", { status: query.status });
    const range = this.mallSettlementQueryRange(query);
    if (range.periodStart && range.periodEnd) {
      settlementBuilder.andWhere("settlement.periodStart <= :periodEnd AND settlement.periodEnd >= :periodStart", range);
    } else if (range.periodStart) {
      settlementBuilder.andWhere("settlement.periodEnd >= :periodStart", { periodStart: range.periodStart });
    } else if (range.periodEnd) {
      settlementBuilder.andWhere("settlement.periodStart <= :periodEnd", { periodEnd: range.periodEnd });
    }
    const items = await settlementBuilder.take(100).getMany();
    const summaryFen = items.reduce((sum, row) => ({
      order: sum.order + yuanToFen(row.orderAmount),
      refund: sum.refund + yuanToFen(row.refundAmount),
      net: sum.net + yuanToFen(row.netAmount),
      platformCollected: sum.platformCollected + yuanToFen(row.platformCollectedAmount),
      merchantDirect: sum.merchantDirect + yuanToFen(row.merchantDirectAmount),
      serviceFee: sum.serviceFee + yuanToFen(row.serviceFeeAmount),
      commission: sum.commission + yuanToFen(row.commissionAmount),
      commissionClawback: sum.commissionClawback + yuanToFen(row.commissionClawbackAmount),
      adjustment: sum.adjustment + yuanToFen(row.adjustmentAmount),
      payable: sum.payable + yuanToFen(row.payableAmount)
    }), { order: 0, refund: 0, net: 0, platformCollected: 0, merchantDirect: 0, serviceFee: 0, commission: 0, commissionClawback: 0, adjustment: 0, payable: 0 });
    return {
      items,
      pending: await this.mallSettlementPendingSummary(query, tenant, merchant),
      summary: {
        settlementCount: items.length,
        draftCount: items.filter((row) => row.status === "draft").length,
        approvedCount: items.filter((row) => row.status === "approved").length,
        paidCount: items.filter((row) => row.status === "paid").length,
        orderAmount: fenToYuan(summaryFen.order),
        refundAmount: fenToYuan(summaryFen.refund),
        netAmount: fenToYuan(summaryFen.net),
        platformCollectedAmount: fenToYuan(summaryFen.platformCollected),
        merchantDirectAmount: fenToYuan(summaryFen.merchantDirect),
        serviceFeeAmount: fenToYuan(summaryFen.serviceFee),
        commissionAmount: fenToYuan(summaryFen.commission),
        commissionClawbackAmount: fenToYuan(summaryFen.commissionClawback),
        adjustmentAmount: fenToYuan(summaryFen.adjustment),
        payableAmount: fenToYuan(summaryFen.payable)
      }
    };
  }

  async exportAdminSettlements(query: MallListQueryDto, admin?: AdminContext) {
    const { items, pending } = await this.adminSettlements(query, admin);
    const workbook = new ExcelJS.Workbook();
    const settlementSheet = workbook.addWorksheet("商城结算单");
    settlementSheet.columns = [
      { header: "结算单号", key: "settlementNo", width: 24 },
      { header: "商家", key: "tenant", width: 22 },
      { header: "商家编码", key: "tenantCode", width: 18 },
      { header: "店铺", key: "merchant", width: 24 },
      { header: "店铺编码", key: "merchantCode", width: 18 },
      { header: "店铺类型", key: "ownerType", width: 14 },
      { header: "区域", key: "region", width: 16 },
      { header: "周期开始", key: "periodStart", width: 14 },
      { header: "周期结束", key: "periodEnd", width: 14 },
      { header: "收款模式", key: "paymentMode", width: 14 },
      { header: "订单数", key: "orderCount", width: 10 },
      { header: "订单金额", key: "orderAmount", width: 14 },
      { header: "退款金额", key: "refundAmount", width: 14 },
      { header: "净交易额", key: "netAmount", width: 14 },
      { header: "平台代收净额", key: "platformCollectedAmount", width: 16 },
      { header: "商户直收净额", key: "merchantDirectAmount", width: 16 },
      { header: "服务费", key: "serviceFeeAmount", width: 14 },
      { header: "佣金成本", key: "commissionAmount", width: 14 },
      { header: "佣金扣回", key: "commissionClawbackAmount", width: 14 },
      { header: "财务调整", key: "adjustmentAmount", width: 14 },
      { header: "应打款/扣回", key: "payableAmount", width: 14 },
      { header: "明细行数", key: "lineCount", width: 12 },
      { header: "计算版本", key: "calculationVersion", width: 16 },
      { header: "状态", key: "status", width: 12 },
      { header: "生成/审核/打款", key: "operators", width: 32 },
      { header: "打款流水", key: "paidReference", width: 24 },
      { header: "备注", key: "remark", width: 36 },
      { header: "生成时间", key: "createdAt", width: 22 },
      { header: "更新时间", key: "updatedAt", width: 22 }
    ];
    items.forEach((row) => {
      settlementSheet.addRow({
        settlementNo: row.settlementNo,
        tenant: row.tenant?.name || row.tenant?.code || "-",
        tenantCode: row.tenant?.code || "",
        merchant: row.merchant?.name || "-",
        merchantCode: row.merchant?.code || "",
        ownerType: row.merchant?.ownerType === "agent" ? "代理店铺" : "商家店铺",
        region: row.merchant?.region || "",
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        paymentMode: this.mallPaymentModeText(row.paymentMode),
        orderCount: row.orderCount,
        orderAmount: row.orderAmount,
        refundAmount: row.refundAmount,
        netAmount: row.netAmount,
        platformCollectedAmount: row.platformCollectedAmount,
        merchantDirectAmount: row.merchantDirectAmount,
        serviceFeeAmount: row.serviceFeeAmount,
        commissionAmount: row.commissionAmount,
        commissionClawbackAmount: row.commissionClawbackAmount,
        adjustmentAmount: row.adjustmentAmount,
        payableAmount: row.payableAmount,
        lineCount: row.lineCount,
        calculationVersion: row.calculationVersion,
        status: this.mallSettlementStatusText(row.status),
        operators: [row.generatedBy && `生成：${row.generatedBy}`, row.reviewedBy && `审核：${row.reviewedBy}`, row.paidBy && `打款：${row.paidBy}`].filter(Boolean).join("；"),
        paidReference: row.paidReference || "",
        remark: row.remark || "",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      });
    });
    settlementSheet.getRow(1).font = { bold: true };
    settlementSheet.views = [{ state: "frozen", ySplit: 1 }];

    const pendingSheet = workbook.addWorksheet("待生成结算");
    pendingSheet.columns = [
      { header: "商家", key: "tenant", width: 22 },
      { header: "商家编码", key: "tenantCode", width: 18 },
      { header: "店铺", key: "merchant", width: 24 },
      { header: "店铺编码", key: "merchantCode", width: 18 },
      { header: "店铺类型", key: "ownerType", width: 14 },
      { header: "区域", key: "region", width: 16 },
      { header: "收款模式", key: "paymentMode", width: 14 },
      { header: "订单数", key: "orderCount", width: 10 },
      { header: "订单金额", key: "orderAmount", width: 14 },
      { header: "退款金额", key: "refundAmount", width: 14 },
      { header: "服务费", key: "serviceFeeAmount", width: 14 },
      { header: "佣金成本", key: "commissionAmount", width: 14 },
      { header: "佣金扣回", key: "commissionClawbackAmount", width: 14 },
      { header: "风险复核佣金", key: "riskReviewCount", width: 14 },
      { header: "应打款/扣回", key: "payableAmount", width: 14 }
    ];
    pending.forEach((row: any) => {
      pendingSheet.addRow({
        tenant: row.merchant?.tenant?.name || row.merchant?.tenant?.code || "-",
        tenantCode: row.merchant?.tenant?.code || "",
        merchant: row.merchant?.name || "-",
        merchantCode: row.merchant?.code || "",
        ownerType: row.merchant?.ownerType === "agent" ? "代理店铺" : "商家店铺",
        region: row.merchant?.region || "",
        paymentMode: this.mallPaymentModeText(row.paymentMode),
        orderCount: row.orderCount,
        orderAmount: row.orderAmount,
        refundAmount: row.refundAmount,
        serviceFeeAmount: row.serviceFeeAmount,
        commissionAmount: row.commissionAmount,
        commissionClawbackAmount: row.commissionClawbackAmount,
        riskReviewCount: row.riskReviewCount,
        payableAmount: row.payableAmount
      });
    });
    pendingSheet.getRow(1).font = { bold: true };
    pendingSheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async generateSettlement(dto: MallSettlementGenerateDto, admin?: AdminContext) {
    this.assertPlatformMallSettlementAdmin(admin);
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId);
    if (!tenant || !merchant) throw new BadRequestException("请选择要生成结算单的店铺");
    const periodStart = this.normalizeSettlementDate(dto.periodStart, "结算开始日期");
    const periodEnd = this.normalizeSettlementDate(dto.periodEnd, "结算结束日期");
    if (periodStart > periodEnd) throw new BadRequestException("结算开始日期不能晚于结束日期");
    const businessKey = this.normalizeSettlementBusinessKey(dto.businessKey, `generate:${tenant.id}:${merchant.id}:${periodStart}:${periodEnd}:${Date.now()}`);
    let saved: MallSettlement;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const settlementRepo = manager.getRepository(MallSettlement);
        const lockedMerchant = await manager.getRepository(MallMerchant).findOne({ where: { id: merchant.id }, lock: { mode: "pessimistic_write" } });
        if (!lockedMerchant || lockedMerchant.tenant.id !== tenant.id) throw new NotFoundException("商城店铺不存在");
        const concurrentReplay = await settlementRepo.findOne({ where: { businessKey }, lock: { mode: "pessimistic_read" } });
        if (concurrentReplay) {
          if (concurrentReplay.tenant.id !== tenant.id || concurrentReplay.merchant.id !== merchant.id) throw new ForbiddenException("结算业务键已被其他店铺使用");
          return concurrentReplay;
        }
        const draft = await this.buildMallSettlementLedgerDraft(manager, tenant, lockedMerchant, periodStart, periodEnd, businessKey);
        if (!draft.lines.length) throw new BadRequestException("当前周期没有新的可结算订单、退款、佣金或佣金扣回；已进入有效结算单的记录不会重复结算");
        const settlement = settlementRepo.create({
          ...draft.settlement,
          settlementNo: this.nextMallSettlementNo(),
          businessKey,
          generatedBy: admin?.username || "system",
          generatedByAdminId: admin?.id || null,
          lockedAt: new Date(),
          remark: this.optionalString(dto.remark)
        });
        const result = await settlementRepo.save(settlement);
        const lineRepo = manager.getRepository(MallSettlementLine);
        await lineRepo.save(draft.lines.map((line) => lineRepo.create({ ...line, settlement: result })));
        await this.saveMallSettlementEvent(manager, result, {
          eventKey: `settlement-generated:${businessKey}`,
          action: "generated",
          fromStatus: null,
          toStatus: "draft",
          admin,
          remark: settlement.remark,
          snapshot: this.mallSettlementEventSnapshot(result)
        });
        return result;
      });
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) throw error;
      let replay: MallSettlement | null = null;
      for (let attempt = 0; attempt < 3 && !replay; attempt += 1) {
        replay = await this.settlements.findOne({ where: { businessKey } });
        if (!replay && attempt < 2) await new Promise((resolve) => setTimeout(resolve, 20));
      }
      if (!replay) throw error;
      if (replay.tenant.id !== tenant.id || replay.merchant.id !== merchant.id) throw new ForbiddenException("结算业务键已被其他店铺使用");
      saved = replay;
    }
    await this.logOperation(admin, "mall.settlement.generate", "mall_settlement", saved.id, `生成商城结算单：${saved.settlementNo} ${merchant.name}`, tenant.id);
    return saved;
  }

  async adminSettlementDetail(id: number, admin?: AdminContext) {
    const settlement = await this.findAdminSettlement(id, admin);
    const lines = await this.settlementLines.find({ where: { settlement: { id } }, relations: ["order", "refund", "commission"], loadEagerRelations: false, order: { id: "ASC" } });
    const events = await this.settlementEvents.find({ where: { settlement: { id } }, loadEagerRelations: false, order: { createdAt: "ASC", id: "ASC" } });
    const linePayableFen = lines.reduce((sum, line) => sum + yuanToFen(line.payableAmount), 0);
    const legacy = settlement.calculationVersion === "legacy_v1" && !lines.length;
    const consistency = legacy ? { consistent: null, legacy: true, message: "历史结算单仅保留旧版 JSON 快照，无法执行逐笔账本校验" } : {
      ...mallSettlementConsistency(this.mallSettlementStoredAmounts(settlement), linePayableFen),
      legacy: false
    };
    return { settlement, lines: lines.map((line) => this.publicMallSettlementLine(line)), events, consistency };
  }

  async addSettlementAdjustment(id: number, dto: MallSettlementAdjustmentDto, admin?: AdminContext) {
    this.assertPlatformMallSettlementAdmin(admin);
    if (!dto.amountFen) throw new BadRequestException("调整金额不能为 0");
    const reason = this.requiredString(dto.reason, "调整原因");
    const businessKey = this.normalizeSettlementBusinessKey(dto.businessKey, `adjustment:${id}:${Date.now()}`);
    const settlementId = await this.dataSource.transaction(async (manager) => {
      const settlementRepo = manager.getRepository(MallSettlement);
      const row = await settlementRepo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("商城结算单不存在");
      this.assertAdminTenantAccess(row, admin);
      await this.assertAdminMerchantAccess(row.merchant, admin);
      const eventKey = `settlement-adjusted:${businessKey}`;
      const replay = await manager.getRepository(MallSettlementEvent).findOne({ where: { eventKey } });
      if (replay) {
        if (replay.settlement.id !== row.id) throw new ForbiddenException("结算调整业务键已被其他结算单使用");
        return row.id;
      }
      if (row.status !== "draft") throw new BadRequestException("只有草稿结算单可以增加财务调整，审核后账单不可修改");
      const beforeFen = yuanToFen(row.payableAmount);
      const adjustmentBeforeFen = yuanToFen(row.adjustmentAmount);
      row.adjustmentAmount = fenToYuan(adjustmentBeforeFen + dto.amountFen);
      row.payableAmount = fenToYuan(beforeFen + dto.amountFen);
      row.lineCount = Number(row.lineCount || 0) + 1;
      const lineRepo = manager.getRepository(MallSettlementLine);
      await lineRepo.save(lineRepo.create({
        tenant: row.tenant,
        merchant: row.merchant,
        settlement: row,
        order: null,
        refund: null,
        commission: null,
        commissionAdjustment: null,
        operationKey: `settlement-adjustment-line:${businessKey}`,
        lineType: "manual_adjustment",
        sourceType: "manual_adjustment",
        sourceId: businessKey,
        businessNo: row.settlementNo,
        direction: dto.amountFen > 0 ? "credit" : "debit",
        grossAmount: fenToYuan(Math.abs(dto.amountFen)),
        feeAmount: "0.00",
        commissionAmount: "0.00",
        payableAmount: fenToYuan(dto.amountFen),
        snapshot: { amountFen: dto.amountFen, beforePayableFen: beforeFen, afterPayableFen: beforeFen + dto.amountFen, reason, calculationVersion: row.calculationVersion },
        remark: reason
      }));
      await settlementRepo.save(row);
      await this.saveMallSettlementEvent(manager, row, { eventKey, action: "adjusted", fromStatus: "draft", toStatus: "draft", admin, remark: reason, snapshot: { amountFen: dto.amountFen, beforePayableFen: beforeFen, afterPayableFen: beforeFen + dto.amountFen } });
      return row.id;
    });
    await this.logOperation(admin, "mall.settlement.adjust", "mall_settlement", settlementId, `调整商城结算单：${fenToYuan(dto.amountFen)} ${reason}`, undefined);
    return this.adminSettlementDetail(settlementId, admin);
  }

  async approveSettlement(id: number, dto: MallSettlementReviewDto, admin?: AdminContext) {
    this.assertPlatformMallSettlementAdmin(admin);
    const businessKey = this.normalizeSettlementBusinessKey(dto.businessKey, `approve:${id}`);
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MallSettlement);
      const settlement = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!settlement) throw new NotFoundException("商城结算单不存在");
      this.assertAdminTenantAccess(settlement, admin);
      await this.assertAdminMerchantAccess(settlement.merchant, admin);
      const eventKey = `settlement-approved:${businessKey}`;
      const replay = await manager.getRepository(MallSettlementEvent).findOne({ where: { eventKey } });
      if (replay) {
        if (replay.settlement.id !== settlement.id) throw new ForbiddenException("结算审核业务键已被其他结算单使用");
        return settlement;
      }
      if (settlement.status !== "draft") throw new BadRequestException("只有草稿结算单可以审核通过");
      await this.assertMallSettlementLedgerConsistent(manager, settlement);
      settlement.status = "approved";
      settlement.reviewedBy = admin?.username || "system";
      settlement.reviewedByAdminId = admin?.id || null;
      settlement.reviewedAt = new Date();
      settlement.reviewRemark = this.optionalString(dto.remark);
      settlement.remark = this.mergeRemark(settlement.remark, dto.remark);
      const result = await repo.save(settlement);
      await this.saveMallSettlementEvent(manager, result, { eventKey, action: "approved", fromStatus: "draft", toStatus: "approved", admin, remark: settlement.reviewRemark, snapshot: this.mallSettlementEventSnapshot(result) });
      return result;
    });
    await this.logOperation(admin, "mall.settlement.approve", "mall_settlement", saved.id, `审核通过商城结算单：${saved.settlementNo}`, saved.tenant.id);
    return saved;
  }

  async rejectSettlement(id: number, dto: MallSettlementReviewDto, admin?: AdminContext) {
    this.assertPlatformMallSettlementAdmin(admin);
    const businessKey = this.normalizeSettlementBusinessKey(dto.businessKey, `reject:${id}`);
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MallSettlement);
      const settlement = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!settlement) throw new NotFoundException("商城结算单不存在");
      this.assertAdminTenantAccess(settlement, admin);
      await this.assertAdminMerchantAccess(settlement.merchant, admin);
      const eventKey = `settlement-rejected:${businessKey}`;
      const replay = await manager.getRepository(MallSettlementEvent).findOne({ where: { eventKey } });
      if (replay) {
        if (replay.settlement.id !== settlement.id) throw new ForbiddenException("结算拒绝业务键已被其他结算单使用");
        return settlement;
      }
      if (settlement.status !== "draft") throw new BadRequestException("只有草稿结算单可以拒绝");
      const remark = this.requiredString(dto.remark, "拒绝原因");
      settlement.status = "rejected";
      settlement.reviewedBy = admin?.username || "system";
      settlement.reviewedByAdminId = admin?.id || null;
      settlement.reviewedAt = new Date();
      settlement.reviewRemark = remark;
      settlement.remark = this.mergeRemark(settlement.remark, remark);
      const result = await repo.save(settlement);
      await this.saveMallSettlementEvent(manager, result, { eventKey, action: "rejected", fromStatus: "draft", toStatus: "rejected", admin, remark, snapshot: this.mallSettlementEventSnapshot(result) });
      return result;
    });
    await this.logOperation(admin, "mall.settlement.reject", "mall_settlement", saved.id, `拒绝商城结算单：${saved.settlementNo}`, saved.tenant.id);
    return saved;
  }

  async markSettlementPaid(id: number, dto: MallSettlementPaidDto, admin?: AdminContext) {
    this.assertPlatformMallSettlementAdmin(admin);
    const paidReference = this.optionalString(dto.paidReference);
    const paidProofUrl = this.optionalString(dto.paidProofUrl);
    const businessKey = this.normalizeSettlementBusinessKey(dto.businessKey, `paid:${id}`);
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MallSettlement);
      const settlement = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!settlement) throw new NotFoundException("商城结算单不存在");
      this.assertAdminTenantAccess(settlement, admin);
      await this.assertAdminMerchantAccess(settlement.merchant, admin);
      const eventKey = `settlement-paid:${businessKey}`;
      const replay = await manager.getRepository(MallSettlementEvent).findOne({ where: { eventKey } });
      if (replay) {
        if (replay.settlement.id !== settlement.id) throw new ForbiddenException("结算付款业务键已被其他结算单使用");
        return settlement;
      }
      if (settlement.status !== "approved") throw new BadRequestException("只有已审核结算单可以标记打款");
      await this.assertMallSettlementLedgerConsistent(manager, settlement);
      const actionText = yuanToFen(settlement.payableAmount) < 0 ? "扣回/冲抵" : "打款";
      if (!paidReference && !paidProofUrl) throw new BadRequestException(`请填写${actionText}流水号、线下凭证号或上传${actionText}凭证后再标记商城结算完成，方便财务对账。`);
      settlement.status = "paid";
      settlement.paidBy = admin?.username || "system";
      settlement.paidByAdminId = admin?.id || null;
      settlement.paidAt = new Date();
      settlement.paidReference = paidReference;
      settlement.paidProofUrl = paidProofUrl;
      settlement.paidRemark = this.optionalString(dto.remark);
      settlement.paymentAccountSnapshot = await this.mallSettlementPaymentAccountSnapshot(manager, settlement.merchant);
      settlement.remark = this.mergeRemark(settlement.remark, dto.remark);
      const result = await repo.save(settlement);
      await this.saveMallSettlementEvent(manager, result, { eventKey, action: "paid", fromStatus: "approved", toStatus: "paid", admin, remark: settlement.paidRemark, snapshot: { ...this.mallSettlementEventSnapshot(result), paidReference, paidProofUrl, paymentAccountSnapshot: settlement.paymentAccountSnapshot } });
      return result;
    });
    const actionText = yuanToFen(saved.payableAmount) < 0 ? "扣回/冲抵" : "打款";
    await this.logOperation(admin, "mall.settlement.mark_paid", "mall_settlement", saved.id, `标记商城结算单已${actionText}：${saved.settlementNo}`, saved.tenant.id);
    return saved;
  }

  private async mallSettlementPendingSummary(query: MallListQueryDto, tenant: Tenant | null, merchant: MallMerchant | null) {
    const range = this.mallSettlementQueryRange(query);
    const settled = await this.settledMallSnapshotIds(tenant, merchant, range.periodStart, range.periodEnd);
    const merchantChargedCommissionIds = await this.mallMerchantChargedCommissionIds(this.dataSource.manager, tenant, merchant);
    const orderBuilder = this.orders
      .createQueryBuilder("order")
      .leftJoin("order.tenant", "tenant")
      .leftJoin("order.merchant", "merchant")
      .where("order.status = :status", { status: "completed" });
    if (tenant) this.applyTenantFilter(orderBuilder, "order", tenant);
    if (merchant) this.applyMerchantFilter(orderBuilder, "order", merchant);
    if (range.periodStart) orderBuilder.andWhere("order.completedAt >= :settlementStartAt", { settlementStartAt: `${range.periodStart} 00:00:00` });
    if (range.periodEnd) orderBuilder.andWhere("order.completedAt <= :settlementEndAt", { settlementEndAt: `${range.periodEnd} 23:59:59` });
    if (settled.orderIds.length) orderBuilder.andWhere("order.id NOT IN (:...settledOrderIds)", { settledOrderIds: settled.orderIds });
    const salesRows = await orderBuilder
      .select("order.merchantId", "merchantId")
      .addSelect("COUNT(order.id)", "orderCount")
      .addSelect("COALESCE(SUM(order.amount), 0)", "orderAmount")
      .addSelect("COALESCE(SUM(CASE WHEN `merchant`.`paymentMode` = :merchantDirect AND `order`.`paymentMethod` <> :balancePayment THEN `order`.`amount` ELSE 0 END), 0)", "merchantDirectCollectionOrderAmount")
      .groupBy("order.merchantId")
      .setParameters({ balancePayment: PaymentMethod.Balance, merchantDirect: "merchant_direct" })
      .getRawMany<{ merchantId: string | null; orderCount: string; orderAmount: string; merchantDirectCollectionOrderAmount: string }>();
    const refundBuilder = this.refunds
      .createQueryBuilder("refund")
      .leftJoin("refund.tenant", "tenant")
      .leftJoin("refund.merchant", "merchant")
      .leftJoin("refund.order", "order")
      .where("refund.status = :status", { status: "approved" });
    if (tenant) this.applyTenantFilter(refundBuilder, "refund", tenant);
    if (merchant) this.applyMerchantFilter(refundBuilder, "refund", merchant);
    if (range.periodStart) refundBuilder.andWhere("COALESCE(refund.completedAt, refund.createdAt) >= :settlementStartAt", { settlementStartAt: `${range.periodStart} 00:00:00` });
    if (range.periodEnd) refundBuilder.andWhere("COALESCE(refund.completedAt, refund.createdAt) <= :settlementEndAt", { settlementEndAt: `${range.periodEnd} 23:59:59` });
    if (settled.refundIds.length) refundBuilder.andWhere("refund.id NOT IN (:...settledRefundIds)", { settledRefundIds: settled.refundIds });
    const refundRows = await refundBuilder
      .select("refund.merchantId", "merchantId")
      .addSelect("COALESCE(SUM(refund.amount), 0)", "refundAmount")
      .addSelect("COALESCE(SUM(CASE WHEN `merchant`.`paymentMode` = :merchantDirect AND `order`.`paymentMethod` <> :balancePayment THEN `refund`.`amount` ELSE 0 END), 0)", "merchantDirectCollectionRefundAmount")
      .groupBy("refund.merchantId")
      .setParameters({ balancePayment: PaymentMethod.Balance, merchantDirect: "merchant_direct" })
      .getRawMany<{ merchantId: string | null; refundAmount: string; merchantDirectCollectionRefundAmount: string }>();
    const commissionBuilder = this.commissions
      .createQueryBuilder("commission")
      .leftJoin("commission.order", "order")
      .where("commission.status IN (:...statuses)", { statuses: ["pending", "settled", "risk_review"] });
    if (tenant) this.applyTenantFilter(commissionBuilder, "commission", tenant);
    if (merchant) this.applyMerchantFilter(commissionBuilder, "commission", merchant);
    if (range.periodStart) commissionBuilder.andWhere("order.completedAt >= :settlementStartAt", { settlementStartAt: `${range.periodStart} 00:00:00` });
    if (range.periodEnd) commissionBuilder.andWhere("order.completedAt <= :settlementEndAt", { settlementEndAt: `${range.periodEnd} 23:59:59` });
    if (settled.commissionIds.length) commissionBuilder.andWhere("commission.id NOT IN (:...settledCommissionIds)", { settledCommissionIds: settled.commissionIds });
    const commissionRows = await commissionBuilder
      .select("commission.merchantId", "merchantId")
      .addSelect("COALESCE(SUM(CASE WHEN commission.status IN ('pending','settled') THEN commission.commissionAmount ELSE 0 END), 0)", "commissionAmount")
      .addSelect("SUM(CASE WHEN commission.status = 'risk_review' THEN 1 ELSE 0 END)", "riskReviewCount")
      .groupBy("commission.merchantId")
      .getRawMany<{ merchantId: string | null; commissionAmount: string; riskReviewCount: string }>();
    const clawbackBuilder = this.commissionAdjustments
      .createQueryBuilder("adjustment");
    if (merchantChargedCommissionIds.length) clawbackBuilder.where("(adjustment.type = :clawbackType OR (adjustment.type = :reductionType AND adjustment.commissionId IN (:...merchantSettledCommissionIds)))", { clawbackType: "clawback_settlement", reductionType: "refund_reduction", merchantSettledCommissionIds: merchantChargedCommissionIds });
    else clawbackBuilder.where("adjustment.type = :clawbackType", { clawbackType: "clawback_settlement" });
    if (tenant) this.applyTenantFilter(clawbackBuilder, "adjustment", tenant);
    if (merchant) this.applyMerchantFilter(clawbackBuilder, "adjustment", merchant);
    if (range.periodStart) clawbackBuilder.andWhere("adjustment.createdAt >= :settlementStartAt", { settlementStartAt: `${range.periodStart} 00:00:00` });
    if (range.periodEnd) clawbackBuilder.andWhere("adjustment.createdAt <= :settlementEndAt", { settlementEndAt: `${range.periodEnd} 23:59:59` });
    if (settled.commissionAdjustmentIds.length) clawbackBuilder.andWhere("adjustment.id NOT IN (:...settledAdjustmentIds)", { settledAdjustmentIds: settled.commissionAdjustmentIds });
    const clawbackRows = await clawbackBuilder
      .select("adjustment.merchantId", "merchantId")
      .addSelect("COALESCE(SUM(adjustment.amount), 0)", "commissionClawbackAmount")
      .groupBy("adjustment.merchantId")
      .getRawMany<{ merchantId: string | null; commissionClawbackAmount: string }>();
    const merchantIds = Array.from(new Set([...salesRows, ...refundRows, ...commissionRows, ...clawbackRows].map((row) => Number(row.merchantId || 0)).filter(Boolean)));
    const merchantRows = merchantIds.length ? await this.merchants.find({ where: { id: In(merchantIds) } }) : [];
    const salesMap = new Map(salesRows.map((row) => [Number(row.merchantId || 0), row]));
    const refundMap = new Map(refundRows.map((row) => [Number(row.merchantId || 0), Number(row.refundAmount || 0)]));
    const merchantDirectRefundMap = new Map(refundRows.map((row) => [Number(row.merchantId || 0), Number(row.merchantDirectCollectionRefundAmount || 0)]));
    const commissionMap = new Map(commissionRows.map((row) => [Number(row.merchantId || 0), Number(row.commissionAmount || 0)]));
    const commissionRiskMap = new Map(commissionRows.map((row) => [Number(row.merchantId || 0), Number(row.riskReviewCount || 0)]));
    const clawbackMap = new Map(clawbackRows.map((row) => [Number(row.merchantId || 0), Number(row.commissionClawbackAmount || 0)]));
    return merchantIds.map((merchantId) => {
      const row = salesMap.get(merchantId);
      const orderAmount = Number(row?.orderAmount || 0);
      const refundAmount = refundMap.get(merchantId) || 0;
      const merchantDirectOrderAmount = Number(row?.merchantDirectCollectionOrderAmount || 0);
      const merchantDirectRefundAmount = merchantDirectRefundMap.get(merchantId) || 0;
      const commissionAmount = commissionMap.get(merchantId) || 0;
      const commissionClawbackAmount = clawbackMap.get(merchantId) || 0;
      const merchantRow = merchantRows.find((item) => item.id === merchantId) || null;
      const amounts = calculateMallSettlementAmounts({ orderFen: yuanToFen(orderAmount.toFixed(2)), refundFen: yuanToFen(refundAmount.toFixed(2)), merchantDirectOrderFen: yuanToFen(merchantDirectOrderAmount.toFixed(2)), merchantDirectRefundFen: yuanToFen(merchantDirectRefundAmount.toFixed(2)), serviceFeeBps: this.mallSettlementServiceFeeBps(merchantRow), commissionFen: yuanToFen(commissionAmount.toFixed(2)), commissionClawbackFen: yuanToFen(commissionClawbackAmount.toFixed(2)) });
      return {
        merchant: merchantRow,
        orderCount: Number(row?.orderCount || 0),
        orderAmount: orderAmount.toFixed(2),
        refundAmount: refundAmount.toFixed(2),
        netAmount: fenToYuan(amounts.netFen),
        merchantDirectAmount: fenToYuan(amounts.merchantDirectFen),
        platformCollectedAmount: fenToYuan(amounts.platformCollectedFen),
        serviceFeeRate: this.mallSettlementServiceFeeRate(merchantRow),
        serviceFeeAmount: fenToYuan(amounts.serviceFeeFen),
        commissionAmount: fenToYuan(amounts.commissionFen),
        commissionClawbackAmount: fenToYuan(amounts.commissionClawbackFen),
        riskReviewCount: commissionRiskMap.get(merchantId) || 0,
        payableAmount: fenToYuan(amounts.payableFen),
        paymentMode: merchantRow?.paymentMode || "platform_collect",
        settlementStatus: "pending_statement"
      };
    });
  }

  async publicPaymentMethods(query: MallListQueryDto = {}, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = query.merchantId ? await this.publicTargetMerchant(tenant, query.merchantId) : null;
    const setting = await this.operationSettings.findOne({ where: { tenant: { id: tenant.id } } });
    const methods = this.normalizePaymentMethods(setting?.paymentMethods);
    const wechat = await this.mallWechatPaymentReadinessForMerchant(tenant, merchant, methods);
    const wechatEnabled = await this.paymentProvider.usesRealProvider("wechat") ? wechat.status === "real_ready" : ["sandbox_ready", "real_ready"].includes(wechat.status);
    const wechatDisabledReason = wechatEnabled ? "" : this.publicWechatPaymentDisabledReason(wechat);
    return [
      { value: PaymentMethod.Balance, name: "余额支付", desc: "使用账户余额立即支付", enabled: methods.balance, status: methods.balance ? "ready" : "disabled", disabledReason: methods.balance ? "" : "后台未开启余额支付", paymentRoute: "wallet_balance", paymentRouteText: "余额支付：平台钱包扣款" },
      { value: PaymentMethod.Offline, name: "线下收款", desc: "提交订单后由后台财务确认", enabled: methods.offline, status: methods.offline ? "ready" : "disabled", disabledReason: methods.offline ? "" : "后台未开启线下收款", paymentRoute: "offline_confirmation", paymentRouteText: "线下收款：后台确认" },
      {
        value: PaymentMethod.Wechat,
        name: "微信支付",
        desc: wechatEnabled ? (wechat.status === "real_ready" ? `${wechat.collectionMode === "merchant_direct" ? "店铺直收" : "平台代收"}，支付成功后自动入账` : "微信支付沙箱验收模式") : "微信支付暂未开放",
        enabled: wechatEnabled,
        status: wechat.status,
        collectionMode: wechat.collectionMode,
        collectionModeText: this.mallPaymentModeText(wechat.collectionMode),
        merchant: this.publicMerchantSummary(merchant),
        paymentRoute: wechat.collectionMode === "merchant_direct" ? "merchant_direct_wechat" : "platform_collect_wechat",
        paymentRouteText: wechat.collectionMode === "merchant_direct" ? "微信支付：店铺商户直收" : "微信支付：平台代收",
        disabledReason: wechatDisabledReason,
        nextAction: wechatEnabled ? "" : wechatDisabledReason
      }
    ];
  }

  async exportAdminOrders(query: MallListQueryDto, admin?: AdminContext) {
    const { items } = await this.adminOrderRows({ ...query, page: 1, pageSize: 500 }, admin);
    const rows = await Promise.all(items.map((order) => this.publicOrderWithItems(order, undefined, false)));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商城订单");
    sheet.columns = [
      { header: "订单号", key: "orderNo", width: 28 },
      { header: "商家", key: "tenant", width: 22 },
      { header: "商家编码", key: "tenantCode", width: 18 },
      { header: "结算组号", key: "checkoutGroupNo", width: 24 },
      { header: "结算组状态", key: "checkoutGroupStatus", width: 16 },
      { header: "店铺ID", key: "merchantId", width: 10 },
      { header: "店铺名称", key: "merchantName", width: 22 },
      { header: "店铺编码", key: "merchantCode", width: 20 },
      { header: "店铺类型", key: "merchantOwnerType", width: 12 },
      { header: "店铺区域", key: "merchantRegion", width: 18 },
      { header: "收款模式", key: "paymentMode", width: 14 },
      { header: "用户手机", key: "phone", width: 16 },
      { header: "商品明细", key: "items", width: 44 },
      { header: "商品金额", key: "goodsAmount", width: 12 },
      { header: "优惠金额", key: "discountAmount", width: 12 },
      { header: "积分抵扣", key: "pointsDiscountAmount", width: 12 },
      { header: "使用积分", key: "pointsUsed", width: 12 },
      { header: "实付金额", key: "amount", width: 12 },
      { header: "优惠券", key: "coupon", width: 18 },
      { header: "已通过退款", key: "approvedRefundAmount", width: 14 },
      { header: "净收金额", key: "netAmount", width: 12 },
      { header: "支付方式", key: "paymentMethod", width: 14 },
      { header: "状态", key: "status", width: 16 },
      { header: "售后状态", key: "refundStatus", width: 14 },
      { header: "退款渠道状态", key: "providerRefundStatus", width: 16 },
      { header: "退款渠道单号", key: "providerRefundNo", width: 28 },
      { header: "售后原因", key: "refundReason", width: 28 },
      { header: "售后审核备注", key: "refundReviewRemark", width: 28 },
      { header: "收货人", key: "receiverName", width: 14 },
      { header: "收货电话", key: "receiverPhone", width: 16 },
      { header: "省份", key: "province", width: 12 },
      { header: "城市", key: "city", width: 12 },
      { header: "区县", key: "district", width: 12 },
      { header: "收货地址", key: "address", width: 44 },
      { header: "物流公司", key: "expressCompany", width: 16 },
      { header: "快递单号", key: "expressNo", width: 20 },
      { header: "推广码", key: "promotionCode", width: 16 },
      { header: "推广人", key: "promoter", width: 18 },
      { header: "佣金比例", key: "commissionRate", width: 12 },
      { header: "买家备注", key: "buyerRemark", width: 24 },
      { header: "后台备注", key: "adminRemark", width: 24 },
      { header: "交易号", key: "transactionNo", width: 28 },
      { header: "支付时间", key: "paidAt", width: 22 },
      { header: "发货时间", key: "shippedAt", width: 22 },
      { header: "完成时间", key: "completedAt", width: 22 },
      { header: "关闭时间", key: "closedAt", width: 22 },
      { header: "关闭原因", key: "closeReason", width: 28 },
      { header: "创建时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) => {
      const address = row.addressSnapshot || {};
      const promotion = (row.promotionSnapshot || {}) as Record<string, unknown>;
      const approvedRefundAmount = row.refund?.status === "approved" ? Number(row.refund.amount || 0) : 0;
      const netAmount = Math.max(Number(row.amount || 0) - approvedRefundAmount, 0);
      sheet.addRow({
        orderNo: row.orderNo,
        tenant: row.tenant?.name || row.tenant?.code || "-",
        tenantCode: row.tenant?.code || "",
        checkoutGroupNo: row.checkoutGroup?.groupNo || "",
        checkoutGroupStatus: row.checkoutGroup?.status ? this.mallCheckoutGroupStatusText(row.checkoutGroup.status) : "",
        merchantId: row.merchant?.id || "",
        merchantName: row.merchant?.name || "",
        merchantCode: row.merchant?.code || "",
        merchantOwnerType: row.merchant?.ownerType === "agent" ? "代理店铺" : row.merchant?.ownerType === "tenant" ? "商家店铺" : "",
        merchantRegion: row.merchant?.region || "",
        paymentMode: this.mallPaymentModeText(row.merchant?.paymentMode || "platform_collect"),
        phone: row.user?.phone || row.user?.nickname || "-",
        items: (row.items || []).map((item) => `${item.productTitle}/${item.skuName} x ${item.quantity}`).join("\n"),
        goodsAmount: row.goodsAmount,
        discountAmount: row.discountAmount,
        pointsDiscountAmount: row.pointsDiscountAmount || "0.00",
        pointsUsed: row.pointsUsed || 0,
        amount: row.amount,
        coupon: row.couponSnapshot ? `${(row.couponSnapshot as any).name || ""} ${(row.couponSnapshot as any).code || ""}`.trim() : "",
        approvedRefundAmount: approvedRefundAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        paymentMethod: this.paymentMethodText(row.paymentMethod),
        status: this.mallOrderStatusText(row.status),
        refundStatus: row.refund ? (row.refund.status === "pending" ? "待处理" : row.refund.status === "approved" ? "已通过" : "已拒绝") : "",
        providerRefundStatus: row.refund?.providerRefundStatus || "",
        providerRefundNo: row.refund?.providerRefundNo || "",
        refundReason: row.refund?.reason || "",
        refundReviewRemark: row.refund?.reviewRemark || "",
        receiverName: address.receiverName || "",
        receiverPhone: address.receiverPhone || "",
        province: address.province || "",
        city: address.city || "",
        district: address.district || "",
        address: [address.receiverName, address.receiverPhone, address.province, address.city, address.district, address.detail].filter(Boolean).join(" "),
        expressCompany: row.expressCompany || "",
        expressNo: row.expressNo || "",
        promotionCode: row.promotionCode || "",
        promoter: promotion.promoterPhone || promotion.agentName || "",
        commissionRate: promotion.commissionRate !== undefined && promotion.commissionRate !== null ? promotion.commissionRate : "",
        buyerRemark: row.buyerRemark || "",
        adminRemark: row.adminRemark || "",
        transactionNo: row.transactionNo || "",
        paidAt: row.paidAt || "",
        shippedAt: row.shippedAt || "",
        completedAt: row.completedAt || "",
        closedAt: row.closedAt || "",
        closeReason: row.closeReason || "",
        createdAt: row.createdAt
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async exportAdminRefunds(query: MallListQueryDto, admin?: AdminContext) {
    const rows = await this.adminRefunds(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商城售后");
    sheet.columns = [
      { header: "售后单号", key: "refundNo", width: 28 },
      { header: "订单号", key: "orderNo", width: 28 },
      { header: "结算组号", key: "checkoutGroupNo", width: 24 },
      { header: "商家", key: "tenant", width: 22 },
      { header: "商家编码", key: "tenantCode", width: 18 },
      { header: "用户手机", key: "phone", width: 16 },
      { header: "支付方式", key: "paymentMethod", width: 14 },
      { header: "售后类型", key: "type", width: 14 },
      { header: "售后状态", key: "status", width: 14 },
      { header: "退款金额", key: "amount", width: 12 },
      { header: "退款原因", key: "reason", width: 36 },
      { header: "售后商品", key: "items", width: 52 },
      { header: "责任归属", key: "responsibility", width: 14 },
      { header: "退货地址", key: "returnAddress", width: 48 },
      { header: "买家寄回物流", key: "returnExpress", width: 28 },
      { header: "换货物流", key: "exchangeExpress", width: 28 },
      { header: "协商记录", key: "messages", width: 60 },
      { header: "凭证图片", key: "images", width: 60 },
      { header: "退款渠道状态", key: "providerRefundStatus", width: 18 },
      { header: "退款渠道单号", key: "providerRefundNo", width: 28 },
      { header: "失败原因", key: "providerRefundFailureReason", width: 36 },
      { header: "重试次数", key: "providerRefundRetryCount", width: 10 },
      { header: "审核人", key: "reviewedBy", width: 16 },
      { header: "审核备注", key: "reviewRemark", width: 36 },
      { header: "审核时间", key: "reviewedAt", width: 22 },
      { header: "完成时间", key: "completedAt", width: 22 },
      { header: "申请时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) => {
      sheet.addRow({
        refundNo: row.refundNo,
        orderNo: row.order?.orderNo || "",
        checkoutGroupNo: row.order?.checkoutGroup?.groupNo || "",
        tenant: row.tenant?.name || row.tenant?.code || "-",
        tenantCode: row.tenant?.code || "",
        phone: row.user?.phone || row.user?.nickname || "-",
        paymentMethod: this.paymentMethodText(row.order?.paymentMethod || ""),
        type: row.type === "return_refund" ? "退货退款" : row.type === "exchange" ? "换货" : "仅退款",
        status: this.mallRefundStatusText(row.status),
        amount: row.amount,
        reason: row.reason || "",
        items: (row.items || []).map((item: any) => `${item.itemSnapshot?.productTitle || "商品"} ${item.itemSnapshot?.skuName || ""} × ${item.requestedQuantity}`).join("\n"),
        responsibility: ({ undetermined: "待判定", buyer: "买家责任", merchant: "商家责任", logistics: "物流责任", platform: "平台责任" } as Record<string, string>)[row.responsibility] || row.responsibility || "待判定",
        returnAddress: row.returnAddressSnapshot ? [row.returnAddressSnapshot.receiverName, row.returnAddressSnapshot.receiverPhone, row.returnAddressSnapshot.province, row.returnAddressSnapshot.city, row.returnAddressSnapshot.district, row.returnAddressSnapshot.detail].filter(Boolean).join(" ") : "",
        returnExpress: row.returnExpressNo ? `${row.returnExpressCompany || "快递"} ${row.returnExpressNo}` : "",
        exchangeExpress: row.exchangeShipment ? `${row.exchangeShipment.expressCompany || "快递"} ${row.exchangeShipment.expressNo}` : "",
        messages: (row.messages || []).map((message: any) => `${message.actorName || message.actorType}：${message.content}`).join("\n"),
        images: Array.isArray(row.images) ? row.images.join("\n") : "",
        providerRefundStatus: row.providerRefundStatus || "",
        providerRefundNo: row.providerRefundNo || "",
        providerRefundFailureReason: row.providerRefundFailureReason || "",
        providerRefundRetryCount: row.providerRefundRetryCount || 0,
        reviewedBy: row.reviewedBy || "",
        reviewRemark: row.reviewRemark || "",
        reviewedAt: row.reviewedAt || "",
        completedAt: row.completedAt || "",
        createdAt: row.createdAt
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async adminInventoryLogs(query: MallListQueryDto & { skuId?: number }, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "product.manage");
    const builder = this.inventoryLogs.createQueryBuilder("log").leftJoinAndSelect("log.tenant", "tenant").leftJoinAndSelect("log.merchant", "merchant").leftJoinAndSelect("log.sku", "sku").leftJoinAndSelect("sku.product", "product").leftJoinAndSelect("log.order", "order").orderBy("log.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "log", tenant);
    if (merchant) this.applyMerchantFilter(builder, "log", merchant);
    if (query.skuId) builder.andWhere("sku.id = :skuId", { skuId: Number(query.skuId) });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR sku.name LIKE :keyword OR order.orderNo LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(200).getMany();
  }

  async adminInventoryAnomalies(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "product.manage");
    const builder = this.inventoryAnomalies.createQueryBuilder("anomaly")
      .leftJoinAndSelect("anomaly.tenant", "tenant")
      .leftJoinAndSelect("anomaly.merchant", "merchant")
      .leftJoinAndSelect("anomaly.sku", "sku")
      .leftJoinAndSelect("sku.product", "product")
      .addSelect("CASE WHEN anomaly.status = 'open' THEN 0 ELSE 1 END", "statusPriority")
      .orderBy("statusPriority", "ASC")
      .addOrderBy("anomaly.lastDetectedAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "anomaly", tenant);
    if (merchant) this.applyMerchantFilter(builder, "anomaly", merchant);
    if (query.status) builder.andWhere("anomaly.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(anomaly.title LIKE :keyword OR anomaly.message LIKE :keyword OR product.title LIKE :keyword OR sku.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 50), 1), 200);
    const [items, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items, total, page, pageSize, openCount: await this.inventoryAnomalyOpenCount(tenant?.id, merchant?.id) };
  }

  async scanInventoryGovernance(query: MallListQueryDto = {}, admin?: AdminContext, system = false) {
    const scope = system
      ? { tenant: null as Tenant | null, merchant: null as MallMerchant | null }
      : await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, "product.manage");
    const skuBuilder = this.skus.createQueryBuilder("sku")
      .leftJoinAndSelect("sku.tenant", "tenant")
      .leftJoinAndSelect("sku.merchant", "merchant")
      .leftJoinAndSelect("sku.product", "product")
      .orderBy("sku.id", "ASC");
    if (scope.tenant) this.applyTenantFilter(skuBuilder, "sku", scope.tenant);
    if (scope.merchant) this.applyMerchantFilter(skuBuilder, "sku", scope.merchant);
    const skus = await skuBuilder.getMany();
    const skuIds = skus.map((sku) => sku.id);
    const expectedLockedRows = skuIds.length ? await this.orderItems.createQueryBuilder("item")
      .innerJoin("item.order", "order")
      .select("item.skuId", "skuId")
      .addSelect("COALESCE(SUM(item.quantity), 0)", "quantity")
      .where("item.skuId IN (:...skuIds)", { skuIds })
      .andWhere("order.status IN (:...statuses)", { statuses: ["pending_payment", "pending_confirm"] })
      .groupBy("item.skuId")
      .getRawMany<{ skuId: string; quantity: string }>() : [];
    const expectedLocked = new Map(expectedLockedRows.map((row) => [Number(row.skuId), Number(row.quantity || 0)]));
    const detected = new Set<string>();
    let issueCount = 0;
    for (const sku of skus) {
      const issues = detectMallSkuInventoryIssues({ stock: sku.stock, lockedStock: sku.lockedStock, expectedLockedStock: expectedLocked.get(sku.id) || 0 });
      for (const issue of issues) {
        const fingerprint = this.inventoryAnomalyFingerprint(sku.tenant.id, "sku", sku.id, issue.type);
        detected.add(fingerprint);
        issueCount += 1;
        await this.recordInventoryAnomaly({ fingerprint, issue, tenant: sku.tenant, merchant: sku.merchant || sku.product?.merchant || null, sku, sourceType: "sku", sourceId: String(sku.id) });
      }
    }

    const flashBuilder = this.flashSales.createQueryBuilder("activity").leftJoinAndSelect("activity.tenant", "tenant").leftJoinAndSelect("activity.merchant", "merchant").leftJoinAndSelect("activity.sku", "sku");
    if (scope.tenant) this.applyTenantFilter(flashBuilder, "activity", scope.tenant);
    if (scope.merchant) this.applyMerchantFilter(flashBuilder, "activity", scope.merchant);
    const groupBuilder = this.groupBuys.createQueryBuilder("activity").leftJoinAndSelect("activity.tenant", "tenant").leftJoinAndSelect("activity.merchant", "merchant").leftJoinAndSelect("activity.sku", "sku");
    if (scope.tenant) this.applyTenantFilter(groupBuilder, "activity", scope.tenant);
    if (scope.merchant) this.applyMerchantFilter(groupBuilder, "activity", scope.merchant);
    const [flashSales, groupBuys] = await Promise.all([flashBuilder.getMany(), groupBuilder.getMany()]);
    for (const sale of flashSales) {
      for (const issue of detectMallPromotionInventoryIssues("flash_sale", { capacity: sale.saleStock, lockedStock: sale.lockedStock, soldStock: sale.soldStock })) {
        const fingerprint = this.inventoryAnomalyFingerprint(sale.tenant.id, "flash_sale", sale.id, issue.type);
        detected.add(fingerprint);
        issueCount += 1;
        await this.recordInventoryAnomaly({ fingerprint, issue, tenant: sale.tenant, merchant: sale.merchant, sku: sale.sku, sourceType: "flash_sale", sourceId: String(sale.id) });
      }
    }
    for (const group of groupBuys) {
      for (const issue of detectMallPromotionInventoryIssues("group_buy", { capacity: group.groupStock, lockedStock: group.lockedStock, soldStock: group.soldStock })) {
        const fingerprint = this.inventoryAnomalyFingerprint(group.tenant.id, "group_buy", group.id, issue.type);
        detected.add(fingerprint);
        issueCount += 1;
        await this.recordInventoryAnomaly({ fingerprint, issue, tenant: group.tenant, merchant: group.merchant, sku: group.sku, sourceType: "group_buy", sourceId: String(group.id) });
      }
    }
    await this.resolveRecoveredInventoryAnomalies(detected, scope.tenant?.id, scope.merchant?.id);
    if (!system) await this.logOperation(admin, "mall.inventory.scan", "mall_inventory", scope.merchant?.id || scope.tenant?.id || "all", `执行库存一致性扫描：SKU ${skus.length} 个，营销活动 ${flashSales.length + groupBuys.length} 个，发现 ${issueCount} 项异常`, scope.tenant?.id);
    return { scannedSkuCount: skus.length, scannedPromotionCount: flashSales.length + groupBuys.length, issueCount, openCount: await this.inventoryAnomalyOpenCount(scope.tenant?.id, scope.merchant?.id) };
  }

  async resolveInventoryAnomaly(id: number, dto: MallInventoryAnomalyResolveDto, admin?: AdminContext) {
    const anomaly = await this.inventoryAnomalies.findOne({ where: { id } });
    if (!anomaly) throw new NotFoundException("库存异常不存在");
    this.assertAdminTenantAccess(anomaly, admin);
    await this.assertAdminRowMerchantAccess(anomaly, admin, "库存异常", "product.manage");
    if (anomaly.status !== "open") return { ...anomaly, idempotent: true };
    const remark = this.optionalString(dto.remark) || (dto.action === "repair" ? "按当前待履约订单和库存约束自动修复" : "人工确认忽略本次异常");
    const saved = await this.dataSource.transaction(async (manager) => {
      const anomalyRepo = manager.getRepository(MallInventoryAnomaly);
      const lockedAnomaly = await anomalyRepo.findOne({ where: { id }, relations: ["tenant", "merchant", "sku"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!lockedAnomaly || lockedAnomaly.status !== "open") return lockedAnomaly || anomaly;
      if (dto.action === "repair") await this.repairInventoryAnomaly(manager, lockedAnomaly, remark);
      lockedAnomaly.status = dto.action === "repair" ? "resolved" : "ignored";
      lockedAnomaly.resolvedByAdminId = admin?.id || null;
      lockedAnomaly.resolvedBy = admin?.username || "system";
      lockedAnomaly.resolvedAt = new Date();
      lockedAnomaly.resolutionRemark = remark;
      return anomalyRepo.save(lockedAnomaly);
    });
    await this.logOperation(admin, dto.action === "repair" ? "mall.inventory.anomaly.repair" : "mall.inventory.anomaly.ignore", "mall_inventory_anomaly", id, `${dto.action === "repair" ? "修复" : "忽略"}库存异常：${anomaly.title}；${remark}`, anomaly.tenant.id);
    return saved;
  }

  private async inventoryAnomalyOpenCount(tenantId?: number, merchantId?: number) {
    const builder = this.inventoryAnomalies.createQueryBuilder("anomaly").where("anomaly.status = :status", { status: "open" });
    if (tenantId) builder.andWhere("anomaly.tenantId = :tenantId", { tenantId });
    if (merchantId) builder.andWhere("anomaly.merchantId = :merchantId", { merchantId });
    return builder.getCount();
  }

  private inventoryAnomalyFingerprint(tenantId: number, sourceType: string, sourceId: number | string, type: string) {
    return `tenant:${tenantId}:${sourceType}:${sourceId}:${type}`;
  }

  private async recordInventoryAnomaly(input: { fingerprint: string; issue: ReturnType<typeof detectMallSkuInventoryIssues>[number]; tenant: Tenant; merchant: MallMerchant | null; sku: MallSku | null; sourceType: string; sourceId: string }) {
    const now = new Date();
    let row = await this.inventoryAnomalies.findOne({ where: { fingerprint: input.fingerprint } });
    if (!row) row = this.inventoryAnomalies.create({ fingerprint: input.fingerprint, tenant: input.tenant, merchant: input.merchant, sku: input.sku, sourceType: input.sourceType, sourceId: input.sourceId, firstDetectedAt: now, occurrenceCount: 0 });
    row.type = input.issue.type;
    row.severity = input.issue.severity;
    row.status = "open";
    row.title = input.issue.title;
    row.message = input.issue.message;
    row.expectedState = input.issue.expectedState;
    row.actualState = input.issue.actualState;
    row.lastDetectedAt = now;
    row.occurrenceCount = Number(row.occurrenceCount || 0) + 1;
    row.resolvedByAdminId = null;
    row.resolvedBy = null;
    row.resolvedAt = null;
    row.resolutionRemark = null;
    await this.inventoryAnomalies.save(row);
  }

  private async resolveRecoveredInventoryAnomalies(detected: Set<string>, tenantId?: number, merchantId?: number) {
    const builder = this.inventoryAnomalies.createQueryBuilder("anomaly").where("anomaly.status = :status", { status: "open" });
    if (tenantId) builder.andWhere("anomaly.tenantId = :tenantId", { tenantId });
    if (merchantId) builder.andWhere("anomaly.merchantId = :merchantId", { merchantId });
    const openRows = await builder.getMany();
    const recovered = openRows.filter((row) => !detected.has(row.fingerprint));
    for (const row of recovered) {
      row.status = "resolved";
      row.resolvedBy = "system";
      row.resolvedAt = new Date();
      row.resolutionRemark = "一致性扫描确认异常已恢复";
    }
    if (recovered.length) await this.inventoryAnomalies.save(recovered);
  }

  private async repairInventoryAnomaly(manager: Pick<DataSource["manager"], "getRepository">, anomaly: MallInventoryAnomaly, remark: string) {
    const inventoryRepo = manager.getRepository(MallInventoryLog);
    const operationKey = `anomaly:${anomaly.id}:repair:${anomaly.occurrenceCount}`;
    if (await inventoryRepo.findOne({ where: { tenant: { id: anomaly.tenant.id }, operationKey }, loadEagerRelations: false })) return;
    if (anomaly.sourceType === "sku") {
      const skuRepo = manager.getRepository(MallSku);
      const sku = await skuRepo.findOne({ where: { id: Number(anomaly.sourceId) }, relations: ["tenant", "merchant", "product"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!sku) throw new NotFoundException("待修复的商品规格不存在");
      const pending = await manager.getRepository(MallOrderItem).createQueryBuilder("item").innerJoin("item.order", "order").select("COALESCE(SUM(item.quantity), 0)", "quantity").where("item.skuId = :skuId", { skuId: sku.id }).andWhere("order.status IN (:...statuses)", { statuses: ["pending_payment", "pending_confirm"] }).getRawOne<{ quantity: string }>();
      const next = repairMallSkuInventoryState({ stock: sku.stock, lockedStock: sku.lockedStock, expectedLockedStock: Number(pending?.quantity || 0) });
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      sku.stock = next.stock;
      sku.lockedStock = next.lockedStock;
      await skuRepo.update(sku.id, { stock: sku.stock });
      await inventoryRepo.save(inventoryRepo.create({ tenant: sku.tenant, merchant: sku.merchant || sku.product?.merchant || null, sku, order: null, type: "adjust", operationKey, sourceType: "inventory_anomaly", sourceId: String(anomaly.id), quantity: sku.stock - beforeStock, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark }));
      return;
    }
    if (anomaly.sourceType === "flash_sale") {
      const repo = manager.getRepository(MallFlashSale);
      const row = await repo.findOne({ where: { id: Number(anomaly.sourceId) }, relations: ["tenant", "merchant", "sku"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("待修复的秒杀活动不存在");
      const before = { capacity: row.saleStock, lockedStock: row.lockedStock, soldStock: row.soldStock };
      const next = repairMallPromotionInventoryState(before);
      row.saleStock = next.capacity; row.lockedStock = next.lockedStock; row.soldStock = next.soldStock;
      await repo.save(row);
      await inventoryRepo.save(inventoryRepo.create({ tenant: row.tenant, merchant: row.merchant, sku: row.sku, order: null, type: "adjust", operationKey, sourceType: "inventory_anomaly", sourceId: String(anomaly.id), quantity: next.capacity - before.capacity, stockBefore: before.capacity, stockAfter: next.capacity, lockedBefore: before.lockedStock, lockedAfter: next.lockedStock, remark }));
      return;
    }
    if (anomaly.sourceType === "group_buy") {
      const repo = manager.getRepository(MallGroupBuy);
      const row = await repo.findOne({ where: { id: Number(anomaly.sourceId) }, relations: ["tenant", "merchant", "sku"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("待修复的拼团活动不存在");
      const before = { capacity: row.groupStock, lockedStock: row.lockedStock, soldStock: row.soldStock };
      const next = repairMallPromotionInventoryState(before);
      row.groupStock = next.capacity; row.lockedStock = next.lockedStock; row.soldStock = next.soldStock;
      await repo.save(row);
      await inventoryRepo.save(inventoryRepo.create({ tenant: row.tenant, merchant: row.merchant, sku: row.sku, order: null, type: "adjust", operationKey, sourceType: "inventory_anomaly", sourceId: String(anomaly.id), quantity: next.capacity - before.capacity, stockBefore: before.capacity, stockAfter: next.capacity, lockedBefore: before.lockedStock, lockedAfter: next.lockedStock, remark }));
      return;
    }
    throw new BadRequestException("当前库存异常类型不支持自动修复");
  }

  async adjustSkuStock(id: number, dto: MallInventoryAdjustDto, admin?: AdminContext) {
    const nextStock = Math.trunc(Number(dto.stock));
    if (!Number.isFinite(nextStock) || nextStock < 0) throw new BadRequestException("库存必须是大于等于 0 的整数");
    const remark = this.requiredString(dto.remark, "调整原因");
    const skuId = Number(id);
    const savedSku = await this.dataSource.transaction(async (manager) => {
      const skuRepo = manager.getRepository(MallSku);
      const inventoryRepo = manager.getRepository(MallInventoryLog);
      const sku = await skuRepo.findOne({ where: { id: skuId }, lock: { mode: "pessimistic_write" } });
      if (!sku) throw new NotFoundException("商品规格不存在");
      this.assertAdminTenantAccess(sku, admin);
      await this.assertAdminRowMerchantAccess({ tenant: sku.tenant, merchant: sku.merchant || sku.product?.merchant || null }, admin, "商品规格", "product.manage");
      const businessKey = this.optionalString(dto.businessKey)?.slice(0, 100) || `${Date.now()}`;
      const operationKey = `admin-adjust:${sku.id}:${businessKey}`;
      const existing = await inventoryRepo.findOne({ where: { tenant: { id: sku.tenant.id }, operationKey }, loadEagerRelations: false });
      if (existing) return sku;
      if (nextStock < Number(sku.lockedStock || 0)) throw new BadRequestException("目标库存不能小于当前已锁定库存");
      const beforeStock = Number(sku.stock || 0);
      const beforeLocked = Number(sku.lockedStock || 0);
      sku.stock = nextStock;
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: sku.tenant, merchant: sku.merchant || sku.product?.merchant || null, sku, order: null, type: "adjust", operationKey, sourceType: "admin_adjust", sourceId: businessKey, quantity: nextStock - beforeStock, stockBefore: beforeStock, stockAfter: nextStock, lockedBefore: beforeLocked, lockedAfter: beforeLocked, remark }));
      return sku;
    });
    await this.logOperation(admin, "mall.inventory.adjust", "mall_sku", savedSku.id, `调整商城库存：${savedSku.product.title}/${savedSku.name} ${savedSku.stock}`, savedSku.tenant.id);
    return this.productDetail(savedSku.product.id, admin);
  }

  private async adminOrderRows(query: MallListQueryDto, admin?: AdminContext) {
    const builder = await this.adminOrderBaseQuery(query, admin);
    builder.orderBy("order.createdAt", "DESC");
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const [items, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items, total, page, pageSize };
  }

  private async adminOrderBaseQuery(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, ["order.view", "order.manage"]);
    const builder = this.orders.createQueryBuilder("order").leftJoinAndSelect("order.tenant", "tenant").leftJoinAndSelect("order.merchant", "merchant").leftJoinAndSelect("order.checkoutGroup", "checkoutGroup").leftJoinAndSelect("order.user", "user");
    if (tenant) this.applyTenantFilter(builder, "order", tenant);
    if (merchant) this.applyMerchantFilter(builder, "order", merchant);
    if (query.status) builder.andWhere("order.status = :status", { status: query.status });
    if (query.paymentMethod) builder.andWhere("order.paymentMethod = :paymentMethod", { paymentMethod: query.paymentMethod });
    if (query.refundStatus === "none") {
      builder.andWhere("NOT EXISTS (SELECT 1 FROM mall_refunds refund_filter WHERE refund_filter.orderId = order.id)");
    } else if (query.refundStatus) {
      builder.andWhere("EXISTS (SELECT 1 FROM mall_refunds refund_filter WHERE refund_filter.orderId = order.id AND refund_filter.status = :refundStatus)", { refundStatus: query.refundStatus });
    }
    this.applyDateRangeFilter(builder, "order", query);
    if (query.keyword?.trim()) builder.andWhere("(order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    if (query.checkoutGroupNo?.trim()) builder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    return builder;
  }

  private applyDateRangeFilter(builder: SelectQueryBuilder<any>, alias: string, query: MallListQueryDto) {
    const start = query.startDate ? new Date(`${query.startDate}T00:00:00+08:00`) : null;
    const end = query.endDate ? new Date(`${query.endDate}T23:59:59+08:00`) : null;
    if (start && !Number.isNaN(start.getTime())) builder.andWhere(`${alias}.createdAt >= :startDate`, { startDate: start });
    if (end && !Number.isNaN(end.getTime())) builder.andWhere(`${alias}.createdAt <= :endDate`, { endDate: end });
  }

  async adminConfirmOffline(id: number, admin?: AdminContext) {
    const order = await this.findAdminOrder(id, admin, "order.manage");
    if (order.paymentMethod !== PaymentMethod.Offline) throw new BadRequestException("当前订单不能确认线下收款");
    if (order.status === "paid") return this.publicOrderWithItems(order);
    if (order.status !== "pending_confirm") throw new BadRequestException("当前订单不能确认线下收款");
    const savedOrder = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(MallOrder);
      const paymentTxRepo = manager.getRepository(MallPaymentTransaction);
      const lockedOrder = await orderRepo.findOne({ where: { id: order.id }, relations: ["tenant", "merchant", "checkoutGroup", "user", "coupon"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!lockedOrder) throw new NotFoundException("商城订单不存在");
      if (lockedOrder.status === "paid") {
        if (lockedOrder.transactionNo && !(await paymentTxRepo.findOne({ where: { transactionNo: lockedOrder.transactionNo } }))) {
          await paymentTxRepo.save(paymentTxRepo.create({ order: lockedOrder, tenant: lockedOrder.tenant, merchant: lockedOrder.merchant || null, transactionNo: lockedOrder.transactionNo, provider: "offline", paymentMethod: PaymentMethod.Offline, amount: Number(lockedOrder.amount || 0).toFixed(2), status: "success", reconciliationStatus: "matched", remark: "线下收款确认流水补录" }));
        }
        return lockedOrder;
      }
      if (lockedOrder.paymentMethod !== PaymentMethod.Offline || lockedOrder.status !== "pending_confirm") throw new BadRequestException("当前订单不能确认线下收款");
      lockedOrder.status = "paid";
      lockedOrder.paidAt = new Date();
      lockedOrder.expiresAt = null;
      lockedOrder.transactionNo = `MALOFF${Date.now()}${lockedOrder.id}`;
      await orderRepo.save(lockedOrder);
      await paymentTxRepo.save(paymentTxRepo.create({ order: lockedOrder, tenant: lockedOrder.tenant, merchant: lockedOrder.merchant || null, transactionNo: lockedOrder.transactionNo, provider: "offline", paymentMethod: PaymentMethod.Offline, amount: Number(lockedOrder.amount || 0).toFixed(2), status: "success", reconciliationStatus: "matched", remark: "后台确认商城线下收款" }));
      await this.recordMallOrderEvent(manager, lockedOrder, { eventKey: `paid:offline:${lockedOrder.transactionNo}`, eventType: "payment_confirmed", fromStatus: "pending_confirm", toStatus: "paid", source: "admin", operator: admin?.username || String(admin?.id || "admin"), remark: "后台确认线下收款", detail: { transactionNo: lockedOrder.transactionNo, amount: lockedOrder.amount } });
      await this.updateGroupBuyRecordsForOrder(manager, lockedOrder, "paid");
      await this.deductLockedInventory(manager, lockedOrder);
      await this.awardMallPurchasePoints(lockedOrder, manager);
      await this.createMallCommissionForOrder(manager, lockedOrder);
      return lockedOrder;
    });
    await this.refreshCheckoutGroupStatusForOrder(savedOrder);
    await this.logOperation(admin, "mall.order.confirm_offline", "mall_order", savedOrder.id, `确认商城订单线下收款：${savedOrder.orderNo}`, savedOrder.tenant.id);
    return this.publicOrderWithItems(savedOrder);
  }

  async adminShip(id: number, dto: MallShipDto, admin?: AdminContext) {
    const order = await this.findAdminOrder(id, admin, "shipment.manage");
    const shipResult = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(MallOrder);
      const shipmentRepo = manager.getRepository(MallShipment);
      const shipmentItemRepo = manager.getRepository(MallShipmentItem);
      const locked = await orderRepo.findOne({ where: { id: order.id }, relations: ["tenant", "merchant", "checkoutGroup", "user"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!locked) throw new NotFoundException("商城订单不存在");
      const businessKey = this.optionalString(dto.businessKey)?.slice(0, 80) || null;
      if (businessKey && await shipmentRepo.findOne({ where: { order: { id: locked.id }, businessKey }, loadEagerRelations: false })) return { order: locked, idempotent: true };
      if (locked.status !== "paid") throw new BadRequestException("只有待发货或部分发货的已支付订单可以新增包裹");
      const orderItems = await manager.getRepository(MallOrderItem).find({ where: { order: { id: locked.id } }, relations: ["product", "sku"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!orderItems.length) throw new BadRequestException("订单没有可发货商品");
      const shippedRows = await shipmentItemRepo.createQueryBuilder("shipmentItem")
        .innerJoin("shipmentItem.shipment", "shipment")
        .select("shipmentItem.orderItemId", "orderItemId")
        .addSelect("SUM(shipmentItem.quantity)", "quantity")
        .where("shipmentItem.orderId = :orderId", { orderId: locked.id })
        .andWhere("shipment.status != :cancelled", { cancelled: "cancelled" })
        .groupBy("shipmentItem.orderItemId")
        .getRawMany<{ orderItemId: string; quantity: string }>();
      const shippedMap = new Map(shippedRows.map((row) => [Number(row.orderItemId), Number(row.quantity || 0)]));
      const requested = new Map<number, number>();
      for (const item of dto.items || []) {
        if (requested.has(Number(item.orderItemId))) throw new BadRequestException("同一订单商品不能在一个包裹中重复填写");
        requested.set(Number(item.orderItemId), Math.max(Math.trunc(Number(item.quantity || 0)), 0));
      }
      if (!requested.size) for (const item of orderItems) {
        const remaining = Number(item.quantity || 0) - (shippedMap.get(item.id) || 0);
        if (remaining > 0) requested.set(item.id, remaining);
      }
      if (!requested.size) throw new BadRequestException("订单商品已全部发货，不能重复创建包裹");
      const selectedItems: Array<{ item: MallOrderItem; quantity: number }> = [];
      for (const [orderItemId, quantity] of requested) {
        const item = orderItems.find((row) => row.id === orderItemId);
        if (!item) throw new BadRequestException("包裹商品不属于当前订单");
        const remaining = Number(item.quantity || 0) - (shippedMap.get(item.id) || 0);
        if (quantity <= 0 || quantity > remaining) throw new BadRequestException(`「${item.productTitle}」本次发货数量超过剩余可发数量 ${Math.max(remaining, 0)}`);
        selectedItems.push({ item, quantity });
      }
      const now = new Date();
      const shipment = await shipmentRepo.save(shipmentRepo.create({ tenant: locked.tenant, merchant: locked.merchant || null, order: locked, shipmentNo: this.generateShipmentNo(locked.id), businessKey, expressCompany: this.optionalString(dto.expressCompany), expressNo: this.requiredString(dto.expressNo, "快递单号"), status: "shipped", createdBy: admin?.username || String(admin?.id || "admin"), remark: this.optionalString(dto.remark), shippedAt: now, deliveredAt: null }));
      await shipmentItemRepo.save(selectedItems.map(({ item, quantity }) => shipmentItemRepo.create({ tenant: locked.tenant, merchant: locked.merchant || null, order: locked, shipment, orderItem: item, quantity, itemSnapshot: { orderItemId: item.id, productId: item.product?.id || null, skuId: item.sku?.id || null, productTitle: item.productTitle, skuName: item.skuName, coverUrl: item.coverUrl, quantity } })));
      const totalQuantity = orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const shippedQuantity = [...shippedMap.values()].reduce((sum, quantity) => sum + quantity, 0) + selectedItems.reduce((sum, row) => sum + row.quantity, 0);
      const fulfillment = resolveMallFulfillmentState({ totalQuantity, shippedQuantity });
      const fullyShipped = fulfillment.fullyShipped;
      const fromStatus = locked.status;
      locked.totalQuantity = totalQuantity;
      locked.shippedQuantity = shippedQuantity;
      locked.fulfillmentStatus = fulfillment.fulfillmentStatus;
      locked.status = fullyShipped ? "shipped" : "paid";
      locked.expressCompany = shipment.expressCompany;
      locked.expressNo = shipment.expressNo;
      locked.adminRemark = this.optionalString(dto.remark) || locked.adminRemark;
      locked.shippedAt = fullyShipped ? now : locked.shippedAt;
      await orderRepo.save(locked);
      await this.recordMallOrderEvent(manager, locked, { eventKey: `shipment:${shipment.id}:created`, eventType: fullyShipped ? "order_shipped" : "order_partially_shipped", fromStatus, toStatus: locked.status, source: "admin", operator: admin?.username || String(admin?.id || "admin"), remark: this.optionalString(dto.remark) || (fullyShipped ? "订单商品已全部发货" : "订单部分商品已发货"), detail: { shipmentId: shipment.id, shipmentNo: shipment.shipmentNo, expressCompany: shipment.expressCompany, expressNo: shipment.expressNo, packageQuantity: selectedItems.reduce((sum, row) => sum + row.quantity, 0), shippedQuantity, totalQuantity, fulfillmentStatus: locked.fulfillmentStatus }, occurredAt: now });
      return { order: locked, idempotent: false };
    });
    const shipped = shipResult.order;
    await this.refreshCheckoutGroupStatusForOrder(shipped);
    if (!shipResult.idempotent) await this.logOperation(admin, "mall.order.ship", "mall_order", shipped.id, `商城订单发货：${shipped.orderNo}`, shipped.tenant.id);
    return { ...(await this.publicOrderWithItems(shipped)), idempotent: shipResult.idempotent };
  }

  async adminUpdateShipment(orderId: number, shipmentId: number, dto: MallShipmentUpdateDto, admin?: AdminContext) {
    const scopedOrder = await this.findAdminOrder(orderId, admin, "shipment.manage");
    const result = await this.dataSource.transaction(async (manager) => {
      const shipmentRepo = manager.getRepository(MallShipment);
      const shipment = await shipmentRepo.findOne({ where: { id: shipmentId, order: { id: scopedOrder.id } }, relations: ["tenant", "merchant", "order", "order.tenant", "order.merchant"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!shipment) throw new NotFoundException("物流包裹不存在");
      if (shipment.status === "cancelled") throw new BadRequestException("已取消包裹不能修改物流单号");
      const oldCompany = shipment.expressCompany;
      const oldExpressNo = shipment.expressNo;
      const newCompany = this.optionalString(dto.expressCompany);
      const newExpressNo = this.requiredString(dto.expressNo, "快递单号");
      const reason = this.requiredString(dto.reason, "修改原因");
      if (oldCompany === newCompany && oldExpressNo === newExpressNo) throw new BadRequestException("物流公司和单号没有变化");
      shipment.expressCompany = newCompany;
      shipment.expressNo = newExpressNo;
      await shipmentRepo.save(shipment);
      const latest = await shipmentRepo.findOne({ where: { order: { id: scopedOrder.id }, status: In(["shipped", "delivered"]) }, order: { shippedAt: "DESC", id: "DESC" } });
      if (latest?.id === shipment.id) {
        shipment.order.expressCompany = newCompany;
        shipment.order.expressNo = newExpressNo;
        await manager.getRepository(MallOrder).save(shipment.order);
      }
      await this.recordMallOrderEvent(manager, shipment.order, { eventKey: `shipment:${shipment.id}:tracking:${Date.now()}`, eventType: "shipment_tracking_updated", fromStatus: shipment.order.status, toStatus: shipment.order.status, source: "admin", operator: admin?.username || String(admin?.id || "admin"), remark: reason, detail: { shipmentId: shipment.id, shipmentNo: shipment.shipmentNo, before: { expressCompany: oldCompany, expressNo: oldExpressNo }, after: { expressCompany: newCompany, expressNo: newExpressNo } } });
      return shipment.order;
    });
    await this.logOperation(admin, "mall.shipment.update_tracking", "mall_shipment", shipmentId, `修改商城包裹物流单号：订单 ${result.orderNo}，原因：${dto.reason}`, result.tenant.id);
    return this.publicOrderWithItems(result);
  }

  async adminSyncShipmentTracking(orderId: number, shipmentId: number, admin?: AdminContext) {
    const order = await this.findAdminOrder(orderId, admin, "shipment.manage");
    const shipment = await this.shipments.findOne({ where: { id: shipmentId, order: { id: order.id } } });
    if (!shipment) throw new NotFoundException("物流包裹不存在");
    const result = await this.syncMallShipmentTracking(shipment.id, admin?.username || String(admin?.id || "admin"));
    await this.logOperation(admin, "mall.shipment.sync_tracking", "mall_shipment", shipment.id, `同步商城包裹物流轨迹：${shipment.shipmentNo}，新增 ${result.addedCount} 条`, order.tenant.id);
    return { ...result, order: await this.publicOrderWithItems(await this.findAdminOrder(order.id, admin, "shipment.view")) };
  }

  async syncActiveMallShipmentTracking(limit = 50) {
    const mode = this.mallTrackingMode();
    if (mode === "disabled") return { mode, checkedCount: 0, syncedCount: 0, addedCount: 0, failedCount: 0 };
    const rows = await this.shipments.find({ where: { status: "shipped" }, order: { updatedAt: "ASC" }, take: Math.min(Math.max(Math.trunc(limit), 1), 200) });
    let syncedCount = 0;
    let addedCount = 0;
    let failedCount = 0;
    for (const shipment of rows) {
      try {
        const result = await this.syncMallShipmentTracking(shipment.id, "mall_tracking_worker");
        syncedCount += 1;
        addedCount += result.addedCount;
      } catch {
        failedCount += 1;
      }
    }
    return { mode, checkedCount: rows.length, syncedCount, addedCount, failedCount };
  }

  private async syncMallShipmentTracking(shipmentId: number, operator: string) {
    const shipment = await this.shipments.findOne({ where: { id: shipmentId }, relations: ["tenant", "order", "order.tenant", "order.merchant", "order.user", "order.checkoutGroup"], loadEagerRelations: false });
    if (!shipment) throw new NotFoundException("物流包裹不存在");
    if (shipment.status === "cancelled") throw new BadRequestException("已取消包裹不能同步物流轨迹");
    const mode = this.mallTrackingMode();
    if (mode === "disabled") throw new BadRequestException("物流轨迹供应商未配置，请设置 MALL_LOGISTICS_TRACKING_API_URL，或在验收环境启用 sandbox 模式");
    let payload: Record<string, any>;
    if (mode === "sandbox") {
      const autoDeliver = String(this.config.get<string>("MALL_LOGISTICS_SANDBOX_AUTO_DELIVER") || "false").toLowerCase() === "true";
      payload = { events: [
        { eventKey: "sandbox:shipped", status: "in_transit", description: "包裹已由商家发出", eventAt: shipment.shippedAt, location: shipment.order.addressSnapshot?.city || null },
        ...(autoDeliver ? [{ eventKey: "sandbox:delivered", status: "delivered", description: "沙箱物流已模拟签收", eventAt: new Date(), location: shipment.order.addressSnapshot?.city || null }] : [])
      ] };
    } else {
      const url = String(this.config.get<string>("MALL_LOGISTICS_TRACKING_API_URL") || "").trim();
      const token = String(this.config.get<string>("MALL_LOGISTICS_TRACKING_API_TOKEN") || "").trim();
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ company: shipment.expressCompany, trackingNo: shipment.expressNo, shipmentNo: shipment.shipmentNo }), signal: AbortSignal.timeout(this.configNumber("MALL_LOGISTICS_TRACKING_TIMEOUT_MS", 10000)) });
      if (!response.ok) throw new BadRequestException(`物流轨迹供应商请求失败（HTTP ${response.status}）`);
      payload = await response.json() as Record<string, any>;
    }
    const parsed = parseMallTrackingPayload(payload);
    if (!parsed.length) throw new BadRequestException("物流轨迹供应商未返回有效轨迹");
    const result = await this.dataSource.transaction(async (manager) => {
      const shipmentRepo = manager.getRepository(MallShipment);
      const trackingRepo = manager.getRepository(MallShipmentTrackingEvent);
      const orderRepo = manager.getRepository(MallOrder);
      const lockedShipment = await shipmentRepo.findOne({ where: { id: shipment.id }, relations: ["tenant", "refund", "order", "order.tenant", "order.merchant", "order.user", "order.checkoutGroup"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!lockedShipment) throw new NotFoundException("物流包裹不存在");
      let addedCount = 0;
      for (const event of parsed) {
        if (await trackingRepo.findOne({ where: { shipment: { id: lockedShipment.id }, eventKey: event.eventKey }, loadEagerRelations: false })) continue;
        await trackingRepo.save(trackingRepo.create({ tenant: lockedShipment.tenant, order: lockedShipment.order, shipment: lockedShipment, eventKey: event.eventKey, status: event.status, description: event.description, location: event.location, source: mode, rawPayload: event.rawPayload, eventAt: event.eventAt }));
        addedCount += 1;
      }
      const deliveredEvent = parsed.filter((event) => event.status === "delivered").sort((a, b) => b.eventAt.getTime() - a.eventAt.getTime())[0];
      if (deliveredEvent && lockedShipment.status !== "delivered") {
        lockedShipment.status = "delivered";
        lockedShipment.deliveredAt = deliveredEvent.eventAt;
        await shipmentRepo.save(lockedShipment);
        await this.recordMallOrderEvent(manager, lockedShipment.order, { eventKey: `shipment:${lockedShipment.id}:provider_delivered`, eventType: "shipment_delivered", fromStatus: lockedShipment.order.status, toStatus: lockedShipment.order.status, source: "system", operator, remark: `物流供应商确认包裹 ${lockedShipment.shipmentNo} 已签收`, detail: { shipmentId: lockedShipment.id, shipmentNo: lockedShipment.shipmentNo, expressNo: lockedShipment.expressNo, trackingMode: mode }, occurredAt: deliveredEvent.eventAt });
      }
      if (lockedShipment.shipmentType === "exchange" && lockedShipment.refund && deliveredEvent) {
        lockedShipment.refund.status = "approved";
        lockedShipment.refund.completedAt = deliveredEvent.eventAt;
        lockedShipment.refund.responseDeadlineAt = null;
        await manager.getRepository(MallRefund).save(lockedShipment.refund);
        await this.createMallRefundMessage(lockedShipment.refund, "system", operator, { content: "物流供应商确认换货商品已签收，售后完成", images: [] }, "status", { shipmentId: lockedShipment.id }, manager);
        return { order: lockedShipment.order, addedCount };
      }
      const activeShipments = await shipmentRepo.find({ where: { order: { id: lockedShipment.order.id }, status: In(["shipped", "delivered"]), shipmentType: "order" }, loadEagerRelations: false });
      const fulfillment = resolveMallFulfillmentState({ totalQuantity: lockedShipment.order.totalQuantity, shippedQuantity: lockedShipment.order.shippedQuantity, activeShipmentCount: activeShipments.length, deliveredShipmentCount: activeShipments.filter((row) => row.status === "delivered").length });
      if (fulfillment.fullyReceived && lockedShipment.order.status === "shipped") {
        lockedShipment.order.status = "completed";
        lockedShipment.order.fulfillmentStatus = "received";
        lockedShipment.order.completedAt = deliveredEvent?.eventAt || new Date();
        await orderRepo.save(lockedShipment.order);
        await this.recordMallOrderEvent(manager, lockedShipment.order, { eventKey: "completed:tracking_provider", eventType: "order_completed", fromStatus: "shipped", toStatus: "completed", source: "system", operator, remark: "全部包裹已由物流供应商确认签收", detail: { shipmentIds: activeShipments.map((row) => row.id), trackingMode: mode }, occurredAt: lockedShipment.order.completedAt });
      }
      return { order: lockedShipment.order, addedCount };
    });
    await this.refreshCheckoutGroupStatusForOrder(result.order);
    const events = await this.shipmentTrackingEvents.find({ where: { shipment: { id: shipment.id } }, loadEagerRelations: false, order: { eventAt: "ASC", id: "ASC" } });
    return { mode, shipmentId: shipment.id, shipmentNo: shipment.shipmentNo, addedCount: result.addedCount, events: events.map((event) => ({ id: event.id, status: event.status, description: event.description, location: event.location, source: event.source, eventAt: event.eventAt })) };
  }

  private mallTrackingMode() {
    const configured = String(this.config.get<string>("MALL_LOGISTICS_TRACKING_MODE") || "").trim().toLowerCase();
    if (configured === "sandbox") return "sandbox" as const;
    if (String(this.config.get<string>("MALL_LOGISTICS_TRACKING_API_URL") || "").trim()) return "provider" as const;
    return "disabled" as const;
  }

  async adminCloseOrder(id: number, dto: MallOrderCloseDto, admin?: AdminContext) {
    const order = await this.findAdminOrder(id, admin, "order.manage");
    if (!["pending_payment", "pending_confirm"].includes(order.status)) throw new BadRequestException("只有待付款或待确认订单可以关闭，已支付订单请走售后退款");
    const reason = this.requiredString(dto.reason, "关闭原因");
    await this.closeOrderAndReleaseLockedInventory(order.id, reason);
    await this.logOperation(admin, "mall.order.close", "mall_order", order.id, `关闭商城订单：${order.orderNo}，原因：${reason}`, order.tenant.id);
    const closed = await this.findAdminOrder(id, admin);
    return this.publicOrderWithItems(closed);
  }

  async closeExpiredPendingOrders(now = new Date(), admin?: AdminContext) {
    const paymentMinutes = this.configNumber("MALL_PENDING_PAYMENT_EXPIRE_MINUTES", 30);
    const confirmMinutes = this.configNumber("MALL_PENDING_CONFIRM_EXPIRE_MINUTES", 24 * 60);
    const paymentDeadline = new Date(now.getTime() - paymentMinutes * MINUTE_MS);
    const confirmDeadline = new Date(now.getTime() - confirmMinutes * MINUTE_MS);
    const scope = await this.adminMallBatchScope(admin);
    const batchSize = Math.min(Math.max(Math.trunc(this.configNumber("MALL_PENDING_ORDER_BATCH_SIZE", 50)), 1), 200);
    const maxBatches = Math.min(Math.max(Math.trunc(this.configNumber("MALL_PENDING_ORDER_MAX_BATCHES", 20)), 1), 100);
    const attemptedIds: number[] = [];
    let closedCount = 0;
    let skippedConcurrentCount = 0;
    let checkedCount = 0;
    let batchCount = 0;
    const failures: Array<{ orderId: number; orderNo: string; message: string }> = [];
    const expiredWhere = () => {
      const exclusion = attemptedIds.length ? { id: Not(In(attemptedIds)) } : {};
      return [
        this.mallBatchWhere(scope, { ...exclusion, status: "pending_payment", expiresAt: LessThan(now) }),
        this.mallBatchWhere(scope, { ...exclusion, status: "pending_confirm", expiresAt: LessThan(now) }),
        this.mallBatchWhere(scope, { ...exclusion, status: "pending_payment", expiresAt: IsNull(), createdAt: LessThan(paymentDeadline) }),
        this.mallBatchWhere(scope, { ...exclusion, status: "pending_confirm", expiresAt: IsNull(), createdAt: LessThan(confirmDeadline) })
      ];
    };
    while (batchCount < maxBatches) {
      const orders = await this.orders.find({ where: expiredWhere(), order: { createdAt: "ASC" }, take: batchSize });
      if (!orders.length) break;
      batchCount += 1;
      checkedCount += orders.length;
      attemptedIds.push(...orders.map((order) => order.id));
      for (const order of orders) {
        try {
          const reason = order.status === "pending_payment" ? `商城订单超过 ${paymentMinutes} 分钟未支付，系统自动关闭` : `商城订单超过 ${confirmMinutes} 分钟未确认收款，系统自动关闭`;
          const closed = await this.closeOrderAndReleaseLockedInventory(order.id, reason);
          if (!closed) {
            skippedConcurrentCount += 1;
            continue;
          }
          closedCount += 1;
          await this.logOperation(admin, "mall.order.auto_close", "mall_order", order.id, `自动关闭商城订单：${order.orderNo}，原因：${reason}`, order.tenant.id);
        } catch (error) {
          const latest = await this.orders.findOne({ where: { id: order.id }, loadEagerRelations: false }).catch(() => null);
          if (!latest || !["pending_payment", "pending_confirm"].includes(latest.status)) {
            skippedConcurrentCount += 1;
            continue;
          }
          const message = this.mallWorkerFailureMessage(error);
          failures.push({ orderId: order.id, orderNo: order.orderNo, message });
          await this.logOperation(admin, "mall.order.auto_close_failed", "mall_order", order.id, `商城订单自动关闭失败：${order.orderNo}，${message}`, order.tenant.id).catch(() => null);
        }
      }
      if (orders.length < batchSize) break;
    }
    const hasMore = Boolean(await this.orders.findOne({ where: expiredWhere(), select: { id: true }, loadEagerRelations: false }));
    return { closedCount, checkedCount, skippedConcurrentCount, failedCount: failures.length, failures, batchCount, batchSize, maxBatches, hasMore, paymentMinutes, confirmMinutes, scope: this.publicMallBatchScope(scope) };
  }

  async failExpiredGroupBuyTeams(now = new Date(), admin?: AdminContext) {
    const scope = await this.adminMallBatchScope(admin);
    const builder = this.groupBuyRecords.createQueryBuilder("record")
      .leftJoinAndSelect("record.tenant", "tenant")
      .leftJoinAndSelect("record.merchant", "merchant")
      .leftJoinAndSelect("record.groupBuy", "groupBuy")
      .where("record.teamStatus = :teamStatus", { teamStatus: "forming" })
      .andWhere("record.status = :status", { status: "paid" })
      .andWhere("groupBuy.endsAt < :now", { now })
      .orderBy("record.createdAt", "ASC")
      .take(200);
    this.applyMallBatchScope(builder, "record", scope);
    const rows = await builder.getMany();
    const teamNos = [...new Set(rows.map((row) => row.teamNo).filter(Boolean))];
    let failedTeamCount = 0;
    let refundedOrderCount = 0;
    let skippedOrderCount = 0;
    let manualRefundOrderCount = 0;
    const failures: Array<{ teamNo: string; message: string }> = [];
    for (const teamNo of teamNos) {
      try {
        const result = await this.failGroupBuyTeam(teamNo, admin, scope);
        if (result.failed) failedTeamCount += 1;
        refundedOrderCount += result.refundedOrderCount;
        skippedOrderCount += result.skippedOrderCount;
        manualRefundOrderCount += result.manualRefundOrderCount || 0;
      } catch (error: any) {
        skippedOrderCount += 1;
        failures.push({ teamNo, message: String(error?.message || "未成团处理失败").slice(0, 200) });
      }
    }
    return { checkedTeamCount: teamNos.length, checkedRecordCount: rows.length, failedTeamCount, refundedOrderCount, manualRefundOrderCount, skippedOrderCount, failures, scope: this.publicMallBatchScope(scope) };
  }

  async completeExpiredShippedOrders(now = new Date(), admin?: AdminContext) {
    const shippedDays = this.configNumber("MALL_SHIPPED_AUTO_COMPLETE_DAYS", 7);
    if (shippedDays <= 0) return { completedCount: 0, checkedCount: 0, shippedDays };
    const shippedDeadline = new Date(now.getTime() - shippedDays * 24 * 60 * MINUTE_MS);
    const scope = await this.adminMallBatchScope(admin);
    const orders = await this.orders.find({ where: this.mallBatchWhere(scope, { status: "shipped", shippedAt: LessThan(shippedDeadline) }), order: { shippedAt: "ASC" }, take: 50 });
    let completedCount = 0;
    for (const order of orders) {
      try {
        const completed = await this.dataSource.transaction(async (manager) => {
          const repo = manager.getRepository(MallOrder);
          const locked = await repo.findOne({ where: { id: order.id }, relations: ["tenant", "merchant", "checkoutGroup", "user"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
          if (!locked || locked.status !== "shipped") return null;
          locked.status = "completed";
          locked.fulfillmentStatus = "received";
          locked.completedAt = now;
          const shipmentRepo = manager.getRepository(MallShipment);
          const shipments = await shipmentRepo.find({ where: { order: { id: locked.id }, status: "shipped", shipmentType: "order" }, lock: { mode: "pessimistic_write" } });
          for (const shipment of shipments) {
            shipment.status = "delivered";
            shipment.deliveredAt = now;
            await this.recordMallOrderEvent(manager, locked, { eventKey: `shipment:${shipment.id}:auto_delivered`, eventType: "shipment_auto_delivered", fromStatus: "shipped", toStatus: "shipped", source: "worker", operator: "mall_pending_order_worker", remark: `包裹 ${shipment.shipmentNo} 随订单自动确认收货`, detail: { shipmentId: shipment.id, shipmentNo: shipment.shipmentNo }, occurredAt: now });
          }
          if (shipments.length) await shipmentRepo.save(shipments);
          await repo.save(locked);
          await this.recordMallOrderEvent(manager, locked, { eventKey: `completed:auto:${shippedDays}`, eventType: "order_auto_completed", fromStatus: "shipped", toStatus: "completed", source: "worker", operator: "mall_pending_order_worker", remark: `已发货超过 ${shippedDays} 天自动完成`, detail: { shippedDays, shipmentIds: shipments.map((shipment) => shipment.id) }, occurredAt: now });
          return locked;
        });
        if (!completed) continue;
        await this.refreshCheckoutGroupStatusForOrder(completed);
        completedCount += 1;
        await this.logOperation(admin, "mall.order.auto_complete", "mall_order", completed.id, `自动完成商城订单：${completed.orderNo}，已发货超过 ${shippedDays} 天`, completed.tenant.id);
      } catch {
        // 单个订单可能已被用户确认或进入售后，跳过即可，下一轮继续扫描。
      }
    }
    return { completedCount, checkedCount: orders.length, shippedDays, scope: this.publicMallBatchScope(scope) };
  }

  async importPaymentStatements(dto: MallStatementImportDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId);
    if (!tenant || !merchant) throw new BadRequestException("请选择商城店铺");
    const accountScope = merchant.paymentMode === "merchant_direct" ? `merchant:${merchant.id}` : `tenant:${tenant.id}:platform`;
    const batchNo = this.optionalString(dto.batchNo) || `MST${String(dto.statementDate).replace(/\D/g, "")}${Date.now()}`;
    const results: MallPaymentStatementRecord[] = [];
    let importedCount = 0;
    let updatedCount = 0;
    for (const item of dto.items.slice(0, 5000)) {
      const transactionNo = this.requiredString(item.transactionNo, "渠道流水号");
      let row = await this.paymentStatements.findOne({ where: { provider: PaymentMethod.Wechat, accountScope, transactionNo } });
      const isNew = !row;
      const orderNo = this.optionalString(item.orderNo);
      const order = orderNo ? await this.orders.findOne({ where: { orderNo, tenant: { id: tenant.id }, merchant: { id: merchant.id } } }) : null;
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException(`渠道流水 ${transactionNo} 金额不正确`);
      if (row?.tenant?.id && row.tenant.id !== tenant.id) throw new BadRequestException(`渠道流水 ${transactionNo} 已归属其他商家，不能重新绑定`);
      if (row?.merchant?.id && row.merchant.id !== merchant.id) throw new BadRequestException(`渠道流水 ${transactionNo} 已归属店铺「${row.merchant.name}」，不能重新绑定`);
      if (row?.orderNo && orderNo && row.orderNo !== orderNo) throw new BadRequestException(`渠道流水 ${transactionNo} 已关联订单 ${row.orderNo}，不能改绑为 ${orderNo}`);
      if (row?.order?.id && order?.id && row.order.id !== order.id) throw new BadRequestException(`渠道流水 ${transactionNo} 已关联其他订单，不能重新绑定`);
      const reconciliation = reconcileMallStatement({ amount: amount.toFixed(2), orderNo }, order);
      row = row || this.paymentStatements.create({ provider: PaymentMethod.Wechat, accountScope, transactionNo });
      Object.assign(row, { tenant, merchant, order, orderNo, amount: amount.toFixed(2), amountFen: yuanToFen(amount), tradeType: this.optionalString(item.tradeType), providerStatus: this.optionalString(item.providerStatus), tradedAt: item.tradedAt ? new Date(item.tradedAt) : null, batchNo, reconciliationStatus: reconciliation.status, discrepancyType: reconciliation.discrepancyType, remark: reconciliation.remark, rawPayload: item.rawPayload || item as unknown as Record<string, unknown>, importedBy: admin?.username || "system" });
      results.push(await this.paymentStatements.save(row));
      if (isNew) importedCount += 1;
      else updatedCount += 1;
      if (order) {
        const tx = await this.paymentTransactions.findOne({ where: { order: { id: order.id } } });
        if (tx) { tx.reconciliationStatus = reconciliation.status; tx.discrepancyType = reconciliation.discrepancyType; tx.remark = reconciliation.remark; await this.paymentTransactions.save(tx); }
      }
    }
    await this.logOperation(admin, "mall.statement.import", "mall_payment_statement", null, `导入商城渠道账单 ${results.length} 笔`, tenant.id);
    return { batchNo, importedCount, updatedCount, processedCount: results.length, matchedCount: results.filter((row) => row.reconciliationStatus === "matched").length, discrepancyCount: results.filter((row) => row.reconciliationStatus !== "matched").length, items: results };
  }

  async fetchPaymentStatements(dto: MallStatementFetchDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId);
    if (!tenant || !merchant) throw new BadRequestException("请选择商城店铺");
    const merchantDirect = merchant.paymentMode === "merchant_direct";
    const runtimeConfig = merchantDirect ? await this.mallMerchantWechatRuntimeConfig(merchant, true) : null;
    const result = await this.paymentProvider.fetchStatement({ provider: "wechat", statementDate: dto.statementDate, tenantId: tenant.id, agentId: merchant.agent?.id || null, runtimeConfig });
    return this.importPaymentStatements({ tenantId: tenant.id, merchantId: merchant.id, statementDate: dto.statementDate, batchNo: result.batchNo, items: result.items.map((item) => ({ transactionNo: item.transactionNo, orderNo: item.orderNo || undefined, amount: Number(item.amount), tradeType: item.tradeType || undefined, providerStatus: item.providerStatus || undefined, tradedAt: item.tradedAt || undefined, rawPayload: item.raw })) }, admin);
  }

  async listPaymentStatements(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.tenantId && !query.merchantId, false);
    const builder = this.paymentStatements.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").leftJoinAndSelect("row.merchant", "merchant").leftJoinAndSelect("row.order", "order").orderBy("row.importedAt", "DESC");
    if (tenant) builder.andWhere("row.tenantId = :tenantId", { tenantId: tenant.id });
    if (merchant) builder.andWhere("row.merchantId = :merchantId", { merchantId: merchant.id });
    if (query.status) builder.andWhere("row.reconciliationStatus = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(row.transactionNo LIKE :keyword OR row.orderNo LIKE :keyword OR row.batchNo LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(500).getMany();
  }

  async exportPaymentStatements(query: MallListQueryDto, admin?: AdminContext) {
    const rows = await this.listPaymentStatements(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商城渠道账单");
    sheet.columns = [
      { header: "批次", key: "batchNo", width: 24 }, { header: "店铺", key: "merchant", width: 22 }, { header: "账户范围", key: "accountScope", width: 24 }, { header: "渠道流水号", key: "transactionNo", width: 30 },
      { header: "商城订单号", key: "orderNo", width: 28 }, { header: "金额（分）", key: "amountFen", width: 14 }, { header: "金额（元）", key: "amount", width: 14 }, { header: "渠道状态", key: "providerStatus", width: 16 },
      { header: "勾兑状态", key: "reconciliationStatus", width: 16 }, { header: "差异类型", key: "discrepancyType", width: 20 }, { header: "说明", key: "remark", width: 32 }, { header: "交易时间", key: "tradedAt", width: 24 }, { header: "导入时间", key: "importedAt", width: 24 }
    ];
    rows.forEach((row) => sheet.addRow({ ...row, merchant: row.merchant?.name || "-" }));
    await this.logOperation(admin, "mall.statement.export", "mall_payment_statement", null, `导出商城渠道账单 ${rows.length} 笔`, admin?.tenantId || undefined);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async claimPaymentStatement(id: number, admin?: AdminContext) {
    const row = await this.paymentStatements.findOne({ where: { id } });
    if (!row) throw new NotFoundException("商城渠道账单不存在");
    this.assertAdminTenantAccess(row, admin);
    await this.assertAdminRowMerchantAccess({ tenant: row.tenant, merchant: row.merchant }, admin, "商城渠道账单");
    if (row.reconciliationStatus === "matched") throw new BadRequestException("已匹配账单无需认领");
    if (row.claimedBy && row.claimedBy !== (admin?.username || "system")) throw new BadRequestException(`该差异已由 ${row.claimedBy} 认领`);
    row.claimedBy = admin?.username || "system";
    row.claimedAt = row.claimedAt || new Date();
    const saved = await this.paymentStatements.save(row);
    await this.logOperation(admin, "mall.statement.claim", "mall_payment_statement", row.id, `认领商城账单差异：${row.transactionNo}`, row.tenant.id);
    return saved;
  }

  async adminMerchantQualifications(query: MallListQueryDto, admin?: AdminContext) {
    const { merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, false, false, "merchant.manage");
    if (!merchant) throw new BadRequestException("请选择店铺");
    return this.merchantQualifications.find({ where: { merchant: { id: merchant.id } }, order: { id: "DESC" } });
  }

  async saveMerchantQualification(dto: MallMerchantQualificationDto, id?: number, admin?: AdminContext) {
    const { merchant } = await this.adminTargetMerchant(admin, undefined, dto.merchantId, false, false, "merchant.manage");
    if (!merchant) throw new BadRequestException("请选择店铺");
    const row = id ? await this.merchantQualifications.findOne({ where: { id } }) : this.merchantQualifications.create();
    if (!row) throw new NotFoundException("资质记录不存在");
    if (id && row.merchant.id !== merchant.id) throw new ForbiddenException("资质记录不属于当前店铺");
    const validFrom = dto.validFrom ? this.normalizeSettlementDate(dto.validFrom, "资质生效日期") : null;
    const validUntil = dto.validUntil ? this.normalizeSettlementDate(dto.validUntil, "资质到期日期") : null;
    if (validFrom && validUntil && validUntil < validFrom) throw new BadRequestException("资质到期日期不能早于生效日期");
    row.tenant = merchant.tenant;
    row.merchant = merchant;
    row.type = this.requiredString(dto.type, "资质类型").slice(0, 40);
    row.name = this.requiredString(dto.name, "资质名称").slice(0, 120);
    row.certificateNo = this.optionalString(dto.certificateNo);
    row.fileUrls = Array.from(new Set((dto.fileUrls || []).map((item) => String(item).trim()).filter(Boolean))).slice(0, 20);
    if (!row.fileUrls.length) throw new BadRequestException("请上传资质文件");
    row.validFrom = validFrom;
    row.validUntil = validUntil;
    row.status = "pending";
    row.reviewRemark = null;
    row.reviewedByAdminId = null;
    row.reviewedAt = null;
    const saved = await this.merchantQualifications.save(row);
    await this.logOperation(admin, id ? "mall.merchant_qualification.update" : "mall.merchant_qualification.create", "mall_merchant_qualification", saved.id, `保存店铺资质：${saved.name}`, merchant.tenant.id);
    return saved;
  }

  async reviewMerchantQualification(id: number, dto: MallMerchantQualificationReviewDto, admin?: AdminContext) {
    const row = await this.merchantQualifications.findOne({ where: { id } });
    if (!row) throw new NotFoundException("资质记录不存在");
    await this.assertAdminMerchantAccess(row.merchant, admin, "merchant.manage");
    row.status = dto.status;
    row.reviewRemark = this.requiredString(dto.reviewRemark, "审核说明").slice(0, 1000);
    row.reviewedByAdminId = admin?.id || null;
    row.reviewedAt = new Date();
    return this.merchantQualifications.save(row);
  }

  async adminMerchantContracts(query: MallListQueryDto, admin?: AdminContext) {
    const { merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, false, false, "merchant.manage");
    if (!merchant) throw new BadRequestException("请选择店铺");
    return this.merchantContracts.find({ where: { merchant: { id: merchant.id } }, order: { version: "DESC", id: "DESC" } });
  }

  async saveMerchantContract(dto: MallMerchantContractDto, id?: number, admin?: AdminContext) {
    const { merchant } = await this.adminTargetMerchant(admin, undefined, dto.merchantId, false, false, "merchant.manage");
    if (!merchant) throw new BadRequestException("请选择店铺");
    const row = id ? await this.merchantContracts.findOne({ where: { id } }) : this.merchantContracts.create();
    if (!row) throw new NotFoundException("合同记录不存在");
    if (id && row.merchant.id !== merchant.id) throw new ForbiddenException("合同不属于当前店铺");
    if (row.status === "active") throw new BadRequestException("已生效合同不能直接修改，请新建合同版本");
    const startsAt = this.normalizeSettlementDate(dto.startsAt, "合同开始日期");
    const endsAt = this.normalizeSettlementDate(dto.endsAt, "合同结束日期");
    if (endsAt < startsAt) throw new BadRequestException("合同结束日期不能早于开始日期");
    const version = Math.max(1, Number(dto.version || row.version || 1));
    const contractNo = this.requiredString(dto.contractNo, "合同编号").slice(0, 100);
    const duplicate = await this.merchantContracts.findOne({ where: { contractNo, version } });
    if (duplicate && duplicate.id !== row.id) throw new BadRequestException("合同编号与版本已存在");
    row.tenant = merchant.tenant;
    row.merchant = merchant;
    row.contractNo = contractNo;
    row.version = version;
    row.name = this.requiredString(dto.name, "合同名称").slice(0, 160);
    row.fileUrl = this.requiredString(dto.fileUrl, "合同文件").slice(0, 500);
    row.startsAt = startsAt;
    row.endsAt = endsAt;
    row.signedAt = dto.signedAt ? this.optionalDate(dto.signedAt) : null;
    row.status = row.status || "draft";
    row.platformCommissionBps = this.normalizeBps(dto.platformCommissionBps, "平台佣金费率");
    row.serviceFeeBps = this.normalizeBps(dto.serviceFeeBps, "服务费率");
    row.settlementCycleDays = Math.min(Math.max(Math.trunc(Number(dto.settlementCycleDays || 30)), 1), 365);
    row.snapshot = { merchantId: merchant.id, merchantCode: merchant.code, merchantName: merchant.name, tenantId: merchant.tenant.id, paymentMode: merchant.paymentMode, platformCommissionBps: row.platformCommissionBps, serviceFeeBps: row.serviceFeeBps, settlementCycleDays: row.settlementCycleDays };
    row.remark = this.optionalString(dto.remark);
    return this.merchantContracts.save(row);
  }

  async activateMerchantContract(id: number, admin?: AdminContext) {
    return this.dataSource.transaction(async (manager) => {
      const contractRepo = manager.getRepository(MallMerchantContract);
      const merchantRepo = manager.getRepository(MallMerchant);
      const contract = await contractRepo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!contract) throw new NotFoundException("合同记录不存在");
      await this.assertAdminMerchantAccess(contract.merchant, admin, "merchant.manage");
      const today = this.localDateText(new Date());
      if (contract.startsAt > today || contract.endsAt < today) throw new BadRequestException("只能启用当前有效期内的合同");
      await contractRepo.createQueryBuilder().update(MallMerchantContract).set({ status: "terminated" }).where("merchantId = :merchantId", { merchantId: contract.merchant.id }).andWhere("status = :status", { status: "active" }).andWhere("id <> :id", { id: contract.id }).execute();
      contract.status = "active";
      contract.activatedByAdminId = admin?.id || null;
      contract.activatedAt = new Date();
      await contractRepo.save(contract);
      const merchant = await merchantRepo.findOne({ where: { id: contract.merchant.id }, lock: { mode: "pessimistic_write" } });
      if (!merchant) throw new NotFoundException("店铺不存在");
      merchant.onboardingStatus = "approved";
      merchant.platformCommissionBps = contract.platformCommissionBps;
      merchant.serviceFeeBps = contract.serviceFeeBps;
      merchant.settlementCycleDays = contract.settlementCycleDays;
      merchant.suspendedAt = null;
      merchant.suspensionReason = null;
      merchant.settlementConfig = { ...(merchant.settlementConfig || {}), platformCommissionBps: contract.platformCommissionBps, serviceFeeBps: contract.serviceFeeBps, settlementCycleDays: contract.settlementCycleDays, activeContractId: contract.id, activeContractNo: contract.contractNo, activeContractVersion: contract.version };
      await merchantRepo.save(merchant);
      return { contract, merchant };
    });
  }

  async runMerchantGovernanceLifecycle(admin?: AdminContext, now = new Date()) {
    const today = this.localDateText(now);
    const tenantId = merchantGovernanceTenantScopeId(admin);
    const qualificationBuilder = this.merchantQualifications.createQueryBuilder("qualification").leftJoinAndSelect("qualification.merchant", "merchant").leftJoinAndSelect("qualification.tenant", "tenant").where("qualification.status = :status", { status: "approved" }).andWhere("qualification.validUntil IS NOT NULL AND qualification.validUntil < :today", { today });
    const contractBuilder = this.merchantContracts.createQueryBuilder("contract").leftJoinAndSelect("contract.merchant", "merchant").leftJoinAndSelect("contract.tenant", "tenant").where("contract.status = :status", { status: "active" }).andWhere("contract.endsAt < :today", { today });
    const accessBuilder = this.merchantAccess.createQueryBuilder("access").leftJoinAndSelect("access.merchant", "merchant").leftJoinAndSelect("access.tenant", "tenant").where("access.enabled = :enabled", { enabled: true }).andWhere("access.validUntil IS NOT NULL AND access.validUntil <= :now", { now });
    if (tenantId) {
      qualificationBuilder.andWhere("qualification.tenantId = :governanceTenantId", { governanceTenantId: tenantId });
      contractBuilder.andWhere("contract.tenantId = :governanceTenantId", { governanceTenantId: tenantId });
      accessBuilder.andWhere("access.tenantId = :governanceTenantId", { governanceTenantId: tenantId });
    }
    const [qualifications, contracts, accessRows] = await Promise.all([
      qualificationBuilder.take(1000).getMany(),
      contractBuilder.take(1000).getMany(),
      accessBuilder.take(1000).getMany()
    ]);
    for (const row of qualifications) { row.status = "expired"; row.reviewRemark = this.mergeRemark(row.reviewRemark, "资质有效期已结束"); await this.merchantQualifications.save(row); }
    const affectedMerchantIds = new Set<number>();
    for (const row of contracts) { row.status = "expired"; await this.merchantContracts.save(row); affectedMerchantIds.add(row.merchant.id); }
    for (const row of accessRows) { row.enabled = false; row.disabledReason = "店员授权已到期"; await this.merchantAccess.save(row); }
    for (const qualification of qualifications) affectedMerchantIds.add(qualification.merchant.id);
    let suspendedCount = 0;
    for (const merchantId of affectedMerchantIds) {
      const merchant = await this.merchants.findOne({ where: { id: merchantId } });
      if (!merchant || !merchant.contractRequired) continue;
      const [activeContract, validQualification] = await Promise.all([
        this.merchantContracts.createQueryBuilder("contract").where("contract.merchantId = :merchantId", { merchantId }).andWhere("contract.status = 'active'").andWhere("contract.startsAt <= :today AND contract.endsAt >= :today", { today }).getOne(),
        this.merchantQualifications.createQueryBuilder("qualification").where("qualification.merchantId = :merchantId", { merchantId }).andWhere("qualification.status = 'approved'").andWhere("(qualification.validUntil IS NULL OR qualification.validUntil >= :today)", { today }).getOne()
      ]);
      if (activeContract && validQualification) continue;
      merchant.onboardingStatus = "expired";
      merchant.mallEnabled = false;
      merchant.suspendedAt = now;
      merchant.suspensionReason = !activeContract ? "商户合同已到期或未生效" : "商户资质已到期";
      await this.merchants.save(merchant);
      suspendedCount++;
    }
    await this.logOperation(admin, "mall.merchant_governance.lifecycle", "mall_merchant", 0, `商户治理扫描：资质到期 ${qualifications.length}，合同到期 ${contracts.length}，店员授权到期 ${accessRows.length}，店铺暂停 ${suspendedCount}`, tenantId);
    return { tenantId, expiredQualificationCount: qualifications.length, expiredContractCount: contracts.length, expiredAccessCount: accessRows.length, suspendedMerchantCount: suspendedCount };
  }

  async resolvePaymentStatement(id: number, dto: MallStatementResolveDto, admin?: AdminContext) {
    const row = await this.paymentStatements.findOne({ where: { id } });
    if (!row) throw new NotFoundException("商城渠道账单不存在");
    this.assertAdminTenantAccess(row, admin);
    await this.assertAdminRowMerchantAccess({ tenant: row.tenant, merchant: row.merchant }, admin, "商城渠道账单");
    const actor = admin?.username || "system";
    if (row.claimedBy && row.claimedBy !== actor) throw new BadRequestException(`该差异已由 ${row.claimedBy} 认领`);
    if (dto.action === "recheck") {
      const order = row.orderNo ? await this.orders.findOne({ where: { orderNo: row.orderNo, tenant: { id: row.tenant.id }, merchant: row.merchant ? { id: row.merchant.id } : undefined } }) : null;
      const result = reconcileMallStatement({ amount: row.amount, orderNo: row.orderNo }, order);
      row.order = order;
      row.reconciliationStatus = result.status;
      row.discrepancyType = result.discrepancyType;
      row.remark = result.remark;
      if (result.status === "matched") { row.resolvedBy = actor; row.resolvedAt = new Date(); row.resolutionRemark = this.optionalString(dto.remark) || "重新勾兑后自动匹配"; }
    } else {
      row.reconciliationStatus = dto.action;
      row.resolvedBy = actor;
      row.resolvedAt = new Date();
      row.resolutionRemark = this.requiredString(dto.remark, "处理说明");
    }
    row.claimedBy = row.claimedBy || actor;
    row.claimedAt = row.claimedAt || new Date();
    const saved = await this.paymentStatements.save(row);
    if (saved.order?.id) {
      const transaction = await this.paymentTransactions.findOne({ where: { order: { id: saved.order.id } } });
      if (transaction) {
        transaction.reconciliationStatus = saved.reconciliationStatus;
        transaction.discrepancyType = saved.discrepancyType;
        transaction.remark = saved.resolutionRemark || saved.remark;
        await this.paymentTransactions.save(transaction);
      }
    }
    await this.logOperation(admin, "mall.statement.resolve", "mall_payment_statement", row.id, `处理商城账单差异：${row.transactionNo} -> ${row.reconciliationStatus}`, row.tenant.id);
    return saved;
  }

  async adminRefunds(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, true, ["refund.view", "refund.manage"]);
    const builder = this.refunds.createQueryBuilder("refund").leftJoinAndSelect("refund.tenant", "tenant").leftJoinAndSelect("refund.merchant", "merchant").leftJoinAndSelect("refund.user", "user").leftJoinAndSelect("refund.order", "order").leftJoinAndSelect("order.checkoutGroup", "checkoutGroup").orderBy("refund.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "refund", tenant);
    if (merchant) this.applyMerchantFilter(builder, "refund", merchant);
    if (query.status) builder.andWhere("refund.status = :status", { status: query.status });
    if (query.paymentMethod) builder.andWhere("order.paymentMethod = :paymentMethod", { paymentMethod: query.paymentMethod });
    this.applyDateRangeFilter(builder, "refund", query);
    if (query.keyword?.trim()) builder.andWhere("(refund.refundNo LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR refund.reason LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    if (query.checkoutGroupNo?.trim()) builder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    const rows = await builder.take(100).getMany();
    await this.hydrateMallRefunds(rows);
    return rows.map((row) => this.publicMallRefund(row));
  }

  async approveRefund(id: number, dto: MallRefundReviewDto, admin?: AdminContext) {
    const refund = await this.refunds.createQueryBuilder("refund")
      .where("refund.id = :id", { id })
      .getOne();
    if (!refund) throw new NotFoundException("售后单不存在");
    const refundRefs = await this.refunds.createQueryBuilder("refund")
      .select("refund.tenantId", "tenantId")
      .addSelect("refund.merchantId", "merchantId")
      .addSelect("refund.userId", "userId")
      .addSelect("refund.orderId", "orderId")
      .where("refund.id = :id", { id })
      .getRawOne<{ tenantId?: string; merchantId?: string; userId?: string; orderId?: string }>();
    const [refundTenant, refundMerchant, refundUser, refundOrder] = await Promise.all([
      this.tenants.findOne({ where: { id: Number(refundRefs?.tenantId || 0) }, loadEagerRelations: false }),
      refundRefs?.merchantId ? this.merchants.findOne({ where: { id: Number(refundRefs.merchantId) }, loadEagerRelations: false }) : Promise.resolve(null),
      this.users.findOne({ where: { id: Number(refundRefs?.userId || 0) }, loadEagerRelations: false }),
      this.orders.findOne({ where: { id: Number(refundRefs?.orderId || 0) }, loadEagerRelations: false })
    ]);
    if (!refundTenant || !refundUser || !refundOrder) throw new NotFoundException("商城售后单关联数据不存在");
    refund.tenant = refundTenant;
    refund.merchant = refundMerchant;
    refund.user = refundUser;
    refundOrder.tenant = refundTenant;
    refundOrder.merchant = refundMerchant;
    const refundCheckoutGroupId = Number((refundOrder.businessSnapshot as Record<string, unknown> | null)?.checkoutGroupId || 0);
    refundOrder.checkoutGroup = refundCheckoutGroupId
      ? await this.checkoutGroups.findOne({ where: { id: refundCheckoutGroupId }, loadEagerRelations: false })
      : null;
    refund.order = refundOrder;
    this.assertAdminTenantAccess(refund, admin);
    await this.assertAdminRowMerchantAccess({ tenant: refund.tenant, merchant: refund.merchant || refund.order?.merchant || null }, admin, "商城售后单", "refund.manage");
    const action = refund.type === "refund_only" ? "approve_refund" : refund.type === "return_refund" ? "approve_return" : "approve_exchange";
    this.assertMallAfterSaleAction(refund.status, action);
    await this.dataSource.transaction(async (manager) => {
      const refundRepo = manager.getRepository(MallRefund);
      const lockedRefund = await refundRepo.createQueryBuilder("refund")
        .where("refund.id = :id", { id: refund.id })
        .setLock("pessimistic_write")
        .getOne();
      if (!lockedRefund) throw new NotFoundException("售后单不存在");
      Object.assign(lockedRefund, { tenant: refund.tenant, merchant: refund.merchant, user: refund.user, order: refund.order });
      const lockedAction = lockedRefund.type === "refund_only" ? "approve_refund" : lockedRefund.type === "return_refund" ? "approve_return" : "approve_exchange";
      this.assertMallAfterSaleAction(lockedRefund.status, lockedAction);
      lockedRefund.reviewRemark = this.optionalString(dto.remark);
      lockedRefund.reviewedBy = admin?.username || "system";
      lockedRefund.reviewedAt = new Date();
      lockedRefund.responsibility = dto.responsibility || lockedRefund.responsibility || "undetermined";
      if (lockedRefund.type === "refund_only") {
        await this.applyMallRefundPlan(manager, lockedRefund, admin?.username || "system", false);
      } else {
        if (!dto.returnAddress || !Object.keys(dto.returnAddress).length) throw new BadRequestException("退货退款或换货审核通过时必须提供退货地址");
        lockedRefund.returnAddressSnapshot = dto.returnAddress;
        lockedRefund.status = "awaiting_buyer_return";
        lockedRefund.responseDeadlineAt = new Date(Date.now() + 7 * 24 * 60 * MINUTE_MS);
        await refundRepo.save(lockedRefund);
        await this.createMallRefundMessage(lockedRefund, "merchant", admin?.username || "system", { content: lockedRefund.reviewRemark || "商家已同意售后，请按退货地址寄回商品", images: [] }, "status", { returnAddress: dto.returnAddress }, manager);
      }
      Object.assign(refund, lockedRefund);
    });
    await this.logOperation(admin, "mall.refund.approve", "mall_refund", refund.id, `通过商城售后：${refund.refundNo}`, refund.tenant.id);
    await this.refreshCheckoutGroupStatusForOrder(refund.order);
    const saved = await this.refunds.findOne({ where: { id } });
    if (saved) await this.publishMallRefundQueryJob(saved);
    return saved ? this.publicMallRefundDetails(saved) : null;
  }

  async retryRefund(id: number, dto: MallRefundReviewDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    await this.assertAdminRowMerchantAccess({ tenant: refund.tenant, merchant: refund.merchant || refund.order?.merchant || null }, admin, "商城售后单", "refund.manage");
    if (!["processing", "failed"].includes(refund.status)) throw new BadRequestException("只有处理中或失败的售后单可以重试退款");
    await this.dataSource.transaction(async (manager) => {
      const remark = this.optionalString(dto.remark);
      refund.reviewRemark = remark || refund.reviewRemark;
      refund.reviewedBy = admin?.username || refund.reviewedBy || "system";
      refund.reviewedAt = new Date();
      await this.applyMallRefundPlan(manager, refund, admin?.username || "system", true);
    });
    await this.logOperation(admin, "mall.refund.retry", "mall_refund", refund.id, `重试商城退款：${refund.refundNo}`, refund.tenant.id);
    await this.refreshCheckoutGroupStatusForOrder(refund.order);
    const saved = await this.refunds.findOne({ where: { id } });
    if (saved) await this.publishMallRefundQueryJob(saved);
    return saved ? this.publicMallRefundDetails(saved) : null;
  }

  async scanProviderRefunds(admin?: AdminContext, refundId?: number) {
    const builder = this.refunds.createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .leftJoinAndSelect("order.merchant", "merchant")
      .leftJoinAndSelect("merchant.agent", "agent")
      .where("refund.status = :status", { status: "processing" })
      .andWhere("refund.providerRefundStatus IS NOT NULL")
      .andWhere("(refund.providerRefundNextQueryAt IS NULL OR refund.providerRefundNextQueryAt <= :now)", { now: new Date() })
      .orderBy("refund.createdAt", "ASC")
      .take(50);
    if (admin?.tenantId) builder.andWhere("refund.tenantId = :tenantId", { tenantId: admin.tenantId });
    if (refundId) builder.andWhere("refund.id = :refundId", { refundId });
    const rows = await builder.getMany();
    const checked: Array<{ id: number; refundNo: string; action: string }> = [];
    for (const refund of rows) {
      if (refund.order.paymentMethod !== PaymentMethod.Wechat) continue;
      try {
        const merchantDirect = refund.order.merchant?.paymentMode === "merchant_direct";
        const runtimeConfig = merchantDirect ? await this.mallMerchantWechatRuntimeConfig(refund.order.merchant!, true) : null;
        const result = await this.paymentProvider.queryRefund({ provider: "wechat", order: this.mallOrderPaymentView(refund.order), refundNo: refund.refundNo, providerRefundNo: refund.providerRefundNo, runtimeConfig });
        await this.applyMallRefundNotification(result, merchantDirect ? refund.order.merchant : null, { source: "provider_query_worker", checkedAt: new Date().toISOString() });
        checked.push({ id: refund.id, refundNo: refund.refundNo, action: result.status });
      } catch (error) {
        refund.providerRefundRetryCount = Number(refund.providerRefundRetryCount || 0) + 1;
        refund.providerRefundSyncedAt = new Date();
        refund.providerRefundFailureReason = error instanceof Error ? error.message : "商城退款渠道查询失败";
        refund.providerRefundNextQueryAt = new Date(Date.now() + Math.min(60, 10 * refund.providerRefundRetryCount) * MINUTE_MS);
        refund.providerRefundPayload = { ...(refund.providerRefundPayload || {}), lastQueryError: { message: refund.providerRefundFailureReason, checkedAt: new Date().toISOString() } };
        await this.refunds.save(refund);
        checked.push({ id: refund.id, refundNo: refund.refundNo, action: "query_error" });
      }
    }
    if (checked.length) await this.logOperation(admin, "mall.refund.provider_scan", "mall_refund", null, `扫描商城渠道退款 ${checked.length} 笔`, admin?.tenantId || undefined);
    return { checkedCount: checked.length, checked };
  }

  private async publishMallRefundQueryJob(refund: MallRefund) {
    if (refund.status !== "processing") return null;
    return this.businessJobs.publish({
      tenantId: refund.tenant?.id || 0,
      type: "mall-refund.provider-query",
      idempotencyKey: `mall-refund:${refund.id}`,
      payload: { refundId: refund.id, tenantId: refund.tenant?.id || 0 },
      runAt: refund.providerRefundNextQueryAt || new Date(),
      maxAttempts: 8
    });
  }

  async scanExpiredAfterSales(now = new Date()) {
    const rows = await this.refunds.find({ where: { status: In(["pending", "awaiting_buyer_return", "returning", "awaiting_merchant_receipt", "exchange_shipped"]), responseDeadlineAt: LessThan(now) }, order: { responseDeadlineAt: "ASC" }, take: 100 });
    const handled: Array<{ id: number; refundNo: string; action: string }> = [];
    for (const refund of rows) {
      if (refund.status === "awaiting_buyer_return") {
        refund.status = "cancelled";
        refund.responseDeadlineAt = null;
        await this.refunds.save(refund);
        await this.createMallRefundMessage(refund, "system", "mall_pending_order_worker", { content: "买家超过退货期限未填写寄回物流，售后已自动取消", images: [] }, "status");
        handled.push({ id: refund.id, refundNo: refund.refundNo, action: "cancelled_return_timeout" });
        continue;
      }
      const previousStatus = refund.status;
      refund.status = "platform_intervening";
      refund.platformInterventionRequested = true;
      refund.interventionAt = refund.interventionAt || now;
      refund.responseDeadlineAt = null;
      await this.refunds.save(refund);
      await this.createMallRefundMessage(refund, "system", "mall_pending_order_worker", { content: previousStatus === "pending" ? "商家超过响应期限，售后已自动转平台介入" : "售后履约超过处理期限，已自动转平台介入", images: [] }, "intervention");
      handled.push({ id: refund.id, refundNo: refund.refundNo, action: "platform_intervening" });
    }
    return { checkedCount: rows.length, handledCount: handled.length, handled };
  }

  async rejectRefund(id: number, dto: MallRefundReviewDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    await this.assertAdminRowMerchantAccess({ tenant: refund.tenant, merchant: refund.merchant || refund.order?.merchant || null }, admin, "商城售后单", "refund.manage");
    this.assertMallAfterSaleAction(refund.status, "reject");
    refund.status = "rejected";
    refund.reviewRemark = this.optionalString(dto.remark);
    refund.reviewedBy = admin?.username || "system";
    refund.reviewedAt = new Date();
    await this.refunds.save(refund);
    await this.createMallRefundMessage(refund, admin?.tenantId ? "merchant" : "platform", admin?.username || "system", { content: refund.reviewRemark || "售后申请未通过", images: [] }, "status", { responsibility: refund.responsibility });
    await this.refreshCheckoutGroupStatusForOrder(refund.order);
    await this.logOperation(admin, "mall.refund.reject", "mall_refund", refund.id, `拒绝商城售后：${refund.refundNo}`, refund.tenant.id);
    return this.publicMallRefundDetails(refund);
  }

  async addAdminRefundMessage(id: number, dto: MallRefundMessageDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    await this.assertAdminRowMerchantAccess({ tenant: refund.tenant, merchant: refund.merchant || refund.order?.merchant || null }, admin, "商城售后单", "refund.manage");
    if (["approved", "rejected", "cancelled"].includes(refund.status)) throw new BadRequestException("当前售后单已结束，不能继续协商");
    await this.createMallRefundMessage(refund, admin?.tenantId ? "merchant" : "platform", admin?.username || "system", dto, dto.images?.length ? "evidence" : "message");
    return this.publicMallRefundDetails(refund);
  }

  async receiveRefundReturn(id: number, dto: MallRefundReviewDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id }, relations: ["tenant", "merchant", "user", "order", "order.merchant"], loadEagerRelations: false });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    await this.assertAdminRowMerchantAccess({ tenant: refund.tenant, merchant: refund.merchant || refund.order?.merchant || null }, admin, "商城售后单", "refund.manage");
    this.assertMallAfterSaleAction(refund.status, "receive_return");
    await this.dataSource.transaction(async (manager) => {
      const refundRepo = manager.getRepository(MallRefund);
      const lockedRefund = await refundRepo.findOne({ where: { id: refund.id }, relations: ["tenant", "merchant", "user", "order", "order.merchant"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!lockedRefund) throw new NotFoundException("售后单不存在");
      this.assertMallAfterSaleAction(lockedRefund.status, "receive_return");
      const rows = await manager.getRepository(MallRefundItem).find({ where: { refund: { id: lockedRefund.id } }, loadEagerRelations: false });
      for (const row of rows) {
        row.receivedQuantity = row.requestedQuantity;
        row.approvedQuantity = row.requestedQuantity;
      }
      await manager.getRepository(MallRefundItem).save(rows);
      lockedRefund.merchantReceivedAt = new Date();
      lockedRefund.responseDeadlineAt = null;
      lockedRefund.reviewRemark = this.optionalString(dto.remark) || lockedRefund.reviewRemark;
      lockedRefund.responsibility = dto.responsibility || lockedRefund.responsibility || "undetermined";
      if (lockedRefund.type === "return_refund") {
        await this.applyMallRefundPlan(manager, lockedRefund, admin?.username || "system", false);
      }
      else {
        lockedRefund.status = "awaiting_exchange_shipment";
        await refundRepo.save(lockedRefund);
      }
      await this.createMallRefundMessage(lockedRefund, admin?.tenantId ? "merchant" : "platform", admin?.username || "system", { content: lockedRefund.type === "return_refund" ? "商家已确认收到退货，退款进入处理" : "商家已确认收到退货，等待寄出换货商品", images: [] }, "status", null, manager);
      Object.assign(refund, lockedRefund);
    });
    await this.logOperation(admin, "mall.refund.receive_return", "mall_refund", refund.id, `确认售后退货收货：${refund.refundNo}`, refund.tenant.id);
    const saved = await this.refunds.findOne({ where: { id }, relations: ["tenant", "merchant", "user", "order", "order.merchant"], loadEagerRelations: false });
    return saved ? this.publicMallRefundDetails(saved) : null;
  }

  async shipRefundExchange(id: number, dto: MallRefundExchangeShipmentDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id }, relations: ["tenant", "merchant", "user", "order", "order.merchant"], loadEagerRelations: false });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    await this.assertAdminRowMerchantAccess({ tenant: refund.tenant, merchant: refund.merchant || refund.order?.merchant || null }, admin, "商城售后单", "refund.manage");
    await this.dataSource.transaction(async (manager) => {
      const refundRepo = manager.getRepository(MallRefund);
      const lockedRefund = await refundRepo.findOne({ where: { id: refund.id }, relations: ["tenant", "merchant", "user", "order", "order.merchant"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!lockedRefund) throw new NotFoundException("售后单不存在");
      const replay = dto.businessKey ? await manager.getRepository(MallShipment).findOne({ where: { order: { id: lockedRefund.order.id }, businessKey: dto.businessKey }, loadEagerRelations: false }) : null;
      if (replay) {
        lockedRefund.exchangeShipmentId = replay.id;
        lockedRefund.status = "exchange_shipped";
        await refundRepo.save(lockedRefund);
        Object.assign(refund, lockedRefund);
        return;
      }
      this.assertMallAfterSaleAction(lockedRefund.status, "ship_exchange");
      const rows = await manager.getRepository(MallRefundItem).find({ where: { refund: { id: lockedRefund.id } }, relations: ["orderItem"], loadEagerRelations: false });
      const shipmentRepo = manager.getRepository(MallShipment);
      const shipment = await shipmentRepo.save(shipmentRepo.create({ tenant: lockedRefund.tenant, merchant: lockedRefund.merchant || lockedRefund.order.merchant || null, order: lockedRefund.order, refund: lockedRefund, shipmentNo: this.generateShipmentNo(lockedRefund.order.id), businessKey: this.optionalString(dto.businessKey) || `exchange:${lockedRefund.id}`, expressCompany: this.optionalString(dto.expressCompany), expressNo: this.requiredString(dto.expressNo, "换货物流单号"), status: "shipped", shipmentType: "exchange", createdBy: admin?.username || "system", remark: this.optionalString(dto.remark), shippedAt: new Date(), deliveredAt: null }));
      await manager.getRepository(MallShipmentItem).save(rows.map((row) => manager.getRepository(MallShipmentItem).create({ tenant: lockedRefund.tenant, merchant: lockedRefund.merchant || lockedRefund.order.merchant || null, order: lockedRefund.order, shipment, orderItem: row.orderItem, quantity: row.approvedQuantity || row.requestedQuantity, itemSnapshot: row.itemSnapshot })));
      lockedRefund.exchangeShipmentId = shipment.id;
      lockedRefund.status = "exchange_shipped";
      lockedRefund.responseDeadlineAt = new Date(Date.now() + 15 * 24 * 60 * MINUTE_MS);
      await refundRepo.save(lockedRefund);
      await this.createMallRefundMessage(lockedRefund, admin?.tenantId ? "merchant" : "platform", admin?.username || "system", { content: `换货商品已寄出：${shipment.expressCompany || "快递"} ${shipment.expressNo}`, images: [] }, "status", { shipmentId: shipment.id, shipmentNo: shipment.shipmentNo }, manager);
      Object.assign(refund, lockedRefund);
    });
    await this.logOperation(admin, "mall.refund.ship_exchange", "mall_refund", refund.id, `寄出换货商品：${refund.refundNo}`, refund.tenant.id);
    const saved = await this.refunds.findOne({ where: { id }, relations: ["tenant", "merchant", "user", "order", "order.merchant"], loadEagerRelations: false });
    return saved ? this.publicMallRefundDetails(saved) : null;
  }

  private async replaceSkus(product: MallProduct, tenant: Tenant, merchant: MallMerchant | null, inputs: MallProductDto["skus"]) {
    const existing = await this.skus.find({ where: { product: { id: product.id } } });
    const keepIds = new Set<number>();
    const skuCodes = new Set<string>();
    const barcodes = new Set<string>();
    for (const [index, input] of (inputs || []).entries()) {
      const id = Number(input.id || 0);
      const row = id ? existing.find((item) => item.id === id) || this.skus.create() : this.skus.create();
      const oldStock = Number(row.stock || 0);
      const oldLocked = Number(row.lockedStock || 0);
      const nextStock = Math.max(Math.trunc(Number(input.stock || 0)), 0);
      if (id && nextStock < oldLocked) throw new BadRequestException("规格库存不能小于当前已锁定库存，请先处理待支付/待确认订单");
      row.tenant = tenant;
      row.merchant = merchant;
      row.product = product;
      row.name = this.requiredString(input.name, "规格名称");
      row.skuCode = input.skuCode ? this.normalizeCatalogCode(input.skuCode, "SKU 编码") : null;
      row.barcode = this.optionalString(input.barcode);
      if (row.skuCode && skuCodes.has(row.skuCode)) throw new BadRequestException("同一商品内的 SKU 编码不能重复");
      if (row.barcode && barcodes.has(row.barcode)) throw new BadRequestException("同一商品内的商品条码不能重复");
      if (row.skuCode) {
        skuCodes.add(row.skuCode);
        const duplicate = await this.skus.findOne({ where: { merchant: merchant ? { id: merchant.id } : IsNull(), skuCode: row.skuCode } });
        if (duplicate && duplicate.id !== row.id) throw new BadRequestException(`SKU 编码 ${row.skuCode} 已被其他规格使用`);
      }
      if (row.barcode) {
        barcodes.add(row.barcode);
        const duplicate = await this.skus.findOne({ where: { merchant: merchant ? { id: merchant.id } : IsNull(), barcode: row.barcode } });
        if (duplicate && duplicate.id !== row.id) throw new BadRequestException(`商品条码 ${row.barcode} 已被其他规格使用`);
      }
      row.attributes = this.normalizeStringMap(input.attributes);
      row.weightGrams = Math.max(Math.trunc(Number(input.weightGrams || 0)), 0);
      row.price = Number(input.price || 0).toFixed(2);
      row.originalPrice = Number(input.originalPrice || 0).toFixed(2);
      row.stock = nextStock;
      row.lockedStock = oldLocked;
      row.sortOrder = Number(input.sortOrder ?? index);
      row.enabled = input.enabled !== false;
      const saved = await this.skus.save(row);
      if (saved.stock !== oldStock) {
        await this.inventoryLogs.save(this.inventoryLogs.create({ tenant, merchant, sku: saved, order: null, type: "adjust", operationKey: `product:${product.id}:version:${product.contentVersion}:sku:${saved.id}:adjust`, sourceType: "product_version", sourceId: `${product.id}:${product.contentVersion}`, quantity: saved.stock - oldStock, stockBefore: oldStock, stockAfter: saved.stock, lockedBefore: oldLocked, lockedAfter: saved.lockedStock, remark: id ? "商品编辑调整库存" : "商品创建初始化库存" }));
      }
      keepIds.add(saved.id);
    }
    const remove = existing.filter((item) => !keepIds.has(item.id));
    for (const sku of remove) sku.enabled = false;
    if (remove.length) await this.skus.save(remove);
  }

  private async deductLockedInventory(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder) {
    const skuRepo = manager.getRepository(MallSku);
    const inventoryRepo = manager.getRepository(MallInventoryLog);
    const items = await manager.getRepository(MallOrderItem).find({ where: { order: { id: order.id } }, relations: ["sku", "flashSale", "groupBuy"], loadEagerRelations: false });
    for (const item of items) {
      const sku = await skuRepo.findOne({ where: { id: item.sku.id }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!sku) continue;
      const operationKey = `order-item:${item.id}:base:deduct`;
      if (await inventoryRepo.findOne({ where: { tenant: { id: order.tenant.id }, operationKey }, loadEagerRelations: false })) continue;
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      if (beforeLocked < item.quantity || beforeStock < item.quantity) throw new BadRequestException(`商品规格 #${sku.id} 的锁定库存不足，支付扣减已中止并等待库存治理处理。`);
      sku.stock -= item.quantity;
      sku.lockedStock -= item.quantity;
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, merchant: order.merchant || sku.merchant || null, sku, order, type: "deduct", operationKey, sourceType: "mall_order_item", sourceId: String(item.id), quantity: item.quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: "商城支付确认扣库存" }));
      await this.deductFlashSaleStock(manager, order, item);
      await this.deductGroupBuyStock(manager, order, item);
    }
  }

  private async applySuccessfulMallPayment(order: MallOrder, transactionNo: string, provider: string, remark: string, paymentMethod: PaymentMethod) {
    const result = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(MallOrder);
      const paymentTxRepo = manager.getRepository(MallPaymentTransaction);
      const lockedOrder = await orderRepo.findOne({
        where: { id: order.id },
        relations: ["tenant", "merchant", "checkoutGroup", "user", "coupon"],
        loadEagerRelations: false,
        lock: { mode: "pessimistic_write" }
      });
      if (!lockedOrder) throw new NotFoundException("商城订单不存在");
      const existing = await paymentTxRepo.findOne({ where: { transactionNo } });
      if (existing || lockedOrder.status === "paid") {
        return { order: lockedOrder, paymentTransaction: existing, idempotent: true };
      }
      if (lockedOrder.status !== "pending_payment") throw new BadRequestException("当前商城订单不能确认支付");
      if (this.isExpiredMallOrder(lockedOrder)) throw new BadRequestException("商城订单已超时，不能确认支付");
      lockedOrder.status = "paid";
      lockedOrder.paymentMethod = paymentMethod;
      lockedOrder.transactionNo = transactionNo;
      lockedOrder.paidAt = new Date();
      lockedOrder.expiresAt = null;
      const savedOrder = await orderRepo.save(lockedOrder);
      await this.recordMallOrderEvent(manager, savedOrder, { eventKey: `paid:${provider}:${transactionNo}`, eventType: "payment_confirmed", fromStatus: "pending_payment", toStatus: "paid", source: "payment_callback", operator: provider, remark, detail: { provider, transactionNo, amount: savedOrder.amount } });
      await this.updateGroupBuyRecordsForOrder(manager, savedOrder, "paid");
      await this.deductLockedInventory(manager, savedOrder);
      await this.awardMallPurchasePoints(savedOrder, manager);
      await this.createMallCommissionForOrder(manager, savedOrder);
      const paymentTransaction = await paymentTxRepo.save(paymentTxRepo.create({
        order: savedOrder,
        tenant: savedOrder.tenant,
        merchant: savedOrder.merchant || null,
        transactionNo,
        provider,
        paymentMethod,
        amount: Number(savedOrder.amount || 0).toFixed(2),
        status: "success",
        reconciliationStatus: "matched",
        remark
      }));
      return { order: savedOrder, paymentTransaction, idempotent: false };
    });
    await this.refreshCheckoutGroupStatusForOrder(result.order);
    return result;
  }

  private async applySuccessfulCheckoutGroupPayment(checkoutGroup: MallCheckoutGroup, transactionNo: string, provider: string, remark: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const groupRepo = manager.getRepository(MallCheckoutGroup);
      const orderRepo = manager.getRepository(MallOrder);
      const paymentTxRepo = manager.getRepository(MallPaymentTransaction);
      const group = await groupRepo.findOne({ where: { id: checkoutGroup.id }, relations: ["tenant", "user"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!group) throw new NotFoundException("跨店结算组不存在");
      const orders = await orderRepo.createQueryBuilder("order")
        .leftJoinAndSelect("order.tenant", "orderTenant")
        .leftJoinAndSelect("order.merchant", "merchant")
        .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
        .leftJoinAndSelect("order.user", "orderUser")
        .leftJoinAndSelect("order.coupon", "coupon")
        .where("order.checkoutGroupId = :groupId", { groupId: group.id })
        .orderBy("order.id", "ASC")
        .setLock("pessimistic_write")
        .getMany();
      if (!orders.length) throw new BadRequestException("跨店结算组没有可支付子订单");
      if (orders.every((order) => ["paid", "shipped", "completed"].includes(order.status))) return { group, orders, idempotent: true };
      const reusedProviderTransaction = await paymentTxRepo.createQueryBuilder("payment")
        .where("payment.provider = :provider", { provider })
        .andWhere("JSON_UNQUOTE(JSON_EXTRACT(payment.businessSnapshot, '$.providerTransactionNo')) = :transactionNo", { transactionNo })
        .getOne();
      if (reusedProviderTransaction && reusedProviderTransaction.businessOrderNo !== group.groupNo) throw new BadRequestException("该微信支付流水已用于其他结算组，不能重复入账");
      if (orders.some((order) => order.paymentMethod !== PaymentMethod.Wechat || order.status !== "pending_payment")) throw new BadRequestException("结算组包含非待支付微信子订单，不能统一确认支付");
      if (orders.some((order) => order.merchant?.paymentMode === "merchant_direct")) throw new BadRequestException("商户直收子订单不能由平台结算组统一确认支付");
      if (orders.some((order) => this.isExpiredMallOrder(order))) throw new BadRequestException("结算组中存在已超时子订单，不能确认支付");
      const now = new Date();
      for (const order of orders) {
        order.status = "paid";
        order.paymentMethod = PaymentMethod.Wechat;
        order.transactionNo = `${transactionNo}:G${group.id}:O${order.id}`;
        order.paidAt = now;
        order.expiresAt = null;
        await orderRepo.save(order);
        await this.recordMallOrderEvent(manager, order, { eventKey: `paid:${provider}:${transactionNo}`, eventType: "payment_confirmed", fromStatus: "pending_payment", toStatus: "paid", source: "payment_callback", operator: provider, remark, detail: { checkoutGroupId: group.id, groupNo: group.groupNo, providerTransactionNo: transactionNo, amount: order.amount } });
        await this.updateGroupBuyRecordsForOrder(manager, order, "paid");
        await this.deductLockedInventory(manager, order);
        await this.awardMallPurchasePoints(order, manager);
        await this.createMallCommissionForOrder(manager, order);
        const childTransactionNo = `${transactionNo}:G${group.id}:O${order.id}`;
        const existing = await paymentTxRepo.findOne({ where: { transactionNo: childTransactionNo } });
        if (!existing) await paymentTxRepo.save(paymentTxRepo.create({ order, tenant: order.tenant, merchant: order.merchant || null, transactionNo: childTransactionNo, provider, paymentMethod: PaymentMethod.Wechat, amount: Number(order.amount || 0).toFixed(2), businessType: "mall_checkout_group_child", businessOrderNo: group.groupNo, businessSnapshot: { checkoutGroupId: group.id, groupNo: group.groupNo, providerTransactionNo: transactionNo, childOrderId: order.id, childOrderNo: order.orderNo, merchantId: order.merchant?.id || null, amount: order.amount }, status: "success", reconciliationStatus: "matched", remark }));
      }
      group.status = "paid";
      group.paymentTasks = orders.map((order) => ({ orderId: order.id, orderNo: order.orderNo, merchantId: order.merchant?.id || null, merchantName: order.merchant?.name || group.tenant.name, paymentMethod: PaymentMethod.Wechat, paymentMethodText: "微信统一支付", collectionModeText: "平台代收统一支付", paymentRouteText: "结算组一次支付", amount: order.amount, status: order.status, statusText: "待发货", paymentReady: true, payableOnline: false, manualConfirmationRequired: false, nextAction: "统一支付已完成，等待各店铺分别发货。" }));
      await groupRepo.save(group);
      return { group, orders, idempotent: false };
    });
    const publicOrders = await Promise.all(result.orders.map((order) => this.publicUserOrderWithItems(order, result.group.user)));
    return { checkoutGroup: this.publicCheckoutGroup(result.group, publicOrders), idempotent: result.idempotent };
  }

  private createWechatSandboxPayment(order: MallOrder, dto: MallProviderPayDto) {
    this.assertMallSandboxAllowed("商城微信支付");
    const transactionNo = String(dto.transactionNo || "").trim() || `MALWX${Date.now()}${order.id}`;
    const timestamp = String(Date.now());
    const amount = Number(order.amount || 0).toFixed(2);
    const sign = this.signWechatSandboxPayload(order.orderNo, transactionNo, amount, timestamp);
    const callbackPath = order.merchant?.paymentMode === "merchant_direct" ? `/payment/mall/merchants/${order.merchant.id}/wechat/callback` : "/payment/mall/wechat/callback";
    return {
      provider: "wechat",
      mode: "sandbox",
      orderNo: order.orderNo,
      amount,
      transactionNo,
      timestamp,
      sign,
      callbackPath,
      merchantId: order.merchant?.id || null,
      merchantName: order.merchant?.name || null,
      paymentMode: order.merchant?.paymentMode || "platform_collect",
      collectionMode: order.merchant?.paymentMode === "merchant_direct" ? "merchant_direct" : "platform_collect",
      payParams: {
        orderNo: order.orderNo,
        amount,
        transactionNo,
        timestamp,
        sign,
        paymentScene: dto.paymentScene || "h5"
      }
    };
  }

  private createCheckoutGroupWechatSandboxPayment(group: MallCheckoutGroup, dto: MallProviderPayDto) {
    this.assertMallSandboxAllowed("商城跨店微信统一支付");
    const transactionNo = String(dto.transactionNo || "").trim() || `MALGRPWX${Date.now()}${group.id}`;
    const timestamp = String(Date.now());
    const amount = Number(group.amount || 0).toFixed(2);
    const sign = this.signWechatSandboxPayload(group.groupNo, transactionNo, amount, timestamp);
    const callbackPath = "/payment/mall/wechat/callback";
    return {
      provider: "wechat", mode: "sandbox", orderNo: group.groupNo, groupNo: group.groupNo, checkoutGroupId: group.id, amount, transactionNo, timestamp, sign, callbackPath,
      paymentMode: "platform_collect", collectionMode: "platform_collect",
      payParams: { orderNo: group.groupNo, amount, transactionNo, timestamp, sign, paymentScene: dto.paymentScene || "h5" }
    };
  }

  private publicMallWechatPayParams(input: Record<string, string | number | boolean | null>) {
    const allowed = new Set(["tradeType", "h5Url", "codeUrl", "appId", "timeStamp", "nonceStr", "package", "signType", "paySign"]);
    return Object.fromEntries(Object.entries(input || {}).filter(([key]) => allowed.has(key)));
  }

  private parseWechatSandboxCallback(dto: Record<string, unknown>) {
    this.assertMallSandboxAllowed("商城微信支付回调");
    const orderNo = this.callbackString(dto, "orderNo", "out_trade_no");
    const transactionNo = this.callbackString(dto, "transactionNo", "transaction_id");
    const timestamp = this.callbackString(dto, "timestamp");
    const sign = this.callbackString(dto, "sign");
    const amount = Number((dto as Record<string, unknown>).amount);
    if (!orderNo || !transactionNo || !timestamp || !sign || !Number.isFinite(amount)) throw new BadRequestException("商城微信支付回调参数不完整");
    const amountText = amount.toFixed(2);
    const expectedSign = this.signWechatSandboxPayload(orderNo, transactionNo, amountText, timestamp);
    return { orderNo, transactionNo, amount: amountText, signatureValid: sign === expectedSign };
  }

  private mallCheckoutGroupPaymentView(group: MallCheckoutGroup, tenant: Tenant): Order {
    return { id: group.id, orderNo: group.groupNo, amount: group.amount, tenant, agent: null, registration: { activity: { title: `商城跨店结算 ${group.groupNo}` } } } as Order;
  }

  private async createPaymentCallbackLog(provider: string, payload: Record<string, unknown>, order: MallOrder | null, signatureValid: boolean | null) {
    const orderNo = this.callbackString(payload, "orderNo", "out_trade_no") || order?.orderNo || null;
    const transactionNo = this.callbackString(payload, "transactionNo", "transaction_id") || null;
    const amountValue = Number(payload.amount);
    return this.paymentCallbackLogs.save(this.paymentCallbackLogs.create({
      order,
      tenant: order?.tenant || null,
      merchant: order?.merchant || null,
      provider,
      orderNo,
      transactionNo,
      amount: Number.isFinite(amountValue) ? amountValue.toFixed(2) : null,
      signatureValid,
      resultStatus: "received",
      resultMessage: null,
      payload,
      processedAt: null
    }));
  }

  private finishPaymentCallbackLog(log: MallPaymentCallbackLog, resultStatus: string, resultMessage: string, order?: MallOrder | null) {
    log.order = order === undefined ? log.order : order;
    log.tenant = log.order?.tenant || log.tenant || null;
    log.merchant = log.order?.merchant || log.merchant || null;
    log.resultStatus = resultStatus;
    log.resultMessage = resultMessage;
    log.processedAt = new Date();
    return this.paymentCallbackLogs.save(log);
  }

  private async mallRefundProviderPlan(order: MallOrder, refund: MallRefund): Promise<MallRefundProviderPlan> {
    const now = new Date();
    const amount = Number(refund.amount || 0).toFixed(2);
    if (order.paymentMethod === PaymentMethod.Balance) {
      return {
        status: "approved" as const,
        provider: "balance",
        action: "refund",
        logStatus: "success",
        message: "商城余额退款已退回用户钱包",
        completedAt: now,
        providerRefundNo: `MALBALREF${Date.now()}${refund.id}`,
        providerRefundStatus: "success",
        providerRefundSyncedAt: now,
        providerRefundPayload: { mode: "wallet", orderNo: order.orderNo, refundNo: refund.refundNo, amount },
        providerRefundFailureReason: null,
        providerRefundRetryCount: Number(refund.providerRefundRetryCount || 0),
        providerRefundNextQueryAt: null
      };
    }
    if (order.paymentMethod === PaymentMethod.Offline) {
      return {
        status: "approved" as const,
        provider: "offline",
        action: "manual_refund",
        logStatus: "success",
        message: "商城线下退款已由财务人工确认",
        completedAt: now,
        providerRefundNo: `MALOFFREF${Date.now()}${refund.id}`,
        providerRefundStatus: "manual_success",
        providerRefundSyncedAt: now,
        providerRefundPayload: { mode: "manual", orderNo: order.orderNo, refundNo: refund.refundNo, amount },
        providerRefundFailureReason: null,
        providerRefundRetryCount: Number(refund.providerRefundRetryCount || 0),
        providerRefundNextQueryAt: null
      };
    }
    if (order.paymentMethod === PaymentMethod.Wechat) {
      if (await this.paymentProvider.usesRealProvider("wechat")) {
        const merchantDirect = order.merchant?.paymentMode === "merchant_direct";
        const runtimeConfig = merchantDirect ? await this.mallMerchantWechatRuntimeConfig(order.merchant!, true) : null;
        const notifyUrl = merchantDirect ? this.mallWechatMerchantRefundNotifyUrl(order.merchant!) : this.mallWechatRefundNotifyUrl();
        const callbackPath = merchantDirect ? `/payment/mall/merchants/${order.merchant!.id}/wechat/refund-callback` : "/payment/mall/wechat/refund-callback";
        const routing = this.mallWechatPaymentRoutingSummary(order, runtimeConfig, callbackPath);
        const result = await this.paymentProvider.requestRefund({
          provider: "wechat",
          order: this.mallOrderPaymentView(order),
          refundNo: refund.refundNo,
          amount,
          reason: refund.reason,
          operator: refund.reviewedBy || null,
          notifyUrl,
          runtimeConfig
        });
        const success = result.status === "success";
        const failed = result.status === "failed";
        return {
          status: success ? "approved" : failed ? "failed" : "processing",
          provider: "wechat",
          action: "refund",
          logStatus: success ? "success" : failed ? "failed" : "processing",
          message: success ? "商城微信真实退款已原路退回" : failed ? "商城微信真实退款失败，请查看服务商返回原因后重试" : "商城微信真实退款已提交服务商，等待退款结果同步",
          completedAt: success ? now : null,
          providerRefundNo: result.providerRefundNo,
          providerRefundStatus: result.status,
          providerRefundSyncedAt: now,
          providerRefundPayload: { mode: result.mode, orderNo: result.orderNo, transactionNo: order.transactionNo, refundNo: result.refundNo, amount: result.amount, notifyUrl, callbackPath, routing, raw: result.raw || null },
          providerRefundFailureReason: failed ? "微信退款请求返回失败，请在服务商后台核对" : null,
          providerRefundRetryCount: Number(refund.providerRefundRetryCount || 0),
          providerRefundNextQueryAt: success || failed ? null : new Date(Date.now() + 10 * MINUTE_MS)
        };
      }
      if (this.config.get("PAYMENT_SANDBOX_ENABLED", "false") === "true") {
        return {
          status: "approved" as const,
          provider: "wechat",
          action: "refund",
          logStatus: "success",
          message: "商城微信沙箱退款已模拟原路退回",
          completedAt: now,
          providerRefundNo: `MALWXREF${Date.now()}${refund.id}`,
          providerRefundStatus: "sandbox_success",
          providerRefundSyncedAt: now,
          providerRefundPayload: { mode: "sandbox", orderNo: order.orderNo, transactionNo: order.transactionNo, refundNo: refund.refundNo, amount },
          providerRefundFailureReason: null,
          providerRefundRetryCount: Number(refund.providerRefundRetryCount || 0),
          providerRefundNextQueryAt: null
        };
      }
      throw new BadRequestException("商城微信支付未启用真实渠道或沙箱，不能假装原路退款成功；请先启用真实支付并完成联调，或改用线下退款凭证处理");
    }
    throw new BadRequestException("当前支付方式暂不支持商城售后退款");
  }

  private async applyMallRefundPlan(manager: Pick<DataSource["manager"], "getRepository">, refund: MallRefund, operator: string, retry: boolean) {
    const refundRepo = manager.getRepository(MallRefund);
    const orderRepo = manager.getRepository(MallOrder);
    const lockedRefund = await refundRepo.createQueryBuilder("refund")
      .where("refund.id = :id", { id: refund.id })
      .setLock("pessimistic_write")
      .getOne();
    if (!lockedRefund) throw new NotFoundException("商城售后单不存在");
    Object.assign(lockedRefund, { tenant: refund.tenant, merchant: refund.merchant, user: refund.user, order: refund.order });
    lockedRefund.reviewRemark = refund.reviewRemark ?? lockedRefund.reviewRemark;
    lockedRefund.reviewedBy = refund.reviewedBy ?? lockedRefund.reviewedBy;
    lockedRefund.reviewedAt = refund.reviewedAt ?? lockedRefund.reviewedAt;
    lockedRefund.merchantReceivedAt = refund.merchantReceivedAt ?? lockedRefund.merchantReceivedAt;
    lockedRefund.responsibility = refund.responsibility || lockedRefund.responsibility;
    lockedRefund.responseDeadlineAt = refund.responseDeadlineAt;
    if (retry && !["processing", "failed"].includes(lockedRefund.status)) throw new BadRequestException("只有处理中或失败的售后单可以重试退款");
    if (!retry && !["pending", "platform_intervening", "returning", "awaiting_merchant_receipt"].includes(lockedRefund.status)) throw new BadRequestException("当前售后单状态已变化，请刷新后重试");
    const lockedOrder = await orderRepo.createQueryBuilder("order")
      .where("order.id = :id", { id: lockedRefund.order.id })
      .setLock("pessimistic_write")
      .getOne();
    if (!lockedOrder) throw new NotFoundException("商城订单不存在");
    Object.assign(lockedOrder, {
      tenant: lockedRefund.tenant,
      merchant: lockedRefund.merchant || lockedRefund.order.merchant,
      checkoutGroup: lockedRefund.order.checkoutGroup,
      user: lockedRefund.user,
      coupon: lockedRefund.order.coupon
    });
    if (!lockedOrder.coupon && lockedOrder.couponId) {
      lockedOrder.coupon = await this.coupons.findOne({ where: { id: lockedOrder.couponId }, loadEagerRelations: false });
    }
    const refundPlan = await this.mallRefundProviderPlan(lockedOrder, lockedRefund);
    lockedRefund.status = refundPlan.status;
    lockedRefund.completedAt = refundPlan.completedAt;
    lockedRefund.providerRefundNo = refundPlan.providerRefundNo;
    lockedRefund.providerRefundStatus = refundPlan.providerRefundStatus;
    lockedRefund.providerRefundSyncedAt = refundPlan.providerRefundSyncedAt;
    lockedRefund.providerRefundPayload = { ...(refundPlan.providerRefundPayload || {}), retry };
    lockedRefund.providerRefundFailureReason = refundPlan.providerRefundFailureReason;
    lockedRefund.providerRefundRetryCount = Number(lockedRefund.providerRefundRetryCount || 0) + (retry ? 1 : 0);
    lockedRefund.providerRefundNextQueryAt = refundPlan.providerRefundNextQueryAt;
    lockedRefund.responseDeadlineAt = null;
    await refundRepo.save(lockedRefund);
    if (refundPlan.status === "approved") {
      await this.completeMallRefundBusiness(manager, lockedOrder, lockedRefund, operator);
    }
    await this.createMallRefundLog(manager, lockedRefund, lockedOrder, refundPlan, retry ? `${operator}（重试）` : operator);
    Object.assign(refund, lockedRefund);
  }

  private async applyMallRefundNotification(notification: ProviderRefundNotificationResult, merchant: MallMerchant | null, rawPayload: Record<string, unknown>) {
    const refund = await this.refunds.findOne({ where: { refundNo: notification.refundNo }, relations: ["order", "order.merchant"], loadEagerRelations: false });
    if (!refund) throw new NotFoundException("商城退款单不存在");
    if (refund.order.orderNo !== notification.orderNo) throw new BadRequestException("退款通知与商城退款单订单不一致");
    if (!merchant && refund.order.merchant?.paymentMode === "merchant_direct") throw new BadRequestException("商户直收退款通知必须走店铺专属退款回调地址，请核对微信退款 notify_url");
    if (merchant && refund.order.merchant?.id !== merchant.id) throw new BadRequestException("退款通知店铺与商城订单店铺不一致，请核对微信退款回调地址");
    if (refund.order.paymentMethod !== PaymentMethod.Wechat) throw new BadRequestException("退款通知对应订单不是微信支付订单");
    if (!["processing", "approved", "failed"].includes(refund.status)) throw new BadRequestException("商城退款单尚未进入服务商处理状态");

    const now = new Date();
    let action = "processing";
    await this.dataSource.transaction(async (manager) => {
      const refundRepo = manager.getRepository(MallRefund);
      const orderRepo = manager.getRepository(MallOrder);
      const lockedRefund = await refundRepo.findOne({ where: { id: refund.id }, relations: ["order"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!lockedRefund) throw new NotFoundException("商城退款单不存在");
      const lockedOrder = await orderRepo.findOne({
        where: { id: lockedRefund.order.id },
        relations: ["tenant", "merchant", "checkoutGroup", "user", "coupon"],
        loadEagerRelations: false,
        lock: { mode: "pessimistic_write" }
      });
      if (!lockedOrder) throw new NotFoundException("商城订单不存在");
      const alreadyRefunded = lockedRefund.status === "approved";
      lockedRefund.providerRefundNo = notification.providerRefundNo || lockedRefund.providerRefundNo;
      lockedRefund.providerRefundStatus = notification.status;
      lockedRefund.providerRefundSyncedAt = now;
      lockedRefund.providerRefundPayload = { ...(lockedRefund.providerRefundPayload || {}), lastNotification: notification.raw || notification, callbackPayload: rawPayload };
      lockedRefund.providerRefundFailureReason = notification.failureReason || null;

      if (notification.status === "success") {
        lockedRefund.status = "approved";
        lockedRefund.completedAt = lockedRefund.completedAt || now;
        lockedRefund.providerRefundNextQueryAt = null;
        await refundRepo.save(lockedRefund);
        if (!alreadyRefunded) {
          await this.completeMallRefundBusiness(manager, lockedOrder, lockedRefund, "provider_callback");
        }
        action = alreadyRefunded ? "idempotent" : "completed";
      } else if (notification.status === "failed") {
        if (!alreadyRefunded) {
          lockedRefund.status = "failed";
          lockedRefund.providerRefundNextQueryAt = null;
        }
        await refundRepo.save(lockedRefund);
        action = alreadyRefunded ? "idempotent" : "failed";
      } else {
        if (!alreadyRefunded) {
          lockedRefund.status = "processing";
          lockedRefund.providerRefundNextQueryAt = new Date(Date.now() + 10 * MINUTE_MS);
        }
        await refundRepo.save(lockedRefund);
        action = alreadyRefunded ? "idempotent" : "processing";
      }

      await this.createMallRefundLog(manager, lockedRefund, lockedOrder, {
        status: lockedRefund.status === "approved" ? "approved" : lockedRefund.status === "failed" ? "failed" : "processing",
        provider: "wechat",
        action: "refund_notification",
        logStatus: action === "completed" || action === "idempotent" ? "success" : action,
        message: notification.status === "success" ? "微信退款通知确认成功" : notification.status === "failed" ? "微信退款通知确认失败" : "微信退款通知处理中",
        completedAt: lockedRefund.completedAt,
        providerRefundNo: lockedRefund.providerRefundNo,
        providerRefundStatus: lockedRefund.providerRefundStatus,
        providerRefundSyncedAt: lockedRefund.providerRefundSyncedAt,
        providerRefundPayload: lockedRefund.providerRefundPayload,
        providerRefundFailureReason: lockedRefund.providerRefundFailureReason,
        providerRefundRetryCount: lockedRefund.providerRefundRetryCount,
        providerRefundNextQueryAt: lockedRefund.providerRefundNextQueryAt
      }, "provider_callback");
    });

    const saved = await this.refunds.findOne({ where: { id: refund.id } });
    await this.refreshCheckoutGroupStatusForOrder(refund.order);
    return { received: true, provider: "wechat", action, refund: saved };
  }

  private async refundMallBalanceOnce(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, refund: MallRefund, operator: string) {
    const txRepo = manager.getRepository(WalletTransaction);
    const idempotencyKey = `mall_refund:${refund.id}`;
    const exists = await txRepo.findOne({ where: { idempotencyKey }, loadEagerRelations: false });
    if (exists) return;
    const walletRepo = manager.getRepository(UserWallet);
    const tenantScopeKey = this.walletTenantScopeKey(refund.tenant);
    let wallet = await walletRepo.findOne({ where: { user: { id: refund.user.id }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
    if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user: refund.user, tenant: refund.tenant, tenantScopeKey }));
    const paymentTx = await txRepo.findOne({ where: { idempotencyKey: `mall_balance_pay:${order.id}` }, loadEagerRelations: false });
    const fundingSnapshot = (order.businessSnapshot as Record<string, any> | null)?.walletFunding;
    const originalGiftUsedFen = Number.isSafeInteger(Number(fundingSnapshot?.giftFen)) ? Math.max(Number(fundingSnapshot.giftFen), 0) : paymentTx ? Math.max(yuanToFen(paymentTx.giftBefore || 0) - yuanToFen(paymentTx.giftAfter || 0), 0) : 0;
    const orderRefunds = await manager.getRepository(MallRefund).find({ where: { order: { id: order.id }, status: "approved" } });
    let restoredGiftFen = 0;
    for (const prior of orderRefunds.filter((item) => item.id !== refund.id)) {
      const priorTx = await txRepo.findOne({ where: { idempotencyKey: `mall_refund:${prior.id}` }, loadEagerRelations: false });
      if (priorTx) restoredGiftFen += Math.max(yuanToFen(priorTx.giftAfter || 0) - yuanToFen(priorTx.giftBefore || 0), 0);
    }
    const amount = Number(refund.amount);
    const amountFen = yuanToFen(amount);
    const giftReturnFen = Math.min(Math.max(originalGiftUsedFen - restoredGiftFen, 0), amountFen);
    const cashReturnFen = amountFen - giftReturnFen;
    const beforeFen = yuanToFen(wallet.availableBalance || 0);
    const giftBeforeFen = yuanToFen(wallet.giftBalance || 0);
    const afterFen = beforeFen + cashReturnFen;
    const giftAfterFen = giftBeforeFen + giftReturnFen;
    wallet.availableBalance = fenToYuan(afterFen);
    wallet.giftBalance = fenToYuan(giftAfterFen);
    await walletRepo.save(wallet);
    await txRepo.save(txRepo.create({ wallet, user: refund.user, tenant: refund.tenant, order: null, transactionNo: `MALREF${Date.now()}${refund.id}`, direction: "credit", type: "refund_return", amount: amount.toFixed(2), balanceBefore: fenToYuan(beforeFen), balanceAfter: fenToYuan(afterFen), frozenBefore: wallet.frozenBalance || "0.00", frozenAfter: wallet.frozenBalance || "0.00", giftBefore: fenToYuan(giftBeforeFen), giftAfter: fenToYuan(giftAfterFen), frozenGiftBefore: wallet.frozenGiftBalance || "0.00", frozenGiftAfter: wallet.frozenGiftBalance || "0.00", operator, remark: `商城订单退款：${order.orderNo}`, idempotencyKey }));
  }

  private async createMallRefundLog(manager: Pick<DataSource["manager"], "getRepository">, refund: MallRefund, order: MallOrder, plan: MallRefundProviderPlan, operator: string) {
    return manager.getRepository(MallRefundLog).save(manager.getRepository(MallRefundLog).create({
      refund,
      order,
      tenant: refund.tenant,
      merchant: refund.merchant || order.merchant || null,
      provider: plan.provider,
      action: plan.action,
      status: plan.logStatus,
      providerRefundNo: plan.providerRefundNo,
      amount: Number(refund.amount || 0).toFixed(2),
      message: plan.providerRefundFailureReason || plan.message,
      operator,
      payload: plan.providerRefundPayload
    }));
  }

  private async recordMallPaymentDiscrepancy(order: MallOrder, transactionNo: string, amount: string, discrepancyType: string, remark: string) {
    const existing = await this.paymentTransactions.findOne({ where: { transactionNo } });
    if (existing) return existing;
    return this.paymentTransactions.save(this.paymentTransactions.create({
      order,
      tenant: order.tenant,
      merchant: order.merchant || null,
      transactionNo,
      provider: "wechat",
      paymentMethod: PaymentMethod.Wechat,
      amount: Number(amount || 0).toFixed(2),
      status: "discrepancy",
      reconciliationStatus: "unmatched",
      discrepancyType,
      remark
    }));
  }

  private isExpiredMallOrder(order: MallOrder) {
    return Boolean(order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now());
  }

  private assertMallSandboxAllowed(label: string) {
    if (this.config.get("PAYMENT_SANDBOX_ENABLED", "false") === "true") return;
    throw new BadRequestException(`${label}需要先启用 PAYMENT_SANDBOX_ENABLED=true`);
  }

  private signWechatSandboxPayload(orderNo: string, transactionNo: string, amount: string, timestamp: string) {
    const secret = this.config.get("WECHAT_PAY_SANDBOX_SECRET") || this.config.get("PAYMENT_SANDBOX_SECRET", "dev-payment-secret");
    return createHmac("sha256", secret).update(["wechat", orderNo, transactionNo, amount, timestamp].join("|")).digest("hex");
  }

  private callbackString(payload: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return null;
  }

  private async completeMallRefundBusiness(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, refund: MallRefund, operator: string) {
    const refundItemRepo = manager.getRepository(MallRefundItem);
    const rows = await refundItemRepo.find({ where: { refund: { id: refund.id } }, loadEagerRelations: false });
    const itemRefs = await refundItemRepo.createQueryBuilder("refundItem")
      .select("refundItem.id", "id")
      .addSelect("refundItem.orderItemId", "orderItemId")
      .where("refundItem.refundId = :refundId", { refundId: refund.id })
      .getRawMany<{ id: string; orderItemId: string }>();
    const itemRefMap = new Map(itemRefs.map((item) => [Number(item.id), Number(item.orderItemId)]));
    for (const row of rows) {
      const orderItemId = itemRefMap.get(row.id);
      if (!orderItemId) continue;
      const orderItem = await this.orderItems.findOne({ where: { id: orderItemId }, loadEagerRelations: false });
      if (!orderItem) continue;
      const orderItemRefs = await this.orderItems.createQueryBuilder("orderItem")
        .select("orderItem.skuId", "skuId")
        .addSelect("orderItem.flashSaleId", "flashSaleId")
        .addSelect("orderItem.groupBuyId", "groupBuyId")
        .where("orderItem.id = :id", { id: orderItemId })
        .getRawOne<{ skuId?: string; flashSaleId?: string; groupBuyId?: string }>();
      orderItem.tenant = order.tenant;
      orderItem.merchant = order.merchant;
      orderItem.order = order;
      orderItem.sku = await this.skus.findOne({ where: { id: Number(orderItemRefs?.skuId || 0) }, loadEagerRelations: false }) as MallSku;
      if (orderItem.sku) {
        orderItem.sku.tenant = order.tenant;
        orderItem.sku.merchant = order.merchant;
      }
      orderItem.flashSale = orderItemRefs?.flashSaleId ? await this.flashSales.findOne({ where: { id: Number(orderItemRefs.flashSaleId) }, loadEagerRelations: false }) : null;
      orderItem.groupBuy = orderItemRefs?.groupBuyId ? await this.groupBuys.findOne({ where: { id: Number(orderItemRefs.groupBuyId) }, loadEagerRelations: false }) : null;
      row.orderItem = orderItem;
    }
    if (rows.length) {
      for (const row of rows) {
        row.approvedQuantity = row.requestedQuantity;
        row.refundedAmountFen = refund.amountFen > 0 && refund.amountFen < rows.reduce((sum, item) => sum + Number(item.refundableAmountFen || 0), 0)
          ? Math.floor(refund.amountFen * Number(row.refundableAmountFen || 0) / rows.reduce((sum, item) => sum + Number(item.refundableAmountFen || 0), 0))
          : Number(row.refundableAmountFen || 0);
      }
      const allocated = rows.reduce((sum, row) => sum + Number(row.refundedAmountFen || 0), 0);
      if (rows.length && allocated < refund.amountFen) rows[0].refundedAmountFen += refund.amountFen - allocated;
      for (const row of rows) await refundItemRepo.update(row.id, { approvedQuantity: row.approvedQuantity, refundedAmountFen: row.refundedAmountFen });
      await this.returnRefundInventory(manager, order, refund, rows);
    } else if (refund.amountFen >= yuanToFen(order.amount)) {
      await this.returnInventory(manager, order);
    }
    if (order.paymentMethod === PaymentMethod.Balance) await this.refundMallBalanceOnce(manager, order, refund, operator);
    const approvedRow = await manager.getRepository(MallRefund).createQueryBuilder("refund")
      .select("COALESCE(SUM(refund.amountFen), 0)", "sum")
      .where("refund.orderId = :orderId", { orderId: order.id })
      .andWhere("refund.status = :status", { status: "approved" })
      .getRawOne<{ sum: string }>();
    const approvedFen = Number(approvedRow?.sum || 0);
    order.status = nextMallOrderStatusAfterRefund({ orderAmountFen: yuanToFen(order.amount), approvedRefundFen: approvedFen, shipped: Boolean(order.shippedAt), completed: Boolean(order.completedAt) });
    await manager.getRepository(MallOrder).update(order.id, { status: order.status });
    if (order.status === "refunded") {
      await this.updateGroupBuyRecordsForOrder(manager, order, "refunded");
      const refundReleasePolicy = String((order.couponSnapshot as Record<string, unknown> | null)?.refundReleasePolicy || order.coupon?.refundReleasePolicy || "full_refund");
      if (shouldReleaseMallCouponAfterRefund({ policy: refundReleasePolicy, orderAmountFen: yuanToFen(order.amount), approvedRefundFen: approvedFen })) {
        await this.releaseCouponUsage(manager, order, `订单全额退款返还优惠券：${refund.refundNo}`);
      }
    }
    await this.adjustMallCommissionForRefund(manager, order, approvedFen, refund.refundNo);
    await this.handleMallRefundPoints(order, refund, approvedFen, manager);
  }

  private async returnRefundInventory(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, refund: MallRefund, rows: MallRefundItem[]) {
    if (refund.type === "exchange") return;
    const skuRepo = manager.getRepository(MallSku);
    const inventoryRepo = manager.getRepository(MallInventoryLog);
    for (const row of rows) {
      const item = row.orderItem;
      let quantity = row.requestedQuantity;
      if (refund.type === "refund_only") {
        const shipped = await manager.getRepository(MallShipmentItem).createQueryBuilder("shipmentItem")
          .leftJoin("shipmentItem.shipment", "shipment")
          .select("COALESCE(SUM(shipmentItem.quantity), 0)", "quantity")
          .where("shipmentItem.orderItemId = :orderItemId", { orderItemId: item.id })
          .andWhere("shipment.status <> :cancelled", { cancelled: "cancelled" })
          .andWhere("shipment.shipmentType = :shipmentType", { shipmentType: "order" })
          .getRawOne<{ quantity: string }>();
        quantity = Math.min(quantity, Math.max(item.quantity - Number(shipped?.quantity || 0), 0));
      } else {
        quantity = Math.min(quantity, row.receivedQuantity || row.requestedQuantity);
      }
      quantity = Math.max(quantity - Number(row.stockRestoredQuantity || 0), 0);
      if (!quantity) continue;
      const operationKey = `refund-item:${row.id}:base:return`;
      if (await inventoryRepo.findOne({ where: { tenant: { id: order.tenant.id }, operationKey }, loadEagerRelations: false })) continue;
      const sku = await skuRepo.findOne({ where: { id: item.sku.id }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!sku) continue;
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      sku.stock += quantity;
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, merchant: order.merchant || sku.merchant || null, sku, order, type: "return", operationKey, sourceType: "mall_refund_item", sourceId: String(row.id), quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: `商城售后退回库存：${refund.refundNo}` }));
      await this.returnRefundPromotionInventory(manager, order, item, row, quantity, refund.refundNo);
      row.stockRestoredQuantity += quantity;
      await manager.getRepository(MallRefundItem).update(row.id, { stockRestoredQuantity: row.stockRestoredQuantity });
    }
  }

  private async returnRefundPromotionInventory(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem, refundItem: MallRefundItem, quantity: number, refundNo: string) {
    const inventoryRepo = manager.getRepository(MallInventoryLog);
    const flashSale = await this.flashSaleForOrderItem(manager, order, item);
    if (flashSale) {
      const operationKey = `refund-item:${refundItem.id}:flash:${flashSale.id}:return`;
      if (!(await inventoryRepo.findOne({ where: { tenant: { id: order.tenant.id }, operationKey }, loadEagerRelations: false }))) {
        const beforeSold = Number(flashSale.soldStock || 0);
        flashSale.soldStock = Math.max(beforeSold - quantity, 0);
        await manager.getRepository(MallFlashSale).save(flashSale);
        await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, merchant: order.merchant || flashSale.merchant, sku: item.sku, order, type: "return", operationKey, sourceType: "flash_sale", sourceId: String(flashSale.id), quantity, stockBefore: flashSale.saleStock - beforeSold, stockAfter: flashSale.saleStock - flashSale.soldStock, lockedBefore: flashSale.lockedStock, lockedAfter: flashSale.lockedStock, remark: `商城售后退回秒杀库存：${refundNo}` }));
      }
    }
    const groupBuy = await this.groupBuyForOrderItem(manager, order, item);
    if (groupBuy) {
      const operationKey = `refund-item:${refundItem.id}:group:${groupBuy.id}:return`;
      if (!(await inventoryRepo.findOne({ where: { tenant: { id: order.tenant.id }, operationKey }, loadEagerRelations: false }))) {
        const beforeSold = Number(groupBuy.soldStock || 0);
        groupBuy.soldStock = Math.max(beforeSold - quantity, 0);
        await manager.getRepository(MallGroupBuy).save(groupBuy);
        await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, merchant: order.merchant || groupBuy.merchant, sku: item.sku, order, type: "return", operationKey, sourceType: "group_buy", sourceId: String(groupBuy.id), quantity, stockBefore: groupBuy.groupStock - beforeSold, stockAfter: groupBuy.groupStock - groupBuy.soldStock, lockedBefore: groupBuy.lockedStock, lockedAfter: groupBuy.lockedStock, remark: `商城售后退回拼团库存：${refundNo}` }));
      }
    }
  }

  private async adjustMallCommissionForRefund(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, approvedRefundFen: number, refundNo: string) {
    const repo = manager.getRepository(MallCommission);
    const commissions = await repo.find({
      where: { order: { id: order.id } },
      relations: ["tenant", "merchant", "order"],
      order: { id: "ASC" },
      loadEagerRelations: false,
      lock: { mode: "pessimistic_write" }
    });
    if (!commissions.length) return;
    const refund = await manager.getRepository(MallRefund).findOne({ where: { refundNo, order: { id: order.id } }, loadEagerRelations: false });
    const originalOrderFen = yuanToFen(order.amount);
    for (const commission of commissions) {
      const originalCommissionFen = yuanToFen(commission.originalCommissionAmount || commission.commissionAmount);
      const netCommissionFen = refundedCommissionFen(originalCommissionFen, originalOrderFen, approvedRefundFen);
      const previousCurrentFen = yuanToFen(commission.commissionAmount);
      const originalBaseFen = Number((commission.calculationSnapshot as Record<string, unknown> | null)?.baseAmountFen || yuanToFen(commission.orderAmount));
      commission.refundedOrderAmount = fenToYuan(Math.min(Math.max(approvedRefundFen, 0), originalOrderFen));
      if (commission.status === "pending" || commission.status === "risk_review") {
        const reductionFen = Math.max(previousCurrentFen - netCommissionFen, 0);
        commission.orderAmount = fenToYuan(refundedCommissionFen(originalBaseFen, originalOrderFen, approvedRefundFen));
        commission.commissionAmount = fenToYuan(netCommissionFen);
        if (!netCommissionFen) {
          commission.status = "void";
          commission.voidReason = `商城订单已全额退款：${refundNo}`;
          commission.voidedAt = new Date();
        }
        await repo.save(commission);
        if (reductionFen > 0) await this.saveCommissionAdjustment(manager, commission, { operationKey: `commission-refund:${refundNo}:${commission.id}`, type: "refund_reduction", direction: "debit", amountFen: reductionFen, beforeFen: previousCurrentFen, afterFen: netCommissionFen, refund, remark: `退款减少待结佣金：${refundNo}` });
      } else if (commission.status === "settled") {
        const targetClawbackFen = Math.max(originalCommissionFen - netCommissionFen, 0);
        const previousClawbackFen = yuanToFen(commission.clawbackAmount);
        const settledClawbackFen = yuanToFen(commission.clawbackSettledAmount);
        const deltaFen = Math.max(targetClawbackFen - previousClawbackFen, 0);
        commission.clawbackAmount = fenToYuan(targetClawbackFen);
        commission.clawbackStatus = targetClawbackFen > settledClawbackFen ? "pending" : targetClawbackFen > 0 ? "settled" : "none";
        await repo.save(commission);
        if (deltaFen > 0) await this.saveCommissionAdjustment(manager, commission, { operationKey: `commission-clawback:${refundNo}:${commission.id}`, type: "refund_clawback", direction: "debit", amountFen: deltaFen, beforeFen: previousClawbackFen, afterFen: targetClawbackFen, refund, remark: `退款产生已结佣金扣回：${refundNo}` });
      }
    }
  }

  private async returnInventory(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder) {
    const skuRepo = manager.getRepository(MallSku);
    const inventoryRepo = manager.getRepository(MallInventoryLog);
    const items = await manager.getRepository(MallOrderItem).find({ where: { order: { id: order.id } }, relations: ["sku", "flashSale", "groupBuy"], loadEagerRelations: false });
    for (const item of items) {
      const sku = await skuRepo.findOne({ where: { id: item.sku.id }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!sku) continue;
      const operationKey = `order-item:${item.id}:base:return`;
      if (await inventoryRepo.findOne({ where: { tenant: { id: order.tenant.id }, operationKey }, loadEagerRelations: false })) continue;
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      sku.stock += item.quantity;
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, merchant: order.merchant || sku.merchant || null, sku, order, type: "return", operationKey, sourceType: "mall_order_item", sourceId: String(item.id), quantity: item.quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: "商城退款退回库存" }));
      await this.returnFlashSaleStock(manager, order, item);
      await this.returnGroupBuyStock(manager, order, item);
    }
  }

  private async resolveOrderInputItems(user: User, tenant: Tenant, dto: { cartItemIds?: number[]; items?: MallOrderInputItem[] }) {
    const cartRows = Array.isArray(dto.cartItemIds) && dto.cartItemIds.length ? await this.cartItems.find({ where: { id: In(dto.cartItemIds.map(Number).filter(Boolean)), tenant: { id: tenant.id }, user: { id: user.id } } }) : [];
    if (dto.cartItemIds?.length && cartRows.length !== dto.cartItemIds.length) throw new BadRequestException("购物车商品不存在或已失效");
    const items: MallOrderInputItem[] = cartRows.length
      ? cartRows.map((row) => ({ skuId: row.sku.id, quantity: row.quantity }))
      : Array.isArray(dto.items)
        ? dto.items.map((item) => ({ ...item, skuId: Number(item.skuId), quantity: Number(item.quantity || 0) }))
        : [];
    return { cartRows, items };
  }

  private async resolveOrderMerchantGroups(tenant: Tenant, items: MallOrderInputItem[]) {
    const skuIds = Array.from(new Set(items.map((item) => Number(item.skuId || 0)).filter(Boolean)));
    const skus = skuIds.length
      ? await this.skus.find({
          where: { id: In(skuIds), tenant: { id: tenant.id }, enabled: true },
          relations: ["merchant", "merchant.tenant", "product", "product.merchant", "product.merchant.tenant", "product.category"],
          loadEagerRelations: false
        })
      : [];
    const skuMap = new Map(skus.map((sku) => [sku.id, sku]));
    const defaultMerchant = await this.ensureDefaultMerchant(tenant);
    const groups = new Map<number, { merchant: MallMerchant; items: MallOrderInputItem[] }>();
    for (const item of items) {
      const sku = skuMap.get(Number(item.skuId || 0));
      if (!sku || sku.product.status !== "published") throw new NotFoundException("商品规格不存在或已下架");
      const merchant = sku.merchant || sku.product.merchant || defaultMerchant;
      if (merchant.tenant.id !== tenant.id || merchant.status !== "active" || !merchant.mallEnabled) throw new BadRequestException(`「${sku.product.title}」所属店铺暂未开放`);
      const group = groups.get(merchant.id) || { merchant, items: [] };
      group.items.push(item);
      groups.set(merchant.id, group);
    }
    return Array.from(groups.values());
  }

  private async createCheckoutGroupFromResolved(user: User, dto: CreateMallOrderDto, context: PublicTenantContext | undefined, tenant: Tenant, cartRows: MallCartItem[], groups: { merchant: MallMerchant; items: MallOrderInputItem[] }[], riskContext?: MallRiskContext): Promise<MallCheckoutGroupResult> {
    const paymentMethod = dto.paymentMethod || PaymentMethod.Offline;
    const clientOrderKey = this.normalizeClientOrderKey(dto.clientOrderKey);
    if (clientOrderKey) {
      const existingGroup = await this.checkoutGroups.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, clientOrderKey } });
      if (existingGroup) {
        const existingResult = await this.checkoutGroupResultForUser(existingGroup, user);
        if (existingResult) return existingResult;
        throw new BadRequestException("上一次跨店结算未生成有效子订单，请刷新页面后重新提交，避免重复创建订单。");
      }
    }
    await Promise.all(groups.map((group) => this.assertPaymentMethodEnabled(paymentMethod, tenant, group.merchant)));
    const allItems = groups.flatMap((group) => group.items);
    const preview = await this.previewGoodsAmount(tenant, allItems, user);
    const checkoutQuote = await this.calculateMallOrderQuote(user, tenant, allItems, dto) as MallCalculatedQuote;
    const promotion = dto.promotionCode ? await this.resolvePromotionCode(tenant, dto.promotionCode) : null;
    if (promotion?.merchant && !groups.some((group) => group.merchant.id === promotion.merchant!.id)) throw new BadRequestException("该推广码所属店铺不在本次结算商品中");
    let checkoutGroup: MallCheckoutGroup;
    try {
      checkoutGroup = await this.checkoutGroups.save(this.checkoutGroups.create({
        groupNo: this.generateCheckoutGroupNo(),
        tenant,
        user,
        amount: "0.00",
        goodsAmount: "0.00",
        discountAmount: "0.00",
        freightAmount: "0.00",
        allocationSnapshot: null,
        paymentMethod,
        status: "pending_payment",
        clientOrderKey,
        paymentTasks: []
      }));
    } catch (error) {
      if (!clientOrderKey || !this.isDuplicateKeyError(error)) throw error;
      const existingGroup = await this.checkoutGroups.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, clientOrderKey } });
      if (existingGroup) {
        const existingResult = await this.checkoutGroupResultForUser(existingGroup, user);
        if (existingResult) return existingResult;
      }
      throw new BadRequestException("跨店结算正在创建中，请稍后刷新订单列表，避免重复提交。");
    }
    const orders: MallOrderPublicResult[] = [];
    let allocatedOrders: MallOrder[] = [];
    try {
      for (const group of groups) {
        const child = await this.createOrder(user, {
          ...dto,
          items: group.items,
          cartItemIds: undefined,
          couponCode: undefined,
          pointsToUse: 0,
          promotionCode: promotion && (!promotion.merchant || promotion.merchant.id === group.merchant.id) ? promotion.code : undefined,
          quoteToken: undefined,
          clientOrderKey: dto.clientOrderKey ? `${dto.clientOrderKey}_${group.merchant.id}` : undefined
        }, context, checkoutGroup, riskContext) as MallOrderPublicResult;
        orders.push(child);
      }
      const allocated = await this.applyCheckoutGroupAllocations(checkoutGroup.id, user, tenant, orders.map((order) => order.id), preview, checkoutQuote, dto);
      checkoutGroup = allocated.group;
      allocatedOrders = allocated.orders;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error || "跨店子订单创建失败");
      try {
        await this.closeFailedCheckoutGroup(checkoutGroup, orders, reason);
      } catch {
        // Preserve the original checkout failure for the user; ops can still inspect created child orders if cleanup itself fails.
      }
      throw error;
    }
    if (cartRows.length) await this.cartItems.delete({ id: In(cartRows.map((row) => row.id)) });
    if (paymentMethod === PaymentMethod.Balance) {
      try {
        return await this.payCheckoutGroupWithBalance(checkoutGroup.id, user, context);
      } catch (error) {
        await this.closeFailedCheckoutGroup(checkoutGroup, orders, error instanceof Error ? error.message : "跨店余额统一支付失败");
        throw error;
      }
    }
    const publicOrders = await Promise.all(allocatedOrders.map((order) => this.publicUserOrderWithItems(order, user)));
    return this.publicCheckoutGroup(checkoutGroup, publicOrders);
  }

  private async applyCheckoutGroupAllocations(groupId: number, user: User, tenant: Tenant, orderIds: number[], preview: { goodsAmount: number; items: MallOrderPreviewItem[] }, quote: MallCalculatedQuote, dto: CreateMallOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const groupRepo = manager.getRepository(MallCheckoutGroup);
      const orderRepo = manager.getRepository(MallOrder);
      const group = await groupRepo.findOne({ where: { id: groupId, tenant: { id: tenant.id }, user: { id: user.id } }, relations: ["tenant", "user"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!group) throw new NotFoundException("跨店结算组不存在");
      const orders = await orderRepo.createQueryBuilder("order")
        .leftJoinAndSelect("order.tenant", "orderTenant")
        .leftJoinAndSelect("order.merchant", "merchant")
        .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
        .leftJoinAndSelect("order.user", "orderUser")
        .where("order.id IN (:...orderIds)", { orderIds })
        .andWhere("order.checkoutGroupId = :groupId", { groupId })
        .orderBy("order.id", "ASC")
        .setLock("pessimistic_write")
        .getMany();
      if (orders.length !== orderIds.length) throw new BadRequestException("跨店结算子订单不完整，已停止优惠分摊");
      const allocationMap = new Map(quote.allocations.map((row) => [row.merchantId, row]));
      for (const order of orders) {
        const merchantId = order.merchant?.id || 0;
        const allocation = allocationMap.get(merchantId);
        if (!allocation) throw new BadRequestException("跨店结算缺少店铺分摊结果，请刷新后重试");
        if (yuanToFen(order.goodsAmount) !== allocation.goodsFen || yuanToFen(order.freightAmount) !== allocation.freightFen) throw new BadRequestException("商品价格或运费已变化，请刷新确认订单后重新提交");
      }

      const coupon = dto.couponCode ? await this.resolveCoupon(tenant, dto.couponCode, preview.goodsAmount, preview.items, manager, user) : null;
      const couponDiscountFen = coupon ? yuanToFen(this.computeCouponDiscount(coupon, preview.goodsAmount, preview.items)) : 0;
      if (couponDiscountFen !== yuanToFen(quote.couponDiscountAmount)) throw new BadRequestException("优惠券金额已变化，请刷新确认订单后重新提交");
      if (quote.pointsUsed > 0) {
        const profile = await manager.getRepository(MemberProfile).findOne({ where: { user: { id: user.id }, tenantScopeKey: `tenant:${tenant.id}` }, lock: { mode: "pessimistic_write" } });
        if (!profile || Number(profile.points || 0) < quote.pointsUsed) throw new BadRequestException("可用积分已变化，请刷新确认订单后重新提交");
      }

      const couponAnchor = coupon ? orders.find((order) => (allocationMap.get(order.merchant?.id || 0)?.couponDiscountFen || 0) > 0) || orders[0] : null;
      if (coupon && couponAnchor) {
        coupon.usedCount += 1;
        await manager.getRepository(MallCoupon).save(coupon);
        await manager.getRepository(MallCouponUsage).save(manager.getRepository(MallCouponUsage).create({ tenant, merchant: coupon.merchant || null, coupon, order: couponAnchor, user, code: coupon.code, discountAmount: fenToYuan(couponDiscountFen), status: "used" }));
        await this.markCouponClaimUsed(manager, tenant, coupon.merchant || null, coupon, user);
      }
      if (quote.pointsUsed > 0) await this.awardMallPoints(user, -quote.pointsUsed, "mall_checkout_points_redeem", group.id, "跨店结算积分抵扣", tenant, manager);

      for (const order of orders) {
        const allocation = allocationMap.get(order.merchant?.id || 0)!;
        order.amount = fenToYuan(allocation.payableFen);
        order.amountFen = allocation.payableFen;
        order.discountAmount = fenToYuan(allocation.discountFen);
        order.pointsUsed = allocation.pointsDiscountFen;
        order.pointsDiscountAmount = fenToYuan(allocation.pointsDiscountFen);
        order.coupon = coupon;
        order.couponSnapshot = coupon ? { id: coupon.id, code: coupon.code, name: coupon.name, issuerScope: coupon.issuerScope, refundReleasePolicy: coupon.refundReleasePolicy, minAmount: coupon.minAmount, totalDiscountAmount: fenToYuan(couponDiscountFen), allocatedDiscountAmount: fenToYuan(allocation.couponDiscountFen), scope: coupon.scope, scopeCategoryId: coupon.scopeCategoryId, scopeProductId: coupon.scopeProductId, checkoutGroupId: group.id, checkoutGroupNo: group.groupNo } : null;
        order.allocationSnapshot = { version: 2, source: "checkout_group", checkoutGroupId: group.id, checkoutGroupNo: group.groupNo, merchantId: order.merchant?.id || null, goodsFen: allocation.goodsFen, freightFen: allocation.freightFen, couponDiscountFen: allocation.couponDiscountFen, pointsDiscountFen: allocation.pointsDiscountFen, discountFen: allocation.discountFen, payableFen: allocation.payableFen };
        order.businessSnapshot = { ...(order.businessSnapshot || {}), amount: order.amount, goodsAmount: order.goodsAmount, discountAmount: order.discountAmount, freightAmount: order.freightAmount, pointsUsed: order.pointsUsed, pointsDiscountAmount: order.pointsDiscountAmount, couponSnapshot: order.couponSnapshot, allocationSnapshot: order.allocationSnapshot, checkoutGroupId: group.id };
      }
      await orderRepo.save(orders);

      group.amount = quote.payableAmount;
      group.amountFen = yuanToFen(quote.payableAmount);
      group.goodsAmount = quote.goodsAmount;
      group.discountAmount = quote.discountAmount;
      group.freightAmount = quote.freightAmount;
      group.allocationSnapshot = {
        version: 2,
        strategy: "coupon_then_points_largest_remainder",
        coupon: coupon ? { id: coupon.id, code: coupon.code, name: coupon.name, discountFen: couponDiscountFen } : null,
        points: { used: quote.pointsUsed, discountFen: yuanToFen(quote.pointsDiscountAmount) },
        rows: orders.map((order) => ({ orderId: order.id, orderNo: order.orderNo, ...allocationMap.get(order.merchant?.id || 0)! })),
        totals: { goodsFen: yuanToFen(group.goodsAmount), freightFen: yuanToFen(group.freightAmount), discountFen: yuanToFen(group.discountAmount), payableFen: yuanToFen(group.amount) }
      };
      group.status = this.computeCheckoutGroupStatus(orders);
      group.paymentTasks = await Promise.all(orders.map((order) => this.buildCheckoutPaymentTask(tenant, order)));
      group.businessSnapshot = { amount: group.amount, goodsAmount: group.goodsAmount, discountAmount: group.discountAmount, freightAmount: group.freightAmount, paymentMethod: group.paymentMethod, coupon: group.allocationSnapshot.coupon, points: group.allocationSnapshot.points, allocationSnapshot: group.allocationSnapshot };
      await groupRepo.save(group);
      return { group, orders };
    });
  }

  async payCheckoutGroupWithBalance(groupId: number, user: User, context?: PublicTenantContext): Promise<MallCheckoutGroupResult> {
    const tenant = await this.requirePublicTenant(context);
    await this.assertPaymentMethodOperationEnabled(PaymentMethod.Balance, tenant);
    const result = await this.dataSource.transaction(async (manager) => {
      const groupRepo = manager.getRepository(MallCheckoutGroup);
      const orderRepo = manager.getRepository(MallOrder);
      const walletRepo = manager.getRepository(UserWallet);
      const walletTxRepo = manager.getRepository(WalletTransaction);
      const group = await groupRepo.findOne({ where: { id: groupId, tenant: { id: tenant.id }, user: { id: user.id } }, relations: ["tenant", "user"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!group) throw new NotFoundException("跨店结算组不存在");
      const orders = await orderRepo.createQueryBuilder("order").leftJoinAndSelect("order.tenant", "orderTenant").leftJoinAndSelect("order.merchant", "merchant").leftJoinAndSelect("order.checkoutGroup", "checkoutGroup").leftJoinAndSelect("order.user", "orderUser").leftJoinAndSelect("order.coupon", "coupon").where("order.checkoutGroupId = :groupId", { groupId: group.id }).orderBy("order.id", "ASC").setLock("pessimistic_write").getMany();
      if (!orders.length) throw new BadRequestException("跨店结算组没有可支付子订单");
      if (orders.every((order) => ["paid", "shipped", "completed"].includes(order.status))) return { group, orders, idempotent: true };
      if (orders.some((order) => order.paymentMethod !== PaymentMethod.Balance || order.status !== "pending_payment")) throw new BadRequestException("结算组包含非待支付余额子订单，不能统一扣款");
      const tenantScopeKey = this.walletTenantScopeKey(tenant);
      let wallet = await walletRepo.findOne({ where: { user: { id: user.id }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
      if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user, tenant, tenantScopeKey }));
      const totalFen = orders.reduce((sum, order) => sum + yuanToFen(order.amount), 0);
      const cashBeforeFen = yuanToFen(wallet.availableBalance || 0);
      const giftBeforeFen = yuanToFen(wallet.giftBalance || 0);
      if (cashBeforeFen + giftBeforeFen < totalFen) throw new BadRequestException("余额不足，跨店统一支付未扣款，全部子订单已保持原状态");
      const giftUsedFen = Math.min(giftBeforeFen, totalFen);
      const cashUsedFen = totalFen - giftUsedFen;
      const transactionNo = `MALGRPBAL${Date.now()}${group.id}`;
      wallet.availableBalance = fenToYuan(cashBeforeFen - cashUsedFen);
      wallet.giftBalance = fenToYuan(giftBeforeFen - giftUsedFen);
      wallet.totalSpent = (Number(wallet.totalSpent || 0) + totalFen / 100).toFixed(2);
      await walletRepo.save(wallet);
      await walletTxRepo.save(walletTxRepo.create({ wallet, user, tenant, order: null, transactionNo, direction: "debit", type: "balance_pay", amount: fenToYuan(totalFen), balanceBefore: fenToYuan(cashBeforeFen), balanceAfter: fenToYuan(cashBeforeFen - cashUsedFen), frozenBefore: wallet.frozenBalance || "0.00", frozenAfter: wallet.frozenBalance || "0.00", giftBefore: fenToYuan(giftBeforeFen), giftAfter: fenToYuan(giftBeforeFen - giftUsedFen), frozenGiftBefore: wallet.frozenGiftBalance || "0.00", frozenGiftAfter: wallet.frozenGiftBalance || "0.00", operator: "user", remark: `跨店结算组余额统一支付：${group.groupNo}`, idempotencyKey: `mall_checkout_balance_pay:${group.id}` }));
      const now = new Date();
      let remainingGiftFen = giftUsedFen;
      for (const order of orders) {
        const orderAmountFen = yuanToFen(order.amount);
        const orderGiftFen = Math.min(remainingGiftFen, orderAmountFen);
        remainingGiftFen -= orderGiftFen;
        order.businessSnapshot = { ...(order.businessSnapshot || {}), walletFunding: { cashFen: orderAmountFen - orderGiftFen, giftFen: orderGiftFen, transactionNo } };
        order.status = "paid";
        order.transactionNo = `${transactionNo}_${order.id}`;
        order.paidAt = now;
        order.expiresAt = null;
        await orderRepo.save(order);
        await this.recordMallOrderEvent(manager, order, { eventKey: `paid:balance:group:${group.id}`, eventType: "payment_confirmed", fromStatus: "pending_payment", toStatus: "paid", source: "user", operator: String(user.id), remark: "跨店结算组余额统一支付", detail: { checkoutGroupId: group.id, groupNo: group.groupNo, transactionNo, amount: order.amount } });
        await this.updateGroupBuyRecordsForOrder(manager, order, "paid");
        await this.deductLockedInventory(manager, order);
        await this.awardMallPurchasePoints(order, manager);
        await this.createMallCommissionForOrder(manager, order);
      }
      group.status = "paid";
      group.paymentTasks = orders.map((order) => ({ orderId: order.id, orderNo: order.orderNo, merchantId: order.merchant?.id || null, merchantName: order.merchant?.name || tenant.name, paymentMethod: PaymentMethod.Balance, paymentMethodText: "余额统一支付", collectionModeText: "平台钱包统一扣款", paymentRouteText: "结算组一次扣款", amount: order.amount, status: order.status, statusText: "待发货", paymentReady: true, payableOnline: false, manualConfirmationRequired: false, nextAction: "统一支付已完成，等待各店铺分别发货。" }));
      await groupRepo.save(group);
      return { group, orders, idempotent: false };
    });
    const publicOrders = await Promise.all(result.orders.map((order) => this.publicUserOrderWithItems(order, user)));
    return { ...this.publicCheckoutGroup(result.group, publicOrders), idempotent: result.idempotent } as MallCheckoutGroupResult;
  }

  private async checkoutGroupResultForUser(checkoutGroup: MallCheckoutGroup, user: User): Promise<MallCheckoutGroupResult | null> {
    const orders = await this.orders.find({
      where: { checkoutGroup: { id: checkoutGroup.id }, tenant: { id: checkoutGroup.tenant.id }, user: { id: user.id } },
      order: { id: "ASC" }
    });
    if (!orders.length) return null;
    const refreshedGroup = await this.refreshCheckoutGroupStatus(checkoutGroup.id);
    const publicOrders = await Promise.all(orders.map((order) => this.publicUserOrderWithItems(order, user)));
    return this.publicCheckoutGroup(refreshedGroup || checkoutGroup, publicOrders);
  }

  private isDuplicateKeyError(error: any) {
    return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062;
  }

  private async closeFailedCheckoutGroup(checkoutGroup: MallCheckoutGroup, orders: MallOrderPublicResult[], reason: string) {
    const cleanupErrors: string[] = [];
    for (const order of orders) {
      try {
        await this.closeOrderAndReleaseLockedInventory(order.id, `跨店结算创建失败自动关闭：${reason}`);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError instanceof Error ? cleanupError.message : String(cleanupError || "子订单关闭失败"));
      }
    }
    const latestOrders = orders.length ? await this.orders.find({ where: { id: In(orders.map((order) => order.id)) }, order: { id: "ASC" } }) : [];
    const amount = latestOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const goodsAmount = latestOrders.reduce((sum, order) => sum + Number(order.goodsAmount || 0), 0);
    const discountAmount = latestOrders.reduce((sum, order) => sum + Number(order.discountAmount || 0), 0);
    checkoutGroup.status = "closed";
    checkoutGroup.amount = amount.toFixed(2);
    checkoutGroup.goodsAmount = goodsAmount.toFixed(2);
    checkoutGroup.discountAmount = discountAmount.toFixed(2);
    checkoutGroup.freightAmount = latestOrders.reduce((sum, order) => sum + Number(order.freightAmount || 0), 0).toFixed(2);
    checkoutGroup.paymentTasks = [{
      status: "closed",
      failedReason: reason,
      closedOrderIds: orders.map((order) => order.id),
      cleanupErrors,
      nextAction: cleanupErrors.length
        ? "跨店结算创建失败，部分已生成子订单自动关闭失败，请后台按订单号人工核查库存和状态。"
        : "跨店结算创建失败，已自动关闭已生成子订单并释放库存。"
    }];
    await this.checkoutGroups.save(checkoutGroup);
  }

  private async refreshCheckoutGroupStatusForOrder(order: MallOrder | null | undefined) {
    const groupId = order?.checkoutGroup?.id;
    if (!groupId) return null;
    return this.refreshCheckoutGroupStatus(groupId);
  }

  private async refreshCheckoutGroupStatus(groupId: number) {
    const checkoutGroup = await this.checkoutGroups.findOne({ where: { id: groupId } });
    if (!checkoutGroup) return null;
    const orders = await this.orders.find({ where: { checkoutGroup: { id: groupId } }, order: { id: "ASC" } });
    if (!orders.length) return checkoutGroup;
    checkoutGroup.amount = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0).toFixed(2);
    checkoutGroup.goodsAmount = orders.reduce((sum, order) => sum + Number(order.goodsAmount || 0), 0).toFixed(2);
    checkoutGroup.discountAmount = orders.reduce((sum, order) => sum + Number(order.discountAmount || 0), 0).toFixed(2);
    checkoutGroup.freightAmount = orders.reduce((sum, order) => sum + Number(order.freightAmount || 0), 0).toFixed(2);
    checkoutGroup.status = this.computeCheckoutGroupStatus(orders);
    checkoutGroup.paymentTasks = await Promise.all(orders.map((order) => this.buildCheckoutPaymentTask(checkoutGroup.tenant, order)));
    return this.checkoutGroups.save(checkoutGroup);
  }

  private computeCheckoutGroupStatus(orders: Array<Pick<MallOrder, "status">>) {
    const statuses = orders.map((order) => order.status);
    const all = (values: MallOrderStatus[]) => statuses.every((status) => values.includes(status));
    const paidLike: MallOrderStatus[] = ["paid", "shipped", "completed", "refund_pending", "refunded"];
    if (all(["refunded"])) return "refunded" as const;
    if (all(["closed"])) return "closed" as const;
    if (all(["completed", "refunded"])) return "completed" as const;
    if (all(["closed", "refunded"])) return "closed" as const;
    if (all(paidLike)) return "paid" as const;
    if (statuses.some((status) => paidLike.includes(status))) return "partial_paid" as const;
    return "pending_payment" as const;
  }

  private async buildCheckoutPaymentTask(tenant: Tenant, order: MallOrder): Promise<Record<string, unknown>> {
    const merchant = order.merchant || null;
    const paymentMode = merchant?.paymentMode || "platform_collect";
    const collectionMode = this.mallOrderCollectionMode(order.paymentMethod, paymentMode);
    const readiness = order.paymentMethod === PaymentMethod.Wechat
      ? await this.mallWechatPaymentReadinessForMerchant(tenant, merchant)
      : null;
    const readinessResult = readiness as Record<string, any> | null;
    const readinessStatus = String(readinessResult?.status || (order.paymentMethod === PaymentMethod.Offline ? "offline_pending_confirm" : "ready"));
    const readinessIssues = Array.isArray(readinessResult?.issues) ? readinessResult.issues.filter(Boolean) : [];
    const paymentReady = readiness ? ["sandbox_ready", "real_ready"].includes(readinessStatus) : true;
    const disabledReason = readiness && !paymentReady ? readinessIssues[0] || "支付配置未就绪，请联系店铺或平台财务处理" : "";
    const route = this.mallPaymentTaskRoute(order.paymentMethod, paymentMode);
    const belongsToCheckoutGroup = Boolean(order.checkoutGroup?.id);
    const canCombinePayment = belongsToCheckoutGroup && (
      order.paymentMethod === PaymentMethod.Balance
      || (order.paymentMethod === PaymentMethod.Wechat && collectionMode !== "merchant_direct")
    );
    const requiresSeparatePayment = belongsToCheckoutGroup && !canCombinePayment;
    return {
      orderId: order.id,
      orderNo: order.orderNo,
      merchantId: merchant?.id || null,
      merchantName: merchant?.name || order.tenant?.name || "店铺",
      merchant: merchant ? { id: merchant.id, code: merchant.code, name: merchant.name, ownerType: merchant.ownerType, paymentMode: merchant.paymentMode, agentId: merchant.agent?.id || null } : null,
      tenant: order.tenant ? { id: order.tenant.id, code: order.tenant.code, name: order.tenant.name } : null,
      receiver: collectionMode === "merchant_direct"
        ? { type: "merchant", text: `店铺直收：${merchant?.name || "当前店铺"}`, merchantId: merchant?.id || null, agentId: merchant?.agent?.id || null }
        : { type: "platform", text: `平台代收：${order.tenant?.name || tenant.name}`, tenantId: order.tenant?.id || tenant.id },
      paymentMethod: order.paymentMethod,
      paymentMethodText: this.paymentMethodText(order.paymentMethod),
      paymentMode,
      collectionMode,
      collectionModeText: this.mallPaymentModeText(collectionMode),
      paymentRoute: route.value,
      paymentRouteText: route.text,
      combineGroupKey: collectionMode === "merchant_direct" ? `merchant:${merchant?.id || "unknown"}` : "platform_collect",
      canCombinePayment,
      requiresSeparatePayment,
      combineBlockedReason: requiresSeparatePayment ? "当前订单需要按店铺独立支付或确认，避免商户直收、退款和结算串账。" : "",
      amount: order.amount,
      status: order.status,
      statusText: this.mallOrderStatusText(order.status),
      paymentReady,
      payableOnline: order.paymentMethod === PaymentMethod.Wechat && order.status === "pending_payment" && paymentReady,
      manualConfirmationRequired: order.paymentMethod === PaymentMethod.Offline,
      readinessStatus,
      readinessIssues,
      readinessNextAction: String(readinessResult?.nextAction || ""),
      disabledReason,
      nextAction: this.mallPaymentTaskNextAction(order, paymentMode, paymentReady, disabledReason, readinessResult)
    };
  }

  private mallOrderCollectionMode(method: PaymentMethod, paymentMode: string) {
    return method === PaymentMethod.Balance ? "platform_collect" : paymentMode;
  }

  private mallPaymentTaskRoute(method: PaymentMethod, paymentMode: string) {
    if (method === PaymentMethod.Wechat) {
      return paymentMode === "merchant_direct"
        ? { value: "merchant_direct_wechat", text: "微信支付：店铺商户直收" }
        : { value: "platform_collect_wechat", text: "微信支付：平台代收" };
    }
    if (method === PaymentMethod.Balance) return { value: "wallet_balance", text: "余额支付：平台钱包扣款" };
    if (method === PaymentMethod.Offline) return { value: "offline_confirmation", text: "线下收款：后台确认" };
    return { value: method, text: this.paymentMethodText(method) };
  }

  private mallPaymentTaskNextAction(order: MallOrder, paymentMode: string, paymentReady: boolean, disabledReason: string, readiness?: Record<string, any> | null) {
    if (order.paymentMethod === PaymentMethod.Offline) return "该子订单为线下收款，后台财务需在「商城订单」确认收款后才能发货。";
    if (order.paymentMethod === PaymentMethod.Balance) {
      return ["paid", "shipped", "completed"].includes(order.status)
        ? "余额已完成扣款，后续按店铺子订单发货和售后处理。"
        : order.checkoutGroup ? "结算组将从用户钱包统一扣款一次，成功后各店铺子订单分别进入待发货。" : "用户需对该子订单发起余额支付，支付成功后进入待发货。";
    }
    if (order.paymentMethod === PaymentMethod.Wechat && order.checkoutGroup && paymentMode !== "merchant_direct") return ["paid", "shipped", "completed"].includes(order.status) ? "微信统一支付已完成，后续按店铺子订单履约。" : "结算组可使用平台代收微信统一支付一次，成功后各店铺分别履约。";
    if (order.paymentMethod === PaymentMethod.Wechat && !paymentReady) {
      return String(readiness?.nextAction || disabledReason || "该子订单微信支付暂未就绪，请先完成支付配置和上线联调。");
    }
    if (order.paymentMethod === PaymentMethod.Wechat && paymentMode === "merchant_direct") {
      return `该子订单走店铺「${order.merchant?.name || "当前店铺"}」商户直收，需按子订单发起微信支付并由店铺专属回调入账。`;
    }
    if (order.paymentMethod === PaymentMethod.Wechat) return "该子订单走平台代收微信支付，支付成功后进入平台商城流水和后续结算。";
    return "请按该子订单的支付方式继续处理。";
  }

  private async previewGoodsAmount(tenant: Tenant, items: MallOrderInputItem[], user?: User) {
    if (!items.length) throw new BadRequestException("请选择要购买的商品");
    const previewItems: MallOrderPreviewItem[] = [];
    const lines: MallOrderPreviewLine[] = [];
    let goodsAmount = 0;
    for (const input of items) {
      const quantity = Math.max(Number(input.quantity || 0), 0);
      if (!quantity) throw new BadRequestException("购买数量必须大于 0");
      if (input.flashSaleId && input.groupBuyId) throw new BadRequestException("秒杀和拼团不能同时使用");
      const sku = await this.findSellableSkuRow(this.skus, Number(input.skuId), tenant.id);
      if (!sku || sku.product.status !== "published") throw new NotFoundException("商品规格不存在或已下架");
      const available = Number(sku.stock || 0) - Number(sku.lockedStock || 0);
      if (available < quantity) throw new BadRequestException(`「${sku.product.title}」库存不足`);
      const flashSale = input.flashSaleId ? await this.resolveActiveFlashSale(undefined, tenant, input.flashSaleId, sku, user, quantity) : null;
      const groupBuy = input.groupBuyId ? await this.resolveActiveGroupBuy(undefined, tenant, input.groupBuyId, sku, user, quantity) : null;
      const unitPrice = flashSale ? Number(flashSale.salePrice || 0) : groupBuy ? Number(groupBuy.groupPrice || 0) : Number(sku.price || 0);
      const amount = unitPrice * quantity;
      goodsAmount += amount;
      const merchant = sku.merchant || sku.product.merchant || await this.ensureDefaultMerchant(tenant);
      if (merchant.tenant.id !== tenant.id || merchant.status !== "active" || !merchant.mallEnabled) throw new BadRequestException(`「${sku.product.title}」所属店铺暂未开放`);
      previewItems.push({ productId: sku.product.id, categoryId: sku.product.category?.id || null, platformCategoryId: sku.product.platformCategory?.id || null, merchantId: merchant.id, amount });
      lines.push({ skuId: sku.id, productId: sku.product.id, productTitle: sku.product.title, productVersion: Number(sku.product.contentVersion || 1), skuName: flashSale ? `${sku.name}（秒杀：${flashSale.title}）` : groupBuy ? `${sku.name}（拼团：${groupBuy.title}）` : sku.name, quantity, unitPrice: unitPrice.toFixed(2), lineAmount: amount.toFixed(2), availableStock: Math.max(available, 0), merchant: this.publicMerchantSummary(merchant), flashSaleId: flashSale?.id || null, groupBuyId: groupBuy?.id || null });
    }
    return { goodsAmount, items: previewItems, lines };
  }

  private async computeMallPointsQuote(user: User, tenant: Tenant, amountAfterCoupon: number, requestedPoints?: number, manager?: Pick<DataSource["manager"], "getRepository">) {
    const profileRepo = manager?.getRepository(MemberProfile) || this.memberProfiles;
    const profile = await profileRepo.findOne({ where: { user: { id: user.id }, tenantScopeKey: `tenant:${tenant.id}` } });
    const availablePoints = Math.max(Number(profile?.points || 0), 0);
    const safeAmount = Math.max(Number(amountAfterCoupon || 0), 0);
    const pointsUsed = Math.min(Math.max(Math.trunc(Number(requestedPoints || 0)), 0), availablePoints, Math.floor(safeAmount * 100));
    return { availablePoints, pointsUsed, pointsDiscountAmount: pointsUsed / 100 };
  }

  private async resolvePromotionCode(tenant: Tenant, value?: unknown, merchant?: MallMerchant | null) {
    const code = this.normalizePromotionCode(value);
    if (!code) return null;
    const row = await this.promotionCodes.findOne({ where: { tenant: { id: tenant.id }, code }, relations: ["tenant", "merchant", "promoterUser", "agent"], loadEagerRelations: false });
    if (!row || row.tenant.id !== tenant.id || !row.enabled) throw new BadRequestException("推广码不存在或已停用");
    const validityError = mallPromotionValidityError({ startsAt: row.startsAt, endsAt: row.endsAt });
    if (validityError) throw new BadRequestException(validityError);
    if (row.merchant) {
      if (row.merchant.status !== "active" || !row.merchant.mallEnabled) throw new BadRequestException("该推广码所属店铺未开通商城，暂不可用");
      if (merchant && row.merchant.id !== merchant.id) throw new BadRequestException("该推广码仅限所属店铺商品使用");
    }
    return row;
  }

  private promotionSnapshot(row: MallPromotionCode, risk?: MallMarketingRiskDecision | null) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      commissionRate: row.commissionRate,
      merchantId: row.merchant?.id || null,
      merchantName: row.merchant?.name || null,
      promoterUserId: row.promoterUser?.id || null,
      promoterPhone: row.promoterUser?.phone || null,
      agentId: row.agent?.id || null,
      agentName: row.agent?.name || null,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      attributionSource: "manual_code",
      appliedAt: new Date(),
      riskDecision: risk?.outcome || "allowed",
      riskRuleCode: risk?.ruleCode || null,
      riskSeverity: risk?.severity || "info",
      riskMessage: risk?.message || null
    };
  }

  private async createMallCommissionForOrder(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder) {
    const snapshot = order.promotionSnapshot as Record<string, unknown> | null;
    const code = this.normalizePromotionCode(order.promotionCode || snapshot?.code);
    const commissionRepo = manager.getRepository(MallCommission);
    const existingRows = await commissionRepo.find({ where: { order: { id: order.id } }, loadEagerRelations: false });
    if (existingRows.length) return existingRows[0];
    const codeRepo = manager.getRepository(MallPromotionCode);
    const promotionId = Number(snapshot?.id || 0);
    const promotion = code || promotionId ? await codeRepo.findOne({
      where: promotionId ? { id: promotionId } : { code },
      relations: ["tenant", "merchant", "promoterUser", "agent"],
      loadEagerRelations: false,
      lock: { mode: "pessimistic_write" }
    }) : null;
    if ((code || promotionId) && (!promotion || promotion.tenant.id !== order.tenant.id || (!snapshot && !promotion.enabled))) return null;
    const snapshotMerchantId = Number(snapshot?.merchantId || 0) || null;
    if (snapshotMerchantId && (!order.merchant || snapshotMerchantId !== order.merchant.id)) return null;
    if (!snapshotMerchantId && promotion?.merchant && (!order.merchant || promotion.merchant.id !== order.merchant.id)) return null;
    const snapshotPromoterUserId = Number(snapshot?.promoterUserId || 0) || null;
    const snapshotAgentId = Number(snapshot?.agentId || 0) || null;
    const promoterUser = snapshotPromoterUserId ? await manager.getRepository(User).findOne({ where: { id: snapshotPromoterUserId } }) : promotion?.promoterUser || null;
    const agent = snapshotAgentId ? await manager.getRepository(Agent).findOne({ where: { id: snapshotAgentId }, relations: ["parentAgent"] }) : promotion?.agent || order.merchant?.agent || null;
    const promoterUserId = promoterUser?.id || null;
    if (snapshot?.riskDecision === "blocked") {
      await this.recordMallOrderEvent(manager, order, { eventKey: `promotion:risk:${promotion?.id || "none"}`, eventType: "promotion_attribution_blocked", fromStatus: order.status, toStatus: order.status, source: "system", operator: "mall_commission", remark: String(snapshot.riskMessage || "推广归因风险已拦截佣金"), detail: { promotionCodeId: promotion?.id || null, riskRuleCode: snapshot.riskRuleCode || null, riskSeverity: snapshot.riskSeverity || null } });
      return null;
    }
    if (isSelfPurchasePromotion(promoterUserId, order.user.id)) {
      await this.recordMallOrderEvent(manager, order, { eventKey: `promotion:self:${promotion?.id || "none"}`, eventType: "promotion_self_purchase_blocked", fromStatus: order.status, toStatus: order.status, source: "system", operator: "mall_commission", remark: `推广码 ${promotion?.code || code} 为下单人本人推广码，已阻止自购佣金`, detail: { promotionCodeId: promotion?.id || null, promoterUserId } });
      return null;
    }
    const now = order.paidAt || new Date();
    const ruleRepo = manager.getRepository(MallCommissionRule);
    const rules = await ruleRepo.createQueryBuilder("rule")
      .leftJoinAndSelect("rule.tenant", "tenant")
      .leftJoinAndSelect("rule.merchant", "merchant")
      .leftJoinAndSelect("rule.product", "product")
      .leftJoinAndSelect("rule.promotionCode", "promotionCode")
      .where("rule.tenantId = :tenantId", { tenantId: order.tenant.id })
      .andWhere("rule.status = :status", { status: "active" })
      .andWhere("(rule.startsAt IS NULL OR rule.startsAt <= :now)", { now })
      .andWhere("(rule.endsAt IS NULL OR rule.endsAt > :now)", { now })
      .getMany();
    const items = await manager.getRepository(MallOrderItem).find({ where: { order: { id: order.id } }, relations: ["product", "merchant"], loadEagerRelations: false, order: { id: "ASC" } });
    if (!items.length) return null;
    const goodsFen = items.map((item) => yuanToFen(item.totalAmount));
    const commissionablePaidFen = Math.min(Math.max(yuanToFen(order.amount) - yuanToFen(order.freightAmount || 0), 0), goodsFen.reduce((sum, value) => sum + value, 0));
    const baseAmountsFen = allocateMallCommissionBaseFen(goodsFen, commissionablePaidFen);
    const parentAgentIds = await this.mallAgentParentChain(manager, agent, order.tenant.id);
    const savedRows: MallCommission[] = [];
    for (const [index, item] of items.entries()) {
      const selected = selectMallCommissionRule(rules.map((rule) => ({ ...rule, merchantId: rule.merchant?.id || null, productId: rule.product?.id || null, promotionCodeId: rule.promotionCode?.id || null })), { merchantId: order.merchant?.id || item.merchant?.id || null, productId: item.product.id, promotionCodeId: promotion?.id || null });
      const legacyRateBps = Math.round(Math.min(Math.max(Number(snapshot?.commissionRate ?? promotion?.commissionRate ?? 0), 0), 1) * 10000);
      const directRateBps = selected?.directRateBps ?? legacyRateBps;
      const agentLevelRatesBps = selected?.agentLevelRatesBps || [];
      const beneficiaries = buildMallCommissionBeneficiaries({ promoterUserId, directAgentId: agent?.id || null, parentAgentIds, directRateBps, agentLevelRatesBps });
      const baseAmountFen = baseAmountsFen[index] || 0;
      if (!baseAmountFen || !beneficiaries.length) continue;
      for (const beneficiary of beneficiaries) {
        const beneficiaryUser = beneficiary.beneficiaryType === "promoter" ? promoterUser : null;
        const beneficiaryAgent = beneficiary.beneficiaryType === "agent" ? await manager.getRepository(Agent).findOne({ where: { id: beneficiary.beneficiaryId } }) : null;
        if (beneficiary.beneficiaryType === "agent" && (!beneficiaryAgent || !beneficiaryAgent.enabled || beneficiaryAgent.tenant?.id !== order.tenant.id)) continue;
        const ruleIdentity = selected?.id ? `rule:${selected.id}:v${selected.version}` : `legacy:${promotion?.id || "merchant-agent"}`;
        const operationKey = `order:${order.id}:item:${item.id}:${ruleIdentity}:${beneficiary.beneficiaryType}:${beneficiary.beneficiaryId}:level:${beneficiary.level}`;
        const replay = await commissionRepo.findOne({ where: { operationKey }, loadEagerRelations: false });
        if (replay) {
          savedRows.push(replay);
          continue;
        }
        const amountFen = commissionAmountFen(baseAmountFen, beneficiary.rateBps);
        if (!amountFen) continue;
        const ruleSnapshot = selected ? { id: selected.id, ruleKey: selected.ruleKey, name: selected.name, version: selected.version, scopeType: selected.scopeType, priority: selected.priority, directRateBps: selected.directRateBps, agentLevelRatesBps: selected.agentLevelRatesBps || [], startsAt: selected.startsAt, endsAt: selected.endsAt } : { id: null, ruleKey: "legacy-promotion-rate", name: "历史推广码比例兼容规则", version: 1, scopeType: "channel", priority: 0, directRateBps: legacyRateBps, agentLevelRatesBps: [] };
        const status = snapshot?.riskDecision === "review" ? "risk_review" : "pending";
        const row = await commissionRepo.save(commissionRepo.create({
          tenant: order.tenant,
          merchant: order.merchant || item.merchant || null,
          order,
          orderItem: item,
          product: item.product,
          rule: selected || null,
          promotionCode: promotion,
          promoterUser: beneficiaryUser,
          agent: beneficiaryAgent,
          operationKey,
          beneficiaryType: beneficiary.beneficiaryType,
          beneficiaryKey: `${beneficiary.beneficiaryType}:${beneficiary.beneficiaryId}`,
          beneficiaryLevel: beneficiary.level,
          code: promotion?.code || selected?.ruleKey || "MERCHANT_AGENT",
          orderAmount: fenToYuan(baseAmountFen),
          commissionRate: (beneficiary.rateBps / 10000).toFixed(4),
          commissionAmount: fenToYuan(amountFen),
          originalCommissionAmount: fenToYuan(amountFen),
          ruleSnapshot,
          calculationSnapshot: { orderAmountFen: yuanToFen(order.amount), freightAmountFen: yuanToFen(order.freightAmount || 0), goodsAmountFen: goodsFen.reduce((sum, value) => sum + value, 0), baseAmountFen, rateBps: beneficiary.rateBps, commissionAmountFen: amountFen, productId: item.product.id, orderItemId: item.id, beneficiaryType: beneficiary.beneficiaryType, beneficiaryId: beneficiary.beneficiaryId, beneficiaryLevel: beneficiary.level },
          refundedOrderAmount: "0.00",
          clawbackAmount: "0.00",
          clawbackSettledAmount: "0.00",
          clawbackStatus: "none",
          clawbackSettledAt: null,
          clawbackSettledByAdminId: null,
          clawbackSettledBy: null,
          clawbackSettleRemark: null,
          clawbackOperationKey: null,
          status,
          riskReviewReason: status === "risk_review" ? String(snapshot?.riskMessage || "推广归因需要人工复核") : null,
          voidReason: null,
          voidedAt: null,
          settledAt: null,
          settledBy: null,
          settleRemark: null,
          settleOperationKey: null,
          riskReviewedByAdminId: null,
          riskReviewedBy: null,
          riskReviewedAt: null
        }));
        savedRows.push(row);
      }
    }
    if (promotion && savedRows.length) {
      promotion.orderCount += 1;
      promotion.orderAmount = (Number(promotion.orderAmount || 0) + Number(order.amount || 0)).toFixed(2);
      await codeRepo.save(promotion);
    }
    if (savedRows.length) await this.recordMallOrderEvent(manager, order, { eventKey: `commission:generated:${order.id}`, eventType: snapshot?.riskDecision === "review" ? "commission_risk_review_created" : "commission_generated", fromStatus: order.status, toStatus: order.status, source: "system", operator: "mall_commission", remark: `生成 ${savedRows.length} 条佣金明细`, detail: { commissionIds: savedRows.map((row) => row.id), ruleIds: [...new Set(savedRows.map((row) => row.rule?.id).filter(Boolean))], riskDecision: snapshot?.riskDecision || "allowed" } });
    return savedRows[0] || null;
  }

  private async voidMallCommission(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, reason: string) {
    const repo = manager.getRepository(MallCommission);
    const rows = await repo.find({ where: { order: { id: order.id }, status: In(["pending", "risk_review"]) }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
    if (!rows.length) return null;
    for (const row of rows) {
      row.status = "void";
      row.voidReason = reason;
      row.voidedAt = new Date();
    }
    await repo.save(rows);
    return rows[0];
  }

  private async mallAgentParentChain(manager: Pick<DataSource["manager"], "getRepository">, directAgent: Agent | null, tenantId: number) {
    if (!directAgent?.id) return [];
    const repo = manager.getRepository(Agent);
    let cursor = await repo.findOne({ where: { id: directAgent.id }, relations: ["parentAgent"] });
    const ids: number[] = [];
    const visited = new Set<number>([directAgent.id]);
    while (cursor?.parentAgent?.id && ids.length < 10 && !visited.has(cursor.parentAgent.id)) {
      const parent = await repo.findOne({ where: { id: cursor.parentAgent.id }, relations: ["parentAgent"] });
      if (!parent || !parent.enabled || parent.tenant?.id !== tenantId) break;
      ids.push(parent.id);
      visited.add(parent.id);
      cursor = parent;
    }
    return ids;
  }

  private async saveCommissionAdjustment(manager: Pick<DataSource["manager"], "getRepository">, commission: MallCommission, input: {
    operationKey: string;
    type: MallCommissionAdjustment["type"];
    direction: MallCommissionAdjustment["direction"];
    amountFen: number;
    beforeFen: number;
    afterFen: number;
    refund?: MallRefund | null;
    operatorAdminId?: number | null;
    operator?: string | null;
    remark?: string | null;
  }) {
    const repo = manager.getRepository(MallCommissionAdjustment);
    const replay = await repo.findOne({ where: { operationKey: input.operationKey }, loadEagerRelations: false });
    if (replay) return replay;
    return repo.save(repo.create({
      tenant: commission.tenant,
      merchant: commission.merchant || null,
      commission,
      order: commission.order,
      refund: input.refund || null,
      operationKey: input.operationKey,
      type: input.type,
      direction: input.direction,
      amount: fenToYuan(Math.max(Math.trunc(input.amountFen || 0), 0)),
      beforeAmount: fenToYuan(Math.max(Math.trunc(input.beforeFen || 0), 0)),
      afterAmount: fenToYuan(Math.max(Math.trunc(input.afterFen || 0), 0)),
      snapshot: { commissionStatus: commission.status, originalCommissionAmount: commission.originalCommissionAmount, commissionAmount: commission.commissionAmount, clawbackAmount: commission.clawbackAmount, clawbackSettledAmount: commission.clawbackSettledAmount, beneficiaryType: commission.beneficiaryType, beneficiaryKey: commission.beneficiaryKey, beneficiaryLevel: commission.beneficiaryLevel, ruleSnapshot: commission.ruleSnapshot },
      operatorAdminId: input.operatorAdminId || null,
      operator: input.operator || null,
      remark: input.remark || null
    }));
  }

  private async awardMallPurchasePoints(order: MallOrder, manager?: Pick<DataSource["manager"], "getRepository">) {
    if (Number(order.amount || 0) <= 0) return null;
    const award = await this.memberPoints.awardEvent({ user: order.user, tenant: order.tenant, eventType: "mall_order_paid", amountFen: Number(order.amountFen || yuanToFen(order.amount)), sourceType: "mall_order_paid", sourceId: order.id, remark: "商城消费积分" }, manager);
    if (award.result) await this.refreshMallMemberProfile(order.user, order.tenant, manager);
    return award.result?.log || null;
  }

  private async handleMallRefundPoints(order: MallOrder, refund: MallRefund, approvedRefundFen = yuanToFen(refund.amount || 0), manager?: Pick<DataSource["manager"], "getRepository">) {
    const pointRepo = manager ? manager.getRepository(MemberPointLog) : this.memberPointLogs;
    const tenantScopeKey = memberLevelScopeKey(order.tenant);
    const earned = await pointRepo.findOne({ where: { user: { id: order.user.id }, tenantScopeKey, sourceType: "mall_order_paid", sourceId: String(order.id) } });
    if (earned && earned.points > 0) {
      const target = cumulativePointClawbackTarget({ earnedPoints: earned.points, paidAmountFen: Number(order.amountFen || yuanToFen(order.amount)), refundedAmountFen: approvedRefundFen });
      const prior = await pointRepo.createQueryBuilder("log")
        .select("COALESCE(SUM(-COALESCE(NULLIF(log.requestedPoints, 0), log.points)), 0)", "points")
        .where("log.relatedLogId = :earnedLogId", { earnedLogId: earned.id })
        .andWhere("log.sourceType = 'mall_order_refund'")
        .getRawOne<{ points: string }>();
      const delta = Math.max(target - Math.max(Number(prior?.points || 0), 0), 0);
      if (delta > 0) {
        await this.memberPoints.post({
          user: order.user,
          tenant: order.tenant,
          points: -delta,
          sourceType: "mall_order_refund",
          sourceId: refund.refundNo || `group_buy:${order.id}`,
          remark: "商城退款扣减消费积分",
          negativePolicy: "debt",
          relatedLog: earned,
          ruleSnapshot: { mode: "cumulative_refund_ratio", earnedPoints: earned.points, paidAmountFen: Number(order.amountFen || yuanToFen(order.amount)) },
          metadata: { targetClawbackPoints: target, refundedAmountFen: approvedRefundFen, refundId: refund.id || null }
        }, manager);
      }
    }
    if (approvedRefundFen >= yuanToFen(order.amount)) await this.refundMallRedeemedPoints(order, "商城退款返还抵扣积分", manager);
  }

  private async refundMallRedeemedPoints(order: MallOrder, remark: string, manager?: Pick<DataSource["manager"], "getRepository">) {
    if (!order.pointsUsed || order.pointsUsed <= 0 || order.pointsRefundedAt) return null;
    await this.awardMallPoints(order.user, order.pointsUsed, "mall_points_return", order.id, remark, order.tenant, manager);
    order.pointsRefundedAt = new Date();
    const orderRepo = manager ? manager.getRepository(MallOrder) : this.orders;
    await orderRepo.save(order);
    return order;
  }

  private async awardMallPoints(user: User, points: number, sourceType: string, sourceId: string | number, remark: string, tenant: Tenant | null, manager?: Pick<DataSource["manager"], "getRepository">) {
    if (!points) return null;
    const result = await this.memberPoints.post({ user, tenant, points, sourceType, sourceId, remark, negativePolicy: sourceType.includes("refund") ? "debt" : "reject" }, manager);
    await this.refreshMallMemberProfile(user, tenant, manager);
    return result.log;
  }

  private async refreshMallMemberProfile(user: User, tenant: Tenant | null, manager?: Pick<DataSource["manager"], "getRepository">) {
    const profileRepo = manager ? manager.getRepository(MemberProfile) : this.memberProfiles;
    const pointRepo = manager ? manager.getRepository(MemberPointLog) : this.memberPointLogs;
    const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform";
    let profile = await profileRepo.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
    if (!profile) profile = profileRepo.create({ user, tenant, tenantScopeKey, level: null, growthValue: 0, growthCycleStartedAt: null, levelStartedAt: null, levelExpiresAt: null, levelSource: "growth" });
    const pointSum = await pointRepo.createQueryBuilder("p").select("COALESCE(SUM(p.points), 0)", "sum").addSelect("COALESCE(SUM(CASE WHEN :growthCycle IS NULL OR p.createdAt >= :growthCycle THEN p.growthValue ELSE 0 END), 0)", "growth").where("p.userId = :userId", { userId: user.id }).andWhere("p.tenantScopeKey = :tenantScopeKey", { tenantScopeKey }).andWhere("p.reversedAt IS NULL").andWhere("(p.expiresAt IS NULL OR p.expiresAt > :now)", { now: new Date(), growthCycle: profile.growthCycleStartedAt }).getRawOne<{ sum: string; growth: string }>();
    profile.points = Number(pointSum?.sum || 0);
    profile.growthValue = Number(pointSum?.growth || 0);
    if (!manualLevelOverrideActive(profile.levelSource, profile.levelExpiresAt)) {
      const previousLevelId = profile.level?.id || null;
      profile.level = await this.resolveMallMemberLevel(profile.growthValue, tenant);
      if ((profile.level?.id || null) !== previousLevelId) { profile.levelStartedAt = new Date(); profile.levelExpiresAt = levelExpiry(profile.level, profile.levelStartedAt); profile.levelSource = "growth"; profile.levelSnapshot = memberLevelSnapshot(profile.level); }
    }
    profile.lastActiveAt = new Date();
    return profileRepo.save(profile);
  }

  private async resolveMallMemberLevel(growthValue: number, tenant: Tenant | null) {
    const levels = await this.memberLevels.find({ where: { enabled: true, tenantScopeKey: memberLevelScopeKey(tenant) }, order: { minGrowth: "DESC" } });
    return resolveGrowthLevel(levels, growthValue) as MemberLevel | null;
  }

  private async closeCheckoutGroupPendingOrders(groupId: number, userId: number, tenantId: number, reason: string) {
    await this.dataSource.transaction(async (manager) => {
      const group = await manager.getRepository(MallCheckoutGroup).findOne({ where: { id: groupId, tenant: { id: tenantId }, user: { id: userId } }, lock: { mode: "pessimistic_write" } });
      if (!group) throw new NotFoundException("跨店结算组不存在");
      const orders = await manager.getRepository(MallOrder).createQueryBuilder("order")
        .leftJoinAndSelect("order.tenant", "tenant")
        .leftJoinAndSelect("order.merchant", "merchant")
        .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
        .leftJoinAndSelect("order.user", "user")
        .leftJoinAndSelect("order.coupon", "coupon")
        .where("order.checkoutGroupId = :groupId", { groupId })
        .andWhere("order.tenantId = :tenantId", { tenantId })
        .andWhere("order.userId = :userId", { userId })
        .orderBy("order.id", "ASC")
        .setLock("pessimistic_write")
        .getMany();
      if (!orders.length) throw new BadRequestException("跨店结算组没有可关闭的子订单");
      if (orders.some((order) => !["pending_payment", "closed"].includes(order.status))) throw new BadRequestException("结算组状态已变化，不能整体关闭支付");
      for (const order of orders) if (order.status === "pending_payment") await this.closeLockedMallOrder(manager, order, reason);
    });
    await this.refreshCheckoutGroupStatus(groupId);
  }

  private async closeLockedMallOrder(manager: DataSource["manager"], lockedOrder: MallOrder, reason: string) {
    const fromStatus = lockedOrder.status;
    lockedOrder.status = "closed";
    lockedOrder.fulfillmentStatus = "cancelled";
    lockedOrder.closedAt = new Date();
    lockedOrder.closeReason = reason;
    lockedOrder.expiresAt = null;
    await manager.getRepository(MallOrder).save(lockedOrder);
    await this.recordMallOrderEvent(manager, lockedOrder, { eventKey: `closed:${reason.slice(0, 48)}`, eventType: "order_closed", fromStatus, toStatus: "closed", source: reason.includes("用户") ? "user" : reason.includes("自动") || reason.includes("超时") ? "worker" : "system", operator: reason.includes("用户") ? String(lockedOrder.user.id) : null, remark: reason, occurredAt: lockedOrder.closedAt });
    await this.updateGroupBuyRecordsForOrder(manager, lockedOrder, "closed");
    await this.releaseCouponUsage(manager, lockedOrder);
    await this.releaseLockedInventory(manager, lockedOrder, reason);
    await this.refundMallRedeemedPoints(lockedOrder, "商城订单关闭返还积分", manager);
  }

  private async closeOrderAndReleaseLockedInventory(orderId: number, reason: string) {
    let checkoutGroupId = 0;
    let closed = false;
    await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(MallOrder);
      const lockedOrder = await orderRepo.findOne({
        where: { id: orderId },
        relations: ["tenant", "merchant", "checkoutGroup", "user", "coupon"],
        loadEagerRelations: false,
        lock: { mode: "pessimistic_write" }
      });
      if (!lockedOrder || lockedOrder.status === "closed") return;
      if (!["pending_payment", "pending_confirm"].includes(lockedOrder.status)) throw new BadRequestException("当前商城订单不能关闭");
      checkoutGroupId = lockedOrder.checkoutGroup?.id || 0;
      await this.closeLockedMallOrder(manager, lockedOrder, reason);
      closed = true;
    });
    if (checkoutGroupId) await this.refreshCheckoutGroupStatus(checkoutGroupId);
    return closed;
  }

  private async failGroupBuyTeam(teamNo: string, admin?: AdminContext, scope?: MallBatchScope) {
    const checkoutGroupIds = new Set<number>();
    const result = await this.dataSource.transaction(async (manager) => {
      const recordRepo = manager.getRepository(MallGroupBuyRecord);
      const orderRepo = manager.getRepository(MallOrder);
      const refundRepo = manager.getRepository(MallRefund);
      const walletRepo = manager.getRepository(UserWallet);
      const walletTxRepo = manager.getRepository(WalletTransaction);
      const batchScope = scope || await this.adminMallBatchScope(admin);
      const recordsBuilder = recordRepo.createQueryBuilder("record")
        .leftJoinAndSelect("record.order", "recordOrder")
        .leftJoinAndSelect("record.user", "recordUser")
        .where("record.teamNo = :teamNo", { teamNo })
        .setLock("pessimistic_write");
      this.applyMallBatchScope(recordsBuilder, "record", batchScope);
      const records = await recordsBuilder.getMany();
      if (!records.length) return { failed: false, refundedOrderCount: 0, manualRefundOrderCount: 0, skippedOrderCount: 0 };
      const paidPeople = new Set(records.filter((record) => record.status === "paid").map((record) => record.user?.id).filter(Boolean)).size;
      const minPeople = Math.max(...records.map((record) => Number(record.minPeople || 2)));
      if (paidPeople >= minPeople || records.some((record) => record.teamStatus === "success")) return { failed: false, refundedOrderCount: 0, manualRefundOrderCount: 0, skippedOrderCount: 0 };
      const now = new Date();
      let refundedOrderCount = 0;
      let manualRefundOrderCount = 0;
      let skippedOrderCount = 0;
      for (const record of records) {
        record.teamStatus = "failed";
        if (record.status !== "paid") continue;
        const order = await orderRepo.createQueryBuilder("order")
          .leftJoinAndSelect("order.tenant", "tenant")
          .leftJoinAndSelect("order.merchant", "merchant")
          .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
          .leftJoinAndSelect("order.user", "user")
          .leftJoinAndSelect("order.coupon", "coupon")
          .where("order.id = :orderId", { orderId: record.order.id })
          .setLock("pessimistic_write")
          .getOne();
        if (!order || !["paid", "refund_pending"].includes(order.status)) {
          skippedOrderCount += 1;
          continue;
        }
        if (order.checkoutGroup?.id) checkoutGroupIds.add(order.checkoutGroup.id);
        if (order.paymentMethod !== PaymentMethod.Balance) {
          const exists = await refundRepo.findOne({ where: { order: { id: order.id }, status: "pending" } });
          if (!exists) {
            await refundRepo.save(refundRepo.create({ refundNo: this.generateRefundNo(), tenant: order.tenant, merchant: order.merchant || null, user: order.user, order, type: "refund_only", amount: Number(order.amount || 0).toFixed(2), status: "pending", reason: `拼团未成团，待财务人工退款：${record.teamNo}`, images: [] }));
          }
          order.status = "refund_pending";
          order.closeReason = "拼团到期未成团，等待财务退款";
          await orderRepo.save(order);
          manualRefundOrderCount += 1;
          skippedOrderCount += 1;
          continue;
        }
        order.status = "refunded";
        order.closeReason = "拼团到期未成团，系统自动退款";
        await orderRepo.save(order);
        const tenantScopeKey = this.walletTenantScopeKey(order.tenant);
        let wallet = await walletRepo.findOne({ where: { user: { id: order.user.id }, tenantScopeKey }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
        if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user: order.user, tenant: order.tenant, tenantScopeKey }));
        const amountFen = yuanToFen(order.amount || 0);
        const fundingSnapshot = (order.businessSnapshot as Record<string, any> | null)?.walletFunding;
        const giftReturnFen = Math.min(Math.max(Number(fundingSnapshot?.giftFen || 0), 0), amountFen);
        const cashReturnFen = amountFen - giftReturnFen;
        const cashBeforeFen = yuanToFen(wallet.availableBalance || 0);
        const giftBeforeFen = yuanToFen(wallet.giftBalance || 0);
        wallet.availableBalance = fenToYuan(cashBeforeFen + cashReturnFen);
        wallet.giftBalance = fenToYuan(giftBeforeFen + giftReturnFen);
        await walletRepo.save(wallet);
        await walletTxRepo.save(walletTxRepo.create({ wallet, user: order.user, tenant: order.tenant, order: null, transactionNo: `MALGBREF${Date.now()}${order.id}`, direction: "credit", type: "refund_return", amount: fenToYuan(amountFen), balanceBefore: fenToYuan(cashBeforeFen), balanceAfter: wallet.availableBalance, frozenBefore: wallet.frozenBalance || "0.00", frozenAfter: wallet.frozenBalance || "0.00", giftBefore: fenToYuan(giftBeforeFen), giftAfter: wallet.giftBalance, frozenGiftBefore: wallet.frozenGiftBalance || "0.00", frozenGiftAfter: wallet.frozenGiftBalance || "0.00", operator: admin?.username || "system", remark: `拼团未成团自动退款：${order.orderNo}`, idempotencyKey: `mall_group_buy_fail:${record.teamNo}:${order.id}` }));
        await this.returnInventory(manager, order);
        await this.handleMallRefundPoints(order, manager.getRepository(MallRefund).create({ id: order.id, amount: fenToYuan(amountFen) } as MallRefund), amountFen, manager);
        await this.voidMallCommission(manager, order, `拼团未成团自动退款：${record.teamNo}`);
        record.status = "refunded";
        record.refundedAt = now;
        refundedOrderCount += 1;
      }
      await recordRepo.save(records);
      await this.logOperation(admin, "mall.group_buy.fail_expired", "mall_group_buy_team", teamNo, `拼团到期未成团：${teamNo}，自动退款 ${refundedOrderCount} 单，待人工退款 ${manualRefundOrderCount} 单，跳过 ${skippedOrderCount} 单`, records[0]?.tenant?.id);
      return { failed: true, refundedOrderCount, manualRefundOrderCount, skippedOrderCount };
    });
    await Promise.all([...checkoutGroupIds].map((groupId) => this.refreshCheckoutGroupStatus(groupId)));
    return result;
  }

  private startPendingOrderWorker() {
    const intervalMinutes = this.configNumber("MALL_PENDING_ORDER_WORKER_INTERVAL_MINUTES", 5);
    if (intervalMinutes <= 0) return undefined;
    const timer = setInterval(() => { void this.runPendingOrderWorkerCycle(); }, intervalMinutes * MINUTE_MS);
    timer.unref?.();
    return timer;
  }

  private async runPendingOrderWorkerCycle() {
    if (this.pendingOrderWorkerCycleRunning) return { started: false, reason: "previous_cycle_running" };
    this.pendingOrderWorkerCycleRunning = true;
    const tasks: Array<{ label: string; run: () => Promise<unknown> }> = [
      { label: "complete expired shipped orders", run: () => this.completeExpiredShippedOrders() },
      { label: "sync active shipment tracking", run: () => this.syncActiveMallShipmentTracking() },
      { label: "fail expired group buy teams", run: () => this.failExpiredGroupBuyTeams() },
      { label: "scan provider refunds", run: () => this.scanProviderRefunds() },
      { label: "scan expired after-sales", run: () => this.scanExpiredAfterSales() }
    ];
    if (this.config.get("ORDER_CLOSE_WORKER_ENABLED", "false") === "true") {
      tasks.unshift({ label: "close expired pending orders", run: async () => {
        const result = await this.closeExpiredPendingOrders();
        if (result.failedCount > 0 || result.hasMore) console.error(`[mall] close expired pending orders incomplete: failures=${result.failedCount}, hasMore=${result.hasMore}`);
        return result;
      } });
    }
    try {
      await Promise.all(tasks.map(async (task) => {
        try { await task.run(); }
        catch (error) { console.error(`[mall] ${task.label} failed`, error); }
      }));
      return { started: true, taskCount: tasks.length };
    } finally {
      this.pendingOrderWorkerCycleRunning = false;
    }
  }

  private startMerchantGovernanceWorker() {
    const intervalMinutes = this.configNumber("MALL_MERCHANT_GOVERNANCE_WORKER_INTERVAL_MINUTES", 60);
    if (intervalMinutes <= 0) return undefined;
    const timer = setInterval(() => {
      this.runMerchantGovernanceLifecycle().catch((error) => {
        console.error("[mall] merchant governance lifecycle failed", error);
      });
    }, intervalMinutes * MINUTE_MS);
    timer.unref?.();
    return timer;
  }

  private startInventoryGovernanceWorker() {
    const intervalMinutes = this.configNumber("MALL_INVENTORY_GOVERNANCE_WORKER_INTERVAL_MINUTES", 15);
    if (intervalMinutes <= 0) return undefined;
    const timer = setInterval(() => {
      this.scanInventoryGovernance({}, undefined, true).catch((error) => {
        console.error("[mall] inventory governance scan failed", error);
      });
    }, intervalMinutes * MINUTE_MS);
    timer.unref?.();
    return timer;
  }

  private configNumber(name: string, fallback: number) {
    const value = Number(this.config.get<string>(name, String(fallback)));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  private async consumePromotionOrderRateLimit(tenant: Tenant, user: User, items: MallOrderInputItem[], clientOrderKey: string | null, context?: MallRiskContext) {
    const windowSeconds = Math.max(Math.trunc(this.configNumber("MALL_PROMOTION_RATE_WINDOW_SECONDS", 60)), 10);
    const limits = {
      userLimit: Math.max(Math.trunc(this.configNumber("MALL_PROMOTION_RATE_USER_LIMIT", 6)), 0),
      deviceLimit: Math.max(Math.trunc(this.configNumber("MALL_PROMOTION_RATE_DEVICE_LIMIT", 10)), 0),
      ipLimit: Math.max(Math.trunc(this.configNumber("MALL_PROMOTION_RATE_IP_LIMIT", 20)), 0)
    };
    const { userCount, deviceCount, ipCount, deviceHash, ipHash } = await this.consumeMarketingRateCounts(tenant, user, "promotion_order", windowSeconds, context);
    const error = mallPromotionRateLimitError({ userCount, deviceCount, ipCount, ...limits });
    const firstPromotion = items.find((item) => item.flashSaleId || item.groupBuyId);
    const promotionType = firstPromotion?.flashSaleId ? "flash_sale" : firstPromotion?.groupBuyId ? "group_buy" : null;
    const promotionId = Number(firstPromotion?.flashSaleId || firstPromotion?.groupBuyId || 0) || null;
    const promotionRow = promotionType === "flash_sale" && promotionId
      ? await this.flashSales.findOne({ where: { id: promotionId, tenant: { id: tenant.id } } })
      : promotionType === "group_buy" && promotionId
        ? await this.groupBuys.findOne({ where: { id: promotionId, tenant: { id: tenant.id } } })
        : null;
    await this.promotionRiskEvents.save(this.promotionRiskEvents.create({
      tenant,
      user,
      merchant: promotionRow?.merchant || null,
      action: "promotion_order_attempt",
      promotionType,
      promotionId,
      deviceHash,
      ipHash,
      requestId: context?.requestId?.slice(0, 80) || null,
      clientOrderKey: clientOrderKey?.slice(0, 80) || null,
      outcome: error ? "blocked" : "allowed",
      ruleCode: error ? "promotion_order_rate" : null,
      severity: error ? "high" : "info",
      reason: error,
      detail: {
        windowSeconds,
        counts: { user: userCount, device: deviceCount, ip: ipCount },
        limits,
        flashSaleIds: [...new Set(items.map((item) => Number(item.flashSaleId || 0)).filter(Boolean))],
        groupBuyIds: [...new Set(items.map((item) => Number(item.groupBuyId || 0)).filter(Boolean))],
        userAgentHash: context?.userAgent ? this.promotionRiskHash(tenant.id, "user_agent", context.userAgent.slice(0, 500)) : null
      }
    }));
    if (error) throw new HttpException(error, HttpStatus.TOO_MANY_REQUESTS);
  }

  private async consumeCouponClaimRisk(tenant: Tenant, user: User, coupon: MallCoupon, context?: MallRiskContext) {
    const windowSeconds = Math.max(Math.trunc(this.configNumber("MALL_COUPON_CLAIM_RATE_WINDOW_SECONDS", 60)), 10);
    const limits = {
      userLimit: Math.max(Math.trunc(this.configNumber("MALL_COUPON_CLAIM_RATE_USER_LIMIT", 10)), 0),
      deviceLimit: Math.max(Math.trunc(this.configNumber("MALL_COUPON_CLAIM_RATE_DEVICE_LIMIT", 20)), 0),
      ipLimit: Math.max(Math.trunc(this.configNumber("MALL_COUPON_CLAIM_RATE_IP_LIMIT", 60)), 0)
    };
    const counts = await this.consumeMarketingRateCounts(tenant, user, "coupon_claim", windowSeconds, context);
    const rateError = mallPromotionRateLimitError({ userCount: counts.userCount, deviceCount: counts.deviceCount, ipCount: counts.ipCount, ...limits, actionLabel: "优惠券领取" });
    const since = new Date(Date.now() - Math.max(this.configNumber("MALL_COUPON_IDENTITY_WINDOW_HOURS", 24), 1) * 60 * 60 * 1000);
    const deviceDistinctUsers = counts.deviceHash ? await this.marketingRiskDistinctUsers(tenant, "coupon_claim", "coupon", coupon.id, "deviceHash", counts.deviceHash, user.id, since) : null;
    const ipDistinctUsers = counts.ipHash ? await this.marketingRiskDistinctUsers(tenant, "coupon_claim", "coupon", coupon.id, "ipHash", counts.ipHash, user.id, since) : null;
    const identityDecision = mallCouponIdentityRisk({
      deviceDistinctUsers,
      ipDistinctUsers,
      deviceAccountLimit: Math.max(Math.trunc(this.configNumber("MALL_COUPON_DEVICE_ACCOUNT_LIMIT", 3)), 0),
      ipAccountLimit: Math.max(Math.trunc(this.configNumber("MALL_COUPON_IP_ACCOUNT_LIMIT", 12)), 0)
    });
    const decision: MallMarketingRiskDecision | null = rateError
      ? { outcome: "blocked", ruleCode: "coupon_claim_rate", severity: "high", message: rateError }
      : identityDecision;
    const detail = { windowSeconds, counts: { user: counts.userCount, device: counts.deviceCount, ip: counts.ipCount }, limits, deviceDistinctUsers, ipDistinctUsers };
    await this.promotionRiskEvents.save(this.promotionRiskEvents.create({
      tenant,
      merchant: coupon.merchant || null,
      user,
      action: "coupon_claim",
      promotionType: "coupon",
      promotionId: coupon.id,
      deviceHash: counts.deviceHash,
      ipHash: counts.ipHash,
      requestId: context?.requestId?.slice(0, 80) || null,
      clientOrderKey: null,
      outcome: decision?.outcome || "allowed",
      ruleCode: decision?.ruleCode || null,
      severity: decision?.severity || "info",
      reason: decision?.message || null,
      detail
    }));
    if (decision) {
      const subjectId = decision.ruleCode.includes("device") ? counts.deviceHash || String(user.id) : decision.ruleCode.includes("ip") ? counts.ipHash || String(user.id) : String(coupon.id);
      await this.upsertMarketingRiskAlert(tenant, coupon.merchant || null, decision, "coupon", `${coupon.id}:${subjectId}`, `优惠券「${coupon.name}」领取风险`, detail);
    }
    if (decision?.outcome === "blocked") throw new HttpException(decision.message, HttpStatus.TOO_MANY_REQUESTS);
  }

  private async assessPromotionAttributionRisk(tenant: Tenant, user: User, promotion: MallPromotionCode, context?: MallRiskContext) {
    const deviceHash = context?.deviceId ? this.promotionRiskHash(tenant.id, "device", context.deviceId.slice(0, 160)) : null;
    const ipHash = context?.clientIp ? this.promotionRiskHash(tenant.id, "ip", context.clientIp.slice(0, 160)) : null;
    const since = new Date(Date.now() - Math.max(this.configNumber("MALL_PROMOTION_ATTRIBUTION_WINDOW_HOURS", 24), 1) * 60 * 60 * 1000);
    const deviceDistinctBuyers = deviceHash ? await this.marketingRiskDistinctUsers(tenant, "promotion_attribution", "promotion_code", promotion.id, "deviceHash", deviceHash, user.id, since) : null;
    const ipDistinctBuyers = ipHash ? await this.marketingRiskDistinctUsers(tenant, "promotion_attribution", "promotion_code", promotion.id, "ipHash", ipHash, user.id, since) : null;
    const decision = mallPromotionAttributionRisk({
      buyerUserId: user.id,
      promoterUserId: promotion.promoterUser?.id || null,
      deviceDistinctBuyers,
      ipDistinctBuyers,
      deviceBuyerLimit: Math.max(Math.trunc(this.configNumber("MALL_PROMOTION_DEVICE_BUYER_LIMIT", 3)), 0),
      ipBuyerReviewLimit: Math.max(Math.trunc(this.configNumber("MALL_PROMOTION_IP_BUYER_REVIEW_LIMIT", 10)), 0)
    });
    const detail = { deviceDistinctBuyers, ipDistinctBuyers, promoterUserId: promotion.promoterUser?.id || null, agentId: promotion.agent?.id || null };
    await this.promotionRiskEvents.save(this.promotionRiskEvents.create({
      tenant,
      merchant: promotion.merchant || null,
      user,
      action: "promotion_attribution",
      promotionType: "promotion_code",
      promotionId: promotion.id,
      deviceHash,
      ipHash,
      requestId: context?.requestId?.slice(0, 80) || null,
      clientOrderKey: null,
      outcome: decision?.outcome || "allowed",
      ruleCode: decision?.ruleCode || null,
      severity: decision?.severity || "info",
      reason: decision?.message || null,
      detail
    }));
    if (decision) {
      const subjectId = decision.ruleCode.includes("device") ? deviceHash || String(user.id) : decision.ruleCode.includes("ip") ? ipHash || String(user.id) : String(user.id);
      await this.upsertMarketingRiskAlert(tenant, promotion.merchant || null, decision, "promotion_code", `${promotion.id}:${subjectId}`, `推广码「${promotion.code}」归因风险`, detail);
    }
    return decision;
  }

  private async consumeMarketingRateCounts(tenant: Tenant, user: User, action: string, windowSeconds: number, context?: MallRiskContext) {
    const now = new Date();
    const windowMs = windowSeconds * 1000;
    const windowStartedAt = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
    const expiresAt = new Date(windowStartedAt.getTime() + windowMs * 2);
    const deviceHash = context?.deviceId ? this.promotionRiskHash(tenant.id, "device", context.deviceId.slice(0, 160)) : null;
    const ipHash = context?.clientIp ? this.promotionRiskHash(tenant.id, "ip", context.clientIp.slice(0, 160)) : null;
    const userHash = this.promotionRiskHash(tenant.id, "user", String(user.id));
    const userCount = await this.incrementPromotionRateWindow(tenant, action, "user", userHash, windowStartedAt, expiresAt);
    const deviceCount = deviceHash ? await this.incrementPromotionRateWindow(tenant, action, "device", deviceHash, windowStartedAt, expiresAt) : null;
    const ipCount = ipHash ? await this.incrementPromotionRateWindow(tenant, action, "ip", ipHash, windowStartedAt, expiresAt) : null;
    if (userCount % 20 === 0) await this.promotionRateLimits.delete({ expiresAt: LessThan(now) });
    return { userCount, deviceCount, ipCount, deviceHash, ipHash };
  }

  private async marketingRiskDistinctUsers(tenant: Tenant, action: string, promotionType: MallPromotionRiskEvent["promotionType"], promotionId: number, field: "deviceHash" | "ipHash", hash: string, currentUserId: number, since: Date) {
    const raw = await this.promotionRiskEvents.createQueryBuilder("event")
      .select("COUNT(DISTINCT event.userId)", "count")
      .where("event.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("event.action = :action", { action })
      .andWhere("event.promotionType = :promotionType", { promotionType })
      .andWhere("event.promotionId = :promotionId", { promotionId })
      .andWhere(`event.${field} = :hash`, { hash })
      .andWhere("event.userId <> :currentUserId", { currentUserId })
      .andWhere("event.outcome IN (:...outcomes)", { outcomes: ["allowed", "review"] })
      .andWhere("event.createdAt >= :since", { since })
      .getRawOne<{ count: string }>();
    return Number(raw?.count || 0) + 1;
  }

  private async upsertMarketingRiskAlert(tenant: Tenant, merchant: MallMerchant | null, decision: MallMarketingRiskDecision, subjectType: string, subjectId: string, title: string, detail: Record<string, unknown>) {
    const fingerprint = this.promotionRiskHash(tenant.id, "alert", `${decision.ruleCode}|${subjectType}|${subjectId}`);
    const now = new Date();
    await this.dataSource.query(
      "INSERT INTO mall_promotion_risk_alerts (tenantId, merchantId, fingerprint, ruleCode, severity, status, subjectType, subjectId, title, message, detail, occurrenceCount, firstDetectedAt, lastDetectedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE severity = VALUES(severity), status = IF(status = 'ignored', 'ignored', 'open'), title = VALUES(title), message = VALUES(message), detail = VALUES(detail), occurrenceCount = occurrenceCount + 1, lastDetectedAt = VALUES(lastDetectedAt), resolvedByAdminId = NULL, resolvedBy = NULL, resolvedAt = NULL, resolutionRemark = NULL, updatedAt = CURRENT_TIMESTAMP",
      [tenant.id, merchant?.id || null, fingerprint, decision.ruleCode, decision.severity, subjectType, subjectId.slice(0, 100), title.slice(0, 160), decision.message.slice(0, 1000), JSON.stringify(detail), now, now]
    );
    return this.promotionRiskAlerts.findOne({ where: { fingerprint } });
  }

  private async incrementPromotionRateWindow(tenant: Tenant, action: string, dimension: MallPromotionRateLimit["dimension"], keyHash: string, windowStartedAt: Date, expiresAt: Date) {
    await this.dataSource.query(
      "INSERT INTO mall_promotion_rate_limits (tenantId, action, dimension, keyHash, windowStartedAt, count, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE count = count + 1, expiresAt = VALUES(expiresAt), updatedAt = CURRENT_TIMESTAMP",
      [tenant.id, action, dimension, keyHash, windowStartedAt, expiresAt]
    );
    const row = await this.promotionRateLimits.findOne({ where: { tenant: { id: tenant.id }, action, dimension, keyHash, windowStartedAt } });
    return Math.max(Number(row?.count || 1), 1);
  }

  private promotionRiskHash(tenantId: number, dimension: string, value: string) {
    const secret = this.config.get<string>("MALL_PROMOTION_RISK_HASH_SECRET") || this.config.get<string>("JWT_SECRET") || "dev-mall-promotion-risk";
    return createHmac("sha256", secret).update(`${tenantId}|${dimension}|${value}`).digest("hex");
  }

  private mallOrderExpiresAt(paymentMethod: PaymentMethod) {
    const minutes = paymentMethod === PaymentMethod.Offline
      ? this.configNumber("MALL_PENDING_CONFIRM_EXPIRE_MINUTES", 24 * 60)
      : this.configNumber("MALL_PENDING_PAYMENT_EXPIRE_MINUTES", 30);
    return new Date(Date.now() + minutes * MINUTE_MS);
  }

  private async releaseCouponUsage(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, reason?: string) {
    const couponId = order.couponId || order.coupon?.id;
    if (!couponId) return;
    const checkoutGroupId = order.checkoutGroup?.id || 0;
    let checkoutOrderIds: number[] = [];
    if (checkoutGroupId) {
      const checkoutOrders = await manager.getRepository(MallOrder).find({ where: { checkoutGroup: { id: checkoutGroupId } }, loadEagerRelations: false });
      const allocatedOrders = checkoutOrders.filter((item) => Number(item.allocationSnapshot?.couponDiscountFen || 0) > 0);
      const couponOrders = allocatedOrders.length ? allocatedOrders : checkoutOrders;
      if (!mallCheckoutCouponReleaseEligible(couponOrders.map((item) => item.status))) return;
      checkoutOrderIds = couponOrders.map((item) => item.id);
    }
    const couponRepo = manager.getRepository(MallCoupon);
    const coupon = await couponRepo.findOne({ where: { id: couponId }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
    const usageRepo = manager.getRepository(MallCouponUsage);
    const usage = checkoutOrderIds.length
      ? await usageRepo.createQueryBuilder("usage")
          .leftJoinAndSelect("usage.coupon", "coupon")
          .leftJoin("usage.order", "usageOrder")
          .where("usageOrder.id IN (:...checkoutOrderIds)", { checkoutOrderIds })
          .andWhere("usage.status = :status", { status: "used" })
          .setLock("pessimistic_write")
          .getOne()
      : await usageRepo.findOne({ where: { order: { id: order.id }, status: "used" }, relations: ["coupon"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
    if (!usage) return;
    usage.status = "released";
    usage.releasedAt = new Date();
    usage.releaseReason = reason || order.closeReason || "订单关闭释放优惠券";
    await usageRepo.update(usage.id, { status: usage.status, releasedAt: usage.releasedAt, releaseReason: usage.releaseReason });
    await this.releaseCouponClaimUsage(manager, order.tenant, usage.coupon, order.user);
    if (!coupon || coupon.usedCount <= 0) return;
    coupon.usedCount -= 1;
    await couponRepo.update(coupon.id, { usedCount: coupon.usedCount });
  }

  private async releaseLockedInventory(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, reason: string) {
    const skuRepo = manager.getRepository(MallSku);
    const inventoryRepo = manager.getRepository(MallInventoryLog);
    const items = await manager.getRepository(MallOrderItem).find({ where: { order: { id: order.id } }, relations: ["sku", "flashSale", "groupBuy"], loadEagerRelations: false });
    for (const item of items) {
      const sku = await skuRepo.findOne({ where: { id: item.sku.id }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!sku) continue;
      const operationKey = `order-item:${item.id}:base:release`;
      if (await inventoryRepo.findOne({ where: { tenant: { id: order.tenant.id }, operationKey }, loadEagerRelations: false })) continue;
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      sku.lockedStock = Math.max(sku.lockedStock - item.quantity, 0);
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, merchant: order.merchant || sku.merchant || null, sku, order, type: "release", operationKey, sourceType: "mall_order_item", sourceId: String(item.id), quantity: item.quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: reason }));
      await this.releaseFlashSaleStock(manager, order, item, reason);
      await this.releaseGroupBuyStock(manager, order, item, reason);
    }
  }

  private async updateGroupBuyRecordsForOrder(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, status: MallGroupBuyRecord["status"]) {
    const repo = manager.getRepository(MallGroupBuyRecord);
    const records = await repo.find({ where: { order: { id: order.id } }, loadEagerRelations: false });
    if (!records.length) return;
    const now = new Date();
    for (const record of records) {
      record.status = status;
      if (status === "paid") record.paidAt = record.paidAt || order.paidAt || now;
      if (status === "closed") record.closedAt = record.closedAt || order.closedAt || now;
      if (status === "refunded") record.refundedAt = record.refundedAt || now;
    }
    await repo.save(records);
    for (const teamNo of [...new Set(records.map((record) => record.teamNo).filter(Boolean))]) {
      await this.refreshGroupBuyTeamStatus(manager, teamNo);
    }
  }

  private async resolveGroupBuyTeamNo(manager: Pick<DataSource["manager"], "getRepository">, tenant: Tenant, groupBuy: MallGroupBuy, user: User, quantity: number, joinTeamNo?: string) {
    const teamNo = this.optionalString(joinTeamNo);
    if (!teamNo) return this.generateGroupBuyTeamNo();
    const records = await manager.getRepository(MallGroupBuyRecord).find({ where: { tenant: { id: tenant.id }, groupBuy: { id: groupBuy.id }, teamNo }, relations: ["user"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
    if (!records.length) throw new BadRequestException("拼团队伍不存在或已失效");
    const activeRecords = records.filter((record) => !["closed", "refunded"].includes(record.status));
    const joinError = mallGroupBuyJoinError({ quantity, teamStatus: records[0].teamStatus, userAlreadyJoined: activeRecords.some((record) => record.user?.id === user.id), occupiedPeople: new Set(activeRecords.map((record) => record.user?.id).filter(Boolean)).size, minPeople: Math.max(Number(groupBuy.minPeople || 2), 2) });
    if (joinError) throw new BadRequestException(joinError);
    return teamNo;
  }

  private async refreshGroupBuyTeamStatus(manager: Pick<DataSource["manager"], "getRepository">, teamNo: string) {
    const repo = manager.getRepository(MallGroupBuyRecord);
    const records = await repo.find({ where: { teamNo }, relations: ["user"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
    if (!records.length) return;
    const paidPeople = new Set(records.filter((record) => record.status === "paid").map((record) => record.user?.id).filter(Boolean)).size;
    const minPeople = Math.max(...records.map((record) => Number(record.minPeople || 2)));
    const teamStatus = paidPeople >= minPeople ? "success" : "forming";
    for (const record of records) {
      record.paidPeople = paidPeople;
      if (record.status !== "closed" && record.status !== "refunded") record.teamStatus = teamStatus;
    }
    await repo.save(records);
  }

  private async findAdminOrder(id: number, admin?: AdminContext, requiredPermission: MerchantPermissionRequirement = ["order.view", "order.manage"]) {
    const order = await this.orders.findOne({
      where: { id },
      relations: ["tenant", "merchant", "checkoutGroup", "user", "coupon"],
      loadEagerRelations: false
    });
    if (!order) throw new NotFoundException("商城订单不存在");
    this.assertAdminTenantAccess(order, admin);
    await this.assertAdminRowMerchantAccess(order, admin, "商城订单", requiredPermission);
    return order;
  }

  private async findAdminSettlement(id: number, admin?: AdminContext) {
    const settlement = await this.settlements.findOne({ where: { id }, relations: ["tenant", "merchant"], loadEagerRelations: false });
    if (!settlement) throw new NotFoundException("商城结算单不存在");
    this.assertAdminTenantAccess(settlement, admin);
    await this.assertAdminMerchantAccess(settlement.merchant, admin);
    return settlement;
  }

  private async buildMallSettlementLedgerDraft(manager: Pick<DataSource["manager"], "getRepository">, tenant: Tenant, merchant: MallMerchant, periodStart: string, periodEnd: string, businessKey: string) {
    const startAt = `${periodStart} 00:00:00`;
    const endAt = `${periodEnd} 23:59:59`;
    const settled = await this.settledMallSnapshotIds(tenant, merchant, periodStart, periodEnd, manager);
    const merchantChargedCommissionIds = await this.mallMerchantChargedCommissionIds(manager, tenant, merchant);
    const orderBuilder = manager.getRepository(MallOrder)
      .createQueryBuilder("order")
      .where("order.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("order.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("order.status = :status", { status: "completed" })
      .andWhere("order.completedAt BETWEEN :startAt AND :endAt", { startAt, endAt })
      .setLock("pessimistic_write");
    if (settled.orderIds.length) orderBuilder.andWhere("order.id NOT IN (:...settledOrderIds)", { settledOrderIds: settled.orderIds });
    const orders = await orderBuilder.getMany();
    const refundBuilder = manager.getRepository(MallRefund)
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .where("refund.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("refund.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("refund.status = :status", { status: "approved" })
      .andWhere("COALESCE(refund.completedAt, refund.createdAt) BETWEEN :startAt AND :endAt", { startAt, endAt })
      .setLock("pessimistic_write");
    if (settled.refundIds.length) refundBuilder.andWhere("refund.id NOT IN (:...settledRefundIds)", { settledRefundIds: settled.refundIds });
    const refunds = await refundBuilder.getMany();

    const commissionBuilder = manager.getRepository(MallCommission)
      .createQueryBuilder("commission")
      .leftJoinAndSelect("commission.order", "order")
      .leftJoinAndSelect("commission.orderItem", "orderItem")
      .leftJoinAndSelect("commission.product", "product")
      .where("commission.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("commission.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("order.completedAt BETWEEN :startAt AND :endAt", { startAt, endAt })
      .andWhere("commission.status IN (:...statuses)", { statuses: ["pending", "settled", "risk_review"] })
      .setLock("pessimistic_write");
    if (settled.commissionIds.length) commissionBuilder.andWhere("commission.id NOT IN (:...settledCommissionIds)", { settledCommissionIds: settled.commissionIds });
    const commissionRows = await commissionBuilder.getMany();
    const riskCommissions = commissionRows.filter((row) => row.status === "risk_review");
    if (riskCommissions.length) throw new BadRequestException(`当前周期有 ${riskCommissions.length} 笔佣金处于风险复核，需先完成复核再生成商户结算单`);
    const commissions = commissionRows.filter((row) => ["pending", "settled"].includes(row.status) && yuanToFen(row.commissionAmount) > 0);

    const adjustmentBuilder = manager.getRepository(MallCommissionAdjustment)
      .createQueryBuilder("adjustment")
      .leftJoinAndSelect("adjustment.commission", "commission")
      .leftJoinAndSelect("adjustment.order", "order")
      .leftJoinAndSelect("adjustment.refund", "refund")
      .where("adjustment.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("adjustment.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("adjustment.type IN (:...types)", { types: ["clawback_settlement", "refund_reduction"] })
      .andWhere("adjustment.createdAt BETWEEN :startAt AND :endAt", { startAt, endAt })
      .setLock("pessimistic_read");
    if (settled.commissionAdjustmentIds.length) adjustmentBuilder.andWhere("adjustment.id NOT IN (:...settledAdjustmentIds)", { settledAdjustmentIds: settled.commissionAdjustmentIds });
    const currentCommissionIds = new Set(commissions.map((commission) => commission.id));
    const clawbackAdjustments = (await adjustmentBuilder.getMany()).filter((adjustment) => {
      const charged = merchantChargedCommissionIds.includes(adjustment.commission.id);
      if (adjustment.type === "refund_reduction") return charged;
      return charged || currentCommissionIds.has(adjustment.commission.id);
    });

    const orderFen = orders.reduce((sum, order) => sum + this.mallEntityAmountFen(order.amountFen, order.amount), 0);
    const refundFen = refunds.reduce((sum, refund) => sum + this.mallEntityAmountFen(refund.amountFen, refund.amount), 0);
    const merchantDirectOrderFen = orders.filter((order) => this.isMerchantDirectCollectedSettlementOrder(order, merchant)).reduce((sum, order) => sum + this.mallEntityAmountFen(order.amountFen, order.amount), 0);
    const merchantDirectRefundFen = refunds.filter((refund) => this.isMerchantDirectCollectedSettlementOrder(refund.order, merchant)).reduce((sum, refund) => sum + this.mallEntityAmountFen(refund.amountFen, refund.amount), 0);
    const commissionFen = commissions.reduce((sum, commission) => sum + yuanToFen(commission.commissionAmount), 0);
    const commissionClawbackFen = clawbackAdjustments.reduce((sum, adjustment) => sum + yuanToFen(adjustment.amount), 0);
    const serviceFeeBps = this.mallSettlementServiceFeeBps(merchant);
    const amounts = calculateMallSettlementAmounts({ orderFen, refundFen, merchantDirectOrderFen, merchantDirectRefundFen, serviceFeeBps, commissionFen, commissionClawbackFen });

    const baseLine = {
      tenant,
      merchant,
      order: null,
      refund: null,
      commission: null,
      commissionAdjustment: null,
      feeAmount: "0.00",
      commissionAmount: "0.00",
      remark: null
    };
    const lines: Array<Omit<MallSettlementLine, "id" | "settlement" | "createdAt">> = [];
    for (const order of orders) {
      const grossFen = this.mallEntityAmountFen(order.amountFen, order.amount);
      const direct = this.isMerchantDirectCollectedSettlementOrder(order, merchant);
      lines.push({ ...baseLine, order, operationKey: `settlement-line:${businessKey}:order:${order.id}`, lineType: "order", sourceType: "order", sourceId: String(order.id), businessNo: order.orderNo, direction: "credit", grossAmount: fenToYuan(grossFen), payableAmount: fenToYuan(direct ? 0 : grossFen), snapshot: { orderNo: order.orderNo, paymentMethod: order.paymentMethod, paymentMode: merchant.paymentMode, platformCollectedFen: direct ? 0 : grossFen, merchantDirectFen: direct ? grossFen : 0, amountFen: grossFen, businessSnapshot: order.businessSnapshot } });
    }
    for (const refund of refunds) {
      const grossFen = this.mallEntityAmountFen(refund.amountFen, refund.amount);
      const direct = this.isMerchantDirectCollectedSettlementOrder(refund.order, merchant);
      lines.push({ ...baseLine, refund, order: refund.order, operationKey: `settlement-line:${businessKey}:refund:${refund.id}`, lineType: "refund", sourceType: "refund", sourceId: String(refund.id), businessNo: refund.refundNo, direction: "debit", grossAmount: fenToYuan(grossFen), payableAmount: fenToYuan(direct ? 0 : -grossFen), snapshot: { refundNo: refund.refundNo, orderNo: refund.order?.orderNo || null, paymentMethod: refund.order?.paymentMethod || null, paymentMode: merchant.paymentMode, platformCollectedRefundFen: direct ? 0 : grossFen, merchantDirectRefundFen: direct ? grossFen : 0, amountFen: grossFen, businessSnapshot: refund.businessSnapshot } });
    }
    for (const commission of commissions) {
      const amountFen = yuanToFen(commission.commissionAmount);
      lines.push({ ...baseLine, commission, order: commission.order, operationKey: `settlement-line:${businessKey}:commission:${commission.id}`, lineType: "commission", sourceType: "commission", sourceId: String(commission.id), businessNo: commission.order?.orderNo || commission.code, direction: "debit", grossAmount: fenToYuan(amountFen), commissionAmount: fenToYuan(amountFen), payableAmount: fenToYuan(-amountFen), snapshot: { commissionId: commission.id, operationKey: commission.operationKey, beneficiaryType: commission.beneficiaryType, beneficiaryKey: commission.beneficiaryKey, beneficiaryLevel: commission.beneficiaryLevel, ruleSnapshot: commission.ruleSnapshot, calculationSnapshot: commission.calculationSnapshot } });
    }
    for (const adjustment of clawbackAdjustments) {
      const amountFen = yuanToFen(adjustment.amount);
      lines.push({ ...baseLine, commission: adjustment.commission, commissionAdjustment: adjustment, order: adjustment.order, refund: adjustment.refund, operationKey: `settlement-line:${businessKey}:commission-clawback:${adjustment.id}`, lineType: "commission_clawback", sourceType: "commission_adjustment", sourceId: String(adjustment.id), businessNo: adjustment.order?.orderNo || adjustment.commission?.code || null, direction: "credit", grossAmount: fenToYuan(amountFen), commissionAmount: fenToYuan(amountFen), payableAmount: fenToYuan(amountFen), snapshot: { commissionAdjustmentId: adjustment.id, operationKey: adjustment.operationKey, type: adjustment.type, direction: adjustment.direction, commissionId: adjustment.commission?.id || null, refundId: adjustment.refund?.id || null } });
    }
    if (amounts.serviceFeeFen) {
      const payableFen = -amounts.serviceFeeFen;
      lines.push({ ...baseLine, operationKey: `settlement-line:${businessKey}:service-fee`, lineType: "service_fee", sourceType: "settlement_fee", sourceId: businessKey, businessNo: null, direction: payableFen >= 0 ? "credit" : "debit", grossAmount: "0.00", feeAmount: fenToYuan(Math.abs(amounts.serviceFeeFen)), payableAmount: fenToYuan(payableFen), snapshot: { serviceFeeBps, netFen: amounts.netFen, serviceFeeFen: amounts.serviceFeeFen, calculationVersion: "settlement_v2" } });
    }
    return {
      settlement: {
        tenant,
        merchant,
        periodStart,
        periodEnd,
        status: "draft" as const,
        paymentMode: merchant.paymentMode,
        orderCount: orders.length,
        orderAmount: fenToYuan(orderFen),
        refundAmount: fenToYuan(refundFen),
        netAmount: fenToYuan(amounts.netFen),
        platformCollectedAmount: fenToYuan(amounts.platformCollectedFen),
        merchantDirectAmount: fenToYuan(amounts.merchantDirectFen),
        serviceFeeAmount: fenToYuan(amounts.serviceFeeFen),
        commissionAmount: fenToYuan(amounts.commissionFen),
        commissionClawbackAmount: fenToYuan(amounts.commissionClawbackFen),
        adjustmentAmount: "0.00",
        payableAmount: fenToYuan(amounts.payableFen),
        lineCount: lines.length,
        calculationVersion: "settlement_v2",
        snapshot: { orderIds: orders.map((order) => order.id), refundIds: refunds.map((refund) => refund.id), commissionIds: commissions.map((commission) => commission.id), commissionAdjustmentIds: clawbackAdjustments.map((adjustment) => adjustment.id), serviceFeeBps, paymentMode: merchant.paymentMode, merchantDirectCollectionOrderAmount: fenToYuan(merchantDirectOrderFen), merchantDirectCollectionRefundAmount: fenToYuan(merchantDirectRefundFen), settlementConfig: this.mallSettlementPublicConfig(merchant.settlementConfig) }
      },
      lines
    };
  }

  private mallSettlementQueryRange(query: MallListQueryDto) {
    const periodStart = query.startDate ? this.normalizeSettlementDate(query.startDate, "结算开始日期") : "";
    const periodEnd = query.endDate ? this.normalizeSettlementDate(query.endDate, "结算结束日期") : "";
    if (periodStart && periodEnd && periodStart > periodEnd) throw new BadRequestException("结算开始日期不能晚于结束日期");
    return { periodStart, periodEnd };
  }

  private async settledMallSnapshotIds(tenant: Tenant | null, merchant: MallMerchant | null, periodStart?: string, periodEnd?: string, manager: Pick<DataSource["manager"], "getRepository"> = this.dataSource.manager) {
    const builder = manager.getRepository(MallSettlement)
      .createQueryBuilder("settlement")
      .where("settlement.status IN (:...statuses)", { statuses: ["draft", "approved", "paid"] });
    if (tenant) this.applyTenantFilter(builder, "settlement", tenant);
    if (merchant) this.applyMerchantFilter(builder, "settlement", merchant);
    if (periodStart && periodEnd) {
      builder.andWhere("settlement.periodStart <= :periodEnd AND settlement.periodEnd >= :periodStart", { periodStart, periodEnd });
    } else if (periodStart) {
      builder.andWhere("settlement.periodEnd >= :periodStart", { periodStart });
    } else if (periodEnd) {
      builder.andWhere("settlement.periodStart <= :periodEnd", { periodEnd });
    }
    const rows = await builder.take(1000).getMany();
    const orderIds = new Set<number>();
    const refundIds = new Set<number>();
    const commissionIds = new Set<number>();
    const commissionAdjustmentIds = new Set<number>();
    for (const row of rows) {
      const snapshot = this.mallSettlementSnapshot(row.snapshot);
      for (const id of snapshot.orderIds) orderIds.add(id);
      for (const id of snapshot.refundIds) refundIds.add(id);
      for (const id of snapshot.commissionIds) commissionIds.add(id);
      for (const id of snapshot.commissionAdjustmentIds) commissionAdjustmentIds.add(id);
    }
    const lineBuilder = manager.getRepository(MallSettlementLine)
      .createQueryBuilder("line")
      .innerJoin("line.settlement", "settlement")
      .where("settlement.status IN (:...statuses)", { statuses: ["draft", "approved", "paid"] });
    if (tenant) lineBuilder.andWhere("line.tenantId = :tenantId", { tenantId: tenant.id });
    if (merchant) lineBuilder.andWhere("line.merchantId = :merchantId", { merchantId: merchant.id });
    const activeLines = await lineBuilder
      .select("line.sourceType", "sourceType")
      .addSelect("line.sourceId", "sourceId")
      .limit(10000)
      .getRawMany<{ sourceType: string; sourceId: string }>();
    for (const line of activeLines) {
      const id = Number(line.sourceId || 0);
      if (!id) continue;
      if (line.sourceType === "order") orderIds.add(id);
      else if (line.sourceType === "refund") refundIds.add(id);
      else if (line.sourceType === "commission") commissionIds.add(id);
      else if (line.sourceType === "commission_adjustment") commissionAdjustmentIds.add(id);
    }
    return { orderIds: [...orderIds], refundIds: [...refundIds], commissionIds: [...commissionIds], commissionAdjustmentIds: [...commissionAdjustmentIds] };
  }

  private async mallMerchantChargedCommissionIds(manager: Pick<DataSource["manager"], "getRepository">, tenant: Tenant | null, merchant: MallMerchant | null) {
    const builder = manager.getRepository(MallSettlementLine)
      .createQueryBuilder("line")
      .innerJoin("line.settlement", "settlement")
      .where("line.sourceType = :sourceType", { sourceType: "commission" })
      .andWhere("settlement.status IN (:...statuses)", { statuses: ["approved", "paid"] });
    if (tenant) builder.andWhere("line.tenantId = :tenantId", { tenantId: tenant.id });
    if (merchant) builder.andWhere("line.merchantId = :merchantId", { merchantId: merchant.id });
    const rows = await builder.select("line.sourceId", "sourceId").distinct(true).take(10000).getRawMany<{ sourceId: string }>();
    return rows.map((row) => Number(row.sourceId || 0)).filter(Boolean);
  }

  private mallSettlementSnapshot(value: unknown) {
    let snapshot = value;
    if (typeof snapshot === "string") {
      try {
        snapshot = JSON.parse(snapshot);
      } catch {
        snapshot = {};
      }
    }
    const input = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot as Record<string, unknown> : {};
    const toIds = (items: unknown) => Array.isArray(items) ? items.map((item) => Number(item || 0)).filter(Boolean) : [];
    return { orderIds: toIds(input.orderIds), refundIds: toIds(input.refundIds), commissionIds: toIds(input.commissionIds), commissionAdjustmentIds: toIds(input.commissionAdjustmentIds) };
  }

  private async publicOrderWithItems(order: MallOrder, user?: User, includeFulfillmentDetails = true): Promise<MallOrderWithItemsResult> {
    const items = await this.orderItems.find({
      where: { order: { id: order.id } },
      relations: ["merchant", "product", "sku", "flashSale", "groupBuy"],
      loadEagerRelations: false
    });
    const refunds = await this.refunds.find({ where: { order: { id: order.id } }, loadEagerRelations: false, order: { createdAt: "DESC" } });
    await this.hydrateMallRefunds(refunds);
    const refund = refunds.find((row) => !["rejected", "cancelled"].includes(row.status)) || refunds[0] || null;
    const groupBuyRecords = await this.groupBuyRecords.find({ where: { order: { id: order.id } }, relations: ["groupBuy"], loadEagerRelations: false });
    const shipments = includeFulfillmentDetails ? await this.shipments.find({ where: { order: { id: order.id } }, loadEagerRelations: false, order: { shippedAt: "ASC", id: "ASC" } }) : [];
    const shipmentRows = includeFulfillmentDetails && shipments.length ? await this.shipmentItems.find({ where: { shipment: { id: In(shipments.map((shipment) => shipment.id)) } }, relations: ["shipment", "orderItem"], loadEagerRelations: false }) : [];
    const trackingRows = includeFulfillmentDetails && shipments.length ? await this.shipmentTrackingEvents.find({ where: { shipment: { id: In(shipments.map((shipment) => shipment.id)) } }, relations: ["shipment"], loadEagerRelations: false, order: { eventAt: "ASC", id: "ASC" } }) : [];
    const publicShipments = shipments.map((shipment) => ({ id: shipment.id, shipmentNo: shipment.shipmentNo, shipmentType: shipment.shipmentType, refundId: shipment.refund?.id || null, expressCompany: shipment.expressCompany, expressNo: shipment.expressNo, status: shipment.status, createdBy: shipment.createdBy, remark: shipment.remark, shippedAt: shipment.shippedAt, deliveredAt: shipment.deliveredAt, createdAt: shipment.createdAt, updatedAt: shipment.updatedAt, items: shipmentRows.filter((row) => row.shipment.id === shipment.id).map((row) => ({ id: row.id, orderItemId: row.orderItem.id, quantity: row.quantity, itemSnapshot: row.itemSnapshot })), trackingEvents: trackingRows.filter((row) => row.shipment.id === shipment.id).map((row) => ({ id: row.id, status: row.status, description: row.description, location: row.location, source: row.source, eventAt: row.eventAt })) }));
    const orderEvents = includeFulfillmentDetails ? await this.orderEvents.find({ where: { order: { id: order.id } }, loadEagerRelations: false, order: { occurredAt: "ASC", id: "ASC" } }) : [];
    const publicEvents = orderEvents.map((event) => ({ id: event.id, eventType: event.eventType, fromStatus: event.fromStatus, toStatus: event.toStatus, source: event.source, operator: event.operator, remark: event.remark, detail: event.detail, occurredAt: event.occurredAt }));
    const publicOrderUser = order.user ? { id: order.user.id, nickname: order.user.nickname, phone: order.user.phone } : null;
    const groupBuyTeams = groupBuyRecords.map((record) => ({
      id: record.id,
      title: record.title,
      teamNo: record.teamNo,
      teamStatus: record.teamStatus,
      status: record.status,
      minPeople: record.minPeople,
      paidPeople: record.paidPeople,
      quantity: record.quantity,
      amount: record.amount,
      groupPrice: record.groupPrice,
      paidAt: record.paidAt,
      refundedAt: record.refundedAt,
      groupBuy: record.groupBuy ? { id: record.groupBuy.id, title: record.groupBuy.title, endsAt: record.groupBuy.endsAt } : null
    }));
    if (!user || !items.length) return { ...order, user: publicOrderUser, items, refund, refunds, groupBuyTeams, shipments: publicShipments, events: publicEvents } as MallOrderWithItemsResult;
    const reviews = await this.reviews.find({
      where: { orderItem: { id: In(items.map((item) => item.id)) }, user: { id: user.id } },
      relations: ["orderItem", "merchant", "product", "sku"],
      loadEagerRelations: false
    });
    return { ...order, user: publicOrderUser, items: items.map((item) => ({ ...item, review: reviews.find((review) => review.orderItem.id === item.id) || null })), refund, refunds, groupBuyTeams, shipments: publicShipments, events: publicEvents } as MallOrderWithItemsResult;
  }

  private async publicUserOrderWithItems(order: MallOrder, user?: User): Promise<MallOrderPublicResult> {
    const row = await this.publicOrderWithItems(order, user);
    return this.publicUserOrder(row);
  }

  private publicUserOrder(order: MallOrderWithItemsResult): MallOrderPublicResult {
    return {
      id: order.id,
      orderNo: order.orderNo,
      tenant: this.publicTenantSummary(order.tenant),
      merchant: this.publicMerchantSummary(order.merchant),
      checkoutGroup: order.checkoutGroup ? {
        id: order.checkoutGroup.id,
        groupNo: order.checkoutGroup.groupNo,
        amount: order.checkoutGroup.amount,
        status: order.checkoutGroup.status
      } : null,
      amount: order.amount,
      goodsAmount: order.goodsAmount,
      discountAmount: order.discountAmount,
      pointsUsed: order.pointsUsed,
      pointsDiscountAmount: order.pointsDiscountAmount,
      freightAmount: order.freightAmount,
      allocationSnapshot: order.allocationSnapshot,
      paymentMethod: order.paymentMethod,
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      totalQuantity: order.totalQuantity,
      shippedQuantity: order.shippedQuantity,
      promotionCode: order.promotionCode,
      addressSnapshot: order.addressSnapshot,
      expressCompany: order.expressCompany,
      expressNo: order.expressNo,
      buyerRemark: order.buyerRemark,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      completedAt: order.completedAt,
      expiresAt: order.expiresAt,
      closedAt: order.closedAt,
      closeReason: order.closeReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => this.publicUserOrderItem(item)),
      refund: this.publicUserRefund(order.refund, order.paymentMethod),
      refunds: order.refunds.map((refund) => this.publicUserRefund(refund, order.paymentMethod)),
      groupBuyTeams: order.groupBuyTeams.map((team) => this.publicUserGroupBuyTeam(team)),
      shipments: order.shipments,
      events: order.events
    };
  }

  private publicUserGroupBuyTeam(team: Record<string, unknown>) {
    const groupBuy = team.groupBuy && typeof team.groupBuy === "object" && !Array.isArray(team.groupBuy) ? team.groupBuy as Record<string, unknown> : {};
    const minPeople = Math.max(Number(team.minPeople || 2), 1);
    const paidPeople = Math.max(Number(team.paidPeople || 0), 0);
    return {
      teamNo: String(team.teamNo || ""),
      title: String(team.title || groupBuy.title || "拼团活动"),
      teamStatus: String(team.teamStatus || "forming"),
      minPeople,
      paidPeople,
      remainingPeople: Math.max(minPeople - paidPeople, 0),
      endsAt: groupBuy.endsAt || null
    };
  }

  private publicUserOrderItem(item: MallOrderItem & { review?: MallReview | null }) {
    return {
      id: item.id,
      merchant: this.publicMerchantSummary(item.merchant),
      product: item.product ? { id: item.product.id, title: item.product.title, coverUrl: item.product.coverUrl } : null,
      sku: item.sku ? { id: item.sku.id, name: item.sku.name, skuCode: item.sku.skuCode } : null,
      productTitle: item.productTitle,
      skuName: item.skuName,
      coverUrl: item.coverUrl,
      price: item.price,
      quantity: item.quantity,
      totalAmount: item.totalAmount,
      productSnapshot: item.productSnapshot,
      skuSnapshot: item.skuSnapshot,
      review: this.publicUserReview(item.review || null),
      createdAt: item.createdAt
    };
  }

  private publicUserReview(review?: MallReview | null) {
    if (!review) return null;
    return {
      id: review.id,
      merchant: this.publicMerchantSummary(review.merchant),
      product: review.product ? { id: review.product.id, title: review.product.title, coverUrl: review.product.coverUrl } : null,
      sku: review.sku ? { id: review.sku.id, name: review.sku.name, skuCode: review.sku.skuCode } : null,
      orderItemId: review.orderItem?.id || null,
      rating: review.rating,
      content: review.content,
      images: Array.isArray(review.images) ? review.images : [],
      appendContent: review.appendContent,
      appendImages: Array.isArray(review.appendImages) ? review.appendImages : [],
      appendedAt: review.appendedAt,
      appendStatus: review.appendStatus,
      appendReviewRemark: review.appendReviewRemark,
      appendReviewedAt: review.appendReviewedAt,
      status: review.status,
      merchantReply: review.merchantReply,
      repliedAt: review.repliedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };
  }

  private publicFavorite(row: MallFavorite) {
    return {
      id: row.id,
      tenant: this.publicTenantSummary(row.tenant),
      merchant: this.publicMerchantSummary(row.merchant || row.product?.merchant),
      product: this.publicProduct(row.product, []),
      createdAt: row.createdAt
    };
  }

  private publicBrowseHistory(row: MallBrowseHistory) {
    return {
      id: row.id,
      tenant: this.publicTenantSummary(row.tenant),
      merchant: this.publicMerchantSummary(row.merchant || row.product?.merchant),
      product: this.publicProduct(row.product, []),
      viewCount: row.viewCount,
      lastViewedAt: row.lastViewedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicAddress(row: MallAddress) {
    return {
      id: row.id,
      receiverName: row.receiverName,
      receiverPhone: row.receiverPhone,
      province: row.province,
      city: row.city,
      district: row.district,
      detail: row.detail,
      isDefault: row.isDefault,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicUserRefund(refund?: MallRefund | null, paymentMethod?: string | null) {
    if (!refund) return null;
    const detail = refund as MallRefund & { items?: MallRefundItem[]; messages?: MallRefundMessage[]; exchangeShipment?: MallShipment | null };
    return {
      id: refund.id,
      refundNo: refund.refundNo,
      type: refund.type,
      amount: refund.amount,
      status: refund.status,
      reason: refund.reason,
      images: Array.isArray(refund.images) ? refund.images : [],
      items: (detail.items || []).map((item) => ({ id: item.id, orderItemId: item.orderItem.id, requestedQuantity: item.requestedQuantity, approvedQuantity: item.approvedQuantity, receivedQuantity: item.receivedQuantity, refundableAmount: fenToYuan(item.refundableAmountFen), refundedAmount: fenToYuan(item.refundedAmountFen), itemSnapshot: item.itemSnapshot })),
      messages: (detail.messages || []).map((message) => ({ id: message.id, actorType: message.actorType, actorName: message.actorName, messageType: message.messageType, content: message.content, images: message.images || [], detail: message.detail, createdAt: message.createdAt })),
      returnAddressSnapshot: refund.returnAddressSnapshot,
      returnExpressCompany: refund.returnExpressCompany,
      returnExpressNo: refund.returnExpressNo,
      returnRemark: refund.returnRemark,
      returnedAt: refund.returnedAt,
      merchantReceivedAt: refund.merchantReceivedAt,
      responsibility: refund.responsibility,
      platformInterventionRequested: refund.platformInterventionRequested,
      interventionAt: refund.interventionAt,
      responseDeadlineAt: refund.responseDeadlineAt,
      exchangeShipment: detail.exchangeShipment ? { id: detail.exchangeShipment.id, shipmentNo: detail.exchangeShipment.shipmentNo, expressCompany: detail.exchangeShipment.expressCompany, expressNo: detail.exchangeShipment.expressNo, status: detail.exchangeShipment.status, shippedAt: detail.exchangeShipment.shippedAt, deliveredAt: detail.exchangeShipment.deliveredAt } : null,
      userReviewRemark: refund.status === "rejected" ? refund.reviewRemark : null,
      completedAt: refund.completedAt,
      refundChannelText: this.publicUserRefundChannelText(paymentMethod),
      refundProgressText: this.publicUserRefundProgressText(refund),
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt
    };
  }

  private publicUserRefundChannelText(paymentMethod?: string | null) {
    if (paymentMethod === PaymentMethod.Wechat) return "微信原路退款";
    if (paymentMethod === PaymentMethod.Balance) return "余额退回";
    if (paymentMethod === PaymentMethod.Offline) return "线下退款";
    return "退款处理";
  }

  private publicUserRefundProgressText(refund: MallRefund) {
    if (refund.status === "pending") return "待后台审核";
    if (refund.status === "awaiting_buyer_return") return "商家已同意，请寄回商品";
    if (refund.status === "returning") return "退货运输中，等待商家收货";
    if (refund.status === "awaiting_merchant_receipt") return "等待商家确认退货";
    if (refund.status === "awaiting_exchange_shipment") return "商家已收货，等待寄出换货商品";
    if (refund.status === "exchange_shipped") return "换货商品已寄出";
    if (refund.status === "platform_intervening") return "平台介入处理中";
    if (refund.status === "cancelled") return "售后已取消";
    if (refund.status === "rejected") return "售后已拒绝";
    if (refund.status === "failed") return "退款异常，后台正在处理";
    if (refund.status === "approved") return "退款已完成";
    if (refund.status === "processing") {
      const providerStatus = String(refund.providerRefundStatus || "").toLowerCase();
      if (["success", "succeeded", "sandbox_success", "manual_success"].includes(providerStatus)) return "退款已完成";
      if (["failed", "fail", "closed"].includes(providerStatus)) return "退款异常，后台正在处理";
      return refund.providerRefundNo ? "已提交支付渠道，等待到账" : "退款处理中";
    }
    return "退款处理中";
  }

  private async publicUserRefundDetails(refund: MallRefund, paymentMethod?: string | null) {
    await this.hydrateMallRefunds([refund]);
    return this.publicUserRefund(refund, paymentMethod);
  }

  private async publicMallRefundDetails(refund: MallRefund) {
    await this.hydrateMallRefunds([refund]);
    return this.publicMallRefund(refund);
  }

  private async hydrateMallRefunds(refunds: MallRefund[]) {
    const ids = refunds.map((refund) => refund.id).filter(Boolean);
    if (!ids.length) return refunds;
    const [items, messages, exchangeShipments] = await Promise.all([
      this.refundItems.find({ where: { refund: { id: In(ids) } }, relations: ["refund", "orderItem"], loadEagerRelations: false }),
      this.refundMessages.find({ where: { refund: { id: In(ids) } }, relations: ["refund"], loadEagerRelations: false, order: { createdAt: "ASC", id: "ASC" } }),
      this.shipments.find({ where: { refund: { id: In(ids) }, shipmentType: "exchange" }, relations: ["refund"], loadEagerRelations: false, order: { shippedAt: "DESC" } })
    ]);
    for (const refund of refunds) {
      Object.assign(refund, {
        items: items.filter((item) => item.refund.id === refund.id),
        messages: messages.filter((message) => message.refund.id === refund.id),
        exchangeShipment: exchangeShipments.find((shipment) => shipment.refund?.id === refund.id) || null
      });
    }
    return refunds;
  }

  private publicCheckoutGroup(checkoutGroup: MallCheckoutGroup, orders: MallOrderPublicResult[]): MallCheckoutGroupResult {
    return {
      id: checkoutGroup.id,
      groupNo: checkoutGroup.groupNo,
      amount: checkoutGroup.amount,
      goodsAmount: checkoutGroup.goodsAmount,
      discountAmount: checkoutGroup.discountAmount,
      freightAmount: checkoutGroup.freightAmount,
      allocationSnapshot: checkoutGroup.allocationSnapshot,
      paymentMethod: checkoutGroup.paymentMethod,
      status: checkoutGroup.status,
      paymentTasks: Array.isArray(checkoutGroup.paymentTasks)
        ? checkoutGroup.paymentTasks.map((task) => this.publicCheckoutPaymentTask(task))
        : [],
      orders,
      createdAt: checkoutGroup.createdAt,
      updatedAt: checkoutGroup.updatedAt
    };
  }

  private publicCheckoutPaymentTask(task: Record<string, unknown>) {
    const merchant = task.merchant && typeof task.merchant === "object" && !Array.isArray(task.merchant)
      ? task.merchant as Record<string, unknown>
      : null;
    const receiver = task.receiver && typeof task.receiver === "object" && !Array.isArray(task.receiver)
      ? task.receiver as Record<string, unknown>
      : null;
    return {
      orderId: task.orderId ?? null,
      orderNo: task.orderNo ?? null,
      merchantId: task.merchantId ?? null,
      merchantName: task.merchantName ?? null,
      merchant: merchant ? {
        id: merchant.id ?? null,
        code: merchant.code ?? null,
        name: merchant.name ?? null,
        ownerType: merchant.ownerType ?? null
      } : null,
      receiverText: receiver?.text || null,
      paymentMethod: task.paymentMethod ?? null,
      paymentMethodText: task.paymentMethodText ?? null,
      collectionModeText: task.collectionModeText ?? null,
      paymentRouteText: task.paymentRouteText ?? null,
      amount: task.amount ?? null,
      status: task.status ?? null,
      statusText: task.statusText ?? null,
      paymentReady: task.paymentReady === true,
      payableOnline: task.payableOnline === true,
      manualConfirmationRequired: task.manualConfirmationRequired === true,
      canCombinePayment: task.canCombinePayment === true,
      requiresSeparatePayment: task.requiresSeparatePayment === true,
      combineBlockedReason: task.combineBlockedReason || "",
      disabledReason: task.disabledReason || "",
      nextAction: task.nextAction || ""
    };
  }

  private async recordMallOrderEvent(manager: Pick<DataSource["manager"], "getRepository"> | null, order: MallOrder, input: { eventKey: string; eventType: string; fromStatus?: string | null; toStatus: string; source: MallOrderEvent["source"]; operator?: string | null; remark?: string | null; detail?: Record<string, unknown> | null; occurredAt?: Date }) {
    const repo = manager ? manager.getRepository(MallOrderEvent) : this.orderEvents;
    const existing = await repo.findOne({ where: { order: { id: order.id }, eventKey: input.eventKey }, loadEagerRelations: false });
    if (existing) return existing;
    return repo.save(repo.create({ tenant: order.tenant, merchant: order.merchant || null, order, eventKey: input.eventKey, eventType: input.eventType, fromStatus: input.fromStatus || null, toStatus: input.toStatus, source: input.source, operator: input.operator || null, remark: input.remark || null, detail: input.detail || null, occurredAt: input.occurredAt || new Date() }));
  }

  private async mallOrderLogistics(order: MallOrder) {
    const events = await this.orderEvents.find({ where: { order: { id: order.id }, tenant: { id: order.tenant.id } }, order: { occurredAt: "ASC", id: "ASC" } });
    const shipments = await this.shipments.find({ where: { order: { id: order.id } }, order: { shippedAt: "ASC", id: "ASC" } });
    const packageItems = shipments.length ? await this.shipmentItems.find({ where: { shipment: { id: In(shipments.map((shipment) => shipment.id)) } }, relations: ["shipment", "orderItem"], loadEagerRelations: false }) : [];
    const trackingEvents = shipments.length ? await this.shipmentTrackingEvents.find({ where: { shipment: { id: In(shipments.map((shipment) => shipment.id)) } }, relations: ["shipment"], loadEagerRelations: false, order: { eventAt: "ASC", id: "ASC" } }) : [];
    const companyWhere = order.expressCompany
      ? order.merchant
        ? [
            { tenant: { id: order.tenant.id }, merchant: { id: order.merchant.id }, name: order.expressCompany, enabled: true },
            { tenant: { id: order.tenant.id }, merchant: { id: order.merchant.id }, code: order.expressCompany, enabled: true }
          ]
        : [
            { tenant: { id: order.tenant.id }, merchant: IsNull(), name: order.expressCompany, enabled: true },
            { tenant: { id: order.tenant.id }, merchant: IsNull(), code: order.expressCompany, enabled: true }
          ]
      : [];
    const company = order.expressCompany
      ? await this.logisticsCompanies.findOne({
          where: companyWhere
        })
      : null;
    const timeline = [
      { key: "created", label: "订单创建", active: true, time: order.createdAt, tip: "用户已提交订单" },
      { key: "paid", label: "收款确认", active: ["paid", "shipped", "completed", "refund_pending", "refunded"].includes(order.status) || Boolean(order.paidAt), time: order.paidAt, tip: order.paymentMethod === PaymentMethod.Offline ? "等待财务确认线下收款" : "等待用户完成支付" },
      { key: "shipped", label: "商家发货", active: ["shipped", "completed"].includes(order.status) || Boolean(order.shippedAt), time: order.shippedAt, tip: "等待商家填写物流公司和单号" },
      { key: "completed", label: "确认收货", active: order.status === "completed" || Boolean(order.completedAt), time: order.completedAt, tip: "用户收到商品后可确认收货" }
    ];
    if (order.status === "refund_pending" || order.status === "refunded") {
      timeline.push({ key: "refund", label: order.status === "refunded" ? "售后完成" : "售后处理中", active: true, time: order.updatedAt, tip: "售后结果会同步到订单和财务流水" });
    }
    if (order.status === "closed") {
      timeline.push({ key: "closed", label: "订单关闭", active: true, time: order.closedAt || order.updatedAt, tip: order.closeReason || "订单已关闭" });
    }
    const trackingStatus = order.status === "closed"
      ? "closed"
      : order.status === "refunded"
        ? "refunded"
        : order.status === "completed"
          ? "completed"
          : order.status === "shipped"
            ? "shipped"
            : "not_shipped";
    return {
      orderId: order.id,
      orderNo: order.orderNo,
      status: order.status,
      statusText: this.mallOrderStatusText(order.status),
      fulfillmentStatus: order.fulfillmentStatus,
      totalQuantity: order.totalQuantity,
      shippedQuantity: order.shippedQuantity,
      expressCompany: order.expressCompany,
      expressNo: order.expressNo,
      servicePhone: company?.servicePhone || null,
      trackingUrl: company?.trackingUrl || null,
      provider: "manual",
      trackingStatus,
      notice: "订单状态历史由服务端事件账本记录；物流承运轨迹当前使用后台单号和查询网址，后续可接入快递鸟/快递100自动订阅。",
      addressSnapshot: order.addressSnapshot,
      timeline,
      shipments: shipments.map((shipment) => ({ id: shipment.id, shipmentNo: shipment.shipmentNo, shipmentType: shipment.shipmentType, refundId: shipment.refund?.id || null, expressCompany: shipment.expressCompany, expressNo: shipment.expressNo, status: shipment.status, remark: shipment.remark, shippedAt: shipment.shippedAt, deliveredAt: shipment.deliveredAt, items: packageItems.filter((row) => row.shipment.id === shipment.id).map((row) => ({ orderItemId: row.orderItem.id, quantity: row.quantity, itemSnapshot: row.itemSnapshot })), trackingEvents: trackingEvents.filter((row) => row.shipment.id === shipment.id).map((row) => ({ id: row.id, status: row.status, description: row.description, location: row.location, source: row.source, eventAt: row.eventAt })) })),
      events: events.map((event) => ({ id: event.id, eventType: event.eventType, fromStatus: event.fromStatus, toStatus: event.toStatus, source: event.source, operator: event.operator, remark: event.remark, detail: event.detail, occurredAt: event.occurredAt }))
    };
  }

  private publicProduct(product: MallProduct, skus: MallSku[]) {
    const stock = skus.reduce((sum, sku) => sum + Math.max(Number(sku.stock || 0) - Number(sku.lockedStock || 0), 0), 0);
    return {
      id: product.id,
      tenant: this.publicTenantSummary(product.tenant),
      merchant: this.publicMerchantSummary(product.merchant),
      category: this.publicCategory(product.category),
      platformCategory: this.publicCategory(product.platformCategory),
      brand: product.brand ? { id: product.brand.id, code: product.brand.code, name: product.brand.name, logoUrl: product.brand.logoUrl } : null,
      productCode: product.productCode,
      title: product.title,
      coverUrl: product.coverUrl,
      description: product.description,
      brandName: product.brandName,
      galleryUrls: product.galleryUrls || [],
      detailBlocks: product.detailBlocks || [],
      attributes: product.attributes || {},
      price: product.price,
      originalPrice: product.originalPrice,
      status: product.status,
      featured: product.featured,
      sortOrder: product.sortOrder,
      deliveryNote: product.deliveryNote,
      afterSaleNote: product.afterSaleNote,
      contentVersion: product.contentVersion,
      skus: skus.map((sku) => this.publicSku(sku)),
      stock,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }

  private publicTenantSummary(tenant?: Tenant | null) {
    if (!tenant) return null;
    return { id: tenant.id, code: tenant.code, name: tenant.name, region: tenant.region || null };
  }

  private publicMerchantSummary(merchant?: MallMerchant | null, extra: Record<string, unknown> = {}) {
    if (!merchant) return null;
    return {
      id: merchant.id,
      code: merchant.code,
      name: merchant.name,
      ownerType: merchant.ownerType,
      region: merchant.region,
      logoUrl: merchant.logoUrl,
      notice: merchant.notice,
      ...extra
    };
  }

  private publicCategory(category?: MallCategory | null) {
    if (!category) return null;
    return {
      id: category.id,
      tenant: this.publicTenantSummary(category.tenant),
      merchant: this.publicMerchantSummary(category.merchant),
      scope: category.scope,
      code: category.code,
      parent: category.parent ? { id: category.parent.id, code: category.parent.code, name: category.parent.name } : null,
      name: category.name,
      iconUrl: category.iconUrl,
      sortOrder: category.sortOrder,
      enabled: category.enabled,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }

  private publicSku(sku?: MallSku | null) {
    if (!sku) return null;
    const availableStock = Math.max(Number(sku.stock || 0) - Number(sku.lockedStock || 0), 0);
    return {
      id: sku.id,
      merchant: this.publicMerchantSummary(sku.merchant),
      name: sku.name,
      skuCode: sku.skuCode,
      barcode: sku.barcode,
      attributes: sku.attributes || {},
      weightGrams: sku.weightGrams,
      price: sku.price,
      originalPrice: sku.originalPrice,
      stock: availableStock,
      availableStock,
      sortOrder: sku.sortOrder,
      enabled: sku.enabled,
      createdAt: sku.createdAt,
      updatedAt: sku.updatedAt
    };
  }

  private publicLogisticsCompany(row: MallLogisticsCompany) {
    return {
      id: row.id,
      merchant: this.publicMerchantSummary(row.merchant),
      name: row.name,
      code: row.code,
      servicePhone: row.servicePhone,
      trackingUrl: row.trackingUrl,
      sortOrder: row.sortOrder
    };
  }

  private publicReview(row: MallReview) {
    const displayName = this.maskMallGroupBuyUser(row.user);
    const append = publicMallReviewAppend(row);
    return {
      id: row.id,
      user: { nickname: displayName },
      merchant: this.publicMerchantSummary(row.merchant),
      product: row.product ? { id: row.product.id, title: row.product.title } : null,
      sku: row.sku ? { id: row.sku.id, name: row.sku.name } : null,
      rating: row.rating,
      content: row.content,
      images: Array.isArray(row.images) ? row.images : [],
      ...append,
      merchantReply: row.merchantReply,
      repliedAt: row.repliedAt,
      createdAt: row.createdAt
    };
  }

  private adminCoupon(coupon: MallCoupon) {
    const now = new Date();
    const usageLimit = Number(coupon.usageLimit || 0);
    const perUserLimit = Number(coupon.perUserLimit || 0);
    const usedCount = Number(coupon.usedCount || 0);
    const issuanceLimit = Number(coupon.issuanceLimit || 0);
    const claimedCount = Number(coupon.claimedCount || 0);
    const runtimeStatus = !coupon.enabled
      ? "disabled"
      : coupon.startsAt && coupon.startsAt > now
        ? "not_started"
        : coupon.endsAt && coupon.endsAt < now
          ? "expired"
          : usageLimit > 0 && usedCount >= usageLimit
            ? "exhausted"
            : "active";
    return {
      id: coupon.id,
      tenant: this.publicTenantSummary(coupon.tenant),
      merchant: this.publicMerchantSummary(coupon.merchant),
      code: coupon.code,
      name: coupon.name,
      minAmount: coupon.minAmount,
      discountAmount: coupon.discountAmount,
      scope: coupon.scope,
      issuerScope: coupon.issuerScope,
      scopeCategoryId: coupon.scopeCategoryId,
      scopeProductId: coupon.scopeProductId,
      usageLimit: coupon.usageLimit,
      issuanceLimit,
      claimedCount,
      refundReleasePolicy: coupon.refundReleasePolicy,
      perUserLimit,
      usedCount: coupon.usedCount,
      enabled: coupon.enabled,
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,
      runtimeStatus,
      remainingCount: usageLimit > 0 ? Math.max(usageLimit - usedCount, 0) : null,
      remainingClaimCount: issuanceLimit > 0 ? Math.max(issuanceLimit - claimedCount, 0) : null,
      claimRuntimeStatus: issuanceLimit > 0 && claimedCount >= issuanceLimit ? "exhausted" : "active",
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt
    };
  }

  private publicFlashSale(row: MallFlashSale, includeInternalStock = false) {
    const now = new Date();
    const availableStock = this.availableFlashSaleStock(row);
    const runtimeStatus = row.status !== "active"
      ? row.status
      : row.startsAt > now
        ? "not_started"
        : row.endsAt < now
          ? "ended"
          : availableStock <= 0
            ? "sold_out"
            : "active";
    return {
      id: row.id,
      tenant: this.publicTenantSummary(row.tenant),
      merchant: this.publicMerchantSummary(row.merchant),
      product: this.publicProduct(row.product, row.sku ? [row.sku] : []),
      sku: this.publicSku(row.sku),
      title: row.title,
      salePrice: row.salePrice,
      perUserLimit: row.perUserLimit,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      availableStock,
      runtimeStatus,
      originalPrice: row.sku?.price || row.product?.price || "0.00",
      discountAmount: Math.max(Number(row.sku?.price || row.product?.price || 0) - Number(row.salePrice || 0), 0).toFixed(2),
      ...(includeInternalStock ? { saleStock: row.saleStock, lockedStock: row.lockedStock, soldStock: row.soldStock, status: row.status, sortOrder: row.sortOrder, createdAt: row.createdAt, updatedAt: row.updatedAt } : {})
    };
  }

  private availableFlashSaleStock(row: MallFlashSale) {
    return Math.max(Number(row.saleStock || 0) - Number(row.lockedStock || 0) - Number(row.soldStock || 0), 0);
  }

  private publicGroupBuy(row: MallGroupBuy, includeInternalStock = false) {
    const now = new Date();
    const availableStock = this.availableGroupBuyStock(row);
    const runtimeStatus = row.status !== "active"
      ? row.status
      : row.startsAt > now
        ? "not_started"
        : row.endsAt < now
          ? "ended"
          : availableStock <= 0
            ? "sold_out"
            : "active";
    return {
      id: row.id,
      tenant: this.publicTenantSummary(row.tenant),
      merchant: this.publicMerchantSummary(row.merchant),
      product: this.publicProduct(row.product, row.sku ? [row.sku] : []),
      sku: this.publicSku(row.sku),
      title: row.title,
      groupPrice: row.groupPrice,
      minPeople: row.minPeople,
      perUserLimit: row.perUserLimit,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      availableStock,
      runtimeStatus,
      originalPrice: row.sku?.price || row.product?.price || "0.00",
      discountAmount: Math.max(Number(row.sku?.price || row.product?.price || 0) - Number(row.groupPrice || 0), 0).toFixed(2),
      ...(includeInternalStock ? { groupStock: row.groupStock, lockedStock: row.lockedStock, soldStock: row.soldStock, status: row.status, sortOrder: row.sortOrder, createdAt: row.createdAt, updatedAt: row.updatedAt } : {})
    };
  }

  private availableGroupBuyStock(row: MallGroupBuy) {
    return Math.max(Number(row.groupStock || 0) - Number(row.lockedStock || 0) - Number(row.soldStock || 0), 0);
  }

  private assertMarketingActivityStockWithinSku(sku: MallSku, activityStock: number, soldStock: number, lockedStock: number, label: string) {
    const normalizedActivityStock = Math.max(Math.trunc(Number(activityStock || 0)), 0);
    const normalizedSoldStock = Math.max(Math.trunc(Number(soldStock || 0)), 0);
    const normalizedLockedStock = Math.max(Math.trunc(Number(lockedStock || 0)), 0);
    const minStock = normalizedSoldStock + normalizedLockedStock;
    if (normalizedActivityStock < minStock) throw new BadRequestException(`${label}库存不能小于已售 ${normalizedSoldStock} + 已锁 ${normalizedLockedStock}`);
    const skuAvailableStock = Math.max(Number(sku.stock || 0) - Number(sku.lockedStock || 0), 0);
    const remainingActivityStock = normalizedActivityStock - minStock;
    if (remainingActivityStock > skuAvailableStock) throw new BadRequestException(`${label}剩余可售库存不能超过商品规格当前可售库存 ${skuAvailableStock}`);
  }

  private async assertFlashSaleTimeNotOverlapping(merchant: MallMerchant, sku: MallSku, startsAt: Date, endsAt: Date, currentId?: number) {
    const builder = this.flashSales
      .createQueryBuilder("sale")
      .leftJoinAndSelect("sale.sku", "sku")
      .where("sale.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("sale.skuId = :skuId", { skuId: sku.id })
      .andWhere("sale.status = :status", { status: "active" })
      .andWhere("sale.startsAt < :endsAt AND sale.endsAt > :startsAt", { startsAt, endsAt })
      .orderBy("sale.startsAt", "ASC");
    if (currentId) builder.andWhere("sale.id <> :currentId", { currentId });
    const existing = await builder.getOne();
    if (existing) throw new BadRequestException(`同一商品规格在该时间段已有启用秒杀「${existing.title}」（${this.formatMallActivityTime(existing.startsAt)} 至 ${this.formatMallActivityTime(existing.endsAt)}），请调整时间或停用旧活动。`);
  }

  private async assertFlashSaleTitleAvailable(merchant: MallMerchant, sku: MallSku, title: string, currentId?: number) {
    const builder = this.flashSales
      .createQueryBuilder("sale")
      .where("sale.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("sale.skuId = :skuId", { skuId: sku.id })
      .andWhere("sale.title = :title", { title });
    if (currentId) builder.andWhere("sale.id <> :currentId", { currentId });
    const existing = await builder.getOne();
    if (existing) throw new BadRequestException(`同一商品规格下已存在同名秒杀「${title}」，请使用包含日期或批次的唯一标题，避免订单库存追踪串活动。`);
  }

  private async assertGroupBuyTimeNotOverlapping(merchant: MallMerchant, sku: MallSku, startsAt: Date, endsAt: Date, currentId?: number) {
    const builder = this.groupBuys
      .createQueryBuilder("groupBuy")
      .leftJoinAndSelect("groupBuy.sku", "sku")
      .where("groupBuy.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("groupBuy.skuId = :skuId", { skuId: sku.id })
      .andWhere("groupBuy.status = :status", { status: "active" })
      .andWhere("groupBuy.startsAt < :endsAt AND groupBuy.endsAt > :startsAt", { startsAt, endsAt })
      .orderBy("groupBuy.startsAt", "ASC");
    if (currentId) builder.andWhere("groupBuy.id <> :currentId", { currentId });
    const existing = await builder.getOne();
    if (existing) throw new BadRequestException(`同一商品规格在该时间段已有启用拼团「${existing.title}」（${this.formatMallActivityTime(existing.startsAt)} 至 ${this.formatMallActivityTime(existing.endsAt)}），请调整时间或停用旧活动。`);
  }

  private async assertGroupBuyTitleAvailable(merchant: MallMerchant, sku: MallSku, title: string, currentId?: number) {
    const builder = this.groupBuys
      .createQueryBuilder("groupBuy")
      .where("groupBuy.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("groupBuy.skuId = :skuId", { skuId: sku.id })
      .andWhere("groupBuy.title = :title", { title });
    if (currentId) builder.andWhere("groupBuy.id <> :currentId", { currentId });
    const existing = await builder.getOne();
    if (existing) throw new BadRequestException(`同一商品规格下已存在同名拼团「${title}」，请使用包含日期或批次的唯一标题，避免订单库存追踪串活动。`);
  }

  private formatMallActivityTime(value: Date | null | undefined) {
    return value ? value.toLocaleString("zh-CN", { hour12: false }) : "-";
  }

  private async resolveActiveFlashSale(manager: Pick<DataSource["manager"], "getRepository"> | undefined, tenant: Tenant, flashSaleId: unknown, sku: MallSku, user?: User, quantity = 1) {
    const repo = manager ? manager.getRepository(MallFlashSale) : this.flashSales;
    const options: any = {
      where: { id: Number(flashSaleId || 0), tenant: { id: tenant.id } },
      relations: ["tenant", "merchant", "product", "sku"],
      loadEagerRelations: false
    };
    if (manager) options.lock = { mode: "pessimistic_write" };
    const sale = await repo.findOne(options);
    if (!sale || sale.sku.id !== sku.id || sale.product.id !== sku.product.id) throw new BadRequestException("秒杀活动不存在或商品不匹配");
    const skuMerchantId = sku.merchant?.id || sku.product?.merchant?.id || null;
    if (!sale.merchant || !skuMerchantId || sale.merchant.id !== skuMerchantId) throw new BadRequestException("秒杀活动所属店铺与商品店铺不一致，请联系店铺运营检查活动配置");
    const now = new Date();
    if (sale.status !== "active") throw new BadRequestException("秒杀活动未启用");
    if (sale.startsAt > now) throw new BadRequestException("秒杀活动尚未开始");
    if (sale.endsAt < now) throw new BadRequestException("秒杀活动已结束");
    if (this.availableFlashSaleStock(sale) < quantity) throw new BadRequestException("秒杀库存不足");
    if (user && sale.perUserLimit > 0) {
      const purchased = await this.orderItems.createQueryBuilder("item")
        .leftJoin("item.order", "order")
        .where("order.userId = :userId", { userId: user.id })
        .andWhere("order.tenantId = :tenantId", { tenantId: tenant.id })
        .andWhere("item.skuId = :skuId", { skuId: sku.id })
        .andWhere("(item.flashSaleId = :flashSaleId OR (item.flashSaleId IS NULL AND item.skuName LIKE :mark ESCAPE '!'))", { flashSaleId: sale.id, mark: `%（秒杀：${this.escapeSqlLike(sale.title)}）` })
        .andWhere("order.status IN (:...statuses)", { statuses: ["pending_payment", "pending_confirm", "paid", "shipped", "completed", "refund_pending"] })
        .select("COALESCE(SUM(item.quantity), 0)", "quantity")
        .getRawOne<{ quantity: string }>();
      if (Number(purchased?.quantity || 0) + quantity > sale.perUserLimit) throw new BadRequestException("已达到该秒杀活动每人限购数量");
    }
    return sale;
  }

  private async flashSaleForOrderItem(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem) {
    const repo = manager.getRepository(MallFlashSale);
    if (item.flashSale?.id) {
      const sale = await repo.findOne({ where: { id: item.flashSale.id }, relations: ["tenant", "merchant", "sku"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!sale) throw new BadRequestException(`秒杀活动库存追踪找不到活动 #${item.flashSale.id}，请先联系平台运营修复活动数据后再处理订单。`);
      if (sale.tenant.id !== order.tenant.id || sale.sku.id !== item.sku.id || (order.merchant?.id && sale.merchant?.id !== order.merchant.id)) throw new BadRequestException("秒杀活动库存追踪活动归属与订单不一致，请联系平台运营核对活动、订单和店铺数据。");
      return sale;
    }
    const match = String(item.skuName || "").match(/（秒杀：(.+?)）$/);
    if (!match?.[1]) return null;
    const where: any = { tenant: { id: order.tenant.id }, sku: { id: item.sku.id }, title: match[1] };
    if (order.merchant?.id) where.merchant = { id: order.merchant.id };
    const rows = await repo.find({ where, order: { id: "ASC" }, take: 2, loadEagerRelations: false });
    if (!rows.length) throw new BadRequestException(`秒杀活动库存追踪找不到活动「${match[1]}」，请先联系平台运营修复活动数据后再处理订单。`);
    if (rows.length > 1) throw new BadRequestException(`秒杀活动库存追踪存在同名歧义「${match[1]}」，请先联系平台运营清理历史同名活动后再处理订单。`);
    return repo.findOne({ where: { id: rows[0].id }, relations: ["tenant", "merchant", "sku"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
  }

  private async deductFlashSaleStock(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem) {
    const sale = await this.flashSaleForOrderItem(manager, order, item);
    if (!sale) return;
    const beforeLocked = Number(sale.lockedStock || 0);
    const beforeSold = Number(sale.soldStock || 0);
    if (beforeLocked < item.quantity || beforeSold + item.quantity > sale.saleStock) throw new BadRequestException(`秒杀活动 #${sale.id} 库存不足，支付扣减已中止。`);
    sale.lockedStock = beforeLocked - item.quantity;
    sale.soldStock = beforeSold + item.quantity;
    await manager.getRepository(MallFlashSale).save(sale);
    await manager.getRepository(MallInventoryLog).save(manager.getRepository(MallInventoryLog).create({ tenant: order.tenant, merchant: order.merchant || sale.merchant, sku: item.sku, order, type: "deduct", operationKey: `order-item:${item.id}:flash:${sale.id}:deduct`, sourceType: "flash_sale", sourceId: String(sale.id), quantity: item.quantity, stockBefore: sale.saleStock - beforeSold, stockAfter: sale.saleStock - sale.soldStock, lockedBefore: beforeLocked, lockedAfter: sale.lockedStock, remark: "商城秒杀支付确认扣库存" }));
  }

  private async releaseFlashSaleStock(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem, reason: string) {
    const sale = await this.flashSaleForOrderItem(manager, order, item);
    if (!sale) return;
    sale.lockedStock = Math.max(Number(sale.lockedStock || 0) - item.quantity, 0);
    await manager.getRepository(MallFlashSale).save(sale);
    await manager.getRepository(MallInventoryLog).save(manager.getRepository(MallInventoryLog).create({ tenant: order.tenant, merchant: order.merchant || sale.merchant, sku: item.sku, order, type: "release", operationKey: `order-item:${item.id}:flash:${sale.id}:release`, sourceType: "flash_sale", sourceId: String(sale.id), quantity: item.quantity, stockBefore: sale.saleStock - sale.soldStock, stockAfter: sale.saleStock - sale.soldStock, lockedBefore: sale.lockedStock + item.quantity, lockedAfter: sale.lockedStock, remark: `商城秒杀释放库存：${reason}` }));
  }

  private async returnFlashSaleStock(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem) {
    const sale = await this.flashSaleForOrderItem(manager, order, item);
    if (!sale) return;
    const beforeSold = Number(sale.soldStock || 0);
    sale.soldStock = Math.max(beforeSold - item.quantity, 0);
    await manager.getRepository(MallFlashSale).save(sale);
    await manager.getRepository(MallInventoryLog).save(manager.getRepository(MallInventoryLog).create({ tenant: order.tenant, merchant: order.merchant || sale.merchant, sku: item.sku, order, type: "return", operationKey: `order-item:${item.id}:flash:${sale.id}:return`, sourceType: "flash_sale", sourceId: String(sale.id), quantity: item.quantity, stockBefore: sale.saleStock - beforeSold, stockAfter: sale.saleStock - sale.soldStock, lockedBefore: sale.lockedStock, lockedAfter: sale.lockedStock, remark: "商城秒杀退款退回库存" }));
  }

  private async resolveActiveGroupBuy(manager: Pick<DataSource["manager"], "getRepository"> | undefined, tenant: Tenant, groupBuyId: unknown, sku: MallSku, user?: User, quantity = 1) {
    const repo = manager ? manager.getRepository(MallGroupBuy) : this.groupBuys;
    const options: any = {
      where: { id: Number(groupBuyId || 0), tenant: { id: tenant.id } },
      relations: ["tenant", "merchant", "product", "sku"],
      loadEagerRelations: false
    };
    if (manager) options.lock = { mode: "pessimistic_write" };
    const groupBuy = await repo.findOne(options);
    if (!groupBuy || groupBuy.sku.id !== sku.id || groupBuy.product.id !== sku.product.id) throw new BadRequestException("拼团活动不存在或商品不匹配");
    const skuMerchantId = sku.merchant?.id || sku.product?.merchant?.id || null;
    if (!groupBuy.merchant || !skuMerchantId || groupBuy.merchant.id !== skuMerchantId) throw new BadRequestException("拼团活动所属店铺与商品店铺不一致，请联系店铺运营检查活动配置");
    const now = new Date();
    if (groupBuy.status !== "active") throw new BadRequestException("拼团活动未启用");
    if (groupBuy.startsAt > now) throw new BadRequestException("拼团活动尚未开始");
    if (groupBuy.endsAt < now) throw new BadRequestException("拼团活动已结束");
    const quantityError = mallGroupBuyJoinError({ quantity, userAlreadyJoined: false, occupiedPeople: 0, minPeople: Math.max(Number(groupBuy.minPeople || 2), 2) });
    if (quantityError) throw new BadRequestException(quantityError);
    if (this.availableGroupBuyStock(groupBuy) < quantity) throw new BadRequestException("拼团库存不足");
    if (user && groupBuy.perUserLimit > 0) {
      const purchased = await this.orderItems.createQueryBuilder("item")
        .leftJoin("item.order", "order")
        .where("order.userId = :userId", { userId: user.id })
        .andWhere("order.tenantId = :tenantId", { tenantId: tenant.id })
        .andWhere("item.skuId = :skuId", { skuId: sku.id })
        .andWhere("(item.groupBuyId = :groupBuyId OR (item.groupBuyId IS NULL AND item.skuName LIKE :mark ESCAPE '!'))", { groupBuyId: groupBuy.id, mark: `%（拼团：${this.escapeSqlLike(groupBuy.title)}）` })
        .andWhere("order.status IN (:...statuses)", { statuses: ["pending_payment", "pending_confirm", "paid", "shipped", "completed", "refund_pending"] })
        .select("COALESCE(SUM(item.quantity), 0)", "quantity")
        .getRawOne<{ quantity: string }>();
      if (Number(purchased?.quantity || 0) + quantity > groupBuy.perUserLimit) throw new BadRequestException("已达到该拼团活动每人限购数量");
    }
    return groupBuy;
  }

  private async groupBuyForOrderItem(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem) {
    const repo = manager.getRepository(MallGroupBuy);
    if (item.groupBuy?.id) {
      const groupBuy = await repo.findOne({ where: { id: item.groupBuy.id }, relations: ["tenant", "merchant", "sku"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!groupBuy) throw new BadRequestException(`拼团活动库存追踪找不到活动 #${item.groupBuy.id}，请先联系平台运营修复活动数据后再处理订单。`);
      if (groupBuy.tenant.id !== order.tenant.id || groupBuy.sku.id !== item.sku.id || (order.merchant?.id && groupBuy.merchant?.id !== order.merchant.id)) throw new BadRequestException("拼团活动库存追踪活动归属与订单不一致，请联系平台运营核对活动、订单和店铺数据。");
      return groupBuy;
    }
    const match = String(item.skuName || "").match(/（拼团：(.+?)）$/);
    if (!match?.[1]) return null;
    const where: any = { tenant: { id: order.tenant.id }, sku: { id: item.sku.id }, title: match[1] };
    if (order.merchant?.id) where.merchant = { id: order.merchant.id };
    const rows = await repo.find({ where, order: { id: "ASC" }, take: 2, loadEagerRelations: false });
    if (!rows.length) throw new BadRequestException(`拼团活动库存追踪找不到活动「${match[1]}」，请先联系平台运营修复活动数据后再处理订单。`);
    if (rows.length > 1) throw new BadRequestException(`拼团活动库存追踪存在同名歧义「${match[1]}」，请先联系平台运营清理历史同名活动后再处理订单。`);
    return repo.findOne({ where: { id: rows[0].id }, relations: ["tenant", "merchant", "sku"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
  }

  private async deductGroupBuyStock(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem) {
    const groupBuy = await this.groupBuyForOrderItem(manager, order, item);
    if (!groupBuy) return;
    const beforeLocked = Number(groupBuy.lockedStock || 0);
    const beforeSold = Number(groupBuy.soldStock || 0);
    if (beforeLocked < item.quantity || beforeSold + item.quantity > groupBuy.groupStock) throw new BadRequestException(`拼团活动 #${groupBuy.id} 库存不足，支付扣减已中止。`);
    groupBuy.lockedStock = beforeLocked - item.quantity;
    groupBuy.soldStock = beforeSold + item.quantity;
    await manager.getRepository(MallGroupBuy).save(groupBuy);
    await manager.getRepository(MallInventoryLog).save(manager.getRepository(MallInventoryLog).create({ tenant: order.tenant, merchant: order.merchant || groupBuy.merchant, sku: item.sku, order, type: "deduct", operationKey: `order-item:${item.id}:group:${groupBuy.id}:deduct`, sourceType: "group_buy", sourceId: String(groupBuy.id), quantity: item.quantity, stockBefore: groupBuy.groupStock - beforeSold, stockAfter: groupBuy.groupStock - groupBuy.soldStock, lockedBefore: beforeLocked, lockedAfter: groupBuy.lockedStock, remark: "商城拼团支付确认扣库存" }));
  }

  private async releaseGroupBuyStock(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem, reason: string) {
    const groupBuy = await this.groupBuyForOrderItem(manager, order, item);
    if (!groupBuy) return;
    groupBuy.lockedStock = Math.max(Number(groupBuy.lockedStock || 0) - item.quantity, 0);
    await manager.getRepository(MallGroupBuy).save(groupBuy);
    await manager.getRepository(MallInventoryLog).save(manager.getRepository(MallInventoryLog).create({ tenant: order.tenant, merchant: order.merchant || groupBuy.merchant, sku: item.sku, order, type: "release", operationKey: `order-item:${item.id}:group:${groupBuy.id}:release`, sourceType: "group_buy", sourceId: String(groupBuy.id), quantity: item.quantity, stockBefore: groupBuy.groupStock - groupBuy.soldStock, stockAfter: groupBuy.groupStock - groupBuy.soldStock, lockedBefore: groupBuy.lockedStock + item.quantity, lockedAfter: groupBuy.lockedStock, remark: `商城拼团释放库存：${reason}` }));
  }

  private async returnGroupBuyStock(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem) {
    const groupBuy = await this.groupBuyForOrderItem(manager, order, item);
    if (!groupBuy) return;
    const beforeSold = Number(groupBuy.soldStock || 0);
    groupBuy.soldStock = Math.max(beforeSold - item.quantity, 0);
    await manager.getRepository(MallGroupBuy).save(groupBuy);
    await manager.getRepository(MallInventoryLog).save(manager.getRepository(MallInventoryLog).create({ tenant: order.tenant, merchant: order.merchant || groupBuy.merchant, sku: item.sku, order, type: "return", operationKey: `order-item:${item.id}:group:${groupBuy.id}:return`, sourceType: "group_buy", sourceId: String(groupBuy.id), quantity: item.quantity, stockBefore: groupBuy.groupStock - beforeSold, stockAfter: groupBuy.groupStock - groupBuy.soldStock, lockedBefore: groupBuy.lockedStock, lockedAfter: groupBuy.lockedStock, remark: "商城拼团退款退回库存" }));
  }

  private async couponClaimMap(user: User, couponIds: number[]) {
    if (!couponIds.length) return new Map<number, MallCouponClaim>();
    const claims = await this.couponClaims.find({ where: { user: { id: user.id }, coupon: { id: In(couponIds) } }, relations: ["coupon"], loadEagerRelations: false });
    return new Map(claims.map((claim) => [claim.coupon.id, claim]));
  }

  private adminProduct(product: MallProduct, skus: MallSku[]) {
    const inventory = mallInventoryStockSummary(skus);
    return {
      ...this.publicProduct(product, skus),
      tenant: product.tenant ? { id: product.tenant.id, code: product.tenant.code, name: product.tenant.name, region: product.tenant.region || null } : null,
      merchant: product.merchant ? {
        ...this.publicMerchantSummary(product.merchant),
        status: product.merchant.status,
        onboardingStatus: product.merchant.onboardingStatus,
        mallEnabled: product.merchant.mallEnabled,
        productAuditRequired: product.merchant.productAuditRequired,
        paymentMode: product.merchant.paymentMode
      } : null,
      skus: skus.map((sku) => this.adminSku(sku)),
      ...inventory,
      reviewRemark: product.reviewRemark,
      submittedAt: product.submittedAt,
      reviewedAt: product.reviewedAt,
      reviewedByAdminId: product.reviewedByAdminId,
      publishedSnapshot: product.publishedSnapshot
    };
  }

  private adminSku(sku: MallSku) {
    const availableStock = Math.max(Number(sku.stock || 0) - Number(sku.lockedStock || 0), 0);
    return {
      ...this.publicSku(sku),
      stock: Number(sku.stock || 0),
      lockedStock: Number(sku.lockedStock || 0),
      availableStock
    };
  }

  private publicCoupon(coupon: MallCoupon) {
    const admin = this.adminCoupon(coupon);
    return {
      id: admin.id,
      tenant: admin.tenant,
      merchant: admin.merchant,
      code: admin.code,
      name: admin.name,
      minAmount: admin.minAmount,
      discountAmount: admin.discountAmount,
      scope: admin.scope,
      issuerScope: admin.issuerScope,
      scopeCategoryId: admin.scopeCategoryId,
      scopeProductId: admin.scopeProductId,
      perUserLimit: admin.perUserLimit,
      startsAt: admin.startsAt,
      endsAt: admin.endsAt,
      runtimeStatus: admin.runtimeStatus,
      remainingCount: admin.remainingClaimCount,
      remainingClaimCount: admin.remainingClaimCount,
      claimRuntimeStatus: admin.claimRuntimeStatus
    };
  }

  private publicCouponWithClaim(coupon: ReturnType<MallService["publicCoupon"]>, claim?: MallCouponClaim) {
    const claimedCount = Number(claim?.claimedCount || 0);
    const usedCount = Number(claim?.usedCount || 0);
    return {
      ...coupon,
      claimed: Boolean(claim),
      claimStatus: this.mallCouponClaimStatus(coupon, claimedCount, usedCount),
      claimedCount,
      userUsedCount: usedCount
    };
  }

  private publicCouponClaim(claim: MallCouponClaim) {
    const coupon = this.publicCoupon(claim.coupon);
    return {
      id: claim.id,
      tenant: this.publicTenantSummary(claim.tenant),
      merchant: this.publicMerchantSummary(claim.merchant),
      coupon: this.publicCouponWithClaim(coupon, claim),
      status: this.mallCouponClaimStatus(coupon, claim.claimedCount, claim.usedCount),
      claimedCount: claim.claimedCount,
      usedCount: claim.usedCount,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt
    };
  }

  private mallCouponClaimStatus(coupon: ReturnType<MallService["publicCoupon"]>, claimedCount: number, usedCount: number) {
    if (coupon.runtimeStatus === "expired") return "expired";
    if (coupon.runtimeStatus === "disabled") return "disabled";
    if (coupon.runtimeStatus === "not_started") return "not_started";
    if (claimedCount <= 0 && coupon.claimRuntimeStatus === "exhausted") return "claimed_out";
    const perUserLimit = Number(coupon.perUserLimit || 0);
    const usableCount = perUserLimit > 0 ? perUserLimit : Math.max(Number(claimedCount || 1), 1);
    return usedCount >= usableCount ? "used" : "available";
  }

  private async markCouponClaimUsed(manager: Pick<DataSource["manager"], "getRepository">, tenant: Tenant, merchant: MallMerchant | null, coupon: MallCoupon, user: User) {
    const repo = manager.getRepository(MallCouponClaim);
    let claim = await repo.findOne({ where: { tenant: { id: tenant.id }, coupon: { id: coupon.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
    if (!claim) {
      const claimError = mallCouponClaimError({ issuanceLimit: coupon.issuanceLimit, claimedCount: coupon.claimedCount, hasClaim: false });
      if (claimError) throw new BadRequestException(claimError);
      coupon.claimedCount = Number(coupon.claimedCount || 0) + 1;
      await manager.getRepository(MallCoupon).save(coupon);
      claim = repo.create({ tenant, merchant, coupon, user, claimedCount: 1, usedCount: 0 });
    }
    claim.merchant = merchant || claim.merchant || null;
    claim.usedCount += 1;
    await repo.save(claim);
  }

  private async releaseCouponClaimUsage(manager: Pick<DataSource["manager"], "getRepository">, tenant: Tenant, coupon: MallCoupon, user: User) {
    const repo = manager.getRepository(MallCouponClaim);
    const claim = await repo.findOne({ where: { tenant: { id: tenant.id }, coupon: { id: coupon.id }, user: { id: user.id } }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
    if (!claim || claim.usedCount <= 0) return;
    claim.usedCount -= 1;
    await repo.update(claim.id, { usedCount: claim.usedCount });
  }

  private async publicProductCount(tenant: Tenant, query: MallListQueryDto, merchant?: MallMerchant | null) {
    const builder = this.products
      .createQueryBuilder("product")
      .leftJoin("product.category", "category")
      .leftJoin("product.platformCategory", "platformCategory")
      .leftJoin("product.brand", "brand")
      .leftJoin("product.merchant", "merchant")
      .where("product.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("product.status = :status", { status: "published" })
      .andWhere("(merchant.id IS NULL OR (merchant.status = :merchantStatus AND merchant.mallEnabled = :merchantEnabled))", { merchantStatus: "active", merchantEnabled: true })
      .andWhere((qb) => {
        const enabledSku = qb.subQuery()
          .select("1")
          .from(MallSku, "countSku")
          .where("countSku.productId = product.id")
          .andWhere("countSku.enabled = :enabledSku")
          .getQuery();
        return `EXISTS ${enabledSku}`;
      })
      .setParameter("enabledSku", true);
    if (merchant) builder.andWhere("product.merchantId = :merchantId", { merchantId: merchant.id });
    if (query.categoryId) builder.andWhere("category.id = :categoryId", { categoryId: query.categoryId });
    if (query.platformCategoryId) builder.andWhere("platformCategory.id = :platformCategoryId", { platformCategoryId: query.platformCategoryId });
    if (query.brandId) builder.andWhere("brand.id = :brandId", { brandId: query.brandId });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR product.brandName LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.getCount();
  }

  private findPublicProductRow(id: number, tenantId: number, withDisplayRelations = false) {
    return this.products.findOne({
      where: { id, tenant: { id: tenantId }, status: "published" },
      relations: withDisplayRelations ? ["tenant", "merchant", "category", "platformCategory", "brand"] : ["merchant"],
      loadEagerRelations: false
    });
  }

  private async findSellableSkuRow(repository: Repository<MallSku>, id: number, tenantId: number, lock?: { mode: "pessimistic_write" }) {
    let lockedSku: MallSku | null = null;
    if (lock) {
      lockedSku = await repository.createQueryBuilder("lockedSku")
        .where("lockedSku.id = :id", { id })
        .andWhere("lockedSku.tenantId = :tenantId", { tenantId })
        .andWhere("lockedSku.enabled = :enabled", { enabled: true })
        .setLock(lock.mode)
        .getOne();
      if (!lockedSku) return null;
    }
    const sku = await repository.findOne({
      where: { id, tenant: { id: tenantId }, enabled: true },
      relations: ["merchant", "merchant.tenant", "product", "product.merchant", "product.merchant.tenant", "product.category", "product.platformCategory", "product.brand"],
      loadEagerRelations: false
    });
    if (sku && lockedSku) {
      sku.stock = lockedSku.stock;
      sku.lockedStock = lockedSku.lockedStock;
      sku.enabled = lockedSku.enabled;
      sku.price = lockedSku.price;
      sku.originalPrice = lockedSku.originalPrice;
      sku.updatedAt = lockedSku.updatedAt;
    }
    return sku;
  }

  private isPublicProductVisible(product?: MallProduct | null) {
    if (!product || product.status !== "published") return false;
    return !product.merchant || (product.merchant.status === "active" && product.merchant.mallEnabled);
  }

  private assertPublicProductVisible(product?: MallProduct | null): asserts product is MallProduct {
    if (!product || product.status !== "published") throw new NotFoundException("商品不存在或已下架");
    if (product.merchant && (product.merchant.status !== "active" || !product.merchant.mallEnabled)) throw new NotFoundException("商品所属店铺未开放");
  }

  private async assertPublicProductSellable(productId: number) {
    if (!(await this.productHasEnabledSku(productId))) throw new NotFoundException("商品暂无可售规格");
  }

  private async productHasEnabledSku(productId: number) {
    return (await this.skus.count({ where: { product: { id: productId }, enabled: true } })) > 0;
  }

  private async productIdsWithEnabledSkus(productIds: number[]) {
    const uniqueIds = [...new Set(productIds.filter(Boolean))];
    if (!uniqueIds.length) return new Set<number>();
    const rows = await this.skus
      .createQueryBuilder("sku")
      .select("sku.productId", "productId")
      .where("sku.productId IN (:...productIds)", { productIds: uniqueIds })
      .andWhere("sku.enabled = :enabled", { enabled: true })
      .groupBy("sku.productId")
      .getRawMany<{ productId: string }>();
    return new Set(rows.map((row) => Number(row.productId)));
  }

  private isPublicCouponMerchantVisible(coupon?: MallCoupon | null) {
    return !coupon?.merchant || (coupon.merchant.status === "active" && coupon.merchant.mallEnabled);
  }

  private isPublicMallActivityProductVisible(row: { merchant?: MallMerchant | null; product?: MallProduct | null; sku?: MallSku | null }) {
    const merchantOpen = !row.merchant || (row.merchant.status === "active" && row.merchant.mallEnabled);
    return merchantOpen && this.isPublicProductVisible(row.product) && row.sku?.enabled === true;
  }

  private async productSalesMap(productIds: number[]) {
    if (!productIds.length) return new Map<number, number>();
    const rows = await this.orderItems
      .createQueryBuilder("item")
      .leftJoin("item.order", "order")
      .where("item.productId IN (:...productIds)", { productIds })
      .andWhere("order.status IN (:...statuses)", { statuses: ["paid", "shipped", "completed", "refund_pending", "refunded"] })
      .select("item.productId", "productId")
      .addSelect("COALESCE(SUM(item.quantity), 0)", "salesCount")
      .groupBy("item.productId")
      .getRawMany<{ productId: string; salesCount: string }>();
    return new Map(rows.map((row) => [Number(row.productId), Number(row.salesCount || 0)]));
  }

  private async productSalesStatsMap(productIds: number[]) {
    if (!productIds.length) return new Map<number, { salesCount: number; salesAmount: string }>();
    const rows = await this.orderItems
      .createQueryBuilder("item")
      .leftJoin("item.order", "order")
      .where("item.productId IN (:...productIds)", { productIds })
      .andWhere("order.status IN (:...statuses)", { statuses: ["paid", "shipped", "completed", "refund_pending", "refunded"] })
      .select("item.productId", "productId")
      .addSelect("COALESCE(SUM(item.quantity), 0)", "salesCount")
      .addSelect("COALESCE(SUM(item.totalAmount), 0)", "salesAmount")
      .groupBy("item.productId")
      .getRawMany<{ productId: string; salesCount: string; salesAmount: string }>();
    return new Map(rows.map((row) => [Number(row.productId), { salesCount: Number(row.salesCount || 0), salesAmount: Number(row.salesAmount || 0).toFixed(2) }]));
  }

  private publicCartItem(row: MallCartItem) {
    const availableStock = Math.max(Number(row.sku.stock || 0) - Number(row.sku.lockedStock || 0), 0);
    const merchant = row.merchant || row.product.merchant || row.sku.merchant || null;
    const unavailableReason = !merchant
      ? "商品缺少店铺归属，请删除后重新选择"
      : merchant.status !== "active" || !merchant.mallEnabled
        ? "商品所属店铺暂未开放，请删除后重新选择"
        : !row.sku.enabled || row.product.status !== "published"
          ? "商品已下架，请删除后重新选择"
          : availableStock < Number(row.quantity || 0)
            ? "库存不足，请调整数量"
            : "";
    return {
      id: row.id,
      tenant: this.publicTenantSummary(row.tenant),
      merchant: this.publicMerchantSummary(merchant),
      product: this.publicProduct(row.product, [row.sku]),
      sku: this.publicSku(row.sku),
      quantity: row.quantity,
      availableStock,
      purchasable: !unavailableReason,
      unavailableReason,
      lineAmount: (Number(row.sku.price || 0) * Number(row.quantity || 0)).toFixed(2),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mallOrderStatusText(value: string) {
    return ({ pending_payment: "待付款", pending_confirm: "待线下确认", paid: "待发货", shipped: "待收货", completed: "已完成", refund_pending: "售后中", refunded: "已退款", closed: "已关闭" } as Record<string, string>)[value] || value;
  }

  private mallCheckoutGroupStatusText(value: string) {
    return ({ pending_payment: "待付款/待确认", partial_paid: "部分已处理", paid: "已收款", completed: "已完成", closed: "已关闭", refunded: "已退款" } as Record<string, string>)[value] || value;
  }

  private mallRefundStatusText(value: string) {
    return ({ pending: "待处理", awaiting_buyer_return: "待买家寄回", returning: "退货运输中", awaiting_merchant_receipt: "待商家收货", awaiting_exchange_shipment: "待寄换货商品", exchange_shipped: "换货已发出", platform_intervening: "平台介入", processing: "退款处理中", approved: "已完成", rejected: "已拒绝", failed: "退款失败", cancelled: "已取消" } as Record<string, string>)[value] || value;
  }

  private publicMerchantApplication(row: MallMerchantApplication) {
    return {
      id: row.id,
      tenant: this.publicTenantSummary(row.tenant),
      merchant: this.publicMerchantSummary(row.merchant),
      desiredName: row.desiredName,
      legalName: row.legalName,
      unifiedSocialCreditCode: row.unifiedSocialCreditCode,
      legalRepresentative: row.legalRepresentative,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      region: row.region,
      businessLicenseUrl: row.businessLicenseUrl,
      qualificationFiles: row.qualificationFiles || [],
      status: row.status,
      applyRemark: row.applyRemark,
      reviewRemark: row.reviewRemark,
      submittedAt: row.submittedAt,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicMallReviewReport(row: MallReviewReport) {
    return {
      id: row.id,
      reviewId: row.review?.id || null,
      reason: row.reason,
      images: row.images || [],
      status: row.status,
      resolution: row.resolution,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mallPaymentTransactionStatusText(value: string) {
    return ({ success: "成功", discrepancy: "差异", failed: "失败" } as Record<string, string>)[value] || value;
  }

  private mallPaymentCallbackStatusText(value: string) {
    return ({ received: "已接收", success: "成功", failed: "失败", idempotent: "幂等" } as Record<string, string>)[value] || value;
  }

  private paymentMethodText(value: string) {
    return ({ wechat: "微信支付", balance: "余额支付", offline: "线下收款", alipay: "支付宝" } as Record<string, string>)[value] || value;
  }

  private mallCommissionStatusText(value: string) {
    return ({ risk_review: "风险复核", pending: "待结算", settled: "已结算", void: "已作废" } as Record<string, string>)[value] || value;
  }

  private mallSettlementStatusText(value: string) {
    return ({ draft: "草稿", approved: "已审核", paid: "已打款", rejected: "已拒绝", cancelled: "已取消" } as Record<string, string>)[value] || value;
  }

  private mallPaymentModeText(value: string) {
    return ({ platform_collect: "平台代收", merchant_direct: "商户直收" } as Record<string, string>)[value] || value;
  }

  private publicWechatPaymentDisabledReason(readiness: { status?: string; collectionMode?: string }) {
    if (readiness.status === "disabled") return "后台未开启微信支付，请联系平台运营处理。";
    if (readiness.collectionMode === "merchant_direct") return "当前店铺微信支付暂未开放，请联系店铺运营确认收款配置。";
    return "微信支付暂未开放，请联系平台运营完成支付配置。";
  }

  private mallPaymentReadinessNextAction(status: string, issues: string[]) {
    if (status === "real_ready") return "可进入小额真实微信支付联调：下单、支付回调、重复回调、退款查询和账单留痕全部需要留档。";
    if (status === "sandbox_ready") return issues.length ? `先补齐真实支付配置；当前可继续用沙箱验收。缺口：${issues.slice(0, 4).join("；")}` : "当前可用沙箱验收，真实支付上线前仍需补齐商户号、证书、回调和预发小额支付留档。";
    if (status === "disabled") return "如要在前台展示微信支付，请先到运营设置开启微信支付，再完成沙箱或真实支付配置。";
    return issues.length ? `暂不能开放微信支付，请先处理：${issues.slice(0, 5).join("；")}` : "暂不能开放微信支付，请检查沙箱或真实支付配置。";
  }

  private async mallWechatPaymentReadinessForMerchant(tenant: Tenant | null, merchant?: MallMerchant | null, paymentMethods?: ReturnType<MallService["normalizePaymentMethods"]>) {
    const runtimeConfig = await this.platformLaunchRuntimeConfig();
    const operationSetting = !paymentMethods && tenant ? await this.operationSettings.findOne({ where: { tenant: { id: tenant.id } } }) : null;
    const resolvedPaymentMethods = paymentMethods || this.normalizePaymentMethods(operationSetting?.paymentMethods);
    const base = this.mallWechatPaymentReadiness(tenant, resolvedPaymentMethods, runtimeConfig);
    const merchantSummary = merchant ? { id: merchant.id, code: merchant.code, name: merchant.name, ownerType: merchant.ownerType, paymentMode: merchant.paymentMode } : null;
    if (!merchant || merchant.paymentMode !== "merchant_direct") {
      return {
        ...base,
        collectionMode: "platform_collect",
        merchant: merchantSummary,
        direct: null
      };
    }

    const directIssues: string[] = [];
    const directPaymentImplemented = runtimeConfig.get("MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED", "false") === "true";
    const directCallbackRoutingImplemented = true;
    const realPaymentPreflightPassed = runtimeConfig.get("REAL_PAYMENT_PREFLIGHT_PASSED", "false") === "true";
    const multiMerchantPreflightPassed = runtimeConfig.get("MALL_MULTI_MERCHANT_PREFLIGHT_PASSED", "false") === "true";
    let account: MallMerchantPaymentAccount | AgentPaymentAccount | null = null;
    let accountScope = "";
    let accountMissingKeys: string[] = [];
    let accountUnreadableFiles: string[] = [];
    const requiredKeys = ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_PLATFORM_CERT_PATH"];
    const fileKeys = ["WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_PLATFORM_CERT_PATH"];
    const directNotifyUrl = this.mallWechatMerchantNotifyUrl(merchant, false, runtimeConfig);
    const directRefundNotifyUrl = this.mallWechatMerchantRefundNotifyUrl(merchant, false, runtimeConfig);

    const merchantAccount = await this.merchantPaymentAccounts.findOne({ where: { merchant: { id: merchant.id }, provider: PaymentMethod.Wechat, enabled: true } });
    if (merchantAccount) {
      account = merchantAccount;
      accountScope = "店铺收款账户";
    } else if (merchant.agent?.id) {
      account = await this.agentPaymentAccounts.findOne({ where: { agent: { id: merchant.agent.id }, provider: PaymentMethod.Wechat, enabled: true } });
      accountScope = account ? "代理旧收款账户" : "";
    }
    if (!account) {
      directIssues.push("店铺未配置启用的微信支付账户，请在「商城店铺」中维护收款账户后再启用商户直收");
    } else {
      const config = account.config && typeof account.config === "object" && !Array.isArray(account.config) ? account.config : {};
      accountMissingKeys = requiredKeys.filter((key) => !String((config as Record<string, unknown>)[key] || "").trim());
      accountUnreadableFiles = fileKeys.filter((key) => {
        const value = String((config as Record<string, unknown>)[key] || "").trim();
        return value && !privateCredentialExists(value);
      });
      directIssues.push(...accountMissingKeys.map((key) => `${accountScope || "店铺收款账户"}缺少 ${key}`));
      directIssues.push(...accountUnreadableFiles.map((key) => `${accountScope || "店铺收款账户"}的 ${key} 文件不可读取，请确认服务器路径和权限`));
    }
    if (!directPaymentImplemented) {
      directIssues.push("商户直收微信支付尚未完成真实联调留档，请先使用平台代收；完成下单、店铺专属回调、退款回调和防串店验收后再开启 MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED");
    }
    if (!base.enabledInOperation) directIssues.push("当前商家运营设置未开启微信支付");
    if (!base.real?.realPaymentEnabled) directIssues.push("REAL_PAYMENT_ENABLED 未开启，商户直收不能开放真实收款");
    if (!base.real?.wechatEnabled) directIssues.push("WECHAT_PAY_ENABLED 未开启，商户直收不能开放微信收款");
    if (!realPaymentPreflightPassed) directIssues.push("REAL_PAYMENT_PREFLIGHT_PASSED 未标记通过；请先完成 smoke:real-payment，并在 mallPaymentRouteGuard 中留存错路由拒绝证据");
    if (!multiMerchantPreflightPassed) directIssues.push("MALL_MULTI_MERCHANT_PREFLIGHT_PASSED 未标记通过；请先完成 smoke:mall-multi-merchant，确认店铺授权、跨店拆单、结算和导出隔离");
    if (!base.real?.implementationReady) directIssues.push("真实支付 SDK、回调验签、退款查询或账单拉取未全部标记完成");
    if (!base.real?.mallWechatImplemented) directIssues.push("商城真实微信支付路由未完成小额联调留档，请先开启 MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED");
    if (!directNotifyUrl) directIssues.push("商户直收微信回调地址无法生成，请配置 MALL_WECHAT_PAY_DIRECT_NOTIFY_URL_TEMPLATE 或 MALL_WECHAT_PAY_NOTIFY_URL");
    if (directNotifyUrl && !/^https:\/\//i.test(directNotifyUrl)) directIssues.push("商户直收微信回调地址必须是 https 地址");
    if (directNotifyUrl && !directNotifyUrl.includes(`/payment/mall/merchants/${merchant.id}/wechat/callback`)) directIssues.push("商户直收微信回调地址必须包含当前店铺 ID，避免代理支付回调串店");
    if (!directRefundNotifyUrl) directIssues.push("商户直收微信退款回调地址无法生成，请配置 MALL_WECHAT_PAY_DIRECT_REFUND_NOTIFY_URL_TEMPLATE 或提供可推导的商户直收支付回调地址");
    if (directRefundNotifyUrl && !/^https:\/\//i.test(directRefundNotifyUrl)) directIssues.push("商户直收微信退款回调地址必须是 https 地址");
    if (directRefundNotifyUrl && !directRefundNotifyUrl.includes(`/payment/mall/merchants/${merchant.id}/wechat/refund-callback`)) directIssues.push("商户直收微信退款回调地址必须包含当前店铺 ID，避免代理退款回调串店");

    const status = directIssues.length ? "not_ready" : "real_ready";
    const issues = [...directIssues];
    return {
      ...base,
      collectionMode: "merchant_direct",
      merchant: merchantSummary,
      status,
      statusText: status === "real_ready" ? "商户直收就绪" : "商户直收未就绪",
      direct: {
        implemented: directPaymentImplemented && directCallbackRoutingImplemented,
        paymentImplemented: directPaymentImplemented,
        callbackRoutingImplemented: directCallbackRoutingImplemented,
        notifyUrl: directNotifyUrl,
        refundNotifyUrl: directRefundNotifyUrl,
        account: account ? { id: account.id, scope: accountScope || "店铺收款账户", merchantName: account.merchantName, merchantNo: account.merchantNo, enabled: account.enabled } : null,
        realPaymentPreflightPassed,
        multiMerchantPreflightPassed,
        routeGuardEvidence: {
          required: true,
          checkKey: "mallPaymentRouteGuard",
          requiredRejections: ["platformPaymentRouteRejected", "wrongMerchantPaymentRouteRejected", "platformRefundRouteRejected", "wrongMerchantRefundRouteRejected"]
        },
        requiredKeys,
        missingKeys: accountMissingKeys,
        unreadableFiles: accountUnreadableFiles
      },
      issues,
      nextAction: status === "real_ready" ? "该店铺可进入商户直收小额真实支付联调；上线前仍需保留 mallPaymentRouteGuard、防重复回调、退款和对账证据。" : `该店铺暂不能开放商户直收微信支付：${directIssues.slice(0, 4).join("；")}`
    };
  }

  private mallWechatPaymentReadiness(tenant: Tenant | null, paymentMethods?: ReturnType<MallService["normalizePaymentMethods"]>, config = this.config) {
    const methods = paymentMethods || this.normalizePaymentMethods(null);
    const sandboxEnabled = config.get("PAYMENT_SANDBOX_ENABLED", "false") === "true";
    const sandboxSecretReady = Boolean(config.get("WECHAT_PAY_SANDBOX_SECRET") || config.get("PAYMENT_SANDBOX_SECRET"));
    const realPaymentEnabled = config.get("REAL_PAYMENT_ENABLED", "false") === "true";
    const wechatEnabled = config.get("WECHAT_PAY_ENABLED", "false") === "true";
    const realPaymentPreflightPassed = config.get("REAL_PAYMENT_PREFLIGHT_PASSED", "false") === "true";
    const realImplementationReady = ["REAL_PAYMENT_SDK_IMPLEMENTED", "REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED", "REAL_REFUND_QUERY_IMPLEMENTED", "REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED"].every((key) => config.get(key, "false") === "true");
    const mallRealWechatImplemented = config.get("MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED", "false") === "true";
    const requiredKeys = ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_PLATFORM_CERT_PATH"];
    const missingKeys = requiredKeys.filter((key) => !String(config.get(key, "") || "").trim());
    const unreadableFiles = ["WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_PLATFORM_CERT_PATH"].filter((key) => {
      const value = String(config.get(key, "") || "").trim();
      return value && !existsSync(value);
    });
    const notifyUrl = this.mallWechatNotifyUrl(false, config);
    const refundNotifyUrl = this.mallWechatRefundNotifyUrl(false, config);
    const notifyIssues = [
      notifyUrl && !/^https:\/\//i.test(notifyUrl) ? "商城微信回调地址必须是 https 地址" : "",
      !notifyUrl ? "请配置 MALL_WECHAT_PAY_NOTIFY_URL，或提供可推导商城回调的 WECHAT_PAY_NOTIFY_URL" : "",
      notifyUrl && !notifyUrl.includes("/payment/mall/wechat/callback") ? "商城微信回调必须指向 /payment/mall/wechat/callback，避免落到活动订单回调" : ""
    ].filter(Boolean);
    const refundNotifyIssues = [
      refundNotifyUrl && !/^https:\/\//i.test(refundNotifyUrl) ? "商城微信退款回调地址必须是 https 地址" : "",
      !refundNotifyUrl ? "请配置 MALL_WECHAT_PAY_REFUND_NOTIFY_URL，或提供可推导商城退款回调的 MALL_WECHAT_PAY_NOTIFY_URL/WECHAT_PAY_NOTIFY_URL" : "",
      refundNotifyUrl && !refundNotifyUrl.includes("/payment/mall/wechat/refund-callback") ? "商城微信退款回调必须指向 /payment/mall/wechat/refund-callback，避免落到活动退款回调" : ""
    ].filter(Boolean);
    const issues = [
      !methods.wechat ? "当前商家运营设置未开启微信支付" : "",
      realPaymentEnabled && !wechatEnabled ? "REAL_PAYMENT_ENABLED 已开启，但 WECHAT_PAY_ENABLED 未开启" : "",
      realPaymentEnabled && wechatEnabled && !realPaymentPreflightPassed ? "REAL_PAYMENT_PREFLIGHT_PASSED 未标记通过；真实支付上线前必须完成 smoke:real-payment 并保留预发验收结果" : "",
      realPaymentEnabled && wechatEnabled && !mallRealWechatImplemented ? "商城平台代收真实微信支付路由已接入代码，但 MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED 未开启；完成小额联调留档后再开启" : "",
      ...missingKeys.map((key) => `缺少 ${key}`),
      ...unreadableFiles.map((key) => `${key} 文件不可读取`),
      ...notifyIssues,
      ...refundNotifyIssues,
      realPaymentEnabled && !realImplementationReady ? "真实支付 SDK、回调验签、退款查询或账单拉取未全部标记完成" : ""
    ].filter(Boolean);
    const status = !methods.wechat
      ? "disabled"
      : realPaymentEnabled && wechatEnabled && realPaymentPreflightPassed && mallRealWechatImplemented && !missingKeys.length && !unreadableFiles.length && !notifyIssues.length && !refundNotifyIssues.length && realImplementationReady
        ? "real_ready"
        : sandboxEnabled && sandboxSecretReady
          ? "sandbox_ready"
          : "not_ready";
    return {
      tenant: tenant ? { id: tenant.id, code: tenant.code, name: tenant.name } : null,
      provider: "wechat",
      enabledInOperation: methods.wechat,
      status,
      statusText: ({ disabled: "商家未开启", sandbox_ready: "沙箱可验收", real_ready: "真实配置就绪", not_ready: "配置未就绪" } as Record<string, string>)[status],
      sandbox: { enabled: sandboxEnabled, secretReady: sandboxSecretReady },
      real: { realPaymentEnabled, wechatEnabled, preflightPassed: realPaymentPreflightPassed, implementationReady: realImplementationReady, mallWechatImplemented: mallRealWechatImplemented, requiredKeys, missingKeys, unreadableFiles, notifyUrl, notifyIssues, refundNotifyUrl, refundNotifyIssues },
      issues,
      nextAction: this.mallPaymentReadinessNextAction(status, issues)
    };
  }

  private async platformLaunchRuntimeConfig() {
    const platformSetting = await this.operationSettings.findOne({ where: { id: 1 } });
    return configWithLaunchOverrides(this.config, platformSetting?.launchConfig);
  }

  private mallWechatNotifyUrl(required = true, config = this.config) {
    const explicit = String(config.get("MALL_WECHAT_PAY_NOTIFY_URL", "") || "").trim();
    if (explicit) return explicit;
    const globalNotifyUrl = String(config.get("WECHAT_PAY_NOTIFY_URL", "") || "").trim();
    if (globalNotifyUrl.includes("/payment/mall/wechat/callback")) return globalNotifyUrl;
    if (globalNotifyUrl.includes("/payment/wechat/callback")) return globalNotifyUrl.replace("/payment/wechat/callback", "/payment/mall/wechat/callback");
    if (!required) return "";
    throw new BadRequestException("请配置 MALL_WECHAT_PAY_NOTIFY_URL，或将 WECHAT_PAY_NOTIFY_URL 设置为可推导的 HTTPS 回调地址");
  }

  private mallWechatMerchantNotifyUrl(merchant: MallMerchant, required = true, config = this.config) {
    const merchantId = String(merchant.id);
    const merchantCode = encodeURIComponent(merchant.code || merchantId);
    const template = String(config.get("MALL_WECHAT_PAY_DIRECT_NOTIFY_URL_TEMPLATE", "") || "").trim();
    if (template) {
      return template
        .replaceAll("{merchantId}", merchantId)
        .replaceAll(":merchantId", merchantId)
        .replaceAll("{merchantCode}", merchantCode)
        .replaceAll(":merchantCode", merchantCode);
    }
    const platformMallNotifyUrl = this.mallWechatNotifyUrl(false, config);
    if (platformMallNotifyUrl.includes("/payment/mall/wechat/callback")) {
      return platformMallNotifyUrl.replace("/payment/mall/wechat/callback", `/payment/mall/merchants/${merchantId}/wechat/callback`);
    }
    const globalNotifyUrl = String(config.get("WECHAT_PAY_NOTIFY_URL", "") || "").trim();
    if (globalNotifyUrl.includes("/payment/wechat/callback")) return globalNotifyUrl.replace("/payment/wechat/callback", `/payment/mall/merchants/${merchantId}/wechat/callback`);
    if (!required) return "";
    throw new BadRequestException("请配置 MALL_WECHAT_PAY_DIRECT_NOTIFY_URL_TEMPLATE，或提供可推导商户直收回调的商城微信回调地址");
  }

  private mallWechatRefundNotifyUrl(required = true, config = this.config) {
    const explicit = String(config.get("MALL_WECHAT_PAY_REFUND_NOTIFY_URL", "") || "").trim();
    if (explicit) return explicit;
    const platformMallNotifyUrl = this.mallWechatNotifyUrl(false, config);
    if (platformMallNotifyUrl.includes("/payment/mall/wechat/refund-callback")) return platformMallNotifyUrl;
    if (platformMallNotifyUrl.includes("/payment/mall/wechat/callback")) return platformMallNotifyUrl.replace("/payment/mall/wechat/callback", "/payment/mall/wechat/refund-callback");
    const globalNotifyUrl = String(config.get("WECHAT_PAY_NOTIFY_URL", "") || "").trim();
    if (globalNotifyUrl.includes("/payment/wechat/refund-callback")) return globalNotifyUrl.replace("/payment/wechat/refund-callback", "/payment/mall/wechat/refund-callback");
    if (globalNotifyUrl.includes("/payment/wechat/callback")) return globalNotifyUrl.replace("/payment/wechat/callback", "/payment/mall/wechat/refund-callback");
    if (!required) return "";
    throw new BadRequestException("请配置 MALL_WECHAT_PAY_REFUND_NOTIFY_URL，或提供可推导商城退款回调的商城微信支付回调地址");
  }

  private mallWechatMerchantRefundNotifyUrl(merchant: MallMerchant, required = true, config = this.config) {
    const merchantId = String(merchant.id);
    const merchantCode = encodeURIComponent(merchant.code || merchantId);
    const template = String(config.get("MALL_WECHAT_PAY_DIRECT_REFUND_NOTIFY_URL_TEMPLATE", "") || "").trim();
    if (template) {
      return template
        .replaceAll("{merchantId}", merchantId)
        .replaceAll(":merchantId", merchantId)
        .replaceAll("{merchantCode}", merchantCode)
        .replaceAll(":merchantCode", merchantCode);
    }
    const directNotifyUrl = this.mallWechatMerchantNotifyUrl(merchant, false, config);
    if (directNotifyUrl.includes(`/payment/mall/merchants/${merchantId}/wechat/refund-callback`)) return directNotifyUrl;
    if (directNotifyUrl.includes(`/payment/mall/merchants/${merchantId}/wechat/callback`)) {
      return directNotifyUrl.replace(`/payment/mall/merchants/${merchantId}/wechat/callback`, `/payment/mall/merchants/${merchantId}/wechat/refund-callback`);
    }
    const platformRefundNotifyUrl = this.mallWechatRefundNotifyUrl(false, config);
    if (platformRefundNotifyUrl.includes("/payment/mall/wechat/refund-callback")) {
      return platformRefundNotifyUrl.replace("/payment/mall/wechat/refund-callback", `/payment/mall/merchants/${merchantId}/wechat/refund-callback`);
    }
    const globalNotifyUrl = String(config.get("WECHAT_PAY_NOTIFY_URL", "") || "").trim();
    if (globalNotifyUrl.includes("/payment/wechat/refund-callback")) return globalNotifyUrl.replace("/payment/wechat/refund-callback", `/payment/mall/merchants/${merchantId}/wechat/refund-callback`);
    if (globalNotifyUrl.includes("/payment/wechat/callback")) return globalNotifyUrl.replace("/payment/wechat/callback", `/payment/mall/merchants/${merchantId}/wechat/refund-callback`);
    if (!required) return "";
    throw new BadRequestException("请配置 MALL_WECHAT_PAY_DIRECT_REFUND_NOTIFY_URL_TEMPLATE，或提供可推导商户直收退款回调的商城微信回调地址");
  }

  private isMallOrderStatus(value: string): value is MallOrderStatus {
    return ["pending_payment", "pending_confirm", "paid", "shipped", "completed", "refund_pending", "refunded", "closed"].includes(value);
  }

  private async resolveOrderAddress(user: User, tenant: Tenant, dto: CreateMallOrderDto) {
    let row: MallAddress | null = null;
    if (dto.addressId) row = await this.addresses.findOne({ where: { id: Number(dto.addressId), tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!row && dto.address) {
      row = this.addresses.create({ tenant, user });
      this.assignAddress(row, dto.address);
      row = await this.addresses.save(row);
    }
    if (!row) throw new BadRequestException("请填写收货地址");
    return { receiverName: row.receiverName, receiverPhone: row.receiverPhone, province: row.province, city: row.city, district: row.district, detail: row.detail };
  }

  private async resolveCoupon(tenant: Tenant, code: unknown, goodsAmount: number, items: MallOrderPreviewItem[] = [], manager?: Pick<DataSource["manager"], "getRepository">, user?: User, lookup: "code" | "id" = "code", merchant?: MallMerchant | null) {
    const repo = manager ? manager.getRepository(MallCoupon) : this.coupons;
    const options: any = {
      where: lookup === "id" ? { tenant: { id: tenant.id }, id: Number(code || 0) } : { tenant: { id: tenant.id }, code: this.normalizeCouponCode(code) },
      relations: ["merchant"],
      loadEagerRelations: false
    };
    if (manager) options.lock = { mode: "pessimistic_write" };
    const coupon = await repo.findOne(options);
    if (!coupon) throw new BadRequestException("优惠券不存在");
    if (!coupon.enabled) throw new BadRequestException("优惠券已停用");
    if (coupon.merchant) {
      if (!this.isPublicCouponMerchantVisible(coupon)) throw new BadRequestException("该优惠券所属店铺未开通商城，暂不可用");
      if (merchant && coupon.merchant.id !== merchant.id) throw new BadRequestException("该优惠券仅限所属店铺商品使用");
      if (!merchant && !items.some((item) => item.merchantId === coupon.merchant!.id)) {
        throw new BadRequestException(items.length ? "该优惠券仅限所属店铺商品使用" : "请先进入该优惠券所属店铺后再使用");
      }
    }
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw new BadRequestException("优惠券还未开始");
    if (coupon.endsAt && coupon.endsAt < now) throw new BadRequestException("优惠券已过期");
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException("优惠券已用完");
    if (user) {
      const claimRepo = manager ? manager.getRepository(MallCouponClaim) : this.couponClaims;
      const claim = await claimRepo.findOne({ where: { tenant: { id: tenant.id }, coupon: { id: coupon.id }, user: { id: user.id } }, ...(manager ? { lock: { mode: "pessimistic_write" as const } } : {}) });
      const claimError = mallCouponClaimError({ issuanceLimit: coupon.issuanceLimit, claimedCount: coupon.claimedCount, hasClaim: Boolean(claim) });
      if (claimError) throw new BadRequestException(claimError);
    }
    if (user && coupon.perUserLimit > 0) {
      const usageRepo = manager ? manager.getRepository(MallCouponUsage) : this.couponUsages;
      const usedByUser = await usageRepo.count({ where: { coupon: { id: coupon.id }, user: { id: user.id }, status: "used" } });
      if (usedByUser >= coupon.perUserLimit) throw new BadRequestException("该优惠券每位用户可用次数已达上限");
    }
    if (goodsAmount > 0) {
      const eligibleAmount = this.couponEligibleAmount(coupon, goodsAmount, items);
      if (eligibleAmount <= 0) throw new BadRequestException("当前商品不适用该优惠券");
      if (eligibleAmount + 0.0001 < Number(coupon.minAmount || 0)) throw new BadRequestException(`适用商品满 ${Number(coupon.minAmount || 0).toFixed(2)} 元才可使用该优惠券`);
    }
    return coupon;
  }

  private computeCouponDiscount(coupon: MallCoupon, goodsAmount: number, items: MallOrderPreviewItem[] = []) {
    return Math.min(Math.max(Number(coupon.discountAmount || 0), 0), this.couponEligibleAmount(coupon, goodsAmount, items));
  }

  private couponEligibleAmount(coupon: MallCoupon, goodsAmount: number, items: MallOrderPreviewItem[]) {
    const scopedItems = coupon.merchant ? items.filter((item) => item.merchantId === coupon.merchant!.id) : items;
    if (!coupon.scope || coupon.scope === "all") {
      if (scopedItems.length) return scopedItems.reduce((sum, item) => sum + item.amount, 0);
      return coupon.merchant ? 0 : Math.max(Number(goodsAmount || 0), 0);
    }
    if (coupon.scope === "category") return scopedItems.filter((item) => mallCouponCategoryMatches({ issuerScope: coupon.issuerScope, scopeCategoryId: coupon.scopeCategoryId, merchantCategoryId: item.categoryId, platformCategoryId: item.platformCategoryId })).reduce((sum, item) => sum + item.amount, 0);
    if (coupon.scope === "product") return scopedItems.filter((item) => item.productId === coupon.scopeProductId).reduce((sum, item) => sum + item.amount, 0);
    return 0;
  }

  private assignAddress(row: MallAddress, dto: MallAddressDto) {
    const phone = this.requiredString(dto.receiverPhone, "手机号").replace(/[\s-]+/g, "");
    if (!/^\+?\d{6,20}$/.test(phone)) throw new BadRequestException("手机号格式不正确");
    row.receiverName = this.requiredString(dto.receiverName, "收货人").slice(0, 40);
    row.receiverPhone = phone;
    row.province = this.optionalString(dto.province)?.slice(0, 80) || null;
    row.city = this.optionalString(dto.city)?.slice(0, 80) || null;
    row.district = this.optionalString(dto.district)?.slice(0, 80) || null;
    row.detail = this.requiredString(dto.detail, "详细地址").slice(0, 255);
    row.isDefault = Boolean(dto.isDefault);
  }

  private async adminTargetTenant(admin?: AdminContext, tenantId?: number, allowAll = false) {
    if (admin?.tenantId) {
      const tenant = await this.tenants.findOne({ where: { id: admin.tenantId, enabled: true } });
      if (!tenant) throw new NotFoundException("商家不存在或已停用");
      this.assertMallEnabled(tenant);
      return tenant;
    }
    const id = Number(tenantId || 0);
    if (!id && allowAll) return null;
    if (!id) throw new BadRequestException("请选择所属商家");
    const tenant = await this.tenants.findOne({ where: { id, enabled: true } });
    if (!tenant) throw new NotFoundException("商家不存在或已停用");
    this.assertMallEnabled(tenant);
    return tenant;
  }

  private async adminTargetMerchant(admin?: AdminContext, tenantId?: number, merchantId?: number, allowAll = false, requireEnabled = true, requiredPermission?: MerchantPermissionRequirement): Promise<MallMerchantScope> {
    const id = Number(merchantId || 0);
    if (id) {
      const merchant = await this.merchants.findOne({ where: { id } });
      if (!merchant) throw new NotFoundException("商城店铺不存在");
      const tenant = tenantId ? await this.adminTargetTenant(admin, tenantId) : merchant.tenant;
      if (tenant && merchant.tenant.id !== tenant.id) throw new ForbiddenException("所选店铺不属于当前商家");
      this.assertMallEnabled(merchant.tenant);
      await this.assertAdminMerchantAccess(merchant, admin, requiredPermission);
      if (requireEnabled) this.assertMerchantEnabled(merchant);
      return { tenant: merchant.tenant, merchant };
    }
    const tenant = await this.adminTargetTenant(admin, tenantId, allowAll);
    if (!tenant && allowAll) return { tenant: null, merchant: null };
    if (!tenant) throw new BadRequestException("请选择所属商家或店铺");
    if (allowAll && this.isPlatformMallWideContext(admin)) return { tenant, merchant: null };
    const allowedIds = await this.adminAllowedMerchantIds(admin, requiredPermission);
    if (allowedIds !== null && allowedIds.length === 0) {
      throw new ForbiddenException("当前账号还没有授权任何商城店铺，请联系平台管理员在「店铺管理」中授权");
    }
    if (allowedIds?.length === 1) {
      const merchant = await this.merchants.findOne({ where: { id: allowedIds[0], tenant: { id: tenant.id } } });
      if (merchant) {
        if (requireEnabled) this.assertMerchantEnabled(merchant);
        return { tenant, merchant };
      }
    }
    if (allowedIds !== null && allowedIds.length > 1) {
      throw new BadRequestException("当前账号可管理多个商城店铺，请先选择具体店铺后再操作");
    }
    const merchant = await this.ensureDefaultMerchant(tenant);
    await this.assertAdminMerchantAccess(merchant, admin, requiredPermission);
    if (requireEnabled) this.assertMerchantEnabled(merchant);
    return { tenant, merchant };
  }

  private async requirePublicTenant(context?: PublicTenantContext | null) {
    const code = normalizeTenantCode(context?.tenantCode);
    const tenant = code ? await this.tenants.findOne({ where: { code, enabled: true } }) : context?.tenantId ? await this.tenants.findOne({ where: { id: context.tenantId, enabled: true } }) : null;
    if (!tenant) throw new NotFoundException("请先选择商家后再进入商城");
    this.assertMallEnabled(tenant);
    return tenant;
  }

  private async publicTargetMerchant(tenant: Tenant, merchantId?: number | null) {
    const id = Number(merchantId || 0);
    if (!id) return null;
    const merchant = await this.merchants.findOne({ where: { id, tenant: { id: tenant.id } } });
    if (!merchant || merchant.status !== "active" || !merchant.mallEnabled || ["suspended", "expired", "rejected"].includes(merchant.onboardingStatus)) throw new NotFoundException("店铺不存在或未开通商城");
    const productCount = await this.merchantPublishedProductCount(merchant.id);
    if (!productCount) throw new NotFoundException("店铺暂无已上架商品，暂未对外展示");
    return merchant;
  }

  private merchantPublishedProductCount(merchantId: number) {
    return this.products
      .createQueryBuilder("product")
      .innerJoin(MallSku, "sku", "sku.productId = product.id AND sku.enabled = :enabledSku", { enabledSku: true })
      .where("product.merchantId = :merchantId", { merchantId })
      .andWhere("product.status = :status", { status: "published" })
      .getCount();
  }

  private async resolvePublicSkuMerchant(tenant: Tenant, sku: MallSku) {
    const merchant = sku.merchant || sku.product.merchant || await this.ensureDefaultMerchant(tenant);
    if (merchant.tenant.id !== tenant.id || merchant.status !== "active" || !merchant.mallEnabled || ["suspended", "expired", "rejected"].includes(merchant.onboardingStatus)) {
      throw new BadRequestException("商品所属店铺暂未开放，请返回商城选择其它商品");
    }
    return merchant;
  }

  private async ensureDefaultMerchant(tenant: Tenant) {
    let merchant = await this.merchants.findOne({ where: { ownerType: "tenant", tenant: { id: tenant.id }, agent: IsNull() } });
    if (!merchant) {
      merchant = await this.merchants.save(this.merchants.create({
        code: this.normalizeMerchantCode(`tenant_${tenant.id}`),
        name: tenant.name,
        ownerType: "tenant",
        tenant,
        agent: null,
        status: "disabled",
        mallEnabled: false,
        productAuditRequired: true,
        paymentMode: "platform_collect",
        region: tenant.region,
        contactName: tenant.contactName,
        contactPhone: tenant.contactPhone,
        settlementConfig: { source: "tenant_default" },
        freightConfig: { enabled: true, baseFreightFen: 0, freeThresholdFen: 0 }
      }));
    }
    return merchant;
  }

  private async assertMerchantIdentityCanChange(merchant: MallMerchant, next: { ownerType: string; tenant: Tenant; agent: Agent | null; code: string }) {
    const identityChanged = merchant.ownerType !== next.ownerType
      || merchant.tenant.id !== next.tenant.id
      || (merchant.agent?.id || null) !== (next.agent?.id || null)
      || merchant.code !== next.code;
    if (!identityChanged) return;
    const blockers = await this.merchantBusinessDataLabels(merchant.id);
    if (!blockers.length) return;
    throw new BadRequestException(`该店铺已有${blockers.join("、")}，不能修改店铺编码、所属商家或绑定代理；请新建店铺承接新主体，原店铺可停用。`);
  }

  private async assertMerchantPaymentModeCanChange(merchant: MallMerchant, previousMode: string, nextMode: string) {
    if (!merchant.id || previousMode === nextMode) return;
    const blockers = await this.merchantOperationalBlockers(merchant);
    if (!blockers.length) return;
    throw new BadRequestException(`该店铺已有${blockers.join("、")}，暂不能从「${this.mallPaymentModeText(previousMode)}」切换为「${this.mallPaymentModeText(nextMode)}」；请先完成订单履约、售后和结算，再切换收款模式，避免支付、退款和财务对账口径混乱。`);
  }

  private async assertMerchantCloseAllowed(merchant: MallMerchant, nextStatus: string, nextMallEnabled: boolean) {
    if (!merchant.id || merchant.status !== "active" || !merchant.mallEnabled) return;
    if (nextStatus === "active" && nextMallEnabled) return;
    const blockers = await this.merchantOperationalBlockers(merchant);
    if (!blockers.length) return;
    throw new BadRequestException(`该店铺已有${blockers.join("、")}，暂不能关闭商城或停用店铺；请先完成订单履约、售后和结算，再关闭店铺，避免用户订单、退款和财务对账卡住。`);
  }

  private async assertMerchantOpenReady(merchant: MallMerchant, nextStatus: string, nextMallEnabled: boolean) {
    if (nextStatus !== "active" || !nextMallEnabled) return;
    if (merchant.id && merchant.status === "active" && merchant.mallEnabled) return;
    if (!merchant.id) {
      throw new BadRequestException("商城店铺必须先以未开放状态创建，授权后台账号并完成收款配置后，再开通商城。");
    }
    if (merchant.contractRequired) await this.assertMerchantGovernanceReady(merchant);
    const now = new Date();
    const enabledAccessCount = await this.merchantAccess.createQueryBuilder("access")
      .where("access.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("access.enabled = :enabled", { enabled: true })
      .andWhere("(access.validFrom IS NULL OR access.validFrom <= :now)", { now })
      .andWhere("(access.validUntil IS NULL OR access.validUntil > :now)", { now })
      .getCount();
    if (enabledAccessCount > 0) return;
    throw new BadRequestException("店铺还没有授权后台账号，不能开通商城；请先在「店铺授权」中给商家/代理管理员、运营或财务账号授权，确保开店后有人能发布商品、处理订单、发货和售后。");
  }

  private async merchantOperationalBlockers(merchant: MallMerchant) {
    const settled = await this.settledMallSnapshotIds(merchant.tenant, merchant);
    const activeOrderStatuses: MallOrderStatus[] = ["pending_payment", "pending_confirm", "paid", "shipped", "refund_pending"];
    const [activeOrderCount, pendingRefundCount, openSettlementCount] = await Promise.all([
      this.orders.createQueryBuilder("mallOrder")
        .where("mallOrder.merchantId = :merchantId", { merchantId: merchant.id })
        .andWhere("mallOrder.status IN (:...statuses)", { statuses: activeOrderStatuses })
        .getCount(),
      this.refunds.createQueryBuilder("refund")
        .where("refund.merchantId = :merchantId", { merchantId: merchant.id })
        .andWhere("refund.status IN (:...statuses)", { statuses: ["pending", "processing", "failed"] })
        .getCount(),
      this.settlements.createQueryBuilder("settlement")
        .where("settlement.merchantId = :merchantId", { merchantId: merchant.id })
        .andWhere("settlement.status IN (:...statuses)", { statuses: ["draft", "approved"] })
        .getCount()
    ]);
    const completedOrderBuilder = this.orders.createQueryBuilder("mallOrder")
      .where("mallOrder.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("mallOrder.status = :status", { status: "completed" });
    if (settled.orderIds.length) completedOrderBuilder.andWhere("mallOrder.id NOT IN (:...settledOrderIds)", { settledOrderIds: settled.orderIds });
    const approvedRefundBuilder = this.refunds.createQueryBuilder("refund")
      .where("refund.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("refund.status = :status", { status: "approved" });
    if (settled.refundIds.length) approvedRefundBuilder.andWhere("refund.id NOT IN (:...settledRefundIds)", { settledRefundIds: settled.refundIds });
    const [completedUnsettledOrderCount, approvedUnsettledRefundCount] = await Promise.all([
      completedOrderBuilder.getCount(),
      approvedRefundBuilder.getCount()
    ]);
    return [
      activeOrderCount ? `${activeOrderCount} 笔未完成订单` : "",
      pendingRefundCount ? `${pendingRefundCount} 笔待处理/失败售后` : "",
      openSettlementCount ? `${openSettlementCount} 张待完成结算单` : "",
      completedUnsettledOrderCount ? `${completedUnsettledOrderCount} 笔已完成但未结算订单` : "",
      approvedUnsettledRefundCount ? `${approvedUnsettledRefundCount} 笔已退款但未入结算退款` : ""
    ].filter(Boolean);
  }

  private async assertMerchantAccessDisableAllowed(access: AdminMallMerchantAccess) {
    const merchant = access.merchant;
    if (access.enabled || merchant.status !== "active" || !merchant.mallEnabled) return;
    const builder = this.merchantAccess
      .createQueryBuilder("access")
      .where("access.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("access.enabled = :enabled", { enabled: true });
    if (access.id) builder.andWhere("access.id <> :accessId", { accessId: access.id });
    const otherEnabledAccessCount = await builder.getCount();
    if (otherEnabledAccessCount > 0) return;
    throw new BadRequestException("商城店铺已开放运营，不能停用最后一个授权后台账号；请先新增并启用其它店铺管理员/运营/财务账号，或先关闭商城后再停用。");
  }

  private async assertMerchantDirectOpenReady(merchant: MallMerchant) {
    if (merchant.paymentMode !== "merchant_direct" || merchant.status !== "active" || !merchant.mallEnabled) return;
    if (!merchant.id) {
      throw new BadRequestException("商户直收店铺必须先以未开放状态创建，配置并启用店铺收款账户后，再开通商城。");
    }
    const wechatAccount = await this.merchantPaymentAccounts.findOne({ where: { merchant: { id: merchant.id }, provider: PaymentMethod.Wechat, enabled: true } });
    if (!wechatAccount) {
      throw new BadRequestException("商户直收店铺必须先配置并启用完整的微信支付收款账户，再开通商城；支付宝账户可先保存为后续扩展配置。");
    }
    this.assertMerchantPaymentAccountReady(wechatAccount);
  }

  private async assertMerchantPaymentAccountDisableAllowed(account: MallMerchantPaymentAccount) {
    const merchant = account.merchant;
    if (account.provider !== PaymentMethod.Wechat || merchant.paymentMode !== "merchant_direct" || merchant.status !== "active" || !merchant.mallEnabled) return;
    const builder = this.merchantPaymentAccounts
      .createQueryBuilder("account")
      .where("account.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("account.provider = :provider", { provider: PaymentMethod.Wechat })
      .andWhere("account.enabled = :enabled", { enabled: true });
    if (account.id) builder.andWhere("account.id <> :accountId", { accountId: account.id });
    const otherEnabledWechatAccounts = await builder.getCount();
    if (otherEnabledWechatAccounts > 0) return;
    throw new BadRequestException("商户直收店铺已开放商城，不能停用最后一个微信支付收款账户；请先关闭商城或切换为平台代收并处理完订单、售后和结算，再停用该账户。");
  }

  private async merchantBusinessDataLabels(merchantId: number) {
    const checks = await Promise.all([
      this.categories.count({ where: { merchant: { id: merchantId } } }).then((count) => ["店铺分类", count] as const),
      this.products.count({ where: { merchant: { id: merchantId } } }).then((count) => ["商品", count] as const),
      this.orders.count({ where: { merchant: { id: merchantId } } }).then((count) => ["订单", count] as const),
      this.merchantPaymentAccounts.count({ where: { merchant: { id: merchantId } } }).then((count) => ["收款账户", count] as const),
      this.settlements.count({ where: { merchant: { id: merchantId } } }).then((count) => ["结算单", count] as const)
    ]);
    return checks.filter(([, count]) => count > 0).map(([label]) => label);
  }

  private async adminAllowedMerchantIds(admin?: AdminContext, requiredPermission?: MerchantPermissionRequirement) {
    if (!admin?.id || this.isPlatformMallWideContext(admin)) return null;
    const now = new Date();
    const rows = await this.merchantAccess.createQueryBuilder("access").leftJoinAndSelect("access.merchant", "merchant")
      .where("access.adminId = :adminId", { adminId: admin.id })
      .andWhere("access.enabled = :enabled", { enabled: true })
      .andWhere("(access.validFrom IS NULL OR access.validFrom <= :now)", { now })
      .andWhere("(access.validUntil IS NULL OR access.validUntil > :now)", { now })
      .getMany();
    return rows
      .filter((row) => merchantAccessIsActive(row, now))
      .filter((row) => merchantAccessAllows(row, requiredPermission, this.defaultMerchantAccessPermissions(row.accessRole)))
      .map((row) => row.merchant.id);
  }

  private async assertMerchantGovernanceReady(merchant: MallMerchant) {
    const today = this.localDateText(new Date());
    const [contract, qualification] = await Promise.all([
      this.merchantContracts.createQueryBuilder("contract").where("contract.merchantId = :merchantId", { merchantId: merchant.id }).andWhere("contract.status = 'active'").andWhere("contract.startsAt <= :today AND contract.endsAt >= :today", { today }).getOne(),
      this.merchantQualifications.createQueryBuilder("qualification").where("qualification.merchantId = :merchantId", { merchantId: merchant.id }).andWhere("qualification.status = 'approved'").andWhere("(qualification.validUntil IS NULL OR qualification.validUntil >= :today)", { today }).getOne()
    ]);
    if (!contract) throw new BadRequestException("店铺还没有当前生效合同，不能开通商城");
    if (!qualification) throw new BadRequestException("店铺还没有有效且已审核的资质，不能开通商城");
  }

  private async assertAdminMerchantAccess(merchant: MallMerchant, admin?: AdminContext, requiredPermission?: MerchantPermissionRequirement) {
    if (!admin?.id || this.isPlatformMallWideContext(admin)) return;
    let scopedMerchant = merchant;
    if (admin.tenantId && !scopedMerchant.tenant?.id && scopedMerchant.id) {
      scopedMerchant = await this.merchants.findOne({ where: { id: scopedMerchant.id }, relations: ["tenant"], loadEagerRelations: false }) || scopedMerchant;
    }
    if (admin.tenantId && scopedMerchant.tenant?.id !== admin.tenantId) throw new ForbiddenException("店铺不属于当前商家");
    const allowedIds = await this.adminAllowedMerchantIds(admin, requiredPermission);
    if (allowedIds !== null && !allowedIds.includes(merchant.id)) {
      const suffix = requiredPermission ? "或缺少本次操作权限" : "";
      throw new ForbiddenException(`当前账号未被授权管理该商城店铺${suffix}，请联系平台管理员在「店铺管理」中授权`);
    }
  }

  private async assertAdminRowMerchantAccess(row: { tenant?: Tenant | null; merchant?: MallMerchant | null }, admin?: AdminContext, label = "商城数据", requiredPermission?: MerchantPermissionRequirement) {
    const merchant = row.merchant || null;
    if (!merchant) throw new BadRequestException(`${label}缺少店铺归属，请先执行多商户商城迁移回填后再操作`);
    await this.assertAdminMerchantAccess(merchant, admin, requiredPermission);
  }

  private async assertExistingMerchantScope(row: { tenant?: Tenant | null; merchant?: MallMerchant | null }, targetMerchant: MallMerchant, admin?: AdminContext, label = "商城数据") {
    await this.assertAdminRowMerchantAccess(row, admin, label);
    if (row.merchant!.id !== targetMerchant.id) {
      throw new BadRequestException(`${label}已归属「${row.merchant!.name}」，不能在编辑时切换到其他店铺；请在目标店铺新建。`);
    }
  }

  private assertPlatformMallAuditAdmin(admin?: AdminContext) {
    if (!this.isPlatformAdminContext(admin)) throw new ForbiddenException("商品审核只能由平台超级管理员处理，请联系平台审核商品");
  }

  private assertPlatformMallSettlementAdmin(admin?: AdminContext) {
    const role = String(admin?.role || "");
    if (!admin?.tenantId && ["super_admin", "admin", "finance"].includes(role)) return;
    throw new ForbiddenException("商城结算生成、审核和打款只能由平台财务处理，请联系平台财务操作");
  }

  private assertMallEnabled(tenant: Tenant) {
    const settings = tenant.settings && typeof tenant.settings === "object" && !Array.isArray(tenant.settings) ? tenant.settings : {};
    if (settings.mallEnabled === false) throw new ForbiddenException("当前商家未开通商城，请先在商家/代理列表授权商城");
    const access = tenantFeatureAccess(settings, "mall");
    if (!access.allowed) throw new ForbiddenException(access.reason || "当前套餐未开通商城");
  }

  private async assertTenantWideMallPermission(admin: AdminContext | undefined, permission: MerchantPermissionRequirement, label: string) {
    const allowedIds = await this.adminAllowedMerchantIds(admin, permission);
    if (allowedIds !== null) throw new ForbiddenException(`${label}只能由具备全部店铺数据范围的管理员维护`);
  }

  private assertMallWritable(tenant: Tenant) {
    this.assertMallEnabled(tenant);
    const settings = tenant.settings && typeof tenant.settings === "object" && !Array.isArray(tenant.settings) ? tenant.settings : {};
    const restriction = tenantSubscriptionWriteRestriction(settings);
    if (restriction) throw new ForbiddenException(restriction.message);
  }

  private assertMallQuota(tenant: Tenant, quota: "products" | "merchants", used: number, requested = 1) {
    const settings = tenant.settings && typeof tenant.settings === "object" && !Array.isArray(tenant.settings) ? tenant.settings : {};
    const access = tenantQuotaAccess(settings, quota, used, requested);
    if (!access.allowed) throw new ForbiddenException(`${access.reason}，请升级套餐或调整配额后继续`);
  }

  private assertMerchantEnabled(merchant: MallMerchant) {
    if (merchant.status !== "active" || !merchant.mallEnabled) throw new ForbiddenException("当前店铺未开通商城，请先在商城店铺管理中启用");
    if (["suspended", "expired", "rejected"].includes(merchant.onboardingStatus)) throw new ForbiddenException(merchant.suspensionReason || "店铺资质或合同状态异常，已暂停对外经营");
  }

  private async assertPaymentMethodEnabled(method: PaymentMethod, tenant: Tenant, merchant?: MallMerchant | null) {
    const setting = await this.operationSettings.findOne({ where: { tenant: { id: tenant.id } } });
    const methods = this.normalizePaymentMethods(setting?.paymentMethods);
    if (method === PaymentMethod.Balance && methods.balance) return;
    if (method === PaymentMethod.Offline && methods.offline) return;
    if (method === PaymentMethod.Wechat) {
      const readiness = await this.mallWechatPaymentReadinessForMerchant(tenant, merchant || null, methods);
      if (await this.paymentProvider.usesRealProvider("wechat")) {
        if (readiness.status === "real_ready") return;
        throw new BadRequestException(readiness.issues[0] || "商城真实微信支付未完成上线联调，请联系平台财务处理");
      }
      if (["sandbox_ready", "real_ready"].includes(readiness.status)) return;
      throw new BadRequestException(readiness.issues[0] || "微信支付配置未就绪，请联系商家");
    }
    const label = method === PaymentMethod.Balance ? "余额支付" : "线下收款";
    throw new BadRequestException(`${label}暂未开放，请联系商家`);
  }

  private async assertPaymentMethodOperationEnabled(method: PaymentMethod, tenant: Tenant) {
    const setting = await this.operationSettings.findOne({ where: { tenant: { id: tenant.id } } });
    const methods = this.normalizePaymentMethods(setting?.paymentMethods);
    if (method === PaymentMethod.Balance && methods.balance) return;
    if (method === PaymentMethod.Offline && methods.offline) return;
    if (method === PaymentMethod.Wechat && methods.wechat) return;
    const label = method === PaymentMethod.Wechat ? "微信支付" : method === PaymentMethod.Balance ? "余额支付" : "线下收款";
    throw new BadRequestException(`${label}暂未开放，请联系商家`);
  }

  private normalizePaymentMethods(value: unknown) {
    const input = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    return {
      wechat: input.wechat === undefined ? false : Boolean(input.wechat),
      balance: input.balance === undefined ? true : Boolean(input.balance),
      offline: input.offline === undefined ? true : Boolean(input.offline)
    };
  }

  private assertAdminTenantAccess(row: { tenant?: Tenant | null }, admin?: AdminContext) {
    assertTenantAccessForActor(row, admin, "商城数据不存在或不属于当前商家");
  }

  private async adminMallBatchScope(admin?: AdminContext): Promise<MallBatchScope> {
    if (!admin?.id) return { type: "system", tenantId: null, merchantIds: null };
    if (this.isPlatformMallWideContext(admin)) return { type: "platform", tenantId: null, merchantIds: null };
    const tenant = await this.adminTargetTenant(admin, undefined);
    if (!tenant) throw new BadRequestException("请选择要执行商城批量任务的商家");
    const allowedIds = await this.adminAllowedMerchantIds(admin);
    if (allowedIds !== null && !allowedIds.length) {
      throw new ForbiddenException("当前账号还没有授权任何商城店铺，请联系平台管理员在「店铺管理」中授权后再执行批量任务");
    }
    return { type: "authorized_merchants", tenantId: tenant.id, merchantIds: allowedIds };
  }

  private mallBatchWhere(scope: MallBatchScope, condition: Record<string, unknown>) {
    const where: Record<string, unknown> = { ...condition };
    if (scope.tenantId) where.tenant = { id: scope.tenantId };
    if (scope.merchantIds) where.merchant = { id: In(scope.merchantIds) };
    return where;
  }

  private applyMallBatchScope(builder: SelectQueryBuilder<any>, alias: string, scope: MallBatchScope) {
    if (scope.tenantId) builder.andWhere(`${alias}.tenantId = :batchTenantId`, { batchTenantId: scope.tenantId });
    if (scope.merchantIds) builder.andWhere(`${alias}.merchantId IN (:...batchMerchantIds)`, { batchMerchantIds: scope.merchantIds });
  }

  private publicMallBatchScope(scope: MallBatchScope) {
    return { type: scope.type, tenantId: scope.tenantId, merchantIds: scope.merchantIds || [] };
  }

  private applyTenantFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, tenant: Tenant | null) {
    if (tenant) builder.andWhere(`${alias}.tenantId = :tenantId`, { tenantId: tenant.id });
  }

  private applyMerchantFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, merchant: MallMerchant | null) {
    if (merchant) builder.andWhere(`${alias}.merchantId = :merchantId`, { merchantId: merchant.id });
  }

  private isPlatformAdminContext(admin?: AdminContext) {
    return (admin?.role === "super_admin" || admin?.role === "admin") && !admin?.tenantId;
  }

  private isPlatformMallWideContext(admin?: AdminContext) {
    return ["super_admin", "admin", "finance"].includes(String(admin?.role || "")) && !admin?.tenantId;
  }

  private normalizeMerchantCode(value: unknown) {
    const text = String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!text) throw new BadRequestException("请填写店铺编码");
    return text.slice(0, 80);
  }

  private walletTenantScopeKey(tenant?: Tenant | null) {
    return tenant?.id ? String(tenant.id) : "platform";
  }

  private requiredString(value: unknown, label: string) {
    const text = String(value || "").trim();
    if (!text) throw new BadRequestException(`请填写${label}`);
    return text;
  }

  private optionalString(value: unknown) {
    const text = String(value || "").trim();
    return text || null;
  }

  private assertMallAfterSaleAction(status: MallRefund["status"], action: string) {
    try {
      assertMallAfterSaleTransition(status, action);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "当前售后状态不允许该操作");
    }
  }

  private async createMallRefundMessage(
    refund: MallRefund,
    actorType: MallRefundMessage["actorType"],
    actorName: string,
    dto: Pick<MallRefundMessageDto, "content" | "images">,
    messageType: MallRefundMessage["messageType"] = "message",
    detail: Record<string, unknown> | null = null,
    manager?: Pick<DataSource["manager"], "getRepository">
  ) {
    const repo = manager ? manager.getRepository(MallRefundMessage) : this.refundMessages;
    const images = Array.isArray(dto.images) ? dto.images.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [];
    return repo.save(repo.create({ tenant: refund.tenant, refund, actorType, actorName, messageType, content: this.requiredString(dto.content, "协商内容").slice(0, 2000), images, detail }));
  }

  private escapeSqlLike(value: unknown) {
    return String(value || "").replace(/[!%_]/g, (char) => `!${char}`);
  }

  private publicMallPaymentCallbackLog(row: MallPaymentCallbackLog) {
    return { ...row, payload: this.sanitizeMallProviderPayload(row.payload || {}) };
  }

  private publicMallRefundLog(row: MallRefundLog) {
    return { ...row, payload: this.sanitizeMallProviderPayload(row.payload || null) };
  }

  private publicMallRefund(row: MallRefund) {
    const detail = row as MallRefund & { items?: MallRefundItem[]; messages?: MallRefundMessage[]; exchangeShipment?: MallShipment | null };
    const { tenant, merchant, user, order, businessSnapshot: _businessSnapshot, ...safeRow } = row;
    return {
      ...safeRow,
      tenant: tenant ? { id: tenant.id, code: tenant.code, name: tenant.name } : null,
      merchant: merchant ? { id: merchant.id, code: merchant.code, name: merchant.name, ownerType: merchant.ownerType } : null,
      user: user ? { id: user.id, nickname: user.nickname, phone: maskPhone(user.phone) } : null,
      order: order ? {
        id: order.id,
        orderNo: order.orderNo,
        amount: order.amount,
        amountFen: order.amountFen,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        paymentMethod: order.paymentMethod,
        checkoutGroup: order.checkoutGroup ? { id: order.checkoutGroup.id, groupNo: order.checkoutGroup.groupNo, status: order.checkoutGroup.status } : null,
        merchant: order.merchant ? { id: order.merchant.id, code: order.merchant.code, name: order.merchant.name, ownerType: order.merchant.ownerType } : null,
        tenant: order.tenant ? { id: order.tenant.id, code: order.tenant.code, name: order.tenant.name } : null
      } : null,
      providerRefundPayload: this.sanitizeMallProviderPayload(row.providerRefundPayload || null),
      items: (detail.items || []).map((item) => ({ id: item.id, orderItemId: item.orderItem.id, requestedQuantity: item.requestedQuantity, approvedQuantity: item.approvedQuantity, receivedQuantity: item.receivedQuantity, stockRestoredQuantity: item.stockRestoredQuantity, refundableAmount: fenToYuan(item.refundableAmountFen), refundedAmount: fenToYuan(item.refundedAmountFen), itemSnapshot: item.itemSnapshot })),
      messages: (detail.messages || []).map((message) => ({ id: message.id, actorType: message.actorType, actorName: message.actorName, messageType: message.messageType, content: message.content, images: message.images || [], detail: message.detail, createdAt: message.createdAt })),
      exchangeShipment: detail.exchangeShipment ? { id: detail.exchangeShipment.id, shipmentNo: detail.exchangeShipment.shipmentNo, expressCompany: detail.exchangeShipment.expressCompany, expressNo: detail.exchangeShipment.expressNo, status: detail.exchangeShipment.status, shippedAt: detail.exchangeShipment.shippedAt, deliveredAt: detail.exchangeShipment.deliveredAt } : null
    };
  }

  private sanitizeMallProviderPayload(payload: unknown, depth = 0): unknown {
    if (payload === null || payload === undefined) return payload;
    if (payload instanceof Date) return payload.toISOString();
    if (typeof payload === "string") return this.sanitizeMallProviderPayloadString(payload);
    if (typeof payload !== "object") return payload;
    if (depth >= MALL_PROVIDER_PAYLOAD_MAX_DEPTH) return "[已折叠：层级过深]";

    if (Array.isArray(payload)) {
      const values = payload.slice(0, MALL_PROVIDER_PAYLOAD_MAX_ARRAY).map((item) => this.sanitizeMallProviderPayload(item, depth + 1));
      if (payload.length > MALL_PROVIDER_PAYLOAD_MAX_ARRAY) values.push(`[已截断：共 ${payload.length} 项]`);
      return values;
    }

    const sanitized: Record<string, unknown> = {};
    const entries = Object.entries(payload as Record<string, unknown>);
    for (const [key, value] of entries.slice(0, MALL_PROVIDER_PAYLOAD_MAX_KEYS)) {
      sanitized[key] = this.isSensitiveMallProviderPayloadKey(key) && value ? MALL_PROVIDER_PAYLOAD_MASK : this.sanitizeMallProviderPayload(value, depth + 1);
    }
    if (entries.length > MALL_PROVIDER_PAYLOAD_MAX_KEYS) sanitized._truncated = `已截断：共 ${entries.length} 个字段`;
    return sanitized;
  }

  private isSensitiveMallProviderPayloadKey(key: string) {
    return /secret|private|api.?v3|key|cert|token|password|signature|authorization|openid|payer|resource|ciphertext|nonce|associated_?data|raw_?body|encrypt|decrypt/i.test(key);
  }

  private sanitizeMallProviderPayloadString(value: string) {
    if (/-----BEGIN [^-]*(PRIVATE KEY|CERTIFICATE)|wechatpay-signature|authorization:|<sign>|"sign"\s*:|api[_-]?v3/i.test(value)) return MALL_PROVIDER_PAYLOAD_MASK;
    return value.length > MALL_PROVIDER_PAYLOAD_MAX_STRING ? `${value.slice(0, MALL_PROVIDER_PAYLOAD_MAX_STRING)}...（已截断，原长度 ${value.length}）` : value;
  }

  private publicMerchantPaymentAccount(row: MallMerchantPaymentAccount) {
    return { ...row, config: this.maskPaymentConfig(row.config) };
  }

  private maskPaymentConfig(config: Record<string, unknown> | null) {
    if (!config) return null;
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      masked[key] = /secret|key|cert|token|password/i.test(key) && value ? "***" : value;
    }
    return masked;
  }

  private mergeMaskedPaymentConfig(next: Record<string, unknown> | null, current: Record<string, unknown> | null) {
    if (!next) return null;
    const merged: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(next)) {
      merged[key] = value === "***" && current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : value;
    }
    return merged;
  }

  private assertMerchantPaymentAccountReady(account: MallMerchantPaymentAccount) {
    const missing = this.merchantPaymentAccountMissingFields(account);
    if (missing.length) {
      const provider = account.provider === PaymentMethod.Wechat ? "微信支付" : "支付宝";
      throw new BadRequestException(`启用${provider}收款账户前，请先填写完整资料：${missing.join("、")}。如资料还没准备好，请先保存为停用草稿。`);
    }
  }

  private merchantPaymentAccountMissingFields(account: MallMerchantPaymentAccount) {
    const config = account.config && typeof account.config === "object" && !Array.isArray(account.config) ? account.config : {};
    const keys = account.provider === PaymentMethod.Wechat
      ? ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_PLATFORM_CERT_PATH"]
      : ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY_PATH", "ALIPAY_PUBLIC_CERT_PATH", "ALIPAY_ROOT_CERT_PATH"];
    const missing = keys.filter((key) => !String((config as Record<string, unknown>)[key] || "").trim());
    if (!String(account.merchantNo || "").trim()) missing.unshift("商户号");
    return missing;
  }

  private paymentConfigValues(config: Record<string, unknown> | null) {
    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(config || {})) {
      if (value !== undefined && value !== null) values[key] = String(value);
    }
    return values;
  }

  private normalizeSettlementDate(value: unknown, label: string) {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(`${text}T00:00:00`).getTime())) throw new BadRequestException(`${label}格式应为 YYYY-MM-DD`);
    return text;
  }

  private nextMallSettlementNo() {
    const date = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    return `MS${stamp}${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
  }

  private normalizeSettlementBusinessKey(value: unknown, fallback: string) {
    const key = String(value || fallback).trim();
    if (!/^[A-Za-z0-9:_-]{8,160}$/.test(key)) throw new BadRequestException("结算业务防重键格式不正确，仅支持 8-160 位字母、数字、冒号、下划线和短横线");
    return key;
  }

  private mallEntityAmountFen(frozenFen: unknown, amount: string | number | null | undefined) {
    const parsed = Number(frozenFen);
    if (Number.isSafeInteger(parsed) && (parsed !== 0 || yuanToFen(amount) === 0)) return parsed;
    return yuanToFen(amount);
  }

  private mallSettlementStoredAmounts(settlement: MallSettlement) {
    return {
      netFen: yuanToFen(settlement.netAmount),
      platformCollectedFen: yuanToFen(settlement.platformCollectedAmount),
      merchantDirectFen: yuanToFen(settlement.merchantDirectAmount),
      serviceFeeFen: yuanToFen(settlement.serviceFeeAmount),
      commissionFen: yuanToFen(settlement.commissionAmount),
      commissionClawbackFen: yuanToFen(settlement.commissionClawbackAmount),
      adjustmentFen: yuanToFen(settlement.adjustmentAmount),
      payableFen: yuanToFen(settlement.payableAmount)
    };
  }

  private async assertMallSettlementLedgerConsistent(manager: Pick<DataSource["manager"], "getRepository">, settlement: MallSettlement) {
    const lines = await manager.getRepository(MallSettlementLine).find({ where: { settlement: { id: settlement.id } }, loadEagerRelations: false });
    if (settlement.calculationVersion === "legacy_v1" && !lines.length) return;
    const linePayableFen = lines.reduce((sum, line) => sum + yuanToFen(line.payableAmount), 0);
    const consistency = mallSettlementConsistency(this.mallSettlementStoredAmounts(settlement), linePayableFen);
    if (!consistency.consistent || lines.length !== Number(settlement.lineCount || 0)) throw new BadRequestException(`结算账本校验失败：主单 ${settlement.payableAmount}，明细合计 ${fenToYuan(linePayableFen)}，请重新生成或补充调整后再审核`);
  }

  private mallSettlementEventSnapshot(settlement: MallSettlement) {
    return {
      settlementNo: settlement.settlementNo,
      businessKey: settlement.businessKey,
      status: settlement.status,
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      calculationVersion: settlement.calculationVersion,
      lineCount: settlement.lineCount,
      orderAmount: settlement.orderAmount,
      refundAmount: settlement.refundAmount,
      netAmount: settlement.netAmount,
      platformCollectedAmount: settlement.platformCollectedAmount,
      merchantDirectAmount: settlement.merchantDirectAmount,
      serviceFeeAmount: settlement.serviceFeeAmount,
      commissionAmount: settlement.commissionAmount,
      commissionClawbackAmount: settlement.commissionClawbackAmount,
      adjustmentAmount: settlement.adjustmentAmount,
      payableAmount: settlement.payableAmount
    };
  }

  private async saveMallSettlementEvent(manager: Pick<DataSource["manager"], "getRepository">, settlement: MallSettlement, input: {
    eventKey: string;
    action: MallSettlementEvent["action"];
    fromStatus: string | null;
    toStatus: string;
    admin?: AdminContext;
    remark?: string | null;
    snapshot?: Record<string, unknown> | null;
  }) {
    const repo = manager.getRepository(MallSettlementEvent);
    const replay = await repo.findOne({ where: { eventKey: input.eventKey }, relations: ["settlement"], loadEagerRelations: false });
    if (replay) {
      if (replay.settlement.id !== settlement.id) throw new ForbiddenException("结算事件业务键已被其他结算单使用");
      return replay;
    }
    return repo.save(repo.create({ tenant: settlement.tenant, merchant: settlement.merchant, settlement, eventKey: input.eventKey, action: input.action, fromStatus: input.fromStatus, toStatus: input.toStatus, operatorAdminId: input.admin?.id || null, operator: input.admin?.username || "system", remark: input.remark || null, snapshot: input.snapshot || null }));
  }

  private publicMallSettlementLine(line: MallSettlementLine) {
    return {
      id: line.id,
      lineType: line.lineType,
      sourceType: line.sourceType,
      sourceId: line.sourceId,
      businessNo: line.businessNo,
      direction: line.direction,
      grossAmount: line.grossAmount,
      feeAmount: line.feeAmount,
      commissionAmount: line.commissionAmount,
      payableAmount: line.payableAmount,
      order: line.order ? { id: line.order.id, orderNo: line.order.orderNo, amount: line.order.amount, paymentMethod: line.order.paymentMethod, status: line.order.status } : null,
      refund: line.refund ? { id: line.refund.id, refundNo: line.refund.refundNo, amount: line.refund.amount, status: line.refund.status } : null,
      commission: line.commission ? { id: line.commission.id, code: line.commission.code, beneficiaryType: line.commission.beneficiaryType, beneficiaryKey: line.commission.beneficiaryKey, beneficiaryLevel: line.commission.beneficiaryLevel, status: line.commission.status } : null,
      snapshot: line.snapshot,
      remark: line.remark,
      createdAt: line.createdAt
    };
  }

  private mallSettlementPublicConfig(value: unknown) {
    const config = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const allowed = ["payoutAccountName", "payoutBankName", "payoutBankAccount", "payoutAlipayAccount", "settlementCycleDays", "serviceFeeRate", "platformServiceFeeRate", "source", "legalName"];
    return Object.fromEntries(allowed.filter((key) => config[key] !== undefined && config[key] !== null).map((key) => [key, config[key]]));
  }

  private async mallSettlementPaymentAccountSnapshot(manager: Pick<DataSource["manager"], "getRepository">, merchant: MallMerchant) {
    const accounts = await manager.getRepository(MallMerchantPaymentAccount).find({ where: { merchant: { id: merchant.id }, enabled: true }, order: { id: "ASC" } });
    return {
      merchantId: merchant.id,
      merchantCode: merchant.code,
      merchantName: merchant.name,
      paymentMode: merchant.paymentMode,
      contactName: merchant.contactName,
      contactPhone: merchant.contactPhone,
      settlementConfig: this.mallSettlementPublicConfig(merchant.settlementConfig),
      collectionAccounts: accounts.map((account) => ({ id: account.id, provider: account.provider, merchantName: account.merchantName, merchantNo: account.merchantNo, enabled: account.enabled }))
    };
  }

  private mallSettlementServiceFeeBps(merchant?: MallMerchant | null) {
    if (Number(merchant?.serviceFeeBps || 0) > 0) return Math.min(Math.max(Math.round(Number(merchant?.serviceFeeBps || 0)), 0), 10000);
    const config = merchant?.settlementConfig && typeof merchant.settlementConfig === "object" && !Array.isArray(merchant.settlementConfig) ? merchant.settlementConfig : {};
    const raw = Number((config as Record<string, unknown>).platformServiceFeeRate ?? (config as Record<string, unknown>).serviceFeeRate ?? 0);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(Math.max(Math.round((raw > 1 ? raw / 100 : raw) * 10000), 0), 10000);
  }

  private mallSettlementServiceFeeRate(merchant?: MallMerchant | null) {
    return this.mallSettlementServiceFeeBps(merchant) / 10000;
  }

  private mallSettlementAmounts(orderAmount: number, refundAmount: number, merchantDirectOrderAmount: number, merchantDirectRefundAmount: number, merchant?: MallMerchant | null) {
    const amounts = calculateMallSettlementAmounts({ orderFen: yuanToFen(orderAmount.toFixed(2)), refundFen: yuanToFen(refundAmount.toFixed(2)), merchantDirectOrderFen: yuanToFen(merchantDirectOrderAmount.toFixed(2)), merchantDirectRefundFen: yuanToFen(merchantDirectRefundAmount.toFixed(2)), serviceFeeBps: this.mallSettlementServiceFeeBps(merchant) });
    return { netAmount: amounts.netFen / 100, merchantDirectNetAmount: amounts.merchantDirectFen / 100, platformCollectedNetAmount: amounts.platformCollectedFen / 100, serviceFeeRate: this.mallSettlementServiceFeeRate(merchant), serviceFeeAmount: amounts.serviceFeeFen / 100, payableAmount: amounts.payableFen / 100 };
  }

  private isMerchantDirectCollectedSettlementOrder(order: MallOrder | null | undefined, merchant?: MallMerchant | null) {
    if (!order) return false;
    const paymentMode = order.merchant?.paymentMode || merchant?.paymentMode || "platform_collect";
    return paymentMode === "merchant_direct" && order.paymentMethod !== PaymentMethod.Balance;
  }

  private mergeRemark(current: string | null | undefined, next: unknown) {
    const text = this.optionalString(next);
    if (!text) return current || null;
    return current ? `${current}\n${text}` : text;
  }

  private normalizeClientOrderKey(value: unknown) {
    const text = String(value || "").trim();
    if (!text) return null;
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(text)) throw new BadRequestException("订单防重标识格式不正确");
    return text;
  }

  private maskMallGroupBuyUser(user?: User | null) {
    const name = String(user?.nickname || "").trim();
    if (name) return name;
    const phone = String(user?.phone || "").trim();
    return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : "书友";
  }

  private normalizeCouponCode(value: unknown) {
    const text = String(value || "").trim().toUpperCase();
    if (!text) throw new BadRequestException("请填写优惠券码");
    if (!/^[A-Z0-9_-]{3,40}$/.test(text)) throw new BadRequestException("优惠券码仅支持 3-40 位字母、数字、下划线或横线");
    return text;
  }

  private normalizeCouponScope(value: unknown) {
    const scope = String(value || "all").trim();
    if (["all", "category", "product"].includes(scope)) return scope as MallCoupon["scope"];
    throw new BadRequestException("优惠券适用范围不正确");
  }

  private async assertCouponCodeAvailable(tenant: Tenant, code: string, currentId?: number) {
    const existing = await this.coupons.findOne({ where: { tenant: { id: tenant.id }, code } });
    if (existing && existing.id !== currentId) throw new BadRequestException("同一商家下优惠券码已存在，请换一个券码，避免用户和运营核销时混淆。");
  }

  private assertCouponConfigurationValid(coupon: MallCoupon, minAmount: number, discountAmount: number, usageLimit: number, issuanceLimit: number, perUserLimit: number) {
    if (minAmount > 0 && discountAmount > minAmount) throw new BadRequestException("有门槛优惠券的优惠金额不能大于使用门槛；如需无门槛券，请把门槛设置为 0。");
    if (usageLimit > 0 && perUserLimit > usageLimit) throw new BadRequestException("每人可用次数不能大于总可用次数；如需不限每人次数，请把每人次数设置为 0。");
    const usedCount = Math.max(Math.trunc(Number(coupon.usedCount || 0)), 0);
    if (usageLimit > 0 && usageLimit < usedCount) throw new BadRequestException(`优惠券总次数不能小于已使用次数 ${usedCount}；如需停止继续使用，请直接停用优惠券。`);
    const claimedCount = Math.max(Math.trunc(Number(coupon.claimedCount || 0)), 0);
    if (issuanceLimit > 0 && issuanceLimit < claimedCount) throw new BadRequestException(`优惠券发放总量不能小于已领取数量 ${claimedCount}；如需停止继续领取，请直接停用优惠券。`);
  }

  private normalizePromotionCode(value: unknown) {
    const text = String(value || "").trim().toUpperCase();
    if (!text) return "";
    if (!/^[A-Z0-9_-]{3,40}$/.test(text)) throw new BadRequestException("推广码仅支持 3-40 位字母、数字、下划线或横线");
    return text;
  }

  private async assertPromotionCodeAvailable(code: string, currentId?: number) {
    const existing = await this.promotionCodes.findOne({ where: { code }, loadEagerRelations: false });
    if (existing && existing.id !== currentId) throw new BadRequestException("推广码已存在，请换一个推广码，避免佣金归属和用户识别混淆。");
  }

  private assertPromotionTargetScope(tenant: Tenant, promoterUser: User | null, agent: Agent | null) {
    if (promoterUser && agent) throw new BadRequestException("推广码不能同时绑定代理和推广用户，请只保留一个佣金归属对象。");
    if (agent && agent.tenant?.id !== tenant.id) throw new BadRequestException("所选代理不属于当前商家，不能绑定到该店铺推广码。");
  }

  private async assertPromotionCodeAccountingFieldsCanChange(row: MallPromotionCode, next: { code: string; promoterUser: User | null; agent: Agent | null; commissionRate: number }) {
    if (!row.id) return;
    const commissionCount = await this.commissions
      .createQueryBuilder("commission")
      .where("commission.promotionCodeId = :promotionCodeId", { promotionCodeId: row.id })
      .getCount();
    const hasAccountingRecords = commissionCount > 0 || Number(row.orderCount || 0) > 0 || Number(row.orderAmount || 0) > 0;
    if (!hasAccountingRecords) return;
    const codeChanged = row.code !== next.code;
    const promoterChanged = (row.promoterUser?.id || null) !== (next.promoterUser?.id || null);
    const agentChanged = (row.agent?.id || null) !== (next.agent?.id || null);
    const rateChanged = Math.abs(Number(row.commissionRate || 0) - next.commissionRate) > 0.00005;
    if (codeChanged || promoterChanged || agentChanged || rateChanged) throw new BadRequestException("该推广码已有订单或佣金记录，不能修改推广码、绑定对象或佣金比例；如需调整，请停用旧推广码后新建。");
  }

  private optionalDate(value: unknown) {
    const text = String(value || "").trim();
    if (!text) return null;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) throw new BadRequestException("时间格式不正确");
    return date;
  }

  private localDateText(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private normalizeCatalogCode(value: unknown, label: string) {
    const code = normalizeMallCatalogCode(value);
    if (!code) throw new BadRequestException(`请填写${label}`);
    return code;
  }

  private normalizeUrlList(value: unknown, fallback?: string | null) {
    const rows = Array.isArray(value) ? value : [];
    const normalized = Array.from(new Set(rows.map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 20);
    if (!normalized.length && fallback) normalized.push(fallback);
    return normalized;
  }

  private normalizeStringMap(value: unknown) {
    return normalizeMallCatalogAttributes(value);
  }

  private async productGovernanceSnapshot(product: MallProduct) {
    const skus = await this.skus.find({ where: { product: { id: product.id } }, order: { sortOrder: "ASC", id: "ASC" } });
    return {
      productId: product.id, productCode: product.productCode, contentVersion: product.contentVersion, title: product.title,
      merchantId: product.merchant?.id || null, platformCategory: product.platformCategory ? { id: product.platformCategory.id, code: product.platformCategory.code, name: product.platformCategory.name } : null,
      storeCategory: product.category ? { id: product.category.id, code: product.category.code, name: product.category.name } : null,
      brand: product.brand ? { id: product.brand.id, code: product.brand.code, name: product.brand.name } : product.brandName ? { name: product.brandName } : null,
      coverUrl: product.coverUrl, galleryUrls: product.galleryUrls || [], description: product.description, detailBlocks: product.detailBlocks || [], attributes: product.attributes || {},
      price: product.price, originalPrice: product.originalPrice, deliveryNote: product.deliveryNote, afterSaleNote: product.afterSaleNote,
      skus: skus.map((sku) => ({ id: sku.id, name: sku.name, skuCode: sku.skuCode, barcode: sku.barcode, attributes: sku.attributes || {}, weightGrams: sku.weightGrams, price: sku.price, originalPrice: sku.originalPrice, stock: sku.stock, enabled: sku.enabled }))
    };
  }

  private async recordProductAudit(product: MallProduct, action: MallProductAuditLog["action"], fromStatus: string, toStatus: string, remark: string | null, admin?: AdminContext) {
    return this.productAuditLogs.save(this.productAuditLogs.create({ tenant: product.tenant, merchant: product.merchant, product, action, fromStatus, toStatus, remark, snapshot: await this.productGovernanceSnapshot(product), operatorAdminId: admin?.id || null, operatorName: admin?.username || null }));
  }

  private orderProductSnapshot(product: MallProduct) {
    return mallOrderProductSnapshot(product);
  }

  private orderSkuSnapshot(sku: MallSku, displayName: string, price: number) {
    return mallOrderSkuSnapshot(sku, displayName, price);
  }

  private normalizeBps(value: unknown, label: string) {
    const bps = normalizedMerchantFeeBps(value);
    if (bps === null) throw new BadRequestException(`${label}必须在 0-10000 个基点之间`);
    return bps;
  }

  private defaultMerchantAccessPermissions(role: string) {
    if (role === "finance") return ["finance.view", "payment.manage", "order.manage", "refund.view", "refund.manage", "settlement.view", "settlement.manage", "settlement.export"];
    if (role === "operator") return ["product.manage", "order.manage", "shipment.manage", "refund.manage", "marketing.manage"];
    if (role === "service") return ["order.view", "shipment.view", "refund.manage", "review.manage"];
    if (role === "logistics") return ["order.view", "shipment.view", "shipment.manage"];
    return ["merchant.manage", "product.manage", "order.manage", "shipment.manage", "refund.manage", "marketing.manage", "finance.view", "settlement.view"];
  }

  private generateOrderNo() {
    return `MO${Date.now()}${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  }

  private generateCheckoutGroupNo() {
    return `MCG${Date.now()}${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  }

  private generateShipmentNo(orderId: number) {
    return `MSH${Date.now()}${orderId}${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
  }

  private generateGroupBuyTeamNo() {
    return `MGBT${Date.now()}${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
  }

  private generateRefundNo() {
    return `MR${Date.now()}${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  }

  private logOperation(admin: AdminContext | undefined, action: string, targetType: string, targetId: string | number | null, summary: string, tenantId?: number | null) {
    return this.operationLogs.save(this.operationLogs.create({ adminId: admin?.id || null, adminUsername: admin?.username || null, tenantId: admin?.tenantId || tenantId || null, action, targetType, targetId: targetId === null || targetId === undefined ? null : String(targetId), summary, detail: null }));
  }

  private mallWorkerFailureMessage(error: unknown) {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const message = typeof response === "string" ? response : String((response as Record<string, unknown>)?.message || error.message);
      return message.replace(/[\r\n\t]+/g, " ").slice(0, 240);
    }
    return "系统处理异常，请根据订单事件和请求日志排查";
  }
}
