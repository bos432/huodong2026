import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, MaxLength, Min } from "class-validator";
import { Transform, Type } from "class-transformer";

export class SlowRecordDto {
  @IsString() @Length(5, 2000) discovery!: string;
  @IsString() @MaxLength(2000) lightNote!: string;
  @IsString() @Length(5, 2000) feeling!: string;
  @IsIn(["private", "public_review"]) visibility!: "private" | "public_review";
}
export class CreateSlowRecordDto extends SlowRecordDto {
  @IsString() @Length(8, 120) businessKey!: string;
}
export class UpdateSlowRecordDto extends SlowRecordDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) revision?: number;
  @IsOptional() @Transform(({ value }) => value === "true" ? true : value === "false" ? false : value) @IsBoolean() removePhoto?: boolean;
}
export class ReviewSlowRecordDto {
  @IsIn(["approved", "rejected"]) status!: "approved" | "rejected";
  @IsInt() @Min(1) revision!: number;
  @IsOptional() @IsString() @MaxLength(1000) remark?: string;
}
