<template>
  <view class="orders-page">
    <scroll-view scroll-x class="tabs">
      <view class="tabs-inner">
        <view v-for="item in statusTabs" :key="item.value" class="tab" :class="{ active: currentStatus === item.value }" @click="switchStatus(item.value)">{{ item.label }}</view>
      </view>
    </scroll-view>
    <view v-if="focusCheckoutGroupNo" class="checkout-group-focus">
      <view>
        <text class="focus-title">本次跨店拆单</text>
        <text class="focus-desc">当前仅显示结算组 {{ focusCheckoutGroupNo }} 下的 {{ visibleOrders.length }} 个店铺子订单，请逐店支付、查看发货和售后。</text>
        <view class="focus-summary">
          <text class="summary-chip">合计 ¥{{ money(checkoutGroupSummary.amount) }}</text>
          <text v-if="checkoutGroupSummary.pendingPayment" class="summary-chip attention">待付款 {{ checkoutGroupSummary.pendingPayment }}</text>
          <text v-if="checkoutGroupSummary.pendingConfirm" class="summary-chip attention">待确认 {{ checkoutGroupSummary.pendingConfirm }}</text>
          <text v-if="checkoutGroupSummary.paid" class="summary-chip">待发货 {{ checkoutGroupSummary.paid }}</text>
          <text v-if="checkoutGroupSummary.shipped" class="summary-chip">待收货 {{ checkoutGroupSummary.shipped }}</text>
          <text v-if="checkoutGroupSummary.refunding" class="summary-chip attention">售后中 {{ checkoutGroupSummary.refunding }}</text>
          <text v-if="!checkoutGroupSummary.pendingActions" class="summary-chip done">本次拆单已处理完</text>
        </view>
      </view>
      <text class="focus-clear" @click="clearCheckoutGroupFocus">查看全部</text>
    </view>
    <view v-for="order in visibleOrders" :key="order.id" class="card" @click="goDetail(order)">
      <view class="row">
        <text class="order-no">{{ order.orderNo }}</text>
        <text class="status">{{ statusText(order.status) }}</text>
      </view>
      <view class="merchant-line">履约店铺：{{ merchantName(order) }}</view>
      <view class="status-tip">{{ statusTip(order) }}</view>
      <view v-if="order.expiresAt && ['pending_payment','pending_confirm'].includes(order.status)" class="deadline">请在 {{ dateText(order.expiresAt) }} 前处理，超时将自动关闭并释放库存</view>
      <view v-for="item in order.items || []" :key="item.id" class="item">{{ item.productTitle }} / {{ item.skuName }} × {{ item.quantity }}</view>
      <view class="row footer">
        <text>¥{{ money(order.amount) }} · {{ paymentText(order.paymentMethod) }} · {{ dateText(order.createdAt) }}</text>
        <view class="actions">
          <button v-if="order.status === 'pending_payment' && order.paymentMethod === 'balance'" size="mini" @click.stop="payBalance(order)">继续支付</button>
          <button v-if="order.status === 'pending_payment' && order.paymentMethod === 'wechat'" size="mini" @click.stop="payWechat(order)">微信支付</button>
          <button v-if="['pending_payment','pending_confirm'].includes(order.status)" size="mini" class="ghost" @click.stop="cancelOrder(order)">取消订单</button>
          <button v-if="order.status === 'shipped'" size="mini" @click.stop="confirmReceived(order)">确认收货</button>
          <button v-if="canRequestRefund(order)" size="mini" @click.stop="requestRefund(order)">申请售后</button>
          <text v-else-if="refundActionTip(order)" class="refund-pill">{{ refundActionTip(order) }}</text>
        </view>
      </view>
      <view v-if="order.expressNo" class="logistics">物流：{{ order.expressCompany || '' }} {{ order.expressNo }}</view>
      <view v-if="order.refund" class="logistics">售后：{{ refundText(order.refund.status) }} {{ refundSummaryText(order.refund) }}</view>
    </view>
    <EmptyState v-if="!visibleOrders.length" icon="🛍" text="暂无商城订单" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import { handleMallWechatPayResult, preferredMallWechatPaymentScene } from "../../mall-payment";
import EmptyState from "../../components/EmptyState.vue";

const orders = ref<any[]>([]);
const currentStatus = ref("all");
const focusCheckoutGroupNo = ref("");
const visibleOrders = computed(() => {
  const groupNo = focusCheckoutGroupNo.value;
  if (!groupNo) return orders.value;
  return orders.value.filter((order) => order.checkoutGroup?.groupNo === groupNo);
});
const checkoutGroupSummary = computed(() => {
  const rows = visibleOrders.value;
  const countStatus = (status: string) => rows.filter((order) => order.status === status).length;
  const refunding = rows.filter((order) => ["pending", "processing", "failed"].includes(order?.refund?.status)).length;
  const pendingPayment = countStatus("pending_payment");
  const pendingConfirm = countStatus("pending_confirm");
  const paid = countStatus("paid");
  const shipped = countStatus("shipped");
  return {
    amount: rows.reduce((sum, order) => sum + Number(order.amount || 0), 0),
    pendingPayment,
    pendingConfirm,
    paid,
    shipped,
    refunding,
    pendingActions: pendingPayment + pendingConfirm + paid + shipped + refunding
  };
});
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
function paymentText(value: string) { return ({ balance: "余额支付", offline: "线下收款", wechat: "微信支付" } as any)[value] || value; }
function refundText(value: string) { return ({ pending: "待审核", processing: "处理中", approved: "已通过", rejected: "已拒绝", failed: "处理异常" } as any)[value] || value; }
function dateText(value: string) { return value ? String(value).slice(0, 16).replace("T", " ") : ""; }
function merchantName(order: any) { return order?.merchant?.name || order?.tenant?.name || "商城店铺"; }
function canRequestRefund(order: any) {
  return ["paid", "shipped", "completed"].includes(order?.status) && (!order?.refund || order.refund.status === "rejected");
}
function refundActionTip(order: any) {
  const status = order?.refund?.status;
  if (status === "pending") return "售后待审核";
  if (status === "processing") return "售后处理中";
  if (status === "approved") return "售后已完成";
  if (status === "failed") return "退款异常，后台处理中";
  if (status === "rejected") return "售后已拒绝，可重新申请";
  return "";
}
function refundSummaryText(refund: any) {
  if (!refund) return "";
  if (refund.status === "rejected" && refund.userReviewRemark) return refund.userReviewRemark;
  return refund.reason || refund.refundProgressText || refund.userReviewRemark || "";
}
function refundStatusTip(order: any) {
  const status = order?.refund?.status;
  if (status === "pending") return "售后已提交，等待后台审核。";
  if (status === "processing") return "退款已提交支付渠道，请等待到账结果。";
  if (status === "failed") return "退款处理异常，后台财务会重试或联系处理，请勿重复申请。";
  if (status === "approved") return "售后已完成，款项已按支付方式处理。";
  if (status === "rejected") return "售后未通过，如仍有问题可补充原因后重新申请。";
  return "";
}
function statusTip(order: any) {
  const refundTip = refundStatusTip(order);
  if (refundTip) return refundTip;
  if (order.status === "pending_payment") return order.paymentMethod === "wechat" ? "请尽快完成微信支付，跨店订单需按店铺逐个支付。" : "请尽快完成余额支付，未支付订单可取消并释放库存。";
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
function clearCheckoutGroupFocus() {
  focusCheckoutGroupNo.value = "";
  if (currentStatus.value !== "all") {
    currentStatus.value = "all";
    load();
  }
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
async function payWechat(order: any) {
  try {
    const pay = await request<any>(`/public/mall/orders/${order.id}/pay/wechat`, { method: "POST", data: { paymentScene: preferredMallWechatPaymentScene() } });
    const redirected = await handleMallWechatPayResult(pay);
    if (redirected) return;
    load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "发起微信支付失败", icon: "none" });
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
  if (!canRequestRefund(order)) {
    uni.showToast({ title: refundActionTip(order) || "当前订单不能申请售后", icon: "none" });
    return;
  }
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
onLoad((query) => {
  focusCheckoutGroupNo.value = String(query?.checkoutGroupNo || "").trim();
});
onShow(load);
</script>

<style scoped>
.orders-page { min-height:100vh; padding:24rpx; background:#f8fafc; }
.tabs { white-space: nowrap; margin-bottom: 20rpx; }
.tabs-inner { display: flex; gap: 14rpx; padding-bottom: 4rpx; }
.tab { display: inline-flex; align-items: center; justify-content: center; padding: 14rpx 24rpx; border-radius: 999rpx; color: #92400e; background: #fffbeb; border: 1rpx solid #fde68a; font-size: 25rpx; font-weight: 800; }
.tab.active { color: #fff; background: linear-gradient(135deg, #7c2d12, #ea580c); border-color: transparent; box-shadow: 0 10rpx 24rpx rgba(234, 88, 12, .22); }
.checkout-group-focus { margin-bottom:18rpx; padding:20rpx; border-radius:24rpx; background:#fff7ed; border:1rpx solid #fed7aa; display:flex; justify-content:space-between; gap:18rpx; align-items:flex-start; }
.focus-title { display:block; color:#9a3412; font-size:28rpx; font-weight:900; }
.focus-desc { display:block; margin-top:6rpx; color:#9a3412; font-size:23rpx; line-height:1.45; }
.focus-summary { margin-top:14rpx; display:flex; flex-wrap:wrap; gap:8rpx; }
.summary-chip { display:inline-flex; align-items:center; padding:7rpx 12rpx; border-radius:999rpx; background:#fff; color:#9a3412; font-size:22rpx; font-weight:900; }
.summary-chip.attention { background:#ffedd5; color:#c2410c; }
.summary-chip.done { background:#ecfdf5; color:#047857; }
.focus-clear { flex:0 0 auto; padding:8rpx 16rpx; border-radius:999rpx; background:#fff; color:#c2410c; font-size:23rpx; font-weight:900; }
.card { background:#fff; border-radius:26rpx; padding:24rpx; margin-bottom:18rpx; box-shadow:0 12rpx 30rpx rgba(15,23,42,.06); }
.row { display:flex; justify-content:space-between; align-items:center; gap:16rpx; }
.order-no { font-weight:900; color:#1f2937; font-size:26rpx; }
.status { color:#c2410c; font-weight:900; }
.merchant-line { margin-top:10rpx; display:inline-flex; width:fit-content; padding:8rpx 14rpx; border-radius:999rpx; background:#f8fafc; color:#475569; font-size:23rpx; font-weight:900; }
.status-tip { margin-top:12rpx; padding:12rpx 14rpx; border-radius:16rpx; background:#fff7ed; color:#9a3412; font-size:23rpx; line-height:1.45; }
.deadline { margin-top:10rpx; padding:12rpx 14rpx; border-radius:16rpx; background:#ecfeff; color:#0f766e; font-size:23rpx; font-weight:800; line-height:1.45; }
.item { padding:16rpx 0; color:#334155; font-size:28rpx; border-bottom:1rpx solid #f1f5f9; }
.footer { margin-top:16rpx; color:#64748b; font-size:26rpx; }
.actions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:8rpx; }
.refund-pill { display:inline-flex; align-items:center; padding:0 18rpx; border-radius:999rpx; background:#fff7ed; color:#9a3412; font-size:23rpx; font-weight:900; }
.logistics { margin-top:12rpx; padding:12rpx; background:#fff7ed; color:#9a3412; border-radius:16rpx; font-size:24rpx; }
button { margin-left: 0; border-radius:999rpx; background:#9a3412; color:#fff; font-weight:800; }
button.ghost { background:#f1f5f9; color:#475569; }
</style>
