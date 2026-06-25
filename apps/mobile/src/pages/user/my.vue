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
        <image class="avatar-lg" :src="profile?.avatarUrl || '/static/avatar_default.png'" mode="aspectFill" />
        <view class="member-main">
          <view class="profile-greeting" :style="{ color: profileHeaderTextColor }">{{ myPageGreeting }}</view>
          <text class="profile-nickname">{{ displayName }}</text>
          <view class="identity-line">
            <text class="profile-badge">{{ memberLevelName }}</text>
            <text class="phone-state" :class="{ missing: !profile?.phone }">{{ phoneStatusText }}</text>
          </view>
          <text class="profile-expire">{{ profileIdentityText }}</text>
        </view>
        <view class="profile-edit-btn" @click="goEdit">编辑</view>
      </view>
      <view class="member-stats">
        <view v-for="item in memberStats" :key="item.label" class="member-stat">
          <text>{{ item.label }}</text>
          <strong>{{ item.value }}</strong>
        </view>
      </view>
      <view v-if="!profile?.phone || canCompleteWechatProfile" class="member-actions">
        <view v-if="!profile?.phone" class="member-action primary" @click="openPhoneBindPanel">绑定手机号</view>
        <view v-if="canCompleteWechatProfile" class="member-action" @click="openWechatProfilePanel()">完善头像昵称</view>
      </view>
    </view>

    <AdSlotRenderer slot-key="user_my_banner" page-key="user_my" />

    <!-- 核心入口宫格 -->
    <view class="card profile-grid-card">
      <view class="grid-2x4-profile">
        <view v-for="item in gridItems" :key="item.label" class="grid-profile-item" @click="goGrid(item)">
          <view class="grid-profile-icon">{{ item.icon }}</view>
          <text class="grid-profile-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 公益基金 -->
    <view class="card charity-card" @click="goCharity">
      <view class="row">
        <view>
          <text style="font-size:30rpx; font-weight:600; color:#333;">🌱 我的公益贡献</text>
          <text style="font-size:24rpx; color:#999; display:block; margin-top:4rpx;">累计贡献 {{ money(charity?.totalAmount) }} 元</text>
        </view>
        <text class="subtle" style="color:#C43D3D;">查看详情 ›</text>
      </view>
    </view>

    <!-- 文化大使入口 -->
    <view class="card ambassador-entry" @click="goAmbassador">
      <view class="row">
        <text style="font-size:30rpx; color:#C43D3D; font-weight:600;">🏮 加入文化大使</text>
        <text style="font-size:26rpx; color:#C43D3D;">立即申请 ›</text>
      </view>
      <text style="font-size:24rpx; color:#999; margin-top:6rpx;">{{ pageBrand.slogan }}</text>
    </view>

    <!-- 用户心得入口 -->
    <view class="card community-post-entry" @click="goCommunityPosts">
      <view class="row">
        <view>
          <text class="entry-title">我的活动心得</text>
          <text class="entry-copy">查看审核状态，继续分享已通过的活动感悟。</text>
        </view>
        <text class="entry-arrow">去查看 ›</text>
      </view>
    </view>

    <!-- 订单记录 -->
    <view class="card order-card">
      <view class="row" style="margin-bottom:16rpx;">
        <text style="font-size:30rpx; font-weight:600; color:#333;">我的订单</text>
        <text class="subtle" style="color:#C43D3D;" @click="goOrders({ status: 'all' })">全部 ›</text>
      </view>
      <view class="order-tabs">
        <view v-for="tab in orderTabs" :key="tab.label" class="order-tab" @click="goOrders(tab)">
          <text style="font-size:36rpx;">{{ tab.icon }}</text>
          <text style="font-size:22rpx; color:#666;">{{ tab.label }}</text>
          <view v-if="tab.count" class="order-badge">{{ tab.count }}</view>
        </view>
      </view>
    </view>

    <!-- 余额资产入口 -->
    <view class="card" style="margin-bottom:16rpx;" @click="goWallet">
      <view class="row">
        <text style="font-size:30rpx; font-weight:600; color:#333;">💰 余额资产</text>
        <text class="subtle" style="color:#C43D3D;">查看明细 ›</text>
      </view>
      <text style="font-size:40rpx; color:#C43D3D; font-weight:700; margin-top:8rpx; display:block;">¥{{ money(wallet?.availableBalance) }}</text>
    </view>

    <!-- 手机管理入口（有权限时） -->
    <view v-if="adminAccess?.canAccess" class="card" style="margin-bottom:16rpx;" @click="goAdmin">
      <view class="row">
        <text style="font-size:30rpx; font-weight:600; color:#333;">📱 手机管理</text>
        <text class="subtle">{{ adminAccess.tenantName || "平台" }} · 活动管理 · 报名审核</text>
      </view>
    </view>

    <view v-if="isLoggedIn" class="logout-card" @click="logoutUser">
      <text>退出当前账号</text>
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
          <view v-else class="auth-avatar auth-avatar-empty">微</view>
          <text class="auth-arrow">›</text>
        </button>
        <view class="wechat-auth-row">
          <text class="auth-label">昵称</text>
          <input v-model="wechatProfileNickname" type="nickname" class="auth-nickname-input" maxlength="40" placeholder="请选择或填写微信昵称" @input="updateWechatProfileNickname" />
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
import { clearUser, ensureUser, fetchMyProfile, getUserToken, request, updateMyProfile, uploadMyAvatar } from "../../api";
import { loadPageTheme, pageBrand } from "../../theme";
import { goDecoratedLink, usePageDecoration } from "../../decoration";
import { hasWechatProfilePayload, requestWechatProfile, type WechatProfilePayload } from "../../wechat-profile";
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
const wechatProfilePanelVisible = ref(false);
const wechatProfileNickname = ref("");
const wechatProfileAvatarPath = ref("");
const wechatProfilePanelMessage = ref("请选择微信头像和昵称后继续。");
const syncingWechatProfile = ref(false);
const requestingWechatProfile = ref(false);
const phoneBindVisible = ref(false);
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
const displayName = computed(() => profile.value?.nickname || profile.value?.phone || (profile.value?.wechatBound ? `微信用户${profile.value.id}` : loadingProfile.value ? "加载中..." : "未登录"));
const memberLevelName = computed(() => profile.value?.memberLevel?.name || "普通会员");
const profileIdentityText = computed(() => {
  if (profile.value?.phone) return `手机号：${profile.value.phone}`;
  if (profile.value?.wechatBound) return "微信已登录 · 未绑定手机号";
  return "请先登录后查看权益";
});
const phoneStatusText = computed(() => profile.value?.phone ? "手机号已绑定" : "未绑定手机号");
const memberStats = computed(() => [
  { label: "积分", value: String(profile.value?.points || 0) },
  { label: "余额", value: `¥${money(wallet.value?.availableBalance)}` },
  { label: "报名", value: String(registrations.value.length) },
  { label: "订单", value: String(registrations.value.length + courseOrders.value.length + mallOrders.value.length) }
]);
function isDefaultWechatNicknameValue(value?: unknown) {
  const name = String(value || "").trim();
  return !name || /^微信用户([A-Z0-9]+)?$/i.test(name);
}
function shouldCompleteWechatProfile(row?: any) {
  return Boolean(row?.wechatBound && (!row.avatarUrl || isDefaultWechatNicknameValue(row.nickname)));
}
const isDefaultWechatNickname = computed(() => isDefaultWechatNicknameValue(profile.value?.nickname));
const canCompleteWechatProfile = computed(() => shouldCompleteWechatProfile(profile.value));
const pendingRegistrationCount = computed(() => registrations.value.filter((item) => item.status === "pending_payment").length + courseOrders.value.filter((item) => item.status === "pending_payment").length + mallOrders.value.filter((item) => ["pending_payment", "pending_confirm"].includes(item.status)).length);
const learningCourseCount = computed(() => courses.value.filter((item) => Number(item.learning?.progress || 0) < 100).length);
const completedCourseCount = computed(() => courses.value.filter((item) => Number(item.learning?.progress || 0) >= 100).length);

function money(value: string | number | undefined | null) {
  return Number(value || 0).toFixed(2);
}

async function loadProfile() {
  loadingProfile.value = true;
  try {
    await ensureUser();
    const [profileData, walletData, charityData, adminData, courseRows, registrationRows, courseOrderRows, mallOrderRows] = await Promise.all([
      fetchMyProfile(),
      request<any>("/public/me/wallet").catch(() => null),
      request<any>("/public/me/charity").catch(() => null),
      request<any>("/public/me/admin-access").catch(() => ({ canAccess: false })),
      request<any[]>("/public/me/courses").catch(() => []),
      request<any[]>("/public/me/registrations").catch(() => []),
      request<any[]>("/public/me/course-orders").catch(() => []),
      request<any[]>("/public/me/mall/orders").catch(() => [])
    ]);
    profile.value = profileData;
    wallet.value = walletData;
    charity.value = charityData;
    adminAccess.value = adminData;
    courses.value = Array.isArray(courseRows) ? courseRows : [];
    registrations.value = Array.isArray(registrationRows) ? registrationRows : [];
    courseOrders.value = Array.isArray(courseOrderRows) ? courseOrderRows : [];
    mallOrders.value = Array.isArray(mallOrderRows) ? mallOrderRows : [];
    if (shouldCompleteWechatProfile(profileData)) openWechatProfilePanel(true, profileData);
    else wechatProfilePanelVisible.value = false;
  } catch (error: any) {
    profile.value = null;
    wallet.value = null;
    charity.value = null;
    adminAccess.value = null;
    courses.value = [];
    registrations.value = [];
    courseOrders.value = [];
    mallOrders.value = [];
    if (!String(error?.message || "").includes("请先完成")) {
      uni.showToast({ title: error.message || "加载用户失败", icon: "none" });
    }
  } finally {
    loadingProfile.value = false;
  }
}

onShow(() => {
  loadPageTheme();
  loadDecoration();
  loadProfile();
});

const defaultGridItems = [
  { icon:"📖", label:"我的课程", page:"courses" },
  { icon:"🕐", label:"学习记录", page:"learning" },
  { icon:"❤", label:"商城收藏", page:"mallFavorites" },
  { icon:"👣", label:"浏览足迹", page:"mallHistory" },
  { icon:"🛒", label:"购物车", page:"mallCart" },
  { icon:"🛍", label:"商城订单", page:"mallOrders" },
  { icon:"💬", label:"联系客服", page:"service" },
  { icon:"⚙", label:"设置", page:"settings" }
];
const gridItems = computed(() => {
  const tools = myPageSection.value?.config?.tools;
  if (!Array.isArray(tools) || !tools.length) return defaultGridItems;
  return tools.slice(0, 8).map((item: any) => ({
    icon: String(item.icon || item.label || "入").slice(0, 2),
    label: String(item.label || "入口"),
    page: item.page || "",
    link: item.link || "",
    action: item.action || ""
  }));
});

const orderTabs = computed(() => [
  { icon:"💳", label:"待付款", count: pendingRegistrationCount.value, status:"pending" },
  { icon:"📚", label:"待学习", count: learningCourseCount.value, status:"learning" },
  { icon:"✅", label:"已完成", count: completedCourseCount.value, status:"completed" },
  { icon:"📋", label:"全部", count: registrations.value.length + courses.value.length + mallOrders.value.length, status:"all" }
]);

function goGrid(item: any) {
  if (item.action === "refresh") {
    loadProfile();
    return;
  }
  if (item.link) {
    goDecoratedLink(item.link, item.action);
    return;
  }
  if (!item.page) return;
  const pages: Record<string, string> = {
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
  if (pages[item.page]) uni.navigateTo({ url: pages[item.page] });
}
function goEdit() { uni.navigateTo({ url:"/pages/user/profile" }); }
function goCharity() { uni.navigateTo({ url:"/pages/charity/index" }); }
function goAmbassador() { uni.navigateTo({ url:"/pages/ambassador/index" }); }
function goWallet() { uni.navigateTo({ url:"/pages/user/wallet" }); }
function goCommunityPosts() { uni.navigateTo({ url:"/pages/user/community-posts" }); }
function goOrders(tab: any) {
  const status = tab?.status || "all";
  uni.navigateTo({ url:`/pages/user/orders?status=${status}` });
}
function goAdmin() { uni.navigateTo({ url:"/pages/admin/home" }); }
function openPhoneBindPanel() {
  phoneBindVisible.value = true;
}
function closePhoneBindPanel() {
  phoneBindVisible.value = false;
}
async function handlePhoneBound(profileData: any) {
  phoneBindVisible.value = false;
  profile.value = profileData;
  await loadProfile();
}
function resetUserState() {
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
      ? "已从微信读取头像昵称，请确认后允许同步。"
      : payload.unavailable
        ? "当前环境未自动返回微信资料，请点击头像并选择昵称。"
        : "微信未自动返回头像昵称，请点击头像并选择昵称。";
    return changed;
  } catch {
    wechatProfilePanelMessage.value = "微信资料读取失败，请点击头像并选择昵称。";
    return false;
  } finally {
    requestingWechatProfile.value = false;
  }
}
async function openWechatProfilePanel(auto = false, row: any = profile.value) {
  if (!row?.wechatBound) return;
  wechatProfileNickname.value = isDefaultWechatNicknameValue(row.nickname) ? "" : String(row.nickname || "");
  wechatProfileAvatarPath.value = String(row.avatarUrl || "");
  wechatProfilePanelMessage.value = auto ? "检测到当前仍是默认微信资料，请授权头像和昵称后继续使用会员中心。" : "请选择微信头像和昵称，保存后后台会员资料会同步更新。";
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
    uni.showToast({ title: "未选择微信头像", icon: "none" });
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
  syncingWechatProfile.value = true;
  try {
    if (avatarUrl && !isRemoteAvatar(avatarUrl)) {
      const uploaded = await uploadMyAvatar(avatarUrl);
      avatarUrl = uploaded.url;
    }
    profile.value = await updateMyProfile({ nickname, avatarUrl });
    wechatProfilePanelVisible.value = false;
    uni.showToast({ title: "微信资料已同步", icon: "success" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "同步失败", icon: "none" });
  } finally {
    syncingWechatProfile.value = false;
  }
}
function logoutUser() {
  uni.showModal({
    title: "确认退出",
    content: "退出后需要重新登录才能查看报名、订单、课程和打卡记录。",
    confirmText: "退出登录",
    success(res) {
      if (!res.confirm) return;
      clearUser();
      resetUserState();
      uni.showToast({ title: "已退出登录", icon: "none" });
    }
  });
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--page-bg, #F5F0E8);
  padding: 0 32rpx 0;
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
.member-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 24rpx;
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
.profile-edit-btn { position: absolute; bottom: 16rpx; right: 32rpx; }
.profile-edit-text { color: var(--profile-header-text, #5B2F24); font-weight: 700; }
.profile-grid-card { margin-bottom: 16rpx; }
.charity-card { margin-bottom: 16rpx; }
.ambassador-entry {
  margin-bottom: 16rpx;
  border: 2rpx solid rgba(196,61,61,0.2);
}
.community-post-entry { margin-bottom: 16rpx; }
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8rpx;
}
.order-tab {
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
</style>
