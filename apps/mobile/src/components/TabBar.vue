<template>
  <view class="custom-tabbar">
    <view
      v-for="(item, idx) in tabs"
      :key="idx"
      class="custom-tabbar-item"
      :class="{ active: current === item.page }"
      @click="switchTab(item.page)"
    >
      <view class="custom-tabbar-icon">
        <text>{{ current === item.page ? item.activeIcon : item.icon }}</text>
      </view>
      <text>{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{ current: string }>();

const tabs = [
  { page: "index", label: "书院", icon: "🏛", activeIcon: "🏯" },
  { page: "courses", label: "课程", icon: "📖", activeIcon: "📚" },
  { page: "community", label: "共修", icon: "🪷", activeIcon: "🌸" },
  { page: "activity", label: "活动", icon: "📅", activeIcon: "🎯" },
  { page: "user", label: "我的", icon: "⛰", activeIcon: "🏔" }
];

function switchTab(page: string) {
  if (page === props.current) return;
  let url = "/pages/index/index";
  switch (page) {
    case "index": url = "/pages/index/index"; break;
    case "courses": url = "/pages/courses/index"; break;
    case "community": url = "/pages/community/index"; break;
    case "activity": url = "/pages/activity/list"; break;
    case "user": url = "/pages/user/my"; break;
  }
  uni.reLaunch({ url });
}
</script>
