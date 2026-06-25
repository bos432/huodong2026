import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivityCategory } from "../../entities/activity-category.entity";
import { ActivityChannel } from "../../entities/activity-channel.entity";
import { ActivityReview } from "../../entities/activity-review.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
import { Activity } from "../../entities/activity.entity";
import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { Agent } from "../../entities/agent.entity";
import { AmbassadorApplication } from "../../entities/ambassador-application.entity";
import { AmbassadorApplicationFollowup } from "../../entities/ambassador-application-followup.entity";
import { AmbassadorCase } from "../../entities/ambassador-case.entity";
import { AmbassadorLandingSetting } from "../../entities/ambassador-landing-setting.entity";
import { Announcement } from "../../entities/announcement.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { Coupon } from "../../entities/coupon.entity";
import { ConversionEvent } from "../../entities/conversion-event.entity";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CourseOrder } from "../../entities/course-order.entity";
import { H5AuthCodeLog } from "../../entities/h5-auth-code-log.entity";
import { HomepageSection } from "../../entities/homepage-section.entity";
import { MiniprogramReleaseSetting } from "../../entities/miniprogram-release-setting.entity";
import { CheckIn } from "../../entities/check-in.entity";
import { CharityFundSetting } from "../../entities/charity-fund-setting.entity";
import { CharityFundTransaction } from "../../entities/charity-fund-transaction.entity";
import { CharityProjectDisbursement } from "../../entities/charity-project-disbursement.entity";
import { CharityProject } from "../../entities/charity-project.entity";
import { CharityProjectUpdate } from "../../entities/charity-project-update.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { MarketingPopup } from "../../entities/marketing-popup.entity";
import { Order } from "../../entities/order.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { PaymentCallbackLog } from "../../entities/payment-callback-log.entity";
import { PaymentTransaction } from "../../entities/payment-transaction.entity";
import { Refund } from "../../entities/refund.entity";
import { Registration } from "../../entities/registration.entity";
import { Tenant } from "../../entities/tenant.entity";
import { TenantRegionHitLog } from "../../entities/tenant-region-hit-log.entity";
import { TenantRegion } from "../../entities/tenant-region.entity";
import { TicketType } from "../../entities/ticket-type.entity";
import { User } from "../../entities/user.entity";
import { Certificate } from "../../entities/certificate.entity";
import { CommunityPost } from "../../entities/community-post.entity";
import { UserFavorite } from "../../entities/user-favorite.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { Waitlist } from "../../entities/waitlist.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { VolunteerProfile } from "../../entities/volunteer-profile.entity";
import { VolunteerServiceRecord } from "../../entities/volunteer-service-record.entity";
import { VolunteerTaskApplication } from "../../entities/volunteer-task-application.entity";
import { VolunteerTask } from "../../entities/volunteer-task.entity";
import { PaymentController, PublicController } from "./public.controller";
import { PaymentProviderService } from "./payment-provider.service";
import { PublicService } from "./public.service";
import { NotificationProviderService } from "../v1/notification-provider.service";
import { RefundCompletionService } from "../refund-completion.service";
import { CharityFundService } from "../charity-fund.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, AdminUser, UserWallet, WalletTransaction, Tenant, TenantRegion, TenantRegionHitLog, Agent, AgentPaymentAccount, AmbassadorLandingSetting, AmbassadorCase, AmbassadorApplication, AmbassadorApplicationFollowup, ActivityCategory, ActivityChannel, Activity, Announcement, HomepageSection, MarketingPopup, Registration, Order, OperationSetting, PaymentCallbackLog, PaymentTransaction, Refund, TicketType, Coupon, ConversionEvent, H5AuthCodeLog, MiniprogramReleaseSetting, ActivityReview, ActivityViewLog, Waitlist, MemberLevel, MemberProfile, MemberPointLog, CheckIn, CharityFundSetting, CharityFundTransaction, CharityProject, CharityProjectDisbursement, CharityProjectUpdate, VolunteerProfile, VolunteerTask, VolunteerTaskApplication, VolunteerServiceRecord, Course, CourseChapter, CourseLesson, CourseOrder, UserLearning, UserFavorite, Certificate, CommunityPost])],
  controllers: [PublicController, PaymentController],
  providers: [PublicService, PaymentProviderService, NotificationProviderService, RefundCompletionService, CharityFundService],
  exports: [PublicService, PaymentProviderService]
})
export class PublicModule {}
