<script setup lang="ts">
defineProps<{ open: boolean; title?: string; maxHeight?: string }>();
const emit = defineEmits<{ close: [] }>();
</script>
<template><view v-if="open" class="sheet-layer" @click.self="emit('close')"><view class="sheet" :style="{ maxHeight: maxHeight || '87vh' }"><view class="handle" /><view v-if="title" class="title">{{ title }}<button class="close" @click="emit('close')">×</button></view><!-- #ifdef H5 --><view class="sheet-scroll"><slot /></view><!-- #endif --><!-- #ifndef H5 --><scroll-view scroll-y class="sheet-scroll"><slot /></scroll-view><!-- #endif --></view></view></template>
<style scoped>
@import "../../styles/tokens.css";
.sheet-layer{position:fixed;inset:0;z-index:var(--mp-z-sheet);background:var(--mp-overlay)}.sheet{position:absolute;right:0;bottom:0;left:0;width:100%;max-width:520px;margin:0 auto;overflow:hidden;border-radius:22px 22px 0 0;background:#fff;box-shadow:var(--mp-shadow-sheet);animation:rise .25s ease-out}.handle{width:35px;height:4px;margin:9px auto;background:#d8dfdb;border-radius:9px}.title{position:relative;padding:8px 18px 14px;text-align:center;font-size:17px;font-weight:800}.close{position:absolute;right:12px;top:0;min-width:44px;min-height:44px;border:0;background:transparent;font-size:22px}.sheet-scroll{max-height:calc(87vh - 54px);padding-bottom:calc(16px + env(safe-area-inset-bottom))}@keyframes rise{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
</style>
