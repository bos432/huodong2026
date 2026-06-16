<template>
  <view class="empty-state">
    <text class="empty-state-icon">{{ icon }}</text>
    <text class="empty-state-text">{{ text }}</text>
  </view>
</template>
<script setup lang="ts">
defineProps<{ icon?: string; text?: string }>();
</script>
