<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AppBottomNav from "./AppBottomNav.vue";
import { usePageDecoration } from "../decoration";

const props = defineProps<{ current: string }>();

const currentPath = computed(() => {
  if (props.current === "courses") return "/pages/courses/index";
  if (props.current === "community") return "/pages/community/index";
  if (props.current === "activity") return "/pages/activity/list";
  if (props.current === "user") return "/pages/user/my";
  return "/pages/index/index";
});
const { bottomNavSection, showBottomNav, loadDecoration } = usePageDecoration("home", currentPath.value);

onShow(loadDecoration);
</script>

<template>
  <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" :current-path="currentPath" />
</template>
