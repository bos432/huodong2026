import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from "@nestjs/common";
import { PublicService, PublicTenantContext } from "../public/public.service";
import { CreateMallOrderDto, MallAddressDto, MallCartItemDto, MallCartQuantityDto, MallListQueryDto, MallOrderQuoteDto, MallProviderPayDto, MallRefundRequestDto, MallReviewDto } from "./mall.dto";
import { MallService } from "./mall.service";

@Controller("public")
export class MallPublicController {
  constructor(private readonly service: MallService, private readonly publicService: PublicService) {}

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
    return this.service.claimCoupon(user, id, this.tenantContext(req, tenantCode), merchantId ? Number(merchantId) : undefined);
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

  @Post("me/mall/products/:id/browse")
  async recordBrowse(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.recordBrowse(user, id, this.tenantContext(req, tenantCode));
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
    return this.service.createOrder(user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("mall/checkout-groups")
  async createCheckoutGroup(@Body() dto: CreateMallOrderDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createCheckoutGroup(user, dto, this.tenantContext(req, tenantCode));
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

  @Post("me/mall/orders/:id/confirm-received")
  async confirmReceived(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.confirmReceived(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/orders/:id/refund-request")
  async requestRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: MallRefundRequestDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.requestRefund(id, user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/reviews")
  async createReview(@Body() dto: MallReviewDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicService.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createReview(user, dto, this.tenantContext(req, tenantCode));
  }

  private tenantContext(req: any, tenantCode?: string): PublicTenantContext {
    const headerCode = req.headers?.["x-tenant-code"];
    const host = req.headers?.["x-forwarded-host"] || req.headers?.host || null;
    return {
      tenantCode: tenantCode || (typeof headerCode === "string" ? headerCode : Array.isArray(headerCode) ? headerCode[0] : null),
      host: typeof host === "string" ? host : null
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
