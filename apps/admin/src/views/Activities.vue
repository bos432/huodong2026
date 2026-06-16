<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Check, Clock, Close, CopyDocument, Delete, Edit, Grid, Hide, MoreFilled, Picture, Plus, Upload, UploadFilled, View } from "@element-plus/icons-vue";
import { ActivityStatus, FieldType, checkActivityContentCompliance } from "@activity/shared";
import { api } from "../api";
import ActivityPosterDialog from "../components/ActivityPosterDialog.vue";
import H5QrDialog from "../components/H5QrDialog.vue";
import { activityH5PreviewUrl, copyToClipboard } from "../h5-preview";
import { canAccess, currentTenantCode, currentTenantSettings, isPlatformAdmin, permissions } from "../permissions";

const activityStatusText: Record<ActivityStatus, string> = {
  [ActivityStatus.Draft]: "草稿",
  [ActivityStatus.PendingApproval]: "待平台审核",
  [ActivityStatus.Rejected]: "已驳回",
  [ActivityStatus.Open]: "报名中",
  [ActivityStatus.Closed]: "已下架",
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
const drawer = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const approvalDrawer = ref(false);
const approvalLoading = ref(false);
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
const channels = ref<any[]>([]);
const channelReport = ref<any[]>([]);
const channelForm = reactive({ name: "", code: "", source: "", remark: "" });
const form = reactive<any>(defaultForm());
const pageTitle = computed(() => (isPlatformAdmin() ? "活动审核" : "活动管理"));
const defaultActivityStatus = () => (isPlatformAdmin() ? ActivityStatus.PendingApproval : ActivityStatus.Open);
const routeStatus = () => {
  const status = typeof route.query.status === "string" ? route.query.status : "";
  if (status === "all") return "";
  return Object.values(ActivityStatus).includes(status as ActivityStatus) ? (status as ActivityStatus) : defaultActivityStatus();
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
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});
const registrationReviewEnabled = computed(() => isPlatformAdmin() || currentTenantSettings().registrationReviewEnabled);
const registrationReviewDisabledReason = computed(() =>
  registrationReviewEnabled.value ? "" : "平台未开通本商家的报名审核权限，活动报名将自动通过或进入付款流程。"
);
const canOperateActivities = computed(() => canAccess(permissions.operation));
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
  [FieldType.Remark]: "备注"
};

const sectionTypeOptions = [
  { label: "活动亮点", value: "highlights" },
  { label: "适合人群", value: "audience" },
  { label: "活动流程", value: "agenda" },
  { label: "常见问题", value: "faq" },
  { label: "自定义", value: "custom" }
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
    description: "",
    notice: "",
    location: "",
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
    ]
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
    ElMessage.error(error.message || "加载活动失败");
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
  const [categoryRows, agentRows, levels, tenantRows] = await Promise.all([
    api.get<any, any[]>("/admin/categories"),
    api.get<any, any[]>("/admin/agents"),
    api.get<any, any[]>("/admin/member-levels"),
    isPlatformAdmin() ? api.get<any, any[]>("/admin/tenants") : Promise.resolve([])
  ]);
  categories.value = categoryRows;
  agents.value = agentRows;
  tenants.value = tenantRows;
  memberLevels.value = levels.filter((item) => item.enabled);
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
  filters.status = defaultActivityStatus();
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

function create() {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  editingId.value = null;
  Object.assign(form, {
    ...defaultForm(),
    requireReview: registrationReviewEnabled.value
  });
  drawer.value = true;
}

async function edit(row: any) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  const data = await api.get<any, any>(`/admin/activities/${row.id}`);
  openActivityEditor(data);
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
    locationMapUrl: data.locationMapUrl || "",
    groupQrCodeUrl: data.groupQrCodeUrl || "",
    priorityRegistrationEndsAt: data.priorityRegistrationEndsAt?.slice(0, 19).replace("T", " ") || "",
    price: Number(data.price),
    startTime: data.startTime?.slice(0, 19).replace("T", " "),
    endTime: data.endTime?.slice(0, 19).replace("T", " "),
    registrationDeadline: data.registrationDeadline?.slice(0, 19).replace("T", " "),
    hosts: data.hosts?.length ? data.hosts : [{ name: "", title: "", avatarUrl: "", bio: "", sortOrder: 1 }],
    sections: data.sections?.length ? data.sections.map((section: any) => ({ ...section, imageUrl: section.imageUrl || "" })) : defaultForm().sections
  });
  if (!registrationReviewEnabled.value) form.requireReview = false;
  drawer.value = true;
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
  try {
    approvalLogs.value = await api.get<any, any[]>(`/admin/activities/${row.id}/approval-logs`);
  } catch (error: any) {
    ElMessage.error(error.message || "加载审核记录失败");
  } finally {
    approvalLoading.value = false;
  }
}

function addField() {
  form.fields.push({ label: "", type: FieldType.Text, required: false, sortOrder: form.fields.length + 1, options: [] });
}

function removeField(index: number) {
  if (form.fields.length <= 1) {
    ElMessage.warning("至少保留一个报名字段");
    return;
  }
  form.fields.splice(index, 1);
}

function addOption(field: any) {
  field.options ||= [];
  field.options.push({ label: "选项", value: `option_${Date.now()}_${field.options.length + 1}` });
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
  return "";
}

function cleanPayload() {
  return {
    ...form,
    requireReview: registrationReviewEnabled.value ? form.requireReview : false,
    categoryId: form.categoryId || undefined,
    agentId: form.agentId || undefined,
    minMemberLevelId: form.minMemberLevelId || undefined,
    priorityMemberLevelId: form.priorityMemberLevelId || undefined,
    locationLatitude: form.locationLatitude === "" || form.locationLatitude === null || form.locationLatitude === undefined ? undefined : Number(form.locationLatitude),
    locationLongitude: form.locationLongitude === "" || form.locationLongitude === null || form.locationLongitude === undefined ? undefined : Number(form.locationLongitude),
    locationMapUrl: form.locationMapUrl?.trim() || undefined,
    groupQrCodeUrl: form.groupQrCodeUrl?.trim() || undefined,
    priorityRegistrationEndsAt: form.priorityRegistrationEndsAt || undefined,
    price: Number(form.price),
    fields: form.fields.map((field: any, index: number) => ({
      ...field,
      label: field.label.trim(),
      sortOrder: field.sortOrder || index + 1,
      options: [FieldType.SingleChoice, FieldType.MultipleChoice].includes(field.type)
        ? (field.options || []).filter((option: any) => option.label?.trim()).map((option: any, optionIndex: number) => ({ label: option.label.trim(), value: option.value || `option_${optionIndex + 1}` }))
        : []
    })),
    hosts: form.hosts.filter((host: any) => host.name?.trim()).map((host: any, index: number) => ({ ...host, name: host.name.trim(), sortOrder: host.sortOrder || index + 1 })),
    sections: form.sections
      .filter((section: any) => section.title?.trim() && section.content?.trim())
      .sort((a: any, b: any) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .map((section: any, index: number) => ({ ...section, title: section.title.trim(), content: section.content.trim(), imageUrl: section.imageUrl?.trim() || undefined, sortOrder: index + 1 }))
  };
}

async function submit() {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
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
    ElMessage.success("活动已保存");
    drawer.value = false;
    loadActivities();
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    saving.value = false;
  }
}

async function closeActivity(row: any) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  await ElMessageBox.confirm(`确认下架活动「${row.title}」？下架后用户端将不再展示。`, "下架活动", { type: "warning" });
  await api.post(`/admin/activities/${row.id}/close`);
  ElMessage.success("活动已下架");
  loadActivities();
}

async function submitApproval(row: any) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  await api.post(`/admin/activities/${row.id}/submit-approval`);
  ElMessage.success("活动已提交平台审核");
  loadActivities();
}

async function approveActivity(row: any) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  await ElMessageBox.confirm(`确认通过活动「${row.title}」？通过后用户端可公开报名。`, "通过活动审核", { type: "warning", confirmButtonText: "通过", cancelButtonText: "取消" });
  await api.post(`/admin/activities/${row.id}/approve`, {});
  ElMessage.success("活动已通过审核");
  loadActivities();
}

async function rejectActivity(row: any) {
  if (!canOperateActivities.value) return ElMessage.warning("当前账号只能只读查看活动列表");
  const { value } = await ElMessageBox.prompt(`请输入驳回「${row.title}」的原因`, "驳回活动", { inputType: "textarea", confirmButtonText: "确认驳回", cancelButtonText: "取消" });
  await api.post(`/admin/activities/${row.id}/reject`, { remark: value || "" });
  ElMessage.success("活动已驳回");
  loadActivities();
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
  try {
    const [channelRows, report] = await Promise.all([
      api.get<any, any[]>(`/admin/activities/${channelActivity.value.id}/channels`),
      api.get<any, any>(`/admin/activities/${channelActivity.value.id}/channel-report`)
    ]);
    channels.value = channelRows;
    channelReport.value = report.channels || [];
  } finally {
    channelLoading.value = false;
  }
}

async function createChannel() {
  if (!channelActivity.value) return;
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
        <el-button v-if="isPlatformAdmin()" :icon="Check" @click="showPendingApproval">待审核活动</el-button>
        <el-button v-if="canOperateActivities && !isPlatformAdmin()" type="primary" :icon="Plus" @click="create">新建活动</el-button>
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
        description="这里默认筛选待平台审核活动；可切换状态查看全部商家活动，并对违规活动执行通过、驳回或下架。"
      />
      <el-alert
        v-if="!canOperateActivities"
        class="permission-alert"
        type="warning"
        show-icon
        :closable="false"
        title="当前账号只能只读查看活动列表，用于现场签到核对。"
      />
      <div class="filter-bar">
        <el-input v-model="filters.keyword" clearable placeholder="搜索活动标题或地点" @keyup.enter="search" />
        <el-select v-if="canOperateActivities" v-model="filters.categoryId" clearable placeholder="全部分类" @change="search">
          <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
        </el-select>
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" @change="search">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="全部状态" @change="search">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="search">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
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
          @click="setStatusFilter(item.value)"
        >
          {{ item.label }}：{{ item.count }}
        </el-tag>
        <el-tag v-if="activeStatusFilter" class="status-summary-item" effect="plain" @click="setStatusFilter('')">清除状态</el-tag>
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
            <el-button size="small" :icon="View" @click="openActivityH5(row)">预览H5</el-button>
            <el-button v-if="primaryAction(row)" size="small" :type="primaryAction(row)?.type as any" :icon="primaryAction(row)?.icon" @click="primaryAction(row)?.handler()">{{ primaryAction(row)?.label }}</el-button>
            <el-dropdown trigger="click">
              <el-button size="small" :icon="MoreFilled">更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :icon="CopyDocument" @click="copyActivityH5Url(row)">复制链接</el-dropdown-item>
                  <el-dropdown-item :icon="Grid" @click="showActivityH5Qr(row)">二维码</el-dropdown-item>
                  <el-dropdown-item :icon="Picture" @click="showActivityPoster(row)">海报</el-dropdown-item>
                  <el-dropdown-item :icon="Grid" @click="showActivityChannels(row)">渠道</el-dropdown-item>
                  <el-dropdown-item :icon="Clock" @click="loadApprovalLogs(row)">审核记录</el-dropdown-item>
                  <el-dropdown-item v-if="canSubmitApproval(row)" :icon="Upload" @click="submitApproval(row)">提交审核</el-dropdown-item>
                  <el-dropdown-item v-if="canApprove(row)" :icon="Close" divided @click="rejectActivity(row)">驳回</el-dropdown-item>
                  <el-dropdown-item v-if="canOperateActivities" :icon="Hide" divided :disabled="row.status === ActivityStatus.Closed" @click="closeActivity(row)">下架</el-dropdown-item>
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

    <el-drawer v-model="approvalDrawer" size="560px" title="审核记录">
      <div class="approval-header">
        <strong>{{ approvalActivity?.title || "-" }}</strong>
        <el-tag v-if="approvalActivity?.status">{{ activityStatusText[approvalActivity.status as ActivityStatus] }}</el-tag>
      </div>
      <el-skeleton v-if="approvalLoading" :rows="4" animated />
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

    <el-drawer v-model="channelDrawer" size="860px" title="渠道推广与转化">
      <div class="approval-header">
        <strong>{{ channelActivity?.title || "-" }}</strong>
        <el-button size="small" @click="loadActivityChannels">刷新</el-button>
      </div>
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

    <el-drawer v-model="drawer" size="900px" :title="editingId ? '编辑活动' : '新建活动'">
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
        <el-tabs>
          <el-tab-pane label="基础信息">
            <div class="form-grid">
              <el-form-item label="标题" required><el-input v-model="form.title" maxlength="100" show-word-limit /></el-form-item>
              <el-form-item label="分类"><el-select v-model="form.categoryId" clearable><el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" /></el-select></el-form-item>
              <el-form-item label="所属代理"><el-select v-model="form.agentId" clearable filterable placeholder="平台自营"><el-option v-for="agent in agents" :key="agent.id" :label="agent.name" :value="agent.id" /></el-select></el-form-item>
              <el-form-item label="会员门槛"><el-select v-model="form.minMemberLevelId" clearable><el-option v-for="level in memberLevels" :key="level.id" :label="level.name" :value="level.id" /></el-select></el-form-item>
              <el-form-item label="优先报名会员"><el-select v-model="form.priorityMemberLevelId" clearable><el-option v-for="level in memberLevels" :key="level.id" :label="level.name" :value="level.id" /></el-select></el-form-item>
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
              <el-form-item label="地点" required><el-input v-model="form.location" placeholder="例如：城市书房 2 楼活动室" /></el-form-item>
              <el-form-item label="地图纬度"><el-input-number v-model="form.locationLatitude" :min="-90" :max="90" :precision="6" controls-position="right" placeholder="例如：31.230416" /></el-form-item>
              <el-form-item label="地图经度"><el-input-number v-model="form.locationLongitude" :min="-180" :max="180" :precision="6" controls-position="right" placeholder="例如：121.473701" /></el-form-item>
              <el-form-item class="full" label="地图链接">
                <el-input v-model="form.locationMapUrl" placeholder="可填写腾讯地图、高德地图或百度地图分享链接；无经纬度时前台会显示可点击地图入口" />
              </el-form-item>
              <el-form-item class="full" label="活动群二维码">
                <div class="qr-field">
                  <el-input v-model="form.groupQrCodeUrl" placeholder="可上传活动专属企业群二维码；不填则使用全局默认二维码" />
                  <el-upload action="/api/admin/uploads/images" name="file" :headers="uploadHeaders()" :show-file-list="false" :before-upload="beforeCoverUpload" :on-success="handleGroupQrSuccess" :on-error="handleCoverError">
                    <el-button :icon="UploadFilled">上传二维码</el-button>
                  </el-upload>
                  <img v-if="form.groupQrCodeUrl" class="qr-preview" :src="form.groupQrCodeUrl" alt="活动群二维码预览" />
                </div>
              </el-form-item>
              <el-form-item label="开始时间" required><el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
              <el-form-item label="结束时间" required><el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
              <el-form-item label="报名截止" required><el-date-picker v-model="form.registrationDeadline" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
              <el-form-item label="名额" required><el-input-number v-model="form.capacity" :min="1" /></el-form-item>
              <el-form-item label="费用"><el-input-number v-model="form.price" :min="0" :precision="2" /></el-form-item>
              <el-form-item label="状态"><el-select v-model="form.status"><el-option v-for="(text, key) in activityStatusText" :key="key" :label="text" :value="key" /></el-select></el-form-item>
              <el-alert v-if="registrationReviewDisabledReason" class="permission-alert full" type="warning" show-icon :closable="false" :title="registrationReviewDisabledReason" />
              <el-form-item class="switches">
                <el-checkbox v-model="form.featured">首页推荐</el-checkbox>
                <el-checkbox v-model="form.requireReview" :disabled="!registrationReviewEnabled">需要审核</el-checkbox>
                <el-checkbox v-model="form.allowCancel">允许取消</el-checkbox>
              </el-form-item>
              <el-form-item class="full" label="活动介绍" required><el-input v-model="form.description" type="textarea" :rows="5" /></el-form-item>
              <el-form-item class="full" label="报名须知"><el-input v-model="form.notice" type="textarea" :rows="3" /></el-form-item>
            </div>
          </el-tab-pane>

          <el-tab-pane label="报名字段">
            <div v-for="(field, index) in form.fields" :key="index" class="field-row">
              <el-input v-model="field.label" placeholder="字段名称" />
              <el-select v-model="field.type"><el-option v-for="(text, value) in fieldTypeText" :key="value" :label="text" :value="value" /></el-select>
              <el-checkbox v-model="field.required">必填</el-checkbox>
              <el-input-number v-model="field.sortOrder" :min="1" />
              <el-button :icon="Delete" circle @click="removeField(index)" />
              <el-button v-if="field.type === FieldType.SingleChoice || field.type === FieldType.MultipleChoice" :icon="Plus" @click="addOption(field)">选项</el-button>
              <div v-if="field.options?.length && (field.type === FieldType.SingleChoice || field.type === FieldType.MultipleChoice)" class="options">
                <el-input v-for="(option, optionIndex) in field.options" :key="option.value || optionIndex" v-model="option.label" placeholder="选项名称" />
              </div>
            </div>
            <el-button :icon="Plus" @click="addField">增加字段</el-button>
          </el-tab-pane>

          <el-tab-pane label="主理人">
            <div v-for="(host, index) in form.hosts" :key="index" class="host-row">
              <el-input v-model="host.name" placeholder="姓名" />
              <el-input v-model="host.title" placeholder="身份/头衔" />
              <el-input v-model="host.avatarUrl" placeholder="头像 URL" />
              <el-input-number v-model="host.sortOrder" :min="1" />
              <el-button :icon="Delete" circle @click="form.hosts.splice(index, 1)" />
              <el-input v-model="host.bio" class="full" type="textarea" :rows="2" placeholder="简介" />
            </div>
            <el-button :icon="Plus" @click="addHost">增加主理人</el-button>
          </el-tab-pane>

          <el-tab-pane label="详情模块">
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
              <el-input v-model="section.content" class="full" type="textarea" :rows="4" placeholder="模块内容" />
            </div>
            <el-button :icon="Plus" @click="addSection">增加模块</el-button>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="drawer=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
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
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
.field-row { display: grid; grid-template-columns: 1fr 150px 80px 120px 40px 90px; gap: 8px; align-items: center; margin-bottom: 10px; }
.host-row { display: grid; grid-template-columns: 1fr 1fr 1.5fr 120px 40px; gap: 8px; align-items: center; margin-bottom: 14px; }
.section-row { display: grid; grid-template-columns: 150px 1fr 120px 108px; gap: 8px; align-items: center; margin-bottom: 14px; }
.options, .full { grid-column: 1 / -1; }
.options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
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
@media (max-width: 1100px) {
  .filter-bar, .form-grid, .field-row, .host-row, .section-row, .section-image-field, .channel-form { grid-template-columns: 1fr; }
  .pager-row { align-items: flex-start; flex-direction: column; }
}
</style>
