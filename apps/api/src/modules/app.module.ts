import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { config as loadEnv } from "dotenv";
import fs from "fs";
import path from "path";
import { Activity } from "../entities/activity.entity";
import { ActivityCategory } from "../entities/activity-category.entity";
import { ActivityChannel } from "../entities/activity-channel.entity";
import { ActivityApprovalLog } from "../entities/activity-approval-log.entity";
import { ActivityField } from "../entities/activity-field.entity";
import { ActivityHost } from "../entities/activity-host.entity";
import { ActivityReview } from "../entities/activity-review.entity";
import { ActivitySection } from "../entities/activity-section.entity";
import { ActivityViewLog } from "../entities/activity-view-log.entity";
import { AdminLoginLog } from "../entities/admin-login-log.entity";
import { AdminMallMerchantAccess } from "../entities/admin-mall-merchant-access.entity";
import { AdminOperationLog } from "../entities/admin-operation-log.entity";
import { AdminUser } from "../entities/admin-user.entity";
import { AgentPaymentAccount } from "../entities/agent-payment-account.entity";
import { AgentSettlementTransfer } from "../entities/agent-settlement-transfer.entity";
import { AgentSettlement } from "../entities/agent-settlement.entity";
import { Agent } from "../entities/agent.entity";
import { AmbassadorApplication } from "../entities/ambassador-application.entity";
import { AmbassadorApplicationFollowup } from "../entities/ambassador-application-followup.entity";
import { AmbassadorCase } from "../entities/ambassador-case.entity";
import { AmbassadorLandingSetting } from "../entities/ambassador-landing-setting.entity";
import { Announcement } from "../entities/announcement.entity";
import { CheckIn } from "../entities/check-in.entity";
import { CharityFundSetting } from "../entities/charity-fund-setting.entity";
import { CharityFundTransaction } from "../entities/charity-fund-transaction.entity";
import { CharityProjectDisbursement } from "../entities/charity-project-disbursement.entity";
import { CharityProject } from "../entities/charity-project.entity";
import { CharityProjectUpdate } from "../entities/charity-project-update.entity";
import { Certificate } from "../entities/certificate.entity";
import { CommunityCheckIn } from "../entities/community-checkin.entity";
import { CheckInTask } from "../entities/checkin-task.entity";
import { CommunityActivity } from "../entities/community-activity.entity";
import { CommunityPost } from "../entities/community-post.entity";
import { CommunityPostComment } from "../entities/community-post-comment.entity";
import { CommunityPostLike } from "../entities/community-post-like.entity";
import { Coupon } from "../entities/coupon.entity";
import { ConversionEvent } from "../entities/conversion-event.entity";
import { Course } from "../entities/course.entity";
import { CourseChapter } from "../entities/course-chapter.entity";
import { CourseLesson } from "../entities/course-lesson.entity";
import { CourseOrder } from "../entities/course-order.entity";
import { H5AuthCodeLog } from "../entities/h5-auth-code-log.entity";
import { HomepageDecorationTemplate } from "../entities/homepage-decoration-template.entity";
import { HomepageDecorationVersion } from "../entities/homepage-decoration-version.entity";
import { HomepageSection } from "../entities/homepage-section.entity";
import { InviteCode } from "../entities/invite-code.entity";
import { MemberLevel } from "../entities/member-level.entity";
import { MemberPointLog } from "../entities/member-point-log.entity";
import { MemberProfile } from "../entities/member-profile.entity";
import { MarketingPopup } from "../entities/marketing-popup.entity";
import { AdAdvertiser } from "../entities/ad-advertiser.entity";
import { AdCampaign } from "../entities/ad-campaign.entity";
import { AdContract } from "../entities/ad-contract.entity";
import { AdDailyStat } from "../entities/ad-daily-stat.entity";
import { AdOfficialRevenueImport } from "../entities/ad-official-revenue-import.entity";
import { AdSettlementItem } from "../entities/ad-settlement-item.entity";
import { AdSettlement } from "../entities/ad-settlement.entity";
import { MallAddress } from "../entities/mall-address.entity";
import { MallCartItem } from "../entities/mall-cart-item.entity";
import { MallBrowseHistory } from "../entities/mall-browse-history.entity";
import { MallCategory } from "../entities/mall-category.entity";
import { MallCheckoutGroup } from "../entities/mall-checkout-group.entity";
import { MallCommission } from "../entities/mall-commission.entity";
import { MallCoupon } from "../entities/mall-coupon.entity";
import { MallCouponClaim } from "../entities/mall-coupon-claim.entity";
import { MallCouponUsage } from "../entities/mall-coupon-usage.entity";
import { MallFavorite } from "../entities/mall-favorite.entity";
import { MallFlashSale } from "../entities/mall-flash-sale.entity";
import { MallGroupBuy } from "../entities/mall-group-buy.entity";
import { MallGroupBuyRecord } from "../entities/mall-group-buy-record.entity";
import { MallInventoryLog } from "../entities/mall-inventory-log.entity";
import { MallLogisticsCompany } from "../entities/mall-logistics-company.entity";
import { MallMerchant } from "../entities/mall-merchant.entity";
import { MallMerchantPaymentAccount } from "../entities/mall-merchant-payment-account.entity";
import { MallOrderItem } from "../entities/mall-order-item.entity";
import { MallOrder } from "../entities/mall-order.entity";
import { MallPaymentCallbackLog } from "../entities/mall-payment-callback-log.entity";
import { MallPaymentTransaction } from "../entities/mall-payment-transaction.entity";
import { MallProduct } from "../entities/mall-product.entity";
import { MallPromotionCode } from "../entities/mall-promotion-code.entity";
import { MallRefund } from "../entities/mall-refund.entity";
import { MallRefundLog } from "../entities/mall-refund-log.entity";
import { MallReview } from "../entities/mall-review.entity";
import { MallSettlement } from "../entities/mall-settlement.entity";
import { MallSku } from "../entities/mall-sku.entity";
import { MiniprogramReleaseLog } from "../entities/miniprogram-release-log.entity";
import { MiniprogramReleaseSetting } from "../entities/miniprogram-release-setting.entity";
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
import { TenantRegionHitLog } from "../entities/tenant-region-hit-log.entity";
import { TenantRegion } from "../entities/tenant-region.entity";
import { TicketType } from "../entities/ticket-type.entity";
import { User } from "../entities/user.entity";
import { UserFavorite } from "../entities/user-favorite.entity";
import { UserLearning } from "../entities/user-learning.entity";
import { UserWallet } from "../entities/user-wallet.entity";
import { UserTag } from "../entities/user-tag.entity";
import { Waitlist } from "../entities/waitlist.entity";
import { WalletTransaction } from "../entities/wallet-transaction.entity";
import { VolunteerProfile } from "../entities/volunteer-profile.entity";
import { VolunteerServiceRecord } from "../entities/volunteer-service-record.entity";
import { VolunteerTaskApplication } from "../entities/volunteer-task-application.entity";
import { VolunteerTask } from "../entities/volunteer-task.entity";
import { AdminModule } from "./admin/admin.module";
import { HealthModule } from "./health/health.module";
import { CoursesModule } from "./courses/courses.module";
import { InstallModule } from "./install/install.module";
import { MallModule } from "./mall/mall.module";
import { PublicModule } from "./public/public.module";
import { V1Module } from "./v1/v1.module";

const entities = [User, UserWallet, WalletTransaction, Tenant, TenantRegion, TenantRegionHitLog, AdminLoginLog, AdminMallMerchantAccess, AdminOperationLog, AdminUser, Agent, AgentPaymentAccount, AgentSettlement, AgentSettlementTransfer, AmbassadorLandingSetting, AmbassadorCase, AmbassadorApplication, AmbassadorApplicationFollowup, ActivityCategory, ActivityChannel, ActivityApprovalLog, Activity, ActivityField, ActivityHost, ActivitySection, ActivityReview, ActivityViewLog, Announcement, Registration, Order, OperationSetting, PaymentCallbackLog, PaymentStatementRecord, PaymentTransaction, Refund, TicketType, Coupon, ConversionEvent, CheckIn, CharityFundSetting, CharityFundTransaction, CharityProject, CharityProjectDisbursement, CharityProjectUpdate, H5AuthCodeLog, HomepageSection, HomepageDecorationVersion, HomepageDecorationTemplate, MarketingPopup, AdAdvertiser, AdContract, AdCampaign, AdDailyStat, AdSettlement, AdSettlementItem, AdOfficialRevenueImport, MiniprogramReleaseSetting, MiniprogramReleaseLog, InviteCode, ShareVisit, Waitlist, UserTag, MemberLevel, MemberProfile, MallMerchant, MallMerchantPaymentAccount, MallCheckoutGroup, MallCategory, MallCoupon, MallCouponClaim, MallCouponUsage, MallCommission, MallPromotionCode, MallFavorite, MallBrowseHistory, MallFlashSale, MallGroupBuy, MallGroupBuyRecord, MallLogisticsCompany, MallProduct, MallSku, MallInventoryLog, MallAddress, MallCartItem, MallOrder, MallOrderItem, MallPaymentCallbackLog, MallPaymentTransaction, MallRefund, MallRefundLog, MallReview, MallSettlement, MemberPointLog, NotificationTemplate, Notification, NotificationSchedule, Course, CourseChapter, CourseLesson, CourseOrder, CommunityActivity, CheckInTask, CommunityPost, CommunityPostLike, CommunityPostComment, CommunityCheckIn, UserLearning, UserFavorite, Certificate, VolunteerProfile, VolunteerTask, VolunteerTaskApplication, VolunteerServiceRecord];

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
  MallModule,
  HealthModule,
    CoursesModule,
  V1Module
];

@Module({
  imports: [configModule, InstallModule, ...(installerBootstrapMode() ? [] : businessModules)]
})
export class AppModule {}
