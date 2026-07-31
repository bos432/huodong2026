import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivityHost } from "../../entities/activity-host.entity";
import { ActivityChannel } from "../../entities/activity-channel.entity";
import { ActivityReview } from "../../entities/activity-review.entity";
import { ActivityReviewReport } from "../../entities/activity-review-report.entity";
import { ActivitySpaceAnnouncement } from "../../entities/activity-space-announcement.entity";
import { ActivitySpacePost } from "../../entities/activity-space-post.entity";
import { ActivitySpacePostReport } from "../../entities/activity-space-post-report.entity";
import { ActivityRecapVersion } from "../../entities/activity-recap-version.entity";
import { ActivitySection } from "../../entities/activity-section.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
import { Activity } from "../../entities/activity.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { Announcement } from "../../entities/announcement.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { InviteCode } from "../../entities/invite-code.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { NotificationTemplate } from "../../entities/notification-template.entity";
import { Notification } from "../../entities/notification.entity";
import { NotificationSchedule } from "../../entities/notification-schedule.entity";
import { NotificationPreference } from "../../entities/notification-preference.entity";
import { WechatSubscriptionGrant } from "../../entities/wechat-subscription-grant.entity";
import { Order } from "../../entities/order.entity";
import { Refund } from "../../entities/refund.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Registration } from "../../entities/registration.entity";
import { ShareVisit } from "../../entities/share-visit.entity";
import { Tenant } from "../../entities/tenant.entity";
import { User } from "../../entities/user.entity";
import { UserTag } from "../../entities/user-tag.entity";
import { ConversionEvent } from "../../entities/conversion-event.entity";
import { TicketType } from "../../entities/ticket-type.entity";
import { AdminV1Controller } from "./v1-admin.controller";
import { NotificationProviderService } from "./notification-provider.service";
import { PublicV1Controller } from "./v1-public.controller";
import { V1Service } from "./v1.service";
import { PublicModule } from "../public/public.module";
import { MemberPointsModule } from "../member-points/member-points.module";

@Module({
  imports: [PublicModule, MemberPointsModule, TypeOrmModule.forFeature([Activity, ActivityChannel, ActivityHost, ActivitySection, ActivityReview, ActivitySpaceAnnouncement, ActivitySpacePost, ActivitySpacePostReport, ActivityRecapVersion, ActivityViewLog, AdminUser, Announcement, Tenant, Registration, Order, Refund, TicketType, OperationSetting, CheckIn, User, UserTag, InviteCode, ShareVisit, ConversionEvent, MemberLevel, MemberProfile, MemberPointLog, NotificationTemplate, Notification, NotificationSchedule, NotificationPreference, WechatSubscriptionGrant])],
  controllers: [AdminV1Controller, PublicV1Controller],
  providers: [V1Service, NotificationProviderService],
  exports: [V1Service]
})
export class V1Module {}
