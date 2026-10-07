<script setup lang="ts">
import type { MessageItem as MessageData } from "../../types/message";
import IconGlyph from "../ui/IconGlyph.vue";
defineProps<{ message: MessageData }>();
const emit = defineEmits<{ open: [MessageData] }>();
</script>
<template><view class="message-item" @click="emit('open', message)"><view class="icon" :class="message.type"><IconGlyph :name="message.type === 'assistant' ? 'star' : message.type === 'activity' ? 'bell' : 'message'" :size="21" /></view><view class="copy"><view><b>{{ message.title }}</b><small>{{ message.createdAt }}</small></view><p>{{ message.summary }}</p></view><i v-if="message.unread" class="unread">1</i></view></template>
<style scoped>
@import "../../styles/tokens.css";
.message-item{position:relative;display:flex;align-items:center;gap:12px;margin:0 14px 10px;padding:14px;border-radius:14px;background:#fff;box-shadow:var(--mp-shadow-card);touch-action:manipulation}.icon{display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border-radius:50%;color:#fff}.icon.assistant{background:#b9533f}.icon.activity{background:#6d9b7b}.icon.system{background:#8d8d72}.copy{min-width:0;flex:1}.copy>view{display:flex;justify-content:space-between;gap:8px}.copy b{font-size:15px}.copy small,.copy p{color:#89968f;font-size:11px}.copy p{margin:5px 0 0;font-size:12px}.unread{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--mp-danger);color:#fff;font-size:10px;font-style:normal}
</style>
