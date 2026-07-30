import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BusinessJob } from "../../entities/business-job.entity";
import { Activity } from "../../entities/activity.entity";
import { NotificationPreference } from "../../entities/notification-preference.entity";
import { Notification } from "../../entities/notification.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Registration } from "../../entities/registration.entity";
import { ActivityReview } from "../../entities/activity-review.entity";
import { Certificate } from "../../entities/certificate.entity";
import { NotificationTemplate } from "../../entities/notification-template.entity";
import { WechatSubscriptionGrant } from "../../entities/wechat-subscription-grant.entity";
import { User } from "../../entities/user.entity";
import { NotificationProviderService } from "../v1/notification-provider.service";
import { AutomaticSmsService } from "./automatic-sms.service";
import { AutomaticWechatService } from "./automatic-wechat.service";
import { AutomaticNotificationService } from "./automatic-notification.service";
import { PostEventAutomationService } from "./post-event-automation.service";
import { BusinessJobService } from "./business-job.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([BusinessJob, OperationSetting, Notification, NotificationPreference, NotificationTemplate, WechatSubscriptionGrant, User, Activity, Registration, ActivityReview, Certificate])],
  providers: [BusinessJobService, AutomaticSmsService, AutomaticWechatService, AutomaticNotificationService, PostEventAutomationService, NotificationProviderService],
  exports: [BusinessJobService, AutomaticSmsService, AutomaticWechatService, AutomaticNotificationService, PostEventAutomationService]
})
export class ReliabilityModule {}
