<template>
  <view class="container appeal-page">
    <view class="custom-nav">
      <view class="nav-back" role="button" aria-label="返回" @click="goBack">返回</view>
      <text class="nav-title">内容申诉</text>
      <view class="nav-action" role="button" aria-label="刷新内容申诉" @click="load">刷新</view>
    </view>

    <view v-if="loading" class="card state-card" aria-live="polite">处罚和申诉记录加载中...</view>
    <view v-else-if="loadError" class="card state-card error-card" aria-live="assertive">
      <text>{{ loadError }}</text>
      <view class="button secondary" role="button" aria-label="重新加载申诉记录" @click="load">重新加载</view>
    </view>

    <template v-else>
      <view v-if="actionError" class="card error-card" aria-live="assertive">{{ actionError }}</view>

      <view class="section-title">处罚记录</view>
      <view v-for="item in sanctions" :key="item.id" class="card">
        <view class="row"><text class="title">{{ sanctionTitle(item) }}</text><text class="status" :class="item.status">{{ sanctionStatus(item.status) }}</text></view>
        <text class="content">{{ item.reason }}</text>
        <text class="meta">{{ scopeText(item.scope) }} · {{ item.endsAt ? `至 ${formatTime(item.endsAt)}` : "长期" }}</text>
        <view v-if="item.status === 'active'" class="button sm secondary" role="button" :aria-label="`申诉处罚${item.id}`" @click="selectSanction(item)">申诉该处罚</view>
      </view>
      <view v-if="!sanctions.length" class="card empty">暂无处罚记录</view>

      <view class="section-title">提交申诉</view>
      <view class="card form-card">
        <text class="label">关联处罚</text>
        <text class="selected">{{ selectedSanction ? `#${selectedSanction.id} ${sanctionTitle(selectedSanction)}` : "未选择，可提交普通内容申诉" }}</text>
        <textarea v-model="reason" class="textarea" maxlength="2000" cursor-spacing="24" aria-label="申诉说明" placeholder="请说明情况、理由和希望的处理结果" />
        <text class="counter">{{ reason.length }}/2000</text>
        <view class="button block" :class="{ disabled: !canSubmit }" role="button" :aria-label="submitting ? '正在提交申诉' : '提交申诉'" @click="submitAppeal">{{ submitting ? "提交中..." : "提交申诉" }}</view>
      </view>

      <view class="section-title">申诉进度</view>
      <view v-for="item in appeals" :key="item.id" class="card">
        <view class="row"><text class="title">申诉 #{{ item.id }}</text><text class="status" :class="item.status">{{ appealStatus(item.status) }}</text></view>
        <text class="content">{{ item.reason }}</text>
        <text v-if="item.handleRemark" class="result">处理说明：{{ item.handleRemark }}</text>
        <text class="meta">{{ formatTime(item.createdAt) }}</text>
      </view>
      <view v-if="!appeals.length" class="card empty">暂无申诉记录</view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request } from "../../api";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";
import { reviewSafeText } from "../../review-safe-text";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { formatShanghaiDateTime } from "../../shanghai-date";

const sanctions = ref<any[]>([]);
const appeals = ref<any[]>([]);
const selectedSanction = ref<any>(null);
const reason = ref("");
const loading = ref(false);
const loadError = ref("");
const actionError = ref("");
const submitting = ref(false);
const appealKey = ref("");
const loadGuard = createTenantLoadGuard();
const canSubmit = computed(() => !loading.value && !loadError.value && !submitting.value && reason.value.trim().length >= 5);

function newAppealKey() {
  return `appeal_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

async function load() {
  const token = loadGuard.begin();
  loading.value = true;
  loadError.value = "";
  actionError.value = "";
  sanctions.value = [];
  appeals.value = [];
  selectedSanction.value = null;
  try {
    await ensureUser();
    const [sanctionRows, appealRows] = await Promise.all([
      request<any[]>("/public/me/content/sanctions"),
      request<any[]>("/public/me/content/appeals")
    ]);
    if (!loadGuard.isCurrent(token)) return;
    sanctions.value = Array.isArray(sanctionRows) ? sanctionRows : [];
    appeals.value = Array.isArray(appealRows) ? appealRows : [];
  } catch (error: any) {
    if (loadGuard.isCurrent(token)) loadError.value = reviewSafeText(error?.message || "处罚和申诉记录加载失败");
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

function selectSanction(item: any) {
  if (submitting.value) return;
  selectedSanction.value = item;
  appealKey.value = "";
  actionError.value = "";
  uni.pageScrollTo({ scrollTop: 500, duration: 250 });
}

async function submitAppeal() {
  if (!canSubmit.value) {
    if (reason.value.trim().length < 5) actionError.value = "申诉说明至少 5 个字";
    return;
  }
  const tenantCode = getCurrentTenantCode();
  const sanctionId = selectedSanction.value?.id || null;
  const key = appealKey.value || newAppealKey();
  appealKey.value = key;
  submitting.value = true;
  actionError.value = "";
  try {
    const result = await request<any>("/public/me/content/appeals", {
      method: "POST",
      header: { "x-idempotency-key": key },
      data: { sanctionId, reason: reason.value.trim() }
    });
    if (getCurrentTenantCode() !== tenantCode) return;
    reason.value = "";
    selectedSanction.value = null;
    appealKey.value = "";
    await load();
    if (getCurrentTenantCode() === tenantCode) uni.showToast({ title: result?.idempotent ? "申诉已在处理中" : "申诉已提交", icon: "success" });
  } catch (error: any) {
    if (getCurrentTenantCode() === tenantCode) actionError.value = reviewSafeText(error?.message || "申诉提交失败");
  } finally {
    if (getCurrentTenantCode() === tenantCode) submitting.value = false;
  }
}

function sanctionTitle(item: any) { return `${item.type === "ban" ? "禁用" : "禁言"}·${scopeText(item.scope)}`; }
function sanctionStatus(value: string) { return value === "active" ? "生效中" : value === "revoked" ? "已解除" : "已到期"; }
function appealStatus(value: string) { return value === "approved" ? "已通过" : value === "rejected" ? "已驳回" : "待处理"; }
function scopeText(value: string) { return value === "community" ? "社区" : value === "forum" ? "论坛" : "全部"; }
function formatTime(value: string) {
  return formatShanghaiDateTime(value, "");
}
function goBack() { uni.navigateBack(); }

onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await load();
});
</script>

<style scoped>
.appeal-page { min-height:100vh; box-sizing:border-box; padding-bottom:calc(48rpx + env(safe-area-inset-bottom)); }
.custom-nav,.row { display:flex; align-items:center; justify-content:space-between; gap:16rpx; }
.nav-back,.nav-action { width:120rpx; min-height:58rpx; display:flex; align-items:center; color:#475467; font-size:26rpx; font-weight:800; }
.nav-action { justify-content:flex-end; }
.nav-title { color:#263d3c; font-size:32rpx; font-weight:900; }
.section-title { margin:28rpx 0 14rpx; color:#263d3c; font-size:30rpx; font-weight:900; }
.card { display:grid; gap:12rpx; margin-bottom:16rpx; padding:24rpx; border-radius:16rpx; background:#fff; box-shadow:0 4rpx 20rpx rgba(0,0,0,.04); overflow-wrap:anywhere; }
.title,.label { color:#344054; font-size:27rpx; font-weight:900; }
.content,.result { color:#475467; font-size:25rpx; line-height:1.6; }
.result { padding:14rpx; background:#f8fafc; }
.meta,.selected,.counter { color:#98a2b3; font-size:23rpx; }
.counter { text-align:right; }
.status { color:#b54708; font-size:23rpx; font-weight:900; }
.status.approved,.status.revoked { color:#067647; }
.status.rejected { color:#b42318; }
.textarea { width:100%; min-height:220rpx; box-sizing:border-box; padding:18rpx; border:1rpx solid #e4e7ec; border-radius:12rpx; background:#f8fafc; font-size:26rpx; line-height:1.6; }
.disabled { opacity:.6; pointer-events:none; }
.empty,.state-card { color:#98a2b3; text-align:center; }
.error-card { color:#b42318; border:1rpx solid #f0b8b0; background:#fff4f2; line-height:1.6; }
.error-card .button { margin-top:12rpx; }
@media (min-width: 900px) {
  .appeal-page { max-width:760px; margin:0 auto; }
}
</style>
