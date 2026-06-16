import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { CurrentAdmin } from "../admin/current-admin.decorator";
import { AdminRole, AdminRoles } from "../admin/admin-roles";
import {
  AnnouncementInput,
  NotificationTemplateInput,
  NotificationScheduleInput,
  PreviewNotificationInput,
  ReviewModerationInput,
  SendActivityReminderInput,
  SendNotificationInput,
  V1Service
} from "./v1.service";

@AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator)
@Controller("admin")
export class AdminV1Controller {
  constructor(private readonly service: V1Service) {}

  @Get("dashboard")
  dashboard(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.dashboard(admin);
  }

  @Get("activities/:id/funnel")
  activityFunnel(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.activityFunnel(id, admin);
  }

  @Get("activities/:id/recap")
  activityRecap(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.activityRecap(id, admin);
  }

  @Get("activities/:id/recap/export")
  async exportActivityRecap(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: { id: number; username: string; role?: string; tenantId?: number | null }, @Res() res: Response) {
    const buffer = await this.service.exportActivityRecap(id, admin);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=activity-recap-${id}.xlsx`);
    res.end(Buffer.from(buffer));
  }

  @Get("announcements")
  announcements(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminAnnouncements(admin);
  }

  @Post("announcements")
  createAnnouncement(@Body() body: AnnouncementInput, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveAnnouncement(body, undefined, admin);
  }

  @Patch("announcements/:id")
  updateAnnouncement(@Param("id", ParseIntPipe) id: number, @Body() body: AnnouncementInput, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveAnnouncement(body, id, admin);
  }

  @Get("reviews")
  reviews(@Query("status") status?: string, @Query("activityId") activityId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.adminReviews(status, activityId ? Number(activityId) : undefined, admin);
  }

  @Patch("reviews/:id")
  moderateReview(@Param("id", ParseIntPipe) id: number, @Body() body: ReviewModerationInput, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.moderateReview(id, body, admin);
  }

  @Get("notification-templates")
  notificationTemplates(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listNotificationTemplates(admin);
  }

  @Post("notification-templates")
  createNotificationTemplate(@Body() body: NotificationTemplateInput, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveNotificationTemplate(body, undefined, admin);
  }

  @Patch("notification-templates/:id")
  updateNotificationTemplate(@Param("id", ParseIntPipe) id: number, @Body() body: NotificationTemplateInput, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveNotificationTemplate(body, id, admin);
  }

  @Get("notifications")
  notifications(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listNotifications(admin);
  }

  @Get("notification-providers")
  notificationProviders(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.notificationProviderStatus(admin);
  }

  @Get("notification-schedules")
  notificationSchedules(@Query("activityId") activityId?: string, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.listNotificationSchedules(activityId ? Number(activityId) : undefined, admin);
  }

  @Post("notification-schedules")
  createNotificationSchedule(@Body() body: NotificationScheduleInput, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveNotificationSchedule(body, undefined, admin);
  }

  @Patch("notification-schedules/:id")
  updateNotificationSchedule(@Param("id", ParseIntPipe) id: number, @Body() body: NotificationScheduleInput, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.saveNotificationSchedule(body, id, admin);
  }

  @Post("notification-schedules/run-due")
  runDueNotificationSchedules(@CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.runDueNotificationSchedules(new Date(), admin);
  }

  @Post("notifications/send")
  sendNotification(@Body() body: SendNotificationInput, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.sendNotification(body, admin);
  }

  @Post("notifications/preview")
  previewNotification(@Body() body: PreviewNotificationInput, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.previewNotification(body, admin);
  }

  @Post("notifications/:id/retry")
  retryNotification(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.retryNotification(id, admin);
  }

  @Post("activities/:id/reminders/send")
  sendActivityReminder(@Param("id", ParseIntPipe) id: number, @Body() body: SendActivityReminderInput, @CurrentAdmin() admin?: { id: number; username: string; role?: string; tenantId?: number | null }) {
    return this.service.sendActivityReminder(id, body, admin);
  }
}
