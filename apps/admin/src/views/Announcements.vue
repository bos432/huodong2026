<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { CopyDocument, Delete, Edit, Picture, Plus, Refresh, Star, Switch, Upload, View } from "@element-plus/icons-vue";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";
import { markdownToRichTextHtml } from "@activity/shared";

const rows = ref<any[]>([]);
const tenants = ref<any[]>([]);
const loading = ref(false);
const drawer = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const contentInput = ref<any>();
const form = reactive({ tenantId: undefined as number | undefined, title: "", content: "", type: "notice", enabled: true, pinned: false });
const filters = reactive({ tenantId: undefined as number | undefined });
const pageTitle = computed(() => "公告管理");
const drawerTitle = computed(() => (editingId.value ? "编辑公告" : "新增公告"));
const canWrite = computed(() => true);
const contentPreview = computed(() => markdownToRichTextHtml(form.content));

async function load() {
  loading.value = true;
  try {
    const scope = { tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined };
    const params = new URLSearchParams();
    if (scope.tenantId) params.set("tenantId", String(filters.tenantId));
    rows.value = await api.get<any, any[]>("/admin/announcements", { params });
  } catch (error: any) {
    ElMessage.error(error.message || "加载公告失败");
  } finally {
    loading.value = false;
  }
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}

function create() {
  if (!canWrite.value) return;
  editingId.value = null;
  Object.assign(form, { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, title: "", content: "", type: "notice", enabled: true, pinned: false });
  drawer.value = true;
}

function edit(row: any) {
  if (!canWrite.value) return;
  editingId.value = row.id;
  Object.assign(form, { tenantId: row.tenant?.id || undefined, title: row.title || "", content: row.content || "", type: row.type || "notice", enabled: Boolean(row.enabled), pinned: Boolean(row.pinned) });
  drawer.value = true;
}

async function submit() {
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning("请填写标题和内容");
    return;
  }
  saving.value = true;
  try {
    const payload = {
      ...form,
      tenantId: isPlatformAdmin() ? form.tenantId || null : undefined,
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type.trim() || "notice"
    };
    if (editingId.value) await api.patch(`/admin/announcements/${editingId.value}`, payload);
    else await api.post("/admin/announcements", payload);
    ElMessage.success("公告已保存");
    drawer.value = false;
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
  const { value } = await ElMessageBox.prompt("请输入链接地址", "插入链接", {
    inputValue: "https://",
    confirmButtonText: "插入",
    cancelButtonText: "取消"
  });
  if (!value) return;
  insertMarkdown("[", `](${value})`, "链接文字");
}

async function insertImageUrl() {
  const { value } = await ElMessageBox.prompt("请输入图片地址", "插入图片", {
    inputValue: "https://",
    confirmButtonText: "插入",
    cancelButtonText: "取消"
  });
  if (!value) return;
  insertBlock(`![图片说明](${value})`);
}

async function uploadContentImage(file: File) {
  const data = new FormData();
  data.append("file", file);
  try {
    const result = await api.post<any, any>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
    insertBlock(`![图片](${result.url})`);
    ElMessage.success("图片已插入");
  } catch (error: any) {
    ElMessage.error(error.message || "上传图片失败");
  }
  return false;
}

async function quickUpdate(row: any, patch: Partial<typeof form>) {
  if (!canWrite.value) return;
  try {
    await api.patch(`/admin/announcements/${row.id}`, {
      tenantId: isPlatformAdmin() ? row.tenant?.id || null : undefined,
      title: row.title,
      content: row.content,
      type: row.type,
      enabled: row.enabled,
      pinned: row.pinned,
      ...patch
    });
    ElMessage.success("公告已更新");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "更新公告失败");
  }
}

async function remove(row: any) {
  if (!canWrite.value) return;
  await ElMessageBox.confirm(`确认删除公告「${row.title}」？删除后 H5 将不再展示。`, "删除公告", {
    type: "warning",
    confirmButtonText: "确认删除",
    cancelButtonText: "取消"
  });
  try {
    await api.delete(`/admin/announcements/${row.id}`);
    ElMessage.success("公告已删除");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "删除公告失败");
  }
}

function tenantDisplayName(row: any) {
  return row.tenant?.name || row.tenant?.code || "平台/未归属";
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
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 220px" @change="load">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
        </el-select>
        <el-button type="primary" :icon="Plus" @click="create" v-if="canWrite">新增公告</el-button>
        <el-button :icon="Refresh" @click="load">刷新</el-button>
      </div>
    </div>

    <el-alert v-if="isPlatformAdmin()" class="scope-alert" type="info" show-icon :closable="false" title="平台超级管理员可管理平台全局公告和所有商家公告；新增前请先确认公告归属。" />

    <div class="table-card">
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无公告">
        <el-table-column v-if="isPlatformAdmin()" label="所属商家" width="190" show-overflow-tooltip><template #default="{ row }">{{ tenantDisplayName(row) }}</template></el-table-column>
        <el-table-column prop="title" label="标题" min-width="220" />
        <el-table-column prop="content" label="内容" min-width="320" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="110" />
        <el-table-column label="置顶" width="90">
          <template #default="{ row }"><el-tag :type="row.pinned ? 'success' : 'info'">{{ row.pinned ? "是" : "否" }}</el-tag></template>
        </el-table-column>
        <el-table-column label="启用" width="90">
          <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "是" : "否" }}</el-tag></template>
        </el-table-column>
        <el-table-column v-if="canWrite" label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="edit(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" :icon="Switch" @click="quickUpdate(row, { enabled: !row.enabled })">{{ row.enabled ? "停用" : "启用" }}</el-button>
            <el-button size="small" :icon="Star" @click="quickUpdate(row, { pinned: !row.pinned })">{{ row.pinned ? "取消置顶" : "置顶" }}</el-button>
            <el-button size="small" type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="drawer" :title="drawerTitle" size="860px">
      <el-form label-position="top">
        <el-form-item v-if="isPlatformAdmin()" label="公告归属">
          <el-select v-model="form.tenantId" clearable filterable placeholder="平台全局 / 未归属">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type">
            <el-option label="通知" value="notice" />
            <el-option label="提醒" value="guide" />
            <el-option label="活动" value="activity" />
          </el-select>
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
              <el-button size="small" :icon="View" @click="insertLink">链接</el-button>
              <el-button size="small" :icon="Picture" @click="insertImageUrl">图片URL</el-button>
              <el-upload :show-file-list="false" :before-upload="uploadContentImage">
                <el-button size="small" :icon="Upload">上传图片</el-button>
              </el-upload>
            </div>
            <div class="rich-workbench">
              <el-input ref="contentInput" v-model="form.content" class="rich-textarea" type="textarea" :rows="14" resize="vertical" />
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
        <el-button @click="drawer = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.scope-alert { margin-bottom: 16px; }
.rich-editor { width: 100%; display: grid; gap: 10px; }
.rich-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8fafc; }
.rich-workbench { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 0.9fr); gap: 12px; align-items: stretch; }
.rich-textarea { min-width: 0; }
.rich-preview { min-height: 322px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; }
.preview-head { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; color: #667085; font-size: 13px; font-weight: 800; }
.preview-body { padding: 14px; }
@media (max-width: 900px) { .rich-workbench { grid-template-columns: 1fr; } }
</style>
