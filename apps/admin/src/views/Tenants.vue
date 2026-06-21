<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { ArrowDown, ArrowRight, CopyDocument, Edit, Grid, Money, Plus, Refresh, UserFilled, View } from "@element-plus/icons-vue";
import { useRoute, useRouter } from "vue-router";
import { api, downloadFile } from "../api";
import H5QrDialog from "../components/H5QrDialog.vue";
import { copyToClipboard, h5PreviewUrl, openH5Preview } from "../h5-preview";

type TenantRow = {
  id: number;
  code: string;
  name: string;
  region?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  enabled: boolean;
  createdAt?: string;
  adminCount?: number;
  enabledAdminCount?: number;
  agentCount?: number;
  enabledAgentCount?: number;
  paymentAccountCount?: number;
  enabledPaymentAccountCount?: number;
  pendingActivityCount?: number;
  pendingRegistrationCount?: number;
  pendingRefundCount?: number;
  callbackRiskCount?: number;
  pendingReconciliationCount?: number;
  homepageSectionCount?: number;
  totalActivityCount?: number;
  totalCourseCount?: number;
  publishedCourseCount?: number;
  totalRegistrationCount?: number;
  totalOrderCount?: number;
  launchReadiness?: {
    score: number;
    status: "go" | "warn" | "no_go";
    label: string;
    blockers: string[];
    warnings: string[];
    actions: string[];
  };
  operationHealth?: {
    score: number;
    status: "healthy" | "watch" | "risk";
    label: string;
    risks: string[];
    warnings: string[];
    actions: string[];
  };
  subscriptionStatus?: {
    plan: string;
    planLabel: string;
    expiresAt: string | null;
    status: "no_expiry" | "active" | "expiring_soon" | "expired";
    label: string;
    daysRemaining: number | null;
    renewalRequired: boolean;
    action: string;
  };
  renewalReminder?: {
    level: "none" | "watch" | "urgent";
    label: string;
    actionRequired: boolean;
    daysRemaining: number | null;
    dueDate: string | null;
    message: string;
  };
  remark?: string | null;
  settings: {
    activityPublishReviewRequired: boolean;
    registrationReviewEnabled: boolean;
    paymentAccountEditable: boolean;
    mallEnabled: boolean;
    packagePlan?: string;
    packageExpiresAt?: string | null;
  };
};

const rows = ref<TenantRow[]>([]);
const selectedRows = ref<TenantRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const drawer = ref(false);
const h5QrDialogVisible = ref(false);
const editingId = ref<number | null>(null);
const drawerRow = ref<TenantRow | null>(null);
const qrTenant = ref<TenantRow | null>(null);
const route = useRoute();
const router = useRouter();
const filters = reactive({ readiness: "", launch: "", todo: "", keyword: "" });
const tenantFilterStorageKey = "admin.tenants.filters";
const form = reactive({
  code: "",
  name: "",
  region: "",
  contactName: "",
  contactPhone: "",
  enabled: true,
  activityPublishReviewRequired: true,
  registrationReviewEnabled: false,
  paymentAccountEditable: true,
  mallEnabled: true,
  packagePlan: "standard",
  packageExpiresAt: "",
  remark: ""
});

const readinessOptions = [
  { label: "全部状态", value: "" },
  { label: "待开账号", value: "need_admin" },
  { label: "商城未开通", value: "mall_closed" },
  { label: "待配收款", value: "need_payment" },
  { label: "收款关闭", value: "payment_closed" },
  { label: "可运营", value: "ready" },
  { label: "已停用", value: "disabled" }
];
const launchOptions = [
  { label: "全部上线结论", value: "" },
  { label: "可上线", value: "go" },
  { label: "可灰度", value: "warn" },
  { label: "暂不可上线", value: "no_go" }
];
const todoOptions = [
  { label: "全部待办", value: "" },
  { label: "需处理商家", value: "attention" },
  { label: "有审核待办", value: "review" },
  { label: "有财务风险", value: "finance" },
  { label: "套餐到期", value: "subscription" },
  { label: "无待办风险", value: "clear" },
  { label: "已就绪无风险", value: "ready_clear" }
];
const packageOptions = [
  { label: "试运营", value: "trial" },
  { label: "标准版", value: "standard" },
  { label: "城市合伙人", value: "city_partner" },
  { label: "核心合伙人", value: "core_partner" },
  { label: "定制版", value: "custom" }
];
const packagePermissionTemplates: Record<string, Pick<typeof form, "activityPublishReviewRequired" | "registrationReviewEnabled" | "paymentAccountEditable" | "mallEnabled">> = {
  trial: { activityPublishReviewRequired: true, registrationReviewEnabled: false, paymentAccountEditable: false, mallEnabled: false },
  standard: { activityPublishReviewRequired: true, registrationReviewEnabled: false, paymentAccountEditable: true, mallEnabled: true },
  city_partner: { activityPublishReviewRequired: true, registrationReviewEnabled: true, paymentAccountEditable: true, mallEnabled: true },
  core_partner: { activityPublishReviewRequired: false, registrationReviewEnabled: true, paymentAccountEditable: true, mallEnabled: true },
  custom: { activityPublishReviewRequired: false, registrationReviewEnabled: true, paymentAccountEditable: true, mallEnabled: true }
};

const readinessValues = new Set(readinessOptions.map((item) => item.value));
const launchValues = new Set(launchOptions.map((item) => item.value));
const todoValues = new Set(todoOptions.map((item) => item.value));

const filteredRows = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  return rows.value
    .filter((row) => {
      const readinessMatched = !filters.readiness || tenantReadinessKey(row) === filters.readiness;
      if (!readinessMatched) return false;
      const launchMatched = !filters.launch || row.launchReadiness?.status === filters.launch;
      if (!launchMatched) return false;
      if (!tenantTodoMatched(row)) return false;
      if (!keyword) return true;
      return tenantKeywordText(row).includes(keyword);
    })
    .sort((a, b) => { var sa = tenantAttentionScore(a), sb = tenantAttentionScore(b); if (sa !== sb) return sb - sa; var da = new Date(a.createdAt || 0).getTime(), db = new Date(b.createdAt || 0).getTime(); if (da !== db) return db - da; return a.id - b.id; });
});
const readinessSummary = computed(() =>
  readinessOptions.map((item) => ({
    ...item,
    count: item.value ? rows.value.filter((row) => tenantReadinessKey(row) === item.value).length : rows.value.length
  }))
);
const todoSummary = computed(() =>
  todoOptions.map((item) => ({
    ...item,
    count:
      item.value === "review"
        ? rows.value.filter((row) => tenantHasReviewTodo(row)).length
        : item.value === "finance"
          ? rows.value.filter((row) => tenantHasFinanceRisk(row)).length
          : item.value === "subscription"
            ? rows.value.filter((row) => tenantHasSubscriptionRisk(row)).length
          : item.value === "attention"
            ? rows.value.filter((row) => tenantNeedsAttention(row)).length
            : item.value === "ready_clear"
              ? rows.value.filter((row) => tenantIsReadyClear(row)).length
            : item.value === "clear"
              ? rows.value.filter((row) => !tenantHasReviewTodo(row) && !tenantHasFinanceRisk(row) && !tenantHasSubscriptionRisk(row) && row.operationHealth?.status === "healthy").length
              : rows.value.length
  }))
);
const launchSummary = computed(() =>
  launchOptions.map((item) => ({
    ...item,
    count: item.value ? rows.value.filter((row) => row.launchReadiness?.status === item.value).length : rows.value.length
  }))
);
const activeTenantFilterLabels = computed(() => {
  const labels: string[] = [];
  const readiness = readinessOptions.find((item) => item.value === filters.readiness);
  const launch = launchOptions.find((item) => item.value === filters.launch);
  const todo = todoOptions.find((item) => item.value === filters.todo);
  const keyword = filters.keyword.trim();
  if (readiness?.value) labels.push(`开通：${readiness.label}`);
  if (launch?.value) labels.push(`上线：${launch.label}`);
  if (todo?.value) labels.push(`待办：${todo.label}`);
  if (keyword) labels.push(`关键词：${keyword}`);
  return labels;
});
const tenantFilterSummaryText = computed(() =>
  activeTenantFilterLabels.value.length ? activeTenantFilterLabels.value.join(" / ") : "全部商家"
);
const permissionMode = computed(() => route.query.mode === "permissions");
const tenantQrUrl = computed(() => (qrTenant.value ? h5PreviewUrl(qrTenant.value.code) : ""));
const tenantQrScopeName = computed(() => qrTenant.value ? `${qrTenant.value.name || qrTenant.value.code} H5` : "商家 H5");

function handleSelectionChange(val: TenantRow[]) { selectedRows.value = val; }

async function batchUpdate(action: string, value?: boolean) {
  var ids = selectedRows.value.map(function(r) { return r.id; });
  if (!ids.length) return;
  var msg = "";
  switch (action) {
    case "enable": msg = "确定启用选中的 " + ids.length + " 个商家？"; break;
    case "disable": msg = "确定停用选中的 " + ids.length + " 个商家？"; break;
    case "review_required": msg = "设置选中的 " + ids.length + " 个商家活动发布需要审核？"; break;
    case "review_optional": msg = "设置选中的 " + ids.length + " 个商家活动发布不需要审核？"; break;
    case "registration_enabled": msg = "允许选中的 " + ids.length + " 个商家开启报名审核？"; break;
    case "registration_disabled": msg = "禁止选中的 " + ids.length + " 个商家开启报名审核？"; break;
    case "payment_enabled": msg = "允许选中的 " + ids.length + " 个商家配置收款方式？"; break;
    case "payment_disabled": msg = "禁止选中的 " + ids.length + " 个商家配置收款方式？"; break;
    case "mall_enabled": msg = "给选中的 " + ids.length + " 个商家开通商城运营？"; break;
    case "mall_disabled": msg = "关闭选中的 " + ids.length + " 个商家的商城运营？关闭后商家端商城菜单和前台商城会不可用。"; break;
  }
  if (!confirm(msg)) return;
  try {
    if (action === "enable" || action === "disable") {
      for (var i = 0; i < ids.length; i++) {
        await api.patch("/admin/tenants/" + ids[i], { enabled: action === "enable" });
      }
    } else {
      var pSettings: Record<string, boolean> = {};
      switch (action) {
        case "review_required": pSettings.activityPublishReviewRequired = true; break;
        case "review_optional": pSettings.activityPublishReviewRequired = false; break;
        case "registration_enabled": pSettings.registrationReviewEnabled = true; break;
        case "registration_disabled": pSettings.registrationReviewEnabled = false; break;
        case "payment_enabled": pSettings.paymentAccountEditable = true; break;
        case "payment_disabled": pSettings.paymentAccountEditable = false; break;
        case "mall_enabled": pSettings.mallEnabled = true; break;
        case "mall_disabled": pSettings.mallEnabled = false; break;
      }
      for (var i = 0; i < ids.length; i++) {
        await api.post("/admin/tenants/" + ids[i] + "/permissions", pSettings);
      }
    }
    ElMessage.success("批量操作完成，共处理 " + ids.length + " 个商家");
    selectedRows.value = [];
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "批量操作失败");
  }
}

async function exportTenants() {
  try {
    await downloadFile("/admin/tenants/export", "商家列表.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出商家列表失败");
  }
}

async function load() {
  loading.value = true;
  try {
    rows.value = await api.get<any, TenantRow[]>("/admin/tenants");
    syncDrawerTenantRow();
  } catch (error: any) {
    ElMessage.error(error.message || "加载商家失败");
  } finally {
    loading.value = false;
  }
}

function syncDrawerTenantRow() {
  if (!drawerRow.value) return;
  const latest = rows.value.find((row) => row.id === drawerRow.value?.id);
  if (latest) drawerRow.value = latest;
  else {
    drawerRow.value = null;
    drawer.value = false;
  }
}

function restoreTenantFilters() {
  try {
    const raw = window.localStorage.getItem(tenantFilterStorageKey);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<typeof filters>;
    filters.readiness = readinessValues.has(saved.readiness || "") ? saved.readiness || "" : "";
    filters.launch = launchValues.has(saved.launch || "") ? saved.launch || "" : "";
    filters.todo = todoValues.has(saved.todo || "") ? saved.todo || "" : "";
    filters.keyword = typeof saved.keyword === "string" ? saved.keyword.slice(0, 80) : "";
  } catch {
    window.localStorage.removeItem(tenantFilterStorageKey);
  }
}

function persistTenantFilters() {
  window.localStorage.setItem(
    tenantFilterStorageKey,
    JSON.stringify({ readiness: filters.readiness, launch: filters.launch, todo: filters.todo, keyword: filters.keyword })
  );
}

function resetTenantFilters() {
  filters.readiness = "";
  filters.launch = "";
  filters.todo = "";
  filters.keyword = "";
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { code: "", name: "", region: "", contactName: "", contactPhone: "", enabled: true, activityPublishReviewRequired: true, registrationReviewEnabled: false, paymentAccountEditable: true, mallEnabled: true, packagePlan: "standard", packageExpiresAt: "", remark: "" });
  dialog.value = true;
}

function openEdit(row: TenantRow) {
  editingId.value = row.id;
  Object.assign(form, {
    code: row.code,
    name: row.name,
    region: row.region || "",
    contactName: row.contactName || "",
    contactPhone: row.contactPhone || "",
    enabled: row.enabled,
    activityPublishReviewRequired: row.settings?.activityPublishReviewRequired ?? true,
    registrationReviewEnabled: row.settings?.registrationReviewEnabled ?? false,
    paymentAccountEditable: row.settings?.paymentAccountEditable ?? true,
    mallEnabled: row.settings?.mallEnabled ?? true,
    packagePlan: row.settings?.packagePlan || row.subscriptionStatus?.plan || "standard",
    packageExpiresAt: row.settings?.packageExpiresAt || row.subscriptionStatus?.expiresAt || "",
    remark: row.remark || ""
  });
  dialog.value = true;
}

function openDetail(row: TenantRow) {
  drawerRow.value = row;
  drawer.value = true;
}

function goCreateTenantAdmin(row: TenantRow) {
  goTenantAdminAccounts(row);
}

function goTenantAdminAccounts(row: TenantRow) {
  router.push({ path: "/admins", query: { tenantId: row.id } });
}

function goConfigurePayment(row: TenantRow) {
  router.push({ path: "/agents", query: { tenantId: row.id } });
}

function goTenantPendingActivities(row: TenantRow) {
  router.push({ path: "/activities", query: { tenantId: row.id, status: "pending_approval" } });
}

function goTenantPendingRegistrations(row: TenantRow) {
  router.push({ path: "/registrations", query: { tenantId: row.id, status: "pending_review" } });
}

function goTenantFinanceRisk(row: TenantRow) {
  router.push({ path: "/finance", query: { tenantId: row.id } });
}

function goTenantOperations(row: TenantRow) {
  router.push({ path: "/activities", query: { tenantId: row.id } });
}

function previewTenantH5(row: TenantRow) {
  openH5Preview(row.code);
}

async function copyTenantH5Url(row: TenantRow) {
  await copyToClipboard(h5PreviewUrl(row.code));
  ElMessage.success("H5 商家链接已复制");
}

function showTenantH5Qr(row: TenantRow) {
  qrTenant.value = row;
  h5QrDialogVisible.value = true;
}

function goTenantOperationLogs(row: TenantRow) {
  router.push({ path: "/operation-logs", query: { tenantId: row.id } });
}

function goTenantLoginLogs(row: TenantRow) {
  router.push({ path: "/admin-login-logs", query: { tenantId: row.id } });
}

function goTenantNextAction(row: TenantRow) {
  const status = tenantReadinessKey(row);
  if (status === "disabled") return openEdit(row);
  if (status === "need_admin") return goCreateTenantAdmin(row);
  if (status === "mall_closed") return openDetail(row);
  if (status === "need_payment" || status === "payment_closed") return goConfigurePayment(row);
  if (tenantHasFinanceRisk(row)) return goTenantFinanceRisk(row);
  if (Number(row.pendingActivityCount || 0) > 0) return goTenantPendingActivities(row);
  if (Number(row.pendingRegistrationCount || 0) > 0) return goTenantPendingRegistrations(row);
  return goTenantOperations(row);
}

function setReadinessFilter(value: string) {
  filters.readiness = value;
}

function setTodoFilter(value: string) {
  filters.todo = value;
}

function tenantHasReviewTodo(row: TenantRow) {
  return Number(row.pendingActivityCount || 0) + Number(row.pendingRegistrationCount || 0) > 0;
}

function tenantHasFinanceRisk(row: TenantRow) {
  return Number(row.pendingRefundCount || 0) + Number(row.callbackRiskCount || 0) + Number(row.pendingReconciliationCount || 0) > 0;
}

function tenantHasOperationHealthRisk(row: TenantRow) {
  return row.operationHealth?.status === "risk" || row.operationHealth?.status === "watch";
}

function tenantHasSubscriptionRisk(row: TenantRow) {
  return row.subscriptionStatus?.status === "expired" || row.subscriptionStatus?.status === "expiring_soon";
}

function tenantNeedsAttention(row: TenantRow) {
  return tenantReadinessKey(row) !== "ready" || tenantHasReviewTodo(row) || tenantHasFinanceRisk(row) || tenantHasSubscriptionRisk(row) || tenantHasOperationHealthRisk(row);
}

function tenantIsReadyClear(row: TenantRow) {
  return tenantReadinessKey(row) === "ready" && !tenantHasReviewTodo(row) && !tenantHasFinanceRisk(row) && !tenantHasSubscriptionRisk(row) && row.operationHealth?.status === "healthy";
}

function tenantAttentionScore(row: TenantRow) {
  const readinessWeight: Record<string, number> = {
    disabled: 1000,
    need_admin: 900,
    mall_closed: 850,
    need_payment: 800,
    payment_closed: 700,
    ready: 0
  };
  return (
    readinessWeight[tenantReadinessKey(row)] +
    (row.subscriptionStatus?.status === "expired" ? 500 : row.subscriptionStatus?.status === "expiring_soon" ? 120 : 0) +
    (row.operationHealth?.status === "risk" ? 260 : row.operationHealth?.status === "watch" ? 90 : 0) +
    Number(row.callbackRiskCount || 0) * 20 +
    Number(row.pendingReconciliationCount || 0) * 18 +
    Number(row.pendingRefundCount || 0) * 16 +
    Number(row.pendingActivityCount || 0) * 12 +
    Number(row.pendingRegistrationCount || 0) * 8
  );
}

function tenantAttentionStatus(row: TenantRow) {
  const status = tenantReadinessKey(row);
  if (status === "disabled") return { label: "已停用", type: "info" as const };
  if (status === "need_admin") return { label: "先开账号", type: "danger" as const };
  if (status === "mall_closed") return { label: "开通商城", type: "warning" as const };
  if (status === "need_payment") return { label: "先配收款", type: "warning" as const };
  if (status === "payment_closed") return { label: "确认收款权限", type: "info" as const };
  if (row.subscriptionStatus?.status === "expired") return { label: "套餐已到期", type: "danger" as const };
  if (row.subscriptionStatus?.status === "expiring_soon") return { label: "续费提醒", type: "warning" as const };
  if (tenantHasFinanceRisk(row)) return { label: "财务优先", type: "danger" as const };
  if (row.operationHealth?.status === "risk") return { label: "经营风险", type: "danger" as const };
  if (row.operationHealth?.status === "watch") return { label: "经营观察", type: "warning" as const };
  if (tenantHasReviewTodo(row)) return { label: "审核优先", type: "warning" as const };
  return { label: "正常运营", type: "success" as const };
}

function tenantLaunchStatus(row: TenantRow) {
  const status = row.launchReadiness?.status;
  if (status === "go") return { label: row.launchReadiness?.label || "可上线", type: "success" as const };
  if (status === "warn") return { label: row.launchReadiness?.label || "可灰度", type: "warning" as const };
  return { label: row.launchReadiness?.label || "暂不可上线", type: "danger" as const };
}

function tenantLaunchScore(row: TenantRow) {
  return Number(row.launchReadiness?.score ?? 0);
}

function tenantLaunchIssues(row: TenantRow) {
  return row.launchReadiness?.actions?.length ? row.launchReadiness.actions.join("；") : "上线关键项均已满足";
}

function tenantHealthStatus(row: TenantRow) {
  const status = row.operationHealth?.status;
  if (status === "healthy") return { label: row.operationHealth?.label || "健康", type: "success" as const };
  if (status === "watch") return { label: row.operationHealth?.label || "观察", type: "warning" as const };
  return { label: row.operationHealth?.label || "风险", type: "danger" as const };
}

function tenantHealthScore(row: TenantRow) {
  return Number(row.operationHealth?.score ?? 0);
}

function tenantHealthIssues(row: TenantRow) {
  return row.operationHealth?.actions?.length ? row.operationHealth.actions.join("；") : "经营健康项均正常";
}

function tenantTodoMatched(row: TenantRow) {
  const hasReviewTodo = tenantHasReviewTodo(row);
  const hasFinanceRisk = tenantHasFinanceRisk(row);
  if (filters.todo === "attention") return tenantNeedsAttention(row);
  if (filters.todo === "review") return hasReviewTodo;
  if (filters.todo === "finance") return hasFinanceRisk;
  if (filters.todo === "subscription") return tenantHasSubscriptionRisk(row);
  if (filters.todo === "clear") return !hasReviewTodo && !hasFinanceRisk && !tenantHasSubscriptionRisk(row) && row.operationHealth?.status === "healthy";
  if (filters.todo === "ready_clear") return tenantIsReadyClear(row);
  return true;
}

function tenantKeywordText(row: TenantRow) {
  return [row.name, row.code, row.region, row.contactName, row.contactPhone, row.operationHealth?.label, ...(row.operationHealth?.actions || [])].filter(Boolean).join(" ").toLowerCase();
}

function tenantAdminStatus(row: TenantRow) {
  const enabledCount = Number(row.enabledAdminCount || 0);
  const totalCount = Number(row.adminCount || 0);
  if (enabledCount > 0) return { label: `${enabledCount} 个可登录`, type: "success" as const };
  if (totalCount > 0) return { label: "账号已停用", type: "warning" as const };
  return { label: "未开管理员", type: "danger" as const };
}

function paymentAccountStatus(row: TenantRow) {
  const enabledPaymentAccountCount = Number(row.enabledPaymentAccountCount || 0);
  const paymentAccountCount = Number(row.paymentAccountCount || 0);
  const enabledAgentCount = Number(row.enabledAgentCount || 0);
  const agentCount = Number(row.agentCount || 0);
  if (enabledPaymentAccountCount > 0) return { label: `${enabledPaymentAccountCount} 个启用`, type: "success" as const };
  if (paymentAccountCount > 0) return { label: "账户停用", type: "warning" as const };
  if (enabledAgentCount > 0) return { label: "未配账户", type: "danger" as const };
  if (agentCount > 0) return { label: "主体停用", type: "warning" as const };
  if (!row.settings?.paymentAccountEditable) return { label: "配置关闭", type: "info" as const };
  return { label: "未建主体", type: "danger" as const };
}

function mallAuthorizationStatus(row: TenantRow) {
  if (!row.enabled) return { label: "商家停用", type: "info" as const };
  if (row.settings?.mallEnabled === false) return { label: "未开通", type: "warning" as const };
  return { label: "已授权", type: "success" as const };
}

function tenantReadinessKey(row: TenantRow) {
  if (!row.enabled) return "disabled";
  if (Number(row.enabledAdminCount || 0) <= 0) return "need_admin";
  if (row.settings?.mallEnabled === false) return "mall_closed";
  if (Number(row.enabledPaymentAccountCount || 0) <= 0) {
    return row.settings?.paymentAccountEditable ? "need_payment" : "payment_closed";
  }
  return "ready";
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function tenantReadinessStatus(row: TenantRow) {
  const status = tenantReadinessKey(row);
  if (status === "disabled") return { label: "已停用", type: "info" as const };
  if (status === "need_admin") return { label: "待开账号", type: "danger" as const };
  if (status === "mall_closed") return { label: "商城未开通", type: "warning" as const };
  if (status === "need_payment") return { label: "待配收款", type: "warning" as const };
  if (status === "payment_closed") return { label: "收款关闭", type: "info" as const };
  return { label: "可运营", type: "success" as const };
}

function tenantNextAction(row: TenantRow) {
  const status = tenantReadinessKey(row);
  if (status === "disabled") return "商家已停用，恢复启用后再继续开通";
  if (status === "need_admin") return "先创建商家管理员账号，让商家可登录后台";
  if (status === "mall_closed") return "平台先开通商城授权，商家端才会显示商品、订单、营销和收款配置";
  if (status === "need_payment") return "配置并启用收款主体和收款账户";
  if (status === "payment_closed") return "平台已关闭收款配置权限，需确认是否由平台代配置";
  if (row.subscriptionStatus?.status === "expired") return "商家套餐已到期，先续费或延长到期日";
  if (row.subscriptionStatus?.status === "expiring_soon") return row.subscriptionStatus.action || "商家套餐即将到期，请联系续费";
  if (tenantHasFinanceRisk(row)) return "先处理待审退款或异常支付回调，再继续运营";
  if (row.operationHealth?.actions?.length) return row.operationHealth.actions[0];
  if (tenantHasReviewTodo(row)) return "先处理待平台审核活动或待审核报名";
  return "已具备后台账号和收款账户，可进入运营";
}

function tenantPendingReviewStatus(row: TenantRow) {
  const pendingActivityCount = Number(row.pendingActivityCount || 0);
  const pendingRegistrationCount = Number(row.pendingRegistrationCount || 0);
  if (!pendingActivityCount && !pendingRegistrationCount) return { label: "无待办", type: "info" as const };
  return {
    label: `活动 ${pendingActivityCount} / 报名 ${pendingRegistrationCount}`,
    type: "warning" as const
  };
}

function tenantFinanceRiskStatus(row: TenantRow) {
  const pendingRefundCount = Number(row.pendingRefundCount || 0);
  const callbackRiskCount = Number(row.callbackRiskCount || 0);
  const pendingReconciliationCount = Number(row.pendingReconciliationCount || 0);
  if (!pendingRefundCount && !callbackRiskCount && !pendingReconciliationCount) return { label: "无风险", type: "success" as const };
  return {
    label: `退款 ${pendingRefundCount} / 回调 ${callbackRiskCount} / 对账 ${pendingReconciliationCount}`,
    type: callbackRiskCount || pendingReconciliationCount ? ("danger" as const) : ("warning" as const)
  };
}

function tenantSubscriptionTag(row: TenantRow) {
  const status = row.subscriptionStatus?.status;
  if (status === "expired") return "danger";
  if (status === "expiring_soon") return "warning";
  if (status === "active") return "success";
  return "info";
}

function tenantRenewalTag(row: TenantRow) {
  const level = row.renewalReminder?.level;
  if (level === "urgent") return "danger";
  if (level === "watch") return "warning";
  return "info";
}

function applyPackagePermissionTemplate() {
  const template = packagePermissionTemplates[form.packagePlan] || packagePermissionTemplates.standard;
  Object.assign(form, template);
  const label = packageOptions.find((item) => item.value === form.packagePlan)?.label || "当前套餐";
  ElMessage.success(`已套用${label}权限模板`);
}

async function submit() {
  if (!form.code.trim()) return ElMessage.warning("请填写商家编码");
  if (!form.name.trim()) return ElMessage.warning("请填写商家名称");
  saving.value = true;
  try {
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      region: form.region.trim() || undefined,
      contactName: form.contactName.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      remark: form.remark?.trim() || undefined,
      enabled: form.enabled,
      settings: {
        activityPublishReviewRequired: form.activityPublishReviewRequired,
        registrationReviewEnabled: form.registrationReviewEnabled,
        paymentAccountEditable: form.paymentAccountEditable,
        mallEnabled: form.mallEnabled,
        packagePlan: form.packagePlan,
        packageExpiresAt: form.packageExpiresAt || null
      }
    };
    if (editingId.value) await api.patch(`/admin/tenants/${editingId.value}`, payload);
    else await api.post("/admin/tenants", payload);
    dialog.value = false;
    ElMessage.success("商家已保存");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function updatePermissions(row: TenantRow) {
  try {
    await api.post(`/admin/tenants/${row.id}/permissions`, row.settings);
    ElMessage.success("权限已更新");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "更新权限失败");
    await load();
  }
}

watch(filters, persistTenantFilters, { deep: true });

onMounted(() => {
  restoreTenantFilters();
  load();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h2>{{ permissionMode ? "商家权限配置" : "商家/代理管理" }}</h2>
        <p class="subtitle">
          {{ permissionMode ? "超级管理员可按商家单独控制活动发布、报名审核和收款配置权限。" : "商家/代理作为租户独立运营，活动、订单、报名、收款账户按租户隔离。" }}
        </p>
      </div>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建商家</el-button>
      </div>
    </div>

    <div class="table-card">
      <el-alert
        v-if="permissionMode"
        class="permission-mode-alert"
        type="info"
        show-icon
        :closable="false"
        title="权限配置视图"
        description="活动发布审核决定商家活动是否必须提交平台审核；报名审核权限决定商家是否可开启用户报名审核；收款配置权限决定商家是否可维护收款账户、支付方式和付款说明。"
      />
      <div class="readiness-summary">
        <button
          v-for="item in readinessSummary"
          :key="item.value || 'all'"
          class="readiness-item"
          :class="{ active: filters.readiness === item.value }"
          type="button"
          @click="setReadinessFilter(item.value)"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.count }}</strong>
        </button>
      </div>
      <div class="readiness-summary launch-summary">
        <button
          v-for="item in launchSummary"
          :key="item.value || 'all-launch'"
          class="readiness-item"
          :class="{ active: filters.launch === item.value }"
          type="button"
          @click="filters.launch = item.value"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.count }}</strong>
        </button>
      </div>
      <div class="readiness-summary todo-summary">
        <button
          v-for="item in todoSummary"
          :key="item.value || 'all-todo'"
          class="readiness-item"
          :class="{ active: filters.todo === item.value }"
          type="button"
          @click="setTodoFilter(item.value)"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.count }}</strong>
        </button>
      </div>
      <el-form class="filters" inline>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="商家名称/编码/地区/联系人" style="width: 260px" />
        </el-form-item>
        <el-form-item label="开通状态">
          <el-select v-model="filters.readiness" style="width: 160px">
            <el-option v-for="item in readinessOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="上线结论">
          <el-select v-model="filters.launch" style="width: 160px">
            <el-option v-for="item in launchOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="待办风险">
          <el-select v-model="filters.todo" style="width: 160px">
            <el-option v-for="item in todoOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetTenantFilters">重置筛选</el-button>
        </el-form-item>
      </el-form>
      <div class="filter-state">
        <div>
          <strong>当前视图</strong>
          <span>命中 {{ filteredRows.length }} / {{ rows.length }} 个商家</span>
        </div>
        <div class="filter-tags">
          <el-tag v-if="!activeTenantFilterLabels.length" type="info">{{ tenantFilterSummaryText }}</el-tag>
          <el-tag v-for="item in activeTenantFilterLabels" v-else :key="item" type="primary" effect="plain">{{ item }}</el-tag>
        </div>
      </div>
      <div class="batch-bar" style="margin: 8px 0; display: flex; align-items: center; gap: 8px; min-height: 36px;">
        <template v-if="selectedRows.length">
          <span>已选 {{ selectedRows.length }} 个商家</span>
          <el-button size="small" type="success" @click="batchUpdate('enable')">批量启用</el-button>
          <el-button size="small" type="info" @click="batchUpdate('disable')">批量停用</el-button>
          <el-dropdown trigger="click" @command="batchUpdate">
            <el-button size="small">批量设置权限<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="review_required">活动发布需要审核</el-dropdown-item>
                <el-dropdown-item command="review_optional">活动发布免审</el-dropdown-item>
                <el-dropdown-item divided command="registration_enabled">允许报名审核</el-dropdown-item>
                <el-dropdown-item command="registration_disabled">禁止报名审核</el-dropdown-item>
                <el-dropdown-item divided command="payment_enabled">可配置收款</el-dropdown-item>
                <el-dropdown-item command="payment_disabled">禁止配置收款</el-dropdown-item>
                <el-dropdown-item divided command="mall_enabled">开通商城</el-dropdown-item>
                <el-dropdown-item command="mall_disabled">关闭商城</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button size="small" @click="selectedRows = [];">取消选择</el-button>
        </template>
      </div>
      <el-table ref="tableRef" :data="filteredRows" stripe v-loading="loading" empty-text="暂无商家" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="40" />
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="商家" min-width="220">
          <template #default="{ row }">
            <div class="merchant-name">{{ row.name }}</div>
            <small>{{ row.code }}</small>
          </template>
        </el-table-column>
        <el-table-column prop="region" label="地区" min-width="120" />
        <el-table-column label="联系人" min-width="160">
          <template #default="{ row }">
            <div>{{ row.contactName || "-" }}</div>
            <small>{{ row.contactPhone || "" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template>
        </el-table-column>
        <el-table-column label="套餐" width="150">
          <template #default="{ row }">
            <div class="status-actions">
              <el-tag :type="tenantSubscriptionTag(row)">{{ row.subscriptionStatus?.label || "未配置" }}</el-tag>
              <small>{{ row.subscriptionStatus?.planLabel || "-" }} / {{ row.subscriptionStatus?.expiresAt || "长期有效" }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="续费提醒" width="170">
          <template #default="{ row }">
            <div class="status-actions">
              <el-tag :type="tenantRenewalTag(row)">{{ row.renewalReminder?.label || "-" }}</el-tag>
              <small>{{ row.renewalReminder?.message || "-" }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="处理优先级" width="130">
          <template #default="{ row }">
            <el-tag :type="tenantAttentionStatus(row).type">{{ tenantAttentionStatus(row).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上线评分" width="150">
          <template #default="{ row }">
            <div class="launch-score">
              <el-tag :type="tenantLaunchStatus(row).type">{{ tenantLaunchStatus(row).label }}</el-tag>
              <span>{{ tenantLaunchScore(row) }} 分</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="经营健康" width="150">
          <template #default="{ row }">
            <div class="launch-score">
              <el-tag :type="tenantHealthStatus(row).type">{{ tenantHealthStatus(row).label }}</el-tag>
              <span>{{ tenantHealthScore(row) }} 分</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="开通状态" width="120">
          <template #default="{ row }">
            <el-tag :type="tenantReadinessStatus(row).type">{{ tenantReadinessStatus(row).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下一步" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="next-action">{{ tenantNextAction(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="审核待办" width="150">
          <template #default="{ row }">
            <el-tag v-if="!row.pendingActivityCount && !row.pendingRegistrationCount" :type="tenantPendingReviewStatus(row).type">{{ tenantPendingReviewStatus(row).label }}</el-tag>
            <div v-else class="todo-actions">
              <el-button link type="warning" @click="goTenantPendingActivities(row)">活动 {{ Number(row.pendingActivityCount || 0) }}</el-button>
              <el-button link type="primary" @click="goTenantPendingRegistrations(row)">报名 {{ Number(row.pendingRegistrationCount || 0) }}</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="财务风险" width="160">
          <template #default="{ row }">
            <el-tag v-if="!row.pendingRefundCount && !row.callbackRiskCount" :type="tenantFinanceRiskStatus(row).type">{{ tenantFinanceRiskStatus(row).label }}</el-tag>
            <div v-else class="todo-actions">
              <el-button link type="warning" @click="goTenantFinanceRisk(row)">退款 {{ Number(row.pendingRefundCount || 0) }}</el-button>
              <el-button link type="danger" @click="goTenantFinanceRisk(row)">回调 {{ Number(row.callbackRiskCount || 0) }}</el-button>
              <el-button link type="danger" @click="goTenantFinanceRisk(row)">对账 {{ Number(row.pendingReconciliationCount || 0) }}</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="后台账号" width="140">
          <template #default="{ row }">
            <div class="status-actions">
              <el-tag :type="tenantAdminStatus(row).type">{{ tenantAdminStatus(row).label }}</el-tag>
              <el-button link type="primary" @click="goTenantAdminAccounts(row)">
                {{ Number(row.adminCount || 0) > 0 ? "查看账号" : "创建管理员" }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="收款账户" width="140">
          <template #default="{ row }">
            <div class="status-actions">
              <el-tag :type="paymentAccountStatus(row).type">{{ paymentAccountStatus(row).label }}</el-tag>
              <el-button link type="success" @click="goConfigurePayment(row)">
                {{ Number(row.paymentAccountCount || 0) > 0 ? "查看收款" : "配置收款" }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="商城授权" width="130">
          <template #default="{ row }">
            <div class="status-actions">
              <el-tag :type="mallAuthorizationStatus(row).type">{{ mallAuthorizationStatus(row).label }}</el-tag>
              <el-switch v-model="row.settings.mallEnabled" @change="updatePermissions(row)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="活动发布审核" width="170">
          <template #default="{ row }"><el-switch v-model="row.settings.activityPublishReviewRequired" @change="updatePermissions(row)" /></template>
        </el-table-column>
        <el-table-column label="报名审核权限" width="170">
          <template #default="{ row }"><el-switch v-model="row.settings.registrationReviewEnabled" @change="updatePermissions(row)" /></template>
        </el-table-column>
        <el-table-column label="收款配置权限" width="170">
          <template #default="{ row }"><el-switch v-model="row.settings.paymentAccountEditable" @change="updatePermissions(row)" /></template>
        </el-table-column>
        <el-table-column label="操作" width="700" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="warning" plain :icon="ArrowRight" @click="goTenantNextAction(row)">处理下一步</el-button>
            <el-button size="small" type="primary" plain :icon="View" @click="previewTenantH5(row)">预览H5</el-button>
            <el-button size="small" plain :icon="CopyDocument" @click="copyTenantH5Url(row)">复制链接</el-button>
            <el-button size="small" plain :icon="Grid" @click="showTenantH5Qr(row)">二维码</el-button>
            <el-button size="small" @click="openDetail(row)">查看详情</el-button>
            <el-button size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="primary" plain :icon="UserFilled" @click="goCreateTenantAdmin(row)">创建管理员</el-button>
            <el-button size="small" type="success" plain :icon="Money" @click="goConfigurePayment(row)">配置收款</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="drawer" size="540px" title="商家详情" destroy-on-close>
      <template v-if="drawerRow">
        <div class="drawer-head">
          <div>
            <h3>{{ drawerRow.name }}</h3>
            <small>{{ drawerRow.code }}</small>
          </div>
          <el-tag :type="drawerRow.enabled ? 'success' : 'info'">{{ drawerRow.enabled ? "启用" : "停用" }}</el-tag>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <span>地区</span>
            <strong>{{ drawerRow.region || "-" }}</strong>
          </div>
          <div class="detail-item">
            <span>联系人</span>
            <strong>{{ drawerRow.contactName || "-" }}</strong>
          </div>
          <div class="detail-item">
            <span>联系电话</span>
            <strong>{{ drawerRow.contactPhone || "-" }}</strong>
          </div>
          <div class="detail-item">
            <span>内部备注</span>
            <strong>{{ drawerRow.remark || "-" }}</strong>
          </div>
          <div class="detail-item">
            <span>创建时间</span>
            <strong>{{ formatTime(drawerRow.createdAt) }}</strong>
          </div>
          <div class="detail-item">
            <span>处理优先级</span>
            <el-tag :type="tenantAttentionStatus(drawerRow).type">{{ tenantAttentionStatus(drawerRow).label }}</el-tag>
          </div>
          <div class="detail-item">
            <span>上线评分</span>
            <strong>{{ tenantLaunchScore(drawerRow) }} 分</strong>
          </div>
          <div class="detail-item">
            <span>上线结论</span>
            <el-tag :type="tenantLaunchStatus(drawerRow).type">{{ tenantLaunchStatus(drawerRow).label }}</el-tag>
          </div>
          <div class="detail-item">
            <span>经营健康</span>
            <el-tag :type="tenantHealthStatus(drawerRow).type">{{ tenantHealthStatus(drawerRow).label }} / {{ tenantHealthScore(drawerRow) }} 分</el-tag>
          </div>
          <div class="detail-item">
            <span>开通状态</span>
            <el-tag :type="tenantReadinessStatus(drawerRow).type">{{ tenantReadinessStatus(drawerRow).label }}</el-tag>
          </div>
          <div class="detail-item">
            <span>课程内容</span>
            <strong>{{ Number(drawerRow.publishedCourseCount || 0) }} / {{ Number(drawerRow.totalCourseCount || 0) }} 已发布</strong>
          </div>
          <div class="detail-item">
            <span>商家套餐</span>
            <strong>{{ drawerRow.subscriptionStatus?.planLabel || "-" }}</strong>
          </div>
          <div class="detail-item">
            <span>套餐到期</span>
            <el-tag :type="tenantSubscriptionTag(drawerRow)">{{ drawerRow.subscriptionStatus?.label || "未配置" }} / {{ drawerRow.subscriptionStatus?.expiresAt || "长期有效" }}</el-tag>
          </div>
          <div class="detail-item">
            <span>续费提醒</span>
            <el-tag :type="tenantRenewalTag(drawerRow)">{{ drawerRow.renewalReminder?.message || "-" }}</el-tag>
          </div>
          <div class="detail-item">
            <span>后台账号</span>
            <el-tag :type="tenantAdminStatus(drawerRow).type">{{ tenantAdminStatus(drawerRow).label }}</el-tag>
          </div>
          <div class="detail-item">
            <span>收款账户</span>
            <el-tag :type="paymentAccountStatus(drawerRow).type">{{ paymentAccountStatus(drawerRow).label }}</el-tag>
          </div>
          <div class="detail-item">
            <span>商城授权</span>
            <el-tag :type="mallAuthorizationStatus(drawerRow).type">{{ mallAuthorizationStatus(drawerRow).label }}</el-tag>
          </div>
          <div class="detail-item">
            <span>审核待办</span>
            <el-tag :type="tenantPendingReviewStatus(drawerRow).type">{{ tenantPendingReviewStatus(drawerRow).label }}</el-tag>
          </div>
          <div class="detail-item">
            <span>财务风险</span>
            <el-tag :type="tenantFinanceRiskStatus(drawerRow).type">{{ tenantFinanceRiskStatus(drawerRow).label }}</el-tag>
          </div>
        </div>

        <div class="drawer-section">
          <h4>下一步建议</h4>
          <p>{{ tenantNextAction(drawerRow) }}</p>
          <div class="drawer-actions">
            <el-button type="warning" plain :icon="ArrowRight" @click="goTenantNextAction(drawerRow)">处理下一步</el-button>
            <el-button type="primary" plain :icon="View" @click="previewTenantH5(drawerRow)">预览H5</el-button>
            <el-button plain :icon="CopyDocument" @click="copyTenantH5Url(drawerRow)">复制链接</el-button>
            <el-button plain :icon="Grid" @click="showTenantH5Qr(drawerRow)">二维码</el-button>
            <el-button @click="openEdit(drawerRow)">编辑资料</el-button>
            <el-button type="primary" plain @click="goTenantAdminAccounts(drawerRow)">查看账号</el-button>
            <el-button type="success" plain @click="goConfigurePayment(drawerRow)">配置收款</el-button>
          </div>
        </div>

        <div class="drawer-section">
          <h4>上线准入</h4>
          <p>{{ tenantLaunchIssues(drawerRow) }}</p>
          <div class="launch-list" v-if="drawerRow.launchReadiness?.blockers?.length || drawerRow.launchReadiness?.warnings?.length">
            <el-tag v-for="item in drawerRow.launchReadiness.blockers" :key="`blocker-${item}`" type="danger">{{ item }}</el-tag>
            <el-tag v-for="item in drawerRow.launchReadiness.warnings" :key="`warning-${item}`" type="warning">{{ item }}</el-tag>
          </div>
        </div>

        <div class="drawer-section">
          <h4>经营健康分</h4>
          <p>{{ tenantHealthIssues(drawerRow) }}</p>
          <div class="launch-list" v-if="drawerRow.operationHealth?.risks?.length || drawerRow.operationHealth?.warnings?.length">
            <el-tag v-for="item in drawerRow.operationHealth.risks" :key="`health-risk-${item}`" type="danger">{{ item }}</el-tag>
            <el-tag v-for="item in drawerRow.operationHealth.warnings" :key="`health-warning-${item}`" type="warning">{{ item }}</el-tag>
          </div>
        </div>

        <div class="drawer-section">
          <h4>平台权限</h4>
          <p class="permission-hint">这些权限和套餐由平台超级管理员按商家单独控制。关闭后商家端对应入口会变成只读，后端接口也会拦截或忽略越权修改。</p>
          <div class="permission-list">
            <label>
              <span>当前套餐：{{ drawerRow.subscriptionStatus?.planLabel || "-" }}</span>
              <el-tag :type="tenantSubscriptionTag(drawerRow)">{{ drawerRow.subscriptionStatus?.label || "未配置" }}</el-tag>
            </label>
            <label>
              <span>活动发布需要平台审核</span>
              <el-switch v-model="drawerRow.settings.activityPublishReviewRequired" @change="updatePermissions(drawerRow)" />
            </label>
            <label>
              <span>允许商家开启报名审核</span>
              <el-switch v-model="drawerRow.settings.registrationReviewEnabled" @change="updatePermissions(drawerRow)" />
            </label>
            <label>
              <span>允许商家配置收款方式</span>
              <el-switch v-model="drawerRow.settings.paymentAccountEditable" @change="updatePermissions(drawerRow)" />
            </label>
            <label>
              <span>开通商城运营：开启后商家端显示商城菜单，前台商城和商城接口可用</span>
              <el-switch v-model="drawerRow.settings.mallEnabled" @change="updatePermissions(drawerRow)" />
            </label>
          </div>
        </div>

        <div class="drawer-section">
          <h4>待办直达</h4>
          <div class="drawer-actions">
            <el-button plain @click="goTenantPendingActivities(drawerRow)">待审核活动 {{ Number(drawerRow.pendingActivityCount || 0) }}</el-button>
            <el-button plain @click="goTenantPendingRegistrations(drawerRow)">待审核报名 {{ Number(drawerRow.pendingRegistrationCount || 0) }}</el-button>
            <el-button plain type="danger" @click="goTenantFinanceRisk(drawerRow)">财务风险</el-button>
            <el-button plain @click="goTenantOperations(drawerRow)">活动运营</el-button>
          </div>
        </div>

        <div class="drawer-section">
          <h4>日志排查</h4>
          <div class="drawer-actions">
            <el-button plain @click="goTenantOperationLogs(drawerRow)">操作日志</el-button>
            <el-button plain @click="goTenantLoginLogs(drawerRow)">登录日志</el-button>
          </div>
        </div>
      </template>
    </el-drawer>

    <H5QrDialog
      v-model="h5QrDialogVisible"
      title="商家 H5 二维码"
      :scope-name="tenantQrScopeName"
      :url="tenantQrUrl"
    />

    <el-dialog v-model="dialog" width="640px" :title="editingId ? '编辑商家' : '新建商家'" destroy-on-close>
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="商家编码" required><el-input v-model="form.code" maxlength="64" placeholder="例如 east_shanghai" /></el-form-item>
          <el-form-item label="商家名称" required><el-input v-model="form.name" maxlength="120" /></el-form-item>
          <el-form-item label="地区"><el-input v-model="form.region" maxlength="80" /></el-form-item>
          <el-form-item label="联系人"><el-input v-model="form.contactName" maxlength="100" /></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="form.contactPhone" maxlength="40" /></el-form-item>
          <el-form-item><el-checkbox v-model="form.enabled">启用商家</el-checkbox></el-form-item>
          <el-form-item label="商家套餐">
            <el-select v-model="form.packagePlan" style="width: 100%">
              <el-option v-for="item in packageOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="套餐到期日">
            <el-date-picker v-model="form.packageExpiresAt" value-format="YYYY-MM-DD" type="date" clearable placeholder="不填表示长期有效" style="width: 100%" />
          </el-form-item>
          <el-form-item class="full"><el-alert type="info" show-icon :closable="false" title="以下权限由平台按商家单独控制，保存后会影响商家后台页面和后端接口。" /></el-form-item>
          <el-form-item class="full">
            <el-button type="primary" plain @click="applyPackagePermissionTemplate">套用套餐权限模板</el-button>
          </el-form-item>
          <el-form-item class="full"><el-checkbox v-model="form.activityPublishReviewRequired">活动发布需要平台审核：开启后商家发布活动必须先提交平台审核</el-checkbox></el-form-item>
          <el-form-item class="full"><el-checkbox v-model="form.registrationReviewEnabled">允许商家开启报名审核：关闭后商家不能把活动报名设为人工审核</el-checkbox></el-form-item>
          <el-form-item class="full"><el-checkbox v-model="form.paymentAccountEditable">允许商家配置收款方式：关闭后商家收款账户和支付说明只读</el-checkbox></el-form-item>
          <el-form-item class="full"><el-checkbox v-model="form.mallEnabled">开通商城运营：商家可管理商品、订单、营销、物流，并使用自己的收款配置</el-checkbox></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.subtitle { margin: 6px 0 0; color: #64748b; }
.permission-mode-alert { margin-bottom: 12px; }
.toolbar-actions { display: flex; gap: 10px; }
.merchant-name { font-weight: 700; }
small { color: #64748b; }
.next-action { color: #475569; font-size: 13px; }
.status-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.status-actions :deep(.el-button) { margin-left: 0; padding: 0; }
.todo-actions { display: flex; flex-wrap: wrap; gap: 4px 8px; }
.todo-actions :deep(.el-button) { margin-left: 0; padding: 0; }
.launch-score { display: flex; align-items: center; gap: 8px; }
.launch-score span { color: #475569; font-size: 12px; }
.filter-state { border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; padding: 10px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.filter-state strong { margin-right: 10px; color: #0f172a; }
.filter-state span { color: #64748b; }
.filter-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.drawer-head h3 { margin: 0 0 4px; font-size: 18px; color: #0f172a; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
.detail-item { border-bottom: 1px solid #e2e8f0; padding: 8px 0; display: flex; flex-direction: column; gap: 6px; }
.detail-item span { color: #64748b; font-size: 12px; }
.detail-item strong { color: #0f172a; font-size: 14px; }
.drawer-section { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px; }
.drawer-section h4 { margin: 0 0 10px; font-size: 15px; color: #0f172a; }
.drawer-section p { margin: 0 0 12px; color: #475569; line-height: 1.6; }
.drawer-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.launch-list { display: flex; flex-wrap: wrap; gap: 8px; }
.permission-list { display: flex; flex-direction: column; gap: 10px; }
.permission-list label { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #334155; }
.permission-hint { margin: 0 0 10px; color: #64748b; line-height: 1.6; }
.readiness-summary { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
.launch-summary { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.todo-summary { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.readiness-item { border: 1px solid #d8e0ea; border-radius: 6px; background: #fff; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; color: #334155; cursor: pointer; }
.readiness-item strong { font-size: 18px; color: #0f172a; }
.readiness-item.active { border-color: #409eff; background: #ecf5ff; color: #1d4ed8; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
.full { grid-column: 1 / -1; }
@media (max-width: 760px) {
  .toolbar { align-items: flex-start; flex-direction: column; }
  .readiness-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .launch-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-state { align-items: flex-start; flex-direction: column; }
  .filter-tags { justify-content: flex-start; }
  .detail-grid { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
