<template>
  <view class="container checkin-page">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">返回</view>
      <text class="nav-title">今日打卡</text>
      <view class="nav-placeholder"></view>
    </view>
    <view v-if="loading" class="checkin-card state-card">
      <text class="subtle state-text">加载今日打卡...</text>
    </view>
    <view v-else-if="!task" class="checkin-card state-card">
      <text class="title-lg state-title">暂无今日任务</text>
      <text class="subtle state-text">请等待书院发布今天的打卡任务。</text>
    </view>
    <view v-else class="checkin-card task-card">
      <text class="subtle task-date">{{ dateTitle }}</text>
      <text class="title-lg task-title">今日任务</text>
      <text class="body-text task-name">{{ task.title }}</text>
      <text v-if="task.description" class="subtle task-desc">{{ task.description }}</text>
      <view v-if="!checkedIn" class="button block button-lg" :class="{ disabled: submitting }" @click="doCheckin">{{ submitting ? "打卡中..." : "点击打卡" }}</view>
      <view v-else class="button block button-lg disabled done-button">已完成</view>
      <text class="subtle month-count">本月已打卡 {{ checkedDays.length }} 天</text>
    </view>

    <!-- 打卡日历 -->
    <view class="card calendar-card">
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
import { onLoad } from "@dcloudio/uni-app";
import { ensureUser, request } from "../../api";
const checkedIn = ref(false);
const loading = ref(true);
const submitting = ref(false);
const task = ref<any>(null);
const today = ref("");
const checkedDays = ref<number[]>([]);
const currentDay = computed(() => Number((today.value || localDateString()).slice(8, 10)));
const daysInMonth = computed(() => {
  const date = today.value || localDateString();
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return new Date(year, month, 0).getDate();
});
const dateTitle = computed(() => {
  const date = new Date(`${today.value || localDateString()}T00:00:00+08:00`);
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
});
const monthTitle = computed(() => {
  const date = new Date(`${today.value || localDateString()}T00:00:00+08:00`);
  return date.toLocaleDateString("zh-CN", { month: "long" });
});
function goBack() { uni.navigateBack(); }

function localDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function loadCheckin() {
  loading.value = true;
  try {
    await ensureUser();
    const data = await request<any>("/public/checkin/today");
    task.value = data;
    today.value = data?.today || localDateString();
    checkedIn.value = Boolean(data?.checkedToday);
    checkedDays.value = Array.isArray(data?.checkedDays) ? data.checkedDays : [];
  } catch (error: any) {
    uni.showToast({ title: error.message || "加载打卡失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function doCheckin() {
  if (submitting.value || checkedIn.value) return;
  submitting.value = true;
  try {
    await ensureUser();
    await request("/public/checkin/today/complete", { method: "POST" });
    await loadCheckin();
    uni.showToast({ title:"🎉 打卡成功！坚持就是胜利", icon:"none", duration:2000 });
  } catch (error: any) {
    uni.showToast({ title: error.message || "打卡失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}
onLoad(loadCheckin);
</script>
<style scoped>
.checkin-page { padding-bottom: 42rpx; }
.custom-nav { display:flex; align-items:center; justify-content: space-between; padding:16rpx 0; }
.nav-back, .nav-placeholder { min-width: 104rpx; min-height: 58rpx; display: flex; align-items: center; color:#4a6b8a; font-size:27rpx; font-weight: 800; }
.nav-title { flex:1; text-align:center; color:#333333; font-size:32rpx; font-weight:900; font-family:"STKaiti","KaiTi",serif; }
.checkin-card { margin-top:24rpx; background:#fff; border-radius:24rpx; padding:40rpx; box-shadow:0 12rpx 34rpx rgba(91,47,36,0.07); }
.state-card { text-align:center; }
.state-title { text-align:center; display:block; font-family:"STKaiti","KaiTi",serif; }
.state-text { display:block; text-align:center; margin-top:16rpx; }
.task-card { text-align:center; }
.task-date { display:block; margin-bottom:16rpx; }
.task-title { text-align:center; display:block; font-family:"STKaiti","KaiTi",serif; }
.task-name { display:block; text-align:center; margin:18rpx 0; color:#666666; line-height:1.7; }
.task-desc { display:block; text-align:center; margin-bottom:18rpx; line-height:1.6; }
.done-button { background:#5b8c5a; color:#fff; }
.month-count { display:block; text-align:center; margin-top:18rpx; }
.calendar-card { margin-top:24rpx; border-radius:24rpx; box-shadow:0 12rpx 34rpx rgba(91,47,36,0.07); }
.calendar-title { margin-bottom:16rpx; display:block; font-family:"STKaiti","KaiTi",serif; }
.calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:8rpx; }
.calendar-day { text-align:center; padding:12rpx; font-size:26rpx; color:#666666; border-radius:14rpx; background:#f9f4ee; }
.calendar-day.active { background:#c43d3d; color:#fff; }
.calendar-day.today { box-shadow: inset 0 0 0 2rpx #c43d3d; }
</style>
