<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { HomepageSectionView } from "@activity/shared";
import { defaultBottomNavSection, goDecoratedLink, usePageDecoration } from "../decoration";
import { filterNavigationItemsByFeature } from "../feature-gates";
import { openActivityQuickAction } from "../activity-quick-action";

const props = defineProps<{
  section?: HomepageSectionView | null;
  currentPath: string;
}>();

const autoDecoration = usePageDecoration("home", props.currentPath);
const activeSection = computed(() => props.section === undefined ? autoDecoration.bottomNavSection.value : props.section);
const defaultItems = Array.isArray(defaultBottomNavSection.config?.items) ? defaultBottomNavSection.config.items : [];

onShow(() => {
  if (props.section === undefined) void autoDecoration.loadDecoration();
});

const items = computed(() => {
  const section = activeSection.value;
  if (!section || section.enabled === false) return [];
  const configuredItems = Array.isArray(section.config?.items) ? section.config.items : null;
  const configured = configuredItems
    ? configuredItems
        .map((item: any) => ({
          label: String(item?.label || "").trim(),
          link: String(item?.link || "").trim(),
          action: String(item?.action || "mainPage").trim(),
          color: String(item?.color || section.layout?.activeColor || "#C43D3D"),
          icon: String(item?.icon || "").trim(),
          activeIcon: String(item?.activeIcon || "").trim(),
          iconUrl: String(item?.iconUrl || "").trim(),
          enabled: item?.enabled !== false
        }))
        .filter((item: any) => item.enabled && item.label && item.link)
        .slice(0, 5)
    : [];
  if (configured.length) return filterNavigationItemsByFeature(configured);
  return filterNavigationItemsByFeature(defaultItems.map((item: any) => ({
    label: String(item?.label || "").trim(),
    link: String(item?.link || "").trim(),
    action: String(item?.action || "mainPage").trim(),
    color: String(item?.color || defaultBottomNavSection.layout?.activeColor || "#C43D3D"),
    icon: String(item?.icon || "").trim(),
    activeIcon: String(item?.activeIcon || "").trim(),
    iconUrl: String(item?.iconUrl || "").trim(),
    enabled: item?.enabled !== false
  })).filter((item: any) => item.enabled && item.label && item.link));
});

const leftNavCount = computed(() => Math.floor(items.value.length / 2));
function itemGridColumn(index: number) {
  return index < leftNavCount.value ? index + 1 : index + 3;
}

function isCurrent(url?: string) {
  const current = props.currentPath;
  const target = String(url || "").split("?")[0];
  if (current === "/pages/user/login") return false;
  if (target === current) return true;
  if (current.startsWith("/pages/course/") || current.startsWith("/pages/user/courses") || current.startsWith("/pages/user/learning")) return target === "/pages/courses/index";
  if (current.startsWith("/pages/community/")) return target === "/pages/community/index";
  if (current.startsWith("/pages/activity/") || current.startsWith("/pages/user/registration") || current.startsWith("/pages/user/review")) return target === "/pages/activity/list";
  if (current.startsWith("/pages/user/") || current.startsWith("/pages/charity/") || current.startsWith("/pages/service/")) return target === "/pages/user/my";
  return false;
}
</script>

<template>
  <view
    v-if="items.length"
    class="custom-tabbar"
    :style="{
      background: String(activeSection?.layout?.backgroundColor || '#ffffff'),
      '--nav-columns': items.length + 2
    }"
  >
    <view
      v-for="(item, index) in items"
      :key="item.link"
      class="custom-tabbar-item"
      :class="{ active: isCurrent(item.link) }"
      :style="{ color: isCurrent(item.link) ? String(item.color || activeSection?.layout?.activeColor || '#0f766e') : String(activeSection?.layout?.textColor || '#667085'), gridColumn: itemGridColumn(index) }"
      @click="goDecoratedLink(item.link, item.action)"
    >
      <image v-if="item.iconUrl" class="custom-tabbar-image" :src="String(item.iconUrl)" mode="aspectFit" />
      <text v-else class="custom-tabbar-icon" :style="{ background: `${item.color || '#C43D3D'}18` }">{{ isCurrent(item.link) ? item.activeIcon || item.icon || item.label.slice(0, 1) : item.icon || item.label.slice(0, 1) }}</text>
      <text>{{ item.label }}</text>
    </view>
    <view class="custom-tabbar-quick" role="button" tabindex="0" aria-label="扫码或识别二维码" @click="openActivityQuickAction" @keyup.enter="openActivityQuickAction" @keyup.space.prevent="openActivityQuickAction"><text>＋</text><text>扫码</text></view>
  </view>
</template>

<style scoped>
.custom-tabbar{position:fixed;z-index:90;left:0;right:0;bottom:0;min-height:104rpx;display:grid;grid-template-columns:repeat(var(--nav-columns),minmax(0,1fr));align-items:end;padding:10rpx 20rpx calc(10rpx + env(safe-area-inset-bottom));box-sizing:border-box;border-top:1rpx solid #e3ebe6;box-shadow:0 -8rpx 22rpx rgba(18,43,30,.055)}.custom-tabbar-item{min-width:0;min-height:78rpx;display:grid;justify-items:center;align-content:center;gap:4rpx;font-size:19rpx;line-height:1.15}.custom-tabbar-icon,.custom-tabbar-image{width:38rpx;height:38rpx;display:grid;place-items:center;border-radius:50%;font-size:20rpx}.custom-tabbar-image{background:transparent}.custom-tabbar-item.active{font-weight:900}.custom-tabbar-quick{position:absolute;left:50%;top:-28rpx;width:94rpx;height:94rpx;display:grid;place-items:center;align-content:center;gap:1rpx;transform:translateX(-50%);border:7rpx solid #f6f8f7;border-radius:50%;background:#20d477;color:#072d19;box-shadow:0 8rpx 18rpx rgba(12,126,65,.22);font-size:18rpx;font-weight:900}.custom-tabbar-quick text:first-child{font-size:40rpx;line-height:.78;font-weight:500}
</style>
