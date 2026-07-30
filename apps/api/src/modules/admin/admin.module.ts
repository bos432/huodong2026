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
import { ActivityReviewReport } from "../../entities/activity-review-report.entity";
import { ActivitySection } from "../../entities/activity-section.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
import { ActivityChannel } from "../../entities/activity-channel.entity";
import { Activity } from "../../entities/activity.entity";
import { ActivityVersion } from "../../entities/activity-version.entity";
import { AdminLoginLog } from "../../entities/admin-login-log.entity";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { AdminInvite } from "../../entities/admin-invite.entity";
import { TenantSubscriptionEvent } from "../../entities/tenant-subscription-event.entity";
import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { AgentSettlementTransfer } from "../../entities/agent-settlement-transfer.entity";
import { AgentSettlement } from "../../entities/agent-settlement.entity";
import { Agent } from "../../entities/agent.entity";
import { AmbassadorApplication } from "../../entities/ambassador-application.entity";
import { AmbassadorApplicationFollowup } from "../../entities/ambassador-application-followup.entity";
import { AmbassadorProfile } from "../../entities/ambassador-profile.entity";
import { AmbassadorTask } from "../../entities/ambassador-task.entity";
import { AmbassadorContribution } from "../../entities/ambassador-contribution.entity";
import { PartnerContract } from "../../entities/partner-contract.entity";
import { AmbassadorCase } from "../../entities/ambassador-case.entity";
import { AmbassadorLandingSetting } from "../../entities/ambassador-landing-setting.entity";
import { Announcement } from "../../entities/announcement.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { CheckInPoint } from "../../entities/check-in-point.entity";
import { CharityFundSetting } from "../../entities/charity-fund-setting.entity";
import { CharityFundAccount } from "../../entities/charity-fund-account.entity";
import { CharityFundTransaction } from "../../entities/charity-fund-transaction.entity";
import { CharityProjectDisbursement } from "../../entities/charity-project-disbursement.entity";
import { CharityProjectEvent } from "../../entities/charity-project-event.entity";
import { CharityProject } from "../../entities/charity-project.entity";
import { CharityProjectUpdate } from "../../entities/charity-project-update.entity";
import { Certificate } from "../../entities/certificate.entity";
import { Coupon } from "../../entities/coupon.entity";
import { CouponClaim } from "../../entities/coupon-claim.entity";
import { CouponUsage } from "../../entities/coupon-usage.entity";
import { ConversionEvent } from "../../entities/conversion-event.entity";
import { Course } from "../../entities/course.entity";
import { H5AuthCodeLog } from "../../entities/h5-auth-code-log.entity";
import { HomepageDecorationTemplate } from "../../entities/homepage-decoration-template.entity";
import { HomepageDecorationVersion } from "../../entities/homepage-decoration-version.entity";
import { HomepageSection } from "../../entities/homepage-section.entity";
import { MarketingPopup } from "../../entities/marketing-popup.entity";
import { AdAdvertiser } from "../../entities/ad-advertiser.entity";
import { AdCampaign } from "../../entities/ad-campaign.entity";
import { AdContract } from "../../entities/ad-contract.entity";
import { AdDailyStat } from "../../entities/ad-daily-stat.entity";
import { AdOfficialRevenueImport } from "../../entities/ad-official-revenue-import.entity";
import { AdSettlementItem } from "../../entities/ad-settlement-item.entity";
import { AdSettlement } from "../../entities/ad-settlement.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberLevelChange } from "../../entities/member-level-change.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberPointRule } from "../../entities/member-point-rule.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { MemberSegment } from "../../entities/member-segment.entity";
import { MemberSegmentSnapshot } from "../../entities/member-segment-snapshot.entity";
import { MemberSegmentSnapshotMember } from "../../entities/member-segment-snapshot-member.entity";
import { MemberBehaviorTagRun } from "../../entities/member-behavior-tag-run.entity";
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
import { VolunteerAttendanceRecord } from "../../entities/volunteer-attendance-record.entity";
import { VolunteerBadgeAward } from "../../entities/volunteer-badge-award.entity";
import { VolunteerBadgeDefinition } from "../../entities/volunteer-badge-definition.entity";
import { VolunteerHourAdjustment } from "../../entities/volunteer-hour-adjustment.entity";
import { VolunteerServiceRecord } from "../../entities/volunteer-service-record.entity";
import { VolunteerTaskApplication } from "../../entities/volunteer-task-application.entity";
import { VolunteerTask } from "../../entities/volunteer-task.entity";
import { VolunteerTrainingRecord } from "../../entities/volunteer-training-record.entity";
import { VolunteerServiceProof } from "../../entities/volunteer-service-proof.entity";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { MiniprogramReleaseService } from "./miniprogram-release.service";
import { JwtStrategy } from "./jwt.strategy";
import { RolesGuard } from "./roles.guard";
import { PaymentProviderService } from "../public/payment-provider.service";
import { RefundCompletionService } from "../refund-completion.service";
import { CharityFundService } from "../charity-fund.service";
import { NotificationProviderService } from "../v1/notification-provider.service";
import { ObjectStorageService } from "../../shared/object-storage.service";
import { FundRiskAlert } from "../../entities/fund-risk-alert.entity";
import { CourseRefund } from "../../entities/course-refund.entity";
import { MallPaymentCallbackLog } from "../../entities/mall-payment-callback-log.entity";
import { MallPaymentStatementRecord } from "../../entities/mall-payment-statement-record.entity";
import { MallPaymentTransaction } from "../../entities/mall-payment-transaction.entity";
import { MallRefund } from "../../entities/mall-refund.entity";
import { FundRiskMonitorService } from "./fund-risk-monitor.service";
import { BusinessJob } from "../../entities/business-job.entity";
import { SupportWorkOrder } from "../../entities/support-work-order.entity";
import { SupportWorkOrderLog } from "../../entities/support-work-order-log.entity";
import { AnalyticsDailyMetric } from "../../entities/analytics-daily-metric.entity";
import { AnalyticsCalculationRun } from "../../entities/analytics-calculation-run.entity";
import { AidModule } from "../aid/aid.module";
import { MemberPointsModule } from "../member-points/member-points.module";
import { CredentialTemplateModule } from "../credential-templates/credential-template.module";

@Module({
  imports: [
    AidModule,
    MemberPointsModule,
    CredentialTemplateModule,
    TypeOrmModule.forFeature([CouponClaim, CouponUsage]),
    TypeOrmModule.forFeature([FundRiskAlert, BusinessJob, CourseRefund, MallPaymentCallbackLog, MallPaymentStatementRecord, MallPaymentTransaction, MallRefund, CheckInPoint, MemberSegment, MemberSegmentSnapshot, MemberSegmentSnapshotMember, MemberBehaviorTagRun, SupportWorkOrder, SupportWorkOrderLog, AnalyticsDailyMetric, AnalyticsCalculationRun]),
    TypeOrmModule.forFeature([Tenant, TenantRegion, TenantRegionHitLog, AdminLoginLog, AdminOperationLog, AdminUser, AdminInvite, TenantSubscriptionEvent, Agent, AgentPaymentAccount, AgentSettlement, AgentSettlementTransfer, AmbassadorLandingSetting, AmbassadorCase, AmbassadorApplication, AmbassadorApplicationFollowup, ActivityCategory, ActivityChannel, ActivityApprovalLog, Activity, ActivityVersion, ActivityField, ActivityHost, ActivitySection, ActivityReview, ActivityViewLog, Announcement, Registration, Order, OperationSetting, PaymentCallbackLog, PaymentStatementRecord, PaymentTransaction, Refund, TicketType, Coupon, ConversionEvent, Course, H5AuthCodeLog, HomepageSection, HomepageDecorationVersion, HomepageDecorationTemplate, MarketingPopup, AdAdvertiser, AdContract, AdCampaign, AdDailyStat, AdSettlement, AdSettlementItem, AdOfficialRevenueImport, MiniprogramReleaseSetting, MiniprogramReleaseLog, CheckIn, User, UserWallet, WalletTransaction, Waitlist, UserTag, MemberLevel, MemberLevelChange, MemberProfile, MemberPointRule, MemberPointLog, Notification, ShareVisit, CharityFundSetting, CharityFundAccount, CharityFundTransaction, CharityProject, CharityProjectDisbursement, CharityProjectEvent, CharityProjectUpdate, Certificate, VolunteerProfile, VolunteerTrainingRecord, VolunteerBadgeDefinition, VolunteerBadgeAward, VolunteerTask, VolunteerTaskApplication, VolunteerAttendanceRecord, VolunteerServiceRecord, VolunteerHourAdjustment, VolunteerServiceProof]),
    TypeOrmModule.forFeature([AmbassadorProfile, AmbassadorTask, AmbassadorContribution, PartnerContract]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get("JWT_SECRET", "dev-secret-change-me"), signOptions: { expiresIn: "7d" } })
    })
  ],
  controllers: [AdminController],
  providers: [AdminService, MiniprogramReleaseService, FundRiskMonitorService, JwtStrategy, RolesGuard, PaymentProviderService, NotificationProviderService, RefundCompletionService, CharityFundService, ObjectStorageService],
  exports: [AdminService]
})
export class AdminModule {}
