<template>
  <view class="profile-page has-custom-nav">
    <!-- 顶部用户信息 -->
    <view
      class="profile-header"
      :style="{
        background: profileHeaderBackground,
        color: profileHeaderTextColor,
        '--profile-header-text': profileHeaderTextColor,
        '--profile-header-muted': profileHeaderMutedColor
      }"
    >
      <view class="profile-greeting" :style="{ color: profileHeaderTextColor }">{{ myPageGreeting }}</view>
      <image class="avatar-lg" :src="profile?.avatarUrl || '/static/avatar_default.png'" mode="aspectFill" />
      <text class="profile-nickname">{{ displayName }}</text>
      <view class="profile-badge">{{ memberLevelName }}</view>
      <text class="profile-expire">{{ profile?.phone ? `手机号：${profile.phone}` : "请先登录后查看权益" }}</text>
      <view class="profile-edit-btn" @click="goEdit">
        <text class="subtle profile-edit-text">编辑资料  ›</text>
      </view>
    </view>

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
      <text style="font-size:24rpx; color:#999; margin-top:6rpx;">和七维书院一起，让热爱发光</text>
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

    <view style="height:120rpx;"></view>
    <TabBar current="user" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, fetchMyProfile, request } from "../../api";
import { loadPageTheme } from "../../theme";
import { goDecoratedLink, usePageDecoration } from "../../decoration";
import TabBar from "../../components/TabBar.vue";

const profile = ref<any>(null);
const wallet = ref<any>(null);
const charity = ref<any>(null);
const adminAccess = ref<any>(null);
const courses = ref<any[]>([]);
const registrations = ref<any[]>([]);
const courseOrders = ref<any[]>([]);
const loadingProfile = ref(false);
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
const displayName = computed(() => profile.value?.nickname || profile.value?.phone || (loadingProfile.value ? "加载中..." : "未登录"));
const memberLevelName = computed(() => profile.value?.memberLevel?.name || "普通会员");
const pendingRegistrationCount = computed(() => registrations.value.filter((item) => item.status === "pending_payment").length + courseOrders.value.filter((item) => item.status === "pending_payment").length);
const learningCourseCount = computed(() => courses.value.filter((item) => Number(item.learning?.progress || 0) < 100).length);
const completedCourseCount = computed(() => courses.value.filter((item) => Number(item.learning?.progress || 0) >= 100).length);

function money(value: string | number | undefined | null) {
  return Number(value || 0).toFixed(2);
}

async function loadProfile() {
  loadingProfile.value = true;
  try {
    await ensureUser();
    const [profileData, walletData, charityData, adminData, courseRows, registrationRows, courseOrderRows] = await Promise.all([
      fetchMyProfile(),
      request<any>("/public/me/wallet").catch(() => null),
      request<any>("/public/me/charity").catch(() => null),
      request<any>("/public/me/admin-access").catch(() => ({ canAccess: false })),
      request<any[]>("/public/me/courses").catch(() => []),
      request<any[]>("/public/me/registrations").catch(() => []),
      request<any[]>("/public/me/course-orders").catch(() => [])
    ]);
    profile.value = profileData;
    wallet.value = walletData;
    charity.value = charityData;
    adminAccess.value = adminData;
    courses.value = Array.isArray(courseRows) ? courseRows : [];
    registrations.value = Array.isArray(registrationRows) ? registrationRows : [];
    courseOrders.value = Array.isArray(courseOrderRows) ? courseOrderRows : [];
  } catch (error: any) {
    profile.value = null;
    wallet.value = null;
    charity.value = null;
    adminAccess.value = null;
    courses.value = [];
    registrations.value = [];
    courseOrders.value = [];
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
  { icon:"❤", label:"我的收藏", page:"favorites" },
  { icon:"🏅", label:"我的证书", page:"certificates" },
  { icon:"🎫", label:"优惠券", page:"" },
  { icon:"💬", label:"联系客服", page:"service" },
  { icon:"📣", label:"推广中心", page:"ambassador" },
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
  { icon:"📋", label:"全部", count: registrations.value.length + courses.value.length, status:"all" }
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
    certificates: "/pages/user/certificates",
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
function goOrders(tab: any) {
  const status = tab?.status || "all";
  uni.navigateTo({ url:`/pages/user/orders?status=${status}` });
}
function goAdmin() { uni.navigateTo({ url:"/pages/admin/home" }); }
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--page-bg, #F5F0E8);
  padding: 0 32rpx 0;
}
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0 24rpx;
  margin: 0 -32rpx;
  position: relative;
}
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
.profile-edit-btn { position: absolute; bottom: 16rpx; right: 32rpx; }
.profile-edit-text { color: var(--profile-header-text, #5B2F24); font-weight: 700; }
.profile-grid-card { margin-bottom: 16rpx; }
.charity-card { margin-bottom: 16rpx; }
.ambassador-entry {
  margin-bottom: 16rpx;
  border: 2rpx solid rgba(196,61,61,0.2);
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
</style>
