<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { HomepageSectionView } from "@activity/shared";
import { defaultBottomNavSection, goDecoratedLink, usePageDecoration } from "../decoration";
import { filterNavigationItemsByFeature } from "../feature-gates";
import { motionStyle } from "../motion/platform-adapter";

const props = defineProps<{
  section?: HomepageSectionView | null;
  currentPath: string;
}>();

const autoDecoration = usePageDecoration("home", props.currentPath);
const activeSection = computed(() => props.section === undefined ? autoDecoration.bottomNavSection.value : props.section);
const defaultItems = Array.isArray(defaultBottomNavSection.config?.items) ? defaultBottomNavSection.config.items : [];
const genericTextIcons = new Set(["π", "专", "修", "社", "活", "我"]);
const tabbarMotionStyle = motionStyle(0, 180);

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
          color: String(item?.color || section.layout?.activeColor || "#0F766E"),
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
    color: String(item?.color || defaultBottomNavSection.layout?.activeColor || "#0F766E"),
    icon: String(item?.icon || "").trim(),
    activeIcon: String(item?.activeIcon || "").trim(),
    iconUrl: String(item?.iconUrl || "").trim(),
    enabled: item?.enabled !== false
  })).filter((item: any) => item.enabled && item.label && item.link));
});

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

function navIcon(item: { link?: string; icon?: string; activeIcon?: string; label?: string }, active: boolean) {
  const configured = String(active ? item.activeIcon || item.icon || "" : item.icon || "").trim();
  if (configured && !genericTextIcons.has(configured)) return configured;
  const path = String(item.link || "").split("?")[0];
  if (path === "/pages/index/index") return "⌂";
  if (path === "/pages/courses/index") return "▤";
  if (path === "/pages/community/index") return "◎";
  if (path === "/pages/activity/list") return "▣";
  if (path === "/pages/user/my") return "◉";
  return configured || String(item.label || "入").slice(0, 1);
}

function navIconKind(link?: string) {
  const path = String(link || "").split("?")[0];
  if (path === "/pages/index/index") return "home";
  if (path === "/pages/courses/index") return "content";
  if (path === "/pages/community/index") return "community";
  if (path === "/pages/activity/list") return "activity";
  if (path === "/pages/user/my") return "profile";
  return "default";
}

function navLabel(item: { link?: string; label?: string }) {
  const path = String(item.link || "").split("?")[0];
  const configured = String(item.label || "").trim();
  // A brand name belongs in the page header, not in the primary task navigation.
  if (path === "/pages/index/index" && (!configured || configured === "慢π")) return "首页";
  // Older tenant decoration used "共修" for the community landing page. Keep
  // those saved configurations compatible while exposing the broader feature.
  if (path === "/pages/community/index" && (!configured || configured === "共修")) return "社区";
  if (path === "/pages/activity/list" && !configured) return "活动";
  if (path === "/pages/user/my" && !configured) return "我的";
  return configured;
}
</script>

<template>
  <view
    v-if="items.length"
    class="custom-tabbar"
    :style="{
      background: String(activeSection?.layout?.backgroundColor || '#ffffff'),
      '--nav-columns': items.length,
      ...tabbarMotionStyle
    }"
  >
    <view
      v-for="item in items"
      :key="item.link"
      class="custom-tabbar-item app-press"
      :class="{ active: isCurrent(item.link) }"
      :style="{ color: isCurrent(item.link) ? String(item.color || activeSection?.layout?.activeColor || '#0f766e') : String(activeSection?.layout?.textColor || '#667085') }"
      @click="goDecoratedLink(item.link, item.action)"
    >
      <image v-if="item.iconUrl" class="custom-tabbar-image" :src="String(item.iconUrl)" mode="aspectFit" />
      <view v-else-if="navIconKind(item.link) !== 'default'" class="custom-tabbar-icon custom-tabbar-symbol" :class="`is-${navIconKind(item.link)}`" />
      <text v-else class="custom-tabbar-icon custom-tabbar-fallback" :style="{ background: `${item.color || '#0F766E'}18` }">{{ navIcon(item, isCurrent(item.link)) }}</text>
      <text>{{ navLabel(item) }}</text>
    </view>
  </view>
</template>

<style scoped>
.custom-tabbar {
  position: fixed;
  z-index: 90;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(var(--nav-columns), minmax(0, 1fr));
  align-items: end;
  min-height: 118rpx;
  padding: 10rpx 20rpx calc(10rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  border-top: 1rpx solid var(--app-border, #e3e9e8);
  box-shadow: 0 -6rpx 18rpx rgba(22, 37, 45, .045);
}
.custom-tabbar-item { min-width: 0; min-height: 94rpx; display: grid; justify-items: center; align-content: center; gap: 6rpx; font-size: 24rpx; line-height: 1.2; transition: color 160ms ease, transform 160ms ease; }
.custom-tabbar-icon, .custom-tabbar-image { width: 44rpx; height: 44rpx; display: grid; place-items: center; border-radius: 50%; font-size: 25rpx; transition: transform 180ms ease, background-color 180ms ease; }
.custom-tabbar-image { background: transparent; }
.custom-tabbar-item.active { font-weight: 800; }
.custom-tabbar-item.active .custom-tabbar-icon { transform: translateY(-2rpx) scale(1.06); color: #0F766E; }
.custom-tabbar-symbol { position: relative; box-sizing: border-box; color: currentColor; background: transparent !important; }
.custom-tabbar-symbol::before, .custom-tabbar-symbol::after { position: absolute; content: ""; box-sizing: border-box; }
.is-home::before { left: 9rpx; top: 15rpx; width: 26rpx; height: 22rpx; border: 3rpx solid currentColor; border-top: 0; border-radius: 3rpx; }
.is-home::after { left: 11rpx; top: 7rpx; width: 22rpx; height: 22rpx; border: 3rpx solid currentColor; border-right: 0; border-bottom: 0; border-radius: 3rpx; transform: rotate(45deg); }
.is-content::before { left: 8rpx; top: 8rpx; width: 28rpx; height: 29rpx; border: 3rpx solid currentColor; border-radius: 4rpx; }
.is-content::after { left: 14rpx; top: 16rpx; width: 16rpx; height: 3rpx; border-radius: 3rpx; background: currentColor; box-shadow: 0 8rpx 0 currentColor, 0 16rpx 0 currentColor; }
.is-community::before { left: 7rpx; top: 8rpx; width: 29rpx; height: 23rpx; border: 3rpx solid currentColor; border-radius: 13rpx; }
.is-community::after { left: 11rpx; top: 27rpx; width: 10rpx; height: 10rpx; border-left: 3rpx solid currentColor; transform: skew(-26deg); }
.is-activity::before { left: 8rpx; top: 10rpx; width: 28rpx; height: 27rpx; border: 3rpx solid currentColor; border-radius: 4rpx; }
.is-activity::after { left: 13rpx; top: 7rpx; width: 4rpx; height: 8rpx; border-radius: 3rpx; background: currentColor; box-shadow: 14rpx 0 0 currentColor, 0 14rpx 0 -1rpx currentColor, 8rpx 14rpx 0 -1rpx currentColor, 16rpx 14rpx 0 -1rpx currentColor; }
.is-profile::before { left: 15rpx; top: 7rpx; width: 14rpx; height: 14rpx; border: 3rpx solid currentColor; border-radius: 50%; }
.is-profile::after { left: 8rpx; top: 25rpx; width: 28rpx; height: 14rpx; border: 3rpx solid currentColor; border-bottom: 0; border-radius: 16rpx 16rpx 0 0; }
.custom-tabbar-fallback { background: #edf5f1; }
.custom-tabbar-item.active .custom-tabbar-symbol { filter: drop-shadow(0 4rpx 6rpx rgba(15, 118, 110, .18)); }
@media (min-width: 900px) {
  .custom-tabbar { right: auto; left: 50%; width: 760px; max-width: 100%; border-right: 1rpx solid #e3ebe6; border-left: 1rpx solid #e3ebe6; transform: translateX(-50%); }
}
</style>
