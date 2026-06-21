<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { api } from "../api";
import { currentTenantId, isPlatformAdmin } from "../permissions";

const route = useRoute();
const templates = ref<any[]>([]);
const notifications = ref<any[]>([]);
const schedules = ref<any[]>([]);
const providers = ref<any[]>([]);
const activities = ref<any[]>([]);
const tags = ref<any[]>([]);
const loading = ref(false);
const drawer = ref(false);
const scheduleDrawer = ref(false);
const previewDrawer = ref(false);
const editingId = ref<number | null>(null);
const editingScheduleId = ref<number | null>(null);
const preview = ref<any>();
const variableTips = ["{{activityTitle}}", "{{userName}}", "{{startTime}}", "{{endTime}}", "{{location}}", "{{userPhone}}", "{{checkInCode}}"];

const templateForm = reactive({ name: "", channel: "site", title: "", content: "", enabled: true });
const scheduleForm = reactive({
  activityId: undefined as number | undefined,
  templateId: undefined as number | undefined,
  name: "",
  channel: "site",
  beforeHours: 24,
  title: "",
  content: "",
  remark: "",
  enabled: true
});
const sendForm = reactive({
  templateId: undefined as number | undefined,
  activityId: undefined as number | undefined,
  tagName: "",
  channel: "site",
  title: "",
  content: "",
  remark: ""
});

const selectedTemplate = computed(() => templates.value.find((item) => item.id === sendForm.templateId));
const canSendActivityReminder = computed(() => Boolean(sendForm.activityId && (sendForm.templateId || (sendForm.title.trim() && sendForm.content.trim()))));
const tagOptions = computed(() => {
  const map = new Map<string, { name: string; count: number; color: string }>();
  for (const tag of tags.value) {
    const name = String(tag?.name || "").trim();
    if (!name) continue;
    const existing = map.get(name);
    if (existing) existing.count += 1;
    else map.set(name, { name, count: 1, color: tag.color || "default" });
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
});
const selectedTag = computed(() => tagOptions.value.find((item) => item.name === sendForm.tagName));
const canSendTaggedNotification = computed(() => Boolean(sendForm.tagName && (sendForm.templateId || (sendForm.title.trim() && sendForm.content.trim()))));
const tenantId = currentTenantId();

function routeActivityId() {
  const activityId = typeof route.query.activityId === "string" ? Number(route.query.activityId) : undefined;
  return activityId && Number.isFinite(activityId) ? activityId : undefined;
}

function applyRouteActivity() {
  const activityId = routeActivityId();
  if (activityId && activities.value.some((item) => item.id === activityId)) {
    sendForm.activityId = activityId;
    if (!sendForm.title.trim()) sendForm.title = "活动提醒";
    if (!sendForm.content.trim()) sendForm.content = "{{activityTitle}} 即将开始，请提前安排时间并按现场指引签到。";
    if (!sendForm.remark.trim()) sendForm.remark = "复盘行动建议";
  }
}

async function load() {
  loading.value = true;
  try {
    const [tpls, records, acts, rules, providerRows, tagRows] = await Promise.all([
      api.get<any, any[]>("/admin/notification-templates"),
      api.get<any, any[]>("/admin/notifications"),
      api.get<any, any[]>("/admin/activities"),
      api.get<any, any[]>("/admin/notification-schedules"),
      api.get<any, any[]>("/admin/notification-providers"),
      api.get<any, any[]>("/admin/tags")
    ]);
    templates.value = tpls;
    notifications.value = records;
    activities.value = Array.isArray(acts) ? acts : (acts as any).items || [];
    schedules.value = rules;
    providers.value = providerRows;
    tags.value = tagRows;
    applyRouteActivity();
  } finally {
    loading.value = false;
  }
}

function createTemplate() {
  editingId.value = null;
  Object.assign(templateForm, { name: "", channel: "site", title: "", content: "", enabled: true });
  drawer.value = true;
}

function createSchedule() {
  editingScheduleId.value = null;
  Object.assign(scheduleForm, { activityId: undefined, templateId: undefined, name: "", channel: "site", beforeHours: 24, title: "", content: "", remark: "", enabled: true });
  scheduleDrawer.value = true;
}

function editSchedule(row: any) {
  editingScheduleId.value = row.id;
  Object.assign(scheduleForm, {
    activityId: row.activity?.id,
    templateId: row.template?.id,
    name: row.name,
    channel: row.channel,
    beforeHours: row.beforeHours,
    title: row.title || "",
    content: row.content || "",
    remark: row.remark || "",
    enabled: row.enabled
  });
  scheduleDrawer.value = true;
}

async function saveSchedule() {
  if (!scheduleForm.activityId || !scheduleForm.name.trim()) {
    ElMessage.warning("请选择活动并填写规则名称");
    return;
  }
  if (!scheduleForm.templateId && (!scheduleForm.title.trim() || !scheduleForm.content.trim())) {
    ElMessage.warning("未选择模板时，请填写标题和内容");
    return;
  }
  if (editingScheduleId.value) await api.patch(`/admin/notification-schedules/${editingScheduleId.value}`, scheduleForm);
  else await api.post("/admin/notification-schedules", scheduleForm);
  ElMessage.success("提醒规则已保存");
  scheduleDrawer.value = false;
  load();
}

async function runDueSchedules() {
  await ElMessageBox.confirm("执行后会发送所有已到期且启用的提醒规则。请先确认模板内容、活动时间和通知服务商状态。", "执行到期提醒", { type: "warning", confirmButtonText: "确认执行", cancelButtonText: "再检查一下" });
  const result = await api.post<any, { dueCount: number }>("/admin/notification-schedules/run-due");
  ElMessage.success(`已执行 ${result.dueCount} 条到期规则`);
  load();
}

function editTemplate(row: any) {
  if (!canEditTemplate(row)) {
    copyTemplate(row);
    return;
  }
  editingId.value = row.id;
  Object.assign(templateForm, row);
  drawer.value = true;
}

function copyTemplate(row: any) {
  editingId.value = null;
  Object.assign(templateForm, {
    name: `${row.name || "模板"} - 商家副本`,
    channel: row.channel || "site",
    title: row.title || "",
    content: row.content || "",
    enabled: row.enabled ?? true
  });
  drawer.value = true;
}

async function saveTemplate() {
  if (!templateForm.name.trim() || !templateForm.title.trim() || !templateForm.content.trim()) {
    ElMessage.warning("请填写模板名称、标题和内容");
    return;
  }
  if (editingId.value) await api.patch(`/admin/notification-templates/${editingId.value}`, templateForm);
  else await api.post("/admin/notification-templates", templateForm);
  ElMessage.success("模板已保存");
  drawer.value = false;
  load();
}

function applyTemplate() {
  if (!selectedTemplate.value) return;
  sendForm.channel = selectedTemplate.value.channel;
  sendForm.title = selectedTemplate.value.title;
  sendForm.content = selectedTemplate.value.content;
}

async function previewNotification() {
  if (!sendForm.title.trim() || !sendForm.content.trim()) {
    ElMessage.warning("请先填写通知标题和内容");
    return;
  }
  preview.value = await api.post("/admin/notifications/preview", {
    ...sendForm,
    activityId: sendForm.activityId || undefined,
    templateId: sendForm.templateId || undefined
  });
  previewDrawer.value = true;
}

async function send() {
  if (!sendForm.title.trim() || !sendForm.content.trim()) {
    ElMessage.warning("请填写通知标题和内容");
    return;
  }
  await ElMessageBox.confirm("确认发送这条通知？若未指定用户，系统会按后端规则创建发送记录。建议先预览变量渲染结果。", "发送通知", { type: "warning", confirmButtonText: "确认发送", cancelButtonText: "先不发送" });
  await api.post("/admin/notifications/send", {
    ...sendForm,
    activityId: sendForm.activityId || undefined,
    templateId: sendForm.templateId || undefined
  });
  ElMessage.success("通知已发送");
  resetSendForm();
  load();
}

async function sendActivityReminder() {
  if (!sendForm.activityId) {
    ElMessage.warning("请先选择关联活动");
    return;
  }
  const activity = activities.value.find((item) => item.id === sendForm.activityId);
  await ElMessageBox.confirm(`确认向活动「${activity?.title || sendForm.activityId}」的相关用户发送提醒？发送前请确认标题、内容、渠道和服务商配置。`, "发送活动提醒", { type: "warning", confirmButtonText: "确认发送", cancelButtonText: "再预览一下" });
  const result = await api.post<any, { sentCount: number }>(`/admin/activities/${sendForm.activityId}/reminders/send`, {
    templateId: sendForm.templateId || undefined,
    channel: sendForm.channel,
    title: sendForm.title,
    content: sendForm.content,
    remark: sendForm.remark || "活动提醒"
  });
  ElMessage.success(`已发送 ${result.sentCount} 条活动提醒`);
  resetSendForm();
  load();
}

async function sendTaggedNotification() {
  if (!sendForm.tagName) {
    ElMessage.warning("请先选择会员分群标签");
    return;
  }
  const label = selectedTag.value ? `${selectedTag.value.name}（${selectedTag.value.count}人）` : sendForm.tagName;
  await ElMessageBox.confirm(`确认向会员分群「${label}」批量发送通知？发送前请确认标题、内容、渠道和服务商配置。`, "发送分群通知", { type: "warning", confirmButtonText: "确认发送", cancelButtonText: "再预览一下" });
  const result = await api.post<any, { matchedCount: number; sentCount: number; failedCount: number }>("/admin/notifications/send-by-tag", {
    ...sendForm,
    activityId: sendForm.activityId || undefined,
    templateId: sendForm.templateId || undefined,
    tagName: sendForm.tagName
  });
  ElMessage.success(`已处理 ${result.matchedCount} 位会员，成功 ${result.sentCount} 条，失败 ${result.failedCount} 条`);
  resetSendForm();
  load();
}

async function retryNotification(row: any) {
  await ElMessageBox.confirm(`确认重试发送「${row.title}」？如果服务商配置仍异常，可能会再次失败并记录重试次数。`, "重试通知", { type: "info", confirmButtonText: "确认重试", cancelButtonText: "取消" });
  await api.post(`/admin/notifications/${row.id}/retry`);
  ElMessage.success("已重新发送");
  load();
}

function resetSendForm() {
  Object.assign(sendForm, { templateId: undefined, activityId: undefined, tagName: "", channel: "site", title: "", content: "", remark: "" });
}

function templateTenantId(row: any) {
  const id = row?.tenant?.id || row?.tenantId || 0;
  return Number.isFinite(Number(id)) && Number(id) > 0 ? Number(id) : null;
}

function templateScopeLabel(row: any) {
  if (!templateTenantId(row)) return "平台全局";
  return row?.tenant?.name || row?.tenant?.code || "本商家";
}

function templateOptionLabel(row: any) {
  return `${row.name}（${templateScopeLabel(row)}）`;
}

function canEditTemplate(row: any) {
  if (isPlatformAdmin()) return true;
  return Boolean(tenantId && templateTenantId(row) === tenantId);
}

onMounted(load);

watch(
  () => route.query.activityId,
  () => applyRouteActivity()
);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>通知中心</h2>
      <div class="toolbar-actions">
        <el-button @click="load">刷新</el-button>
        <el-button @click="runDueSchedules">执行到期提醒</el-button>
        <el-button :icon="Plus" @click="createSchedule">新增提醒规则</el-button>
        <el-button type="primary" :icon="Plus" @click="createTemplate">新增模板</el-button>
      </div>
    </div>

    <div class="tips">
      <span>可用变量</span>
      <el-tag v-for="item in variableTips" :key="item" type="info">{{ item }}</el-tag>
    </div>

    <el-alert class="page-hint" type="info" :closable="false" show-icon title="发送前建议先预览" description="短信、微信、邮件一旦接入真实服务商就会触达用户。发送活动提醒前请确认模板变量、渠道状态和活动范围。" />

    <div class="provider-grid">
      <div v-for="item in providers" :key="item.channel" class="provider">
        <span>{{ item.channel }}</span>
        <strong>{{ item.provider }}</strong>
        <el-tag :type="item.ready ? 'success' : item.enabled ? 'warning' : 'info'">{{ item.ready ? "已就绪" : item.enabled ? "缺配置" : "未启用" }}</el-tag>
        <small v-if="item.missing?.length">缺少：{{ item.missing.join(", ") }}</small>
      </div>
    </div>

    <div class="grid">
      <div class="table-card" v-loading="loading">
        <h3>发送通知</h3>
        <el-form label-position="top">
          <el-form-item label="选择模板">
            <el-select v-model="sendForm.templateId" clearable filterable placeholder="可选：选择模板后自动填充" @change="applyTemplate">
              <el-option v-for="item in templates" :key="item.id" :label="templateOptionLabel(item)" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="关联活动">
            <el-select v-model="sendForm.activityId" clearable filterable placeholder="可选：关联到某个活动">
              <el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="会员分群">
            <el-select v-model="sendForm.tagName" clearable filterable placeholder="可选：按用户标签批量发送">
              <el-option v-for="item in tagOptions" :key="item.name" :label="`${item.name}（${item.count}人）`" :value="item.name" />
            </el-select>
            <small v-if="selectedTag" class="field-tip">当前分群预计触达 {{ selectedTag.count }} 位会员；商家后台发送分群通知需同时选择关联活动。</small>
          </el-form-item>
          <el-form-item label="渠道">
            <el-select v-model="sendForm.channel">
              <el-option label="站内通知" value="site" />
              <el-option label="微信订阅消息" value="wechat" />
              <el-option label="短信" value="sms" />
              <el-option label="邮件" value="email" />
            </el-select>
          </el-form-item>
          <el-form-item label="标题"><el-input v-model="sendForm.title" /></el-form-item>
          <el-form-item label="内容"><el-input v-model="sendForm.content" type="textarea" :rows="5" /></el-form-item>
          <el-form-item label="备注"><el-input v-model="sendForm.remark" placeholder="例如：活动前一天提醒" /></el-form-item>
          <div class="action-row">
            <el-button @click="previewNotification">预览</el-button>
            <el-button type="primary" @click="send">发送单条</el-button>
            <el-button type="success" :disabled="!canSendActivityReminder" @click="sendActivityReminder">发送活动提醒</el-button>
            <el-button type="warning" :disabled="!canSendTaggedNotification" @click="sendTaggedNotification">发送分群通知</el-button>
          </div>
        </el-form>
      </div>

      <div class="table-card">
        <h3>通知模板</h3>
        <el-empty v-if="!templates.length" description="暂无通知模板">
          <el-button type="primary" :icon="Plus" @click="createTemplate">新增模板</el-button>
        </el-empty>
        <el-table v-else :data="templates" stripe>
          <el-table-column label="归属" width="120">
            <template #default="{ row }">
              <el-tag :type="templateTenantId(row) ? 'success' : 'info'">{{ templateScopeLabel(row) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="模板" min-width="150" />
          <el-table-column prop="channel" label="渠道" width="110" />
          <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
          <el-table-column label="启用" width="90">
            <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "是" : "否" }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="130">
            <template #default="{ row }">
              <el-button v-if="canEditTemplate(row)" size="small" @click="editTemplate(row)">编辑</el-button>
              <el-button v-else size="small" @click="copyTemplate(row)">复制</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="table-card records">
      <h3>活动提醒规则</h3>
      <el-empty v-if="!schedules.length" description="暂无活动提醒规则">
        <el-button :icon="Plus" @click="createSchedule">新增提醒规则</el-button>
      </el-empty>
      <el-table v-else :data="schedules" stripe>
        <el-table-column prop="name" label="规则" min-width="160" />
        <el-table-column label="活动" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.activity?.title || "-" }}</template>
        </el-table-column>
        <el-table-column label="模板" min-width="150">
          <template #default="{ row }">{{ row.template?.name || "自定义内容" }}</template>
        </el-table-column>
        <el-table-column prop="channel" label="渠道" width="100" />
        <el-table-column prop="beforeHours" label="提前小时" width="100" />
        <el-table-column label="启用" width="90">
          <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "是" : "否" }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="lastSentCount" label="上次成功" width="100" />
        <el-table-column prop="lastFailedCount" label="上次失败" width="100" />
        <el-table-column prop="lastRunAt" label="上次执行" width="180" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }"><el-button size="small" @click="editSchedule(row)">编辑</el-button></template>
        </el-table-column>
      </el-table>
    </div>

    <div class="table-card records">
      <h3>发送记录</h3>
      <el-empty v-if="!notifications.length" description="暂无发送记录" />
      <el-table v-else :data="notifications" stripe>
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="channel" label="渠道" width="110" />
        <el-table-column label="活动" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.activity?.title || "-" }}</template>
        </el-table-column>
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">{{ row.user?.nickname || row.user?.phone || "全部/未指定" }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column prop="provider" label="服务商" width="130" />
        <el-table-column prop="retryCount" label="重试" width="80" />
        <el-table-column prop="errorMessage" label="错误" min-width="180" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="发送时间" width="180" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" :disabled="row.status !== 'failed'" @click="retryNotification(row)">重试</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="drawer" title="通知模板" size="540px">
      <el-form label-position="top">
        <el-form-item label="模板名称"><el-input v-model="templateForm.name" /></el-form-item>
        <el-form-item label="渠道">
          <el-select v-model="templateForm.channel">
            <el-option label="站内通知" value="site" />
            <el-option label="微信订阅消息" value="wechat" />
            <el-option label="短信" value="sms" />
            <el-option label="邮件" value="email" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题"><el-input v-model="templateForm.title" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="templateForm.content" type="textarea" :rows="6" /></el-form-item>
        <el-form-item><el-checkbox v-model="templateForm.enabled">启用</el-checkbox></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawer = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate">保存</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="scheduleDrawer" title="活动提醒规则" size="560px">
      <el-form label-position="top">
        <el-form-item label="规则名称"><el-input v-model="scheduleForm.name" placeholder="例如：活动前 24 小时提醒" /></el-form-item>
        <el-form-item label="活动">
          <el-select v-model="scheduleForm.activityId" filterable placeholder="选择活动">
            <el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="通知模板">
          <el-select v-model="scheduleForm.templateId" clearable filterable placeholder="可选：使用模板">
            <el-option v-for="item in templates" :key="item.id" :label="templateOptionLabel(item)" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="渠道">
          <el-select v-model="scheduleForm.channel">
            <el-option label="站内通知" value="site" />
            <el-option label="微信订阅消息" value="wechat" />
            <el-option label="短信" value="sms" />
            <el-option label="邮件" value="email" />
          </el-select>
        </el-form-item>
        <el-form-item label="活动开始前多少小时发送">
          <el-input-number v-model="scheduleForm.beforeHours" :min="0" :max="720" />
        </el-form-item>
        <el-form-item label="自定义标题"><el-input v-model="scheduleForm.title" placeholder="未选择模板时必填" /></el-form-item>
        <el-form-item label="自定义内容"><el-input v-model="scheduleForm.content" type="textarea" :rows="5" placeholder="未选择模板时必填" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="scheduleForm.remark" /></el-form-item>
        <el-form-item><el-checkbox v-model="scheduleForm.enabled">启用</el-checkbox></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleDrawer = false">取消</el-button>
        <el-button type="primary" @click="saveSchedule">保存</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="previewDrawer" title="通知预览" size="520px">
      <template v-if="preview">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="渠道">{{ preview.channel }}</el-descriptions-item>
          <el-descriptions-item label="标题">{{ preview.title }}</el-descriptions-item>
          <el-descriptions-item label="内容">{{ preview.content }}</el-descriptions-item>
        </el-descriptions>
        <h3 class="preview-title">变量值</h3>
        <el-table :data="Object.entries(preview.variables).map(([key, value]) => ({ key, value }))" stripe>
          <el-table-column prop="key" label="变量" width="160" />
          <el-table-column prop="value" label="当前值" />
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.toolbar-actions, .action-row, .tips { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tips { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.page-hint { margin-bottom: 16px; }
.tips span { color: #667085; font-size: 13px; }
.field-tip { display: block; margin-top: 6px; color: #667085; line-height: 1.5; }
.provider-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.provider { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; display: grid; gap: 6px; min-height: 118px; }
.provider span, .provider small { color: #667085; font-size: 12px; }
.provider strong { font-size: 15px; overflow-wrap: anywhere; }
.grid { display: grid; grid-template-columns: minmax(360px, 0.9fr) minmax(520px, 1.1fr); gap: 16px; align-items: start; }
.records { margin-top: 16px; }
.preview-title { margin-top: 18px; }
h3 { margin: 0 0 16px; }
@media (max-width: 1100px) { .grid, .provider-grid { grid-template-columns: 1fr; } }
</style>
