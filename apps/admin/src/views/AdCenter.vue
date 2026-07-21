<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Edit, Plus, Refresh, Switch } from "@element-plus/icons-vue";
import { api, downloadFile } from "../api";
import { hasPermission, isPlatformAdmin } from "../permissions";

type TenantOption = { id: number; name?: string; code?: string; enabled?: boolean };
type TenantWithSettings = TenantOption & { defaultAdImageUrl?: string | null };
type Advertiser = { id: number; companyName: string; contactName?: string | null; contactPhone?: string | null; wechat?: string | null; licenseUrl?: string | null; remark?: string | null; status: string; tenant?: TenantOption | null };
type Contract = { id: number; contractNo: string; title: string; billingModel: string; amount: string; fixedFee: string; cpmPrice: string; cpcPrice: string; startAt?: string | null; endAt?: string | null; paymentStatus: string; attachmentUrl?: string | null; remark?: string | null; status: string; advertiser?: Advertiser | null; tenant?: TenantOption | null };
type Campaign = {
  id: number;
  name: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  source: string;
  format: string;
  slotKey: string;
  pageKey: string;
  platforms: string[];
  audience?: { mode?: string; memberLevelIds?: number[] } | null;
  link?: string | null;
  billingModel: string;
  fixedFee: string;
  cpmPrice: string;
  cpcPrice: string;
  totalBudget: string;
  dailyBudget: string;
  impressionLimit: number;
  clickLimit: number;
  officialAdUnitId?: string | null;
  officialAdType?: string | null;
  frequency: string;
  priority: number;
  enabled: boolean;
  startAt?: string | null;
  endAt?: string | null;
  impressionCount: number;
  clickCount: number;
  spentAmount: string;
  advertiser?: Advertiser | null;
  contract?: Contract | null;
  tenant?: TenantOption | null;
};
type Settlement = { id: number; settlementNo: string; periodStart: string; periodEnd: string; billingModel: string; amount: string; status: string; advertiser?: Advertiser | null; contract?: Contract | null; tenant?: TenantOption | null; items?: Array<{ id: number; description: string; billingModel: string; quantity: string; unitPrice: string; amount: string }> };
type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number };
type AdCenterOptions = {
  tenants: TenantWithSettings[];
  memberLevels: Array<{ id: number; name: string; enabled: boolean; tenantId: number | null }>;
  advertisers: Array<{ id: number; companyName: string; status: string; tenantId: number | null }>;
  contracts: Array<{ id: number; contractNo: string; title: string; status: string; billingModel: string; advertiserId: number | null; tenantId: number | null }>;
};

const route = useRoute();
const activeTab = ref("campaigns");
const loading = ref(false);
const saving = ref(false);
const revenueSaving = ref(false);
const uploading = ref(false);
const metadataError = ref("");
const advertiserError = ref("");
const contractError = ref("");
const campaignError = ref("");
const settlementError = ref("");
const summaryError = ref("");
const actionKey = ref("");
const tenants = ref<TenantWithSettings[]>([]);
const memberLevels = ref<any[]>([]);
const advertisers = ref<Advertiser[]>([]);
const contracts = ref<Contract[]>([]);
const advertiserOptions = ref<AdCenterOptions["advertisers"]>([]);
const contractOptions = ref<AdCenterOptions["contracts"]>([]);
const campaigns = ref<Campaign[]>([]);
const settlements = ref<Settlement[]>([]);
const summary = ref<any>({ totals: {} });
const advertiserPage = ref(1);
const advertiserTotal = ref(0);
const contractPage = ref(1);
const contractTotal = ref(0);
const campaignPage = ref(1);
const campaignTotal = ref(0);
const settlementPage = ref(1);
const settlementTotal = ref(0);
const pageSize = 20;
const filters = reactive({
  tenantId: Number(route.query.tenantId || 0) || undefined as number | undefined,
  keyword: "",
  source: "",
  slotKey: "",
  enabled: ""
});

const advertiserDrawer = ref(false);
const contractDrawer = ref(false);
const campaignDrawer = ref(false);
const editingAdvertiserId = ref<number | null>(null);
const editingContractId = ref<number | null>(null);
const editingCampaignId = ref<number | null>(null);
type AdListKind = "advertiser" | "contract" | "campaign" | "settlement";
type AdTarget = { kind: AdListKind; id: number | null; tenantId: number | null; scopeKey: string; listSequence: number };
const advertiserTarget = ref<AdTarget | null>(null);
const contractTarget = ref<AdTarget | null>(null);
const campaignTarget = ref<AdTarget | null>(null);
let metadataLoadSequence = 0;
let advertiserLoadSequence = 0;
let contractLoadSequence = 0;
let campaignLoadSequence = 0;
let settlementLoadSequence = 0;
let summaryLoadSequence = 0;
let allLoadSequence = 0;

const advertiserForm = reactive({ tenantId: undefined as number | undefined, companyName: "", contactName: "", contactPhone: "", wechat: "", licenseUrl: "", remark: "", status: "active" });
const contractForm = reactive({ tenantId: undefined as number | undefined, advertiserId: undefined as number | undefined, contractNo: "", title: "", billingModel: "fixed", amount: 0, fixedFee: 0, cpmPrice: 0, cpcPrice: 0, startAt: "", endAt: "", paymentStatus: "unpaid", attachmentUrl: "", remark: "", status: "active" });
const campaignForm = reactive({
  tenantId: undefined as number | undefined,
  advertiserId: undefined as number | undefined,
  contractId: undefined as number | undefined,
  name: "",
  title: "",
  subtitle: "",
  imageUrl: "",
  imageUrls: [] as string[],
  source: "custom",
  format: "banner",
  slotKey: "home_top_banner",
  pageKey: "home",
  platforms: ["all"] as string[],
  audienceMode: "all",
  memberLevelIds: [] as number[],
  link: "/pages/index/index",
  billingModel: "fixed",
  fixedFee: 0,
  cpmPrice: 0,
  cpcPrice: 0,
  totalBudget: 0,
  dailyBudget: 0,
  impressionLimit: 0,
  clickLimit: 0,
  officialAdUnitId: "",
  officialAdType: "",
  frequency: "once_per_day",
  priority: 0,
  enabled: true,
  startAt: "",
  endAt: ""
});
const campaignMemberLevels = computed(() => !isPlatformAdmin()
  ? memberLevels.value
  : memberLevels.value.filter((level) => campaignForm.tenantId ? Number(level.tenantId || 0) === Number(campaignForm.tenantId) : !level.tenantId));
watch(() => campaignForm.tenantId, () => {
  const allowed = new Set(campaignMemberLevels.value.map((level) => Number(level.id)));
  campaignForm.memberLevelIds = campaignForm.memberLevelIds.filter((id) => allowed.has(Number(id)));
});
const settlementForm = reactive({ tenantId: undefined as number | undefined, contractId: undefined as number | undefined, periodStart: "", periodEnd: "", remark: "" });
const revenueForm = reactive({ tenantId: undefined as number | undefined, importDate: "", revenueAmount: 0, impressionCount: 0, clickCount: 0, ecpm: 0, fileUrl: "", remark: "" });

const sourceOptions = [
  { label: "自有广告", value: "custom" },
  { label: "微信官方流量主", value: "wechat_official" }
];
const formatOptions = [
  { label: "开屏广告", value: "splash" },
  { label: "信息流卡片", value: "inline_card" },
  { label: "自有 Banner", value: "banner" },
  { label: "官方 Banner", value: "official_banner" },
  { label: "官方视频", value: "official_video" },
  { label: "官方格子", value: "official_grid" },
  { label: "官方插屏", value: "official_interstitial" },
  { label: "官方激励视频", value: "official_rewarded_video" }
];
const billingOptions = [
  { label: "固定费用", value: "fixed" },
  { label: "CPM", value: "cpm" },
  { label: "CPC", value: "cpc" },
  { label: "组合计费", value: "mixed" }
];
const platformOptions = [
  { label: "全部", value: "all" },
  { label: "H5", value: "h5" },
  { label: "微信小程序", value: "mp-weixin" }
];
const slotOptions = [
  { label: "开屏", value: "app_splash", pageKey: "home", scene: "进入首页或指定页面前全屏展示", formats: "splash / official_interstitial" },
  { label: "首页顶部", value: "home_top_banner", pageKey: "home", scene: "首页搜索栏或首屏模块下方", formats: "banner / official_banner" },
  { label: "首页信息流", value: "home_feed_inline", pageKey: "home", scene: "首页列表模块之间", formats: "inline_card / official_banner / official_grid" },
  { label: "活动详情中部", value: "activity_detail_middle", pageKey: "activity_detail", scene: "活动详情介绍和报名按钮之间", formats: "banner / inline_card" },
  { label: "课程详情中部", value: "course_detail_middle", pageKey: "course_detail", scene: "课程详情介绍和目录之间", formats: "banner / inline_card" },
  { label: "商品详情中部", value: "mall_product_detail_middle", pageKey: "mall_product_detail", scene: "商品图文详情前", formats: "banner / official_banner" },
  { label: "动态信息流", value: "community_feed_inline", pageKey: "community_home", scene: "共修动态列表之间", formats: "inline_card / official_grid" },
  { label: "我的页横幅", value: "user_my_banner", pageKey: "user_my", scene: "会员身份卡下方", formats: "banner" }
];
const statusLabels: Record<string, string> = { active: "启用", paused: "暂停", archived: "归档", unpaid: "未付款", partial: "部分付款", paid: "已付款", refunded: "已退款", pending: "待确认", confirmed: "已确认", invoiced: "已开票", voided: "已作废" };

const tenantQuery = computed(() => (isPlatformAdmin() && filters.tenantId ? { tenantId: filters.tenantId } : {}));
const canManage = computed(() => hasPermission("ad_center.manage"));
const canFinance = computed(() => hasPermission("ad_center.finance"));
const canSensitive = computed(() => hasPermission("ad_center.sensitive"));
const canExport = computed(() => hasPermission("ad_center.export"));
const canUpload = computed(() => canManage.value && hasPermission("upload.image"));
const availableAdvertisers = computed(() => advertiserOptions.value.filter((row) => !filters.tenantId || row.tenantId === filters.tenantId));
const availableContracts = computed(() => contractOptions.value.filter((row) => !filters.tenantId || row.tenantId === filters.tenantId));
const campaignDrawerTitle = computed(() => (editingCampaignId.value ? "编辑广告计划" : "新增广告计划"));
const advertiserDrawerTitle = computed(() => (editingAdvertiserId.value ? "编辑广告主" : "新增广告主"));
const contractDrawerTitle = computed(() => (editingContractId.value ? "编辑广告合同" : "新增广告合同"));
const errorMessage = computed(() => [advertiserError.value, contractError.value, campaignError.value, settlementError.value, summaryError.value].filter(Boolean).join("；"));
const writeLocked = computed(() => saving.value || revenueSaving.value || uploading.value || Boolean(actionKey.value));
const scopeLocked = computed(() => writeLocked.value || advertiserDrawer.value || contractDrawer.value || campaignDrawer.value);

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function labelOf(options: Array<{ label: string; value: string }>, value?: string | null) {
  return options.find((item) => item.value === value)?.label || value || "-";
}

function tenantDisplay(row: { tenant?: TenantOption | null }) {
  return row.tenant?.name || row.tenant?.code || "平台";
}

function maskPhone(value: unknown) {
  const phone = String(value || "");
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone || "-";
}

function activeTenantId() {
  return isPlatformAdmin() ? filters.tenantId : undefined;
}

function resetAdvertiserForm() {
  Object.assign(advertiserForm, { tenantId: activeTenantId(), companyName: "", contactName: "", contactPhone: "", wechat: "", licenseUrl: "", remark: "", status: "active" });
}

function resetContractForm() {
  Object.assign(contractForm, { tenantId: activeTenantId(), advertiserId: undefined, contractNo: `AD-${Date.now()}`, title: "", billingModel: "fixed", amount: 0, fixedFee: 0, cpmPrice: 0, cpcPrice: 0, startAt: "", endAt: "", paymentStatus: "unpaid", attachmentUrl: "", remark: "", status: "active" });
}

function resetCampaignForm() {
  Object.assign(campaignForm, { tenantId: activeTenantId(), advertiserId: undefined, contractId: undefined, name: "", title: "", subtitle: "", imageUrl: "", imageUrls: [], source: "custom", format: "banner", slotKey: "home_top_banner", pageKey: "home", platforms: ["all"], audienceMode: "all", memberLevelIds: [], link: "/pages/index/index", billingModel: "fixed", fixedFee: 0, cpmPrice: 0, cpcPrice: 0, totalBudget: 0, dailyBudget: 0, impressionLimit: 0, clickLimit: 0, officialAdUnitId: "", officialAdType: "", frequency: "once_per_day", priority: 0, enabled: true, startAt: "", endAt: "" });
}

function rowPayload<T extends Record<string, any>>(form: T) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === "" ? null : value]));
}

function adScopeKey(kind: AdListKind | "summary") {
  const base = { tenantId: filters.tenantId || null, keyword: filters.keyword.trim() };
  if (kind === "advertiser") return JSON.stringify({ ...base, page: advertiserPage.value });
  if (kind === "contract") return JSON.stringify({ ...base, page: contractPage.value });
  if (kind === "campaign") return JSON.stringify({ ...base, source: filters.source, slotKey: filters.slotKey, enabled: filters.enabled, page: campaignPage.value });
  if (kind === "settlement") return JSON.stringify({ tenantId: filters.tenantId || null, page: settlementPage.value });
  return JSON.stringify({ tenantId: filters.tenantId || null });
}

function adListSequence(kind: AdListKind) {
  if (kind === "advertiser") return advertiserLoadSequence;
  if (kind === "contract") return contractLoadSequence;
  if (kind === "campaign") return campaignLoadSequence;
  return settlementLoadSequence;
}

function adRows(kind: AdListKind): any[] {
  if (kind === "advertiser") return advertisers.value;
  if (kind === "contract") return contracts.value;
  if (kind === "campaign") return campaigns.value;
  return settlements.value;
}

function captureAdTarget(kind: AdListKind, row?: any, tenantId?: number): AdTarget {
  return {
    kind,
    id: row?.id ? Number(row.id) : null,
    tenantId: Number(row?.tenant?.id || tenantId || 0) || null,
    scopeKey: adScopeKey(kind),
    listSequence: adListSequence(kind)
  };
}

function assertAdTarget(target: AdTarget) {
  if (target.scopeKey !== adScopeKey(target.kind) || target.listSequence !== adListSequence(target.kind)) {
    throw new Error("广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  if (target.id === null) return undefined;
  const current = adRows(target.kind).find((item) => Number(item.id) === target.id);
  const currentTenantId = Number(current?.tenant?.id || 0) || null;
  if (!current || currentTenantId !== target.tenantId) throw new Error("目标记录已不在当前列表，请刷新后重新操作");
  return current;
}

async function loadTenants() {
  const sequence = ++metadataLoadSequence;
  metadataError.value = "";
  tenants.value = [];
  memberLevels.value = [];
  advertiserOptions.value = [];
  contractOptions.value = [];
  try {
    const options = await api.get<any, AdCenterOptions>("/admin/ad-center/options");
    if (sequence !== metadataLoadSequence) return false;
    tenants.value = Array.isArray(options?.tenants) ? options.tenants : [];
    memberLevels.value = Array.isArray(options?.memberLevels) ? options.memberLevels : [];
    advertiserOptions.value = Array.isArray(options?.advertisers) ? options.advertisers : [];
    contractOptions.value = Array.isArray(options?.contracts) ? options.contracts : [];
    return true;
  } catch (error: any) {
    if (sequence !== metadataLoadSequence) return false;
    metadataError.value = error.message || "广告中心基础数据加载失败";
    return false;
  }
}

async function loadAdvertisers() {
  const sequence = ++advertiserLoadSequence;
  const scopeKey = adScopeKey("advertiser");
  advertiserError.value = "";
  advertisers.value = [];
  advertiserTotal.value = 0;
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  params.set("page", String(advertiserPage.value));
  params.set("pageSize", String(pageSize));
  try {
    const result = await api.get<any, PageResult<Advertiser>>("/admin/ad-advertisers", { params });
    if (sequence !== advertiserLoadSequence || scopeKey !== adScopeKey("advertiser")) return false;
    advertisers.value = Array.isArray(result?.items) ? result.items : [];
    advertiserTotal.value = Number(result?.total || 0);
    return true;
  } catch (error: any) {
    if (sequence !== advertiserLoadSequence || scopeKey !== adScopeKey("advertiser")) return false;
    advertiserError.value = `广告主：${error.message || "加载失败"}`;
    return false;
  }
}

async function loadContracts() {
  const sequence = ++contractLoadSequence;
  const scopeKey = adScopeKey("contract");
  contractError.value = "";
  contracts.value = [];
  contractTotal.value = 0;
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  params.set("page", String(contractPage.value));
  params.set("pageSize", String(pageSize));
  try {
    const result = await api.get<any, PageResult<Contract>>("/admin/ad-contracts", { params });
    if (sequence !== contractLoadSequence || scopeKey !== adScopeKey("contract")) return false;
    contracts.value = Array.isArray(result?.items) ? result.items : [];
    contractTotal.value = Number(result?.total || 0);
    return true;
  } catch (error: any) {
    if (sequence !== contractLoadSequence || scopeKey !== adScopeKey("contract")) return false;
    contractError.value = `合同：${error.message || "加载失败"}`;
    return false;
  }
}

async function loadCampaigns() {
  const sequence = ++campaignLoadSequence;
  const scopeKey = adScopeKey("campaign");
  campaignError.value = "";
  campaigns.value = [];
  campaignTotal.value = 0;
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.source) params.set("source", filters.source);
  if (filters.slotKey) params.set("slotKey", filters.slotKey);
  if (filters.enabled) params.set("enabled", filters.enabled);
  params.set("page", String(campaignPage.value));
  params.set("pageSize", String(pageSize));
  try {
    const result = await api.get<any, PageResult<Campaign>>("/admin/ad-campaigns", { params });
    if (sequence !== campaignLoadSequence || scopeKey !== adScopeKey("campaign")) return false;
    campaigns.value = Array.isArray(result?.items) ? result.items : [];
    campaignTotal.value = Number(result?.total || 0);
    return true;
  } catch (error: any) {
    if (sequence !== campaignLoadSequence || scopeKey !== adScopeKey("campaign")) return false;
    campaignError.value = `广告计划：${error.message || "加载失败"}`;
    return false;
  }
}

async function loadSettlements() {
  const sequence = ++settlementLoadSequence;
  const scopeKey = adScopeKey("settlement");
  settlementError.value = "";
  settlements.value = [];
  settlementTotal.value = 0;
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  params.set("page", String(settlementPage.value));
  params.set("pageSize", String(pageSize));
  try {
    const result = await api.get<any, PageResult<Settlement>>("/admin/ad-settlements", { params });
    if (sequence !== settlementLoadSequence || scopeKey !== adScopeKey("settlement")) return false;
    settlements.value = Array.isArray(result?.items) ? result.items : [];
    settlementTotal.value = Number(result?.total || 0);
    return true;
  } catch (error: any) {
    if (sequence !== settlementLoadSequence || scopeKey !== adScopeKey("settlement")) return false;
    settlementError.value = `结算：${error.message || "加载失败"}`;
    return false;
  }
}

function resetPages() {
  advertiserPage.value = 1;
  contractPage.value = 1;
  campaignPage.value = 1;
  settlementPage.value = 1;
}

async function applyFilters() {
  resetPages();
  Object.assign(settlementForm, { tenantId: activeTenantId(), contractId: undefined });
  Object.assign(revenueForm, { tenantId: activeTenantId() });
  await loadAll();
}

function guardTabChange() {
  return !writeLocked.value;
}

async function loadSummary() {
  const sequence = ++summaryLoadSequence;
  const scopeKey = adScopeKey("summary");
  summaryError.value = "";
  summary.value = { totals: {} };
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  try {
    const result = await api.get<any, any>("/admin/ad-campaigns/summary", { params });
    if (sequence !== summaryLoadSequence || scopeKey !== adScopeKey("summary")) return false;
    summary.value = result && typeof result === "object" ? result : { totals: {} };
    return true;
  } catch (error: any) {
    if (sequence !== summaryLoadSequence || scopeKey !== adScopeKey("summary")) return false;
    summaryError.value = `经营汇总：${error.message || "加载失败"}`;
    return false;
  }
}

async function loadAll() {
  const sequence = ++allLoadSequence;
  loading.value = true;
  await Promise.allSettled([loadAdvertisers(), loadContracts(), loadCampaigns(), loadSettlements(), loadSummary()]);
  if (sequence === allLoadSequence) loading.value = false;
}

function createAdvertiser() {
  if (!canManage.value) return;
  editingAdvertiserId.value = null;
  advertiserTarget.value = null;
  resetAdvertiserForm();
  advertiserDrawer.value = true;
}

function editAdvertiser(row: Advertiser) {
  if (!canManage.value) return;
  editingAdvertiserId.value = row.id;
  advertiserTarget.value = captureAdTarget("advertiser", row);
  Object.assign(advertiserForm, { tenantId: row.tenant?.id, companyName: row.companyName, contactName: row.contactName || "", contactPhone: row.contactPhone || "", wechat: row.wechat || "", licenseUrl: row.licenseUrl || "", remark: row.remark || "", status: row.status || "active" });
  advertiserDrawer.value = true;
}

async function submitAdvertiser() {
  if (saving.value) return;
  if (!advertiserForm.companyName.trim()) return ElMessage.warning("请填写广告主公司名称");
  let target: AdTarget;
  try {
    target = advertiserTarget.value || captureAdTarget("advertiser", undefined, advertiserForm.tenantId);
    assertAdTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  const payload = { ...rowPayload(advertiserForm), tenantId: isPlatformAdmin() ? target.tenantId : undefined };
  saving.value = true;
  try {
    assertAdTarget(target);
    if (target.id) await api.patch(`/admin/ad-advertisers/${target.id}`, payload);
    else await api.post("/admin/ad-advertisers", payload);
    ElMessage.success("广告主已保存");
    advertiserDrawer.value = false;
    advertiserTarget.value = null;
    await loadAll();
  } catch (error: any) {
    ElMessage.error(error.message || "保存广告主失败");
  } finally {
    saving.value = false;
  }
}

async function removeAdvertiser(row: Advertiser) {
  const key = `advertiser-delete:${row.id}`;
  if (actionKey.value) return;
  let target: AdTarget;
  try {
    target = captureAdTarget("advertiser", row);
    assertAdTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  actionKey.value = key;
  try {
    await ElMessageBox.confirm(`确认删除广告主「${row.companyName}」？`, "删除广告主", { type: "warning" });
    assertAdTarget(target);
    await api.delete(`/admin/ad-advertisers/${row.id}`);
    ElMessage.success("广告主已删除");
    await loadAll();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "删除广告主失败");
  } finally {
    actionKey.value = "";
  }
}

function createContract() {
  if (!canManage.value) return;
  editingContractId.value = null;
  contractTarget.value = null;
  resetContractForm();
  contractDrawer.value = true;
}

function editContract(row: Contract) {
  if (!canManage.value) return;
  editingContractId.value = row.id;
  contractTarget.value = captureAdTarget("contract", row);
  Object.assign(contractForm, { tenantId: row.tenant?.id, advertiserId: row.advertiser?.id, contractNo: row.contractNo, title: row.title, billingModel: row.billingModel, amount: Number(row.amount || 0), fixedFee: Number(row.fixedFee || 0), cpmPrice: Number(row.cpmPrice || 0), cpcPrice: Number(row.cpcPrice || 0), startAt: row.startAt ? String(row.startAt).slice(0, 19).replace("T", " ") : "", endAt: row.endAt ? String(row.endAt).slice(0, 19).replace("T", " ") : "", paymentStatus: row.paymentStatus, attachmentUrl: row.attachmentUrl || "", remark: row.remark || "", status: row.status });
  contractDrawer.value = true;
}

async function submitContract() {
  if (saving.value) return;
  if (!contractForm.contractNo.trim() || !contractForm.title.trim()) return ElMessage.warning("请填写合同编号和标题");
  let target: AdTarget;
  try {
    target = contractTarget.value || captureAdTarget("contract", undefined, contractForm.tenantId);
    assertAdTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  const payload = { ...rowPayload(contractForm), tenantId: isPlatformAdmin() ? target.tenantId : undefined };
  saving.value = true;
  try {
    assertAdTarget(target);
    if (target.id) await api.patch(`/admin/ad-contracts/${target.id}`, payload);
    else await api.post("/admin/ad-contracts", payload);
    ElMessage.success("广告合同已保存");
    contractDrawer.value = false;
    contractTarget.value = null;
    await loadAll();
  } catch (error: any) {
    ElMessage.error(error.message || "保存广告合同失败");
  } finally {
    saving.value = false;
  }
}

async function removeContract(row: Contract) {
  const key = `contract-delete:${row.id}`;
  if (actionKey.value) return;
  let target: AdTarget;
  try {
    target = captureAdTarget("contract", row);
    assertAdTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  actionKey.value = key;
  try {
    await ElMessageBox.confirm(`确认删除合同「${row.contractNo}」？`, "删除广告合同", { type: "warning" });
    assertAdTarget(target);
    await api.delete(`/admin/ad-contracts/${row.id}`);
    ElMessage.success("广告合同已删除");
    await loadAll();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "删除广告合同失败");
  } finally {
    actionKey.value = "";
  }
}

function createCampaign() {
  if (!canManage.value) return;
  editingCampaignId.value = null;
  campaignTarget.value = null;
  resetCampaignForm();
  campaignDrawer.value = true;
}

function editCampaign(row: Campaign) {
  if (!canManage.value) return;
  editingCampaignId.value = row.id;
  campaignTarget.value = captureAdTarget("campaign", row);
  Object.assign(campaignForm, { tenantId: row.tenant?.id, advertiserId: row.advertiser?.id, contractId: row.contract?.id, name: row.name, title: row.title, subtitle: row.subtitle || "", imageUrl: row.imageUrl || "", imageUrls: campaignImageList(row), source: row.source, format: row.format, slotKey: row.slotKey, pageKey: row.pageKey, platforms: row.platforms?.length ? row.platforms : ["all"], audienceMode: row.audience?.mode || "all", memberLevelIds: Array.isArray(row.audience?.memberLevelIds) ? [...row.audience.memberLevelIds] : [], link: row.link || "", billingModel: row.billingModel, fixedFee: Number(row.fixedFee || 0), cpmPrice: Number(row.cpmPrice || 0), cpcPrice: Number(row.cpcPrice || 0), totalBudget: Number(row.totalBudget || 0), dailyBudget: Number(row.dailyBudget || 0), impressionLimit: Number(row.impressionLimit || 0), clickLimit: Number(row.clickLimit || 0), officialAdUnitId: row.officialAdUnitId || "", officialAdType: row.officialAdType || "", frequency: row.frequency, priority: Number(row.priority || 0), enabled: row.enabled, startAt: row.startAt ? String(row.startAt).slice(0, 19).replace("T", " ") : "", endAt: row.endAt ? String(row.endAt).slice(0, 19).replace("T", " ") : "" });
  if (campaignForm.source === "wechat_official") {
    campaignForm.platforms = ["mp-weixin"];
    campaignForm.officialAdType = officialTypeForFormat(campaignForm.format);
  }
  campaignDrawer.value = true;
}

function normalizeImageUrls(value: unknown) {
  const list = Array.isArray(value) ? value : [];
  return Array.from(new Set(list.map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 10);
}

function campaignImageList(row: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  return normalizeImageUrls([...(Array.isArray(row.imageUrls) ? row.imageUrls : []), row.imageUrl || ""]);
}

function campaignPayload() {
  const imageUrls = normalizeImageUrls(campaignForm.imageUrls);
  campaignForm.imageUrls = imageUrls;
  campaignForm.imageUrl = String(campaignForm.imageUrl || imageUrls[0] || "").trim();
  const { audienceMode, memberLevelIds, ...baseForm } = campaignForm;
  return { ...rowPayload(baseForm), audience: { mode: audienceMode, memberLevelIds: audienceMode === "member_levels" ? memberLevelIds : [] }, imageUrl: campaignForm.imageUrl || null, imageUrls };
}

function officialTypeForFormat(format: string) {
  return ({ official_banner: "banner", official_video: "video", official_grid: "grid", official_interstitial: "interstitial", official_rewarded_video: "rewarded_video" } as Record<string, string>)[format] || "banner";
}

function onCampaignSourceChange() {
  if (campaignForm.source === "wechat_official") {
    campaignForm.format = "official_banner";
    campaignForm.platforms = ["mp-weixin"];
    campaignForm.officialAdType = "banner";
    campaignForm.link = "";
    return;
  }
  if (campaignForm.format.startsWith("official_")) campaignForm.format = "banner";
  campaignForm.platforms = ["all"];
  campaignForm.officialAdUnitId = "";
  campaignForm.officialAdType = "";
}

async function uploadCampaignImage(file: File) {
  if (!canUpload.value || uploading.value || saving.value) return false;
  if (campaignForm.imageUrls.length >= 10) {
    ElMessage.warning("最多上传 10 张广告图");
    return false;
  }
  const data = new FormData();
  data.append("file", file);
  uploading.value = true;
  try {
    const result = await api.post<any, any>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
    const url = String(result?.url || "").trim();
    if (url && !campaignForm.imageUrls.includes(url)) campaignForm.imageUrls.push(url);
    if (!campaignForm.imageUrl && url) campaignForm.imageUrl = url;
    ElMessage.success("广告图已上传");
  } catch (error: any) {
    ElMessage.error(error.message || "上传广告图失败");
  } finally {
    uploading.value = false;
  }
  return false;
}

function removeCampaignImage(index: number) {
  campaignForm.imageUrls.splice(index, 1);
  if (!campaignForm.imageUrls.includes(campaignForm.imageUrl)) campaignForm.imageUrl = campaignForm.imageUrls[0] || "";
}

async function submitCampaign() {
  if (saving.value) return;
  if (!campaignForm.name.trim() || !campaignForm.title.trim()) return ElMessage.warning("请填写广告计划名称和前台标题");
  const blockers = campaignEnableBlockers(campaignForm);
  if (campaignForm.enabled && blockers.length) return ElMessage.warning(blockers[0]);
  let target: AdTarget;
  try {
    target = campaignTarget.value || captureAdTarget("campaign", undefined, campaignForm.tenantId);
    assertAdTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  const payload = { ...campaignPayload(), tenantId: isPlatformAdmin() ? target.tenantId : undefined };
  saving.value = true;
  try {
    assertAdTarget(target);
    if (target.id) await api.patch(`/admin/ad-campaigns/${target.id}`, payload);
    else await api.post("/admin/ad-campaigns", payload);
    ElMessage.success("广告计划已保存");
    campaignDrawer.value = false;
    campaignTarget.value = null;
    await loadAll();
  } catch (error: any) {
    ElMessage.error(error.message || "保存广告计划失败");
  } finally {
    saving.value = false;
  }
}

async function toggleCampaign(row: Campaign) {
  const key = `campaign-toggle:${row.id}`;
  if (actionKey.value) return;
  if (!row.enabled) {
    const blockers = campaignEnableBlockers(row);
    if (blockers.length) return ElMessage.warning(blockers[0]);
  }
  let target: AdTarget;
  try {
    target = captureAdTarget("campaign", row);
    assertAdTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  actionKey.value = key;
  try {
    const current = assertAdTarget(target) as Campaign;
    const imageUrls = campaignImageList(current);
    await api.patch(`/admin/ad-campaigns/${row.id}`, { ...rowPayload({ ...current, tenantId: target.tenantId, advertiserId: current.advertiser?.id, contractId: current.contract?.id, imageUrl: current.imageUrl || imageUrls[0] || "", imageUrls }), enabled: !current.enabled });
    ElMessage.success(current.enabled ? "广告计划已停用" : "广告计划已启用");
    await loadAll();
  } catch (error: any) {
    ElMessage.error(error.message || "广告计划状态更新失败");
  } finally {
    actionKey.value = "";
  }
}

async function removeCampaign(row: Campaign) {
  const key = `campaign-delete:${row.id}`;
  if (actionKey.value) return;
  let target: AdTarget;
  try {
    target = captureAdTarget("campaign", row);
    assertAdTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  actionKey.value = key;
  try {
    await ElMessageBox.confirm(`确认删除广告计划「${row.name}」？`, "删除广告计划", { type: "warning" });
    assertAdTarget(target);
    await api.delete(`/admin/ad-campaigns/${row.id}`);
    ElMessage.success("广告计划已删除");
    await loadAll();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "删除广告计划失败");
  } finally {
    actionKey.value = "";
  }
}

async function generateSettlement() {
  if (!canFinance.value) return;
  if (saving.value) return;
  if (!settlementForm.contractId || !settlementForm.periodStart || !settlementForm.periodEnd) return ElMessage.warning("请选择合同和结算周期");
  if (settlementForm.periodStart > settlementForm.periodEnd) return ElMessage.warning("结算开始日期不能晚于结束日期");
  let target: AdTarget;
  try {
    target = captureAdTarget("settlement", undefined, settlementForm.tenantId);
    assertAdTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  const payload = { ...rowPayload(settlementForm), tenantId: isPlatformAdmin() ? target.tenantId : undefined };
  saving.value = true;
  try {
    assertAdTarget(target);
    await api.post("/admin/ad-settlements/generate", payload);
    ElMessage.success("结算单已生成");
    await loadAll();
  } catch (error: any) {
    ElMessage.error(error.message || "生成结算单失败");
  } finally {
    saving.value = false;
  }
}

async function updateSettlement(row: Settlement, status: string) {
  if (!canFinance.value) return;
  const key = `settlement:${status}:${row.id}`;
  if (actionKey.value) return;
  let target: AdTarget;
  try {
    target = captureAdTarget("settlement", row);
    assertAdTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  actionKey.value = key;
  try {
    await ElMessageBox.confirm(`确认将结算单「${row.settlementNo}」更新为“${statusLabels[status] || status}”？`, "确认结算状态", { type: "warning", confirmButtonText: "确认更新", cancelButtonText: "取消" });
    assertAdTarget(target);
    await api.patch(`/admin/ad-settlements/${row.id}/confirm`, { status });
    ElMessage.success("结算状态已更新");
    await loadAll();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "结算状态更新失败");
  } finally {
    actionKey.value = "";
  }
}

async function importRevenue() {
  if (!canFinance.value) return;
  if (revenueSaving.value) return;
  if (!revenueForm.importDate) return ElMessage.warning("请选择导入日期");
  if ([revenueForm.revenueAmount, revenueForm.impressionCount, revenueForm.clickCount, revenueForm.ecpm].some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) return ElMessage.warning("收益、曝光、点击和 eCPM 不能为负数");
  let target: AdTarget;
  try {
    target = captureAdTarget("settlement", undefined, revenueForm.tenantId);
    assertAdTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "广告中心列表或筛选范围已变化，请刷新后重新操作");
  }
  const payload = { ...rowPayload(revenueForm), tenantId: isPlatformAdmin() ? target.tenantId : undefined };
  revenueSaving.value = true;
  try {
    assertAdTarget(target);
    await api.post("/admin/ad-official-revenue-imports", payload);
    ElMessage.success("官方流量主收益已导入");
    Object.assign(revenueForm, { tenantId: activeTenantId(), importDate: "", revenueAmount: 0, impressionCount: 0, clickCount: 0, ecpm: 0, fileUrl: "", remark: "" });
    await loadSummary();
  } catch (error: any) {
    ElMessage.error(error.message || "官方流量主收益导入失败");
  } finally {
    revenueSaving.value = false;
  }
}

function campaignWarnings(row: Campaign) {
  const warnings: string[] = [];
  if (row.source === "wechat_official") {
    if (!row.officialAdUnitId) warnings.push("缺少官方 adUnitId");
    if (!(row.platforms || []).includes("mp-weixin")) warnings.push("官方广告仅小程序有效");
  } else {
    const imageUrls = campaignImageList(row);
    if (!imageUrls.length && !tenantDefaultAdImage(row.tenant?.id)) warnings.push("自有广告缺少图片");
    if (!imageUrls.length && tenantDefaultAdImage(row.tenant?.id)) warnings.push("使用商家默认广告图兜底");
    if (imageUrls.some((url) => !/^https:\/\//i.test(url) && !url.startsWith("/uploads/"))) warnings.push("图片建议使用 HTTPS");
    if (imageUrls.length > 1) warnings.push(`已配置 ${imageUrls.length} 张轮播图`);
  }
  if (!row.link && row.source === "custom") warnings.push("自有广告缺少跳转链接");
  if (Number(row.totalBudget || 0) > 0 && Number(row.spentAmount || 0) >= Number(row.totalBudget || 0)) warnings.push("已达到总预算");
  return warnings;
}

function campaignEnableBlockers(row: { tenantId?: number; tenant?: TenantOption | null; source?: string; title?: string; imageUrl?: string | null; imageUrls?: string[] | null; link?: string | null }) {
  if (row.source !== "custom") return [];
  const blockers: string[] = [];
  if (!String(row.title || "").trim()) blockers.push("启用自有广告前请填写标题");
  const imageUrl = String(row.imageUrl || "").trim();
  const imageUrls = campaignImageList(row);
  const fallback = tenantDefaultAdImage(row.tenantId || row.tenant?.id);
  if (!imageUrl && !imageUrls.length && !fallback && isPlatformAdmin()) blockers.push("请上传广告图或选择商家默认广告图");
  if ([imageUrl, ...imageUrls].filter(Boolean).some((url) => !/^https:\/\//i.test(url) && !url.startsWith("/uploads/"))) blockers.push("广告图必须使用 HTTPS 或 /uploads/ 地址");
  if (!String(row.link || "").trim()) blockers.push("启用自有广告前请填写跳转链接");
  return blockers;
}

function tenantDefaultAdImage(tenantId?: number) {
  const tenant = tenants.value.find((item) => item.id === tenantId);
  const value = tenant?.defaultAdImageUrl;
  return typeof value === "string" && (/^https:\/\//i.test(value) || value.startsWith("/uploads/")) ? value : "";
}

async function exportCampaigns() {
  if (!canExport.value) return;
  if (actionKey.value) return;
  const scopeKey = adScopeKey("campaign");
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.source) params.set("source", filters.source);
  if (filters.slotKey) params.set("slotKey", filters.slotKey);
  if (filters.enabled) params.set("enabled", filters.enabled);
  actionKey.value = "export:campaigns";
  try {
    if (scopeKey !== adScopeKey("campaign")) throw new Error("广告计划筛选已变化，请重新导出");
    await downloadFile(`/admin/ad-campaigns/export?${params.toString()}`, "广告投放明细.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出投放明细失败");
  } finally {
    actionKey.value = "";
  }
}

async function exportSettlements() {
  if (!canExport.value) return;
  if (actionKey.value) return;
  const scopeKey = adScopeKey("settlement");
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  actionKey.value = "export:settlements";
  try {
    if (scopeKey !== adScopeKey("settlement")) throw new Error("广告结算筛选已变化，请重新导出");
    await downloadFile(`/admin/ad-settlements/export?${params.toString()}`, "广告结算单.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出结算单失败");
  } finally {
    actionKey.value = "";
  }
}

onMounted(async () => {
  await loadTenants();
  Object.assign(settlementForm, { tenantId: activeTenantId() });
  Object.assign(revenueForm, { tenantId: activeTenantId() });
  await loadAll();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>广告中心</h2>
      <div class="toolbar-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 220px" :disabled="scopeLocked" @change="applyFilters">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="搜索广告/广告主/合同" style="width: 220px" :disabled="scopeLocked" @keyup.enter="applyFilters" />
        <el-button v-if="canManage" type="primary" :icon="Plus" :disabled="scopeLocked" @click="createCampaign">新增投放</el-button>
        <el-button :icon="Refresh" :loading="loading" :disabled="scopeLocked" @click="loadAll">刷新</el-button>
      </div>
    </div>

    <el-alert type="info" show-icon :closable="false" title="广告中心负责商业广告投放、官方流量主广告位、广告主合同、CPM/CPC/固定费用计费与结算。营销弹窗仍用于通知类运营弹窗。" />
    <el-alert v-if="errorMessage" type="error" show-icon :closable="false" :title="errorMessage">
      <template #default>
        <el-button v-if="campaignError" size="small" @click="loadCampaigns">重试广告计划</el-button>
        <el-button v-if="advertiserError" size="small" @click="loadAdvertisers">重试广告主</el-button>
        <el-button v-if="contractError" size="small" @click="loadContracts">重试合同</el-button>
        <el-button v-if="settlementError" size="small" @click="loadSettlements">重试结算</el-button>
        <el-button v-if="summaryError" size="small" @click="loadSummary">重试经营汇总</el-button>
      </template>
    </el-alert>
    <el-alert v-if="metadataError" type="error" show-icon :closable="false" :title="metadataError"><template #default><el-button size="small" @click="loadTenants">重试基础数据</el-button></template></el-alert>

    <el-tabs v-model="activeTab" class="ad-tabs" :before-leave="guardTabChange">
      <el-tab-pane label="投放计划" name="campaigns">
        <div class="filter-line">
          <el-select v-model="filters.source" clearable placeholder="广告来源" :disabled="scopeLocked" @change="campaignPage = 1; loadCampaigns()"><el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
          <el-select v-model="filters.slotKey" clearable placeholder="广告位" :disabled="scopeLocked" @change="campaignPage = 1; loadCampaigns()"><el-option v-for="item in slotOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
          <el-select v-model="filters.enabled" clearable placeholder="状态" :disabled="scopeLocked" @change="campaignPage = 1; loadCampaigns()"><el-option label="投放中" value="true" /><el-option label="已停用" value="false" /></el-select>
          <el-button v-if="canExport" :loading="actionKey === 'export:campaigns'" :disabled="writeLocked" @click="exportCampaigns">导出投放明细</el-button>
        </div>
        <el-table v-loading="loading" :data="campaigns" stripe>
          <el-table-column v-if="isPlatformAdmin()" label="商家" width="150"><template #default="{ row }">{{ tenantDisplay(row) }}</template></el-table-column>
          <el-table-column label="广告计划" min-width="240">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
              <div class="muted">{{ row.title }} · {{ row.subtitle || "-" }}</div>
              <div class="warning-list"><el-tag v-for="item in campaignWarnings(row)" :key="item" type="warning" size="small">{{ item }}</el-tag></div>
            </template>
          </el-table-column>
          <el-table-column label="来源/形式" width="170"><template #default="{ row }">{{ labelOf(sourceOptions, row.source) }}<div class="muted">{{ labelOf(formatOptions, row.format) }}</div></template></el-table-column>
          <el-table-column label="广告位" width="170"><template #default="{ row }">{{ labelOf(slotOptions, row.slotKey) }}<div class="muted">{{ row.pageKey }}</div></template></el-table-column>
          <el-table-column label="广告主/合同" width="210"><template #default="{ row }">{{ row.advertiser?.companyName || "-" }}<div class="muted">{{ row.contract?.contractNo || "-" }}</div></template></el-table-column>
          <el-table-column label="计费/预算" width="170"><template #default="{ row }">{{ labelOf(billingOptions, row.billingModel) }}<div class="muted">预算 {{ money(row.totalBudget) }}</div></template></el-table-column>
          <el-table-column label="数据" width="150"><template #default="{ row }">曝 {{ row.impressionCount || 0 }} / 点 {{ row.clickCount || 0 }}<div class="muted">消耗 {{ money(row.spentAmount) }}</div></template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "投放中" : "停用" }}</el-tag></template></el-table-column>
          <el-table-column v-if="canManage" label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button size="small" :icon="Edit" :disabled="writeLocked || loading" @click="editCampaign(row)">编辑</el-button>
              <el-button size="small" :type="row.enabled ? 'warning' : 'success'" :icon="Switch" :loading="actionKey === `campaign-toggle:${row.id}`" :disabled="writeLocked" @click="toggleCampaign(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
              <el-button size="small" type="danger" :icon="Delete" :loading="actionKey === `campaign-delete:${row.id}`" :disabled="writeLocked" @click="removeCampaign(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination v-if="campaignTotal > pageSize" v-model:current-page="campaignPage" :page-size="pageSize" :total="campaignTotal" layout="prev, pager, next, total" :disabled="scopeLocked" @current-change="loadCampaigns" />
      </el-tab-pane>

      <el-tab-pane label="广告位配置" name="slots">
        <el-table :data="slotOptions" stripe>
          <el-table-column label="广告位" prop="label" width="160" />
          <el-table-column label="slotKey" prop="value" width="220" />
          <el-table-column label="默认页面" prop="pageKey" width="180" />
          <el-table-column label="适用形式" prop="formats" width="260" />
          <el-table-column label="投放说明" prop="scene" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="广告主管理" name="advertisers">
        <div v-if="canManage" class="filter-line"><el-button type="primary" :icon="Plus" :disabled="scopeLocked" @click="createAdvertiser">新增广告主</el-button></div>
        <el-table :data="advertisers" stripe>
          <el-table-column v-if="isPlatformAdmin()" label="商家" width="150"><template #default="{ row }">{{ tenantDisplay(row) }}</template></el-table-column>
          <el-table-column label="公司" prop="companyName" min-width="220" />
          <el-table-column label="联系人" width="180"><template #default="{ row }">{{ row.contactName || "-" }}<div class="muted">{{ canSensitive ? (row.contactPhone || "-") : maskPhone(row.contactPhone) }}</div></template></el-table-column>
          <el-table-column label="微信" prop="wechat" width="160" />
          <el-table-column label="状态" width="100"><template #default="{ row }">{{ statusLabels[row.status] || row.status }}</template></el-table-column>
          <el-table-column v-if="canManage" label="操作" width="180"><template #default="{ row }"><el-button size="small" :disabled="writeLocked || loading" @click="editAdvertiser(row)">编辑</el-button><el-button size="small" type="danger" :loading="actionKey === `advertiser-delete:${row.id}`" :disabled="writeLocked" @click="removeAdvertiser(row)">删除</el-button></template></el-table-column>
        </el-table>
        <el-pagination v-if="advertiserTotal > pageSize" v-model:current-page="advertiserPage" :page-size="pageSize" :total="advertiserTotal" layout="prev, pager, next, total" :disabled="scopeLocked" @current-change="loadAdvertisers" />
      </el-tab-pane>

      <el-tab-pane label="合同管理" name="contracts">
        <div v-if="canManage" class="filter-line"><el-button type="primary" :icon="Plus" :disabled="scopeLocked" @click="createContract">新增合同</el-button></div>
        <el-table :data="contracts" stripe>
          <el-table-column v-if="isPlatformAdmin()" label="商家" width="150"><template #default="{ row }">{{ tenantDisplay(row) }}</template></el-table-column>
          <el-table-column label="合同" min-width="240"><template #default="{ row }"><strong>{{ row.contractNo }}</strong><div class="muted">{{ row.title }}</div></template></el-table-column>
          <el-table-column label="广告主" width="200"><template #default="{ row }">{{ row.advertiser?.companyName || "-" }}</template></el-table-column>
          <el-table-column label="计费" width="160"><template #default="{ row }">{{ labelOf(billingOptions, row.billingModel) }}<div class="muted">总额 {{ money(row.amount) }}</div></template></el-table-column>
          <el-table-column label="周期" width="210"><template #default="{ row }">{{ row.startAt ? String(row.startAt).slice(0, 10) : "-" }} 至 {{ row.endAt ? String(row.endAt).slice(0, 10) : "-" }}</template></el-table-column>
          <el-table-column label="付款" width="110"><template #default="{ row }">{{ statusLabels[row.paymentStatus] || row.paymentStatus }}</template></el-table-column>
          <el-table-column v-if="canManage" label="操作" width="180"><template #default="{ row }"><el-button size="small" :disabled="writeLocked || loading" @click="editContract(row)">编辑</el-button><el-button size="small" type="danger" :loading="actionKey === `contract-delete:${row.id}`" :disabled="writeLocked" @click="removeContract(row)">删除</el-button></template></el-table-column>
        </el-table>
        <el-pagination v-if="contractTotal > pageSize" v-model:current-page="contractPage" :page-size="pageSize" :total="contractTotal" layout="prev, pager, next, total" :disabled="scopeLocked" @current-change="loadContracts" />
      </el-tab-pane>

      <el-tab-pane label="结算对账" name="settlements">
        <div v-if="canFinance || canExport" class="settlement-form">
          <el-select v-if="canFinance" v-model="settlementForm.contractId" filterable placeholder="选择合同" :disabled="writeLocked"><el-option v-for="item in availableContracts" :key="item.id" :label="`${item.contractNo} · ${item.title}`" :value="item.id" /></el-select>
          <el-date-picker v-if="canFinance" v-model="settlementForm.periodStart" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" :disabled="writeLocked" />
          <el-date-picker v-if="canFinance" v-model="settlementForm.periodEnd" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" :disabled="writeLocked" />
          <el-button v-if="canFinance" type="primary" :loading="saving" :disabled="writeLocked" @click="generateSettlement">生成结算单</el-button>
          <el-button v-if="canExport" :loading="actionKey === 'export:settlements'" :disabled="writeLocked" @click="exportSettlements">导出结算单</el-button>
        </div>
        <el-table :data="settlements" stripe>
          <el-table-column label="结算单" width="190" prop="settlementNo" />
          <el-table-column label="合同/广告主" min-width="240"><template #default="{ row }">{{ row.contract?.contractNo || "-" }}<div class="muted">{{ row.advertiser?.companyName || "-" }}</div></template></el-table-column>
          <el-table-column label="周期" width="210"><template #default="{ row }">{{ row.periodStart }} 至 {{ row.periodEnd }}</template></el-table-column>
          <el-table-column label="金额" width="120"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="明细" min-width="260"><template #default="{ row }"><div v-for="item in row.items || []" :key="item.id" class="muted">{{ item.description }}：¥{{ money(item.amount) }}</div></template></el-table-column>
          <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag>{{ statusLabels[row.status] || row.status }}</el-tag></template></el-table-column>
          <el-table-column v-if="canFinance" label="操作" width="230"><template #default="{ row }"><el-button v-if="row.status === 'pending'" size="small" :loading="actionKey === `settlement:confirmed:${row.id}`" :disabled="writeLocked" @click="updateSettlement(row, 'confirmed')">确认</el-button><el-button v-if="row.status === 'confirmed'" size="small" :loading="actionKey === `settlement:invoiced:${row.id}`" :disabled="writeLocked" @click="updateSettlement(row, 'invoiced')">已开票</el-button><el-button v-if="row.status === 'invoiced'" size="small" :loading="actionKey === `settlement:paid:${row.id}`" :disabled="writeLocked" @click="updateSettlement(row, 'paid')">已收款</el-button><el-button v-if="['pending', 'confirmed', 'invoiced'].includes(row.status)" size="small" type="warning" :loading="actionKey === `settlement:voided:${row.id}`" :disabled="writeLocked" @click="updateSettlement(row, 'voided')">作废</el-button></template></el-table-column>
        </el-table>
        <el-pagination v-if="settlementTotal > pageSize" v-model:current-page="settlementPage" :page-size="pageSize" :total="settlementTotal" layout="prev, pager, next, total" :disabled="scopeLocked" @current-change="loadSettlements" />
      </el-tab-pane>

      <el-tab-pane label="数据报表 / 接入教程" name="reports">
        <div class="summary-grid">
          <div><strong>{{ summary.totals?.impressions || 0 }}</strong><span>总曝光</span></div>
          <div><strong>{{ summary.totals?.clicks || 0 }}</strong><span>总点击</span></div>
          <div><strong>{{ summary.totals?.ctr || 0 }}%</strong><span>CTR</span></div>
          <div><strong>¥{{ money(summary.totals?.amount) }}</strong><span>自有广告收入</span></div>
          <div><strong>¥{{ money(summary.totals?.officialRevenue) }}</strong><span>官方流量主收入</span></div>
          <div><strong>¥{{ money(summary.totals?.totalRevenue) }}</strong><span>广告总收入</span></div>
        </div>
        <div class="report-layout">
          <section>
            <h3>官方流量主收益导入</h3>
            <div v-if="canFinance" class="revenue-form">
              <el-date-picker v-model="revenueForm.importDate" type="date" value-format="YYYY-MM-DD" placeholder="日期" :disabled="writeLocked" />
              <el-input-number v-model="revenueForm.revenueAmount" :min="0" :precision="2" placeholder="收益" :disabled="writeLocked" />
              <el-input-number v-model="revenueForm.impressionCount" :min="0" placeholder="曝光" :disabled="writeLocked" />
              <el-input-number v-model="revenueForm.clickCount" :min="0" placeholder="点击" :disabled="writeLocked" />
              <el-button type="primary" :loading="revenueSaving" :disabled="writeLocked" @click="importRevenue">导入</el-button>
            </div>
          </section>
          <section>
            <h3>接入教程</h3>
            <ol>
              <li>在微信公众平台开通流量主，创建 Banner、插屏、激励视频等广告位。</li>
              <li>复制广告位 ID 到广告计划的 adUnitId 字段，平台选择微信小程序。</li>
              <li>H5 只展示自有广告；官方广告只会在小程序包中渲染。</li>
              <li>激励视频必须由用户主动点击触发，不做自动弹出和诱导点击。</li>
              <li>小程序首次接入官方广告组件后需要重新构建上传，后续更换广告位 ID 走后台配置即可。</li>
            </ol>
          </section>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-drawer v-if="canManage" v-model="campaignDrawer" :title="campaignDrawerTitle" size="min(760px, 100vw)">
      <el-form label-position="top" :disabled="writeLocked">
        <div class="form-grid">
          <el-form-item v-if="isPlatformAdmin()" label="所属商家"><el-select v-model="campaignForm.tenantId" clearable filterable :disabled="Boolean(editingCampaignId)"><el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" /></el-select></el-form-item>
          <el-form-item label="广告来源"><el-select v-model="campaignForm.source" @change="onCampaignSourceChange"><el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
          <el-form-item label="广告形式"><el-select v-model="campaignForm.format" @change="campaignForm.source === 'wechat_official' && (campaignForm.officialAdType = officialTypeForFormat(campaignForm.format))"><el-option v-for="item in formatOptions.filter((option) => campaignForm.source === 'wechat_official' ? option.value.startsWith('official_') : !option.value.startsWith('official_'))" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
          <el-form-item label="广告位"><el-select v-model="campaignForm.slotKey"><el-option v-for="item in slotOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        </div>
        <el-form-item label="计划名称"><el-input v-model="campaignForm.name" /></el-form-item>
        <el-form-item label="前台标题"><el-input v-model="campaignForm.title" /></el-form-item>
        <el-form-item label="副标题"><el-input v-model="campaignForm.subtitle" /></el-form-item>
        <el-form-item v-if="campaignForm.source === 'custom'" label="广告 Banner 图">
          <div class="campaign-image-manager">
            <div v-if="campaignForm.imageUrls.length" class="campaign-image-list">
              <div v-for="(url, index) in campaignForm.imageUrls" :key="url" class="campaign-image-item">
                <img :src="url" alt="广告图" />
                <div class="campaign-image-meta">
                  <span>{{ index === 0 ? "主图" : `轮播 ${index + 1}` }}</span>
                  <el-button size="small" type="danger" text @click="removeCampaignImage(index)">删除</el-button>
                </div>
              </div>
            </div>
            <el-upload v-if="canUpload" multiple :show-file-list="false" :disabled="writeLocked" :before-upload="uploadCampaignImage">
              <el-button :icon="Plus">上传图片</el-button>
            </el-upload>
            <el-input v-model="campaignForm.imageUrl" placeholder="主图地址，上传后自动填入，也可填写 https:// 或 /uploads/..." />
          </div>
        </el-form-item>
        <el-form-item v-if="campaignForm.source === 'custom'" label="跳转链接"><el-input v-model="campaignForm.link" placeholder="/pages/... 或 https://..." /></el-form-item>
        <div class="form-grid">
          <el-form-item label="广告主"><el-select v-model="campaignForm.advertiserId" clearable filterable><el-option v-for="item in availableAdvertisers" :key="item.id" :label="item.companyName" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="合同"><el-select v-model="campaignForm.contractId" clearable filterable><el-option v-for="item in availableContracts" :key="item.id" :label="`${item.contractNo} · ${item.title}`" :value="item.id" /></el-select></el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="投放平台"><el-checkbox-group v-model="campaignForm.platforms"><el-checkbox v-for="item in platformOptions" :key="item.value" :value="item.value">{{ item.label }}</el-checkbox></el-checkbox-group></el-form-item>
          <el-form-item label="计费模式"><el-select v-model="campaignForm.billingModel"><el-option v-for="item in billingOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="展示人群"><el-select v-model="campaignForm.audienceMode"><el-option label="全部用户" value="all" /><el-option label="仅游客" value="guest" /><el-option label="仅已登录会员" value="authenticated" /><el-option label="指定会员等级" value="member_levels" /></el-select></el-form-item>
          <el-form-item v-if="campaignForm.audienceMode === 'member_levels'" label="会员等级"><el-select v-model="campaignForm.memberLevelIds" multiple filterable placeholder="请选择可见等级"><el-option v-for="level in campaignMemberLevels" :key="level.id" :label="level.name" :value="level.id" /></el-select></el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="固定费用"><el-input-number v-model="campaignForm.fixedFee" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="CPM 单价"><el-input-number v-model="campaignForm.cpmPrice" :min="0" :precision="4" /></el-form-item>
          <el-form-item label="CPC 单价"><el-input-number v-model="campaignForm.cpcPrice" :min="0" :precision="4" /></el-form-item>
          <el-form-item label="总预算"><el-input-number v-model="campaignForm.totalBudget" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="每日预算"><el-input-number v-model="campaignForm.dailyBudget" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="曝光上限"><el-input-number v-model="campaignForm.impressionLimit" :min="0" /></el-form-item>
          <el-form-item label="点击上限"><el-input-number v-model="campaignForm.clickLimit" :min="0" /></el-form-item>
          <el-form-item label="优先级"><el-input-number v-model="campaignForm.priority" :min="-9999" :max="9999" /></el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item v-if="campaignForm.source === 'wechat_official'" label="官方 adUnitId"><el-input v-model="campaignForm.officialAdUnitId" /></el-form-item>
          <el-form-item v-if="campaignForm.source === 'wechat_official'" label="官方广告类型"><el-select v-model="campaignForm.officialAdType"><el-option label="Banner" value="banner" /><el-option label="视频" value="video" /><el-option label="格子" value="grid" /><el-option label="插屏" value="interstitial" /><el-option label="激励视频" value="rewarded_video" /></el-select></el-form-item>
          <el-form-item label="展示频次"><el-select v-model="campaignForm.frequency"><el-option label="每次进入" value="every_visit" /><el-option label="每天一次" value="once_per_day" /><el-option label="当前广告一次" value="once_per_campaign" /></el-select></el-form-item>
          <el-form-item label="状态"><el-switch v-model="campaignForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="开始时间"><el-date-picker v-model="campaignForm.startAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="不限制" /></el-form-item>
          <el-form-item label="结束时间"><el-date-picker v-model="campaignForm.endAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="不限制" /></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button :disabled="writeLocked" @click="campaignDrawer = false">取消</el-button><el-button type="primary" :loading="saving" :disabled="writeLocked" @click="submitCampaign">保存广告计划</el-button></template>
    </el-drawer>

    <el-drawer v-if="canManage" v-model="advertiserDrawer" :title="advertiserDrawerTitle" size="min(520px, 100vw)">
      <el-form label-position="top" :disabled="writeLocked">
        <el-form-item v-if="isPlatformAdmin()" label="所属商家"><el-select v-model="advertiserForm.tenantId" clearable filterable :disabled="Boolean(editingAdvertiserId)"><el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" /></el-select></el-form-item>
        <el-form-item label="公司名称"><el-input v-model="advertiserForm.companyName" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="advertiserForm.contactName" /></el-form-item>
        <el-form-item v-if="canSensitive" label="手机号"><el-input v-model="advertiserForm.contactPhone" /></el-form-item>
        <el-form-item v-if="canSensitive" label="微信"><el-input v-model="advertiserForm.wechat" /></el-form-item>
        <el-form-item v-if="canSensitive" label="资质附件"><el-input v-model="advertiserForm.licenseUrl" /></el-form-item>
        <el-form-item v-if="canSensitive" label="备注"><el-input v-model="advertiserForm.remark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="writeLocked" @click="advertiserDrawer = false">取消</el-button><el-button type="primary" :loading="saving" :disabled="writeLocked" @click="submitAdvertiser">保存广告主</el-button></template>
    </el-drawer>

    <el-drawer v-if="canManage" v-model="contractDrawer" :title="contractDrawerTitle" size="min(640px, 100vw)">
      <el-form label-position="top" :disabled="writeLocked">
        <div class="form-grid">
          <el-form-item v-if="isPlatformAdmin()" label="所属商家"><el-select v-model="contractForm.tenantId" clearable filterable :disabled="Boolean(editingContractId)"><el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" /></el-select></el-form-item>
          <el-form-item label="广告主"><el-select v-model="contractForm.advertiserId" clearable filterable><el-option v-for="item in availableAdvertisers" :key="item.id" :label="item.companyName" :value="item.id" /></el-select></el-form-item>
        </div>
        <el-form-item label="合同编号"><el-input v-model="contractForm.contractNo" /></el-form-item>
        <el-form-item label="合同标题"><el-input v-model="contractForm.title" /></el-form-item>
        <div class="form-grid">
          <el-form-item label="计费模式"><el-select v-model="contractForm.billingModel"><el-option v-for="item in billingOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
          <el-form-item label="合同金额"><el-input-number v-model="contractForm.amount" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="固定费用"><el-input-number v-model="contractForm.fixedFee" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="CPM 单价"><el-input-number v-model="contractForm.cpmPrice" :min="0" :precision="4" /></el-form-item>
          <el-form-item label="CPC 单价"><el-input-number v-model="contractForm.cpcPrice" :min="0" :precision="4" /></el-form-item>
          <el-form-item label="付款状态"><el-select v-model="contractForm.paymentStatus"><el-option label="未付款" value="unpaid" /><el-option label="部分付款" value="partial" /><el-option label="已付款" value="paid" /><el-option label="已退款" value="refunded" /></el-select></el-form-item>
        </div>
        <div class="form-grid"><el-form-item label="开始时间"><el-date-picker v-model="contractForm.startAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item><el-form-item label="结束时间"><el-date-picker v-model="contractForm.endAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item></div>
        <el-form-item v-if="canSensitive" label="附件地址"><el-input v-model="contractForm.attachmentUrl" /></el-form-item>
        <el-form-item v-if="canSensitive" label="备注"><el-input v-model="contractForm.remark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="writeLocked" @click="contractDrawer = false">取消</el-button><el-button type="primary" :loading="saving" :disabled="writeLocked" @click="submitContract">保存合同</el-button></template>
    </el-drawer>
  </div>
</template>

<style scoped>
.ad-tabs { margin-top: 16px; }
.filter-line { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 12px 0; }
.filter-line .el-select { width: 170px; }
.muted { margin-top: 4px; color: #667085; font-size: 12px; line-height: 1.45; }
.warning-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.campaign-image-manager { width: 100%; display: grid; gap: 10px; }
.campaign-image-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.campaign-image-item { overflow: hidden; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.campaign-image-item img { width: 100%; height: 96px; display: block; object-fit: cover; background: #f3f4f6; }
.campaign-image-meta { min-height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 8px; color: #667085; font-size: 12px; }
.settlement-form, .revenue-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 12px 0; }
.settlement-form .el-select { width: 320px; }
.summary-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin: 14px 0; }
.summary-grid > div { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; display: grid; gap: 6px; }
.summary-grid strong { color: #111827; font-size: 22px; }
.summary-grid span { color: #667085; font-size: 12px; }
.report-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
.report-layout section { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.report-layout h3 { margin: 0 0 12px; color: #111827; }
.report-layout ol { margin: 0; padding-left: 20px; color: #475467; line-height: 1.8; }
@media (max-width: 1200px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .report-layout, .form-grid { grid-template-columns: 1fr; }
}
</style>
