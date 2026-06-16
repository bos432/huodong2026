import { Body, Controller, Delete, Get, Header, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { diskStorage } from "multer";
import { join } from "path";
import { AdminService } from "./admin.service";
import { AdminRole, AdminRoles } from "./admin-roles";
import { CurrentAdmin } from "./current-admin.decorator";
import { ActivityApprovalDto, ActivityChannelDto, ActivityDto, ActivityQueryDto, AdminQueryDto, AgentDto, AgentPaymentAccountDto, AgentSettlementGenerateDto, AgentSettlementPayDto, AgentSettlementQueryDto, AgentSettlementSandboxTransferDto, AmbassadorApplicationQueryDto, AmbassadorApplicationStatusDto, AmbassadorCaseDto, AmbassadorSettingDto, AnalyticsQueryDto, AnnouncementDto, BulkActivityTagDto, CategoryDto, ChangeOwnPasswordDto, CharityDisbursementDto, CharityProjectDto, CharitySettingDto, CheckInDto, ConfirmPaymentDto, CouponDto, CreateAdminDto, CreateMemberDto, HomepageReorderDto, HomepageSectionDto, LoginDto, MemberLevelDto, OperationSettingDto, OrderQueryDto, OrderRemarkDto, PaymentStatementFetchDto, PaymentStatementImportDto, RefundDto, RegistrationQueryDto, ResetMemberPasswordDto, ReviewDto, TenantDto, TenantPermissionDto, TenantProfileDto, TicketTypeDto, UpdateAdminDto, UpdateAdminPasswordDto, UpdateAdminStatusDto, UpdateMemberDto, UserTagDto, WalletAdjustDto } from "./dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

const SUPER_ADMIN = [AdminRole.SuperAdmin];
const OVERVIEW_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance];
const OPERATION_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator];
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
  constructor(private readonly service: AdminService) {}

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

  @AdminRoles(...SUPER_ADMIN)
  @Get("operation-logs")
  operationLogs(@Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listOperationLogs(admin, tenantId ? Number(tenantId) : undefined);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("auth/login-logs")
  loginLogs(@Query("username") username?: string, @Query("status") status?: string, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAdminLoginLogs({ username, status, tenantId: tenantId ? Number(tenantId) : undefined }, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("auth/h5-code-logs")
  h5CodeLogs(@Query("phone") phone?: string, @Query("status") status?: string, @Query("mode") mode?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listH5AuthCodeLogs({ phone, status, mode }, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("system/config-check")
  configCheck(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.configCheck(admin);
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
  @Get("charity/summary")
  charitySummary(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.charitySummary(admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("charity/transactions")
  charityTransactions(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.charityTransactions(admin);
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

  @AdminRoles(...FINANCE_ROLES)
  @Post("charity/projects/:id/disbursements")
  addCharityDisbursement(@Param("id", ParseIntPipe) id: number, @Body() dto: CharityDisbursementDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.addCharityDisbursement(id, dto, admin);
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

  @AdminRoles(...SUPER_ADMIN)
  @Get("ambassador/settings")
  ambassadorSetting(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorSetting(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("ambassador/settings")
  saveAmbassadorSetting(@Body() dto: AmbassadorSettingDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveAmbassadorSetting(dto, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("ambassador/cases")
  ambassadorCases(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorCasesList(admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Post("ambassador/cases")
  createAmbassadorCase(@Body() dto: AmbassadorCaseDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveAmbassadorCase(dto, undefined, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("ambassador/cases/:id")
  updateAmbassadorCase(@Param("id", ParseIntPipe) id: number, @Body() dto: AmbassadorCaseDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveAmbassadorCase(dto, id, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("ambassador/applications")
  ambassadorApplications(@Query() query: AmbassadorApplicationQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.ambassadorApplicationsList(query, admin);
  }

  @AdminRoles(...SUPER_ADMIN)
  @Get("ambassador/applications/export")
  async exportAmbassadorApplications(@Query() query: AmbassadorApplicationQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportAmbassadorApplications(query, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=ambassador-applications.xlsx");
    res.end(Buffer.from(buffer));
  }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("ambassador/applications/:id")
  updateAmbassadorApplication(@Param("id", ParseIntPipe) id: number, @Body() dto: AmbassadorApplicationStatusDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateAmbassadorApplication(id, dto, admin);
  }

  @AdminRoles(...ACTIVITY_VIEW_ROLES)
  @Get("mobile/bootstrap")
  mobileBootstrap(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.mobileBootstrap(admin);
  }

  @AdminRoles(...AGENT_VIEW_ROLES)
  @Get("agents")
  agents(@Query("includeDisabled") includeDisabled?: string, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAgents(includeDisabled === "true", admin, tenantId ? Number(tenantId) : undefined);
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
  agentPaymentAccounts(@Query("agentId") agentId?: string, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAgentPaymentAccounts(agentId ? Number(agentId) : undefined, admin, tenantId ? Number(tenantId) : undefined);
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
    storage: diskStorage({
      destination: join(process.cwd(), process.env.UPLOAD_DIR || "uploads", "images"),
      filename: (_req, file, callback) => {
        const suffix = IMAGE_EXTENSION_BY_MIME[file.mimetype] || ".jpg";
        callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${suffix}`);
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, Boolean(IMAGE_EXTENSION_BY_MIME[file.mimetype]));
    }
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.service.uploadedImage(file);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("uploads/settlement-proofs")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: join(process.cwd(), process.env.UPLOAD_DIR || "uploads", "settlement-proofs"),
      filename: (_req, file, callback) => {
        const suffix = SETTLEMENT_PROOF_EXTENSION_BY_MIME[file.mimetype] || ".bin";
        callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${suffix}`);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, Boolean(SETTLEMENT_PROOF_EXTENSION_BY_MIME[file.mimetype]));
    }
  }))
  uploadSettlementProof(@UploadedFile() file: Express.Multer.File) {
    return this.service.uploadedSettlementProof(file);
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

  @AdminRoles(...OPERATION_ROLES)
  @Get("categories")
  categories(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listCategories(true, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("announcements")
  announcements(@Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAnnouncements(admin, tenantId ? Number(tenantId) : undefined);
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
  @Post("homepage/sections/reset-default")
  resetHomepageSections(@Query("tenantId") tenantId: string | undefined, @Query("pageKey") pageKey: string | undefined, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.resetHomepageSections(admin, tenantId ? Number(tenantId) : undefined, pageKey);
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
  @Post("registrations/:id/cancel")
  cancel(@Param("id", ParseIntPipe) id: number, @Body() body: { reason?: string }, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.cancelRegistration(id, body.reason, admin);
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

  @AdminRoles(...OPERATION_ROLES)
  @Get("ticket-types")
  ticketTypes(@Query("activityId") activityId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listTicketTypes(activityId ? Number(activityId) : undefined, admin);
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
  @Post("coupons")
  createCoupon(@Body() dto: CouponDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCoupon(dto, undefined, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("coupons/:id")
  updateCoupon(@Param("id", ParseIntPipe) id: number, @Body() dto: CouponDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveCoupon(dto, id, admin);
  }

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
  @Get("finance/transactions")
  paymentTransactions(@Query() query: OrderQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listPaymentTransactions(query, 200, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/wallets")
  wallets(@Query("keyword") keyword?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listWallets(keyword, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/wallet-transactions")
  walletTransactions(@Query("userId") userId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listWalletTransactions(userId ? Number(userId) : undefined, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("users/:userId/wallet")
  userWallet(@Param("userId", ParseIntPipe) userId: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.getUserWallet(userId, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("users/:userId/wallet/adjust")
  adjustUserWallet(@Param("userId", ParseIntPipe) userId: number, @Body() dto: WalletAdjustDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adjustUserWallet(userId, dto, admin);
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
  resolvePaymentTransaction(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id?: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.resolvePaymentTransaction(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("finance/refunds")
  refunds(@Query() query: OrderQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listRefunds(query, 200, admin);
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
  agentSettlements(@Query() query: AgentSettlementQueryDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listAgentSettlements(query, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("agent-settlements/generate")
  generateAgentSettlement(@Body() dto: AgentSettlementGenerateDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.generateAgentSettlement(dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Get("agent-settlements/transfer-capability")
  agentSettlementTransferCapability(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
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
  async exportAgentSettlements(@Query() query: AgentSettlementQueryDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
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

  @AdminRoles(...FINANCE_ROLES)
  @Post("orders/close-expired")
  closeExpiredOrders(@Body() body: { now?: string }, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.closeExpiredPendingOrders(body.now ? new Date(body.now) : new Date(), admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("orders/:id/refund")
  refundOrder(@Param("id", ParseIntPipe) id: number, @Body() dto: RefundDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.refundOrder(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("refunds/:id/approve")
  approveRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.approveRefund(id, dto, admin);
  }

  @AdminRoles(...FINANCE_ROLES)
  @Post("refunds/:id/reject")
  rejectRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: ReviewDto, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.rejectRefund(id, dto, admin);
  }

  @AdminRoles(...CHECK_IN_ROLES)
  @Post("check-ins")
  checkIn(@Body() dto: CheckInDto, @CurrentAdmin() admin: { id: number; username: string }) {
    return this.service.checkIn(dto.code, admin.id, dto.remark, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("waitlists")
  waitlists(@Query("activityId") activityId?: string, @Query("status") status?: any, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listWaitlists(activityId ? Number(activityId) : undefined, status, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("waitlists/:id/promote")
  promoteWaitlist(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.promoteWaitlist(id, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("waitlists/:id/cancel")
  cancelWaitlist(@Param("id", ParseIntPipe) id: number, @Body() body: { remark?: string }, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.cancelWaitlist(id, body.remark, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("tags")
  tags(@Query("userId") userId?: string, @Query("activityId") activityId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listUserTags({ userId: userId ? Number(userId) : undefined, activityId: activityId ? Number(activityId) : undefined }, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("members")
  members(@Query("keyword") keyword?: string, @Query("activityId") activityId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listMembers({ keyword, activityId: activityId ? Number(activityId) : undefined }, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("members")
  createMember(@Body() dto: CreateMemberDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.createMember(dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("members/:userId")
  member(@Param("userId", ParseIntPipe) userId: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.memberDetail(userId, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("members/:userId")
  updateMember(@Param("userId", ParseIntPipe) userId: number, @Body() dto: UpdateMemberDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.updateMember(userId, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("members/:userId/password")
  resetMemberPassword(@Param("userId", ParseIntPipe) userId: number, @Body() dto: ResetMemberPasswordDto, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.resetMemberPassword(userId, dto, admin);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Get("member-levels")
  memberLevels() {
    return this.service.listMemberLevels(true);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Post("member-levels")
  createMemberLevel(@Body() dto: MemberLevelDto) {
    return this.service.saveMemberLevel(dto);
  }

  @AdminRoles(...OPERATION_ROLES)
  @Patch("member-levels/:id")
  updateMemberLevel(@Param("id", ParseIntPipe) id: number, @Body() dto: MemberLevelDto) {
    return this.service.saveMemberLevel(dto, id);
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
  @Post("tags/:id/delete")
  deleteTag(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.deleteUserTag(id, admin);
  }
}

