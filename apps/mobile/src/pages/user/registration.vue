<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { OrderStatus, RegistrationStatus } from "@activity/shared";
import QRCode from "qrcode";
import { ensureUser, getCurrentTenantCode, request, requestCheckInQrImage, requestRegistrationRefund, withTenantCode } from "../../api";
import { filterIntrinsicHeaderDecorationSections, usePageDecoration } from "../../decoration";
import { clientError } from "../../error-reporting";
import TenantContextBadge from "../../components/TenantContextBadge.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import { queryEntries } from "../../query";
import { formatShanghaiDateTime } from "../../tenant-load-guard";
import { reviewSafeData, reviewSafeText } from "../../review-safe-text";
import { addActivityToCalendar } from "../../activity-calendar";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { isLinkAllowedByFeature, loadFeatureGates, showFeatureDisabledDialog } from "../../feature-gates";

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
const registrationId = ref(0);
const code = ref("");
const codeQrUrl = ref("");
const codeQrMatrix = ref<boolean[][]>([]);
const userId = ref(0);
const loading = ref(true);
const loadError = ref("");
const actionError = ref("");
const paying = ref<"" | "wechat" | "alipay" | "balance">("");
const paymentChecking = ref(false);
const paymentClosing = ref(false);
const refunding = ref(false);
const cancelling = ref(false);
const loadedContextKey = ref("");
const loadGuard = createTenantLoadGuard();
let codeRequestSerial = 0;
const groupDialogVisible = ref(false);
const groupQrImageError = ref(false);
const paymentInstructionsField = "offlinePaymentInstructions";
const steps = [RegistrationStatus.PendingPayment, RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn];
const { tenant, bottomNavSection, contentSections, innerPageConfig, innerPageLayout, showBottomNav, loadDecoration } = usePageDecoration("registration_detail", "/pages/user/registration");
const bodyDecorationSections = computed(() => filterIntrinsicHeaderDecorationSections(contentSections.value));

const groupQrCodeUrl = computed(() => detail.value?.groupQrCodeUrl || "");
const registrationStatus = computed(() => detail.value?.registration?.status as RegistrationStatus | undefined);
const orderStatus = computed(() => detail.value?.order?.status as OrderStatus | undefined);
const primaryAction = computed(() => actionForStatus(registrationStatus.value));
const charityRefund = computed(() => detail.value?.charityRefund || null);
const canShareActivityPost = computed(() => registrationStatus.value === RegistrationStatus.Approved || registrationStatus.value === RegistrationStatus.CheckedIn);
const communityPublishAvailable = computed(() => isLinkAllowedByFeature("/pages/community/publish"));
const canShowCheckInCode = computed(() => registrationStatus.value === RegistrationStatus.Approved || registrationStatus.value === RegistrationStatus.CheckedIn);
const canEnterActivitySpace = computed(() => registrationStatus.value === RegistrationStatus.Approved || registrationStatus.value === RegistrationStatus.CheckedIn);
const paymentBusy = computed(() => Boolean(paying.value) || paymentChecking.value || paymentClosing.value);

type RegistrationActionContext = { tenantCode: string; registrationId: number; orderId: number };

function routeRegistrationId() {
  return registrationId.value;
}

function actionContext(): RegistrationActionContext | null {
  const registrationId = Number(detail.value?.registration?.id || 0);
  if (!registrationId) return null;
  return { tenantCode: getCurrentTenantCode(), registrationId, orderId: Number(detail.value?.order?.id || 0) };
}

function assertActionContext(context: RegistrationActionContext) {
  const current = actionContext();
  if (!current || current.tenantCode !== context.tenantCode || current.registrationId !== context.registrationId || current.orderId !== context.orderId) {
    throw new Error("当前城市或报名已变化，请重新操作");
  }
}

function showActionError(error: unknown, fallback: string) {
  actionError.value = reviewSafeText((error as any)?.message || fallback);
}

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
  return formatShanghaiDateTime(value);
}

function operationSetting() {
  return detail.value?.operationSetting || {};
}

function paymentInstructions() {
  return operationSetting()[paymentInstructionsField] || "线下付款后请联系主办方确认收款，后台确认后报名状态会自动更新。";
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
  if (status === RegistrationStatus.PendingPayment) return detail.value?.order?.expiresAt ? `请在 ${formatTime(detail.value.order.expiresAt)} 前完成付款。` : "请完成付款，付款成功或后台确认后状态会更新。";
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

async function addCalendarReminder() {
  const activity = detail.value?.registration?.activity;
  try {
    await addActivityToCalendar({
      title: activity?.title || "慢π活动",
      startTime: activity?.startTime,
      endTime: activity?.endTime,
      location: activity?.location,
      description: "你已报名该活动，请提前安排出行并按时签到。"
    });
    uni.showToast({ title: "已添加活动提醒", icon: "success" });
  } catch (error: any) {
    uni.showToast({ title: reviewSafeText(error?.message || "添加提醒失败"), icon: "none" });
  }
}

function showGroupDialog() {
  if (!groupQrCodeUrl.value || groupQrImageError.value) return;
  groupDialogVisible.value = true;
}

function previewGroupQr() {
  if (!groupQrCodeUrl.value || groupQrImageError.value) return;
  uni.previewImage({ current: groupQrCodeUrl.value, urls: [groupQrCodeUrl.value] });
}

function scrollToCode() {
  setTimeout(() => {
    // #ifdef H5
    const target = document.querySelector(".code") as HTMLElement | null;
    if (target) {
      const currentTop = document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset || 0;
      const top = Math.max(target.getBoundingClientRect().top + currentTop - 16, 0);
      const scroller = document.scrollingElement || document.documentElement || document.body;
      scroller.scrollTo({ top, behavior: "smooth" });
      document.body.scrollTop = top;
      document.documentElement.scrollTop = top;
      return;
    }
    // #endif
    uni.pageScrollTo({ selector: ".code", duration: 240 });
  }, 60);
}

async function load() {
  const loadToken = loadGuard.begin();
  const id = routeRegistrationId();
  const contextKey = `${loadToken.tenantCode}:${id}`;
  if (loadedContextKey.value && loadedContextKey.value !== contextKey) {
    detail.value = undefined;
    code.value = "";
    codeQrUrl.value = "";
    codeQrMatrix.value = [];
    groupDialogVisible.value = false;
  }
  loading.value = true;
  loadError.value = "";
  try {
    userId.value = await ensureUser();
    const nextDetail = reviewSafeData(await request(`/public/me/registrations/${id}`));
    if (!loadGuard.isCurrent(loadToken) || routeRegistrationId() !== id) return;
    detail.value = nextDetail;
    loadedContextKey.value = contextKey;
    code.value = "";
    codeQrUrl.value = "";
    codeQrMatrix.value = [];
    groupQrImageError.value = false;
    groupDialogVisible.value = false;
    if (canShowCheckInCode.value) showCode(false);
  } catch (error: any) {
    if (!loadGuard.isCurrent(loadToken)) return;
    loadError.value = reviewSafeText(error?.message || "加载报名详情失败，请稍后重试。");
  } finally {
    if (loadGuard.isCurrent(loadToken)) loading.value = false;
  }
}

function buildCheckInQrMatrix(value: string) {
  const qr = (QRCode as any).create(value, { errorCorrectionLevel: "M", margin: 1 });
  const modules = qr.modules;
  const size = Number(modules.size || 0);
  if (!size) throw new Error("签到二维码生成失败");

  const quietZone = 4;
  const matrixSize = size + quietZone * 2;
  const matrix: boolean[][] = [];
  for (let row = 0; row < matrixSize; row += 1) {
    const line: boolean[] = [];
    for (let col = 0; col < matrixSize; col += 1) {
      const sourceRow = row - quietZone;
      const sourceCol = col - quietZone;
      const inQr = sourceRow >= 0 && sourceRow < size && sourceCol >= 0 && sourceCol < size;
      const isDark = inQr && (typeof modules.get === "function"
        ? Boolean(modules.get(sourceRow, sourceCol))
        : Boolean(modules.data?.[sourceRow * size + sourceCol]));
      line.push(isDark);
    }
    matrix.push(line);
  }
  return matrix;
}

async function generateCheckInQr(value: string, registrationId?: number) {
  codeQrUrl.value = "";
  codeQrMatrix.value = [];
  if (registrationId) {
    try {
      codeQrUrl.value = await requestCheckInQrImage(registrationId);
      if (codeQrUrl.value) return;
    } catch {
      codeQrUrl.value = "";
    }
  }
  try {
    codeQrMatrix.value = buildCheckInQrMatrix(value);
    if (codeQrMatrix.value.length) return;
  } catch {
    codeQrMatrix.value = [];
  }
  try {
    codeQrUrl.value = await QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: { dark: "#111827", light: "#ffffff" }
    });
  } catch {
    codeQrUrl.value = "";
    codeQrMatrix.value = [];
  }
}

async function cancel() {
  if (!canCancel() || cancelling.value) return;
  const context = actionContext();
  if (!context) return;
  cancelling.value = true;
  actionError.value = "";
  uni.showModal({
    title: "确认取消报名",
    content: "取消后可能需要重新报名，已付款订单请按主办方退款规则处理。",
    confirmText: "确认取消",
    confirmColor: "#dc2626",
    success: async (res) => {
      if (!res.confirm) {
        cancelling.value = false;
        return;
      }
      await doCancel(context);
    },
    fail: () => { cancelling.value = false; }
  });
}

async function doCancel(context: RegistrationActionContext) {
  try {
    assertActionContext(context);
    await request(`/public/me/registrations/${context.registrationId}/cancel`, { method: "POST" });
    assertActionContext(context);
    uni.showToast({ title: "已取消报名" });
    await load();
  } catch (error: any) {
    showActionError(error, "取消报名失败");
  } finally {
    cancelling.value = false;
  }
}

async function requestRefund() {
  const preview = charityRefund.value;
  if (!detail.value?.registration?.id || !preview?.canRequest || refunding.value) return;
  const context = actionContext();
  if (!context) return;
  refunding.value = true;
  actionError.value = "";
  uni.showModal({
    title: "申请退款",
    content: `预计退回 ¥${money(preview.actualRefundAmount || preview.refundAmount)}，保留公益金 ¥${money(preview.charityAmount)}。提交后等待后台审核。`,
    confirmText: "提交申请",
    success: async (res) => {
      if (!res.confirm) {
        refunding.value = false;
        return;
      }
      try {
        assertActionContext(context);
        await requestRegistrationRefund(context.registrationId);
        assertActionContext(context);
        uni.showToast({ title: "已提交退款申请" });
        await load();
      } catch (error: any) {
        showActionError(error, "退款申请失败");
      } finally {
        refunding.value = false;
      }
    },
    fail: () => { refunding.value = false; }
  });
}

async function showCode(scroll = true) {
  const context = actionContext();
  if (!context) return;
  const serial = ++codeRequestSerial;
  actionError.value = "";
  try {
    const data = await request<any>(`/public/me/registrations/${context.registrationId}/check-in-code`);
    if (serial !== codeRequestSerial) return;
    assertActionContext(context);
    code.value = data.code;
    await generateCheckInQr(code.value, context.registrationId);
    if (serial !== codeRequestSerial) return;
    assertActionContext(context);
    if (scroll) scrollToCode();
  } catch (error: any) {
    if (serial === codeRequestSerial) showActionError(error, "签到码加载失败");
  }
}

function copyCode() {
  if (!code.value) return;
  uni.setClipboardData({ data: code.value, success: () => uni.showToast({ title: "已复制签到码", icon: "success" }) });
}

async function payOrder(provider: "wechat" | "alipay" | "balance") {
  if (!detail.value?.order || paymentBusy.value) return;
  const context = actionContext();
  if (!context?.orderId) return;
  paying.value = provider;
  actionError.value = "";
  try {
    assertActionContext(context);
    if (provider === "balance") {
      await request<any>(`/public/orders/${context.orderId}/pay/balance`, { method: "POST" });
      assertActionContext(context);
      uni.showToast({ title: "余额支付成功" });
      await load();
      return;
    }
    const pay = await request<any>(`/public/orders/${context.orderId}/pay/${provider}`, { method: "POST", data: { paymentScene: preferredPaymentScene(provider) } });
    assertActionContext(context);
    if (pay.mode === "sandbox") {
      await request(`/payment/${provider}/callback`, {
        method: "POST",
        data: { ...pay.payParams, amount: Number(pay.amount) }
      });
      uni.showToast({ title: provider === "alipay" ? "支付宝支付成功" : "微信支付成功" });
    } else if (pay.payParams?.h5Url) {
      // #ifdef H5
      window.location.href = String(pay.payParams.h5Url);
      return;
      // #endif
      uni.showModal({ title: "微信支付", content: String(pay.payParams.h5Url), showCancel: false });
    } else if (pay.payParams?.formBody && pay.payParams?.gatewayUrl) {
      // #ifdef H5
      const form = document.createElement("form");
      form.method = "POST";
      form.action = String(pay.payParams.gatewayUrl);
      queryEntries(String(pay.payParams.formBody)).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
      return;
      // #endif
      uni.showModal({ title: "支付宝", content: "请在浏览器中打开后完成支付宝付款。", showCancel: false });
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
    showActionError(error, "支付失败");
  } finally {
    paying.value = "";
  }
}

async function refreshPaymentStatus() {
  if (!detail.value?.registration?.id || paymentBusy.value) return;
  const context = actionContext();
  if (!context) return;
  paymentChecking.value = true;
  actionError.value = "";
  try {
    assertActionContext(context);
    const result = await request<any>(`/public/me/registrations/${context.registrationId}/payment-status`);
    assertActionContext(context);
    uni.showToast({ title: result.status === "success" ? "支付已确认" : result.status === "closed" ? "订单已关闭" : "仍在等待支付", icon: "none" });
    await load();
  } catch (error: any) { showActionError(error, "查单失败"); }
  finally { paymentChecking.value = false; }
}

function closePendingPayment() {
  if (!detail.value?.registration?.id || paymentBusy.value) return;
  const context = actionContext();
  if (!context) return;
  paymentClosing.value = true;
  actionError.value = "";
  uni.showModal({ title: "关闭待支付订单", content: "关闭后本次报名会取消并释放名额，已使用的积分将返还。确认继续？", confirmText: "确认关闭", confirmColor: "#b42318", success: async (result) => {
    if (!result.confirm) {
      paymentClosing.value = false;
      return;
    }
    try {
      assertActionContext(context);
      await request(`/public/me/registrations/${context.registrationId}/payment-close`, { method: "POST" });
      assertActionContext(context);
      uni.showToast({ title: "订单已关闭", icon: "success" });
      await load();
    } catch (error: any) { showActionError(error, "关闭失败"); }
    finally { paymentClosing.value = false; }
  }, fail: () => { paymentClosing.value = false; }});
}

function preferredPaymentScene(provider: "wechat" | "alipay" | "balance") {
  // #ifdef H5
  return provider === "alipay" ? "wap" : "h5";
  // #endif
  return provider === "alipay" ? "precreate" : "jsapi";
}

function enabledPaymentMethods() {
  return { free: true, wechat: false, alipay: false, balance: true, offline: true, ...(operationSetting().paymentMethods || {}) };
}

function canPay(method: "wechat" | "alipay" | "balance" | "offline") {
  return Boolean(enabledPaymentMethods()[method]);
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
      fail: (error) => reject(clientError(error, "微信支付失败", { provider: "wxpay", tradeType: params.tradeType || "JSAPI" }))
    } as any);
  });
}

function goReview() {
  uni.navigateTo({ url: withTenantCode(`/pages/user/review?id=${detail.value.registration.id}`) });
}
function goActivitySpace() {
  const activityId = Number(detail.value?.registration?.activity?.id || 0);
  if (activityId) uni.navigateTo({ url: withTenantCode(`/pages/activity/space?id=${activityId}`) });
}

async function goPublish() {
  await loadFeatureGates(true);
  if (!isLinkAllowedByFeature("/pages/community/publish")) {
    showFeatureDisabledDialog("/pages/community/publish");
    return;
  }
  const activityId = detail.value?.registration?.activity?.id || "";
  uni.navigateTo({ url: withTenantCode(`/pages/community/publish?activityId=${activityId}`) });
}

onLoad((query) => { registrationId.value = Number(query?.id || 0); });
onShow(async () => { await Promise.allSettled([load(), loadDecoration(), loadFeatureGates(true)]); });
</script>

<template>
  <view class="container registration" :class="{ 'has-custom-nav': showBottomNav }">
    <view v-if="loading" class="card subtle" role="status" aria-live="polite">加载中…</view>
    <view v-else-if="loadError" class="card error-card">
      <view class="title small">报名详情加载失败</view>
      <view class="subtle">{{ loadError }}</view>
      <view class="button secondary retry" @click="load">重新加载</view>
    </view>
    <template v-else-if="detail">
      <view v-if="actionError" class="card action-error" role="alert" aria-live="assertive"><text>{{ actionError }}</text><view class="action-error-close" role="button" tabindex="0" @click="actionError = ''">关闭</view></view>
      <TenantContextBadge :tenant="tenant" label="当前城市" hint="报名归属" />

      <view class="registration-hero" :class="statusClass(detail.registration.status as RegistrationStatus)">
        <image v-if="detail.registration.activity.coverUrl" class="hero-image" :src="detail.registration.activity.coverUrl" mode="aspectFill" />
        <view v-else class="hero-image hero-fallback">报名</view>
        <view class="hero-mask"></view>
        <view class="hero-head">
          <text class="hero-kicker">慢π · 报名详情</text>
          <text class="hero-status">{{ registrationStatusText[detail.registration.status as RegistrationStatus] }}</text>
        </view>
        <view class="hero-bottom">
          <view class="page-head" :style="{ background: String(innerPageLayout.headerBackgroundColor || 'transparent') }">
            <view class="page-head-title">{{ detail.registration.activity.title }}</view>
            <view class="page-head-copy">{{ innerPageConfig.subtitle || "查看报名状态、订单、签到码、入群二维码和主办方服务信息。" }}</view>
          </view>
          <view class="hero-summary">
            <view><text>报名</text><text>{{ registrationStatusText[detail.registration.status as RegistrationStatus] }}</text></view>
            <view v-if="detail.order"><text>订单</text><text>{{ orderStatusText[orderStatus as OrderStatus] }}</text></view>
            <view><text>地点</text><text>{{ detail.registration.activity.location }}</text></view>
          </view>
        </view>
      </view>

      <PageDecorationBlocks :sections="bodyDecorationSections" />

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

      <view v-if="canEnterActivitySpace" class="card activity-space-entry" @click="goActivitySpace"><view><text class="space-entry-kicker">报名后活动空间</text><text class="space-entry-title">公告、参与成员、问答与现场服务</text></view><text class="space-entry-arrow">›</text></view>

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
          <view class="subtle">请点击二维码预览，再长按图片识别群二维码。相机扫码仅用于平台活动码和签到码。</view>
          </view>
          <view class="mini-button" @click="showGroupDialog">查看二维码</view>
        </view>
        <image v-if="!groupQrImageError" class="group-qr" :src="groupQrCodeUrl" mode="aspectFit" show-menu-by-longpress="true" @click="previewGroupQr" @error="groupQrImageError = true" />
        <view v-else class="notice muted">二维码图片加载失败，请联系主办方获取入群方式。</view>
        <view class="group-actions">
          <view class="group-action" role="button" tabindex="0" aria-label="预览活动群二维码并长按识别" @click="previewGroupQr" @keyup.enter="previewGroupQr" @keyup.space.prevent="previewGroupQr">长按识别</view>
          <view class="group-action primary" role="button" tabindex="0" aria-label="预览活动群二维码并长按识别" @click="previewGroupQr" @keyup.enter="previewGroupQr" @keyup.space.prevent="previewGroupQr">预览并识别</view>
        </view>
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
        <view v-if="detail.order.status === OrderStatus.PendingPayment && detail.order.paymentMethod !== 'offline'" class="notice">请选择当前订单对应的支付方式完成付款。余额不足时可联系后台充值后再支付。</view>
        <view v-if="detail.order.status === OrderStatus.PendingPayment && detail.order.paymentMethod === 'offline'" class="notice">{{ paymentInstructions() }}</view>
        <view v-if="detail.order.status === OrderStatus.PendingPayment && Number(detail.order.amount) > 0" class="pay-actions">
          <view v-if="detail.order.paymentMethod === 'wechat' && canPay('wechat')" class="button" :class="{ disabled: paymentBusy }" role="button" tabindex="0" :aria-disabled="paymentBusy" :aria-busy="paying === 'wechat'" @click="payOrder('wechat')" @keyup.enter="payOrder('wechat')" @keyup.space.prevent="payOrder('wechat')">{{ paying === "wechat" ? "微信支付中…" : "微信支付" }}</view>
          <view v-if="detail.order.paymentMethod === 'alipay' && canPay('alipay')" class="button" :class="{ disabled: paymentBusy }" role="button" tabindex="0" :aria-disabled="paymentBusy" :aria-busy="paying === 'alipay'" @click="payOrder('alipay')" @keyup.enter="payOrder('alipay')" @keyup.space.prevent="payOrder('alipay')">{{ paying === "alipay" ? "支付宝支付中…" : "支付宝" }}</view>
          <view v-if="detail.order.paymentMethod === 'balance' && canPay('balance')" class="button secondary" :class="{ disabled: paymentBusy }" role="button" tabindex="0" :aria-disabled="paymentBusy" :aria-busy="paying === 'balance'" @click="payOrder('balance')" @keyup.enter="payOrder('balance')" @keyup.space.prevent="payOrder('balance')">{{ paying === "balance" ? "余额支付中…" : "余额支付" }}</view>
          <view v-if="detail.order.paymentMethod === 'offline'" class="button secondary disabled">等待后台确认收款</view>
          <view class="button secondary" :class="{ disabled: paymentBusy }" role="button" tabindex="0" :aria-disabled="paymentBusy" :aria-busy="paymentChecking" @click="refreshPaymentStatus" @keyup.enter="refreshPaymentStatus" @keyup.space.prevent="refreshPaymentStatus">{{ paymentChecking ? "查询中…" : "刷新支付状态" }}</view>
          <view class="button secondary danger-button" :class="{ disabled: paymentBusy }" role="button" tabindex="0" :aria-disabled="paymentBusy" :aria-busy="paymentClosing" @click="closePendingPayment" @keyup.enter="closePendingPayment" @keyup.space.prevent="closePendingPayment">{{ paymentClosing ? "关闭中…" : "关闭订单" }}</view>
        </view>
        <view v-if="charityRefund?.enabled" class="charity-refund-box">
          <view class="charity-refund-title">公益退款规则</view>
          <view v-if="charityRefund.terminal" class="charity-refund-copy">公益退款已完成，公益金 ¥{{ money(charityRefund.charityAmount) }} 已保留，报名资格已关闭。</view>
          <view v-else class="charity-refund-copy">该订单公益金 ¥{{ money(charityRefund.charityAmount) }} 会保留到你的公益基金，预计可退 ¥{{ money(charityRefund.actualRefundAmount || charityRefund.refundAmount) }}。</view>
          <view v-if="charityRefund.pendingRefund" class="notice">退款申请处理中：¥{{ money(charityRefund.pendingRefund.amount) }}，请等待后台审核。</view>
          <view v-else-if="charityRefund.canRequest" class="button secondary" :class="{ disabled: refunding }" role="button" tabindex="0" :aria-disabled="refunding" :aria-busy="refunding" @click="requestRefund" @keyup.enter="requestRefund" @keyup.space.prevent="requestRefund">{{ refunding ? "提交中…" : "申请退款并保留公益金" }}</view>
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
        <view class="subtle">现场签到二维码</view>
        <view v-if="codeQrMatrix.length" class="code-qr-matrix">
          <view v-for="(row, rowIndex) in codeQrMatrix" :key="rowIndex" class="code-qr-row">
            <view v-for="(cell, cellIndex) in row" :key="cellIndex" class="code-qr-cell" :class="{ dark: cell }" />
          </view>
        </view>
        <image v-else-if="codeQrUrl" class="code-qr" :src="codeQrUrl" mode="aspectFit" />
        <view v-else class="notice muted">二维码暂未生成，可先复制下方签到码让工作人员手动核销。</view>
        <view class="code-text">{{ code }}</view>
        <view class="code-tip">现场可出示二维码扫码核销，也可让工作人员手动输入下方签到码。</view>
        <view class="mini-button copy-code" @click="copyCode">复制签到码</view>
      </view>

      <view v-if="canShowCheckInCode" class="button" @click="showCode(true)">{{ code ? "刷新签到二维码" : "查看签到二维码" }}</view>
      <view v-if="canShowCheckInCode" class="button secondary" @click="addCalendarReminder">添加到日历</view>
      <view v-if="canShowCheckInCode" class="button secondary" @click="goReview">评价活动</view>
      <view v-if="canShareActivityPost && communityPublishAvailable" class="button secondary share-button" @click="goPublish">分享活动心得</view>
      <view v-if="canCancel()" class="button secondary danger-button" :class="{ disabled: cancelling }" role="button" tabindex="0" :aria-disabled="cancelling" :aria-busy="cancelling" @click="cancel" @keyup.enter="cancel" @keyup.space.prevent="cancel">{{ cancelling ? "取消中…" : "取消报名" }}</view>

      <view v-if="groupDialogVisible" class="group-dialog-mask" @click="groupDialogVisible = false">
        <view class="group-dialog" @click.stop>
          <view class="dialog-title">扫码加入活动群</view>
          <image class="dialog-qr" :src="groupQrCodeUrl" mode="aspectFit" show-menu-by-longpress="true" @error="groupQrImageError = true; groupDialogVisible = false" />
          <view class="dialog-copy">点击二维码进入图片预览，然后长按图片识别。相机扫码仅用于平台活动码和签到码。</view>
          <view class="dialog-action" role="button" tabindex="0" aria-label="预览二维码并长按识别" @click="previewGroupQr">预览并长按识别</view>
          <view class="button" @click="groupDialogVisible = false">知道了</view>
        </view>
      </view>
    </template>

    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/user/registration" />
  </view>
</template>

<style scoped>
.registration { min-height:100vh; box-sizing:border-box; padding-bottom:calc(36rpx + env(safe-area-inset-bottom)); }
.registration.has-custom-nav { padding-bottom:calc(160rpx + env(safe-area-inset-bottom)); }
.activity-space-entry{display:flex;align-items:center;justify-content:space-between;gap:18rpx;background:#effbf4;border-color:#d8eee1}.space-entry-kicker,.space-entry-title{display:block}.space-entry-kicker{color:#078347;font-size:20rpx;font-weight:900}.space-entry-title{margin-top:8rpx;color:#163423;font-size:27rpx;font-weight:900}.space-entry-arrow{color:#08753f;font-size:44rpx;font-weight:900}
.action-error { display:flex; align-items:center; justify-content:space-between; gap:18rpx; border:1rpx solid #fecaca; background:#fff7f7; color:#b42318; line-height:1.55; overflow-wrap:anywhere; }
.action-error-close { flex:0 0 auto; padding:10rpx 18rpx; border-radius:8px; background:#b42318; color:#fff; font-weight:800; }
.registration-hero {
  position: relative;
  overflow: hidden;
  min-height: 500rpx;
  margin-bottom: 24rpx;
  border-radius: 14rpx;
  background: #0f766e;
  box-shadow: 0 16rpx 36rpx rgba(15, 118, 110, 0.16);
}
.hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.hero-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.92);
  font-size: 72rpx;
  font-weight: 700;
  background: #0f766e;
}
.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(7, 36, 32, 0.16), rgba(7, 36, 32, 0.8));
}
.hero-head,
.hero-bottom {
  position: relative;
  z-index: 1;
}
.hero-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 24rpx 0;
}
.hero-kicker {
  color: rgba(255, 255, 255, 0.78);
  font-size: 23rpx;
  font-weight: 700;
}
.hero-status {
  flex: 0 0 auto;
  min-height: 50rpx;
  padding: 0 16rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}
.hero-bottom {
  min-height: 476rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 22rpx;
  padding: 24rpx;
}
.page-head {
  margin-bottom: 0;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
  background: transparent !important;
}
.page-head-title {
  color: #fff;
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.24;
}
.page-head-copy {
  margin-top: 12rpx;
  font-size: 25rpx;
  line-height: 1.65;
}
.hero-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}
.hero-summary view {
  min-width: 0;
  display: grid;
  gap: 6rpx;
  padding: 16rpx 14rpx;
  border-radius: 10rpx;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
.hero-summary text:first-child {
  color: rgba(255, 255, 255, 0.68);
  font-size: 22rpx;
}
.hero-summary text:last-child {
  color: #fff;
  font-size: 25rpx;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.small { font-size: 30rpx; }
.status-card { display: grid; gap: 14rpx; border-color: rgba(15,118,110,.1); background: #fff; color: #173f3a; border-left: 8rpx solid #0f766e; box-shadow: 0 8rpx 22rpx rgba(20,72,64,.05); }
.status-label { color: #0f766e; font-size: 23rpx; font-weight: 800; }
.status-title { font-size: 36rpx; line-height: 1.25; font-weight: 900; }
.status-copy { color: #54716c; font-size: 26rpx; line-height: 1.55; }
.status-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.status-meta view { display: grid; gap: 6rpx; padding: 14rpx; border-radius: 10rpx; background: #f1f7f5; }
.status-meta text:first-child { color: #999999; font-size: 22rpx; }
.status-meta text:last-child { color: #173f3a; font-size: 25rpx; font-weight: 800; }
.status-action { height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 9rpx; background: #0f766e; color: #fff; font-size: 26rpx; font-weight: 900; }
.status-card.is-payment { border-left-color: #c47a26; }
.status-card.is-review { border-left-color: #0f766e; }
.status-card.is-approved { border-left-color: #0f766e; }
.status-card.is-checkin { border-left-color: #0f766e; }
.status-card.is-muted { border-left-color: #999999; }
.line { display: grid; grid-template-columns: 150rpx 1fr; gap: 16rpx; margin-top: 14rpx; }
.line text:first-child { color: var(--muted-color, #667085); }
.line.strong { font-weight: 800; }
.line.strong text:last-child { color: #0f766e; }
.notice { margin-top: 16rpx; padding: 18rpx; background: #fff7ed; border-radius: 10rpx; color: #9a3412; line-height: 1.5; }
.notice.danger { background: #fef2f2; color: #b91c1c; }
.notice.muted { background: #f3f4f6; color: #4b5563; }
.timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; margin-top: 18rpx; }
.step { padding: 14rpx 8rpx; background: #f1f7f5; border-radius: 8rpx; text-align: center; color: #718a85; font-size: 22rpx; }
.step.active { background: rgba(15, 118, 110, 0.12); color: #0f766e; font-weight: 800; }
.group-card .row { align-items: flex-start; }
.mini-button { flex: 0 0 auto; padding: 10rpx 18rpx; border-radius: 8rpx; background: #eaf7f3; color: #0f766e; font-size: 24rpx; font-weight: 800; }
.group-qr { display: block; width: 360rpx; height: 360rpx; margin: 24rpx auto 0; border-radius: 10rpx; border: 1px solid #d9ebe6; background: var(--card-bg, #fff); }
.group-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; margin-top: 20rpx; }
.group-action { min-height: 72rpx; display: flex; align-items: center; justify-content: center; border: 1rpx solid #cfe4de; border-radius: 8rpx; color: #0f766e; background: #f3faf8; font-size: 25rpx; font-weight: 700; }
.group-action.primary { border-color: #0f766e; color: #fff; background: #0f766e; }
.code { text-align: center; }
.code-qr,
.code-qr-matrix { width: 360rpx; height: 360rpx; margin: 18rpx auto 0; border-radius: 8rpx; border: 1px solid #d9ebe6; background: #fff; overflow: hidden; box-sizing: border-box; }
.code-qr { display: block; }
.code-qr-matrix { display: flex; flex-direction: column; }
.code-qr-row { display: flex; width: 100%; flex: 1 1 0; min-height: 0; }
.code-qr-cell { flex: 1 1 0; min-width: 0; background: #ffffff; }
.code-qr-cell.dark { background: #111827; }
.code-text { margin-top: 16rpx; font-size: 34rpx; word-break: break-all; }
.code-tip { margin-top: 14rpx; color: var(--muted-color, #667085); font-size: 24rpx; line-height: 1.5; }
.copy-code { display: inline-flex; margin-top: 18rpx; }
.button { margin-top: 18rpx; }
.share-button { border-color: rgba(15,118,110,.2); color: #0f766e; background: #eaf7f3; }
.danger-button { color: #dc2626; background: #fef2f2; }
.pay-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 18rpx; }
.pay-actions .button { margin-top: 0; }
.button.disabled { opacity: 0.55; pointer-events: none; }
.charity-refund-box { margin-top: 18rpx; padding: 18rpx; border-radius: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; }
.charity-refund-title { color: #14532d; font-size: 26rpx; font-weight: 900; }
.charity-refund-copy { margin-top: 8rpx; color: #166534; font-size: 24rpx; line-height: 1.5; }
.charity-refund-box .button { margin-top: 16rpx; }
.group-dialog-mask { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 36rpx; background: rgba(15, 23, 42, 0.58); }
.group-dialog { width: min(620rpx, 100%); padding: 34rpx 28rpx 28rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); text-align: center; box-shadow: 0 28rpx 80rpx rgba(15, 23, 42, 0.25); }
.dialog-title { color: var(--text-color, #111827); font-size: 34rpx; font-weight: 900; }
.dialog-qr { display: block; width: 420rpx; height: 420rpx; max-width: 100%; margin: 26rpx auto 0; border-radius: var(--card-radius, 8px); border: 1px solid #e5e7eb; background: var(--card-bg, #fff); }
.dialog-copy { margin-top: 18rpx; color: var(--muted-color, #667085); font-size: 26rpx; line-height: 1.6; }
.dialog-action { min-height: 72rpx; display: flex; align-items: center; justify-content: center; margin: 20rpx 0 14rpx; border-radius: 8rpx; background: #edf7f5; color: #0f766e; font-size: 25rpx; font-weight: 700; }
@media (min-width: 900px) { .registration { max-width:760px; margin:0 auto; } }
.registration{padding:24rpx 28rpx calc(160rpx + env(safe-area-inset-bottom));background:var(--app-page-bg)}
.registration-hero{border-radius:16rpx;box-shadow:none;background:#16252d}
.registration .card{border-color:var(--app-border);border-radius:16rpx;box-shadow:none}
.status-card{border-left:0;border-top:6rpx solid #0f766e}
.status-meta view,.notice,.step{border-radius:12rpx}
.status-action{border-radius:14rpx;background:#16252d;color:#fff}
.activity-space-entry{border-color:#cfe5d8;border-radius:16rpx;background:#eaf7f1}
.line.strong text:last-child{color:var(--app-price)}
.pay-actions .button{border-radius:14rpx}.pay-actions .button:not(.secondary){background:#16252d;color:#fff}
.group-action,.mini-button,.dialog-action{border-radius:12rpx}
</style>
