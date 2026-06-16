<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { RegistrationStatus, registrationStatusText, type HomepagePayload, type HomepageSectionView } from "@activity/shared";
import { ensureUser, getCurrentTenantCode, request, setActivityListIntent, withTenantCode } from "../../api";
import { getMobileAdminSession } from "../../mobile-admin";
import { loadPageTheme } from "../../theme";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import { goDecoratedLink, quickInitial as decoratedQuickInitial } from "../../decoration";

const rows = ref<any[]>([]);
const homepageSections = ref<HomepageSectionView[]>([]);
const tenant = ref<HomepagePayload["tenant"] | null>(null);
const wallet = ref<any | null>(null);
const walletTransactions = ref<any[]>([]);
const loading = ref(true);
const activeStatus = ref<"all" | RegistrationStatus>("all");
const phone = ref("");
const mounted = ref(false);
const lastLoadedTenantCode = ref("");

const tabs = computed(() => [
  { label: "全部", value: "all", count: rows.value.length },
  { label: "待付款", value: RegistrationStatus.PendingPayment, count: countByStatus(RegistrationStatus.PendingPayment) },
  { label: "待审核", value: RegistrationStatus.PendingReview, count: countByStatus(RegistrationStatus.PendingReview) },
  { label: "成功", value: RegistrationStatus.Approved, count: countByStatus(RegistrationStatus.Approved) },
  { label: "已签到", value: RegistrationStatus.CheckedIn, count: countByStatus(RegistrationStatus.CheckedIn) }
]);

const filteredRows = computed(() => (activeStatus.value === "all" ? rows.value : rows.value.filter((item) => item.status === activeStatus.value)));
const latestWalletTransactions = computed(() => walletTransactions.value.slice(0, 4));
const myPageSection = computed(() => homepageSections.value.find((item) => item.enabled && item.type === "my_page"));
const bottomNavSection = computed(() => homepageSections.value.find((item) => item.enabled && item.type === "bottom_nav"));
const myConfig = computed<Record<string, any>>(() => (myPageSection.value?.config || {}) as Record<string, any>);
const myLayout = computed<Record<string, any>>(() => (myPageSection.value?.layout || {}) as Record<string, any>);
const toolItems = computed(() => {
  const configured = Array.isArray(myConfig.value.tools) ? myConfig.value.tools : [];
  return configured.length
    ? configured
    : [
        { label: "管理后台", icon: "管", color: "#1d4ed8", link: getMobileAdminSession() ? "/pages/admin/home" : "/pages/admin/login" },
        { label: "浏览活动", icon: "活", color: "#0f766e", link: "/pages/activity/list", action: "mainPage" },
        { label: "公告中心", icon: "告", color: "#c2410c", link: "/pages/announcement/list" },
        { label: "服务中心", icon: "服", color: "#475467", link: "/pages/service/index" }
      ];
});

function countByStatus(status: RegistrationStatus) {
  return rows.value.filter((item) => item.status === status).length;
}

function go(id: number) {
  uni.navigateTo({ url: withTenantCode(`/pages/user/registration?id=${id}`) });
}

function goActivities() {
  setActivityListIntent({ categoryId: "all" });
  uni.reLaunch({ url: withTenantCode("/pages/activity/list") });
}

function nextAction(item: any) {
  if (item.status === RegistrationStatus.PendingPayment) return "请尽快完成付款，名额会在确认后锁定";
  if (item.status === RegistrationStatus.PendingReview) return "已提交给主办方，请等待审核结果";
  if (item.status === RegistrationStatus.Approved) return "报名成功，活动当天出示签到码";
  if (item.status === RegistrationStatus.CheckedIn) return "已签到，欢迎回来留下活动评价";
  if (item.status === RegistrationStatus.Rejected) return "报名未通过，可查看详情或联系主办方";
  if (item.status === RegistrationStatus.Cancelled) return "报名已取消，仍可继续浏览其他活动";
  return "查看详情了解下一步";
}

function actionLabel(item: any) {
  if (item.status === RegistrationStatus.PendingPayment) return "去处理";
  if (item.status === RegistrationStatus.Approved) return "看签到码";
  if (item.status === RegistrationStatus.CheckedIn) return "去评价";
  return "查看详情";
}

function goPage(url: string) {
  uni.navigateTo({ url });
}

function goLink(url?: string, action?: string) {
  if (action === "refresh") {
    load();
    return;
  }
  goDecoratedLink(url, action);
}

function isCurrentNav(url?: string) {
  return url === "/pages/user/my";
}

function quickInitial(label: string, icon?: string) {
  return decoratedQuickInitial(label, icon);
}

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function money(value: string | number | undefined | null) {
  return Number(value || 0).toFixed(2);
}

function walletTypeText(type: string) {
  const map: Record<string, string> = {
    admin_recharge: "后台充值",
    admin_deduct: "后台扣减",
    admin_adjust: "余额调整",
    balance_pay: "余额支付",
    refund_return: "退款返还"
  };
  return map[type] || type || "余额变动";
}

function walletAmountText(item: any) {
  const prefix = item.direction === "debit" ? "-" : "+";
  return `${prefix}¥${money(item.amount)}`;
}

function goWalletHelp() {
  uni.navigateTo({ url: withTenantCode("/pages/service/index") });
}

function statusClass(status: RegistrationStatus) {
  if (status === RegistrationStatus.PendingPayment) return "is-payment";
  if (status === RegistrationStatus.PendingReview) return "is-review";
  if (status === RegistrationStatus.Approved) return "is-approved";
  if (status === RegistrationStatus.CheckedIn) return "is-checkin";
  return "is-muted";
}

async function load() {
  loading.value = true;
  lastLoadedTenantCode.value = getCurrentTenantCode();
  try {
    await ensureUser();
    phone.value = uni.getStorageSync("user_phone") || "";
    const [registrations, homepage, walletDetail, transactions] = await Promise.all([
      request<any[]>("/public/me/registrations"),
      request<HomepagePayload>("/public/page-decoration?pageKey=user_my").catch(() => ({ sections: [], fallback: true })),
      request<any>("/public/me/wallet").catch(() => null),
      request<any[]>("/public/me/wallet/transactions").catch(() => [])
    ]);
    rows.value = registrations;
    homepageSections.value = homepage.sections || [];
    tenant.value = homepage.tenant || null;
    wallet.value = walletDetail;
    walletTransactions.value = transactions;
  } finally {
    loading.value = false;
  }
}

async function handleTenantChanged() {
  await loadPageTheme();
  await load();
}

onMounted(() => {
  mounted.value = true;
  load();
});

onShow(async () => {
  if (!mounted.value) return;
  const tenantCode = getCurrentTenantCode();
  if (tenantCode === lastLoadedTenantCode.value) return;
  await loadPageTheme();
  await load();
});
</script>

<template>
  <view class="my-page">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />
    <PageDecorationBlocks :sections="homepageSections.filter((item) => item.enabled && item.type !== 'bottom_nav' && item.type !== 'my_page')" />

    <view class="profile" :style="{ background: myLayout.heroBackgroundColor || '#111827', color: myLayout.heroTextColor || '#ffffff' }">
      <view>
        <view class="hello">{{ myConfig.greeting || myPageSection?.title || "我的活动" }}</view>
        <view class="sub">{{ phone ? `当前账号 ${phone}` : (myPageSection?.subtitle || "报名、付款、审核、签到状态都在这里") }}</view>
      </view>
      <view class="total">{{ rows.length }}</view>
    </view>

    <view class="wallet-card">
      <view class="wallet-main">
        <view>
          <view class="wallet-label">账户余额</view>
          <view class="wallet-amount">¥{{ money(wallet?.availableBalance) }}</view>
        </view>
        <view class="wallet-action" @click="goWalletHelp">充值说明</view>
      </view>
      <view class="wallet-stats">
        <view>
          <text>累计充值</text>
          <strong>¥{{ money(wallet?.totalRecharge) }}</strong>
        </view>
        <view>
          <text>累计消费</text>
          <strong>¥{{ money(wallet?.totalSpent) }}</strong>
        </view>
        <view>
          <text>冻结金额</text>
          <strong>¥{{ money(wallet?.frozenBalance) }}</strong>
        </view>
      </view>
      <view class="wallet-tip">余额由后台充值，可用于报名订单余额支付。</view>
    </view>

    <view class="tool-grid">
      <view v-for="item in toolItems" :key="item.label" class="tool" @click="goLink(item.link, item.action)">
        <text :style="{ background: `${item.color || '#0f766e'}18`, color: item.color || '#0f766e' }">{{ quickInitial(item.label, item.icon) }}</text>
        <view>{{ item.label }}</view>
      </view>
    </view>

    <scroll-view scroll-x class="tabs" :show-scrollbar="false">
      <view class="tabs-track">
        <view v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: activeStatus === tab.value }" @click="activeStatus = tab.value as any">
          <text>{{ tab.label }}</text>
          <text>{{ tab.count }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="wallet-flow">
      <view class="section-title">余额明细</view>
      <view v-if="!latestWalletTransactions.length" class="flow-empty">暂无余额流水。后台充值后会显示在这里。</view>
      <view v-for="item in latestWalletTransactions" :key="item.id" class="flow-item">
        <view>
          <view class="flow-title">{{ walletTypeText(item.type) }}</view>
          <view class="flow-time">{{ formatTime(item.createdAt) }}</view>
          <view v-if="item.remark" class="flow-remark">{{ item.remark }}</view>
        </view>
        <view class="flow-right" :class="{ debit: item.direction === 'debit' }">
          <view>{{ walletAmountText(item) }}</view>
          <text>余额 ¥{{ money(item.balanceAfter) }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="state-card">加载中...</view>
    <template v-else>
      <view v-if="!filteredRows.length" class="empty">
        <view class="empty-title">暂无相关报名</view>
        <view class="empty-copy">去活动页看看最近有哪些适合参加的活动。</view>
        <view class="empty-button" @click="goActivities">浏览活动</view>
      </view>

      <view v-for="item in filteredRows" :key="item.id" class="registration-card" @click="go(item.id)">
        <view class="card-head">
          <text class="status" :class="statusClass(item.status)">{{ registrationStatusText[item.status as RegistrationStatus] }}</text>
          <text class="date">{{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="title">{{ item.activity.title }}</view>
        <view class="meta">{{ item.activity.location }}</view>
        <view class="next-row">
          <view>
            <view class="next-title">下一步</view>
            <view class="next-copy">{{ nextAction(item) }}</view>
          </view>
          <view class="mini-cta">{{ actionLabel(item) }}</view>
        </view>
        <view class="timeline">
          <view class="step done">提交</view>
          <view class="line done"></view>
          <view class="step" :class="{ done: [RegistrationStatus.PendingReview, RegistrationStatus.Approved, RegistrationStatus.CheckedIn].includes(item.status) }">审核</view>
          <view class="line" :class="{ done: [RegistrationStatus.Approved, RegistrationStatus.CheckedIn].includes(item.status) }"></view>
          <view class="step" :class="{ done: [RegistrationStatus.Approved, RegistrationStatus.CheckedIn].includes(item.status) }">成功</view>
          <view class="line" :class="{ done: item.status === RegistrationStatus.CheckedIn }"></view>
          <view class="step" :class="{ done: item.status === RegistrationStatus.CheckedIn }">签到</view>
        </view>
      </view>
    </template>

    <AppBottomNav :section="bottomNavSection" current-path="/pages/user/my" />
  </view>
</template>

<style scoped>
.my-page { min-height: 100vh; padding: 24rpx 24rpx 140rpx; background: var(--page-bg-layer, #f4f6f8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #111827); }
.profile { display: flex; justify-content: space-between; align-items: center; padding: 34rpx 28rpx; border-radius: 8px; background: #111827; color: #fff; }
.hello { font-size: 42rpx; font-weight: 900; }
.sub { margin-top: 10rpx; color: rgba(255,255,255,0.72); font-size: 25rpx; }
.total { width: 86rpx; height: 86rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--primary-color, #0f766e); font-size: 34rpx; font-weight: 900; }
.wallet-card { margin-top: 20rpx; padding: 26rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.07); }
.wallet-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }
.wallet-label { color: var(--muted-color, #667085); font-size: 25rpx; font-weight: 800; }
.wallet-amount { margin-top: 8rpx; color: var(--text-color, #111827); font-size: 50rpx; line-height: 1; font-weight: 950; }
.wallet-action { flex: 0 0 auto; padding: 12rpx 18rpx; border-radius: 999px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-size: 24rpx; font-weight: 900; }
.wallet-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 24rpx; }
.wallet-stats view { min-width: 0; display: grid; gap: 6rpx; padding: 16rpx; border-radius: 8px; background: #f8fafc; }
.wallet-stats text { color: var(--muted-color, #667085); font-size: 22rpx; }
.wallet-stats strong { color: var(--text-color, #111827); font-size: 25rpx; }
.wallet-tip { margin-top: 18rpx; color: var(--muted-color, #667085); font-size: 24rpx; line-height: 1.5; }
.tool-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14rpx; margin: 20rpx 0 8rpx; }
.tool { min-height: 124rpx; display: grid; gap: 10rpx; justify-items: center; align-content: center; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); color: #344054; font-size: 24rpx; font-weight: 800; box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.tool text { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-size: 25rpx; font-weight: 900; }
.tool text.warm { background: #fff7ed; color: #c2410c; }
.tool text.blue { background: #eef2ff; color: #4338ca; }
.tool text.gray { background: #eef2f7; color: #475467; }
.tabs { width: 100%; height: 92rpx; margin: 24rpx 0 20rpx; white-space: nowrap; }
.tabs-track { display: inline-flex; gap: 14rpx; padding-right: 24rpx; }
.tab { min-width: 126rpx; display: grid; gap: 6rpx; justify-items: center; padding: 14rpx 20rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); color: var(--muted-color, #667085); font-size: 24rpx; font-weight: 800; }
.tab text:last-child { color: var(--text-color, #111827); font-size: 28rpx; }
.tab.active { background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); }
.wallet-flow { margin-bottom: 20rpx; padding: 24rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.section-title { margin-bottom: 16rpx; color: var(--text-color, #111827); font-size: 31rpx; font-weight: 900; }
.flow-empty { padding: 24rpx 0; color: var(--muted-color, #667085); font-size: 25rpx; text-align: center; }
.flow-item { display: flex; justify-content: space-between; gap: 18rpx; padding: 18rpx 0; border-top: 1px solid #eef2f7; }
.flow-item:first-of-type { border-top: 0; padding-top: 0; }
.flow-title { color: var(--text-color, #111827); font-size: 27rpx; font-weight: 900; }
.flow-time, .flow-remark { margin-top: 6rpx; color: var(--muted-color, #667085); font-size: 22rpx; line-height: 1.35; }
.flow-right { flex: 0 0 auto; display: grid; gap: 6rpx; justify-items: end; color: var(--primary-color, #0f766e); font-size: 28rpx; font-weight: 950; }
.flow-right.debit { color: #c2410c; }
.flow-right text { color: var(--muted-color, #667085); font-size: 22rpx; font-weight: 700; }
.registration-card { margin-bottom: 20rpx; padding: 24rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.07); }
.card-head { display: flex; justify-content: space-between; align-items: center; gap: 16rpx; }
.status { flex: 0 0 auto; padding: 8rpx 16rpx; border-radius: 999px; font-size: 23rpx; font-weight: 900; }
.status.is-payment { background: #fff7ed; color: #c2410c; }
.status.is-review { background: #eef2ff; color: #4338ca; }
.status.is-approved { background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); }
.status.is-checkin { background: #f0fdf4; color: #15803d; }
.status.is-muted { background: #eef2f7; color: #667085; }
.date { color: #8a94a6; font-size: 23rpx; }
.title { margin-top: 18rpx; color: var(--text-color, #111827); font-size: 32rpx; font-weight: 900; line-height: 1.35; }
.meta { margin-top: 10rpx; color: var(--muted-color, #667085); font-size: 25rpx; }
.next-row { display: flex; justify-content: space-between; align-items: center; gap: 18rpx; margin-top: 18rpx; padding: 18rpx; border-radius: 8px; background: #f8fafc; }
.next-title { color: #172033; font-size: 24rpx; font-weight: 900; }
.next-copy { margin-top: 6rpx; color: var(--muted-color, #667085); font-size: 24rpx; line-height: 1.45; }
.mini-cta { flex: 0 0 auto; min-width: 112rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--primary-color, #0f766e); color: #fff; font-size: 24rpx; font-weight: 900; }
.timeline { display: grid; grid-template-columns: auto 1fr auto 1fr auto 1fr auto; align-items: center; gap: 8rpx; margin-top: 24rpx; }
.step { color: #98a2b3; font-size: 22rpx; font-weight: 800; }
.step.done { color: var(--primary-color, #0f766e); }
.line { height: 4rpx; border-radius: 999px; background: #e5e7eb; }
.line.done { background: var(--primary-color, #0f766e); }
.state-card, .empty { padding: 34rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); color: var(--muted-color, #667085); font-size: 26rpx; text-align: center; }
.empty-title { color: var(--text-color, #111827); font-size: 32rpx; font-weight: 900; }
.empty-copy { margin-top: 10rpx; color: var(--muted-color, #667085); font-size: 25rpx; }
.empty-button { display: inline-flex; margin-top: 22rpx; padding: 16rpx 28rpx; border-radius: 999px; background: var(--primary-color, #0f766e); color: #fff; font-size: 26rpx; font-weight: 900; }
</style>
