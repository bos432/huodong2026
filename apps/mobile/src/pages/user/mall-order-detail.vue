<template>
  <view class="detail-page">
    <view class="status-card">
      <text class="status">{{ statusText(order.status) }}</text>
      <text class="status-tip">{{ statusTip(order) }}</text>
      <text class="order-no">{{ order.orderNo }}</text>
    </view>

    <view class="card">
      <text class="section-title">订单进度</text>
      <view class="timeline">
        <view v-for="step in progressSteps" :key="step.label" class="step" :class="{ active: step.active }">
          <view class="dot"></view>
          <view>
            <text class="line">{{ step.label }}</text>
            <text class="muted">{{ step.time || step.tip }}</text>
          </view>
        </view>
      </view>
      <text v-if="order.closeReason" class="warning">关闭原因：{{ order.closeReason }}</text>
      <text v-if="order.expiresAt && ['pending_payment','pending_confirm'].includes(order.status)" class="deadline">处理截止：{{ dateText(order.expiresAt) }}，超时系统将自动关闭并释放库存</text>
    </view>

    <view v-if="order.groupBuyTeams?.length" class="card group-card">
      <text class="section-title">拼团信息</text>
      <view v-for="team in order.groupBuyTeams" :key="team.id || team.teamNo" class="group-box">
        <view class="group-head">
          <text class="line">{{ team.title || team.groupBuy?.title || "拼团活动" }}</text>
          <text class="group-status" :class="team.teamStatus">{{ groupBuyTeamStatusText(team.teamStatus) }}</text>
        </view>
        <text class="muted">团号：{{ team.teamNo }}</text>
        <text class="muted">成团进度：{{ Number(team.paidPeople || 0) }} / {{ Number(team.minPeople || 2) }} 人</text>
        <text v-if="team.groupBuy?.endsAt" class="muted">截止时间：{{ dateText(team.groupBuy.endsAt) }}</text>
      </view>
    </view>

    <view class="card">
      <text class="section-title">收货信息</text>
      <text class="line">{{ address.receiverName }} {{ address.receiverPhone }}</text>
      <text class="muted">{{ [address.province, address.city, address.district, address.detail].filter(Boolean).join(" ") }}</text>
    </view>

    <view class="card">
      <text class="section-title">商品明细</text>
      <view v-for="item in order.items || []" :key="item.id" class="item-row">
        <image v-if="item.coverUrl" class="cover" :src="item.coverUrl" mode="aspectFill" />
        <view class="item-info">
          <text class="item-name">{{ item.productTitle }}</text>
          <text class="muted">{{ item.skuName }} × {{ item.quantity }}</text>
          <text v-if="item.review" class="review-state">评价：{{ reviewText(item.review.status) }}</text>
          <text v-else-if="order.status === 'completed'" class="review-link" @click.stop="reviewItem(item)">评价商品</text>
        </view>
        <text class="price">¥{{ money(item.totalAmount) }}</text>
      </view>
      <view class="amount-row">
        <text>支付方式：{{ paymentText(order.paymentMethod) }}</text>
        <text class="amount">¥{{ money(order.amount) }}</text>
      </view>
      <view v-if="Number(order.discountAmount || 0) > 0" class="amount-row subtle-row">
        <text>优惠抵扣</text>
        <text>-¥{{ money(order.discountAmount) }}</text>
      </view>
      <view v-if="Number(order.pointsUsed || 0) > 0" class="amount-row subtle-row">
        <text>积分抵扣</text>
        <text>{{ order.pointsUsed }} 分 · -¥{{ money(order.pointsDiscountAmount) }}</text>
      </view>
      <view v-if="order.promotionCode" class="amount-row subtle-row">
        <text>推广码</text>
        <text>{{ order.promotionCode }}</text>
      </view>
      <text v-if="order.buyerRemark" class="muted remark">买家备注：{{ order.buyerRemark }}</text>
      <text v-if="order.adminRemark" class="muted remark">后台备注：{{ order.adminRemark }}</text>
    </view>

    <view v-if="order.expressNo" class="card">
      <text class="section-title">物流信息</text>
      <text class="line">{{ order.expressCompany || "快递" }} {{ order.expressNo }}</text>
      <view class="logistics-actions">
        <text class="logistics-link" @click="goLogistics">查看物流</text>
        <text class="logistics-link muted-action" @click="copyExpressNo">复制单号</text>
      </view>
    </view>

    <view v-if="order.refund" class="card refund-card">
      <text class="section-title">售后状态</text>
      <text class="line">{{ refundText(order.refund.status) }} · ¥{{ money(order.refund.amount) }}</text>
      <text v-if="order.refund.providerRefundStatus || order.refund.providerRefundNo" class="muted">退款渠道：{{ refundProviderText(order.refund) }}</text>
      <text class="muted">{{ order.refund.reason || order.refund.reviewRemark || "暂无说明" }}</text>
      <view v-if="order.refund.images?.length" class="image-list refund-images">
        <image v-for="image in order.refund.images" :key="image" class="proof-image" :src="image" mode="aspectFill" @click="previewImages(order.refund.images, image)" />
      </view>
    </view>

    <view class="action-bar">
      <button v-if="order.status === 'pending_payment' && order.paymentMethod === 'balance'" @click="payBalance">继续支付</button>
      <button v-if="order.status === 'pending_payment' && order.paymentMethod === 'wechat'" @click="payWechat">继续微信支付</button>
      <button v-if="['pending_payment','pending_confirm'].includes(order.status)" class="ghost" @click="cancelOrder">取消订单</button>
      <button v-if="order.status === 'shipped'" @click="confirmReceived">确认收货</button>
      <button v-if="canRequestRefund" @click="requestRefund">申请售后</button>
    </view>

    <view v-if="reviewDialogVisible" class="review-mask" @click.self="closeReviewDialog">
      <view class="review-panel">
        <view class="review-head">
          <text class="section-title">评价商品</text>
          <text class="muted">{{ reviewForm.productTitle }}</text>
        </view>
        <view class="rating-row">
          <text v-for="star in 5" :key="star" class="rating-star" :class="{ active: star <= reviewForm.rating }" @click="reviewForm.rating = star">★</text>
        </view>
        <textarea v-model="reviewForm.content" placeholder="请写下真实体验，提交后需后台审核展示" />
        <view class="image-list">
          <view v-for="(image, index) in reviewForm.images" :key="image" class="review-image-tile">
            <image :src="image" mode="aspectFill" />
            <text class="remove-image" @click="removeReviewImage(index)">删除</text>
          </view>
          <view v-if="reviewForm.images.length < 6" class="add-image" @click="chooseReviewImages">{{ uploadingReviewImage ? "上传中..." : "+ 添加晒图" }}</view>
        </view>
        <view class="review-actions">
          <button class="ghost" @click="closeReviewDialog">取消</button>
          <button @click="submitReview">提交评价</button>
        </view>
      </view>
    </view>

    <view v-if="refundDialogVisible" class="review-mask" @click.self="closeRefundDialog">
      <view class="review-panel">
        <view class="review-head">
          <text class="section-title">申请售后</text>
          <text class="muted">请说明问题，可上传商品照片、物流截图或沟通凭证，便于后台快速处理。</text>
        </view>
        <textarea v-model="refundForm.reason" placeholder="请填写退款/退货原因" />
        <view class="image-list">
          <view v-for="(image, index) in refundForm.images" :key="image" class="review-image-tile">
            <image :src="image" mode="aspectFill" @click="previewImages(refundForm.images, image)" />
            <text class="remove-image" @click="removeRefundImage(index)">删除</text>
          </view>
          <view v-if="refundForm.images.length < 6" class="add-image" @click="chooseRefundImages">{{ uploadingRefundImage ? "上传中..." : "+ 添加凭证" }}</view>
        </view>
        <view class="review-actions">
          <button class="ghost" @click="closeRefundDialog">取消</button>
          <button @click="submitRefund">提交售后</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, request, uploadMallRefundImage, uploadMallReviewImage, withTenantCode } from "../../api";

const orderId = ref(0);
const order = ref<any>({});
const reviewDialogVisible = ref(false);
const refundDialogVisible = ref(false);
const uploadingReviewImage = ref(false);
const uploadingRefundImage = ref(false);
const reviewForm = ref<any>({ orderItemId: 0, productTitle: "", rating: 5, content: "", images: [] });
const refundForm = ref<any>({ reason: "", images: [] });
const address = computed(() => order.value.addressSnapshot || {});
const canRequestRefund = computed(() => ["paid", "shipped", "completed"].includes(order.value?.status) && !["pending", "processing", "failed"].includes(order.value?.refund?.status));
const progressSteps = computed(() => {
  const value = order.value || {};
  const status = value.status;
  return [
    { label: "提交订单", active: true, time: dateText(value.createdAt), tip: "订单已创建" },
    { label: "确认收款", active: ["paid", "shipped", "completed", "refund_pending", "refunded"].includes(status) || Boolean(value.paidAt), time: dateText(value.paidAt), tip: value.paymentMethod === "offline" ? "等待后台确认线下收款" : value.paymentMethod === "wechat" ? "等待微信支付回调" : "等待余额支付" },
    { label: "商家发货", active: ["shipped", "completed"].includes(status) || Boolean(value.shippedAt), time: dateText(value.shippedAt), tip: "等待商家填写物流" },
    { label: "订单完成", active: status === "completed" || Boolean(value.completedAt), time: dateText(value.completedAt), tip: "等待用户确认收货" }
  ];
});
function money(value: any) { return Number(value || 0).toFixed(2); }
function statusText(value: string) { return ({ pending_payment: "待付款", pending_confirm: "待确认收款", paid: "待发货", shipped: "待收货", completed: "已完成", refund_pending: "售后中", refunded: "已退款", closed: "已关闭" } as any)[value] || value || "订单详情"; }
function paymentText(value: string) { return ({ wechat: "微信支付", balance: "余额支付", offline: "线下收款" } as any)[value] || value; }
function refundText(value: string) { return ({ pending: "待审核", processing: "处理中", approved: "已通过", rejected: "已拒绝", failed: "失败" } as any)[value] || value; }
function groupBuyTeamStatusText(value: string) { return ({ forming: "组团中", success: "已成团", failed: "未成团" } as any)[value] || value || "-"; }
function refundProviderText(value: any) {
  const provider = ({ wechat: "微信原路", balance: "余额", offline: "线下" } as any)[order.value.paymentMethod] || order.value.paymentMethod || "退款";
  return `${provider} · ${value.providerRefundStatus || "-"} ${value.providerRefundNo || ""}`;
}
function reviewText(value: string) { return ({ pending: "待审核", approved: "已展示", rejected: "未通过" } as any)[value] || value; }
function dateText(value: string) { return value ? String(value).slice(0, 16).replace("T", " ") : ""; }
function statusTip(value: any) {
  const status = value?.status;
  if (status === "pending_payment") return value.paymentMethod === "wechat" ? "请完成微信支付；支付回调成功后订单会自动进入待发货。" : "请完成余额支付；取消后库存会释放。";
  if (status === "pending_confirm") return "线下收款订单已提交，等待后台财务确认。";
  if (status === "paid") return "收款已确认，等待商家发货。";
  if (status === "shipped") return "商品已发出，请核对物流并在收到后确认。";
  if (status === "completed") return "订单已完成，可作为财务和履约记录留存。";
  if (status === "refund_pending") return "售后申请审核中，请等待后台处理。";
  if (status === "refunded") return "售后已处理完成。";
  if (status === "closed") return value.closeReason ? `订单已关闭：${value.closeReason}` : "订单已关闭。";
  return "商城订单详情";
}
async function load() {
  if (!orderId.value) return;
  await ensureUser();
  order.value = await request<any>(`/public/me/mall/orders/${orderId.value}`);
}
async function confirmReceived() {
  try {
    await request(`/public/me/mall/orders/${orderId.value}/confirm-received`, { method: "POST" });
    uni.showToast({ title: "已确认收货", icon: "none" });
    load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "确认失败", icon: "none" });
  }
}
async function payBalance() {
  try {
    await request(`/public/mall/orders/${orderId.value}/pay/balance`, { method: "POST" });
    uni.showToast({ title: "支付成功", icon: "none" });
    load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "支付失败", icon: "none" });
  }
}
async function payWechat() {
  try {
    await request(`/public/mall/orders/${orderId.value}/pay/wechat`, { method: "POST", data: { paymentScene: "h5" } });
    uni.showToast({ title: "微信支付已发起，请完成付款", icon: "none" });
    load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "发起微信支付失败", icon: "none" });
  }
}
function cancelOrder() {
  uni.showModal({
    title: "取消订单",
    content: "取消后会释放商品库存，订单不可继续支付。",
    confirmText: "确认取消",
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await request(`/public/me/mall/orders/${orderId.value}/cancel`, { method: "POST" });
        uni.showToast({ title: "订单已取消", icon: "none" });
        load();
      } catch (error: any) {
        uni.showToast({ title: error.message || "取消失败", icon: "none" });
      }
    }
  });
}
function requestRefund() {
  refundForm.value = { reason: "", images: [] };
  refundDialogVisible.value = true;
}
function goLogistics() {
  uni.navigateTo({ url: withTenantCode(`/pages/mall/logistics?id=${orderId.value}`) });
}
function copyExpressNo() {
  uni.setClipboardData({ data: order.value.expressNo || "", success: () => uni.showToast({ title: "单号已复制", icon: "none" }) });
}
function reviewItem(item: any) {
  reviewForm.value = { orderItemId: item.id, productTitle: item.productTitle || "商城商品", rating: 5, content: "", images: [] };
  reviewDialogVisible.value = true;
}
function closeReviewDialog() {
  reviewDialogVisible.value = false;
}
function removeReviewImage(index: number) {
  reviewForm.value.images.splice(index, 1);
}
function closeRefundDialog() {
  refundDialogVisible.value = false;
}
function removeRefundImage(index: number) {
  refundForm.value.images.splice(index, 1);
}
function previewImages(images: string[], current: string) {
  uni.previewImage({ urls: images, current });
}
async function chooseReviewImages() {
  if (uploadingReviewImage.value) return;
  const remaining = Math.max(6 - reviewForm.value.images.length, 0);
  if (!remaining) return;
  try {
    const chosen = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => uni.chooseImage({ count: remaining, sizeType: ["compressed"], success: resolve, fail: reject }));
    const files = (chosen.tempFilePaths || []).slice(0, remaining);
    uploadingReviewImage.value = true;
    for (const filePath of files) {
      const uploaded = await uploadMallReviewImage(filePath);
      if (uploaded.url) reviewForm.value.images.push(uploaded.url);
    }
    if (files.length) uni.showToast({ title: "晒图已上传", icon: "none" });
  } catch (error: any) {
    if (!String(error?.errMsg || "").includes("cancel")) uni.showToast({ title: error.message || "上传失败", icon: "none" });
  } finally {
    uploadingReviewImage.value = false;
  }
}
async function chooseRefundImages() {
  if (uploadingRefundImage.value) return;
  const remaining = Math.max(6 - refundForm.value.images.length, 0);
  if (!remaining) return;
  try {
    const chosen = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => uni.chooseImage({ count: remaining, sizeType: ["compressed"], success: resolve, fail: reject }));
    const files = (chosen.tempFilePaths || []).slice(0, remaining);
    uploadingRefundImage.value = true;
    for (const filePath of files) {
      const uploaded = await uploadMallRefundImage(filePath);
      if (uploaded.url) refundForm.value.images.push(uploaded.url);
    }
    if (files.length) uni.showToast({ title: "凭证已上传", icon: "none" });
  } catch (error: any) {
    if (!String(error?.errMsg || "").includes("cancel")) uni.showToast({ title: error.message || "上传失败", icon: "none" });
  } finally {
    uploadingRefundImage.value = false;
  }
}
async function submitRefund() {
  const reason = String(refundForm.value.reason || "").trim();
  if (!reason) return uni.showToast({ title: "请填写售后原因", icon: "none" });
  try {
    await request(`/public/me/mall/orders/${orderId.value}/refund-request`, {
      method: "POST",
      data: {
        reason,
        amount: Number(order.value.amount || 0),
        images: refundForm.value.images.map((item: string) => String(item || "").trim()).filter(Boolean)
      }
    });
    uni.showToast({ title: "售后已提交", icon: "none" });
    closeRefundDialog();
    load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  }
}
async function submitReview() {
  const content = String(reviewForm.value.content || "").trim();
  if (!content) return uni.showToast({ title: "请填写评价内容", icon: "none" });
  try {
    await request("/public/me/mall/reviews", {
      method: "POST",
      data: {
        orderItemId: reviewForm.value.orderItemId,
        rating: reviewForm.value.rating,
        content,
        images: reviewForm.value.images.map((item: string) => String(item || "").trim()).filter(Boolean)
      }
    });
    uni.showToast({ title: "评价已提交，待审核", icon: "none" });
    closeReviewDialog();
    load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  }
}
onLoad((query) => { orderId.value = Number(query?.id || 0); });
onShow(() => load().catch((error: any) => uni.showToast({ title: error.message || "加载订单失败", icon: "none" })));
</script>

<style scoped>
.detail-page { min-height:100vh; padding:24rpx 24rpx 140rpx; background:#f8fafc; }
.status-card { padding:34rpx; border-radius:30rpx; background:linear-gradient(135deg,#7c2d12,#ea580c); color:#fff; margin-bottom:20rpx; display:grid; gap:10rpx; }
.status { font-size:38rpx; font-weight:900; }
.status-tip { font-size:26rpx; line-height:1.45; opacity:.92; }
.order-no { font-size:24rpx; opacity:.82; }
.card { background:#fff; border-radius:26rpx; padding:24rpx; margin-bottom:18rpx; box-shadow:0 12rpx 30rpx rgba(15,23,42,.06); }
.section-title { display:block; font-size:30rpx; font-weight:900; color:#1f2937; margin-bottom:16rpx; }
.line { display:block; color:#1f2937; font-size:28rpx; font-weight:800; line-height:1.5; }
.muted { display:block; color:#64748b; font-size:25rpx; line-height:1.5; }
.timeline { display:grid; gap:18rpx; }
.step { display:flex; gap:16rpx; opacity:.48; }
.step.active { opacity:1; }
.dot { width:18rpx; height:18rpx; margin-top:12rpx; border-radius:999px; background:#cbd5e1; flex:0 0 auto; }
.step.active .dot { background:#c2410c; box-shadow:0 0 0 8rpx #ffedd5; }
.warning { display:block; margin-top:18rpx; padding:14rpx; border-radius:16rpx; background:#fff7ed; color:#9a3412; font-size:24rpx; line-height:1.45; }
.deadline { display:block; margin-top:18rpx; padding:14rpx; border-radius:16rpx; background:#ecfeff; color:#0f766e; font-size:24rpx; font-weight:800; line-height:1.45; }
.group-card { border:1rpx solid rgba(194,65,12,.12); }
.group-box { display:grid; gap:8rpx; padding:18rpx; border-radius:22rpx; background:linear-gradient(135deg,#fff7ed,#fff); border:1rpx solid #ffedd5; }
.group-box + .group-box { margin-top:14rpx; }
.group-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14rpx; }
.group-head .line { flex:1; }
.group-status { flex:0 0 auto; padding:8rpx 16rpx; border-radius:999rpx; background:#f1f5f9; color:#475569; font-size:23rpx; font-weight:900; }
.group-status.forming { background:#ecfeff; color:#0f766e; }
.group-status.success { background:#dcfce7; color:#166534; }
.group-status.failed { background:#fee2e2; color:#991b1b; }
.item-row { display:flex; gap:16rpx; align-items:center; padding:16rpx 0; border-bottom:1rpx solid #f1f5f9; }
.cover { width:110rpx; height:110rpx; border-radius:18rpx; background:#fed7aa; }
.item-info { flex:1; min-width:0; }
.item-name { display:block; color:#1f2937; font-size:27rpx; font-weight:900; }
.review-link { display:inline-flex; width:fit-content; margin-top:10rpx; padding:8rpx 16rpx; border-radius:999rpx; background:#fff7ed; color:#9a3412; font-size:24rpx; font-weight:900; }
.review-state { display:block; margin-top:8rpx; color:#9a3412; font-size:24rpx; font-weight:800; }
.price { color:#c2410c; font-weight:900; }
.amount-row { display:flex; justify-content:space-between; align-items:center; margin-top:18rpx; color:#64748b; font-size:25rpx; }
.amount { color:#c2410c; font-size:36rpx; font-weight:900; }
.remark { margin-top:12rpx; }
.refund-card { border:1rpx solid rgba(194,65,12,.16); }
.refund-images { margin-top:16rpx; }
.proof-image { width:140rpx; height:140rpx; border-radius:18rpx; background:#f1f5f9; }
.logistics-actions { display:flex; gap:18rpx; margin-top:14rpx; }
.logistics-link { display:inline-flex; padding:10rpx 20rpx; border-radius:999rpx; background:#ecfeff; color:#0f766e; font-size:24rpx; font-weight:900; }
.logistics-link.muted-action { background:#f1f5f9; color:#475569; }
.action-bar { position:fixed; left:0; right:0; bottom:0; padding:18rpx 28rpx 34rpx; background:#fff; display:flex; justify-content:flex-end; gap:16rpx; box-shadow:0 -10rpx 30rpx rgba(15,23,42,.08); }
button { margin:0; border-radius:999px; background:#9a3412; color:#fff; font-size:27rpx; font-weight:900; }
button.ghost { background:#f1f5f9; color:#475569; }
.review-mask { position:fixed; inset:0; z-index:20; background:rgba(15,23,42,.46); display:flex; align-items:flex-end; }
.review-panel { width:100%; max-height:82vh; overflow:auto; padding:30rpx 28rpx 44rpx; border-radius:34rpx 34rpx 0 0; background:#fff; box-sizing:border-box; }
.review-head { margin-bottom:16rpx; }
.rating-row { display:flex; gap:12rpx; margin:10rpx 0 20rpx; }
.rating-star { color:#cbd5e1; font-size:48rpx; line-height:1; }
.rating-star.active { color:#f59e0b; }
.image-list { display:flex; gap:14rpx; flex-wrap:wrap; margin-top:18rpx; }
.review-image-tile { position:relative; width:150rpx; height:150rpx; border-radius:20rpx; overflow:hidden; background:#f1f5f9; }
.review-image-tile image { width:100%; height:100%; display:block; }
.remove-image { position:absolute; right:8rpx; top:8rpx; padding:4rpx 10rpx; border-radius:999rpx; background:rgba(15,23,42,.72); color:#fff; font-size:22rpx; font-weight:900; }
.add-image { width:150rpx; height:150rpx; display:flex; align-items:center; justify-content:center; box-sizing:border-box; border:1rpx dashed #fdba74; border-radius:20rpx; background:#fff7ed; color:#9a3412; font-size:25rpx; font-weight:900; text-align:center; }
.review-actions { display:flex; justify-content:flex-end; gap:16rpx; margin-top:22rpx; }
</style>
