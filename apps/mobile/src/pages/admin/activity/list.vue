<script setup lang="ts">
import { onMounted, ref } from "vue";
import { activityStatusText, type ActivityStatus } from "@activity/shared";
import { adminActivityPreviewUrl, mobileAdminRequest, requireMobileAdmin } from "../../../mobile-admin";

const rows = ref<any[]>([]);
const counts = ref<Record<string, number>>({});
const loading = ref(true);
const keyword = ref("");
const status = ref<"all" | ActivityStatus>("all");
const page = ref(1);
const total = ref(0);
const pageSize = 20;

const tabs: Array<{ label: string; value: "all" | ActivityStatus }> = [
  { label: "全部", value: "all" },
  { label: "草稿", value: "draft" as ActivityStatus },
  { label: "待审", value: "pending_approval" as ActivityStatus },
  { label: "报名中", value: "open" as ActivityStatus },
  { label: "下架", value: "closed" as ActivityStatus }
];

function statusText(value: ActivityStatus) {
  return activityStatusText[value] || value;
}

function buildUrl() {
  const params = [`page=${page.value}`, `pageSize=${pageSize}`];
  if (keyword.value.trim()) params.push(`keyword=${encodeURIComponent(keyword.value.trim())}`);
  if (status.value !== "all") params.push(`status=${status.value}`);
  return `/admin/activities?${params.join("&")}`;
}

async function load() {
  requireMobileAdmin();
  loading.value = true;
  try {
    const data = await mobileAdminRequest<any>(buildUrl());
    rows.value = data.items || [];
    counts.value = data.counts || {};
    total.value = data.total || 0;
  } catch (err: any) {
    uni.showToast({ title: err.message || "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function setStatus(value: "all" | ActivityStatus) {
  status.value = value;
  page.value = 1;
  load();
}

function createActivity() {
  uni.navigateTo({ url: "/pages/admin/activity/edit" });
}

function editActivity(id: number) {
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

function closeActivity(item: any) {
  uni.showModal({
    title: "下架活动",
    content: `确认下架「${item.title}」？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await mobileAdminRequest(`/admin/activities/${item.id}/close`, { method: "POST" });
        uni.showToast({ title: "已下架", icon: "success" });
        load();
      } catch (err: any) {
        uni.showToast({ title: err.message || "操作失败", icon: "none" });
      }
    }
  });
}

onMounted(load);
</script>

<template>
  <view class="admin-list">
    <view class="head">
      <view>
        <view class="title">活动管理</view>
        <view class="sub">共 {{ total }} 场活动</view>
      </view>
      <view class="create" @click="createActivity">新增</view>
    </view>

    <view class="search">
      <input v-model="keyword" placeholder="搜索活动或地点" confirm-type="search" @confirm="load" />
      <view class="search-btn" @click="load">搜索</view>
    </view>

    <scroll-view scroll-x class="tabs" :show-scrollbar="false">
      <view class="track">
        <view v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: status === tab.value }" @click="setStatus(tab.value)">
          <text>{{ tab.label }}</text>
          <text>{{ tab.value === 'all' ? total : counts[tab.value] || 0 }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="loading" class="panel">加载中...</view>
    <view v-else-if="!rows.length" class="panel">暂无活动</view>
    <view v-for="item in rows" v-else :key="item.id" class="card">
      <view class="main" @click="editActivity(item.id)">
        <image v-if="item.coverUrl" :src="item.coverUrl" mode="aspectFill" />
        <view v-else class="cover">活动</view>
        <view class="body">
          <view class="name">{{ item.title }}</view>
          <view class="meta">{{ item.tenant?.name || "平台" }} · {{ item.location || "-" }}</view>
          <view class="meta">已报 {{ item.registeredCount || 0 }} / {{ item.capacity || 0 }}</view>
        </view>
      </view>
      <view class="ops">
        <view class="pill">{{ statusText(item.status) }}</view>
        <view @click="editActivity(item.id)">编辑</view>
        <view @click="previewActivity(item)">预览</view>
        <view @click="copyPublicLink(item)">复制链接</view>
        <view v-if="item.status !== 'closed'" class="danger" @click="closeActivity(item)">下架</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.admin-list { min-height: 100vh; padding: 24rpx; background: #f4f6f8; color: #111827; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-radius: 8px; background: #111827; color: #fff; }
.title { font-size: 40rpx; font-weight: 900; }
.sub { margin-top: 6rpx; color: rgba(255,255,255,.7); font-size: 24rpx; }
.create { padding: 14rpx 24rpx; border-radius: 999px; background: #0f766e; font-weight: 900; }
.search { display: grid; grid-template-columns: 1fr 118rpx; gap: 12rpx; margin: 20rpx 0; }
.search input { height: 78rpx; padding: 0 20rpx; border-radius: 999px; background: #fff; font-size: 26rpx; }
.search-btn { display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #0f766e; color: #fff; font-size: 25rpx; font-weight: 900; }
.tabs { height: 82rpx; white-space: nowrap; }
.track { display: inline-flex; gap: 12rpx; }
.tab { min-width: 112rpx; display: grid; gap: 4rpx; justify-items: center; padding: 12rpx 18rpx; border-radius: 8px; background: #fff; color: #667085; font-size: 23rpx; font-weight: 800; }
.tab.active { background: #e6f2ef; color: #0f766e; }
.panel, .card { margin-top: 18rpx; border-radius: 8px; background: #fff; box-shadow: 0 12rpx 34rpx rgba(15,23,42,.06); }
.panel { padding: 30rpx; color: #667085; text-align: center; }
.card { padding: 20rpx; }
.main { display: flex; gap: 18rpx; }
.main image, .cover { width: 160rpx; height: 120rpx; border-radius: 6px; flex: 0 0 auto; background: #dbe7e5; }
.cover { display: flex; align-items: center; justify-content: center; color: #0f766e; font-weight: 900; }
.body { min-width: 0; flex: 1; }
.name { font-size: 29rpx; font-weight: 900; line-height: 1.4; }
.meta { margin-top: 8rpx; color: #667085; font-size: 23rpx; }
.ops { display: flex; flex-wrap: wrap; gap: 12rpx; align-items: center; margin-top: 18rpx; color: #0f766e; font-size: 24rpx; font-weight: 800; }
.ops view { padding: 8rpx 14rpx; border-radius: 999px; background: #f3faf8; }
.ops .pill { background: #111827; color: #fff; }
.ops .danger { color: #b42318; background: #fff1f3; }
</style>
