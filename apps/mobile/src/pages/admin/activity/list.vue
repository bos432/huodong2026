<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ActivityStatus, activityStatusText } from "@activity/shared";
import { adminActivityPreviewUrl, mobileAdminRequest, requireMobileAdmin } from "../../../mobile-admin";
import AdminBottomNav from "../../../components/AdminBottomNav.vue";

const rows = ref<any[]>([]);
const counts = ref<Record<string, number>>({});
const bootstrap = ref<any>(null);
const loading = ref(true);
const errorMessage = ref("");
const actionId = ref<number | null>(null);
const keyword = ref("");
const status = ref<"all" | ActivityStatus>("all");
const page = ref(1);
const total = ref(0);
const pageSize = 20;
let requestSerial = 0;
const canWrite = computed(() => Boolean(bootstrap.value?.permissions?.canWriteActivities));
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

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
  const serial = ++requestSerial;
  loading.value = true;
  errorMessage.value = "";
  try {
    const boot = bootstrap.value || await mobileAdminRequest<any>("/admin/mobile/bootstrap");
    if (serial !== requestSerial) return;
    bootstrap.value = boot;
    const data = await mobileAdminRequest<any>(buildUrl());
    if (serial !== requestSerial) return;
    rows.value = data.items || [];
    counts.value = data.counts || {};
    total.value = data.total || 0;
  } catch (err: any) {
    if (serial !== requestSerial) return;
    errorMessage.value = err.message || "活动加载失败";
    uni.showToast({ title: err.message || "加载失败", icon: "none" });
  } finally {
    if (serial === requestSerial) loading.value = false;
  }
}

function setStatus(value: "all" | ActivityStatus) {
  if (loading.value || status.value === value) return;
  status.value = value;
  page.value = 1;
  void load();
}

function search() {
  if (loading.value) return;
  page.value = 1;
  void load();
}

function changePage(next: number) {
  if (loading.value || actionId.value !== null || next < 1 || next > pageCount.value || next === page.value) return;
  page.value = next;
  void load();
}

function createActivity() {
  if (!canWrite.value) return;
  uni.navigateTo({ url: "/pages/admin/activity/edit" });
}

function editActivity(id: number) {
  if (!canWrite.value) return;
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

function runLifecycle(item: any, options: { title: string; content: string; path: string; successText: string }) {
  if (actionId.value !== null) return;
  actionId.value = item.id;
  uni.showModal({
    title: options.title,
    content: options.content,
    success: async (res) => {
      if (!res.confirm) {
        actionId.value = null;
        return;
      }
      try {
        await mobileAdminRequest(`/admin/activities/${item.id}/${options.path}`, { method: "POST" });
        uni.showToast({ title: options.successText, icon: "success" });
        await load();
      } catch (err: any) {
        uni.showToast({ title: err.message || "操作失败", icon: "none" });
      } finally {
        actionId.value = null;
      }
    },
    fail: () => { actionId.value = null; }
  });
}

function closeActivity(item: any) {
  if (item.status !== ActivityStatus.Open) return;
  runLifecycle(item, { title: "下架活动", content: `确认下架「${item.title}」？`, path: "close", successText: "已下架" });
}

function reopenActivity(item: any) {
  if (item.status !== ActivityStatus.Closed) return;
  runLifecycle(item, { title: "重新上架", content: `确认重新上架「${item.title}」？`, path: "reopen", successText: "已重新上架" });
}

function withdrawApproval(item: any) {
  if (item.status !== ActivityStatus.PendingApproval || !bootstrap.value?.admin?.tenantId) return;
  runLifecycle(item, { title: "撤回审核", content: `确认撤回「${item.title}」的审核申请？`, path: "withdraw-approval", successText: "已撤回审核" });
}

onShow(load);
</script>

<template>
  <view class="admin-list">
    <view class="head">
      <view>
        <view class="title">活动管理</view>
        <view class="sub">共 {{ total }} 场活动</view>
      </view>
      <view v-if="canWrite" class="create" @click="createActivity">新增</view>
    </view>
    <view v-if="errorMessage" class="error-panel"><text>{{ errorMessage }}</text><view class="retry" @click="load">重试</view></view>

    <view class="search">
      <input v-model="keyword" :disabled="loading" placeholder="搜索活动或地点" confirm-type="search" @confirm="search" />
      <view class="search-btn" :class="{ disabled: loading }" @click="search">{{ loading ? "查询中" : "搜索" }}</view>
    </view>

    <scroll-view scroll-x class="tabs" :show-scrollbar="false">
      <view class="track">
        <view v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: status === tab.value, disabled: loading }" @click="setStatus(tab.value)">
          <text>{{ tab.label }}</text>
          <text>{{ tab.value === 'all' ? total : counts[tab.value] || 0 }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="loading" class="panel">加载中...</view>
    <view v-else-if="!rows.length" class="panel">暂无活动</view>
    <view v-for="item in rows" v-else :key="item.id" class="card">
      <view class="main" @click="canWrite ? editActivity(item.id) : previewActivity(item)">
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
        <view v-if="canWrite" @click="editActivity(item.id)">编辑</view>
        <view @click="previewActivity(item)">预览</view>
        <view @click="copyPublicLink(item)">复制链接</view>
        <view v-if="canWrite && item.status === 'pending_approval' && bootstrap?.admin?.tenantId" :class="{ disabled: actionId !== null }" @click="withdrawApproval(item)">{{ actionId === item.id ? "处理中..." : "撤回审核" }}</view>
        <view v-if="canWrite && item.status === 'closed'" :class="{ disabled: actionId !== null }" @click="reopenActivity(item)">{{ actionId === item.id ? "处理中..." : "重新上架" }}</view>
        <view v-if="canWrite && item.status === 'open'" class="danger" :class="{ disabled: actionId !== null }" @click="closeActivity(item)">{{ actionId === item.id ? "处理中..." : "下架" }}</view>
      </view>
    </view>
    <view v-if="total > pageSize" class="pager">
      <view :class="{ disabled: loading || page <= 1 }" @click="changePage(page - 1)">上一页</view>
      <text>第 {{ page }} / {{ pageCount }} 页 · 共 {{ total }} 条</text>
      <view :class="{ disabled: loading || page >= pageCount }" @click="changePage(page + 1)">下一页</view>
    </view>
    <AdminBottomNav current="activities" :permissions="bootstrap?.permissions" />
  </view>
</template>

<style scoped>
.admin-list { min-height: 100vh; padding: 24rpx 24rpx 150rpx; background: radial-gradient(circle at 18% 0%, rgba(255, 232, 198, 0.9), transparent 34%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 100%); color: #2f211c; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-radius: 30rpx; background: linear-gradient(135deg, #5b2f24 0%, #8f4c32 52%, #d29a5a 100%); color: #fff; box-shadow: 0 18rpx 44rpx rgba(91,47,36,.2); }
.title { font-size: 40rpx; font-weight: 900; }
.sub { margin-top: 6rpx; color: rgba(255,255,255,.7); font-size: 24rpx; }
.create { padding: 14rpx 24rpx; border-radius: 999px; background: #0f766e; font-weight: 900; }
.search { display: grid; grid-template-columns: 1fr 118rpx; gap: 12rpx; margin: 20rpx 0; }
.search input { height: 78rpx; padding: 0 20rpx; border-radius: 999px; background: #fff; font-size: 26rpx; }
.search-btn { display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #0f766e; color: #fff; font-size: 25rpx; font-weight: 900; }
.tabs { height: 82rpx; white-space: nowrap; }
.track { display: inline-flex; gap: 12rpx; }
.tab { min-width: 112rpx; display: grid; gap: 4rpx; justify-items: center; padding: 12rpx 18rpx; border-radius: 18rpx; background: #fff; color: #7a5b52; font-size: 23rpx; font-weight: 800; }
.tab.active { background: #e6f2ef; color: #0f766e; }
.panel, .card { margin-top: 18rpx; border-radius: 24rpx; background: rgba(255,255,255,.9); box-shadow: 0 14rpx 34rpx rgba(91,47,36,.08); }
.panel { padding: 30rpx; color: #7a5b52; text-align: center; }
.card { padding: 20rpx; }
.main { display: flex; gap: 18rpx; }
.main image, .cover { width: 160rpx; height: 120rpx; border-radius: 18rpx; flex: 0 0 auto; background: #dbe7e5; }
.cover { display: flex; align-items: center; justify-content: center; color: #0f766e; font-weight: 900; }
.body { min-width: 0; flex: 1; }
.name { font-size: 29rpx; font-weight: 900; line-height: 1.4; }
.meta { margin-top: 8rpx; color: #7a5b52; font-size: 23rpx; }
.ops { display: flex; flex-wrap: wrap; gap: 12rpx; align-items: center; margin-top: 18rpx; color: #0f766e; font-size: 24rpx; font-weight: 800; }
.ops view { padding: 8rpx 14rpx; border-radius: 999px; background: #f3faf8; }
.ops .pill { background: #fff4e6; color: #8f4c32; }
.ops .danger { color: #b42318; background: #fff1f3; }
.pager { display:grid; grid-template-columns:120rpx 1fr 120rpx; align-items:center; gap:12rpx; margin:20rpx 0; color:#7a5b52; text-align:center; font-size:23rpx; }.pager view { padding:14rpx 8rpx; border-radius:16rpx; background:#fff; color:#0f766e; font-weight:900; }
.error-panel { display:flex; align-items:center; justify-content:space-between; gap:16rpx; margin-top:18rpx; padding:20rpx; border-radius:24rpx; background:#fff1f3; color:#b42318; }.retry { padding:10rpx 18rpx; border-radius:16rpx; background:#b42318; color:#fff; font-weight:800; }.disabled { opacity:.55; pointer-events:none; }
@media (min-width: 900px) { .admin-list { max-width:760px; margin:0 auto; } }
</style>
