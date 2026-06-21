import { PaymentMethod } from "../../shared/domain";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class MallCategoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class MallSkuDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  skuCode?: string;

  @Type(() => Number)
  @IsNumber()
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  originalPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class MallProductDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number | null;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  originalPrice?: number;

  @IsOptional()
  @IsIn(["draft", "pending_review", "published", "offline"])
  status?: "draft" | "pending_review" | "published" | "offline";

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  deliveryNote?: string;

  @IsOptional()
  @IsString()
  afterSaleNote?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MallSkuDto)
  skus?: MallSkuDto[];
}

export class MallListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsIn([PaymentMethod.Balance, PaymentMethod.Offline, PaymentMethod.Wechat])
  paymentMethod?: PaymentMethod.Balance | PaymentMethod.Offline | PaymentMethod.Wechat;

  @IsOptional()
  @IsIn(["none", "pending", "processing", "approved", "rejected", "failed"])
  refundStatus?: "none" | "pending" | "processing" | "approved" | "rejected" | "failed";

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  enabled?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  checkoutGroupNo?: string;

  @IsOptional()
  @IsIn(["featured", "newest", "hot"])
  sort?: "featured" | "newest" | "hot";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class MallSettlementGenerateDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @Type(() => Number)
  @IsInt()
  merchantId!: number;

  @IsString()
  @IsNotEmpty()
  periodStart!: string;

  @IsString()
  @IsNotEmpty()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class MallSettlementReviewDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class MallSettlementPaidDto {
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

export class MallMerchantDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentId?: number | null;

  @IsOptional()
  @IsIn(["tenant", "agent"])
  ownerType?: "tenant" | "agent";

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsIn(["active", "disabled"])
  status?: "active" | "disabled";

  @IsOptional()
  @IsBoolean()
  mallEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  productAuditRequired?: boolean;

  @IsOptional()
  @IsIn(["platform_collect", "merchant_direct"])
  paymentMode?: "platform_collect" | "merchant_direct";

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
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  notice?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class MallMerchantAccessDto {
  @Type(() => Number)
  @IsInt()
  adminId!: number;

  @Type(() => Number)
  @IsInt()
  merchantId!: number;

  @IsOptional()
  @IsString()
  accessRole?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class MallMerchantPaymentAccountDto {
  @Type(() => Number)
  @IsInt()
  merchantId!: number;

  @IsIn([PaymentMethod.Wechat, PaymentMethod.Alipay])
  provider!: PaymentMethod.Wechat | PaymentMethod.Alipay;

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

export class MallCouponDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @Type(() => Number)
  @IsNumber()
  discountAmount!: number;

  @IsOptional()
  @IsIn(["all", "category", "product"])
  scope?: "all" | "category" | "product";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  scopeCategoryId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  scopeProductId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usageLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  perUserLimit?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;
}

export class MallPromotionCodeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  promoterUserId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  commissionRate?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class MallFlashSaleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;

  @Type(() => Number)
  @IsInt()
  productId!: number;

  @Type(() => Number)
  @IsInt()
  skuId!: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @Type(() => Number)
  @IsNumber()
  salePrice!: number;

  @Type(() => Number)
  @IsInt()
  saleStock!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  perUserLimit?: number;

  @IsString()
  startsAt!: string;

  @IsString()
  endsAt!: string;

  @IsOptional()
  @IsIn(["draft", "active", "disabled"])
  status?: "draft" | "active" | "disabled";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class MallGroupBuyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;

  @Type(() => Number)
  @IsInt()
  productId!: number;

  @Type(() => Number)
  @IsInt()
  skuId!: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @Type(() => Number)
  @IsNumber()
  groupPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minPeople?: number;

  @Type(() => Number)
  @IsInt()
  groupStock!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  perUserLimit?: number;

  @IsString()
  startsAt!: string;

  @IsString()
  endsAt!: string;

  @IsOptional()
  @IsIn(["draft", "active", "disabled"])
  status?: "draft" | "active" | "disabled";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class MallCommissionSettleDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class MallCommissionBatchSettleDto extends MallListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  promoterUserId?: number | null;

  @IsOptional()
  @IsBoolean()
  unassigned?: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class MallLogisticsCompanyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  servicePhone?: string;

  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class MallAddressDto {
  @IsString()
  @IsNotEmpty()
  receiverName!: string;

  @IsString()
  @IsNotEmpty()
  receiverPhone!: string;

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
  detail!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class MallCartItemDto {
  @Type(() => Number)
  @IsInt()
  skuId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class MallCartQuantityDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateMallOrderItemDto {
  @Type(() => Number)
  @IsInt()
  skuId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  flashSaleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupBuyId?: number;

  @IsOptional()
  @IsString()
  joinTeamNo?: string;
}

export class MallOrderQuoteDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMallOrderItemDto)
  items?: CreateMallOrderItemDto[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  cartItemIds?: number[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pointsToUse?: number;
}

export class CreateMallOrderDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMallOrderItemDto)
  items!: CreateMallOrderItemDto[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  cartItemIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  addressId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MallAddressDto)
  address?: MallAddressDto;

  @IsOptional()
  @IsIn([PaymentMethod.Balance, PaymentMethod.Offline, PaymentMethod.Wechat])
  paymentMethod?: PaymentMethod.Balance | PaymentMethod.Offline | PaymentMethod.Wechat;

  @IsOptional()
  @IsString()
  clientOrderKey?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pointsToUse?: number;

  @IsOptional()
  @IsString()
  promotionCode?: string;

  @IsOptional()
  @IsString()
  buyerRemark?: string;
}

export class MallProviderPayDto {
  @IsOptional()
  @IsString()
  transactionNo?: string;

  @IsOptional()
  @IsIn(["native", "h5", "jsapi"])
  paymentScene?: "native" | "h5" | "jsapi";

  @IsOptional()
  @IsString()
  openId?: string;

  @IsOptional()
  @IsString()
  clientIp?: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class MallProviderPaymentCallbackDto {
  @IsString()
  @IsNotEmpty()
  orderNo!: string;

  @IsString()
  @IsNotEmpty()
  transactionNo!: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsString()
  @IsNotEmpty()
  sign!: string;
}

export class MallShipDto {
  @IsOptional()
  @IsString()
  expressCompany?: string;

  @IsString()
  @IsNotEmpty()
  expressNo!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class MallRefundRequestDto {
  @IsOptional()
  @IsIn(["refund_only", "return_refund"])
  type?: "refund_only" | "return_refund";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class MallRefundReviewDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class MallOrderCloseDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class MallInventoryAdjustDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class MallReviewDto {
  @Type(() => Number)
  @IsInt()
  orderItemId!: number;

  @Type(() => Number)
  @IsInt()
  rating!: number;

  @IsString()
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class MallReviewModerationDto {
  @IsIn(["approved", "rejected"])
  status!: "approved" | "rejected";

  @IsOptional()
  @IsString()
  reviewRemark?: string;

  @IsOptional()
  @IsString()
  merchantReply?: string;
}
