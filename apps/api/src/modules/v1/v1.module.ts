import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivityHost } from "../../entities/activity-host.entity";
import { ActivityReview } from "../../entities/activity-review.entity";
import { ActivitySection } from "../../entities/activity-section.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
import { Activity } from "../../entities/activity.entity";
import { Announcement } from "../../entities/announcement.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { InviteCode } from "../../entities/invite-code.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { NotificationTemplate } from "../../entities/notification-template.entity";
import { Notification } from "../../entities/notification.entity";
import { NotificationSchedule } from "../../entities/notification-schedule.entity";
import { Order } from "../../entities/order.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Registration } from "../../entities/registration.entity";
import { ShareVisit } from "../../entities/share-visit.entity";
import { Tenant } from "../../entities/tenant.entity";
import { User } from "../../entities/user.entity";
import { AdminV1Controller } from "./v1-admin.controller";
import { NotificationProviderService } from "./notification-provider.service";
import { PublicV1Controller } from "./v1-public.controller";
import { V1Service } from "./v1.service";
import { PublicModule } from "../public/public.module";

@Module({
  imports: [PublicModule, TypeOrmModule.forFeature([Activity, ActivityHost, ActivitySection, ActivityReview, ActivityViewLog, Announcement, Tenant, Registration, Order, OperationSetting, CheckIn, User, InviteCode, ShareVisit, MemberLevel, MemberProfile, MemberPointLog, NotificationTemplate, Notification, NotificationSchedule])],
  controllers: [AdminV1Controller, PublicV1Controller],
  providers: [V1Service, NotificationProviderService]
})
export class V1Module {}
