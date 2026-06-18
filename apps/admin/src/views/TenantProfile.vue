<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh, Shop } from "@element-plus/icons-vue";
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
const profile = ref<TenantProfile | null>(null);
const form = reactive({
  name: "",
  region: "",
  contactName: "",
  contactPhone: ""
});

async function load() {
  loading.value = true;
  try {
    const data = await api.get<any, TenantProfile>("/admin/tenant/profile");
    profile.value = data;
    localStorage.setItem("admin_tenant_code", data.code || "");
    Object.assign(form, {
      name: data.name || "",
      region: data.region || "",
      contactName: data.contactName || "",
      contactPhone: data.contactPhone || ""
    });
  } catch (error: any) {
    ElMessage.error(error.message || "加载商家资料失败");
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!form.name.trim()) return ElMessage.warning("请填写商家名称");
  await ElMessageBox.confirm("确认保存商家资料？名称、地区和联系方式会用于后台识别与运营协作。", "保存商家资料", {
    type: "info",
    confirmButtonText: "确认保存",
    cancelButtonText: "再检查一下"
  });
  saving.value = true;
  try {
    const data = await api.patch<any, TenantProfile>("/admin/tenant/profile", {
      name: form.name.trim(),
      region: form.region.trim() || undefined,
      contactName: form.contactName.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined
    });
    profile.value = data;
    localStorage.setItem("admin_tenant_name", data.name || "");
    localStorage.setItem("admin_tenant_code", data.code || "");
    ElMessage.success("商家资料已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存商家资料失败");
  } finally {
    saving.value = false;
  }
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
      <el-button :icon="Refresh" @click="load">刷新</el-button>
    </div>

    <el-alert
      class="page-hint"
      type="info"
      show-icon
      :closable="false"
      title="平台权限仍由超级管理员控制"
      description="此处只能修改商家名称、地区、联系人和联系电话；活动发布审核、报名审核和收款配置权限请联系平台处理。"
    />

    <div class="table-card" v-loading="loading">
      <div class="profile-head">
        <el-icon><Shop /></el-icon>
        <div>
          <strong>{{ profile?.name || "商家" }}</strong>
          <small>商家编码：{{ profile?.code || "-" }}</small>
        </div>
        <el-tag :type="profile?.enabled ? 'success' : 'info'">{{ profile?.enabled ? "启用中" : "已停用" }}</el-tag>
      </div>

      <el-form label-position="top" class="profile-form">
        <div class="form-grid">
          <el-form-item label="商家名称" required>
            <el-input v-model="form.name" maxlength="120" show-word-limit />
          </el-form-item>
          <el-form-item label="地区">
            <el-input v-model="form.region" maxlength="80" placeholder="例如：华东一区、上海、浦东新区" />
          </el-form-item>
          <el-form-item label="联系人">
            <el-input v-model="form.contactName" maxlength="100" />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="form.contactPhone" maxlength="40" />
          </el-form-item>
        </div>
        <el-button type="primary" :loading="saving" @click="submit">保存资料</el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.subtitle { margin: 6px 0 0; color: #64748b; }
.page-hint { margin-bottom: 16px; }
.profile-head { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; margin-bottom: 20px; }
.profile-head .el-icon { width: 40px; height: 40px; border-radius: 8px; display: grid; place-items: center; background: #ecfdf5; color: #047857; font-size: 20px; }
.profile-head strong { display: block; font-size: 18px; }
small { color: #64748b; }
.profile-form { max-width: 760px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
@media (max-width: 760px) {
  .toolbar { align-items: flex-start; flex-direction: column; }
  .form-grid { grid-template-columns: 1fr; }
  .profile-head { grid-template-columns: 40px minmax(0, 1fr); }
  .profile-head .el-tag { grid-column: 2; justify-self: start; }
}
</style>
