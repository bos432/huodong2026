<script setup lang="ts">
import { computed } from "vue";
import type { HomepageSectionView } from "@activity/shared";
import { goDecoratedLink, quickInitial } from "../decoration";

const props = defineProps<{
  section?: HomepageSectionView | null;
  currentPath: string;
}>();

const items = computed(() => {
  const seen = new Set<string>();
  const raw = Array.isArray(props.section?.config?.items) ? (props.section?.config?.items as any[]) : [];
  const fallback = [
    { label: "首页", link: "/pages/index/index", action: "mainPage", color: "#0f766e" },
    { label: "活动", link: "/pages/activity/list", action: "mainPage", color: "#0f766e" },
    { label: "我的", link: "/pages/user/my", action: "mainPage", color: "#0f766e" }
  ];
  return (raw.length ? raw : fallback)
    .map((item) => ({ ...item, label: String(item?.label || "").trim(), link: String(item?.link || "").trim() }))
    .filter((item) => item.label && item.link && !seen.has(item.link) && seen.add(item.link))
    .slice(0, 4);
});

function isCurrent(url?: string) {
  return String(url || "").split("?")[0] === props.currentPath;
}
</script>

<template>
  <view
    v-if="items.length"
    class="custom-tabbar"
    :style="{
      background: String(section?.layout?.backgroundColor || '#ffffff'),
      '--nav-count': items.length
    }"
  >
    <view
      v-for="item in items"
      :key="item.link"
      class="custom-tabbar-item"
      :class="{ active: isCurrent(item.link) }"
      :style="{ color: isCurrent(item.link) ? String(item.color || section?.layout?.activeColor || '#0f766e') : String(section?.layout?.textColor || '#667085') }"
      @click="goDecoratedLink(item.link, item.action)"
    >
      <text class="custom-tabbar-icon" :style="{ background: `${item.color || '#0f766e'}18` }">{{ quickInitial(item.label, item.icon) }}</text>
      <text>{{ item.label }}</text>
    </view>
  </view>
</template>
