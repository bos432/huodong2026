import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { AdminMallMerchantAccess } from "../../entities/admin-mall-merchant-access.entity";
import { Agent } from "../../entities/agent.entity";
import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { MallAddress } from "../../entities/mall-address.entity";
import { MallBrowseHistory } from "../../entities/mall-browse-history.entity";
import { MallCartItem } from "../../entities/mall-cart-item.entity";
import { MallCategory } from "../../entities/mall-category.entity";
import { MallBrand } from "../../entities/mall-brand.entity";
import { MallCheckoutGroup } from "../../entities/mall-checkout-group.entity";
import { MallCommissionAdjustment } from "../../entities/mall-commission-adjustment.entity";
import { MallCommissionRule } from "../../entities/mall-commission-rule.entity";
import { MallCommission } from "../../entities/mall-commission.entity";
import { MallCouponClaim } from "../../entities/mall-coupon-claim.entity";
import { MallCoupon } from "../../entities/mall-coupon.entity";
import { MallCouponUsage } from "../../entities/mall-coupon-usage.entity";
import { MallFavorite } from "../../entities/mall-favorite.entity";
import { MallFlashSale } from "../../entities/mall-flash-sale.entity";
import { MallGroupBuy } from "../../entities/mall-group-buy.entity";
import { MallGroupBuyRecord } from "../../entities/mall-group-buy-record.entity";
import { MallInventoryLog } from "../../entities/mall-inventory-log.entity";
import { MallInventoryAnomaly } from "../../entities/mall-inventory-anomaly.entity";
import { MallLogisticsCompany } from "../../entities/mall-logistics-company.entity";
import { MallMerchant } from "../../entities/mall-merchant.entity";
import { MallMerchantApplication } from "../../entities/mall-merchant-application.entity";
import { MallMerchantQualification } from "../../entities/mall-merchant-qualification.entity";
import { MallMerchantContract } from "../../entities/mall-merchant-contract.entity";
import { MallMerchantPaymentAccount } from "../../entities/mall-merchant-payment-account.entity";
import { MallOrderItem } from "../../entities/mall-order-item.entity";
import { MallOrderEvent } from "../../entities/mall-order-event.entity";
import { MallShipment } from "../../entities/mall-shipment.entity";
import { MallShipmentItem } from "../../entities/mall-shipment-item.entity";
import { MallShipmentTrackingEvent } from "../../entities/mall-shipment-tracking-event.entity";
import { MallOrder } from "../../entities/mall-order.entity";
import { MallPaymentCallbackLog } from "../../entities/mall-payment-callback-log.entity";
import { MallPaymentTransaction } from "../../entities/mall-payment-transaction.entity";
import { MallPaymentStatementRecord } from "../../entities/mall-payment-statement-record.entity";
import { MallProduct } from "../../entities/mall-product.entity";
import { MallProductAuditLog } from "../../entities/mall-product-audit-log.entity";
import { MallPromotionCode } from "../../entities/mall-promotion-code.entity";
import { MallPromotionRateLimit } from "../../entities/mall-promotion-rate-limit.entity";
import { MallPromotionRiskEvent } from "../../entities/mall-promotion-risk-event.entity";
import { MallPromotionRiskAlert } from "../../entities/mall-promotion-risk-alert.entity";
import { MallRefund } from "../../entities/mall-refund.entity";
import { MallRefundItem } from "../../entities/mall-refund-item.entity";
import { MallRefundLog } from "../../entities/mall-refund-log.entity";
import { MallRefundMessage } from "../../entities/mall-refund-message.entity";
import { MallReview } from "../../entities/mall-review.entity";
import { MallReviewReport } from "../../entities/mall-review-report.entity";
import { MallSettlement } from "../../entities/mall-settlement.entity";
import { MallSettlementEvent } from "../../entities/mall-settlement-event.entity";
import { MallSettlementLine } from "../../entities/mall-settlement-line.entity";
import { MallSku } from "../../entities/mall-sku.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberPointLog } from "../../entities/member-point-log.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Tenant } from "../../entities/tenant.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { User } from "../../entities/user.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { RolesGuard } from "../admin/roles.guard";
import { PublicModule } from "../public/public.module";
import { V1Module } from "../v1/v1.module";
import { MallAdminController } from "./mall-admin.controller";
import { MallFeatureGateInterceptor, MallPaymentController, MallPublicController } from "./mall-public.controller";
import { MallService } from "./mall.service";
import { MemberPointsModule } from "../member-points/member-points.module";
import { ReliabilityModule } from "../reliability/reliability.module";

const mallEntities = [Tenant, User, AdminUser, Agent, AgentPaymentAccount, OperationSetting, AdminOperationLog, AdminMallMerchantAccess, UserWallet, WalletTransaction, MemberLevel, MemberProfile, MemberPointLog, MallMerchant, MallMerchantApplication, MallMerchantQualification, MallMerchantContract, MallMerchantPaymentAccount, MallCheckoutGroup, MallCategory, MallBrand, MallCoupon, MallCouponClaim, MallCouponUsage, MallCommission, MallCommissionRule, MallCommissionAdjustment, MallPromotionCode, MallPromotionRateLimit, MallPromotionRiskEvent, MallPromotionRiskAlert, MallFavorite, MallBrowseHistory, MallFlashSale, MallGroupBuy, MallGroupBuyRecord, MallLogisticsCompany, MallProduct, MallProductAuditLog, MallSku, MallInventoryLog, MallInventoryAnomaly, MallAddress, MallCartItem, MallOrder, MallOrderItem, MallOrderEvent, MallShipment, MallShipmentItem, MallShipmentTrackingEvent, MallPaymentCallbackLog, MallPaymentTransaction, MallPaymentStatementRecord, MallRefund, MallRefundItem, MallRefundMessage, MallRefundLog, MallReview, MallReviewReport, MallSettlement, MallSettlementLine, MallSettlementEvent];

@Module({
  imports: [TypeOrmModule.forFeature(mallEntities), MemberPointsModule, PublicModule, ReliabilityModule, V1Module],
  controllers: [MallAdminController, MallPublicController, MallPaymentController],
  providers: [MallService, RolesGuard, MallFeatureGateInterceptor],
  exports: [MallService]
})
export class MallModule {}
