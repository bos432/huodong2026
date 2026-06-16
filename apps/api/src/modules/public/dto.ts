import { PaymentMethod, RegistrationAnswer } from "../../shared/domain";
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

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
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class RegisterDto {
  @IsArray()
  answers!: RegistrationAnswer[];

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
  @IsIn([PaymentMethod.Wechat, PaymentMethod.Balance])
  paymentMethod?: PaymentMethod.Wechat | PaymentMethod.Balance;

  @IsOptional()
  @IsString()
  channelCode?: string;

  @IsOptional()
  @IsString()
  source?: string;
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
