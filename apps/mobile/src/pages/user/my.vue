<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { RegistrationStatus, registrationStatusText, type HomepagePayload, type HomepageSectionView } from "@activity/shared";
import { ensureUser, fetchMyProfile, getCurrentRouteWithQuery, getCurrentTenantCode, request, setActivityListIntent, withTenantCode } from "../../api";
import { getMobileAdminSession } from "../../mobile-admin";
import { loadPageTheme } from "../../theme";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import { goDecoratedLink, quickInitial as decoratedQuickInitial } from "../../decoration";

const rows = ref<any[]>([]);
const homepageSections = ref<HomepageSectionView[]>([]);
const tenant = ref<HomepagePayload["tenant"] | null>(null);
const profile = ref<any | null>(null);
const wallet = ref<any | null>(null);
const walletTransactions = ref<any[]>([]);
const charity = ref<any | null>(null);
const adminAccess = ref<{ canAccess?: boolean; role?: string; tenantName?: string | null } | null>(null);
const loading = ref(true);
const loadError = ref("");
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
const latestWalletTransactions = computed(() => walletTransactions.value.slice(0, 2));
const myPageSection = computed(() => homepageSections.value.find((item) => item.enabled && item.type === "my_page"));
const bottomNavSection = computed(() => homepageSections.value.find((item) => item.enabled && item.type === "bottom_nav"));
const myConfig = computed<Record<string, any>>(() => (myPageSection.value?.config || {}) as Record<string, any>);
const myLayout = computed<Record<string, any>>(() => (myPageSection.value?.layout || {}) as Record<string, any>);
const toolItems = computed(() => {
  const configured = Array.isArray(myConfig.value.tools) ? myConfig.value.tools : [];
  const hasMobileAdminAccess = Boolean(adminAccess.value?.canAccess || getMobileAdminSession());
  const adminLink = getMobileAdminSession() ? "/pages/admin/home" : "/pages/admin/login";
  const fallback = configured.length
    ? configured
    : [
        { label: "我的报名", icon: "报", color: "#0f766e", action: "registrations" },
        { label: "余额明细", icon: "余", color: "#1d4ed8", link: "/pages/user/wallet" },
        { label: "公益池", icon: "益", color: "#15803d", link: "/pages/charity/index" },
        { label: "账号设置", icon: "设", color: "#7c3aed", link: "/pages/user/profile" },
        { label: "客服帮助", icon: "服", color: "#475467", link: "/pages/service/index" },
        { label: "手机管理", icon: "管", color: "#c2410c", link: adminLink }
      ];
  return fallback
    .map((item) => item.label === "管理后台" || item.label === "手机管理" ? { ...item, label: "手机管理", icon: item.icon || "管", color: item.color || "#1d4ed8", link: adminLink } : item)
    .filter((item) => hasMobileAdminAccess || (item.label !== "管理后台" && item.label !== "手机管理" && item.link !== "/pages/admin/login" && item.link !== "/pages/admin/home"));
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

function goLogin() {
  const redirect = encodeURIComponent(getCurrentRouteWithQuery());
  uni.navigateTo({ url: `/pages/user/login?redirect=${redirect}` });
}

function scrollToRegistrations() {
  activeStatus.value = "all";
  setTimeout(() => {
    // #ifdef H5
    const target = document.querySelector(".registration-section") as HTMLElement | null;
    if (target) {
      const currentTop = document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset || 0;
      const top = Math.max(target.getBoundingClientRect().top + currentTop - 12, 0);
      const scroller = document.scrollingElement || document.documentElement || document.body;
      scroller.scrollTo({ top, behavior: "smooth" });
      document.body.scrollTop = top;
      document.documentElement.scrollTop = top;
      return;
    }
    // #endif
    uni.pageScrollTo({ selector: ".registration-section", duration: 240 });
  }, 30);
}

function goLink(url?: string, action?: string, label?: string) {
  if (action === "refresh") {
    load();
    return;
  }
  if (action === "registrations" || label === "我的报名") {
    scrollToRegistrations();
    return;
  }
  if (!url && label === "余额明细") return goWalletHelp();
  if (!url && label === "公益池") return goDecoratedLink("/pages/charity/index");
  if (!url && label === "账号设置") return goProfile();
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
  uni.navigateTo({ url: withTenantCode("/pages/user/wallet") });
}

function goProfile() {
  uni.navigateTo({ url: withTenantCode("/pages/user/profile") });
}

function displayName() {
  return profile.value?.nickname || phone.value || "我的活动";
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
  loadError.value = "";
  lastLoadedTenantCode.value = getCurrentTenantCode();
  try {
    await ensureUser();
    phone.value = uni.getStorageSync("user_phone") || "";
    const [userProfile, registrations, homepage, walletDetail, transactions, charityDetail, adminStatus] = await Promise.all([
      fetchMyProfile().catch(() => null),
      request<any[]>("/public/me/registrations").catch(() => []),
      request<HomepagePayload>("/public/page-decoration?pageKey=user_my").catch(() => ({ sections: [], fallback: true })),
      request<any>("/public/me/wallet").catch(() => null),
      request<any[]>("/public/me/wallet/transactions").catch(() => []),
      request<any>("/public/me/charity").catch(() => null),
      request<any>("/public/me/admin-access").catch(() => ({ canAccess: false }))
    ]);
    profile.value = userProfile;
    rows.value = registrations;
    homepageSections.value = homepage.sections || [];
    tenant.value = homepage.tenant || null;
    wallet.value = walletDetail;
    walletTransactions.value = transactions;
    charity.value = charityDetail;
    adminAccess.value = adminStatus;
  } catch (error: any) {
    loadError.value = error?.message || "加载个人中心失败，请重新登录后再试。";
    rows.value = [];
    uni.showToast({ title: loadError.value, icon: "none" });
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
  <view class="my-page" :class="{ 'has-custom-nav': bottomNavSection }">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />
    <PageDecorationBlocks :sections="homepageSections.filter((item) => item.enabled && item.type !== 'bottom_nav' && item.type !== 'my_page')" />

    <view class="profile" :style="{ background: myLayout.heroBackgroundColor || '#111827', color: myLayout.heroTextColor || '#ffffff' }">
      <image v-if="profile?.avatarUrl" class="avatar" :src="profile.avatarUrl" mode="aspectFill" @click="goProfile" />
      <view v-else class="avatar fallback" @click="goProfile">{{ displayName().slice(0, 1) }}</view>
      <view class="profile-info">
        <view class="hello">{{ displayName() }}</view>
        <view class="sub">{{ phone ? `当前账号 ${phone}` : (myPageSection?.subtitle || "报名、付款、审核、签到状态都在这里") }}</view>
        <view class="member-row">
          <text>{{ profile?.memberLevel?.name || "普通会员" }}</text>
          <text>{{ profile?.points || 0 }} 积分</text>
        </view>
      </view>
      <view class="edit-profile" @click="goProfile">编辑</view>
    </view>

    <view class="wallet-card">
      <view class="wallet-main">
        <view>
          <view class="wallet-label">账户余额</view>
          <view class="wallet-amount">¥{{ money(wallet?.availableBalance) }}</view>
        </view>
        <view class="wallet-action" @click="goWalletHelp">明细</view>
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

    <view class="charity-card">
      <view class="charity-main">
        <view>
          <view class="wallet-label">{{ charity?.setting?.userDisplayName || "我的公益贡献" }}</view>
          <view class="charity-amount">¥{{ money(charity?.contributionAmount) }}</view>
        </view>
        <view class="charity-badge">公益金</view>
      </view>
      <view class="charity-stats">
        <view><text>公益池累计</text><strong>¥{{ money(charity?.pool?.totalAccrued) }}</strong></view>
        <view><text>当前可用</text><strong>¥{{ money(charity?.pool?.availableAmount) }}</strong></view>
        <view><text>已拨付</text><strong>¥{{ money(charity?.pool?.totalDisbursed) }}</strong></view>
      </view>
      <view class="wallet-tip">{{ charity?.setting?.publicNote || "公益金来自平台订单收入计提，用户无需额外支付。" }}</view>
      <view class="charity-link" @click="goLink('/pages/charity/index')">查看公益池和项目进度</view>
    </view>

    <view class="tool-grid">
      <view v-for="item in toolItems" :key="item.label" class="tool" @click="goLink(item.link, item.action, item.label)">
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
      <view class="section-head">
        <view class="section-title">最近余额变动</view>
        <view class="section-link" @click="goWalletHelp">全部明细</view>
      </view>
      <view v-if="!latestWalletTransactions.length" class="flow-empty">暂无余额流水。</view>
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

    <view class="registration-section">
      <view class="section-head">
        <view class="section-title">我的报名</view>
        <view class="section-link" @click="goActivities">浏览活动</view>
      </view>
    </view>

    <view v-if="loading" class="state-card">加载中...</view>
    <view v-else-if="loadError" class="state-card">
      <view class="empty-title">需要重新登录</view>
      <view class="empty-copy">{{ loadError }}</view>
      <view class="state-actions">
        <view class="empty-button" @click="goLogin">去登录</view>
        <view class="empty-button secondary" @click="load">重新加载</view>
      </view>
    </view>
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
.my-page { min-height: 100vh; padding: 24rpx 24rpx 170rpx; background: var(--page-bg-layer, #f4f6f8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #111827); }
.profile { display: flex; align-items: center; gap: 20rpx; padding: 30rpx 28rpx; border-radius: 8px; background: #111827; color: #fff; }
.avatar { width: 104rpx; height: 104rpx; border-radius: 999px; flex: 0 0 auto; background: rgba(255,255,255,.12); }
.avatar.fallback { display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.14); color: #fff; font-size: 38rpx; font-weight: 950; }
.profile-info { min-width: 0; flex: 1; }
.hello { font-size: 42rpx; font-weight: 900; }
.sub { margin-top: 10rpx; color: rgba(255,255,255,0.72); font-size: 25rpx; }
.member-row { display: flex; gap: 12rpx; flex-wrap: wrap; margin-top: 12rpx; }
.member-row text { padding: 6rpx 12rpx; border-radius: 999px; background: rgba(255,255,255,.12); color: rgba(255,255,255,.86); font-size: 22rpx; font-weight: 800; }
.edit-profile { flex: 0 0 auto; padding: 12rpx 18rpx; border-radius: 999px; background: rgba(255,255,255,.12); color: #fff; font-size: 24rpx; font-weight: 900; }
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
.charity-card { margin-top: 20rpx; padding: 26rpx; border-radius: var(--card-radius, 8px); background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.07); border: 1px solid #dcfce7; }
.charity-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }
.charity-amount { margin-top: 8rpx; color: #15803d; font-size: 50rpx; line-height: 1; font-weight: 950; }
.charity-badge { flex: 0 0 auto; padding: 12rpx 18rpx; border-radius: 999px; background: #dcfce7; color: #15803d; font-size: 24rpx; font-weight: 900; }
.charity-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 24rpx; }
.charity-stats view { min-width: 0; display: grid; gap: 6rpx; padding: 16rpx; border-radius: 8px; background: rgba(255,255,255,.78); }
.charity-stats text { color: var(--muted-color, #667085); font-size: 22rpx; }
.charity-stats strong { color: #14532d; font-size: 25rpx; }
.charity-link { margin-top: 18rpx; color: #15803d; font-size: 25rpx; font-weight: 900; }
.tool-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin: 20rpx 0 8rpx; }
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
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 16rpx; }
.section-title { color: var(--text-color, #111827); font-size: 31rpx; font-weight: 900; }
.section-link { flex: 0 0 auto; color: var(--primary-color, #0f766e); font-size: 24rpx; font-weight: 900; }
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
.state-actions { display: flex; justify-content: center; gap: 14rpx; flex-wrap: wrap; }
.empty-button.secondary { background: #eef2f7; color: #344054; }
</style>
