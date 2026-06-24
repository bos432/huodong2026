import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHmac } from "crypto";
import ExcelJS from "exceljs";
import { existsSync } from "fs";
import { DataSource, In, IsNull, LessThan, Repository, SelectQueryBuilder } from "typeorm";
import { AdminMallMerchantAccess } from "../../entities/admin-mall-merchant-access.entity";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { Agent } from "../../entities/agent.entity";
import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { MallAddress } from "../../entities/mall-address.entity";
import { MallBrowseHistory } from "../../entities/mall-browse-history.entity";
import { MallCartItem } from "../../entities/mall-cart-item.entity";
import { MallCategory } from "../../entities/mall-category.entity";
import { MallCheckoutGroup } from "../../entities/mall-checkout-group.entity";
import { MallCommission } from "../../entities/mall-commission.entity";
import { MallCouponClaim } from "../../entities/mall-coupon-claim.entity";
import { MallCoupon } from "../../entities/mall-coupon.entity";
import { MallCouponUsage } from "../../entities/mall-coupon-usage.entity";
import { MallFavorite } from "../../entities/mall-favorite.entity";
import { MallFlashSale } from "../../entities/mall-flash-sale.entity";
import { MallGroupBuy } from "../../entities/mall-group-buy.entity";
import { MallGroupBuyRecord } from "../../entities/mall-group-buy-record.entity";
import { MallInventoryLog } from "../../entities/mall-inventory-log.entity";
import { MallLogisticsCompany } from "../../entities/mall-logistics-company.entity";
import { MallMerchant } from "../../entities/mall-merchant.entity";
import { MallMerchantPaymentAccount } from "../../entities/mall-merchant-payment-account.entity";
import { MallOrderItem } from "../../entities/mall-order-item.entity";
import { MallOrder, MallOrderStatus } from "../../entities/mall-order.entity";
import { MallPaymentCallbackLog } from "../../entities/mall-payment-callback-log.entity";
import { MallPaymentTransaction } from "../../entities/mall-payment-transaction.entity";
import { MallProduct } from "../../entities/mall-product.entity";
import { MallPromotionCode } from "../../entities/mall-promotion-code.entity";
import { MallRefund } from "../../entities/mall-refund.entity";
import { MallRefundLog } from "../../entities/mall-refund-log.entity";
import { MallReview, MallReviewStatus } from "../../entities/mall-review.entity";
import { MallSettlement } from "../../entities/mall-settlement.entity";
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
import { configWithLaunchOverrides } from "../../shared/launch-config";
import { assertTenantAccessForActor, normalizeTenantCode } from "../../shared/tenant-scope";
import { PaymentProviderRuntimeConfig, PaymentProviderService, ProviderRefundNotificationResult, RealPaymentCallbackContext } from "../public/payment-provider.service";
import { CreateMallOrderDto, MallAddressDto, MallCartItemDto, MallCartQuantityDto, MallCategoryDto, MallCommissionBatchSettleDto, MallCommissionSettleDto, MallCouponDto, MallFlashSaleDto, MallGroupBuyDto, MallInventoryAdjustDto, MallListQueryDto, MallLogisticsCompanyDto, MallMerchantAccessDto, MallMerchantDto, MallMerchantPaymentAccountDto, MallOrderCloseDto, MallOrderQuoteDto, MallProductDto, MallPromotionCodeDto, MallProviderPaymentCallbackDto, MallProviderPayDto, MallRefundRequestDto, MallRefundReviewDto, MallReviewDto, MallReviewModerationDto, MallSettlementGenerateDto, MallSettlementPaidDto, MallSettlementReviewDto, MallShipDto } from "./mall.dto";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null };
type PublicTenantContext = { tenantId?: number | null; tenantCode?: string | null; host?: string | null };
type MallOrderPreviewItem = { productId: number; categoryId: number | null; merchantId: number | null; amount: number };
type MallOrderInputItem = { skuId: number; quantity: number; flashSaleId?: number; groupBuyId?: number; joinTeamNo?: string };
type MallOrderWithItemsResult = MallOrder & {
  items: Array<MallOrderItem & { review?: MallReview | null }>;
  refund: MallRefund | null;
  groupBuyTeams: Array<Record<string, unknown>>;
};
type MallOrderPublicResult = Record<string, unknown> & { id: number; amount: string; goodsAmount: string; discountAmount: string; status: MallOrderStatus };
type MallCheckoutGroupResult = Record<string, unknown> & { id: number; orders: MallOrderPublicResult[] };
type MallCreateOrderResult = MallOrderPublicResult | MallCheckoutGroupResult;
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
export class MallService implements OnModuleDestroy {
  private readonly pendingOrderWorker?: NodeJS.Timeout;

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
    @InjectRepository(MallMerchantPaymentAccount) private readonly merchantPaymentAccounts: Repository<MallMerchantPaymentAccount>,
    @InjectRepository(MallCheckoutGroup) private readonly checkoutGroups: Repository<MallCheckoutGroup>,
    @InjectRepository(MallCategory) private readonly categories: Repository<MallCategory>,
    @InjectRepository(MallCoupon) private readonly coupons: Repository<MallCoupon>,
    @InjectRepository(MallCouponClaim) private readonly couponClaims: Repository<MallCouponClaim>,
    @InjectRepository(MallCouponUsage) private readonly couponUsages: Repository<MallCouponUsage>,
    @InjectRepository(MallCommission) private readonly commissions: Repository<MallCommission>,
    @InjectRepository(MallPromotionCode) private readonly promotionCodes: Repository<MallPromotionCode>,
    @InjectRepository(MallLogisticsCompany) private readonly logisticsCompanies: Repository<MallLogisticsCompany>,
    @InjectRepository(MallProduct) private readonly products: Repository<MallProduct>,
    @InjectRepository(MallSku) private readonly skus: Repository<MallSku>,
    @InjectRepository(MallInventoryLog) private readonly inventoryLogs: Repository<MallInventoryLog>,
    @InjectRepository(MallAddress) private readonly addresses: Repository<MallAddress>,
    @InjectRepository(MallCartItem) private readonly cartItems: Repository<MallCartItem>,
    @InjectRepository(MallFavorite) private readonly favorites: Repository<MallFavorite>,
    @InjectRepository(MallBrowseHistory) private readonly browseHistories: Repository<MallBrowseHistory>,
    @InjectRepository(MallFlashSale) private readonly flashSales: Repository<MallFlashSale>,
    @InjectRepository(MallGroupBuy) private readonly groupBuys: Repository<MallGroupBuy>,
    @InjectRepository(MallGroupBuyRecord) private readonly groupBuyRecords: Repository<MallGroupBuyRecord>,
    @InjectRepository(MallOrder) private readonly orders: Repository<MallOrder>,
    @InjectRepository(MallOrderItem) private readonly orderItems: Repository<MallOrderItem>,
    @InjectRepository(MallPaymentCallbackLog) private readonly paymentCallbackLogs: Repository<MallPaymentCallbackLog>,
    @InjectRepository(MallPaymentTransaction) private readonly paymentTransactions: Repository<MallPaymentTransaction>,
    @InjectRepository(MallRefund) private readonly refunds: Repository<MallRefund>,
    @InjectRepository(MallRefundLog) private readonly refundLogs: Repository<MallRefundLog>,
    @InjectRepository(MallReview) private readonly reviews: Repository<MallReview>,
    @InjectRepository(MallSettlement) private readonly settlements: Repository<MallSettlement>,
    @InjectRepository(MemberLevel) private readonly memberLevels: Repository<MemberLevel>,
    @InjectRepository(MemberProfile) private readonly memberProfiles: Repository<MemberProfile>,
    @InjectRepository(MemberPointLog) private readonly memberPointLogs: Repository<MemberPointLog>,
    @InjectRepository(UserWallet) private readonly userWallets: Repository<UserWallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactions: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly paymentProvider: PaymentProviderService
  ) {
    this.pendingOrderWorker = this.startPendingOrderWorker();
  }

  onModuleDestroy() {
    if (this.pendingOrderWorker) clearInterval(this.pendingOrderWorker);
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
    await this.assertMerchantDirectOpenReady(row);
    const saved = await this.merchants.save(row);
    await this.logOperation(admin, id ? "mall.merchant.update" : "mall.merchant.create", "mall_merchant", saved.id, `${id ? "更新" : "创建"}商城店铺：${saved.name}`, saved.tenant.id);
    return saved;
  }

  async adminMerchantAccess(query: MallListQueryDto & { adminId?: number }, admin?: AdminContext) {
    await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.merchantAccess
      .createQueryBuilder("access")
      .leftJoinAndSelect("access.admin", "admin")
      .leftJoinAndSelect("access.merchant", "merchant")
      .leftJoinAndSelect("access.tenant", "tenant")
      .orderBy("access.id", "DESC");
    if (query.tenantId) builder.andWhere("access.tenantId = :tenantId", { tenantId: Number(query.tenantId) });
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
    if (adminUser.tenant?.id && adminUser.tenant.id !== merchant.tenant.id) {
      throw new BadRequestException(`被授权账号「${adminUser.username}」属于「${adminUser.tenant.name}」，不能授权管理「${merchant.tenant.name}」的店铺；请先切换账号所属商家或新建该商家的后台账号。`);
    }
    const row = id ? await this.merchantAccess.findOne({ where: { id } }) : await this.merchantAccess.findOne({ where: { admin: { id: adminUser.id }, merchant: { id: merchant.id } } });
    const access = row || this.merchantAccess.create();
    access.admin = adminUser;
    access.merchant = merchant;
    access.tenant = merchant.tenant;
    access.accessRole = this.optionalString(dto.accessRole) || "manager";
    access.enabled = dto.enabled !== false;
    await this.assertMerchantAccessDisableAllowed(access);
    const saved = await this.merchantAccess.save(access);
    await this.logOperation(admin, id ? "mall.merchant_access.update" : "mall.merchant_access.create", "admin_mall_merchant_access", saved.id, `授权后台账号 ${adminUser.username} 管理店铺：${merchant.name}`, merchant.tenant.id);
    return saved;
  }

  async adminMerchantPaymentAccounts(query: MallListQueryDto, admin?: AdminContext) {
    const { merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, false, false);
    if (!merchant) throw new BadRequestException("请选择要查看收款账户的商城店铺");
    const rows = await this.merchantPaymentAccounts.find({ where: { merchant: { id: merchant.id } }, order: { id: "DESC" } });
    return rows.map((row) => this.publicMerchantPaymentAccount(row));
  }

  async saveMerchantPaymentAccount(dto: MallMerchantPaymentAccountDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, undefined, dto.merchantId, false, false);
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

  uploadedMerchantPaymentCredential(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("请上传 .pem/.key/.crt/.cer/.p12/.pfx 格式的支付证书或密钥文件");
    return {
      path: file.path,
      filename: file.filename,
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
    const productCount = await this.merchantPublishedProductCount(merchant.id);
    if (!productCount) throw new NotFoundException("店铺暂无已上架商品，暂未对外展示");
    return this.publicMerchantSummary(merchant, { productCount });
  }

  async adminCategories(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.categories
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.tenant", "tenant")
      .leftJoinAndSelect("category.merchant", "merchant")
      .orderBy("category.sortOrder", "ASC")
      .addOrderBy("category.id", "ASC");
    if (tenant) this.applyTenantFilter(builder, "category", tenant);
    if (merchant) this.applyMerchantFilter(builder, "category", merchant);
    return builder.getMany();
  }

  async saveCategory(dto: MallCategoryDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId);
    if (!tenant || !merchant) throw new BadRequestException("请选择要维护分类的店铺");
    const row = id ? await this.categories.findOne({ where: { id } }) : this.categories.create();
    if (!row) throw new NotFoundException("商城分类不存在");
    this.assertAdminTenantAccess(row, admin);
    if (id) await this.assertExistingMerchantScope(row, merchant, admin, "商城分类");
    row.tenant = tenant;
    row.merchant = merchant;
    row.name = this.requiredString(dto.name, "分类名称");
    row.iconUrl = this.optionalString(dto.iconUrl);
    row.sortOrder = Number(dto.sortOrder || 0);
    row.enabled = dto.enabled !== false;
    const saved = await this.categories.save(row);
    await this.logOperation(admin, id ? "mall.category.update" : "mall.category.create", "mall_category", saved.id, `${id ? "更新" : "创建"}商城分类：${saved.name}`, saved.tenant.id);
    return saved;
  }

  async adminCoupons(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.coupons.createQueryBuilder("coupon").leftJoinAndSelect("coupon.tenant", "tenant").leftJoinAndSelect("coupon.merchant", "merchant").orderBy("coupon.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "coupon", tenant);
    if (merchant) this.applyMerchantFilter(builder, "coupon", merchant);
    if (query.enabled === "true") builder.andWhere("coupon.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("coupon.enabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) builder.andWhere("(coupon.code LIKE :keyword OR coupon.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const coupons = await builder.take(200).getMany();
    const rows = coupons.map((coupon) => this.adminCoupon(coupon));
    if (!query.status) return rows;
    return rows.filter((coupon) => coupon.runtimeStatus === query.status);
  }

  async saveCoupon(dto: MallCouponDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId);
    if (!tenant || !merchant) throw new BadRequestException("请选择要发券的店铺");
    const row = id ? await this.coupons.findOne({ where: { id } }) : this.coupons.create();
    if (!row) throw new NotFoundException("商城优惠券不存在");
    this.assertAdminTenantAccess(row, admin);
    if (id) await this.assertExistingMerchantScope(row, merchant, admin, "商城优惠券");
    row.tenant = tenant;
    row.merchant = merchant;
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
      const category = await this.categories.findOne({ where: { id: Number(dto.scopeCategoryId || 0), tenant: { id: tenant.id }, merchant: { id: merchant.id } } });
      if (!category) throw new BadRequestException("请选择有效的适用分类");
      row.scopeCategoryId = category.id;
    }
    if (row.scope === "product") {
      const product = await this.products.findOne({ where: { id: Number(dto.scopeProductId || 0), tenant: { id: tenant.id }, merchant: { id: merchant.id } } });
      if (!product) throw new BadRequestException("请选择有效的适用商品");
      row.scopeProductId = product.id;
    }
    const usageLimit = Math.max(Math.trunc(Number(dto.usageLimit || 0)), 0);
    const perUserLimit = Math.max(Math.trunc(Number(dto.perUserLimit || 0)), 0);
    this.assertCouponConfigurationValid(row, minAmount, discountAmount, usageLimit, perUserLimit);
    row.usageLimit = usageLimit;
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.promotionCodes.createQueryBuilder("code").leftJoinAndSelect("code.tenant", "tenant").leftJoinAndSelect("code.merchant", "merchant").leftJoinAndSelect("code.promoterUser", "promoterUser").leftJoinAndSelect("code.agent", "agent").orderBy("code.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "code", tenant);
    if (merchant) this.applyMerchantFilter(builder, "code", merchant);
    if (query.enabled === "true") builder.andWhere("code.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("code.enabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) builder.andWhere("(code.code LIKE :keyword OR code.name LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(200).getMany();
  }

  async savePromotionCode(dto: MallPromotionCodeDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId);
    if (!tenant || !merchant) throw new BadRequestException("请选择要配置推广码的店铺");
    const row = id ? await this.promotionCodes.findOne({ where: { id } }) : this.promotionCodes.create();
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
    row.remark = this.optionalString(dto.remark);
    const saved = await this.promotionCodes.save(row);
    await this.logOperation(admin, id ? "mall.promotion_code.update" : "mall.promotion_code.create", "mall_promotion_code", saved.id, `${id ? "更新" : "创建"}商城推广码：${saved.code}`, saved.tenant.id);
    return saved;
  }

  async adminFlashSales(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId);
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId);
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
    return coupons.map((coupon) => this.adminCoupon(coupon));
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
    return scoped.filter((item) => item.status === status);
  }

  async claimCoupon(user: User, id: number, context?: PublicTenantContext, merchantId?: number) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = merchantId ? await this.publicTargetMerchant(tenant, merchantId) : null;
    const coupon = await this.resolveCoupon(tenant, id, 0, [], undefined, user, "id", merchant);
    let claim = await this.couponClaims.findOne({ where: { tenant: { id: tenant.id }, coupon: { id: coupon.id }, user: { id: user.id } } });
    if (claim) return this.publicCouponClaim(claim);
    claim = await this.couponClaims.save(this.couponClaims.create({ tenant, merchant: coupon.merchant || null, coupon, user, claimedCount: 1, usedCount: 0 }));
    return this.publicCouponClaim(claim);
  }

  async validatePublicCoupon(context: PublicTenantContext | undefined, code: unknown, amount: number, merchantId?: number) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = merchantId ? await this.publicTargetMerchant(tenant, merchantId) : null;
    const previewItems = merchant ? [{ productId: 0, categoryId: null, merchantId: merchant.id, amount: Number(amount || 0) }] : [];
    const coupon = await this.resolveCoupon(tenant, code, amount, previewItems, undefined, undefined, "code", merchant);
    if (coupon.scope && coupon.scope !== "all") throw new BadRequestException("该优惠券需在确认订单页按商品范围校验");
    const discountAmount = this.computeCouponDiscount(coupon, amount, previewItems);
    return { valid: true, coupon: this.adminCoupon(coupon), discountAmount: discountAmount.toFixed(2), payableAmount: Math.max(amount - discountAmount, 0).toFixed(2) };
  }

  async adminLogisticsCompanies(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.logisticsCompanies.createQueryBuilder("company").leftJoinAndSelect("company.tenant", "tenant").leftJoinAndSelect("company.merchant", "merchant").orderBy("company.sortOrder", "ASC").addOrderBy("company.id", "ASC");
    if (tenant) this.applyTenantFilter(builder, "company", tenant);
    if (merchant) this.applyMerchantFilter(builder, "company", merchant);
    if (query.enabled === "true") builder.andWhere("company.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("company.enabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) builder.andWhere("(company.name LIKE :keyword OR company.code LIKE :keyword OR company.servicePhone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(200).getMany();
  }

  async saveLogisticsCompany(dto: MallLogisticsCompanyDto, id?: number, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId);
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.products
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.tenant", "tenant")
      .leftJoinAndSelect("product.merchant", "merchant")
      .leftJoinAndSelect("product.category", "category")
      .orderBy("product.sortOrder", "ASC")
      .addOrderBy("product.id", "DESC");
    if (tenant) this.applyTenantFilter(builder, "product", tenant);
    if (merchant) this.applyMerchantFilter(builder, "product", merchant);
    if (query.status) builder.andWhere("product.status = :status", { status: query.status });
    if (query.categoryId) builder.andWhere("category.id = :categoryId", { categoryId: query.categoryId });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR product.brandName LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 50), 1), 100);
    const [items, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const skuRows = items.length ? await this.skus.find({ where: { product: { id: In(items.map((item) => item.id)) } }, order: { sortOrder: "ASC", id: "ASC" } }) : [];
    const salesMap = await this.productSalesStatsMap(items.map((item) => item.id));
    return { items: items.map((item) => ({ ...this.publicProduct(item, skuRows.filter((sku) => sku.product.id === item.id)), salesStats: salesMap.get(item.id) || { salesCount: 0, salesAmount: "0.00" } })), total, page, pageSize };
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId);
    if (!tenant || !merchant) throw new BadRequestException("请选择要发布商品的店铺");
    const row = id ? await this.products.findOne({ where: { id } }) : this.products.create();
    if (!row) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(row, admin);
    if (id) await this.assertExistingMerchantScope(row, merchant, admin, "商城商品");
    const category = dto.categoryId ? await this.categories.findOne({ where: { id: Number(dto.categoryId), tenant: { id: tenant.id }, merchant: { id: merchant.id } } }) : null;
    if (dto.categoryId && !category) throw new NotFoundException("商城分类不存在");
    row.tenant = tenant;
    row.merchant = merchant;
    row.category = category;
    row.title = this.requiredString(dto.title, "商品名称");
    row.coverUrl = this.optionalString(dto.coverUrl);
    row.description = this.optionalString(dto.description);
    row.brandName = this.optionalString(dto.brandName);
    const requestedStatus = dto.status || "draft";
    row.status = requestedStatus === "published" && merchant.productAuditRequired && !this.isPlatformAdminContext(admin) ? "pending_review" : requestedStatus;
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
    await this.logOperation(admin, id ? "mall.product.update" : "mall.product.create", "mall_product", saved.id, `${id ? "更新" : "创建"}商品：${saved.title}`, saved.tenant.id);
    return this.productDetail(saved.id, admin);
  }

  async productDetail(id: number, admin?: AdminContext) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(product, admin);
    await this.assertAdminRowMerchantAccess(product, admin, "商城商品");
    const skus = await this.skus.find({ where: { product: { id } }, order: { sortOrder: "ASC", id: "ASC" } });
    return this.publicProduct(product, skus);
  }

  async adminProductAudits(query: MallListQueryDto, admin?: AdminContext) {
    return this.adminProducts({ ...query, status: "pending_review" }, admin);
  }

  async approveProduct(id: number, admin?: AdminContext) {
    this.assertPlatformMallAuditAdmin(admin);
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(product, admin);
    await this.assertAdminRowMerchantAccess(product, admin, "商城商品");
    if (product.status !== "pending_review") throw new BadRequestException("只有待审核商品可以通过审核");
    product.status = "published";
    const saved = await this.products.save(product);
    await this.logOperation(admin, "mall.product.approve", "mall_product", saved.id, `通过商品审核：${saved.title}`, saved.tenant.id);
    return this.productDetail(saved.id, admin);
  }

  async rejectProduct(id: number, admin?: AdminContext) {
    this.assertPlatformMallAuditAdmin(admin);
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(product, admin);
    await this.assertAdminRowMerchantAccess(product, admin, "商城商品");
    if (product.status !== "pending_review") throw new BadRequestException("只有待审核商品可以驳回");
    product.status = "draft";
    const saved = await this.products.save(product);
    await this.logOperation(admin, "mall.product.reject", "mall_product", saved.id, `驳回商品审核：${saved.title}`, saved.tenant.id);
    return this.productDetail(saved.id, admin);
  }

  async publicCategories(query: MallListQueryDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const merchant = query.merchantId ? await this.publicTargetMerchant(tenant, query.merchantId) : null;
    const builder = this.categories
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.merchant", "merchant")
      .where("category.tenantId = :tenantId", { tenantId: tenant.id })
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
    const existing = await this.browseHistories.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, product: { id: product.id } } });
    const now = new Date();
    if (existing) {
      existing.viewCount += 1;
      existing.lastViewedAt = now;
      const saved = await this.browseHistories.save(existing);
      return { success: true, viewCount: saved.viewCount };
    }
    const saved = await this.browseHistories.save(this.browseHistories.create({ tenant, user, product, merchant: product.merchant || null, viewCount: 1, lastViewedAt: now }));
    return { success: true, viewCount: saved.viewCount };
  }

  async myBrowseHistories(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.browseHistories.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { lastViewedAt: "DESC" }, take: 100 });
    const visibleRows = rows.filter((row) => this.isPublicProductVisible(row.product));
    const sellableProductIds = await this.productIdsWithEnabledSkus(visibleRows.map((row) => row.product.id));
    return visibleRows.filter((row) => sellableProductIds.has(row.product.id)).map((row) => this.publicBrowseHistory(row));
  }

  async myAddresses(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.addresses.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { isDefault: "DESC", id: "DESC" } });
    return rows.map((row) => this.publicAddress(row));
  }

  async saveMyAddress(user: User, dto: MallAddressDto, id?: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const row = id ? await this.addresses.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } }) : this.addresses.create();
    if (!row) throw new NotFoundException("收货地址不存在");
    row.tenant = tenant;
    row.user = user;
    this.assignAddress(row, dto);
    if (row.isDefault) await this.addresses.update({ tenant: { id: tenant.id }, user: { id: user.id } }, { isDefault: false });
    return this.publicAddress(await this.addresses.save(row));
  }

  async deleteMyAddress(user: User, id: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    await this.addresses.delete({ id, tenant: { id: tenant.id }, user: { id: user.id } });
    return { success: true };
  }

  async myCart(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.cartItems.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { updatedAt: "DESC", id: "DESC" } });
    return rows.map((row) => this.publicCartItem(row));
  }

  async addCartItem(user: User, dto: MallCartItemDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const sku = await this.findSellableSkuRow(this.skus, Number(dto.skuId), tenant.id);
    if (!sku || sku.product.status !== "published") throw new NotFoundException("商品规格不存在或已下架");
    const merchant = await this.resolvePublicSkuMerchant(tenant, sku);
    const addQuantity = Math.max(Number(dto.quantity || 1), 1);
    const available = Number(sku.stock || 0) - Number(sku.lockedStock || 0);
    const existing = await this.cartItems.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, sku: { id: sku.id } } });
    const nextQuantity = (existing?.quantity || 0) + addQuantity;
    if (available < nextQuantity) throw new BadRequestException("购物车数量超过可购买库存");
    const row = existing || this.cartItems.create({ tenant, merchant, user, product: sku.product, sku });
    row.merchant = merchant;
    row.quantity = nextQuantity;
    return this.publicCartItem(await this.cartItems.save(row));
  }

  async updateCartItem(user: User, id: number, dto: MallCartQuantityDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const row = await this.cartItems.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!row) throw new NotFoundException("购物车商品不存在");
    const quantity = Math.max(Number(dto.quantity || 0), 0);
    if (!quantity) {
      await this.cartItems.delete({ id: row.id });
      return { success: true, deleted: true };
    }
    const available = Number(row.sku.stock || 0) - Number(row.sku.lockedStock || 0);
    if (!row.sku.enabled || row.product.status !== "published") throw new BadRequestException("商品已下架，请删除后重新选择");
    const merchant = await this.resolvePublicSkuMerchant(tenant, row.sku);
    if (available < quantity) throw new BadRequestException("购物车数量超过可购买库存");
    row.merchant = merchant;
    row.quantity = quantity;
    return this.publicCartItem(await this.cartItems.save(row));
  }

  async deleteCartItem(user: User, id: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    await this.cartItems.delete({ id, tenant: { id: tenant.id }, user: { id: user.id } });
    return { success: true };
  }

  async quoteOrder(user: User, dto: MallOrderQuoteDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const { items } = await this.resolveOrderInputItems(user, tenant, dto);
    const preview = await this.previewGoodsAmount(tenant, items, user);
    const goodsAmount = preview.goodsAmount;
    const coupon = dto.couponCode ? await this.resolveCoupon(tenant, dto.couponCode, goodsAmount, preview.items, undefined, user) : null;
    const couponDiscountAmount = coupon ? this.computeCouponDiscount(coupon, goodsAmount, preview.items) : 0;
    const pointsQuote = await this.computeMallPointsQuote(user, goodsAmount - couponDiscountAmount, dto.pointsToUse);
    const discountAmount = couponDiscountAmount + pointsQuote.pointsDiscountAmount;
    return {
      goodsAmount: goodsAmount.toFixed(2),
      coupon: coupon ? { id: coupon.id, code: coupon.code, name: coupon.name, minAmount: coupon.minAmount, discountAmount: couponDiscountAmount.toFixed(2), scope: coupon.scope, scopeCategoryId: coupon.scopeCategoryId, scopeProductId: coupon.scopeProductId } : null,
      couponDiscountAmount: couponDiscountAmount.toFixed(2),
      availablePoints: pointsQuote.availablePoints,
      pointsUsed: pointsQuote.pointsUsed,
      pointsDiscountAmount: pointsQuote.pointsDiscountAmount.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      payableAmount: Math.max(goodsAmount - discountAmount, 0).toFixed(2)
    };
  }

  async createCheckoutGroup(user: User, dto: CreateMallOrderDto, context?: PublicTenantContext): Promise<MallCreateOrderResult> {
    return this.createOrder(user, dto, context);
  }

  async createOrder(user: User, dto: CreateMallOrderDto, context?: PublicTenantContext, checkoutGroup?: MallCheckoutGroup | null): Promise<MallCreateOrderResult> {
    const tenant = await this.requirePublicTenant(context);
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
    const merchantGroups = await this.resolveOrderMerchantGroups(tenant, items);
    if (!checkoutGroup && merchantGroups.length > 1) {
      return this.createCheckoutGroupFromResolved(user, dto, context, tenant, cartRows, merchantGroups);
    }
    const merchant = merchantGroups[0]?.merchant || await this.ensureDefaultMerchant(tenant);
    const promotion = await this.resolvePromotionCode(tenant, dto.promotionCode, merchant);
    await this.assertPaymentMethodEnabled(paymentMethod, tenant, merchant);
    const order = await this.dataSource.transaction(async (manager) => {
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
        paymentMethod,
        clientOrderKey,
        status: paymentMethod === PaymentMethod.Offline ? "pending_confirm" : "pending_payment",
        promotionCode: promotion?.code || null,
        promotionSnapshot: promotion ? this.promotionSnapshot(promotion) : null,
        addressSnapshot: address,
        buyerRemark: this.optionalString(dto.buyerRemark),
        adminRemark: null,
        expiresAt
      }));
      const groupBuyRecords: MallGroupBuyRecord[] = [];
      for (const input of items) {
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
        await inventoryRepo.save(inventoryRepo.create({ tenant, merchant, sku, order: savedOrder, type: "lock", quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: "商城下单锁库存" }));
        const flashSale = input.flashSaleId ? await this.resolveActiveFlashSale(manager, tenant, input.flashSaleId, sku, user, quantity) : null;
        if (flashSale) {
          const beforeSaleLocked = flashSale.lockedStock;
          flashSale.lockedStock += quantity;
          await manager.getRepository(MallFlashSale).save(flashSale);
          await inventoryRepo.save(inventoryRepo.create({ tenant, merchant, sku, order: savedOrder, type: "lock", quantity, stockBefore: flashSale.saleStock - flashSale.soldStock, stockAfter: flashSale.saleStock - flashSale.soldStock, lockedBefore: beforeSaleLocked, lockedAfter: flashSale.lockedStock, remark: `商城秒杀锁库存：${flashSale.title}` }));
        }
        const groupBuy = input.groupBuyId ? await this.resolveActiveGroupBuy(manager, tenant, input.groupBuyId, sku, user, quantity) : null;
        if (groupBuy) {
          const beforeGroupLocked = groupBuy.lockedStock;
          groupBuy.lockedStock += quantity;
          await manager.getRepository(MallGroupBuy).save(groupBuy);
          await inventoryRepo.save(inventoryRepo.create({ tenant, merchant, sku, order: savedOrder, type: "lock", quantity, stockBefore: groupBuy.groupStock - groupBuy.soldStock, stockAfter: groupBuy.groupStock - groupBuy.soldStock, lockedBefore: beforeGroupLocked, lockedAfter: groupBuy.lockedStock, remark: `商城拼团锁库存：${groupBuy.title}` }));
        }
        const itemPrice = flashSale ? Number(flashSale.salePrice || 0) : groupBuy ? Number(groupBuy.groupPrice || 0) : Number(sku.price);
        const itemTotal = itemPrice * quantity;
        amount += itemTotal;
        couponItems.push({ productId: sku.product.id, categoryId: sku.product.category?.id || null, merchantId: skuMerchant.id, amount: itemTotal });
        const skuName = flashSale ? `${sku.name}（秒杀：${flashSale.title}）` : groupBuy ? `${sku.name}（拼团：${groupBuy.title}）` : sku.name;
        orderItems.push(itemRepo.create({ tenant, merchant, order: savedOrder, product: sku.product, sku, flashSale, groupBuy, productTitle: sku.product.title, skuName, coverUrl: sku.product.coverUrl, price: itemPrice.toFixed(2), quantity, totalAmount: itemTotal.toFixed(2) }));
        if (groupBuy) {
          const teamNo = await this.resolveGroupBuyTeamNo(manager, tenant, groupBuy, input.joinTeamNo);
          groupBuyRecords.push(manager.getRepository(MallGroupBuyRecord).create({ tenant, merchant, groupBuy, order: savedOrder, user, product: sku.product, sku, title: groupBuy.title, groupPrice: Number(groupBuy.groupPrice || 0).toFixed(2), quantity, amount: itemTotal.toFixed(2), teamNo, teamStatus: "forming", minPeople: groupBuy.minPeople, paidPeople: 0, status: "pending" }));
        }
      }
      const coupon = dto.couponCode ? await this.resolveCoupon(tenant, dto.couponCode, amount, couponItems, manager, user) : null;
      const couponDiscountAmount = coupon ? this.computeCouponDiscount(coupon, amount, couponItems) : 0;
      const pointsQuote = await this.computeMallPointsQuote(user, amount - couponDiscountAmount, dto.pointsToUse);
      const discountAmount = couponDiscountAmount + pointsQuote.pointsDiscountAmount;
      if (coupon) {
        coupon.usedCount += 1;
        await manager.getRepository(MallCoupon).save(coupon);
        savedOrder.coupon = coupon;
        savedOrder.couponSnapshot = { id: coupon.id, code: coupon.code, name: coupon.name, minAmount: coupon.minAmount, discountAmount: couponDiscountAmount.toFixed(2), scope: coupon.scope, scopeCategoryId: coupon.scopeCategoryId, scopeProductId: coupon.scopeProductId };
        await manager.getRepository(MallCouponUsage).save(manager.getRepository(MallCouponUsage).create({ tenant, merchant, coupon, order: savedOrder, user, code: coupon.code, discountAmount: couponDiscountAmount.toFixed(2), status: "used" }));
        await this.markCouponClaimUsed(manager, tenant, merchant, coupon, user);
      }
      savedOrder.amount = Math.max(amount - discountAmount, 0).toFixed(2);
      savedOrder.goodsAmount = amount.toFixed(2);
      savedOrder.discountAmount = discountAmount.toFixed(2);
      savedOrder.pointsUsed = pointsQuote.pointsUsed;
      savedOrder.pointsDiscountAmount = pointsQuote.pointsDiscountAmount.toFixed(2);
      await orderRepo.save(savedOrder);
      await itemRepo.save(orderItems);
      if (groupBuyRecords.length) await manager.getRepository(MallGroupBuyRecord).save(groupBuyRecords);
      if (pointsQuote.pointsUsed > 0) await this.awardMallPoints(user, -pointsQuote.pointsUsed, "mall_points_redeem", savedOrder.id, "商城订单积分抵扣", manager);
      return savedOrder;
    });
    if (paymentMethod === PaymentMethod.Balance) {
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
    const log = await this.createPaymentCallbackLog("wechat", payload, order, callback.signatureValid);
    if (!callback.signatureValid) {
      await this.finishPaymentCallbackLog(log, "failed", "商城微信支付回调签名验证失败", order);
      throw new BadRequestException("支付回调签名验证失败");
    }
    if (!order) {
      await this.finishPaymentCallbackLog(log, "failed", "商城订单不存在", null);
      throw new NotFoundException("商城订单不存在");
    }
    if (order.paymentMethod !== PaymentMethod.Wechat) {
      await this.finishPaymentCallbackLog(log, "failed", "订单支付方式不是微信支付", order);
      throw new BadRequestException("订单支付方式不是微信支付");
    }
    if (Math.abs(Number(order.amount) - Number(callback.amount)) > 0.001) {
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
    const callbackPayload = { ...payload, ...(callback.raw || {}), orderNo: callback.orderNo, transactionNo: callback.transactionNo, amount: callback.amount };
    const log = await this.createPaymentCallbackLog("wechat", callbackPayload, order, callback.signatureValid);
    if (!callback.signatureValid) {
      await this.finishPaymentCallbackLog(log, "failed", "商城真实微信支付回调签名验证失败", order);
      throw new BadRequestException("支付回调签名验证失败");
    }
    if (!order) {
      await this.finishPaymentCallbackLog(log, "failed", "商城订单不存在", null);
      throw new NotFoundException("商城订单不存在");
    }
    if (order.merchant?.paymentMode === "merchant_direct") {
      const expectedPath = `/payment/mall/merchants/${order.merchant.id}/wechat/callback`;
      await this.finishPaymentCallbackLog(log, "failed", `商户直收订单误走平台微信回调地址，应使用 ${expectedPath}`, order);
      throw new BadRequestException(`商户直收订单不能走平台微信回调地址，请在微信商户平台配置店铺专属支付回调：${expectedPath}`);
    }
    if (order.paymentMethod !== PaymentMethod.Wechat) {
      await this.finishPaymentCallbackLog(log, "failed", "订单支付方式不是微信支付", order);
      throw new BadRequestException("订单支付方式不是微信支付");
    }
    if (Math.abs(Number(order.amount) - Number(callback.amount)) > 0.001) {
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
    if (Math.abs(Number(order.amount) - Number(callback.amount)) > 0.001) {
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
    const routing = this.mallWechatPaymentRoutingSummary(order, runtimeConfig, callbackPath);
    return {
      ...result,
      merchantId: routing.merchantId,
      paymentMode: routing.paymentMode,
      collectionMode: routing.collectionMode,
      merchantScope: routing.merchantScope,
      routing,
      payParams: {
        ...result.payParams,
        mallMerchantId: routing.merchantId,
        mallPaymentMode: routing.paymentMode,
        mallMerchantScope: routing.merchantScope
      }
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
      const before = Number(wallet.availableBalance || 0);
      if (before + 0.0001 < amount) throw new BadRequestException("余额不足，请联系后台充值或选择线下收款");
      const after = before - amount;
      wallet.availableBalance = after.toFixed(2);
      wallet.totalSpent = (Number(wallet.totalSpent || 0) + amount).toFixed(2);
      await walletRepo.save(wallet);
      const tx = await walletTxRepo.save(walletTxRepo.create({ wallet, user, tenant, order: null, transactionNo: `MALBAL${Date.now()}${lockedOrder.id}`, direction: "debit", type: "balance_pay", amount: amount.toFixed(2), balanceBefore: before.toFixed(2), balanceAfter: after.toFixed(2), operator: "user", remark: `商城订单余额支付：${lockedOrder.orderNo}`, idempotencyKey: `mall_balance_pay:${lockedOrder.id}` }));
      lockedOrder.status = "paid";
      lockedOrder.transactionNo = tx.transactionNo;
      lockedOrder.paidAt = new Date();
      lockedOrder.expiresAt = null;
      await orderRepo.save(lockedOrder);
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
    const builder = this.orders.createQueryBuilder("order").leftJoinAndSelect("order.tenant", "tenant").leftJoinAndSelect("order.user", "user").where("tenant.id = :tenantId", { tenantId: tenant.id }).andWhere("user.id = :userId", { userId: user.id }).orderBy("order.createdAt", "DESC");
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
    const order = await this.orders.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!order) throw new NotFoundException("商城订单不存在");
    if (order.status !== "shipped") throw new BadRequestException("当前订单不能确认收货");
    order.status = "completed";
    order.completedAt = new Date();
    await this.orders.save(order);
    await this.refreshCheckoutGroupStatusForOrder(order);
    return this.publicUserOrderWithItems(order, user);
  }

  async requestRefund(id: number, user: User, dto: MallRefundRequestDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.orders.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!order) throw new NotFoundException("商城订单不存在");
    const exists = await this.refunds.findOne({ where: { order: { id: order.id }, status: In(["pending", "processing", "failed"]) }, order: { createdAt: "DESC" } });
    if (exists) return this.publicUserRefund(exists, order.paymentMethod);
    if (!["paid", "shipped", "completed"].includes(order.status)) throw new BadRequestException("当前订单不能申请售后");
    const amount = Number(dto.amount || order.amount);
    if (amount <= 0 || amount > Number(order.amount) + 0.0001) throw new BadRequestException("退款金额不正确");
    const images = Array.isArray(dto.images) ? dto.images.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [];
    order.status = "refund_pending";
    await this.orders.save(order);
    await this.refreshCheckoutGroupStatusForOrder(order);
    const saved = await this.refunds.save(this.refunds.create({ refundNo: this.generateRefundNo(), tenant, merchant: order.merchant || null, user, order, type: dto.type || "refund_only", amount: amount.toFixed(2), status: "pending", reason: this.optionalString(dto.reason), images }));
    return this.publicUserRefund(saved, order.paymentMethod);
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
    const saved = await this.reviews.save(this.reviews.create({ tenant, merchant, user, order: orderItem.order, orderItem, product: orderItem.product, sku: orderItem.sku, rating, content, images, status: "pending" }));
    return this.publicUserReview(saved);
  }

  async adminReviews(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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
    if (query.status) builder.andWhere("review.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR review.content LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
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
    await this.assertAdminMerchantAccess(merchant, admin);
    const nextStatus = dto.status === "approved" ? "approved" : dto.status === "rejected" ? "rejected" : null;
    if (!nextStatus) throw new BadRequestException("评价审核状态不正确");
    review.merchant = review.merchant || merchant;
    review.status = nextStatus as MallReviewStatus;
    review.reviewRemark = this.optionalString(dto.reviewRemark);
    const merchantReply = this.optionalString(dto.merchantReply);
    review.merchantReply = merchantReply ? merchantReply.slice(0, 500) : null;
    review.repliedBy = merchantReply ? admin?.username || "system" : null;
    review.repliedAt = merchantReply ? new Date() : null;
    review.reviewedBy = admin?.username || "system";
    review.reviewedAt = new Date();
    const saved = await this.reviews.save(review);
    await this.logOperation(admin, "mall.review.moderate", "mall_review", saved.id, `审核商城评价：${saved.status}`, saved.tenant.id);
    return saved;
  }

  async adminOrders(query: MallListQueryDto, admin?: AdminContext) {
    const { items, total, page, pageSize } = await this.adminOrderRows(query, admin);
    return { items: await Promise.all(items.map((order) => this.publicOrderWithItems(order))), total, page, pageSize };
  }

  async adminOrderLogistics(id: number, admin?: AdminContext) {
    const order = await this.findAdminOrder(id, admin);
    return this.mallOrderLogistics(order);
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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

  async adminCommissions(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoinAndSelect("commission.tenant", "tenant")
      .leftJoinAndSelect("commission.merchant", "merchant")
      .leftJoinAndSelect("commission.order", "order")
      .leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")
      .leftJoinAndSelect("order.user", "buyer")
      .leftJoinAndSelect("commission.promotionCode", "promotionCode")
      .leftJoinAndSelect("commission.promoterUser", "promoterUser")
      .leftJoinAndSelect("commission.agent", "agent")
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
      voidCount: Number(map.void?.count || 0),
      voidAmount: Number(map.void?.amount || 0).toFixed(2),
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
      .addSelect("COALESCE(SUM(CASE WHEN commission.status = 'settled' THEN commission.commissionAmount ELSE 0 END), 0)", "settledAmount")
      .addSelect("SUM(CASE WHEN commission.status = 'settled' THEN 1 ELSE 0 END)", "settledCount")
      .addSelect("COALESCE(SUM(CASE WHEN commission.status = 'void' THEN commission.commissionAmount ELSE 0 END), 0)", "voidAmount")
      .addSelect("SUM(CASE WHEN commission.status = 'void' THEN 1 ELSE 0 END)", "voidCount")
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
        settledCount: Number(row.settledCount || 0),
        settledAmount: Number(row.settledAmount || 0).toFixed(2),
        voidCount: Number(row.voidCount || 0),
        voidAmount: Number(row.voidAmount || 0).toFixed(2)
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
      { header: "订单金额", key: "orderAmount", width: 12 },
      { header: "佣金比例", key: "commissionRate", width: 12 },
      { header: "佣金金额", key: "commissionAmount", width: 12 },
      { header: "状态", key: "status", width: 12 },
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
        orderAmount: row.orderAmount,
        commissionRate: `${(Number(row.commissionRate || 0) * 100).toFixed(2)}%`,
        commissionAmount: row.commissionAmount,
        status: this.mallCommissionStatusText(row.status),
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
      { header: "已结算笔数", key: "settledCount", width: 12 },
      { header: "已结算金额", key: "settledAmount", width: 14 },
      { header: "已作废笔数", key: "voidCount", width: 12 },
      { header: "已作废金额", key: "voidAmount", width: 14 }
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
        settledCount: row.settledCount,
        settledAmount: row.settledAmount,
        voidCount: row.voidCount,
        voidAmount: row.voidAmount
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async settleCommission(id: number, dto: MallCommissionSettleDto, admin?: AdminContext) {
    const commission = await this.commissions.findOne({ where: { id } });
    if (!commission) throw new NotFoundException("商城佣金记录不存在");
    this.assertAdminTenantAccess(commission, admin);
    if (commission.merchant) await this.assertAdminMerchantAccess(commission.merchant, admin);
    if (commission.status !== "pending") throw new BadRequestException("只有待结算佣金可以结算");
    commission.status = "settled";
    commission.settledAt = new Date();
    commission.settledBy = admin?.username || "后台财务";
    commission.settleRemark = this.optionalString(dto.remark);
    const saved = await this.commissions.save(commission);
    await this.logOperation(admin, "mall.commission.settle", "mall_commission", saved.id, `结算商城佣金：${saved.code} ¥${saved.commissionAmount}`, saved.tenant.id);
    return saved;
  }

  async batchSettleCommissions(dto: MallCommissionBatchSettleDto, admin?: AdminContext) {
    const remark = this.requiredString(dto.remark, "结算备注");
    const { tenant, merchant } = await this.adminTargetMerchant(admin, dto.tenantId, dto.merchantId, !admin?.tenantId && !dto.merchantId);
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoinAndSelect("commission.tenant", "tenant")
      .leftJoinAndSelect("commission.merchant", "merchant")
      .leftJoinAndSelect("commission.order", "order")
      .leftJoinAndSelect("order.user", "buyer")
      .leftJoinAndSelect("commission.promoterUser", "promoterUser")
      .leftJoinAndSelect("commission.agent", "agent")
      .where("commission.status = :status", { status: "pending" })
      .orderBy("commission.createdAt", "ASC");
    if (tenant) this.applyTenantFilter(builder, "commission", tenant);
    if (merchant) this.applyMerchantFilter(builder, "commission", merchant);
    if (dto.keyword?.trim()) builder.andWhere("(commission.code LIKE :keyword OR order.orderNo LIKE :keyword OR buyer.phone LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${dto.keyword.trim()}%` });
    if (dto.agentId) builder.andWhere("agent.id = :agentId", { agentId: Number(dto.agentId) });
    if (dto.promoterUserId) builder.andWhere("promoterUser.id = :promoterUserId", { promoterUserId: Number(dto.promoterUserId) });
    if (dto.unassigned) builder.andWhere("agent.id IS NULL AND promoterUser.id IS NULL");
    const rows = await builder.take(200).getMany();
    if (!rows.length) return { settledCount: 0, settledAmount: "0.00", ids: [] };
    const now = new Date();
    let amount = 0;
    for (const row of rows) {
      row.status = "settled";
      row.settledAt = now;
      row.settledBy = admin?.username || "后台财务";
      row.settleRemark = remark;
      amount += Number(row.commissionAmount || 0);
    }
    const saved = await this.commissions.save(rows);
    await this.logOperation(admin, "mall.commission.batch_settle", "mall_commission", saved.map((row) => row.id).join(","), `批量结算商城佣金：${saved.length} 笔 ¥${amount.toFixed(2)}`, saved[0]?.tenant?.id);
    return { settledCount: saved.length, settledAmount: amount.toFixed(2), ids: saved.map((row) => row.id) };
  }

  async adminPaymentCallbackLogs(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId, false);
    const setting = tenant ? await this.operationSettings.findOne({ where: { tenant: { id: tenant.id } } }) : null;
    return this.mallWechatPaymentReadinessForMerchant(tenant, merchant, this.normalizePaymentMethods(setting?.paymentMethods));
  }

  async adminSettlements(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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
    return { items, pending: await this.mallSettlementPendingSummary(query, tenant, merchant) };
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
      { header: "服务费", key: "serviceFeeAmount", width: 14 },
      { header: "应打款/扣回", key: "payableAmount", width: 14 },
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
        serviceFeeAmount: row.serviceFeeAmount,
        payableAmount: row.payableAmount,
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
    const draft = await this.buildMallSettlementDraft(tenant, merchant, periodStart, periodEnd);
    if (!draft.orderCount && Number(draft.refundAmount || 0) <= 0) {
      throw new BadRequestException("当前周期没有新的可结算订单或退款；已生成过结算单的记录不会重复结算");
    }
    const settlement = this.settlements.create({
      ...draft,
      settlementNo: this.nextMallSettlementNo(),
      generatedBy: admin?.username || "system",
      remark: this.optionalString(dto.remark)
    });
    const saved = await this.settlements.save(settlement);
    await this.logOperation(admin, "mall.settlement.generate", "mall_settlement", saved.id, `生成商城结算单：${saved.settlementNo} ${merchant.name}`, tenant.id);
    return saved;
  }

  async approveSettlement(id: number, dto: MallSettlementReviewDto, admin?: AdminContext) {
    this.assertPlatformMallSettlementAdmin(admin);
    const settlement = await this.findAdminSettlement(id, admin);
    if (settlement.status !== "draft") throw new BadRequestException("只有草稿结算单可以审核通过");
    settlement.status = "approved";
    settlement.reviewedBy = admin?.username || "system";
    settlement.reviewedAt = new Date();
    settlement.remark = this.mergeRemark(settlement.remark, dto.remark);
    const saved = await this.settlements.save(settlement);
    await this.logOperation(admin, "mall.settlement.approve", "mall_settlement", saved.id, `审核通过商城结算单：${saved.settlementNo}`, saved.tenant.id);
    return saved;
  }

  async rejectSettlement(id: number, dto: MallSettlementReviewDto, admin?: AdminContext) {
    this.assertPlatformMallSettlementAdmin(admin);
    const settlement = await this.findAdminSettlement(id, admin);
    if (settlement.status !== "draft") throw new BadRequestException("只有草稿结算单可以拒绝");
    settlement.status = "rejected";
    settlement.reviewedBy = admin?.username || "system";
    settlement.reviewedAt = new Date();
    settlement.remark = this.mergeRemark(settlement.remark, dto.remark);
    const saved = await this.settlements.save(settlement);
    await this.logOperation(admin, "mall.settlement.reject", "mall_settlement", saved.id, `拒绝商城结算单：${saved.settlementNo}`, saved.tenant.id);
    return saved;
  }

  async markSettlementPaid(id: number, dto: MallSettlementPaidDto, admin?: AdminContext) {
    this.assertPlatformMallSettlementAdmin(admin);
    const settlement = await this.findAdminSettlement(id, admin);
    if (settlement.status !== "approved") throw new BadRequestException("只有已审核结算单可以标记打款");
    const paidReference = this.optionalString(dto.paidReference);
    const paidProofUrl = this.optionalString(dto.paidProofUrl);
    const actionText = Number(settlement.payableAmount || 0) < 0 ? "扣回/冲抵" : "打款";
    if (!paidReference && !paidProofUrl) {
      throw new BadRequestException(`请填写${actionText}流水号、线下凭证号或上传${actionText}凭证后再标记商城结算完成，方便财务对账。`);
    }
    settlement.status = "paid";
    settlement.paidBy = admin?.username || "system";
    settlement.paidAt = new Date();
    settlement.paidReference = paidReference;
    settlement.paidProofUrl = paidProofUrl;
    settlement.remark = this.mergeRemark(settlement.remark, dto.remark);
    const saved = await this.settlements.save(settlement);
    await this.logOperation(admin, "mall.settlement.mark_paid", "mall_settlement", saved.id, `标记商城结算单已${actionText}：${saved.settlementNo}`, saved.tenant.id);
    return saved;
  }

  private async mallSettlementPendingSummary(query: MallListQueryDto, tenant: Tenant | null, merchant: MallMerchant | null) {
    const range = this.mallSettlementQueryRange(query);
    const settled = await this.settledMallSnapshotIds(tenant, merchant, range.periodStart, range.periodEnd);
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
    const merchantIds = Array.from(new Set([...salesRows.map((row) => Number(row.merchantId || 0)), ...refundRows.map((row) => Number(row.merchantId || 0))].filter(Boolean)));
    const merchantRows = merchantIds.length ? await this.merchants.find({ where: { id: In(merchantIds) } }) : [];
    const salesMap = new Map(salesRows.map((row) => [Number(row.merchantId || 0), row]));
    const refundMap = new Map(refundRows.map((row) => [Number(row.merchantId || 0), Number(row.refundAmount || 0)]));
    const merchantDirectRefundMap = new Map(refundRows.map((row) => [Number(row.merchantId || 0), Number(row.merchantDirectCollectionRefundAmount || 0)]));
    return merchantIds.map((merchantId) => {
      const row = salesMap.get(merchantId);
      const orderAmount = Number(row?.orderAmount || 0);
      const refundAmount = refundMap.get(merchantId) || 0;
      const merchantDirectOrderAmount = Number(row?.merchantDirectCollectionOrderAmount || 0);
      const merchantDirectRefundAmount = merchantDirectRefundMap.get(merchantId) || 0;
      const merchantRow = merchantRows.find((item) => item.id === merchantId) || null;
      const amounts = this.mallSettlementAmounts(orderAmount, refundAmount, merchantDirectOrderAmount, merchantDirectRefundAmount, merchantRow);
      return {
        merchant: merchantRow,
        orderCount: Number(row?.orderCount || 0),
        orderAmount: orderAmount.toFixed(2),
        refundAmount: refundAmount.toFixed(2),
        netAmount: amounts.netAmount.toFixed(2),
        merchantDirectAmount: amounts.merchantDirectNetAmount.toFixed(2),
        platformCollectedAmount: amounts.platformCollectedNetAmount.toFixed(2),
        serviceFeeRate: amounts.serviceFeeRate,
        serviceFeeAmount: amounts.serviceFeeAmount.toFixed(2),
        payableAmount: amounts.payableAmount.toFixed(2),
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
    const rows = await Promise.all(items.map((order) => this.publicOrderWithItems(order)));
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
        type: row.type === "return_refund" ? "退货退款" : "仅退款",
        status: this.mallRefundStatusText(row.status),
        amount: row.amount,
        reason: row.reason || "",
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.inventoryLogs.createQueryBuilder("log").leftJoinAndSelect("log.tenant", "tenant").leftJoinAndSelect("log.merchant", "merchant").leftJoinAndSelect("log.sku", "sku").leftJoinAndSelect("sku.product", "product").leftJoinAndSelect("log.order", "order").orderBy("log.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "log", tenant);
    if (merchant) this.applyMerchantFilter(builder, "log", merchant);
    if (query.skuId) builder.andWhere("sku.id = :skuId", { skuId: Number(query.skuId) });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR sku.name LIKE :keyword OR order.orderNo LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(200).getMany();
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
      await this.assertAdminRowMerchantAccess({ tenant: sku.tenant, merchant: sku.merchant || sku.product?.merchant || null }, admin, "商品规格");
      if (nextStock < Number(sku.lockedStock || 0)) throw new BadRequestException("目标库存不能小于当前已锁定库存");
      const beforeStock = Number(sku.stock || 0);
      const beforeLocked = Number(sku.lockedStock || 0);
      sku.stock = nextStock;
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: sku.tenant, merchant: sku.merchant || sku.product?.merchant || null, sku, order: null, type: "adjust", quantity: nextStock - beforeStock, stockBefore: beforeStock, stockAfter: nextStock, lockedBefore: beforeLocked, lockedAfter: beforeLocked, remark }));
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
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
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
    const order = await this.findAdminOrder(id, admin);
    if (order.paymentMethod !== PaymentMethod.Offline || order.status !== "pending_confirm") throw new BadRequestException("当前订单不能确认线下收款");
    order.status = "paid";
    order.paidAt = new Date();
    order.expiresAt = null;
    order.transactionNo = `MALOFF${Date.now()}${order.id}`;
    await this.orders.save(order);
    await this.dataSource.transaction(async (manager) => {
      await this.updateGroupBuyRecordsForOrder(manager, order, "paid");
      await this.deductLockedInventory(manager, order);
      await this.awardMallPurchasePoints(order, manager);
      await this.createMallCommissionForOrder(manager, order);
    });
    await this.refreshCheckoutGroupStatusForOrder(order);
    await this.logOperation(admin, "mall.order.confirm_offline", "mall_order", order.id, `确认商城订单线下收款：${order.orderNo}`, order.tenant.id);
    return this.publicOrderWithItems(order);
  }

  async adminShip(id: number, dto: MallShipDto, admin?: AdminContext) {
    const order = await this.findAdminOrder(id, admin);
    if (order.status !== "paid") throw new BadRequestException("只有已支付订单可以发货");
    order.status = "shipped";
    order.expressCompany = this.optionalString(dto.expressCompany);
    order.expressNo = this.requiredString(dto.expressNo, "快递单号");
    order.adminRemark = this.optionalString(dto.remark) || order.adminRemark;
    order.shippedAt = new Date();
    await this.orders.save(order);
    await this.refreshCheckoutGroupStatusForOrder(order);
    await this.logOperation(admin, "mall.order.ship", "mall_order", order.id, `商城订单发货：${order.orderNo}`, order.tenant.id);
    return this.publicOrderWithItems(order);
  }

  async adminCloseOrder(id: number, dto: MallOrderCloseDto, admin?: AdminContext) {
    const order = await this.findAdminOrder(id, admin);
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
    const orders = await this.orders.find({
      where: [
        this.mallBatchWhere(scope, { status: "pending_payment", expiresAt: LessThan(now) }),
        this.mallBatchWhere(scope, { status: "pending_confirm", expiresAt: LessThan(now) }),
        this.mallBatchWhere(scope, { status: "pending_payment", expiresAt: IsNull(), createdAt: LessThan(paymentDeadline) }),
        this.mallBatchWhere(scope, { status: "pending_confirm", expiresAt: IsNull(), createdAt: LessThan(confirmDeadline) })
      ],
      order: { createdAt: "ASC" },
      take: 50
    });
    let closedCount = 0;
    for (const order of orders) {
      try {
        const reason = order.status === "pending_payment" ? `商城订单超过 ${paymentMinutes} 分钟未支付，系统自动关闭` : `商城订单超过 ${confirmMinutes} 分钟未确认收款，系统自动关闭`;
        await this.closeOrderAndReleaseLockedInventory(order.id, reason);
        closedCount += 1;
        await this.logOperation(admin, "mall.order.auto_close", "mall_order", order.id, `自动关闭商城订单：${order.orderNo}，原因：${reason}`, order.tenant.id);
      } catch {
        // 单个订单状态可能被并发支付/确认改变，跳过即可，下一轮继续扫描。
      }
    }
    return { closedCount, checkedCount: orders.length, paymentMinutes, confirmMinutes, scope: this.publicMallBatchScope(scope) };
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
    for (const teamNo of teamNos) {
      try {
        const result = await this.failGroupBuyTeam(teamNo, admin, scope);
        if (result.failed) failedTeamCount += 1;
        refundedOrderCount += result.refundedOrderCount;
        skippedOrderCount += result.skippedOrderCount;
        manualRefundOrderCount += result.manualRefundOrderCount || 0;
      } catch {
        skippedOrderCount += 1;
      }
    }
    return { checkedTeamCount: teamNos.length, checkedRecordCount: rows.length, failedTeamCount, refundedOrderCount, manualRefundOrderCount, skippedOrderCount, scope: this.publicMallBatchScope(scope) };
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
        order.status = "completed";
        order.completedAt = now;
        await this.orders.save(order);
        await this.refreshCheckoutGroupStatusForOrder(order);
        completedCount += 1;
        await this.logOperation(admin, "mall.order.auto_complete", "mall_order", order.id, `自动完成商城订单：${order.orderNo}，已发货超过 ${shippedDays} 天`, order.tenant.id);
      } catch {
        // 单个订单可能已被用户确认或进入售后，跳过即可，下一轮继续扫描。
      }
    }
    return { completedCount, checkedCount: orders.length, shippedDays, scope: this.publicMallBatchScope(scope) };
  }

  async adminRefunds(query: MallListQueryDto, admin?: AdminContext) {
    const { tenant, merchant } = await this.adminTargetMerchant(admin, query.tenantId, query.merchantId, !admin?.tenantId && !query.merchantId);
    const builder = this.refunds.createQueryBuilder("refund").leftJoinAndSelect("refund.tenant", "tenant").leftJoinAndSelect("refund.merchant", "merchant").leftJoinAndSelect("refund.user", "user").leftJoinAndSelect("refund.order", "order").leftJoinAndSelect("order.checkoutGroup", "checkoutGroup").orderBy("refund.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "refund", tenant);
    if (merchant) this.applyMerchantFilter(builder, "refund", merchant);
    if (query.status) builder.andWhere("refund.status = :status", { status: query.status });
    if (query.paymentMethod) builder.andWhere("order.paymentMethod = :paymentMethod", { paymentMethod: query.paymentMethod });
    this.applyDateRangeFilter(builder, "refund", query);
    if (query.keyword?.trim()) builder.andWhere("(refund.refundNo LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR refund.reason LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    if (query.checkoutGroupNo?.trim()) builder.andWhere("checkoutGroup.groupNo LIKE :checkoutGroupNo", { checkoutGroupNo: `%${query.checkoutGroupNo.trim()}%` });
    const rows = await builder.take(100).getMany();
    return rows.map((row) => this.publicMallRefund(row));
  }

  async approveRefund(id: number, dto: MallRefundReviewDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    await this.assertAdminRowMerchantAccess({ tenant: refund.tenant, merchant: refund.merchant || refund.order?.merchant || null }, admin, "商城售后单");
    if (refund.status !== "pending") throw new BadRequestException("当前售后单已处理");
    await this.dataSource.transaction(async (manager) => {
      refund.reviewRemark = this.optionalString(dto.remark);
      refund.reviewedBy = admin?.username || "system";
      refund.reviewedAt = new Date();
      await this.applyMallRefundPlan(manager, refund, admin?.username || "system", false);
    });
    await this.logOperation(admin, "mall.refund.approve", "mall_refund", refund.id, `通过商城售后：${refund.refundNo}`, refund.tenant.id);
    await this.refreshCheckoutGroupStatusForOrder(refund.order);
    const saved = await this.refunds.findOne({ where: { id } });
    return saved ? this.publicMallRefund(saved) : null;
  }

  async retryRefund(id: number, dto: MallRefundReviewDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    await this.assertAdminRowMerchantAccess({ tenant: refund.tenant, merchant: refund.merchant || refund.order?.merchant || null }, admin, "商城售后单");
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
    return saved ? this.publicMallRefund(saved) : null;
  }

  async rejectRefund(id: number, dto: MallRefundReviewDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    await this.assertAdminRowMerchantAccess({ tenant: refund.tenant, merchant: refund.merchant || refund.order?.merchant || null }, admin, "商城售后单");
    if (refund.status !== "pending") throw new BadRequestException("当前售后单已处理");
    refund.status = "rejected";
    refund.reviewRemark = this.optionalString(dto.remark);
    refund.reviewedBy = admin?.username || "system";
    refund.reviewedAt = new Date();
    const order = refund.order;
    order.status = order.shippedAt ? "shipped" : "paid";
    await this.orders.save(order);
    await this.refunds.save(refund);
    await this.refreshCheckoutGroupStatusForOrder(order);
    await this.logOperation(admin, "mall.refund.reject", "mall_refund", refund.id, `拒绝商城售后：${refund.refundNo}`, refund.tenant.id);
    return this.publicMallRefund(refund);
  }

  private async replaceSkus(product: MallProduct, tenant: Tenant, merchant: MallMerchant | null, inputs: MallProductDto["skus"]) {
    const existing = await this.skus.find({ where: { product: { id: product.id } } });
    const keepIds = new Set<number>();
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
      row.skuCode = this.optionalString(input.skuCode);
      row.price = Number(input.price || 0).toFixed(2);
      row.originalPrice = Number(input.originalPrice || 0).toFixed(2);
      row.stock = nextStock;
      row.lockedStock = oldLocked;
      row.sortOrder = Number(input.sortOrder ?? index);
      row.enabled = input.enabled !== false;
      const saved = await this.skus.save(row);
      if (saved.stock !== oldStock) {
        await this.inventoryLogs.save(this.inventoryLogs.create({ tenant, merchant, sku: saved, order: null, type: "adjust", quantity: saved.stock - oldStock, stockBefore: oldStock, stockAfter: saved.stock, lockedBefore: oldLocked, lockedAfter: saved.lockedStock, remark: id ? "商品编辑调整库存" : "商品创建初始化库存" }));
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
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      sku.stock = Math.max(sku.stock - item.quantity, 0);
      sku.lockedStock = Math.max(sku.lockedStock - item.quantity, 0);
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, merchant: order.merchant || sku.merchant || null, sku, order, type: "deduct", quantity: item.quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: "商城支付确认扣库存" }));
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

  private createWechatSandboxPayment(order: MallOrder, dto: MallProviderPayDto) {
    this.assertMallSandboxAllowed("商城微信支付");
    const transactionNo = String(dto.transactionNo || "").trim() || `MALWX${Date.now()}${order.id}`;
    const timestamp = String(Date.now());
    const amount = Number(order.amount || 0).toFixed(2);
    const sign = this.signWechatSandboxPayload(order.orderNo, transactionNo, amount, timestamp);
    const callbackPath = order.merchant?.paymentMode === "merchant_direct" ? `/payment/mall/merchants/${order.merchant.id}/wechat/callback` : "/payment/mall/wechat/callback";
    const routing = this.mallWechatPaymentRoutingSummary(order, null, callbackPath);
    return {
      provider: "wechat",
      mode: "sandbox",
      orderNo: order.orderNo,
      amount,
      transactionNo,
      timestamp,
      sign,
      callbackPath,
      merchantId: routing.merchantId,
      paymentMode: routing.paymentMode,
      collectionMode: routing.collectionMode,
      merchantScope: routing.merchantScope,
      routing,
      payParams: {
        orderNo: order.orderNo,
        amount,
        transactionNo,
        timestamp,
        sign,
        paymentScene: dto.paymentScene || "h5",
        callbackPath,
        mallMerchantId: routing.merchantId,
        mallPaymentMode: routing.paymentMode,
        mallMerchantScope: routing.merchantScope
      }
    };
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
    const lockedOrder = await orderRepo.findOne({
      where: { id: refund.order.id },
      relations: ["tenant", "merchant", "checkoutGroup", "user", "coupon"],
      loadEagerRelations: false,
      lock: { mode: "pessimistic_write" }
    });
    if (!lockedOrder) throw new NotFoundException("商城订单不存在");
    const refundPlan = await this.mallRefundProviderPlan(lockedOrder, refund);
    refund.status = refundPlan.status;
    refund.completedAt = refundPlan.completedAt;
    refund.providerRefundNo = refundPlan.providerRefundNo;
    refund.providerRefundStatus = refundPlan.providerRefundStatus;
    refund.providerRefundSyncedAt = refundPlan.providerRefundSyncedAt;
    refund.providerRefundPayload = { ...(refundPlan.providerRefundPayload || {}), retry };
    refund.providerRefundFailureReason = refundPlan.providerRefundFailureReason;
    refund.providerRefundRetryCount = Number(refund.providerRefundRetryCount || 0) + (retry ? 1 : 0);
    refund.providerRefundNextQueryAt = refundPlan.providerRefundNextQueryAt;
    await refundRepo.save(refund);
    if (refundPlan.status === "approved") {
      if (lockedOrder.status !== "refunded") {
        lockedOrder.status = "refunded";
        await orderRepo.save(lockedOrder);
        await this.updateGroupBuyRecordsForOrder(manager, lockedOrder, "refunded");
        await this.returnInventory(manager, lockedOrder);
        await this.voidMallCommission(manager, lockedOrder, `商城订单退款：${refund.refundNo}`);
        if (lockedOrder.paymentMethod === PaymentMethod.Balance) await this.refundMallBalanceOnce(manager, lockedOrder, refund, operator);
        await this.handleMallRefundPoints(lockedOrder, refund, manager);
      }
    } else {
      lockedOrder.status = "refund_pending";
      await orderRepo.save(lockedOrder);
    }
    await this.createMallRefundLog(manager, refund, lockedOrder, refundPlan, retry ? `${operator}（重试）` : operator);
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
      const alreadyRefunded = lockedRefund.status === "approved" && lockedOrder.status === "refunded";
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
          lockedOrder.status = "refunded";
          await orderRepo.save(lockedOrder);
          await this.updateGroupBuyRecordsForOrder(manager, lockedOrder, "refunded");
          await this.returnInventory(manager, lockedOrder);
          await this.voidMallCommission(manager, lockedOrder, `商城订单退款通知：${lockedRefund.refundNo}`);
          await this.handleMallRefundPoints(lockedOrder, lockedRefund, manager);
        }
        action = alreadyRefunded ? "idempotent" : "completed";
      } else if (notification.status === "failed") {
        if (!alreadyRefunded) {
          lockedRefund.status = "failed";
          lockedRefund.providerRefundNextQueryAt = null;
          lockedOrder.status = "refund_pending";
          await orderRepo.save(lockedOrder);
        }
        await refundRepo.save(lockedRefund);
        action = alreadyRefunded ? "idempotent" : "failed";
      } else {
        if (!alreadyRefunded) {
          lockedRefund.status = "processing";
          lockedRefund.providerRefundNextQueryAt = new Date(Date.now() + 10 * MINUTE_MS);
          lockedOrder.status = "refund_pending";
          await orderRepo.save(lockedOrder);
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
    const exists = await txRepo.findOne({ where: { idempotencyKey } });
    if (exists) return;
    const walletRepo = manager.getRepository(UserWallet);
    const tenantScopeKey = this.walletTenantScopeKey(refund.tenant);
    let wallet = await walletRepo.findOne({ where: { user: { id: refund.user.id }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
    if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user: refund.user, tenant: refund.tenant, tenantScopeKey }));
    const amount = Number(refund.amount);
    const before = Number(wallet.availableBalance || 0);
    const after = before + amount;
    wallet.availableBalance = after.toFixed(2);
    await walletRepo.save(wallet);
    await txRepo.save(txRepo.create({ wallet, user: refund.user, tenant: refund.tenant, order: null, transactionNo: `MALREF${Date.now()}${refund.id}`, direction: "credit", type: "refund_return", amount: amount.toFixed(2), balanceBefore: before.toFixed(2), balanceAfter: after.toFixed(2), operator, remark: `商城订单退款：${order.orderNo}`, idempotencyKey }));
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

  private async returnInventory(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder) {
    const skuRepo = manager.getRepository(MallSku);
    const inventoryRepo = manager.getRepository(MallInventoryLog);
    const items = await manager.getRepository(MallOrderItem).find({ where: { order: { id: order.id } }, relations: ["sku", "flashSale", "groupBuy"], loadEagerRelations: false });
    for (const item of items) {
      const sku = await skuRepo.findOne({ where: { id: item.sku.id }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!sku) continue;
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      sku.stock += item.quantity;
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, merchant: order.merchant || sku.merchant || null, sku, order, type: "return", quantity: item.quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: "商城退款退回库存" }));
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

  private async createCheckoutGroupFromResolved(user: User, dto: CreateMallOrderDto, context: PublicTenantContext | undefined, tenant: Tenant, cartRows: MallCartItem[], groups: { merchant: MallMerchant; items: MallOrderInputItem[] }[]): Promise<MallCheckoutGroupResult> {
    if (dto.couponCode) throw new BadRequestException("跨店结算暂不支持整单优惠券，请按店铺使用优惠券或分店铺结算");
    if (dto.promotionCode) throw new BadRequestException("跨店结算暂不支持整单推广码，请分店铺结算后使用对应店铺推广码");
    if (Number(dto.pointsToUse || 0) > 0) throw new BadRequestException("跨店结算暂不支持整单积分抵扣，请分店铺结算或不使用积分");
    const paymentMethod = dto.paymentMethod || PaymentMethod.Offline;
    if (paymentMethod === PaymentMethod.Balance) throw new BadRequestException("跨店结算暂不支持余额支付，请选择线下收款/微信支付，或分店铺分别下单，避免余额分单扣款不一致。");
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
    await this.previewGoodsAmount(tenant, groups.flatMap((group) => group.items), user);
    let checkoutGroup: MallCheckoutGroup;
    try {
      checkoutGroup = await this.checkoutGroups.save(this.checkoutGroups.create({
        groupNo: this.generateCheckoutGroupNo(),
        tenant,
        user,
        amount: "0.00",
        goodsAmount: "0.00",
        discountAmount: "0.00",
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
    try {
      for (const group of groups) {
        const child = await this.createOrder(user, {
          ...dto,
          items: group.items,
          cartItemIds: undefined,
          couponCode: undefined,
          pointsToUse: 0,
          clientOrderKey: dto.clientOrderKey ? `${dto.clientOrderKey}_${group.merchant.id}` : undefined
        }, context, checkoutGroup) as MallOrderPublicResult;
        orders.push(child);
      }
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
    const orderIds = orders.map((order) => order.id);
    const internalOrders = orderIds.length ? await this.orders.find({ where: { id: In(orderIds) }, order: { id: "ASC" } }) : [];
    const amount = internalOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const goodsAmount = internalOrders.reduce((sum, order) => sum + Number(order.goodsAmount || 0), 0);
    const discountAmount = internalOrders.reduce((sum, order) => sum + Number(order.discountAmount || 0), 0);
    checkoutGroup.amount = amount.toFixed(2);
    checkoutGroup.goodsAmount = goodsAmount.toFixed(2);
    checkoutGroup.discountAmount = discountAmount.toFixed(2);
    checkoutGroup.status = internalOrders.length ? this.computeCheckoutGroupStatus(internalOrders) : "pending_payment";
    const paymentTasks = await Promise.all(internalOrders.map((order) => this.buildCheckoutPaymentTask(tenant, order)));
    checkoutGroup.paymentTasks = paymentTasks;
    const savedGroup = await this.checkoutGroups.save(checkoutGroup);
    return this.publicCheckoutGroup(savedGroup, orders);
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
    const amount = orders.reduce((sum, order: any) => sum + Number(order.amount || 0), 0);
    const goodsAmount = orders.reduce((sum, order: any) => sum + Number(order.goodsAmount || 0), 0);
    const discountAmount = orders.reduce((sum, order: any) => sum + Number(order.discountAmount || 0), 0);
    checkoutGroup.status = "closed";
    checkoutGroup.amount = amount.toFixed(2);
    checkoutGroup.goodsAmount = goodsAmount.toFixed(2);
    checkoutGroup.discountAmount = discountAmount.toFixed(2);
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
    const requiresSeparatePayment = true;
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
      canCombinePayment: false,
      requiresSeparatePayment,
      combineBlockedReason: requiresSeparatePayment ? "当前多商户结算按店铺子订单独立支付/确认，避免商户直收、退款和结算串账。" : "",
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
        : "用户需对该子订单发起余额支付，支付成功后进入待发货。";
    }
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
      const amount = (flashSale ? Number(flashSale.salePrice || 0) : groupBuy ? Number(groupBuy.groupPrice || 0) : Number(sku.price || 0)) * quantity;
      goodsAmount += amount;
      const merchant = sku.merchant || sku.product.merchant || await this.ensureDefaultMerchant(tenant);
      if (merchant.tenant.id !== tenant.id || merchant.status !== "active" || !merchant.mallEnabled) throw new BadRequestException(`「${sku.product.title}」所属店铺暂未开放`);
      previewItems.push({ productId: sku.product.id, categoryId: sku.product.category?.id || null, merchantId: merchant.id, amount });
    }
    return { goodsAmount, items: previewItems };
  }

  private async computeMallPointsQuote(user: User, amountAfterCoupon: number, requestedPoints?: number) {
    const profile = await this.memberProfiles.findOne({ where: { user: { id: user.id } } });
    const availablePoints = Math.max(Number(profile?.points || 0), 0);
    const safeAmount = Math.max(Number(amountAfterCoupon || 0), 0);
    const pointsUsed = Math.min(Math.max(Math.trunc(Number(requestedPoints || 0)), 0), availablePoints, Math.floor(safeAmount * 100));
    return { availablePoints, pointsUsed, pointsDiscountAmount: pointsUsed / 100 };
  }

  private async resolvePromotionCode(tenant: Tenant, value?: unknown, merchant?: MallMerchant | null) {
    const code = this.normalizePromotionCode(value);
    if (!code) return null;
    const row = await this.promotionCodes.findOne({ where: { tenant: { id: tenant.id }, code } });
    if (!row || row.tenant.id !== tenant.id || !row.enabled) throw new BadRequestException("推广码不存在或已停用");
    if (row.merchant) {
      if (row.merchant.status !== "active" || !row.merchant.mallEnabled) throw new BadRequestException("该推广码所属店铺未开通商城，暂不可用");
      if (merchant && row.merchant.id !== merchant.id) throw new BadRequestException("该推广码仅限所属店铺商品使用");
    }
    return row;
  }

  private promotionSnapshot(row: MallPromotionCode) {
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
      agentName: row.agent?.name || null
    };
  }

  private async createMallCommissionForOrder(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder) {
    const snapshot = order.promotionSnapshot as Record<string, unknown> | null;
    const code = this.normalizePromotionCode(order.promotionCode || snapshot?.code);
    if (!code) return null;
    const commissionRepo = manager.getRepository(MallCommission);
    const exists = await commissionRepo.findOne({ where: { order: { id: order.id } }, loadEagerRelations: false });
    if (exists) return exists;
    const codeRepo = manager.getRepository(MallPromotionCode);
    const promotion = await codeRepo.findOne({
      where: { code },
      relations: ["tenant", "merchant", "promoterUser", "agent"],
      loadEagerRelations: false,
      lock: { mode: "pessimistic_write" }
    });
    if (!promotion || !promotion.enabled || promotion.tenant.id !== order.tenant.id) return null;
    if (promotion.merchant && (!order.merchant || promotion.merchant.id !== order.merchant.id || promotion.merchant.status !== "active" || !promotion.merchant.mallEnabled)) return null;
    const amount = Number(order.amount || 0);
    const rate = Math.min(Math.max(Number(promotion.commissionRate || 0), 0), 1);
    const commissionAmount = amount * rate;
    promotion.orderCount += 1;
    promotion.orderAmount = (Number(promotion.orderAmount || 0) + amount).toFixed(2);
    await codeRepo.save(promotion);
    return commissionRepo.save(commissionRepo.create({
      tenant: order.tenant,
      merchant: order.merchant || null,
      order,
      promotionCode: promotion,
      promoterUser: promotion.promoterUser,
      agent: promotion.agent,
      code: promotion.code,
      orderAmount: amount.toFixed(2),
      commissionRate: rate.toFixed(4),
      commissionAmount: commissionAmount.toFixed(2),
      status: "pending",
      voidReason: null,
      voidedAt: null,
      settledAt: null
    }));
  }

  private async voidMallCommission(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, reason: string) {
    const repo = manager.getRepository(MallCommission);
    const commission = await repo.findOne({ where: { order: { id: order.id } }, lock: { mode: "pessimistic_write" } });
    if (!commission || commission.status !== "pending") return null;
    commission.status = "void";
    commission.voidReason = reason;
    commission.voidedAt = new Date();
    return repo.save(commission);
  }

  private async awardMallPurchasePoints(order: MallOrder, manager?: Pick<DataSource["manager"], "getRepository">) {
    const points = Math.floor(Number(order.amount || 0));
    if (points <= 0) return null;
    return this.awardMallPoints(order.user, points, "mall_order_paid", order.id, "商城消费积分", manager);
  }

  private async handleMallRefundPoints(order: MallOrder, refund: MallRefund, manager?: Pick<DataSource["manager"], "getRepository">) {
    const refundAmount = Number(refund.amount || 0);
    await this.awardMallPoints(order.user, -Math.floor(refundAmount), "mall_order_refund", order.id, "商城退款扣减消费积分", manager);
    if (refundAmount + 0.0001 >= Number(order.amount || 0)) await this.refundMallRedeemedPoints(order, "商城退款返还抵扣积分", manager);
  }

  private async refundMallRedeemedPoints(order: MallOrder, remark: string, manager?: Pick<DataSource["manager"], "getRepository">) {
    if (!order.pointsUsed || order.pointsUsed <= 0 || order.pointsRefundedAt) return null;
    await this.awardMallPoints(order.user, order.pointsUsed, "mall_points_return", order.id, remark, manager);
    order.pointsRefundedAt = new Date();
    const orderRepo = manager ? manager.getRepository(MallOrder) : this.orders;
    await orderRepo.save(order);
    return order;
  }

  private async awardMallPoints(user: User, points: number, sourceType: string, sourceId: string | number, remark: string, manager?: Pick<DataSource["manager"], "getRepository">) {
    if (!points) return null;
    const key = String(sourceId);
    const pointRepo = manager ? manager.getRepository(MemberPointLog) : this.memberPointLogs;
    const exists = await pointRepo.findOne({ where: { sourceType, sourceId: key } });
    if (exists) return exists;
    const log = await pointRepo.save(pointRepo.create({ user, points, type: points >= 0 ? "earn" : "deduct", sourceType, sourceId: key, remark }));
    await this.refreshMallMemberProfile(user, manager);
    return log;
  }

  private async refreshMallMemberProfile(user: User, manager?: Pick<DataSource["manager"], "getRepository">) {
    const profileRepo = manager ? manager.getRepository(MemberProfile) : this.memberProfiles;
    const pointRepo = manager ? manager.getRepository(MemberPointLog) : this.memberPointLogs;
    let profile = await profileRepo.findOne({ where: { user: { id: user.id } } });
    if (!profile) profile = profileRepo.create({ user, level: null });
    const pointSum = await pointRepo.createQueryBuilder("p").select("COALESCE(SUM(p.points), 0)", "sum").where("p.userId = :userId", { userId: user.id }).getRawOne<{ sum: string }>();
    profile.points = Number(pointSum?.sum || 0);
    profile.level = await this.resolveMallMemberLevel(profile.points);
    profile.lastActiveAt = new Date();
    return profileRepo.save(profile);
  }

  private async resolveMallMemberLevel(points: number) {
    const levels = await this.memberLevels.find({ where: { enabled: true }, order: { minPoints: "DESC" } });
    return levels.find((level) => points >= level.minPoints) || null;
  }

  private async closeOrderAndReleaseLockedInventory(orderId: number, reason: string) {
    let checkoutGroupId = 0;
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
      lockedOrder.status = "closed";
      lockedOrder.closedAt = new Date();
      lockedOrder.closeReason = reason;
      lockedOrder.expiresAt = null;
      await orderRepo.save(lockedOrder);
      await this.updateGroupBuyRecordsForOrder(manager, lockedOrder, "closed");
      await this.releaseCouponUsage(manager, lockedOrder);
      await this.releaseLockedInventory(manager, lockedOrder, reason);
      await this.refundMallRedeemedPoints(lockedOrder, "商城订单关闭返还积分", manager);
    });
    if (checkoutGroupId) await this.refreshCheckoutGroupStatus(checkoutGroupId);
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
      const records = await recordRepo.find({ where: this.mallBatchWhere(batchScope, { teamNo }), relations: ["order"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!records.length) return { failed: false, refundedOrderCount: 0, manualRefundOrderCount: 0, skippedOrderCount: 0 };
      const paidPeople = records.filter((record) => record.status === "paid").reduce((sum, record) => sum + Number(record.quantity || 0), 0);
      const minPeople = Math.max(...records.map((record) => Number(record.minPeople || 2)));
      if (paidPeople >= minPeople || records.some((record) => record.teamStatus === "success")) return { failed: false, refundedOrderCount: 0, manualRefundOrderCount: 0, skippedOrderCount: 0 };
      const now = new Date();
      let refundedOrderCount = 0;
      let manualRefundOrderCount = 0;
      let skippedOrderCount = 0;
      for (const record of records) {
        record.teamStatus = "failed";
        if (record.status !== "paid") continue;
        const order = await orderRepo.findOne({
          where: { id: record.order.id },
          relations: ["tenant", "merchant", "checkoutGroup", "user", "coupon"],
          loadEagerRelations: false,
          lock: { mode: "pessimistic_write" }
        });
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
        let wallet = await walletRepo.findOne({ where: { user: { id: order.user.id }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
        if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user: order.user, tenant: order.tenant, tenantScopeKey }));
        const amount = Number(order.amount || 0);
        const before = Number(wallet.availableBalance || 0);
        const after = before + amount;
        wallet.availableBalance = after.toFixed(2);
        await walletRepo.save(wallet);
        await walletTxRepo.save(walletTxRepo.create({ wallet, user: order.user, tenant: order.tenant, order: null, transactionNo: `MALGBREF${Date.now()}${order.id}`, direction: "credit", type: "refund_return", amount: amount.toFixed(2), balanceBefore: before.toFixed(2), balanceAfter: after.toFixed(2), operator: admin?.username || "system", remark: `拼团未成团自动退款：${order.orderNo}`, idempotencyKey: `mall_group_buy_fail:${record.teamNo}:${order.id}` }));
        await this.returnInventory(manager, order);
        await this.handleMallRefundPoints(order, manager.getRepository(MallRefund).create({ amount: amount.toFixed(2) } as MallRefund), manager);
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
    const timer = setInterval(() => {
      this.closeExpiredPendingOrders().catch((error) => {
        console.error("[mall] close expired pending orders failed", error);
      });
      this.completeExpiredShippedOrders().catch((error) => {
        console.error("[mall] complete expired shipped orders failed", error);
      });
      this.failExpiredGroupBuyTeams().catch((error) => {
        console.error("[mall] fail expired group buy teams failed", error);
      });
    }, intervalMinutes * MINUTE_MS);
    timer.unref?.();
    return timer;
  }

  private configNumber(name: string, fallback: number) {
    const value = Number(this.config.get<string>(name, String(fallback)));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  private mallOrderExpiresAt(paymentMethod: PaymentMethod) {
    const minutes = paymentMethod === PaymentMethod.Offline
      ? this.configNumber("MALL_PENDING_CONFIRM_EXPIRE_MINUTES", 24 * 60)
      : this.configNumber("MALL_PENDING_PAYMENT_EXPIRE_MINUTES", 30);
    return new Date(Date.now() + minutes * MINUTE_MS);
  }

  private async releaseCouponUsage(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder) {
    const couponId = order.couponId || order.coupon?.id;
    if (!couponId) return;
    const couponRepo = manager.getRepository(MallCoupon);
    const coupon = await couponRepo.findOne({ where: { id: couponId }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
    const usageRepo = manager.getRepository(MallCouponUsage);
    const usage = await usageRepo.findOne({ where: { order: { id: order.id }, status: "used" }, relations: ["coupon"], loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
    if (!usage) return;
    usage.status = "released";
    usage.releasedAt = new Date();
    usage.releaseReason = order.closeReason || "订单关闭释放优惠券";
    await usageRepo.save(usage);
    await this.releaseCouponClaimUsage(manager, order.tenant, usage.coupon, order.user);
    if (!coupon || coupon.usedCount <= 0) return;
    coupon.usedCount -= 1;
    await couponRepo.save(coupon);
  }

  private async releaseLockedInventory(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, reason: string) {
    const skuRepo = manager.getRepository(MallSku);
    const inventoryRepo = manager.getRepository(MallInventoryLog);
    const items = await manager.getRepository(MallOrderItem).find({ where: { order: { id: order.id } }, relations: ["sku", "flashSale", "groupBuy"], loadEagerRelations: false });
    for (const item of items) {
      const sku = await skuRepo.findOne({ where: { id: item.sku.id }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!sku) continue;
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      sku.lockedStock = Math.max(sku.lockedStock - item.quantity, 0);
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, merchant: order.merchant || sku.merchant || null, sku, order, type: "release", quantity: item.quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: reason }));
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

  private async resolveGroupBuyTeamNo(manager: Pick<DataSource["manager"], "getRepository">, tenant: Tenant, groupBuy: MallGroupBuy, joinTeamNo?: string) {
    const teamNo = this.optionalString(joinTeamNo);
    if (!teamNo) return this.generateGroupBuyTeamNo();
    const record = await manager.getRepository(MallGroupBuyRecord).findOne({ where: { tenant: { id: tenant.id }, groupBuy: { id: groupBuy.id }, teamNo }, loadEagerRelations: false });
    if (!record) throw new BadRequestException("拼团队伍不存在或已失效");
    if (record.teamStatus === "failed") throw new BadRequestException("该拼团队伍已失败，请重新开团");
    if (record.teamStatus === "success") throw new BadRequestException("该拼团队伍已成团，请重新开团");
    return teamNo;
  }

  private async refreshGroupBuyTeamStatus(manager: Pick<DataSource["manager"], "getRepository">, teamNo: string) {
    const repo = manager.getRepository(MallGroupBuyRecord);
    const records = await repo.find({ where: { teamNo }, loadEagerRelations: false });
    if (!records.length) return;
    const paidPeople = records.filter((record) => record.status === "paid").reduce((sum, record) => sum + Number(record.quantity || 0), 0);
    const minPeople = Math.max(...records.map((record) => Number(record.minPeople || 2)));
    const teamStatus = paidPeople >= minPeople ? "success" : "forming";
    for (const record of records) {
      record.paidPeople = paidPeople;
      if (record.status !== "closed" && record.status !== "refunded") record.teamStatus = teamStatus;
    }
    await repo.save(records);
  }

  private async findAdminOrder(id: number, admin?: AdminContext) {
    const order = await this.orders.findOne({
      where: { id },
      relations: ["tenant", "merchant", "checkoutGroup", "user", "coupon"],
      loadEagerRelations: false
    });
    if (!order) throw new NotFoundException("商城订单不存在");
    this.assertAdminTenantAccess(order, admin);
    await this.assertAdminRowMerchantAccess(order, admin, "商城订单");
    return order;
  }

  private async findAdminSettlement(id: number, admin?: AdminContext) {
    const settlement = await this.settlements.findOne({ where: { id } });
    if (!settlement) throw new NotFoundException("商城结算单不存在");
    this.assertAdminTenantAccess(settlement, admin);
    await this.assertAdminMerchantAccess(settlement.merchant, admin);
    return settlement;
  }

  private async buildMallSettlementDraft(tenant: Tenant, merchant: MallMerchant, periodStart: string, periodEnd: string) {
    const startAt = `${periodStart} 00:00:00`;
    const endAt = `${periodEnd} 23:59:59`;
    const settled = await this.settledMallSnapshotIds(tenant, merchant, periodStart, periodEnd);
    const orderBuilder = this.orders
      .createQueryBuilder("order")
      .where("order.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("order.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("order.status = :status", { status: "completed" })
      .andWhere("order.completedAt BETWEEN :startAt AND :endAt", { startAt, endAt });
    if (settled.orderIds.length) orderBuilder.andWhere("order.id NOT IN (:...settledOrderIds)", { settledOrderIds: settled.orderIds });
    const orders = await orderBuilder.getMany();
    const refundBuilder = this.refunds
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .where("refund.tenantId = :tenantId", { tenantId: tenant.id })
      .andWhere("refund.merchantId = :merchantId", { merchantId: merchant.id })
      .andWhere("refund.status = :status", { status: "approved" })
      .andWhere("COALESCE(refund.completedAt, refund.createdAt) BETWEEN :startAt AND :endAt", { startAt, endAt });
    if (settled.refundIds.length) refundBuilder.andWhere("refund.id NOT IN (:...settledRefundIds)", { settledRefundIds: settled.refundIds });
    const refunds = await refundBuilder.getMany();
    const orderAmount = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const refundAmount = refunds.reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
    const merchantDirectOrderAmount = orders.filter((order) => this.isMerchantDirectCollectedSettlementOrder(order, merchant)).reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const merchantDirectRefundAmount = refunds.filter((refund) => this.isMerchantDirectCollectedSettlementOrder(refund.order, merchant)).reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
    const amounts = this.mallSettlementAmounts(orderAmount, refundAmount, merchantDirectOrderAmount, merchantDirectRefundAmount, merchant);
    return {
      tenant,
      merchant,
      periodStart,
      periodEnd,
      status: "draft" as const,
      paymentMode: merchant.paymentMode,
      orderCount: orders.length,
      orderAmount: orderAmount.toFixed(2),
      refundAmount: refundAmount.toFixed(2),
      serviceFeeAmount: amounts.serviceFeeAmount.toFixed(2),
      payableAmount: amounts.payableAmount.toFixed(2),
      snapshot: {
        orderIds: orders.map((order) => order.id),
        refundIds: refunds.map((refund) => refund.id),
        serviceFeeRate: amounts.serviceFeeRate,
        paymentMode: merchant.paymentMode,
        merchantDirectCollectionOrderAmount: merchantDirectOrderAmount.toFixed(2),
        merchantDirectCollectionRefundAmount: merchantDirectRefundAmount.toFixed(2),
        merchantDirectNetAmount: amounts.merchantDirectNetAmount.toFixed(2),
        platformCollectedNetAmount: amounts.platformCollectedNetAmount.toFixed(2),
        settlementConfig: merchant.settlementConfig || {}
      }
    };
  }

  private mallSettlementQueryRange(query: MallListQueryDto) {
    const periodStart = query.startDate ? this.normalizeSettlementDate(query.startDate, "结算开始日期") : "";
    const periodEnd = query.endDate ? this.normalizeSettlementDate(query.endDate, "结算结束日期") : "";
    if (periodStart && periodEnd && periodStart > periodEnd) throw new BadRequestException("结算开始日期不能晚于结束日期");
    return { periodStart, periodEnd };
  }

  private async settledMallSnapshotIds(tenant: Tenant | null, merchant: MallMerchant | null, periodStart?: string, periodEnd?: string) {
    const builder = this.settlements
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
    for (const row of rows) {
      const snapshot = this.mallSettlementSnapshot(row.snapshot);
      for (const id of snapshot.orderIds) orderIds.add(id);
      for (const id of snapshot.refundIds) refundIds.add(id);
    }
    return { orderIds: [...orderIds], refundIds: [...refundIds] };
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
    return { orderIds: toIds(input.orderIds), refundIds: toIds(input.refundIds) };
  }

  private async publicOrderWithItems(order: MallOrder, user?: User): Promise<MallOrderWithItemsResult> {
    const items = await this.orderItems.find({
      where: { order: { id: order.id } },
      relations: ["merchant", "product", "sku", "flashSale", "groupBuy"],
      loadEagerRelations: false
    });
    const refund = await this.refunds.findOne({ where: { order: { id: order.id } }, loadEagerRelations: false, order: { createdAt: "DESC" } });
    const groupBuyRecords = await this.groupBuyRecords.find({ where: { order: { id: order.id } }, relations: ["groupBuy"], loadEagerRelations: false });
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
    if (!user || !items.length) return { ...order, items, refund, groupBuyTeams } as MallOrderWithItemsResult;
    const reviews = await this.reviews.find({
      where: { orderItem: { id: In(items.map((item) => item.id)) }, user: { id: user.id } },
      relations: ["orderItem", "merchant", "product", "sku"],
      loadEagerRelations: false
    });
    return { ...order, items: items.map((item) => ({ ...item, review: reviews.find((review) => review.orderItem.id === item.id) || null })), refund, groupBuyTeams } as MallOrderWithItemsResult;
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
      paymentMethod: order.paymentMethod,
      status: order.status,
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
      groupBuyTeams: order.groupBuyTeams.map((team) => this.publicUserGroupBuyTeam(team))
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
    return {
      id: refund.id,
      refundNo: refund.refundNo,
      type: refund.type,
      amount: refund.amount,
      status: refund.status,
      reason: refund.reason,
      images: Array.isArray(refund.images) ? refund.images : [],
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

  private publicCheckoutGroup(checkoutGroup: MallCheckoutGroup, orders: MallOrderPublicResult[]): MallCheckoutGroupResult {
    return {
      id: checkoutGroup.id,
      groupNo: checkoutGroup.groupNo,
      amount: checkoutGroup.amount,
      goodsAmount: checkoutGroup.goodsAmount,
      discountAmount: checkoutGroup.discountAmount,
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
      disabledReason: task.disabledReason || "",
      nextAction: task.nextAction || ""
    };
  }

  private async mallOrderLogistics(order: MallOrder) {
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
      expressCompany: order.expressCompany,
      expressNo: order.expressNo,
      servicePhone: company?.servicePhone || null,
      trackingUrl: company?.trackingUrl || null,
      provider: "manual",
      trackingStatus,
      notice: "当前物流轨迹为手动查询兜底版：后台填写快递公司和单号后，用户可复制单号或打开查询网址；后续可接入快递鸟/快递100自动轨迹。",
      addressSnapshot: order.addressSnapshot,
      timeline
    };
  }

  private publicProduct(product: MallProduct, skus: MallSku[]) {
    const stock = skus.reduce((sum, sku) => sum + Math.max(Number(sku.stock || 0) - Number(sku.lockedStock || 0), 0), 0);
    return {
      id: product.id,
      tenant: this.publicTenantSummary(product.tenant),
      merchant: this.publicMerchantSummary(product.merchant),
      category: this.publicCategory(product.category),
      title: product.title,
      coverUrl: product.coverUrl,
      description: product.description,
      brandName: product.brandName,
      price: product.price,
      originalPrice: product.originalPrice,
      status: product.status,
      featured: product.featured,
      sortOrder: product.sortOrder,
      deliveryNote: product.deliveryNote,
      afterSaleNote: product.afterSaleNote,
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
    return {
      id: row.id,
      user: { nickname: displayName, phone: displayName },
      merchant: this.publicMerchantSummary(row.merchant),
      product: row.product ? { id: row.product.id, title: row.product.title } : null,
      sku: row.sku ? { id: row.sku.id, name: row.sku.name } : null,
      rating: row.rating,
      content: row.content,
      images: Array.isArray(row.images) ? row.images : [],
      status: row.status,
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
      scopeCategoryId: coupon.scopeCategoryId,
      scopeProductId: coupon.scopeProductId,
      usageLimit: coupon.usageLimit,
      perUserLimit,
      usedCount: coupon.usedCount,
      enabled: coupon.enabled,
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,
      runtimeStatus,
      remainingCount: usageLimit > 0 ? Math.max(usageLimit - usedCount, 0) : null,
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
      saleStock: row.saleStock,
      ...(includeInternalStock ? { lockedStock: row.lockedStock } : {}),
      soldStock: row.soldStock,
      perUserLimit: row.perUserLimit,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
      sortOrder: row.sortOrder,
      availableStock,
      runtimeStatus,
      originalPrice: row.sku?.price || row.product?.price || "0.00",
      discountAmount: Math.max(Number(row.sku?.price || row.product?.price || 0) - Number(row.salePrice || 0), 0).toFixed(2),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
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
      groupStock: row.groupStock,
      ...(includeInternalStock ? { lockedStock: row.lockedStock } : {}),
      soldStock: row.soldStock,
      perUserLimit: row.perUserLimit,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
      sortOrder: row.sortOrder,
      availableStock,
      runtimeStatus,
      originalPrice: row.sku?.price || row.product?.price || "0.00",
      discountAmount: Math.max(Number(row.sku?.price || row.product?.price || 0) - Number(row.groupPrice || 0), 0).toFixed(2),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
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
    sale.lockedStock = Math.max(Number(sale.lockedStock || 0) - item.quantity, 0);
    sale.soldStock += item.quantity;
    await manager.getRepository(MallFlashSale).save(sale);
  }

  private async releaseFlashSaleStock(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem, reason: string) {
    const sale = await this.flashSaleForOrderItem(manager, order, item);
    if (!sale) return;
    sale.lockedStock = Math.max(Number(sale.lockedStock || 0) - item.quantity, 0);
    await manager.getRepository(MallFlashSale).save(sale);
    await manager.getRepository(MallInventoryLog).save(manager.getRepository(MallInventoryLog).create({ tenant: order.tenant, sku: item.sku, order, type: "release", quantity: item.quantity, stockBefore: sale.saleStock - sale.soldStock, stockAfter: sale.saleStock - sale.soldStock, lockedBefore: sale.lockedStock + item.quantity, lockedAfter: sale.lockedStock, remark: `商城秒杀释放库存：${reason}` }));
  }

  private async returnFlashSaleStock(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem) {
    const sale = await this.flashSaleForOrderItem(manager, order, item);
    if (!sale) return;
    sale.soldStock = Math.max(Number(sale.soldStock || 0) - item.quantity, 0);
    await manager.getRepository(MallFlashSale).save(sale);
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
    groupBuy.lockedStock = Math.max(Number(groupBuy.lockedStock || 0) - item.quantity, 0);
    groupBuy.soldStock += item.quantity;
    await manager.getRepository(MallGroupBuy).save(groupBuy);
  }

  private async releaseGroupBuyStock(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem, reason: string) {
    const groupBuy = await this.groupBuyForOrderItem(manager, order, item);
    if (!groupBuy) return;
    groupBuy.lockedStock = Math.max(Number(groupBuy.lockedStock || 0) - item.quantity, 0);
    await manager.getRepository(MallGroupBuy).save(groupBuy);
    await manager.getRepository(MallInventoryLog).save(manager.getRepository(MallInventoryLog).create({ tenant: order.tenant, sku: item.sku, order, type: "release", quantity: item.quantity, stockBefore: groupBuy.groupStock - groupBuy.soldStock, stockAfter: groupBuy.groupStock - groupBuy.soldStock, lockedBefore: groupBuy.lockedStock + item.quantity, lockedAfter: groupBuy.lockedStock, remark: `商城拼团释放库存：${reason}` }));
  }

  private async returnGroupBuyStock(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem) {
    const groupBuy = await this.groupBuyForOrderItem(manager, order, item);
    if (!groupBuy) return;
    groupBuy.soldStock = Math.max(Number(groupBuy.soldStock || 0) - item.quantity, 0);
    await manager.getRepository(MallGroupBuy).save(groupBuy);
  }

  private async couponClaimMap(user: User, couponIds: number[]) {
    if (!couponIds.length) return new Map<number, MallCouponClaim>();
    const claims = await this.couponClaims.find({ where: { user: { id: user.id }, coupon: { id: In(couponIds) } }, relations: ["coupon"], loadEagerRelations: false });
    return new Map(claims.map((claim) => [claim.coupon.id, claim]));
  }

  private publicCouponWithClaim(coupon: ReturnType<MallService["adminCoupon"]>, claim?: MallCouponClaim) {
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
    const coupon = this.adminCoupon(claim.coupon);
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

  private mallCouponClaimStatus(coupon: ReturnType<MallService["adminCoupon"]>, claimedCount: number, usedCount: number) {
    if (coupon.runtimeStatus === "expired") return "expired";
    if (coupon.runtimeStatus === "disabled") return "disabled";
    if (coupon.runtimeStatus === "not_started") return "not_started";
    const perUserLimit = Number(coupon.perUserLimit || 0);
    const usableCount = perUserLimit > 0 ? perUserLimit : Math.max(Number(claimedCount || 1), 1);
    return usedCount >= usableCount ? "used" : "available";
  }

  private async markCouponClaimUsed(manager: Pick<DataSource["manager"], "getRepository">, tenant: Tenant, merchant: MallMerchant | null, coupon: MallCoupon, user: User) {
    const repo = manager.getRepository(MallCouponClaim);
    let claim = await repo.findOne({ where: { tenant: { id: tenant.id }, coupon: { id: coupon.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
    if (!claim) claim = repo.create({ tenant, merchant, coupon, user, claimedCount: 1, usedCount: 0 });
    claim.merchant = merchant || claim.merchant || null;
    claim.usedCount += 1;
    await repo.save(claim);
  }

  private async releaseCouponClaimUsage(manager: Pick<DataSource["manager"], "getRepository">, tenant: Tenant, coupon: MallCoupon, user: User) {
    const repo = manager.getRepository(MallCouponClaim);
    const claim = await repo.findOne({ where: { tenant: { id: tenant.id }, coupon: { id: coupon.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
    if (!claim || claim.usedCount <= 0) return;
    claim.usedCount -= 1;
    await repo.save(claim);
  }

  private async publicProductCount(tenant: Tenant, query: MallListQueryDto, merchant?: MallMerchant | null) {
    const builder = this.products
      .createQueryBuilder("product")
      .leftJoin("product.category", "category")
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
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR product.brandName LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.getCount();
  }

  private findPublicProductRow(id: number, tenantId: number, withDisplayRelations = false) {
    return this.products.findOne({
      where: { id, tenant: { id: tenantId }, status: "published" },
      relations: withDisplayRelations ? ["tenant", "merchant", "category"] : ["merchant"],
      loadEagerRelations: false
    });
  }

  private findSellableSkuRow(repository: Repository<MallSku>, id: number, tenantId: number, lock?: { mode: "pessimistic_write" }) {
    return repository.findOne({
      where: { id, tenant: { id: tenantId }, enabled: true },
      relations: ["merchant", "merchant.tenant", "product", "product.merchant", "product.merchant.tenant", "product.category"],
      loadEagerRelations: false,
      lock
    });
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
    return ({ pending: "待处理", processing: "处理中", approved: "已通过", rejected: "已拒绝", failed: "失败" } as Record<string, string>)[value] || value;
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
    return ({ pending: "待结算", settled: "已结算", void: "已作废" } as Record<string, string>)[value] || value;
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
    const base = this.mallWechatPaymentReadiness(tenant, paymentMethods, runtimeConfig);
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
        return value && !existsSync(value);
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
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException("优惠券已被领完/用完");
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
    if (coupon.scope === "category") return scopedItems.filter((item) => item.categoryId === coupon.scopeCategoryId).reduce((sum, item) => sum + item.amount, 0);
    if (coupon.scope === "product") return scopedItems.filter((item) => item.productId === coupon.scopeProductId).reduce((sum, item) => sum + item.amount, 0);
    return 0;
  }

  private assignAddress(row: MallAddress, dto: MallAddressDto) {
    row.receiverName = this.requiredString(dto.receiverName, "收货人");
    row.receiverPhone = this.requiredString(dto.receiverPhone, "手机号");
    row.province = this.optionalString(dto.province);
    row.city = this.optionalString(dto.city);
    row.district = this.optionalString(dto.district);
    row.detail = this.requiredString(dto.detail, "详细地址");
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

  private async adminTargetMerchant(admin?: AdminContext, tenantId?: number, merchantId?: number, allowAll = false, requireEnabled = true): Promise<MallMerchantScope> {
    const id = Number(merchantId || 0);
    if (id) {
      const merchant = await this.merchants.findOne({ where: { id } });
      if (!merchant) throw new NotFoundException("商城店铺不存在");
      const tenant = tenantId ? await this.adminTargetTenant(admin, tenantId) : merchant.tenant;
      if (tenant && merchant.tenant.id !== tenant.id) throw new ForbiddenException("所选店铺不属于当前商家");
      this.assertMallEnabled(merchant.tenant);
      await this.assertAdminMerchantAccess(merchant, admin);
      if (requireEnabled) this.assertMerchantEnabled(merchant);
      return { tenant: merchant.tenant, merchant };
    }
    const tenant = await this.adminTargetTenant(admin, tenantId, allowAll);
    if (!tenant && allowAll) return { tenant: null, merchant: null };
    if (!tenant) throw new BadRequestException("请选择所属商家或店铺");
    if (allowAll && this.isPlatformMallWideContext(admin)) return { tenant, merchant: null };
    const allowedIds = await this.adminAllowedMerchantIds(admin);
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
    await this.assertAdminMerchantAccess(merchant, admin);
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
    if (!merchant || merchant.status !== "active" || !merchant.mallEnabled) throw new NotFoundException("店铺不存在或未开通商城");
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
    if (merchant.tenant.id !== tenant.id || merchant.status !== "active" || !merchant.mallEnabled) {
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
        settlementConfig: { source: "tenant_default" }
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
    const enabledAccessCount = await this.merchantAccess.count({ where: { merchant: { id: merchant.id }, enabled: true } });
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

  private async adminAllowedMerchantIds(admin?: AdminContext) {
    if (!admin?.id || this.isPlatformMallWideContext(admin)) return null;
    const rows = await this.merchantAccess.find({ where: { admin: { id: admin.id }, enabled: true } });
    return rows.map((row) => row.merchant.id);
  }

  private async assertAdminMerchantAccess(merchant: MallMerchant, admin?: AdminContext) {
    if (!admin?.id || this.isPlatformMallWideContext(admin)) return;
    let scopedMerchant = merchant;
    if (admin.tenantId && !scopedMerchant.tenant?.id && scopedMerchant.id) {
      scopedMerchant = await this.merchants.findOne({ where: { id: scopedMerchant.id }, relations: ["tenant"], loadEagerRelations: false }) || scopedMerchant;
    }
    if (admin.tenantId && scopedMerchant.tenant?.id !== admin.tenantId) throw new ForbiddenException("店铺不属于当前商家");
    const allowedIds = await this.adminAllowedMerchantIds(admin);
    if (allowedIds !== null && !allowedIds.includes(merchant.id)) throw new ForbiddenException("当前账号未被授权管理该商城店铺，请联系平台管理员在「店铺管理」中授权");
  }

  private async assertAdminRowMerchantAccess(row: { tenant?: Tenant | null; merchant?: MallMerchant | null }, admin?: AdminContext, label = "商城数据") {
    const merchant = row.merchant || null;
    if (!merchant) throw new BadRequestException(`${label}缺少店铺归属，请先执行多商户商城迁移回填后再操作`);
    await this.assertAdminMerchantAccess(merchant, admin);
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
  }

  private assertMerchantEnabled(merchant: MallMerchant) {
    if (merchant.status !== "active" || !merchant.mallEnabled) throw new ForbiddenException("当前店铺未开通商城，请先在商城店铺管理中启用");
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
    return { ...row, providerRefundPayload: this.sanitizeMallProviderPayload(row.providerRefundPayload || null) };
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

  private mallSettlementServiceFeeRate(merchant?: MallMerchant | null) {
    const config = merchant?.settlementConfig && typeof merchant.settlementConfig === "object" && !Array.isArray(merchant.settlementConfig) ? merchant.settlementConfig : {};
    const raw = Number((config as Record<string, unknown>).platformServiceFeeRate ?? (config as Record<string, unknown>).serviceFeeRate ?? 0);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(raw > 1 ? raw / 100 : raw, 1);
  }

  private mallSettlementAmounts(orderAmount: number, refundAmount: number, merchantDirectOrderAmount: number, merchantDirectRefundAmount: number, merchant?: MallMerchant | null) {
    const netAmount = orderAmount - refundAmount;
    const merchantDirectNetAmount = merchantDirectOrderAmount - merchantDirectRefundAmount;
    const platformCollectedNetAmount = (orderAmount - merchantDirectOrderAmount) - (refundAmount - merchantDirectRefundAmount);
    const serviceFeeRate = this.mallSettlementServiceFeeRate(merchant);
    const serviceFeeAmount = netAmount * serviceFeeRate;
    const payableAmount = platformCollectedNetAmount - serviceFeeAmount;
    return { netAmount, merchantDirectNetAmount, platformCollectedNetAmount, serviceFeeRate, serviceFeeAmount, payableAmount };
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

  private assertCouponConfigurationValid(coupon: MallCoupon, minAmount: number, discountAmount: number, usageLimit: number, perUserLimit: number) {
    if (minAmount > 0 && discountAmount > minAmount) throw new BadRequestException("有门槛优惠券的优惠金额不能大于使用门槛；如需无门槛券，请把门槛设置为 0。");
    if (usageLimit > 0 && perUserLimit > usageLimit) throw new BadRequestException("每人可用次数不能大于总可用次数；如需不限每人次数，请把每人次数设置为 0。");
    const usedCount = Math.max(Math.trunc(Number(coupon.usedCount || 0)), 0);
    if (usageLimit > 0 && usageLimit < usedCount) throw new BadRequestException(`优惠券总次数不能小于已使用次数 ${usedCount}；如需停止继续使用，请直接停用优惠券。`);
  }

  private normalizePromotionCode(value: unknown) {
    const text = String(value || "").trim().toUpperCase();
    if (!text) return "";
    if (!/^[A-Z0-9_-]{3,40}$/.test(text)) throw new BadRequestException("推广码仅支持 3-40 位字母、数字、下划线或横线");
    return text;
  }

  private async assertPromotionCodeAvailable(code: string, currentId?: number) {
    const existing = await this.promotionCodes.findOne({ where: { code } });
    if (existing && existing.id !== currentId) throw new BadRequestException("推广码已存在，请换一个推广码，避免佣金归属和用户识别混淆。");
  }

  private assertPromotionTargetScope(tenant: Tenant, promoterUser: User | null, agent: Agent | null) {
    if (promoterUser && agent) throw new BadRequestException("推广码不能同时绑定代理和推广用户，请只保留一个佣金归属对象。");
    if (agent && agent.tenant?.id !== tenant.id) throw new BadRequestException("所选代理不属于当前商家，不能绑定到该店铺推广码。");
  }

  private async assertPromotionCodeAccountingFieldsCanChange(row: MallPromotionCode, next: { code: string; promoterUser: User | null; agent: Agent | null; commissionRate: number }) {
    if (!row.id) return;
    const commissionCount = await this.commissions.count({ where: { promotionCode: { id: row.id } } });
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

  private generateOrderNo() {
    return `MO${Date.now()}${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  }

  private generateCheckoutGroupNo() {
    return `MCG${Date.now()}${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
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
}
