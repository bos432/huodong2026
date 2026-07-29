<template>
  <view class="container checkin-page">
    <view class="custom-nav">
      <view class="nav-back" role="button" aria-label="返回" @click="goBack">返回</view>
      <text class="nav-title">今日打卡</text>
      <view class="nav-action" role="button" aria-label="刷新今日打卡" @click="loadCheckin">刷新</view>
    </view>
    <view v-if="loading" class="checkin-card state-card" aria-live="polite">
      <text class="subtle state-text">加载今日打卡...</text>
    </view>
    <view v-else-if="loadError" class="checkin-card state-card error-state" aria-live="assertive">
      <text class="state-text">{{ loadError }}</text>
      <view class="button secondary block" role="button" aria-label="重新加载今日打卡" @click="loadCheckin">重新加载</view>
    </view>
    <view v-else-if="!task" class="checkin-card state-card">
      <text class="title-lg state-title">暂无今日任务</text>
      <text class="subtle state-text">请等待慢π运营发布今天的打卡任务。</text>
    </view>
    <view v-else class="checkin-card task-card">
      <text class="subtle task-date">{{ dateTitle }}</text>
      <text class="title-lg task-title">今日任务</text>
      <text class="body-text task-name">{{ task.title }}</text>
      <text v-if="task.description" class="subtle task-desc">{{ task.description }}</text>
      <view class="personal-status" :class="{ done: checkedIn }">
        <text class="personal-status-title">{{ checkedIn ? "你今天已完成打卡" : "你今天还未打卡" }}</text>
        <text class="personal-status-sub">{{ checkedIn ? "今天已经点亮，明天继续保持。" : `点击后会点亮 ${currentDay} 日，并计入你的月度记录。` }}</text>
      </view>
      <view v-if="!checkedIn" class="button block button-lg" :class="{ disabled: submitting }" role="button" :aria-label="submitting ? '正在完成今日打卡' : '完成今日打卡'" @click="doCheckin">{{ submitting ? "打卡中..." : "完成今日打卡" }}</view>
      <view v-else class="button block button-lg disabled done-button">已完成</view>
      <view class="checkin-stats">
        <view class="checkin-stat">
          <text class="checkin-stat-value">{{ completedCount }}</text>
          <text class="checkin-stat-label">今日同学打卡</text>
        </view>
        <view class="checkin-stat">
          <text class="checkin-stat-value">{{ checkedDays.length }}</text>
          <text class="checkin-stat-label">你本月已打卡</text>
        </view>
      </view>
    </view>

    <!-- 打卡日历 -->
    <view v-if="!loadError" class="card calendar-card">
      <text class="title-md calendar-title">{{ monthTitle }}打卡</text>
      <view class="calendar-grid">
        <text v-for="(d, i) in daysInMonth" :key="i" class="calendar-day"
          :class="{ active: checkedDays.includes(d), today: d === currentDay }"
        >{{ d }}</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request } from "../../api";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";
import { reviewSafeText } from "../../review-safe-text";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { formatShanghaiChineseDate, formatShanghaiChineseMonth, shanghaiDateString } from "../../shanghai-date";
const checkedIn = ref(false);
const loading = ref(true);
const submitting = ref(false);
const loadError = ref("");
const task = ref<any>(null);
const today = ref("");
const checkedDays = ref<number[]>([]);
const loadGuard = createTenantLoadGuard();
const completedCount = computed(() => Math.max(0, Number(task.value?.completedCount || 0)));
const currentDay = computed(() => Number((today.value || localDateString()).slice(8, 10)));
const daysInMonth = computed(() => {
  const date = today.value || localDateString();
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return new Date(year, month, 0).getDate();
});
const dateTitle = computed(() => {
  return formatShanghaiChineseDate(today.value || localDateString());
});
const monthTitle = computed(() => {
  return formatShanghaiChineseMonth(today.value || localDateString());
});
function goBack() { uni.navigateBack(); }

function localDateString() {
  return shanghaiDateString();
}

async function loadCheckin() {
  const token = loadGuard.begin();
  loading.value = true;
  loadError.value = "";
  task.value = null;
  checkedIn.value = false;
  checkedDays.value = [];
  try {
    await ensureUser();
    const data = await request<any>("/public/checkin/today");
    if (!loadGuard.isCurrent(token)) return;
    task.value = data;
    today.value = data?.today || localDateString();
    checkedIn.value = Boolean(data?.checkedToday);
    checkedDays.value = Array.isArray(data?.checkedDays) ? data.checkedDays : [];
  } catch (error: any) {
    if (loadGuard.isCurrent(token)) loadError.value = reviewSafeText(error?.message || "今日打卡加载失败");
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

async function doCheckin() {
  if (submitting.value || checkedIn.value) return;
  const tenantCode = getCurrentTenantCode();
  submitting.value = true;
  try {
    await ensureUser();
    await request("/public/checkin/today/complete", { method: "POST" });
    if (getCurrentTenantCode() !== tenantCode) return;
    await loadCheckin();
    if (getCurrentTenantCode() === tenantCode) uni.showToast({ title:"打卡成功", icon:"success", duration:2000 });
  } catch (error: any) {
    if (getCurrentTenantCode() === tenantCode) uni.showToast({ title: reviewSafeText(error?.message || "打卡失败"), icon: "none" });
  } finally {
    if (getCurrentTenantCode() === tenantCode) submitting.value = false;
  }
}
onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await loadCheckin();
});
</script>
<style scoped>
.checkin-page { min-height:100vh; box-sizing:border-box; padding-bottom:calc(42rpx + env(safe-area-inset-bottom)); }
.custom-nav { display:flex; align-items:center; justify-content: space-between; padding:16rpx 0; }
.nav-back, .nav-action { min-width: 104rpx; min-height: 58rpx; display: flex; align-items: center; color:#4a6b8a; font-size:27rpx; font-weight: 800; }
.nav-action { justify-content:flex-end; }
.nav-title { flex:1; text-align:center; color:#333333; font-size:32rpx; font-weight:900; font-family:"STKaiti","KaiTi",serif; }
.checkin-card { margin-top:24rpx; background:#fff; border-radius:24rpx; padding:40rpx; box-shadow:0 12rpx 34rpx rgba(91,47,36,0.07); }
.state-card { text-align:center; }
.error-state { color:#b42318; border:1rpx solid #f0b8b0; background:#fff4f2; }
.state-title { text-align:center; display:block; font-family:"STKaiti","KaiTi",serif; }
.state-text { display:block; text-align:center; margin-top:16rpx; }
.task-card { text-align:center; }
.task-date { display:block; margin-bottom:16rpx; }
.task-title { text-align:center; display:block; font-family:"STKaiti","KaiTi",serif; }
.task-name { display:block; text-align:center; margin:18rpx 0; color:#666666; line-height:1.7; }
.task-desc { display:block; text-align:center; margin-bottom:18rpx; line-height:1.6; }
.personal-status { display:grid; gap:6rpx; margin:20rpx 0; padding:18rpx; border-radius:18rpx; background:#fff7ec; border:1rpx solid #eadac6; }
.personal-status.done { background:#f2f8ef; border-color:#c8dfbf; }
.personal-status-title { color:#5b2f24; font-size:28rpx; font-weight:900; }
.personal-status-sub { color:#8a6b58; font-size:24rpx; line-height:1.5; }
.done-button { background:#5b8c5a; color:#fff; }
.checkin-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14rpx; margin-top:18rpx; }
.checkin-stat { display:grid; gap:4rpx; padding:16rpx 10rpx; border-radius:16rpx; background:#f9f4ee; }
.checkin-stat-value { color:#c43d3d; font-size:34rpx; font-weight:900; line-height:1.1; }
.checkin-stat-label { color:#8a6b58; font-size:22rpx; }
.calendar-card { margin-top:24rpx; border-radius:24rpx; box-shadow:0 12rpx 34rpx rgba(91,47,36,0.07); }
.calendar-title { margin-bottom:16rpx; display:block; font-family:"STKaiti","KaiTi",serif; }
.calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:8rpx; }
.calendar-day { text-align:center; padding:12rpx; font-size:26rpx; color:#666666; border-radius:14rpx; background:#f9f4ee; }
.calendar-day.active { background:#c43d3d; color:#fff; }
.calendar-day.today { box-shadow: inset 0 0 0 2rpx #c43d3d; }
@media (min-width: 900px) {
  .checkin-page { max-width:760px; margin:0 auto; }
}
</style>
