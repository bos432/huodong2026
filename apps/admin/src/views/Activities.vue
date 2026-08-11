<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowDown, ArrowUp, Check, Clock, Close, CopyDocument, Delete, Edit, Grid, Hide, MoreFilled, Picture, Plus, Upload, UploadFilled, View } from "@element-plus/icons-vue";
import { ActivityStatus, FieldType, checkActivityContentCompliance } from "@activity/shared";
import { api } from "../api";
import ActivityPosterDialog from "../components/ActivityPosterDialog.vue";
import H5QrDialog from "../components/H5QrDialog.vue";
import MarkdownContentEditor from "../components/MarkdownContentEditor.vue";
import { activityTemplates, type ActivityTemplate } from "../activity-templates";
import { activityH5PreviewUrl, copyToClipboard } from "../h5-preview";
import { canAccess, currentTenantCode, currentTenantSettings, isPlatformAdmin } from "../permissions";

const activityStatusText: Record<ActivityStatus, string> = {
  [ActivityStatus.Draft]: "草稿",
  [ActivityStatus.PendingApproval]: "待平台审核",
  [ActivityStatus.Rejected]: "已驳回",
  [ActivityStatus.Open]: "报名中",
  [ActivityStatus.Closed]: "已下架",
  [ActivityStatus.Cancelled]: "已取消",
  [ActivityStatus.Ended]: "已结束"
};

const route = useRoute();
const rows = ref<any[]>([]);
const statusCounts = ref<Record<string, number>>({});
const categories = ref<any[]>([]);
const agents = ref<any[]>([]);
const tenants = ref<any[]>([]);
const memberLevels = ref<any[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const metaErrorMessage = ref("");
const drawer = ref(false);
const templateDialogVisible = ref(false);
const activityEditorReturnFocus = ref<HTMLElement | null>(null);
const saving = ref(false);
const activityActionKey = ref("");
const editingId = ref<number | null>(null);
const versionsDrawer = ref(false);
const versionsLoading = ref(false);
const versionsErrorMessage = ref("");
const activityVersions = ref<any[]>([]);
const versionsActivity = ref<any | null>(null);
let draftTimer: ReturnType<typeof setTimeout> | null = null;
const approvalDrawer = ref(false);
const approvalLoading = ref(false);
const approvalErrorMessage = ref("");
const approvalLogs = ref<any[]>([]);
const approvalActivity = ref<any | null>(null);
const h5QrDialogVisible = ref(false);
const h5QrActivity = ref<any | null>(null);
const posterDialogVisible = ref(false);
const posterActivity = ref<any | null>(null);
const channelDrawer = ref(false);
const channelActivity = ref<any | null>(null);
const channelLoading = ref(false);
const channelSaving = ref(false);
const channelErrorMessage = ref("");
const channels = ref<any[]>([]);
const channelReport = ref<any[]>([]);
const channelForm = reactive({ name: "", code: "", source: "", remark: "" });
const form = reactive<any>(defaultForm());
const activityFormSteps = [
  { name: "base", label: "基础信息" },
  { name: "fields", label: "报名字段" },
  { name: "hosts", label: "主理人" },
  { name: "sections", label: "详情模块" },
  { name: "rules", label: "报名规则" }
];
const activeActivityStep = ref(activityFormSteps[0].name);
const activeActivityStepIndex = computed(() => Math.max(activityFormSteps.findIndex((item) => item.name === activeActivityStep.value), 0));
const routeStatus = () => {
  const status = typeof route.query.status === "string" ? route.query.status : "";
  if (status === "all") return "";
  return Object.values(ActivityStatus).includes(status as ActivityStatus) ? (status as ActivityStatus) : "";
};
const routeTenantId = () => {
  const tenantId = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : undefined;
  return isPlatformAdmin() && tenantId && Number.isFinite(tenantId) ? tenantId : undefined;
};
const routeActivityId = () => {
  const activityId = typeof route.query.activityId === "string" ? Number(route.query.activityId) : undefined;
  return activityId && Number.isFinite(activityId) ? activityId : undefined;
};
const filters = reactive({
  keyword: "",
  status: routeActivityId() ? "" : (routeStatus() as ActivityStatus | ""),
  categoryId: undefined as number | undefined,
  tenantId: routeTenantId() as number | undefined
});
const routeFocusedActivityId = ref<number | undefined>(routeActivityId());
const activeStatusFilter = computed(() => filters.status);
const pageTitle = computed(() => (isPlatformAdmin() && filters.status === ActivityStatus.PendingApproval ? "活动审核" : isPlatformAdmin() ? "全部活动" : "活动管理"));
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});
const activityTenantSettings = computed(() => {
  if (!isPlatformAdmin()) return currentTenantSettings();
  const tenantId = Number(form.tenantId || form.tenant?.id || 0);
  const tenant = tenants.value.find((item) => item.id === tenantId) || form.tenant;
  return tenant?.settings || currentTenantSettings();
});
const registrationReviewEnabled = computed(() => activityTenantSettings.value.registrationReviewEnabled !== false);
const registrationReviewDisabledReason = computed(() =>
  registrationReviewEnabled.value ? "" : "平台未开通本商家的报名审核权限，活动报名将自动通过或进入付款流程。"
);
const canOperateActivities = computed(() => canAccess(["activity.manage"]));
const formTenantId = computed(() => Number(form.tenantId || form.tenant?.id || 0));
const formMemberLevels = computed(() => {
  if (!isPlatformAdmin()) return memberLevels.value;
  const tenantId = formTenantId.value;
  return memberLevels.value.filter((level) => tenantId ? Number(level.tenantId || 0) === tenantId : !level.tenantId);
});
watch(formTenantId, () => {
  const allowed = new Set(formMemberLevels.value.map((level) => Number(level.id)));
  if (form.minMemberLevelId && !allowed.has(Number(form.minMemberLevelId))) form.minMemberLevelId = undefined;
  if (form.priorityMemberLevelId && !allowed.has(Number(form.priorityMemberLevelId))) form.priorityMemberLevelId = undefined;
});
const formCategories = computed(() => {
  const tenantId = formTenantId.value;
  return categories.value.filter((item) => {
    const optionTenantId = Number(item.tenant?.id || 0);
    return tenantId ? !optionTenantId || optionTenantId === tenantId : !optionTenantId;
  });
});
const formAgents = computed(() => {
  const tenantId = formTenantId.value;
  return agents.value.filter((item) => {
    const optionTenantId = Number(item.tenant?.id || 0);
    return tenantId ? !optionTenantId || optionTenantId === tenantId : !optionTenantId;
  });
});
const h5QrUrl = computed(() => (h5QrActivity.value ? activityPreviewUrl(h5QrActivity.value) : ""));
const h5QrScopeName = computed(() => (h5QrActivity.value ? `活动：${h5QrActivity.value.title || h5QrActivity.value.id}` : "活动 H5"));
const posterUrl = computed(() => (posterActivity.value ? activityPreviewUrl(posterActivity.value) : ""));
const posterTenantName = computed(() => (posterActivity.value ? tenantDisplayName(posterActivity.value) : ""));
const activityComplianceResult = computed(() =>
  checkActivityContentCompliance({
    title: form.title,
    description: form.description,
    notice: form.notice,
    sections: form.sections
  })
);
const activityComplianceIssues = computed(() => activityComplianceResult.value.issues);
const activityComplianceBlockingIssues = computed(() => activityComplianceResult.value.blockingIssues);
const activityComplianceWarningIssues = computed(() => activityComplianceResult.value.warningIssues);
const activityComplianceAlertType = computed(() => (activityComplianceBlockingIssues.value.length ? "error" : activityComplianceWarningIssues.value.length ? "warning" : "success"));
const activityComplianceAlertTitle = computed(() =>
  activityComplianceBlockingIssues.value.length
    ? "活动内容存在合规风险，请修改后再保存或提交审核"
    : activityComplianceWarningIssues.value.length
      ? "活动内容有需人工确认的表述，建议改成学习型、文化型表达"
      : "活动内容合规体检通过"
);

const fieldTypeText: Record<FieldType, string> = {
  [FieldType.Text]: "文本",
  [FieldType.SingleChoice]: "单选",
  [FieldType.MultipleChoice]: "多选",
  [FieldType.Phone]: "手机号",
  [FieldType.IdCard]: "身份证号",
  [FieldType.Remark]: "多行文本",
  [FieldType.Email]: "邮箱",
  [FieldType.Number]: "数字",
  [FieldType.Date]: "日期",
  [FieldType.DateTime]: "日期时间",
  [FieldType.Region]: "省市区",
  [FieldType.Address]: "详细地址",
  [FieldType.Attachment]: "附件"
};

const sectionTypeOptions = [
  { label: "活动亮点", value: "highlights" },
  { label: "适合人群", value: "audience" },
  { label: "活动流程", value: "agenda" },
  { label: "常见问题", value: "faq" },
  { label: "自定义", value: "custom" }
];
const activityContentTemplates = [
  {
    label: "完整活动介绍",
    content: "# 活动亮点\n\n- 你会收获什么\n- 适合哪些朋友参与\n- 现场有哪些交流安排\n\n## 适合谁\n\n- 对主题感兴趣的朋友\n- 希望认识同频伙伴的人\n- 想获得具体方法和反馈的人\n\n## 活动信息\n\n**活动时间：** 请填写\n\n**活动地点：** 请填写\n\n---\n\n期待与你现场见面。"
  },
  {
    label: "活动信息排版",
    content: "## 活动信息\n\n**活动时间：** 请填写\n\n**活动地点：** 请填写\n\n**活动主题：** 请填写\n\n## 你将收获\n\n- 收获一\n- 收获二\n- 收获三"
  }
];
const noticeContentTemplates = [
  {
    label: "通用报名须知",
    content: "## 报名须知\n\n1. 请确认报名信息无误后提交。\n2. 如需取消，请在活动开始前按平台规则操作。\n3. 活动开始前请留意站内、短信或微信通知。\n\n> 如有疑问，请联系主办方客服。"
  }
];

const statusOptions = Object.entries(activityStatusText).map(([value, label]) => ({ value, label }));
const statusSummary = computed(() =>
  statusOptions.map((item) => ({
    ...item,
    count: Number(statusCounts.value[item.value] || 0),
    active: filters.status === item.value
  }))
);
const approvalActionText: Record<string, string> = {
  create: "创建活动",
  update: "编辑活动",
  close: "下架活动",
  submit: "提交审核",
  approve: "审核通过",
  reject: "审核驳回"
};

const uploadHeaders = () => {
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function formatLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function defaultForm() {
  const now = new Date();
  const later = new Date(now.getTime() + 7 * 86400000);
  return {
    title: "",
    coverUrl: "",
    shareTitle: "",
    shareDescription: "",
    shareImageUrl: "",
    description: "",
    notice: "",
    location: "",
    locationProvince: "",
    locationCity: "",
    locationDistrict: "",
    locationLatitude: undefined,
    locationLongitude: undefined,
    locationMapUrl: "",
    groupQrCodeUrl: "",
    startTime: formatLocal(later),
    endTime: formatLocal(new Date(later.getTime() + 7200000)),
    registrationDeadline: formatLocal(new Date(later.getTime() - 86400000)),
    capacity: 30,
    price: 0,
    status: ActivityStatus.Draft,
    featured: false,
    requireReview: true,
    allowCancel: true,
    categoryId: undefined,
    agentId: undefined,
    minMemberLevelId: undefined,
    priorityMemberLevelId: undefined,
    priorityRegistrationEndsAt: "",
    fields: [
      { label: "姓名", type: FieldType.Text, required: true, sortOrder: 1, options: [] },
      { label: "手机号", type: FieldType.Phone, required: true, sortOrder: 2, options: [] },
      { label: "职业/行业", type: FieldType.Text, required: false, sortOrder: 3, options: [] },
      { label: "备注", type: FieldType.Remark, required: false, sortOrder: 4, options: [] }
    ],
    hosts: [{ name: "", title: "", avatarUrl: "", bio: "", sortOrder: 1 }],
    sections: [
      { type: "highlights", title: "活动亮点", content: "", imageUrl: "", sortOrder: 1 },
      { type: "audience", title: "适合人群", content: "", imageUrl: "", sortOrder: 2 },
      { type: "agenda", title: "活动流程", content: "", imageUrl: "", sortOrder: 3 },
      { type: "faq", title: "常见问题", content: "", imageUrl: "", sortOrder: 4 }
    ],
    eligibilityRules: { minAge: undefined, maxAge: undefined, allowedRegionsText: "", maxRegistrationsPerUser: 1, requirePrivacyConsent: true, allowCompanions: false, maxCompanions: 0, blacklistPhonesText: "" }
  };
}

function activityQueryParams() {
  const params: Record<string, unknown> = { page: pagination.page, pageSize: pagination.pageSize };
  if (filters.keyword.trim()) params.keyword = filters.keyword.trim();
  if (filters.status) params.status = filters.status;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (isPlatformAdmin() && filters.tenantId) params.tenantId = filters.tenantId;
  return params;
}

async function loadActivities() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const data = await api.get<any, any>("/admin/activities", { params: activityQueryParams() });
    rows.value = Array.isArray(data) ? data : data.items || [];
    statusCounts.value = Array.isArray(data) ? {} : data.counts || {};
    pagination.total = Array.isArray(data) ? data.length : Number(data.total || 0);
    if (!Array.isArray(data)) {
      pagination.page = Number(data.page || pagination.page);
      pagination.pageSize = Number(data.pageSize || pagination.pageSize);
    }
  } catch (error: any) {
    errorMessage.value = error.message || "加载活动失败";
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

async function loadMeta() {
  if (!canOperateActivities.value) {
    categories.value = [];
    agents.value = [];
    tenants.value = [];
    memberLevels.value = [];
    return;
  }
  metaErrorMessage.value = "";
  try {
    const options = await api.get<any, { categories: any[]; agents: any[]; memberLevels: any[]; tenants: any[] }>("/admin/activities/options");
    categories.value = options.categories || [];
    agents.value = options.agents || [];
    tenants.value = options.tenants || [];
    memberLevels.value = (options.memberLevels || []).filter((item) => item.enabled);
  } catch (error: any) {
    metaErrorMessage.value = error.message || "活动编辑选项加载失败";
  }
}

async function load() {
  await Promise.all([loadActivities(), loadMeta()]);
}

function search() {
  pagination.page = 1;
  loadActivities();
}

function setStatusFilter(status: string) {
  filters.status = filters.status === status ? "" : (status as ActivityStatus | "");
  search();
}

function resetFilters() {
  filters.keyword = "";
  filters.status = "";
  filters.categoryId = undefined;
  filters.tenantId = undefined;
  search();
}

function showPendingApproval() {
  filters.status = ActivityStatus.PendingApproval;
  search();
}

function changePage(page: number) {
  pagination.page = page;
  loadActivities();
}

function changePageSize(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  loadActivities();
}

function rememberActivityEditorTrigger(event?: Event) {
  const target = event?.currentTarget || document.activeElement;
  if (target instanceof HTMLElement) activityEditorReturnFocus.value = target;
}

function create(event?: Event) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  rememberActivityEditorTrigger(event);
  templateDialogVisible.value = false;
  editingId.value = null;
  activeActivityStep.value = activityFormSteps[0].name;
  Object.assign(form, {
    ...defaultForm(),
    requireReview: registrationReviewEnabled.value
  });
  drawer.value = true;
  void offerDraftRestore();
}

function showTemplatePicker(event?: Event) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  rememberActivityEditorTrigger(event);
  templateDialogVisible.value = true;
}

function createFromTemplate(template: ActivityTemplate) {
  const nextForm = defaultForm();
  editingId.value = null;
  activeActivityStep.value = activityFormSteps[0].name;
  Object.assign(form, {
    ...nextForm,
    title: template.title,
    capacity: template.capacity,
    fields: template.fields.map((field) => ({ ...field, options: field.options.map((option) => ({ ...option })) })),
    sections: template.sections.map((section) => ({ ...section })),
    notice: template.notice,
    eligibilityRules: { ...nextForm.eligibilityRules, ...(template.eligibilityRules || {}) },
    requireReview: registrationReviewEnabled.value
  });
  clearActivityDraft();
  templateDialogVisible.value = false;
  drawer.value = true;
  void nextTick(focusActivityEditorPanel);
  ElMessage.success(`已应用「${template.name}」模板，请补齐活动时间、地点和封面后保存`);
}

async function edit(row: any) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  if (activityActionKey.value || saving.value) return;
  activityActionKey.value = `edit:${row.id}`;
  try {
    const data = await api.get<any, any>(`/admin/activities/${row.id}`);
    openActivityEditor(data);
  } catch (error: any) {
    ElMessage.error(error.message || "加载活动详情失败");
  } finally {
    activityActionKey.value = "";
  }
}

function openActivityEditor(data: any) {
  editingId.value = data.id;
  Object.assign(form, {
    ...data,
    categoryId: data.category?.id,
    agentId: data.agent?.id,
    minMemberLevelId: data.minMemberLevel?.id,
    priorityMemberLevelId: data.priorityMemberLevel?.id,
    locationLatitude: data.locationLatitude === null || data.locationLatitude === undefined ? undefined : Number(data.locationLatitude),
    locationLongitude: data.locationLongitude === null || data.locationLongitude === undefined ? undefined : Number(data.locationLongitude),
    locationProvince: data.locationProvince || "",
    locationCity: data.locationCity || "",
    locationDistrict: data.locationDistrict || "",
    locationMapUrl: data.locationMapUrl || "",
    groupQrCodeUrl: data.groupQrCodeUrl || "",
    shareTitle: data.shareTitle || "",
    shareDescription: data.shareDescription || "",
    shareImageUrl: data.shareImageUrl || "",
    priorityRegistrationEndsAt: data.priorityRegistrationEndsAt?.slice(0, 19).replace("T", " ") || "",
    price: Number(data.price),
    startTime: data.startTime?.slice(0, 19).replace("T", " "),
    endTime: data.endTime?.slice(0, 19).replace("T", " "),
    registrationDeadline: data.registrationDeadline?.slice(0, 19).replace("T", " "),
    fields: data.fields?.length ? data.fields.map(normalizeActivityField) : defaultForm().fields,
    hosts: data.hosts?.length ? data.hosts : [{ name: "", title: "", avatarUrl: "", bio: "", sortOrder: 1 }],
    sections: data.sections?.length ? data.sections.map((section: any) => ({ ...section, imageUrl: section.imageUrl || "" })) : defaultForm().sections
    , eligibilityRules: { ...defaultForm().eligibilityRules, ...(data.eligibilityRules || {}), allowedRegionsText: (data.eligibilityRules?.allowedRegions || []).join("、"), blacklistPhonesText: (data.eligibilityRules?.blacklistPhones || []).join("\n") }
  });
  if (!registrationReviewEnabled.value) form.requireReview = false;
  activeActivityStep.value = activityFormSteps[0].name;
  drawer.value = true;
  void offerDraftRestore();
}

function activityDraftKey() {
  const tenantId = Number(form.tenantId || form.tenant?.id || filters.tenantId || 0);
  return `activity-editor-draft:${tenantId}:${editingId.value || "new"}`;
}

async function offerDraftRestore() {
  const raw = localStorage.getItem(activityDraftKey());
  if (!raw) {
    await nextTick();
    focusActivityEditorPanel();
    return;
  }
  try {
    const draft = JSON.parse(raw);
    await ElMessageBox.confirm(`发现 ${formatTime(draft.savedAt)} 自动保存的未提交草稿，是否恢复？`, "恢复活动草稿", { confirmButtonText: "恢复", cancelButtonText: "忽略" });
    Object.assign(form, draft.form || {});
    activeActivityStep.value = draft.step || activityFormSteps[0].name;
    ElMessage.success("已恢复自动保存草稿");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") localStorage.removeItem(activityDraftKey());
  } finally {
    focusActivityEditorAfterMessageBox();
  }
}

function visibleActivityEditorPanel() {
  return [...document.querySelectorAll<HTMLElement>(".activity-editor-drawer")].find((element) => element.getBoundingClientRect().width > 0);
}

function focusActivityEditorPanel() {
  const panel = visibleActivityEditorPanel();
  if (!panel) return;
  (panel.querySelector<HTMLElement>(".el-drawer__close-btn") || panel).focus({ preventScroll: true });
}

function focusActivityEditorAfterMessageBox() {
  const messageBoxVisible = () => [...document.querySelectorAll<HTMLElement>(".el-overlay-message-box")].some((element) => element.getBoundingClientRect().width > 0);
  if (!messageBoxVisible()) {
    void nextTick(focusActivityEditorPanel);
    return;
  }
  const observer = new MutationObserver(() => {
    if (messageBoxVisible()) return;
    observer.disconnect();
    window.clearTimeout(timeoutId);
    void nextTick(focusActivityEditorPanel);
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  const timeoutId = window.setTimeout(() => {
    observer.disconnect();
    focusActivityEditorPanel();
  }, 1200);
}

function restoreActivityEditorFocus() {
  const target = activityEditorReturnFocus.value;
  activityEditorReturnFocus.value = null;
  void nextTick(() => {
    if (target?.isConnected) target.focus({ preventScroll: true });
    else document.querySelector<HTMLElement>("main.el-main")?.focus({ preventScroll: true });
  });
}

function clearActivityDraft() {
  localStorage.removeItem(activityDraftKey());
}

async function copyActivity(row: any) {
  await runActivityRowAction(row, "copy", async () => {
    await ElMessageBox.confirm(`确认复制活动「${row.title}」为新草稿？`, "复制活动", { type: "info", confirmButtonText: "确认复制", cancelButtonText: "取消" });
    const copied = await api.post<any, any>(`/admin/activities/${row.id}/copy`);
    openActivityEditor(copied);
  }, "活动副本已创建", "复制活动失败");
}

async function loadActivityVersions(row: any) {
  versionsActivity.value = row;
  versionsDrawer.value = true;
  versionsLoading.value = true;
  versionsErrorMessage.value = "";
  activityVersions.value = [];
  try {
    activityVersions.value = await api.get<any, any[]>(`/admin/activities/${row.id}/versions`);
  } catch (error: any) {
    versionsErrorMessage.value = error.message || "加载活动版本失败";
  } finally {
    versionsLoading.value = false;
  }
}

async function restoreActivityVersion(version: any) {
  if (!versionsActivity.value) return;
  const activity = versionsActivity.value;
  await runActivityRowAction(activity, `restore-version-${version.id}`, async () => {
    await ElMessageBox.confirm(`确认恢复 V${version.versionNo}？活动将回到草稿状态并生成一个新版本。`, "恢复历史版本", { type: "warning", confirmButtonText: "确认恢复", cancelButtonText: "取消" });
    const restored = await api.post<any, any>(`/admin/activities/${activity.id}/versions/${version.id}/restore`);
    versionsDrawer.value = false;
    openActivityEditor(restored);
  }, `已恢复 V${version.versionNo}`, "恢复活动版本失败");
}

function previousActivityStep() {
  activeActivityStep.value = activityFormSteps[Math.max(activeActivityStepIndex.value - 1, 0)].name;
}

function nextActivityStep() {
  activeActivityStep.value = activityFormSteps[Math.min(activeActivityStepIndex.value + 1, activityFormSteps.length - 1)].name;
}

async function focusRouteActivity() {
  const activityId = routeActivityId();
  routeFocusedActivityId.value = activityId;
  if (!activityId || !canOperateActivities.value || editingId.value === activityId) return;
  try {
    const data = await api.get<any, any>(`/admin/activities/${activityId}`);
    openActivityEditor(data);
    filters.keyword = "";
    filters.status = "";
    filters.categoryId = undefined;
    filters.tenantId = isPlatformAdmin() ? data.tenant?.id || filters.tenantId : filters.tenantId;
    ElMessage.success(`已定位活动：${data.title}`);
  } catch (error: any) {
    ElMessage.error(error.message || "定位活动失败");
  }
}

async function loadApprovalLogs(row: any) {
  approvalActivity.value = row;
  approvalDrawer.value = true;
  approvalLoading.value = true;
  approvalErrorMessage.value = "";
  approvalLogs.value = [];
  try {
    approvalLogs.value = await api.get<any, any[]>(`/admin/activities/${row.id}/approval-logs`);
  } catch (error: any) {
    approvalErrorMessage.value = error.message || "加载审核记录失败";
  } finally {
    approvalLoading.value = false;
  }
}

function addField() {
  form.fields.push({ label: "", type: FieldType.Text, required: false, sortOrder: form.fields.length + 1, options: [] });
  normalizeFieldSortOrders();
}

function normalizeFieldSortOrders() {
  form.fields.forEach((field: any, index: number) => {
    field.sortOrder = index + 1;
  });
}

function moveField(index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= form.fields.length) return;
  const [field] = form.fields.splice(index, 1);
  form.fields.splice(nextIndex, 0, field);
  normalizeFieldSortOrders();
}

function isChoiceField(field: any) {
  return field.type === FieldType.SingleChoice || field.type === FieldType.MultipleChoice;
}

function normalizeOption(option: any, index: number) {
  const label = typeof option === "string" ? option : String(option?.label || option?.value || "").trim();
  return {
    label,
    value: String(typeof option === "string" ? option : option?.value || label || `option_${index + 1}`)
  };
}

function normalizeActivityField(field: any, index: number) {
  const options = Array.isArray(field.options) ? field.options.map(normalizeOption).filter((option: any) => option.label) : [];
  return {
    ...field,
    label: field.label || "",
    type: field.type || FieldType.Text,
    required: Boolean(field.required),
    sortOrder: field.sortOrder || index + 1,
    options
  };
}

async function removeField(index: number) {
  if (form.fields.length <= 1) {
    ElMessage.warning("至少保留一个报名字段");
    return;
  }
  const field = form.fields[index];
  try {
    await ElMessageBox.confirm(`确认删除报名字段「${field?.label || `字段 ${index + 1}`}」？保存活动后用户端将不再展示该字段。`, "删除报名字段", { type: "warning" });
  } catch {
    return;
  }
  form.fields.splice(index, 1);
  normalizeFieldSortOrders();
  ElMessage.success("报名字段已删除，保存活动后生效");
}

function addOption(field: any) {
  field.options ||= [];
  field.options.push({ label: "", value: `option_${Date.now()}_${field.options.length + 1}` });
}

function removeOption(field: any, optionIndex: number) {
  field.options ||= [];
  if (field.options.length <= 1) {
    ElMessage.warning("至少保留一个选项；如不需要该字段，请删除报名字段");
    return;
  }
  field.options.splice(optionIndex, 1);
}

function addHost() {
  form.hosts.push({ name: "", title: "", avatarUrl: "", bio: "", sortOrder: form.hosts.length + 1 });
}

function addSection() {
  form.sections.push({ type: "custom", title: "", content: "", imageUrl: "", sortOrder: form.sections.length + 1 });
  normalizeSectionSortOrders();
}

function normalizeSectionSortOrders() {
  form.sections
    .slice()
    .sort((a: any, b: any) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .forEach((section: any, index: number) => {
      section.sortOrder = index + 1;
    });
}

async function removeSection(index: number) {
  const section = form.sections[index];
  try {
    await ElMessageBox.confirm(`确认删除详情模块「${section?.title || `模块 ${index + 1}`}」？保存活动后该模块会从用户端详情页移除。`, "删除详情模块", { type: "warning" });
  } catch {
    return;
  }
  form.sections.splice(index, 1);
  normalizeSectionSortOrders();
  ElMessage.success("详情模块已删除，保存活动后生效");
}

function beforeCoverUpload(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    ElMessage.error("请上传 JPG、PNG、WebP 或 GIF 图片");
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error("图片不能超过 5MB");
    return false;
  }
  return true;
}

function handleCoverSuccess(response: any) {
  const data = response?.data || response;
  if (!data?.url) return ElMessage.error("上传成功但未返回图片地址");
  form.coverUrl = data.url;
  ElMessage.success("封面已上传");
}

function handleGroupQrSuccess(response: any) {
  const data = response?.data || response;
  if (!data?.url) return ElMessage.error("上传成功但未返回图片地址");
  form.groupQrCodeUrl = data.url;
  ElMessage.success("活动群二维码已上传");
}

function handleCoverError(error: Error) {
  ElMessage.error(error.message || "图片上传失败");
}

function handleSectionImageSuccess(response: any, section: any) {
  const data = response?.data || response;
  if (!data?.url) return ElMessage.error("上传成功但未返回图片地址");
  section.imageUrl = data.url;
  ElMessage.success("模块图片已上传");
}

function sectionImageSuccessHandler(section: any) {
  return (response: any) => handleSectionImageSuccess(response, section);
}


function validateForm() {
  if (!form.title.trim()) return "请填写活动标题";
  if (!form.location.trim()) return "请填写活动地点";
  if (!form.description.trim()) return "请填写活动介绍";
  if (activityComplianceBlockingIssues.value.length) return activityComplianceBlockingIssues.value.map((issue) => issue.message).join("；");
  const hasLat = form.locationLatitude !== undefined && form.locationLatitude !== null && form.locationLatitude !== "";
  const hasLng = form.locationLongitude !== undefined && form.locationLongitude !== null && form.locationLongitude !== "";
  if (hasLat !== hasLng) return "请同时填写地图纬度和经度";
  if (hasLat && (Number(form.locationLatitude) < -90 || Number(form.locationLatitude) > 90)) return "地图纬度必须在 -90 到 90 之间";
  if (hasLng && (Number(form.locationLongitude) < -180 || Number(form.locationLongitude) > 180)) return "地图经度必须在 -180 到 180 之间";
  if (!form.fields.length) return "至少需要一个报名字段";
  if (form.fields.some((field: any) => !field.label.trim())) return "报名字段名称不能为空";
  if (form.fields.some((field: any) => [FieldType.SingleChoice, FieldType.MultipleChoice].includes(field.type) && !field.options?.some((option: any) => option.label?.trim()))) return "单选/多选字段至少需要一个选项";
  if (new Date(form.endTime) <= new Date(form.startTime)) return "结束时间必须晚于开始时间";
  if (new Date(form.registrationDeadline) >= new Date(form.startTime)) return "报名截止时间必须早于活动开始时间";
  if (form.priorityMemberLevelId && !form.priorityRegistrationEndsAt) return "请设置优先报名截止时间";
  if (!form.priorityMemberLevelId && form.priorityRegistrationEndsAt) return "请先选择优先报名会员等级";
  if (form.priorityRegistrationEndsAt && new Date(form.priorityRegistrationEndsAt) >= new Date(form.registrationDeadline)) return "优先报名截止时间必须早于报名截止时间";
  if (form.sections.some((section: any) => !section.title.trim() || !section.content.trim())) return "详情模块标题和内容不能为空";
  if (form.eligibilityRules?.minAge && form.eligibilityRules?.maxAge && Number(form.eligibilityRules.minAge) > Number(form.eligibilityRules.maxAge)) return "最低年龄不能大于最高年龄";
  return "";
}

function optionalNumber(value: unknown) {
  const number = Number(value || 0);
  return number > 0 && Number.isFinite(number) ? number : undefined;
}

function cleanPayload() {
  const tenantId = optionalNumber(form.tenantId || form.tenant?.id || filters.tenantId);
  return {
    tenantId,
    title: form.title.trim(),
    coverUrl: form.coverUrl?.trim() || undefined,
    shareTitle: form.shareTitle?.trim() || undefined,
    shareDescription: form.shareDescription?.trim() || undefined,
    shareImageUrl: form.shareImageUrl?.trim() || undefined,
    description: form.description.trim(),
    notice: form.notice?.trim() || undefined,
    location: form.location.trim(),
    locationProvince: form.locationProvince?.trim() || undefined,
    locationCity: form.locationCity?.trim() || undefined,
    locationDistrict: form.locationDistrict?.trim() || undefined,
    requireReview: registrationReviewEnabled.value ? form.requireReview : false,
    featured: Boolean(form.featured),
    allowCancel: Boolean(form.allowCancel),
    status: form.status,
    startTime: form.startTime,
    endTime: form.endTime,
    registrationDeadline: form.registrationDeadline,
    capacity: Number(form.capacity),
    categoryId: optionalNumber(form.categoryId),
    agentId: optionalNumber(form.agentId),
    minMemberLevelId: optionalNumber(form.minMemberLevelId),
    priorityMemberLevelId: optionalNumber(form.priorityMemberLevelId),
    locationLatitude: form.locationLatitude === "" || form.locationLatitude === null || form.locationLatitude === undefined ? undefined : Number(form.locationLatitude),
    locationLongitude: form.locationLongitude === "" || form.locationLongitude === null || form.locationLongitude === undefined ? undefined : Number(form.locationLongitude),
    locationMapUrl: form.locationMapUrl?.trim() || undefined,
    groupQrCodeUrl: form.groupQrCodeUrl?.trim() || undefined,
    priorityRegistrationEndsAt: form.priorityRegistrationEndsAt || undefined,
    price: Number(form.price),
    fields: form.fields.map((field: any, index: number) => ({
      label: field.label.trim(),
      type: field.type,
      required: Boolean(field.required),
      sortOrder: field.sortOrder || index + 1,
      options: isChoiceField(field)
        ? (field.options || [])
            .map((option: any, optionIndex: number) => normalizeOption(option, optionIndex))
            .filter((option: any) => option.label)
            .map((option: any, optionIndex: number) => ({ label: option.label, value: option.value || `option_${index + 1}_${optionIndex + 1}` }))
        : []
    })),
    hosts: form.hosts.filter((host: any) => host.name?.trim()).map((host: any, index: number) => ({
      name: host.name.trim(),
      title: host.title?.trim() || undefined,
      avatarUrl: host.avatarUrl?.trim() || undefined,
      bio: host.bio?.trim() || undefined,
      sortOrder: host.sortOrder || index + 1
    })),
    sections: form.sections
      .filter((section: any) => section.title?.trim() && section.content?.trim())
      .sort((a: any, b: any) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .map((section: any, index: number) => ({
        type: section.type,
        title: section.title.trim(),
        content: section.content.trim(),
        imageUrl: section.imageUrl?.trim() || undefined,
        sortOrder: index + 1
      })),
    eligibilityRules: {
      minAge: optionalNumber(form.eligibilityRules?.minAge),
      maxAge: optionalNumber(form.eligibilityRules?.maxAge),
      allowedRegions: String(form.eligibilityRules?.allowedRegionsText || "").split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean),
      maxRegistrationsPerUser: optionalNumber(form.eligibilityRules?.maxRegistrationsPerUser),
      requirePrivacyConsent: Boolean(form.eligibilityRules?.requirePrivacyConsent),
      allowCompanions: Boolean(form.eligibilityRules?.allowCompanions),
      maxCompanions: form.eligibilityRules?.allowCompanions ? Number(form.eligibilityRules?.maxCompanions || 1) : 0,
      blacklistPhones: String(form.eligibilityRules?.blacklistPhonesText || "").split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean)
    }
  };
}

async function submit() {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  if (saving.value || activityActionKey.value) return;
  const error = validateForm();
  if (error) {
    ElMessage.warning(error);
    return;
  }
  saving.value = true;
  try {
    const payload = cleanPayload();
    if (editingId.value) await api.patch(`/admin/activities/${editingId.value}`, payload);
    else await api.post("/admin/activities", payload);
    clearActivityDraft();
    ElMessage.success("活动已保存");
    drawer.value = false;
    await loadActivities();
  } catch (error: any) {
    ElMessage.error(error.message || "保存活动失败");
  } finally {
    saving.value = false;
  }
}

async function closeActivity(row: any) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  await runActivityRowAction(row, "close", async () => {
    await ElMessageBox.confirm(`确认下架活动「${row.title}」？下架后用户端将不再展示。`, "下架活动", { type: "warning", confirmButtonText: "确认下架", cancelButtonText: "取消" });
    await api.post(`/admin/activities/${row.id}/close`);
  }, "活动已下架", "下架活动失败");
}

async function submitApproval(row: any) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  await runActivityRowAction(row, "submit-approval", async () => {
    await ElMessageBox.confirm(`确认提交活动「${row.title}」审核？提交后需撤回或等待平台处理才能继续修改。`, "提交活动审核", { type: "info", confirmButtonText: "确认提交", cancelButtonText: "取消" });
    await api.post(`/admin/activities/${row.id}/submit-approval`);
  }, "活动已提交平台审核", "提交活动审核失败");
}

async function approveActivity(row: any) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  await runActivityRowAction(row, "approve", async () => {
    await ElMessageBox.confirm(`确认通过活动「${row.title}」？通过后用户端可公开报名。`, "通过活动审核", { type: "warning", confirmButtonText: "通过", cancelButtonText: "取消" });
    await api.post(`/admin/activities/${row.id}/approve`, {});
  }, "活动已通过审核", "活动审核失败");
}

async function rejectActivity(row: any) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  await runActivityRowAction(row, "reject", async () => {
    const { value } = await ElMessageBox.prompt(`请输入驳回「${row.title}」的原因`, "驳回活动", { inputType: "textarea", confirmButtonText: "确认驳回", cancelButtonText: "取消", inputValidator: (input) => Boolean(String(input || "").trim()) || "请填写驳回原因" });
    await api.post(`/admin/activities/${row.id}/reject`, { remark: String(value || "").trim() });
  }, "活动已驳回", "驳回活动失败");
}

async function withdrawApproval(row: any) {
  await runActivityRowAction(row, "withdraw", async () => {
    await ElMessageBox.confirm(`确认撤回「${row.title}」的审核申请？`, "撤回审核", { type: "warning", confirmButtonText: "确认撤回", cancelButtonText: "取消" });
    await api.post(`/admin/activities/${row.id}/withdraw-approval`);
  }, "审核申请已撤回", "撤回审核失败");
}

async function reopenActivity(row: any) {
  await runActivityRowAction(row, "reopen", async () => {
    await ElMessageBox.confirm(`确认重新上架「${row.title}」？`, "重新上架", { type: "warning", confirmButtonText: "确认上架", cancelButtonText: "取消" });
    await api.post(`/admin/activities/${row.id}/reopen`);
  }, "活动已重新上架", "重新上架失败");
}

async function cancelActivity(row: any) {
  await runActivityRowAction(row, "cancel", async () => {
    const { value } = await ElMessageBox.prompt(`请输入取消「${row.title}」的原因。系统会取消未履约报名、关闭待支付订单，并为已支付订单创建退款申请。`, "取消活动", { inputType: "textarea", confirmButtonText: "确认取消活动", cancelButtonText: "返回", inputValidator: (input) => Boolean(String(input || "").trim()) || "请填写取消原因" });
    const result = await api.post<any, any>(`/admin/activities/${row.id}/cancel`, { reason: String(value || "").trim() });
    const summary = result?.cancellationSummary;
    if (summary) ElMessage.success(`活动已取消：取消报名 ${summary.cancelledRegistrations || 0} 条，关闭订单 ${summary.closedOrders || 0} 条，退款申请 ${summary.refundRequests || 0} 条`);
  }, "活动已取消", "取消活动失败", true);
}

async function endActivity(row: any) {
  await runActivityRowAction(row, "end", async () => {
    await ElMessageBox.confirm(`确认立即结束「${row.title}」？结束后不能继续报名。`, "结束活动", { type: "warning", confirmButtonText: "确认结束", cancelButtonText: "取消" });
    await api.post(`/admin/activities/${row.id}/end`);
  }, "活动已结束", "结束活动失败");
}

async function schedulePublish(row: any) {
  await runActivityRowAction(row, "schedule", async () => {
    const { value } = await ElMessageBox.prompt("请输入定时发布时间，例如 2026-07-20 09:00:00", "定时发布", { inputPlaceholder: "YYYY-MM-DD HH:mm:ss", confirmButtonText: "确认设置", cancelButtonText: "取消", inputValidator: (input) => validateScheduledPublishAt(String(input || ""), row) });
    await api.post(`/admin/activities/${row.id}/schedule-publish`, { publishAt: value });
  }, "定时发布已设置", "设置定时发布失败");
}

async function runActivityRowAction(row: any, action: string, operation: () => Promise<void>, successMessage: string, errorText: string, successHandled = false) {
  if (activityActionKey.value || saving.value) return;
  activityActionKey.value = `${action}:${row.id}`;
  try {
    await operation();
    if (!successHandled) ElMessage.success(successMessage);
    await loadActivities();
  } catch (error: any) {
    if (!isDialogCancel(error)) ElMessage.error(error.message || errorText);
  } finally {
    activityActionKey.value = "";
  }
}

function isDialogCancel(error: any) {
  return error === "cancel" || error === "close" || error?.message === "cancel" || error?.message === "close";
}

function validateScheduledPublishAt(input: string, row: any) {
  const at = new Date(input);
  if (!input || Number.isNaN(at.getTime())) return "请输入有效时间";
  if (at.getTime() <= Date.now()) return "定时发布时间必须晚于当前时间";
  if (row.endTime && at.getTime() >= new Date(row.endTime).getTime()) return "定时发布时间必须早于活动结束时间";
  return true;
}

function isRowBusy(row: any) {
  return activityActionKey.value.endsWith(`:${row.id}`);
}

function canSubmitApproval(row: any) {
  return canOperateActivities.value && !isPlatformAdmin() && [ActivityStatus.Draft, ActivityStatus.Rejected].includes(row.status);
}

function canApprove(row: any) {
  return canOperateActivities.value && isPlatformAdmin() && row.status === ActivityStatus.PendingApproval;
}

function primaryAction(row: any) {
  if (canApprove(row)) return { label: "审核通过", type: "success", icon: Check, handler: () => approveActivity(row) };
  if (canOperateActivities.value) return { label: row.status === ActivityStatus.PendingApproval && isPlatformAdmin() ? "审核/编辑" : "编辑", type: "primary", icon: Edit, handler: () => edit(row) };
  return null;
}

function runPrimaryAction(row: any, event: Event) {
  const action = primaryAction(row);
  if (!action) return;
  if (action.label.includes("编辑")) rememberActivityEditorTrigger(event);
  action.handler();
}

function tenantDisplayName(row: any) {
  return row.tenant?.name || row.tenant?.code || "平台";
}

function activityTenantCode(row: any) {
  return isPlatformAdmin() ? row.tenant?.code || "" : currentTenantCode();
}

function activityPreviewUrl(row: any) {
  return activityH5PreviewUrl(row.id, activityTenantCode(row));
}

function openActivityH5(row: any) {
  window.open(activityPreviewUrl(row), "_blank", "noopener,noreferrer");
}

async function copyActivityH5Url(row: any) {
  await copyToClipboard(activityPreviewUrl(row));
  ElMessage.success("活动 H5 链接已复制");
}

function showActivityH5Qr(row: any) {
  h5QrActivity.value = row;
  h5QrDialogVisible.value = true;
}

function showActivityPoster(row: any) {
  posterActivity.value = row;
  posterDialogVisible.value = true;
}

async function showActivityChannels(row: any) {
  channelActivity.value = row;
  Object.assign(channelForm, { name: "", code: "", source: "", remark: "" });
  channelDrawer.value = true;
  await loadActivityChannels();
}

async function loadActivityChannels() {
  if (!channelActivity.value) return;
  channelLoading.value = true;
  channelErrorMessage.value = "";
  try {
    const [channelRows, report] = await Promise.all([
      api.get<any, any[]>(`/admin/activities/${channelActivity.value.id}/channels`),
      api.get<any, any>(`/admin/activities/${channelActivity.value.id}/channel-report`)
    ]);
    channels.value = channelRows;
    channelReport.value = report.channels || [];
  } catch (error: any) {
    channels.value = [];
    channelReport.value = [];
    channelErrorMessage.value = error.message || "加载活动渠道失败";
  } finally {
    channelLoading.value = false;
  }
}

async function createChannel() {
  if (!channelActivity.value) return;
  if (channelSaving.value) return;
  if (!channelForm.name.trim()) return ElMessage.warning("请输入渠道名称");
  channelSaving.value = true;
  try {
    await api.post(`/admin/activities/${channelActivity.value.id}/channels`, {
      name: channelForm.name,
      code: channelForm.code || undefined,
      source: channelForm.source || undefined,
      remark: channelForm.remark || undefined
    });
    ElMessage.success("渠道已创建");
    Object.assign(channelForm, { name: "", code: "", source: "", remark: "" });
    await loadActivityChannels();
  } catch (error: any) {
    ElMessage.error(error.message || "创建活动渠道失败");
  } finally {
    channelSaving.value = false;
  }
}

function channelUrl(row: any) {
  if (!channelActivity.value) return "";
  const url = new URL(activityPreviewUrl(channelActivity.value), window.location.origin);
  url.searchParams.set("channelCode", row.code);
  if (row.source) url.searchParams.set("source", row.source);
  return url.toString();
}

async function copyChannelUrl(row: any) {
  await copyToClipboard(channelUrl(row));
  ElMessage.success("渠道链接已复制");
}

function approvalActionLabel(action?: string) {
  return approvalActionText[action || ""] || action || "-";
}

function approvalStatusLabel(status?: ActivityStatus | string | null) {
  if (!status) return "-";
  return activityStatusText[status as ActivityStatus] || status;
}

function money(value: string | number | undefined) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

watch(
  () => [route.query.status, route.query.tenantId, route.query.activityId],
  () => {
    const nextStatus = routeStatus();
    const nextTenantId = routeTenantId();
    const nextActivityId = routeActivityId();
    if (filters.status !== nextStatus || filters.tenantId !== nextTenantId || routeFocusedActivityId.value !== nextActivityId) {
      filters.status = nextActivityId ? "" : nextStatus;
      filters.tenantId = nextTenantId;
      search();
      focusRouteActivity();
    }
  }
);

watch(formTenantId, () => {
  if (!isPlatformAdmin()) return;
  if (form.categoryId && !formCategories.value.some((item) => item.id === form.categoryId)) form.categoryId = undefined;
  if (form.agentId && !formAgents.value.some((item) => item.id === form.agentId)) form.agentId = undefined;
});

watch([form, drawer, activeActivityStep], () => {
  if (!drawer.value) return;
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    localStorage.setItem(activityDraftKey(), JSON.stringify({ savedAt: new Date().toISOString(), step: activeActivityStep.value, form: JSON.parse(JSON.stringify(form)) }));
  }, 800);
}, { deep: true });

onMounted(async () => {
  await load();
  await focusRouteActivity();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>{{ pageTitle }}</h2>
      <div class="toolbar-actions">
        <el-button v-if="isPlatformAdmin()" :icon="Check" :disabled="Boolean(activityActionKey) || saving" @click="showPendingApproval">待审核活动</el-button>
        <el-button v-if="canOperateActivities && !isPlatformAdmin()" :disabled="Boolean(activityActionKey) || saving" @click="showTemplatePicker($event)">使用模板</el-button>
        <el-button v-if="canOperateActivities && !isPlatformAdmin()" type="primary" :icon="Plus" :disabled="Boolean(activityActionKey) || saving" @click="create($event)">新建活动</el-button>
      </div>
    </div>

    <div class="table-card">
      <el-alert
        v-if="isPlatformAdmin()"
        class="permission-alert"
        type="info"
        show-icon
        :closable="false"
        title="平台审核视图"
        description="全部活动默认展示所有商家活动；点击待审核活动或状态标签可筛选，并对违规活动执行通过、驳回或下架。"
      />
      <el-alert
        v-if="!canOperateActivities"
        class="permission-alert"
        type="warning"
        show-icon
        :closable="false"
        title="当前账号只能只读查看活动列表，用于现场签到核对。"
      />
      <el-alert v-if="errorMessage" class="permission-alert" type="error" show-icon :closable="false" :title="errorMessage">
        <template #default><el-button size="small" @click="loadActivities">重试</el-button></template>
      </el-alert>
      <el-alert v-if="metaErrorMessage" class="permission-alert" type="error" show-icon :closable="false" :title="metaErrorMessage">
        <template #default><el-button size="small" @click="loadMeta">重试活动选项</el-button></template>
      </el-alert>
      <div class="filter-bar">
        <el-input v-model="filters.keyword" clearable :disabled="Boolean(activityActionKey)" placeholder="搜索活动标题或地点" @keyup.enter="search" />
        <el-select v-if="canOperateActivities" v-model="filters.categoryId" clearable :disabled="Boolean(activityActionKey)" placeholder="全部分类" @change="search">
          <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
        </el-select>
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable :disabled="Boolean(activityActionKey)" placeholder="全部商家" @change="search">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.status" clearable :disabled="Boolean(activityActionKey)" placeholder="全部状态" @change="search">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" :loading="loading" :disabled="Boolean(activityActionKey)" @click="search">查询</el-button>
        <el-button :disabled="Boolean(activityActionKey)" @click="resetFilters">重置</el-button>
      </div>

      <div class="status-summary">
        <el-alert
          v-if="routeFocusedActivityId"
          class="route-focus-alert"
          type="success"
          show-icon
          :closable="false"
          title="已从复盘行动进入活动编辑"
          description="当前已自动打开对应活动，可直接优化标题、封面、讲师介绍、活动流程和报名说明。"
        />
        <el-tag
          v-for="item in statusSummary"
          :key="item.value"
          :type="item.active ? 'primary' : 'info'"
          effect="light"
          class="status-summary-item"
          role="button"
          tabindex="0"
          @click="setStatusFilter(item.value)"
          @keydown.enter.prevent="setStatusFilter(item.value)"
          @keydown.space.prevent="setStatusFilter(item.value)"
        >
          {{ item.label }}：{{ item.count }}
        </el-tag>
        <el-tag v-if="activeStatusFilter" class="status-summary-item" effect="plain" role="button" tabindex="0" @click="setStatusFilter('')" @keydown.enter.prevent="setStatusFilter('')" @keydown.space.prevent="setStatusFilter('')">清除状态</el-tag>
      </div>
      <el-table :data="rows" stripe empty-text="暂无活动" v-loading="loading">
        <el-table-column prop="title" label="活动" min-width="260" show-overflow-tooltip />
        <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ tenantDisplayName(row) }}</template>
        </el-table-column>
        <el-table-column label="分类" width="120"><template #default="{ row }">{{ row.category?.name || "-" }}</template></el-table-column>
        <el-table-column label="代理" min-width="150" show-overflow-tooltip><template #default="{ row }">{{ row.agent?.name || "平台自营" }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag>{{ activityStatusText[row.status as ActivityStatus] }}</el-tag></template></el-table-column>
        <el-table-column prop="registeredCount" label="已报" width="80" />
        <el-table-column prop="remainingSeats" label="余量" width="80" />
        <el-table-column label="费用" width="110"><template #default="{ row }">{{ Number(row.price) > 0 ? `¥${money(row.price)}` : "免费" }}</template></el-table-column>
        <el-table-column label="会员门槛" width="130"><template #default="{ row }">{{ row.minMemberLevel?.name || "不限" }}</template></el-table-column>
        <el-table-column label="优先报名" width="190"><template #default="{ row }">{{ row.priorityMemberLevel ? `${row.priorityMemberLevel.name} / ${formatTime(row.priorityRegistrationEndsAt)}` : "未设置" }}</template></el-table-column>
        <el-table-column label="开始时间" width="170"><template #default="{ row }">{{ formatTime(row.startTime) }}</template></el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="View" :disabled="Boolean(activityActionKey)" @click="openActivityH5(row)">预览H5</el-button>
            <el-button v-if="primaryAction(row)" size="small" :type="primaryAction(row)?.type as any" :icon="primaryAction(row)?.icon" :loading="isRowBusy(row)" :disabled="Boolean(activityActionKey) || saving" @click="runPrimaryAction(row, $event)">{{ primaryAction(row)?.label }}</el-button>
            <el-dropdown trigger="click">
              <el-button size="small" :icon="MoreFilled" :disabled="Boolean(activityActionKey) || saving">更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :icon="CopyDocument" @click="copyActivityH5Url(row)">复制链接</el-dropdown-item>
                  <el-dropdown-item :icon="Grid" @click="showActivityH5Qr(row)">二维码</el-dropdown-item>
                  <el-dropdown-item :icon="Picture" @click="showActivityPoster(row)">海报</el-dropdown-item>
                  <el-dropdown-item :icon="Grid" @click="showActivityChannels(row)">渠道</el-dropdown-item>
                  <el-dropdown-item :icon="Clock" @click="loadApprovalLogs(row)">审核记录</el-dropdown-item>
                  <el-dropdown-item v-if="canOperateActivities" :icon="CopyDocument" @click="copyActivity(row)">复制活动</el-dropdown-item>
                  <el-dropdown-item :icon="Clock" @click="loadActivityVersions(row)">版本记录</el-dropdown-item>
                  <el-dropdown-item v-if="canSubmitApproval(row)" :icon="Upload" @click="submitApproval(row)">提交审核</el-dropdown-item>
                  <el-dropdown-item v-if="canOperateActivities && row.status === ActivityStatus.PendingApproval && !isPlatformAdmin()" :icon="ArrowDown" @click="withdrawApproval(row)">撤回审核</el-dropdown-item>
                  <el-dropdown-item v-if="canOperateActivities && row.status === ActivityStatus.Closed" :icon="View" @click="reopenActivity(row)">重新上架</el-dropdown-item>
                  <el-dropdown-item v-if="canOperateActivities && [ActivityStatus.Open, ActivityStatus.Closed].includes(row.status)" :icon="Clock" @click="schedulePublish(row)">定时发布</el-dropdown-item>
                  <el-dropdown-item v-if="canOperateActivities && row.status === ActivityStatus.Open" :icon="Check" @click="endActivity(row)">结束活动</el-dropdown-item>
                  <el-dropdown-item v-if="canOperateActivities && [ActivityStatus.Open, ActivityStatus.Closed].includes(row.status)" :icon="Close" divided @click="cancelActivity(row)">取消活动</el-dropdown-item>
                  <el-dropdown-item v-if="canApprove(row)" :icon="Close" divided @click="rejectActivity(row)">驳回</el-dropdown-item>
                  <el-dropdown-item v-if="canOperateActivities && row.status === ActivityStatus.Open" :icon="Hide" divided @click="closeActivity(row)">下架</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager-row">
        <span>共 {{ pagination.total }} 个活动</span>
        <el-pagination
          background
          layout="sizes, prev, pager, next"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          @current-change="changePage"
          @size-change="changePageSize"
        />
      </div>
    </div>

    <el-dialog v-model="templateDialogVisible" class="activity-template-dialog" title="从活动模板开始" width="760px" destroy-on-close>
      <p class="activity-template-intro">模板会带入推荐的报名字段、详情模块和报名须知，不会自动发布活动；时间、地点、封面和收费仍需由主办方确认。</p>
      <div class="activity-template-grid">
        <button v-for="template in activityTemplates" :key="template.id" type="button" class="activity-template-card" @click="createFromTemplate(template)">
          <strong>{{ template.name }}</strong>
          <span>{{ template.description }}</span>
          <em>默认 {{ template.capacity }} 人</em>
        </button>
      </div>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="create()">空白新建</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="approvalDrawer" size="560px" title="审核记录">
      <div class="approval-header">
        <strong>{{ approvalActivity?.title || "-" }}</strong>
        <el-tag v-if="approvalActivity?.status">{{ activityStatusText[approvalActivity.status as ActivityStatus] }}</el-tag>
      </div>
      <el-skeleton v-if="approvalLoading" :rows="4" animated />
      <el-alert v-else-if="approvalErrorMessage" type="error" show-icon :closable="false" :title="approvalErrorMessage">
        <template #default><el-button v-if="approvalActivity" size="small" @click="loadApprovalLogs(approvalActivity)">重新加载</el-button></template>
      </el-alert>
      <el-empty v-else-if="!approvalLogs.length" description="暂无审核记录" />
      <el-timeline v-else class="approval-timeline">
        <el-timeline-item v-for="log in approvalLogs" :key="log.id" :timestamp="formatTime(log.createdAt)">
          <div class="approval-log">
            <div class="approval-log-title">
              <strong>{{ approvalActionLabel(log.action) }}</strong>
              <span>{{ approvalStatusLabel(log.fromStatus) }} -> {{ approvalStatusLabel(log.toStatus) }}</span>
            </div>
            <div class="approval-log-meta">操作人：{{ log.operator || "-" }}</div>
            <div v-if="log.remark" class="approval-log-remark">{{ log.remark }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>

    <el-drawer v-model="versionsDrawer" size="620px" title="活动版本记录">
      <div class="approval-header">
        <strong>{{ versionsActivity?.title || "-" }}</strong>
        <span>每次保存都会生成版本</span>
      </div>
      <el-skeleton v-if="versionsLoading" :rows="5" animated />
      <el-alert v-else-if="versionsErrorMessage" type="error" show-icon :closable="false" :title="versionsErrorMessage">
        <template #default><el-button v-if="versionsActivity" size="small" @click="loadActivityVersions(versionsActivity)">重新加载</el-button></template>
      </el-alert>
      <el-empty v-else-if="!activityVersions.length" description="暂无版本记录" />
      <el-table v-else :data="activityVersions" stripe>
        <el-table-column label="版本" width="90"><template #default="{ row }">V{{ row.versionNo }}</template></el-table-column>
        <el-table-column prop="source" label="来源" width="120" />
        <el-table-column prop="createdBy" label="操作人" width="130" />
        <el-table-column label="保存时间" min-width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="100"><template #default="{ row }"><el-button v-if="canOperateActivities" size="small" :loading="activityActionKey === `restore-version-${row.id}:${versionsActivity?.id}`" :disabled="Boolean(activityActionKey) || saving" @click="restoreActivityVersion(row)">恢复</el-button></template></el-table-column>
      </el-table>
    </el-drawer>

    <el-drawer v-model="channelDrawer" size="860px" title="渠道推广与转化">
      <div class="approval-header">
        <strong>{{ channelActivity?.title || "-" }}</strong>
        <el-button size="small" :loading="channelLoading" @click="loadActivityChannels">刷新</el-button>
      </div>
      <el-alert v-if="channelErrorMessage" type="error" show-icon :closable="false" :title="channelErrorMessage">
        <template #default><el-button size="small" :loading="channelLoading" @click="loadActivityChannels">重新加载渠道</el-button></template>
      </el-alert>
      <el-form v-if="canOperateActivities" class="channel-form" label-position="top">
        <el-form-item label="渠道名称">
          <el-input v-model="channelForm.name" placeholder="例如：朋友圈、社群、公众号、线下海报" />
        </el-form-item>
        <el-form-item label="渠道码">
          <el-input v-model="channelForm.code" placeholder="不填则自动生成，只能字母/数字/下划线/连字符" />
        </el-form-item>
        <el-form-item label="来源标记">
          <el-input v-model="channelForm.source" placeholder="例如 wechat_group / poster / official_account" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="channelForm.remark" placeholder="内部备注" />
        </el-form-item>
        <el-button type="primary" :loading="channelSaving" @click="createChannel">创建渠道</el-button>
      </el-form>

      <div class="table-card embedded">
        <h3>渠道链接</h3>
        <el-table :data="channels" stripe empty-text="暂无渠道" v-loading="channelLoading">
          <el-table-column prop="name" label="渠道" min-width="130" />
          <el-table-column prop="code" label="渠道码" width="130" />
          <el-table-column prop="source" label="来源" width="130" />
          <el-table-column label="链接" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">{{ channelUrl(row) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }"><el-button size="small" @click="copyChannelUrl(row)">复制</el-button></template>
          </el-table-column>
        </el-table>
      </div>

      <div class="table-card embedded">
        <h3>渠道效果</h3>
        <el-table :data="channelReport" stripe empty-text="暂无渠道转化数据" v-loading="channelLoading">
          <el-table-column prop="name" label="渠道" min-width="130" />
          <el-table-column prop="viewCount" label="浏览" width="80" />
          <el-table-column prop="registrationCount" label="报名" width="80" />
          <el-table-column prop="paidCount" label="支付" width="80" />
          <el-table-column label="报名率" width="90"><template #default="{ row }">{{ row.signupRate }}%</template></el-table-column>
          <el-table-column label="支付率" width="90"><template #default="{ row }">{{ row.paymentRate }}%</template></el-table-column>
          <el-table-column label="实收" width="110"><template #default="{ row }">¥{{ row.paidAmount }}</template></el-table-column>
        </el-table>
      </div>
    </el-drawer>

    <el-drawer v-model="drawer" class="activity-editor-drawer" size="900px" :title="editingId ? '编辑活动' : '新建活动'" @closed="restoreActivityEditorFocus">
      <el-form label-position="top">
        <el-alert
          class="compliance-alert"
          show-icon
          :closable="false"
          :type="activityComplianceAlertType"
          :title="activityComplianceAlertTitle"
        >
          <div v-if="activityComplianceIssues.length" class="compliance-issues">
            <div v-for="issue in activityComplianceIssues" :key="`${issue.severity}-${issue.field}-${issue.keyword}`">
              <strong>{{ issue.field }}</strong>
              <span>命中“{{ issue.keyword }}”</span>
              <em>{{ issue.message }}</em>
            </div>
          </div>
          <div v-else class="compliance-issues">
            <span>已按东方哲学与传统文化、教育培训效果承诺、健康养生宣传等常见风险做基础体检。</span>
          </div>
        </el-alert>
        <el-steps class="activity-wizard" :active="activeActivityStepIndex" finish-status="success" simple>
          <el-step v-for="item in activityFormSteps" :key="item.name" :title="item.label" />
        </el-steps>
        <el-tabs v-model="activeActivityStep">
          <el-tab-pane label="基础信息" name="base">
            <div class="form-grid">
              <el-form-item label="标题" required><el-input v-model="form.title" maxlength="100" show-word-limit /></el-form-item>
              <el-form-item label="分类"><el-select v-model="form.categoryId" clearable><el-option v-for="category in formCategories" :key="category.id" :label="category.name" :value="category.id" /></el-select></el-form-item>
              <el-form-item label="所属代理"><el-select v-model="form.agentId" clearable filterable placeholder="平台自营"><el-option v-for="agent in formAgents" :key="agent.id" :label="agent.name" :value="agent.id" /></el-select></el-form-item>
              <el-form-item label="会员门槛"><el-select v-model="form.minMemberLevelId" clearable><el-option v-for="level in formMemberLevels" :key="level.id" :label="level.name" :value="level.id" /></el-select></el-form-item>
              <el-form-item label="优先报名会员"><el-select v-model="form.priorityMemberLevelId" clearable><el-option v-for="level in formMemberLevels" :key="level.id" :label="level.name" :value="level.id" /></el-select></el-form-item>
              <el-form-item label="优先报名截止"><el-date-picker v-model="form.priorityRegistrationEndsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" clearable /></el-form-item>
              <el-form-item class="full" label="封面地址">
                <div class="cover-field">
                  <el-input v-model="form.coverUrl" placeholder="可填写图片 URL，也可上传本地图片" />
                  <el-upload action="/api/admin/uploads/images" name="file" :headers="uploadHeaders()" :show-file-list="false" :before-upload="beforeCoverUpload" :on-success="handleCoverSuccess" :on-error="handleCoverError">
                    <el-button :icon="UploadFilled">上传封面</el-button>
                  </el-upload>
                  <img v-if="form.coverUrl" class="cover-preview" :src="form.coverUrl" alt="活动封面预览" />
                </div>
              </el-form-item>
              <el-form-item class="full" label="分享标题"><el-input v-model="form.shareTitle" maxlength="200" show-word-limit placeholder="不填则使用活动标题" /></el-form-item>
              <el-form-item class="full" label="分享摘要"><el-input v-model="form.shareDescription" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="用于微信分享卡片和转发说明" /></el-form-item>
              <el-form-item class="full" label="分享图片"><el-input v-model="form.shareImageUrl" placeholder="不填则使用活动封面" /></el-form-item>
              <el-form-item label="地点" required><el-input v-model="form.location" placeholder="例如：城市书房 2 楼活动室" /></el-form-item>
              <el-form-item label="省/自治区"><el-input v-model="form.locationProvince" maxlength="80" placeholder="例如：浙江省" /></el-form-item>
              <el-form-item label="城市"><el-input v-model="form.locationCity" maxlength="80" placeholder="用于活动漏斗城市归因，例如：杭州市" /></el-form-item>
              <el-form-item label="区县"><el-input v-model="form.locationDistrict" maxlength="80" placeholder="例如：西湖区" /></el-form-item>
              <el-form-item label="地图纬度"><el-input-number v-model="form.locationLatitude" :min="-90" :max="90" :precision="6" controls-position="right" placeholder="例如：31.230416" /></el-form-item>
              <el-form-item label="地图经度"><el-input-number v-model="form.locationLongitude" :min="-180" :max="180" :precision="6" controls-position="right" placeholder="例如：121.473701" /></el-form-item>
              <el-form-item class="full" label="地图链接">
                <el-input v-model="form.locationMapUrl" placeholder="可填写腾讯地图、高德地图或百度地图分享链接；无经纬度时前台会显示可点击地图入口" />
              </el-form-item>
              <el-form-item class="full" label="报名成功入群二维码">
                <div class="qr-field">
                  <el-input v-model="form.groupQrCodeUrl" placeholder="报名成功后在报名详情页显示；公开活动页只显示入群提示，不直接展示二维码" />
                  <el-upload action="/api/admin/uploads/images" name="file" :headers="uploadHeaders()" :show-file-list="false" :before-upload="beforeCoverUpload" :on-success="handleGroupQrSuccess" :on-error="handleCoverError">
                    <el-button :icon="UploadFilled">上传入群二维码</el-button>
                  </el-upload>
                  <img v-if="form.groupQrCodeUrl" class="qr-preview" :src="form.groupQrCodeUrl" alt="活动群二维码预览" />
                </div>
              </el-form-item>
              <el-form-item label="开始时间" required><el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
              <el-form-item label="结束时间" required><el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
              <el-form-item label="报名截止" required><el-date-picker v-model="form.registrationDeadline" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
              <el-form-item label="名额" required><el-input-number v-model="form.capacity" :min="1" /></el-form-item>
              <el-form-item label="费用"><el-input-number v-model="form.price" :min="0" :precision="2" /></el-form-item>
              <el-form-item label="状态"><el-select v-model="form.status" disabled><el-option v-for="(text, key) in activityStatusText" :key="key" :label="text" :value="key" /></el-select></el-form-item>
              <el-alert v-if="registrationReviewDisabledReason" class="permission-alert full" type="warning" show-icon :closable="false" :title="registrationReviewDisabledReason" />
              <el-form-item class="switches">
                <el-checkbox v-model="form.featured">首页推荐</el-checkbox>
                <el-checkbox v-model="form.requireReview" :disabled="!registrationReviewEnabled">需要审核</el-checkbox>
                <el-checkbox v-model="form.allowCancel">允许取消</el-checkbox>
              </el-form-item>
              <el-form-item class="full" label="活动介绍" required>
                <MarkdownContentEditor v-model="form.description" :disabled="saving || Boolean(activityActionKey)" :templates="activityContentTemplates" placeholder="用标题、列表、加粗和图片组织活动亮点、适合人群、流程与活动信息。" />
              </el-form-item>
              <el-form-item class="full" label="报名须知">
                <MarkdownContentEditor v-model="form.notice" :disabled="saving || Boolean(activityActionKey)" :rows="6" :templates="noticeContentTemplates" placeholder="填写退款、签到、入场、交通和其他报名注意事项。" />
              </el-form-item>
            </div>
          </el-tab-pane>

          <el-tab-pane label="报名字段" name="fields">
            <div v-for="(field, index) in form.fields" :key="index" class="field-row">
              <div class="field-head">
                <strong>字段 {{ index + 1 }}</strong>
                <div class="field-actions">
                  <el-button size="small" :icon="ArrowUp" :disabled="index === 0" @click="moveField(index, -1)">上移</el-button>
                  <el-button size="small" :icon="ArrowDown" :disabled="index === form.fields.length - 1" @click="moveField(index, 1)">下移</el-button>
                  <el-button size="small" type="danger" plain :icon="Delete" @click="removeField(index)">删除字段</el-button>
                </div>
              </div>
              <div class="field-main">
                <el-input v-model="field.label" placeholder="字段名称，如：姓名 / 手机号 / 参与人数" />
                <el-select v-model="field.type"><el-option v-for="(text, value) in fieldTypeText" :key="value" :label="text" :value="value" /></el-select>
                <el-checkbox v-model="field.required">必填</el-checkbox>
                <el-tag type="info" effect="plain">排序 {{ field.sortOrder || index + 1 }}</el-tag>
                <el-button v-if="isChoiceField(field)" :icon="Plus" @click="addOption(field)">增加选项</el-button>
              </div>
              <div v-if="isChoiceField(field)" class="options">
                <div v-for="(option, optionIndex) in field.options" :key="option.value || optionIndex" class="option-row">
                  <el-input v-model="option.label" placeholder="选项名称，如：亲子 / 国学 / 书法" />
                  <el-button type="danger" plain :icon="Delete" @click="removeOption(field, optionIndex)">删除选项</el-button>
                </div>
                <el-empty v-if="!field.options?.length" class="option-empty" description="请添加至少一个选项" :image-size="48" />
              </div>
            </div>
            <el-button :icon="Plus" @click="addField">增加字段</el-button>
          </el-tab-pane>

          <el-tab-pane label="主理人" name="hosts">
            <div v-for="(host, index) in form.hosts" :key="index" class="host-row">
              <el-input v-model="host.name" placeholder="姓名" />
              <el-input v-model="host.title" placeholder="身份/头衔" />
              <el-input v-model="host.avatarUrl" placeholder="头像 URL" />
              <el-input-number v-model="host.sortOrder" :min="1" />
              <el-button :icon="Delete" circle :aria-label="`删除主理人：${host.name || index + 1}`" title="删除主理人" @click="form.hosts.splice(index, 1)" />
              <el-input v-model="host.bio" class="full" type="textarea" :rows="2" placeholder="简介" />
            </div>
            <el-button :icon="Plus" @click="addHost">增加主理人</el-button>
          </el-tab-pane>

          <el-tab-pane label="详情模块" name="sections">
            <div v-for="(section, index) in form.sections" :key="index" class="section-row">
              <el-select v-model="section.type"><el-option v-for="item in sectionTypeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
              <el-input v-model="section.title" placeholder="模块标题" />
              <el-input-number v-model="section.sortOrder" :min="1" />
              <el-button type="danger" plain :icon="Delete" @click="removeSection(index)">删除模块</el-button>
              <div class="section-image-field full">
                <el-input v-model="section.imageUrl" placeholder="模块图片 URL，可选。适合放现场照片、讲师图、流程图或活动长图" />
                <el-upload action="/api/admin/uploads/images" name="file" :headers="uploadHeaders()" :show-file-list="false" :before-upload="beforeCoverUpload" :on-success="sectionImageSuccessHandler(section)" :on-error="handleCoverError">
                  <el-button :icon="UploadFilled">上传模块图片</el-button>
                </el-upload>
                <img v-if="section.imageUrl" class="section-image-preview" :src="section.imageUrl" alt="详情模块图片预览" />
              </div>
              <div class="full">
                <MarkdownContentEditor v-model="section.content" :disabled="saving || Boolean(activityActionKey)" :rows="6" :templates="activityContentTemplates" placeholder="用标题、列表、加粗和图片说明这个详情模块。" />
              </div>
            </div>
            <el-button :icon="Plus" @click="addSection">增加模块</el-button>
          </el-tab-pane>

          <el-tab-pane label="报名规则" name="rules">
            <div class="form-grid">
              <el-form-item label="最低年龄"><el-input-number v-model="form.eligibilityRules.minAge" :min="1" :max="120" placeholder="不限" /></el-form-item>
              <el-form-item label="最高年龄"><el-input-number v-model="form.eligibilityRules.maxAge" :min="1" :max="120" placeholder="不限" /></el-form-item>
              <el-form-item label="每人报名次数"><el-input-number v-model="form.eligibilityRules.maxRegistrationsPerUser" :min="1" :precision="0" /></el-form-item>
              <el-form-item class="full" label="允许地区"><el-input v-model="form.eligibilityRules.allowedRegionsText" placeholder="多个地区用逗号分隔；留空表示不限" /></el-form-item>
              <el-form-item class="full" label="手机号黑名单"><el-input v-model="form.eligibilityRules.blacklistPhonesText" type="textarea" :rows="3" placeholder="每行一个手机号" /></el-form-item>
              <el-form-item class="full"><el-checkbox v-model="form.eligibilityRules.requirePrivacyConsent">报名时必须同意隐私授权</el-checkbox></el-form-item>
              <el-form-item class="full"><el-checkbox v-model="form.eligibilityRules.allowCompanions">允许添加同行人</el-checkbox></el-form-item>
              <el-form-item v-if="form.eligibilityRules.allowCompanions" label="同行人数上限"><el-input-number v-model="form.eligibilityRules.maxCompanions" :min="1" :max="20" :precision="0" /></el-form-item>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button :disabled="activeActivityStepIndex === 0" @click="previousActivityStep">上一步</el-button>
        <el-button :disabled="activeActivityStepIndex === activityFormSteps.length - 1" @click="nextActivityStep">下一步</el-button>
        <el-button :disabled="saving" @click="drawer=false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="Boolean(activityActionKey)" @click="submit">保存</el-button>
      </template>
    </el-drawer>

    <H5QrDialog
      v-model="h5QrDialogVisible"
      title="活动 H5 二维码"
      :scope-name="h5QrScopeName"
      :url="h5QrUrl"
    />
    <ActivityPosterDialog
      v-model="posterDialogVisible"
      :activity="posterActivity"
      :tenant-name="posterTenantName"
      :url="posterUrl"
    />
  </div>
</template>

<style scoped>
.filter-bar { display: grid; grid-template-columns: minmax(220px, 1fr) 160px 160px auto auto; gap: 10px; align-items: center; margin-bottom: 14px; }
.status-summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.status-summary-item { cursor: pointer; user-select: none; }
.pager-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-top: 14px; color: #64748b; font-size: 13px; }
.compliance-alert { margin-bottom: 14px; }
.compliance-issues { display: grid; gap: 8px; line-height: 1.6; }
.compliance-issues div { display: grid; gap: 2px; }
.compliance-issues strong { color: #111827; }
.compliance-issues span { color: #7c2d12; font-weight: 600; }
.compliance-issues em { color: #475569; font-style: normal; }
.activity-wizard { margin-bottom: 14px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
.field-row { display: grid; gap: 10px; margin-bottom: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.field-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.field-head strong { color: #111827; }
.field-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.field-actions .el-button { margin-left: 0; }
.field-main { display: grid; grid-template-columns: minmax(180px, 1fr) 150px 80px 88px auto; gap: 8px; align-items: center; }
.host-row { display: grid; grid-template-columns: 1fr 1fr 1.5fr 120px 40px; gap: 8px; align-items: center; margin-bottom: 14px; }
.section-row { display: grid; grid-template-columns: 150px 1fr 120px 108px; gap: 8px; align-items: center; margin-bottom: 14px; }
.options, .full { grid-column: 1 / -1; }
.options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 10px; border-radius: 8px; background: #f8fafc; border: 1px dashed #d7dee8; }
.option-row { display: grid; grid-template-columns: minmax(0, 1fr) 96px; gap: 8px; align-items: center; }
.option-empty { grid-column: 1 / -1; padding: 4px 0; }
.permission-alert { margin-bottom: 4px; }
.switches { align-items: end; }
.cover-field, .qr-field { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; }
.cover-preview { grid-column: 1 / -1; width: 220px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; background: #f8fafc; }
.qr-preview { grid-column: 1 / -1; width: 180px; aspect-ratio: 1 / 1; object-fit: contain; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; }
.section-image-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; padding: 10px; border-radius: 8px; background: #f8fafc; border: 1px dashed #d7dee8; }
.section-image-preview { grid-column: 1 / -1; width: min(360px, 100%); aspect-ratio: 16 / 9; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; }
.approval-header { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; margin-bottom: 18px; }
.approval-timeline { padding: 4px 4px 4px 0; }
.approval-log { display: grid; gap: 6px; color: #334155; font-size: 13px; }
.approval-log-title { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.approval-log-title span, .approval-log-meta { color: #64748b; }
.approval-log-remark { padding: 8px 10px; border-radius: 8px; background: #f8fafc; color: #475569; line-height: 1.6; }
.channel-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; margin-bottom: 16px; }
.channel-form .el-button { align-self: end; margin-bottom: 18px; }
.embedded { margin-top: 16px; }
:global(.activity-template-dialog .el-dialog__body) { padding-top: 8px; }
.activity-template-intro { margin: 0 0 16px; color: #64748b; font-size: 14px; line-height: 1.65; }
.activity-template-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.activity-template-card { display: grid; gap: 7px; min-height: 132px; padding: 16px; border: 1px solid #dce8e4; border-radius: 8px; background: #fff; color: #1f2937; text-align: left; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.activity-template-card:hover, .activity-template-card:focus-visible { border-color: #10b981; box-shadow: 0 8px 18px rgba(16, 185, 129, .12); outline: none; transform: translateY(-1px); }
.activity-template-card strong { color: #064e3b; font-size: 16px; }
.activity-template-card span { color: #64748b; font-size: 13px; line-height: 1.55; }
.activity-template-card em { align-self: end; color: #0f766e; font-size: 12px; font-style: normal; }
@media (max-width: 1100px) {
  .filter-bar, .form-grid, .field-main, .host-row, .section-row, .section-image-field, .channel-form, .activity-template-grid { grid-template-columns: 1fr; }
  .field-head { align-items: flex-start; flex-direction: column; }
  .field-actions { justify-content: flex-start; }
  .pager-row { align-items: flex-start; flex-direction: column; }
}

@media (max-width: 1024px) {
  .activity-wizard {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
  }
  .activity-wizard :deep(.el-step) {
    min-width: 112px;
    flex: 0 0 112px !important;
    scroll-snap-align: start;
  }
  .activity-wizard :deep(.el-step__main) { min-width: 0; }
  .activity-wizard :deep(.el-step__title) {
    white-space: nowrap;
    font-size: 13px;
  }
  .activity-wizard :deep(.el-step__arrow) { flex: 0 0 12px; }
}

</style>
