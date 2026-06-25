import { ActivityStatus, FieldType, OrderStatus, PaymentMethod, RegistrationAnswer } from "../../shared/domain";
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Length, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AdminRole } from "./admin-roles";

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

export class SupportQueryDto {
  @IsString()
  keyword!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;
}

export class CategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsBoolean()
  publicVisible?: boolean;

  @IsOptional()
  @IsString()
  scene?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class AgentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  settlementConfig?: Record<string, unknown>;
}

export class AgentPaymentAccountDto {
  @IsInt()
  agentId!: number;

  @IsEnum(PaymentMethod)
  provider!: PaymentMethod;

  @IsOptional()
  @IsString()
  merchantName?: string;

  @IsOptional()
  @IsString()
  merchantNo?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class AgentSettlementGenerateDto {
  @IsInt()
  agentId!: number;

  @IsString()
  @IsNotEmpty()
  periodStart!: string;

  @IsString()
  @IsNotEmpty()
  periodEnd!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class AgentSettlementQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentId?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class AgentSettlementPayDto {
  @IsOptional()
  @IsString()
  paidReference?: string;

  @IsOptional()
  @IsString()
  paidProofUrl?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class AgentSettlementSandboxTransferDto {
  @IsOptional()
  @IsString()
  provider?: "wechat" | "alipay";

  @IsOptional()
  @IsString()
  simulateStatus?: "success" | "failed";

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class AmbassadorSettingDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class AmbassadorCaseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  metrics?: string;

  @IsOptional()
  @IsString()
  quote?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class AmbassadorApplicationQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class AmbassadorApplicationStatusDto {
  @IsString()
  @IsIn(["pending", "contacted", "screened", "interview", "approved", "activated", "rejected"])
  status!: "pending" | "contacted" | "screened" | "interview" | "approved" | "activated" | "rejected";

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsString()
  @IsIn(["low", "normal", "high"])
  priority?: "low" | "normal" | "high";

  @IsOptional()
  @IsString()
  nextFollowAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  cityResourceScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  communityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  contentScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  charityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  deliveryScore?: number;
}

export class AmbassadorApplicationFollowupDto {
  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  result?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  nextFollowAt?: string;
}

export class VolunteerTaskQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class VolunteerProfileQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class VolunteerProfileStatusDto {
  @IsString()
  @IsIn(["pending", "approved", "rejected", "inactive"])
  status!: "pending" | "approved" | "rejected" | "inactive";

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsIn(["participant", "volunteer", "ambassador", "city_builder"])
  level?: "participant" | "volunteer" | "ambassador" | "city_builder";
}

export class VolunteerCertificateDto {
  @IsOptional()
  @IsString()
  name?: string;
}

export class VolunteerTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  endAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quota?: number;

  @IsOptional()
  @IsIn(["draft", "open", "closed", "completed", "archived"])
  status?: "draft" | "open" | "closed" | "completed" | "archived";

  @IsOptional()
  @IsString()
  requirement?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class VolunteerTaskApplicationStatusDto {
  @IsString()
  @IsIn(["pending", "approved", "rejected", "completed", "cancelled"])
  status!: "pending" | "approved" | "rejected" | "completed" | "cancelled";

  @IsOptional()
  @IsString()
  remark?: string;
}

export class VolunteerServiceRecordDto {
  @IsNumber()
  @Min(1)
  applicationId!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class VolunteerServiceRecordQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  profileId?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class PaymentStatementImportItemDto {
  @IsOptional()
  @IsString()
  transactionNo?: string;

  @IsOptional()
  @IsString()
  orderNo?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  tradeType?: string;

  @IsOptional()
  @IsString()
  providerStatus?: string;

  @IsOptional()
  @IsString()
  tradedAt?: string;

  @IsOptional()
  @IsObject()
  raw?: Record<string, unknown>;
}

export class PaymentStatementImportDto {
  @IsString()
  @IsNotEmpty()
  provider!: "wechat" | "alipay";

  @IsOptional()
  @IsString()
  batchNo?: string;

  @IsArray()
  items!: PaymentStatementImportItemDto[];
}

export class PaymentStatementFetchDto {
  @IsString()
  @IsNotEmpty()
  provider!: "wechat" | "alipay";

  @IsString()
  @IsNotEmpty()
  statementDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentId?: number;
}

export class ActivityFieldDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsEnum(FieldType)
  type!: FieldType;

  @IsBoolean()
  required!: boolean;

  @IsOptional()
  options?: { label: string; value: string }[];

  @IsInt()
  sortOrder!: number;
}

export class ActivityHostDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsInt()
  sortOrder!: number;
}

export class ActivitySectionDto {
  @IsString()
  type!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsInt()
  sortOrder!: number;
}

export class ActivityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  notice?: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsOptional()
  @IsNumber()
  locationLatitude?: number;

  @IsOptional()
  @IsNumber()
  locationLongitude?: number;

  @IsOptional()
  @IsString()
  locationMapUrl?: string;

  @IsOptional()
  @IsString()
  groupQrCodeUrl?: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsString()
  registrationDeadline!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsEnum(ActivityStatus)
  status!: ActivityStatus;

  @IsBoolean()
  featured!: boolean;

  @IsBoolean()
  requireReview!: boolean;

  @IsBoolean()
  allowCancel!: boolean;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsInt()
  agentId?: number;

  @IsOptional()
  @IsInt()
  minMemberLevelId?: number;

  @IsOptional()
  @IsInt()
  priorityMemberLevelId?: number;

  @IsOptional()
  @IsString()
  priorityRegistrationEndsAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityFieldDto)
  fields!: ActivityFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityHostDto)
  hosts?: ActivityHostDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivitySectionDto)
  sections?: ActivitySectionDto[];
}

export class ActivityQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;
}

export class AnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  activityId?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class ActivityChannelDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CharitySettingDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ratePercent?: number;

  @IsOptional()
  @IsIn(["paid_amount", "original_amount", "manual"])
  accrualBasis?: "paid_amount" | "original_amount" | "manual";

  @IsOptional()
  @IsNumber()
  @Min(0)
  manualBasisAmount?: number;

  @IsOptional()
  @IsString()
  userDisplayName?: string;

  @IsOptional()
  @IsString()
  publicNote?: string;

  @IsOptional()
  @IsBoolean()
  retainOnActivityRefund?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ambassadorThreshold?: number;

  @IsOptional()
  @IsString()
  ambassadorTitle?: string;
}

export class CharityProjectDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsNumber()
  @Min(0.01)
  targetAmount!: number;

  @IsOptional()
  @IsIn(["fundraising", "pending_execution", "executing", "pending_acceptance", "completed", "archived"])
  status?: "fundraising" | "pending_execution" | "executing" | "pending_acceptance" | "completed" | "archived";

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  executedAt?: string;

  @IsOptional()
  @IsBoolean()
  publicVisible?: boolean;
}

export class CharityDisbursementDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsBoolean()
  publicVisible?: boolean;
}

export class CharityProjectUpdateDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsBoolean()
  publicVisible?: boolean;

  @IsOptional()
  @IsString()
  publishedAt?: string;
}

export class AdminQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: string;

  @IsOptional()
  @IsString()
  enabled?: string;

  @IsOptional()
  @IsString()
  includeSmoke?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;
}

export class TenantDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsString()
  @Length(0, 500)
  @IsOptional()
  remark?: string;
}

export class TenantPermissionDto {
  @IsOptional()
  @IsBoolean()
  activityPublishReviewRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  registrationReviewEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentAccountEditable?: boolean;

  @IsOptional()
  @IsBoolean()
  mallEnabled?: boolean;

  @IsOptional()
  @IsString()
  packagePlan?: string;

  @IsOptional()
  @IsString()
  packageExpiresAt?: string;
}

export class TenantRegionDto {
  @IsInt()
  tenantId!: number;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(200000)
  radiusMeters!: number;

  @IsOptional()
  @IsArray()
  boundaryPoints?: unknown[];

  @IsOptional()
  @IsBoolean()
  exclusive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class TenantRegionBulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TenantRegionDto)
  items!: TenantRegionDto[];
}

export class TenantRegionHitLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @IsString()
  matched?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class TenantProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}

export class OrderQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  activityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;
}

export class AnnouncementDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number | null;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

export class MarketingPopupDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number | null;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  subtitle?: string | null;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  @IsString()
  emphasis?: string | null;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsArray()
  platforms?: string[];

  @IsOptional()
  @IsArray()
  placements?: string[];

  @IsOptional()
  @IsArray()
  buttons?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dismissible?: boolean;

  @IsOptional()
  @IsString()
  startAt?: string | null;

  @IsOptional()
  @IsString()
  endAt?: string | null;
}

export class HomepageSectionDto {
  @IsOptional()
  @IsString()
  pageKey?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  type?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;
}

export class HomepageReorderItemDto {
  @IsInt()
  id!: number;

  @IsInt()
  sortOrder!: number;
}

export class HomepageReorderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomepageReorderItemDto)
  items!: HomepageReorderItemDto[];
}

export class HomepageDecorationVersionDto {
  @IsOptional()
  @IsString()
  @Length(0, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

export class HomepageDecorationTemplateDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 60)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class ReviewModerationDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  adminReply?: string;
}

export class ReviewDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class WalletAdjustDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsIn(["recharge", "deduct", "adjust"])
  type!: "recharge" | "deduct" | "adjust";

  @IsOptional()
  @IsString()
  remark?: string;
}

export class MemberPointAdjustDto {
  @IsNumber()
  points!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateMemberDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class ResetMemberPasswordDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}



export class OperationSettingDto {
  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @IsOptional()
  @IsString()
  registrationDisabledMessage?: string;

  @IsOptional()
  @IsString()
  offlinePaymentInstructions?: string;

  @IsOptional()
  @IsObject()
  paymentMethods?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  customerServiceName?: string;

  @IsOptional()
  @IsString()
  customerServicePhone?: string;

  @IsOptional()
  @IsString()
  customerServiceWechat?: string;

  @IsOptional()
  @IsString()
  defaultGroupQrCodeUrl?: string;

  @IsOptional()
  @IsObject()
  pageTheme?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  launchConfig?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  refundInstructions?: string;

  @IsOptional()
  @IsString()
  invoiceInstructions?: string;

  @IsOptional()
  @IsBoolean()
  smsProviderEnabled?: boolean;

  @IsOptional()
  @IsString()
  smsProvider?: string;

  @IsOptional()
  @IsString()
  smsAccessKeyId?: string;

  @IsOptional()
  @IsString()
  smsAccessKeySecret?: string;

  @IsOptional()
  @IsString()
  smsSignName?: string;

  @IsOptional()
  @IsString()
  smsTemplateId?: string;
}

export class TicketTypeDto {
  @IsInt()
  activityId!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class MiniprogramReleaseSettingDto {
  @IsString()
  @IsNotEmpty()
  appId!: string;

  @IsOptional()
  @IsString()
  appSecret?: string;

  @IsOptional()
  @IsString()
  privateKey?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  projectPath?: string;

  @IsOptional()
  @IsObject()
  auditItem?: Record<string, unknown>;
}

export class MiniprogramReleaseVersionDto {
  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CouponDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  discountType!: "fixed" | "percent";

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  activityId?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;
}

export class RefundDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  refundNo?: string;
}

export class MemberLevelDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(0)
  minPoints!: number;

  @IsNumber()
  @Min(0)
  discountRate!: number;

  @IsOptional()
  @IsBoolean()
  priorityBooking?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UserTagDto {
  @IsInt()
  userId!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class BulkActivityTagDto {
  @IsInt()
  activityId!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: string;

  @IsOptional()
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateAdminDto {
  @IsOptional()
  @IsEnum(AdminRole)
  role?: string;

  @IsOptional()
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class ActivityApprovalDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ChangeOwnPasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}

export class UpdateAdminStatusDto {
  @IsBoolean()
  enabled!: boolean;
}

export class RegistrationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  activityId?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;
}

export class OrderRemarkDto {
  @IsString()
  remark!: string;
}

export class SubmitRegistrationDto {
  @IsInt()
  userId!: number;

  @IsArray()
  answers!: RegistrationAnswer[];
}


export class CourseDto {
  title!: string;
  description?: string;
  coverUrl?: string;
  teacherName?: string;
  teacherAvatar?: string;
  categoryId?: number;
  price?: number;
  originalPrice?: number;
  status?: string;
  tags?: string[];
}

export class CourseChapterDto {
  courseId!: number;
  title!: string;
  sortOrder?: number;
}

export class CourseLessonDto {
  chapterId!: number;
  title!: string;
  videoUrl?: string;
  duration?: string;
  isFree?: boolean;
  content?: string;
}

export class CommunityActivityDto {
  title!: string;
  description?: string;
  startTime?: string;
  location?: string;
  coverUrl?: string;
  status?: string;
}

export class CheckInTaskDto {
  date!: string;
  title!: string;
  description?: string;
}

export class CommunityPostDto {
  content!: string;
  images?: string[];
}
