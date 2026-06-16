<script setup lang="ts">
import { computed } from "vue";
import { getCurrentTenantCode } from "../api";
import type { HomepagePayload } from "@activity/shared";

defineOptions({ name: "TenantContextBadge" });

const props = defineProps<{
  tenant?: HomepagePayload["tenant"] | null;
  label?: string;
  hint?: string;
}>();

const code = computed(() => props.tenant?.code || getCurrentTenantCode());
const title = computed(() => props.tenant?.region || props.label || "当前商家");
const name = computed(() => props.tenant?.name || code.value || "平台默认");
</script>

<template>
  <view v-if="tenant || code" class="tenant-context">
    <view>
      <view class="tenant-context-title">{{ title }}</view>
      <view class="tenant-context-name">{{ name }}</view>
    </view>
    <view class="tenant-context-hint">{{ hint || "商家独立数据" }}</view>
  </view>
</template>

<style scoped>
.tenant-context { display: flex; justify-content: space-between; align-items: center; gap: 18rpx; margin-bottom: 18rpx; padding: 16rpx 20rpx; border: 1px solid rgba(15, 118, 110, 0.16); border-radius: var(--card-radius, 8px); background: var(--primary-soft, #e6f2ef); }
.tenant-context-title { color: var(--primary-color, #0f766e); font-size: 24rpx; font-weight: 900; }
.tenant-context-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 4rpx; color: var(--text-color, #111827); font-size: 26rpx; font-weight: 900; }
.tenant-context-hint { flex: 0 0 auto; min-width: 104rpx; height: 46rpx; display: flex; align-items: center; justify-content: center; padding: 0 14rpx; border-radius: 999px; background: var(--card-bg, #fff); color: var(--primary-color, #0f766e); font-size: 22rpx; font-weight: 800; }
</style>
