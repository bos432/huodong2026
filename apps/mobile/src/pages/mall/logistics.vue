<template>
  <view class="logistics-page">
    <view v-if="loading" class="state-card" role="status" aria-live="polite">物流信息加载中...</view>
    <view v-else-if="loadError" class="state-card error-state" role="alert" aria-live="assertive"><text>{{ loadError }}</text><view class="state-retry" role="button" tabindex="0" aria-label="重新加载物流信息" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重新加载</view></view>
    <template v-else>
    <view class="hero">
      <text class="eyebrow">物流信息</text>
      <text class="title">{{ logistics.shipments?.length ? `${logistics.shipments.length} 个包裹` : order.expressCompany || "待发货" }}</text>
      <text class="subtitle">已发 {{ logistics.shippedQuantity || 0 }} / {{ logistics.totalQuantity || 0 }} 件</text>
    </view>

    <view v-if="logistics.shipments?.length" class="card">
      <text class="section-title">包裹明细</text>
      <view v-for="shipment in logistics.shipments" :key="shipment.id" class="package-row">
        <view class="package-head"><text class="line">{{ shipment.expressCompany || "快递" }}</text><text class="package-status">{{ shipment.status === "delivered" ? "已签收" : "运输中" }}</text></view>
        <text class="muted">单号：{{ shipment.expressNo }}</text>
        <text class="muted">{{ shipmentItemText(shipment) }}</text>
        <view v-if="shipment.trackingEvents?.length" class="tracking-list">
          <view v-for="event in shipment.trackingEvents" :key="event.id" class="tracking-row"><text class="muted">{{ dateText(event.eventAt) }} {{ event.description }}<text v-if="event.location"> · {{ event.location }}</text></text></view>
        </view>
        <button class="ghost package-copy" @click="copyNo(shipment.expressNo)">复制单号</button>
      </view>
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

    <view v-if="logistics.events?.length" class="card">
      <text class="section-title">订单履约记录</text>
      <view v-for="event in logistics.events" :key="event.id" class="event-row">
        <text class="line">{{ eventText(event.eventType) }}</text>
        <text class="muted">{{ dateText(event.occurredAt) }} · {{ event.remark || `${event.fromStatus || "-"} → ${event.toStatus}` }}</text>
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
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";

const orderId = ref(0);
const order = ref<any>({});
const logistics = ref<any>({});
const loading = ref(false);
const loadError = ref("");
const loadedContextKey = ref("");
const loadGuard = createTenantLoadGuard();
const address = computed(() => order.value.addressSnapshot || {});
const trackingUrl = computed(() => /^https?:\/\//i.test(String(logistics.value?.trackingUrl || "")) ? String(logistics.value.trackingUrl) : "");
const steps = computed(() => {
  const rows = Array.isArray(logistics.value?.timeline) ? logistics.value.timeline : [];
  return rows.map((item: any) => ({ ...item, time: dateText(item.time) }));
});

function dateText(value: string) { return value ? String(value).slice(0, 16).replace("T", " ") : ""; }
function eventText(value: string) { const labels: Record<string, string> = { order_created: "订单创建", payment_confirmed: "收款确认", order_partially_shipped: "部分发货", order_shipped: "全部发货", shipment_tracking_updated: "物流单号修改", shipment_delivered: "包裹签收", shipment_auto_delivered: "包裹自动签收", order_completed: "订单完成", order_auto_completed: "订单自动完成", order_closed: "订单关闭" }; return labels[value] || value; }
async function load() {
  const requestedOrderId = orderId.value;
  const token = loadGuard.begin();
  const contextKey = `${token.tenantCode}:${requestedOrderId}`;
  if (!requestedOrderId) {
    logistics.value = {};
    order.value = {};
    loading.value = false;
    loadError.value = "物流订单参数无效，请从订单详情重新进入。";
    return;
  }
  if (loadedContextKey.value && loadedContextKey.value !== contextKey) {
    logistics.value = {};
    order.value = {};
  }
  loading.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    const detail = await request<any>(`/public/me/mall/orders/${requestedOrderId}/logistics`);
    if (!detail?.orderId) throw new Error("物流订单不存在或无权查看");
    if (!loadGuard.isCurrent(token) || orderId.value !== requestedOrderId) return;
    logistics.value = detail;
    order.value = detail;
    loadedContextKey.value = contextKey;
  } catch (error: any) {
    if (loadGuard.isCurrent(token) && orderId.value === requestedOrderId && !String(error?.message || "").includes("请先完成")) loadError.value = error?.message || "物流信息加载失败，请稍后重试。";
  } finally {
    if (loadGuard.isCurrent(token) && orderId.value === requestedOrderId) loading.value = false;
  }
}
function shipmentItemText(shipment: any) { return (shipment?.items || []).map((item: any) => `${item.itemSnapshot?.productTitle || "商品"} × ${item.quantity}`).join("；"); }
function copyNo(expressNo?: string) {
  const contextKey = `${getCurrentTenantCode()}:${orderId.value}`;
  const value = expressNo || order.value.expressNo || "";
  if (!value) return uni.showToast({ title: "暂无可复制的物流单号", icon: "none" });
  uni.setClipboardData({ data: value, success: () => {
    if (`${getCurrentTenantCode()}:${orderId.value}` === contextKey) uni.showToast({ title: "单号已复制", icon: "none" });
  } });
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
onShow(load);
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
.package-row { padding:18rpx 0; border-top:1rpx solid #e2e8f0; }
.package-row:first-of-type { border-top:0; }
.package-head { display:flex; justify-content:space-between; gap:16rpx; }
.package-status { color:#0f766e; font-size:24rpx; font-weight:900; }
.package-copy { margin-top:12rpx; }
.tracking-list { margin-top:12rpx; padding-left:16rpx; border-left:4rpx solid #99f6e4; display:grid; gap:8rpx; }
.event-row { padding:16rpx 0; border-top:1rpx solid #e2e8f0; }
.event-row:first-of-type { border-top:0; }
button { margin:0; border-radius:999px; background:#0f766e; color:#fff; font-size:26rpx; font-weight:900; }
button.ghost { background:#f1f5f9; color:#475569; }
.notice { display:block; margin-top:18rpx; padding:16rpx; border-radius:18rpx; background:#ecfeff; color:#0f766e; font-size:24rpx; line-height:1.5; }
.state-card { display:grid; gap:10rpx; padding:22rpx 24rpx; border-radius:8px; background:#fff; color:#667085; font-size:25rpx; line-height:1.55; }
.state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-retry { width:max-content; color:#0f766e; font-weight:900; }
</style>
