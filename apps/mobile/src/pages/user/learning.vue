<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">学习记录</text></view>
    <view v-for="r in records" :key="r.id" class="card" style="margin-bottom:12rpx;">
      <view class="row" style="justify-content:flex-start; gap:16rpx;">
        <view style="width:120rpx; height:80rpx; background:#F5E6D3; border-radius:12rpx; display:flex; align-items:center; justify-content:center;"><text style="font-size:36rpx;">{{ r.icon }}</text></view>
        <view><text style="font-size:28rpx; font-weight:600; color:#333;">{{ r.title }}</text><text class="subtle" style="display:block;">{{ r.time }}</text><text class="subtle">进度 {{ r.progress }}%</text></view>
      </view>
    </view>
    <empty-state v-if="!loading && !records.length" icon="🕐" text="暂无学习记录" />
  </view>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ensureUser, request } from "../../api";

const loading = ref(true);
const records = ref<any[]>([]);

function formatTime(value?: string) {
  if (!value) return "暂无学习时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

async function loadRecords() {
  loading.value = true;
  try {
    await ensureUser();
    const rows = await request<any[]>("/public/me/courses");
    records.value = (Array.isArray(rows) ? rows : []).map((course) => ({
      id: course.learning?.id || course.id,
      title: course.title || "未命名课程",
      icon: "📚",
      time: formatTime(course.learning?.updatedAt),
      progress: Number(course.learning?.progress || 0)
    }));
  } catch {
    records.value = [];
  } finally {
    loading.value = false;
  }
}

function goBack() { uni.navigateBack(); }
onMounted(loadRecords);
</script>
<style scoped>
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
</style>
