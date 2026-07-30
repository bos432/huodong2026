<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Download, Edit, Key, Plus, Refresh, Search } from "@element-plus/icons-vue";
import { api, downloadFile } from "../api";
import { hasPermission, isPlatformAdmin } from "../permissions";
import { maskPhone } from "../privacy";

const route = useRoute();
const router = useRouter();
const DEFAULT_MINIPROGRAM_TENANT_CODE = "qiwai-showcase";
const rows = ref<any[]>([]);
const levels = ref<any[]>([]);
const managedLevels = ref<any[]>([]);
const pointRules = ref<any[]>([]);
const tenants = ref<any[]>([]);
const detail = ref<any>();
const detailTarget = ref<any>();
const detailLoading = ref(false);
const detailError = ref("");
const wallet = ref<any>();
const walletTransactions = ref<any[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const lifecycleScanning = ref(false);
const levelLoading = ref(false);
const pointRuleLoading = ref(false);
const pointsAdjusting = ref(false);
const exporting = ref(false);
const keyword = ref(String(route.query.keyword || ""));
const activityId = ref<number | undefined>(routeActivityId());
const sourceChannel = ref(String(route.query.sourceChannel || ""));
const wechatBound = ref(String(route.query.wechatBound || ""));
const phoneBound = ref(String(route.query.phoneBound || ""));
const levelId = ref(String(route.query.levelId || ""));
const activeStart = ref(String(route.query.activeStart || ""));
const activeEnd = ref(String(route.query.activeEnd || ""));
const quickFilter = ref(String(route.query.quickFilter || ""));
const tagFilter = ref(String(route.query.tag || ""));
const sortBy = ref(String(route.query.sortBy || "lastActiveAt"));
const sortOrder = ref(String(route.query.sortOrder || "DESC"));
const page = ref(Number(route.query.page || 1) || 1);
const pageSize = ref(Number(route.query.pageSize || 20) || 20);
const total = ref(0);
const summary = ref({ totalMembers: 0, phoneBound: 0, wechatBound: 0, miniProgramSource: 0, active7Days: 0 });
const detailDrawer = ref(false);
const levelDialog = ref(false);
const memberLevelDialog = ref(false);
const pointRuleDialog = ref(false);
const memberDialog = ref(false);
const editMemberDialog = ref(false);
const passwordDialog = ref(false);
const walletDialog = ref(false);
const bulkTagDialog = ref(false);
const saving = ref(false);
const memberLevelSaving = ref(false);
const pointRuleSaving = ref(false);
const memberSaving = ref(false);
const editMemberSaving = ref(false);
const passwordSaving = ref(false);
const walletSaving = ref(false);
const bulkTagSaving = ref(false);
const editingLevelId = ref<number | null>(null);
const editingPointRuleId = ref<number | null>(null);
const selectedRows = ref<any[]>([]);
const walletScopeTenantId = ref(storedPlatformTenantId());
const levelScopeTenantId = ref(0);
const canManageMembers = computed(() => hasPermission("member.manage"));
const canResetMemberPassword = computed(() => hasPermission("member.password"));
const canAdjustMemberPoints = computed(() => hasPermission("member.points.manage"));
const canScanMemberLifecycle = computed(() => hasPermission("member.lifecycle.manage"));
const canAdjustMemberLevel = computed(() => hasPermission("member.lifecycle.manage"));
const canViewSensitive = computed(() => hasPermission("member.sensitive"));
const canExportMembers = computed(() => hasPermission("member.export"));
const canManageMemberLevels = computed(() => hasPermission("member_level.manage"));
const canViewPointRules = computed(() => hasPermission("member_point_rule.view"));
const canManagePointRules = computed(() => hasPermission("member_point_rule.manage"));
const canManageTags = computed(() => hasPermission("tag.manage"));
const canAdjustWallet = computed(() => hasPermission("finance.wallet_adjust"));
const canViewWallet = computed(() => isPlatformAdmin() && (hasPermission("finance.view") || canAdjustWallet.value));
let pendingPointAdjustment: { signature: string; key: string } | null = null;

const levelForm = reactive({
  name: "",
  minPoints: 0,
  minGrowth: 0,
  validityDays: undefined as number | undefined,
  benefitsText: "",
  discountRate: 1,
  priorityBooking: false,
  enabled: true,
  sortOrder: 0
});

const memberLevelForm = reactive({
  levelId: 0,
  reason: ""
});

const pointRuleForm = reactive({
  enabled: true,
  calculationMode: "fixed" as "fixed" | "amount_ratio",
  fixedPoints: 0,
  amountFenPerPoint: 100,
  growthMode: "same_as_points" as "same_as_points" | "fixed" | "none",
  fixedGrowth: 0,
  validityDays: undefined as number | undefined
});

const walletForm = reactive({
  type: "recharge" as "recharge" | "deduct" | "adjust" | "gift_grant" | "gift_revoke" | "freeze" | "unfreeze",
  fundSource: "mixed" as "cash" | "gift" | "mixed",
  amount: 0,
  tenantId: 0,
  remark: ""
});

const memberForm = reactive({
  phone: "",
  password: "",
  nickname: "",
  remark: ""
});

const editMemberForm = reactive({
  phone: "",
  nickname: "",
  avatarUrl: ""
});

const passwordForm = reactive({
  password: "",
  confirmPassword: ""
});
const bulkTagForm = reactive({
  name: "",
  color: "default",
  remark: ""
});

function routeActivityId() {
  const id = typeof route.query.activityId === "string" ? Number(route.query.activityId) : undefined;
  return id && Number.isFinite(id) ? id : undefined;
}

function storedPlatformTenantId() {
  const id = Number(localStorage.getItem("admin_selected_tenant_id") || 0);
  return id && Number.isFinite(id) ? id : 0;
}

const focusedActivityName = computed(() => rows.value.find((row) => row.activity?.id === activityId.value)?.activity?.title || (activityId.value ? `活动 ID ${activityId.value}` : ""));
const memberSummary = computed(() => {
  if (!activityId.value) return "";
  const paid = rows.value.filter((row) => Number(row.totalSpent || 0) > 0).length;
  const reviewed = rows.value.filter((row) => Number(row.reviewCount || 0) > 0).length;
  return `本场活动沉淀 ${total.value || rows.value.length} 个会员线索，本页 ${paid} 人已有消费、${reviewed} 人留下评价。`;
});
const walletScopeName = computed(() => walletTenantLabel(walletScopeTenantId.value));
const walletFormScopeName = computed(() => walletTenantLabel(walletForm.tenantId));
const levelScopeName = computed(() => {
  if (!isPlatformAdmin()) return managedLevels.value.find((level) => level.tenant)?.tenant?.name || "当前商家";
  if (!levelScopeTenantId.value) return "平台模板";
  const tenant = tenants.value.find((item) => item.id === levelScopeTenantId.value);
  return tenant ? `${tenant.name || tenant.code}（${tenant.code}）` : `商家 ID ${levelScopeTenantId.value}`;
});

function walletTenantLabel(id?: number) {
  if (!id) return "平台钱包";
  const tenant = tenants.value.find((item) => item.id === id);
  return tenant ? `${tenant.name || tenant.code}（${tenant.code || `ID ${tenant.id}`}）` : `商家钱包 ID ${id}`;
}

function normalizedWalletTenantId(value: unknown) {
  const id = Number(value || 0);
  return id && Number.isFinite(id) ? id : 0;
}

function tenantIdByCode(code: string) {
  return tenants.value.find((tenant) => tenant.code === code)?.id || 0;
}

function defaultWalletTenantIdForMember(row: any) {
  if (!isPlatformAdmin()) return 0;
  const user = row?.user || row?.profile?.user;
  if (user?.sourceChannel !== "mp_weixin") return walletScopeTenantId.value;
  return tenantIdByCode(DEFAULT_MINIPROGRAM_TENANT_CODE) || walletScopeTenantId.value;
}

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [result, options] = await Promise.all([
      api.get<any, any>("/admin/members", { params: memberQueryParams() }),
      api.get<any, any>("/admin/members/options")
    ]);
    if (Array.isArray(result)) {
      rows.value = result;
      total.value = result.length;
      summary.value = buildSummaryFromRows(result);
    } else {
      rows.value = result.items || [];
      total.value = Number(result.total || 0);
      page.value = Number(result.page || page.value);
      pageSize.value = Number(result.pageSize || pageSize.value);
      summary.value = result.summary || buildSummaryFromRows(rows.value);
    }
    levels.value = options.levels || [];
    tenants.value = options.tenants || [];
    if (walletScopeTenantId.value && !tenants.value.some((tenant) => tenant.id === walletScopeTenantId.value)) walletScopeTenantId.value = 0;
    if (levelScopeTenantId.value && !tenants.value.some((tenant) => tenant.id === levelScopeTenantId.value)) levelScopeTenantId.value = 0;
    await Promise.all([loadManagedLevels(false), loadPointRules(false)]);
  } catch (error: any) {
    errorMessage.value = error.message || "会员数据加载失败";
  } finally {
    loading.value = false;
  }
}

async function loadManagedLevels(showError = true) {
  levelLoading.value = true;
  try {
    managedLevels.value = isPlatformAdmin()
      ? await api.get<any, any[]>("/admin/member-levels", { params: levelScopeTenantId.value ? { tenantId: levelScopeTenantId.value } : undefined })
      : levels.value;
  } catch (error: any) {
    managedLevels.value = [];
    if (showError) ElMessage.error(error.message || "会员等级加载失败");
    else throw error;
  } finally {
    levelLoading.value = false;
  }
}

async function loadPointRules(showError = true) {
  if (!canViewPointRules.value) {
    pointRules.value = [];
    return;
  }
  pointRuleLoading.value = true;
  try {
    pointRules.value = await api.get<any, any[]>("/admin/member-point-rules", { params: isPlatformAdmin() && levelScopeTenantId.value ? { tenantId: levelScopeTenantId.value } : undefined });
  } catch (error: any) {
    pointRules.value = [];
    if (showError) ElMessage.error(error.message || "积分规则加载失败");
    else throw error;
  } finally {
    pointRuleLoading.value = false;
  }
}

async function changeMemberScope() {
  await Promise.all([loadManagedLevels(), loadPointRules()]);
}

async function scanMemberLifecycle() {
  if (!canScanMemberLifecycle.value || lifecycleScanning.value) return;
  lifecycleScanning.value = true;
  try {
    const result = await api.post<any, any>("/admin/members/lifecycle-scan", {});
    ElMessage.success(`处理积分到期 ${result.expiredPointCount || 0} 条、等级到期 ${result.expiredLevelCount || 0} 人`);
    await load();
  } catch (error: any) { ElMessage.error(error.message || "会员生命周期扫描失败"); }
  finally { lifecycleScanning.value = false; }
}

async function adjustPoints() {
  if (!canAdjustMemberPoints.value || pointsAdjusting.value || !detail.value?.profile?.user?.id) return;
  try {
    const amountResult = await ElMessageBox.prompt("正数为补发，负数为扣回", "调整会员积分", { inputPlaceholder: "例如 100 或 -50", inputPattern: /^-?\d+$/, inputErrorMessage: "请输入非零整数" });
    const points = Number(amountResult.value);
    if (!points) return ElMessage.warning("调整积分不能为 0");
    const remarkResult = await ElMessageBox.prompt("请填写调整原因，便于财务和客服追溯", "积分调整依据", { inputPlaceholder: "必填", inputValidator: value => Boolean(value?.trim()) || "请输入调整原因" });
    const expiryResult = await ElMessageBox.prompt("可填写到期时间；留空表示长期有效", "积分有效期", { inputPlaceholder: "YYYY-MM-DD，可留空", inputPattern: /^(|\d{4}-\d{2}-\d{2})$/, inputErrorMessage: "日期格式不正确" });
    const payload = { points, remark: String(remarkResult.value || "").trim(), expiresAt: expiryResult.value ? `${expiryResult.value}T23:59:59` : undefined };
    const signature = JSON.stringify(payload);
    if (!pendingPointAdjustment || pendingPointAdjustment.signature !== signature) pendingPointAdjustment = { signature, key: memberBusinessKey("points") };
    pointsAdjusting.value = true;
    await api.post(`/admin/members/${detail.value.profile.user.id}/points/adjust`, { ...payload, idempotencyKey: pendingPointAdjustment.key });
    pendingPointAdjustment = null;
    ElMessage.success(points > 0 ? "积分已补发" : "积分已扣回");
    await openDetail(detail.value.profile);
  } catch (error: any) { if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "积分调整失败"); }
  finally { pointsAdjusting.value = false; }
}

function openMemberLevelDialog() {
  if (!canAdjustMemberLevel.value || !detail.value?.profile) return;
  memberLevelForm.levelId = Number(detail.value.profile.level?.id || 0);
  memberLevelForm.reason = "";
  memberLevelDialog.value = true;
}

async function saveMemberLevelAdjustment() {
  const userId = Number(detail.value?.profile?.user?.id || 0);
  if (!canAdjustMemberLevel.value || !userId || memberLevelSaving.value) return;
  if (!memberLevelForm.reason.trim()) return ElMessage.warning("请填写等级调整原因");
  memberLevelSaving.value = true;
  try {
    await api.post(`/admin/members/${userId}/level`, { levelId: memberLevelForm.levelId || undefined, reason: memberLevelForm.reason.trim() });
    ElMessage.success("会员等级已调整");
    memberLevelDialog.value = false;
    await openDetail({ user: detail.value.profile.user }, { applyDefaultWalletScope: false });
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "会员等级调整失败");
  } finally {
    memberLevelSaving.value = false;
  }
}

function memberBusinessKey(action: string) {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(16).slice(2);
  return `member:${action}:${detail.value?.profile?.user?.id || 0}:${Date.now()}:${random}`;
}

function memberQueryParams() {
  return {
    keyword: keyword.value || undefined,
    activityId: activityId.value || undefined,
    sourceChannel: sourceChannel.value || undefined,
    wechatBound: wechatBound.value || undefined,
    phoneBound: phoneBound.value || undefined,
    levelId: levelId.value || undefined,
    activeStart: activeStart.value || undefined,
    activeEnd: activeEnd.value || undefined,
    quickFilter: quickFilter.value || undefined,
    tag: tagFilter.value || undefined,
    sortBy: sortBy.value || undefined,
    sortOrder: sortOrder.value || undefined,
    page: page.value,
    pageSize: pageSize.value
  };
}

function buildSummaryFromRows(items: any[]) {
  const activeLine = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    totalMembers: items.length,
    phoneBound: items.filter((row) => row.user?.phoneBound).length,
    wechatBound: items.filter((row) => row.user?.wechatBound).length,
    miniProgramSource: items.filter((row) => row.user?.sourceChannel === "mp_weixin").length,
    active7Days: items.filter((row) => row.lastActiveAt && new Date(row.lastActiveAt).getTime() >= activeLine).length
  };
}

function syncRouteQuery() {
  router.replace({
    path: "/members",
    query: {
      keyword: keyword.value || undefined,
      activityId: activityId.value || undefined,
      sourceChannel: sourceChannel.value || undefined,
      wechatBound: wechatBound.value || undefined,
      phoneBound: phoneBound.value || undefined,
      levelId: levelId.value || undefined,
      activeStart: activeStart.value || undefined,
      activeEnd: activeEnd.value || undefined,
      quickFilter: quickFilter.value || undefined,
      tag: tagFilter.value || undefined,
      sortBy: sortBy.value !== "lastActiveAt" ? sortBy.value : undefined,
      sortOrder: sortOrder.value !== "DESC" ? sortOrder.value : undefined,
      page: page.value > 1 ? page.value : undefined,
      pageSize: pageSize.value !== 20 ? pageSize.value : undefined
    }
  });
}

function applyFilter() {
  page.value = 1;
  syncRouteQuery();
  load();
}

function resetFilter() {
  keyword.value = "";
  sourceChannel.value = "";
  wechatBound.value = "";
  phoneBound.value = "";
  levelId.value = "";
  activeStart.value = "";
  activeEnd.value = "";
  quickFilter.value = "";
  tagFilter.value = "";
  sortBy.value = "lastActiveAt";
  sortOrder.value = "DESC";
  page.value = 1;
  syncRouteQuery();
  load();
}

function applyQuickFilter(value: string) {
  quickFilter.value = quickFilter.value === value ? "" : value;
  applyFilter();
}

function selectionChange(selection: any[]) {
  selectedRows.value = selection;
}

function openBulkTagDialog() {
  if (!canManageTags.value) return;
  if (!selectedRows.value.length) return ElMessage.warning("请先选择会员");
  Object.assign(bulkTagForm, { name: "", color: "default", remark: "" });
  bulkTagDialog.value = true;
}

async function saveBulkTag() {
  if (!canManageTags.value) return;
  if (!bulkTagForm.name.trim()) return ElMessage.warning("请填写标签名称");
  bulkTagSaving.value = true;
  try {
    const result = await api.post<any, any>("/admin/tags/bulk-members", {
      userIds: selectedRows.value.map((row) => row.user?.id).filter(Boolean),
      name: bulkTagForm.name.trim(),
      color: bulkTagForm.color,
      remark: bulkTagForm.remark.trim() || undefined
    });
    ElMessage.success(`已新增 ${result.createdCount || 0} 个标签，跳过 ${result.skippedCount || 0} 个重复项`);
    bulkTagDialog.value = false;
    tagFilter.value = bulkTagForm.name.trim();
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "批量打标签失败");
  } finally {
    bulkTagSaving.value = false;
  }
}

function clearActivityFilter() {
  activityId.value = undefined;
  page.value = 1;
  syncRouteQuery();
  load();
}

function changePage(nextPage: number) {
  page.value = nextPage;
  syncRouteQuery();
  load();
}

function changePageSize(nextSize: number) {
  pageSize.value = nextSize;
  page.value = 1;
  syncRouteQuery();
  load();
}

async function exportRows() {
  if (!canExportMembers.value || exporting.value) return;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(memberQueryParams())) {
    if (key === "page" || key === "pageSize" || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  exporting.value = true;
  try {
    await downloadFile(`/admin/members/export${params.size ? `?${params}` : ""}`, "会员数据.xlsx");
    ElMessage.success("会员数据已导出");
  } catch (error: any) {
    ElMessage.error(error.message || "导出会员数据失败");
  } finally {
    exporting.value = false;
  }
}

async function openDetail(row: any, options: { applyDefaultWalletScope?: boolean } = { applyDefaultWalletScope: true }) {
  detailTarget.value = row;
  if (options.applyDefaultWalletScope !== false) {
    walletScopeTenantId.value = defaultWalletTenantIdForMember(row);
  }
  const walletParams = walletScopeTenantId.value ? { tenantId: walletScopeTenantId.value } : undefined;
  detailDrawer.value = true;
  detail.value = null;
  detailLoading.value = true;
  detailError.value = "";
  try {
    const [memberDetail, walletDetail, transactions] = await Promise.all([
      api.get(`/admin/members/${row.user.id}`),
      canViewWallet.value ? api.get(`/admin/users/${row.user.id}/wallet`, { params: walletParams }) : Promise.resolve(null),
      canViewWallet.value ? api.get<any, any[]>("/admin/finance/wallet-transactions", { params: { userId: row.user.id, ...(walletParams || {}) } }) : Promise.resolve([])
    ]);
    detail.value = memberDetail;
    wallet.value = walletDetail;
    walletTransactions.value = transactions;
  } catch (error: any) {
    detailError.value = error.message || "会员详情加载失败";
  } finally {
    detailLoading.value = false;
  }
}

function openWalletDialog(type: "recharge" | "deduct" | "adjust" | "gift_grant" | "gift_revoke" | "freeze" | "unfreeze") {
  if (!canAdjustWallet.value) return;
  walletForm.type = type;
  walletForm.amount = 0;
  walletForm.fundSource = "mixed";
  walletForm.tenantId = walletScopeTenantId.value;
  walletForm.remark = "";
  walletDialog.value = true;
}

async function reloadWalletDetail() {
  if (!detail.value?.profile?.user) return;
  await openDetail({ user: detail.value.profile.user }, { applyDefaultWalletScope: false });
}

async function saveWalletAdjust() {
  if (!canAdjustWallet.value || !detail.value?.profile?.user?.id) return;
  if (!Number.isFinite(Number(walletForm.amount)) || Number(walletForm.amount) === 0) {
    ElMessage.warning("请填写调整金额");
    return;
  }
  walletSaving.value = true;
  try {
    await api.post(`/admin/users/${detail.value.profile.user.id}/wallet/adjust`, { ...walletForm, amount: Number(walletForm.amount), tenantId: walletForm.tenantId || undefined, idempotencyKey: `wallet:${detail.value.profile.user.id}:${Date.now()}:${Math.random().toString(16).slice(2)}` });
    ElMessage.success("余额已更新");
    walletDialog.value = false;
    walletScopeTenantId.value = normalizedWalletTenantId(walletForm.tenantId);
    await openDetail({ user: detail.value.profile.user }, { applyDefaultWalletScope: false });
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    walletSaving.value = false;
  }
}

function openCreateLevel() {
  if (!canManageMemberLevels.value) return;
  editingLevelId.value = null;
  Object.assign(levelForm, { name: "", minPoints: 0, minGrowth: 0, validityDays: undefined, benefitsText: "", discountRate: 1, priorityBooking: false, enabled: true, sortOrder: managedLevels.value.length + 1 });
  levelDialog.value = true;
}

function openCreateMember() {
  if (!canManageMembers.value) return;
  Object.assign(memberForm, { phone: "", password: "", nickname: "", remark: "" });
  memberDialog.value = true;
}

function openEditMember() {
  if (!canManageMembers.value) return;
  const user = detail.value?.profile?.user;
  if (!user) return;
  Object.assign(editMemberForm, { phone: canViewSensitive.value ? user.phone || "" : "", nickname: user.nickname || "", avatarUrl: user.avatarUrl || "" });
  editMemberDialog.value = true;
}

async function saveMemberEdit() {
  if (!canManageMembers.value) return;
  const user = detail.value?.profile?.user;
  if (!user?.id) return;
  if (canViewSensitive.value && editMemberForm.phone.trim() && !/^1\d{10}$/.test(editMemberForm.phone.trim())) {
    ElMessage.warning("请填写正确的手机号");
    return;
  }
  editMemberSaving.value = true;
  try {
    await api.patch(`/admin/members/${user.id}`, {
      ...(canViewSensitive.value ? { phone: editMemberForm.phone.trim() } : {}),
      nickname: editMemberForm.nickname.trim(),
      avatarUrl: editMemberForm.avatarUrl.trim()
    });
    ElMessage.success("会员资料已保存");
    editMemberDialog.value = false;
    await openDetail({ user });
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    editMemberSaving.value = false;
  }
}

function openPasswordDialog() {
  if (!canResetMemberPassword.value) return;
  Object.assign(passwordForm, { password: "", confirmPassword: "" });
  passwordDialog.value = true;
}

async function resetMemberPassword() {
  if (!canResetMemberPassword.value) return;
  const user = detail.value?.profile?.user;
  if (!user?.id) return;
  if (passwordForm.password.length < 6 || passwordForm.password.length > 64) {
    ElMessage.warning("会员密码长度需为 6-64 位");
    return;
  }
  if (passwordForm.password !== passwordForm.confirmPassword) {
    ElMessage.warning("两次输入的密码不一致");
    return;
  }
  await ElMessageBox.confirm(`确认重置「${user.nickname || user.phone || `用户${user.id}`}」的 H5 登录密码？`, "重置会员密码", { type: "warning", confirmButtonText: "确认重置", cancelButtonText: "取消" });
  passwordSaving.value = true;
  try {
    await api.post(`/admin/members/${user.id}/password`, { password: passwordForm.password });
    ElMessage.success("会员密码已重置");
    passwordDialog.value = false;
  } catch (error: any) {
    ElMessage.error(error.message || "重置失败");
  } finally {
    passwordSaving.value = false;
  }
}

async function saveMember() {
  if (!canManageMembers.value) return;
  if (!memberForm.phone.trim() && !memberForm.nickname.trim()) {
    ElMessage.warning("请至少填写手机号或昵称");
    return;
  }
  if (memberForm.phone.trim() && !/^1\d{10}$/.test(memberForm.phone.trim())) {
    ElMessage.warning("请填写正确的手机号");
    return;
  }
  if (canResetMemberPassword.value && memberForm.password && (memberForm.password.length < 6 || memberForm.password.length > 64)) {
    ElMessage.warning("初始密码长度需为 6-64 位");
    return;
  }
  memberSaving.value = true;
  try {
    await api.post("/admin/members", {
      phone: memberForm.phone.trim() || undefined,
      password: canResetMemberPassword.value ? memberForm.password || undefined : undefined,
      nickname: memberForm.nickname.trim() || undefined,
      remark: memberForm.remark.trim() || undefined
    });
    ElMessage.success("会员已创建");
    memberDialog.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "创建会员失败");
  } finally {
    memberSaving.value = false;
  }
}

function openEditLevel(row: any) {
  if (!canManageMemberLevels.value) return;
  editingLevelId.value = row.id;
  Object.assign(levelForm, { name: row.name, minPoints: row.minPoints, minGrowth: row.minGrowth ?? row.minPoints, validityDays: row.validityDays || undefined, benefitsText: (row.benefits || []).map((item: any) => `${item.key}|${item.name}|${item.description || ""}`).join("\n"), discountRate: Number(row.discountRate), priorityBooking: row.priorityBooking, enabled: row.enabled, sortOrder: row.sortOrder });
  levelDialog.value = true;
}

async function saveLevel() {
  if (!canManageMemberLevels.value) return;
  if (!levelForm.name.trim()) {
    ElMessage.warning("请填写等级名称");
    return;
  }
  saving.value = true;
  try {
    const benefits = levelForm.benefitsText.split("\n").map(line => line.trim()).filter(Boolean).map(line => { const [key, name, ...description] = line.split("|"); return { key: key?.trim(), name: name?.trim(), description: description.join("|").trim() || undefined }; });
    if (benefits.some(item => !item.key || !item.name)) return ElMessage.warning("权益格式应为：标识|名称|说明");
    const { benefitsText, ...formPayload } = levelForm;
    const payload = { ...formPayload, benefits, discountRate: Number(levelForm.discountRate), tenantId: isPlatformAdmin() && levelScopeTenantId.value ? levelScopeTenantId.value : undefined };
    if (editingLevelId.value) await api.patch(`/admin/member-levels/${editingLevelId.value}`, payload);
    else await api.post("/admin/member-levels", payload);
    ElMessage.success("会员等级已保存");
    levelDialog.value = false;
    load();
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    saving.value = false;
  }
}

function openPointRule(row: any) {
  if (!canManagePointRules.value) return;
  editingPointRuleId.value = Number(row.id);
  Object.assign(pointRuleForm, {
    enabled: Boolean(row.enabled),
    calculationMode: row.calculationMode,
    fixedPoints: Number(row.fixedPoints || 0),
    amountFenPerPoint: Number(row.amountFenPerPoint || 100),
    growthMode: row.growthMode,
    fixedGrowth: Number(row.fixedGrowth || 0),
    validityDays: row.validityDays || undefined
  });
  pointRuleDialog.value = true;
}

async function savePointRule() {
  if (!canManagePointRules.value || !editingPointRuleId.value || pointRuleSaving.value) return;
  if (pointRuleForm.enabled && pointRuleForm.fixedPoints <= 0) return ElMessage.warning("启用规则时积分数量必须大于 0");
  pointRuleSaving.value = true;
  try {
    await api.patch(`/admin/member-point-rules/${editingPointRuleId.value}`, { ...pointRuleForm, validityDays: pointRuleForm.validityDays || null });
    ElMessage.success("积分规则已保存，新规则只影响后续流水");
    pointRuleDialog.value = false;
    await loadPointRules();
  } catch (error: any) {
    ElMessage.error(error.message || "积分规则保存失败");
  } finally {
    pointRuleSaving.value = false;
  }
}

function pointEventText(value?: string) {
  return ({ activity_order_paid: "活动支付", mall_order_paid: "商城支付", activity_check_in: "现场核销", activity_review: "活动评价" } as Record<string, string>)[String(value || "")] || String(value || "-");
}

function pointRuleText(row: any) {
  if (!row.enabled) return "停用";
  return row.calculationMode === "amount_ratio" ? `每 ¥${money(Number(row.amountFenPerPoint || 100) / 100)} 发 ${row.fixedPoints} 分` : `每次 ${row.fixedPoints} 分`;
}

function pointGrowthText(row: any) {
  if (row.growthMode === "none") return "不增加";
  if (row.growthMode === "fixed") return `固定 ${row.fixedGrowth}`;
  return "同积分";
}

function money(value: string | number | undefined) {
  return Number(value || 0).toFixed(2);
}

function pointSourceText(value?: string | null) {
  const labels: Record<string, string> = {
    order_paid: "活动支付奖励",
    order_refund: "活动退款扣回",
    check_in: "活动签到奖励",
    activity_review: "活动评价奖励",
    points_redeem: "活动积分抵扣",
    points_return: "活动抵扣返还",
    mall_order_paid: "商城支付奖励",
    mall_order_refund: "商城退款扣回",
    mall_points_redeem: "商城积分抵扣",
    mall_checkout_points_redeem: "商城结算抵扣",
    mall_points_return: "商城抵扣返还",
    admin_point_adjust: "管理员调整",
    points_debt_recovery: "积分欠额偿还",
    points_expiry_reconciliation: "积分到期校准",
    points_balance_repair: "历史余额修复"
  };
  return value ? labels[value] || value : "未知来源";
}

function sourceChannelText(value?: string | null) {
  const labels: Record<string, string> = { h5: "H5", mp_weixin: "微信小程序", admin: "后台创建" };
  return value ? labels[value] || value : "未记录";
}

function loginChannelText(value?: string | null) {
  const labels: Record<string, string> = { h5: "H5", mp_weixin: "微信小程序" };
  return value ? labels[value] || value : "未记录";
}

function displayPhone(value?: string | null) {
  return canViewSensitive.value ? String(value || "-") : maskPhone(value);
}

function levelChangeSourceText(value?: string | null) {
  const labels: Record<string, string> = {
    migration_baseline: "迁移基线",
    growth: "成长值升降级",
    expiry_recalculation: "有效期到期",
    refund_recalculation: "退款重算",
    admin_adjustment: "人工调整",
    profile_update: "档案更新"
  };
  return value ? labels[value] || value : "未记录";
}

function formatTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

onMounted(load);

watch(
  () => route.query,
  () => {
    const nextActivityId = routeActivityId();
    const next = {
      keyword: String(route.query.keyword || ""),
      activityId: nextActivityId,
      sourceChannel: String(route.query.sourceChannel || ""),
      wechatBound: String(route.query.wechatBound || ""),
      phoneBound: String(route.query.phoneBound || ""),
      levelId: String(route.query.levelId || ""),
      activeStart: String(route.query.activeStart || ""),
      activeEnd: String(route.query.activeEnd || ""),
      quickFilter: String(route.query.quickFilter || ""),
      tagFilter: String(route.query.tag || ""),
      sortBy: String(route.query.sortBy || "lastActiveAt"),
      sortOrder: String(route.query.sortOrder || "DESC"),
      page: Number(route.query.page || 1) || 1,
      pageSize: Number(route.query.pageSize || 20) || 20
    };
    if (
      keyword.value === next.keyword &&
      activityId.value === next.activityId &&
      sourceChannel.value === next.sourceChannel &&
      wechatBound.value === next.wechatBound &&
      phoneBound.value === next.phoneBound &&
      levelId.value === next.levelId &&
      activeStart.value === next.activeStart &&
      activeEnd.value === next.activeEnd &&
      quickFilter.value === next.quickFilter &&
      tagFilter.value === next.tagFilter &&
      sortBy.value === next.sortBy &&
      sortOrder.value === next.sortOrder &&
      page.value === next.page &&
      pageSize.value === next.pageSize
    ) return;
    keyword.value = next.keyword;
    activityId.value = next.activityId;
    sourceChannel.value = next.sourceChannel;
    wechatBound.value = next.wechatBound;
    phoneBound.value = next.phoneBound;
    levelId.value = next.levelId;
    activeStart.value = next.activeStart;
    activeEnd.value = next.activeEnd;
    quickFilter.value = next.quickFilter;
    tagFilter.value = next.tagFilter;
    sortBy.value = next.sortBy;
    sortOrder.value = next.sortOrder;
    page.value = next.page;
    pageSize.value = next.pageSize;
    load();
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>会员管理</h2>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="load">刷新</el-button>
        <el-button v-if="canExportMembers" :icon="Download" :loading="exporting" @click="exportRows">导出 Excel</el-button>
        <el-button v-if="canScanMemberLifecycle" :loading="lifecycleScanning" @click="scanMemberLifecycle">扫描到期权益</el-button>
        <el-button v-if="canManageMembers" :icon="Plus" @click="openCreateMember">新增会员</el-button>
        <el-button v-if="canManageMemberLevels" type="primary" :icon="Plus" @click="openCreateLevel">新建等级</el-button>
      </div>
    </div>

    <el-alert v-if="errorMessage" class="activity-alert" type="error" show-icon :closable="false" :title="errorMessage">
      <template #default><el-button size="small" :disabled="loading" @click="load">重试</el-button></template>
    </el-alert>

    <el-alert v-if="!canViewSensitive" class="activity-alert" type="info" show-icon :closable="false" title="会员身份信息已脱敏" description="手机号由服务端脱敏，微信 OpenID、UnionID 和小程序 AppID 不会下发。" />

    <div class="summary-grid">
      <div class="summary-card"><span>总会员</span><strong>{{ summary.totalMembers }}</strong></div>
      <div class="summary-card"><span>已绑手机号</span><strong>{{ summary.phoneBound }}</strong></div>
      <div class="summary-card"><span>微信绑定</span><strong>{{ summary.wechatBound }}</strong></div>
      <div class="summary-card"><span>小程序来源</span><strong>{{ summary.miniProgramSource }}</strong></div>
      <div class="summary-card"><span>近 7 日活跃</span><strong>{{ summary.active7Days }}</strong></div>
    </div>

    <el-alert
      v-if="isPlatformAdmin()"
      class="activity-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前为平台超级管理员视角"
      description="这里展示全平台会员。余额充值、扣减和调整可选择平台钱包或具体商家钱包；H5/小程序会显示当前 tenantCode 对应商家钱包。"
    />

    <el-alert
      v-if="activityId"
      class="activity-alert"
      type="success"
      show-icon
      :closable="false"
      title="已按复盘活动筛选会员"
      :description="`当前活动：${focusedActivityName}。${memberSummary}`"
    />

    <div class="table-card level-card">
      <div class="section-head">
        <div><h3>会员等级</h3><small class="section-caption">当前范围：{{ levelScopeName }}</small></div>
        <el-select v-if="isPlatformAdmin() && (canManageMemberLevels || canViewPointRules)" v-model="levelScopeTenantId" filterable style="width: 260px" @change="changeMemberScope">
          <el-option label="平台等级模板" :value="0" />
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
        </el-select>
      </div>
      <el-table v-loading="levelLoading" :data="managedLevels" stripe empty-text="暂无会员等级">
        <el-table-column prop="name" label="等级" min-width="140" />
        <el-table-column v-if="isPlatformAdmin()" label="归属" min-width="170"><template #default="{ row }">{{ row.tenant?.name || "平台模板" }}</template></el-table-column>
        <el-table-column prop="version" label="版本" width="90" />
        <el-table-column prop="minGrowth" label="成长值门槛" width="130" />
        <el-table-column label="有效期" width="110"><template #default="{ row }">{{ row.validityDays ? `${row.validityDays} 天` : "长期" }}</template></el-table-column>
        <el-table-column label="折扣" width="120"><template #default="{ row }">{{ Number(row.discountRate) === 1 ? "无折扣" : `${Number(row.discountRate * 10).toFixed(1)} 折` }}</template></el-table-column>
        <el-table-column label="优先报名" width="110"><template #default="{ row }"><el-tag :type="row.priorityBooking ? 'success' : 'info'">{{ row.priorityBooking ? "是" : "否" }}</el-tag></template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
        <el-table-column v-if="canManageMemberLevels" label="操作" width="110"><template #default="{ row }"><el-button size="small" :icon="Edit" @click="openEditLevel(row)">编辑</el-button></template></el-table-column>
      </el-table>
    </div>

    <div v-if="canViewPointRules" class="table-card level-card">
      <div class="section-head">
        <div><h3>积分规则</h3><small class="section-caption">当前范围：{{ levelScopeName }}；历史流水保留原规则版本</small></div>
        <el-button :icon="Refresh" :loading="pointRuleLoading" @click="loadPointRules()">刷新规则</el-button>
      </div>
      <el-table v-loading="pointRuleLoading" :data="pointRules" stripe empty-text="暂无积分规则">
        <el-table-column label="业务事件" min-width="130"><template #default="{ row }">{{ pointEventText(row.eventType) }}</template></el-table-column>
        <el-table-column prop="name" label="规则" min-width="150" />
        <el-table-column label="积分计算" min-width="180"><template #default="{ row }">{{ pointRuleText(row) }}</template></el-table-column>
        <el-table-column label="成长值" width="110"><template #default="{ row }">{{ pointGrowthText(row) }}</template></el-table-column>
        <el-table-column label="有效期" width="110"><template #default="{ row }">{{ row.validityDays ? `${row.validityDays} 天` : "长期" }}</template></el-table-column>
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
        <el-table-column v-if="canManagePointRules" label="操作" width="100"><template #default="{ row }"><el-button size="small" :icon="Edit" @click="openPointRule(row)">编辑</el-button></template></el-table-column>
      </el-table>
    </div>

    <div class="table-card">
      <el-form class="member-filters" label-position="top">
        <el-form-item label="关键词"><el-input v-model="keyword" clearable placeholder="手机号 / 昵称 / UserID" /></el-form-item>
        <el-form-item label="来源">
          <el-select v-model="sourceChannel" clearable placeholder="全部">
            <el-option label="H5" value="h5" />
            <el-option label="微信小程序" value="mp_weixin" />
            <el-option label="后台创建" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-select v-model="phoneBound" clearable placeholder="全部">
            <el-option label="已绑定" value="true" />
            <el-option label="未绑定" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="微信">
          <el-select v-model="wechatBound" clearable placeholder="全部">
            <el-option label="已绑定" value="true" />
            <el-option label="未绑定" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="等级">
          <el-select v-model="levelId" clearable placeholder="全部">
            <el-option label="普通会员" value="none" />
            <el-option v-for="level in levels" :key="level.id" :label="level.name" :value="String(level.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="活跃开始"><el-date-picker v-model="activeStart" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" /></el-form-item>
        <el-form-item label="活跃结束"><el-date-picker v-model="activeEnd" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" /></el-form-item>
        <el-form-item label="标签"><el-input v-model="tagFilter" clearable placeholder="输入标签名" /></el-form-item>
        <el-form-item label="排序">
          <div class="sort-row">
            <el-select v-model="sortBy">
              <el-option label="最近活跃" value="lastActiveAt" />
              <el-option label="最近登录" value="lastLoginAt" />
              <el-option label="积分" value="points" />
              <el-option label="消费" value="totalSpent" />
              <el-option label="报名数" value="registrationCount" />
              <el-option label="创建时间" value="createdAt" />
            </el-select>
            <el-select v-model="sortOrder" class="sort-order">
              <el-option label="降序" value="DESC" />
              <el-option label="升序" value="ASC" />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="操作" class="filter-actions">
          <el-button type="primary" :icon="Search" @click="applyFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
        <el-button v-if="activityId" @click="clearActivityFilter">查看全部会员</el-button>
      </el-form>
      <div class="quick-filter-row">
        <el-button :type="phoneBound === 'true' ? 'primary' : 'default'" size="small" @click="phoneBound='true'; applyFilter()">已绑定手机号</el-button>
        <el-button :type="phoneBound === 'false' ? 'primary' : 'default'" size="small" @click="phoneBound='false'; applyFilter()">未绑定手机号</el-button>
        <el-button :type="wechatBound === 'true' ? 'primary' : 'default'" size="small" @click="wechatBound='true'; applyFilter()">已绑定微信</el-button>
        <el-button :type="wechatBound === 'false' ? 'primary' : 'default'" size="small" @click="wechatBound='false'; applyFilter()">未绑定微信</el-button>
        <el-button :type="quickFilter === 'active7' ? 'primary' : 'default'" size="small" @click="applyQuickFilter('active7')">近 7 日活跃</el-button>
        <el-button :type="quickFilter === 'inactive30' ? 'primary' : 'default'" size="small" @click="applyQuickFilter('inactive30')">近 30 日未活跃</el-button>
        <el-button :type="quickFilter === 'spent' ? 'primary' : 'default'" size="small" @click="applyQuickFilter('spent')">有消费</el-button>
        <el-button :type="quickFilter === 'no_spent' ? 'primary' : 'default'" size="small" @click="applyQuickFilter('no_spent')">无消费</el-button>
        <el-button :type="quickFilter === 'registered' ? 'primary' : 'default'" size="small" @click="applyQuickFilter('registered')">有报名</el-button>
        <el-button :type="quickFilter === 'no_registered' ? 'primary' : 'default'" size="small" @click="applyQuickFilter('no_registered')">无报名</el-button>
        <el-button v-if="canManageTags" type="success" size="small" :disabled="!selectedRows.length" @click="openBulkTagDialog">批量打标签 {{ selectedRows.length ? `(${selectedRows.length})` : "" }}</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无会员" @selection-change="selectionChange">
        <el-table-column v-if="canManageTags" type="selection" width="44" />
        <el-table-column label="User ID" width="100"><template #default="{ row }">{{ row.user.id }}</template></el-table-column>
        <el-table-column label="会员" min-width="180"><template #default="{ row }">{{ row.user.nickname || (row.user.phone ? displayPhone(row.user.phone) : `用户${row.user.id}`) }}</template></el-table-column>
        <el-table-column label="手机号" width="140"><template #default="{ row }">{{ displayPhone(row.user.phone) }}</template></el-table-column>
        <el-table-column label="来源" width="115">
          <template #default="{ row }"><el-tag :type="row.user.sourceChannel === 'mp_weixin' ? 'success' : row.user.sourceChannel === 'h5' ? 'primary' : 'info'">{{ sourceChannelText(row.user.sourceChannel) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="微信绑定" width="110">
          <template #default="{ row }"><el-tag :type="row.user.wechatBound ? 'success' : 'info'">{{ row.user.wechatBound ? "已绑定" : "未绑定" }}</el-tag></template>
        </el-table-column>
        <el-table-column v-if="canViewSensitive" label="AppID" width="150" show-overflow-tooltip><template #default="{ row }">{{ row.user.wechatAppId || "-" }}</template></el-table-column>
        <el-table-column label="等级" width="140"><template #default="{ row }"><el-tag>{{ row.level?.name || "普通会员" }}</el-tag></template></el-table-column>
        <el-table-column prop="points" label="积分" width="100" />
        <el-table-column prop="growthValue" label="成长值" width="100" />
        <el-table-column label="消费" width="120"><template #default="{ row }">¥{{ money(row.totalSpent) }}</template></el-table-column>
        <el-table-column prop="registrationCount" label="报名" width="90" />
        <el-table-column prop="checkInCount" label="签到" width="90" />
        <el-table-column prop="reviewCount" label="评价" width="90" />
        <el-table-column label="最近活跃" width="180"><template #default="{ row }">{{ formatTime(row.lastActiveAt) }}</template></el-table-column>
        <el-table-column label="最近登录" width="180"><template #default="{ row }">{{ formatTime(row.user.lastLoginAt) }}</template></el-table-column>
        <el-table-column label="操作" width="110" fixed="right"><template #default="{ row }"><el-button size="small" @click="openDetail(row)">详情</el-button></template></el-table-column>
      </el-table>
      <div class="pagination-row">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          @current-change="changePage"
          @size-change="changePageSize"
        />
      </div>
    </div>

    <el-dialog v-model="levelDialog" width="520px" title="会员等级">
      <el-form label-position="top">
        <el-form-item label="等级名称"><el-input v-model="levelForm.name" /></el-form-item>
        <el-form-item label="成长值门槛"><el-input-number v-model="levelForm.minGrowth" :min="0" /></el-form-item>
        <el-form-item label="积分兼容门槛"><el-input-number v-model="levelForm.minPoints" :min="0" /></el-form-item>
        <el-form-item label="等级有效期"><el-input-number v-model="levelForm.validityDays" :min="1" placeholder="留空为长期" /><span class="form-hint">天</span></el-form-item>
        <el-form-item label="等级权益"><el-input v-model="levelForm.benefitsText" type="textarea" :rows="4" placeholder="每行一个：priority_booking|优先报名|可提前报名活动" /></el-form-item>
        <el-form-item label="折扣系数"><el-input-number v-model="levelForm.discountRate" :min="0" :max="1" :step="0.01" :precision="2" /></el-form-item>
        <el-form-item><el-checkbox v-model="levelForm.priorityBooking">优先报名</el-checkbox><el-checkbox v-model="levelForm.enabled">启用</el-checkbox></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="levelForm.sortOrder" :min="0" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="levelDialog=false">取消</el-button><el-button type="primary" :loading="saving" @click="saveLevel">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="memberLevelDialog" width="500px" title="调整会员等级">
      <el-form label-position="top">
        <el-form-item label="目标等级">
          <el-select v-model="memberLevelForm.levelId" style="width: 100%">
            <el-option label="普通会员" :value="0" />
            <el-option v-for="level in levels.filter((item) => item.enabled)" :key="level.id" :label="`${level.name}（v${level.version || 1}）`" :value="level.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="调整原因"><el-input v-model="memberLevelForm.reason" type="textarea" :rows="3" maxlength="255" show-word-limit placeholder="必填，将写入不可篡改的等级历史" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="memberLevelDialog=false">取消</el-button><el-button type="primary" :loading="memberLevelSaving" @click="saveMemberLevelAdjustment">确认调整</el-button></template>
    </el-dialog>

    <el-dialog v-model="pointRuleDialog" width="540px" title="编辑积分规则">
      <el-form label-position="top">
        <el-form-item><el-checkbox v-model="pointRuleForm.enabled">启用规则</el-checkbox></el-form-item>
        <el-form-item label="积分计算方式">
          <el-segmented v-model="pointRuleForm.calculationMode" :options="[{ label: '固定积分', value: 'fixed' }, { label: '按金额换算', value: 'amount_ratio' }]" />
        </el-form-item>
        <el-form-item :label="pointRuleForm.calculationMode === 'amount_ratio' ? '每个换算单位发放积分' : '每次发放积分'"><el-input-number v-model="pointRuleForm.fixedPoints" :min="0" :max="1000000" /></el-form-item>
        <el-form-item v-if="pointRuleForm.calculationMode === 'amount_ratio'" label="换算金额"><el-input-number v-model="pointRuleForm.amountFenPerPoint" :min="1" :max="100000000" /><span class="form-hint">分人民币为一个换算单位</span></el-form-item>
        <el-form-item label="成长值方式">
          <el-select v-model="pointRuleForm.growthMode" style="width: 100%"><el-option label="与积分相同" value="same_as_points" /><el-option label="固定成长值" value="fixed" /><el-option label="不增加成长值" value="none" /></el-select>
        </el-form-item>
        <el-form-item v-if="pointRuleForm.growthMode === 'fixed'" label="固定成长值"><el-input-number v-model="pointRuleForm.fixedGrowth" :min="1" :max="1000000" /></el-form-item>
        <el-form-item label="积分有效期"><el-input-number v-model="pointRuleForm.validityDays" :min="1" :max="3650" placeholder="留空为长期" /><span class="form-hint">天</span></el-form-item>
      </el-form>
      <template #footer><el-button @click="pointRuleDialog=false">取消</el-button><el-button type="primary" :loading="pointRuleSaving" @click="savePointRule">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="memberDialog" width="520px" title="新增会员">
      <el-alert class="dialog-alert" type="info" show-icon :closable="false" title="H5 支持手机号密码登录" description="用于测试、线下导入和先充值余额。填写手机号和初始密码后，用户可在 H5 直接用手机号密码登录。" />
      <el-form label-position="top">
        <el-form-item label="手机号"><el-input v-model="memberForm.phone" maxlength="11" placeholder="用于 H5 手机号登录，可选" /></el-form-item>
        <el-form-item v-if="canResetMemberPassword" label="初始密码"><el-input v-model="memberForm.password" type="password" show-password maxlength="64" placeholder="用于 H5 手机号密码登录，至少 6 位" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="memberForm.nickname" maxlength="40" placeholder="不填则按手机号自动生成" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="memberForm.remark" type="textarea" :rows="3" placeholder="例如：测试会员、线下导入、客服登记" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="memberDialog=false">取消</el-button><el-button type="primary" :loading="memberSaving" @click="saveMember">保存</el-button></template>
    </el-dialog>

    <el-drawer v-model="detailDrawer" size="min(780px, 100vw)" title="会员详情">
      <div v-loading="detailLoading">
        <el-alert v-if="detailError" type="error" show-icon :closable="false" :title="detailError">
          <template #default><el-button size="small" :disabled="detailLoading" @click="detailTarget ? openDetail(detailTarget, { applyDefaultWalletScope: false }) : detailDrawer=false">重试</el-button></template>
        </el-alert>
      <template v-if="detail">
        <div class="profile">
          <div><span>会员</span><strong>{{ detail.profile.user.nickname || (detail.profile.user.phone ? displayPhone(detail.profile.user.phone) : `用户${detail.profile.user.id}`) }}</strong></div>
          <div><span>等级</span><strong>{{ detail.profile.level?.name || "普通会员" }}</strong></div>
          <div><span>积分</span><strong>{{ detail.profile.points }}</strong></div>
          <div><span>积分欠额</span><strong>{{ detail.profile.pointDebt || 0 }}</strong></div>
          <div><span>成长值</span><strong>{{ detail.profile.growthValue || 0 }}</strong></div>
          <div><span>等级有效期</span><strong>{{ detail.profile.levelExpiresAt ? formatTime(detail.profile.levelExpiresAt) : "长期" }}</strong></div>
          <div><span>累计消费</span><strong>¥{{ money(detail.profile.totalSpent) }}</strong></div>
        </div>
        <div class="detail-actions">
          <el-button v-if="canManageMembers" :icon="Edit" @click="openEditMember">编辑资料</el-button>
          <el-button v-if="canResetMemberPassword" :icon="Key" @click="openPasswordDialog">重置密码</el-button>
          <el-button v-if="canAdjustMemberPoints" type="primary" :loading="pointsAdjusting" @click="adjustPoints">调整积分</el-button>
          <el-button v-if="canAdjustMemberLevel" @click="openMemberLevelDialog">调整等级</el-button>
        </div>
        <div v-if="detail.tags?.length" class="member-tags">
          <el-tag v-for="tag in detail.tags" :key="tag.id" :type="tag.color === 'danger' ? 'danger' : tag.color === 'success' ? 'success' : tag.color === 'warning' ? 'warning' : 'info'">{{ tag.name }}</el-tag>
        </div>
        <div class="identity-card">
          <div><span>来源端</span><strong>{{ sourceChannelText(detail.profile.user.sourceChannel) }}</strong></div>
          <div><span>微信绑定</span><strong>{{ detail.profile.user.wechatBound ? "已绑定" : "未绑定" }}</strong><small>{{ canViewSensitive ? (detail.profile.user.openid || "-") : "敏感权限可查看" }}</small></div>
          <div><span>小程序 AppID</span><strong>{{ canViewSensitive ? (detail.profile.user.wechatAppId || "-") : "敏感权限可查看" }}</strong></div>
          <div><span>UnionID</span><strong>{{ canViewSensitive ? (detail.profile.user.unionid || "-") : "敏感权限可查看" }}</strong></div>
          <div><span>最近登录端</span><strong>{{ loginChannelText(detail.profile.user.lastLoginChannel) }}</strong></div>
          <div><span>最近登录时间</span><strong>{{ formatTime(detail.profile.user.lastLoginAt) }}</strong></div>
        </div>
        <div class="identity-card asset-overview">
          <div><span>课程订单</span><strong>{{ detail.assets?.course?.orderCount || 0 }}</strong><small>学习记录 {{ detail.assets?.course?.learningRecordCount || 0 }}</small></div>
          <div><span>已完成课时</span><strong>{{ detail.assets?.course?.completedLessonCount || 0 }}</strong></div>
          <div><span>商城订单</span><strong>{{ detail.assets?.mall?.orderCount || 0 }}</strong><small>累计 ¥{{ money(detail.assets?.mall?.paidAmount) }}</small></div>
          <div><span>商城售后</span><strong>{{ detail.assets?.mall?.refundCount || 0 }}</strong></div>
          <div><span>社区内容</span><strong>{{ detail.assets?.community?.postCount || 0 }}</strong><small>已公开 {{ detail.assets?.community?.approvedPostCount || 0 }}</small></div>
          <div><span>钱包账户</span><strong>{{ detail.assets?.wallets?.length || 0 }}</strong></div>
        </div>
        <div v-if="canViewWallet" class="wallet-card">
          <div>
            <span>账户余额 · {{ walletScopeName }}</span>
            <strong>¥{{ money(wallet?.availableBalance) }}</strong>
            <small>冻结现金 ¥{{ money(wallet?.frozenBalance) }} / 可用赠送金 ¥{{ money(wallet?.giftBalance) }} / 冻结赠送金 ¥{{ money(wallet?.frozenGiftBalance) }} / 累计充值 ¥{{ money(wallet?.totalRecharge) }}</small>
          </div>
          <div class="wallet-actions">
            <el-select v-model="walletScopeTenantId" clearable filterable placeholder="平台钱包" style="width: 220px" @change="reloadWalletDetail">
              <el-option label="平台钱包" :value="0" />
              <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
            </el-select>
            <el-button v-if="canAdjustWallet" type="primary" @click="openWalletDialog('recharge')">充值</el-button>
            <el-button v-if="canAdjustWallet" @click="openWalletDialog('deduct')">扣减</el-button>
            <el-button v-if="canAdjustWallet" @click="openWalletDialog('adjust')">调整</el-button>
            <el-button v-if="canAdjustWallet" @click="openWalletDialog('gift_grant')">赠送金</el-button>
            <el-button v-if="canAdjustWallet" @click="openWalletDialog('freeze')">冻结</el-button>
          </div>
        </div>
        <el-tabs>
          <el-tab-pane label="用户时间线">
            <el-timeline>
              <el-timeline-item v-for="(item, index) in detail.timeline || []" :key="`${item.type}-${index}`" :timestamp="formatTime(item.time)" placement="top">
                <strong>{{ item.title }}</strong>
                <p class="timeline-copy">{{ item.description }}<span v-if="item.amount"> · {{ item.type === 'points' ? item.amount + ' 积分' : '¥' + money(item.amount) }}</span></p>
                <el-tag v-if="item.status" size="small">{{ item.status }}</el-tag>
              </el-timeline-item>
            </el-timeline>
          </el-tab-pane>
          <el-tab-pane v-if="canViewWallet" label="余额流水">
            <el-table :data="walletTransactions" stripe empty-text="暂无余额流水">
              <el-table-column prop="transactionNo" label="流水号" min-width="170" />
              <el-table-column prop="type" label="类型" width="130" />
              <el-table-column prop="direction" label="方向" width="90" />
              <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
              <el-table-column label="余额" width="120"><template #default="{ row }">¥{{ money(row.balanceAfter) }}</template></el-table-column>
              <el-table-column label="冻结" width="120"><template #default="{ row }">¥{{ money(row.frozenAfter) }}</template></el-table-column>
              <el-table-column label="赠送金" width="120"><template #default="{ row }">¥{{ money(row.giftAfter) }}</template></el-table-column>
              <el-table-column label="冻结赠送金" width="130"><template #default="{ row }">¥{{ money(row.frozenGiftAfter) }}</template></el-table-column>
              <el-table-column prop="operator" label="操作者" width="120" />
              <el-table-column prop="remark" label="备注" min-width="160" />
              <el-table-column prop="createdAt" label="时间" width="180" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="积分记录">
            <el-table :data="detail.points" :fit="false" stripe empty-text="暂无积分记录">
              <el-table-column prop="points" label="积分" width="90" />
              <el-table-column prop="requestedPoints" label="请求积分" width="100" />
              <el-table-column prop="balanceAfter" label="变动后" width="90" />
              <el-table-column prop="remark" label="说明" min-width="180" />
              <el-table-column label="来源" width="140"><template #default="{ row }"><el-tooltip :content="row.sourceType" placement="top"><span>{{ pointSourceText(row.sourceType) }}</span></el-tooltip></template></el-table-column>
              <el-table-column prop="sourceId" label="来源编号" min-width="170" show-overflow-tooltip />
              <el-table-column label="关联流水" width="100"><template #default="{ row }">{{ row.relatedLogId ? `#${row.relatedLogId}` : "-" }}</template></el-table-column>
              <el-table-column label="到期时间" width="170"><template #default="{ row }">{{ row.expiresAt ? formatTime(row.expiresAt) : "长期" }}</template></el-table-column>
              <el-table-column prop="createdAt" label="时间" width="180" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="报名记录">
            <el-table :data="detail.registrations" stripe empty-text="暂无报名">
              <el-table-column label="活动" min-width="220"><template #default="{ row }">{{ row.activity.title }}</template></el-table-column>
              <el-table-column prop="status" label="状态" width="130" />
              <el-table-column prop="createdAt" label="时间" width="180" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="订单">
            <el-table :data="detail.orders" stripe empty-text="暂无订单">
              <el-table-column prop="orderNo" label="订单号" min-width="180" />
              <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
              <el-table-column prop="status" label="状态" width="130" />
              <el-table-column prop="createdAt" label="时间" width="180" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="课程学习">
            <el-table :data="detail.assets?.course?.orders || []" stripe empty-text="暂无课程订单">
              <el-table-column prop="orderNo" label="订单号" min-width="170" /><el-table-column label="课程" min-width="180"><template #default="{ row }">{{ row.course?.title || "-" }}</template></el-table-column><el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column><el-table-column prop="status" label="状态" width="110" /><el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="等级历史">
            <el-table :data="detail.levelChanges || []" stripe empty-text="暂无等级变更记录">
              <el-table-column label="变更" min-width="190"><template #default="{ row }">{{ row.fromLevel?.name || "普通会员" }} → {{ row.toLevel?.name || "普通会员" }}</template></el-table-column>
              <el-table-column label="来源" width="130"><template #default="{ row }">{{ levelChangeSourceText(row.source) }}</template></el-table-column>
              <el-table-column prop="growthValue" label="成长值" width="90" />
              <el-table-column label="权益版本" width="110"><template #default="{ row }">v{{ row.benefitSnapshot?.version || "-" }}</template></el-table-column>
              <el-table-column label="操作者" width="130"><template #default="{ row }">{{ row.operator?.username || "系统" }}</template></el-table-column>
              <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
              <el-table-column label="等级到期" width="180"><template #default="{ row }">{{ row.levelExpiresAt ? formatTime(row.levelExpiresAt) : "长期" }}</template></el-table-column>
              <el-table-column label="变更时间" width="180"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="商城资产">
            <el-table :data="detail.assets?.mall?.orders || []" stripe empty-text="暂无商城订单">
              <el-table-column prop="orderNo" label="订单号" min-width="170" /><el-table-column label="店铺" min-width="150"><template #default="{ row }">{{ row.merchant?.name || "平台自营" }}</template></el-table-column><el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column><el-table-column prop="status" label="状态" width="110" /><el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="社区内容">
            <el-table :data="detail.assets?.community?.posts || []" stripe empty-text="暂无社区内容">
              <el-table-column prop="content" label="内容" min-width="260" show-overflow-tooltip /><el-table-column prop="status" label="审核" width="100" /><el-table-column label="可见" width="90"><template #default="{ row }">{{ row.visible ? "是" : "否" }}</template></el-table-column><el-table-column prop="likes" label="点赞" width="80" /><el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </template>
      </div>
    </el-drawer>

    <el-dialog v-model="editMemberDialog" width="520px" title="编辑会员资料">
      <el-form label-position="top">
        <el-form-item v-if="canViewSensitive" label="手机号"><el-input v-model="editMemberForm.phone" maxlength="11" placeholder="用于 H5 手机号登录" /></el-form-item>
        <el-alert v-else class="dialog-alert" type="info" show-icon :closable="false" title="手机号保持原值" description="当前账号没有会员敏感资料权限，保存昵称和头像时不会覆盖手机号。" />
        <el-form-item label="昵称"><el-input v-model="editMemberForm.nickname" maxlength="40" /></el-form-item>
        <el-form-item label="头像 URL"><el-input v-model="editMemberForm.avatarUrl" maxlength="500" placeholder="可选，留空则清除头像" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="editMemberDialog=false">取消</el-button><el-button type="primary" :loading="editMemberSaving" @click="saveMemberEdit">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="passwordDialog" width="480px" title="重置会员密码">
      <el-alert class="dialog-alert" type="warning" show-icon :closable="false" title="仅重置 H5 手机号密码登录" description="如果用户使用微信小程序授权登录，微信身份不会被修改。" />
      <el-form label-position="top">
        <el-form-item label="新密码"><el-input v-model="passwordForm.password" type="password" show-password maxlength="64" placeholder="6-64 位" /></el-form-item>
        <el-form-item label="确认新密码"><el-input v-model="passwordForm.confirmPassword" type="password" show-password maxlength="64" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="passwordDialog=false">取消</el-button><el-button type="primary" :loading="passwordSaving" @click="resetMemberPassword">确认重置</el-button></template>
    </el-dialog>

    <el-dialog v-model="walletDialog" width="480px" title="调整余额">
      <el-form label-position="top">
        <el-form-item label="钱包归属">
          <el-select v-model="walletForm.tenantId" clearable filterable placeholder="平台钱包" style="width: 100%">
            <el-option label="平台钱包" :value="0" />
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
          </el-select>
          <small class="form-tip">当前将写入：{{ walletFormScopeName }}。小程序/H5 带对应 tenantCode 时只显示对应商家钱包。</small>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="walletForm.type" style="width: 100%">
            <el-option label="充值" value="recharge" />
            <el-option label="扣减" value="deduct" />
            <el-option label="调整" value="adjust" />
            <el-option label="发放赠送金" value="gift_grant" />
            <el-option label="扣回赠送金" value="gift_revoke" />
            <el-option label="冻结可用余额" value="freeze" />
            <el-option label="解冻余额" value="unfreeze" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="walletForm.type === 'freeze' || walletForm.type === 'unfreeze'" label="资金来源">
          <el-segmented v-model="walletForm.fundSource" :options="[{ label: '混合', value: 'mixed' }, { label: '现金', value: 'cash' }, { label: '赠送金', value: 'gift' }]" />
          <small class="form-tip">混合模式优先处理赠送金，再处理现金；流水分别记录两类冻结资金。</small>
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="walletForm.amount" :precision="2" :step="10" style="width: 180px" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="walletForm.remark" type="textarea" :rows="3" placeholder="记录充值来源、扣减原因或调整说明" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="walletDialog=false">取消</el-button><el-button type="primary" :loading="walletSaving" @click="saveWalletAdjust">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="bulkTagDialog" width="480px" title="批量打标签">
      <el-alert class="dialog-alert" type="info" show-icon :closable="false" :title="`已选择 ${selectedRows.length} 位会员`" description="重复标签会自动跳过，标签会进入会员详情和列表筛选。" />
      <el-form label-position="top">
        <el-form-item label="标签名称"><el-input v-model="bulkTagForm.name" maxlength="40" placeholder="例如：高意向、线下到店、重点回访" /></el-form-item>
        <el-form-item label="颜色">
          <el-select v-model="bulkTagForm.color" style="width: 100%">
            <el-option label="默认" value="default" />
            <el-option label="成功" value="success" />
            <el-option label="提醒" value="warning" />
            <el-option label="重点" value="danger" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="bulkTagForm.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="bulkTagDialog=false">取消</el-button><el-button type="primary" :loading="bulkTagSaving" @click="saveBulkTag">保存标签</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; gap: 10px; align-items: center; }
.activity-alert { margin-bottom: 16px; }
.dialog-alert { margin-bottom: 16px; }
.level-card { margin-bottom: 16px; }
.summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.summary-card { display: grid; gap: 6px; padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.summary-card span { color: #667085; font-size: 13px; }
.summary-card strong { color: #111827; font-size: 24px; line-height: 1.1; }
.member-filters { display: grid; grid-template-columns: 220px 150px 130px 130px 150px 170px 170px 160px 290px 170px auto; gap: 12px; align-items: end; margin-bottom: 14px; }
.member-filters :deep(.el-form-item) { margin-right: 0; margin-bottom: 0; }
.member-filters :deep(.el-select), .member-filters :deep(.el-date-editor) { width: 100%; }
.quick-filter-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
.sort-row { display: grid; grid-template-columns: minmax(0, 1fr) 96px; gap: 8px; }
.filter-actions :deep(.el-form-item__content) { display: flex; gap: 8px; flex-wrap: nowrap; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 14px; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-caption { display: block; margin-top: 4px; color: #667085; font-size: 12px; }
h3 { margin: 0; }
.profile { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.profile div { min-width: 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; display: grid; align-content: start; gap: 6px; }
.profile span { color: #667085; font-size: 13px; }
.profile strong { min-width: 0; font-size: 20px; line-height: 1.35; overflow-wrap: anywhere; word-break: break-word; }
.detail-actions { display: flex; gap: 10px; align-items: center; margin-bottom: 18px; }
.member-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.identity-card { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.identity-card div { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; display: grid; gap: 6px; background: #f8fafc; }
.identity-card span, .identity-card small { color: #667085; font-size: 13px; }
.identity-card strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #111827; font-size: 15px; }
.wallet-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; padding: 16px; border: 1px solid #d7dde8; border-radius: 8px; background: #f8fafc; }
.wallet-card div:first-child { display: grid; gap: 6px; }
.wallet-card span, .wallet-card small { color: #667085; font-size: 13px; }
.wallet-card strong { color: #0f766e; font-size: 26px; }
.wallet-actions { display: flex; gap: 8px; align-items: center; }
.form-tip { display: block; margin-top: 6px; color: #667085; font-size: 12px; line-height: 1.5; }
.timeline-copy { margin: 6px 0 8px; color: #667085; line-height: 1.5; }
@media (max-width: 1480px) {
  .member-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .toolbar, .toolbar-actions, .detail-actions, .wallet-actions { flex-wrap: wrap; }
  .summary-grid, .member-filters { grid-template-columns: 1fr; }
  .profile { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .identity-card { grid-template-columns: 1fr; }
  .wallet-card { align-items: stretch; flex-direction: column; }
  .wallet-actions :deep(.el-select) { width: 100% !important; }
}
</style>
