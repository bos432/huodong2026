import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BusinessJob } from "../../entities/business-job.entity";
import { Activity } from "../../entities/activity.entity";
import { NotificationPreference } from "../../entities/notification-preference.entity";
import { Notification } from "../../entities/notification.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Registration } from "../../entities/registration.entity";
import { User } from "../../entities/user.entity";
import { NotificationProviderService } from "../v1/notification-provider.service";
import { AutomaticSmsService } from "./automatic-sms.service";
import { BusinessJobService } from "./business-job.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([BusinessJob, OperationSetting, Notification, NotificationPreference, User, Activity, Registration])],
  providers: [BusinessJobService, AutomaticSmsService, NotificationProviderService],
  exports: [BusinessJobService, AutomaticSmsService]
})
export class ReliabilityModule {}
