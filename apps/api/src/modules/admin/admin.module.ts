import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivityCategory } from "../../entities/activity-category.entity";
import { ActivityApprovalLog } from "../../entities/activity-approval-log.entity";
import { ActivityField } from "../../entities/activity-field.entity";
import { ActivityHost } from "../../entities/activity-host.entity";
import { ActivityReview } from "../../entities/activity-review.entity";
import { ActivitySection } from "../../entities/activity-section.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
import { ActivityChannel } from "../../entities/activity-channel.entity";
import { Activity } from "../../entities/activity.entity";
import { AdminLoginLog } from "../../entities/admin-login-log.entity";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { AgentSettlementTransfer } from "../../entities/agent-settlement-transfer.entity";
import { AgentSettlement } from "../../entities/agent-settlement.entity";
import { Agent } from "../../entities/agent.entity";
import { AmbassadorApplication } from "../../entities/ambassador-application.entity";
import { AmbassadorApplicationFollowup } from "../../entities/ambassador-application-followup.entity";
import { AmbassadorCase } from "../../entities/ambassador-case.entity";
import { AmbassadorLandingSetting } from "../../entities/ambassador-landing-setting.entity";
import { Announcement } from "../../entities/announcement.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { CharityFundSetting } from "../../entities/charity-fund-setting.entity";
import { CharityFundTransaction } from "../../entities/charity-fund-transaction.entity";
import { CharityProjectDisbursement } from "../../entities/charity-project-disbursement.entity";
import { CharityProject } from "../../entities/charity-project.entity";
import { CharityProjectUpdate } from "../../entities/charity-project-update.entity";
import { Certificate } from "../../entities/certificate.entity";
import { Coupon } from "../../entities/coupon.entity";
import { ConversionEvent } from "../../entities/conversion-event.entity";
import { Course } from "../../entities/course.entity";
import { H5AuthCodeLog } from "../../entities/h5-auth-code-log.entity";
import { HomepageDecorationTemplate } from "../../entities/homepage-decoration-template.entity";
import { HomepageDecorationVersion } from "../../entities/homepage-decoration-version.entity";
import { HomepageSection } from "../../entities/homepage-section.entity";
import { MarketingPopup } from "../../entities/marketing-popup.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { MiniprogramReleaseLog } from "../../entities/miniprogram-release-log.entity";
import { MiniprogramReleaseSetting } from "../../entities/miniprogram-release-setting.entity";
import { Notification } from "../../entities/notification.entity";
import { Order } from "../../entities/order.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { PaymentCallbackLog } from "../../entities/payment-callback-log.entity";
import { PaymentStatementRecord } from "../../entities/payment-statement-record.entity";
import { PaymentTransaction } from "../../entities/payment-transaction.entity";
import { Registration } from "../../entities/registration.entity";
import { Refund } from "../../entities/refund.entity";
import { ShareVisit } from "../../entities/share-visit.entity";
import { User } from "../../entities/user.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { UserTag } from "../../entities/user-tag.entity";
import { Waitlist } from "../../entities/waitlist.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { TicketType } from "../../entities/ticket-type.entity";
import { Tenant } from "../../entities/tenant.entity";
import { TenantRegionHitLog } from "../../entities/tenant-region-hit-log.entity";
import { TenantRegion } from "../../entities/tenant-region.entity";
import { VolunteerProfile } from "../../entities/volunteer-profile.entity";
import { VolunteerServiceRecord } from "../../entities/volunteer-service-record.entity";
import { VolunteerTaskApplication } from "../../entities/volunteer-task-application.entity";
import { VolunteerTask } from "../../entities/volunteer-task.entity";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { MiniprogramReleaseService } from "./miniprogram-release.service";
import { JwtStrategy } from "./jwt.strategy";
import { RolesGuard } from "./roles.guard";
import { PaymentProviderService } from "../public/payment-provider.service";
import { RefundCompletionService } from "../refund-completion.service";
import { CharityFundService } from "../charity-fund.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantRegion, TenantRegionHitLog, AdminLoginLog, AdminOperationLog, AdminUser, Agent, AgentPaymentAccount, AgentSettlement, AgentSettlementTransfer, AmbassadorLandingSetting, AmbassadorCase, AmbassadorApplication, AmbassadorApplicationFollowup, ActivityCategory, ActivityChannel, ActivityApprovalLog, Activity, ActivityField, ActivityHost, ActivitySection, ActivityReview, ActivityViewLog, Announcement, Registration, Order, OperationSetting, PaymentCallbackLog, PaymentStatementRecord, PaymentTransaction, Refund, TicketType, Coupon, ConversionEvent, Course, H5AuthCodeLog, HomepageSection, HomepageDecorationVersion, HomepageDecorationTemplate, MarketingPopup, MiniprogramReleaseSetting, MiniprogramReleaseLog, CheckIn, User, UserWallet, WalletTransaction, Waitlist, UserTag, MemberLevel, MemberProfile, MemberPointLog, Notification, ShareVisit, CharityFundSetting, CharityFundTransaction, CharityProject, CharityProjectDisbursement, CharityProjectUpdate, Certificate, VolunteerProfile, VolunteerTask, VolunteerTaskApplication, VolunteerServiceRecord]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get("JWT_SECRET", "dev-secret-change-me"), signOptions: { expiresIn: "7d" } })
    })
  ],
  controllers: [AdminController],
  providers: [AdminService, MiniprogramReleaseService, JwtStrategy, RolesGuard, PaymentProviderService, RefundCompletionService, CharityFundService],
  exports: [AdminService]
})
export class AdminModule {}
