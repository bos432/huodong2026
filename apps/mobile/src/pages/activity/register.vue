<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { FieldType } from "@activity/shared";
import { ensureUser, fetchMyProfile, getCurrentTenantCode, request, getCurrentRouteWithQuery, uploadRegistrationAttachment, withTenantCode } from "../../api";
import { filterIntrinsicHeaderDecorationSections, usePageDecoration } from "../../decoration";
import { reviewSafeData, reviewSafeText } from "../../review-safe-text";
import TenantContextBadge from "../../components/TenantContextBadge.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import WechatPhoneBindSheet from "../../components/WechatPhoneBindSheet.vue";
import { createTenantLoadGuard } from "../../tenant-load-guard";

const activity = ref<any>();
const operationSetting = ref<any>();
const loading = ref(true);
const loadError = ref("");
const submitting = ref(false);
const confirming = ref(false);
const quoting = ref(false);
const quoteError = ref("");
const selectedTicketTypeId = ref<number | undefined>();
const couponCode = ref("");
const availableCoupons = ref<any[]>([]);
const couponLoadingId = ref<number>();
const pointsToUse = ref(0);
const quote = ref<any>();
const userId = ref<number>();
type PayMethod = "wechat" | "alipay" | "balance" | "offline";
const paymentMethod = ref<PayMethod>("offline");
const channelCode = ref("");
const source = ref("");
const inviteCode = ref("");
const attemptedSubmit = ref(false);
const missingFieldId = ref<number>();
const phoneBindVisible = ref(false);
const pendingPhoneAction = ref<"" | "submit">("");
const values = reactive<Record<number, any>>({});
const privacyAccepted = ref(false);
const companions = ref<Array<{ name: string; phone: string; idCard: string }>>([]);
const uploadingFieldId = ref<number>();
const pageLoadGuard = createTenantLoadGuard();
const quoteLoadGuard = createTenantLoadGuard();
const couponLoadGuard = createTenantLoadGuard();
const { tenant, contentSections, innerPageConfig, innerPageLayout, loadDecoration } = usePageDecoration("activity_register", "/pages/activity/register");
const bodyDecorationSections = computed(() => filterIntrinsicHeaderDecorationSections(contentSections.value));

const ticketOptions = computed(() => activity.value?.ticketTypes || []);
const hasTicketTypes = computed(() => ticketOptions.value.length > 0);
const availableTicketOptions = computed(() => ticketOptions.value.filter((ticket: any) => ticketCanSelect(ticket)));
const ticketSelectionUnavailable = computed(() => hasTicketTypes.value && activity.value?.remainingSeats > 0 && !availableTicketOptions.value.length);
const selectedTicket = computed(() => ticketOptions.value.find((ticket: any) => ticket.id === selectedTicketTypeId.value));
const currentPayable = computed(() => quote.value?.payableAmount ?? Number(activity.value?.price || 0).toFixed(2));
const payableNumber = computed(() => Number(currentPayable.value || 0));
const memberLoginRequired = computed(() => Boolean(activity.value?.memberAccess?.loginRequired));
const memberBlocked = computed(() => activity.value?.memberAccess && !activity.value.memberAccess.eligible && !memberLoginRequired.value);
const registrationPaused = computed(() => {
  const value = operationSetting.value?.registrationEnabled;
  return value === false || value === 0 || value === "0";
});
const registrationPausedMessage = computed(() => operationSetting.value?.registrationDisabledMessage || "报名通道暂时关闭，请稍后再试或联系主办方。");
const paymentHint = computed(() => {
  if (!activity.value) return "";
  if (registrationPaused.value) return registrationPausedMessage.value;
  if (memberBlocked.value) return activity.value.memberAccess.message;
  if (activity.value.remainingSeats <= 0) return "当前名额已满，提交后将进入候补名单";
  if (ticketSelectionUnavailable.value) return "当前没有可报名票种，请留意开售时间或联系主办方。";
  return payableNumber.value > 0 ? "提交后请选择支付方式；线下收款需后台确认后生效。" : activity.value.requireReview ? "提交后会进入主办方审核，审核结果会显示在我的报名里。" : "提交后即可获得报名成功状态。";
});
const defaultPaymentMethods = { free: true, wechat: false, alipay: false, balance: true, offline: true };
const paymentMethods = computed<Record<string, boolean>>(() => ({ ...defaultPaymentMethods, ...(operationSetting.value?.paymentMethods || {}) }));
const availablePaymentMethods = computed(() => {
  const rows = [
    { value: "wechat" as PayMethod, name: "微信支付", desc: "H5 / 小程序" },
    { value: "alipay" as PayMethod, name: "支付宝", desc: "支付宝付款" },
    { value: "balance" as PayMethod, name: "余额支付", desc: "后台充值余额" },
    { value: "offline" as PayMethod, name: "线下收款", desc: "转账后人工确认" }
  ];
  return rows.filter((item) => paymentMethods.value[item.value]);
});

const showMemberAccess = computed(() => Boolean(activity.value?.minMemberLevel || activity.value?.memberAccess?.priorityMemberLevel || activity.value?.memberAccess?.requiredLevel));
const requiredFields = computed(() => (activity.value?.fields || []).filter((field: any) => field.required));
const completedRequiredCount = computed(() => requiredFields.value.filter((field: any) => isFilled(values[field.id])).length);
const requiredTotal = computed(() => requiredFields.value.length);
const formProgressText = computed(() => requiredTotal.value ? `必填 ${completedRequiredCount.value}/${requiredTotal.value}` : "无必填项");
const selectedTicketName = computed(() => selectedTicket.value?.name || "标准报名");
const payableText = computed(() => payableNumber.value > 0 ? `￥${currentPayable.value}` : "免费");
const submitButtonText = computed(() => {
  if (submitting.value) return "提交中...";
  if (registrationPaused.value) return "报名暂停";
  if (memberLoginRequired.value) return "登录后报名";
  if (memberBlocked.value) return "会员等级不足";
  if (activity.value?.remainingSeats <= 0) return "加入候补";
  if (ticketSelectionUnavailable.value) return "票种不可报名";
  return "确认提交";
});
const seatsText = computed(() => {
  if (!activity.value) return "";
  if (activity.value.remainingSeats <= 0) return "名额已满，可先加入候补";
  return `剩余 ${activity.value.remainingSeats} 个名额`;
});
const hasGroupQrCode = computed(() => Boolean(activity.value?.hasGroupQrCode));

function isFilled(value: any) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function fieldPlaceholder(field: any) {
  if (field.type === FieldType.Phone) return "用于接收报名通知";
  if (field.type === FieldType.IdCard) return "请填写证件号码";
  if (field.type === FieldType.Remark) return "如有特殊需求，可在这里说明";
  if (field.type === FieldType.Email) return "name@example.com";
  if (field.type === FieldType.Number) return "请输入数字";
  if (field.type === FieldType.Address) return "请输入详细地址";
  return `请填写${field.label}`;
}

function ticketCanSelect(ticket: any) {
  return !ticket.saleStatus || ticket.saleStatus === "available";
}

function ticketStatusText(ticket: any) {
  if (ticket.saleStatus === "not_started") return "未开售";
  if (ticket.saleStatus === "ended") return "已停售";
  if (ticket.saleStatus === "sold_out") return "已售罄";
  if (ticket.remainingSeats !== null && ticket.remainingSeats !== undefined) return `剩余 ${ticket.remainingSeats} 张`;
  return ticket.capacity ? `限 ${ticket.capacity} 人` : "不限容量";
}

function fieldOptions(field: any) {
  const options = Array.isArray(field?.options) ? field.options : [];
  return options
    .map((option: any, index: number) => {
      const label = typeof option === "string" ? option : String(option?.label || option?.value || "").trim();
      const value = typeof option === "string" ? option : String(option?.value || label || `option_${index + 1}`).trim();
      return { label: label || value || `选项 ${index + 1}`, value: value || label || `option_${index + 1}` };
    })
    .filter((option: any) => option.label);
}

function optionKey(option: any, index: number) {
  return option.value || option.label || `option_${index}`;
}

function optionAnswerValue(option: any) {
  return option.label || option.value || "";
}

function setMulti(fieldId: number, option: any) {
  const value = optionAnswerValue(option);
  if (!value) return;
  const current = values[fieldId] || [];
  values[fieldId] = current.includes(value) ? current.filter((item: string) => item !== value) : [...current, value];
}

function validate() {
  missingFieldId.value = undefined;
  for (const field of activity.value.fields) {
    const value = values[field.id];
    if (field.required && !isFilled(value)) {
      missingFieldId.value = field.id;
      return `请填写${field.label}`;
    }
  }
  if (activity.value?.eligibilityRules?.requirePrivacyConsent && !privacyAccepted.value) return "请阅读并同意隐私授权";
  if (companions.value.some((item) => !item.name.trim())) return "请填写同行人姓名";
  return "";
}

function addCompanion() {
  const max = Number(activity.value?.eligibilityRules?.maxCompanions || 0);
  if (companions.value.length >= max) return uni.showToast({ title: `最多添加 ${max} 位同行人`, icon: "none" });
  companions.value.push({ name: "", phone: "", idCard: "" });
}

function removeCompanion(index: number) { companions.value.splice(index, 1); }

function chooseAttachment(field: any) {
  if (uploadingFieldId.value || submitting.value) return;
  uploadingFieldId.value = field.id;
  uni.chooseMessageFile({
    count: 1,
    type: "file",
    extension: ["jpg", "jpeg", "png", "webp", "pdf"],
    success: async (result: any) => {
      const file = result.tempFiles?.[0];
      if (!file) return;
      try {
        const uploaded = await uploadRegistrationAttachment(file.path);
        values[field.id] = uploaded.url;
        uni.showToast({ title: "附件已上传", icon: "success" });
      } catch (error: any) {
        uni.showToast({ title: error.message || "附件上传失败", icon: "none" });
      } finally {
        uploadingFieldId.value = undefined;
      }
    },
    fail: () => { if (uploadingFieldId.value === field.id) uploadingFieldId.value = undefined; }
  });
}

function submit() {
  if (submitting.value || confirming.value) return;
  attemptedSubmit.value = true;
  if (registrationPaused.value) {
    uni.showToast({ title: registrationPausedMessage.value, icon: "none" });
    return;
  }
  if (memberLoginRequired.value) {
    goLogin();
    return;
  }
  if (memberBlocked.value) {
    uni.showToast({ title: activity.value.memberAccess.message, icon: "none" });
    return;
  }
  if (ticketSelectionUnavailable.value) {
    uni.showToast({ title: "当前没有可报名票种", icon: "none" });
    return;
  }
  const error = validate();
  if (error) {
    uni.showToast({ title: error, icon: "none" });
    if (missingFieldId.value) uni.pageScrollTo({ selector: `.field-${missingFieldId.value}`, duration: 240 });
    return;
  }
  if (payableNumber.value > 0 && !availablePaymentMethods.value.length) {
    uni.showToast({ title: "暂无可用支付方式，请联系主办方", icon: "none" });
    return;
  }
  const content = `${selectedTicketName.value}，应付 ${payableText.value}。${paymentHint.value}`;
  confirming.value = true;
  uni.showModal({
    title: activity.value.remainingSeats <= 0 ? "确认加入候补" : "确认提交报名",
    content,
    confirmText: activity.value.remainingSeats <= 0 ? "加入候补" : "确认提交",
    success: (res) => {
      confirming.value = false;
      if (res.confirm) void doSubmit();
    },
    fail: () => { confirming.value = false; }
  });
}

function goLogin() {
  const redirect = encodeURIComponent(getCurrentRouteWithQuery());
  uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${redirect}`) });
}

async function doSubmit() {
  if (submitting.value) return;
  const tenantCode = getCurrentTenantCode();
  const activityId = Number(activity.value?.id || 0);
  submitting.value = true;
  try {
    if (!(await requirePhoneBound("submit"))) return;
    const answers = activity.value.fields.map((field: any) => ({ fieldId: field.id, label: field.label, type: field.type, value: values[field.id] ?? (field.type === FieldType.MultipleChoice ? [] : "") }));
    const result = await request<any>(`/public/activities/${activity.value.id}/register`, {
      method: "POST",
      data: {
        answers,
        ticketTypeId: selectedTicketTypeId.value,
        couponCode: couponCode.value.trim() || undefined,
        pointsToUse: pointsToUse.value || undefined,
        paymentMethod: payableNumber.value > 0 ? paymentMethod.value : undefined,
        channelCode: channelCode.value || undefined,
        source: source.value || undefined
        , inviteCode: inviteCode.value || undefined
        , privacyAccepted: privacyAccepted.value,
        companions: companions.value.map((item) => ({ name: item.name.trim(), phone: item.phone.trim() || undefined, idCard: item.idCard.trim() || undefined }))
      }
    });
    if (getCurrentTenantCode() !== tenantCode || Number(activity.value?.id || 0) !== activityId) return;
    if (result.waitlisted) {
      uni.showModal({ title: "已进入候补", content: "当前活动名额已满，你已进入候补名单。若有名额释放，主办方可在后台为你补位。", showCancel: false, success: () => uni.navigateBack() });
      return;
    }
    uni.showToast({ title: "报名已提交", icon: "success" });
    uni.redirectTo({ url: withTenantCode(`/pages/user/registration?id=${result.registration.id}`) });
  } catch (error: any) {
    uni.showModal({ title: "提交失败", content: reviewSafeText(error.message || "请稍后再试，或联系主办方协助处理。"), showCancel: false, confirmText: "知道了" });
  } finally {
    if (getCurrentTenantCode() === tenantCode) submitting.value = false;
  }
}

async function requirePhoneBound(action: "submit") {
  userId.value = await ensureUser();
  const profile = await fetchMyProfile();
  if (profile?.phone) return true;
  pendingPhoneAction.value = action;
  phoneBindVisible.value = true;
  return false;
}

function closePhoneBindPanel() {
  phoneBindVisible.value = false;
  pendingPhoneAction.value = "";
}

function handlePhoneBound() {
  const action = pendingPhoneAction.value;
  phoneBindVisible.value = false;
  pendingPhoneAction.value = "";
  if (action === "submit") doSubmit();
}

async function refreshQuote(showError = false) {
  if (!activity.value) return;
  if (hasTicketTypes.value && !selectedTicketTypeId.value) {
    quote.value = undefined;
    quoteError.value = "当前没有可报名票种";
    return;
  }
  const token = quoteLoadGuard.begin();
  const activityId = Number(activity.value.id);
  quoting.value = true;
  quoteError.value = "";
  try {
    userId.value ||= await ensureUser();
    const result = await request(`/public/activities/${activityId}/quote`, { method: "POST", data: { ticketTypeId: selectedTicketTypeId.value, couponCode: couponCode.value.trim() || undefined, pointsToUse: pointsToUse.value || undefined } });
    if (!quoteLoadGuard.isCurrent(token) || Number(activity.value?.id) !== activityId) return;
    quote.value = reviewSafeData(result);
  } catch (error: any) {
    if (!quoteLoadGuard.isCurrent(token)) return;
    quoteError.value = reviewSafeText(error.message || "优惠码不可用");
    quote.value = undefined;
    if (showError) uni.showToast({ title: quoteError.value, icon: "none" });
  } finally {
    if (quoteLoadGuard.isCurrent(token)) quoting.value = false;
  }
}

function chooseTicket(id?: number) {
  const ticket = ticketOptions.value.find((item: any) => item.id === id);
  if (ticket && !ticketCanSelect(ticket)) {
    uni.showToast({ title: ticketStatusText(ticket), icon: "none" });
    return;
  }
  selectedTicketTypeId.value = id;
  refreshQuote();
}

function applyCoupon() {
  refreshQuote(true);
}

async function loadAvailableCoupons() {
  if (!activity.value?.id) return;
  const token = couponLoadGuard.begin();
  const activityId = Number(activity.value.id);
  try {
    const rows = reviewSafeData(await request(`/public/coupons/available?activityId=${activityId}`)) as any[];
    if (couponLoadGuard.isCurrent(token) && Number(activity.value?.id) === activityId) availableCoupons.value = rows;
  }
  catch { if (couponLoadGuard.isCurrent(token)) availableCoupons.value = []; }
}

async function selectOrClaimCoupon(item: any) {
  if (couponLoadingId.value) return;
  couponLoadingId.value = item.id;
  try {
    if (Number(item.remainingUses || 0) <= 0) {
      await request(`/public/coupons/${item.id}/claim`, { method: "POST" });
      await loadAvailableCoupons();
    }
    couponCode.value = item.code;
    await refreshQuote(true);
    uni.showToast({ title: "已领取并应用", icon: "success" });
  } catch (error: any) {
    uni.showToast({ title: reviewSafeText(error.message || "优惠券操作失败"), icon: "none" });
  } finally { couponLoadingId.value = undefined; }
}

function applyPoints() {
  const available = Number(quote.value?.availablePoints || 0);
  pointsToUse.value = Math.max(Math.min(Number(pointsToUse.value || 0), available), 0);
  refreshQuote(true);
}

async function loadPage() {
  const token = pageLoadGuard.begin();
  loading.value = true;
  loadError.value = "";
  try {
    const pages = getCurrentPages();
    const options = (pages[pages.length - 1] as any).options || {};
    const id = Number(options.id);
    channelCode.value = options.channelCode || "";
    source.value = options.source || "";
    inviteCode.value = options.inviteCode || "";
    userId.value = await ensureUser();
    const query = [
      channelCode.value ? `channelCode=${encodeURIComponent(channelCode.value)}` : "",
      source.value ? `source=${encodeURIComponent(source.value)}` : "",
      inviteCode.value ? `inviteCode=${encodeURIComponent(inviteCode.value)}` : ""
    ].filter(Boolean).join("&");
    const [detail, setting] = await Promise.all([
      request(`/public/activities/${id}${query ? `?${query}` : ""}`),
      request("/public/settings/operation")
    ]);
    if (!pageLoadGuard.isCurrent(token)) return;
    activity.value = reviewSafeData(detail);
    operationSetting.value = reviewSafeData(setting);
    if (payableNumber.value > 0 && !paymentMethods.value[paymentMethod.value]) {
      paymentMethod.value = availablePaymentMethods.value[0]?.value || "offline";
    }
    selectedTicketTypeId.value = availableTicketOptions.value[0]?.id;
    await Promise.all([refreshQuote(), loadAvailableCoupons()]);
  } catch (error: any) {
    if (!pageLoadGuard.isCurrent(token)) return;
    loadError.value = reviewSafeText(error?.message || "报名页面加载失败，请重新进入活动后再试。");
    uni.showToast({ title: loadError.value, icon: "none" });
  } finally {
    if (pageLoadGuard.isCurrent(token)) loading.value = false;
  }
}

onMounted(() => {
  loadPage();
  loadDecoration();
});

watch(couponCode, () => {
  if (!couponCode.value.trim() && activity.value) refreshQuote();
});
</script>

<template>
  <view class="container register">
    <view v-if="loading" class="card subtle">加载中...</view>
      <view v-else-if="loadError" class="card" role="alert" aria-live="assertive">
        <view class="title">报名页面加载失败</view>
        <view class="subtle">{{ loadError }}</view>
        <view class="error-actions">
          <view class="button secondary" role="button" tabindex="0" aria-label="重新加载报名页面" @click="loadPage" @keyup.enter="loadPage" @keyup.space.prevent="loadPage">重新加载</view>
          <view class="button secondary" role="button" tabindex="0" aria-label="去登录" @click="goLogin" @keyup.enter="goLogin" @keyup.space.prevent="goLogin">去登录</view>
        </view>
    </view>
    <template v-else-if="activity">
      <TenantContextBadge :tenant="tenant" label="当前城市" hint="报名归属" />

      <view class="register-hero">
        <image v-if="activity.coverUrl" class="hero-image" :src="activity.coverUrl" mode="aspectFill" />
        <view v-else class="hero-image hero-fallback">报名</view>
        <view class="hero-mask"></view>
        <view class="hero-head">
          <text class="hero-kicker">慢π · 报名确认</text>
          <text class="hero-status">{{ seatsText }}</text>
        </view>
        <view class="hero-bottom">
          <view class="page-head" :style="{ background: String(innerPageLayout.headerBackgroundColor || 'transparent') }">
            <view class="page-head-title">{{ activity.title }}</view>
            <view class="page-head-copy">{{ innerPageConfig.subtitle || "确认票种、优惠和报名信息，提交后可在我的活动查看进度。" }}</view>
          </view>
          <view class="hero-summary">
            <view><text>票种</text><text>{{ selectedTicketName }}</text></view>
            <view><text>费用</text><text>{{ payableText }}</text></view>
            <view><text>进度</text><text>{{ formProgressText }}</text></view>
          </view>
        </view>
      </view>

      <PageDecorationBlocks :sections="bodyDecorationSections" />

      <view class="card intro-card">
        <view class="section-kicker">提交前确认</view>
        <view class="title small">报名说明</view>
        <view class="subtle hint">{{ paymentHint }}</view>
        <view v-if="hasGroupQrCode" class="group-flow">
          <view class="member-title">报名成功后可加入活动群</view>
          <view class="subtle">群二维码不会在公开报名流程中展示；提交后进入报名详情页，可查看入群入口和活动通知。</view>
        </view>
        <view v-if="registrationPaused" class="operation-notice">
          <view class="member-title">报名通道暂停</view>
          <view class="subtle">{{ registrationPausedMessage }}</view>
        </view>
        <view v-if="showMemberAccess" class="member-access" :class="{ blocked: memberBlocked }">
          <view class="member-title">{{ activity.memberAccess?.priorityActive ? "会员优先报名中" : "会员报名规则" }}</view>
          <view v-if="activity.memberAccess?.priorityMemberLevel" class="subtle">优先等级：{{ activity.memberAccess.priorityMemberLevel.name }}，截止 {{ activity.memberAccess.priorityRegistrationEndsAt?.replace("T", " ").slice(0, 16) }}</view>
          <view v-if="activity.minMemberLevel" class="subtle">会员门槛：{{ activity.minMemberLevel.name }}及以上</view>
          <view class="subtle">{{ activity.memberAccess?.currentLevel ? `当前等级：${activity.memberAccess.currentLevel.name}` : "当前账号暂无会员等级" }}</view>
          <view class="subtle">{{ activity.memberAccess?.message }}</view>
        </view>
      </view>

      <view class="card price-card">
        <view class="section-heading">
          <view>
            <view class="label">1. 选择票种</view>
            <view class="subtle">先确认名额和价格，优惠会自动计入下方明细。</view>
          </view>
        </view>
        <view v-if="hasTicketTypes" class="ticket-list">
          <view v-for="ticket in ticketOptions" :key="ticket.id" class="ticket" role="radio" :tabindex="ticketCanSelect(ticket) ? 0 : -1" :aria-checked="selectedTicketTypeId === ticket.id" :aria-disabled="!ticketCanSelect(ticket)" :aria-label="`${ticketCanSelect(ticket) ? '选择' : ''}${ticket.name}票，${ticketStatusText(ticket)}`" :class="{ active: selectedTicketTypeId === ticket.id, disabled: !ticketCanSelect(ticket) }" @click="chooseTicket(ticket.id)" @keyup.enter="chooseTicket(ticket.id)" @keyup.space.prevent="chooseTicket(ticket.id)">
            <view>
              <view class="ticket-name">{{ ticket.name }}</view>
              <view class="subtle">{{ ticketStatusText(ticket) }}</view>
            </view>
            <view class="ticket-price">￥{{ Number(ticket.price).toFixed(2) }}</view>
          </view>
        </view>
        <view v-if="ticketSelectionUnavailable" class="notice muted">当前票种均不可报名，请留意开售时间或联系主办方。</view>
        <view v-else class="ticket active">
          <view><view class="ticket-name">标准报名</view><view class="subtle">活动基础价格</view></view>
          <view class="ticket-price">{{ Number(activity.price) > 0 ? `￥${Number(activity.price).toFixed(2)}` : "免费" }}</view>
        </view>

        <view class="discount-title">优惠抵扣</view>
        <view class="coupon-row">
          <input v-model="couponCode" class="input coupon-input" maxlength="64" cursor-spacing="24" confirm-type="done" aria-label="优惠码" placeholder="输入优惠码" @confirm="applyCoupon" />
          <view class="mini-button" role="button" tabindex="0" :aria-disabled="quoting" :class="{ disabled: quoting }" @click="!quoting && applyCoupon()" @keyup.enter="!quoting && applyCoupon()" @keyup.space.prevent="!quoting && applyCoupon()">{{ quoting ? "计算中" : "使用" }}</view>
        </view>
        <view v-if="quoteError" class="error">{{ quoteError }}</view>
        <view class="points-row">
          <view class="subtle">可用积分：{{ quote?.availablePoints || 0 }}，100 积分抵 1 元</view>
          <view class="coupon-row">
            <input v-model.number="pointsToUse" class="input coupon-input" type="number" maxlength="9" cursor-spacing="24" confirm-type="done" aria-label="抵扣积分" placeholder="输入抵扣积分" @confirm="applyPoints" />
            <view class="mini-button" role="button" tabindex="0" :aria-disabled="quoting" :class="{ disabled: quoting }" @click="!quoting && applyPoints()" @keyup.enter="!quoting && applyPoints()" @keyup.space.prevent="!quoting && applyPoints()">{{ quoting ? "计算中" : "抵扣" }}</view>
          </view>
        </view>
        <view class="summary">
          <view><text>原价</text><text>￥{{ quote?.originalAmount || Number(activity.price).toFixed(2) }}</text></view>
          <view v-if="quote?.memberLevel"><text>会员</text><text>{{ quote.memberLevel.name }} -￥{{ quote.memberDiscountAmount || "0.00" }}</text></view>
          <view><text>优惠码</text><text>-￥{{ quote?.couponDiscountAmount || "0.00" }}</text></view>
          <view><text>积分</text><text>{{ quote?.pointsUsed || 0 }} 分 -￥{{ quote?.pointsDiscountAmount || "0.00" }}</text></view>
          <view><text>总优惠</text><text>-￥{{ quote?.discountAmount || "0.00" }}</text></view>
          <view class="payable"><text>应付</text><text>{{ Number(currentPayable) > 0 ? `￥${currentPayable}` : "免费" }}</text></view>
        </view>
        <view v-if="payableNumber > 0" class="payment-methods">
          <view class="discount-title">支付方式</view>
          <view class="method-grid">
            <view v-for="method in availablePaymentMethods" :key="method.value" class="method" role="radio" tabindex="0" :aria-checked="paymentMethod === method.value" :aria-label="`选择${method.name}支付`" :class="{ active: paymentMethod === method.value }" @click="paymentMethod = method.value" @keyup.enter="paymentMethod = method.value" @keyup.space.prevent="paymentMethod = method.value">
              <view class="method-name">{{ method.name }}</view>
              <view class="subtle">{{ method.desc }}</view>
            </view>
          </view>
          <view v-if="!availablePaymentMethods.length" class="notice muted">暂无可用支付方式，请联系主办方。</view>
        </view>
      </view>

      <view class="card form-card">
        <view class="section-heading form-heading">
          <view>
            <view class="label">2. 填写报名信息</view>
            <view class="subtle">请核对信息准确，主办方会按这些内容联系你。</view>
          </view>
          <view class="progress-pill">{{ formProgressText }}</view>
        </view>
        <view v-for="field in activity.fields" :key="field.id" class="field" :class="[`field-${field.id}`, { missing: attemptedSubmit && missingFieldId === field.id }]">
          <view class="label field-label">{{ field.label }}<text v-if="field.required"> *</text><text v-else class="optional">选填</text></view>
          <input v-if="[FieldType.Text, FieldType.Phone, FieldType.IdCard, FieldType.Email, FieldType.Number, FieldType.Address].includes(field.type)" v-model="values[field.id]" class="input" maxlength="200" cursor-spacing="24" :aria-label="field.label" :placeholder="fieldPlaceholder(field)" :type="[FieldType.Phone, FieldType.Number].includes(field.type) ? 'number' : 'text'" />
          <textarea v-else-if="field.type === FieldType.Remark" v-model="values[field.id]" class="textarea" maxlength="2000" cursor-spacing="24" :aria-label="field.label" :placeholder="fieldPlaceholder(field)" />
          <picker v-else-if="field.type === FieldType.Date" mode="date" @change="values[field.id] = $event.detail.value"><view class="input picker-value">{{ values[field.id] || '请选择日期' }}</view></picker>
          <view v-else-if="field.type === FieldType.DateTime" class="datetime-row">
            <picker mode="date" @change="values[field.id] = `${$event.detail.value} ${(values[field.id] || '').split(' ')[1] || '09:00'}`"><view class="input picker-value">{{ (values[field.id] || '').split(' ')[0] || '选择日期' }}</view></picker>
            <picker mode="time" @change="values[field.id] = `${(values[field.id] || '').split(' ')[0] || new Date().toISOString().slice(0, 10)} ${$event.detail.value}`"><view class="input picker-value">{{ (values[field.id] || '').split(' ')[1] || '选择时间' }}</view></picker>
          </view>
          <picker v-else-if="field.type === FieldType.Region" mode="region" @change="values[field.id] = $event.detail.value.join('/')"><view class="input picker-value">{{ values[field.id] || '请选择省市区' }}</view></picker>
          <view v-else-if="field.type === FieldType.Attachment" class="attachment-row"><view class="mini-button" role="button" tabindex="0" :aria-label="values[field.id] ? '重新上传附件' : '选择附件'" @click="chooseAttachment(field)" @keyup.enter="chooseAttachment(field)" @keyup.space.prevent="chooseAttachment(field)">{{ uploadingFieldId === field.id ? '上传中...' : (values[field.id] ? '重新上传' : '选择附件') }}</view><text v-if="values[field.id]" class="attachment-done">已上传</text></view>
          <radio-group v-else-if="field.type === FieldType.SingleChoice" @change="values[field.id] = $event.detail.value">
            <label v-for="(opt, optIndex) in fieldOptions(field)" :key="optionKey(opt, optIndex)" class="choice">
              <radio :value="optionAnswerValue(opt)" />
              <text class="choice-text">{{ opt.label }}</text>
            </label>
          </radio-group>
          <view v-else-if="field.type === FieldType.MultipleChoice" class="choices">
            <label v-for="(opt, optIndex) in fieldOptions(field)" :key="optionKey(opt, optIndex)" class="choice">
              <checkbox :checked="(values[field.id] || []).includes(optionAnswerValue(opt))" @click="setMulti(field.id, opt)" />
              <text class="choice-text">{{ opt.label }}</text>
            </label>
          </view>
        </view>
        <view v-if="availableCoupons.length" class="available-coupons">
          <view v-for="item in availableCoupons" :key="item.id" class="available-coupon" :class="{ selected: couponCode === item.code }" @click="selectOrClaimCoupon(item)">
            <view><view class="coupon-name">{{ item.name }}</view><view class="subtle">满 ￥{{ Number(item.minAmount || 0).toFixed(2) }} {{ item.discountType === 'percent' ? `${Number(item.discountValue)} 折` : `减 ￥${Number(item.discountValue).toFixed(2)}` }}</view></view>
            <view class="coupon-action">{{ couponLoadingId === item.id ? "处理中" : Number(item.remainingUses || 0) > 0 ? `可用 ${item.remainingUses} 次` : "领取" }}</view>
          </view>
        </view>
        <view v-if="activity.eligibilityRules?.allowCompanions" class="companions-block">
          <view class="section-heading"><view><view class="label">同行人</view><view class="subtle">最多 {{ activity.eligibilityRules.maxCompanions || 0 }} 人</view></view><view class="mini-button" @click="addCompanion">添加</view></view>
          <view v-for="(companion, index) in companions" :key="index" class="companion-row">
            <input v-model="companion.name" class="input" placeholder="姓名（必填）" />
            <input v-model="companion.phone" class="input" type="number" placeholder="手机号" />
            <input v-model="companion.idCard" class="input" placeholder="证件号" />
            <view class="remove-link" @click="removeCompanion(index)">删除</view>
          </view>
        </view>
        <label v-if="activity.eligibilityRules?.requirePrivacyConsent" class="privacy-row">
          <checkbox :checked="privacyAccepted" @change="privacyAccepted = !privacyAccepted" />
          <text>我已阅读并同意隐私政策，授权主办方仅用于本次报名与活动服务。</text>
        </label>
      </view>
      <view class="submit-bar" :style="{ background: String(innerPageLayout.actionBarBackgroundColor || 'var(--card-bg, #fff)') }">
        <view class="submit-summary">
          <text>{{ formProgressText }}</text>
          <text>{{ payableText }}</text>
        </view>
        <view class="button" role="button" tabindex="0" :aria-disabled="submitting || confirming || memberBlocked || registrationPaused || ticketSelectionUnavailable" :aria-busy="submitting || confirming" :aria-label="submitButtonText" :class="{ secondary: submitting || confirming || memberBlocked || registrationPaused || ticketSelectionUnavailable }" @click="submit" @keyup.enter="submit" @keyup.space.prevent="submit">{{ confirming ? "等待确认..." : submitButtonText }}</view>
      </view>
    </template>
    <WechatPhoneBindSheet
      :visible="phoneBindVisible"
      title="报名前绑定手机号"
      message="活动报名需要手机号，授权后将继续提交当前报名。"
      close-text="暂不报名"
      @close="closePhoneBindPanel"
      @bound="handlePhoneBound"
    />
  </view>
</template>

<style scoped>
.register { width:100%; max-width:760px; min-height:100vh; margin:0 auto; box-sizing:border-box; padding:calc(24rpx + env(safe-area-inset-top)) 24rpx calc(168rpx + env(safe-area-inset-bottom)); overflow-wrap:anywhere; }
.companions-block { margin-top: 24rpx; padding-top: 22rpx; border-top: 1px solid var(--border-color, #eee); }
.companion-row { display: grid; grid-template-columns: 1fr; gap: 12rpx; padding: 18rpx 0; border-bottom: 1px dashed var(--border-color, #eee); }
.remove-link { color: #b42318; font-size: 24rpx; }
.privacy-row { display: flex; gap: 12rpx; align-items: flex-start; margin-top: 24rpx; font-size: 24rpx; line-height: 1.6; color: var(--muted-color, #667085); }
.datetime-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.attachment-row { display: flex; align-items: center; gap: 16rpx; min-height: 72rpx; }
.attachment-done { color: #067647; font-size: 24rpx; }
.error-actions { margin-top: 18rpx; }
.register-hero {
  position: relative;
  overflow: hidden;
  min-height: 500rpx;
  margin-bottom: 24rpx;
  border-radius: 14rpx;
  background: #0f766e;
  box-shadow: 0 16rpx 36rpx rgba(15,118,110,.16);
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
  background: linear-gradient(180deg, rgba(7,36,32,.18), rgba(7,36,32,.8));
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
  max-width: 290rpx;
  min-height: 50rpx;
  padding: 0 16rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  background: rgba(255,255,255,.16);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  background: rgba(255,255,255,.16);
  border: 1px solid rgba(255,255,255,.18);
}
.hero-summary text:first-child {
  color: rgba(255,255,255,.68);
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
.intro-card { display: grid; gap: 16rpx; }
.section-kicker {
  color: #0f766e;
  font-size: 24rpx;
  font-weight: 800;
}
.small { font-size: 30rpx; }
.hint { margin-top: 0; line-height: 1.7; }
.member-access { margin-top: 2rpx; padding: 20rpx; border-radius: 10rpx; background: #eaf7f3; border: 1px solid rgba(15,118,110,.14); }
.member-access.blocked { background: rgba(255, 159, 0, 0.08); border-color: rgba(255, 159, 0, 0.18); }
.operation-notice { margin-top: 2rpx; padding: 20rpx; border-radius: 10rpx; background: #fff7ed; border: 1px solid #fed7aa; }
.group-flow { padding: 20rpx; border-radius: 10rpx; background: #eef8f5; border: 1px solid rgba(15, 118, 110, 0.16); }
.group-flow .member-title { color: #0f766e; }
.member-title { color: #173f3a; font-weight: 700; margin-bottom: 8rpx; }
.price-card { display: grid; gap: 18rpx; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }
.discount-title { padding-top: 4rpx; color: #0f766e; font-size: 26rpx; font-weight: 800; }
.form-card { display: grid; gap: 22rpx; }
.form-heading { margin-bottom: 2rpx; }
.progress-pill { flex: 0 0 auto; padding: 8rpx 14rpx; border-radius: 8rpx; background: rgba(15,118,110,.12); color: #0f766e; font-size: 23rpx; font-weight: 800; }
.field { margin-bottom: 28rpx; }
.field:last-child { margin-bottom: 0; }
.field.missing { padding: 18rpx; margin-left: -18rpx; margin-right: -18rpx; border-radius: 18rpx; background: #fff7ed; border: 1px solid #fed7aa; }
.label { font-size: 28rpx; font-weight: 650; margin-bottom: 12rpx; }
.label text { color: #dc2626; }
.field-label { display: flex; align-items: center; gap: 8rpx; }
.optional { color: #98a2b3 !important; font-size: 22rpx; font-weight: 500; }
.choice { display: flex; align-items: center; gap: 10rpx; margin: 12rpx 0; }
.choice-text { color: #333333; font-size: 27rpx; line-height: 1.45; }
.ticket-list { display: grid; gap: 12rpx; }
.ticket { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 20rpx; border: 1px solid #d9ebe6; border-radius: 10rpx; background: #f9fcfb; }
.ticket.active { border-color: #0f766e; background: #eaf7f3; }
.ticket.disabled { opacity: .58; background: #f5f5f4; }
.ticket-name { font-size: 28rpx; font-weight: 650; margin-bottom: 6rpx; }
.ticket-price { flex: 0 0 auto; color: #0f766e; font-weight: 800; }
.coupon-row { display: grid; grid-template-columns: 1fr 150rpx; gap: 12rpx; align-items: center; }
.available-coupons { display: grid; gap: 12rpx; margin-top: 16rpx; }
.available-coupon { display: flex; justify-content: space-between; gap: 16rpx; align-items: center; padding: 18rpx; border: 1rpx solid #d9ebe6; border-radius: 10rpx; background: #f9fcfb; }
.available-coupon.selected { border-color: #0f766e; background: #eaf7f3; }
.coupon-name { color: #173f3a; font-weight: 700; }
.coupon-action { flex: 0 0 auto; color: #0f766e; font-size: 24rpx; font-weight: 700; }
.coupon-input { min-width: 0; }
.mini-button { height: 78rpx; border-radius: 9rpx; background: #0f766e; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 700; }
.mini-button.disabled { background: #9ca3af; }
.error { color: #dc2626; font-size: 24rpx; }
.points-row { display: grid; gap: 10rpx; }
.summary { display: grid; gap: 10rpx; padding: 18rpx; border-radius: 10rpx; background: #f1f7f5; }
.summary view { display: flex; justify-content: space-between; color: var(--muted-color, #667085); font-size: 26rpx; }
.summary .payable { color: #172033; font-weight: 800; font-size: 32rpx; }
.summary .payable text:last-child { color: #0f766e; }
.payment-methods { display: grid; gap: 12rpx; padding-top: 10rpx; }
.method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.method { min-width: 0; padding: 18rpx; border: 1px solid #d9ebe6; border-radius: 10rpx; background: #f9fcfb; }
.method.active { border-color: #0f766e; background: #eaf7f3; }
.method-name { color: #172033; font-size: 27rpx; font-weight: 850; }
.submit-bar { position: fixed; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: minmax(0, 210rpx) 1fr; gap: 18rpx; align-items: center; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); background: rgba(255, 255, 255, 0.98); border-top: 1rpx solid #d9ebe6; box-shadow: 0 -10rpx 30rpx rgba(20,72,64,.08); }
.register { background:#f7f9f8; }.register .detail-hero,.register .hero-image { border-radius:8rpx; overflow:hidden; }.register .card { border-radius:8rpx; border-color:#e2eae6; box-shadow:0 8rpx 20rpx rgba(23,48,36,.035); }.register .ticket-option,.register .field-control,.register .payment-option { border-radius:8rpx; }.register .submit-bar { border-color:#dce8e2; }.register .submit-button { border-radius:8rpx; background:#20d477; color:#072d19; }
.submit-summary { min-width: 0; display: grid; gap: 4rpx; }
.submit-summary text:first-child { color: #999999; font-size: 22rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.submit-summary text:last-child { color: #0f766e; font-size: 34rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.submit-bar .button { height: 92rpx; font-size: 32rpx; }
@media (min-width:900px){.submit-bar{left:50%;right:auto;width:760px;max-width:100%;transform:translateX(-50%);box-sizing:border-box;border-left:1rpx solid #dce8e2;border-right:1rpx solid #dce8e2}}
</style>
