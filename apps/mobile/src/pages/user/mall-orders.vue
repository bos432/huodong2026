<template>
  <view class="orders-page">
    <scroll-view scroll-x class="tabs">
      <view class="tabs-inner">
        <view v-for="item in statusTabs" :key="item.value" class="tab" :class="{ active: currentStatus === item.value }" @click="switchStatus(item.value)">{{ item.label }}</view>
      </view>
    </scroll-view>
    <view v-for="order in orders" :key="order.id" class="card" @click="goDetail(order)">
      <view class="row">
        <text class="order-no">{{ order.orderNo }}</text>
        <text class="status">{{ statusText(order.status) }}</text>
      </view>
      <view class="status-tip">{{ statusTip(order) }}</view>
      <view v-if="order.expiresAt && ['pending_payment','pending_confirm'].includes(order.status)" class="deadline">请在 {{ dateText(order.expiresAt) }} 前处理，超时将自动关闭并释放库存</view>
      <view v-for="item in order.items || []" :key="item.id" class="item">{{ item.productTitle }} / {{ item.skuName }} × {{ item.quantity }}</view>
      <view class="row footer">
        <text>¥{{ money(order.amount) }} · {{ paymentText(order.paymentMethod) }} · {{ dateText(order.createdAt) }}</text>
        <view class="actions">
          <button v-if="order.status === 'pending_payment' && order.paymentMethod === 'balance'" size="mini" @click.stop="payBalance(order)">继续支付</button>
          <button v-if="['pending_payment','pending_confirm'].includes(order.status)" size="mini" class="ghost" @click.stop="cancelOrder(order)">取消订单</button>
          <button v-if="order.status === 'shipped'" size="mini" @click.stop="confirmReceived(order)">确认收货</button>
          <button v-if="['paid','shipped','completed'].includes(order.status)" size="mini" @click.stop="requestRefund(order)">申请售后</button>
        </view>
      </view>
      <view v-if="order.expressNo" class="logistics">物流：{{ order.expressCompany || '' }} {{ order.expressNo }}</view>
      <view v-if="order.refund" class="logistics">售后：{{ refundText(order.refund.status) }} {{ order.refund.reason || "" }}</view>
    </view>
    <EmptyState v-if="!orders.length" icon="🛍" text="暂无商城订单" />
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import EmptyState from "../../components/EmptyState.vue";

const orders = ref<any[]>([]);
const currentStatus = ref("all");
const statusTabs = [
  { label: "全部", value: "all" },
  { label: "待付款", value: "pending_payment" },
  { label: "待确认", value: "pending_confirm" },
  { label: "待发货", value: "paid" },
  { label: "待收货", value: "shipped" },
  { label: "售后中", value: "refund_pending" },
  { label: "已完成", value: "completed" }
];
function money(value: any) { return Number(value || 0).toFixed(2); }
function statusText(value: string) { return ({ pending_payment: "待付款", pending_confirm: "待确认收款", paid: "待发货", shipped: "待收货", completed: "已完成", refund_pending: "售后中", refunded: "已退款", closed: "已关闭" } as any)[value] || value; }
function paymentText(value: string) { return ({ balance: "余额支付", offline: "线下收款" } as any)[value] || value; }
function refundText(value: string) { return ({ pending: "待审核", approved: "已通过", rejected: "已拒绝" } as any)[value] || value; }
function dateText(value: string) { return value ? String(value).slice(0, 16).replace("T", " ") : ""; }
function statusTip(order: any) {
  if (order.status === "pending_payment") return "请尽快完成余额支付，未支付订单可取消并释放库存。";
  if (order.status === "pending_confirm") return "线下收款订单已提交，等待后台财务确认。";
  if (order.status === "paid") return "商家已确认收款，等待仓库/运营发货。";
  if (order.status === "shipped") return "商品已发出，收到后请确认收货。";
  if (order.status === "completed") return "订单已完成，如有问题仍可申请售后。";
  if (order.status === "refund_pending") return "售后申请已提交，等待后台审核。";
  if (order.status === "refunded") return "售后已完成，款项已按支付方式处理。";
  if (order.status === "closed") return order.closeReason ? `订单已关闭：${order.closeReason}` : "订单已关闭。";
  return "点击查看订单详情。";
}
function goDetail(order: any) { uni.navigateTo({ url: withTenantCode(`/pages/user/mall-order-detail?id=${order.id}`) }); }
function switchStatus(value: string) {
  if (currentStatus.value === value) return;
  currentStatus.value = value;
  load();
}
async function load() {
  try {
    await ensureUser();
    const query = currentStatus.value === "all" ? "" : `?status=${currentStatus.value}`;
    orders.value = await request<any[]>(`/public/me/mall/orders${query}`);
  } catch (error: any) {
    orders.value = [];
    uni.showToast({ title: error.message || "加载订单失败", icon: "none" });
  }
}
async function confirmReceived(order: any) {
  try {
    await request(`/public/me/mall/orders/${order.id}/confirm-received`, { method: "POST" });
    uni.showToast({ title: "已确认收货", icon: "none" });
    load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "确认失败", icon: "none" });
  }
}
async function payBalance(order: any) {
  try {
    await request(`/public/mall/orders/${order.id}/pay/balance`, { method: "POST" });
    uni.showToast({ title: "支付成功", icon: "none" });
    load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "支付失败", icon: "none" });
  }
}
function cancelOrder(order: any) {
  uni.showModal({
    title: "取消订单",
    content: "取消后会释放商品库存，订单不可继续支付。",
    confirmText: "确认取消",
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await request(`/public/me/mall/orders/${order.id}/cancel`, { method: "POST" });
        uni.showToast({ title: "订单已取消", icon: "none" });
        load();
      } catch (error: any) {
        uni.showToast({ title: error.message || "取消失败", icon: "none" });
      }
    }
  });
}
function requestRefund(order: any) {
  uni.showModal({
    title: "申请售后",
    editable: true,
    placeholderText: "请填写退款/退货原因",
    success: async (res: any) => {
      if (!res.confirm) return;
      try {
        await request(`/public/me/mall/orders/${order.id}/refund-request`, { method: "POST", data: { reason: res.content || "用户申请售后", amount: Number(order.amount) } });
        uni.showToast({ title: "售后已提交", icon: "none" });
        load();
      } catch (error: any) {
        uni.showToast({ title: error.message || "提交失败", icon: "none" });
      }
    }
  });
}
onShow(load);
</script>

<style scoped>
.orders-page { min-height:100vh; padding:24rpx; background:#f8fafc; }
.tabs { white-space: nowrap; margin-bottom: 20rpx; }
.tabs-inner { display: flex; gap: 14rpx; padding-bottom: 4rpx; }
.tab { display: inline-flex; align-items: center; justify-content: center; padding: 14rpx 24rpx; border-radius: 999rpx; color: #92400e; background: #fffbeb; border: 1rpx solid #fde68a; font-size: 25rpx; font-weight: 800; }
.tab.active { color: #fff; background: linear-gradient(135deg, #7c2d12, #ea580c); border-color: transparent; box-shadow: 0 10rpx 24rpx rgba(234, 88, 12, .22); }
.card { background:#fff; border-radius:26rpx; padding:24rpx; margin-bottom:18rpx; box-shadow:0 12rpx 30rpx rgba(15,23,42,.06); }
.row { display:flex; justify-content:space-between; align-items:center; gap:16rpx; }
.order-no { font-weight:900; color:#1f2937; font-size:26rpx; }
.status { color:#c2410c; font-weight:900; }
.status-tip { margin-top:12rpx; padding:12rpx 14rpx; border-radius:16rpx; background:#fff7ed; color:#9a3412; font-size:23rpx; line-height:1.45; }
.deadline { margin-top:10rpx; padding:12rpx 14rpx; border-radius:16rpx; background:#ecfeff; color:#0f766e; font-size:23rpx; font-weight:800; line-height:1.45; }
.item { padding:16rpx 0; color:#334155; font-size:28rpx; border-bottom:1rpx solid #f1f5f9; }
.footer { margin-top:16rpx; color:#64748b; font-size:26rpx; }
.actions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:8rpx; }
.logistics { margin-top:12rpx; padding:12rpx; background:#fff7ed; color:#9a3412; border-radius:16rpx; font-size:24rpx; }
button { margin-left: 0; border-radius:999rpx; background:#9a3412; color:#fff; font-weight:800; }
button.ghost { background:#f1f5f9; color:#475569; }
</style>
