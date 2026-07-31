import { ActivityStatus, FieldType, OrderStatus, PaymentMethod, RegistrationAnswer } from "../../shared/domain";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";
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
  @MaxLength(120)
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

export class SupportWorkOrderQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() tenantId?: number;
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @Type(() => Number) @IsInt() assigneeId?: number;
}

export class SupportWorkOrderCreateDto {
  @IsOptional() @Type(() => Number) @IsInt() tenantId?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() userId?: number | null;
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() description!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() businessType?: string | null;
  @IsOptional() @IsString() businessId?: string | null;
  @IsOptional() @IsObject() businessSnapshot?: Record<string, unknown> | null;
  @IsOptional() @Type(() => Number) @IsInt() assigneeId?: number | null;
}

export class SupportWorkOrderActionDto {
  @IsOptional() @IsString() content?: string | null;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @Type(() => Number) @IsInt() assigneeId?: number | null;
  @IsOptional() @IsString() resolution?: string | null;
}

export class SupportSensitiveRevealDto {
  @IsString() @IsNotEmpty() reason!: string;
  @IsOptional() @Type(() => Number) @IsInt() tenantId?: number;
}

export class OperationLogQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) tenantId?: number;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() adminUsername?: string;
  @IsOptional() @IsString() requestId?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class AgentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentAgentId?: number | null;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agentId!: number;

  @IsIn([PaymentMethod.Wechat, PaymentMethod.Alipay])
  provider!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  merchantName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  merchantNo?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class PaymentAccountQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) tenantId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) agentId?: number;
  @IsOptional() @IsString() @MaxLength(120) keyword?: string;
  @IsOptional() @IsIn([PaymentMethod.Wechat, PaymentMethod.Alipay]) provider?: PaymentMethod;
  @IsOptional() @IsIn(["true", "false"]) includeDisabled?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class AgentSettlementGenerateDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agentId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  periodStart!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  periodEnd!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class AgentSettlementQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) tenantId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) agentId?: number;
  @IsOptional() @IsString() @MaxLength(120) keyword?: string;
  @IsOptional() @IsIn(["draft", "pending_review", "approved", "paid", "rejected", "cancelled"]) status?: "draft" | "pending_review" | "approved" | "paid" | "rejected" | "cancelled";
  @IsOptional() @IsString() @MaxLength(40) periodStart?: string;
  @IsOptional() @IsString() @MaxLength(40) periodEnd?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class AgentSettlementPayDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  paidReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  paidProofUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class AgentSettlementSandboxTransferDto {
  @IsOptional()
  @IsIn(["wechat", "alipay"])
  provider?: "wechat" | "alipay";

  @IsOptional()
  @IsIn(["success", "failed"])
  simulateStatus?: "success" | "failed";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  failureReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
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
  @IsIn(["ambassador", "partner"])
  kind?: "ambassador" | "partner";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ownerAdminId?: number;

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
  @IsString()
  @IsNotEmpty()
  businessKey!: string;

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

export class AmbassadorProfileQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() keyword?: string;
}

export class AmbassadorProfileStatusDto {
  @IsIn(["active", "suspended", "revoked"])
  status!: "active" | "suspended" | "revoked";
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsObject() regionScope?: { provinces?: string[]; cities?: string[]; districts?: string[] };
}

export class AmbassadorTaskDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() city?: string;
  @IsString() @IsNotEmpty() description!: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(100000) pointValue!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(100000) quota!: number;
  @IsIn(["draft", "open", "closed", "cancelled"]) status!: "draft" | "open" | "closed" | "cancelled";
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
}

export class AmbassadorContributionDto {
  @IsString() @IsNotEmpty() businessKey!: string;
  @Type(() => Number) @IsInt() @Min(1) profileId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) taskId?: number;
  @IsIn(["task", "event", "referral", "manual"]) sourceType!: "task" | "event" | "referral" | "manual";
  @IsString() @IsNotEmpty() title!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) quantity!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000000) points!: number;
  @IsOptional() @IsString() evidence?: string;
}

export class AmbassadorContributionActionDto {
  @IsIn(["approve", "reject", "reverse"]) action!: "approve" | "reject" | "reverse";
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsString() @IsNotEmpty() remark!: string;
}

export class PartnerContractDto {
  @IsString() @IsNotEmpty() businessKey!: string;
  @Type(() => Number) @IsInt() @Min(1) applicationId!: number;
  @IsIn(["tenant", "merchant", "tenant_and_merchant"]) cooperationType!: "tenant" | "merchant" | "tenant_and_merchant";
  @IsString() @IsNotEmpty() startsAt!: string;
  @IsString() @IsNotEmpty() endsAt!: string;
  @IsOptional() @IsString() signedAt?: string;
  @IsOptional() @IsString() terms?: string;
  @IsOptional() @IsString() documentReference?: string;
  @IsOptional() @IsIn(["draft", "pending_review"]) status?: "draft" | "pending_review";
}

export class PartnerContractActionDto {
  @IsIn(["activate", "reject", "terminate"]) action!: "activate" | "reject" | "terminate";
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsString() @IsNotEmpty() remark!: string;
}

export class PartnerConversionDto {
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsString() @IsNotEmpty() tenantCode!: string;
  @IsString() @IsNotEmpty() tenantName!: string;
  @IsOptional() @IsString() merchantCode?: string;
  @IsOptional() @IsString() merchantName?: string;
  @IsOptional() @IsBoolean() createMerchant?: boolean;
}

export class AidApplicationQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class AidApplicationActionDto {
  @IsIn(["assign", "request_supplement", "approve", "reject", "close", "followup"])
  action!: "assign" | "request_supplement" | "approve" | "reject" | "close" | "followup";

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) assigneeId?: number;
  @IsOptional() @IsString() remark?: string;
  @IsString() @IsNotEmpty() businessKey!: string;
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

  @IsOptional()
  @IsIn(["pending", "verified", "rejected"])
  identityStatus?: "pending" | "verified" | "rejected";

  @IsOptional()
  @IsIn(["unqualified", "training", "qualified", "expired", "suspended"])
  qualificationStatus?: "unqualified" | "training" | "qualified" | "expired" | "suspended";

  @IsOptional()
  @IsString()
  qualificationExpiresAt?: string;

  @IsOptional()
  @IsString()
  statusReason?: string;
}

export class VolunteerCertificateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(["volunteer_service", "charity_ambassador", "city_builder"])
  templateKey?: "volunteer_service" | "charity_ambassador" | "city_builder";
}

export class VolunteerTaskDto {
  @IsOptional()
  @IsString()
  businessKey?: string;

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
  @IsString()
  recruitmentStartsAt?: string;

  @IsOptional()
  @IsString()
  recruitmentEndsAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quota?: number;

  @IsOptional()
  @IsBoolean()
  waitlistEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @IsOptional()
  @IsBoolean()
  qualificationRequired?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumTrainingHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationDeadlineHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  checkInOpensMinutesBefore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  checkOutClosesMinutesAfter?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

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
  @IsIn(["pending", "approved", "admitted", "waitlisted", "rejected", "cancelled", "replaced", "checked_in", "completed"])
  status!: "pending" | "approved" | "admitted" | "waitlisted" | "rejected" | "cancelled" | "replaced" | "checked_in" | "completed";

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  businessKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  replacementApplicationId?: number;
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

  @IsOptional()
  @IsString()
  businessKey?: string;
}

export class VolunteerTrainingRecordDto {
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsNumber() @Min(0) trainingHours?: number;
  @IsString() @IsNotEmpty() completedAt!: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsString() certificateReference?: string;
}

export class VolunteerTrainingActionDto {
  @IsIn(["approved", "rejected", "revoked"])
  status!: "approved" | "rejected" | "revoked";
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsOptional() @IsString() remark?: string;
}

export class VolunteerAttendanceDto {
  @IsIn(["check_in", "check_out"])
  action!: "check_in" | "check_out";
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsOptional() @IsString() occurredAt?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() evidence?: string;
}

export class VolunteerServiceActionDto {
  @IsIn(["confirm", "reject", "reverse"])
  action!: "confirm" | "reject" | "reverse";
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsOptional() @IsNumber() @Min(0) confirmedHours?: number;
  @IsOptional() @IsString() reason?: string;
}

export class VolunteerHourAdjustmentDto {
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsNumber() deltaHours!: number;
  @IsString() @IsNotEmpty() reason!: string;
  @IsOptional() @Type(() => Number) @IsInt() serviceRecordId?: number;
  @IsOptional() @Type(() => Number) @IsInt() reversalOfId?: number;
}

export class VolunteerProofDto {
  @IsString() @IsNotEmpty() businessKey!: string;
  @Type(() => Number) @IsInt() @Min(1) serviceRecordId!: number;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() evidence?: string;
}

export class VolunteerProofActionDto {
  @IsIn(["revoke"]) action!: "revoke";
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsString() @IsNotEmpty() reason!: string;
}

export class VolunteerBadgeActionDto {
  @IsIn(["revoke"]) action!: "revoke";
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsString() @IsNotEmpty() reason!: string;
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

export class ActivityFieldOptionDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityFieldOptionDto)
  options?: ActivityFieldOptionDto[];

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

  @IsOptional()
  @IsString()
  shareTitle?: string;

  @IsOptional()
  @IsString()
  shareDescription?: string;

  @IsOptional()
  @IsString()
  shareImageUrl?: string;

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
  @IsString()
  locationProvince?: string;

  @IsOptional()
  @IsString()
  locationCity?: string;

  @IsOptional()
  @IsString()
  locationDistrict?: string;

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

  @IsOptional()
  @IsObject()
  eligibilityRules?: { minAge?: number; maxAge?: number; allowedRegions?: string[]; maxRegistrationsPerUser?: number; requirePrivacyConsent?: boolean; allowCompanions?: boolean; maxCompanions?: number; blacklistPhones?: string[] };
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
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
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
  @IsIn(["draft", "pending_review", "rejected", "approved", "fundraising", "pending_execution", "executing", "pending_acceptance", "completed", "archived"])
  status?: "draft" | "pending_review" | "rejected" | "approved" | "fundraising" | "pending_execution" | "executing" | "pending_acceptance" | "completed" | "archived";

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

export class CharityProjectActionDto {
  @IsIn(["submit", "start_execution", "submit_acceptance", "complete", "archive"])
  action!: "submit" | "start_execution" | "submit_acceptance" | "complete" | "archive";

  @IsOptional()
  @IsString()
  remark?: string;

  @IsString()
  @IsNotEmpty()
  businessKey!: string;
}

export class CharityProjectReviewDto {
  @IsIn(["approve", "reject"])
  decision!: "approve" | "reject";

  @IsString()
  @IsNotEmpty()
  remark!: string;

  @IsString()
  @IsNotEmpty()
  businessKey!: string;
}

export class CharityDisbursementDto {
  @Type(() => Number)
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stageNo?: number;

  @IsString()
  @IsNotEmpty()
  businessKey!: string;
}

export class CharityDisbursementReviewDto {
  @IsIn(["approve", "reject"])
  decision!: "approve" | "reject";

  @IsString()
  @IsNotEmpty()
  remark!: string;

  @IsString()
  @IsNotEmpty()
  businessKey!: string;
}

export class CharityDisbursementPayDto {
  @IsOptional()
  @IsString()
  paidReference?: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsString()
  @IsNotEmpty()
  businessKey!: string;
}

export class CharityDisbursementCancelDto {
  @IsString()
  @IsNotEmpty()
  remark!: string;

  @IsString()
  @IsNotEmpty()
  businessKey!: string;
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
  @IsObject()
  entitlements?: Record<string, unknown>;
}

export class AnalyticsRecomputeDto {
  @IsOptional() @Type(() => Number) @IsInt() tenantId?: number;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate!: string;
}

export class AnalyticsMetricQueryDto extends AnalyticsQueryDto {
  @IsOptional() @IsString() metricKey?: string;
  @IsOptional() @IsString() dimensionType?: string;
  @IsOptional() @IsString() dimensionKey?: string;
}

export class AnalyticsBusinessQueryDto extends AnalyticsQueryDto {
  @IsIn(["activity", "course", "mall", "charity"])
  module!: "activity" | "course" | "mall" | "charity";

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class TenantSubscriptionChangeDto {
  @IsIn(["renew", "upgrade", "downgrade", "extend", "suspend", "restore"])
  action!: "renew" | "upgrade" | "downgrade" | "extend" | "suspend" | "restore";
  @IsOptional() @IsString() packagePlan?: string;
  @IsOptional() @IsString() packageExpiresAt?: string;
  @IsOptional() @IsString() @Length(0, 500) remark?: string;
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
  validFrom?: string;

  @IsOptional()
  @IsString()
  validUntil?: string;

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
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @MaxLength(80)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @MaxLength(100)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @MaxLength(40)
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
  @Min(1)
  userId?: number;

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
  @Min(1)
  tenantId?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content!: string;

  @IsOptional()
  @IsString()
  @IsIn(["notice", "guide", "activity", "operation"])
  type?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  publishAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  endAt?: string | null;

  @IsOptional()
  @IsObject()
  audience?: Record<string, unknown> | null;
}

export class AnnouncementQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(["notice", "guide", "activity", "operation"])
  type?: string;

  @IsOptional()
  @IsString()
  @IsIn(["true", "false"])
  enabled?: string;

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

export class MarketingPopupButtonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["primary", "secondary"])
  style?: string;
}

export class MarketingPopupDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  emphasis?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["notice", "ad", "payment", "wuxing_gold"])
  type?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(["all", "h5", "mp-weixin"], { each: true })
  platforms?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsIn(["all", "home", "mall_home", "activity_list", "activity_detail", "course_home", "course_detail", "mall_product_detail", "community_home", "user_my"], { each: true })
  placements?: string[];

  @IsOptional()
  @IsObject()
  audience?: Record<string, unknown> | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => MarketingPopupButtonDto)
  buttons?: MarketingPopupButtonDto[];

  @IsOptional()
  @IsString()
  @IsIn(["every_visit", "once_per_day", "once_per_campaign"])
  frequency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-9999)
  @Max(9999)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dismissible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  startAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  endAt?: string | null;
}

export class MarketingPopupQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(["true", "false"])
  enabled?: string;

  @IsOptional()
  @IsString()
  @IsIn(["all", "h5", "mp-weixin"])
  platform?: string;

  @IsOptional()
  @IsString()
  @IsIn(["all", "home", "mall_home", "activity_list", "activity_detail", "course_home", "course_detail", "mall_product_detail", "community_home", "user_my"])
  placement?: string;

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

export class MarketingPopupEffectiveCheckQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;

  @IsOptional()
  @IsString()
  @IsIn(["home", "mall_home", "activity_list", "activity_detail", "course_home", "course_detail", "mall_product_detail", "community_home", "user_my"])
  pageKey?: string;

  @IsOptional()
  @IsString()
  @IsIn(["h5", "mp-weixin"])
  platform?: string;
}

export class AdAdvertiserDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  contactName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  wechat?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  licenseUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remark?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["active", "paused", "archived"])
  status?: string;
}

export class AdContractDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advertiserId?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  contractNo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @IsIn(["fixed", "cpm", "cpc", "mixed"])
  billingModel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fixedFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cpmPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cpcPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  startAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  endAt?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["unpaid", "partial", "paid", "refunded"])
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remark?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["active", "paused", "archived"])
  status?: string;
}

export class AdAudienceDto {
  @IsString()
  @IsIn(["all", "guest", "authenticated", "member_levels"])
  mode!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  memberLevelIds?: number[];
}

export class AdCampaignDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advertiserId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contractId?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  subtitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  imageUrls?: string[] | null;

  @IsOptional()
  @IsString()
  @IsIn(["custom", "wechat_official"])
  source?: string;

  @IsOptional()
  @IsString()
  @IsIn(["splash", "inline_card", "banner", "official_banner", "official_video", "official_grid", "official_interstitial", "official_rewarded_video"])
  format?: string;

  @IsOptional()
  @IsString()
  @IsIn(["app_splash", "home_top_banner", "home_feed_inline", "activity_detail_middle", "course_detail_middle", "mall_product_detail_middle", "community_feed_inline", "user_my_banner"])
  slotKey?: string;

  @IsOptional()
  @IsString()
  @IsIn(["all", "home", "mall_home", "mall_product_detail", "activity_list", "activity_detail", "course_home", "course_detail", "community_home", "community_detail", "user_my"])
  pageKey?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @IsIn(["all", "h5", "mp-weixin"], { each: true })
  platforms?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AdAudienceDto)
  audience?: AdAudienceDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["fixed", "cpm", "cpc", "mixed"])
  billingModel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fixedFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cpmPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cpcPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  impressionLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clickLimit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  officialAdUnitId?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["banner", "video", "grid", "interstitial", "rewarded_video"])
  officialAdType?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["every_visit", "once_per_day", "once_per_campaign"])
  frequency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-9999)
  @Max(9999)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  startAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  endAt?: string | null;
}

export class AdCenterQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  advertiserId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contractId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(["active", "paused", "archived", "pending", "confirmed", "invoiced", "paid", "voided"])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(["true", "false"])
  enabled?: string;

  @IsOptional()
  @IsString()
  @IsIn(["custom", "wechat_official"])
  source?: string;

  @IsOptional()
  @IsString()
  @IsIn(["app_splash", "home_top_banner", "home_feed_inline", "activity_detail_middle", "course_detail_middle", "mall_product_detail_middle", "community_feed_inline", "user_my_banner"])
  slotKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  startDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
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

export class AdSettlementGenerateDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contractId?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  periodStart!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  periodEnd!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remark?: string | null;
}

export class AdSettlementStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(["pending", "confirmed", "invoiced", "paid", "voided"])
  status!: string;
}

export class AdOfficialRevenueImportDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  importDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  revenueAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  impressionCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clickCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ecpm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remark?: string | null;
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

export class HomepageReplaceRowDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsString()
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  subtitle?: string | null;

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

export class HomepageReplaceDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HomepageReplaceRowDto)
  rows!: HomepageReplaceRowDto[];
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
  @IsIn(["recharge", "deduct", "adjust", "gift_grant", "gift_revoke", "freeze", "unfreeze"])
  type!: "recharge" | "deduct" | "adjust" | "gift_grant" | "gift_revoke" | "freeze" | "unfreeze";

  @IsOptional()
  @IsString()
  @IsIn(["cash", "gift", "mixed"])
  fundSource?: "cash" | "gift" | "mixed";

  @IsString()
  @Length(8, 128)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class MemberPointAdjustDto {
  @Type(() => Number)
  @IsInt()
  @Min(-1000000)
  @Max(1000000)
  points!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  remark!: string;

  @IsString()
  @Length(8, 128)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  expiresAt?: string;
}

export class MemberPointRuleDto {
  @IsBoolean()
  enabled!: boolean;

  @IsIn(["fixed", "amount_ratio"])
  calculationMode!: "fixed" | "amount_ratio";

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  fixedPoints!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000000)
  amountFenPerPoint!: number;

  @IsIn(["same_as_points", "fixed", "none"])
  growthMode!: "same_as_points" | "fixed" | "none";

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  fixedGrowth!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  validityDays?: number | null;
}

export class MemberLevelAdjustDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  levelId?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;
}

export class MemberQueryDto {
  @IsOptional() @IsString() @MaxLength(120) keyword?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) activityId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
  @IsOptional() @IsString() @IsIn(["h5", "mp_weixin", "admin"]) sourceChannel?: string;
  @IsOptional() @IsString() @IsIn(["true", "false"]) wechatBound?: string;
  @IsOptional() @IsString() @IsIn(["true", "false"]) phoneBound?: string;
  @IsOptional() @IsString() @MaxLength(20) levelId?: string;
  @IsOptional() @IsString() @MaxLength(40) activeStart?: string;
  @IsOptional() @IsString() @MaxLength(40) activeEnd?: string;
  @IsOptional() @IsString() @IsIn(["active7", "inactive30", "spent", "no_spent", "registered", "no_registered"]) quickFilter?: string;
  @IsOptional() @IsString() @MaxLength(40) tag?: string;
  @IsOptional() @IsString() @IsIn(["lastActiveAt", "lastLoginAt", "points", "totalSpent", "registrationCount", "createdAt"]) sortBy?: string;
  @IsOptional() @IsString() @IsIn(["ASC", "DESC"]) sortOrder?: string;
}

export class CreateMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}

export class ResetMemberPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 64)
  password!: string;
}



export class OperationSettingDto {
  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  publicActivityArchiveEnabled?: boolean;

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
  @IsArray()
  @IsString({ each: true })
  clearLaunchConfigSecrets?: string[];

  @IsOptional()
  @IsString()
  defaultTenantCode?: string;

  @IsOptional()
  @IsString()
  refundInstructions?: string;

  @IsOptional()
  @IsString()
  invoiceInstructions?: string;

  @IsOptional()
  @IsString()
  userAgreementUrl?: string;

  @IsOptional()
  @IsString()
  privacyPolicyUrl?: string;

  @IsOptional()
  @IsString()
  merchantAgreementUrl?: string;

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
  @IsBoolean()
  clearSmsAccessKeySecret?: boolean;

  @IsOptional()
  @IsString()
  smsSignName?: string;

  @IsOptional()
  @IsString()
  smsTemplateId?: string;

  @IsOptional()
  @IsString()
  smsSdkAppId?: string;

  @IsOptional()
  @IsObject()
  automaticSms?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  automaticWechat?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  postEventAutomation?: Record<string, unknown>;
}

export class SmsTestDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;
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
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsString()
  saleStartsAt?: string;

  @IsOptional()
  @IsString()
  saleEndsAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  earlyBirdPrice?: number;

  @IsOptional()
  @IsString()
  earlyBirdEndsAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  memberPrice?: number;

  @IsOptional()
  @IsArray()
  tierPrices?: Array<{ minSold: number; price: number }>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class MiniprogramReleaseSettingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  appId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  appSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(65535)
  privateKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectPath?: string;

  @IsOptional()
  @IsObject()
  auditItem?: Record<string, unknown>;
}

export class MiniprogramReleaseVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CouponDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 64)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsIn(["fixed", "percent"])
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
  @IsString()
  @IsIn(["code", "claim"])
  claimMode?: "code" | "claim";

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

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

export class CouponRecordQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId?: number;

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

export class WaitlistQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  activityId?: number;

  @IsOptional()
  @IsIn(["waiting", "promoted", "cancelled"])
  status?: "waiting" | "promoted" | "cancelled";

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

export class WaitlistCancelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  remark!: string;
}

export class RedemptionCodeDto {
  @IsString()
  @Length(3, 64)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsIn(["activity_coupon", "mall_coupon", "course_access", "points"])
  targetType!: "activity_coupon" | "mall_coupon" | "course_access" | "points";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  points?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  usageLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perUserLimit?: number;

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

export class RedemptionCodeUsageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  redemptionCodeId?: number;

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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(0)
  minPoints!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minGrowth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number;

  @IsOptional()
  @IsArray()
  benefits?: Array<{ key: string; name: string; description?: string }>;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class UserTagQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  activityId?: number;

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

export class MemberSegmentRulesDto {
  @IsOptional() @IsArray() @ArrayMaxSize(100) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) levelIds?: number[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPoints?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPoints?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minGrowth?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxGrowth?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minSpent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxSpent?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minRegistrations?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minCheckIns?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) activeWithinDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) inactiveForDays?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @IsIn(["h5", "mp_weixin", "admin"], { each: true }) sourceChannels?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(40, { each: true }) anyTags?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(40, { each: true }) allTags?: string[];
}

export class MemberSegmentSaveDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @ValidateNested() @Type(() => MemberSegmentRulesDto) rules!: MemberSegmentRulesDto;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class MemberSegmentPreviewDto {
  @ValidateNested() @Type(() => MemberSegmentRulesDto) rules!: MemberSegmentRulesDto;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class MemberSegmentSnapshotCreateDto {
  @IsString() @IsNotEmpty() @Length(8, 100) idempotencyKey!: string;
}

export class MemberBehaviorTagRefreshDto {
  @IsString() @IsNotEmpty() @Length(8, 100) idempotencyKey!: string;
}

export class MemberBehaviorTagRunQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class BulkActivityTagDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  activityId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expectedActivityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pointId?: number;
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

  @IsOptional() @IsObject() dataScope?: Record<string, unknown>;
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

  @IsOptional() @IsObject() dataScope?: Record<string, unknown>;
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
  @Min(1)
  userId?: number;

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

export class RefundQueryDto {
  @IsOptional()
  @IsIn(["pending", "submitting", "processing", "failed", "approved", "rejected", "completed"])
  status?: "pending" | "submitting" | "processing" | "failed" | "approved" | "rejected" | "completed";

  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @Type(() => Number) @IsInt() agentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() tenantId?: number;
  @IsOptional() @Type(() => Number) @IsInt() activityId?: number;
  @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
}

export class CopyAdminRoleDto {
  @IsInt()
  sourceAdminId!: number;
}

export class CreateAdminInviteDto {
  @IsString() @IsNotEmpty() username!: string;
  @IsOptional() @IsEnum(AdminRole) role?: string;
  @IsOptional() @IsInt() tenantId?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
  @IsOptional() @IsObject() dataScope?: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(1) @Max(168) expiresInHours?: number;
}

export class AcceptAdminInviteDto {
  @IsString() @IsNotEmpty() token!: string;
  @IsString() @IsNotEmpty() password!: string;
}

export class BulkRegistrationReviewDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  ids!: number[];

  @IsOptional()
  @IsString()
  remark?: string;

}

export class BulkRegistrationNotifyDto extends BulkRegistrationReviewDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  content!: string;
}

export class BulkRegistrationTagDto extends BulkRegistrationReviewDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 40)
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class TenantRegionApprovalDto {
  @IsIn(["approved", "rejected"])
  status!: "approved" | "rejected";

  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
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
