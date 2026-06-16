import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from "@nestjs/common";
import { PublicService, PublicTenantContext } from "./public.service";
import { H5CodeDto, H5LoginDto, H5PasswordLoginDto, MockPayDto, MockPaymentCallbackDto, ProviderPayDto, ProviderPaymentCallbackDto, QuoteDto, RegisterDto, WechatLoginDto } from "./dto";

@Controller("public")
export class PublicController {
  constructor(private readonly service: PublicService) {}

  @Post("auth/h5-login")
  h5Login(@Body() dto: H5LoginDto) {
    return this.service.h5Login(dto);
  }

  @Post("auth/password-login")
  h5PasswordLogin(@Body() dto: H5PasswordLoginDto) {
    return this.service.h5PasswordLogin(dto);
  }

  @Post("auth/h5-code")
  h5Code(@Body() dto: H5CodeDto, @Req() req: any) {
    return this.service.h5Code(dto, this.clientIp(req));
  }

  @Post("auth/wechat-login")
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.service.wechatLogin(dto);
  }

  @Get("categories")
  categories(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.categoriesList(this.tenantContext(req, tenantCode));
  }

  @Get("tenants")
  tenants() {
    return this.service.publicTenants();
  }

  @Get("homepage")
  homepage(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.homepage(this.tenantContext(req, tenantCode));
  }

  @Get("page-decoration")
  pageDecoration(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("pageKey") pageKey?: string) {
    return this.service.homepage(this.tenantContext(req, tenantCode), pageKey);
  }

  @Get("settings/operation")
  operationSetting(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.operationSetting(this.tenantContext(req, tenantCode));
  }

  @Get("activities")
  activities(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("categoryId") categoryId?: string, @Query("status") status?: string, @Query("featured") featured?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("keyword") keyword?: string) {
    return this.service.activitiesList({
      categoryId: categoryId ? Number(categoryId) : undefined,
      status,
      featured: featured === undefined ? undefined : featured === "true",
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword
    }, this.tenantContext(req, tenantCode));
  }

  private clientIp(req: any) {
    const forwarded = req.headers?.["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
    return req.ip || req.socket?.remoteAddress || null;
  }

  private tenantContext(req: any, tenantCode?: string): PublicTenantContext {
    const headerCode = req.headers?.["x-tenant-code"];
    const host = req.headers?.["x-forwarded-host"] || req.headers?.host || null;
    return {
      tenantCode: tenantCode || (typeof headerCode === "string" ? headerCode : Array.isArray(headerCode) ? headerCode[0] : null),
      host: typeof host === "string" ? host : null
    };
  }

  @Get("activities/:id")
  activity(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("userId") userId?: string, @Query("tenantCode") tenantCode?: string) {
    return this.service.activityDetail(id, this.service.optionalUserIdFromAuthorization(req.headers?.authorization), this.tenantContext(req, tenantCode));
  }

  @Post("activities/:id/quote")
  async quote(@Param("id", ParseIntPipe) id: number, @Body() dto: QuoteDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.quote(id, dto, user, this.tenantContext(req, tenantCode));
  }

  @Post("activities/:id/register")
  async register(@Param("id", ParseIntPipe) id: number, @Body() dto: RegisterDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.register(id, dto, user, this.tenantContext(req, tenantCode));
  }

  @Post("orders/:id/pay/mock")
  async mockPay(@Param("id", ParseIntPipe) id: number, @Body() dto: MockPayDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.mockPay(id, dto, user, this.tenantContext(req, tenantCode));
  }

  @Post("orders/:id/pay/wechat")
  async wechatPay(@Param("id", ParseIntPipe) id: number, @Body() dto: ProviderPayDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createProviderPayment(id, "wechat", dto, user, this.tenantContext(req, tenantCode));
  }

  @Post("orders/:id/pay/balance")
  async balancePay(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.payWithBalance(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("orders/:id/pay/alipay")
  async alipayPay(@Param("id", ParseIntPipe) id: number, @Body() dto: ProviderPayDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createProviderPayment(id, "alipay", dto, user, this.tenantContext(req, tenantCode));
  }

  @Get("me/wallet")
  async myWallet(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myWallet(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/wallet/transactions")
  async myWalletTransactions(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myWalletTransactions(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/admin-access")
  async myAdminAccess(@Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myAdminAccess(user);
  }

  @Get("me/registrations")
  async myRegistrationsMe(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myRegistrations(user.id, this.tenantContext(req, tenantCode));
  }

  @Get("me/registrations/:id")
  async registrationDetailMe(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.registrationDetail(id, user.id, this.tenantContext(req, tenantCode));
  }

  @Post("me/registrations/:id/cancel")
  async cancelMe(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.cancelRegistration(id, user.id, this.tenantContext(req, tenantCode));
  }

  @Get("me/registrations/:id/check-in-code")
  async checkInCodeMe(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.checkInCode(id, user.id, this.tenantContext(req, tenantCode));
  }

  @Get("users/:userId/registrations")
  async myRegistrations(@Param("userId", ParseIntPipe) _userId: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myRegistrations(user.id, this.tenantContext(req, tenantCode));
  }

  @Get("users/:userId/registrations/:id")
  async registrationDetail(@Param("userId", ParseIntPipe) _userId: number, @Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.registrationDetail(id, user.id, this.tenantContext(req, tenantCode));
  }

  @Post("users/:userId/registrations/:id/cancel")
  async cancel(@Param("userId", ParseIntPipe) _userId: number, @Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.cancelRegistration(id, user.id, this.tenantContext(req, tenantCode));
  }

  @Get("users/:userId/registrations/:id/check-in-code")
  async checkInCode(@Param("userId", ParseIntPipe) _userId: number, @Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.checkInCode(id, user.id, this.tenantContext(req, tenantCode));
  }
}

@Controller("payment")
export class PaymentController {
  constructor(private readonly service: PublicService) {}

  @Post("mock/callback")
  mockPaymentCallback(@Body() dto: MockPaymentCallbackDto) {
    return this.service.mockPaymentCallback(dto);
  }

  @Post("wechat/callback")
  wechatPaymentCallback(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.service.providerPaymentCallback("wechat", body, { headers: req.headers, rawBody: req.rawBody });
  }

  @Post("alipay/callback")
  alipayPaymentCallback(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.service.providerPaymentCallback("alipay", body, { headers: req.headers, rawBody: req.rawBody });
  }

  @Post("wechat/refund-callback")
  wechatRefundCallback(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.service.providerRefundNotification("wechat", { ...body, ...this.refundCallbackLocator(req) }, { headers: req.headers, rawBody: req.rawBody });
  }

  @Post("alipay/refund-callback")
  alipayRefundCallback(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.service.providerRefundNotification("alipay", body, { headers: req.headers, rawBody: req.rawBody });
  }

  private refundCallbackLocator(req: any) {
    const orderNo = typeof req.query?.orderNo === "string" ? req.query.orderNo : typeof req.query?.out_trade_no === "string" ? req.query.out_trade_no : undefined;
    const refundNo = typeof req.query?.refundNo === "string" ? req.query.refundNo : typeof req.query?.out_refund_no === "string" ? req.query.out_refund_no : undefined;
    return Object.fromEntries(Object.entries({ orderNo, refundNo }).filter(([, value]) => value));
  }
}
