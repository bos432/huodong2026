<template>
  <view class="profile-page has-custom-nav">
    <SplashAd />
    <view
      class="member-card"
      :style="{
        background: profileHeaderBackground,
        color: profileHeaderTextColor,
        '--profile-header-text': profileHeaderTextColor,
        '--profile-header-muted': profileHeaderMutedColor
      }"
    >
      <view class="member-card-top">
        <image v-if="profile?.avatarUrl" class="avatar-lg" :src="profile.avatarUrl" mode="aspectFill" aria-label="会员头像" />
        <view v-else class="avatar-lg avatar-fallback">{{ displayName.slice(0, 1) }}</view>
        <view class="member-main">
          <view class="profile-greeting" :style="{ color: profileHeaderTextColor }">{{ myPageGreeting }}</view>
          <text class="profile-nickname">{{ displayName }}</text>
          <view class="identity-line">
            <text class="profile-badge">{{ memberLevelName }}</text>
            <text class="phone-state" :class="{ missing: !profile?.phone }">{{ phoneStatusText }}</text>
          </view>
          <text class="profile-expire">{{ profileIdentityText }}</text>
        </view>
        <view class="profile-edit-btn" role="button" tabindex="0" aria-label="编辑会员资料" @click="goEdit" @keyup.enter="goEdit" @keyup.space.prevent="goEdit">编辑</view>
      </view>
      <view class="member-stats">
        <view v-for="item in memberStats" :key="item.label" class="member-stat">
          <text>{{ item.label }}</text>
          <strong>{{ item.value }}</strong>
        </view>
      </view>
      <view v-if="!isLoggedIn" class="member-actions single">
        <view class="member-action primary" role="button" tabindex="0" aria-label="登录或注册" @click="goLogin" @keyup.enter="goLogin" @keyup.space.prevent="goLogin">登录/注册</view>
      </view>
      <view v-else-if="!loadingProfile && !profileError && (!profile?.phone || canCompleteWechatProfile)" class="member-actions">
        <view v-if="!profile?.phone" class="member-action primary" role="button" tabindex="0" aria-label="绑定手机号" @click="openPhoneBindPanel" @keyup.enter="openPhoneBindPanel" @keyup.space.prevent="openPhoneBindPanel">绑定手机号</view>
        <view v-if="canCompleteWechatProfile" class="member-action" role="button" tabindex="0" aria-label="完善头像昵称" @click="openWechatProfilePanel()" @keyup.enter="openWechatProfilePanel()" @keyup.space.prevent="openWechatProfilePanel()">完善头像昵称</view>
      </view>
    </view>

    <view v-if="loadingProfile && !profile" class="profile-state-card" role="status" aria-live="polite">会员资料加载中...</view>
    <view v-else-if="profileError" class="profile-state-card error-state" role="alert" aria-live="assertive">
      <text>{{ profileError }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新加载会员资料" @click="loadProfile" @keyup.enter="loadProfile" @keyup.space.prevent="loadProfile">重新加载</view>
    </view>

    <AdSlotRenderer slot-key="user_my_banner" page-key="user_my" />

    <view v-if="assetWarning" class="profile-state-card warning-state" role="status" aria-live="polite">
      <text>{{ assetWarning }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新同步会员资产" @click="loadProfile" @keyup.enter="loadProfile" @keyup.space.prevent="loadProfile">重新同步资产</view>
    </view>

    <!-- 核心入口宫格 -->
    <view class="card profile-grid-card">
      <view class="grid-2x4-profile">
        <view v-for="item in gridItems" :key="item.label" class="grid-profile-item" role="button" tabindex="0" :aria-label="item.label" @click="goGrid(item)" @keyup.enter="goGrid(item)" @keyup.space.prevent="goGrid(item)">
          <view class="grid-profile-icon">{{ item.icon }}</view>
          <text class="grid-profile-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 公益基金 -->
    <view v-if="featureGates.charity" class="card charity-card" role="button" tabindex="0" aria-label="查看我的公益贡献" @click="goCharity" @keyup.enter="goCharity" @keyup.space.prevent="goCharity">
      <view class="row">
        <view>
          <text style="font-size:30rpx; font-weight:600; color:#333;">🌱 我的公益贡献</text>
          <text style="font-size:24rpx; color:#999; display:block; margin-top:4rpx;">累计贡献 {{ charityAmountText }} 元</text>
        </view>
        <text class="subtle" style="color:#C43D3D;">查看详情 ›</text>
      </view>
    </view>

    <!-- 文化大使入口 -->
    <view v-if="featureGates.ambassador" class="card ambassador-entry" role="button" tabindex="0" aria-label="加入文化大使" @click="goAmbassador" @keyup.enter="goAmbassador" @keyup.space.prevent="goAmbassador">
      <view class="row">
        <text style="font-size:30rpx; color:#C43D3D; font-weight:600;">🏮 加入文化大使</text>
        <text style="font-size:26rpx; color:#C43D3D;">立即申请 ›</text>
      </view>
      <text style="font-size:24rpx; color:#999; margin-top:6rpx;">{{ pageBrand.slogan }}</text>
    </view>

    <!-- 用户心得入口 -->
    <view v-if="featureGates.community" class="card community-post-entry" role="button" tabindex="0" aria-label="查看我的活动心得" @click="goCommunityPosts" @keyup.enter="goCommunityPosts" @keyup.space.prevent="goCommunityPosts">
      <view class="row">
        <view>
          <text class="entry-title">我的活动心得</text>
          <text class="entry-copy">查看审核状态，继续分享已通过的活动感悟。</text>
        </view>
        <text class="entry-arrow">去查看 ›</text>
      </view>
      <view v-if="isLoggedIn" class="growth-panel">
        <view class="growth-copy"><text>成长值 {{ profile?.growthValue || 0 }}</text><text v-if="profile?.nextLevel">距 {{ profile.nextLevel.name }} 还差 {{ profile.nextLevel.remainingGrowth }}</text><text v-else>已达当前最高等级</text></view>
        <view class="growth-track"><view class="growth-fill" :style="{ width: profile?.nextLevel ? `${Math.min(100, Math.max(0, Number(profile?.growthValue || 0) / Number(profile.nextLevel.minGrowth || 1) * 100))}%` : '100%' }"></view></view>
        <view v-if="profile?.memberLevel?.expiresAt" class="growth-expire">等级有效至 {{ String(profile.memberLevel.expiresAt).replace('T', ' ').slice(0, 10) }}</view>
      </view>
    </view>
    <view v-if="featureGates.community" class="card community-post-entry" role="button" tabindex="0" aria-label="查看收藏、关注与消息" @click="goCommunitySocial" @keyup.enter="goCommunitySocial" @keyup.space.prevent="goCommunitySocial"><view class="row"><view><text class="entry-title">收藏、关注与消息</text><text class="entry-copy">查看收藏动态、关注作者和互动提醒。</text></view><text>›</text></view></view>
    <view v-if="featureGates.community || featureGates.forum" class="card community-post-entry" role="button" tabindex="0" aria-label="查看处罚与申诉" @click="goContentAppeals" @keyup.enter="goContentAppeals" @keyup.space.prevent="goContentAppeals"><view class="row"><view><text class="entry-title">处罚与申诉</text><text class="entry-copy">查看禁言、禁用记录和申诉处理进度。</text></view><text>›</text></view></view>
    <view v-if="featureGates.mall" class="card community-post-entry" role="button" tabindex="0" aria-label="申请商户入驻" @click="goMerchantApply" @keyup.enter="goMerchantApply" @keyup.space.prevent="goMerchantApply"><view class="row"><view><text class="entry-title">商户入驻</text><text class="entry-copy">提交经营主体与资质，查看平台审核结果。</text></view><text>›</text></view></view>
    <view v-if="featureGates.forum" class="card forum-post-entry" role="button" tabindex="0" aria-label="查看我的论坛" @click="goForumPosts" @keyup.enter="goForumPosts" @keyup.space.prevent="goForumPosts">
      <view class="row">
        <view>
          <text class="entry-title">我的论坛</text>
          <text class="entry-copy">查看帖子、回复和收藏，继续参与共修讨论。</text>
        </view>
        <text class="entry-arrow">去查看 ›</text>
      </view>
    </view>

    <!-- 订单记录 -->
    <view class="card order-card">
      <view class="row" style="margin-bottom:16rpx;">
        <text style="font-size:30rpx; font-weight:600; color:#333;">我的订单</text>
        <text class="subtle" role="button" tabindex="0" aria-label="查看全部订单" style="color:#C43D3D;" @click="goOrders({ status: 'all' })" @keyup.enter="goOrders({ status: 'all' })" @keyup.space.prevent="goOrders({ status: 'all' })">查看全部 ›</text>
      </view>
      <view class="order-tabs" :style="{ gridTemplateColumns: `repeat(${orderTabs.length}, minmax(0, 1fr))` }">
        <view v-for="tab in orderTabs" :key="tab.label" class="order-tab" role="button" tabindex="0" :aria-label="`查看${tab.label}订单`" @click="goOrders(tab)" @keyup.enter="goOrders(tab)" @keyup.space.prevent="goOrders(tab)">
          <text style="font-size:36rpx;">{{ tab.icon }}</text>
          <text style="font-size:22rpx; color:#666;">{{ tab.label }}</text>
          <view v-if="tab.count" class="order-badge">{{ tab.count }}</view>
        </view>
      </view>
    </view>

    <!-- 余额资产入口 -->
    <view class="card" role="button" tabindex="0" aria-label="查看余额资产明细" style="margin-bottom:16rpx;" @click="goWallet" @keyup.enter="goWallet" @keyup.space.prevent="goWallet">
      <view class="row">
        <text style="font-size:30rpx; font-weight:600; color:#333;">💰 余额资产</text>
        <text class="subtle" style="color:#C43D3D;">查看明细 ›</text>
      </view>
      <text style="font-size:40rpx; color:#C43D3D; font-weight:700; margin-top:8rpx; display:block;">{{ walletBalanceText }}</text>
    </view>

    <view v-if="isLoggedIn" class="card redemption-entry">
      <view class="row"><view><text class="entry-title">兑换权益</text><text class="entry-copy">兑换活动券、商城券或会员积分</text></view></view>
      <view class="redemption-row"><input v-model="redemptionCode" class="redemption-input" maxlength="64" cursor-spacing="24" confirm-type="done" aria-label="兑换码" placeholder="请输入兑换码" @confirm="redeemCode" /><view class="redemption-button" role="button" tabindex="0" :aria-disabled="redeeming" :aria-label="redeeming ? '兑换中' : '兑换'" :class="{ disabled: redeeming }" @click="redeemCode" @keyup.enter="redeemCode" @keyup.space.prevent="redeemCode">{{ redeeming ? "兑换中" : "兑换" }}</view></view>
      <view v-if="redemptionError" class="redemption-error" role="alert" aria-live="assertive">{{ redemptionError }}</view>
    </view>

    <!-- 手机管理入口（有权限时） -->
    <view v-if="adminAccess?.canAccess" class="card" role="button" tabindex="0" aria-label="打开手机管理" style="margin-bottom:16rpx;" @click="goAdmin" @keyup.enter="goAdmin" @keyup.space.prevent="goAdmin">
      <view class="row">
        <text style="font-size:30rpx; font-weight:600; color:#333;">📱 手机管理</text>
        <text class="subtle">{{ adminAccess.tenantName || "平台" }} · 活动管理 · 报名审核</text>
      </view>
    </view>

    <view v-if="isLoggedIn" class="logout-card" role="button" tabindex="0" aria-label="退出当前账号" :aria-busy="logoutConfirming" @click="logoutUser" @keyup.enter="logoutUser" @keyup.space.prevent="logoutUser">
      <text>{{ logoutConfirming ? "确认中..." : "退出当前账号" }}</text>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <view v-if="wechatProfilePanelVisible" class="wechat-auth-mask">
      <view class="wechat-auth-sheet">
        <view class="wechat-auth-brand">慢π</view>
        <view class="wechat-auth-title">获取你的昵称、头像和会员权限</view>
        <view class="wechat-auth-message">{{ wechatProfilePanelMessage }}</view>
        <button class="wechat-auth-row avatar-select" open-type="chooseAvatar" @chooseavatar="chooseWechatProfileAvatar">
          <text class="auth-label">头像</text>
          <image v-if="wechatProfileAvatarPath" class="auth-avatar" :src="wechatProfileAvatarPath" mode="aspectFill" />
          <view v-else class="auth-avatar auth-avatar-empty">头像</view>
          <text class="auth-arrow">›</text>
        </button>
        <view class="wechat-auth-row">
          <text class="auth-label">昵称</text>
          <input v-model="wechatProfileNickname" type="nickname" class="auth-nickname-input" maxlength="40" placeholder="请选择或填写昵称" @input="updateWechatProfileNickname" />
        </view>
        <view class="wechat-auth-actions">
          <button class="auth-action reject" :disabled="syncingWechatProfile || requestingWechatProfile" @tap="closeWechatProfilePanel">稍后再说</button>
          <button class="auth-action allow" :disabled="syncingWechatProfile || requestingWechatProfile" @tap="saveWechatProfilePanel">{{ syncingWechatProfile ? "同步中" : requestingWechatProfile ? "获取中" : "允许" }}</button>
        </view>
      </view>
    </view>
    <!-- #endif -->

    <WechatPhoneBindSheet
      :visible="phoneBindVisible"
      title="绑定手机号"
      message="报名、下单、余额和会员权益需要手机号。绑定后后台会员管理会显示完整身份状态。"
      @close="closePhoneBindPanel"
      @bound="handlePhoneBound"
    />

    <MarketingPopup />
    <view style="height:120rpx;"></view>
    <TabBar current="user" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { clearUser, getCurrentTenantCode, getUserId, getUserToken, request, updateMyProfile, uploadMyAvatar, withTenantCode } from "../../api";
import { loadPageTheme, pageBrand } from "../../theme";
import { goDecoratedLink, usePageDecoration } from "../../decoration";
import { featureGatesState, isLinkAllowedByFeature, loadFeatureGates, showFeatureDisabledToast } from "../../feature-gates";
import { hasWechatProfilePayload, requestWechatProfile, type WechatProfilePayload } from "../../wechat-profile";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { loadMemberOrderOverview, type MemberOrderSession } from "../../member-order-overview";
import TabBar from "../../components/TabBar.vue";
import WechatPhoneBindSheet from "../../components/WechatPhoneBindSheet.vue";
import MarketingPopup from "../../components/MarketingPopup.vue";
import AdSlotRenderer from "../../components/AdSlotRenderer.vue";
import SplashAd from "../../components/SplashAd.vue";

const profile = ref<any>(null);
const wallet = ref<any>(null);
const charity = ref<any>(null);
const adminAccess = ref<any>(null);
const courses = ref<any[]>([]);
const registrations = ref<any[]>([]);
const courseOrders = ref<any[]>([]);
const mallOrders = ref<any[]>([]);
const loadingProfile = ref(false);
const profileError = ref("");
const assetWarning = ref("");
const assetFailures = ref<string[]>([]);
const wechatProfilePanelVisible = ref(false);
const wechatProfileNickname = ref("");
const wechatProfileAvatarPath = ref("");
const wechatProfilePanelMessage = ref("请选择头像和昵称后继续。");
const syncingWechatProfile = ref(false);
const requestingWechatProfile = ref(false);
const phoneBindVisible = ref(false);
const redemptionCode = ref("");
const redeeming = ref(false);
const redemptionError = ref("");
const logoutConfirming = ref(false);
const loadedContextKey = ref("");
const profileLoadGuard = createTenantLoadGuard();
const featureGates = featureGatesState;
const isLoggedIn = computed(() => Boolean(profile.value?.id || getUserToken()));
const { sections, loadDecoration } = usePageDecoration("user_my", "/pages/user/my");
const myPageSection = computed(() => sections.value.find((item) => item.enabled && item.type === "my_page") || null);
const myPageGreeting = computed(() => String(myPageSection.value?.config?.greeting || "我的"));
const warmHeaderBackground = "linear-gradient(135deg, #FFF7EC 0%, #F5DDC2 52%, #E8B89D 100%)";
const warmHeaderTextColor = "#5B2F24";
const warmHeaderMutedColor = "rgba(91, 47, 36, 0.68)";
const profileHeaderBackground = computed(() => {
  const layout = myPageSection.value?.layout || {};
  const background = String(layout.heroBackgroundColor || "");
  return !background || background === "#111827" ? warmHeaderBackground : background;
});
const profileHeaderTextColor = computed(() => {
  const layout = myPageSection.value?.layout || {};
  const textColor = String(layout.heroTextColor || "");
  return !textColor || (textColor === "#ffffff" && String(layout.heroBackgroundColor || "") === "#111827") ? warmHeaderTextColor : textColor;
});
const profileHeaderMutedColor = computed(() => String(myPageSection.value?.layout?.heroMutedTextColor || warmHeaderMutedColor));
const displayName = computed(() => profile.value?.nickname || profile.value?.phone || (profile.value?.wechatBound ? `平台用户${profile.value.id}` : loadingProfile.value ? "加载中..." : getUserToken() && profileError.value ? "资料同步失败" : "未登录"));
const memberLevelName = computed(() => profile.value?.memberLevel?.name || (getUserToken() ? "普通会员" : "游客"));
const profileIdentityText = computed(() => {
  if (loadingProfile.value && !profile.value) return "正在同步会员资料";
  if (getUserToken() && profileError.value && !profile.value) return "登录状态待同步";
  if (profile.value?.phone) return `手机号：${profile.value.phone}`;
  if (profile.value?.wechatBound) return "已登录 · 未绑定手机号";
  return "请先登录后查看权益";
});
const phoneStatusText = computed(() => loadingProfile.value && !profile.value ? "资料同步中" : getUserToken() && profileError.value && !profile.value ? "状态未知" : profile.value?.phone ? "手机号已绑定" : "未绑定手机号");
const memberStats = computed(() => [
  { label: "积分", value: profile.value?.id ? String(profile.value?.points || 0) : "--" },
  { label: "成长", value: profile.value?.id ? String(profile.value?.growthValue || 0) : "--" },
  { label: "余额", value: !profile.value?.id || assetFailed("wallet") ? "--" : `¥${money(wallet.value?.availableBalance)}` },
  { label: "报名", value: !profile.value?.id || assetFailed("registrations") ? "--" : String(registrations.value.length) }
]);
const charityAmountText = computed(() => !profile.value?.id || assetFailed("charity") ? "--" : money(charity.value?.totalAmount));
const walletBalanceText = computed(() => !profile.value?.id || assetFailed("wallet") ? "¥--" : `¥${money(wallet.value?.availableBalance)}`);
function isDefaultWechatNicknameValue(value?: unknown) {
  const name = String(value || "").trim();
  const legacyDefaultNamePattern = new RegExp(`^${["微", "信", "用户"].join("")}([A-Z0-9]+)?$`, "i");
  return !name || legacyDefaultNamePattern.test(name);
}
function shouldCompleteWechatProfile(row?: any) {
  return Boolean(row?.wechatBound && (!row.avatarUrl || isDefaultWechatNicknameValue(row.nickname)));
}
const isDefaultWechatNickname = computed(() => isDefaultWechatNicknameValue(profile.value?.nickname));
const canCompleteWechatProfile = computed(() => shouldCompleteWechatProfile(profile.value));
const pendingOrderCount = computed(() => ["registrations", "courseOrders"].some(assetFailed) ? null
  : registrations.value.filter((item) => item.status === "pending_payment" || ["pending", "processing"].includes(String(item.latestRefund?.status || ""))).length
    + courseOrders.value.filter((item) => item.status === "pending_payment" || ["pending", "approved", "processing", "failed"].includes(String(item.latestRefund?.status || ""))).length);
const learningCourseCount = computed(() => ["courses", "courseOrders"].some(assetFailed) ? null : courseOrders.value.filter(courseOrderIsLearning).length + learningOnlyCourses().filter((item) => Number(item.learning?.progress || 0) < 100).length);
const completedOrderCount = computed(() => ["registrations", "courses", "courseOrders"].some(assetFailed) ? null
  : registrations.value.filter(activityOrderIsCompleted).length
    + courseOrders.value.filter(courseOrderIsCompleted).length
    + learningOnlyCourses().filter((item) => Number(item.learning?.progress || 0) >= 100).length);

function memberSession(): MemberOrderSession {
  return { tenantCode: getCurrentTenantCode(), userId: getUserId(), userToken: getUserToken() };
}

function sessionKey(session = memberSession()) {
  return `${session.tenantCode}:${session.userId || "guest"}:${session.userToken || "anonymous"}`;
}

function isCurrentSession(session: MemberOrderSession) {
  return getCurrentTenantCode() === session.tenantCode && getUserId() === session.userId && getUserToken() === session.userToken;
}

function learningOnlyCourses() {
  return courses.value.filter((course) => !courseOrders.value.some((order) => Number(order.course?.id) === Number(course.id)));
}

function courseProgress(order: any) {
  return Number(courses.value.find((course) => Number(course.id) === Number(order.course?.id))?.learning?.progress || 0);
}

function courseOrderIsLearning(order: any) {
  const owned = order.owned === undefined ? order.status === "paid" : Boolean(order.owned);
  const refundStatus = String(order.latestRefund?.status || "");
  if (!owned || courseProgress(order) >= 100 || ["pending", "approved", "processing", "failed", "completed"].includes(refundStatus)) return false;
  if (refundStatus === "rejected") return order.status === "partially_refunded";
  return order.status !== "pending_payment";
}

function courseOrderIsCompleted(order: any) {
  const owned = order.owned === undefined ? order.status === "paid" : Boolean(order.owned);
  return order.latestRefund?.status === "completed" || owned && courseProgress(order) >= 100;
}

function activityOrderIsCompleted(item: any) {
  const refundStatus = String(item.latestRefund?.status || "");
  if (refundStatus) return refundStatus === "completed";
  return ["approved", "checked_in", "paid", "completed"].includes(String(item.status || ""));
}

function money(value: string | number | undefined | null) {
  return Number(value || 0).toFixed(2);
}

function assetFailed(key: string) {
  return assetFailures.value.includes(key);
}

async function loadProfile() {
  const loadToken = profileLoadGuard.begin();
  const requestedSession = memberSession();
  const isCurrentLoad = () => profileLoadGuard.isCurrent(loadToken) && isCurrentSession(requestedSession);
  if (loadedContextKey.value && loadedContextKey.value !== sessionKey(requestedSession)) resetUserState();
  loadingProfile.value = true;
  profileError.value = "";
  assetWarning.value = "";
  assetFailures.value = [];
  try {
    if (!getUserToken()) {
      clearUser();
      resetUserState();
      return;
    }
    const gates = featureGatesState.value;
    if (!gates.charity) charity.value = null;
    if (!gates.courses) {
      courses.value = [];
      courseOrders.value = [];
    }
    if (!gates.mall) mallOrders.value = [];
    const results = await Promise.allSettled([
      request<any>("/public/me/profile"),
      request<any>("/public/me/wallet"),
      gates.charity ? request<any>("/public/me/charity") : Promise.resolve(null),
      request<any>("/public/me/admin-access"),
      loadMemberOrderOverview(requestedSession),
      gates.mall ? request<any[]>("/public/me/mall/orders") : Promise.resolve([])
    ]);
    if (!isCurrentLoad()) return;
    const profileResult = results[0];
    if (profileResult.status === "rejected") throw profileResult.reason;
    if (!profileResult.value || typeof profileResult.value !== "object" || !Number(profileResult.value.id)) throw new Error("会员资料格式异常，请重新加载");
    profile.value = profileResult.value;
    const failures: string[] = [];
    const failedLabels: string[] = [];
    const applyResult = <T,>(index: number, key: string, label: string, validate: (value: unknown) => boolean, apply: (value: T) => void, reset: () => void) => {
      const result = results[index];
      if (result.status === "fulfilled" && validate(result.value)) apply(result.value as T);
      else {
        reset();
        failures.push(key);
        failedLabels.push(label);
      }
    };
    const isObject = (value: unknown) => Boolean(value && typeof value === "object" && !Array.isArray(value));
    applyResult<any>(1, "wallet", "钱包", isObject, (value) => { wallet.value = value; }, () => { wallet.value = null; });
    if (gates.charity) applyResult<any>(2, "charity", "公益贡献", isObject, (value) => { charity.value = value; }, () => { charity.value = null; });
    applyResult<any>(3, "adminAccess", "管理权限", isObject, (value) => { adminAccess.value = value; }, () => { adminAccess.value = { canAccess: false }; });
    const orderOverviewResult = results[4];
    if (orderOverviewResult.status === "fulfilled") {
      registrations.value = orderOverviewResult.value.registrations;
      courses.value = gates.courses ? orderOverviewResult.value.courses : [];
      courseOrders.value = gates.courses ? orderOverviewResult.value.courseOrders : [];
    } else {
      registrations.value = [];
      courses.value = [];
      courseOrders.value = [];
      failures.push("registrations", "courses", "courseOrders");
      failedLabels.push("报名与订单");
    }
    if (gates.mall) applyResult<any[]>(5, "mallOrders", "商城订单", Array.isArray, (value) => { mallOrders.value = value; }, () => { mallOrders.value = []; });
    assetFailures.value = failures;
    assetWarning.value = failedLabels.length ? `部分会员资产同步失败：${failedLabels.join("、")}。对应数值暂不作为真实数据展示。` : "";
    loadedContextKey.value = sessionKey(requestedSession);
    wechatProfilePanelVisible.value = false;
  } catch (error: any) {
    if (!profileLoadGuard.isCurrent(loadToken)) return;
    if (!isCurrentSession(requestedSession)) {
      if (!getUserToken()) resetUserState();
      return;
    }
    const message = String(error?.message || "");
    if (message.includes("登录凭证无效") || message.includes("登录已过期") || message.includes("登录已失效") || message.includes("请先完成")) {
      clearUser();
      resetUserState();
      return;
    }
    profileError.value = error?.message || "会员资料加载失败，请稍后重试。";
  } finally {
    if (isCurrentLoad()) loadingProfile.value = false;
  }
}

onShow(() => {
  loadPageTheme();
  profileLoadGuard.invalidate();
  const shownSession = memberSession();
  if (loadedContextKey.value && loadedContextKey.value !== sessionKey(shownSession)) resetUserState();
  void (async () => {
    await Promise.allSettled([loadFeatureGates(true), loadDecoration(), loadProfile()]);
  })();
});

const defaultGridItems = [
  { icon:"📖", label:"我的内容", page:"courses" },
  { icon:"🕐", label:"浏览记录", page:"learning" },
  { icon:"❤", label:"商城收藏", page:"mallFavorites" },
  { icon:"👣", label:"浏览足迹", page:"mallHistory" },
  { icon:"🛒", label:"购物车", page:"mallCart" },
  { icon:"🛍", label:"商城订单", page:"mallOrders" },
  { icon:"💬", label:"联系客服", page:"service" },
  { icon:"⚙", label:"设置", page:"settings" }
];

const gridPageUrls: Record<string, string> = {
  courses: "/pages/user/courses",
  learning: "/pages/user/learning",
  favorites: "/pages/user/favorites",
  mallFavorites: "/pages/mall/favorites",
  mallHistory: "/pages/mall/history",
  certificates: "/pages/user/certificates",
  mallCart: "/pages/mall/cart",
  mallOrders: "/pages/user/mall-orders",
  mallAddresses: "/pages/mall/addresses",
  service: "/pages/service/index",
  ambassador: "/pages/ambassador/index",
  settings: "/pages/user/settings"
};

function gridItemTarget(item: any) {
  return String(item?.link || gridPageUrls[item?.page] || "");
}

async function redeemCode() {
  const code = redemptionCode.value.trim();
  if (!code || redeeming.value) return uni.showToast({ title: "请输入兑换码", icon: "none" });
  const session = memberSession();
  if (!session.userId || !session.userToken) return goLogin();
  redeeming.value = true;
  redemptionError.value = "";
  try {
    const result = await request<any>("/public/redemption-codes/redeem", { method: "POST", data: { code } });
    if (!isCurrentSession(session)) return;
    redemptionCode.value = "";
    await loadProfile();
    if (!isCurrentSession(session)) return;
    const text = result?.benefit?.type === "points" ? `已获得 ${result.benefit.points} 积分` : `已获得${result?.benefit?.couponName || "优惠券"}`;
    uni.showModal({ title: "兑换成功", content: text, showCancel: false });
  } catch (error: any) {
    if (isCurrentSession(session)) redemptionError.value = String(error?.message || "兑换失败");
  } finally {
    if (isCurrentSession(session)) redeeming.value = false;
  }
}

const gridItems = computed(() => {
  const tools = myPageSection.value?.config?.tools;
  const rows = !Array.isArray(tools) || !tools.length ? defaultGridItems : tools.map((item: any) => ({
    icon: String(item.icon || item.label || "入").slice(0, 2),
    label: String(item.label || "入口"),
    page: item.page || "",
    link: item.link || "",
    action: item.action || ""
  }));
  return rows.filter((item) => isLinkAllowedByFeature(gridItemTarget(item))).slice(0, 8);
});

const orderTabs = computed(() => {
  const rows = [{ icon:"💳", label:"待处理", count: pendingOrderCount.value, status:"pending" }];
  if (featureGatesState.value.courses) {
    rows.push({ icon:"📚", label:"待观看", count: learningCourseCount.value, status:"learning" });
    rows.push({ icon:"✅", label:"已完成", count: completedOrderCount.value, status:"completed" });
  }
  return rows;
});

const protectedGridPages = new Set(["courses", "learning", "favorites", "mallFavorites", "mallHistory", "certificates", "mallCart", "mallOrders", "mallAddresses", "settings"]);
const protectedPageUrls = new Set([
  "/pages/mall/cart",
  "/pages/mall/addresses",
  "/pages/mall/favorites",
  "/pages/mall/history"
]);

function routePath(url: string) {
  return String(url || "").split("?")[0];
}

function needsLoginForUrl(url: string) {
  const path = routePath(url);
  if (path.startsWith("/pages/user/") && !["/pages/user/my", "/pages/user/login"].includes(path)) return true;
  return protectedPageUrls.has(path);
}

function goLogin(redirect: unknown = "/pages/user/my") {
  const target = typeof redirect === "string" ? redirect : "/pages/user/my";
  uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${encodeURIComponent(target)}`) });
}

function requireLogin(redirect = "/pages/user/my") {
  if (getUserToken()) return false;
  goLogin(redirect);
  return true;
}

function navigateProtected(url: string) {
  if (!isLinkAllowedByFeature(url)) {
    showFeatureDisabledToast(url);
    return;
  }
  if (requireLogin(url)) return;
  uni.navigateTo({ url: withTenantCode(url) });
}

function goGrid(item: any) {
  if (item.action === "refresh") {
    loadProfile();
    return;
  }
  if (item.link) {
    if (needsLoginForUrl(item.link) && requireLogin(item.link)) return;
    goDecoratedLink(item.link, item.action);
    return;
  }
  if (!item.page) return;
  const target = gridPageUrls[item.page];
  if (!target) return;
  if (protectedGridPages.has(item.page) || needsLoginForUrl(target)) navigateProtected(target);
  else uni.navigateTo({ url: withTenantCode(target) });
}
function goEdit() {
  navigateProtected("/pages/user/profile");
}
function goCharity() { goDecoratedLink("/pages/charity/index"); }
function goAmbassador() { goDecoratedLink("/pages/ambassador/index"); }
function goWallet() { navigateProtected("/pages/user/wallet"); }
function goCommunityPosts() { navigateProtected("/pages/user/community-posts"); }
function goCommunitySocial() { navigateProtected("/pages/user/community-social"); }
function goContentAppeals() { navigateProtected("/pages/user/content-appeals"); }
function goMerchantApply() { navigateProtected("/pages/mall/merchant-apply"); }
function goForumPosts() { navigateProtected("/pages/user/forum-posts"); }
function goOrders(tab: any) {
  const status = tab?.status || "all";
  navigateProtected(`/pages/user/orders?status=${status}`);
}
function goAdmin() { uni.navigateTo({ url:"/pages/admin/home" }); }
function openPhoneBindPanel() {
  if (requireLogin()) return;
  phoneBindVisible.value = true;
}
function closePhoneBindPanel() {
  phoneBindVisible.value = false;
}
async function handlePhoneBound(profileData: any) {
  phoneBindVisible.value = false;
  if (Number(profileData?.id || 0) !== getUserId()) return;
  profile.value = profileData;
  await loadProfile();
}
function resetUserState() {
  loadingProfile.value = false;
  profile.value = null;
  wallet.value = null;
  charity.value = null;
  adminAccess.value = null;
  courses.value = [];
  registrations.value = [];
  courseOrders.value = [];
  mallOrders.value = [];
  wechatProfilePanelVisible.value = false;
  syncingWechatProfile.value = false;
  requestingWechatProfile.value = false;
  phoneBindVisible.value = false;
  profileError.value = "";
  assetWarning.value = "";
  assetFailures.value = [];
  redemptionCode.value = "";
  redeeming.value = false;
  redemptionError.value = "";
  logoutConfirming.value = false;
  loadedContextKey.value = "";
}
function inputValue(event: any) {
  return String(event?.detail?.value ?? event?.target?.value ?? "");
}
function isRemoteAvatar(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/uploads/");
}
function applyWechatProfilePayload(payload: WechatProfilePayload) {
  let changed = false;
  const nickname = String(payload.nickname || "").trim();
  if (nickname && isDefaultWechatNicknameValue(wechatProfileNickname.value)) {
    wechatProfileNickname.value = nickname.slice(0, 40);
    changed = true;
  }
  const avatarUrl = String(payload.avatarUrl || "").trim();
  if (avatarUrl && !wechatProfileAvatarPath.value.trim()) {
    wechatProfileAvatarPath.value = avatarUrl;
    changed = true;
  }
  return changed;
}
async function tryRequestWechatProfile() {
  if (requestingWechatProfile.value || syncingWechatProfile.value) return false;
  requestingWechatProfile.value = true;
  try {
    const payload = await requestWechatProfile();
    const changed = payload.authorized && hasWechatProfilePayload(payload) && applyWechatProfilePayload(payload);
    wechatProfilePanelMessage.value = changed
      ? "已读取头像昵称，请确认后允许同步。"
      : payload.unavailable
        ? "当前环境未自动返回资料，请点击头像并选择昵称。"
        : "未自动返回头像昵称，请点击头像并选择昵称。";
    return changed;
  } catch {
    wechatProfilePanelMessage.value = "资料读取失败，请点击头像并选择昵称。";
    return false;
  } finally {
    requestingWechatProfile.value = false;
  }
}
async function openWechatProfilePanel(auto = false, row: any = profile.value) {
  if (!row?.wechatBound) return;
  wechatProfileNickname.value = isDefaultWechatNicknameValue(row.nickname) ? "" : String(row.nickname || "");
  wechatProfileAvatarPath.value = String(row.avatarUrl || "");
  wechatProfilePanelMessage.value = auto ? "检测到当前仍是默认资料，请补充头像和昵称后继续使用会员中心。" : "请选择头像和昵称，保存后后台会员资料会同步更新。";
  wechatProfilePanelVisible.value = true;
  if (!auto) await tryRequestWechatProfile();
}
function closeWechatProfilePanel() {
  if (syncingWechatProfile.value || requestingWechatProfile.value) return;
  wechatProfilePanelVisible.value = false;
}
function chooseWechatProfileAvatar(event: any) {
  const filePath = String(event?.detail?.avatarUrl || "");
  if (!filePath) {
    uni.showToast({ title: "未选择头像", icon: "none" });
    return;
  }
  wechatProfileAvatarPath.value = filePath;
}
function updateWechatProfileNickname(event: any) {
  wechatProfileNickname.value = inputValue(event).slice(0, 40);
}
async function saveWechatProfilePanel() {
  if ((!wechatProfileNickname.value.trim() || !wechatProfileAvatarPath.value.trim()) && !requestingWechatProfile.value) {
    await tryRequestWechatProfile();
  }
  const nickname = wechatProfileNickname.value.trim();
  let avatarUrl = wechatProfileAvatarPath.value.trim();
  if (!nickname || !avatarUrl) {
    uni.showToast({ title: "请选择头像并填写昵称", icon: "none" });
    return;
  }
  const session = memberSession();
  syncingWechatProfile.value = true;
  try {
    if (avatarUrl && !isRemoteAvatar(avatarUrl)) {
      const uploaded = await uploadMyAvatar(avatarUrl);
      if (!isCurrentSession(session)) return;
      avatarUrl = uploaded.url;
    }
    const updatedProfile = await updateMyProfile({ nickname, avatarUrl });
    if (!isCurrentSession(session)) return;
    profile.value = updatedProfile;
    wechatProfilePanelVisible.value = false;
    uni.showToast({ title: "资料已同步", icon: "success" });
  } catch (error: any) {
    if (isCurrentSession(session)) uni.showToast({ title: error.message || "同步失败", icon: "none" });
  } finally {
    syncingWechatProfile.value = false;
  }
}
function logoutUser() {
  if (logoutConfirming.value) return;
  logoutConfirming.value = true;
  uni.showModal({
    title: "确认退出",
    content: "退出后需要重新登录才能查看报名、订单、内容和打卡记录。",
    confirmText: "退出登录",
    success(res) {
      if (!res.confirm) {
        logoutConfirming.value = false;
        return;
      }
      profileLoadGuard.invalidate();
      clearUser();
      resetUserState();
      uni.showToast({ title: "已退出登录", icon: "none" });
    },
    fail() { logoutConfirming.value = false; }
  });
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--page-bg, #F5F0E8);
  box-sizing: border-box;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 0 32rpx calc(120rpx + env(safe-area-inset-bottom));
  overflow-wrap: anywhere;
}
.member-card {
  margin: 0 -32rpx 18rpx;
  padding: 38rpx 32rpx 28rpx;
  box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.12);
}
.member-card-top {
  display: grid;
  grid-template-columns: 120rpx minmax(0, 1fr) 82rpx;
  align-items: center;
  gap: 20rpx;
}
.member-main { min-width: 0; display: grid; gap: 8rpx; }
.identity-line { display: flex; align-items: center; flex-wrap: wrap; gap: 10rpx; }
.phone-state {
  min-height: 36rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
  font-size: 21rpx;
  font-weight: 900;
}
.phone-state.missing {
  background: rgba(196, 61, 61, 0.12);
  color: #b42318;
}
.member-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 28rpx;
}
.member-stat {
  min-height: 92rpx;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 6rpx;
  border-radius: 16rpx;
  background: rgba(255, 250, 242, 0.54);
  border: 1rpx solid rgba(139, 63, 50, 0.12);
}
.member-stat text { color: var(--profile-header-muted, rgba(91, 47, 36, 0.68)); font-size: 22rpx; }
.member-stat strong { color: var(--profile-header-text, #5B2F24); font-size: 27rpx; line-height: 1.2; }
.growth-panel { margin-top: 18rpx; }.growth-copy { display: flex; justify-content: space-between; gap: 16rpx; color: var(--profile-header-muted, rgba(91,47,36,.68)); font-size: 21rpx; }.growth-track { height: 10rpx; margin-top: 10rpx; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.45); }.growth-fill { height: 100%; border-radius: inherit; background: var(--profile-header-text, #5B2F24); transition: width .25s ease; }.growth-expire { margin-top: 8rpx; color: var(--profile-header-muted, rgba(91,47,36,.68)); font-size: 20rpx; }
.member-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 24rpx;
}
.member-actions.single {
  grid-template-columns: 1fr;
}
.member-action {
  min-height: 74rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: rgba(255, 250, 242, 0.7);
  color: #8b3f32;
  font-size: 25rpx;
  font-weight: 900;
  border: 1rpx solid rgba(139, 63, 50, 0.16);
}
.member-action.primary {
  background: #16a34a;
  color: #fff;
  border-color: #16a34a;
}
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0 24rpx;
  margin: 0 -32rpx;
  position: relative;
}
.wechat-complete-card {
  display: grid;
  grid-template-columns: 76rpx minmax(0, 1fr) auto;
  align-items: center;
  gap: 18rpx;
  margin: 18rpx 0 16rpx;
  padding: 22rpx 24rpx;
  border-radius: 20rpx;
  background: #fffaf2;
  border: 1rpx solid rgba(196, 61, 61, 0.24);
  box-shadow: 0 10rpx 28rpx rgba(72, 55, 38, 0.08);
}
.wechat-complete-icon {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
  font-size: 28rpx;
  font-weight: 950;
}
.wechat-complete-copy { min-width: 0; }
.wechat-complete-title { color: #5B2F24; font-size: 28rpx; font-weight: 950; }
.wechat-complete-sub { margin-top: 6rpx; color: #8f8172; font-size: 23rpx; line-height: 1.45; }
.wechat-complete-action { color: #C43D3D; font-size: 25rpx; font-weight: 900; }
.profile-greeting { font-size: 38rpx; font-weight: 900; margin-bottom: 16rpx; }
.profile-nickname { font-size: 32rpx; font-weight: 600; color: var(--profile-header-text, #5B2F24); margin-top: 12rpx; }
.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 250, 242, 0.82);
  color: #8b4a3e;
  font-size: 46rpx;
  font-weight: 950;
}
.profile-badge {
  background: rgba(196, 61, 61, 0.94);
  color: #fff;
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  margin-top: 8rpx;
}
.profile-expire { font-size: 24rpx; color: var(--profile-header-muted, rgba(91, 47, 36, 0.68)); margin-top: 6rpx; }
.wechat-profile-sync {
  margin-top: 14rpx;
  min-height: 54rpx;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: rgba(255, 250, 242, 0.72);
  color: #8b3f32;
  font-size: 24rpx;
  font-weight: 900;
  border: 1rpx solid rgba(139, 63, 50, 0.18);
}
.profile-edit-btn { position: absolute; bottom: 16rpx; right: 32rpx; min-width: 72rpx; min-height: 56rpx; display: flex; align-items: center; justify-content: center; overflow-wrap: anywhere; }
.profile-edit-text { color: var(--profile-header-text, #5B2F24); font-weight: 700; }
.profile-grid-card { margin-bottom: 16rpx; }
.charity-card { margin-bottom: 16rpx; }
.ambassador-entry {
  margin-bottom: 16rpx;
  border: 2rpx solid rgba(196,61,61,0.2);
}
.community-post-entry, .forum-post-entry { margin-bottom: 16rpx; }
.entry-title {
  display: block;
  color: #263d3c;
  font-size: 30rpx;
  font-weight: 900;
}
.entry-copy {
  display: block;
  margin-top: 8rpx;
  color: #8f8172;
  font-size: 24rpx;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.entry-arrow {
  flex-shrink: 0;
  color: #C43D3D;
  font-size: 25rpx;
  font-weight: 900;
}
.order-card { margin-bottom: 16rpx; }
.order-tabs {
  display: grid;
  gap: 8rpx;
}
.order-tab {
  min-width: 0;
  min-height: 76rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  position: relative;
}
.order-badge {
  position: absolute;
  top: -8rpx;
  right: 8rpx;
  background: #C43D3D;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 999px;
  min-width: 28rpx;
  text-align: center;
}
.logout-card {
  margin: 8rpx 0 16rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.82);
  border: 1rpx solid rgba(196, 61, 61, 0.22);
  color: #C43D3D;
  font-size: 28rpx;
  font-weight: 800;
}
.wechat-auth-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.46);
}
.wechat-auth-sheet {
  width: 100%;
  max-width: 760rpx;
  padding: 34rpx 42rpx 28rpx;
  border-radius: 28rpx 28rpx 0 0;
  background: #fff;
  box-shadow: 0 -18rpx 50rpx rgba(15, 23, 42, 0.14);
}
.wechat-auth-brand { color: #8b4a3e; font-size: 26rpx; font-weight: 900; }
.wechat-auth-title { margin-top: 22rpx; color: #111827; font-size: 34rpx; font-weight: 950; line-height: 1.45; }
.wechat-auth-message { margin-top: 14rpx; color: #8f8172; font-size: 24rpx; line-height: 1.55; }
.wechat-auth-row {
  min-height: 104rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-bottom: 1rpx solid #ececec;
  border-radius: 0;
  background: #fff;
  color: #111827;
  line-height: normal;
}
.wechat-auth-row::after { border: 0; }
.avatar-select { width: 100%; }
.auth-label { width: 100rpx; flex: 0 0 auto; color: #111827; font-size: 28rpx; font-weight: 700; text-align: left; }
.auth-avatar {
  width: 72rpx;
  height: 72rpx;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #f1e3d0;
}
.auth-avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b4a3e;
  font-size: 26rpx;
  font-weight: 900;
}
.auth-arrow { margin-left: auto; color: #8f8172; font-size: 44rpx; line-height: 1; }
.auth-nickname-input { flex: 1; min-width: 0; height: 92rpx; color: #111827; font-size: 28rpx; text-align: left; }
.wechat-auth-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-top: 32rpx; }
.auth-action {
  height: 84rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 900;
  line-height: 84rpx;
}
.auth-action::after { border: 0; }
.auth-action.reject { background: #f3f4f6; color: #111827; }
.auth-action.allow { background: #16a34a; color: #fff; }
.auth-action[disabled] { opacity: .62; }
.redemption-entry { margin-bottom: 16rpx; }
.redemption-row { display: grid; grid-template-columns: 1fr 150rpx; gap: 12rpx; margin-top: 18rpx; }
.redemption-input { height: 76rpx; min-width: 0; box-sizing: border-box; padding: 0 20rpx; border: 1rpx solid #ead8c5; border-radius: 12rpx; background: #fffaf3; font-size: 26rpx; overflow-wrap: anywhere; }
.redemption-button { display: flex; align-items: center; justify-content: center; border-radius: 12rpx; background: #c43d3d; color: #fff; font-size: 26rpx; font-weight: 800; }
.redemption-button.disabled { opacity: .6; }
.redemption-error { margin-top:12rpx; color:#b91c1c; font-size:23rpx; line-height:1.45; }
.profile-state-card { display:grid; gap:10rpx; margin:0 0 16rpx; padding:20rpx 22rpx; border-radius:8px; background:#fff; color:#667085; font-size:24rpx; line-height:1.55; }
.profile-state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.profile-state-card.warning-state { border:1rpx solid #fed7aa; background:#fffaf0; color:#9a3412; }
.state-retry { width:max-content; color:#C43D3D; font-weight:900; }
</style>
