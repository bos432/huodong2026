<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, Plus, Refresh, Switch } from "@element-plus/icons-vue";
import { api } from "../api";

const rows = ref<any[]>([]);
const loading = ref(false);
const dialog = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ name: "", sortOrder: 0, enabled: true });

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
  Object.assign(form, { name: "", sortOrder: 0, enabled: true });
  dialog.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, { name: row.name || "", sortOrder: Number(row.sortOrder || 0), enabled: Boolean(row.enabled) });
  dialog.value = true;
}

async function submit() {
  if (!form.name.trim()) return ElMessage.warning("请填写分类名称");
  saving.value = true;
  try {
    const payload = { name: form.name.trim(), sortOrder: Number(form.sortOrder || 0), enabled: form.enabled };
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
    else await api.patch(`/admin/categories/${row.id}`, { name: row.name, sortOrder: row.sortOrder, enabled: true });
    ElMessage.success(!row.enabled ? "分类已启用" : "分类已停用");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "更新分类失败");
  }
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
    <div class="table-card">
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无分类">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" min-width="180" />
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

    <el-dialog v-model="dialog" width="460px" :title="editingId ? '编辑分类' : '新增分类'" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="名称" required><el-input v-model="form.name" maxlength="60" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
        <el-form-item><el-checkbox v-model="form.enabled">启用分类</el-checkbox></el-form-item>
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
</style>


