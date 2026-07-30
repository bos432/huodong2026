import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { CurrentAdmin } from "../admin/current-admin.decorator";
import { AdminRole, AdminRoles } from "../admin/admin-roles";
import {
  NotificationTemplateInput,
  NotificationScheduleInput,
  PreviewNotificationInput,
  RecapVersionInput,
  ReviewModerationInput,
  SendActivityReminderInput,
  SendNotificationInput,
  SendTaggedNotificationInput,
  V1Service
} from "./v1.service";

type ReviewAdminContext = { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[]; dataScope?: Record<string, unknown>; clientIp?: string | null; userAgent?: string | null; requestId?: string | null };
type NotificationAdminContext = ReviewAdminContext;
type AnalyticsAdminContext = ReviewAdminContext;

@AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator)
@Controller("admin")
export class AdminV1Controller {
  constructor(private readonly service: V1Service) {}

  @Get("dashboard")
  dashboard(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.dashboard(admin);
  }

  @Get("activities/:id/funnel")
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  activityFunnel(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: AnalyticsAdminContext) {
    return this.service.activityFunnel(id, admin);
  }

  @Get("analytics/activity-options")
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  analyticsActivityOptions(@CurrentAdmin() admin?: AnalyticsAdminContext) {
    return this.service.analyticsActivityOptions(admin);
  }

  @Get("activities/:id/recap")
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  activityRecap(@Param("id", ParseIntPipe) id: number, @Query("version") version?: string, @CurrentAdmin() admin?: AnalyticsAdminContext) {
    return this.service.activityRecap(id, admin, version ? Number(version) : undefined);
  }

  @Get("activities/:id/recap/versions")
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  activityRecapVersions(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: AnalyticsAdminContext) {
    return this.service.listActivityRecapVersions(id, admin);
  }

  @Post("activities/:id/recap/versions")
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  createActivityRecapVersion(@Param("id", ParseIntPipe) id: number, @Body() body: RecapVersionInput, @CurrentAdmin() admin?: AnalyticsAdminContext) {
    return this.service.createActivityRecapVersion(id, body, admin);
  }

  @Get("activities/:id/recap/export")
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  async exportActivityRecap(@Param("id", ParseIntPipe) id: number, @Query("version") version: string | undefined, @CurrentAdmin() admin: AnalyticsAdminContext, @Res() res: Response) {
    const buffer = await this.service.exportActivityRecap(id, admin, version ? Number(version) : undefined);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=activity-recap-${id}.xlsx`);
    res.end(Buffer.from(buffer));
  }

  @Get("reviews/options")
  reviewOptions(@CurrentAdmin() admin?: ReviewAdminContext) {
    return this.service.reviewOptions(admin);
  }

  @Get("reviews")
  reviews(@Query("status") status?: string, @Query("activityId") activityId?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string, @CurrentAdmin() admin?: ReviewAdminContext) {
    return this.service.adminReviews({ status, activityId: activityId ? Number(activityId) : undefined, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined }, admin);
  }

  @Patch("reviews/:id")
  moderateReview(@Param("id", ParseIntPipe) id: number, @Body() body: ReviewModerationInput, @CurrentAdmin() admin?: ReviewAdminContext) {
    return this.service.moderateReview(id, body, admin);
  }

  @Get("review-reports")
  reviewReports(@Query("status") status?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string, @CurrentAdmin() admin?: ReviewAdminContext) {
    return this.service.reviewReports({ status, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined }, admin);
  }

  @Patch("review-reports/:id")
  handleReviewReport(@Param("id", ParseIntPipe) id: number, @Body() body: { status: string; resolution?: string; hideReview?: boolean }, @CurrentAdmin() admin?: ReviewAdminContext) {
    return this.service.handleReviewReport(id, body, admin);
  }

  @Get("notification-templates")
  notificationTemplates(@Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.listNotificationTemplates(this.notificationAdminForTenant(admin, tenantId));
  }

  @Get("notifications/options")
  notificationOptions(@Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.notificationOptions(this.notificationAdminForTenant(admin, tenantId));
  }

  @Post("notification-templates")
  createNotificationTemplate(@Body() body: NotificationTemplateInput, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.saveNotificationTemplate(body, undefined, this.notificationAdminForTenant(admin, tenantId));
  }

  @Patch("notification-templates/:id")
  updateNotificationTemplate(@Param("id", ParseIntPipe) id: number, @Body() body: NotificationTemplateInput, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.saveNotificationTemplate(body, id, this.notificationAdminForTenant(admin, tenantId));
  }

  @Get("notification-templates/:id/versions")
  notificationTemplateVersions(@Param("id", ParseIntPipe) id: number, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.notificationTemplateVersions(id, this.notificationAdminForTenant(admin, tenantId));
  }

  @Post("notification-templates/:id/test")
  testNotificationTemplate(@Param("id", ParseIntPipe) id: number, @Body() body: { userId: number }, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.testNotificationTemplate(id, Number(body.userId), this.notificationAdminForTenant(admin, tenantId));
  }

  @Get("notifications")
  notifications(@Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("status") status?: string, @Query("channel") channel?: string, @Query("scene") scene?: string, @Query("keyword") keyword?: string, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.listNotifications({ page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined, status, channel, scene, keyword }, this.notificationAdminForTenant(admin, tenantId));
  }

  @Get("notifications/monitor")
  notificationMonitor(@Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.notificationMonitor(this.notificationAdminForTenant(admin, tenantId));
  }

  @Get("notification-providers")
  notificationProviders(@Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.notificationProviderStatus(this.notificationAdminForTenant(admin, tenantId));
  }

  @Get("notification-preferences")
  notificationPreferences(@Query("userId") userId?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) { return this.service.listNotificationPreferences({ userId: userId ? Number(userId) : undefined, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined }, this.notificationAdminForTenant(admin, tenantId)); }

  @Patch("notification-preferences/:userId")
  saveNotificationPreference(@Param("userId", ParseIntPipe) userId: number, @Body() body: { channel?: string; subscribed?: boolean; reason?: string }, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) { return this.service.saveNotificationPreference(userId, body, this.notificationAdminForTenant(admin, tenantId)); }

  @Get("notification-schedules")
  notificationSchedules(@Query("activityId") activityId?: string, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.listNotificationSchedules(activityId ? Number(activityId) : undefined, this.notificationAdminForTenant(admin, tenantId));
  }

  @Post("notification-schedules")
  createNotificationSchedule(@Body() body: NotificationScheduleInput, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.saveNotificationSchedule(body, undefined, this.notificationAdminForTenant(admin, tenantId));
  }

  @Patch("notification-schedules/:id")
  updateNotificationSchedule(@Param("id", ParseIntPipe) id: number, @Body() body: NotificationScheduleInput, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.saveNotificationSchedule(body, id, this.notificationAdminForTenant(admin, tenantId));
  }

  @Post("notification-schedules/run-due")
  runDueNotificationSchedules(@Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.runDueNotificationSchedules(new Date(), this.notificationAdminForTenant(admin, tenantId));
  }

  @Post("notifications/send")
  sendNotification(@Body() body: SendNotificationInput, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.sendNotification(body, this.notificationAdminForTenant(admin, tenantId));
  }

  @Post("notifications/send-by-tag")
  sendTaggedNotification(@Body() body: SendTaggedNotificationInput, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.sendTaggedNotification(body, this.notificationAdminForTenant(admin, tenantId));
  }

  @Post("notifications/preview")
  previewNotification(@Body() body: PreviewNotificationInput, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.previewNotification(body, this.notificationAdminForTenant(admin, tenantId));
  }

  @Post("notifications/:id/retry")
  retryNotification(@Param("id", ParseIntPipe) id: number, @Query("tenantId") tenantId?: string, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.retryNotification(id, this.notificationAdminForTenant(admin, tenantId));
  }

  private notificationAdminForTenant(admin?: NotificationAdminContext, tenantId?: string): NotificationAdminContext | undefined {
    if (tenantId === undefined || tenantId === "") return admin;
    const selectedTenantId = Number(tenantId);
    if (!Number.isInteger(selectedTenantId) || selectedTenantId < 1) throw new BadRequestException("商家范围不正确");
    if (admin?.tenantId && Number(admin.tenantId) !== selectedTenantId) throw new ForbiddenException("无权访问所选商家通知数据");
    if (admin?.tenantId) return admin;
    if (admin?.role !== AdminRole.SuperAdmin && admin?.role !== "admin") throw new ForbiddenException("仅平台超级管理员可切换商家通知范围");
    return { ...admin, tenantId: selectedTenantId };
  }

  @Post("activities/:id/reminders/send")
  sendActivityReminder(@Param("id", ParseIntPipe) id: number, @Body() body: SendActivityReminderInput, @CurrentAdmin() admin?: NotificationAdminContext) {
    return this.service.sendActivityReminder(id, body, admin);
  }
}
