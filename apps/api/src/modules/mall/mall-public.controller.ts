import { BadRequestException, Body, CallHandler, Controller, Delete, ExecutionContext, Get, Injectable, NestInterceptor, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PublicService, PublicTenantContext } from "../public/public.service";
import { CreateMallOrderDto, MallAddressDto, MallCartItemDto, MallCartQuantityDto, MallListQueryDto, MallMerchantApplicationDto, MallOrderQuoteDto, MallProviderPayDto, MallRefundMessageDto, MallRefundRequestDto, MallRefundReturnShipmentDto, MallReviewAppendDto, MallReviewDto, MallReviewReportDto } from "./mall.dto";
import { MallService } from "./mall.service";
import { ObjectStorageService } from "../../shared/object-storage.service";
import { validatedUploadFile } from "../../shared/upload-security";
import { ConfigService } from "@nestjs/config";
import { assertUploadMalwareSafe, uploadMalwareScanConfig } from "../../shared/upload-malware-scan";

const MERCHANT_APPLICATION_FILE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

@Injectable()
export class MallFeatureGateInterceptor implements NestInterceptor {
  constructor(private readonly publicService: PublicService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const headerCode = req.headers?.["x-tenant-code"];
    const host = req.headers?.["x-forwarded-host"] || req.headers?.host || null;
    await this.publicService.assertFeatureGateEnabled({
      tenantCode: req.query?.tenantCode || (typeof headerCode === "string" ? headerCode : Array.isArray(headerCode) ? headerCode[0] : null),
      host: typeof host === "string" ? host : null
    }, "mall", "商城暂未开放");
    return next.handle();
  }
}

@Controller("public")
@UseInterceptors(MallFeatureGateInterceptor)
export class MallPublicController {
  constructor(private readonly service: MallService, private readonly publicService: PublicService, private readonly objectStorage: ObjectStorageService, private readonly config: ConfigService) {}

  @Get("mall/categories")
  categories(@Query() query: MallListQueryDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.publicCategories(query, this.tenantContext(req, tenantCode));
  }

  @Get("mall/merchants")
  merchants(@Query() query: MallListQueryDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.publicMerchants(query, this.tenantContext(req, tenantCode));
  }

  @Get("mall/merchants/:id")
  merchant(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.publicMerchantDetail(id, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/merchant-applications")
  async submitMerchantApplication(@Body() dto: MallMerchantApplicationDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.submitMerchantApplication(user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/merchant-application-files")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadMerchantApplicationFile(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    if (!file) throw new BadRequestException("请选择资质文件");
    const validated = validatedUploadFile(file, MERCHANT_APPLICATION_FILE_MIMES);
    if (!validated) throw new BadRequestException("资质文件内容与格式不匹配，仅支持 JPG、PNG、WebP 或 PDF 文件");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    const tenant = await this.publicService.assertFeatureGateEnabled(this.tenantContext(req, tenantCode), "mall", "商城暂未开放");
    const stored = await this.objectStorage.store(validated, `merchant-applications-t${tenant?.id || "platform"}-u${user.id}`);
    return { url: stored.url, originalName: validated.originalname, size: validated.size, mimetype: validated.mimetype };
  }

  @Get("me/mall/merchant-applications")
  async myMerchantApplications(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myMerchantApplications(user, this.tenantContext(req, tenantCode));
  }

  @Get("mall/products")
  products(@Query() query: MallListQueryDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.publicProducts(query, this.tenantContext(req, tenantCode));
  }

  @Get("mall/products/:id")
  product(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.publicProductDetail(id, this.tenantContext(req, tenantCode));
  }

  @Get("mall/products/:id/reviews")
  productReviews(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.publicProductReviews(id, this.tenantContext(req, tenantCode));
  }

  @Get("mall/flash-sales")
  flashSales(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("merchantId") merchantId?: string) {
    return this.service.publicFlashSales(this.tenantContext(req, tenantCode), merchantId ? Number(merchantId) : undefined);
  }

  @Get("mall/group-buys")
  groupBuys(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("merchantId") merchantId?: string) {
    return this.service.publicGroupBuys(this.tenantContext(req, tenantCode), merchantId ? Number(merchantId) : undefined);
  }

  @Get("mall/group-buys/:id/teams")
  groupBuyTeams(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("merchantId") merchantId?: string) {
    return this.service.publicGroupBuyTeams(id, this.tenantContext(req, tenantCode), merchantId ? Number(merchantId) : undefined);
  }

  @Get("mall/coupons")
  coupons(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("amount") amount?: string, @Query("merchantId") merchantId?: string) {
    return this.service.publicCoupons(this.tenantContext(req, tenantCode), amount ? Number(amount) : undefined, merchantId ? Number(merchantId) : undefined);
  }

  @Get("me/mall/coupons")
  async myCoupons(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("amount") amount?: string, @Query("merchantId") merchantId?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myAvailableCoupons(user, this.tenantContext(req, tenantCode), amount ? Number(amount) : undefined, merchantId ? Number(merchantId) : undefined);
  }

  @Get("me/mall/coupon-claims")
  async myCouponClaims(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("status") status?: string, @Query("merchantId") merchantId?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myCouponClaims(user, this.tenantContext(req, tenantCode), status, merchantId ? Number(merchantId) : undefined);
  }

  @Post("me/mall/coupons/:id/claim")
  async claimCoupon(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("merchantId") merchantId?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.claimCoupon(user, id, this.tenantContext(req, tenantCode), merchantId ? Number(merchantId) : undefined, this.riskContext(req));
  }

  @Get("mall/coupons/validate")
  validateCoupon(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("code") code?: string, @Query("amount") amount?: string, @Query("merchantId") merchantId?: string) {
    return this.service.validatePublicCoupon(this.tenantContext(req, tenantCode), code, Number(amount || 0), merchantId ? Number(merchantId) : undefined);
  }

  @Get("mall/logistics-companies")
  logisticsCompanies(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("merchantId") merchantId?: string) {
    return this.service.publicLogisticsCompanies(this.tenantContext(req, tenantCode), merchantId ? Number(merchantId) : undefined);
  }

  @Get("mall/payment-methods")
  paymentMethods(@Query() query: MallListQueryDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.publicPaymentMethods(query, this.tenantContext(req, tenantCode));
  }

  @Get("me/mall/favorites")
  async favorites(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myFavorites(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/mall/browse-histories")
  async browseHistories(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myBrowseHistories(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/mall/products/:id/favorite")
  async favoriteStatus(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.favoriteStatus(user, id, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/products/:id/favorite")
  async toggleFavorite(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.toggleFavorite(user, id, this.tenantContext(req, tenantCode));
  }

  @Delete("me/mall/products/:id/favorite")
  async removeFavorite(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.removeFavorite(user, id, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/products/:id/browse")
  async recordBrowse(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.recordBrowse(user, id, this.tenantContext(req, tenantCode));
  }

  @Delete("me/mall/browse-histories/:id")
  async removeBrowseHistory(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.removeBrowseHistory(user, id, this.tenantContext(req, tenantCode));
  }

  @Delete("me/mall/browse-histories")
  async clearBrowseHistories(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.clearBrowseHistories(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/mall/addresses")
  async addresses(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myAddresses(user, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/addresses")
  async createAddress(@Body() dto: MallAddressDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.saveMyAddress(user, dto, undefined, this.tenantContext(req, tenantCode));
  }

  @Put("me/mall/addresses/:id")
  async updateAddressByPut(@Param("id", ParseIntPipe) id: number, @Body() dto: MallAddressDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.saveMyAddress(user, dto, id, this.tenantContext(req, tenantCode));
  }

  @Patch("me/mall/addresses/:id")
  async updateAddress(@Param("id", ParseIntPipe) id: number, @Body() dto: MallAddressDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.saveMyAddress(user, dto, id, this.tenantContext(req, tenantCode));
  }

  @Delete("me/mall/addresses/:id")
  async deleteAddress(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.deleteMyAddress(user, id, this.tenantContext(req, tenantCode));
  }

  @Get("me/mall/cart")
  async cart(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myCart(user, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/cart")
  async addCart(@Body() dto: MallCartItemDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.addCartItem(user, dto, this.tenantContext(req, tenantCode));
  }

  @Put("me/mall/cart/:id")
  async updateCartByPut(@Param("id", ParseIntPipe) id: number, @Body() dto: MallCartQuantityDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.updateCartItem(user, id, dto, this.tenantContext(req, tenantCode));
  }

  @Patch("me/mall/cart/:id")
  async updateCart(@Param("id", ParseIntPipe) id: number, @Body() dto: MallCartQuantityDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.updateCartItem(user, id, dto, this.tenantContext(req, tenantCode));
  }

  @Delete("me/mall/cart/:id")
  async deleteCart(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.deleteCartItem(user, id, this.tenantContext(req, tenantCode));
  }

  @Post("mall/orders")
  async createOrder(@Body() dto: CreateMallOrderDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createOrder(user, dto, this.tenantContext(req, tenantCode), null, this.riskContext(req, dto.deviceId));
  }

  @Post("mall/checkout-groups")
  async createCheckoutGroup(@Body() dto: CreateMallOrderDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createCheckoutGroup(user, dto, this.tenantContext(req, tenantCode), this.riskContext(req, dto.deviceId));
  }

  @Post("mall/checkout-groups/:id/pay/balance")
  async payCheckoutGroupWithBalance(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.payCheckoutGroupWithBalance(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("mall/checkout-groups/:id/pay/wechat")
  async payCheckoutGroupWechat(@Param("id", ParseIntPipe) id: number, @Body() dto: MallProviderPayDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createCheckoutGroupWechatPayment(id, user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("mall/quote")
  async quoteOrder(@Body() dto: MallOrderQuoteDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.quoteOrder(user, dto, this.tenantContext(req, tenantCode));
  }

  @Get("me/mall/orders")
  async myOrders(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("status") status?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myOrders(user, this.tenantContext(req, tenantCode), status);
  }

  @Get("me/mall/orders/:id")
  async myOrder(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.orderDetailForUser(id, user, this.tenantContext(req, tenantCode));
  }

  @Get("me/mall/orders/:id/logistics")
  async myOrderLogistics(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.mallOrderLogisticsForUser(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("mall/orders/:id/pay/balance")
  async payBalance(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.payOrderWithBalance(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("mall/orders/:id/pay/wechat")
  async payWechat(@Param("id", ParseIntPipe) id: number, @Body() dto: MallProviderPayDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createWechatPayment(id, user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/orders/:id/cancel")
  async cancelOrder(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.cancelMyOrder(id, user, this.tenantContext(req, tenantCode));
  }

  @Get("me/mall/orders/:id/payment-status")
  async queryOrderPayment(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.queryMyOrderPayment(id, user, this.tenantContext(req, tenantCode));
  }

  @Get("me/mall/checkout-groups/:id/payment-status")
  async queryCheckoutGroupPayment(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.queryMyCheckoutGroupPayment(id, user, this.tenantContext(req, tenantCode));
  }

  @Get("me/mall/checkout-groups/:id")
  async myCheckoutGroup(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myCheckoutGroup(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/orders/:id/payment-close")
  async closeOrderPayment(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.closeMyOrderPayment(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/checkout-groups/:id/payment-close")
  async closeCheckoutGroupPayment(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.closeMyCheckoutGroupPayment(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/orders/:id/confirm-received")
  async confirmReceived(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.confirmReceived(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/orders/:orderId/shipments/:shipmentId/confirm-received")
  async confirmShipmentReceived(@Param("orderId", ParseIntPipe) orderId: number, @Param("shipmentId", ParseIntPipe) shipmentId: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.confirmShipmentReceived(orderId, shipmentId, user, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/orders/:id/refund-request")
  async requestRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundRequestDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.requestRefund(id, user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/refunds/:id/messages")
  async addRefundMessage(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundMessageDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.addUserRefundMessage(id, user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/refunds/:id/return-shipment")
  async submitRefundReturn(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundReturnShipmentDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.submitRefundReturn(id, user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/refunds/:id/intervention")
  async requestRefundIntervention(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundMessageDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.requestRefundIntervention(id, user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/refunds/:id/cancel")
  async cancelRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundMessageDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.cancelRefund(id, user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/reviews")
  async createReview(@Body() dto: MallReviewDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createReview(user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/reviews/:id/append")
  async appendReview(@Param("id", ParseIntPipe) id: number, @Body() dto: MallReviewAppendDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.appendReview(id, user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/reviews/:id/report")
  async reportReview(@Param("id", ParseIntPipe) id: number, @Body() dto: MallReviewReportDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.reportReview(id, user, dto, this.tenantContext(req, tenantCode));
  }

  private tenantContext(req: any, tenantCode?: string): PublicTenantContext {
    const headerCode = req.headers?.["x-tenant-code"];
    const host = req.headers?.["x-forwarded-host"] || req.headers?.host || null;
    return {
      tenantCode: tenantCode || (typeof headerCode === "string" ? headerCode : Array.isArray(headerCode) ? headerCode[0] : null),
      host: typeof host === "string" ? host : null
    };
  }

  private riskContext(req: any, deviceId?: string) {
    const forwarded = req.headers?.["x-forwarded-for"];
    const forwardedIp = typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : Array.isArray(forwarded) ? String(forwarded[0] || "").trim() : "";
    return {
      clientIp: forwardedIp || req.ip || req.socket?.remoteAddress || null,
      userAgent: typeof req.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null,
      requestId: req.requestId || null,
      deviceId: String(deviceId || req.headers?.["x-device-id"] || "").trim() || null
    };
  }
}

@Controller("payment/mall")
export class MallPaymentController {
  constructor(private readonly service: MallService) {}

  @Post("wechat/callback")
  wechatPaymentCallback(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.service.wechatPaymentCallback(body, { headers: req.headers, rawBody: req.rawBody });
  }

  @Post("wechat/refund-callback")
  wechatRefundNotification(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.service.wechatRefundNotification(body, { headers: req.headers, rawBody: req.rawBody });
  }

  @Post("merchants/:merchantId/wechat/callback")
  wechatMerchantPaymentCallback(@Param("merchantId", ParseIntPipe) merchantId: number, @Body() body: Record<string, unknown>, @Req() req: any) {
    return this.service.wechatMerchantPaymentCallback(merchantId, body, { headers: req.headers, rawBody: req.rawBody });
  }

  @Post("merchants/:merchantId/wechat/refund-callback")
  wechatMerchantRefundNotification(@Param("merchantId", ParseIntPipe) merchantId: number, @Body() body: Record<string, unknown>, @Req() req: any) {
    return this.service.wechatMerchantRefundNotification(merchantId, body, { headers: req.headers, rawBody: req.rawBody });
  }
}
