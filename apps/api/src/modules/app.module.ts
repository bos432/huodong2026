import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { config as loadEnv } from "dotenv";
import fs from "fs";
import path from "path";
import { Activity } from "../entities/activity.entity";
import { ActivityCategory } from "../entities/activity-category.entity";
import { ActivityApprovalLog } from "../entities/activity-approval-log.entity";
import { ActivityField } from "../entities/activity-field.entity";
import { ActivityHost } from "../entities/activity-host.entity";
import { ActivityReview } from "../entities/activity-review.entity";
import { ActivitySection } from "../entities/activity-section.entity";
import { ActivityViewLog } from "../entities/activity-view-log.entity";
import { AdminLoginLog } from "../entities/admin-login-log.entity";
import { AdminOperationLog } from "../entities/admin-operation-log.entity";
import { AdminUser } from "../entities/admin-user.entity";
import { AgentPaymentAccount } from "../entities/agent-payment-account.entity";
import { AgentSettlementTransfer } from "../entities/agent-settlement-transfer.entity";
import { AgentSettlement } from "../entities/agent-settlement.entity";
import { Agent } from "../entities/agent.entity";
import { Announcement } from "../entities/announcement.entity";
import { CheckIn } from "../entities/check-in.entity";
import { Coupon } from "../entities/coupon.entity";
import { H5AuthCodeLog } from "../entities/h5-auth-code-log.entity";
import { HomepageSection } from "../entities/homepage-section.entity";
import { InviteCode } from "../entities/invite-code.entity";
import { MemberLevel } from "../entities/member-level.entity";
import { MemberPointLog } from "../entities/member-point-log.entity";
import { MemberProfile } from "../entities/member-profile.entity";
import { NotificationTemplate } from "../entities/notification-template.entity";
import { Notification } from "../entities/notification.entity";
import { NotificationSchedule } from "../entities/notification-schedule.entity";
import { Order } from "../entities/order.entity";
import { OperationSetting } from "../entities/operation-setting.entity";
import { PaymentCallbackLog } from "../entities/payment-callback-log.entity";
import { PaymentStatementRecord } from "../entities/payment-statement-record.entity";
import { PaymentTransaction } from "../entities/payment-transaction.entity";
import { Registration } from "../entities/registration.entity";
import { Refund } from "../entities/refund.entity";
import { ShareVisit } from "../entities/share-visit.entity";
import { Tenant } from "../entities/tenant.entity";
import { TicketType } from "../entities/ticket-type.entity";
import { User } from "../entities/user.entity";
import { UserWallet } from "../entities/user-wallet.entity";
import { UserTag } from "../entities/user-tag.entity";
import { Waitlist } from "../entities/waitlist.entity";
import { WalletTransaction } from "../entities/wallet-transaction.entity";
import { AdminModule } from "./admin/admin.module";
import { HealthModule } from "./health/health.module";
import { InstallModule } from "./install/install.module";
import { PublicModule } from "./public/public.module";
import { V1Module } from "./v1/v1.module";

const entities = [User, UserWallet, WalletTransaction, Tenant, AdminLoginLog, AdminOperationLog, AdminUser, Agent, AgentPaymentAccount, AgentSettlement, AgentSettlementTransfer, ActivityCategory, ActivityApprovalLog, Activity, ActivityField, ActivityHost, ActivitySection, ActivityReview, ActivityViewLog, Announcement, Registration, Order, OperationSetting, PaymentCallbackLog, PaymentStatementRecord, PaymentTransaction, Refund, TicketType, Coupon, CheckIn, H5AuthCodeLog, HomepageSection, InviteCode, ShareVisit, Waitlist, UserTag, MemberLevel, MemberProfile, MemberPointLog, NotificationTemplate, Notification, NotificationSchedule];

loadEnv({ path: "apps/api/.env" });
loadEnv();

function dbSynchronizeEnabled(config: ConfigService) {
  const fallback = config.get("NODE_ENV") === "production" ? "false" : "true";
  return config.get<string>("DB_SYNCHRONIZE", fallback) === "true";
}

function installerBootstrapMode() {
  return process.env.INSTALLER_ENABLED === "true" && !fs.existsSync(path.join(process.cwd(), "runtime", "install.lock"));
}

const configModule = ConfigModule.forRoot({ isGlobal: true, envFilePath: ["apps/api/.env", ".env"] });
const businessModules = [
  TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      type: "mysql",
      host: config.get("DB_HOST", "127.0.0.1"),
      port: config.get<number>("DB_PORT", 3306),
      username: config.get("DB_USERNAME", "activity"),
      password: config.get("DB_PASSWORD", "activitypass"),
      database: config.get("DB_DATABASE", "activity_registration"),
      entities,
      synchronize: dbSynchronizeEnabled(config),
      timezone: "+08:00"
    })
  }),
  AdminModule,
  PublicModule,
  HealthModule,
  V1Module
];

@Module({
  imports: [configModule, InstallModule, ...(installerBootstrapMode() ? [] : businessModules)]
})
export class AppModule {}
