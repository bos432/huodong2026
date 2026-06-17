<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";

type ReleaseSetting = {
  id?: number;
  appId?: string;
  hasAppSecret?: boolean;
  hasPrivateKey?: boolean;
  version?: string;
  description?: string;
  projectPath?: string;
  auditItem?: Record<string, unknown> | null;
  updatedAt?: string;
};

type ReleaseLog = {
  id: number;
  action: string;
  status: string;
  appId?: string;
  version?: string;
  description?: string;
  qrCodeUrl?: string;
  auditId?: string;
  errorMessage?: string;
  adminUsername?: string;
  createdAt?: string;
  detail?: Record<string, unknown>;
};

const loading = ref(false);
const saving = ref(false);
const actionLoading = ref("");
const setting = ref<ReleaseSetting | null>(null);
const logs = ref<ReleaseLog[]>([]);
const form = reactive({
  appId: "",
  appSecret: "",
  privateKey: "",
  version: "",
  description: "",
  projectPath: "apps/mobile/dist/build/mp-weixin",
  auditItemText: "{}"
});

const readiness = computed(() => [
  { label: "AppID", ok: Boolean(form.appId || setting.value?.appId), hint: "微信小程序后台的 AppID。" },
  { label: "AppSecret", ok: Boolean(form.appSecret || setting.value?.hasAppSecret), hint: "提交审核、查询审核和发布需要调用微信接口。" },
  { label: "CI 私钥", ok: Boolean(form.privateKey || setting.value?.hasPrivateKey), hint: "微信公众平台下载代码上传密钥，并配置服务器 IP 白名单。" },
  { label: "版本号", ok: Boolean(form.version), hint: "上传体验版必须填写，例如 1.0.1。" },
  { label: "构建目录", ok: Boolean(form.projectPath), hint: "默认读取 apps/mobile/dist/build/mp-weixin，发布前先构建小程序。" }
]);

const latestQrCode = computed(() => logs.value.find((item) => item.qrCodeUrl)?.qrCodeUrl || "");

const actionLabels: Record<string, string> = {
  setting: "保存配置",
  upload: "上传体验版",
  submit_audit: "提交审核",
  audit_status: "查询审核",
  release: "发布线上版"
};

const statusTypes: Record<string, "success" | "danger" | "warning" | "info"> = {
  success: "success",
  failed: "danger",
  processing: "warning"
};

function fillForm(row: ReleaseSetting | null) {
  setting.value = row;
  form.appId = row?.appId || "";
  form.appSecret = "";
  form.privateKey = "";
  form.version = row?.version || "";
  form.description = row?.description || "";
  form.projectPath = row?.projectPath || "apps/mobile/dist/build/mp-weixin";
  form.auditItemText = JSON.stringify(row?.auditItem || {}, null, 2);
}

async function load() {
  loading.value = true;
  try {
    const [settingData, logRows] = await Promise.all([
      api.get<any, ReleaseSetting | null>("/admin/miniprogram-release/setting"),
      api.get<any, ReleaseLog[]>("/admin/miniprogram-release/logs")
    ]);
    fillForm(settingData);
    logs.value = Array.isArray(logRows) ? logRows : [];
  } catch (error: any) {
    ElMessage.error(error.message || "加载小程序发布配置失败");
  } finally {
    loading.value = false;
  }
}

function parseAuditItem() {
  try {
    const parsed = JSON.parse(form.auditItemText || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new Error("审核类目配置必须是 JSON object");
  }
}

async function save() {
  let auditItem: Record<string, unknown>;
  try {
    auditItem = parseAuditItem();
  } catch (error: any) {
    return ElMessage.error(error.message);
  }
  saving.value = true;
  try {
    const saved = await api.post<any, ReleaseSetting>("/admin/miniprogram-release/setting", {
      appId: form.appId,
      appSecret: form.appSecret || undefined,
      privateKey: form.privateKey || undefined,
      version: form.version,
      description: form.description,
      projectPath: form.projectPath,
      auditItem
    });
    fillForm(saved);
    form.appSecret = "";
    form.privateKey = "";
    ElMessage.success("小程序发布配置已保存");
    await loadLogs();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function loadLogs() {
  logs.value = await api.get<any, ReleaseLog[]>("/admin/miniprogram-release/logs");
}

async function runAction(action: "upload" | "submit-audit" | "audit-status" | "release") {
  const confirmText: Record<string, string> = {
    upload: "确认上传体验版？上传前请确保服务器已执行小程序构建。",
    "submit-audit": "确认提交微信审核？提交后需等待微信审核结果。",
    "audit-status": "确认查询最新审核状态？",
    release: "确认发布线上版？该操作会把已审核版本发布给用户，请谨慎。"
  };
  if (action === "release") {
    await ElMessageBox.confirm(confirmText[action], "发布线上版", { type: "warning", confirmButtonText: "确认发布" });
  } else {
    await ElMessageBox.confirm(confirmText[action], "小程序发布管理", { type: "info" });
  }
  actionLoading.value = action;
  try {
    const body = action === "upload" ? { version: form.version, description: form.description } : {};
    await api.post(`/admin/miniprogram-release/${action}`, body);
    ElMessage.success("操作已完成，已写入发布记录");
    await loadLogs();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
    await loadLogs().catch(() => undefined);
  } finally {
    actionLoading.value = "";
  }
}

function formatTime(value?: string) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 19);
}

function logDetail(row: ReleaseLog) {
  return JSON.stringify(row.detail || {}, null, 2);
}

onMounted(load);
</script>

<template>
  <div class="page" v-loading="loading">
    <div class="toolbar">
      <div>
        <h2>小程序发布管理</h2>
        <p class="subtitle">上传体验版、提交微信审核、查询审核状态并发布线上版。</p>
      </div>
      <div class="actions">
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
      </div>
    </div>

    <el-alert
      class="notice"
      type="warning"
      :closable="false"
      show-icon
      title="上线前准备"
      description="需要在微信公众平台下载代码上传密钥，并把服务器出口 IP 加入小程序代码上传 IP 白名单；提审/发布还需要 AppSecret。上传体验版前，请先在服务器构建 mp-weixin。"
    />

    <div class="readiness">
      <div v-for="item in readiness" :key="item.label" class="ready-card" :class="{ ok: item.ok }">
        <strong>{{ item.label }}</strong>
        <el-tag :type="item.ok ? 'success' : 'warning'">{{ item.ok ? "已配置" : "待配置" }}</el-tag>
        <span>{{ item.hint }}</span>
      </div>
    </div>

    <div class="layout">
      <div class="card">
        <h3>发布配置</h3>
        <el-form label-width="120px">
          <el-form-item label="小程序 AppID"><el-input v-model="form.appId" placeholder="wx..." /></el-form-item>
          <el-form-item label="AppSecret">
            <el-input v-model="form.appSecret" show-password placeholder="留空表示不修改已保存 Secret" />
            <div class="field-hint">当前：{{ setting?.hasAppSecret ? "已保存" : "未保存" }}</div>
          </el-form-item>
          <el-form-item label="CI 私钥">
            <el-input v-model="form.privateKey" type="textarea" :rows="6" placeholder="粘贴微信代码上传密钥，留空表示不修改已保存私钥" />
            <div class="field-hint">当前：{{ setting?.hasPrivateKey ? "已保存" : "未保存" }}</div>
          </el-form-item>
          <el-form-item label="版本号"><el-input v-model="form.version" placeholder="例如 1.0.1" /></el-form-item>
          <el-form-item label="版本描述"><el-input v-model="form.description" type="textarea" :rows="3" placeholder="本次更新说明" /></el-form-item>
          <el-form-item label="构建目录"><el-input v-model="form.projectPath" /></el-form-item>
          <el-form-item label="审核类目 JSON">
            <el-input v-model="form.auditItemText" type="textarea" :rows="8" spellcheck="false" />
            <div class="field-hint">可填微信 submit_audit 的 item 或 item_list。不同小程序类目差异较大，首次建议按微信平台返回要求配置。</div>
          </el-form-item>
        </el-form>
      </div>

      <div class="card action-card">
        <h3>发布操作</h3>
        <div class="action-grid">
          <el-button type="primary" :loading="actionLoading === 'upload'" @click="runAction('upload')">上传体验版</el-button>
          <el-button type="warning" :loading="actionLoading === 'submit-audit'" @click="runAction('submit-audit')">提交微信审核</el-button>
          <el-button :loading="actionLoading === 'audit-status'" @click="runAction('audit-status')">查询审核状态</el-button>
          <el-button type="danger" :loading="actionLoading === 'release'" @click="runAction('release')">发布线上版</el-button>
        </div>
        <div class="qr-box">
          <template v-if="latestQrCode">
            <img :src="latestQrCode" alt="体验版二维码" />
            <span>最新体验版二维码</span>
          </template>
          <el-empty v-else description="上传体验版后显示二维码" />
        </div>
      </div>
    </div>

    <div class="card">
      <h3>发布记录</h3>
      <el-table :data="logs" stripe empty-text="暂无发布记录">
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="动作" width="120"><template #default="{ row }">{{ actionLabels[row.action] || row.action }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusTypes[row.status] || 'info'">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column prop="version" label="版本" width="110" />
        <el-table-column prop="auditId" label="审核 ID" width="120" />
        <el-table-column prop="adminUsername" label="操作人" width="120" />
        <el-table-column prop="errorMessage" label="失败原因" min-width="220" show-overflow-tooltip />
        <el-table-column type="expand">
          <template #default="{ row }">
            <pre class="detail-json">{{ logDetail(row) }}</pre>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.subtitle { margin: 6px 0 0; color: #64748b; }
.actions { display: flex; gap: 10px; }
.notice { margin-bottom: 16px; }
.readiness { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.ready-card { display: grid; gap: 8px; align-content: start; padding: 14px; border: 1px solid #fed7aa; border-radius: 8px; background: #fff7ed; }
.ready-card.ok { border-color: #bbf7d0; background: #f0fdf4; }
.ready-card span { color: #64748b; font-size: 13px; line-height: 1.45; }
.layout { display: grid; grid-template-columns: minmax(0, 1.35fr) 360px; gap: 16px; margin-bottom: 16px; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
.card h3 { margin: 0 0 16px; }
.field-hint { margin-top: 6px; color: #64748b; font-size: 12px; line-height: 1.5; }
.action-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
.qr-box { min-height: 260px; display: grid; place-items: center; margin-top: 16px; padding: 16px; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; }
.qr-box img { width: 220px; height: 220px; object-fit: contain; background: #fff; border-radius: 8px; }
.qr-box span { color: #64748b; font-size: 13px; }
.detail-json { margin: 0; padding: 12px; border-radius: 8px; background: #0f172a; color: #e2e8f0; white-space: pre-wrap; word-break: break-word; }
@media (max-width: 1200px) {
  .readiness { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .layout { grid-template-columns: 1fr; }
}
</style>
