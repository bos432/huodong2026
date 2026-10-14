export enum ActivityStatus {
  Draft = "draft",
  PendingApproval = "pending_approval",
  Rejected = "rejected",
  Open = "open",
  Closed = "closed",
  Cancelled = "cancelled",
  Ended = "ended"
}

export enum RegistrationStatus {
  PendingPayment = "pending_payment",
  PendingReview = "pending_review",
  Approved = "approved",
  Rejected = "rejected",
  Cancelled = "cancelled",
  CheckedIn = "checked_in"
}

export enum OrderStatus {
  PendingPayment = "pending_payment",
  Paid = "paid",
  Refunded = "refunded",
  PartiallyRefunded = "partially_refunded",
  Cancelled = "cancelled",
  Closed = "closed"
}

export interface PublicSlowExperienceRecord {
  id: number;
  discovery: string;
  lightNote: string;
  feeling: string;
  photoUrl: string | null;
  visibility: "private" | "public_review";
  moderationStatus: "not_submitted" | "pending" | "approved" | "rejected";
  revision: number;
  reviewRemark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum PaymentMethod {
  Free = "free",
  Offline = "offline",
  Wechat = "wechat",
  Alipay = "alipay",
  Balance = "balance"
}

export enum FieldType {
  Text = "text",
  SingleChoice = "single_choice",
  MultipleChoice = "multiple_choice",
  Phone = "phone",
  IdCard = "id_card",
  Remark = "remark",
  Email = "email",
  Number = "number",
  Date = "date",
  DateTime = "date_time",
  Region = "region",
  Address = "address",
  Attachment = "attachment"
}

export const activityStatusText: Record<ActivityStatus, string> = {
  [ActivityStatus.Draft]: "草稿",
  [ActivityStatus.PendingApproval]: "待平台审核",
  [ActivityStatus.Rejected]: "已驳回",
  [ActivityStatus.Open]: "报名中",
  [ActivityStatus.Closed]: "已下架",
  [ActivityStatus.Cancelled]: "已取消",
  [ActivityStatus.Ended]: "已结束"
};

export const registrationStatusText: Record<RegistrationStatus, string> = {
  [RegistrationStatus.PendingPayment]: "待付款",
  [RegistrationStatus.PendingReview]: "待审核",
  [RegistrationStatus.Approved]: "报名成功",
  [RegistrationStatus.Rejected]: "已拒绝",
  [RegistrationStatus.Cancelled]: "已取消",
  [RegistrationStatus.CheckedIn]: "已签到"
};

export const orderStatusText: Record<OrderStatus, string> = {
  [OrderStatus.PendingPayment]: "待付款",
  [OrderStatus.Paid]: "已付款",
  [OrderStatus.Refunded]: "已退款",
  [OrderStatus.PartiallyRefunded]: "部分退款",
  [OrderStatus.Cancelled]: "已取消",
  [OrderStatus.Closed]: "已关闭"
};

export interface ActivityFieldOption {
  label: string;
  value: string;
}

export interface ActivityFieldDefinition {
  id?: number;
  label: string;
  type: FieldType;
  required: boolean;
  options?: ActivityFieldOption[];
  sortOrder: number;
}

export interface RegistrationAnswer {
  fieldId: number;
  label: string;
  type: FieldType;
  value: string | string[];
}

export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

/** Operator-facing lifecycle semantics for legacy business-job statuses. */
export type BusinessJobLifecycleState =
  | "queued"
  | "processing"
  | "succeeded"
  | "retrying"
  | "dead"
  | "cancelled";

export function businessJobLifecycleState(input: {
  status?: string | null;
  attemptCount?: number | null;
  lastError?: string | null;
}): BusinessJobLifecycleState {
  switch (input.status) {
    case "processing": return "processing";
    case "completed": return "succeeded";
    case "dead_letter": return "dead";
    case "cancelled": return "cancelled";
    case "pending":
      return Number(input.attemptCount ?? 0) > 0 || Boolean(String(input.lastError ?? "").trim())
        ? "retrying"
        : "queued";
    default: return "queued";
  }
}

export interface AdminBusinessJob {
  id: number;
  tenantId: number;
  type: string;
  idempotencyKey: string;
  status: string;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  lockedUntil?: string | null;
  lockedBy?: string | null;
  lastWorkerId?: string | null;
  lastStartedAt?: string | null;
  lastFinishedAt?: string | null;
  lastError?: string | null;
  requestId?: string | null;
  completedAt?: string | null;
  deadLetteredAt?: string | null;
  createdAt?: string | null;
}

export interface AdminBusinessJobPage {
  items: AdminBusinessJob[];
  total: number;
  page: number;
  pageSize: number;
}

export type HomepageSectionType =
  | "search_bar"
  | "hero"
  | "announcement_bar"
  | "quick_nav"
  | "category_grid"
  | "featured_activities"
  | "activity_tabs"
  | "activity_feed"
  | "testimonial_feed"
  | "featured_testimonials"
  | "activity_testimonials"
  | "charity_summary"
  | "course_recommendations"
  | "mall_showcase"
  | "brand_story_entry"
  | "image_banner"
  | "rich_text"
  | "bottom_nav"
  | "my_page"
  | "inner_pages";

export interface HomepageSectionView {
  id: number;
  pageKey: string;
  type: HomepageSectionType | string;
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  sortOrder: number;
  config: Record<string, unknown>;
  layout: Record<string, unknown>;
  data?: Record<string, unknown>;
}

/**
 * The persisted decoration order is authoritative across admin, H5 and
 * mini-program clients. Keep the id tie-breaker for legacy rows that share a
 * sort value, and place malformed/missing values after valid rows.
 */
export function sortHomepageSections<T extends { id?: number | string | null; sortOrder?: number | string | null }>(sections: T[]): T[] {
  return sections
    .map((section, index) => ({ section, index }))
    .sort((left, right) => {
      const leftSortValue = left.section.sortOrder;
      const rightSortValue = right.section.sortOrder;
      const leftSort = leftSortValue === null || leftSortValue === undefined || String(leftSortValue).trim() === "" ? Number.NaN : Number(leftSortValue);
      const rightSort = rightSortValue === null || rightSortValue === undefined || String(rightSortValue).trim() === "" ? Number.NaN : Number(rightSortValue);
      const leftValue = Number.isFinite(leftSort) ? leftSort : Number.MAX_SAFE_INTEGER;
      const rightValue = Number.isFinite(rightSort) ? rightSort : Number.MAX_SAFE_INTEGER;
      if (leftValue !== rightValue) return leftValue - rightValue;
      const leftId = Number(left.section.id);
      const rightId = Number(right.section.id);
      if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) return leftId - rightId;
      return left.index - right.index;
    })
    .map(({ section }) => section);
}

export interface HomepageTenantView {
  id: number;
  code: string;
  name: string;
  region: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
}

export type PublicTenantView = HomepageTenantView;

export interface HomepagePayload {
  sections: HomepageSectionView[];
  fallback: boolean;
  pageKey?: string;
  tenant?: HomepageTenantView | null;
}

export function escapeRichTextHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeRichTextUrl(value: unknown) {
  const url = String(value ?? "").trim().replace(/&amp;/g, "&");
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url)) return url;
  if (/^\/(uploads|assets|admin|pages)\//i.test(url)) return url;
  if (/^mailto:/i.test(url)) return url;
  return "";
}

/** Public activity fields used by discovery cards; intentionally excludes private registration data. */
export interface PublicActivitySummary {
  id: number;
  title: string;
  coverUrl?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  locationProvince?: string | null;
  locationCity?: string | null;
  locationDistrict?: string | null;
  price?: number | string | null;
  capacity?: number | null;
  registeredCount?: number | null;
  remainingSeats?: number | null;
  displayStatus?: string | null;
  status?: ActivityStatus | string | null;
  isTest?: boolean;
  category?: { id?: number; name?: string | null } | null;
}

/** Category data used by the public discovery filters. */
export interface PublicCategorySummary {
  id: number;
  name: string;
  sortOrder?: number | null;
  enabled?: boolean;
}

/** Backward-compatible list envelope; older deployments may return a bare array. */
export interface PublicActivityListResponse {
  items: PublicActivitySummary[];
  page?: number;
  pageSize?: number;
  total?: number;
  hasMore?: boolean;
}

/** Public operation switches consumed by discovery and booking pages. */
export interface PublicOperationSettings {
  registrationEnabled?: boolean;
  registrationDisabledMessage?: string | null;
  publicActivityArchiveEnabled?: boolean;
  paymentMethods?: Record<string, boolean>;
  offlinePaymentInstructions?: string | null;
}

export type PublicTicketSaleStatus = "available" | "sold_out" | "not_started" | "ended" | string;

export interface PublicTicketTypeSummary {
  id: number;
  name: string;
  price?: number | string | null;
  capacity?: number | null;
  remainingSeats?: number | null;
  perUserLimit?: number | null;
  saleStatus?: PublicTicketSaleStatus;
  active?: boolean;
  disabled?: boolean;
  earlyBirdPrice?: number | string | null;
  memberPrice?: number | string | null;
  tierPrices?: Array<Record<string, unknown>>;
}

export interface PublicQuoteResult {
  originalAmount?: number | string | null;
  payableAmount?: number | string | null;
  discountAmount?: number | string | null;
  memberDiscountAmount?: number | string | null;
  couponDiscountAmount?: number | string | null;
  pointsUsed?: number | null;
  pointsDiscountAmount?: number | string | null;
  availablePoints?: number | null;
  memberLevel?: { name?: string | null; [key: string]: unknown } | null;
  refundPolicy?: { enabled?: boolean; charityAmount?: number | string; refundAmount?: number | string; [key: string]: unknown } | null;
}

export interface PublicRegistrationSubmissionResult {
  waitlisted?: boolean;
  registration?: PublicRegistrationSummary | null;
  order?: PublicOrderSummary | null;
  waitlist?: Record<string, unknown> | null;
}

export interface PublicCouponSummary {
  id: number;
  code?: string | null;
  name?: string | null;
  remainingUses?: number | null;
  discountType?: string | null;
  discountValue?: number | string | null;
  minAmount?: number | string | null;
}

export interface PublicRefundSummary {
  id: number;
  orderId?: number | null;
  refundNo?: string | null;
  amount?: number | string | null;
  amountFen?: number | null;
  status?: string | null;
  reviewRemark?: string | null;
  failureReason?: string | null;
  createdAt?: string | null;
}

export interface PublicCharityRefundSummary {
  enabled?: boolean;
  terminal?: boolean;
  canRequest?: boolean;
  charityAmount?: number | string | null;
  refundAmount?: number | string | null;
  actualRefundAmount?: number | string | null;
  pendingRefund?: PublicRefundSummary | null;
  [key: string]: unknown;
}

export interface PublicRegistrationDetailResponse {
  registration: PublicMemberRegistrationRecord;
  order?: PublicMemberOrderRecord | null;
  refunds?: PublicRefundSummary[];
  charityRefund?: PublicCharityRefundSummary | null;
  operationSetting?: PublicOperationSettings | null;
  groupQrCodeUrl?: string | null;
}

export interface PublicCheckInCodeResult {
  code: string;
  expiresAt?: string | null;
  activityId: number;
  registrationId: number;
}

export interface PublicPaymentMutationResult {
  order?: PublicMemberOrderRecord | null;
  transaction?: Record<string, unknown> | null;
  walletTransaction?: Record<string, unknown> | null;
  idempotent?: boolean;
}

export interface PublicPaymentRequestResult {
  mode?: string;
  amount?: number | string | null;
  payParams?: {
    h5Url?: string;
    formBody?: string;
    gatewayUrl?: string;
    tradeType?: string;
    package?: string;
    codeUrl?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface PublicPaymentStatusResult {
  provider?: string | null;
  mode?: string | null;
  orderNo?: string | null;
  transactionNo?: string | null;
  amount?: number | string | null;
  amountFen?: number | null;
  status?: "success" | "pending" | "closed" | string;
  localOrder?: PublicMemberOrderRecord | null;
}

export interface PublicMemberOrderRecord extends PublicOrderSummary {
  amount?: number | string | null;
  amountFen?: number | null;
  originalAmount?: number | string | null;
  expiresAt?: string | null;
  closedAt?: string | null;
  closeReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  ticketType?: Record<string, unknown> | null;
  coupon?: Record<string, unknown> | null;
  memberLevel?: Record<string, unknown> | null;
}

/** Minimal public course fields consumed by the member learning/order surfaces. */
export interface PublicLearningSummary {
  id?: number;
  progress?: number | string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
  completionThreshold?: number | null;
  recentLesson?: { id?: number; title?: string | null; progress?: number | string | null; updatedAt?: string | null } | null;
}

export interface PublicCourseSummary {
  id: number;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  teacherName?: string | null;
  teacherAvatar?: string | null;
  categoryId?: number | null;
  price?: number | string | null;
  originalPrice?: number | string | null;
  accessMode?: string | null;
  completionThreshold?: number | null;
  rating?: number | string | null;
  reviewCount?: number | null;
  status?: string | null;
  tags?: string[] | null;
  learning?: PublicLearningSummary | null;
  tenant?: TenantContext | null;
}

/** Public course order fields; payment provider credentials are intentionally absent. */
export interface PublicCourseOrderRecord {
  id: number;
  orderNo?: string | null;
  amount?: number | string | null;
  amountFen?: number | null;
  paymentMethod?: PaymentMethod | string | null;
  status: string;
  transactionNo?: string | null;
  paidAt?: string | null;
  expiresAt?: string | null;
  closedAt?: string | null;
  closeReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  course?: PublicCourseSummary | null;
  owned?: boolean;
  latestRefund?: PublicRefundSummary | null;
  refundedAmountFen?: number | null;
  refundableAmountFen?: number | null;
}

export interface PublicMemberRegistrationRecord extends PublicRegistrationSummary {
  answers?: RegistrationAnswer[];
  formSchemaVersion?: number | null;
  formSnapshot?: Array<Record<string, unknown>>;
  companions?: Array<Record<string, unknown>>;
  reviewRemark?: string | null;
  cancelReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  order?: PublicMemberOrderRecord | null;
  latestRefund?: PublicRefundSummary | null;
}

export interface PublicMemberAccessSnapshot {
  eligible?: boolean;
  loginRequired?: boolean;
  message?: string | null;
  requiredLevel?: unknown;
  currentLevel?: unknown;
  priorityActive?: boolean;
}

export interface PublicActivitySpaceAccess {
  canAccess?: boolean;
  [key: string]: unknown;
}

export interface PublicOrganizerTrust {
  followed?: boolean;
  followerCount?: number;
  [key: string]: unknown;
}

export interface PublicActivityDetail extends PublicActivitySummary {
  gallery?: string[];
  attendees?: Array<{ id: number; name: string; avatarUrl?: string | null; checkedIn?: boolean }>;
  description?: string | null;
  notice?: string | null;
  shareTitle?: string | null;
  shareImageUrl?: string | null;
  registrationDeadline?: string | null;
  waitingCount?: number | null;
  bookingDisabledReason?: string | null;
  hasGroupQrCode?: boolean;
  minMemberLevel?: unknown;
  memberAccess?: PublicMemberAccessSnapshot | null;
  organizerTrust?: PublicOrganizerTrust | null;
  refundInstructions?: string | null;
  requireReview?: boolean;
  space?: PublicActivitySpaceAccess | null;
  hosts?: Array<Record<string, unknown>>;
  sections?: Array<Record<string, unknown>>;
  reviews?: Array<Record<string, unknown>>;
  relatedActivities?: PublicActivitySummary[];
  seriesActivities?: PublicActivitySummary[];
  myBooking?: PublicRegistrationSummary | null;
  tenant?: TenantContext | null;
  fields?: ActivityFieldDefinition[];
  ticketTypes?: PublicTicketTypeSummary[];
  eligibilityRules?: {
    requirePrivacyConsent?: boolean;
    allowCompanions?: boolean;
    maxCompanions?: number | null;
    [key: string]: unknown;
  } | null;
  locationLatitude?: number | string | null;
  locationLongitude?: number | string | null;
  locationMapUrl?: string | null;
}

export interface PublicInvitePosterResult {
  code?: string | null;
  inviteText?: string | null;
}

export interface PublicOrganizerFollowResult {
  followed: boolean;
  followerCount?: number | null;
}

export interface PublicActivitySpaceResponse {
  activity: {
    id: number;
    title: string;
    coverUrl?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    locationLatitude?: number | string | null;
    locationLongitude?: number | string | null;
    locationMapUrl?: string | null;
    groupQrCodeUrl?: string | null;
    hasGroupQrCode?: boolean;
    hosts?: Array<Record<string, unknown>>;
  };
  stats: { participantCount?: number; remainingSeats?: number | null };
  announcements: Array<{ id: number; title: string; content: string; pinned?: boolean; publishAt?: string | null; createdAt?: string | null }>;
  participants: Array<{ nickname: string; avatarUrl?: string | null; checkedIn?: boolean }>;
  posts: PublicActivitySpacePost[];
  checkIn: { available: boolean; checkedIn?: boolean; registrationId?: number | null };
}

export interface PublicActivitySpacePost {
  id: number;
  content: string;
  createdAt?: string | null;
  adminReply?: string | null;
  mine?: boolean;
  status?: string;
  user: { nickname: string; avatarUrl?: string | null };
}

/** Public community records returned by the member interaction pages. */
export interface PublicCommunityPostSummary {
  id: number;
  userId?: number | null;
  content: string;
  images?: string[];
  likes?: number;
  comments?: number;
  shareCount?: number;
  favoriteCount?: number;
  source?: string | null;
  status?: string | null;
  city?: string | null;
  tags?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  liked?: boolean;
  favorited?: boolean;
  following?: boolean;
  activity?: Pick<PublicActivitySummary, "id" | "title" | "coverUrl" | "startTime" | "endTime" | "location"> | null;
}

export interface PublicCommunityNotificationRecord {
  id: number;
  type?: string | null;
  postId?: number | null;
  commentId?: number | null;
  title: string;
  content: string;
  readAt?: string | null;
  createdAt?: string | null;
}

/** Delivered, user-owned site message; excludes provider diagnostics and credentials. */
export interface PublicMemberNotificationRecord {
  id: number;
  scene?: string | null;
  title: string;
  content: string;
  activityId?: number | null;
  readAt?: string | null;
  createdAt?: string | null;
}

export interface PublicMemberHostApplication {
  id: number;
  status: "pending" | "contacted" | "screened" | "interview" | "approved" | "activated" | "rejected";
  name: string;
  city: string;
  expertise: string;
  experience: string;
  submittedAt: string;
  updatedAt: string;
}

export interface PublicMemberHostApplicationResponse {
  application: PublicMemberHostApplication | null;
  canAccessWorkspace: boolean;
}

export interface PublicCommunityFollowRecord {
  id: number;
  followedName: string;
  createdAt?: string | null;
}

export interface PublicContentSanctionRecord {
  id: number;
  scope?: string | null;
  type?: string | null;
  status: string;
  reason: string;
  sourceType?: string | null;
  sourceId?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  revokedAt?: string | null;
  revokeRemark?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PublicContentAppealRecord {
  id: number;
  sanctionId?: number | null;
  targetType?: string | null;
  targetId?: number | null;
  reason: string;
  evidenceUrls?: string[];
  status: string;
  handleRemark?: string | null;
  handledAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PublicContentAppealSubmissionResult extends PublicContentAppealRecord {
  idempotent?: boolean;
}

/** Tenant context carried across public requests; it never contains credentials. */
export interface TenantContext {
  id?: number | null;
  code?: string | null;
  name?: string | null;
  host?: string | null;
}

/** Masked member identity used by activity spaces and organizer summaries. */
export interface MemberSnapshot {
  id: number;
  displayName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  maskedPhone?: string | null;
  tenant?: TenantContext | null;
}

/** Public registration state used by the member center and activity-space gates. */
export interface PublicRegistrationSummary {
  id: number;
  activityId?: number | null;
  activity?: PublicActivitySummary | null;
  status: RegistrationStatus | string;
  orderId?: number | null;
  orderStatus?: OrderStatus | string | null;
  checkedInAt?: string | null;
  canEnterSpace?: boolean;
  canReview?: boolean;
  tenant?: TenantContext | null;
}

export interface PublicMemberBenefit {
  key?: string | null;
  name?: string | null;
  [key: string]: unknown;
}

export interface PublicMemberProfile {
  id: number;
  phone?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  sourceChannel?: string | null;
  lastLoginChannel?: string | null;
  wechatBound?: boolean;
  wechatAppId?: string | null;
  hasPassword?: boolean;
  memberLevel?: { id?: number; name?: string | null; benefits?: PublicMemberBenefit[] | null; [key: string]: unknown } | null;
  points?: number;
  growthValue?: number;
  nextLevel?: { id?: number; name?: string | null; minGrowth?: number; remainingGrowth?: number } | null;
  memberScope?: TenantContext & { tenantId?: number | null };
}

export interface PublicWalletSummary {
  id?: number | null;
  tenant?: TenantContext | null;
  availableBalance?: string | number | null;
  frozenBalance?: string | number | null;
  giftBalance?: string | number | null;
  frozenGiftBalance?: string | number | null;
  totalRecharge?: string | number | null;
  totalSpent?: string | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PublicAdminAccess {
  canAccess: boolean;
  role?: string | null;
  tenantId?: number | null;
  tenantName?: string | null;
}

export interface PublicCharitySummary {
  totalAmount?: string | number | null;
  totalCount?: number;
  [key: string]: unknown;
}

export interface PublicMallMembershipSummary {
  id?: number;
  merchant?: { id?: number; name?: string | null; [key: string]: unknown } | null;
  memberDiscountText?: string | null;
  expiresAt?: string | null;
  isMember?: boolean;
  [key: string]: unknown;
}

export interface PublicMallMembershipResponse {
  enabled?: boolean;
  isMember?: boolean;
  status?: string | null;
  memberships: PublicMallMembershipSummary[];
}

/** Public order state; payment credentials and provider secrets are intentionally excluded. */
export interface PublicOrderSummary {
  id: number;
  orderNo?: string | null;
  activityId?: number | null;
  registrationId?: number | null;
  status: OrderStatus | string;
  paymentMethod?: PaymentMethod | string | null;
  totalAmount?: number | string | null;
  payableAmount?: number | string | null;
  paidAt?: string | null;
  refundStatus?: string | null;
  tenant?: TenantContext | null;
}

export type NotificationChannel = "site" | "sms" | "wechat" | "email";

export type NotificationScene =
  | "registrationSubmitted"
  | "registrationApproved"
  | "registrationRejected"
  | "paymentSucceeded"
  | "refundSucceeded"
  | "refundRejected"
  | "activityCancelled"
  | "activityChanged"
  | "checkInSucceeded"
  | "activityReminder"
  | "reviewInvitation"
  | "certificateAvailable"
  | "activityRecommendations"
  | "returnVisitReminder";

/** Sanitized notification record shown in the member center or admin monitor. */
export interface PublicNotificationRecord {
  id: number;
  scene: NotificationScene | string;
  channel: NotificationChannel | string;
  status: "pending" | "sent" | "failed" | "cancelled" | string;
  title?: string | null;
  content?: string | null;
  sentAt?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
  tenant?: TenantContext | null;
}

/** Shared admin notification center contracts. Sensitive delivery fields are nullable when masked. */
export interface AdminNotificationUser {
  id: number;
  nickname?: string | null;
  phone?: string | null;
  sensitiveMasked?: boolean;
}

export interface AdminNotificationActivityOption {
  id: number;
  title: string;
  status?: string | null;
  tenant?: TenantContext | null;
}

export interface AdminNotificationTagOption {
  name: string;
  color?: string | null;
  count: number;
}

export interface AdminNotificationOptions {
  activities: AdminNotificationActivityOption[];
  tags: AdminNotificationTagOption[];
}

export type NotificationApprovalStatus = "draft" | "pending" | "approved" | "rejected" | "retired";

export interface AdminNotificationTemplate {
  id: number;
  name: string;
  channel: NotificationChannel | string;
  scene?: NotificationScene | string | null;
  title: string;
  content: string;
  enabled: boolean;
  providerTemplateId?: string | null;
  approvalStatus?: NotificationApprovalStatus | string | null;
  version?: number;
  dataKeys?: Record<string, string> | null;
  page?: string | null;
  versionCount?: number;
  tenant?: TenantContext | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminNotificationScheduleActivity extends AdminNotificationActivityOption {}

export interface AdminNotificationScheduleTemplate {
  id: number;
  name: string;
  channel: NotificationChannel | string;
  enabled: boolean;
}

export interface AdminNotificationSchedule {
  id: number;
  name: string;
  channel: NotificationChannel | string;
  beforeHours: number;
  enabled: boolean;
  title?: string | null;
  content?: string | null;
  remark?: string | null;
  lastRunAt?: string | null;
  lastSentCount?: number;
  lastFailedCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  activity?: AdminNotificationScheduleActivity | null;
  template?: AdminNotificationScheduleTemplate | null;
}

export interface AdminNotificationProviderStatus {
  channel: NotificationChannel | string;
  provider: string;
  enabled: boolean;
  ready: boolean;
  missing: string[];
}

export interface AdminNotificationRecord {
  id: number;
  channel: NotificationChannel | string;
  scene?: NotificationScene | string | null;
  tenantScopeKey?: string | null;
  title: string;
  content: string;
  status: "pending" | "sent" | "failed" | "suppressed" | "cancelled" | string;
  provider?: string | null;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  providerTemplateId?: string | null;
  templateVersion?: number | null;
  suppressedReason?: string | null;
  variablesSnapshot?: Record<string, string>;
  retryCount?: number;
  sentAt?: string | null;
  failedAt?: string | null;
  user?: AdminNotificationUser | null;
  activity?: AdminNotificationActivityOption | null;
  remark?: string | null;
  sensitiveMasked?: boolean;
  createdAt?: string | null;
}

export interface AdminNotificationsPage {
  items: AdminNotificationRecord[];
  total: number;
  page: number;
  pageSize: number;
  sensitiveMasked?: boolean;
}

export interface AdminNotificationPreference {
  id: number;
  user?: AdminNotificationUser | null;
  tenantScopeKey: string;
  channel: NotificationChannel | string;
  subscribed: boolean;
  reason?: string | null;
  unsubscribedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  sensitiveMasked?: boolean;
}

export interface AdminNotificationPreferencesPage {
  items: AdminNotificationPreference[];
  total: number;
  page: number;
  pageSize: number;
  sensitiveMasked?: boolean;
}

export interface AdminNotificationMonitor {
  status: Record<string, number>;
  channels: Record<string, number>;
  retries: number;
  recent24h: number;
  jobs: Record<string, number>;
  generatedAt?: string | null;
}

export interface AdminNotificationPreview {
  channel: NotificationChannel | string;
  title: string;
  content: string;
  variables: Record<string, string>;
  sensitiveMasked?: boolean;
}

export interface AdminNotificationDeliveryResult {
  id?: number;
  status: string;
  channel: NotificationChannel | string;
  provider?: string | null;
  errorMessage?: string | null;
  suppressedReason?: string | null;
  providerMessageId?: string | null;
}

export interface AdminNotificationBatchResult {
  matchedCount: number;
  sentCount: number;
  failedCount: number;
}

export interface AdminNotificationScheduleRunResult {
  dueCount: number;
}

export interface AdminNotificationTemplateVersions {
  templateId: number;
  currentVersion?: number;
  versions: Array<Partial<AdminNotificationTemplate> & { changedAt?: string; changedBy?: string }>;
}

export interface PostEventAutomationSettings {
  enabled: boolean;
  reviewInvitation: boolean;
  certificateAvailable: boolean;
  activityRecommendations: boolean;
  returnVisitReminders: boolean;
  recallDays: number[];
  delayHours: number;
}

const SAFE_RICH_TEXT_HTML_TAGS = new Set([
  "a", "article", "b", "blockquote", "br", "caption", "code", "div", "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "hr", "i", "img", "li", "ol", "p", "pre", "s", "small", "span", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul"
]);
const SAFE_RICH_TEXT_VOID_HTML_TAGS = new Set(["br", "hr", "img"]);
const SAFE_RICH_TEXT_STYLE_PROPERTIES = new Set([
  "background", "background-color", "border", "border-bottom", "border-color", "border-left", "border-radius", "border-right", "border-style", "border-top", "border-width", "color", "display", "font-size", "font-style", "font-weight", "height", "line-height", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top", "max-width", "min-height", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top", "text-align", "text-decoration", "vertical-align", "white-space", "width", "word-break"
]);

function safeRichTextStyle(value: string) {
  return value.split(";").map((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator < 1) return "";
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const styleValue = declaration.slice(separator + 1).trim();
    if (!SAFE_RICH_TEXT_STYLE_PROPERTIES.has(property) || !styleValue) return "";
    if (/[<>]|expression\s*\(|url\s*\(|@import|behavior\s*:|-moz-binding/i.test(styleValue)) return "";
    return `${property}:${styleValue}`;
  }).filter(Boolean).join(";");
}

/** Sanitizes the limited HTML layout blocks inserted by the admin editor. */
export function sanitizeRichTextHtml(value: unknown) {
  const source = String(value ?? "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  return source.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, rawTag: string, rawAttributes: string) => {
    const tag = rawTag.toLowerCase();
    if (!SAFE_RICH_TEXT_HTML_TAGS.has(tag)) return "";
    if (match.startsWith("</")) return SAFE_RICH_TEXT_VOID_HTML_TAGS.has(tag) ? "" : `</${tag}>`;

    const attributes: string[] = [];
    const sourceAttributes = String(rawAttributes || "");
    const readAttribute = (name: string) => {
      const result = new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))", "i").exec(sourceAttributes);
      return result ? result[1] ?? result[2] ?? result[3] ?? "" : "";
    };
    const style = safeRichTextStyle(readAttribute("style"));
    if (style) attributes.push(`style=\"${escapeRichTextHtml(style)}\"`);
    const title = readAttribute("title");
    if (title) attributes.push(`title=\"${escapeRichTextHtml(title)}\"`);
    if (tag === "a") {
      const href = safeRichTextUrl(readAttribute("href"));
      if (href) attributes.push(`href=\"${escapeRichTextHtml(href)}\"`);
    }
    if (tag === "img") {
      const src = safeRichTextUrl(readAttribute("src"));
      if (!src) return "";
      attributes.push(`src=\"${escapeRichTextHtml(src)}\"`);
      const alt = readAttribute("alt");
      if (alt) attributes.push(`alt=\"${escapeRichTextHtml(alt)}\"`);
    }
    if (["table", "td", "th"].includes(tag)) {
      for (const name of ["colspan", "rowspan", "width", "height", "align"]) {
        const attribute = readAttribute(name);
        if (attribute && /^[a-z0-9.% -]+$/i.test(attribute)) attributes.push(`${name}=\"${escapeRichTextHtml(attribute)}\"`);
      }
    }
    return `<${tag}${attributes.length ? ` ${attributes.join(" ")}` : ""}>`;
  });
}

function inlineMarkdownToHtml(value: string) {
  let html = escapeRichTextHtml(value);
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const safeUrl = safeRichTextUrl(url);
    if (!safeUrl) return escapeRichTextHtml(alt);
    return `<img src="${escapeRichTextHtml(safeUrl)}" alt="${escapeRichTextHtml(alt)}" style="max-width:100%;border-radius:8px;margin:8px 0;display:block;" />`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = safeRichTextUrl(url);
    if (!safeUrl) return escapeRichTextHtml(label);
    return `<a href="${escapeRichTextHtml(safeUrl)}" style="color:#0f766e;text-decoration:underline;">${label}</a>`;
  });
  html = html.replace(/`([^`]+)`/g, "<code style=\"padding:2px 5px;border-radius:4px;background:#f2f4f7;color:#b42318;font-family:monospace;\">$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

export function markdownToRichTextHtml(markdown: unknown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;
  let rawHtmlCode = false;
  let listTag: "ul" | "ol" | null = null;

  const closeList = () => {
    if (!listTag) return;
    html.push("</" + listTag + ">");
    listTag = null;
  };
  const openList = (tag: "ul" | "ol") => {
    if (listTag === tag) return;
    closeList();
    html.push("<" + tag + ' style="margin:10px 0 12px;padding-left:22px;color:#344054;font-size:15px;line-height:1.8;">');
    listTag = tag;
  };

  const paragraphStyle = "margin:0 0 13px;color:#344054;font-size:15px;line-height:1.85;white-space:normal;word-break:break-word;";

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim().startsWith("```")) {
      if (inCode) {
        if (rawHtmlCode) html.push(sanitizeRichTextHtml(codeLines.join("\n")));
        else html.push(`<pre style="margin:10px 0;padding:10px;border-radius:8px;background:#111827;color:#f9fafb;overflow:auto;white-space:pre-wrap;font-size:13px;line-height:1.55;"><code>${escapeRichTextHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
        rawHtmlCode = false;
      } else {
        closeList();
        inCode = true;
        rawHtmlCode = /^```html\s*$/i.test(line.trim());
      }
      continue;
    }
    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (/^([-*_])\1\1+$/.test(line.trim())) {
      closeList();
      html.push('<hr style="border:0;border-top:1px solid #d0d5dd;margin:18px 0;" />');
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      closeList();
      const size = heading[1].length === 1 ? 22 : heading[1].length === 2 ? 19 : 17;
      html.push(`<h${heading[1].length} style="margin:20px 0 10px;color:#172b4d;font-size:${size}px;line-height:1.35;font-weight:800;">${inlineMarkdownToHtml(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    const quote = /^>\s?(.+)$/.exec(line.trim());
    if (quote) {
      closeList();
      html.push(`<blockquote style="margin:10px 0;padding:8px 10px;border-left:3px solid #0f766e;background:#ecfdf5;color:#344054;border-radius:6px;">${inlineMarkdownToHtml(quote[1])}</blockquote>`);
      continue;
    }
    const unorderedList = /^[-*]\s+(.+)$/.exec(line.trim());
    const orderedList = /^\d+\.\s+(.+)$/.exec(line.trim());
    if (unorderedList || orderedList) {
      openList(unorderedList ? "ul" : "ol");
      html.push('<li style="margin:4px 0;">' + inlineMarkdownToHtml((unorderedList || orderedList)![1]) + "</li>");
      continue;
    }
    closeList();
    html.push(`<p style="${paragraphStyle}">${inlineMarkdownToHtml(line.trim())}</p>`);
  }
  if (inCode) {
    if (rawHtmlCode) html.push(sanitizeRichTextHtml(codeLines.join("\n")));
    else html.push(`<pre style="margin:10px 0;padding:10px;border-radius:8px;background:#111827;color:#f9fafb;overflow:auto;white-space:pre-wrap;font-size:13px;line-height:1.55;"><code>${escapeRichTextHtml(codeLines.join("\n"))}</code></pre>`);
  }
  closeList();
  return html.join("");
}

export function markdownToPlainText(markdown: unknown, maxLength = 120) {
  let text = String(markdown ?? "")
    .replace(/```[\s\S]*?```/g, " 代码片段 ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1 图片 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (maxLength > 0 && text.length > maxLength) text = `${text.slice(0, maxLength - 1)}…`;
  return text;
}

export type ActivityComplianceSeverity = "blocking" | "warning";

export interface ActivityComplianceIssue {
  severity: ActivityComplianceSeverity;
  field: string;
  keyword: string;
  message: string;
  suggestion: string;
}

export interface ActivityComplianceInput {
  title?: string | null;
  description?: string | null;
  notice?: string | null;
  sections?: Array<{ title?: string | null; content?: string | null }>;
}

const ACTIVITY_BLOCKING_COMPLIANCE_KEYWORDS = [
  "算命",
  "改运",
  "改命",
  "破灾",
  "消灾",
  "做法事",
  "法事",
  "预测财富",
  "预测婚姻",
  "预测疾病",
  "保证结果",
  "保证有效",
  "百分百有效",
  "100%有效",
  "100％有效",
  "包治",
  "治愈",
  "根治"
];

const ACTIVITY_WARNING_COMPLIANCE_KEYWORDS = [
  "预测",
  "转运",
  "开运",
  "招财",
  "旺财",
  "催财",
  "命理",
  "八字",
  "占卜",
  "塔罗",
  "风水",
  "疗愈",
  "治病",
  "排毒",
  "保证提升",
  "保证通过",
  "包过",
  "稳赚",
  "保本",
  "无风险"
];

const ACTIVITY_COMPLIANCE_NEGATION_PATTERN = /(不涉及|不提供|不做|不含|禁止|不得|严禁|避免|不承诺|非)/;

function splitComplianceSentences(text: string) {
  return text
    .split(/[。！？!?；;\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sentenceShouldSkipCompliance(sentence: string) {
  return ACTIVITY_COMPLIANCE_NEGATION_PATTERN.test(sentence);
}

function collectActivityComplianceText(input: ActivityComplianceInput) {
  const rows: Array<{ field: string; text: string }> = [
    { field: "活动标题", text: input.title || "" },
    { field: "活动介绍", text: input.description || "" },
    { field: "报名须知", text: input.notice || "" }
  ];
  for (const section of input.sections || []) {
    rows.push({ field: `详情模块：${section.title || "未命名"}`, text: section.content || "" });
  }
  return rows;
}

export function checkActivityContentCompliance(input: ActivityComplianceInput) {
  const issues: ActivityComplianceIssue[] = [];
  const seen = new Set<string>();

  const addIssue = (severity: ActivityComplianceSeverity, field: string, keyword: string) => {
    const key = `${severity}:${field}:${keyword}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({
      severity,
      field,
      keyword,
      message:
        severity === "blocking"
          ? `「${field}」含有高风险表述「${keyword}」，请改为东方哲学、传统文化、民俗文化或文化活动类表达。`
          : `「${field}」含有需人工确认的表述「${keyword}」，建议弱化为文化解读、体验参与或生活方式表达。`,
      suggestion: "建议使用：易经文化、民俗文化、节气文化、传统哲学、国学经典解读、书法美育、亲子沟通等合规表述。"
    });
  };

  for (const row of collectActivityComplianceText(input)) {
    for (const sentence of splitComplianceSentences(row.text)) {
      if (sentenceShouldSkipCompliance(sentence)) continue;
      for (const keyword of ACTIVITY_BLOCKING_COMPLIANCE_KEYWORDS) {
        if (sentence.includes(keyword)) addIssue("blocking", row.field, keyword);
      }
      for (const keyword of ACTIVITY_WARNING_COMPLIANCE_KEYWORDS) {
        if (sentence.includes(keyword)) addIssue("warning", row.field, keyword);
      }
    }
  }

  return {
    passed: !issues.some((issue) => issue.severity === "blocking"),
    issues,
    blockingIssues: issues.filter((issue) => issue.severity === "blocking"),
    warningIssues: issues.filter((issue) => issue.severity === "warning")
  };
}
