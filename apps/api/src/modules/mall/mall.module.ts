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
import { MallCheckoutGroup } from "../../entities/mall-checkout-group.entity";
import { MallCommission } from "../../entities/mall-commission.entity";
import { MallCouponClaim } from "../../entities/mall-coupon-claim.entity";
import { MallCoupon } from "../../entities/mall-coupon.entity";
import { MallCouponUsage } from "../../entities/mall-coupon-usage.entity";
import { MallFavorite } from "../../entities/mall-favorite.entity";
import { MallFlashSale } from "../../entities/mall-flash-sale.entity";
import { MallGroupBuy } from "../../entities/mall-group-buy.entity";
import { MallGroupBuyRecord } from "../../entities/mall-group-buy-record.entity";
import { MallInventoryLog } from "../../entities/mall-inventory-log.entity";
import { MallLogisticsCompany } from "../../entities/mall-logistics-company.entity";
import { MallMerchant } from "../../entities/mall-merchant.entity";
import { MallMerchantPaymentAccount } from "../../entities/mall-merchant-payment-account.entity";
import { MallOrderItem } from "../../entities/mall-order-item.entity";
import { MallOrder } from "../../entities/mall-order.entity";
import { MallPaymentCallbackLog } from "../../entities/mall-payment-callback-log.entity";
import { MallPaymentTransaction } from "../../entities/mall-payment-transaction.entity";
import { MallProduct } from "../../entities/mall-product.entity";
import { MallPromotionCode } from "../../entities/mall-promotion-code.entity";
import { MallRefund } from "../../entities/mall-refund.entity";
import { MallRefundLog } from "../../entities/mall-refund-log.entity";
import { MallReview } from "../../entities/mall-review.entity";
import { MallSettlement } from "../../entities/mall-settlement.entity";
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
import { MallAdminController } from "./mall-admin.controller";
import { MallPaymentController, MallPublicController } from "./mall-public.controller";
import { MallService } from "./mall.service";

const mallEntities = [Tenant, User, AdminUser, Agent, AgentPaymentAccount, OperationSetting, AdminOperationLog, AdminMallMerchantAccess, UserWallet, WalletTransaction, MemberLevel, MemberProfile, MemberPointLog, MallMerchant, MallMerchantPaymentAccount, MallCheckoutGroup, MallCategory, MallCoupon, MallCouponClaim, MallCouponUsage, MallCommission, MallPromotionCode, MallFavorite, MallBrowseHistory, MallFlashSale, MallGroupBuy, MallGroupBuyRecord, MallLogisticsCompany, MallProduct, MallSku, MallInventoryLog, MallAddress, MallCartItem, MallOrder, MallOrderItem, MallPaymentCallbackLog, MallPaymentTransaction, MallRefund, MallRefundLog, MallReview, MallSettlement];

@Module({
  imports: [TypeOrmModule.forFeature(mallEntities), PublicModule],
  controllers: [MallAdminController, MallPublicController, MallPaymentController],
  providers: [MallService, RolesGuard],
  exports: [MallService]
})
export class MallModule {}
