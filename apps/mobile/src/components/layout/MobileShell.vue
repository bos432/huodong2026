<script setup lang="ts">
import IconGlyph from "../ui/IconGlyph.vue";
import { onMounted, ref } from "vue";
import PublishEntrySheet from "./PublishEntrySheet.vue";
defineProps<{ activeTab?: "home" | "checkin" | "messages" | "me"; navigationOnly?: boolean }>();
const emit = defineEmits<{ tab: ["home" | "checkin" | "messages" | "me" | "publish"] }>();
const publishOpen = ref(false);
function openPublish() { publishOpen.value = true; }
defineExpose({ openPublish });
onMounted(() => {
  if (uni.getStorageSync("open_publish_sheet")) {
    uni.removeStorageSync("open_publish_sheet");
    publishOpen.value = true;
  }
});
</script>

<template>
  <view class="mobile-shell" :class="{ 'navigation-only': navigationOnly }"><view v-if="!navigationOnly" class="mobile-scroll"><slot /></view><view class="mobile-tabbar" role="navigation" aria-label="慢π主导航">
    <view class="mobile-tab" :class="{ active: activeTab === 'home' }" role="tab" tabindex="0" :aria-selected="activeTab === 'home'" aria-label="首页" @click="emit('tab', 'home')" @keyup.enter="emit('tab', 'home')" @keyup.space.prevent="emit('tab', 'home')"><IconGlyph name="home" :size="20" label="首页" /><small>首页</small></view>
    <view class="mobile-tab" :class="{ active: activeTab === 'checkin' }" role="tab" tabindex="0" :aria-selected="activeTab === 'checkin'" aria-label="行程" @click="emit('tab', 'checkin')" @keyup.enter="emit('tab', 'checkin')" @keyup.space.prevent="emit('tab', 'checkin')"><IconGlyph name="calendar" :size="20" label="行程" /><small>行程</small></view>
    <view class="mobile-publish" role="button" tabindex="0" aria-label="打开发布入口" @click="publishOpen = true" @keyup.enter="publishOpen = true" @keyup.space.prevent="publishOpen = true"><view class="publish-circle"><IconGlyph name="plus" :size="19" label="发布" /></view><small>发布</small></view>
    <view class="mobile-tab" :class="{ active: activeTab === 'messages' }" role="tab" tabindex="0" :aria-selected="activeTab === 'messages'" aria-label="消息" @click="emit('tab', 'messages')" @keyup.enter="emit('tab', 'messages')" @keyup.space.prevent="emit('tab', 'messages')"><IconGlyph name="message" :size="20" label="消息" /><small>消息</small></view>
    <view class="mobile-tab" :class="{ active: activeTab === 'me' }" role="tab" tabindex="0" :aria-selected="activeTab === 'me'" aria-label="我的" @click="emit('tab', 'me')" @keyup.enter="emit('tab', 'me')" @keyup.space.prevent="emit('tab', 'me')"><IconGlyph name="user" :size="20" label="我的" /><small>我的</small></view>
  </view><PublishEntrySheet :open="publishOpen" @close="publishOpen = false" /></view>
</template>

<style scoped>
@import "../../styles/tokens.css";
.mobile-shell.navigation-only{min-height:0;background:transparent}
.mobile-shell{min-height:100vh;background:var(--mp-bg-page);font-family:var(--mp-font-family)}.mobile-scroll{min-height:100vh;padding-bottom:calc(88px + env(safe-area-inset-bottom))}.mobile-tabbar{position:fixed;z-index:var(--mp-z-tabbar);right:0;bottom:0;left:0;display:grid;grid-template-columns:1fr 1fr 64px 1fr 1fr;align-items:center;height:calc(66px + env(safe-area-inset-bottom));padding:8px 8px calc(8px + env(safe-area-inset-bottom));background:rgb(255 255 255 / 97%);border-top:1px solid var(--mp-border)}.mobile-tab{min-height:46px;display:flex;align-items:center;flex-direction:column;gap:3px;padding:2px 0;color:var(--mp-text-muted);font-size:var(--mp-font-xs)}.mobile-tab .icon-glyph{width:21px!important;height:21px!important}.mobile-tab.active{color:var(--mp-brand-primary-dark);font-weight:700}.mobile-tab:focus-visible,.mobile-publish:focus-visible{outline:2px solid var(--mp-brand-primary);outline-offset:3px}.mobile-publish{display:grid;justify-items:center;align-content:center;gap:2px;min-height:46px;background:transparent;color:var(--mp-brand-primary);font-size:var(--mp-font-xs);font-weight:650;cursor:pointer}.publish-circle{display:grid;width:36px;height:36px;place-items:center;margin-top:-16px;border-radius:50%;background:var(--mp-brand-primary);color:#fff;box-shadow:0 3px 10px rgb(185 83 63 / 24%)}.publish-circle .icon-glyph{width:19px!important;height:19px!important}
@media (max-width: 359px){.mobile-tabbar{grid-template-columns:1fr 1fr 56px 1fr 1fr;padding-right:4px;padding-left:4px}}
</style>
