<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Edit, Plus, Refresh, Switch, Upload, View } from "@element-plus/icons-vue";
import { api } from "../api";
import { hasPermission, isPlatformAdmin } from "../permissions";

type PopupButton = { text: string; link: string; style: "primary" | "secondary" };
type PopupRow = {
  id: number;
  title: string;
  subtitle?: string | null;
  content?: string | null;
  emphasis?: string | null;
  imageUrl?: string | null;
  type: string;
  platforms: string[];
  placements: string[];
  audience?: { mode?: string; memberLevelIds?: number[] } | null;
  buttons: PopupButton[];
  frequency: string;
  priority: number;
  enabled: boolean;
  dismissible: boolean;
  startAt?: string | null;
  endAt?: string | null;
  impressionCount: number;
  clickCount: number;
  closeCount: number;
  tenant?: { id: number; name?: string | null; code?: string | null } | null;
};
type EffectiveCheckItem = {
  id: number;
  title: string;
  status: string;
  statusText: string;
  matched: boolean;
  reasons: Array<{ code: string; message: string }>;
  warnings: Array<{ code: string; message: string }>;
  popup?: PopupRow;
};
type EffectiveCheckResult = {
  pageKey: string;
  platform: string;
  tenant?: { id: number; name?: string | null; code?: string | null } | null;
  matched: boolean;
  hit?: EffectiveCheckItem | null;
  publicPopup?: PopupRow | null;
  checks: EffectiveCheckItem[];
};
type PopupListResponse = { items: PopupRow[]; total: number; page: number; pageSize: number };
type PopupOptions = {
  tenants: any[];
  memberLevels: any[];
  types: Array<{ label: string; value: string }>;
  platforms: Array<{ label: string; value: string }>;
  placements: Array<{ label: string; value: string }>;
  frequencies: Array<{ label: string; value: string }>;
};

const typeOptions = reactive([
  { label: "重要通知", value: "notice" },
  { label: "广告推广", value: "ad" },
  { label: "支付提醒", value: "payment" },
  { label: "五行暖金通知", value: "wuxing_gold" }
]);
const platformOptions = reactive([
  { label: "全部", value: "all" },
  { label: "H5", value: "h5" },
  { label: "微信小程序", value: "mp-weixin" }
]);
const placementOptions = reactive([
  { label: "全部页面", value: "all" },
  { label: "首页", value: "home" },
  { label: "商城首页", value: "mall_home" },
  { label: "活动列表", value: "activity_list" },
  { label: "活动详情", value: "activity_detail" },
  { label: "课程首页", value: "course_home" },
  { label: "课程详情", value: "course_detail" },
  { label: "商城商品详情", value: "mall_product_detail" },
  { label: "共修首页", value: "community_home" },
  { label: "我的", value: "user_my" }
]);
const frequencyOptions = reactive([
  { label: "每次进入", value: "every_visit" },
  { label: "每天一次", value: "once_per_day" },
  { label: "当前活动一次", value: "once_per_campaign" }
]);

const rows = ref<PopupRow[]>([]);
const tenants = ref<any[]>([]);
const memberLevels = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const uploading = ref(false);
const actionKey = ref("");
const listErrorMessage = ref("");
const optionErrorMessage = ref("");
const checkErrorMessage = ref("");
const drawer = ref(false);
const editingId = ref<number | null>(null);
const checkDialog = ref(false);
const checkLoading = ref(false);
const checkResult = ref<EffectiveCheckResult | null>(null);
const filters = reactive({ tenantId: undefined as number | undefined, keyword: "", enabled: "", platform: "", placement: "" });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });
const checkForm = reactive({ id: undefined as number | undefined, tenantId: undefined as number | undefined, pageKey: "home", platform: "h5" });
const form = reactive({
  tenantId: undefined as number | undefined,
  title: "",
  subtitle: "",
  content: "",
  emphasis: "",
  imageUrl: "",
  type: "wuxing_gold",
  platforms: ["all"] as string[],
  placements: ["home"] as string[],
  audienceMode: "all",
  memberLevelIds: [] as number[],
  frequency: "once_per_day",
  priority: 0,
  enabled: true,
  dismissible: true,
  startAt: "",
  endAt: "",
  buttons: [
    { text: "暂不查看", link: "", style: "secondary" },
    { text: "查看详情", link: "/pages/index/index", style: "primary" }
  ] as PopupButton[]
});
type PopupTarget = { id: number | null; tenantId: number | null; scopeKey: string; listSequence: number };
const formTarget = ref<PopupTarget | null>(null);
let listLoadSequence = 0;
let optionLoadSequence = 0;
let checkLoadSequence = 0;
const formMemberLevels = computed(() => !isPlatformAdmin()
  ? memberLevels.value
  : memberLevels.value.filter((level) => form.tenantId ? Number(level.tenantId || 0) === Number(form.tenantId) : !level.tenantId));
watch(() => form.tenantId, () => {
  const allowed = new Set(formMemberLevels.value.map((level) => Number(level.id)));
  form.memberLevelIds = form.memberLevelIds.filter((id) => allowed.has(Number(id)));
});

const drawerTitle = computed(() => (editingId.value ? "编辑营销弹窗" : "新增营销弹窗"));
const pageTitle = computed(() => (canWrite.value ? "营销弹窗管理" : "营销弹窗"));
const canWrite = computed(() => hasPermission("marketing_popup.manage"));
const canUpload = computed(() => hasPermission("upload.image"));
const previewTypeClass = computed(() => `popup-preview-card ${form.type === "wuxing_gold" ? "wuxing" : form.type}`);
const writeLocked = computed(() => saving.value || uploading.value || Boolean(actionKey.value));
const scopeLocked = computed(() => writeLocked.value || drawer.value || checkDialog.value);

function popupScopeKey() {
  return JSON.stringify({ ...filters, page: pagination.page, pageSize: pagination.pageSize });
}

function capturePopupTarget(row?: PopupRow): PopupTarget {
  return {
    id: row?.id ? Number(row.id) : null,
    tenantId: Number(row?.tenant?.id || form.tenantId || 0) || null,
    scopeKey: popupScopeKey(),
    listSequence: listLoadSequence
  };
}

function assertPopupTarget(target: PopupTarget) {
  if (target.scopeKey !== popupScopeKey() || target.listSequence !== listLoadSequence) {
    throw new Error("弹窗列表或筛选范围已变化，请刷新后重新操作");
  }
  if (target.id === null) return undefined;
  const current = rows.value.find((item) => Number(item.id) === target.id);
  const currentTenantId = Number(current?.tenant?.id || 0) || null;
  if (!current || currentTenantId !== target.tenantId) throw new Error("目标营销弹窗已不在当前列表，请刷新后重新操作");
  return current;
}

function effectiveCheckKey() {
  return JSON.stringify({ ...checkForm, listSequence: listLoadSequence });
}

async function load() {
  const sequence = ++listLoadSequence;
  const scopeKey = popupScopeKey();
  loading.value = true;
  listErrorMessage.value = "";
  rows.value = [];
  pagination.total = 0;
  try {
    const params = new URLSearchParams();
    if (isPlatformAdmin() && filters.tenantId) params.set("tenantId", String(filters.tenantId));
    if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
    if (filters.enabled) params.set("enabled", filters.enabled);
    if (filters.platform) params.set("platform", filters.platform);
    if (filters.placement) params.set("placement", filters.placement);
    params.set("page", String(pagination.page));
    params.set("pageSize", String(pagination.pageSize));
    const result = await api.get<any, PopupListResponse>("/admin/marketing-popups", { params });
    if (sequence !== listLoadSequence || scopeKey !== popupScopeKey()) return;
    rows.value = Array.isArray(result?.items) ? result.items : [];
    pagination.total = Number(result.total || 0);
  } catch (error: any) {
    if (sequence !== listLoadSequence || scopeKey !== popupScopeKey()) return;
    rows.value = [];
    pagination.total = 0;
    listErrorMessage.value = error.message || "加载营销弹窗失败";
  } finally {
    if (sequence === listLoadSequence) loading.value = false;
  }
}

async function loadTenants() {
  const sequence = ++optionLoadSequence;
  optionErrorMessage.value = "";
  tenants.value = [];
  memberLevels.value = [];
  try {
    const result = await api.get<any, PopupOptions>("/admin/marketing-popups/options");
    if (sequence !== optionLoadSequence) return;
    tenants.value = Array.isArray(result?.tenants) ? result.tenants : [];
    memberLevels.value = Array.isArray(result?.memberLevels) ? result.memberLevels : [];
    if (result.types?.length) typeOptions.splice(0, typeOptions.length, ...result.types);
    if (result.platforms?.length) platformOptions.splice(0, platformOptions.length, ...result.platforms);
    if (result.placements?.length) placementOptions.splice(0, placementOptions.length, ...result.placements);
    if (result.frequencies?.length) frequencyOptions.splice(0, frequencyOptions.length, ...result.frequencies);
  } catch (error: any) {
    if (sequence !== optionLoadSequence) return;
    tenants.value = [];
    memberLevels.value = [];
    optionErrorMessage.value = error.message || "弹窗归属和会员等级加载失败";
  }
}

function resetForm() {
  Object.assign(form, {
    tenantId: isPlatformAdmin() ? filters.tenantId : undefined,
    title: "重要通知",
    subtitle: "请关注最新运营提醒",
    content: "支付时请确认订单信息，避免重复付款或误操作。",
    emphasis: "要关 WiFi、关蓝牙、关定位",
    imageUrl: "",
    type: "wuxing_gold",
    platforms: ["all"],
    placements: ["home"],
    audienceMode: "all",
    memberLevelIds: [],
    frequency: "once_per_day",
    priority: 0,
    enabled: true,
    dismissible: true,
    startAt: "",
    endAt: "",
    buttons: [
      { text: "暂不查看", link: "", style: "secondary" },
      { text: "查看详情", link: "/pages/index/index", style: "primary" }
    ]
  });
}

function create() {
  if (!canWrite.value) return;
  editingId.value = null;
  formTarget.value = null;
  resetForm();
  drawer.value = true;
}

function edit(row: PopupRow) {
  if (!canWrite.value) return;
  editingId.value = row.id;
  formTarget.value = capturePopupTarget(row);
  Object.assign(form, {
    tenantId: row.tenant?.id || undefined,
    title: row.title || "",
    subtitle: row.subtitle || "",
    content: row.content || "",
    emphasis: row.emphasis || "",
    imageUrl: row.imageUrl || "",
    type: row.type || "notice",
    platforms: Array.isArray(row.platforms) && row.platforms.length ? [...row.platforms] : ["all"],
    placements: Array.isArray(row.placements) && row.placements.length ? [...row.placements] : ["home"],
    audienceMode: row.audience?.mode || "all",
    memberLevelIds: Array.isArray(row.audience?.memberLevelIds) ? [...row.audience.memberLevelIds] : [],
    frequency: row.frequency || "once_per_day",
    priority: Number(row.priority || 0),
    enabled: Boolean(row.enabled),
    dismissible: row.dismissible !== false,
    startAt: row.startAt ? formatInputDate(row.startAt) : "",
    endAt: row.endAt ? formatInputDate(row.endAt) : "",
    buttons: normalizeButtons(row.buttons)
  });
  drawer.value = true;
}

function normalizeButtons(buttons: PopupButton[]) {
  const rows = Array.isArray(buttons) ? buttons.slice(0, 2) : [];
  while (rows.length < 2) rows.push({ text: "", link: "", style: "primary" });
  return rows.map((item) => ({ text: item.text || "", link: item.link || "", style: item.style === "secondary" ? "secondary" : "primary" })) as PopupButton[];
}

async function submit() {
  if (!canWrite.value) return;
  if (saving.value || actionKey.value || uploading.value) return;
  if (!form.title.trim()) return ElMessage.warning("请填写弹窗标题");
  if (!form.platforms.length || !form.placements.length) return ElMessage.warning("请选择投放平台和页面");
  if (form.startAt && form.endAt && form.startAt >= form.endAt) return ElMessage.warning("结束时间必须晚于开始时间");
  if (form.audienceMode === "member_levels" && !form.memberLevelIds.length) return ElMessage.warning("请选择至少一个可见会员等级");
  if (form.imageUrl.trim() && !usableImage(form.imageUrl.trim())) return ElMessage.warning("顶部图片只允许 HTTPS 或 /uploads/ 地址");
  const targetsMiniProgram = form.platforms.includes("all") || form.platforms.includes("mp-weixin");
  const invalidButton = form.buttons.find((item) => item.text.trim() && item.link.trim() && !usableLink(item.link.trim(), targetsMiniProgram ? "mp-weixin" : "h5"));
  if (invalidButton) return ElMessage.warning(targetsMiniProgram ? "小程序投放按钮只允许站内 / 路径" : "按钮跳转只允许 HTTP(S) 或站内 / 路径");
  let target: PopupTarget;
  try {
    target = formTarget.value || capturePopupTarget();
    assertPopupTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "弹窗列表或筛选范围已变化，请刷新后重新操作");
  }
  const { audienceMode, memberLevelIds, ...baseForm } = form;
  const payload = {
    ...baseForm,
    tenantId: isPlatformAdmin() ? target.tenantId : undefined,
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || null,
    content: form.content.trim() || null,
    emphasis: form.emphasis.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    buttons: form.buttons.filter((item) => item.text.trim()).map((item) => ({ text: item.text.trim(), link: item.link.trim(), style: item.style })),
    startAt: form.startAt || null,
    endAt: form.endAt || null,
    audience: { mode: audienceMode, memberLevelIds: audienceMode === "member_levels" ? memberLevelIds : [] }
  };
  saving.value = true;
  try {
    assertPopupTarget(target);
    if (target.id) await api.patch(`/admin/marketing-popups/${target.id}`, payload);
    else await api.post("/admin/marketing-popups", payload);
    ElMessage.success("营销弹窗已保存");
    drawer.value = false;
    formTarget.value = null;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存营销弹窗失败");
  } finally {
    saving.value = false;
  }
}

async function quickToggle(row: PopupRow) {
  if (!canWrite.value || actionKey.value || saving.value) return;
  let target: PopupTarget;
  try {
    target = capturePopupTarget(row);
    assertPopupTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "弹窗列表或筛选范围已变化，请刷新后重新操作");
  }
  actionKey.value = `toggle:${row.id}`;
  try {
    if (row.enabled) {
      await ElMessageBox.confirm(`确认停用「${row.title}」？停用后前台将不再展示。`, "停用营销弹窗", { type: "warning", confirmButtonText: "确认停用", cancelButtonText: "取消" });
    }
    const current = assertPopupTarget(target) as PopupRow;
    await api.patch(`/admin/marketing-popups/${row.id}`, rowPayload(current, { enabled: !current.enabled }));
    ElMessage.success(current.enabled ? "已停用" : "已启用");
    await load();
  } catch (error: any) {
    if (isDialogCancel(error)) return;
    ElMessage.error(error.message || "更新弹窗失败");
  } finally {
    actionKey.value = "";
  }
}

function openEffectiveCheck(row?: PopupRow) {
  if (checkLoading.value) return;
  checkForm.id = row?.id;
  checkForm.tenantId = row?.tenant?.id || (isPlatformAdmin() ? filters.tenantId : undefined);
  checkForm.pageKey = filters.placement || firstSpecific(row?.placements) || "home";
  checkForm.platform = filters.platform || firstSpecific(row?.platforms) || "h5";
  checkResult.value = null;
  checkDialog.value = true;
  void runEffectiveCheck();
}

async function runEffectiveCheck() {
  if (checkLoading.value) return;
  const sequence = ++checkLoadSequence;
  const checkKey = effectiveCheckKey();
  checkLoading.value = true;
  checkErrorMessage.value = "";
  checkResult.value = null;
  try {
    const params = new URLSearchParams();
    if (checkForm.id) params.set("id", String(checkForm.id));
    if (isPlatformAdmin() && checkForm.tenantId) params.set("tenantId", String(checkForm.tenantId));
    params.set("pageKey", checkForm.pageKey);
    params.set("platform", checkForm.platform);
    const result = await api.get<any, EffectiveCheckResult>("/admin/marketing-popups/effective-check", { params });
    if (sequence !== checkLoadSequence || checkKey !== effectiveCheckKey()) return;
    checkResult.value = result;
  } catch (error: any) {
    if (sequence !== checkLoadSequence || checkKey !== effectiveCheckKey()) return;
    checkResult.value = null;
    checkErrorMessage.value = error.message || "生效检测失败";
  } finally {
    if (sequence === checkLoadSequence) checkLoading.value = false;
  }
}

function firstSpecific(value?: string[]) {
  const item = Array.isArray(value) ? value.find((row) => row && row !== "all") : "";
  return item || "";
}

function openFrontendPreview() {
  const tenant = tenants.value.find((item) => item.id === checkForm.tenantId);
  const query = new URLSearchParams();
  if (tenant?.code) query.set("tenantCode", tenant.code);
  query.set("t", `popup-preview-${Date.now()}`);
  window.open(`${window.location.origin}/?${query.toString()}#/`, "_blank");
}

function clearPopupFrequencyCache() {
  const keys = Object.keys(window.localStorage).filter((key) => key.includes("marketing_popup:"));
  keys.forEach((key) => window.localStorage.removeItem(key));
  ElMessage.success(keys.length ? `已清除 ${keys.length} 条弹窗频次缓存` : "当前浏览器没有弹窗频次缓存");
}

async function remove(row: PopupRow) {
  if (!canWrite.value || actionKey.value || saving.value) return;
  let target: PopupTarget;
  try {
    target = capturePopupTarget(row);
    assertPopupTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "弹窗列表或筛选范围已变化，请刷新后重新操作");
  }
  actionKey.value = `delete:${row.id}`;
  try {
    await ElMessageBox.confirm(`确认删除「${row.title}」？删除后前台不再展示。`, "删除营销弹窗", { type: "warning", confirmButtonText: "确认删除", cancelButtonText: "取消" });
    assertPopupTarget(target);
    await api.delete(`/admin/marketing-popups/${row.id}`);
    ElMessage.success("营销弹窗已删除");
    await load();
  } catch (error: any) {
    if (isDialogCancel(error)) return;
    ElMessage.error(error.message || "删除弹窗失败");
  } finally {
    actionKey.value = "";
  }
}

function applyFilters() {
  pagination.page = 1;
  void load();
}

function changePage(page: number) {
  pagination.page = page;
  void load();
}

function changePageSize(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  void load();
}

async function uploadImage(file: File) {
  if (!canWrite.value || !canUpload.value || uploading.value || saving.value) return false;
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    ElMessage.error("请上传 JPG、PNG、WebP 或 GIF 图片");
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error("图片不能超过 5MB");
    return false;
  }
  const data = new FormData();
  data.append("file", file);
  uploading.value = true;
  try {
    const result = await api.post<any, any>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
    form.imageUrl = result.url;
    ElMessage.success("图片已上传");
  } catch (error: any) {
    ElMessage.error(error.message || "上传图片失败");
  } finally {
    uploading.value = false;
  }
  return false;
}

function rowPayload(row: PopupRow, patch: Partial<PopupRow>) {
  return {
    tenantId: isPlatformAdmin() ? row.tenant?.id || null : undefined,
    title: row.title,
    subtitle: row.subtitle || null,
    content: row.content || null,
    emphasis: row.emphasis || null,
    imageUrl: row.imageUrl || null,
    type: row.type,
    platforms: row.platforms || ["all"],
    placements: row.placements || ["home"],
    audience: row.audience || { mode: "all", memberLevelIds: [] },
    buttons: row.buttons || [],
    frequency: row.frequency,
    priority: row.priority,
    enabled: row.enabled,
    dismissible: row.dismissible,
    startAt: row.startAt || null,
    endAt: row.endAt || null,
    ...patch
  };
}

function labelOf(options: Array<{ label: string; value: string }>, value: string) {
  return options.find((item) => item.value === value)?.label || value;
}

function labels(options: Array<{ label: string; value: string }>, value: string[]) {
  return (Array.isArray(value) ? value : []).map((item) => labelOf(options, item)).join("、") || "-";
}

function tenantDisplayName(row: PopupRow) {
  return row.tenant?.name || row.tenant?.code || "平台/未归属";
}

function audienceLabel(row: PopupRow) {
  const labels: Record<string, string> = { all: "全部用户", guest: "游客", authenticated: "已登录会员", member_levels: "指定等级" };
  return labels[String(row.audience?.mode || "all")] || "全部用户";
}

function statusText(row: PopupRow) {
  const now = Date.now();
  if (!row.enabled) return "停用";
  if (row.startAt && new Date(row.startAt).getTime() > now) return "未开始";
  if (row.endAt && new Date(row.endAt).getTime() < now) return "已过期";
  if (filters.platform && !arrayMatches(row.platforms, filters.platform)) return "平台不匹配";
  if (filters.placement && !arrayMatches(row.placements, filters.placement)) return "页面不匹配";
  if (row.imageUrl && !usableImage(row.imageUrl)) return "图片异常";
  if ((row.buttons || []).some((button) => button.link && !usableLink(button.link, filters.platform || "h5"))) return "跳转异常";
  return "投放中";
}

function statusType(row: PopupRow) {
  const text = statusText(row);
  if (text === "投放中") return "success";
  if (text === "停用") return "info";
  return "warning";
}

function arrayMatches(value: string[], target: string) {
  return !target || value.includes("all") || value.includes(target);
}

function usableImage(value: string) {
  return value.startsWith("https://") || value.startsWith("/uploads/");
}

function usableLink(value: string, platform: string) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (platform === "mp-weixin") return false;
  return value.startsWith("https://") || value.startsWith("http://");
}

function isDialogCancel(error: any) {
  return error === "cancel" || error === "close" || error?.message === "cancel" || error?.message === "close";
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return date.toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
}

function formatInputDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

onMounted(async () => {
  await loadTenants();
  await load();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>{{ pageTitle }}</h2>
      <div class="toolbar-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 220px" :disabled="scopeLocked" @change="applyFilters">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="搜索标题/内容" style="width: 180px" :disabled="scopeLocked" @keyup.enter="applyFilters" />
        <el-select v-model="filters.enabled" clearable placeholder="全部状态" style="width: 120px" :disabled="scopeLocked" @change="applyFilters">
          <el-option label="启用" value="true" />
          <el-option label="停用" value="false" />
        </el-select>
        <el-select v-model="filters.platform" clearable placeholder="投放平台" style="width: 140px" :disabled="scopeLocked" @change="applyFilters">
          <el-option v-for="item in platformOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.placement" clearable placeholder="投放页面" style="width: 140px" :disabled="scopeLocked" @change="applyFilters">
          <el-option v-for="item in placementOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button :icon="View" :disabled="scopeLocked" @click="openEffectiveCheck()">生效检测</el-button>
        <el-button v-if="canWrite" type="primary" :icon="Plus" :disabled="scopeLocked" @click="create">新增弹窗</el-button>
        <el-button :icon="Refresh" :loading="loading" :disabled="scopeLocked" @click="load">刷新</el-button>
      </div>
    </div>

    <el-alert class="scope-alert" type="info" show-icon :closable="false" title="营销弹窗用于广告、重要通知、支付提醒等投放。H5 保存后立即生效，小程序端需发布包含弹窗组件的新版本后读取线上配置。" />
    <el-alert v-if="!canWrite" class="scope-alert" type="info" show-icon :closable="false" title="当前账号为只读权限，可查看、筛选和执行生效检测，不能新增、编辑、启停或删除营销弹窗。" />
    <el-alert v-if="optionErrorMessage" class="scope-alert" type="error" show-icon :closable="false" :title="optionErrorMessage">
      <template #default><el-button size="small" @click="loadTenants">重试弹窗选项</el-button></template>
    </el-alert>
    <el-alert v-if="listErrorMessage" class="scope-alert" type="error" show-icon :closable="false" :title="listErrorMessage">
      <template #default><el-button size="small" :loading="loading" @click="load">重试弹窗列表</el-button></template>
    </el-alert>

    <div class="table-card">
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无营销弹窗">
        <el-table-column v-if="isPlatformAdmin()" label="所属商家" width="180" show-overflow-tooltip><template #default="{ row }">{{ tenantDisplayName(row) }}</template></el-table-column>
        <el-table-column label="弹窗" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <strong>{{ row.title }}</strong>
            <div class="muted-line">{{ row.emphasis || row.subtitle || row.content || "-" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120"><template #default="{ row }">{{ labelOf(typeOptions, row.type) }}</template></el-table-column>
        <el-table-column label="投放" width="220">
          <template #default="{ row }">
            <div>{{ labels(platformOptions, row.platforms) }}</div>
            <div class="muted-line">{{ labels(placementOptions, row.placements) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="频次/优先级" width="140">
          <template #default="{ row }">
            <div>{{ labelOf(frequencyOptions, row.frequency) }}</div>
            <div class="muted-line">优先级 {{ row.priority }}</div>
          </template>
        </el-table-column>
        <el-table-column label="受众" width="120"><template #default="{ row }">{{ audienceLabel(row) }}</template></el-table-column>
        <el-table-column label="时间" width="210">
          <template #default="{ row }">
            <div>{{ formatTime(row.startAt) }}</div>
            <div class="muted-line">至 {{ formatTime(row.endAt) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="数据" width="150">
          <template #default="{ row }">
            <div>曝光 {{ row.impressionCount || 0 }}</div>
            <div class="muted-line">点击 {{ row.clickCount || 0 }} / 关闭 {{ row.closeCount || 0 }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="statusType(row)">{{ statusText(row) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" :width="canWrite ? 290 : 100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="View" :disabled="Boolean(actionKey) || checkLoading" @click="openEffectiveCheck(row)">检测</el-button>
            <el-button v-if="canWrite" size="small" :icon="Edit" :disabled="writeLocked || loading" @click="edit(row)">编辑</el-button>
            <el-button v-if="canWrite" size="small" :type="row.enabled ? 'warning' : 'success'" :icon="Switch" :loading="actionKey === `toggle:${row.id}`" :disabled="Boolean(actionKey) || saving" @click="quickToggle(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
            <el-button v-if="canWrite" size="small" type="danger" :icon="Delete" :loading="actionKey === `delete:${row.id}`" :disabled="Boolean(actionKey) || saving" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="pagination"
        background
        layout="total, sizes, prev, pager, next"
        :total="pagination.total"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :disabled="scopeLocked"
        @current-change="changePage"
        @size-change="changePageSize"
      />
    </div>

    <el-drawer v-model="drawer" :title="drawerTitle" size="min(980px, 100vw)">
      <div class="popup-editor">
        <el-form label-position="top" class="popup-form" :disabled="writeLocked">
          <el-form-item v-if="isPlatformAdmin()" label="弹窗归属">
            <el-select v-model="form.tenantId" clearable filterable placeholder="平台全局 / 未归属" :disabled="Boolean(editingId)">
              <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
            </el-select>
          </el-form-item>
          <div class="form-grid">
            <el-form-item label="弹窗类型">
              <el-select v-model="form.type">
                <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="优先级">
              <el-input-number v-model="form.priority" :min="-9999" :max="9999" controls-position="right" />
            </el-form-item>
          </div>
          <div class="form-grid">
            <el-form-item label="展示人群"><el-select v-model="form.audienceMode"><el-option label="全部用户" value="all" /><el-option label="仅游客" value="guest" /><el-option label="仅已登录会员" value="authenticated" /><el-option label="指定会员等级" value="member_levels" /></el-select></el-form-item>
            <el-form-item v-if="form.audienceMode === 'member_levels'" label="会员等级"><el-select v-model="form.memberLevelIds" multiple filterable placeholder="请选择可见等级"><el-option v-for="level in formMemberLevels" :key="level.id" :label="level.name" :value="level.id" /></el-select></el-form-item>
          </div>
          <el-form-item label="标题"><el-input v-model="form.title" maxlength="120" show-word-limit /></el-form-item>
          <el-form-item label="副标题"><el-input v-model="form.subtitle" maxlength="160" show-word-limit /></el-form-item>
          <el-form-item label="重点文案"><el-input v-model="form.emphasis" maxlength="180" show-word-limit placeholder="例如：要关 WiFi、关蓝牙、关定位" /></el-form-item>
          <el-form-item label="正文"><el-input v-model="form.content" type="textarea" :rows="4" maxlength="1000" show-word-limit /></el-form-item>
          <el-form-item label="顶部图片">
            <div class="upload-line">
              <el-input v-model="form.imageUrl" placeholder="https:// 或 /uploads 图片地址" />
              <el-upload v-if="canUpload" :show-file-list="false" :disabled="uploading || saving" :before-upload="uploadImage">
                <el-button :icon="Upload" :loading="uploading" :disabled="uploading || saving">上传</el-button>
              </el-upload>
            </div>
          </el-form-item>
          <div class="form-grid">
            <el-form-item label="投放平台">
              <el-checkbox-group v-model="form.platforms">
                <el-checkbox v-for="item in platformOptions" :key="item.value" :label="item.value">{{ item.label }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="投放页面">
              <el-checkbox-group v-model="form.placements">
                <el-checkbox v-for="item in placementOptions" :key="item.value" :label="item.value">{{ item.label }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </div>
          <div class="form-grid">
            <el-form-item label="展示频次">
              <el-select v-model="form.frequency">
                <el-option v-for="item in frequencyOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <div class="switch-row">
                <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
                <el-switch v-model="form.dismissible" active-text="可关闭" inactive-text="不可关闭" />
              </div>
            </el-form-item>
          </div>
          <div class="form-grid">
            <el-form-item label="开始时间"><el-date-picker v-model="form.startAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="不限制" /></el-form-item>
            <el-form-item label="结束时间"><el-date-picker v-model="form.endAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="不限制" /></el-form-item>
          </div>
          <el-divider>按钮</el-divider>
          <div v-for="(button, index) in form.buttons" :key="index" class="button-row">
            <el-input v-model="button.text" placeholder="按钮文案" />
            <el-input v-model="button.link" placeholder="/pages/index/index 或 https://..." />
            <el-select v-model="button.style" style="width: 120px">
              <el-option label="主按钮" value="primary" />
              <el-option label="次按钮" value="secondary" />
            </el-select>
          </div>
        </el-form>

        <section class="popup-preview-panel">
          <div class="preview-phone">
            <div class="preview-page-title">清冠优选</div>
            <div class="preview-page-subtitle">精选商家与优质好物</div>
            <div class="preview-mask">
              <article :class="previewTypeClass">
                <button v-if="form.dismissible" class="preview-close">×</button>
                <div v-if="form.imageUrl" class="preview-image" :style="{ backgroundImage: `url(${form.imageUrl})` }"></div>
                <div v-else class="preview-image fallback">{{ labelOf(typeOptions, form.type) }}</div>
                <div class="preview-content">
                  <h3>{{ form.title || "重要通知" }}</h3>
                  <p v-if="form.subtitle" class="preview-subtitle">{{ form.subtitle }}</p>
                  <strong v-if="form.emphasis" class="preview-emphasis">{{ form.emphasis }}</strong>
                  <p v-if="form.content" class="preview-copy">{{ form.content }}</p>
                  <div class="preview-actions">
                    <button v-for="button in form.buttons.filter((item) => item.text)" :key="button.text" :class="button.style">{{ button.text }}</button>
                  </div>
                </div>
              </article>
            </div>
          </div>
          <el-alert type="warning" show-icon :closable="false" title="小程序端不支持直接打开普通外链，按钮跳转建议优先使用 /pages/... 页面路径。" />
        </section>
      </div>
      <template #footer>
        <el-button :disabled="writeLocked" @click="drawer = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="uploading || Boolean(actionKey)" @click="submit">保存弹窗</el-button>
      </template>
    </el-drawer>

    <el-dialog v-model="checkDialog" title="营销弹窗生效检测" width="min(860px, 95vw)">
      <div class="check-panel">
        <div class="check-form">
          <el-select v-if="isPlatformAdmin()" v-model="checkForm.tenantId" clearable filterable placeholder="平台全局 / 选择商家" :disabled="checkLoading">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
          </el-select>
          <el-select v-model="checkForm.pageKey" placeholder="检测页面" :disabled="checkLoading">
            <el-option v-for="item in placementOptions.filter((item) => item.value !== 'all')" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="checkForm.platform" placeholder="检测平台" :disabled="checkLoading">
            <el-option label="H5" value="h5" />
            <el-option label="微信小程序" value="mp-weixin" />
          </el-select>
          <el-button type="primary" :loading="checkLoading" @click="runEffectiveCheck">开始检测</el-button>
          <el-button @click="openFrontendPreview">前台预览</el-button>
          <el-button @click="clearPopupFrequencyCache">清频次缓存</el-button>
        </div>

        <el-alert
          v-if="checkErrorMessage"
          type="error"
          show-icon
          :closable="false"
          :title="checkErrorMessage"
        >
          <template #default><el-button size="small" :loading="checkLoading" @click="runEffectiveCheck">重新检测</el-button></template>
        </el-alert>

        <el-alert
          v-if="checkResult"
          :type="checkResult.matched ? 'success' : 'warning'"
          show-icon
          :closable="false"
          :title="checkResult.matched ? `将展示：${checkResult.hit?.title}` : '当前页面和平台没有命中可展示弹窗'"
        />

        <el-table v-if="checkResult" v-loading="checkLoading" :data="checkResult.checks" border empty-text="暂无可检测弹窗">
          <el-table-column label="弹窗" min-width="180" show-overflow-tooltip>
            <template #default="{ row }"><strong>{{ row.title }}</strong></template>
          </el-table-column>
          <el-table-column label="结果" width="110">
            <template #default="{ row }"><el-tag :type="row.matched ? 'success' : 'warning'">{{ row.statusText }}</el-tag></template>
          </el-table-column>
          <el-table-column label="未命中原因 / 风险提醒" min-width="320">
            <template #default="{ row }">
              <div v-if="row.reasons?.length" class="reason-list">
                <el-tag v-for="item in row.reasons" :key="item.code" size="small" type="warning">{{ item.message }}</el-tag>
              </div>
              <div v-else class="reason-list"><el-tag size="small" type="success">会被公开接口返回</el-tag></div>
              <div v-if="row.warnings?.length" class="reason-list warning-list">
                <el-tag v-for="item in row.warnings" :key="item.code" size="small" type="danger">{{ item.message }}</el-tag>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.muted-line { margin-top: 4px; color: #667085; font-size: 12px; line-height: 1.5; }
.popup-editor { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
.popup-form { min-width: 0; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.upload-line { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.switch-row { display: flex; flex-wrap: wrap; gap: 18px; align-items: center; min-height: 32px; }
.button-row { display: grid; grid-template-columns: 150px minmax(0, 1fr) 120px; gap: 8px; margin-bottom: 10px; }
.popup-preview-panel { display: grid; gap: 12px; }
.preview-phone { position: relative; width: 300px; min-height: 560px; overflow: hidden; border-radius: 24px; background: linear-gradient(180deg, #ffd45a 0%, #fff2b8 100%); border: 1px solid #f1c76a; box-shadow: 0 18px 44px rgba(154, 106, 36, 0.18); padding: 36px 14px 18px; }
.preview-page-title { color: #9e1b12; font-size: 20px; font-weight: 900; }
.preview-page-subtitle { margin-top: 8px; color: #9a6a24; font-size: 13px; }
.preview-mask { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: rgba(15, 23, 42, 0.48); }
.popup-preview-card { position: relative; width: 100%; overflow: hidden; border-radius: 16px; background: #fff; box-shadow: 0 22px 52px rgba(15, 23, 42, 0.24); }
.popup-preview-card.wuxing { background: #fffdf5; border: 1px solid #f1c76a; }
.preview-close { position: absolute; z-index: 1; top: 8px; right: 8px; width: 28px; height: 28px; border: 0; border-radius: 999px; background: rgba(15, 23, 42, 0.42); color: #fff; font-size: 20px; line-height: 1; }
.preview-image { height: 150px; display: grid; place-items: center; background-size: cover; background-position: center; color: #9e1b12; font-weight: 900; }
.preview-image.fallback { background: linear-gradient(135deg, #ffd45a 0%, #fff2b8 100%); }
.preview-content { padding: 16px; }
.preview-content h3 { margin: 0; color: #1f2937; font-size: 18px; }
.preview-subtitle { margin: 8px 0 0; color: #667085; font-size: 13px; }
.preview-emphasis { display: block; margin-top: 12px; color: #e8412f; font-size: 22px; line-height: 1.3; }
.preview-copy { margin: 12px 0 0; color: #344054; font-size: 13px; line-height: 1.65; white-space: pre-line; }
.preview-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
.preview-actions button { min-height: 40px; border: 0; border-radius: 999px; font-weight: 800; }
.preview-actions .primary { background: linear-gradient(135deg, #2e5d7f 0%, #d77a4d 100%); color: #fff; }
.preview-actions .secondary { background: #eef3f6; color: #344054; }
.check-panel { display: grid; gap: 14px; }
.check-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.check-form .el-select { width: 180px; }
.reason-list { display: flex; flex-wrap: wrap; gap: 6px; }
.warning-list { margin-top: 6px; }
.pagination { margin-top: 16px; justify-content: flex-end; }
@media (max-width: 1100px) {
  .popup-editor { grid-template-columns: 1fr; }
  .preview-phone { width: 100%; max-width: 360px; }
}
@media (max-width: 760px) {
  .form-grid { grid-template-columns: 1fr; gap: 0; }
  .button-row { grid-template-columns: 1fr; }
  .button-row .el-select { width: 100% !important; }
  .check-form { align-items: stretch; }
  .check-form .el-select { width: 100%; }
  .pagination { justify-content: flex-start; overflow-x: auto; }
}
</style>
