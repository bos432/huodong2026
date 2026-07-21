<template>
  <view class="checkout-page">
    <view v-if="pageLoading" class="state-card" role="status" aria-live="polite">结算信息加载中...</view>
    <view v-else-if="loadError" class="state-card error-state" role="alert" aria-live="assertive">
      <text>{{ loadError }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新加载结算" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重新加载结算</view>
    </view>
    <view class="card address-card" role="button" tabindex="0" aria-label="管理或选择收货地址" @click="goAddresses" @keyup.enter="goAddresses" @keyup.space.prevent="goAddresses">
      <view class="row">
        <text class="section-title">收货地址</text>
        <text class="link">管理/选择 ›</text>
      </view>
      <view v-if="addressError" class="inline-error" role="alert" aria-live="assertive" tabindex="0" aria-label="地址加载失败，重新加载地址" @click.stop="loadAddresses" @keyup.enter.stop="loadAddresses" @keyup.space.stop.prevent="loadAddresses">
        <text>{{ addressError }}</text>
        <text class="state-retry">重新加载地址</text>
      </view>
      <view v-else-if="selectedAddress">
        <text class="address-name">{{ selectedAddress.receiverName }} {{ selectedAddress.receiverPhone }}</text>
        <text class="address-detail">{{ addressText(selectedAddress) }}</text>
      </view>
      <text v-else class="empty-tip">请先新增或选择收货地址</text>
    </view>

    <view class="card">
      <text class="section-title">商品信息</text>
      <view v-if="isCrossMerchantCheckout" class="cross-checkout-summary">
        本次包含 {{ checkoutMerchantGroups.length }} 个店铺，提交后会生成 {{ checkoutMerchantGroups.length }} 个子订单；余额统一扣款，平台代收微信订单统一支付，各店铺仍独立发货和售后。
      </view>
      <view v-for="group in checkoutMerchantGroups" :key="group.key" class="checkout-store">
        <view class="checkout-store-head">
          <view>
            <text class="checkout-store-name">{{ group.name }}</text>
            <text class="checkout-store-meta">{{ group.ownerText }} · 商品 ¥{{ money(group.amount) }} · 运费 ¥{{ money(group.freightAmount) }}</text>
          </view>
        </view>
        <view v-for="item in group.items" :key="item.skuId" class="item-row">
          <view>
            <text class="item-name">{{ item.productTitle }}</text>
            <text class="item-sku" :class="{ danger: !canSubmitItem(item) }">{{ item.skuName }}{{ item.availableStock !== undefined ? ` · ${canSubmitItem(item) ? `可购 ${item.availableStock}` : item.unavailableReason || "库存不足或已售罄"}` : "" }}</text>
          </view>
          <view class="amount-col">
            <text>× {{ item.quantity }}</text>
            <text>¥{{ money(item.price * item.quantity) }}</text>
          </view>
        </view>
        <view v-if="group.discountAmount > 0" class="store-discount-row"><text>优惠分摊</text><text>-¥{{ money(group.discountAmount) }}</text></view>
        <view class="store-allocation-row"><text>店铺应付</text><text>¥{{ money(group.payableAmount) }}</text></view>
      </view>
      <view class="amount-row"><text>商品金额</text><text>¥{{ money(totalAmount) }}</text></view>
      <view class="amount-row" v-if="freightAmount > 0"><text>运费</text><text>+¥{{ money(freightAmount) }}</text></view>
      <view class="amount-row discount" v-if="couponDiscountAmount > 0"><text>优惠券抵扣</text><text>-¥{{ money(couponDiscountAmount) }}</text></view>
      <view class="amount-row discount" v-if="pointsQuote.pointsUsed > 0"><text>积分抵扣</text><text>{{ pointsQuote.pointsUsed }} 分 -¥{{ money(pointsQuote.pointsDiscountAmount) }}</text></view>
      <view class="amount">应付 ¥{{ money(payableAmount) }}</view>
      <text v-if="quoteError" class="quote-error" role="alert" aria-live="assertive">{{ quoteError }}</text>
    </view>

    <view class="card">
      <view class="row">
        <text class="section-title">优惠券</text>
        <text class="link" role="button" tabindex="0" aria-label="打开领券中心和我的券包" @click.stop="goCoupons" @keyup.enter.stop="goCoupons" @keyup.space.stop.prevent="goCoupons">领券/我的券包 ›</text>
      </view>
      <text v-if="couponsWarning" class="inline-warning">{{ couponsWarning }}</text>
      <view v-if="coupons.length" class="coupon-list">
        <view v-for="coupon in coupons" :key="coupon.id" class="coupon-chip" :class="{ active: couponCode === coupon.code }" role="button" tabindex="0" :aria-label="`${couponCode === coupon.code ? '已选择' : '选择'}优惠券${coupon.name}`" @click="selectCoupon(coupon)" @keyup.enter="selectCoupon(coupon)" @keyup.space.prevent="selectCoupon(coupon)">
          <view class="coupon-head">
            <text>{{ coupon.name }}</text>
            <text class="coupon-code">{{ coupon.code }}</text>
          </view>
          <text class="coupon-main">满 ¥{{ money(coupon.minAmount) }} 减 ¥{{ money(coupon.discountAmount) }}</text>
          <text class="coupon-meta">{{ couponMeta(coupon) }}</text>
          <text class="coupon-meta">{{ coupon.claimed ? "已领取" : "可直接使用，也可先领取" }}</text>
        </view>
      </view>
      <view class="coupon-input">
        <input v-model="couponCode" aria-label="优惠券码" maxlength="64" cursor-spacing="24" confirm-type="done" placeholder="输入优惠券码" />
        <button size="mini" @click="applyCoupon">使用</button>
        <button v-if="appliedCoupon" size="mini" plain @click="clearCoupon">不用券</button>
      </view>
      <text v-if="appliedCoupon" class="coupon-tip">已使用：{{ appliedCoupon.name }}，优惠 ¥{{ money(couponDiscountAmount) }}</text>
      <text v-else class="empty-tip">有券码可直接输入；跨店时优惠只会分摊到适用店铺和商品。</text>
    </view>

    <view class="card">
      <view class="row">
        <text class="section-title">积分抵扣</text>
        <text class="link">100 积分抵 1 元</text>
      </view>
      <text class="empty-tip">可用积分：{{ pointsQuote.availablePoints || 0 }}，最多可抵 ¥{{ money(maxPointsDiscount) }}；跨店时按券后商品金额精确分摊。</text>
      <view class="coupon-input">
        <input v-model.number="pointsToUse" aria-label="要使用的积分" type="number" maxlength="9" cursor-spacing="24" confirm-type="done" placeholder="输入要使用的积分" />
        <button size="mini" @click="refreshQuote">抵扣</button>
        <button v-if="pointsToUse" size="mini" plain @click="clearPoints">不用积分</button>
      </view>
    </view>

    <view class="card">
      <text class="section-title">推广码</text>
      <view class="coupon-input">
        <input v-model="promotionCode" aria-label="推广码" maxlength="64" cursor-spacing="24" confirm-type="done" placeholder="有推广码可填写，便于商家统计推广佣金" @input="handlePromotionInput" />
        <button v-if="promotionCode" size="mini" :loading="promotionValidating" @click="applyPromotion">校验</button>
        <button v-if="promotionCode" size="mini" plain @click="clearPromotion">清空</button>
      </view>
      <text v-if="promotionNotice" class="promotion-notice" :class="{ warning: promotionCommissionEligible === false }" role="status" aria-live="polite">{{ promotionNotice }}</text>
      <text v-else class="empty-tip">不填写也可以正常下单；填写后需先校验并锁定到本次报价。</text>
    </view>

    <view class="card">
      <text class="section-title">支付方式</text>
      <view v-if="paymentMethodsError" class="inline-error" role="alert" aria-live="assertive">
        <text>{{ paymentMethodsError }}</text>
        <text class="state-retry" role="button" tabindex="0" aria-label="重新加载支付方式" @click="reloadPaymentMethods" @keyup.enter="reloadPaymentMethods" @keyup.space.prevent="reloadPaymentMethods">重新加载支付方式</text>
      </view>
      <radio-group @change="paymentMethod = $event.detail.value">
        <label v-for="method in paymentMethods" :key="method.value" class="pay-row" :class="{ disabled: !method.enabled }">
          <radio :value="method.value" :checked="paymentMethod === method.value" :disabled="!method.enabled" />
          <view>
            <text class="pay-name">{{ method.name }}</text>
            <text class="pay-desc">{{ method.enabled ? method.desc : method.disabledReason || "当前不可用" }}</text>
            <text v-if="method.paymentRouteText || method.collectionModeText" class="pay-route">{{ method.paymentRouteText || method.collectionModeText }}</text>
          </view>
        </label>
      </radio-group>
      <text v-if="!paymentMethodsError && !availablePaymentMethods.length" class="empty-tip">当前商家暂未开放商城支付方式，请联系后台配置。</text>
      <textarea v-model="buyerRemark" aria-label="买家备注" maxlength="500" cursor-spacing="24" adjust-position="true" placeholder="买家备注，可选" />
    </view>
    <view v-if="submitError" class="state-card error-state" role="alert" aria-live="assertive">
      <text>{{ submitError }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新提交订单" @click="submit" @keyup.enter="submit" @keyup.space.prevent="submit">重新提交</view>
    </view>
    <view class="submit" :class="{ disabled: !canSubmitOrder }" role="button" tabindex="0" :aria-disabled="!canSubmitOrder" :aria-busy="submitting" aria-label="提交订单" @click="submit" @keyup.enter="submit" @keyup.space.prevent="submit">{{ submitting ? "提交中..." : "提交订单" }}</view>
    <WechatPhoneBindSheet
      :visible="phoneBindVisible"
      title="下单前绑定手机号"
      message="商城订单、收货联系和余额支付需要手机号，授权后将继续提交订单。"
      close-text="暂不下单"
      @close="closePhoneBindPanel"
      @bound="handlePhoneBound"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, fetchMyProfile, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { handleMallWechatPayResult, preferredMallWechatPaymentScene } from "../../mall-payment";
import WechatPhoneBindSheet from "../../components/WechatPhoneBindSheet.vue";
import { createTenantLoadGuard } from "../../tenant-load-guard";

const skuId = ref(0);
const flashSaleId = ref(0);
const groupBuyId = ref(0);
const joinTeamNo = ref("");
const quantity = ref(1);
const cartItemIds = ref<number[]>([]);
const checkoutItems = ref<any[]>([]);
const addresses = ref<any[]>([]);
const selectedAddressId = ref(0);
const paymentMethod = ref("balance");
const buyerRemark = ref("");
const couponCode = ref("");
const promotionCode = ref("");
const promotionNotice = ref("");
const promotionCommissionEligible = ref<boolean | null>(null);
const promotionValidating = ref(false);
const coupons = ref<any[]>([]);
const appliedCoupon = ref<any>(null);
const pointsToUse = ref(0);
const pointsQuote = ref<any>({ availablePoints: 0, pointsUsed: 0, pointsDiscountAmount: "0.00" });
const quote = ref<any>(null);
const quoteToken = ref("");
const quoteError = ref("");
const paymentMethods = ref<any[]>([]);
const submitting = ref(false);
const pageLoading = ref(false);
const loadError = ref("");
const addressError = ref("");
const paymentMethodsError = ref("");
const couponsWarning = ref("");
const submitError = ref("");
const clientOrderKey = ref("");
const phoneBindVisible = ref(false);
const pendingPhoneAction = ref<"" | "submit">("");
const loadedTenantCode = ref("");
const pageLoadGuard = createTenantLoadGuard();
const addressLoadGuard = createTenantLoadGuard();
const itemLoadGuard = createTenantLoadGuard();
const couponLoadGuard = createTenantLoadGuard();
const quoteLoadGuard = createTenantLoadGuard();
const paymentMethodsLoadGuard = createTenantLoadGuard();
const submitGuard = createTenantLoadGuard();
const availablePaymentMethods = computed(() => paymentMethods.value.filter((item) => item.enabled));
const selectedAddress = computed(() => addresses.value.find((item) => item.id === selectedAddressId.value) || addresses.value.find((item) => item.isDefault) || addresses.value[0] || null);
const totalAmount = computed(() => checkoutItems.value.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0));
const merchantAllocationMap = computed(() => new Map((quote.value?.allocations || []).map((item: any) => [Number(item.merchantId || 0), item])));
const checkoutMerchantGroups = computed(() => {
  const groups = new Map<string, { key: string; merchantId: number; name: string; ownerText: string; amount: number; items: any[] }>();
  for (const item of checkoutItems.value) {
    const merchant = item.merchant || null;
    const merchantId = Number(merchant?.id || 0);
    const key = merchantId ? `merchant_${merchantId}` : "merchant_default";
    const group = groups.get(key) || {
      key,
      merchantId,
      name: merchant?.name || "默认店铺",
      ownerText: merchant?.ownerType === "agent" ? "代理店铺" : "商家店铺",
      amount: 0,
      items: []
    };
    group.amount += Number(item.price || 0) * Number(item.quantity || 0);
    group.items.push(item);
    groups.set(key, group);
  }
  return Array.from(groups.values()).map((group) => {
    const allocation: any = merchantAllocationMap.value.get(group.merchantId) || {};
    return { ...group, freightAmount: Number(allocation.freightFen || 0) / 100, discountAmount: Number(allocation.discountFen || 0) / 100, payableAmount: allocation.payableFen === undefined ? group.amount : Number(allocation.payableFen || 0) / 100 };
  });
});
const isCrossMerchantCheckout = computed(() => checkoutMerchantGroups.value.length > 1);
const currentCouponMerchantId = computed(() => !isCrossMerchantCheckout.value ? Number(checkoutMerchantGroups.value[0]?.merchantId || 0) : 0);
const couponDiscountAmount = computed(() => Number(quote.value?.couponDiscountAmount ?? (appliedCoupon.value ? Math.min(Number(appliedCoupon.value.discountAmount || 0), totalAmount.value) : 0)));
const discountAmount = computed(() => Number(quote.value?.discountAmount ?? couponDiscountAmount.value));
const freightAmount = computed(() => Number(quote.value?.freightAmount || 0));
const payableAmount = computed(() => Number(quote.value?.payableAmount ?? Math.max(totalAmount.value + freightAmount.value - discountAmount.value, 0)));
const maxPointsDiscount = computed(() => Math.min(Number(pointsQuote.value.availablePoints || 0) / 100, Math.max(totalAmount.value - Number(quote.value?.couponDiscountAmount || 0), 0)));
const canSubmitOrder = computed(() => !pageLoading.value && !submitting.value && !loadError.value && !addressError.value && !paymentMethodsError.value && !quoteError.value && !!quoteToken.value && !!selectedAddress.value && checkoutItems.value.length > 0 && checkoutItems.value.every(canSubmitItem) && availablePaymentMethods.value.some((item) => item.value === paymentMethod.value));
function money(value: any) { return Number(value || 0).toFixed(2); }
function addressText(item: any) { return [item.province, item.city, item.district, item.detail].filter(Boolean).join(" "); }
function dateText(value: any) { return value ? String(value).slice(0, 10) : "长期有效"; }
function couponMeta(coupon: any) {
  const remain = coupon.remainingCount === null || coupon.remainingCount === undefined ? "不限量" : `剩 ${coupon.remainingCount} 张`;
  return `${remain} · ${dateText(coupon.endsAt)}前可用`;
}
function canSubmitItem(item: any) {
  if (item.purchasable === false) return false;
  if (item.availableStock === undefined || item.availableStock === null) return true;
  return Number(item.availableStock || 0) >= Number(item.quantity || 0);
}
async function loadAddresses() {
  const loadToken = addressLoadGuard.begin();
  addressError.value = "";
  try {
    const rows = await request<any[]>("/public/me/mall/addresses");
    if (!addressLoadGuard.isCurrent(loadToken)) return false;
    addresses.value = rows;
    const stored = Number(uni.getStorageSync(`mall_selected_address_id:${loadToken.tenantCode || "global"}`) || 0);
    if (stored && rows.some((item) => item.id === stored)) selectedAddressId.value = stored;
    else selectedAddressId.value = rows.find((item) => item.isDefault)?.id || rows[0]?.id || 0;
    return true;
  } catch (error: any) {
    if (addressLoadGuard.isCurrent(loadToken)) addressError.value = error?.message || "收货地址加载失败，请重新加载。";
    return false;
  }
}
async function loadItems() {
  const loadToken = itemLoadGuard.begin();
  if (cartItemIds.value.length) {
    const cart = await request<any[]>("/public/me/mall/cart");
    const items = cart.filter((item) => cartItemIds.value.includes(item.id)).map((item) => ({
      cartItemId: item.id,
      skuId: item.sku?.id,
      productTitle: item.product?.title,
      skuName: item.sku?.name,
      merchant: item.merchant || item.product?.merchant || item.sku?.merchant || null,
      price: Number(item.sku?.price || 0),
      quantity: Number(item.quantity || 0),
      availableStock: Number(item.availableStock || 0),
      purchasable: item.purchasable !== false,
      unavailableReason: item.unavailableReason || ""
    }));
    if (!itemLoadGuard.isCurrent(loadToken)) return false;
    checkoutItems.value = items;
    return true;
  }
  const result = await request<any>("/public/mall/products?pageSize=100");
  let targetProduct: any = null;
  let targetSku: any = null;
  for (const product of result.items || []) {
    const sku = (product.skus || []).find((row: any) => row.id === skuId.value);
    if (sku) {
      targetProduct = product;
      targetSku = sku;
      break;
    }
  }
  if (!targetProduct || !targetSku) {
    throw new Error("商品不存在、已下架或当前规格不可购买。");
  }
  const merchantId = targetProduct.merchant?.id || targetSku.merchant?.id || 0;
  const activityScope = merchantId ? `?merchantId=${merchantId}` : "";
  let flashSales: any[] = [];
  let groupBuys: any[] = [];
  if (flashSaleId.value) {
    try {
      flashSales = await request<any[]>(`/public/mall/flash-sales${activityScope}`);
    } catch (error: any) {
      throw new Error(error?.message || "秒杀信息同步失败，请重新加载结算。");
    }
  }
  if (groupBuyId.value) {
    try {
      groupBuys = await request<any[]>(`/public/mall/group-buys${activityScope}`);
    } catch (error: any) {
      throw new Error(error?.message || "拼团信息同步失败，请重新加载结算。");
    }
  }
  const flashSale = flashSales.find((item) => item.id === flashSaleId.value && (item.sku?.id || item.skuId) === skuId.value);
  const groupBuy = groupBuys.find((item) => item.id === groupBuyId.value && (item.sku?.id || item.skuId) === skuId.value);
  if (flashSaleId.value && !flashSale) throw new Error("秒杀活动已失效或当前规格不适用，请返回商品页重新选择。");
  if (groupBuyId.value && !groupBuy) throw new Error("拼团活动已失效或当前规格不适用，请返回商品页重新选择。");
  const promo = flashSale || groupBuy;
  const item = { skuId: targetSku.id, flashSaleId: flashSale?.id || undefined, groupBuyId: groupBuy?.id || undefined, joinTeamNo: groupBuy ? joinTeamNo.value || undefined : undefined, productTitle: targetProduct.title, skuName: promo ? `${targetSku.name} · ${promo.title}` : targetSku.name, merchant: targetProduct.merchant || targetSku.merchant || null, price: Number(flashSale?.salePrice || groupBuy?.groupPrice || targetSku.price || 0), quantity: quantity.value, availableStock: 0 };
  item.availableStock = promo
    ? Number(promo.availableStock || 0)
    : targetSku.availableStock !== undefined && targetSku.availableStock !== null
      ? Math.max(Number(targetSku.availableStock || 0), 0)
      : Math.max(Number(targetSku.stock || 0) - Number(targetSku.lockedStock || 0), 0);
  if (!itemLoadGuard.isCurrent(loadToken)) return false;
  checkoutItems.value = [item];
  return true;
}
async function loadPaymentMethodsForCheckout() {
  const groups = checkoutMerchantGroups.value;
  const merchantIds = Array.from(new Set(groups.map((group) => Number(String(group.key).replace("merchant_", ""))).filter(Boolean)));
  if (merchantIds.length <= 1) {
    const query = merchantIds[0] ? `?merchantId=${merchantIds[0]}` : "";
    const methods = await request<any[]>(`/public/mall/payment-methods${query}`);
    return methods.map(applyCrossMerchantPaymentGuard);
  }
  const methodLists = await Promise.all(merchantIds.map((merchantId) => request<any[]>(`/public/mall/payment-methods?merchantId=${merchantId}`)));
  const first = methodLists[0] || [];
  return first.map((method) => {
    const rows = methodLists.map((list) => list.find((item) => item.value === method.value)).filter(Boolean);
    const disabled = rows.find((item) => !item.enabled);
    return {
      ...method,
      enabled: rows.length === methodLists.length && rows.every((item) => item.enabled),
      desc: method.value === "wechat" ? "平台代收店铺统一支付；商户直收店铺按店铺分别支付" : method.desc,
      disabledReason: disabled ? `跨店商品中有店铺暂不可用：${disabled.disabledReason || disabled.status || method.name}` : method.disabledReason
    };
  }).map(applyCrossMerchantPaymentGuard);
}
function applyCrossMerchantPaymentGuard(method: any) {
  if (isCrossMerchantCheckout.value && method.value === "balance") {
    return {
      ...method,
      desc: "钱包统一扣款一次，各店铺子订单分别履约和售后",
      paymentRouteText: "结算组统一余额支付"
    };
  }
  return method;
}
async function loadCoupons() {
  const loadToken = couponLoadGuard.begin();
  couponsWarning.value = "";
  if (totalAmount.value <= 0) {
    coupons.value = [];
    appliedCoupon.value = null;
    couponCode.value = "";
    return;
  }
  const requests = [request<any[]>(`/public/me/mall/coupons?amount=${totalAmount.value}`)];
  if (isCrossMerchantCheckout.value) {
    for (const group of checkoutMerchantGroups.value) requests.push(request<any[]>(`/public/me/mall/coupons?amount=${group.amount}&merchantId=${group.merchantId}`));
  } else if (currentCouponMerchantId.value) {
    requests.push(request<any[]>(`/public/me/mall/coupons?amount=${totalAmount.value}&merchantId=${currentCouponMerchantId.value}`));
  }
  const couponMap = new Map<number, any>();
  const results = await Promise.allSettled(requests);
  if (!couponLoadGuard.isCurrent(loadToken)) return false;
  for (const result of results) {
    if (result.status === "fulfilled") for (const coupon of result.value) couponMap.set(Number(coupon.id), coupon);
  }
  const failedCount = results.filter((result) => result.status === "rejected").length;
  if (failedCount) couponsWarning.value = `部分优惠券同步失败（${failedCount} 项），可重新同步或直接输入券码校验。`;
  coupons.value = Array.from(couponMap.values());
  if (appliedCoupon.value && !coupons.value.some((item) => item.code === appliedCoupon.value.code)) clearCoupon();
  return true;
}
async function refreshQuote() {
  if (!checkoutItems.value.length) return;
  const loadToken = quoteLoadGuard.begin();
  try {
    const result = await request<any>("/public/mall/quote", {
      method: "POST",
      data: {
        cartItemIds: cartItemIds.value.length ? cartItemIds.value : undefined,
        items: cartItemIds.value.length ? undefined : checkoutItems.value.map((item) => ({ skuId: item.skuId, quantity: item.quantity, flashSaleId: item.flashSaleId, groupBuyId: item.groupBuyId, joinTeamNo: item.joinTeamNo })),
        couponCode: appliedCoupon.value ? couponCode.value : undefined,
        pointsToUse: pointsToUse.value || undefined,
        promotionCode: promotionCode.value.trim() || undefined
      }
    });
    if (!quoteLoadGuard.isCurrent(loadToken)) return false;
    quote.value = result;
    quoteToken.value = result.quoteToken || "";
    quoteError.value = "";
    promotionCode.value = result.promotion?.code || promotionCode.value.trim();
    promotionNotice.value = result.promotion?.notice || "";
    promotionCommissionEligible.value = result.promotion ? result.promotion.commissionEligible !== false : null;
    if (Array.isArray(result.items) && result.items.length === checkoutItems.value.length) {
      checkoutItems.value = result.items.map((line: any, index: number) => ({ ...checkoutItems.value[index], ...line, price: Number(line.unitPrice || 0), merchant: line.merchant || checkoutItems.value[index]?.merchant }));
    }
    pointsQuote.value = { availablePoints: result.availablePoints || 0, pointsUsed: result.pointsUsed || 0, pointsDiscountAmount: result.pointsDiscountAmount || "0.00" };
    if (result.coupon) appliedCoupon.value = result.coupon;
    return true;
  } catch (error: any) {
    if (!quoteLoadGuard.isCurrent(loadToken)) return false;
    quoteToken.value = "";
    quoteError.value = error.message || "报价失败，请返回购物车调整后重试";
    if (promotionCode.value.trim()) {
      promotionNotice.value = quoteError.value;
      promotionCommissionEligible.value = false;
    }
    uni.showToast({ title: quoteError.value, icon: "none" });
    return false;
  }
}
async function load() {
  const loadToken = pageLoadGuard.begin();
  if (loadedTenantCode.value && loadedTenantCode.value !== loadToken.tenantCode) {
    addressLoadGuard.invalidate();
    itemLoadGuard.invalidate();
    couponLoadGuard.invalidate();
    quoteLoadGuard.invalidate();
    paymentMethodsLoadGuard.invalidate();
    submitGuard.invalidate();
    addresses.value = [];
    selectedAddressId.value = 0;
    checkoutItems.value = [];
    paymentMethods.value = [];
    coupons.value = [];
    appliedCoupon.value = null;
    quote.value = null;
    quoteToken.value = "";
    submitting.value = false;
    clientOrderKey.value = createClientOrderKey();
  }
  pageLoading.value = true;
  loadError.value = "";
  paymentMethodsError.value = "";
  submitError.value = "";
  try {
    await ensureUser();
    if (!pageLoadGuard.isCurrent(loadToken)) return;
    await Promise.all([loadAddresses(), loadItems()]);
    if (!pageLoadGuard.isCurrent(loadToken)) return;
    try {
      const paymentLoadToken = paymentMethodsLoadGuard.begin();
      const methods = await loadPaymentMethodsForCheckout();
      if (paymentMethodsLoadGuard.isCurrent(paymentLoadToken) && pageLoadGuard.isCurrent(loadToken)) paymentMethods.value = methods;
    } catch (error: any) {
      if (pageLoadGuard.isCurrent(loadToken)) paymentMethodsError.value = error?.message || "支付方式同步失败，请重新加载。";
    }
    if (!pageLoadGuard.isCurrent(loadToken)) return;
    if (!availablePaymentMethods.value.some((item) => item.value === paymentMethod.value)) paymentMethod.value = availablePaymentMethods.value[0]?.value || "offline";
    await loadCoupons();
    if (!pageLoadGuard.isCurrent(loadToken)) return;
    await refreshQuote();
  } catch (error: any) {
    if (pageLoadGuard.isCurrent(loadToken)) loadError.value = error?.message || "结算信息加载失败，请稍后重试。";
  } finally {
    if (pageLoadGuard.isCurrent(loadToken)) {
      loadedTenantCode.value = loadToken.tenantCode;
      pageLoading.value = false;
    }
  }
}
async function reloadPaymentMethods() {
  const loadToken = paymentMethodsLoadGuard.begin();
  paymentMethodsError.value = "";
  try {
    const methods = await loadPaymentMethodsForCheckout();
    if (!paymentMethodsLoadGuard.isCurrent(loadToken)) return;
    paymentMethods.value = methods;
    if (!availablePaymentMethods.value.some((item) => item.value === paymentMethod.value)) paymentMethod.value = availablePaymentMethods.value[0]?.value || "offline";
  } catch (error: any) {
    if (paymentMethodsLoadGuard.isCurrent(loadToken)) paymentMethodsError.value = error?.message || "支付方式同步失败，请重新加载。";
  }
}
function goAddresses() {
  uni.navigateTo({ url: withTenantCode("/pages/mall/addresses?select=1") });
}
function goCoupons() {
  const merchantQuery = currentCouponMerchantId.value ? `?merchantId=${currentCouponMerchantId.value}` : "";
  uni.navigateTo({ url: withTenantCode(`/pages/mall/coupons${merchantQuery}`) });
}
function selectCoupon(coupon: any) {
  couponCode.value = coupon.code;
  appliedCoupon.value = coupon;
  refreshQuote();
}
async function applyCoupon() {
  if (!couponCode.value.trim()) return uni.showToast({ title: "请输入优惠券码", icon: "none" });
  try {
    if (isCrossMerchantCheckout.value) {
      appliedCoupon.value = coupons.value.find((item) => item.code === couponCode.value.trim()) || { code: couponCode.value.trim(), name: couponCode.value.trim() };
      if (!(await refreshQuote())) {
        appliedCoupon.value = null;
        return;
      }
      return uni.showToast({ title: "优惠券已按适用店铺分摊", icon: "none" });
    }
    const merchantQuery = currentCouponMerchantId.value ? `&merchantId=${currentCouponMerchantId.value}` : "";
    const result = await request<any>(`/public/mall/coupons/validate?code=${encodeURIComponent(couponCode.value.trim())}&amount=${totalAmount.value}${merchantQuery}`);
    appliedCoupon.value = { ...result.coupon, discountAmount: result.discountAmount };
    couponCode.value = result.coupon.code;
    await refreshQuote();
    uni.showToast({ title: "优惠券已使用", icon: "none" });
  } catch (error: any) {
    appliedCoupon.value = null;
    uni.showToast({ title: error.message || "优惠券不可用", icon: "none" });
  }
}
function clearCoupon() {
  couponCode.value = "";
  appliedCoupon.value = null;
  refreshQuote();
}
function clearPoints() {
  pointsToUse.value = 0;
  refreshQuote();
}
function confirmCrossMerchantCheckout() {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title: "确认跨店拆单",
      content: `本次包含 ${checkoutMerchantGroups.value.length} 个店铺，提交后将按店铺生成子订单。${paymentMethod.value === "balance" ? "钱包只扣款一次，" : paymentMethod.value === "wechat" ? "平台代收条件满足时微信只支付一次，" : ""}各店铺分别发货和处理售后。`,
      confirmText: "继续下单",
      cancelText: "再看看",
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    });
  });
}
function createClientOrderKey() {
  return `mall_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function handlePromotionInput(event?: any) {
  if (event?.detail?.value !== undefined) promotionCode.value = String(event.detail.value);
  quoteToken.value = "";
  quoteError.value = "";
  submitError.value = "";
  promotionNotice.value = promotionCode.value.trim() ? "推广码已修改，请先校验后再提交订单" : "";
  promotionCommissionEligible.value = null;
}
async function applyPromotion() {
  if (!promotionCode.value.trim()) return clearPromotion();
  if (promotionValidating.value) return;
  promotionValidating.value = true;
  try {
    if (await refreshQuote()) uni.showToast({ title: promotionCommissionEligible.value === false ? "推广码有效，自购不计佣" : "推广码已锁定", icon: "none" });
  } finally {
    promotionValidating.value = false;
  }
}
async function clearPromotion() {
  promotionCode.value = "";
  promotionNotice.value = "";
  promotionCommissionEligible.value = null;
  await refreshQuote();
}
function promotionDeviceId() {
  const storageKey = "mall_promotion_device_id";
  const current = String(uni.getStorageSync(storageKey) || "").trim();
  if (current) return current;
  const created = `device_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  uni.setStorageSync(storageKey, created);
  return created;
}
async function submit() {
  if (submitting.value) return;
  if (pageLoading.value || loadError.value || addressError.value || paymentMethodsError.value || quoteError.value) return uni.showToast({ title: "结算信息尚未就绪，请先重新加载。", icon: "none" });
  if (!selectedAddress.value) return uni.showToast({ title: "请选择收货地址", icon: "none" });
  if (!checkoutItems.value.length) return uni.showToast({ title: "请选择商品", icon: "none" });
  if (!checkoutItems.value.every(canSubmitItem)) return uni.showToast({ title: "存在库存不足商品，请返回购物车调整", icon: "none" });
  if (!availablePaymentMethods.value.some((item) => item.value === paymentMethod.value)) return uni.showToast({ title: "请选择可用支付方式", icon: "none" });
  const submitToken = submitGuard.begin();
  submitting.value = true;
  submitError.value = "";
  try {
    if (isCrossMerchantCheckout.value && !(await confirmCrossMerchantCheckout())) return;
    if (!submitGuard.isCurrent(submitToken)) return;
    if (!(await requirePhoneBound("submit"))) return;
    if (!submitGuard.isCurrent(submitToken)) return;
    const result = await request<any>("/public/mall/checkout-groups", {
      method: "POST",
      data: {
        cartItemIds: cartItemIds.value.length ? cartItemIds.value : undefined,
        items: cartItemIds.value.length ? undefined : checkoutItems.value.map((item) => ({ skuId: item.skuId, quantity: item.quantity, flashSaleId: item.flashSaleId, groupBuyId: item.groupBuyId, joinTeamNo: item.joinTeamNo })),
        addressId: selectedAddress.value.id,
        paymentMethod: paymentMethod.value,
        couponCode: appliedCoupon.value ? couponCode.value : undefined,
        pointsToUse: pointsToUse.value || undefined,
        promotionCode: promotionCode.value.trim() || undefined,
        buyerRemark: buyerRemark.value,
        clientOrderKey: clientOrderKey.value,
        deviceId: promotionDeviceId(),
        quoteToken: quoteToken.value
      }
    });
    if (!submitGuard.isCurrent(submitToken)) return;
    const orders = Array.isArray(result.orders) ? result.orders : [result];
    const firstOrder = orders[0] || {};
    if (paymentMethod.value === "wechat" && orders.length === 1 && firstOrder.id) {
      const pay = await request<any>(`/public/mall/orders/${firstOrder.id}/pay/wechat`, {
        method: "POST",
        data: { paymentScene: preferredMallWechatPaymentScene() }
      });
      if (!submitGuard.isCurrent(submitToken)) return;
      const redirected = await handleMallWechatPayResult(pay);
      if (redirected) return;
    } else if (paymentMethod.value === "wechat" && orders.length > 1 && result.id) {
      try {
        const pay = await request<any>(`/public/mall/checkout-groups/${result.id}/pay/wechat`, {
          method: "POST",
          data: { paymentScene: preferredMallWechatPaymentScene() }
        });
        if (!submitGuard.isCurrent(submitToken)) return;
        const redirected = await handleMallWechatPayResult(pay);
        if (redirected) return;
      } catch (payError: any) {
        if (!submitGuard.isCurrent(submitToken)) return;
        submitError.value = payError.message || "订单已生成，但统一支付未能发起，请到我的订单按店铺处理。";
        uni.showModal({ title: "订单已生成", content: payError.message || "本次包含商户直收店铺，请到我的订单按店铺分别支付。", showCancel: false, confirmText: "查看订单" });
      }
    } else {
      uni.showToast({ title: paymentMethod.value === "balance" ? "支付成功" : "订单已提交", icon: "none" });
    }
    const groupNo = result.groupNo || firstOrder.checkoutGroup?.groupNo || "";
    const multiOrderUrl = groupNo ? `/pages/user/mall-orders?checkoutGroupNo=${encodeURIComponent(groupNo)}` : "/pages/user/mall-orders";
    uni.redirectTo({ url: withTenantCode(orders.length > 1 ? multiOrderUrl : firstOrder.id ? `/pages/user/mall-order-detail?id=${firstOrder.id}` : "/pages/user/mall-orders") });
  } catch (error: any) {
    if (!submitGuard.isCurrent(submitToken)) return;
    const message = error.message || "提交失败";
    submitError.value = message;
    if (String(message).includes("刷新确认订单")) {
      await refreshQuote();
      uni.showModal({ title: "订单信息已更新", content: "商品价格、库存或优惠发生了变化，页面已重新报价，请核对后再次提交。", showCancel: false, confirmText: "重新核对" });
    } else {
      uni.showToast({ title: message, icon: "none" });
    }
  } finally {
    if (submitGuard.isCurrent(submitToken)) submitting.value = false;
  }
}

async function requirePhoneBound(action: "submit") {
  await ensureUser();
  const profile = await fetchMyProfile();
  if (profile?.phone) return true;
  pendingPhoneAction.value = action;
  phoneBindVisible.value = true;
  return false;
}

function closePhoneBindPanel() {
  phoneBindVisible.value = false;
  pendingPhoneAction.value = "";
}

function handlePhoneBound() {
  const action = pendingPhoneAction.value;
  phoneBindVisible.value = false;
  pendingPhoneAction.value = "";
  if (action === "submit") submit();
}
onLoad((query) => {
  skuId.value = Number(query?.skuId || 0);
  flashSaleId.value = Number(query?.flashSaleId || 0);
  groupBuyId.value = Number(query?.groupBuyId || 0);
  joinTeamNo.value = String(query?.joinTeamNo || "").trim();
  quantity.value = Math.max(Number(query?.quantity || 1), 1);
  cartItemIds.value = String(query?.cartItemIds || "").split(",").map(Number).filter(Boolean);
  clientOrderKey.value = createClientOrderKey();
});
onShow(load);
</script>

<style scoped>
.checkout-page { min-height:100vh; box-sizing:border-box; padding:24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom)); background:#f8fafc; }
.card { background:#fff; border-radius:28rpx; padding:26rpx; margin-bottom:20rpx; box-shadow:0 12rpx 30rpx rgba(15,23,42,.06); }
.row { display:flex; justify-content:space-between; align-items:center; gap:16rpx; }
.section-title { display:block; font-size:30rpx; font-weight:900; margin-bottom:18rpx; color:#1f2937; }
.link { color:#c2410c; font-size:25rpx; font-weight:800; }
.address-name { display:block; color:#1f2937; font-size:29rpx; font-weight:900; }
.address-detail, .empty-tip { display:block; color:#64748b; font-size:26rpx; line-height:1.5; }
.checkout-store { margin-bottom:18rpx; padding:16rpx; border-radius:22rpx; background:#f8fafc; border:1rpx solid #eef2f7; }
.cross-checkout-summary { margin-bottom:18rpx; padding:18rpx; border-radius:18rpx; background:#fff7ed; color:#9a3412; font-size:25rpx; line-height:1.5; font-weight:900; border:1rpx solid #fed7aa; }
.checkout-store-head { display:flex; justify-content:space-between; gap:16rpx; margin-bottom:8rpx; }
.checkout-store-name { display:block; color:#1f2937; font-size:28rpx; font-weight:900; }
.checkout-store-meta { display:block; margin-top:4rpx; color:#94a3b8; font-size:23rpx; }
.item-row, .pay-row { display:flex; justify-content:space-between; align-items:center; gap:16rpx; padding:16rpx 0; color:#334155; font-size:28rpx; border-bottom:1rpx solid #f1f5f9; }
.pay-row.disabled { opacity:.58; }
.checkout-store .item-row:last-child { border-bottom:0; }
.store-discount-row, .store-allocation-row { display:flex; justify-content:space-between; align-items:center; padding-top:12rpx; font-size:25rpx; font-weight:900; }
.store-discount-row { color:#16a34a; border-top:1rpx dashed #fed7aa; }
.store-allocation-row { color:#9a3412; }
.pay-row view { flex:1; display:grid; gap:4rpx; }
.pay-name { color:#1f2937; font-size:28rpx; font-weight:900; }
.pay-desc { color:#94a3b8; font-size:23rpx; line-height:1.4; }
.pay-route { display:inline-block; justify-self:start; padding:4rpx 10rpx; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:21rpx; font-weight:900; }
.item-name { display:block; min-width:0; max-width:460rpx; font-weight:800; color:#1f2937; overflow-wrap:anywhere; }
.item-sku { display:block; margin-top:6rpx; color:#94a3b8; font-size:24rpx; }
.item-sku.danger { color:#dc2626; font-weight:800; }
.amount-col { display:grid; justify-items:end; gap:8rpx; color:#64748b; }
.amount-row { display:flex; justify-content:space-between; align-items:center; margin-top:14rpx; color:#64748b; font-size:26rpx; }
.amount-row.discount { color:#16a34a; font-weight:800; }
.amount { margin-top:16rpx; color:#c2410c; font-size:38rpx; font-weight:900; text-align:right; }
.quote-error { display:block; margin-top:14rpx; padding:16rpx; border-radius:16rpx; background:#fef2f2; color:#dc2626; font-size:24rpx; line-height:1.5; }
.coupon-list { display:flex; gap:12rpx; flex-wrap:wrap; margin-bottom:16rpx; }
.coupon-chip { min-width:250rpx; padding:16rpx 18rpx; border:1rpx solid #fed7aa; border-radius:18rpx; background:#fff7ed; color:#9a3412; display:grid; gap:6rpx; font-size:23rpx; }
.coupon-chip.active { background:#9a3412; color:#fff; border-color:#9a3412; }
.coupon-head { display:flex; justify-content:space-between; gap:12rpx; font-weight:900; }
.coupon-code { opacity:.72; font-size:21rpx; }
.coupon-main { font-size:28rpx; font-weight:900; }
.coupon-meta { opacity:.78; font-size:22rpx; }
.coupon-input { display:flex; gap:12rpx; align-items:center; }
.coupon-input input { flex:1; height:72rpx; padding:0 18rpx; border-radius:16rpx; background:#f8fafc; font-size:26rpx; }
.coupon-tip { display:block; margin-top:12rpx; color:#16a34a; font-size:25rpx; font-weight:800; }
.promotion-notice { display:block; margin-top:12rpx; padding:14rpx 16rpx; border-radius:8px; background:#f0fdf4; color:#15803d; font-size:24rpx; line-height:1.5; font-weight:800; overflow-wrap:anywhere; }
.promotion-notice.warning { border:1rpx solid #fed7aa; background:#fffaf0; color:#9a3412; }
.cross-tip { display:block; padding:18rpx; border-radius:18rpx; background:#fff7ed; color:#9a3412; font-size:25rpx; line-height:1.5; font-weight:800; }
textarea { width:100%; min-height:120rpx; margin-top:18rpx; padding:18rpx; box-sizing:border-box; border-radius:18rpx; background:#f8fafc; font-size:26rpx; line-height:1.55; overflow-wrap:anywhere; }
.submit { height:90rpx; border-radius:999px; background:linear-gradient(135deg,#9a3412,#ea580c); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:30rpx; margin-top:30rpx; }
.submit.disabled { opacity:.48; background:#cbd5e1; }
.state-card { display:grid; gap:12rpx; margin-bottom:20rpx; padding:22rpx 24rpx; border-radius:8px; background:#fff; color:#64748b; font-size:25rpx; line-height:1.55; }
.state-card.error-state, .inline-error { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-card.warning-state, .inline-warning { border:1rpx solid #fed7aa; background:#fffaf0; color:#9a3412; }
.state-retry { width:max-content; color:#c2410c; font-weight:900; }
.inline-error { display:grid; gap:8rpx; margin-bottom:12rpx; padding:16rpx; border-radius:8px; font-size:24rpx; line-height:1.5; }
.inline-warning { display:block; margin-bottom:14rpx; padding:14rpx 16rpx; border-radius:8px; font-size:23rpx; line-height:1.5; }
.submit.disabled { pointer-events:none; }
@media (min-width: 760px) { .checkout-page { width:760px; margin:0 auto; } }
</style>
