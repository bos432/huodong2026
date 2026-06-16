<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { CopyDocument, Delete, Plus, Refresh, Upload, View } from "@element-plus/icons-vue";
import { api } from "../api";
import { currentTenantCode, isPlatformAdmin } from "../permissions";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";
import type { HomepageSectionView, HomepageSectionType } from "@activity/shared";

type SectionForm = {
  type: HomepageSectionType | string;
  title: string;
  subtitle: string;
  enabled: boolean;
  sortOrder: number;
  config: Record<string, any>;
  layout: Record<string, any>;
};

const moduleTypes: Array<{ type: HomepageSectionType; label: string; description: string }> = [
  { type: "search_bar", label: "搜索栏", description: "城市与搜索入口" },
  { type: "hero", label: "主视觉", description: "首屏标题、按钮和统计" },
  { type: "announcement_bar", label: "公告栏", description: "滚动展示公告" },
  { type: "quick_nav", label: "快捷入口", description: "常用功能入口" },
  { type: "category_grid", label: "活动分类", description: "分类横向卡片" },
  { type: "featured_activities", label: "精选活动", description: "推荐活动横滑" },
  { type: "activity_tabs", label: "分类标签", description: "活动流筛选标签" },
  { type: "activity_feed", label: "活动信息流", description: "活动列表" },
  { type: "image_banner", label: "图片广告", description: "运营 Banner" },
  { type: "rich_text", label: "富文本", description: "报名须知与说明" },
  { type: "bottom_nav", label: "底部菜单", description: "H5 底部导航文案和跳转" },
  { type: "my_page", label: "我的页", description: "我的页面头部和快捷入口" },
  { type: "inner_pages", label: "内页布局", description: "活动、报名、招商等内页" }
];

const pageOptions = [
  { key: "home", label: "首页", route: "/pages/index/index" },
  { key: "activity_list", label: "活动列表", route: "/pages/activity/list" },
  { key: "activity_detail", label: "活动详情", route: "/pages/activity/detail" },
  { key: "activity_register", label: "报名确认", route: "/pages/activity/register" },
  { key: "announcement_list", label: "公告中心", route: "/pages/announcement/list" },
  { key: "service_center", label: "服务中心", route: "/pages/service/index" },
  { key: "partner_page", label: "城市合伙人", route: "/pages/partner/index" },
  { key: "user_my", label: "我的", route: "/pages/user/my" },
  { key: "login_page", label: "登录", route: "/pages/user/login" },
  { key: "registration_detail", label: "报名详情", route: "/pages/user/registration" },
  { key: "review_page", label: "评价", route: "/pages/user/review" }
];

const defaultConfig: Record<string, Record<string, any>> = {
  search_bar: { cityLabel: "本地", placeholder: "搜索沙龙、读书会、培训" },
  hero: { eyebrow: "Activity OS", primaryButtonText: "浏览活动", primaryButtonLink: "/pages/activity/list", showStats: true, backgroundColor: "#0f766e", backgroundImage: "", backgroundFit: "cover", overlayColor: "#0f2327", overlayOpacity: 42, textOpacity: 100, titleOpacity: 100, subtitleOpacity: 86, buttonOpacity: 18, statsOpacity: 14 },
  announcement_bar: { limit: 5, pinnedFirst: true, link: "/pages/announcement/list" },
  quick_nav: {
    items: [
      { label: "全部活动", icon: "activity", color: "#0f766e", link: "/pages/activity/list" },
      { label: "公告中心", icon: "notice", color: "#c2410c", link: "/pages/announcement/list" },
      { label: "我的报名", icon: "ticket", color: "#4338ca", link: "/pages/user/my", action: "mainPage" },
      { label: "服务中心", icon: "service", color: "#475467", link: "/pages/service/index" }
    ]
  },
  category_grid: { limit: 8, showCover: true },
  featured_activities: { source: "featured", limit: 6 },
  activity_tabs: { includeHot: true, limit: 8 },
  activity_feed: { source: "latest", limit: 10, pageSize: 4, pagination: "pager" },
  image_banner: { imageUrl: "", link: "/pages/activity/list", ratio: "3:1", fit: "cover" },
  rich_text: { content: "报名须知", imageUrl: "", link: "" },
  bottom_nav: {
    items: [
      { label: "首页", link: "/pages/index/index", action: "mainPage", color: "#0f766e" },
      { label: "活动", link: "/pages/activity/list", action: "mainPage", color: "#0f766e" },
      { label: "我的", link: "/pages/user/my", action: "mainPage", color: "#0f766e" }
    ]
  },
  my_page: {
    greeting: "我的活动",
    tools: [
      { label: "浏览活动", icon: "活", color: "#0f766e", link: "/pages/activity/list", action: "mainPage" },
      { label: "公告中心", icon: "告", color: "#c2410c", link: "/pages/announcement/list" },
      { label: "服务中心", icon: "服", color: "#475467", link: "/pages/service/index" },
      { label: "刷新状态", icon: "刷", color: "#4338ca", action: "refresh" }
    ]
  },
  inner_pages: {
    pages: [
      { key: "activity_list", title: "活动", subtitle: "筛选近期活动，快速找到适合参加的课程和线下活动。", showBottomNav: true },
      { key: "announcement_list", title: "公告中心", subtitle: "活动通知、报名提醒和现场须知都会集中展示在这里。", showBottomNav: true },
      { key: "service_center", title: "服务中心", subtitle: "付款、退款、发票和客服信息，都可以在这里快速找到。", showBottomNav: true },
      { key: "activity_detail", title: "活动详情", subtitle: "查看活动介绍、报名规则、服务说明和现场信息。", showBottomNav: false },
      { key: "activity_register", title: "报名确认", subtitle: "确认票种、优惠和报名信息，提交后可在我的活动查看进度。", showBottomNav: false },
      { key: "registration_detail", title: "报名详情", subtitle: "查看报名状态、订单、签到码、入群二维码和主办方服务信息。", showBottomNav: true },
      { key: "review_page", title: "评价活动", subtitle: "你的反馈会帮助主办方持续改进活动体验。", showBottomNav: true },
      { key: "login_page", title: "手机号登录", subtitle: "用于查看报名、订单、签到码和会员权益。", showBottomNav: false },
      { key: "partner_page", title: "城市合伙人", subtitle: "适合文化空间、书院、培训机构和本地社群运营者，用 SaaS 后台独立发布活动、收款对账和沉淀会员。", showBottomNav: true }
    ]
  }
};

const defaultLayout: Record<string, Record<string, any>> = {
  search_bar: { spacingBottom: 10, background: "transparent" },
  hero: { spacingBottom: 10, density: "comfortable", borderRadius: 8 },
  announcement_bar: { spacingBottom: 10 },
  quick_nav: { columns: 4, spacingBottom: 18 },
  category_grid: { display: "horizontal", spacingBottom: 18 },
  featured_activities: { display: "horizontal", spacingBottom: 18 },
  activity_tabs: { spacingBottom: 8 },
  activity_feed: { display: "list" },
  image_banner: { spacingBottom: 18 },
  rich_text: { spacingBottom: 18 },
  bottom_nav: { backgroundColor: "#ffffff", activeColor: "#0f766e", textColor: "#667085" },
  my_page: { heroBackgroundColor: "#111827", heroTextColor: "#ffffff" },
  inner_pages: { headerBackgroundColor: "#ffffff", headerTextColor: "#111827", headerSubtitleColor: "#667085", stickyFilterBackground: "#f4f6f8", actionBarBackgroundColor: "#ffffff" }
};
const rows = ref<HomepageSectionView[]>([]);
const tenants = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const drawer = ref(false);
const editingId = ref<number | null>(null);
const draggedId = ref<number | null>(null);
const formSnapshot = ref("");
const form = reactive<SectionForm>({ type: "hero", title: "", subtitle: "", enabled: true, sortOrder: 0, config: {}, layout: {} });
const configText = ref("{}");
const layoutText = ref("{}");
const filters = reactive({ tenantId: undefined as number | undefined, pageKey: "home" });

const orderedRows = computed(() => [...rows.value].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
const canEdit = computed(() => true);
const currentPageOption = computed(() => pageOptions.find((item) => item.key === filters.pageKey) || pageOptions[0]);
const scopeTitle = computed(() => `${currentPageOption.value.label} · ${isPlatformAdmin() && filters.tenantId ? "商家独立装修" : isPlatformAdmin() ? "平台全局默认装修" : "当前商家装修"}`);
const scopeTip = computed(() => {
  if (!isPlatformAdmin()) return "";
  return filters.tenantId ? "当前正在编辑选中商家的独立 H5 装修；清空商家筛选后可编辑平台全局默认装修。" : "当前正在编辑平台全局默认装修；未单独装修的商家会自动继承这套配置。";
});
const pageTitle = computed(() => (isPlatformAdmin() ? "H5 全局装修" : "首页装修"));
const pageDescription = computed(() => (isPlatformAdmin() ? "配置平台默认或指定商家的 H5 首页、底部菜单、我的页面和内页布局。" : "配置本商家 H5 页面装修，保存后刷新前台立即生效。"));
const selectedTenant = computed(() => tenants.value.find((tenant) => tenant.id === filters.tenantId));
const saveScopeName = computed(() => (isPlatformAdmin() && filters.tenantId ? selectedTenant.value?.name || selectedTenant.value?.code || "选中商家" : isPlatformAdmin() ? "平台全局默认装修" : "当前商家装修"));
const previewTenantCode = computed(() => (isPlatformAdmin() ? selectedTenant.value?.code || "" : currentTenantCode()));
const previewScopeName = computed(() => (isPlatformAdmin() && !previewTenantCode.value ? "平台默认首页" : selectedTenant.value?.name || tenantDisplayName({ tenant: { code: previewTenantCode.value } })));
const previewUrl = computed(() => h5RoutePreviewUrl(previewTenantCode.value, currentPageOption.value.route));
const currentFormSnapshot = computed(() => JSON.stringify({
  type: form.type,
  title: form.title,
  subtitle: form.subtitle,
  enabled: form.enabled,
  sortOrder: form.sortOrder,
  configText: configText.value,
  layoutText: layoutText.value
}));
const hasUnsavedChanges = computed(() => drawer.value && formSnapshot.value !== currentFormSnapshot.value);

function typeLabel(type: string) {
  return moduleTypes.find((item) => item.type === type)?.label || type;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value || {}));
}

function clampPercent(value: unknown, fallback: number) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, 0), 100);
}

function hexToRgb(color: unknown) {
  const value = String(color || "").trim();
  const match = value.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return "15, 35, 39";
  return `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}`;
}

function rgba(color: unknown, opacity: unknown, fallback = 100) {
  return `rgba(${hexToRgb(color)}, ${clampPercent(opacity, fallback) / 100})`;
}

function heroBackgroundStyle(config: Record<string, any>) {
  const base = config.backgroundColor || "#0f766e";
  const overlay = rgba(config.overlayColor || "#0f2327", config.overlayOpacity, config.backgroundImage ? 42 : 0);
  const fit = config.backgroundFit === "contain" ? "contain" : "cover";
  return config.backgroundImage ? `linear-gradient(90deg, ${overlay}, ${overlay}), url(${config.backgroundImage}) center/${fit} no-repeat, ${base}` : base;
}

function previewHeroStyle(row: HomepageSectionView) {
  const config = (row.config || {}) as Record<string, any>;
  const layout = (row.layout || {}) as Record<string, any>;
  return {
    background: heroBackgroundStyle(config),
    borderRadius: `${Number(layout.borderRadius ?? 8)}px`,
    marginBottom: `${Number(layout.spacingBottom ?? 10)}px`
  };
}

function previewSectionStyle(row: HomepageSectionView) {
  const layout = (row.layout || {}) as Record<string, any>;
  const background = layout.backgroundImage ? `url(${layout.backgroundImage}) center/cover no-repeat, ${layout.backgroundColor || "#fff"}` : layout.backgroundColor || "#fff";
  return {
    background,
    borderRadius: `${Number(layout.borderRadius ?? 8)}px`,
    marginBottom: `${Number(layout.spacingBottom ?? 10)}px`
  };
}

function resetForm(type: HomepageSectionType | string) {
  Object.assign(form, {
    type,
    title: typeLabel(type),
    subtitle: "",
    enabled: true,
    sortOrder: orderedRows.value.length ? Math.max(...orderedRows.value.map((item) => item.sortOrder)) + 10 : 10,
    config: cloneJson(defaultConfig[type] || {}),
    layout: cloneJson(defaultLayout[type] || {})
  });
  syncJsonText();
}

function syncJsonText() {
  configText.value = JSON.stringify(form.config || {}, null, 2);
  layoutText.value = JSON.stringify(form.layout || {}, null, 2);
}

function captureFormSnapshot() {
  formSnapshot.value = currentFormSnapshot.value;
}

function homepageScopeParams() {
  const params: Record<string, unknown> = { pageKey: filters.pageKey };
  if (isPlatformAdmin() && filters.tenantId) params.tenantId = filters.tenantId;
  return { params };
}

async function load() {
  loading.value = true;
  try {
    rows.value = await api.get<any, HomepageSectionView[]>("/admin/homepage/sections", homepageScopeParams());
  } finally {
    loading.value = false;
  }
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}

async function handleScopeChanged() {
  if (drawer.value) {
    if (hasUnsavedChanges.value) ElMessage.warning("已切换装修范围，当前未保存的模块编辑已关闭");
    drawer.value = false;
    editingId.value = null;
    captureFormSnapshot();
  }
  await load();
}

function addSection(type: HomepageSectionType) {
  if (!canEdit.value) return;
  editingId.value = null;
  resetForm(type);
  captureFormSnapshot();
  drawer.value = true;
}

function edit(row: HomepageSectionView) {
  if (!canEdit.value) return;
  editingId.value = row.id;
  Object.assign(form, {
    type: row.type,
    title: row.title || "",
    subtitle: row.subtitle || "",
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    config: cloneJson(row.config || {}),
    layout: cloneJson(row.layout || {})
  });
  syncJsonText();
  captureFormSnapshot();
  drawer.value = true;
}

async function copy(row: HomepageSectionView) {
  if (!canEdit.value) return;
  const payload = {
    pageKey: filters.pageKey,
    type: row.type,
    title: `${row.title || typeLabel(row.type)} 副本`,
    subtitle: row.subtitle || "",
    enabled: row.enabled,
    sortOrder: orderedRows.value.length ? Math.max(...orderedRows.value.map((item) => item.sortOrder)) + 10 : 10,
    config: row.config || {},
    layout: row.layout || {}
  };
  await api.post("/admin/homepage/sections", payload, homepageScopeParams());
  ElMessage.success("模块已复制");
  load();
}

async function remove(row: HomepageSectionView) {
  if (!canEdit.value) return;
  await ElMessageBox.confirm(`确认删除「${row.title || typeLabel(row.type)}」？删除后 H5 将不再显示该模块。`, "删除模块", { type: "warning" });
  await api.delete(`/admin/homepage/sections/${row.id}`, homepageScopeParams());
  ElMessage.success("模块已删除");
  load();
}

async function toggle(row: HomepageSectionView) {
  if (!canEdit.value) return;
  await api.patch(`/admin/homepage/sections/${row.id}`, {
    pageKey: filters.pageKey,
    type: row.type,
    title: row.title || "",
    subtitle: row.subtitle || "",
    sortOrder: row.sortOrder,
    config: row.config || {},
    layout: row.layout || {},
    enabled: !row.enabled
  }, homepageScopeParams());
  ElMessage.success(!row.enabled ? "模块已启用" : "模块已停用");
  load();
}

function parseJson(text: string, label: string) {
  const parsed = JSON.parse(text || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${label} 必须是 JSON object`);
  return parsed;
}

async function submit() {
  if (!canEdit.value) return;
  try {
    form.config = parseJson(configText.value, "config");
    form.layout = parseJson(layoutText.value, "layout");
  } catch (error: any) {
    ElMessage.error(error.message || "JSON 格式不正确");
    return;
  }
  saving.value = true;
  try {
    if (form.type === "bottom_nav") form.config.items = sanitizeNavItems(form.config.items);
    const payload = { ...form, pageKey: filters.pageKey, title: form.title || null, subtitle: form.subtitle || null };
    if (editingId.value) await api.patch(`/admin/homepage/sections/${editingId.value}`, payload, homepageScopeParams());
    else await api.post("/admin/homepage/sections", payload, homepageScopeParams());
    ElMessage.success(`已保存到「${saveScopeName.value}」，刷新 H5 预览即可查看最新效果`);
    captureFormSnapshot();
    drawer.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function closeDrawer(done?: () => void) {
  if (!hasUnsavedChanges.value) {
    if (done) done();
    else drawer.value = false;
    return;
  }
  try {
    await ElMessageBox.confirm("当前模块有未保存修改，关闭后这些修改不会生效。确认关闭？", "未保存修改", {
      type: "warning",
      confirmButtonText: "确认关闭",
      cancelButtonText: "继续编辑"
    });
    captureFormSnapshot();
    if (done) done();
    else drawer.value = false;
  } catch {
    // Keep editing.
  }
}

async function saveOrder(nextRows: HomepageSectionView[]) {
  if (!canEdit.value) return;
  const items = nextRows.map((item, index) => ({ id: item.id, sortOrder: (index + 1) * 10 }));
  rows.value = await api.put<any, HomepageSectionView[]>("/admin/homepage/sections/reorder", { items }, homepageScopeParams());
  ElMessage.success("排序已保存");
}

function move(row: HomepageSectionView, offset: number) {
  if (!canEdit.value) return;
  const list = orderedRows.value;
  const from = list.findIndex((item) => item.id === row.id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= list.length) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  saveOrder(list);
}

function onDragStart(row: HomepageSectionView) {
  if (!canEdit.value) return;
  draggedId.value = row.id;
}

function onDrop(target: HomepageSectionView) {
  if (!canEdit.value) return;
  const id = draggedId.value;
  draggedId.value = null;
  if (!id || id === target.id) return;
  const list = orderedRows.value;
  const from = list.findIndex((item) => item.id === id);
  const to = list.findIndex((item) => item.id === target.id);
  if (from < 0 || to < 0) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  saveOrder(list);
}

async function resetDefault() {
  if (!canEdit.value) return;
  await ElMessageBox.confirm(`恢复默认装修会替换「${currentPageOption.value.label}」当前范围的全部模块配置，确认继续？`, "恢复默认装修", { type: "warning" });
  rows.value = await api.post<any, HomepageSectionView[]>("/admin/homepage/sections/reset-default", {}, homepageScopeParams());
  ElMessage.success("已恢复默认装修");
}

async function uploadImage(file: File, field: string) {
  const data = new FormData();
  data.append("file", file);
  const result = await api.post<any, any>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
  form.config[field] = result.url || result.path;
  syncJsonText();
  ElMessage.success("图片已上传");
  return false;
}

async function uploadLayoutImage(file: File) {
  const data = new FormData();
  data.append("file", file);
  const result = await api.post<any, any>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
  form.layout.backgroundImage = result.url || result.path;
  syncJsonText();
  ElMessage.success("背景图已上传");
  return false;
}

function onTypeChange(value: string | number | boolean) {
  resetForm(String(value));
}

function uploadHeroBackground(file: File) {
  return uploadImage(file, "backgroundImage");
}

function uploadBannerImage(file: File) {
  return uploadImage(file, "imageUrl");
}

function uploadRichTextImage(file: File) {
  return uploadImage(file, "imageUrl");
}

function updateQuickItem(index: number, key: string, value: string) {
  const items = Array.isArray(form.config.items) ? form.config.items : [];
  items[index] = { ...(items[index] || {}), [key]: value };
  form.config.items = items;
  syncJsonText();
}

function updateQuickLabel(index: number, value: string | number) {
  updateQuickItem(index, "label", String(value));
}

function updateQuickLink(index: number, value: string | number) {
  updateQuickItem(index, "link", String(value));
}

function updateQuickColor(index: number, value: string | null) {
  updateQuickItem(index, "color", String(value || "#0f766e"));
}

function addQuickItem() {
  form.config.items = [...(Array.isArray(form.config.items) ? form.config.items : []), { label: "新入口", icon: "activity", color: "#0f766e", link: "/pages/activity/list" }];
  syncJsonText();
}

function removeQuickItem(index: number) {
  form.config.items = (Array.isArray(form.config.items) ? form.config.items : []).filter((_, itemIndex) => itemIndex !== index);
  syncJsonText();
}

function updateConfigArrayItem(arrayKey: "items" | "tools", index: number, key: string, value: string) {
  const items = Array.isArray(form.config[arrayKey]) ? form.config[arrayKey] : [];
  items[index] = { ...(items[index] || {}), [key]: value };
  form.config[arrayKey] = items;
  syncJsonText();
}

function removeConfigArrayItem(arrayKey: "items" | "tools" | "pages", index: number) {
  form.config[arrayKey] = (Array.isArray(form.config[arrayKey]) ? form.config[arrayKey] : []).filter((_, itemIndex) => itemIndex !== index);
  syncJsonText();
}

function addNavItem() {
  const items = Array.isArray(form.config.items) ? form.config.items : [];
  if (items.length >= 4) {
    ElMessage.warning("底部菜单最多 4 项");
    return;
  }
  form.config.items = [...(Array.isArray(form.config.items) ? form.config.items : []), { label: "新菜单", color: "#0f766e", link: "/pages/index/index", action: "mainPage" }];
  syncJsonText();
}

function sanitizeNavItems(value: unknown) {
  const seen = new Set<string>();
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((item: any) => ({ ...item, label: String(item?.label || "").trim(), link: String(item?.link || "").trim() }))
    .filter((item: any) => item.label && item.link && !seen.has(item.link) && seen.add(item.link))
    .slice(0, 4);
}

function addMyTool() {
  form.config.tools = [...(Array.isArray(form.config.tools) ? form.config.tools : []), { label: "新入口", icon: "入", color: "#0f766e", link: "/pages/activity/list" }];
  syncJsonText();
}

function updateInnerPage(index: number, key: string, value: string | boolean) {
  const pages = Array.isArray(form.config.pages) ? form.config.pages : [];
  pages[index] = { ...(pages[index] || {}), [key]: value };
  form.config.pages = pages;
  syncJsonText();
}

function addInnerPage() {
  form.config.pages = [...(Array.isArray(form.config.pages) ? form.config.pages : []), { key: "custom_page", title: "新内页", subtitle: "", showBottomNav: true }];
  syncJsonText();
}

function tenantDisplayName(row: any) {
  return row.tenant?.name || row.tenant?.code || "平台/未归属";
}

function tenantOptionLabel(tenant: any) {
  return `${tenant.name || tenant.code}（${tenant.code}）`;
}

async function copyH5PreviewUrl() {
  await copyToClipboard(previewUrl.value);
  ElMessage.success("H5 预览链接已复制");
}

function openCurrentPreview() {
  window.open(previewUrl.value, "_blank", "noopener,noreferrer");
}

onMounted(async () => {
  await loadTenants();
  await load();
});
</script>

<template>
  <div class="builder-page">
    <div class="builder-toolbar">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>{{ pageDescription }}</p>
      </div>
      <div class="toolbar-actions">
        <el-select v-model="filters.pageKey" filterable placeholder="选择页面" style="width: 180px" @change="handleScopeChanged">
          <el-option v-for="page in pageOptions" :key="page.key" :label="page.label" :value="page.key" />
        </el-select>
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 220px" @change="handleScopeChanged">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-button :icon="View" @click="openCurrentPreview">打开H5预览</el-button>
        <el-button :icon="CopyDocument" @click="copyH5PreviewUrl">复制链接</el-button>
        <el-button v-if="canEdit" :icon="Refresh" @click="resetDefault">恢复默认装修</el-button>
        <el-button type="primary" @click="load">刷新</el-button>
      </div>
    </div>

    <div class="preview-link">
      <strong>{{ previewScopeName }}</strong>
      <span>{{ previewUrl }}</span>
    </div>

    <div v-if="scopeTip" class="scope-tip" :class="{ muted: isPlatformAdmin() && filters.tenantId }">{{ scopeTip }}</div>

    <div class="builder-layout">
      <aside v-if="canEdit" class="module-palette">
        <h3>添加模块</h3>
        <button v-for="item in moduleTypes" :key="item.type" class="module-option" @click="addSection(item.type)">
          <span>{{ item.label }}</span>
          <small>{{ item.description }}</small>
        </button>
      </aside>

      <main class="section-list" v-loading="loading">
        <div class="list-head">
          <h3>{{ scopeTitle }}</h3>
          <span>{{ orderedRows.length }} 个模块</span>
        </div>
        <div v-if="!orderedRows.length" class="empty">暂无模块，点击左侧添加或恢复默认装修。</div>
        <div
          v-for="(row, index) in orderedRows"
          :key="row.id"
          class="section-row"
          :class="{ disabled: !row.enabled }"
          :draggable="canEdit"
          @dragstart="onDragStart(row)"
          @dragover.prevent
          @drop="onDrop(row)"
        >
          <div v-if="canEdit" class="drag-handle">::</div>
          <div class="section-main" @click="edit(row)">
            <div class="section-title">
              <strong>{{ row.title || typeLabel(row.type) }}</strong>
              <el-tag size="small">{{ typeLabel(row.type) }}</el-tag>
              <el-tag size="small" :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "显示" : "隐藏" }}</el-tag>
              <el-tag v-if="isPlatformAdmin()" size="small" type="info">{{ tenantDisplayName(row) }}</el-tag>
            </div>
            <p>{{ row.subtitle || "未设置副标题" }}</p>
          </div>
          <div v-if="canEdit" class="row-actions">
            <el-button size="small" @click="move(row, -1)" :disabled="index === 0">上移</el-button>
            <el-button size="small" @click="move(row, 1)" :disabled="index === orderedRows.length - 1">下移</el-button>
            <el-button size="small" @click="toggle(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
            <el-button size="small" :icon="CopyDocument" @click="copy(row)" />
            <el-button size="small" type="danger" :icon="Delete" @click="remove(row)" />
          </div>
        </div>
      </main>

      <aside class="phone-preview">
        <div class="phone-frame">
          <div class="phone-status"></div>
          <div class="preview-scroll">
            <template v-for="row in orderedRows.filter((item) => item.enabled)" :key="row.id">
              <div v-if="row.type === 'search_bar'" class="preview-search">
                <span>{{ (row.config as any).cityLabel || "本地" }}</span>
                <b>{{ (row.config as any).placeholder || "搜索活动" }}</b>
              </div>
              <div v-else-if="row.type === 'hero'" class="preview-hero" :style="previewHeroStyle(row)">
                <small :style="{ opacity: clampPercent((row.config as any).textOpacity, 100) / 100 }">{{ (row.config as any).eyebrow || "Activity OS" }}</small>
                <h4 :style="{ opacity: clampPercent((row.config as any).titleOpacity, 100) / 100 }">{{ row.title }}</h4>
                <p :style="{ opacity: clampPercent((row.config as any).subtitleOpacity, 86) / 100 }">{{ row.subtitle }}</p>
                <div v-if="(row.config as any).primaryButtonText" class="preview-hero-button" :style="{ background: rgba('#ffffff', (row.config as any).buttonOpacity, 18) }">{{ (row.config as any).primaryButtonText }}</div>
                <div v-if="(row.config as any).showStats !== false" class="preview-hero-stats">
                  <span :style="{ background: rgba('#ffffff', (row.config as any).statsOpacity, 14) }">9<br />报名中</span>
                  <span :style="{ background: rgba('#ffffff', (row.config as any).statsOpacity, 14) }">10<br />全部活动</span>
                </div>
              </div>
              <div v-else-if="row.type === 'quick_nav'" class="preview-grid">
                <span v-for="item in ((row.config as any).items || []).slice(0, 4)" :key="item.label">{{ item.label }}</span>
              </div>
              <div v-else-if="row.type === 'image_banner'" class="preview-banner">
                <img v-if="(row.config as any).imageUrl" :src="(row.config as any).imageUrl" />
                <span v-else>图片 Banner</span>
              </div>
              <div v-else-if="row.type === 'bottom_nav'" class="preview-bottom-nav">
                <span v-for="item in ((row.config as any).items || []).slice(0, 4)" :key="item.label">{{ item.label }}</span>
              </div>
              <div v-else-if="row.type === 'my_page'" class="preview-my">
                <strong>{{ (row.config as any).greeting || row.title || "我的活动" }}</strong>
                <span v-for="item in ((row.config as any).tools || []).slice(0, 4)" :key="item.label">{{ item.label }}</span>
              </div>
              <div v-else-if="row.type === 'inner_pages'" class="preview-inner-pages">
                <strong>{{ row.title || "内页布局" }}</strong>
                <span v-for="item in ((row.config as any).pages || []).slice(0, 4)" :key="item.key">{{ item.title }}</span>
              </div>
              <div v-else class="preview-section" :style="previewSectionStyle(row)">
                <strong>{{ row.title || typeLabel(row.type) }}</strong>
                <span>{{ typeLabel(row.type) }}</span>
              </div>
            </template>
          </div>
        </div>
      </aside>
    </div>

    <el-drawer v-model="drawer" title="编辑首页模块" size="560px" :before-close="closeDrawer">
      <div class="drawer-save-bar">
        <div>
          <strong>{{ editingId ? "保存当前模块" : "保存新模块" }}</strong>
          <span>{{ form.title || typeLabel(form.type) }}</span>
        </div>
        <el-tag v-if="hasUnsavedChanges" type="warning" effect="plain">未保存修改</el-tag>
        <div class="drawer-save-actions">
          <el-button @click="closeDrawer()">取消</el-button>
          <el-button :icon="View" @click="openCurrentPreview">预览</el-button>
          <el-button type="primary" :loading="saving" @click="submit">保存模块</el-button>
        </div>
      </div>
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="模块类型">
            <el-select v-model="form.type" @change="onTypeChange">
              <el-option v-for="item in moduleTypes" :key="item.type" :label="item.label" :value="item.type" />
            </el-select>
          </el-form-item>
          <el-form-item label="是否显示">
            <el-switch v-model="form.enabled" />
          </el-form-item>
          <el-form-item label="标题">
            <el-input v-model="form.title" />
          </el-form-item>
          <el-form-item label="副标题">
            <el-input v-model="form.subtitle" />
          </el-form-item>
        </div>

        <template v-if="form.type === 'hero'">
          <el-form-item label="角标"><el-input v-model="form.config.eyebrow" @input="syncJsonText" /></el-form-item>
          <el-form-item label="按钮文案"><el-input v-model="form.config.primaryButtonText" @input="syncJsonText" /></el-form-item>
          <el-form-item label="按钮跳转"><el-input v-model="form.config.primaryButtonLink" @input="syncJsonText" /></el-form-item>
          <el-form-item label="背景色"><el-color-picker v-model="form.config.backgroundColor" @change="syncJsonText" /></el-form-item>
          <el-form-item label="背景图">
            <div class="upload-line">
              <el-input v-model="form.config.backgroundImage" @input="syncJsonText" />
              <el-upload :show-file-list="false" :before-upload="uploadHeroBackground">
                <el-button :icon="Upload">上传</el-button>
              </el-upload>
            </div>
          </el-form-item>
          <el-form-item label="背景适配">
            <el-radio-group v-model="form.config.backgroundFit" @change="syncJsonText">
              <el-radio-button label="cover">裁切铺满</el-radio-button>
              <el-radio-button label="contain">完整显示</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="遮罩颜色"><el-color-picker v-model="form.config.overlayColor" @change="syncJsonText" /></el-form-item>
          <el-form-item label="遮罩透明度"><el-slider v-model="form.config.overlayOpacity" :min="0" :max="95" show-input @change="syncJsonText" /></el-form-item>
          <el-form-item label="角标透明度"><el-slider v-model="form.config.textOpacity" :min="20" :max="100" show-input @change="syncJsonText" /></el-form-item>
          <el-form-item label="标题透明度"><el-slider v-model="form.config.titleOpacity" :min="20" :max="100" show-input @change="syncJsonText" /></el-form-item>
          <el-form-item label="副标题透明度"><el-slider v-model="form.config.subtitleOpacity" :min="20" :max="100" show-input @change="syncJsonText" /></el-form-item>
          <el-form-item label="按钮透明度"><el-slider v-model="form.config.buttonOpacity" :min="0" :max="80" show-input @change="syncJsonText" /></el-form-item>
          <el-form-item label="统计卡透明度"><el-slider v-model="form.config.statsOpacity" :min="0" :max="80" show-input @change="syncJsonText" /></el-form-item>
        </template>

        <template v-if="form.type === 'quick_nav'">
          <div class="quick-editor">
            <div v-for="(item, index) in (form.config.items || [])" :key="index" class="quick-row">
              <el-input :model-value="item.label" placeholder="名称" @input="(value: string) => updateQuickLabel(index, value)" />
              <el-input :model-value="item.link" placeholder="跳转路径" @input="(value: string) => updateQuickLink(index, value)" />
              <el-color-picker :model-value="item.color" @change="(value: string | null) => updateQuickColor(index, value)" />
              <el-button type="danger" :icon="Delete" @click="removeQuickItem(index)" />
            </div>
            <el-button :icon="Plus" @click="addQuickItem">新增入口</el-button>
          </div>
        </template>

        <template v-if="['featured_activities', 'activity_feed'].includes(form.type)">
          <el-form-item label="数据来源">
            <el-select v-model="form.config.source" @change="syncJsonText">
              <el-option label="精选活动" value="featured" />
              <el-option label="最新活动" value="latest" />
            </el-select>
          </el-form-item>
          <el-form-item label="展示数量"><el-input-number v-model="form.config.limit" :min="1" :max="30" @change="syncJsonText" /></el-form-item>
          <template v-if="form.type === 'activity_feed'">
            <el-form-item label="每页数量"><el-input-number v-model="form.config.pageSize" :min="1" :max="12" @change="syncJsonText" /></el-form-item>
            <el-form-item label="分页样式">
              <el-radio-group v-model="form.config.pagination" @change="syncJsonText">
                <el-radio-button label="pager">上一页 / 下一页</el-radio-button>
                <el-radio-button label="load_more">加载更多</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </template>
        </template>

        <template v-if="['category_grid', 'announcement_bar', 'activity_tabs'].includes(form.type)">
          <el-form-item label="展示数量"><el-input-number v-model="form.config.limit" :min="1" :max="30" @change="syncJsonText" /></el-form-item>
        </template>

        <template v-if="form.type === 'image_banner'">
          <el-form-item label="图片">
            <div class="upload-line">
              <el-input v-model="form.config.imageUrl" @input="syncJsonText" />
              <el-upload :show-file-list="false" :before-upload="uploadBannerImage">
                <el-button :icon="Upload">上传</el-button>
              </el-upload>
            </div>
          </el-form-item>
          <el-form-item label="链接"><el-input v-model="form.config.link" @input="syncJsonText" /></el-form-item>
          <el-form-item label="展示比例">
            <el-select v-model="form.config.ratio" @change="syncJsonText">
              <el-option label="横幅 3:1" value="3:1" />
              <el-option label="宽屏 16:9" value="16:9" />
              <el-option label="方图 1:1" value="1:1" />
              <el-option label="海报 4:5" value="4:5" />
            </el-select>
          </el-form-item>
          <el-form-item label="图片适配">
            <el-radio-group v-model="form.config.fit" @change="syncJsonText">
              <el-radio-button label="cover">裁切铺满</el-radio-button>
              <el-radio-button label="contain">完整显示</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </template>

        <template v-if="form.type === 'rich_text'">
          <el-form-item label="内容"><el-input v-model="form.config.content" type="textarea" :rows="5" @input="syncJsonText" /></el-form-item>
          <el-form-item label="图片">
            <div class="upload-line">
              <el-input v-model="form.config.imageUrl" @input="syncJsonText" />
              <el-upload :show-file-list="false" :before-upload="uploadRichTextImage">
                <el-button :icon="Upload">上传</el-button>
              </el-upload>
            </div>
          </el-form-item>
        </template>

        <template v-if="form.type === 'bottom_nav'">
          <div class="quick-editor">
            <div v-for="(item, index) in (form.config.items || [])" :key="index" class="quick-row nav-row">
              <el-input :model-value="item.label" placeholder="菜单名称" @input="(value: string) => updateConfigArrayItem('items', index, 'label', value)" />
              <el-input :model-value="item.link" placeholder="跳转路径" @input="(value: string) => updateConfigArrayItem('items', index, 'link', value)" />
              <el-input :model-value="item.action" placeholder="action，如 mainPage" @input="(value: string) => updateConfigArrayItem('items', index, 'action', value)" />
              <el-color-picker :model-value="item.color" @change="(value: string | null) => updateConfigArrayItem('items', index, 'color', String(value || '#0f766e'))" />
              <el-button type="danger" :icon="Delete" @click="removeConfigArrayItem('items', index)" />
            </div>
            <el-button :icon="Plus" :disabled="Array.isArray(form.config.items) && form.config.items.length >= 4" @click="addNavItem">新增菜单</el-button>
          </div>
        </template>

        <template v-if="form.type === 'my_page'">
          <el-form-item label="头部标题"><el-input v-model="form.config.greeting" @input="syncJsonText" /></el-form-item>
          <div class="quick-editor">
            <div v-for="(item, index) in (form.config.tools || [])" :key="index" class="quick-row my-tool-row">
              <el-input :model-value="item.icon" placeholder="图标字" @input="(value: string) => updateConfigArrayItem('tools', index, 'icon', value)" />
              <el-input :model-value="item.label" placeholder="入口名称" @input="(value: string) => updateConfigArrayItem('tools', index, 'label', value)" />
              <el-input :model-value="item.link" placeholder="跳转路径" @input="(value: string) => updateConfigArrayItem('tools', index, 'link', value)" />
              <el-input :model-value="item.action" placeholder="action，如 refresh/mainPage" @input="(value: string) => updateConfigArrayItem('tools', index, 'action', value)" />
              <el-color-picker :model-value="item.color" @change="(value: string | null) => updateConfigArrayItem('tools', index, 'color', String(value || '#0f766e'))" />
              <el-button type="danger" :icon="Delete" @click="removeConfigArrayItem('tools', index)" />
            </div>
            <el-button :icon="Plus" @click="addMyTool">新增我的页入口</el-button>
          </div>
        </template>

        <template v-if="form.type === 'inner_pages'">
          <div class="quick-editor">
            <div v-for="(item, index) in (form.config.pages || [])" :key="index" class="inner-page-row">
              <el-input :model-value="item.key" placeholder="页面 key" @input="(value: string) => updateInnerPage(index, 'key', value)" />
              <el-input :model-value="item.title" placeholder="标题" @input="(value: string) => updateInnerPage(index, 'title', value)" />
              <el-input :model-value="item.subtitle" placeholder="副标题" @input="(value: string) => updateInnerPage(index, 'subtitle', value)" />
              <el-checkbox :model-value="item.showBottomNav !== false" @change="(value: string | number | boolean) => updateInnerPage(index, 'showBottomNav', Boolean(value))">显示底部菜单</el-checkbox>
              <el-button type="danger" :icon="Delete" @click="removeConfigArrayItem('pages', index)" />
            </div>
            <el-button :icon="Plus" @click="addInnerPage">新增内页配置</el-button>
          </div>
          <el-divider>内页外观</el-divider>
          <div class="form-grid">
            <el-form-item label="头部背景色"><el-color-picker v-model="form.layout.headerBackgroundColor" show-alpha @change="syncJsonText" /></el-form-item>
            <el-form-item label="头部标题色"><el-color-picker v-model="form.layout.headerTextColor" @change="syncJsonText" /></el-form-item>
            <el-form-item label="头部副标题色"><el-color-picker v-model="form.layout.headerSubtitleColor" @change="syncJsonText" /></el-form-item>
            <el-form-item label="筛选栏背景"><el-color-picker v-model="form.layout.stickyFilterBackground" show-alpha @change="syncJsonText" /></el-form-item>
            <el-form-item label="底部操作栏背景"><el-color-picker v-model="form.layout.actionBarBackgroundColor" show-alpha @change="syncJsonText" /></el-form-item>
          </div>
        </template>

        <el-divider>通用外观</el-divider>
        <div class="form-grid">
          <el-form-item label="下方间距">
            <el-input-number v-model="form.layout.spacingBottom" :min="0" :max="80" @change="syncJsonText" />
          </el-form-item>
          <el-form-item label="圆角">
            <el-input-number v-model="form.layout.borderRadius" :min="0" :max="24" @change="syncJsonText" />
          </el-form-item>
          <el-form-item label="背景色">
            <el-color-picker v-model="form.layout.backgroundColor" show-alpha @change="syncJsonText" />
          </el-form-item>
          <el-form-item label="背景图">
            <div class="upload-line">
              <el-input v-model="form.layout.backgroundImage" @input="syncJsonText" />
              <el-upload :show-file-list="false" :before-upload="uploadLayoutImage">
                <el-button :icon="Upload">上传</el-button>
              </el-upload>
            </div>
          </el-form-item>
        </div>

        <el-form-item label="config 高级配置">
          <el-input v-model="configText" type="textarea" :rows="8" spellcheck="false" />
        </el-form-item>
        <el-form-item label="layout 布局配置">
          <el-input v-model="layoutText" type="textarea" :rows="5" spellcheck="false" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDrawer()">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存模块</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.builder-page { padding: 20px; }
.builder-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.builder-toolbar h2 { margin: 0; font-size: 22px; }
.builder-toolbar p { margin: 6px 0 0; color: #667085; }
.toolbar-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.preview-link { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #475467; }
.preview-link strong { color: #111827; white-space: nowrap; }
.preview-link span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scope-tip { margin: 0 0 16px; padding: 12px 14px; border: 1px solid #b7e4d7; border-radius: 8px; background: #ecfdf5; color: #047857; font-weight: 700; }
.scope-tip.muted { border-color: #e5e7eb; background: #f8fafc; color: #667085; }
.builder-layout { display: grid; grid-template-columns: 220px minmax(420px, 1fr) 340px; gap: 16px; align-items: start; }
.module-palette, .section-list, .phone-preview { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
.module-palette h3, .list-head h3 { margin: 0 0 12px; }
.module-option { width: 100%; display: grid; gap: 4px; text-align: left; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 10px; cursor: pointer; }
.module-option:hover { border-color: #0f766e; background: #f0fdfa; }
.module-option span { font-weight: 800; color: #111827; }
.module-option small { color: #667085; }
.list-head { display: flex; justify-content: space-between; align-items: center; color: #667085; }
.section-row { display: grid; grid-template-columns: 28px 1fr auto; gap: 12px; align-items: center; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #fff; }
.section-row.disabled { opacity: 0.62; }
.drag-handle { color: #98a2b3; font-weight: 900; cursor: grab; }
.section-main { cursor: pointer; min-width: 0; }
.section-title { display: flex; align-items: center; gap: 8px; }
.section-main p { margin: 6px 0 0; color: #667085; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-actions { display: flex; gap: 6px; align-items: center; }
.empty { padding: 40px 0; color: #98a2b3; text-align: center; }
.phone-preview { position: sticky; top: 20px; }
.phone-frame { width: 292px; height: 600px; margin: 0 auto; border: 10px solid #111827; border-radius: 30px; background: #f4f6f8; overflow: hidden; }
.phone-status { height: 28px; background: #111827; }
.preview-scroll { height: 552px; overflow: hidden; padding: 12px; }
.preview-search { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; margin-bottom: 10px; }
.preview-search span { font-weight: 800; }
.preview-search b { background: #fff; border-radius: 999px; padding: 9px 12px; color: #8a94a6; font-weight: 500; }
.preview-hero { color: #fff; border-radius: 8px; padding: 18px; margin-bottom: 10px; }
.preview-hero h4 { margin: 8px 0; font-size: 20px; line-height: 1.2; }
.preview-hero p { margin: 0; color: rgba(255,255,255,0.82); line-height: 1.45; }
.preview-hero-button { display: inline-flex; margin-top: 12px; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; }
.preview-hero-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 14px; }
.preview-hero-stats span { padding: 8px 4px; border-radius: 8px; text-align: center; font-size: 11px; line-height: 1.35; font-weight: 800; }
.preview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
.preview-grid span { min-height: 58px; display: flex; align-items: center; justify-content: center; text-align: center; border-radius: 8px; background: #fff; font-size: 12px; font-weight: 800; }
.preview-banner { height: 86px; border-radius: 8px; overflow: hidden; background: #e6f2ef; display: flex; align-items: center; justify-content: center; color: #0f766e; font-weight: 800; margin-bottom: 10px; }
.preview-banner img { width: 100%; height: 100%; object-fit: cover; }
.preview-section { display: flex; justify-content: space-between; align-items: center; border-radius: 8px; background: #fff; padding: 14px; margin-bottom: 10px; }
.preview-section strong { color: #111827; }
.preview-section span { color: #667085; font-size: 12px; }
.preview-bottom-nav { position: sticky; bottom: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 10px; padding: 8px; border-radius: 12px; background: #fff; color: #667085; font-size: 12px; text-align: center; box-shadow: 0 -8px 22px rgba(15, 23, 42, 0.08); }
.preview-my { display: grid; gap: 8px; margin-bottom: 10px; padding: 14px; border-radius: 8px; background: #111827; color: #fff; }
.preview-my span { display: inline-flex; margin-right: 6px; padding: 5px 8px; border-radius: 999px; background: rgba(255,255,255,0.14); font-size: 12px; }
.preview-inner-pages { display: grid; gap: 8px; margin-bottom: 10px; padding: 14px; border-radius: 8px; background: #fff; color: #111827; border: 1px solid #e5e7eb; }
.preview-inner-pages span { display: inline-flex; margin-right: 6px; padding: 5px 8px; border-radius: 999px; background: #f3f4f6; color: #475467; font-size: 12px; }
.upload-line { width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.drawer-save-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -8px 0 16px; padding: 12px; border: 1px solid #dbeafe; border-radius: 8px; background: #f8fbff; box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06); }
.drawer-save-bar strong { display: block; color: #111827; font-size: 14px; }
.drawer-save-bar span { display: block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #667085; font-size: 12px; margin-top: 3px; }
.drawer-save-actions { display: flex; gap: 8px; flex-shrink: 0; }
.quick-editor { display: grid; gap: 10px; margin-bottom: 18px; }
.quick-row { display: grid; grid-template-columns: 120px 1fr 42px 34px; gap: 8px; align-items: center; }
.quick-row.nav-row { grid-template-columns: 100px 1fr 140px 42px 34px; }
.quick-row.my-tool-row { grid-template-columns: 70px 110px 1fr 130px 42px 34px; }
.inner-page-row { display: grid; grid-template-columns: 110px 130px 1fr 120px 34px; gap: 8px; align-items: center; }
@media (max-width: 1280px) {
  .builder-layout { grid-template-columns: 200px minmax(420px, 1fr); }
  .phone-preview { display: none; }
}
</style>

