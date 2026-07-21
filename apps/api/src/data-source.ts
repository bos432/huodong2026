import "reflect-metadata";
import { config } from "dotenv";
import { DataSource } from "typeorm";
import { ActivityCategory } from "./entities/activity-category.entity";
import { ActivityChannel } from "./entities/activity-channel.entity";
import { ActivityApprovalLog } from "./entities/activity-approval-log.entity";
import { ActivityField } from "./entities/activity-field.entity";
import { ActivityHost } from "./entities/activity-host.entity";
import { ActivityReview } from "./entities/activity-review.entity";
import { ActivityReviewReport } from "./entities/activity-review-report.entity";
import { ActivityRecapVersion } from "./entities/activity-recap-version.entity";
import { ActivitySection } from "./entities/activity-section.entity";
import { ActivityViewLog } from "./entities/activity-view-log.entity";
import { AdminLoginLog } from "./entities/admin-login-log.entity";
import { AdminMallMerchantAccess } from "./entities/admin-mall-merchant-access.entity";
import { AdminOperationLog } from "./entities/admin-operation-log.entity";
import { Activity } from "./entities/activity.entity";
import { AdminUser } from "./entities/admin-user.entity";
import { AdminInvite } from "./entities/admin-invite.entity";
import { TenantSubscriptionEvent } from "./entities/tenant-subscription-event.entity";
import { AgentPaymentAccount } from "./entities/agent-payment-account.entity";
import { AgentSettlementTransfer } from "./entities/agent-settlement-transfer.entity";
import { AgentSettlement } from "./entities/agent-settlement.entity";
import { Agent } from "./entities/agent.entity";
import { AmbassadorApplication } from "./entities/ambassador-application.entity";
import { AmbassadorApplicationFollowup } from "./entities/ambassador-application-followup.entity";
import { AmbassadorProfile } from "./entities/ambassador-profile.entity";
import { AmbassadorTask } from "./entities/ambassador-task.entity";
import { AmbassadorContribution } from "./entities/ambassador-contribution.entity";
import { PartnerContract } from "./entities/partner-contract.entity";
import { AmbassadorCase } from "./entities/ambassador-case.entity";
import { AmbassadorLandingSetting } from "./entities/ambassador-landing-setting.entity";
import { Announcement } from "./entities/announcement.entity";
import { CheckIn } from "./entities/check-in.entity";
import { CheckInPoint } from "./entities/check-in-point.entity";
import { CharityFundSetting } from "./entities/charity-fund-setting.entity";
import { CharityFundAccount } from "./entities/charity-fund-account.entity";
import { CharityFundTransaction } from "./entities/charity-fund-transaction.entity";
import { CharityProjectDisbursement } from "./entities/charity-project-disbursement.entity";
import { CharityProjectEvent } from "./entities/charity-project-event.entity";
import { CharityProject } from "./entities/charity-project.entity";
import { CharityProjectUpdate } from "./entities/charity-project-update.entity";
import { AidApplication } from "./entities/aid-application.entity";
import { AidApplicationMaterial } from "./entities/aid-application-material.entity";
import { AidApplicationEvent } from "./entities/aid-application-event.entity";
import { Certificate } from "./entities/certificate.entity";
import { CommunityCheckIn } from "./entities/community-checkin.entity";
import { CheckInTask } from "./entities/checkin-task.entity";
import { CommunityActivity } from "./entities/community-activity.entity";
import { CommunityActivityMember } from "./entities/community-activity-member.entity";
import { CommunityPost } from "./entities/community-post.entity";
import { CommunityPostComment } from "./entities/community-post-comment.entity";
import { CommunityPostLike } from "./entities/community-post-like.entity";
import { CommunityPostFavorite } from "./entities/community-post-favorite.entity";
import { CommunityUserFollow } from "./entities/community-user-follow.entity";
import { CommunityNotification } from "./entities/community-notification.entity";
import { CommunityContentReport } from "./entities/community-content-report.entity";
import { ContentAppeal } from "./entities/content-appeal.entity";
import { ContentKeywordRule } from "./entities/content-keyword-rule.entity";
import { ContentUserSanction } from "./entities/content-user-sanction.entity";
import { Coupon } from "./entities/coupon.entity";
import { CouponClaim } from "./entities/coupon-claim.entity";
import { CouponUsage } from "./entities/coupon-usage.entity";
import { ConversionEvent } from "./entities/conversion-event.entity";
import { Course } from "./entities/course.entity";
import { CourseChapter } from "./entities/course-chapter.entity";
import { CourseLesson } from "./entities/course-lesson.entity";
import { CourseOrder } from "./entities/course-order.entity";
import { CourseResourceAccessLog } from "./entities/course-resource-access-log.entity";
import { CourseTeacher } from "./entities/course-teacher.entity";
import { CourseAssessment } from "./entities/course-assessment.entity";
import { CourseQuestion } from "./entities/course-question.entity";
import { CourseAssessmentAttempt } from "./entities/course-assessment-attempt.entity";
import { CourseAssessmentAnswer } from "./entities/course-assessment-answer.entity";
import { CourseAssessmentGrant } from "./entities/course-assessment-grant.entity";
import { CourseReview } from "./entities/course-review.entity";
import { CourseQa } from "./entities/course-qa.entity";
import { CourseAnnouncement } from "./entities/course-announcement.entity";
import { CourseCertificateTemplate } from "./entities/course-certificate-template.entity";
import { CourseRefund } from "./entities/course-refund.entity";
import { H5AuthCodeLog } from "./entities/h5-auth-code-log.entity";
import { HomepageSection } from "./entities/homepage-section.entity";
import { HomepageDecorationTemplate } from "./entities/homepage-decoration-template.entity";
import { HomepageDecorationVersion } from "./entities/homepage-decoration-version.entity";
import { HomepagePublication } from "./entities/homepage-publication.entity";
import { SupportWorkOrder } from "./entities/support-work-order.entity";
import { SupportWorkOrderLog } from "./entities/support-work-order-log.entity";
import { AnalyticsDailyMetric } from "./entities/analytics-daily-metric.entity";
import { AnalyticsCalculationRun } from "./entities/analytics-calculation-run.entity";
import { InviteCode } from "./entities/invite-code.entity";
import { ForumCategory } from "./entities/forum-category.entity";
import { ForumCategoryModerator } from "./entities/forum-category-moderator.entity";
import { ForumFavorite } from "./entities/forum-favorite.entity";
import { ForumNotification } from "./entities/forum-notification.entity";
import { ForumReply } from "./entities/forum-reply.entity";
import { ForumReport } from "./entities/forum-report.entity";
import { ForumTopic } from "./entities/forum-topic.entity";
import { ForumViewLog } from "./entities/forum-view-log.entity";
import { MemberLevel } from "./entities/member-level.entity";
import { MemberLevelChange } from "./entities/member-level-change.entity";
import { MemberPointLog } from "./entities/member-point-log.entity";
import { MemberPointRule } from "./entities/member-point-rule.entity";
import { MemberProfile } from "./entities/member-profile.entity";
import { MemberSegment } from "./entities/member-segment.entity";
import { MemberSegmentSnapshot } from "./entities/member-segment-snapshot.entity";
import { MemberSegmentSnapshotMember } from "./entities/member-segment-snapshot-member.entity";
import { MemberBehaviorTagRun } from "./entities/member-behavior-tag-run.entity";
import { MarketingPopup } from "./entities/marketing-popup.entity";
import { AdAdvertiser } from "./entities/ad-advertiser.entity";
import { AdCampaign } from "./entities/ad-campaign.entity";
import { AdContract } from "./entities/ad-contract.entity";
import { AdDailyStat } from "./entities/ad-daily-stat.entity";
import { AdOfficialRevenueImport } from "./entities/ad-official-revenue-import.entity";
import { AdSettlementItem } from "./entities/ad-settlement-item.entity";
import { AdSettlement } from "./entities/ad-settlement.entity";
import { MallAddress } from "./entities/mall-address.entity";
import { MallCartItem } from "./entities/mall-cart-item.entity";
import { MallBrowseHistory } from "./entities/mall-browse-history.entity";
import { MallCategory } from "./entities/mall-category.entity";
import { MallBrand } from "./entities/mall-brand.entity";
import { MallCommissionAdjustment } from "./entities/mall-commission-adjustment.entity";
import { MallCommissionRule } from "./entities/mall-commission-rule.entity";
import { MallCommission } from "./entities/mall-commission.entity";
import { MallCouponClaim } from "./entities/mall-coupon-claim.entity";
import { MallCoupon } from "./entities/mall-coupon.entity";
import { MallCouponUsage } from "./entities/mall-coupon-usage.entity";
import { MallFavorite } from "./entities/mall-favorite.entity";
import { MallFlashSale } from "./entities/mall-flash-sale.entity";
import { MallGroupBuy } from "./entities/mall-group-buy.entity";
import { MallGroupBuyRecord } from "./entities/mall-group-buy-record.entity";
import { MallInventoryLog } from "./entities/mall-inventory-log.entity";
import { MallInventoryAnomaly } from "./entities/mall-inventory-anomaly.entity";
import { MallLogisticsCompany } from "./entities/mall-logistics-company.entity";
import { MallCheckoutGroup } from "./entities/mall-checkout-group.entity";
import { MallMerchant } from "./entities/mall-merchant.entity";
import { MallMerchantApplication } from "./entities/mall-merchant-application.entity";
import { MallMerchantQualification } from "./entities/mall-merchant-qualification.entity";
import { MallMerchantContract } from "./entities/mall-merchant-contract.entity";
import { MallMerchantPaymentAccount } from "./entities/mall-merchant-payment-account.entity";
import { MallOrderItem } from "./entities/mall-order-item.entity";
import { MallOrderEvent } from "./entities/mall-order-event.entity";
import { MallShipment } from "./entities/mall-shipment.entity";
import { MallShipmentItem } from "./entities/mall-shipment-item.entity";
import { MallShipmentTrackingEvent } from "./entities/mall-shipment-tracking-event.entity";
import { MallOrder } from "./entities/mall-order.entity";
import { MallPaymentCallbackLog } from "./entities/mall-payment-callback-log.entity";
import { MallPaymentTransaction } from "./entities/mall-payment-transaction.entity";
import { MallPaymentStatementRecord } from "./entities/mall-payment-statement-record.entity";
import { FundRiskAlert } from "./entities/fund-risk-alert.entity";
import { MallProduct } from "./entities/mall-product.entity";
import { MallProductAuditLog } from "./entities/mall-product-audit-log.entity";
import { MallPromotionCode } from "./entities/mall-promotion-code.entity";
import { MallPromotionRateLimit } from "./entities/mall-promotion-rate-limit.entity";
import { MallPromotionRiskEvent } from "./entities/mall-promotion-risk-event.entity";
import { MallPromotionRiskAlert } from "./entities/mall-promotion-risk-alert.entity";
import { MallRefund } from "./entities/mall-refund.entity";
import { MallRefundItem } from "./entities/mall-refund-item.entity";
import { MallRefundLog } from "./entities/mall-refund-log.entity";
import { MallRefundMessage } from "./entities/mall-refund-message.entity";
import { MallReview } from "./entities/mall-review.entity";
import { MallReviewReport } from "./entities/mall-review-report.entity";
import { MallSettlement } from "./entities/mall-settlement.entity";
import { MallSettlementEvent } from "./entities/mall-settlement-event.entity";
import { MallSettlementLine } from "./entities/mall-settlement-line.entity";
import { MallSku } from "./entities/mall-sku.entity";
import { MiniprogramReleaseLog } from "./entities/miniprogram-release-log.entity";
import { MiniprogramReleaseSetting } from "./entities/miniprogram-release-setting.entity";
import { NotificationSchedule } from "./entities/notification-schedule.entity";
import { NotificationPreference } from "./entities/notification-preference.entity";
import { BusinessJob } from "./entities/business-job.entity";
import { ActivityVersion } from "./entities/activity-version.entity";
import { NotificationTemplate } from "./entities/notification-template.entity";
import { Notification } from "./entities/notification.entity";
import { Order } from "./entities/order.entity";
import { OperationSetting } from "./entities/operation-setting.entity";
import { PaymentCallbackLog } from "./entities/payment-callback-log.entity";
import { PaymentStatementRecord } from "./entities/payment-statement-record.entity";
import { PaymentTransaction } from "./entities/payment-transaction.entity";
import { Registration } from "./entities/registration.entity";
import { Refund } from "./entities/refund.entity";
import { RedemptionCode } from "./entities/redemption-code.entity";
import { RedemptionCodeUsage } from "./entities/redemption-code-usage.entity";
import { ShareVisit } from "./entities/share-visit.entity";
import { Tenant } from "./entities/tenant.entity";
import { TenantRegionHitLog } from "./entities/tenant-region-hit-log.entity";
import { TenantRegion } from "./entities/tenant-region.entity";
import { TicketType } from "./entities/ticket-type.entity";
import { UserTag } from "./entities/user-tag.entity";
import { User } from "./entities/user.entity";
import { UserFavorite } from "./entities/user-favorite.entity";
import { UserLearning } from "./entities/user-learning.entity";
import { UserWallet } from "./entities/user-wallet.entity";
import { Waitlist } from "./entities/waitlist.entity";
import { WalletTransaction } from "./entities/wallet-transaction.entity";
import { VolunteerProfile } from "./entities/volunteer-profile.entity";
import { VolunteerAttendanceRecord } from "./entities/volunteer-attendance-record.entity";
import { VolunteerBadgeAward } from "./entities/volunteer-badge-award.entity";
import { VolunteerBadgeDefinition } from "./entities/volunteer-badge-definition.entity";
import { VolunteerHourAdjustment } from "./entities/volunteer-hour-adjustment.entity";
import { VolunteerServiceRecord } from "./entities/volunteer-service-record.entity";
import { VolunteerTaskApplication } from "./entities/volunteer-task-application.entity";
import { VolunteerTask } from "./entities/volunteer-task.entity";
import { VolunteerTrainingRecord } from "./entities/volunteer-training-record.entity";
import { VolunteerServiceProof } from "./entities/volunteer-service-proof.entity";
import { CredentialTemplate } from "./entities/credential-template.entity";
import { CredentialTemplateVersion } from "./entities/credential-template-version.entity";

config({ path: "apps/api/.env" });
config();

export default new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration",
  entities: [
    User,
    UserWallet,
    WalletTransaction,
    Tenant,
    TenantRegion,
    TenantRegionHitLog,
    AdminLoginLog,
    AdminMallMerchantAccess,
    AdminOperationLog,
    AdminUser,
    AdminInvite,
    TenantSubscriptionEvent,
    Agent,
    AgentPaymentAccount,
    AgentSettlement,
    AgentSettlementTransfer,
    AmbassadorLandingSetting,
    AmbassadorCase,
    AmbassadorApplication,
    AmbassadorApplicationFollowup,
    AmbassadorProfile,
    AmbassadorTask,
    AmbassadorContribution,
    PartnerContract,
    ActivityCategory,
    ActivityChannel,
    ActivityApprovalLog,
    Activity,
    ActivityField,
    ActivityHost,
    ActivitySection,
    ActivityReview,
    ActivityReviewReport,
    ActivityRecapVersion,
    ActivityViewLog,
    Announcement,
    Registration,
    Order,
    OperationSetting,
    PaymentCallbackLog,
    PaymentStatementRecord,
    PaymentTransaction,
    Refund,
    RedemptionCode,
    RedemptionCodeUsage,
    TicketType,
    Coupon,
    CouponClaim,
    CouponUsage,
    ConversionEvent,
    CheckIn,
    CheckInPoint,
    CharityFundSetting,
    CharityFundAccount,
    CharityFundTransaction,
    CharityProject,
    CharityProjectDisbursement,
    CharityProjectEvent,
    CharityProjectUpdate,
    AidApplication,
    AidApplicationMaterial,
    AidApplicationEvent,
    H5AuthCodeLog,
    HomepageSection,
    HomepageDecorationTemplate,
    HomepageDecorationVersion,
    HomepagePublication,
    SupportWorkOrder,
    SupportWorkOrderLog,
    AnalyticsDailyMetric,
    AnalyticsCalculationRun,
    MarketingPopup,
    ForumCategory,
    ForumCategoryModerator,
    ForumTopic,
    ForumReply,
    ForumReport,
    ForumFavorite,
    ForumViewLog,
    ForumNotification,
    AdAdvertiser,
    AdContract,
    AdCampaign,
    AdDailyStat,
    AdSettlement,
    AdSettlementItem,
    AdOfficialRevenueImport,
    MiniprogramReleaseSetting,
    MiniprogramReleaseLog,
    InviteCode,
    ShareVisit,
    Waitlist,
    UserTag,
    MemberLevel,
    MemberLevelChange,
    MemberProfile,
    MemberPointRule,
    MemberSegment,
    MemberSegmentSnapshot,
    MemberSegmentSnapshotMember,
    MemberBehaviorTagRun,
    MallCategory,
    MallBrand,
    MallMerchant,
    MallMerchantApplication,
    MallMerchantQualification,
    MallMerchantContract,
    MallMerchantPaymentAccount,
    MallCheckoutGroup,
    MallCommissionAdjustment,
    MallCommissionRule,
    MallCommission,
    MallCoupon,
    MallCouponClaim,
    MallCouponUsage,
    MallFavorite,
    MallBrowseHistory,
    MallFlashSale,
    MallGroupBuy,
    MallGroupBuyRecord,
    MallLogisticsCompany,
    MallProduct,
    MallProductAuditLog,
    MallSku,
    MallInventoryLog,
    MallInventoryAnomaly,
    MallAddress,
    MallCartItem,
    MallOrder,
    MallOrderItem,
    MallOrderEvent,
    MallShipment,
    MallShipmentItem,
    MallShipmentTrackingEvent,
    MallPaymentCallbackLog,
    MallPaymentTransaction,
    MallPaymentStatementRecord,
    FundRiskAlert,
    MallRefund,
    MallRefundItem,
    MallRefundMessage,
    MallPromotionCode,
    MallPromotionRateLimit,
    MallPromotionRiskEvent,
    MallPromotionRiskAlert,
    MallRefundLog,
    MallReview,
    MallReviewReport,
    MallSettlement,
    MallSettlementEvent,
    MallSettlementLine,
    MemberPointLog,
    NotificationTemplate,
    Notification,
    NotificationSchedule,
    NotificationPreference,
    BusinessJob,
    ActivityVersion,
    Course,
    CourseChapter,
    CourseLesson,
    CourseOrder,
    CourseTeacher,
    CourseResourceAccessLog,
    CourseAssessment,
    CourseQuestion,
    CourseAssessmentAttempt,
    CourseAssessmentAnswer,
    CourseAssessmentGrant,
    CourseReview,
    CourseQa,
    CourseAnnouncement,
    CourseCertificateTemplate,
    CourseRefund,
    CommunityActivity,
    CommunityActivityMember,
    CheckInTask,
    CommunityPost,
    CommunityPostLike,
    CommunityPostFavorite,
    CommunityUserFollow,
    CommunityNotification,
    CommunityContentReport,
    ContentKeywordRule,
    ContentUserSanction,
    ContentAppeal,
    CommunityPostComment,
    CommunityCheckIn,
    UserLearning,
    UserFavorite,
    Certificate,
    CredentialTemplate,
    CredentialTemplateVersion,
    VolunteerProfile,
    VolunteerTrainingRecord,
    VolunteerBadgeDefinition,
    VolunteerBadgeAward,
    VolunteerTask,
    VolunteerTaskApplication,
    VolunteerAttendanceRecord,
    VolunteerServiceRecord,
    VolunteerHourAdjustment,
    VolunteerServiceProof
  ],
  migrations: [__dirname.includes("dist") ? `${__dirname}/migrations/[0-9]*.js` : "apps/api/src/migrations/[0-9]*.ts"],
  synchronize: false,
  timezone: "+08:00",
  dateStrings: ["DATE"]
});
