<template>
  <view class="list-page">
    <view class="hero">
      <text class="eyebrow">我的商城收藏</text>
      <text class="title">把想回头购买的慢π好物先收起来</text>
      <text class="sub">{{ items.length ? `${items.length} 件已收藏` : "暂无收藏商品" }}</text>
    </view>
    <view v-for="row in items" :key="row.id" class="product-row" @click="goDetail(row.product)">
      <image v-if="row.product?.coverUrl" class="cover" :src="row.product.coverUrl" mode="aspectFill" />
      <view v-else class="cover placeholder">好物</view>
      <view class="info">
        <text class="name">{{ row.product?.title }}</text>
        <text class="muted">{{ row.product?.brandName || "慢π严选" }} · {{ dateText(row.createdAt) }}</text>
        <text class="price">¥{{ money(row.product?.price) }}</text>
      </view>
      <text class="arrow">›</text>
    </view>
    <EmptyState v-if="!items.length && !loading" icon="♡" text="暂无商城收藏，去商品详情点收藏吧" />
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import EmptyState from "../../components/EmptyState.vue";

const items = ref<any[]>([]);
const loading = ref(false);
function money(value: any) { return Number(value || 0).toFixed(2); }
function dateText(value: string) { return value ? String(value).slice(0, 10) : ""; }
function goDetail(product: any) {
  if (!product?.id) return;
  uni.navigateTo({ url: withTenantCode(`/pages/mall/detail?id=${product.id}`) });
}
async function load() {
  loading.value = true;
  try {
    await ensureUser();
    items.value = await request<any[]>("/public/me/mall/favorites");
  } catch (error: any) {
    items.value = [];
    uni.showToast({ title: error.message || "加载收藏失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}
onShow(load);
</script>

<style scoped>
.list-page { min-height:100vh; padding:24rpx; background:#f8fafc; }
.hero { padding:32rpx; border-radius:30rpx; color:#fff; background:linear-gradient(135deg,#9a3412,#ea580c); display:grid; gap:8rpx; margin-bottom:20rpx; }
.eyebrow { font-size:24rpx; opacity:.86; }
.title { font-size:36rpx; font-weight:900; line-height:1.3; }
.sub { font-size:25rpx; opacity:.88; }
.product-row { display:flex; gap:18rpx; align-items:center; padding:20rpx; margin-bottom:16rpx; border-radius:24rpx; background:#fff; box-shadow:0 12rpx 28rpx rgba(15,23,42,.06); }
.cover { width:128rpx; height:128rpx; border-radius:20rpx; background:#fed7aa; display:grid; place-items:center; color:#9a3412; font-weight:900; }
.info { flex:1; min-width:0; display:grid; gap:8rpx; }
.name { color:#1f2937; font-size:28rpx; font-weight:900; line-height:1.35; }
.muted { color:#94a3b8; font-size:23rpx; }
.price { color:#c2410c; font-size:30rpx; font-weight:900; }
.arrow { color:#cbd5e1; font-size:42rpx; }
</style>
