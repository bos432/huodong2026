import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class InstallerDbDto {
  @IsString()
  host!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  database!: string;

  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

export class InstallerWriteConfigDto extends InstallerDbDto {
  @IsString()
  h5Origin!: string;

  @IsString()
  adminOrigin!: string;

  @IsString()
  apiOrigin!: string;

  @IsOptional()
  @IsString()
  buildCommit?: string;

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

  @IsOptional()
  @IsString()
  wechatAppId?: string;

  @IsOptional()
  @IsString()
  wechatAppSecret?: string;

  @IsOptional()
  @IsString()
  wechatPayAppId?: string;

  @IsOptional()
  @IsString()
  wechatPayMchId?: string;

  @IsOptional()
  @IsString()
  wechatPayApiV3Key?: string;

  @IsOptional()
  @IsString()
  wechatPayPrivateKeyPath?: string;

  @IsOptional()
  @IsString()
  wechatPayCertSerialNo?: string;

  @IsOptional()
  @IsString()
  wechatPayPlatformCertPath?: string;

  @IsOptional()
  @IsString()
  wechatPayNotifyUrl?: string;
}

export class InstallerAdminDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
