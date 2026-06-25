import "reflect-metadata";
import { config } from "dotenv";
import { DataSource } from "typeorm";
import { ActivityCategory } from "./entities/activity-category.entity";
import { ActivityChannel } from "./entities/activity-channel.entity";
import { ActivityApprovalLog } from "./entities/activity-approval-log.entity";
import { ActivityField } from "./entities/activity-field.entity";
import { ActivityHost } from "./entities/activity-host.entity";
import { ActivityReview } from "./entities/activity-review.entity";
import { ActivitySection } from "./entities/activity-section.entity";
import { ActivityViewLog } from "./entities/activity-view-log.entity";
import { AdminLoginLog } from "./entities/admin-login-log.entity";
import { AdminMallMerchantAccess } from "./entities/admin-mall-merchant-access.entity";
import { AdminOperationLog } from "./entities/admin-operation-log.entity";
import { Activity } from "./entities/activity.entity";
import { AdminUser } from "./entities/admin-user.entity";
import { AgentPaymentAccount } from "./entities/agent-payment-account.entity";
import { AgentSettlementTransfer } from "./entities/agent-settlement-transfer.entity";
import { AgentSettlement } from "./entities/agent-settlement.entity";
import { Agent } from "./entities/agent.entity";
import { AmbassadorApplication } from "./entities/ambassador-application.entity";
import { AmbassadorApplicationFollowup } from "./entities/ambassador-application-followup.entity";
import { AmbassadorCase } from "./entities/ambassador-case.entity";
import { AmbassadorLandingSetting } from "./entities/ambassador-landing-setting.entity";
import { Announcement } from "./entities/announcement.entity";
import { CheckIn } from "./entities/check-in.entity";
import { CharityFundSetting } from "./entities/charity-fund-setting.entity";
import { CharityFundTransaction } from "./entities/charity-fund-transaction.entity";
import { CharityProjectDisbursement } from "./entities/charity-project-disbursement.entity";
import { CharityProject } from "./entities/charity-project.entity";
import { CharityProjectUpdate } from "./entities/charity-project-update.entity";
import { Certificate } from "./entities/certificate.entity";
import { CommunityCheckIn } from "./entities/community-checkin.entity";
import { CheckInTask } from "./entities/checkin-task.entity";
import { CommunityActivity } from "./entities/community-activity.entity";
import { CommunityPost } from "./entities/community-post.entity";
import { CommunityPostComment } from "./entities/community-post-comment.entity";
import { CommunityPostLike } from "./entities/community-post-like.entity";
import { Coupon } from "./entities/coupon.entity";
import { ConversionEvent } from "./entities/conversion-event.entity";
import { Course } from "./entities/course.entity";
import { CourseChapter } from "./entities/course-chapter.entity";
import { CourseLesson } from "./entities/course-lesson.entity";
import { CourseOrder } from "./entities/course-order.entity";
import { H5AuthCodeLog } from "./entities/h5-auth-code-log.entity";
import { HomepageSection } from "./entities/homepage-section.entity";
import { InviteCode } from "./entities/invite-code.entity";
import { MemberLevel } from "./entities/member-level.entity";
import { MemberPointLog } from "./entities/member-point-log.entity";
import { MemberProfile } from "./entities/member-profile.entity";
import { MarketingPopup } from "./entities/marketing-popup.entity";
import { MallAddress } from "./entities/mall-address.entity";
import { MallCartItem } from "./entities/mall-cart-item.entity";
import { MallBrowseHistory } from "./entities/mall-browse-history.entity";
import { MallCategory } from "./entities/mall-category.entity";
import { MallCommission } from "./entities/mall-commission.entity";
import { MallCouponClaim } from "./entities/mall-coupon-claim.entity";
import { MallCoupon } from "./entities/mall-coupon.entity";
import { MallCouponUsage } from "./entities/mall-coupon-usage.entity";
import { MallFavorite } from "./entities/mall-favorite.entity";
import { MallFlashSale } from "./entities/mall-flash-sale.entity";
import { MallGroupBuy } from "./entities/mall-group-buy.entity";
import { MallGroupBuyRecord } from "./entities/mall-group-buy-record.entity";
import { MallInventoryLog } from "./entities/mall-inventory-log.entity";
import { MallLogisticsCompany } from "./entities/mall-logistics-company.entity";
import { MallCheckoutGroup } from "./entities/mall-checkout-group.entity";
import { MallMerchant } from "./entities/mall-merchant.entity";
import { MallMerchantPaymentAccount } from "./entities/mall-merchant-payment-account.entity";
import { MallOrderItem } from "./entities/mall-order-item.entity";
import { MallOrder } from "./entities/mall-order.entity";
import { MallPaymentCallbackLog } from "./entities/mall-payment-callback-log.entity";
import { MallPaymentTransaction } from "./entities/mall-payment-transaction.entity";
import { MallProduct } from "./entities/mall-product.entity";
import { MallPromotionCode } from "./entities/mall-promotion-code.entity";
import { MallRefund } from "./entities/mall-refund.entity";
import { MallRefundLog } from "./entities/mall-refund-log.entity";
import { MallReview } from "./entities/mall-review.entity";
import { MallSettlement } from "./entities/mall-settlement.entity";
import { MallSku } from "./entities/mall-sku.entity";
import { MiniprogramReleaseLog } from "./entities/miniprogram-release-log.entity";
import { MiniprogramReleaseSetting } from "./entities/miniprogram-release-setting.entity";
import { NotificationSchedule } from "./entities/notification-schedule.entity";
import { NotificationTemplate } from "./entities/notification-template.entity";
import { Notification } from "./entities/notification.entity";
import { Order } from "./entities/order.entity";
import { OperationSetting } from "./entities/operation-setting.entity";
import { PaymentCallbackLog } from "./entities/payment-callback-log.entity";
import { PaymentStatementRecord } from "./entities/payment-statement-record.entity";
import { PaymentTransaction } from "./entities/payment-transaction.entity";
import { Registration } from "./entities/registration.entity";
import { Refund } from "./entities/refund.entity";
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
import { VolunteerServiceRecord } from "./entities/volunteer-service-record.entity";
import { VolunteerTaskApplication } from "./entities/volunteer-task-application.entity";
import { VolunteerTask } from "./entities/volunteer-task.entity";

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
    Agent,
    AgentPaymentAccount,
    AgentSettlement,
    AgentSettlementTransfer,
    AmbassadorLandingSetting,
    AmbassadorCase,
    AmbassadorApplication,
    AmbassadorApplicationFollowup,
    ActivityCategory,
    ActivityChannel,
    ActivityApprovalLog,
    Activity,
    ActivityField,
    ActivityHost,
    ActivitySection,
    ActivityReview,
    ActivityViewLog,
    Announcement,
    Registration,
    Order,
    OperationSetting,
    PaymentCallbackLog,
    PaymentStatementRecord,
    PaymentTransaction,
    Refund,
    TicketType,
    Coupon,
    ConversionEvent,
    CheckIn,
    CharityFundSetting,
    CharityFundTransaction,
    CharityProject,
    CharityProjectDisbursement,
    CharityProjectUpdate,
    H5AuthCodeLog,
    HomepageSection,
    MarketingPopup,
    MiniprogramReleaseSetting,
    MiniprogramReleaseLog,
    InviteCode,
    ShareVisit,
    Waitlist,
    UserTag,
    MemberLevel,
    MemberProfile,
    MallCategory,
    MallMerchant,
    MallMerchantPaymentAccount,
    MallCheckoutGroup,
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
    MallSku,
    MallInventoryLog,
    MallAddress,
    MallCartItem,
    MallOrder,
    MallOrderItem,
    MallPaymentCallbackLog,
    MallPaymentTransaction,
    MallRefund,
    MallPromotionCode,
    MallRefundLog,
    MallReview,
    MallSettlement,
    MemberPointLog,
    NotificationTemplate,
    Notification,
    NotificationSchedule,
    Course,
    CourseChapter,
    CourseLesson,
    CourseOrder,
    CommunityActivity,
    CheckInTask,
    CommunityPost,
    CommunityPostLike,
    CommunityPostComment,
    CommunityCheckIn,
    UserLearning,
    UserFavorite,
    Certificate,
    VolunteerProfile,
    VolunteerTask,
    VolunteerTaskApplication,
    VolunteerServiceRecord
  ],
  migrations: [__dirname.includes("dist") ? `${__dirname}/migrations/*.js` : "apps/api/src/migrations/*.ts"],
  synchronize: false,
  timezone: "+08:00"
});
