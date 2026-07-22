<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { canAccess } from "../permissions";

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

const settingLoading = ref(false);
const logsLoading = ref(false);
const saving = ref(false);
const actionLoading = ref("");
const settingLoadError = ref("");
const logsLoadError = ref("");
const saveError = ref("");
const actionError = ref("");
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

const canManage = computed(() => canAccess(["miniprogram_release.manage"]));
const loading = computed(() => settingLoading.value || logsLoading.value);
const mutationBusy = computed(() => saving.value || Boolean(actionLoading.value));
const pageBusy = computed(() => loading.value || mutationBusy.value);

const readiness = computed(() => [
  { label: "AppID", ok: Boolean(form.appId || setting.value?.appId), hint: "微信小程序后台的 AppID。" },
  { label: "AppSecret", ok: Boolean(form.appSecret || setting.value?.hasAppSecret), hint: "保留配置；普通小程序提审不通过此处调用。" },
  { label: "CI 私钥", ok: Boolean(form.privateKey || setting.value?.hasPrivateKey), hint: "微信公众平台下载代码上传密钥，并配置服务器 IP 白名单。" },
  { label: "版本号", ok: Boolean(form.version), hint: "上传体验版必须填写，例如 1.0.1。" },
  { label: "构建目录", ok: Boolean(form.projectPath), hint: "默认读取 apps/mobile/dist/build/mp-weixin，发布前先构建小程序。" }
]);

const acceptanceChecklist = [
  "未登录进入“我的”后，可以返回首页、活动页和管理端入口",
  "首次获取头像昵称后，第二次登录不再强制重复获取",
  "活动详情可报名，报名成功后流程提示清晰",
  "报名详情可查看签到码/签到二维码",
  "手机管理端可保存草稿、发布活动，并能看到错误提示",
  "签到员可扫码或输入签到码完成核销"
];

const latestQrCode = computed(() => logs.value.find((item) => item.qrCodeUrl)?.qrCodeUrl || "");
const latestUploadLog = computed(() => latestLog("upload"));
const releaseStages = computed(() => [
  {
    key: "upload",
    label: "1. 上传体验版",
    status: latestUploadLog.value?.status || "pending",
    time: latestUploadLog.value?.createdAt,
    detail: latestUploadLog.value?.version ? `版本 ${latestUploadLog.value.version}` : "先在服务器构建 mp-weixin，再上传体验版"
  },
  {
    key: "submit_audit",
    label: "2. 提交审核",
    status: "manual",
    time: undefined,
    detail: "登录微信公众平台，在版本管理中提交审核"
  },
  {
    key: "audit_status",
    label: "3. 审核状态",
    status: "manual",
    time: undefined,
    detail: "在微信公众平台查看审核进度和失败原因"
  },
  {
    key: "release",
    label: "4. 发布线上版",
    status: "manual",
    time: undefined,
    detail: "审核通过后在微信公众平台确认发布"
  }
]);

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
  processing: "warning",
  pending: "info",
  manual: "warning"
};

function latestLog(action: string) {
  return logs.value.find((item) => item.action === action);
}

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
  if (pageBusy.value) return;
  await Promise.all([loadSetting(), loadLogs()]);
}

async function loadSetting(notify = true) {
  if (settingLoading.value) return;
  settingLoading.value = true;
  settingLoadError.value = "";
  try {
    const settingData = await api.get<any, ReleaseSetting | null>("/admin/miniprogram-release/setting");
    fillForm(settingData);
  } catch (error: any) {
    settingLoadError.value = error.message || "加载小程序发布配置失败";
    if (notify) ElMessage.error(settingLoadError.value);
  } finally {
    settingLoading.value = false;
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
  if (!canManage.value || pageBusy.value) return;
  let auditItem: Record<string, unknown>;
  try {
    auditItem = parseAuditItem();
  } catch (error: any) {
    return ElMessage.error(error.message);
  }
  const appId = form.appId.trim();
  const version = form.version.trim();
  const description = form.description.trim();
  const projectPath = form.projectPath.trim();
  if (!appId) return ElMessage.error("请填写小程序 AppID");
  if (appId.length > 80) return ElMessage.error("小程序 AppID 不能超过 80 个字符");
  if (version.length > 40) return ElMessage.error("版本号不能超过 40 个字符");
  if (description.length > 500) return ElMessage.error("版本描述不能超过 500 个字符");
  if (projectPath.length > 255) return ElMessage.error("构建目录不能超过 255 个字符");
  saving.value = true;
  saveError.value = "";
  try {
    const saved = await api.post<any, ReleaseSetting>("/admin/miniprogram-release/setting", {
      appId,
      appSecret: form.appSecret || undefined,
      privateKey: form.privateKey || undefined,
      version,
      description,
      projectPath,
      auditItem
    });
    fillForm(saved);
    form.appSecret = "";
    form.privateKey = "";
    ElMessage.success("小程序发布配置已保存");
    await loadLogs();
  } catch (error: any) {
    saveError.value = error.message || "保存失败";
    ElMessage.error(saveError.value);
  } finally {
    saving.value = false;
  }
}

async function loadLogs(notify = true) {
  if (logsLoading.value) return;
  logsLoading.value = true;
  logsLoadError.value = "";
  try {
    const rows = await api.get<any, ReleaseLog[]>("/admin/miniprogram-release/logs");
    logs.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    logsLoadError.value = error.message || "加载小程序发布记录失败";
    if (notify) ElMessage.error(logsLoadError.value);
  } finally {
    logsLoading.value = false;
  }
}

async function runAction(action: "upload") {
  if (!canManage.value || pageBusy.value) return;
  if (!form.version.trim()) return ElMessage.error("请先填写版本号并保存配置");
  const confirmed = await ElMessageBox.confirm(
    "确认上传体验版？上传前请确保服务器已执行小程序构建。",
    "小程序发布管理",
    { type: "info" }
  ).then(() => true).catch(() => false);
  if (!confirmed) return;
  actionLoading.value = action;
  actionError.value = "";
  try {
    await api.post("/admin/miniprogram-release/upload", { version: form.version, description: form.description });
    ElMessage.success("操作已完成，已写入发布记录");
    await loadLogs();
  } catch (error: any) {
    actionError.value = error.message || "操作失败";
    ElMessage.error(actionError.value);
    await loadLogs(false);
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
        <p class="subtitle">后台上传体验版，微信公众平台完成提交审核、状态查询和正式发布。</p>
      </div>
      <div class="actions">
        <el-button :loading="loading" :disabled="pageBusy" @click="load">刷新</el-button>
        <el-button v-if="canManage" type="primary" :loading="saving" :disabled="pageBusy" @click="save">保存配置</el-button>
      </div>
    </div>

    <div v-if="settingLoadError" class="error-recovery">
      <el-alert type="error" :title="settingLoadError" show-icon :closable="false" />
      <el-button :loading="settingLoading" :disabled="pageBusy" @click="loadSetting()">重试配置</el-button>
    </div>
    <div v-if="logsLoadError" class="error-recovery">
      <el-alert type="error" :title="logsLoadError" show-icon :closable="false" />
      <el-button :loading="logsLoading" :disabled="pageBusy" @click="loadLogs()">重试记录</el-button>
    </div>
    <el-alert v-if="saveError" class="operation-error" type="error" :title="saveError" show-icon :closable="false" />
    <el-alert v-if="actionError" class="operation-error" type="error" :title="actionError" show-icon :closable="false" />
    <el-alert v-if="!canManage" class="notice" type="info" :closable="false" show-icon title="当前账号为只读模式，可查看发布配置、阶段和记录，不能保存配置或执行上传、提审和发布。" />

    <el-alert
      class="notice"
      type="warning"
      :closable="false"
      show-icon
      title="上线前准备"
      description="需要在微信公众平台下载代码上传密钥，并把服务器出口 IP 加入小程序代码上传 IP 白名单。上传体验版前，请先在服务器构建 mp-weixin；普通小程序需到微信公众平台手动提审和发布。"
    />

    <div class="stage-grid">
      <div v-for="item in releaseStages" :key="item.key" class="stage-card" :class="item.status">
        <div>
          <strong>{{ item.label }}</strong>
          <span>{{ item.detail }}</span>
          <small>{{ formatTime(item.time) }}</small>
        </div>
        <el-tag :type="statusTypes[item.status] || 'info'" effect="plain">{{ item.status === "pending" ? "待处理" : item.status === "manual" ? "微信平台" : item.status }}</el-tag>
      </div>
    </div>

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
        <el-form label-width="120px" :disabled="!canManage || pageBusy">
          <el-form-item label="小程序 AppID"><el-input v-model="form.appId" placeholder="wx..." /></el-form-item>
          <el-form-item label="AppSecret（保留）">
            <el-input v-model="form.appSecret" show-password placeholder="留空表示不修改已保存 Secret" />
            <div class="field-hint">当前：{{ setting?.hasAppSecret ? "已保存" : "未保存" }}；普通小程序手动提审不依赖此项。</div>
          </el-form-item>
          <el-form-item label="CI 私钥">
            <el-input v-model="form.privateKey" type="textarea" :rows="6" placeholder="粘贴微信代码上传密钥，留空表示不修改已保存私钥" />
            <div class="field-hint">当前：{{ setting?.hasPrivateKey ? "已保存" : "未保存" }}</div>
          </el-form-item>
          <el-form-item label="版本号"><el-input v-model="form.version" placeholder="例如 1.0.1" /></el-form-item>
          <el-form-item label="版本描述"><el-input v-model="form.description" type="textarea" :rows="3" placeholder="本次更新说明" /></el-form-item>
          <el-form-item label="构建目录"><el-input v-model="form.projectPath" /></el-form-item>
          <el-form-item label="第三方审核 JSON">
            <el-input v-model="form.auditItemText" type="textarea" :rows="8" spellcheck="false" />
            <div class="field-hint">仅保留给未来接入微信第三方平台代开发模式；普通小程序无需填写。</div>
          </el-form-item>
        </el-form>
      </div>

      <div class="card action-card">
        <h3>发布操作</h3>
        <el-alert class="action-hint" type="info" :closable="false" show-icon title="推荐顺序：保存配置 -> 上传体验版 -> 体验码验收 -> 打开微信公众平台 -> 提交审核 -> 审核通过后发布。" />
        <el-alert class="action-hint" type="warning" :closable="false" show-icon title="普通小程序不能调用第三方平台专用的自动提审接口，审核与发布必须在微信公众平台完成。" />
        <div v-if="canManage" class="action-grid">
          <el-button type="primary" :loading="actionLoading === 'upload'" :disabled="pageBusy" @click="runAction('upload')">上传体验版</el-button>
          <a class="wechat-console-link" href="https://mp.weixin.qq.com/" target="_blank" rel="noopener noreferrer">打开微信公众平台</a>
        </div>
        <div class="qr-box">
          <template v-if="latestQrCode">
            <img :src="latestQrCode" alt="体验版二维码" />
            <span>最新体验版二维码</span>
          </template>
          <el-empty v-else description="上传体验版后显示二维码" />
        </div>
      </div>

      <div class="card checklist-card">
        <h3>体验版验收清单</h3>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="上传体验版后，先按清单验收，再提交微信审核。"
        />
        <div class="checklist">
          <div v-for="(item, index) in acceptanceChecklist" :key="item" class="check-item">
            <span>{{ index + 1 }}</span>
            <p>{{ item }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>发布记录</h3>
      <el-table :data="logs" stripe empty-text="暂无发布记录" v-loading="logsLoading">
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
.error-recovery { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.error-recovery .el-alert { flex: 1; min-width: 0; }
.operation-error { margin-bottom: 16px; }
.stage-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.stage-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; min-height: 118px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.stage-card.success { border-color: #bbf7d0; background: #f0fdf4; }
.stage-card.failed { border-color: #fecaca; background: #fef2f2; }
.stage-card.processing { border-color: #fed7aa; background: #fff7ed; }
.stage-card div { display: grid; gap: 6px; }
.stage-card strong { color: #111827; font-size: 15px; }
.stage-card span { color: #475569; font-size: 13px; line-height: 1.45; }
.stage-card small { color: #94a3b8; font-size: 12px; }
.readiness { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.ready-card { display: grid; gap: 8px; align-content: start; padding: 14px; border: 1px solid #fed7aa; border-radius: 8px; background: #fff7ed; }
.ready-card.ok { border-color: #bbf7d0; background: #f0fdf4; }
.ready-card span { color: #64748b; font-size: 13px; line-height: 1.45; }
.layout { display: grid; grid-template-columns: minmax(0, 1.35fr) 360px; gap: 16px; margin-bottom: 16px; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
.card h3 { margin: 0 0 16px; }
.field-hint { margin-top: 6px; color: #64748b; font-size: 12px; line-height: 1.5; }
.action-hint { margin-bottom: 12px; }
.action-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
.wechat-console-link { display: grid; min-height: 40px; place-items: center; border: 1px solid #d97706; border-radius: 4px; background: #d97706; color: #fff; font-size: 14px; text-decoration: none; }
.wechat-console-link:hover { border-color: #b45309; background: #b45309; color: #fff; }
.qr-box { min-height: 260px; display: grid; place-items: center; margin-top: 16px; padding: 16px; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; }
.qr-box img { width: 220px; height: 220px; object-fit: contain; background: #fff; border-radius: 8px; }
.qr-box span { color: #64748b; font-size: 13px; }
.checklist-card { grid-column: 2; }
.checklist { display: grid; gap: 10px; margin-top: 12px; }
.check-item { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px; align-items: start; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8fafc; }
.check-item span { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 999px; background: #0f766e; color: #fff; font-size: 12px; font-weight: 800; }
.check-item p { margin: 1px 0 0; color: #334155; font-size: 13px; line-height: 1.5; }
.detail-json { margin: 0; padding: 12px; border-radius: 8px; background: #0f172a; color: #e2e8f0; white-space: pre-wrap; word-break: break-word; }
@media (max-width: 1200px) {
  .stage-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .readiness { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .layout { grid-template-columns: 1fr; }
  .checklist-card { grid-column: auto; }
}
@media (max-width: 640px) {
  .toolbar { align-items: stretch; flex-direction: column; }
  .actions { flex-wrap: wrap; }
  .error-recovery { align-items: stretch; flex-direction: column; }
  .stage-grid { grid-template-columns: 1fr; }
}
</style>
