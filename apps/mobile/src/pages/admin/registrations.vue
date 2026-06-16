<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RegistrationStatus, registrationStatusText } from "@activity/shared";
import { mobileAdminRequest, requireMobileAdmin } from "../../mobile-admin";
import AdminBottomNav from "../../components/AdminBottomNav.vue";

const rows = ref<any[]>([]);
const bootstrap = ref<any>(null);
const loading = ref(true);
const keyword = ref("");
const status = ref<"all" | RegistrationStatus>(RegistrationStatus.PendingReview);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const canReview = computed(() => Boolean(bootstrap.value?.permissions?.canReviewRegistrations));

const tabs: Array<{ label: string; value: "all" | RegistrationStatus }> = [
  { label: "待审核", value: RegistrationStatus.PendingReview },
  { label: "待付款", value: RegistrationStatus.PendingPayment },
  { label: "成功", value: RegistrationStatus.Approved },
  { label: "已签到", value: RegistrationStatus.CheckedIn },
  { label: "全部", value: "all" }
];

function buildUrl() {
  const params = [`page=${page.value}`, `pageSize=${pageSize}`];
  if (status.value !== "all") params.push(`status=${status.value}`);
  if (keyword.value.trim()) params.push(`keyword=${encodeURIComponent(keyword.value.trim())}`);
  return `/admin/registrations?${params.join("&")}`;
}

async function load() {
  requireMobileAdmin();
  loading.value = true;
  try {
    const [boot, data] = await Promise.all([
      bootstrap.value ? Promise.resolve(bootstrap.value) : mobileAdminRequest<any>("/admin/mobile/bootstrap"),
      mobileAdminRequest<any>(buildUrl())
    ]);
    bootstrap.value = boot;
    rows.value = data.items || [];
    total.value = data.total || 0;
  } catch (err: any) {
    uni.showToast({ title: err.message || "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function setStatus(value: "all" | RegistrationStatus) {
  status.value = value;
  page.value = 1;
  load();
}

function approve(item: any) {
  uni.showModal({
    title: "审核通过",
    content: `确认通过「${item.activity?.title || "报名"}」？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await mobileAdminRequest(`/admin/registrations/${item.id}/approve`, { method: "POST", data: { remark: "手机端审核通过" } });
        uni.showToast({ title: "已通过", icon: "success" });
        load();
      } catch (err: any) {
        uni.showToast({ title: err.message || "操作失败", icon: "none" });
      }
    }
  });
}

function reject(item: any) {
  uni.showModal({
    title: "拒绝报名",
    editable: true,
    placeholderText: "填写拒绝原因",
    success: async (res: any) => {
      if (!res.confirm) return;
      try {
        await mobileAdminRequest(`/admin/registrations/${item.id}/reject`, { method: "POST", data: { remark: res.content || "手机端拒绝" } });
        uni.showToast({ title: "已拒绝", icon: "success" });
        load();
      } catch (err: any) {
        uni.showToast({ title: err.message || "操作失败", icon: "none" });
      }
    }
  });
}

function statusLabel(value: RegistrationStatus) {
  return registrationStatusText[value] || value;
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

onMounted(load);
</script>

<template>
  <view class="admin-page">
    <view class="head">
      <view>
        <view class="title">报名审核</view>
        <view class="sub">共 {{ total }} 条报名</view>
      </view>
      <view class="refresh" @click="load">刷新</view>
    </view>

    <view class="search">
      <input v-model="keyword" placeholder="搜索手机号、昵称、活动" confirm-type="search" @confirm="load" />
      <view class="search-btn" @click="load">搜索</view>
    </view>

    <scroll-view scroll-x class="tabs" :show-scrollbar="false">
      <view class="track">
        <view v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: status === tab.value }" @click="setStatus(tab.value)">{{ tab.label }}</view>
      </view>
    </scroll-view>

    <view v-if="loading" class="panel">加载中...</view>
    <view v-else-if="!rows.length" class="panel">暂无报名</view>
    <view v-for="item in rows" v-else :key="item.id" class="card">
      <view class="row">
        <view class="name">{{ item.activity?.title || "-" }}</view>
        <view class="pill">{{ statusLabel(item.status) }}</view>
      </view>
      <view class="meta">{{ item.user?.nickname || "用户" }} · {{ item.user?.phone || "-" }}</view>
      <view class="meta">提交时间：{{ formatTime(item.createdAt) }}</view>
      <view v-if="item.order" class="meta">订单：{{ item.order.orderNo }} · ￥{{ Number(item.order.amount || 0).toFixed(2) }}</view>
      <view v-if="canReview && item.status === RegistrationStatus.PendingReview" class="ops">
        <view class="ok" @click="approve(item)">通过</view>
        <view class="danger" @click="reject(item)">拒绝</view>
      </view>
    </view>
    <AdminBottomNav current="registrations" :permissions="bootstrap?.permissions" />
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; padding: 24rpx 24rpx 150rpx; background: #f4f6f8; color: #111827; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-radius: 8px; background: #111827; color: #fff; }
.title { font-size: 40rpx; font-weight: 900; }
.sub { margin-top: 6rpx; color: rgba(255,255,255,.7); font-size: 24rpx; }
.refresh { padding: 14rpx 24rpx; border-radius: 999px; background: #0f766e; font-weight: 900; }
.search { display: grid; grid-template-columns: 1fr 118rpx; gap: 12rpx; margin: 20rpx 0; }
.search input { height: 78rpx; padding: 0 20rpx; border-radius: 999px; background: #fff; font-size: 26rpx; }
.search-btn { display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #0f766e; color: #fff; font-size: 25rpx; font-weight: 900; }
.tabs { height: 76rpx; white-space: nowrap; }
.track { display: inline-flex; gap: 12rpx; }
.tab { padding: 16rpx 24rpx; border-radius: 999px; background: #fff; color: #667085; font-size: 24rpx; font-weight: 800; }
.tab.active { background: #e6f2ef; color: #0f766e; }
.panel, .card { margin-top: 18rpx; border-radius: 8px; background: #fff; box-shadow: 0 12rpx 34rpx rgba(15,23,42,.06); }
.panel { padding: 30rpx; color: #667085; text-align: center; }
.card { padding: 22rpx; }
.row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.name { min-width: 0; flex: 1; font-size: 29rpx; font-weight: 900; line-height: 1.4; }
.pill { flex: 0 0 auto; padding: 8rpx 14rpx; border-radius: 999px; background: #e6f2ef; color: #0f766e; font-size: 22rpx; font-weight: 900; }
.meta { margin-top: 10rpx; color: #667085; font-size: 24rpx; line-height: 1.45; }
.ops { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-top: 18rpx; }
.ops view { height: 76rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 26rpx; font-weight: 900; }
.ok { background: #0f766e; color: #fff; }
.danger { background: #fff1f3; color: #b42318; }
</style>
