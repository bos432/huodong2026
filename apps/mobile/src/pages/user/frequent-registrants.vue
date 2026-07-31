<template>
  <view class="container registrants-page has-custom-nav">
    <view class="registrants-hero"><text class="registrants-kicker">报名资料</text><text class="registrants-title">常用报名人</text><text class="registrants-copy">仅用于你本人在当前城市的活动报名，可随时修改或删除。</text></view>
    <view v-if="loading" class="state-card">常用报名人加载中...</view>
    <view v-else-if="error" class="state-card error"><text>{{ error }}</text><text class="state-action" @click="load">重新加载</text></view>
    <template v-else>
      <view v-if="rows.length" class="registrant-list"><view v-for="item in rows" :key="item.id" class="registrant-card"><view><text class="registrant-name">{{ item.name }}</text><text class="registrant-meta">{{ maskPhone(item.phone) || '未填写手机号' }} · {{ maskIdCard(item.idCard) || '未填写证件号' }}</text></view><view class="registrant-actions"><text @click="openEdit(item)">编辑</text><text class="danger" @click="remove(item)">删除</text></view></view></view>
      <view v-else class="empty-card"><text class="empty-title">还没有常用报名人</text><text>添加同行人资料后，下次报名可直接选择带入。</text></view>
      <view class="add-button app-press" role="button" tabindex="0" aria-label="添加常用报名人" @click="openCreate" @keyup.enter="openCreate" @keyup.space.prevent="openCreate">添加报名人</view>
    </template>
    <view v-if="formVisible" class="form-mask" @click.self="closeForm"><view class="form-sheet app-sheet-enter"><view class="form-heading"><text>{{ editingId ? '编辑报名人' : '添加报名人' }}</text><text @click="closeForm">关闭</text></view><input v-model="form.name" class="form-input" maxlength="80" placeholder="姓名（必填）" /><input v-model="form.phone" class="form-input" type="number" maxlength="11" placeholder="手机号（选填）" /><input v-model="form.idCard" class="form-input" maxlength="64" placeholder="证件号（选填）" /><text class="form-notice">资料仅归当前账号及当前城市使用，不会向其他报名成员公开。</text><view class="form-save app-press" :class="{ disabled: saving }" role="button" tabindex="0" :aria-busy="saving" @click="save" @keyup.enter="save" @keyup.space.prevent="save">{{ saving ? '保存中...' : '保存' }}</view></view></view>
    <TabBar current="user" />
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request } from "../../api";
import TabBar from "../../components/TabBar.vue";

const rows = ref<any[]>([]); const loading = ref(true); const error = ref(""); const saving = ref(false); const formVisible = ref(false); const editingId = ref<number | null>(null); const form = reactive({ name: "", phone: "", idCard: "" });
function maskPhone(value?: string) { const text = String(value || ""); return text.length === 11 ? `${text.slice(0, 3)}****${text.slice(-4)}` : text; }
function maskIdCard(value?: string) { const text = String(value || ""); return text.length > 8 ? `${text.slice(0, 4)}********${text.slice(-4)}` : text; }
function resetForm() { editingId.value = null; form.name = ""; form.phone = ""; form.idCard = ""; }
function openCreate() { resetForm(); formVisible.value = true; }
function openEdit(item: any) { editingId.value = Number(item.id); form.name = String(item.name || ""); form.phone = String(item.phone || ""); form.idCard = String(item.idCard || ""); formVisible.value = true; }
function closeForm() { if (!saving.value) formVisible.value = false; }
async function load() { loading.value = true; error.value = ""; try { await ensureUser(); rows.value = await request<any[]>("/public/me/frequent-registrants"); } catch (err: any) { error.value = err?.message || "常用报名人加载失败"; } finally { loading.value = false; } }
async function save() { if (saving.value) return; if (!form.name.trim()) return uni.showToast({ title: "请填写姓名", icon: "none" }); saving.value = true; try { const path = editingId.value ? `/public/me/frequent-registrants/${editingId.value}` : "/public/me/frequent-registrants"; const row = await request<any>(path, { method: editingId.value ? "PUT" : "POST", data: { name: form.name.trim(), phone: form.phone.trim() || undefined, idCard: form.idCard.trim() || undefined } }); const index = rows.value.findIndex((item) => item.id === row.id); if (index >= 0) rows.value.splice(index, 1, row); else rows.value.unshift(row); formVisible.value = false; uni.showToast({ title: "已保存", icon: "success" }); } catch (err: any) { uni.showToast({ title: err?.message || "保存失败", icon: "none" }); } finally { saving.value = false; } }
function remove(item: any) { uni.showModal({ title: "删除报名人", content: `确定删除“${item.name}”吗？`, success: async (result) => { if (!result.confirm) return; try { await request(`/public/me/frequent-registrants/${item.id}`, { method: "DELETE" }); rows.value = rows.value.filter((row) => row.id !== item.id); uni.showToast({ title: "已删除", icon: "success" }); } catch (err: any) { uni.showToast({ title: err?.message || "删除失败", icon: "none" }); } } }); }
onShow(() => { void load(); });
</script>

<style scoped>
.registrants-page{min-height:100vh;box-sizing:border-box;padding-bottom:160rpx;background:#f6f8f7}.registrants-hero{display:grid;gap:9rpx;margin-bottom:20rpx;padding:30rpx 28rpx;border-radius:8rpx;background:#173f3a;color:#fff}.registrants-kicker{color:#a9e8c0;font-size:22rpx;font-weight:800}.registrants-title{font-size:38rpx;font-weight:950}.registrants-copy{color:rgba(255,255,255,.76);font-size:23rpx;line-height:1.55}.state-card,.empty-card{display:grid;gap:12rpx;padding:28rpx;border:1rpx solid #e2eae6;border-radius:8rpx;background:#fff;color:#718078;font-size:24rpx;line-height:1.55}.state-card.error{color:#b91c1c}.state-action{color:#08753f;font-weight:800}.empty-title{color:#173f3a;font-size:29rpx;font-weight:900}.registrant-list{display:grid;gap:14rpx}.registrant-card{display:flex;align-items:center;justify-content:space-between;gap:16rpx;padding:24rpx;border:1rpx solid #e2eae6;border-radius:8rpx;background:#fff}.registrant-name,.registrant-meta{display:block}.registrant-name{color:#173f3a;font-size:29rpx;font-weight:900}.registrant-meta{margin-top:8rpx;color:#718078;font-size:22rpx}.registrant-actions{display:flex;flex:0 0 auto;gap:16rpx;color:#08753f;font-size:23rpx;font-weight:800}.registrant-actions .danger{color:#b42318}.add-button,.form-save{min-height:84rpx;display:flex;align-items:center;justify-content:center;margin-top:20rpx;border-radius:8rpx;background:#20d477;color:#072d19;font-size:28rpx;font-weight:900}.form-mask{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-end;background:rgba(15,23,42,.48)}.form-sheet{width:100%;box-sizing:border-box;padding:28rpx 24rpx calc(28rpx + env(safe-area-inset-bottom));border-radius:18rpx 18rpx 0 0;background:#fff}.form-heading{display:flex;align-items:center;justify-content:space-between;color:#173f3a;font-size:30rpx;font-weight:900}.form-heading text:last-child{color:#718078;font-size:23rpx}.form-input{height:86rpx;margin-top:18rpx;padding:0 20rpx;box-sizing:border-box;border:1rpx solid #dce8e2;border-radius:8rpx;background:#f8faf9;color:#173f3a;font-size:26rpx}.form-notice{display:block;margin-top:16rpx;color:#718078;font-size:22rpx;line-height:1.55}.form-save{margin-top:18rpx}.form-save.disabled{opacity:.6;pointer-events:none}@media (min-width:900px){.registrants-page{max-width:760px;margin:0 auto}}
</style>
