import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { mkdirSync } from "fs";
import { diskStorage } from "multer";
import { join } from "path";
import { PublicService, PublicTenantContext } from "./public.service";
import { AmbassadorApplicationDto, CreateCourseOrderDto, H5CodeDto, H5LoginDto, H5PasswordLoginDto, MockPayDto, MockPaymentCallbackDto, PhoneChangeCodeDto, ProviderPayDto, ProviderPaymentCallbackDto, QuoteDto, RegisterDto, UpdatePasswordDto, UpdatePhoneDto, UpdateProfileDto, WechatLoginDto } from "./dto";

const AVATAR_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};
const AVATAR_UPLOAD_DIR = join(process.cwd(), process.env.UPLOAD_DIR || "uploads", "avatars");
mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });

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

  @Get("tenants/resolve")
  resolveTenant(@Query("lat") lat?: string, @Query("lng") lng?: string) {
    return this.service.resolveTenantByLocation(lat, lng);
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

  @Get("charity/summary")
  charitySummary() {
    return this.service.charitySummary();
  }

  @Get("charity/projects")
  charityProjects() {
    return this.service.charityProjects();
  }

  @Get("ambassador/landing")
  ambassadorLanding() {
    return this.service.ambassadorLanding();
  }

  @Post("ambassador/applications")
  submitAmbassadorApplication(@Body() dto: AmbassadorApplicationDto) {
    return this.service.submitAmbassadorApplication(dto);
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
  activity(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("userId") userId?: string, @Query("tenantCode") tenantCode?: string, @Query("channelCode") channelCode?: string, @Query("source") source?: string, @Query("inviteCode") inviteCode?: string) {
    return this.service.activityDetail(id, this.service.optionalUserIdFromAuthorization(req.headers?.authorization), this.tenantContext(req, tenantCode), {
      channelCode,
      source,
      inviteCode,
      clientIp: this.clientIp(req),
      userAgent: req.headers?.["user-agent"] || null
    });
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

  @Post("courses/:id/orders")
  async createCourseOrder(@Param("id", ParseIntPipe) id: number, @Body() dto: CreateCourseOrderDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createCourseOrder(id, dto, user, this.tenantContext(req, tenantCode));
  }

  @Get("course-orders/:id")
  async courseOrderDetail(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.courseOrderDetail(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("course-orders/:id/pay/mock")
  async mockPayCourseOrder(@Param("id", ParseIntPipe) id: number, @Body() dto: MockPayDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.mockPayCourseOrder(id, dto, user, this.tenantContext(req, tenantCode));
  }

  @Get("me/wallet")
  async myWallet(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myWallet(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/profile")
  async myProfile(@Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myProfile(user);
  }

  @Get("me/courses")
  async myCourses(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myCourses(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/course-orders")
  async myCourseOrders(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myCourseOrders(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/certificates")
  async myCertificates(@Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myCertificates(user);
  }

  @Get("me/favorite-courses")
  async myFavoriteCourses(@Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myFavoriteCourses(user);
  }

  @Get("me/course-favorites/:id")
  async favoriteCourseState(@Param("id", ParseIntPipe) id: number, @Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.favoriteCourseState(id, user);
  }

  @Post("me/course-favorites/:id")
  async toggleFavoriteCourse(@Param("id", ParseIntPipe) id: number, @Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.toggleFavoriteCourse(id, user);
  }

  @Patch("me/profile")
  async updateMyProfile(@Body() dto: UpdateProfileDto, @Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.updateMyProfile(user, dto);
  }

  @Post("me/password")
  async updateMyPassword(@Body() dto: UpdatePasswordDto, @Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.updateMyPassword(user, dto);
  }

  @Post("me/phone/change-code")
  async myPhoneChangeCode(@Body() dto: PhoneChangeCodeDto, @Req() req: any) {
    await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.phoneChangeCode(dto, this.clientIp(req));
  }

  @Post("me/phone")
  async updateMyPhone(@Body() dto: UpdatePhoneDto, @Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.updateMyPhone(user, dto);
  }

  @Post("me/avatar")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: AVATAR_UPLOAD_DIR,
      filename: (_req, file, callback) => {
        const suffix = AVATAR_EXTENSION_BY_MIME[file.mimetype] || ".jpg";
        callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${suffix}`);
      }
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, Boolean(AVATAR_EXTENSION_BY_MIME[file.mimetype]));
    }
  }))
  async uploadMyAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.uploadMyAvatar(user, file);
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

  @Get("me/charity")
  async myCharity(@Req() req: any) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myCharity(user);
  }

  @Get("me/charity/transactions")
  async myCharityTransactions(@Req() req: any, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myCharityTransactions(user, page ? Number(page) : undefined, pageSize ? Number(pageSize) : undefined);
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

  @Post("me/registrations/:id/refund-request")
  async requestRegistrationRefund(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.requestRegistrationRefund(id, user, this.tenantContext(req, tenantCode));
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

  @Post("users/:userId/registrations/:id/refund-request")
  async requestRegistrationRefundLegacy(@Param("userId", ParseIntPipe) _userId: number, @Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.requestRegistrationRefund(id, user, this.tenantContext(req, tenantCode));
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
