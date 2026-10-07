<script setup lang="ts">
import { computed, ref } from "vue";
import MobileShell from "../../components/layout/MobileShell.vue";
import BaseBottomSheet from "../../components/sheets/BaseBottomSheet.vue";
import MessageItem from "../../components/message/MessageItem.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import { mockMessages } from "../../mock/message";
import type { MessageItem as MessageData } from "../../types/message";
import { mobileTabRoute } from "../../mobile-tab-routes";
import { withTenantCode } from "../../api";

const messages = ref<MessageData[]>(mockMessages.map((item) => ({ ...item })));
const selected = ref<MessageData | null>(null);
const unreadCount = computed(() => messages.value.filter((item) => item.unread).length);
function openMessage(message: MessageData) { selected.value = message; messages.value = messages.value.map((item) => item.id === message.id ? { ...item, unread: false } : item); }
function markRead() { messages.value = messages.value.map((item) => ({ ...item, unread: false })); }
function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") {
  if (tab === "home") uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) });
  else if (tab === "checkin") uni.reLaunch({ url: withTenantCode(mobileTabRoute("checkin")) });
  else if (tab === "me") uni.reLaunch({ url: withTenantCode(mobileTabRoute("me")) });
  else if (tab === "publish") { uni.setStorageSync("open_publish_sheet", "1"); uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) }); }
}
</script>

<template>
  <MobileShell active-tab="messages" @tab="selectTab">
    <view class="message-page">
      <view class="header"><text class="title">消息</text><view class="read-all" @click="markRead">全部已读<view v-if="unreadCount" class="unread-badge">{{ unreadCount }}</view></view></view>
      <view class="demo-note"><IconGlyph name="message" :size="15" label="演示消息" /><text>当前为演示消息，不代表真实通知</text></view>
      <MessageItem v-for="message in messages" :key="message.id" :message="message" @open="openMessage" />
      <view v-if="!messages.length" class="empty"><IconGlyph class="empty-mark" name="bell" :size="34" label="暂无消息" /><text>暂时没有需要处理的消息</text><small>真实报名、活动提醒和变更通知会在这里出现。</small></view>
    </view>
    <BaseBottomSheet :open="Boolean(selected)" title="消息详情" @close="selected = null">
      <view v-if="selected" class="notice-detail"><text class="notice-title">{{ selected.title }}</text><text class="notice-content">{{ selected.content }}</text><small>{{ selected.createdAt }}</small><button @click="selected = null">知道了</button></view>
    </BaseBottomSheet>
  </MobileShell>
</template>

<style scoped>
.message-page { min-height: 100vh; padding: 22rpx 24rpx 160rpx; background: var(--mp-bg-page); }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.title { color: var(--mp-text-primary); font-size: 42rpx; font-weight: 700; }
.read-all { display:flex; align-items:center; gap:8rpx; color: var(--mp-brand-primary); font-size: 24rpx; }
.unread-badge { display:inline-flex; min-width: 32rpx; height: 32rpx; align-items: center; justify-content: center; border-radius: 50%; background: var(--mp-brand-primary); color: #fff; font-size: 20rpx; }
.demo-note{display:flex;align-items:center;gap:6px;margin-bottom:10px;padding:9px 11px;border-radius:10px;background:#f3eee5;color:#8a6847;font-size:11px}.empty { display: grid; justify-items: center; gap: 12rpx; padding: 180rpx 24rpx; color: var(--mp-text-secondary); text-align: center; }
.empty-mark { color: var(--mp-brand-primary); }
.empty small, .notice-detail small { color: var(--mp-text-muted); font-size: 24rpx; }
.notice-detail { display: grid; gap: 18rpx; padding: 10rpx 0 20rpx; }
.notice-title { color: var(--mp-text-primary); font-size: 32rpx; font-weight: 700; }
.notice-content { color: var(--mp-text-secondary); font-size: 28rpx; line-height: 1.7; }
.notice-detail button { min-height: 78rpx; border: 0; border-radius: 10rpx; background: var(--mp-brand-primary); color: #fff; }
</style>
