import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { mkdirSync } from "fs";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { AdminRole, AdminRoles } from "../admin/admin-roles";
import { CurrentAdmin } from "../admin/current-admin.decorator";
import { MallCategoryDto, MallCommissionBatchSettleDto, MallCommissionSettleDto, MallCouponDto, MallFlashSaleDto, MallGroupBuyDto, MallInventoryAdjustDto, MallListQueryDto, MallLogisticsCompanyDto, MallMerchantAccessDto, MallMerchantDto, MallMerchantPaymentAccountDto, MallOrderCloseDto, MallProductDto, MallPromotionCodeDto, MallRefundReviewDto, MallReviewModerationDto, MallSettlementGenerateDto, MallSettlementPaidDto, MallSettlementReviewDto, MallShipDto } from "./mall.dto";
import { MallService } from "./mall.service";

const MALL_OPERATION_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator];
const MALL_FINANCE_ROLES = [AdminRole.SuperAdmin, AdminRole.Finance];
const MALL_PAYMENT_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance];
const PAYMENT_CREDENTIAL_EXTENSIONS = new Set([".pem", ".key", ".crt", ".cer", ".p12", ".pfx"]);

function paymentCredentialExtension(file: Express.Multer.File) {
  return extname(file.originalname || "").toLowerCase();
}

function paymentCredentialDirectory() {
  const dir = join(process.cwd(), process.env.UPLOAD_DIR || "uploads", "payment-credentials");
  mkdirSync(dir, { recursive: true });
  return dir;
}
const PAYMENT_CREDENTIAL_DIRECTORY = paymentCredentialDirectory();

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
    storage: diskStorage({
      destination: PAYMENT_CREDENTIAL_DIRECTORY,
      filename: (_req, file, callback) => {
        const suffix = PAYMENT_CREDENTIAL_EXTENSIONS.has(paymentCredentialExtension(file)) ? paymentCredentialExtension(file) : ".pem";
        callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${suffix}`);
      }
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, PAYMENT_CREDENTIAL_EXTENSIONS.has(paymentCredentialExtension(file)));
    }
  }))
  uploadMerchantPaymentCredential(@UploadedFile() file: Express.Multer.File) {
    return this.service.uploadedMerchantPaymentCredential(file);
  }

  @AdminRoles(...MALL_OPERATION_ROLES)
  @Get("product-audits")
  productAudits(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminProductAudits(query, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("products/:id/approve")
  approveProduct(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.approveProduct(id, admin);
  }

  @AdminRoles(AdminRole.SuperAdmin)
  @Post("products/:id/reject")
  rejectProduct(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.rejectProduct(id, admin);
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
  @Post("settlements/generate")
  generateSettlement(@Body() dto: MallSettlementGenerateDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.generateSettlement(dto, admin);
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
  @Get("analytics")
  analytics(@Query() query: MallListQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminAnalytics(query, admin);
  }

  @AdminRoles(...MALL_FINANCE_ROLES)
  @Get("orders/:id/logistics")
  orderLogistics(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminOrderLogistics(id, admin);
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
  @Get("orders/export")
  async exportOrders(@Query() query: MallListQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAdminOrders(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mall-orders.xlsx");
    res.end(Buffer.from(buffer));
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
