<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "../api";
import { formatShanghaiDateTime } from '../date-time';
import { canAccess } from "../permissions";

type ReleaseSetting = {
  id?: number;
  appId?: string;
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
const recordingUpload = ref(false);
const settingLoadError = ref("");
const logsLoadError = ref("");
const saveError = ref("");
const manualGuideVisible = ref(false);
const manualUploadRecordVisible = ref(false);
const setting = ref<ReleaseSetting | null>(null);
const logs = ref<ReleaseLog[]>([]);
const manualUploadForm = reactive({ confirmed: false });
const form = reactive({
  appId: "",
  version: "",
  description: "",
  projectPath: "apps/mobile/dist/build/mp-weixin",
  auditItemText: "{}"
});

const canManage = computed(() => canAccess(["miniprogram_release.manage"]));
const loading = computed(() => settingLoading.value || logsLoading.value);
const mutationBusy = computed(() => saving.value || recordingUpload.value);
const pageBusy = computed(() => loading.value || mutationBusy.value);
const currentUploadRecord = computed(() => logs.value.find((row) => row.action === "upload" && row.status === "success" && row.appId === setting.value?.appId && row.version === setting.value?.version));

const readiness = computed(() => [
  { label: "AppID", ok: Boolean(form.appId || setting.value?.appId), hint: "微信小程序后台的 AppID。" },
  { label: "版本号", ok: Boolean(form.version), hint: "体验版上传时填写的版本号，例如 1.0.1。" },
  { label: "构建目录", ok: Boolean(form.projectPath), hint: "本地构建后由微信开发者工具导入。" },
  { label: "上传方式", ok: false, hint: "由已授权的微信开发者工具账号人工上传，不在服务器保存上传密钥。" }
]);

const acceptanceChecklist = [
  "未登录进入“我的”后，可以返回首页、活动页和管理端入口",
  "首次获取头像昵称后，第二次登录不再强制重复获取",
  "活动详情可报名，报名成功后流程提示清晰",
  "报名详情可查看签到码/签到二维码",
  "手机管理端可保存草稿、发布活动，并能看到错误提示",
  "签到员可扫码或输入签到码完成核销"
];

const releaseStages = computed(() => [
  {
    key: "upload",
    label: "1. 上传体验版",
    status: currentUploadRecord.value ? "success" : "manual",
    time: currentUploadRecord.value?.createdAt,
    detail: currentUploadRecord.value ? "当前保存版本已有人工上传成功记录" : "本地构建后，在微信开发者工具导入并上传"
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

function fillForm(row: ReleaseSetting | null) {
  setting.value = row;
  form.appId = row?.appId || "";
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
      version,
      description,
      projectPath,
      auditItem
    });
    fillForm(saved);
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

function openManualGuide() {
  manualGuideVisible.value = true;
}

function openManualUploadRecord() {
  manualUploadForm.confirmed = false;
  manualUploadRecordVisible.value = true;
}

async function recordManualUpload() {
  if (!canManage.value || pageBusy.value) return;
  if (!setting.value?.appId || !form.version.trim()) return ElMessage.error("请先保存小程序 AppID 和版本号");
  if (!manualUploadForm.confirmed) return ElMessage.error("请先确认微信开发者工具显示上传成功");
  recordingUpload.value = true;
  try {
    await api.post<any, ReleaseLog>("/admin/miniprogram-release/manual-upload-record", {
      version: setting.value.version,
      confirmed: manualUploadForm.confirmed
    });
    manualUploadRecordVisible.value = false;
    ElMessage.success("已登记当前版本上传成功；真机验收和微信审核仍需单独完成");
    await loadLogs();
  } catch (error: any) {
    ElMessage.error(error.message || "登记上传结果失败");
  } finally {
    recordingUpload.value = false;
  }
}

function formatTime(value?: string) {
  return formatShanghaiDateTime(value, '-', true);
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
        <p class="subtitle">配置版本信息；构建、体验版上传和线上发布由负责人在本地微信工具中完成。</p>
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
    <el-alert v-if="!canManage" class="notice" type="info" :closable="false" show-icon title="当前账号为只读模式，可查看发布配置、阶段和记录，不能保存配置。" />

    <el-alert
      class="notice"
      type="warning"
      :closable="false"
      show-icon
      title="发布方式：本地人工上传"
      description="服务器不再保存微信代码上传密钥，也不代替开发者工具上传。请先在本机完成构建，再由已授权账号通过微信开发者工具上传体验版；提审和正式发布仍由负责人在微信公众平台操作。"
    />

    <div class="stage-grid">
      <div v-for="item in releaseStages" :key="item.key" class="stage-card" :class="item.status">
        <div>
          <strong>{{ item.label }}</strong>
          <span>{{ item.detail }}</span>
          <small>{{ formatTime(item.time) }}</small>
        </div>
        <el-tag :type="statusTypes[item.status] || 'info'" effect="plain">{{ item.status === "pending" ? "待处理" : item.status === "manual" ? "人工操作" : item.status }}</el-tag>
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
        <el-alert class="action-hint" type="info" :closable="false" show-icon title="推荐顺序：保存版本信息 -> 本地构建 -> 开发者工具上传体验版 -> 真机验收 -> 微信公众平台提审。" />
        <el-alert class="action-hint" type="warning" :closable="false" show-icon title="普通小程序不能调用第三方平台专用的自动提审接口，审核与发布必须在微信公众平台完成。" />
        <div v-if="canManage" class="action-grid">
          <el-button type="primary" :disabled="pageBusy" @click="openManualGuide">查看本地上传步骤</el-button>
          <el-button :disabled="pageBusy || !setting?.version" @click="openManualUploadRecord">登记上传成功</el-button>
          <a class="wechat-console-link" href="https://mp.weixin.qq.com/" target="_blank" rel="noopener noreferrer">打开微信公众平台</a>
        </div>
        <div class="qr-box">
          <el-empty description="体验版二维码由微信开发者工具生成；历史二维码不会显示为当前版本" />
        </div>
      </div>

      <div class="card checklist-card">
        <h3>体验版验收清单</h3>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="人工上传并取得当前版本体验码后，先按清单验收，再决定是否提交审核。"
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
      <p class="field-hint">保留历史操作记录；历史上传成功状态不代表当前微信开发版本或体验码。</p>
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

    <el-dialog v-model="manualGuideVisible" title="本地上传体验版" width="min(620px, calc(100vw - 32px))">
      <ol class="manual-steps">
        <li>在项目根目录运行 <code>npm run build:mobile:mp-weixin</code>，等待构建及产物校验通过。</li>
        <li>在微信开发者工具导入 <code>apps/mobile/dist/build/mp-weixin</code> 目录。</li>
        <li>确认 AppID 与当前小程序一致，点击工具右上角“上传”，填写版本号 <code>{{ form.version || "（先填写版本号）" }}</code>。</li>
        <li>上传成功后，从微信公众平台或开发者工具获取当前体验码，完成真机验收；本后台不会伪造二维码或上传结果。</li>
      </ol>
      <template #footer>
        <el-button @click="manualGuideVisible = false">关闭</el-button>
        <a class="wechat-console-link" href="https://mp.weixin.qq.com/" target="_blank" rel="noopener noreferrer">打开微信公众平台</a>
      </template>
    </el-dialog>

    <el-dialog v-model="manualUploadRecordVisible" title="登记体验版上传结果" width="min(520px, calc(100vw - 32px))">
      <el-alert type="warning" :closable="false" show-icon title="仅在微信开发者工具明确显示上传成功后登记。此操作不会标记真机验收、审核通过或正式发布。" />
      <el-form label-width="110px" class="upload-record-form">
        <el-form-item label="小程序 AppID"><el-input :model-value="setting?.appId || ''" disabled /></el-form-item>
        <el-form-item label="登记版本"><el-input :model-value="setting?.version || ''" disabled /></el-form-item>
        <el-form-item>
          <el-checkbox v-model="manualUploadForm.confirmed">我确认微信开发者工具已显示该版本上传成功</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualUploadRecordVisible = false">取消</el-button>
        <el-button type="primary" :loading="recordingUpload" :disabled="!manualUploadForm.confirmed" @click="recordManualUpload">保存登记</el-button>
      </template>
    </el-dialog>
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
.upload-record-form { margin-top: 18px; }
.stage-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.stage-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; min-height: 118px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.stage-card.success { border-color: #bbf7d0; background: #f0fdf4; }
.stage-card.failed { border-color: #fecaca; background: #fef2f2; }
.stage-card.processing { border-color: #fed7aa; background: #fff7ed; }
.stage-card div { display: grid; gap: 6px; }
.stage-card strong { color: #111827; font-size: 15px; }
.stage-card span { color: #475569; font-size: 13px; line-height: 1.45; }
.stage-card small { color: #94a3b8; font-size: 12px; }
.readiness { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
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
.manual-steps { display: grid; gap: 12px; padding-left: 22px; color: #334155; line-height: 1.7; }
.manual-steps code { overflow-wrap: anywhere; padding: 2px 4px; border-radius: 4px; background: #f1f5f9; }
.el-dialog__footer .wechat-console-link { display: inline-grid; padding: 0 14px; }
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
