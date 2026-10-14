<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow, onHide, onUnload } from "@dcloudio/uni-app";
import MobileShell from "../../components/layout/MobileShell.vue";
import BaseBottomSheet from "../../components/sheets/BaseBottomSheet.vue";
import MessageItem from "../../components/message/MessageItem.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import type { MessageItem as MessageData } from "../../types/message";
import { mobileTabRoute } from "../../mobile-tab-routes";
import { getCurrentTenantCode, getUserToken, request, withTenantCode } from "../../api";
import { announcementMessage, memberMessage, type Announcement, type MemberNotification, type InboxMessage } from "./message-state";
import { markdownToRichTextHtml } from "@activity/shared";

const messages = ref<InboxMessage[]>([]);
const selected = ref<InboxMessage | null>(null);
const loading = ref(false);
const loadError = ref("");
const actionError = ref("");
const isGuest = ref(!getUserToken());
const reading = ref(false);
type MessageFilter = "all" | "activity" | "system";
const filter = ref<MessageFilter>("all");
let loadSequence = 0;
const visibleMessages = computed(() => messages.value.filter((item) => filter.value === "all" || item.type === filter.value));
const unreadCount = computed(() => messages.value.filter((item) => item.unread).length);
function invalidateLoad() { loadSequence += 1; selected.value = null; loading.value = false; reading.value = false; }
function isCurrent(sequence: number, token: string, tenant: string) { return sequence === loadSequence && token === getUserToken() && tenant === getCurrentTenantCode(); }
async function load() {
  const sequence = ++loadSequence;
  const token = getUserToken();
  const tenant = getCurrentTenantCode();
  isGuest.value = !token;
  loading.value = true;
  reading.value = false;
  messages.value = [];
  selected.value = null;
  loadError.value = "";
  actionError.value = "";
  const options = { userToken: token, tenantCode: tenant };
  const [announcements, inbox] = await Promise.allSettled([
    request<Announcement[]>("/public/announcements", options),
    token ? request<MemberNotification[]>("/public/me/notifications", options) : Promise.resolve([])
  ]);
  if (!isCurrent(sequence, token, tenant)) {
    if (sequence === loadSequence) void load();
    return;
  }
  loading.value = false;
  if (announcements.status === "fulfilled" && Array.isArray(announcements.value)) messages.value.push(...announcements.value.map(announcementMessage));
  else loadError.value = "平台公告暂时无法同步。";
  if (inbox.status === "fulfilled" && Array.isArray(inbox.value)) messages.value.unshift(...inbox.value.map(memberMessage));
  else loadError.value += "个人通知暂时无法同步，请重新加载。";
}
async function persistRead(message: InboxMessage, sequence: number, token: string, tenant: string) {
  if (message.source !== "personal" || !message.unread) return;
  const result = await request<MemberNotification>(`/public/me/notifications/${message.id}/read`, { method: "POST", userToken: token, tenantCode: tenant });
  if (!isCurrent(sequence, token, tenant)) return;
  if (result.id !== message.id || !result.readAt) throw new Error("消息已读状态暂未同步，请重试");
  messages.value = messages.value.map((item) => item.source === "personal" && item.id === message.id ? memberMessage(result) : item);
}
async function openMessage(message: MessageData) {
  if (reading.value) return;
  const item = messages.value.find((row) => row === message);
  if (!item) return;
  selected.value = item;
  actionError.value = "";
  reading.value = true;
  const sequence = loadSequence, token = getUserToken(), tenant = getCurrentTenantCode();
  try { await persistRead(item, sequence, token, tenant); }
  catch { if (isCurrent(sequence, token, tenant)) actionError.value = "已读状态未保存，请稍后重试。"; }
  finally { if (isCurrent(sequence, token, tenant)) reading.value = false; }
}
async function markRead() {
  if (reading.value) return;
  reading.value = true;
  actionError.value = "";
  const sequence = loadSequence, token = getUserToken(), tenant = getCurrentTenantCode();
  try {
    for (const message of messages.value.filter((item) => item.unread)) {
      if (!isCurrent(sequence, token, tenant)) return;
      await persistRead(message, sequence, token, tenant);
    }
  } catch { if (isCurrent(sequence, token, tenant)) actionError.value = "部分消息未保存已读状态，请重试。"; }
  finally { if (isCurrent(sequence, token, tenant)) reading.value = false; }
}
function login() { uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${encodeURIComponent(mobileTabRoute("messages"))}`) }); }
function openActivity() { if (selected.value?.activityId) uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${selected.value.activityId}`) }); }
onShow(() => { void load(); });
onHide(invalidateLoad);
onUnload(invalidateLoad);
function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") {
  if (tab === "home") uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) });
  else if (tab === "checkin") uni.reLaunch({ url: withTenantCode(mobileTabRoute("checkin")) });
  else if (tab === "me") uni.reLaunch({ url: withTenantCode(mobileTabRoute("me")) });
}
</script>

<template>
  <MobileShell active-tab="messages" @tab="selectTab">
    <view class="message-page">
      <view class="header"><text class="title">消息</text><button v-if="unreadCount" class="read-all" :disabled="reading" @click="markRead">{{ reading ? "保存中…" : "全部标为已读" }}<view class="unread-badge">{{ unreadCount }}</view></button></view>
      <view v-if="isGuest" class="login-note"><IconGlyph name="message" :size="15" label="个人通知" /><view><text>登录后查看自己的活动提醒</text><small>平台公告可直接浏览</small></view><button @click="login">登录 / 注册</button></view>
      <view class="message-filters" role="tablist" aria-label="消息分类"><view v-for="tab in [{key:'all',label:'全部'},{key:'activity',label:'活动提醒'},{key:'system',label:'平台通知'}]" :key="tab.key" role="tab" tabindex="0" :aria-selected="filter === tab.key" :class="{active: filter === tab.key}" @click="filter = tab.key as MessageFilter" @keyup.enter="filter = tab.key as MessageFilter" @keyup.space.prevent="filter = tab.key as MessageFilter">{{ tab.label }}</view></view>
      <view v-if="loading" class="message-state" role="status">正在同步消息…</view>
      <view v-else-if="loadError" class="message-state error" role="alert"><text>{{ loadError }}</text><button @click="load">重新加载</button></view>
      <view v-if="actionError" class="message-state error" role="alert">{{ actionError }}</view>
      <MessageItem v-for="message in visibleMessages" :key="`${message.source}-${message.id}`" :message="message" @open="openMessage" />
      <view v-if="!loading && !loadError && !visibleMessages.length" class="empty"><IconGlyph class="empty-mark" name="bell" :size="34" label="暂无消息" /><text>暂时没有需要处理的消息</text><small>正式公告和你的活动通知会在这里出现。</small></view>
    </view>
    <BaseBottomSheet :open="Boolean(selected)" title="消息详情" @close="selected = null">
      <view v-if="selected" class="notice-detail"><text class="notice-title">{{ selected.title }}</text><rich-text v-if="selected.source === 'announcement'" class="notice-content" :nodes="markdownToRichTextHtml(selected.content)" /><text v-else class="notice-content">{{ selected.content }}</text><small>{{ selected.createdAt }}</small><text v-if="actionError" class="message-state error">{{ actionError }}</text><button v-if="selected.activityId" @click="openActivity">查看活动</button><button @click="selected = null">知道了</button></view>
    </BaseBottomSheet>
  </MobileShell>
</template>

<style scoped>
.message-page { min-height: 100vh; padding: 22rpx 24rpx 160rpx; background: var(--mp-bg-page); }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.title { color: var(--mp-text-primary); font-size: 42rpx; font-weight: 700; }
.read-all { display:flex; align-items:center; gap:8rpx; color: var(--mp-brand-primary); font-size: 24rpx; }
.read-all{min-height:44px;margin:0;padding:0 10px;border:1px solid var(--mp-border);border-radius:8px;background:var(--mp-bg-surface);line-height:1.4}.read-all::after{border:0}
.login-note{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:12px;border:1px solid var(--mp-border);border-radius:10px;background:var(--mp-bg-surface);color:var(--mp-brand-primary-dark)}.login-note>view:not(.icon-glyph){display:grid;flex:1;min-width:0;gap:4px;font-size:12px}.login-note small{color:var(--mp-text-muted);font-size:11px}.login-note button{min-height:44px;flex:0 0 auto;margin:0;padding:0 10px;border:1px solid var(--mp-border);border-radius:7px;background:var(--mp-bg-soft);color:var(--mp-text-secondary);font-size:12px;line-height:44px}.login-note button::after{border:0}
.message-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-bottom:14px;padding:4px;border:1px solid var(--mp-border);border-radius:10px;background:var(--mp-bg-surface)}.message-filters>view{display:grid;min-height:44px;place-items:center;border-radius:7px;color:var(--mp-text-muted);font-size:12px}.message-filters>view.active{background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark);font-weight:700}
.message-state{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;padding:12px;border:1px solid var(--mp-border);border-radius:8px;background:var(--mp-bg-surface);color:var(--mp-text-secondary);font-size:12px;line-height:1.5}.message-state.error{color:var(--mp-danger)}.message-state button{min-height:44px;flex:0 0 auto;margin:0;padding:0 10px;border:1px solid var(--mp-border);border-radius:7px;background:var(--mp-bg-surface);color:var(--mp-brand-primary-dark);font-size:12px;line-height:44px}.message-state button::after{border:0}
.unread-badge { display:inline-flex; min-width: 32rpx; height: 32rpx; align-items: center; justify-content: center; border-radius: 50%; background: var(--mp-brand-primary); color: #fff; font-size: 20rpx; }
.demo-note{display:flex;align-items:center;gap:6px;margin-bottom:10px;padding:9px 11px;border-radius:10px;background:#f3eee5;color:#8a6847;font-size:11px}.empty { display: grid; justify-items: center; gap: 12rpx; padding: 180rpx 24rpx; color: var(--mp-text-secondary); text-align: center; }
.empty-mark { color: var(--mp-brand-primary); }
.empty small, .notice-detail small { color: var(--mp-text-muted); font-size: 24rpx; }
.notice-detail { display: grid; gap: 18rpx; padding: 10rpx 0 20rpx; }
.notice-title { color: var(--mp-text-primary); font-size: 32rpx; font-weight: 700; }
.notice-content { color: var(--mp-text-secondary); font-size: 28rpx; line-height: 1.7; }
.notice-detail button { min-height: 78rpx; border: 0; border-radius: 10rpx; background: var(--mp-brand-primary); color: #fff; }
</style>
