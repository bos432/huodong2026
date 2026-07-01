<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Edit, Plus, Refresh, Switch, Upload, View } from "@element-plus/icons-vue";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";

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

const typeOptions = [
  { label: "重要通知", value: "notice" },
  { label: "广告推广", value: "ad" },
  { label: "支付提醒", value: "payment" },
  { label: "五行暖金通知", value: "wuxing_gold" }
];
const platformOptions = [
  { label: "全部", value: "all" },
  { label: "H5", value: "h5" },
  { label: "微信小程序", value: "mp-weixin" }
];
const placementOptions = [
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
];
const frequencyOptions = [
  { label: "每次进入", value: "every_visit" },
  { label: "每天一次", value: "once_per_day" },
  { label: "当前活动一次", value: "once_per_campaign" }
];

const rows = ref<PopupRow[]>([]);
const tenants = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const drawer = ref(false);
const editingId = ref<number | null>(null);
const checkDialog = ref(false);
const checkLoading = ref(false);
const checkResult = ref<EffectiveCheckResult | null>(null);
const filters = reactive({ tenantId: undefined as number | undefined, keyword: "", enabled: "", platform: "", placement: "" });
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

const drawerTitle = computed(() => (editingId.value ? "编辑营销弹窗" : "新增营销弹窗"));
const previewTypeClass = computed(() => `popup-preview-card ${form.type === "wuxing_gold" ? "wuxing" : form.type}`);

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (isPlatformAdmin() && filters.tenantId) params.set("tenantId", String(filters.tenantId));
    if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
    if (filters.enabled) params.set("enabled", filters.enabled);
    if (filters.platform) params.set("platform", filters.platform);
    if (filters.placement) params.set("placement", filters.placement);
    rows.value = await api.get<any, PopupRow[]>("/admin/marketing-popups", { params });
  } catch (error: any) {
    ElMessage.error(error.message || "加载营销弹窗失败");
  } finally {
    loading.value = false;
  }
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
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
  editingId.value = null;
  resetForm();
  drawer.value = true;
}

function edit(row: PopupRow) {
  editingId.value = row.id;
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
  while (rows.length < 2) rows.push({ text: rows.length ? "查看详情" : "暂不查看", link: "", style: rows.length ? "primary" : "secondary" });
  return rows.map((item, index) => ({ text: item.text || (index ? "查看详情" : "暂不查看"), link: item.link || "", style: item.style === "secondary" ? "secondary" : "primary" })) as PopupButton[];
}

async function submit() {
  if (!form.title.trim()) return ElMessage.warning("请填写弹窗标题");
  if (!form.platforms.length || !form.placements.length) return ElMessage.warning("请选择投放平台和页面");
  saving.value = true;
  try {
    const payload = {
      ...form,
      tenantId: isPlatformAdmin() ? form.tenantId || null : undefined,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      content: form.content.trim() || null,
      emphasis: form.emphasis.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      buttons: form.buttons.filter((item) => item.text.trim()).map((item) => ({ text: item.text.trim(), link: item.link.trim(), style: item.style })),
      startAt: form.startAt || null,
      endAt: form.endAt || null
    };
    if (editingId.value) await api.patch(`/admin/marketing-popups/${editingId.value}`, payload);
    else await api.post("/admin/marketing-popups", payload);
    ElMessage.success("营销弹窗已保存");
    drawer.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存营销弹窗失败");
  } finally {
    saving.value = false;
  }
}

async function quickToggle(row: PopupRow) {
  try {
    await api.patch(`/admin/marketing-popups/${row.id}`, rowPayload(row, { enabled: !row.enabled }));
    ElMessage.success(row.enabled ? "已停用" : "已启用");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "更新弹窗失败");
  }
}

function openEffectiveCheck(row?: PopupRow) {
  checkForm.id = row?.id;
  checkForm.tenantId = row?.tenant?.id || (isPlatformAdmin() ? filters.tenantId : undefined);
  checkForm.pageKey = filters.placement || firstSpecific(row?.placements) || "home";
  checkForm.platform = filters.platform || firstSpecific(row?.platforms) || "h5";
  checkResult.value = null;
  checkDialog.value = true;
  void runEffectiveCheck();
}

async function runEffectiveCheck() {
  checkLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (checkForm.id) params.set("id", String(checkForm.id));
    if (isPlatformAdmin() && checkForm.tenantId) params.set("tenantId", String(checkForm.tenantId));
    params.set("pageKey", checkForm.pageKey);
    params.set("platform", checkForm.platform);
    checkResult.value = await api.get<any, EffectiveCheckResult>("/admin/marketing-popups/effective-check", { params });
  } catch (error: any) {
    ElMessage.error(error.message || "生效检测失败");
  } finally {
    checkLoading.value = false;
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
  await ElMessageBox.confirm(`确认删除「${row.title}」？删除后前台不再展示。`, "删除营销弹窗", { type: "warning" });
  try {
    await api.delete(`/admin/marketing-popups/${row.id}`);
    ElMessage.success("营销弹窗已删除");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "删除弹窗失败");
  }
}

async function uploadImage(file: File) {
  const data = new FormData();
  data.append("file", file);
  try {
    const result = await api.post<any, any>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
    form.imageUrl = result.url;
    ElMessage.success("图片已上传");
  } catch (error: any) {
    ElMessage.error(error.message || "上传图片失败");
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
  if (value.startsWith("/")) return true;
  if (platform === "mp-weixin") return false;
  return value.startsWith("https://") || value.startsWith("http://");
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
      <h2>营销弹窗</h2>
      <div class="toolbar-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 220px" @change="load">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="搜索标题/内容" style="width: 180px" @keyup.enter="load" />
        <el-select v-model="filters.enabled" clearable placeholder="全部状态" style="width: 120px" @change="load">
          <el-option label="启用" value="true" />
          <el-option label="停用" value="false" />
        </el-select>
        <el-select v-model="filters.platform" clearable placeholder="投放平台" style="width: 140px" @change="load">
          <el-option v-for="item in platformOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.placement" clearable placeholder="投放页面" style="width: 140px" @change="load">
          <el-option v-for="item in placementOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button :icon="View" @click="openEffectiveCheck()">生效检测</el-button>
        <el-button type="primary" :icon="Plus" @click="create">新增弹窗</el-button>
        <el-button :icon="Refresh" @click="load">刷新</el-button>
      </div>
    </div>

    <el-alert class="scope-alert" type="info" show-icon :closable="false" title="营销弹窗用于广告、重要通知、支付提醒等投放。H5 保存后立即生效，小程序端需发布包含弹窗组件的新版本后读取线上配置。" />

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
        <el-table-column label="操作" width="290" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="View" @click="openEffectiveCheck(row)">检测</el-button>
            <el-button size="small" :icon="Edit" @click="edit(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" :icon="Switch" @click="quickToggle(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
            <el-button size="small" type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="drawer" :title="drawerTitle" size="980px">
      <div class="popup-editor">
        <el-form label-position="top" class="popup-form">
          <el-form-item v-if="isPlatformAdmin()" label="弹窗归属">
            <el-select v-model="form.tenantId" clearable filterable placeholder="平台全局 / 未归属">
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
          <el-form-item label="标题"><el-input v-model="form.title" maxlength="120" show-word-limit /></el-form-item>
          <el-form-item label="副标题"><el-input v-model="form.subtitle" maxlength="160" show-word-limit /></el-form-item>
          <el-form-item label="重点文案"><el-input v-model="form.emphasis" maxlength="180" show-word-limit placeholder="例如：要关 WiFi、关蓝牙、关定位" /></el-form-item>
          <el-form-item label="正文"><el-input v-model="form.content" type="textarea" :rows="4" maxlength="1000" show-word-limit /></el-form-item>
          <el-form-item label="顶部图片">
            <div class="upload-line">
              <el-input v-model="form.imageUrl" placeholder="https:// 或 /uploads 图片地址" />
              <el-upload :show-file-list="false" :before-upload="uploadImage">
                <el-button :icon="Upload">上传</el-button>
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
        <el-button @click="drawer = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存弹窗</el-button>
      </template>
    </el-drawer>

    <el-dialog v-model="checkDialog" title="营销弹窗生效检测" width="860px">
      <div class="check-panel">
        <div class="check-form">
          <el-select v-if="isPlatformAdmin()" v-model="checkForm.tenantId" clearable filterable placeholder="平台全局 / 选择商家">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
          </el-select>
          <el-select v-model="checkForm.pageKey" placeholder="检测页面">
            <el-option v-for="item in placementOptions.filter((item) => item.value !== 'all')" :key="item.value" :label="item.label" :value="item.value" />
            <el-option label="商城商品详情" value="mall_product_detail" />
          </el-select>
          <el-select v-model="checkForm.platform" placeholder="检测平台">
            <el-option label="H5" value="h5" />
            <el-option label="微信小程序" value="mp-weixin" />
          </el-select>
          <el-button type="primary" :loading="checkLoading" @click="runEffectiveCheck">开始检测</el-button>
          <el-button @click="openFrontendPreview">前台预览</el-button>
          <el-button @click="clearPopupFrequencyCache">清频次缓存</el-button>
        </div>

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
@media (max-width: 1100px) {
  .popup-editor { grid-template-columns: 1fr; }
  .preview-phone { width: 100%; max-width: 360px; }
}
</style>
