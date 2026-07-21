<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { CircleCheck, Picture, UploadFilled } from "@element-plus/icons-vue";
import { api } from "../api";
import { canAccess } from "../permissions";
import { h5RoutePreviewUrl } from "../h5-preview";

const loading = ref(false);
const transactionLoading = ref(false);
const errorMessage = ref("");
const savingSetting = ref(false);
const savingProject = ref(false);
const updateSaving = ref(false);
const disbursementSaving = ref(false);
const projectDetailLoading = ref(false);
const projectDetailError = ref("");
const projectActionKey = ref("");
const summary = ref<any>(null);
const overview = ref<any>({ kpis: {}, todos: [], alerts: [] });
const setting = ref<any>(null);
const transactions = ref<any[]>([]);
const projects = ref<any[]>([]);
const activeSection = ref("overview");
const projectDialogVisible = ref(false);
const updateDialogVisible = ref(false);
const disbursementDialogVisible = ref(false);
const certificateDialogVisible = ref(false);
const certificatePreviewLoading = ref(false);
const certificatePreviewUrl = ref("");
const certificatePreviewTitle = ref("公益贡献凭证");
const editingProjectId = ref<number | null>(null);
const activeProject = ref<any | null>(null);
const activeDisbursementProject = ref<any | null>(null);
const projectUpdates = ref<any[]>([]);
const projectDisbursements = ref<any[]>([]);
const projectEvents = ref<any[]>([]);
const projectFilter = reactive({ keyword: "", status: "" });
const projectPagination = reactive({ page: 1, pageSize: 10 });
const txFilter = reactive({ keyword: "", type: "", sourceType: "" });
const txPagination = reactive({ page: 1, pageSize: 20, total: 0 });
const settingForm = reactive({ enabled: true, ratePercent: 5, accrualBasis: "paid_amount", manualBasisAmount: undefined as number | undefined, userDisplayName: "我的公益贡献", publicNote: "公益金来自平台订单收入计提，用户无需额外支付。", retainOnActivityRefund: true, ambassadorThreshold: 100, ambassadorTitle: "公益大使" });
const projectForm = reactive({ title: "", targetAmount: 500, status: "fundraising", coverUrl: "", description: "", executedAt: "", publicVisible: true });
const updateForm = reactive({ title: "", content: "", proofUrl: "", publicVisible: true, publishedAt: "" });
const disbursementForm = reactive({ amount: 100, stageNo: 1, remark: "公益项目阶段拨款申请", proofUrl: "", publicVisible: true });

const canOperate = computed(() => canAccess(["charity.manage"]));
const canFinance = computed(() => canAccess(["charity.finance"]));
const overviewAlerts = computed(() => Array.isArray(overview.value?.alerts) ? overview.value.alerts : []);
const charityMetricCards = computed(() => {
  const kpis = overview.value?.kpis || {};
  return [
    { label: "累计公益金", value: `¥${money(kpis.totalAccrued ?? summary.value?.totalAccrued)}` },
    { label: "资金余额", value: `¥${money(summary.value?.fundBalanceAmount ?? kpis.availableAmount)}` },
    { label: "已冻结", value: `¥${money(summary.value?.reservedAmount)}` },
    { label: "当前可用", value: `¥${money(kpis.availableAmount ?? summary.value?.availableAmount)}` },
    { label: "已拨付", value: `¥${money(kpis.totalDisbursed ?? summary.value?.totalDisbursed)}` },
    { label: "公开项目", value: kpis.publicProjects ?? projects.value.filter((row) => row.publicVisible !== false).length },
    { label: "待执行/验收", value: kpis.pendingProjects ?? projects.value.filter((row) => ["pending_execution", "executing", "pending_acceptance"].includes(row.status)).length },
    { label: "参与用户", value: summary.value?.participantCount || 0 },
    { label: "账本校验", value: summary.value?.ledgerIntegrity?.consistent === false ? "异常" : "正常" }
  ];
});

const statusText: Record<string, string> = {
  draft: "草稿",
  pending_review: "待审核",
  rejected: "已驳回",
  approved: "已审核",
  fundraising: "筹集中",
  pending_execution: "待执行",
  executing: "执行中",
  pending_acceptance: "待验收",
  completed: "已完成",
  archived: "已归档"
};

const typeText: Record<string, string> = {
  charity_accrual: "订单计提",
  charity_reversal: "退款冲回",
  project_disbursement: "项目拨付",
  manual_adjust: "人工调整"
};

const basisText: Record<string, string> = {
  paid_amount: "实付金额",
  original_amount: "订单原价",
  manual: "手动指定金额"
};

const sourceText: Record<string, string> = {
  activity_order: "活动订单",
  mall_order: "商城订单",
  charity_project: "公益项目",
  manual: "人工登记"
};

const disbursementStatusText: Record<string, string> = { pending_review: "待复核", approved: "已冻结待付款", paid: "已付款", rejected: "已拒绝", cancelled: "已取消" };

async function previewContributionCertificate(row: any) {
  if (!row.certificatePreviewUrl) return ElMessage.warning("该流水不符合公益贡献凭证条件");
  certificatePreviewLoading.value = true;
  certificatePreviewTitle.value = row.certificateNo ? `公益贡献凭证：${row.certificateNo}` : "公益贡献凭证";
  certificateDialogVisible.value = true;
  try {
    const token = localStorage.getItem("admin_token");
    const response = await fetch(row.certificatePreviewUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error("凭证预览加载失败");
    releaseCertificatePreview();
    certificatePreviewUrl.value = URL.createObjectURL(await response.blob());
  } catch (error: any) {
    certificateDialogVisible.value = false;
    ElMessage.error(error.message || "凭证预览加载失败");
  } finally {
    certificatePreviewLoading.value = false;
  }
}

function releaseCertificatePreview() {
  if (!certificatePreviewUrl.value) return;
  URL.revokeObjectURL(certificatePreviewUrl.value);
  certificatePreviewUrl.value = "";
}

onBeforeUnmount(releaseCertificatePreview);

function verifyContributionCertificate(row: any) {
  if (!row.certificateNo) return ElMessage.warning("该流水暂无公益贡献凭证编号");
  window.open(h5RoutePreviewUrl(null, `/pages/credential/verify?type=charity&code=${encodeURIComponent(row.certificateNo)}`), "_blank", "noopener,noreferrer");
}

const filteredProjects = computed(() => {
  const keyword = projectFilter.keyword.trim().toLowerCase();
  return projects.value.filter((row) => {
    if (projectFilter.status && row.status !== projectFilter.status) return false;
    if (!keyword) return true;
    return [row.title, row.projectNo, row.description].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });
});
const pagedProjects = computed(() => filteredProjects.value.slice((projectPagination.page - 1) * projectPagination.pageSize, projectPagination.page * projectPagination.pageSize));

watch(projectFilter, () => { projectPagination.page = 1; }, { deep: true });

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [summaryData, overviewData, settingData, projectRows] = await Promise.all([
      api.get<any, any>("/admin/charity/summary"),
      api.get<any, any>("/admin/charity/overview"),
      canOperate.value ? api.get<any, any>("/admin/settings/charity") : Promise.resolve(null),
      canOperate.value || canFinance.value ? api.get<any, any[]>("/admin/charity/projects") : Promise.resolve([])
    ]);
    summary.value = summaryData;
    overview.value = overviewData || { kpis: {}, todos: [], alerts: [] };
    projects.value = projectRows || [];
    if (settingData) {
      setting.value = settingData;
      Object.assign(settingForm, {
        enabled: Boolean(settingData.enabled),
        ratePercent: Number(settingData.ratePercent || 5),
        accrualBasis: settingData.accrualBasis || "paid_amount",
        manualBasisAmount: settingData.manualBasisAmount ? Number(settingData.manualBasisAmount) : undefined,
        userDisplayName: settingData.userDisplayName || "我的公益贡献",
        publicNote: settingData.publicNote || "公益金来自平台订单收入计提，用户无需额外支付。",
        retainOnActivityRefund: settingData.retainOnActivityRefund !== false,
        ambassadorThreshold: Number(settingData.ambassadorThreshold || 100),
        ambassadorTitle: settingData.ambassadorTitle || "公益大使"
      });
    }
    if (canFinance.value && activeSection.value === "transactions") await loadTransactions();
  } catch (error: any) {
    errorMessage.value = error.message || "加载公益池失败";
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

async function saveSetting() {
  if (savingSetting.value) return;
  savingSetting.value = true;
  try {
    setting.value = await api.post("/admin/settings/charity", settingForm);
    ElMessage.success("公益配置已保存");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    savingSetting.value = false;
  }
}

function openCreateProject() {
  editingProjectId.value = null;
  Object.assign(projectForm, { title: "", targetAmount: 500, status: "fundraising", coverUrl: "", description: "", executedAt: "", publicVisible: true });
  projectDialogVisible.value = true;
}

function openEditProject(row: any) {
  editingProjectId.value = row.id;
  Object.assign(projectForm, {
    title: row.title,
    targetAmount: Number(row.targetAmount || 0),
    status: row.status,
    coverUrl: row.coverUrl || "",
    description: row.description || "",
    executedAt: row.executedAt ? row.executedAt.slice(0, 10) : "",
    publicVisible: Boolean(row.publicVisible)
  });
  projectDialogVisible.value = true;
}

async function saveProject() {
  if (savingProject.value) return;
  if (!projectForm.title.trim()) return ElMessage.error("请输入项目标题");
  if (!Number.isFinite(Number(projectForm.targetAmount)) || Number(projectForm.targetAmount) <= 0) return ElMessage.error("目标金额必须大于 0");
  savingProject.value = true;
  try {
    const { status: _status, ...editableProjectForm } = projectForm;
    const payload = { ...editableProjectForm, coverUrl: projectForm.coverUrl || undefined, description: projectForm.description || undefined, executedAt: projectForm.executedAt || undefined };
    if (editingProjectId.value) await api.patch(`/admin/charity/projects/${editingProjectId.value}`, payload);
    else await api.post("/admin/charity/projects", payload);
    ElMessage.success("公益项目已保存");
    projectDialogVisible.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    savingProject.value = false;
  }
}

async function addDisbursement(row: any) {
  activeDisbursementProject.value = row;
  const existing = Array.isArray(row.disbursements) ? row.disbursements.length : 0;
  Object.assign(disbursementForm, { amount: 100, stageNo: existing + 1, remark: "公益项目阶段拨款申请", proofUrl: "", publicVisible: true });
  disbursementDialogVisible.value = true;
}

async function loadTransactions() {
  if (!canFinance.value || transactionLoading.value) return;
  transactionLoading.value = true;
  try {
    const result = await api.get<any, { items: any[]; total: number; page: number; pageSize: number }>("/admin/charity/transactions", {
      params: {
        page: txPagination.page,
        pageSize: txPagination.pageSize,
        keyword: txFilter.keyword.trim() || undefined,
        type: txFilter.type || undefined,
        sourceType: txFilter.sourceType || undefined
      }
    });
    transactions.value = result.items || [];
    txPagination.total = Number(result.total || 0);
    txPagination.page = Number(result.page || txPagination.page);
  } catch (error: any) {
    ElMessage.error(error.message || "公益流水加载失败");
  } finally {
    transactionLoading.value = false;
  }
}

function handleSectionChange(name: string | number) {
  if (String(name) === "transactions" && canFinance.value) void loadTransactions();
}

function applyTransactionFilters() {
  txPagination.page = 1;
  void loadTransactions();
}

function resetTransactionFilters() {
  Object.assign(txFilter, { keyword: "", type: "", sourceType: "" });
  txPagination.page = 1;
  void loadTransactions();
}

function changeTransactionPage(page: number) {
  txPagination.page = page;
  void loadTransactions();
}

function changeTransactionPageSize(pageSize: number) {
  txPagination.pageSize = pageSize;
  txPagination.page = 1;
  void loadTransactions();
}

async function saveDisbursement() {
  if (!activeDisbursementProject.value || disbursementSaving.value) return;
  const amount = Number(disbursementForm.amount);
  if (!Number.isFinite(amount) || amount <= 0) return ElMessage.error("拨付金额必须大于 0");
  disbursementSaving.value = true;
  try {
    await api.post(`/admin/charity/projects/${activeDisbursementProject.value.id}/disbursements`, { ...disbursementForm, amount, proofUrl: disbursementForm.proofUrl || undefined, businessKey: charityOperationKey("request", activeDisbursementProject.value.id) });
    ElMessage.success("拨款申请已提交，等待另一名管理员复核");
    disbursementDialogVisible.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "登记失败");
  } finally {
    disbursementSaving.value = false;
  }
}

async function openProjectUpdates(row: any) {
  activeProject.value = row;
  updateDialogVisible.value = true;
  projectDetailLoading.value = true;
  projectDetailError.value = "";
  projectUpdates.value = [];
  projectDisbursements.value = [];
  projectEvents.value = [];
  Object.assign(updateForm, { title: "", content: "", proofUrl: "", publicVisible: true, publishedAt: "" });
  try {
    const data = await api.get<any, any>(`/admin/charity/projects/${row.id}/updates`);
    projectUpdates.value = data.updates || [];
    projectDisbursements.value = data.disbursements || [];
    projectEvents.value = data.events || [];
  } catch (error: any) {
    projectDetailError.value = error.message || "项目动态与拨款记录加载失败";
    ElMessage.error(projectDetailError.value);
  } finally {
    projectDetailLoading.value = false;
  }
}

async function actionProject(row: any, action: "submit" | "start_execution" | "submit_acceptance" | "complete" | "archive") {
  const labels: Record<string, string> = { submit: "提交审核", start_execution: "开始执行", submit_acceptance: "提交验收", complete: "确认结项", archive: "归档" };
  const key = `project:${action}:${row.id}`;
  if (projectActionKey.value) return;
  projectActionKey.value = key;
  try {
    const { value } = await ElMessageBox.prompt(`确认对项目「${row.title}」执行“${labels[action]}”？`, labels[action], { inputValue: labels[action], confirmButtonText: "确认", cancelButtonText: "取消" });
    await api.post(`/admin/charity/projects/${row.id}/actions`, { action, remark: String(value || "").trim(), businessKey: charityOperationKey(`project-${action}`, row.id) });
    ElMessage.success(`项目已${labels[action]}`);
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "项目状态更新失败");
  } finally {
    projectActionKey.value = "";
  }
}

async function reviewProject(row: any, decision: "approve" | "reject") {
  const label = decision === "approve" ? "审核通过" : "审核驳回";
  const key = `review:${decision}:${row.id}`;
  if (projectActionKey.value) return;
  projectActionKey.value = key;
  try {
    const { value } = await ElMessageBox.prompt(`确认${label}项目「${row.title}」？申请人与审核人必须不同。`, label, { inputValue: decision === "approve" ? "项目资料、预算和公开内容符合要求" : "项目资料或预算需要补充", confirmButtonText: label, cancelButtonText: "取消", inputValidator: (text) => Boolean(String(text || "").trim()) || "请填写审核意见" });
    await api.post(`/admin/charity/projects/${row.id}/review`, { decision, remark: String(value || "").trim(), businessKey: charityOperationKey(`project-review-${decision}`, row.id) });
    ElMessage.success(label);
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "项目审核失败");
  } finally {
    projectActionKey.value = "";
  }
}

async function saveProjectUpdate() {
  if (!activeProject.value || updateSaving.value) return;
  if (!updateForm.title.trim()) return ElMessage.error("请输入动态标题");
  if (!updateForm.content.trim()) return ElMessage.error("请输入动态内容");
  updateSaving.value = true;
  try {
    await api.post(`/admin/charity/projects/${activeProject.value.id}/updates`, { ...updateForm, proofUrl: updateForm.proofUrl || undefined, publishedAt: updateForm.publishedAt || undefined });
    ElMessage.success("执行动态已发布");
    await openProjectUpdates(activeProject.value);
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    updateSaving.value = false;
  }
}

function money(value?: string | number) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function maskPhone(value: unknown) {
  const phone = String(value || "");
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone || "-";
}

function openProof(url?: string | null) {
  if (!url) return;
  try {
    const parsed = new URL(url, window.location.origin);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("unsupported protocol");
    window.open(parsed.href, "_blank", "noopener,noreferrer");
  } catch {
    ElMessage.error("凭证地址无效，无法打开");
  }
}

function charityOperationKey(action: string, id?: number) {
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `charity:${action}:${id || 0}:${uuid}`;
}

async function reviewDisbursement(row: any, decision: "approve" | "reject") {
  const action = decision === "approve" ? "通过并冻结资金" : "拒绝";
  const key = `disbursement-review:${decision}:${row.id}`;
  if (projectActionKey.value) return;
  projectActionKey.value = key;
  try {
    const { value } = await ElMessageBox.prompt(`${action}第 ${row.stageNo || 1} 阶段拨款 ¥${money(row.amount)}？申请人与复核人必须不同。`, `拨款${action}`, { inputValue: decision === "approve" ? "预算、材料和收款信息已核对" : "材料或预算不符合要求", confirmButtonText: action, cancelButtonText: "取消", inputValidator: (text) => Boolean(String(text || "").trim()) || "请填写复核意见" });
    await api.post(`/admin/charity/disbursements/${row.id}/review`, { decision, remark: String(value || "").trim(), businessKey: charityOperationKey(`review-${decision}`, row.id) });
    ElMessage.success(decision === "approve" ? "拨款已复核并冻结额度" : "拨款申请已拒绝");
    if (activeProject.value) await openProjectUpdates(activeProject.value);
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "拨款复核失败");
  } finally {
    projectActionKey.value = "";
  }
}

async function payDisbursement(row: any) {
  const key = `disbursement-pay:${row.id}`;
  if (projectActionKey.value) return;
  projectActionKey.value = key;
  try {
    const { value } = await ElMessageBox.prompt(`确认第 ${row.stageNo || 1} 阶段拨款 ¥${money(row.amount)} 已付款？付款人必须与申请人、复核人不同。`, "确认公益拨款", { inputValue: row.paidReference || "", inputPlaceholder: "填写银行流水号、支付单号或线下凭证号", confirmButtonText: "确认付款", cancelButtonText: "取消", inputValidator: (text) => Boolean(String(text || "").trim()) || "请填写付款流水或凭证号" });
    await api.post(`/admin/charity/disbursements/${row.id}/pay`, { paidReference: String(value || "").trim(), proofUrl: row.proofUrl || undefined, remark: "财务确认公益拨款已支付", businessKey: charityOperationKey("pay", row.id) });
    ElMessage.success("拨款已付款并写入公益资金账本");
    if (activeProject.value) await openProjectUpdates(activeProject.value);
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "公益拨款付款确认失败");
  } finally {
    projectActionKey.value = "";
  }
}

async function cancelDisbursement(row: any) {
  const key = `disbursement-cancel:${row.id}`;
  if (projectActionKey.value) return;
  projectActionKey.value = key;
  try {
    const { value } = await ElMessageBox.prompt(`取消第 ${row.stageNo || 1} 阶段拨款 ¥${money(row.amount)}？已冻结金额会同步解冻。`, "取消公益拨款", { inputPlaceholder: "填写取消原因", confirmButtonText: "确认取消", cancelButtonText: "返回", inputValidator: (text) => Boolean(String(text || "").trim()) || "请填写取消原因" });
    await api.post(`/admin/charity/disbursements/${row.id}/cancel`, { remark: String(value || "").trim(), businessKey: charityOperationKey("cancel", row.id) });
    ElMessage.success("拨款已取消，冻结额度已释放");
    if (activeProject.value) await openProjectUpdates(activeProject.value);
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "取消公益拨款失败");
  } finally {
    projectActionKey.value = "";
  }
}

function projectHasDisbursementProof(row: any) {
  const rows = Array.isArray(row.disbursements) ? row.disbursements : [];
  if (!rows.length) return true;
  return rows.every((item: any) => item.proofUrl);
}

function projectHasUpdates(row: any) {
  return Array.isArray(row.updates) && row.updates.length > 0;
}

function uploadHeaders() {
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function beforeImageUpload(file: File) {
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

function beforeProofUpload(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowed.includes(file.type)) {
    ElMessage.error("请上传 JPG、PNG、WebP、GIF 或 PDF 凭证");
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error("凭证不能超过 10MB");
    return false;
  }
  return true;
}

function handleUpdateProofUploadSuccess(response: any) {
  const data = response?.data || response;
  const url = String(data?.url || "").trim();
  if (!url) return ElMessage.error("上传成功但未返回凭证地址");
  updateForm.proofUrl = url;
  ElMessage.success("执行凭证已上传");
}

function handleDisbursementProofUploadSuccess(response: any) {
  const data = response?.data || response;
  const url = String(data?.url || "").trim();
  if (!url) return ElMessage.error("上传成功但未返回凭证地址");
  disbursementForm.proofUrl = url;
  ElMessage.success("拨付凭证已上传");
}

function handleProofUploadError(error: any) {
  ElMessage.error(error?.message || "凭证上传失败");
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>公益池</h2>
      <div class="toolbar-actions">
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <el-alert class="page-hint" type="info" :closable="false" show-icon title="公益金说明" description="公益金由平台从订单收入中按配置比例计提，用户无需额外支付。前台统一展示为「公益金 / 公益池 / 我的公益贡献」。" />
    <el-alert v-if="errorMessage" class="page-hint" type="error" :closable="false" show-icon :title="errorMessage"><template #default><el-button size="small" :loading="loading" @click="load">重试</el-button></template></el-alert>
    <el-tabs v-model="activeSection" class="charity-tabs" @tab-change="handleSectionChange">
      <el-tab-pane label="公益概览" name="overview">
        <el-alert v-if="summary?.ledgerIntegrity?.consistent === false" class="page-hint" type="error" :closable="false" show-icon title="公益资金账本校验异常" :description="(summary.ledgerIntegrity.issues || []).join('；')" />
        <div class="metric-grid" v-loading="loading">
          <div v-for="item in charityMetricCards" :key="item.label" class="metric"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
        </div>
        <div v-if="overviewAlerts.length" class="alert-stack">
          <el-alert v-for="item in overviewAlerts" :key="item.message" :type="item.level || 'warning'" :title="item.message" show-icon :closable="false" />
        </div>
        <el-empty v-else-if="!loading" description="当前没有待处理的公益预警" />
      </el-tab-pane>

      <el-tab-pane v-if="canOperate" label="公益配置" name="settings">
      <div class="table-card setting-card">
      <div class="section-head"><div><h3>公益配置</h3><p>管理订单公益金计提、退款保留和用户端展示规则。</p></div></div>
      <el-form :model="settingForm" label-width="120px">
        <el-form-item label="启用公益金"><el-switch v-model="settingForm.enabled" /></el-form-item>
        <el-form-item label="计提比例"><el-input-number v-model="settingForm.ratePercent" :min="0" :max="100" :precision="2" /> <span class="unit">%</span></el-form-item>
        <el-form-item label="计提口径">
          <el-select v-model="settingForm.accrualBasis" style="width: 220px">
            <el-option label="实付金额" value="paid_amount" />
            <el-option label="订单原价" value="original_amount" />
            <el-option label="手动指定金额" value="manual" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="settingForm.accrualBasis === 'manual'" label="手动基准金额"><el-input-number v-model="settingForm.manualBasisAmount" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="退款保留公益金"><el-switch v-model="settingForm.retainOnActivityRefund" /><span class="form-tip">用户申请活动退款时，默认退回实付减公益金，公益贡献保留。</span></el-form-item>
        <el-form-item label="公益大使门槛"><el-input-number v-model="settingForm.ambassadorThreshold" :min="0" :precision="2" /> <span class="unit">元</span></el-form-item>
        <el-form-item label="勋章名称"><el-input v-model="settingForm.ambassadorTitle" maxlength="80" /></el-form-item>
        <el-form-item label="用户端名称"><el-input v-model="settingForm.userDisplayName" maxlength="80" /></el-form-item>
        <el-form-item label="公开说明"><el-input v-model="settingForm.publicNote" maxlength="120" /></el-form-item>
        <el-form-item><el-button type="primary" :loading="savingSetting" @click="saveSetting">保存配置</el-button></el-form-item>
      </el-form>
    </div>
      </el-tab-pane>

      <el-tab-pane label="公益项目" name="projects">
    <div class="table-card">
      <div class="section-head">
        <div><h3>公益项目</h3><p>按项目状态管理执行、拨付、动态和公开凭证。</p></div>
        <el-button v-if="canOperate" type="primary" @click="openCreateProject">新增公益项目</el-button>
      </div>
      <div class="filters project-filters">
        <el-input v-model="projectFilter.keyword" clearable placeholder="搜索项目名称/编号" />
        <el-select v-model="projectFilter.status" clearable placeholder="项目状态">
          <el-option v-for="(label, value) in statusText" :key="value" :label="label" :value="value" />
        </el-select>
        <span class="result-count">共 {{ filteredProjects.length }} 个项目</span>
      </div>
      <el-table :data="pagedProjects" stripe empty-text="暂无公益项目">
        <el-table-column label="项目" min-width="210"><template #default="{ row }"><strong>{{ row.title }}</strong><small>{{ row.projectNo || `#${row.id}` }}</small></template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }">{{ statusText[row.status] || row.status }}</template></el-table-column>
        <el-table-column label="目标金额" width="120"><template #default="{ row }">¥{{ money(row.targetAmount) }}</template></el-table-column>
        <el-table-column label="已拨付" width="120"><template #default="{ row }">¥{{ money(row.disbursedAmount) }}</template></el-table-column>
        <el-table-column label="进度" width="180"><template #default="{ row }"><el-progress :percentage="row.progressPercent || 0" /></template></el-table-column>
        <el-table-column label="透明度" width="230">
          <template #default="{ row }">
            <el-tag :type="row.description ? 'success' : 'warning'">说明</el-tag>
            <el-tag :type="projectHasUpdates(row) ? 'success' : 'warning'" style="margin-left:4px;">动态</el-tag>
            <el-tag :type="projectHasDisbursementProof(row) ? 'success' : 'danger'" style="margin-left:4px;">凭证</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="公开" width="90"><template #default="{ row }"><el-tag :type="row.publicVisible ? 'success' : 'info'">{{ row.publicVisible ? "展示" : "隐藏" }}</el-tag></template></el-table-column>
        <el-table-column label="更新时间" width="170"><template #default="{ row }">{{ formatTime(row.updatedAt) }}</template></el-table-column>
        <el-table-column v-if="canOperate || canFinance" label="操作" width="430" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canOperate && ['draft', 'rejected'].includes(row.status)" size="small" :disabled="Boolean(projectActionKey)" @click="openEditProject(row)">编辑</el-button>
            <el-button size="small" :loading="projectDetailLoading && activeProject?.id === row.id" :disabled="projectDetailLoading" @click="openProjectUpdates(row)">动态</el-button>
            <el-button v-if="canOperate && ['draft', 'rejected'].includes(row.status)" size="small" type="primary" plain :loading="projectActionKey === `project:submit:${row.id}`" :disabled="Boolean(projectActionKey)" @click="actionProject(row, 'submit')">提交审核</el-button>
            <el-button v-if="canOperate && row.status === 'pending_review'" size="small" type="success" plain :loading="projectActionKey === `review:approve:${row.id}`" :disabled="Boolean(projectActionKey)" @click="reviewProject(row, 'approve')">通过</el-button>
            <el-button v-if="canOperate && row.status === 'pending_review'" size="small" type="danger" plain :loading="projectActionKey === `review:reject:${row.id}`" :disabled="Boolean(projectActionKey)" @click="reviewProject(row, 'reject')">驳回</el-button>
            <el-button v-if="canOperate && ['approved', 'fundraising', 'pending_execution'].includes(row.status)" size="small" type="success" plain :loading="projectActionKey === `project:start_execution:${row.id}`" :disabled="Boolean(projectActionKey)" @click="actionProject(row, 'start_execution')">开始执行</el-button>
            <el-button v-if="canOperate && row.status === 'executing'" size="small" type="warning" plain :loading="projectActionKey === `project:submit_acceptance:${row.id}`" :disabled="Boolean(projectActionKey)" @click="actionProject(row, 'submit_acceptance')">提交验收</el-button>
            <el-button v-if="canOperate && row.status === 'pending_acceptance'" size="small" type="success" plain :loading="projectActionKey === `project:complete:${row.id}`" :disabled="Boolean(projectActionKey)" @click="actionProject(row, 'complete')">确认结项</el-button>
            <el-button v-if="canOperate && row.status === 'completed'" size="small" plain :loading="projectActionKey === `project:archive:${row.id}`" :disabled="Boolean(projectActionKey)" @click="actionProject(row, 'archive')">归档</el-button>
            <el-button v-if="canOperate" size="small" type="primary" :disabled="Boolean(projectActionKey)" @click="addDisbursement(row)">申请拨款</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="projectPagination.page"
        v-model:page-size="projectPagination.pageSize"
        class="table-pagination"
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50]"
        :total="filteredProjects.length"
      />
    </div>
      </el-tab-pane>

      <el-tab-pane v-if="canFinance" label="公益流水" name="transactions">
    <div class="table-card">
      <div class="table-head">
        <div><h3>公益流水</h3><p>分页查询公益计提、退款冲回、项目拨付和人工调整记录。</p></div>
        <div class="filters">
          <el-input v-model="txFilter.keyword" clearable placeholder="搜索用户/订单/说明" @keyup.enter="applyTransactionFilters" />
          <el-select v-model="txFilter.type" clearable placeholder="流水类型" @change="applyTransactionFilters">
            <el-option v-for="(label, value) in typeText" :key="value" :label="label" :value="value" />
          </el-select>
          <el-select v-model="txFilter.sourceType" clearable placeholder="来源" @change="applyTransactionFilters">
            <el-option v-for="(label, value) in sourceText" :key="value" :label="label" :value="value" />
          </el-select>
          <el-button type="primary" :loading="transactionLoading" @click="applyTransactionFilters">查询</el-button>
          <el-button @click="resetTransactionFilters">重置</el-button>
        </div>
      </div>
      <el-table v-loading="transactionLoading" :data="transactions" stripe empty-text="暂无公益流水">
        <el-table-column label="类型" width="110"><template #default="{ row }">{{ typeText[row.type] || row.type }}</template></el-table-column>
        <el-table-column label="来源" width="110"><template #default="{ row }">{{ sourceText[row.sourceType] || row.sourceType || "-" }}</template></el-table-column>
        <el-table-column label="方向" width="90"><template #default="{ row }"><el-tag :type="row.direction === 'credit' ? 'success' : 'warning'">{{ row.direction === "credit" ? "入池" : "出池" }}</el-tag></template></el-table-column>
        <el-table-column label="金额" width="120"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        <el-table-column label="余额变化" width="190"><template #default="{ row }">¥{{ money(Number(row.balanceBeforeFen || 0) / 100) }} → ¥{{ money(Number(row.balanceAfterFen || 0) / 100) }}</template></el-table-column>
        <el-table-column label="账本序号" width="100"><template #default="{ row }">{{ row.ledgerSequence || "旧版" }}</template></el-table-column>
        <el-table-column label="计提基准" width="120"><template #default="{ row }">¥{{ money(row.basisAmount) }}</template></el-table-column>
        <el-table-column label="比例" width="90"><template #default="{ row }">{{ row.ratePercent }}%</template></el-table-column>
        <el-table-column label="订单/项目" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.order?.orderNo || row.sourceTitle || "-" }}</template></el-table-column>
        <el-table-column label="用户" min-width="140" show-overflow-tooltip><template #default="{ row }">{{ row.user?.phone ? maskPhone(row.user.phone) : row.user?.nickname || "-" }}</template></el-table-column>
        <el-table-column label="退款保留" width="100"><template #default="{ row }"><el-tag :type="row.retainedOnRefund ? 'success' : 'info'">{{ row.retainedOnRefund ? "是" : "否" }}</el-tag></template></el-table-column>
        <el-table-column label="贡献凭证" width="150">
          <template #default="{ row }">
            <template v-if="row.certificateEligible">
              <el-button link type="primary" :icon="Picture" @click="previewContributionCertificate(row)">预览</el-button>
              <el-button link type="primary" :icon="CircleCheck" @click="verifyContributionCertificate(row)">验真</el-button>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
      </el-table>
      <el-pagination
        class="table-pagination"
        :current-page="txPagination.page"
        :page-size="txPagination.pageSize"
        :page-sizes="[20, 50, 100]"
        :total="txPagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="changeTransactionPage"
        @size-change="changeTransactionPageSize"
      />
    </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="certificateDialogVisible" :title="certificatePreviewTitle" width="min(980px, 94vw)" destroy-on-close @closed="releaseCertificatePreview">
      <div v-loading="certificatePreviewLoading" class="certificate-preview-shell">
        <img v-if="certificatePreviewUrl" :src="certificatePreviewUrl" alt="公益贡献凭证" />
      </div>
    </el-dialog>

    <el-dialog v-model="projectDialogVisible" :title="editingProjectId ? '编辑公益项目' : '新增公益项目'" width="560px" destroy-on-close>
      <el-form :model="projectForm" label-width="100px">
        <el-form-item label="项目标题" required><el-input v-model="projectForm.title" maxlength="120" /></el-form-item>
        <el-form-item label="目标金额" required><el-input-number v-model="projectForm.targetAmount" :min="0.01" :precision="2" /></el-form-item>
        <el-form-item label="封面地址"><el-input v-model="projectForm.coverUrl" maxlength="500" /></el-form-item>
        <el-form-item label="执行日期"><el-date-picker v-model="projectForm.executedAt" value-format="YYYY-MM-DD" type="date" placeholder="可选" /></el-form-item>
        <el-form-item label="公开展示"><el-switch v-model="projectForm.publicVisible" /></el-form-item>
        <el-form-item label="项目说明"><el-input v-model="projectForm.description" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="projectDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingProject" @click="saveProject">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="updateDialogVisible" :title="activeProject ? `执行动态：${activeProject.title}` : '执行动态'" width="760px" destroy-on-close>
      <el-alert v-if="projectDetailError" class="page-hint" type="error" show-icon :closable="false" :title="projectDetailError"><template #default><el-button size="small" :loading="projectDetailLoading" @click="openProjectUpdates(activeProject)">重试</el-button></template></el-alert>
      <div v-loading="projectDetailLoading" class="update-layout">
        <div class="update-form">
          <h3>发布执行动态</h3>
          <el-form :model="updateForm" label-width="96px">
            <el-form-item label="标题" required><el-input v-model="updateForm.title" maxlength="120" /></el-form-item>
            <el-form-item label="内容" required><el-input v-model="updateForm.content" type="textarea" :rows="4" /></el-form-item>
            <el-form-item label="执行凭证">
              <div class="upload-line">
                <el-input v-model="updateForm.proofUrl" maxlength="500" placeholder="上传图片后自动填入，也可填写外部凭证 URL" />
                <el-upload
                  action="/api/admin/uploads/images"
                  name="file"
                  :headers="uploadHeaders()"
                  :show-file-list="false"
                  :before-upload="beforeImageUpload"
                  :on-success="handleUpdateProofUploadSuccess"
                  :on-error="handleProofUploadError"
                >
                  <el-button :icon="UploadFilled">上传</el-button>
                </el-upload>
                <el-button v-if="updateForm.proofUrl" @click="openProof(updateForm.proofUrl)">查看</el-button>
              </div>
            </el-form-item>
            <el-form-item label="发布时间"><el-date-picker v-model="updateForm.publishedAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="默认当前时间" /></el-form-item>
            <el-form-item label="公开展示"><el-switch v-model="updateForm.publicVisible" /></el-form-item>
          </el-form>
          <el-button type="primary" :loading="updateSaving" :disabled="updateSaving || projectDetailLoading" @click="saveProjectUpdate">发布动态</el-button>
        </div>
        <div class="update-list">
          <h3>已发布动态</h3>
          <el-empty v-if="!projectUpdates.length" description="暂无动态" />
          <div v-for="item in projectUpdates" :key="item.id" class="timeline-item">
            <strong>{{ item.title }}</strong>
            <span>{{ formatTime(item.publishedAt || item.createdAt) }} · {{ item.publicVisible ? "公开" : "隐藏" }}</span>
            <p>{{ item.content }}</p>
            <el-button v-if="item.proofUrl" link type="primary" @click="openProof(item.proofUrl)">查看凭证</el-button>
          </div>
          <h3>拨款申请与凭证</h3>
          <el-empty v-if="!projectDisbursements.length" description="暂无拨付记录" />
          <div v-for="item in projectDisbursements" :key="item.id" class="timeline-item">
            <strong>第 {{ item.stageNo || 1 }} 阶段 · ¥{{ money(item.amount) }} · {{ disbursementStatusText[item.status] || item.status }}</strong>
            <span>申请：{{ item.requestedBy?.username || item.operator?.username || "系统" }} {{ formatTime(item.createdAt) }}<template v-if="item.reviewedBy"> · 复核：{{ item.reviewedBy.username }} {{ formatTime(item.reviewedAt) }}</template><template v-if="item.paidBy"> · 付款：{{ item.paidBy.username }} {{ formatTime(item.paidAt) }}</template><template v-if="item.cancelledBy"> · 取消：{{ item.cancelledBy.username }} {{ formatTime(item.cancelledAt) }}</template></span>
            <p>{{ item.remark || "公益项目拨付" }}</p>
            <p v-if="item.reviewRemark">复核意见：{{ item.reviewRemark }}</p>
            <p v-if="item.paidReference">付款流水：{{ item.paidReference }}</p>
            <p v-if="item.cancelRemark">取消原因：{{ item.cancelRemark }}</p>
            <el-button v-if="item.proofUrl" link type="primary" @click="openProof(item.proofUrl)">查看凭证</el-button>
            <div v-if="canFinance" class="timeline-actions">
              <el-button v-if="item.status === 'pending_review'" size="small" type="success" :loading="projectActionKey === `disbursement-review:approve:${item.id}`" :disabled="Boolean(projectActionKey)" @click="reviewDisbursement(item, 'approve')">复核通过</el-button>
              <el-button v-if="item.status === 'pending_review'" size="small" type="danger" :loading="projectActionKey === `disbursement-review:reject:${item.id}`" :disabled="Boolean(projectActionKey)" @click="reviewDisbursement(item, 'reject')">拒绝</el-button>
              <el-button v-if="item.status === 'approved'" size="small" type="primary" :loading="projectActionKey === `disbursement-pay:${item.id}`" :disabled="Boolean(projectActionKey)" @click="payDisbursement(item)">确认付款</el-button>
              <el-button v-if="['pending_review', 'approved'].includes(item.status)" size="small" :loading="projectActionKey === `disbursement-cancel:${item.id}`" :disabled="Boolean(projectActionKey)" @click="cancelDisbursement(item)">取消拨款</el-button>
            </div>
          </div>
          <h3>项目状态记录</h3>
          <el-empty v-if="!projectEvents.length" description="暂无状态记录" />
          <div v-for="item in projectEvents" :key="item.id" class="timeline-item">
            <strong>{{ statusText[item.fromStatus] || item.fromStatus || "新建" }} → {{ statusText[item.toStatus] || item.toStatus }}</strong>
            <span>{{ formatTime(item.createdAt) }} · {{ item.operator?.username || "系统" }} · {{ item.action }}</span>
            <p v-if="item.remark">{{ item.remark }}</p>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="disbursementDialogVisible" :title="activeDisbursementProject ? `拨款申请：${activeDisbursementProject.title}` : '拨款申请'" width="560px" destroy-on-close>
      <el-alert class="page-hint" type="info" :closable="false" :title="`当前公益池可用 ¥${money(summary?.availableAmount)}`" />
      <el-form :model="disbursementForm" label-width="96px">
        <el-form-item label="拨付金额" required><el-input-number v-model="disbursementForm.amount" :min="0.01" :precision="2" /></el-form-item>
        <el-form-item label="拨款阶段" required><el-input-number v-model="disbursementForm.stageNo" :min="1" :step="1" /></el-form-item>
        <el-form-item label="申请说明"><el-input v-model="disbursementForm.remark" type="textarea" :rows="3" maxlength="500" /></el-form-item>
        <el-form-item label="申请材料">
          <div class="upload-line">
            <el-input v-model="disbursementForm.proofUrl" maxlength="500" placeholder="上传预算、合同、收款信息等图片/PDF，也可填写外部 URL" />
            <el-upload
              action="/api/admin/uploads/settlement-proofs"
              name="file"
              :headers="uploadHeaders()"
              :show-file-list="false"
              :before-upload="beforeProofUpload"
              :on-success="handleDisbursementProofUploadSuccess"
              :on-error="handleProofUploadError"
            >
              <el-button :icon="UploadFilled">上传</el-button>
            </el-upload>
            <el-button v-if="disbursementForm.proofUrl" @click="openProof(disbursementForm.proofUrl)">查看</el-button>
          </div>
        </el-form-item>
        <el-form-item label="公开展示"><el-switch v-model="disbursementForm.publicVisible" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="disbursementDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="disbursementSaving" :disabled="disbursementSaving" @click="saveDisbursement">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.page-hint { margin-bottom: 16px; }
.charity-tabs { min-width: 0; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.section-head h3, .section-head p, .table-head p { margin: 0; }
.section-head p, .table-head p { margin-top: 5px; color: #667085; font-size: 13px; }
.metric-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.metric { min-height: 104px; display: grid; gap: 8px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.metric span { color: #667085; font-size: 13px; }
.metric strong { color: #111827; font-size: 26px; }
.alert-stack { display: grid; gap: 8px; margin-bottom: 18px; }
.setting-card { margin-bottom: 18px; }
.unit { margin-left: 8px; color: #667085; }
.form-tip { margin-left: 10px; color: #667085; font-size: 13px; }
.table-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.table-head h3 { margin: 0; }
.filters { display: grid; grid-template-columns: 220px 150px 150px auto auto; gap: 10px; }
.project-filters { grid-template-columns: minmax(220px, 360px) 180px auto; align-items: center; margin-bottom: 16px; }
.result-count { color: #667085; font-size: 13px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; overflow-x: auto; }
h3 { margin: 0 0 16px; }
.update-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
.update-form, .update-list { min-width: 0; }
.timeline-item { padding: 12px 0; border-bottom: 1px solid #eef2f7; }
.timeline-item strong { display: block; color: #111827; }
.timeline-item span { display: block; margin-top: 4px; color: #667085; font-size: 12px; }
.timeline-item p { margin: 8px 0 0; color: #344054; line-height: 1.55; white-space: pre-wrap; }
.timeline-item a { display: inline-block; margin-top: 8px; color: #2563eb; }
.timeline-actions { display: flex; gap: 8px; margin-top: 10px; }
.upload-line { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; width: 100%; }
.certificate-preview-shell { min-height: 320px; display: grid; place-items: center; overflow: auto; }
.certificate-preview-shell img { display: block; width: 100%; height: auto; max-height: 72vh; object-fit: contain; }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) { .table-head, .section-head { display: grid; } .filters, .project-filters { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .update-layout { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .metric-grid, .upload-line { grid-template-columns: 1fr; } }
</style>
