import { Type } from "class-transformer";
import { FieldType, PaymentMethod, RegistrationAnswer } from "../../shared/domain";
import { Allow, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from "class-validator";

export class MarketingPopupEventDto {
  @IsString()
  @IsIn(["impression", "click", "close"])
  event!: string;

  @IsString()
  @IsIn(["home", "mall_home", "activity_list", "activity_detail", "course_home", "course_detail", "mall_product_detail", "community_home", "user_my"])
  pageKey!: string;

  @IsString()
  @IsIn(["h5", "mp-weixin"])
  platform!: string;
}

export class H5LoginDto {
  @IsString()
  phone!: string;

  @IsString()
  verificationToken!: string;

  @IsString()
  verificationCode!: string;

  @IsOptional()
  @IsString()
  nickname?: string;
}

export class H5CodeDto {
  @IsString()
  phone!: string;
}

export class H5PasswordLoginDto {
  @IsString()
  phone!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  nickname?: string;
}

export class WechatLoginDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  appId?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class WechatPhoneDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  appId?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class PhoneChangeCodeDto {
  @IsString()
  phone!: string;
}

export class UpdatePhoneDto {
  @IsString()
  phone!: string;

  @IsString()
  verificationToken!: string;

  @IsString()
  verificationCode!: string;
}

export class AmbassadorApplicationDto {
  @IsString()
  @IsNotEmpty()
  businessKey!: string;

  @IsOptional()
  @IsIn(["ambassador", "partner"])
  kind?: "ambassador" | "partner";

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  cooperationIntent?: string;

  @IsString()
  @IsNotEmpty()
  expertise!: string;

  @IsString()
  @IsNotEmpty()
  experience!: string;

  @IsString()
  @IsNotEmpty()
  wechat!: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  channelCode?: string;
}

export class AidApplicationCreateDto {
  @IsIn(["personal", "project"])
  type!: "personal" | "project";

  @IsString() @IsNotEmpty() applicantName!: string;
  @IsString() @IsNotEmpty() phone!: string;
  @IsString() @IsNotEmpty() city!: string;
  @IsString() @IsNotEmpty() wechat!: string;
  @IsOptional() @IsString() organizationName?: string;
  @IsOptional() @IsString() identityNo?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsString() @IsNotEmpty() supportCategory!: string;
  @IsString() @IsNotEmpty() requestedSupport!: string;
  @IsString() @IsNotEmpty() situation!: string;
  @IsBoolean() consentAccepted!: boolean;
  @IsString() @IsNotEmpty() consentVersion!: string;
  @IsString() @IsNotEmpty() businessKey!: string;
}

export class AidApplicationSupplementDto {
  @IsString() @IsNotEmpty() content!: string;
  @IsString() @IsNotEmpty() businessKey!: string;
}

export class AidApplicationMaterialDto {
  @IsString() @IsNotEmpty() category!: string;
  @IsString() @IsNotEmpty() businessKey!: string;
}

export class VolunteerApplyDto {
  @IsOptional()
  @IsString()
  businessKey?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @IsString()
  expertise?: string;

  @IsOptional()
  @IsString()
  availableTime?: string;

  @IsOptional()
  @IsString()
  serviceIntent?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @Allow()
  availability?: { weekdays?: number[]; timeRanges?: string[]; notes?: string };

  @IsOptional()
  @Allow()
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
}

export class VolunteerTaskApplyDto {
  @IsOptional()
  @IsString()
  businessKey?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class VolunteerTaskCancelDto {
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsString() @IsNotEmpty() reason!: string;
}

export class VolunteerAttendanceSubmitDto {
  @IsString() @IsNotEmpty() token!: string;
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

export class VolunteerServiceConfirmDto {
  @IsString() @IsNotEmpty() businessKey!: string;
  @IsOptional() @IsNumber() @Min(0) hours?: number;
}

class RegistrationAnswerDto implements RegistrationAnswer {
  @Type(() => Number)
  @IsInt()
  fieldId!: number;

  @IsString()
  label!: string;

  @IsEnum(FieldType)
  type!: FieldType;

  @Allow()
  value!: string | string[];
}

export class RegisterDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrationAnswerDto)
  answers!: RegistrationAnswer[];

  @IsOptional()
  @IsBoolean()
  privacyAccepted?: boolean;

  @IsOptional()
  @IsArray()
  companions?: Array<{ name: string; phone?: string; idCard?: string }>;

  @IsOptional()
  @IsInt()
  ticketTypeId?: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsInt()
  pointsToUse?: number;

  @IsOptional()
  @IsIn([PaymentMethod.Wechat, PaymentMethod.Alipay, PaymentMethod.Balance, PaymentMethod.Offline])
  paymentMethod?: PaymentMethod.Wechat | PaymentMethod.Alipay | PaymentMethod.Balance | PaymentMethod.Offline;

  @IsOptional()
  @IsString()
  channelCode?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}

export class QuoteDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsInt()
  ticketTypeId?: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsInt()
  pointsToUse?: number;
}

export class MockPayDto {
  @IsOptional()
  @IsString()
  transactionNo?: string;
}

export class CreateCourseOrderDto {
  @IsOptional()
  @IsIn([PaymentMethod.Wechat, PaymentMethod.Alipay, PaymentMethod.Balance, PaymentMethod.Offline])
  paymentMethod?: PaymentMethod.Wechat | PaymentMethod.Alipay | PaymentMethod.Balance | PaymentMethod.Offline;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientOrderKey?: string;
}

export class MockPaymentCallbackDto {
  @IsString()
  orderNo!: string;

  @IsString()
  transactionNo!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  provider?: string;
}

export class ProviderPayDto {
  @IsOptional()
  @IsString()
  transactionNo?: string;

  @IsOptional()
  @IsString()
  @IsIn(["native", "h5", "jsapi", "precreate", "wap", "page"])
  paymentScene?: string;

  @IsOptional()
  @IsString()
  openId?: string;

  @IsOptional()
  @IsString()
  clientIp?: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  channelCode?: string;
}

export class ProviderPaymentCallbackDto {
  @IsString()
  orderNo!: string;

  @IsString()
  transactionNo!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  timestamp!: string;

  @IsString()
  sign!: string;
}

export class CreateReviewDto {
  @IsInt()
  userId!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  content!: string;
}
