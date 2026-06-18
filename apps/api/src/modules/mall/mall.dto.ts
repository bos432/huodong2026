import { PaymentMethod } from "../../shared/domain";

export class MallCategoryDto {
  tenantId?: number;
  name!: string;
  iconUrl?: string;
  sortOrder?: number;
  enabled?: boolean;
}

export class MallSkuDto {
  id?: number;
  name!: string;
  skuCode?: string;
  price!: number;
  originalPrice?: number;
  stock?: number;
  sortOrder?: number;
  enabled?: boolean;
}

export class MallProductDto {
  tenantId?: number;
  categoryId?: number | null;
  title!: string;
  coverUrl?: string;
  description?: string;
  brandName?: string;
  price?: number;
  originalPrice?: number;
  status?: "draft" | "published" | "offline";
  featured?: boolean;
  sortOrder?: number;
  deliveryNote?: string;
  afterSaleNote?: string;
  skus?: MallSkuDto[];
}

export class MallListQueryDto {
  tenantId?: number;
  categoryId?: number;
  status?: string;
  paymentMethod?: PaymentMethod.Balance | PaymentMethod.Offline | PaymentMethod.Wechat;
  refundStatus?: "none" | "pending" | "processing" | "approved" | "rejected" | "failed";
  startDate?: string;
  endDate?: string;
  enabled?: string;
  keyword?: string;
  sort?: "featured" | "newest" | "hot";
  lowStockThreshold?: number;
  page?: number;
  pageSize?: number;
}

export class MallCouponDto {
  tenantId?: number;
  code!: string;
  name!: string;
  minAmount?: number;
  discountAmount!: number;
  scope?: "all" | "category" | "product";
  scopeCategoryId?: number | null;
  scopeProductId?: number | null;
  usageLimit?: number;
  perUserLimit?: number;
  enabled?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export class MallPromotionCodeDto {
  tenantId?: number;
  code!: string;
  name!: string;
  promoterUserId?: number | null;
  agentId?: number | null;
  commissionRate?: number;
  enabled?: boolean;
  remark?: string;
}

export class MallFlashSaleDto {
  tenantId?: number;
  productId!: number;
  skuId!: number;
  title!: string;
  salePrice!: number;
  saleStock!: number;
  perUserLimit?: number;
  startsAt!: string;
  endsAt!: string;
  status?: "draft" | "active" | "disabled";
  sortOrder?: number;
}

export class MallGroupBuyDto {
  tenantId?: number;
  productId!: number;
  skuId!: number;
  title!: string;
  groupPrice!: number;
  minPeople?: number;
  groupStock!: number;
  perUserLimit?: number;
  startsAt!: string;
  endsAt!: string;
  status?: "draft" | "active" | "disabled";
  sortOrder?: number;
}

export class MallCommissionSettleDto {
  remark?: string;
}

export class MallCommissionBatchSettleDto extends MallListQueryDto {
  agentId?: number | null;
  promoterUserId?: number | null;
  unassigned?: boolean;
  remark?: string;
}

export class MallLogisticsCompanyDto {
  tenantId?: number;
  name!: string;
  code?: string;
  servicePhone?: string;
  trackingUrl?: string;
  sortOrder?: number;
  enabled?: boolean;
}

export class MallAddressDto {
  receiverName!: string;
  receiverPhone!: string;
  province?: string;
  city?: string;
  district?: string;
  detail!: string;
  isDefault?: boolean;
}

export class MallCartItemDto {
  skuId!: number;
  quantity?: number;
}

export class MallCartQuantityDto {
  quantity!: number;
}

export class CreateMallOrderItemDto {
  skuId!: number;
  quantity!: number;
  flashSaleId?: number;
  groupBuyId?: number;
  joinTeamNo?: string;
}

export class MallOrderQuoteDto {
  items?: CreateMallOrderItemDto[];
  cartItemIds?: number[];
  couponCode?: string;
  pointsToUse?: number;
}

export class CreateMallOrderDto {
  items!: CreateMallOrderItemDto[];
  cartItemIds?: number[];
  addressId?: number;
  address?: MallAddressDto;
  paymentMethod?: PaymentMethod.Balance | PaymentMethod.Offline | PaymentMethod.Wechat;
  clientOrderKey?: string;
  couponCode?: string;
  pointsToUse?: number;
  promotionCode?: string;
  buyerRemark?: string;
}

export class MallProviderPayDto {
  transactionNo?: string;
  paymentScene?: "native" | "h5" | "jsapi";
  openId?: string;
  clientIp?: string;
  returnUrl?: string;
}

export class MallProviderPaymentCallbackDto {
  orderNo!: string;
  transactionNo!: string;
  amount!: number;
  timestamp!: string;
  sign!: string;
}

export class MallShipDto {
  expressCompany?: string;
  expressNo!: string;
  remark?: string;
}

export class MallRefundRequestDto {
  type?: "refund_only" | "return_refund";
  amount?: number;
  reason?: string;
  images?: string[];
}

export class MallRefundReviewDto {
  remark?: string;
}

export class MallOrderCloseDto {
  reason?: string;
}

export class MallInventoryAdjustDto {
  stock!: number;
  remark?: string;
}

export class MallReviewDto {
  orderItemId!: number;
  rating!: number;
  content!: string;
  images?: string[];
}

export class MallReviewModerationDto {
  status!: "approved" | "rejected";
  reviewRemark?: string;
  merchantReply?: string;
}
