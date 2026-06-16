<template>
  <view class="row" style="margin-bottom:16rpx;">
    <text class="title-md">{{ title }}</text>
    <text v-if="linkText" class="subtle" style="color:#C43D3D;" @click="$emit('linkClick')">{{ linkText }} ›</text>
  </view>
</template>
<script setup lang="ts">
defineProps<{ title: string; linkText?: string }>();
defineEmits<{ (e: 'linkClick'): void }>();
</script>
