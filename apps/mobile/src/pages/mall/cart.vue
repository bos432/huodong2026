<template>
  <view class="cart-page">
    <view class="hero">
      <text class="eyebrow">慢π严选购物车</text>
      <text class="title">把想要的好物先放进来，确认地址后一起结算</text>
    </view>
    <view v-if="cartGroups.length > 1" class="cross-store-tip">
      跨店购物车将按 {{ cartGroups.length }} 个店铺拆成子订单，支付、发货、售后都会分别处理。
    </view>
    <view v-for="group in cartGroups" :key="group.key" class="store-cart-group">
      <view class="store-head">
        <view>
          <text class="store-name">{{ group.name }}</text>
          <text class="store-meta">{{ group.ownerText }} · {{ group.items.length }} 件商品</text>
        </view>
        <text class="store-amount">¥{{ money(group.amount) }}</text>
      </view>
      <view v-for="item in group.items" :key="item.id" class="cart-card">
        <image v-if="item.product?.coverUrl" class="cover" :src="item.product.coverUrl" mode="aspectFill" />
        <view v-else class="cover placeholder">好物</view>
        <view class="info">
          <text class="name">{{ item.product?.title }}</text>
          <text class="sku" :class="{ danger: !canCheckoutItem(item) }">{{ item.sku?.name }} · {{ cartItemStatusText(item) }}</text>
          <view class="row">
            <text class="price">¥{{ money(item.sku?.price) }}</text>
            <view class="qty">
              <text @click.stop="changeQty(item, -1)">-</text>
              <text>{{ item.quantity }}</text>
              <text @click.stop="changeQty(item, 1)">+</text>
            </view>
          </view>
        </view>
        <text class="delete" @click="remove(item)">删除</text>
      </view>
    </view>
    <EmptyState v-if="!cartItems.length && !loading" icon="🛒" text="购物车还是空的，去商城挑一件好物吧" />
    <view class="bottom-bar">
      <view>
        <text class="total-label">合计</text>
        <text class="total">¥{{ money(totalAmount) }}</text>
      </view>
      <view class="checkout" :class="{ disabled: !canCheckout }" @click="checkout">{{ checkingOut ? "处理中..." : "去结算" }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import EmptyState from "../../components/EmptyState.vue";

const cartItems = ref<any[]>([]);
const loading = ref(false);
const checkingOut = ref(false);
const totalAmount = computed(() => cartItems.value.reduce((sum, item) => sum + Number(item.sku?.price || 0) * Number(item.quantity || 0), 0));
const cartGroups = computed(() => {
  const groups = new Map<string, { key: string; name: string; ownerText: string; amount: number; items: any[] }>();
  for (const item of cartItems.value) {
    const merchant = item.merchant || item.product?.merchant || item.sku?.merchant || null;
    const key = merchant?.id ? `merchant_${merchant.id}` : "merchant_default";
    const group = groups.get(key) || {
      key,
      name: merchant?.name || "默认店铺",
      ownerText: merchant?.ownerType === "agent" ? "代理店铺" : "商家店铺",
      amount: 0,
      items: []
    };
    group.amount += Number(item.sku?.price || 0) * Number(item.quantity || 0);
    group.items.push(item);
    groups.set(key, group);
  }
  return Array.from(groups.values());
});
const canCheckout = computed(() => !checkingOut.value && cartItems.value.length > 0 && cartItems.value.every(canCheckoutItem));
function money(value: any) { return Number(value || 0).toFixed(2); }
function canCheckoutItem(item: any) { return item.purchasable !== false && Number(item.availableStock || 0) >= Number(item.quantity || 0); }
function cartItemStatusText(item: any) {
  if (item.unavailableReason) return item.unavailableReason;
  return canCheckoutItem(item) ? `可购 ${item.availableStock}` : "库存不足或已售罄";
}
async function load() {
  loading.value = true;
  try {
    await ensureUser();
    cartItems.value = await request<any[]>("/public/me/mall/cart");
  } catch (error: any) {
    cartItems.value = [];
    if (!String(error?.message || "").includes("请先完成")) uni.showToast({ title: error.message || "加载购物车失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}
async function changeQty(item: any, delta: number) {
  const quantity = Math.max(0, Number(item.quantity || 0) + delta);
  try {
    await request(`/public/me/mall/cart/${item.id}`, { method: "PATCH", data: { quantity } });
    load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "调整失败", icon: "none" });
  }
}
async function remove(item: any) {
  await request(`/public/me/mall/cart/${item.id}`, { method: "DELETE" });
  load();
}
function checkout() {
  if (checkingOut.value) return;
  if (!cartItems.value.length) return;
  if (!canCheckout.value) {
    const invalid = cartItems.value.find((item) => !canCheckoutItem(item));
    return uni.showToast({ title: invalid?.unavailableReason || "购物车有不可购买商品，请调整后结算", icon: "none" });
  }
  checkingOut.value = true;
  const ids = cartItems.value.map((item) => item.id).join(",");
  uni.navigateTo({ url: withTenantCode(`/pages/mall/checkout?cartItemIds=${ids}`) });
  setTimeout(() => { checkingOut.value = false; }, 800);
}
onShow(load);
</script>

<style scoped>
.cart-page { min-height:100vh; padding:24rpx 24rpx 150rpx; background:linear-gradient(180deg,#fff7ed 0%,#f8fafc 42%,#fff 100%); }
.hero { padding:30rpx; border-radius:30rpx; background:linear-gradient(135deg,#7c2d12,#c2410c); color:#fff; margin-bottom:22rpx; display:grid; gap:10rpx; }
.eyebrow { font-size:24rpx; opacity:.84; }
.title { font-size:36rpx; font-weight:900; line-height:1.3; }
.cross-store-tip { margin-bottom:20rpx; padding:18rpx 22rpx; border-radius:22rpx; background:#fff7ed; color:#9a3412; border:1rpx solid #fed7aa; font-size:25rpx; line-height:1.5; font-weight:900; }
.cart-card { position:relative; display:flex; gap:18rpx; background:#fff; border-radius:26rpx; padding:18rpx; margin-bottom:18rpx; box-shadow:0 12rpx 30rpx rgba(124,45,18,.08); }
.store-cart-group { margin-bottom:22rpx; padding:18rpx; border-radius:30rpx; background:rgba(255,255,255,.7); border:1rpx solid rgba(154,52,18,.08); box-shadow:0 12rpx 28rpx rgba(124,45,18,.05); }
.store-head { display:flex; justify-content:space-between; align-items:center; gap:16rpx; margin-bottom:14rpx; }
.store-name { display:block; color:#1f2937; font-size:30rpx; font-weight:900; }
.store-meta { display:block; margin-top:4rpx; color:#94a3b8; font-size:23rpx; }
.store-amount { color:#c2410c; font-size:30rpx; font-weight:900; }
.cover { width:160rpx; height:160rpx; border-radius:20rpx; background:#fed7aa; display:grid; place-items:center; color:#9a3412; font-weight:900; }
.info { flex:1; min-width:0; display:grid; gap:8rpx; }
.name { font-size:28rpx; font-weight:900; color:#1f2937; line-height:1.35; }
.sku { font-size:23rpx; color:#64748b; }
.sku.danger { color:#dc2626; font-weight:800; }
.row { display:flex; justify-content:space-between; align-items:center; margin-top:8rpx; }
.price { color:#c2410c; font-size:32rpx; font-weight:900; }
.qty { display:flex; align-items:center; justify-content:space-around; width:160rpx; height:58rpx; border-radius:999px; background:#f1f5f9; font-size:28rpx; font-weight:900; }
.delete { position:absolute; right:18rpx; top:18rpx; color:#94a3b8; font-size:22rpx; }
.bottom-bar { position:fixed; left:0; right:0; bottom:0; padding:18rpx 28rpx 34rpx; background:#fff; display:flex; justify-content:space-between; align-items:center; box-shadow:0 -10rpx 30rpx rgba(15,23,42,.08); }
.total-label { color:#64748b; font-size:24rpx; margin-right:12rpx; }
.total { color:#c2410c; font-size:38rpx; font-weight:900; }
.checkout { width:260rpx; height:86rpx; border-radius:999px; background:linear-gradient(135deg,#9a3412,#ea580c); color:#fff; display:flex; align-items:center; justify-content:center; font-size:30rpx; font-weight:900; }
.checkout.disabled { opacity:.45; background:#cbd5e1; }
</style>
