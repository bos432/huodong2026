import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import QRCode from "qrcode";
import { PublicService, PublicTenantContext } from "./public.service";
import { AmbassadorApplicationDto, CreateCourseOrderDto, FrequentRegistrantDto, H5CodeDto, H5LoginDto, H5PasswordLoginDto, MarketingPopupEventDto, MockPayDto, MockPaymentCallbackDto, PhoneChangeCodeDto, ProviderPayDto, ProviderPaymentCallbackDto, QuoteDto, RegisterDto, UpdatePasswordDto, UpdatePhoneDto, UpdateProfileDto, VolunteerApplyDto, VolunteerAttendanceSubmitDto, VolunteerServiceConfirmDto, VolunteerTaskApplyDto, VolunteerTaskCancelDto, WechatLoginDto, WechatPhoneDto } from "./dto";
import { AidApplicationCreateDto, AidApplicationMaterialDto, AidApplicationSupplementDto } from "./dto";
import { AidService } from "../aid/aid.service";

const AVATAR_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};
const REVIEW_IMAGE_EXTENSION_BY_MIME = AVATAR_EXTENSION_BY_MIME;
const REFUND_IMAGE_EXTENSION_BY_MIME = AVATAR_EXTENSION_BY_MIME;
const REGISTRATION_ATTACHMENT_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

@Controller("public")
export class PublicController {
  constructor(private readonly service: PublicService, private readonly aid: AidService) {}

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

  @Get("tenants/bootstrap")
  tenantBootstrap() {
    return this.service.publicTenantBootstrap();
  }

  @Get("tenants/resolve")
  resolveTenant(@Req() req: any, @Query("lat") lat?: string, @Query("lng") lng?: string, @Query("source") source?: string) {
    return this.service.resolveTenantByLocation(lat, lng, {
      source,
      clientIp: this.clientIp(req),
      userAgent: req.headers?.["user-agent"] || null
    });
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

  @Get("marketing-popups")
  marketingPopup(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("pageKey") pageKey?: string, @Query("platform") platform?: string) {
    return this.service.marketingPopup(this.tenantContext(req, tenantCode), pageKey || "home", platform || "h5");
  }

  @Post("marketing-popups/:id/events")
  marketingPopupEvent(@Param("id", ParseIntPipe) id: number, @Body() dto: MarketingPopupEventDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.recordMarketingPopupEvent(id, dto.event, dto.pageKey, dto.platform, this.tenantContext(req, tenantCode));
  }

  @Get("ad-slots")
  adSlot(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("pageKey") pageKey?: string, @Query("slotKey") slotKey?: string, @Query("platform") platform?: string) {
    return this.service.adSlot(this.tenantContext(req, tenantCode), pageKey || "home", slotKey || "home_top_banner", platform || "h5");
  }

  @Post("ad-slots/:id/events")
  adSlotEvent(@Param("id", ParseIntPipe) id: number, @Body() dto: { event?: string; platform?: string }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.recordAdSlotEvent(id, String(dto?.event || "impression"), String(dto?.platform || "h5"), this.tenantContext(req, tenantCode));
  }

  @Get("charity/summary")
  charitySummary() {
    return this.service.charitySummary();
  }

  @Get("charity/projects")
  charityProjects() {
    return this.service.charityProjects();
  }

  @Get("charity/projects/:id/updates")
  charityProjectUpdates(@Param("id", ParseIntPipe) id: number) {
    return this.service.charityProjectUpdates(id);
  }

  @Get("ambassador/landing")
  ambassadorLanding() {
    return this.service.ambassadorLanding();
  }

  @Post("ambassador/applications")
  async submitAmbassadorApplication(@Body() dto: AmbassadorApplicationDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const context = this.tenantContext(req, tenantCode);
    const partnerSource = ["dean_recruit", "partner_apply", "brand_story_contact"].includes(String(dto.source || ""));
    await this.service.assertFeatureGateEnabled(context, dto.kind === "partner" || partnerSource ? "partner" : "ambassador");
    return this.service.submitAmbassadorApplication(dto);
  }

  @Post("aid/applications")
  async createAidApplication(@Body() dto: AidApplicationCreateDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const context = this.tenantContext(req, tenantCode);
    const tenant = await this.service.assertFeatureGateEnabled(context, "charity");
    return this.aid.createApplication(dto, user, tenant?.code);
  }

  @Get("me/aid-applications")
  async myAidApplications(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const context = this.tenantContext(req, tenantCode);
    const tenant = await this.service.assertFeatureGateEnabled(context, "charity");
    return this.aid.myApplications(user, tenant?.code);
  }

  @Post("me/aid-applications/:id/supplement")
  async supplementAidApplication(@Param("id", ParseIntPipe) id: number, @Body() dto: AidApplicationSupplementDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const context = this.tenantContext(req, tenantCode);
    const tenant = await this.service.assertFeatureGateEnabled(context, "charity");
    return this.aid.submitSupplement(id, dto, user, tenant?.code);
  }

  @Post("me/aid-applications/:id/materials")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(null, REGISTRATION_ATTACHMENT_MIMES.has(file.mimetype)) }))
  async uploadAidApplicationMaterial(@Param("id", ParseIntPipe) id: number, @Body() dto: AidApplicationMaterialDto, @UploadedFile() file: Express.Multer.File, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const context = this.tenantContext(req, tenantCode);
    const tenant = await this.service.assertFeatureGateEnabled(context, "charity");
    return this.aid.addMaterial(id, dto, file as Express.Multer.File & { buffer: Buffer }, user, tenant?.code);
  }

  @Get("volunteer/tasks")
  async volunteerTasks(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("city") city?: string) {
    const context = this.tenantContext(req, tenantCode);
    await this.service.assertFeatureGateEnabled(context, "volunteer");
    return this.service.volunteerTasks(city, context);
  }

  @Post("volunteer/apply")
  async applyVolunteer(@Body() dto: VolunteerApplyDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const context = this.tenantContext(req, tenantCode);
    await this.service.assertFeatureGateEnabled(context, "volunteer");
    const user = this.service.optionalUserFromAuthorization(req.headers?.authorization);
    return this.service.applyVolunteer(dto, await user, context);
  }

  @Post("volunteer/tasks/:id/apply")
  async applyVolunteerTask(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerTaskApplyDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const context = this.tenantContext(req, tenantCode);
    await this.service.assertFeatureGateEnabled(context, "volunteer");
    const user = this.service.optionalUserFromAuthorization(req.headers?.authorization);
    return this.service.applyVolunteerTask(id, dto, await user, context);
  }

  @Post("me/volunteer/task-applications/:id/cancel")
  async cancelVolunteerTaskApplication(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerTaskCancelDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const context = this.tenantContext(req, tenantCode);
    await this.service.assertFeatureGateEnabled(context, "volunteer");
    return this.service.cancelVolunteerTaskApplication(id, dto, user, context);
  }

  @Post("me/volunteer/task-applications/:id/attendance")
  async submitVolunteerAttendance(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerAttendanceSubmitDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const context = this.tenantContext(req, tenantCode);
    await this.service.assertFeatureGateEnabled(context, "volunteer");
    return this.service.submitVolunteerAttendance(id, dto, user, context);
  }

  @Post("me/volunteer/service-records/:id/confirm")
  async confirmVolunteerServiceRecord(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerServiceConfirmDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const context = this.tenantContext(req, tenantCode);
    await this.service.assertFeatureGateEnabled(context, "volunteer");
    return this.service.confirmVolunteerServiceRecord(id, dto, user, context);
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
      host: typeof host === "string" ? host : null,
      userId: this.service.optionalUserIdFromAuthorization(req.headers?.authorization)
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
  async myProfile(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myProfile(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/frequent-registrants")
  async frequentRegistrants(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myFrequentRegistrants(user, this.tenantContext(req, tenantCode));
  }

  @Post("me/frequent-registrants")
  async createFrequentRegistrant(@Body() dto: FrequentRegistrantDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.saveFrequentRegistrant(user, dto, this.tenantContext(req, tenantCode));
  }

  @Put("me/frequent-registrants/:id")
  async updateFrequentRegistrant(@Param("id", ParseIntPipe) id: number, @Body() dto: FrequentRegistrantDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.saveFrequentRegistrant(user, dto, this.tenantContext(req, tenantCode), id);
  }

  @Delete("me/frequent-registrants/:id")
  async deleteFrequentRegistrant(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.deleteFrequentRegistrant(user, id, this.tenantContext(req, tenantCode));
  }

  @Get("wechat-subscriptions/templates")
  async wechatSubscriptionTemplates(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("scenes") scenes?: string) {
    await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const selectedScenes = String(scenes || "").split(",").map((item) => item.trim()).filter(Boolean);
    return this.service.wechatSubscriptionTemplates(this.tenantContext(req, tenantCode), selectedScenes);
  }

  @Post("me/wechat-subscriptions")
  async recordWechatSubscriptions(@Body() body: { results?: Array<{ scene?: string; templateId?: string; status?: string }> }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.recordWechatSubscriptionAuthorizations(user, body?.results as any, this.tenantContext(req, tenantCode));
  }

  @Get("me/wechat-subscriptions")
  async myWechatSubscriptions(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myWechatSubscriptionAuthorizations(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/orders-overview")
  async myOrdersOverview(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myOrdersOverview(user, this.tenantContext(req, tenantCode));
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
  async myCertificates(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myCertificates(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/certificates/:id/download")
  async downloadMyCertificate(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Res() res: Response, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const result = await this.service.myCertificateDownload(user, id, this.tenantContext(req, tenantCode));
    const encodedFilename = encodeURIComponent(result.filename).replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="certificate.svg"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Security-Policy", "sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Download-Options", "noopen");
    res.end(result.svg);
  }

  @Get("certificates/:certificateNo/image")
  async certificateImage(@Param("certificateNo") certificateNo: string, @Res() res: Response) {
    const result = await this.service.certificateImage(certificateNo);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Content-Security-Policy", "sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(result.svg);
  }

  @Get("coupons/available")
  async availableCoupons(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("activityId") activityId?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.availableActivityCoupons(user, this.tenantContext(req, tenantCode), activityId ? Number(activityId) : undefined);
  }

  @Post("coupons/:id/claim")
  async claimCoupon(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.claimActivityCoupon(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("redemption-codes/redeem")
  async redeemCode(@Body() body: { code?: string }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.redeemCode(String(body.code || ""), user, this.tenantContext(req, tenantCode));
  }

  @Post("course-orders/:id/pay/wechat")
  async payCourseWechat(@Param("id", ParseIntPipe) id: number, @Body() dto: ProviderPayDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createCourseProviderPayment(id, "wechat", dto, user, this.tenantContext(req, tenantCode));
  }

  @Post("course-orders/:id/pay/alipay")
  async payCourseAlipay(@Param("id", ParseIntPipe) id: number, @Body() dto: ProviderPayDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createCourseProviderPayment(id, "alipay", dto, user, this.tenantContext(req, tenantCode));
  }

  @Post("course-orders/:id/pay/balance")
  async payCourseBalance(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.payCourseOrderWithBalance(id, user, this.tenantContext(req, tenantCode));
  }

  @Get("course-orders/:id/payment-status")
  async queryCoursePayment(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.queryCourseOrderPayment(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("course-orders/:id/payment-close")
  async closeCoursePayment(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.closeCourseOrderPayment(id, user, this.tenantContext(req, tenantCode));
  }

  @Get("certificates/:certificateNo/verify")
  verifyCertificate(@Param("certificateNo") certificateNo: string) {
    return this.service.verifyCertificate(certificateNo);
  }

  @Get("volunteer-proofs/:proofNo/verify")
  verifyVolunteerProof(@Param("proofNo") proofNo: string) {
    return this.service.verifyVolunteerProof(proofNo);
  }

  @Get("me/favorite-courses")
  async myFavoriteCourses(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myFavoriteCourses(user, this.tenantContext(req, tenantCode));
  }

  @Get("me/course-favorites/:id")
  async favoriteCourseState(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.favoriteCourseState(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("me/course-favorites/:id")
  async toggleFavoriteCourse(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.toggleFavoriteCourse(id, user, this.tenantContext(req, tenantCode));
  }

  @Put("me/profile")
  async updateMyProfileByPut(@Body() dto: UpdateProfileDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.updateMyProfile(user, dto, this.tenantContext(req, tenantCode));
  }

  @Patch("me/profile")
  async updateMyProfile(@Body() dto: UpdateProfileDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.updateMyProfile(user, dto, this.tenantContext(req, tenantCode));
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
  async updateMyPhone(@Body() dto: UpdatePhoneDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.updateMyPhone(user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/phone/wechat")
  async updateMyPhoneByWechat(@Body() dto: WechatPhoneDto, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.bindWechatPhone(user, dto, this.tenantContext(req, tenantCode));
  }

  @Post("me/avatar")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, Boolean(AVATAR_EXTENSION_BY_MIME[file.mimetype]));
    }
  }))
  async uploadMyAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.uploadMyAvatar(user, file, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/review-images")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, Boolean(REVIEW_IMAGE_EXTENSION_BY_MIME[file.mimetype]));
    }
  }))
  async uploadMallReviewImage(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.uploadMallReviewImage(user, file, this.tenantContext(req, tenantCode));
  }

  @Post("me/mall/refund-images")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, Boolean(REFUND_IMAGE_EXTENSION_BY_MIME[file.mimetype]));
    }
  }))
  async uploadMallRefundImage(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.uploadMallRefundImage(user, file, this.tenantContext(req, tenantCode));
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

  @Get("me/charity/transactions/:id/certificate/download")
  async downloadMyCharityContributionCertificate(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Res() res: Response) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const result = await this.service.myCharityContributionCertificate(user, id);
    const encodedFilename = encodeURIComponent(result.filename).replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="charity-contribution.svg"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Security-Policy", "sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(result.svg);
  }

  @Get("charity-certificates/:certificateNo/verify")
  verifyCharityContributionCertificate(@Param("certificateNo") certificateNo: string) {
    return this.service.verifyCharityContributionCertificate(certificateNo);
  }

  @Get("charity-certificates/:certificateNo/image")
  async charityContributionCertificateImage(@Param("certificateNo") certificateNo: string, @Res() res: Response) {
    const result = await this.service.charityContributionCertificateImage(certificateNo);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Content-Security-Policy", "sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(result.svg);
  }

  @Get("me/volunteer")
  async myVolunteer(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const context = this.tenantContext(req, tenantCode);
    await this.service.assertFeatureGateEnabled(context, "volunteer");
    return this.service.myVolunteer(user, context);
  }

  @Get("me/registrations")
  async myRegistrationsMe(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myRegistrations(user.id, this.tenantContext(req, tenantCode));
  }

  @Get("me/activity-reviews")
  async myActivityReviews(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.myActivityReviews(user, this.tenantContext(req, tenantCode));
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

  @Get("me/registrations/:id/payment-status")
  async registrationPaymentStatus(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.queryRegistrationPayment(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("me/registrations/:id/payment-close")
  async closeRegistrationPayment(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.closeRegistrationPayment(id, user, this.tenantContext(req, tenantCode));
  }

  @Post("me/registration-attachments")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => callback(null, REGISTRATION_ATTACHMENT_MIMES.has(file.mimetype))
  }))
  async uploadRegistrationAttachment(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.uploadRegistrationAttachment(user, file, this.tenantContext(req, tenantCode));
  }

  @Get("me/registration-attachments/:token/download")
  async downloadRegistrationAttachment(@Param("token") token: string, @Req() req: any, @Res() res: Response, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const file = await this.service.readMyRegistrationAttachment(token, user, this.tenantContext(req, tenantCode));
    res.setHeader("Content-Type", file.mimetype);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(file.buffer);
  }

  @Get("me/registrations/:id/check-in-qrcode.png")
  async checkInQrCodeMe(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Res() res: Response, @Query("tenantCode") tenantCode?: string) {
    const user = await this.service.requireUserFromAuthorization(req.headers?.authorization);
    const data = await this.service.checkInCode(id, user.id, this.tenantContext(req, tenantCode));
    const png = await QRCode.toBuffer(data.code, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 360,
      color: { dark: "#111827", light: "#ffffff" }
    });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "private, no-store");
    res.end(png);
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

  @Post("course/wechat/callback")
  courseWechatPaymentCallback(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.service.courseProviderPaymentCallback("wechat", body, { headers: req.headers, rawBody: req.rawBody });
  }

  @Post("course/alipay/callback")
  courseAlipayPaymentCallback(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.service.courseProviderPaymentCallback("alipay", body, { headers: req.headers, rawBody: req.rawBody });
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
