import { Body, Controller, Delete, Get, Header, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { AdminService } from "./admin.service";
import { AdminRole, AdminRoles } from "./admin-roles";
import { CurrentAdmin } from "./current-admin.decorator";
import { ActivityApprovalDto, ActivityChannelDto, ActivityDto, ActivityQueryDto, AdAdvertiserDto, AdCampaignDto, AdCenterQueryDto, AdContractDto, AdOfficialRevenueImportDto, AdSettlementGenerateDto, AdSettlementStatusDto, AdminQueryDto, AgentDto, AgentPaymentAccountDto, AgentSettlementGenerateDto, AgentSettlementPayDto, AgentSettlementQueryDto, AgentSettlementSandboxTransferDto, AmbassadorApplicationFollowupDto, AmbassadorApplicationQueryDto, AmbassadorApplicationStatusDto, AmbassadorCaseDto, AmbassadorSettingDto, AnalyticsQueryDto, AnnouncementDto, BulkActivityTagDto, CategoryDto, ChangeOwnPasswordDto, CharityDisbursementDto, CharityDisbursementPayDto, CharityDisbursementReviewDto, CharityProjectActionDto, CharityProjectDto, CharityProjectReviewDto, CharityProjectUpdateDto, CharitySettingDto, CheckInDto, ConfirmPaymentDto, CopyAdminRoleDto, CouponDto, CouponRecordQueryDto, CreateAdminDto, CreateMemberDto, HomepageDecorationTemplateDto, HomepageDecorationVersionDto, HomepageReorderDto, HomepageReplaceDto, HomepageSectionDto, LoginDto, MarketingPopupDto, MemberLevelAdjustDto, MemberLevelDto, MemberPointAdjustDto, MemberPointRuleDto, MemberQueryDto, MiniprogramReleaseSettingDto, MiniprogramReleaseVersionDto, OperationSettingDto, OrderQueryDto, OrderRemarkDto, PaymentStatementFetchDto, PaymentStatementImportDto, RedemptionCodeDto, RedemptionCodeUsageQueryDto, RefundDto, RefundQueryDto, RegistrationQueryDto, ResetMemberPasswordDto, ReviewDto, SmsTestDto, SupportQueryDto, TenantDto, TenantPermissionDto, TenantProfileDto, TenantRegionBulkImportDto, TenantRegionDto, TenantRegionHitLogQueryDto, TicketTypeDto, UpdateAdminDto, UpdateAdminPasswordDto, UpdateAdminStatusDto, UpdateMemberDto, UserTagDto, UserTagQueryDto, VolunteerCertificateDto, VolunteerProfileQueryDto, VolunteerProfileStatusDto, VolunteerServiceRecordDto, VolunteerServiceRecordQueryDto, VolunteerTaskApplicationStatusDto, VolunteerTaskDto, VolunteerTaskQueryDto, WaitlistCancelDto, WaitlistQueryDto, WalletAdjustDto } from "./dto";
import { BulkRegistrationNotifyDto, BulkRegistrationReviewDto, BulkRegistrationTagDto } from "./dto";
import { AnnouncementQueryDto } from "./dto";
import { MarketingPopupEffectiveCheckQueryDto, MarketingPopupQueryDto } from "./dto";
import { AcceptAdminInviteDto, CreateAdminInviteDto } from "./dto";
import { TenantSubscriptionChangeDto } from "./dto";
import { TenantRegionApprovalDto } from "./dto";
import { OperationLogQueryDto } from "./dto";
import { VolunteerAttendanceDto, VolunteerBadgeActionDto, VolunteerHourAdjustmentDto, VolunteerProofActionDto, VolunteerProofDto, VolunteerServiceActionDto, VolunteerTrainingActionDto, VolunteerTrainingRecordDto } from "./dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { MiniprogramReleaseService } from "./miniprogram-release.service";
import { FundRiskMonitorService } from "./fund-risk-monitor.service";
import { SupportWorkOrderActionDto, SupportWorkOrderCreateDto, SupportWorkOrderQueryDto } from "./dto";
import { SupportSensitiveRevealDto } from "./dto";
import { AnalyticsRecomputeDto } from "./dto";
import { AnalyticsMetricQueryDto } from "./dto";
import { AnalyticsBusinessQueryDto } from "./dto";
import { PaymentAccountQueryDto } from "./dto";
import { CharityDisbursementCancelDto } from "./dto";
import { AidApplicationActionDto, AidApplicationQueryDto } from "./dto";
import { AidService } from "../aid/aid.service";
import { AmbassadorContributionActionDto, AmbassadorContributionDto, AmbassadorProfileQueryDto, AmbassadorProfileStatusDto, AmbassadorTaskDto, PartnerContractActionDto, PartnerContractDto, PartnerConversionDto } from "./dto";
import { MemberBehaviorTagRefreshDto, MemberBehaviorTagRunQueryDto, MemberSegmentPreviewDto, MemberSegmentSaveDto, MemberSegmentSnapshotCreateDto } from "./dto";
import { sanitizeAuditValue } from "./audit-sanitizer";
import { CredentialTemplateService } from "../credential-templates/credential-template.service";
import { renderCertificateSvg, renderCharityContributionSvg } from "../../shared/certificate-svg";

function sanitizeWalletResponse(value: unknown): unknown {
  const sanitized = sanitizeAuditValue(value);
  const strip = (current: any): any => {
    if (Array.isArray(current)) return current.map(strip);
    if (!current || typeof current !== "object") return current;
    if (Object.prototype.hasOwnProperty.call(current, "user") && current.user && typeof current.user === "object") {
      current.user = { id: current.user.id, nickname: current.user.nickname, phone: current.user.phone };
    }
    if (Object.prototype.hasOwnProperty.call(current, "tenant") && current.tenant && typeof current.tenant === "object") {
      current.tenant = { id: current.tenant.id, code: current.tenant.code, name: current.tenant.name };
    }
    for (const [key, child] of Object.entries(current)) current[key] = strip(child);
    return current;
  };
  return strip(sanitized);
}

function sanitizeFinanceTransactionResponse(value: unknown): unknown {
  const sanitized = sanitizeAuditValue(value);
  const removed = new Set(["passwordHash", "openid", "unionid", "wechatAppId", "settings", "checkInCode", "answers", "formSnapshot", "businessSnapshot"]);
  const strip = (current: any): any => {
    if (Array.isArray(current)) return current.map(strip);
    if (!current || typeof current !== "object") return current;
    for (const key of Object.keys(current)) {
      if (removed.has(key)) delete current[key];
      else current[key] = strip(current[key]);
    }
    if (current.user && typeof current.user === "object") current.user = { id: current.user.id, nickname: current.user.nickname, phone: current.user.phone };
    if (current.tenant && typeof current.tenant === "object") current.tenant = { id: current.tenant.id, code: current.tenant.code, name: current.tenant.name };
    return current;
  };
  return strip(sanitized);
}

const SUPER_ADMIN = [AdminRole.SuperAdmin];
const OVERVIEW_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance];
const OPERATION_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator];
const AID_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator];
const FINANCE_ROLES = [AdminRole.SuperAdmin, AdminRole.Finance];
const CHECK_IN_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.CheckInStaff];
const ACTIVITY_VIEW_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff];
const REGISTRATION_VIEW_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff];
const AGENT_VIEW_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance];
const PAYMENT_ACCOUNT_VIEW_ROLES = [AdminRole.SuperAdmin, AdminRole.Finance];
const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};
const SETTLEMENT_PROOF_EXTENSION_BY_MIME: Record<string, string> = {
  ...IMAGE_EXTENSION_BY_MIME,
  "application/pdf": ".pdf"
};

@Controller("admin")
export class AdminController {
  constructor(private readonly service: AdminService, private readonly miniprogramRelease: MiniprogramReleaseService, private readonly fundRisks: FundRiskMonitorService, private readonly aid: AidService, private readonly credentialTemplates: CredentialTemplateService) {}

  @AdminRoles(...OPERATION_ROLES)
  @Get("credential-templates")
  credentialTemplateList(@CurrentAdmin() admin?: { id?: number; username?: string; tenantId?: number | null }) {
    return this.credentialTemplates.list(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Put("credential-templates/:key/draft")
  saveCredentialTemplateDraft(@Param("key") key: string, @Body() body: { config?: unknown }, @CurrentAdmin() admin?: { id?: number; username?: string; tenantId?: number | null }) {
    return this.credentialTemplates.saveDraft(key, body?.config, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("credential-templates/:key/preview")
  previewCredentialTemplate(@Param("key") key: string, @Body() body: { config?: unknown }) {
    const preview = this.credentialTemplates.normalizePreview(key, body?.config);
    if (preview.key === "charity_contribution") {
      return { ...preview, ...renderCharityContributionSvg({ certificateNo: "MPCG20260721-000001-DEMO2026", holderName: "示例用户", contributionAmount: 88.88, sourceTitle: "城市公益活动订单", orderNo: "MP202607210001", issuedAt: new Date(), status: "active", template: preview.config }) };
    }
    return { ...preview, ...renderCertificateSvg({ certificate: { id: 1, name: preview.label, certificateNo: `${preview.config.numberPrefix}202607210001`, templateKey: preview.key, serviceHours: "36.5", threshold: 100, status: "active", issuedAt: new Date() }, displayName: "示例用户", template: preview.config }) };
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("credential-templates/:key/publish")
  publishCredentialTemplate(@Param("key") key: string, @Body() body: { note?: unknown }, @CurrentAdmin() admin?: { id?: number; username?: string; tenantId?: number | null }) {
    return this.credentialTemplates.publish(key, body?.note, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("credential-templates/:key/versions")
  credentialTemplateVersions(@Param("key") key: string, @CurrentAdmin() admin?: { id?: number; username?: string; tenantId?: number | null }) {
    return this.credentialTemplates.history(key, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("credential-templates/:key/versions/:version/restore")
  restoreCredentialTemplateVersion(@Param("key") key: string, @Param("version", ParseIntPipe) version: number, @CurrentAdmin() admin?: { id?: number; username?: string; tenantId?: number | null }) {
    return this.credentialTemplates.restore(key, version, admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("business-jobs")
  businessJobList(@Query() query: { status?: string; type?: string; tenantId?: string; keyword?: string; page?: string; pageSize?: string }, @CurrentAdmin() admin?: { id?: number; username?: string; role?: string; tenantId?: number | null }) {
    return this.service.listBusinessJobs({ ...query, tenantId: query.tenantId === undefined ? undefined : Number(query.tenantId), page: Number(query.page || 1), pageSize: Number(query.pageSize || 20) }, admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Post("business-jobs/:id/replay")
  replayBusinessJob(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id?: number; username?: string; role?: string; tenantId?: number | null }) {
    return this.service.replayBusinessJob(id, admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Post("business-jobs/:id/cancel")
  cancelBusinessJob(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id?: number; username?: string; role?: string; tenantId?: number | null }) {
    return this.service.cancelBusinessJob(id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("business-jobs/run-due")
  runDueBusinessJobs(@CurrentAdmin() admin?: { id?: number; username?: string; role?: string; tenantId?: number | null }) {
    return this.service.runDueBusinessJobs(admin);
  }

  @Post("auth/login")
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.service.login(dto, { clientIp: this.clientIp(req), userAgent: req.headers?.["user-agent"] || null });
  }

  private clientIp(req: any) {
    const forwarded = req.headers?.["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
    return req.ip || req.socket?.remoteAddress || null;
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("admins")
  admins(@Query() query: AdminQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAdmins(query, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("admins/options")
  adminOptions(@Query() query: AdminQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminAccountOptions(query.tenantId, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("tenants/export")
  async exportTenants(@CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportTenants(admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=tenants.xlsx");
    res.send(buffer);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("tenants")
  tenants(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listTenants(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("tenants")
  createTenant(@Body() dto: TenantDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveTenant(dto, undefined, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("tenants/:id")
  updateTenant(@Param("id", ParseIntPipe) id: number, @Body() dto: TenantDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveTenant(dto, id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("tenants/:id/permissions")
  updateTenantPermissions(@Param("id", ParseIntPipe) id: number, @Body() dto: TenantPermissionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateTenantPermissions(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("tenant-regions")
  tenantRegions(@Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listTenantRegions(admin, tenantId ? Number(tenantId) : undefined);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("tenant-regions/options")
  tenantRegionOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.tenantRegionOptions(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("tenant-region-hit-logs/summary")
  tenantRegionHitLogSummary(@Query() query: TenantRegionHitLogQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.tenantRegionHitLogSummary(query, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("tenant-region-hit-logs/options")
  tenantRegionHitLogOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.tenantRegionHitLogOptions(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("tenant-region-hit-logs/export")
  async exportTenantRegionHitLogs(@Query() query: TenantRegionHitLogQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportTenantRegionHitLogs(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=tenant-region-hit-logs.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("tenant-region-hit-logs")
  tenantRegionHitLogs(@Query() query: TenantRegionHitLogQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listTenantRegionHitLogs(query, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("tenant-regions")
  createTenantRegion(@Body() dto: TenantRegionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveTenantRegion(dto, undefined, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("tenant-regions/bulk-import")
  bulkImportTenantRegions(@Body() dto: TenantRegionBulkImportDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.bulkImportTenantRegions(dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("tenant-regions/:id")
  updateTenantRegion(@Param("id", ParseIntPipe) id: number, @Body() dto: TenantRegionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveTenantRegion(dto, id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("tenant-regions/:id/approval")
  approveTenantRegion(@Param("id", ParseIntPipe) id: number, @Body() dto: TenantRegionApprovalDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.approveTenantRegion(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Delete("tenant-regions/:id")
  deleteTenantRegion(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteTenantRegion(id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("tenant/profile")
  tenantProfile(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.getTenantProfile(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("tenant/profile")
  updateTenantProfile(@Body() dto: TenantProfileDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateTenantProfile(dto, admin);
  }

  @UseGuards(JwtAuthGuard)
  @Post("auth/change-password")
  changeOwnPassword(@Body() dto: ChangeOwnPasswordDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.changeOwnPassword(dto, admin);
  }

  @UseGuards(JwtAuthGuard)
  @Get("auth/me")
  currentAdmin(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.currentAdmin(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("operation-logs")
  operationLogs(@Query() query: OperationLogQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listOperationLogs(query, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("operation-logs/options")
  operationLogOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.operationLogOptions(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("operation-logs/export")
  async exportOperationLogs(@Query() query: OperationLogQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportOperationLogs(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=operation-logs.xlsx");
    res.send(buffer);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("auth/log-options")
  securityLogOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.securityLogOptions(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("auth/login-logs")
  loginLogs(@Query("username") username?: string, @Query("status") status?: string, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAdminLoginLogs({ username, status, tenantId: tenantId ? Number(tenantId) : undefined }, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("auth/login-logs/export")
  async exportLoginLogs(@Query("username") username: string | undefined, @Query("status") status: string | undefined, @Query("tenantId") tenantId: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAdminLoginLogs({ username, status, tenantId: tenantId ? Number(tenantId) : undefined }, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=admin-login-logs.xlsx");
    res.send(buffer);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("auth/h5-code-logs")
  h5CodeLogs(@Query("phone") phone?: string, @Query("status") status?: string, @Query("mode") mode?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listH5AuthCodeLogs({ phone, status, mode }, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("auth/h5-code-logs/export")
  async exportH5CodeLogs(@Query("phone") phone: string | undefined, @Query("status") status: string | undefined, @Query("mode") mode: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportH5AuthCodeLogs({ phone, status, mode }, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=h5-code-logs.xlsx");
    res.send(buffer);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("system/config-check")
  configCheck(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.configCheck(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("miniprogram-release/setting")
  miniprogramReleaseSetting() {
    return this.miniprogramRelease.getSetting();
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("miniprogram-release/setting")
  saveMiniprogramReleaseSetting(@Body() dto: MiniprogramReleaseSettingDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.miniprogramRelease.saveSetting(dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("miniprogram-release/logs")
  miniprogramReleaseLogs(@Query("limit") limit?: string) {
    return this.miniprogramRelease.logsList(limit ? Number(limit) : 30);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("miniprogram-release/upload")
  uploadMiniprogramTrial(@Body() dto: MiniprogramReleaseVersionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.miniprogramRelease.uploadTrial(dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("miniprogram-release/submit-audit")
  submitMiniprogramAudit(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.miniprogramRelease.submitAudit(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("miniprogram-release/audit-status")
  miniprogramAuditStatus(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.miniprogramRelease.latestAuditStatus(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("miniprogram-release/release")
  releaseMiniprogram(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.miniprogramRelease.release(admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("dashboard")
  dashboard(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.dashboard(admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/overview")
  analyticsOverview(@Query() query: AnalyticsQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.analyticsOverview(query, admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/trends")
  analyticsTrends(@Query() query: AnalyticsQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.analyticsTrends(query, admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/channels")
  analyticsChannels(@Query() query: AnalyticsQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.analyticsChannels(query, admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/users")
  analyticsUsers(@Query() query: AnalyticsQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.analyticsUsers(query, admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/business-overview")
  analyticsBusinessOverview(@Query() query: AnalyticsQueryDto, @CurrentAdmin() admin?: any) { return this.service.analyticsBusinessOverview(query, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/business-details")
  analyticsBusinessDetails(@Query() query: AnalyticsBusinessQueryDto, @CurrentAdmin() admin?: any) { return this.service.analyticsBusinessDetails(query, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/business-export")
  async analyticsBusinessExport(@Query() query: AnalyticsBusinessQueryDto, @CurrentAdmin() admin: any, @Res() res: Response) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=analytics-business.csv");
    res.send(await this.service.exportAnalyticsBusinessDetails(query, admin));
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/growth")
  analyticsGrowth(@Query() query: AnalyticsQueryDto, @CurrentAdmin() admin?: any) { return this.service.analyticsGrowth(query, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/growth-export")
  async analyticsGrowthExport(@Query() query: AnalyticsQueryDto, @CurrentAdmin() admin: any, @Res() res: Response) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=analytics-growth.csv");
    res.send(await this.service.exportAnalyticsGrowth(query, admin));
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/calculation-runs")
  analyticsCalculationRuns(@Query("tenantId") tenantId: string | undefined, @CurrentAdmin() admin?: any) { return this.service.listAnalyticsCalculationRuns(admin, tenantId ? Number(tenantId) : undefined); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Post("analytics/recompute")
  recomputeAnalytics(@Body() dto: AnalyticsRecomputeDto, @CurrentAdmin() admin?: any) { return this.service.recomputeAnalytics(dto, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/metrics")
  analyticsMetrics(@Query() query: AnalyticsMetricQueryDto, @CurrentAdmin() admin?: any) { return this.service.analyticsMetricRows(query, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/metrics/drilldown")
  analyticsMetricDrilldown(@Query() query: AnalyticsMetricQueryDto, @CurrentAdmin() admin?: any) { return this.service.analyticsMetricDrilldown(query, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("analytics/metrics-export")
  async analyticsMetricsExport(@Query() query: AnalyticsMetricQueryDto, @CurrentAdmin() admin: any, @Res() res: Response) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=analytics-metrics.csv");
    res.send(await this.service.exportAnalyticsMetrics(query, admin));
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("support/search")
  supportSearch(@Query() query: SupportQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.supportSearch(query, admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Post("support/users/:id/reveal-phone")
  revealSupportPhone(@Param("id", ParseIntPipe) id: number, @Body() dto: SupportSensitiveRevealDto, @CurrentAdmin() admin?: any) { return this.service.revealSupportUserPhone(id, dto, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("support/work-orders")
  supportWorkOrders(@Query() query: SupportWorkOrderQueryDto, @CurrentAdmin() admin?: any) { return this.service.listSupportWorkOrders(query, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("support/assignees")
  supportAssignees(@Query("tenantId") tenantId: string | undefined, @CurrentAdmin() admin?: any) { return this.service.listSupportAssignees(tenantId ? Number(tenantId) : undefined, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("support/work-orders/:id")
  supportWorkOrder(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: any) { return this.service.supportWorkOrderDetail(id, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Post("support/work-orders")
  createSupportWorkOrder(@Body() dto: SupportWorkOrderCreateDto, @CurrentAdmin() admin?: any) { return this.service.createSupportWorkOrder(dto, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Patch("support/work-orders/:id")
  updateSupportWorkOrder(@Param("id", ParseIntPipe) id: number, @Body() dto: SupportWorkOrderActionDto, @CurrentAdmin() admin?: any) { return this.service.updateSupportWorkOrder(id, dto, admin); }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("charity/summary")
  charitySummary(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.charitySummary(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("tenants/:id/subscription-events")
  tenantSubscriptionEvents(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listTenantSubscriptionEvents(id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("tenants/:id/subscription-change")
  changeTenantSubscription(@Param("id", ParseIntPipe) id: number, @Body() dto: TenantSubscriptionChangeDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.changeTenantSubscription(id, dto, admin);
  }

  @Get("auth/invitations/:token")
  adminInvitation(@Param("token") token: string) {
    return this.service.adminInvitationPreview(token);
  }

  @Post("auth/invitations/accept")
  acceptAdminInvitation(@Body() dto: AcceptAdminInviteDto) {
    return this.service.acceptAdminInvitation(dto);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("charity/overview")
  charityOverview(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.charityOverview(admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("charity/transactions")
  charityTransactions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }, @Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("keyword") keyword?: string, @Query("type") type?: string, @Query("sourceType") sourceType?: string) {
    if (page || pageSize || keyword || type || sourceType) return this.service.charityTransactionsPage(admin, { page: Number(page || 1), pageSize: Number(pageSize || 20), keyword, type, sourceType });
    return this.service.charityTransactions(admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("charity/transactions/:id/certificate/image")
  async charityContributionCertificateImage(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const result = await this.service.charityContributionCertificateImage(id, admin);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Security-Policy", "sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(result.svg);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("charity/projects")
  charityProjects(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.charityProjects(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("charity/projects")
  createCharityProject(@Body() dto: CharityProjectDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCharityProject(dto, undefined, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("charity/projects/:id")
  updateCharityProject(@Param("id", ParseIntPipe) id: number, @Body() dto: CharityProjectDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCharityProject(dto, id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("charity/projects/:id/actions")
  actionCharityProject(@Param("id", ParseIntPipe) id: number, @Body() dto: CharityProjectActionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.actionCharityProject(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("charity/projects/:id/review")
  reviewCharityProject(@Param("id", ParseIntPipe) id: number, @Body() dto: CharityProjectReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.reviewCharityProject(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("charity/projects/:id/disbursements")
  addCharityDisbursement(@Param("id", ParseIntPipe) id: number, @Body() dto: CharityDisbursementDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.addCharityDisbursement(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("charity/disbursements/:id/review")
  reviewCharityDisbursement(@Param("id", ParseIntPipe) id: number, @Body() dto: CharityDisbursementReviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.reviewCharityDisbursement(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("charity/disbursements/:id/pay")
  payCharityDisbursement(@Param("id", ParseIntPipe) id: number, @Body() dto: CharityDisbursementPayDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.payCharityDisbursement(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("charity/disbursements/:id/cancel")
  cancelCharityDisbursement(@Param("id", ParseIntPipe) id: number, @Body() dto: CharityDisbursementCancelDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.cancelCharityDisbursement(id, dto, admin);
  }

  @AdminRoles(...OVERVIEW_ROLES)
  @Get("charity/projects/:id/updates")
  charityProjectUpdates(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.charityProjectUpdates(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("charity/projects/:id/updates")
  createCharityProjectUpdate(@Param("id", ParseIntPipe) id: number, @Body() dto: CharityProjectUpdateDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCharityProjectUpdate(id, dto, undefined, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("charity/projects/:projectId/updates/:id")
  updateCharityProjectUpdate(@Param("projectId", ParseIntPipe) projectId: number, @Param("id", ParseIntPipe) id: number, @Body() dto: CharityProjectUpdateDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCharityProjectUpdate(projectId, dto, id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("settings/charity")
  charitySetting(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.charitySetting(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("settings/charity")
  saveCharitySetting(@Body() dto: CharitySettingDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCharitySetting(dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("aid-applications")
  aidApplications(@Query() query: AidApplicationQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.aid.adminList(query, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("aid-applications/:id")
  aidApplicationDetail(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.aid.adminDetail(id, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("aid-applications/:id/reveal")
  revealAidApplication(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.aid.revealSensitive(id, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("aid-applications/:id/actions")
  actionAidApplication(@Param("id", ParseIntPipe) id: number, @Body() dto: AidApplicationActionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.aid.adminAction(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("aid-application-materials/:id/download")
  async downloadAidApplicationMaterial(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const file = await this.aid.readMaterial(id, admin);
    res.setHeader("Content-Type", file.mimetype || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.send(file.buffer);
  }

  @AdminRoles(...AID_ROLES)
  @Get("ambassador/overview")
  ambassadorOverview(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorOverview(admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("ambassador/settings")
  ambassadorSetting(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorSetting(admin);
  }

  @AdminRoles(...AID_ROLES)
  @Patch("ambassador/settings")
  saveAmbassadorSetting(@Body() dto: AmbassadorSettingDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveAmbassadorSetting(dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("ambassador/cases")
  ambassadorCases(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorCasesList(admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("ambassador/cases")
  createAmbassadorCase(@Body() dto: AmbassadorCaseDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveAmbassadorCase(dto, undefined, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Patch("ambassador/cases/:id")
  updateAmbassadorCase(@Param("id", ParseIntPipe) id: number, @Body() dto: AmbassadorCaseDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveAmbassadorCase(dto, id, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("ambassador/applications")
  ambassadorApplications(@Query() query: AmbassadorApplicationQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorApplicationsList(query, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("ambassador/applications/export")
  async exportAmbassadorApplications(@Query() query: AmbassadorApplicationQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAmbassadorApplications(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=ambassador-applications.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...AID_ROLES)
  @Post("ambassador/applications/:id/reveal")
  revealAmbassadorApplicationContact(@Param("id", ParseIntPipe) id: number, @Body() dto: SupportSensitiveRevealDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.revealAmbassadorApplicationContact(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Patch("ambassador/applications/:id")
  updateAmbassadorApplication(@Param("id", ParseIntPipe) id: number, @Body() dto: AmbassadorApplicationStatusDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateAmbassadorApplication(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("ambassador/applications/:id/followups")
  ambassadorApplicationFollowups(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorApplicationFollowups(id, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("ambassador/applications/:id/followups")
  createAmbassadorApplicationFollowup(@Param("id", ParseIntPipe) id: number, @Body() dto: AmbassadorApplicationFollowupDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createAmbassadorApplicationFollowup(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("ambassador/profiles")
  ambassadorProfiles(@Query() query: AmbassadorProfileQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorProfilesList(query, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Patch("ambassador/profiles/:id")
  updateAmbassadorProfile(@Param("id", ParseIntPipe) id: number, @Body() dto: AmbassadorProfileStatusDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateAmbassadorProfile(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("ambassador/tasks")
  ambassadorTasks(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorTasksList(admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("ambassador/tasks")
  createAmbassadorTask(@Body() dto: AmbassadorTaskDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveAmbassadorTask(dto, undefined, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Patch("ambassador/tasks/:id")
  updateAmbassadorTask(@Param("id", ParseIntPipe) id: number, @Body() dto: AmbassadorTaskDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveAmbassadorTask(dto, id, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("ambassador/contributions")
  ambassadorContributions(@Query("profileId") profileId: string | undefined, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorContributionsList(profileId ? Number(profileId) : undefined, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("ambassador/contributions")
  createAmbassadorContribution(@Body() dto: AmbassadorContributionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createAmbassadorContribution(dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("ambassador/contributions/:id/actions")
  actionAmbassadorContribution(@Param("id", ParseIntPipe) id: number, @Body() dto: AmbassadorContributionActionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.actionAmbassadorContribution(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("partner/applications")
  partnerApplications(@Query() query: AmbassadorApplicationQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.partnerApplicationsList(query, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Patch("partner/applications/:id")
  updatePartnerApplication(@Param("id", ParseIntPipe) id: number, @Body() dto: AmbassadorApplicationStatusDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updatePartnerApplication(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("partner/applications/:id/followups")
  partnerApplicationFollowups(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.partnerApplicationFollowups(id, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("partner/applications/:id/followups")
  createPartnerApplicationFollowup(@Param("id", ParseIntPipe) id: number, @Body() dto: AmbassadorApplicationFollowupDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createPartnerApplicationFollowup(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("partner/applications/:id/reveal")
  revealPartnerApplicationContact(@Param("id", ParseIntPipe) id: number, @Body() dto: SupportSensitiveRevealDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.revealPartnerApplicationContact(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("partner/contracts")
  partnerContracts(@Query("applicationId") applicationId: string | undefined, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.partnerContractsList(applicationId ? Number(applicationId) : undefined, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("partner/contracts/:id/reveal")
  revealPartnerContract(@Param("id", ParseIntPipe) id: number, @Body() dto: SupportSensitiveRevealDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.revealPartnerContract(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Get("partner/export")
  async exportPartnerCrm(@Query() query: AmbassadorApplicationQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportPartnerCrm(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=partner-crm.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...AID_ROLES)
  @Post("partner/contracts")
  createPartnerContract(@Body() dto: PartnerContractDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.savePartnerContract(dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("partner/contracts/:id/actions")
  actionPartnerContract(@Param("id", ParseIntPipe) id: number, @Body() dto: PartnerContractActionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.actionPartnerContract(id, dto, admin);
  }

  @AdminRoles(...AID_ROLES)
  @Post("partner/applications/:id/convert")
  convertPartnerApplication(@Param("id", ParseIntPipe) id: number, @Body() dto: PartnerConversionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.convertPartnerApplication(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/overview")
  volunteerOverview(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.volunteerOverview(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/tasks")
  volunteerTasks(@Query() query: VolunteerTaskQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.volunteerTasks(query, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/profiles")
  volunteerProfiles(@Query() query: VolunteerProfileQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.volunteerProfilesList(query, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/profiles/export")
  async exportVolunteerProfiles(@Query() query: VolunteerProfileQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportVolunteerProfiles(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=volunteer-profiles.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("volunteer/profiles/:id")
  updateVolunteerProfile(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerProfileStatusDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateVolunteerProfile(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/profiles/:id/training-records")
  volunteerTrainingRecords(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.volunteerTrainingRecords(id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("volunteer/profiles/:id/training-records")
  createVolunteerTrainingRecord(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerTrainingRecordDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createVolunteerTrainingRecord(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("volunteer/training-records/:id")
  reviewVolunteerTrainingRecord(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerTrainingActionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.reviewVolunteerTrainingRecord(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/profiles/:id/badges")
  volunteerBadges(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.volunteerBadges(id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("volunteer/badges/:id")
  actionVolunteerBadge(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerBadgeActionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.actionVolunteerBadge(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/profiles/:id/proofs")
  volunteerProofs(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.volunteerProofs(id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("volunteer/profiles/:id/proofs")
  issueVolunteerProof(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerProofDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.issueVolunteerProof(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("volunteer/proofs/:id")
  actionVolunteerProof(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerProofActionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.actionVolunteerProof(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/profiles/:id/certificates")
  volunteerProfileCertificates(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.volunteerProfileCertificates(id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("volunteer/profiles/:id/certificates")
  issueVolunteerCertificate(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerCertificateDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.issueVolunteerCertificate(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("volunteer/certificates/:id/revoke")
  revokeVolunteerCertificate(@Param("id", ParseIntPipe) id: number, @Body() dto: { reason?: string }, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.revokeVolunteerCertificate(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/certificates/:id/download")
  async downloadVolunteerCertificate(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const result = await this.service.volunteerCertificateFile(id, admin);
    const encodedFilename = encodeURIComponent(result.filename).replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="certificate.svg"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Security-Policy", "sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(result.svg);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("volunteer/tasks")
  createVolunteerTask(@Body() dto: VolunteerTaskDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveVolunteerTask(dto, undefined, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("volunteer/tasks/:id")
  updateVolunteerTask(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerTaskDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveVolunteerTask(dto, id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/task-applications")
  volunteerTaskApplications(@Query("status") status?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.volunteerTaskApplications(status, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("volunteer/task-applications/:id")
  updateVolunteerTaskApplication(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerTaskApplicationStatusDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateVolunteerTaskApplication(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/task-applications/:id/attendance-token")
  volunteerAttendanceToken(@Param("id", ParseIntPipe) id: number, @Query("action") action: "check_in" | "check_out", @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.volunteerAttendanceToken(id, action, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("volunteer/task-applications/:id/attendance")
  recordVolunteerAttendance(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerAttendanceDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.recordVolunteerAttendance(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("volunteer/service-records")
  createVolunteerServiceRecord(@Body() dto: VolunteerServiceRecordDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createVolunteerServiceRecord(dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("volunteer/service-records/:id/action")
  actionVolunteerServiceRecord(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerServiceActionDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.actionVolunteerServiceRecord(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("volunteer/profiles/:id/hour-adjustments")
  adjustVolunteerHours(@Param("id", ParseIntPipe) id: number, @Body() dto: VolunteerHourAdjustmentDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adjustVolunteerHours(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/service-records")
  volunteerServiceRecords(@Query() query: VolunteerServiceRecordQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.volunteerServiceRecordsList(query, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("volunteer/service-records/export")
  async exportVolunteerServiceRecords(@Query() query: VolunteerServiceRecordQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportVolunteerServiceRecords(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=volunteer-service-records.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("mobile/bootstrap")
  mobileBootstrap(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.mobileBootstrap(admin);
  }

  @AdminRoles(...AGENT_VIEW_ROLES)
  @Get("payment-accounts/options")
  paymentAccountOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.paymentAccountOptions(admin);
  }

  @AdminRoles(...AGENT_VIEW_ROLES)
  @Get("agents")
  agents(@Query() query: PaymentAccountQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.listPaymentAccountAgents(query, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("agents")
  createAgent(@Body() dto: AgentDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.saveAgent(dto, undefined, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("agents/:id")
  updateAgent(@Param("id", ParseIntPipe) id: number, @Body() dto: AgentDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.saveAgent(dto, id, admin);
  }

  @AdminRoles(...PAYMENT_ACCOUNT_VIEW_ROLES)
  @Get("agent-payment-accounts")
  agentPaymentAccounts(@Query() query: PaymentAccountQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.listAgentPaymentAccounts(query, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("agent-payment-accounts")
  createAgentPaymentAccount(@Body() dto: AgentPaymentAccountDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.saveAgentPaymentAccount(dto, undefined, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("agent-payment-accounts/:id")
  updateAgentPaymentAccount(@Param("id", ParseIntPipe) id: number, @Body() dto: AgentPaymentAccountDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.saveAgentPaymentAccount(dto, id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("uploads/images")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, Boolean(IMAGE_EXTENSION_BY_MIME[file.mimetype]));
    }
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File, @CurrentAdmin() admin: { id: number; tenantId?: number | null }) {
    return this.service.uploadedImage(file, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("uploads/settlement-proofs")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, Boolean(SETTLEMENT_PROOF_EXTENSION_BY_MIME[file.mimetype]));
    }
  }))
  uploadSettlementProof(@UploadedFile() file: Express.Multer.File, @CurrentAdmin() admin: { id: number; tenantId?: number | null }) {
    return this.service.uploadedSettlementProof(file, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("uploads/private-settlement-proofs")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => callback(null, Boolean(SETTLEMENT_PROOF_EXTENSION_BY_MIME[file.mimetype]))
  }))
  uploadPrivateSettlementProof(@UploadedFile() file: Express.Multer.File, @CurrentAdmin() admin: { id: number; tenantId?: number | null }) {
    return this.service.uploadedPrivateSettlementProof(file, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("private-settlement-proofs/:token/download")
  downloadPrivateSettlementProof(@Param("token") token: string, @CurrentAdmin() admin: { id: number; tenantId?: number | null }, @Res() res: Response) {
    const file = this.service.readPrivateSettlementProof(token, admin);
    res.setHeader("Content-Type", file.mimetype);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(file.buffer);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("registration-attachments/:token/download")
  downloadRegistrationAttachment(@Param("token") token: string, @CurrentAdmin() admin: { id: number; tenantId?: number | null }, @Res() res: Response) {
    const file = this.service.readRegistrationAttachment(token, admin);
    res.setHeader("Content-Type", file.mimetype);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(file.buffer);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("admins")
  createAdmin(@Body() dto: CreateAdminDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.createAdmin(dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("admins/:id/password")
  updateAdminPassword(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateAdminPasswordDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.updateAdminPassword(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("admins/:id")
  updateAdmin(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateAdminDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateAdmin(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("admins/:id/status")
  updateAdminStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateAdminStatusDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.updateAdminStatus(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("admins/:id/force-logout")
  forceAdminLogout(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.forceAdminLogout(id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("admins/:id/copy-role")
  copyAdminRole(@Param("id", ParseIntPipe) id: number, @Body() dto: CopyAdminRoleDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.copyAdminRole(id, dto.sourceAdminId, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("admin-invitations")
  adminInvitations(@CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAdminInvitations(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("admin-invitations")
  createAdminInvitation(@Body() dto: CreateAdminInviteDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createAdminInvitation(dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("admin-invitations/:id/revoke")
  revokeAdminInvitation(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.revokeAdminInvitation(id, admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("categories")
  categories(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listCategories(true, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("announcements/options")
  announcementOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.announcementOptions(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("announcements")
  announcements(@Query() query: AnnouncementQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAnnouncements(admin, query);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("announcements")
  createAnnouncement(@Body() dto: AnnouncementDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createAnnouncement(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("announcements/:id")
  updateAnnouncement(@Param("id", ParseIntPipe) id: number, @Body() dto: AnnouncementDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateAnnouncement(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Delete("announcements/:id")
  deleteAnnouncement(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteAnnouncement(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("marketing-popups")
  marketingPopups(@Query() query: MarketingPopupQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listMarketingPopups(admin, query);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("marketing-popups/options")
  marketingPopupOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.marketingPopupOptions(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("marketing-popups/effective-check")
  marketingPopupEffectiveCheck(@Query() query: MarketingPopupEffectiveCheckQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.marketingPopupEffectiveCheck(admin, query);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("marketing-popups")
  createMarketingPopup(@Body() dto: MarketingPopupDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createMarketingPopup(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("marketing-popups/:id")
  updateMarketingPopup(@Param("id", ParseIntPipe) id: number, @Body() dto: MarketingPopupDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateMarketingPopup(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Delete("marketing-popups/:id")
  deleteMarketingPopup(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteMarketingPopup(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("ad-center/options")
  adCenterOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adCenterOptions(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("ad-advertisers")
  adAdvertisers(@Query() query: AdCenterQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAdAdvertisers(admin, query);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("ad-advertisers")
  createAdAdvertiser(@Body() dto: AdAdvertiserDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createAdAdvertiser(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("ad-advertisers/:id")
  updateAdAdvertiser(@Param("id", ParseIntPipe) id: number, @Body() dto: AdAdvertiserDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateAdAdvertiser(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Delete("ad-advertisers/:id")
  deleteAdAdvertiser(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteAdAdvertiser(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("ad-contracts")
  adContracts(@Query() query: AdCenterQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAdContracts(admin, query);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("ad-contracts")
  createAdContract(@Body() dto: AdContractDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createAdContract(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("ad-contracts/:id")
  updateAdContract(@Param("id", ParseIntPipe) id: number, @Body() dto: AdContractDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateAdContract(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Delete("ad-contracts/:id")
  deleteAdContract(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteAdContract(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("ad-campaigns/export")
  async exportAdCampaigns(@Query() query: AdCenterQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=ad-campaigns.xlsx");
    res.send(await this.service.exportAdCampaigns(admin, query));
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("ad-campaigns")
  adCampaigns(@Query() query: AdCenterQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAdCampaigns(admin, query);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("ad-campaigns/summary")
  adCampaignSummary(@Query() query: AdCenterQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adCampaignSummary(admin, query);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("ad-campaigns")
  createAdCampaign(@Body() dto: AdCampaignDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createAdCampaign(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("ad-campaigns/:id")
  updateAdCampaign(@Param("id", ParseIntPipe) id: number, @Body() dto: AdCampaignDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateAdCampaign(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Delete("ad-campaigns/:id")
  deleteAdCampaign(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteAdCampaign(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("ad-settlements/export")
  async exportAdSettlements(@Query() query: AdCenterQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=ad-settlements.xlsx");
    res.send(await this.service.exportAdSettlements(admin, query));
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("ad-settlements")
  adSettlements(@Query() query: AdCenterQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAdSettlements(admin, query);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("ad-settlements/generate")
  generateAdSettlement(@Body() dto: AdSettlementGenerateDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.generateAdSettlement(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("ad-settlements/:id/confirm")
  confirmAdSettlement(@Param("id", ParseIntPipe) id: number, @Body() dto: AdSettlementStatusDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateAdSettlementStatus(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("ad-official-revenue-imports")
  importAdOfficialRevenue(@Body() dto: AdOfficialRevenueImportDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.importAdOfficialRevenue(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("homepage/sections")
  homepageSections(@Query("tenantId") tenantId?: string, @Query("pageKey") pageKey?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listHomepageSections(admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("homepage/sections")
  createHomepageSection(@Body() dto: HomepageSectionDto, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createHomepageSection(dto, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("homepage/sections/:id")
  updateHomepageSection(@Param("id", ParseIntPipe) id: number, @Body() dto: HomepageSectionDto, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateHomepageSection(id, dto, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Delete("homepage/sections/:id")
  deleteHomepageSection(@Param("id", ParseIntPipe) id: number, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteHomepageSection(id, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Put("homepage/sections/reorder")
  reorderHomepageSections(@Body() dto: HomepageReorderDto, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.reorderHomepageSections(dto.items, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("homepage/sections/replace")
  replaceHomepageSections(@Body() dto: HomepageReplaceDto, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.replaceHomepageSections(dto.rows, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("homepage/sections/reset-default")
  resetHomepageSections(@Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.resetHomepageSections(admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("homepage/versions")
  homepageVersions(@Query("tenantId") tenantId?: string, @Query("pageKey") pageKey?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listHomepageDecorationVersions(admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("homepage/versions")
  createHomepageVersion(@Body() dto: HomepageDecorationVersionDto, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createHomepageDecorationVersion(dto, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("homepage/publication")
  homepagePublication(@Query("tenantId") tenantId?: string, @Query("pageKey") pageKey?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.homepagePublicationStatus(admin, tenantId ? Number(tenantId) : undefined, pageKey); }

  @AdminRoles(...OPERATION_ROLES)
  @Post("homepage/publish")
  publishHomepage(@Body() dto: HomepageDecorationVersionDto, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.publishHomepageDecoration(dto, admin, tenantId ? Number(tenantId) : undefined, pageKey); }

  @AdminRoles(...OPERATION_ROLES)
  @Post("homepage/versions/:id/restore")
  restoreHomepageVersion(@Param("id", ParseIntPipe) id: number, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.restoreHomepageDecorationVersion(id, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Delete("homepage/versions/:id")
  deleteHomepageVersion(@Param("id", ParseIntPipe) id: number, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteHomepageDecorationVersion(id, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("homepage/templates")
  homepageTemplates(@Query("tenantId") tenantId?: string, @Query("pageKey") pageKey?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listHomepageDecorationTemplates(admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("homepage/templates")
  createHomepageTemplate(@Body() dto: HomepageDecorationTemplateDto, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createHomepageDecorationTemplate(dto, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("homepage/templates/:id/apply")
  applyHomepageTemplate(@Param("id", ParseIntPipe) id: number, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.applyHomepageDecorationTemplate(id, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Delete("homepage/templates/:id")
  deleteHomepageTemplate(@Param("id", ParseIntPipe) id: number, @Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteHomepageDecorationTemplate(id, admin, tenantId ? Number(tenantId) : undefined, pageKey);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("categories")
  createCategory(@Body() dto: CategoryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createCategory(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("categories/:id")
  updateCategory(@Param("id", ParseIntPipe) id: number, @Body() dto: CategoryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateCategory(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("categories/:id/disable")
  removeCategory(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.removeCategory(id, admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("activities")
  activities(@Query() query: ActivityQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listActivities(query, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("activities/options")
  activityManagementOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; dataScope?: Record<string, unknown> }) {
    return this.service.activityManagementOptions(admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("activities/:id")
  activity(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.getActivity(id, admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("activities/:id/approval-logs")
  activityApprovalLogs(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listActivityApprovalLogs(id, admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("activities/:id/versions")
  activityVersions(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listActivityVersions(id, admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("activities/:id/publish-check")
  activityPublishCheck(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username?: string; role?: string; tenantId?: number | null }) {
    return this.service.activityPublishCheck(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities/:id/copy")
  copyActivity(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username?: string; role?: string; tenantId?: number | null }) {
    return this.service.copyActivity(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities/:id/versions/:versionId/restore")
  restoreActivityVersion(@Param("id", ParseIntPipe) id: number, @Param("versionId", ParseIntPipe) versionId: number, @CurrentAdmin() admin?: { id: number; username?: string; role?: string; tenantId?: number | null }) {
    return this.service.restoreActivityVersion(id, versionId, admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("activities/:id/channel-report")
  activityChannelReport(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.activityChannelReport(id, admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("activities/:id/channels")
  activityChannels(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listActivityChannels(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities/:id/channels")
  createActivityChannel(@Param("id", ParseIntPipe) id: number, @Body() dto: ActivityChannelDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createActivityChannel(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities")
  createActivity(@Body() dto: ActivityDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.saveActivity(dto, undefined, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Put("activities/:id")
  updateActivityByPut(@Param("id", ParseIntPipe) id: number, @Body() dto: ActivityDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.saveActivity(dto, id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("activities/:id")
  updateActivity(@Param("id", ParseIntPipe) id: number, @Body() dto: ActivityDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.saveActivity(dto, id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities/:id/close")
  closeActivity(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.deleteActivity(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities/:id/submit-approval")
  submitActivityApproval(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.submitActivityForApproval(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities/:id/withdraw-approval")
  withdrawActivityApproval(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.withdrawActivityApproval(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities/:id/reopen")
  reopenActivity(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.reopenActivity(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities/:id/cancel")
  cancelActivity(@Param("id", ParseIntPipe) id: number, @Body() body: { reason?: string }, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.cancelActivity(id, body.reason || "", admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities/:id/end")
  endActivity(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.endActivity(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("activities/:id/schedule-publish")
  scheduleActivityPublish(@Param("id", ParseIntPipe) id: number, @Body() body: { publishAt?: string }, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.scheduleActivityPublish(id, body.publishAt || "", admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("activities/lifecycle/run")
  runActivityLifecycle() {
    return this.service.runActivityLifecycle();
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("activities/:id/approve")
  approveActivity(@Param("id", ParseIntPipe) id: number, @Body() dto: ActivityApprovalDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.approveActivity(id, dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("activities/:id/reject")
  rejectActivity(@Param("id", ParseIntPipe) id: number, @Body() dto: ActivityApprovalDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.rejectActivity(id, dto, admin);
  }

  @AdminRoles(...REGISTRATION_VIEW_ROLES)
  @Get("registrations")
  registrations(@Query() query: RegistrationQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listRegistrations(query, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("registrations/:id/approve")
  approve(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.approveRegistration(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("registrations/:id/reject")
  reject(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.rejectRegistration(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("registrations/bulk-approve")
  bulkApprove(@Body() dto: BulkRegistrationReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.bulkReviewRegistrations("approve", dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("registrations/bulk-reject")
  bulkReject(@Body() dto: BulkRegistrationReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.bulkReviewRegistrations("reject", dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("registrations/bulk-notify")
  bulkNotify(@Body() dto: BulkRegistrationNotifyDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.bulkNotifyRegistrations(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("registrations/bulk-tag")
  bulkTag(@Body() dto: BulkRegistrationTagDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.bulkTagRegistrations(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("registrations/:id/cancel")
  cancel(@Param("id", ParseIntPipe) id: number, @Body() body: { reason?: string }, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.cancelRegistration(id, body.reason, admin);
  }

  @AdminRoles(...CHECK_IN_ROLES)
  @Post("registrations/:id/check-in")
  checkInRegistration(@Param("id", ParseIntPipe) id: number, @Body() body: { remark?: string }, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.checkInRegistration(id, admin, body.remark);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("registrations/export")
  async export(@Query() query: RegistrationQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportRegistrations(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=registrations.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("orders")
  orders(@Query() query: OrderQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listOrders(query, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("unified-orders")
  unifiedOrders(@Query() query: { businessType?: string; keyword?: string; status?: string; page?: string; pageSize?: string }, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.unifiedOrders({ ...query, page: query.page ? Number(query.page) : undefined, pageSize: query.pageSize ? Number(query.pageSize) : undefined }, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("unified-orders/export")
  async exportUnifiedOrders(@Query() query: { businessType?: string; keyword?: string; status?: string }, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportUnifiedOrders(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=unified-orders.xlsx");
    res.send(buffer);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("unified-orders/:businessType/:id")
  unifiedOrderDetail(@Param("businessType") businessType: string, @Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.unifiedOrderDetail(businessType, id, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("unified-funds")
  unifiedFunds(@Query() query: { sourceType?: string; keyword?: string; status?: string; direction?: string; page?: string; pageSize?: string }, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.unifiedFunds({ ...query, page: query.page ? Number(query.page) : undefined, pageSize: query.pageSize ? Number(query.pageSize) : undefined }, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("unified-funds/export")
  async exportUnifiedFunds(@Query() query: { sourceType?: string; keyword?: string; status?: string; direction?: string }, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportUnifiedFunds(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=unified-funds.xlsx");
    res.send(buffer);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("unified-funds/consistency")
  unifiedFundConsistency(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.unifiedFundConsistency(admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("ticket-types")
  ticketTypes(@Query("activityId") activityId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listTicketTypes(activityId ? Number(activityId) : undefined, admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("ticket-types/options")
  ticketTypeOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; dataScope?: Record<string, unknown> }) {
    return this.service.ticketTypeOptions(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("ticket-types")
  createTicketType(@Body() dto: TicketTypeDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveTicketType(dto, undefined, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("ticket-types/:id")
  updateTicketType(@Param("id", ParseIntPipe) id: number, @Body() dto: TicketTypeDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveTicketType(dto, id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("coupons")
  coupons(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listCoupons(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("coupons/options")
  couponOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; dataScope?: Record<string, unknown> }) {
    return this.service.couponOptions(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("coupon-claims")
  couponClaims(@Query() query: CouponRecordQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listCouponClaims(query, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("coupon-usages")
  couponUsages(@Query() query: CouponRecordQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listCouponUsages(query, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("coupons/export")
  async exportCoupons(@CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportCoupons(admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=activity-coupons.xlsx");
    res.send(buffer);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("coupons")
  createCoupon(@Body() dto: CouponDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCoupon(dto, undefined, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("coupons/:id")
  updateCoupon(@Param("id", ParseIntPipe) id: number, @Body() dto: CouponDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCoupon(dto, id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("redemption-codes")
  redemptionCodes(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.listRedemptionCodes(admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Get("redemption-codes/options")
  redemptionCodeOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.redemptionCodeOptions(admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Get("redemption-code-usages")
  redemptionCodeUsages(@Query() query: RedemptionCodeUsageQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.listRedemptionCodeUsages(query, admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Get("redemption-codes/export")
  async exportRedemptionCodes(@CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportRedemptionCodes(admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=redemption-codes.xlsx");
    res.send(buffer);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("redemption-codes")
  createRedemptionCode(@Body() body: RedemptionCodeDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.saveRedemptionCode(body, undefined, admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("redemption-codes/:id")
  updateRedemptionCode(@Param("id", ParseIntPipe) id: number, @Body() body: RedemptionCodeDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.saveRedemptionCode(body, id, admin); }

  @AdminRoles(...FINANCE_ROLES)
  @Get("orders/export")
  async exportOrders(@Query() query: OrderQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportOrders(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=orders.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/dashboard")
  financeDashboard(@Query() query: OrderQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.financeDashboard(query, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/risk-alerts")
  fundRiskAlerts(@Query() query: { status?: string; type?: string; tenantId?: string }, @CurrentAdmin() admin?: { username?: string; tenantId?: number | null }) {
    return this.fundRisks.list(query, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("finance/risk-alerts/scan")
  scanFundRiskAlerts(@CurrentAdmin() admin?: { username?: string; tenantId?: number | null }) {
    return this.fundRisks.scan(admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("finance/risk-alerts/:id/handle")
  handleFundRiskAlert(@Param("id", ParseIntPipe) id: number, @Body() dto: { action?: string; remark?: string }, @CurrentAdmin() admin?: { username?: string; tenantId?: number | null }) {
    return this.fundRisks.handle(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/transactions")
  paymentTransactions(@Query() query: OrderQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listPaymentTransactions(query, 200, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/wallets")
  wallets(@Query("keyword") keyword?: string, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listWallets(keyword, admin, tenantId ? Number(tenantId) : undefined);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/wallet-transactions")
  walletTransactions(@Query("userId") userId?: string, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listWalletTransactions(userId ? Number(userId) : undefined, admin, tenantId ? Number(tenantId) : undefined);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("users/:userId/wallet")
  async userWallet(@Param("userId", ParseIntPipe) userId: number, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeWalletResponse(await this.service.getUserWallet(userId, admin, tenantId ? Number(tenantId) : undefined));
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("users/:userId/wallet/adjust")
  async adjustUserWallet(@Param("userId", ParseIntPipe) userId: number, @Body() dto: WalletAdjustDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeWalletResponse(await this.service.adjustUserWallet(userId, dto, admin));
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/reconciliation")
  paymentReconciliation(@Query() query: OrderQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listPaymentReconciliation(query, 200, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/callback-logs")
  paymentCallbackLogs(@Query() query: OrderQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listPaymentCallbackLogs(query, 200, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("finance/reconciliation/scan")
  scanPaymentReconciliation() {
    return this.service.scanPaymentReconciliation();
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/statements")
  paymentStatements(@Query() query: OrderQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listPaymentStatements(query, 200, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("finance/statements/import")
  importPaymentStatements(@Body() dto: PaymentStatementImportDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.importPaymentStatements(dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("finance/statements/fetch")
  fetchPaymentStatements(@Body() dto: PaymentStatementFetchDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.fetchPaymentStatements(dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("finance/refunds/provider-scan")
  scanProviderRefunds(@CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.scanProviderRefunds(admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("finance/transactions/:id/resolve")
  async resolvePaymentTransaction(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id?: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeFinanceTransactionResponse(await this.service.resolvePaymentTransaction(id, dto, admin));
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/refunds")
  refunds(@Query() query: RefundQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return query.pageSize ? this.service.listRefundsPage(query, admin) : this.service.listRefunds(query, 200, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/export")
  async exportFinance(@Query() query: OrderQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportFinance(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=finance.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("agent-settlements")
  agentSettlements(@Query() query: AgentSettlementQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.listAgentSettlements(query, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("agent-settlements/options")
  agentSettlementOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.agentSettlementOptions(admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("agent-settlements/generate")
  generateAgentSettlement(@Body() dto: AgentSettlementGenerateDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.generateAgentSettlement(dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("agent-settlements/transfer-capability")
  agentSettlementTransferCapability(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.agentSettlementTransferCapability(admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("agent-settlements/:id/details")
  agentSettlementDetails(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.agentSettlementDetails(id, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("agent-settlements/:id/submit")
  submitAgentSettlement(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.submitAgentSettlement(id, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("agent-settlements/:id/approve")
  approveAgentSettlement(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.approveAgentSettlement(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("agent-settlements/:id/reject")
  rejectAgentSettlement(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.rejectAgentSettlement(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("agent-settlements/:id/mark-paid")
  markAgentSettlementPaid(@Param("id", ParseIntPipe) id: number, @Body() dto: AgentSettlementPayDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.markAgentSettlementPaid(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("agent-settlements/:id/sandbox-transfer")
  sandboxTransferAgentSettlement(@Param("id", ParseIntPipe) id: number, @Body() dto: AgentSettlementSandboxTransferDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.sandboxTransferAgentSettlement(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("agent-settlements/:id/real-transfer")
  realTransferAgentSettlement(@Param("id", ParseIntPipe) id: number, @Body() dto: AgentSettlementSandboxTransferDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.realTransferAgentSettlement(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("agent-settlement-transfers/scan")
  scanAgentSettlementTransfers(@CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.scanAgentSettlementTransfers(admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("agent-settlements/export")
  async exportAgentSettlements(@Query() query: AgentSettlementQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }, @Res() res: Response) {
    const buffer = await this.service.exportAgentSettlements(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=agent-settlements.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...FINANCE_ROLES)
  @Patch("orders/:id/remark")
  updateOrderRemark(@Param("id", ParseIntPipe) id: number, @Body() dto: OrderRemarkDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateOrderRemark(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("orders/:id/timeline")
  orderTimeline(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.orderTimeline(id, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("orders/:id/confirm-offline-payment")
  confirmPayment(@Param("id", ParseIntPipe) id: number, @Body() dto: ConfirmPaymentDto, @CurrentAdmin() admin: { id?: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.confirmOfflinePayment(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("settings/operation")
  operationSetting(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.getOperationSetting(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("settings/operation")
  saveOperationSetting(@Body() dto: OperationSettingDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveOperationSetting(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("settings/sms/test")
  testSmsSetting(@Body() dto: SmsTestDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.sendTestSms(dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("orders/close-expired")
  closeExpiredOrders(@Body() body: { now?: string }, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.closeExpiredPendingOrders(body.now ? new Date(body.now) : new Date(), admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("orders/:id/refund")
  async refundOrder(@Param("id", ParseIntPipe) id: number, @Body() dto: RefundDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeAuditValue(await this.service.refundOrder(id, dto, admin));
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("refunds/:id/approve")
  async approveRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeAuditValue(await this.service.approveRefund(id, dto, admin));
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("refunds/:id/reject")
  async rejectRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeAuditValue(await this.service.rejectRefund(id, dto, admin));
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("refunds/:id/retry")
  async retryRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return sanitizeAuditValue(await this.service.retryRefund(id, dto, admin));
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("settings/connectivity-check")
  connectivityCheck(@CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.checkConfigurationConnectivity(admin);
  }

  @AdminRoles(...CHECK_IN_ROLES)
  @Get("check-ins/overview")
  checkInOverview(@Query("activityId") activityId: string | undefined, @Query("keyword") keyword: string | undefined, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.checkInOverview({ activityId, keyword }, admin);
  }

  @AdminRoles(...CHECK_IN_ROLES)
  @Post("check-ins")
  checkIn(@Body() dto: CheckInDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.checkIn(dto.code, admin.id, dto.remark, admin, dto.expectedActivityId, dto.pointId);
  }

  @AdminRoles(...CHECK_IN_ROLES)
  @Get("check-in-points")
  checkInPoints(@Query("activityId") activityId: string | undefined, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; dataScope?: Record<string, unknown> }) {
    return this.service.listCheckInPoints(activityId ? Number(activityId) : undefined, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("check-in-points")
  createCheckInPoint(@Body() dto: { activityId?: number; name?: string; location?: string; enabled?: boolean }, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; dataScope?: Record<string, unknown> }) {
    return this.service.saveCheckInPoint(dto, undefined, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("check-in-points/:id")
  updateCheckInPoint(@Param("id", ParseIntPipe) id: number, @Body() dto: { activityId?: number; name?: string; location?: string; enabled?: boolean }, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; dataScope?: Record<string, unknown> }) {
    return this.service.saveCheckInPoint(dto, id, admin);
  }

  @AdminRoles(...CHECK_IN_ROLES)
  @Post("check-ins/:id/revoke")
  async revokeCheckIn(@Param("id", ParseIntPipe) id: number, @Body() dto: { reason?: string }, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null; dataScope?: Record<string, unknown> }) {
    return sanitizeFinanceTransactionResponse(await this.service.revokeCheckIn(id, dto.reason, admin));
  }

  @AdminRoles(...CHECK_IN_ROLES)
  @Post("check-ins/offline-manifest")
  offlineCheckInManifest(@Body() dto: { activityId?: number; pointId?: number; deviceId?: string }, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; dataScope?: Record<string, unknown> }) {
    return this.service.createOfflineCheckInManifest(dto, admin);
  }

  @AdminRoles(...CHECK_IN_ROLES)
  @Post("check-ins/offline-sync")
  syncOfflineCheckIns(@Body() dto: { deviceId?: string; items?: Array<{ localId?: string; code?: string; scannedAt?: string; pointId?: number }> }, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null; dataScope?: Record<string, unknown> }) {
    return this.service.syncOfflineCheckIns(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("waitlists/options")
  waitlistOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.waitlistOptions(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("waitlists")
  waitlists(@Query() query: WaitlistQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.listWaitlists(query, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("waitlists/:id/promote")
  promoteWaitlist(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.promoteWaitlist(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("waitlists/:id/cancel")
  cancelWaitlist(@Param("id", ParseIntPipe) id: number, @Body() body: WaitlistCancelDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.cancelWaitlist(id, body.remark, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("tags/options")
  tagOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.userTagOptions(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("tags")
  tags(@Query() query: UserTagQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.listUserTagsPage(query, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("member-segments")
  memberSegments(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) { return this.service.listMemberSegments(admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Post("member-segments")
  createMemberSegment(@Body() body: MemberSegmentSaveDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.saveMemberSegment(body, undefined, admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("member-segments/:id")
  updateMemberSegment(@Param("id", ParseIntPipe) id: number, @Body() body: MemberSegmentSaveDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.saveMemberSegment(body, id, admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Post("member-segments/preview")
  previewMemberSegment(@Body() body: MemberSegmentPreviewDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) { return this.service.previewMemberSegment(body.rules, admin, body.page || 1, body.pageSize || 20); }

  @AdminRoles(...OPERATION_ROLES)
  @Post("member-segments/:id/snapshots")
  createMemberSegmentSnapshot(@Param("id", ParseIntPipe) id: number, @Body() body: MemberSegmentSnapshotCreateDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.createMemberSegmentSnapshot(id, body.idempotencyKey, admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Get("member-segments/:id/snapshots")
  memberSegmentSnapshots(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) { return this.service.listMemberSegmentSnapshots(id, admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Get("member-segment-snapshots/:id/members")
  memberSegmentSnapshotMembers(@Param("id", ParseIntPipe) id: number, @Query("page") page?: string, @Query("pageSize") pageSize?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) { return this.service.memberSegmentSnapshotMembers(id, admin, Number(page || 1), Number(pageSize || 20)); }

  @AdminRoles(...OPERATION_ROLES)
  @Post("tags/refresh-behavior")
  refreshBehaviorTags(@Body() body: MemberBehaviorTagRefreshDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) { return this.service.refreshBehaviorTags(body.idempotencyKey, admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Get("tags/behavior-runs")
  behaviorTagRuns(@Query() query: MemberBehaviorTagRunQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) { return this.service.listBehaviorTagRuns(query, admin); }

  @AdminRoles(...OPERATION_ROLES)
  @Get("members/options")
  memberOptions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.memberOptions(admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("members")
  members(@Query() query: MemberQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.listMembers(query, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("members")
  createMember(@Body() dto: CreateMemberDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.createMember(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("members/export")
  async exportMembers(@Query() query: MemberQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }, @Res() res: Response) {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=members.xlsx");
    res.send(await this.service.exportMembers(query, admin));
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("members/:userId")
  member(@Param("userId", ParseIntPipe) userId: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.memberDetail(userId, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("members/:userId/points/adjust")
  adjustMemberPoints(@Param("userId", ParseIntPipe) userId: number, @Body() dto: MemberPointAdjustDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.adjustMemberPoints(userId, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("members/:userId/level")
  adjustMemberLevel(@Param("userId", ParseIntPipe) userId: number, @Body() dto: MemberLevelAdjustDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.adjustMemberLevel(userId, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("members/lifecycle-scan")
  memberLifecycleScan(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.runMemberLifecycle(new Date(), admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("members/:userId")
  updateMember(@Param("userId", ParseIntPipe) userId: number, @Body() dto: UpdateMemberDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.updateMember(userId, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("members/:userId/password")
  resetMemberPassword(@Param("userId", ParseIntPipe) userId: number, @Body() dto: ResetMemberPasswordDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown> }) {
    return this.service.resetMemberPassword(userId, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("member-levels")
  memberLevels(@Query("tenantId") tenantId: string | undefined, @Query("allScopes") allScopes: string | undefined, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.listMemberLevels(true, admin, tenantId ? Number(tenantId) : undefined, allScopes === "true");
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("member-levels")
  createMemberLevel(@Body() dto: MemberLevelDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.saveMemberLevel(dto, undefined, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("member-levels/:id")
  updateMemberLevel(@Param("id", ParseIntPipe) id: number, @Body() dto: MemberLevelDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.saveMemberLevel(dto, id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("member-point-rules")
  memberPointRules(@Query("tenantId") tenantId: string | undefined, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.listMemberPointRules(admin, tenantId ? Number(tenantId) : undefined);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("member-point-rules/:id")
  updateMemberPointRule(@Param("id", ParseIntPipe) id: number, @Body() dto: MemberPointRuleDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] }) {
    return this.service.updateMemberPointRule(id, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("tags")
  createTag(@Body() body: UserTagDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createUserTag(body, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("tags/bulk-activity")
  bulkActivityTag(@Body() body: BulkActivityTagDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createActivityUserTags(body, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("tags/bulk-members")
  bulkMembersTag(@Body() body: { userIds?: number[]; name?: string; color?: string; remark?: string }, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.bulkTagMembers(body, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("tags/:id/delete")
  deleteTag(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteUserTag(id, admin);
  }
}

