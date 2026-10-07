<script setup lang="ts">
import IconGlyph from "../ui/IconGlyph.vue";
import { ref } from "vue";
import PublishEntrySheet from "./PublishEntrySheet.vue";
defineProps<{ activeTab?: "home" | "checkin" | "messages" | "me" }>();
const emit = defineEmits<{ tab: ["home" | "checkin" | "messages" | "me" | "publish"] }>();
const publishOpen = ref(false);
</script>

<template>
  <view class="mobile-shell"><view class="mobile-scroll"><slot /></view><view class="mobile-tabbar" role="tablist" aria-label="慢π主导航">
    <view class="mobile-tab" :class="{ active: activeTab === 'home' }" role="tab" tabindex="0" :aria-selected="activeTab === 'home'" aria-label="首页" @click="emit('tab', 'home')" @keyup.enter="emit('tab', 'home')" @keyup.space.prevent="emit('tab', 'home')"><IconGlyph name="home" :size="20" label="首页" /><small>首页</small></view>
    <view class="mobile-tab" :class="{ active: activeTab === 'checkin' }" role="tab" tabindex="0" :aria-selected="activeTab === 'checkin'" aria-label="打卡" @click="emit('tab', 'checkin')" @keyup.enter="emit('tab', 'checkin')" @keyup.space.prevent="emit('tab', 'checkin')"><IconGlyph name="checkin" :size="20" label="打卡" /><small>打卡</small></view>
    <view class="mobile-publish" role="button" tabindex="0" aria-label="打开发布入口" @click="publishOpen = true" @keyup.enter="publishOpen = true" @keyup.space.prevent="publishOpen = true"><IconGlyph name="edit" :size="20" label="发布" /><small>发布</small></view>
    <view class="mobile-tab" :class="{ active: activeTab === 'messages' }" role="tab" tabindex="0" :aria-selected="activeTab === 'messages'" aria-label="消息" @click="emit('tab', 'messages')" @keyup.enter="emit('tab', 'messages')" @keyup.space.prevent="emit('tab', 'messages')"><IconGlyph name="message" :size="20" label="消息" /><small>消息</small></view>
    <view class="mobile-tab" :class="{ active: activeTab === 'me' }" role="tab" tabindex="0" :aria-selected="activeTab === 'me'" aria-label="我的" @click="emit('tab', 'me')" @keyup.enter="emit('tab', 'me')" @keyup.space.prevent="emit('tab', 'me')"><IconGlyph name="user" :size="20" label="我的" /><small>我的</small></view>
  </view><PublishEntrySheet :open="publishOpen" @close="publishOpen = false" /></view>
</template>

<style scoped>
@import "../../styles/tokens.css";
.mobile-shell{min-height:100vh;background:var(--mp-bg-page);font-family:var(--mp-font-family)}.mobile-scroll{min-height:100vh;padding-bottom:calc(88px + env(safe-area-inset-bottom))}.mobile-tabbar{position:fixed;z-index:var(--mp-z-tabbar);right:0;bottom:0;left:0;display:grid;grid-template-columns:repeat(5,1fr);align-items:end;height:calc(72px + env(safe-area-inset-bottom));padding:7px 14px calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid var(--mp-border);box-shadow:0 -6px 22px rgb(31 109 76 / 6%)}.mobile-tab{min-height:44px;display:flex;align-items:center;flex-direction:column;gap:3px;color:#b3bab5;font-size:var(--mp-font-xs)}.mobile-tab.active{color:var(--mp-text-primary);font-weight:700}.mobile-tab:focus-visible,.mobile-publish:focus-visible{outline:2px solid var(--mp-brand-primary);outline-offset:3px}.tab-icon{font-size:20px;line-height:25px}.mobile-publish{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;min-height:44px;color:var(--mp-text-primary);font-size:var(--mp-font-xs);font-weight:700;cursor:pointer}.mobile-publish .icon-glyph{color:var(--mp-brand-primary)}
</style>
