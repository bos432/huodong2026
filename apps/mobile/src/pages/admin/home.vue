<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { activityStatusText, type ActivityStatus } from "@activity/shared";
import { clearMobileAdminSession, getMobileAdminSession, mobileAdminRequest, requireMobileAdmin } from "../../mobile-admin";

const loading = ref(true);
const bootstrap = ref<any>(null);
const dashboard = ref<any>(null);
const activities = ref<any[]>([]);
const session = computed(() => getMobileAdminSession());
const canWrite = computed(() => Boolean(bootstrap.value?.permissions?.canWriteActivities));
const canViewRegistrations = computed(() => Boolean(bootstrap.value?.permissions?.canViewRegistrations));
const canViewOrders = computed(() => Boolean(bootstrap.value?.permissions?.canViewOrders));
const canCheckIn = computed(() => Boolean(bootstrap.value?.permissions?.canCheckIn));

function statusText(status: ActivityStatus) {
  return activityStatusText[status] || status;
}

function goCreate() {
  uni.navigateTo({ url: "/pages/admin/activity/edit" });
}

function goList() {
  uni.navigateTo({ url: "/pages/admin/activity/list" });
}

function goRegistrations() {
  uni.navigateTo({ url: "/pages/admin/registrations" });
}

function goOrders() {
  uni.navigateTo({ url: "/pages/admin/orders" });
}

function goCheckIn() {
  uni.navigateTo({ url: "/pages/admin/check-in" });
}

function goEdit(id: number) {
  uni.navigateTo({ url: `/pages/admin/activity/edit?id=${id}` });
}

function logout() {
  clearMobileAdminSession();
  uni.redirectTo({ url: "/pages/admin/login" });
}

async function load() {
  requireMobileAdmin();
  loading.value = true;
  try {
    const [boot, dash, list] = await Promise.all([
      mobileAdminRequest<any>("/admin/mobile/bootstrap"),
      mobileAdminRequest<any>("/admin/dashboard").catch(() => null),
      mobileAdminRequest<any>("/admin/activities?page=1&pageSize=5").catch(() => ({ items: [] }))
    ]);
    bootstrap.value = boot;
    dashboard.value = dash;
    activities.value = list.items || [];
  } catch (err: any) {
    uni.showToast({ title: err.message || "加载失败", icon: "none" });
    if (err.statusCode === 401 || err.statusCode === 403) uni.redirectTo({ url: "/pages/admin/login" });
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <view class="admin-page">
    <view class="top">
      <view>
        <view class="hello">手机管理</view>
        <view class="sub">{{ bootstrap?.admin?.username || session?.role }} · {{ bootstrap?.admin?.tenant?.name || "平台管理员" }}</view>
      </view>
      <view class="logout" @click="logout">退出</view>
    </view>

    <view v-if="loading" class="panel">加载中...</view>
    <template v-else>
      <view class="stats">
        <view><text>{{ dashboard?.overview?.activityCount || 0 }}</text><text>活动</text></view>
        <view><text>{{ dashboard?.todos?.pendingActivityCount || 0 }}</text><text>待审活动</text></view>
        <view><text>{{ dashboard?.overview?.registrationCount || 0 }}</text><text>报名</text></view>
        <view><text>{{ dashboard?.operations?.monthRegistrationCount || 0 }}</text><text>本月报名</text></view>
      </view>

      <view class="actions">
        <view class="action primary" :class="{ disabled: !canWrite }" @click="canWrite && goCreate()">发布活动</view>
        <view class="action" @click="goList">活动管理</view>
        <view v-if="canViewRegistrations" class="action" @click="goRegistrations">报名审核</view>
        <view v-if="canCheckIn" class="action" @click="goCheckIn">签到核销</view>
        <view v-if="canViewOrders" class="action" @click="goOrders">订单查看</view>
      </view>

      <view v-if="!canWrite" class="notice">当前账号可查看活动，但没有手机端创建和编辑权限。</view>

      <view class="section-title">最近活动</view>
      <view v-for="item in activities" :key="item.id" class="activity" @click="goEdit(item.id)">
        <view>
          <view class="name">{{ item.title }}</view>
          <view class="meta">{{ item.tenant?.name || "平台" }} · {{ item.location || "-" }}</view>
        </view>
        <view class="pill">{{ statusText(item.status) }}</view>
      </view>
      <view v-if="!activities.length" class="panel">暂无活动</view>
    </template>
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; padding: 24rpx; background: #f4f6f8; color: #111827; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 30rpx 26rpx; border-radius: 8px; background: #111827; color: #fff; }
.hello { font-size: 42rpx; font-weight: 900; }
.sub { margin-top: 8rpx; color: rgba(255,255,255,.72); font-size: 24rpx; }
.logout { flex: 0 0 auto; padding: 12rpx 20rpx; border-radius: 999px; background: rgba(255,255,255,.12); font-size: 24rpx; font-weight: 800; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; margin: 22rpx 0; }
.stats view, .panel, .activity { border-radius: 8px; background: #fff; box-shadow: 0 12rpx 34rpx rgba(15,23,42,.06); }
.stats view { display: grid; gap: 6rpx; justify-items: center; padding: 20rpx 8rpx; }
.stats text:first-child { color: #0f766e; font-size: 32rpx; font-weight: 900; }
.stats text:last-child { color: #667085; font-size: 22rpx; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-bottom: 20rpx; }
.action { height: 86rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: #fff; color: #0f766e; font-size: 28rpx; font-weight: 900; }
.action.primary { background: #0f766e; color: #fff; }
.action.disabled { opacity: .5; }
.notice, .panel { padding: 24rpx; color: #667085; font-size: 25rpx; }
.section-title { margin: 28rpx 0 14rpx; font-size: 30rpx; font-weight: 900; }
.activity { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 16rpx; padding: 22rpx; }
.name { font-size: 28rpx; font-weight: 900; line-height: 1.4; }
.meta { margin-top: 8rpx; color: #667085; font-size: 23rpx; }
.pill { flex: 0 0 auto; padding: 8rpx 14rpx; border-radius: 999px; background: #e6f2ef; color: #0f766e; font-size: 22rpx; font-weight: 900; }
</style>
