<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Picture, Refresh, RefreshLeft, Shop, Upload } from "@element-plus/icons-vue";
import { api } from "../api";
import { hasPermission } from "../permissions";

type TenantProfile = {
  id: number;
  code: string;
  name: string;
  region?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  organizerProfile?: {
    logoUrl?: string | null;
    intro?: string | null;
    servicePromise?: string | null;
  };
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
const uploading = ref(false);
const loadGeneration = ref(0);
const loadError = ref("");
const saveError = ref("");
const profile = ref<TenantProfile | null>(null);
const form = reactive({
  name: "",
  region: "",
  contactName: "",
  contactPhone: "",
  organizerLogoUrl: "",
  organizerIntro: "",
  organizerServicePromise: ""
});
const lastSaved = reactive({ ...form });
const hasChanges = computed(() => Object.keys(form).some((key) => form[key as keyof typeof form].trim() !== lastSaved[key as keyof typeof lastSaved]));
const canUpload = computed(() => hasPermission("upload.image"));
const scopeLocked = computed(() => loading.value || saving.value || confirming.value || uploading.value);

function formSnapshot() {
  return {
    name: form.name.trim(),
    region: form.region.trim(),
    contactName: form.contactName.trim(),
    contactPhone: form.contactPhone.trim(),
    organizerLogoUrl: form.organizerLogoUrl.trim(),
    organizerIntro: form.organizerIntro.trim(),
    organizerServicePromise: form.organizerServicePromise.trim()
  };
}

function sameForm(snapshot: ReturnType<typeof formSnapshot>) {
  return Object.entries(snapshot).every(([key, value]) => form[key as keyof typeof form].trim() === value);
}

function clearProfile() {
  profile.value = null;
  const values = { name: "", region: "", contactName: "", contactPhone: "", organizerLogoUrl: "", organizerIntro: "", organizerServicePromise: "" };
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
    contactPhone: data.contactPhone || "",
    organizerLogoUrl: data.organizerProfile?.logoUrl || "",
    organizerIntro: data.organizerProfile?.intro || "",
    organizerServicePromise: data.organizerProfile?.servicePromise || ""
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
  if (form.organizerLogoUrl.trim() && !form.organizerLogoUrl.trim().startsWith("/uploads/") && !/^https:\/\//i.test(form.organizerLogoUrl.trim())) return ElMessage.warning("主办方头像请使用 HTTPS 地址或上传图片");
  if (form.organizerIntro.trim().length > 1000) return ElMessage.warning("主办方介绍不能超过 1000 个字符");
  if (form.organizerServicePromise.trim().length > 300) return ElMessage.warning("服务承诺不能超过 300 个字符");
  const snapshot = formSnapshot();
  const profileId = profile.value.id;
  const profileCode = profile.value.code;
  const generation = loadGeneration.value;
  confirming.value = true;
  try {
    await ElMessageBox.confirm("确认保存商家资料？名称、公开主办方介绍和服务承诺会展示在活动详情中。", "保存商家资料", {
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
      contactPhone: snapshot.contactPhone || undefined,
      organizerLogoUrl: snapshot.organizerLogoUrl || undefined,
      organizerIntro: snapshot.organizerIntro || undefined,
      organizerServicePromise: snapshot.organizerServicePromise || undefined
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

async function uploadOrganizerLogo(file: File) {
  if (!canUpload.value || scopeLocked.value) return false;
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    ElMessage.warning("请上传 JPG、PNG、WebP 或 GIF 图片");
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning("图片不能超过 5MB");
    return false;
  }
  const data = new FormData();
  data.append("file", file);
  uploading.value = true;
  try {
    const result = await api.post<any, { url?: string }>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
    const url = String(result?.url || "").trim();
    if (!url) throw new Error("上传成功但未返回图片地址");
    form.organizerLogoUrl = url;
    ElMessage.success("主办方头像已上传");
  } catch (error: any) {
    ElMessage.error(error.message || "上传主办方头像失败");
  } finally {
    uploading.value = false;
  }
  return false;
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
      description="此处可维护商家公开资料。主办方介绍和服务承诺会展示在活动详情；活动发布审核、报名审核和收款配置权限请联系平台处理。"
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
        <el-divider content-position="left">活动详情中的主办方资料</el-divider>
        <div class="organizer-grid">
          <el-form-item label="主办方头像 / Logo">
            <div class="logo-field">
              <el-avatar v-if="form.organizerLogoUrl" shape="square" :size="72" :src="form.organizerLogoUrl"><el-icon><Picture /></el-icon></el-avatar>
              <el-input v-model="form.organizerLogoUrl" maxlength="500" placeholder="可填写 HTTPS 图片地址或上传图片" />
              <el-upload v-if="canUpload" :show-file-list="false" :disabled="scopeLocked" :before-upload="uploadOrganizerLogo">
                <el-button :icon="Upload" :loading="uploading" :disabled="scopeLocked">上传图片</el-button>
              </el-upload>
            </div>
          </el-form-item>
          <el-form-item label="服务承诺">
            <el-input v-model="form.organizerServicePromise" maxlength="300" show-word-limit placeholder="例如：活动开始前 24 小时内响应报名咨询" />
          </el-form-item>
          <el-form-item class="organizer-intro" label="主办方介绍">
            <el-input v-model="form.organizerIntro" type="textarea" :rows="4" maxlength="1000" show-word-limit placeholder="介绍主办团队、长期服务领域和活动经验；请只填写愿意公开展示的信息。" />
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
.organizer-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
.organizer-intro { grid-column: 1 / -1; }
.logo-field { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; width: 100%; }
.save-error { margin-bottom: 16px; }
.form-actions { display: flex; gap: 10px; flex-wrap: wrap; }
@media (max-width: 760px) {
  .toolbar { align-items: flex-start; flex-direction: column; }
  .form-grid { grid-template-columns: 1fr; }
  .organizer-grid { grid-template-columns: 1fr; }
  .organizer-intro { grid-column: auto; }
  .logo-field { grid-template-columns: auto minmax(0, 1fr); }
  .logo-field .el-upload { grid-column: 2; justify-self: start; }
  .profile-head { grid-template-columns: 40px minmax(0, 1fr); }
  .profile-head .el-tag { grid-column: 2; justify-self: start; }
}
</style>
