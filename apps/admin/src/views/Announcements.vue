<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { CopyDocument, Delete, Edit, Picture, Plus, Refresh, Star, Switch, Upload, View } from "@element-plus/icons-vue";
import { api } from "../api";
import { hasPermission, isPlatformAdmin } from "../permissions";
import { markdownToRichTextHtml } from "@activity/shared";

type AnnouncementListResponse = { items: any[]; total: number; page: number; pageSize: number };
type AnnouncementOptions = { tenants: any[]; memberLevels: any[]; types: Array<{ value: string; label: string }> };

const rows = ref<any[]>([]);
const tenants = ref<any[]>([]);
const memberLevels = ref<any[]>([]);
const announcementTypes = ref<Array<{ value: string; label: string }>>([
  { value: "notice", label: "通知" }, { value: "guide", label: "提醒" }, { value: "activity", label: "活动" }, { value: "operation", label: "运营" }
]);
const loading = ref(false);
const drawer = ref(false);
const saving = ref(false);
const uploading = ref(false);
const actionKey = ref("");
const listErrorMessage = ref("");
const optionErrorMessage = ref("");
const editingId = ref<number | null>(null);
const contentInput = ref<any>();
const form = reactive({ tenantId: undefined as number | undefined, title: "", content: "", type: "notice", enabled: true, pinned: false, publishAt: "", endAt: "", audienceMode: "all", memberLevelIds: [] as number[] });
type AnnouncementTarget = { id: number | null; tenantId: number | null; scopeKey: string; listSequence: number };
const formTarget = ref<AnnouncementTarget | null>(null);
let listLoadSequence = 0;
let optionLoadSequence = 0;
const formMemberLevels = computed(() => !isPlatformAdmin()
  ? memberLevels.value
  : memberLevels.value.filter((level) => form.tenantId ? Number(level.tenantId || 0) === Number(form.tenantId) : !level.tenantId));
watch(() => form.tenantId, () => {
  const allowed = new Set(formMemberLevels.value.map((level) => Number(level.id)));
  form.memberLevelIds = form.memberLevelIds.filter((id) => allowed.has(Number(id)));
});
const filters = reactive({ tenantId: undefined as number | undefined, keyword: "", type: "", enabled: "" });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });
const pageTitle = computed(() => (canWrite.value ? "公告管理" : "公告中心"));
const drawerTitle = computed(() => (editingId.value ? "编辑公告" : "新增公告"));
const canWrite = computed(() => hasPermission("announcement.manage"));
const canUpload = computed(() => hasPermission("upload.image"));
const contentPreview = computed(() => markdownToRichTextHtml(form.content));
const writeLocked = computed(() => saving.value || uploading.value || Boolean(actionKey.value));
const scopeLocked = computed(() => writeLocked.value || drawer.value);

function announcementScopeKey() {
  return JSON.stringify({ ...filters, page: pagination.page, pageSize: pagination.pageSize });
}

function captureAnnouncementTarget(row?: any): AnnouncementTarget {
  return {
    id: row?.id ? Number(row.id) : null,
    tenantId: Number(row?.tenant?.id || form.tenantId || 0) || null,
    scopeKey: announcementScopeKey(),
    listSequence: listLoadSequence
  };
}

function assertAnnouncementTarget(target: AnnouncementTarget) {
  if (target.scopeKey !== announcementScopeKey() || target.listSequence !== listLoadSequence) {
    throw new Error("公告列表或筛选范围已变化，请刷新后重新操作");
  }
  if (target.id === null) return undefined;
  const current = rows.value.find((item) => Number(item.id) === target.id);
  const currentTenantId = Number(current?.tenant?.id || 0) || null;
  if (!current || currentTenantId !== target.tenantId) throw new Error("目标公告已不在当前列表，请刷新后重新操作");
  return current;
}

async function load() {
  const sequence = ++listLoadSequence;
  const scopeKey = announcementScopeKey();
  loading.value = true;
  listErrorMessage.value = "";
  rows.value = [];
  pagination.total = 0;
  try {
    const scope = { tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined };
    const params = new URLSearchParams();
    if (scope.tenantId) params.set("tenantId", String(scope.tenantId));
    if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
    if (filters.type) params.set("type", filters.type);
    if (filters.enabled) params.set("enabled", filters.enabled);
    params.set("page", String(pagination.page));
    params.set("pageSize", String(pagination.pageSize));
    const result = await api.get<any, AnnouncementListResponse>("/admin/announcements", { params });
    if (sequence !== listLoadSequence || scopeKey !== announcementScopeKey()) return;
    rows.value = Array.isArray(result?.items) ? result.items : [];
    pagination.total = Number(result.total || 0);
  } catch (error: any) {
    if (sequence !== listLoadSequence || scopeKey !== announcementScopeKey()) return;
    rows.value = [];
    pagination.total = 0;
    listErrorMessage.value = error.message || "加载公告失败";
  } finally {
    if (sequence === listLoadSequence) loading.value = false;
  }
}

async function loadOptions() {
  const sequence = ++optionLoadSequence;
  optionErrorMessage.value = "";
  tenants.value = [];
  memberLevels.value = [];
  try {
    const result = await api.get<any, AnnouncementOptions>("/admin/announcements/options");
    if (sequence !== optionLoadSequence) return;
    tenants.value = Array.isArray(result?.tenants) ? result.tenants : [];
    memberLevels.value = Array.isArray(result?.memberLevels) ? result.memberLevels : [];
    if (result.types?.length) announcementTypes.value = result.types;
  } catch (error: any) {
    if (sequence !== optionLoadSequence) return;
    tenants.value = [];
    memberLevels.value = [];
    optionErrorMessage.value = error.message || "公告归属和会员等级加载失败";
  }
}

function applyFilters() {
  pagination.page = 1;
  void load();
}

function resetFilters() {
  Object.assign(filters, { tenantId: undefined, keyword: "", type: "", enabled: "" });
  applyFilters();
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

function create() {
  if (!canWrite.value) return;
  editingId.value = null;
  formTarget.value = null;
  Object.assign(form, { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, title: "", content: "", type: "notice", enabled: true, pinned: false, publishAt: "", endAt: "", audienceMode: "all", memberLevelIds: [] });
  drawer.value = true;
}

function edit(row: any) {
  if (!canWrite.value) return;
  editingId.value = row.id;
  formTarget.value = captureAnnouncementTarget(row);
  Object.assign(form, { tenantId: row.tenant?.id || undefined, title: row.title || "", content: row.content || "", type: row.type || "notice", enabled: Boolean(row.enabled), pinned: Boolean(row.pinned), publishAt: row.publishAt ? String(row.publishAt).slice(0, 19).replace("T", " ") : "", endAt: row.endAt ? String(row.endAt).slice(0, 19).replace("T", " ") : "", audienceMode: row.audience?.mode || "all", memberLevelIds: Array.isArray(row.audience?.memberLevelIds) ? row.audience.memberLevelIds : [] });
  drawer.value = true;
}

async function submit() {
  if (!canWrite.value) return;
  if (saving.value || actionKey.value || uploading.value) return;
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning("请填写标题和内容");
    return;
  }
  if (form.publishAt && form.endAt && form.publishAt >= form.endAt) return ElMessage.warning("失效时间必须晚于发布时间");
  if (form.audienceMode === "member_levels" && !form.memberLevelIds.length) return ElMessage.warning("请选择至少一个可见会员等级");
  let target: AnnouncementTarget;
  try {
    target = formTarget.value || captureAnnouncementTarget();
    assertAnnouncementTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "公告列表或筛选范围已变化，请刷新后重新操作");
  }
  const { audienceMode, memberLevelIds, ...baseForm } = form;
  const payload = {
    ...baseForm,
    tenantId: isPlatformAdmin() ? target.tenantId : undefined,
    title: form.title.trim(),
    content: form.content.trim(),
    type: form.type.trim() || "notice",
    publishAt: form.publishAt || null,
    endAt: form.endAt || null,
    audience: { mode: audienceMode, memberLevelIds: audienceMode === "member_levels" ? memberLevelIds : [] }
  };
  saving.value = true;
  try {
    assertAnnouncementTarget(target);
    if (target.id) await api.patch(`/admin/announcements/${target.id}`, payload);
    else await api.post("/admin/announcements", payload);
    ElMessage.success("公告已保存");
    drawer.value = false;
    formTarget.value = null;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存公告失败");
  } finally {
    saving.value = false;
  }
}

function insertMarkdown(prefix: string, suffix = "", placeholder = "") {
  const textarea = contentInput.value?.textarea || contentInput.value?.$el?.querySelector?.("textarea");
  if (!textarea) {
    form.content = `${form.content}${form.content ? "\n" : ""}${prefix}${placeholder}${suffix}`;
    return;
  }
  const start = textarea.selectionStart ?? form.content.length;
  const end = textarea.selectionEnd ?? start;
  const selected = form.content.slice(start, end) || placeholder;
  form.content = `${form.content.slice(0, start)}${prefix}${selected}${suffix}${form.content.slice(end)}`;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
  });
}

function insertBlock(block: string) {
  const text = form.content.trimEnd();
  form.content = `${text}${text ? "\n\n" : ""}${block}`;
}

function insertCodeBlock() {
  insertBlock('```js\nconsole.log("hello")\n```');
}

async function insertLink() {
  if (actionKey.value) return;
  actionKey.value = "insert-link";
  try {
    const { value } = await ElMessageBox.prompt("请输入链接地址", "插入链接", {
      inputValue: "https://",
      confirmButtonText: "插入",
      cancelButtonText: "取消",
      inputValidator: (input) => isSafeContentUrl(String(input || "")) || "只允许 HTTP(S) 或站内 / 路径"
    });
    if (value) insertMarkdown("[", `](${String(value).trim()})`, "链接文字");
  } catch (error: any) {
    if (!isDialogCancel(error)) ElMessage.error(error.message || "插入链接失败");
  } finally {
    actionKey.value = "";
  }
}

async function insertImageUrl() {
  if (actionKey.value) return;
  actionKey.value = "insert-image";
  try {
    const { value } = await ElMessageBox.prompt("请输入图片地址", "插入图片", {
      inputValue: "https://",
      confirmButtonText: "插入",
      cancelButtonText: "取消",
      inputValidator: (input) => isSafeContentUrl(String(input || "")) || "只允许 HTTP(S) 或站内 / 路径"
    });
    if (value) insertBlock(`![图片说明](${String(value).trim()})`);
  } catch (error: any) {
    if (!isDialogCancel(error)) ElMessage.error(error.message || "插入图片失败");
  } finally {
    actionKey.value = "";
  }
}

async function uploadContentImage(file: File) {
  if (!canUpload.value || uploading.value || saving.value) return false;
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
    insertBlock(`![图片](${result.url})`);
    ElMessage.success("图片已插入");
  } catch (error: any) {
    ElMessage.error(error.message || "上传图片失败");
  } finally {
    uploading.value = false;
  }
  return false;
}

async function quickUpdate(row: any, patch: Partial<typeof form>) {
  if (!canWrite.value || actionKey.value || saving.value) return;
  let target: AnnouncementTarget;
  try {
    target = captureAnnouncementTarget(row);
    assertAnnouncementTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "公告列表或筛选范围已变化，请刷新后重新操作");
  }
  const payload = {
    tenantId: isPlatformAdmin() ? target.tenantId : undefined,
    title: row.title,
    content: row.content,
    type: row.type,
    enabled: row.enabled,
    pinned: row.pinned,
    publishAt: row.publishAt || null,
    endAt: row.endAt || null,
    audience: row.audience || { mode: "all", memberLevelIds: [] },
    ...patch
  };
  actionKey.value = `update:${row.id}`;
  try {
    assertAnnouncementTarget(target);
    await api.patch(`/admin/announcements/${row.id}`, payload);
    ElMessage.success("公告已更新");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "更新公告失败");
  } finally {
    actionKey.value = "";
  }
}

async function remove(row: any) {
  if (!canWrite.value || actionKey.value || saving.value) return;
  let target: AnnouncementTarget;
  try {
    target = captureAnnouncementTarget(row);
    assertAnnouncementTarget(target);
  } catch (error: any) {
    return ElMessage.error(error.message || "公告列表或筛选范围已变化，请刷新后重新操作");
  }
  actionKey.value = `delete:${row.id}`;
  try {
    await ElMessageBox.confirm(`确认删除公告「${row.title}」？删除后 H5 将不再展示。`, "删除公告", {
      type: "warning",
      confirmButtonText: "确认删除",
      cancelButtonText: "取消"
    });
    assertAnnouncementTarget(target);
    await api.delete(`/admin/announcements/${row.id}`);
    ElMessage.success("公告已删除");
    await load();
  } catch (error: any) {
    if (isDialogCancel(error)) return;
    ElMessage.error(error.message || "删除公告失败");
  } finally {
    actionKey.value = "";
  }
}

function isDialogCancel(error: any) {
  return error === "cancel" || error === "close" || error?.message === "cancel" || error?.message === "close";
}

function isSafeContentUrl(value: string) {
  const text = value.trim();
  return /^https?:\/\//i.test(text) || (text.startsWith("/") && !text.startsWith("//"));
}

function tenantDisplayName(row: any) {
  return row.tenant?.name || row.tenant?.code || "平台/未归属";
}

function audienceLabel(row: any) {
  const labels: Record<string, string> = { all: "全部用户", guest: "游客", authenticated: "已登录会员", member_levels: "指定等级" };
  return labels[String(row.audience?.mode || "all")] || "全部用户";
}

function announcementTypeLabel(type: string) {
  return announcementTypes.value.find((item) => item.value === type)?.label || type || "通知";
}

onMounted(async () => {
  await loadOptions();
  await load();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>{{ pageTitle }}</h2>
      <div class="toolbar-actions">
        <el-button type="primary" :icon="Plus" :disabled="scopeLocked" @click="create" v-if="canWrite">新增公告</el-button>
        <el-button :icon="Refresh" :loading="loading" :disabled="scopeLocked" @click="load">刷新</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-input v-model="filters.keyword" clearable placeholder="搜索标题或内容" :disabled="scopeLocked" @keyup.enter="applyFilters" @clear="applyFilters" />
      <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" :disabled="scopeLocked" @change="applyFilters">
        <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
      </el-select>
      <el-select v-model="filters.type" clearable placeholder="全部类型" :disabled="scopeLocked" @change="applyFilters">
        <el-option v-for="item in announcementTypes" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.enabled" clearable placeholder="全部状态" :disabled="scopeLocked" @change="applyFilters">
        <el-option label="已启用" value="true" /><el-option label="已停用" value="false" />
      </el-select>
      <el-button type="primary" :disabled="scopeLocked" @click="applyFilters">查询</el-button>
      <el-button :disabled="scopeLocked" @click="resetFilters">重置</el-button>
    </div>

    <el-alert v-if="isPlatformAdmin()" class="scope-alert" type="info" show-icon :closable="false" title="平台超级管理员可管理平台全局公告和所有商家公告；新增前请先确认公告归属。" />
    <el-alert v-if="!canWrite" class="scope-alert" type="info" show-icon :closable="false" title="当前账号为只读权限，可查看和筛选公告，不能新增、编辑、启停、置顶或删除。" />
    <el-alert v-if="optionErrorMessage" class="scope-alert" type="error" show-icon :closable="false" :title="optionErrorMessage">
      <template #default><el-button size="small" @click="loadOptions">重试公告选项</el-button></template>
    </el-alert>
    <el-alert v-if="listErrorMessage" class="scope-alert" type="error" show-icon :closable="false" :title="listErrorMessage">
      <template #default><el-button size="small" :loading="loading" @click="load">重试公告列表</el-button></template>
    </el-alert>

    <div class="table-card">
      <div class="table-scroll">
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无公告" style="min-width: 1240px">
        <el-table-column v-if="isPlatformAdmin()" label="所属商家" width="190" show-overflow-tooltip><template #default="{ row }">{{ tenantDisplayName(row) }}</template></el-table-column>
        <el-table-column prop="title" label="标题" min-width="220" />
        <el-table-column prop="content" label="内容" min-width="320" show-overflow-tooltip />
        <el-table-column label="类型" width="110"><template #default="{ row }">{{ announcementTypeLabel(row.type) }}</template></el-table-column>
        <el-table-column label="受众" width="120"><template #default="{ row }">{{ audienceLabel(row) }}</template></el-table-column>
        <el-table-column label="有效期" width="210"><template #default="{ row }">{{ row.publishAt ? String(row.publishAt).slice(0, 16).replace("T", " ") : "立即" }} 至 {{ row.endAt ? String(row.endAt).slice(0, 16).replace("T", " ") : "长期" }}</template></el-table-column>
        <el-table-column label="置顶" width="90">
          <template #default="{ row }"><el-tag :type="row.pinned ? 'success' : 'info'">{{ row.pinned ? "是" : "否" }}</el-tag></template>
        </el-table-column>
        <el-table-column label="启用" width="90">
          <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "是" : "否" }}</el-tag></template>
        </el-table-column>
        <el-table-column v-if="canWrite" label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" :disabled="writeLocked || loading" @click="edit(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" :icon="Switch" :loading="actionKey === `update:${row.id}`" :disabled="Boolean(actionKey) || saving" @click="quickUpdate(row, { enabled: !row.enabled })">{{ row.enabled ? "停用" : "启用" }}</el-button>
            <el-button size="small" :icon="Star" :loading="actionKey === `update:${row.id}`" :disabled="Boolean(actionKey) || saving" @click="quickUpdate(row, { pinned: !row.pinned })">{{ row.pinned ? "取消置顶" : "置顶" }}</el-button>
            <el-button size="small" type="danger" :icon="Delete" :loading="actionKey === `delete:${row.id}`" :disabled="Boolean(actionKey) || saving" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>
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

    <el-drawer v-model="drawer" :title="drawerTitle" size="min(860px, 100vw)">
      <el-form label-position="top" :disabled="writeLocked">
        <el-form-item v-if="isPlatformAdmin()" label="公告归属">
          <el-select v-model="form.tenantId" clearable filterable placeholder="平台全局 / 未归属" :disabled="Boolean(editingId)">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题"><el-input v-model="form.title" maxlength="120" show-word-limit /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type">
            <el-option v-for="item in announcementTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="发布时间"><el-date-picker v-model="form.publishAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="保存后立即生效" /></el-form-item>
          <el-form-item label="失效时间"><el-date-picker v-model="form.endAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="长期有效" /></el-form-item>
        </div>
        <el-form-item label="展示人群">
          <el-select v-model="form.audienceMode">
            <el-option label="全部用户" value="all" /><el-option label="仅游客" value="guest" /><el-option label="仅已登录会员" value="authenticated" /><el-option label="指定会员等级" value="member_levels" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.audienceMode === 'member_levels'" label="会员等级">
          <el-select v-model="form.memberLevelIds" multiple filterable placeholder="请选择可见等级"><el-option v-for="level in formMemberLevels" :key="level.id" :label="level.name" :value="level.id" /></el-select>
        </el-form-item>
        <el-form-item label="内容">
          <div class="rich-editor">
            <div class="rich-toolbar">
              <el-button size="small" :icon="Plus" @click="insertMarkdown('## ', '', '小标题')">标题</el-button>
              <el-button size="small" :icon="Star" @click="insertMarkdown('**', '**', '重点内容')">加粗</el-button>
              <el-button size="small" :icon="CopyDocument" @click="insertMarkdown('> ', '', '引用内容')">引用</el-button>
              <el-button size="small" @click="insertMarkdown('- ', '', '列表项')">列表</el-button>
              <el-button size="small" :icon="CopyDocument" @click="insertCodeBlock">代码块</el-button>
              <el-button size="small" @click="insertMarkdown('`', '`', 'code')">行内代码</el-button>
              <el-button size="small" :icon="View" :loading="actionKey === 'insert-link'" :disabled="Boolean(actionKey) || uploading" @click="insertLink">链接</el-button>
              <el-button size="small" :icon="Picture" :loading="actionKey === 'insert-image'" :disabled="Boolean(actionKey) || uploading" @click="insertImageUrl">图片URL</el-button>
              <el-upload v-if="canUpload" :show-file-list="false" :disabled="uploading || saving" :before-upload="uploadContentImage">
                <el-button size="small" :icon="Upload" :loading="uploading" :disabled="uploading || saving">上传图片</el-button>
              </el-upload>
            </div>
            <div class="rich-workbench">
              <el-input ref="contentInput" v-model="form.content" class="rich-textarea" type="textarea" :rows="14" maxlength="50000" show-word-limit resize="vertical" />
              <div class="rich-preview">
                <div class="preview-head">预览</div>
                <div v-if="form.content.trim()" class="preview-body" v-html="contentPreview"></div>
                <el-empty v-else description="暂无内容" :image-size="72" />
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.pinned">首页置顶</el-checkbox>
          <el-checkbox v-model="form.enabled">启用</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="writeLocked" @click="drawer = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="uploading || Boolean(actionKey)" @click="submit">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.filter-bar { display: grid; grid-template-columns: minmax(220px, 1fr) repeat(3, minmax(150px, 220px)) auto auto; gap: 10px; align-items: center; margin-bottom: 16px; }
.scope-alert { margin-bottom: 16px; }
.table-scroll { width: 100%; overflow-x: auto; }
.pagination { display: flex; justify-content: flex-end; padding-top: 16px; overflow-x: auto; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.rich-editor { width: 100%; display: grid; gap: 10px; }
.rich-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8fafc; }
.rich-workbench { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 0.9fr); gap: 12px; align-items: stretch; }
.rich-textarea { min-width: 0; }
.rich-preview { min-height: 322px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; }
.preview-head { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; color: #667085; font-size: 13px; font-weight: 800; }
.preview-body { padding: 14px; }
@media (max-width: 1100px) { .filter-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 900px) {
  .toolbar { align-items: flex-start; flex-direction: column; }
  .toolbar-actions { width: 100%; flex-wrap: wrap; }
  .filter-bar, .rich-workbench, .form-grid { grid-template-columns: 1fr; }
  .filter-bar :deep(.el-button) { width: 100%; margin-left: 0; }
  .pagination { justify-content: flex-start; }
}
</style>
