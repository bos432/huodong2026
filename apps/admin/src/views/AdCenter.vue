<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Edit, Plus, Refresh, Switch } from "@element-plus/icons-vue";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";

type TenantOption = { id: number; name?: string; code?: string; enabled?: boolean };
type Advertiser = { id: number; companyName: string; contactName?: string | null; contactPhone?: string | null; wechat?: string | null; licenseUrl?: string | null; remark?: string | null; status: string; tenant?: TenantOption | null };
type Contract = { id: number; contractNo: string; title: string; billingModel: string; amount: string; fixedFee: string; cpmPrice: string; cpcPrice: string; startAt?: string | null; endAt?: string | null; paymentStatus: string; attachmentUrl?: string | null; remark?: string | null; status: string; advertiser?: Advertiser | null; tenant?: TenantOption | null };
type Campaign = {
  id: number;
  name: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  source: string;
  format: string;
  slotKey: string;
  pageKey: string;
  platforms: string[];
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

const route = useRoute();
const activeTab = ref("campaigns");
const loading = ref(false);
const saving = ref(false);
const tenants = ref<TenantOption[]>([]);
const advertisers = ref<Advertiser[]>([]);
const contracts = ref<Contract[]>([]);
const campaigns = ref<Campaign[]>([]);
const settlements = ref<Settlement[]>([]);
const summary = ref<any>({ totals: {} });
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
  source: "custom",
  format: "banner",
  slotKey: "home_top_banner",
  pageKey: "home",
  platforms: ["all"] as string[],
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
const campaignDrawerTitle = computed(() => (editingCampaignId.value ? "编辑广告计划" : "新增广告计划"));
const advertiserDrawerTitle = computed(() => (editingAdvertiserId.value ? "编辑广告主" : "新增广告主"));
const contractDrawerTitle = computed(() => (editingContractId.value ? "编辑广告合同" : "新增广告合同"));

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function labelOf(options: Array<{ label: string; value: string }>, value?: string | null) {
  return options.find((item) => item.value === value)?.label || value || "-";
}

function tenantDisplay(row: { tenant?: TenantOption | null }) {
  return row.tenant?.name || row.tenant?.code || "平台";
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
  Object.assign(campaignForm, { tenantId: activeTenantId(), advertiserId: undefined, contractId: undefined, name: "", title: "", subtitle: "", imageUrl: "", source: "custom", format: "banner", slotKey: "home_top_banner", pageKey: "home", platforms: ["all"], link: "/pages/index/index", billingModel: "fixed", fixedFee: 0, cpmPrice: 0, cpcPrice: 0, totalBudget: 0, dailyBudget: 0, impressionLimit: 0, clickLimit: 0, officialAdUnitId: "", officialAdType: "", frequency: "once_per_day", priority: 0, enabled: true, startAt: "", endAt: "" });
}

function rowPayload<T extends Record<string, any>>(form: T) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === "" ? null : value]));
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, TenantOption[]>("/admin/tenants") : [];
}

async function loadAdvertisers() {
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  advertisers.value = await api.get<any, Advertiser[]>("/admin/ad-advertisers", { params });
}

async function loadContracts() {
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  contracts.value = await api.get<any, Contract[]>("/admin/ad-contracts", { params });
}

async function loadCampaigns() {
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.source) params.set("source", filters.source);
  if (filters.slotKey) params.set("slotKey", filters.slotKey);
  if (filters.enabled) params.set("enabled", filters.enabled);
  campaigns.value = await api.get<any, Campaign[]>("/admin/ad-campaigns", { params });
}

async function loadSettlements() {
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  settlements.value = await api.get<any, Settlement[]>("/admin/ad-settlements", { params });
}

async function loadSummary() {
  const params = new URLSearchParams();
  if (tenantQuery.value.tenantId) params.set("tenantId", String(tenantQuery.value.tenantId));
  summary.value = await api.get<any, any>("/admin/ad-campaigns/summary", { params });
}

async function loadAll() {
  loading.value = true;
  try {
    await Promise.all([loadAdvertisers(), loadContracts(), loadCampaigns(), loadSettlements(), loadSummary()]);
  } catch (error: any) {
    ElMessage.error(error.message || "加载广告中心失败");
  } finally {
    loading.value = false;
  }
}

function createAdvertiser() {
  editingAdvertiserId.value = null;
  resetAdvertiserForm();
  advertiserDrawer.value = true;
}

function editAdvertiser(row: Advertiser) {
  editingAdvertiserId.value = row.id;
  Object.assign(advertiserForm, { tenantId: row.tenant?.id, companyName: row.companyName, contactName: row.contactName || "", contactPhone: row.contactPhone || "", wechat: row.wechat || "", licenseUrl: row.licenseUrl || "", remark: row.remark || "", status: row.status || "active" });
  advertiserDrawer.value = true;
}

async function submitAdvertiser() {
  if (!advertiserForm.companyName.trim()) return ElMessage.warning("请填写广告主公司名称");
  saving.value = true;
  try {
    if (editingAdvertiserId.value) await api.patch(`/admin/ad-advertisers/${editingAdvertiserId.value}`, rowPayload(advertiserForm));
    else await api.post("/admin/ad-advertisers", rowPayload(advertiserForm));
    ElMessage.success("广告主已保存");
    advertiserDrawer.value = false;
    await loadAll();
  } catch (error: any) {
    ElMessage.error(error.message || "保存广告主失败");
  } finally {
    saving.value = false;
  }
}

async function removeAdvertiser(row: Advertiser) {
  await ElMessageBox.confirm(`确认删除广告主「${row.companyName}」？`, "删除广告主", { type: "warning" });
  await api.delete(`/admin/ad-advertisers/${row.id}`);
  ElMessage.success("广告主已删除");
  await loadAll();
}

function createContract() {
  editingContractId.value = null;
  resetContractForm();
  contractDrawer.value = true;
}

function editContract(row: Contract) {
  editingContractId.value = row.id;
  Object.assign(contractForm, { tenantId: row.tenant?.id, advertiserId: row.advertiser?.id, contractNo: row.contractNo, title: row.title, billingModel: row.billingModel, amount: Number(row.amount || 0), fixedFee: Number(row.fixedFee || 0), cpmPrice: Number(row.cpmPrice || 0), cpcPrice: Number(row.cpcPrice || 0), startAt: row.startAt ? String(row.startAt).slice(0, 19).replace("T", " ") : "", endAt: row.endAt ? String(row.endAt).slice(0, 19).replace("T", " ") : "", paymentStatus: row.paymentStatus, attachmentUrl: row.attachmentUrl || "", remark: row.remark || "", status: row.status });
  contractDrawer.value = true;
}

async function submitContract() {
  if (!contractForm.contractNo.trim() || !contractForm.title.trim()) return ElMessage.warning("请填写合同编号和标题");
  saving.value = true;
  try {
    if (editingContractId.value) await api.patch(`/admin/ad-contracts/${editingContractId.value}`, rowPayload(contractForm));
    else await api.post("/admin/ad-contracts", rowPayload(contractForm));
    ElMessage.success("广告合同已保存");
    contractDrawer.value = false;
    await loadAll();
  } catch (error: any) {
    ElMessage.error(error.message || "保存广告合同失败");
  } finally {
    saving.value = false;
  }
}

async function removeContract(row: Contract) {
  await ElMessageBox.confirm(`确认删除合同「${row.contractNo}」？`, "删除广告合同", { type: "warning" });
  await api.delete(`/admin/ad-contracts/${row.id}`);
  ElMessage.success("广告合同已删除");
  await loadAll();
}

function createCampaign() {
  editingCampaignId.value = null;
  resetCampaignForm();
  campaignDrawer.value = true;
}

function editCampaign(row: Campaign) {
  editingCampaignId.value = row.id;
  Object.assign(campaignForm, { tenantId: row.tenant?.id, advertiserId: row.advertiser?.id, contractId: row.contract?.id, name: row.name, title: row.title, subtitle: row.subtitle || "", imageUrl: row.imageUrl || "", source: row.source, format: row.format, slotKey: row.slotKey, pageKey: row.pageKey, platforms: row.platforms?.length ? row.platforms : ["all"], link: row.link || "", billingModel: row.billingModel, fixedFee: Number(row.fixedFee || 0), cpmPrice: Number(row.cpmPrice || 0), cpcPrice: Number(row.cpcPrice || 0), totalBudget: Number(row.totalBudget || 0), dailyBudget: Number(row.dailyBudget || 0), impressionLimit: Number(row.impressionLimit || 0), clickLimit: Number(row.clickLimit || 0), officialAdUnitId: row.officialAdUnitId || "", officialAdType: row.officialAdType || "", frequency: row.frequency, priority: Number(row.priority || 0), enabled: row.enabled, startAt: row.startAt ? String(row.startAt).slice(0, 19).replace("T", " ") : "", endAt: row.endAt ? String(row.endAt).slice(0, 19).replace("T", " ") : "" });
  campaignDrawer.value = true;
}

async function submitCampaign() {
  if (!campaignForm.name.trim() || !campaignForm.title.trim()) return ElMessage.warning("请填写广告计划名称和前台标题");
  saving.value = true;
  try {
    if (editingCampaignId.value) await api.patch(`/admin/ad-campaigns/${editingCampaignId.value}`, rowPayload(campaignForm));
    else await api.post("/admin/ad-campaigns", rowPayload(campaignForm));
    ElMessage.success("广告计划已保存");
    campaignDrawer.value = false;
    await loadAll();
  } catch (error: any) {
    ElMessage.error(error.message || "保存广告计划失败");
  } finally {
    saving.value = false;
  }
}

async function toggleCampaign(row: Campaign) {
  await api.patch(`/admin/ad-campaigns/${row.id}`, { ...rowPayload({ ...row, tenantId: row.tenant?.id, advertiserId: row.advertiser?.id, contractId: row.contract?.id }), enabled: !row.enabled });
  ElMessage.success(row.enabled ? "广告计划已停用" : "广告计划已启用");
  await loadAll();
}

async function removeCampaign(row: Campaign) {
  await ElMessageBox.confirm(`确认删除广告计划「${row.name}」？`, "删除广告计划", { type: "warning" });
  await api.delete(`/admin/ad-campaigns/${row.id}`);
  ElMessage.success("广告计划已删除");
  await loadAll();
}

async function generateSettlement() {
  if (!settlementForm.contractId || !settlementForm.periodStart || !settlementForm.periodEnd) return ElMessage.warning("请选择合同和结算周期");
  saving.value = true;
  try {
    await api.post("/admin/ad-settlements/generate", rowPayload(settlementForm));
    ElMessage.success("结算单已生成");
    await loadAll();
  } catch (error: any) {
    ElMessage.error(error.message || "生成结算单失败");
  } finally {
    saving.value = false;
  }
}

async function updateSettlement(row: Settlement, status: string) {
  await api.patch(`/admin/ad-settlements/${row.id}/confirm`, { status });
  ElMessage.success("结算状态已更新");
  await loadAll();
}

async function importRevenue() {
  if (!revenueForm.importDate) return ElMessage.warning("请选择导入日期");
  await api.post("/admin/ad-official-revenue-imports", rowPayload(revenueForm));
  ElMessage.success("官方流量主收益已导入");
  Object.assign(revenueForm, { tenantId: activeTenantId(), importDate: "", revenueAmount: 0, impressionCount: 0, clickCount: 0, ecpm: 0, fileUrl: "", remark: "" });
  await loadSummary();
}

function campaignWarnings(row: Campaign) {
  const warnings: string[] = [];
  if (row.source === "wechat_official") {
    if (!row.officialAdUnitId) warnings.push("缺少官方 adUnitId");
    if (!(row.platforms || []).includes("mp-weixin")) warnings.push("官方广告仅小程序有效");
  } else {
    if (!row.imageUrl) warnings.push("自有广告缺少图片");
    if (row.imageUrl && !/^https:\/\//i.test(row.imageUrl) && !row.imageUrl.startsWith("/uploads/")) warnings.push("图片建议使用 HTTPS");
  }
  if (!row.link && row.source === "custom") warnings.push("自有广告缺少跳转链接");
  if (Number(row.totalBudget || 0) > 0 && Number(row.spentAmount || 0) >= Number(row.totalBudget || 0)) warnings.push("已达到总预算");
  return warnings;
}

function exportCampaignCsv() {
  const header = ["广告计划", "广告主", "广告位", "平台", "曝光", "点击", "消耗"];
  const lines = campaigns.value.map((row) => [row.name, row.advertiser?.companyName || "", row.slotKey, (row.platforms || []).join("/"), row.impressionCount || 0, row.clickCount || 0, row.spentAmount || "0"].join(","));
  downloadCsv("ad-campaigns.csv", [header.join(","), ...lines].join("\n"));
}

function exportSettlementCsv() {
  const header = ["结算单", "合同", "广告主", "周期", "金额", "状态"];
  const lines = settlements.value.map((row) => [row.settlementNo, row.contract?.contractNo || "", row.advertiser?.companyName || "", `${row.periodStart}~${row.periodEnd}`, row.amount || "0", statusLabels[row.status] || row.status].join(","));
  downloadCsv("ad-settlements.csv", [header.join(","), ...lines].join("\n"));
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 220px" @change="loadAll">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="搜索广告/广告主/合同" style="width: 220px" @keyup.enter="loadAll" />
        <el-button type="primary" :icon="Plus" @click="createCampaign">新增投放</el-button>
        <el-button :icon="Refresh" @click="loadAll">刷新</el-button>
      </div>
    </div>

    <el-alert type="info" show-icon :closable="false" title="广告中心负责商业广告投放、官方流量主广告位、广告主合同、CPM/CPC/固定费用计费与结算。营销弹窗仍用于通知类运营弹窗。" />

    <el-tabs v-model="activeTab" class="ad-tabs">
      <el-tab-pane label="投放计划" name="campaigns">
        <div class="filter-line">
          <el-select v-model="filters.source" clearable placeholder="广告来源" @change="loadCampaigns"><el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
          <el-select v-model="filters.slotKey" clearable placeholder="广告位" @change="loadCampaigns"><el-option v-for="item in slotOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
          <el-select v-model="filters.enabled" clearable placeholder="状态" @change="loadCampaigns"><el-option label="投放中" value="true" /><el-option label="已停用" value="false" /></el-select>
          <el-button @click="exportCampaignCsv">导出投放明细</el-button>
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
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button size="small" :icon="Edit" @click="editCampaign(row)">编辑</el-button>
              <el-button size="small" :type="row.enabled ? 'warning' : 'success'" :icon="Switch" @click="toggleCampaign(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
              <el-button size="small" type="danger" :icon="Delete" @click="removeCampaign(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
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
        <div class="filter-line"><el-button type="primary" :icon="Plus" @click="createAdvertiser">新增广告主</el-button></div>
        <el-table :data="advertisers" stripe>
          <el-table-column v-if="isPlatformAdmin()" label="商家" width="150"><template #default="{ row }">{{ tenantDisplay(row) }}</template></el-table-column>
          <el-table-column label="公司" prop="companyName" min-width="220" />
          <el-table-column label="联系人" width="180"><template #default="{ row }">{{ row.contactName || "-" }}<div class="muted">{{ row.contactPhone || "-" }}</div></template></el-table-column>
          <el-table-column label="微信" prop="wechat" width="160" />
          <el-table-column label="状态" width="100"><template #default="{ row }">{{ statusLabels[row.status] || row.status }}</template></el-table-column>
          <el-table-column label="操作" width="180"><template #default="{ row }"><el-button size="small" @click="editAdvertiser(row)">编辑</el-button><el-button size="small" type="danger" @click="removeAdvertiser(row)">删除</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="合同管理" name="contracts">
        <div class="filter-line"><el-button type="primary" :icon="Plus" @click="createContract">新增合同</el-button></div>
        <el-table :data="contracts" stripe>
          <el-table-column v-if="isPlatformAdmin()" label="商家" width="150"><template #default="{ row }">{{ tenantDisplay(row) }}</template></el-table-column>
          <el-table-column label="合同" min-width="240"><template #default="{ row }"><strong>{{ row.contractNo }}</strong><div class="muted">{{ row.title }}</div></template></el-table-column>
          <el-table-column label="广告主" width="200"><template #default="{ row }">{{ row.advertiser?.companyName || "-" }}</template></el-table-column>
          <el-table-column label="计费" width="160"><template #default="{ row }">{{ labelOf(billingOptions, row.billingModel) }}<div class="muted">总额 {{ money(row.amount) }}</div></template></el-table-column>
          <el-table-column label="周期" width="210"><template #default="{ row }">{{ row.startAt ? String(row.startAt).slice(0, 10) : "-" }} 至 {{ row.endAt ? String(row.endAt).slice(0, 10) : "-" }}</template></el-table-column>
          <el-table-column label="付款" width="110"><template #default="{ row }">{{ statusLabels[row.paymentStatus] || row.paymentStatus }}</template></el-table-column>
          <el-table-column label="操作" width="180"><template #default="{ row }"><el-button size="small" @click="editContract(row)">编辑</el-button><el-button size="small" type="danger" @click="removeContract(row)">删除</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="结算对账" name="settlements">
        <div class="settlement-form">
          <el-select v-model="settlementForm.contractId" filterable placeholder="选择合同"><el-option v-for="item in contracts" :key="item.id" :label="`${item.contractNo} · ${item.title}`" :value="item.id" /></el-select>
          <el-date-picker v-model="settlementForm.periodStart" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" />
          <el-date-picker v-model="settlementForm.periodEnd" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" />
          <el-button type="primary" :loading="saving" @click="generateSettlement">生成结算单</el-button>
          <el-button @click="exportSettlementCsv">导出结算单</el-button>
        </div>
        <el-table :data="settlements" stripe>
          <el-table-column label="结算单" width="190" prop="settlementNo" />
          <el-table-column label="合同/广告主" min-width="240"><template #default="{ row }">{{ row.contract?.contractNo || "-" }}<div class="muted">{{ row.advertiser?.companyName || "-" }}</div></template></el-table-column>
          <el-table-column label="周期" width="210"><template #default="{ row }">{{ row.periodStart }} 至 {{ row.periodEnd }}</template></el-table-column>
          <el-table-column label="金额" width="120"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="明细" min-width="260"><template #default="{ row }"><div v-for="item in row.items || []" :key="item.id" class="muted">{{ item.description }}：¥{{ money(item.amount) }}</div></template></el-table-column>
          <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag>{{ statusLabels[row.status] || row.status }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="230"><template #default="{ row }"><el-button size="small" @click="updateSettlement(row, 'confirmed')">确认</el-button><el-button size="small" @click="updateSettlement(row, 'paid')">已收款</el-button><el-button size="small" type="warning" @click="updateSettlement(row, 'voided')">作废</el-button></template></el-table-column>
        </el-table>
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
            <div class="revenue-form">
              <el-date-picker v-model="revenueForm.importDate" type="date" value-format="YYYY-MM-DD" placeholder="日期" />
              <el-input-number v-model="revenueForm.revenueAmount" :min="0" :precision="2" placeholder="收益" />
              <el-input-number v-model="revenueForm.impressionCount" :min="0" placeholder="曝光" />
              <el-input-number v-model="revenueForm.clickCount" :min="0" placeholder="点击" />
              <el-button type="primary" @click="importRevenue">导入</el-button>
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

    <el-drawer v-model="campaignDrawer" :title="campaignDrawerTitle" size="760px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item v-if="isPlatformAdmin()" label="所属商家"><el-select v-model="campaignForm.tenantId" clearable filterable><el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" /></el-select></el-form-item>
          <el-form-item label="广告来源"><el-select v-model="campaignForm.source"><el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
          <el-form-item label="广告形式"><el-select v-model="campaignForm.format"><el-option v-for="item in formatOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
          <el-form-item label="广告位"><el-select v-model="campaignForm.slotKey"><el-option v-for="item in slotOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        </div>
        <el-form-item label="计划名称"><el-input v-model="campaignForm.name" /></el-form-item>
        <el-form-item label="前台标题"><el-input v-model="campaignForm.title" /></el-form-item>
        <el-form-item label="副标题"><el-input v-model="campaignForm.subtitle" /></el-form-item>
        <el-form-item label="图片地址"><el-input v-model="campaignForm.imageUrl" placeholder="https:// 或 /uploads/..." /></el-form-item>
        <el-form-item label="跳转链接"><el-input v-model="campaignForm.link" placeholder="/pages/... 或 https://..." /></el-form-item>
        <div class="form-grid">
          <el-form-item label="广告主"><el-select v-model="campaignForm.advertiserId" clearable filterable><el-option v-for="item in advertisers" :key="item.id" :label="item.companyName" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="合同"><el-select v-model="campaignForm.contractId" clearable filterable><el-option v-for="item in contracts" :key="item.id" :label="`${item.contractNo} · ${item.title}`" :value="item.id" /></el-select></el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="投放平台"><el-checkbox-group v-model="campaignForm.platforms"><el-checkbox v-for="item in platformOptions" :key="item.value" :label="item.value">{{ item.label }}</el-checkbox></el-checkbox-group></el-form-item>
          <el-form-item label="计费模式"><el-select v-model="campaignForm.billingModel"><el-option v-for="item in billingOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
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
          <el-form-item label="官方 adUnitId"><el-input v-model="campaignForm.officialAdUnitId" /></el-form-item>
          <el-form-item label="官方广告类型"><el-input v-model="campaignForm.officialAdType" placeholder="banner/video/grid/interstitial/rewarded_video" /></el-form-item>
          <el-form-item label="展示频次"><el-select v-model="campaignForm.frequency"><el-option label="每次进入" value="every_visit" /><el-option label="每天一次" value="once_per_day" /><el-option label="当前广告一次" value="once_per_campaign" /></el-select></el-form-item>
          <el-form-item label="状态"><el-switch v-model="campaignForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="开始时间"><el-date-picker v-model="campaignForm.startAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="不限制" /></el-form-item>
          <el-form-item label="结束时间"><el-date-picker v-model="campaignForm.endAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="不限制" /></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button @click="campaignDrawer = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitCampaign">保存广告计划</el-button></template>
    </el-drawer>

    <el-drawer v-model="advertiserDrawer" :title="advertiserDrawerTitle" size="520px">
      <el-form label-position="top">
        <el-form-item v-if="isPlatformAdmin()" label="所属商家"><el-select v-model="advertiserForm.tenantId" clearable filterable><el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" /></el-select></el-form-item>
        <el-form-item label="公司名称"><el-input v-model="advertiserForm.companyName" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="advertiserForm.contactName" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="advertiserForm.contactPhone" /></el-form-item>
        <el-form-item label="微信"><el-input v-model="advertiserForm.wechat" /></el-form-item>
        <el-form-item label="资质附件"><el-input v-model="advertiserForm.licenseUrl" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="advertiserForm.remark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="advertiserDrawer = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitAdvertiser">保存广告主</el-button></template>
    </el-drawer>

    <el-drawer v-model="contractDrawer" :title="contractDrawerTitle" size="640px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item v-if="isPlatformAdmin()" label="所属商家"><el-select v-model="contractForm.tenantId" clearable filterable><el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" /></el-select></el-form-item>
          <el-form-item label="广告主"><el-select v-model="contractForm.advertiserId" clearable filterable><el-option v-for="item in advertisers" :key="item.id" :label="item.companyName" :value="item.id" /></el-select></el-form-item>
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
        <el-form-item label="附件地址"><el-input v-model="contractForm.attachmentUrl" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="contractForm.remark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="contractDrawer = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitContract">保存合同</el-button></template>
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
