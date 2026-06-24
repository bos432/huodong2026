<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { HomepageSectionView } from "@activity/shared";
import { goDecoratedLink, usePageDecoration } from "../decoration";

const props = defineProps<{
  section?: HomepageSectionView | null;
  currentPath: string;
}>();

const autoDecoration = usePageDecoration("home", props.currentPath);
const activeSection = computed(() => props.section === undefined ? autoDecoration.bottomNavSection.value : props.section);

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
  if (configuredItems) return configured;
  return [
    { label: "慢π", link: "/pages/index/index", action: "mainPage", color: "#C43D3D", icon: "π", activeIcon: "π" },
    { label: "课程", link: "/pages/courses/index", action: "mainPage", color: "#C43D3D", icon: "📖", activeIcon: "📚" },
    { label: "共修", link: "/pages/community/index", action: "mainPage", color: "#C43D3D", icon: "🪷", activeIcon: "🌸" },
    { label: "活动", link: "/pages/activity/list", action: "mainPage", color: "#C43D3D", icon: "📅", activeIcon: "🎯" },
    { label: "我的", link: "/pages/user/my", action: "mainPage", color: "#C43D3D", icon: "⛰", activeIcon: "🏔" }
  ];
});

function isCurrent(url?: string) {
  const current = props.currentPath;
  const target = String(url || "").split("?")[0];
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
      '--nav-count': items.length
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
      <text v-else class="custom-tabbar-icon" :style="{ background: `${item.color || '#C43D3D'}18` }">{{ isCurrent(item.link) ? item.activeIcon || item.icon || item.label.slice(0, 1) : item.icon || item.label.slice(0, 1) }}</text>
      <text>{{ item.label }}</text>
    </view>
  </view>
</template>
