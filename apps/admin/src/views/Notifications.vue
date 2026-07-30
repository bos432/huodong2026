<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { api } from "../api";
import { currentTenantId, hasPermission, isPlatformAdmin } from "../permissions";
import { maskPhone } from "../privacy";

const route = useRoute();
const canManageTemplates = computed(() => hasPermission("notification.template.manage") || hasPermission("notification.manage"));
const canSend = computed(() => hasPermission("notification.send") || hasPermission("notification.manage"));
const canManagePreferences = computed(() => hasPermission("notification.preference.manage") || hasPermission("notification.manage"));
const canViewSensitive = computed(() => hasPermission("notification.sensitive"));
const templates = ref<any[]>([]);
const notifications = ref<any[]>([]);
const schedules = ref<any[]>([]);
const providers = ref<any[]>([]);
const preferences = ref<any[]>([]);
const activities = ref<any[]>([]);
const tags = ref<any[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const actionKey = ref("");
const drawer = ref(false);
const scheduleDrawer = ref(false);
const previewDrawer = ref(false);
const versionsDrawer = ref(false);
const templateVersions = ref<any>();
const monitor = ref<any>();
const editingId = ref<number | null>(null);
const editingScheduleId = ref<number | null>(null);
const preview = ref<any>();
const notificationPage = ref(1);
const notificationPageSize = 20;
const notificationTotal = ref(0);
const preferencePage = ref(1);
const preferencePageSize = 20;
const preferenceTotal = ref(0);
const preferenceForm = reactive({ userId: undefined as number | undefined, channel: "sms", subscribed: false, reason: "用户申请退订" });
const variableTips = ["{{activityTitle}}", "{{userName}}", "{{startTime}}", "{{endTime}}", "{{location}}", "{{userPhone}}", "{{checkInCode}}"];

const templateForm = reactive({ name: "", channel: "site", scene: "", title: "", content: "", providerTemplateId: "", approvalStatus: "draft", dataKeysText: "", page: "pages/index/index", enabled: true });
const notificationFilters = reactive({ status: "", channel: "", scene: "", keyword: "" });
const sceneOptions = [
  ["registrationSubmitted", "报名提交"], ["registrationApproved", "报名通过"], ["registrationRejected", "报名拒绝"],
  ["paymentSucceeded", "支付成功"], ["refundSucceeded", "退款成功"], ["refundRejected", "退款拒绝"],
  ["activityCancelled", "活动取消"], ["activityChanged", "活动变更"], ["checkInSucceeded", "签到成功"],
  ["activityReminder", "活动提醒"], ["reviewInvitation", "评价邀请"], ["certificateAvailable", "证书领取"],
  ["activityRecommendations", "活动推荐"]
] as const;
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
  userId: undefined as number | undefined,
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
const tagOptions = computed(() => [...tags.value].sort((a, b) => Number(b.count || 0) - Number(a.count || 0) || String(a.name || "").localeCompare(String(b.name || ""))));
const selectedTag = computed(() => tagOptions.value.find((item) => item.name === sendForm.tagName));
const canSendTaggedNotification = computed(() => Boolean(sendForm.tagName && (sendForm.templateId || (sendForm.title.trim() && sendForm.content.trim()))));
const tenantId = currentTenantId();

function selectedTenantId() {
  const selected = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : undefined;
  if (isPlatformAdmin() && selected && Number.isInteger(selected) && selected > 0) return selected;
  return tenantId || undefined;
}

function tenantScopeOptions(params: Record<string, unknown> = {}) {
  const selected = selectedTenantId();
  return { params: { ...params, ...(isPlatformAdmin() && selected ? { tenantId: selected } : {}) } };
}

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
  errorMessage.value = "";
  try {
    const [tpls, records, options, rules, providerRows, preferenceRows, monitorData] = await Promise.all([
      api.get<any, any[]>("/admin/notification-templates", tenantScopeOptions()),
      api.get<any, { items: any[]; total: number }>("/admin/notifications", tenantScopeOptions({ page: notificationPage.value, pageSize: notificationPageSize, ...notificationFilters })),
      api.get<any, { activities: any[]; tags: any[] }>("/admin/notifications/options", tenantScopeOptions()),
      api.get<any, any[]>("/admin/notification-schedules", tenantScopeOptions()),
      api.get<any, any[]>("/admin/notification-providers", tenantScopeOptions()),
      api.get<any, { items: any[]; total: number }>("/admin/notification-preferences", tenantScopeOptions({ page: preferencePage.value, pageSize: preferencePageSize })),
      api.get<any, any>("/admin/notifications/monitor", tenantScopeOptions())
    ]);
    templates.value = tpls;
    notifications.value = records.items || [];
    notificationTotal.value = Number(records.total || 0);
    activities.value = options.activities || [];
    schedules.value = rules;
    providers.value = providerRows;
    tags.value = options.tags || [];
    preferences.value = preferenceRows.items || [];
    preferenceTotal.value = Number(preferenceRows.total || 0);
    monitor.value = monitorData;
    applyRouteActivity();
  } catch (error: any) {
    errorMessage.value = error.message || "通知中心加载失败";
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function createTemplate() {
  if (!canManageTemplates.value) return ElMessage.warning("当前账号无模板维护权限");
  editingId.value = null;
  Object.assign(templateForm, { name: "", channel: "site", scene: "", title: "", content: "", providerTemplateId: "", approvalStatus: "draft", dataKeysText: "", page: "pages/index/index", enabled: true });
  drawer.value = true;
}

function createSchedule() {
  if (!canManageTemplates.value) return ElMessage.warning("当前账号无提醒规则维护权限");
  editingScheduleId.value = null;
  Object.assign(scheduleForm, { activityId: undefined, templateId: undefined, name: "", channel: "site", beforeHours: 24, title: "", content: "", remark: "", enabled: true });
  scheduleDrawer.value = true;
}

function editSchedule(row: any) {
  if (!canManageTemplates.value) return ElMessage.warning("当前账号无提醒规则维护权限");
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
  if (!canManageTemplates.value) return ElMessage.warning("当前账号无提醒规则维护权限");
  if (actionKey.value) return;
  if (!scheduleForm.activityId || !scheduleForm.name.trim()) {
    ElMessage.warning("请选择活动并填写规则名称");
    return;
  }
  if (!scheduleForm.templateId && (!scheduleForm.title.trim() || !scheduleForm.content.trim())) {
    ElMessage.warning("未选择模板时，请填写标题和内容");
    return;
  }
  actionKey.value = editingScheduleId.value ? `schedule:${editingScheduleId.value}` : "schedule:create";
  try {
    if (editingScheduleId.value) await api.patch(`/admin/notification-schedules/${editingScheduleId.value}`, scheduleForm, tenantScopeOptions());
    else await api.post("/admin/notification-schedules", scheduleForm, tenantScopeOptions());
    ElMessage.success("提醒规则已保存");
    scheduleDrawer.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "提醒规则保存失败");
  } finally {
    actionKey.value = "";
  }
}

async function runDueSchedules() {
  if (!canSend.value) return ElMessage.warning("当前账号无通知发送权限");
  if (actionKey.value) return;
  actionKey.value = "schedule:run-due";
  try {
    await ElMessageBox.confirm("执行后会发送所有已到期且启用的提醒规则。请先确认模板内容、活动时间和通知服务商状态。", "执行到期提醒", { type: "warning", confirmButtonText: "确认执行", cancelButtonText: "再检查一下" });
    const result = await api.post<any, { dueCount: number }>("/admin/notification-schedules/run-due", undefined, tenantScopeOptions());
    ElMessage.success(`已执行 ${result.dueCount} 条到期规则`);
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "执行到期提醒失败");
  } finally {
    actionKey.value = "";
  }
}

function editTemplate(row: any) {
  if (!canManageTemplates.value) return ElMessage.warning("当前账号无模板维护权限");
  if (!canEditTemplate(row)) {
    copyTemplate(row);
    return;
  }
  editingId.value = row.id;
  Object.assign(templateForm, { ...row, scene: row.scene || "", providerTemplateId: row.providerTemplateId || "", approvalStatus: row.approvalStatus || "draft", dataKeysText: row.dataKeys ? JSON.stringify(row.dataKeys, null, 2) : "", page: row.page || "pages/index/index" });
  drawer.value = true;
}

function copyTemplate(row: any) {
  if (!canManageTemplates.value) return ElMessage.warning("当前账号无模板维护权限");
  editingId.value = null;
  Object.assign(templateForm, {
    name: `${row.name || "模板"} - 商家副本`,
    channel: row.channel || "site",
    title: row.title || "",
    content: row.content || "",
    scene: row.scene || "",
    providerTemplateId: row.providerTemplateId || "",
    approvalStatus: row.approvalStatus || "draft",
    dataKeysText: row.dataKeys ? JSON.stringify(row.dataKeys, null, 2) : "",
    page: row.page || "pages/index/index",
    enabled: row.enabled ?? true
  });
  drawer.value = true;
}

async function saveTemplate() {
  if (!canManageTemplates.value) return ElMessage.warning("当前账号无模板维护权限");
  if (actionKey.value) return;
  if (!templateForm.name.trim() || !templateForm.title.trim() || !templateForm.content.trim()) {
    ElMessage.warning("请填写模板名称、标题和内容");
    return;
  }
  actionKey.value = editingId.value ? `template:${editingId.value}` : "template:create";
  try {
    let dataKeys: Record<string, string> | undefined;
    if (templateForm.dataKeysText.trim()) {
      try { dataKeys = JSON.parse(templateForm.dataKeysText); }
      catch { ElMessage.warning("微信字段映射必须是有效 JSON"); return; }
    }
    const payload = { ...templateForm, scene: templateForm.scene || undefined, providerTemplateId: templateForm.providerTemplateId || undefined, page: templateForm.page || undefined, dataKeys };
    if (editingId.value) await api.patch(`/admin/notification-templates/${editingId.value}`, payload, tenantScopeOptions());
    else await api.post("/admin/notification-templates", payload, tenantScopeOptions());
    ElMessage.success("模板已保存");
    drawer.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "模板保存失败");
  } finally {
    actionKey.value = "";
  }
}

function applyTemplate() {
  if (!selectedTemplate.value) return;
  sendForm.channel = selectedTemplate.value.channel;
  sendForm.title = selectedTemplate.value.title;
  sendForm.content = selectedTemplate.value.content;
}

async function previewNotification() {
  if (actionKey.value) return;
  if (!sendForm.title.trim() || !sendForm.content.trim()) {
    ElMessage.warning("请先填写通知标题和内容");
    return;
  }
  actionKey.value = "notification:preview";
  try {
    preview.value = await api.post("/admin/notifications/preview", {
      ...sendForm,
      activityId: sendForm.activityId || undefined,
      templateId: sendForm.templateId || undefined
    }, tenantScopeOptions());
    previewDrawer.value = true;
  } catch (error: any) {
    ElMessage.error(error.message || "通知预览失败");
  } finally {
    actionKey.value = "";
  }
}

async function showTemplateVersions(row: any) {
  actionKey.value = `versions:${row.id}`;
  try {
    templateVersions.value = await api.get(`/admin/notification-templates/${row.id}/versions`, tenantScopeOptions());
    versionsDrawer.value = true;
  } catch (error: any) { ElMessage.error(error.message || "模板版本加载失败"); }
  finally { actionKey.value = ""; }
}

async function testTemplate(row: any) {
  if (!canSend.value || actionKey.value) return;
  try {
    const { value } = await ElMessageBox.prompt("填写接收测试消息的会员 ID。真实短信和微信消息会立即发送。", `测试模板 v${row.version || 1}`, { inputPattern: /^[1-9]\d*$/, inputErrorMessage: "请输入有效会员 ID", confirmButtonText: "发送测试", cancelButtonText: "取消" });
    actionKey.value = `test:${row.id}`;
    const result = await api.post<any, any>(`/admin/notification-templates/${row.id}/test`, { userId: Number(value) }, tenantScopeOptions());
    ElMessage.success(result.status === "sent" ? "测试消息发送成功" : `测试消息状态：${statusText(result.status)}`);
    await load();
  } catch (error: any) { if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "模板测试失败"); }
  finally { actionKey.value = ""; }
}

function applyNotificationFilters() { notificationPage.value = 1; void load(); }

async function send() {
  if (!canSend.value) return ElMessage.warning("当前账号无通知发送权限");
  if (actionKey.value) return;
  if (!sendForm.userId) return ElMessage.warning("请选择目标会员 ID");
  if (!sendForm.title.trim() || !sendForm.content.trim()) {
    ElMessage.warning("请填写通知标题和内容");
    return;
  }
  actionKey.value = "notification:send";
  try {
    await ElMessageBox.confirm("确认发送这条通知？若未指定用户，系统会按后端规则创建发送记录。建议先预览变量渲染结果。", "发送通知", { type: "warning", confirmButtonText: "确认发送", cancelButtonText: "先不发送" });
    await api.post("/admin/notifications/send", {
      ...sendForm,
      activityId: sendForm.activityId || undefined,
      templateId: sendForm.templateId || undefined
    }, tenantScopeOptions());
    ElMessage.success("通知已发送");
    resetSendForm();
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "通知发送失败");
  } finally {
    actionKey.value = "";
  }
}

async function sendActivityReminder() {
  if (!canSend.value) return ElMessage.warning("当前账号无通知发送权限");
  if (actionKey.value) return;
  if (!sendForm.activityId) {
    ElMessage.warning("请先选择关联活动");
    return;
  }
  const activity = activities.value.find((item) => item.id === sendForm.activityId);
  actionKey.value = "notification:activity";
  try {
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
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "活动提醒发送失败");
  } finally {
    actionKey.value = "";
  }
}

async function sendTaggedNotification() {
  if (!canSend.value) return ElMessage.warning("当前账号无通知发送权限");
  if (actionKey.value) return;
  if (!sendForm.tagName) {
    ElMessage.warning("请先选择会员分群标签");
    return;
  }
  const label = selectedTag.value ? `${selectedTag.value.name}（${selectedTag.value.count}人）` : sendForm.tagName;
  actionKey.value = "notification:tag";
  try {
    await ElMessageBox.confirm(`确认向会员分群「${label}」批量发送通知？发送前请确认标题、内容、渠道和服务商配置。`, "发送分群通知", { type: "warning", confirmButtonText: "确认发送", cancelButtonText: "再预览一下" });
    const result = await api.post<any, { matchedCount: number; sentCount: number; failedCount: number }>("/admin/notifications/send-by-tag", {
      ...sendForm,
      activityId: sendForm.activityId || undefined,
      templateId: sendForm.templateId || undefined,
      tagName: sendForm.tagName
    }, tenantScopeOptions());
    ElMessage.success(`已处理 ${result.matchedCount} 位会员，成功 ${result.sentCount} 条，失败 ${result.failedCount} 条`);
    resetSendForm();
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "分群通知发送失败");
  } finally {
    actionKey.value = "";
  }
}

async function retryNotification(row: any) {
  if (!canSend.value) return ElMessage.warning("当前账号无通知发送权限");
  if (actionKey.value) return;
  actionKey.value = `notification:retry:${row.id}`;
  try {
    await ElMessageBox.confirm(`确认重试发送「${row.title}」？如果服务商配置仍异常，可能会再次失败并记录重试次数。`, "重试通知", { type: "info", confirmButtonText: "确认重试", cancelButtonText: "取消" });
    await api.post(`/admin/notifications/${row.id}/retry`, undefined, tenantScopeOptions());
    ElMessage.success("已重新发送");
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "通知重试失败");
  } finally {
    actionKey.value = "";
  }
}

async function savePreference() {
  if (!canManagePreferences.value) return ElMessage.warning("当前账号无通知偏好维护权限");
  if (actionKey.value) return;
  if (!preferenceForm.userId) return ElMessage.warning("请填写会员 ID");
  actionKey.value = `preference:${preferenceForm.userId}`;
  try {
    await api.patch(`/admin/notification-preferences/${preferenceForm.userId}`, { channel: preferenceForm.channel, subscribed: preferenceForm.subscribed, reason: preferenceForm.reason.trim() || undefined }, tenantScopeOptions());
    ElMessage.success(preferenceForm.subscribed ? "已恢复该渠道订阅" : "已记录渠道退订");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "通知偏好保存失败");
  } finally {
    actionKey.value = "";
  }
}

function statusType(status: string) { return status === "sent" ? "success" : status === "failed" ? "danger" : status === "suppressed" ? "warning" : "info"; }
function statusText(status: string) { return ({ sent: "已发送", failed: "失败", suppressed: "已抑制", pending: "待发送" } as Record<string, string>)[status] || status; }

function resetSendForm() {
  Object.assign(sendForm, { userId: undefined, templateId: undefined, activityId: undefined, tagName: "", channel: "site", title: "", content: "", remark: "" });
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
  if (!canManageTemplates.value) return false;
  if (isPlatformAdmin()) return true;
  return Boolean(tenantId && templateTenantId(row) === tenantId);
}

function displayUser(row: any, emptyText = "全部/未指定") {
  if (!row?.user) return emptyText;
  const phone = row.user.phone;
  return row.user.nickname || (canViewSensitive.value && !row.sensitiveMasked && !row.user.sensitiveMasked ? phone : maskPhone(phone)) || `ID ${row.user.id}`;
}

function userIdLabel(row: any) {
  return row?.user?.id ? `ID ${row.user.id}` : "-";
}

function changeNotificationPage(page: number) {
  notificationPage.value = page;
  load();
}

function changePreferencePage(page: number) {
  preferencePage.value = page;
  load();
}

onMounted(load);

watch(
  () => route.query.activityId,
  () => applyRouteActivity()
);

watch(
  () => route.query.tenantId,
  () => {
    notificationPage.value = 1;
    preferencePage.value = 1;
    void load();
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>通知中心</h2>
      <div class="toolbar-actions">
        <el-button :loading="loading" @click="load">刷新</el-button>
        <el-button v-if="canSend" :loading="actionKey === 'schedule:run-due'" :disabled="Boolean(actionKey)" @click="runDueSchedules">执行到期提醒</el-button>
        <el-button v-if="canManageTemplates" :icon="Plus" @click="createSchedule">新增提醒规则</el-button>
        <el-button v-if="canManageTemplates" type="primary" :icon="Plus" @click="createTemplate">新增模板</el-button>
      </div>
    </div>
    <el-alert v-if="errorMessage" class="page-error" type="error" show-icon :closable="false" :title="errorMessage"><template #default><el-button size="small" @click="load">重试</el-button></template></el-alert>
    <el-alert v-if="canViewSensitive" class="permission-alert" type="warning" :closable="false" show-icon title="敏感查看权限已启用：会员手机号、服务商消息号、错误详情和完整变量可见。" />
    <el-alert v-else-if="canSend || canManageTemplates || canManagePreferences" class="permission-alert" type="info" :closable="false" show-icon title="当前账号可执行已授权的通知操作，会员和服务商敏感信息保持脱敏。" />
    <el-alert v-else class="permission-alert" type="info" :closable="false" show-icon title="当前账号仅可查看通知模板、规则、偏好和脱敏发送记录。" />

    <div class="tips">
      <span>可用变量</span>
      <el-tag v-for="item in variableTips" :key="item" type="info">{{ item }}</el-tag>
    </div>

    <el-alert class="page-hint" type="info" :closable="false" show-icon title="发送前建议先预览" description="短信、微信、邮件一旦接入真实服务商就会触达用户。发送活动提醒前请确认模板变量、渠道状态和活动范围。" />

    <div class="monitor-grid" v-loading="loading">
      <div class="monitor-item"><span>发送成功</span><strong>{{ monitor?.status?.sent || 0 }}</strong></div>
      <div class="monitor-item danger"><span>发送失败</span><strong>{{ monitor?.status?.failed || 0 }}</strong></div>
      <div class="monitor-item warning"><span>已抑制</span><strong>{{ monitor?.status?.suppressed || 0 }}</strong></div>
      <div class="monitor-item"><span>累计重试</span><strong>{{ monitor?.retries || 0 }}</strong></div>
      <div class="monitor-item danger"><span>通知死信</span><strong>{{ monitor?.jobs?.dead_letter || 0 }}</strong></div>
      <div class="monitor-item warning"><span>队列待处理</span><strong>{{ monitor?.jobs?.pending || 0 }}</strong></div>
    </div>

    <div class="provider-grid">
      <div v-for="item in providers" :key="item.channel" class="provider">
        <span>{{ item.channel }}</span>
        <strong>{{ item.provider }}</strong>
        <el-tag :type="item.ready ? 'success' : item.enabled ? 'warning' : 'info'">{{ item.ready ? "已就绪" : item.enabled ? "缺配置" : "未启用" }}</el-tag>
        <small v-if="item.missing?.length">缺少：{{ item.missing.join(", ") }}</small>
      </div>
    </div>

    <div class="grid" :class="{ 'single-column': !canSend }">
      <div v-if="canSend" class="table-card" v-loading="loading">
        <h3>发送通知</h3>
        <el-form label-position="top">
          <el-form-item label="目标会员 ID"><el-input-number v-model="sendForm.userId" :min="1" placeholder="在会员资产的 User ID 列查找" /><small class="field-tip">在「会员资产」列表查看并复制 User ID；发送记录会保留对应 ID。</small></el-form-item>
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
            <el-button :loading="actionKey === 'notification:preview'" :disabled="Boolean(actionKey)" @click="previewNotification">预览</el-button>
            <el-button type="primary" :loading="actionKey === 'notification:send'" :disabled="Boolean(actionKey)" @click="send">发送单条</el-button>
            <el-button type="success" :loading="actionKey === 'notification:activity'" :disabled="!canSendActivityReminder || Boolean(actionKey)" @click="sendActivityReminder">发送活动提醒</el-button>
            <el-button type="warning" :loading="actionKey === 'notification:tag'" :disabled="!canSendTaggedNotification || Boolean(actionKey)" @click="sendTaggedNotification">发送分群通知</el-button>
          </div>
        </el-form>
      </div>

      <div class="table-card">
        <h3>通知模板</h3>
        <el-empty v-if="!templates.length" description="暂无通知模板">
          <el-button v-if="canManageTemplates" type="primary" :icon="Plus" @click="createTemplate">新增模板</el-button>
        </el-empty>
        <el-table v-else :data="templates" stripe>
          <el-table-column label="归属" width="120">
            <template #default="{ row }">
              <el-tag :type="templateTenantId(row) ? 'success' : 'info'">{{ templateScopeLabel(row) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="模板" min-width="150" />
          <el-table-column prop="channel" label="渠道" width="110" />
          <el-table-column label="场景" min-width="130"><template #default="{ row }">{{ sceneOptions.find((item) => item[0] === row.scene)?.[1] || row.scene || "-" }}</template></el-table-column>
          <el-table-column label="版本" width="80"><template #default="{ row }">v{{ row.version || 1 }}</template></el-table-column>
          <el-table-column label="审核" width="100"><template #default="{ row }"><el-tag :type="row.approvalStatus === 'approved' ? 'success' : row.approvalStatus === 'rejected' ? 'danger' : 'info'">{{ row.approvalStatus || "draft" }}</el-tag></template></el-table-column>
          <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
          <el-table-column label="启用" width="90">
            <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "是" : "否" }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <el-button v-if="canEditTemplate(row)" size="small" @click="editTemplate(row)">编辑</el-button>
              <el-button v-else-if="canManageTemplates" size="small" @click="copyTemplate(row)">复制</el-button>
              <el-button size="small" @click="showTemplateVersions(row)">版本</el-button>
              <el-button v-if="canSend" size="small" type="primary" plain :loading="actionKey === `test:${row.id}`" @click="testTemplate(row)">测试</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="table-card records">
      <h3>活动提醒规则</h3>
      <el-empty v-if="!schedules.length" description="暂无活动提醒规则">
        <el-button v-if="canManageTemplates" :icon="Plus" @click="createSchedule">新增提醒规则</el-button>
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
        <el-table-column v-if="canManageTemplates" label="操作" width="100">
          <template #default="{ row }"><el-button size="small" @click="editSchedule(row)">编辑</el-button></template>
        </el-table-column>
      </el-table>
    </div>

    <div class="table-card records">
      <div class="preference-head"><div><h3>会员通知偏好</h3><p>退订只作用于当前平台或商家及指定渠道，发送时会保留抑制记录。</p></div></div>
      <el-form v-if="canManagePreferences" inline>
        <el-form-item label="会员 ID"><el-input-number v-model="preferenceForm.userId" :min="1" /></el-form-item>
        <el-form-item label="渠道"><el-select v-model="preferenceForm.channel" style="width: 130px"><el-option label="站内通知" value="site" /><el-option label="短信" value="sms" /><el-option label="微信" value="wechat" /><el-option label="邮件" value="email" /></el-select></el-form-item>
        <el-form-item label="状态"><el-switch v-model="preferenceForm.subscribed" active-text="订阅" inactive-text="退订" /></el-form-item>
        <el-form-item label="原因"><el-input v-model="preferenceForm.reason" style="width: 240px" /></el-form-item>
        <el-button type="primary" :loading="actionKey.startsWith('preference:')" :disabled="Boolean(actionKey)" @click="savePreference">保存偏好</el-button>
      </el-form>
      <el-table v-if="preferences.length" :data="preferences" size="small" max-height="260">
        <el-table-column label="会员 ID" width="105"><template #default="{ row }">{{ userIdLabel(row) }}</template></el-table-column>
        <el-table-column label="会员" min-width="160"><template #default="{ row }">{{ displayUser(row, `ID ${row.user?.id || "-"}`) }}</template></el-table-column>
        <el-table-column prop="channel" label="渠道" width="100" />
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.subscribed ? 'success' : 'warning'">{{ row.subscribed ? "订阅" : "退订" }}</el-tag></template></el-table-column>
        <el-table-column prop="reason" label="原因" min-width="180" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
      </el-table>
      <el-pagination v-if="preferenceTotal > preferencePageSize" class="records-pagination" layout="prev, pager, next, total" :current-page="preferencePage" :page-size="preferencePageSize" :total="preferenceTotal" @current-change="changePreferencePage" />
    </div>

    <div class="table-card records">
      <div class="records-head"><h3>发送记录</h3><div class="record-filters">
        <el-select v-model="notificationFilters.status" clearable placeholder="全部状态"><el-option label="待发送" value="pending" /><el-option label="已发送" value="sent" /><el-option label="失败" value="failed" /><el-option label="已抑制" value="suppressed" /></el-select>
        <el-select v-model="notificationFilters.channel" clearable placeholder="全部渠道"><el-option label="站内" value="site" /><el-option label="短信" value="sms" /><el-option label="微信" value="wechat" /><el-option label="邮件" value="email" /></el-select>
        <el-select v-model="notificationFilters.scene" clearable filterable placeholder="全部场景"><el-option v-for="item in sceneOptions" :key="item[0]" :label="item[1]" :value="item[0]" /></el-select>
        <el-input v-model="notificationFilters.keyword" clearable placeholder="标题、用户或备注" @keyup.enter="applyNotificationFilters" />
        <el-button type="primary" @click="applyNotificationFilters">筛选</el-button>
      </div></div>
      <el-empty v-if="!notifications.length" description="暂无发送记录" />
      <el-table v-else :data="notifications" stripe>
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="channel" label="渠道" width="110" />
        <el-table-column label="场景" min-width="120"><template #default="{ row }">{{ sceneOptions.find((item) => item[0] === row.scene)?.[1] || row.scene || "-" }}</template></el-table-column>
        <el-table-column label="活动" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.activity?.title || "-" }}</template>
        </el-table-column>
        <el-table-column label="会员 ID" width="105"><template #default="{ row }">{{ userIdLabel(row) }}</template></el-table-column>
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">{{ displayUser(row) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column prop="provider" label="服务商" width="130" />
        <el-table-column v-if="canViewSensitive" prop="providerMessageId" label="服务商消息号" min-width="180" show-overflow-tooltip />
        <el-table-column prop="retryCount" label="重试" width="80" />
        <el-table-column v-if="canViewSensitive" prop="errorMessage" label="错误" min-width="180" show-overflow-tooltip />
        <el-table-column prop="suppressedReason" label="抑制原因" min-width="180" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="发送时间" width="180" />
        <el-table-column v-if="canSend" label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" :loading="actionKey === `notification:retry:${row.id}`" :disabled="row.status !== 'failed' || Boolean(actionKey)" @click="retryNotification(row)">重试</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-if="notificationTotal > notificationPageSize" class="records-pagination" layout="prev, pager, next, total" :current-page="notificationPage" :page-size="notificationPageSize" :total="notificationTotal" @current-change="changeNotificationPage" />
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
        <el-form-item label="业务场景"><el-select v-model="templateForm.scene" clearable filterable><el-option v-for="item in sceneOptions" :key="item[0]" :label="item[1]" :value="item[0]" /></el-select></el-form-item>
        <el-form-item label="标题"><el-input v-model="templateForm.title" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="templateForm.content" type="textarea" :rows="6" /></el-form-item>
        <template v-if="templateForm.channel === 'wechat'">
          <el-form-item label="微信模板 ID"><el-input v-model="templateForm.providerTemplateId" placeholder="微信公众平台审核后的模板 ID" /></el-form-item>
          <el-form-item label="审核状态"><el-select v-model="templateForm.approvalStatus"><el-option label="草稿" value="draft" /><el-option label="审核中" value="pending" /><el-option label="已通过" value="approved" /><el-option label="已拒绝" value="rejected" /><el-option label="已停用" value="retired" /></el-select></el-form-item>
          <el-form-item label="字段映射"><el-input v-model="templateForm.dataKeysText" type="textarea" :rows="5" placeholder='例如 {"activityTitle":"thing1","startTime":"time2"}' /></el-form-item>
          <el-form-item label="小程序落地页"><el-input v-model="templateForm.page" placeholder="pages/activity/detail" /></el-form-item>
        </template>
        <el-form-item><el-checkbox v-model="templateForm.enabled">启用</el-checkbox></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawer = false">取消</el-button>
        <el-button type="primary" :loading="actionKey.startsWith('template:')" :disabled="Boolean(actionKey)" @click="saveTemplate">保存</el-button>
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
        <el-button type="primary" :loading="actionKey.startsWith('schedule:')" :disabled="Boolean(actionKey)" @click="saveSchedule">保存</el-button>
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

    <el-drawer v-model="versionsDrawer" title="模板版本历史" size="640px">
      <el-table :data="templateVersions?.versions || []" stripe>
        <el-table-column label="版本" width="80"><template #default="{ row }">v{{ row.version }}</template></el-table-column>
        <el-table-column prop="changedAt" label="变更时间" width="180" />
        <el-table-column prop="changedBy" label="变更人" width="130" />
        <el-table-column prop="approvalStatus" label="审核" width="100" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
      </el-table>
    </el-drawer>
  </div>
</template>

<style scoped>
.toolbar-actions, .action-row, .tips { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tips { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.page-hint { margin-bottom: 16px; }
.permission-alert { margin-bottom: 12px; }
.tips span { color: #667085; font-size: 13px; }
.field-tip { display: block; margin-top: 6px; color: #667085; line-height: 1.5; }
.provider-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.monitor-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.monitor-item { min-height: 86px; display: grid; gap: 8px; align-content: center; padding: 14px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
.monitor-item span { color: #667085; font-size: 13px; }.monitor-item strong { font-size: 24px; }.monitor-item.danger strong { color: #b42318; }.monitor-item.warning strong { color: #b54708; }
.provider { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; display: grid; gap: 6px; min-height: 118px; }
.provider span, .provider small { color: #667085; font-size: 12px; }
.provider strong { font-size: 15px; overflow-wrap: anywhere; }
.grid { display: grid; grid-template-columns: minmax(360px, 0.9fr) minmax(520px, 1.1fr); gap: 16px; align-items: start; }
.grid.single-column { grid-template-columns: minmax(0, 1fr); }
.records { margin-top: 16px; }
.records-pagination { justify-content: flex-end; margin-top: 14px; }
.preview-title { margin-top: 18px; }
.preference-head p { margin: -8px 0 14px; color: #667085; font-size: 13px; }
.records-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }.record-filters { display: grid; grid-template-columns: repeat(3, 130px) minmax(180px, 1fr) auto; gap: 8px; }
h3 { margin: 0 0 16px; }
@media (max-width: 1100px) { .grid, .provider-grid, .monitor-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.records-head { display: grid; }.record-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 720px) {
  .page, .toolbar, .toolbar-actions, .table-card, .grid, .provider-grid, .monitor-grid { min-width: 0; }
  .monitor-grid, .record-filters { grid-template-columns: 1fr; }
  .toolbar { align-items: flex-start; flex-direction: column; gap: 10px; }
  .toolbar-actions, .action-row { align-items: stretch; flex-direction: column; width: 100%; }
  .toolbar-actions .el-button, .action-row .el-button { margin-left: 0; width: 100%; }
  .table-card { overflow: hidden; }
  .table-card :deep(.el-table) { max-width: 100%; }
  .table-card :deep(.el-form--inline) { display: grid; grid-template-columns: minmax(0, 1fr); width: 100%; }
  .table-card :deep(.el-form--inline .el-form-item), .table-card :deep(.el-form--inline .el-select), .table-card :deep(.el-form--inline .el-input-number), .table-card :deep(.el-form--inline .el-input) { margin-right: 0; min-width: 0; width: 100% !important; }
  .table-card :deep(.el-form--inline > .el-button) { margin-left: 0; width: 100%; }
  .records-pagination { justify-content: flex-start; overflow-x: auto; }
}
</style>
