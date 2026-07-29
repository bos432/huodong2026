<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getMobileAdminSession, mobileAdminRequest, requireMobileAdmin } from "../../mobile-admin";
import { formatShanghaiDateTime } from "../../tenant-load-guard";
import AdminBottomNav from "../../components/AdminBottomNav.vue";

const rows = ref<any[]>([]);
const bootstrap = ref<any>(null);
const loading = ref(true);
const errorMessage = ref("");
const actionError = ref("");
const keyword = ref("");
const status = ref("pending");
const actionId = ref<number | null>(null);
const scanning = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const canViewRefunds = computed(() => Boolean(bootstrap.value?.permissions?.canViewRefunds));
const canManageRefunds = computed(() => Boolean(bootstrap.value?.permissions?.canManageRefunds));
const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize), 1));
let loadSerial = 0;
const tabs = [
  { label: "全部", value: "" },
  { label: "待审核", value: "pending" },
  { label: "提交中", value: "submitting" },
  { label: "处理中", value: "processing" },
  { label: "失败", value: "failed" },
  { label: "已通过", value: "approved" },
  { label: "已完成", value: "completed" },
  { label: "已拒绝", value: "rejected" }
];

function buildUrl() {
  const params = new URLSearchParams();
  if (status.value) params.set("status", status.value);
  if (keyword.value.trim()) params.set("keyword", keyword.value.trim());
  params.set("page", String(page.value));
  params.set("pageSize", String(pageSize));
  return `/admin/finance/refunds?${params.toString()}`;
}

async function load(refreshBootstrap = false) {
  const serial = ++loadSerial;
  loading.value = true;
  errorMessage.value = "";
  try {
    requireMobileAdmin();
    const boot = !refreshBootstrap && bootstrap.value ? bootstrap.value : await mobileAdminRequest<any>("/admin/mobile/bootstrap");
    if (serial !== loadSerial) return;
    bootstrap.value = boot;
    if (!boot?.permissions?.canViewRefunds) {
      rows.value = [];
      total.value = 0;
      return;
    }
    const data = await mobileAdminRequest<any>(buildUrl());
    if (serial !== loadSerial) return;
    rows.value = Array.isArray(data) ? data : data?.items || [];
    total.value = Array.isArray(data) ? data.length : Number(data?.total || 0);
  } catch (error: any) {
    if (serial !== loadSerial) return;
    errorMessage.value = error.message || "退款列表加载失败";
  } finally {
    if (serial === loadSerial) loading.value = false;
  }
}

function setStatus(value: string) {
  if (loading.value || actionId.value !== null || scanning.value) return;
  status.value = value;
  page.value = 1;
  void load();
}

function search() {
  if (loading.value || actionId.value !== null || scanning.value) return;
  page.value = 1;
  void load();
}

function changePage(next: number) {
  if (loading.value || actionId.value !== null || scanning.value || next < 1 || next > totalPages.value || next === page.value) return;
  page.value = next;
  void load();
}

function amount(row: any) {
  return Number(row.amount || 0).toFixed(2);
}

function time(value?: string) {
  return formatShanghaiDateTime(value);
}

function statusText(value: string) {
  return ({ pending: "待审核", submitting: "提交中", processing: "处理中", failed: "退款失败", approved: "已通过", rejected: "已拒绝", completed: "已完成" } as Record<string, string>)[value] || value || "-";
}

function canReview(row: any) {
  return canManageRefunds.value && row.status === "pending" && actionId.value === null && !scanning.value;
}

function canRetry(row: any) {
  return canManageRefunds.value && row.status === "failed" && actionId.value === null && !scanning.value;
}

async function review(row: any, action: "approve" | "reject") {
  if (!canReview(row)) return;
  actionId.value = row.id;
  actionError.value = "";
  const session = getMobileAdminSession();
  const content = action === "approve" ? `确认通过退款 ${row.refundNo}（￥${amount(row)}）？` : `确认拒绝退款 ${row.refundNo}？`;
  uni.showModal({
    title: action === "approve" ? "通过退款" : "拒绝退款",
    content,
    editable: true,
    placeholderText: action === "approve" ? "可填写审核备注" : "请填写拒绝原因",
    success: async (result: any) => {
      if (!result.confirm) {
        actionId.value = null;
        return;
      }
      const remark = String(result.content || "").trim();
      if (action === "reject" && !remark) {
        uni.showToast({ title: "请填写拒绝原因", icon: "none" });
        actionId.value = null;
        return;
      }
      try {
        const currentSession = getMobileAdminSession();
        if (!session || !currentSession || currentSession.token !== session.token || currentSession.tenantId !== session.tenantId) throw new Error("管理账号或商家已切换，请重新选择退款单");
        await mobileAdminRequest(`/admin/refunds/${row.id}/${action}`, { method: "POST", data: { remark: remark || "手机端通过退款审核" } });
        uni.showToast({ title: action === "approve" ? "已通过" : "已拒绝", icon: "success" });
        await load(true);
      } catch (error: any) {
        actionError.value = error.message || "退款处理失败";
      } finally {
        actionId.value = null;
      }
    },
    fail: () => { actionId.value = null; }
  });
}

function retry(row: any) {
  if (!canRetry(row)) return;
  actionId.value = row.id;
  actionError.value = "";
  const session = getMobileAdminSession();
  uni.showModal({
    title: "重试失败退款",
    content: `将使用原退款单号 ${row.refundNo} 重新提交渠道。请先确认渠道后台没有重复退款。`,
    editable: true,
    placeholderText: "填写核对说明（必填）",
    success: async (result: any) => {
      if (!result.confirm) {
        actionId.value = null;
        return;
      }
      const remark = String(result.content || "").trim();
      if (!remark) {
        uni.showToast({ title: "请填写核对说明", icon: "none" });
        actionId.value = null;
        return;
      }
      try {
        const currentSession = getMobileAdminSession();
        if (!session || !currentSession || currentSession.token !== session.token || currentSession.tenantId !== session.tenantId) throw new Error("管理账号或商家已切换，请重新选择退款单");
        await mobileAdminRequest(`/admin/refunds/${row.id}/retry`, { method: "POST", data: { remark } });
        uni.showToast({ title: "已提交重试", icon: "success" });
        await load(true);
      } catch (error: any) {
        actionError.value = error.message || "退款重试失败";
      } finally {
        actionId.value = null;
      }
    },
    fail: () => { actionId.value = null; }
  });
}

async function scanProviderRefunds() {
  if (!canManageRefunds.value || loading.value || actionId.value !== null || scanning.value) return;
  scanning.value = true;
  actionError.value = "";
  try {
    const result = await mobileAdminRequest<{ checkedCount?: number }>("/admin/finance/refunds/provider-scan", { method: "POST", data: {} });
    uni.showToast({ title: `已检查 ${Number(result?.checkedCount || 0)} 笔`, icon: "none" });
    await load(true);
  } catch (error: any) {
    actionError.value = error.message || "退款回执扫描失败";
  } finally {
    scanning.value = false;
  }
}

onShow(() => { void load(true); });
</script>

<template>
  <view class="admin-page">
    <view class="head">
      <view><view class="title">退款审核</view><view class="sub">查看并处理活动订单退款申请</view></view>
      <view class="head-actions"><view v-if="canManageRefunds" class="scan" role="button" tabindex="0" :aria-label="scanning ? '扫描退款回执中' : '扫描退款回执'" :aria-busy="scanning" :class="{ disabled: loading || actionId !== null || scanning }" @click="scanProviderRefunds" @keyup.enter="scanProviderRefunds" @keyup.space.prevent="scanProviderRefunds">{{ scanning ? "扫描中" : "查回执" }}</view><view class="refresh" role="button" tabindex="0" :aria-label="loading ? '刷新中' : '刷新退款列表'" :aria-busy="loading" :class="{ disabled: loading || actionId !== null || scanning }" @click="load" @keyup.enter="load" @keyup.space.prevent="load">{{ loading ? "刷新中" : "刷新" }}</view></view>
    </view>
    <view v-if="errorMessage" class="error-panel" role="alert" aria-live="assertive"><text>{{ errorMessage }}</text><view class="retry" role="button" tabindex="0" aria-label="重新加载退款列表" @click="load(true)" @keyup.enter="load(true)" @keyup.space.prevent="load(true)">重试</view></view>
    <view v-if="actionError" class="error-panel" role="alert" aria-live="assertive"><text>{{ actionError }}</text><view class="retry" role="button" tabindex="0" aria-label="关闭退款操作错误" @click="actionError = ''" @keyup.enter="actionError = ''" @keyup.space.prevent="actionError = ''">关闭</view></view>
    <view class="search"><input v-model="keyword" :disabled="loading || actionId !== null || scanning" maxlength="80" cursor-spacing="24" aria-label="搜索退款号、订单号或手机号" placeholder="退款号、订单号、手机号" confirm-type="search" @confirm="search" /><view class="search-btn" role="button" tabindex="0" aria-label="搜索退款" :class="{ disabled: loading || actionId !== null || scanning }" @click="search" @keyup.enter="search" @keyup.space.prevent="search">搜索</view></view>
    <scroll-view scroll-x class="tabs" :show-scrollbar="false"><view class="track" role="tablist" aria-label="退款状态筛选"><view v-for="tab in tabs" :key="tab.value" class="tab" role="tab" tabindex="0" :aria-selected="status === tab.value" :aria-label="`查看${tab.label}退款`" :class="{ active: status === tab.value }" @click="setStatus(tab.value)" @keyup.enter="setStatus(tab.value)" @keyup.space.prevent="setStatus(tab.value)">{{ tab.label }}</view></view></scroll-view>
    <view v-if="!canViewRefunds && !loading" class="panel">当前账号没有财务退款查看权限</view>
    <view v-else-if="loading" class="panel">加载中...</view>
    <view v-else-if="!rows.length" class="panel">暂无退款记录</view>
    <view v-for="item in rows" v-else :key="item.id" class="card">
      <view class="row"><view><view class="refund-no">{{ item.refundNo || `退款 ${item.id}` }}</view><view class="name">{{ item.order?.registration?.activity?.title || item.order?.orderNo || "活动订单" }}</view></view><view class="amount">￥{{ amount(item) }}</view></view>
      <view class="meta">订单：{{ item.order?.orderNo || "-" }} · {{ item.order?.paymentMethod || "-" }}</view>
      <view class="meta">状态：{{ statusText(item.status) }} · 申请：{{ time(item.createdAt) }}</view>
      <view class="meta">原因：{{ item.reason || "-" }}</view>
      <view v-if="canReview(item)" class="ops"><view class="ok" role="button" tabindex="0" aria-label="通过退款" @click="review(item, 'approve')" @keyup.enter="review(item, 'approve')" @keyup.space.prevent="review(item, 'approve')">通过退款</view><view class="danger" role="button" tabindex="0" aria-label="拒绝退款" @click="review(item, 'reject')" @keyup.enter="review(item, 'reject')" @keyup.space.prevent="review(item, 'reject')">拒绝退款</view></view>
      <view v-else-if="canRetry(item)" class="ops single"><view class="danger" role="button" tabindex="0" aria-label="重试失败退款" @click="retry(item)" @keyup.enter="retry(item)" @keyup.space.prevent="retry(item)">核对后重试</view></view>
      <view v-else-if="item.status === 'failed'" class="notice">退款通道失败，当前账号仅可查看</view>
    </view>
    <view v-if="canViewRefunds && totalPages > 1" class="pager">
      <view role="button" tabindex="0" aria-label="退款上一页" :class="{ disabled: page <= 1 || loading || actionId !== null }" @click="changePage(page - 1)" @keyup.enter="changePage(page - 1)" @keyup.space.prevent="changePage(page - 1)">上一页</view>
      <text>第 {{ page }} / {{ totalPages }} 页</text>
      <view role="button" tabindex="0" aria-label="退款下一页" :class="{ disabled: page >= totalPages || loading || actionId !== null }" @click="changePage(page + 1)" @keyup.enter="changePage(page + 1)" @keyup.space.prevent="changePage(page + 1)">下一页</view>
    </view>
    <AdminBottomNav current="refunds" :permissions="bootstrap?.permissions" />
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; width:100%; max-width:760px; margin:0 auto; box-sizing:border-box; padding: calc(24rpx + env(safe-area-inset-top)) 24rpx calc(150rpx + env(safe-area-inset-bottom)); overflow-wrap:anywhere; background: linear-gradient(180deg, #fff8ef 0%, #f5f0e8 100%); color: #2f211c; }
.head { display:flex; align-items:center; justify-content:space-between; padding:28rpx 24rpx; border-radius:30rpx; background:linear-gradient(135deg,#5b2f24 0%,#8f4c32 52%,#d29a5a 100%); color:#fff; }
.title { font-size:40rpx; font-weight:900; }.sub { margin-top:6rpx; color:rgba(255,255,255,.72); font-size:24rpx; }.head-actions { display:flex; gap:10rpx; flex-wrap:wrap; justify-content:flex-end; }.refresh,.scan { padding:14rpx 20rpx; border-radius:999px; font-weight:900; white-space:nowrap; }.refresh { background:#0f766e; }.scan { background:rgba(255,255,255,.16); }
.error-panel, .panel, .card { margin-top:18rpx; border-radius:24rpx; background:rgba(255,255,255,.92); box-shadow:0 14rpx 34rpx rgba(91,47,36,.08); }.error-panel { display:flex; align-items:center; justify-content:space-between; gap:16rpx; padding:20rpx; color:#b42318; background:#fff1f3; }.retry { padding:10rpx 18rpx; border-radius:16rpx; background:#b42318; color:#fff; font-weight:800; }.panel { padding:30rpx; color:#7a5b52; text-align:center; }.card { padding:22rpx; }
.search { display:grid; grid-template-columns:1fr 118rpx; gap:12rpx; margin:20rpx 0; }.search input { height:78rpx; padding:0 20rpx; border-radius:999px; background:#fff; font-size:26rpx; }.search-btn { display:flex; align-items:center; justify-content:center; border-radius:999px; background:#0f766e; color:#fff; font-size:25rpx; font-weight:900; }
.tabs { height:76rpx; white-space:nowrap; }.track { display:inline-flex; gap:12rpx; }.tab { padding:16rpx 24rpx; border-radius:999px; background:#fff; color:#7a5b52; font-size:24rpx; font-weight:800; }.tab.active { background:#e6f2ef; color:#0f766e; }
.row { display:flex; align-items:flex-start; justify-content:space-between; gap:18rpx; }.refund-no { min-width:0; color:#7a5b52; font-size:23rpx; font-weight:800; overflow-wrap:anywhere; }.name { min-width:0; margin-top:8rpx; font-size:29rpx; font-weight:900; line-height:1.4; overflow-wrap:anywhere; }.amount { flex:0 0 auto; color:#0f766e; font-size:32rpx; font-weight:900; }.meta { margin-top:10rpx; color:#7a5b52; font-size:24rpx; line-height:1.45; overflow-wrap:anywhere; }.ops { display:grid; grid-template-columns:1fr 1fr; gap:12rpx; margin-top:18rpx; }.ops.single { grid-template-columns:1fr; }.ops view { height:76rpx; display:flex; align-items:center; justify-content:center; border-radius:20rpx; font-size:26rpx; font-weight:900; }.ok { background:#0f766e; color:#fff; }.danger { background:#fff1f3; color:#b42318; }.notice { margin-top:16rpx; padding:16rpx; border-radius:18rpx; background:#fffaf4; color:#7a5b52; font-size:24rpx; line-height:1.5; overflow-wrap:anywhere; }
.pager { display:grid; grid-template-columns:140rpx 1fr 140rpx; align-items:center; gap:12rpx; margin-top:20rpx; }.pager view { display:flex; align-items:center; justify-content:center; height:68rpx; border-radius:18rpx; background:#0f766e; color:#fff; font-size:24rpx; font-weight:900; }.pager text { color:#7a5b52; font-size:24rpx; text-align:center; }.disabled { opacity:.5; pointer-events:none; }
@media (min-width: 900px) { .admin-page { max-width:760px; margin:0 auto; } }
</style>
