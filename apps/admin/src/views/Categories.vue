<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, Plus, Refresh, Switch, UploadFilled } from "@element-plus/icons-vue";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";

const rows = ref<any[]>([]);
const loading = ref(false);
const dialog = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ name: "", iconUrl: "", coverUrl: "", publicVisible: true, scene: "activity", sortOrder: 0, enabled: true });

const roleHint = isPlatformAdmin()
  ? "平台超管维护平台自营/全局分类，默认会展示在平台 H5 分类区。商家自己的分类由商家账号在商家端维护。"
  : "商家账号维护本商家的活动分类，只影响本商家活动发布和商家 H5 分类展示。";

const uploadHeaders = () => {
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function load() {
  loading.value = true;
  try {
    rows.value = await api.get<any, any[]>("/admin/categories");
  } catch (error: any) {
    ElMessage.error(error.message || "加载分类失败");
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: "", iconUrl: "", coverUrl: "", publicVisible: true, scene: "activity", sortOrder: 0, enabled: true });
  dialog.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name || "",
    iconUrl: row.iconUrl || "",
    coverUrl: row.coverUrl || "",
    publicVisible: row.publicVisible !== false,
    scene: row.scene || "activity",
    sortOrder: Number(row.sortOrder || 0),
    enabled: Boolean(row.enabled)
  });
  dialog.value = true;
}

async function submit() {
  if (!form.name.trim()) return ElMessage.warning("请填写分类名称");
  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      iconUrl: form.iconUrl.trim() || undefined,
      coverUrl: form.coverUrl.trim() || undefined,
      publicVisible: form.publicVisible,
      scene: form.scene || "activity",
      sortOrder: Number(form.sortOrder || 0),
      enabled: form.enabled
    };
    if (editingId.value) await api.patch(`/admin/categories/${editingId.value}`, payload);
    else await api.post("/admin/categories", payload);
    ElMessage.success("分类已保存");
    dialog.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存分类失败");
  } finally {
    saving.value = false;
  }
}

async function toggle(row: any) {
  if (row.enabled) {
    await ElMessageBox.confirm(`确认停用分类「${row.name}」？已关联的历史活动不会被删除。`, "停用分类", {
      type: "warning",
      confirmButtonText: "确认停用",
      cancelButtonText: "取消"
    });
  }
  try {
    if (row.enabled) await api.post(`/admin/categories/${row.id}/disable`, {});
    else await api.patch(`/admin/categories/${row.id}`, { name: row.name, iconUrl: row.iconUrl || undefined, coverUrl: row.coverUrl || undefined, publicVisible: row.publicVisible !== false, scene: row.scene || "activity", sortOrder: row.sortOrder, enabled: true });
    ElMessage.success(!row.enabled ? "分类已启用" : "分类已停用");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "更新分类失败");
  }
}

function beforeImageUpload(file: File) {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    ElMessage.error("请上传 JPG、PNG、WebP 或 GIF 图片");
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error("图片不能超过 5MB");
    return false;
  }
  return true;
}

function handleUploadSuccess(field: "iconUrl" | "coverUrl") {
  return (response: any) => {
    const data = response?.data || response;
    if (!data?.url) return ElMessage.error("上传成功但未返回图片地址");
    form[field] = data.url;
    ElMessage.success(field === "iconUrl" ? "图标已上传" : "封面已上传");
  };
}

function handleUploadError(error: Error) {
  ElMessage.error(error.message || "图片上传失败");
}
onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>分类管理</h2>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增分类</el-button>
      </div>
    </div>
    <el-alert class="role-hint" type="info" :closable="false" show-icon :title="roleHint" />
    <div class="table-card">
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无分类">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="图标" width="90">
          <template #default="{ row }">
            <img v-if="row.iconUrl" class="category-icon" :src="row.iconUrl" alt="分类图标" />
            <span v-else class="muted">未设</span>
          </template>
        </el-table-column>
        <el-table-column label="封面" width="120">
          <template #default="{ row }">
            <img v-if="row.coverUrl" class="category-cover" :src="row.coverUrl" alt="分类封面" />
            <span v-else class="muted">未设</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="scene" label="场景" width="110" />
        <el-table-column label="前台展示" width="110"><template #default="{ row }"><el-tag :type="row.publicVisible !== false ? 'success' : 'info'">{{ row.publicVisible !== false ? '展示' : '隐藏' }}</el-tag></template></el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="100" />
        <el-table-column prop="enabled" label="启用" width="100"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '是' : '否' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" :icon="Switch" @click="toggle(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialog" width="620px" :title="editingId ? '编辑分类' : '新增分类'" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="名称" required><el-input v-model="form.name" maxlength="60" /></el-form-item>
        <el-form-item label="图标">
          <div class="image-field">
            <el-input v-model="form.iconUrl" placeholder="可填写图片 URL，也可上传" maxlength="500" />
            <el-upload action="/api/admin/uploads/images" name="file" :headers="uploadHeaders()" :show-file-list="false" :before-upload="beforeImageUpload" :on-success="handleUploadSuccess('iconUrl')" :on-error="handleUploadError">
              <el-button :icon="UploadFilled">上传图标</el-button>
            </el-upload>
            <img v-if="form.iconUrl" class="preview-icon" :src="form.iconUrl" alt="图标预览" />
          </div>
        </el-form-item>
        <el-form-item label="封面">
          <div class="image-field">
            <el-input v-model="form.coverUrl" placeholder="可填写图片 URL，也可上传" maxlength="500" />
            <el-upload action="/api/admin/uploads/images" name="file" :headers="uploadHeaders()" :show-file-list="false" :before-upload="beforeImageUpload" :on-success="handleUploadSuccess('coverUrl')" :on-error="handleUploadError">
              <el-button :icon="UploadFilled">上传封面</el-button>
            </el-upload>
            <img v-if="form.coverUrl" class="preview-cover" :src="form.coverUrl" alt="封面预览" />
          </div>
        </el-form-item>
        <el-form-item label="适用场景"><el-input v-model="form.scene" maxlength="40" placeholder="默认 activity" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.enabled">启用分类</el-checkbox>
          <el-checkbox v-model="form.publicVisible">前台展示</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.role-hint { margin-bottom: 14px; border-radius: 8px; }
.category-icon { width: 36px; height: 36px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; background: #f8fafc; }
.category-cover { width: 72px; height: 42px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; background: #f8fafc; }
.muted { color: #94a3b8; font-size: 13px; }
.image-field { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; }
.preview-icon { grid-column: 1 / -1; width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; background: #f8fafc; }
.preview-cover { grid-column: 1 / -1; width: 220px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; background: #f8fafc; }
</style>


