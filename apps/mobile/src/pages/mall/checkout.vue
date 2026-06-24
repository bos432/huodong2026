<template>
  <view class="checkout-page">
    <view class="card address-card" @click="goAddresses">
      <view class="row">
        <text class="section-title">收货地址</text>
        <text class="link">管理/选择 ›</text>
      </view>
      <view v-if="selectedAddress">
        <text class="address-name">{{ selectedAddress.receiverName }} {{ selectedAddress.receiverPhone }}</text>
        <text class="address-detail">{{ addressText(selectedAddress) }}</text>
      </view>
      <text v-else class="empty-tip">请先新增或选择收货地址</text>
    </view>

    <view class="card">
      <text class="section-title">商品信息</text>
      <view v-if="isCrossMerchantCheckout" class="cross-checkout-summary">
        本次包含 {{ checkoutMerchantGroups.length }} 个店铺，提交后会生成 {{ checkoutMerchantGroups.length }} 个子订单；每个店铺独立支付、发货和售后。
      </view>
      <view v-for="group in checkoutMerchantGroups" :key="group.key" class="checkout-store">
        <view class="checkout-store-head">
          <view>
            <text class="checkout-store-name">{{ group.name }}</text>
            <text class="checkout-store-meta">{{ group.ownerText }} · 小计 ¥{{ money(group.amount) }}</text>
          </view>
        </view>
        <view v-for="item in group.items" :key="item.skuId" class="item-row">
          <view>
            <text class="item-name">{{ item.productTitle }}</text>
            <text class="item-sku" :class="{ danger: !canSubmitItem(item) }">{{ item.skuName }}{{ item.availableStock !== undefined ? ` · ${canSubmitItem(item) ? `可购 ${item.availableStock}` : "库存不足或已售罄"}` : "" }}</text>
          </view>
          <view class="amount-col">
            <text>× {{ item.quantity }}</text>
            <text>¥{{ money(item.price * item.quantity) }}</text>
          </view>
        </view>
      </view>
      <view class="amount-row"><text>商品金额</text><text>¥{{ money(totalAmount) }}</text></view>
      <view class="amount-row discount" v-if="couponDiscountAmount > 0"><text>优惠券抵扣</text><text>-¥{{ money(couponDiscountAmount) }}</text></view>
      <view class="amount-row discount" v-if="pointsQuote.pointsUsed > 0"><text>积分抵扣</text><text>{{ pointsQuote.pointsUsed }} 分 -¥{{ money(pointsQuote.pointsDiscountAmount) }}</text></view>
      <view class="amount">应付 ¥{{ money(payableAmount) }}</view>
    </view>

    <view class="card">
      <view class="row">
        <text class="section-title">优惠券</text>
        <text class="link" @click.stop="goCoupons">领券/我的券包 ›</text>
      </view>
      <view v-if="isCrossMerchantCheckout" class="cross-tip">跨店结算会自动拆分子订单，当前版本暂不使用整单优惠券。后续会升级为“按店铺用券”。</view>
      <view v-else-if="coupons.length" class="coupon-list">
        <view v-for="coupon in coupons" :key="coupon.id" class="coupon-chip" :class="{ active: couponCode === coupon.code }" @click="selectCoupon(coupon)">
          <view class="coupon-head">
            <text>{{ coupon.name }}</text>
            <text class="coupon-code">{{ coupon.code }}</text>
          </view>
          <text class="coupon-main">满 ¥{{ money(coupon.minAmount) }} 减 ¥{{ money(coupon.discountAmount) }}</text>
          <text class="coupon-meta">{{ couponMeta(coupon) }}</text>
          <text class="coupon-meta">{{ coupon.claimed ? "已领取" : "可直接使用，也可先领取" }}</text>
        </view>
      </view>
      <view v-if="!isCrossMerchantCheckout" class="coupon-input">
        <input v-model="couponCode" placeholder="输入优惠券码" />
        <button size="mini" @click="applyCoupon">使用</button>
        <button v-if="appliedCoupon" size="mini" plain @click="clearCoupon">不用券</button>
      </view>
      <text v-if="!isCrossMerchantCheckout && appliedCoupon" class="coupon-tip">已使用：{{ appliedCoupon.name }}，优惠 ¥{{ money(discountAmount) }}</text>
      <text v-else-if="!isCrossMerchantCheckout" class="empty-tip">有券码可直接输入；符合门槛的可用券会自动展示。</text>
    </view>

    <view class="card">
      <view class="row">
        <text class="section-title">积分抵扣</text>
        <text class="link">100 积分抵 1 元</text>
      </view>
      <text v-if="isCrossMerchantCheckout" class="cross-tip">跨店结算暂不使用整单积分抵扣，避免拆单后对账不清。</text>
      <text v-else class="empty-tip">可用积分：{{ pointsQuote.availablePoints || 0 }}，最多可抵 ¥{{ money(maxPointsDiscount) }}</text>
      <view v-if="!isCrossMerchantCheckout" class="coupon-input">
        <input v-model.number="pointsToUse" type="number" placeholder="输入要使用的积分" />
        <button size="mini" @click="refreshQuote">抵扣</button>
        <button v-if="pointsToUse" size="mini" plain @click="clearPoints">不用积分</button>
      </view>
    </view>

    <view class="card">
      <text class="section-title">推广码</text>
      <view class="coupon-input">
        <input v-model="promotionCode" placeholder="有推广码可填写，便于商家统计推广佣金" />
        <button v-if="promotionCode" size="mini" plain @click="promotionCode = ''">清空</button>
      </view>
      <text class="empty-tip">不填写也可以正常下单；填写后后台会记录推广来源。</text>
    </view>

    <view class="card">
      <text class="section-title">支付方式</text>
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
      <text v-if="!availablePaymentMethods.length" class="empty-tip">当前商家暂未开放商城支付方式，请联系后台配置。</text>
      <textarea v-model="buyerRemark" placeholder="买家备注，可选" />
    </view>
    <view class="submit" :class="{ disabled: !canSubmitOrder }" @click="submit">{{ submitting ? "提交中..." : "提交订单" }}</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import { handleMallWechatPayResult, preferredMallWechatPaymentScene } from "../../mall-payment";

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
const coupons = ref<any[]>([]);
const appliedCoupon = ref<any>(null);
const pointsToUse = ref(0);
const pointsQuote = ref<any>({ availablePoints: 0, pointsUsed: 0, pointsDiscountAmount: "0.00" });
const quote = ref<any>(null);
const paymentMethods = ref<any[]>([]);
const submitting = ref(false);
const clientOrderKey = ref("");
const availablePaymentMethods = computed(() => paymentMethods.value.filter((item) => item.enabled));
const selectedAddress = computed(() => addresses.value.find((item) => item.id === selectedAddressId.value) || addresses.value.find((item) => item.isDefault) || addresses.value[0] || null);
const totalAmount = computed(() => checkoutItems.value.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0));
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
  return Array.from(groups.values());
});
const isCrossMerchantCheckout = computed(() => checkoutMerchantGroups.value.length > 1);
const currentCouponMerchantId = computed(() => !isCrossMerchantCheckout.value ? Number(checkoutMerchantGroups.value[0]?.merchantId || 0) : 0);
const couponDiscountAmount = computed(() => Number(quote.value?.couponDiscountAmount ?? (appliedCoupon.value ? Math.min(Number(appliedCoupon.value.discountAmount || 0), totalAmount.value) : 0)));
const discountAmount = computed(() => Number(quote.value?.discountAmount ?? couponDiscountAmount.value));
const payableAmount = computed(() => Number(quote.value?.payableAmount ?? Math.max(totalAmount.value - discountAmount.value, 0)));
const maxPointsDiscount = computed(() => Math.min(Number(pointsQuote.value.availablePoints || 0) / 100, Math.max(totalAmount.value - Number(quote.value?.couponDiscountAmount || 0), 0)));
const canSubmitOrder = computed(() => !submitting.value && checkoutItems.value.length > 0 && checkoutItems.value.every(canSubmitItem) && availablePaymentMethods.value.some((item) => item.value === paymentMethod.value));
function money(value: any) { return Number(value || 0).toFixed(2); }
function addressText(item: any) { return [item.province, item.city, item.district, item.detail].filter(Boolean).join(" "); }
function dateText(value: any) { return value ? String(value).slice(0, 10) : "长期有效"; }
function couponMeta(coupon: any) {
  const remain = coupon.remainingCount === null || coupon.remainingCount === undefined ? "不限量" : `剩 ${coupon.remainingCount} 张`;
  return `${remain} · ${dateText(coupon.endsAt)}前可用`;
}
function canSubmitItem(item: any) {
  if (item.availableStock === undefined || item.availableStock === null) return true;
  return Number(item.availableStock || 0) >= Number(item.quantity || 0);
}
async function loadAddresses() {
  addresses.value = await request<any[]>("/public/me/mall/addresses").catch(() => []);
  const stored = Number(uni.getStorageSync("mall_selected_address_id") || 0);
  if (stored && addresses.value.some((item) => item.id === stored)) selectedAddressId.value = stored;
  else selectedAddressId.value = addresses.value.find((item) => item.isDefault)?.id || addresses.value[0]?.id || 0;
}
async function loadItems() {
  if (cartItemIds.value.length) {
    const cart = await request<any[]>("/public/me/mall/cart");
    checkoutItems.value = cart.filter((item) => cartItemIds.value.includes(item.id)).map((item) => ({
      cartItemId: item.id,
      skuId: item.sku?.id,
      productTitle: item.product?.title,
      skuName: item.sku?.name,
      merchant: item.merchant || item.product?.merchant || item.sku?.merchant || null,
      price: Number(item.sku?.price || 0),
      quantity: Number(item.quantity || 0),
      availableStock: Number(item.availableStock || 0)
    }));
    return;
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
    checkoutItems.value = [];
    return;
  }
  const merchantId = targetProduct.merchant?.id || targetSku.merchant?.id || 0;
  const activityScope = merchantId ? `?merchantId=${merchantId}` : "";
  const flashSales = flashSaleId.value ? await request<any[]>(`/public/mall/flash-sales${activityScope}`).catch(() => []) : [];
  const groupBuys = groupBuyId.value ? await request<any[]>(`/public/mall/group-buys${activityScope}`).catch(() => []) : [];
  const flashSale = flashSales.find((item) => item.id === flashSaleId.value && (item.sku?.id || item.skuId) === skuId.value);
  const groupBuy = groupBuys.find((item) => item.id === groupBuyId.value && (item.sku?.id || item.skuId) === skuId.value);
  const promo = flashSale || groupBuy;
  checkoutItems.value = [{ skuId: targetSku.id, flashSaleId: flashSale?.id || undefined, groupBuyId: groupBuy?.id || undefined, joinTeamNo: groupBuy ? joinTeamNo.value || undefined : undefined, productTitle: targetProduct.title, skuName: promo ? `${targetSku.name} · ${promo.title}` : targetSku.name, merchant: targetProduct.merchant || targetSku.merchant || null, price: Number(flashSale?.salePrice || groupBuy?.groupPrice || targetSku.price || 0), quantity: quantity.value }];
  checkoutItems.value[0].availableStock = promo
    ? Number(promo.availableStock || 0)
    : targetSku.availableStock !== undefined && targetSku.availableStock !== null
      ? Math.max(Number(targetSku.availableStock || 0), 0)
      : Math.max(Number(targetSku.stock || 0) - Number(targetSku.lockedStock || 0), 0);
}
async function loadPaymentMethodsForCheckout() {
  const groups = checkoutMerchantGroups.value;
  const merchantIds = Array.from(new Set(groups.map((group) => Number(String(group.key).replace("merchant_", ""))).filter(Boolean)));
  if (merchantIds.length <= 1) {
    const query = merchantIds[0] ? `?merchantId=${merchantIds[0]}` : "";
    const methods = await request<any[]>(`/public/mall/payment-methods${query}`).catch(() => []);
    return methods.map(applyCrossMerchantPaymentGuard);
  }
  const methodLists = await Promise.all(merchantIds.map((merchantId) => request<any[]>(`/public/mall/payment-methods?merchantId=${merchantId}`).catch(() => [])));
  const first = methodLists[0] || [];
  return first.map((method) => {
    const rows = methodLists.map((list) => list.find((item) => item.value === method.value)).filter(Boolean);
    const disabled = rows.find((item) => !item.enabled);
    return {
      ...method,
      enabled: rows.length === methodLists.length && rows.every((item) => item.enabled),
      desc: method.value === "wechat" ? "跨店结算会按店铺拆单支付" : method.desc,
      disabledReason: disabled ? `跨店商品中有店铺暂不可用：${disabled.disabledReason || disabled.status || method.name}` : method.disabledReason
    };
  }).map(applyCrossMerchantPaymentGuard);
}
function applyCrossMerchantPaymentGuard(method: any) {
  if (isCrossMerchantCheckout.value && method.value === "balance") {
    return {
      ...method,
      enabled: false,
      desc: "跨店结算暂不支持余额支付",
      disabledReason: "跨店结算暂不支持余额支付，请选择线下收款/微信支付，或分店铺分别下单，避免余额分单扣款不一致。"
    };
  }
  return method;
}
async function loadCoupons() {
  if (totalAmount.value <= 0 || isCrossMerchantCheckout.value) {
    coupons.value = [];
    appliedCoupon.value = null;
    couponCode.value = "";
    return;
  }
  const merchantQuery = currentCouponMerchantId.value ? `&merchantId=${currentCouponMerchantId.value}` : "";
  coupons.value = await request<any[]>(`/public/me/mall/coupons?amount=${totalAmount.value}${merchantQuery}`).catch(() => []);
  if (appliedCoupon.value && !coupons.value.some((item) => item.code === appliedCoupon.value.code)) clearCoupon();
}
async function refreshQuote() {
  if (!checkoutItems.value.length) return;
  try {
    const result = await request<any>("/public/mall/quote", {
      method: "POST",
      data: {
        cartItemIds: cartItemIds.value.length ? cartItemIds.value : undefined,
        items: cartItemIds.value.length ? undefined : checkoutItems.value.map((item) => ({ skuId: item.skuId, quantity: item.quantity, flashSaleId: item.flashSaleId, groupBuyId: item.groupBuyId, joinTeamNo: item.joinTeamNo })),
        couponCode: !isCrossMerchantCheckout.value && appliedCoupon.value ? couponCode.value : undefined,
        pointsToUse: isCrossMerchantCheckout.value ? undefined : pointsToUse.value || undefined
      }
    });
    quote.value = result;
    pointsQuote.value = { availablePoints: result.availablePoints || 0, pointsUsed: result.pointsUsed || 0, pointsDiscountAmount: result.pointsDiscountAmount || "0.00" };
    if (result.coupon) appliedCoupon.value = result.coupon;
  } catch (error: any) {
    uni.showToast({ title: error.message || "报价失败", icon: "none" });
  }
}
async function load() {
  try {
    await ensureUser();
    await Promise.all([loadAddresses(), loadItems()]);
    paymentMethods.value = await loadPaymentMethodsForCheckout();
    if (!availablePaymentMethods.value.some((item) => item.value === paymentMethod.value)) paymentMethod.value = availablePaymentMethods.value[0]?.value || "offline";
    await loadCoupons();
    await refreshQuote();
  } catch (error: any) {
    uni.showToast({ title: error.message || "加载结算失败", icon: "none" });
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
  if (isCrossMerchantCheckout.value) return uni.showToast({ title: "跨店结算暂不使用整单优惠券", icon: "none" });
  if (!couponCode.value.trim()) return uni.showToast({ title: "请输入优惠券码", icon: "none" });
  try {
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
      content: `本次包含 ${checkoutMerchantGroups.value.length} 个店铺，提交后将按店铺生成子订单，支付、发货和售后分别处理。`,
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
async function submit() {
  if (submitting.value) return;
  if (!selectedAddress.value) return uni.showToast({ title: "请选择收货地址", icon: "none" });
  if (!checkoutItems.value.length) return uni.showToast({ title: "请选择商品", icon: "none" });
  if (!checkoutItems.value.every(canSubmitItem)) return uni.showToast({ title: "存在库存不足商品，请返回购物车调整", icon: "none" });
  if (!availablePaymentMethods.value.some((item) => item.value === paymentMethod.value)) return uni.showToast({ title: "请选择可用支付方式", icon: "none" });
  if (isCrossMerchantCheckout.value && !(await confirmCrossMerchantCheckout())) return;
  submitting.value = true;
  try {
    const result = await request<any>("/public/mall/checkout-groups", {
      method: "POST",
      data: {
        cartItemIds: cartItemIds.value.length ? cartItemIds.value : undefined,
        items: cartItemIds.value.length ? undefined : checkoutItems.value.map((item) => ({ skuId: item.skuId, quantity: item.quantity, flashSaleId: item.flashSaleId, groupBuyId: item.groupBuyId, joinTeamNo: item.joinTeamNo })),
        addressId: selectedAddress.value.id,
        paymentMethod: paymentMethod.value,
        couponCode: !isCrossMerchantCheckout.value && appliedCoupon.value ? couponCode.value : undefined,
        pointsToUse: isCrossMerchantCheckout.value ? undefined : pointsToUse.value || undefined,
        promotionCode: promotionCode.value.trim() || undefined,
        buyerRemark: buyerRemark.value,
        clientOrderKey: clientOrderKey.value
      }
    });
    const orders = Array.isArray(result.orders) ? result.orders : [result];
    const firstOrder = orders[0] || {};
    if (paymentMethod.value === "wechat" && orders.length === 1 && firstOrder.id) {
      const pay = await request<any>(`/public/mall/orders/${firstOrder.id}/pay/wechat`, {
        method: "POST",
        data: { paymentScene: preferredMallWechatPaymentScene() }
      });
      const redirected = await handleMallWechatPayResult(pay);
      if (redirected) return;
    } else if (paymentMethod.value === "wechat" && orders.length > 1) {
      uni.showToast({ title: "已按店铺拆单，请到我的订单逐店支付", icon: "none" });
    } else {
      uni.showToast({ title: paymentMethod.value === "balance" ? "支付成功" : "订单已提交", icon: "none" });
    }
    const groupNo = result.groupNo || firstOrder.checkoutGroup?.groupNo || "";
    const multiOrderUrl = groupNo ? `/pages/user/mall-orders?checkoutGroupNo=${encodeURIComponent(groupNo)}` : "/pages/user/mall-orders";
    uni.redirectTo({ url: withTenantCode(orders.length > 1 ? multiOrderUrl : firstOrder.id ? `/pages/user/mall-order-detail?id=${firstOrder.id}` : "/pages/user/mall-orders") });
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
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
.checkout-page { min-height:100vh; padding:24rpx; background:#f8fafc; }
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
.pay-row view { flex:1; display:grid; gap:4rpx; }
.pay-name { color:#1f2937; font-size:28rpx; font-weight:900; }
.pay-desc { color:#94a3b8; font-size:23rpx; line-height:1.4; }
.pay-route { display:inline-block; justify-self:start; padding:4rpx 10rpx; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:21rpx; font-weight:900; }
.item-name { display:block; max-width:460rpx; font-weight:800; color:#1f2937; }
.item-sku { display:block; margin-top:6rpx; color:#94a3b8; font-size:24rpx; }
.item-sku.danger { color:#dc2626; font-weight:800; }
.amount-col { display:grid; justify-items:end; gap:8rpx; color:#64748b; }
.amount-row { display:flex; justify-content:space-between; align-items:center; margin-top:14rpx; color:#64748b; font-size:26rpx; }
.amount-row.discount { color:#16a34a; font-weight:800; }
.amount { margin-top:16rpx; color:#c2410c; font-size:38rpx; font-weight:900; text-align:right; }
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
.cross-tip { display:block; padding:18rpx; border-radius:18rpx; background:#fff7ed; color:#9a3412; font-size:25rpx; line-height:1.5; font-weight:800; }
textarea { width:100%; min-height:120rpx; margin-top:18rpx; padding:18rpx; box-sizing:border-box; border-radius:18rpx; background:#f8fafc; font-size:26rpx; }
.submit { height:90rpx; border-radius:999px; background:linear-gradient(135deg,#9a3412,#ea580c); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:30rpx; margin-top:30rpx; }
.submit.disabled { opacity:.48; background:#cbd5e1; }
</style>
