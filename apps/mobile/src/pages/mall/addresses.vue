<template>
  <view class="address-page">
    <view class="address-card form">
      <text class="section-title">{{ editingId ? "编辑收货地址" : "新增收货地址" }}</text>
      <input v-model="form.receiverName" placeholder="收货人" />
      <input v-model="form.receiverPhone" placeholder="手机号" />
      <input v-model="form.province" placeholder="省份，可选" />
      <input v-model="form.city" placeholder="城市/区域" />
      <input v-model="form.district" placeholder="区县，可选" />
      <input v-model="form.detail" placeholder="详细地址" />
      <label class="default-row"><checkbox :checked="form.isDefault" @click="form.isDefault = !form.isDefault" />设为默认地址</label>
      <view class="save-btn" @click="save">保存地址</view>
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
        <text @click.stop="remove(item)">删除</text>
      </view>
    </view>
    <EmptyState v-if="!addresses.length" icon="📍" text="暂无收货地址，先新增一个常用地址吧" />
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, request } from "../../api";
import EmptyState from "../../components/EmptyState.vue";

const addresses = ref<any[]>([]);
const editingId = ref(0);
const selectable = ref(false);
const form = reactive({ receiverName: "", receiverPhone: "", province: "", city: "", district: "", detail: "", isDefault: false });
function resetForm() {
  editingId.value = 0;
  Object.assign(form, { receiverName: "", receiverPhone: "", province: "", city: "", district: "", detail: "", isDefault: false });
}
async function load() {
  await ensureUser();
  addresses.value = await request<any[]>("/public/me/mall/addresses");
}
function edit(item: any) {
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
  if (!form.receiverName || !form.receiverPhone || !form.detail) return uni.showToast({ title: "请填写收货人、手机号和详细地址", icon: "none" });
  const url = editingId.value ? `/public/me/mall/addresses/${editingId.value}` : "/public/me/mall/addresses";
  await request(url, { method: editingId.value ? "PATCH" : "POST", data: form });
  uni.showToast({ title: "地址已保存", icon: "none" });
  resetForm();
  load();
}
async function remove(item: any) {
  await request(`/public/me/mall/addresses/${item.id}`, { method: "DELETE" });
  load();
}
function select(item: any) {
  if (!selectable.value) return;
  uni.setStorageSync("mall_selected_address_id", item.id);
  uni.navigateBack();
}
onLoad((query) => { selectable.value = query?.select === "1"; });
onShow(() => load().catch((error: any) => uni.showToast({ title: error.message || "加载地址失败", icon: "none" })));
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
</style>
