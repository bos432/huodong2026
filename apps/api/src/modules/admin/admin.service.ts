import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, NotImplementedException, OnModuleDestroy, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { existsSync, mkdirSync } from "fs";
import { Brackets, DataSource, EntityManager, In, IsNull, LessThanOrEqual, MoreThan, Repository, SelectQueryBuilder } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { createHash, randomBytes } from "crypto";
import { ActivityCategory } from "../../entities/activity-category.entity";
import { ActivityChannel } from "../../entities/activity-channel.entity";
import { ActivityApprovalLog } from "../../entities/activity-approval-log.entity";
import { ActivityField } from "../../entities/activity-field.entity";
import { ActivityHost } from "../../entities/activity-host.entity";
import { ActivityReview } from "../../entities/activity-review.entity";
import { ActivitySection } from "../../entities/activity-section.entity";
import { ActivityViewLog } from "../../entities/activity-view-log.entity";
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
import { Coupon } from "../../entities/coupon.entity";
import { CouponClaim } from "../../entities/coupon-claim.entity";
import { CouponUsage } from "../../entities/coupon-usage.entity";
import { ConversionEvent } from "../../entities/conversion-event.entity";
import { Course } from "../../entities/course.entity";
import { CourseOrder, CourseOrderStatus } from "../../entities/course-order.entity";
import { CourseRefund } from "../../entities/course-refund.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { CommunityPost } from "../../entities/community-post.entity";
import { MallOrder } from "../../entities/mall-order.entity";
import { MallOrderItem } from "../../entities/mall-order-item.entity";
import { MallMerchant } from "../../entities/mall-merchant.entity";
import { MallCoupon } from "../../entities/mall-coupon.entity";
import { AdminMallMerchantAccess } from "../../entities/admin-mall-merchant-access.entity";
import { MallRefund } from "../../entities/mall-refund.entity";
import { MallPaymentTransaction } from "../../entities/mall-payment-transaction.entity";
import { MallCommission } from "../../entities/mall-commission.entity";
import { MallSettlement } from "../../entities/mall-settlement.entity";
import { H5AuthCodeLog } from "../../entities/h5-auth-code-log.entity";
import { HomepageDecorationTemplate } from "../../entities/homepage-decoration-template.entity";
import { HomepageDecorationVersion, HomepageDecorationSnapshotRow } from "../../entities/homepage-decoration-version.entity";
import { HomepagePublication } from "../../entities/homepage-publication.entity";
import { cloneHomepageSnapshot, homepagePublicationScopeKey, homepageSnapshotChanged } from "../../shared/homepage-publication";
import { ContentAudience, normalizeContentAudience } from "../../shared/content-audience";
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
import { Notification } from "../../entities/notification.entity";
import { Order } from "../../entities/order.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { PaymentCallbackLog } from "../../entities/payment-callback-log.entity";
import { PaymentStatementRecord } from "../../entities/payment-statement-record.entity";
import { PaymentTransaction } from "../../entities/payment-transaction.entity";
import { Registration } from "../../entities/registration.entity";
import { Refund } from "../../entities/refund.entity";
import { RedemptionCode } from "../../entities/redemption-code.entity";
import { RedemptionCodeUsage } from "../../entities/redemption-code-usage.entity";
import { ShareVisit } from "../../entities/share-visit.entity";
import { Tenant } from "../../entities/tenant.entity";
import { TenantRegionHitLog } from "../../entities/tenant-region-hit-log.entity";
import { TenantRegion, TenantRegionBoundaryPoint } from "../../entities/tenant-region.entity";
import { TicketType } from "../../entities/ticket-type.entity";
import { UserTag } from "../../entities/user-tag.entity";
import { User } from "../../entities/user.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { Waitlist, WaitlistStatus } from "../../entities/waitlist.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { ActivityStatus, FieldType, OrderStatus, PaymentMethod, RegistrationStatus, checkActivityContentCompliance } from "../../shared/domain";
import { MemberSegmentRules, normalizeMemberSegmentRules, validateMemberSegmentRulesInput } from "../../shared/member-segment-rules";
import { memberSegmentScopeMatches } from "../../shared/member-segment-scope";
import { isDuplicateEntryError } from "../../shared/database-errors";
import { inspectRuntimeConfig } from "../../shared/config-validation";
import { configWithLaunchOverrides, maskLaunchConfigSecrets, normalizeLaunchConfig, secureLaunchConfigForStorage } from "../../shared/launch-config";
import { applyTenantScopeToQuery, assertTenantAccessForActor, isTenantScopedActor, tenantRelationForActor } from "../../shared/tenant-scope";
import { AdminRole, normalizeAdminRole } from "./admin-roles";
import { defaultPermissionsForRole, effectivePermissionsForAdmin, normalizeAdminPermissions } from "./admin-permissions";
import { boundedPercentage } from "./dashboard-metrics";
import { PaymentAccountQueryDto } from "./dto";
import { defaultHomepageSections, HOMEPAGE_SECTION_TYPES, isPlainJsonObject, normalizePageKey } from "../homepage-defaults";
import { ActivityApprovalDto, ActivityChannelDto, ActivityDto, ActivityQueryDto, AdAdvertiserDto, AdCampaignDto, AdCenterQueryDto, AdContractDto, AdOfficialRevenueImportDto, AdSettlementGenerateDto, AdSettlementStatusDto, AdminQueryDto, AgentDto, AgentPaymentAccountDto, AgentSettlementGenerateDto, AgentSettlementPayDto, AgentSettlementQueryDto, AgentSettlementSandboxTransferDto, AmbassadorApplicationFollowupDto, AmbassadorApplicationQueryDto, AmbassadorApplicationStatusDto, AmbassadorCaseDto, AmbassadorSettingDto, AnalyticsQueryDto, AnnouncementDto, BulkActivityTagDto, CategoryDto, ChangeOwnPasswordDto, CharityDisbursementDto, CharityDisbursementPayDto, CharityDisbursementReviewDto, CharityProjectActionDto, CharityProjectDto, CharityProjectReviewDto, CharityProjectUpdateDto, CharitySettingDto, ConfirmPaymentDto, CouponDto, CouponRecordQueryDto, CreateAdminDto, CreateMemberDto, HomepageDecorationTemplateDto, HomepageDecorationVersionDto, HomepageReorderItemDto, HomepageSectionDto, LoginDto, MarketingPopupDto, MemberLevelAdjustDto, MemberLevelDto, MemberPointAdjustDto, MemberPointRuleDto, MemberQueryDto, OperationSettingDto, OrderQueryDto, OrderRemarkDto, PaymentStatementFetchDto, PaymentStatementImportDto, PaymentStatementImportItemDto, RedemptionCodeDto, RedemptionCodeUsageQueryDto, RefundDto, RefundQueryDto, RegistrationQueryDto, ResetMemberPasswordDto, ReviewDto, SupportQueryDto, TenantDto, TenantPermissionDto, TenantProfileDto, TenantRegionBulkImportDto, TenantRegionDto, TenantRegionHitLogQueryDto, TicketTypeDto, UpdateAdminDto, UpdateAdminPasswordDto, UpdateAdminStatusDto, UpdateMemberDto, UserTagDto, VolunteerCertificateDto, VolunteerProfileQueryDto, VolunteerProfileStatusDto, VolunteerServiceRecordDto, VolunteerServiceRecordQueryDto, VolunteerTaskApplicationStatusDto, VolunteerTaskDto, VolunteerTaskQueryDto, WaitlistQueryDto, WalletAdjustDto } from "./dto";
import { MarketingPopupEffectiveCheckQueryDto, MarketingPopupQueryDto } from "./dto";
import { AcceptAdminInviteDto, BulkRegistrationReviewDto, CreateAdminInviteDto, TenantSubscriptionChangeDto } from "./dto";
import { AnnouncementQueryDto } from "./dto";
import { financeDailyReport, financeRiskAlerts } from "./finance-operations";
import { tenantOperationHealth } from "./tenant-health";
import { tenantRegionShapesConflict } from "./tenant-region-geometry";
import { loadOperationSettingTenantForCreate } from "./operation-setting-tenant";
import { tenantRegionAuthorizationActive, tenantRegionAuthorizationReminder } from "./tenant-region-authorization";
import { TenantRegionApprovalDto } from "./dto";
import { OperationLogQueryDto } from "./dto";
import { decryptStoredSecret, encryptStoredSecret, maskedStoredSecret, mergeStoredSecret } from "../../shared/secret-storage";
import { fenToYuan, yuanToFen } from "../../shared/money";
import { assertRefundCapacity, canClaimRefundReview, resetRefundProviderForRetry } from "../../shared/refund-capacity";
import { verifyWalletLedgerChain } from "../../shared/wallet-ledger-hash";
import { allocateWalletFunds } from "../../shared/wallet-funds";
import { configuredChannelCheck, safeConnectivityUrl } from "./config-connectivity";
import { testObjectStorageConnection } from "../../shared/object-storage";
import { ObjectStorageService } from "../../shared/object-storage.service";
import { validatedUploadFile } from "../../shared/upload-security";
import { claimPrivateDocument, privateDocumentExists, readPrivateDocument, storePrivateDocument } from "../../shared/private-document";
import { createPrivateAssetToken, verifyPrivateAssetToken } from "../../shared/private-asset-token";
import { assertUploadMalwareSafe, uploadMalwareScanConfig } from "../../shared/upload-malware-scan";
import { checkInNonce, createCheckInTicket, verifyCheckInTicket } from "../../shared/check-in-ticket";
import { checkInRevocationAllowed } from "../../shared/check-in-governance";
import { offlineCheckInPolicy } from "../../shared/offline-check-in-policy";
import { expiredLevelCycle, growthFromPointLog, levelExpiry, manualLevelOverrideActive, memberLevelScopeKey, memberLevelSnapshot, resolveGrowthLevel } from "../../shared/member-level-engine";
import { sanitizeAuditValue } from "./audit-sanitizer";
import { auditDiff } from "./audit-diff";
import { normalizeTenantPackageExpiresAt, normalizeTenantPackagePlan, TenantEntitlementFeature, TenantQuotaKey, tenantEffectiveEntitlements, tenantFeatureAccess, tenantPackagePermissionTemplate, tenantQuotaAccess, tenantRenewalReminder, tenantSubscriptionStatus, tenantSubscriptionWriteRestriction } from "./tenant-subscription";
import { PaymentProviderService, SupportedPaymentProvider } from "../public/payment-provider.service";
import { BusinessJobService } from "../reliability/business-job.service";
import { ActivityLifecycleAction, canTransitionActivity, hasPaidPaymentMethod, scheduledPublishWindowIssue } from "./activity-lifecycle";
import { normalizeRefundPagination } from "./refund-pagination";
import { NotificationProviderService } from "../v1/notification-provider.service";
import { assessAgentTransferAccount, createAgentTransferAdapter, providerForPaymentMethod } from "../public/agent-transfer-adapters";
import { RefundCompletionService } from "../refund-completion.service";
import { MemberPointsService } from "../member-points/member-points.service";
import { paymentStatementOrderWhere } from "./payment-statement-import";
import { buildAgentSettlementTransferCapability } from "./agent-transfer-capability";
import { activityIdFromScopedRow, adminActivityScopeIds, adminCanAccessActivity, applyAdminActivityDataScope, normalizeAdminDataScope } from "./admin-data-scope";
import { CharityFundService } from "../charity-fund.service";
import { CharityFundTransaction } from "../../entities/charity-fund-transaction.entity";
import { CharityProject } from "../../entities/charity-project.entity";
import { Certificate } from "../../entities/certificate.entity";
import { renderCertificateSvg } from "../../shared/certificate-svg";
import { CredentialTemplateService } from "../credential-templates/credential-template.service";
import { automaticSmsScenes, normalizeAutomaticSmsSettings } from "../reliability/automatic-sms.service";
import { AutomaticNotificationService } from "../reliability/automatic-notification.service";
import { normalizeAutomaticWechatSettings } from "../reliability/automatic-wechat.service";
import { normalizePostEventAutomationSettings } from "../reliability/post-event-automation.service";
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
import { SupportWorkOrder } from "../../entities/support-work-order.entity";
import { SupportWorkOrderLog } from "../../entities/support-work-order-log.entity";
import { AnalyticsDailyMetric } from "../../entities/analytics-daily-metric.entity";
import { AnalyticsCalculationRun } from "../../entities/analytics-calculation-run.entity";
import { ANALYTICS_CALCULATION_VERSION, analyticsDateText, analyticsDayRange, conversionMetricAmountFen, conversionMetricKeys } from "../../shared/analytics-metrics";
import { growthCohortSummary } from "../../shared/analytics-growth";
import { AnalyticsRecomputeDto } from "./dto";
import { AnalyticsBusinessQueryDto } from "./dto";
import { CharityDisbursementCancelDto } from "./dto";
import { AnalyticsMetricQueryDto } from "./dto";
import { SupportWorkOrderActionDto, SupportWorkOrderCreateDto, SupportWorkOrderQueryDto } from "./dto";
import { SupportSensitiveRevealDto } from "./dto";
import { maskContactHandle, maskPhone } from "../../shared/data-masking";
import { ambassadorLevelForPoints, ambassadorProfileEffectiveStatus, ecosystemBusinessKey, ecosystemPhoneHash, nextEcosystemNo, partnerContractIsEffective } from "../../shared/ecosystem-crm-policy";
import { AmbassadorContributionActionDto, AmbassadorContributionDto, AmbassadorProfileQueryDto, AmbassadorProfileStatusDto, AmbassadorTaskDto, PartnerContractActionDto, PartnerContractDto, PartnerConversionDto } from "./dto";
import { canTransitionSupportWorkOrder, supportWorkOrderDueHours } from "../../shared/support-work-order-lifecycle";
import { supportWorkOrderBelongsToActor, supportWorkOrderScopeKey } from "../../shared/support-work-order-scope";
import { canTransitionVolunteerApplication, createVolunteerAttendanceToken, nextVolunteerNo, volunteerBusinessKey, volunteerHoursFromAttendance, volunteerPhoneHash, volunteerQualificationEffective } from "../../shared/volunteer-governance";
import { VolunteerAttendanceDto, VolunteerBadgeActionDto, VolunteerHourAdjustmentDto, VolunteerProofActionDto, VolunteerProofDto, VolunteerServiceActionDto, VolunteerTrainingActionDto, VolunteerTrainingRecordDto } from "./dto";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null; permissions?: string[]; requiredPermission?: string | null; dataScope?: Record<string, unknown>; clientIp?: string | null; userAgent?: string | null; requestId?: string | null };
type RefundListItem = {
  id: number; refundNo: string; amount: string; amountFen: number; status: string; operator: string | null; reason: string | null;
  reviewedBy: string | null; reviewRemark: string | null; reviewedAt: Date | string | null; completedAt: Date | string | null;
  providerRefundNo: string | null; providerRefundStatus: string | null; providerRefundSyncedAt: Date | string | null;
  providerRefundFailureReason: string | null; providerRefundRetryCount: number; providerRefundNextQueryAt: Date | string | null; createdAt: Date | string;
  tenant: { id: number; name: string } | null;
  order: {
    id: number; orderNo: string; amount: string; status: string; paymentMethod: string; transactionNo: string | null;
    agent: { id: number; name: string } | null;
    registration: { id: number; user: { id: number; phone: string | null; nickname: string | null } | null; activity: { id: number; title: string } | null } | null;
  } | null;
};
type TenantPermissionSettings = { activityPublishReviewRequired: boolean; registrationReviewEnabled: boolean; paymentAccountEditable: boolean; mallEnabled: boolean; packagePlan: string; packageExpiresAt: string | null; packageSuspended: boolean; packageReadOnly: boolean; entitlements?: any };
type MemberListQuery = {
  keyword?: string;
  activityId?: number;
  page?: number;
  pageSize?: number;
  sourceChannel?: string;
  wechatBound?: string | boolean;
  phoneBound?: string | boolean;
  levelId?: string | number;
  activeStart?: string;
  activeEnd?: string;
  quickFilter?: string;
  tag?: string;
  sortBy?: string;
  sortOrder?: string;
};
const TENANT_STAFF_ROLES = [AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff];

@Injectable()
export class AdminService implements OnModuleInit, OnModuleDestroy {
  private orderCloseTimer: NodeJS.Timeout | null = null;
  private activityLifecycleTimer: NodeJS.Timeout | null = null;
  private memberLifecycleTimer: NodeJS.Timeout | null = null;
  private analyticsRecomputeTimer: NodeJS.Timeout | null = null;
  private behaviorTagRefreshTimer: NodeJS.Timeout | null = null;
  private readonly memberLockQueues = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(TenantRegion) private readonly tenantRegions: Repository<TenantRegion>,
    @InjectRepository(TenantRegionHitLog) private readonly tenantRegionHitLogs: Repository<TenantRegionHitLog>,
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    @InjectRepository(AdminInvite) private readonly adminInvites: Repository<AdminInvite>,
    @InjectRepository(TenantSubscriptionEvent) private readonly tenantSubscriptionEvents: Repository<TenantSubscriptionEvent>,
    @InjectRepository(AdminLoginLog) private readonly adminLoginLogs: Repository<AdminLoginLog>,
    @InjectRepository(AdminOperationLog) private readonly operationLogs: Repository<AdminOperationLog>,
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    @InjectRepository(AgentPaymentAccount) private readonly agentPaymentAccounts: Repository<AgentPaymentAccount>,
    @InjectRepository(AgentSettlement) private readonly agentSettlements: Repository<AgentSettlement>,
    @InjectRepository(AgentSettlementTransfer) private readonly agentSettlementTransfers: Repository<AgentSettlementTransfer>,
    @InjectRepository(AmbassadorLandingSetting) private readonly ambassadorSettings: Repository<AmbassadorLandingSetting>,
    @InjectRepository(AmbassadorCase) private readonly ambassadorCases: Repository<AmbassadorCase>,
    @InjectRepository(AmbassadorApplication) private readonly ambassadorApplications: Repository<AmbassadorApplication>,
    @InjectRepository(AmbassadorApplicationFollowup) private readonly ambassadorFollowups: Repository<AmbassadorApplicationFollowup>,
    @InjectRepository(AmbassadorProfile) private readonly ambassadorProfiles: Repository<AmbassadorProfile>,
    @InjectRepository(AmbassadorTask) private readonly ambassadorTasks: Repository<AmbassadorTask>,
    @InjectRepository(AmbassadorContribution) private readonly ambassadorContributions: Repository<AmbassadorContribution>,
    @InjectRepository(PartnerContract) private readonly partnerContracts: Repository<PartnerContract>,
    @InjectRepository(Announcement) private readonly announcements: Repository<Announcement>,
    @InjectRepository(ActivityCategory) private readonly categories: Repository<ActivityCategory>,
    @InjectRepository(ActivityChannel) private readonly activityChannels: Repository<ActivityChannel>,
    @InjectRepository(ActivityApprovalLog) private readonly activityApprovalLogs: Repository<ActivityApprovalLog>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(ActivityVersion) private readonly activityVersions: Repository<ActivityVersion>,
    @InjectRepository(ActivityField) private readonly fields: Repository<ActivityField>,
    @InjectRepository(ActivityHost) private readonly hosts: Repository<ActivityHost>,
    @InjectRepository(ActivitySection) private readonly sections: Repository<ActivitySection>,
    @InjectRepository(ActivityReview) private readonly activityReviews: Repository<ActivityReview>,
    @InjectRepository(ActivityViewLog) private readonly activityViewLogs: Repository<ActivityViewLog>,
    @InjectRepository(Registration) private readonly registrations: Repository<Registration>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    @InjectRepository(PaymentCallbackLog) private readonly paymentCallbackLogs: Repository<PaymentCallbackLog>,
    @InjectRepository(PaymentStatementRecord) private readonly paymentStatementRecords: Repository<PaymentStatementRecord>,
    @InjectRepository(PaymentTransaction) private readonly paymentTransactions: Repository<PaymentTransaction>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    @InjectRepository(TicketType) private readonly ticketTypes: Repository<TicketType>,
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    @InjectRepository(ConversionEvent) private readonly conversionEvents: Repository<ConversionEvent>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(H5AuthCodeLog) private readonly h5AuthCodeLogs: Repository<H5AuthCodeLog>,
    @InjectRepository(HomepageSection) private readonly homepageSections: Repository<HomepageSection>,
    @InjectRepository(HomepageDecorationVersion) private readonly homepageDecorationVersions: Repository<HomepageDecorationVersion>,
    @InjectRepository(HomepageDecorationTemplate) private readonly homepageDecorationTemplates: Repository<HomepageDecorationTemplate>,
    @InjectRepository(MarketingPopup) private readonly marketingPopups: Repository<MarketingPopup>,
    @InjectRepository(AdAdvertiser) private readonly adAdvertisers: Repository<AdAdvertiser>,
    @InjectRepository(AdContract) private readonly adContracts: Repository<AdContract>,
    @InjectRepository(AdCampaign) private readonly adCampaigns: Repository<AdCampaign>,
    @InjectRepository(AdDailyStat) private readonly adDailyStats: Repository<AdDailyStat>,
    @InjectRepository(AdSettlement) private readonly adSettlements: Repository<AdSettlement>,
    @InjectRepository(AdSettlementItem) private readonly adSettlementItems: Repository<AdSettlementItem>,
    @InjectRepository(AdOfficialRevenueImport) private readonly adOfficialRevenueImports: Repository<AdOfficialRevenueImport>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(CheckInPoint) private readonly checkInPoints: Repository<CheckInPoint>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserWallet) private readonly userWallets: Repository<UserWallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactions: Repository<WalletTransaction>,
    @InjectRepository(Waitlist) private readonly waitlists: Repository<Waitlist>,
    @InjectRepository(UserTag) private readonly userTags: Repository<UserTag>,
    @InjectRepository(MemberLevel) private readonly memberLevels: Repository<MemberLevel>,
    @InjectRepository(MemberLevelChange) private readonly memberLevelChanges: Repository<MemberLevelChange>,
    @InjectRepository(MemberProfile) private readonly memberProfiles: Repository<MemberProfile>,
    @InjectRepository(MemberSegment) private readonly memberSegments: Repository<MemberSegment>,
    @InjectRepository(MemberSegmentSnapshot) private readonly memberSegmentSnapshots: Repository<MemberSegmentSnapshot>,
    @InjectRepository(MemberSegmentSnapshotMember) private readonly memberSegmentSnapshotMemberRepo: Repository<MemberSegmentSnapshotMember>,
    @InjectRepository(MemberBehaviorTagRun) private readonly memberBehaviorTagRuns: Repository<MemberBehaviorTagRun>,
    @InjectRepository(MemberPointLog) private readonly memberPointLogs: Repository<MemberPointLog>,
    @InjectRepository(MemberPointRule) private readonly memberPointRules: Repository<MemberPointRule>,
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(SupportWorkOrder) private readonly supportWorkOrders: Repository<SupportWorkOrder>,
    @InjectRepository(SupportWorkOrderLog) private readonly supportWorkOrderLogs: Repository<SupportWorkOrderLog>,
    @InjectRepository(AnalyticsDailyMetric) private readonly analyticsDailyMetrics: Repository<AnalyticsDailyMetric>,
    @InjectRepository(AnalyticsCalculationRun) private readonly analyticsCalculationRuns: Repository<AnalyticsCalculationRun>,
    @InjectRepository(ShareVisit) private readonly shareVisits: Repository<ShareVisit>,
    @InjectRepository(CharityFundTransaction) private readonly charityTransactionsRepo: Repository<CharityFundTransaction>,
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    @InjectRepository(VolunteerProfile) private readonly volunteerProfiles: Repository<VolunteerProfile>,
    @InjectRepository(VolunteerTrainingRecord) private readonly volunteerTrainingRecordsRepo: Repository<VolunteerTrainingRecord>,
    @InjectRepository(VolunteerBadgeDefinition) private readonly volunteerBadgeDefinitions: Repository<VolunteerBadgeDefinition>,
    @InjectRepository(VolunteerBadgeAward) private readonly volunteerBadgeAwards: Repository<VolunteerBadgeAward>,
    @InjectRepository(VolunteerTask) private readonly volunteerTasksRepo: Repository<VolunteerTask>,
    @InjectRepository(VolunteerTaskApplication) private readonly volunteerTaskApplicationsRepo: Repository<VolunteerTaskApplication>,
    @InjectRepository(VolunteerAttendanceRecord) private readonly volunteerAttendanceRecords: Repository<VolunteerAttendanceRecord>,
    @InjectRepository(VolunteerServiceRecord) private readonly volunteerServiceRecords: Repository<VolunteerServiceRecord>,
    @InjectRepository(VolunteerHourAdjustment) private readonly volunteerHourAdjustments: Repository<VolunteerHourAdjustment>,
    @InjectRepository(VolunteerServiceProof) private readonly volunteerServiceProofs: Repository<VolunteerServiceProof>,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly paymentProvider: PaymentProviderService,
    private readonly notificationProvider: NotificationProviderService,
    private readonly refundCompletion: RefundCompletionService,
    private readonly memberPoints: MemberPointsService,
    private readonly charityFund: CharityFundService,
    private readonly objectStorage: ObjectStorageService,
    private readonly businessJobs: BusinessJobService,
    private readonly credentialTemplates: CredentialTemplateService,
    private readonly automaticNotifications: AutomaticNotificationService
  ) {}

  async onModuleInit() {
    this.businessJobs.register("refund.provider-query", async (payload) => {
      const refundId = Number(payload.refundId);
      const tenantId = Number(payload.tenantId || 0) || null;
      await this.scanProviderRefunds({ username: "business-job-worker", role: AdminRole.SuperAdmin, tenantId });
      const refund = await this.refunds.findOneBy({ id: refundId });
      if (!refund) return { skipped: true, reason: "refund_not_found" };
      if (refund.status === "processing") throw new Error(refund.providerRefundFailureReason || "Provider refund remains processing");
      return { refundId, status: refund.status, providerRefundStatus: refund.providerRefundStatus || null };
    });
    this.businessJobs.register("agent-settlement.transfer-query", async (payload) => {
      const transferId = Number(payload.transferId);
      const tenantId = Number(payload.tenantId || 0) || null;
      await this.scanAgentSettlementTransfers({ username: "business-job-worker", role: AdminRole.SuperAdmin, tenantId });
      const transfer = await this.agentSettlementTransfers.findOneBy({ id: transferId });
      if (!transfer) return { skipped: true, reason: "transfer_not_found" };
      if (["pending", "processing"].includes(transfer.status)) throw new Error(transfer.failureReason || "Settlement transfer remains processing");
      if (transfer.status === "failed") throw new Error(transfer.failureReason || "Settlement transfer failed");
      return { transferId, status: transfer.status, providerTransferNo: transfer.providerTransferNo || null };
    });
    this.businessJobs.register("analytics.daily-recompute", async (payload) => {
      const tenantId = Number(payload.tenantId || 0) || null;
      const result = await this.recomputeAnalytics({ tenantId: tenantId || undefined, startDate: String(payload.startDate), endDate: String(payload.endDate) }, { username: "analytics-job-worker", role: AdminRole.SuperAdmin, tenantId });
      return { runId: result.runId, status: result.status, metricCount: result.metricCount, mismatchCount: result.mismatchCount };
    });
    this.businessJobs.register("member-tags.behavior-refresh", async (payload) => {
      const tenantId = Number(payload.tenantId || 0) || null;
      const idempotencyKey = String(payload.idempotencyKey || "").trim();
      const result = await this.refreshBehaviorTags(idempotencyKey, { username: "behavior-tag-worker", role: AdminRole.SuperAdmin, tenantId });
      return { runId: result.id, status: result.status, profileCount: result.profileCount, createdCount: result.createdCount, deletedCount: result.deletedCount, retainedCount: result.retainedCount };
    });
    mkdirSync(this.uploadRoot(), { recursive: true });
    await this.ensureDefaultAdmin();
    await this.ensureDevSeed();
    this.startOrderCloseWorker();
    this.startActivityLifecycleWorker();
    this.startMemberLifecycleWorker();
    this.startAnalyticsRecomputeWorker();
    this.startBehaviorTagRefreshWorker();
  }

  onModuleDestroy() {
    if (this.orderCloseTimer) clearInterval(this.orderCloseTimer);
    if (this.activityLifecycleTimer) clearInterval(this.activityLifecycleTimer);
    if (this.memberLifecycleTimer) clearInterval(this.memberLifecycleTimer);
    if (this.analyticsRecomputeTimer) clearInterval(this.analyticsRecomputeTimer);
    if (this.behaviorTagRefreshTimer) clearInterval(this.behaviorTagRefreshTimer);
  }

  async login(dto: LoginDto, context?: { clientIp?: string | null; userAgent?: string | null }) {
    const username = String(dto.username || "").trim();
    await this.assertAdminLoginRateLimit(username, context?.clientIp || null, context?.userAgent || null);
    const admin = await this.admins.findOne({ where: { username, enabled: true } });
    if (!admin) {
      await this.recordAdminLogin({ username, clientIp: context?.clientIp, userAgent: context?.userAgent, status: "failed", failureReason: "invalid_username" });
      throw new UnauthorizedException("用户名或密码错误");
    }
    if (!(await bcrypt.compare(dto.password, admin.passwordHash))) {
      await this.recordAdminLogin({ username, adminId: admin.id, tenantId: admin.tenant?.id, clientIp: context?.clientIp, userAgent: context?.userAgent, status: "failed", failureReason: "invalid_password" });
      throw new UnauthorizedException("用户名或密码错误");
    }
    if (admin.tenant && !admin.tenant.enabled) {
      await this.recordAdminLogin({ username, adminId: admin.id, tenantId: admin.tenant.id, clientIp: context?.clientIp, userAgent: context?.userAgent, status: "failed", failureReason: "tenant_disabled" });
      throw new ForbiddenException("当前商家已停用，请联系平台管理员");
    }
    await this.recordAdminLogin({ username, adminId: admin.id, tenantId: admin.tenant?.id, clientIp: context?.clientIp, userAgent: context?.userAgent, status: "success" });
    const role = normalizeAdminRole(admin.role);
    const tenantId = admin.tenant?.id ?? null;
    const permissions = this.effectiveAdminPermissions(admin, role, tenantId);
    const token = await this.jwt.signAsync({ sub: admin.id, username: admin.username, role, tenantId, sessionVersion: Number(admin.sessionVersion || 0) });
    return { token, admin: { id: admin.id, username: admin.username, role, tenantId, permissions, dataScope: normalizeAdminDataScope(admin.dataScope), tenant: admin.tenant ? this.publicTenant(admin.tenant) : null } };
  }

  async currentAdmin(admin?: AdminContext) {
    if (!admin?.id) throw new UnauthorizedException("当前账号不存在或已停用");
    const row = await this.admins.findOne({ where: { id: admin.id } });
    if (!row || !row.enabled) throw new UnauthorizedException("当前账号不存在或已停用");
    if (row.tenant && !row.tenant.enabled) throw new UnauthorizedException("当前商家已停用，请联系平台管理员");
    return this.publicAdmin(row);
  }

  listBusinessJobs(query: { status?: string; type?: string; tenantId?: number; keyword?: string; page?: number; pageSize?: number }, admin?: AdminContext) {
    return this.businessJobs.list(query, admin?.tenantId);
  }

  async replayBusinessJob(id: number, admin?: AdminContext) {
    const job = await this.businessJobs.replayForActor(id, admin?.tenantId);
    if (job.operationApplied) await this.logOperation(admin, "business_job.replay", "business_job", id, `重放业务任务：${job.type}`, { tenantId: job.tenantId, type: job.type, requestId: job.requestId, status: job.status });
    return job;
  }

  async cancelBusinessJob(id: number, admin?: AdminContext) {
    const job = await this.businessJobs.cancelForActor(id, admin?.tenantId);
    if (job.operationApplied) await this.logOperation(admin, "business_job.cancel", "business_job", id, `取消业务任务：${job.type}`, { tenantId: job.tenantId, type: job.type, requestId: job.requestId, status: job.status });
    return job;
  }

  async runDueBusinessJobs(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const result = await this.businessJobs.runDue(`admin:${admin?.id || "manual"}`);
    await this.logOperation(admin, "business_job.run_due", "business_job", null, "手工扫描到期业务任务", result);
    return result;
  }

  async listTenants(admin?: AdminContext, options: { includeSensitive?: boolean } = {}) {
    this.assertPlatformAdmin(admin);
    const includeSensitive = options.includeSensitive === true || effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions }).includes("tenant.manage");
    const rows = await this.tenants.find({ order: { id: "ASC" } });
    const adminCounts = await Promise.all(
      rows.map(async (tenant) => {
        const paymentAccountBuilder = () =>
          this.agentPaymentAccounts
            .createQueryBuilder("account")
            .leftJoin("account.tenant", "tenant")
            .leftJoin("account.agent", "agent")
            .leftJoin("agent.tenant", "agentTenant")
            .where("(tenant.id = :tenantId OR agentTenant.id = :tenantId)", { tenantId: tenant.id });
        const [adminCount, enabledAdminCount, agentCount, enabledAgentCount, paymentAccountCount, enabledPaymentAccountCount, totalActivityCount, pendingActivityCount, totalRegistrationCount, pendingRegistrationCount, totalOrderCount, totalCourseCount, publishedCourseCount, pendingRefundCount, callbackRiskCount, pendingReconciliationCount, homepageSectionCount, operationSetting] = await Promise.all([
          this.admins.count({ where: { tenant: { id: tenant.id } } }),
          this.admins.count({ where: { tenant: { id: tenant.id }, enabled: true } }),
          this.agents.count({ where: { tenant: { id: tenant.id } } }),
          this.agents.count({ where: { tenant: { id: tenant.id }, enabled: true } }),
          paymentAccountBuilder().getCount(),
          paymentAccountBuilder().andWhere("account.enabled = :enabled", { enabled: true }).getCount(),
          this.activities.count({ where: { tenant: { id: tenant.id } } }),
          this.activities.count({ where: { tenant: { id: tenant.id }, status: ActivityStatus.PendingApproval } }),
          this.registrations.count({ where: { tenant: { id: tenant.id } } }),
          this.registrations
            .createQueryBuilder("registration")
            .leftJoin("registration.activity", "activity")
            .where("registration.status = :status", { status: RegistrationStatus.PendingReview })
            .andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: tenant.id })
            .getCount(),
          this.orders.count({ where: { tenant: { id: tenant.id } } }),
          this.courses.count({ where: { tenant: { id: tenant.id } } }),
          this.courses.count({ where: { tenant: { id: tenant.id }, status: "published" } }),
          this.refunds.count({ where: { tenant: { id: tenant.id }, status: "pending" } }),
          this.paymentCallbackLogs
            .createQueryBuilder("callback")
            .where("(callback.signatureValid = :invalid OR callback.resultStatus IN (:...statuses))", { invalid: false, statuses: ["failed", "error"] })
            .andWhere("callback.tenantId = :tenantId", { tenantId: tenant.id })
            .getCount(),
          this.paymentTransactions.count({ where: { tenant: { id: tenant.id }, reconciliationStatus: "pending" } }),
          this.homepageSections.count({ where: { tenant: { id: tenant.id }, enabled: true } }),
          this.operationSettings
            .createQueryBuilder("setting")
            .leftJoinAndSelect("setting.tenant", "settingTenant")
            .where("(setting.id = :tenantId OR settingTenant.id = :tenantId)", { tenantId: tenant.id })
            .getOne()
        ]);
        const counts = { adminCount, enabledAdminCount, agentCount, enabledAgentCount, paymentAccountCount, enabledPaymentAccountCount, totalActivityCount, totalRegistrationCount, totalOrderCount, totalCourseCount, publishedCourseCount, pendingActivityCount, pendingRegistrationCount, pendingRefundCount, callbackRiskCount, pendingReconciliationCount, homepageSectionCount };
        const subscriptionStatus = tenantSubscriptionStatus(this.tenantPermissions(tenant));
        return [tenant.id, { ...counts, launchReadiness: this.tenantLaunchReadiness(tenant, counts, operationSetting), operationHealth: tenantOperationHealth({ enabled: tenant.enabled, subscriptionStatus, ...counts }) }] as const;
      })
    );
    const adminCountMap = new Map(adminCounts);
    return rows.map((tenant) => {
      const emptyCounts = { adminCount: 0, enabledAdminCount: 0, agentCount: 0, enabledAgentCount: 0, paymentAccountCount: 0, enabledPaymentAccountCount: 0, totalActivityCount: 0, totalRegistrationCount: 0, totalOrderCount: 0, totalCourseCount: 0, publishedCourseCount: 0, pendingActivityCount: 0, pendingRegistrationCount: 0, pendingRefundCount: 0, callbackRiskCount: 0, pendingReconciliationCount: 0, homepageSectionCount: 0 };
      const subscriptionStatus = tenantSubscriptionStatus(this.tenantPermissions(tenant));
      const counts = adminCountMap.get(tenant.id) || { ...emptyCounts, launchReadiness: this.tenantLaunchReadiness(tenant, emptyCounts, null), operationHealth: tenantOperationHealth({ enabled: tenant.enabled, subscriptionStatus, ...emptyCounts }) };
      return { ...this.publicTenantListItem(tenant, includeSensitive), ...counts };
    });
  }

  async saveTenant(dto: TenantDto, id?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const tenant = id ? await this.tenants.findOneBy({ id }) : this.tenants.create();
    if (!tenant) throw new NotFoundException("Tenant not found");
    const before = id ? this.tenantAuditSnapshot(tenant) : null;
    const code = dto.code.trim();
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(code)) throw new BadRequestException("商家编码必须为 2-64 位字母、数字、下划线或连字符");
    const exists = await this.tenants.findOne({ where: { code } });
    if (exists && exists.id !== tenant.id) throw new BadRequestException("商家编码已存在");
    const actorPermissions = effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions });
    const allowedSettings: Record<string, unknown> = {};
    if (this.isPlatformAdmin(admin) || actorPermissions.includes("tenant.permissions.manage")) {
      for (const key of ["activityPublishReviewRequired", "registrationReviewEnabled", "paymentAccountEditable", "mallEnabled", "entitlements"]) {
        if (dto.settings?.[key] !== undefined) allowedSettings[key] = dto.settings[key];
      }
    }
    if (this.isPlatformAdmin(admin) || actorPermissions.includes("tenant.subscription.manage")) {
      for (const key of ["packagePlan", "packageExpiresAt"]) {
        if (dto.settings?.[key] !== undefined) allowedSettings[key] = dto.settings[key];
      }
    }
    Object.assign(tenant, {
      code,
      name: dto.name.trim(),
      region: dto.region?.trim() || null,
      contactName: dto.contactName?.trim() || null,
      contactPhone: dto.contactPhone?.trim() || null,
      remark: dto.remark?.trim() || null,
      enabled: dto.enabled ?? true,
      settings: this.mergeTenantSettings(allowedSettings, tenant.settings)
    });
    const saved = await this.tenants.save(tenant);
    await this.logOperation(admin, id ? "tenant.update" : "tenant.create", "tenant", saved.id, id ? `更新商家：${saved.name}` : `创建商家：${saved.name}`, auditDiff(before, this.tenantAuditSnapshot(saved)));
    return this.publicTenant(saved);
  }

  async updateTenantPermissions(id: number, dto: TenantPermissionDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant) throw new NotFoundException("商家不存在");
    const before = this.tenantAuditSnapshot(tenant);
    const permissionSettings: Record<string, unknown> = {};
    for (const key of ["activityPublishReviewRequired", "registrationReviewEnabled", "paymentAccountEditable", "mallEnabled", "entitlements"]) {
      if ((dto as Record<string, unknown>)[key] !== undefined) permissionSettings[key] = (dto as Record<string, unknown>)[key];
    }
    tenant.settings = this.mergeTenantSettings(permissionSettings, tenant.settings);
    const saved = await this.tenants.save(tenant);
    await this.logOperation(admin, "tenant.permissions.update", "tenant", saved.id, `更新商家权限：${saved.name}`, auditDiff(before, this.tenantAuditSnapshot(saved)));
    return this.publicTenant(saved);
  }

  async listTenantSubscriptionEvents(tenantId: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    if (!(await this.tenants.findOneBy({ id: tenantId }))) throw new NotFoundException("商家不存在");
    return this.tenantSubscriptionEvents.find({ where: { tenant: { id: tenantId } }, order: { id: "DESC" }, take: 200 });
  }

  async changeTenantSubscription(id: number, dto: TenantSubscriptionChangeDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant) throw new NotFoundException("商家不存在");
    const beforeSettings = this.isPlainObject(tenant.settings) ? { ...tenant.settings } : {};
    const before = tenantSubscriptionStatus(beforeSettings);
    const currentPlan = normalizeTenantPackagePlan(beforeSettings.packagePlan);
    const requestedPlan = dto.packagePlan === undefined ? currentPlan : normalizeTenantPackagePlan(dto.packagePlan);
    const rank: Record<string, number> = { trial: 0, standard: 1, city_partner: 2, core_partner: 3, custom: 4 };
    if (dto.action === "upgrade" && rank[requestedPlan] <= rank[currentPlan]) throw new BadRequestException("升级操作必须选择更高等级套餐");
    if (dto.action === "downgrade" && rank[requestedPlan] >= rank[currentPlan]) throw new BadRequestException("降级操作必须选择更低等级套餐");
    const expiresAt = dto.packageExpiresAt === undefined ? normalizeTenantPackageExpiresAt(beforeSettings.packageExpiresAt) : normalizeTenantPackageExpiresAt(dto.packageExpiresAt);
    if (["renew", "extend"].includes(dto.action) && !expiresAt) throw new BadRequestException("续费或延期必须填写新的套餐到期日");
    if (["renew", "extend"].includes(dto.action) && expiresAt && new Date(`${expiresAt}T23:59:59Z`).getTime() <= Date.now()) throw new BadRequestException("新的套餐到期日必须晚于今天");
    const currentExpiresAt = normalizeTenantPackageExpiresAt(beforeSettings.packageExpiresAt);
    if (["renew", "extend"].includes(dto.action) && currentExpiresAt && expiresAt && expiresAt <= currentExpiresAt) throw new BadRequestException("新的套餐到期日必须晚于当前到期日");
    const nextInput: Record<string, unknown> = {};
    if (["upgrade", "downgrade"].includes(dto.action)) nextInput.packagePlan = requestedPlan;
    if (dto.packageExpiresAt !== undefined || ["renew", "extend"].includes(dto.action)) nextInput.packageExpiresAt = expiresAt;
    const next = this.mergeTenantSettings(nextInput, beforeSettings);
    if (dto.action === "suspend") next.packageSuspended = true;
    if (["renew", "restore", "upgrade", "downgrade", "extend"].includes(dto.action)) {
      next.packageSuspended = false;
      next.packageReadOnly = false;
    }
    const after = tenantSubscriptionStatus(next);
    if (dto.action === "restore" && !after.writable) throw new BadRequestException("当前到期日无法恢复运营，请同时填写新的有效到期日");
    const { saved, event } = await this.dataSource.transaction(async (manager) => {
      tenant.settings = next;
      const saved = await manager.getRepository(Tenant).save(tenant);
      const event = await manager.getRepository(TenantSubscriptionEvent).save(manager.getRepository(TenantSubscriptionEvent).create({ tenant: saved, operator: admin?.id ? ({ id: admin.id } as AdminUser) : null, action: dto.action, fromPlan: currentPlan, toPlan: normalizeTenantPackagePlan(next.packagePlan), fromExpiresAt: normalizeTenantPackageExpiresAt(beforeSettings.packageExpiresAt), toExpiresAt: normalizeTenantPackageExpiresAt(next.packageExpiresAt), beforeState: before as any, afterState: after as any, remark: dto.remark?.trim() || null }));
      return { saved, event };
    });
    await this.logOperation(admin, `tenant.subscription.${dto.action}`, "tenant", saved.id, `商家套餐${this.subscriptionActionLabel(dto.action)}：${saved.name}`, { eventId: event.id, fromPlan: currentPlan, toPlan: event.toPlan, fromExpiresAt: event.fromExpiresAt, toExpiresAt: event.toExpiresAt, status: after.status });
    return { tenant: this.publicTenant(saved), event };
  }

  async listTenantRegions(admin?: AdminContext, tenantId?: number) {
    this.assertPlatformAdmin(admin);
    const builder = this.tenantRegions.createQueryBuilder("region").leftJoinAndSelect("region.tenant", "tenant").orderBy("region.priority", "DESC").addOrderBy("region.id", "ASC");
    if (tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId });
    const rows = await builder.getMany();
    return rows.map((row) => this.publicTenantRegion(row));
  }

  async tenantRegionOptions(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const rows = await this.tenants.find({ order: { enabled: "DESC", name: "ASC", id: "ASC" }, take: 1000 });
    return rows.map((tenant) => ({ id: tenant.id, code: tenant.code, name: tenant.name, region: tenant.region, enabled: tenant.enabled }));
  }

  async listTenantRegionHitLogs(query: TenantRegionHitLogQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const includeSensitive = this.canViewSensitiveTenantRegionHitLogs(admin);
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.tenantRegionHitLogQuery(query, true)
      .orderBy("log.createdAt", "DESC")
      .addOrderBy("log.id", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [rows, total] = await builder.getManyAndCount();
    return {
      items: rows.map((row) => this.publicTenantRegionHitLog(row, includeSensitive)),
      total,
      page,
      pageSize
    };
  }

  async tenantRegionHitLogOptions(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const tenants = await this.tenants.find({ where: { enabled: true }, order: { name: "ASC", id: "ASC" }, take: 1000 });
    return tenants.map((tenant) => ({ id: tenant.id, code: tenant.code, name: tenant.name, region: tenant.region, enabled: tenant.enabled }));
  }

  async tenantRegionHitLogSummary(query: TenantRegionHitLogQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const overview = await this.tenantRegionHitLogQuery(query)
      .select("COUNT(log.id)", "total")
      .addSelect("SUM(CASE WHEN log.matched = true THEN 1 ELSE 0 END)", "matched")
      .getRawOne<{ total: string; matched: string }>();
    const total = Number(overview?.total || 0);
    const matched = Number(overview?.matched || 0);
    const unmatched = Math.max(total - matched, 0);
    const [sources, tenants, regions] = await Promise.all([
      this.tenantRegionHitLogQuery(query)
        .select("COALESCE(log.source, 'public_tenant_resolve')", "source")
        .addSelect("COUNT(log.id)", "count")
        .addSelect("SUM(CASE WHEN log.matched = true THEN 1 ELSE 0 END)", "matchedCount")
        .groupBy("COALESCE(log.source, 'public_tenant_resolve')")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany<{ source: string; count: string; matchedCount: string }>(),
      this.tenantRegionHitLogQuery(query)
        .andWhere("log.matched = :tenantStatsMatched", { tenantStatsMatched: true })
        .andWhere("(tenant.id IS NOT NULL OR regionTenant.id IS NOT NULL)")
        .select("COALESCE(tenant.id, regionTenant.id)", "tenantId")
        .addSelect("COALESCE(tenant.name, regionTenant.name)", "tenantName")
        .addSelect("COALESCE(tenant.code, regionTenant.code)", "tenantCode")
        .addSelect("COALESCE(tenant.region, regionTenant.region)", "tenantRegion")
        .addSelect("COUNT(log.id)", "count")
        .groupBy("COALESCE(tenant.id, regionTenant.id)")
        .addGroupBy("COALESCE(tenant.name, regionTenant.name)")
        .addGroupBy("COALESCE(tenant.code, regionTenant.code)")
        .addGroupBy("COALESCE(tenant.region, regionTenant.region)")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany<{ tenantId: string; tenantName: string; tenantCode: string; tenantRegion: string; count: string }>(),
      this.tenantRegionHitLogQuery(query)
        .andWhere("log.matched = :regionStatsMatched", { regionStatsMatched: true })
        .andWhere("region.id IS NOT NULL")
        .select("region.id", "regionId")
        .addSelect("region.name", "regionName")
        .addSelect("region.province", "province")
        .addSelect("region.city", "city")
        .addSelect("region.district", "district")
        .addSelect("COALESCE(tenant.name, regionTenant.name)", "tenantName")
        .addSelect("COALESCE(tenant.code, regionTenant.code)", "tenantCode")
        .addSelect("COUNT(log.id)", "count")
        .groupBy("region.id")
        .addGroupBy("region.name")
        .addGroupBy("region.province")
        .addGroupBy("region.city")
        .addGroupBy("region.district")
        .addGroupBy("COALESCE(tenant.name, regionTenant.name)")
        .addGroupBy("COALESCE(tenant.code, regionTenant.code)")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany<{ regionId: string; regionName: string; province: string; city: string; district: string; tenantName: string; tenantCode: string; count: string }>()
    ]);
    return {
      total,
      matched,
      unmatched,
      matchRate: this.ratio(matched, total),
      sources: sources.map((row) => {
        const count = Number(row.count || 0);
        const matchedCount = Number(row.matchedCount || 0);
        return { source: row.source || "public_tenant_resolve", count, matchedCount, matchRate: this.ratio(matchedCount, count) };
      }),
      tenants: tenants.map((row) => ({
        tenant: { id: Number(row.tenantId), name: row.tenantName, code: row.tenantCode, region: row.tenantRegion },
        count: Number(row.count || 0),
        share: this.ratio(Number(row.count || 0), matched)
      })),
      regions: regions.map((row) => ({
        region: { id: Number(row.regionId), name: row.regionName, province: row.province, city: row.city, district: row.district },
        tenant: { name: row.tenantName, code: row.tenantCode },
        count: Number(row.count || 0),
        share: this.ratio(Number(row.count || 0), matched)
      }))
    };
  }

  async exportTenantRegionHitLogs(query: TenantRegionHitLogQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const rows = await this.tenantRegionHitLogQuery(query, true)
      .orderBy("log.createdAt", "DESC")
      .addOrderBy("log.id", "DESC")
      .take(10000)
      .getMany();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("定位命中日志");
    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "定位时间", key: "createdAt", width: 22 },
      { header: "结果", key: "matched", width: 10 },
      { header: "商家", key: "tenantName", width: 24 },
      { header: "商家编码", key: "tenantCode", width: 18 },
      { header: "区域", key: "regionName", width: 24 },
      { header: "省", key: "province", width: 14 },
      { header: "市", key: "city", width: 14 },
      { header: "区县", key: "district", width: 14 },
      { header: "纬度", key: "latitude", width: 14 },
      { header: "经度", key: "longitude", width: 14 },
      { header: "距离(米)", key: "distanceMeters", width: 12 },
      { header: "来源", key: "source", width: 24 },
      { header: "客户端 IP", key: "clientIp", width: 20 },
      { header: "User-Agent", key: "userAgent", width: 48 }
    ];
    rows.forEach((row) => {
      const tenant = row.tenant || row.region?.tenant || null;
      sheet.addRow({
        id: row.id,
        createdAt: row.createdAt ? row.createdAt.toISOString().slice(0, 19).replace("T", " ") : "",
        matched: row.matched ? "已命中" : "未命中",
        tenantName: tenant?.name || "",
        tenantCode: tenant?.code || "",
        regionName: row.region?.name || "",
        province: row.region?.province || "",
        city: row.region?.city || "",
        district: row.region?.district || "",
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        distanceMeters: row.distanceMeters ?? "",
        source: row.source || "public_tenant_resolve",
        clientIp: row.clientIp || "",
        userAgent: row.userAgent || ""
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    await this.logExport(admin, "tenant_region_hit_logs", rows.length, query);
    return workbook.xlsx.writeBuffer();
  }

  async saveTenantRegion(dto: TenantRegionDto, id?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const tenant = await this.tenants.findOne({ where: { id: Number(dto.tenantId), enabled: true } });
    if (!tenant) throw new NotFoundException("商家不存在或已停用");
    const region = id ? await this.tenantRegions.findOne({ where: { id } }) : this.tenantRegions.create();
    if (!region) throw new NotFoundException("区域不存在");
    const normalized = this.normalizeTenantRegionDto(dto);
    const conflict = await this.findTenantRegionConflict({
      ...normalized,
      boundaryPoints: normalized.boundaryPoints === undefined ? region.boundaryPoints : normalized.boundaryPoints,
      tenantId: tenant.id,
      id: region.id || null
    });
    Object.assign(region, {
      tenant,
      province: normalized.province,
      city: normalized.city,
      district: normalized.district,
      name: normalized.name,
      latitude: normalized.latitude.toFixed(6),
      longitude: normalized.longitude.toFixed(6),
      radiusMeters: normalized.radiusMeters,
      ...(!id || normalized.boundaryPoints !== undefined ? { boundaryPoints: normalized.boundaryPoints ?? null } : {}),
      exclusive: normalized.exclusive,
      priority: normalized.priority,
      authorizationStatus: conflict ? "pending" : "approved",
      validFrom: normalized.validFrom,
      validUntil: normalized.validUntil,
      approvalRemark: conflict ? `与「${conflict.tenant.name} / ${conflict.name}」排他范围重叠，等待平台审批` : null,
      enabled: normalized.enabled,
      remark: normalized.remark
    });
    const saved = await this.tenantRegions.save(region);
    await this.logOperation(admin, id ? "tenant_region.update" : "tenant_region.create", "tenant_region", saved.id, id ? `更新区域保护：${saved.name}` : `创建区域保护：${saved.name}`, {
      tenantId: tenant.id,
      tenantName: tenant.name,
      latitude: saved.latitude,
      longitude: saved.longitude,
      radiusMeters: saved.radiusMeters,
      boundaryPoints: saved.boundaryPoints,
      exclusive: saved.exclusive,
      enabled: saved.enabled
    });
    return this.publicTenantRegion(saved);
  }

  async approveTenantRegion(id: number, dto: TenantRegionApprovalDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const region = await this.tenantRegions.findOne({ where: { id } });
    if (!region) throw new NotFoundException("区域不存在");
    if (region.authorizationStatus !== "pending") throw new BadRequestException("仅待审批区域可以执行批准或驳回");
    if (dto.status === "approved") {
      const conflict = await this.findTenantRegionConflict({
        id: region.id,
        tenantId: region.tenant.id,
        latitude: Number(region.latitude),
        longitude: Number(region.longitude),
        radiusMeters: Number(region.radiusMeters || 0),
        boundaryPoints: region.boundaryPoints || null,
        exclusive: region.exclusive,
        enabled: region.enabled
      });
      if (conflict) throw new BadRequestException(`区域与「${conflict.tenant.name} / ${conflict.name}」存在重叠，不能批准`);
    }
    region.authorizationStatus = dto.status;
    region.approvalRemark = this.truncateNullableText(dto.remark, 500);
    const saved = await this.tenantRegions.save(region);
    await this.logOperation(admin, `tenant_region.${dto.status}`, "tenant_region", saved.id, `${dto.status === "approved" ? "批准" : "驳回"}区域授权：${saved.name}`, { tenantId: saved.tenant.id, remark: saved.approvalRemark });
    return this.publicTenantRegion(saved);
  }

  async bulkImportTenantRegions(dto: TenantRegionBulkImportDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const items = Array.isArray(dto.items) ? dto.items : [];
    if (!items.length) throw new BadRequestException("请提供要导入的区域保护数据");
    if (items.length > 200) throw new BadRequestException("单次最多导入 200 条区域保护数据");
    const results = [];
    for (let index = 0; index < items.length; index += 1) {
      try {
        const region = await this.saveTenantRegion(items[index], undefined, admin);
        results.push({ index, success: true, region });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ index, success: false, message });
      }
    }
    const succeeded = results.filter((item) => item.success).length;
    const failed = results.length - succeeded;
    await this.logOperation(admin, "tenant_region.bulk_import", "tenant_region", null, `批量导入区域保护：成功 ${succeeded} 条，失败 ${failed} 条`, { total: results.length, succeeded, failed });
    return { total: results.length, succeeded, failed, items: results };
  }

  async deleteTenantRegion(id: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const row = await this.tenantRegions.findOne({ where: { id } });
    if (!row) throw new NotFoundException("区域不存在");
    await this.tenantRegions.delete(id);
    await this.logOperation(admin, "tenant_region.delete", "tenant_region", id, `删除区域保护：${row.name}`, { tenantId: row.tenant.id, tenantName: row.tenant.name });
    return { success: true };
  }

  async getTenantProfile(admin?: AdminContext) {
    const tenant = await this.currentTenantForAdmin(admin);
    return this.publicTenant(tenant);
  }

  async updateTenantProfile(dto: TenantProfileDto, admin?: AdminContext) {
    const tenant = await this.currentTenantForAdmin(admin);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("商家名称不能为空");
    const organizerLogoUrl = dto.organizerLogoUrl?.trim() || null;
    if (organizerLogoUrl && !organizerLogoUrl.startsWith("/uploads/") && !/^https:\/\//i.test(organizerLogoUrl)) throw new BadRequestException("主办方头像必须使用 HTTPS 或站内上传路径");
    const organizerProfile = {
      logoUrl: organizerLogoUrl,
      intro: dto.organizerIntro?.trim() || null,
      servicePromise: dto.organizerServicePromise?.trim() || null
    };
    Object.assign(tenant, {
      name,
      region: dto.region?.trim() || null,
      contactName: dto.contactName?.trim() || null,
      contactPhone: dto.contactPhone?.trim() || null,
      settings: { ...(this.isPlainObject(tenant.settings) ? tenant.settings : {}), organizerProfile }
    });
    const saved = await this.tenants.save(tenant);
    await this.logOperation(admin, "tenant.profile.update", "tenant", saved.id, `更新商家资料：${saved.name}`, {
      name: saved.name,
      region: saved.region,
      contactName: saved.contactName,
      contactPhone: saved.contactPhone,
      organizerProfile: { hasLogo: Boolean(organizerProfile.logoUrl), introLength: organizerProfile.intro?.length || 0, servicePromiseLength: organizerProfile.servicePromise?.length || 0 }
    });
    return this.publicTenant(saved);
  }

  async listAdmins(query: AdminQueryDto = {}, admin?: AdminContext) {
    const pageSize = Math.min(Math.max(Number(query.pageSize || 0), 0), 100);
    const page = Math.max(Number(query.page || 1), 1);
    const builder = this.admins.createQueryBuilder("admin").leftJoinAndSelect("admin.tenant", "tenant").select(["admin.id", "admin.username", "admin.role", "admin.permissions", "admin.dataScope", "admin.enabled", "admin.createdAt", "admin.updatedAt", "tenant.id", "tenant.code", "tenant.name", "tenant.region", "tenant.enabled"]).orderBy("admin.id", "ASC");
    if (this.isTenantScoped(admin)) builder.andWhere("tenant.id = :tenantId", { tenantId: admin?.tenantId });
    else if (query.tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });

    if (query.keyword?.trim()) {
      builder.andWhere("(admin.username LIKE :keyword OR admin.role LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.role?.trim()) {
      const role = normalizeAdminRole(query.role);
      if (role === AdminRole.SuperAdmin) builder.andWhere("admin.role IN (:...roles)", { roles: [AdminRole.SuperAdmin, "admin"] });
      else builder.andWhere("admin.role = :role", { role });
    }
    if (query.enabled === "true" || query.enabled === "false") {
      builder.andWhere("admin.enabled = :enabled", { enabled: query.enabled === "true" });
    }
    if (query.includeSmoke !== "true") {
      builder.andWhere("admin.username NOT LIKE :smokePrefix", { smokePrefix: "smoke\\_%" });
    }

    const hasDefaultAdminEnabled = this.isTenantScoped(admin) ? false : await this.admins.count({ where: { username: "admin", enabled: true } }).then((count) => count > 0);

    if (!pageSize) {
      const rows = await builder.getMany();
      return rows.map((admin) => this.publicAdmin(admin));
    }

    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((admin) => this.publicAdmin(admin)), total, page, pageSize, hasDefaultAdminEnabled };
  }

  async adminAccountOptions(requestedTenantId?: number, admin?: AdminContext) {
    let tenantId = requestedTenantId || null;
    let tenants: Tenant[];
    if (this.isTenantScoped(admin)) {
      tenantId = admin?.tenantId || null;
      const tenant = await this.tenants.findOneBy({ id: tenantId || 0 });
      if (!tenant) throw new NotFoundException("当前商家不存在或已停用");
      tenants = [tenant];
    } else {
      this.assertPlatformAdmin(admin);
      tenants = await this.tenants.find({ order: { id: "ASC" } });
      if (tenantId && !tenants.some((tenant) => tenant.id === tenantId)) throw new NotFoundException("商家不存在");
    }
    const activities = tenantId
      ? await this.activities.createQueryBuilder("activity").select(["activity.id", "activity.title"]).where("activity.tenantId = :tenantId", { tenantId }).orderBy("activity.id", "DESC").take(500).getMany()
      : [];
    return {
      tenants: tenants.map((tenant) => ({ id: tenant.id, code: tenant.code, name: tenant.name, region: tenant.region, enabled: tenant.enabled })),
      activities: activities.map((activity) => ({ id: activity.id, title: activity.title }))
    };
  }

  async listOperationLogs(query: OperationLogQueryDto = {}, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) this.assertPlatformAdmin(admin);
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 30), 1), 100);
    const builder = this.operationLogs.createQueryBuilder("log").orderBy("log.createdAt", "DESC");
    if (this.isTenantScoped(admin)) builder.andWhere("log.tenantId = :tenantId", { tenantId: admin?.tenantId || 0 });
    else if (query.tenantId) builder.andWhere("log.tenantId = :tenantId", { tenantId: query.tenantId });
    if (query.action?.trim()) builder.andWhere("log.action LIKE :action", { action: `%${query.action.trim()}%` });
    if (query.targetType?.trim()) builder.andWhere("log.targetType = :targetType", { targetType: query.targetType.trim() });
    if (query.adminUsername?.trim()) builder.andWhere("log.adminUsername LIKE :adminUsername", { adminUsername: `%${query.adminUsername.trim()}%` });
    if (query.requestId?.trim()) builder.andWhere("log.requestId = :requestId", { requestId: query.requestId.trim() });
    const startDate = this.tenantRegionHitLogDate(query.startDate, "开始日期");
    const endDate = this.tenantRegionHitLogDate(query.endDate, "结束日期", true);
    if (startDate) builder.andWhere("log.createdAt >= :startDate", { startDate });
    if (endDate) builder.andWhere("log.createdAt < :endDate", { endDate });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((row) => this.publicOperationLog(row, admin)), total, page, pageSize };
  }

  async operationLogOptions(admin?: AdminContext) {
    if (this.isTenantScoped(admin)) {
      const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
      return { tenants: tenant ? [this.publicLogTenantOption(tenant)] : [] };
    }
    this.assertPlatformAdmin(admin);
    const tenants = await this.tenants.find({ order: { id: "ASC" } });
    return { tenants: tenants.map((tenant) => this.publicLogTenantOption(tenant)) };
  }

  async exportOperationLogs(query: OperationLogQueryDto = {}, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) this.assertPlatformAdmin(admin);
    const builder = this.operationLogs.createQueryBuilder("log").orderBy("log.createdAt", "DESC").take(10000);
    if (this.isTenantScoped(admin)) builder.andWhere("log.tenantId = :tenantId", { tenantId: admin?.tenantId || 0 });
    else if (query.tenantId) builder.andWhere("log.tenantId = :tenantId", { tenantId: query.tenantId });
    if (query.action?.trim()) builder.andWhere("log.action LIKE :action", { action: `%${query.action.trim()}%` });
    if (query.targetType?.trim()) builder.andWhere("log.targetType = :targetType", { targetType: query.targetType.trim() });
    if (query.adminUsername?.trim()) builder.andWhere("log.adminUsername LIKE :adminUsername", { adminUsername: `%${query.adminUsername.trim()}%` });
    if (query.requestId?.trim()) builder.andWhere("log.requestId = :requestId", { requestId: query.requestId.trim() });
    const startDate = this.tenantRegionHitLogDate(query.startDate, "开始日期");
    const endDate = this.tenantRegionHitLogDate(query.endDate, "结束日期", true);
    if (startDate) builder.andWhere("log.createdAt >= :startDate", { startDate });
    if (endDate) builder.andWhere("log.createdAt < :endDate", { endDate });
    const rows = (await builder.getMany()).map((row) => this.publicOperationLog(row, admin));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("操作日志");
    sheet.columns = [
      { header: "时间", key: "createdAt", width: 22 }, { header: "商家ID", key: "tenantId", width: 12 }, { header: "管理员", key: "adminUsername", width: 20 },
      { header: "角色", key: "adminRole", width: 16 }, { header: "IP", key: "clientIp", width: 20 }, { header: "浏览器", key: "userAgent", width: 36 },
      { header: "动作", key: "action", width: 24 }, { header: "对象", key: "targetType", width: 20 }, { header: "对象ID", key: "targetId", width: 16 },
      { header: "摘要", key: "summary", width: 40 }, { header: "请求编号", key: "requestId", width: 28 }, { header: "详情", key: "detail", width: 60 }
    ];
    rows.forEach((row) => sheet.addRow({ ...row, createdAt: row.createdAt?.toISOString?.() || row.createdAt, detail: row.detail ? JSON.stringify(row.detail) : "" }));
    await this.logExport(admin, "operation_logs", rows.length, query);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async securityLogOptions(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const tenants = await this.tenants.find({ order: { id: "ASC" } });
    return { tenants: tenants.map((tenant) => this.publicLogTenantOption(tenant)) };
  }

  async listAdminLoginLogs(query: { username?: string; status?: string; tenantId?: number }, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.adminLoginLogs.createQueryBuilder("log").orderBy("log.createdAt", "DESC").take(300);
    if (query.username?.trim()) builder.andWhere("log.username LIKE :username", { username: `%${query.username.trim()}%` });
    if (query.status?.trim()) builder.andWhere("log.status = :status", { status: query.status.trim() });
    if (query.tenantId) builder.andWhere("log.tenantId = :tenantId", { tenantId: query.tenantId });
    const [items, total] = await builder.getManyAndCount();
    const summaryBuilder = this.adminLoginLogs.createQueryBuilder("log").select("log.status", "status").addSelect("COUNT(1)", "count").groupBy("log.status");
    if (query.tenantId) summaryBuilder.andWhere("log.tenantId = :tenantId", { tenantId: query.tenantId });
    const summaryRows = await summaryBuilder.getRawMany<{ status: string; count: string }>();
    const summary = summaryRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});
    return { items: items.map((row) => this.publicAdminLoginLog(row, admin)), total, summary };
  }

  async exportAdminLoginLogs(query: { username?: string; status?: string; tenantId?: number }, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.adminLoginLogs.createQueryBuilder("log").orderBy("log.createdAt", "DESC").take(10000);
    if (query.username?.trim()) builder.andWhere("log.username LIKE :username", { username: `%${query.username.trim()}%` });
    if (query.status?.trim()) builder.andWhere("log.status = :status", { status: query.status.trim() });
    if (query.tenantId) builder.andWhere("log.tenantId = :tenantId", { tenantId: query.tenantId });
    const rows = (await builder.getMany()).map((row) => this.publicAdminLoginLog(row, admin));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("后台登录日志");
    sheet.columns = [
      { header: "时间", key: "createdAt", width: 22 }, { header: "商家ID", key: "tenantId", width: 12 }, { header: "账号", key: "username", width: 24 },
      { header: "管理员ID", key: "adminId", width: 14 }, { header: "IP", key: "clientIp", width: 20 }, { header: "状态", key: "status", width: 18 },
      { header: "失败原因", key: "failureReason", width: 24 }, { header: "浏览器", key: "userAgent", width: 50 }
    ];
    rows.forEach((row) => sheet.addRow({ ...row, createdAt: row.createdAt?.toISOString?.() || row.createdAt }));
    await this.logExport(admin, "admin_login_logs", rows.length, query);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async listH5AuthCodeLogs(query: { phone?: string; status?: string; mode?: string }, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.h5AuthCodeLogs.createQueryBuilder("log").orderBy("log.createdAt", "DESC").take(300);
    if (query.phone?.trim()) builder.andWhere("log.phone LIKE :phone", { phone: `%${query.phone.trim()}%` });
    if (query.status?.trim()) builder.andWhere("log.status = :status", { status: query.status.trim() });
    if (query.mode?.trim()) builder.andWhere("log.mode = :mode", { mode: query.mode.trim() });
    const [items, total] = await builder.getManyAndCount();
    const summaryRows = await this.h5AuthCodeLogs.createQueryBuilder("log").select("log.status", "status").addSelect("COUNT(1)", "count").groupBy("log.status").getRawMany<{ status: string; count: string }>();
    const summary = summaryRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});
    return { items: items.map((row) => this.publicH5AuthCodeLog(row, admin)), total, summary };
  }

  async exportH5AuthCodeLogs(query: { phone?: string; status?: string; mode?: string }, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.h5AuthCodeLogs.createQueryBuilder("log").orderBy("log.createdAt", "DESC").take(10000);
    if (query.phone?.trim()) builder.andWhere("log.phone LIKE :phone", { phone: `%${query.phone.trim()}%` });
    if (query.status?.trim()) builder.andWhere("log.status = :status", { status: query.status.trim() });
    if (query.mode?.trim()) builder.andWhere("log.mode = :mode", { mode: query.mode.trim() });
    const rows = (await builder.getMany()).map((row) => this.publicH5AuthCodeLog(row, admin));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("H5验证码日志");
    sheet.columns = [
      { header: "时间", key: "createdAt", width: 22 }, { header: "手机号", key: "phone", width: 18 }, { header: "IP", key: "clientIp", width: 20 },
      { header: "模式", key: "mode", width: 12 }, { header: "状态", key: "status", width: 18 }, { header: "服务商", key: "provider", width: 20 },
      { header: "服务商消息号", key: "providerMessageId", width: 28 }, { header: "备注", key: "message", width: 50 }, { header: "过期时间", key: "expiresAt", width: 22 }
    ];
    rows.forEach((row) => sheet.addRow({ ...row, createdAt: row.createdAt?.toISOString?.() || row.createdAt, expiresAt: row.expiresAt?.toISOString?.() || row.expiresAt }));
    await this.logExport(admin, "h5_code_logs", rows.length, query);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async dashboard(admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) this.assertPlatformAdmin(admin);
    const tenantId = admin?.tenantId || 0;
    const isTenant = this.isTenantScoped(admin);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const today = this.businessDayRange();

    const activityCountBuilder = this.activities.createQueryBuilder("activity");
    const pendingActivityCountBuilder = this.activities.createQueryBuilder("activity").where("activity.status = :status", { status: ActivityStatus.PendingApproval });
    const registrationCountBuilder = this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity");
    const pendingRegistrationCountBuilder = this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity").where("registration.status = :status", { status: RegistrationStatus.PendingReview });
    const monthRegistrationCountBuilder = this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity").where("registration.createdAt >= :monthStart", { monthStart });
    const todayRegistrationCountBuilder = this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity").where("registration.createdAt >= :todayStart", { todayStart: today.start }).andWhere("registration.createdAt < :todayEnd", { todayEnd: today.end });
    const pendingCheckInCountBuilder = this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity").leftJoin(CheckIn, "linkedCheckIn", "linkedCheckIn.registrationId = registration.id").where("registration.status = :approvedStatus", { approvedStatus: RegistrationStatus.Approved }).andWhere("linkedCheckIn.id IS NULL");
    const orderCountBuilder = this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    const pendingOrderCountBuilder = this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").where("order.status = :status", { status: OrderStatus.PendingPayment });
    const pendingOfflinePaymentCountBuilder = this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").where("order.status = :pendingOfflineStatus", { pendingOfflineStatus: OrderStatus.PendingPayment }).andWhere("order.paymentMethod = :offlineMethod", { offlineMethod: PaymentMethod.Offline });
    const todayOrderCountBuilder = this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").where("order.createdAt >= :todayOrderStart", { todayOrderStart: today.start }).andWhere("order.createdAt < :todayOrderEnd", { todayOrderEnd: today.end });
    const paidOrderCountBuilder = this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").where("order.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] });
    const checkInCountBuilder = this.checkIns.createQueryBuilder("checkIn").leftJoin("checkIn.registration", "registration").leftJoin("registration.activity", "activity");
    const todayCheckInCountBuilder = this.checkIns.createQueryBuilder("checkIn").leftJoin("checkIn.registration", "registration").leftJoin("registration.activity", "activity").where("checkIn.createdAt >= :todayCheckInStart", { todayCheckInStart: today.start }).andWhere("checkIn.createdAt < :todayCheckInEnd", { todayCheckInEnd: today.end });
    const reviewCountBuilder = this.activityReviews.createQueryBuilder("review").leftJoin("review.activity", "activity");
    const viewCountBuilder = this.activityViewLogs.createQueryBuilder("view").leftJoin("view.activity", "activity");
    const notificationCountBuilder = this.notifications.createQueryBuilder("notification").leftJoin("notification.activity", "activity");
    const paidAmountBuilder = this.paymentTransactions.createQueryBuilder("transaction").select("COALESCE(SUM(transaction.amount), 0)", "sum").where("transaction.status = :status", { status: "success" }).andWhere("transaction.businessType = :activityBusinessType", { activityBusinessType: "activity" });
    const monthPaidAmountBuilder = this.paymentTransactions.createQueryBuilder("transaction").select("COALESCE(SUM(transaction.amount), 0)", "sum").where("transaction.status = :status", { status: "success" }).andWhere("transaction.businessType = :activityBusinessType", { activityBusinessType: "activity" }).andWhere("transaction.createdAt >= :monthStart", { monthStart });
    const refundAmountBuilder = this.refunds.createQueryBuilder("refund").select("COALESCE(SUM(refund.amount), 0)", "sum").where("refund.status = :status", { status: "completed" });
    const monthRefundAmountBuilder = this.refunds.createQueryBuilder("refund").select("COALESCE(SUM(refund.amount), 0)", "sum").where("refund.status = :status", { status: "completed" }).andWhere("refund.createdAt >= :monthStart", { monthStart });
    const refundCountBuilder = this.refunds.createQueryBuilder("refund").where("refund.status = :status", { status: "pending" });
    const callbackRiskCountBuilder = this.paymentCallbackLogs.createQueryBuilder("callback").where("(callback.signatureValid = :invalid OR callback.resultStatus IN (:...statuses))", { invalid: false, statuses: ["failed", "error"] });

    if (isTenant) {
      activityCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      pendingActivityCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      registrationCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      pendingRegistrationCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      monthRegistrationCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      todayRegistrationCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      pendingCheckInCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      orderCountBuilder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      pendingOrderCountBuilder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      pendingOfflinePaymentCountBuilder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      todayOrderCountBuilder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      paidOrderCountBuilder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      checkInCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      todayCheckInCountBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      reviewCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      viewCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      notificationCountBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });
      paidAmountBuilder.andWhere("transaction.tenantId = :tenantId", { tenantId });
      monthPaidAmountBuilder.andWhere("transaction.tenantId = :tenantId", { tenantId });
      refundAmountBuilder.andWhere("refund.tenantId = :tenantId", { tenantId });
      monthRefundAmountBuilder.andWhere("refund.tenantId = :tenantId", { tenantId });
      refundCountBuilder.andWhere("refund.tenantId = :tenantId", { tenantId });
      callbackRiskCountBuilder.andWhere("callback.tenantId = :tenantId", { tenantId });
    }

    const recentActivityBuilder = this.activities.createQueryBuilder("activity").leftJoinAndSelect("activity.tenant", "tenant").orderBy("activity.updatedAt", "DESC").take(8);
    if (isTenant) recentActivityBuilder.andWhere("activity.tenantId = :tenantId", { tenantId });

    const [tenantCount, disabledTenantCount, activityCount, pendingActivityCount, registrationCount, pendingRegistrationCount, monthRegistrationCount, todayRegistrationCount, pendingCheckInCount, orderCount, pendingOrderCount, pendingOfflinePaymentCount, todayOrderCount, paidOrderCount, checkInCount, todayCheckInCount, reviewCount, viewCount, notificationCount, paidAmount, monthPaidAmount, refundAmount, monthRefundAmount, pendingRefundCount, callbackRiskCount, recentActivities] = await Promise.all([
      isTenant ? Promise.resolve(1) : this.tenants.count(),
      isTenant ? Promise.resolve(0) : this.tenants.count({ where: { enabled: false } }),
      activityCountBuilder.getCount(),
      pendingActivityCountBuilder.getCount(),
      registrationCountBuilder.getCount(),
      pendingRegistrationCountBuilder.getCount(),
      monthRegistrationCountBuilder.getCount(),
      todayRegistrationCountBuilder.getCount(),
      pendingCheckInCountBuilder.getCount(),
      orderCountBuilder.getCount(),
      pendingOrderCountBuilder.getCount(),
      pendingOfflinePaymentCountBuilder.getCount(),
      todayOrderCountBuilder.getCount(),
      paidOrderCountBuilder.getCount(),
      checkInCountBuilder.getCount(),
      todayCheckInCountBuilder.getCount(),
      reviewCountBuilder.getCount(),
      viewCountBuilder.getCount(),
      notificationCountBuilder.getCount(),
      paidAmountBuilder.getRawOne<{ sum: string }>(),
      monthPaidAmountBuilder.getRawOne<{ sum: string }>(),
      refundAmountBuilder.getRawOne<{ sum: string }>(),
      monthRefundAmountBuilder.getRawOne<{ sum: string }>(),
      refundCountBuilder.getCount(),
      callbackRiskCountBuilder.getCount(),
      recentActivityBuilder.getMany()
    ]);
    const paidTotal = Number(paidAmount?.sum || 0);
    const monthPaidTotal = Number(monthPaidAmount?.sum || 0);
    const refundTotal = Number(refundAmount?.sum || 0);
    const monthRefundTotal = Number(monthRefundAmount?.sum || 0);
    const checkInRate = boundedPercentage(checkInCount, registrationCount);
    const registrationConversionRate = boundedPercentage(registrationCount, viewCount);
    const avgOrderAmount = paidOrderCount > 0 ? paidTotal / paidOrderCount : 0;

    return {
      scope: isTenant ? "tenant" : "platform",
      totals: {
        tenantCount,
        disabledTenantCount,
        activityCount,
        registrationCount,
        orderCount,
        checkInCount,
        reviewCount,
        viewCount,
        notificationCount,
        paidAmount: paidTotal.toFixed(2)
      },
      operations: {
        paidOrderCount,
        refundAmount: refundTotal.toFixed(2),
        netAmount: (paidTotal - refundTotal).toFixed(2),
        monthRegistrationCount,
        todayRegistrationCount,
        todayOrderCount,
        todayCheckInCount,
        monthPaidAmount: monthPaidTotal.toFixed(2),
        monthRefundAmount: monthRefundTotal.toFixed(2),
        monthNetAmount: (monthPaidTotal - monthRefundTotal).toFixed(2),
        checkInRate,
        registrationConversionRate,
        avgOrderAmount: avgOrderAmount.toFixed(2)
      },
      todos: {
        pendingActivityCount,
        pendingRegistrationCount,
        pendingOrderCount,
        pendingOfflinePaymentCount,
        pendingCheckInCount,
        pendingRefundCount,
        callbackRiskCount
      },
      alerts: [
        ...(pendingOfflinePaymentCount > 0 ? [{ type: "warning", title: "待确认线下收款", count: pendingOfflinePaymentCount, path: `/orders?status=${OrderStatus.PendingPayment}`, message: "线下收款订单需要财务确认后才能完成报名履约。" }] : []),
        ...(pendingCheckInCount > 0 ? [{ type: "warning", title: "待核销报名", count: pendingCheckInCount, path: "/check-in", message: "报名成功但未签到，现场核销页可继续处理。" }] : []),
        ...(pendingRefundCount > 0 ? [{ type: "danger", title: "待处理退款", count: pendingRefundCount, path: "/finance", message: "退款待办会影响用户体验和财务闭环。" }] : []),
        ...(callbackRiskCount > 0 ? [{ type: "danger", title: "支付回调异常", count: callbackRiskCount, path: "/finance", message: "存在验签失败或异常回调，请优先复核。" }] : [])
      ],
      recentActivities: await Promise.all(recentActivities.map((activity: Activity) => this.dashboardActivityRow(activity)))
    };
  }

  async mobileBootstrap(admin?: AdminContext) {
    const normalizedRole = normalizeAdminRole(admin?.role);
    const assignedPermissions = admin?.permissions || defaultPermissionsForRole(normalizedRole, Boolean(admin?.tenantId));
    const hasPermission = (key: string) => assignedPermissions.includes(key);
    const canWriteActivities = hasPermission("activity.manage");
    const canReviewRegistrations = hasPermission("registration.manage");
    const canViewRegistrations = hasPermission("registration.view");
    const canViewOrders = hasPermission("order.view");
    const canManageOrders = hasPermission("order.manage");
    const canViewRefunds = hasPermission("finance.view");
    const canManageRefunds = hasPermission("order.refund");
    const canCheckIn = hasPermission("checkin.manage");
    const canViewAnalytics = hasPermission("analytics.view");
    const canViewFinanceRisks = hasPermission("finance.view");
    const canManageFinanceRisks = hasPermission("finance.manage");
    const canViewPaymentAccounts = hasPermission("payment_account.view");
    const currentTenant = admin?.tenantId ? await this.tenants.findOneBy({ id: admin.tenantId }) : null;
    const [activityOptions, tenants, operationSetting] = await Promise.all([
      this.activityManagementOptions(admin),
      hasPermission("tenant.view") && !admin?.tenantId ? this.listTenants({ ...admin, requiredPermission: "tenant.view" }) : Promise.resolve(currentTenant ? [this.publicTenant(currentTenant)] : []),
      this.getOperationSetting(admin).catch(() => null)
    ]);
    return {
      admin: { id: admin?.id || null, username: admin?.username || "", role: normalizedRole, tenantId: admin?.tenantId || null, permissions: assignedPermissions, tenant: currentTenant ? this.publicTenant(currentTenant) : null },
      permissions: { canWriteActivities, canReviewRegistrations, canViewRegistrations, canViewOrders, canManageOrders, canViewRefunds, canManageRefunds, canCheckIn, canViewAnalytics, canViewFinanceRisks, canManageFinanceRisks, canSelectTenant: hasPermission("tenant.view") && !admin?.tenantId },
      tenants,
      categories: activityOptions.categories,
      agents: canViewPaymentAccounts ? activityOptions.agents : [],
      memberLevels: activityOptions.memberLevels,
      operationSetting,
      upload: { imageEndpoint: "/admin/uploads/images", maxImageSizeMb: 5, imageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] }
    };
  }

  charitySummary(admin?: AdminContext) {
    return this.charityFund.adminSummary(admin);
  }

  charityTransactions(admin?: AdminContext) {
    return this.charityFund.adminTransactions(admin);
  }

  charityTransactionsPage(admin: AdminContext | undefined, options: { page?: number; pageSize?: number; keyword?: string; type?: string; sourceType?: string }) {
    return this.charityFund.adminTransactionsPage(admin, options);
  }

  charityContributionCertificateImage(transactionId: number, admin?: AdminContext) {
    return this.charityFund.adminContributionCertificateImage(transactionId, admin);
  }

  charityProjects(admin?: AdminContext) {
    return this.charityFund.adminProjects(admin);
  }

  async saveCharityProject(dto: CharityProjectDto, id?: number, admin?: AdminContext) {
    await this.assertCurrentTenantFeatureWritable(admin, "charity");
    return this.charityFund.saveProject(dto, id, admin);
  }

  async actionCharityProject(id: number, dto: CharityProjectActionDto, admin?: AdminContext) {
    await this.assertCurrentTenantFeatureWritable(admin, "charity");
    return this.charityFund.actionProject(id, dto, admin);
  }

  async reviewCharityProject(id: number, dto: CharityProjectReviewDto, admin?: AdminContext) {
    await this.assertCurrentTenantFeatureWritable(admin, "charity");
    return this.charityFund.reviewProject(id, dto, admin);
  }

  async addCharityDisbursement(projectId: number, dto: CharityDisbursementDto, admin?: AdminContext) {
    await this.assertCurrentTenantFeatureWritable(admin, "charity");
    return this.charityFund.addDisbursement(projectId, dto, admin);
  }

  async reviewCharityDisbursement(id: number, dto: CharityDisbursementReviewDto, admin?: AdminContext) {
    await this.assertCurrentTenantFeatureWritable(admin, "charity");
    return this.charityFund.reviewDisbursement(id, dto, admin);
  }

  async payCharityDisbursement(id: number, dto: CharityDisbursementPayDto, admin?: AdminContext) {
    await this.assertCurrentTenantFeatureWritable(admin, "charity");
    return this.charityFund.payDisbursement(id, dto, admin);
  }

  async cancelCharityDisbursement(id: number, dto: CharityDisbursementCancelDto, admin?: AdminContext) {
    await this.assertCurrentTenantFeatureWritable(admin, "charity");
    return this.charityFund.cancelDisbursement(id, dto, admin);
  }

  charityProjectUpdates(projectId: number, admin?: AdminContext) {
    return this.charityFund.adminProjectUpdates(projectId, admin);
  }

  async saveCharityProjectUpdate(projectId: number, dto: CharityProjectUpdateDto, id?: number, admin?: AdminContext) {
    await this.assertCurrentTenantFeatureWritable(admin, "charity");
    return this.charityFund.saveProjectUpdate(projectId, dto, id, admin);
  }

  charitySetting(admin?: AdminContext) {
    return this.charityFund.getSetting(admin);
  }

  async saveCharitySetting(dto: CharitySettingDto, admin?: AdminContext) {
    await this.assertCurrentTenantFeatureWritable(admin, "charity");
    return this.charityFund.saveSetting(dto, admin);
  }

  async charityOverview(admin?: AdminContext) {
    const [summary, projects, transactions] = await Promise.all([
      this.charityFund.adminSummary(admin),
      this.charityFund.adminProjects(admin),
      this.charityFund.adminTransactions(admin, 20)
    ]);
    const pendingProjects = projects.filter((project: any) => ["pending_execution", "executing", "pending_acceptance"].includes(project.status));
    const missingProof = projects.filter((project: any) => (project.disbursements || []).some((item: any) => !item.proofUrl));
    const missingUpdates = projects.filter((project: any) => project.publicVisible !== false && !(project.updates || []).length);
    const pendingAcceptance = projects.filter((project: any) => project.status === "pending_acceptance");
    return {
      kpis: {
        availableAmount: summary.availableAmount,
        totalAccrued: summary.totalAccrued,
        totalDisbursed: summary.totalDisbursed,
        publicProjects: projects.filter((project: any) => project.publicVisible !== false).length,
        pendingProjects: pendingProjects.length
      },
      todos: [
        { key: "missing_proof", label: "有拨付无凭证", count: missingProof.length },
        { key: "missing_updates", label: "有项目无动态", count: missingUpdates.length },
        { key: "pending_acceptance", label: "已执行未验收", count: pendingAcceptance.length }
      ],
      alerts: [
        ...missingProof.slice(0, 5).map((project: any) => ({ level: "warning", message: `公益项目「${project.title}」存在拨付无凭证` })),
        ...missingUpdates.slice(0, 5).map((project: any) => ({ level: "info", message: `公益项目「${project.title}」暂无执行动态` })),
        ...pendingAcceptance.slice(0, 5).map((project: any) => ({ level: "warning", message: `公益项目「${project.title}」待验收` }))
      ],
      recentRecords: { projects: projects.slice(0, 8), transactions: transactions.slice(0, 8) }
    };
  }

  async ambassadorSetting(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    return this.publicAmbassadorSetting(await this.ensureAmbassadorSetting());
  }

  async ambassadorOverview(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const now = new Date();
    const [applications, followups, profiles, contracts, contributions] = await Promise.all([
      this.ambassadorApplications.find({ order: { updatedAt: "DESC" }, take: 500 }),
      this.ambassadorFollowups.find({ order: { createdAt: "DESC" }, take: 20 }),
      this.ambassadorProfiles.find({ order: { updatedAt: "DESC" }, take: 500 }),
      this.partnerContracts.find({ order: { createdAt: "DESC" }, take: 500 }),
      this.ambassadorContributions.find({ order: { createdAt: "DESC" }, take: 500 })
    ]);
    const scoreOf = (row: AmbassadorApplication) => Number(row.cityResourceScore || 0) + Number(row.communityScore || 0) + Number(row.contentScore || 0) + Number(row.charityScore || 0) + Number(row.deliveryScore || 0);
    const waitFollow = applications.filter((row) => ["pending", "contacted", "screened"].includes(row.status));
    const highIntent = applications.filter((row) => row.priority === "high" || scoreOf(row) >= 18);
    const interview = applications.filter((row) => row.status === "interview");
    const activated = applications.filter((row) => row.status === "activated");
    const overdue = applications.filter((row) => row.nextFollowAt && row.nextFollowAt.getTime() < now.getTime() && !["activated", "rejected"].includes(row.status));
    const activeAmbassadors = profiles.filter((row) => ambassadorProfileEffectiveStatus(row.status, row.expiresAt, now) === "active");
    const expiringAmbassadors = activeAmbassadors.filter((row) => row.expiresAt.getTime() <= now.getTime() + 30 * 86400000);
    const pendingContracts = contracts.filter((row) => row.status === "pending_review");
    const activeContracts = contracts.filter((row) => partnerContractIsEffective(row, now));
    const convertedPartners = applications.filter((row) => row.kind === "partner" && row.convertedTenant).length;
    return {
      kpis: { total: applications.length, waitFollow: waitFollow.length, highIntent: highIntent.length, interview: interview.length, activated: activated.length, overdue: overdue.length, activeAmbassadors: activeAmbassadors.length, expiringAmbassadors: expiringAmbassadors.length, approvedContributions: contributions.filter((row) => row.status === "approved").length, pendingContracts: pendingContracts.length, activeContracts: activeContracts.length, convertedPartners },
      todos: [
        { key: "wait_follow", label: "待跟进", count: waitFollow.length },
        { key: "high_intent", label: "高意向", count: highIntent.length },
        { key: "interview", label: "待面谈", count: interview.length },
        { key: "overdue", label: "超期未跟进", count: overdue.length },
        { key: "expiring_ambassador", label: "30 天内到期大使", count: expiringAmbassadors.length },
        { key: "pending_contract", label: "待复核伙伴合同", count: pendingContracts.length }
      ],
      alerts: [...overdue.slice(0, 5).map((row) => ({ level: "warning", message: `招募线索「${row.name}」已超期未跟进` })), ...expiringAmbassadors.slice(0, 3).map((row) => ({ level: "warning", message: `大使「${row.name}」身份将在 ${row.expiresAt.toISOString().slice(0, 10)} 到期` }))],
      recentRecords: { applications: applications.slice(0, 8).map((row) => this.publicAmbassadorApplication(row)), followups: followups.map((row) => this.publicAmbassadorFollowup(row)) }
    };
  }

  async saveAmbassadorSetting(dto: AmbassadorSettingDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const setting = await this.ensureAmbassadorSetting();
    setting.enabled = dto.enabled === undefined ? setting.enabled : Boolean(dto.enabled);
    setting.config = this.mergeAmbassadorConfig(dto.config, setting.config);
    const saved = await this.ambassadorSettings.save(setting);
    await this.logOperation(admin, "ambassador.settings.update", "ambassador", saved.id, "更新文化大使落地页配置", { enabled: saved.enabled });
    return this.publicAmbassadorSetting(saved);
  }

  async ambassadorCasesList(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    return this.ambassadorCases.find({ order: { sortOrder: "ASC", id: "ASC" } });
  }

  async saveAmbassadorCase(dto: AmbassadorCaseDto, id?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const row = id ? await this.ambassadorCases.findOneBy({ id }) : this.ambassadorCases.create();
    if (!row) throw new NotFoundException("案例不存在");
    row.name = dto.name.trim();
    if (!row.name) throw new BadRequestException("案例姓名不能为空");
    row.field = this.nullableText(dto.field);
    row.avatarUrl = this.nullableText(dto.avatarUrl);
    row.metrics = this.nullableText(dto.metrics);
    row.quote = this.nullableText(dto.quote);
    row.sortOrder = Number(dto.sortOrder ?? row.sortOrder ?? 0);
    row.enabled = dto.enabled === undefined ? row.enabled !== false : Boolean(dto.enabled);
    const saved = await this.ambassadorCases.save(row);
    await this.logOperation(admin, id ? "ambassador.case.update" : "ambassador.case.create", "ambassador_case", saved.id, `${id ? "更新" : "新增"}文化大使案例：${saved.name}`, { enabled: saved.enabled });
    return saved;
  }

  async ambassadorApplicationsList(query: AmbassadorApplicationQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const rows = await this.ambassadorApplicationRows(query);
    return rows.map((row) => this.publicAmbassadorApplication(row));
  }

  private ambassadorApplicationRows(query: AmbassadorApplicationQueryDto = {}, kind?: "ambassador" | "partner") {
    const builder = this.ambassadorApplications.createQueryBuilder("application")
      .leftJoinAndSelect("application.ownerAdmin", "ownerAdmin")
      .leftJoinAndSelect("application.convertedTenant", "convertedTenant")
      .leftJoinAndSelect("application.convertedMerchant", "convertedMerchant")
      .orderBy("application.id", "DESC");
    if (kind) builder.andWhere("application.kind = :kind", { kind });
    const status = String(query.status || "").trim();
    if (status) builder.andWhere("application.status = :status", { status });
    const priority = String(query.priority || "").trim();
    if (priority) builder.andWhere("application.priority = :priority", { priority });
    const source = String(query.source || "").trim();
    if (source) builder.andWhere("application.source = :source", { source });
    const keyword = String(query.keyword || "").trim();
    if (keyword) {
      builder.andWhere("(application.name LIKE :keyword OR application.phone LIKE :keyword OR application.city LIKE :keyword OR application.expertise LIKE :keyword OR application.wechat LIKE :keyword OR application.assignee LIKE :keyword)", { keyword: `%${keyword}%` });
    }
    return builder.take(500).getMany();
  }

  async exportAmbassadorApplications(query: AmbassadorApplicationQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const rows = await this.ambassadorApplicationRows(query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("ambassador-applications");
    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "姓名", key: "name", width: 14 },
      { header: "手机号", key: "phone", width: 18 },
      { header: "城市", key: "city", width: 16 },
      { header: "方向/需求", key: "expertise", width: 24 },
      { header: "微信号", key: "wechat", width: 20 },
      { header: "申请类型", key: "source", width: 16 },
      { header: "渠道码", key: "channelCode", width: 18 },
      { header: "状态", key: "status", width: 14 },
      { header: "线索等级", key: "priority", width: 12 },
      { header: "跟进人", key: "assignee", width: 14 },
      { header: "下次跟进", key: "nextFollowAt", width: 22 },
      { header: "备注", key: "remark", width: 36 },
      { header: "提交时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) =>
      sheet.addRow({
        id: row.id,
        name: row.name,
        phone: row.phone,
        city: row.city,
        expertise: row.expertise,
        wechat: row.wechat,
        source: this.ambassadorApplicationSourceText(row.source),
        channelCode: row.channelCode || "",
        status: row.status,
        priority: row.priority || "normal",
        assignee: row.assignee || "",
        nextFollowAt: row.nextFollowAt ? row.nextFollowAt.toISOString().slice(0, 19).replace("T", " ") : "",
        remark: row.remarkEncrypted ? decryptStoredSecret(row.remarkEncrypted) : row.remark || "",
        createdAt: row.createdAt ? row.createdAt.toISOString().slice(0, 19).replace("T", " ") : ""
      })
    );
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    await this.logExport(admin, "ambassador_applications", rows.length, query);
    return workbook.xlsx.writeBuffer();
  }

  async revealAmbassadorApplicationContact(id: number, dto: SupportSensitiveRevealDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const reason = String(dto.reason || "").trim();
    if (!reason) throw new BadRequestException("请填写查看完整联系方式的理由");
    const row = await this.ambassadorApplications.findOneBy({ id });
    if (!row) throw new NotFoundException("申请记录不存在");
    await this.logOperation(admin, "ambassador.sensitive_reveal", "ambassador_application", row.id, `授权查看大使申请联系方式：${row.name}`, { reason, fields: ["phone", "wechat"] });
    return { applicationId: row.id, phone: row.phone, wechat: row.wechat, reason, revealedAt: new Date() };
  }

  async partnerApplicationsList(query: AmbassadorApplicationQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const rows = await this.ambassadorApplicationRows(query, "partner");
    return rows.map((row) => this.publicAmbassadorApplication(row));
  }

  async updatePartnerApplication(id: number, dto: AmbassadorApplicationStatusDto, admin?: AdminContext) {
    await this.assertPartnerApplication(id, admin);
    return this.updateAmbassadorApplication(id, { ...dto, kind: "partner" }, admin);
  }

  async partnerApplicationFollowups(id: number, admin?: AdminContext) {
    await this.assertPartnerApplication(id, admin);
    return this.ambassadorApplicationFollowups(id, admin);
  }

  async createPartnerApplicationFollowup(id: number, dto: AmbassadorApplicationFollowupDto, admin?: AdminContext) {
    await this.assertPartnerApplication(id, admin);
    return this.createAmbassadorApplicationFollowup(id, dto, admin);
  }

  async revealPartnerApplicationContact(id: number, dto: SupportSensitiveRevealDto, admin?: AdminContext) {
    const row = await this.assertPartnerApplication(id, admin);
    const reason = String(dto.reason || "").trim();
    if (!reason) throw new BadRequestException("请填写查看完整联系方式的理由");
    await this.logOperation(admin, "partner.application.sensitive_reveal", "ambassador_application", row.id, `授权查看合作伙伴联系方式：${row.name}`, { reason, fields: ["phone", "wechat"] });
    return { applicationId: row.id, phone: row.phone, wechat: row.wechat, reason, revealedAt: new Date() };
  }

  private ambassadorApplicationSourceText(source?: string | null) {
    const map: Record<string, string> = {
      dean_recruit: "院长招募",
      ambassador_apply: "大使申请",
      aid_personal: "个人帮扶",
      aid_project: "项目帮扶",
      volunteer_apply: "志愿者",
      brand_story_contact: "品牌咨询"
    };
    return map[String(source || "")] || source || "文化大使旧入口";
  }

  private publicAmbassadorApplication(row: AmbassadorApplication) {
    return {
      id: row.id,
      kind: row.kind,
      name: row.name,
      phone: maskPhone(row.phone),
      city: row.city,
      province: row.province,
      district: row.district,
      organizationName: row.organizationName,
      cooperationIntent: row.cooperationIntent,
      expertise: row.expertise,
      experience: row.experience,
      wechat: maskContactHandle(row.wechat),
      source: row.source,
      channelCode: row.channelCode,
      assignee: row.assignee,
      ownerAdmin: row.ownerAdmin ? { id: row.ownerAdmin.id, username: row.ownerAdmin.username } : null,
      priority: row.priority,
      cityResourceScore: row.cityResourceScore,
      communityScore: row.communityScore,
      contentScore: row.contentScore,
      charityScore: row.charityScore,
      deliveryScore: row.deliveryScore,
      nextFollowAt: row.nextFollowAt,
      status: row.status,
      remark: row.remarkEncrypted ? decryptStoredSecret(row.remarkEncrypted) : row.remark,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      convertedTenant: row.convertedTenant ? { id: row.convertedTenant.id, code: row.convertedTenant.code, name: row.convertedTenant.name, enabled: row.convertedTenant.enabled } : null,
      convertedMerchant: row.convertedMerchant ? { id: row.convertedMerchant.id, code: row.convertedMerchant.code, name: row.convertedMerchant.name, status: row.convertedMerchant.status } : null,
      convertedAt: row.convertedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version
    };
  }

  private publicAmbassadorFollowup(row: AmbassadorApplicationFollowup, decryptedContent?: string) {
    return {
      id: row.id,
      application: row.application ? this.publicAmbassadorApplication(row.application) : null,
      operator: row.operator ? { id: row.operator.id, username: row.operator.username } : null,
      method: row.method,
      result: row.result,
      content: decryptedContent ?? (row.contentEncrypted ? decryptStoredSecret(row.contentEncrypted) : row.content),
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      nextFollowAt: row.nextFollowAt,
      createdAt: row.createdAt
    };
  }

  private publicAmbassadorProfile(row: AmbassadorProfile) {
    return {
      id: row.id,
      profileNo: row.profileNo,
      application: row.application ? this.publicAmbassadorApplication(row.application) : null,
      user: row.user ? { id: row.user.id, nickname: row.user.nickname } : null,
      activatedBy: row.activatedBy ? { id: row.activatedBy.id, username: row.activatedBy.username } : null,
      name: row.name,
      phoneMasked: row.phoneMasked,
      city: row.city,
      regionScope: row.regionScope,
      status: row.status,
      level: row.level,
      contributionPoints: row.contributionPoints,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt,
      lastContributionAt: row.lastContributionAt,
      suspendedAt: row.suspendedAt,
      statusReason: row.statusReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version
    };
  }

  private publicAmbassadorTask(row: AmbassadorTask) {
    return {
      id: row.id,
      taskNo: row.taskNo,
      title: row.title,
      city: row.city,
      description: row.description,
      pointValue: row.pointValue,
      quota: row.quota,
      status: row.status,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      createdBy: row.createdBy ? { id: row.createdBy.id, username: row.createdBy.username } : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version
    };
  }

  private publicAmbassadorContribution(row: AmbassadorContribution) {
    return {
      id: row.id,
      profile: row.profile ? this.publicAmbassadorProfile(row.profile) : null,
      task: row.task ? this.publicAmbassadorTask(row.task) : null,
      sourceType: row.sourceType,
      title: row.title,
      quantity: row.quantity,
      points: row.points,
      status: row.status,
      evidence: row.evidenceEncrypted ? decryptStoredSecret(row.evidenceEncrypted) : null,
      reviewRemark: row.reviewRemarkEncrypted ? decryptStoredSecret(row.reviewRemarkEncrypted) : null,
      submittedBy: row.submittedBy ? { id: row.submittedBy.id, username: row.submittedBy.username } : null,
      reviewedBy: row.reviewedBy ? { id: row.reviewedBy.id, username: row.reviewedBy.username } : null,
      reviewedAt: row.reviewedAt,
      reversedAt: row.reversedAt,
      createdAt: row.createdAt
    };
  }

  async updateAmbassadorApplication(id: number, dto: AmbassadorApplicationStatusDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const row = await this.ambassadorApplications.findOneBy({ id });
    if (!row) throw new NotFoundException("申请记录不存在");
    const transitions: Record<string, string[]> = {
      pending: ["pending", "contacted", "rejected"], contacted: ["contacted", "screened", "interview", "rejected"], screened: ["screened", "interview", "approved", "rejected"],
      interview: ["interview", "approved", "rejected"], approved: ["approved", "activated", "rejected"], activated: ["activated"], rejected: ["rejected", "contacted"]
    };
    if (!transitions[row.status]?.includes(dto.status)) throw new BadRequestException(`申请状态不能从 ${row.status} 变更为 ${dto.status}`);
    row.status = dto.status;
    if (dto.kind !== undefined) row.kind = dto.kind;
    if (dto.remark !== undefined) {
      const remark = this.nullableText(dto.remark);
      row.remark = remark ? "[encrypted]" : null;
      row.remarkEncrypted = remark ? encryptStoredSecret(remark) : null;
    }
    if (dto.assignee !== undefined) row.assignee = this.nullableText(dto.assignee);
    if (dto.ownerAdminId !== undefined) {
      const owner = await this.admins.findOne({ where: { id: dto.ownerAdminId } });
      if (!owner || !owner.enabled || owner.tenant) throw new BadRequestException("负责人必须是启用的平台管理员");
      row.ownerAdmin = owner;
      row.assignee = owner.username;
    }
    if (dto.priority !== undefined) row.priority = dto.priority;
    if (dto.nextFollowAt !== undefined) row.nextFollowAt = dto.nextFollowAt ? this.parseDate(dto.nextFollowAt) : null;
    for (const key of ["cityResourceScore", "communityScore", "contentScore", "charityScore", "deliveryScore"] as const) {
      if (dto[key] !== undefined) row[key] = Math.min(Math.max(Number(dto[key] || 0), 0), 5);
    }
    row.reviewedBy = admin?.id || null;
    row.reviewedAt = new Date();
    const saved = await this.ambassadorApplications.save(row);
    if (saved.status === "activated" && saved.kind === "ambassador") await this.ensureAmbassadorProfileFromApplication(saved, admin);
    if (["approved", "activated"].includes(saved.status) || saved.source === "volunteer_apply") await this.ensureVolunteerProfileFromApplication(saved);
    const applicationType = saved.kind === "partner" ? "partner" : "ambassador";
    await this.logOperation(admin, `${applicationType}.application.update`, "ambassador_application", saved.id, `${saved.kind === "partner" ? "跟进合作伙伴线索" : "跟进文化大使申请"}：${saved.name}`, { status: saved.status });
    return this.publicAmbassadorApplication(saved);
  }

  async ambassadorApplicationFollowups(id: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const application = await this.ambassadorApplications.findOneBy({ id });
    if (!application) throw new NotFoundException("申请记录不存在");
    const rows = await this.ambassadorFollowups.find({ where: { application: { id } }, order: { createdAt: "DESC" } });
    return rows.map((row) => this.publicAmbassadorFollowup(row));
  }

  async createAmbassadorApplicationFollowup(id: number, dto: AmbassadorApplicationFollowupDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.crmBusinessKey(dto.businessKey, "跟进业务键");
    const replay = await this.ambassadorFollowups.findOne({ where: { businessKey } });
    if (replay) {
      if (replay.application.id !== id) throw new BadRequestException("跟进业务键已被其他线索使用");
      return { ...this.publicAmbassadorFollowup(replay), replayed: true };
    }
    const application = await this.ambassadorApplications.findOneBy({ id });
    if (!application) throw new NotFoundException("申请记录不存在");
    const content = String(dto.content || "").trim();
    if (!content) throw new BadRequestException("请填写跟进内容");
    const operator = admin?.id ? await this.admins.findOne({ where: { id: admin.id } }) : null;
    const fromStatus = application.status;
    const toStatus = dto.result === "approved" ? "approved" : dto.result === "activated" ? "activated" : application.status === "pending" ? "contacted" : application.status;
    const followup = await this.ambassadorFollowups.save(this.ambassadorFollowups.create({
      application,
      operator,
      businessKey,
      method: this.cleanText(dto.method, 40) || "wechat",
      result: this.cleanText(dto.result, 40) || "contacted",
      content: "[encrypted]",
      contentEncrypted: encryptStoredSecret(content),
      fromStatus,
      toStatus,
      nextFollowAt: dto.nextFollowAt ? this.parseDate(dto.nextFollowAt) : null
    }));
    application.remark = "[encrypted]";
    application.remarkEncrypted = encryptStoredSecret(content);
    application.status = toStatus as any;
    application.nextFollowAt = followup.nextFollowAt;
    application.reviewedBy = admin?.id || null;
    application.reviewedAt = new Date();
    await this.ambassadorApplications.save(application);
    if (application.status === "activated" && application.kind === "ambassador") await this.ensureAmbassadorProfileFromApplication(application, admin);
    const applicationType = application.kind === "partner" ? "partner" : "ambassador";
    await this.logOperation(admin, `${applicationType}.application.followup`, "ambassador_application", application.id, `新增${application.kind === "partner" ? "伙伴" : "大使"}线索跟进：${application.name}`, { result: followup.result });
    return this.publicAmbassadorFollowup(followup, content);
  }

  async ambassadorProfilesList(query: AmbassadorProfileQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    await this.ambassadorProfiles.createQueryBuilder().update().set({ status: "expired" }).where("status = :status AND expiresAt < :now", { status: "active", now: new Date() }).execute();
    const builder = this.ambassadorProfiles.createQueryBuilder("profile").leftJoinAndSelect("profile.application", "application").leftJoinAndSelect("profile.activatedBy", "activatedBy").orderBy("profile.updatedAt", "DESC");
    if (query.status?.trim()) builder.andWhere("profile.status = :status", { status: query.status.trim() });
    if (query.city?.trim()) builder.andWhere("profile.city LIKE :city", { city: `%${query.city.trim()}%` });
    if (query.keyword?.trim()) builder.andWhere("(profile.profileNo LIKE :keyword OR profile.name LIKE :keyword OR profile.phoneMasked LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    return (await builder.take(500).getMany()).map((row) => this.publicAmbassadorProfile(row));
  }

  async updateAmbassadorProfile(id: number, dto: AmbassadorProfileStatusDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const row = await this.ambassadorProfiles.findOne({ where: { id } });
    if (!row) throw new NotFoundException("大使档案不存在");
    if (row.status === "revoked" && dto.status !== "revoked") throw new BadRequestException("已撤销的大使身份不能恢复");
    row.status = dto.status;
    row.statusReason = this.nullableText(dto.reason);
    row.suspendedAt = dto.status === "suspended" ? new Date() : null;
    if (dto.expiresAt) {
      const expiresAt = this.parseDate(dto.expiresAt);
      if (expiresAt.getTime() <= row.startsAt.getTime()) throw new BadRequestException("大使有效期结束时间必须晚于开始时间");
      row.expiresAt = expiresAt;
    }
    if (dto.regionScope !== undefined) row.regionScope = this.normalizeRegionScope(dto.regionScope);
    const saved = await this.ambassadorProfiles.save(row);
    await this.logOperation(admin, "ambassador.profile.update", "ambassador_profile", saved.id, `更新大使档案：${saved.name}`, { status: saved.status, expiresAt: saved.expiresAt, regionScope: saved.regionScope });
    return this.publicAmbassadorProfile(saved);
  }

  async ambassadorTasksList(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    return (await this.ambassadorTasks.find({ order: { createdAt: "DESC" }, take: 500 })).map((row) => this.publicAmbassadorTask(row));
  }

  async saveAmbassadorTask(dto: AmbassadorTaskDto, id?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const row = id ? await this.ambassadorTasks.findOne({ where: { id } }) : this.ambassadorTasks.create({ taskNo: nextEcosystemNo("AMT"), createdBy: admin?.id ? await this.admins.findOne({ where: { id: admin.id } }) : null });
    if (!row) throw new NotFoundException("大使任务不存在");
    if (row.status === "cancelled" && dto.status !== "cancelled") throw new BadRequestException("已取消任务不能重新启用");
    row.title = this.cleanText(dto.title, 120);
    row.city = this.nullableText(dto.city);
    row.description = this.cleanText(dto.description, 5000);
    row.pointValue = Math.max(Math.trunc(Number(dto.pointValue || 0)), 0);
    row.quota = Math.max(Math.trunc(Number(dto.quota || 0)), 0);
    row.status = dto.status;
    row.startsAt = dto.startsAt ? this.parseDate(dto.startsAt) : null;
    row.endsAt = dto.endsAt ? this.parseDate(dto.endsAt) : null;
    if (row.startsAt && row.endsAt && row.endsAt.getTime() <= row.startsAt.getTime()) throw new BadRequestException("任务结束时间必须晚于开始时间");
    if (row.status === "open" && (!row.startsAt || !row.endsAt)) throw new BadRequestException("开放任务必须配置开始和结束时间");
    const saved = await this.ambassadorTasks.save(row);
    await this.logOperation(admin, id ? "ambassador.task.update" : "ambassador.task.create", "ambassador_task", saved.id, `${id ? "更新" : "创建"}大使任务：${saved.title}`, { status: saved.status, pointValue: saved.pointValue, quota: saved.quota });
    return this.publicAmbassadorTask(saved);
  }

  async ambassadorContributionsList(profileId?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.ambassadorContributions.createQueryBuilder("contribution").leftJoinAndSelect("contribution.profile", "profile").leftJoinAndSelect("contribution.task", "task").leftJoinAndSelect("contribution.submittedBy", "submittedBy").leftJoinAndSelect("contribution.reviewedBy", "reviewedBy").orderBy("contribution.createdAt", "DESC");
    if (profileId) builder.andWhere("contribution.profileId = :profileId", { profileId });
    const rows = await builder.take(500).getMany();
    return rows.map((row) => this.publicAmbassadorContribution(row));
  }

  async createAmbassadorContribution(dto: AmbassadorContributionDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.crmBusinessKey(dto.businessKey, "贡献业务键");
    const saved = await this.dataSource.transaction(async (manager) => {
      const contributionRepo = manager.getRepository(AmbassadorContribution);
      const replay = await contributionRepo.findOne({ where: { businessKey } });
      if (replay) return replay;
      const profile = await manager.getRepository(AmbassadorProfile).findOne({ where: { id: dto.profileId }, lock: { mode: "pessimistic_write" } });
      if (!profile || ambassadorProfileEffectiveStatus(profile.status, profile.expiresAt) !== "active") throw new BadRequestException("仅有效大使可以登记贡献");
      const task = dto.taskId ? await manager.getRepository(AmbassadorTask).findOne({ where: { id: dto.taskId }, lock: { mode: "pessimistic_write" } }) : null;
      let points = Math.max(Math.trunc(Number(dto.points || 0)), 0);
      const quantity = Math.max(Math.trunc(Number(dto.quantity || 1)), 1);
      if (task) {
        const now = Date.now();
        if (task.status !== "open" || !task.startsAt || !task.endsAt || task.startsAt.getTime() > now || task.endsAt.getTime() < now) throw new BadRequestException("大使任务当前不可参与");
        if (task.city && task.city !== profile.city) throw new BadRequestException("大使任务不在当前身份授权城市");
        if (task.quota > 0) {
          const occupied = await contributionRepo.createQueryBuilder("contribution")
            .where("contribution.taskId = :taskId", { taskId: task.id })
            .andWhere("contribution.status IN (:...statuses)", { statuses: ["pending", "approved"] })
            .setLock("pessimistic_read")
            .getCount();
          if (occupied >= task.quota) throw new BadRequestException("大使任务名额已满");
        }
        points = task.pointValue * quantity;
      }
      const operator = admin?.id ? await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } }) : null;
      return contributionRepo.save(contributionRepo.create({
        businessKey, profile, task, sourceType: dto.sourceType, title: this.cleanText(dto.title, 160), quantity, points,
        status: "pending", evidenceEncrypted: dto.evidence ? encryptStoredSecret(this.cleanText(dto.evidence, 5000)) : null, reviewRemarkEncrypted: null, submittedBy: operator, reviewedBy: null,
        reviewBusinessKey: null, reversalBusinessKey: null, reviewedAt: null, reversedAt: null
      }));
    });
    await this.logOperation(admin, "ambassador.contribution.create", "ambassador_contribution", saved.id, `登记大使贡献：${saved.title}`, { profileId: saved.profile.id, taskId: saved.task?.id || null, points: saved.points });
    return this.publicAmbassadorContribution(saved);
  }

  async actionAmbassadorContribution(id: number, dto: AmbassadorContributionActionDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    if (!admin?.id) throw new ForbiddenException("贡献复核必须记录管理员");
    const businessKey = this.crmBusinessKey(dto.businessKey, "贡献操作业务键");
    const result = await this.dataSource.transaction(async (manager) => {
      const contributionRepo = manager.getRepository(AmbassadorContribution);
      const profileRepo = manager.getRepository(AmbassadorProfile);
      const row = await contributionRepo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("大使贡献不存在");
      if (row.reviewBusinessKey === businessKey || row.reversalBusinessKey === businessKey) return row;
      const collision = await contributionRepo.createQueryBuilder("contribution").where("contribution.reviewBusinessKey = :businessKey OR contribution.reversalBusinessKey = :businessKey", { businessKey }).getOne();
      if (collision) throw new BadRequestException("贡献操作业务键已被其他记录使用");
      const profile = await profileRepo.findOne({ where: { id: row.profile.id }, lock: { mode: "pessimistic_write" } });
      const operator = await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } });
      if (!profile || !operator || !operator.enabled) throw new ForbiddenException("贡献复核身份无效");
      if (row.submittedBy?.id === operator.id) throw new BadRequestException("贡献登记人与复核人必须不同");
      if (dto.action === "reverse") {
        if (row.status !== "approved") throw new BadRequestException("只有已通过贡献可以撤销");
        row.status = "reversed";
        row.reversalBusinessKey = businessKey;
        row.reversedAt = new Date();
        profile.contributionPoints = Math.max(profile.contributionPoints - row.points, 0);
      } else {
        if (row.status !== "pending") throw new BadRequestException("当前贡献状态不能复核");
        row.status = dto.action === "approve" ? "approved" : "rejected";
        row.reviewBusinessKey = businessKey;
        row.reviewedAt = new Date();
        if (dto.action === "approve") {
          profile.contributionPoints += row.points;
          profile.lastContributionAt = new Date();
        }
      }
      row.reviewedBy = operator;
      row.reviewRemarkEncrypted = encryptStoredSecret(this.cleanText(dto.remark, 2000));
      profile.level = ambassadorLevelForPoints(profile.contributionPoints);
      await profileRepo.save(profile);
      return contributionRepo.save(row);
    });
    await this.logOperation(admin, `ambassador.contribution.${dto.action}`, "ambassador_contribution", result.id, `大使贡献${dto.action}`, { status: result.status, points: result.points });
    return this.publicAmbassadorContribution(result);
  }

  async partnerContractsList(applicationId?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.partnerContracts.createQueryBuilder("contract").leftJoinAndSelect("contract.application", "application").leftJoinAndSelect("contract.createdBy", "createdBy").leftJoinAndSelect("contract.reviewedBy", "reviewedBy").orderBy("contract.createdAt", "DESC");
    if (applicationId) builder.andWhere("contract.applicationId = :applicationId", { applicationId });
    return (await builder.take(500).getMany()).map((row) => this.partnerContractView(row));
  }

  async revealPartnerContract(id: number, dto: SupportSensitiveRevealDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const reason = String(dto.reason || "").trim();
    if (!reason) throw new BadRequestException("请填写查看合同敏感信息的理由");
    const row = await this.partnerContracts.findOne({ where: { id } });
    if (!row) throw new NotFoundException("合作伙伴合同不存在");
    await this.logOperation(admin, "partner.contract.sensitive_reveal", "partner_contract", row.id, `授权查看伙伴合同敏感信息：${row.contractNo}`, { reason, fields: ["terms", "documentReference", "reviewRemark"] });
    return {
      contractId: row.id,
      contractNo: row.contractNo,
      terms: row.termsEncrypted ? decryptStoredSecret(row.termsEncrypted) : null,
      documentReference: row.documentReferenceEncrypted ? decryptStoredSecret(row.documentReferenceEncrypted) : null,
      reviewRemark: row.reviewRemarkEncrypted ? decryptStoredSecret(row.reviewRemarkEncrypted) : null,
      reason,
      revealedAt: new Date()
    };
  }

  async exportPartnerCrm(query: AmbassadorApplicationQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const applications = await this.ambassadorApplicationRows(query, "partner");
    const applicationIds = applications.map((row) => row.id);
    const contracts = applicationIds.length ? await this.partnerContracts.createQueryBuilder("contract")
      .leftJoinAndSelect("contract.application", "application")
      .leftJoinAndSelect("contract.createdBy", "createdBy")
      .leftJoinAndSelect("contract.reviewedBy", "reviewedBy")
      .where("contract.applicationId IN (:...applicationIds)", { applicationIds })
      .orderBy("contract.createdAt", "DESC")
      .getMany() : [];
    const workbook = new ExcelJS.Workbook();
    const applicationSheet = workbook.addWorksheet("partner-applications");
    applicationSheet.columns = [
      { header: "ID", key: "id", width: 8 }, { header: "联系人", key: "name", width: 14 }, { header: "手机号", key: "phone", width: 18 },
      { header: "微信号", key: "wechat", width: 20 }, { header: "机构", key: "organizationName", width: 24 }, { header: "城市", key: "city", width: 14 },
      { header: "合作方向", key: "cooperationIntent", width: 28 }, { header: "状态", key: "status", width: 14 }, { header: "负责人", key: "assignee", width: 16 },
      { header: "下次跟进", key: "nextFollowAt", width: 22 }, { header: "跟进备注", key: "remark", width: 36 }, { header: "转换商家", key: "tenant", width: 24 },
      { header: "转换店铺", key: "merchant", width: 24 }, { header: "提交时间", key: "createdAt", width: 22 }
    ];
    applications.forEach((row) => applicationSheet.addRow({
      id: row.id, name: row.name, phone: row.phone, wechat: row.wechat, organizationName: row.organizationName || "", city: row.city,
      cooperationIntent: row.cooperationIntent || "", status: row.status, assignee: row.assignee || "", nextFollowAt: row.nextFollowAt ? row.nextFollowAt.toISOString().slice(0, 19).replace("T", " ") : "",
      remark: row.remarkEncrypted ? decryptStoredSecret(row.remarkEncrypted) : row.remark || "", tenant: row.convertedTenant?.name || "", merchant: row.convertedMerchant?.name || "",
      createdAt: row.createdAt ? row.createdAt.toISOString().slice(0, 19).replace("T", " ") : ""
    }));
    const contractSheet = workbook.addWorksheet("partner-contracts");
    contractSheet.columns = [
      { header: "合同编号", key: "contractNo", width: 22 }, { header: "伙伴", key: "partner", width: 24 }, { header: "版本", key: "version", width: 10 },
      { header: "合作类型", key: "cooperationType", width: 20 }, { header: "状态", key: "status", width: 14 }, { header: "开始时间", key: "startsAt", width: 22 },
      { header: "结束时间", key: "endsAt", width: 22 }, { header: "签署时间", key: "signedAt", width: 22 }, { header: "合同归档号", key: "documentReference", width: 28 },
      { header: "关键条款", key: "terms", width: 48 }, { header: "复核说明", key: "reviewRemark", width: 36 }, { header: "创建人", key: "createdBy", width: 16 },
      { header: "复核人", key: "reviewedBy", width: 16 }, { header: "复核时间", key: "reviewedAt", width: 22 }
    ];
    contracts.forEach((row) => contractSheet.addRow({
      contractNo: row.contractNo, partner: row.application?.organizationName || row.application?.name || "", version: row.contractVersion, cooperationType: row.cooperationType,
      status: row.status, startsAt: row.startsAt, endsAt: row.endsAt, signedAt: row.signedAt, documentReference: row.documentReferenceEncrypted ? decryptStoredSecret(row.documentReferenceEncrypted) : "",
      terms: row.termsEncrypted ? decryptStoredSecret(row.termsEncrypted) : "", reviewRemark: row.reviewRemarkEncrypted ? decryptStoredSecret(row.reviewRemarkEncrypted) : "",
      createdBy: row.createdBy?.username || "", reviewedBy: row.reviewedBy?.username || "", reviewedAt: row.reviewedAt
    }));
    for (const sheet of [applicationSheet, contractSheet]) {
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    }
    await this.logExport(admin, "partner_crm", applications.length + contracts.length, query);
    return workbook.xlsx.writeBuffer();
  }

  async savePartnerContract(dto: PartnerContractDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.crmBusinessKey(dto.businessKey, "合同业务键");
    const replay = await this.partnerContracts.findOne({ where: { businessKey } });
    if (replay) return this.partnerContractView(replay);
    const startsAt = this.parseDate(dto.startsAt);
    const endsAt = this.parseDate(dto.endsAt);
    if (endsAt.getTime() <= startsAt.getTime()) throw new BadRequestException("合同结束时间必须晚于开始时间");
    if (!dto.signedAt) throw new BadRequestException("请填写合同签署时间后提交复核");
    const signedAt = this.parseDate(dto.signedAt);
    const row = await this.dataSource.transaction(async (manager) => {
      const application = await manager.getRepository(AmbassadorApplication).findOne({ where: { id: dto.applicationId }, lock: { mode: "pessimistic_write" } });
      if (!application || application.kind !== "partner") throw new BadRequestException("合同必须关联合作伙伴线索");
      if (!["approved", "activated"].includes(application.status)) throw new BadRequestException("合作伙伴线索审核通过后才能建立合同");
      const contractRepo = manager.getRepository(PartnerContract);
      const lockedReplay = await contractRepo.findOne({ where: { businessKey } });
      if (lockedReplay) return lockedReplay;
      const latest = await contractRepo.createQueryBuilder("contract").where("contract.applicationId = :applicationId", { applicationId: application.id }).orderBy("contract.contractVersion", "DESC").getOne();
      const operator = admin?.id ? await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } }) : null;
      return contractRepo.save(contractRepo.create({
        contractNo: nextEcosystemNo("PCT"), businessKey, application, contractVersion: Number(latest?.contractVersion || 0) + 1, cooperationType: dto.cooperationType, status: "pending_review",
        startsAt, endsAt, signedAt, termsEncrypted: dto.terms ? encryptStoredSecret(this.cleanText(dto.terms, 10000)) : null,
        documentReferenceEncrypted: dto.documentReference ? encryptStoredSecret(this.cleanText(dto.documentReference, 1000)) : null, createdBy: operator, reviewedBy: null, reviewBusinessKey: null,
        terminationBusinessKey: null, reviewRemarkEncrypted: null, reviewedAt: null, terminatedAt: null, snapshot: { applicationId: application.id, name: application.name, organizationName: application.organizationName, city: application.city, cooperationType: dto.cooperationType }
      }));
    });
    await this.logOperation(admin, "partner.contract.create", "partner_contract", row.id, `创建伙伴合同：${row.contractNo}`, { applicationId: row.application.id, version: row.contractVersion, status: row.status });
    return this.partnerContractView(row);
  }

  async actionPartnerContract(id: number, dto: PartnerContractActionDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    if (!admin?.id) throw new ForbiddenException("合同操作必须记录管理员");
    const businessKey = this.crmBusinessKey(dto.businessKey, "合同操作业务键");
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PartnerContract);
      const row = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("合作伙伴合同不存在");
      if (row.reviewBusinessKey === businessKey || row.terminationBusinessKey === businessKey) return row;
      const operator = await manager.getRepository(AdminUser).findOne({ where: { id: admin.id } });
      if (!operator || !operator.enabled) throw new ForbiddenException("合同操作管理员无效");
      if (dto.action === "terminate") {
        if (row.status !== "active") throw new BadRequestException("只有生效合同可以终止");
        if (!partnerContractIsEffective(row)) throw new BadRequestException("合同已经到期，无需重复终止");
        row.status = "terminated";
        row.terminationBusinessKey = businessKey;
        row.terminatedAt = new Date();
      } else {
        if (row.status !== "pending_review") throw new BadRequestException("只有待复核合同可以审核");
        if (row.createdBy?.id === operator.id) throw new BadRequestException("合同创建人与复核人必须不同");
        if (dto.action === "activate" && !row.signedAt) throw new BadRequestException("合同签署后才能生效");
        row.status = dto.action === "activate" ? "active" : "rejected";
        row.reviewBusinessKey = businessKey;
        row.reviewedBy = operator;
        row.reviewedAt = new Date();
      }
      row.reviewRemarkEncrypted = encryptStoredSecret(this.cleanText(dto.remark, 2000));
      return repo.save(row);
    });
    await this.logOperation(admin, `partner.contract.${dto.action}`, "partner_contract", saved.id, `伙伴合同${dto.action}：${saved.contractNo}`, { status: saved.status });
    return this.partnerContractView(saved);
  }

  async convertPartnerApplication(id: number, dto: PartnerConversionDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.crmBusinessKey(dto.businessKey, "伙伴转换业务键");
    const result = await this.dataSource.transaction(async (manager) => {
      const applicationRepo = manager.getRepository(AmbassadorApplication);
      const application = await applicationRepo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!application || application.kind !== "partner") throw new NotFoundException("合作伙伴线索不存在");
      if (application.conversionBusinessKey === businessKey && application.convertedTenant) return { application, tenant: application.convertedTenant, merchant: application.convertedMerchant };
      if (application.convertedTenant || application.conversionBusinessKey) throw new BadRequestException("合作伙伴线索已经完成转换");
      if (!["approved", "activated"].includes(application.status)) throw new BadRequestException("合作伙伴线索审核通过后才能转换");
      const contract = await manager.getRepository(PartnerContract).createQueryBuilder("contract")
        .setLock("pessimistic_write")
        .where("contract.applicationId = :applicationId AND contract.status = :status", { applicationId: application.id, status: "active" })
        .orderBy("contract.contractVersion", "DESC")
        .getOne();
      if (contract && !partnerContractIsEffective(contract)) throw new BadRequestException("合作合同尚未生效或已经到期");
      if (!contract) throw new BadRequestException("转换前必须存在当前有效的合作合同");
      const tenantCode = String(dto.tenantCode || "").trim();
      if (!/^[a-zA-Z0-9_-]{2,64}$/.test(tenantCode)) throw new BadRequestException("商家编码必须为 2-64 位字母、数字、下划线或连字符");
      const tenantRepo = manager.getRepository(Tenant);
      if (await tenantRepo.findOne({ where: { code: tenantCode } })) throw new BadRequestException("商家编码已存在");
      const tenant = await tenantRepo.save(tenantRepo.create({ code: tenantCode, name: this.cleanText(dto.tenantName, 120), region: application.city, contactName: application.name, contactPhone: application.phone, enabled: false, settings: { packagePlan: "trial", packageSuspended: true, onboardingSource: "partner_crm", partnerApplicationId: application.id, partnerContractId: contract.id }, remark: "由合作伙伴 CRM 转换，待完成套餐、支付和品牌配置后启用" }));
      let merchant: MallMerchant | null = null;
      if (dto.createMerchant) {
        if (contract.cooperationType === "tenant") throw new BadRequestException("当前合同不包含商户合作权益");
        const merchantRepo = manager.getRepository(MallMerchant);
        const code = String(dto.merchantCode || `${tenantCode}_store`).trim();
        if (!/^[a-zA-Z0-9_-]{2,80}$/.test(code)) throw new BadRequestException("店铺编码格式不正确");
        if (await merchantRepo.findOne({ where: { code } })) throw new BadRequestException("店铺编码已存在");
        merchant = await merchantRepo.save(merchantRepo.create({ code, name: this.cleanText(dto.merchantName || `${tenant.name}店铺`, 120), ownerType: "tenant", tenant, agent: null, status: "disabled", onboardingStatus: "approved", contractRequired: true, platformCommissionBps: 0, serviceFeeBps: 0, settlementCycleDays: 30, suspendedAt: null, suspensionReason: null, mallEnabled: false, productAuditRequired: true, paymentMode: "platform_collect", region: application.city, contactName: application.name, contactPhone: application.phone, logoUrl: null, notice: null, settlementConfig: { source: "partner_crm", applicationId: application.id, contractId: contract.id }, freightConfig: null, remark: "由合作伙伴 CRM 转换，待完成资质、合同和支付配置后启用" }));
      }
      application.convertedTenant = tenant;
      application.convertedMerchant = merchant;
      application.conversionBusinessKey = businessKey;
      application.convertedAt = new Date();
      application.status = "activated";
      await applicationRepo.save(application);
      return { application, tenant, merchant };
    });
    await this.logOperation(admin, "partner.application.convert", "ambassador_application", id, `合作伙伴转换为商家：${result.tenant.name}`, { tenantId: result.tenant.id, merchantId: result.merchant?.id || null });
    return { applicationId: id, tenant: { id: result.tenant.id, code: result.tenant.code, name: result.tenant.name, enabled: result.tenant.enabled }, merchant: result.merchant ? { id: result.merchant.id, code: result.merchant.code, name: result.merchant.name, status: result.merchant.status } : null };
  }

  async volunteerTasks(query: VolunteerTaskQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.volunteerTasksRepo.createQueryBuilder("task").orderBy("task.startAt", "ASC").addOrderBy("task.id", "DESC");
    if (query.status) builder.andWhere("task.status = :status", { status: query.status });
    if (query.city) builder.andWhere("task.city LIKE :city", { city: `%${query.city.trim()}%` });
    return builder.take(500).getMany();
  }

  async volunteerOverview(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const [profiles, applications, serviceRows, certificates, tasks] = await Promise.all([
      this.volunteerProfiles.createQueryBuilder("profile")
        .leftJoinAndSelect("profile.user", "profileUser")
        .orderBy("profile.updatedAt", "DESC")
        .take(500)
        .getMany(),
      this.volunteerTaskApplicationsRepo.createQueryBuilder("application")
        .leftJoinAndSelect("application.task", "task")
        .leftJoinAndSelect("application.profile", "profile")
        .leftJoinAndSelect("profile.user", "profileUser")
        .leftJoinAndSelect("application.user", "applicationUser")
        .orderBy("application.createdAt", "DESC")
        .take(500)
        .getMany(),
      this.volunteerServiceRecords.createQueryBuilder("record")
        .leftJoinAndSelect("record.profile", "profile")
        .leftJoinAndSelect("profile.user", "profileUser")
        .leftJoinAndSelect("record.task", "task")
        .leftJoinAndSelect("record.application", "application")
        .orderBy("record.createdAt", "DESC")
        .take(50)
        .getMany(),
      this.certificates.createQueryBuilder("certificate")
        .orderBy("certificate.issuedAt", "DESC")
        .take(500)
        .getMany(),
      this.volunteerTasksRepo.createQueryBuilder("task")
        .leftJoinAndSelect("task.tenant", "tenant")
        .leftJoinAndSelect("task.project", "project")
        .orderBy("task.startAt", "ASC")
        .take(50)
        .getMany()
    ]);
    const totalHours = profiles.reduce((sum, row) => sum + Number(row.serviceHours || 0), 0);
    const issuedUserIds = new Set(certificates.filter((item) => item.status !== "revoked").map((item) => item.userId));
    const pendingCertificates = profiles.filter((row) => row.status === "approved" && row.user?.id && Number(row.serviceHours || 0) > 0 && !issuedUserIds.has(row.user.id));
    const pendingApplications = applications.filter((row) => row.status === "pending");
    return {
      kpis: {
        totalProfiles: profiles.length,
        approvedProfiles: profiles.filter((row) => row.status === "approved").length,
        pendingProfiles: profiles.filter((row) => row.status === "pending").length,
        totalServiceHours: Number(totalHours.toFixed(2)),
        issuedCertificates: certificates.filter((item) => item.status !== "revoked").length,
        pendingCertificates: pendingCertificates.length
      },
      todos: [
        { key: "pending_profiles", label: "待审核档案", count: profiles.filter((row) => row.status === "pending").length },
        { key: "pending_task_applications", label: "待审核任务报名", count: pendingApplications.length },
        { key: "pending_certificates", label: "待发证书", count: pendingCertificates.length }
      ],
      alerts: pendingCertificates.slice(0, 8).map((row) => ({ level: "info", message: `志愿者「${row.name}」已有服务时长，待发证书` })),
      recentRecords: { profiles: profiles.slice(0, 8).map((row) => this.adminVolunteerProfile(row)), applications: applications.slice(0, 8).map((row) => this.adminVolunteerApplication(row)), serviceRecords: serviceRows.slice(0, 8).map((row) => this.adminVolunteerServiceRecord(row)), tasks: tasks.slice(0, 8) }
    };
  }

  async volunteerProfilesList(query: VolunteerProfileQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.volunteerProfiles
      .createQueryBuilder("profile")
      .leftJoinAndSelect("profile.user", "user")
      .leftJoinAndSelect("profile.application", "application")
      .orderBy("profile.updatedAt", "DESC")
      .addOrderBy("profile.id", "DESC");
    const keyword = String(query.keyword || "").trim();
    if (keyword) {
      builder.andWhere(new Brackets((scope) => {
        scope.where("profile.name LIKE :keyword OR profile.city LIKE :keyword OR profile.expertise LIKE :keyword OR profile.serviceIntent LIKE :keyword", { keyword: `%${keyword}%` });
        if (/^1\d{10}$/.test(keyword)) scope.orWhere("profile.phoneLookupHash = :phoneHash OR profile.phone = :legacyPhone", { phoneHash: volunteerPhoneHash(keyword), legacyPhone: keyword });
      }));
    }
    const status = String(query.status || "").trim();
    if (status) builder.andWhere("profile.status = :status", { status });
    const level = String(query.level || "").trim();
    if (level) builder.andWhere("profile.level = :level", { level });
    const city = String(query.city || "").trim();
    if (city) builder.andWhere("profile.city LIKE :city", { city: `%${city}%` });
    const rows = await builder.take(500).getMany();
    const userIds = rows.map((row) => row.user?.id).filter((id): id is number => Boolean(id));
    if (!userIds.length) return rows.map((row) => ({ ...this.adminVolunteerProfile(row), certificateCount: 0, latestCertificate: null }));
    const certificates = await this.certificates.find({ where: { userId: In(userIds) }, order: { issuedAt: "DESC" }, loadEagerRelations: false });
    return rows.map((row) => {
      const owned = certificates.filter((item) => item.userId === row.user?.id);
      return { ...this.adminVolunteerProfile(row), certificateCount: owned.length, latestCertificate: owned[0] || null };
    });
  }

  async updateVolunteerProfile(id: number, dto: VolunteerProfileStatusDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const profile = await this.volunteerProfileQuery(this.volunteerProfiles).where("profile.id = :id", { id }).getOne();
    if (!profile) throw new NotFoundException("志愿者档案不存在");
    profile.status = dto.status;
    if (dto.level) profile.level = dto.level;
    if (dto.identityStatus) {
      profile.identityStatus = dto.identityStatus;
      profile.identityVerifiedAt = dto.identityStatus === "verified" ? new Date() : null;
    }
    if (dto.qualificationStatus) profile.qualificationStatus = dto.qualificationStatus;
    if (dto.qualificationExpiresAt !== undefined) profile.qualificationExpiresAt = dto.qualificationExpiresAt ? this.parseDate(dto.qualificationExpiresAt) : null;
    profile.statusReason = this.cleanText(dto.statusReason, 500) || null;
    profile.remark = null;
    profile.remarkEncrypted = encryptStoredSecret(this.nullableText(dto.remark));
    const saved = await this.volunteerProfiles.save(profile);
    await this.logOperation(admin, "volunteer.profile.update", "volunteer_profile", saved.id, `更新志愿者档案：${saved.name}`, { status: saved.status, level: saved.level });
    return saved;
  }

  async volunteerProfileCertificates(id: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const profile = await this.volunteerProfileQuery(this.volunteerProfiles).where("profile.id = :id", { id }).getOne();
    if (!profile) throw new NotFoundException("志愿者档案不存在");
    if (!profile.user) return [];
    return this.certificates.find({ where: { userId: profile.user.id }, order: { issuedAt: "DESC" }, loadEagerRelations: false });
  }

  async issueVolunteerCertificate(id: number, dto: VolunteerCertificateDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const profile = await this.volunteerProfileQuery(this.volunteerProfiles).where("profile.id = :id", { id }).getOne();
    if (!profile) throw new NotFoundException("志愿者档案不存在");
    if (!profile.user) throw new BadRequestException("志愿者档案尚未绑定用户账号，需用户登录后申请或报名志愿任务后再发放证书");
    const certificate = await this.ensureVolunteerCertificate(profile, admin, dto.name, dto.templateKey as any);
    if (!certificate) throw new BadRequestException("志愿者档案尚未绑定用户账号，无法发放证书");
    return certificate;
  }

  async volunteerCertificateFile(id: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const certificate = await this.certificates.findOne({ where: { id }, loadEagerRelations: false });
    if (!certificate) throw new NotFoundException("证书不存在");
    const template = await this.credentialTemplates.ensureCertificateSnapshot(certificate);
    return renderCertificateSvg({ certificate, displayName: certificate.holderName || `用户${certificate.userId}`, template: template.config });
  }

  async revokeVolunteerCertificate(id: number, dto: { reason?: string }, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const certificate = await this.certificates.findOne({ where: { id }, loadEagerRelations: false });
    if (!certificate) throw new NotFoundException("证书不存在");
    certificate.status = "revoked";
    certificate.revokedAt = new Date();
    certificate.revokedBy = admin?.username || `admin:${admin?.id || ""}`;
    certificate.revokeReason = this.nullableText(dto.reason);
    certificate.revokeReasonEncrypted = encryptStoredSecret(this.nullableText(dto.reason));
    const saved = await this.certificates.save(certificate);
    await this.logOperation(admin, "volunteer.certificate.revoke", "certificate", saved.id, `撤销证书：${saved.name}`, { certificateNo: saved.certificateNo, reason: saved.revokeReason || null });
    return saved;
  }

  async exportVolunteerProfiles(query: VolunteerProfileQueryDto = {}, admin?: AdminContext) {
    const rows = await this.volunteerProfilesList(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("volunteer-profiles");
    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "姓名", key: "name", width: 14 },
      { header: "手机号", key: "phone", width: 18 },
      { header: "城市", key: "city", width: 16 },
      { header: "擅长领域", key: "expertise", width: 24 },
      { header: "可服务时间", key: "availableTime", width: 22 },
      { header: "服务意向", key: "serviceIntent", width: 24 },
      { header: "审核状态", key: "status", width: 14 },
      { header: "成长等级", key: "level", width: 14 },
      { header: "累计时长", key: "serviceHours", width: 12 },
      { header: "来源线索", key: "applicationId", width: 12 },
      { header: "备注", key: "remark", width: 36 },
      { header: "创建时间", key: "createdAt", width: 22 },
      { header: "更新时间", key: "updatedAt", width: 22 }
    ];
    rows.forEach((row) =>
      sheet.addRow({
        id: row.id,
        name: row.name,
        phone: row.phone,
        city: row.city,
        expertise: row.expertise || "",
        availableTime: row.availableTime || "",
        serviceIntent: row.serviceIntent || "",
        status: this.volunteerProfileStatusText(row.status),
        level: this.volunteerLevelText(row.level),
        serviceHours: Number(row.serviceHours || 0),
        applicationId: row.application?.id || "",
        remark: row.remark || "",
        createdAt: this.excelDateTime(row.createdAt),
        updatedAt: this.excelDateTime(row.updatedAt)
      })
    );
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    await this.logExport(admin, "volunteer_profiles", rows.length, query);
    return workbook.xlsx.writeBuffer();
  }

  async saveVolunteerTask(dto: VolunteerTaskDto, id?: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = dto.businessKey ? this.parseVolunteerBusinessKey(dto.businessKey, "任务业务键") : null;
    if (!id && businessKey) {
      const replay = await this.volunteerTasksRepo.findOne({ where: { businessKey } });
      if (replay) return replay;
    }
    const task = id ? await this.volunteerTasksRepo.findOneBy({ id }) : this.volunteerTasksRepo.create({ taskNo: nextVolunteerNo("VLT"), businessKey: businessKey || `volunteer:task:${uuidv4()}` });
    if (!task) throw new NotFoundException("志愿任务不存在");
    task.title = this.cleanText(dto.title, 120);
    task.type = this.cleanText(dto.type, 40);
    task.city = this.cleanText(dto.city, 80);
    if (!task.title || !task.type || !task.city) throw new BadRequestException("请填写任务标题、类型和城市");
    task.address = this.cleanText(dto.address, 160) || null;
    task.startAt = dto.startAt ? this.parseDate(dto.startAt) : null;
    task.endAt = dto.endAt ? this.parseDate(dto.endAt) : null;
    task.recruitmentStartsAt = dto.recruitmentStartsAt ? this.parseDate(dto.recruitmentStartsAt) : null;
    task.recruitmentEndsAt = dto.recruitmentEndsAt ? this.parseDate(dto.recruitmentEndsAt) : null;
    if (task.startAt && task.endAt && task.endAt <= task.startAt) throw new BadRequestException("任务结束时间必须晚于开始时间");
    if (task.recruitmentStartsAt && task.recruitmentEndsAt && task.recruitmentEndsAt <= task.recruitmentStartsAt) throw new BadRequestException("报名截止时间必须晚于报名开始时间");
    if (task.recruitmentEndsAt && task.startAt && task.recruitmentEndsAt > task.startAt) throw new BadRequestException("报名截止时间不能晚于任务开始时间");
    task.quota = Math.max(Number(dto.quota || task.quota || 1), 1);
    task.waitlistEnabled = dto.waitlistEnabled ?? task.waitlistEnabled ?? true;
    task.requiredSkills = Array.from(new Set((dto.requiredSkills || []).map((item) => this.cleanText(item, 40)).filter(Boolean))).slice(0, 20);
    task.qualificationRequired = dto.qualificationRequired ?? task.qualificationRequired ?? false;
    task.minimumTrainingHours = Math.max(Number(dto.minimumTrainingHours ?? task.minimumTrainingHours ?? 0), 0).toFixed(2);
    task.cancellationDeadlineHours = Math.max(Math.trunc(Number(dto.cancellationDeadlineHours ?? task.cancellationDeadlineHours ?? 24)), 0);
    task.checkInOpensMinutesBefore = Math.max(Math.trunc(Number(dto.checkInOpensMinutesBefore ?? task.checkInOpensMinutesBefore ?? 60)), 0);
    task.checkOutClosesMinutesAfter = Math.max(Math.trunc(Number(dto.checkOutClosesMinutesAfter ?? task.checkOutClosesMinutesAfter ?? 120)), 0);
    task.latitude = dto.latitude === undefined ? task.latitude || null : Number(dto.latitude).toFixed(7);
    task.longitude = dto.longitude === undefined ? task.longitude || null : Number(dto.longitude).toFixed(7);
    task.tenant = dto.tenantId ? await this.tenants.findOne({ where: { id: dto.tenantId } }) : task.tenant || null;
    task.project = dto.projectId ? await this.dataSource.getRepository(CharityProject).findOne({ where: { id: dto.projectId } }) : task.project || null;
    if (dto.tenantId && !task.tenant) throw new BadRequestException("所属租户不存在");
    if (dto.projectId && !task.project) throw new BadRequestException("公益项目不存在");
    task.status = dto.status || task.status || "open";
    task.requirement = this.nullableText(dto.requirement);
    task.description = this.nullableText(dto.description);
    const saved = await this.volunteerTasksRepo.save(task);
    await this.logOperation(admin, id ? "volunteer.task.update" : "volunteer.task.create", "volunteer_task", saved.id, `${id ? "更新" : "新增"}志愿任务：${saved.title}`, { status: saved.status });
    return saved;
  }

  async volunteerTaskApplications(status?: string, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.volunteerTaskApplicationsRepo.createQueryBuilder("application").leftJoinAndSelect("application.task", "task").leftJoinAndSelect("application.profile", "profile").leftJoinAndSelect("application.user", "user").orderBy("application.id", "DESC");
    if (status) builder.andWhere("application.status = :status", { status: status === "approved" ? "admitted" : status });
    const rows = await builder.take(500).getMany();
    return rows.map((row) => this.adminVolunteerApplication(row));
  }

  async updateVolunteerTaskApplication(id: number, dto: VolunteerTaskApplicationStatusDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const targetStatus = (dto.status === "approved" ? "admitted" : dto.status) as VolunteerTaskApplication["status"];
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey || `volunteer:application-action:${id}:${uuidv4()}`, "报名处理业务键");
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(VolunteerTaskApplication);
      const [replay] = await manager.query<Array<Record<string, unknown>>>("SELECT * FROM volunteer_task_applications WHERE lastActionBusinessKey = ? LIMIT 1", [businessKey]);
      if (replay) return this.volunteerApplicationFromRaw(manager, repo, replay);
      const [raw] = await manager.query<Array<{ id: number; taskId: number; profileId: number | null; userId: number | null; status: VolunteerTaskApplication["status"] }>>("SELECT id, taskId, profileId, userId, status FROM volunteer_task_applications WHERE id = ? FOR UPDATE", [id]);
      if (!raw) throw new NotFoundException("志愿任务报名不存在");
      const taskId = Number(raw.taskId || 0);
      const profileId = Number(raw.profileId || 0);
      const userId = Number(raw.userId || 0);
      const fromStatus = raw.status;
      const taskRepo = manager.getRepository(VolunteerTask);
      const [taskRaw] = await manager.query<Array<Record<string, unknown>>>("SELECT * FROM volunteer_tasks WHERE id = ? FOR UPDATE", [taskId]);
      if (!taskRaw) throw new NotFoundException("志愿任务不存在");
      const task = taskRepo.create(taskRaw as Partial<VolunteerTask>);
      const profileRepo = manager.getRepository(VolunteerProfile);
      const [profileRaw] = profileId ? await manager.query<Array<Record<string, unknown>>>("SELECT * FROM volunteer_profiles WHERE id = ? LIMIT 1", [profileId]) : [];
      const profile = profileRaw ? profileRepo.create(profileRaw as Partial<VolunteerProfile>) : null;
      if (!canTransitionVolunteerApplication(fromStatus, targetStatus)) throw new BadRequestException(`报名状态不能从 ${fromStatus} 变更为 ${targetStatus}`);
      const changes: Record<string, unknown> = { status: targetStatus, lastActionBusinessKey: businessKey };
      if (targetStatus === "admitted") {
        if (task.qualificationRequired && !volunteerQualificationEffective({ status: profile?.qualificationStatus, expiresAt: profile?.qualificationExpiresAt })) throw new BadRequestException("该志愿者缺少有效资格，不能录取");
        const [admittedCountRow] = await manager.query<Array<{ count: string | number }>>("SELECT COUNT(*) AS count FROM volunteer_task_applications WHERE taskId = ? AND status IN ('admitted', 'checked_in', 'completed')", [task.id]);
        const admittedCount = Number(admittedCountRow?.count || 0);
        if (admittedCount >= task.quota) throw new BadRequestException("任务录取名额已满，可将报名转入候补");
        changes.admittedAt = new Date();
        changes.waitlistPosition = null;
      }
      if (targetStatus === "waitlisted") {
        const [waitlistCountRow] = await manager.query<Array<{ count: string | number }>>("SELECT COUNT(*) AS count FROM volunteer_task_applications WHERE taskId = ? AND status = 'waitlisted'", [task.id]);
        changes.waitlistPosition = Number(waitlistCountRow?.count || 0) + 1;
      }
      const released = ["admitted", "checked_in"].includes(fromStatus) && ["rejected", "cancelled", "replaced", "waitlisted"].includes(targetStatus);
      if (targetStatus === "cancelled") changes.cancelledAt = new Date();
      if (targetStatus === "replaced") {
        const replacementId = Number(dto.replacementApplicationId || 0);
        const replacement = replacementId ? await repo.createQueryBuilder("replacement").select(["replacement.id", "replacement.status"]).addSelect("replacement.taskId", "taskId").setLock("pessimistic_write").where("replacement.id = :replacementId", { replacementId }).getRawOne<Record<string, unknown>>() : null;
        if (!replacement || Number(replacement.taskId || replacement.replacement_taskId || 0) !== task.id || !["pending", "waitlisted"].includes(String(replacement.replacement_status || replacement.status || ""))) throw new BadRequestException("请选择同一任务中待审或候补的替补报名");
        await repo.update(replacementId, { status: "admitted", admittedAt: new Date(), waitlistPosition: null, lastActionBusinessKey: `${businessKey}:replacement` });
        changes.replacedBy = { id: replacementId };
      }
      changes.remark = null;
      changes.remarkEncrypted = encryptStoredSecret(this.nullableText(dto.remark));
      await repo.update(id, changes as any);
      if (released && targetStatus !== "replaced") await this.promoteVolunteerWaitlist(manager, task.id);
      const [savedRaw] = await manager.query<Array<Record<string, unknown>>>("SELECT * FROM volunteer_task_applications WHERE id = ? LIMIT 1", [id]);
      if (!savedRaw) throw new NotFoundException("志愿任务报名不存在");
      const result = repo.create(savedRaw as Partial<VolunteerTaskApplication>);
      result.task = task;
      result.profile = profile;
      const [userRaw] = userId ? await manager.query<Array<Record<string, unknown>>>("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]) : [];
      result.user = userRaw ? manager.getRepository(User).create(userRaw as Partial<User>) : null;
      return result;
    });
    await this.logOperation(admin, "volunteer.application.update", "volunteer_task_application", saved.id, `更新志愿任务报名：${saved.name}`, { status: saved.status });
    return this.adminVolunteerApplication(saved);
  }

  async createVolunteerServiceRecord(dto: VolunteerServiceRecordDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey || `volunteer:service:${dto.applicationId}:${uuidv4()}`, "服务记录业务键");
    const record = await this.dataSource.transaction(async (manager) => {
      const serviceRepo = manager.getRepository(VolunteerServiceRecord);
      const replay = await this.volunteerServiceRecordQuery(serviceRepo).where("record.businessKey = :businessKey", { businessKey }).getOne();
      if (replay) return replay;
      const applicationRepo = manager.getRepository(VolunteerTaskApplication);
      const application = await applicationRepo.createQueryBuilder("application").leftJoinAndSelect("application.task", "task").leftJoinAndSelect("application.profile", "profile").setLock("pessimistic_write").where("application.id = :id", { id: Number(dto.applicationId) }).getOne();
      if (!application) throw new NotFoundException("志愿任务报名不存在");
      if (!["admitted", "checked_in", "completed"].includes(application.status)) throw new BadRequestException("只有已录取或已签到的报名可以提交服务工时");
      const profile = application.profile || await this.ensureVolunteerProfileFromTaskApplication(application);
      const recordKey = `volunteer:service:application:${application.id}`;
      const existing = await this.volunteerServiceRecordQuery(serviceRepo).where("record.applicationRecordKey = :recordKey", { recordKey }).getOne();
      if (existing) return existing;
      const hours = Math.max(Number(dto.hours || 0), 0);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) throw new BadRequestException("服务时长必须大于 0 且不超过 24 小时");
      return serviceRepo.save(serviceRepo.create({
        businessKey, applicationRecordKey: recordKey, profile, task: application.task || null, application, hours: "0.00", submittedHours: hours.toFixed(2), confirmedHours: "0.00", status: "pending_volunteer",
        title: this.cleanText(dto.title, 160) || application.task?.title || "志愿服务", proofUrl: null, proofEncrypted: encryptStoredSecret(this.cleanText(dto.proofUrl, 500) || null), feedback: null, feedbackEncrypted: encryptStoredSecret(this.nullableText(dto.feedback)),
        volunteerConfirmedBy: null, volunteerConfirmedAt: null, volunteerConfirmationKey: null, supervisorConfirmedBy: null, supervisorConfirmedAt: null, supervisorConfirmationKey: null, rejectionReasonEncrypted: null
      }));
    });
    await this.logOperation(admin, "volunteer.service.create", "volunteer_service_record", record.id, `提交志愿服务工时：${record.profile.name}`, { hours: record.submittedHours, status: record.status });
    return this.adminVolunteerServiceRecord(record);
  }

  async volunteerTrainingRecords(profileId: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const profile = await this.volunteerProfileQuery(this.volunteerProfiles).where("profile.id = :profileId", { profileId }).getOne();
    if (!profile) throw new NotFoundException("志愿者档案不存在");
    const rows = await this.volunteerTrainingRecordsRepo.createQueryBuilder("training").leftJoinAndSelect("training.profile", "profile").leftJoinAndSelect("training.reviewedBy", "reviewedBy").where("profile.id = :profileId", { profileId }).orderBy("training.createdAt", "DESC").getMany();
    return rows.map((row) => this.adminVolunteerTraining(row));
  }

  async createVolunteerTrainingRecord(profileId: number, dto: VolunteerTrainingRecordDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "培训记录业务键");
    const replay = await this.volunteerTrainingRecordsRepo.createQueryBuilder("training").leftJoinAndSelect("training.profile", "profile").leftJoinAndSelect("training.reviewedBy", "reviewedBy").where("training.businessKey = :businessKey", { businessKey }).getOne();
    if (replay) return this.adminVolunteerTraining(replay);
    const profile = await this.volunteerProfileQuery(this.volunteerProfiles).where("profile.id = :profileId", { profileId }).getOne();
    if (!profile) throw new NotFoundException("志愿者档案不存在");
    const completedAt = this.parseDate(dto.completedAt);
    const expiresAt = dto.expiresAt ? this.parseDate(dto.expiresAt) : null;
    if (expiresAt && expiresAt <= completedAt) throw new BadRequestException("资格到期时间必须晚于培训完成时间");
    const row = await this.volunteerTrainingRecordsRepo.save(this.volunteerTrainingRecordsRepo.create({ businessKey, profile, title: this.cleanText(dto.title, 120), provider: this.cleanText(dto.provider, 120) || null, trainingHours: Math.max(Number(dto.trainingHours || 0), 0).toFixed(2), completedAt, expiresAt, status: "pending", certificateEncrypted: encryptStoredSecret(this.cleanText(dto.certificateReference, 500) || null), reviewRemarkEncrypted: null, reviewedBy: null, reviewBusinessKey: null, reviewedAt: null }));
    profile.qualificationStatus = profile.qualificationStatus === "qualified" ? "qualified" : "training";
    await this.volunteerProfiles.save(profile);
    await this.logOperation(admin, "volunteer.training.create", "volunteer_training_record", row.id, `登记志愿培训：${profile.name}`, { profileId, hours: row.trainingHours });
    return this.adminVolunteerTraining(row);
  }

  async reviewVolunteerTrainingRecord(id: number, dto: VolunteerTrainingActionDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "培训审核业务键");
    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(VolunteerTrainingRecord);
      const replay = await repo.createQueryBuilder("training").leftJoinAndSelect("training.profile", "profile").leftJoinAndSelect("training.reviewedBy", "reviewedBy").where("training.reviewBusinessKey = :businessKey", { businessKey }).getOne();
      if (replay) return replay;
      const row = await repo.createQueryBuilder("training").leftJoinAndSelect("training.profile", "profile").setLock("pessimistic_write").where("training.id = :id", { id }).getOne();
      if (!row) throw new NotFoundException("培训记录不存在");
      if (row.status === "revoked") throw new BadRequestException("已撤销的培训记录不能再次审核");
      if (dto.status === "revoked" && row.status !== "approved") throw new BadRequestException("只有已通过培训记录可以撤销");
      row.status = dto.status;
      row.reviewBusinessKey = businessKey;
      row.reviewedBy = admin?.id ? ({ id: admin.id } as AdminUser) : null;
      row.reviewedAt = new Date();
      row.reviewRemarkEncrypted = encryptStoredSecret(this.nullableText(dto.remark));
      const saved = await repo.save(row);
      await this.refreshVolunteerQualification(manager, row.profile.id);
      return saved;
    });
    await this.logOperation(admin, "volunteer.training.review", "volunteer_training_record", result.id, `审核志愿培训：${result.profile.name}`, { status: result.status });
    return this.adminVolunteerTraining(result);
  }

  async volunteerAttendanceToken(applicationId: number, action: "check_in" | "check_out", admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    if (!["check_in", "check_out"].includes(action)) throw new BadRequestException("签到动作不正确");
    const application = await this.volunteerTaskApplicationsRepo.findOne({ where: { id: applicationId }, loadEagerRelations: false });
    if (!application) throw new NotFoundException("志愿任务报名不存在");
    const expected = action === "check_in" ? "admitted" : "checked_in";
    if (application.status !== expected) throw new BadRequestException(action === "check_in" ? "只有已录取报名可以生成签到码" : "只有已签到报名可以生成签退码");
    return { applicationId, action, token: createVolunteerAttendanceToken(applicationId, action), expiresInSeconds: 900 };
  }

  async recordVolunteerAttendance(applicationId: number, dto: VolunteerAttendanceDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "现场登记业务键");
    const result = await this.dataSource.transaction(async (manager) => {
      const attendanceRepo = manager.getRepository(VolunteerAttendanceRecord);
      const replay = await attendanceRepo.createQueryBuilder("attendance").leftJoinAndSelect("attendance.application", "application").where("attendance.businessKey = :businessKey", { businessKey }).getOne();
      if (replay) return replay;
      const applicationRepo = manager.getRepository(VolunteerTaskApplication);
      const application = await applicationRepo.createQueryBuilder("application").leftJoinAndSelect("application.task", "task").leftJoinAndSelect("application.profile", "profile").setLock("pessimistic_write").where("application.id = :applicationId", { applicationId }).getOne();
      if (!application) throw new NotFoundException("志愿任务报名不存在");
      const lockedReplay = await attendanceRepo.createQueryBuilder("attendance")
        .leftJoinAndSelect("attendance.application", "application")
        .setLock("pessimistic_read")
        .where("attendance.businessKey = :businessKey", { businessKey })
        .getOne();
      if (lockedReplay) return lockedReplay;
      const expected = dto.action === "check_in" ? "admitted" : "checked_in";
      if (application.status !== expected) throw new BadRequestException(dto.action === "check_in" ? "当前状态不能签到" : "当前状态不能签退");
      const duplicate = await attendanceRepo.createQueryBuilder("attendance").leftJoinAndSelect("attendance.application", "application").where("application.id = :applicationId", { applicationId }).andWhere("attendance.action = :action", { action: dto.action }).getOne();
      if (duplicate) return duplicate;
      const occurredAt = dto.occurredAt ? this.parseDate(dto.occurredAt) : new Date();
      const row = await attendanceRepo.save(attendanceRepo.create({ businessKey, application, action: dto.action, method: "manual", tokenNonce: null, occurredAt, locationSnapshot: dto.latitude === undefined && dto.longitude === undefined ? null : { latitude: dto.latitude, longitude: dto.longitude }, evidenceEncrypted: encryptStoredSecret(this.nullableText(dto.evidence)), recordedByUser: null, recordedByAdmin: admin?.id ? ({ id: admin.id } as AdminUser) : null, status: "valid", reversalReasonEncrypted: null }));
      if (dto.action === "check_in") {
        application.status = "checked_in";
        application.checkedInAt = occurredAt;
      } else {
        const checkIn = await attendanceRepo.createQueryBuilder("attendance").where("attendance.applicationId = :applicationId", { applicationId }).andWhere("attendance.action = 'check_in'").andWhere("attendance.status = 'valid'").getOne();
        if (!checkIn) throw new BadRequestException("缺少有效签到记录");
        const hours = volunteerHoursFromAttendance(checkIn.occurredAt, occurredAt);
        const serviceRepo = manager.getRepository(VolunteerServiceRecord);
        const recordKey = `volunteer:service:application:${application.id}`;
        if (!(await serviceRepo.createQueryBuilder("record").where("record.applicationRecordKey = :recordKey", { recordKey }).getOne())) await serviceRepo.save(serviceRepo.create({ businessKey: `volunteer:service:${businessKey}`, applicationRecordKey: recordKey, profile: application.profile!, task: application.task, application, hours: "0.00", submittedHours: hours.toFixed(2), confirmedHours: "0.00", status: "pending_volunteer", title: application.task.title, proofUrl: null, proofEncrypted: null, feedback: null, feedbackEncrypted: null, volunteerConfirmedBy: null, volunteerConfirmedAt: null, volunteerConfirmationKey: null, supervisorConfirmedBy: null, supervisorConfirmedAt: null, supervisorConfirmationKey: null, rejectionReasonEncrypted: null }));
        application.completedAt = occurredAt;
      }
      await applicationRepo.save(application);
      return row;
    });
    await this.logOperation(admin, `volunteer.attendance.${dto.action}`, "volunteer_attendance_record", result.id, `${dto.action === "check_in" ? "签到" : "签退"}：${result.application.name}`, { applicationId });
    return result;
  }

  async actionVolunteerServiceRecord(id: number, dto: VolunteerServiceActionDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "工时审核业务键");
    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(VolunteerServiceRecord);
      const replay = await this.volunteerServiceRecordQuery(repo).where("record.supervisorConfirmationKey = :businessKey", { businessKey }).getOne();
      if (replay) return replay;
      const row = await repo.createQueryBuilder("record").leftJoinAndSelect("record.profile", "profile").leftJoinAndSelect("record.application", "application").setLock("pessimistic_write").where("record.id = :id", { id }).getOne();
      if (!row) throw new NotFoundException("志愿服务记录不存在");
      if (row.supervisorConfirmationKey === businessKey) return row;
      if (dto.action === "confirm") {
        if (row.status !== "pending_supervisor") throw new BadRequestException("服务记录尚未由志愿者确认或已处理");
        const hours = dto.confirmedHours === undefined ? Number(row.submittedHours) : Number(dto.confirmedHours);
        if (!Number.isFinite(hours) || hours <= 0 || hours > 24) throw new BadRequestException("确认工时必须大于 0 且不超过 24 小时");
        row.confirmedHours = hours.toFixed(2);
        row.hours = row.confirmedHours;
        row.status = "confirmed";
        row.supervisorConfirmedBy = admin?.id ? ({ id: admin.id } as AdminUser) : null;
        row.supervisorConfirmedAt = new Date();
        if (row.application) {
          row.application.status = "completed";
          row.application.completedAt = row.application.completedAt || new Date();
          await manager.getRepository(VolunteerTaskApplication).save(row.application);
        }
      } else if (dto.action === "reject") {
        if (!["pending_volunteer", "pending_supervisor"].includes(row.status)) throw new BadRequestException("当前服务记录不能驳回");
        if (!String(dto.reason || "").trim()) throw new BadRequestException("请填写驳回原因");
        row.status = "rejected";
        row.confirmedHours = "0.00";
        row.hours = "0.00";
        row.rejectionReasonEncrypted = encryptStoredSecret(dto.reason);
      } else {
        if (row.status !== "confirmed") throw new BadRequestException("只有已确认工时可以冲销");
        if (!String(dto.reason || "").trim()) throw new BadRequestException("请填写冲销原因");
        row.status = "reversed";
        row.rejectionReasonEncrypted = encryptStoredSecret(dto.reason);
      }
      row.supervisorConfirmationKey = businessKey;
      const saved = await repo.save(row);
      await this.refreshVolunteerHours(manager, row.profile.id);
      return saved;
    });
    if (result.status === "confirmed") await this.ensureVolunteerCertificate(result.profile, admin);
    await this.logOperation(admin, `volunteer.service.${dto.action}`, "volunteer_service_record", result.id, `处理志愿服务工时：${result.profile.name}`, { status: result.status, confirmedHours: result.confirmedHours });
    return this.adminVolunteerServiceRecord(result);
  }

  async adjustVolunteerHours(profileId: number, dto: VolunteerHourAdjustmentDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "工时调整业务键");
    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(VolunteerHourAdjustment);
      const replay = await repo.createQueryBuilder("adjustment").leftJoinAndSelect("adjustment.profile", "profile").where("adjustment.businessKey = :businessKey", { businessKey }).getOne();
      if (replay) return replay;
      const profile = await manager.getRepository(VolunteerProfile).createQueryBuilder("profile").setLock("pessimistic_write").where("profile.id = :profileId", { profileId }).getOne();
      if (!profile) throw new NotFoundException("志愿者档案不存在");
      let reversalOf: VolunteerHourAdjustment | null = null;
      let delta = Number(dto.deltaHours);
      let action: "adjustment" | "reversal" = "adjustment";
      if (dto.reversalOfId) {
        reversalOf = await repo.findOne({ where: { id: dto.reversalOfId } });
        if (!reversalOf || reversalOf.profile.id !== profileId || reversalOf.action === "reversal") throw new BadRequestException("原工时调整记录不存在或不能冲销");
        if (await repo.findOne({ where: { reversalOf: { id: reversalOf.id } } })) throw new BadRequestException("该工时调整已经冲销");
        delta = -Number(reversalOf.deltaHours);
        action = "reversal";
      }
      if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 1000) throw new BadRequestException("工时调整值无效");
      const serviceRecord = dto.serviceRecordId ? await manager.getRepository(VolunteerServiceRecord).createQueryBuilder("record").where("record.id = :recordId", { recordId: dto.serviceRecordId }).andWhere("record.profileId = :profileId", { profileId }).getOne() : null;
      if (dto.serviceRecordId && !serviceRecord) throw new BadRequestException("关联服务记录不存在");
      const row = await repo.save(repo.create({ businessKey, profile, serviceRecord, reversalOf, deltaHours: delta.toFixed(2), action, reasonEncrypted: encryptStoredSecret(dto.reason)!, createdBy: admin?.id ? ({ id: admin.id } as AdminUser) : null }));
      await this.refreshVolunteerHours(manager, profileId);
      return row;
    });
    await this.logOperation(admin, "volunteer.hours.adjust", "volunteer_hour_adjustment", result.id, `调整志愿工时：${result.profile.name}`, { deltaHours: result.deltaHours, action: result.action });
    return { id: result.id, profileId: result.profile.id, deltaHours: result.deltaHours, action: result.action, createdAt: result.createdAt };
  }

  async volunteerBadges(profileId: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    return this.volunteerBadgeAwards.createQueryBuilder("award").leftJoinAndSelect("award.definition", "definition").leftJoinAndSelect("award.profile", "profile").leftJoinAndSelect("award.sourceServiceRecord", "sourceServiceRecord").where("profile.id = :profileId", { profileId }).orderBy("award.awardedAt", "DESC").getMany();
  }

  async actionVolunteerBadge(id: number, dto: VolunteerBadgeActionDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "勋章撤销业务键");
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(VolunteerBadgeAward);
      const replay = await repo.createQueryBuilder("award").leftJoinAndSelect("award.definition", "definition").leftJoinAndSelect("award.profile", "profile").where("award.revokeBusinessKey = :businessKey", { businessKey }).getOne();
      if (replay) return replay;
      const award = await repo.createQueryBuilder("award")
        .leftJoinAndSelect("award.definition", "definition")
        .leftJoinAndSelect("award.profile", "profile")
        .setLock("pessimistic_write")
        .where("award.id = :id", { id })
        .getOne();
      if (!award) throw new NotFoundException("勋章记录不存在");
      if (award.status === "revoked") throw new BadRequestException("该勋章已被其他请求撤销");
      award.status = "revoked";
      award.revokedAt = new Date();
      award.revokedBy = admin?.username || `admin:${admin?.id || ""}`;
      award.revokeBusinessKey = businessKey;
      award.revokeReasonEncrypted = encryptStoredSecret(dto.reason);
      return repo.save(award);
    });
    await this.logOperation(admin, "volunteer.badge.revoke", "volunteer_badge_award", saved.id, `撤销志愿勋章：${saved.definition.name}`, { reason: dto.reason });
    return saved;
  }

  async issueVolunteerProof(profileId: number, dto: VolunteerProofDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "证明业务键");
    const proof = await this.dataSource.transaction(async (manager) => {
      const proofRepo = manager.getRepository(VolunteerServiceProof);
      const replay = await proofRepo.createQueryBuilder("proof").leftJoinAndSelect("proof.profile", "profile").leftJoinAndSelect("proof.serviceRecord", "serviceRecord").where("proof.businessKey = :businessKey", { businessKey }).getOne();
      if (replay) return replay;
      const record = await manager.getRepository(VolunteerServiceRecord).createQueryBuilder("record")
        .leftJoinAndSelect("record.profile", "profile")
        .leftJoinAndSelect("record.task", "task")
        .setLock("pessimistic_write")
        .where("record.id = :recordId", { recordId: dto.serviceRecordId })
        .andWhere("profile.id = :profileId", { profileId })
        .getOne();
      if (!record || record.status !== "confirmed") throw new BadRequestException("只有已确认的服务记录可以生成证明");
      const profile = record.profile;
      const proofNo = `VPR${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${uuidv4().replace(/-/g, "").slice(0, 16)}`;
      return proofRepo.save(proofRepo.create({ proofNo, businessKey, profile, serviceRecord: record, title: this.cleanText(dto.title, 160) || record.title, hours: record.confirmedHours, snapshot: { holderName: profile.name, profileNo: profile.profileNo, taskTitle: record.task?.title || null, serviceTitle: record.title, hours: record.confirmedHours, serviceDate: record.createdAt }, evidenceEncrypted: encryptStoredSecret(this.cleanText(dto.evidence, 500) || null), status: "active", issuer: admin?.id ? ({ id: admin.id } as AdminUser) : null, revokedAt: null, revokedBy: null, revokeBusinessKey: null, revokeReasonEncrypted: null }));
    });
    await this.logOperation(admin, "volunteer.proof.issue", "volunteer_service_proof", proof.id, `生成志愿服务证明：${proof.profile.name}`, { proofNo: proof.proofNo, serviceRecordId: proof.serviceRecord?.id || dto.serviceRecordId });
    return proof;
  }

  async volunteerProofs(profileId: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    return this.volunteerServiceProofs.createQueryBuilder("proof").leftJoinAndSelect("proof.profile", "profile").leftJoinAndSelect("proof.serviceRecord", "serviceRecord").where("profile.id = :profileId", { profileId }).orderBy("proof.issuedAt", "DESC").getMany();
  }

  async actionVolunteerProof(id: number, dto: VolunteerProofActionDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const businessKey = this.parseVolunteerBusinessKey(dto.businessKey, "证明撤销业务键");
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(VolunteerServiceProof);
      const replay = await repo.createQueryBuilder("proof").leftJoinAndSelect("proof.profile", "profile").where("proof.revokeBusinessKey = :businessKey", { businessKey }).getOne();
      if (replay) return replay;
      const proof = await repo.createQueryBuilder("proof")
        .leftJoinAndSelect("proof.profile", "profile")
        .setLock("pessimistic_write")
        .where("proof.id = :id", { id })
        .getOne();
      if (!proof) throw new NotFoundException("志愿服务证明不存在");
      if (proof.status === "revoked") throw new BadRequestException("该证明已被其他请求撤销");
      proof.status = "revoked";
      proof.revokedAt = new Date();
      proof.revokedBy = admin?.username || `admin:${admin?.id || ""}`;
      proof.revokeBusinessKey = businessKey;
      proof.revokeReasonEncrypted = encryptStoredSecret(dto.reason);
      return repo.save(proof);
    });
    await this.logOperation(admin, "volunteer.proof.revoke", "volunteer_service_proof", saved.id, `撤销志愿服务证明：${saved.proofNo}`, { reason: dto.reason });
    return saved;
  }

  async volunteerServiceRecordsList(query: VolunteerServiceRecordQueryDto = {}, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const builder = this.volunteerServiceRecords
      .createQueryBuilder("record")
      .leftJoinAndSelect("record.profile", "profile")
      .leftJoinAndSelect("record.task", "task")
      .leftJoinAndSelect("record.application", "application")
      .orderBy("record.id", "DESC");
    if (query.profileId) builder.andWhere("profile.id = :profileId", { profileId: query.profileId });
    const keyword = String(query.keyword || "").trim();
    if (keyword) builder.andWhere(new Brackets((scope) => {
      scope.where("record.title LIKE :keyword OR profile.name LIKE :keyword OR task.title LIKE :keyword", { keyword: `%${keyword}%` });
      if (/^1\d{10}$/.test(keyword)) scope.orWhere("profile.phoneLookupHash = :phoneHash OR profile.phone = :legacyPhone", { phoneHash: volunteerPhoneHash(keyword), legacyPhone: keyword });
    }));
    const city = String(query.city || "").trim();
    if (city) builder.andWhere("profile.city LIKE :city", { city: `%${city}%` });
    if (query.startDate) builder.andWhere("record.createdAt >= :startDate", { startDate: this.parseDate(query.startDate) });
    if (query.endDate) builder.andWhere("record.createdAt <= :endDate", { endDate: this.parseDate(query.endDate) });
    const rows = await builder.take(500).getMany();
    return rows.map((row) => this.adminVolunteerServiceRecord(row));
  }

  async exportVolunteerServiceRecords(query: VolunteerServiceRecordQueryDto = {}, admin?: AdminContext) {
    const rows = await this.volunteerServiceRecordsList(query, admin);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("volunteer-service-records");
    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "志愿者", key: "name", width: 14 },
      { header: "手机号", key: "phone", width: 18 },
      { header: "城市", key: "city", width: 16 },
      { header: "服务标题", key: "title", width: 24 },
      { header: "关联任务", key: "task", width: 24 },
      { header: "服务时长", key: "hours", width: 12 },
      { header: "证明材料", key: "proofUrl", width: 36 },
      { header: "服务评价/说明", key: "feedback", width: 36 },
      { header: "登记时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) =>
      sheet.addRow({
        id: row.id,
        name: row.profile?.name || "",
        phone: row.profile?.phoneMasked || maskPhone(row.profile?.phone) || "",
        city: row.profile?.city || "",
        title: row.title,
        task: row.task?.title || "",
        hours: Number(row.confirmedHours || row.submittedHours || row.hours || 0),
        proofUrl: row.proofUrl || "",
        feedback: row.feedback || "",
        createdAt: this.excelDateTime(row.createdAt)
      })
    );
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    await this.logExport(admin, "volunteer_service_records", rows.length, query);
    return workbook.xlsx.writeBuffer();
  }

  private adminVolunteerProfile(profile: VolunteerProfile) {
    const remark = decryptStoredSecret(profile.remarkEncrypted) || profile.remark || null;
    return {
      ...profile,
      phone: profile.phoneMasked || maskPhone(profile.phone),
      phoneMasked: profile.phoneMasked || maskPhone(profile.phone),
      phoneEncrypted: undefined,
      phoneLookupHash: undefined,
      emergencyContactEncrypted: undefined,
      remark: remark === "[encrypted]" ? null : remark,
      remarkEncrypted: undefined
    };
  }

  private adminVolunteerApplication(row: VolunteerTaskApplication) {
    return {
      ...row,
      profile: row.profile ? this.adminVolunteerProfile(row.profile) : null,
      phone: row.phoneMasked || maskPhone(row.phone),
      phoneMasked: row.phoneMasked || maskPhone(row.phone),
      phoneLookupHash: undefined,
      message: decryptStoredSecret(row.messageEncrypted) || row.message || null,
      messageEncrypted: undefined,
      remark: decryptStoredSecret(row.remarkEncrypted) || row.remark || null,
      remarkEncrypted: undefined,
      lastActionBusinessKey: undefined
    };
  }

  private adminVolunteerServiceRecord(row: VolunteerServiceRecord) {
    return {
      ...row,
      profile: this.adminVolunteerProfile(row.profile),
      proofUrl: decryptStoredSecret(row.proofEncrypted) || row.proofUrl || null,
      proofEncrypted: undefined,
      feedback: decryptStoredSecret(row.feedbackEncrypted) || row.feedback || null,
      feedbackEncrypted: undefined,
      rejectionReason: decryptStoredSecret(row.rejectionReasonEncrypted) || null,
      rejectionReasonEncrypted: undefined,
      volunteerConfirmationKey: undefined,
      supervisorConfirmationKey: undefined
    };
  }

  private volunteerProfileQuery(repo: Repository<VolunteerProfile>) {
    return repo.createQueryBuilder("profile")
      .leftJoinAndSelect("profile.user", "profileUser")
      .leftJoinAndSelect("profile.application", "profileApplication");
  }

  private volunteerServiceRecordQuery(repo: Repository<VolunteerServiceRecord>) {
    return repo.createQueryBuilder("record")
      .leftJoinAndSelect("record.profile", "profile")
      .leftJoinAndSelect("profile.user", "profileUser")
      .leftJoinAndSelect("record.task", "task")
      .leftJoinAndSelect("record.application", "application");
  }

  private async volunteerApplicationFromRaw(manager: EntityManager, repo: Repository<VolunteerTaskApplication>, raw: Record<string, unknown>) {
    const row = repo.create(raw as Partial<VolunteerTaskApplication>);
    const taskId = Number(raw.taskId || 0);
    const profileId = Number(raw.profileId || 0);
    const userId = Number(raw.userId || 0);
    const [[taskRaw], [profileRaw], [userRaw]] = await Promise.all([
      manager.query<Array<Record<string, unknown>>>("SELECT * FROM volunteer_tasks WHERE id = ? LIMIT 1", [taskId]),
      profileId ? manager.query<Array<Record<string, unknown>>>("SELECT * FROM volunteer_profiles WHERE id = ? LIMIT 1", [profileId]) : Promise.resolve([]),
      userId ? manager.query<Array<Record<string, unknown>>>("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]) : Promise.resolve([])
    ]);
    row.task = taskRaw ? manager.getRepository(VolunteerTask).create(taskRaw as Partial<VolunteerTask>) : null as any;
    row.profile = profileRaw ? manager.getRepository(VolunteerProfile).create(profileRaw as Partial<VolunteerProfile>) : null;
    row.user = userRaw ? manager.getRepository(User).create(userRaw as Partial<User>) : null;
    return row;
  }

  private adminVolunteerTraining(row: VolunteerTrainingRecord) {
    return { ...row, profile: this.adminVolunteerProfile(row.profile), certificateReference: decryptStoredSecret(row.certificateEncrypted) || null, certificateEncrypted: undefined, reviewRemark: decryptStoredSecret(row.reviewRemarkEncrypted) || null, reviewRemarkEncrypted: undefined, reviewBusinessKey: undefined };
  }

  private parseVolunteerBusinessKey(value: unknown, label: string) {
    try { return volunteerBusinessKey(value, label); } catch (error: any) { throw new BadRequestException(error.message); }
  }

  private async promoteVolunteerWaitlist(manager: EntityManager, taskId: number) {
    const repo = manager.getRepository(VolunteerTaskApplication);
    const task = await manager.getRepository(VolunteerTask).findOne({ where: { id: taskId } });
    if (!task) return null;
    const admittedCount = await repo.count({ where: { task: { id: taskId }, status: In(["admitted", "checked_in", "completed"]) as any } });
    if (admittedCount >= task.quota) return null;
    const next = await repo.createQueryBuilder("application").setLock("pessimistic_write").where("application.taskId = :taskId", { taskId }).andWhere("application.status = 'waitlisted'").orderBy("application.waitlistPosition", "ASC").addOrderBy("application.createdAt", "ASC").getOne();
    if (!next) return null;
    next.status = "admitted";
    next.admittedAt = new Date();
    next.waitlistPosition = null;
    next.lastActionBusinessKey = `volunteer:waitlist-promotion:${taskId}:${next.id}:${uuidv4()}`;
    return repo.save(next);
  }

  private async refreshVolunteerQualification(manager: EntityManager, profileId: number) {
    const profileRepo = manager.getRepository(VolunteerProfile);
    const profile = await profileRepo.createQueryBuilder("profile").setLock("pessimistic_write").where("profile.id = :profileId", { profileId }).getOne();
    if (!profile) return;
    const rows = await manager.getRepository(VolunteerTrainingRecord).find({ where: { profile: { id: profileId }, status: "approved" }, order: { expiresAt: "DESC" } });
    const valid = rows.filter((row) => !row.expiresAt || row.expiresAt >= new Date());
    if (profile.qualificationStatus !== "suspended") profile.qualificationStatus = valid.length ? "qualified" : rows.length ? "expired" : "unqualified";
    profile.qualificationExpiresAt = valid.map((row) => row.expiresAt).filter((value): value is Date => Boolean(value)).sort((a, b) => b.getTime() - a.getTime())[0] || null;
    await profileRepo.save(profile);
  }

  private async refreshVolunteerHours(manager: EntityManager, profileId: number) {
    const service = await manager.getRepository(VolunteerServiceRecord).createQueryBuilder("record").select("COALESCE(SUM(record.confirmedHours), 0)", "hours").where("record.profileId = :profileId", { profileId }).andWhere("record.status = 'confirmed'").getRawOne<{ hours: string }>();
    const adjustment = await manager.getRepository(VolunteerHourAdjustment).createQueryBuilder("adjustment").select("COALESCE(SUM(adjustment.deltaHours), 0)", "hours").where("adjustment.profileId = :profileId", { profileId }).getRawOne<{ hours: string }>();
    const total = Math.max(Number(service?.hours || 0) + Number(adjustment?.hours || 0), 0);
    const repo = manager.getRepository(VolunteerProfile);
    const profile = await repo.createQueryBuilder("profile").setLock("pessimistic_write").where("profile.id = :profileId", { profileId }).getOne();
    if (!profile) return;
    profile.serviceHours = total.toFixed(2);
    profile.level = this.volunteerLevel(total);
    if (total > 0 && profile.status === "pending") profile.status = "approved";
    await repo.save(profile);
    const definitionRepo = manager.getRepository(VolunteerBadgeDefinition);
    const awardRepo = manager.getRepository(VolunteerBadgeAward);
    const defaults = [
      { code: "service_first", name: "初次服务", description: "完成首次确认志愿服务", threshold: "1.00" },
      { code: "service_8h", name: "稳定同行", description: "累计确认服务满 8 小时", threshold: "8.00" },
      { code: "service_30h", name: "长期共建", description: "累计确认服务满 30 小时", threshold: "30.00" },
      { code: "service_80h", name: "城市伙伴", description: "累计确认服务满 80 小时", threshold: "80.00" }
    ];
    for (const item of defaults) {
      let definition = await definitionRepo.findOne({ where: { code: item.code } });
      if (!definition) definition = await definitionRepo.save(definitionRepo.create({ ...item, iconUrl: null, ruleType: "service_hours", enabled: true, version: 1 }));
      if (!definition.enabled || total < Number(definition.threshold)) continue;
      const businessKey = `volunteer:badge:${profileId}:${definition.code}:v${definition.version}`;
      if (await awardRepo.findOne({ where: { businessKey }, loadEagerRelations: false })) continue;
      const source = await manager.getRepository(VolunteerServiceRecord).createQueryBuilder("record").where("record.profileId = :profileId", { profileId }).andWhere("record.status = 'confirmed'").orderBy("record.createdAt", "DESC").getOne();
      await awardRepo.save(awardRepo.create({ businessKey, definition, profile, sourceServiceRecord: source, status: "active", awardedAt: new Date(), awardedBy: null, revokedAt: null, revokedBy: null, revokeReasonEncrypted: null }));
    }
  }

  private async ensureVolunteerProfileFromApplication(application: AmbassadorApplication) {
    const phoneHash = volunteerPhoneHash(application.phone);
    const existing = await this.volunteerProfiles.findOne({ where: [{ application: { id: application.id } }, { phoneLookupHash: phoneHash }, { phone: application.phone }], loadEagerRelations: false });
    if (existing) return existing;
    return this.volunteerProfiles.save(this.volunteerProfiles.create({
      profileNo: nextVolunteerNo("VLP"), applicationBusinessKey: `volunteer:profile:application:${application.id}`, user: null, application, name: application.name, phone: maskPhone(application.phone), phoneMasked: maskPhone(application.phone), phoneLookupHash: phoneHash, phoneEncrypted: encryptStoredSecret(application.phone), city: application.city,
      expertise: application.expertise, skills: application.expertise ? [application.expertise] : [], availableTime: null, availability: null, serviceIntent: application.source === "volunteer_apply" ? application.expertise : application.source || "公益招募",
      status: ["approved", "activated"].includes(application.status) ? "approved" : "pending", level: "participant", identityStatus: "pending", identityVerifiedAt: null, qualificationStatus: "unqualified", qualificationExpiresAt: null, emergencyContactEncrypted: null,
      serviceHours: "0.00", remark: null, remarkEncrypted: encryptStoredSecret((application.remarkEncrypted ? decryptStoredSecret(application.remarkEncrypted) : application.remark) || application.experience || null), statusReason: null
    }));
  }

  private async ensureVolunteerProfileFromTaskApplication(application: VolunteerTaskApplication) {
    if (application.profile) return application.profile;
    const rawPhone = application.phone;
    const phoneHash = application.phoneLookupHash || volunteerPhoneHash(rawPhone);
    let profile = await this.volunteerProfiles.findOne({ where: [{ phoneLookupHash: phoneHash }, { phone: rawPhone }], loadEagerRelations: false });
    if (!profile) {
      profile = await this.volunteerProfiles.save(this.volunteerProfiles.create({
        profileNo: nextVolunteerNo("VLP"), applicationBusinessKey: `volunteer:profile:task-application:${application.id}`, user: application.user || null, application: null, name: application.name, phone: maskPhone(rawPhone), phoneMasked: maskPhone(rawPhone), phoneLookupHash: phoneHash, phoneEncrypted: encryptStoredSecret(rawPhone), city: application.city,
        expertise: application.task?.type || null, skills: application.task?.type ? [application.task.type] : [], availableTime: null, availability: null, serviceIntent: application.task?.title || "志愿任务",
        status: "approved", level: "participant", identityStatus: "pending", identityVerifiedAt: null, qualificationStatus: "unqualified", qualificationExpiresAt: null, emergencyContactEncrypted: null,
        serviceHours: "0.00", remark: null, remarkEncrypted: application.messageEncrypted || encryptStoredSecret(application.message || null), statusReason: null
      }));
    }
    application.profile = profile;
    await this.volunteerTaskApplicationsRepo.save(application);
    return profile;
  }

  private volunteerLevel(hours: number) {
    if (hours >= 80) return "city_builder";
    if (hours >= 30) return "ambassador";
    if (hours >= 8) return "volunteer";
    return "participant";
  }

  private async ensureVolunteerCertificate(profile: VolunteerProfile, admin?: AdminContext, customName?: string, customTemplate?: string) {
    if (!profile.user) return null;
    const name = this.cleanText(customName, 120) || this.volunteerCertificateName(profile);
    const templateKey = this.volunteerCertificateTemplate(profile, customTemplate);
    const [latestRecordRaw] = await this.dataSource.query<Array<Record<string, unknown>>>("SELECT * FROM volunteer_service_records WHERE profileId = ? ORDER BY createdAt DESC LIMIT 1", [profile.id]);
    const latestRecord = latestRecordRaw ? this.volunteerServiceRecords.create(latestRecordRaw as Partial<VolunteerServiceRecord>) : null;
    const [taskTenant] = latestRecordRaw?.taskId ? await this.dataSource.query<Array<{ tenantId: number | null }>>("SELECT tenantId FROM volunteer_tasks WHERE id = ? LIMIT 1", [latestRecordRaw.taskId]) : [];
    const tenantId = Number(taskTenant?.tenantId || 0) || null;
    const [existingRaw] = await this.dataSource.query<Array<Record<string, unknown>>>("SELECT * FROM certificates WHERE userId = ? AND name = ? AND status = 'active' LIMIT 1", [profile.user.id, name]);
    const existing = existingRaw ? this.certificates.create(existingRaw as Partial<Certificate>) : null;
    if (existing) {
      existing.templateKey = existing.templateKey || templateKey;
      existing.holderName = existing.holderName || profile.name;
      existing.serviceHours = Number(profile.serviceHours || 0).toFixed(2);
      existing.level = profile.level || null;
      existing.tenantId = existing.tenantId || tenantId;
      existing.serviceRecord = existing.serviceRecord || latestRecord || null;
      existing.issuer = existing.issuer || (admin?.id ? ({ id: admin.id } as any) : null);
      const template = await this.credentialTemplates.ensureCertificateSnapshot(existing);
      existing.certificateNo = existing.certificateNo || await this.nextCertificateNo(templateKey, template.config.numberPrefix);
      return this.certificates.save(existing);
    }
    const template = await this.credentialTemplates.publishedSnapshot(templateKey, tenantId);
    const certificate = await this.certificates.save(this.certificates.create({
      userId: profile.user.id,
      tenantId,
      courseId: null,
      courseTemplateId: null,
      name,
      certificateNo: await this.nextCertificateNo(templateKey, template.config.numberPrefix),
      issueBusinessKey: `volunteer:certificate:${profile.id}:${createHash("sha256").update(`${templateKey}:${name}`).digest("hex")}`,
      certificateVersion: 1,
      templateVersion: template.version,
      templateSnapshot: template.config,
      templateKey,
      holderName: profile.name,
      serviceHours: Number(profile.serviceHours || 0).toFixed(2),
      level: profile.level || null,
      imageUrl: null,
      threshold: Math.floor(Number(profile.serviceHours || 0)),
      serviceRecord: latestRecord || null,
      issuer: admin?.id ? ({ id: admin.id } as any) : null,
      status: "active",
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
      revokeReasonEncrypted: null
    }));
    await this.logOperation(admin, "volunteer.certificate.issue", "certificate", certificate.id, `发放志愿证书：${profile.name}`, { userId: profile.user.id, profileId: profile.id, name });
    return certificate;
  }

  private volunteerCertificateTemplate(profile: VolunteerProfile, customTemplate?: string) {
    if (["volunteer_service", "charity_ambassador", "city_builder"].includes(String(customTemplate || ""))) return customTemplate as any;
    if (profile.level === "city_builder") return "city_builder";
    if (profile.level === "ambassador") return "charity_ambassador";
    return "volunteer_service";
  }

  private async nextCertificateNo(templateKey: string, customPrefix?: string) {
    const prefixMap: Record<string, string> = { volunteer_service: "MPVS", charity_ambassador: "MPCA", city_builder: "MPCB" };
    const prefix = customPrefix || prefixMap[templateKey] || "MPC";
    for (let index = 0; index < 5; index++) {
      const no = `${prefix}${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${String(Date.now()).slice(-6)}${index ? String(index) : ""}`;
      const [exists] = await this.dataSource.query<Array<{ id: number }>>("SELECT id FROM certificates WHERE certificateNo = ? LIMIT 1", [no]);
      if (!exists) return no;
    }
    return `${prefix}${Date.now()}`;
  }

  private volunteerCertificateName(profile: VolunteerProfile) {
    const level = this.volunteerLevelText(profile.level || "participant");
    const hours = Number(profile.serviceHours || 0).toFixed(1);
    return `慢π·${level}志愿服务证书（${hours}小时）`;
  }

  private volunteerProfileStatusText(status?: string | null) {
    const map: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已拒绝", inactive: "已停用" };
    return map[String(status || "")] || status || "";
  }

  private volunteerLevelText(level?: string | null) {
    const map: Record<string, string> = { participant: "公益参与者", volunteer: "公益志愿者", ambassador: "公益大使", city_builder: "城市共建者" };
    return map[String(level || "")] || level || "";
  }

  private excelDateTime(value?: Date | string | null) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 19).replace("T", " ");
  }

  async analyticsOverview(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const builders = this.analyticsBuilders(scope, admin);
    const [eventCounts, paidAmount, refundAmount, walletRechargeAmount, charitySummary, activeUserCount, tenantRanking, risk, metricRows] = await Promise.all([
      builders.events.select("event.type", "type").addSelect("COUNT(1)", "count").groupBy("event.type").getRawMany<{ type: string; count: string }>(),
      builders.payments.select("COALESCE(SUM(transaction.amount), 0)", "sum").andWhere("transaction.status = :status", { status: "success" }).getRawOne<{ sum: string }>(),
      builders.refunds.select("COALESCE(SUM(refund.amount), 0)", "sum").andWhere("refund.status = :status", { status: "completed" }).getRawOne<{ sum: string }>(),
      builders.walletTx.select("COALESCE(SUM(walletTx.amount), 0)", "sum").andWhere("walletTx.direction = :direction", { direction: "credit" }).andWhere("walletTx.type = :type", { type: "admin_recharge" }).getRawOne<{ sum: string }>(),
      this.charityFund.adminSummary(admin),
      builders.events.select("COUNT(DISTINCT event.userId)", "count").andWhere("event.userId IS NOT NULL").getRawOne<{ count: string }>(),
      this.analyticsTenantRanking(scope, admin),
      this.analyticsRisk(scope, admin),
      this.analyticsReportMetricRows(query, scope, scope.activityId ? "activity" : scope.tenantId ? "tenant" : "platform", String(scope.activityId || scope.tenantId || "all"), admin)
    ]);
    const counts = Object.fromEntries(eventCounts.map((row) => [row.type, Number(row.count || 0)]));
    if (metricRows.length) {
      const metricToEvent: Record<string, string> = { activity_views: "view", share_visits: "share_visit", registrations_submitted: "register", payments_succeeded: "pay", check_ins: "check_in", reviews_submitted: "review", registrations_cancelled: "cancel", refunds_succeeded: "refund" };
      for (const key of Object.values(metricToEvent)) counts[key] = 0;
      for (const row of metricRows) { const key = metricToEvent[row.metricKey]; if (key) counts[key] = Number(counts[key] || 0) + Number(row.value || 0); }
    }
    const metricPaidFen = metricRows.filter((row) => row.metricKey === "payments_succeeded").reduce((sum, row) => sum + Number(row.amountFen || 0), 0);
    const metricRefundFen = Math.abs(metricRows.filter((row) => row.metricKey === "refunds_succeeded").reduce((sum, row) => sum + Number(row.amountFen || 0), 0));
    const paidTotal = metricRows.length ? metricPaidFen / 100 : Number(paidAmount?.sum || 0);
    const refundTotal = metricRows.length ? metricRefundFen / 100 : Number(refundAmount?.sum || 0);
    const totals = {
      viewCount: counts.view || 0,
      registrationCount: counts.register || 0,
      paidCount: counts.pay || 0,
      checkInCount: counts.check_in || 0,
      reviewCount: counts.review || 0,
      activeUserCount: Number(activeUserCount?.count || 0),
      paidAmount: paidTotal.toFixed(2),
      refundAmount: refundTotal.toFixed(2),
      netAmount: Math.max(0, paidTotal - refundTotal).toFixed(2),
      walletRechargeAmount: Number(walletRechargeAmount?.sum || 0).toFixed(2),
      charityAccruedAmount: charitySummary.totalAccrued,
      charityAvailableAmount: charitySummary.availableAmount,
      charityDisbursedAmount: charitySummary.totalDisbursed,
      charityReversedAmount: charitySummary.totalReversed
    };
    const rates = {
      signupRate: this.rate(counts.register || 0, counts.view || 0),
      paymentRate: this.rate(counts.pay || 0, counts.register || 0),
      checkInRate: this.rate(counts.check_in || 0, counts.pay || 0),
      reviewRate: this.rate(counts.review || 0, counts.check_in || 0)
    };
    return {
      scope: scope.tenantId ? "tenant" : "platform",
      range: { startDate: scope.startDate?.toISOString() || null, endDate: scope.endDate?.toISOString() || null },
      totals,
      rates,
      tenantRanking,
      risk,
      operationAdvice: this.analyticsOperationAdvice(totals, rates, risk)
      ,metricSource: metricRows.length ? "daily_metrics" : "live_tables"
    };
  }

  async analyticsTrends(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const metricRows = await this.analyticsReportMetricRows(query, scope, scope.activityId ? "activity" : scope.tenantId ? "tenant" : "platform", String(scope.activityId || scope.tenantId || "all"), admin);
    if (metricRows.length) {
      const byDate = new Map<string, any>();
      const metricToEvent: Record<string, string> = { activity_views: "view", share_visits: "share_visit", registrations_submitted: "register", payments_succeeded: "pay", check_ins: "check_in", reviews_submitted: "review", registrations_cancelled: "cancel", refunds_succeeded: "refund" };
      for (const row of metricRows) {
        const item = byDate.get(row.metricDate) || { date: row.metricDate, view: 0, share_visit: 0, register: 0, pay: 0, check_in: 0, review: 0, cancel: 0, refund: 0, paidAmount: "0.00", refundAmount: "0.00" };
        const eventKey = metricToEvent[row.metricKey]; if (eventKey) item[eventKey] = Number(row.value || 0);
        if (row.metricKey === "payments_succeeded") item.paidAmount = (Number(row.amountFen || 0) / 100).toFixed(2);
        if (row.metricKey === "refunds_succeeded") item.refundAmount = (Math.abs(Number(row.amountFen || 0)) / 100).toFixed(2);
        byDate.set(row.metricDate, item);
      }
      return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    const eventBuilder = this.conversionEvents.createQueryBuilder("event").select("DATE(event.createdAt)", "date").addSelect("event.type", "type").addSelect("COUNT(1)", "count").groupBy("DATE(event.createdAt)").addGroupBy("event.type").orderBy("date", "ASC");
    this.applyAnalyticsScope(eventBuilder, "event", scope, admin);
    applyAdminActivityDataScope(eventBuilder, "event", admin?.dataScope);
    const amountBuilder = this.paymentTransactions.createQueryBuilder("transaction").select("DATE(transaction.createdAt)", "date").addSelect("COALESCE(SUM(transaction.amount), 0)", "amount").where("transaction.status = :status", { status: "success" }).andWhere("transaction.businessType = :activityBusinessType", { activityBusinessType: "activity" }).groupBy("DATE(transaction.createdAt)").orderBy("date", "ASC");
    this.applyAnalyticsScope(amountBuilder, "transaction", scope, admin);
    applyAdminActivityDataScope(amountBuilder, "transaction", admin?.dataScope);
    const [events, amounts] = await Promise.all([eventBuilder.getRawMany<{ date: string; type: string; count: string }>(), amountBuilder.getRawMany<{ date: string; amount: string }>()]);
    const byDate = new Map<string, Record<string, unknown>>();
    for (const row of events) {
      const item = byDate.get(row.date) || { date: row.date, view: 0, register: 0, pay: 0, check_in: 0, review: 0, paidAmount: "0.00" };
      item[row.type] = Number(row.count || 0);
      byDate.set(row.date, item);
    }
    for (const row of amounts) {
      const item = byDate.get(row.date) || { date: row.date, view: 0, register: 0, pay: 0, check_in: 0, review: 0, paidAmount: "0.00" };
      item.paidAmount = Number(row.amount || 0).toFixed(2);
      byDate.set(row.date, item);
    }
    return Array.from(byDate.values()).sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
  }

  async analyticsChannels(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const metricRows = await this.analyticsReportMetricRows(query, scope, "channel", undefined, admin);
    if (metricRows.length) {
      const channelIds = Array.from(new Set(metricRows.map((row) => Number(row.dimensionKey)).filter(Boolean)));
      const channels = channelIds.length ? await this.activityChannels.find({ where: { id: In(channelIds) }, relations: { activity: true } }) : [];
      const channelMap = new Map(channels.map((channel) => [channel.id, channel]));
      const grouped = new Map<number, Record<string, number>>();
      const metricNames: Record<string, string> = { activity_views: "viewCount", registrations_submitted: "registrationCount", payments_succeeded: "paidCount", check_ins: "checkInCount" };
      for (const row of metricRows) {
        const id = Number(row.dimensionKey); const item = grouped.get(id) || { viewCount: 0, registrationCount: 0, paidCount: 0, checkInCount: 0, paidAmountFen: 0 };
        const field = metricNames[row.metricKey]; if (field) item[field] += Number(row.value || 0);
        if (row.metricKey === "payments_succeeded") item.paidAmountFen += Number(row.amountFen || 0);
        grouped.set(id, item);
      }
      return Array.from(grouped.entries()).map(([id, values]) => { const channel = channelMap.get(id); return { id, name: channel?.name || `渠道 ${id}`, code: channel?.code || "", source: channel?.source || "", activityId: channel?.activity?.id || null, activityTitle: channel?.activity?.title || "", viewCount: values.viewCount, registrationCount: values.registrationCount, paidCount: values.paidCount, checkInCount: values.checkInCount, signupRate: this.rate(values.registrationCount, values.viewCount), paymentRate: this.rate(values.paidCount, values.registrationCount), paidAmount: (values.paidAmountFen / 100).toFixed(2), metricSource: "daily_metrics" }; }).sort((a, b) => b.paidCount - a.paidCount || b.registrationCount - a.registrationCount);
    }
    const rows = await this.channelReportBuilder(scope, admin).getRawMany<any>();
    return rows.map((row) => ({ ...this.channelReportRow(row), metricSource: "live_tables" }));
  }

  async exportAnalyticsMetrics(query: AnalyticsMetricQueryDto = {}, admin?: AdminContext) {
    const rows = await this.analyticsMetricRows(query, admin);
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [["日期", "租户作用域", "维度类型", "维度键", "指标", "数量", "金额分", "计算版本", "运行批次"].map(escape).join(","), ...rows.map((row) => [row.metricDate, row.tenantScopeKey, row.dimensionType, row.dimensionKey, row.metricKey, row.value, row.amountFen, row.calculationVersion, row.sourceRunId].map(escape).join(","))];
    await this.logExport(admin, "analytics_metrics", rows.length, query);
    return `\uFEFF${lines.join("\r\n")}`;
  }

  async analyticsUsers(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const memberScopeKey = homepagePublicationScopeKey(scope.tenantId || null);
    const participationStatuses = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
    const scopedActivityIds = adminActivityScopeIds(admin?.dataScope);
    const newUserBuilder = scope.tenantId
      ? this.memberProfiles.createQueryBuilder("newProfile").where("newProfile.tenantScopeKey = :memberScopeKey", { memberScopeKey })
      : this.users.createQueryBuilder("newUser");
    if (scopedActivityIds !== null) {
      if (!scopedActivityIds.length) newUserBuilder.andWhere("1 = 0");
      else newUserBuilder.andWhere(`${scope.tenantId ? "newProfile.userId" : "newUser.id"} IN (SELECT scoped_member_registration.userId FROM registrations scoped_member_registration WHERE scoped_member_registration.activityId IN (:...memberScopeActivityIds))`, { memberScopeActivityIds: scopedActivityIds });
    }
    if (scope.startDate) newUserBuilder.andWhere(`${scope.tenantId ? "newProfile" : "newUser"}.createdAt >= :startDate`, { startDate: scope.startDate });
    if (scope.endDate) newUserBuilder.andWhere(`${scope.tenantId ? "newProfile" : "newUser"}.createdAt < :endDate`, { endDate: scope.endDate });
    const repeatUserBuilder = this.registrations.createQueryBuilder("repeatRegistration")
      .leftJoin("repeatRegistration.activity", "repeatActivity")
      .select("repeatRegistration.userId", "userId")
      .where("repeatRegistration.userId IS NOT NULL")
      .andWhere("repeatRegistration.status IN (:...participationStatuses)", { participationStatuses })
      .groupBy("repeatRegistration.userId")
      .having("COUNT(repeatRegistration.id) > 1");
    if (scope.tenantId) repeatUserBuilder.andWhere("(repeatRegistration.tenantId = :repeatTenantId OR repeatActivity.tenantId = :repeatTenantId)", { repeatTenantId: scope.tenantId });
    if (scope.startDate) repeatUserBuilder.andWhere("repeatRegistration.createdAt >= :repeatStartDate", { repeatStartDate: scope.startDate });
    if (scope.endDate) repeatUserBuilder.andWhere("repeatRegistration.createdAt < :repeatEndDate", { repeatEndDate: scope.endDate });
    if (scopedActivityIds !== null) {
      if (!scopedActivityIds.length) repeatUserBuilder.andWhere("1 = 0");
      else repeatUserBuilder.andWhere("repeatRegistration.activityId IN (:...repeatScopeActivityIds)", { repeatScopeActivityIds: scopedActivityIds });
    }
    const memberLevelBuilder = this.memberProfiles.createQueryBuilder("profile").leftJoin("profile.level", "level")
      .select("COALESCE(level.name, '普通用户')", "level").addSelect("COUNT(1)", "count")
      .where("profile.tenantScopeKey = :memberScopeKey", { memberScopeKey })
      .groupBy("COALESCE(level.name, '普通用户')");
    if (scopedActivityIds !== null) {
      if (!scopedActivityIds.length) memberLevelBuilder.andWhere("1 = 0");
      else memberLevelBuilder.andWhere("profile.userId IN (SELECT scoped_level_registration.userId FROM registrations scoped_level_registration WHERE scoped_level_registration.activityId IN (:...memberLevelScopeActivityIds))", { memberLevelScopeActivityIds: scopedActivityIds });
    }
    const activeUserBuilder = this.conversionEvents.createQueryBuilder("event")
      .select("COUNT(DISTINCT event.userId)", "count")
      .where("event.userId IS NOT NULL");
    this.applyAnalyticsScope(activeUserBuilder, "event", scope, admin);
    applyAdminActivityDataScope(activeUserBuilder, "event", admin?.dataScope);
    const categoryPreferenceBuilder = this.registrations.createQueryBuilder("registration")
      .leftJoin("registration.activity", "activity")
      .leftJoin("activity.category", "category")
      .select("COALESCE(category.name, '未分类')", "category")
      .addSelect("COUNT(1)", "count")
      .where("registration.status IN (:...participationStatuses)", { participationStatuses })
      .groupBy("COALESCE(category.name, '未分类')")
      .orderBy("count", "DESC")
      .limit(8);
    if (scope.tenantId) categoryPreferenceBuilder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: scope.tenantId });
    if (scope.startDate) categoryPreferenceBuilder.andWhere("registration.createdAt >= :categoryStartDate", { categoryStartDate: scope.startDate });
    if (scope.endDate) categoryPreferenceBuilder.andWhere("registration.createdAt < :categoryEndDate", { categoryEndDate: scope.endDate });
    applyAdminActivityDataScope(categoryPreferenceBuilder, "registration", admin?.dataScope);
    const [newUsers, activeUsers, repeatUserRows, memberLevels, categoryPreference] = await Promise.all([
      newUserBuilder.getCount(),
      activeUserBuilder.getRawOne<{ count: string }>(),
      repeatUserBuilder.getRawMany<{ userId: string }>(),
      memberLevelBuilder.getRawMany<{ level: string; count: string }>(),
      categoryPreferenceBuilder.getRawMany<{ category: string; count: string }>()
    ]);
    return {
      newUserCount: newUsers,
      activeUserCount: Number(activeUsers?.count || 0),
      repeatUserCount: repeatUserRows.length,
      memberLevels: memberLevels.map((row) => ({ level: row.level, count: Number(row.count || 0) })),
      categoryPreference: categoryPreference.map((row) => ({ category: row.category, count: Number(row.count || 0) }))
    };
  }

  async supportSearch(query: SupportQueryDto, admin?: AdminContext) {
    const keyword = String(query.keyword || "").trim();
    if (keyword.length < 2) throw new BadRequestException("请输入至少 2 个字符的手机号、订单号、报名人或活动关键词");
    const like = `%${keyword}%`;
    const tenantId = this.isTenantScoped(admin) ? Number(admin?.tenantId || 0) : Number(query.tenantId || 0);
    const tenantFilter = Number.isFinite(tenantId) && tenantId > 0 ? tenantId : 0;
    if (!this.isTenantScoped(admin) && tenantFilter) {
      const tenant = await this.tenants.findOneBy({ id: tenantFilter });
      if (!tenant) throw new NotFoundException("筛选商家不存在");
    }

    const userBuilder = this.users
      .createQueryBuilder("user")
      .where("(user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: like })
      .orderBy("user.updatedAt", "DESC")
      .take(10);
    if (tenantFilter) {
      userBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM registrations scopedRegistration
          LEFT JOIN activities scopedActivity ON scopedActivity.id = scopedRegistration.activityId
          WHERE scopedRegistration.userId = user.id
          AND (scopedRegistration.tenantId = :tenantId OR scopedActivity.tenantId = :tenantId)
        )`,
        { tenantId: tenantFilter }
      );
    }

    const registrationBuilder = this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndMapOne("registration.order", Order, "linkedOrder", "linkedOrder.registrationId = registration.id")
      .where("(activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword OR registration.checkInCode LIKE :keyword OR linkedOrder.orderNo LIKE :keyword OR JSON_EXTRACT(registration.answers, '$') LIKE :keyword)", { keyword: like })
      .orderBy("registration.createdAt", "DESC")
      .take(20);
    this.applyTenantScope(registrationBuilder, "registration", admin);
    if (tenantFilter && !this.isTenantScoped(admin)) registrationBuilder.andWhere("(tenant.id = :tenantId OR activityTenant.id = :tenantId)", { tenantId: tenantFilter });

    const orderBuilder = this.orders
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("order.tenant", "tenant")
      .leftJoinAndSelect("order.agent", "agent")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("order.ticketType", "ticketType")
      .where("(order.orderNo LIKE :keyword OR order.transactionNo LIKE :keyword OR activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: like })
      .orderBy("order.createdAt", "DESC")
      .take(20);
    this.applyTenantScope(orderBuilder, "order", admin);
    if (tenantFilter && !this.isTenantScoped(admin)) orderBuilder.andWhere("(tenant.id = :tenantId OR activityTenant.id = :tenantId)", { tenantId: tenantFilter });

    const refundBuilder = this.refunds
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .leftJoinAndSelect("refund.tenant", "tenant")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .where("(refund.refundNo LIKE :keyword OR order.orderNo LIKE :keyword OR activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: like })
      .orderBy("refund.createdAt", "DESC")
      .take(20);
    this.applyTenantScope(refundBuilder, "refund", admin);
    if (tenantFilter && !this.isTenantScoped(admin)) refundBuilder.andWhere("(tenant.id = :tenantId OR order.tenantId = :tenantId OR activityTenant.id = :tenantId)", { tenantId: tenantFilter });

    const [users, registrations, orders, refunds] = await Promise.all([userBuilder.getMany(), registrationBuilder.getMany(), orderBuilder.getMany(), refundBuilder.getMany()]);
    const userIds = Array.from(
      new Set([
        ...users.map((user) => user.id),
        ...registrations.map((registration) => registration.user?.id).filter(Boolean),
        ...orders.map((order) => order.registration?.user?.id).filter(Boolean),
        ...refunds.map((refund) => refund.order?.registration?.user?.id).filter(Boolean)
      ].map(Number))
    );
    const phones = Array.from(new Set(users.map((user) => user.phone).filter(Boolean) as string[]));

    const notificationBuilder = this.notifications
      .createQueryBuilder("notification")
      .leftJoinAndSelect("notification.user", "user")
      .leftJoinAndSelect("notification.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .where(
        new Brackets((qb) => {
          qb.where("(notification.title LIKE :keyword OR notification.content LIKE :keyword OR activity.title LIKE :keyword)", { keyword: like });
          if (userIds.length) qb.orWhere("user.id IN (:...userIds)", { userIds });
        })
      )
      .orderBy("notification.createdAt", "DESC")
      .take(20);
    if (tenantFilter) {
      notificationBuilder.andWhere(userIds.length ? "(activityTenant.id = :tenantId OR user.id IN (:...userIds))" : "activityTenant.id = :tenantId", { tenantId: tenantFilter, userIds });
    }

    const authCodeBuilder = this.h5AuthCodeLogs.createQueryBuilder("log").where("log.phone LIKE :keyword", { keyword: like }).orderBy("log.createdAt", "DESC").take(20);
    if (tenantFilter) {
      if (!phones.length) {
        authCodeBuilder.andWhere("1 = 0");
      } else {
        authCodeBuilder.andWhere("log.phone IN (:...phones)", { phones });
      }
    }

    const [notifications, h5AuthCodeLogs] = await Promise.all([notificationBuilder.getMany(), authCodeBuilder.getMany()]);
    const pendingPayments = orders.filter((order) => order.status === OrderStatus.PendingPayment).length;
    const pendingRefunds = refunds.filter((refund) => ["pending", "processing", "failed"].includes(refund.status)).length;
    const rejectedRegistrations = registrations.filter((registration) => [RegistrationStatus.Rejected, RegistrationStatus.Cancelled].includes(registration.status)).length;

    return {
      keyword,
      scope: tenantFilter ? { type: "tenant", tenantId: tenantFilter } : { type: "platform", tenantId: null },
      summary: {
        userCount: users.length,
        registrationCount: registrations.length,
        orderCount: orders.length,
        refundCount: refunds.length,
        pendingPayments,
        pendingRefunds
      },
      users: users.map((user) => ({ id: user.id, phone: maskPhone(user.phone), nickname: user.nickname, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt })),
      registrations: registrations.map((registration: Registration & { order?: Order }) => ({
        id: registration.id,
        status: registration.status,
        checkInCode: registration.checkInCode,
        reviewRemark: registration.reviewRemark,
        cancelReason: registration.cancelReason,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
        tenant: registration.tenant || registration.activity?.tenant ? { id: (registration.tenant || registration.activity.tenant)?.id, name: (registration.tenant || registration.activity.tenant)?.name } : null,
        activity: registration.activity ? { id: registration.activity.id, title: registration.activity.title, startTime: registration.activity.startTime } : null,
        user: registration.user ? { id: registration.user.id, phone: maskPhone(registration.user.phone), nickname: registration.user.nickname } : null,
        order: registration.order ? { id: registration.order.id, orderNo: registration.order.orderNo, status: registration.order.status, amount: registration.order.amount, paymentMethod: registration.order.paymentMethod } : null
      })),
      orders: orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        amount: order.amount,
        paymentMethod: order.paymentMethod,
        transactionNo: order.transactionNo,
        paidAt: order.paidAt,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        tenant: order.tenant || order.registration?.activity?.tenant ? { id: (order.tenant || order.registration.activity.tenant)?.id, name: (order.tenant || order.registration.activity.tenant)?.name } : null,
        agent: order.agent ? { id: order.agent.id, name: order.agent.name } : null,
        activity: order.registration?.activity ? { id: order.registration.activity.id, title: order.registration.activity.title } : null,
        user: order.registration?.user ? { id: order.registration.user.id, phone: maskPhone(order.registration.user.phone), nickname: order.registration.user.nickname } : null,
        ticketType: order.ticketType ? { id: order.ticketType.id, name: order.ticketType.name } : null
      })),
      refunds: refunds.map((refund) => ({
        id: refund.id,
        refundNo: refund.refundNo,
        amount: refund.amount,
        status: refund.status,
        reason: refund.reason,
        reviewRemark: refund.reviewRemark,
        providerRefundStatus: refund.providerRefundStatus,
        providerRefundFailureReason: refund.providerRefundFailureReason,
        createdAt: refund.createdAt,
        completedAt: refund.completedAt,
        order: refund.order ? { id: refund.order.id, orderNo: refund.order.orderNo, status: refund.order.status, amount: refund.order.amount } : null,
        user: refund.order?.registration?.user ? { id: refund.order.registration.user.id, phone: maskPhone(refund.order.registration.user.phone), nickname: refund.order.registration.user.nickname } : null,
        activity: refund.order?.registration?.activity ? { id: refund.order.registration.activity.id, title: refund.order.registration.activity.title } : null
      })),
      notifications: notifications.map((notification) => ({
        id: notification.id,
        channel: notification.channel,
        title: notification.title,
        status: notification.status,
        provider: notification.provider,
        providerMessageId: notification.providerMessageId,
        errorMessage: notification.errorMessage,
        retryCount: notification.retryCount,
        sentAt: notification.sentAt,
        failedAt: notification.failedAt,
        createdAt: notification.createdAt,
        user: notification.user ? { id: notification.user.id, phone: maskPhone(notification.user.phone), nickname: notification.user.nickname } : null,
        activity: notification.activity ? { id: notification.activity.id, title: notification.activity.title } : null
      })),
      h5AuthCodeLogs: h5AuthCodeLogs.map((log) => ({
        id: log.id,
        phone: maskPhone(log.phone),
        mode: log.mode,
        status: log.status,
        provider: log.provider,
        providerMessageId: log.providerMessageId,
        message: log.message,
        createdAt: log.createdAt
      })),
      advice: [
        pendingPayments ? `有 ${pendingPayments} 笔待付款订单，优先确认用户是否已支付或是否需要重新引导付款。` : "",
        pendingRefunds ? `有 ${pendingRefunds} 笔待处理/异常退款，建议财务先核对退款状态。` : "",
        rejectedRegistrations ? `有 ${rejectedRegistrations} 条被拒绝或取消的报名，客服解释时需查看审核备注或取消原因。` : ""
      ].filter(Boolean)
    };
  }

  async revealSupportUserPhone(userId: number, dto: SupportSensitiveRevealDto, admin?: AdminContext) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存在");
    const tenantId = this.isTenantScoped(admin) ? Number(admin?.tenantId || 0) : Number(dto.tenantId || 0);
    if (tenantId) {
      const count = await this.registrations.createQueryBuilder("registration").leftJoin("registration.activity", "activity").where("registration.userId = :userId", { userId }).andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId }).getCount();
      if (!count) throw new ForbiddenException("该用户不属于当前商家数据范围");
    }
    await this.logOperation(admin, "support.sensitive_reveal", "user", user.id, `客服授权查看用户手机号：${user.id}`, { reason: dto.reason.trim(), tenantId: tenantId || null, field: "phone" });
    return { userId: user.id, phone: user.phone, reason: dto.reason.trim(), revealedAt: new Date() };
  }

  async analyticsBusinessOverview(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const tenantId = scope.tenantId;
    const activityBuilder = this.activities.createQueryBuilder("activity");
    const courseBuilder = this.courses.createQueryBuilder("course");
    const courseOrderBuilder = this.dataSource.getRepository(CourseOrder).createQueryBuilder("order").leftJoin("order.course", "course");
    const courseRefundBuilder = this.dataSource.getRepository(CourseRefund).createQueryBuilder("courseRefund").leftJoin("courseRefund.order", "courseRefundOrder").leftJoin("courseRefundOrder.course", "courseRefundCourse").where("courseRefund.status = 'completed'");
    const charityBuilder = this.dataSource.getRepository(CharityProject).createQueryBuilder("project");
    const mallMerchantBuilder = this.dataSource.getRepository(MallMerchant).createQueryBuilder("merchant");
    const mallOrderBuilder = this.dataSource.getRepository(MallOrder).createQueryBuilder("order").leftJoin("order.merchant", "merchant");
    const mallRefundBuilder = this.dataSource.getRepository(MallRefund).createQueryBuilder("mallRefund").leftJoin("mallRefund.merchant", "refundMerchant").where("mallRefund.completedAt IS NOT NULL");
    const activityOrderBuilder = this.orders.createQueryBuilder("businessOrder").leftJoin("businessOrder.registration", "businessRegistration").leftJoin("businessRegistration.activity", "businessActivity");
    const activityRefundBuilder = this.refunds.createQueryBuilder("businessRefund").leftJoin("businessRefund.order", "businessRefundOrder").leftJoin("businessRefundOrder.registration", "businessRefundRegistration").leftJoin("businessRefundRegistration.activity", "businessRefundActivity").where("businessRefund.status = 'completed'");
    if (tenantId) {
      activityBuilder.where("activity.tenantId = :tenantId", { tenantId }); activityOrderBuilder.andWhere("businessActivity.tenantId = :tenantId", { tenantId }); activityRefundBuilder.andWhere("businessRefundActivity.tenantId = :tenantId", { tenantId }); courseBuilder.where("course.tenantId = :tenantId", { tenantId }); courseOrderBuilder.where("course.tenantId = :tenantId", { tenantId }); courseRefundBuilder.andWhere("courseRefundCourse.tenantId = :tenantId", { tenantId }); charityBuilder.where("project.tenantId = :tenantId", { tenantId }); mallMerchantBuilder.where("merchant.tenantId = :tenantId", { tenantId }); mallOrderBuilder.where("merchant.tenantId = :tenantId", { tenantId }); mallRefundBuilder.andWhere("refundMerchant.tenantId = :tenantId", { tenantId });
    }
    if (scope.activityId) { activityBuilder.andWhere("activity.id = :activityId", { activityId: scope.activityId }); activityOrderBuilder.andWhere("businessActivity.id = :activityId", { activityId: scope.activityId }); activityRefundBuilder.andWhere("businessRefundActivity.id = :activityId", { activityId: scope.activityId }); }
    applyAdminActivityDataScope(activityBuilder, "activity", admin?.dataScope);
    const scopedActivityIds = adminActivityScopeIds(admin?.dataScope);
    if (scopedActivityIds !== null) {
      if (scopedActivityIds.length) { activityOrderBuilder.andWhere("businessActivity.id IN (:...scopedActivityIds)", { scopedActivityIds }); activityRefundBuilder.andWhere("businessRefundActivity.id IN (:...scopedActivityIds)", { scopedActivityIds }); }
      else { activityOrderBuilder.andWhere("1 = 0"); activityRefundBuilder.andWhere("1 = 0"); }
    }
    if (scope.startDate) {
      activityOrderBuilder.andWhere("COALESCE(businessOrder.paidAt, businessOrder.createdAt) >= :startDate", { startDate: scope.startDate });
      activityRefundBuilder.andWhere("COALESCE(businessRefund.completedAt, businessRefund.createdAt) >= :startDate", { startDate: scope.startDate });
      courseOrderBuilder.andWhere("COALESCE(order.paidAt, order.createdAt) >= :startDate", { startDate: scope.startDate });
      courseRefundBuilder.andWhere("COALESCE(courseRefund.completedAt, courseRefund.createdAt) >= :startDate", { startDate: scope.startDate });
      mallOrderBuilder.andWhere("COALESCE(order.paidAt, order.createdAt) >= :startDate", { startDate: scope.startDate });
      mallRefundBuilder.andWhere("mallRefund.completedAt >= :startDate", { startDate: scope.startDate });
    }
    if (scope.endDate) {
      activityOrderBuilder.andWhere("COALESCE(businessOrder.paidAt, businessOrder.createdAt) < :endDate", { endDate: scope.endDate });
      activityRefundBuilder.andWhere("COALESCE(businessRefund.completedAt, businessRefund.createdAt) < :endDate", { endDate: scope.endDate });
      courseOrderBuilder.andWhere("COALESCE(order.paidAt, order.createdAt) < :endDate", { endDate: scope.endDate });
      courseRefundBuilder.andWhere("COALESCE(courseRefund.completedAt, courseRefund.createdAt) < :endDate", { endDate: scope.endDate });
      mallOrderBuilder.andWhere("COALESCE(order.paidAt, order.createdAt) < :endDate", { endDate: scope.endDate });
      mallRefundBuilder.andWhere("mallRefund.completedAt < :endDate", { endDate: scope.endDate });
    }
    const platformMallWide = ["super_admin", "admin", "finance"].includes(String(admin?.role || "")) && !admin?.tenantId;
    let allowedMerchantIds: number[] | null = null;
    if (admin?.id && !platformMallWide) {
      const accessRows = await this.dataSource.getRepository(AdminMallMerchantAccess).find({ where: { admin: { id: admin.id }, enabled: true } });
      allowedMerchantIds = accessRows.map((row) => row.merchant.id);
      if (allowedMerchantIds.length) {
        mallMerchantBuilder.andWhere("merchant.id IN (:...allowedMerchantIds)", { allowedMerchantIds });
        mallOrderBuilder.andWhere("merchant.id IN (:...allowedMerchantIds)", { allowedMerchantIds });
        mallRefundBuilder.andWhere("refundMerchant.id IN (:...allowedMerchantIds)", { allowedMerchantIds });
      } else {
        mallMerchantBuilder.andWhere("1 = 0");
        mallOrderBuilder.andWhere("1 = 0");
        mallRefundBuilder.andWhere("1 = 0");
      }
    }
    const merchantOrderBuilder = mallOrderBuilder.clone()
      .select("merchant.id", "merchantId")
      .addSelect("COUNT(DISTINCT CASE WHEN order.status IN ('paid','shipped','completed','refunded') THEN order.id END)", "orderCount")
      .addSelect("COALESCE(SUM(CASE WHEN order.status IN ('paid','shipped','completed','refunded') THEN order.amountFen ELSE 0 END),0)", "grossAmountFen")
      .groupBy("merchant.id");
    const merchantRefundBuilder = mallRefundBuilder.clone().select("refundMerchant.id", "merchantId").addSelect("COALESCE(SUM(mallRefund.amountFen),0)", "refundAmountFen").groupBy("refundMerchant.id");
    const [activityCount, openActivityCount, activityPayments, activityRefunds, courseCount, publishedCourseCount, courseOrders, courseRefunds, charityCount, activeCharityCount, merchantCount, merchantRows, mallOrders, mallRefunds, merchantOrders, merchantRefunds] = await Promise.all([
      activityBuilder.getCount(),
      activityBuilder.clone().andWhere("activity.status = :status", { status: ActivityStatus.Open }).getCount(),
      activityOrderBuilder.select("COUNT(DISTINCT businessOrder.id)", "count").addSelect("COALESCE(SUM(businessOrder.amountFen), 0)", "grossAmountFen").andWhere("businessOrder.status IN (:...activityOrderStatuses)", { activityOrderStatuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).getRawOne<any>(),
      activityRefundBuilder.select("COALESCE(SUM(businessRefund.amountFen), 0)", "refundAmountFen").getRawOne<any>(),
      courseBuilder.getCount(),
      courseBuilder.clone().andWhere("course.status = :status", { status: "published" }).getCount(),
      courseOrderBuilder.select("COUNT(DISTINCT CASE WHEN order.status IN ('paid','partially_refunded','refunded') THEN order.id END)", "count")
        .addSelect("COALESCE(SUM(CASE WHEN order.status IN ('paid','partially_refunded','refunded') THEN order.amountFen ELSE 0 END),0)", "grossAmountFen").getRawOne<any>(),
      courseRefundBuilder.select("COALESCE(SUM(courseRefund.amountFen),0)", "refundAmountFen").getRawOne<any>(),
      charityBuilder.getCount(),
      charityBuilder.clone().andWhere("project.status IN (:...statuses)", { statuses: ["fundraising", "pending_execution", "executing", "pending_acceptance"] }).getCount(),
      mallMerchantBuilder.getCount(),
      mallMerchantBuilder.clone().select(["merchant.id", "merchant.code", "merchant.name", "merchant.status"]).getMany(),
      mallOrderBuilder.select("COUNT(DISTINCT CASE WHEN order.status IN ('paid','shipped','completed','refunded') THEN order.id END)", "count")
        .addSelect("COALESCE(SUM(CASE WHEN order.status IN ('paid','shipped','completed','refunded') THEN order.amountFen ELSE 0 END),0)", "grossAmountFen").getRawOne<any>(),
      mallRefundBuilder.select("COALESCE(SUM(mallRefund.amountFen),0)", "refundAmountFen").getRawOne<any>(),
      merchantOrderBuilder.getRawMany<any>(),
      merchantRefundBuilder.getRawMany<any>()
    ]);
    const activityGrossAmountFen = Number(activityPayments?.grossAmountFen || 0);
    const activityRefundAmountFen = Number(activityRefunds?.refundAmountFen || 0);
    const courseGrossAmountFen = Number(courseOrders?.grossAmountFen || 0);
    const courseRefundAmountFen = Number(courseRefunds?.refundAmountFen || 0);
    const mallGrossAmountFen = Number(mallOrders?.grossAmountFen || 0);
    const mallRefundAmountFen = Number(mallRefunds?.refundAmountFen || 0);
    const merchantOrderMap = new Map(merchantOrders.map((row) => [Number(row.merchantId), row]));
    const merchantRefundMap = new Map(merchantRefunds.map((row) => [Number(row.merchantId), Number(row.refundAmountFen || 0)]));
    const merchantRanking = merchantRows.map((merchant) => {
      const order = merchantOrderMap.get(merchant.id) || {};
      const grossAmountFen = Number(order.grossAmountFen || 0);
      const refundAmountFen = Number(merchantRefundMap.get(merchant.id) || 0);
      return { id: merchant.id, code: merchant.code, name: merchant.name, status: merchant.status, orderCount: Number(order.orderCount || 0), grossAmountFen, refundAmountFen, amountFen: grossAmountFen - refundAmountFen, path: `/mall-statistics?merchantId=${merchant.id}` };
    }).sort((a, b) => b.amountFen - a.amountFen || b.orderCount - a.orderCount).slice(0, 50);
    return {
      scope: tenantId ? "tenant" : "platform",
      merchantScope: allowedMerchantIds === null ? "all" : "authorized",
      merchants: merchantRanking,
      modules: [
        { key: "activity", label: "活动", total: activityCount, active: openActivityCount, orderCount: Number(activityPayments?.count || 0), grossAmountFen: activityGrossAmountFen, refundAmountFen: activityRefundAmountFen, amountFen: activityGrossAmountFen - activityRefundAmountFen, path: "/activities" },
        { key: "course", label: "课程", total: courseCount, active: publishedCourseCount, orderCount: Number(courseOrders?.count || 0), grossAmountFen: courseGrossAmountFen, refundAmountFen: courseRefundAmountFen, amountFen: courseGrossAmountFen - courseRefundAmountFen, path: "/courses" },
        { key: "mall", label: "商城", total: merchantCount, active: merchantCount, orderCount: Number(mallOrders?.count || 0), grossAmountFen: mallGrossAmountFen, refundAmountFen: mallRefundAmountFen, amountFen: mallGrossAmountFen - mallRefundAmountFen, path: "/mall-statistics" },
        { key: "charity", label: "公益", total: charityCount, active: activeCharityCount, amountFen: 0, path: "/charity" }
      ]
    };
  }

  async analyticsBusinessDetails(query: AnalyticsBusinessQueryDto, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;
    const participationStatuses = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];

    if (query.module === "activity") {
      const builder = this.activities.createQueryBuilder("activity");
      if (scope.tenantId) builder.andWhere("activity.tenantId = :tenantId", { tenantId: scope.tenantId });
      if (scope.activityId) builder.andWhere("activity.id = :activityId", { activityId: scope.activityId });
      applyAdminActivityDataScope(builder, "activity", admin?.dataScope);
      const total = await builder.getCount();
      const rows = await builder.select(["activity.id", "activity.title", "activity.status", "activity.capacity"]).orderBy("activity.id", "DESC").skip(skip).take(pageSize).getMany();
      const ids = rows.map((row) => row.id);
      const registrationBuilder = this.registrations.createQueryBuilder("registration").select("registration.activityId", "id").addSelect("COUNT(1)", "activeCount").where(ids.length ? "registration.activityId IN (:...ids)" : "1 = 0", { ids }).andWhere("registration.status IN (:...participationStatuses)", { participationStatuses }).groupBy("registration.activityId");
      const orderBuilder = this.orders.createQueryBuilder("businessOrder").leftJoin("businessOrder.registration", "businessRegistration").select("businessRegistration.activityId", "id").addSelect("COUNT(DISTINCT businessOrder.id)", "orderCount").addSelect("COALESCE(SUM(businessOrder.amountFen),0)", "grossAmountFen").where(ids.length ? "businessRegistration.activityId IN (:...ids)" : "1 = 0", { ids }).andWhere("businessOrder.status IN (:...orderStatuses)", { orderStatuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).groupBy("businessRegistration.activityId");
      const refundBuilder = this.refunds.createQueryBuilder("businessRefund").leftJoin("businessRefund.order", "refundOrder").leftJoin("refundOrder.registration", "refundRegistration").select("refundRegistration.activityId", "id").addSelect("COALESCE(SUM(businessRefund.amountFen),0)", "refundAmountFen").where(ids.length ? "refundRegistration.activityId IN (:...ids)" : "1 = 0", { ids }).andWhere("businessRefund.status = 'completed'").groupBy("refundRegistration.activityId");
      if (scope.startDate) { registrationBuilder.andWhere("registration.createdAt >= :startDate", { startDate: scope.startDate }); orderBuilder.andWhere("COALESCE(businessOrder.paidAt, businessOrder.createdAt) >= :startDate", { startDate: scope.startDate }); refundBuilder.andWhere("COALESCE(businessRefund.completedAt, businessRefund.createdAt) >= :startDate", { startDate: scope.startDate }); }
      if (scope.endDate) { registrationBuilder.andWhere("registration.createdAt < :endDate", { endDate: scope.endDate }); orderBuilder.andWhere("COALESCE(businessOrder.paidAt, businessOrder.createdAt) < :endDate", { endDate: scope.endDate }); refundBuilder.andWhere("COALESCE(businessRefund.completedAt, businessRefund.createdAt) < :endDate", { endDate: scope.endDate }); }
      const [registrationRows, orderRows, refundRows] = await Promise.all([registrationBuilder.getRawMany<any>(), orderBuilder.getRawMany<any>(), refundBuilder.getRawMany<any>()]);
      const registrationMap = new Map(registrationRows.map((row) => [Number(row.id), Number(row.activeCount || 0)]));
      const orderMap = new Map(orderRows.map((row) => [Number(row.id), row]));
      const refundMap = new Map(refundRows.map((row) => [Number(row.id), Number(row.refundAmountFen || 0)]));
      const items = rows.map((row) => { const order = orderMap.get(row.id) || {}; const grossAmountFen = Number(order.grossAmountFen || 0); const refundAmountFen = Number(refundMap.get(row.id) || 0); return { module: "activity", id: row.id, code: "", name: row.title, status: row.status, activeCount: Number(registrationMap.get(row.id) || 0), totalCount: Number(row.capacity || 0), orderCount: Number(order.orderCount || 0), grossAmountFen, refundAmountFen, amountFen: grossAmountFen - refundAmountFen, path: `/activities?activityId=${row.id}` }; });
      return { items, total, page, pageSize };
    }

    if (query.module === "course") {
      const builder = this.courses.createQueryBuilder("course");
      if (scope.tenantId) builder.andWhere("course.tenantId = :tenantId", { tenantId: scope.tenantId });
      const total = await builder.getCount();
      const rows = await builder.select(["course.id", "course.title", "course.status", "course.teacherName"]).orderBy("course.id", "DESC").skip(skip).take(pageSize).getMany();
      const ids = rows.map((row) => row.id);
      const orderBuilder = this.dataSource.getRepository(CourseOrder).createQueryBuilder("courseOrder").select("courseOrder.courseId", "id").addSelect("COUNT(DISTINCT courseOrder.id)", "orderCount").addSelect("COALESCE(SUM(courseOrder.amountFen),0)", "grossAmountFen").where(ids.length ? "courseOrder.courseId IN (:...ids)" : "1 = 0", { ids }).andWhere("courseOrder.status IN ('paid','partially_refunded','refunded')").groupBy("courseOrder.courseId");
      const refundBuilder = this.dataSource.getRepository(CourseRefund).createQueryBuilder("courseRefund").leftJoin("courseRefund.order", "refundOrder").select("refundOrder.courseId", "id").addSelect("COALESCE(SUM(courseRefund.amountFen),0)", "refundAmountFen").where(ids.length ? "refundOrder.courseId IN (:...ids)" : "1 = 0", { ids }).andWhere("courseRefund.status = 'completed'").groupBy("refundOrder.courseId");
      if (scope.startDate) { orderBuilder.andWhere("COALESCE(courseOrder.paidAt, courseOrder.createdAt) >= :startDate", { startDate: scope.startDate }); refundBuilder.andWhere("COALESCE(courseRefund.completedAt, courseRefund.createdAt) >= :startDate", { startDate: scope.startDate }); }
      if (scope.endDate) { orderBuilder.andWhere("COALESCE(courseOrder.paidAt, courseOrder.createdAt) < :endDate", { endDate: scope.endDate }); refundBuilder.andWhere("COALESCE(courseRefund.completedAt, courseRefund.createdAt) < :endDate", { endDate: scope.endDate }); }
      const [orderRows, refundRows] = await Promise.all([orderBuilder.getRawMany<any>(), refundBuilder.getRawMany<any>()]);
      const orderMap = new Map(orderRows.map((row) => [Number(row.id), row])); const refundMap = new Map(refundRows.map((row) => [Number(row.id), Number(row.refundAmountFen || 0)]));
      const items = rows.map((row) => { const order = orderMap.get(row.id) || {}; const grossAmountFen = Number(order.grossAmountFen || 0); const refundAmountFen = Number(refundMap.get(row.id) || 0); return { module: "course", id: row.id, code: row.teacherName || "", name: row.title, status: row.status, activeCount: 0, totalCount: 0, orderCount: Number(order.orderCount || 0), grossAmountFen, refundAmountFen, amountFen: grossAmountFen - refundAmountFen, path: `/courses?courseId=${row.id}` }; });
      return { items, total, page, pageSize };
    }

    if (query.module === "mall") {
      const builder = this.dataSource.getRepository(MallMerchant).createQueryBuilder("merchant");
      if (scope.tenantId) builder.andWhere("merchant.tenantId = :tenantId", { tenantId: scope.tenantId });
      const platformMallWide = ["super_admin", "admin", "finance"].includes(String(admin?.role || "")) && !admin?.tenantId;
      if (admin?.id && !platformMallWide) { const accessRows = await this.dataSource.getRepository(AdminMallMerchantAccess).find({ where: { admin: { id: admin.id }, enabled: true } }); const ids = accessRows.map((row) => row.merchant.id); ids.length ? builder.andWhere("merchant.id IN (:...authorizedMerchantIds)", { authorizedMerchantIds: ids }) : builder.andWhere("1 = 0"); }
      const total = await builder.getCount();
      const rows = await builder.select(["merchant.id", "merchant.code", "merchant.name", "merchant.status"]).orderBy("merchant.id", "DESC").skip(skip).take(pageSize).getMany();
      const ids = rows.map((row) => row.id);
      const orderBuilder = this.dataSource.getRepository(MallOrder).createQueryBuilder("mallOrder").select("mallOrder.merchantId", "id").addSelect("COUNT(DISTINCT mallOrder.id)", "orderCount").addSelect("COALESCE(SUM(mallOrder.amountFen),0)", "grossAmountFen").where(ids.length ? "mallOrder.merchantId IN (:...ids)" : "1 = 0", { ids }).andWhere("mallOrder.status IN ('paid','shipped','completed','refunded')").groupBy("mallOrder.merchantId");
      const refundBuilder = this.dataSource.getRepository(MallRefund).createQueryBuilder("mallRefund").select("mallRefund.merchantId", "id").addSelect("COALESCE(SUM(mallRefund.amountFen),0)", "refundAmountFen").where(ids.length ? "mallRefund.merchantId IN (:...ids)" : "1 = 0", { ids }).andWhere("mallRefund.completedAt IS NOT NULL").groupBy("mallRefund.merchantId");
      if (scope.startDate) { orderBuilder.andWhere("COALESCE(mallOrder.paidAt, mallOrder.createdAt) >= :startDate", { startDate: scope.startDate }); refundBuilder.andWhere("mallRefund.completedAt >= :startDate", { startDate: scope.startDate }); }
      if (scope.endDate) { orderBuilder.andWhere("COALESCE(mallOrder.paidAt, mallOrder.createdAt) < :endDate", { endDate: scope.endDate }); refundBuilder.andWhere("mallRefund.completedAt < :endDate", { endDate: scope.endDate }); }
      const [orderRows, refundRows] = await Promise.all([orderBuilder.getRawMany<any>(), refundBuilder.getRawMany<any>()]);
      const orderMap = new Map(orderRows.map((row) => [Number(row.id), row])); const refundMap = new Map(refundRows.map((row) => [Number(row.id), Number(row.refundAmountFen || 0)]));
      const items = rows.map((row) => { const order = orderMap.get(row.id) || {}; const grossAmountFen = Number(order.grossAmountFen || 0); const refundAmountFen = Number(refundMap.get(row.id) || 0); return { module: "mall", id: row.id, code: row.code, name: row.name, status: row.status, activeCount: 0, totalCount: 0, orderCount: Number(order.orderCount || 0), grossAmountFen, refundAmountFen, amountFen: grossAmountFen - refundAmountFen, path: `/mall-statistics?merchantId=${row.id}` }; });
      return { items, total, page, pageSize };
    }

    const builder = this.dataSource.getRepository(CharityProject).createQueryBuilder("project");
    if (scope.tenantId) builder.andWhere("project.tenantId = :tenantId", { tenantId: scope.tenantId });
    if (scope.startDate) builder.andWhere("project.createdAt >= :startDate", { startDate: scope.startDate });
    if (scope.endDate) builder.andWhere("project.createdAt < :endDate", { endDate: scope.endDate });
    const total = await builder.getCount();
    const rows = await builder.select(["project.id", "project.title", "project.status", "project.targetAmount", "project.disbursedAmount"]).orderBy("project.id", "DESC").skip(skip).take(pageSize).getMany();
    const items = rows.map((row) => ({ module: "charity", id: row.id, code: "", name: row.title, status: row.status, activeCount: 0, totalCount: 0, orderCount: 0, grossAmountFen: yuanToFen(row.disbursedAmount || 0), refundAmountFen: 0, amountFen: yuanToFen(row.disbursedAmount || 0), targetAmountFen: yuanToFen(row.targetAmount || 0), path: `/charity?projectId=${row.id}` }));
    return { items, total, page, pageSize };
  }

  async exportAnalyticsBusinessDetails(query: AnalyticsBusinessQueryDto, admin?: AdminContext) {
    type BusinessRow = { module: string; id: number; code: string; name: string; status: string; activeCount: number; totalCount: number; orderCount: number; grossAmountFen: number; refundAmountFen: number; amountFen: number; targetAmountFen?: number; path: string };
    const rows: BusinessRow[] = [];
    const pageSize = 500;
    let page = 1;
    let total = 0;
    do {
      const result = await this.analyticsBusinessDetails({ ...query, page, pageSize } as AnalyticsBusinessQueryDto, admin);
      if (page === 1) total = result.total;
      rows.push(...result.items as BusinessRow[]);
      if (!result.items.length) break;
      page++;
    } while (rows.length < total);
    if (rows.length !== total) throw new InternalServerErrorException(`经营明细导出不完整：预期 ${total} 条，实际 ${rows.length} 条`);
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [["业务域", "编号", "编码/讲师", "名称", "状态", "报名/活跃", "容量/目标数", "订单数", "毛额分", "退款分", "净额分", "目标金额分", "下钻地址"].map(escape).join(","), ...rows.map((row) => [row.module, row.id, row.code, row.name, row.status, row.activeCount, row.totalCount, row.orderCount, row.grossAmountFen, row.refundAmountFen, row.amountFen, row.targetAmountFen || 0, row.path].map(escape).join(","))];
    await this.logExport(admin, `analytics_business_${query.module}`, rows.length, query);
    return `\uFEFF${lines.join("\r\n")}`;
  }

  async analyticsGrowth(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const eventBuilder = this.conversionEvents.createQueryBuilder("event")
      .select("event.type", "type").addSelect("COUNT(event.id)", "count").addSelect("COUNT(DISTINCT event.userId)", "userCount")
      .groupBy("event.type");
    this.applyAnalyticsScope(eventBuilder, "event", scope, admin);
    applyAdminActivityDataScope(eventBuilder, "event", admin?.dataScope);

    const activityPointsBuilder = this.registrations.createQueryBuilder("registration")
      .leftJoin("registration.activity", "activity").leftJoin("registration.user", "growthUser")
      .leftJoin(Order, "growthOrder", "growthOrder.registrationId = registration.id")
      .select("growthUser.id", "userId").addSelect("registration.createdAt", "occurredAt")
      .addSelect("MAX(CASE WHEN growthOrder.status IN ('paid','partially_refunded') THEN 1 ELSE 0 END)", "paid")
      .where("registration.status IN (:...growthParticipationStatuses)", { growthParticipationStatuses: [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn] })
      .groupBy("registration.id").addGroupBy("growthUser.id").addGroupBy("registration.createdAt").orderBy("registration.createdAt", "ASC").take(100001);
    if (scope.tenantId) activityPointsBuilder.andWhere("activity.tenantId = :growthTenantId", { growthTenantId: scope.tenantId });
    if (scope.activityId) activityPointsBuilder.andWhere("activity.id = :growthActivityId", { growthActivityId: scope.activityId });
    if (scope.endDate) activityPointsBuilder.andWhere("registration.createdAt < :growthEndDate", { growthEndDate: scope.endDate });
    applyAdminActivityDataScope(activityPointsBuilder, "registration", admin?.dataScope);

    const sourceBuilder = this.conversionEvents.createQueryBuilder("event")
      .select("COALESCE(event.source, 'direct')", "source").addSelect("event.type", "type").addSelect("COUNT(event.id)", "count")
      .groupBy("COALESCE(event.source, 'direct')").addGroupBy("event.type").orderBy("count", "DESC");
    this.applyAnalyticsScope(sourceBuilder, "event", scope, admin);
    applyAdminActivityDataScope(sourceBuilder, "event", admin?.dataScope);

    const regionBuilder = this.tenantRegionHitLogs.createQueryBuilder("hit").leftJoin("hit.region", "region").leftJoin("region.tenant", "regionTenant")
      .select("COALESCE(region.province, '未知')", "province").addSelect("COALESCE(region.city, '未知')", "city").addSelect("COALESCE(region.district, '未知')", "district")
      .addSelect("COUNT(hit.id)", "count").addSelect("SUM(CASE WHEN hit.matched = 1 THEN 1 ELSE 0 END)", "matchedCount")
      .groupBy("COALESCE(region.province, '未知')").addGroupBy("COALESCE(region.city, '未知')").addGroupBy("COALESCE(region.district, '未知')")
      .orderBy("count", "DESC").take(100);
    if (scope.tenantId) regionBuilder.andWhere("(hit.tenantId = :regionTenantId OR regionTenant.id = :regionTenantId)", { regionTenantId: scope.tenantId });
    if (scope.startDate) regionBuilder.andWhere("hit.createdAt >= :regionStartDate", { regionStartDate: scope.startDate });
    if (scope.endDate) regionBuilder.andWhere("hit.createdAt < :regionEndDate", { regionEndDate: scope.endDate });

    const [eventRows, pointRows, sourceRows, regionRows, channels] = await Promise.all([
      eventBuilder.getRawMany<any>(), activityPointsBuilder.getRawMany<any>(), sourceBuilder.getRawMany<any>(), regionBuilder.getRawMany<any>(), this.analyticsChannels(query, admin)
    ]);
    if (pointRows.length > 100000) throw new BadRequestException("留存分析明细超过 100000 条，请缩小商家、活动或结束日期范围后重试");
    const eventMap = new Map(eventRows.map((row) => [String(row.type), Number(row.count || 0)]));
    const funnel = {
      view: eventMap.get("view") || 0, shareVisit: eventMap.get("share_visit") || 0, register: eventMap.get("register") || 0,
      pay: eventMap.get("pay") || 0, checkIn: eventMap.get("check_in") || 0, review: eventMap.get("review") || 0,
      cancel: eventMap.get("cancel") || 0, refund: eventMap.get("refund") || 0
    };
    const rate = (value: number, total: number) => boundedPercentage(value, total);
    const sourceMap = new Map<string, Record<string, number>>();
    for (const row of sourceRows) {
      const source = String(row.source || "direct"); const values = sourceMap.get(source) || {};
      values[String(row.type)] = Number(row.count || 0); sourceMap.set(source, values);
    }
    return {
      scope: scope.tenantId ? "tenant" : "platform", funnel,
      rates: { signupRate: rate(funnel.register, funnel.view), paymentRate: rate(funnel.pay, funnel.register), checkInRate: rate(funnel.checkIn, funnel.pay), reviewRate: rate(funnel.review, funnel.checkIn), refundRate: rate(funnel.refund, funnel.pay) },
      cohort: growthCohortSummary(
        pointRows.map((row) => ({ userId: Number(row.userId), occurredAt: row.occurredAt, paid: Number(row.paid || 0) > 0 })),
        { asOf: scope.endDate ? new Date(scope.endDate.getTime() - 1) : new Date(), cohortStart: scope.startDate, cohortEnd: scope.endDate }
      ),
      sources: Array.from(sourceMap.entries()).map(([source, values]) => ({ source, view: values.view || 0, register: values.register || 0, pay: values.pay || 0, checkIn: values.check_in || 0, signupRate: rate(values.register || 0, values.view || 0), paymentRate: rate(values.pay || 0, values.register || 0) })).sort((a, b) => b.pay - a.pay || b.register - a.register),
      regions: regionRows.map((row) => ({ province: row.province, city: row.city, district: row.district, count: Number(row.count || 0), matchedCount: Number(row.matchedCount || 0) })),
      channels
    };
  }

  async exportAnalyticsGrowth(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const report = await this.analyticsGrowth(query, admin);
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["分类", "名称", "浏览", "报名", "支付", "签到", "报名率", "支付率", "数量", "命中数量"].map(escape).join(","),
      ["会员", "7 日留存", "", "", "", "", report.cohort.retention7Rate, "", report.cohort.retention7EligibleUsers, report.cohort.retained7].map(escape).join(","),
      ["会员", "30 日留存", "", "", "", "", report.cohort.retention30Rate, "", report.cohort.retention30EligibleUsers, report.cohort.retained30].map(escape).join(","),
      ["会员", "重复参与", "", "", "", "", report.cohort.repeatRate, "", report.cohort.users, report.cohort.repeatUsers].map(escape).join(","),
      ["会员", "付费复购", "", "", "", "", "", report.cohort.repurchaseRate, report.cohort.paidUsers, report.cohort.repeatPaidUsers].map(escape).join(","),
      ...report.sources.map((row) => ["来源", row.source, row.view, row.register, row.pay, row.checkIn, row.signupRate, row.paymentRate, "", ""].map(escape).join(",")),
      ...report.channels.map((row: any) => ["渠道", row.name, row.viewCount, row.registrationCount, row.paidCount, row.checkInCount, row.signupRate, row.paymentRate, "", ""].map(escape).join(",")),
      ...report.regions.map((row) => ["地域", `${row.province}/${row.city}/${row.district}`, "", "", "", "", "", "", row.count, row.matchedCount].map(escape).join(","))
    ];
    await this.logExport(admin, "analytics_growth", report.sources.length + report.channels.length + report.regions.length, query);
    return `\uFEFF${lines.join("\r\n")}`;
  }

  private async analyticsReportMetricRows(
    query: AnalyticsQueryDto,
    scope: { tenantId?: number; activityId?: number; startDate?: Date; endDate?: Date },
    dimensionType: string,
    dimensionKey: string | undefined,
    admin?: AdminContext
  ) {
    if (!query.startDate || !query.endDate) return [];
    if (adminActivityScopeIds(admin?.dataScope) !== null) return [];
    const tenantScopeKey = homepagePublicationScopeKey(scope.tenantId || null);
    const covered = await this.analyticsCalculationRuns.createQueryBuilder("run")
      .where("run.tenantScopeKey = :tenantScopeKey", { tenantScopeKey })
      .andWhere("run.status = :status", { status: "completed" })
      .andWhere("run.mismatchCount = 0")
      .andWhere("run.startDate <= :startDate", { startDate: query.startDate })
      .andWhere("run.endDate >= :endDate", { endDate: query.endDate })
      .orderBy("run.id", "DESC")
      .getExists();
    if (!covered) return [];
    return this.analyticsMetricRows({ ...query, dimensionType, dimensionKey }, admin);
  }

  async analyticsMetricRows(query: AnalyticsMetricQueryDto = {}, admin?: AdminContext) {
    const scope = await this.analyticsScope(query, admin);
    const tenantScopeKey = homepagePublicationScopeKey(scope.tenantId || null);
    const builder = this.analyticsDailyMetrics.createQueryBuilder("metric").where("metric.tenantScopeKey = :tenantScopeKey", { tenantScopeKey }).orderBy("metric.metricDate", "ASC").addOrderBy("metric.metricKey", "ASC").take(5000);
    if (scope.startDate) builder.andWhere("metric.metricDate >= :startDate", { startDate: analyticsDateText(scope.startDate) });
    if (scope.endDate) builder.andWhere("metric.metricDate < :endDate", { endDate: analyticsDateText(scope.endDate) });
    if (query.metricKey) builder.andWhere("metric.metricKey = :metricKey", { metricKey: query.metricKey });
    if (query.dimensionType) builder.andWhere("metric.dimensionType = :dimensionType", { dimensionType: query.dimensionType });
    if (query.dimensionKey) builder.andWhere("metric.dimensionKey = :dimensionKey", { dimensionKey: query.dimensionKey });
    return builder.getMany();
  }

  async analyticsMetricDrilldown(query: AnalyticsMetricQueryDto, admin?: AdminContext) {
    if (!query.metricKey || !query.startDate) throw new BadRequestException("下钻必须指定指标和日期");
    const scope = await this.analyticsScope(query, admin);
    const eventType = Object.entries(conversionMetricKeys).find(([, metric]) => metric === query.metricKey)?.[0];
    if (!eventType) throw new BadRequestException("不支持的下钻指标");
    const range = analyticsDayRange(query.startDate);
    const builder = this.conversionEvents.createQueryBuilder("event").leftJoinAndSelect("event.activity", "activity").leftJoinAndSelect("event.user", "user").leftJoinAndSelect("event.registration", "registration").leftJoinAndSelect("event.order", "order").leftJoinAndSelect("event.channel", "channel").where("event.type = :eventType", { eventType }).andWhere("event.createdAt >= :start AND event.createdAt < :end", range).orderBy("event.id", "DESC").take(500);
    if (scope.tenantId) builder.andWhere("event.tenantId = :tenantId", { tenantId: scope.tenantId });
    if (scope.activityId) builder.andWhere("event.activityId = :activityId", { activityId: scope.activityId });
    applyAdminActivityDataScope(builder, "event", admin?.dataScope);
    const rows = await builder.getMany();
    return rows.map((row) => ({ id: row.id, type: row.type, amount: row.amount, source: row.source, createdAt: row.createdAt, activity: row.activity ? { id: row.activity.id, title: row.activity.title } : null, user: row.user ? { id: row.user.id, phone: maskPhone(row.user.phone), nickname: row.user.nickname } : null, registrationId: row.registration?.id || null, orderNo: row.order?.orderNo || null, channel: row.channel ? { id: row.channel.id, name: row.channel.name, code: row.channel.code } : null, payload: row.payload }));
  }

  listAnalyticsCalculationRuns(admin?: AdminContext, tenantId?: number) {
    const tenantScopeKey = homepagePublicationScopeKey(this.isTenantScoped(admin) ? admin?.tenantId : tenantId);
    return this.analyticsCalculationRuns.find({ where: { tenantScopeKey }, order: { id: "DESC" }, take: 50 });
  }

  async recomputeAnalytics(dto: AnalyticsRecomputeDto, admin?: AdminContext) {
    const tenantId = this.isTenantScoped(admin) ? Number(admin?.tenantId || 0) : Number(dto.tenantId || 0);
    if (tenantId && !(await this.tenants.findOneBy({ id: tenantId }))) throw new NotFoundException("商家不存在");
    let start: Date;
    let finalRange: { start: Date; end: Date };
    try {
      start = analyticsDayRange(dto.startDate).start;
      finalRange = analyticsDayRange(dto.endDate);
    } catch {
      throw new BadRequestException("统计日期必须为有效的 YYYY-MM-DD 日期");
    }
    if (finalRange.start < start) throw new BadRequestException("统计结束日期不能早于开始日期");
    const dayCount = Math.round((finalRange.start.getTime() - start.getTime()) / 86400000) + 1;
    if (dayCount > 31) throw new BadRequestException("单次统计重算最多支持 31 天");
    const tenantScopeKey = homepagePublicationScopeKey(tenantId || null);
    const queryRunner = this.dataSource.createQueryRunner();
    const lockKey = `analytics:${createHash("sha256").update(tenantScopeKey).digest("hex").slice(0, 40)}`;
    await queryRunner.connect();
    let acquired = false;
    let run: AnalyticsCalculationRun | null = null;
    try {
      const lockRows = await queryRunner.query("SELECT GET_LOCK(?, 0) AS acquired", [lockKey]);
      acquired = Number(lockRows?.[0]?.acquired || 0) === 1;
      if (!acquired) throw new BadRequestException("当前作用域的统计指标正在重算，请稍后重试");
      run = await this.analyticsCalculationRuns.save(this.analyticsCalculationRuns.create({
        runId: `AR${Date.now()}${randomBytes(3).toString("hex").toUpperCase()}`,
        tenantScopeKey,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: "running",
        triggerType: admin?.username === "analytics-job-worker" ? "scheduled" : "manual",
        triggeredBy: this.actorName(admin),
        metricCount: 0,
        mismatchCount: 0,
        validationSummary: null,
        errorMessage: null,
        startedAt: new Date(),
        completedAt: null
      }));
      const metrics: Array<Partial<AnalyticsDailyMetric>> = [];
      let sourceEventCount = 0;
      let rootMetricCount = 0;
      const rootDimension = { type: tenantId ? "tenant" : "platform", key: tenantId ? String(tenantId) : "all" };
      const supportedMetricKeys = Array.from(new Set(Object.values(conversionMetricKeys)));
      for (let cursor = new Date(start); cursor <= finalRange.start; cursor = new Date(cursor.getTime() + 86400000)) {
        const metricDate = analyticsDateText(cursor);
        const range = analyticsDayRange(metricDate);
        const builder = this.conversionEvents.createQueryBuilder("event").leftJoin("event.tenant", "tenant").leftJoin("event.activity", "activity").select("event.type", "type").addSelect("COALESCE(event.tenantId, 0)", "tenantId").addSelect("COALESCE(event.activityId, 0)", "activityId").addSelect("COALESCE(event.channelId, 0)", "channelId").addSelect("COUNT(1)", "count").addSelect("COALESCE(SUM(event.amount), 0)", "amount").where("event.createdAt >= :start AND event.createdAt < :end", range).groupBy("event.type").addGroupBy("event.tenantId").addGroupBy("event.activityId").addGroupBy("event.channelId");
        if (tenantId) builder.andWhere("event.tenantId = :tenantId", { tenantId });
        const rows = await builder.getRawMany<{ type: string; tenantId: string; activityId: string; channelId: string; count: string; amount: string }>();
        const buckets = new Map<string, { value: number; amountFen: number }>();
        for (const metricKey of supportedMetricKeys) buckets.set(`${rootDimension.type}:${rootDimension.key}:${metricKey}`, { value: 0, amountFen: 0 });
        for (const row of rows) {
          const metricKey = conversionMetricKeys[row.type]; if (!metricKey) continue;
          sourceEventCount += Number(row.count || 0);
          const amountFen = conversionMetricAmountFen(row.type, row.amount);
          const dimensions = [rootDimension];
          if (Number(row.tenantId)) dimensions.push({ type: "tenant", key: String(row.tenantId) });
          if (Number(row.activityId)) dimensions.push({ type: "activity", key: String(row.activityId) });
          if (Number(row.channelId)) dimensions.push({ type: "channel", key: String(row.channelId) });
          for (const dimension of Array.from(new Map(dimensions.map((item) => [`${item.type}:${item.key}`, item])).values())) {
            const key = `${dimension.type}:${dimension.key}:${metricKey}`; const current = buckets.get(key) || { value: 0, amountFen: 0 };
            current.value += Number(row.count || 0); current.amountFen += amountFen; buckets.set(key, current);
          }
        }
        for (const [key, value] of buckets) {
          const [dimensionType, dimensionKey, metricKey] = key.split(":");
          if ((tenantId && dimensionType === "tenant" && dimensionKey === String(tenantId)) || (!tenantId && dimensionType === "platform" && dimensionKey === "all")) rootMetricCount += value.value;
          metrics.push({ tenantScopeKey, dimensionType, dimensionKey, metricDate, metricKey, value: String(value.value), amountFen: String(value.amountFen), breakdown: null, calculationVersion: ANALYTICS_CALCULATION_VERSION, sourceRunId: run.runId });
        }
      }
      await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(AnalyticsDailyMetric);
        await repo.createQueryBuilder().delete()
          .where("tenantScopeKey = :tenantScopeKey", { tenantScopeKey })
          .andWhere("metricDate >= :startDate", { startDate: dto.startDate })
          .andWhere("metricDate <= :endDate", { endDate: dto.endDate })
          .execute();
        if (metrics.length) await repo.upsert(metrics as any[], ["tenantScopeKey", "dimensionType", "dimensionKey", "metricDate", "metricKey"]);
      });
      const mismatchCount = Math.abs(sourceEventCount - rootMetricCount);
      run.status = "completed"; run.metricCount = metrics.length; run.mismatchCount = mismatchCount; run.validationSummary = { sourceEventCount, rootMetricCount, metricRows: metrics.length, consistent: mismatchCount === 0, calculationVersion: ANALYTICS_CALCULATION_VERSION }; run.completedAt = new Date();
      await this.analyticsCalculationRuns.save(run);
      await this.logOperation(admin, "analytics.recompute", "analytics_calculation_run", run.id, `重算统计指标：${dto.startDate} 至 ${dto.endDate}`, { tenantId: tenantId || null, runId: run.runId, metricCount: metrics.length });
      return run;
    } catch (error: any) {
      if (run) {
        run.status = "failed";
        run.errorMessage = String(error?.message || error).slice(0, 1000);
        run.completedAt = new Date();
        await this.analyticsCalculationRuns.save(run);
      }
      throw error;
    } finally {
      if (acquired) await queryRunner.query("SELECT RELEASE_LOCK(?)", [lockKey]).catch(() => undefined);
      await queryRunner.release();
    }
  }

  async listActivityChannels(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    return this.activityChannels.find({ where: { activity: { id: activityId } }, order: { id: "DESC" } });
  }

  async createActivityChannel(activityId: number, dto: ActivityChannelDto, admin?: AdminContext) {
    const activity = await this.activities.findOne({ where: { id: activityId } });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    const code = this.normalizeChannelCode(dto.code || `${activity.id}-${Date.now().toString(36)}`);
    if (await this.activityChannels.findOne({ where: { code } })) throw new BadRequestException("渠道码已存在");
    const creator = admin?.id ? await this.admins.findOneBy({ id: admin.id }) : null;
    const saved = await this.activityChannels.save(this.activityChannels.create({
      activity,
      tenant: activity.tenant || null,
      createdBy: creator,
      name: dto.name.trim(),
      code,
      source: dto.source?.trim() || null,
      remark: dto.remark?.trim() || null,
      enabled: dto.enabled ?? true,
      qrCodeUrl: null
    }));
    await this.logOperation(admin, "activity_channel.create", "activity", activity.id, `创建活动渠道：${saved.name}`, { code: saved.code });
    return saved;
  }

  async activityChannelReport(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    const rows = await this.channelReportBuilder({ activityId }, admin).getRawMany<any>();
    return { activity: { id: activity.id, title: activity.title }, channels: rows.map((row) => this.channelReportRow(row)) };
  }

  async configCheck(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const platformSetting = await this.operationSettings.findOne({ where: { id: 1 } });
    return {
      ...inspectRuntimeConfig(configWithLaunchOverrides(this.config, platformSetting?.launchConfig)),
      release: this.releaseInfo()
    };
  }

  async uploadedImage(file?: Express.Multer.File, admin?: AdminContext) {
    if (!file) throw new BadRequestException("请上传图片文");
    const validated = validatedUploadFile(file, new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]));
    if (!validated) throw new BadRequestException("图片内容与格式不匹配，仅支持 JPG、PNG、WebP 或 GIF 图片");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    const stored = await this.objectStorage.store(validated, `images-t${admin?.tenantId || "platform"}-a${admin?.id || "system"}`);
    return { url: stored.url, originalName: validated.originalname, size: validated.size, mimetype: validated.mimetype };
  }

  async listSupportWorkOrders(query: SupportWorkOrderQueryDto, admin?: AdminContext) {
    const builder = this.supportWorkOrders.createQueryBuilder("workOrder").leftJoinAndSelect("workOrder.tenant", "tenant").leftJoinAndSelect("workOrder.user", "user").leftJoinAndSelect("workOrder.assignee", "assignee").orderBy("workOrder.updatedAt", "DESC").take(300);
    this.applyTenantScope(builder, "workOrder", admin);
    if (this.isTenantScoped(admin)) builder.andWhere("workOrder.tenantScopeKey = :supportScopeKey", { supportScopeKey: supportWorkOrderScopeKey(admin?.tenantId) });
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("workOrder.tenantId = :tenantId", { tenantId: query.tenantId });
    if (query.status) builder.andWhere("workOrder.status = :status", { status: query.status });
    if (query.priority) builder.andWhere("workOrder.priority = :priority", { priority: query.priority });
    if (query.assigneeId) builder.andWhere("workOrder.assigneeId = :assigneeId", { assigneeId: query.assigneeId });
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      builder.andWhere(new Brackets((where) => where.where("workOrder.orderNo LIKE :keyword", { keyword }).orWhere("workOrder.title LIKE :keyword", { keyword }).orWhere("workOrder.description LIKE :keyword", { keyword }).orWhere("user.phone LIKE :keyword", { keyword }).orWhere("user.nickname LIKE :keyword", { keyword })));
    }
    return (await builder.getMany()).map((row) => this.supportWorkOrderPublicPayload(row));
  }

  async listSupportAssignees(tenantId?: number, admin?: AdminContext) {
    const targetTenantId = this.isTenantScoped(admin) ? Number(admin?.tenantId || 0) : Number(tenantId || 0);
    const builder = this.admins.createQueryBuilder("assignee").leftJoinAndSelect("assignee.tenant", "tenant").where("assignee.enabled = :enabled", { enabled: true }).orderBy("assignee.username", "ASC").take(200);
    if (targetTenantId) builder.andWhere("assignee.tenantId = :tenantId", { tenantId: targetTenantId });
    else builder.andWhere("assignee.tenantId IS NULL");
    const rows = await builder.getMany();
    return rows.filter((row) => effectivePermissionsForAdmin({ role: row.role, tenantId: row.tenant?.id || null, permissions: row.permissions || undefined }).includes("support.manage")).map((row) => ({ id: row.id, username: row.username, role: row.role, tenant: row.tenant ? { id: row.tenant.id, name: row.tenant.name, code: row.tenant.code } : null }));
  }

  async supportWorkOrderDetail(id: number, admin?: AdminContext) {
    const row = await this.supportWorkOrders.findOne({ where: { id }, relations: { logs: { operator: true } } });
    if (!row) throw new NotFoundException("客服工单不存在");
    if (!supportWorkOrderBelongsToActor(row.tenantScopeKey, admin?.tenantId)) throw new NotFoundException("客服工单不存在或不属于当前商家");
    row.logs = [...(row.logs || [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return this.supportWorkOrderPublicPayload(row);
  }

  async createSupportWorkOrder(dto: SupportWorkOrderCreateDto, admin?: AdminContext) {
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : dto.tenantId ? await this.tenants.findOneBy({ id: dto.tenantId }) : null;
    if (dto.tenantId && !tenant) throw new NotFoundException("商家不存在");
    this.assertTenantSubscriptionWritable(tenant, admin);
    const user = dto.userId ? await this.users.findOneBy({ id: dto.userId }) : null;
    if (dto.userId && !user) throw new NotFoundException("用户不存在");
    if (dto.userId) await this.assertUserTenantAccess(dto.userId, admin);
    const assignee = await this.resolveSupportAssignee(dto.assigneeId, tenant, admin);
    const priority = this.normalizeChoice(dto.priority, ["low", "normal", "high", "urgent"], "normal");
    const dueHours = supportWorkOrderDueHours(priority);
    const row = await this.supportWorkOrders.save(this.supportWorkOrders.create({ orderNo: `WO${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${randomBytes(4).toString("hex").toUpperCase()}`, tenant, tenantScopeKey: supportWorkOrderScopeKey(tenant?.id), user, title: dto.title.trim(), description: dto.description.trim(), category: this.normalizeChoice(dto.category, ["consultation", "registration", "payment", "refund", "check_in", "course", "mall", "complaint", "other"], "consultation"), priority, status: assignee ? "assigned" : "open", businessType: this.nullableText(dto.businessType), businessId: this.nullableText(dto.businessId), businessSnapshot: dto.businessSnapshot || null, assignee, firstResponseAt: null, dueAt: new Date(Date.now() + dueHours * 3600000), resolvedAt: null, closedAt: null, resolution: null }));
    await this.supportWorkOrders.createQueryBuilder().update().set({ dueAt: () => `DATE_ADD(createdAt, INTERVAL ${dueHours} HOUR)` }).where("id = :id", { id: row.id }).execute();
    await this.appendSupportWorkOrderLog(row, "create", dto.description.trim(), null, row.status, admin, { priority, assigneeId: assignee?.id || null });
    await this.logOperation(admin, "support_work_order.create", "support_work_order", row.id, `创建客服工单：${row.orderNo}`, { tenantId: tenant?.id || null, userId: user?.id || null, priority });
    return this.supportWorkOrderDetail(row.id, admin);
  }

  private supportWorkOrderPublicPayload(row: SupportWorkOrder) {
    const safeUser = row.user ? { id: row.user.id, nickname: row.user.nickname, phone: maskPhone(row.user.phone) } : null;
    const safeAssignee = row.assignee ? { id: row.assignee.id, username: row.assignee.username, role: row.assignee.role } : null;
    return {
      id: row.id, orderNo: row.orderNo, tenantScopeKey: row.tenantScopeKey,
      tenant: row.tenant ? { id: row.tenant.id, code: row.tenant.code, name: row.tenant.name } : null,
      user: safeUser, title: row.title, description: row.description, category: row.category,
      priority: row.priority, status: row.status, businessType: row.businessType, businessId: row.businessId,
      businessSnapshot: row.businessSnapshot, assignee: safeAssignee, firstResponseAt: row.firstResponseAt,
      dueAt: row.dueAt, resolvedAt: row.resolvedAt, closedAt: row.closedAt, resolution: row.resolution,
      logs: (row.logs || []).map((log) => ({ id: log.id, operatorName: log.operatorName, action: log.action, content: log.content, fromStatus: log.fromStatus, toStatus: log.toStatus, snapshot: log.snapshot, createdAt: log.createdAt })),
      createdAt: row.createdAt, updatedAt: row.updatedAt
    };
  }

  async updateSupportWorkOrder(id: number, dto: SupportWorkOrderActionDto, admin?: AdminContext) {
    const row = await this.supportWorkOrders.findOneBy({ id });
    if (!row) throw new NotFoundException("客服工单不存在");
    if (!supportWorkOrderBelongsToActor(row.tenantScopeKey, admin?.tenantId)) throw new NotFoundException("客服工单不存在或不属于当前商家");
    this.assertTenantSubscriptionWritable(row.tenant, admin);
    const fromStatus = row.status;
    if (dto.priority) row.priority = this.normalizeChoice(dto.priority, ["low", "normal", "high", "urgent"], row.priority);
    if (dto.assigneeId !== undefined) row.assignee = await this.resolveSupportAssignee(dto.assigneeId, row.tenant, admin);
    const action = String(dto.status || "reply").trim();
    if (dto.status) {
      if (!canTransitionSupportWorkOrder(row.status, dto.status)) throw new BadRequestException(`工单不能从 ${row.status} 变更为 ${dto.status}`);
      row.status = dto.status;
    } else if (row.assignee && row.status === "open") row.status = "assigned";
    if (dto.content?.trim() && !row.firstResponseAt) row.firstResponseAt = new Date();
    if (row.status === "resolved") { if (!dto.resolution?.trim() && !dto.content?.trim()) throw new BadRequestException("解决工单必须填写处理结论"); row.resolution = dto.resolution?.trim() || dto.content!.trim(); row.resolvedAt = new Date(); }
    if (row.status === "closed") row.closedAt = new Date();
    if (row.status === "processing" && fromStatus === "closed") { row.closedAt = null; row.resolvedAt = null; }
    const saved = await this.supportWorkOrders.save(row);
    if (dto.priority && !["resolved", "closed"].includes(saved.status)) {
      const dueHours = supportWorkOrderDueHours(saved.priority);
      await this.supportWorkOrders.createQueryBuilder().update().set({ dueAt: () => `DATE_ADD(createdAt, INTERVAL ${dueHours} HOUR)` }).where("id = :id", { id: saved.id }).execute();
    }
    await this.appendSupportWorkOrderLog(saved, action, this.nullableText(dto.content) || this.nullableText(dto.resolution), fromStatus, saved.status, admin, { priority: saved.priority, assigneeId: saved.assignee?.id || null });
    await this.logOperation(admin, "support_work_order.update", "support_work_order", saved.id, `处理客服工单：${saved.orderNo}`, { fromStatus, toStatus: saved.status, assigneeId: saved.assignee?.id || null });
    return this.supportWorkOrderDetail(saved.id, admin);
  }

  private async resolveSupportAssignee(id: number | null | undefined, tenant: Tenant | null, admin?: AdminContext) {
    if (!id) return null;
    const assignee = await this.admins.findOneBy({ id });
    if (!assignee || !assignee.enabled) throw new BadRequestException("工单负责人不存在或已停用");
    if (!effectivePermissionsForAdmin({ role: assignee.role, tenantId: assignee.tenant?.id || null, permissions: assignee.permissions || undefined }).includes("support.manage")) throw new BadRequestException("工单负责人没有客服处理权限");
    const tenantId = tenant?.id || null; const assigneeTenantId = assignee.tenant?.id || null;
    if (tenantId !== assigneeTenantId && !(tenantId && !assigneeTenantId && normalizeAdminRole(assignee.role) === AdminRole.SuperAdmin)) throw new BadRequestException("工单负责人不属于当前商家");
    if (this.isTenantScoped(admin) && assigneeTenantId !== admin?.tenantId) throw new ForbiddenException("不能指派给其他商家的账号");
    return assignee;
  }

  private appendSupportWorkOrderLog(row: SupportWorkOrder, action: string, content: string | null, fromStatus: string | null, toStatus: string | null, admin?: AdminContext, snapshot?: Record<string, unknown>) {
    return this.supportWorkOrderLogs.save(this.supportWorkOrderLogs.create({ workOrder: row, operator: admin?.id ? ({ id: admin.id } as AdminUser) : null, operatorName: this.actorName(admin), action, content, fromStatus, toStatus, snapshot: snapshot || null }));
  }

  async uploadedSettlementProof(file?: Express.Multer.File, admin?: AdminContext) {
    if (!file) throw new BadRequestException("请上传打款凭证文");
    const validated = validatedUploadFile(file, new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]));
    if (!validated) throw new BadRequestException("打款凭证内容与格式不匹配，仅支持 JPG、PNG、WebP、GIF 或 PDF 文件");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    const stored = await this.objectStorage.store(validated, `settlement-proofs-t${admin?.tenantId || "platform"}-a${admin?.id || "system"}`);
    return { url: stored.url, originalName: validated.originalname, size: validated.size, mimetype: validated.mimetype };
  }

  async uploadedPrivateSettlementProof(file?: Express.Multer.File, admin?: AdminContext) {
    if (!file) throw new BadRequestException("请上传打款凭证文件");
    if (!admin?.id) throw new ForbiddenException("请先登录后台");
    const validated = validatedUploadFile(file, new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]));
    if (!validated) throw new BadRequestException("打款凭证内容与格式不匹配，仅支持 JPG、PNG、WebP、GIF 或 PDF 文件");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    const reference = storePrivateDocument(validated, "settlement-proofs");
    const secret = this.config.get<string>("PRIVATE_ASSET_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
    const token = createPrivateAssetToken({ v: 1, purpose: "settlement_proof", reference, tenantId: admin.tenantId || null, ownerAdminId: admin.id, originalName: validated.originalname, mimetype: validated.mimetype, size: validated.size }, secret);
    return { url: `/api/admin/private-settlement-proofs/${token}/download`, originalName: validated.originalname, size: validated.size, mimetype: validated.mimetype, private: true };
  }

  readPrivateSettlementProof(token: string, admin?: AdminContext) {
    const secret = this.config.get<string>("PRIVATE_ASSET_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
    const payload = verifyPrivateAssetToken(token, secret);
    if (!payload || payload.purpose !== "settlement_proof" || !privateDocumentExists(payload.reference)) throw new NotFoundException("打款凭证不存在");
    if (admin?.tenantId && payload.tenantId !== admin.tenantId) throw new NotFoundException("打款凭证不存在或不属于当前商家");
    return { buffer: readPrivateDocument(payload.reference), originalName: payload.originalName, mimetype: payload.mimetype };
  }

  private assertPrivateSettlementProofUrl(value: string | null | undefined, admin?: AdminContext) {
    const url = String(value || "").trim();
    if (!url) return null;
    const token = url.match(/^\/api\/admin\/private-settlement-proofs\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\/download$/)?.[1];
    if (!token) return url;
    const secret = this.config.get<string>("PRIVATE_ASSET_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
    const payload = verifyPrivateAssetToken(token, secret);
    if (!payload || payload.purpose !== "settlement_proof" || (admin?.tenantId || null) !== (payload.tenantId || null) || !privateDocumentExists(payload.reference)) throw new BadRequestException("打款凭证无效或不属于当前商家");
    claimPrivateDocument(payload.reference);
    return url;
  }

  readRegistrationAttachment(token: string, admin?: AdminContext) {
    const secret = this.config.get<string>("PRIVATE_ASSET_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
    const payload = verifyPrivateAssetToken(token, secret);
    if (!payload || payload.purpose !== "registration_attachment" || !privateDocumentExists(payload.reference)) throw new NotFoundException("报名附件不存在");
    if (admin?.tenantId && payload.tenantId !== admin.tenantId) throw new NotFoundException("报名附件不存在或不属于当前商家");
    return { buffer: readPrivateDocument(payload.reference), originalName: payload.originalName, mimetype: payload.mimetype };
  }

  async createAdmin(dto: CreateAdminDto, admin?: AdminContext) {
    const username = dto.username.trim();
    this.validateAdminUsername(username);
    this.validateAdminPassword(dto.password);
    const exists = await this.admins.findOne({ where: { username } });
    if (exists) throw new BadRequestException("管理员账号已存在");
    const tenant = await this.resolveAdminTenant(dto.tenantId, admin);
    if (tenant) {
      this.assertTenantSubscriptionActive(tenant);
      await this.assertTenantQuota(tenant, "adminUsers", await this.admins.count({ where: { tenant: { id: tenant.id } } }));
    }
    const role = this.resolveNewAdminRole(dto.role, admin);
    const permissions = this.resolveAssignedAdminPermissions(dto.permissions, role, tenant?.id ?? null);
    const dataScope = await this.resolveAssignedAdminDataScope(dto.dataScope, tenant);
    const saved = await this.admins.save(this.admins.create({ username, passwordHash: await bcrypt.hash(dto.password, 10), role, tenant, permissions, dataScope }));
    await this.logOperation(admin, "admin.create", "admin", saved.id, `创建管理员：${saved.username}`, { role: saved.role, tenantId: tenant?.id || null, permissions: this.effectiveAdminPermissions(saved) });
    return this.publicAdmin(saved);
  }

  async updateAdminPassword(id: number, dto: UpdateAdminPasswordDto, admin?: AdminContext) {
    this.validateAdminPassword(dto.password);
    const row = await this.admins.findOneBy({ id });
    if (!row) throw new NotFoundException("管理员不存在");
    this.assertAdminAccountAccess(row, admin);
    row.passwordHash = await bcrypt.hash(dto.password, 10);
    row.sessionVersion = Number(row.sessionVersion || 0) + 1;
    const saved = await this.admins.save(row);
    await this.logOperation(admin, "admin.password.reset", "admin", saved.id, `重置管理员密码：${saved.username}`);
    return this.publicAdmin(saved);
  }

  async updateAdmin(id: number, dto: UpdateAdminDto, admin?: AdminContext) {
    const row = await this.admins.findOneBy({ id });
    if (!row) throw new NotFoundException("管理员不存在");
    this.assertAdminAccountAccess(row, admin);
    const before = this.adminAuditSnapshot(row);
    const nextRole = dto.role ? this.resolveNewAdminRole(dto.role, admin) : normalizeAdminRole(row.role);
    const nextTenant = dto.tenantId !== undefined ? await this.resolveAdminTenant(dto.tenantId, admin) : row.tenant || null;
    if (dto.enabled !== undefined && dto.enabled !== row.enabled) this.assertAdminSecurityPermission(admin);
    if (dto.enabled === false) {
      if (admin?.id === id) throw new BadRequestException("不能禁用当前登录账号");
      const enabledCount = await this.admins.count({ where: { enabled: true } });
      if (row.enabled && enabledCount <= 1) throw new BadRequestException("至少需要保留一个启用的管理员账号");
    }
    row.role = nextRole;
    row.tenant = nextTenant;
    if (dto.permissions !== undefined) row.permissions = this.resolveAssignedAdminPermissions(dto.permissions, nextRole, nextTenant?.id ?? null);
    if (dto.dataScope !== undefined) row.dataScope = await this.resolveAssignedAdminDataScope(dto.dataScope, nextTenant);
    else if ((row.tenant?.id || null) !== (nextTenant?.id || null)) row.dataScope = normalizeAdminDataScope(null);
    if (dto.enabled !== undefined) row.enabled = dto.enabled;
    row.sessionVersion = Number(row.sessionVersion || 0) + 1;
    const saved = await this.admins.save(row);
    await this.logOperation(admin, "admin.update", "admin", saved.id, `编辑管理员：${saved.username}`, auditDiff(before, this.adminAuditSnapshot(saved)));
    return this.publicAdmin(saved);
  }

  async changeOwnPassword(dto: ChangeOwnPasswordDto, admin: { id: number; username: string }) {
    this.validateAdminPassword(dto.newPassword);
    if (dto.oldPassword === dto.newPassword) throw new BadRequestException("新密码不能与当前密码相同");
    const row = await this.admins.findOneBy({ id: admin.id });
    if (!row || !row.enabled) throw new NotFoundException("管理员不存在或已禁用");
    if (!(await bcrypt.compare(dto.oldPassword, row.passwordHash))) throw new BadRequestException("当前密码不正确");
    row.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    row.sessionVersion = Number(row.sessionVersion || 0) + 1;
    const saved = await this.admins.save(row);
    await this.logOperation(admin, "admin.password.change", "admin", saved.id, `管理员修改自己的密码：${saved.username}`);
    return this.publicAdmin(saved);
  }

  async updateAdminStatus(id: number, dto: UpdateAdminStatusDto, admin?: AdminContext) {
    const row = await this.admins.findOneBy({ id });
    if (!row) throw new NotFoundException("管理员不存在");
    this.assertAdminAccountAccess(row, admin);
    if (!dto.enabled) {
      if (admin?.id === id) throw new BadRequestException("不能禁用当前登录账号");
      const enabledCount = await this.admins.count({ where: { enabled: true } });
      if (row.enabled && enabledCount <= 1) throw new BadRequestException("至少需要保留一个启用的管理员账");
    }
    row.enabled = dto.enabled;
    row.sessionVersion = Number(row.sessionVersion || 0) + 1;
    const saved = await this.admins.save(row);
    await this.logOperation(admin, dto.enabled ? "admin.enable" : "admin.disable", "admin", saved.id, `${dto.enabled ? "启用" : "禁用"}管理员：${saved.username}`);
    return this.publicAdmin(saved);
  }

  async forceAdminLogout(id: number, admin?: AdminContext) {
    const row = await this.admins.findOneBy({ id });
    if (!row) throw new NotFoundException("管理员不存在");
    this.assertAdminAccountAccess(row, admin);
    if (admin?.id === id) throw new BadRequestException("当前账号请使用退出登录，不能在此强制下线自己");
    row.sessionVersion = Number(row.sessionVersion || 0) + 1;
    const saved = await this.admins.save(row);
    await this.logOperation(admin, "admin.force_logout", "admin", saved.id, `强制管理员下线：${saved.username}`);
    return { id: saved.id, username: saved.username, forcedOffline: true };
  }

  async copyAdminRole(id: number, sourceAdminId: number, admin?: AdminContext) {
    if (id === sourceAdminId) throw new BadRequestException("目标账号和来源账号不能相同");
    const [target, source] = await Promise.all([this.admins.findOneBy({ id }), this.admins.findOneBy({ id: sourceAdminId })]);
    if (!target || !source) throw new NotFoundException("目标账号或来源账号不存在");
    this.assertAdminAccountAccess(target, admin);
    this.assertAdminAccountAccess(source, admin);
    if ((target.tenant?.id || null) !== (source.tenant?.id || null)) throw new BadRequestException("只能在同一商家范围内复制角色权限");
    const nextRole = this.resolveNewAdminRole(source.role, admin);
    target.role = nextRole;
    target.permissions = this.resolveAssignedAdminPermissions(source.permissions, nextRole, target.tenant?.id ?? null);
    target.dataScope = normalizeAdminDataScope(source.dataScope);
    target.sessionVersion = Number(target.sessionVersion || 0) + 1;
    const saved = await this.admins.save(target);
    await this.logOperation(admin, "admin.role.copy", "admin", saved.id, `复制管理员角色：${source.username} -> ${saved.username}`, { sourceAdminId: source.id, role: saved.role, permissions: this.effectiveAdminPermissions(saved) });
    return this.publicAdmin(saved);
  }

  async listAdminInvitations(admin?: AdminContext) {
    const builder = this.adminInvites.createQueryBuilder("invite").leftJoinAndSelect("invite.tenant", "tenant").leftJoinAndSelect("invite.invitedBy", "invitedBy").leftJoinAndSelect("invite.acceptedAdmin", "acceptedAdmin").orderBy("invite.id", "DESC").take(300);
    if (admin?.tenantId) builder.andWhere("invite.tenantId = :tenantId", { tenantId: admin.tenantId });
    else this.assertPlatformAdmin(admin);
    const rows = await builder.getMany();
    const now = Date.now();
    for (const row of rows) {
      if (row.status === "pending" && row.expiresAt.getTime() <= now) {
        row.status = "expired";
        await this.adminInvites.save(row);
      }
    }
    return rows.map((row) => this.publicAdminInvitation(row));
  }

  async createAdminInvitation(dto: CreateAdminInviteDto, admin?: AdminContext) {
    const username = dto.username.trim();
    this.validateAdminUsername(username);
    if (await this.admins.findOne({ where: { username } })) throw new BadRequestException("管理员账号已存在");
    const tenant = await this.resolveAdminTenant(dto.tenantId, admin);
    const role = this.resolveNewAdminRole(dto.role, admin);
    const permissions = this.resolveAssignedAdminPermissions(dto.permissions, role, tenant?.id ?? null);
    if (tenant) {
      this.assertTenantSubscriptionActive(tenant);
      const [adminCount, pendingCount] = await Promise.all([
        this.admins.count({ where: { tenant: { id: tenant.id } } }),
        this.adminInvites.createQueryBuilder("invite").where("invite.tenantId = :tenantId", { tenantId: tenant.id }).andWhere("invite.status = :status", { status: "pending" }).andWhere("invite.expiresAt > :now", { now: new Date() }).getCount()
      ]);
      await this.assertTenantQuota(tenant, "adminUsers", adminCount + pendingCount);
    }
    const duplicate = await this.adminInvites.createQueryBuilder("invite").where("invite.username = :username", { username }).andWhere("invite.status = :status", { status: "pending" }).andWhere("invite.expiresAt > :now", { now: new Date() }).getOne();
    if (duplicate) throw new BadRequestException("该账号已有有效邀请，请撤销旧邀请或等待过期");
    const token = randomBytes(32).toString("base64url");
    const expiresInHours = Math.min(Math.max(Number(dto.expiresInHours || 48), 1), 168);
    const dataScope = await this.resolveAssignedAdminDataScope(dto.dataScope, tenant);
    const row = await this.adminInvites.save(this.adminInvites.create({ username, tokenHash: this.adminInvitationTokenHash(token), role, permissions, dataScope, tenant, invitedBy: admin?.id ? ({ id: admin.id } as AdminUser) : null, acceptedAdmin: null, status: "pending", expiresAt: new Date(Date.now() + expiresInHours * 3600000), acceptedAt: null, revokedAt: null }));
    await this.logOperation(admin, "admin.invitation.create", "admin_invite", row.id, `邀请管理员：${username}`, { tenantId: tenant?.id || null, role, expiresAt: row.expiresAt });
    return { ...this.publicAdminInvitation(row), token, invitePath: `/admin/invite?token=${encodeURIComponent(token)}` };
  }

  async revokeAdminInvitation(id: number, admin?: AdminContext) {
    const row = await this.adminInvites.findOneBy({ id });
    if (!row) throw new NotFoundException("管理员邀请不存在");
    this.assertAdminInvitationAccess(row, admin);
    if (row.status !== "pending") throw new BadRequestException("只有待接受邀请可以撤销");
    row.status = "revoked";
    row.revokedAt = new Date();
    const saved = await this.adminInvites.save(row);
    await this.logOperation(admin, "admin.invitation.revoke", "admin_invite", saved.id, `撤销管理员邀请：${saved.username}`);
    return this.publicAdminInvitation(saved);
  }

  async adminInvitationPreview(token: string) {
    const row = await this.adminInvites.findOne({ where: { tokenHash: this.adminInvitationTokenHash(token) } });
    if (!row || row.status !== "pending") throw new NotFoundException("邀请不存在或已失效");
    if (row.expiresAt.getTime() <= Date.now()) {
      row.status = "expired";
      await this.adminInvites.save(row);
      throw new BadRequestException("邀请已过期，请联系管理员重新邀请");
    }
    return this.publicAdminInvitation(row);
  }

  async acceptAdminInvitation(dto: AcceptAdminInviteDto) {
    this.validateAdminPassword(dto.password);
    const tokenHash = this.adminInvitationTokenHash(dto.token);
    return this.dataSource.transaction(async (manager) => {
      const invites = manager.getRepository(AdminInvite);
      const admins = manager.getRepository(AdminUser);
      const row = await invites.findOne({ where: { tokenHash }, lock: { mode: "pessimistic_write" } });
      if (!row || row.status !== "pending") throw new NotFoundException("邀请不存在或已失效");
      if (row.expiresAt.getTime() <= Date.now()) {
        row.status = "expired";
        await invites.save(row);
        throw new BadRequestException("邀请已过期，请联系管理员重新邀请");
      }
      if (await admins.findOne({ where: { username: row.username } })) throw new BadRequestException("管理员账号已存在");
      if (row.tenant) {
        this.assertTenantSubscriptionActive(row.tenant);
        const used = await admins.count({ where: { tenant: { id: row.tenant.id } } });
        const quota = tenantQuotaAccess(this.tenantEntitlementSettings(row.tenant), "adminUsers", used);
        if (!quota.allowed) throw new ForbiddenException(`${quota.reason}，请联系管理员升级套餐或调整配额`);
      }
      const admin = await admins.save(admins.create({ username: row.username, passwordHash: await bcrypt.hash(dto.password, 10), role: row.role, permissions: row.permissions, dataScope: normalizeAdminDataScope(row.dataScope), tenant: row.tenant, enabled: true, sessionVersion: 0 }));
      row.status = "accepted";
      row.acceptedAdmin = admin;
      row.acceptedAt = new Date();
      await invites.save(row);
      return { accepted: true, admin: this.publicAdmin(admin) };
    });
  }

  async listCategories(includeDisabled = false, admin?: AdminContext) {
    const builder = this.categories.createQueryBuilder("category").leftJoinAndSelect("category.tenant", "tenant").orderBy("category.sortOrder", "ASC").addOrderBy("category.id", "ASC");
    this.applyTenantScope(builder, "category", admin);
    if (!includeDisabled) builder.andWhere("category.enabled = :enabled", { enabled: true });
    const rows = await builder.getMany();
    return rows.map((row) => this.publicCategory(row));
  }

  async announcementOptions(admin?: AdminContext) {
    const [tenants, memberLevels] = await Promise.all([
      this.isTenantScoped(admin)
        ? this.tenants.find({ where: { id: admin?.tenantId || 0, enabled: true }, order: { name: "ASC", id: "ASC" } })
        : this.tenants.find({ where: { enabled: true }, order: { name: "ASC", id: "ASC" }, take: 1000 }),
      this.memberLevelOptionRows(admin)
    ]);
    return {
      tenants: tenants.map((tenant) => ({ id: tenant.id, code: tenant.code, name: tenant.name, enabled: tenant.enabled })),
      memberLevels: memberLevels.map((level) => ({ id: level.id, name: level.name, enabled: level.enabled, tenantId: level.tenant?.id || null, tenantScopeKey: level.tenantScopeKey })),
      types: [
        { value: "notice", label: "通知" },
        { value: "guide", label: "提醒" },
        { value: "activity", label: "活动" },
        { value: "operation", label: "运营" }
      ]
    };
  }

  async listAnnouncements(admin?: AdminContext, query: AnnouncementQueryDto = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.announcements
      .createQueryBuilder("announcement")
      .leftJoin("announcement.tenant", "tenant")
      .select([
        "announcement.id", "announcement.title", "announcement.content", "announcement.type", "announcement.enabled", "announcement.pinned",
        "announcement.publishAt", "announcement.endAt", "announcement.audience", "announcement.viewCount", "announcement.clickCount",
        "announcement.createdAt", "announcement.updatedAt", "tenant.id", "tenant.code", "tenant.name", "tenant.enabled"
      ])
      .orderBy("announcement.pinned", "DESC")
      .addOrderBy("announcement.createdAt", "DESC")
      .addOrderBy("announcement.id", "DESC");
    this.applyTenantScope(builder, "announcement", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("announcement.tenantId = :tenantId", { tenantId: query.tenantId });
    if (query.keyword?.trim()) {
      builder.andWhere("(announcement.title LIKE :keyword OR announcement.content LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.type) builder.andWhere("announcement.type = :type", { type: query.type });
    if (query.enabled === "true" || query.enabled === "false") builder.andWhere("announcement.enabled = :enabled", { enabled: query.enabled === "true" });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((row) => this.publicAnnouncement(row)), total, page, pageSize };
  }

  async createAnnouncement(dto: AnnouncementDto, admin?: AdminContext) {
    const title = dto.title.trim();
    const content = dto.content.trim();
    if (!title || !content) throw new BadRequestException("请填写公告标题和内容");
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    const publishAt = dto.publishAt ? this.parseDate(dto.publishAt) : null;
    const endAt = dto.endAt ? this.parseDate(dto.endAt) : null;
    if (publishAt && endAt && publishAt >= endAt) throw new BadRequestException("公告失效时间必须晚于发布时间");
    const audience = await this.normalizeAnnouncementAudience(dto.audience, tenant);
    const saved = await this.announcements.save(
      this.announcements.create({
        tenant,
        title,
        content,
        type: dto.type?.trim() || "notice",
        enabled: dto.enabled ?? true,
        pinned: dto.pinned ?? false,
        publishAt,
        endAt,
        audience
      })
    );
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "announcement.create", "announcement", saved.id, `创建公告：${saved.title}`, { type: saved.type, enabled: saved.enabled, pinned: saved.pinned, tenantId: saved.tenant?.id || null });
    return this.publicAnnouncement(saved);
  }

  async updateAnnouncement(id: number, dto: AnnouncementDto, admin?: AdminContext) {
    const title = dto.title.trim();
    const content = dto.content.trim();
    if (!title || !content) throw new BadRequestException("请填写公告标题和内容");
    const result = await this.dataSource.transaction(async (manager) => {
      const announcements = manager.getRepository(Announcement);
      const row = await announcements.createQueryBuilder("announcement").leftJoinAndSelect("announcement.tenant", "tenant").where("announcement.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!row) throw new NotFoundException("公告不存在");
      this.assertTenantAccess(row, admin);
      const tenant = await this.resolveAnnouncementTenant(dto.tenantId, row.tenant, admin, manager.getRepository(Tenant));
      this.assertTenantSubscriptionWritable(tenant, admin);
      const publishAt = dto.publishAt ? this.parseDate(dto.publishAt) : null;
      const endAt = dto.endAt ? this.parseDate(dto.endAt) : null;
      if (publishAt && endAt && publishAt >= endAt) throw new BadRequestException("公告失效时间必须晚于发布时间");
      const before = this.announcementAuditSnapshot(row);
      Object.assign(row, {
        tenant,
        title,
        content,
        type: dto.type?.trim() || row.type,
        enabled: dto.enabled ?? row.enabled,
        pinned: dto.pinned ?? row.pinned,
        publishAt,
        endAt,
        audience: await this.normalizeAnnouncementAudience(dto.audience, tenant, manager.getRepository(MemberLevel))
      });
      return { saved: await announcements.save(row), before };
    });
    const { saved, before } = result;
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "announcement.update", "announcement", saved.id, `更新公告：${saved.title}`, { before, after: this.announcementAuditSnapshot(saved) });
    return this.publicAnnouncement(saved);
  }

  async deleteAnnouncement(id: number, admin?: AdminContext) {
    const row = await this.dataSource.transaction(async (manager) => {
      const announcements = manager.getRepository(Announcement);
      const locked = await announcements.createQueryBuilder("announcement").leftJoinAndSelect("announcement.tenant", "tenant").where("announcement.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!locked) throw new NotFoundException("公告不存在");
      this.assertTenantAccess(locked, admin);
      this.assertTenantSubscriptionWritable(locked.tenant, admin);
      await announcements.remove(locked);
      return locked;
    });
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "announcement.delete", "announcement", id, `删除公告：${row.title}`, { type: row.type, enabled: row.enabled, pinned: row.pinned, tenantId: row.tenant?.id || null });
    return { id, deleted: true };
  }

  async marketingPopupOptions(admin?: AdminContext) {
    const [tenants, memberLevels] = await Promise.all([
      this.isTenantScoped(admin)
        ? this.tenants.find({ where: { id: admin?.tenantId || 0, enabled: true }, order: { name: "ASC", id: "ASC" } })
        : this.tenants.find({ where: { enabled: true }, order: { name: "ASC", id: "ASC" }, take: 1000 }),
      this.memberLevelOptionRows(admin)
    ]);
    return {
      tenants: tenants.map((tenant) => ({ id: tenant.id, code: tenant.code, name: tenant.name, enabled: tenant.enabled })),
      memberLevels: memberLevels.map((level) => ({ id: level.id, name: level.name, enabled: level.enabled, tenantId: level.tenant?.id || null, tenantScopeKey: level.tenantScopeKey })),
      types: [
        { value: "notice", label: "重要通知" },
        { value: "ad", label: "广告推广" },
        { value: "payment", label: "支付提醒" },
        { value: "wuxing_gold", label: "五行暖金通知" }
      ],
      platforms: [
        { value: "all", label: "全部" },
        { value: "h5", label: "H5" },
        { value: "mp-weixin", label: "微信小程序" }
      ],
      placements: [
        { value: "all", label: "全部页面" },
        { value: "home", label: "首页" },
        { value: "mall_home", label: "商城首页" },
        { value: "activity_list", label: "活动列表" },
        { value: "activity_detail", label: "活动详情" },
        { value: "course_home", label: "课程首页" },
        { value: "course_detail", label: "课程详情" },
        { value: "mall_product_detail", label: "商城商品详情" },
        { value: "community_home", label: "共修首页" },
        { value: "user_my", label: "我的" }
      ],
      frequencies: [
        { value: "every_visit", label: "每次进入" },
        { value: "once_per_day", label: "每天一次" },
        { value: "once_per_campaign", label: "当前活动一次" }
      ]
    };
  }

  async listMarketingPopups(admin?: AdminContext, query: MarketingPopupQueryDto = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.marketingPopups
      .createQueryBuilder("popup")
      .leftJoin("popup.tenant", "tenant")
      .select([
        "popup.id", "popup.title", "popup.subtitle", "popup.content", "popup.emphasis", "popup.imageUrl", "popup.type", "popup.platforms", "popup.placements",
        "popup.audience", "popup.buttons", "popup.frequency", "popup.priority", "popup.enabled", "popup.dismissible", "popup.startAt", "popup.endAt",
        "popup.impressionCount", "popup.clickCount", "popup.closeCount", "popup.createdAt", "popup.updatedAt", "tenant.id", "tenant.code", "tenant.name", "tenant.enabled"
      ])
      .orderBy("popup.priority", "DESC")
      .addOrderBy("popup.updatedAt", "DESC")
      .addOrderBy("popup.id", "DESC");
    this.applyTenantScope(builder, "popup", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("popup.tenantId = :tenantId", { tenantId: query.tenantId });
    if (query.enabled === "true" || query.enabled === "false") builder.andWhere("popup.enabled = :enabled", { enabled: query.enabled === "true" });
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      builder.andWhere("(popup.title LIKE :keyword OR popup.subtitle LIKE :keyword OR popup.content LIKE :keyword OR popup.emphasis LIKE :keyword)", { keyword });
    }
    if (query.platform) builder.andWhere("(JSON_CONTAINS(popup.platforms, :popupPlatform) = 1 OR JSON_CONTAINS(popup.platforms, :popupAllPlatform) = 1)", { popupPlatform: JSON.stringify(query.platform), popupAllPlatform: JSON.stringify("all") });
    if (query.placement) builder.andWhere("(JSON_CONTAINS(popup.placements, :popupPlacement) = 1 OR JSON_CONTAINS(popup.placements, :popupAllPlacement) = 1)", { popupPlacement: JSON.stringify(query.placement), popupAllPlacement: JSON.stringify("all") });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((row) => this.publicMarketingPopupAdmin(row)), total, page, pageSize };
  }

  async createMarketingPopup(dto: MarketingPopupDto, admin?: AdminContext) {
    const saved = await this.dataSource.transaction(async (manager) => {
      const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin, manager.getRepository(Tenant));
      this.assertTenantSubscriptionWritable(tenant, admin);
      const payload = await this.marketingPopupPayload(dto, tenant, manager.getRepository(MemberLevel));
      return manager.getRepository(MarketingPopup).save(manager.getRepository(MarketingPopup).create({ tenant, ...payload }));
    });
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "marketing_popup.create", "marketing_popup", saved.id, `创建营销弹窗：${saved.title}`, { tenantId: saved.tenant?.id || null, type: saved.type, enabled: saved.enabled });
    return this.publicMarketingPopupAdmin(saved);
  }

  async updateMarketingPopup(id: number, dto: MarketingPopupDto, admin?: AdminContext) {
    const result = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(MarketingPopup);
      const row = await repository.createQueryBuilder("popup").leftJoinAndSelect("popup.tenant", "tenant").where("popup.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!row) throw new NotFoundException("营销弹窗不存在");
      this.assertTenantAccess(row, admin);
      const tenant = await this.resolveAnnouncementTenant(dto.tenantId, row.tenant, admin, manager.getRepository(Tenant));
      this.assertTenantSubscriptionWritable(tenant, admin);
      const before = this.marketingPopupAuditSnapshot(row);
      Object.assign(row, { tenant, ...await this.marketingPopupPayload(dto, tenant, manager.getRepository(MemberLevel)) });
      return { saved: await repository.save(row), before };
    });
    const { saved, before } = result;
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "marketing_popup.update", "marketing_popup", saved.id, `更新营销弹窗：${saved.title}`, { before, after: this.marketingPopupAuditSnapshot(saved) });
    return this.publicMarketingPopupAdmin(saved);
  }

  async deleteMarketingPopup(id: number, admin?: AdminContext) {
    const row = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(MarketingPopup);
      const locked = await repository.createQueryBuilder("popup").leftJoinAndSelect("popup.tenant", "tenant").where("popup.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!locked) throw new NotFoundException("营销弹窗不存在");
      this.assertTenantAccess(locked, admin);
      this.assertTenantSubscriptionWritable(locked.tenant, admin);
      await repository.remove(locked);
      return locked;
    });
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "marketing_popup.delete", "marketing_popup", id, `删除营销弹窗：${row.title}`, { tenantId: row.tenant?.id || null, type: row.type });
    return { id, deleted: true };
  }

  async marketingPopupEffectiveCheck(admin?: AdminContext, query: MarketingPopupEffectiveCheckQueryDto = {}) {
    const pageKey = query.pageKey || "home";
    const platform = query.platform || "h5";
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : query.tenantId ? await this.tenants.findOneBy({ id: query.tenantId }) : null;
    if (query.tenantId && !tenant) throw new NotFoundException("商家不存在");
    const builder = this.marketingPopups.createQueryBuilder("popup").leftJoinAndSelect("popup.tenant", "tenant").orderBy("popup.priority", "DESC").addOrderBy("popup.updatedAt", "DESC").addOrderBy("popup.id", "DESC").take(query.id ? 1 : 300);
    this.applyTenantScope(builder, "popup", admin);
    if (query.id) builder.andWhere("popup.id = :id", { id: query.id });
    else if (tenant) builder.andWhere("tenant.id = :tenantId", { tenantId: tenant.id });
    else if (!this.isTenantScoped(admin)) builder.andWhere("popup.tenantId IS NULL");
    const rows = await builder.getMany();
    if (query.id && !rows.length) throw new NotFoundException("营销弹窗不存在");
    const checks = rows.map((row) => this.marketingPopupEffectiveResult(row, pageKey, platform, tenant?.id || null));
    const hit = checks.find((item) => item.matched) || null;
    return {
      pageKey,
      platform,
      tenant: tenant ? { id: tenant.id, code: tenant.code, name: tenant.name } : null,
      matched: Boolean(hit),
      hit,
      publicPopup: hit ? hit.popup : null,
      checks: query.id ? checks : checks.slice(0, 50)
    };
  }

  async adCenterOptions(admin?: AdminContext) {
    const tenantBuilder = this.tenants.createQueryBuilder("tenant").where("tenant.enabled = :enabled", { enabled: true }).orderBy("tenant.name", "ASC").addOrderBy("tenant.id", "ASC").take(1000);
    if (this.isTenantScoped(admin)) tenantBuilder.andWhere("tenant.id = :tenantId", { tenantId: admin?.tenantId || 0 });
    const advertiserBuilder = this.adAdvertisers.createQueryBuilder("advertiser").leftJoin("advertiser.tenant", "tenant").select(["advertiser.id", "advertiser.companyName", "advertiser.status", "tenant.id"]).where("advertiser.status != :archived", { archived: "archived" }).orderBy("advertiser.companyName", "ASC").addOrderBy("advertiser.id", "ASC").take(2000);
    const contractBuilder = this.adContracts.createQueryBuilder("contract").leftJoin("contract.tenant", "tenant").leftJoin("contract.advertiser", "advertiser").select(["contract.id", "contract.contractNo", "contract.title", "contract.status", "contract.billingModel", "tenant.id", "advertiser.id", "advertiser.companyName"]).where("contract.status != :archived", { archived: "archived" }).orderBy("contract.contractNo", "ASC").addOrderBy("contract.id", "ASC").take(2000);
    this.applyTenantScope(advertiserBuilder, "advertiser", admin);
    this.applyTenantScope(contractBuilder, "contract", admin);
    const [tenants, memberLevels, advertisers, contracts] = await Promise.all([
      tenantBuilder.getMany(),
      this.memberLevelOptionRows(admin),
      advertiserBuilder.getMany(),
      contractBuilder.getMany()
    ]);
    return {
      tenants: tenants.map((tenant) => ({ id: tenant.id, code: tenant.code, name: tenant.name, enabled: tenant.enabled, defaultAdImageUrl: this.tenantDefaultAdImage(tenant) || null })),
      memberLevels: memberLevels.map((level) => ({ id: level.id, name: level.name, enabled: level.enabled, tenantId: level.tenant?.id || null, tenantScopeKey: level.tenantScopeKey })),
      advertisers: advertisers.map((row) => ({ id: row.id, companyName: row.companyName, status: row.status, tenantId: row.tenant?.id || null })),
      contracts: contracts.map((row) => ({ id: row.id, contractNo: row.contractNo, title: row.title, status: row.status, billingModel: row.billingModel, advertiserId: row.advertiser?.id || null, advertiserName: row.advertiser?.companyName || null, tenantId: row.tenant?.id || null })),
      sources: [{ value: "custom", label: "自有广告" }, { value: "wechat_official", label: "微信官方流量主" }],
      formats: ["splash", "inline_card", "banner", "official_banner", "official_video", "official_grid", "official_interstitial", "official_rewarded_video"],
      billingModels: ["fixed", "cpm", "cpc", "mixed"],
      platforms: ["all", "h5", "mp-weixin"],
      frequencies: ["every_visit", "once_per_day", "once_per_campaign"],
      advertiserStatuses: ["active", "paused", "archived"],
      paymentStatuses: ["unpaid", "partial", "paid", "refunded"],
      settlementStatuses: ["pending", "confirmed", "invoiced", "paid", "voided"]
    };
  }

  async listAdAdvertisers(admin?: AdminContext, query: AdCenterQueryDto = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.adAdvertisers.createQueryBuilder("advertiser").leftJoin("advertiser.tenant", "tenant").select(["advertiser.id", "advertiser.companyName", "advertiser.contactName", "advertiser.contactPhone", "advertiser.wechat", "advertiser.licenseUrl", "advertiser.remark", "advertiser.status", "advertiser.createdAt", "advertiser.updatedAt", "tenant.id", "tenant.code", "tenant.name", "tenant.enabled"]).orderBy("advertiser.updatedAt", "DESC").addOrderBy("advertiser.id", "DESC");
    this.applyTenantScope(builder, "advertiser", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("advertiser.tenantId = :tenantId", { tenantId: query.tenantId });
    if (query.status) builder.andWhere("advertiser.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      builder.andWhere("(advertiser.companyName LIKE :keyword OR advertiser.contactName LIKE :keyword OR advertiser.contactPhone LIKE :keyword OR advertiser.wechat LIKE :keyword)", { keyword });
    }
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const includeSensitive = this.hasAdPermission(admin, "ad_center.sensitive");
    if (includeSensitive) await this.logOperation(admin, "ad.sensitive.view", "ad_advertiser", null, `查看广告主敏感资料：${rows.length} 条`, { rowCount: rows.length, tenantId: query.tenantId || admin?.tenantId || null, keyword: query.keyword || null });
    return { items: rows.map((row) => this.publicAdAdvertiser(row, includeSensitive)), total, page, pageSize };
  }

  async createAdAdvertiser(dto: AdAdvertiserDto, admin?: AdminContext) {
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    if (tenant) this.assertTenantFeature(tenant, "ads");
    const payload = this.adAdvertiserPayload(dto);
    if (!this.hasAdPermission(admin, "ad_center.sensitive")) Object.assign(payload, { contactPhone: null, wechat: null, licenseUrl: null, remark: null });
    const saved = await this.adAdvertisers.save(this.adAdvertisers.create({ tenant, ...payload }));
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.advertiser.create", "ad_advertiser", saved.id, `创建广告主：${saved.companyName}`, { tenantId: saved.tenant?.id || null, status: saved.status });
    return this.publicAdAdvertiser(saved, this.hasAdPermission(admin, "ad_center.sensitive"));
  }

  async updateAdAdvertiser(id: number, dto: AdAdvertiserDto, admin?: AdminContext) {
    const result = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AdAdvertiser);
      const row = await repository.createQueryBuilder("advertiser").leftJoinAndSelect("advertiser.tenant", "tenant").where("advertiser.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!row) throw new NotFoundException("广告主不存在");
      this.assertTenantAccess(row, admin);
      const tenant = await this.resolveAnnouncementTenant(dto.tenantId, row.tenant, admin, manager.getRepository(Tenant));
      this.assertTenantSubscriptionWritable(tenant, admin);
      if (tenant) this.assertTenantFeature(tenant, "ads");
      const before = this.adAdvertiserAuditSnapshot(row);
      const payload = this.adAdvertiserPayload(dto);
      if (!this.hasAdPermission(admin, "ad_center.sensitive")) Object.assign(payload, { contactPhone: row.contactPhone, wechat: row.wechat, licenseUrl: row.licenseUrl, remark: row.remark });
      Object.assign(row, { tenant, ...payload });
      return { saved: await repository.save(row), before };
    });
    await this.logOperation(this.operationActorForTenant(admin, result.saved.tenant), "ad.advertiser.update", "ad_advertiser", result.saved.id, `更新广告主：${result.saved.companyName}`, { before: result.before, after: this.adAdvertiserAuditSnapshot(result.saved) });
    return this.publicAdAdvertiser(result.saved, this.hasAdPermission(admin, "ad_center.sensitive"));
  }

  async deleteAdAdvertiser(id: number, admin?: AdminContext) {
    const row = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AdAdvertiser);
      const locked = await repository.createQueryBuilder("advertiser").leftJoinAndSelect("advertiser.tenant", "tenant").where("advertiser.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!locked) throw new NotFoundException("广告主不存在");
      this.assertTenantAccess(locked, admin);
      this.assertTenantSubscriptionWritable(locked.tenant, admin);
      if (locked.tenant) this.assertTenantFeature(locked.tenant, "ads");
      await repository.remove(locked);
      return locked;
    });
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "ad.advertiser.delete", "ad_advertiser", id, `删除广告主：${row.companyName}`, { tenantId: row.tenant?.id || null });
    return { id, deleted: true };
  }

  async listAdContracts(admin?: AdminContext, query: AdCenterQueryDto = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.adContracts.createQueryBuilder("contract").leftJoin("contract.tenant", "tenant").leftJoin("contract.advertiser", "advertiser").select(["contract.id", "contract.contractNo", "contract.title", "contract.billingModel", "contract.amount", "contract.fixedFee", "contract.cpmPrice", "contract.cpcPrice", "contract.startAt", "contract.endAt", "contract.paymentStatus", "contract.attachmentUrl", "contract.remark", "contract.status", "contract.createdAt", "contract.updatedAt", "tenant.id", "tenant.code", "tenant.name", "tenant.enabled", "advertiser.id", "advertiser.companyName", "advertiser.status"]).orderBy("contract.updatedAt", "DESC").addOrderBy("contract.id", "DESC");
    this.applyTenantScope(builder, "contract", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("contract.tenantId = :tenantId", { tenantId: query.tenantId });
    if (query.advertiserId) builder.andWhere("contract.advertiserId = :advertiserId", { advertiserId: query.advertiserId });
    if (query.status) builder.andWhere("contract.status = :status", { status: query.status });
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      builder.andWhere("(contract.contractNo LIKE :keyword OR contract.title LIKE :keyword OR advertiser.companyName LIKE :keyword)", { keyword });
    }
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const includeSensitive = this.hasAdPermission(admin, "ad_center.sensitive");
    if (includeSensitive) await this.logOperation(admin, "ad.sensitive.view", "ad_contract", null, `查看广告合同敏感资料：${rows.length} 条`, { rowCount: rows.length, tenantId: query.tenantId || admin?.tenantId || null, keyword: query.keyword || null });
    return { items: rows.map((row) => this.publicAdContract(row, includeSensitive)), total, page, pageSize };
  }

  async createAdContract(dto: AdContractDto, admin?: AdminContext) {
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    if (tenant) this.assertTenantFeature(tenant, "ads");
    const advertiser = await this.resolveAdAdvertiser(dto.advertiserId, tenant, admin);
    const payload = this.adContractPayload(dto);
    if (!this.hasAdPermission(admin, "ad_center.sensitive")) Object.assign(payload, { attachmentUrl: null, remark: null });
    const saved = await this.adContracts.save(this.adContracts.create({ tenant, advertiser, ...payload }));
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.contract.create", "ad_contract", saved.id, `创建广告合同：${saved.contractNo}`, { tenantId: saved.tenant?.id || null, billingModel: saved.billingModel, amount: saved.amount });
    return this.publicAdContract(saved, this.hasAdPermission(admin, "ad_center.sensitive"));
  }

  async updateAdContract(id: number, dto: AdContractDto, admin?: AdminContext) {
    const result = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AdContract);
      const row = await repository.createQueryBuilder("contract").leftJoinAndSelect("contract.tenant", "tenant").leftJoinAndSelect("contract.advertiser", "advertiser").where("contract.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!row) throw new NotFoundException("广告合同不存在");
      this.assertTenantAccess(row, admin);
      const tenant = await this.resolveAnnouncementTenant(dto.tenantId, row.tenant, admin, manager.getRepository(Tenant));
      this.assertTenantSubscriptionWritable(tenant, admin);
      if (tenant) this.assertTenantFeature(tenant, "ads");
      const advertiser = await this.resolveAdAdvertiser(dto.advertiserId, tenant, admin, manager.getRepository(AdAdvertiser));
      const before = this.adContractAuditSnapshot(row);
      const payload = this.adContractPayload(dto);
      if (!this.hasAdPermission(admin, "ad_center.sensitive")) Object.assign(payload, { attachmentUrl: row.attachmentUrl, remark: row.remark });
      Object.assign(row, { tenant, advertiser, ...payload });
      return { saved: await repository.save(row), before };
    });
    await this.logOperation(this.operationActorForTenant(admin, result.saved.tenant), "ad.contract.update", "ad_contract", result.saved.id, `更新广告合同：${result.saved.contractNo}`, { before: result.before, after: this.adContractAuditSnapshot(result.saved) });
    return this.publicAdContract(result.saved, this.hasAdPermission(admin, "ad_center.sensitive"));
  }

  async deleteAdContract(id: number, admin?: AdminContext) {
    const row = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AdContract);
      const locked = await repository.createQueryBuilder("contract").leftJoinAndSelect("contract.tenant", "tenant").where("contract.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!locked) throw new NotFoundException("广告合同不存在");
      this.assertTenantAccess(locked, admin);
      this.assertTenantSubscriptionWritable(locked.tenant, admin);
      if (locked.tenant) this.assertTenantFeature(locked.tenant, "ads");
      await repository.remove(locked);
      return locked;
    });
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "ad.contract.delete", "ad_contract", id, `删除广告合同：${row.contractNo}`, { tenantId: row.tenant?.id || null });
    return { id, deleted: true };
  }

  async listAdCampaigns(admin?: AdminContext, query: AdCenterQueryDto = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.adCampaignListBuilder(admin, query).skip((page - 1) * pageSize).take(pageSize);
    const [rows, total] = await builder.getManyAndCount();
    return { items: rows.map((row) => this.publicAdCampaign(row)), total, page, pageSize };
  }

  private adCampaignListBuilder(admin?: AdminContext, query: AdCenterQueryDto = {}) {
    const builder = this.adCampaigns.createQueryBuilder("campaign").leftJoin("campaign.tenant", "tenant").leftJoin("campaign.advertiser", "advertiser").leftJoin("campaign.contract", "contract").select(["campaign.id", "campaign.name", "campaign.title", "campaign.subtitle", "campaign.imageUrl", "campaign.imageUrls", "campaign.source", "campaign.format", "campaign.slotKey", "campaign.pageKey", "campaign.platforms", "campaign.audience", "campaign.link", "campaign.billingModel", "campaign.fixedFee", "campaign.cpmPrice", "campaign.cpcPrice", "campaign.totalBudget", "campaign.dailyBudget", "campaign.impressionLimit", "campaign.clickLimit", "campaign.officialAdUnitId", "campaign.officialAdType", "campaign.frequency", "campaign.priority", "campaign.enabled", "campaign.startAt", "campaign.endAt", "campaign.impressionCount", "campaign.clickCount", "campaign.skipCount", "campaign.closeCount", "campaign.loadCount", "campaign.errorCount", "campaign.rewardCount", "campaign.spentAmount", "campaign.createdAt", "campaign.updatedAt", "tenant.id", "tenant.code", "tenant.name", "tenant.enabled", "advertiser.id", "advertiser.companyName", "advertiser.status", "contract.id", "contract.contractNo", "contract.title", "contract.status", "contract.billingModel"]).orderBy("campaign.priority", "DESC").addOrderBy("campaign.updatedAt", "DESC").addOrderBy("campaign.id", "DESC");
    this.applyTenantScope(builder, "campaign", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("campaign.tenantId = :tenantId", { tenantId: query.tenantId });
    if (query.advertiserId) builder.andWhere("campaign.advertiserId = :advertiserId", { advertiserId: query.advertiserId });
    if (query.contractId) builder.andWhere("campaign.contractId = :contractId", { contractId: query.contractId });
    if (query.enabled === "true" || query.enabled === "false") builder.andWhere("campaign.enabled = :enabled", { enabled: query.enabled === "true" });
    if (query.source) builder.andWhere("campaign.source = :source", { source: query.source });
    if (query.slotKey) builder.andWhere("campaign.slotKey = :slotKey", { slotKey: query.slotKey });
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      builder.andWhere("(campaign.name LIKE :keyword OR campaign.title LIKE :keyword OR campaign.subtitle LIKE :keyword OR advertiser.companyName LIKE :keyword OR contract.contractNo LIKE :keyword)", { keyword });
    }
    return builder;
  }

  async createAdCampaign(dto: AdCampaignDto, admin?: AdminContext) {
    const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin);
    this.assertTenantSubscriptionWritable(tenant, admin);
    if (tenant) this.assertTenantFeature(tenant, "ads");
    const advertiser = await this.resolveAdAdvertiser(dto.advertiserId, tenant, admin);
    const contract = await this.resolveAdContract(dto.contractId, tenant, admin);
    const saved = await this.adCampaigns.save(this.adCampaigns.create({ tenant, advertiser, contract, ...(await this.adCampaignPayload(dto, tenant)) }));
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.campaign.create", "ad_campaign", saved.id, `创建广告计划：${saved.name}`, { tenantId: saved.tenant?.id || null, source: saved.source, format: saved.format, slotKey: saved.slotKey });
    return this.publicAdCampaign(saved);
  }

  async updateAdCampaign(id: number, dto: AdCampaignDto, admin?: AdminContext) {
    const result = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AdCampaign);
      const row = await repository.createQueryBuilder("campaign").leftJoinAndSelect("campaign.tenant", "tenant").leftJoinAndSelect("campaign.advertiser", "advertiser").leftJoinAndSelect("campaign.contract", "contract").where("campaign.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!row) throw new NotFoundException("广告计划不存在");
      this.assertTenantAccess(row, admin);
      const tenant = await this.resolveAnnouncementTenant(dto.tenantId, row.tenant, admin, manager.getRepository(Tenant));
      this.assertTenantSubscriptionWritable(tenant, admin);
      if (tenant) this.assertTenantFeature(tenant, "ads");
      const advertiser = await this.resolveAdAdvertiser(dto.advertiserId, tenant, admin, manager.getRepository(AdAdvertiser));
      const contract = await this.resolveAdContract(dto.contractId, tenant, admin, manager.getRepository(AdContract));
      const before = this.adCampaignAuditSnapshot(row);
      Object.assign(row, { tenant, advertiser, contract, ...(await this.adCampaignPayload(dto, tenant, manager.getRepository(MemberLevel))) });
      return { saved: await repository.save(row), before };
    });
    await this.logOperation(this.operationActorForTenant(admin, result.saved.tenant), "ad.campaign.update", "ad_campaign", result.saved.id, `更新广告计划：${result.saved.name}`, { before: result.before, after: this.adCampaignAuditSnapshot(result.saved) });
    return this.publicAdCampaign(result.saved);
  }

  async deleteAdCampaign(id: number, admin?: AdminContext) {
    const row = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AdCampaign);
      const locked = await repository.createQueryBuilder("campaign").leftJoinAndSelect("campaign.tenant", "tenant").where("campaign.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!locked) throw new NotFoundException("广告计划不存在");
      this.assertTenantAccess(locked, admin);
      this.assertTenantSubscriptionWritable(locked.tenant, admin);
      if (locked.tenant) this.assertTenantFeature(locked.tenant, "ads");
      await repository.remove(locked);
      return locked;
    });
    await this.logOperation(this.operationActorForTenant(admin, row.tenant), "ad.campaign.delete", "ad_campaign", id, `删除广告计划：${row.name}`, { tenantId: row.tenant?.id || null, source: row.source, slotKey: row.slotKey });
    return { id, deleted: true };
  }

  async exportAdCampaigns(admin?: AdminContext, query: AdCenterQueryDto = {}) {
    const rows = await this.adCampaignListBuilder(admin, query).take(10000).getMany();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("广告投放");
    sheet.columns = [
      { header: "ID", key: "id", width: 10 }, { header: "商家", key: "tenant", width: 24 }, { header: "计划名称", key: "name", width: 28 },
      { header: "前台标题", key: "title", width: 28 }, { header: "广告主", key: "advertiser", width: 24 }, { header: "合同", key: "contract", width: 20 },
      { header: "来源", key: "source", width: 18 }, { header: "形式", key: "format", width: 20 }, { header: "广告位", key: "slotKey", width: 24 },
      { header: "计费", key: "billingModel", width: 14 }, { header: "总预算", key: "totalBudget", width: 14 }, { header: "曝光", key: "impressions", width: 12 },
      { header: "点击", key: "clicks", width: 12 }, { header: "消耗", key: "spentAmount", width: 14 }, { header: "状态", key: "enabled", width: 12 },
      { header: "开始时间", key: "startAt", width: 22 }, { header: "结束时间", key: "endAt", width: 22 }
    ];
    rows.forEach((row) => sheet.addRow({ id: row.id, tenant: row.tenant?.name || "平台", name: row.name, title: row.title, advertiser: row.advertiser?.companyName || "", contract: row.contract?.contractNo || "", source: row.source, format: row.format, slotKey: row.slotKey, billingModel: row.billingModel, totalBudget: Number(row.totalBudget || 0), impressions: row.impressionCount || 0, clicks: row.clickCount || 0, spentAmount: Number(row.spentAmount || 0), enabled: row.enabled ? "投放中" : "已停用", startAt: this.exportDate(row.startAt), endAt: this.exportDate(row.endAt) }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    await this.logExport(admin, "ad_campaigns", rows.length, query);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async adCampaignSummary(admin?: AdminContext, query: AdCenterQueryDto = {}) {
    const startDate = query.startDate ? this.normalizeDateText(query.startDate, "统计开始日期") : undefined;
    const endDate = query.endDate ? this.normalizeDateText(query.endDate, "统计结束日期") : undefined;
    if (startDate && endDate && startDate > endDate) throw new BadRequestException("统计结束日期不能早于开始日期");
    const statsBuilder = this.adDailyStats.createQueryBuilder("stat").leftJoin("stat.tenant", "tenant").leftJoin("stat.advertiser", "advertiser").leftJoin("stat.campaign", "campaign").select(["stat.id", "stat.impressionCount", "stat.clickCount", "stat.skipCount", "stat.closeCount", "stat.loadCount", "stat.errorCount", "stat.rewardCount", "stat.spentAmount", "tenant.id", "tenant.code", "tenant.name", "advertiser.id", "advertiser.companyName", "campaign.id", "campaign.name"]);
    this.applyTenantScope(statsBuilder, "stat", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) statsBuilder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });
    if (startDate) statsBuilder.andWhere("stat.statDate >= :startDate", { startDate });
    if (endDate) statsBuilder.andWhere("stat.statDate <= :endDate", { endDate });
    const stats = await statsBuilder.getMany();
    const officialBuilder = this.adOfficialRevenueImports.createQueryBuilder("revenue").leftJoin("revenue.tenant", "tenant").select(["revenue.id", "revenue.importDate", "revenue.revenueAmount", "revenue.impressionCount", "revenue.clickCount", "revenue.ecpm", "revenue.fileUrl", "revenue.remark", "revenue.createdAt", "tenant.id", "tenant.code", "tenant.name", "tenant.enabled"]);
    this.applyTenantScope(officialBuilder, "revenue", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) officialBuilder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });
    if (startDate) officialBuilder.andWhere("revenue.importDate >= :startDate", { startDate });
    if (endDate) officialBuilder.andWhere("revenue.importDate <= :endDate", { endDate });
    officialBuilder.orderBy("revenue.importDate", "DESC").addOrderBy("revenue.id", "DESC").take(1000);
    const officialRows = await officialBuilder.getMany();
    const totals = this.adStatsTotals(stats);
    const officialRevenue = officialRows.reduce((sum, row) => sum + this.money(row.revenueAmount), 0);
    const byAdvertiser = new Map<string, { advertiserName: string; impressions: number; clicks: number; amount: number }>();
    for (const row of stats) {
      const key = row.advertiser?.id ? String(row.advertiser.id) : "none";
      const current = byAdvertiser.get(key) || { advertiserName: row.advertiser?.companyName || "未绑定广告主", impressions: 0, clicks: 0, amount: 0 };
      current.impressions += row.impressionCount || 0;
      current.clicks += row.clickCount || 0;
      current.amount += this.money(row.spentAmount);
      byAdvertiser.set(key, current);
    }
    return {
      totals: {
        ...totals,
        officialRevenue: this.roundMoney(officialRevenue),
        totalRevenue: this.roundMoney(totals.amount + officialRevenue),
        ctr: totals.impressions ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0
      },
      byAdvertiser: Array.from(byAdvertiser.values()).sort((a, b) => b.amount - a.amount),
      officialRevenueImports: officialRows.slice(0, 30).map((row) => this.publicAdOfficialRevenue(row, this.hasAdPermission(admin, "ad_center.sensitive")))
    };
  }

  async listAdSettlements(admin?: AdminContext, query: AdCenterQueryDto = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.adSettlementListBuilder(admin, query).skip((page - 1) * pageSize).take(pageSize);
    const [rows, total] = await builder.getManyAndCount();
    const ids = rows.map((row) => row.id);
    const items = ids.length ? await this.adSettlementItems.createQueryBuilder("item").leftJoin("item.settlement", "settlement").leftJoin("item.campaign", "campaign").select(["item.id", "item.description", "item.billingModel", "item.quantity", "item.unitPrice", "item.amount", "item.createdAt", "settlement.id", "campaign.id", "campaign.name"]).where("settlement.id IN (:...ids)", { ids }).orderBy("item.id", "ASC").getMany() : [];
    const grouped = new Map<number, AdSettlementItem[]>();
    for (const item of items) {
      const key = item.settlement.id;
      grouped.set(key, [...(grouped.get(key) || []), item]);
    }
    return { items: rows.map((row) => this.publicAdSettlement(row, grouped.get(row.id) || [])), total, page, pageSize };
  }

  private adSettlementListBuilder(admin?: AdminContext, query: AdCenterQueryDto = {}) {
    const builder = this.adSettlements.createQueryBuilder("settlement").leftJoin("settlement.tenant", "tenant").leftJoin("settlement.advertiser", "advertiser").leftJoin("settlement.contract", "contract").select(["settlement.id", "settlement.settlementNo", "settlement.periodStart", "settlement.periodEnd", "settlement.billingModel", "settlement.amount", "settlement.status", "settlement.remark", "settlement.createdAt", "settlement.updatedAt", "tenant.id", "tenant.code", "tenant.name", "tenant.enabled", "advertiser.id", "advertiser.companyName", "contract.id", "contract.contractNo", "contract.title", "contract.billingModel"]).orderBy("settlement.createdAt", "DESC").addOrderBy("settlement.id", "DESC");
    this.applyTenantScope(builder, "settlement", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("settlement.tenantId = :tenantId", { tenantId: query.tenantId });
    if (query.contractId) builder.andWhere("settlement.contractId = :contractId", { contractId: query.contractId });
    if (query.advertiserId) builder.andWhere("settlement.advertiserId = :advertiserId", { advertiserId: query.advertiserId });
    if (query.status) builder.andWhere("settlement.status = :status", { status: query.status });
    return builder;
  }

  async generateAdSettlement(dto: AdSettlementGenerateDto, admin?: AdminContext) {
    const periodStart = this.normalizeDateText(dto.periodStart, "结算开始日期");
    const periodEnd = this.normalizeDateText(dto.periodEnd, "结算结束日期");
    if (periodStart > periodEnd) throw new BadRequestException("结算结束日期不能早于开始日期");
    const result = await this.dataSource.transaction(async (manager) => {
      const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin, manager.getRepository(Tenant));
      this.assertTenantSubscriptionWritable(tenant, admin);
      const contractRepository = manager.getRepository(AdContract);
      const contract = dto.contractId ? await contractRepository.createQueryBuilder("contract").leftJoinAndSelect("contract.tenant", "tenant").leftJoinAndSelect("contract.advertiser", "advertiser").where("contract.id = :id", { id: dto.contractId }).setLock("pessimistic_write").getOne() : null;
      if (!contract) throw new BadRequestException("请选择要结算的广告合同");
      this.assertTenantAccess(contract, admin);
      this.assertAdTenantMatches(contract.tenant, tenant, "广告合同不属于当前结算商家");
      const settlementRepository = manager.getRepository(AdSettlement);
      const existing = await settlementRepository.createQueryBuilder("settlement").where("settlement.contractId = :contractId", { contractId: contract.id }).andWhere("settlement.periodStart = :periodStart", { periodStart }).andWhere("settlement.periodEnd = :periodEnd", { periodEnd }).andWhere("settlement.status != :voided", { voided: "voided" }).setLock("pessimistic_write").getOne();
      if (existing) throw new BadRequestException(`该合同在 ${periodStart} 至 ${periodEnd} 已存在结算单 ${existing.settlementNo}`);
      const campaigns = await manager.getRepository(AdCampaign).find({ where: { contract: { id: contract.id } }, order: { id: "ASC" } });
      const stats = await manager.getRepository(AdDailyStat).createQueryBuilder("stat").leftJoinAndSelect("stat.campaign", "campaign").where("stat.contractId = :contractId", { contractId: contract.id }).andWhere("stat.statDate >= :periodStart AND stat.statDate <= :periodEnd", { periodStart, periodEnd }).getMany();
      const items = this.buildAdSettlementItems(contract, campaigns, stats);
      const amount = this.roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
      const settlement = await settlementRepository.save(settlementRepository.create({ tenant, advertiser: contract.advertiser, contract, settlementNo: `AD${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}${uuidv4().replace(/-/g, "").slice(0, 8).toUpperCase()}`, periodStart, periodEnd, billingModel: contract.billingModel, amount: amount.toFixed(2), status: "pending", remark: this.nullableText(dto.remark) }));
      const itemRepository = manager.getRepository(AdSettlementItem);
      const savedItems = await itemRepository.save(items.map((item) => itemRepository.create({ settlement, campaign: item.campaign, description: item.description, billingModel: item.billingModel, quantity: item.quantity.toFixed(2), unitPrice: item.unitPrice.toFixed(4), amount: item.amount.toFixed(2) })));
      return { settlement, savedItems, contract };
    });
    const { settlement, savedItems, contract } = result;
    await this.logOperation(this.operationActorForTenant(admin, settlement.tenant), "ad.settlement.generate", "ad_settlement", settlement.id, `生成广告结算单：${settlement.settlementNo}`, { tenantId: settlement.tenant?.id || null, contractId: contract.id, amount: settlement.amount });
    return this.publicAdSettlement(settlement, savedItems);
  }

  async updateAdSettlementStatus(id: number, dto: AdSettlementStatusDto, admin?: AdminContext) {
    const result = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AdSettlement);
      const row = await repository.createQueryBuilder("settlement").leftJoinAndSelect("settlement.tenant", "tenant").leftJoinAndSelect("settlement.advertiser", "advertiser").leftJoinAndSelect("settlement.contract", "contract").where("settlement.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!row) throw new NotFoundException("广告结算单不存在");
      this.assertTenantAccess(row, admin);
      this.assertTenantSubscriptionWritable(row.tenant, admin);
      const next = dto.status;
      if (row.status === next) return { saved: row, beforeStatus: row.status, unchanged: true };
      const transitions: Record<string, string[]> = { pending: ["confirmed", "voided"], confirmed: ["invoiced", "voided"], invoiced: ["paid", "voided"], paid: [], voided: [] };
      if (!(transitions[row.status] || []).includes(next)) throw new BadRequestException(`结算单状态不能从 ${row.status} 变更为 ${next}`);
      const beforeStatus = row.status;
      row.status = next;
      return { saved: await repository.save(row), beforeStatus, unchanged: false };
    });
    if (!result.unchanged) await this.logOperation(this.operationActorForTenant(admin, result.saved.tenant), "ad.settlement.status", "ad_settlement", result.saved.id, `更新广告结算单状态：${result.saved.settlementNo}`, { tenantId: result.saved.tenant?.id || null, beforeStatus: result.beforeStatus, status: result.saved.status });
    return this.publicAdSettlement(result.saved, []);
  }

  async importAdOfficialRevenue(dto: AdOfficialRevenueImportDto, admin?: AdminContext) {
    const importDate = this.normalizeDateText(dto.importDate, "导入日期");
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    let lockKey = "";
    let lockAcquired = false;
    let saved: AdOfficialRevenueImport;
    try {
      await queryRunner.startTransaction();
      const tenant = await this.resolveAnnouncementTenant(dto.tenantId, undefined, admin, queryRunner.manager.getRepository(Tenant));
      this.assertTenantSubscriptionWritable(tenant, admin);
      lockKey = `ad-official-revenue:${tenant?.id || "platform"}:${importDate}`;
      const lockRows = await queryRunner.query("SELECT GET_LOCK(?, 5) AS acquired", [lockKey]);
      if (Number(lockRows?.[0]?.acquired || 0) !== 1) throw new BadRequestException("同日收益导入正在处理中，请稍后重试");
      lockAcquired = true;
      const repository = queryRunner.manager.getRepository(AdOfficialRevenueImport);
      const existingBuilder = repository.createQueryBuilder("revenue").where("revenue.importDate = :importDate", { importDate });
      if (tenant) existingBuilder.andWhere("revenue.tenantId = :tenantId", { tenantId: tenant.id });
      else existingBuilder.andWhere("revenue.tenantId IS NULL");
      existingBuilder.setLock("pessimistic_write");
      const existing = await existingBuilder.getOne();
      if (existing) throw new BadRequestException(`该商家 ${importDate} 的官方收益已经导入`);
      saved = await repository.save(repository.create({ tenant, importDate, revenueAmount: this.roundMoney(dto.revenueAmount || 0).toFixed(2), impressionCount: Number(dto.impressionCount || 0), clickCount: Number(dto.clickCount || 0), ecpm: this.roundMoney(dto.ecpm || 0, 4).toFixed(4), fileUrl: this.normalizeAdAssetUrl(dto.fileUrl, "收益导入附件"), remark: this.nullableText(dto.remark) }));
      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      if (lockAcquired) await queryRunner.query("SELECT RELEASE_LOCK(?)", [lockKey]);
      await queryRunner.release();
    }
    await this.logOperation(this.operationActorForTenant(admin, saved.tenant), "ad.official_revenue.import", "ad_official_revenue_import", saved.id, `导入官方流量主收益：${saved.importDate}`, { tenantId: saved.tenant?.id || null, revenueAmount: saved.revenueAmount });
    return this.publicAdOfficialRevenue(saved, this.hasAdPermission(admin, "ad_center.sensitive"));
  }

  async exportAdSettlements(admin?: AdminContext, query: AdCenterQueryDto = {}) {
    const rows = await this.adSettlementListBuilder(admin, query).take(10000).getMany();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("广告结算单");
    sheet.columns = [
      { header: "ID", key: "id", width: 10 }, { header: "结算单号", key: "settlementNo", width: 28 }, { header: "商家", key: "tenant", width: 24 },
      { header: "广告主", key: "advertiser", width: 24 }, { header: "合同", key: "contract", width: 20 }, { header: "开始日期", key: "periodStart", width: 14 },
      { header: "结束日期", key: "periodEnd", width: 14 }, { header: "计费模式", key: "billingModel", width: 14 }, { header: "金额", key: "amount", width: 14 },
      { header: "状态", key: "status", width: 14 }, { header: "生成时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) => sheet.addRow({ id: row.id, settlementNo: row.settlementNo, tenant: row.tenant?.name || "平台", advertiser: row.advertiser?.companyName || "", contract: row.contract?.contractNo || "", periodStart: row.periodStart, periodEnd: row.periodEnd, billingModel: row.billingModel, amount: Number(row.amount || 0), status: row.status, createdAt: this.exportDate(row.createdAt) }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    await this.logExport(admin, "ad_settlements", rows.length, query);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async listHomepageSections(admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const builder = this.homepageSections.createQueryBuilder("section").leftJoinAndSelect("section.tenant", "tenant").orderBy("section.sortOrder", "ASC").addOrderBy("section.id", "ASC");
    if (targetTenant) builder.andWhere("section.tenantId = :tenantId", { tenantId: targetTenant.id });
    else builder.andWhere("section.tenantId IS NULL");
    builder.andWhere("section.pageKey = :pageKey", { pageKey: normalizedPageKey });
    return builder.getMany();
  }

  async createHomepageSection(dto: HomepageSectionDto, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(dto.pageKey || pageKey);
    const section = this.homepageSections.create({
      tenant: targetTenant,
      pageKey: normalizedPageKey,
      type: this.normalizeHomepageType(dto.type),
      title: this.nullableText(dto.title),
      subtitle: this.nullableText(dto.subtitle),
      enabled: dto.enabled ?? true,
      sortOrder: dto.sortOrder ?? (await this.nextHomepageSortOrder(admin, targetTenant, normalizedPageKey)),
      config: this.normalizeJsonObject(dto.config, "config"),
      layout: this.normalizeJsonObject(dto.layout, "layout")
    });
    const saved = await this.homepageSections.save(section);
    await this.logOperation(admin, "homepage.section.create", "homepage_section", saved.id, `创建H5装修模块：${saved.type}`, { title: saved.title, pageKey: saved.pageKey });
    return saved;
  }

  async updateHomepageSection(id: number, dto: HomepageSectionDto, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(dto.pageKey || pageKey);
    const section = await this.homepageSections.findOneBy({ id });
    if (!section) throw new NotFoundException("首页模块不存");
    this.assertHomepageSectionScope(section, targetTenant, normalizedPageKey);
    section.pageKey = normalizedPageKey;
    if (dto.type !== undefined) section.type = this.normalizeHomepageType(dto.type);
    if (dto.title !== undefined) section.title = this.nullableText(dto.title);
    if (dto.subtitle !== undefined) section.subtitle = this.nullableText(dto.subtitle);
    if (dto.enabled !== undefined) section.enabled = dto.enabled;
    if (dto.sortOrder !== undefined) section.sortOrder = dto.sortOrder;
    if (dto.config !== undefined) section.config = this.normalizeJsonObject(dto.config, "config");
    if (dto.layout !== undefined) section.layout = this.normalizeJsonObject(dto.layout, "layout");
    const saved = await this.homepageSections.save(section);
    await this.logOperation(admin, "homepage.section.update", "homepage_section", saved.id, `更新H5装修模块：${saved.type}`, { title: saved.title, enabled: saved.enabled, pageKey: saved.pageKey });
    return saved;
  }

  async deleteHomepageSection(id: number, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    const section = await this.homepageSections.findOneBy({ id });
    if (!section) throw new NotFoundException("首页模块不存");
    this.assertHomepageSectionScope(section, targetTenant, normalizedPageKey);
    await this.homepageSections.delete(id);
    await this.logOperation(admin, "homepage.section.delete", "homepage_section", id, `删除H5装修模块：${section.type}`, { title: section.title, pageKey: section.pageKey });
    return { id, deleted: true };
  }

  async reorderHomepageSections(items: HomepageReorderItemDto[], admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    if (!items.length) return this.listHomepageSections(admin, tenantId, normalizedPageKey);
    const ids = items.map((item) => item.id);
    const builder = this.homepageSections.createQueryBuilder("section").where("section.id IN (:...ids)", { ids });
    if (targetTenant) builder.andWhere("section.tenantId = :tenantId", { tenantId: targetTenant.id });
    else builder.andWhere("section.tenantId IS NULL");
    builder.andWhere("section.pageKey = :pageKey", { pageKey: normalizedPageKey });
    const sections = await builder.getMany();
    if (sections.length !== ids.length) throw new BadRequestException("排序列表包含不存在的首页模块");
    const orderMap = new Map(items.map((item) => [item.id, item.sortOrder]));
    for (const section of sections) section.sortOrder = orderMap.get(section.id) ?? section.sortOrder;
    await this.homepageSections.save(sections);
    await this.logOperation(admin, "homepage.section.reorder", "homepage_section", null, "调整H5装修模块排序", { items, pageKey: normalizedPageKey });
    return this.listHomepageSections(admin, tenantId, normalizedPageKey);
  }

  async resetHomepageSections(admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    return this.replaceHomepageSectionsFromSnapshot(admin, targetTenant, normalizedPageKey, defaultHomepageSections(normalizedPageKey), "homepage.section.reset_default", "恢复默认H5装修配置", "homepage_section", null);
  }

  async replaceHomepageSections(rows: any[], admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    return this.replaceHomepageSectionsFromSnapshot(admin, targetTenant, normalizedPageKey, rows, "homepage.section.replace", "整页替换H5装修配置", "homepage_section", null);
  }

  async listHomepageDecorationVersions(admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const builder = this.homepageDecorationVersions.createQueryBuilder("version").leftJoinAndSelect("version.tenant", "tenant").where("version.pageKey = :pageKey", { pageKey: normalizedPageKey }).orderBy("version.createdAt", "DESC").addOrderBy("version.id", "DESC").take(30);
    if (targetTenant) builder.andWhere("version.tenantId = :tenantId", { tenantId: targetTenant.id });
    else builder.andWhere("version.tenantId IS NULL");
    return builder.getMany();
  }

  async createHomepageDecorationVersion(dto: HomepageDecorationVersionDto, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    const sections = await this.snapshotHomepageSections(targetTenant, normalizedPageKey);
    const saved = await this.homepageDecorationVersions.save(this.homepageDecorationVersions.create({
      tenant: targetTenant,
      pageKey: normalizedPageKey,
      name: this.nullableText(dto.name),
      note: this.nullableText(dto.note),
      sections,
      sectionCount: sections.length,
      createdById: admin?.id || null,
      createdByName: this.actorName(admin)
    }));
    await this.logOperation(admin, "homepage.version.create", "homepage_decoration_version", saved.id, "保存前台装修版本", { pageKey: normalizedPageKey, tenantId: targetTenant?.id || null, sectionCount: saved.sectionCount, note: saved.note });
    return saved;
  }

  async restoreHomepageDecorationVersion(id: number, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    const version = await this.homepageDecorationVersions.findOne({ where: { id } });
    if (!version) throw new NotFoundException("装修版本不存在");
    this.assertHomepageDecorationScope(version, targetTenant, normalizedPageKey, "装修版本");
    const saved = await this.replaceHomepageSectionsFromSnapshot(admin, targetTenant, normalizedPageKey, version.sections || [], "homepage.version.restore", "恢复前台装修版本", "homepage_decoration_version", version.id);
    return saved;
  }

  async deleteHomepageDecorationVersion(id: number, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const version = await this.homepageDecorationVersions.findOne({ where: { id } });
    if (!version) throw new NotFoundException("装修版本不存在");
    this.assertHomepageDecorationScope(version, targetTenant, normalizedPageKey, "装修版本");
    await this.homepageDecorationVersions.delete(id);
    await this.logOperation(admin, "homepage.version.delete", "homepage_decoration_version", id, "删除前台装修版本", { pageKey: normalizedPageKey, tenantId: targetTenant?.id || null });
    return { id, deleted: true };
  }

  async listHomepageDecorationTemplates(admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const builder = this.homepageDecorationTemplates.createQueryBuilder("template").leftJoinAndSelect("template.tenant", "tenant").where("template.pageKey = :pageKey", { pageKey: normalizedPageKey }).orderBy("template.updatedAt", "DESC").addOrderBy("template.id", "DESC").take(80);
    if (targetTenant) builder.andWhere("(template.tenantId IS NULL OR template.tenantId = :tenantId)", { tenantId: targetTenant.id });
    else builder.andWhere("template.tenantId IS NULL");
    return builder.getMany();
  }

  async createHomepageDecorationTemplate(dto: HomepageDecorationTemplateDto, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    const sections = await this.snapshotHomepageSections(targetTenant, normalizedPageKey);
    if (!sections.length) throw new BadRequestException("当前页面没有可保存为模板的模块");
    const saved = await this.homepageDecorationTemplates.save(this.homepageDecorationTemplates.create({
      tenant: targetTenant,
      pageKey: normalizedPageKey,
      name: dto.name.trim(),
      category: this.nullableText(dto.category),
      description: this.nullableText(dto.description),
      sections,
      sectionCount: sections.length,
      createdById: admin?.id || null,
      createdByName: this.actorName(admin)
    }));
    await this.logOperation(admin, "homepage.template.create", "homepage_decoration_template", saved.id, `保存前台装修模板：${saved.name}`, { pageKey: normalizedPageKey, tenantId: targetTenant?.id || null, sectionCount: saved.sectionCount });
    return saved;
  }

  async applyHomepageDecorationTemplate(id: number, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey);
    const template = await this.homepageDecorationTemplates.findOne({ where: { id } });
    if (!template) throw new NotFoundException("装修模板不存在");
    this.assertHomepageTemplateReadable(template, targetTenant, normalizedPageKey);
    const saved = await this.replaceHomepageSectionsFromSnapshot(admin, targetTenant, normalizedPageKey, template.sections || [], "homepage.template.apply", `应用前台装修模板：${template.name}`, "homepage_decoration_template", template.id);
    return saved;
  }

  async deleteHomepageDecorationTemplate(id: number, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId);
    const normalizedPageKey = normalizePageKey(pageKey);
    const template = await this.homepageDecorationTemplates.findOne({ where: { id } });
    if (!template) throw new NotFoundException("装修模板不存在");
    if ((template.pageKey || "home") !== normalizedPageKey) throw new NotFoundException("装修模板不属于当前页面");
    if (template.tenant?.id) {
      if (this.isTenantScoped(admin) && template.tenant.id !== targetTenant?.id) throw new NotFoundException("装修模板不属于当前商家");
    } else if (!this.isPlatformAdmin(admin)) {
      throw new ForbiddenException("平台模板只能由平台超管删除");
    }
    await this.homepageDecorationTemplates.delete(id);
    await this.logOperation(admin, "homepage.template.delete", "homepage_decoration_template", id, `删除前台装修模板：${template.name}`, { pageKey: normalizedPageKey, tenantId: template.tenant?.id || null });
    return { id, deleted: true };
  }

  async createCategory(dto: CategoryDto, admin?: AdminContext) {
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : null;
    this.assertTenantSubscriptionWritable(tenant, admin);
    const saved = await this.categories.save(this.categories.create({ ...this.normalizeCategoryDto(dto), tenant: this.tenantRelation(admin) }));
    await this.logOperation(admin, "category.create", "activity_category", saved.id, `创建活动分类：${saved.name}`, this.categoryAuditSnapshot(saved));
    return this.publicCategory(saved);
  }

  async updateCategory(id: number, dto: CategoryDto, admin?: AdminContext) {
    const category = await this.categories.findOne({ where: { id }, relations: ["tenant"] });
    if (this.isTenantScoped(admin) && category?.tenant?.id !== admin?.tenantId) throw new NotFoundException("分类不存在或不在当前商家");
    this.assertTenantAccess(category, admin);
    if (!category) throw new NotFoundException("分类不存");
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : category.tenant;
    this.assertTenantSubscriptionWritable(tenant, admin);
    const before = this.categoryAuditSnapshot(category);
    Object.assign(category, this.normalizeCategoryDto(dto));
    category.tenant = this.tenantRelation(admin, category.tenant);
    const saved = await this.categories.save(category);
    await this.logOperation(admin, "category.update", "activity_category", saved.id, `更新活动分类：${saved.name}`, auditDiff(before, this.categoryAuditSnapshot(saved)));
    return this.publicCategory(saved);
  }

  async orderTimeline(orderId: number, admin?: AdminContext) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存在");
    this.assertTenantAccess(order, admin);
    const [transactions, refunds, charityTransactions, logs] = await Promise.all([
      this.paymentTransactions.find({ where: { order: { id: order.id } }, order: { createdAt: "ASC" } }),
      this.refunds.find({ where: { order: { id: order.id } }, order: { createdAt: "ASC" } }),
      this.charityTransactionsRepo.find({ where: { order: { id: order.id } }, order: { createdAt: "ASC" } }),
      this.operationLogs.find({ where: { targetType: "order", targetId: String(order.id) }, order: { createdAt: "ASC" }, take: 100 })
    ]);
    const events: Array<{ type: string; title: string; time: Date | null; level: "primary" | "success" | "warning" | "danger" | "info"; detail?: string | null; payload?: Record<string, unknown> }> = [];
    const add = (event: (typeof events)[number]) => events.push(event);
    add({ type: "order_created", title: "创建订单", time: order.createdAt, level: "primary", detail: `${order.orderNo} / ${this.paymentMethodLabel(order.paymentMethod)}`, payload: { amount: order.amount, status: order.status } });
    add({ type: "registration_submitted", title: "提交报名", time: order.registration?.createdAt || order.createdAt, level: "info", detail: order.registration?.activity?.title || null, payload: { registrationStatus: order.registration?.status } });
    if (order.expiresAt) add({ type: "payment_deadline", title: "付款截止", time: order.expiresAt, level: order.status === OrderStatus.PendingPayment ? "warning" : "info", detail: "线下/线上待付款订单到期时间" });
    for (const transaction of transactions) {
      add({ type: "payment_transaction", title: transaction.status === "success" ? "支付成功" : "支付流水", time: transaction.createdAt, level: transaction.status === "success" ? "success" : "warning", detail: `${transaction.provider} / ${transaction.amount} 元`, payload: { transactionNo: transaction.transactionNo, reconciliationStatus: transaction.reconciliationStatus } });
    }
    if (order.paidAt) add({ type: "order_paid", title: order.paidByAdmin ? "后台确认收款" : "订单已支付", time: order.paidAt, level: "success", detail: order.paidByAdmin ? `${order.paidByAdmin}${order.paidRemark ? `：${order.paidRemark}` : ""}` : null });
    if (order.closedAt) add({ type: "order_closed", title: "订单关闭", time: order.closedAt, level: "danger", detail: order.closeReason });
    for (const refund of refunds) {
      add({ type: "refund", title: `退款${refund.status}`, time: refund.completedAt || refund.reviewedAt || refund.createdAt, level: refund.status === "completed" ? "success" : refund.status === "rejected" ? "danger" : "warning", detail: `${refund.amount} 元${refund.reason ? ` / ${refund.reason}` : ""}`, payload: { refundNo: refund.refundNo, reviewedBy: refund.reviewedBy } });
    }
    for (const tx of charityTransactions) {
      add({ type: "charity", title: tx.type === "charity_reversal" ? "公益金冲回" : tx.type === "charity_retention" ? "退款保留公益计提" : tx.type === "project_disbursement" ? "公益拨付" : "公益金计提", time: tx.createdAt, level: tx.direction === "credit" ? "success" : "warning", detail: `${tx.amount} 元${tx.remark ? ` / ${tx.remark}` : ""}`, payload: { retainedOnRefund: tx.retainedOnRefund, ratePercent: tx.ratePercent } });
    }
    for (const log of logs) {
      add({ type: "operation_log", title: log.action, time: log.createdAt, level: "info", detail: log.summary || null, payload: log.detail || undefined });
    }
    return events
      .filter((event) => event.time)
      .sort((a, b) => new Date(a.time as Date).getTime() - new Date(b.time as Date).getTime())
      .map((event) => ({ ...event, time: event.time?.toISOString() || null }));
  }

  async removeCategory(id: number, admin?: AdminContext) {
    const category = await this.categories.findOne({ where: { id }, relations: ["tenant"] });
    if (this.isTenantScoped(admin) && category?.tenant?.id !== admin?.tenantId) throw new NotFoundException("分类不存在或不在当前商家");
    this.assertTenantAccess(category, admin);
    if (!category) throw new NotFoundException("分类不存");
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : category.tenant;
    this.assertTenantSubscriptionWritable(tenant, admin);
    category.enabled = false;
    const saved = await this.categories.save(category);
    await this.logOperation(admin, "category.disable", "activity_category", saved.id, `停用活动分类：${saved.name}`, { enabled: false, tenantId: saved.tenant?.id || null });
    return this.publicCategory(saved);
  }

  listAgents(includeDisabled = false, admin?: AdminContext, tenantId?: number) {
    if (!this.isTenantScoped(admin)) this.assertPlatformAdmin(admin);
    const builder = this.agents.createQueryBuilder("agent").leftJoinAndSelect("agent.tenant", "tenant").leftJoinAndSelect("agent.parentAgent", "parentAgent").orderBy("agent.id", "DESC");
    this.applyTenantScope(builder, "agent", admin);
    if (!this.isTenantScoped(admin) && tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId });
    if (!includeDisabled) builder.andWhere("agent.enabled = :enabled", { enabled: true });
    return builder.getMany();
  }

  async paymentAccountOptions(admin?: AdminContext) {
    this.assertPaymentAccountPermission(admin, "payment_account.view");
    const builder = this.tenants.createQueryBuilder("tenant").orderBy("tenant.name", "ASC").addOrderBy("tenant.id", "ASC");
    if (this.isTenantScoped(admin)) builder.where("tenant.id = :tenantId", { tenantId: admin?.tenantId });
    const tenants = await builder.getMany();
    return {
      tenants: tenants.map((tenant) => this.publicPaymentAccountTenant(tenant)),
      providers: [
        { value: PaymentMethod.Wechat, label: "微信支付" },
        { value: PaymentMethod.Alipay, label: "支付宝" }
      ]
    };
  }

  async listPaymentAccountAgents(query: PaymentAccountQueryDto = {}, admin?: AdminContext) {
    this.assertPaymentAccountPermission(admin, "payment_account.view");
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.agents.createQueryBuilder("agent").leftJoinAndSelect("agent.tenant", "tenant").leftJoinAndSelect("agent.parentAgent", "parentAgent").orderBy("agent.id", "DESC");
    if (this.isTenantScoped(admin)) builder.andWhere("tenant.id = :tenantId", { tenantId: admin?.tenantId });
    else if (query.tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });
    if (query.includeDisabled !== "true") builder.andWhere("agent.enabled = :enabled", { enabled: true });
    const keyword = query.keyword?.trim();
    if (keyword) builder.andWhere("(agent.name LIKE :keyword OR agent.region LIKE :keyword OR agent.contactName LIKE :keyword OR agent.contactPhone LIKE :keyword)", { keyword: `%${keyword}%` });
    const countBuilder = builder.clone();
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const includeSensitive = this.hasPaymentAccountPermission(admin, "payment_account.sensitive");
    if (includeSensitive) await this.logOperation(admin, "payment_account.sensitive.view", "agent", null, `查看收款代理敏感资料：${rows.length} 条`, { rowCount: rows.length, tenantId: query.tenantId || admin?.tenantId || null, keyword: keyword || null });
    const enabled = query.includeDisabled === "true" ? await countBuilder.andWhere("agent.enabled = :summaryEnabled", { summaryEnabled: true }).getCount() : total;
    return { items: rows.map((row) => this.publicPaymentAccountAgent(row, includeSensitive)), total, page, pageSize, summary: { enabled } };
  }

  async saveAgent(dto: AgentDto, id?: number, admin?: AdminContext) {
    this.assertPaymentAccountPermission(admin, "payment_account.manage");
    await this.assertPaymentAccountEditable(admin);
    this.assertAgentSettlementConfig(dto.settlementConfig);
    const includeSensitive = this.hasPaymentAccountPermission(admin, "payment_account.sensitive");
    const saved = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Agent);
      const tenantRepository = manager.getRepository(Tenant);
      const agent = id
        ? await repository.createQueryBuilder("agent").leftJoinAndSelect("agent.tenant", "tenant").leftJoinAndSelect("agent.parentAgent", "parentAgent").setLock("pessimistic_write").where("agent.id = :id", { id }).getOne()
        : repository.create();
      if (!agent) throw new NotFoundException("代理不存在");
      if (id) this.assertTenantAccess(agent, admin);
      const tenant = await this.resolveAgentTenant(dto.tenantId, agent.tenant, admin, tenantRepository);
      if (id && agent.tenant?.id && tenant?.id !== agent.tenant.id) throw new BadRequestException("已存在的代理不能迁移到其他商家");
      const parentAgent = dto.parentAgentId ? await repository.findOne({ where: { id: Number(dto.parentAgentId) }, relations: ["tenant", "parentAgent"] }) : null;
      if (dto.parentAgentId && !parentAgent) throw new NotFoundException("上级代理不存在");
      if (parentAgent) {
        this.assertTenantAccess(parentAgent, admin);
        if (id && parentAgent.id === id) throw new BadRequestException("上级代理不能选择自己");
        if ((parentAgent.tenant?.id || null) !== (tenant?.id || agent.tenant?.id || null)) throw new BadRequestException("上级代理必须属于同一商家");
        let cursor: Agent | null = parentAgent;
        const visited = new Set<number>();
        while (cursor && !visited.has(cursor.id)) {
          if (id && cursor.id === id) throw new BadRequestException("代理层级不能形成循环");
          visited.add(cursor.id);
          cursor = cursor.parentAgent?.id ? await repository.findOne({ where: { id: cursor.parentAgent.id }, relations: ["parentAgent"] }) : null;
        }
      }
      Object.assign(agent, {
        name: dto.name.trim(),
        tenant: this.tenantRelation(admin, tenant || agent.tenant),
        parentAgent,
        region: dto.region?.trim() || null,
        contactName: dto.contactName?.trim() || null,
        contactPhone: includeSensitive ? dto.contactPhone?.trim() || null : id ? agent.contactPhone : null,
        enabled: dto.enabled ?? true,
        settlementConfig: dto.settlementConfig === undefined ? agent.settlementConfig || null : dto.settlementConfig
      });
      return repository.save(agent);
    });
    await this.logOperation(admin, id ? "agent.update" : "agent.create", "agent", saved.id, id ? `更新代理：${saved.name}` : `创建代理：${saved.name}`, { region: saved.region, enabled: saved.enabled, parentAgentId: saved.parentAgent?.id || null });
    return this.publicPaymentAccountAgent(saved, includeSensitive);
  }

  async listAgentPaymentAccounts(query: PaymentAccountQueryDto = {}, admin?: AdminContext) {
    this.assertPaymentAccountPermission(admin, "payment_account.view");
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.agentPaymentAccounts
      .createQueryBuilder("account")
      .leftJoinAndSelect("account.agent", "agent")
      .leftJoinAndSelect("account.tenant", "tenant")
      .leftJoinAndSelect("agent.tenant", "agentTenant")
      .orderBy("account.id", "DESC");
    if (this.isTenantScoped(admin)) builder.andWhere("(tenant.id = :tenantId OR (tenant.id IS NULL AND agentTenant.id = :tenantId))", { tenantId: admin?.tenantId });
    else if (query.tenantId) builder.andWhere("(tenant.id = :tenantId OR (tenant.id IS NULL AND agentTenant.id = :tenantId))", { tenantId: query.tenantId });
    if (query.agentId) builder.andWhere("agent.id = :agentId", { agentId: query.agentId });
    if (query.provider) builder.andWhere("account.provider = :provider", { provider: query.provider });
    if (query.includeDisabled !== "true") builder.andWhere("account.enabled = :enabled", { enabled: true });
    const keyword = query.keyword?.trim();
    if (keyword) builder.andWhere("(agent.name LIKE :keyword OR account.merchantName LIKE :keyword OR account.merchantNo LIKE :keyword)", { keyword: `%${keyword}%` });
    const countBuilder = builder.clone();
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const includeSensitive = this.hasPaymentAccountPermission(admin, "payment_account.sensitive");
    const includeConfig = this.hasPaymentAccountPermission(admin, "payment_account.manage");
    if (includeSensitive) await this.logOperation(admin, "payment_account.sensitive.view", "agent_payment_account", null, `查看收款账户敏感资料：${rows.length} 条`, { rowCount: rows.length, tenantId: query.tenantId || admin?.tenantId || null, agentId: query.agentId || null });
    const enabled = query.includeDisabled === "true" ? await countBuilder.andWhere("account.enabled = :summaryEnabled", { summaryEnabled: true }).getCount() : total;
    return { items: rows.map((row) => this.publicAgentPaymentAccount(row, includeSensitive, includeConfig)), total, page, pageSize, summary: { enabled } };
  }

  async saveAgentPaymentAccount(dto: AgentPaymentAccountDto, id?: number, admin?: AdminContext) {
    this.assertPaymentAccountPermission(admin, "payment_account.manage");
    await this.assertPaymentAccountEditable(admin);
    this.assertPaymentConfig(dto.config);
    const includeSensitive = this.hasPaymentAccountPermission(admin, "payment_account.sensitive");
    let saved: AgentPaymentAccount;
    try {
      saved = await this.withPaymentAccountNamedLock(`agent-payment-account:${dto.agentId}:${dto.provider}`, async (manager) => {
        const agentRepository = manager.getRepository(Agent);
        const repository = manager.getRepository(AgentPaymentAccount);
        const agent = await agentRepository.createQueryBuilder("agent").leftJoinAndSelect("agent.tenant", "tenant").setLock("pessimistic_write").where("agent.id = :id", { id: dto.agentId }).getOne();
        if (!agent) throw new NotFoundException("代理不存在");
        this.assertTenantAccess(agent, admin);
        const row = id
          ? await repository.createQueryBuilder("account").leftJoinAndSelect("account.agent", "currentAgent").leftJoinAndSelect("account.tenant", "tenant").setLock("pessimistic_write").where("account.id = :id", { id }).getOne()
          : repository.create();
        if (!row) throw new NotFoundException("代理支付账户不存在");
        if (id) this.assertTenantAccess(row, admin);
        if (id && row.agent?.id !== agent.id) throw new BadRequestException("已存在的支付账户不能迁移到其他代理");
        if (id && row.provider !== dto.provider) throw new BadRequestException("已存在的支付账户不能更换支付渠道");
        const enabled = dto.enabled ?? true;
        if (enabled) {
          const duplicate = await repository.createQueryBuilder("account").setLock("pessimistic_write").where("account.agentId = :agentId", { agentId: agent.id }).andWhere("account.provider = :provider", { provider: dto.provider }).andWhere("account.enabled = true").andWhere(id ? "account.id <> :id" : "1 = 1", id ? { id } : {}).getOne();
          if (duplicate) throw new BadRequestException("该代理已存在启用中的同渠道收款账户");
        }
        Object.assign(row, {
          agent,
          tenant: this.tenantRelation(admin, agent.tenant || row.tenant),
          provider: dto.provider,
          merchantName: dto.merchantName?.trim() || null,
          merchantNo: includeSensitive ? dto.merchantNo?.trim() || null : id ? row.merchantNo : null,
          enabled,
          config: dto.config === undefined ? row.config || null : this.mergeMaskedPaymentConfig(row.config, dto.config)
        });
        return repository.save(row);
      });
    } catch (error) {
      if (isDuplicateEntryError(error)) throw new BadRequestException("该代理已存在启用中的同渠道收款账户");
      throw error;
    }
    await this.logOperation(admin, id ? "agent_payment_account.update" : "agent_payment_account.create", "agent_payment_account", saved.id, id ? `更新代理支付账户：${saved.agent.name}` : `创建代理支付账户：${saved.agent.name}`, { agentId: saved.agent.id, provider: saved.provider, merchantNo: this.maskPaymentIdentifier(saved.merchantNo), enabled: saved.enabled, configKeys: Object.keys(saved.config || {}).sort() });
    return this.publicAgentPaymentAccount(saved, includeSensitive, true);
  }

  async listActivities(query: ActivityQueryDto = {}, admin?: AdminContext) {
    const pageSize = Math.min(Math.max(Number(query.pageSize || 0), 0), 100);
    const page = Math.max(Number(query.page || 1), 1);
    const builder = this.activities
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.category", "category")
      .leftJoinAndSelect("activity.agent", "agent")
      .leftJoinAndSelect("activity.tenant", "tenant")
      .leftJoinAndSelect("activity.minMemberLevel", "minMemberLevel")
      .leftJoinAndSelect("activity.priorityMemberLevel", "priorityMemberLevel")
      .orderBy("activity.createdAt", "DESC");

    this.applyTenantScope(builder, "activity", admin);
    if (query.keyword?.trim()) {
      builder.andWhere("(activity.title LIKE :keyword OR activity.location LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.status) builder.andWhere("activity.status = :status", { status: query.status });
    if (query.categoryId) builder.andWhere("category.id = :categoryId", { categoryId: query.categoryId });
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("tenant.id = :tenantId", { tenantId: query.tenantId });

    if (!pageSize) {
      const list = await builder.getMany();
      return Promise.all(list.map((activity) => this.withActivityStats(activity)));
    }

    const [list, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const items = await Promise.all(list.map((activity) => this.withActivityStats(activity)));
    const countBuilder = this.activities.createQueryBuilder("activity");
    this.applyTenantScope(countBuilder, "activity", admin);
    if (query.keyword?.trim()) {
      countBuilder.andWhere("(activity.title LIKE :keyword OR activity.location LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }
    if (query.categoryId) countBuilder.andWhere("activity.categoryId = :categoryId", { categoryId: query.categoryId });
    if (!this.isTenantScoped(admin) && query.tenantId) countBuilder.andWhere("activity.tenantId = :tenantId", { tenantId: query.tenantId });
    const statusCounts = await countBuilder.select("activity.status", "status").addSelect("COUNT(*)", "cnt").groupBy("activity.status").getRawMany();
    const counts: Record<string, number> = {};
    statusCounts.forEach((row: { status: string; cnt: string | number }) => {
      counts[row.status] = Number(row.cnt || 0);
    });
    return { items, total, page, pageSize, counts };
  }

  async activityManagementOptions(admin?: AdminContext) {
    const categoryBuilder = this.categories.createQueryBuilder("category").leftJoinAndSelect("category.tenant", "tenant").orderBy("category.sortOrder", "ASC").addOrderBy("category.id", "ASC");
    const agentBuilder = this.agents.createQueryBuilder("agent").leftJoinAndSelect("agent.tenant", "tenant").orderBy("agent.id", "DESC");
    this.applyActivityOptionScope(categoryBuilder, "category", admin);
    this.applyActivityOptionScope(agentBuilder, "agent", admin);
    const tenantPromise = this.isTenantScoped(admin)
      ? this.tenants.find({ where: { id: admin?.tenantId || 0 }, order: { id: "ASC" } })
      : this.tenants.find({ order: { id: "ASC" } });
    const [categories, agents, memberLevels, tenants] = await Promise.all([
      categoryBuilder.getMany(),
      agentBuilder.getMany(),
      this.memberLevelOptionRows(admin),
      tenantPromise
    ]);
    return {
      categories: categories.map((row) => this.publicCategory(row)),
      agents: agents.map((row) => ({ id: row.id, name: row.name, enabled: row.enabled, tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null })),
      memberLevels: memberLevels.map((row) => ({ id: row.id, name: row.name, enabled: row.enabled, tenantId: row.tenant?.id || null, tenantScopeKey: row.tenantScopeKey })),
      tenants: tenants.map((row) => ({ id: row.id, code: row.code, name: row.name, enabled: row.enabled, settings: { registrationReviewEnabled: this.tenantPermissions(row).registrationReviewEnabled } }))
    };
  }

  async getActivity(id: number, admin?: AdminContext) {
    const activity = await this.activities.findOne({ where: { id }, relations: ["fields"] });
    if (!activity) throw new NotFoundException("活动不存");
    this.assertActivityAccess(activity, admin);
    activity.fields = activity.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    const [hosts, sections] = await Promise.all([
      this.hosts.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } }),
      this.sections.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } })
    ]);
    return this.withActivityStats({ ...activity, hosts, sections } as any);
  }

  async listActivityApprovalLogs(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOne({ where: { id: activityId } });
    if (!activity) throw new NotFoundException("活动不存");
    this.assertActivityAccess(activity, admin);
    return this.activityApprovalLogs.find({
      where: { activity: { id: activityId } },
      order: { createdAt: "DESC" },
      take: 100
    });
  }

  async saveActivity(dto: ActivityDto, id?: number, admin?: AdminContext) {
    this.validateActivityDto(dto);
    this.assertActivityContentCompliance(dto);
    const category = dto.categoryId ? await this.categories.findOneBy({ id: dto.categoryId }) : null;
    if (dto.categoryId && !category) throw new BadRequestException("分类不存");
    this.assertTenantAccess(category, admin);
    const agent = dto.agentId ? await this.agents.findOneBy({ id: dto.agentId }) : null;
    if (dto.agentId && !agent) throw new BadRequestException("代理不存在");
    this.assertTenantAccess(agent, admin);
    const activity = id ? await this.activities.findOne({ where: { id }, relations: ["fields"] }) : this.activities.create();
    if (!activity) throw new NotFoundException("活动不存");
    this.assertActivityAccess(activity, admin);
    const before = id ? this.activityAuditSnapshot(activity) : null;
    const tenant = await this.resolveActivityTenant(admin, activity.tenant, dto.tenantId);
    this.assertTenantSubscriptionWritable(tenant, admin);
    const levelScopeKey = memberLevelScopeKey(tenant);
    const minMemberLevel = dto.minMemberLevelId ? await this.memberLevels.findOne({ where: { id: dto.minMemberLevelId, enabled: true, tenantScopeKey: levelScopeKey } }) : null;
    if (dto.minMemberLevelId && !minMemberLevel) throw new BadRequestException("会员等级不存在、已停用或不属于所选商家");
    const priorityMemberLevel = dto.priorityMemberLevelId ? await this.memberLevels.findOne({ where: { id: dto.priorityMemberLevelId, enabled: true, tenantScopeKey: levelScopeKey } }) : null;
    if (dto.priorityMemberLevelId && !priorityMemberLevel) throw new BadRequestException("优先报名会员等级不存在、已停用或不属于所选商家");
    if (category?.tenant?.id && category.tenant.id !== tenant?.id) throw new BadRequestException("活动分类不属于所选商家");
    if (agent?.tenant?.id && agent.tenant.id !== tenant?.id) throw new BadRequestException("所属代理不属于所选商家");
    if (tenant) {
      this.assertTenantFeature(tenant, "activities");
      if (!id) await this.assertTenantQuota(tenant, "activities", await this.activities.count({ where: { tenant: { id: tenant.id } } }));
    }
    const permissions = this.tenantPermissions(tenant);
    if (dto.requireReview && tenant && !permissions.registrationReviewEnabled) throw new BadRequestException("当前商家未开启报名审核权限");
    const fromStatus = id ? activity.status : null;
    const nextStatus = this.resolveActivitySaveStatus(dto.status, activity.status, permissions, admin);
    const scheduleOrLocationChanged = Boolean(id && (
      activity.startTime.getTime() !== this.parseDate(dto.startTime).getTime()
      || activity.endTime.getTime() !== this.parseDate(dto.endTime).getTime()
      || activity.location !== dto.location.trim()
    ));
    const fieldsChanged = id ? JSON.stringify((activity.fields || []).map((field) => ({ label: field.label, type: field.type, required: field.required, options: field.options || [], sortOrder: field.sortOrder }))) !== JSON.stringify(dto.fields.map((field) => ({ label: field.label.trim(), type: field.type, required: field.required, options: field.options || [], sortOrder: field.sortOrder }))) : false;

    Object.assign(activity, { title: dto.title.trim(), tenant: tenant || this.tenantRelation(admin, activity.tenant), coverUrl: dto.coverUrl || null, shareTitle: dto.shareTitle?.trim() || null, shareDescription: dto.shareDescription?.trim() || null, shareImageUrl: dto.shareImageUrl?.trim() || null, description: dto.description.trim(), notice: dto.notice?.trim() || null, location: dto.location.trim(), locationProvince: dto.locationProvince?.trim() || null, locationCity: dto.locationCity?.trim() || null, locationDistrict: dto.locationDistrict?.trim() || null, locationLatitude: dto.locationLatitude === undefined || dto.locationLatitude === null ? null : Number(dto.locationLatitude).toFixed(6), locationLongitude: dto.locationLongitude === undefined || dto.locationLongitude === null ? null : Number(dto.locationLongitude).toFixed(6), locationMapUrl: dto.locationMapUrl?.trim() || null, groupQrCodeUrl: dto.groupQrCodeUrl?.trim() || null, startTime: this.parseDate(dto.startTime), endTime: this.parseDate(dto.endTime), registrationDeadline: this.parseDate(dto.registrationDeadline), priorityRegistrationEndsAt: dto.priorityRegistrationEndsAt ? this.parseDate(dto.priorityRegistrationEndsAt) : null, formSchemaVersion: id && fieldsChanged ? Number(activity.formSchemaVersion || 1) + 1 : Number(activity.formSchemaVersion || 1), eligibilityRules: dto.eligibilityRules || null, capacity: dto.capacity, price: Number(dto.price).toFixed(2), status: nextStatus, featured: dto.featured, requireReview: dto.requireReview, allowCancel: dto.allowCancel, category, agent, minMemberLevel, priorityMemberLevel });
    const saved = await this.activities.save(activity);
    if (id) await Promise.all([this.fields.delete({ activity: { id } }), this.hosts.delete({ activity: { id } }), this.sections.delete({ activity: { id } })]);
    await this.fields.save(dto.fields.map((field) => this.fields.create({ ...field, label: field.label.trim(), options: field.options || null, activity: saved })));
    await this.hosts.save((dto.hosts || []).map((host) => this.hosts.create({ activity: saved, name: host.name.trim(), title: host.title?.trim() || null, avatarUrl: host.avatarUrl?.trim() || null, bio: host.bio?.trim() || null, sortOrder: host.sortOrder })));
    await this.sections.save((dto.sections || []).map((section) => this.sections.create({ activity: saved, type: section.type, title: section.title.trim(), content: section.content.trim(), imageUrl: section.imageUrl?.trim() || null, sortOrder: section.sortOrder })));
    const completeActivity = await this.getActivity(saved.id, admin);
    await this.recordActivityVersion(completeActivity, admin, id ? "manual_save" : "create", id ? "编辑活动内容" : "创建活动");
    await this.recordActivityApproval(saved, id ? "update" : "create", fromStatus, saved.status, admin, id ? "编辑活动内容" : "创建活动");
    await this.logOperation(admin, id ? "activity.update" : "activity.create", "activity", saved.id, id ? `编辑活动：${saved.title}` : `创建活动：${saved.title}`, auditDiff(before, this.activityAuditSnapshot(saved)));
    if (scheduleOrLocationChanged && [ActivityStatus.Open, ActivityStatus.Closed].includes(saved.status)) {
      const scheduleFingerprint = createHash("sha256").update(`${saved.startTime.toISOString()}|${saved.endTime.toISOString()}|${saved.location}`).digest("hex").slice(0, 16);
      await this.automaticNotifications.publishForActivity({ scene: "activityChanged", activityId: saved.id, businessId: `${saved.id}:${scheduleFingerprint}`, tenantId: saved.tenant?.id || null });
    }
    return completeActivity;
  }

  async listActivityVersions(activityId: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    return this.activityVersions.find({ where: { activity: { id: activityId } }, order: { versionNo: "DESC" }, take: 100 });
  }

  async copyActivity(id: number, admin?: AdminContext) {
    const activity = await this.getActivity(id, admin) as any;
    const dto = this.activityDtoFromSnapshot({ ...activity, title: `${activity.title}（副本）`, status: ActivityStatus.Draft, tenantId: activity.tenant?.id || null });
    const copied = await this.saveActivity(dto, undefined, admin);
    await this.logOperation(admin, "activity.copy", "activity", copied.id, `复制活动：${activity.title}`, { sourceActivityId: id });
    return copied;
  }

  async restoreActivityVersion(activityId: number, versionId: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    const version = await this.activityVersions.findOne({ where: { id: versionId, activity: { id: activityId } } });
    if (!version) throw new NotFoundException("活动版本不存在");
    const dto = this.activityDtoFromSnapshot({ ...version.snapshot, tenantId: activity.tenant?.id || null, status: ActivityStatus.Draft });
    const restored = await this.saveActivity(dto, activityId, admin);
    await this.logOperation(admin, "activity.version_restore", "activity", activityId, `恢复活动版本 V${version.versionNo}：${activity.title}`, { versionId, versionNo: version.versionNo });
    return restored;
  }

  async activityPublishCheck(id: number, admin?: AdminContext) {
    const activity = await this.getActivity(id, admin) as any;
    const issues: Array<{ field: string; message: string; blocking: boolean }> = [];
    if (!activity.title?.trim()) issues.push({ field: "title", message: "请填写活动标题", blocking: true });
    if (!activity.coverUrl) issues.push({ field: "coverUrl", message: "建议上传活动封面", blocking: false });
    if (!activity.description?.trim()) issues.push({ field: "description", message: "请填写活动介绍", blocking: true });
    if (!activity.location?.trim()) issues.push({ field: "location", message: "请填写活动地点", blocking: true });
    if (new Date(activity.endTime) <= new Date(activity.startTime)) issues.push({ field: "endTime", message: "结束时间必须晚于开始时间", blocking: true });
    if (new Date(activity.registrationDeadline) >= new Date(activity.startTime)) issues.push({ field: "registrationDeadline", message: "报名截止时间必须早于活动开始时间", blocking: true });
    if (!activity.fields?.length) issues.push({ field: "fields", message: "至少配置一个报名字段", blocking: true });
    if (!activity.sections?.length) issues.push({ field: "sections", message: "建议至少配置一个详情模块", blocking: false });
    if (Number(activity.price || 0) > 0) {
      const setting = await this.operationSettings.findOne({ where: activity.tenant ? { tenant: { id: activity.tenant.id } } : { tenant: IsNull() } });
      if (!hasPaidPaymentMethod(setting?.paymentMethods)) issues.push({ field: "paymentMethods", message: "付费活动尚未配置可用支付方式", blocking: true });
    }
    return { passed: !issues.some((item) => item.blocking), blockingCount: issues.filter((item) => item.blocking).length, warningCount: issues.filter((item) => !item.blocking).length, issues };
  }

  private async recordActivityVersion(activity: any, admin: AdminContext | undefined, source: string, remark?: string) {
    const result = await this.activityVersions.createQueryBuilder("version").select("COALESCE(MAX(version.versionNo), 0)", "max").where("version.activityId = :activityId", { activityId: activity.id }).getRawOne<{ max: string }>();
    const snapshot = {
      title: activity.title, tenantId: activity.tenant?.id || null, coverUrl: activity.coverUrl, shareTitle: activity.shareTitle, shareDescription: activity.shareDescription, shareImageUrl: activity.shareImageUrl, description: activity.description, notice: activity.notice,
      location: activity.location, locationProvince: activity.locationProvince, locationCity: activity.locationCity, locationDistrict: activity.locationDistrict, locationLatitude: activity.locationLatitude, locationLongitude: activity.locationLongitude, locationMapUrl: activity.locationMapUrl, groupQrCodeUrl: activity.groupQrCodeUrl,
      startTime: activity.startTime, endTime: activity.endTime, registrationDeadline: activity.registrationDeadline, capacity: activity.capacity, price: activity.price, status: activity.status,
      featured: activity.featured, requireReview: activity.requireReview, allowCancel: activity.allowCancel, categoryId: activity.category?.id || null, agentId: activity.agent?.id || null,
      minMemberLevelId: activity.minMemberLevel?.id || null, priorityMemberLevelId: activity.priorityMemberLevel?.id || null, priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt,
      formSchemaVersion: activity.formSchemaVersion, eligibilityRules: activity.eligibilityRules,
      fields: activity.fields || [], hosts: activity.hosts || [], sections: activity.sections || []
    };
    return this.activityVersions.save(this.activityVersions.create({ activity, tenant: activity.tenant || null, versionNo: Number(result?.max || 0) + 1, source, snapshot, createdBy: admin?.username || null, remark: remark || null }));
  }

  private activityDtoFromSnapshot(snapshot: any): ActivityDto {
    return {
      tenantId: snapshot.tenantId || snapshot.tenant?.id || undefined,
      title: String(snapshot.title || "").trim(), coverUrl: snapshot.coverUrl || undefined, shareTitle: snapshot.shareTitle || undefined, shareDescription: snapshot.shareDescription || undefined, shareImageUrl: snapshot.shareImageUrl || undefined, description: String(snapshot.description || "").trim(), notice: snapshot.notice || undefined,
      location: String(snapshot.location || "").trim(), locationProvince: snapshot.locationProvince || undefined, locationCity: snapshot.locationCity || undefined, locationDistrict: snapshot.locationDistrict || undefined, locationLatitude: snapshot.locationLatitude === null || snapshot.locationLatitude === undefined ? undefined : Number(snapshot.locationLatitude), locationLongitude: snapshot.locationLongitude === null || snapshot.locationLongitude === undefined ? undefined : Number(snapshot.locationLongitude), locationMapUrl: snapshot.locationMapUrl || undefined, groupQrCodeUrl: snapshot.groupQrCodeUrl || undefined,
      startTime: new Date(snapshot.startTime).toISOString(), endTime: new Date(snapshot.endTime).toISOString(), registrationDeadline: new Date(snapshot.registrationDeadline).toISOString(),
      capacity: Number(snapshot.capacity), price: Number(snapshot.price || 0), status: snapshot.status || ActivityStatus.Draft, featured: Boolean(snapshot.featured), requireReview: Boolean(snapshot.requireReview), allowCancel: snapshot.allowCancel !== false,
      categoryId: snapshot.categoryId || snapshot.category?.id || undefined, agentId: snapshot.agentId || snapshot.agent?.id || undefined, minMemberLevelId: snapshot.minMemberLevelId || snapshot.minMemberLevel?.id || undefined, priorityMemberLevelId: snapshot.priorityMemberLevelId || snapshot.priorityMemberLevel?.id || undefined,
      priorityRegistrationEndsAt: snapshot.priorityRegistrationEndsAt ? new Date(snapshot.priorityRegistrationEndsAt).toISOString() : undefined,
      fields: (snapshot.fields || []).map((field: any, index: number) => ({ label: String(field.label || "").trim(), type: field.type, required: Boolean(field.required), sortOrder: Number(field.sortOrder || index + 1), options: field.options || undefined })),
      hosts: (snapshot.hosts || []).map((host: any, index: number) => ({ name: String(host.name || "").trim(), title: host.title || undefined, avatarUrl: host.avatarUrl || undefined, bio: host.bio || undefined, sortOrder: Number(host.sortOrder || index + 1) })),
      sections: (snapshot.sections || []).map((section: any, index: number) => ({ type: section.type || "custom", title: String(section.title || "").trim(), content: String(section.content || "").trim(), imageUrl: section.imageUrl || undefined, sortOrder: Number(section.sortOrder || index + 1) }))
      , eligibilityRules: snapshot.eligibilityRules || undefined
    };
  }

  async submitActivityForApproval(id: number, admin?: AdminContext) {
    const activity = await this.activityWithSections(id);
    if (!activity) throw new NotFoundException("活动不存");
    this.assertActivityAccess(activity, admin);
    this.assertActivityContentCompliance(activity);
    const publishCheck = await this.activityPublishCheck(id, admin);
    if (!publishCheck.passed) throw new BadRequestException(`活动发布检查未通过：${publishCheck.issues.filter((item) => item.blocking).map((item) => item.message).join("；")}`);
    if (!this.isTenantScoped(admin)) throw new BadRequestException("平台管理员请直接审核活动");
    if (![ActivityStatus.Draft, ActivityStatus.Rejected].includes(activity.status)) throw new BadRequestException("只有草稿或已驳回活动可以提交审核");
    const tenant = await this.resolveActivityTenant(admin, activity.tenant);
    const fromStatus = activity.status;
    if (!this.tenantPermissions(tenant).activityPublishReviewRequired) {
      activity.status = ActivityStatus.Open;
    } else {
      activity.status = ActivityStatus.PendingApproval;
    }
    const saved = await this.activities.save(activity);
    await this.recordActivityApproval(saved, "submit", fromStatus, saved.status, admin);
    await this.logOperation(admin, "activity.submit_approval", "activity", saved.id, `提交活动审核：${saved.title}`, { status: saved.status });
    return this.getActivity(saved.id, admin);
  }

  async approveActivity(id: number, dto: ActivityApprovalDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const activity = await this.activityWithSections(id);
    if (!activity) throw new NotFoundException("活动不存");
    this.assertActivityContentCompliance(activity);
    if (activity.status !== ActivityStatus.PendingApproval) throw new BadRequestException("只有待平台审核活动可以通过");
    const fromStatus = activity.status;
    activity.status = ActivityStatus.Open;
    const saved = await this.activities.save(activity);
    await this.recordActivityApproval(saved, "approve", fromStatus, saved.status, admin, dto.remark);
    await this.logOperation(admin, "activity.approve", "activity", saved.id, `审核通过活动：${saved.title}`, { remark: dto.remark || null });
    return this.getActivity(saved.id, admin);
  }

  async rejectActivity(id: number, dto: ActivityApprovalDto, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException("活动不存");
    if (activity.status !== ActivityStatus.PendingApproval) throw new BadRequestException("只有待平台审核活动可以驳回");
    const fromStatus = activity.status;
    activity.status = ActivityStatus.Rejected;
    const saved = await this.activities.save(activity);
    await this.recordActivityApproval(saved, "reject", fromStatus, saved.status, admin, dto.remark);
    await this.logOperation(admin, "activity.reject", "activity", saved.id, `驳回活动：${saved.title}`, { remark: dto.remark || null });
    return this.getActivity(saved.id, admin);
  }

  private async recordActivityApproval(
    activity: Activity,
    action: ActivityApprovalLog["action"],
    fromStatus: ActivityStatus | string | null,
    toStatus: ActivityStatus | string | null,
    admin?: AdminContext,
    remark?: string | null
  ) {
    await this.activityApprovalLogs.save(
      this.activityApprovalLogs.create({
        activity,
        tenant: this.tenantRelation(admin, activity.tenant),
        action,
        operator: admin?.username || null,
        fromStatus: fromStatus || null,
        toStatus: toStatus || null,
        remark: remark?.trim() || null,
        snapshot: {
          title: activity.title,
          status: activity.status,
          startTime: activity.startTime,
          endTime: activity.endTime,
          registrationDeadline: activity.registrationDeadline,
          capacity: activity.capacity,
          price: activity.price,
          requireReview: activity.requireReview
        }
      })
    );
  }

  async deleteActivity(id: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException("活动不存");
    this.assertActivityAccess(activity, admin);
    if (!canTransitionActivity("close", activity.status, ActivityStatus.Closed)) throw new BadRequestException("只有报名中的活动可以下架");
    const fromStatus = activity.status;
    activity.status = ActivityStatus.Closed;
    const saved = await this.activities.save(activity);
    await this.recordActivityApproval(saved, "close", fromStatus, saved.status, admin, "下架活动");
    await this.logOperation(admin, "activity.close", "activity", saved.id, `下架活动：${saved.title}`);
    return saved;
  }

  async homepagePublicationStatus(admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId); const normalizedPageKey = normalizePageKey(pageKey);
    const tenantScopeKey = homepagePublicationScopeKey(targetTenant?.id);
    const publication = await this.dataSource.getRepository(HomepagePublication).findOne({ where: { tenantScopeKey, pageKey: normalizedPageKey } });
    const draft = await this.snapshotHomepageSections(targetTenant, normalizedPageKey);
    return { publication, draftSectionCount: draft.length, hasUnpublishedChanges: homepageSnapshotChanged(publication?.sections, draft) };
  }

  async publishHomepageDecoration(dto: HomepageDecorationVersionDto, admin?: AdminContext, tenantId?: number, pageKey?: string) {
    const targetTenant = await this.resolveHomepageTenant(admin, tenantId); this.assertTenantSubscriptionWritable(targetTenant, admin);
    const normalizedPageKey = normalizePageKey(pageKey); const sections = cloneHomepageSnapshot(await this.snapshotHomepageSections(targetTenant, normalizedPageKey));
    if (!sections.length) throw new BadRequestException("当前页面没有可发布的装修模块");
    const version = await this.homepageDecorationVersions.save(this.homepageDecorationVersions.create({ tenant: targetTenant, pageKey: normalizedPageKey, name: this.nullableText(dto.name) || `发布-${new Date().toISOString().slice(0, 16).replace("T", " ")}`, note: this.nullableText(dto.note), sections, sectionCount: sections.length, createdById: admin?.id || null, createdByName: this.actorName(admin) }));
    const repo = this.dataSource.getRepository(HomepagePublication); const tenantScopeKey = homepagePublicationScopeKey(targetTenant?.id);
    let publication = await repo.findOne({ where: { tenantScopeKey, pageKey: normalizedPageKey } });
    if (!publication) publication = repo.create({ tenant: targetTenant, tenantScopeKey, pageKey: normalizedPageKey });
    Object.assign(publication, { sections, versionId: version.id, publishedById: admin?.id || null, publishedByName: this.actorName(admin), publishedAt: new Date() });
    const saved = await repo.save(publication);
    await this.logOperation(admin, "homepage.publish", "homepage_publication", saved.id, `发布前台装修：${normalizedPageKey}`, { versionId: version.id, sectionCount: sections.length, tenantId: targetTenant?.id || null });
    return { publication: saved, version };
  }

  async withdrawActivityApproval(id: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    if (activity.status !== ActivityStatus.PendingApproval) throw new BadRequestException("只有待审核活动可以撤回");
    return this.transitionActivity(activity, ActivityStatus.Draft, "withdraw", admin, "撤回活动审核");
  }

  async reopenActivity(id: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    if (activity.status !== ActivityStatus.Closed) throw new BadRequestException("只有已下架活动可以重新上架");
    if (new Date(activity.endTime) <= new Date()) throw new BadRequestException("活动已结束，不能重新上架");
    const check = await this.activityPublishCheck(id, admin);
    if (!check.passed) throw new BadRequestException("活动发布检查未通过");
    return this.transitionActivity(activity, ActivityStatus.Open, "reopen", admin, "重新上架活动");
  }

  async cancelActivity(id: number, reason: string, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    if (![ActivityStatus.Open, ActivityStatus.Closed].includes(activity.status)) throw new BadRequestException("只有已发布或已下架活动可以取消");
    if (!canTransitionActivity("cancel", activity.status, ActivityStatus.Cancelled)) throw new BadRequestException("当前状态不能取消活动");
    if (!reason?.trim()) throw new BadRequestException("请填写活动取消原因");
    const from = activity.status;
    const summary = await this.dataSource.transaction(async (manager) => {
      const activityRepo = manager.getRepository(Activity);
      const registrationRepo = manager.getRepository(Registration);
      const orderRepo = manager.getRepository(Order);
      const refundRepo = manager.getRepository(Refund);
      activity.status = ActivityStatus.Cancelled;
      activity.cancelledAt = new Date();
      activity.cancellationReason = reason.trim();
      activity.scheduledPublishAt = null;
      await activityRepo.save(activity);
      const registrations = await registrationRepo.find({ where: { activity: { id } } });
      let cancelledRegistrations = 0;
      let closedOrders = 0;
      let refundRequests = 0;
      for (const registration of registrations) {
        if (![RegistrationStatus.Cancelled, RegistrationStatus.Rejected, RegistrationStatus.CheckedIn].includes(registration.status)) {
          registration.status = RegistrationStatus.Cancelled;
          registration.cancelReason = `活动取消：${reason.trim()}`;
          await registrationRepo.save(registration);
          cancelledRegistrations += 1;
        }
        const order = await orderRepo.findOne({ where: { registration: { id: registration.id } } });
        if (!order) continue;
        if (order.status === OrderStatus.PendingPayment) {
          order.status = OrderStatus.Cancelled;
          order.closedAt = new Date();
          order.closeReason = `活动取消：${reason.trim()}`;
          await orderRepo.save(order);
          closedOrders += 1;
        } else if ([OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(order.status)) {
          const refundNo = `ACRF${activity.id}-${order.id}`;
          const existing = await refundRepo.findOne({ where: { refundNo } });
          if (existing) continue;
          const activeRefunds = await refundRepo.find({ where: { order: { id: order.id }, status: In(["pending", "processing", "completed"]) } });
          const remaining = Math.max(Number(order.amount || 0) - activeRefunds.reduce((sum, item) => sum + Number(item.amount || 0), 0), 0);
          if (remaining > 0.001) {
            await refundRepo.save(refundRepo.create({ order, tenant: order.tenant || activity.tenant || null, refundNo, amount: remaining.toFixed(2), status: "pending", operator: this.actorName(admin), reason: `活动取消自动退款：${reason.trim()}` }));
            refundRequests += 1;
          }
        }
      }
      return { cancelledRegistrations, closedOrders, refundRequests };
    });
    await this.recordActivityApproval(activity, "cancel", from, ActivityStatus.Cancelled, admin, reason.trim());
    await this.logOperation(admin, "activity.cancel", "activity", activity.id, `取消活动：${activity.title}`, { reason: reason.trim(), ...summary });
    await this.automaticNotifications.publishForActivity({ scene: "activityCancelled", activityId: activity.id, businessId: activity.id, tenantId: activity.tenant?.id || null, variables: { reason: reason.trim() } });
    return { ...(await this.getActivity(activity.id, admin)), cancellationSummary: summary };
  }

  async endActivity(id: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    if (activity.status !== ActivityStatus.Open) throw new BadRequestException("只有报名中的活动可以结束");
    return this.transitionActivity(activity, ActivityStatus.Ended, "end", admin, "手动结束活动");
  }

  async scheduleActivityPublish(id: number, publishAt: string, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    if (![ActivityStatus.Open, ActivityStatus.Closed].includes(activity.status)) throw new BadRequestException("只有已审核活动可以设置定时发布");
    const at = this.parseDate(publishAt);
    const scheduleIssue = scheduledPublishWindowIssue(at, new Date(), activity.endTime);
    if (scheduleIssue === "not_future") throw new BadRequestException("定时发布时间必须晚于当前时间");
    if (scheduleIssue === "not_before_end") throw new BadRequestException("定时发布时间必须早于活动结束时间");
    const from = activity.status;
    activity.scheduledPublishAt = at;
    activity.status = ActivityStatus.Closed;
    const saved = await this.activities.save(activity);
    await this.recordActivityApproval(saved, "schedule", from, ActivityStatus.Closed, admin, `定时发布：${at.toISOString()}`);
    return saved;
  }

  async runActivityLifecycle(now = new Date()) {
    const scheduled = await this.activities.createQueryBuilder("activity").where("activity.status = :closed", { closed: ActivityStatus.Closed }).andWhere("activity.scheduledPublishAt IS NOT NULL AND activity.scheduledPublishAt <= :now", { now }).getMany();
    const ending = await this.activities.createQueryBuilder("activity").where("activity.status = :open", { open: ActivityStatus.Open }).andWhere("activity.endTime <= :now", { now }).getMany();
    for (const activity of scheduled) {
      activity.status = ActivityStatus.Open;
      activity.scheduledPublishAt = null;
      const saved = await this.activities.save(activity);
      await this.recordActivityApproval(saved, "auto_publish", ActivityStatus.Closed, ActivityStatus.Open, undefined, "定时自动发布");
    }
    for (const activity of ending) {
      activity.status = ActivityStatus.Ended;
      const saved = await this.activities.save(activity);
      await this.recordActivityApproval(saved, "auto_end", ActivityStatus.Open, ActivityStatus.Ended, undefined, "到达结束时间自动结束");
    }
    return { publishedCount: scheduled.length, endedCount: ending.length };
  }

  private async transitionActivity(activity: Activity, to: ActivityStatus, action: ActivityLifecycleAction, admin?: AdminContext, remark?: string) {
    const from = activity.status;
    if (!canTransitionActivity(action, from, to)) throw new BadRequestException(`非法活动状态变更：${from} -> ${to}`);
    activity.status = to;
    const saved = await this.activities.save(activity);
    await this.recordActivityApproval(saved, action as any, from, to, admin, remark);
    await this.logOperation(admin, `activity.${action}`, "activity", saved.id, `${remark || action}：${saved.title}`, { fromStatus: from, toStatus: to });
    return this.getActivity(saved.id, admin);
  }

  async listRegistrations(query: RegistrationQueryDto, admin?: AdminContext) {
    const pageSize = Math.min(Math.max(Number(query.pageSize || 0), 0), 100);
    const page = Math.max(Number(query.page || 1), 1);
    const builder = this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndMapOne("registration.order", Order, "linkedOrder", "linkedOrder.registrationId = registration.id")
      .leftJoinAndMapOne("registration.checkIn", CheckIn, "linkedCheckIn", "linkedCheckIn.registrationId = registration.id")
      .leftJoinAndSelect("linkedCheckIn.operator", "checkInOperator")
      .orderBy("registration.createdAt", "DESC");

    this.applyTenantScope(builder, "registration", admin);
    if (query.activityId) builder.andWhere("activity.id = :activityId", { activityId: query.activityId });
    if (query.userId) builder.andWhere("user.id = :userId", { userId: query.userId });
    if (query.status) builder.andWhere("registration.status = :status", { status: query.status });
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("(tenant.id = :tenantId OR activityTenant.id = :tenantId)", { tenantId: query.tenantId });
    if (query.keyword?.trim()) {
      builder.andWhere("(activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword OR linkedOrder.orderNo LIKE :keyword OR JSON_EXTRACT(registration.answers, '$') LIKE :keyword)", { keyword: `%${query.keyword.trim()}%` });
    }

    if (!pageSize) return builder.getMany();

    const [items, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items, total, page, pageSize };
  }

  async checkInOverview(query: { activityId?: number | string; keyword?: string }, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) this.assertPlatformAdmin(admin);
    const activityId = query.activityId ? Number(query.activityId) : undefined;
    if (activityId && !Number.isFinite(activityId)) throw new BadRequestException("活动 ID 格式错误");
    const tenantId = admin?.tenantId || 0;
    const today = this.businessDayRange();
    const scopeCondition = this.isTenantScoped(admin) ? "(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)" : "1 = 1";

    const activitiesBuilder = this.activities.createQueryBuilder("activity").leftJoinAndSelect("activity.tenant", "tenant").orderBy("activity.startTime", "DESC").take(100);
    this.applyTenantScope(activitiesBuilder, "activity", admin);

    const baseRegistrationBuilder = () => {
      const builder = this.registrations
        .createQueryBuilder("registration")
        .leftJoin("registration.activity", "activity")
        .leftJoin(CheckIn, "linkedCheckIn", "linkedCheckIn.registrationId = registration.id AND linkedCheckIn.revokedAt IS NULL")
        .where(scopeCondition, { tenantId });
      if (activityId) builder.andWhere("activity.id = :activityId", { activityId });
      return builder;
    };

    const baseCheckInBuilder = () => {
      const builder = this.checkIns
        .createQueryBuilder("checkIn")
        .leftJoin("checkIn.registration", "registration")
        .leftJoin("registration.activity", "activity")
        .where(scopeCondition, { tenantId })
        .andWhere("checkIn.revokedAt IS NULL");
      if (activityId) builder.andWhere("activity.id = :activityId", { activityId });
      return builder;
    };

    const pendingRowsBuilder = this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndMapOne("registration.order", Order, "linkedOrder", "linkedOrder.registrationId = registration.id")
      .leftJoin(CheckIn, "linkedCheckIn", "linkedCheckIn.registrationId = registration.id AND linkedCheckIn.revokedAt IS NULL")
      .where(scopeCondition, { tenantId })
      .andWhere("registration.status = :approvedStatus", { approvedStatus: RegistrationStatus.Approved })
      .andWhere("linkedCheckIn.id IS NULL")
      .orderBy("registration.createdAt", "DESC")
      .take(10);
    if (activityId) pendingRowsBuilder.andWhere("activity.id = :activityId", { activityId });
    if (query.keyword?.trim()) pendingRowsBuilder.andWhere("(CAST(registration.id AS CHAR) = :exactKeyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword OR linkedOrder.orderNo LIKE :keyword OR JSON_EXTRACT(registration.answers, '$') LIKE :keyword)", { exactKeyword: query.keyword.trim(), keyword: `%${query.keyword.trim()}%` }).take(50);

    const checkedRowsBuilder = this.checkIns
      .createQueryBuilder("checkIn")
      .leftJoinAndSelect("checkIn.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("checkIn.operator", "operator")
      .leftJoinAndMapOne("registration.order", Order, "linkedOrder", "linkedOrder.registrationId = registration.id")
      .where(scopeCondition, { tenantId })
      .andWhere("checkIn.revokedAt IS NULL")
      .orderBy("checkIn.createdAt", "DESC")
      .take(10);
    if (activityId) checkedRowsBuilder.andWhere("activity.id = :activityId", { activityId });

    const [activities, approvedTotal, pendingCheckInCount, checkedInCount, todayCheckedInCount, pendingRows, checkedRows] = await Promise.all([
      activitiesBuilder.getMany(),
      baseRegistrationBuilder().andWhere("registration.status IN (:...eligibleStatuses)", { eligibleStatuses: [RegistrationStatus.Approved, RegistrationStatus.CheckedIn] }).getCount(),
      baseRegistrationBuilder().andWhere("registration.status = :approvedStatus", { approvedStatus: RegistrationStatus.Approved }).andWhere("linkedCheckIn.id IS NULL").getCount(),
      baseCheckInBuilder().getCount(),
      baseCheckInBuilder().andWhere("checkIn.createdAt >= :todayStart", { todayStart: today.start }).andWhere("checkIn.createdAt < :todayEnd", { todayEnd: today.end }).getCount(),
      pendingRowsBuilder.getMany(),
      checkedRowsBuilder.getMany()
    ]);
    const pointStatsBuilder = baseCheckInBuilder().leftJoin("checkIn.point", "point").select("COALESCE(point.id, 0)", "pointId").addSelect("COALESCE(point.name, '未指定')", "pointName").addSelect("COUNT(*)", "count").groupBy("point.id").addGroupBy("point.name");
    const ticketStatsBuilder = baseCheckInBuilder().leftJoin(Order, "linkedOrder", "linkedOrder.registrationId = registration.id").leftJoin("linkedOrder.ticketType", "ticketType").select("COALESCE(ticketType.id, 0)", "ticketTypeId").addSelect("COALESCE(ticketType.name, '未指定票种')", "ticketTypeName").addSelect("COUNT(*)", "count").groupBy("ticketType.id").addGroupBy("ticketType.name");
    const [pointStats, ticketTypeStats, revisionRow] = await Promise.all([
      pointStatsBuilder.getRawMany(), ticketStatsBuilder.getRawMany(), baseCheckInBuilder().select("MAX(checkIn.createdAt)", "latestCreatedAt").addSelect("MAX(checkIn.id)", "latestId").getRawOne()
    ]);

    return {
      filters: { activityId: activityId || null, keyword: query.keyword?.trim() || null },
      activities: activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        status: activity.status,
        startTime: activity.startTime,
        endTime: activity.endTime,
        tenant: activity.tenant ? this.publicTenant(activity.tenant) : null
      })),
      stats: {
        approvedTotal,
        pendingCheckInCount,
        checkedInCount,
        todayCheckedInCount,
        checkInRate: approvedTotal > 0 ? Math.round((checkedInCount / approvedTotal) * 1000) / 10 : 0
      },
      pointStats: pointStats.map(row => ({ pointId: Number(row.pointId) || null, pointName: row.pointName, count: Number(row.count) })),
      ticketTypeStats: ticketTypeStats.map(row => ({ ticketTypeId: Number(row.ticketTypeId) || null, ticketTypeName: row.ticketTypeName, count: Number(row.count) })),
      sync: { serverTime: new Date().toISOString(), revision: `${revisionRow?.latestId || 0}:${revisionRow?.latestCreatedAt ? new Date(revisionRow.latestCreatedAt).getTime() : 0}` },
      pending: pendingRows,
      checked: checkedRows
    };
  }

  async approveRegistration(id: number, dto: ReviewDto, admin?: AdminContext) {
    const result = await this.dataSource.transaction(async (manager) => {
      const registrationRepo = manager.getRepository(Registration);
      const registration = await registrationRepo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!registration) throw new NotFoundException("报名记录不存在");
      this.assertActivityAccess(registration.activity, admin);
      if (registration.status === RegistrationStatus.Approved) return { saved: registration, claimed: false };
      if (registration.status !== RegistrationStatus.PendingReview) throw new BadRequestException("只有待审核报名可以审核通过");
      const order = await manager.getRepository(Order).findOne({ where: { registration: { id } }, lock: { mode: "pessimistic_write" } });
      if (order?.status === OrderStatus.PendingPayment) throw new BadRequestException("请先确认收款");
      registration.status = RegistrationStatus.Approved;
      registration.reviewRemark = dto.remark || null;
      return { saved: await registrationRepo.save(registration), claimed: true };
    });
    if (!result.claimed) return result.saved;
    const saved = result.saved;
    await this.createRegistrationNotification(saved, "报名审核通过", `你报名的活动「${saved.activity.title}」已审核通过。`);
    await this.automaticNotifications.publish({ scene: "registrationApproved", businessId: saved.id, userId: saved.user.id, activityId: saved.activity.id, tenantId: saved.tenant?.id || saved.activity.tenant?.id || null });
    await this.logOperation(admin, "registration.approve", "registration", saved.id, `审核通过报名：${saved.activity.title}`, { remark: dto.remark || null });
    return saved;
  }

  async rejectRegistration(id: number, dto: ReviewDto, admin?: AdminContext) {
    const result = await this.dataSource.transaction(async (manager) => {
      const registrationRepo = manager.getRepository(Registration);
      const registration = await registrationRepo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!registration) throw new NotFoundException("报名记录不存在");
      this.assertActivityAccess(registration.activity, admin);
      if (registration.status === RegistrationStatus.Rejected) return { saved: registration, order: null as Order | null, claimed: false };
      if (![RegistrationStatus.PendingReview, RegistrationStatus.PendingPayment].includes(registration.status)) throw new BadRequestException("当前状态不能拒绝");
      const orderRepo = manager.getRepository(Order);
      const order = await orderRepo.findOne({ where: { registration: { id } }, lock: { mode: "pessimistic_write" } });
      registration.status = RegistrationStatus.Rejected;
      registration.reviewRemark = dto.remark || null;
      if (order?.status === OrderStatus.PendingPayment) {
        order.status = OrderStatus.Cancelled;
        await orderRepo.save(order);
      }
      return { saved: await registrationRepo.save(registration), order, claimed: true };
    });
    if (!result.claimed) return result.saved;
    const { saved, order } = result;
    if (order?.status === OrderStatus.Cancelled) await this.refundRedeemedPoints(order, "报名拒绝返还积分");
    if (order && [OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(order.status)) await this.ensureRegistrationCancellationRefund(order, dto.remark || "报名审核拒绝", admin);
    await this.createRegistrationNotification(saved, "报名审核未通过", `你报名的活动「${saved.activity.title}」未通过审核。${saved.reviewRemark ? `原因：${saved.reviewRemark}` : ""}`);
    await this.automaticNotifications.publish({ scene: "registrationRejected", businessId: saved.id, userId: saved.user.id, activityId: saved.activity.id, tenantId: saved.tenant?.id || saved.activity.tenant?.id || null });
    await this.promoteNextWaitlist(saved.activity.id, admin);
    await this.logOperation(admin, "registration.reject", "registration", saved.id, `拒绝报名：${saved.activity.title}`, { remark: dto.remark || null });
    return saved;
  }

  async cancelRegistration(id: number, reason?: string, admin?: AdminContext) {
    const registration = await this.getRegistration(id, admin);
    if ([RegistrationStatus.Cancelled, RegistrationStatus.CheckedIn].includes(registration.status)) throw new BadRequestException("当前状态不能取");
    registration.status = RegistrationStatus.Cancelled;
    registration.cancelReason = reason || "后台取消";
    const order = await this.orders.findOne({ where: { registration: { id } } });
    if (order && order.status === OrderStatus.PendingPayment) {
      order.status = OrderStatus.Cancelled;
      await this.orders.save(order);
      await this.refundRedeemedPoints(order, "后台取消报名返还积分");
    }
    if (order && [OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(order.status)) await this.ensureRegistrationCancellationRefund(order, registration.cancelReason, admin);
    const saved = await this.registrations.save(registration);
    await this.recordAdminConversionEvent("cancel", { activity: saved.activity, user: saved.user, registration: saved, order, channel: saved.channel || null, source: "admin", idempotencyKey: `cancel:${saved.id}` });
    await this.createRegistrationNotification(saved, "报名已取消", `你报名的活动「${saved.activity.title}」已取消。${saved.cancelReason ? `原因：${saved.cancelReason}` : ""}`);
    await this.promoteNextWaitlist(saved.activity.id, admin);
    await this.logOperation(admin, "registration.cancel", "registration", saved.id, `取消报名：${saved.activity.title}`, { reason: saved.cancelReason });
    return saved;
  }

  async bulkReviewRegistrations(action: "approve" | "reject", dto: BulkRegistrationReviewDto, admin?: AdminContext) {
    const ids = [...new Set(dto.ids.map(Number))];
    const results: Array<{ id: number; success: boolean; message: string }> = [];
    for (const id of ids) {
      try {
        if (action === "approve") await this.approveRegistration(id, { remark: dto.remark }, admin);
        else await this.rejectRegistration(id, { remark: dto.remark }, admin);
        results.push({ id, success: true, message: action === "approve" ? "已通过" : "已拒绝" });
      } catch (error: any) {
        results.push({ id, success: false, message: error?.message || "处理失败" });
      }
    }
    const succeeded = results.filter((item) => item.success).length;
    const failed = results.length - succeeded;
    await this.logOperation(admin, `registration.bulk_${action}`, "registration", null, `${action === "approve" ? "批量通过" : "批量拒绝"}报名：成功 ${succeeded} 条，失败 ${failed} 条`, {
      ids,
      remark: dto.remark || null,
      succeeded,
      failed,
      failures: results.filter((item) => !item.success)
    });
    return { total: results.length, succeeded, failed, results };
  }

  async bulkNotifyRegistrations(dto: { ids: number[]; title: string; content: string }, admin?: AdminContext) {
    const ids = [...new Set(dto.ids.map(Number))];
    const results: Array<{ id: number; success: boolean; message: string }> = [];
    for (const id of ids) {
      try {
        const registration = await this.getRegistration(id, admin);
        await this.createRegistrationNotification(registration, dto.title.trim(), dto.content.trim().replace(/\{activity\}/g, registration.activity.title).replace(/\{user\}/g, registration.user.nickname || registration.user.phone || "用户"));
        results.push({ id, success: true, message: "已发送" });
      } catch (error: any) { results.push({ id, success: false, message: error?.message || "发送失败" }); }
    }
    const succeeded = results.filter((item) => item.success).length;
    await this.logOperation(admin, "registration.bulk_notify", "registration", null, `批量发送报名通知：成功 ${succeeded} 条，失败 ${results.length - succeeded} 条`, { ids, title: dto.title, succeeded, failed: results.length - succeeded });
    return { total: results.length, succeeded, failed: results.length - succeeded, results };
  }

  async bulkTagRegistrations(dto: { ids: number[]; name: string; color?: string; remark?: string }, admin?: AdminContext) {
    const ids = [...new Set(dto.ids.map(Number))];
    const results: Array<{ id: number; success: boolean; message: string }> = [];
    for (const id of ids) {
      try {
        const registration = await this.getRegistration(id, admin);
        await this.createUserTag({ userId: registration.user.id, name: dto.name.trim(), color: dto.color || "default", remark: dto.remark || `来自报名：${registration.activity.title}` }, admin);
        results.push({ id, success: true, message: "已标记" });
      } catch (error: any) { results.push({ id, success: false, message: error?.message || "标记失败" }); }
    }
    const succeeded = results.filter((item) => item.success).length;
    await this.logOperation(admin, "registration.bulk_tag", "registration", null, `批量标记报名用户：成功 ${succeeded} 条，失败 ${results.length - succeeded} 条`, { ids, tag: dto.name, succeeded, failed: results.length - succeeded });
    return { total: results.length, succeeded, failed: results.length - succeeded, results };
  }

  async checkInRegistration(id: number, admin: AdminContext & { id: number }, remark?: string) {
    const registration = await this.getRegistration(id, admin);
    return this.checkIn(registration.checkInCode, admin.id, remark || "后台报名列表手动核销", admin);
  }

  async listOrders(query: OrderQueryDto | OrderStatus = {}, admin?: AdminContext) {
    const normalizedQuery: OrderQueryDto = typeof query === "string" ? { status: query } : query || {};
    const pageSize = Math.min(Math.max(Number(normalizedQuery.pageSize || 0), 0), 100);
    const page = Math.max(Number(normalizedQuery.page || 1), 1);
    const builder = this.orders
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("order.tenant", "tenant")
      .leftJoinAndSelect("order.agent", "agent")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("order.ticketType", "ticketType")
      .leftJoinAndSelect("order.coupon", "coupon")
      .leftJoinAndSelect("order.memberLevel", "memberLevel")
      .orderBy("order.createdAt", "DESC");

    this.applyTenantScope(builder, "order", admin);
    if (normalizedQuery.status) builder.andWhere("order.status = :status", { status: normalizedQuery.status });
    if (normalizedQuery.activityId) builder.andWhere("activity.id = :activityId", { activityId: normalizedQuery.activityId });
    if (normalizedQuery.userId) builder.andWhere("user.id = :userId", { userId: normalizedQuery.userId });
    if (normalizedQuery.agentId) builder.andWhere("agent.id = :agentId", { agentId: normalizedQuery.agentId });
    if (!this.isTenantScoped(admin) && normalizedQuery.tenantId) builder.andWhere("(tenant.id = :tenantId OR activityTenant.id = :tenantId)", { tenantId: normalizedQuery.tenantId });
    if (normalizedQuery.keyword?.trim()) {
      builder.andWhere("(order.orderNo LIKE :keyword OR activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${normalizedQuery.keyword.trim()}%` });
    }

    if (!pageSize) return builder.getMany();

    const [items, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items, total, page, pageSize };
  }

  async unifiedOrders(query: { businessType?: string; keyword?: string; status?: string; page?: number; pageSize?: number }, admin?: AdminContext) {
    const requestedType = String(query.businessType || "").trim();
    if (requestedType && !["activity", "course", "mall"].includes(requestedType)) throw new BadRequestException("订单业务类型不正确");
    const allowedTypes = this.unifiedOrderBusinessTypes(admin);
    if (requestedType && !allowedTypes.includes(requestedType)) throw new ForbiddenException("没有该业务订单的查看权限");
    const types = requestedType ? [requestedType] : allowedTypes;
    const keyword = String(query.keyword || "").trim();
    const status = String(query.status || "").trim();
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId || undefined : undefined;
    const page = Math.max(1, Math.min(10000, Math.trunc(Number(query.page || 1))));
    const pageSize = Math.max(1, Math.min(100, Math.trunc(Number(query.pageSize || 20))));
    const take = Math.min(10000, page * pageSize);
    const rows: any[] = [];
    let total = 0;

    if (types.includes("activity")) {
      const builder = this.orders.createQueryBuilder("order")
        .leftJoinAndSelect("order.registration", "registration")
        .leftJoinAndSelect("registration.activity", "activity")
        .leftJoinAndSelect("activity.tenant", "activityTenant")
        .leftJoinAndSelect("registration.user", "user")
        .leftJoinAndSelect("order.tenant", "tenant")
        .orderBy("order.createdAt", "DESC").addOrderBy("order.id", "DESC").take(take);
      if (tenantId) builder.andWhere("(order.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      applyAdminActivityDataScope(builder, "activity", admin?.dataScope);
      if (status) builder.andWhere("order.status = :status", { status });
      if (keyword) builder.andWhere("(order.orderNo LIKE :keyword OR order.transactionNo LIKE :keyword OR activity.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${keyword}%` });
      const [items, count] = await builder.getManyAndCount();
      total += count;
      rows.push(...items.map((order) => this.unifiedOrderRow("activity", order)));
    }

    if (types.includes("course")) {
      const builder = this.dataSource.getRepository(CourseOrder).createQueryBuilder("order")
        .leftJoinAndSelect("order.course", "course")
        .leftJoinAndSelect("course.tenant", "tenant")
        .leftJoinAndSelect("order.user", "user")
        .orderBy("order.createdAt", "DESC").addOrderBy("order.id", "DESC").take(take);
      if (tenantId) builder.andWhere("course.tenantId = :tenantId", { tenantId });
      if (status) builder.andWhere("order.status = :status", { status });
      if (keyword) builder.andWhere("(order.orderNo LIKE :keyword OR order.transactionNo LIKE :keyword OR course.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${keyword}%` });
      const [items, count] = await builder.getManyAndCount();
      total += count;
      rows.push(...items.map((order) => this.unifiedOrderRow("course", order)));
    }

    if (types.includes("mall")) {
      const builder = this.dataSource.getRepository(MallOrder).createQueryBuilder("order")
        .leftJoinAndSelect("order.tenant", "tenant")
        .leftJoinAndSelect("order.user", "user")
        .leftJoinAndSelect("order.merchant", "merchant")
        .orderBy("order.createdAt", "DESC").addOrderBy("order.id", "DESC").take(take);
      if (tenantId) builder.andWhere("order.tenantId = :tenantId", { tenantId });
      await this.applyUnifiedMallOrderScope(builder, "merchant", admin);
      if (status) builder.andWhere("order.status = :status", { status });
      if (keyword) builder.andWhere("(order.orderNo LIKE :keyword OR order.transactionNo LIKE :keyword OR merchant.name LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${keyword}%` });
      const [items, count] = await builder.getManyAndCount();
      total += count;
      rows.push(...items.map((order) => this.unifiedOrderRow("mall", order)));
    }

    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || String(b.businessType).localeCompare(String(a.businessType)) || Number(b.id) - Number(a.id));
    return { items: rows.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, availableBusinessTypes: allowedTypes };
  }

  async unifiedOrderDetail(businessType: string, id: number, admin?: AdminContext) {
    const type = String(businessType || "").trim();
    if (!["activity", "course", "mall"].includes(type)) throw new BadRequestException("订单业务类型不正确");
    if (!this.unifiedOrderBusinessTypes(admin).includes(type)) throw new ForbiddenException("没有该业务订单的查看权限");
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId || undefined : undefined;

    if (type === "activity") {
      const builder = this.orders.createQueryBuilder("order")
        .leftJoinAndSelect("order.registration", "registration")
        .leftJoinAndSelect("registration.activity", "activity")
        .leftJoinAndSelect("activity.tenant", "activityTenant")
        .leftJoinAndSelect("registration.user", "user")
        .leftJoinAndSelect("order.tenant", "tenant")
        .leftJoinAndSelect("order.ticketType", "ticketType")
        .where("order.id = :id", { id });
      if (tenantId) builder.andWhere("(order.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId });
      applyAdminActivityDataScope(builder, "activity", admin?.dataScope);
      const order = await builder.getOne();
      if (!order) throw new NotFoundException("统一订单不存在");
      const [payments, refunds] = await Promise.all([
        this.paymentTransactions.createQueryBuilder("payment").where("payment.orderId = :id", { id }).orderBy("payment.id", "ASC").getMany(),
        this.refunds.createQueryBuilder("refund").where("refund.orderId = :id", { id }).orderBy("refund.id", "ASC").getMany()
      ]);
      return {
        ...this.unifiedOrderRow("activity", order),
        business: { registrationId: order.registration.id, activityId: order.registration.activity.id, activityTitle: order.registration.activity.title, ticketType: order.ticketType ? { id: order.ticketType.id, name: order.ticketType.name } : null },
        pricing: { originalAmountFen: yuanToFen(order.originalAmount), discountAmountFen: yuanToFen(order.discountAmount), memberDiscountAmountFen: yuanToFen(order.memberDiscountAmount), pointsDiscountAmountFen: yuanToFen(order.pointsDiscountAmount), pointsUsed: order.pointsUsed },
        payments: payments.map((row) => this.unifiedPaymentRow(row)),
        refunds: refunds.map((row) => this.unifiedRefundRow(row)),
        snapshot: this.sanitizeUnifiedOrderSnapshot(order.businessSnapshot),
        timeline: { createdAt: order.createdAt, paidAt: order.paidAt, expiresAt: order.expiresAt, closedAt: order.closedAt, updatedAt: order.updatedAt }
      };
    }

    if (type === "course") {
      const builder = this.dataSource.getRepository(CourseOrder).createQueryBuilder("order")
        .leftJoinAndSelect("order.course", "course")
        .leftJoinAndSelect("course.tenant", "tenant")
        .leftJoinAndSelect("order.user", "user")
        .where("order.id = :id", { id });
      if (tenantId) builder.andWhere("course.tenantId = :tenantId", { tenantId });
      const order = await builder.getOne();
      if (!order) throw new NotFoundException("统一订单不存在");
      const [payments, refunds, learning] = await Promise.all([
        this.paymentTransactions.createQueryBuilder("payment").where("payment.businessType = :type", { type: "course" }).andWhere("payment.businessOrderNo = :orderNo", { orderNo: order.orderNo }).orderBy("payment.id", "ASC").getMany(),
        this.dataSource.getRepository(CourseRefund).createQueryBuilder("refund").where("refund.orderId = :id", { id }).orderBy("refund.id", "ASC").getMany(),
        this.dataSource.getRepository(UserLearning).findOne({ where: { userId: order.user.id, courseId: order.course.id, lessonId: 0 }, loadEagerRelations: false })
      ]);
      return {
        ...this.unifiedOrderRow("course", order),
        business: { courseId: order.course.id, courseTitle: order.course.title, learningOwned: Boolean(learning) },
        pricing: { originalAmountFen: Number(order.amountFen || 0), discountAmountFen: 0, memberDiscountAmountFen: 0, pointsDiscountAmountFen: 0, pointsUsed: 0 },
        payments: payments.map((row) => this.unifiedPaymentRow(row)),
        refunds: refunds.map((row) => this.unifiedRefundRow(row)),
        snapshot: this.sanitizeUnifiedOrderSnapshot(order.businessSnapshot),
        timeline: { createdAt: order.createdAt, paidAt: order.paidAt, expiresAt: order.expiresAt, closedAt: order.closedAt, updatedAt: order.updatedAt }
      };
    }

    const builder = this.dataSource.getRepository(MallOrder).createQueryBuilder("order")
      .leftJoinAndSelect("order.tenant", "tenant")
      .leftJoinAndSelect("order.user", "user")
      .leftJoinAndSelect("order.merchant", "merchant")
      .where("order.id = :id", { id });
    if (tenantId) builder.andWhere("order.tenantId = :tenantId", { tenantId });
    await this.applyUnifiedMallOrderScope(builder, "merchant", admin);
    const order = await builder.getOne();
    if (!order) throw new NotFoundException("统一订单不存在");
    const [items, payments, refunds] = await Promise.all([
      this.dataSource.getRepository(MallOrderItem).createQueryBuilder("item").where("item.orderId = :id", { id }).orderBy("item.id", "ASC").getMany(),
      this.dataSource.getRepository(MallPaymentTransaction).createQueryBuilder("payment").where("payment.orderId = :id", { id }).orderBy("payment.id", "ASC").getMany(),
      this.dataSource.getRepository(MallRefund).createQueryBuilder("refund").where("refund.orderId = :id", { id }).orderBy("refund.id", "ASC").getMany()
    ]);
    return {
      ...this.unifiedOrderRow("mall", order),
      business: { merchant: order.merchant ? { id: order.merchant.id, code: order.merchant.code, name: order.merchant.name } : null, fulfillmentStatus: order.fulfillmentStatus, totalQuantity: order.totalQuantity, shippedQuantity: order.shippedQuantity },
      pricing: { originalAmountFen: yuanToFen(order.goodsAmount) + yuanToFen(order.freightAmount), goodsAmountFen: yuanToFen(order.goodsAmount), freightAmountFen: yuanToFen(order.freightAmount), discountAmountFen: yuanToFen(order.discountAmount), pointsDiscountAmountFen: yuanToFen(order.pointsDiscountAmount), pointsUsed: order.pointsUsed },
      items: items.map((item) => ({ id: item.id, productTitle: item.productTitle, skuName: item.skuName, coverUrl: item.coverUrl, priceFen: yuanToFen(item.price), quantity: item.quantity, totalAmountFen: yuanToFen(item.totalAmount) })),
      payments: payments.map((row) => this.unifiedPaymentRow(row)),
      refunds: refunds.map((row) => this.unifiedRefundRow(row)),
      snapshot: this.sanitizeUnifiedOrderSnapshot(order.businessSnapshot),
      timeline: { createdAt: order.createdAt, paidAt: order.paidAt, shippedAt: order.shippedAt, completedAt: order.completedAt, expiresAt: order.expiresAt, closedAt: order.closedAt, updatedAt: order.updatedAt }
    };
  }

  async exportUnifiedOrders(query: { businessType?: string; keyword?: string; status?: string }, admin?: AdminContext) {
    const first = await this.unifiedOrders({ ...query, page: 1, pageSize: 100 }, admin);
    if (first.total > 10000) throw new BadRequestException("统一订单超过 10000 条，请缩小筛选范围后导出");
    const rows = [...first.items];
    for (let page = 2; rows.length < first.total; page += 1) rows.push(...(await this.unifiedOrders({ ...query, page, pageSize: 100 }, admin)).items);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("统一订单");
    sheet.columns = [
      { header: "业务", key: "businessLabel", width: 14 }, { header: "订单号", key: "orderNo", width: 28 }, { header: "业务对象", key: "title", width: 30 },
      { header: "用户ID", key: "userId", width: 12 }, { header: "用户", key: "user", width: 20 }, { header: "手机号（脱敏）", key: "phone", width: 18 },
      { header: "金额（分）", key: "amountFen", width: 14 }, { header: "金额（元）", key: "amount", width: 14 }, { header: "支付方式", key: "paymentMethod", width: 14 },
      { header: "状态", key: "status", width: 18 }, { header: "支付流水号", key: "transactionNo", width: 28 }, { header: "所属商家", key: "tenant", width: 24 }, { header: "创建时间", key: "createdAt", width: 24 }
    ];
    rows.forEach((row) => sheet.addRow({ ...row, userId: row.user?.id || null, user: row.user?.nickname || "", phone: row.user?.phone || "", amount: fenToYuan(row.amountFen), tenant: row.tenant?.name || "平台" }));
    await this.logExport(admin, "unified_orders", rows.length, query);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private unifiedOrderBusinessTypes(admin?: AdminContext) {
    const permissions = effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions });
    const types: string[] = [];
    if (permissions.includes("order.view")) types.push("activity");
    if (permissions.includes("course_order.view")) types.push("course");
    if (permissions.includes("mall.order.view")) types.push("mall");
    return types;
  }

  private unifiedOrderRow(type: "activity" | "course" | "mall", order: any) {
    const activity = type === "activity" ? order.registration?.activity : null;
    const course = type === "course" ? order.course : null;
    const merchant = type === "mall" ? order.merchant : null;
    const user = type === "activity" ? order.registration?.user : order.user;
    const tenant = type === "activity" ? order.tenant || activity?.tenant : type === "course" ? course?.tenant : order.tenant;
    return {
      businessType: type,
      businessLabel: type === "activity" ? "活动报名" : type === "course" ? "课程" : "商城",
      id: order.id,
      orderNo: order.orderNo,
      amountFen: Number(order.amountFen || 0),
      status: order.status,
      paymentMethod: order.paymentMethod,
      transactionNo: order.transactionNo || null,
      tenant: tenant ? { id: tenant.id, code: tenant.code, name: tenant.name } : null,
      user: user ? { id: user.id, nickname: user.nickname || null, phone: maskPhone(user.phone) } : null,
      title: activity?.title || course?.title || merchant?.name || "商城订单",
      createdAt: order.createdAt
    };
  }

  private unifiedPaymentRow(row: any) {
    return { id: row.id, transactionNo: row.transactionNo, provider: row.provider, paymentMethod: row.paymentMethod, amountFen: Number(row.amountFen || 0), status: row.status, reconciliationStatus: row.reconciliationStatus || null, createdAt: row.createdAt };
  }

  private unifiedRefundRow(row: any) {
    return { id: row.id, refundNo: row.refundNo, type: row.type || "refund", amountFen: Number(row.amountFen || 0), status: row.status, reason: row.reason || null, providerRefundNo: row.providerRefundNo || null, completedAt: row.completedAt || null, createdAt: row.createdAt };
  }

  private sanitizeUnifiedOrderSnapshot(value: unknown): unknown {
    const safe = sanitizeAuditValue(value);
    const walk = (item: unknown, key = ""): unknown => {
      if (Array.isArray(item)) return item.map((child) => walk(child, key));
      if (!item || typeof item !== "object") {
        if (/phone|mobile|tel/i.test(key)) return maskPhone(String(item || ""));
        if (/address|detail/i.test(key) && item) return "[已隐藏]";
        return item;
      }
      return Object.fromEntries(Object.entries(item as Record<string, unknown>)
        .filter(([childKey]) => !/address|receiver|contact/i.test(childKey))
        .map(([childKey, child]) => [childKey, walk(child, childKey)]));
    };
    return walk(safe);
  }

  private async applyUnifiedMallOrderScope(builder: SelectQueryBuilder<any>, merchantAlias: string, admin?: AdminContext) {
    const platformWide = ["super_admin", "admin", "finance"].includes(String(admin?.role || "")) && !admin?.tenantId;
    if (!admin?.id || platformWide) return;
    const accessRows = await this.dataSource.getRepository(AdminMallMerchantAccess).find({ where: { admin: { id: admin.id }, enabled: true } });
    const ids = Array.from(new Set(accessRows.map((row) => Number(row.merchant.id)).filter((id) => id > 0)));
    if (!ids.length) builder.andWhere("1 = 0");
    else builder.andWhere(`${merchantAlias}.id IN (:...unifiedOrderMerchantIds)`, { unifiedOrderMerchantIds: ids });
  }

  async unifiedFunds(query: { sourceType?: string; keyword?: string; status?: string; direction?: string; page?: number; pageSize?: number }, admin?: AdminContext) {
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId || undefined : undefined;
    const sourceType = String(query.sourceType || "").trim();
    const rows: any[] = [];
    if (!sourceType || sourceType === "activity_payment") {
      const builder = this.paymentTransactions.createQueryBuilder("row").leftJoinAndSelect("row.order", "order").leftJoinAndSelect("row.tenant", "tenant");
      builder.andWhere("row.businessType = :activityBusinessType", { activityBusinessType: "activity" });
      if (tenantId) builder.andWhere("row.tenantId = :tenantId", { tenantId });
      for (const row of await builder.getMany()) rows.push({ sourceType: "activity_payment", sourceLabel: "活动支付", flowNo: row.transactionNo, businessOrderNo: row.businessOrderNo || row.order?.orderNo, direction: "credit", amountFen: Number(row.amountFen || 0), status: row.status, reconciliationStatus: row.reconciliationStatus, tenant: row.tenant, createdAt: row.createdAt });
    }
    if (!sourceType || sourceType === "course_payment") {
      const builder = this.paymentTransactions.createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant").andWhere("row.businessType = :courseBusinessType", { courseBusinessType: "course" });
      if (tenantId) builder.andWhere("row.tenantId = :tenantId", { tenantId });
      for (const row of await builder.getMany()) rows.push({ sourceType: "course_payment", sourceLabel: "课程支付", flowNo: row.transactionNo, businessOrderNo: row.businessOrderNo, direction: "credit", amountFen: Number(row.amountFen || 0), status: row.status, reconciliationStatus: row.reconciliationStatus, tenant: row.tenant, createdAt: row.createdAt });
    }
    if (!sourceType || sourceType === "course_refund") {
      const builder = this.dataSource.getRepository(CourseRefund).createQueryBuilder("row").leftJoinAndSelect("row.order", "order").leftJoinAndSelect("order.course", "course").leftJoinAndSelect("course.tenant", "tenant");
      if (tenantId) builder.andWhere("course.tenantId = :tenantId", { tenantId });
      for (const row of await builder.getMany()) rows.push({ sourceType: "course_refund", sourceLabel: "课程退款", flowNo: row.refundNo, businessOrderNo: row.order?.orderNo, direction: "debit", amountFen: Number(row.amountFen || 0), status: row.status, reconciliationStatus: row.providerRefundNo || row.failureReason || null, tenant: row.order?.course?.tenant || null, createdAt: row.createdAt });
    }
    if (!sourceType || sourceType === "activity_refund") {
      const builder = this.refunds.createQueryBuilder("row").leftJoinAndSelect("row.order", "order").leftJoinAndSelect("row.tenant", "tenant");
      if (tenantId) builder.andWhere("row.tenantId = :tenantId", { tenantId });
      for (const row of await builder.getMany()) rows.push({ sourceType: "activity_refund", sourceLabel: "活动退款", flowNo: row.refundNo, businessOrderNo: row.order?.orderNo, direction: "debit", amountFen: Number(row.amountFen || 0), status: row.status, reconciliationStatus: row.providerRefundStatus, tenant: row.tenant, createdAt: row.createdAt });
    }
    if (!sourceType || sourceType === "mall_payment") {
      const builder = this.dataSource.getRepository(MallPaymentTransaction).createQueryBuilder("row").leftJoinAndSelect("row.order", "order").leftJoinAndSelect("row.tenant", "tenant");
      if (tenantId) builder.andWhere("row.tenantId = :tenantId", { tenantId });
      for (const row of await builder.getMany()) rows.push({ sourceType: "mall_payment", sourceLabel: "商城支付", flowNo: row.transactionNo, businessOrderNo: row.businessOrderNo || row.order?.orderNo, direction: "credit", amountFen: Number(row.amountFen || 0), status: row.status, reconciliationStatus: row.reconciliationStatus, tenant: row.tenant, createdAt: row.createdAt });
    }
    if (!sourceType || sourceType === "mall_refund") {
      const builder = this.dataSource.getRepository(MallRefund).createQueryBuilder("row").leftJoinAndSelect("row.order", "order").leftJoinAndSelect("row.tenant", "tenant");
      if (tenantId) builder.andWhere("row.tenantId = :tenantId", { tenantId });
      for (const row of await builder.getMany()) rows.push({ sourceType: "mall_refund", sourceLabel: "商城退款", flowNo: row.refundNo, businessOrderNo: row.order?.orderNo, direction: "debit", amountFen: Number(row.amountFen || 0), status: row.status, reconciliationStatus: row.providerRefundStatus, tenant: row.tenant, createdAt: row.createdAt });
    }
    if (!sourceType || sourceType === "wallet") {
      const builder = this.walletTransactions.createQueryBuilder("row").leftJoinAndSelect("row.wallet", "wallet").leftJoinAndSelect("row.tenant", "tenant");
      if (tenantId) builder.andWhere("row.tenantId = :tenantId", { tenantId });
      for (const row of await builder.getMany()) rows.push({ sourceType: "wallet", sourceLabel: "钱包流水", flowNo: row.transactionNo, businessOrderNo: row.order?.orderNo || row.idempotencyKey, direction: row.direction, amountFen: Number(row.amountFen || 0), status: row.status, reconciliationStatus: row.entryHash ? "hash_linked" : "hash_pending", tenant: row.tenant, createdAt: row.createdAt });
    }
    if (!sourceType || sourceType === "commission") {
      const builder = this.dataSource.getRepository(MallCommission).createQueryBuilder("row").leftJoinAndSelect("row.order", "order").leftJoinAndSelect("row.tenant", "tenant");
      if (tenantId) builder.andWhere("row.tenantId = :tenantId", { tenantId });
      for (const row of await builder.getMany()) rows.push({ sourceType: "commission", sourceLabel: "商城佣金", flowNo: row.code, businessOrderNo: row.order?.orderNo, direction: "debit", amountFen: yuanToFen(row.commissionAmount), status: row.status, reconciliationStatus: null, tenant: row.tenant, createdAt: row.createdAt });
    }
    if (!sourceType || sourceType === "settlement") {
      const builder = this.dataSource.getRepository(MallSettlement).createQueryBuilder("row").leftJoinAndSelect("row.tenant", "tenant");
      if (tenantId) builder.andWhere("row.tenantId = :tenantId", { tenantId });
      for (const row of await builder.getMany()) rows.push({ sourceType: "settlement", sourceLabel: "商城结算", flowNo: row.settlementNo, businessOrderNo: `${row.periodStart}~${row.periodEnd}`, direction: "debit", amountFen: yuanToFen(row.payableAmount), status: row.status, reconciliationStatus: row.paidReference || null, tenant: row.tenant, createdAt: row.createdAt });
    }
    const keyword = String(query.keyword || "").trim().toLowerCase();
    const filtered = rows.filter((row) => (!query.status || row.status === query.status) && (!query.direction || row.direction === query.direction) && (!keyword || [row.flowNo, row.businessOrderNo, row.sourceLabel, row.tenant?.name].some((value) => String(value || "").toLowerCase().includes(keyword)))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize || 20)));
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);
    const creditFen = filtered.filter((row) => row.direction === "credit").reduce((sum, row) => sum + row.amountFen, 0);
    const debitFen = filtered.filter((row) => row.direction === "debit").reduce((sum, row) => sum + row.amountFen, 0);
    return { items, total: filtered.length, page, pageSize, summary: { creditFen, debitFen, netFen: creditFen - debitFen } };
  }

  async exportUnifiedFunds(query: { sourceType?: string; keyword?: string; status?: string; direction?: string }, admin?: AdminContext) {
    const first = await this.unifiedFunds({ ...query, page: 1, pageSize: 100 }, admin);
    const rows = [...first.items];
    for (let page = 2; rows.length < first.total; page += 1) rows.push(...(await this.unifiedFunds({ ...query, page, pageSize: 100 }, admin)).items);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("统一资金流水");
    sheet.columns = [
      { header: "来源", key: "sourceLabel", width: 16 }, { header: "资金流水号", key: "flowNo", width: 30 }, { header: "业务编号", key: "businessOrderNo", width: 28 },
      { header: "方向", key: "direction", width: 10 }, { header: "金额（分）", key: "amountFen", width: 14 }, { header: "金额（元）", key: "amount", width: 14 },
      { header: "状态", key: "status", width: 16 }, { header: "对账/关联状态", key: "reconciliationStatus", width: 20 }, { header: "所属商家", key: "tenant", width: 22 }, { header: "发生时间", key: "createdAt", width: 24 }
    ];
    rows.forEach((row) => sheet.addRow({ ...row, direction: row.direction === "credit" ? "收入" : "支出", amount: fenToYuan(row.amountFen), tenant: row.tenant?.name || "平台" }));
    sheet.addRow({ sourceLabel: "汇总", direction: "收入", amountFen: first.summary.creditFen, amount: fenToYuan(first.summary.creditFen) });
    sheet.addRow({ sourceLabel: "汇总", direction: "支出", amountFen: first.summary.debitFen, amount: fenToYuan(first.summary.debitFen) });
    sheet.addRow({ sourceLabel: "汇总", direction: "净额", amountFen: first.summary.netFen, amount: fenToYuan(first.summary.netFen) });
    await this.logExport(admin, "unified_funds", rows.length, query);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async unifiedFundConsistency(admin?: AdminContext) {
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId || undefined : undefined;
    const issues: Array<Record<string, unknown>> = [];
    const activityOrders = this.orders.createQueryBuilder("order").leftJoinAndSelect("order.tenant", "tenant");
    if (tenantId) activityOrders.andWhere("order.tenantId = :tenantId", { tenantId });
    const activityOrderRows = await activityOrders.getMany();
    const activityOrderIds = activityOrderRows.map((order) => order.id);
    const activityPaymentRows = activityOrderIds.length ? await this.paymentTransactions.createQueryBuilder("payment")
      .select("payment.orderId", "orderId").addSelect("COALESCE(SUM(payment.amountFen), 0)", "amountFen")
      .where("payment.status = :status", { status: "success" }).andWhere("payment.orderId IN (:...orderIds)", { orderIds: activityOrderIds })
      .groupBy("payment.orderId").getRawMany<{ orderId: string; amountFen: string }>() : [];
    const activityRefundRows = activityOrderIds.length ? await this.refunds.createQueryBuilder("refund")
      .select("refund.orderId", "orderId").addSelect("COALESCE(SUM(refund.amountFen), 0)", "amountFen")
      .where("refund.status = :status", { status: "completed" }).andWhere("refund.orderId IN (:...orderIds)", { orderIds: activityOrderIds })
      .groupBy("refund.orderId").getRawMany<{ orderId: string; amountFen: string }>() : [];
    const activityPaidByOrder = new Map(activityPaymentRows.map((row) => [Number(row.orderId), Number(row.amountFen || 0)]));
    const activityRefundedByOrder = new Map(activityRefundRows.map((row) => [Number(row.orderId), Number(row.amountFen || 0)]));
    for (const order of activityOrderRows) {
      const paidFen = activityPaidByOrder.get(order.id) || 0;
      const refundedFen = activityRefundedByOrder.get(order.id) || 0;
      if ([OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded].includes(order.status) && paidFen !== Number(order.amountFen || 0)) issues.push({ type: "activity_payment_amount", orderNo: order.orderNo, expectedFen: order.amountFen, actualFen: paidFen });
      if (refundedFen > Number(order.amountFen || 0)) issues.push({ type: "activity_refund_overflow", orderNo: order.orderNo, expectedMaxFen: order.amountFen, actualFen: refundedFen });
    }
    const courseOrderBuilder = this.dataSource.getRepository(CourseOrder).createQueryBuilder("order").leftJoinAndSelect("order.course", "course");
    if (tenantId) courseOrderBuilder.andWhere("course.tenantId = :tenantId", { tenantId });
    const courseOrderRows = await courseOrderBuilder.getMany();
    const courseOrderNos = courseOrderRows.map((order) => order.orderNo);
    const coursePaymentRows = courseOrderNos.length ? await this.paymentTransactions.createQueryBuilder("payment")
      .select("payment.businessOrderNo", "orderNo").addSelect("COALESCE(SUM(payment.amountFen), 0)", "amountFen")
      .where("payment.businessType = :businessType", { businessType: "course" }).andWhere("payment.status = :status", { status: "success" }).andWhere("payment.businessOrderNo IN (:...orderNos)", { orderNos: courseOrderNos })
      .groupBy("payment.businessOrderNo").getRawMany<{ orderNo: string; amountFen: string }>() : [];
    const courseRefundRows = courseOrderRows.length ? await this.dataSource.getRepository(CourseRefund).createQueryBuilder("refund")
      .leftJoin("refund.order", "order").select("order.orderNo", "orderNo").addSelect("COALESCE(SUM(refund.amountFen), 0)", "amountFen")
      .where("refund.status = :status", { status: "completed" }).andWhere("order.id IN (:...orderIds)", { orderIds: courseOrderRows.map((order) => order.id) })
      .groupBy("order.orderNo").getRawMany<{ orderNo: string; amountFen: string }>() : [];
    const coursePaidByOrder = new Map(coursePaymentRows.map((row) => [row.orderNo, Number(row.amountFen || 0)]));
    const courseRefundedByOrder = new Map(courseRefundRows.map((row) => [row.orderNo, Number(row.amountFen || 0)]));
    for (const order of courseOrderRows) {
      const amountFen = Number(order.amountFen || yuanToFen(order.amount));
      const paidFen = coursePaidByOrder.get(order.orderNo) || 0;
      const refundedFen = courseRefundedByOrder.get(order.orderNo) || 0;
      if (order.status === CourseOrderStatus.Paid && amountFen > 0 && paidFen !== amountFen) issues.push({ type: "course_payment_amount", orderNo: order.orderNo, expectedFen: amountFen, actualFen: paidFen });
      if (refundedFen > amountFen) issues.push({ type: "course_refund_overflow", orderNo: order.orderNo, expectedMaxFen: amountFen, actualFen: refundedFen });
    }
    const mallOrders = this.dataSource.getRepository(MallOrder).createQueryBuilder("order");
    if (tenantId) mallOrders.andWhere("order.tenantId = :tenantId", { tenantId });
    const mallOrderRows = await mallOrders.getMany();
    const mallOrderIds = mallOrderRows.map((order) => order.id);
    const mallPaymentRepo = this.dataSource.getRepository(MallPaymentTransaction);
    const mallRefundRepo = this.dataSource.getRepository(MallRefund);
    const mallPaymentRows = mallOrderIds.length ? await mallPaymentRepo.createQueryBuilder("payment")
      .select("payment.orderId", "orderId").addSelect("COALESCE(SUM(payment.amountFen), 0)", "amountFen")
      .where("payment.status = :status", { status: "success" }).andWhere("payment.orderId IN (:...orderIds)", { orderIds: mallOrderIds })
      .groupBy("payment.orderId").getRawMany<{ orderId: string; amountFen: string }>() : [];
    const mallRefundRows = mallOrderIds.length ? await mallRefundRepo.createQueryBuilder("refund")
      .select("refund.orderId", "orderId").addSelect("COALESCE(SUM(refund.amountFen), 0)", "amountFen")
      .where("refund.status = :status", { status: "approved" }).andWhere("refund.orderId IN (:...orderIds)", { orderIds: mallOrderIds })
      .groupBy("refund.orderId").getRawMany<{ orderId: string; amountFen: string }>() : [];
    const mallPaidByOrder = new Map(mallPaymentRows.map((row) => [Number(row.orderId), Number(row.amountFen || 0)]));
    const mallRefundedByOrder = new Map(mallRefundRows.map((row) => [Number(row.orderId), Number(row.amountFen || 0)]));
    for (const order of mallOrderRows) {
      const paidFen = mallPaidByOrder.get(order.id) || 0;
      const refundedFen = mallRefundedByOrder.get(order.id) || 0;
      if (["paid", "shipped", "completed", "refund_pending", "refunded"].includes(order.status) && order.paymentMethod !== PaymentMethod.Balance && paidFen !== Number(order.amountFen || 0)) issues.push({ type: "mall_payment_amount", orderNo: order.orderNo, expectedFen: order.amountFen, actualFen: paidFen });
      if (refundedFen > Number(order.amountFen || 0)) issues.push({ type: "mall_refund_overflow", orderNo: order.orderNo, expectedMaxFen: order.amountFen, actualFen: refundedFen });
    }
    const walletBuilder = this.walletTransactions.createQueryBuilder("row").leftJoinAndSelect("row.wallet", "wallet").orderBy("row.walletId", "ASC").addOrderBy("row.id", "ASC");
    if (tenantId) walletBuilder.andWhere("row.tenantId = :tenantId", { tenantId });
    const walletRows = await walletBuilder.getMany();
    for (const walletId of [...new Set(walletRows.map((row) => row.wallet.id))]) {
      const chain = walletRows.filter((row) => row.wallet.id === walletId).map((row) => ({ previousHash: row.previousHash, entryHash: row.entryHash || "", walletId, transactionNo: row.transactionNo, direction: row.direction, type: row.type, amount: row.amount, balanceBefore: row.balanceBefore, balanceAfter: row.balanceAfter, frozenBefore: row.frozenBefore, frozenAfter: row.frozenAfter, giftBefore: row.giftBefore, giftAfter: row.giftAfter, frozenGiftBefore: row.frozenGiftBefore, frozenGiftAfter: row.frozenGiftAfter, idempotencyKey: row.idempotencyKey }));
      if (!verifyWalletLedgerChain(chain)) issues.push({ type: "wallet_hash_chain", walletId, message: "钱包流水哈希链不一致" });
    }
    const settlementBuilder = this.dataSource.getRepository(MallSettlement).createQueryBuilder("settlement").leftJoinAndSelect("settlement.merchant", "merchant");
    if (tenantId) settlementBuilder.andWhere("settlement.tenantId = :tenantId", { tenantId });
    const settlements = await settlementBuilder.getMany();
    for (const settlement of settlements) {
      const snapshot = settlement.snapshot && typeof settlement.snapshot === "object" ? settlement.snapshot as Record<string, unknown> : {};
      const orderIds = Array.isArray(snapshot.orderIds) ? snapshot.orderIds.map(Number).filter(Number.isInteger) : [];
      const refundIds = Array.isArray(snapshot.refundIds) ? snapshot.refundIds.map(Number).filter(Number.isInteger) : [];
      const orders = orderIds.length ? await this.dataSource.getRepository(MallOrder).find({ where: { id: In(orderIds) }, relations: ["merchant"] }) : [];
      const refunds = refundIds.length ? await this.dataSource.getRepository(MallRefund).find({ where: { id: In(refundIds) }, relations: ["order", "order.merchant"] }) : [];
      const orderFen = orders.reduce((sum, row) => sum + Number(row.amountFen || yuanToFen(row.amount)), 0);
      const refundFen = refunds.reduce((sum, row) => sum + Number(row.amountFen || yuanToFen(row.amount)), 0);
      const directOrderFen = orders.filter((row) => row.merchant?.paymentMode === "merchant_direct" && row.paymentMethod !== PaymentMethod.Balance).reduce((sum, row) => sum + Number(row.amountFen || yuanToFen(row.amount)), 0);
      const directRefundFen = refunds.filter((row) => row.order?.merchant?.paymentMode === "merchant_direct" && row.order.paymentMethod !== PaymentMethod.Balance).reduce((sum, row) => sum + Number(row.amountFen || yuanToFen(row.amount)), 0);
      const rate = Math.max(0, Math.min(Number(snapshot.serviceFeeRate || 0), 1));
      const serviceFeeFen = Math.round((orderFen - refundFen) * rate);
      const adjustmentFen = yuanToFen(settlement.adjustmentAmount);
      const payableFen = (orderFen - directOrderFen) - (refundFen - directRefundFen) - serviceFeeFen + adjustmentFen;
      const mismatches = [
        settlement.orderCount !== orders.length ? "orderCount" : "",
        yuanToFen(settlement.orderAmount) !== orderFen ? "orderAmount" : "",
        yuanToFen(settlement.refundAmount) !== refundFen ? "refundAmount" : "",
        yuanToFen(settlement.serviceFeeAmount) !== serviceFeeFen ? "serviceFeeAmount" : "",
        yuanToFen(settlement.payableAmount) !== payableFen ? "payableAmount" : ""
      ].filter(Boolean);
      if (orderIds.length !== new Set(orderIds).size || orders.length !== new Set(orderIds).size || refundIds.length !== new Set(refundIds).size || refunds.length !== new Set(refundIds).size) mismatches.push("snapshotMissingOrDuplicateIds");
      if (mismatches.length) issues.push({ type: "mall_settlement_amount", settlementNo: settlement.settlementNo, mismatches, expected: { orderCount: orders.length, orderFen, refundFen, serviceFeeFen, adjustmentFen, payableFen }, actual: { orderCount: settlement.orderCount, orderFen: yuanToFen(settlement.orderAmount), refundFen: yuanToFen(settlement.refundAmount), serviceFeeFen: yuanToFen(settlement.serviceFeeAmount), adjustmentFen: yuanToFen(settlement.adjustmentAmount), payableFen: yuanToFen(settlement.payableAmount) } });
    }
    return { checkedAt: new Date().toISOString(), healthy: issues.length === 0, issueCount: issues.length, issues: issues.slice(0, 500), truncated: issues.length > 500, checked: { activityOrders: activityOrderRows.length, courseOrders: courseOrderRows.length, mallOrders: mallOrderRows.length, walletTransactions: walletRows.length, mallSettlements: settlements.length } };
  }

  async closeExpiredPendingOrders(now = new Date(), admin?: { id?: number; username?: string }) {
    const rows = await this.orders.find({
      where: { status: OrderStatus.PendingPayment, expiresAt: LessThanOrEqual(now) },
      order: { expiresAt: "ASC" },
      take: 200
    });
    const closed: Order[] = [];
    for (const order of rows) {
      const saved = await this.closeExpiredOrder(order, "订单超时未付款，系统已关闭");
      closed.push(saved);
      await this.createRegistrationNotification(saved.registration, "报名订单已超时", `活动「${saved.registration.activity.title}」的报名订单因超时未付款已关闭，名额已释放。`);
      await this.promoteNextWaitlist(saved.registration.activity.id, admin);
    }
    await this.logOperation(admin, "order.close_expired", "order", null, `Closed expired pending orders: ${closed.length}`, { checkedCount: rows.length, closedCount: closed.length, now: now.toISOString() });
    return { checkedCount: rows.length, closedCount: closed.length, closed };
  }

  async listTicketTypes(activityId?: number, admin?: AdminContext) {
    const builder = this.ticketTypes.createQueryBuilder("ticketType").leftJoinAndSelect("ticketType.activity", "activity").leftJoinAndSelect("ticketType.tenant", "tenant").orderBy("ticketType.id", "DESC");
    this.applyTenantScope(builder, "ticketType", admin);
    if (activityId) builder.andWhere("activity.id = :activityId", { activityId });
    const rows = await builder.getMany();
    return rows.map((row) => this.publicTicketType(row));
  }

  async ticketTypeOptions(admin?: AdminContext) {
    const builder = this.activities.createQueryBuilder("activity").leftJoinAndSelect("activity.tenant", "tenant").orderBy("activity.createdAt", "DESC");
    this.applyTenantScope(builder, "activity", admin);
    const rows = await builder.getMany();
    return { activities: rows.map((row) => ({ id: row.id, title: row.title, status: row.status, tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null })) };
  }

  async saveTicketType(dto: TicketTypeDto, id?: number, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: dto.activityId });
    if (!activity) throw new NotFoundException("活动不存");
    this.assertActivityAccess(activity, admin);
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : activity.tenant;
    this.assertTenantSubscriptionWritable(tenant, admin);
    const row = id ? await this.ticketTypes.findOneBy({ id }) : this.ticketTypes.create();
    if (!row) throw new NotFoundException("票种不存");
    this.assertTenantAccess(row, admin);
    const before = id ? this.ticketTypeAuditSnapshot(row) : null;
    const tierPrices = (dto.tierPrices || []).map((item) => ({ minSold: Math.max(0, Math.floor(Number(item.minSold))), price: Math.max(0, Number(item.price)) })).sort((a, b) => a.minSold - b.minSold);
    if (new Set(tierPrices.map((item) => item.minSold)).size !== tierPrices.length) throw new BadRequestException("阶梯价起始销量不能重复");
    const saleStartsAt = dto.saleStartsAt ? this.parseDate(dto.saleStartsAt) : null;
    const saleEndsAt = dto.saleEndsAt ? this.parseDate(dto.saleEndsAt) : null;
    if (saleStartsAt && saleEndsAt && saleEndsAt <= saleStartsAt) throw new BadRequestException("票种销售结束时间必须晚于开始时间");
    Object.assign(row, { activity, tenant: this.tenantRelation(admin, activity.tenant || row.tenant), name: dto.name.trim(), price: Number(dto.price).toFixed(2), capacity: dto.capacity ?? null, perUserLimit: dto.perUserLimit || 1, saleStartsAt, saleEndsAt, earlyBirdPrice: dto.earlyBirdPrice === undefined ? null : Number(dto.earlyBirdPrice).toFixed(2), earlyBirdEndsAt: dto.earlyBirdEndsAt ? this.parseDate(dto.earlyBirdEndsAt) : null, memberPrice: dto.memberPrice === undefined ? null : Number(dto.memberPrice).toFixed(2), tierPrices: tierPrices.length ? tierPrices : null, enabled: dto.enabled ?? true });
    const saved = await this.ticketTypes.save(row);
    await this.logOperation(admin, id ? "ticket_type.update" : "ticket_type.create", "ticket_type", saved.id, id ? `更新票种：${saved.name}` : `创建票种：${saved.name}`, id ? auditDiff(before, this.ticketTypeAuditSnapshot(saved)) : this.ticketTypeAuditSnapshot(saved));
    return this.publicTicketType(saved);
  }

  async listCoupons(admin?: AdminContext) {
    const builder = this.coupons.createQueryBuilder("coupon").leftJoinAndSelect("coupon.activity", "activity").leftJoinAndSelect("coupon.tenant", "tenant").orderBy("coupon.createdAt", "DESC");
    this.applyTenantScope(builder, "coupon", admin);
    return (await builder.getMany()).map((row) => this.publicActivityCoupon(row));
  }

  async couponOptions(admin?: AdminContext) {
    const builder = this.activities.createQueryBuilder("activity").leftJoinAndSelect("activity.tenant", "tenant").orderBy("activity.createdAt", "DESC");
    this.applyTenantScope(builder, "activity", admin);
    const rows = await builder.getMany();
    return { activities: rows.map((row) => ({ id: row.id, title: row.title, status: row.status, tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null })) };
  }

  async listCouponClaims(query: CouponRecordQueryDto = {}, admin?: AdminContext) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.dataSource.getRepository(CouponClaim).createQueryBuilder("claim")
      .leftJoinAndSelect("claim.coupon", "coupon")
      .leftJoinAndSelect("coupon.activity", "activity")
      .leftJoinAndSelect("claim.user", "user")
      .leftJoinAndSelect("claim.tenant", "tenant")
      .orderBy("claim.createdAt", "DESC");
    this.applyTenantScope(builder, "claim", admin);
    applyAdminActivityDataScope(builder, "coupon", admin?.dataScope);
    if (query.couponId) builder.andWhere("coupon.id = :couponId", { couponId: query.couponId });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((row) => this.publicCouponClaimRecord(row)), total, page, pageSize };
  }

  async listCouponUsages(query: CouponRecordQueryDto = {}, admin?: AdminContext) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.dataSource.getRepository(CouponUsage).createQueryBuilder("usage")
      .leftJoinAndSelect("usage.coupon", "coupon")
      .leftJoinAndSelect("coupon.activity", "activity")
      .leftJoinAndSelect("usage.order", "order")
      .leftJoinAndSelect("usage.user", "user")
      .leftJoinAndSelect("usage.tenant", "tenant")
      .orderBy("usage.createdAt", "DESC");
    this.applyTenantScope(builder, "usage", admin);
    applyAdminActivityDataScope(builder, "coupon", admin?.dataScope);
    if (query.couponId) builder.andWhere("coupon.id = :couponId", { couponId: query.couponId });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((row) => this.publicCouponUsageRecord(row)), total, page, pageSize };
  }

  async exportCoupons(admin?: AdminContext) {
    const couponBuilder = this.coupons.createQueryBuilder("coupon").leftJoinAndSelect("coupon.activity", "activity").leftJoinAndSelect("coupon.tenant", "tenant").orderBy("coupon.createdAt", "DESC").take(10000);
    const claimBuilder = this.dataSource.getRepository(CouponClaim).createQueryBuilder("claim").leftJoinAndSelect("claim.coupon", "coupon").leftJoinAndSelect("coupon.activity", "activity").leftJoinAndSelect("claim.user", "user").leftJoinAndSelect("claim.tenant", "tenant").orderBy("claim.createdAt", "DESC").take(10000);
    const usageBuilder = this.dataSource.getRepository(CouponUsage).createQueryBuilder("usage").leftJoinAndSelect("usage.coupon", "coupon").leftJoinAndSelect("coupon.activity", "activity").leftJoinAndSelect("usage.order", "order").leftJoinAndSelect("usage.user", "user").leftJoinAndSelect("usage.tenant", "tenant").orderBy("usage.createdAt", "DESC").take(10000);
    this.applyTenantScope(couponBuilder, "coupon", admin);
    this.applyTenantScope(claimBuilder, "claim", admin);
    this.applyTenantScope(usageBuilder, "usage", admin);
    applyAdminActivityDataScope(claimBuilder, "coupon", admin?.dataScope);
    applyAdminActivityDataScope(usageBuilder, "coupon", admin?.dataScope);
    const [couponEntities, claimEntities, usageEntities] = await Promise.all([couponBuilder.getMany(), claimBuilder.getMany(), usageBuilder.getMany()]);
    const coupons = couponEntities.map((row) => this.publicActivityCoupon(row));
    const claims = claimEntities.map((row) => this.publicCouponClaimRecord(row));
    const usages = usageEntities.map((row) => this.publicCouponUsageRecord(row));
    const workbook = new ExcelJS.Workbook();
    const couponSheet = workbook.addWorksheet("活动优惠券");
    couponSheet.columns = [
      { header: "ID", key: "id", width: 10 }, { header: "券码", key: "code", width: 20 }, { header: "名称", key: "name", width: 28 },
      { header: "限定活动", key: "activity", width: 32 }, { header: "优惠类型", key: "discountType", width: 14 }, { header: "优惠值", key: "discountValue", width: 14 },
      { header: "门槛", key: "minAmount", width: 14 }, { header: "领取方式", key: "claimMode", width: 14 }, { header: "已领取", key: "claimedCount", width: 12 },
      { header: "已使用", key: "usedCount", width: 12 }, { header: "总量", key: "usageLimit", width: 12 }, { header: "每人上限", key: "perUserLimit", width: 12 },
      { header: "启用", key: "enabled", width: 10 }, { header: "开始时间", key: "startsAt", width: 22 }, { header: "结束时间", key: "endsAt", width: 22 }
    ];
    coupons.forEach((row) => couponSheet.addRow({ ...row, activity: row.activity?.title || "全活动通用", enabled: row.enabled ? "是" : "否", startsAt: this.exportDate(row.startsAt), endsAt: this.exportDate(row.endsAt) }));
    const claimSheet = workbook.addWorksheet("领取记录");
    claimSheet.columns = [
      { header: "记录ID", key: "id", width: 12 }, { header: "优惠券", key: "coupon", width: 30 }, { header: "会员", key: "user", width: 24 },
      { header: "手机号", key: "phone", width: 18 }, { header: "领取次数", key: "claimedCount", width: 14 }, { header: "使用次数", key: "usedCount", width: 14 }, { header: "领取时间", key: "createdAt", width: 22 }
    ];
    claims.forEach((row) => claimSheet.addRow({ ...row, coupon: `${row.coupon.code} / ${row.coupon.name}`, user: row.user.nickname || `会员 #${row.user.id}`, phone: row.user.phone, createdAt: this.exportDate(row.createdAt) }));
    const usageSheet = workbook.addWorksheet("使用记录");
    usageSheet.columns = [
      { header: "记录ID", key: "id", width: 12 }, { header: "优惠券", key: "coupon", width: 30 }, { header: "订单号", key: "orderNo", width: 24 },
      { header: "会员", key: "user", width: 24 }, { header: "手机号", key: "phone", width: 18 }, { header: "优惠金额", key: "discountAmount", width: 14 },
      { header: "状态", key: "status", width: 12 }, { header: "释放原因", key: "releaseReason", width: 34 }, { header: "使用时间", key: "createdAt", width: 22 }
    ];
    usages.forEach((row) => usageSheet.addRow({ ...row, coupon: `${row.coupon.code} / ${row.coupon.name}`, orderNo: row.order?.orderNo || "", user: row.user.nickname || `会员 #${row.user.id}`, phone: row.user.phone, createdAt: this.exportDate(row.createdAt) }));
    for (const sheet of [couponSheet, claimSheet, usageSheet]) { sheet.getRow(1).font = { bold: true }; sheet.views = [{ state: "frozen", ySplit: 1 }]; }
    await this.logExport(admin, "activity_coupons", coupons.length + claims.length + usages.length, {});
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async saveCoupon(dto: CouponDto, id?: number, admin?: AdminContext) {
    if (!["fixed", "percent"].includes(dto.discountType)) throw new BadRequestException("优惠类型不正确");
    if (Number(dto.discountValue) <= 0) throw new BadRequestException("优惠值必须大于 0");
    if (dto.discountType === "percent" && dto.discountValue > 100) throw new BadRequestException("折扣比例不能超过 100");
    const code = dto.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,64}$/.test(code)) throw new BadRequestException("优惠码需为 3-64 位字母、数字、下划线或短横线");
    const activity = dto.activityId ? await this.activities.findOneBy({ id: dto.activityId }) : null;
    if (dto.activityId && !activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    const row = id ? await this.coupons.findOneBy({ id }) : this.coupons.create();
    if (!row) throw new NotFoundException("优惠码不存在");
    if (id) this.assertStrictTenantOwnership(row, admin, "优惠码不存在或不属于当前商家");
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : id ? row.tenant || null : activity?.tenant || null;
    if (activity && (activity.tenant?.id || null) !== (tenant?.id || null)) throw new BadRequestException("限定活动与优惠码所属商家不一致");
    this.assertTenantSubscriptionWritable(tenant, admin);
    const duplicateBuilder = this.coupons.createQueryBuilder("coupon").where("coupon.code = :code", { code });
    if (tenant?.id) duplicateBuilder.andWhere("coupon.tenantId = :tenantId", { tenantId: tenant.id }); else duplicateBuilder.andWhere("coupon.tenantId IS NULL");
    if (id) duplicateBuilder.andWhere("coupon.id <> :id", { id });
    if (await duplicateBuilder.getOne()) throw new BadRequestException("当前商家已存在相同优惠码");
    const before = id ? this.couponAuditSnapshot(row) : null;
    Object.assign(row, {
      code,
      tenant: this.tenantRelation(admin, tenant),
      name: dto.name.trim(),
      discountType: dto.discountType,
      discountValue: Number(dto.discountValue).toFixed(2),
      minAmount: Number(dto.minAmount || 0).toFixed(2),
      usageLimit: dto.usageLimit ?? null,
      claimMode: dto.claimMode === "claim" ? "claim" : "code",
      perUserLimit: Math.max(Number(dto.perUserLimit || 1), 1),
      activity,
      enabled: dto.enabled ?? true,
      startsAt: dto.startsAt ? this.parseDate(dto.startsAt) : null,
      endsAt: dto.endsAt ? this.parseDate(dto.endsAt) : null
    });
    if (row.startsAt && row.endsAt && row.endsAt <= row.startsAt) throw new BadRequestException("优惠码结束时间必须晚于开始时间");
    if (row.usageLimit !== null && row.usageLimit < Math.max(Number(row.claimedCount || 0), Number(row.usedCount || 0))) throw new BadRequestException("优惠码总次数不能小于已领取或已使用次数");
    const saved = await this.coupons.save(row);
    await this.logOperation(admin, id ? "coupon.update" : "coupon.create", "coupon", saved.id, `${id ? "更新" : "创建"}活动优惠券：${saved.code}`, id ? auditDiff(before, this.couponAuditSnapshot(saved)) : this.couponAuditSnapshot(saved));
    return this.publicActivityCoupon(saved);
  }

  async listRedemptionCodes(admin?: AdminContext) {
    const builder = this.dataSource.getRepository(RedemptionCode).createQueryBuilder("code").leftJoinAndSelect("code.tenant", "tenant").orderBy("code.createdAt", "DESC");
    this.applyTenantScope(builder, "code", admin);
    return (await builder.getMany()).map((row) => this.publicRedemptionCode(row));
  }

  async redemptionCodeOptions(admin?: AdminContext) {
    const activityCouponBuilder = this.coupons.createQueryBuilder("coupon").leftJoinAndSelect("coupon.activity", "activity").leftJoinAndSelect("coupon.tenant", "tenant").orderBy("coupon.createdAt", "DESC");
    const mallCouponBuilder = this.dataSource.getRepository(MallCoupon).createQueryBuilder("coupon").leftJoinAndSelect("coupon.merchant", "merchant").leftJoinAndSelect("coupon.tenant", "tenant").orderBy("coupon.createdAt", "DESC");
    const courseBuilder = this.courses.createQueryBuilder("course").leftJoinAndSelect("course.tenant", "tenant").orderBy("course.createdAt", "DESC");
    this.applyTenantScope(activityCouponBuilder, "coupon", admin);
    this.applyTenantScope(mallCouponBuilder, "coupon", admin);
    this.applyTenantScope(courseBuilder, "course", admin);
    const [activityCoupons, mallCoupons, courses] = await Promise.all([activityCouponBuilder.getMany(), mallCouponBuilder.getMany(), courseBuilder.getMany()]);
    return {
      activityCoupons: activityCoupons.map((row) => ({ id: row.id, code: row.code, name: row.name, enabled: row.enabled, activity: row.activity ? { id: row.activity.id, title: row.activity.title } : null })),
      mallCoupons: mallCoupons.map((row) => ({ id: row.id, code: row.code, name: row.name, enabled: row.enabled, merchant: row.merchant ? { id: row.merchant.id, name: row.merchant.name } : null })),
      courses: courses.map((row) => ({ id: row.id, title: row.title, status: row.status, accessMode: row.accessMode }))
    };
  }

  async listRedemptionCodeUsages(query: RedemptionCodeUsageQueryDto = {}, admin?: AdminContext) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.dataSource.getRepository(RedemptionCodeUsage).createQueryBuilder("usage").leftJoinAndSelect("usage.redemptionCode", "code").leftJoinAndSelect("usage.user", "user").leftJoinAndSelect("usage.tenant", "tenant").orderBy("usage.createdAt", "DESC");
    this.applyTenantScope(builder, "usage", admin);
    if (query.redemptionCodeId) builder.andWhere("code.id = :redemptionCodeId", { redemptionCodeId: query.redemptionCodeId });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: rows.map((row) => this.publicRedemptionUsageRecord(row)), total, page, pageSize };
  }

  async exportRedemptionCodes(admin?: AdminContext) {
    const codeBuilder = this.dataSource.getRepository(RedemptionCode).createQueryBuilder("code").leftJoinAndSelect("code.tenant", "tenant").orderBy("code.createdAt", "DESC").take(10000);
    const usageBuilder = this.dataSource.getRepository(RedemptionCodeUsage).createQueryBuilder("usage").leftJoinAndSelect("usage.redemptionCode", "code").leftJoinAndSelect("usage.user", "user").leftJoinAndSelect("usage.tenant", "tenant").orderBy("usage.createdAt", "DESC").take(10000);
    this.applyTenantScope(codeBuilder, "code", admin);
    this.applyTenantScope(usageBuilder, "usage", admin);
    const [codeEntities, usageEntities] = await Promise.all([codeBuilder.getMany(), usageBuilder.getMany()]);
    const codes = codeEntities.map((row) => this.publicRedemptionCode(row));
    const usages = usageEntities.map((row) => this.publicRedemptionUsageRecord(row));
    const workbook = new ExcelJS.Workbook();
    const codeSheet = workbook.addWorksheet("统一兑换码");
    codeSheet.columns = [
      { header: "ID", key: "id", width: 10 }, { header: "兑换码", key: "code", width: 20 }, { header: "名称", key: "name", width: 28 },
      { header: "权益类型", key: "targetType", width: 18 }, { header: "目标ID", key: "targetId", width: 12 }, { header: "积分", key: "points", width: 12 },
      { header: "已兑换", key: "usedCount", width: 12 }, { header: "总次数", key: "usageLimit", width: 12 }, { header: "每人上限", key: "perUserLimit", width: 12 },
      { header: "启用", key: "enabled", width: 10 }, { header: "开始时间", key: "startsAt", width: 22 }, { header: "结束时间", key: "endsAt", width: 22 }
    ];
    codes.forEach((row) => codeSheet.addRow({ ...row, enabled: row.enabled ? "是" : "否", startsAt: this.exportDate(row.startsAt), endsAt: this.exportDate(row.endsAt) }));
    const usageSheet = workbook.addWorksheet("兑换记录");
    usageSheet.columns = [
      { header: "记录ID", key: "id", width: 12 }, { header: "兑换码", key: "code", width: 30 }, { header: "会员", key: "user", width: 24 },
      { header: "手机号", key: "phone", width: 18 }, { header: "兑换次数", key: "usedCount", width: 14 }, { header: "首次兑换", key: "createdAt", width: 22 }, { header: "最近兑换", key: "updatedAt", width: 22 }
    ];
    usages.forEach((row) => usageSheet.addRow({ ...row, code: `${row.redemptionCode.code} / ${row.redemptionCode.name}`, user: row.user.nickname || `会员 #${row.user.id}`, phone: row.user.phone, createdAt: this.exportDate(row.createdAt), updatedAt: this.exportDate(row.updatedAt) }));
    for (const sheet of [codeSheet, usageSheet]) { sheet.getRow(1).font = { bold: true }; sheet.views = [{ state: "frozen", ySplit: 1 }]; }
    await this.logExport(admin, "redemption_codes", codes.length + usages.length, {});
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async saveRedemptionCode(input: RedemptionCodeDto, id?: number, admin?: AdminContext) {
    const repo = this.dataSource.getRepository(RedemptionCode);
    const row = id ? await repo.findOne({ where: { id } }) : repo.create();
    if (!row) throw new NotFoundException("兑换码不存在");
    if (id) this.assertStrictTenantOwnership(row, admin, "兑换码不存在或不属于当前商家");
    const tenant = row.tenant || await loadOperationSettingTenantForCreate(admin, (tenantId) => this.tenants.findOneBy({ id: tenantId }));
    this.assertTenantSubscriptionWritable(tenant, admin);
    const code = String(input.code || "").trim().toUpperCase(); const name = String(input.name || "").trim(); const targetType = String(input.targetType || "");
    if (!/^[A-Z0-9_-]{3,64}$/.test(code)) throw new BadRequestException("兑换码需为 3-64 位字母、数字、下划线或短横线");
    if (!name) throw new BadRequestException("请填写兑换码名称");
    if (!["activity_coupon", "mall_coupon", "course_access", "points"].includes(targetType)) throw new BadRequestException("兑换权益类型不正确");
    if (targetType !== "points" && !Number(input.targetId)) throw new BadRequestException("请选择兑换目标");
    if (targetType === "points" && Number(input.points || 0) <= 0) throw new BadRequestException("兑换积分必须大于 0");
    const duplicateBuilder = repo.createQueryBuilder("code").where("code.code = :code", { code });
    if (tenant?.id) duplicateBuilder.andWhere("code.tenantId = :tenantId", { tenantId: tenant.id }); else duplicateBuilder.andWhere("code.tenantId IS NULL");
    if (id) duplicateBuilder.andWhere("code.id <> :id", { id });
    if (await duplicateBuilder.getOne()) throw new BadRequestException("当前商家已存在相同兑换码");
    const targetId = targetType === "points" ? null : Number(input.targetId);
    await this.assertRedemptionTarget(targetType, targetId, tenant);
    if (id && row.usedCount > 0) {
      const changedBenefit = row.code !== code || row.targetType !== targetType || Number(row.targetId || 0) !== Number(targetId || 0) || Number(row.points || 0) !== (targetType === "points" ? Math.trunc(Number(input.points)) : 0);
      if (changedBenefit) throw new BadRequestException("已产生兑换记录的兑换码不能修改券码或兑换权益");
    }
    const usageLimit = Math.max(Math.trunc(Number(input.usageLimit || 0)), 0);
    const perUserLimit = Math.max(Math.trunc(Number(input.perUserLimit || 1)), 1);
    if (usageLimit > 0 && usageLimit < Number(row.usedCount || 0)) throw new BadRequestException("总兑换次数不能小于已兑换次数");
    if (id) {
      const maxUserUsage = Number((await this.dataSource.getRepository(RedemptionCodeUsage).createQueryBuilder("usage").select("MAX(usage.usedCount)", "count").where("usage.redemptionCodeId = :id", { id }).getRawOne())?.count || 0);
      if (perUserLimit < maxUserUsage) throw new BadRequestException("每人上限不能小于已有会员兑换次数");
    }
    const before = id ? this.redemptionCodeAuditSnapshot(row) : null;
    Object.assign(row, { tenant: this.tenantRelation(admin, tenant), code, name, targetType, targetId, points: targetType === "points" ? Math.trunc(Number(input.points)) : 0, usageLimit, perUserLimit, enabled: input.enabled !== false, startsAt: input.startsAt ? this.parseDate(input.startsAt) : null, endsAt: input.endsAt ? this.parseDate(input.endsAt) : null });
    if (row.startsAt && row.endsAt && row.endsAt <= row.startsAt) throw new BadRequestException("兑换码结束时间必须晚于开始时间");
    const saved = await repo.save(row);
    await this.logOperation(admin, id ? "redemption_code.update" : "redemption_code.create", "redemption_code", saved.id, `${id ? "更新" : "创建"}兑换码：${saved.code}`, id ? auditDiff(before, this.redemptionCodeAuditSnapshot(saved)) : this.redemptionCodeAuditSnapshot(saved));
    return this.publicRedemptionCode(saved);
  }

  async financeDashboard(query: OrderQueryDto = {}, admin?: AdminContext) {
    const today = this.businessDayRange();
    const [orderCount, paidOrderCount, pendingOrderCount, refundCount, pendingRefundCount, completedRefundCount, pendingReconciliationCount, pendingStatementCount, failedCallbackCount, transactions, refunds, reconciliationItems, callbackLogs, statementRecords, agentSummary] = await Promise.all([
      this.countOrdersForAgent(query, undefined, admin),
      this.countOrdersForAgent(query, OrderStatus.Paid, admin),
      this.countOrdersForAgent(query, OrderStatus.PendingPayment, admin),
      this.countRefundsForAgent(query, undefined, admin),
      this.countRefundsForAgent(query, "pending", admin),
      this.countRefundsForAgent(query, "completed", admin),
      this.countTransactionsForAgent(query, "pending", admin),
      this.countPaymentStatementsForAgent(query, "pending", admin),
      this.countCallbackLogsForAgent(query, "failed", admin),
      this.listPaymentTransactions(query, 8, admin),
      this.listRefunds(query, 8, admin),
      this.listPaymentReconciliation(query, 8, admin),
      this.listPaymentCallbackLogs(query, 8, admin),
      this.listPaymentStatements(query, 8, admin),
      this.agentFinanceSummary(query, admin)
    ]);
    const [paidAmount, refundAmount, todayPaidOrderCount, todayPendingOrderCount, todayRefundCount, todayPendingRefundCount, todayPaidAmount, todayRefundAmount] = await Promise.all([
      this.transactionSumForAgent(query, "success", admin),
      this.refundSumForAgent(query, "completed", admin),
      this.countTransactionsForAgentInRange(query, "success", admin, today.start, today.end),
      this.countOrdersForAgentInRange(query, OrderStatus.PendingPayment, admin, today.start, today.end),
      this.countRefundsForAgentInRange(query, undefined, admin, today.start, today.end),
      this.countRefundsForAgentInRange(query, "pending", admin, today.start, today.end),
      this.transactionSumForAgentInRange(query, "success", admin, today.start, today.end),
      this.refundSumForAgentInRange(query, "completed", admin, today.start, today.end)
    ]);
    const income = Number(paidAmount?.sum || 0);
    const refundsTotal = Number(refundAmount?.sum || 0);
    const dailyMetrics = {
      paidOrderCount: todayPaidOrderCount,
      pendingOrderCount: todayPendingOrderCount,
      refundCount: todayRefundCount,
      pendingRefundCount: todayPendingRefundCount,
      paidAmount: Number(todayPaidAmount?.sum || 0),
      refundAmount: Number(todayRefundAmount?.sum || 0)
    };
    return {
      totals: {
        orderCount,
        paidOrderCount,
        pendingOrderCount,
        refundCount,
        pendingRefundCount,
        completedRefundCount,
        pendingReconciliationCount,
        pendingStatementCount,
        failedCallbackCount,
        paidAmount: income.toFixed(2),
        refundAmount: refundsTotal.toFixed(2),
        netAmount: (income - refundsTotal).toFixed(2)
      },
      dailyReport: {
        rangeStart: today.start.toISOString(),
        rangeEnd: today.end.toISOString(),
        ...financeDailyReport(dailyMetrics)
      },
      riskAlerts: financeRiskAlerts({
        ...dailyMetrics,
        pendingReconciliationCount,
        pendingStatementCount,
        failedCallbackCount
      }),
      recentTransactions: transactions,
      recentRefunds: refunds,
      reconciliationItems,
      callbackLogs,
      statementRecords,
      agentSummary
    };
  }

  listPaymentTransactions(query: OrderQueryDto = {}, take = 200, admin?: AdminContext) {
    const builder = this.paymentTransactionsQuery().andWhere("transaction.businessType = :activityBusinessType", { activityBusinessType: "activity" }).andWhere("transaction.orderId IS NOT NULL").orderBy("transaction.createdAt", "DESC").take(take);
    this.applyTenantScope(builder, "transaction", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "transaction");
    this.applyAgentFilter(builder, query, "orderAgent");
    return builder.getMany();
  }

  listPaymentReconciliation(query: OrderQueryDto = {}, take = 200, admin?: AdminContext) {
    const builder = this.paymentTransactionsQuery().where("transaction.reconciliationStatus IN (:...statuses)", { statuses: ["pending", "resolved"] }).andWhere("transaction.businessType IN (:...financeBusinessTypes)", { financeBusinessTypes: ["activity", "course"] }).orderBy("transaction.createdAt", "DESC").take(take);
    this.applyTenantScope(builder, "transaction", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "transaction");
    this.applyAgentFilter(builder, query, "orderAgent");
    return builder.getMany();
  }

  listPaymentCallbackLogs(query: OrderQueryDto = {}, take = 200, admin?: AdminContext) {
    const builder = this.callbackLogsQuery().orderBy("callback.createdAt", "DESC").take(take);
    this.applyTenantScope(builder, "callback", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "callback");
    this.applyAgentFilter(builder, query, "orderAgent");
    return builder.getMany();
  }

  listPaymentStatements(query: OrderQueryDto = {}, take = 200, admin?: AdminContext) {
    const builder = this.paymentStatementsQuery().orderBy("statement.importedAt", "DESC").take(take);
    this.applyTenantScope(builder, "statement", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "statement");
    this.applyAgentFilter(builder, query, "orderAgent");
    return builder.getMany().then((rows) => rows.map((row) => this.publicPaymentStatement(row)));
  }

  async importPaymentStatements(dto: PaymentStatementImportDto, admin: AdminContext & { username: string }) {
    const provider = this.normalizeStatementProvider(dto.provider);
    const batchNo = dto.batchNo?.trim() || `ST${Date.now()}`;
    const items = Array.isArray(dto.items) ? dto.items : [];
    if (!items.length) throw new BadRequestException("请至少导入一条服务商账单记录");
    let importedCount = 0;
    let updatedCount = 0;
    let matchedCount = 0;
    let pendingCount = 0;
    let skippedCount = 0;
    const details: Array<{ transactionNo: string; orderNo: string | null; status: string; discrepancyType: string | null }> = [];
    for (const item of items.slice(0, 500)) {
      const normalized = this.normalizePaymentStatementItem(provider, item, batchNo);
      if (!normalized) {
        skippedCount += 1;
        continue;
      }
      const orderWhere = normalized.orderNo ? paymentStatementOrderWhere(normalized.orderNo, admin) : null;
      const order = normalized.orderNo ? await this.orders.findOne({ where: orderWhere as any }) : null;
      const courseOrder = !order && normalized.orderNo ? await this.findCourseOrderForStatement(normalized.orderNo, admin) : null;
      const { status, discrepancyType, remark } = order ? this.reconcileStatementWithOrder(normalized, order) : this.reconcileStatementWithCourseOrder(normalized, courseOrder);
      let record = await this.paymentStatementRecords.findOne({ where: { provider, transactionNo: normalized.transactionNo } });
      const isNew = !record;
      record = record || this.paymentStatementRecords.create({ provider, transactionNo: normalized.transactionNo });
      Object.assign(record, {
        order,
        courseOrder,
        tenant: this.tenantRelation(admin, order?.tenant || courseOrder?.course?.tenant || record.tenant),
        businessType: courseOrder ? "course" : "activity",
        orderNo: normalized.orderNo,
        amount: normalized.amount,
        tradeType: normalized.tradeType,
        providerStatus: normalized.providerStatus,
        tradedAt: normalized.tradedAt,
        batchNo,
        reconciliationStatus: status,
        discrepancyType,
        remark,
        rawPayload: normalized.raw,
        importedBy: admin.username
      });
      const savedRecord = await this.paymentStatementRecords.save(record);
      if (isNew) importedCount += 1;
      else updatedCount += 1;
      if (status === "matched") matchedCount += 1;
      else pendingCount += 1;
      if (order) await this.upsertStatementPaymentTransaction(provider, normalized, order, status, discrepancyType, remark);
      else if (courseOrder) await this.upsertCourseStatementPaymentTransaction(provider, normalized, courseOrder, status, discrepancyType, remark);
      details.push({ transactionNo: savedRecord.transactionNo, orderNo: savedRecord.orderNo, status: savedRecord.reconciliationStatus, discrepancyType: savedRecord.discrepancyType });
    }
    await this.logOperation(admin, "finance.statement_import", "payment_statement", null, `导入服务商对账单：${batchNo}`, { provider, batchNo, importedCount, updatedCount, matchedCount, pendingCount, skippedCount });
    return { provider, batchNo, importedCount, updatedCount, matchedCount, pendingCount, skippedCount, details };
  }

  async fetchPaymentStatements(dto: PaymentStatementFetchDto, admin: AdminContext & { username: string }) {
    const provider = this.normalizeStatementProvider(dto.provider);
    const statementDate = this.normalizeStatementDate(dto.statementDate);
    try {
      const result = await this.paymentProvider.fetchStatement({ provider, statementDate, agentId: dto.agentId || null, tenantId: admin.tenantId || null });
      const imported = await this.importPaymentStatements(
        {
          provider,
          batchNo: result.batchNo,
          items: result.items.map((item) => ({
            transactionNo: item.transactionNo,
            orderNo: item.orderNo || undefined,
            amount: Number(item.amount),
            tradeType: item.tradeType || undefined,
            providerStatus: item.providerStatus || undefined,
            tradedAt: item.tradedAt || undefined,
            raw: item.raw
          }))
        },
        admin
      );
      await this.logOperation(admin, "finance.statement_fetch", "payment_statement", null, `拉取服务商对账单：${provider} ${statementDate}`, { provider, statementDate, agentId: dto.agentId || null, batchNo: result.batchNo, itemCount: result.items.length });
      return { implemented: true, statementDate, ...imported };
    } catch (error) {
      if (!(error instanceof NotImplementedException)) throw error;
      const message = error.message || "服务商账单自动拉取尚未实";
      await this.logOperation(admin, "finance.statement_fetch_unimplemented", "payment_statement", null, `服务商账单自动拉取未实现：${provider} ${statementDate}`, { provider, statementDate, agentId: dto.agentId || null, message });
      return { implemented: false, provider, statementDate, importedCount: 0, updatedCount: 0, matchedCount: 0, pendingCount: 0, skippedCount: 0, message };
    }
  }

  async scanPaymentReconciliation() {
    const rows = await this.paymentTransactions.createQueryBuilder("transaction").leftJoinAndSelect("transaction.order", "order").where("transaction.businessType IN (:...financeBusinessTypes)", { financeBusinessTypes: ["activity", "course"] }).orderBy("transaction.createdAt", "DESC").take(500).getMany();
    const courseOrderNos = [...new Set(rows.filter((row) => row.businessType === "course" && row.businessOrderNo).map((row) => row.businessOrderNo!))];
    const courseOrders = courseOrderNos.length ? await this.dataSource.getRepository(CourseOrder).createQueryBuilder("courseOrder").where("courseOrder.orderNo IN (:...courseOrderNos)", { courseOrderNos }).getMany() : [];
    const courseOrderByNo = new Map(courseOrders.map((order) => [order.orderNo, order]));
    let pendingCount = 0;
    let matchedCount = 0;
    for (const row of rows) {
      if (row.reconciliationStatus === "resolved") continue;
      const courseOrder = row.businessType === "course" && row.businessOrderNo ? courseOrderByNo.get(row.businessOrderNo) || null : null;
      if (!row.order && !courseOrder) continue;
      const orderAmount = Number(row.order?.amount ?? courseOrder?.amount ?? 0);
      const transactionAmount = Number(row.amount);
      let discrepancyType: string | null = null;
      if (row.status === "discrepancy") discrepancyType = row.discrepancyType || "provider_callback_error";
      else if (Math.abs(orderAmount - transactionAmount) > 0.001) discrepancyType = "amount_mismatch";
      else if (row.order && ![OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded].includes(row.order.status)) discrepancyType = "order_status_mismatch";
      else if (courseOrder && ![CourseOrderStatus.Paid, CourseOrderStatus.PartiallyRefunded, CourseOrderStatus.Refunded].includes(courseOrder.status)) discrepancyType = "order_status_mismatch";

      if (discrepancyType) {
        row.reconciliationStatus = "pending";
        row.discrepancyType = discrepancyType;
        pendingCount += 1;
      } else {
        row.reconciliationStatus = "matched";
        row.discrepancyType = null;
        matchedCount += 1;
      }
      await this.paymentTransactions.save(row);
    }
    return { scannedCount: rows.length, pendingCount, matchedCount };
  }

  async resolvePaymentTransaction(id: number, dto: ReviewDto, admin: AdminContext) {
    const saved = await this.dataSource.transaction(async (manager) => {
      const transactionRepo = manager.getRepository(PaymentTransaction);
      const statementRepo = manager.getRepository(PaymentStatementRecord);
      const transaction = await transactionRepo.createQueryBuilder("transaction").setLock("pessimistic_write").where("transaction.id = :id", { id }).andWhere("transaction.businessType IN (:...businessTypes)", { businessTypes: ["activity", "course"] }).getOne();
      if (!transaction) throw new NotFoundException("支付流水不存");
      this.assertTenantAccess(transaction, admin);
      if (transaction.reconciliationStatus !== "pending") throw new BadRequestException("只有待处理对账差异可以标记处");
      transaction.reconciliationStatus = "resolved";
      transaction.reconciledBy = this.actorName(admin);
      transaction.reconciliationRemark = dto.remark || null;
      transaction.reconciledAt = new Date();
      const result = await transactionRepo.save(transaction);
      await statementRepo
        .createQueryBuilder()
        .update(PaymentStatementRecord)
        .set({ reconciliationStatus: "resolved", remark: dto.remark || "财务已确认解决" })
        .where("transactionNo = :transactionNo", { transactionNo: transaction.transactionNo })
        .andWhere("provider = :provider", { provider: transaction.provider })
        .andWhere("reconciliationStatus = :status", { status: "pending" })
        .execute();
      return result;
    });
    await this.logOperation(admin, "finance.reconciliation_resolve", "payment_transaction", id, `解决支付对账差异：${saved.transactionNo}`, { discrepancyType: saved.discrepancyType, remark: dto.remark || null });
    return saved;
  }

  private normalizeStatementProvider(provider: string) {
    const value = String(provider || "").trim().toLowerCase();
    if (value !== "wechat" && value !== "alipay") throw new BadRequestException("暂只支持导入微信或支付宝对账");
    return value;
  }

  private normalizeStatementDate(value: string) {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new BadRequestException("Statement date must be YYYY-MM-DD");
    const date = new Date(`${text}T00:00:00+08:00`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException("账单日期无效");
    return text;
  }

  private normalizePaymentStatementItem(provider: string, item: PaymentStatementImportItemDto, batchNo: string) {
    const raw = { ...(item.raw || {}), ...item } as Record<string, unknown>;
    const transactionNo = this.statementString(raw, "transactionNo", "transaction_no", "transaction_id", "trade_no", "providerTransactionNo");
    if (!transactionNo) return null;
    const orderNo = this.statementString(raw, "orderNo", "order_no", "out_trade_no", "outTradeNo", "merchant_order_no") || null;
    const amountValue = this.statementNumber(raw, "amount", "total_amount", "totalFee", "total_fee", "settlement_total_fee", "payer_total");
    if (amountValue === null || amountValue < 0) return null;
    return {
      provider,
      transactionNo,
      orderNo,
      amount: amountValue.toFixed(2),
      tradeType: this.statementString(raw, "tradeType", "trade_type", "trade_scene", "bill_type") || null,
      providerStatus: this.statementString(raw, "providerStatus", "trade_status", "trade_state", "status") || null,
      tradedAt: this.statementDate(raw, "tradedAt", "success_time", "trade_time", "paidAt", "paid_at"),
      batchNo,
      raw
    };
  }

  private reconcileStatementWithOrder(statement: { amount: string; orderNo: string | null; transactionNo: string }, order: Order | null) {
    if (!order) return { status: "pending", discrepancyType: "unknown_order", remark: statement.orderNo ? "服务商账单订单号未匹配到本地订单" : "服务商账单缺少订单号" };
    if (Math.abs(Number(statement.amount) - Number(order.amount)) > 0.001) return { status: "pending", discrepancyType: "amount_mismatch", remark: "服务商账单金额与本地订单金额不一" };
    if (![OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded].includes(order.status)) return { status: "pending", discrepancyType: "order_status_mismatch", remark: "Provider statement is paid but local order status is not paid" };
    return { status: "matched", discrepancyType: null, remark: "服务商账单与本地订单匹配" };
  }

  private async findCourseOrderForStatement(orderNo: string, admin?: AdminContext) {
    const builder = this.dataSource.getRepository(CourseOrder).createQueryBuilder("courseOrder")
      .leftJoinAndSelect("courseOrder.course", "course")
      .leftJoinAndSelect("course.tenant", "tenant")
      .where("courseOrder.orderNo = :orderNo", { orderNo });
    if (admin?.tenantId) builder.andWhere("course.tenantId = :tenantId", { tenantId: admin.tenantId });
    return builder.getOne();
  }

  private reconcileStatementWithCourseOrder(statement: { amount: string; orderNo: string | null; transactionNo: string }, order: CourseOrder | null) {
    if (!order) return { status: "pending", discrepancyType: "unknown_order", remark: statement.orderNo ? "服务商账单订单号未匹配到活动或课程订单" : "服务商账单缺少订单号" };
    if (Math.abs(Number(statement.amount) - Number(order.amount)) > 0.001) return { status: "pending", discrepancyType: "amount_mismatch", remark: "服务商账单金额与课程订单金额不一致" };
    if (![CourseOrderStatus.Paid, CourseOrderStatus.PartiallyRefunded, CourseOrderStatus.Refunded].includes(order.status)) return { status: "pending", discrepancyType: "order_status_mismatch", remark: "服务商账单已支付，但课程订单不是已支付状态" };
    return { status: "matched", discrepancyType: null, remark: "服务商账单与课程订单匹配" };
  }

  private async upsertStatementPaymentTransaction(provider: string, statement: { transactionNo: string; amount: string }, order: Order, reconciliationStatus: string, discrepancyType: string | null, remark: string) {
    let transaction = await this.paymentTransactions.findOne({ where: { transactionNo: statement.transactionNo }, loadEagerRelations: false });
    if (!transaction) {
      const recordedPayment = await this.paymentTransactions.findOne({ where: { order: { id: order.id }, status: "success" }, loadEagerRelations: false });
      if (recordedPayment) return;
    }
    transaction = transaction || this.paymentTransactions.create({ transactionNo: statement.transactionNo });
    Object.assign(transaction, {
      order,
      tenant: order.tenant || transaction.tenant || null,
      provider,
      paymentMethod: order.paymentMethod,
      amount: statement.amount,
      status: reconciliationStatus === "matched" ? "success" : "discrepancy",
      reconciliationStatus,
      discrepancyType,
      remark
    });
    await this.paymentTransactions.save(transaction);
  }

  private async upsertCourseStatementPaymentTransaction(provider: string, statement: { transactionNo: string; amount: string }, order: CourseOrder, reconciliationStatus: string, discrepancyType: string | null, remark: string) {
    let transaction = await this.paymentTransactions.findOne({ where: { transactionNo: statement.transactionNo }, loadEagerRelations: false });
    if (!transaction) {
      const recordedPayment = await this.paymentTransactions.findOne({ where: { businessType: "course", businessOrderNo: order.orderNo, status: "success" }, loadEagerRelations: false });
      if (recordedPayment) {
        recordedPayment.reconciliationStatus = reconciliationStatus;
        recordedPayment.discrepancyType = discrepancyType;
        recordedPayment.reconciliationRemark = remark;
        recordedPayment.reconciledAt = new Date();
        await this.paymentTransactions.save(recordedPayment);
        return;
      }
    }
    transaction = transaction || this.paymentTransactions.create({ transactionNo: statement.transactionNo });
    Object.assign(transaction, {
      order: null,
      tenant: order.course?.tenant || transaction.tenant || null,
      provider,
      paymentMethod: order.paymentMethod,
      amount: statement.amount,
      businessType: "course",
      businessOrderNo: order.orderNo,
      businessSnapshot: { courseOrderId: order.id, courseId: order.course?.id || null, courseTitle: order.course?.title || null, orderAmount: order.amount },
      status: reconciliationStatus === "matched" ? "success" : "discrepancy",
      reconciliationStatus,
      discrepancyType,
      reconciliationRemark: remark,
      reconciledAt: new Date(),
      remark
    });
    await this.paymentTransactions.save(transaction);
  }

  private publicPaymentStatement(row: PaymentStatementRecord) {
    return {
      id: row.id,
      provider: row.provider,
      businessType: row.businessType || "activity",
      transactionNo: row.transactionNo,
      orderNo: row.orderNo,
      amount: row.amount,
      tradeType: row.tradeType,
      providerStatus: row.providerStatus,
      tradedAt: row.tradedAt,
      batchNo: row.batchNo,
      reconciliationStatus: row.reconciliationStatus,
      discrepancyType: row.discrepancyType,
      remark: row.remark,
      importedBy: row.importedBy,
      importedAt: row.importedAt,
      tenant: row.tenant ? { id: row.tenant.id, name: row.tenant.name, code: row.tenant.code } : null,
      order: row.order ? { id: row.order.id, orderNo: row.order.orderNo, amount: row.order.amount, agent: row.order.agent ? { id: row.order.agent.id, name: row.order.agent.name } : null, registration: row.order.registration ? { activity: row.order.registration.activity ? { id: row.order.registration.activity.id, title: row.order.registration.activity.title } : null } : null } : null,
      courseOrder: row.courseOrder ? { id: row.courseOrder.id, orderNo: row.courseOrder.orderNo, amount: row.courseOrder.amount, status: row.courseOrder.status, course: row.courseOrder.course ? { id: row.courseOrder.course.id, title: row.courseOrder.course.title } : null } : null
    };
  }

  private statementString(raw: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
  }

  private statementNumber(raw: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim()) {
        const normalized = Number(value.replace(/[,\s￥¥元]/g, ""));
        if (Number.isFinite(normalized)) return normalized;
      }
    }
    return null;
  }

  private statementDate(raw: Record<string, unknown>, ...keys: string[]) {
    const value = this.statementString(raw, ...keys);
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private refundListQuery(query: OrderQueryDto | RefundQueryDto, admin?: AdminContext) {
    const builder = this.refundsQuery().orderBy("refund.createdAt", "DESC");
    if (query.status && ["pending", "submitting", "processing", "failed", "approved", "rejected", "completed"].includes(String(query.status))) builder.andWhere("refund.status = :refundStatus", { refundStatus: query.status });
    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      builder.andWhere(new Brackets((scope) => scope.where("refund.refundNo LIKE :refundKeyword", { refundKeyword: keyword }).orWhere("order.orderNo LIKE :refundKeyword", { refundKeyword: keyword }).orWhere("user.phone LIKE :refundKeyword", { refundKeyword: keyword }).orWhere("activity.title LIKE :refundKeyword", { refundKeyword: keyword })));
    }
    if (query.activityId) builder.andWhere("activity.id = :refundActivityId", { refundActivityId: query.activityId });
    this.applyTenantScope(builder, "refund", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "refund");
    this.applyAgentFilter(builder, query, "orderAgent");
    return builder;
  }

  listRefunds(query: OrderQueryDto | RefundQueryDto = {}, take = 200, admin?: AdminContext) {
    return this.refundListSelect(this.refundListQuery(query, admin)).take(take).getRawMany().then((rows) => rows.map((row) => this.refundListView(row)));
  }

  async listRefundsPage(query: RefundQueryDto, admin?: AdminContext) {
    const { page, pageSize, offset } = normalizeRefundPagination(query.page, query.pageSize);
    const builder = this.refundListQuery(query, admin);
    const [rows, total] = await Promise.all([
      this.refundListSelect(builder.clone()).skip(offset).take(pageSize).getRawMany(),
      builder.clone().orderBy().getCount()
    ]);
    return { items: rows.map((row) => this.refundListView(row)), total, page, pageSize };
  }

  async exportFinance(query: OrderQueryDto = {}, admin?: AdminContext) {
    const [transactions, refunds, callbackLogs, statementRecords] = await Promise.all([this.listPaymentTransactions(query, 200, admin), this.listRefunds(query, 200, admin), this.listPaymentCallbackLogs(query, 200, admin), this.listPaymentStatements(query, 200, admin)]);
    const workbook = new ExcelJS.Workbook();
    const transactionSheet = workbook.addWorksheet("支付流水");
    transactionSheet.columns = [
      { header: "流水", key: "transactionNo", width: 28 },
      { header: "订单", key: "orderNo", width: 24 },
      { header: "活动", key: "activity", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "渠道", key: "provider", width: 16 },
      { header: "支付方式", key: "paymentMethod", width: 16 },
      { header: "金额", key: "amount", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Reconciliation status", key: "reconciliationStatus", width: 18 },
      { header: "Discrepancy type", key: "discrepancyType", width: 18 },
      { header: "Reconciled by", key: "reconciledBy", width: 14 },
      { header: "处理备注", key: "reconciliationRemark", width: 28 },
      { header: "备注", key: "remark", width: 28 },
      { header: "处理时间", key: "reconciledAt", width: 24 },
      { header: "时间", key: "createdAt", width: 24 }
    ];
    transactions.forEach((item) => transactionSheet.addRow({ transactionNo: item.transactionNo, orderNo: item.order?.orderNo || item.businessOrderNo, activity: item.order?.registration?.activity?.title || "-", agent: item.order?.agent?.name || "平台自营", provider: item.provider, paymentMethod: item.paymentMethod, amount: item.amount, status: item.status, reconciliationStatus: item.reconciliationStatus, discrepancyType: item.discrepancyType, reconciledBy: item.reconciledBy, reconciliationRemark: item.reconciliationRemark, remark: item.remark, reconciledAt: item.reconciledAt, createdAt: item.createdAt }));

    const refundSheet = workbook.addWorksheet("退款记");
    refundSheet.columns = [
      { header: "退款号", key: "refundNo", width: 28 },
      { header: "订单", key: "orderNo", width: 24 },
      { header: "活动", key: "activity", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "金额", key: "amount", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "操作", key: "operator", width: 16 },
      { header: "原因", key: "reason", width: 28 },
      { header: "审核", key: "reviewedBy", width: 16 },
      { header: "审核备注", key: "reviewRemark", width: 28 },
      { header: "服务商退款号", key: "providerRefundNo", width: 28 },
      { header: "服务商退款状", key: "providerRefundStatus", width: 18 },
      { header: "服务商失败原", key: "providerRefundFailureReason", width: 32 },
      { header: "服务商同步时", key: "providerRefundSyncedAt", width: 24 },
      { header: "下次查询时间", key: "providerRefundNextQueryAt", width: 24 },
      { header: "申请时间", key: "createdAt", width: 24 },
      { header: "审核时间", key: "reviewedAt", width: 24 },
      { header: "完成时间", key: "completedAt", width: 24 }
    ];
    refunds.forEach((item) => refundSheet.addRow({ refundNo: item.refundNo, orderNo: item.order?.orderNo || "-", activity: item.order?.registration?.activity?.title || "-", agent: item.order?.agent?.name || "平台自营", amount: item.amount, status: item.status, operator: item.operator, reason: item.reason, reviewedBy: item.reviewedBy, reviewRemark: item.reviewRemark, providerRefundNo: item.providerRefundNo, providerRefundStatus: item.providerRefundStatus, providerRefundFailureReason: item.providerRefundFailureReason, providerRefundSyncedAt: item.providerRefundSyncedAt, providerRefundNextQueryAt: item.providerRefundNextQueryAt, createdAt: item.createdAt, reviewedAt: item.reviewedAt, completedAt: item.completedAt }));

    const callbackSheet = workbook.addWorksheet("支付回调日志");
    callbackSheet.columns = [
      { header: "服务", key: "provider", width: 16 },
      { header: "订单", key: "orderNo", width: 24 },
      { header: "交易", key: "transactionNo", width: 28 },
      { header: "金额", key: "amount", width: 12 },
      { header: "验签", key: "signatureValid", width: 12 },
      { header: "处理结果", key: "resultStatus", width: 14 },
      { header: "结果说明", key: "resultMessage", width: 32 },
      { header: "活动", key: "activity", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "收到时间", key: "createdAt", width: 24 },
      { header: "处理时间", key: "processedAt", width: 24 }
    ];
    callbackLogs.forEach((item) => callbackSheet.addRow({ provider: item.provider, orderNo: item.orderNo, transactionNo: item.transactionNo, amount: item.amount, signatureValid: item.signatureValid === null ? "未验" : item.signatureValid ? "通过" : "失败", resultStatus: item.resultStatus, resultMessage: item.resultMessage, activity: item.order?.registration?.activity?.title || "-", agent: item.order?.agent?.name || "平台自营", createdAt: item.createdAt, processedAt: item.processedAt }));

    const statementSheet = workbook.addWorksheet("服务商账");
    statementSheet.columns = [
      { header: "服务", key: "provider", width: 16 },
      { header: "交易", key: "transactionNo", width: 28 },
      { header: "订单", key: "orderNo", width: 24 },
      { header: "活动", key: "activity", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "金额", key: "amount", width: 12 },
      { header: "交易类型", key: "tradeType", width: 16 },
      { header: "服务商状", key: "providerStatus", width: 16 },
      { header: "Reconciliation status", key: "reconciliationStatus", width: 18 },
      { header: "Discrepancy type", key: "discrepancyType", width: 18 },
      { header: "Remark", key: "remark", width: 28 },
      { header: "批次", key: "batchNo", width: 20 },
      { header: "导入", key: "importedBy", width: 16 },
      { header: "交易时间", key: "tradedAt", width: 24 },
      { header: "导入时间", key: "importedAt", width: 24 }
    ];
    statementRecords.forEach((item) => statementSheet.addRow({ provider: item.provider, transactionNo: item.transactionNo, orderNo: item.orderNo, activity: item.order?.registration?.activity?.title || item.courseOrder?.course?.title || "-", agent: item.businessType === "course" ? "-" : item.order?.agent?.name || "平台自营", amount: item.amount, tradeType: item.tradeType, providerStatus: item.providerStatus, reconciliationStatus: item.reconciliationStatus, discrepancyType: item.discrepancyType, remark: item.remark, batchNo: item.batchNo, importedBy: item.importedBy, tradedAt: item.tradedAt, importedAt: item.importedAt }));

    for (const sheet of workbook.worksheets) {
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    }
    await this.logExport(admin, "finance", refunds.length + transactions.length + callbackLogs.length + statementRecords.length, query);
    return workbook.xlsx.writeBuffer();
  }

  async agentSettlementOptions(admin?: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.view");
    const tenantBuilder = this.tenants.createQueryBuilder("tenant").orderBy("tenant.name", "ASC").addOrderBy("tenant.id", "ASC");
    if (this.isTenantScoped(admin)) tenantBuilder.where("tenant.id = :tenantId", { tenantId: admin?.tenantId });
    const agentBuilder = this.agents.createQueryBuilder("agent").leftJoinAndSelect("agent.tenant", "tenant").orderBy("agent.name", "ASC").addOrderBy("agent.id", "ASC");
    this.applyTenantScope(agentBuilder, "agent", admin);
    const [tenants, agents] = await Promise.all([tenantBuilder.getMany(), agentBuilder.getMany()]);
    return {
      tenants: tenants.map((tenant) => this.publicPaymentAccountTenant(tenant)),
      agents: agents.map((agent) => ({ id: agent.id, name: agent.name, region: agent.region, enabled: agent.enabled, tenant: this.publicPaymentAccountTenant(agent.tenant) })),
      statuses: [
        { value: "draft", label: "草稿" },
        { value: "pending_review", label: "待审核" },
        { value: "approved", label: "已通过" },
        { value: "paid", label: "已打款" },
        { value: "rejected", label: "已拒绝" },
        { value: "cancelled", label: "已取消" }
      ]
    };
  }

  async listAgentSettlements(query: AgentSettlementQueryDto = {}, admin?: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.view");
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.agentSettlementQuery(query, admin);
    const summaryBuilder = builder.clone().orderBy();
    const [rows, total, summary] = await Promise.all([
      builder.skip((page - 1) * pageSize).take(pageSize).getMany(),
      builder.clone().orderBy().getCount(),
      summaryBuilder
        .select("COUNT(settlement.id)", "total")
        .addSelect("SUM(CASE WHEN settlement.status = 'pending_review' THEN 1 ELSE 0 END)", "pending")
        .addSelect("SUM(CASE WHEN settlement.status = 'paid' THEN 1 ELSE 0 END)", "paid")
        .addSelect("COALESCE(SUM(settlement.payableAmount), 0)", "payableAmount")
        .getRawOne<{ total: string; pending: string; paid: string; payableAmount: string }>()
    ]);
    const includeSensitive = this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive");
    if (includeSensitive) await this.logOperation(admin, "agent_settlement.sensitive.view", "agent_settlement", null, `查看代理结算敏感资料：${rows.length} 条`, { rowCount: rows.length, tenantId: query.tenantId || admin?.tenantId || null, agentId: query.agentId || null });
    return {
      items: rows.map((row) => this.publicAgentSettlement(row, includeSensitive)),
      total,
      page,
      pageSize,
      summary: {
        total: Number(summary?.total || 0),
        pending: Number(summary?.pending || 0),
        paid: Number(summary?.paid || 0),
        payableAmount: Number(summary?.payableAmount || 0).toFixed(2)
      }
    };
  }

  async agentSettlementTransferCapability(admin?: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.view");
    const agentBuilder = this.agents.createQueryBuilder("agent").leftJoinAndSelect("agent.tenant", "tenant").orderBy("agent.id", "ASC");
    this.applyTenantScope(agentBuilder, "agent", admin);
    const accountBuilder = this.agentPaymentAccounts.createQueryBuilder("account").leftJoinAndSelect("account.agent", "agent").leftJoinAndSelect("account.tenant", "tenant").leftJoinAndSelect("agent.tenant", "agentTenant").orderBy("account.id", "DESC");
    if (this.isTenantScoped(admin)) accountBuilder.andWhere("(tenant.id = :tenantId OR (tenant.id IS NULL AND agentTenant.id = :tenantId))", { tenantId: admin?.tenantId });
    const [agents, accounts] = await Promise.all([agentBuilder.getMany(), accountBuilder.getMany()]);
    const capability = buildAgentSettlementTransferCapability(this.config, agents, accounts);
    const includeSensitive = this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive");
    if (includeSensitive) await this.logOperation(admin, "agent_settlement.sensitive.capability", "agent_payment_account", null, `查看代理自动打款敏感资料：${capability.accounts.length} 条`, { rowCount: capability.accounts.length, tenantId: admin?.tenantId || null });
    return {
      ...capability,
      accounts: capability.accounts.map((item: any) => ({
        accountId: item.accountId,
        agent: item.agent,
        provider: item.provider,
        providerLabel: item.providerLabel,
        merchantName: item.merchantName,
        merchantNo: includeSensitive ? item.merchantNo : this.maskPaymentIdentifier(item.merchantNo),
        enabled: item.enabled,
        status: item.status,
        missingRuntimeKeys: item.missingRuntimeKeys,
        missingAccountKeys: item.missingAccountKeys,
        message: item.message,
        nextAction: item.nextAction,
        transferDraftSupported: item.transferDraftSupported,
        realTransferImplemented: item.realTransferImplemented,
        requestTransferImplemented: item.requestTransferImplemented,
        queryTransferImplemented: item.queryTransferImplemented,
        sensitiveMasked: !includeSensitive
      }))
    };
  }

  async generateAgentSettlement(dto: AgentSettlementGenerateDto, admin: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.manage");
    const periodStart = this.parseDate(dto.periodStart);
    const periodEnd = this.parseDate(dto.periodEnd);
    if (periodEnd <= periodStart) throw new BadRequestException("结算结束时间必须晚于开始时");
    const settlement = await this.withAgentSettlementNamedLock(`agent-settlement:generate:${dto.agentId}`, async () => this.dataSource.transaction(async (manager) => {
      const agentRepository = manager.getRepository(Agent);
      const settlementRepository = manager.getRepository(AgentSettlement);
      const agent = await agentRepository.createQueryBuilder("agent").leftJoinAndSelect("agent.tenant", "tenant").setLock("pessimistic_write").where("agent.id = :id", { id: dto.agentId }).getOne();
      if (!agent) throw new NotFoundException("代理不存在");
      this.assertTenantAccess(agent, admin);
      if (agent.tenant) {
        this.assertTenantFeature(agent.tenant, "agentSettlement");
        this.assertTenantSubscriptionActive(agent.tenant);
      }
      const duplicate = await settlementRepository
        .createQueryBuilder("settlement")
        .leftJoin("settlement.agent", "agent")
        .setLock("pessimistic_write")
        .where("agent.id = :agentId", { agentId: agent.id })
        .andWhere("settlement.status NOT IN (:...inactiveStatuses)", { inactiveStatuses: ["rejected", "cancelled"] })
        .andWhere("settlement.periodStart < :periodEnd", { periodEnd })
        .andWhere("settlement.periodEnd > :periodStart", { periodStart })
        .getOne();
      if (duplicate) throw new BadRequestException(`该代理在所选周期已有结算单：${duplicate.settlementNo}`);
      const [transactionRows, refundRows] = await Promise.all([this.agentSettlementTransactions(agent.id, periodStart, periodEnd), this.agentSettlementRefunds(agent.id, periodStart, periodEnd)]);
      const grossAmount = transactionRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const refundAmount = refundRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const netAmount = Math.max(grossAmount - refundAmount, 0);
      const commissionRate = this.resolveAgentCommissionRate(agent, dto.commissionRate);
      const commissionAmount = netAmount * (commissionRate / 100);
      const payableAmount = Math.max(netAmount - commissionAmount, 0);
      return settlementRepository.save(settlementRepository.create({
        settlementNo: `AS${Date.now()}${agent.id}`,
        agent,
        tenant: this.tenantRelation(admin, agent.tenant),
        periodStart,
        periodEnd,
        transactionCount: transactionRows.length,
        refundCount: refundRows.length,
        grossAmount: grossAmount.toFixed(2),
        refundAmount: refundAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        commissionRate: commissionRate.toFixed(4),
        commissionAmount: commissionAmount.toFixed(2),
        payableAmount: payableAmount.toFixed(2),
        status: "draft",
        generatedBy: this.actorName(admin),
        payload: {
          remark: dto.remark?.trim() || null,
          transactionIds: transactionRows.map((item) => item.id),
          refundIds: refundRows.map((item) => item.id),
          transactionNos: transactionRows.map((item) => item.transactionNo),
          refundNos: refundRows.map((item) => item.refundNo)
        }
      }));
    }));
    await this.logOperation(admin, "agent_settlement.generate", "agent_settlement", settlement.id, `生成代理结算单：${settlement.settlementNo}`, { agentId: dto.agentId, periodStart, periodEnd, payableAmount: settlement.payableAmount });
    return this.publicAgentSettlement(settlement, this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive"));
  }

  async agentSettlementDetails(id: number, admin?: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.view");
    const settlement = await this.getAgentSettlement(id, admin);
    const recalculated = await this.calculateAgentSettlementSnapshot(settlement.agent, settlement.periodStart, settlement.periodEnd, Number(settlement.commissionRate || 0));
    const payload = this.agentSettlementPayload(settlement);
    const snapshot = {
      transactionIds: payload.transactionIds,
      refundIds: payload.refundIds,
      transactionCount: settlement.transactionCount,
      refundCount: settlement.refundCount,
      grossAmount: settlement.grossAmount,
      refundAmount: settlement.refundAmount,
      netAmount: settlement.netAmount,
      commissionRate: settlement.commissionRate,
      commissionAmount: settlement.commissionAmount,
      payableAmount: settlement.payableAmount
    };
    const differences = this.agentSettlementDifferences(settlement, recalculated);
    const risks = await this.agentSettlementRisks(settlement, recalculated, differences);
    const auditLogBuilder = this.operationLogs
      .createQueryBuilder("log")
      .where("log.targetType = :targetType", { targetType: "agent_settlement" })
      .andWhere("log.targetId = :targetId", { targetId: String(settlement.id) })
      .orderBy("log.createdAt", "DESC")
      .take(50);
    this.applyTenantScope(auditLogBuilder, "log", admin);
    const auditLogs = await auditLogBuilder.getMany();
    const transfers = await this.agentSettlementTransfers.find({ where: { settlement: { id: settlement.id }, ...(this.isTenantScoped(admin) ? { tenant: { id: admin?.tenantId || 0 } } : {}) }, order: { createdAt: "DESC" }, take: 50 });
    const includeSensitive = this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive");
    if (includeSensitive) await this.logOperation(admin, "agent_settlement.sensitive.detail", "agent_settlement", settlement.id, `查看代理结算敏感详情：${settlement.settlementNo}`, { settlementId: settlement.id });
    return {
      settlement: this.publicAgentSettlement(settlement, includeSensitive),
      snapshot,
      current: {
        transactionIds: recalculated.transactionRows.map((item) => item.id),
        refundIds: recalculated.refundRows.map((item) => item.id),
        transactionCount: recalculated.transactionRows.length,
        refundCount: recalculated.refundRows.length,
        grossAmount: recalculated.grossAmount,
        refundAmount: recalculated.refundAmount,
        netAmount: recalculated.netAmount,
        commissionRate: recalculated.commissionRate,
        commissionAmount: recalculated.commissionAmount,
        payableAmount: recalculated.payableAmount
      },
      differences,
      risks,
      transactions: recalculated.transactionRows.map((row) => this.publicAgentSettlementTransaction(row)),
      refunds: recalculated.refundRows.map((row) => this.publicAgentSettlementRefund(row)),
      transfers: transfers.map((row) => this.publicAgentSettlementTransfer(row, includeSensitive)),
      auditLogs: auditLogs.map((row) => ({ id: row.id, action: row.action, summary: row.summary, adminUsername: row.adminUsername, createdAt: row.createdAt })),
      snapshotTransactionIds: payload.transactionIds,
      snapshotRefundIds: payload.refundIds,
      canMarkPaid: settlement.status === "approved" && !risks.some((item) => item.blocking)
    };
  }

  async submitAgentSettlement(id: number, admin: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.manage");
    const saved = await this.updateAgentSettlementWithLock(id, admin, "draft", "只有草稿结算单可以提交审核", (settlement) => {
      settlement.status = "pending_review";
      settlement.submittedAt = new Date();
    });
    await this.logOperation(admin, "agent_settlement.submit", "agent_settlement", saved.id, `提交代理结算审核：${saved.settlementNo}`);
    return this.publicAgentSettlement(saved, this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive"));
  }

  async approveAgentSettlement(id: number, dto: ReviewDto, admin: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.manage");
    const remark = dto.remark?.trim();
    if (!remark) throw new BadRequestException("审核意见不能为空");
    const saved = await this.updateAgentSettlementWithLock(id, admin, "pending_review", "只有待审核结算单可以通过", (settlement) => {
      settlement.status = "approved";
      settlement.reviewedBy = this.actorName(admin);
      settlement.reviewRemark = remark;
      settlement.reviewedAt = new Date();
    });
    await this.logOperation(admin, "agent_settlement.approve", "agent_settlement", saved.id, `通过代理结算审核：${saved.settlementNo}`, { remark: dto.remark || null });
    return this.publicAgentSettlement(saved, this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive"));
  }

  async rejectAgentSettlement(id: number, dto: ReviewDto, admin: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.manage");
    const remark = dto.remark?.trim();
    if (!remark) throw new BadRequestException("拒绝原因不能为空");
    const saved = await this.updateAgentSettlementWithLock(id, admin, "pending_review", "只有待审核结算单可以拒绝", (settlement) => {
      settlement.status = "rejected";
      settlement.reviewedBy = this.actorName(admin);
      settlement.reviewRemark = remark;
      settlement.reviewedAt = new Date();
    });
    await this.logOperation(admin, "agent_settlement.reject", "agent_settlement", saved.id, `拒绝代理结算审核：${saved.settlementNo}`, { remark: dto.remark || null });
    return this.publicAgentSettlement(saved, this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive"));
  }

  async markAgentSettlementPaid(id: number, dto: AgentSettlementPayDto, admin: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.pay");
    const paidReference = dto.paidReference?.trim() || null;
    const paidProofUrl = this.assertPrivateSettlementProofUrl(dto.paidProofUrl, admin);
    if (!paidReference && !paidProofUrl) throw new BadRequestException("请填写转账流水号或上传打款凭证");
    const saved = await this.withAgentSettlementNamedLock(`agent-settlement:${id}`, async () => this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AgentSettlement);
      const settlement = await repository.createQueryBuilder("settlement").leftJoinAndSelect("settlement.agent", "agent").leftJoinAndSelect("settlement.tenant", "tenant").setLock("pessimistic_write").where("settlement.id = :id", { id }).getOne();
      if (!settlement) throw new NotFoundException("代理结算单不存在");
      this.assertTenantAccess(settlement, admin);
      if (settlement.status !== "approved") throw new BadRequestException("只有已审核结算单可以标记打款");
      const recalculated = await this.calculateAgentSettlementSnapshot(settlement.agent, settlement.periodStart, settlement.periodEnd, Number(settlement.commissionRate || 0));
      const differences = this.agentSettlementDifferences(settlement, recalculated);
      const blockingRisks = (await this.agentSettlementRisks(settlement, recalculated, differences)).filter((item) => item.blocking);
      if (blockingRisks.length) throw new BadRequestException(`结算单存在未处理风险：${blockingRisks.map((item) => item.message).join("；")}`);
      settlement.status = "paid";
      settlement.paidBy = this.actorName(admin);
      settlement.paidReference = paidReference;
      settlement.paidProofUrl = paidProofUrl;
      settlement.paidRemark = dto.remark?.trim() || null;
      settlement.paidAt = new Date();
      return repository.save(settlement);
    }));
    await this.logOperation(admin, "agent_settlement.mark_paid", "agent_settlement", saved.id, `标记代理结算已打款：${saved.settlementNo}`, { paidReference: this.maskPaymentIdentifier(saved.paidReference), hasPaidProof: Boolean(saved.paidProofUrl), remark: dto.remark?.trim() || null });
    return this.publicAgentSettlement(saved, this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive"));
  }

  async sandboxTransferAgentSettlement(id: number, dto: AgentSettlementSandboxTransferDto, admin: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.transfer");
    return this.withAgentSettlementNamedLock(`agent-settlement:${id}`, () => this.requestAgentSettlementTransfer(id, dto, admin, "sandbox"));
  }

  async realTransferAgentSettlement(id: number, dto: AgentSettlementSandboxTransferDto, admin: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.transfer");
    return this.withAgentSettlementNamedLock(`agent-settlement:${id}`, () => this.requestAgentSettlementTransfer(id, dto, admin, "real"));
  }

  private async requestAgentSettlementTransfer(id: number, dto: AgentSettlementSandboxTransferDto, admin: AdminContext, mode: "sandbox" | "real") {
    const settlement = await this.getAgentSettlement(id, admin);
    if (settlement.status !== "approved") throw new BadRequestException(mode === "sandbox" ? "只有已审核结算单可以发起沙箱打款" : "只有已审核结算单可以发起真实打款");
    const details = await this.agentSettlementDetails(id, admin);
    const blockingRisks = details.risks.filter((item) => item.blocking);
    if (blockingRisks.length) throw new BadRequestException(`结算单存在未处理风险：${blockingRisks.map((item) => item.message).join("")}`);
    if (Number(settlement.payableAmount || 0) <= 0) throw new BadRequestException("Payable amount must be greater than 0 before automatic transfer");

    const account = await this.selectAgentTransferAccount(settlement.agent.id, dto.provider);
    const provider = providerForPaymentMethod(account.provider);
    if (!provider) throw new BadRequestException("该代理支付账户不支持自动打款沙箱验证");
    const assessment = assessAgentTransferAccount(this.config, account);
    if (!assessment) throw new BadRequestException("无法评估该代理支付账户的转账能力");
    if (assessment.status !== "sandbox_ready" && assessment.status !== "real_ready") {
      throw new BadRequestException(`该代理${assessment.providerLabel}未达到沙箱验证条件：${assessment.nextAction}`);
    }
    if (mode === "real" && assessment.status !== "real_ready") {
      throw new BadRequestException("真实自动打款 SDK 未接入，当前只能进行沙箱回执演练");
    }

    const adapter = createAgentTransferAdapter(provider, this.config, account);
    const transferNo = this.agentSettlementTransferNo(settlement, mode);
    const existing = await this.agentSettlementTransfers.findOne({ where: { transferNo } });
    if (existing?.status === "success") throw new BadRequestException(`该结算单已存在成功转账记录：${existing.transferNo}`);
    const transfer = existing || this.agentSettlementTransfers.create({ settlement, tenant: settlement.tenant, agent: settlement.agent, account, provider, mode, transferNo, amount: settlement.payableAmount, status: "pending", retryCount: 0 });
    Object.assign(transfer, {
      account,
      provider,
      mode,
      amount: settlement.payableAmount,
      status: "processing",
      requestedBy: this.actorName(admin),
      requestedAt: new Date(),
      remark: dto.remark || null,
      payload: { requested: { simulateStatus: dto.simulateStatus || "success", failureReason: dto.failureReason || null } }
    });
    const processingTransfer = await this.agentSettlementTransfers.save(transfer);
    let result: any;
    try {
      result = mode === "sandbox" ? adapter.requestSandboxTransfer(settlement, { status: dto.simulateStatus === "failed" ? "failed" : "success", failureReason: dto.failureReason, operator: this.actorName(admin), transferNo: processingTransfer.transferNo }) : adapter.requestRealTransfer(settlement, { operator: this.actorName(admin), transferNo: processingTransfer.transferNo });
    } catch (error) {
      if (!(error instanceof NotImplementedException)) throw error;
      result = { ...adapter.createTransferDraft(settlement), mode, status: "failed", transferNo: processingTransfer.transferNo, providerTransferNo: null, failureReason: error.message, raw: { provider, mode, error: error.message, generatedAt: new Date().toISOString() } };
    }
    processingTransfer.status = result.status === "accepted" ? "processing" : result.status;
    processingTransfer.providerTransferNo = result.providerTransferNo;
    processingTransfer.failureReason = result.failureReason;
    processingTransfer.syncedAt = new Date();
    processingTransfer.completedAt = result.status === "success" ? new Date() : null;
    processingTransfer.retryCount = Number(processingTransfer.retryCount || 0) + 1;
    processingTransfer.nextQueryAt = processingTransfer.status === "processing" || processingTransfer.status === "failed" ? new Date(Date.now() + 10 * 60 * 1000) : null;
    processingTransfer.payload = { ...(processingTransfer.payload || {}), result };
    const savedTransfer = await this.agentSettlementTransfers.save(processingTransfer);
    if (savedTransfer.status !== "success") {
      await this.businessJobs.publish({
        tenantId: savedTransfer.tenant?.id || null,
        type: "agent-settlement.transfer-query",
        idempotencyKey: `transfer:${savedTransfer.id}`,
        payload: { transferId: savedTransfer.id, tenantId: savedTransfer.tenant?.id || null },
        runAt: savedTransfer.nextQueryAt || new Date(),
        maxAttempts: 8
      });
      await this.logOperation(admin, `agent_settlement.${mode}_transfer_${savedTransfer.status}`, "agent_settlement", settlement.id, `代理结算${mode === "sandbox" ? "沙箱" : "真实"}打款${savedTransfer.status === "failed" ? "失败" : "处理"}：${settlement.settlementNo}`, { provider, transferId: savedTransfer.id, transferNo: savedTransfer.transferNo, failureReason: result.failureReason, remark: dto.remark || null, raw: result.raw });
      return this.publicAgentSettlementTransferResult(settlement, savedTransfer, result, false, this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive"));
    }

    settlement.status = "paid";
    settlement.paidBy = this.actorName(admin);
    settlement.paidReference = savedTransfer.providerTransferNo || savedTransfer.transferNo;
    settlement.paidProofUrl = null;
    settlement.paidRemark = dto.remark || `${mode === "sandbox" ? "沙箱" : "真实"}自动打款成功：${assessment.providerLabel}`;
    settlement.paidAt = new Date();
    const saved = await this.agentSettlements.save(settlement);
    await this.logOperation(admin, `agent_settlement.${mode}_transfer_success`, "agent_settlement", saved.id, `代理结算${mode === "sandbox" ? "沙箱" : "真实"}打款成功：${saved.settlementNo}`, { provider, transferId: savedTransfer.id, transferNo: savedTransfer.transferNo, providerTransferNo: savedTransfer.providerTransferNo, amount: savedTransfer.amount, remark: dto.remark || null, raw: result.raw });
    return this.publicAgentSettlementTransferResult(saved, savedTransfer, result, true, this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive"));
  }

  async scanAgentSettlementTransfers(admin: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.transfer");
    return this.withAgentSettlementNamedLock("agent-settlement:transfer-scan", () => this.scanAgentSettlementTransfersUnlocked(admin));
  }

  private async scanAgentSettlementTransfersUnlocked(admin: AdminContext) {
    const builder = this.agentSettlementTransfers
      .createQueryBuilder("transfer")
      .leftJoinAndSelect("transfer.settlement", "settlement")
      .leftJoinAndSelect("transfer.agent", "agent")
      .leftJoinAndSelect("transfer.account", "account")
      .where("transfer.status IN (:...statuses)", { statuses: ["pending", "processing", "failed"] })
      .andWhere("(transfer.nextQueryAt IS NULL OR transfer.nextQueryAt <= :now)", { now: new Date() })
      .orderBy("transfer.createdAt", "ASC")
      .take(50);
    this.applyTenantScope(builder, "transfer", admin);
    const transfers = await builder.getMany();
    const checked: Array<{ id: number; transferNo: string; status: string; action: string }> = [];
    for (const transfer of transfers) {
      transfer.retryCount = Number(transfer.retryCount || 0) + 1;
      transfer.syncedAt = new Date();
      if (transfer.mode === "real") {
        const provider = providerForPaymentMethod(transfer.account?.provider as any);
        if (!provider) {
          transfer.status = "failed";
          transfer.failureReason = transfer.failureReason || "转账记录缺少可查询的支付账户";
          transfer.nextQueryAt = null;
          await this.agentSettlementTransfers.save(transfer);
          checked.push({ id: transfer.id, transferNo: transfer.transferNo, status: transfer.status, action: "missing_account_failed" });
          continue;
        }
        try {
          const result = await createAgentTransferAdapter(provider, this.config, transfer.account || undefined).queryTransfer(transfer.transferNo);
          transfer.status = result.status;
          transfer.providerTransferNo = result.providerTransferNo || transfer.providerTransferNo;
          transfer.failureReason = result.failureReason;
          transfer.completedAt = result.status === "success" ? new Date() : null;
          transfer.nextQueryAt = result.status === "processing" ? new Date(Date.now() + 10 * 60 * 1000) : null;
          transfer.payload = { ...(transfer.payload || {}), lastQuery: result };
          await this.agentSettlementTransfers.save(transfer);
          checked.push({ id: transfer.id, transferNo: transfer.transferNo, status: transfer.status, action: "real_query" });
        } catch (error) {
          transfer.failureReason = error instanceof Error ? error.message : "真实转账查询失败";
          transfer.nextQueryAt = new Date(Date.now() + Math.min(60, 10 * transfer.retryCount) * 60 * 1000);
          transfer.payload = { ...(transfer.payload || {}), lastQueryError: { message: transfer.failureReason, checkedAt: new Date().toISOString() } };
          await this.agentSettlementTransfers.save(transfer);
          checked.push({ id: transfer.id, transferNo: transfer.transferNo, status: transfer.status, action: "real_query_pending" });
        }
        continue;
      }
      if (transfer.mode === "sandbox" && transfer.status === "failed") {
        transfer.nextQueryAt = new Date(Date.now() + Math.min(60, 10 * transfer.retryCount) * 60 * 1000);
        transfer.payload = { ...(transfer.payload || {}), lastCompensation: { status: "failed", checkedAt: new Date().toISOString(), message: "沙箱失败回执保持失败状态，等待人工重试或重新发起沙箱打" } };
        await this.agentSettlementTransfers.save(transfer);
        checked.push({ id: transfer.id, transferNo: transfer.transferNo, status: transfer.status, action: "kept_failed" });
        continue;
      }
      if (transfer.mode === "sandbox" && transfer.status === "processing") {
        transfer.status = "failed";
        transfer.failureReason = transfer.failureReason || "沙箱回执超时，补偿扫描标记失";
        transfer.nextQueryAt = new Date(Date.now() + 10 * 60 * 1000);
        transfer.payload = { ...(transfer.payload || {}), lastCompensation: { status: "failed", checkedAt: new Date().toISOString(), message: transfer.failureReason } };
        await this.agentSettlementTransfers.save(transfer);
        checked.push({ id: transfer.id, transferNo: transfer.transferNo, status: transfer.status, action: "timeout_failed" });
      }
    }
    await this.logOperation(admin, "agent_settlement.transfer_scan", "agent_settlement_transfer", null, `扫描代理结算打款回执：${checked.length} 条`, { checked });
    return { checkedCount: checked.length, checked };
  }


  async exportTenants(admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const raw = await this.listTenants(admin, { includeSensitive: true });
    const rows = raw as any[];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("商家列表");
    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "商家编码", key: "code", width: 16 },
      { header: "商家名称", key: "name", width: 24 },
      { header: "地区", key: "region", width: 14 },
      { header: "联系人", key: "contactName", width: 14 },
      { header: "联系电话", key: "contactPhone", width: 18 },
      { header: "状态", key: "status", width: 10 },
      { header: "套餐", key: "packagePlan", width: 14 },
      { header: "套餐到期", key: "packageExpiresAt", width: 14 },
      { header: "套餐状态", key: "packageStatus", width: 14 },
      { header: "续费提醒", key: "renewalReminder", width: 18 },
      { header: "续费动作", key: "renewalAction", width: 34 },
      { header: "经营健康", key: "operationHealthStatus", width: 14 },
      { header: "健康评分", key: "operationHealthScore", width: 10 },
      { header: "健康风险", key: "operationHealthRisks", width: 34 },
      { header: "健康提醒", key: "operationHealthWarnings", width: 34 },
      { header: "健康建议", key: "operationHealthActions", width: 40 },
      { header: "上线结论", key: "launchStatus", width: 14 },
      { header: "上线评分", key: "launchScore", width: 10 },
      { header: "上线阻塞项", key: "launchBlockers", width: 34 },
      { header: "上线提醒项", key: "launchWarnings", width: 34 },
      { header: "下一步动作", key: "launchActions", width: 40 },
      { header: "管理员数", key: "adminCount", width: 10 },
      { header: "活动数", key: "activityCount", width: 10 },
      { header: "专题数", key: "courseCount", width: 10 },
      { header: "已发布专题", key: "publishedCourseCount", width: 12 },
      { header: "报名数", key: "registrationCount", width: 10 },
      { header: "订单数", key: "orderCount", width: 10 },
      { header: "待审活动", key: "pendingActivity", width: 12 },
      { header: "待审退款", key: "pendingRefund", width: 10 },
      { header: "对账差异", key: "pendingReconciliation", width: 10 },
      { header: "内部备注", key: "remark", width: 28 },
      { header: "创建时间", key: "createdAt", width: 18 }
    ];
    rows.forEach(function(r: any) {
      sheet.addRow({
        id: r.id,
        code: r.code,
        name: r.name,
        region: r.region || "",
        contactName: r.contactName || "",
        contactPhone: r.contactPhone || "",
        status: r.enabled ? "启用" : "停用",
        packagePlan: r.subscriptionStatus?.planLabel || "",
        packageExpiresAt: r.subscriptionStatus?.expiresAt || "长期有效",
        packageStatus: r.subscriptionStatus?.label || "",
        renewalReminder: r.renewalReminder?.label || "",
        renewalAction: r.renewalReminder?.message || "",
        operationHealthStatus: r.operationHealth?.label || "",
        operationHealthScore: Number(r.operationHealth?.score || 0),
        operationHealthRisks: (r.operationHealth?.risks || []).join("；"),
        operationHealthWarnings: (r.operationHealth?.warnings || []).join("；"),
        operationHealthActions: (r.operationHealth?.actions || []).join("；"),
        launchStatus: r.launchReadiness?.label || "",
        launchScore: Number(r.launchReadiness?.score || 0),
        launchBlockers: (r.launchReadiness?.blockers || []).join("；"),
        launchWarnings: (r.launchReadiness?.warnings || []).join("；"),
        launchActions: (r.launchReadiness?.actions || []).join("；"),
        adminCount: Number(r.adminCount || 0),
        activityCount: Number(r.totalActivityCount || 0),
        courseCount: Number(r.totalCourseCount || 0),
        publishedCourseCount: Number(r.publishedCourseCount || 0),
        registrationCount: Number(r.totalRegistrationCount || 0),
        orderCount: Number(r.totalOrderCount || 0),
        pendingActivity: Number(r.pendingActivityCount || 0),
        pendingRefund: Number(r.pendingRefundCount || 0),
        pendingReconciliation: Number(r.pendingReconciliationCount || 0),
        remark: r.remark || "",
        createdAt: r.createdAt || ""
      });
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    await this.logExport(admin, "tenants", rows.length, {});
    return workbook.xlsx.writeBuffer();
  }

  async exportAgentSettlements(query: AgentSettlementQueryDto = {}, admin?: AdminContext) {
    this.assertAgentSettlementPermission(admin, "agent_settlement.export");
    const rows = await this.agentSettlementQuery(query, admin).take(10000).getMany();
    const includeSensitive = this.hasAgentSettlementPermission(admin, "agent_settlement.sensitive");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("代理结算");
    sheet.columns = [
      { header: "结算单号", key: "settlementNo", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "地区", key: "region", width: 16 },
      { header: "周期开", key: "periodStart", width: 22 },
      { header: "周期结束", key: "periodEnd", width: 22 },
      { header: "流水笔数", key: "transactionCount", width: 12 },
      { header: "退款笔", key: "refundCount", width: 12 },
      { header: "实收", key: "grossAmount", width: 12 },
      { header: "退", key: "refundAmount", width: 12 },
      { header: "净收入", key: "netAmount", width: 12 },
      { header: "Commission (%)", key: "commissionRate", width: 12 },
      { header: "佣金", key: "commissionAmount", width: 12 },
      { header: "应打", key: "payableAmount", width: 12 },
      { header: "Status", key: "status", width: 14 },
      { header: "生成", key: "generatedBy", width: 14 },
      { header: "审核", key: "reviewedBy", width: 14 },
      { header: "审核备注", key: "reviewRemark", width: 28 },
      { header: "打款", key: "paidBy", width: 14 },
      { header: "打款凭证", key: "paidReference", width: 20 },
      { header: "凭证附件", key: "paidProofUrl", width: 38 },
      { header: "打款备注", key: "paidRemark", width: 28 },
      { header: "创建时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) =>
      sheet.addRow({
        settlementNo: row.settlementNo,
        agent: row.agent?.name || "-",
        region: row.agent?.region || "-",
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        transactionCount: row.transactionCount,
        refundCount: row.refundCount,
        grossAmount: row.grossAmount,
        refundAmount: row.refundAmount,
        netAmount: row.netAmount,
        commissionRate: row.commissionRate,
        commissionAmount: row.commissionAmount,
        payableAmount: row.payableAmount,
        status: row.status,
        generatedBy: row.generatedBy,
        reviewedBy: row.reviewedBy,
        reviewRemark: row.reviewRemark,
        paidBy: includeSensitive ? row.paidBy : row.paidBy ? "***" : "",
        paidReference: includeSensitive ? row.paidReference : this.maskPaymentIdentifier(row.paidReference),
        paidProofUrl: includeSensitive && row.paidProofUrl ? "受控私有凭证" : row.paidProofUrl ? "已上传（无敏感权限）" : "",
        paidRemark: includeSensitive ? row.paidRemark : row.paidRemark ? "***" : "",
        createdAt: row.createdAt
      })
    );
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    await this.logExport(admin, "agent_settlements", rows.length, query);
    return workbook.xlsx.writeBuffer();
  }

  async confirmOfflinePayment(orderId: number, dto: ConfirmPaymentDto, admin: AdminContext) {
    const result = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Order);
      const order = await orderRepo.findOne({ where: { id: orderId }, lock: { mode: "pessimistic_write" } });
      if (!order) throw new NotFoundException("订单不存在");
      this.assertActivityAccess(order.registration.activity, admin);
      if (order.paymentMethod !== PaymentMethod.Offline) throw new BadRequestException("只有线下收款订单可以后台确认收款");
      if (order.status === OrderStatus.Paid) return { savedOrder: order, claimed: false, expired: false };
      if (order.status !== OrderStatus.PendingPayment) throw new BadRequestException("当前订单不能确认收款");
      if (order.registration.status === RegistrationStatus.Cancelled) throw new BadRequestException("已取消报名不能确认收款");
      if (this.isExpiredPendingOrder(order)) {
        const reason = "订单超时未付款，系统已关闭";
        order.status = OrderStatus.Closed;
        order.closedAt = order.closedAt || new Date();
        order.closeReason = order.closeReason || reason;
        if (order.registration.status === RegistrationStatus.PendingPayment) {
          order.registration.status = RegistrationStatus.Cancelled;
          order.registration.cancelReason = reason;
          await manager.getRepository(Registration).save(order.registration);
        }
        return { savedOrder: await orderRepo.save(order), claimed: false, expired: true };
      }
      order.status = OrderStatus.Paid;
      order.paidAt = new Date();
      order.paidByAdmin = this.actorName(admin);
      order.paidRemark = dto.remark || null;
      const savedOrder = await orderRepo.save(order);
      const paymentRepo = manager.getRepository(PaymentTransaction);
      const existingPayment = await paymentRepo.findOne({ where: { order: { id: savedOrder.id } } });
      if (!existingPayment) {
        await paymentRepo.save(paymentRepo.create({ order: savedOrder, tenant: savedOrder.tenant, transactionNo: savedOrder.transactionNo || `TX${Date.now()}${savedOrder.id}`, provider: "offline", paymentMethod: savedOrder.paymentMethod, amount: savedOrder.amount, status: "success", remark: dto.remark || "后台确认线下收款", reconciliationStatus: "matched", discrepancyType: null, reconciledBy: this.actorName(admin), reconciliationRemark: null, reconciledAt: new Date() }));
      }
      const registration = savedOrder.registration;
      registration.status = registration.activity.requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
      await manager.getRepository(Registration).save(registration);
      return { savedOrder, claimed: true, expired: false };
    });
    if (result.expired) {
      await this.refundRedeemedPoints(result.savedOrder, "订单超时关闭返还积分");
      throw new BadRequestException("订单已超时关闭，不能确认收款");
    }
    if (!result.claimed) return result.savedOrder;
    const savedOrder = result.savedOrder;
    if (Number(savedOrder.amount) > 0) await this.memberPoints.awardEvent({ user: savedOrder.registration.user, tenant: savedOrder.tenant || savedOrder.registration.activity?.tenant || null, eventType: "activity_order_paid", amountFen: Number(savedOrder.amountFen || yuanToFen(savedOrder.amount)), sourceType: "order_paid", sourceId: savedOrder.id, remark: "活动消费积分" });
    await this.charityFund.recordOrderAccrual(savedOrder, this.actorName(admin));
    await this.recordAdminConversionEvent("pay", { activity: savedOrder.registration.activity, user: savedOrder.registration.user, registration: savedOrder.registration, order: savedOrder, channel: savedOrder.registration.channel || null, source: "admin", idempotencyKey: `pay:${savedOrder.id}` });
    const smsContext = { userId: savedOrder.registration.user.id, activityId: savedOrder.registration.activity.id, tenantId: savedOrder.tenant?.id || savedOrder.registration.activity.tenant?.id || null };
    await this.automaticNotifications.publish({ ...smsContext, scene: "paymentSucceeded", businessId: savedOrder.id, variables: { orderNo: savedOrder.orderNo, amount: savedOrder.amount } });
    if (savedOrder.registration.status === RegistrationStatus.Approved) await this.automaticNotifications.publish({ ...smsContext, scene: "registrationApproved", businessId: savedOrder.registration.id });
    await this.logOperation(admin, "order.confirm_offline_payment", "order", savedOrder.id, `确认线下收款：${savedOrder.orderNo}`, { amount: savedOrder.amount, remark: dto.remark || null });
    return savedOrder;
  }

  async updateOrderRemark(orderId: number, dto: OrderRemarkDto, admin: AdminContext) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存");
    this.assertTenantAccess(order, admin);
    order.remark = dto.remark?.trim() || null;
    const saved = await this.orders.save(order);
    await this.logOperation({ ...admin, tenantId: order.tenant?.id ?? admin?.tenantId ?? null }, "order.update_remark", "order", saved.id, `更新订单备注：${saved.orderNo}`, { remark: saved.remark || null });
    return saved;
  }

  async getOperationSetting(admin?: AdminContext, requestedTenantId?: number | string | null) {
    const scope = await this.operationSettingTarget(admin, requestedTenantId);
    const setting = await this.operationSettings.findOne({ where: { id: scope.id } });
    const row = setting || this.createOperationSetting(admin, scope.tenant, scope.id);
    return this.publicOperationSettingForAdmin(row, scope.tenant);
  }

  async saveOperationSetting(dto: OperationSettingDto, admin?: AdminContext, requestedTenantId?: number | string | null) {
    const scope = await this.operationSettingTarget(admin, requestedTenantId);
    const setting = await this.ensureOperationSettingForTarget(admin, scope);
    const before = this.operationSettingAuditSnapshot(setting);
    if (this.isTenantScoped(admin)) this.assertTenantSubscriptionWritable(setting.tenant || (await this.currentTenantForAdmin(admin)), admin);
    const paymentSettingsEditable = this.isTenantScoped(admin) ? await this.canEditTenantPaymentSettings(admin) : true;
    Object.assign(setting, {
      registrationEnabled: dto.registrationEnabled ?? true,
      publicActivityArchiveEnabled: dto.publicActivityArchiveEnabled ?? setting.publicActivityArchiveEnabled ?? false,
      registrationDisabledMessage: dto.registrationDisabledMessage?.trim() || null,
      customerServiceName: dto.customerServiceName?.trim() || null,
      customerServicePhone: dto.customerServicePhone?.trim() || null,
      customerServiceWechat: dto.customerServiceWechat?.trim() || null,
      defaultGroupQrCodeUrl: dto.defaultGroupQrCodeUrl?.trim() || null,
      pageTheme: this.isPlainObject(dto.pageTheme) ? dto.pageTheme : {},
      userAgreementUrl: this.normalizeOptionalHttpsUrl(dto.userAgreementUrl, "用户协议地址"),
      privacyPolicyUrl: this.normalizeOptionalHttpsUrl(dto.privacyPolicyUrl, "隐私政策地址"),
      merchantAgreementUrl: this.normalizeOptionalHttpsUrl(dto.merchantAgreementUrl, "商户服务协议地址"),
      smsProviderEnabled: dto.smsProviderEnabled ?? false,
      smsProvider: dto.smsProvider?.trim() || null,
      smsAccessKeyId: dto.smsAccessKeyId?.trim() || null,
      smsAccessKeySecret: mergeStoredSecret(setting.smsAccessKeySecret, dto.smsAccessKeySecret, dto.clearSmsAccessKeySecret === true),
      smsSignName: dto.smsSignName?.trim() || null,
      smsTemplateId: dto.smsTemplateId?.trim() || null,
      smsSdkAppId: dto.smsSdkAppId?.trim() || null,
      automaticSms: normalizeAutomaticSmsSettings(dto.automaticSms === undefined ? setting.automaticSms : dto.automaticSms),
      automaticWechat: normalizeAutomaticWechatSettings(dto.automaticWechat === undefined ? setting.automaticWechat : dto.automaticWechat),
      postEventAutomation: normalizePostEventAutomationSettings(dto.postEventAutomation === undefined ? setting.postEventAutomation : dto.postEventAutomation)
    });
    if (paymentSettingsEditable) {
      this.assertOperationPaymentSettingPayload(dto);
      Object.assign(setting, {
        offlinePaymentInstructions: dto.offlinePaymentInstructions.trim(),
        paymentMethods: this.normalizePaymentMethods(dto.paymentMethods),
        refundInstructions: dto.refundInstructions.trim(),
        invoiceInstructions: dto.invoiceInstructions?.trim() || null
      });
    } else {
      setting.paymentMethods = this.normalizePaymentMethods(setting.paymentMethods);
    }
    if (!this.isTenantScoped(admin) && dto.launchConfig !== undefined) {
      setting.launchConfig = secureLaunchConfigForStorage(setting.launchConfig, dto.launchConfig, dto.clearLaunchConfigSecrets);
    }
    if (!scope.tenant && dto.defaultTenantCode !== undefined) {
      setting.defaultTenantCode = await this.normalizeDefaultTenantCode(dto.defaultTenantCode);
    }
    if (!scope.tenant && dto.tenantSwitcherEnabled !== undefined) {
      setting.tenantSwitcherEnabled = dto.tenantSwitcherEnabled;
    }
    const saved = await this.operationSettings.save(setting);
    await this.logOperation(this.operationActorForTenant(admin, scope.tenant), "settings.operation.update", "operation_setting", saved.id, "更新运营设置", auditDiff(before, this.operationSettingAuditSnapshot(saved)));
    return this.publicOperationSettingForAdmin(saved, scope.tenant);
  }

  async sendTestSms(dto: { phone: string }, admin?: AdminContext, requestedTenantId?: number | string | null) {
    this.assertSmsTestPermission(admin);
    const phone = this.normalizePhone(dto.phone);
    const scope = await this.operationSettingTarget(admin, requestedTenantId);
    const setting = await this.ensureOperationSettingForTarget(admin, scope);
    const code = "123456";
    const result = await this.notificationProvider.deliver({
      channel: "sms",
      title: "后台测试短信",
      content: `验证码 ${code}，5 分钟内有效。请勿转发给他人。`,
      to: { phone }
    }, {
      sms: {
        enabled: setting.smsProviderEnabled,
        provider: setting.smsProvider,
        accessKeyId: setting.smsAccessKeyId,
        accessKeySecret: decryptStoredSecret(setting.smsAccessKeySecret),
        signName: setting.smsSignName,
        templateId: setting.smsTemplateId,
        appId: setting.smsSdkAppId
      }
    });
    await this.h5AuthCodeLogs.save(this.h5AuthCodeLogs.create({
      phone,
      clientIp: null,
      mode: "sms_test",
      status: result.status === "sent" ? "sent" : "failed",
      provider: result.provider,
      providerMessageId: result.providerMessageId || null,
      message: result.status === "sent" ? "后台发送测试短信成功" : result.errorMessage || "后台发送测试短信失败",
      expiresAt: result.status === "sent" ? new Date(Date.now() + 5 * 60 * 1000) : null
    }));
    if (result.status !== "sent") throw new BadRequestException(result.errorMessage || "测试短信发送失败");
    await this.logOperation(this.operationActorForTenant(admin, scope.tenant), "settings.sms.test", "operation_setting", setting.id, `发送测试短信：${this.maskPhone(phone)}`, { provider: result.provider, providerMessageId: result.providerMessageId || null });
    return { provider: result.provider, providerMessageId: result.providerMessageId, status: result.status, message: "测试短信已提交服务商" };
  }

  async checkConfigurationConnectivity(admin?: AdminContext, requestedTenantId?: number | string | null) {
    const scope = await this.operationSettingTarget(admin, requestedTenantId);
    const setting = await this.ensureOperationSettingForTarget(admin, scope);
    const runtime = configWithLaunchOverrides(this.config, scope.tenant ? null : setting.launchConfig);
    const checks: Array<Record<string, unknown>> = [];
    checks.push(configuredChannelCheck("sms", "短信服务", setting.smsProviderEnabled, [["服务商", setting.smsProvider], ["签名", setting.smsSignName], ["访问密钥", decryptStoredSecret(setting.smsAccessKeySecret) || setting.smsAccessKeyId]]));
    const automaticSms = normalizeAutomaticSmsSettings(setting.automaticSms);
    const enabledAutomaticSmsScenes = automaticSmsScenes.filter((scene) => automaticSms[scene]);
    if (!automaticSms.enabled) {
      checks.push({ key: "automatic-sms", label: "自动业务短信", status: "disabled", message: "自动业务短信总开关未启用；验证码服务不受此开关影响。" });
    } else if (!setting.smsProviderEnabled) {
      checks.push({ key: "automatic-sms", label: "自动业务短信", status: "error", message: "自动通知已启用，但短信服务总开关未启用。" });
    } else if (setting.smsProvider !== "luosimao-sms") {
      checks.push({ key: "automatic-sms", label: "自动业务短信", status: "error", message: "当前自动业务短信仅支持 luosimao-sms，请切换服务商后再启用场景。" });
    } else if (!enabledAutomaticSmsScenes.length) {
      checks.push({ key: "automatic-sms", label: "自动业务短信", status: "warning", message: "自动通知已启用，但没有开启任何发送场景。" });
    } else if (runtime.get("BUSINESS_JOB_WORKER_ENABLED", "true") !== "true") {
      checks.push({ key: "automatic-sms", label: "自动业务短信", status: "error", message: `已开启场景：${enabledAutomaticSmsScenes.join("、")}；但后台任务消费者未运行，短信不会发送。` });
    } else {
      checks.push({ key: "automatic-sms", label: "自动业务短信", status: "ok", message: `已开启场景：${enabledAutomaticSmsScenes.join("、")}；报名成功请按活动类型同时开启审核通过或支付成功。` });
    }
    checks.push(configuredChannelCheck("agreements", "协议与隐私", true, [["用户协议", setting.userAgreementUrl], ["隐私政策", setting.privacyPolicyUrl]]));
    if (!scope.tenant) {
      checks.push(configuredChannelCheck("wechat-message", "微信订阅消息", runtime.get("WECHAT_MESSAGE_PROVIDER_ENABLED", "false") === "true", [["AppID", runtime.get("WECHAT_APP_ID", "")], ["AppSecret", runtime.get("WECHAT_APP_SECRET", "")]]));
      checks.push(configuredChannelCheck("wechat-pay", "微信支付", runtime.get("WECHAT_PAY_ENABLED", "false") === "true", [["AppID", runtime.get("WECHAT_PAY_APP_ID", "")], ["商户号", runtime.get("WECHAT_PAY_MCH_ID", "")], ["APIv3 Key", runtime.get("WECHAT_PAY_API_V3_KEY", "")], ["商户私钥", runtime.get("WECHAT_PAY_PRIVATE_KEY_PATH", "")], ["回调地址", runtime.get("WECHAT_PAY_NOTIFY_URL", "")]]));
      checks.push(configuredChannelCheck("alipay", "支付宝", runtime.get("ALIPAY_ENABLED", "false") === "true", [["AppID", runtime.get("ALIPAY_APP_ID", "")], ["应用私钥", runtime.get("ALIPAY_PRIVATE_KEY_PATH", "")], ["回调地址", runtime.get("ALIPAY_NOTIFY_URL", "")]]));
      const storageProvider = runtime.get<string>("STORAGE_PROVIDER", "local");
      const storageCheck = configuredChannelCheck("storage", "对象存储", storageProvider !== "local", [["Endpoint", runtime.get("STORAGE_ENDPOINT", "")], ["Bucket", runtime.get("STORAGE_BUCKET", "")], ["AccessKey", runtime.get("STORAGE_ACCESS_KEY_ID", "")], ["Secret", runtime.get("STORAGE_ACCESS_KEY_SECRET", "")], ["公开域名", runtime.get("STORAGE_PUBLIC_BASE_URL", "")]]);
      if (storageCheck.status === "ok") {
        try {
          const result = await testObjectStorageConnection({ provider: storageProvider, endpoint: runtime.get("STORAGE_ENDPOINT", ""), region: runtime.get("STORAGE_REGION", ""), bucket: runtime.get("STORAGE_BUCKET", ""), accessKeyId: runtime.get("STORAGE_ACCESS_KEY_ID", ""), accessKeySecret: runtime.get("STORAGE_ACCESS_KEY_SECRET", "") });
          checks.push({ ...storageCheck, message: "临时文件上传、读取和删除成功", latencyMs: result.latencyMs, operation: result.operation });
        } catch (error) {
          checks.push({ ...storageCheck, status: "error", message: error instanceof Error ? error.message.slice(0, 180) : "对象存储连接失败" });
        }
      } else checks.push(storageCheck);
      for (const [key, label, value] of [["h5-domain", "H5 公开域名", runtime.get("PUBLIC_H5_ORIGIN", "")], ["admin-domain", "后台公开域名", runtime.get("PUBLIC_ADMIN_ORIGIN", "")], ["api-domain", "API 公开域名", runtime.get("PUBLIC_API_ORIGIN", "")], ["storage-domain", "文件公开域名", runtime.get("STORAGE_PUBLIC_BASE_URL", "")]] as const) {
        checks.push(await this.probeConfiguredUrl(key, label, value));
      }
      for (const [key, label, path] of [["wechat-private-key", "微信商户私钥", runtime.get("WECHAT_PAY_PRIVATE_KEY_PATH", "")], ["wechat-platform-cert", "微信平台证书", runtime.get("WECHAT_PAY_PLATFORM_CERT_PATH", "")], ["alipay-private-key", "支付宝应用私钥", runtime.get("ALIPAY_PRIVATE_KEY_PATH", "")]] as const) {
        if (path) checks.push({ key, label, status: existsSync(path) ? "ok" : "error", message: existsSync(path) ? "文件可读取" : "配置文件不存在" });
      }
    }
    const summary = { ok: checks.filter((item) => item.status === "ok").length, warning: checks.filter((item) => item.status === "warning").length, error: checks.filter((item) => item.status === "error").length, disabled: checks.filter((item) => item.status === "disabled").length };
    await this.logOperation(admin, "settings.connectivity.check", "operation_setting", setting.id, "执行配置连通性检测", summary);
    return { checkedAt: new Date().toISOString(), status: summary.error ? "error" : summary.warning ? "warning" : "ok", summary, checks };
  }

  private async probeConfiguredUrl(key: string, label: string, value: unknown) {
    if (!String(value || "").trim()) return { key, label, status: "warning", message: "未配置" };
    const url = safeConnectivityUrl(value);
    if (!url) return { key, label, status: "error", message: "地址格式无效或不允许探测" };
    const started = Date.now();
    try {
      const response = await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(5000) });
      return { key, label, status: response.status < 500 ? "ok" : "error", message: `HTTP ${response.status}`, latencyMs: Date.now() - started, target: `${url.protocol}//${url.host}` };
    } catch (error) {
      return { key, label, status: "error", message: error instanceof Error ? error.message.slice(0, 180) : "连接失败", latencyMs: Date.now() - started, target: `${url.protocol}//${url.host}` };
    }
  }

  async refundOrder(orderId: number, dto: RefundDto, admin: AdminContext) {
    const refundNo = dto.refundNo?.trim() || `RF${Date.now()}${orderId}`;
    const result = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Order);
      const refundRepo = manager.getRepository(Refund);
      const order = await orderRepo.findOne({ where: { id: orderId }, lock: { mode: "pessimistic_write" } });
      if (!order) throw new NotFoundException("订单不存在");
      this.assertTenantAccess(order, admin);
      const existing = await refundRepo.findOne({ where: { refundNo } });
      if (existing) return { refund: existing, order, idempotent: true };
      if (![OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(order.status)) throw new BadRequestException("当前订单不能退款");
      const reservedRow = await refundRepo.createQueryBuilder("refund").select("COALESCE(SUM(refund.amountFen), 0)", "sum").where("refund.orderId = :orderId", { orderId: order.id }).andWhere("refund.status IN (:...statuses)", { statuses: ["pending", "processing", "completed"] }).getRawOne<{ sum: string }>();
      const { requestFen: amountFen } = assertRefundCapacity(order.amount, reservedRow?.sum, dto.amount);
      const refund = await refundRepo.save(refundRepo.create({ order, tenant: this.tenantRelation(admin, order.tenant), refundNo, amount: (amountFen / 100).toFixed(2), status: "pending", operator: this.actorName(admin), reason: dto.reason || null }));
      return { refund, order, idempotent: false };
    });
    const { refund, order } = result;
    if (result.idempotent) return result;
    await this.logOperation(admin, "refund.request", "refund", refund.id, `Request refund: ${refund.refundNo}`, { orderNo: order.orderNo, amount: refund.amount, reason: refund.reason });
    return { refund, order, idempotent: false, pending: true };
  }

  async approveRefund(refundId: number, dto: ReviewDto, admin: AdminContext) {
    const claimed = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Refund);
      const locked = await this.lockedRefund(repo, refundId, true);
      if (!locked) throw new NotFoundException("退款申请不存在");
      this.assertTenantAccess(locked, admin);
      const claim = canClaimRefundReview(locked.status);
      if (claim === "idempotent") return { refund: locked, claimed: false };
      if (claim !== "claim") throw new BadRequestException("只有待审核退款可以通过");
      locked.status = "submitting";
      locked.reviewedBy = this.actorName(admin);
      locked.reviewRemark = dto.remark || null;
      locked.reviewedAt = new Date();
      return { refund: await repo.save(locked), claimed: true };
    });
    if (!claimed.claimed) return { refund: claimed.refund, order: claimed.refund.order, idempotent: true, providerPending: claimed.refund.status === "processing" };
    const refund = claimed.refund;
    this.assertTenantAccess(refund, admin);
    const order = refund.order;
    if (![OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(order.status)) throw new BadRequestException("当前订单不能退");
    const reservedRefunds = await this.refunds.find({ where: { order: { id: order.id }, status: In(["processing", "completed"]) } });
    const refunded = reservedRefunds.filter((item) => item.status === "completed").reduce((sum, item) => sum + Number(item.amount), 0);
    const reserved = reservedRefunds.filter((item) => item.id !== refund.id).reduce((sum, item) => sum + Number(item.amount), 0);
    const amount = Number(refund.amount);
    if (reserved + amount - Number(order.amount) > 0.001) throw new BadRequestException("退款金额不能超过订单实付金");
    let providerRefund: Awaited<ReturnType<AdminService["requestProviderRefundIfNeeded"]>>;
    try {
      providerRefund = await this.requestProviderRefundIfNeeded(order, refund, this.actorName(admin));
    } catch (error) {
      refund.status = "failed";
      refund.providerRefundFailureReason = error instanceof Error ? error.message : "服务商退款提交失败";
      refund.providerRefundRetryCount = Number(refund.providerRefundRetryCount || 0) + 1;
      refund.providerRefundSyncedAt = new Date();
      await this.refunds.save(refund);
      throw error;
    }
    const now = new Date();
    if (providerRefund) {
      refund.providerRefundNo = providerRefund.providerRefundNo;
      refund.providerRefundStatus = providerRefund.status;
      refund.providerRefundSyncedAt = now;
      refund.providerRefundPayload = providerRefund.raw || null;
      refund.providerRefundFailureReason = null;
      refund.providerRefundRetryCount = Number(refund.providerRefundRetryCount || 0) + 1;
      refund.providerRefundNextQueryAt = providerRefund.status === "accepted" || providerRefund.status === "processing" ? new Date(Date.now() + 10 * 60 * 1000) : null;
      if (providerRefund.status === "failed") {
        refund.status = "failed";
        refund.reviewedBy = this.actorName(admin);
        refund.reviewRemark = dto.remark || null;
        refund.reviewedAt = now;
        refund.providerRefundFailureReason = "服务商退款失败";
        const savedRefund = await this.refunds.save(refund);
        await this.logOperation(admin, "refund.provider_failed", "refund", savedRefund.id, `服务商退款失败：${savedRefund.refundNo}`, { orderNo: order.orderNo, amount: savedRefund.amount, providerRefundNo: savedRefund.providerRefundNo });
        return { refund: savedRefund, order, providerPending: false };
      }
      if (providerRefund.status === "accepted" || providerRefund.status === "processing") {
        refund.status = "processing";
        refund.reviewedBy = this.actorName(admin);
        refund.reviewRemark = dto.remark || null;
        refund.reviewedAt = now;
        const savedRefund = await this.refunds.save(refund);
        await this.logOperation(admin, "refund.provider_processing", "refund", savedRefund.id, `服务商退款处理中：${savedRefund.refundNo}`, { orderNo: order.orderNo, amount: savedRefund.amount, providerRefundNo: savedRefund.providerRefundNo, providerRefundStatus: savedRefund.providerRefundStatus });
        await this.businessJobs.publish({
          tenantId: order.registration?.activity?.tenant?.id || null,
          type: "refund.provider-query",
          idempotencyKey: `refund:${savedRefund.id}`,
          payload: { refundId: savedRefund.id, tenantId: order.registration?.activity?.tenant?.id || null },
          runAt: savedRefund.providerRefundNextQueryAt || new Date(),
          maxAttempts: 8
        });
        return { refund: savedRefund, order, providerPending: true };
      }
    }
    const completed = await this.refundCompletion.complete({ refund, order, actorName: this.actorName(admin), remark: dto.remark || null, now });
    await this.logOperation(admin, "refund.approve", "refund", completed.refund.id, `通过退款审核：${completed.refund.refundNo}`, { orderNo: completed.order.orderNo, amount: completed.refund.amount, remark: dto.remark || null });
    return { refund: completed.refund, order: completed.order };
  }

  async rejectRefund(refundId: number, dto: ReviewDto, admin: AdminContext) {
    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Refund);
      const refund = await this.lockedRefund(repo, refundId);
      if (!refund) throw new NotFoundException("退款申请不存在");
      this.assertTenantAccess(refund, admin);
      if (refund.status === "rejected") return { saved: refund, claimed: false };
      if (refund.status !== "pending") throw new BadRequestException("只有待审核退款可以拒绝");
      refund.status = "rejected";
      refund.reviewedBy = this.actorName(admin);
      refund.reviewRemark = dto.remark || null;
      refund.reviewedAt = new Date();
      return { saved: await repo.save(refund), claimed: true };
    });
    if (!result.claimed) return result.saved;
    const saved = await this.refunds.findOne({ where: { id: result.saved.id } }) || result.saved;
    if (saved.order?.registration?.user?.id && saved.order.registration.activity?.id) {
      await this.automaticNotifications.publish({ scene: "refundRejected", businessId: saved.id, userId: saved.order.registration.user.id, activityId: saved.order.registration.activity.id, tenantId: saved.tenant?.id || saved.order.tenant?.id || saved.order.registration.activity.tenant?.id || null, variables: { orderNo: saved.order.orderNo, amount: saved.amount } });
    }
    await this.logOperation(admin, "refund.reject", "refund", saved.id, `拒绝退款申请：${saved.refundNo}`, { remark: dto.remark || null });
    return saved;
  }

  async scanProviderRefunds(admin: AdminContext) {
    const staleSubmittingBuilder = this.refunds
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .leftJoinAndSelect("order.registration", "registration")
      .where("refund.status = :status", { status: "submitting" })
      .andWhere("refund.reviewedAt <= :deadline", { deadline: new Date(Date.now() - 10 * 60 * 1000) })
      .orderBy("refund.reviewedAt", "ASC")
      .take(20);
    this.applyTenantScope(staleSubmittingBuilder, "refund", admin);
    const staleSubmitting = await staleSubmittingBuilder.getMany();
    const recovered: Array<{ id: number; refundNo: string; action: string }> = [];
    for (const row of staleSubmitting) {
      const marked = await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Refund);
        const locked = await this.lockedRefund(repo, row.id);
        if (!locked || locked.status !== "submitting") return false;
        locked.status = "failed";
        locked.providerRefundFailureReason = "退款渠道提交结果超时未知，系统使用原退款单号自动补偿重试";
        locked.providerRefundSyncedAt = new Date();
        await repo.save(locked);
        return true;
      });
      if (!marked) continue;
      try {
        await this.retryRefund(row.id, { remark: "submitting 超时自动补偿" }, admin);
        recovered.push({ id: row.id, refundNo: row.refundNo, action: "retried" });
      } catch (error) {
        recovered.push({ id: row.id, refundNo: row.refundNo, action: `retry_failed:${error instanceof Error ? error.message : "unknown"}` });
      }
    }
    const builder = this.refunds
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.user", "user")
      .where("refund.status IN (:...statuses)", { statuses: ["processing"] })
      .andWhere("refund.providerRefundStatus IS NOT NULL")
      .andWhere("(refund.providerRefundNextQueryAt IS NULL OR refund.providerRefundNextQueryAt <= :now)", { now: new Date() })
      .orderBy("refund.createdAt", "ASC")
      .take(50);
    this.applyTenantScope(builder, "refund", admin);
    const rows = await builder.getMany();
    const checked: Array<{ id: number; refundNo: string; status: string; action: string }> = [];
    for (const refund of rows) {
      const provider = this.refundProviderForOrder(refund.order);
      if (!provider) continue;
      refund.providerRefundRetryCount = Number(refund.providerRefundRetryCount || 0) + 1;
      try {
        const result = await this.paymentProvider.queryRefund({ provider, order: refund.order, refundNo: refund.refundNo, providerRefundNo: refund.providerRefundNo });
        refund.providerRefundNo = result.providerRefundNo || refund.providerRefundNo;
        refund.providerRefundStatus = result.status;
        refund.providerRefundSyncedAt = new Date();
        refund.providerRefundPayload = { ...(refund.providerRefundPayload || {}), lastQuery: result.raw || result };
        refund.providerRefundFailureReason = result.failureReason || null;
        if (result.status === "success") {
          await this.refundCompletion.complete({ refund, order: refund.order, actorName: this.actorName(admin), remark: refund.reviewRemark || "服务商退款查询确认成" });
          checked.push({ id: refund.id, refundNo: refund.refundNo, status: "completed", action: "completed" });
        } else if (result.status === "failed") {
          refund.status = "failed";
          refund.providerRefundNextQueryAt = null;
          await this.refunds.save(refund);
          checked.push({ id: refund.id, refundNo: refund.refundNo, status: refund.status, action: "failed" });
        } else {
          refund.status = "processing";
          refund.providerRefundNextQueryAt = new Date(Date.now() + Math.min(60, 10 * refund.providerRefundRetryCount) * 60 * 1000);
          await this.refunds.save(refund);
          checked.push({ id: refund.id, refundNo: refund.refundNo, status: refund.status, action: "processing" });
        }
      } catch (error) {
        refund.providerRefundSyncedAt = new Date();
        refund.providerRefundFailureReason = error instanceof Error ? error.message : "服务商退款查询失";
        refund.providerRefundNextQueryAt = new Date(Date.now() + Math.min(60, 10 * refund.providerRefundRetryCount) * 60 * 1000);
        refund.providerRefundPayload = { ...(refund.providerRefundPayload || {}), lastQueryError: { message: refund.providerRefundFailureReason, checkedAt: new Date().toISOString() } };
        await this.refunds.save(refund);
        checked.push({ id: refund.id, refundNo: refund.refundNo, status: refund.status, action: "query_error" });
      }
    }
    await this.logOperation(admin, "refund.provider_scan", "refund", null, `Scan provider refunds: ${checked.length}`, { checked });
    return { recoveredCount: recovered.length, recovered, checkedCount: checked.length, checked };
  }

  async listCheckInPoints(activityId: number | undefined, admin?: AdminContext) {
    const builder = this.checkInPoints.createQueryBuilder("point").leftJoinAndSelect("point.activity", "activity").leftJoinAndSelect("point.tenant", "tenant").orderBy("point.enabled", "DESC").addOrderBy("point.name", "ASC");
    if (this.isTenantScoped(admin)) builder.andWhere("point.tenantId = :tenantId", { tenantId: admin?.tenantId });
    if (activityId) builder.andWhere("activity.id = :activityId", { activityId });
    return (await builder.take(200).getMany()).filter(row => { try { this.assertActivityAccess(row.activity, admin); return true; } catch { return false; } });
  }

  async saveCheckInPoint(dto: { activityId?: number; name?: string; location?: string; enabled?: boolean }, id: number | undefined, admin?: AdminContext) {
    const activity = await this.activities.findOne({ where: { id: Number(dto.activityId) } });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    const row = id ? await this.checkInPoints.findOne({ where: { id } }) : this.checkInPoints.create();
    if (!row) throw new NotFoundException("核销点不存在");
    if (id && row.activity.id !== activity.id) throw new BadRequestException("核销点不能转移到其他活动");
    Object.assign(row, { activity, tenant: activity.tenant || null, name: String(dto.name || "").trim(), location: String(dto.location || "").trim() || null, enabled: dto.enabled !== false });
    if (!row.name) throw new BadRequestException("请输入核销点名称");
    const saved = await this.checkInPoints.save(row);
    await this.logOperation(admin, id ? "check_in.point.update" : "check_in.point.create", "check_in_point", saved.id, `${id ? "更新" : "创建"}核销点：${saved.name}`, { activityId: activity.id, enabled: saved.enabled });
    return saved;
  }

  async revokeCheckIn(id: number, reason: string | undefined, admin: AdminContext & { id: number }) {
    const row = await this.checkIns.findOne({ where: { id }, relations: { registration: { activity: true }, operator: true, point: true, revokedBy: true } });
    if (!row) throw new NotFoundException("核销记录不存在");
    this.assertActivityAccess(row.registration.activity, admin);
    if (row.revokedAt) throw new BadRequestException("该核销已撤销，请勿重复操作");
    if (!reason?.trim()) throw new BadRequestException("撤销核销必须填写原因");
    const maxMinutes = Math.max(1, Number(this.config.get("CHECKIN_REVOKE_MINUTES", "120")) || 120);
    if (!checkInRevocationAllowed({ checkedInAt: row.createdAt, maxMinutes, isSuperAdmin: admin.role === AdminRole.SuperAdmin })) throw new BadRequestException(`核销超过 ${maxMinutes} 分钟，仅超级管理员可撤销`);
    await this.dataSource.transaction(async manager => {
      const locked = await manager.getRepository(CheckIn).findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!locked || locked.revokedAt) throw new BadRequestException("该核销已撤销，请勿重复操作");
      Object.assign(locked, { revokedAt: new Date(), revokedBy: { id: admin.id } as AdminUser, revokeReason: reason.trim() });
      await manager.getRepository(CheckIn).save(locked);
      await manager.getRepository(Registration).update(row.registration.id, { status: RegistrationStatus.Approved });
      await manager.getRepository(ConversionEvent).delete({ idempotencyKey: `check_in:${id}` });
    });
    await this.logOperation(admin, "check_in.revoke", "check_in", id, `撤销核销：${row.registration.activity.title}`, { registrationId: row.registration.id, reason: reason.trim(), originalOperatorId: row.operator.id, pointId: row.point?.id || null });
    return this.checkIns.findOne({ where: { id } });
  }

  async createOfflineCheckInManifest(dto: { activityId?: number; pointId?: number; deviceId?: string }, admin?: AdminContext) {
    const activity = await this.activities.findOne({ where: { id: Number(dto.activityId) } });
    if (!activity) throw new NotFoundException("活动不存在");
    this.assertActivityAccess(activity, admin);
    const point = await this.checkInPoints.findOne({ where: { id: Number(dto.pointId) } });
    if (!point || !point.enabled || point.activity.id !== activity.id) throw new BadRequestException("离线核销必须选择当前活动的有效核销点");
    const deviceId = String(dto.deviceId || "").trim();
    if (!deviceId || deviceId.length > 100) throw new BadRequestException("离线设备标识不正确");
    const policy = offlineCheckInPolicy({ configuredHours: this.config.get("CHECKIN_OFFLINE_HOURS", "8"), configuredMaxRows: this.config.get("CHECKIN_OFFLINE_MAX_ROWS", "5000") });
    const maxRows = policy.maxRows;
    const expiresAt = new Date(Date.now() + policy.hours * 3600000);
    const rows = await this.registrations.createQueryBuilder("registration").leftJoinAndSelect("registration.activity", "activity").leftJoinAndSelect("registration.user", "user").leftJoinAndMapOne("registration.order", Order, "linkedOrder", "linkedOrder.registrationId = registration.id").where("activity.id = :activityId", { activityId: activity.id }).andWhere("registration.status = :status", { status: RegistrationStatus.Approved }).orderBy("registration.id", "ASC").take(maxRows + 1).getMany();
    if (rows.length > maxRows) throw new BadRequestException(`可离线核销人数超过 ${maxRows}，请使用在线模式或调整受控清单上限`);
    const secret = this.config.get<string>("CHECKIN_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
    const tickets = rows.filter((registration: any) => !registration.order || ![OrderStatus.PendingPayment, OrderStatus.Refunded, OrderStatus.Cancelled, OrderStatus.Closed].includes(registration.order.status)).map((registration: any) => ({
      registrationId: registration.id,
      code: createCheckInTicket({ registrationId: registration.id, activityId: activity.id, expiresAt, nonce: checkInNonce(registration.checkInCode, secret) }, secret),
      name: registration.answers?.find((item: any) => String(item.label || item.name || "").includes("姓名"))?.value || registration.user?.nickname || "-",
      phoneTail: String(registration.user?.phone || "").slice(-4)
    }));
    const manifest = { version: 1, deviceId, activity: { id: activity.id, title: activity.title }, point: { id: point.id, name: point.name }, issuedAt: new Date().toISOString(), expiresAt: expiresAt.toISOString(), tickets };
    await this.logOperation(admin, "check_in.offline_manifest", "activity", activity.id, `签发离线核销清单：${activity.title}`, { deviceId, pointId: point.id, expiresAt, ticketCount: tickets.length });
    return manifest;
  }

  async syncOfflineCheckIns(dto: { deviceId?: string; items?: Array<{ localId?: string; code?: string; scannedAt?: string; pointId?: number }> }, admin: AdminContext & { id: number }) {
    const deviceId = String(dto.deviceId || "").trim();
    const items = Array.isArray(dto.items) ? dto.items.slice(0, 500) : [];
    if (!deviceId || !items.length) throw new BadRequestException("离线设备标识或待同步记录为空");
    const results: Array<{ localId: string; success: boolean; checkInId?: number; message: string }> = [];
    for (const item of items) {
      const localId = String(item.localId || "").trim();
      try {
        const result = await this.checkIn(String(item.code || ""), admin.id, `离线补传；设备 ${deviceId}；本地时间 ${item.scannedAt || "未知"}`, admin, undefined, Number(item.pointId) || undefined);
        results.push({ localId, success: true, checkInId: result.id, message: "同步成功" });
      } catch (error: any) { results.push({ localId, success: false, message: error?.message || "同步冲突" }); }
    }
    await this.logOperation(admin, "check_in.offline_sync", "check_in", null, `同步离线核销：成功 ${results.filter(item => item.success).length} 条，冲突 ${results.filter(item => !item.success).length} 条`, { deviceId, total: results.length, results });
    return { deviceId, results, successCount: results.filter(item => item.success).length, conflictCount: results.filter(item => !item.success).length };
  }

  async checkIn(code: string, adminId: number, remark?: string, currentAdmin?: AdminContext, expectedActivityId?: number, pointId?: number) {
    const secret = this.config.get<string>("CHECKIN_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
    const ticket = verifyCheckInTicket(code, secret);
    if (ticket.signed && !ticket.valid) throw new BadRequestException(ticket.reason === "expired" ? "签到二维码已过期" : "签到二维码签名无效，请勿使用截图篡改票");
    const registration = await this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("registration.channel", "channel")
      .where(ticket.signed && ticket.valid ? "registration.id = :registrationId" : "registration.checkInCode = :code", ticket.signed && ticket.valid ? { registrationId: ticket.registrationId } : { code })
      .getOne();
    if (!registration) throw new NotFoundException("签到码不存在");
    if (ticket.signed && ticket.valid && (registration.activity.id !== ticket.activityId || checkInNonce(registration.checkInCode, secret) !== ticket.nonce)) throw new BadRequestException("签到二维码与报名记录不匹配或已失效");
    if (expectedActivityId && registration.activity.id !== expectedActivityId) throw new BadRequestException(`该票属于“${registration.activity.title}”，不能在当前活动核销`);
    this.assertActivityAccess(registration.activity, currentAdmin);
    if (this.isTenantScoped(currentAdmin) && registration.tenant?.id !== currentAdmin?.tenantId && registration.activity.tenant?.id !== currentAdmin?.tenantId) throw new NotFoundException("Resource not found or not in current tenant");
    if (registration.status === RegistrationStatus.CheckedIn) throw new BadRequestException("该报名已签到，请勿重复核销");
    if (registration.status !== RegistrationStatus.Approved) throw new BadRequestException("只有报名成功可以签到");
    const eligibilityOrder = await this.orders.findOne({ where: { registration: { id: registration.id } } });
    if (eligibilityOrder && [OrderStatus.Refunded, OrderStatus.Cancelled, OrderStatus.Closed].includes(eligibilityOrder.status)) throw new BadRequestException(eligibilityOrder.status === OrderStatus.Refunded ? "该票已退款，不能核销" : "该票对应订单已取消或关闭，不能核销");
    if (eligibilityOrder?.status === OrderStatus.PendingPayment) throw new BadRequestException("该票尚未完成支付，不能核销");
    const admin = await this.admins.findOneBy({ id: adminId });
    if (!admin) throw new UnauthorizedException("管理员不存在");
    const point = pointId ? await this.checkInPoints.findOne({ where: { id: pointId } }) : null;
    if (pointId && (!point || !point.enabled || point.activity.id !== registration.activity.id)) throw new BadRequestException("核销点不存在、已停用或不属于当前活动");
    const checkInId = await this.dataSource.transaction(async manager => {
      const registrationRepo = manager.getRepository(Registration);
      const checkInRepo = manager.getRepository(CheckIn);
      const locked = await registrationRepo.createQueryBuilder("registration").setLock("pessimistic_write").where("registration.id = :id", { id: registration.id }).getOne();
      if (!locked) throw new NotFoundException("报名记录不存在");
      if (locked.status === RegistrationStatus.CheckedIn) throw new BadRequestException("该报名已被其他设备核销，请勿重复操作");
      if (locked.status !== RegistrationStatus.Approved) throw new BadRequestException("报名状态已变化，当前不能核销");
      const activeCheckIn = await checkInRepo.createQueryBuilder("checkIn").where("checkIn.registrationId = :registrationId", { registrationId: registration.id }).andWhere("checkIn.revokedAt IS NULL").getOne();
      if (activeCheckIn) throw new BadRequestException("该报名已被其他设备核销，请勿重复操作");
      locked.status = RegistrationStatus.CheckedIn;
      await registrationRepo.save(locked);
      const saved = await checkInRepo.save(checkInRepo.create({ registration: { id: registration.id } as Registration, operator: { id: admin.id } as AdminUser, point: point ? ({ id: point.id } as CheckInPoint) : null, remark: remark || null, revokedAt: null, revokedBy: null, revokeReason: null }));
      return saved.id;
    });
    registration.status = RegistrationStatus.CheckedIn;
    const [checkIn, order] = await Promise.all([
      this.checkIns.findOne({ where: { id: checkInId }, relations: { operator: true, registration: { activity: true, user: true, tenant: true } } }),
      this.orders.findOne({ where: { registration: { id: registration.id } }, relations: { ticketType: true } })
    ]);
    await this.recordAdminConversionEvent("check_in", { activity: registration.activity, user: registration.user, registration, order, channel: registration.channel || null, idempotencyKey: `check_in:${checkInId}` });
    await this.memberPoints.awardEvent({ user: registration.user, tenant: registration.tenant || registration.activity.tenant || null, eventType: "activity_check_in", sourceType: "check_in", sourceId: checkInId, remark: "活动签到奖励" });
    await this.automaticNotifications.publish({ scene: "checkInSucceeded", businessId: checkInId, userId: registration.user.id, activityId: registration.activity.id, tenantId: registration.tenant?.id || registration.activity.tenant?.id || null });
    await this.logOperation(currentAdmin || { id: admin.id, username: admin.username, role: admin.role, tenantId: admin.tenant?.id ?? null }, "check_in.verify", "registration", registration.id, `签到核销：${registration.activity.title}`, { code, remark: remark || null });
    return {
      id: checkInId,
      status: registration.status,
      createdAt: checkIn?.createdAt || new Date(),
      remark: checkIn?.remark || remark || null,
      point: checkIn?.point ? { id: checkIn.point.id, name: checkIn.point.name, location: checkIn.point.location } : null,
      operator: checkIn?.operator ? { id: checkIn.operator.id, username: checkIn.operator.username, name: checkIn.operator.username } : { id: admin.id, username: admin.username, name: admin.username },
      registration: {
        id: registration.id,
        status: registration.status,
        answers: registration.answers,
        user: registration.user ? { id: registration.user.id, phone: maskPhone(registration.user.phone), nickname: registration.user.nickname } : null,
        activity: registration.activity ? {
          id: registration.activity.id,
          title: registration.activity.title,
          startTime: registration.activity.startTime,
          endTime: registration.activity.endTime,
          location: registration.activity.location
        } : null
      },
      order: order ? {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        amount: order.amount,
        ticketType: order.ticketType ? { id: order.ticketType.id, name: order.ticketType.name } : null
      } : null,
      activity: {
        id: registration.activity.id,
        title: registration.activity.title,
        startTime: registration.activity.startTime,
        endTime: registration.activity.endTime,
        location: registration.activity.location
      }
    };
  }

  async waitlistOptions(admin?: AdminContext) {
    const builder = this.activities.createQueryBuilder("activity")
      .leftJoin("activity.tenant", "tenant")
      .select(["activity.id", "activity.title", "activity.status", "activity.createdAt", "tenant.id", "tenant.code", "tenant.name"])
      .orderBy("activity.createdAt", "DESC");
    this.applyTenantScope(builder, "activity", admin);
    applyAdminActivityDataScope(builder, "activity", admin?.dataScope);
    const rows = await builder.getMany();
    return { activities: rows.map((row) => ({ id: row.id, title: row.title, status: row.status, tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null })) };
  }

  async listWaitlists(query: WaitlistQueryDto = {}, admin?: AdminContext) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.waitlists
      .createQueryBuilder("waitlist")
      .leftJoin("waitlist.activity", "activity")
      .leftJoin("activity.tenant", "tenant")
      .leftJoin("waitlist.user", "user")
      .leftJoin("waitlist.promotedRegistration", "promotedRegistration")
      .select([
        "waitlist.id", "waitlist.status", "waitlist.answers", "waitlist.remark", "waitlist.createdAt", "waitlist.updatedAt",
        "activity.id", "activity.title", "activity.status", "activity.capacity",
        "tenant.id", "tenant.code", "tenant.name",
        "user.id", "user.nickname", "user.phone",
        "promotedRegistration.id", "promotedRegistration.status"
      ])
      .orderBy("waitlist.createdAt", "ASC");
    this.applyTenantScope(builder, "activity", admin);
    applyAdminActivityDataScope(builder, "activity", admin?.dataScope);
    if (query.activityId) builder.andWhere("activity.id = :activityId", { activityId: query.activityId });
    if (query.status) builder.andWhere("waitlist.status = :status", { status: query.status });
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const includeSensitive = Boolean(admin?.permissions?.includes("waitlist.sensitive"));
    return { items: rows.map((row) => this.publicWaitlist(row, includeSensitive)), total, page, pageSize };
  }

  async promoteWaitlist(id: number, admin?: AdminContext) {
    const waitlist = await this.waitlists.findOne({ where: { id } });
    if (!waitlist) throw new NotFoundException("候补记录不存");
    this.assertActivityAccess(waitlist.activity, admin);
    if (waitlist.status !== WaitlistStatus.Waiting) throw new BadRequestException("只有等待中的候补可以补位");
    await this.ensureActivityMemberAccess(waitlist.activity, waitlist.user);
    const saved = await this.dataSource.transaction(async (manager) => {
      const waitlistRepo = manager.getRepository(Waitlist);
      const activityRepo = manager.getRepository(Activity);
      const registrationRepo = manager.getRepository(Registration);
      const orderRepo = manager.getRepository(Order);
      const lockedWaitlist = await waitlistRepo.createQueryBuilder("waitlist").setLock("pessimistic_write").leftJoinAndSelect("waitlist.activity", "activity").leftJoinAndSelect("activity.tenant", "tenant").leftJoinAndSelect("activity.agent", "agent").leftJoinAndSelect("waitlist.user", "user").where("waitlist.id = :id", { id }).getOne();
      if (!lockedWaitlist || lockedWaitlist.status !== WaitlistStatus.Waiting) throw new BadRequestException("候补状态已变化，请刷新后重试");
      const activity = await activityRepo.createQueryBuilder("activity").setLock("pessimistic_write").where("activity.id = :activityId", { activityId: lockedWaitlist.activity.id }).getOneOrFail();
      const used = await registrationRepo.createQueryBuilder("registration").where("registration.activityId = :activityId", { activityId: activity.id }).andWhere("registration.status IN (:...statuses)", { statuses: [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn] }).getCount();
      if (used >= activity.capacity) throw new BadRequestException("当前活动仍无可用名额");
      const price = Number(activity.price);
      const status = price > 0 ? RegistrationStatus.PendingPayment : activity.requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
      const tenant = lockedWaitlist.activity.tenant || null;
      const registration = await registrationRepo.save(registrationRepo.create({ activity: lockedWaitlist.activity, tenant, user: lockedWaitlist.user, channel: null, attributionSource: "waitlist", attributionChannelCode: null, attributionChannelName: null, attributionProvince: activity.locationProvince || null, attributionCity: activity.locationCity || null, attributionDistrict: activity.locationDistrict || null, attributionCapturedAt: new Date(), status, answers: lockedWaitlist.answers, formSchemaVersion: Number(activity.formSchemaVersion || 1), formSnapshot: (lockedWaitlist.activity.fields || []).map((field: any) => ({ id: field.id, label: field.label, type: field.type, required: field.required, options: field.options || [], sortOrder: field.sortOrder })), companions: null, privacyConsentAt: null, checkInCode: uuidv4() }));
      await orderRepo.save(orderRepo.create({ orderNo: `OD${Date.now()}${registration.id}`, registration, tenant, agent: lockedWaitlist.activity.agent, amount: price.toFixed(2), paymentMethod: price > 0 ? PaymentMethod.Offline : PaymentMethod.Free, status: price > 0 ? OrderStatus.PendingPayment : OrderStatus.Paid, paidAt: price > 0 ? null : new Date(), expiresAt: this.paymentExpiresAt(price) }));
      lockedWaitlist.status = WaitlistStatus.Promoted;
      lockedWaitlist.promotedRegistration = registration;
      return waitlistRepo.save(lockedWaitlist);
    });
    const promotedOrder = saved.promotedRegistration ? await this.orders.findOne({ where: { registration: { id: saved.promotedRegistration.id } } }) : null;
    if (saved.promotedRegistration) await this.recordAdminConversionEvent("register", { activity: saved.activity, user: saved.promotedRegistration.user, registration: saved.promotedRegistration, order: promotedOrder, source: "waitlist", idempotencyKey: `register:${saved.promotedRegistration.id}` });
    if (promotedOrder?.status === OrderStatus.Paid) await this.recordAdminConversionEvent("pay", { activity: saved.activity, user: saved.promotedRegistration!.user, registration: saved.promotedRegistration, order: promotedOrder, source: "waitlist", idempotencyKey: `pay:${promotedOrder.id}` });
    await this.createRegistrationNotification(saved.promotedRegistration!, "候补补位成功", `活动「${saved.activity.title}」已有空余名额，你已成功补位${saved.promotedRegistration?.status === RegistrationStatus.PendingPayment ? "，请在截止时间前完成付款" : ""}。`);
    if (saved.promotedRegistration) {
      const smsContext = { userId: saved.promotedRegistration.user.id, activityId: saved.activity.id, tenantId: saved.promotedRegistration.tenant?.id || saved.activity.tenant?.id || null };
      await this.automaticNotifications.publish({ ...smsContext, scene: "registrationSubmitted", businessId: saved.promotedRegistration.id });
      if (saved.promotedRegistration.status === RegistrationStatus.Approved) await this.automaticNotifications.publish({ ...smsContext, scene: "registrationApproved", businessId: saved.promotedRegistration.id });
    }
    await this.logOperation(admin, "waitlist.promote", "waitlist", saved.id, `候补补位：${waitlist.activity.title}`, { registrationId: saved.promotedRegistration?.id || null });
    return this.publicWaitlist(saved, Boolean(admin?.permissions?.includes("waitlist.sensitive")));
  }

  async retryRefund(refundId: number, dto: ReviewDto, admin: AdminContext) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Refund);
      const refund = await this.lockedRefund(repo, refundId);
      if (!refund) throw new NotFoundException("退款申请不存在");
      this.assertTenantAccess(refund, admin);
      if (refund.status !== "failed") throw new BadRequestException("只有失败的退款可以重试");
      refund.status = "pending";
      resetRefundProviderForRetry(refund);
      refund.reviewRemark = dto.remark || refund.reviewRemark;
      await repo.save(refund);
    });
    const result = await this.approveRefund(refundId, dto, admin);
    await this.logOperation(admin, "refund.retry", "refund", refundId, `重试退款：${refundId}`, { remark: dto.remark || null });
    return result;
  }

  private async promoteNextWaitlist(activityId: number, admin?: AdminContext) {
    const next = await this.waitlists.createQueryBuilder("waitlist").leftJoinAndSelect("waitlist.activity", "activity").leftJoinAndSelect("waitlist.user", "user").where("activity.id = :activityId", { activityId }).andWhere("waitlist.status = :status", { status: WaitlistStatus.Waiting }).orderBy("waitlist.createdAt", "ASC").addOrderBy("waitlist.id", "ASC").getOne();
    if (!next) return null;
    try { return await this.promoteWaitlist(next.id, admin); } catch (error: any) {
      if (error instanceof BadRequestException) {
        await this.logOperation(admin, "waitlist.auto_promote_skipped", "waitlist", next.id, `自动补位跳过：${next.activity.title}`, { activityId, reason: error?.message || "业务条件不满足" });
        return null;
      }
      throw error;
    }
  }

  private async ensureRegistrationCancellationRefund(order: Order, reason: string, admin?: AdminContext) {
    const existing = await this.refunds.find({ where: { order: { id: order.id }, status: In(["pending", "processing", "completed"]) } });
    const reserved = existing.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const remaining = Math.max(Number(order.amount || 0) - reserved, 0);
    if (remaining <= 0.001) return existing[0] || null;
    const refundNo = `RF-CANCEL-${order.id}`;
    const duplicate = await this.refunds.findOne({ where: { refundNo } });
    if (duplicate) return duplicate;
    const refund = await this.refunds.save(this.refunds.create({ order, tenant: order.tenant || order.registration.tenant || null, refundNo, amount: remaining.toFixed(2), status: "pending", operator: this.actorName(admin), reason }));
    await this.logOperation(admin, "registration.cancel_refund", "refund", refund.id, `报名取消生成退款申请：${refund.refundNo}`, { orderNo: order.orderNo, amount: refund.amount, reason });
    return refund;
  }

  private async createRegistrationNotification(registration: Registration, title: string, content: string) {
    return this.notifications.save(this.notifications.create({ channel: "site", title, content, status: "sent", provider: "site", providerMessageId: null, errorMessage: null, retryCount: 0, sentAt: new Date(), failedAt: null, user: registration.user, activity: registration.activity, remark: `registration:${registration.id}` }));
  }

  async cancelWaitlist(id: number, remark?: string, admin?: AdminContext) {
    const reason = String(remark || "").trim();
    if (!reason) throw new BadRequestException("请填写取消原因");
    const saved = await this.dataSource.transaction(async (manager) => {
      const waitlist = await manager.getRepository(Waitlist).createQueryBuilder("waitlist")
        .setLock("pessimistic_write")
        .leftJoinAndSelect("waitlist.activity", "activity")
        .leftJoinAndSelect("activity.tenant", "tenant")
        .leftJoinAndSelect("waitlist.user", "user")
        .leftJoinAndSelect("waitlist.promotedRegistration", "promotedRegistration")
        .where("waitlist.id = :id", { id })
        .getOne();
      if (!waitlist) throw new NotFoundException("候补记录不存");
      this.assertActivityAccess(waitlist.activity, admin);
      if (waitlist.status !== WaitlistStatus.Waiting) throw new BadRequestException("只有等待中的候补可以取消");
      waitlist.status = WaitlistStatus.Cancelled;
      waitlist.remark = reason;
      return manager.getRepository(Waitlist).save(waitlist);
    });
    await this.logOperation(admin, "waitlist.cancel", "waitlist", saved.id, `取消候补：${saved.activity.title}`, { remark: saved.remark });
    return this.publicWaitlist(saved, Boolean(admin?.permissions?.includes("waitlist.sensitive")));
  }

  private memberSegmentScope(admin?: AdminContext) {
    return this.isTenantScoped(admin) ? { tenantId: Number(admin?.tenantId), scopeKey: `tenant:${admin?.tenantId}` } : { tenantId: null, scopeKey: "platform" };
  }

  private tagIncludesSensitive(admin?: AdminContext) {
    return effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions }).includes("tag.sensitive");
  }

  private tagScopeKey(admin?: AdminContext, tenant?: Tenant | null) {
    if (tenant) return `tenant:${tenant.id}`;
    return this.memberSegmentScope(admin).scopeKey;
  }

  private strictMemberSegmentRules(value: unknown) {
    const result = validateMemberSegmentRulesInput(value);
    if (result.errors.length) throw new BadRequestException(result.errors.join("；"));
    return result.rules;
  }

  private async assertMemberSegmentLevelScope(rules: MemberSegmentRules, scopeKey: string, manager?: EntityManager) {
    if (!rules.levelIds?.length) return;
    const repository = manager ? manager.getRepository(MemberLevel) : this.memberLevels;
    const count = await repository.count({ where: { id: In(rules.levelIds), tenantScopeKey: scopeKey } });
    if (count !== rules.levelIds.length) throw new BadRequestException("会员等级不存在或不属于当前分群作用域");
  }

  private tagPagination(pageValue?: number, pageSizeValue?: number) {
    const page = pageValue ?? 1;
    const pageSize = pageSizeValue ?? 20;
    if (!Number.isInteger(page) || page < 1) throw new BadRequestException("页码不正确");
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new BadRequestException("每页数量必须为 1-100");
    return { page, pageSize };
  }

  private applyTagMemberDataScope(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, userAlias: string, admin?: AdminContext) {
    const scope = normalizeAdminDataScope(admin?.dataScope);
    if (scope.type !== "activity_ids") return;
    if (!scope.activityIds.length) {
      builder.andWhere("1 = 0");
      return;
    }
    builder.andWhere(`${userAlias}.id IN (SELECT scoped_tag_registration.userId FROM registrations scoped_tag_registration WHERE scoped_tag_registration.activityId IN (:...tagDataScopeActivityIds))`, { tagDataScopeActivityIds: scope.activityIds });
  }

  private async assertTagMemberAccess(userId: number, admin?: AdminContext) {
    await this.assertUserTenantAccess(userId, admin);
    const scope = normalizeAdminDataScope(admin?.dataScope);
    if (scope.type !== "activity_ids") return;
    if (!scope.activityIds.length) throw new NotFoundException("用户不存在或不在岗位活动范围内");
    const count = await this.registrations.createQueryBuilder("registration")
      .where("registration.userId = :userId", { userId })
      .andWhere("registration.activityId IN (:...tagAccessActivityIds)", { tagAccessActivityIds: scope.activityIds })
      .getCount();
    if (!count) throw new NotFoundException("用户不存在或不在岗位活动范围内");
  }

  private publicTagUser(user: User | null | undefined, includeSensitive: boolean) {
    if (!user) return null;
    return {
      id: user.id,
      nickname: user.nickname,
      phone: includeSensitive ? user.phone : maskPhone(user.phone),
      sourceChannel: user.sourceChannel,
      sensitiveMasked: !includeSensitive
    };
  }

  private publicUserTag(row: UserTag, includeSensitive: boolean) {
    return {
      id: row.id,
      tenantScopeKey: row.tenantScopeKey,
      name: row.name,
      color: row.color,
      remark: row.remark,
      createdAt: row.createdAt,
      user: this.publicTagUser(row.user, includeSensitive),
      tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null,
      sensitiveMasked: !includeSensitive
    };
  }

  private publicMemberSegmentProfile(row: MemberProfile, includeSensitive: boolean) {
    return {
      id: row.id,
      user: this.publicTagUser(row.user, includeSensitive),
      level: row.level ? { id: row.level.id, name: row.level.name } : null,
      points: row.points,
      growthValue: row.growthValue,
      totalSpent: row.totalSpent,
      registrationCount: row.registrationCount,
      checkInCount: row.checkInCount,
      reviewCount: row.reviewCount,
      lastActiveAt: row.lastActiveAt,
      sensitiveMasked: !includeSensitive
    };
  }

  private publicMemberSegment(row: MemberSegment) {
    return {
      id: row.id,
      tenantScopeKey: row.tenantScopeKey,
      name: row.name,
      description: row.description,
      rules: normalizeMemberSegmentRules(row.rules),
      enabled: row.enabled,
      lastMatchedCount: row.lastMatchedCount,
      lastCalculatedAt: row.lastCalculatedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null
    };
  }

  private publicMemberSegmentSnapshot(row: MemberSegmentSnapshot, includeSensitive: boolean) {
    return {
      id: row.id,
      snapshotNo: row.snapshotNo,
      businessKey: row.businessKey,
      tenantScopeKey: row.tenantScopeKey,
      name: row.name,
      rulesSnapshot: normalizeMemberSegmentRules(row.rulesSnapshot),
      memberCount: row.memberCount,
      createdBy: includeSensitive ? row.createdBy : null,
      createdAt: row.createdAt,
      segment: row.segment ? { id: row.segment.id, name: row.segment.name } : null,
      tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null,
      sensitiveMasked: !includeSensitive
    };
  }

  private assertMemberSegmentScope(row: { tenant?: Tenant | null; tenantScopeKey?: string | null } | null | undefined, admin?: AdminContext) {
    if (!row || !memberSegmentScopeMatches(admin?.tenantId, row.tenant?.id, row.tenantScopeKey)) throw new NotFoundException("会员分群不存在");
  }

  private buildMemberSegmentQuery(rules: MemberSegmentRules, admin?: AdminContext, manager?: EntityManager) {
    const scope = this.memberSegmentScope(admin);
    const repository = manager ? manager.getRepository(MemberProfile) : this.memberProfiles;
    const builder = repository.createQueryBuilder("profile")
      .leftJoin("profile.user", "user")
      .leftJoin("profile.level", "level")
      .select([
        "profile.id", "profile.points", "profile.growthValue", "profile.totalSpent", "profile.registrationCount", "profile.checkInCount", "profile.reviewCount", "profile.lastActiveAt",
        "user.id", "user.nickname", "user.phone", "user.sourceChannel",
        "level.id", "level.name"
      ])
      .where("profile.tenantScopeKey = :scopeKey", { scopeKey: scope.scopeKey });
    this.applyTagMemberDataScope(builder, "user", admin);
    if (rules.levelIds?.length) builder.andWhere("level.id IN (:...segmentLevelIds)", { segmentLevelIds: rules.levelIds });
    for (const [key, column] of [["minPoints", "profile.points"], ["maxPoints", "profile.points"], ["minGrowth", "profile.growthValue"], ["maxGrowth", "profile.growthValue"], ["minSpent", "profile.totalSpent"], ["maxSpent", "profile.totalSpent"], ["minRegistrations", "profile.registrationCount"], ["minCheckIns", "profile.checkInCount"]] as const) {
      const value = rules[key];
      if (value !== undefined) builder.andWhere(`${column} ${key.startsWith("min") ? ">=" : "<="} :segment_${key}`, { [`segment_${key}`]: value });
    }
    const now = Date.now();
    if (rules.activeWithinDays !== undefined) builder.andWhere("profile.lastActiveAt >= :segmentActiveAfter", { segmentActiveAfter: new Date(now - rules.activeWithinDays * 86400000) });
    if (rules.inactiveForDays !== undefined) builder.andWhere("(profile.lastActiveAt IS NULL OR profile.lastActiveAt <= :segmentInactiveBefore)", { segmentInactiveBefore: new Date(now - rules.inactiveForDays * 86400000) });
    if (rules.sourceChannels?.length) builder.andWhere("user.sourceChannel IN (:...segmentSources)", { segmentSources: rules.sourceChannels });
    const tenantClause = "tag.tenantScopeKey = :segmentTagScopeKey";
    builder.setParameter("segmentTagScopeKey", scope.scopeKey);
    if (rules.anyTags?.length) builder.andWhere(`EXISTS (SELECT 1 FROM user_tags tag WHERE tag.userId = user.id AND ${tenantClause} AND tag.name IN (:...segmentAnyTags))`, { segmentAnyTags: rules.anyTags });
    for (const [index, tag] of (rules.allTags || []).entries()) builder.andWhere(`EXISTS (SELECT 1 FROM user_tags tag_all_${index} WHERE tag_all_${index}.userId = user.id AND tag_all_${index}.tenantScopeKey = :segmentTagScopeKey AND tag_all_${index}.name = :segmentAllTag${index})`, { [`segmentAllTag${index}`]: tag });
    return builder.orderBy("profile.lastActiveAt", "DESC").addOrderBy("profile.id", "DESC");
  }

  async listMemberSegments(admin?: AdminContext) {
    const scope = this.memberSegmentScope(admin);
    const rows = await this.memberSegments.find({ where: { tenantScopeKey: scope.scopeKey }, order: { updatedAt: "DESC" }, take: 100 });
    return rows.map((row) => this.publicMemberSegment(row));
  }

  async saveMemberSegment(input: { name?: string; description?: string; rules?: unknown; enabled?: boolean }, id?: number, admin?: AdminContext) {
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : null;
    this.assertTenantSubscriptionWritable(tenant, admin);
    const scope = this.memberSegmentScope(admin);
    const name = String(input.name || "").trim();
    if (!name) throw new BadRequestException("请填写分群名称");
    if (name.length > 100) throw new BadRequestException("分群名称不能超过 100 个字符");
    const description = String(input.description || "").trim();
    if (description.length > 255) throw new BadRequestException("分群说明不能超过 255 个字符");
    const rules = this.strictMemberSegmentRules(input.rules);
    await this.assertMemberSegmentLevelScope(rules, scope.scopeKey);
    const queryRunner = this.dataSource.createQueryRunner();
    const lockKey = `member-segment:${createHash("sha256").update(`${scope.scopeKey}:${name}`).digest("hex").slice(0, 40)}`;
    await queryRunner.connect();
    let acquired = false;
    let saved: MemberSegment;
    try {
      const lockRows = await queryRunner.query("SELECT GET_LOCK(?, 10) AS acquired", [lockKey]);
      acquired = Number(lockRows?.[0]?.acquired || 0) === 1;
      if (!acquired) throw new BadRequestException("分群正在被其他操作更新，请稍后重试");
      await queryRunner.startTransaction();
      const repository = queryRunner.manager.getRepository(MemberSegment);
      const existing = await repository.createQueryBuilder("segment").setLock("pessimistic_write").where("segment.tenantScopeKey = :scopeKey", { scopeKey: scope.scopeKey }).andWhere("segment.name = :name", { name }).getOne();
      if (existing && existing.id !== id) throw new BadRequestException("分群名称已存在");
      const row = id ? await repository.createQueryBuilder("segment").setLock("pessimistic_write").leftJoinAndSelect("segment.tenant", "tenant").where("segment.id = :id", { id }).getOne() : repository.create({ tenant, tenantScopeKey: scope.scopeKey });
      if (!row) throw new NotFoundException("会员分群不存在");
      this.assertMemberSegmentScope(row, admin);
      Object.assign(row, { tenant, tenantScopeKey: scope.scopeKey, name, description: description || null, rules, enabled: input.enabled !== false });
      saved = await repository.save(row);
      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      if (isDuplicateEntryError(error)) throw new BadRequestException("分群名称已存在");
      throw error;
    } finally {
      if (acquired) await queryRunner.query("SELECT RELEASE_LOCK(?)", [lockKey]).catch(() => undefined);
      await queryRunner.release();
    }
    await this.logOperation(admin, id ? "member_segment.update" : "member_segment.create", "member_segment", saved.id, `${id ? "更新" : "创建"}会员分群：${saved.name}`, { rules });
    return this.publicMemberSegment(saved);
  }

  async previewMemberSegment(rulesInput: unknown, admin?: AdminContext, page = 1, pageSize = 20) {
    const rules = this.strictMemberSegmentRules(rulesInput);
    await this.assertMemberSegmentLevelScope(rules, this.memberSegmentScope(admin).scopeKey);
    const { page: safePage, pageSize: safeSize } = this.tagPagination(page, pageSize);
    const [items, total] = await this.buildMemberSegmentQuery(rules, admin).skip((safePage - 1) * safeSize).take(safeSize).getManyAndCount();
    const includeSensitive = this.tagIncludesSensitive(admin);
    return { rules, items: items.map((row) => this.publicMemberSegmentProfile(row, includeSensitive)), total, page: safePage, pageSize: safeSize, sensitiveMasked: !includeSensitive };
  }

  async createMemberSegmentSnapshot(segmentId: number, idempotencyKeyInput: string, admin?: AdminContext) {
    const idempotencyKey = String(idempotencyKeyInput || "").trim();
    if (idempotencyKey.length < 8 || idempotencyKey.length > 100) throw new BadRequestException("快照幂等键长度必须为 8-100 个字符");
    const scope = this.memberSegmentScope(admin);
    const queryRunner = this.dataSource.createQueryRunner();
    const lockKey = `segment-snapshot:${createHash("sha256").update(`${scope.scopeKey}:${segmentId}:${idempotencyKey}`).digest("hex").slice(0, 40)}`;
    await queryRunner.connect();
    let acquired = false;
    let snapshot: MemberSegmentSnapshot;
    let idempotent = false;
    try {
      const lockRows = await queryRunner.query("SELECT GET_LOCK(?, 15) AS acquired", [lockKey]);
      acquired = Number(lockRows?.[0]?.acquired || 0) === 1;
      if (!acquired) throw new BadRequestException("人群快照正在生成，请稍后重试");
      await queryRunner.startTransaction();
      const segmentRepo = queryRunner.manager.getRepository(MemberSegment);
      const snapshotRepo = queryRunner.manager.getRepository(MemberSegmentSnapshot);
      const existing = await snapshotRepo.findOne({ where: { tenantScopeKey: scope.scopeKey, segment: { id: segmentId }, businessKey: idempotencyKey } });
      if (existing) {
        snapshot = existing;
        idempotent = true;
        await queryRunner.commitTransaction();
      } else {
        const segment = await segmentRepo.createQueryBuilder("segment").setLock("pessimistic_write").leftJoinAndSelect("segment.tenant", "tenant").where("segment.id = :segmentId", { segmentId }).getOne();
        if (!segment) throw new NotFoundException("会员分群不存在");
        this.assertMemberSegmentScope(segment, admin);
        if (!segment.enabled) throw new BadRequestException("已停用分群不能创建快照");
        const rules = normalizeMemberSegmentRules(segment.rules);
        await this.assertMemberSegmentLevelScope(rules, scope.scopeKey, queryRunner.manager);
        const memberCount = await this.buildMemberSegmentQuery(rules, admin, queryRunner.manager).getCount();
        snapshot = await snapshotRepo.save(snapshotRepo.create({ snapshotNo: `MS${Date.now()}${randomBytes(3).toString("hex").toUpperCase()}`, tenant: segment.tenant, tenantScopeKey: scope.scopeKey, segment, businessKey: idempotencyKey, name: `${segment.name}-${new Date().toISOString().slice(0, 10)}`, rulesSnapshot: rules, memberCount, createdBy: this.actorName(admin) }));
        let lastProfileId = 0;
        while (true) {
          const pageRows = await this.buildMemberSegmentQuery(rules, admin, queryRunner.manager)
            .select("profile.id", "profileId")
            .addSelect("user.id", "userId")
            .andWhere("profile.id > :lastProfileId", { lastProfileId })
            .orderBy("profile.id", "ASC")
            .take(1000)
            .getRawMany<{ profileId: number | string; userId: number | string }>();
          if (!pageRows.length) break;
          const values = pageRows.map(() => "(?, ?, NOW(6))").join(",");
          const parameters = pageRows.flatMap((row) => [snapshot.id, Number(row.userId)]);
          await queryRunner.manager.query(`INSERT INTO member_segment_snapshot_members (snapshotId, userId, createdAt) VALUES ${values}`, parameters);
          lastProfileId = Number(pageRows[pageRows.length - 1].profileId);
        }
        segment.lastMatchedCount = memberCount;
        segment.lastCalculatedAt = new Date();
        await segmentRepo.save(segment);
        await queryRunner.commitTransaction();
      }
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      if (isDuplicateEntryError(error)) {
        const existing = await this.memberSegmentSnapshots.findOne({ where: { tenantScopeKey: scope.scopeKey, segment: { id: segmentId }, businessKey: idempotencyKey } });
        if (existing) { snapshot = existing; idempotent = true; }
        else throw error;
      } else throw error;
    } finally {
      if (acquired) await queryRunner.query("SELECT RELEASE_LOCK(?)", [lockKey]).catch(() => undefined);
      await queryRunner.release();
    }
    if (!idempotent) await this.logOperation(admin, "member_segment.snapshot", "member_segment_snapshot", snapshot.id, `创建人群快照：${snapshot.name}`, { memberCount: snapshot.memberCount, snapshotNo: snapshot.snapshotNo, businessKey: idempotencyKey });
    return { ...this.publicMemberSegmentSnapshot(snapshot, this.tagIncludesSensitive(admin)), idempotent };
  }

  async listMemberSegmentSnapshots(segmentId: number, admin?: AdminContext) {
    const segment = await this.memberSegments.findOne({ where: { id: segmentId } });
    if (!segment) throw new NotFoundException("会员分群不存在"); this.assertMemberSegmentScope(segment, admin);
    const rows = await this.memberSegmentSnapshots.find({ where: { tenantScopeKey: this.memberSegmentScope(admin).scopeKey, segment: { id: segmentId } }, order: { createdAt: "DESC" }, take: 100 });
    const includeSensitive = this.tagIncludesSensitive(admin);
    return rows.map((row) => this.publicMemberSegmentSnapshot(row, includeSensitive));
  }

  async memberSegmentSnapshotMembers(snapshotId: number, admin?: AdminContext, page = 1, pageSize = 20) {
    const snapshot = await this.memberSegmentSnapshots.findOne({ where: { id: snapshotId } });
    if (!snapshot) throw new NotFoundException("人群快照不存在"); this.assertMemberSegmentScope(snapshot, admin);
    const { page: safePage, pageSize: safeSize } = this.tagPagination(page, pageSize);
    const builder = this.memberSegmentSnapshotMemberRepo.createQueryBuilder("member")
      .leftJoin("member.user", "user")
      .select(["member.id", "member.createdAt", "user.id", "user.nickname", "user.phone", "user.sourceChannel"])
      .where("member.snapshotId = :snapshotId", { snapshotId })
      .orderBy("member.id", "ASC");
    this.applyTagMemberDataScope(builder, "user", admin);
    const [items, total] = await builder.skip((safePage - 1) * safeSize).take(safeSize).getManyAndCount();
    const includeSensitive = this.tagIncludesSensitive(admin);
    return {
      snapshot: this.publicMemberSegmentSnapshot(snapshot, includeSensitive),
      items: items.map((row) => ({ id: row.id, createdAt: row.createdAt, user: this.publicTagUser(row.user, includeSensitive), sensitiveMasked: !includeSensitive })),
      total,
      page: safePage,
      pageSize: safeSize,
      sensitiveMasked: !includeSensitive
    };
  }

  private behaviorTagDefinitions() {
    return [
      { code: "active_7d", name: "系统·近7日活跃", color: "success", description: "最近活跃时间在 7 日内", matches: (p: MemberProfile, now: number) => Boolean(p.lastActiveAt && p.lastActiveAt.getTime() >= now - 7 * 86400000) },
      { code: "high_value", name: "系统·高价值会员", color: "warning", description: "累计消费不少于 1000 元", matches: (p: MemberProfile) => Number(p.totalSpent || 0) >= 1000 },
      { code: "repeat_registration", name: "系统·复购活动用户", color: "success", description: "活动报名次数不少于 2 次", matches: (p: MemberProfile) => p.registrationCount >= 2 },
      { code: "inactive_30d", name: "系统·沉睡会员", color: "info", description: "超过 30 日未活跃", matches: (p: MemberProfile, now: number) => !p.lastActiveAt || p.lastActiveAt.getTime() <= now - 30 * 86400000 }
    ];
  }

  private behaviorTagOperatorScopeKey(admin?: AdminContext) {
    if (admin?.id) return `admin:${admin.id}`;
    return `system:${String(admin?.username || "worker").slice(0, 80)}`;
  }

  private publicBehaviorTagRun(row: MemberBehaviorTagRun, includeSensitive: boolean, idempotent = false) {
    return {
      id: row.id,
      tenantScopeKey: row.tenantScopeKey,
      idempotencyKey: row.idempotencyKey,
      batchKey: row.batchKey,
      status: row.status,
      profileCount: row.profileCount,
      createdCount: row.createdCount,
      deletedCount: row.deletedCount,
      retainedCount: row.retainedCount,
      definitionsSnapshot: row.definitionsSnapshot,
      errorMessage: row.errorMessage,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      operator: includeSensitive && row.operatorAdmin ? { id: row.operatorAdmin.id, username: row.operatorAdmin.username } : null,
      sensitiveMasked: !includeSensitive,
      idempotent
    };
  }

  async listBehaviorTagRuns(query: { page?: number; pageSize?: number } = {}, admin?: AdminContext) {
    const { page, pageSize } = this.tagPagination(query.page, query.pageSize);
    const scope = this.memberSegmentScope(admin);
    const [items, total] = await this.memberBehaviorTagRuns.findAndCount({ where: { tenantScopeKey: scope.scopeKey }, order: { createdAt: "DESC", id: "DESC" }, skip: (page - 1) * pageSize, take: pageSize });
    const includeSensitive = this.tagIncludesSensitive(admin);
    return { items: items.map((row) => this.publicBehaviorTagRun(row, includeSensitive)), total, page, pageSize, sensitiveMasked: !includeSensitive };
  }

  async refreshBehaviorTags(idempotencyKeyInput: string, admin?: AdminContext) {
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : null;
    this.assertTenantSubscriptionWritable(tenant, admin);
    const scope = this.memberSegmentScope(admin);
    const idempotencyKey = String(idempotencyKeyInput || "").trim();
    if (idempotencyKey.length < 8 || idempotencyKey.length > 100) throw new BadRequestException("行为标签刷新幂等键长度必须为 8-100 个字符");
    const operatorScopeKey = this.behaviorTagOperatorScopeKey(admin);
    const previous = await this.memberBehaviorTagRuns.findOne({ where: { tenantScopeKey: scope.scopeKey, operatorScopeKey, idempotencyKey } });
    if (previous?.status === "completed") return this.publicBehaviorTagRun(previous, this.tagIncludesSensitive(admin), true);
    const definitions = this.behaviorTagDefinitions();
    const definitionsSnapshot = definitions.map(({ matches: _matches, ...definition }) => definition);
    const queryRunner = this.dataSource.createQueryRunner();
    const lockKey = `behavior-tags:${createHash("sha256").update(scope.scopeKey).digest("hex").slice(0, 40)}`;
    await queryRunner.connect();
    let acquired = false;
    let savedRun: MemberBehaviorTagRun | null = null;
    let idempotent = false;
    try {
      const lockRows = await queryRunner.query("SELECT GET_LOCK(?, 30) AS acquired", [lockKey]);
      acquired = Number(lockRows?.[0]?.acquired || 0) === 1;
      if (!acquired) throw new BadRequestException("行为标签正在刷新，请稍后重试");
      await queryRunner.startTransaction();
      const runRepo = queryRunner.manager.getRepository(MemberBehaviorTagRun);
      const tagRepo = queryRunner.manager.getRepository(UserTag);
      const current = await runRepo.createQueryBuilder("run").setLock("pessimistic_write").leftJoinAndSelect("run.operatorAdmin", "operatorAdmin").where("run.tenantScopeKey = :scopeKey AND run.operatorScopeKey = :operatorScopeKey AND run.idempotencyKey = :idempotencyKey", { scopeKey: scope.scopeKey, operatorScopeKey, idempotencyKey }).getOne();
      if (current?.status === "completed") {
        savedRun = current;
        idempotent = true;
        await queryRunner.commitTransaction();
      } else {
        const now = Date.now();
        const run = current || runRepo.create({ tenant, tenantScopeKey: scope.scopeKey, operatorAdmin: admin?.id ? ({ id: admin.id } as AdminUser) : null, operatorScopeKey, idempotencyKey, batchKey: `BT${Date.now()}${randomBytes(3).toString("hex").toUpperCase()}`, definitionsSnapshot });
        Object.assign(run, { status: "running", profileCount: 0, createdCount: 0, deletedCount: 0, retainedCount: 0, definitionsSnapshot, errorMessage: null, startedAt: new Date(now), completedAt: null });
        await runRepo.save(run);

        const profileBuilder = queryRunner.manager.getRepository(MemberProfile).createQueryBuilder("profile").leftJoinAndSelect("profile.user", "user").where("profile.tenantScopeKey = :scopeKey", { scopeKey: scope.scopeKey });
        this.applyTagMemberDataScope(profileBuilder, "user", admin);
        const profiles = await profileBuilder.getMany();
        const existingBuilder = tagRepo.createQueryBuilder("tag").leftJoinAndSelect("tag.user", "user").where("tag.tenantScopeKey = :scopeKey", { scopeKey: scope.scopeKey }).andWhere("tag.remark = :remark", { remark: "behavior:auto" });
        this.applyTagMemberDataScope(existingBuilder, "user", admin);
        const existing = await existingBuilder.getMany();
        const wanted = new Map<string, { profile: MemberProfile; definition: typeof definitions[number] }>();
        for (const profile of profiles) for (const definition of definitions) if (definition.matches(profile, now)) wanted.set(`${profile.user.id}:${definition.name}`, { profile, definition });
        const deleteIds: number[] = [];
        let retainedCount = 0;
        for (const tag of existing) {
          const key = `${tag.user.id}:${tag.name}`;
          if (wanted.delete(key)) retainedCount += 1;
          else deleteIds.push(tag.id);
        }
        for (let offset = 0; offset < deleteIds.length; offset += 1000) await tagRepo.delete({ id: In(deleteIds.slice(offset, offset + 1000)) });
        const createRows = Array.from(wanted.values());
        for (let offset = 0; offset < createRows.length; offset += 1000) {
          const chunk = createRows.slice(offset, offset + 1000);
          const values = chunk.map(() => "(?, ?, ?, ?, ?, 'behavior:auto', NOW(6))").join(",");
          const parameters = chunk.flatMap(({ profile, definition }) => [profile.user.id, tenant?.id || null, scope.scopeKey, definition.name, definition.color]);
          await queryRunner.manager.query(`INSERT INTO user_tags (userId, tenantId, tenantScopeKey, name, color, remark, createdAt) VALUES ${values}`, parameters);
        }
        Object.assign(run, { status: "completed", profileCount: profiles.length, createdCount: createRows.length, deletedCount: deleteIds.length, retainedCount, completedAt: new Date(), errorMessage: null });
        savedRun = await runRepo.save(run);
        await queryRunner.commitTransaction();
      }
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      const message = error instanceof Error ? error.message : String(error);
      const failed = await this.memberBehaviorTagRuns.findOne({ where: { tenantScopeKey: scope.scopeKey, operatorScopeKey, idempotencyKey } }) || this.memberBehaviorTagRuns.create({ tenant, tenantScopeKey: scope.scopeKey, operatorAdmin: admin?.id ? ({ id: admin.id } as AdminUser) : null, operatorScopeKey, idempotencyKey, batchKey: `BT${Date.now()}${randomBytes(3).toString("hex").toUpperCase()}`, definitionsSnapshot, startedAt: new Date() });
      Object.assign(failed, { status: "failed", errorMessage: message.slice(0, 1000), completedAt: new Date() });
      await this.memberBehaviorTagRuns.save(failed).catch(() => undefined);
      throw error;
    } finally {
      if (acquired) await queryRunner.query("SELECT RELEASE_LOCK(?)", [lockKey]).catch(() => undefined);
      await queryRunner.release();
    }
    if (!savedRun) throw new Error("行为标签刷新结果未生成");
    if (!idempotent) await this.logOperation(admin, "user_tag.behavior_refresh", "member_behavior_tag_run", savedRun.id, "刷新会员行为标签", { batchKey: savedRun.batchKey, profileCount: savedRun.profileCount, createdCount: savedRun.createdCount, deletedCount: savedRun.deletedCount, retainedCount: savedRun.retainedCount });
    return this.publicBehaviorTagRun(savedRun, this.tagIncludesSensitive(admin), idempotent);
  }

  async userTagOptions(admin?: AdminContext) {
    const activityBuilder = this.activities.createQueryBuilder("activity")
      .leftJoin("activity.tenant", "tenant")
      .select(["activity.id", "activity.title", "activity.status", "activity.createdAt", "tenant.id", "tenant.code", "tenant.name"])
      .orderBy("activity.createdAt", "DESC");
    this.applyTenantScope(activityBuilder, "activity", admin);
    applyAdminActivityDataScope(activityBuilder, "activity", admin?.dataScope);
    const [activities, levels] = await Promise.all([
      activityBuilder.take(500).getMany(),
      this.memberLevelOptionRows(admin)
    ]);
    return {
      activities: activities.map((row) => ({ id: row.id, title: row.title, status: row.status, tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null })),
      levels: levels.map((row) => ({ id: row.id, name: row.name, minPoints: row.minPoints, minGrowth: row.minGrowth, tenantId: row.tenant?.id || null, tenantScopeKey: row.tenantScopeKey }))
    };
  }

  async listUserTagsPage(query: { userId?: number; activityId?: number; page?: number; pageSize?: number } = {}, admin?: AdminContext) {
    const { page, pageSize } = this.tagPagination(query.page, query.pageSize);
    if (query.userId) await this.assertTagMemberAccess(query.userId, admin);
    let activity: Activity | null = null;
    let activityUserIds: number[] = [];
    if (query.activityId) {
      activity = await this.activities.findOneBy({ id: query.activityId });
      if (!activity) throw new NotFoundException("活动不存在");
      this.assertActivityAccess(activity, admin);
      activityUserIds = await this.userIdsForActivity(activity.id, admin);
    }
    const builder = this.userTags.createQueryBuilder("tag")
      .leftJoin("tag.user", "user")
      .leftJoin("tag.tenant", "tenant")
      .select([
        "tag.id", "tag.tenantScopeKey", "tag.name", "tag.color", "tag.remark", "tag.createdAt",
        "user.id", "user.nickname", "user.phone", "user.sourceChannel",
        "tenant.id", "tenant.code", "tenant.name", "tenant.region", "tenant.enabled"
      ])
      .orderBy("tag.createdAt", "DESC")
      .addOrderBy("tag.id", "DESC");
    const tagScopeKey = this.tagScopeKey(admin, !this.isTenantScoped(admin) ? activity?.tenant || null : null);
    builder.andWhere("tag.tenantScopeKey = :tagScopeKey", { tagScopeKey });
    this.applyTagMemberDataScope(builder, "user", admin);
    if (query.userId) builder.andWhere("user.id = :userId", { userId: query.userId });
    if (query.activityId) {
      if (!activityUserIds.length) return { items: [], total: 0, page, pageSize, activity: activity ? { id: activity.id, title: activity.title, status: activity.status, tenant: activity.tenant ? this.publicLogTenantOption(activity.tenant) : null } : null, activityUserCount: 0, sensitiveMasked: !this.tagIncludesSensitive(admin) };
      builder.andWhere("user.id IN (:...activityUserIds)", { activityUserIds });
    }
    const [rows, total] = await builder.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const includeSensitive = this.tagIncludesSensitive(admin);
    return {
      items: rows.map((row) => this.publicUserTag(row, includeSensitive)),
      total,
      page,
      pageSize,
      activity: activity ? { id: activity.id, title: activity.title, status: activity.status, tenant: activity.tenant ? this.publicLogTenantOption(activity.tenant) : null } : null,
      activityUserCount: activityUserIds.length,
      sensitiveMasked: !includeSensitive
    };
  }

  async listUserTags(query: { userId?: number; activityId?: number } = {}, admin?: AdminContext) {
    const { userId, activityId } = query;
    if (userId) await this.assertTagMemberAccess(userId, admin);
    let activity: Activity | null = null;
    let activityUserIds: number[] = [];
    if (activityId) {
      activity = await this.activities.findOneBy({ id: activityId });
      if (!activity) throw new NotFoundException("活动不存");
      this.assertActivityAccess(activity, admin);
      activityUserIds = await this.userIdsForActivity(activityId, admin);
      if (!activityUserIds.length) return [];
    }
    const builder = this.userTags
      .createQueryBuilder("tag")
      .leftJoin("tag.user", "user")
      .leftJoin("tag.tenant", "tenant")
      .select(["tag.id", "tag.tenantScopeKey", "tag.name", "tag.color", "tag.remark", "tag.createdAt", "user.id", "user.nickname", "user.phone", "user.sourceChannel", "tenant.id", "tenant.code", "tenant.name", "tenant.region", "tenant.enabled"])
      .orderBy("tag.createdAt", "DESC");
    const tagScopeKey = this.tagScopeKey(admin, !this.isTenantScoped(admin) ? activity?.tenant || null : null);
    builder.andWhere("tag.tenantScopeKey = :tagScopeKey", { tagScopeKey });
    this.applyTagMemberDataScope(builder, "user", admin);
    if (userId) builder.andWhere("user.id = :userId", { userId });
    if (activityId) builder.andWhere("user.id IN (:...activityUserIds)", { activityUserIds });
    const tags = await builder.getMany();
    const includeSensitive = this.tagIncludesSensitive(admin);
    return tags.map((row) => this.publicUserTag(row, includeSensitive));
  }

  async createUserTag(input: UserTagDto, admin?: AdminContext) {
    if (this.isTenantScoped(admin)) this.assertTenantSubscriptionWritable(await this.currentTenantForAdmin(admin), admin);
    const user = await this.users.findOneBy({ id: input.userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertTagMemberAccess(user.id, admin);
    if (!input.name?.trim()) throw new BadRequestException("标签名称不能为空");
    const name = input.name.trim();
    const color = String(input.color || "default").trim();
    const remark = String(input.remark || "").trim();
    const scope = this.memberSegmentScope(admin);
    if (name.length > 40) throw new BadRequestException("标签名称不能超过 40 个字符");
    if (!["default", "success", "warning", "danger", "info", "primary"].includes(color)) throw new BadRequestException("标签颜色不正确");
    if (remark.length > 255) throw new BadRequestException("标签备注不能超过 255 个字符");
    const existsBuilder = this.userTags
      .createQueryBuilder("tag")
      .leftJoinAndSelect("tag.user", "user")
      .leftJoinAndSelect("tag.tenant", "tenant")
      .where("user.id = :userId", { userId: user.id })
      .andWhere("tag.name = :name", { name })
      .andWhere("tag.tenantScopeKey = :scopeKey", { scopeKey: scope.scopeKey });
    const exists = await existsBuilder.getOne();
    const includeSensitive = this.tagIncludesSensitive(admin);
    if (exists) return { ...this.publicUserTag(exists, includeSensitive), idempotent: true };
    try {
      const saved = await this.userTags.save(this.userTags.create({ user, tenant: this.tenantRelation(admin), tenantScopeKey: scope.scopeKey, name, color, remark: remark || null }));
      await this.logOperation(admin, "user_tag.create", "user_tag", saved.id, `添加用户标签：${name}`, { userId: user.id, color });
      return { ...this.publicUserTag(saved, includeSensitive), idempotent: false };
    } catch (error) {
      if (!isDuplicateEntryError(error)) throw error;
      const duplicate = await existsBuilder.getOne();
      if (!duplicate) throw error;
      return { ...this.publicUserTag(duplicate, includeSensitive), idempotent: true };
    }
  }

  async createActivityUserTags(input: BulkActivityTagDto, admin?: AdminContext) {
    const activity = await this.activities.findOneBy({ id: input.activityId });
    if (!activity) throw new NotFoundException("活动不存");
    this.assertActivityAccess(activity, admin);
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : activity.tenant;
    const scopeKey = this.tagScopeKey(admin, tenant);
    this.assertTenantSubscriptionWritable(tenant, admin);
    if (!input.name?.trim()) throw new BadRequestException("标签名称不能为空");
    const color = String(input.color || "default").trim();
    if (!["default", "success", "warning", "danger", "info", "primary"].includes(color)) throw new BadRequestException("标签颜色不正确");
    const userIds = await this.userIdsForActivity(activity.id, admin);
    let createdCount = 0;
    let skippedCount = 0;
    for (const userId of userIds) {
      const existing = await this.userTags
        .createQueryBuilder("tag")
        .leftJoin("tag.user", "user")
        .where("user.id = :userId", { userId })
        .andWhere("tag.name = :name", { name: input.name.trim() })
        .andWhere("tag.tenantScopeKey = :scopeKey", { scopeKey });
      if (await existing.getOne()) {
        skippedCount += 1;
        continue;
      }
      const user = await this.users.findOneBy({ id: userId });
      if (!user) continue;
      try {
        await this.userTags.save(this.userTags.create({ user, tenant: this.tenantRelation(admin, activity.tenant), tenantScopeKey: scopeKey, name: input.name.trim(), color, remark: input.remark || `来自活动：${activity.title}` }));
        createdCount += 1;
      } catch (error) {
        if (!isDuplicateEntryError(error)) throw error;
        skippedCount += 1;
      }
    }
    await this.logOperation(admin, "user_tag.bulk_activity", "activity", activity.id, `批量标记活动用户：${activity.title}`, { tag: input.name.trim(), createdCount, skippedCount });
    return { activityId: activity.id, activityTitle: activity.title, matchedCount: userIds.length, createdCount, skippedCount };
  }

  async deleteUserTag(id: number, admin?: AdminContext) {
    const tag = await this.userTags.findOne({ where: { id }, relations: ["tenant", "user"] });
    if (!tag) throw new NotFoundException("标签不存");
    this.assertStrictTenantOwnership(tag, admin, "标签不存在或不属于当前商家");
    if (tag.tenantScopeKey !== this.memberSegmentScope(admin).scopeKey) throw new NotFoundException("标签不存在或不属于当前作用域");
    await this.assertTagMemberAccess(tag.user.id, admin);
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : tag.tenant;
    this.assertTenantSubscriptionWritable(tenant, admin);
    await this.userTags.delete({ id });
    await this.logOperation(admin, "user_tag.delete", "user_tag", tag.id, `删除用户标签：${tag.name}`, { userId: tag.user.id });
    return this.publicUserTag(tag, this.tagIncludesSensitive(admin));
  }

  async listMemberLevels(includeDisabled = true, admin?: AdminContext, tenantId?: number, allScopes = false) {
    const targetTenantId = this.isTenantScoped(admin) ? Number(admin?.tenantId || 0) : Number(tenantId || 0);
    if (this.isTenantScoped(admin) && tenantId && Number(tenantId) !== targetTenantId) throw new NotFoundException("会员等级不存在或不属于当前商家");
    const where: any = !this.isTenantScoped(admin) && allScopes && !targetTenantId ? {} : { tenantScopeKey: targetTenantId ? memberLevelScopeKey({ id: targetTenantId }) : "platform" };
    if (!includeDisabled) where.enabled = true;
    return this.memberLevels.find({ where, order: { sortOrder: "ASC", minGrowth: "ASC", id: "ASC" } });
  }

  private memberLevelOptionRows(admin?: AdminContext) {
    const where = this.isTenantScoped(admin)
      ? { enabled: true, tenantScopeKey: memberLevelScopeKey({ id: Number(admin?.tenantId || 0) }) }
      : { enabled: true };
    return this.memberLevels.find({ where, order: { tenantScopeKey: "ASC", sortOrder: "ASC", minGrowth: "ASC", id: "ASC" }, take: 5000 });
  }

  private applyActivityOptionScope(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return;
    builder.andWhere(`(${alias}.tenantId IS NULL OR ${alias}.tenantId = :activityOptionTenantId)`, { activityOptionTenantId: admin?.tenantId });
  }

  async memberOptions(admin?: AdminContext) {
    this.assertMemberPermission(admin, "member.view");
    const permissions = effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions });
    const [levels, tenants] = await Promise.all([
      this.listMemberLevels(true, admin),
      !this.isTenantScoped(admin) && (permissions.includes("finance.wallet_adjust") || permissions.includes("member_level.manage") || permissions.includes("member_point_rule.view"))
        ? this.tenants.find({ order: { name: "ASC", id: "ASC" }, take: 1000 })
        : Promise.resolve([])
    ]);
    return {
      levels: levels.map((row) => this.publicMemberLevel(row)),
      tenants: tenants.map((row) => this.publicLogTenantOption(row)),
      sourceChannels: ["h5", "mp_weixin", "admin"],
      quickFilters: ["active7", "inactive30", "spent", "no_spent", "registered", "no_registered"],
      sortFields: ["lastActiveAt", "lastLoginAt", "points", "totalSpent", "registrationCount", "createdAt"]
    };
  }

  async saveMemberLevel(dto: MemberLevelDto, id?: number, admin?: AdminContext) {
    const row = id ? await this.memberLevels.findOneBy({ id }) : this.memberLevels.create();
    if (!row) throw new NotFoundException("会员等级不存");
    const existingTenantId = row.tenant?.id || null;
    const requestedTenantId = this.isTenantScoped(admin) ? Number(admin?.tenantId || 0) : Number(dto.tenantId || existingTenantId || 0);
    if (this.isTenantScoped(admin) && existingTenantId !== requestedTenantId) throw new NotFoundException("会员等级不存在或不属于当前商家");
    if (id && existingTenantId !== (requestedTenantId || null)) throw new BadRequestException("会员等级不能跨商家迁移");
    const targetTenant = requestedTenantId ? await this.tenants.findOneBy({ id: requestedTenantId }) : null;
    if (requestedTenantId && !targetTenant) throw new BadRequestException("商家不存在");
    if (targetTenant) this.assertTenantSubscriptionWritable(targetTenant, admin);
    if (!dto.name?.trim()) throw new BadRequestException("请填写等级名");
    if (dto.discountRate < 0 || dto.discountRate > 1) throw new BadRequestException("Member discount must be between 0 and 1");
    const scopeKey = memberLevelScopeKey(targetTenant);
    const duplicate = await this.memberLevels.findOne({ where: { tenantScopeKey: scopeKey, name: dto.name.trim() } });
    if (duplicate && duplicate.id !== row.id) throw new BadRequestException("当前范围已存在同名会员等级");
    Object.assign(row, {
      tenant: targetTenant,
      tenantScopeKey: scopeKey,
      ...(!id ? { templateLevel: null } : {}),
      version: id ? Number(row.version || 1) + 1 : 1,
      name: dto.name.trim(),
      minPoints: dto.minPoints,
      minGrowth: dto.minGrowth ?? dto.minPoints,
      validityDays: dto.validityDays || null,
      benefits: Array.isArray(dto.benefits) ? dto.benefits.slice(0, 30).map(item => ({ key: String(item.key || "").trim().slice(0, 40), name: String(item.name || "").trim().slice(0, 80), description: String(item.description || "").trim().slice(0, 255) || undefined })).filter(item => item.key && item.name) : null,
      discountRate: Number(dto.discountRate).toFixed(2),
      priorityBooking: dto.priorityBooking ?? false,
      enabled: dto.enabled ?? true,
      sortOrder: dto.sortOrder ?? 0
    });
    const saved = await this.memberLevels.save(row);
    await this.logOperation(admin, id ? "member_level.update" : "member_level.create", "member_level", saved.id, `${id ? "更新" : "创建"}会员等级：${saved.name}`, { tenantId: saved.tenant?.id || null, tenantScopeKey: saved.tenantScopeKey, version: saved.version, enabled: saved.enabled, minGrowth: saved.minGrowth, validityDays: saved.validityDays });
    return this.publicMemberLevel(saved);
  }

  async listMemberPointRules(admin?: AdminContext, tenantId?: number) {
    this.assertMemberPermission(admin, "member_point_rule.view");
    const targetTenantId = this.isTenantScoped(admin) ? Number(admin?.tenantId || 0) : Number(tenantId || 0);
    if (this.isTenantScoped(admin) && tenantId && Number(tenantId) !== targetTenantId) throw new NotFoundException("积分规则不存在或不属于当前商家");
    const tenantScopeKey = targetTenantId ? memberLevelScopeKey({ id: targetTenantId }) : "platform";
    const rows = await this.memberPointRules.find({ where: { tenantScopeKey }, order: { eventType: "ASC", id: "ASC" } });
    return rows.map((row) => this.publicMemberPointRule(row));
  }

  async updateMemberPointRule(id: number, dto: MemberPointRuleDto, admin?: AdminContext) {
    this.assertMemberPermission(admin, "member_point_rule.manage");
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MemberPointRule);
      const row = await repo.createQueryBuilder("rule").leftJoinAndSelect("rule.tenant", "tenant").where("rule.id = :id", { id }).setLock("pessimistic_write").getOne();
      if (!row) throw new NotFoundException("积分规则不存在");
      if (this.isTenantScoped(admin) && row.tenant?.id !== Number(admin?.tenantId || 0)) throw new NotFoundException("积分规则不存在或不属于当前商家");
      if (row.tenant) this.assertTenantSubscriptionWritable(row.tenant, admin);
      if (dto.enabled && dto.fixedPoints <= 0) throw new BadRequestException("启用积分规则时积分数量必须大于 0");
      if (dto.calculationMode === "amount_ratio" && dto.amountFenPerPoint <= 0) throw new BadRequestException("金额积分换算单位必须大于 0");
      if (dto.growthMode === "fixed" && dto.fixedGrowth <= 0) throw new BadRequestException("固定成长值必须大于 0");
      Object.assign(row, {
        enabled: dto.enabled,
        calculationMode: dto.calculationMode,
        fixedPoints: dto.fixedPoints,
        amountFenPerPoint: dto.amountFenPerPoint,
        growthMode: dto.growthMode,
        fixedGrowth: dto.growthMode === "fixed" ? dto.fixedGrowth : 0,
        validityDays: dto.validityDays || null,
        version: Number(row.version || 1) + 1
      });
      return repo.save(row);
    });
    await this.logOperation(admin, "member_point_rule.update", "member_point_rule", saved.id, `更新积分规则：${saved.name}`, { tenantId: saved.tenant?.id || null, tenantScopeKey: saved.tenantScopeKey, eventType: saved.eventType, version: saved.version, enabled: saved.enabled, calculationMode: saved.calculationMode, fixedPoints: saved.fixedPoints, amountFenPerPoint: saved.amountFenPerPoint, growthMode: saved.growthMode, fixedGrowth: saved.fixedGrowth, validityDays: saved.validityDays });
    return this.publicMemberPointRule(saved);
  }

  private publicMemberPointRule(row: MemberPointRule) {
    return { id: row.id, tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null, tenantScopeKey: row.tenantScopeKey, templateRuleId: row.templateRule?.id || null, eventType: row.eventType, name: row.name, enabled: row.enabled, calculationMode: row.calculationMode, fixedPoints: row.fixedPoints, amountFenPerPoint: row.amountFenPerPoint, growthMode: row.growthMode, fixedGrowth: row.fixedGrowth, validityDays: row.validityDays, version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  async listMembers(query: string | MemberListQuery = {}, admin?: AdminContext) {
    this.assertMemberPermission(admin, "member.view");
    const normalized: MemberListQuery = typeof query === "string" ? { keyword: query } : query;
    this.validateMemberQuery(normalized);
    const includeSensitive = this.hasMemberPermission(admin, "member.sensitive");
    const keyword = normalized.keyword;
    const activityId = normalized.activityId;
    const paged = Boolean(normalized.page || normalized.pageSize);
    const page = Math.max(Math.trunc(Number(normalized.page || 1)), 1);
    const pageSize = Math.min(Math.max(Math.trunc(Number(normalized.pageSize || 20)), 1), 100);
    let activity: Activity | null = null;
    let scopedUserIds: number[] | undefined;
    if (activityId) {
      activity = await this.activities.findOneBy({ id: activityId });
      if (!activity) throw new NotFoundException("活动不存");
      this.assertActivityAccess(activity, admin);
      scopedUserIds = await this.userIdsForActivity(activity.id, admin);
    } else if (!this.isTenantScoped(admin)) {
      await this.ensureProfilesForExistingUsers();
    }
    if (scopedUserIds !== undefined) {
      const users = scopedUserIds.length ? await this.users.find({ where: { id: In(scopedUserIds) } }) : [];
      const profileTenant = activity?.tenant || (this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : null);
      await this.ensureMemberProfileRows(users, profileTenant);
      if (!users.length) {
        return paged ? { items: [], total: 0, page, pageSize, summary: { totalMembers: 0, phoneBound: 0, wechatBound: 0, miniProgramSource: 0, active7Days: 0 }, sensitiveMasked: !includeSensitive } : [];
      }
    }
    const builder = this.memberProfiles
      .createQueryBuilder("profile")
      .leftJoinAndSelect("profile.user", "user")
      .leftJoinAndSelect("profile.level", "level");
    if (activity?.tenant?.id) builder.andWhere("profile.tenantScopeKey = :memberTenantScope", { memberTenantScope: `tenant:${activity.tenant.id}` });
    else if (this.isTenantScoped(admin)) builder.andWhere("profile.tenantScopeKey = :memberTenantScope", { memberTenantScope: `tenant:${admin?.tenantId}` });
    else builder.andWhere("profile.tenantScopeKey = 'platform'");
    if (scopedUserIds !== undefined) builder.andWhere("user.id IN (:...scopedUserIds)", { scopedUserIds });
    this.applyTagMemberDataScope(builder, "user", admin);
    const memberScopeTenantId = activity?.tenant?.id || (this.isTenantScoped(admin) ? Number(admin?.tenantId || 0) : null);
    this.applyMemberFilters(builder, normalized, memberScopeTenantId || null);
    this.applyMemberSort(builder, normalized);
    if (!paged) {
      const profiles = await builder.take(300).getMany();
      return profiles.map((profile) => ({ ...this.publicMemberProfile(profile, includeSensitive), ...(activity ? { activity: { id: activity.id, title: activity.title } } : {}) }));
    }
    const total = await builder.clone().getCount();
    const [phoneBound, wechatBound, miniProgramSource, active7Days] = await Promise.all([
      builder.clone().andWhere("user.phone IS NOT NULL AND user.phone <> ''").getCount(),
      builder.clone().andWhere("user.openid IS NOT NULL AND user.openid <> ''").getCount(),
      builder.clone().andWhere("user.sourceChannel = :summarySource", { summarySource: "mp_weixin" }).getCount(),
      builder.clone().andWhere("profile.lastActiveAt >= :active7Days", { active7Days: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }).getCount()
    ]);
    const rows = await builder.skip((page - 1) * pageSize).take(pageSize).getMany();
    const items = rows.map((profile) => ({ ...this.publicMemberProfile(profile, includeSensitive), ...(activity ? { activity: { id: activity.id, title: activity.title } } : {}) }));
    return {
      items,
      total,
      page,
      pageSize,
      summary: { totalMembers: total, phoneBound, wechatBound, miniProgramSource, active7Days },
      sensitiveMasked: !includeSensitive
    };
  }

  private validateMemberQuery(query: MemberListQuery) {
    const start = query.activeStart ? this.memberDateFilter(query.activeStart) : null;
    const end = query.activeEnd ? this.memberDateFilter(query.activeEnd, true) : null;
    if (query.activeStart && !start) throw new BadRequestException("活跃开始日期格式不正确");
    if (query.activeEnd && !end) throw new BadRequestException("活跃结束日期格式不正确");
    if (start && end && end < start) throw new BadRequestException("活跃结束日期不能早于开始日期");
    const levelId = String(query.levelId || "").trim();
    if (levelId && levelId !== "none" && (!Number.isInteger(Number(levelId)) || Number(levelId) <= 0)) throw new BadRequestException("会员等级筛选不正确");
  }

  async exportMembers(query: MemberQueryDto, admin?: AdminContext) {
    this.assertMemberPermission(admin, "member.export");
    const rows: any[] = [];
    for (let page = 1; rows.length < 10000; page += 1) {
      const result = await this.listMembers({ ...query, page, pageSize: 100 }, admin) as { items: any[]; total: number };
      rows.push(...result.items);
      if (!result.items.length || rows.length >= result.total) break;
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("会员数据");
    sheet.columns = [
      { header: "UserID", key: "userId", width: 12 },
      { header: "昵称", key: "nickname", width: 20 },
      { header: "手机号", key: "phone", width: 18 },
      { header: "微信绑定", key: "wechatBound", width: 12 },
      { header: "来源", key: "sourceChannel", width: 14 },
      { header: "会员等级", key: "level", width: 16 },
      { header: "积分", key: "points", width: 12 },
      { header: "成长值", key: "growthValue", width: 12 },
      { header: "累计消费", key: "totalSpent", width: 14 },
      { header: "报名数", key: "registrationCount", width: 10 },
      { header: "签到数", key: "checkInCount", width: 10 },
      { header: "评价数", key: "reviewCount", width: 10 },
      { header: "最近活跃", key: "lastActiveAt", width: 22 },
      { header: "最近登录", key: "lastLoginAt", width: 22 },
      { header: "创建时间", key: "createdAt", width: 22 }
    ];
    for (const row of rows.slice(0, 10000)) sheet.addRow({
      userId: row.user?.id,
      nickname: row.user?.nickname || "",
      phone: row.user?.phone || "",
      wechatBound: row.user?.wechatBound ? "是" : "否",
      sourceChannel: row.user?.sourceChannel || "",
      level: row.level?.name || "普通会员",
      points: row.points,
      growthValue: row.growthValue,
      totalSpent: row.totalSpent,
      registrationCount: row.registrationCount,
      checkInCount: row.checkInCount,
      reviewCount: row.reviewCount,
      lastActiveAt: row.lastActiveAt || "",
      lastLoginAt: row.user?.lastLoginAt || "",
      createdAt: row.user?.createdAt || ""
    });
    await this.logOperation(admin, "export.members", "member_profile", null, "导出会员数据", { count: Math.min(rows.length, 10000), filters: { ...query, page: undefined, pageSize: undefined }, sensitive: this.hasMemberPermission(admin, "member.sensitive") });
    return workbook.xlsx.writeBuffer();
  }

  private applyMemberFilters(builder: SelectQueryBuilder<MemberProfile>, query: MemberListQuery, tenantId: number | null) {
    const keyword = String(query.keyword || "").trim();
    if (keyword) {
      const keywordLike = `%${keyword}%`;
      const keywordId = Number(keyword);
      builder.andWhere(new Brackets((qb) => {
        qb.where("user.phone LIKE :keyword", { keyword: keywordLike })
          .orWhere("user.nickname LIKE :keyword", { keyword: keywordLike });
        if (Number.isInteger(keywordId) && keywordId > 0) qb.orWhere("user.id = :keywordId", { keywordId });
      }));
    }
    const sourceChannel = String(query.sourceChannel || "").trim();
    if (["h5", "mp_weixin", "admin"].includes(sourceChannel)) builder.andWhere("user.sourceChannel = :sourceChannel", { sourceChannel });
    const wechatBound = this.memberBooleanFilter(query.wechatBound);
    if (wechatBound === true) builder.andWhere("user.openid IS NOT NULL AND user.openid <> ''");
    if (wechatBound === false) builder.andWhere("(user.openid IS NULL OR user.openid = '')");
    const phoneBound = this.memberBooleanFilter(query.phoneBound);
    if (phoneBound === true) builder.andWhere("user.phone IS NOT NULL AND user.phone <> ''");
    if (phoneBound === false) builder.andWhere("(user.phone IS NULL OR user.phone = '')");
    const levelIdText = String(query.levelId || "").trim();
    if (levelIdText === "none") builder.andWhere("level.id IS NULL");
    else if (Number.isFinite(Number(levelIdText)) && Number(levelIdText) > 0) builder.andWhere("level.id = :levelId", { levelId: Number(levelIdText) });
    const activeStart = this.memberDateFilter(query.activeStart);
    const activeEnd = this.memberDateFilter(query.activeEnd, true);
    if (activeStart) builder.andWhere("profile.lastActiveAt >= :activeStart", { activeStart });
    if (activeEnd) builder.andWhere("profile.lastActiveAt <= :activeEnd", { activeEnd });
    const quickFilter = String(query.quickFilter || "").trim();
    if (quickFilter === "active7") builder.andWhere("profile.lastActiveAt >= :quickActive7", { quickActive7: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) });
    if (quickFilter === "inactive30") builder.andWhere("(profile.lastActiveAt IS NULL OR profile.lastActiveAt < :quickInactive30)", { quickInactive30: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) });
    if (quickFilter === "spent") builder.andWhere("CAST(profile.totalSpent AS DECIMAL(12,2)) > 0");
    if (quickFilter === "no_spent") builder.andWhere("CAST(profile.totalSpent AS DECIMAL(12,2)) <= 0");
    if (quickFilter === "registered") builder.andWhere("profile.registrationCount > 0");
    if (quickFilter === "no_registered") builder.andWhere("profile.registrationCount <= 0");
    const tag = String(query.tag || "").trim();
    if (tag) {
      builder.andWhere((qb) => {
        const subQuery = qb.subQuery()
          .select("tag.userId")
          .from(UserTag, "tag")
          .where("tag.name = :memberTag")
          .andWhere(tenantId ? "tag.tenantId = :memberTagTenantId" : "tag.tenantId IS NULL")
          .getQuery();
        return `user.id IN ${subQuery}`;
      }, { memberTag: tag, ...(tenantId ? { memberTagTenantId: tenantId } : {}) });
    }
  }

  private memberBooleanFilter(value: unknown) {
    if (value === true || value === "true" || value === "1" || value === "yes") return true;
    if (value === false || value === "false" || value === "0" || value === "no") return false;
    return undefined;
  }

  private memberDateFilter(value: unknown, endOfDay = false) {
    const text = String(value || "").trim();
    if (!text) return null;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(text)) date.setHours(23, 59, 59, 999);
    return date;
  }

  private applyMemberSort(builder: SelectQueryBuilder<MemberProfile>, query: MemberListQuery) {
    const sortMap: Record<string, string> = {
      lastActiveAt: "profile.lastActiveAt",
      lastActive: "profile.lastActiveAt",
      lastLoginAt: "user.lastLoginAt",
      lastLogin: "user.lastLoginAt",
      points: "profile.points",
      totalSpent: "profile.totalSpent",
      registrationCount: "profile.registrationCount",
      createdAt: "user.createdAt"
    };
    const sortBy = sortMap[String(query.sortBy || "lastActiveAt")] || sortMap.lastActiveAt;
    const sortOrder = String(query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
    builder.orderBy(sortBy, sortOrder).addOrderBy("profile.updatedAt", "DESC").addOrderBy("user.id", "DESC");
  }

  async createMember(dto: CreateMemberDto, admin?: AdminContext) {
    this.assertMemberPermission(admin, "member.manage");
    const dataScope = normalizeAdminDataScope(admin?.dataScope);
    if (dataScope.type === "activity_ids") throw new ForbiddenException("活动范围账号不能直接创建全局会员");
    const phone = String(dto.phone || "").trim();
    const password = String(dto.password || "");
    const nickname = String(dto.nickname || "").trim();
    if (!phone && !nickname) throw new BadRequestException("请至少填写手机号或昵称");
    if (phone && !/^1\d{10}$/.test(phone)) throw new BadRequestException("请填写正确的手机号");
    if (password && (password.length < 6 || password.length > 64)) throw new BadRequestException("初始密码长度需为 6-64 位");
    if (password && !this.hasMemberPermission(admin, "member.password")) throw new ForbiddenException("当前账号无设置会员密码权限");
    const lockKey = phone ? `member:create:${phone}` : `member:create:${admin?.tenantId || "platform"}:${nickname}`;
    return this.withMemberNamedLock(lockKey, async () => {
      let user = phone ? await this.users.findOne({ where: { phone } }) : null;
      if (!user) {
        user = this.users.create({
          phone: phone || null,
          nickname: nickname || (phone ? `本地用户${phone.slice(-4)}` : `测试会员${Date.now().toString().slice(-4)}`),
          sourceChannel: "admin"
        });
      } else if (nickname && user.nickname !== nickname) {
        user.nickname = nickname;
      }
      if (password) user.passwordHash = await bcrypt.hash(password, 10);
      const saved = await this.users.save(user);
      const profile = await this.ensureMemberProfile(saved, this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : null);
      await this.logOperation(admin, "member.create", "user", saved.id, `新增会员：${saved.nickname || saved.phone || saved.id}`, { phone: maskPhone(saved.phone), nickname: saved.nickname, sourceChannel: saved.sourceChannel, passwordSet: Boolean(password), remark: dto.remark });
      return this.publicMemberProfile(profile, this.hasMemberPermission(admin, "member.sensitive"));
    });
  }

  async updateMember(userId: number, dto: UpdateMemberDto, admin?: AdminContext) {
    this.assertMemberPermission(admin, "member.manage");
    await this.assertTagMemberAccess(userId, admin);
    return this.withMemberNamedLock(`member:update:${userId}`, async () => {
      const user = await this.users.findOneBy({ id: userId });
      if (!user) throw new NotFoundException("用户不存");
      const canEditPhone = this.hasMemberPermission(admin, "member.sensitive");
      if (dto.phone !== undefined && !canEditPhone) throw new ForbiddenException("修改会员手机号需要敏感资料权限");
      const phone = dto.phone === undefined ? user.phone : String(dto.phone || "").trim();
      const nickname = dto.nickname === undefined ? user.nickname : String(dto.nickname || "").trim();
      const avatarUrl = dto.avatarUrl === undefined ? user.avatarUrl : String(dto.avatarUrl || "").trim();
      if (phone && !/^1\d{10}$/.test(phone)) throw new BadRequestException("请填写正确的手机号");
      if (avatarUrl && !avatarUrl.startsWith("/uploads/") && !/^https?:\/\//i.test(avatarUrl)) throw new BadRequestException("头像地址必须使用 HTTP(S) 或站内上传路径");
      if (phone && phone !== user.phone) {
        const exists = await this.users.findOne({ where: { phone } });
        if (exists && exists.id !== user.id) throw new BadRequestException("手机号已被其他会员使用");
      }
      const before = { phone: maskPhone(user.phone), nickname: user.nickname, avatarUrl: user.avatarUrl };
      user.phone = phone || null;
      user.nickname = nickname || null;
      user.avatarUrl = avatarUrl || null;
      const saved = await this.users.save(user);
      const profile = await this.ensureMemberProfile(saved, this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : null);
      await this.logOperation(admin, "member.update", "user", saved.id, `编辑会员：${saved.nickname || saved.phone || saved.id}`, { before, after: { phone: maskPhone(saved.phone), nickname: saved.nickname, avatarUrl: saved.avatarUrl } });
      return this.publicMemberProfile(profile, this.hasMemberPermission(admin, "member.sensitive"));
    });
  }

  async resetMemberPassword(userId: number, dto: ResetMemberPasswordDto, admin?: AdminContext) {
    this.assertMemberPermission(admin, "member.password");
    const password = String(dto.password || "");
    if (password.length < 6 || password.length > 64) throw new BadRequestException("会员密码长度需为 6-64 位");
    await this.assertTagMemberAccess(userId, admin);
    if (this.isTenantScoped(admin)) {
      const sharedTenantCount = await this.memberProfiles.createQueryBuilder("profile").where("profile.userId = :userId", { userId }).andWhere("profile.tenantId IS NOT NULL").andWhere("profile.tenantId <> :tenantId", { tenantId: admin?.tenantId }).getCount();
      if (sharedTenantCount) throw new ForbiddenException("该会员同时属于其他商家，只能由平台管理员重置全局登录密码");
    }
    return this.withMemberNamedLock(`member:password:${userId}`, async () => {
      const user = await this.users.findOneBy({ id: userId });
      if (!user) throw new NotFoundException("用户不存");
      user.passwordHash = await bcrypt.hash(password, 10);
      const saved = await this.users.save(user);
      await this.logOperation(admin, "member.password.reset", "user", saved.id, `重置会员密码：${saved.nickname || maskPhone(saved.phone) || saved.id}`);
      return { id: saved.id, passwordSet: true };
    });
  }

  async adjustMemberPoints(userId: number, dto: MemberPointAdjustDto, admin?: AdminContext) {
    this.assertMemberPermission(admin, "member.points.manage");
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertTagMemberAccess(userId, admin);
    const points = Math.trunc(Number(dto.points || 0));
    if (!points) throw new BadRequestException("调整积分不能为 0");
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : null;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) throw new BadRequestException("积分到期时间必须晚于当前时间");
    const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform";
    const sourceId = `adj:${createHash("sha256").update(`${tenantScopeKey}:${userId}:${dto.idempotencyKey}`).digest("hex")}`;
    return this.withMemberNamedLock(`member:points:${tenantScopeKey}:${userId}`, async () => {
      const existing = await this.memberPointLogs.findOne({ where: { sourceType: "admin_point_adjust", sourceId } });
      if (existing) {
        const profile = await this.ensureMemberProfile(user, tenant);
        return { log: this.publicMemberPointLog(existing), profile: this.publicMemberProfile(profile, this.hasMemberPermission(admin, "member.sensitive")), idempotent: true };
      }
      const log = await this.awardPoints(user, points, "admin_point_adjust", sourceId, dto.remark.trim(), tenant, expiresAt);
      const profile = await this.ensureMemberProfile(user, tenant);
      await this.logOperation(admin, "member.points.adjust", "user", userId, `调整会员积分：${points}`, { remark: dto.remark.trim(), expiresAt, idempotencyKey: dto.idempotencyKey });
      return { log: this.publicMemberPointLog(log), profile: this.publicMemberProfile(profile, this.hasMemberPermission(admin, "member.sensitive")), idempotent: false };
    });
  }

  async adjustMemberLevel(userId: number, dto: MemberLevelAdjustDto, admin?: AdminContext) {
    this.assertMemberPermission(admin, "member.lifecycle.manage");
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertTagMemberAccess(userId, admin);
    const tenant = this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : null;
    if (tenant) this.assertTenantSubscriptionWritable(tenant, admin);
    const tenantScopeKey = memberLevelScopeKey(tenant);
    const requestedLevelId = Number(dto.levelId || 0);
    const reason = dto.reason.trim();
    const targetLevel = requestedLevelId
      ? await this.memberLevels.findOne({ where: { id: requestedLevelId, tenantScopeKey, enabled: true } })
      : null;
    if (requestedLevelId && !targetLevel) throw new BadRequestException("会员等级不存在、已停用或不属于当前范围");
    const existingProfile = await this.ensureMemberProfile(user, tenant);
    const previousLevelId = existingProfile.level?.id || null;
    if (previousLevelId === (targetLevel?.id || null)) throw new BadRequestException("会员当前已是该等级");

    const saved = await this.dataSource.transaction(async (manager) => {
      const profileRepo = manager.getRepository(MemberProfile);
      const locked = await profileRepo.createQueryBuilder("profile")
        .leftJoinAndSelect("profile.user", "user")
        .leftJoinAndSelect("profile.tenant", "tenant")
        .leftJoinAndSelect("profile.level", "level")
        .where("profile.id = :profileId", { profileId: existingProfile.id })
        .setLock("pessimistic_write")
        .getOne();
      if (!locked || locked.tenantScopeKey !== tenantScopeKey) throw new NotFoundException("会员档案不存在或不属于当前范围");
      if ((locked.level?.id || null) !== previousLevelId) throw new BadRequestException("会员等级已变化，请刷新后重试");
      await manager.query("SET @member_level_source = ?, @member_level_reason = ?, @member_level_operator_admin_id = ?", ["admin_adjustment", reason, admin?.id || null]);
      try {
        const startedAt = targetLevel ? new Date() : null;
        locked.level = targetLevel;
        locked.levelStartedAt = startedAt;
        locked.levelExpiresAt = targetLevel ? levelExpiry(targetLevel, startedAt!) : null;
        locked.levelSource = "admin_adjustment";
        locked.levelSnapshot = memberLevelSnapshot(targetLevel);
        return await profileRepo.save(locked);
      } finally {
        await manager.query("SET @member_level_source = NULL, @member_level_reason = NULL, @member_level_operator_admin_id = NULL");
      }
    });
    await this.logOperation(admin, "member.level.adjust", "member_profile", saved.id, `人工调整会员等级：${targetLevel?.name || "普通会员"}`, { userId, tenantScopeKey, fromLevelId: previousLevelId, toLevelId: targetLevel?.id || null, reason });
    const history = await this.memberLevelChanges.findOne({ where: { memberProfile: { id: saved.id } }, order: { createdAt: "DESC", id: "DESC" } });
    return { profile: this.publicMemberProfile(saved, this.hasMemberPermission(admin, "member.sensitive")), history: this.publicMemberLevelChange(history) };
  }

  private memberLevelHistory(profile: MemberProfile) {
    return this.memberLevelChanges.find({ where: { memberProfile: { id: profile.id }, tenantScopeKey: profile.tenantScopeKey }, order: { createdAt: "DESC", id: "DESC" }, take: 100 });
  }

  async memberDetail(userId: number, admin?: AdminContext) {
    this.assertMemberPermission(admin, "member.view");
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertTagMemberAccess(userId, admin);
    const includeSensitive = this.hasMemberPermission(admin, "member.sensitive");
    const profile = await this.ensureMemberProfile(user, this.isTenantScoped(admin) ? await this.currentTenantForAdmin(admin) : null);
    if (this.isTenantScoped(admin)) {
      const [registrations, orders, checkIns, reviews, tags, refunds, walletTransactions, levelChanges] = await Promise.all([
        this.visibleRegistrationsForUser(userId, admin),
        this.visibleOrdersForUser(userId, admin),
        this.visibleCheckInsForUser(userId, admin),
        this.visibleReviewsForUser(userId, admin),
        this.listUserTags({ userId }, admin),
        this.visibleRefundsForUser(userId, admin),
        this.visibleWalletTransactionsForUser(userId, admin),
        this.memberLevelHistory(profile)
      ]);
      const points = await this.visiblePointLogsForUser(userId, profile.tenantScopeKey);
      const result = this.publicMemberDetail({ profile, registrations, orders, points, tags, levelChanges, assets: await this.memberCrossBusinessAssets(userId, admin), timeline: this.memberTimeline({ user, registrations, orders, checkIns, reviews, points, refunds, walletTransactions }) }, includeSensitive);
      if (includeSensitive) await this.logOperation(admin, "member.sensitive.view", "user", userId, `查看会员敏感资料：${user.nickname || maskPhone(user.phone) || user.id}`);
      return result;
    }
    const [registrations, orders, checkIns, reviews, points, tags, refunds, walletTransactions, levelChanges] = await Promise.all([
      this.registrations.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 50 }),
      this.orders.find({ where: { registration: { user: { id: userId } } }, order: { createdAt: "DESC" }, take: 50 }),
      this.checkIns.find({ where: { registration: { user: { id: userId } } }, order: { createdAt: "DESC" }, take: 50 }),
      this.activityReviews.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 50 }),
      this.memberPointLogs.find({ where: { user: { id: userId } }, relations: ["relatedLog"], order: { createdAt: "DESC" }, take: 100 }),
      this.listUserTags({ userId }, admin),
      this.refunds.find({ where: { order: { registration: { user: { id: userId } } } }, order: { createdAt: "DESC" }, take: 50 }),
      this.visibleWalletTransactionsForUser(userId, admin),
      this.memberLevelHistory(profile)
    ]);
    const result = this.publicMemberDetail({ profile, registrations, orders, points, tags, levelChanges, assets: await this.memberCrossBusinessAssets(userId, admin), timeline: this.memberTimeline({ user, registrations, orders, checkIns, reviews, points, refunds, walletTransactions }) }, includeSensitive);
    if (includeSensitive) await this.logOperation(admin, "member.sensitive.view", "user", userId, `查看会员敏感资料：${user.nickname || maskPhone(user.phone) || user.id}`);
    return result;
  }

  private publicMemberLevel(row: MemberLevel | null | undefined) {
    if (!row) return null;
    return { id: row.id, tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null, tenantScopeKey: row.tenantScopeKey, templateLevelId: row.templateLevelId || null, version: row.version, name: row.name, minPoints: row.minPoints, minGrowth: row.minGrowth, validityDays: row.validityDays, benefits: row.benefits, discountRate: row.discountRate, priorityBooking: row.priorityBooking, enabled: row.enabled, sortOrder: row.sortOrder };
  }

  private publicMemberUser(user: User, includeSensitive: boolean) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      phone: includeSensitive ? user.phone : maskPhone(user.phone),
      phoneBound: Boolean(user.phone),
      wechatBound: Boolean(user.openid),
      openid: includeSensitive ? user.openid : null,
      unionid: includeSensitive ? user.unionid : null,
      wechatAppId: includeSensitive ? user.wechatAppId : null,
      sourceChannel: user.sourceChannel,
      lastLoginChannel: user.lastLoginChannel,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      sensitiveMasked: !includeSensitive
    };
  }

  private publicMemberProfile(profile: MemberProfile, includeSensitive: boolean) {
    return {
      id: profile.id,
      user: this.publicMemberUser(profile.user, includeSensitive),
      tenant: profile.tenant ? this.publicLogTenantOption(profile.tenant) : null,
      tenantScopeKey: profile.tenantScopeKey,
      level: this.publicMemberLevel(profile.level),
      levelSnapshot: profile.levelSnapshot,
      points: profile.points,
      pointDebt: profile.pointDebt,
      growthValue: profile.growthValue,
      growthCycleStartedAt: profile.growthCycleStartedAt,
      levelStartedAt: profile.levelStartedAt,
      levelExpiresAt: profile.levelExpiresAt,
      levelSource: profile.levelSource,
      totalSpent: profile.totalSpent,
      registrationCount: profile.registrationCount,
      checkInCount: profile.checkInCount,
      reviewCount: profile.reviewCount,
      lastActiveAt: profile.lastActiveAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      sensitiveMasked: !includeSensitive
    };
  }

  private publicMemberPointLog(row: MemberPointLog) {
    return { id: row.id, points: row.points, requestedPoints: row.requestedPoints, balanceBefore: row.balanceBefore, balanceAfter: row.balanceAfter, growthValue: row.growthValue, type: row.type, sourceType: row.sourceType, sourceId: row.sourceId, relatedLogId: row.relatedLog?.id || null, batchKey: row.batchKey, ruleSnapshot: row.ruleSnapshot, metadata: row.metadata, remark: row.remark, expiresAt: row.expiresAt, expiryProcessedAt: row.expiryProcessedAt, reversedAt: row.reversedAt, createdAt: row.createdAt };
  }

  private publicMemberLevelChange(row: MemberLevelChange | null | undefined) {
    if (!row) return null;
    return {
      id: row.id,
      tenantScopeKey: row.tenantScopeKey,
      fromLevel: this.publicMemberLevel(row.fromLevel),
      toLevel: this.publicMemberLevel(row.toLevel),
      source: row.source,
      reason: row.reason,
      operator: row.operatorAdmin ? { id: row.operatorAdmin.id, username: row.operatorAdmin.username } : null,
      growthValue: row.growthValue,
      levelStartedAt: row.levelStartedAt,
      levelExpiresAt: row.levelExpiresAt,
      benefitSnapshot: row.benefitSnapshot,
      createdAt: row.createdAt
    };
  }

  private memberText(value: unknown, includeSensitive: boolean) {
    const text = String(value || "");
    return includeSensitive ? text : text.replace(/(?<!\d)1\d{10}(?!\d)/g, (phone) => maskPhone(phone));
  }

  private publicMemberDetail(payload: { profile: MemberProfile; registrations: Registration[]; orders: Order[]; points: MemberPointLog[]; tags: any[]; levelChanges: MemberLevelChange[]; assets: any; timeline: any[] }, includeSensitive: boolean) {
    return {
      profile: this.publicMemberProfile(payload.profile, includeSensitive),
      registrations: payload.registrations.map((row) => ({ id: row.id, activity: row.activity ? { id: row.activity.id, title: row.activity.title } : null, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt })),
      orders: payload.orders.map((row) => ({ id: row.id, orderNo: row.orderNo, amount: row.amount, status: row.status, paymentMethod: row.paymentMethod, paidAt: row.paidAt, createdAt: row.createdAt, updatedAt: row.updatedAt })),
      points: payload.points.map((row) => this.publicMemberPointLog(row)),
      levelChanges: payload.levelChanges.map((row) => this.publicMemberLevelChange(row)),
      tags: payload.tags.map((row) => ({ id: row.id, name: row.name, color: row.color, remark: row.remark, createdAt: row.createdAt })),
      assets: {
        course: {
          orderCount: Number(payload.assets?.course?.orderCount || 0),
          learningRecordCount: Number(payload.assets?.course?.learningRecordCount || 0),
          completedLessonCount: Number(payload.assets?.course?.completedLessonCount || 0),
          orders: (payload.assets?.course?.orders || []).map((row: CourseOrder) => ({ id: row.id, orderNo: row.orderNo, course: row.course ? { id: row.course.id, title: row.course.title } : null, amount: row.amount, status: row.status, createdAt: row.createdAt }))
        },
        mall: {
          orderCount: Number(payload.assets?.mall?.orderCount || 0),
          refundCount: Number(payload.assets?.mall?.refundCount || 0),
          paidAmount: payload.assets?.mall?.paidAmount || "0.00",
          orders: (payload.assets?.mall?.orders || []).map((row: MallOrder) => ({ id: row.id, orderNo: row.orderNo, merchant: row.merchant ? { id: row.merchant.id, name: row.merchant.name } : null, amount: row.amount, status: row.status, createdAt: row.createdAt }))
        },
        community: {
          postCount: Number(payload.assets?.community?.postCount || 0),
          approvedPostCount: Number(payload.assets?.community?.approvedPostCount || 0),
          posts: (payload.assets?.community?.posts || []).map((row: CommunityPost) => ({ id: row.id, content: this.memberText(row.content, includeSensitive), status: row.status, visible: row.visible, likes: row.likes, createdAt: row.createdAt }))
        },
        wallets: (payload.assets?.wallets || []).map((row: UserWallet) => ({ id: row.id, tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null, tenantScopeKey: row.tenantScopeKey }))
      },
      timeline: payload.timeline.map((row) => ({ type: row.type, title: this.memberText(row.title, includeSensitive), description: this.memberText(row.description, includeSensitive), amount: row.amount, time: row.time, status: row.status })),
      sensitiveMasked: !includeSensitive
    };
  }

  async runMemberLifecycle(now = new Date(), admin?: AdminContext) {
    if (admin) this.assertMemberPermission(admin, "member.lifecycle.manage");
    const scopeKey = this.isTenantScoped(admin) ? `tenant:${admin?.tenantId}` : "platform";
    return this.withMemberNamedLock(`member:lifecycle:${scopeKey}`, () => this.runMemberLifecycleUnlocked(now, admin));
  }

  private async runMemberLifecycleUnlocked(now = new Date(), admin?: AdminContext) {
    const batchKey = `member-lifecycle:${now.toISOString()}`;
    const expiredPointsBuilder = this.memberPointLogs.createQueryBuilder("log").leftJoinAndSelect("log.user", "user").leftJoinAndSelect("log.tenant", "tenant").where("log.expiresAt IS NOT NULL AND log.expiresAt <= :now", { now }).andWhere("log.expiryProcessedAt IS NULL").andWhere("log.reversedAt IS NULL").orderBy("log.expiresAt", "ASC").take(500);
    const expiredLevelsBuilder = this.memberProfiles.createQueryBuilder("profile").leftJoinAndSelect("profile.user", "user").leftJoinAndSelect("profile.tenant", "tenant").leftJoinAndSelect("profile.level", "level").where("profile.levelExpiresAt IS NOT NULL AND profile.levelExpiresAt <= :now", { now }).orderBy("profile.levelExpiresAt", "ASC").take(200);
    if (this.isTenantScoped(admin)) { expiredPointsBuilder.andWhere("log.tenantId = :tenantId", { tenantId: admin?.tenantId }); expiredLevelsBuilder.andWhere("profile.tenantId = :tenantId", { tenantId: admin?.tenantId }); }
    const [expiredPoints, expiredProfiles] = await Promise.all([expiredPointsBuilder.getMany(), expiredLevelsBuilder.getMany()]);
    const refreshKeys = new Map<string, { user: User; tenant: Tenant | null }>();
    for (const log of expiredPoints) {
      log.expiryProcessedAt = now;
      log.batchKey = batchKey;
      await this.memberPointLogs.save(log);
      refreshKeys.set(`${log.user.id}:${log.tenantScopeKey}`, { user: log.user, tenant: log.tenant || null });
    }
    for (const profile of expiredProfiles) {
      Object.assign(profile, expiredLevelCycle(now));
      await this.memberProfiles.save(profile);
      refreshKeys.set(`${profile.user.id}:${profile.tenantScopeKey}`, { user: profile.user, tenant: profile.tenant || null });
    }
    let reconciliationCount = 0;
    for (const item of refreshKeys.values()) {
      if (expiredPoints.some((log) => log.user.id === item.user.id && log.tenantScopeKey === memberLevelScopeKey(item.tenant))) {
        const reconciled = await this.memberPoints.reconcileExpiredAccount({ user: item.user, tenant: item.tenant, batchKey: `${batchKey}:${item.tenant?.id || "platform"}:${item.user.id}`, now });
        if (reconciled.reconciliationLog) reconciliationCount += 1;
      }
      await this.refreshMemberProfile(item.user, undefined, item.tenant);
    }
    if (admin) await this.logOperation(admin, "member.lifecycle.scan", "member_profile", null, `会员生命周期扫描：积分到期 ${expiredPoints.length} 条，等级到期 ${expiredProfiles.length} 人`, { now, batchKey, expiredPointCount: expiredPoints.length, expiredLevelCount: expiredProfiles.length, reconciliationCount });
    return { batchKey, expiredPointCount: expiredPoints.length, expiredLevelCount: expiredProfiles.length, refreshedProfileCount: refreshKeys.size, reconciliationCount, pointBatchHasMore: expiredPoints.length >= 500, levelBatchHasMore: expiredProfiles.length >= 200, scannedAt: now };
  }

  private async memberCrossBusinessAssets(userId: number, admin?: AdminContext) {
    const tenantId = this.isTenantScoped(admin) ? Number(admin?.tenantId || 0) : 0;
    const courseOrders = this.dataSource.getRepository(CourseOrder).createQueryBuilder("order").leftJoinAndSelect("order.course", "course").where("order.userId = :userId", { userId }).orderBy("order.createdAt", "DESC").take(50);
    const learning = this.dataSource.getRepository(UserLearning).createQueryBuilder("learning").leftJoin(Course, "course", "course.id = learning.courseId").where("learning.userId = :userId", { userId }).orderBy("learning.updatedAt", "DESC").take(100);
    const mallOrders = this.dataSource.getRepository(MallOrder).createQueryBuilder("order").leftJoinAndSelect("order.merchant", "merchant").where("order.userId = :userId", { userId }).orderBy("order.createdAt", "DESC").take(50);
    const mallRefunds = this.dataSource.getRepository(MallRefund).createQueryBuilder("refund").leftJoinAndSelect("refund.order", "order").where("refund.userId = :userId", { userId }).orderBy("refund.createdAt", "DESC").take(50);
    const communityPosts = this.dataSource.getRepository(CommunityPost).createQueryBuilder("post").where("post.userId = :userId", { userId }).orderBy("post.createdAt", "DESC").take(50);
    const wallets = this.userWallets.createQueryBuilder("wallet").where("wallet.userId = :userId", { userId }).orderBy("wallet.updatedAt", "DESC");
    if (tenantId) {
      courseOrders.andWhere("course.tenantId = :tenantId", { tenantId }); learning.andWhere("course.tenantId = :tenantId", { tenantId });
      mallOrders.andWhere("order.tenantId = :tenantId", { tenantId }); mallRefunds.andWhere("refund.tenantId = :tenantId", { tenantId }); communityPosts.andWhere("post.tenantId = :tenantId", { tenantId }); wallets.andWhere("wallet.tenantScopeKey = :walletScope", { walletScope: `tenant:${tenantId}` });
    }
    const [courseOrderRows, learningRows, mallOrderRows, mallRefundRows, postRows, walletRows] = await Promise.all([courseOrders.getMany(), learning.getMany(), mallOrders.getMany(), mallRefunds.getMany(), communityPosts.getMany(), wallets.getMany()]);
    return {
      course: { orderCount: courseOrderRows.length, learningRecordCount: learningRows.length, completedLessonCount: learningRows.filter(row => row.completedAt).length, orders: courseOrderRows, learning: learningRows },
      mall: { orderCount: mallOrderRows.length, refundCount: mallRefundRows.length, paidAmount: mallOrderRows.filter(row => ["paid", "shipped", "completed", "refund_pending", "refunded"].includes(row.status)).reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2), orders: mallOrderRows, refunds: mallRefundRows },
      community: { postCount: postRows.length, approvedPostCount: postRows.filter(row => row.status === "approved" && row.visible).length, posts: postRows },
      wallets: walletRows
    };
  }

  async bulkTagMembers(input: { userIds?: number[]; name?: string; color?: string; remark?: string }, admin?: AdminContext) {
    const userIds = Array.from(new Set((Array.isArray(input.userIds) ? input.userIds : []).map((id) => Math.trunc(Number(id))).filter((id) => id > 0))).slice(0, 500);
    const name = String(input.name || "").trim().slice(0, 40);
    if (!userIds.length) throw new BadRequestException("请选择要打标签的会员");
    if (!name) throw new BadRequestException("请填写标签名称");
    const color = String(input.color || "default").trim();
    if (!["default", "success", "warning", "danger", "info", "primary"].includes(color)) throw new BadRequestException("标签颜色不正确");
    const tenant = this.tenantRelation(admin);
    const scopeKey = this.memberSegmentScope(admin).scopeKey;
    let createdCount = 0;
    let skippedCount = 0;
    for (const userId of userIds) {
      await this.assertTagMemberAccess(userId, admin);
      const user = await this.users.findOneBy({ id: userId });
      if (!user) {
        skippedCount += 1;
        continue;
      }
      const exists = await this.userTags
        .createQueryBuilder("tag")
        .leftJoin("tag.user", "user")
        .leftJoin("tag.tenant", "tenant")
        .where("user.id = :userId", { userId })
        .andWhere("tag.name = :name", { name })
        .andWhere("tag.tenantScopeKey = :scopeKey", { scopeKey });
      if (await exists.getExists()) {
        skippedCount += 1;
        continue;
      }
      try {
        await this.userTags.save(this.userTags.create({ user, tenant, tenantScopeKey: scopeKey, name, color, remark: input.remark || null }));
        createdCount += 1;
      } catch (error) {
        if (!isDuplicateEntryError(error)) throw error;
        skippedCount += 1;
      }
    }
    await this.logOperation(admin, "user_tag.bulk_members", "user", null, `批量标记会员：${name}`, { userCount: userIds.length, createdCount, skippedCount });
    return { name, createdCount, skippedCount };
  }

  async listWallets(keyword?: string, admin?: AdminContext, tenantId?: number | null) {
    const tenant = await this.walletTenantForAdmin(admin, tenantId);
    const builder = this.userWallets
      .createQueryBuilder("wallet")
      .leftJoinAndSelect("wallet.user", "user")
      .leftJoinAndSelect("wallet.tenant", "tenant")
      .orderBy("wallet.updatedAt", "DESC")
      .take(300);
    if (tenant) builder.where("wallet.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.where("wallet.tenantId IS NULL");
    if (keyword?.trim()) builder.andWhere("(user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${keyword.trim()}%` });
    return builder.getMany();
  }

  async getUserWallet(userId: number, admin?: AdminContext, tenantId?: number | null) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertUserTenantAccess(userId, admin);
    const tenant = await this.walletTenantForAdmin(admin, tenantId);
    const tenantScopeKey = this.walletTenantScopeKey(tenant);
    const wallet = await this.userWallets.findOne({ where: { user: { id: userId }, tenantScopeKey } });
    return wallet || { user, tenant, tenantScopeKey, availableBalance: "0.00", frozenBalance: "0.00", giftBalance: "0.00", frozenGiftBalance: "0.00", totalRecharge: "0.00", totalSpent: "0.00" };
  }

  async listWalletTransactions(userId: number | undefined, admin?: AdminContext, tenantId?: number | null) {
    const tenant = await this.walletTenantForAdmin(admin, tenantId);
    const builder = this.walletTransactions
      .createQueryBuilder("tx")
      .leftJoinAndSelect("tx.user", "user")
      .leftJoinAndSelect("tx.wallet", "wallet")
      .leftJoinAndSelect("tx.order", "order")
      .leftJoinAndSelect("tx.tenant", "tenant")
      .orderBy("tx.createdAt", "DESC")
      .take(300);
    if (tenant) builder.where("tx.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.where("tx.tenantId IS NULL");
    if (userId) {
      await this.assertUserTenantAccess(userId, admin);
      builder.andWhere("tx.userId = :userId", { userId });
    }
    return builder.getMany();
  }

  async adjustUserWallet(userId: number, dto: WalletAdjustDto, admin: AdminContext) {
    this.assertPlatformAdmin(admin);
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount === 0) throw new BadRequestException("调整金额不能为 0");
    if (dto.type !== "adjust" && amount <= 0) throw new BadRequestException("资金操作金额必须大于 0");
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存");
    await this.assertUserTenantAccess(userId, admin);
    const tenant = dto.tenantId ? await this.resolveWalletTenantForPlatform(dto.tenantId) : await this.walletTenantForAdmin(admin);
    const tenantScopeKey = this.walletTenantScopeKey(tenant);
    const direction = ["deduct", "gift_revoke", "freeze"].includes(dto.type) || (dto.type === "adjust" && amount < 0) ? "debit" : "credit";
    const amountFen = Math.abs(yuanToFen(amount));
    const absoluteAmount = Number(fenToYuan(amountFen));
    const transactionType = dto.type === "recharge" ? "admin_recharge" : dto.type === "deduct" ? "admin_deduct" : dto.type === "gift_grant" ? "gift_grant" : dto.type === "gift_revoke" ? "gift_revoke" : dto.type === "freeze" ? "balance_freeze" : dto.type === "unfreeze" ? "balance_unfreeze" : "admin_adjust";
    const result = await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(UserWallet);
      const txRepo = manager.getRepository(WalletTransaction);
      const findExisting = (currentRead = false) => txRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey }, relations: { user: true, wallet: true }, loadEagerRelations: false, ...(currentRead ? { lock: { mode: "pessimistic_read" as const } } : {}) });
      const assertIdempotentMatch = (existing: WalletTransaction) => {
        if (existing.user?.id !== userId || existing.wallet?.tenantScopeKey !== tenantScopeKey || existing.type !== transactionType || existing.direction !== direction || yuanToFen(existing.amount) !== amountFen) throw new ConflictException("幂等键已被其他钱包操作使用");
      };
      const existing = await findExisting();
      let wallet = await walletRepo.findOne({ where: { user: { id: userId }, tenantScopeKey }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (existing) {
        assertIdempotentMatch(existing);
        if (!wallet) throw new InternalServerErrorException("钱包幂等流水缺少关联钱包");
        return { wallet, walletTransaction: existing, idempotent: true };
      }
      if (!wallet) {
        await walletRepo.createQueryBuilder().insert().values({ user: { id: userId }, tenant: tenant ? { id: tenant.id } : null, tenantScopeKey } as any).orIgnore().execute();
        wallet = await walletRepo.findOne({ where: { user: { id: userId }, tenantScopeKey }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
        if (!wallet) throw new InternalServerErrorException("钱包创建失败");
      }
      const repeated = await findExisting(true);
      if (repeated) {
        assertIdempotentMatch(repeated);
        return { wallet, walletTransaction: repeated, idempotent: true };
      }
      const beforeFen = yuanToFen(wallet.availableBalance || 0);
      const frozenBeforeFen = yuanToFen(wallet.frozenBalance || 0);
      const giftBeforeFen = yuanToFen(wallet.giftBalance || 0);
      const frozenGiftBeforeFen = yuanToFen(wallet.frozenGiftBalance || 0);
      let afterFen = beforeFen;
      let frozenAfterFen = frozenBeforeFen;
      let giftAfterFen = giftBeforeFen;
      let frozenGiftAfterFen = frozenGiftBeforeFen;
      if (["recharge", "adjust"].includes(dto.type)) afterFen += direction === "credit" ? amountFen : -amountFen;
      if (dto.type === "deduct") afterFen -= amountFen;
      if (dto.type === "gift_grant") giftAfterFen += amountFen;
      if (dto.type === "gift_revoke") giftAfterFen -= amountFen;
      if (dto.type === "freeze") {
        const allocation = allocateWalletFunds(amountFen, beforeFen, giftBeforeFen, dto.fundSource || "mixed");
        if (!allocation) throw new BadRequestException("可用余额与赠送金不足，不能冻结");
        afterFen -= allocation.cashFen;
        giftAfterFen -= allocation.giftFen;
        frozenAfterFen += allocation.cashFen;
        frozenGiftAfterFen += allocation.giftFen;
      }
      if (dto.type === "unfreeze") {
        const allocation = allocateWalletFunds(amountFen, frozenBeforeFen, frozenGiftBeforeFen, dto.fundSource || "mixed");
        if (!allocation) throw new BadRequestException("冻结余额与冻结赠送金不足，不能解冻");
        frozenAfterFen -= allocation.cashFen;
        frozenGiftAfterFen -= allocation.giftFen;
        afterFen += allocation.cashFen;
        giftAfterFen += allocation.giftFen;
      }
      if (afterFen < 0) throw new BadRequestException("可用余额不足，不能执行资金操作");
      if (frozenAfterFen < 0) throw new BadRequestException("冻结余额不足，不能解冻");
      if (giftAfterFen < 0) throw new BadRequestException("赠送金不足，不能扣回");
      if (frozenGiftAfterFen < 0) throw new BadRequestException("冻结赠送金不足，不能解冻");
      wallet.availableBalance = fenToYuan(afterFen);
      wallet.frozenBalance = fenToYuan(frozenAfterFen);
      wallet.giftBalance = fenToYuan(giftAfterFen);
      wallet.frozenGiftBalance = fenToYuan(frozenGiftAfterFen);
      if (dto.type === "recharge") wallet.totalRecharge = (Number(wallet.totalRecharge) + absoluteAmount).toFixed(2);
      await walletRepo.save(wallet);
      const walletTransaction = await txRepo.save(txRepo.create({
        wallet,
        user,
        tenant,
        order: null,
        transactionNo: `WAL${Date.now()}${userId}`,
        direction,
        type: transactionType,
        amount: absoluteAmount.toFixed(2),
        balanceBefore: fenToYuan(beforeFen),
        balanceAfter: fenToYuan(afterFen),
        frozenBefore: fenToYuan(frozenBeforeFen),
        frozenAfter: fenToYuan(frozenAfterFen),
        giftBefore: fenToYuan(giftBeforeFen),
        giftAfter: fenToYuan(giftAfterFen),
        frozenGiftBefore: fenToYuan(frozenGiftBeforeFen),
        frozenGiftAfter: fenToYuan(frozenGiftAfterFen),
        operator: this.actorName(admin),
        remark: dto.remark || null,
        idempotencyKey: dto.idempotencyKey
      }));
      return { wallet, walletTransaction, idempotent: false };
    });
    await this.logOperation(admin, `wallet.${dto.type}`, "user", userId, `用户余额${dto.type}：${absoluteAmount.toFixed(2)}`, { direction, fundSource: dto.fundSource || "mixed", remark: dto.remark || null });
    return result;
  }

  async exportRegistrations(query: RegistrationQueryDto, admin?: AdminContext) {
    const rows = (await this.listRegistrations({ ...query, page: undefined, pageSize: undefined }, admin)) as Registration[];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("报名记录");
    const customLabels = Array.from(new Set(rows.flatMap((row) => row.answers.map((answer) => answer.label))));
    sheet.columns = [
      { header: "报名ID", key: "id", width: 10 },
      { header: "活动", key: "activity", width: 24 },
      { header: "活动开始", key: "activityStartTime", width: 22 },
      { header: "活动结束", key: "activityEndTime", width: 22 },
      { header: "活动地点", key: "activityLocation", width: 28 },
      { header: "用户手机", key: "phone", width: 16 },
      { header: "Status", key: "status", width: 16 },
      { header: "签到时间", key: "checkInAt", width: 22 },
      { header: "核销员", key: "checkInOperator", width: 18 },
      { header: "核销备注", key: "checkInRemark", width: 28 },
      { header: "报名时间", key: "createdAt", width: 22 },
      ...customLabels.map((label) => ({ header: label, key: label, width: 20 }))
    ];
    rows.forEach((row) => {
      const checkIn = (row as Registration & { checkIn?: CheckIn }).checkIn;
      const values: Record<string, unknown> = {
        id: row.id,
        activity: row.activity.title,
        activityStartTime: row.activity.startTime || "",
        activityEndTime: row.activity.endTime || "",
        activityLocation: row.activity.location || "",
        phone: row.user.phone,
        status: row.status,
        checkInAt: checkIn?.createdAt || "",
        checkInOperator: checkIn?.operator?.username || "",
        checkInRemark: checkIn?.remark || "",
        createdAt: row.createdAt
      };
      row.answers.forEach((answer) => { values[answer.label] = Array.isArray(answer.value) ? answer.value.join(",") : answer.value; });
      sheet.addRow(values);
    });
    await this.logExport(admin, "registrations", rows.length, query);
    return workbook.xlsx.writeBuffer();
  }

  async exportOrders(query: OrderQueryDto | OrderStatus = {}, admin?: AdminContext) {
    const normalizedQuery: OrderQueryDto = typeof query === "string" ? { status: query } : { ...(query || {}), page: undefined, pageSize: undefined };
    const rows = (await this.listOrders(normalizedQuery, admin)) as Order[];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("订单记录");
    sheet.columns = [
      { header: "订单", key: "orderNo", width: 24 },
      { header: "活动", key: "activity", width: 28 },
      { header: "代理", key: "agent", width: 20 },
      { header: "用户手机", key: "phone", width: 16 },
      { header: "票种", key: "ticketType", width: 16 },
      { header: "优惠", key: "coupon", width: 16 },
      { header: "会员等级", key: "memberLevel", width: 16 },
      { header: "原价", key: "originalAmount", width: 12 },
      { header: "会员优惠", key: "memberDiscountAmount", width: 12 },
      { header: "积分抵扣", key: "pointsDiscountAmount", width: 12 },
      { header: "使用积分", key: "pointsUsed", width: 12 },
      { header: "总优", key: "discountAmount", width: 12 },
      { header: "金额", key: "amount", width: 12 },
      { header: "支付方式", key: "paymentMethod", width: 14 },
      { header: "Status", key: "status", width: 14 },
      { header: "交易", key: "transactionNo", width: 24 },
      { header: "确认", key: "paidByAdmin", width: 14 },
      { header: "收款备注", key: "paidRemark", width: 28 },
      { header: "付款截止", key: "expiresAt", width: 22 },
      { header: "关闭时间", key: "closedAt", width: 22 },
      { header: "关闭原因", key: "closeReason", width: 28 },
      { header: "支付时间", key: "paidAt", width: 22 },
      { header: "创建时间", key: "createdAt", width: 22 }
    ];
    rows.forEach((row) => sheet.addRow({ orderNo: row.orderNo, activity: row.registration.activity.title, agent: row.agent?.name || "平台自营", phone: row.registration.user.phone, ticketType: row.ticketType?.name || "标准报名", coupon: row.coupon?.code || "-", memberLevel: row.memberLevel?.name || "-", originalAmount: row.originalAmount || row.amount, memberDiscountAmount: row.memberDiscountAmount || "0.00", pointsDiscountAmount: row.pointsDiscountAmount || "0.00", pointsUsed: row.pointsUsed || 0, discountAmount: row.discountAmount || "0.00", amount: row.amount, paymentMethod: row.paymentMethod, status: row.status, transactionNo: row.transactionNo, paidByAdmin: row.paidByAdmin, paidRemark: row.paidRemark, expiresAt: row.expiresAt, closedAt: row.closedAt, closeReason: row.closeReason, paidAt: row.paidAt, createdAt: row.createdAt }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    await this.logExport(admin, "orders", rows.length, typeof query === "string" ? { status: query } : query);
    return workbook.xlsx.writeBuffer();
  }

  private async ensureDefaultAdmin() {
    let defaultAdmin = await this.admins.findOne({ where: { username: "admin" } });
    if (!defaultAdmin) {
      await this.admins.save(this.admins.create({ username: "admin", passwordHash: await bcrypt.hash("Admin123456", 10), role: AdminRole.SuperAdmin, tenant: null }));
      return;
    }
    if (defaultAdmin.tenant) {
      defaultAdmin.tenant = null;
      await this.admins.save(defaultAdmin);
    }
  }

  private normalizePhone(phone: string) {
    const normalized = String(phone || "").trim();
    if (!/^1\d{10}$/.test(normalized)) throw new BadRequestException("请输入正确的手机号");
    return normalized;
  }

  private maskPhone(phone: string) {
    const text = String(phone || "");
    return text.length === 11 ? `${text.slice(0, 3)}****${text.slice(-4)}` : text;
  }

  private assertSmsTestPermission(admin?: AdminContext) {
    const permissions = effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions });
    if (permissions.includes("system.manage") || permissions.includes("operation_settings.manage")) return;
    throw new ForbiddenException("当前账号无权限发送测试短信");
  }

  private uploadRoot() {
    return `${this.config.get<string>("UPLOAD_DIR", "uploads").replace(/\/$/, "")}/images`;
  }

  private releaseInfo() {
    return {
      version: this.config.get<string>("APP_VERSION", "0.1.0"),
      commit: this.config.get<string>("BUILD_COMMIT", "local"),
      buildTime: this.config.get<string>("BUILD_TIME", "unknown")
    };
  }

  private validateAdminPassword(password: string) {
    if (!password || password.length < 10) throw new BadRequestException("管理员密码至少需要 10 位");
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) throw new BadRequestException("管理员密码需要包含大小写字母和数字");
  }

  private validateAdminUsername(username: string) {
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) throw new BadRequestException("管理员账号需为 3-32 位字母、数字、点、下划线或横线");
  }

  private publicAdmin(admin: AdminUser) {
    const role = normalizeAdminRole(admin.role);
    const tenantId = admin.tenant?.id ?? null;
    return { id: admin.id, username: admin.username, role, tenantId, permissions: this.effectiveAdminPermissions(admin, role, tenantId), assignedPermissions: admin.permissions, dataScope: normalizeAdminDataScope(admin.dataScope), tenant: admin.tenant ? { id: admin.tenant.id, code: admin.tenant.code, name: admin.tenant.name, region: admin.tenant.region, enabled: admin.tenant.enabled } : null, enabled: admin.enabled, createdAt: admin.createdAt, updatedAt: admin.updatedAt };
  }

  private effectiveAdminPermissions(admin: AdminUser, role = normalizeAdminRole(admin.role), tenantId = admin.tenant?.id ?? null) {
    return effectivePermissionsForAdmin({ role, tenantId, permissions: admin.permissions });
  }

  private resolveAssignedAdminPermissions(value: unknown, role: string, tenantId: number | null) {
    const normalized = normalizeAdminPermissions(value);
    if (normalized === null) return null;
    const platformOnly = new Set(defaultPermissionsForRole(AdminRole.SuperAdmin, false).filter((key) => !defaultPermissionsForRole(AdminRole.SuperAdmin, true).includes(key)));
    const scoped = tenantId ? normalized.filter((key) => !platformOnly.has(key)) : normalized;
    return scoped;
  }

  private async assertAdminLoginRateLimit(username: string, clientIp: string | null, userAgent: string | null) {
    const windowMinutes = Math.max(Number(this.config.get("ADMIN_LOGIN_WINDOW_MINUTES", 10)), 1);
    const maxFailures = Math.max(Number(this.config.get("ADMIN_LOGIN_MAX_FAILURES", 5)), 1);
    const lockedMinutes = Math.max(Number(this.config.get("ADMIN_LOGIN_LOCK_MINUTES", 10)), 1);
    const now = Date.now();
    const lockedSince = new Date(now - lockedMinutes * 60 * 1000);
    const limitedBuilder = this.adminLoginLogs.createQueryBuilder("log").where("log.username = :username", { username }).andWhere("log.status = :status", { status: "rate_limited" }).andWhere("log.createdAt > :lockedSince", { lockedSince }).orderBy("log.createdAt", "DESC");
    if (clientIp) limitedBuilder.andWhere("log.clientIp = :clientIp", { clientIp });
    else limitedBuilder.andWhere("log.clientIp IS NULL");
    const recentLimit = await limitedBuilder.getOne();
    if (recentLimit) throw new UnauthorizedException("登录失败次数过多，请稍后再试");

    const failedBuilder = this.adminLoginLogs.createQueryBuilder("log").where("log.username = :username", { username }).andWhere("log.status = :status", { status: "failed" }).andWhere("log.createdAt > :windowStart", { windowStart: new Date(now - windowMinutes * 60 * 1000) });
    if (clientIp) failedBuilder.andWhere("log.clientIp = :clientIp", { clientIp });
    else failedBuilder.andWhere("log.clientIp IS NULL");
    const failedCount = await failedBuilder.getCount();
    if (failedCount >= maxFailures) {
      await this.recordAdminLogin({ username, clientIp, userAgent, status: "rate_limited", failureReason: "too_many_failures" });
      throw new UnauthorizedException("登录失败次数过多，请稍后再试");
    }
  }

  private recordAdminLogin(input: { username: string; adminId?: number | null; tenantId?: number | null; clientIp?: string | null; userAgent?: string | null; status: "success" | "failed" | "rate_limited"; failureReason?: string | null }) {
    return this.adminLoginLogs.save(
      this.adminLoginLogs.create({
        username: input.username || "-",
        adminId: input.adminId || null,
        tenantId: input.tenantId || null,
        clientIp: input.clientIp || null,
        status: input.status,
        failureReason: input.failureReason || null,
        userAgent: input.userAgent ? input.userAgent.slice(0, 255) : null
      })
    );
  }

  private logOperation(admin: AdminContext | undefined, action: string, targetType: string, targetId: string | number | null, summary: string, detail?: Record<string, unknown>) {
    return this.operationLogs.save(
      this.operationLogs.create({
        adminId: admin?.id || null,
        adminUsername: admin?.username || null,
        tenantId: admin?.tenantId || null,
        adminRole: admin?.role || null,
        clientIp: admin?.clientIp?.slice(0, 64) || null,
        userAgent: admin?.userAgent?.slice(0, 255) || null,
        requestId: admin?.requestId?.slice(0, 80) || null,
        action,
        targetType,
        targetId: targetId === null || targetId === undefined ? null : String(targetId),
        summary,
        detail: detail ? sanitizeAuditValue(detail) as Record<string, unknown> : null
      })
    );
  }

  private logExport(admin: AdminContext | undefined, dataset: string, rowCount: number, filters: unknown) {
    return this.logOperation(admin, `export.${dataset}`, "export", dataset, `导出 ${dataset}：${rowCount} 条`, { dataset, rowCount, format: "xlsx", filters: sanitizeAuditValue(filters) as Record<string, unknown> });
  }

  private tenantAuditSnapshot(row: Tenant) { return { code: row.code, name: row.name, region: row.region, contactName: row.contactName, contactPhone: row.contactPhone, enabled: row.enabled, settings: row.settings || {} }; }
  private adminAuditSnapshot(row: AdminUser) { return { username: row.username, role: row.role, tenantId: row.tenant?.id || null, enabled: row.enabled, permissions: this.effectiveAdminPermissions(row), dataScope: normalizeAdminDataScope(row.dataScope), sessionVersion: Number(row.sessionVersion || 0) }; }
  private categoryAuditSnapshot(row: ActivityCategory) { return { name: row.name, tenantId: row.tenant?.id || null, scene: row.scene, publicVisible: row.publicVisible, sortOrder: row.sortOrder, enabled: row.enabled, iconUrl: row.iconUrl, coverUrl: row.coverUrl }; }
  private ticketTypeAuditSnapshot(row: TicketType) { return { activityId: row.activity?.id || null, tenantId: row.tenant?.id || null, name: row.name, price: row.price, capacity: row.capacity, perUserLimit: row.perUserLimit, saleStartsAt: row.saleStartsAt, saleEndsAt: row.saleEndsAt, earlyBirdPrice: row.earlyBirdPrice, earlyBirdEndsAt: row.earlyBirdEndsAt, memberPrice: row.memberPrice, tierPrices: row.tierPrices, enabled: row.enabled }; }
  private couponAuditSnapshot(row: Coupon) { return { code: row.code, tenantId: row.tenant?.id || null, name: row.name, activityId: row.activity?.id || null, discountType: row.discountType, discountValue: row.discountValue, minAmount: row.minAmount, usageLimit: row.usageLimit, usedCount: row.usedCount, claimMode: row.claimMode, perUserLimit: row.perUserLimit, claimedCount: row.claimedCount, enabled: row.enabled, startsAt: row.startsAt, endsAt: row.endsAt }; }
  private redemptionCodeAuditSnapshot(row: RedemptionCode) { return { code: row.code, tenantId: row.tenant?.id || null, name: row.name, targetType: row.targetType, targetId: row.targetId, points: row.points, usageLimit: row.usageLimit, perUserLimit: row.perUserLimit, usedCount: row.usedCount, enabled: row.enabled, startsAt: row.startsAt, endsAt: row.endsAt }; }
  private activityAuditSnapshot(row: Activity) { return { title: row.title, tenantId: row.tenant?.id || null, categoryId: row.category?.id || null, status: row.status, price: row.price, capacity: row.capacity, location: row.location, startTime: row.startTime, endTime: row.endTime, registrationDeadline: row.registrationDeadline, featured: row.featured, requireReview: row.requireReview, allowCancel: row.allowCancel }; }
  private operationSettingAuditSnapshot(row: OperationSetting) { return { registrationEnabled: row.registrationEnabled, publicActivityArchiveEnabled: row.publicActivityArchiveEnabled, tenantSwitcherEnabled: row.tenantSwitcherEnabled, paymentMethods: row.paymentMethods, customerServiceName: row.customerServiceName, customerServicePhone: row.customerServicePhone, customerServiceWechat: row.customerServiceWechat, pageTheme: row.pageTheme, userAgreementUrl: row.userAgreementUrl, privacyPolicyUrl: row.privacyPolicyUrl, merchantAgreementUrl: row.merchantAgreementUrl, smsProviderEnabled: row.smsProviderEnabled, smsProvider: row.smsProvider, smsAccessKeyId: row.smsAccessKeyId, smsAccessKeySecret: row.smsAccessKeySecret, automaticSms: normalizeAutomaticSmsSettings(row.automaticSms), automaticWechat: normalizeAutomaticWechatSettings(row.automaticWechat), postEventAutomation: normalizePostEventAutomationSettings(row.postEventAutomation), defaultTenantCode: row.defaultTenantCode, launchConfig: row.launchConfig }; }

  private actorName(admin?: AdminContext) {
    return admin?.username || "system";
  }

  private async dashboardActivityRow(activity: Activity) {
    const [registeredCount, checkInCount, reviewCount, viewCount, shareVisitCount, paidOrderCount, paidAmount, refundAmount] = await Promise.all([
      this.registrations.count({ where: { activity: { id: activity.id } } }),
      this.checkIns.createQueryBuilder("checkIn").leftJoin("checkIn.registration", "registration").where("registration.activityId = :activityId", { activityId: activity.id }).getCount(),
      this.activityReviews.count({ where: { activity: { id: activity.id } } }),
      this.activityViewLogs.createQueryBuilder("view").where("view.activityId = :activityId", { activityId: activity.id }).getCount(),
      this.shareVisits.createQueryBuilder("share").where("share.activityId = :activityId", { activityId: activity.id }).getCount(),
      this.orders.createQueryBuilder("order").leftJoin("order.registration", "registration").where("registration.activityId = :activityId", { activityId: activity.id }).andWhere("order.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).getCount(),
      this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.registration", "registration").select("COALESCE(SUM(transaction.amount), 0)", "sum").where("registration.activityId = :activityId", { activityId: activity.id }).andWhere("transaction.status = :status", { status: "success" }).getRawOne<{ sum: string }>(),
      this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.registration", "registration").select("COALESCE(SUM(refund.amount), 0)", "sum").where("registration.activityId = :activityId", { activityId: activity.id }).andWhere("refund.status = :status", { status: "completed" }).getRawOne<{ sum: string }>()
    ]);
    const paidTotal = Number(paidAmount?.sum || 0);
    const refundTotal = Number(refundAmount?.sum || 0);
    const checkInRate = boundedPercentage(checkInCount, registeredCount);
    const registrationConversionRate = boundedPercentage(registeredCount, viewCount);
    const netAmount = paidTotal - refundTotal;
    const operationAdvice = this.dashboardActivityAdvice({ registeredCount, netAmount, checkInRate, registrationConversionRate });
    return {
      id: activity.id,
      title: activity.title,
      status: activity.status,
      tenant: activity.tenant ? this.publicTenant(activity.tenant) : null,
      registeredCount,
      checkInCount,
      reviewCount,
      viewCount,
      shareVisitCount,
      paidOrderCount,
      paidAmount: paidTotal.toFixed(2),
      refundAmount: refundTotal.toFixed(2),
      netAmount: netAmount.toFixed(2),
      avgOrderAmount: (paidOrderCount > 0 ? paidTotal / paidOrderCount : 0).toFixed(2),
      checkInRate,
      registrationConversionRate,
      operationAdvice,
      remainingSeats: Math.max(Number(activity.capacity || 0) - registeredCount, 0)
    };
  }

  private async analyticsScope(query: AnalyticsQueryDto = {}, admin?: AdminContext) {
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId || undefined : query.tenantId;
    if (tenantId && !this.isTenantScoped(admin)) {
      const tenant = await this.tenants.findOneBy({ id: tenantId });
      if (!tenant) throw new NotFoundException("商家不存在");
    }
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    try {
      startDate = query.startDate ? analyticsDayRange(query.startDate).start : undefined;
      endDate = query.endDate ? analyticsDayRange(query.endDate).end : undefined;
    } catch {
      throw new BadRequestException("统计日期必须为有效的 YYYY-MM-DD 日期");
    }
    if (startDate && query.endDate && analyticsDayRange(query.endDate).start < startDate) throw new BadRequestException("统计结束日期不能早于开始日期");
    return { tenantId, activityId: query.activityId, startDate, endDate };
  }

  private analyticsBuilders(scope: { tenantId?: number; activityId?: number; startDate?: Date; endDate?: Date }, admin?: AdminContext) {
    const events = this.conversionEvents.createQueryBuilder("event");
    const payments = this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    const refunds = this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    const walletTx = this.walletTransactions.createQueryBuilder("walletTx");
    payments.andWhere("transaction.businessType = :activityBusinessType", { activityBusinessType: "activity" });
    this.applyAnalyticsScope(events, "event", scope, admin);
    this.applyAnalyticsScope(payments, "transaction", scope, admin);
    this.applyAnalyticsScope(refunds, "refund", scope, admin);
    applyAdminActivityDataScope(events, "event", admin?.dataScope);
    applyAdminActivityDataScope(payments, "transaction", admin?.dataScope);
    applyAdminActivityDataScope(refunds, "refund", admin?.dataScope);
    if (scope.tenantId) walletTx.andWhere("walletTx.tenantId = :walletTenantId", { walletTenantId: scope.tenantId });
    if (scope.startDate) walletTx.andWhere("walletTx.createdAt >= :walletStartDate", { walletStartDate: scope.startDate });
    if (scope.endDate) walletTx.andWhere("walletTx.createdAt < :walletEndDate", { walletEndDate: scope.endDate });
    return { events, payments, refunds, walletTx };
  }

  private applyAnalyticsScope(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, scope: { tenantId?: number; activityId?: number; startDate?: Date; endDate?: Date }, admin?: AdminContext) {
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId : scope.tenantId;
    if (tenantId) builder.andWhere(`${alias}.tenantId = :analyticsTenantId`, { analyticsTenantId: tenantId });
    if (scope.activityId) {
      if (alias === "transaction" || alias === "refund") builder.andWhere("activity.id = :analyticsActivityId", { analyticsActivityId: scope.activityId });
      else builder.andWhere(`${alias}.activityId = :analyticsActivityId`, { analyticsActivityId: scope.activityId });
    }
    if (scope.startDate) builder.andWhere(`${alias}.createdAt >= :analyticsStartDate`, { analyticsStartDate: scope.startDate });
    if (scope.endDate) builder.andWhere(`${alias}.createdAt < :analyticsEndDate`, { analyticsEndDate: scope.endDate });
  }

  private channelReportBuilder(scope: { tenantId?: number; activityId?: number; startDate?: Date; endDate?: Date }, admin?: AdminContext) {
    const builder = this.activityChannels
      .createQueryBuilder("channel")
      .leftJoin("channel.activity", "activity")
      .leftJoin("channel.tenant", "tenant")
      .leftJoin("conversion_events", "event", "event.channelId = channel.id")
      .select("channel.id", "id")
      .addSelect("channel.name", "name")
      .addSelect("channel.code", "code")
      .addSelect("channel.source", "source")
      .addSelect("channel.enabled", "enabled")
      .addSelect("activity.id", "activityId")
      .addSelect("activity.title", "activityTitle")
      .addSelect("tenant.name", "tenantName")
      .addSelect("SUM(CASE WHEN event.type = 'view' THEN 1 ELSE 0 END)", "viewCount")
      .addSelect("SUM(CASE WHEN event.type = 'register' THEN 1 ELSE 0 END)", "registrationCount")
      .addSelect("SUM(CASE WHEN event.type = 'pay' THEN 1 ELSE 0 END)", "paidCount")
      .addSelect("SUM(CASE WHEN event.type = 'check_in' THEN 1 ELSE 0 END)", "checkInCount")
      .addSelect("COALESCE(SUM(CASE WHEN event.type = 'pay' THEN event.amount ELSE 0 END), 0)", "paidAmount")
      .groupBy("channel.id")
      .addGroupBy("activity.id")
      .addGroupBy("tenant.name")
      .orderBy("paidAmount", "DESC");
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId : scope.tenantId;
    if (tenantId) builder.andWhere("channel.tenantId = :channelTenantId", { channelTenantId: tenantId });
    if (scope.activityId) builder.andWhere("activity.id = :channelActivityId", { channelActivityId: scope.activityId });
    if (scope.startDate) builder.andWhere("(event.createdAt IS NULL OR event.createdAt >= :channelStartDate)", { channelStartDate: scope.startDate });
    if (scope.endDate) builder.andWhere("(event.createdAt IS NULL OR event.createdAt < :channelEndDate)", { channelEndDate: scope.endDate });
    applyAdminActivityDataScope(builder, "channel", admin?.dataScope);
    return builder;
  }

  private channelReportRow(row: any) {
    const viewCount = Number(row.viewCount || 0);
    const registrationCount = Number(row.registrationCount || 0);
    const paidCount = Number(row.paidCount || 0);
    return {
      id: Number(row.id),
      name: row.name,
      code: row.code,
      source: row.source,
      enabled: Boolean(row.enabled),
      activityId: Number(row.activityId),
      activityTitle: row.activityTitle,
      tenantName: row.tenantName,
      viewCount,
      registrationCount,
      paidCount,
      checkInCount: Number(row.checkInCount || 0),
      paidAmount: Number(row.paidAmount || 0).toFixed(2),
      signupRate: this.rate(registrationCount, viewCount),
      paymentRate: this.rate(paidCount, registrationCount)
    };
  }

  private async recordAdminConversionEvent(type: string, input: { activity?: Activity | null; user?: User | null; registration?: Registration | null; order?: Order | null; channel?: ActivityChannel | null; amount?: string | number | null; source?: string | null; idempotencyKey?: string | null }) {
    const registration = input.registration || input.order?.registration || null;
    const activity = input.activity || registration?.activity || null;
    const channel = input.channel || registration?.channel || null;
    const ticketType = input.order?.ticketType || null;
    const result = await this.conversionEvents
      .createQueryBuilder()
      .insert()
      .values({
      type: type as any,
      tenant: this.relationId(activity?.tenant || input.order?.tenant || registration?.tenant || channel?.tenant || null),
      activity: this.relationId(activity),
      user: this.relationId(input.user || registration?.user || null),
      registration: this.relationId(registration),
      order: this.relationId(input.order || null),
      channel: this.relationId(channel),
      ticketTypeIdSnapshot: ticketType?.id || null,
      ticketTypeNameSnapshot: ticketType?.name || null,
      channelCodeSnapshot: registration?.attributionChannelCode || channel?.code || null,
      channelNameSnapshot: registration?.attributionChannelName || channel?.name || null,
      provinceSnapshot: registration?.attributionProvince || activity?.locationProvince || null,
      citySnapshot: registration?.attributionCity || activity?.locationCity || null,
      districtSnapshot: registration?.attributionDistrict || activity?.locationDistrict || null,
      amount: Number(input.amount || 0).toFixed(2),
      source: registration?.attributionSource || input.source || "admin",
      idempotencyKey: input.idempotencyKey || null,
      clientIp: null,
      userAgent: null,
      payload: null
    } as any).orIgnore().updateEntity(false)
      .execute();
    const id = Number(result.identifiers[0]?.id || result.raw?.insertId || 0);
    return id ? { id } : null;
  }

  private async analyticsTenantRanking(scope: { tenantId?: number; startDate?: Date; endDate?: Date }, admin?: AdminContext) {
    if (this.isTenantScoped(admin) || scope.tenantId) return [];
    const builder = this.tenants
      .createQueryBuilder("tenant")
      .leftJoin("activities", "activity", "activity.tenantId = tenant.id")
      .leftJoin("conversion_events", "event", "event.tenantId = tenant.id")
      .select("tenant.id", "tenantId")
      .addSelect("tenant.name", "tenantName")
      .addSelect("COUNT(DISTINCT activity.id)", "activityCount")
      .addSelect("SUM(CASE WHEN event.type = 'register' THEN 1 ELSE 0 END)", "registrationCount")
      .addSelect("SUM(CASE WHEN event.type = 'pay' THEN event.amount ELSE 0 END)", "paidAmount")
      .groupBy("tenant.id")
      .orderBy("paidAmount", "DESC")
      .limit(10);
    if (scope.startDate) builder.andWhere("(event.createdAt IS NULL OR event.createdAt >= :rankStartDate)", { rankStartDate: scope.startDate });
    if (scope.endDate) builder.andWhere("(event.createdAt IS NULL OR event.createdAt < :rankEndDate)", { rankEndDate: scope.endDate });
    const rows = await builder.getRawMany<any>();
    return rows.map((row) => ({ tenantId: Number(row.tenantId), tenantName: row.tenantName, activityCount: Number(row.activityCount || 0), registrationCount: Number(row.registrationCount || 0), paidAmount: Number(row.paidAmount || 0).toFixed(2) }));
  }

  private async analyticsRisk(scope: { tenantId?: number }, admin?: AdminContext) {
    const tenantId = this.isTenantScoped(admin) ? admin?.tenantId : scope.tenantId;
    const pendingRefundBuilder = this.refunds.createQueryBuilder("refund").where("refund.status = :status", { status: "pending" });
    const callbackRiskBuilder = this.paymentCallbackLogs.createQueryBuilder("callback").where("(callback.signatureValid = :invalid OR callback.resultStatus IN (:...statuses))", { invalid: false, statuses: ["failed", "error"] });
    const reconciliationBuilder = this.paymentTransactions.createQueryBuilder("transaction").where("transaction.reconciliationStatus = :status", { status: "pending" });
    if (tenantId) {
      pendingRefundBuilder.andWhere("refund.tenantId = :riskTenantId", { riskTenantId: tenantId });
      callbackRiskBuilder.andWhere("callback.tenantId = :riskTenantId", { riskTenantId: tenantId });
      reconciliationBuilder.andWhere("transaction.tenantId = :riskTenantId", { riskTenantId: tenantId });
    }
    const [pendingRefundCount, callbackRiskCount, pendingReconciliationCount] = await Promise.all([pendingRefundBuilder.getCount(), callbackRiskBuilder.getCount(), reconciliationBuilder.getCount()]);
    return { pendingRefundCount, callbackRiskCount, pendingReconciliationCount };
  }

  private rate(numerator: number, denominator: number) {
    return boundedPercentage(numerator, denominator);
  }

  private normalizeCategoryDto(dto: CategoryDto) {
    return {
      name: dto.name.trim(),
      iconUrl: this.truncateNullableText(dto.iconUrl, 500),
      coverUrl: this.truncateNullableText(dto.coverUrl, 500),
      publicVisible: dto.publicVisible ?? true,
      scene: this.normalizeScene(dto.scene),
      sortOrder: Number(dto.sortOrder ?? 0),
      enabled: dto.enabled ?? true
    };
  }

  private normalizeScene(value?: string) {
    const scene = String(value || "activity").trim().replace(/[^\w-]/g, "").slice(0, 40);
    return scene || "activity";
  }

  private truncateNullableText(value?: string | null, max = 255) {
    const text = String(value ?? "").trim();
    return text ? text.slice(0, max) : null;
  }

  private paymentMethodLabel(method: PaymentMethod | string) {
    const map: Record<string, string> = {
      [PaymentMethod.Free]: "免费报名",
      [PaymentMethod.Wechat]: "微信支付",
      [PaymentMethod.Alipay]: "支付宝",
      [PaymentMethod.Balance]: "余额支付",
      [PaymentMethod.Offline]: "线下收款"
    };
    return map[String(method)] || String(method || "未知支付");
  }

  private analyticsOperationAdvice(totals: Record<string, any>, rates: Record<string, any>, risk: Record<string, any>) {
    const advice: Array<{ level: "success" | "warning" | "danger" | "info"; title: string; message: string }> = [];
    if (Number(totals.viewCount || 0) > 50 && Number(rates.signupRate || 0) < 8) advice.push({ level: "warning", title: "浏览高报名低", message: "建议优化活动标题、封面、价格和报名说明，降低用户决策成本。" });
    if (Number(totals.registrationCount || 0) > 10 && Number(rates.paymentRate || 0) < 60) advice.push({ level: "warning", title: "报名高支付低", message: "建议检查支付方式、线下收款说明和付款截止提醒。" });
    if (Number(totals.paidCount || 0) > 10 && Number(rates.checkInRate || 0) < 70) advice.push({ level: "danger", title: "支付高签到低", message: "建议加强活动前提醒、客服触达和现场签到引导。" });
    if (Number(totals.refundAmount || 0) > Number(totals.paidAmount || 0) * 0.2 && Number(totals.refundAmount || 0) > 0) advice.push({ level: "danger", title: "退款偏高", message: "建议复盘活动交付、退款规则和用户预期管理。" });
    if (Number(risk?.pendingReconciliationCount || 0) > 0) advice.push({ level: "warning", title: "对账待处理", message: "存在支付对账异常，建议财务优先核对流水。" });
    if (!advice.length) advice.push({ level: "success", title: "经营数据平稳", message: "当前核心漏斗暂无明显异常，可继续观察渠道和复购变化。" });
    return advice;
  }

  private normalizeChannelCode(value: string) {
    const code = String(value || "").trim().replace(/[^\w-]/g, "").slice(0, 48);
    if (code.length < 2) throw new BadRequestException("渠道码至少需要 2 位字母、数字、下划线或连字符");
    return code;
  }

  private dashboardActivityAdvice(input: { registeredCount: number; netAmount: number; checkInRate: number; registrationConversionRate: number }) {
    if (input.registeredCount <= 0) return { level: "muted", label: "观察中", message: "先积累报名和浏览数据，再判断是否复制。" };
    if (input.netAmount > 0 && input.registeredCount >= 10 && input.checkInRate >= 70) return { level: "success", label: "可复制", message: "报名、收入和交付表现较好，适合复盘后复制。" };
    if (input.registrationConversionRate > 0 && input.registrationConversionRate < 5) return { level: "warning", label: "转化待优化", message: "浏览到报名偏低，建议优化标题、封面、价格或报名说明。" };
    if (input.checkInRate > 0 && input.checkInRate < 60) return { level: "danger", label: "交付风险", message: "签到率偏低，建议加强活动提醒、客服跟进和现场流程。" };
    if (input.netAmount <= 0 && input.registeredCount > 0) return { level: "warning", label: "收益待提升", message: "已有报名但净收入偏低，建议检查定价、优惠和退款原因。" };
    return { level: "muted", label: "持续观察", message: "数据已有起步，继续观察报名、收入和签到变化。" };
  }

  private tenantLaunchReadiness(
    tenant: Tenant,
    counts: {
      enabledAdminCount: number;
      enabledPaymentAccountCount: number;
      totalActivityCount: number;
      pendingActivityCount: number;
      pendingRegistrationCount: number;
      pendingRefundCount: number;
      callbackRiskCount: number;
      homepageSectionCount: number;
    },
    setting?: OperationSetting | null
  ) {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const actions: string[] = [];
    const settings = { ...this.tenantPermissions(tenant), entitlements: tenantEffectiveEntitlements(this.tenantEntitlementSettings(tenant)) };
    const subscription = tenantSubscriptionStatus(settings);

    if (!tenant.enabled) blockers.push("商家已停用");
    if (["read_only", "suspended"].includes(subscription.status)) blockers.push(subscription.status === "read_only" ? "商家套餐处于只读期" : "商家套餐已暂停");
    else if (subscription.status === "grace_period") warnings.push("商家套餐处于宽限期");
    if (Number(counts.enabledAdminCount || 0) <= 0) blockers.push("缺少可登录商家管理员");
    if (Number(counts.enabledPaymentAccountCount || 0) <= 0) blockers.push(settings.paymentAccountEditable ? "缺少启用的收款账户" : "收款配置权限关闭且未配置启用账户");
    if (Number(counts.totalActivityCount || 0) <= 0) blockers.push("尚未创建活动");
    if (Number(counts.callbackRiskCount || 0) > 0) blockers.push("存在异常支付回调");

    if (!setting) warnings.push("运营设置未初始化");
    else {
      if (!setting.registrationEnabled) warnings.push("全站报名开关已暂停");
      if (!setting.customerServicePhone && !setting.customerServiceWechat) warnings.push("缺少客服手机号或客服微信");
      if (!setting.offlinePaymentInstructions?.trim()) warnings.push("缺少线下付款说明");
      if (!setting.refundInstructions?.trim()) warnings.push("缺少退款说明");
    }
    if (Number(counts.homepageSectionCount || 0) <= 0) warnings.push("首页装修未启用模块");
    if (subscription.status === "expiring_soon") warnings.push(`商家套餐 ${subscription.daysRemaining} 天后到期`);
    if (Number(counts.pendingActivityCount || 0) > 0) warnings.push(`有 ${counts.pendingActivityCount} 个待审核活动`);
    if (Number(counts.pendingRegistrationCount || 0) > 0) warnings.push(`有 ${counts.pendingRegistrationCount} 个待审核报名`);
    if (Number(counts.pendingRefundCount || 0) > 0) warnings.push(`有 ${counts.pendingRefundCount} 个待处理退款`);

    actions.push(...blockers, ...warnings);
    const score = Math.max(0, Math.min(100, 100 - blockers.length * 22 - warnings.length * 7));
    const status = blockers.length ? "no_go" : warnings.length ? "warn" : "go";
    const label = status === "go" ? "可上线" : status === "warn" ? "可灰度" : "暂不可上线";
    return { score, status, label, blockers, warnings, actions: actions.slice(0, 6) };
  }

  private publicTenant(tenant: Tenant) {
    const settings = { ...this.tenantPermissions(tenant), entitlements: tenantEffectiveEntitlements(this.tenantEntitlementSettings(tenant)) };
    return { id: tenant.id, code: tenant.code, name: tenant.name, region: tenant.region, contactName: tenant.contactName, contactPhone: tenant.contactPhone, organizerProfile: this.publicTenantOrganizerProfile(tenant), remark: tenant.remark, enabled: tenant.enabled, settings, subscriptionStatus: tenantSubscriptionStatus(settings), renewalReminder: tenantRenewalReminder(settings), packageTemplate: tenantPackagePermissionTemplate(settings.packagePlan), createdAt: tenant.createdAt, updatedAt: tenant.updatedAt };
  }

  private publicTenantOrganizerProfile(tenant: Tenant) {
    const raw = this.isPlainObject(tenant.settings) && this.isPlainObject(tenant.settings.organizerProfile) ? tenant.settings.organizerProfile : {};
    const logoUrl = this.nullableText(typeof raw.logoUrl === "string" ? raw.logoUrl : null);
    const intro = this.nullableText(typeof raw.intro === "string" ? raw.intro : null);
    const servicePromise = this.nullableText(typeof raw.servicePromise === "string" ? raw.servicePromise : null);
    return { logoUrl, intro, servicePromise };
  }

  private publicTenantListItem(tenant: Tenant, includeSensitive: boolean) {
    const row = this.publicTenant(tenant);
    return { ...row, contactPhone: includeSensitive ? row.contactPhone : maskPhone(row.contactPhone), sensitiveMasked: !includeSensitive };
  }

  private publicTenantRegion(region: TenantRegion) {
    return {
      id: region.id,
      tenant: { id: region.tenant.id, code: region.tenant.code, name: region.tenant.name, region: region.tenant.region, enabled: region.tenant.enabled },
      province: region.province,
      city: region.city,
      district: region.district,
      name: region.name,
      latitude: Number(region.latitude),
      longitude: Number(region.longitude),
      radiusMeters: region.radiusMeters,
      boundaryPoints: region.boundaryPoints || null,
      exclusive: region.exclusive,
      priority: region.priority,
      authorizationStatus: region.authorizationStatus,
      validFrom: region.validFrom,
      validUntil: region.validUntil,
      approvalRemark: region.approvalRemark,
      authorizationActive: tenantRegionAuthorizationActive(region),
      authorizationReminder: tenantRegionAuthorizationReminder(region),
      enabled: region.enabled,
      remark: region.remark,
      createdAt: region.createdAt,
      updatedAt: region.updatedAt
    };
  }

  private tenantRegionHitLogQuery(query: TenantRegionHitLogQueryDto = {}, withRelations = false) {
    const builder = this.tenantRegionHitLogs.createQueryBuilder("log");
    if (withRelations) {
      builder.leftJoinAndSelect("log.tenant", "tenant").leftJoinAndSelect("log.region", "region").leftJoinAndSelect("region.tenant", "regionTenant");
    } else {
      builder.leftJoin("log.tenant", "tenant").leftJoin("log.region", "region").leftJoin("region.tenant", "regionTenant");
    }
    this.applyTenantRegionHitLogFilters(builder, query);
    return builder;
  }

  private applyTenantRegionHitLogFilters(builder: SelectQueryBuilder<TenantRegionHitLog>, query: TenantRegionHitLogQueryDto = {}) {
    if (query.tenantId) builder.andWhere("(tenant.id = :tenantId OR regionTenant.id = :tenantId)", { tenantId: query.tenantId });
    if (query.matched === "true") builder.andWhere("log.matched = :matched", { matched: true });
    if (query.matched === "false") builder.andWhere("log.matched = :matched", { matched: false });
    if (query.source?.trim()) builder.andWhere("log.source = :source", { source: query.source.trim() });
    const startDate = this.tenantRegionHitLogDate(query.startDate, "开始日期");
    const endDate = this.tenantRegionHitLogDate(query.endDate, "结束日期", true);
    if (startDate && endDate && startDate.getTime() >= endDate.getTime()) throw new BadRequestException("开始日期必须早于结束日期");
    if (startDate) builder.andWhere("log.createdAt >= :startDate", { startDate });
    if (endDate) builder.andWhere("log.createdAt < :endDate", { endDate });
  }

  private tenantRegionHitLogDate(value?: string, label = "日期", endExclusive = false) {
    const text = String(value || "").trim();
    if (!text) return null;
    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      date = new Date(`${text}T00:00:00`);
      if (endExclusive) date.setDate(date.getDate() + 1);
    } else {
      date = new Date(text);
    }
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label}格式无效`);
    return date;
  }

  private ratio(part: number, total: number) {
    if (!total) return 0;
    return Number((part / total).toFixed(4));
  }

  private canViewSensitiveTenantRegionHitLogs(admin?: AdminContext) {
    return effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions }).includes("tenant_region_hit_log.sensitive");
  }

  private hasLogPermission(admin: AdminContext | undefined, permission: string) {
    return effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions }).includes(permission as any);
  }

  private publicLogTenantOption(tenant: Tenant) {
    return { id: tenant.id, code: tenant.code, name: tenant.name, region: tenant.region, enabled: tenant.enabled };
  }

  private publicCategory(row: ActivityCategory) {
    return {
      id: row.id,
      name: row.name,
      iconUrl: row.iconUrl,
      coverUrl: row.coverUrl,
      publicVisible: row.publicVisible,
      scene: row.scene,
      tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null,
      sortOrder: row.sortOrder,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicTicketType(row: TicketType) {
    return {
      id: row.id,
      activity: row.activity ? { id: row.activity.id, title: row.activity.title, status: row.activity.status } : null,
      tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null,
      name: row.name,
      price: row.price,
      capacity: row.capacity,
      perUserLimit: row.perUserLimit,
      saleStartsAt: row.saleStartsAt,
      saleEndsAt: row.saleEndsAt,
      earlyBirdPrice: row.earlyBirdPrice,
      earlyBirdEndsAt: row.earlyBirdEndsAt,
      memberPrice: row.memberPrice,
      tierPrices: row.tierPrices,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicActivityCoupon(row: Coupon) {
    return {
      id: row.id,
      code: row.code,
      tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null,
      name: row.name,
      discountType: row.discountType,
      discountValue: row.discountValue,
      minAmount: row.minAmount,
      usageLimit: row.usageLimit,
      usedCount: row.usedCount,
      claimMode: row.claimMode,
      perUserLimit: row.perUserLimit,
      claimedCount: row.claimedCount,
      activity: row.activity ? { id: row.activity.id, title: row.activity.title, status: row.activity.status } : null,
      enabled: row.enabled,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicCouponClaimRecord(row: CouponClaim) {
    return {
      id: row.id,
      tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null,
      coupon: { id: row.coupon.id, code: row.coupon.code, name: row.coupon.name, activity: row.coupon.activity ? { id: row.coupon.activity.id, title: row.coupon.activity.title } : null },
      user: { id: row.user.id, nickname: row.user.nickname, phone: maskPhone(row.user.phone) },
      claimedCount: row.claimedCount,
      usedCount: row.usedCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicCouponUsageRecord(row: CouponUsage) {
    return {
      id: row.id,
      tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null,
      coupon: { id: row.coupon.id, code: row.coupon.code, name: row.coupon.name, activity: row.coupon.activity ? { id: row.coupon.activity.id, title: row.coupon.activity.title } : null },
      order: row.order ? { id: row.order.id, orderNo: row.order.orderNo, status: row.order.status } : null,
      user: { id: row.user.id, nickname: row.user.nickname, phone: maskPhone(row.user.phone) },
      discountAmount: row.discountAmount,
      status: row.status,
      releasedAt: row.releasedAt,
      releaseReason: row.releaseReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicWaitlist(row: Waitlist, includeSensitive = false) {
    return {
      id: row.id,
      status: row.status,
      answers: includeSensitive ? (row.answers || []) : this.maskWaitlistAnswers(row.answers),
      remark: row.remark,
      sensitiveMasked: !includeSensitive,
      activity: row.activity ? {
        id: row.activity.id,
        title: row.activity.title,
        status: row.activity.status,
        capacity: row.activity.capacity,
        tenant: row.activity.tenant ? this.publicLogTenantOption(row.activity.tenant) : null
      } : null,
      user: row.user ? {
        id: row.user.id,
        nickname: row.user.nickname,
        phone: includeSensitive ? row.user.phone : maskPhone(row.user.phone)
      } : null,
      promotedRegistration: row.promotedRegistration ? { id: row.promotedRegistration.id, status: row.promotedRegistration.status } : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private maskWaitlistAnswers(answers?: any[] | null) {
    return (answers || []).map((answer, index) => {
      const label = String(answer?.label || answer?.name || `报名信息 ${index + 1}`).trim();
      return { ...answer, value: this.maskWaitlistAnswerValue(answer?.value, label) };
    });
  }

  private maskWaitlistAnswerValue(value: unknown, label = ""): unknown {
    if (Array.isArray(value)) return value.map((item) => this.maskWaitlistAnswerValue(item, label));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, this.maskWaitlistAnswerValue(item, `${label}${key}`)]));
    const text = String(value ?? "").trim();
    if (!text) return text;
    const normalized = label.toLowerCase();
    if (/手机|电话|mobile|phone|tel/.test(normalized)) return maskPhone(text);
    if (/身份证|证件|id.?card|passport/.test(normalized)) return text.length > 8 ? `${text.slice(0, 4)}********${text.slice(-4)}` : "****";
    if (/姓名|name/.test(normalized)) return text.length > 1 ? `${text.slice(0, 1)}**` : "*";
    if (/地址|住址|address/.test(normalized)) return text.length > 6 ? `${text.slice(0, 6)}****` : "****";
    if (/微信|qq|wechat/.test(normalized)) return maskContactHandle(text);
    return text
      .replace(/1\d{10}/g, (phone) => maskPhone(phone))
      .replace(/([A-Z0-9._%+-])[^@\s]*(@[^\s]+)/gi, "$1***$2");
  }

  private publicRedemptionCode(row: RedemptionCode) {
    return {
      id: row.id,
      tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null,
      code: row.code,
      name: row.name,
      targetType: row.targetType,
      targetId: row.targetId,
      points: row.points,
      usageLimit: row.usageLimit,
      perUserLimit: row.perUserLimit,
      usedCount: row.usedCount,
      enabled: row.enabled,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicRedemptionUsageRecord(row: RedemptionCodeUsage) {
    return {
      id: row.id,
      tenant: row.tenant ? this.publicLogTenantOption(row.tenant) : null,
      redemptionCode: { id: row.redemptionCode.id, code: row.redemptionCode.code, name: row.redemptionCode.name, targetType: row.redemptionCode.targetType },
      user: { id: row.user.id, nickname: row.user.nickname, phone: maskPhone(row.user.phone) },
      usedCount: row.usedCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private exportDate(value?: Date | string | null) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().replace("T", " ").slice(0, 19);
  }

  private publicOperationLog(row: AdminOperationLog, admin?: AdminContext) {
    const includeSensitive = this.hasLogPermission(admin, "logs.sensitive");
    const detail = sanitizeAuditValue(row.detail);
    return { ...row, clientIp: includeSensitive ? row.clientIp : this.maskClientIp(row.clientIp), userAgent: includeSensitive ? row.userAgent : null, detail: includeSensitive ? detail : this.maskOperationLogDetail(detail), sensitiveMasked: !includeSensitive };
  }

  private maskOperationLogDetail(value: unknown, key = ""): unknown {
    if (Array.isArray(value)) return value.map((item) => this.maskOperationLogDetail(item, key));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [childKey, this.maskOperationLogDetail(childValue, childKey)]));
    const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (/phone|mobile|tel/.test(normalizedKey)) return this.maskPhone(String(value || ""));
    if (/clientip|ipaddress/.test(normalizedKey)) return this.maskClientIp(String(value || ""));
    if (/useragent|idcard|identity|bankaccount|address|latitude|longitude/.test(normalizedKey)) return value === null || value === undefined || value === "" ? value : "***";
    return value;
  }

  private publicAdminLoginLog(row: AdminLoginLog, admin?: AdminContext) {
    const includeSensitive = this.hasLogPermission(admin, "security_log.sensitive");
    return { ...row, clientIp: includeSensitive ? row.clientIp : this.maskClientIp(row.clientIp), userAgent: includeSensitive ? row.userAgent : null, sensitiveMasked: !includeSensitive };
  }

  private publicH5AuthCodeLog(row: H5AuthCodeLog, admin?: AdminContext) {
    const includeSensitive = this.hasLogPermission(admin, "security_log.sensitive");
    return { ...row, phone: includeSensitive ? row.phone : this.maskPhone(row.phone), clientIp: includeSensitive ? row.clientIp : this.maskClientIp(row.clientIp), providerMessageId: includeSensitive ? row.providerMessageId : null, sensitiveMasked: !includeSensitive };
  }

  private maskClientIp(value?: string | null) {
    const text = String(value || "").trim();
    if (!text) return null;
    const ipv4 = text.split(".");
    if (ipv4.length === 4) return `${ipv4[0]}.${ipv4[1]}.*.*`;
    const ipv6 = text.split(":").filter(Boolean);
    if (ipv6.length >= 2) return `${ipv6[0]}:${ipv6[1]}:*`;
    return "已脱敏";
  }

  private publicTenantRegionHitLog(log: TenantRegionHitLog, includeSensitive = false) {
    const tenant = log.tenant || log.region?.tenant || null;
    return {
      id: log.id,
      matched: log.matched,
      tenant: tenant ? this.publicTenant(tenant) : null,
      region: log.region ? { id: log.region.id, name: log.region.name, province: log.region.province, city: log.region.city, district: log.region.district } : null,
      latitude: includeSensitive ? Number(log.latitude) : null,
      longitude: includeSensitive ? Number(log.longitude) : null,
      distanceMeters: log.distanceMeters,
      source: log.source,
      clientIp: includeSensitive ? log.clientIp : this.maskClientIp(log.clientIp),
      userAgent: includeSensitive ? log.userAgent : null,
      sensitiveMasked: !includeSensitive,
      createdAt: log.createdAt
    };
  }

  private normalizeTenantRegionDto(dto: TenantRegionDto) {
    const latitude = Number(dto.latitude);
    const longitude = Number(dto.longitude);
    const radiusMeters = Math.round(Number(dto.radiusMeters || 0));
    const boundaryPoints = this.normalizeTenantRegionBoundaryPoints(dto.boundaryPoints);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new BadRequestException("纬度范围应为 -90 到 90");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new BadRequestException("经度范围应为 -180 到 180");
    if (!Number.isFinite(radiusMeters) || radiusMeters < 100 || radiusMeters > 200000) throw new BadRequestException("保护半径应为 100 米到 200 公里");
    const validFrom = this.normalizeTenantRegionDate(dto.validFrom, "授权开始日期");
    const validUntil = this.normalizeTenantRegionDate(dto.validUntil, "授权结束日期");
    if (validFrom && validUntil && validFrom > validUntil) throw new BadRequestException("授权开始日期不能晚于结束日期");
    return {
      province: this.truncateNullableText(dto.province, 80),
      city: this.truncateNullableText(dto.city, 80),
      district: this.truncateNullableText(dto.district, 80),
      name: String(dto.name || "").trim().slice(0, 120),
      latitude,
      longitude,
      radiusMeters,
      boundaryPoints,
      exclusive: dto.exclusive !== false,
      priority: Number.isFinite(Number(dto.priority)) ? Number(dto.priority) : 0,
      enabled: dto.enabled !== false,
      validFrom,
      validUntil,
      remark: this.truncateNullableText(dto.remark, 1000)
    };
  }

  private normalizeTenantRegionDate(value: unknown, label: string) {
    const text = String(value || "").trim();
    if (!text) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(`${text}T00:00:00Z`).getTime())) throw new BadRequestException(`${label}格式无效`);
    return text;
  }

  private normalizeTenantRegionBoundaryPoints(value: unknown): TenantRegionBoundaryPoint[] | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    if (!Array.isArray(value)) throw new BadRequestException("多边形边界点格式无效");
    if (!value.length) return null;
    if (value.length < 3) throw new BadRequestException("多边形边界至少需要 3 个点");
    if (value.length > 200) throw new BadRequestException("多边形边界最多支持 200 个点");
    return value.map((item) => {
      if (!item || typeof item !== "object") throw new BadRequestException("多边形边界点格式无效");
      const point = item as Record<string, unknown>;
      const lat = Number(point.lat ?? point.latitude);
      const lng = Number(point.lng ?? point.longitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new BadRequestException("多边形边界纬度范围应为 -90 到 90");
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new BadRequestException("多边形边界经度范围应为 -180 到 180");
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    });
  }

  private async findTenantRegionConflict(input: { id?: number | null; tenantId: number; latitude: number; longitude: number; radiusMeters: number; boundaryPoints?: TenantRegionBoundaryPoint[] | null; exclusive: boolean; enabled: boolean }) {
    if (!input.exclusive || !input.enabled) return null;
    const candidates = await this.tenantRegions
      .createQueryBuilder("region")
      .leftJoinAndSelect("region.tenant", "tenant")
      .where("region.enabled = :enabled", { enabled: true })
      .andWhere("region.exclusive = :exclusive", { exclusive: true })
      .andWhere("region.authorizationStatus = :authorizationStatus", { authorizationStatus: "approved" })
      .andWhere("tenant.id <> :tenantId", { tenantId: input.tenantId });
    if (input.id) candidates.andWhere("region.id <> :id", { id: input.id });
    const regions = await candidates.getMany();
    const conflict = regions.find((region) => {
      return tenantRegionShapesConflict(
        { latitude: input.latitude, longitude: input.longitude, radiusMeters: input.radiusMeters, boundaryPoints: input.boundaryPoints || null },
        { latitude: Number(region.latitude), longitude: Number(region.longitude), radiusMeters: Number(region.radiusMeters || 0), boundaryPoints: region.boundaryPoints || null }
      );
    });
    return conflict || null;
  }

  private isTenantScoped(admin?: AdminContext) {
    return isTenantScopedActor(admin);
  }

  private isPlatformAdmin(admin?: AdminContext) {
    return normalizeAdminRole(admin?.role) === AdminRole.SuperAdmin && !admin?.tenantId;
  }

  private assertPlatformAdmin(admin?: AdminContext) {
    const delegatedEcosystemAccess = !admin?.tenantId && ["ambassador.view", "ambassador.manage", "ambassador.sensitive", "ambassador.export", "partner.view", "partner.manage", "partner.sensitive", "partner.export"].includes(String(admin?.requiredPermission || ""));
    const delegatedDashboardAccess = !admin?.tenantId && admin?.requiredPermission === "dashboard.view";
    const delegatedSystemAccess = !admin?.tenantId && ["system.view", "system.manage"].includes(String(admin?.requiredPermission || ""));
    const delegatedTenantAccess = !admin?.tenantId && ["tenant.view", "tenant.manage", "tenant.permissions.manage", "tenant.subscription.manage", "tenant.export"].includes(String(admin?.requiredPermission || ""));
    const delegatedPaymentAccountAccess = !admin?.tenantId && ["payment_account.view", "payment_account.manage"].includes(String(admin?.requiredPermission || ""));
    const delegatedRegionAccess = !admin?.tenantId && ["tenant_region.view", "tenant_region.manage", "tenant_region.approve"].includes(String(admin?.requiredPermission || ""));
    const delegatedRegionHitLogAccess = !admin?.tenantId && ["tenant_region_hit_log.view", "tenant_region_hit_log.sensitive", "tenant_region_hit_log.export"].includes(String(admin?.requiredPermission || ""));
    const delegatedAdminAccess = !admin?.tenantId && ["admin.view", "admin.manage", "admin.security.manage"].includes(String(admin?.requiredPermission || ""));
    const delegatedLogAccess = !admin?.tenantId && ["logs.view", "logs.sensitive", "logs.export", "security_log.view", "security_log.sensitive", "security_log.export"].includes(String(admin?.requiredPermission || ""));
    if (!this.isPlatformAdmin(admin) && !delegatedEcosystemAccess && !delegatedDashboardAccess && !delegatedSystemAccess && !delegatedTenantAccess && !delegatedPaymentAccountAccess && !delegatedRegionAccess && !delegatedRegionHitLogAccess && !delegatedAdminAccess && !delegatedLogAccess) throw new ForbiddenException("Only platform super admin can operate");
  }

  private async currentTenantForAdmin(admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) throw new ForbiddenException("只有商家后台账号可以维护商家资料");
    const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
    if (!tenant || !tenant.enabled) throw new NotFoundException("当前商家不存在或已停用");
    return tenant;
  }

  private defaultTenantPermissions(): TenantPermissionSettings {
    return { ...tenantPackagePermissionTemplate("standard").permissions, packagePlan: "standard", packageExpiresAt: null, packageSuspended: false, packageReadOnly: false };
  }

  private tenantPermissions(tenant?: Tenant | null): TenantPermissionSettings {
    const settings = this.isPlainObject(tenant?.settings) ? tenant?.settings || {} : {};
    const defaults = this.defaultTenantPermissions();
    return {
      activityPublishReviewRequired: settings.activityPublishReviewRequired === undefined ? defaults.activityPublishReviewRequired : Boolean(settings.activityPublishReviewRequired),
      registrationReviewEnabled: settings.registrationReviewEnabled === undefined ? defaults.registrationReviewEnabled : Boolean(settings.registrationReviewEnabled),
      paymentAccountEditable: settings.paymentAccountEditable === undefined ? defaults.paymentAccountEditable : Boolean(settings.paymentAccountEditable),
      mallEnabled: settings.mallEnabled === undefined ? defaults.mallEnabled : Boolean(settings.mallEnabled),
      packagePlan: normalizeTenantPackagePlan(settings.packagePlan),
      packageExpiresAt: normalizeTenantPackageExpiresAt(settings.packageExpiresAt),
      packageSuspended: Boolean(settings.packageSuspended),
      packageReadOnly: Boolean(settings.packageReadOnly),
      entitlements: this.isPlainObject(settings.entitlements) ? settings.entitlements : undefined
    };
  }

  private mergeTenantSettings(input?: Record<string, unknown> | null, current?: Record<string, unknown> | null) {
    const base = this.isPlainObject(current) ? current : {};
    const next = this.isPlainObject(input) ? input : {};
    const merged: Record<string, unknown> = { ...base };
    const permissionKeys = ["activityPublishReviewRequired", "registrationReviewEnabled", "paymentAccountEditable", "mallEnabled"];
    const hasExplicitPermission = permissionKeys.some((key) => next[key] !== undefined);
    if (next.packagePlan !== undefined) {
      const template = tenantPackagePermissionTemplate(next.packagePlan);
      merged.packagePlan = template.plan;
      if (!hasExplicitPermission) Object.assign(merged, template.permissions);
    }
    for (const key of permissionKeys) {
      if (next[key] !== undefined) merged[key] = Boolean(next[key]);
    }
    if (next.packageExpiresAt !== undefined) merged.packageExpiresAt = normalizeTenantPackageExpiresAt(next.packageExpiresAt);
    if (next.entitlements !== undefined) {
      if (!this.isPlainObject(next.entitlements)) throw new BadRequestException("套餐权益配置格式不正确");
      merged.entitlements = tenantEffectiveEntitlements({ packagePlan: merged.packagePlan, entitlements: next.entitlements as any });
    } else if (next.packagePlan !== undefined) {
      delete merged.entitlements;
    }
    return { ...this.defaultTenantPermissions(), ...merged };
  }

  private async resolveAdminTenant(tenantId?: number | null, admin?: AdminContext) {
    if (this.isTenantScoped(admin)) {
      const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
      if (!tenant) throw new NotFoundException("当前商家不存在或已停用");
      return tenant;
    }
    this.assertPlatformAdmin(admin);
    if (!tenantId) {
      if (!this.isPlatformAdmin(admin)) throw new ForbiddenException("委派账号只能管理商家员工账号");
      return null;
    }
    const tenant = await this.tenants.findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException("商家不存在");
    return tenant;
  }

  private async resolveHomepageTenant(admin?: AdminContext, tenantId?: number | null) {
    if (this.isTenantScoped(admin)) {
      const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
      if (!tenant || !tenant.enabled) throw new NotFoundException("Current tenant not found or disabled");
      return tenant;
    }
    this.assertPlatformAdmin(admin);
    if (!tenantId) return null;
    const tenant = await this.tenants.findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException("商家不存在");
    return tenant;
  }

  private assertHomepageSectionScope(section: HomepageSection, targetTenant: Tenant | null, pageKey = "home") {
    if ((section.pageKey || "home") !== normalizePageKey(pageKey)) throw new NotFoundException("Homepage section not found in selected page");
    if (targetTenant) {
      if (section.tenant?.id !== targetTenant.id) throw new NotFoundException("Homepage section not found in selected tenant");
      return;
    }
    if (section.tenant?.id) throw new NotFoundException("Homepage section not found in global scope");
  }

  private async snapshotHomepageSections(targetTenant: Tenant | null, pageKey: string): Promise<HomepageDecorationSnapshotRow[]> {
    const normalizedPageKey = normalizePageKey(pageKey);
    const builder = this.homepageSections.createQueryBuilder("section").where("section.pageKey = :pageKey", { pageKey: normalizedPageKey }).orderBy("section.sortOrder", "ASC").addOrderBy("section.id", "ASC");
    if (targetTenant) builder.andWhere("section.tenantId = :tenantId", { tenantId: targetTenant.id });
    else builder.andWhere("section.tenantId IS NULL");
    const sections = await builder.getMany();
    return this.normalizeHomepageSnapshotRows(sections.map((section) => ({
      type: section.type,
      title: section.title,
      subtitle: section.subtitle,
      enabled: section.enabled,
      sortOrder: section.sortOrder,
      config: section.config,
      layout: section.layout
    })));
  }

  private normalizeHomepageSnapshotRows(rows: any[]): HomepageDecorationSnapshotRow[] {
    if (!Array.isArray(rows)) throw new BadRequestException("装修快照格式不正确");
    return rows.map((row, index) => ({
      type: this.normalizeHomepageType(row.type),
      title: this.nullableText(row.title),
      subtitle: this.nullableText(row.subtitle),
      enabled: row.enabled !== false,
      sortOrder: (index + 1) * 10,
      config: this.normalizeJsonObject(row.config || {}, "config"),
      layout: this.normalizeJsonObject(row.layout || {}, "layout")
    }));
  }

  private assertHomepageDecorationScope(row: { tenant?: Tenant | null; pageKey?: string | null }, targetTenant: Tenant | null, pageKey: string, label: string) {
    if ((row.pageKey || "home") !== normalizePageKey(pageKey)) throw new NotFoundException(`${label}不属于当前页面`);
    if (targetTenant) {
      if (row.tenant?.id !== targetTenant.id) throw new NotFoundException(`${label}不属于当前商家`);
      return;
    }
    if (row.tenant?.id) throw new NotFoundException(`${label}不属于平台默认装修`);
  }

  private assertHomepageTemplateReadable(template: HomepageDecorationTemplate, targetTenant: Tenant | null, pageKey: string) {
    if ((template.pageKey || "home") !== normalizePageKey(pageKey)) throw new NotFoundException("装修模板不属于当前页面");
    if (!template.tenant?.id) return;
    if (targetTenant?.id === template.tenant.id) return;
    throw new NotFoundException("装修模板不属于当前商家");
  }

  private async replaceHomepageSectionsFromSnapshot(admin: AdminContext | undefined, targetTenant: Tenant | null, pageKey: string, rows: any[], action: string, summary: string, targetType: string, targetId: string | number | null) {
    const normalizedPageKey = normalizePageKey(pageKey);
    const snapshot = this.normalizeHomepageSnapshotRows(rows);
    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(HomepageSection);
      const deleteBuilder = repo.createQueryBuilder().delete().where("pageKey = :pageKey", { pageKey: normalizedPageKey });
      if (targetTenant) deleteBuilder.andWhere("tenantId = :tenantId", { tenantId: targetTenant.id });
      else deleteBuilder.andWhere("tenantId IS NULL");
      await deleteBuilder.execute();
      if (!snapshot.length) return [];
      return repo.save(snapshot.map((row) => repo.create({ ...row, pageKey: normalizedPageKey, tenant: targetTenant })));
    });
    await this.logOperation(admin, action, targetType, targetId, summary, { pageKey: normalizedPageKey, tenantId: targetTenant?.id || null, sectionCount: saved.length });
    return saved;
  }

  private async resolveAgentTenant(tenantId?: number | null, fallback?: Tenant | null, admin?: AdminContext, repository: Repository<Tenant> = this.tenants) {
    if (this.isTenantScoped(admin)) {
      const tenant = await repository.findOneBy({ id: admin?.tenantId || 0 });
      if (!tenant) throw new NotFoundException("Current tenant not found or disabled");
      return tenant;
    }
    this.assertPaymentAccountPermission(admin, "payment_account.manage");
    if (!tenantId) {
      if (fallback?.id) return fallback;
      throw new BadRequestException("Platform admin must select a tenant before creating merchant payment agents");
    }
    const tenant = await repository.findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException("Tenant not found");
    return tenant;
  }

  private resolveNewAdminRole(role: string | undefined, admin?: AdminContext) {
    const normalized = normalizeAdminRole(role || AdminRole.SuperAdmin) as AdminRole;
    if (this.isTenantScoped(admin)) {
      if (!TENANT_STAFF_ROLES.includes(normalized)) throw new ForbiddenException("商家管理员只能创建运营、财务或签到员工账号");
      return normalized;
    }
    this.assertPlatformAdmin(admin);
    if (!this.isPlatformAdmin(admin) && !TENANT_STAFF_ROLES.includes(normalized)) throw new ForbiddenException("委派账号只能设置运营、财务或签到员工角色");
    return normalized;
  }

  private assertAdminAccountAccess(row: AdminUser, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) {
      this.assertPlatformAdmin(admin);
      if (!this.isPlatformAdmin(admin) && !row.tenant?.id) throw new ForbiddenException("委派账号不能操作平台账号");
      return;
    }
    if (row.tenant?.id !== admin?.tenantId) throw new NotFoundException("管理员不存在或不属于当前商家");
  }

  private async resolveActivityTenant(admin?: AdminContext, fallback?: Tenant | null, tenantId?: number | null) {
    if (admin?.tenantId) {
      const tenant = await this.tenants.findOneBy({ id: admin.tenantId });
      if (!tenant || !tenant.enabled) throw new NotFoundException("Current tenant not found or disabled");
      return tenant;
    }
    if (tenantId) {
      this.assertPlatformAdmin(admin);
      const tenant = await this.tenants.findOneBy({ id: tenantId });
      if (!tenant || !tenant.enabled) throw new NotFoundException("商家不存在或已停用");
      return tenant;
    }
    return fallback || null;
  }

  private resolveActivitySaveStatus(requested: ActivityStatus, current: ActivityStatus | undefined, permissions: TenantPermissionSettings, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return requested;
    if (!permissions.activityPublishReviewRequired) return requested;
    if (current === ActivityStatus.Open && requested === ActivityStatus.Open) return ActivityStatus.Open;
    if (requested === ActivityStatus.Open) throw new BadRequestException("当前商家活动发布需要平台审核，请先提交审核");
    if (requested === ActivityStatus.PendingApproval) return ActivityStatus.PendingApproval;
    return requested;
  }

  private async assertPaymentAccountEditable(admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return;
    const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
    this.assertTenantSubscriptionWritable(tenant, admin);
    if (!this.tenantPermissions(tenant).paymentAccountEditable) throw new ForbiddenException("平台超级管理员已关闭本商家的收款配置权限");
  }

  private async canEditTenantPaymentSettings(admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return true;
    const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
    this.assertTenantSubscriptionWritable(tenant, admin);
    return this.tenantPermissions(tenant).paymentAccountEditable;
  }

  private assertTenantSubscriptionWritable(tenant?: Tenant | null, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return;
    if (!tenant || !tenant.enabled) throw new NotFoundException("当前商家不存在或已停用");
    const restriction = tenantSubscriptionWriteRestriction(this.tenantPermissions(tenant));
    if (restriction) throw new ForbiddenException(restriction.message);
  }

  private publicAnnouncement(row: Announcement) {
    return {
      id: row.id,
      tenant: row.tenant ? { id: row.tenant.id, code: row.tenant.code, name: row.tenant.name, enabled: row.tenant.enabled } : null,
      title: row.title,
      content: row.content,
      type: row.type,
      enabled: row.enabled,
      pinned: row.pinned,
      publishAt: row.publishAt,
      endAt: row.endAt,
      audience: normalizeContentAudience(row.audience),
      viewCount: row.viewCount,
      clickCount: row.clickCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private announcementAuditSnapshot(row: Announcement) {
    return {
      tenantId: row.tenant?.id || null,
      title: row.title,
      contentLength: row.content.length,
      contentHash: createHash("sha256").update(row.content).digest("hex"),
      type: row.type,
      enabled: row.enabled,
      pinned: row.pinned,
      publishAt: row.publishAt,
      endAt: row.endAt,
      audience: normalizeContentAudience(row.audience)
    };
  }

  private publicMarketingPopupAdmin(row: MarketingPopup) {
    return {
      id: row.id,
      tenant: row.tenant ? { id: row.tenant.id, code: row.tenant.code, name: row.tenant.name, enabled: row.tenant.enabled } : null,
      title: row.title,
      subtitle: row.subtitle,
      content: row.content,
      emphasis: row.emphasis,
      imageUrl: row.imageUrl,
      type: row.type,
      platforms: row.platforms || ["all"],
      placements: row.placements || ["home"],
      audience: normalizeContentAudience(row.audience),
      buttons: row.buttons || [],
      frequency: row.frequency,
      priority: row.priority,
      enabled: row.enabled,
      dismissible: row.dismissible,
      startAt: row.startAt,
      endAt: row.endAt,
      impressionCount: row.impressionCount,
      clickCount: row.clickCount,
      closeCount: row.closeCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private marketingPopupAuditSnapshot(row: MarketingPopup) {
    const content = String(row.content || "");
    return {
      tenantId: row.tenant?.id || null,
      title: row.title,
      subtitleLength: String(row.subtitle || "").length,
      contentLength: content.length,
      contentHash: createHash("sha256").update(content).digest("hex"),
      emphasisLength: String(row.emphasis || "").length,
      imageUrl: row.imageUrl,
      type: row.type,
      platforms: row.platforms || ["all"],
      placements: row.placements || ["home"],
      audience: normalizeContentAudience(row.audience),
      buttons: row.buttons || [],
      frequency: row.frequency,
      priority: row.priority,
      enabled: row.enabled,
      dismissible: row.dismissible,
      startAt: row.startAt,
      endAt: row.endAt
    };
  }

  private hasAdPermission(admin: AdminContext | undefined, permission: "ad_center.sensitive" | "ad_center.manage" | "ad_center.finance" | "ad_center.export") {
    return effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions }).includes(permission);
  }

  private publicAdTenant(tenant?: Tenant | null) {
    return tenant ? { id: tenant.id, code: tenant.code, name: tenant.name, enabled: tenant.enabled } : null;
  }

  private publicAdAdvertiser(row: AdAdvertiser, includeSensitive: boolean) {
    return {
      id: row.id,
      tenant: this.publicAdTenant(row.tenant),
      companyName: row.companyName,
      contactName: row.contactName,
      contactPhone: includeSensitive ? row.contactPhone : maskPhone(row.contactPhone),
      wechat: includeSensitive ? row.wechat : maskContactHandle(row.wechat),
      licenseUrl: includeSensitive ? row.licenseUrl : null,
      remark: includeSensitive ? row.remark : null,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicAdContract(row: AdContract, includeSensitive: boolean) {
    return {
      id: row.id,
      tenant: this.publicAdTenant(row.tenant),
      advertiser: row.advertiser ? { id: row.advertiser.id, companyName: row.advertiser.companyName, status: row.advertiser.status } : null,
      contractNo: row.contractNo,
      title: row.title,
      billingModel: row.billingModel,
      amount: row.amount,
      fixedFee: row.fixedFee,
      cpmPrice: row.cpmPrice,
      cpcPrice: row.cpcPrice,
      startAt: row.startAt,
      endAt: row.endAt,
      paymentStatus: row.paymentStatus,
      attachmentUrl: includeSensitive ? row.attachmentUrl : null,
      remark: includeSensitive ? row.remark : null,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicAdCampaign(row: AdCampaign) {
    return {
      id: row.id,
      tenant: this.publicAdTenant(row.tenant),
      advertiser: row.advertiser ? { id: row.advertiser.id, companyName: row.advertiser.companyName, status: row.advertiser.status } : null,
      contract: row.contract ? { id: row.contract.id, contractNo: row.contract.contractNo, title: row.contract.title, status: row.contract.status, billingModel: row.contract.billingModel } : null,
      name: row.name,
      title: row.title,
      subtitle: row.subtitle,
      imageUrl: row.imageUrl,
      imageUrls: row.imageUrls || [],
      source: row.source,
      format: row.format,
      slotKey: row.slotKey,
      pageKey: row.pageKey,
      platforms: row.platforms || ["all"],
      audience: normalizeContentAudience(row.audience),
      link: row.link,
      billingModel: row.billingModel,
      fixedFee: row.fixedFee,
      cpmPrice: row.cpmPrice,
      cpcPrice: row.cpcPrice,
      totalBudget: row.totalBudget,
      dailyBudget: row.dailyBudget,
      impressionLimit: row.impressionLimit,
      clickLimit: row.clickLimit,
      officialAdUnitId: row.officialAdUnitId,
      officialAdType: row.officialAdType,
      frequency: row.frequency,
      priority: row.priority,
      enabled: row.enabled,
      startAt: row.startAt,
      endAt: row.endAt,
      impressionCount: row.impressionCount,
      clickCount: row.clickCount,
      skipCount: row.skipCount,
      closeCount: row.closeCount,
      loadCount: row.loadCount,
      errorCount: row.errorCount,
      rewardCount: row.rewardCount,
      spentAmount: row.spentAmount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicAdSettlement(row: AdSettlement, items: AdSettlementItem[]) {
    return {
      id: row.id,
      tenant: this.publicAdTenant(row.tenant),
      advertiser: row.advertiser ? { id: row.advertiser.id, companyName: row.advertiser.companyName } : null,
      contract: row.contract ? { id: row.contract.id, contractNo: row.contract.contractNo, title: row.contract.title, billingModel: row.contract.billingModel } : null,
      settlementNo: row.settlementNo,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      billingModel: row.billingModel,
      amount: row.amount,
      status: row.status,
      remark: row.remark,
      items: items.map((item) => ({ id: item.id, campaign: item.campaign ? { id: item.campaign.id, name: item.campaign.name } : null, description: item.description, billingModel: item.billingModel, quantity: item.quantity, unitPrice: item.unitPrice, amount: item.amount, createdAt: item.createdAt })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private publicAdOfficialRevenue(row: AdOfficialRevenueImport, includeSensitive: boolean) {
    return {
      id: row.id,
      tenant: this.publicAdTenant(row.tenant),
      importDate: row.importDate,
      revenueAmount: row.revenueAmount,
      impressionCount: row.impressionCount,
      clickCount: row.clickCount,
      ecpm: row.ecpm,
      fileUrl: includeSensitive ? row.fileUrl : null,
      remark: includeSensitive ? row.remark : null,
      createdAt: row.createdAt
    };
  }

  private adAdvertiserAuditSnapshot(row: AdAdvertiser) {
    return { tenantId: row.tenant?.id || null, companyName: row.companyName, contactName: row.contactName, contactPhone: maskPhone(row.contactPhone), wechat: maskContactHandle(row.wechat), hasLicense: Boolean(row.licenseUrl), remarkLength: String(row.remark || "").length, status: row.status };
  }

  private adContractAuditSnapshot(row: AdContract) {
    return { tenantId: row.tenant?.id || null, advertiserId: row.advertiser?.id || null, contractNo: row.contractNo, title: row.title, billingModel: row.billingModel, amount: row.amount, fixedFee: row.fixedFee, cpmPrice: row.cpmPrice, cpcPrice: row.cpcPrice, startAt: row.startAt, endAt: row.endAt, paymentStatus: row.paymentStatus, hasAttachment: Boolean(row.attachmentUrl), remarkLength: String(row.remark || "").length, status: row.status };
  }

  private adCampaignAuditSnapshot(row: AdCampaign) {
    return { tenantId: row.tenant?.id || null, advertiserId: row.advertiser?.id || null, contractId: row.contract?.id || null, name: row.name, title: row.title, source: row.source, format: row.format, slotKey: row.slotKey, pageKey: row.pageKey, platforms: row.platforms || ["all"], audience: normalizeContentAudience(row.audience), billingModel: row.billingModel, totalBudget: row.totalBudget, dailyBudget: row.dailyBudget, enabled: row.enabled, startAt: row.startAt, endAt: row.endAt };
  }

  private async normalizeAnnouncementAudience(value: unknown, tenant: Tenant | null, repository: Repository<MemberLevel> = this.memberLevels) {
    const audience = normalizeContentAudience(value);
    if (audience.mode !== "member_levels") return { ...audience, memberLevelIds: [] };
    const ids = audience.memberLevelIds || [];
    if (!ids.length) throw new BadRequestException("指定会员等级受众时至少选择一个启用等级");
    const levels = await repository.find({ where: { id: In(ids), enabled: true, tenantScopeKey: memberLevelScopeKey(tenant) } });
    if (levels.length !== ids.length) throw new BadRequestException("公告受众包含不存在、已停用或不属于当前商家的会员等级");
    return audience;
  }

  private async resolveAnnouncementTenant(tenantId: number | null | undefined, fallback: Tenant | null | undefined, admin?: AdminContext, repository: Repository<Tenant> = this.tenants) {
    if (this.isTenantScoped(admin)) {
      const tenant = await repository.findOneBy({ id: admin?.tenantId || 0 });
      if (!tenant || !tenant.enabled) throw new NotFoundException("当前商家不存在或已停用");
      return tenant;
    }
    if (tenantId === null) return null;
    const id = Number(tenantId || fallback?.id || 0);
    if (!id) return null;
    const tenant = await repository.findOneBy({ id });
    if (!tenant || !tenant.enabled) throw new NotFoundException("公告所属商家不存在或已停用");
    return tenant;
  }

  private operationActorForTenant(admin?: AdminContext, tenant?: Tenant | null) {
    if (admin?.tenantId || !tenant?.id) return admin;
    return { ...admin, tenantId: tenant.id };
  }

  private tenantRelation(admin?: AdminContext, fallback?: Tenant | null) {
    return tenantRelationForActor<Tenant>(admin, fallback);
  }

  private async walletTenantForAdmin(admin?: AdminContext, requestedTenantId?: number | null) {
    if (!this.isTenantScoped(admin)) {
      return requestedTenantId ? this.resolveWalletTenantForPlatform(requestedTenantId) : null;
    }
    if (requestedTenantId && requestedTenantId !== admin?.tenantId) throw new ForbiddenException("不能查看其他商家的会员钱包");
    const tenant = await this.tenants.findOneBy({ id: admin?.tenantId || 0 });
    if (!tenant || !tenant.enabled) throw new NotFoundException("当前商家不存在或已停用");
    return tenant;
  }

  private async resolveWalletTenantForPlatform(tenantId?: number | null) {
    const id = Number(tenantId || 0);
    if (!id) return null;
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant || !tenant.enabled) throw new NotFoundException("钱包所属商家不存在或已停用");
    return tenant;
  }

  private walletTenantScopeKey(tenant?: Tenant | null) {
    return tenant?.id ? String(tenant.id) : "platform";
  }

  private applyTenantScope(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, admin?: AdminContext) {
    applyTenantScopeToQuery(builder, alias, admin);
    applyAdminActivityDataScope(builder, alias, admin?.dataScope);
  }

  private applyExplicitTenantFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, tenant?: Tenant | null) {
    if (tenant?.id) builder.andWhere(`${alias}.tenantId = :explicitTenantId`, { explicitTenantId: tenant.id });
    else builder.andWhere(`${alias}.tenantId IS NULL`);
  }

  private assertTenantAccess(row: { tenant?: Tenant | null } | null | undefined, admin?: AdminContext) {
    assertTenantAccessForActor(row, admin, "Resource not found or not in current tenant");
    const activityId = activityIdFromScopedRow(row);
    if (activityId && !adminCanAccessActivity(admin?.dataScope, activityId)) throw new NotFoundException("Resource not found or outside current data scope");
  }

  private assertStrictTenantOwnership(row: { tenant?: Tenant | null } | null | undefined, admin: AdminContext | undefined, message: string) {
    if (!row || !this.isTenantScoped(admin)) return;
    if (row.tenant?.id !== admin?.tenantId) throw new NotFoundException(message);
  }

  private async assertRedemptionTarget(targetType: string, targetId: number | null, tenant: Tenant | null) {
    if (targetType === "points") return;
    if (!targetId) throw new BadRequestException("请选择兑换目标");
    const tenantId = tenant?.id || null;
    if (targetType === "activity_coupon") {
      const coupon = await this.coupons.findOne({ where: { id: targetId } });
      if (!coupon || (coupon.tenant?.id || null) !== tenantId) throw new BadRequestException("兑换目标活动券不存在或不属于当前商家");
      return;
    }
    if (targetType === "mall_coupon") {
      const coupon = await this.dataSource.getRepository(MallCoupon).findOne({ where: { id: targetId } });
      if (!coupon || coupon.tenant.id !== tenantId) throw new BadRequestException("兑换目标商城券不存在或不属于当前商家");
      return;
    }
    if (targetType === "course_access") {
      const course = await this.courses.findOne({ where: { id: targetId } });
      if (!course || (course.tenant?.id || null) !== tenantId) throw new BadRequestException("兑换目标课程不存在或不属于当前商家");
    }
  }

  private async assertUserTenantAccess(userId: number, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) return;
    const tenantId = Number(admin?.tenantId || 0);
    const [registrationCount, profileCount] = await Promise.all([
      this.registrations
        .createQueryBuilder("registration")
        .leftJoin("registration.activity", "activity")
        .where("registration.userId = :userId", { userId })
        .andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId })
        .getCount(),
      this.memberProfiles.count({ where: { user: { id: userId }, tenantScopeKey: `tenant:${tenantId}` } })
    ]);
    if (!registrationCount && !profileCount) throw new NotFoundException("User not found or not in current tenant");
  }

  private assertAdminSecurityPermission(admin?: AdminContext) {
    const permissions = effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions });
    if (permissions.includes("admin.security.manage")) return;
    throw new ForbiddenException("当前账号无后台账号安全操作权限");
  }

  private async resolveAssignedAdminDataScope(value: unknown, tenant?: Tenant | null) {
    const dataScope = normalizeAdminDataScope(value);
    if (dataScope.type !== "activity_ids") return dataScope;
    const activityIds = Array.from(new Set(dataScope.activityIds || []));
    if (!tenant) throw new BadRequestException("平台账号不能设置商家活动数据范围");
    if (!activityIds.length) return { type: "activity_ids", activityIds: [] } as const;
    const count = await this.activities.createQueryBuilder("activity").where("activity.tenantId = :tenantId", { tenantId: tenant.id }).andWhere("activity.id IN (:...activityIds)", { activityIds }).getCount();
    if (count !== activityIds.length) throw new BadRequestException("活动数据范围包含其他商家或不存在的活动");
    return { type: "activity_ids", activityIds } as const;
  }

  private async userIdsForActivity(activityId: number, admin?: AdminContext) {
    const builder = this.registrations
      .createQueryBuilder("registration")
      .innerJoin("registration.user", "user")
      .leftJoin("registration.activity", "activity")
      .select("user.id", "id")
      .where("activity.id = :activityId", { activityId })
      .groupBy("user.id")
      .orderBy("MAX(registration.createdAt)", "DESC");
    this.applyTenantScope(builder, "registration", admin);
    const rows = await builder.getRawMany<{ id: number }>();
    return rows.map((row) => Number(row.id)).filter(Boolean);
  }

  private async usersForTenant(admin?: AdminContext, keyword?: string, take = 300) {
    if (!this.isTenantScoped(admin)) return this.users.find({ take });
    const builder = this.registrations
      .createQueryBuilder("registration")
      .innerJoin("registration.user", "user")
      .leftJoin("registration.activity", "activity")
      .select("user.id", "id")
      .where("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: admin?.tenantId })
      .groupBy("user.id")
      .orderBy("MAX(registration.createdAt)", "DESC")
      .limit(take);
    if (keyword?.trim()) builder.andWhere("(user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${keyword.trim()}%` });
    const rows = await builder.getRawMany<{ id: number }>();
    const ids = rows.map((row) => Number(row.id)).filter(Boolean);
    return ids.length ? this.users.find({ where: { id: In(ids) } }) : [];
  }

  private visibleRegistrationsForUser(userId: number, admin?: AdminContext) {
    const builder = this.registrations
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("activity.tenant", "activityTenant")
      .leftJoinAndSelect("registration.tenant", "tenant")
      .leftJoinAndSelect("registration.user", "user")
      .where("user.id = :userId", { userId })
      .orderBy("registration.createdAt", "DESC")
      .take(50);
    if (this.isTenantScoped(admin)) builder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  private visibleOrdersForUser(userId: number, admin?: AdminContext) {
    const builder = this.orders
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("order.tenant", "tenant")
      .leftJoinAndSelect("order.agent", "agent")
      .leftJoinAndSelect("order.ticketType", "ticketType")
      .leftJoinAndSelect("order.coupon", "coupon")
      .leftJoinAndSelect("order.memberLevel", "memberLevel")
      .where("user.id = :userId", { userId })
      .orderBy("order.createdAt", "DESC")
      .take(50);
    if (this.isTenantScoped(admin)) builder.andWhere("(order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  private visibleCheckInsForUser(userId: number, admin?: AdminContext) {
    const builder = this.checkIns
      .createQueryBuilder("checkIn")
      .leftJoinAndSelect("checkIn.registration", "registration")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("checkIn.operator", "operator")
      .where("user.id = :userId", { userId })
      .orderBy("checkIn.createdAt", "DESC")
      .take(50);
    if (this.isTenantScoped(admin)) builder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  private visibleReviewsForUser(userId: number, admin?: AdminContext) {
    const builder = this.activityReviews
      .createQueryBuilder("review")
      .leftJoinAndSelect("review.user", "user")
      .leftJoinAndSelect("review.activity", "activity")
      .leftJoinAndSelect("review.registration", "registration")
      .where("user.id = :userId", { userId })
      .orderBy("review.createdAt", "DESC")
      .take(50);
    if (this.isTenantScoped(admin)) builder.andWhere("(activity.tenantId = :tenantId OR registration.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  private visibleRefundsForUser(userId: number, admin?: AdminContext) {
    const builder = this.refunds
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.user", "user")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("refund.tenant", "tenant")
      .where("user.id = :userId", { userId })
      .orderBy("refund.createdAt", "DESC")
      .take(50);
    if (this.isTenantScoped(admin)) builder.andWhere("(refund.tenantId = :tenantId OR order.tenantId = :tenantId OR registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: admin?.tenantId });
    return builder.getMany();
  }

  private visibleWalletTransactionsForUser(userId: number, admin?: AdminContext) {
    const builder = this.walletTransactions
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.user", "user")
      .leftJoinAndSelect("transaction.tenant", "tenant")
      .leftJoinAndSelect("transaction.order", "order")
      .where("user.id = :userId", { userId })
      .orderBy("transaction.createdAt", "DESC")
      .take(50);
    this.applyTenantScope(builder, "transaction", admin);
    return builder.getMany();
  }

  private visiblePointLogsForUser(userId: number, tenantScopeKey: string) {
    return this.memberPointLogs.find({
      where: { user: { id: userId }, tenantScopeKey },
      relations: ["relatedLog"],
      order: { createdAt: "DESC" },
      take: 100
    });
  }

  private memberTimeline(input: { user: User; registrations: Registration[]; orders: Order[]; checkIns: CheckIn[]; reviews: ActivityReview[]; points: MemberPointLog[]; refunds: Refund[]; walletTransactions: WalletTransaction[] }) {
    const rows: Array<{ type: string; title: string; description: string; amount?: string | null; time: Date | null; status?: string | null }> = [];
    rows.push({ type: "login", title: "最近登录", description: `${input.user.lastLoginChannel || input.user.sourceChannel || "未知端"} 登录`, time: input.user.lastLoginAt || input.user.updatedAt || null });
    for (const registration of input.registrations) rows.push({ type: "registration", title: "报名", description: registration.activity?.title || `报名 ${registration.id}`, time: registration.createdAt, status: registration.status });
    for (const order of input.orders) rows.push({ type: "order_payment", title: "订单", description: order.orderNo, amount: order.amount, time: order.paidAt || order.createdAt, status: order.status });
    for (const checkIn of input.checkIns) rows.push({ type: "check_in", title: "核销", description: checkIn.registration?.activity?.title || `核销 ${checkIn.id}`, time: checkIn.createdAt, status: "checked_in" });
    for (const refund of input.refunds) rows.push({ type: "refund", title: "退款", description: refund.refundNo, amount: refund.amount, time: refund.completedAt || refund.reviewedAt || refund.createdAt, status: refund.status });
    for (const point of input.points) rows.push({ type: "points", title: "积分变动", description: point.remark || point.sourceType, amount: String(point.points), time: point.createdAt, status: point.sourceType });
    for (const transaction of input.walletTransactions) rows.push({ type: "wallet", title: "余额变动", description: transaction.remark || transaction.type, amount: transaction.amount, time: transaction.createdAt, status: transaction.direction });
    for (const review of input.reviews) rows.push({ type: "review", title: "评价", description: review.activity?.title || `评价 ${review.id}`, time: review.createdAt, status: "reviewed" });
    return rows
      .filter((row) => row.time)
      .sort((a, b) => new Date(b.time as Date).getTime() - new Date(a.time as Date).getTime())
      .slice(0, 120);
  }

  private assertOperationPaymentSettingPayload(dto: OperationSettingDto): asserts dto is OperationSettingDto & { offlinePaymentInstructions: string; refundInstructions: string } {
    if (!dto.offlinePaymentInstructions?.trim()) throw new BadRequestException("请填写线下付款说明");
    if (!dto.refundInstructions?.trim()) throw new BadRequestException("请填写退款说明");
  }

  private async operationSettingTarget(admin?: AdminContext, requestedTenantId?: number | string | null) {
    const parsedTenantId = requestedTenantId === undefined || requestedTenantId === null || requestedTenantId === "" ? 0 : Number(requestedTenantId);
    if (!Number.isInteger(parsedTenantId) || parsedTenantId < 0) throw new BadRequestException("商家参数无效");
    if (this.isTenantScoped(admin)) {
      const tenantId = Number(admin?.tenantId || 0);
      if (parsedTenantId && parsedTenantId !== tenantId) throw new ForbiddenException("不能修改其他商家的运营设置");
      const tenant = await this.currentTenantForAdmin(admin);
      return { id: tenant.id, tenant };
    }
    if (!parsedTenantId) return { id: 1, tenant: null as Tenant | null };
    const tenant = await this.tenants.findOneBy({ id: parsedTenantId });
    if (!tenant || !tenant.enabled) throw new NotFoundException("商家不存在或已停用");
    return { id: tenant.id, tenant };
  }

  private async ensureOperationSettingForTarget(admin: AdminContext | undefined, scope: { id: number; tenant: Tenant | null }) {
    let setting = await this.operationSettings.findOne({ where: { id: scope.id } });
    if (setting) return setting;
    setting = this.createOperationSetting(admin, scope.tenant, scope.id);
    return this.operationSettings.save(setting);
  }

  private createOperationSetting(admin?: AdminContext, tenant?: Tenant | null, targetId?: number) {
    const id = targetId || (this.isTenantScoped(admin) ? admin?.tenantId || 1 : 1);
    return this.operationSettings.create({
      id,
      tenant: tenant || this.tenantRelation(admin),
      registrationEnabled: true,
      publicActivityArchiveEnabled: false,
      tenantSwitcherEnabled: true,
      registrationDisabledMessage: "报名通道暂时关闭，请稍后再试或联系主办方",
      offlinePaymentInstructions: "请在付款截止前完成线下转账或现场付款，并在备注中填写报名手机号。主办方确认收款后，报名状态会自动更新",
      paymentMethods: this.defaultPaymentMethods(),
      customerServiceName: "活动运营客服",
      customerServicePhone: "13800000000",
      customerServiceWechat: "activity_service",
      defaultGroupQrCodeUrl: null,
      pageTheme: {},
      launchConfig: {},
      defaultTenantCode: null,
      refundInstructions: "如需取消报名或申请退款，请先联系主办方客服。已签到或活动开始后的退款规则以活动报名须知为准",
      invoiceInstructions: "如需发票，请在付款后联系客服登记抬头、税号和接收邮箱",
      userAgreementUrl: null,
      privacyPolicyUrl: null,
      merchantAgreementUrl: null,
      smsProviderEnabled: false,
      smsProvider: "luosimao-sms",
      smsAccessKeyId: null,
      smsAccessKeySecret: null,
      smsSignName: null,
      smsTemplateId: null,
      smsSdkAppId: null,
      automaticSms: normalizeAutomaticSmsSettings(null),
      automaticWechat: normalizeAutomaticWechatSettings(null),
      postEventAutomation: normalizePostEventAutomationSettings(null)
    });
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  private normalizeOptionalHttpsUrl(value: unknown, label: string) {
    const text = String(value || "").trim();
    if (!text) return null;
    let url: URL;
    try { url = new URL(text); } catch { throw new BadRequestException(`${label}格式无效`); }
    if (!["https:", "http:"].includes(url.protocol)) throw new BadRequestException(`${label}必须使用 HTTP 或 HTTPS`);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new BadRequestException(`${label}在生产环境必须使用 HTTPS`);
    return url.toString();
  }

  private publicOperationSettingForAdmin(setting: OperationSetting, tenant?: Tenant | null) {
    return {
      ...setting,
      settingScope: tenant ? { type: "tenant", tenantId: tenant.id, tenantCode: tenant.code, tenantName: tenant.name } : { type: "platform", tenantId: null, tenantCode: null, tenantName: "平台默认" },
      launchConfig: maskLaunchConfigSecrets(setting.launchConfig),
      automaticSms: normalizeAutomaticSmsSettings(setting.automaticSms),
      automaticWechat: normalizeAutomaticWechatSettings(setting.automaticWechat),
      postEventAutomation: normalizePostEventAutomationSettings(setting.postEventAutomation),
      smsAccessKeySecret: maskedStoredSecret(setting.smsAccessKeySecret),
      smsAccessKeySecretConfigured: Boolean(setting.smsAccessKeySecret)
    };
  }

  private subscriptionActionLabel(action: TenantSubscriptionChangeDto["action"]) {
    return ({ renew: "续费", upgrade: "升级", downgrade: "降级", extend: "延期", suspend: "暂停", restore: "恢复" } as const)[action];
  }

  private assertActivityAccess(activity: Activity | null | undefined, admin?: AdminContext) {
    this.assertTenantAccess(activity, admin);
    if (activity && !adminCanAccessActivity(admin?.dataScope, activity.id)) throw new NotFoundException("Activity not found or outside current data scope");
  }

  private assertAdminInvitationAccess(row: AdminInvite, admin?: AdminContext) {
    if (!this.isTenantScoped(admin)) {
      this.assertPlatformAdmin(admin);
      return;
    }
    if (row.tenant?.id !== admin?.tenantId) throw new NotFoundException("管理员邀请不存在或不属于当前商家");
  }

  private adminInvitationTokenHash(token: string) {
    const value = String(token || "").trim();
    if (value.length < 20) throw new BadRequestException("邀请令牌格式不正确");
    return createHash("sha256").update(value).digest("hex");
  }

  private publicAdminInvitation(row: AdminInvite) {
    return { id: row.id, username: row.username, role: normalizeAdminRole(row.role), permissions: row.permissions || [], dataScope: normalizeAdminDataScope(row.dataScope), tenant: row.tenant ? { id: row.tenant.id, code: row.tenant.code, name: row.tenant.name } : null, invitedBy: row.invitedBy ? { id: row.invitedBy.id, username: row.invitedBy.username } : null, acceptedAdmin: row.acceptedAdmin ? { id: row.acceptedAdmin.id, username: row.acceptedAdmin.username } : null, status: row.status, expiresAt: row.expiresAt, acceptedAt: row.acceptedAt, revokedAt: row.revokedAt, createdAt: row.createdAt };
  }

  private tenantEntitlementSettings(tenant: Tenant) {
    return this.isPlainObject(tenant.settings) ? tenant.settings : {};
  }

  private assertTenantSubscriptionActive(tenant: Tenant) {
    if (!tenant.enabled) throw new NotFoundException("当前商家不存在或已停用");
    const restriction = tenantSubscriptionWriteRestriction(this.tenantEntitlementSettings(tenant));
    if (restriction) throw new ForbiddenException(restriction.message);
  }

  private assertTenantFeature(tenant: Tenant, feature: TenantEntitlementFeature) {
    this.assertTenantSubscriptionActive(tenant);
    const access = tenantFeatureAccess(this.tenantEntitlementSettings(tenant), feature);
    if (!access.allowed) throw new ForbiddenException(access.reason || "当前套餐未开通此功能");
  }

  private async assertCurrentTenantFeatureWritable(admin: AdminContext | undefined, feature: TenantEntitlementFeature) {
    if (!admin?.tenantId) return;
    const tenant = await this.tenants.findOneBy({ id: admin.tenantId });
    if (!tenant) throw new NotFoundException("当前商家不存在或已停用");
    this.assertTenantFeature(tenant, feature);
    this.assertTenantSubscriptionActive(tenant);
  }

  private async assertTenantQuota(tenant: Tenant, quota: TenantQuotaKey, used: number, requested = 1) {
    const access = tenantQuotaAccess(this.tenantEntitlementSettings(tenant), quota, used, requested);
    if (!access.allowed) throw new ForbiddenException(`${access.reason}，请升级套餐或调整配额后继续`);
  }

  private async normalizeDefaultTenantCode(value: unknown) {
    const code = String(value || "").trim();
    if (!code) return null;
    const tenant = await this.tenants
      .createQueryBuilder("tenant")
      .where("tenant.code = :code", { code })
      .andWhere("tenant.enabled = :enabled", { enabled: true })
      .andWhere("tenant.code <> :platformCode", { platformCode: "platform" })
      .andWhere("tenant.code NOT LIKE :demoCode", { demoCode: "demo-%" })
      .andWhere("(tenant.region IS NOT NULL OR tenant.contactName IS NOT NULL OR tenant.contactPhone IS NOT NULL)")
      .getOne();
    if (!tenant) throw new BadRequestException("默认入口城市必须选择一个已启用且可展示的商家");
    return tenant.code;
  }

  private defaultPaymentMethods() {
    return { free: true, wechat: false, alipay: false, balance: true, offline: true };
  }

  private normalizePaymentMethods(value: unknown) {
    const input = this.isPlainObject(value) ? value : {};
    const defaults = this.defaultPaymentMethods();
    return {
      free: input.free === undefined ? defaults.free : Boolean(input.free),
      wechat: input.wechat === undefined ? defaults.wechat : Boolean(input.wechat),
      alipay: input.alipay === undefined ? defaults.alipay : Boolean(input.alipay),
      balance: input.balance === undefined ? defaults.balance : Boolean(input.balance),
      offline: input.offline === undefined ? defaults.offline : Boolean(input.offline)
    };
  }

  private async ensureDevSeed() {
    await this.ensureMemberLevelSeeds();
    await this.ensureHomepageSeeds();
    if (this.config.get<string>("NODE_ENV", process.env.NODE_ENV || "development") === "production") return;
    const names = ["沙龙", "读书", "共创"];
    const categoryMap = new Map<string, ActivityCategory>();
    for (const [index, name] of names.entries()) {
      let category = await this.categories.findOne({ where: { name } });
      if (!category) category = await this.categories.save(this.categories.create({ name, sortOrder: index + 1, enabled: true }));
      categoryMap.set(name, category);
    }
    if (await this.activities.findOne({ where: { title: "Weekend Reading: Courage" } })) return;
    const now = Date.now();
    await this.createSeedActivity({ title: "Weekend Reading: Courage", category: categoryMap.values().next().value!, price: 0, featured: true, requireReview: true, startTime: new Date(now + 7 * 86400000), endTime: new Date(now + 7 * 86400000 + 2 * 3600000), deadline: new Date(now + 6 * 86400000), location: "City Bookroom 2F", description: "A focused weekend reading session about courage and relationships.", notice: "Please read the first two chapters before joining." });
    await this.createSeedActivity({ title: "Offline Creator Salon", category: categoryMap.values().next().value!, price: 99, featured: true, requireReview: false, startTime: new Date(now + 10 * 86400000), endTime: new Date(now + 10 * 86400000 + 3 * 3600000), deadline: new Date(now + 9 * 86400000), location: "Co-creation Space A", description: "A practical salon for activity planning and operation.", notice: "Complete offline payment after registration; admin confirmation will approve the registration." });
  }

  private async createSeedActivity(input: { title: string; category: ActivityCategory; price: number; featured: boolean; requireReview: boolean; startTime: Date; endTime: Date; deadline: Date; location: string; description: string; notice: string }) {
    const activity = await this.activities.save(this.activities.create({ title: input.title, category: input.category, coverUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80", description: input.description, notice: input.notice, location: input.location, startTime: input.startTime, endTime: input.endTime, registrationDeadline: input.deadline, capacity: 30, price: input.price.toFixed(2), status: ActivityStatus.Open, featured: input.featured, requireReview: input.requireReview, allowCancel: true }));
    await this.fields.save([
      this.fields.create({ activity, label: "姓名", type: FieldType.Text, required: true, sortOrder: 1 }),
      this.fields.create({ activity, label: "手机", type: FieldType.Phone, required: true, sortOrder: 2 }),
      this.fields.create({ activity, label: "职业/行业", type: FieldType.Text, required: false, sortOrder: 3 }),
      this.fields.create({ activity, label: "备注", type: FieldType.Remark, required: false, sortOrder: 4 })
    ]);
  }

  private async ensureMemberLevelSeeds() {
    if ((await this.memberLevels.count()) > 0) return;
    await this.memberLevels.save([
      this.memberLevels.create({ name: "普通会", minPoints: 0, discountRate: "1.00", priorityBooking: false, enabled: true, sortOrder: 1 }),
      this.memberLevels.create({ name: "VIP 会员", minPoints: 300, discountRate: "0.95", priorityBooking: true, enabled: true, sortOrder: 2 }),
      this.memberLevels.create({ name: "年卡会员", minPoints: 1000, discountRate: "0.90", priorityBooking: true, enabled: true, sortOrder: 3 })
    ]);
  }

  private async ensureHomepageSeeds() {
    if ((await this.homepageSections.count()) > 0) return;
    await this.createDefaultHomepageSections();
  }

  private createDefaultHomepageSections(admin?: AdminContext, targetTenant?: Tenant | null, pageKey = "home") {
    const normalizedPageKey = normalizePageKey(pageKey);
    return this.homepageSections.save(defaultHomepageSections(normalizedPageKey).map((item) => this.homepageSections.create({ ...item, pageKey: normalizedPageKey, tenant: targetTenant === undefined ? this.tenantRelation(admin) : targetTenant })));
  }

  private async nextHomepageSortOrder(admin?: AdminContext, targetTenant?: Tenant | null, pageKey = "home") {
    const builder = this.homepageSections.createQueryBuilder("section").select("COALESCE(MAX(section.sortOrder), 0)", "max");
    if (targetTenant !== undefined) {
      if (targetTenant) builder.andWhere("section.tenantId = :tenantId", { tenantId: targetTenant.id });
      else builder.andWhere("section.tenantId IS NULL");
    } else {
      this.applyTenantScope(builder, "section", admin);
    }
    builder.andWhere("section.pageKey = :pageKey", { pageKey: normalizePageKey(pageKey) });
    const row = await builder.getRawOne<{ max: string }>();
    return Number(row?.max || 0) + 10;
  }

  private normalizeHomepageType(type?: string) {
    const value = String(type || "").trim();
    if (!value) throw new BadRequestException("首页模块类型不能为空");
    if (!HOMEPAGE_SECTION_TYPES.includes(value as any)) throw new BadRequestException("不支持的首页模块类型");
    return value;
  }

  private async ensureAmbassadorProfileFromApplication(application: AmbassadorApplication, admin?: AdminContext) {
    let profile = await this.ambassadorProfiles.findOne({ where: { application: { id: application.id } } });
    if (profile) return profile;
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime());
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
    const operator = admin?.id ? await this.admins.findOne({ where: { id: admin.id } }) : null;
    profile = await this.ambassadorProfiles.save(this.ambassadorProfiles.create({
      profileNo: nextEcosystemNo("AMB"), application, user: null, activatedBy: operator, name: application.name, phoneMasked: maskPhone(application.phone), phoneLookupHash: ecosystemPhoneHash(application.phone), city: application.city,
      regionScope: { provinces: application.province ? [application.province] : [], cities: [application.city], districts: application.district ? [application.district] : [] }, status: "active", level: "starter", contributionPoints: 0,
      startsAt, expiresAt, lastContributionAt: null, suspendedAt: null, statusReason: null
    }));
    await this.logOperation(admin, "ambassador.profile.activate", "ambassador_profile", profile.id, `激活大使身份：${profile.name}`, { applicationId: application.id, expiresAt: profile.expiresAt, city: profile.city });
    return profile;
  }

  private normalizeRegionScope(value?: { provinces?: string[]; cities?: string[]; districts?: string[] } | null) {
    const clean = (rows?: string[]) => [...new Set((Array.isArray(rows) ? rows : []).map((item) => this.cleanText(item, 80)).filter(Boolean))].slice(0, 100);
    return { provinces: clean(value?.provinces), cities: clean(value?.cities), districts: clean(value?.districts) };
  }

  private partnerContractView(row: PartnerContract) {
    const status = row.status === "active" && row.endsAt.getTime() < Date.now() ? "expired" : row.status;
    return {
      id: row.id, contractNo: row.contractNo, application: row.application ? { id: row.application.id, name: row.application.name, organizationName: row.application.organizationName, city: row.application.city } : null,
      contractVersion: row.contractVersion, cooperationType: row.cooperationType, status, startsAt: row.startsAt, endsAt: row.endsAt, signedAt: row.signedAt,
      hasTerms: Boolean(row.termsEncrypted), hasDocumentReference: Boolean(row.documentReferenceEncrypted), createdBy: row.createdBy ? { id: row.createdBy.id, username: row.createdBy.username } : null,
      reviewedBy: row.reviewedBy ? { id: row.reviewedBy.id, username: row.reviewedBy.username } : null, reviewedAt: row.reviewedAt, terminatedAt: row.terminatedAt,
      hasReviewRemark: Boolean(row.reviewRemarkEncrypted), snapshot: row.snapshot, createdAt: row.createdAt, updatedAt: row.updatedAt
    };
  }

  private async assertPartnerApplication(id: number, admin?: AdminContext) {
    this.assertPlatformAdmin(admin);
    const row = await this.ambassadorApplications.findOneBy({ id });
    if (!row || row.kind !== "partner") throw new NotFoundException("合作伙伴线索不存在");
    return row;
  }

  private crmBusinessKey(value: unknown, label: string) {
    try { return ecosystemBusinessKey(value, label); } catch (error: any) { throw new BadRequestException(error.message); }
  }

  private async ensureAmbassadorSetting() {
    let setting = await this.ambassadorSettings.findOne({ where: {}, order: { id: "ASC" } });
    if (!setting) setting = await this.ambassadorSettings.save(this.ambassadorSettings.create({ enabled: true, config: this.defaultAmbassadorConfig() }));
    if (!this.isPlainObject(setting.config)) {
      setting.config = this.defaultAmbassadorConfig();
      setting = await this.ambassadorSettings.save(setting);
    }
    return setting;
  }

  private publicAmbassadorSetting(setting: AmbassadorLandingSetting) {
    return { ...setting, config: this.mergeAmbassadorConfig(setting.config, null) };
  }

  private mergeAmbassadorConfig(input?: Record<string, unknown> | null, current?: Record<string, unknown> | null) {
    const defaults = this.defaultAmbassadorConfig();
    const base = this.isPlainObject(current) ? current || {} : {};
    const next = this.isPlainObject(input) ? input || {} : {};
    const merged: Record<string, unknown> = { ...defaults, ...base, ...next };
    for (const key of ["painPoints", "solutionItems", "benefits", "requirements"]) merged[key] = this.normalizeStringArray(merged[key], defaults[key] as string[]);
    merged.faqs = this.normalizeFaqs(merged.faqs, defaults.faqs as Array<{ question: string; answer: string }>);
    merged.entryPages = this.normalizeEntryPages(merged.entryPages, defaults.entryPages as Record<string, Record<string, unknown>>);
    return merged;
  }

  private defaultAmbassadorConfig(): Record<string, unknown> {
    return {
      heroTitle: "寻找100位“慢π大使”",
      heroSubtitle: "一起用7把钥匙，打开中国人的精神家园",
      heroCopy: "不用辞职、不用囤货，只需把你的热爱变成活动服务，平台帮你梳理运营工具和本地触达。",
      ctaText: "立即申请，锁定早鸟名额",
      originalPrice: "2999",
      earlyBirdPrice: "999",
      quotaText: "首期限额100人，审核制入驻",
      refundText: "入驻30天内，觉得不合适，可申请全额退款。",
      customerWechat: "",
      customerPhone: "",
      backgroundImageUrl: "",
      painPoints: ["你在传统文化、书法、亲子沟通、健康、创业或技能领域有积累，却缺一个被看见的舞台。", "你试过做内容，但流量不稳定，转化不系统。", "你想把内容做成线下活动，却被技术、运营和服务流程卡住。", "你不想只做单次销售，更想进入一个共创、成长、长期沉淀品牌的圈子。"],
      solutionItems: ["独立小程序店铺 + 专属H5主页，一键发布活动。", "平台全域流量扶持，结合城市线下活动导流。", "每月闭门共创会，表达与服务训练，关键阶段策略陪跑。", "链接传统文化、书法、亲子沟通、健康、创业、技能等领域的共创者。"],
      benefits: ["官方认证身份：颁发“慢π·特聘文化大使”证书，并获得平台个人品牌展示机会。", "活动收益支持：首批入驻享平台扶持政策，具体规则以审核沟通为准。", "高端私密社群：进入慢π共创圈，资源互换、经验复盘。", "全年赋能陪跑：闭门策略会、线下分享会、活动打磨与运营指导。"],
      requirements: ["有真才实学：在传统文化、东方哲学、民俗文化、书法、亲子沟通、健康、创业、技能任一领域有扎实积累。", "有利他之心：愿意分享，愿意帮助他人成长。", "有长期主义：不是来赚快钱，而是想打造个人品牌、沉淀长期资产。"],
      faqs: [
        { question: "我没有活动经验，怎么办？", answer: "平台会协助你梳理活动大纲、设计表达结构，并陪跑第一场样板活动上线。" },
        { question: "入驻后多久能看到收益？", answer: "收益取决于活动质量、运营投入和受众匹配度，平台会提供流量、工具和运营建议。" },
        { question: "首期费用是一次性还是每年？", answer: "默认展示为首年首期费用，具体续费和权益可在后台文案中调整。" }
      ],
      entryPages: {
        brandStory: {
          eyebrow: "慢π · 品牌故事",
          title: "把传统文化，做成可体验、可参与、可持续运营的现代活动空间。",
          copy: "慢π连接活动、共修、公益与本地服务，让每一座城市都能拥有自己的文化空间。",
          primaryActionText: "申请成为院长",
          secondaryActionText: "了解帮扶计划",
          sectionTitle: "我们相信",
          items: ["文化要落到日常：不是只停留在口号里，而是变成一次晨读、一次分享、一次共修和一段长期陪伴。", "空间要能运营：活动获客、内容服务、报名收款、退款审核、参与者服务都应该有清晰后台承接。", "善意要可追踪：公益帮扶、参与者成长和本地资源连接，都需要被记录、被服务、被持续改进。"],
          flowTitle: "一套完整的慢π闭环",
          flowItems: ["品牌认知", "活动体验", "内容参与", "共修打卡", "公益帮扶", "本地慢π"],
          joinTitle: "你可以如何参与"
        },
        deanRecruit: {
          eyebrow: "院长招募",
          title: "招募一批真正愿意把慢π服务落在本地的人。",
          copy: "院长不是普通代理，而是本地活动空间的负责人：组织活动、服务参与者、链接主理人和公益资源。",
          sectionTitle: "适合谁",
          items: ["有本地文化空间或稳定社群", "愿意长期做好活动服务", "能服务参与者并维护当地口碑", "认同慢π品牌与公益理念"],
          formTitle: "提交院长申请",
          submitText: "提交院长申请",
          successMessage: "院长招募申请已进入后台，我们会尽快联系你。"
        },
        ambassadorApply: {
          eyebrow: "大使申请",
          title: "把你的热爱，变成能被更多人看见的文化服务。",
          copy: "适合讲师、主理人、内容创作者、社群组织者申请成为慢π大使。",
          sectionTitle: "你将参与",
          items: ["内容共创", "活动共办", "品牌露出", "参与者服务", "公益参与", "长期成长"],
          formTitle: "提交大使申请",
          submitText: "提交大使申请",
          successMessage: "大使申请已进入后台，我们会尽快联系你。"
        },
        aidApply: {
          eyebrow: "帮扶申请",
          title: "让需要帮助的人和愿意做事的项目，被看见、被连接、被持续服务。",
          copy: "个人可申请活动帮扶/公益名额，项目方可提交公益项目合作需求。",
          sectionTitle: "申请类型",
          items: ["个人活动帮扶", "公益项目合作", "活动名额支持", "本地资源连接"],
          formTitle: "提交帮扶申请",
          submitText: "提交帮扶申请",
          successMessage: "帮扶申请已进入后台，我们会尽快联系你核实信息。"
        }
      }
    };
  }

  private normalizeStringArray(value: unknown, fallback: string[]) {
    if (!Array.isArray(value)) return fallback;
    const list = value.map((item) => String(item || "").trim()).filter(Boolean);
    return list.length ? list.slice(0, 20) : fallback;
  }

  private normalizeFaqs(value: unknown, fallback: Array<{ question: string; answer: string }>) {
    if (!Array.isArray(value)) return fallback;
    const list = value
      .map((item) => {
        const row = this.isPlainObject(item) ? (item as Record<string, unknown>) : {};
        return { question: String(row.question || "").trim(), answer: String(row.answer || "").trim() };
      })
      .filter((item) => item.question && item.answer);
    return list.length ? list.slice(0, 20) : fallback;
  }

  private normalizeEntryPages(value: unknown, fallback: Record<string, Record<string, unknown>>) {
    const source = this.isPlainObject(value) ? (value as Record<string, unknown>) : {};
    return Object.fromEntries(Object.entries(fallback).map(([key, defaults]) => [key, this.normalizeEntryPage(source[key], defaults)]));
  }

  private normalizeEntryPage(value: unknown, fallback: Record<string, unknown>) {
    const source = this.isPlainObject(value) ? (value as Record<string, unknown>) : {};
    const merged: Record<string, unknown> = { ...fallback, ...source };
    if ("items" in fallback) merged.items = this.normalizeStringArray(merged.items, fallback.items as string[]);
    if ("flowItems" in fallback) merged.flowItems = this.normalizeStringArray(merged.flowItems, fallback.flowItems as string[]);
    return merged;
  }

  private normalizeJsonObject(value: unknown, label: string) {
    if (value === undefined || value === null) return {};
    if (!isPlainJsonObject(value)) throw new BadRequestException(`${label} must be a JSON object`);
    return value;
  }

  private adAdvertiserPayload(dto: AdAdvertiserDto) {
    const companyName = String(dto.companyName || "").trim();
    if (!companyName) throw new BadRequestException("请填写广告主公司名称");
    return {
      companyName,
      contactName: this.nullableText(dto.contactName),
      contactPhone: this.nullableText(dto.contactPhone),
      wechat: this.nullableText(dto.wechat),
      licenseUrl: this.normalizeAdAssetUrl(dto.licenseUrl, "广告主资质"),
      remark: this.nullableText(dto.remark),
      status: this.normalizeAdChoice(dto.status, ["active", "paused", "archived"], "active", "广告主状态")
    };
  }

  private adContractPayload(dto: AdContractDto) {
    const contractNo = String(dto.contractNo || "").trim();
    const title = String(dto.title || "").trim();
    if (!contractNo) throw new BadRequestException("请填写广告合同编号");
    if (!title) throw new BadRequestException("请填写广告合同标题");
    const startAt = dto.startAt ? this.parseDate(dto.startAt) : null;
    const endAt = dto.endAt ? this.parseDate(dto.endAt) : null;
    if (startAt && endAt && startAt.getTime() > endAt.getTime()) throw new BadRequestException("合同结束时间不能早于开始时间");
    const billingModel = this.normalizeAdChoice(dto.billingModel, ["fixed", "cpm", "cpc", "mixed"], "fixed", "合同计费模式");
    const fixedFee = this.roundMoney(dto.fixedFee ?? (billingModel === "fixed" ? dto.amount || 0 : 0));
    return {
      contractNo,
      title,
      billingModel,
      amount: this.roundMoney(dto.amount || fixedFee).toFixed(2),
      fixedFee: fixedFee.toFixed(2),
      cpmPrice: this.roundMoney(dto.cpmPrice || 0, 4).toFixed(4),
      cpcPrice: this.roundMoney(dto.cpcPrice || 0, 4).toFixed(4),
      startAt,
      endAt,
      paymentStatus: this.normalizeAdChoice(dto.paymentStatus, ["unpaid", "partial", "paid", "refunded"], "unpaid", "合同付款状态"),
      attachmentUrl: this.normalizeAdAssetUrl(dto.attachmentUrl, "合同附件"),
      remark: this.nullableText(dto.remark),
      status: this.normalizeAdChoice(dto.status, ["active", "paused", "archived"], "active", "合同状态")
    };
  }

  private async adCampaignPayload(dto: AdCampaignDto, tenant?: Tenant | null, memberLevelRepository: Repository<MemberLevel> = this.memberLevels) {
    const name = String(dto.name || "").trim();
    const title = String(dto.title || "").trim();
    if (!name) throw new BadRequestException("请填写广告计划名称");
    if (!title) throw new BadRequestException("请填写前台广告标题");
    const startAt = dto.startAt ? this.parseDate(dto.startAt) : null;
    const endAt = dto.endAt ? this.parseDate(dto.endAt) : null;
    if (startAt && endAt && startAt.getTime() > endAt.getTime()) throw new BadRequestException("广告结束时间不能早于开始时间");
    const source = this.normalizeAdChoice(dto.source, ["custom", "wechat_official"], "custom", "广告来源");
    const officialFormats = ["official_banner", "official_video", "official_grid", "official_interstitial", "official_rewarded_video"];
    const officialTypeByFormat: Record<string, string> = { official_banner: "banner", official_video: "video", official_grid: "grid", official_interstitial: "interstitial", official_rewarded_video: "rewarded_video" };
    const format = this.normalizeAdChoice(dto.format, ["splash", "inline_card", "banner", ...officialFormats], source === "wechat_official" ? "official_banner" : "banner", "广告形式");
    const imageUrls = this.normalizeAdImageUrls(dto.imageUrls);
    const imageUrl = this.nullableText(dto.imageUrl) || imageUrls[0] || null;
    const link = this.nullableText(dto.link);
    const enabled = dto.enabled ?? true;
    const fallbackImage = this.tenantDefaultAdImage(tenant);
    const platforms = this.normalizeMarketingPopupArray(dto.platforms, ["all", "h5", "mp-weixin"], source === "wechat_official" ? ["mp-weixin"] : ["all"]);
    const officialAdUnitId = this.nullableText(dto.officialAdUnitId);
    const officialAdType = this.nullableText(dto.officialAdType);
    for (const item of [imageUrl, ...imageUrls].filter((value): value is string => Boolean(value))) {
      if (!this.isUsableAdImage(item)) throw new BadRequestException("广告图必须使用 HTTPS 或 /uploads/ 地址");
    }
    if (enabled && source === "custom") {
      if (!imageUrl && !imageUrls.length && !fallbackImage) throw new BadRequestException("请上传广告图或选择商家默认广告图后再启用");
      if (!link) throw new BadRequestException("启用自有广告前请填写跳转链接");
    }
    if (source === "custom") {
      if (officialFormats.includes(format)) throw new BadRequestException("自有广告不能使用微信官方广告形式");
      if (link && (!this.isSafeAdLink(link) || (platforms.includes("mp-weixin") && /^https:\/\//i.test(link)))) throw new BadRequestException("小程序投放仅支持站内页面路径，H5 外链必须使用 HTTPS");
    } else {
      if (!officialFormats.includes(format)) throw new BadRequestException("微信官方流量主必须选择官方广告形式");
      if (platforms.length !== 1 || platforms[0] !== "mp-weixin") throw new BadRequestException("微信官方流量主仅支持微信小程序平台");
      if (!officialAdUnitId) throw new BadRequestException("微信官方流量主必须填写广告位 ID");
      if (officialAdType && officialAdType !== officialTypeByFormat[format]) throw new BadRequestException("官方广告类型必须与广告形式一致");
    }
    return {
      name,
      title,
      subtitle: this.nullableText(dto.subtitle),
      imageUrl,
      imageUrls,
      source,
      format,
      slotKey: this.normalizeAdChoice(dto.slotKey, ["app_splash", "home_top_banner", "home_feed_inline", "activity_detail_middle", "course_detail_middle", "mall_product_detail_middle", "community_feed_inline", "user_my_banner"], "home_top_banner", "广告位"),
      pageKey: this.normalizeAdChoice(dto.pageKey, ["all", "home", "mall_home", "mall_product_detail", "activity_list", "activity_detail", "course_home", "course_detail", "community_home", "community_detail", "user_my"], "home", "投放页面"),
      platforms,
      audience: await this.normalizeAdAudience(dto.audience, tenant || null, memberLevelRepository),
      link,
      billingModel: this.normalizeAdChoice(dto.billingModel, ["fixed", "cpm", "cpc", "mixed"], "fixed", "投放计费模式"),
      fixedFee: this.roundMoney(dto.fixedFee || 0).toFixed(2),
      cpmPrice: this.roundMoney(dto.cpmPrice || 0, 4).toFixed(4),
      cpcPrice: this.roundMoney(dto.cpcPrice || 0, 4).toFixed(4),
      totalBudget: this.roundMoney(dto.totalBudget || 0).toFixed(2),
      dailyBudget: this.roundMoney(dto.dailyBudget || 0).toFixed(2),
      impressionLimit: Math.max(0, Number(dto.impressionLimit || 0)),
      clickLimit: Math.max(0, Number(dto.clickLimit || 0)),
      officialAdUnitId,
      officialAdType: source === "wechat_official" ? officialTypeByFormat[format] : null,
      frequency: this.normalizeAdChoice(dto.frequency, ["every_visit", "once_per_day", "once_per_campaign"], "once_per_day", "展示频次"),
      priority: Math.max(Math.min(Number(dto.priority ?? 0), 9999), -9999),
      enabled,
      startAt,
      endAt
    };
  }

  private isUsableAdImage(value: string) {
    const text = String(value || "").trim();
    return text.startsWith("https://") || text.startsWith("/uploads/");
  }

  private isSafeAdLink(value: string) {
    const text = String(value || "").trim();
    return Boolean(text) && !text.startsWith("//") && (text.startsWith("/") || /^https:\/\//i.test(text));
  }

  private normalizeAdAssetUrl(value: unknown, label: string) {
    const text = this.nullableText(typeof value === "string" ? value : null);
    if (!text) return null;
    if (!this.isUsableAdImage(text)) throw new BadRequestException(`${label}必须使用 HTTPS 或 /uploads/ 地址`);
    return text;
  }

  private normalizeAdChoice(value: unknown, allowed: string[], fallback: string, label: string) {
    const text = String(value ?? "").trim();
    if (!text) return fallback;
    if (!allowed.includes(text)) throw new BadRequestException(`${label}不受支持`);
    return text;
  }

  private async normalizeAdAudience(value: unknown, tenant: Tenant | null, repository: Repository<MemberLevel>): Promise<ContentAudience> {
    const raw = this.isPlainObject(value) ? value as Record<string, unknown> : {};
    const mode = this.normalizeAdChoice(raw.mode, ["all", "guest", "authenticated", "member_levels"], "all", "广告受众") as ContentAudience["mode"];
    if (mode !== "member_levels") return { mode, memberLevelIds: [] };
    const ids = Array.from(new Set((Array.isArray(raw.memberLevelIds) ? raw.memberLevelIds : []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
    if (!ids.length) throw new BadRequestException("指定会员等级受众时至少选择一个启用等级");
    const levels = await repository.find({ where: { id: In(ids), enabled: true, tenantScopeKey: memberLevelScopeKey(tenant) } });
    if (levels.length !== ids.length) throw new BadRequestException("广告受众包含不存在、已停用或不属于当前商家的会员等级");
    return { mode, memberLevelIds: ids };
  }

  private normalizeAdImageUrls(value: unknown) {
    const list = Array.isArray(value) ? value : [];
    return Array.from(new Set(list.map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 10);
  }

  private tenantDefaultAdImage(tenant?: Tenant | null) {
    const settings = this.isPlainObject(tenant?.settings) ? tenant?.settings || {} : {};
    const value = settings.defaultAdImageUrl || settings.defaultShareImageUrl || settings.shareImageUrl;
    const text = typeof value === "string" ? value.trim() : "";
    return text && this.isUsableAdImage(text) ? text : "";
  }

  private async resolveAdAdvertiser(id: number | null | undefined, tenant: Tenant | null, admin?: AdminContext, repository: Repository<AdAdvertiser> = this.adAdvertisers) {
    if (!id) return null;
    const row = await repository.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告主不存在");
    this.assertAdTenantMatches(row.tenant, tenant, "广告主不属于当前投放商家");
    return row;
  }

  private async resolveAdContract(id: number | null | undefined, tenant: Tenant | null, admin?: AdminContext, repository: Repository<AdContract> = this.adContracts) {
    if (!id) return null;
    const row = await repository.findOneBy({ id });
    this.assertTenantAccess(row, admin);
    if (!row) throw new NotFoundException("广告合同不存在");
    this.assertAdTenantMatches(row.tenant, tenant, "广告合同不属于当前投放商家");
    return row;
  }

  private assertAdTenantMatches(rowTenant: Tenant | null | undefined, targetTenant: Tenant | null | undefined, message: string) {
    const rowTenantId = rowTenant?.id || null;
    const targetTenantId = targetTenant?.id || null;
    if (rowTenantId !== targetTenantId) throw new BadRequestException(message);
  }

  private adStatsTotals(stats: AdDailyStat[]) {
    return stats.reduce(
      (sum, row) => ({
        impressions: sum.impressions + Number(row.impressionCount || 0),
        clicks: sum.clicks + Number(row.clickCount || 0),
        skips: sum.skips + Number(row.skipCount || 0),
        closes: sum.closes + Number(row.closeCount || 0),
        loads: sum.loads + Number(row.loadCount || 0),
        errors: sum.errors + Number(row.errorCount || 0),
        rewards: sum.rewards + Number(row.rewardCount || 0),
        amount: this.roundMoney(sum.amount + this.money(row.spentAmount))
      }),
      { impressions: 0, clicks: 0, skips: 0, closes: 0, loads: 0, errors: 0, rewards: 0, amount: 0 }
    );
  }

  private buildAdSettlementItems(contract: AdContract, campaigns: AdCampaign[], stats: AdDailyStat[]) {
    const items: Array<{ campaign: AdCampaign | null; description: string; billingModel: string; quantity: number; unitPrice: number; amount: number }> = [];
    const billingModel = contract.billingModel || "fixed";
    const fixedFee = this.money(contract.fixedFee) || this.money(contract.amount);
    if ((billingModel === "fixed" || billingModel === "mixed") && fixedFee > 0) {
      items.push({ campaign: null, description: `${contract.title} 固定费用`, billingModel: "fixed", quantity: 1, unitPrice: fixedFee, amount: fixedFee });
    }
    const statsByCampaign = new Map<number, AdDailyStat[]>();
    for (const row of stats) {
      const id = row.campaign?.id || 0;
      if (!id) continue;
      statsByCampaign.set(id, [...(statsByCampaign.get(id) || []), row]);
    }
    for (const campaign of campaigns) {
      const totals = this.adStatsTotals(statsByCampaign.get(campaign.id) || []);
      const cpmPrice = this.money(campaign.cpmPrice) || this.money(contract.cpmPrice);
      const cpcPrice = this.money(campaign.cpcPrice) || this.money(contract.cpcPrice);
      if ((billingModel === "cpm" || billingModel === "mixed") && cpmPrice > 0 && totals.impressions > 0) {
        const quantity = totals.impressions / 1000;
        items.push({ campaign, description: `${campaign.name} CPM 曝光计费`, billingModel: "cpm", quantity, unitPrice: cpmPrice, amount: this.roundMoney(quantity * cpmPrice) });
      }
      if ((billingModel === "cpc" || billingModel === "mixed") && cpcPrice > 0 && totals.clicks > 0) {
        items.push({ campaign, description: `${campaign.name} CPC 点击计费`, billingModel: "cpc", quantity: totals.clicks, unitPrice: cpcPrice, amount: this.roundMoney(totals.clicks * cpcPrice) });
      }
    }
    return items.length ? items : [{ campaign: null, description: `${contract.title} 暂无可结算消耗`, billingModel, quantity: 0, unitPrice: 0, amount: 0 }];
  }

  private normalizeDateText(value: string, label: string) {
    const text = String(value || "").trim();
    const date = new Date(text);
    if (!text || Number.isNaN(date.getTime())) throw new BadRequestException(`${label}格式不正确`);
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private normalizeChoice(value: unknown, allowed: string[], fallback: string) {
    const text = String(value || "").trim();
    return allowed.includes(text) ? text : fallback;
  }

  private money(value: unknown) {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num : 0;
  }

  private roundMoney(value: unknown, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(this.money(value) * factor) / factor;
  }

  private async marketingPopupPayload(dto: MarketingPopupDto, tenant: Tenant | null, repository: Repository<MemberLevel> = this.memberLevels) {
    const title = String(dto.title || "").trim();
    if (!title) throw new BadRequestException("请填写弹窗标题");
    if (title.length > 120) throw new BadRequestException("弹窗标题不能超过 120 个字符");
    const type = String(dto.type || "notice").trim();
    if (!["notice", "ad", "payment", "wuxing_gold"].includes(type)) throw new BadRequestException("不支持的弹窗类型");
    const frequency = String(dto.frequency || "once_per_day").trim();
    if (!["every_visit", "once_per_day", "once_per_campaign"].includes(frequency)) throw new BadRequestException("不支持的展示频次");
    const priority = Number(dto.priority ?? 0);
    if (!Number.isInteger(priority) || priority < -9999 || priority > 9999) throw new BadRequestException("弹窗优先级必须是 -9999 到 9999 的整数");
    const startAt = dto.startAt ? this.parseDate(dto.startAt) : null;
    const endAt = dto.endAt ? this.parseDate(dto.endAt) : null;
    if (startAt && endAt && startAt.getTime() >= endAt.getTime()) throw new BadRequestException("弹窗开始时间必须早于结束时间");
    const imageUrl = this.nullableText(dto.imageUrl);
    if (imageUrl && !this.isUsableMarketingPopupImage(imageUrl)) throw new BadRequestException("弹窗图片只允许 HTTPS 或 /uploads/ 地址");
    const platforms = this.strictMarketingPopupArray(dto.platforms, ["all", "h5", "mp-weixin"], ["all"], "投放平台");
    const placements = this.strictMarketingPopupArray(dto.placements, ["all", "home", "mall_home", "activity_list", "activity_detail", "course_home", "course_detail", "mall_product_detail", "community_home", "user_my"], ["home"], "投放页面");
    const buttons = this.strictMarketingPopupButtons(dto.buttons);
    const targetsMiniProgram = platforms.includes("all") || platforms.includes("mp-weixin");
    const invalidButton = buttons.find((button) => button.link && !this.isUsableMarketingPopupLink(button.link, targetsMiniProgram ? "mp-weixin" : "h5"));
    if (invalidButton) throw new BadRequestException(targetsMiniProgram ? "小程序投放按钮只允许站内 / 路径" : "按钮跳转只允许 HTTP(S) 或站内 / 路径");
    return {
      title,
      subtitle: this.nullableText(dto.subtitle),
      content: this.nullableText(dto.content),
      emphasis: this.nullableText(dto.emphasis),
      imageUrl,
      type,
      platforms,
      placements,
      audience: await this.normalizeMarketingPopupAudience(dto.audience, tenant, repository),
      buttons,
      frequency,
      priority,
      enabled: dto.enabled ?? true,
      dismissible: dto.dismissible ?? true,
      startAt,
      endAt
    };
  }

  private marketingPopupEffectiveResult(row: MarketingPopup, pageKey: string, platform: string, tenantId: number | null) {
    const now = new Date();
    const reasons: Array<{ code: string; message: string }> = [];
    const warnings: Array<{ code: string; message: string }> = [];
    if (!row.enabled) reasons.push({ code: "disabled", message: "已停用" });
    if (row.startAt && row.startAt.getTime() > now.getTime()) reasons.push({ code: "not_started", message: "未开始" });
    if (row.endAt && row.endAt.getTime() < now.getTime()) reasons.push({ code: "expired", message: "已过期" });
    if (tenantId && row.tenant?.id !== tenantId) reasons.push({ code: "tenant_mismatch", message: "商家不匹配" });
    if (!tenantId && row.tenant) reasons.push({ code: "tenant_mismatch", message: "当前检测为平台全局，弹窗归属于指定商家" });
    if (!this.marketingPopupArrayMatches(row.platforms, platform)) reasons.push({ code: "platform_mismatch", message: "平台不匹配" });
    if (!this.marketingPopupArrayMatches(row.placements, pageKey)) reasons.push({ code: "page_mismatch", message: "页面不匹配" });
    if (row.imageUrl && !this.isUsableMarketingPopupImage(row.imageUrl)) warnings.push({ code: "image_abnormal", message: "图片建议使用 HTTPS 或 /uploads/ 地址" });
    const buttons = Array.isArray(row.buttons) ? row.buttons : [];
    const abnormalButton = buttons.find((button) => button?.link && !this.isUsableMarketingPopupLink(button.link, platform));
    if (abnormalButton) warnings.push({ code: "jump_abnormal", message: platform === "mp-weixin" ? "小程序端按钮不支持普通外链，请改用 /pages/... 路径" : "跳转链接格式异常" });
    const matched = reasons.length === 0;
    return {
      id: row.id,
      title: row.title,
      status: matched ? "effective" : reasons[0]?.code || "blocked",
      statusText: matched ? "生效中" : reasons[0]?.message || "未生效",
      matched,
      reasons,
      warnings,
      popup: this.publicMarketingPopupAdmin(row)
    };
  }

  private isUsableMarketingPopupImage(value: string) {
    const text = String(value || "").trim();
    return text.startsWith("https://") || text.startsWith("/uploads/");
  }

  private isUsableMarketingPopupLink(value: string, platform: string) {
    const text = String(value || "").trim();
    if (!text) return true;
    if (text.startsWith("//")) return false;
    if (text.startsWith("/pages/") || text.startsWith("/subpkg/") || text.startsWith("/")) return true;
    if (platform === "mp-weixin") return false;
    return text.startsWith("https://") || text.startsWith("http://");
  }

  private normalizeMarketingPopupArray(value: unknown, allowed: string[], fallback: string[]) {
    const source = Array.isArray(value) ? value : fallback;
    const list = source.map((item) => String(item || "").trim()).filter((item) => allowed.includes(item));
    return Array.from(new Set(list.length ? list : fallback));
  }

  private strictMarketingPopupArray(value: unknown, allowed: string[], fallback: string[], label: string) {
    const source = value === undefined || value === null ? fallback : value;
    if (!Array.isArray(source) || !source.length) throw new BadRequestException(`请至少选择一个${label}`);
    const list = source.map((item) => String(item || "").trim());
    if (list.some((item) => !allowed.includes(item))) throw new BadRequestException(`${label}包含不支持的值`);
    return Array.from(new Set(list));
  }

  private strictMarketingPopupButtons(value: unknown) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > 2) throw new BadRequestException("弹窗最多配置两个按钮");
    return value.map((item) => {
      if (!this.isPlainObject(item)) throw new BadRequestException("弹窗按钮格式不正确");
      const row = item as Record<string, unknown>;
      const text = String(row.text || "").trim();
      const link = String(row.link || "").trim();
      const style = String(row.style || "primary").trim();
      if (!text || text.length > 24) throw new BadRequestException("弹窗按钮文案不能为空且不能超过 24 个字符");
      if (link.length > 500) throw new BadRequestException("弹窗按钮链接不能超过 500 个字符");
      if (!["primary", "secondary"].includes(style)) throw new BadRequestException("弹窗按钮样式不支持");
      return { text, link, style: style as "primary" | "secondary" };
    });
  }

  private async normalizeMarketingPopupAudience(value: unknown, tenant: Tenant | null, repository: Repository<MemberLevel>) {
    const input = value === undefined || value === null ? {} : value;
    if (!this.isPlainObject(input)) throw new BadRequestException("营销弹窗受众格式不正确");
    const source = input as Record<string, unknown>;
    const mode = String(source.mode || "all").trim();
    if (!["all", "guest", "authenticated", "member_levels"].includes(mode)) throw new BadRequestException("不支持的营销弹窗受众模式");
    if (mode === "member_levels") {
      if (!Array.isArray(source.memberLevelIds)) throw new BadRequestException("指定会员等级受众时至少选择一个启用等级");
      const invalidId = source.memberLevelIds.some((id) => !Number.isInteger(Number(id)) || Number(id) <= 0);
      if (invalidId) throw new BadRequestException("营销弹窗会员等级编号格式不正确");
    }
    const audience = normalizeContentAudience(value);
    if (audience.mode !== "member_levels") return { ...audience, memberLevelIds: [] };
    const ids = audience.memberLevelIds || [];
    if (!ids.length) throw new BadRequestException("指定会员等级受众时至少选择一个启用等级");
    const levels = await repository.find({ where: { id: In(ids), enabled: true, tenantScopeKey: memberLevelScopeKey(tenant) } });
    if (levels.length !== ids.length) throw new BadRequestException("营销弹窗受众包含不存在、已停用或不属于当前商家的会员等级");
    return audience;
  }

  private marketingPopupArrayMatches(value: unknown, target?: string) {
    if (!target?.trim()) return true;
    const list = Array.isArray(value) ? value.map((item) => String(item)) : [];
    return list.includes("all") || list.includes(target.trim());
  }

  private nullableText(value?: string | null) {
    const text = String(value ?? "").trim();
    return text || null;
  }

  private relationId<T extends { id?: number }>(value?: T | null) {
    return value?.id ? { id: value.id } : null;
  }

  private async ensureProfilesForExistingUsers() {
    const users = await this.users.find({ take: 500 });
    await this.ensureMemberProfileRows(users);
  }

  private async ensureMemberProfileRows(users: User[], tenant: Tenant | null = null) {
    if (!users.length) return;
    const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform";
    const existing = await this.memberProfiles
      .createQueryBuilder("profile")
      .select("profile.userId", "userId")
      .where("profile.tenantScopeKey = :tenantScopeKey", { tenantScopeKey })
      .andWhere("profile.userId IN (:...userIds)", { userIds: users.map((user) => user.id) })
      .getRawMany<{ userId: string }>();
    const existingIds = new Set(existing.map((row) => Number(row.userId)));
    const missing = users.filter((user) => !existingIds.has(user.id));
    if (!missing.length) return;
    await this.memberProfiles
      .createQueryBuilder()
      .insert()
      .values(missing.map((user) => ({ user: { id: user.id }, tenant: tenant ? { id: tenant.id } : null, tenantScopeKey, level: null, points: 0, growthValue: 0, growthCycleStartedAt: null, levelStartedAt: null, levelExpiresAt: null, levelSource: "growth" })) as any[])
      .orIgnore()
      .execute();
  }

  private async ensureMemberProfile(user: User, tenant: Tenant | null = null) {
    const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform";
    let profile = await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
    if (!profile) {
      try {
        profile = await this.memberProfiles.save(this.memberProfiles.create({ user, tenant, tenantScopeKey, level: null, growthValue: 0, growthCycleStartedAt: null, levelStartedAt: null, levelExpiresAt: null, levelSource: "growth" }));
      } catch (error) {
        if (!isDuplicateEntryError(error)) throw error;
        profile = await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey } });
        if (!profile) throw error;
      }
    }
    return this.refreshMemberProfile(user, profile, tenant);
  }

  private async refreshMemberProfile(user: User, profile?: MemberProfile, tenant: Tenant | null = null) {
    const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform";
    const row = profile || (await this.memberProfiles.findOne({ where: { user: { id: user.id }, tenantScopeKey } })) || this.memberProfiles.create({ user, tenant, tenantScopeKey, level: null });
    const tenantFilter = tenant ? " = :memberTenantId" : " IS NULL";
    const [registrationCount, checkInCount, reviewCount, paidAmount, pointSum, growthSum, latestRegistration] = await Promise.all([
      this.registrations.createQueryBuilder("r").where("r.userId = :userId", { userId: user.id }).andWhere(`r.tenantId${tenantFilter}`, { memberTenantId: tenant?.id }).getCount(),
      this.checkIns.createQueryBuilder("c").leftJoin("c.registration", "r").where("r.userId = :userId", { userId: user.id }).andWhere(`r.tenantId${tenantFilter}`, { memberTenantId: tenant?.id }).andWhere("c.revokedAt IS NULL").getCount(),
      this.activityReviews.createQueryBuilder("review").leftJoin("review.activity", "a").where("review.userId = :userId", { userId: user.id }).andWhere(`a.tenantId${tenantFilter}`, { memberTenantId: tenant?.id }).getCount(),
      this.orders.createQueryBuilder("o").leftJoin("o.registration", "r").select("COALESCE(SUM(o.amount), 0)", "sum").where("r.userId = :userId", { userId: user.id }).andWhere(`o.tenantId${tenantFilter}`, { memberTenantId: tenant?.id }).andWhere("o.status IN (:...statuses)", { statuses: [OrderStatus.Paid, OrderStatus.PartiallyRefunded, OrderStatus.Refunded] }).getRawOne<{ sum: string }>(),
      this.memberPointLogs.createQueryBuilder("p").select("COALESCE(SUM(p.points), 0)", "sum").where("p.userId = :userId", { userId: user.id }).andWhere("p.tenantScopeKey = :tenantScopeKey", { tenantScopeKey }).andWhere("p.reversedAt IS NULL").andWhere("(p.expiresAt IS NULL OR p.expiresAt > :pointNow)", { pointNow: new Date() }).getRawOne<{ sum: string }>(),
      this.memberPointLogs.createQueryBuilder("p").select("COALESCE(SUM(p.growthValue), 0)", "sum").where("p.userId = :userId", { userId: user.id }).andWhere("p.tenantScopeKey = :tenantScopeKey", { tenantScopeKey }).andWhere("p.reversedAt IS NULL").andWhere("(:growthCycle IS NULL OR p.createdAt >= :growthCycle)", { growthCycle: row.growthCycleStartedAt }).getRawOne<{ sum: string }>(),
      this.registrations
        .createQueryBuilder("registration")
        .select("registration.createdAt", "createdAt")
        .where("registration.userId = :userId", { userId: user.id }).andWhere(`registration.tenantId${tenantFilter}`, { memberTenantId: tenant?.id })
        .orderBy("registration.createdAt", "DESC")
        .getRawOne<{ createdAt: Date }>()
    ]);
    row.points = Number(pointSum?.sum || 0);
    row.growthValue = Number(growthSum?.sum || 0);
    row.totalSpent = Number(paidAmount?.sum || 0).toFixed(2);
    row.registrationCount = registrationCount;
    row.checkInCount = checkInCount;
    row.reviewCount = reviewCount;
    row.lastActiveAt = latestRegistration?.createdAt || row.lastActiveAt || user.updatedAt || user.createdAt;
    if (!manualLevelOverrideActive(row.levelSource, row.levelExpiresAt)) {
      const previousLevelId = row.level?.id || null;
      row.level = await this.resolveMemberLevel(row.growthValue, tenant);
      if ((row.level?.id || null) !== previousLevelId) { row.levelStartedAt = new Date(); row.levelExpiresAt = levelExpiry(row.level, row.levelStartedAt); row.levelSource = "growth"; row.levelSnapshot = memberLevelSnapshot(row.level); }
    }
    return this.memberProfiles.save(row);
  }

  private async resolveMemberLevel(growthValue: number, tenant: Tenant | null) {
    const levels = await this.memberLevels.find({ where: { enabled: true, tenantScopeKey: memberLevelScopeKey(tenant) }, order: { minGrowth: "DESC" } });
    return resolveGrowthLevel(levels, growthValue) as MemberLevel | null;
  }

  private async awardPoints(user: User, points: number, sourceType: string, sourceId: string | number, remark: string, tenant: Tenant | null = null, expiresAt: Date | null = null) {
    const result = await this.memberPoints.post({
      user,
      tenant,
      points,
      sourceType,
      sourceId,
      remark,
      expiresAt,
      type: sourceType === "admin_point_adjust" ? "adjust" : points >= 0 ? "earn" : "deduct",
      negativePolicy: sourceType.includes("refund") ? "debt" : "reject"
    });
    await this.ensureMemberProfile(user, tenant);
    return result.log;
  }

  private async refundRedeemedPoints(order: Order, remark: string) {
    if (!order.pointsUsed || order.pointsUsed <= 0 || order.pointsRefundedAt) return null;
    await this.awardPoints(order.registration.user, order.pointsUsed, "points_return", order.id, remark, order.tenant || order.registration.activity?.tenant || null);
    order.pointsRefundedAt = new Date();
    await this.orders.save(order);
    return order;
  }

  private async ensureActivityMemberAccess(activity: Activity, user: User) {
    const requiredLevel = this.effectiveRequiredMemberLevel(activity);
    if (!requiredLevel) return;
    const profile = await this.ensureMemberProfile(user);
    const current = profile.level;
    if (!current || current.minPoints < requiredLevel.minPoints) {
      const message = this.isPriorityBookingActive(activity)
        ? `优先报名截止前仅 ${requiredLevel.name} 及以上会员报名`
        : `该活动仅 ${requiredLevel.name} 及以上会员报名`;
      throw new BadRequestException(message);
    }
  }

  private effectiveRequiredMemberLevel(activity: Activity) {
    const levels = [activity.minMemberLevel];
    if (this.isPriorityBookingActive(activity)) levels.push(activity.priorityMemberLevel);
    return levels.filter(Boolean).sort((a, b) => b!.minPoints - a!.minPoints)[0] || null;
  }

  private isPriorityBookingActive(activity: Activity) {
    return Boolean(activity.priorityMemberLevel && activity.priorityRegistrationEndsAt && activity.priorityRegistrationEndsAt.getTime() > Date.now());
  }

  private validateActivityDto(dto: ActivityDto) {
    if (!dto.title?.trim()) throw new BadRequestException("请填写活动标题");
    if (!dto.location?.trim()) throw new BadRequestException("请填写活动地点");
    if (!dto.description?.trim()) throw new BadRequestException("请填写活动介绍");
    for (const [label, value] of [["省/自治区", dto.locationProvince], ["城市", dto.locationCity], ["区县", dto.locationDistrict]] as const) {
      if (String(value || "").trim().length > 80) throw new BadRequestException(`${label}不能超过 80 个字符`);
    }
    const hasLat = dto.locationLatitude !== undefined && dto.locationLatitude !== null;
    const hasLng = dto.locationLongitude !== undefined && dto.locationLongitude !== null;
    if (hasLat !== hasLng) throw new BadRequestException("请同时填写地图纬度和经度");
    if (hasLat && (Number(dto.locationLatitude) < -90 || Number(dto.locationLatitude) > 90)) throw new BadRequestException("Map latitude must be between -90 and 90");
    if (hasLng && (Number(dto.locationLongitude) < -180 || Number(dto.locationLongitude) > 180)) throw new BadRequestException("Map longitude must be between -180 and 180");
    const start = this.parseDate(dto.startTime);
    const end = this.parseDate(dto.endTime);
    const deadline = this.parseDate(dto.registrationDeadline);
    if (end <= start) throw new BadRequestException("结束时间必须晚于开始时间");
    if (deadline >= start) throw new BadRequestException("报名截止时间必须早于活动开始时间");
    if (dto.priorityMemberLevelId && !dto.priorityRegistrationEndsAt) throw new BadRequestException("请设置优先报名截止时间");
    if (!dto.priorityMemberLevelId && dto.priorityRegistrationEndsAt) throw new BadRequestException("请先选择优先报名会员等级");
    if (dto.priorityRegistrationEndsAt) {
      const priorityEndsAt = this.parseDate(dto.priorityRegistrationEndsAt);
      if (priorityEndsAt >= deadline) throw new BadRequestException("优先报名截止时间必须早于报名截止时间");
    }
    if (!dto.fields.length) throw new BadRequestException("至少需要配置一个报名字段");
    for (const field of dto.fields) if (!field.label?.trim()) throw new BadRequestException("报名字段名称不能为空");
  }

  private assertActivityContentCompliance(input: { title?: string | null; description?: string | null; notice?: string | null; sections?: Array<{ title?: string | null; content?: string | null }> }) {
    const result = checkActivityContentCompliance(input);
    if (result.passed) return;
    throw new BadRequestException({
      message: "活动内容存在合规风险，请修改后再保存或提交审核",
      issues: result.blockingIssues,
      suggestions: ["请使用东方哲学与传统文化、民俗文化、节气文化、国学经典解读、书法美育等文化服务表述。", "避免算命、改运、破灾、保证结果、预测财富/婚姻/疾病等宣传。"]
    });
  }

  private async activityWithSections(id: number) {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) return null;
    const sections = await this.sections.find({ where: { activity: { id } }, order: { sortOrder: "ASC", id: "ASC" } });
    return { ...activity, sections } as Activity & { sections: ActivitySection[] };
  }

  private parseDate(value: string) {
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) throw new BadRequestException("时间格式不正");
    return date;
  }

  private cleanText(value: unknown, maxLength: number) {
    const text = typeof value === "string" ? value.trim() : "";
    return text.slice(0, maxLength);
  }

  private async getRegistration(id: number, admin?: AdminContext) {
    const registration = await this.registrations.findOne({ where: { id } });
    if (!registration) throw new NotFoundException("报名记录不存");
    this.assertActivityAccess(registration.activity, admin);
    return registration;
  }

  private async getAgentSettlement(id: number, admin?: AdminContext) {
    const settlement = await this.agentSettlements.findOne({ where: { id } });
    if (!settlement) throw new NotFoundException("代理结算单不存在");
    this.assertTenantAccess(settlement, admin);
    return settlement;
  }

  private async selectAgentTransferAccount(agentId: number, provider?: "wechat" | "alipay") {
    const accounts = await this.agentPaymentAccounts.find({ where: { agent: { id: agentId }, enabled: true }, order: { id: "DESC" } });
    const supported = accounts.filter((account) => {
      const accountProvider = providerForPaymentMethod(account.provider);
      return accountProvider && (!provider || accountProvider === provider);
    });
    if (!supported.length) throw new BadRequestException(provider ? `该代理未配置启用的 ${provider} 支付账户` : "该代理未配置启用的微信或支付宝支付账户");
    const ready = supported.find((account) => {
      const assessment = assessAgentTransferAccount(this.config, account);
      return assessment?.status === "sandbox_ready" || assessment?.status === "real_ready";
    });
    return ready || supported[0];
  }

  private agentSettlementTransferNo(settlement: AgentSettlement, mode: "sandbox" | "real" = "sandbox") {
    return `${mode === "real" ? "ART" : "AST"}${settlement.id}${settlement.settlementNo.replace(/[^A-Za-z0-9]/g, "").slice(-24)}`;
  }

  private async assertNoActiveAgentSettlement(agentId: number, periodStart: Date, periodEnd: Date) {
    const exists = await this.agentSettlements
      .createQueryBuilder("settlement")
      .leftJoin("settlement.agent", "agent")
      .where("agent.id = :agentId", { agentId })
      .andWhere("settlement.status NOT IN (:...inactiveStatuses)", { inactiveStatuses: ["rejected", "cancelled"] })
      .andWhere("settlement.periodStart < :periodEnd", { periodEnd })
      .andWhere("settlement.periodEnd > :periodStart", { periodStart })
      .getOne();
    if (exists) throw new BadRequestException(`该代理在所选周期已有结算单：${exists.settlementNo}`);
  }

  private async calculateAgentSettlementSnapshot(agent: Agent, periodStart: Date, periodEnd: Date, commissionRate: number) {
    const [transactionRows, refundRows] = await Promise.all([this.agentSettlementTransactions(agent.id, periodStart, periodEnd), this.agentSettlementRefunds(agent.id, periodStart, periodEnd)]);
    const gross = transactionRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const refund = refundRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const net = Math.max(gross - refund, 0);
    const commission = net * (commissionRate / 100);
    return {
      transactionRows,
      refundRows,
      grossAmount: gross.toFixed(2),
      refundAmount: refund.toFixed(2),
      netAmount: net.toFixed(2),
      commissionRate: commissionRate.toFixed(4),
      commissionAmount: commission.toFixed(2),
      payableAmount: Math.max(net - commission, 0).toFixed(2)
    };
  }

  private agentSettlementPayload(settlement: AgentSettlement) {
    const payload = settlement.payload || {};
    const toIds = (value: unknown) => (Array.isArray(value) ? value.map((item) => Number(item)).filter((item) => Number.isFinite(item)) : []);
    return {
      transactionIds: toIds(payload.transactionIds),
      refundIds: toIds(payload.refundIds)
    };
  }

  private agentSettlementDifferences(settlement: AgentSettlement, recalculated: Awaited<ReturnType<AdminService["calculateAgentSettlementSnapshot"]>>) {
    const payload = this.agentSettlementPayload(settlement);
    const currentTransactionIds = recalculated.transactionRows.map((item) => item.id);
    const currentRefundIds = recalculated.refundRows.map((item) => item.id);
    const differences: Array<{ field: string; label: string; snapshot: unknown; current: unknown; blocking: boolean }> = [];
    const addAmountDiff = (field: keyof AgentSettlement, label: string, current: string) => {
      if (Math.abs(Number(settlement[field] || 0) - Number(current || 0)) > 0.001) differences.push({ field, label, snapshot: settlement[field], current, blocking: true });
    };
    if (settlement.transactionCount !== recalculated.transactionRows.length) differences.push({ field: "transactionCount", label: "支付流水笔数", snapshot: settlement.transactionCount, current: recalculated.transactionRows.length, blocking: true });
    if (settlement.refundCount !== recalculated.refundRows.length) differences.push({ field: "refundCount", label: "退款笔", snapshot: settlement.refundCount, current: recalculated.refundRows.length, blocking: true });
    addAmountDiff("grossAmount", "实收金额", recalculated.grossAmount);
    addAmountDiff("refundAmount", "退款金", recalculated.refundAmount);
    addAmountDiff("netAmount", "净收入", recalculated.netAmount);
    addAmountDiff("commissionAmount", "佣金", recalculated.commissionAmount);
    addAmountDiff("payableAmount", "应打", recalculated.payableAmount);
    const missingTransactions = payload.transactionIds.filter((id) => !currentTransactionIds.includes(id));
    const newTransactions = currentTransactionIds.filter((id) => !payload.transactionIds.includes(id));
    const missingRefunds = payload.refundIds.filter((id) => !currentRefundIds.includes(id));
    const newRefunds = currentRefundIds.filter((id) => !payload.refundIds.includes(id));
    if (missingTransactions.length || newTransactions.length) differences.push({ field: "transactionIds", label: "支付流水明细", snapshot: payload.transactionIds, current: currentTransactionIds, blocking: true });
    if (missingRefunds.length || newRefunds.length) differences.push({ field: "refundIds", label: "退款明", snapshot: payload.refundIds, current: currentRefundIds, blocking: true });
    return differences;
  }

  private async agentSettlementRisks(settlement: AgentSettlement, recalculated: Awaited<ReturnType<AdminService["calculateAgentSettlementSnapshot"]>>, differences: Array<{ blocking: boolean }>) {
    const pendingReconciliationCount = recalculated.transactionRows.filter((item) => item.reconciliationStatus === "pending").length;
    const risks: Array<{ type: string; level: "info" | "warning" | "danger"; message: string; blocking: boolean }> = [];
    if (differences.some((item) => item.blocking)) risks.push({ type: "snapshot_changed", level: "danger", message: "结算单生成后流水或金额发生变化，需要重新生成或人工复核", blocking: true });
    if (pendingReconciliationCount) risks.push({ type: "pending_reconciliation", level: "danger", message: `周期内仍"${pendingReconciliationCount} 笔待处理对账差异`, blocking: true });
    if (Number(recalculated.payableAmount) <= 0) risks.push({ type: "zero_payable", level: "warning", message: "应打款金额为 0 或负数，打款前需确认无需转账", blocking: false });
    if (!settlement.paidReference && settlement.status === "paid") risks.push({ type: "missing_paid_reference", level: "warning", message: "已打款但未记录打款凭", blocking: false });
    return risks;
  }

  private agentSettlementTransactions(agentId: number, periodStart: Date, periodEnd: Date) {
    return this.paymentTransactions
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.order", "order")
      .leftJoinAndSelect("order.agent", "agent")
      .where("agent.id = :agentId", { agentId })
      .andWhere("transaction.status = :status", { status: "success" })
      .andWhere("transaction.createdAt >= :periodStart", { periodStart })
      .andWhere("transaction.createdAt < :periodEnd", { periodEnd })
      .orderBy("transaction.createdAt", "ASC")
      .getMany();
  }

  private agentSettlementRefunds(agentId: number, periodStart: Date, periodEnd: Date) {
    return this.refunds
      .createQueryBuilder("refund")
      .leftJoinAndSelect("refund.order", "order")
      .leftJoinAndSelect("order.agent", "agent")
      .where("agent.id = :agentId", { agentId })
      .andWhere("refund.status = :status", { status: "completed" })
      .andWhere("COALESCE(refund.completedAt, refund.createdAt) >= :periodStart", { periodStart })
      .andWhere("COALESCE(refund.completedAt, refund.createdAt) < :periodEnd", { periodEnd })
      .orderBy("COALESCE(refund.completedAt, refund.createdAt)", "ASC")
      .getMany();
  }

  private resolveAgentCommissionRate(agent: Agent, inputRate?: number) {
    const raw = inputRate ?? (agent.settlementConfig?.commissionRate as number | string | undefined) ?? 0;
    const rate = Number(raw);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new BadRequestException("Agent commission rate must be between 0 and 100");
    return rate;
  }

  private paymentTransactionsQuery() {
    return this.paymentTransactions
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.order", "order")
      .leftJoinAndSelect("order.agent", "orderAgent")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity");
  }

  private paymentStatementsQuery() {
    return this.paymentStatementRecords
      .createQueryBuilder("statement")
      .leftJoinAndSelect("statement.order", "order")
      .leftJoinAndSelect("order.agent", "orderAgent")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity")
      .leftJoinAndSelect("statement.courseOrder", "courseOrder")
      .leftJoinAndSelect("courseOrder.course", "statementCourse")
      .leftJoinAndSelect("statementCourse.tenant", "statementCourseTenant");
  }

  private refundsQuery() {
    return this.refunds
      .createQueryBuilder("refund")
      .leftJoin("refund.order", "order")
      .leftJoin("refund.tenant", "tenant")
      .leftJoin("order.agent", "orderAgent")
      .leftJoin("order.registration", "registration")
      .leftJoin("registration.user", "user")
      .leftJoin("registration.activity", "activity");
  }

  // Refund, order, and registration have eager relations. Return a flat query here so
  // TypeORM cannot recursively expand that graph past MySQL's 61-table join limit.
  private refundListSelect(builder: SelectQueryBuilder<Refund>) {
    return builder
      .select("refund.id", "refund_id")
      .addSelect("refund.refundNo", "refund_refundNo")
      .addSelect("refund.amount", "refund_amount")
      .addSelect("refund.amountFen", "refund_amountFen")
      .addSelect("refund.status", "refund_status")
      .addSelect("refund.operator", "refund_operator")
      .addSelect("refund.reason", "refund_reason")
      .addSelect("refund.reviewedBy", "refund_reviewedBy")
      .addSelect("refund.reviewRemark", "refund_reviewRemark")
      .addSelect("refund.reviewedAt", "refund_reviewedAt")
      .addSelect("refund.completedAt", "refund_completedAt")
      .addSelect("refund.providerRefundNo", "refund_providerRefundNo")
      .addSelect("refund.providerRefundStatus", "refund_providerRefundStatus")
      .addSelect("refund.providerRefundSyncedAt", "refund_providerRefundSyncedAt")
      .addSelect("refund.providerRefundFailureReason", "refund_providerRefundFailureReason")
      .addSelect("refund.providerRefundRetryCount", "refund_providerRefundRetryCount")
      .addSelect("refund.providerRefundNextQueryAt", "refund_providerRefundNextQueryAt")
      .addSelect("refund.createdAt", "refund_createdAt")
      .addSelect("tenant.id", "tenant_id")
      .addSelect("tenant.name", "tenant_name")
      .addSelect("order.id", "order_id")
      .addSelect("order.orderNo", "order_orderNo")
      .addSelect("order.amount", "order_amount")
      .addSelect("order.status", "order_status")
      .addSelect("order.paymentMethod", "order_paymentMethod")
      .addSelect("order.transactionNo", "order_transactionNo")
      .addSelect("orderAgent.id", "orderAgent_id")
      .addSelect("orderAgent.name", "orderAgent_name")
      .addSelect("registration.id", "registration_id")
      .addSelect("user.id", "user_id")
      .addSelect("user.phone", "user_phone")
      .addSelect("user.nickname", "user_nickname")
      .addSelect("activity.id", "activity_id")
      .addSelect("activity.title", "activity_title");
  }

  private refundListView(row: Record<string, unknown>): RefundListItem {
    const optional = (idKey: string, value: Record<string, unknown>) => row[idKey] == null ? null : value;
    return {
      id: Number(row.refund_id), refundNo: row.refund_refundNo, amount: row.refund_amount, amountFen: Number(row.refund_amountFen || 0), status: row.refund_status,
      operator: row.refund_operator, reason: row.refund_reason, reviewedBy: row.refund_reviewedBy, reviewRemark: row.refund_reviewRemark,
      reviewedAt: row.refund_reviewedAt, completedAt: row.refund_completedAt, providerRefundNo: row.refund_providerRefundNo,
      providerRefundStatus: row.refund_providerRefundStatus, providerRefundSyncedAt: row.refund_providerRefundSyncedAt,
      providerRefundFailureReason: row.refund_providerRefundFailureReason, providerRefundRetryCount: Number(row.refund_providerRefundRetryCount || 0),
      providerRefundNextQueryAt: row.refund_providerRefundNextQueryAt, createdAt: row.refund_createdAt,
      tenant: optional("tenant_id", { id: Number(row.tenant_id), name: row.tenant_name }),
      order: optional("order_id", {
        id: Number(row.order_id), orderNo: row.order_orderNo, amount: row.order_amount, status: row.order_status, paymentMethod: row.order_paymentMethod, transactionNo: row.order_transactionNo,
        agent: optional("orderAgent_id", { id: Number(row.orderAgent_id), name: row.orderAgent_name }),
        registration: optional("registration_id", {
          id: Number(row.registration_id),
          user: optional("user_id", { id: Number(row.user_id), phone: row.user_phone, nickname: row.user_nickname }),
          activity: optional("activity_id", { id: Number(row.activity_id), title: row.activity_title })
        })
      })
    } as unknown as RefundListItem;
  }

  private lockedRefund(repo: Repository<Refund>, id: number, includeOrder = false) {
    const builder = repo
      .createQueryBuilder("refund")
      .setFindOptions({ loadEagerRelations: false })
      .leftJoinAndSelect("refund.tenant", "tenant")
      .where("refund.id = :id", { id })
      .setLock("pessimistic_write");
    if (includeOrder) builder.leftJoinAndSelect("refund.order", "order");
    return builder.getOne();
  }

  private callbackLogsQuery() {
    return this.paymentCallbackLogs
      .createQueryBuilder("callback")
      .leftJoinAndSelect("callback.order", "order")
      .leftJoinAndSelect("order.agent", "orderAgent")
      .leftJoinAndSelect("order.registration", "registration")
      .leftJoinAndSelect("registration.activity", "activity");
  }

  private applyAgentFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, query: Pick<OrderQueryDto, "agentId">, alias = "agent") {
    if (query.agentId) builder.andWhere(`${alias}.id = :agentId`, { agentId: query.agentId });
  }

  private applyCreatedAtRange(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, start: Date, end: Date) {
    builder.andWhere(`${alias}.createdAt >= :${alias}RangeStart`, { [`${alias}RangeStart`]: start });
    builder.andWhere(`${alias}.createdAt < :${alias}RangeEnd`, { [`${alias}RangeEnd`]: end });
  }

  private applyFinanceTenantFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, query: Pick<OrderQueryDto, "tenantId">, admin?: AdminContext, recordAlias = "order") {
    if (this.isTenantScoped(admin) || !query.tenantId) return;
    builder.andWhere(`(${recordAlias}.tenantId = :financeTenantId OR order.tenantId = :financeTenantId OR registration.tenantId = :financeTenantId OR activity.tenantId = :financeTenantId)`, { financeTenantId: query.tenantId });
  }

  private businessDayRange(now = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
  }

  private countOrdersForAgent(query: OrderQueryDto, status?: OrderStatus, admin?: AdminContext) {
    const builder = this.orders.createQueryBuilder("order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (status) builder.where("order.status = :status", { status });
    this.applyTenantScope(builder, "order", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "order");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countOrdersForAgentInRange(query: OrderQueryDto, status: OrderStatus | undefined, admin: AdminContext | undefined, start: Date, end: Date) {
    const builder = this.orders.createQueryBuilder("order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (status) builder.where("order.status = :status", { status });
    this.applyCreatedAtRange(builder, "order", start, end);
    this.applyTenantScope(builder, "order", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "order");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countTransactionsForAgent(query: OrderQueryDto, reconciliationStatus?: string, admin?: AdminContext) {
    const builder = this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (reconciliationStatus) builder.where("transaction.reconciliationStatus = :reconciliationStatus", { reconciliationStatus });
    builder.andWhere("transaction.businessType = :activityBusinessType", { activityBusinessType: "activity" });
    this.applyTenantScope(builder, "transaction", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "transaction");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countTransactionsForAgentInRange(query: OrderQueryDto, status: string, admin: AdminContext | undefined, start: Date, end: Date) {
    const builder = this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").where("transaction.status = :status", { status });
    builder.andWhere("transaction.businessType = :activityBusinessType", { activityBusinessType: "activity" });
    this.applyCreatedAtRange(builder, "transaction", start, end);
    this.applyTenantScope(builder, "transaction", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "transaction");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countPaymentStatementsForAgent(query: OrderQueryDto, reconciliationStatus?: string, admin?: AdminContext) {
    const builder = this.paymentStatementRecords.createQueryBuilder("statement").leftJoin("statement.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (reconciliationStatus) builder.where("statement.reconciliationStatus = :reconciliationStatus", { reconciliationStatus });
    this.applyTenantScope(builder, "statement", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "statement");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countRefundsForAgent(query: OrderQueryDto, status?: string, admin?: AdminContext) {
    const builder = this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (status) builder.where("refund.status = :status", { status });
    this.applyTenantScope(builder, "refund", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "refund");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countRefundsForAgentInRange(query: OrderQueryDto, status: string | undefined, admin: AdminContext | undefined, start: Date, end: Date) {
    const builder = this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (status) builder.where("refund.status = :status", { status });
    this.applyCreatedAtRange(builder, "refund", start, end);
    this.applyTenantScope(builder, "refund", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "refund");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private countCallbackLogsForAgent(query: OrderQueryDto, resultStatus?: string, admin?: AdminContext) {
    const builder = this.paymentCallbackLogs.createQueryBuilder("callback").leftJoin("callback.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity");
    if (resultStatus) builder.where("callback.resultStatus = :resultStatus", { resultStatus });
    this.applyTenantScope(builder, "callback", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "callback");
    this.applyAgentFilter(builder, query);
    return builder.getCount();
  }

  private transactionSumForAgent(query: OrderQueryDto, status: string, admin?: AdminContext) {
    const builder = this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").select("COALESCE(SUM(transaction.amount), 0)", "sum").where("transaction.status = :status", { status });
    builder.andWhere("transaction.businessType = :activityBusinessType", { activityBusinessType: "activity" });
    this.applyTenantScope(builder, "transaction", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "transaction");
    this.applyAgentFilter(builder, query);
    return builder.getRawOne<{ sum: string }>();
  }

  private transactionSumForAgentInRange(query: OrderQueryDto, status: string, admin: AdminContext | undefined, start: Date, end: Date) {
    const builder = this.paymentTransactions.createQueryBuilder("transaction").leftJoin("transaction.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").select("COALESCE(SUM(transaction.amount), 0)", "sum").where("transaction.status = :status", { status });
    builder.andWhere("transaction.businessType = :activityBusinessType", { activityBusinessType: "activity" });
    this.applyCreatedAtRange(builder, "transaction", start, end);
    this.applyTenantScope(builder, "transaction", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "transaction");
    this.applyAgentFilter(builder, query);
    return builder.getRawOne<{ sum: string }>();
  }

  private refundSumForAgent(query: OrderQueryDto, status: string, admin?: AdminContext) {
    const builder = this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").select("COALESCE(SUM(refund.amount), 0)", "sum").where("refund.status = :status", { status });
    this.applyTenantScope(builder, "refund", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "refund");
    this.applyAgentFilter(builder, query);
    return builder.getRawOne<{ sum: string }>();
  }

  private refundSumForAgentInRange(query: OrderQueryDto, status: string, admin: AdminContext | undefined, start: Date, end: Date) {
    const builder = this.refunds.createQueryBuilder("refund").leftJoin("refund.order", "order").leftJoin("order.agent", "agent").leftJoin("order.registration", "registration").leftJoin("registration.activity", "activity").select("COALESCE(SUM(refund.amount), 0)", "sum").where("refund.status = :status", { status });
    this.applyCreatedAtRange(builder, "refund", start, end);
    this.applyTenantScope(builder, "refund", admin);
    this.applyFinanceTenantFilter(builder, query, admin, "refund");
    this.applyAgentFilter(builder, query);
    return builder.getRawOne<{ sum: string }>();
  }

  private async agentFinanceSummary(query: OrderQueryDto, admin?: AdminContext) {
    const paidBuilder = this.paymentTransactions
      .createQueryBuilder("transaction")
      .leftJoin("transaction.order", "order")
      .leftJoin("order.agent", "agent")
      .leftJoin("order.registration", "registration")
      .leftJoin("registration.activity", "activity")
      .select("COALESCE(agent.id, 0)", "agentId")
      .addSelect("COALESCE(agent.name, '平台自营')", "agentName")
      .addSelect("COUNT(transaction.id)", "transactionCount")
      .addSelect("COALESCE(SUM(CASE WHEN transaction.status = 'success' THEN transaction.amount ELSE 0 END), 0)", "paidAmount")
      .addSelect("COALESCE(SUM(CASE WHEN transaction.reconciliationStatus = 'pending' THEN 1 ELSE 0 END), 0)", "pendingReconciliationCount")
      .where(query.agentId ? "agent.id = :agentId" : "1 = 1", { agentId: query.agentId })
      .groupBy("COALESCE(agent.id, 0)")
      .addGroupBy("COALESCE(agent.name, '平台自营')");
    this.applyTenantScope(paidBuilder, "transaction", admin);
    this.applyFinanceTenantFilter(paidBuilder, query, admin, "transaction");
    const paidRows = await paidBuilder.getRawMany<{ agentId: string; agentName: string; transactionCount: string; paidAmount: string; pendingReconciliationCount: string }>();
    const refundBuilder = this.refunds
      .createQueryBuilder("refund")
      .leftJoin("refund.order", "order")
      .leftJoin("order.agent", "agent")
      .leftJoin("order.registration", "registration")
      .leftJoin("registration.activity", "activity")
      .select("COALESCE(agent.id, 0)", "agentId")
      .addSelect("COALESCE(SUM(CASE WHEN refund.status = 'completed' THEN refund.amount ELSE 0 END), 0)", "refundAmount")
      .where(query.agentId ? "agent.id = :agentId" : "1 = 1", { agentId: query.agentId })
      .groupBy("COALESCE(agent.id, 0)");
    this.applyTenantScope(refundBuilder, "refund", admin);
    this.applyFinanceTenantFilter(refundBuilder, query, admin, "refund");
    const refundRows = await refundBuilder.getRawMany<{ agentId: string; refundAmount: string }>();
    const refundMap = new Map(refundRows.map((row) => [Number(row.agentId), Number(row.refundAmount || 0)]));
    return paidRows.map((row) => {
      const paidAmount = Number(row.paidAmount || 0);
      const refundAmount = refundMap.get(Number(row.agentId)) || 0;
      return {
        agentId: Number(row.agentId) || null,
        agentName: row.agentName,
        transactionCount: Number(row.transactionCount || 0),
        paidAmount: paidAmount.toFixed(2),
        refundAmount: refundAmount.toFixed(2),
        netAmount: (paidAmount - refundAmount).toFixed(2),
        pendingReconciliationCount: Number(row.pendingReconciliationCount || 0)
      };
    });
  }

  private agentSettlementQuery(query: AgentSettlementQueryDto, admin?: AdminContext) {
    const builder = this.agentSettlements
      .createQueryBuilder("settlement")
      .leftJoinAndSelect("settlement.agent", "agent")
      .leftJoinAndSelect("settlement.tenant", "tenant")
      .leftJoinAndSelect("agent.tenant", "agentTenant")
      .select([
        "settlement.id", "settlement.settlementNo", "settlement.periodStart", "settlement.periodEnd", "settlement.transactionCount", "settlement.refundCount",
        "settlement.grossAmount", "settlement.refundAmount", "settlement.netAmount", "settlement.commissionRate", "settlement.commissionAmount", "settlement.payableAmount",
        "settlement.status", "settlement.generatedBy", "settlement.submittedAt", "settlement.reviewedBy", "settlement.reviewRemark", "settlement.reviewedAt",
        "settlement.paidBy", "settlement.paidReference", "settlement.paidProofUrl", "settlement.paidRemark", "settlement.paidAt", "settlement.createdAt", "settlement.updatedAt",
        "agent.id", "agent.name", "agent.region", "agent.enabled",
        "tenant.id", "tenant.code", "tenant.name", "tenant.enabled",
        "agentTenant.id", "agentTenant.code", "agentTenant.name", "agentTenant.enabled"
      ])
      .orderBy("settlement.createdAt", "DESC")
      .addOrderBy("settlement.id", "DESC");
    this.applyTenantScope(builder, "settlement", admin);
    if (!this.isTenantScoped(admin) && query.tenantId) builder.andWhere("COALESCE(tenant.id, agentTenant.id) = :tenantId", { tenantId: query.tenantId });
    if (query.agentId) builder.andWhere("agent.id = :agentId", { agentId: query.agentId });
    if (query.status) builder.andWhere("settlement.status = :status", { status: query.status });
    const keyword = query.keyword?.trim();
    if (keyword) builder.andWhere("(settlement.settlementNo LIKE :keyword OR agent.name LIKE :keyword OR agent.region LIKE :keyword OR settlement.paidReference LIKE :keyword)", { keyword: `%${keyword}%` });
    if (query.periodStart) builder.andWhere("settlement.periodEnd > :queryPeriodStart", { queryPeriodStart: this.parseDate(query.periodStart) });
    if (query.periodEnd) builder.andWhere("settlement.periodStart < :queryPeriodEnd", { queryPeriodEnd: this.parseDate(query.periodEnd) });
    if (query.periodStart && query.periodEnd && this.parseDate(query.periodEnd) <= this.parseDate(query.periodStart)) throw new BadRequestException("筛选结束时间必须晚于开始时间");
    return builder;
  }

  private hasAgentSettlementPermission(admin: AdminContext | undefined, permission: "agent_settlement.view" | "agent_settlement.manage" | "agent_settlement.pay" | "agent_settlement.transfer" | "agent_settlement.sensitive" | "agent_settlement.export") {
    return effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions }).includes(permission);
  }

  private assertAgentSettlementPermission(admin: AdminContext | undefined, permission: "agent_settlement.view" | "agent_settlement.manage" | "agent_settlement.pay" | "agent_settlement.transfer" | "agent_settlement.sensitive" | "agent_settlement.export") {
    if (!this.hasAgentSettlementPermission(admin, permission)) throw new ForbiddenException("当前账号无代理结算权限");
  }

  private hasMemberPermission(admin: AdminContext | undefined, permission: "member.view" | "member.manage" | "member.password" | "member.points.manage" | "member.lifecycle.manage" | "member.sensitive" | "member.export" | "member_point_rule.view" | "member_point_rule.manage") {
    return effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions }).includes(permission);
  }

  private assertMemberPermission(admin: AdminContext | undefined, permission: "member.view" | "member.manage" | "member.password" | "member.points.manage" | "member.lifecycle.manage" | "member.sensitive" | "member.export" | "member_point_rule.view" | "member_point_rule.manage") {
    if (!this.hasMemberPermission(admin, permission)) throw new ForbiddenException("当前账号无会员中心权限");
  }

  private async withMemberNamedLock<T>(lockKey: string, work: () => Promise<T>) {
    const predecessor = this.memberLockQueues.get(lockKey) || Promise.resolve();
    let releaseLocal!: () => void;
    const localHold = new Promise<void>((resolve) => { releaseLocal = resolve; });
    const queueTail = predecessor.catch(() => undefined).then(() => localHold);
    this.memberLockQueues.set(lockKey, queueTail);
    await predecessor.catch(() => undefined);
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      let acquired = false;
      try {
        const rows = await queryRunner.query("SELECT GET_LOCK(?, 10) AS acquired", [lockKey]);
        acquired = Number(rows?.[0]?.acquired || 0) === 1;
        if (!acquired) throw new BadRequestException("会员数据正在被其他操作处理，请稍后重试");
        return await work();
      } finally {
        if (acquired) await queryRunner.query("SELECT RELEASE_LOCK(?)", [lockKey]).catch(() => undefined);
        await queryRunner.release();
      }
    } finally {
      releaseLocal();
      if (this.memberLockQueues.get(lockKey) === queueTail) this.memberLockQueues.delete(lockKey);
    }
  }

  private publicAgentSettlement(row: AgentSettlement, includeSensitive: boolean) {
    return {
      id: row.id,
      settlementNo: row.settlementNo,
      agent: row.agent ? { id: row.agent.id, name: row.agent.name, region: row.agent.region, enabled: row.agent.enabled } : null,
      tenant: this.publicPaymentAccountTenant(row.tenant || row.agent?.tenant),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      transactionCount: row.transactionCount,
      refundCount: row.refundCount,
      grossAmount: row.grossAmount,
      refundAmount: row.refundAmount,
      netAmount: row.netAmount,
      commissionRate: row.commissionRate,
      commissionAmount: row.commissionAmount,
      payableAmount: row.payableAmount,
      status: row.status,
      generatedBy: includeSensitive ? row.generatedBy : row.generatedBy ? "***" : null,
      submittedAt: row.submittedAt,
      reviewedBy: includeSensitive ? row.reviewedBy : row.reviewedBy ? "***" : null,
      reviewRemark: row.reviewRemark,
      reviewedAt: row.reviewedAt,
      paidBy: includeSensitive ? row.paidBy : row.paidBy ? "***" : null,
      paidReference: includeSensitive ? row.paidReference : this.maskPaymentIdentifier(row.paidReference),
      paidProofUrl: includeSensitive ? row.paidProofUrl : null,
      paidRemark: includeSensitive ? row.paidRemark : row.paidRemark ? "***" : null,
      paidAt: row.paidAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sensitiveMasked: !includeSensitive
    };
  }

  private publicAgentSettlementTransaction(row: PaymentTransaction) {
    return {
      id: row.id,
      transactionNo: row.transactionNo,
      order: row.order ? { id: row.order.id, orderNo: row.order.orderNo } : null,
      provider: row.provider,
      amount: row.amount,
      status: row.status,
      reconciliationStatus: row.reconciliationStatus,
      createdAt: row.createdAt
    };
  }

  private publicAgentSettlementRefund(row: Refund) {
    return {
      id: row.id,
      refundNo: row.refundNo,
      order: row.order ? { id: row.order.id, orderNo: row.order.orderNo } : null,
      amount: row.amount,
      status: row.status,
      completedAt: row.completedAt,
      createdAt: row.createdAt
    };
  }

  private publicAgentSettlementTransfer(row: AgentSettlementTransfer, includeSensitive: boolean) {
    return {
      id: row.id,
      account: row.account ? { id: row.account.id, merchantName: row.account.merchantName, merchantNo: includeSensitive ? row.account.merchantNo : this.maskPaymentIdentifier(row.account.merchantNo) } : null,
      provider: row.provider,
      mode: row.mode,
      transferNo: row.transferNo,
      providerTransferNo: includeSensitive ? row.providerTransferNo : this.maskPaymentIdentifier(row.providerTransferNo),
      amount: row.amount,
      status: row.status,
      failureReason: includeSensitive ? row.failureReason : row.failureReason ? "转账失败，需敏感权限查看原因" : null,
      requestedBy: includeSensitive ? row.requestedBy : row.requestedBy ? "***" : null,
      requestedAt: row.requestedAt,
      syncedAt: row.syncedAt,
      completedAt: row.completedAt,
      retryCount: row.retryCount,
      nextQueryAt: row.nextQueryAt,
      remark: includeSensitive ? row.remark : row.remark ? "***" : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sensitiveMasked: !includeSensitive
    };
  }

  private publicAgentSettlementTransferResult(settlement: AgentSettlement, transfer: AgentSettlementTransfer, result: any, markedPaid: boolean, includeSensitive: boolean) {
    return {
      settlement: this.publicAgentSettlement(settlement, includeSensitive),
      transfer: this.publicAgentSettlementTransfer(transfer, includeSensitive),
      result: {
        provider: result?.provider || transfer.provider,
        mode: result?.mode || transfer.mode,
        status: result?.status || transfer.status,
        transferNo: result?.transferNo || transfer.transferNo,
        providerTransferNo: includeSensitive ? result?.providerTransferNo || null : this.maskPaymentIdentifier(result?.providerTransferNo),
        failureReason: includeSensitive ? result?.failureReason || null : result?.failureReason ? "转账失败，需敏感权限查看原因" : null,
        amount: result?.amount || transfer.amount
      },
      markedPaid
    };
  }

  private async updateAgentSettlementWithLock(id: number, admin: AdminContext, expectedStatus: AgentSettlement["status"], errorMessage: string, mutate: (settlement: AgentSettlement) => void) {
    return this.withAgentSettlementNamedLock(`agent-settlement:${id}`, () => this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AgentSettlement);
      const settlement = await repository.createQueryBuilder("settlement").leftJoinAndSelect("settlement.agent", "agent").leftJoinAndSelect("settlement.tenant", "tenant").setLock("pessimistic_write").where("settlement.id = :id", { id }).getOne();
      if (!settlement) throw new NotFoundException("代理结算单不存在");
      this.assertTenantAccess(settlement, admin);
      if (settlement.status !== expectedStatus) throw new BadRequestException(errorMessage);
      mutate(settlement);
      return repository.save(settlement);
    }));
  }

  private async withAgentSettlementNamedLock<T>(lockKey: string, work: () => Promise<T>) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    let acquired = false;
    try {
      const rows = await queryRunner.query("SELECT GET_LOCK(?, 10) AS acquired", [lockKey]);
      acquired = Number(rows?.[0]?.acquired || 0) === 1;
      if (!acquired) throw new BadRequestException("代理结算正在被其他操作处理，请稍后重试");
      return await work();
    } finally {
      if (acquired) await queryRunner.query("SELECT RELEASE_LOCK(?)", [lockKey]).catch(() => undefined);
      await queryRunner.release();
    }
  }

  private hasPaymentAccountPermission(admin: AdminContext | undefined, permission: "payment_account.view" | "payment_account.manage" | "payment_account.sensitive") {
    return effectivePermissionsForAdmin({ role: admin?.role, tenantId: admin?.tenantId, permissions: admin?.permissions }).includes(permission);
  }

  private assertPaymentAccountPermission(admin: AdminContext | undefined, permission: "payment_account.view" | "payment_account.manage" | "payment_account.sensitive") {
    if (!this.hasPaymentAccountPermission(admin, permission)) throw new ForbiddenException("当前账号无收款账户权限");
  }

  private async withPaymentAccountNamedLock<T>(lockKey: string, work: (manager: EntityManager) => Promise<T>) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    let acquired = false;
    try {
      const rows = await queryRunner.query("SELECT GET_LOCK(?, 5) AS acquired", [lockKey]);
      acquired = Number(rows?.[0]?.acquired || 0) === 1;
      if (!acquired) throw new BadRequestException("收款账户正在被其他操作处理，请稍后重试");
      await queryRunner.startTransaction();
      try {
        const result = await work(queryRunner.manager);
        await queryRunner.commitTransaction();
        return result;
      } catch (error) {
        if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
        throw error;
      }
    } finally {
      if (acquired) await queryRunner.query("SELECT RELEASE_LOCK(?)", [lockKey]).catch(() => undefined);
      await queryRunner.release();
    }
  }

  private publicPaymentAccountTenant(tenant?: Tenant | null) {
    return tenant ? { id: tenant.id, code: tenant.code, name: tenant.name, enabled: tenant.enabled } : null;
  }

  private publicPaymentAccountAgent(row: Agent, includeSensitive: boolean) {
    return {
      id: row.id,
      name: row.name,
      tenant: this.publicPaymentAccountTenant(row.tenant),
      parentAgent: row.parentAgent ? { id: row.parentAgent.id, name: row.parentAgent.name } : null,
      region: row.region,
      contactName: row.contactName,
      contactPhone: includeSensitive ? row.contactPhone : maskPhone(row.contactPhone),
      enabled: row.enabled,
      sensitiveMasked: !includeSensitive
    };
  }

  private publicAgentPaymentAccount(row: AgentPaymentAccount, includeSensitive: boolean, includeConfig: boolean) {
    const config = row.config && typeof row.config === "object" && !Array.isArray(row.config) ? row.config : null;
    return {
      id: row.id,
      agent: this.publicPaymentAccountAgent(row.agent, includeSensitive),
      tenant: this.publicPaymentAccountTenant(row.tenant || row.agent?.tenant),
      provider: row.provider,
      merchantName: row.merchantName,
      merchantNo: includeSensitive ? row.merchantNo : this.maskPaymentIdentifier(row.merchantNo),
      enabled: row.enabled,
      config: includeConfig ? this.maskPaymentConfig(config, includeSensitive) : null,
      configKeys: Object.keys(config || {}).sort(),
      configuredKeyCount: Object.values(config || {}).filter((value) => value !== undefined && value !== null && String(value).trim() !== "").length,
      sensitiveMasked: !includeSensitive
    };
  }

  private maskPaymentIdentifier(value?: string | null) {
    const text = String(value || "").trim();
    if (!text) return null;
    if (text.length <= 4) return "****";
    if (text.length <= 8) return `${text.slice(0, 2)}****${text.slice(-2)}`;
    return `${text.slice(0, 4)}****${text.slice(-4)}`;
  }

  private maskPaymentConfig(config: Record<string, unknown> | null, includeSensitiveIdentity = false) {
    if (!config) return null;
    const visit = (value: unknown, key = ""): unknown => {
      if (Array.isArray(value)) return value.map((item) => visit(item, key));
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, visit(child, childKey)]));
      if (value === null || value === undefined || value === "") return value;
      const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (normalizedKey.includes("secret") || normalizedKey.endsWith("key") || normalizedKey.includes("privatekey") || normalizedKey.includes("cert") || normalizedKey.includes("token") || normalizedKey.includes("password") || normalizedKey.includes("signature")) return "***";
      if (!includeSensitiveIdentity && /openid|payee|account|real.?name|merchant|mch.?id|app.?id|notify.?url/i.test(key)) return "***";
      return value;
    };
    return visit(config) as Record<string, unknown>;
  }

  private mergeMaskedPaymentConfig(existing: Record<string, unknown> | null, incoming: Record<string, unknown>) {
    const merge = (previous: unknown, next: unknown): unknown => {
      if (next === "***") return previous ?? "";
      if (Array.isArray(next)) return next.map((item, index) => merge(Array.isArray(previous) ? previous[index] : undefined, item));
      if (next && typeof next === "object") {
        const before = previous && typeof previous === "object" && !Array.isArray(previous) ? previous as Record<string, unknown> : {};
        return Object.fromEntries(Object.entries(next as Record<string, unknown>).map(([key, value]) => [key, merge(before[key], value)]));
      }
      return next;
    };
    return merge(existing || {}, incoming) as Record<string, unknown>;
  }

  private assertPaymentConfig(config?: Record<string, unknown>) {
    if (config === undefined) return;
    let serialized = "";
    try {
      serialized = JSON.stringify(config);
    } catch {
      throw new BadRequestException("支付配置必须是可序列化的 JSON 对象");
    }
    if (serialized.length > 32768) throw new BadRequestException("支付配置不能超过 32KB");
    for (const key of Object.keys(config)) if (!key.trim() || key.length > 100) throw new BadRequestException("支付配置字段名不能为空且不能超过 100 个字符");
  }

  private assertAgentSettlementConfig(config?: Record<string, unknown>) {
    if (config === undefined) return;
    let serialized = "";
    try {
      serialized = JSON.stringify(config);
    } catch {
      throw new BadRequestException("代理结算配置必须是可序列化的 JSON 对象");
    }
    if (serialized.length > 8192) throw new BadRequestException("代理结算配置不能超过 8KB");
    if (config.commissionRate !== undefined) {
      const rate = Number(config.commissionRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new BadRequestException("代理佣金比例必须在 0 到 100 之间");
    }
  }

  private async ensurePaymentTransaction(order: Order, provider: string, remark?: string) {
    const exists = await this.paymentTransactions.findOne({ where: { order: { id: order.id } } });
    if (exists) return exists;
    return this.paymentTransactions.save(
      this.paymentTransactions.create({
        order,
        tenant: order.tenant,
        transactionNo: order.transactionNo || `TX${Date.now()}${order.id}`,
        provider,
        paymentMethod: order.paymentMethod,
        amount: order.amount,
        status: "success",
        reconciliationStatus: "matched",
        remark: remark || null
      })
    );
  }

  private async requestProviderRefundIfNeeded(order: Order, refund: Refund, operator: string) {
    const provider = this.refundProviderForOrder(order);
    if (!provider) return null;
    if (this.config.get("REAL_PAYMENT_ENABLED", "false") !== "true") return null;
    if (this.config.get(provider === "wechat" ? "WECHAT_PAY_ENABLED" : "ALIPAY_ENABLED", "false") !== "true") return null;
    return this.paymentProvider.requestRefund({
      provider,
      order,
      refundNo: refund.refundNo,
      amount: refund.amount,
      reason: refund.reason,
      operator
    });
  }

  private refundProviderForOrder(order: Order): SupportedPaymentProvider | null {
    if (order.paymentMethod === PaymentMethod.Wechat) return "wechat";
    if (order.paymentMethod === PaymentMethod.Alipay) return "alipay";
    return null;
  }

  private paymentExpiresAt(price: number) {
    if (price <= 0) return null;
    const minutes = Math.max(Number(this.config.get("OFFLINE_PAYMENT_EXPIRE_MINUTES", 1440)), 1);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private isExpiredPendingOrder(order: Order) {
    return order.status === OrderStatus.PendingPayment && Boolean(order.expiresAt && order.expiresAt.getTime() <= Date.now());
  }

  private async closeExpiredOrder(order: Order, reason: string) {
    if (order.status !== OrderStatus.PendingPayment) return order;
    order.status = OrderStatus.Closed;
    order.closedAt = order.closedAt || new Date();
    order.closeReason = order.closeReason || reason;
    if (order.registration.status === RegistrationStatus.PendingPayment) {
      order.registration.status = RegistrationStatus.Cancelled;
      order.registration.cancelReason = reason;
      await this.registrations.save(order.registration);
    }
    const saved = await this.orders.save(order);
    await this.refundRedeemedPoints(saved, "订单超时关闭返还积分");
    return saved;
  }

  private startOrderCloseWorker() {
    if (this.config.get("ORDER_CLOSE_WORKER_ENABLED", "false") !== "true") return;
    const intervalSeconds = Math.max(Number(this.config.get("ORDER_CLOSE_WORKER_INTERVAL_SECONDS", 300)), 30);
    this.orderCloseTimer = setInterval(() => {
      this.closeExpiredPendingOrders().catch((error) => {
        console.error("Order close worker failed", error);
      });
    }, intervalSeconds * 1000);
  }

  private startActivityLifecycleWorker() {
    if (this.config.get("ACTIVITY_LIFECYCLE_WORKER_ENABLED", "false") !== "true") return;
    const intervalSeconds = Math.max(Number(this.config.get("ACTIVITY_LIFECYCLE_WORKER_INTERVAL_SECONDS", 60)), 30);
    this.activityLifecycleTimer = setInterval(() => {
      this.runActivityLifecycle().catch((error) => console.error("Activity lifecycle worker failed", error));
    }, intervalSeconds * 1000);
    this.orderCloseTimer?.unref();
    this.activityLifecycleTimer.unref();
  }

  private startMemberLifecycleWorker() {
    if (this.config.get("MEMBER_LIFECYCLE_WORKER_ENABLED", "true") !== "true") return;
    const intervalSeconds = Math.max(Number(this.config.get("MEMBER_LIFECYCLE_WORKER_INTERVAL_SECONDS", 3600)), 300);
    this.memberLifecycleTimer = setInterval(() => this.runMemberLifecycle().catch(error => console.error("Member lifecycle worker failed", error)), intervalSeconds * 1000);
    this.memberLifecycleTimer.unref();
  }

  private startAnalyticsRecomputeWorker() {
    if (this.config.get("ANALYTICS_RECOMPUTE_WORKER_ENABLED", "true") !== "true") return;
    const intervalSeconds = Math.max(Number(this.config.get("ANALYTICS_RECOMPUTE_INTERVAL_SECONDS", 3600)), 300);
    const schedule = () => this.scheduleAnalyticsRecomputeJobs().catch((error) => console.error("Analytics recompute scheduler failed", error));
    this.analyticsRecomputeTimer = setInterval(schedule, intervalSeconds * 1000);
    this.analyticsRecomputeTimer.unref();
    setTimeout(schedule, 15_000).unref();
  }

  private async scheduleAnalyticsRecomputeJobs() {
    const endDate = analyticsDateText(new Date());
    const startDate = analyticsDateText(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const tenants = await this.tenants.find({ where: { enabled: true }, select: { id: true } });
    const scopes: Array<number | null> = [null, ...tenants.map((tenant) => tenant.id)];
    for (const tenantId of scopes) {
      await this.businessJobs.publish({ tenantId, type: "analytics.daily-recompute", idempotencyKey: `analytics:${tenantId || "platform"}:${endDate}`, payload: { tenantId, startDate, endDate }, maxAttempts: 5 });
    }
  }

  private startBehaviorTagRefreshWorker() {
    if (this.config.get("MEMBER_BEHAVIOR_TAG_WORKER_ENABLED", "true") !== "true") return;
    const intervalSeconds = Math.max(Number(this.config.get("MEMBER_BEHAVIOR_TAG_WORKER_INTERVAL_SECONDS", 3600)), 300);
    const schedule = () => this.scheduleBehaviorTagRefreshJobs().catch((error) => console.error("Behavior tag refresh scheduler failed", error));
    this.behaviorTagRefreshTimer = setInterval(schedule, intervalSeconds * 1000);
    this.behaviorTagRefreshTimer.unref();
    setTimeout(schedule, 20_000).unref();
  }

  private async scheduleBehaviorTagRefreshJobs() {
    const tenants = await this.tenants.find({ where: { enabled: true }, select: { id: true } });
    const scopes: Array<number | null> = [null, ...tenants.map((tenant) => tenant.id)];
    const bucket = new Date().toISOString().slice(0, 13).replace(/[-T]/g, "");
    for (const tenantId of scopes) {
      const idempotencyKey = `behavior-tags:${tenantId || "platform"}:${bucket}`;
      await this.businessJobs.publish({ tenantId, type: "member-tags.behavior-refresh", idempotencyKey, payload: { tenantId, idempotencyKey }, maxAttempts: 5 });
    }
  }

  private async withActivityStats(activity: Activity) {
    const usedStatuses = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
    const registeredCount = await this.registrations.count({ where: { activity: { id: activity.id }, status: In(usedStatuses) } });
    return { ...activity, registeredCount, remainingSeats: Math.max(activity.capacity - registeredCount, 0) };
  }
}
