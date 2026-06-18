<template>
  <view class="logistics-page">
    <view class="hero">
      <text class="eyebrow">物流信息</text>
      <text class="title">{{ order.expressCompany || "待发货" }}</text>
      <text class="subtitle">{{ order.expressNo || "商家发货后会显示快递单号" }}</text>
    </view>

    <view class="card">
      <text class="section-title">配送状态</text>
      <view class="timeline">
        <view v-for="step in steps" :key="step.label" class="step" :class="{ active: step.active }">
          <view class="dot"></view>
          <view>
            <text class="line">{{ step.label }}</text>
            <text class="muted">{{ step.time || step.tip }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="card">
      <text class="section-title">快递查询</text>
      <text class="line">{{ order.expressCompany || "暂无快递公司" }}</text>
      <text class="muted">单号：{{ order.expressNo || "-" }}</text>
      <text v-if="logistics.servicePhone" class="muted">客服电话：{{ logistics.servicePhone }}</text>
      <view class="actions">
        <button v-if="order.expressNo" class="ghost" @click="copyNo">复制单号</button>
        <button v-if="trackingUrl" @click="openTracking">打开查询页</button>
      </view>
      <text class="notice">{{ logistics.notice || "后台发货后可查看快递公司、单号和查询入口。" }}</text>
    </view>

    <view class="card">
      <text class="section-title">收货信息</text>
      <text class="line">{{ address.receiverName }} {{ address.receiverPhone }}</text>
      <text class="muted">{{ [address.province, address.city, address.district, address.detail].filter(Boolean).join(" ") }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, request } from "../../api";

const orderId = ref(0);
const order = ref<any>({});
const logistics = ref<any>({});
const address = computed(() => order.value.addressSnapshot || {});
const trackingUrl = computed(() => logistics.value?.trackingUrl || "");
const steps = computed(() => {
  const rows = Array.isArray(logistics.value?.timeline) ? logistics.value.timeline : [];
  return rows.map((item: any) => ({ ...item, time: dateText(item.time) }));
});

function dateText(value: string) { return value ? String(value).slice(0, 16).replace("T", " ") : ""; }
async function load() {
  if (!orderId.value) return;
  await ensureUser();
  const detail = await request<any>(`/public/me/mall/orders/${orderId.value}/logistics`);
  logistics.value = detail;
  order.value = detail;
}
function copyNo() {
  uni.setClipboardData({ data: order.value.expressNo || "", success: () => uni.showToast({ title: "单号已复制", icon: "none" }) });
}
function openTracking() {
  if (!trackingUrl.value) return;
  // #ifdef H5
  window.open(trackingUrl.value, "_blank");
  // #endif
  // #ifndef H5
  uni.setClipboardData({ data: trackingUrl.value, success: () => uni.showToast({ title: "查询网址已复制", icon: "none" }) });
  // #endif
}
onLoad((query) => { orderId.value = Number(query?.id || 0); });
onShow(() => load().catch((error: any) => uni.showToast({ title: error.message || "加载物流失败", icon: "none" })));
</script>

<style scoped>
.logistics-page { min-height:100vh; padding:24rpx; background:#f8fafc; }
.hero { border-radius:32rpx; padding:36rpx; margin-bottom:20rpx; color:#fff; background:linear-gradient(135deg,#0f766e,#14b8a6); display:grid; gap:10rpx; }
.eyebrow { font-size:24rpx; opacity:.86; }
.title { font-size:42rpx; font-weight:900; }
.subtitle { font-size:26rpx; opacity:.92; word-break:break-all; }
.card { background:#fff; border-radius:26rpx; padding:24rpx; margin-bottom:18rpx; box-shadow:0 12rpx 30rpx rgba(15,23,42,.06); }
.section-title { display:block; font-size:30rpx; font-weight:900; color:#1f2937; margin-bottom:16rpx; }
.timeline { display:grid; gap:18rpx; }
.step { display:flex; gap:16rpx; opacity:.48; }
.step.active { opacity:1; }
.dot { width:18rpx; height:18rpx; margin-top:12rpx; border-radius:999px; background:#cbd5e1; flex:0 0 auto; }
.step.active .dot { background:#0f766e; box-shadow:0 0 0 8rpx #ccfbf1; }
.line { display:block; color:#1f2937; font-size:28rpx; font-weight:800; line-height:1.5; }
.muted { display:block; color:#64748b; font-size:25rpx; line-height:1.5; word-break:break-all; }
.actions { display:flex; gap:14rpx; margin-top:20rpx; }
button { margin:0; border-radius:999px; background:#0f766e; color:#fff; font-size:26rpx; font-weight:900; }
button.ghost { background:#f1f5f9; color:#475569; }
.notice { display:block; margin-top:18rpx; padding:16rpx; border-radius:18rpx; background:#ecfeff; color:#0f766e; font-size:24rpx; line-height:1.5; }
</style>
