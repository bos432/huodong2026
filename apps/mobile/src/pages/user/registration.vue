<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { OrderStatus, RegistrationStatus } from "@activity/shared";
import { ensureUser, request, withTenantCode } from "../../api";
import { usePageDecoration } from "../../decoration";
import TenantContextBadge from "../../components/TenantContextBadge.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const registrationStatusText: Record<RegistrationStatus, string> = {
  [RegistrationStatus.PendingPayment]: "待付款",
  [RegistrationStatus.PendingReview]: "待审核",
  [RegistrationStatus.Approved]: "报名成功",
  [RegistrationStatus.Rejected]: "已拒绝",
  [RegistrationStatus.Cancelled]: "已取消",
  [RegistrationStatus.CheckedIn]: "已签到"
};

const orderStatusText: Record<OrderStatus, string> = {
  [OrderStatus.PendingPayment]: "待付款",
  [OrderStatus.Paid]: "已付款",
  [OrderStatus.Refunded]: "已退款",
  [OrderStatus.PartiallyRefunded]: "部分退款",
  [OrderStatus.Cancelled]: "已取消",
  [OrderStatus.Closed]: "已关闭"
};

const detail = ref<any>();
const code = ref("");
const userId = ref(0);
const loading = ref(true);
const paying = ref<"" | "wechat" | "balance">("");
const groupDialogVisible = ref(false);
const groupQrImageError = ref(false);
const paymentInstructionsField = "offlinePaymentInstructions";
const steps = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
const { tenant, bottomNavSection, contentSections, innerPageConfig, innerPageLayout, showBottomNav, loadDecoration } = usePageDecoration("registration_detail", "/pages/user/registration");

const groupQrCodeUrl = computed(() => detail.value?.groupQrCodeUrl || "");
const registrationStatus = computed(() => detail.value?.registration?.status as RegistrationStatus | undefined);
const orderStatus = computed(() => detail.value?.order?.status as OrderStatus | undefined);
const primaryAction = computed(() => actionForStatus(registrationStatus.value));

function currentStepIndex(status: RegistrationStatus) {
  const index = steps.indexOf(status);
  if (status === RegistrationStatus.Cancelled || status === RegistrationStatus.Rejected) return -1;
  return index;
}

function formatValue(value: any) {
  return Array.isArray(value) ? value.join("、") : value;
}

function money(value: string | number | undefined) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function operationSetting() {
  return detail.value?.operationSetting || {};
}

function paymentInstructions() {
  void operationSetting()[paymentInstructionsField];
  return "本次上线支持微信支付和后台充值余额支付；如余额不足，请联系工作人员充值后再支付。";
}

function statusTitle(status?: RegistrationStatus) {
  if (status === RegistrationStatus.PendingPayment) return "还差一步，完成付款即可锁定名额";
  if (status === RegistrationStatus.PendingReview) return "报名已提交，等待主办方审核";
  if (status === RegistrationStatus.Approved) return "报名成功，记得准时参加";
  if (status === RegistrationStatus.CheckedIn) return "你已完成签到";
  if (status === RegistrationStatus.Rejected) return "报名未通过";
  if (status === RegistrationStatus.Cancelled) return "报名已取消";
  return "报名详情";
}

function statusCopy(status?: RegistrationStatus) {
  if (status === RegistrationStatus.PendingPayment) return detail.value?.order?.expiresAt ? `请在 ${formatTime(detail.value.order.expiresAt)} 前完成微信或余额支付。` : "请完成微信或余额支付，付款成功后状态会更新。";
  if (status === RegistrationStatus.PendingReview) return "主办方正在确认报名信息，结果会同步到这里。";
  if (status === RegistrationStatus.Approved) return "活动当天可在这里查看签到码，也可以提前加入活动群获取通知。";
  if (status === RegistrationStatus.CheckedIn) return "活动已到场签到，欢迎留下评价帮助主办方改进。";
  if (status === RegistrationStatus.Rejected) return detail.value?.registration?.reviewRemark || "如需了解原因，可以联系主办方。";
  if (status === RegistrationStatus.Cancelled) return detail.value?.registration?.cancelReason || "这条报名不会再占用名额。";
  return "查看报名、订单和联系信息。";
}

function actionForStatus(status?: RegistrationStatus) {
  if (status === RegistrationStatus.PendingPayment) return { label: "去支付", type: "order" };
  if (status === RegistrationStatus.Approved) return { label: "查看签到码", type: "code" };
  if (status === RegistrationStatus.CheckedIn) return { label: "评价活动", type: "review" };
  return { label: "联系主办方", type: "service" };
}

function statusClass(status?: RegistrationStatus) {
  if (status === RegistrationStatus.PendingPayment) return "is-payment";
  if (status === RegistrationStatus.PendingReview) return "is-review";
  if (status === RegistrationStatus.Approved) return "is-approved";
  if (status === RegistrationStatus.CheckedIn) return "is-checkin";
  return "is-muted";
}

function runPrimaryAction() {
  if (primaryAction.value.type === "code") showCode();
  else if (primaryAction.value.type === "review") goReview();
  else if (primaryAction.value.type === "order") uni.pageScrollTo({ selector: ".order-card", duration: 240 });
  else uni.pageScrollTo({ selector: ".service-card", duration: 240 });
}

function canCancel() {
  const status = registrationStatus.value;
  return Boolean(status && ![RegistrationStatus.Cancelled, RegistrationStatus.CheckedIn].includes(status));
}

function showGroupDialog() {
  if (!groupQrCodeUrl.value || groupQrImageError.value) return;
  groupDialogVisible.value = true;
}

async function load() {
  loading.value = true;
  try {
    userId.value = await ensureUser();
    const pages = getCurrentPages();
    const id = Number((pages[pages.length - 1] as any).options.id);
    detail.value = await request(`/public/me/registrations/${id}`);
    code.value = "";
    groupQrImageError.value = false;
    groupDialogVisible.value = Boolean(detail.value?.groupQrCodeUrl);
  } finally {
    loading.value = false;
  }
}

async function cancel() {
  uni.showModal({
    title: "确认取消报名",
    content: "取消后可能需要重新报名，已付款订单请按主办方退款规则处理。",
    confirmText: "确认取消",
    confirmColor: "#dc2626",
    success: async (res) => {
      if (!res.confirm) return;
      await doCancel();
    }
  });
}

async function doCancel() {
  try {
    await request(`/public/me/registrations/${detail.value.registration.id}/cancel`, { method: "POST" });
    uni.showToast({ title: "已取消报名" });
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message, icon: "none" });
  }
}

async function showCode() {
  try {
    const data = await request<any>(`/public/me/registrations/${detail.value.registration.id}/check-in-code`);
    code.value = data.code;
  } catch (error: any) {
    uni.showToast({ title: error.message, icon: "none" });
  }
}

async function payOrder(provider: "wechat" | "balance") {
  if (!detail.value?.order || paying.value) return;
  paying.value = provider;
  try {
    if (provider === "balance") {
      await request<any>(`/public/orders/${detail.value.order.id}/pay/balance`, { method: "POST" });
      uni.showToast({ title: "余额支付成功" });
      await load();
      return;
    }
    const pay = await request<any>(`/public/orders/${detail.value.order.id}/pay/${provider}`, { method: "POST", data: { paymentScene: preferredWechatScene() } });
    if (pay.mode === "sandbox") {
      await request(`/payment/${provider}/callback`, {
        method: "POST",
        data: { ...pay.payParams, amount: Number(pay.amount) }
      });
      uni.showToast({ title: "微信支付成功" });
    } else if (pay.payParams?.h5Url) {
      // #ifdef H5
      window.location.href = String(pay.payParams.h5Url);
      return;
      // #endif
      uni.showModal({ title: "微信支付", content: String(pay.payParams.h5Url), showCancel: false });
    } else if (pay.payParams?.tradeType === "JSAPI" && pay.payParams?.package) {
      await requestWechatPayment(pay.payParams);
      uni.showToast({ title: "微信支付完成" });
    } else if (pay.payParams?.codeUrl) {
      uni.showModal({ title: "微信支付", content: "请使用微信扫码完成支付。", showCancel: false });
    } else {
      uni.showToast({ title: "已发起微信支付", icon: "none" });
    }
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "支付失败", icon: "none" });
  } finally {
    paying.value = "";
  }
}

function preferredWechatScene() {
  // #ifdef H5
  return "h5";
  // #endif
  return "jsapi";
}

function requestWechatPayment(params: Record<string, any>) {
  return new Promise<void>((resolve, reject) => {
    uni.requestPayment({
      provider: "wxpay",
      timeStamp: String(params.timeStamp),
      nonceStr: String(params.nonceStr),
      package: String(params.package),
      signType: String(params.signType || "RSA"),
      paySign: String(params.paySign),
      success: () => resolve(),
      fail: (error) => reject(error)
    } as any);
  });
}

function goReview() {
  uni.navigateTo({ url: withTenantCode(`/pages/user/review?id=${detail.value.registration.id}`) });
}

onMounted(() => {
  load();
  loadDecoration();
});
</script>

<template>
  <view class="container registration" :class="{ 'has-custom-nav': showBottomNav }">
    <view v-if="loading" class="card subtle">加载中...</view>
    <template v-else-if="detail">
      <TenantContextBadge :tenant="tenant" label="当前城市" hint="报名归属" />
      <PageDecorationBlocks :sections="contentSections" />

      <view class="page-head" :style="{ background: String(innerPageLayout.headerBackgroundColor || '#ffffff') }">
        <view class="page-head-title" :style="{ color: String(innerPageLayout.headerTextColor || '#111827') }">{{ innerPageConfig.title || "报名详情" }}</view>
        <view class="page-head-copy" :style="{ color: String(innerPageLayout.headerSubtitleColor || '#667085') }">{{ innerPageConfig.subtitle || "查看报名状态、订单、签到码、入群二维码和主办方服务信息。" }}</view>
      </view>

      <view class="card">
        <view class="row">
          <view class="title small">{{ detail.registration.activity.title }}</view>
          <text class="tag">{{ registrationStatusText[detail.registration.status as RegistrationStatus] }}</text>
        </view>
        <view class="subtle location">{{ detail.registration.activity.location }}</view>
      </view>

      <view class="card status-card" :class="statusClass(detail.registration.status as RegistrationStatus)">
        <view class="status-label">当前状态</view>
        <view class="status-title">{{ statusTitle(registrationStatus) }}</view>
        <view class="status-copy">{{ statusCopy(registrationStatus) }}</view>
        <view class="status-meta">
          <view><text>报名</text><text>{{ registrationStatusText[detail.registration.status as RegistrationStatus] }}</text></view>
          <view v-if="detail.order"><text>订单</text><text>{{ orderStatusText[orderStatus as OrderStatus] }}</text></view>
        </view>
        <view class="status-action" @click="runPrimaryAction">{{ primaryAction.label }}</view>
      </view>

      <view class="card">
        <view class="title small">状态时间线</view>
        <view class="timeline">
          <view v-for="(step, index) in steps" :key="step" class="step" :class="{ active: index <= currentStepIndex(detail.registration.status) }">
            <text>{{ registrationStatusText[step] }}</text>
          </view>
        </view>
        <view v-if="detail.registration.status === RegistrationStatus.Rejected" class="notice danger">报名已被拒绝：{{ detail.registration.reviewRemark || "请联系主办方了解原因" }}</view>
        <view v-if="detail.registration.status === RegistrationStatus.Cancelled" class="notice muted">报名已取消：{{ detail.registration.cancelReason || "无" }}</view>
      </view>

      <view v-if="groupQrCodeUrl" class="card group-card">
        <view class="row">
          <view>
            <view class="title small">活动群</view>
            <view class="subtle">报名后请扫码加入企业群，后续通知会在群内同步。</view>
          </view>
          <view class="mini-button" @click="showGroupDialog">放大</view>
        </view>
        <image v-if="!groupQrImageError" class="group-qr" :src="groupQrCodeUrl" mode="widthFix" @error="groupQrImageError = true" />
        <view v-else class="notice muted">二维码图片加载失败，请联系主办方获取入群方式。</view>
      </view>

      <view class="card order-card" v-if="detail.order">
        <view class="title small">订单</view>
        <view class="line"><text>票种</text><text>{{ detail.order.ticketType?.name || "标准报名" }}</text></view>
        <view v-if="detail.order.coupon" class="line"><text>优惠码</text><text>{{ detail.order.coupon.code }} · {{ detail.order.coupon.name }}</text></view>
        <view v-if="detail.order.memberLevel" class="line"><text>会员等级</text><text>{{ detail.order.memberLevel.name }}</text></view>
        <view class="line"><text>原价</text><text>¥{{ money(detail.order.originalAmount || detail.order.amount) }}</text></view>
        <view class="line"><text>会员优惠</text><text>-¥{{ money(detail.order.memberDiscountAmount) }}</text></view>
        <view class="line"><text>积分抵扣</text><text>{{ detail.order.pointsUsed || 0 }} 分 · -¥{{ money(detail.order.pointsDiscountAmount) }}</text></view>
        <view class="line"><text>总优惠</text><text>-¥{{ money(detail.order.discountAmount) }}</text></view>
        <view class="line strong"><text>实付</text><text>{{ Number(detail.order.amount) > 0 ? `¥${money(detail.order.amount)}` : "免费" }}</text></view>
        <view class="line"><text>状态</text><text>{{ orderStatusText[detail.order.status as OrderStatus] }}</text></view>
        <view v-if="detail.order.expiresAt" class="line"><text>付款截止</text><text>{{ formatTime(detail.order.expiresAt) }}</text></view>
        <view v-if="detail.order.status === OrderStatus.PendingPayment" class="notice">请选择微信支付或余额支付。余额不足时可联系后台充值后再支付。</view>
        <view v-if="detail.order.status === OrderStatus.PendingPayment && Number(detail.order.amount) > 0" class="pay-actions">
          <view class="button" :class="{ disabled: Boolean(paying) }" @click="payOrder('wechat')">{{ paying === "wechat" ? "微信支付中..." : "微信支付" }}</view>
          <view class="button secondary" :class="{ disabled: Boolean(paying) }" @click="payOrder('balance')">{{ paying === "balance" ? "余额支付中..." : "余额支付" }}</view>
        </view>
        <view v-if="detail.order.status === OrderStatus.Closed" class="notice muted">订单已关闭：{{ detail.order.closeReason || "订单已关闭，名额已释放" }}</view>
        <view v-if="detail.order.status === OrderStatus.PartiallyRefunded" class="notice">该订单已有部分退款，具体金额请联系主办方确认。</view>
        <view v-if="detail.order.status === OrderStatus.Refunded" class="notice muted">该订单已退款，报名已取消或由主办方处理。</view>
      </view>

      <view class="card service-card" v-if="detail.operationSetting">
        <view class="title small">联系主办方</view>
        <view v-if="operationSetting().customerServiceName" class="line"><text>客服</text><text>{{ operationSetting().customerServiceName }}</text></view>
        <view v-if="operationSetting().customerServicePhone" class="line"><text>电话</text><text>{{ operationSetting().customerServicePhone }}</text></view>
        <view v-if="operationSetting().customerServiceWechat" class="line"><text>微信</text><text>{{ operationSetting().customerServiceWechat }}</text></view>
        <view class="notice muted">{{ paymentInstructions() }}</view>
        <view v-if="operationSetting().refundInstructions" class="notice muted">{{ operationSetting().refundInstructions }}</view>
        <view v-if="operationSetting().invoiceInstructions" class="notice muted">{{ operationSetting().invoiceInstructions }}</view>
      </view>

      <view class="card">
        <view class="title small">报名信息</view>
        <view v-for="a in detail.registration.answers" :key="a.fieldId" class="line"><text>{{ a.label }}</text><text>{{ formatValue(a.value) }}</text></view>
      </view>

      <view v-if="code" class="card code">
        <view class="subtle">签到码</view>
        <view class="code-text">{{ code }}</view>
      </view>

      <view v-if="detail.registration.status === RegistrationStatus.Approved || detail.registration.status === RegistrationStatus.CheckedIn" class="button" @click="showCode">查看签到码</view>
      <view v-if="detail.registration.status === RegistrationStatus.Approved || detail.registration.status === RegistrationStatus.CheckedIn" class="button secondary" @click="goReview">评价活动</view>
      <view v-if="canCancel()" class="button secondary danger-button" @click="cancel">取消报名</view>

      <view v-if="groupDialogVisible" class="group-dialog-mask" @click="groupDialogVisible = false">
        <view class="group-dialog" @click.stop>
          <view class="dialog-title">扫码加入活动群</view>
          <image class="dialog-qr" :src="groupQrCodeUrl" mode="widthFix" @error="groupQrImageError = true; groupDialogVisible = false" />
          <view class="dialog-copy">报名已提交，请长按或扫码加入企业群。</view>
          <view class="button" @click="groupDialogVisible = false">知道了</view>
        </view>
      </view>
    </template>

    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/user/registration" />
  </view>
</template>

<style scoped>
.registration { padding-bottom: 36rpx; }
.registration.has-custom-nav { padding-bottom: 160rpx; }
.page-head { margin-bottom: 20rpx; padding: 28rpx 24rpx; border-radius: var(--card-radius, 8px); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.page-head-title { font-size: 40rpx; font-weight: 900; line-height: 1.25; }
.page-head-copy { margin-top: 10rpx; font-size: 25rpx; line-height: 1.5; }
.small { font-size: 30rpx; }
.location { margin-top: 12rpx; }
.status-card { display: grid; gap: 14rpx; border-color: transparent; background: #111827; color: #fff; }
.status-label { color: rgba(255,255,255,0.72); font-size: 23rpx; font-weight: 800; }
.status-title { font-size: 36rpx; line-height: 1.25; font-weight: 900; }
.status-copy { color: rgba(255,255,255,0.76); font-size: 26rpx; line-height: 1.55; }
.status-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.status-meta view { display: grid; gap: 6rpx; padding: 14rpx; border-radius: 6px; background: rgba(255,255,255,0.1); }
.status-meta text:first-child { color: rgba(255,255,255,0.66); font-size: 22rpx; }
.status-meta text:last-child { color: #fff; font-size: 25rpx; font-weight: 800; }
.status-action { height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: #fff; color: #111827; font-size: 26rpx; font-weight: 900; }
.status-card.is-payment { background: #9a3412; }
.status-card.is-review { background: #3730a3; }
.status-card.is-approved { background: var(--primary-color, #0f766e); }
.status-card.is-checkin { background: #166534; }
.status-card.is-muted { background: #475467; }
.line { display: grid; grid-template-columns: 150rpx 1fr; gap: 16rpx; margin-top: 14rpx; }
.line text:first-child { color: var(--muted-color, #667085); }
.line.strong { font-weight: 800; }
.line.strong text:last-child { color: var(--primary-color, #0f766e); }
.notice { margin-top: 16rpx; padding: 18rpx; background: #fff7ed; border-radius: 6px; color: #9a3412; line-height: 1.5; }
.notice.danger { background: #fef2f2; color: #b91c1c; }
.notice.muted { background: #f3f4f6; color: #4b5563; }
.timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; margin-top: 18rpx; }
.step { padding: 14rpx 8rpx; background: #edf0f5; border-radius: 6px; text-align: center; color: var(--muted-color, #667085); font-size: 22rpx; }
.step.active { background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-weight: 650; }
.group-card .row { align-items: flex-start; }
.mini-button { flex: 0 0 auto; padding: 10rpx 18rpx; border-radius: 999px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-size: 24rpx; font-weight: 800; }
.group-qr { display: block; width: 360rpx; margin: 24rpx auto 0; border-radius: var(--card-radius, 8px); border: 1px solid #e5e7eb; background: var(--card-bg, #fff); }
.code { text-align: center; }
.code-text { margin-top: 16rpx; font-size: 34rpx; word-break: break-all; }
.button { margin-top: 18rpx; }
.danger-button { color: #dc2626; background: #fef2f2; }
.pay-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 18rpx; }
.pay-actions .button { margin-top: 0; }
.button.disabled { opacity: 0.55; pointer-events: none; }
.group-dialog-mask { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 36rpx; background: rgba(15, 23, 42, 0.58); }
.group-dialog { width: min(620rpx, 100%); padding: 34rpx 28rpx 28rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); text-align: center; box-shadow: 0 28rpx 80rpx rgba(15, 23, 42, 0.25); }
.dialog-title { color: var(--text-color, #111827); font-size: 34rpx; font-weight: 900; }
.dialog-qr { display: block; width: 420rpx; max-width: 100%; margin: 26rpx auto 0; border-radius: var(--card-radius, 8px); border: 1px solid #e5e7eb; background: var(--card-bg, #fff); }
.dialog-copy { margin-top: 18rpx; color: var(--muted-color, #667085); font-size: 26rpx; line-height: 1.6; }
</style>
