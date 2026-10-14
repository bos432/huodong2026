<script setup lang="ts">
import type { MessageItem as MessageData } from "../../types/message";
import IconGlyph from "../ui/IconGlyph.vue";
defineProps<{ message: MessageData }>();
const emit = defineEmits<{ open: [MessageData] }>();
</script>
<template><view class="message-item" role="button" tabindex="0" :aria-label="`${message.unread ? '未读' : '通知'}：${message.title}`" @click="emit('open', message)" @keyup.enter="emit('open', message)" @keyup.space.prevent="emit('open', message)"><view class="icon" :class="message.type"><IconGlyph :name="message.type === 'assistant' ? 'star' : message.type === 'activity' ? 'bell' : 'message'" :size="21" /></view><view class="copy"><view><b>{{ message.title }}</b><small>{{ message.createdAt }}</small></view><p>{{ message.summary }}</p></view><i v-if="message.unread" class="unread" aria-label="未读消息"></i></view></template>
<style scoped>
@import "../../styles/tokens.css";
.message-item{position:relative;display:flex;align-items:center;gap:12px;margin:0 14px 10px;padding:14px;border:1px solid var(--mp-border);border-radius:10px;background:var(--mp-bg-surface);box-shadow:var(--mp-shadow-card);touch-action:manipulation}.icon{display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border-radius:50%;color:#fff}.icon.assistant{background:var(--mp-brand-primary)}.icon.activity{background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark)}.icon.system{background:var(--mp-mist-soft);color:var(--mp-mist-600)}.copy{min-width:0;flex:1}.copy>view{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px}.copy b{color:var(--mp-text-primary);font-size:15px;word-break:break-word}.copy small,.copy p{color:var(--mp-text-muted);font-size:11px}.copy p{margin:5px 0 0;font-size:12px;line-height:1.5;word-break:break-word}.unread{flex:0 0 6px;width:6px;height:6px;border-radius:50%;background:var(--mp-danger)}
</style>
