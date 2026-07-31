<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { HomepageSectionView } from "@activity/shared";
import { defaultBottomNavSection, goDecoratedLink, usePageDecoration } from "../decoration";
import { filterNavigationItemsByFeature } from "../feature-gates";

const props = defineProps<{
  section?: HomepageSectionView | null;
  currentPath: string;
}>();

const autoDecoration = usePageDecoration("home", props.currentPath);
const activeSection = computed(() => props.section === undefined ? autoDecoration.bottomNavSection.value : props.section);
const defaultItems = Array.isArray(defaultBottomNavSection.config?.items) ? defaultBottomNavSection.config.items : [];
const genericTextIcons = new Set(["π", "专", "修", "活", "我"]);

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
</script>

<template>
  <view
    v-if="items.length"
    class="custom-tabbar"
    :style="{
      background: String(activeSection?.layout?.backgroundColor || '#ffffff'),
      '--nav-columns': items.length
    }"
  >
    <view
      v-for="item in items"
      :key="item.link"
      class="custom-tabbar-item"
      :class="{ active: isCurrent(item.link) }"
      :style="{ color: isCurrent(item.link) ? String(item.color || activeSection?.layout?.activeColor || '#0f766e') : String(activeSection?.layout?.textColor || '#667085') }"
      @click="goDecoratedLink(item.link, item.action)"
    >
      <image v-if="item.iconUrl" class="custom-tabbar-image" :src="String(item.iconUrl)" mode="aspectFit" />
      <text v-else class="custom-tabbar-icon" :style="{ background: `${item.color || '#C43D3D'}18` }">{{ navIcon(item, isCurrent(item.link)) }}</text>
      <text>{{ item.label }}</text>
    </view>
  </view>
</template>

<style scoped>
.custom-tabbar{position:fixed;z-index:90;left:0;right:0;bottom:0;min-height:126rpx;display:grid;grid-template-columns:repeat(var(--nav-columns),minmax(0,1fr));align-items:end;padding:12rpx 20rpx calc(12rpx + env(safe-area-inset-bottom));box-sizing:border-box;border-top:1rpx solid #e3ebe6;box-shadow:0 -8rpx 22rpx rgba(18,43,30,.055)}.custom-tabbar-item{min-width:0;min-height:94rpx;display:grid;justify-items:center;align-content:center;gap:6rpx;font-size:24rpx;line-height:1.2}.custom-tabbar-icon,.custom-tabbar-image{width:44rpx;height:44rpx;display:grid;place-items:center;border-radius:50%;font-size:25rpx}.custom-tabbar-image{background:transparent}.custom-tabbar-item.active{font-weight:900}@media (min-width:900px){.custom-tabbar{left:50%;right:auto;width:760px;max-width:100%;transform:translateX(-50%);border-left:1rpx solid #e3ebe6;border-right:1rpx solid #e3ebe6}}
</style>
