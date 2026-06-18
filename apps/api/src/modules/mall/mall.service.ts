import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHmac } from "crypto";
import ExcelJS from "exceljs";
import { existsSync } from "fs";
import { DataSource, In, IsNull, LessThan, Repository, SelectQueryBuilder } from "typeorm";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { Agent } from "../../entities/agent.entity";
import { MallAddress } from "../../entities/mall-address.entity";
import { MallBrowseHistory } from "../../entities/mall-browse-history.entity";
import { MallCartItem } from "../../entities/mall-cart-item.entity";
import { MallCategory } from "../../entities/mall-category.entity";
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
import { MallOrderItem } from "../../entities/mall-order-item.entity";
import { MallOrder, MallOrderStatus } from "../../entities/mall-order.entity";
import { MallPaymentCallbackLog } from "../../entities/mall-payment-callback-log.entity";
import { MallPaymentTransaction } from "../../entities/mall-payment-transaction.entity";
import { MallProduct } from "../../entities/mall-product.entity";
import { MallPromotionCode } from "../../entities/mall-promotion-code.entity";
import { MallRefund } from "../../entities/mall-refund.entity";
import { MallRefundLog } from "../../entities/mall-refund-log.entity";
import { MallReview, MallReviewStatus } from "../../entities/mall-review.entity";
import { MallSku } from "../../entities/mall-sku.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Tenant } from "../../entities/tenant.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { User } from "../../entities/user.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { PaymentMethod } from "../../shared/domain";
import { assertTenantAccessForActor, normalizeTenantCode } from "../../shared/tenant-scope";
import { CreateMallOrderDto, MallAddressDto, MallCartItemDto, MallCartQuantityDto, MallCategoryDto, MallCommissionBatchSettleDto, MallCommissionSettleDto, MallCouponDto, MallFlashSaleDto, MallGroupBuyDto, MallInventoryAdjustDto, MallListQueryDto, MallLogisticsCompanyDto, MallOrderCloseDto, MallOrderQuoteDto, MallProductDto, MallPromotionCodeDto, MallProviderPaymentCallbackDto, MallProviderPayDto, MallRefundRequestDto, MallRefundReviewDto, MallReviewDto, MallReviewModerationDto, MallShipDto } from "./mall.dto";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null };
type PublicTenantContext = { tenantId?: number | null; tenantCode?: string | null; host?: string | null };
type MallOrderPreviewItem = { productId: number; categoryId: number | null; amount: number };
type MallOrderInputItem = { skuId: number; quantity?: number; flashSaleId?: number; groupBuyId?: number; joinTeamNo?: string };
const MINUTE_MS = 60 * 1000;

@Injectable()
export class MallService implements OnModuleDestroy {
  private readonly pendingOrderWorker?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    @InjectRepository(AdminOperationLog) private readonly operationLogs: Repository<AdminOperationLog>,
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
    @InjectRepository(MemberLevel) private readonly memberLevels: Repository<MemberLevel>,
    @InjectRepository(MemberProfile) private readonly memberProfiles: Repository<MemberProfile>,
    @InjectRepository(MemberPointLog) private readonly memberPointLogs: Repository<MemberPointLog>,
    @InjectRepository(UserWallet) private readonly userWallets: Repository<UserWallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactions: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService
  ) {
    this.pendingOrderWorker = this.startPendingOrderWorker();
  }

  onModuleDestroy() {
    if (this.pendingOrderWorker) clearInterval(this.pendingOrderWorker);
  }

  async adminCategories(admin?: AdminContext, tenantId?: number) {
    const tenant = await this.adminTargetTenant(admin, tenantId);
    const builder = this.categories.createQueryBuilder("category").leftJoinAndSelect("category.tenant", "tenant").orderBy("category.sortOrder", "ASC").addOrderBy("category.id", "ASC");
    this.applyTenantFilter(builder, "category", tenant);
    return builder.getMany();
  }

  async saveCategory(dto: MallCategoryDto, id?: number, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, dto.tenantId);
    if (!tenant) throw new BadRequestException("请选择所属商家");
    const row = id ? await this.categories.findOne({ where: { id } }) : this.categories.create();
    if (!row) throw new NotFoundException("商城分类不存在");
    this.assertAdminTenantAccess(row, admin);
    row.tenant = tenant;
    row.name = this.requiredString(dto.name, "分类名称");
    row.iconUrl = this.optionalString(dto.iconUrl);
    row.sortOrder = Number(dto.sortOrder || 0);
    row.enabled = dto.enabled !== false;
    const saved = await this.categories.save(row);
    await this.logOperation(admin, id ? "mall.category.update" : "mall.category.create", "mall_category", saved.id, `${id ? "更新" : "创建"}商城分类：${saved.name}`, saved.tenant.id);
    return saved;
  }

  async adminCoupons(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.coupons.createQueryBuilder("coupon").leftJoinAndSelect("coupon.tenant", "tenant").orderBy("coupon.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "coupon", tenant);
    if (query.enabled === "true") builder.andWhere("coupon.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("coupon.enabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) builder.andWhere("(coupon.code LIKE :keyword OR coupon.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const coupons = await builder.take(200).getMany();
    const rows = coupons.map((coupon) => this.adminCoupon(coupon));
    if (!query.status) return rows;
    return rows.filter((coupon) => coupon.runtimeStatus === query.status);
  }

  async saveCoupon(dto: MallCouponDto, id?: number, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, dto.tenantId);
    if (!tenant) throw new BadRequestException("请选择所属商家");
    const row = id ? await this.coupons.findOne({ where: { id } }) : this.coupons.create();
    if (!row) throw new NotFoundException("商城优惠券不存在");
    this.assertAdminTenantAccess(row, admin);
    row.tenant = tenant;
    row.code = this.normalizeCouponCode(dto.code);
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
      const category = await this.categories.findOne({ where: { id: Number(dto.scopeCategoryId || 0), tenant: { id: tenant.id } } });
      if (!category) throw new BadRequestException("请选择有效的适用分类");
      row.scopeCategoryId = category.id;
    }
    if (row.scope === "product") {
      const product = await this.products.findOne({ where: { id: Number(dto.scopeProductId || 0), tenant: { id: tenant.id } } });
      if (!product) throw new BadRequestException("请选择有效的适用商品");
      row.scopeProductId = product.id;
    }
    row.usageLimit = Math.max(Math.trunc(Number(dto.usageLimit || 0)), 0);
    row.perUserLimit = Math.max(Math.trunc(Number(dto.perUserLimit || 0)), 0);
    row.enabled = dto.enabled !== false;
    row.startsAt = this.optionalDate(dto.startsAt);
    row.endsAt = this.optionalDate(dto.endsAt);
    if (row.startsAt && row.endsAt && row.startsAt > row.endsAt) throw new BadRequestException("结束时间不能早于开始时间");
    const saved = await this.coupons.save(row);
    await this.logOperation(admin, id ? "mall.coupon.update" : "mall.coupon.create", "mall_coupon", saved.id, `${id ? "更新" : "创建"}商城优惠券：${saved.name}`, saved.tenant.id);
    return saved;
  }

  async adminCouponUsages(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.couponUsages.createQueryBuilder("usage")
      .leftJoinAndSelect("usage.tenant", "tenant")
      .leftJoinAndSelect("usage.coupon", "coupon")
      .leftJoinAndSelect("usage.order", "order")
      .leftJoinAndSelect("usage.user", "user")
      .orderBy("usage.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "usage", tenant);
    if (query.status) builder.andWhere("usage.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(usage.code LIKE :keyword OR coupon.name LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    return builder.take(200).getMany();
  }

  async adminPromotionCodes(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.promotionCodes.createQueryBuilder("code").leftJoinAndSelect("code.tenant", "tenant").leftJoinAndSelect("code.promoterUser", "promoterUser").leftJoinAndSelect("code.agent", "agent").orderBy("code.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "code", tenant);
    if (query.enabled === "true") builder.andWhere("code.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("code.enabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) builder.andWhere("(code.code LIKE :keyword OR code.name LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(200).getMany();
  }

  async savePromotionCode(dto: MallPromotionCodeDto, id?: number, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, dto.tenantId);
    if (!tenant) throw new BadRequestException("请选择所属商家");
    const row = id ? await this.promotionCodes.findOne({ where: { id } }) : this.promotionCodes.create();
    if (!row) throw new NotFoundException("商城推广码不存在");
    this.assertAdminTenantAccess(row, admin);
    const code = this.normalizePromotionCode(dto.code);
    const exists = await this.promotionCodes.findOne({ where: { code } });
    if (exists && exists.id !== row.id) throw new BadRequestException("推广码已存在");
    const promoterUser = dto.promoterUserId ? await this.users.findOne({ where: { id: Number(dto.promoterUserId) } }) : null;
    const agent = dto.agentId ? await this.agents.findOne({ where: { id: Number(dto.agentId) } }) : null;
    if (dto.promoterUserId && !promoterUser) throw new NotFoundException("推广用户不存在");
    if (dto.agentId && !agent) throw new NotFoundException("代理不存在");
    row.tenant = tenant;
    row.code = code;
    row.name = this.requiredString(dto.name, "推广码名称");
    row.promoterUser = promoterUser;
    row.agent = agent;
    row.commissionRate = Math.min(Math.max(Number(dto.commissionRate || 0), 0), 1).toFixed(4);
    row.enabled = dto.enabled !== false;
    row.remark = this.optionalString(dto.remark);
    const saved = await this.promotionCodes.save(row);
    await this.logOperation(admin, id ? "mall.promotion_code.update" : "mall.promotion_code.create", "mall_promotion_code", saved.id, `${id ? "更新" : "创建"}商城推广码：${saved.code}`, saved.tenant.id);
    return saved;
  }

  async adminFlashSales(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.flashSales.createQueryBuilder("sale")
      .leftJoinAndSelect("sale.tenant", "tenant")
      .leftJoinAndSelect("sale.product", "product")
      .leftJoinAndSelect("sale.sku", "sku")
      .orderBy("sale.sortOrder", "ASC")
      .addOrderBy("sale.id", "DESC");
    if (tenant) this.applyTenantFilter(builder, "sale", tenant);
    if (query.status) builder.andWhere("sale.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(sale.title LIKE :keyword OR product.title LIKE :keyword OR sku.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const rows = await builder.take(200).getMany();
    return rows.map((row) => this.publicFlashSale(row));
  }

  async saveFlashSale(dto: MallFlashSaleDto, id?: number, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, dto.tenantId);
    if (!tenant) throw new BadRequestException("请选择所属商家");
    const row = id ? await this.flashSales.findOne({ where: { id } }) : this.flashSales.create();
    if (!row) throw new NotFoundException("秒杀活动不存在");
    if (id) this.assertAdminTenantAccess(row, admin);
    else this.assertAdminTenantAccess({ tenant }, admin);
    const sku = await this.skus.findOne({ where: { id: Number(dto.skuId || 0), tenant: { id: tenant.id } } });
    if (!sku || sku.product.id !== Number(dto.productId || 0)) throw new BadRequestException("请选择有效的秒杀商品规格");
    const salePrice = Math.max(Number(dto.salePrice || 0), 0);
    const saleStock = Math.max(Math.trunc(Number(dto.saleStock || 0)), 0);
    if (salePrice <= 0) throw new BadRequestException("秒杀价必须大于 0");
    if (saleStock <= 0) throw new BadRequestException("秒杀库存必须大于 0");
    if (salePrice >= Number(sku.price || 0)) throw new BadRequestException("秒杀价必须低于当前售价");
    const startsAt = this.optionalDate(dto.startsAt);
    const endsAt = this.optionalDate(dto.endsAt);
    if (!startsAt || !endsAt) throw new BadRequestException("请设置秒杀开始和结束时间");
    if (startsAt >= endsAt) throw new BadRequestException("秒杀结束时间必须晚于开始时间");
    row.tenant = tenant;
    row.product = sku.product;
    row.sku = sku;
    row.title = this.requiredString(dto.title, "秒杀活动标题");
    row.salePrice = salePrice.toFixed(2);
    row.saleStock = saleStock;
    row.perUserLimit = Math.max(Math.trunc(Number(dto.perUserLimit ?? 1)), 0);
    row.startsAt = startsAt;
    row.endsAt = endsAt;
    row.status = ["draft", "active", "disabled"].includes(String(dto.status)) ? dto.status as MallFlashSale["status"] : "draft";
    row.sortOrder = Number(dto.sortOrder || 0);
    const saved = await this.flashSales.save(row);
    await this.logOperation(admin, id ? "mall.flash_sale.update" : "mall.flash_sale.create", "mall_flash_sale", saved.id, `${id ? "更新" : "创建"}商城秒杀：${saved.title}`, saved.tenant.id);
    return this.publicFlashSale(saved);
  }

  async publicFlashSales(context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const now = new Date();
    const rows = await this.flashSales.find({ where: { tenant: { id: tenant.id }, status: "active" }, order: { sortOrder: "ASC", id: "DESC" } });
    return rows.filter((row) => row.startsAt <= now && row.endsAt >= now && this.availableFlashSaleStock(row) > 0).map((row) => this.publicFlashSale(row));
  }

  async adminGroupBuys(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.groupBuys.createQueryBuilder("groupBuy")
      .leftJoinAndSelect("groupBuy.tenant", "tenant")
      .leftJoinAndSelect("groupBuy.product", "product")
      .leftJoinAndSelect("groupBuy.sku", "sku")
      .orderBy("groupBuy.sortOrder", "ASC")
      .addOrderBy("groupBuy.id", "DESC");
    if (tenant) this.applyTenantFilter(builder, "groupBuy", tenant);
    if (query.status) builder.andWhere("groupBuy.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(groupBuy.title LIKE :keyword OR product.title LIKE :keyword OR sku.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    const rows = await builder.take(200).getMany();
    return rows.map((row) => this.publicGroupBuy(row));
  }

  async adminGroupBuyRecords(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.groupBuyRecords.createQueryBuilder("record")
      .leftJoinAndSelect("record.tenant", "tenant")
      .leftJoinAndSelect("record.groupBuy", "groupBuy")
      .leftJoinAndSelect("record.order", "order")
      .leftJoinAndSelect("record.user", "user")
      .leftJoinAndSelect("record.product", "product")
      .leftJoinAndSelect("record.sku", "sku")
      .orderBy("record.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "record", tenant);
    if (query.status) builder.andWhere("record.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(record.title LIKE :keyword OR record.teamNo LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword OR product.title LIKE :keyword OR sku.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    return builder.take(Math.min(Math.max(Number(query.pageSize || 100), 1), 200)).getMany();
  }

  async saveGroupBuy(dto: MallGroupBuyDto, id?: number, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, dto.tenantId);
    if (!tenant) throw new BadRequestException("请选择所属商家");
    const row = id ? await this.groupBuys.findOne({ where: { id } }) : this.groupBuys.create();
    if (!row) throw new NotFoundException("拼团活动不存在");
    if (id) this.assertAdminTenantAccess(row, admin);
    else this.assertAdminTenantAccess({ tenant }, admin);
    const sku = await this.skus.findOne({ where: { id: Number(dto.skuId || 0), tenant: { id: tenant.id } } });
    if (!sku || sku.product.id !== Number(dto.productId || 0)) throw new BadRequestException("请选择有效的拼团商品规格");
    const groupPrice = Math.max(Number(dto.groupPrice || 0), 0);
    const groupStock = Math.max(Math.trunc(Number(dto.groupStock || 0)), 0);
    if (groupPrice <= 0) throw new BadRequestException("拼团价必须大于 0");
    if (groupStock <= 0) throw new BadRequestException("拼团库存必须大于 0");
    if (groupPrice >= Number(sku.price || 0)) throw new BadRequestException("拼团价必须低于当前售价");
    const startsAt = this.optionalDate(dto.startsAt);
    const endsAt = this.optionalDate(dto.endsAt);
    if (!startsAt || !endsAt) throw new BadRequestException("请设置拼团开始和结束时间");
    if (startsAt >= endsAt) throw new BadRequestException("拼团结束时间必须晚于开始时间");
    row.tenant = tenant;
    row.product = sku.product;
    row.sku = sku;
    row.title = this.requiredString(dto.title, "拼团活动标题");
    row.groupPrice = groupPrice.toFixed(2);
    row.minPeople = Math.max(Math.trunc(Number(dto.minPeople || 2)), 2);
    row.groupStock = groupStock;
    row.perUserLimit = Math.max(Math.trunc(Number(dto.perUserLimit ?? 1)), 0);
    row.startsAt = startsAt;
    row.endsAt = endsAt;
    row.status = ["draft", "active", "disabled"].includes(String(dto.status)) ? dto.status as MallGroupBuy["status"] : "draft";
    row.sortOrder = Number(dto.sortOrder || 0);
    const saved = await this.groupBuys.save(row);
    await this.logOperation(admin, id ? "mall.group_buy.update" : "mall.group_buy.create", "mall_group_buy", saved.id, `${id ? "更新" : "创建"}商城拼团：${saved.title}`, saved.tenant.id);
    return this.publicGroupBuy(saved);
  }

  async publicGroupBuys(context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const now = new Date();
    const rows = await this.groupBuys.find({ where: { tenant: { id: tenant.id }, status: "active" }, order: { sortOrder: "ASC", id: "DESC" } });
    return rows.filter((row) => row.startsAt <= now && row.endsAt >= now && this.availableGroupBuyStock(row) > 0).map((row) => this.publicGroupBuy(row));
  }

  async publicGroupBuyTeams(id: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const groupBuy = await this.groupBuys.findOne({ where: { id, tenant: { id: tenant.id }, status: "active" } });
    const now = new Date();
    if (!groupBuy || groupBuy.startsAt > now || groupBuy.endsAt < now || this.availableGroupBuyStock(groupBuy) <= 0) return [];
    const rows = await this.groupBuyRecords.find({
      where: { tenant: { id: tenant.id }, groupBuy: { id: groupBuy.id }, teamStatus: "forming", status: "paid" },
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

  async publicCoupons(context?: PublicTenantContext, amount?: number) {
    const tenant = await this.requirePublicTenant(context);
    const now = new Date();
    const builder = this.coupons.createQueryBuilder("coupon").leftJoinAndSelect("coupon.tenant", "tenant").where("coupon.tenantId = :tenantId", { tenantId: tenant.id }).andWhere("coupon.enabled = :enabled", { enabled: true }).andWhere("(coupon.startsAt IS NULL OR coupon.startsAt <= :now)", { now }).andWhere("(coupon.endsAt IS NULL OR coupon.endsAt >= :now)", { now }).andWhere("(coupon.usageLimit = 0 OR coupon.usedCount < coupon.usageLimit)").orderBy("coupon.discountAmount", "DESC");
    if (amount !== undefined && Number.isFinite(amount)) builder.andWhere("coupon.minAmount <= :amount", { amount: Number(amount || 0) });
    const coupons = await builder.getMany();
    return coupons.map((coupon) => this.adminCoupon(coupon));
  }

  async myAvailableCoupons(user: User, context?: PublicTenantContext, amount?: number) {
    const coupons = await this.publicCoupons(context, amount);
    const claimMap = await this.couponClaimMap(user, coupons.map((coupon) => coupon.id));
    return coupons.map((coupon) => this.publicCouponWithClaim(coupon, claimMap.get(coupon.id)));
  }

  async myCouponClaims(user: User, context?: PublicTenantContext, status?: string) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.couponClaims.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { updatedAt: "DESC" } });
    const mapped = rows.map((claim) => this.publicCouponClaim(claim));
    if (!status) return mapped;
    return mapped.filter((item) => item.status === status);
  }

  async claimCoupon(user: User, id: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const coupon = await this.resolveCoupon(tenant, id, 0, [], undefined, user, "id");
    let claim = await this.couponClaims.findOne({ where: { tenant: { id: tenant.id }, coupon: { id: coupon.id }, user: { id: user.id } } });
    if (claim) return this.publicCouponClaim(claim);
    claim = await this.couponClaims.save(this.couponClaims.create({ tenant, coupon, user, claimedCount: 1, usedCount: 0 }));
    return this.publicCouponClaim(claim);
  }

  async validatePublicCoupon(context: PublicTenantContext | undefined, code: unknown, amount: number) {
    const tenant = await this.requirePublicTenant(context);
    const coupon = await this.resolveCoupon(tenant, code, amount);
    if (coupon.scope && coupon.scope !== "all") throw new BadRequestException("该优惠券需在确认订单页按商品范围校验");
    return { valid: true, coupon: this.adminCoupon(coupon), discountAmount: this.computeCouponDiscount(coupon, amount).toFixed(2), payableAmount: Math.max(amount - this.computeCouponDiscount(coupon, amount), 0).toFixed(2) };
  }

  async adminLogisticsCompanies(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.logisticsCompanies.createQueryBuilder("company").leftJoinAndSelect("company.tenant", "tenant").orderBy("company.sortOrder", "ASC").addOrderBy("company.id", "ASC");
    if (tenant) this.applyTenantFilter(builder, "company", tenant);
    if (query.enabled === "true") builder.andWhere("company.enabled = :enabled", { enabled: true });
    if (query.enabled === "false") builder.andWhere("company.enabled = :enabled", { enabled: false });
    if (query.keyword?.trim()) builder.andWhere("(company.name LIKE :keyword OR company.code LIKE :keyword OR company.servicePhone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(200).getMany();
  }

  async saveLogisticsCompany(dto: MallLogisticsCompanyDto, id?: number, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, dto.tenantId);
    if (!tenant) throw new BadRequestException("请选择所属商家");
    const row = id ? await this.logisticsCompanies.findOne({ where: { id } }) : this.logisticsCompanies.create();
    if (!row) throw new NotFoundException("物流公司不存在");
    this.assertAdminTenantAccess(row, admin);
    row.tenant = tenant;
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

  async publicLogisticsCompanies(context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    return this.logisticsCompanies.find({ where: { tenant: { id: tenant.id }, enabled: true }, order: { sortOrder: "ASC", id: "ASC" } });
  }

  async adminProducts(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.products
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.tenant", "tenant")
      .leftJoinAndSelect("product.category", "category")
      .orderBy("product.sortOrder", "ASC")
      .addOrderBy("product.id", "DESC");
    if (tenant) this.applyTenantFilter(builder, "product", tenant);
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
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const threshold = Math.max(Math.trunc(Number(query.lowStockThreshold ?? 10)), 0);
    const builder = this.skus
      .createQueryBuilder("sku")
      .leftJoinAndSelect("sku.tenant", "tenant")
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
        product: sku.product
      }))
    };
  }

  async saveProduct(dto: MallProductDto, id?: number, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, dto.tenantId);
    if (!tenant) throw new BadRequestException("请选择所属商家");
    const row = id ? await this.products.findOne({ where: { id } }) : this.products.create();
    if (!row) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(row, admin);
    const category = dto.categoryId ? await this.categories.findOne({ where: { id: Number(dto.categoryId), tenant: { id: tenant.id } } }) : null;
    if (dto.categoryId && !category) throw new NotFoundException("商城分类不存在");
    row.tenant = tenant;
    row.category = category;
    row.title = this.requiredString(dto.title, "商品名称");
    row.coverUrl = this.optionalString(dto.coverUrl);
    row.description = this.optionalString(dto.description);
    row.brandName = this.optionalString(dto.brandName);
    row.status = dto.status || "draft";
    row.featured = Boolean(dto.featured);
    row.sortOrder = Number(dto.sortOrder || 0);
    row.deliveryNote = this.optionalString(dto.deliveryNote);
    row.afterSaleNote = this.optionalString(dto.afterSaleNote);
    const skuInputs = Array.isArray(dto.skus) && dto.skus.length ? dto.skus : [{ name: "默认规格", price: Number(dto.price || 0), originalPrice: Number(dto.originalPrice || 0), stock: 0, enabled: true }];
    const minPrice = Math.min(...skuInputs.map((sku) => Number(sku.price || 0)).filter((price) => Number.isFinite(price)));
    row.price = (Number.isFinite(minPrice) ? minPrice : Number(dto.price || 0)).toFixed(2);
    row.originalPrice = Number(dto.originalPrice || skuInputs[0]?.originalPrice || 0).toFixed(2);
    const saved = await this.products.save(row);
    await this.replaceSkus(saved, tenant, skuInputs);
    await this.logOperation(admin, id ? "mall.product.update" : "mall.product.create", "mall_product", saved.id, `${id ? "更新" : "创建"}商品：${saved.title}`, saved.tenant.id);
    return this.productDetail(saved.id, admin);
  }

  async productDetail(id: number, admin?: AdminContext) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");
    this.assertAdminTenantAccess(product, admin);
    const skus = await this.skus.find({ where: { product: { id } }, order: { sortOrder: "ASC", id: "ASC" } });
    return this.publicProduct(product, skus);
  }

  async publicCategories(context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    return this.categories.find({ where: { tenant: { id: tenant.id }, enabled: true }, order: { sortOrder: "ASC", id: "ASC" } });
  }

  async publicProducts(query: MallListQueryDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const sort = ["featured", "newest", "hot"].includes(String(query.sort || "")) ? String(query.sort) : "featured";
    const builder = this.products.createQueryBuilder("product").leftJoinAndSelect("product.category", "category").where("product.tenantId = :tenantId", { tenantId: tenant.id }).andWhere("product.status = :status", { status: "published" });
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
    const total = await this.publicProductCount(tenant, query);
    const skuRows = items.length ? await this.skus.find({ where: { product: { id: In(items.map((item) => item.id)) }, enabled: true }, order: { sortOrder: "ASC", id: "ASC" } }) : [];
    const salesMap = await this.productSalesMap(items.map((item) => item.id));
    return { items: items.map((item) => ({ ...this.publicProduct(item, skuRows.filter((sku) => sku.product.id === item.id)), salesCount: salesMap.get(item.id) || 0 })), total, page, pageSize, sort };
  }

  async publicProductDetail(id: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const product = await this.products.findOne({ where: { id, tenant: { id: tenant.id }, status: "published" } });
    if (!product) throw new NotFoundException("商品不存在或已下架");
    const skus = await this.skus.find({ where: { product: { id }, enabled: true }, order: { sortOrder: "ASC", id: "ASC" } });
    const reviews = await this.publicProductReviews(id, context);
    return { ...this.publicProduct(product, skus), reviews };
  }

  async publicProductReviews(productId: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    return this.reviews.find({ where: { tenant: { id: tenant.id }, product: { id: productId }, status: "approved" }, order: { createdAt: "DESC" }, take: 20 });
  }

  async favoriteStatus(user: User, productId: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const row = await this.favorites.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, product: { id: Number(productId) } } });
    return { favorited: Boolean(row), favoriteId: row?.id || null };
  }

  async toggleFavorite(user: User, productId: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const product = await this.products.findOne({ where: { id: Number(productId), tenant: { id: tenant.id }, status: "published" } });
    if (!product) throw new NotFoundException("商品不存在或已下架");
    const existing = await this.favorites.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, product: { id: product.id } } });
    if (existing) {
      await this.favorites.delete({ id: existing.id });
      return { favorited: false };
    }
    const saved = await this.favorites.save(this.favorites.create({ tenant, user, product }));
    return { favorited: true, favoriteId: saved.id };
  }

  async myFavorites(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.favorites.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { createdAt: "DESC" }, take: 100 });
    return rows.map((row) => ({ ...row, product: this.publicProduct(row.product, []) }));
  }

  async recordBrowse(user: User, productId: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const product = await this.products.findOne({ where: { id: Number(productId), tenant: { id: tenant.id }, status: "published" } });
    if (!product) throw new NotFoundException("商品不存在或已下架");
    const existing = await this.browseHistories.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, product: { id: product.id } } });
    const now = new Date();
    if (existing) {
      existing.viewCount += 1;
      existing.lastViewedAt = now;
      const saved = await this.browseHistories.save(existing);
      return { success: true, viewCount: saved.viewCount };
    }
    const saved = await this.browseHistories.save(this.browseHistories.create({ tenant, user, product, viewCount: 1, lastViewedAt: now }));
    return { success: true, viewCount: saved.viewCount };
  }

  async myBrowseHistories(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const rows = await this.browseHistories.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { lastViewedAt: "DESC" }, take: 100 });
    return rows.map((row) => ({ ...row, product: this.publicProduct(row.product, []) }));
  }

  async myAddresses(user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    return this.addresses.find({ where: { tenant: { id: tenant.id }, user: { id: user.id } }, order: { isDefault: "DESC", id: "DESC" } });
  }

  async saveMyAddress(user: User, dto: MallAddressDto, id?: number, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const row = id ? await this.addresses.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } }) : this.addresses.create();
    if (!row) throw new NotFoundException("收货地址不存在");
    row.tenant = tenant;
    row.user = user;
    this.assignAddress(row, dto);
    if (row.isDefault) await this.addresses.update({ tenant: { id: tenant.id }, user: { id: user.id } }, { isDefault: false });
    return this.addresses.save(row);
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
    const sku = await this.skus.findOne({ where: { id: Number(dto.skuId), tenant: { id: tenant.id }, enabled: true } });
    if (!sku || sku.product.status !== "published") throw new NotFoundException("商品规格不存在或已下架");
    const addQuantity = Math.max(Number(dto.quantity || 1), 1);
    const available = Number(sku.stock || 0) - Number(sku.lockedStock || 0);
    const existing = await this.cartItems.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, sku: { id: sku.id } } });
    const nextQuantity = (existing?.quantity || 0) + addQuantity;
    if (available < nextQuantity) throw new BadRequestException("购物车数量超过可购买库存");
    const row = existing || this.cartItems.create({ tenant, user, product: sku.product, sku });
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
    if (available < quantity) throw new BadRequestException("购物车数量超过可购买库存");
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

  async createOrder(user: User, dto: CreateMallOrderDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const paymentMethod = dto.paymentMethod || PaymentMethod.Offline;
    if (![PaymentMethod.Balance, PaymentMethod.Offline, PaymentMethod.Wechat].includes(paymentMethod)) throw new BadRequestException("商城暂不支持该支付方式");
    await this.assertPaymentMethodEnabled(paymentMethod, tenant);
    const clientOrderKey = this.normalizeClientOrderKey(dto.clientOrderKey);
    if (clientOrderKey) {
      const existing = await this.orders.findOne({ where: { tenant: { id: tenant.id }, user: { id: user.id }, clientOrderKey } });
      if (existing) return this.orderDetailForUser(existing.id, user, context);
    }
    const expiresAt = this.mallOrderExpiresAt(paymentMethod);
    const address = await this.resolveOrderAddress(user, tenant, dto);
    const promotion = await this.resolvePromotionCode(tenant, dto.promotionCode);
    const { cartRows, items } = await this.resolveOrderInputItems(user, tenant, dto);
    if (!items.length) throw new BadRequestException("请选择要购买的商品");
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
        const sku = await skuRepo.findOne({ where: { id: Number(input.skuId), tenant: { id: tenant.id }, enabled: true }, lock: { mode: "pessimistic_write" } });
        if (!sku || sku.product.status !== "published") throw new NotFoundException("商品规格不存在或已下架");
        const available = Number(sku.stock || 0) - Number(sku.lockedStock || 0);
        if (available < quantity) throw new BadRequestException(`「${sku.product.title}」库存不足`);
        const beforeStock = sku.stock;
        const beforeLocked = sku.lockedStock;
        sku.lockedStock += quantity;
        await skuRepo.save(sku);
        await inventoryRepo.save(inventoryRepo.create({ tenant, sku, order: savedOrder, type: "lock", quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: "商城下单锁库存" }));
        const flashSale = input.flashSaleId ? await this.resolveActiveFlashSale(manager, tenant, input.flashSaleId, sku, user, quantity) : null;
        if (flashSale) {
          const beforeSaleLocked = flashSale.lockedStock;
          flashSale.lockedStock += quantity;
          await manager.getRepository(MallFlashSale).save(flashSale);
          await inventoryRepo.save(inventoryRepo.create({ tenant, sku, order: savedOrder, type: "lock", quantity, stockBefore: flashSale.saleStock - flashSale.soldStock, stockAfter: flashSale.saleStock - flashSale.soldStock, lockedBefore: beforeSaleLocked, lockedAfter: flashSale.lockedStock, remark: `商城秒杀锁库存：${flashSale.title}` }));
        }
        const groupBuy = input.groupBuyId ? await this.resolveActiveGroupBuy(manager, tenant, input.groupBuyId, sku, user, quantity) : null;
        if (groupBuy) {
          const beforeGroupLocked = groupBuy.lockedStock;
          groupBuy.lockedStock += quantity;
          await manager.getRepository(MallGroupBuy).save(groupBuy);
          await inventoryRepo.save(inventoryRepo.create({ tenant, sku, order: savedOrder, type: "lock", quantity, stockBefore: groupBuy.groupStock - groupBuy.soldStock, stockAfter: groupBuy.groupStock - groupBuy.soldStock, lockedBefore: beforeGroupLocked, lockedAfter: groupBuy.lockedStock, remark: `商城拼团锁库存：${groupBuy.title}` }));
        }
        const itemPrice = flashSale ? Number(flashSale.salePrice || 0) : groupBuy ? Number(groupBuy.groupPrice || 0) : Number(sku.price);
        const itemTotal = itemPrice * quantity;
        amount += itemTotal;
        couponItems.push({ productId: sku.product.id, categoryId: sku.product.category?.id || null, amount: itemTotal });
        const skuName = flashSale ? `${sku.name}（秒杀：${flashSale.title}）` : groupBuy ? `${sku.name}（拼团：${groupBuy.title}）` : sku.name;
        orderItems.push(itemRepo.create({ tenant, order: savedOrder, product: sku.product, sku, productTitle: sku.product.title, skuName, coverUrl: sku.product.coverUrl, price: itemPrice.toFixed(2), quantity, totalAmount: itemTotal.toFixed(2) }));
        if (groupBuy) {
          const teamNo = await this.resolveGroupBuyTeamNo(manager, tenant, groupBuy, input.joinTeamNo);
          groupBuyRecords.push(manager.getRepository(MallGroupBuyRecord).create({ tenant, groupBuy, order: savedOrder, user, product: sku.product, sku, title: groupBuy.title, groupPrice: Number(groupBuy.groupPrice || 0).toFixed(2), quantity, amount: itemTotal.toFixed(2), teamNo, teamStatus: "forming", minPeople: groupBuy.minPeople, paidPeople: 0, status: "pending" }));
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
        await manager.getRepository(MallCouponUsage).save(manager.getRepository(MallCouponUsage).create({ tenant, coupon, order: savedOrder, user, code: coupon.code, discountAmount: couponDiscountAmount.toFixed(2), status: "used" }));
        await this.markCouponClaimUsed(manager, tenant, coupon, user);
      }
      savedOrder.amount = Math.max(amount - discountAmount, 0).toFixed(2);
      savedOrder.goodsAmount = amount.toFixed(2);
      savedOrder.discountAmount = discountAmount.toFixed(2);
      savedOrder.pointsUsed = pointsQuote.pointsUsed;
      savedOrder.pointsDiscountAmount = pointsQuote.pointsDiscountAmount.toFixed(2);
      await orderRepo.save(savedOrder);
      await itemRepo.save(orderItems);
      if (groupBuyRecords.length) await manager.getRepository(MallGroupBuyRecord).save(groupBuyRecords);
      if (pointsQuote.pointsUsed > 0) await this.awardMallPoints(user, -pointsQuote.pointsUsed, "mall_points_redeem", savedOrder.id, "商城订单积分抵扣");
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
    await this.assertPaymentMethodEnabled(PaymentMethod.Wechat, tenant);
    return this.createWechatSandboxPayment(order, dto);
  }

  async wechatPaymentCallback(dto: MallProviderPaymentCallbackDto | Record<string, unknown>) {
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
      const lockedOrder = await orderRepo.findOne({ where: { id: order.id }, lock: { mode: "pessimistic_write" } });
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
      await this.awardMallPurchasePoints(lockedOrder);
      await this.createMallCommissionForOrder(manager, lockedOrder);
    });
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
    return Promise.all(orders.map((order) => this.publicOrderWithItems(order)));
  }

  async orderDetailForUser(id: number, user: User, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.orders.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!order) throw new NotFoundException("商城订单不存在");
    return this.publicOrderWithItems(order, user);
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
    return this.publicOrderWithItems(order);
  }

  async requestRefund(id: number, user: User, dto: MallRefundRequestDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const order = await this.orders.findOne({ where: { id, tenant: { id: tenant.id }, user: { id: user.id } } });
    if (!order) throw new NotFoundException("商城订单不存在");
    if (!["paid", "shipped", "completed"].includes(order.status)) throw new BadRequestException("当前订单不能申请售后");
    const exists = await this.refunds.findOne({ where: { order: { id: order.id }, status: In(["pending", "processing", "failed"]) }, order: { createdAt: "DESC" } });
    if (exists) return exists;
    const amount = Number(dto.amount || order.amount);
    if (amount <= 0 || amount > Number(order.amount) + 0.0001) throw new BadRequestException("退款金额不正确");
    const images = Array.isArray(dto.images) ? dto.images.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [];
    order.status = "refund_pending";
    await this.orders.save(order);
    return this.refunds.save(this.refunds.create({ refundNo: this.generateRefundNo(), tenant, user, order, type: dto.type || "refund_only", amount: amount.toFixed(2), status: "pending", reason: this.optionalString(dto.reason), images }));
  }

  async createReview(user: User, dto: MallReviewDto, context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const orderItem = await this.orderItems.findOne({ where: { id: Number(dto.orderItemId), tenant: { id: tenant.id } } });
    if (!orderItem || orderItem.order.user.id !== user.id) throw new NotFoundException("商城订单商品不存在");
    if (orderItem.order.status !== "completed") throw new BadRequestException("确认收货后才能评价");
    const exists = await this.reviews.findOne({ where: { orderItem: { id: orderItem.id }, user: { id: user.id } } });
    if (exists) throw new BadRequestException("该商品已评价，请勿重复提交");
    const rating = Math.min(Math.max(Math.trunc(Number(dto.rating || 5)), 1), 5);
    const content = this.requiredString(dto.content, "评价内容").slice(0, 500);
    const images = Array.isArray(dto.images) ? dto.images.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [];
    return this.reviews.save(this.reviews.create({ tenant, user, order: orderItem.order, orderItem, product: orderItem.product, sku: orderItem.sku, rating, content, images, status: "pending" }));
  }

  async adminReviews(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.reviews.createQueryBuilder("review")
      .leftJoinAndSelect("review.tenant", "tenant")
      .leftJoinAndSelect("review.user", "user")
      .leftJoinAndSelect("review.order", "order")
      .leftJoinAndSelect("review.product", "product")
      .leftJoinAndSelect("review.sku", "sku")
      .orderBy("review.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "review", tenant);
    if (query.status) builder.andWhere("review.status = :status", { status: query.status });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR review.content LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(100).getMany();
  }

  async moderateReview(id: number, dto: MallReviewModerationDto, admin?: AdminContext) {
    const review = await this.reviews.findOne({ where: { id } });
    if (!review) throw new NotFoundException("商城评价不存在");
    this.assertAdminTenantAccess(review, admin);
    const nextStatus = dto.status === "approved" ? "approved" : dto.status === "rejected" ? "rejected" : null;
    if (!nextStatus) throw new BadRequestException("评价审核状态不正确");
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
    const refundBuilder = this.refunds.createQueryBuilder("refund").leftJoin("refund.tenant", "tenant").leftJoin("refund.order", "order").leftJoin("order.user", "user");
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    if (tenant) this.applyTenantFilter(refundBuilder, "refund", tenant);
    if (query.status) refundBuilder.andWhere("order.status = :status", { status: query.status });
    if (query.paymentMethod) refundBuilder.andWhere("order.paymentMethod = :paymentMethod", { paymentMethod: query.paymentMethod });
    if (query.refundStatus && query.refundStatus !== "none") refundBuilder.andWhere("refund.status = :refundStatus", { refundStatus: query.refundStatus });
    if (query.refundStatus === "none") refundBuilder.andWhere("1 = 0");
    this.applyDateRangeFilter(refundBuilder, "order", query);
    if (query.keyword?.trim()) refundBuilder.andWhere("(order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
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
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const receivedStatuses: MallOrderStatus[] = ["paid", "shipped", "completed", "refund_pending", "refunded"];
    const orderBase = () => {
      const builder = this.orders.createQueryBuilder("order").leftJoin("order.tenant", "tenant").where("order.createdAt >= :since", { since });
      if (tenant) this.applyTenantFilter(builder, "order", tenant);
      return builder;
    };
    const refundBase = () => {
      const builder = this.refunds.createQueryBuilder("refund").leftJoin("refund.tenant", "tenant").where("refund.createdAt >= :since", { since });
      if (tenant) this.applyTenantFilter(builder, "refund", tenant);
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
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.paymentTransactions.createQueryBuilder("tx")
      .leftJoinAndSelect("tx.tenant", "tenant")
      .leftJoinAndSelect("tx.order", "order")
      .leftJoinAndSelect("order.user", "user")
      .orderBy("tx.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "tx", tenant);
    if (query.status) builder.andWhere("tx.status = :status", { status: query.status });
    if (query.paymentMethod) builder.andWhere("tx.paymentMethod = :paymentMethod", { paymentMethod: query.paymentMethod });
    this.applyDateRangeFilter(builder, "tx", query);
    if (query.keyword?.trim()) {
      builder.andWhere("(tx.transactionNo LIKE :keyword OR tx.provider LIKE :keyword OR tx.remark LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    return builder.take(100).getMany();
  }

  async exportAdminPaymentTransactions(query: MallListQueryDto, admin?: AdminContext) {
    const rows = await this.adminPaymentTransactions(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商城支付流水");
    sheet.columns = [
      { header: "订单号", key: "orderNo", width: 28 },
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
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoinAndSelect("commission.tenant", "tenant")
      .leftJoinAndSelect("commission.order", "order")
      .leftJoinAndSelect("order.user", "buyer")
      .leftJoinAndSelect("commission.promotionCode", "promotionCode")
      .leftJoinAndSelect("commission.promoterUser", "promoterUser")
      .leftJoinAndSelect("commission.agent", "agent")
      .orderBy("commission.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "commission", tenant);
    if (query.status) builder.andWhere("commission.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(commission.code LIKE :keyword OR order.orderNo LIKE :keyword OR buyer.phone LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    return builder.take(200).getMany();
  }

  async adminCommissionSummary(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoin("commission.tenant", "tenant")
      .leftJoin("commission.order", "order")
      .leftJoin("order.user", "buyer")
      .leftJoin("commission.promoterUser", "promoterUser")
      .leftJoin("commission.agent", "agent");
    if (tenant) this.applyTenantFilter(builder, "commission", tenant);
    if (query.status) builder.andWhere("commission.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(commission.code LIKE :keyword OR order.orderNo LIKE :keyword OR buyer.phone LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
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
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoin("commission.tenant", "tenant")
      .leftJoin("commission.order", "order")
      .leftJoin("order.user", "buyer")
      .leftJoin("commission.promoterUser", "promoterUser")
      .leftJoin("commission.agent", "agent");
    if (tenant) this.applyTenantFilter(builder, "commission", tenant);
    if (query.status) builder.andWhere("commission.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(commission.code LIKE :keyword OR order.orderNo LIKE :keyword OR buyer.phone LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
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
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoinAndSelect("commission.tenant", "tenant")
      .leftJoinAndSelect("commission.order", "order")
      .leftJoinAndSelect("order.user", "buyer")
      .leftJoinAndSelect("commission.promoterUser", "promoterUser")
      .leftJoinAndSelect("commission.agent", "agent")
      .orderBy("commission.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "commission", tenant);
    if (query.status) builder.andWhere("commission.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(commission.code LIKE :keyword OR order.orderNo LIKE :keyword OR buyer.phone LIKE :keyword OR promoterUser.phone LIKE :keyword OR agent.name LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    const rows = await builder.take(1000).getMany();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商城推广佣金");
    sheet.columns = [
      { header: "佣金ID", key: "id", width: 10 },
      { header: "商家", key: "tenant", width: 22 },
      { header: "订单号", key: "orderNo", width: 28 },
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
        orderNo: row.order?.orderNo || "",
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
    const tenant = await this.adminTargetTenant(admin, dto.tenantId, !admin?.tenantId);
    const builder = this.commissions.createQueryBuilder("commission")
      .leftJoinAndSelect("commission.tenant", "tenant")
      .leftJoinAndSelect("commission.order", "order")
      .leftJoinAndSelect("order.user", "buyer")
      .leftJoinAndSelect("commission.promoterUser", "promoterUser")
      .leftJoinAndSelect("commission.agent", "agent")
      .where("commission.status = :status", { status: "pending" })
      .orderBy("commission.createdAt", "ASC");
    if (tenant) this.applyTenantFilter(builder, "commission", tenant);
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
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.paymentCallbackLogs.createQueryBuilder("log")
      .leftJoinAndSelect("log.tenant", "tenant")
      .leftJoinAndSelect("log.order", "order")
      .leftJoinAndSelect("order.user", "user")
      .orderBy("log.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "log", tenant);
    if (query.status) builder.andWhere("log.resultStatus = :status", { status: query.status });
    this.applyDateRangeFilter(builder, "log", query);
    if (query.keyword?.trim()) {
      builder.andWhere("(log.orderNo LIKE :keyword OR log.transactionNo LIKE :keyword OR log.provider LIKE :keyword OR log.resultMessage LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    return builder.take(100).getMany();
  }

  async exportAdminPaymentCallbackLogs(query: MallListQueryDto, admin?: AdminContext) {
    const rows = await this.adminPaymentCallbackLogs(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商城支付回调日志");
    sheet.columns = [
      { header: "订单号", key: "orderNo", width: 28 },
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
        payload: JSON.stringify(row.payload || {}).slice(0, 1000)
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async adminRefundLogs(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.refundLogs.createQueryBuilder("log")
      .leftJoinAndSelect("log.tenant", "tenant")
      .leftJoinAndSelect("log.refund", "refund")
      .leftJoinAndSelect("log.order", "order")
      .leftJoinAndSelect("order.user", "user")
      .orderBy("log.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "log", tenant);
    if (query.status) builder.andWhere("log.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      builder.andWhere("(log.providerRefundNo LIKE :keyword OR log.provider LIKE :keyword OR log.message LIKE :keyword OR refund.refundNo LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    return builder.take(100).getMany();
  }

  async adminPaymentReadiness(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const setting = tenant ? await this.operationSettings.findOne({ where: { tenant: { id: tenant.id } } }) : null;
    return this.mallWechatPaymentReadiness(tenant, this.normalizePaymentMethods(setting?.paymentMethods));
  }

  async publicPaymentMethods(context?: PublicTenantContext) {
    const tenant = await this.requirePublicTenant(context);
    const setting = await this.operationSettings.findOne({ where: { tenant: { id: tenant.id } } });
    const methods = this.normalizePaymentMethods(setting?.paymentMethods);
    const wechat = this.mallWechatPaymentReadiness(tenant, methods);
    return [
      { value: PaymentMethod.Balance, name: "余额支付", desc: "使用账户余额立即支付", enabled: methods.balance, status: methods.balance ? "ready" : "disabled", disabledReason: methods.balance ? "" : "后台未开启余额支付" },
      { value: PaymentMethod.Offline, name: "线下收款", desc: "提交订单后由后台财务确认", enabled: methods.offline, status: methods.offline ? "ready" : "disabled", disabledReason: methods.offline ? "" : "后台未开启线下收款" },
      { value: PaymentMethod.Wechat, name: "微信支付", desc: wechat.status === "real_ready" ? "微信在线支付，支付成功后自动入账" : "微信支付沙箱验收模式", enabled: ["sandbox_ready", "real_ready"].includes(wechat.status), status: wechat.status, disabledReason: ["sandbox_ready", "real_ready"].includes(wechat.status) ? "" : wechat.issues[0] || "微信支付配置未就绪" }
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
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.inventoryLogs.createQueryBuilder("log").leftJoinAndSelect("log.tenant", "tenant").leftJoinAndSelect("log.sku", "sku").leftJoinAndSelect("sku.product", "product").leftJoinAndSelect("log.order", "order").orderBy("log.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "log", tenant);
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
      if (nextStock < Number(sku.lockedStock || 0)) throw new BadRequestException("目标库存不能小于当前已锁定库存");
      const beforeStock = Number(sku.stock || 0);
      const beforeLocked = Number(sku.lockedStock || 0);
      sku.stock = nextStock;
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: sku.tenant, sku, order: null, type: "adjust", quantity: nextStock - beforeStock, stockBefore: beforeStock, stockAfter: nextStock, lockedBefore: beforeLocked, lockedAfter: beforeLocked, remark }));
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
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.orders.createQueryBuilder("order").leftJoinAndSelect("order.tenant", "tenant").leftJoinAndSelect("order.user", "user");
    if (tenant) this.applyTenantFilter(builder, "order", tenant);
    if (query.status) builder.andWhere("order.status = :status", { status: query.status });
    if (query.paymentMethod) builder.andWhere("order.paymentMethod = :paymentMethod", { paymentMethod: query.paymentMethod });
    if (query.refundStatus === "none") {
      builder.andWhere("NOT EXISTS (SELECT 1 FROM mall_refunds refund_filter WHERE refund_filter.orderId = order.id)");
    } else if (query.refundStatus) {
      builder.andWhere("EXISTS (SELECT 1 FROM mall_refunds refund_filter WHERE refund_filter.orderId = order.id AND refund_filter.status = :refundStatus)", { refundStatus: query.refundStatus });
    }
    this.applyDateRangeFilter(builder, "order", query);
    if (query.keyword?.trim()) builder.andWhere("(order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
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
      await this.awardMallPurchasePoints(order);
      await this.createMallCommissionForOrder(manager, order);
    });
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
    const orders = await this.orders.find({
      where: [
        { status: "pending_payment", expiresAt: LessThan(now) },
        { status: "pending_confirm", expiresAt: LessThan(now) },
        { status: "pending_payment", expiresAt: IsNull(), createdAt: LessThan(paymentDeadline) },
        { status: "pending_confirm", expiresAt: IsNull(), createdAt: LessThan(confirmDeadline) }
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
    return { closedCount, checkedCount: orders.length, paymentMinutes, confirmMinutes };
  }

  async failExpiredGroupBuyTeams(now = new Date(), admin?: AdminContext) {
    const rows = await this.groupBuyRecords.createQueryBuilder("record")
      .leftJoinAndSelect("record.tenant", "tenant")
      .leftJoinAndSelect("record.groupBuy", "groupBuy")
      .where("record.teamStatus = :teamStatus", { teamStatus: "forming" })
      .andWhere("record.status = :status", { status: "paid" })
      .andWhere("groupBuy.endsAt < :now", { now })
      .orderBy("record.createdAt", "ASC")
      .take(200)
      .getMany();
    const teamNos = [...new Set(rows.map((row) => row.teamNo).filter(Boolean))];
    let failedTeamCount = 0;
    let refundedOrderCount = 0;
    let skippedOrderCount = 0;
    let manualRefundOrderCount = 0;
    for (const teamNo of teamNos) {
      try {
        const result = await this.failGroupBuyTeam(teamNo, admin);
        if (result.failed) failedTeamCount += 1;
        refundedOrderCount += result.refundedOrderCount;
        skippedOrderCount += result.skippedOrderCount;
        manualRefundOrderCount += result.manualRefundOrderCount || 0;
      } catch {
        skippedOrderCount += 1;
      }
    }
    return { checkedTeamCount: teamNos.length, failedTeamCount, refundedOrderCount, manualRefundOrderCount, skippedOrderCount };
  }

  async completeExpiredShippedOrders(now = new Date(), admin?: AdminContext) {
    const shippedDays = this.configNumber("MALL_SHIPPED_AUTO_COMPLETE_DAYS", 7);
    if (shippedDays <= 0) return { completedCount: 0, checkedCount: 0, shippedDays };
    const shippedDeadline = new Date(now.getTime() - shippedDays * 24 * 60 * MINUTE_MS);
    const orders = await this.orders.find({ where: { status: "shipped", shippedAt: LessThan(shippedDeadline) }, order: { shippedAt: "ASC" }, take: 50 });
    let completedCount = 0;
    for (const order of orders) {
      try {
        order.status = "completed";
        order.completedAt = now;
        await this.orders.save(order);
        completedCount += 1;
        await this.logOperation(admin, "mall.order.auto_complete", "mall_order", order.id, `自动完成商城订单：${order.orderNo}，已发货超过 ${shippedDays} 天`, order.tenant.id);
      } catch {
        // 单个订单可能已被用户确认或进入售后，跳过即可，下一轮继续扫描。
      }
    }
    return { completedCount, checkedCount: orders.length, shippedDays };
  }

  async adminRefunds(query: MallListQueryDto, admin?: AdminContext) {
    const tenant = await this.adminTargetTenant(admin, query.tenantId, !admin?.tenantId);
    const builder = this.refunds.createQueryBuilder("refund").leftJoinAndSelect("refund.tenant", "tenant").leftJoinAndSelect("refund.user", "user").leftJoinAndSelect("refund.order", "order").orderBy("refund.createdAt", "DESC");
    if (tenant) this.applyTenantFilter(builder, "refund", tenant);
    if (query.status) builder.andWhere("refund.status = :status", { status: query.status });
    if (query.paymentMethod) builder.andWhere("order.paymentMethod = :paymentMethod", { paymentMethod: query.paymentMethod });
    this.applyDateRangeFilter(builder, "refund", query);
    if (query.keyword?.trim()) builder.andWhere("(refund.refundNo LIKE :keyword OR order.orderNo LIKE :keyword OR user.phone LIKE :keyword OR refund.reason LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.take(100).getMany();
  }

  async approveRefund(id: number, dto: MallRefundReviewDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    if (refund.status !== "pending") throw new BadRequestException("当前售后单已处理");
    await this.dataSource.transaction(async (manager) => {
      refund.reviewRemark = this.optionalString(dto.remark);
      refund.reviewedBy = admin?.username || "system";
      refund.reviewedAt = new Date();
      await this.applyMallRefundPlan(manager, refund, admin?.username || "system", false);
    });
    await this.logOperation(admin, "mall.refund.approve", "mall_refund", refund.id, `通过商城售后：${refund.refundNo}`, refund.tenant.id);
    return this.refunds.findOne({ where: { id } });
  }

  async retryRefund(id: number, dto: MallRefundReviewDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    if (!["processing", "failed"].includes(refund.status)) throw new BadRequestException("只有处理中或失败的售后单可以重试退款");
    await this.dataSource.transaction(async (manager) => {
      const remark = this.optionalString(dto.remark);
      refund.reviewRemark = remark || refund.reviewRemark;
      refund.reviewedBy = admin?.username || refund.reviewedBy || "system";
      refund.reviewedAt = new Date();
      await this.applyMallRefundPlan(manager, refund, admin?.username || "system", true);
    });
    await this.logOperation(admin, "mall.refund.retry", "mall_refund", refund.id, `重试商城退款：${refund.refundNo}`, refund.tenant.id);
    return this.refunds.findOne({ where: { id } });
  }

  async rejectRefund(id: number, dto: MallRefundReviewDto, admin?: AdminContext) {
    const refund = await this.refunds.findOne({ where: { id } });
    if (!refund) throw new NotFoundException("售后单不存在");
    this.assertAdminTenantAccess(refund, admin);
    if (refund.status !== "pending") throw new BadRequestException("当前售后单已处理");
    refund.status = "rejected";
    refund.reviewRemark = this.optionalString(dto.remark);
    refund.reviewedBy = admin?.username || "system";
    refund.reviewedAt = new Date();
    const order = refund.order;
    order.status = order.shippedAt ? "shipped" : "paid";
    await this.orders.save(order);
    await this.refunds.save(refund);
    await this.logOperation(admin, "mall.refund.reject", "mall_refund", refund.id, `拒绝商城售后：${refund.refundNo}`, refund.tenant.id);
    return refund;
  }

  private async replaceSkus(product: MallProduct, tenant: Tenant, inputs: MallProductDto["skus"]) {
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
        await this.inventoryLogs.save(this.inventoryLogs.create({ tenant, sku: saved, order: null, type: "adjust", quantity: saved.stock - oldStock, stockBefore: oldStock, stockAfter: saved.stock, lockedBefore: oldLocked, lockedAfter: saved.lockedStock, remark: id ? "商品编辑调整库存" : "商品创建初始化库存" }));
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
    const items = await manager.getRepository(MallOrderItem).find({ where: { order: { id: order.id } } });
    for (const item of items) {
      const sku = await skuRepo.findOne({ where: { id: item.sku.id }, lock: { mode: "pessimistic_write" } });
      if (!sku) continue;
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      sku.stock = Math.max(sku.stock - item.quantity, 0);
      sku.lockedStock = Math.max(sku.lockedStock - item.quantity, 0);
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, sku, order, type: "deduct", quantity: item.quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: "商城支付确认扣库存" }));
      await this.deductFlashSaleStock(manager, order, item);
      await this.deductGroupBuyStock(manager, order, item);
    }
  }

  private async applySuccessfulMallPayment(order: MallOrder, transactionNo: string, provider: string, remark: string, paymentMethod: PaymentMethod) {
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(MallOrder);
      const paymentTxRepo = manager.getRepository(MallPaymentTransaction);
      const lockedOrder = await orderRepo.findOne({ where: { id: order.id }, lock: { mode: "pessimistic_write" } });
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
      await this.awardMallPurchasePoints(savedOrder);
      await this.createMallCommissionForOrder(manager, savedOrder);
      const paymentTransaction = await paymentTxRepo.save(paymentTxRepo.create({
        order: savedOrder,
        tenant: savedOrder.tenant,
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
  }

  private createWechatSandboxPayment(order: MallOrder, dto: MallProviderPayDto) {
    this.assertMallSandboxAllowed("商城微信支付");
    const transactionNo = String(dto.transactionNo || "").trim() || `MALWX${Date.now()}${order.id}`;
    const timestamp = String(Date.now());
    const amount = Number(order.amount || 0).toFixed(2);
    const sign = this.signWechatSandboxPayload(order.orderNo, transactionNo, amount, timestamp);
    return {
      provider: "wechat",
      mode: "sandbox",
      orderNo: order.orderNo,
      amount,
      transactionNo,
      timestamp,
      sign,
      callbackPath: "/payment/mall/wechat/callback",
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
    log.resultStatus = resultStatus;
    log.resultMessage = resultMessage;
    log.processedAt = new Date();
    return this.paymentCallbackLogs.save(log);
  }

  private mallRefundProviderPlan(order: MallOrder, refund: MallRefund) {
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
      throw new BadRequestException("商城微信真实退款尚未配置完成，不能假装原路退款成功；请先启用沙箱或补齐真实微信退款配置");
    }
    throw new BadRequestException("当前支付方式暂不支持商城售后退款");
  }

  private async applyMallRefundPlan(manager: Pick<DataSource["manager"], "getRepository">, refund: MallRefund, operator: string, retry: boolean) {
    const refundRepo = manager.getRepository(MallRefund);
    const orderRepo = manager.getRepository(MallOrder);
    const lockedOrder = await orderRepo.findOne({ where: { id: refund.order.id }, lock: { mode: "pessimistic_write" } });
    if (!lockedOrder) throw new NotFoundException("商城订单不存在");
    const refundPlan = this.mallRefundProviderPlan(lockedOrder, refund);
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
        await this.handleMallRefundPoints(lockedOrder, refund);
      }
    } else {
      lockedOrder.status = "refund_pending";
      await orderRepo.save(lockedOrder);
    }
    await this.createMallRefundLog(manager, refund, lockedOrder, refundPlan, retry ? `${operator}（重试）` : operator);
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

  private async createMallRefundLog(manager: Pick<DataSource["manager"], "getRepository">, refund: MallRefund, order: MallOrder, plan: ReturnType<MallService["mallRefundProviderPlan"]>, operator: string) {
    return manager.getRepository(MallRefundLog).save(manager.getRepository(MallRefundLog).create({
      refund,
      order,
      tenant: refund.tenant,
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
    const items = await manager.getRepository(MallOrderItem).find({ where: { order: { id: order.id } } });
    for (const item of items) {
      const sku = await skuRepo.findOne({ where: { id: item.sku.id }, lock: { mode: "pessimistic_write" } });
      if (!sku) continue;
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      sku.stock += item.quantity;
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, sku, order, type: "return", quantity: item.quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: "商城退款退回库存" }));
      await this.returnFlashSaleStock(manager, order, item);
      await this.returnGroupBuyStock(manager, order, item);
    }
  }

  private async resolveOrderInputItems(user: User, tenant: Tenant, dto: { cartItemIds?: number[]; items?: MallOrderInputItem[] }) {
    const cartRows = Array.isArray(dto.cartItemIds) && dto.cartItemIds.length ? await this.cartItems.find({ where: { id: In(dto.cartItemIds.map(Number).filter(Boolean)), tenant: { id: tenant.id }, user: { id: user.id } } }) : [];
    if (dto.cartItemIds?.length && cartRows.length !== dto.cartItemIds.length) throw new BadRequestException("购物车商品不存在或已失效");
    const items: MallOrderInputItem[] = cartRows.length ? cartRows.map((row) => ({ skuId: row.sku.id, quantity: row.quantity })) : Array.isArray(dto.items) ? dto.items : [];
    return { cartRows, items };
  }

  private async previewGoodsAmount(tenant: Tenant, items: MallOrderInputItem[], user?: User) {
    if (!items.length) throw new BadRequestException("请选择要购买的商品");
    const previewItems: MallOrderPreviewItem[] = [];
    let goodsAmount = 0;
    for (const input of items) {
      const quantity = Math.max(Number(input.quantity || 0), 0);
      if (!quantity) throw new BadRequestException("购买数量必须大于 0");
      if (input.flashSaleId && input.groupBuyId) throw new BadRequestException("秒杀和拼团不能同时使用");
      const sku = await this.skus.findOne({ where: { id: Number(input.skuId), tenant: { id: tenant.id }, enabled: true } });
      if (!sku || sku.product.status !== "published") throw new NotFoundException("商品规格不存在或已下架");
      const available = Number(sku.stock || 0) - Number(sku.lockedStock || 0);
      if (available < quantity) throw new BadRequestException(`「${sku.product.title}」库存不足`);
      const flashSale = input.flashSaleId ? await this.resolveActiveFlashSale(undefined, tenant, input.flashSaleId, sku, user, quantity) : null;
      const groupBuy = input.groupBuyId ? await this.resolveActiveGroupBuy(undefined, tenant, input.groupBuyId, sku, user, quantity) : null;
      const amount = (flashSale ? Number(flashSale.salePrice || 0) : groupBuy ? Number(groupBuy.groupPrice || 0) : Number(sku.price || 0)) * quantity;
      goodsAmount += amount;
      previewItems.push({ productId: sku.product.id, categoryId: sku.product.category?.id || null, amount });
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

  private async resolvePromotionCode(tenant: Tenant, value?: unknown) {
    const code = this.normalizePromotionCode(value);
    if (!code) return null;
    const row = await this.promotionCodes.findOne({ where: { code } });
    if (!row || row.tenant.id !== tenant.id || !row.enabled) throw new BadRequestException("推广码不存在或已停用");
    return row;
  }

  private promotionSnapshot(row: MallPromotionCode) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      commissionRate: row.commissionRate,
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
    const exists = await commissionRepo.findOne({ where: { order: { id: order.id } } });
    if (exists) return exists;
    const codeRepo = manager.getRepository(MallPromotionCode);
    const promotion = await codeRepo.findOne({ where: { code }, lock: { mode: "pessimistic_write" } });
    if (!promotion || !promotion.enabled || promotion.tenant.id !== order.tenant.id) return null;
    const amount = Number(order.amount || 0);
    const rate = Math.min(Math.max(Number(promotion.commissionRate || 0), 0), 1);
    const commissionAmount = amount * rate;
    promotion.orderCount += 1;
    promotion.orderAmount = (Number(promotion.orderAmount || 0) + amount).toFixed(2);
    await codeRepo.save(promotion);
    return commissionRepo.save(commissionRepo.create({
      tenant: order.tenant,
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

  private async awardMallPurchasePoints(order: MallOrder) {
    const points = Math.floor(Number(order.amount || 0));
    if (points <= 0) return null;
    return this.awardMallPoints(order.user, points, "mall_order_paid", order.id, "商城消费积分");
  }

  private async handleMallRefundPoints(order: MallOrder, refund: MallRefund) {
    const refundAmount = Number(refund.amount || 0);
    await this.awardMallPoints(order.user, -Math.floor(refundAmount), "mall_order_refund", order.id, "商城退款扣减消费积分");
    if (refundAmount + 0.0001 >= Number(order.amount || 0)) await this.refundMallRedeemedPoints(order, "商城退款返还抵扣积分");
  }

  private async refundMallRedeemedPoints(order: MallOrder, remark: string) {
    if (!order.pointsUsed || order.pointsUsed <= 0 || order.pointsRefundedAt) return null;
    await this.awardMallPoints(order.user, order.pointsUsed, "mall_points_return", order.id, remark);
    order.pointsRefundedAt = new Date();
    await this.orders.save(order);
    return order;
  }

  private async awardMallPoints(user: User, points: number, sourceType: string, sourceId: string | number, remark: string) {
    if (!points) return null;
    const key = String(sourceId);
    const exists = await this.memberPointLogs.findOne({ where: { sourceType, sourceId: key } });
    if (exists) return exists;
    const log = await this.memberPointLogs.save(this.memberPointLogs.create({ user, points, type: points >= 0 ? "earn" : "deduct", sourceType, sourceId: key, remark }));
    await this.refreshMallMemberProfile(user);
    return log;
  }

  private async refreshMallMemberProfile(user: User) {
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id } } });
    if (!profile) profile = this.memberProfiles.create({ user, level: null });
    const pointSum = await this.memberPointLogs.createQueryBuilder("p").select("COALESCE(SUM(p.points), 0)", "sum").where("p.userId = :userId", { userId: user.id }).getRawOne<{ sum: string }>();
    profile.points = Number(pointSum?.sum || 0);
    profile.level = await this.resolveMallMemberLevel(profile.points);
    profile.lastActiveAt = new Date();
    return this.memberProfiles.save(profile);
  }

  private async resolveMallMemberLevel(points: number) {
    const levels = await this.memberLevels.find({ where: { enabled: true }, order: { minPoints: "DESC" } });
    return levels.find((level) => points >= level.minPoints) || null;
  }

  private async closeOrderAndReleaseLockedInventory(orderId: number, reason: string) {
    await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(MallOrder);
      const lockedOrder = await orderRepo.findOne({ where: { id: orderId }, lock: { mode: "pessimistic_write" } });
      if (!lockedOrder || lockedOrder.status === "closed") return;
      if (!["pending_payment", "pending_confirm"].includes(lockedOrder.status)) throw new BadRequestException("当前商城订单不能关闭");
      lockedOrder.status = "closed";
      lockedOrder.closedAt = new Date();
      lockedOrder.closeReason = reason;
      lockedOrder.expiresAt = null;
      await orderRepo.save(lockedOrder);
      await this.updateGroupBuyRecordsForOrder(manager, lockedOrder, "closed");
      await this.releaseCouponUsage(manager, lockedOrder);
      await this.releaseLockedInventory(manager, lockedOrder, reason);
      await this.refundMallRedeemedPoints(lockedOrder, "商城订单关闭返还积分");
    });
  }

  private async failGroupBuyTeam(teamNo: string, admin?: AdminContext) {
    return this.dataSource.transaction(async (manager) => {
      const recordRepo = manager.getRepository(MallGroupBuyRecord);
      const orderRepo = manager.getRepository(MallOrder);
      const refundRepo = manager.getRepository(MallRefund);
      const walletRepo = manager.getRepository(UserWallet);
      const walletTxRepo = manager.getRepository(WalletTransaction);
      const records = await recordRepo.find({ where: { teamNo }, lock: { mode: "pessimistic_write" } });
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
        const order = await orderRepo.findOne({ where: { id: record.order.id }, lock: { mode: "pessimistic_write" } });
        if (!order || !["paid", "refund_pending"].includes(order.status)) {
          skippedOrderCount += 1;
          continue;
        }
        if (order.paymentMethod !== PaymentMethod.Balance) {
          const exists = await refundRepo.findOne({ where: { order: { id: order.id }, status: "pending" } });
          if (!exists) {
            await refundRepo.save(refundRepo.create({ refundNo: this.generateRefundNo(), tenant: order.tenant, user: order.user, order, type: "refund_only", amount: Number(order.amount || 0).toFixed(2), status: "pending", reason: `拼团未成团，待财务人工退款：${record.teamNo}`, images: [] }));
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
        await this.handleMallRefundPoints(order, manager.getRepository(MallRefund).create({ amount: amount.toFixed(2) } as MallRefund));
        await this.voidMallCommission(manager, order, `拼团未成团自动退款：${record.teamNo}`);
        record.status = "refunded";
        record.refundedAt = now;
        refundedOrderCount += 1;
      }
      await recordRepo.save(records);
      await this.logOperation(admin, "mall.group_buy.fail_expired", "mall_group_buy_team", teamNo, `拼团到期未成团：${teamNo}，自动退款 ${refundedOrderCount} 单，待人工退款 ${manualRefundOrderCount} 单，跳过 ${skippedOrderCount} 单`, records[0]?.tenant?.id);
      return { failed: true, refundedOrderCount, manualRefundOrderCount, skippedOrderCount };
    });
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
    const coupon = await couponRepo.findOne({ where: { id: couponId }, lock: { mode: "pessimistic_write" } });
    const usageRepo = manager.getRepository(MallCouponUsage);
    const usage = await usageRepo.findOne({ where: { order: { id: order.id }, status: "used" }, lock: { mode: "pessimistic_write" } });
    if (usage) {
      usage.status = "released";
      usage.releasedAt = new Date();
      usage.releaseReason = order.closeReason || "订单关闭释放优惠券";
      await usageRepo.save(usage);
      await this.releaseCouponClaimUsage(manager, order.tenant, usage.coupon, order.user);
    }
    if (!coupon || coupon.usedCount <= 0) return;
    coupon.usedCount -= 1;
    await couponRepo.save(coupon);
  }

  private async releaseLockedInventory(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, reason: string) {
    const skuRepo = manager.getRepository(MallSku);
    const inventoryRepo = manager.getRepository(MallInventoryLog);
    const items = await manager.getRepository(MallOrderItem).find({ where: { order: { id: order.id } } });
    for (const item of items) {
      const sku = await skuRepo.findOne({ where: { id: item.sku.id }, lock: { mode: "pessimistic_write" } });
      if (!sku) continue;
      const beforeStock = sku.stock;
      const beforeLocked = sku.lockedStock;
      sku.lockedStock = Math.max(sku.lockedStock - item.quantity, 0);
      await skuRepo.save(sku);
      await inventoryRepo.save(inventoryRepo.create({ tenant: order.tenant, sku, order, type: "release", quantity: item.quantity, stockBefore: beforeStock, stockAfter: sku.stock, lockedBefore: beforeLocked, lockedAfter: sku.lockedStock, remark: reason }));
      await this.releaseFlashSaleStock(manager, order, item, reason);
      await this.releaseGroupBuyStock(manager, order, item, reason);
    }
  }

  private async updateGroupBuyRecordsForOrder(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, status: MallGroupBuyRecord["status"]) {
    const repo = manager.getRepository(MallGroupBuyRecord);
    const records = await repo.find({ where: { order: { id: order.id } } });
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
    const record = await manager.getRepository(MallGroupBuyRecord).findOne({ where: { tenant: { id: tenant.id }, groupBuy: { id: groupBuy.id }, teamNo } });
    if (!record) throw new BadRequestException("拼团队伍不存在或已失效");
    if (record.teamStatus === "failed") throw new BadRequestException("该拼团队伍已失败，请重新开团");
    if (record.teamStatus === "success") throw new BadRequestException("该拼团队伍已成团，请重新开团");
    return teamNo;
  }

  private async refreshGroupBuyTeamStatus(manager: Pick<DataSource["manager"], "getRepository">, teamNo: string) {
    const repo = manager.getRepository(MallGroupBuyRecord);
    const records = await repo.find({ where: { teamNo } });
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
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException("商城订单不存在");
    this.assertAdminTenantAccess(order, admin);
    return order;
  }

  private async publicOrderWithItems(order: MallOrder, user?: User) {
    const items = await this.orderItems.find({ where: { order: { id: order.id } } });
    const refund = await this.refunds.findOne({ where: { order: { id: order.id } }, order: { createdAt: "DESC" } });
    const groupBuyRecords = await this.groupBuyRecords.find({ where: { order: { id: order.id } } });
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
    if (!user || !items.length) return { ...order, items, refund, groupBuyTeams };
    const reviews = await this.reviews.find({ where: { orderItem: { id: In(items.map((item) => item.id)) }, user: { id: user.id } } });
    return { ...order, items: items.map((item) => ({ ...item, review: reviews.find((review) => review.orderItem.id === item.id) || null })), refund, groupBuyTeams };
  }

  private async mallOrderLogistics(order: MallOrder) {
    const company = order.expressCompany
      ? await this.logisticsCompanies.findOne({
          where: [
            { tenant: { id: order.tenant.id }, name: order.expressCompany, enabled: true },
            { tenant: { id: order.tenant.id }, code: order.expressCompany, enabled: true }
          ]
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
    return { ...product, skus, stock };
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
      ...coupon,
      perUserLimit,
      runtimeStatus,
      remainingCount: usageLimit > 0 ? Math.max(usageLimit - usedCount, 0) : null
    };
  }

  private publicFlashSale(row: MallFlashSale) {
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
      ...row,
      availableStock,
      runtimeStatus,
      originalPrice: row.sku?.price || row.product?.price || "0.00",
      discountAmount: Math.max(Number(row.sku?.price || row.product?.price || 0) - Number(row.salePrice || 0), 0).toFixed(2)
    };
  }

  private availableFlashSaleStock(row: MallFlashSale) {
    return Math.max(Number(row.saleStock || 0) - Number(row.lockedStock || 0) - Number(row.soldStock || 0), 0);
  }

  private publicGroupBuy(row: MallGroupBuy) {
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
      ...row,
      availableStock,
      runtimeStatus,
      originalPrice: row.sku?.price || row.product?.price || "0.00",
      discountAmount: Math.max(Number(row.sku?.price || row.product?.price || 0) - Number(row.groupPrice || 0), 0).toFixed(2)
    };
  }

  private availableGroupBuyStock(row: MallGroupBuy) {
    return Math.max(Number(row.groupStock || 0) - Number(row.lockedStock || 0) - Number(row.soldStock || 0), 0);
  }

  private async resolveActiveFlashSale(manager: Pick<DataSource["manager"], "getRepository"> | undefined, tenant: Tenant, flashSaleId: unknown, sku: MallSku, user?: User, quantity = 1) {
    const repo = manager ? manager.getRepository(MallFlashSale) : this.flashSales;
    const options: any = { where: { id: Number(flashSaleId || 0), tenant: { id: tenant.id } } };
    if (manager) options.lock = { mode: "pessimistic_write" };
    const sale = await repo.findOne(options);
    if (!sale || sale.sku.id !== sku.id || sale.product.id !== sku.product.id) throw new BadRequestException("秒杀活动不存在或商品不匹配");
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
        .andWhere("item.skuName LIKE :mark", { mark: `%秒杀：${sale.title}%` })
        .andWhere("order.status IN (:...statuses)", { statuses: ["pending_payment", "pending_confirm", "paid", "shipped", "completed", "refund_pending"] })
        .select("COALESCE(SUM(item.quantity), 0)", "quantity")
        .getRawOne<{ quantity: string }>();
      if (Number(purchased?.quantity || 0) + quantity > sale.perUserLimit) throw new BadRequestException("已达到该秒杀活动每人限购数量");
    }
    return sale;
  }

  private async flashSaleForOrderItem(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem) {
    const match = String(item.skuName || "").match(/（秒杀：(.+?)）$/);
    if (!match?.[1]) return null;
    return manager.getRepository(MallFlashSale).findOne({ where: { tenant: { id: order.tenant.id }, sku: { id: item.sku.id }, title: match[1] }, lock: { mode: "pessimistic_write" } });
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
    const options: any = { where: { id: Number(groupBuyId || 0), tenant: { id: tenant.id } } };
    if (manager) options.lock = { mode: "pessimistic_write" };
    const groupBuy = await repo.findOne(options);
    if (!groupBuy || groupBuy.sku.id !== sku.id || groupBuy.product.id !== sku.product.id) throw new BadRequestException("拼团活动不存在或商品不匹配");
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
        .andWhere("item.skuName LIKE :mark", { mark: `%拼团：${groupBuy.title}%` })
        .andWhere("order.status IN (:...statuses)", { statuses: ["pending_payment", "pending_confirm", "paid", "shipped", "completed", "refund_pending"] })
        .select("COALESCE(SUM(item.quantity), 0)", "quantity")
        .getRawOne<{ quantity: string }>();
      if (Number(purchased?.quantity || 0) + quantity > groupBuy.perUserLimit) throw new BadRequestException("已达到该拼团活动每人限购数量");
    }
    return groupBuy;
  }

  private async groupBuyForOrderItem(manager: Pick<DataSource["manager"], "getRepository">, order: MallOrder, item: MallOrderItem) {
    const match = String(item.skuName || "").match(/（拼团：(.+?)）$/);
    if (!match?.[1]) return null;
    return manager.getRepository(MallGroupBuy).findOne({ where: { tenant: { id: order.tenant.id }, sku: { id: item.sku.id }, title: match[1] }, lock: { mode: "pessimistic_write" } });
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
    const claims = await this.couponClaims.find({ where: { user: { id: user.id }, coupon: { id: In(couponIds) } } });
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
      tenant: claim.tenant,
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

  private async markCouponClaimUsed(manager: Pick<DataSource["manager"], "getRepository">, tenant: Tenant, coupon: MallCoupon, user: User) {
    const repo = manager.getRepository(MallCouponClaim);
    let claim = await repo.findOne({ where: { tenant: { id: tenant.id }, coupon: { id: coupon.id }, user: { id: user.id } }, lock: { mode: "pessimistic_write" } });
    if (!claim) claim = repo.create({ tenant, coupon, user, claimedCount: 1, usedCount: 0 });
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

  private async publicProductCount(tenant: Tenant, query: MallListQueryDto) {
    const builder = this.products.createQueryBuilder("product").leftJoin("product.category", "category").where("product.tenantId = :tenantId", { tenantId: tenant.id }).andWhere("product.status = :status", { status: "published" });
    if (query.categoryId) builder.andWhere("category.id = :categoryId", { categoryId: query.categoryId });
    if (query.keyword?.trim()) builder.andWhere("(product.title LIKE :keyword OR product.brandName LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return builder.getCount();
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
    return {
      ...row,
      availableStock,
      lineAmount: (Number(row.sku.price || 0) * Number(row.quantity || 0)).toFixed(2)
    };
  }

  private mallOrderStatusText(value: string) {
    return ({ pending_payment: "待付款", pending_confirm: "待线下确认", paid: "待发货", shipped: "待收货", completed: "已完成", refund_pending: "售后中", refunded: "已退款", closed: "已关闭" } as Record<string, string>)[value] || value;
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

  private mallPaymentReadinessNextAction(status: string, issues: string[]) {
    if (status === "real_ready") return "可进入小额真实微信支付联调：下单、支付回调、重复回调、退款查询和账单留痕全部需要留档。";
    if (status === "sandbox_ready") return issues.length ? `先补齐真实支付配置；当前可继续用沙箱验收。缺口：${issues.slice(0, 4).join("；")}` : "当前可用沙箱验收，真实支付上线前仍需补齐商户号、证书、回调和预发小额支付留档。";
    if (status === "disabled") return "如要在前台展示微信支付，请先到运营设置开启微信支付，再完成沙箱或真实支付配置。";
    return issues.length ? `暂不能开放微信支付，请先处理：${issues.slice(0, 5).join("；")}` : "暂不能开放微信支付，请检查沙箱或真实支付配置。";
  }

  private mallWechatPaymentReadiness(tenant: Tenant | null, paymentMethods?: ReturnType<MallService["normalizePaymentMethods"]>) {
    const methods = paymentMethods || this.normalizePaymentMethods(null);
    const sandboxEnabled = this.config.get("PAYMENT_SANDBOX_ENABLED", "false") === "true";
    const sandboxSecretReady = Boolean(this.config.get("WECHAT_PAY_SANDBOX_SECRET") || this.config.get("PAYMENT_SANDBOX_SECRET"));
    const realPaymentEnabled = this.config.get("REAL_PAYMENT_ENABLED", "false") === "true";
    const wechatEnabled = this.config.get("WECHAT_PAY_ENABLED", "false") === "true";
    const realImplementationReady = ["REAL_PAYMENT_SDK_IMPLEMENTED", "REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED", "REAL_REFUND_QUERY_IMPLEMENTED", "REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED"].every((key) => this.config.get(key, "false") === "true");
    const requiredKeys = ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_PLATFORM_CERT_PATH", "WECHAT_PAY_NOTIFY_URL"];
    const missingKeys = requiredKeys.filter((key) => !String(this.config.get(key, "") || "").trim());
    const unreadableFiles = ["WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_PLATFORM_CERT_PATH"].filter((key) => {
      const value = String(this.config.get(key, "") || "").trim();
      return value && !existsSync(value);
    });
    const notifyUrl = String(this.config.get("WECHAT_PAY_NOTIFY_URL", "") || "").trim();
    const notifyIssues = [
      notifyUrl && !/^https:\/\//i.test(notifyUrl) ? "WECHAT_PAY_NOTIFY_URL 必须是 https 地址" : "",
      notifyUrl && !notifyUrl.includes("/payment/mall/wechat/callback") ? "商城微信回调建议指向 /payment/mall/wechat/callback，避免落到活动订单回调" : ""
    ].filter(Boolean);
    const issues = [
      !methods.wechat ? "当前商家运营设置未开启微信支付" : "",
      realPaymentEnabled && !wechatEnabled ? "REAL_PAYMENT_ENABLED 已开启，但 WECHAT_PAY_ENABLED 未开启" : "",
      ...missingKeys.map((key) => `缺少 ${key}`),
      ...unreadableFiles.map((key) => `${key} 文件不可读取`),
      ...notifyIssues,
      realPaymentEnabled && !realImplementationReady ? "真实支付 SDK、回调验签、退款查询或账单拉取未全部标记完成" : ""
    ].filter(Boolean);
    const status = !methods.wechat
      ? "disabled"
      : realPaymentEnabled && wechatEnabled && !missingKeys.length && !unreadableFiles.length && !notifyIssues.length && realImplementationReady
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
      real: { realPaymentEnabled, wechatEnabled, implementationReady: realImplementationReady, requiredKeys, missingKeys, unreadableFiles, notifyUrl, notifyIssues },
      issues,
      nextAction: this.mallPaymentReadinessNextAction(status, issues)
    };
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

  private async resolveCoupon(tenant: Tenant, code: unknown, goodsAmount: number, items: MallOrderPreviewItem[] = [], manager?: Pick<DataSource["manager"], "getRepository">, user?: User, lookup: "code" | "id" = "code") {
    const repo = manager ? manager.getRepository(MallCoupon) : this.coupons;
    const options: any = { where: lookup === "id" ? { tenant: { id: tenant.id }, id: Number(code || 0) } : { tenant: { id: tenant.id }, code: this.normalizeCouponCode(code) } };
    if (manager) options.lock = { mode: "pessimistic_write" };
    const coupon = await repo.findOne(options);
    if (!coupon) throw new BadRequestException("优惠券不存在");
    if (!coupon.enabled) throw new BadRequestException("优惠券已停用");
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
    if (!coupon.scope || coupon.scope === "all") return Math.max(Number(goodsAmount || 0), 0);
    if (coupon.scope === "category") return items.filter((item) => item.categoryId === coupon.scopeCategoryId).reduce((sum, item) => sum + item.amount, 0);
    if (coupon.scope === "product") return items.filter((item) => item.productId === coupon.scopeProductId).reduce((sum, item) => sum + item.amount, 0);
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

  private async requirePublicTenant(context?: PublicTenantContext | null) {
    const code = normalizeTenantCode(context?.tenantCode);
    const tenant = code ? await this.tenants.findOne({ where: { code, enabled: true } }) : context?.tenantId ? await this.tenants.findOne({ where: { id: context.tenantId, enabled: true } }) : null;
    if (!tenant) throw new NotFoundException("请先选择书院/商家后再进入商城");
    this.assertMallEnabled(tenant);
    return tenant;
  }

  private assertMallEnabled(tenant: Tenant) {
    const settings = tenant.settings && typeof tenant.settings === "object" && !Array.isArray(tenant.settings) ? tenant.settings : {};
    if (settings.mallEnabled === false) throw new ForbiddenException("当前商家未开通商城，请先在商家/代理列表授权商城");
  }

  private async assertPaymentMethodEnabled(method: PaymentMethod, tenant: Tenant) {
    const setting = await this.operationSettings.findOne({ where: { tenant: { id: tenant.id } } });
    const methods = this.normalizePaymentMethods(setting?.paymentMethods);
    if (method === PaymentMethod.Balance && methods.balance) return;
    if (method === PaymentMethod.Offline && methods.offline) return;
    if (method === PaymentMethod.Wechat) {
      const readiness = this.mallWechatPaymentReadiness(tenant, methods);
      if (["sandbox_ready", "real_ready"].includes(readiness.status)) return;
      throw new BadRequestException(readiness.issues[0] || "微信支付配置未就绪，请联系书院");
    }
    const label = method === PaymentMethod.Balance ? "余额支付" : "线下收款";
    throw new BadRequestException(`${label}暂未开放，请联系书院`);
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

  private applyTenantFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, tenant: Tenant | null) {
    if (tenant) builder.andWhere(`${alias}.tenantId = :tenantId`, { tenantId: tenant.id });
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

  private normalizePromotionCode(value: unknown) {
    const text = String(value || "").trim().toUpperCase();
    if (!text) return "";
    if (!/^[A-Z0-9_-]{3,40}$/.test(text)) throw new BadRequestException("推广码仅支持 3-40 位字母、数字、下划线或横线");
    return text;
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
