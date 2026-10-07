<template>
  <MobileShell active-tab="messages" @tab="selectTab">
    <view class="notifications-page">
      <view class="page-heading">
        <view>
          <text class="eyebrow">慢π通知</text>
          <text class="title">消息</text>
          <text class="subtitle">活动公告和平台提醒会集中显示在这里。</text>
        </view>
        <view class="demo-badge">数据以正式发布为准</view>
      </view>

      <LoadingState v-if="loading" title="正在加载消息" description="请稍候，正在同步慢π公告和活动提醒。" />
      <EmptyState v-else-if="loadError" variant="error" title="消息加载失败" :description="loadError" action-text="重新加载" @action="load" />
      <template v-else>
        <view class="notice-intro">
          <view class="notice-icon"><IconGlyph name="bell" :size="20" label="通知" /></view>
          <view class="notice-copy">
            <text class="notice-title">真实通知会在这里出现</text>
            <text class="notice-text">报名、订单、退款和活动变更消息将按实际业务状态发送，不展示虚构的未读数量。</text>
          </view>
        </view>
        <view v-if="rows.length" class="notice-list">
          <view v-for="item in rows" :key="item.id" class="notice-card">
            <view class="notice-meta"><text class="notice-tag">{{ item.type || "平台通知" }}</text><text>{{ formatTime(item.publishAt || item.createdAt) }}</text></view>
            <text class="notice-card-title">{{ item.title }}</text>
            <rich-text class="notice-content" :nodes="richContent(item.content)" />
          </view>
        </view>
        <EmptyState v-else variant="message" title="暂无新消息" description="当前没有可展示的正式通知。报名成功、活动变更和退款结果会在对应业务完成后显示。" compact />
      </template>
    </view>
  </MobileShell>
</template>

<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { ref } from "vue";
import MobileShell from "../../components/layout/MobileShell.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import EmptyState from "../../components/EmptyState.vue";
import LoadingState from "../../components/LoadingState.vue";
import { request, withTenantCode } from "../../api";
import { reviewSafeText } from "../../review-safe-text";
import { formatShanghaiDateTime } from "../../tenant-load-guard";
import { markdownToRichTextHtml } from "@activity/shared";
import { mobileTabRoute } from "../../mobile-tab-routes";

const rows = ref<any[]>([]);
const loading = ref(true);
const loadError = ref("");

function formatTime(value?: string) {
  return formatShanghaiDateTime(value, "");
}

function richContent(content: unknown) {
  return markdownToRichTextHtml(content);
}

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    const result = await request<any[]>("/public/announcements");
    rows.value = Array.isArray(result) ? result : [];
  } catch (error: any) {
    rows.value = [];
    loadError.value = reviewSafeText(error?.message || "消息加载失败，请稍后重试。");
  } finally {
    loading.value = false;
  }
}

function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") {
  if (tab === "publish") return;
  if (tab === "messages") return;
  uni.reLaunch({ url: withTenantCode(mobileTabRoute(tab)) });
}

onShow(() => { void load(); });
</script>

<style scoped>
@import "../../styles/tokens.css";
.notifications-page{min-height:100vh;box-sizing:border-box;padding:22px 14px calc(20px + env(safe-area-inset-bottom));background:var(--mp-bg-page);font-family:var(--mp-font-family)}
.page-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:4px 4px 18px}.eyebrow,.title,.subtitle{display:block}.eyebrow{color:var(--mp-brand-primary);font-size:11px;font-weight:800;letter-spacing:.08em}.title{margin-top:5px;color:var(--mp-text-primary);font-size:28px;font-weight:800}.subtitle{margin-top:5px;color:var(--mp-text-muted);font-size:12px;line-height:1.5}.demo-badge{max-width:110px;padding:7px 9px;border-radius:9px;background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark);font-size:10px;line-height:1.4;text-align:right}
.notice-intro{display:flex;gap:11px;padding:14px;border:1px solid var(--mp-border);border-radius:14px;background:#fff}.notice-icon{display:grid;place-items:center;width:40px;height:40px;flex:0 0 auto;border-radius:12px;background:var(--mp-brand-soft);color:var(--mp-brand-primary)}.notice-copy{min-width:0}.notice-title,.notice-text{display:block}.notice-title{color:var(--mp-text-primary);font-size:13px;font-weight:800}.notice-text{margin-top:5px;color:var(--mp-text-muted);font-size:11px;line-height:1.55}.notice-list{display:grid;gap:10px;margin-top:12px}.notice-card{padding:14px;border:1px solid var(--mp-border);border-radius:14px;background:#fff}.notice-meta{display:flex;justify-content:space-between;gap:8px;color:var(--mp-text-muted);font-size:10px}.notice-tag{color:var(--mp-brand-primary-dark);font-weight:700}.notice-card-title{display:block;margin-top:9px;color:var(--mp-text-primary);font-size:14px;font-weight:800}.notice-content{display:block;margin-top:6px;color:var(--mp-text-secondary);font-size:12px;line-height:1.6}
</style>
