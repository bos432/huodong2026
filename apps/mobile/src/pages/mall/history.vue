<template>
  <view class="list-page">
    <view class="hero history">
      <text class="eyebrow">商城浏览足迹</text>
      <text class="title">最近看过的商品都在这里</text>
      <text class="sub">{{ items.length ? `${items.length} 条足迹` : "暂无浏览记录" }}</text>
      <text v-if="items.length" class="clear" :class="{ disabled: clearing }" @click="clearAll">{{ clearing ? "清空中" : "清空足迹" }}</text>
    </view>
    <view v-if="loading" class="state-card">商城足迹加载中...</view>
    <view v-else-if="loadError" class="state-card error-state"><text>{{ loadError }}</text><view class="state-retry" @click="load">重新加载</view></view>
    <view v-for="row in items" :key="row.id" class="product-row" @click="goDetail(row.product)">
      <image v-if="row.product?.coverUrl" class="cover" :src="row.product.coverUrl" mode="aspectFill" />
      <view v-else class="cover placeholder">足迹</view>
      <view class="info">
        <text class="name">{{ row.product?.title }}</text>
        <text class="muted">浏览 {{ row.viewCount || 1 }} 次 · {{ dateText(row.lastViewedAt) }}</text>
        <text class="price">¥{{ money(row.product?.price) }}</text>
      </view>
      <text class="remove" :class="{ disabled: removingId === row.id }" @click.stop="remove(row)">{{ removingId === row.id ? "删除中" : "删除" }}</text>
      <text class="arrow">›</text>
    </view>
    <EmptyState v-if="!items.length && !loading && !loadError" icon="👣" text="暂无商城足迹，去商城逛逛吧" />
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request, withTenantCode } from "../../api";
import EmptyState from "../../components/EmptyState.vue";
import { createTenantLoadGuard } from "../../tenant-load-guard";

const items = ref<any[]>([]);
const loading = ref(false);
const loadError = ref("");
const removingId = ref(0);
const clearing = ref(false);
const confirmingClear = ref(false);
const loadGuard = createTenantLoadGuard();
function money(value: any) { return Number(value || 0).toFixed(2); }
function dateText(value: string) { return value ? String(value).slice(0, 16).replace("T", " ") : ""; }
function goDetail(product: any) {
  if (!product?.id) return;
  uni.navigateTo({ url: withTenantCode(`/pages/mall/detail?id=${product.id}`) });
}
async function load() {
  const token = loadGuard.begin();
  loading.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    const rows = await request<any[]>("/public/me/mall/browse-histories");
    if (loadGuard.isCurrent(token)) items.value = rows;
  } catch (error: any) {
    if (loadGuard.isCurrent(token) && !String(error?.message || "").includes("请先完成")) loadError.value = error?.message || "商城足迹加载失败，请稍后重试。";
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}
async function remove(row: any) {
  if (!row?.id || removingId.value || clearing.value) return;
  const tenantCode = getCurrentTenantCode();
  removingId.value = row.id;
  try {
    await request(`/public/me/mall/browse-histories/${row.id}`, { method: "DELETE" });
    if (getCurrentTenantCode() === tenantCode) items.value = items.value.filter((item) => item.id !== row.id);
  } catch (error: any) {
    if (getCurrentTenantCode() === tenantCode) uni.showToast({ title: error?.message || "删除足迹失败", icon: "none" });
  } finally {
    if (getCurrentTenantCode() === tenantCode) removingId.value = 0;
  }
}
async function clearAll() {
  if (clearing.value || removingId.value || confirmingClear.value) return;
  confirmingClear.value = true;
  uni.showModal({
    title: "清空浏览足迹",
    content: "确认删除当前商家下的全部商城浏览记录？",
    confirmText: "确认清空",
    success: async (result) => {
      confirmingClear.value = false;
      if (!result.confirm) return;
      const tenantCode = getCurrentTenantCode();
      clearing.value = true;
      try {
        await request("/public/me/mall/browse-histories", { method: "DELETE" });
        if (getCurrentTenantCode() !== tenantCode) return;
        items.value = [];
        uni.showToast({ title: "浏览足迹已清空", icon: "none" });
      } catch (error: any) {
        if (getCurrentTenantCode() === tenantCode) uni.showToast({ title: error?.message || "清空足迹失败", icon: "none" });
      } finally {
        if (getCurrentTenantCode() === tenantCode) clearing.value = false;
      }
    },
    fail: () => { confirmingClear.value = false; }
  });
}
onShow(load);
</script>

<style scoped>
.list-page { min-height:100vh; padding:24rpx; background:#f8fafc; }
.hero { padding:32rpx; border-radius:30rpx; color:#fff; background:linear-gradient(135deg,#0f766e,#14b8a6); display:grid; gap:8rpx; margin-bottom:20rpx; }
.eyebrow { font-size:24rpx; opacity:.86; }
.title { font-size:36rpx; font-weight:900; line-height:1.3; }
.sub { font-size:25rpx; opacity:.88; }
.clear { justify-self:start; margin-top:8rpx; padding:8rpx 16rpx; border:1rpx solid rgba(255,255,255,.45); border-radius:999rpx; font-size:23rpx; font-weight:800; }
.product-row { display:flex; gap:18rpx; align-items:center; padding:20rpx; margin-bottom:16rpx; border-radius:24rpx; background:#fff; box-shadow:0 12rpx 28rpx rgba(15,23,42,.06); }
.cover { width:128rpx; height:128rpx; border-radius:20rpx; background:#ccfbf1; display:grid; place-items:center; color:#0f766e; font-weight:900; }
.info { flex:1; min-width:0; display:grid; gap:8rpx; }
.name { color:#1f2937; font-size:28rpx; font-weight:900; line-height:1.35; }
.muted { color:#94a3b8; font-size:23rpx; }
.price { color:#0f766e; font-size:30rpx; font-weight:900; }
.arrow { color:#cbd5e1; font-size:42rpx; }
.remove { color:#0f766e; font-size:23rpx; font-weight:800; }
.disabled { opacity:.55; pointer-events:none; }
.state-card { display:grid; gap:10rpx; margin-bottom:18rpx; padding:20rpx 22rpx; border-radius:8px; background:#fff; color:#667085; font-size:24rpx; line-height:1.55; }
.state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-retry { width:max-content; color:#0f766e; font-weight:900; }
</style>
