<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { FieldType } from "@activity/shared";
import { ensureUser, request, getCurrentRouteWithQuery, withTenantCode } from "../../api";
import { usePageDecoration } from "../../decoration";
import TenantContextBadge from "../../components/TenantContextBadge.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const activity = ref<any>();
const operationSetting = ref<any>();
const loading = ref(true);
const loadError = ref("");
const submitting = ref(false);
const quoting = ref(false);
const quoteError = ref("");
const selectedTicketTypeId = ref<number | undefined>();
const couponCode = ref("");
const pointsToUse = ref(0);
const quote = ref<any>();
const userId = ref<number>();
type PayMethod = "wechat" | "alipay" | "balance" | "offline";
const paymentMethod = ref<PayMethod>("wechat");
const channelCode = ref("");
const source = ref("");
const inviteCode = ref("");
const attemptedSubmit = ref(false);
const missingFieldId = ref<number>();
const values = reactive<Record<number, any>>({});
const { tenant, contentSections, innerPageConfig, innerPageLayout, loadDecoration } = usePageDecoration("activity_register", "/pages/activity/register");

const ticketOptions = computed(() => activity.value?.ticketTypes || []);
const hasTicketTypes = computed(() => ticketOptions.value.length > 0);
const selectedTicket = computed(() => ticketOptions.value.find((ticket: any) => ticket.id === selectedTicketTypeId.value));
const currentPayable = computed(() => quote.value?.payableAmount ?? Number(activity.value?.price || 0).toFixed(2));
const payableNumber = computed(() => Number(currentPayable.value || 0));
const memberBlocked = computed(() => activity.value?.memberAccess && !activity.value.memberAccess.eligible);
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
  return payableNumber.value > 0 ? "提交后请选择支付方式；线下收款需后台确认后生效。" : activity.value.requireReview ? "提交后会进入主办方审核，审核结果会显示在我的报名里。" : "提交后即可获得报名成功状态。";
});
const paymentMethods = computed<Record<string, boolean>>(() => operationSetting.value?.paymentMethods || { free: true, wechat: true, alipay: false, balance: true, offline: true });
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
  if (memberBlocked.value) return "会员等级不足";
  if (activity.value?.remainingSeats <= 0) return "加入候补";
  return "确认提交";
});
const seatsText = computed(() => {
  if (!activity.value) return "";
  if (activity.value.remainingSeats <= 0) return "名额已满，可先加入候补";
  return `剩余 ${activity.value.remainingSeats} 个名额`;
});

function isFilled(value: any) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function fieldPlaceholder(field: any) {
  if (field.type === FieldType.Phone) return "用于接收报名通知";
  if (field.type === FieldType.IdCard) return "请填写证件号码";
  if (field.type === FieldType.Remark) return "如有特殊需求，可在这里说明";
  return `请填写${field.label}`;
}

function setMulti(fieldId: number, option: string) {
  const current = values[fieldId] || [];
  values[fieldId] = current.includes(option) ? current.filter((item: string) => item !== option) : [...current, option];
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
  return "";
}

function submit() {
  if (submitting.value) return;
  attemptedSubmit.value = true;
  if (registrationPaused.value) {
    uni.showToast({ title: registrationPausedMessage.value, icon: "none" });
    return;
  }
  if (memberBlocked.value) {
    uni.showToast({ title: activity.value.memberAccess.message, icon: "none" });
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
  uni.showModal({
    title: activity.value.remainingSeats <= 0 ? "确认加入候补" : "确认提交报名",
    content,
    confirmText: activity.value.remainingSeats <= 0 ? "加入候补" : "确认提交",
    success: (res) => {
      if (res.confirm) doSubmit();
    }
  });
}

function goLogin() {
  const redirect = encodeURIComponent(getCurrentRouteWithQuery());
  uni.navigateTo({ url: `/pages/user/login?redirect=${redirect}` });
}

async function doSubmit() {
  submitting.value = true;
  try {
    userId.value = await ensureUser();
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
      }
    });
    if (result.waitlisted) {
      uni.showModal({ title: "已进入候补", content: "当前活动名额已满，你已进入候补名单。若有名额释放，主办方可在后台为你补位。", showCancel: false, success: () => uni.navigateBack() });
      return;
    }
    uni.showToast({ title: "报名已提交", icon: "success" });
    uni.redirectTo({ url: withTenantCode(`/pages/user/registration?id=${result.registration.id}`) });
  } catch (error: any) {
    uni.showModal({ title: "提交失败", content: error.message || "请稍后再试，或联系主办方协助处理。", showCancel: false, confirmText: "知道了" });
  } finally {
    submitting.value = false;
  }
}

async function refreshQuote(showError = false) {
  if (!activity.value) return;
  quoting.value = true;
  quoteError.value = "";
  try {
    userId.value ||= await ensureUser();
    quote.value = await request(`/public/activities/${activity.value.id}/quote`, { method: "POST", data: { ticketTypeId: selectedTicketTypeId.value, couponCode: couponCode.value.trim() || undefined, pointsToUse: pointsToUse.value || undefined } });
  } catch (error: any) {
    quoteError.value = error.message || "优惠码不可用";
    quote.value = undefined;
    if (showError) uni.showToast({ title: quoteError.value, icon: "none" });
  } finally {
    quoting.value = false;
  }
}

function chooseTicket(id?: number) {
  selectedTicketTypeId.value = id;
  refreshQuote();
}

function applyCoupon() {
  refreshQuote(true);
}

function applyPoints() {
  const available = Number(quote.value?.availablePoints || 0);
  pointsToUse.value = Math.max(Math.min(Number(pointsToUse.value || 0), available), 0);
  refreshQuote(true);
}

onMounted(async () => {
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
    activity.value = detail;
    operationSetting.value = setting;
    if (payableNumber.value > 0 && !paymentMethods.value[paymentMethod.value]) {
      paymentMethod.value = availablePaymentMethods.value[0]?.value || "offline";
    }
    selectedTicketTypeId.value = activity.value.ticketTypes?.[0]?.id;
    await refreshQuote();
  } catch (error: any) {
    loadError.value = error?.message || "报名页面加载失败，请重新进入活动后再试。";
    uni.showToast({ title: loadError.value, icon: "none" });
  } finally {
    loading.value = false;
  }
  loadDecoration();
});

watch(couponCode, () => {
  if (!couponCode.value.trim() && activity.value) refreshQuote();
});
</script>

<template>
  <view class="container register">
    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="loadError" class="card">
      <view class="title">报名页面加载失败</view>
      <view class="subtle">{{ loadError }}</view>
      <view class="error-actions">
        <view class="button secondary" @click="goLogin">去登录</view>
      </view>
    </view>
    <template v-else-if="activity">
      <TenantContextBadge :tenant="tenant" label="当前城市" hint="报名归属" />
      <PageDecorationBlocks :sections="contentSections" />

      <view class="page-head" :style="{ background: String(innerPageLayout.headerBackgroundColor || '#ffffff') }">
        <view class="page-head-title" :style="{ color: String(innerPageLayout.headerTextColor || '#111827') }">{{ innerPageConfig.title || "报名确认" }}</view>
        <view class="page-head-copy" :style="{ color: String(innerPageLayout.headerSubtitleColor || '#667085') }">{{ innerPageConfig.subtitle || "确认票种、优惠和报名信息，提交后可在我的活动查看进度。" }}</view>
      </view>

      <view class="card intro-card">
        <view class="step-label">报名确认</view>
        <view class="title">{{ activity.title }}</view>
        <view class="intro-grid">
          <view><text>票种</text><text>{{ selectedTicketName }}</text></view>
          <view><text>费用</text><text>{{ payableText }}</text></view>
          <view><text>名额</text><text>{{ seatsText }}</text></view>
        </view>
        <view class="subtle hint">{{ paymentHint }}</view>
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
          <view v-for="ticket in ticketOptions" :key="ticket.id" class="ticket" :class="{ active: selectedTicketTypeId === ticket.id }" @click="chooseTicket(ticket.id)">
            <view>
              <view class="ticket-name">{{ ticket.name }}</view>
              <view class="subtle">{{ ticket.capacity ? `限 ${ticket.capacity} 人` : "不限容量" }}</view>
            </view>
            <view class="ticket-price">￥{{ Number(ticket.price).toFixed(2) }}</view>
          </view>
        </view>
        <view v-else class="ticket active">
          <view><view class="ticket-name">标准报名</view><view class="subtle">活动基础价格</view></view>
          <view class="ticket-price">{{ Number(activity.price) > 0 ? `￥${Number(activity.price).toFixed(2)}` : "免费" }}</view>
        </view>

        <view class="discount-title">优惠抵扣</view>
        <view class="coupon-row">
          <input v-model="couponCode" class="input coupon-input" placeholder="输入优惠码" />
          <view class="mini-button" :class="{ disabled: quoting }" @click="!quoting && applyCoupon()">{{ quoting ? "计算中" : "使用" }}</view>
        </view>
        <view v-if="quoteError" class="error">{{ quoteError }}</view>
        <view class="points-row">
          <view class="subtle">可用积分：{{ quote?.availablePoints || 0 }}，100 积分抵 1 元</view>
          <view class="coupon-row">
            <input v-model.number="pointsToUse" class="input coupon-input" type="number" placeholder="输入抵扣积分" />
            <view class="mini-button" :class="{ disabled: quoting }" @click="!quoting && applyPoints()">{{ quoting ? "计算中" : "抵扣" }}</view>
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
            <view v-for="method in availablePaymentMethods" :key="method.value" class="method" :class="{ active: paymentMethod === method.value }" @click="paymentMethod = method.value">
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
          <input v-if="field.type === FieldType.Text || field.type === FieldType.Phone || field.type === FieldType.IdCard" v-model="values[field.id]" class="input" :placeholder="fieldPlaceholder(field)" :type="field.type === FieldType.Phone ? 'number' : 'text'" />
          <textarea v-else-if="field.type === FieldType.Remark" v-model="values[field.id]" class="textarea" :placeholder="fieldPlaceholder(field)" />
          <radio-group v-else-if="field.type === FieldType.SingleChoice" @change="values[field.id] = $event.detail.value">
            <label v-for="opt in field.options" :key="opt.value" class="choice"><radio :value="opt.label" />{{ opt.label }}</label>
          </radio-group>
          <view v-else-if="field.type === FieldType.MultipleChoice" class="choices">
            <label v-for="opt in field.options" :key="opt.value" class="choice"><checkbox :checked="(values[field.id] || []).includes(opt.label)" @click="setMulti(field.id, opt.label)" />{{ opt.label }}</label>
          </view>
        </view>
      </view>
      <view class="submit-bar" :style="{ background: String(innerPageLayout.actionBarBackgroundColor || 'var(--card-bg, #fff)') }">
        <view class="submit-summary">
          <text>{{ formProgressText }}</text>
          <text>{{ payableText }}</text>
        </view>
        <view class="button" :class="{ secondary: submitting || memberBlocked || registrationPaused }" @click="submit">{{ submitButtonText }}</view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.register { padding-bottom: 160rpx; }
.error-actions { margin-top: 18rpx; }
.page-head { margin-bottom: 20rpx; padding: 28rpx 24rpx; border-radius: var(--card-radius, 8px); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.page-head-title { font-size: 40rpx; font-weight: 900; line-height: 1.25; }
.page-head-copy { margin-top: 10rpx; font-size: 25rpx; line-height: 1.5; }
.intro-card { display: grid; gap: 16rpx; }
.step-label { color: var(--primary-color, #0f766e); font-size: 24rpx; font-weight: 800; }
.hint { margin-top: 12rpx; }
.intro-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; }
.intro-grid view { min-width: 0; display: grid; gap: 6rpx; padding: 14rpx 12rpx; border-radius: 6px; background: #f8fafc; }
.intro-grid text:first-child { color: var(--muted-color, #667085); font-size: 22rpx; }
.intro-grid text:last-child { color: #172033; font-size: 25rpx; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.member-access { margin-top: 18rpx; padding: 18rpx; border-radius: 6px; background: var(--primary-soft, #f3faf8); border: 1px solid #cde8e3; }
.member-access.blocked { background: #fff7ed; border-color: #fed7aa; }
.operation-notice { margin-top: 18rpx; padding: 18rpx; border-radius: 6px; background: #fff7ed; border: 1px solid #fed7aa; }
.member-title { color: #172033; font-weight: 700; margin-bottom: 8rpx; }
.price-card { display: grid; gap: 18rpx; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }
.discount-title { padding-top: 4rpx; color: #344054; font-size: 26rpx; font-weight: 800; }
.form-card { display: grid; gap: 22rpx; }
.form-heading { margin-bottom: 2rpx; }
.progress-pill { flex: 0 0 auto; padding: 8rpx 14rpx; border-radius: 999px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-size: 23rpx; font-weight: 800; }
.field { margin-bottom: 28rpx; }
.field:last-child { margin-bottom: 0; }
.field.missing { padding: 18rpx; margin-left: -18rpx; margin-right: -18rpx; border-radius: 6px; background: #fff7ed; border: 1px solid #fed7aa; }
.label { font-size: 28rpx; font-weight: 650; margin-bottom: 12rpx; }
.label text { color: #dc2626; }
.field-label { display: flex; align-items: center; gap: 8rpx; }
.optional { color: #98a2b3 !important; font-size: 22rpx; font-weight: 500; }
.choice { display: flex; align-items: center; gap: 10rpx; margin: 12rpx 0; }
.ticket-list { display: grid; gap: 12rpx; }
.ticket { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 18rpx; border: 1px solid #d7dde8; border-radius: 6px; background: var(--card-bg, #fff); }
.ticket.active { border-color: var(--primary-color, #0f766e); background: var(--primary-soft, #f3faf8); }
.ticket-name { font-size: 28rpx; font-weight: 650; margin-bottom: 6rpx; }
.ticket-price { color: var(--primary-color, #0f766e); font-weight: 800; }
.coupon-row { display: grid; grid-template-columns: 1fr 150rpx; gap: 12rpx; align-items: center; }
.coupon-input { min-width: 0; }
.mini-button { height: 78rpx; border-radius: 6px; background: var(--primary-color, #0f766e); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26rpx; }
.mini-button.disabled { background: #9ca3af; }
.error { color: #dc2626; font-size: 24rpx; }
.points-row { display: grid; gap: 10rpx; }
.summary { display: grid; gap: 10rpx; padding-top: 12rpx; border-top: 1px solid #edf0f5; }
.summary view { display: flex; justify-content: space-between; color: var(--muted-color, #667085); font-size: 26rpx; }
.summary .payable { color: #172033; font-weight: 800; font-size: 32rpx; }
.summary .payable text:last-child { color: var(--primary-color, #0f766e); }
.payment-methods { display: grid; gap: 12rpx; padding-top: 10rpx; }
.method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.method { min-width: 0; padding: 18rpx; border: 1px solid #d7dde8; border-radius: 6px; background: var(--card-bg, #fff); }
.method.active { border-color: var(--primary-color, #0f766e); background: var(--primary-soft, #f3faf8); }
.method-name { color: #172033; font-size: 27rpx; font-weight: 850; }
.submit-bar { position: fixed; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: 190rpx 1fr; gap: 18rpx; align-items: center; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); background: var(--card-bg, #fff); border-top: 1px solid #e5e7eb; box-shadow: 0 -10rpx 30rpx rgba(15, 23, 42, 0.08); }
.submit-summary { min-width: 0; display: grid; gap: 4rpx; }
.submit-summary text:first-child { color: #667085; font-size: 22rpx; }
.submit-summary text:last-child { color: var(--primary-color, #0f766e); font-size: 34rpx; font-weight: 900; }
</style>
