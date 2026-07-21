<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh, RefreshLeft, Shop } from "@element-plus/icons-vue";
import { api } from "../api";

type TenantProfile = {
  id: number;
  code: string;
  name: string;
  region?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  enabled: boolean;
  settings?: {
    activityPublishReviewRequired: boolean;
    registrationReviewEnabled: boolean;
    paymentAccountEditable: boolean;
    mallEnabled: boolean;
  };
};

const loading = ref(false);
const saving = ref(false);
const confirming = ref(false);
const loadGeneration = ref(0);
const loadError = ref("");
const saveError = ref("");
const profile = ref<TenantProfile | null>(null);
const form = reactive({
  name: "",
  region: "",
  contactName: "",
  contactPhone: ""
});
const lastSaved = reactive({ ...form });
const hasChanges = computed(() => Object.keys(form).some((key) => form[key as keyof typeof form].trim() !== lastSaved[key as keyof typeof lastSaved]));
const scopeLocked = computed(() => loading.value || saving.value || confirming.value);

function formSnapshot() {
  return {
    name: form.name.trim(),
    region: form.region.trim(),
    contactName: form.contactName.trim(),
    contactPhone: form.contactPhone.trim()
  };
}

function sameForm(snapshot: ReturnType<typeof formSnapshot>) {
  return Object.entries(snapshot).every(([key, value]) => form[key as keyof typeof form].trim() === value);
}

function clearProfile() {
  profile.value = null;
  const values = { name: "", region: "", contactName: "", contactPhone: "" };
  Object.assign(form, values);
  Object.assign(lastSaved, values);
  saveError.value = "";
}

function validProfile(data: any): data is TenantProfile {
  return Boolean(data && Number.isInteger(Number(data.id)) && typeof data.code === "string" && data.code && typeof data.name === "string" && typeof data.enabled === "boolean");
}

function applyProfile(data: TenantProfile) {
  profile.value = data;
  localStorage.setItem("admin_tenant_code", data.code || "");
  const values = {
    name: data.name || "",
    region: data.region || "",
    contactName: data.contactName || "",
    contactPhone: data.contactPhone || ""
  };
  Object.assign(form, values);
  Object.assign(lastSaved, values);
}

async function load() {
  if (scopeLocked.value) return;
  const generation = ++loadGeneration.value;
  loading.value = true;
  loadError.value = "";
  clearProfile();
  try {
    const data = await api.get<any, TenantProfile>("/admin/tenant/profile");
    if (generation !== loadGeneration.value) return;
    if (!validProfile(data)) throw new Error("商家资料响应格式无效");
    applyProfile(data);
  } catch (error: any) {
    if (generation !== loadGeneration.value) return;
    clearProfile();
    loadError.value = error.message || "加载商家资料失败";
  } finally {
    if (generation === loadGeneration.value) loading.value = false;
  }
}

async function submit() {
  if (scopeLocked.value || !profile.value || !hasChanges.value) return;
  if (!form.name.trim()) return ElMessage.warning("请填写商家名称");
  if (form.name.trim().length > 120) return ElMessage.warning("商家名称不能超过 120 个字符");
  if (form.region.trim().length > 80) return ElMessage.warning("地区不能超过 80 个字符");
  if (form.contactName.trim().length > 100) return ElMessage.warning("联系人不能超过 100 个字符");
  if (form.contactPhone.trim().length > 40) return ElMessage.warning("联系电话不能超过 40 个字符");
  const snapshot = formSnapshot();
  const profileId = profile.value.id;
  const profileCode = profile.value.code;
  const generation = loadGeneration.value;
  confirming.value = true;
  try {
    await ElMessageBox.confirm("确认保存商家资料？名称、地区和联系方式会用于后台识别与运营协作。", "保存商家资料", {
      type: "info",
      confirmButtonText: "确认保存",
      cancelButtonText: "再检查一下"
    });
  } catch {
    confirming.value = false;
    return;
  }
  if (!profile.value || profile.value.id !== profileId || profile.value.code !== profileCode || generation !== loadGeneration.value || !sameForm(snapshot)) {
    confirming.value = false;
    return ElMessage.error("商家资料或表单已变化，请刷新后重试");
  }
  saving.value = true;
  confirming.value = false;
  saveError.value = "";
  try {
    const data = await api.patch<any, TenantProfile>("/admin/tenant/profile", {
      name: snapshot.name,
      region: snapshot.region || undefined,
      contactName: snapshot.contactName || undefined,
      contactPhone: snapshot.contactPhone || undefined
    });
    if (!validProfile(data) || data.id !== profileId || data.code !== profileCode) throw new Error("商家资料保存响应格式无效");
    applyProfile(data);
    localStorage.setItem("admin_tenant_name", data.name || "");
    ElMessage.success("商家资料已保存");
  } catch (error: any) {
    saveError.value = error.message || "保存商家资料失败";
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  if (!profile.value || scopeLocked.value) return;
  applyProfile(profile.value);
  saveError.value = "";
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h2>商家资料</h2>
        <p class="subtitle">维护本商家的基础资料。商家编码、启停状态和审核权限由平台超级管理员管理。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" :disabled="scopeLocked" @click="load">刷新</el-button>
    </div>

    <el-alert
      class="page-hint"
      type="info"
      show-icon
      :closable="false"
      title="平台权限仍由超级管理员控制"
      description="此处只能修改商家名称、地区、联系人和联系电话；活动发布审核、报名审核和收款配置权限请联系平台处理。"
    />

    <el-alert v-if="loadError" class="page-error" type="error" show-icon :closable="false" :title="loadError">
      <template #default><el-button link type="primary" :loading="loading" :disabled="scopeLocked" @click="load">重新加载</el-button></template>
    </el-alert>

    <div class="table-card" v-loading="loading">
      <div v-if="profile" class="profile-head">
        <el-icon><Shop /></el-icon>
        <div>
          <strong>{{ profile?.name || "商家" }}</strong>
          <small>商家编码：{{ profile?.code || "-" }}</small>
        </div>
        <el-tag :type="profile?.enabled ? 'success' : 'info'">{{ profile?.enabled ? "启用中" : "已停用" }}</el-tag>
      </div>

      <el-form v-if="profile" label-position="top" class="profile-form" :disabled="scopeLocked" @submit.prevent="submit">
        <div class="form-grid">
          <el-form-item label="商家名称" required>
            <el-input v-model="form.name" maxlength="120" show-word-limit autocomplete="organization" />
          </el-form-item>
          <el-form-item label="地区">
            <el-input v-model="form.region" maxlength="80" placeholder="例如：华东一区、上海、浦东新区" />
          </el-form-item>
          <el-form-item label="联系人">
            <el-input v-model="form.contactName" maxlength="100" autocomplete="name" />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="form.contactPhone" maxlength="40" autocomplete="tel" inputmode="tel" />
          </el-form-item>
        </div>
        <el-alert v-if="saveError" class="save-error" type="error" show-icon :closable="false" :title="saveError" />
        <div class="form-actions">
          <el-button :icon="RefreshLeft" :disabled="scopeLocked || !hasChanges" @click="resetForm">恢复原值</el-button>
          <el-button native-type="submit" type="primary" :loading="saving" :disabled="scopeLocked || !hasChanges">保存资料</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.subtitle { margin: 6px 0 0; color: #64748b; }
.page-hint { margin-bottom: 16px; }
.page-error { margin-bottom: 16px; }
.profile-head { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; margin-bottom: 20px; }
.profile-head .el-icon { width: 40px; height: 40px; border-radius: 8px; display: grid; place-items: center; background: #ecfdf5; color: #047857; font-size: 20px; }
.profile-head strong { display: block; font-size: 18px; }
small { color: #64748b; }
.profile-form { max-width: 760px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
.save-error { margin-bottom: 16px; }
.form-actions { display: flex; gap: 10px; flex-wrap: wrap; }
@media (max-width: 760px) {
  .toolbar { align-items: flex-start; flex-direction: column; }
  .form-grid { grid-template-columns: 1fr; }
  .profile-head { grid-template-columns: 40px minmax(0, 1fr); }
  .profile-head .el-tag { grid-column: 2; justify-self: start; }
}
</style>
