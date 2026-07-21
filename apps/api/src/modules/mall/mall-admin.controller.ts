import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { extname } from "path";
import { AdminRole, AdminRoles } from "../admin/admin-roles";
import { CurrentAdmin } from "../admin/current-admin.decorator";
import { sanitizeAuditValue } from "../admin/audit-sanitizer";
import { MallBrandDto, MallCategoryDto, MallCommissionBatchSettleDto, MallCommissionRiskReviewDto, MallCommissionRuleDto, MallCommissionSettleDto, MallCouponDto, MallFlashSaleDto, MallGroupBuyDto, MallInventoryAdjustDto, MallInventoryAnomalyResolveDto, MallListQueryDto, MallLogisticsCompanyDto, MallMerchantAccessDto, MallMerchantApplicationReviewDto, MallMerchantContractDto, MallMerchantDto, MallMerchantPaymentAccountDto, MallMerchantQualificationDto, MallMerchantQualificationReviewDto, MallOrderCloseDto, MallProductDto, MallProductReviewDto, MallPromotionCodeDto, MallRefundExchangeShipmentDto, MallRefundMessageDto, MallRefundReviewDto, MallReviewModerationDto, MallReviewReportReviewDto, MallSettlementAdjustmentDto, MallSettlementGenerateDto, MallSettlementPaidDto, MallSettlementReviewDto, MallShipDto, MallShipmentUpdateDto, MallStatementFetchDto, MallStatementImportDto, MallStatementResolveDto } from "./mall.dto";
import { MallService } from "./mall.service";

const MALL_OPERATION_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator];
const MALL_FINANCE_ROLES = [AdminRole.SuperAdmin, AdminRole.Finance];
const MALL_PAYMENT_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance];
const PAYMENT_CREDENTIAL_EXTENSIONS = new Set([".pem", ".key", ".crt", ".cer", ".p12", ".pfx"]);

function paymentCredentialExtension(file: Express.Multer.File) {
  return extname(file.originalname || "").toLowerCase();
}

function sanitizeMallStatementResponse(value: unknown): unknown {
  const sanitized = sanitizeAuditValue(value);
  const removed = new Set(["passwordHash", "openid", "unionid", "wechatAppId", "settings", "businessSnapshot", "addressSnapshot", "rawPayload"]);
  const strip = (current: any): any => {
    if (Array.isArray(current)) return current.map(strip);
    if (!current || typeof current !== "object") return current;
    for (const key of Object.keys(current)) {
      if (removed.has(key)) delete current[key];
      else current[key] = strip(current[key]);
    }
    if (current.user && typeof current.user === "object") current.user = { id: current.user.id, nickname: current.user.nickname, phone: current.user.phone };
    if (current.tenant && typeof current.tenant === "object") current.tenant = { id: current.tenant.id, code: current.tenant.code, name: current.tenant.name };
    if (current.merchant && typeof current.merchant === "object") current.merchant = { id: current.merchant.id, code: current.merchant.code, name: current.merchant.name };
    return current;
  };
  return strip(sanitized);
}

@Controller("admin/mall")
export class MallAdminController {
  constructor(private readonly service: MallService) {}

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("merchants")
  merchants(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminMerchants(query, admin);
  }

  @AdminRoles(...MALL_PAYMENT_ROLES)
  @Get("accessible-merchants")
  accessibleMerchants(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminMerchants(query, admin);
  }

  @AdminRoles(...MALL_PAYMENT_ROLES)
  @Get("payment-merchants")
  paymentMerchants(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminMerchants(query, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("merchants")
  createMerchant(@Body() dto: MallMerchantDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveMerchant(dto, undefined, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Patch("merchants/:id")
  updateMerchant(@Param("id", ParseIntPipe) id: number, @Body() dto: MallMerchantDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveMerchant(dto, id, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Get("merchant-applications")
  merchantApplications(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.adminMerchantApplications(query, admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("merchant-applications/:id/review")
  reviewMerchantApplication(@Param("id", ParseIntPipe) id: number, @Body() dto: MallMerchantApplicationReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.reviewMerchantApplication(id, dto, admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Get("merchant-qualifications")
  merchantQualifications(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.adminMerchantQualifications(query, admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("merchant-qualifications")
  createMerchantQualification(@Body() dto: MallMerchantQualificationDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.saveMerchantQualification(dto, undefined, admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Patch("merchant-qualifications/:id")
  updateMerchantQualification(@Param("id", ParseIntPipe) id: number, @Body() dto: MallMerchantQualificationDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.saveMerchantQualification(dto, id, admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("merchant-qualifications/:id/review")
  reviewMerchantQualification(@Param("id", ParseIntPipe) id: number, @Body() dto: MallMerchantQualificationReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.reviewMerchantQualification(id, dto, admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Get("merchant-contracts")
  merchantContracts(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.adminMerchantContracts(query, admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("merchant-contracts")
  createMerchantContract(@Body() dto: MallMerchantContractDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.saveMerchantContract(dto, undefined, admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Patch("merchant-contracts/:id")
  updateMerchantContract(@Param("id", ParseIntPipe) id: number, @Body() dto: MallMerchantContractDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.saveMerchantContract(dto, id, admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("merchant-contracts/:id/activate")
  activateMerchantContract(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.activateMerchantContract(id, admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("merchant-governance/run")
  runMerchantGovernance(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.runMerchantGovernanceLifecycle(admin); }

  @AdminRoles(AdminRole.SuperAdmin)
  @Get("merchant-access")
  merchantAccess(@Query() query: MallListQueryDto & { adminId?: number }, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminMerchantAccess(query, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("merchant-access")
  createMerchantAccess(@Body() dto: MallMerchantAccessDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveMerchantAccess(dto, undefined, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Patch("merchant-access/:id")
  updateMerchantAccess(@Param("id", ParseIntPipe) id: number, @Body() dto: MallMerchantAccessDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveMerchantAccess(dto, id, admin);
  }

  @AdminRoles(...MALL_PAYMENT_ROLES)
  @Get("merchant-payment-accounts")
  merchantPaymentAccounts(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminMerchantPaymentAccounts(query, admin);
  }

  @AdminRoles(...MALL_PAYMENT_ROLES)
  @Post("merchant-payment-accounts")
  createMerchantPaymentAccount(@Body() dto: MallMerchantPaymentAccountDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveMerchantPaymentAccount(dto, undefined, admin);
  }

  @AdminRoles(...MALL_PAYMENT_ROLES)
  @Patch("merchant-payment-accounts/:id")
  updateMerchantPaymentAccount(@Param("id", ParseIntPipe) id: number, @Body() dto: MallMerchantPaymentAccountDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveMerchantPaymentAccount(dto, id, admin);
  }

  @AdminRoles(...MALL_PAYMENT_ROLES)
  @Post("merchant-payment-credentials")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, PAYMENT_CREDENTIAL_EXTENSIONS.has(paymentCredentialExtension(file)));
    }
  }))
  async uploadMerchantPaymentCredential(@UploadedFile() file: Express.Multer.File) {
    return this.service.uploadedMerchantPaymentCredential(file);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("product-audits")
  productAudits(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminProductAudits(query, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("products/:id/approve")
  approveProduct(@Param("id", ParseIntPipe) id: number, @Body() dto: MallProductReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.approveProduct(id, dto, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("products/:id/reject")
  rejectProduct(@Param("id", ParseIntPipe) id: number, @Body() dto: MallProductReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.rejectProduct(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("settlements")
  settlements(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminSettlements(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("settlements/export")
  async exportSettlements(@Query() query: MallListQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAdminSettlements(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mall-settlements.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("settlements/:id")
  settlementDetail(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminSettlementDetail(id, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("settlements/generate")
  generateSettlement(@Body() dto: MallSettlementGenerateDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.generateSettlement(dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("settlements/:id/adjustments")
  addSettlementAdjustment(@Param("id", ParseIntPipe) id: number, @Body() dto: MallSettlementAdjustmentDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.addSettlementAdjustment(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("settlements/:id/approve")
  approveSettlement(@Param("id", ParseIntPipe) id: number, @Body() dto: MallSettlementReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.approveSettlement(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("settlements/:id/reject")
  rejectSettlement(@Param("id", ParseIntPipe) id: number, @Body() dto: MallSettlementReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.rejectSettlement(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("settlements/:id/mark-paid")
  markSettlementPaid(@Param("id", ParseIntPipe) id: number, @Body() dto: MallSettlementPaidDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.markSettlementPaid(id, dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("categories")
  categories(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminCategories(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("brands")
  brands(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminBrands(query, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("brands")
  createBrand(@Body() dto: MallBrandDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveBrand(dto, undefined, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Patch("brands/:id")
  updateBrand(@Param("id", ParseIntPipe) id: number, @Body() dto: MallBrandDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveBrand(dto, id, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("categories")
  createCategory(@Body() dto: MallCategoryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCategory(dto, undefined, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Patch("categories/:id")
  updateCategory(@Param("id", ParseIntPipe) id: number, @Body() dto: MallCategoryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCategory(dto, id, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("coupons")
  coupons(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminCoupons(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("coupon-usages")
  couponUsages(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminCouponUsages(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("coupons")
  createCoupon(@Body() dto: MallCouponDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCoupon(dto, undefined, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Patch("coupons/:id")
  updateCoupon(@Param("id", ParseIntPipe) id: number, @Body() dto: MallCouponDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCoupon(dto, id, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("promotion-codes")
  promotionCodes(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminPromotionCodes(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("promotion-risk-events")
  promotionRiskEvents(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminPromotionRiskEvents(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("promotion-risk-alerts")
  promotionRiskAlerts(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminPromotionRiskAlerts(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Patch("promotion-risk-alerts/:id")
  reviewPromotionRiskAlert(@Param("id", ParseIntPipe) id: number, @Body() dto: { status?: string; remark?: string }, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.reviewPromotionRiskAlert(id, dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("flash-sales")
  flashSales(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminFlashSales(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("flash-sales")
  createFlashSale(@Body() dto: MallFlashSaleDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveFlashSale(dto, undefined, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Patch("flash-sales/:id")
  updateFlashSale(@Param("id", ParseIntPipe) id: number, @Body() dto: MallFlashSaleDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveFlashSale(dto, id, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("group-buys")
  groupBuys(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminGroupBuys(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("group-buy-records")
  groupBuyRecords(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminGroupBuyRecords(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("group-buys")
  createGroupBuy(@Body() dto: MallGroupBuyDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveGroupBuy(dto, undefined, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Patch("group-buys/:id")
  updateGroupBuy(@Param("id", ParseIntPipe) id: number, @Body() dto: MallGroupBuyDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveGroupBuy(dto, id, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("promotion-codes")
  createPromotionCode(@Body() dto: MallPromotionCodeDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.savePromotionCode(dto, undefined, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Patch("promotion-codes/:id")
  updatePromotionCode(@Param("id", ParseIntPipe) id: number, @Body() dto: MallPromotionCodeDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.savePromotionCode(dto, id, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("logistics-companies")
  logisticsCompanies(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminLogisticsCompanies(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("logistics-companies")
  createLogisticsCompany(@Body() dto: MallLogisticsCompanyDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveLogisticsCompany(dto, undefined, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Patch("logistics-companies/:id")
  updateLogisticsCompany(@Param("id", ParseIntPipe) id: number, @Body() dto: MallLogisticsCompanyDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveLogisticsCompany(dto, id, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("products")
  products(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminProducts(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("products/export-sales")
  async exportProductSales(@Query() query: MallListQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAdminProductSales(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mall-product-sales.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("products/low-stock")
  lowStockProducts(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminLowStockProducts(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("products/:id")
  product(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.productDetail(id, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("products/:id/audit-history")
  productAuditHistory(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.productAuditHistory(id, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("products")
  createProduct(@Body() dto: MallProductDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveProduct(dto, undefined, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Patch("products/:id")
  updateProduct(@Param("id", ParseIntPipe) id: number, @Body() dto: MallProductDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveProduct(dto, id, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("orders")
  orders(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminOrders(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("orders/summary")
  ordersSummary(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminOrderSummary(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("orders/export")
  async exportOrders(@Query() query: MallListQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAdminOrders(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mall-orders.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("analytics")
  analytics(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminAnalytics(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("orders/:id/logistics")
  orderLogistics(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminOrderLogistics(id, admin);
  }

  @Get("orders/:id")
  orderDetail(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminOrderDetail(id, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("payment-transactions")
  paymentTransactions(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminPaymentTransactions(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("commissions")
  commissions(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminCommissions(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("commission-rules")
  commissionRules(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminCommissionRules(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("commission-rules")
  saveCommissionRule(@Body() dto: MallCommissionRuleDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCommissionRule(dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("commission-rules/:id/retire")
  retireCommissionRule(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.retireCommissionRule(id, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("commission-adjustments")
  commissionAdjustments(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminCommissionAdjustments(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("commissions/summary")
  commissionSummary(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminCommissionSummary(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("commissions/by-promoter")
  commissionPromoterSummary(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminCommissionPromoterSummary(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("commissions/by-promoter/export")
  async exportCommissionPromoterSummary(@Query() query: MallListQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAdminCommissionPromoterSummary(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mall-commission-promoters.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("commissions/export")
  async exportCommissions(@Query() query: MallListQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAdminCommissions(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mall-commissions.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("commissions/batch-settle")
  batchSettleCommissions(@Body() dto: MallCommissionBatchSettleDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.batchSettleCommissions(dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("commissions/:id/settle")
  settleCommission(@Param("id", ParseIntPipe) id: number, @Body() dto: MallCommissionSettleDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.settleCommission(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("commissions/:id/risk-review")
  reviewCommissionRisk(@Param("id", ParseIntPipe) id: number, @Body() dto: MallCommissionRiskReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.reviewCommissionRisk(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("commissions/:id/clawback-settle")
  settleCommissionClawback(@Param("id", ParseIntPipe) id: number, @Body() dto: MallCommissionSettleDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.settleCommissionClawback(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("payment-callback-logs")
  paymentCallbackLogs(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminPaymentCallbackLogs(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("payment-callback-logs/export")
  async exportPaymentCallbackLogs(@Query() query: MallListQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAdminPaymentCallbackLogs(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mall-payment-callback-logs.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("payment-transactions/export")
  async exportPaymentTransactions(@Query() query: MallListQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAdminPaymentTransactions(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mall-payment-transactions.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("refund-logs")
  refundLogs(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminRefundLogs(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("payment-readiness")
  paymentReadiness(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminPaymentReadiness(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("orders/:id/confirm-offline-payment")
  confirmOffline(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminConfirmOffline(id, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("orders/:id/ship")
  ship(@Param("id", ParseIntPipe) id: number, @Body() dto: MallShipDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminShip(id, dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Patch("orders/:orderId/shipments/:shipmentId")
  updateShipment(@Param("orderId", ParseIntPipe) orderId: number, @Param("shipmentId", ParseIntPipe) shipmentId: number, @Body() dto: MallShipmentUpdateDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminUpdateShipment(orderId, shipmentId, dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("orders/:orderId/shipments/:shipmentId/sync-tracking")
  syncShipmentTracking(@Param("orderId", ParseIntPipe) orderId: number, @Param("shipmentId", ParseIntPipe) shipmentId: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminSyncShipmentTracking(orderId, shipmentId, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("orders/:id/close")
  closeOrder(@Param("id", ParseIntPipe) id: number, @Body() dto: MallOrderCloseDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminCloseOrder(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("orders/close-expired")
  closeExpiredOrders(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.closeExpiredPendingOrders(new Date(), admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("orders/complete-expired-shipped")
  completeExpiredShippedOrders(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.completeExpiredShippedOrders(new Date(), admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("group-buys/fail-expired")
  failExpiredGroupBuyTeams(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.failExpiredGroupBuyTeams(new Date(), admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("refunds")
  refunds(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminRefunds(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("refunds/export")
  async exportRefunds(@Query() query: MallListQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAdminRefunds(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mall-refunds.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("reviews")
  reviews(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminReviews(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("inventory-logs")
  inventoryLogs(@Query() query: MallListQueryDto & { skuId?: number }, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminInventoryLogs(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("skus/:id/adjust-stock")
  adjustStock(@Param("id", ParseIntPipe) id: number, @Body() dto: MallInventoryAdjustDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adjustSkuStock(id, dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("review-reports")
  reviewReports(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminReviewReports(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("review-reports/:id/review")
  reviewReviewReport(@Param("id", ParseIntPipe) id: number, @Body() dto: MallReviewReportReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.reviewReviewReport(id, dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("inventory-anomalies")
  inventoryAnomalies(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminInventoryAnomalies(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("inventory-anomalies/scan")
  scanInventoryAnomalies(@Body() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.scanInventoryGovernance(query, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("inventory-anomalies/:id/resolve")
  resolveInventoryAnomaly(@Param("id", ParseIntPipe) id: number, @Body() dto: MallInventoryAnomalyResolveDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.resolveInventoryAnomaly(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("refunds/:id/approve")
  approveRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.approveRefund(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("refunds/:id/retry")
  retryRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.retryRefund(id, dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("refunds/:id/messages")
  addRefundMessage(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundMessageDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.addAdminRefundMessage(id, dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("refunds/:id/receive-return")
  receiveRefundReturn(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.receiveRefundReturn(id, dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Post("refunds/:id/ship-exchange")
  shipRefundExchange(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundExchangeShipmentDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.shipRefundExchange(id, dto, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("payment-statements")
  async paymentStatements(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeMallStatementResponse(await this.service.listPaymentStatements(query, admin));
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("payment-statements/export")
  async exportPaymentStatements(@Query() query: MallListQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportPaymentStatements(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mall-payment-statements.xlsx");
    res.end(buffer);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("payment-statements/import")
  async importPaymentStatements(@Body() dto: MallStatementImportDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeMallStatementResponse(await this.service.importPaymentStatements(dto, admin));
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("payment-statements/fetch")
  async fetchPaymentStatements(@Body() dto: MallStatementFetchDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeMallStatementResponse(await this.service.fetchPaymentStatements(dto, admin));
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("payment-statements/:id/claim")
  async claimPaymentStatement(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeMallStatementResponse(await this.service.claimPaymentStatement(id, admin));
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("payment-statements/:id/resolve")
  async resolvePaymentStatement(@Param("id", ParseIntPipe) id: number, @Body() dto: MallStatementResolveDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeMallStatementResponse(await this.service.resolvePaymentStatement(id, dto, admin));
  }

  @Post("refunds/provider-scan")
  scanProviderRefunds(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.scanProviderRefunds(admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Post("refunds/:id/reject")
  rejectRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.rejectRefund(id, dto, admin);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Patch("reviews/:id")
  moderateReview(@Param("id", ParseIntPipe) id: number, @Body() dto: MallReviewModerationDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.moderateReview(id, dto, admin);
  }
}
