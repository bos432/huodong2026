<script setup lang="ts">
import { computed, ref } from "vue";
import { getCurrentTenantCode, request, setCurrentTenantCode, setCurrentTenantCodeSource } from "../api";
import type { HomepagePayload, PublicTenantView } from "@activity/shared";

defineOptions({ name: "TenantSwitcher" });

const props = defineProps<{
  tenant?: HomepagePayload["tenant"] | null;
  title?: string;
}>();

const emit = defineEmits<{
  changed: [tenant: PublicTenantView];
}>();

const tenantOptions = ref<PublicTenantView[]>([]);
const open = ref(false);
const loading = ref(false);

const currentTenantCode = computed(() => props.tenant?.code || getCurrentTenantCode());
const cityLabel = computed(() => props.tenant?.region || "本地");
const tenantName = computed(() => props.tenant?.name || currentTenantCode.value || "选择城市合伙人");

function tenantOptionLabel(item: PublicTenantView) {
  return item.region ? `${item.region} · ${item.name}` : item.name;
}

async function loadTenantOptions() {
  loading.value = true;
  try {
    tenantOptions.value = await request<PublicTenantView[]>("/public/tenants");
  } catch {
    tenantOptions.value = [];
  } finally {
    loading.value = false;
  }
}

async function show() {
  if (!tenantOptions.value.length) await loadTenantOptions();
  open.value = true;
}

function hide() {
  open.value = false;
}

function selectTenant(item: PublicTenantView) {
  if (item.code === currentTenantCode.value) {
    hide();
    return;
  }
  setCurrentTenantCode(item.code);
  setCurrentTenantCodeSource("manual");
  hide();
  emit("changed", item);
}

defineExpose({ show, loadTenantOptions });
</script>

<template>
  <view class="tenant-entry" @click="show">
    <view>
      <view class="tenant-entry-title">{{ title || cityLabel }}</view>
      <view class="tenant-entry-name">{{ tenantName }}</view>
    </view>
    <view class="tenant-entry-action">切换</view>
  </view>

  <view v-if="open" class="tenant-mask" @click="hide">
    <view class="tenant-sheet" @click.stop>
      <view class="tenant-sheet-head">
        <view>
          <view class="tenant-sheet-title">切换城市合伙人</view>
          <view class="tenant-sheet-subtitle">查看不同商家的活动、报名和页面装修</view>
        </view>
        <view class="tenant-close" @click="hide">×</view>
      </view>
      <view v-if="loading" class="tenant-empty">加载中...</view>
      <view v-else-if="!tenantOptions.length" class="tenant-empty">暂无可切换商家</view>
      <template v-else>
        <view
          v-for="item in tenantOptions"
          :key="item.code"
          class="tenant-option"
          :class="{ active: item.code === currentTenantCode }"
          @click="selectTenant(item)"
        >
          <view>
            <view class="tenant-option-name">{{ tenantOptionLabel(item) }}</view>
            <view class="tenant-option-code">{{ item.code }}</view>
          </view>
          <view class="tenant-option-status">{{ item.code === currentTenantCode ? "当前" : "切换" }}</view>
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped>
.tenant-entry { display: flex; justify-content: space-between; align-items: center; gap: 18rpx; margin-bottom: 18rpx; padding: 18rpx 22rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.06); }
.tenant-entry-title { color: var(--text-color, #111827); font-size: 30rpx; font-weight: 900; }
.tenant-entry-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 4rpx; color: var(--muted-color, #667085); font-size: 23rpx; font-weight: 700; }
.tenant-entry-action { flex: 0 0 auto; min-width: 86rpx; height: 50rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-size: 23rpx; font-weight: 900; }
.tenant-mask { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; background: rgba(15, 23, 42, 0.42); }
.tenant-sheet { width: 100%; max-height: 76vh; overflow-y: auto; padding: 28rpx 24rpx calc(28rpx + env(safe-area-inset-bottom)); border-radius: 8px 8px 0 0; background: #fff; box-shadow: 0 -18rpx 48rpx rgba(15, 23, 42, 0.18); }
.tenant-sheet-head { display: flex; justify-content: space-between; gap: 24rpx; align-items: flex-start; margin-bottom: 18rpx; }
.tenant-sheet-title { color: #111827; font-size: 32rpx; font-weight: 900; }
.tenant-sheet-subtitle { margin-top: 6rpx; color: #667085; font-size: 24rpx; line-height: 1.45; }
.tenant-close { flex: 0 0 auto; width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #f2f4f7; color: #344054; font-size: 34rpx; font-weight: 800; }
.tenant-empty { padding: 34rpx 0; color: #667085; text-align: center; font-size: 26rpx; }
.tenant-option { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; min-height: 104rpx; margin-top: 12rpx; padding: 18rpx 20rpx; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.tenant-option.active { border-color: #0f766e; background: #ecfdf7; }
.tenant-option-name { color: #111827; font-size: 28rpx; font-weight: 900; line-height: 1.35; }
.tenant-option-code { margin-top: 6rpx; color: #667085; font-size: 22rpx; }
.tenant-option-status { flex: 0 0 auto; min-width: 76rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #f2f4f7; color: #344054; font-size: 23rpx; font-weight: 800; }
.tenant-option.active .tenant-option-status { background: #0f766e; color: #fff; }
</style>
