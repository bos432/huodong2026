<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { RegistrationStatus, registrationStatusText } from "@activity/shared";
import { mobileAdminRequest, requireMobileAdmin } from "../../mobile-admin";
import AdminBottomNav from "../../components/AdminBottomNav.vue";

const rows = ref<any[]>([]);
const bootstrap = ref<any>(null);
const loading = ref(true);
const errorMessage = ref("");
const actionId = ref<number | null>(null);
const keyword = ref("");
const status = ref<"all" | RegistrationStatus>(RegistrationStatus.PendingReview);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const canReview = computed(() => Boolean(bootstrap.value?.permissions?.canReviewRegistrations));
const canViewRegistrations = computed(() => Boolean(bootstrap.value?.permissions?.canViewRegistrations));
const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize), 1));
let loadSerial = 0;

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
  const serial = ++loadSerial;
  loading.value = true;
  errorMessage.value = "";
  try {
    const boot = bootstrap.value || await mobileAdminRequest<any>("/admin/mobile/bootstrap");
    if (serial !== loadSerial) return;
    bootstrap.value = boot;
    if (!boot?.permissions?.canViewRegistrations) {
      rows.value = [];
      total.value = 0;
      return;
    }
    const data = await mobileAdminRequest<any>(buildUrl());
    if (serial !== loadSerial) return;
    rows.value = data.items || [];
    total.value = data.total || 0;
  } catch (err: any) {
    if (serial !== loadSerial) return;
    errorMessage.value = err.message || "报名加载失败";
    uni.showToast({ title: err.message || "加载失败", icon: "none" });
  } finally {
    if (serial === loadSerial) loading.value = false;
  }
}

function setStatus(value: "all" | RegistrationStatus) {
  if (loading.value || actionId.value !== null) return;
  status.value = value;
  page.value = 1;
  void load();
}

function search() {
  if (loading.value || actionId.value !== null) return;
  page.value = 1;
  void load();
}

function changePage(next: number) {
  if (loading.value || actionId.value !== null || next < 1 || next > totalPages.value || next === page.value) return;
  page.value = next;
  void load();
}

function approve(item: any) {
  if (actionId.value !== null) return;
  actionId.value = item.id;
  uni.showModal({
    title: "审核通过",
    content: `确认通过「${item.activity?.title || "报名"}」？`,
    success: async (res) => {
      if (!res.confirm) {
        actionId.value = null;
        return;
      }
      try {
        await mobileAdminRequest(`/admin/registrations/${item.id}/approve`, { method: "POST", data: { remark: "手机端审核通过" } });
        uni.showToast({ title: "已通过", icon: "success" });
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

function reject(item: any) {
  if (actionId.value !== null) return;
  actionId.value = item.id;
  uni.showModal({
    title: "拒绝报名",
    editable: true,
    placeholderText: "填写拒绝原因",
    success: async (res: any) => {
      if (!res.confirm) {
        actionId.value = null;
        return;
      }
      const remark = String(res.content || "").trim();
      if (!remark) {
        uni.showToast({ title: "请填写拒绝原因", icon: "none" });
        actionId.value = null;
        return;
      }
      try {
        await mobileAdminRequest(`/admin/registrations/${item.id}/reject`, { method: "POST", data: { remark } });
        uni.showToast({ title: "已拒绝", icon: "success" });
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

function statusLabel(value: RegistrationStatus) {
  return registrationStatusText[value] || value;
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function maskPhone(value: unknown) {
  const phone = String(value || "");
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone || "-";
}

onShow(load);
</script>

<template>
  <view class="admin-page">
    <view class="head">
      <view>
        <view class="title">报名审核</view>
        <view class="sub">共 {{ total }} 条报名</view>
      </view>
      <view class="refresh" role="button" tabindex="0" :aria-label="loading ? '刷新中' : '刷新报名'" :aria-busy="loading" :class="{ disabled: loading || actionId !== null }" @click="load" @keyup.enter="load" @keyup.space.prevent="load">{{ loading ? "刷新中" : "刷新" }}</view>
    </view>
    <view v-if="errorMessage" class="error-panel" role="alert" aria-live="assertive"><text>{{ errorMessage }}</text><view class="retry" role="button" tabindex="0" aria-label="重新加载报名" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重试</view></view>

    <view class="search">
      <input v-model="keyword" :disabled="loading || actionId !== null" maxlength="80" cursor-spacing="24" aria-label="搜索手机号、昵称或活动" placeholder="搜索手机号、昵称、活动" confirm-type="search" @confirm="search" />
      <view class="search-btn" role="button" tabindex="0" aria-label="搜索报名" :class="{ disabled: loading || actionId !== null }" @click="search" @keyup.enter="search" @keyup.space.prevent="search">搜索</view>
    </view>

    <scroll-view scroll-x class="tabs" :show-scrollbar="false">
      <view class="track">
        <view v-for="tab in tabs" :key="tab.value" class="tab" role="tab" tabindex="0" :aria-selected="status === tab.value" :aria-label="`查看${tab.label}报名`" :class="{ active: status === tab.value }" @click="setStatus(tab.value)" @keyup.enter="setStatus(tab.value)" @keyup.space.prevent="setStatus(tab.value)">{{ tab.label }}</view>
      </view>
    </scroll-view>

    <view v-if="!canViewRegistrations && !loading" class="panel">当前账号没有报名查看权限</view>
    <view v-else-if="loading" class="panel">加载中...</view>
    <view v-else-if="!rows.length" class="panel">暂无报名</view>
    <view v-for="item in rows" v-else :key="item.id" class="card">
      <view class="row">
        <view class="name">{{ item.activity?.title || "-" }}</view>
        <view class="pill">{{ statusLabel(item.status) }}</view>
      </view>
      <view class="meta">{{ item.user?.nickname || "用户" }} · {{ maskPhone(item.user?.phone) }}</view>
      <view class="meta">提交时间：{{ formatTime(item.createdAt) }}</view>
      <view v-if="item.order" class="meta">订单：{{ item.order.orderNo }} · ￥{{ Number(item.order.amount || 0).toFixed(2) }}</view>
      <view v-if="canReview && item.status === RegistrationStatus.PendingReview" class="ops" :class="{ disabled: actionId !== null }">
        <view class="ok" role="button" tabindex="0" :aria-label="actionId === item.id ? '报名审核处理中' : '通过报名'" @click="approve(item)" @keyup.enter="approve(item)" @keyup.space.prevent="approve(item)">{{ actionId === item.id ? "处理中..." : "通过" }}</view>
        <view class="danger" role="button" tabindex="0" aria-label="拒绝报名" @click="reject(item)" @keyup.enter="reject(item)" @keyup.space.prevent="reject(item)">拒绝</view>
      </view>
    </view>
    <view v-if="canViewRegistrations && totalPages > 1" class="pager">
      <view role="button" tabindex="0" aria-label="报名上一页" :class="{ disabled: page <= 1 || loading || actionId !== null }" @click="changePage(page - 1)" @keyup.enter="changePage(page - 1)" @keyup.space.prevent="changePage(page - 1)">上一页</view>
      <text>第 {{ page }} / {{ totalPages }} 页</text>
      <view role="button" tabindex="0" aria-label="报名下一页" :class="{ disabled: page >= totalPages || loading || actionId !== null }" @click="changePage(page + 1)" @keyup.enter="changePage(page + 1)" @keyup.space.prevent="changePage(page + 1)">下一页</view>
    </view>
    <AdminBottomNav current="registrations" :permissions="bootstrap?.permissions" />
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; width:100%; max-width:760px; margin:0 auto; box-sizing:border-box; padding: calc(24rpx + env(safe-area-inset-top)) 24rpx calc(150rpx + env(safe-area-inset-bottom)); overflow-wrap:anywhere; background: radial-gradient(circle at 18% 0%, rgba(255, 232, 198, 0.9), transparent 34%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 100%); color: #2f211c; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-radius: 30rpx; background: linear-gradient(135deg, #5b2f24 0%, #8f4c32 52%, #d29a5a 100%); color: #fff; box-shadow: 0 18rpx 44rpx rgba(91,47,36,.2); }
.title { font-size: 40rpx; font-weight: 900; }
.sub { margin-top: 6rpx; color: rgba(255,255,255,.7); font-size: 24rpx; }
.refresh { padding: 14rpx 24rpx; border-radius: 999px; background: #0f766e; font-weight: 900; }
.search { display: grid; grid-template-columns: 1fr 118rpx; gap: 12rpx; margin: 20rpx 0; }
.search input { height: 78rpx; padding: 0 20rpx; border-radius: 999px; background: #fff; font-size: 26rpx; }
.search-btn { display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #0f766e; color: #fff; font-size: 25rpx; font-weight: 900; }
.tabs { height: 76rpx; white-space: nowrap; }
.track { display: inline-flex; gap: 12rpx; }
.tab { padding: 16rpx 24rpx; border-radius: 999px; background: #fff; color: #7a5b52; font-size: 24rpx; font-weight: 800; }
.tab.active { background: #e6f2ef; color: #0f766e; }
.panel, .card { margin-top: 18rpx; border-radius: 24rpx; background: rgba(255,255,255,.9); box-shadow: 0 14rpx 34rpx rgba(91,47,36,.08); }
.panel { padding: 30rpx; color: #7a5b52; text-align: center; }
.card { padding: 22rpx; }
.row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.name { min-width: 0; flex: 1; font-size: 29rpx; font-weight: 900; line-height: 1.4; }
.pill { flex: 0 0 auto; padding: 8rpx 14rpx; border-radius: 999px; background: #e6f2ef; color: #0f766e; font-size: 22rpx; font-weight: 900; }
.meta { margin-top: 10rpx; color: #7a5b52; font-size: 24rpx; line-height: 1.45; }
.ops { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-top: 18rpx; }
.ops view { height: 76rpx; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; font-size: 26rpx; font-weight: 900; }
.ok { background: #0f766e; color: #fff; }
.danger { background: #fff1f3; color: #b42318; }
.pager { display:grid; grid-template-columns:140rpx 1fr 140rpx; align-items:center; gap:12rpx; margin-top:20rpx; }.pager view { display:flex; align-items:center; justify-content:center; height:68rpx; border-radius:18rpx; background:#0f766e; color:#fff; font-size:24rpx; font-weight:900; }.pager text { color:#7a5b52; font-size:24rpx; text-align:center; }.disabled, .ops.disabled { opacity:.55; pointer-events:none; }.error-panel { display:flex; align-items:center; justify-content:space-between; gap:16rpx; margin-top:18rpx; padding:20rpx; border-radius:24rpx; background:#fff1f3; color:#b42318; }.retry { padding:10rpx 18rpx; border-radius:16rpx; background:#b42318; color:#fff; font-weight:800; }
@media (min-width: 900px) { .admin-page { max-width:760px; margin:0 auto; } }
</style>
