<script setup lang="ts">
defineProps<{ status: "open" | "full" | "ended" | "cancelled"; priceText: string }>();
const emit = defineEmits<{ action: [] }>();
</script>
<template><view class="fixed-action"><text class="time">◷ 报名状态</text><button :disabled="status !== 'open'" @click="emit('action')">{{ status === 'open' ? `立即报名 ${priceText}` : status === 'full' ? '已满座' : status === 'ended' ? '报名已结束' : '活动已取消' }}</button></view></template>
<style scoped>
@import "../../styles/tokens.css";
.fixed-action{position:fixed;z-index:var(--mp-z-tabbar);right:0;bottom:0;left:0;display:flex;align-items:center;gap:10px;max-width:520px;margin:0 auto;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:#fff;box-shadow:0 -5px 20px rgb(27 53 41 / 10%)}.time{color:#a83a36;font-size:var(--mp-font-sm)}button{height:46px;flex:1;border:0;border-radius:23px;background:var(--mp-brand-primary);color:#063c27;font-size:15px;font-weight:700}button:disabled{background:#d4d4d4;color:#fff}
</style>
