<template>
  <view class="address-page">
    <view v-if="loading" class="state-card">收货地址加载中...</view>
    <view v-else-if="loadError" class="state-card error-state">
      <text>{{ loadError }}</text>
      <view class="state-retry" @click="load">重新加载</view>
    </view>
    <view class="address-card form">
      <text class="section-title">{{ editingId ? "编辑收货地址" : "新增收货地址" }}</text>
      <input v-model="form.receiverName" placeholder="收货人" />
      <input v-model="form.receiverPhone" placeholder="手机号" />
      <input v-model="form.province" placeholder="省份，可选" />
      <input v-model="form.city" placeholder="城市/区域" />
      <input v-model="form.district" placeholder="区县，可选" />
      <input v-model="form.detail" placeholder="详细地址" />
      <label class="default-row"><checkbox :checked="form.isDefault" @click="form.isDefault = !form.isDefault" />设为默认地址</label>
      <view class="save-btn" :class="{ disabled: saving || loading || !!loadError || !!deletingId }" @click="save">{{ saving ? "保存中..." : "保存地址" }}</view>
      <view v-if="editingId" class="cancel-btn" @click="resetForm">取消编辑</view>
    </view>

    <view v-for="item in addresses" :key="item.id" class="address-card" @click="select(item)">
      <view class="row">
        <text class="name">{{ item.receiverName }} {{ item.receiverPhone }}</text>
        <text v-if="item.isDefault" class="tag">默认</text>
      </view>
      <text class="detail">{{ [item.province, item.city, item.district, item.detail].filter(Boolean).join(" ") }}</text>
      <view class="actions">
        <text @click.stop="edit(item)">编辑</text>
        <text :class="{ disabled: deletingId === item.id }" @click.stop="remove(item)">{{ deletingId === item.id ? "删除中" : "删除" }}</text>
      </view>
    </view>
    <EmptyState v-if="!loading && !loadError && !addresses.length" icon="📍" text="暂无收货地址，先新增一个常用地址吧" />
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request } from "../../api";
import EmptyState from "../../components/EmptyState.vue";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";

const addresses = ref<any[]>([]);
const editingId = ref(0);
const selectable = ref(false);
const loading = ref(false);
const loadError = ref("");
const saving = ref(false);
const deletingId = ref(0);
const loadGuard = createTenantLoadGuard();
const form = reactive({ receiverName: "", receiverPhone: "", province: "", city: "", district: "", detail: "", isDefault: false });
function resetForm() {
  editingId.value = 0;
  Object.assign(form, { receiverName: "", receiverPhone: "", province: "", city: "", district: "", detail: "", isDefault: false });
}
async function load() {
  const token = loadGuard.begin();
  loading.value = true;
  loadError.value = "";
  addresses.value = [];
  try {
    await ensureUser();
    const rows = await request<any[]>("/public/me/mall/addresses");
    if (loadGuard.isCurrent(token)) addresses.value = rows;
  } catch (error: any) {
    if (loadGuard.isCurrent(token) && !String(error?.message || "").includes("请先完成")) loadError.value = error?.message || "收货地址加载失败，请稍后重试。";
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}
function edit(item: any) {
  if (saving.value || deletingId.value || loading.value || loadError.value) return;
  editingId.value = item.id;
  Object.assign(form, {
    receiverName: item.receiverName || "",
    receiverPhone: item.receiverPhone || "",
    province: item.province || "",
    city: item.city || "",
    district: item.district || "",
    detail: item.detail || "",
    isDefault: Boolean(item.isDefault)
  });
}
async function save() {
  if (saving.value || deletingId.value || loading.value || loadError.value) return;
  if (!form.receiverName || !form.receiverPhone || !form.detail) return uni.showToast({ title: "请填写收货人、手机号和详细地址", icon: "none" });
  if (!/^\+?[0-9\s-]{6,24}$/.test(form.receiverPhone.trim())) return uni.showToast({ title: "手机号格式不正确", icon: "none" });
  saving.value = true;
  try {
    const url = editingId.value ? `/public/me/mall/addresses/${editingId.value}` : "/public/me/mall/addresses";
    await request(url, { method: editingId.value ? "PATCH" : "POST", data: form });
    uni.showToast({ title: "地址已保存", icon: "none" });
    resetForm();
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "保存地址失败", icon: "none" });
  } finally {
    saving.value = false;
  }
}
async function remove(item: any) {
  if (!item?.id || deletingId.value) return;
  deletingId.value = item.id;
  uni.showModal({
    title: "删除收货地址",
    content: `确认删除 ${item.receiverName} 的收货地址？`,
    confirmText: "确认删除",
    success: async (result) => {
      if (!result.confirm) {
        deletingId.value = 0;
        return;
      }
      try {
        await request(`/public/me/mall/addresses/${item.id}`, { method: "DELETE" });
        await load();
      } catch (error: any) {
        uni.showToast({ title: error?.message || "删除地址失败", icon: "none" });
      } finally {
        deletingId.value = 0;
      }
    },
    fail: () => { deletingId.value = 0; }
  });
}
function select(item: any) {
  if (!selectable.value) return;
  uni.setStorageSync(`mall_selected_address_id:${getCurrentTenantCode() || "global"}`, item.id);
  uni.navigateBack();
}
onLoad((query) => { selectable.value = query?.select === "1"; });
onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await load();
});
</script>

<style scoped>
.address-page { min-height:100vh; padding:24rpx; background:#f8fafc; }
.address-card { background:#fff; border-radius:26rpx; padding:24rpx; margin-bottom:18rpx; box-shadow:0 12rpx 30rpx rgba(15,23,42,.06); }
.form { border:2rpx solid rgba(194,65,12,.12); }
.section-title { display:block; font-size:30rpx; font-weight:900; color:#1f2937; margin-bottom:12rpx; }
input { height:76rpx; border-bottom:1rpx solid #e2e8f0; font-size:27rpx; }
.default-row { display:flex; align-items:center; gap:10rpx; padding:18rpx 0; color:#64748b; font-size:26rpx; }
.save-btn { height:82rpx; border-radius:999px; background:linear-gradient(135deg,#9a3412,#ea580c); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:29rpx; }
.cancel-btn { height:72rpx; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:26rpx; }
.row { display:flex; justify-content:space-between; align-items:center; gap:16rpx; }
.name { font-size:30rpx; font-weight:900; color:#1f2937; }
.tag { padding:6rpx 14rpx; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:22rpx; font-weight:800; }
.detail { display:block; margin-top:12rpx; color:#475569; font-size:27rpx; line-height:1.5; }
.actions { display:flex; justify-content:flex-end; gap:28rpx; margin-top:16rpx; color:#9a3412; font-size:25rpx; font-weight:800; }
.state-card { display:grid; gap:10rpx; margin-bottom:18rpx; padding:20rpx 22rpx; border-radius:8px; background:#fff; color:#64748b; font-size:24rpx; line-height:1.55; }
.state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-retry { width:max-content; color:#c2410c; font-weight:900; }
.disabled { opacity:.55; pointer-events:none; }
</style>
