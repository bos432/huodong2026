<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getCurrentRouteForTenant, getCurrentTenantCode, getUserToken, request, setCurrentTenantCode, setCurrentTenantCodeSource, type TenantBootstrap } from "../api";
import type { HomepagePayload, PublicTenantView } from "@activity/shared";

defineOptions({ name: "TenantSwitcher" });

const props = defineProps<{
  tenant?: HomepagePayload["tenant"] | null;
  title?: string;
  compact?: boolean;
}>();

defineEmits<{
  changed: [tenant: PublicTenantView];
}>();

const tenantOptions = ref<PublicTenantView[]>([]);
const defaultTenantCode = ref("");
const open = ref(false);
const loading = ref(false);
const keyword = ref("");
const assetScopeMessage = ref("");
const tenantSwitcherEnabled = ref(true);

const currentTenantCode = computed(() => props.tenant?.code || getCurrentTenantCode());
const cityLabel = computed(() => props.tenant?.region || "本地");
const tenantName = computed(() => props.tenant?.name || currentTenantCode.value || "选择城市合伙人");
const filteredTenantOptions = computed(() => {
  const search = keyword.value.trim().toLowerCase();
  if (!search) return tenantOptions.value;
  return tenantOptions.value.filter((item) => [item.region, item.name, item.code].filter(Boolean).join(" ").toLowerCase().includes(search));
});

function tenantOptionLabel(item: PublicTenantView) {
  return item.region ? `${item.region} · ${item.name}` : item.name;
}

async function loadTenantOptions() {
  loading.value = true;
  try {
    const bootstrap = await request<TenantBootstrap>("/public/tenants/bootstrap");
    tenantSwitcherEnabled.value = bootstrap?.tenantSwitcherEnabled !== false;
    tenantOptions.value = (bootstrap?.tenants || []) as PublicTenantView[];
    defaultTenantCode.value = bootstrap?.defaultTenant?.code || "";
    assetScopeMessage.value = bootstrap?.policy?.assetScopeMessage || "报名、订单、钱包、积分、课程和优惠权益按当前城市商家分别展示，切换不会删除原城市数据";
  } catch {
    tenantOptions.value = [];
    defaultTenantCode.value = "";
  } finally {
    loading.value = false;
  }
}

async function show() {
  if (!tenantSwitcherEnabled.value) return;
  if (!tenantOptions.value.length) await loadTenantOptions();
  open.value = true;
}

function hide() {
  open.value = false;
}

function confirmTenantSwitch(content: string) {
  return new Promise<boolean>((resolve) => uni.showModal({ title: "确认切换城市", content, confirmText: "继续切换", success: (result) => resolve(Boolean(result.confirm)), fail: () => resolve(false) }));
}

async function selectTenant(item: PublicTenantView) {
  if (item.code === currentTenantCode.value) {
    hide();
    return;
  }
  if (getUserToken()) {
    const confirmed = await confirmTenantSwitch(assetScopeMessage.value);
    if (!confirmed) return;
  }
  const nextRoute = getCurrentRouteForTenant(item.code);
  setCurrentTenantCode(item.code);
  setCurrentTenantCodeSource("manual");
  hide();
  uni.reLaunch({ url: nextRoute });
}

defineExpose({ show, loadTenantOptions });
onMounted(() => void loadTenantOptions());
</script>

<template>
  <view v-if="tenantSwitcherEnabled" class="tenant-entry" :class="{ compact }" @click="show">
    <view>
      <template v-if="compact">
        <view class="tenant-entry-title">{{ cityLabel }}</view>
        <view class="tenant-entry-name">{{ tenantName }}</view>
      </template>
      <template v-else>
      <view class="tenant-entry-title">{{ title || cityLabel }}</view>
      <view class="tenant-entry-name">{{ tenantName }}</view>
      </template>
    </view>
    <view class="tenant-entry-action">切换</view>
  </view>

  <view v-if="open && tenantSwitcherEnabled" class="tenant-mask" @click="hide">
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
        <input v-model="keyword" class="tenant-search" placeholder="搜索城市、商家名称或编码" />
        <view class="tenant-scope-note">{{ assetScopeMessage }}</view>
        <view v-if="!filteredTenantOptions.length" class="tenant-empty">没有匹配的城市商家</view>
        <view
          v-for="item in filteredTenantOptions"
          :key="item.code"
          class="tenant-option"
          :class="{ active: item.code === currentTenantCode }"
          @click="selectTenant(item)"
        >
          <view>
            <view class="tenant-option-name">{{ tenantOptionLabel(item) }}</view>
            <view class="tenant-option-code">{{ item.code }}<text v-if="item.code === defaultTenantCode"> · 平台默认</text></view>
          </view>
          <view class="tenant-option-status">{{ item.code === currentTenantCode ? "当前" : "切换" }}</view>
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped>
.tenant-entry { display: flex; justify-content: space-between; align-items: center; gap: 18rpx; margin-bottom: 18rpx; padding: 18rpx 22rpx; border: 1rpx solid #d9ebe6; border-radius: 10rpx; background: #fff; box-shadow: 0 8rpx 22rpx rgba(20,72,64,.05); }
.tenant-entry-title { color: #173f3a; font-size: 30rpx; font-weight: 900; }
.tenant-entry-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 4rpx; color: #66827d; font-size: 23rpx; font-weight: 700; }
.tenant-entry-action { flex: 0 0 auto; min-width: 86rpx; height: 50rpx; display: flex; align-items: center; justify-content: center; border-radius: 8rpx; background: #eaf7f3; color: #0f766e; font-size: 23rpx; font-weight: 900; }
.tenant-entry.compact { margin: 0; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
.tenant-entry.compact .tenant-entry-title { color: #101828; font-size: 30rpx; line-height: 1.15; }
.tenant-entry.compact .tenant-entry-name { max-width: 360rpx; margin-top: 5rpx; color: #667085; font-size: 20rpx; }
.tenant-entry.compact .tenant-entry-action { min-width: 72rpx; height: 48rpx; border-radius: 8rpx; background: #ecfdf3; color: #0d8a4d; font-size: 22rpx; }
.tenant-mask { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 999; display: flex; align-items: flex-end; background: rgba(15, 23, 42, 0.46); }
.tenant-sheet { box-sizing: border-box; width: 100%; max-height: 78vh; overflow-y: auto; padding: 28rpx 24rpx calc(28rpx + env(safe-area-inset-bottom)); border-radius: 16rpx 16rpx 0 0; background: #fff; box-shadow: 0 -18rpx 48rpx rgba(15, 23, 42, 0.18); animation: app-sheet-rise 220ms ease-out both; }
.tenant-sheet-head { display: flex; justify-content: space-between; gap: 24rpx; align-items: flex-start; margin-bottom: 18rpx; }
.tenant-sheet-title { color: #111827; font-size: 32rpx; font-weight: 900; }
.tenant-sheet-subtitle { margin-top: 6rpx; color: #667085; font-size: 24rpx; line-height: 1.45; }
.tenant-close { flex: 0 0 auto; width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #f2f4f7; color: #344054; font-size: 34rpx; font-weight: 800; }
.tenant-empty { padding: 34rpx 0; color: #667085; text-align: center; font-size: 26rpx; }
.tenant-search { box-sizing: border-box; width: 100%; height: 76rpx; padding: 0 20rpx; border: 1px solid #d0d5dd; border-radius: 8px; background: #fff; color: #101828; font-size: 26rpx; }
.tenant-scope-note { margin: 14rpx 0 6rpx; padding: 14rpx 16rpx; border-left: 6rpx solid #0f766e; background: #f0fdfa; color: #475467; font-size: 22rpx; line-height: 1.55; }
.tenant-option { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; min-height: 104rpx; margin-top: 12rpx; padding: 18rpx 20rpx; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.tenant-option.active { border-color: #0f766e; background: #ecfdf7; }
.tenant-option-name { color: #111827; font-size: 28rpx; font-weight: 900; line-height: 1.35; }
.tenant-option-code { margin-top: 6rpx; color: #667085; font-size: 22rpx; }
.tenant-option-status { flex: 0 0 auto; min-width: 76rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #f2f4f7; color: #344054; font-size: 23rpx; font-weight: 800; }
.tenant-option.active .tenant-option-status { background: #0f766e; color: #fff; }
</style>
