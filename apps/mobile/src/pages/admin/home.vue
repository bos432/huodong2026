<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { activityStatusText, type ActivityStatus } from "@activity/shared";
import { adminActivityPreviewUrl, clearMobileAdminSession, getMobileAdminSession, mobileAdminRequest, requireMobileAdmin } from "../../mobile-admin";
import AdminBottomNav from "../../components/AdminBottomNav.vue";

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

function previewActivity(item: any) {
  const tenantCode = item.tenant?.code || "";
  uni.navigateTo({ url: `/pages/admin/activity/preview?id=${item.id}&tenantCode=${encodeURIComponent(tenantCode)}` });
}

function copyPublicLink(item: any) {
  const url = adminActivityPreviewUrl(item.id, item.tenant?.code);
  uni.setClipboardData({ data: url, success: () => uni.showToast({ title: "已复制", icon: "success" }) });
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
      <view class="top-glow"></view>
      <view>
        <view class="eyebrow">MERCHANT CONSOLE</view>
        <view class="hello">手机管理</view>
        <view class="sub">{{ bootstrap?.admin?.username || session?.role }} · {{ bootstrap?.admin?.tenant?.name || "平台管理员" }}</view>
      </view>
      <view class="logout" @click="logout">退出</view>
    </view>

    <view v-if="loading" class="panel">加载中...</view>
    <template v-else>
      <view class="stats">
        <view><text>{{ dashboard?.overview?.activityCount || 0 }}</text><text>活动总数</text></view>
        <view><text>{{ dashboard?.todos?.pendingActivityCount || 0 }}</text><text>待审活动</text></view>
        <view><text>{{ dashboard?.overview?.registrationCount || 0 }}</text><text>报名累计</text></view>
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

      <view class="section-title">
        <text>最近活动</text>
        <text class="section-more" @click="goList">全部活动 ›</text>
      </view>
      <view v-for="item in activities" :key="item.id" class="activity" @click="canWrite ? goEdit(item.id) : previewActivity(item)">
        <view>
          <view class="name">{{ item.title }}</view>
          <view class="meta">{{ item.tenant?.name || "平台" }} · {{ item.location || "-" }}</view>
          <view v-if="!canWrite" class="link" @click.stop="copyPublicLink(item)">复制公开链接</view>
        </view>
        <view class="pill">{{ statusText(item.status) }}</view>
      </view>
      <view v-if="!activities.length" class="panel">暂无活动</view>
      <AdminBottomNav current="home" :permissions="bootstrap?.permissions" />
    </template>
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; padding: 24rpx 24rpx 176rpx; background: radial-gradient(circle at 20% 0%, rgba(255, 232, 198, 0.9), transparent 34%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 44%, #f7f3ed 100%); color: #2f211c; }
.top { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 34rpx 28rpx; border-radius: 30rpx; background: linear-gradient(135deg, #5b2f24 0%, #8f4c32 48%, #d29a5a 100%); color: #fff; box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.24); }
.top-glow { position: absolute; right: -80rpx; top: -90rpx; width: 240rpx; height: 240rpx; border-radius: 999px; background: rgba(255,255,255,.18); }
.eyebrow { position: relative; color: rgba(255,255,255,.66); font-size: 20rpx; font-weight: 900; letter-spacing: .14em; }
.hello { position: relative; margin-top: 8rpx; font-size: 44rpx; font-weight: 950; }
.sub { position: relative; margin-top: 8rpx; color: rgba(255,255,255,.78); font-size: 24rpx; }
.logout { position: relative; flex: 0 0 auto; padding: 13rpx 22rpx; border-radius: 999px; background: rgba(255,255,255,.18); border: 1rpx solid rgba(255,255,255,.22); font-size: 24rpx; font-weight: 900; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; margin: 22rpx 0; }
.stats view, .panel, .activity { border-radius: 24rpx; background: rgba(255,255,255,.88); border: 1rpx solid rgba(91, 47, 36, 0.06); box-shadow: 0 14rpx 34rpx rgba(91,47,36,.08); }
.stats view { display: grid; gap: 6rpx; justify-items: center; padding: 22rpx 8rpx; }
.stats text:first-child { color: #0f766e; font-size: 34rpx; font-weight: 950; }
.stats text:last-child { color: #7a5b52; font-size: 21rpx; font-weight: 800; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-bottom: 20rpx; }
.action { height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 22rpx; background: rgba(255,255,255,.9); color: #0f766e; font-size: 28rpx; font-weight: 950; box-shadow: 0 10rpx 24rpx rgba(91,47,36,.06); }
.action.primary { background: linear-gradient(135deg, #0f766e, #15907f); color: #fff; box-shadow: 0 14rpx 30rpx rgba(15,118,110,.22); }
.action.disabled { opacity: .5; }
.notice, .panel { padding: 24rpx; color: #7a5b52; font-size: 25rpx; }
.section-title { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin: 30rpx 0 14rpx; color: #2f211c; font-size: 31rpx; font-weight: 950; }
.section-more { color: #c43d3d; font-size: 24rpx; font-weight: 900; }
.activity { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 16rpx; padding: 24rpx; }
.name { color: #2f211c; font-size: 29rpx; font-weight: 950; line-height: 1.4; }
.meta { margin-top: 8rpx; color: #7a5b52; font-size: 23rpx; }
.link { margin-top: 10rpx; color: #0f766e; font-size: 23rpx; font-weight: 900; }
.pill { flex: 0 0 auto; padding: 8rpx 14rpx; border-radius: 999px; background: #e6f2ef; color: #0f766e; font-size: 22rpx; font-weight: 950; }
</style>
