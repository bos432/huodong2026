<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Edit, Plus, Refresh } from "@element-plus/icons-vue";
import { api } from "../api";

const rows = ref<any[]>([]);
const activities = ref<any[]>([]);
const loading = ref(false);
const dialog = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const selectedActivityId = ref<number | undefined>();

const form = reactive({
  activityId: undefined as number | undefined,
  name: "",
  price: 0,
  capacity: undefined as number | undefined,
  enabled: true
});

const activityMap = computed(() => new Map(activities.value.map((item) => [item.id, item.title])));

async function loadActivities() {
  const result = await api.get<any, any>("/admin/activities", { params: { page: 1, pageSize: 100 } });
  activities.value = Array.isArray(result) ? result : result.items || [];
}

async function loadTickets() {
  rows.value = await api.get<any, any[]>("/admin/ticket-types", { params: { activityId: selectedActivityId.value } });
}

async function load() {
  loading.value = true;
  try {
    await Promise.all([loadTickets(), loadActivities()]);
  } catch (error: any) {
    ElMessage.error(error.message || "加载票种失败");
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { activityId: selectedActivityId.value || activities.value[0]?.id, name: "", price: 0, capacity: undefined, enabled: true });
  dialog.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, { activityId: row.activity?.id, name: row.name, price: Number(row.price), capacity: row.capacity || undefined, enabled: row.enabled });
  dialog.value = true;
}

function validate() {
  if (!form.activityId) return "请选择活动";
  if (!form.name.trim()) return "请填写票种名称";
  if (Number(form.price) < 0) return "票价不能小于 0";
  return "";
}

async function submit() {
  const error = validate();
  if (error) {
    ElMessage.warning(error);
    return;
  }
  saving.value = true;
  try {
    const payload = { ...form, name: form.name.trim(), price: Number(form.price), capacity: form.capacity || undefined };
    if (editingId.value) await api.patch(`/admin/ticket-types/${editingId.value}`, payload);
    else await api.post("/admin/ticket-types", payload);
    ElMessage.success("票种已保存");
    dialog.value = false;
    loadTickets();
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    saving.value = false;
  }
}

function money(value: string | number | undefined) {
  return Number(value || 0).toFixed(2);
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>票种管理</h2>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建票种</el-button>
    </div>

    <div class="table-card">
      <el-form inline>
        <el-form-item label="活动">
          <el-select v-model="selectedActivityId" clearable filterable style="width: 340px" @change="loadTickets">
            <el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-button :icon="Refresh" @click="load">刷新</el-button>
      </el-form>

      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无票种">
        <el-table-column label="活动" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">{{ row.activity?.title || activityMap.get(row.activity?.id) || "-" }}</template>
        </el-table-column>
        <el-table-column prop="name" label="票种" min-width="160" />
        <el-table-column label="价格" width="120"><template #default="{ row }">¥{{ money(row.price) }}</template></el-table-column>
        <el-table-column label="容量" width="110"><template #default="{ row }">{{ row.capacity || "不限" }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="120" fixed="right"><template #default="{ row }"><el-button size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button></template></el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialog" width="520px" :title="editingId ? '编辑票种' : '新建票种'">
      <el-form label-position="top">
        <el-form-item label="活动" required><el-select v-model="form.activityId" filterable style="width: 100%"><el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="票种名称" required><el-input v-model="form.name" placeholder="如：早鸟票、会员票、现场票" /></el-form-item>
        <el-form-item label="价格"><el-input-number v-model="form.price" :min="0" :precision="2" style="width: 180px" /></el-form-item>
        <el-form-item label="容量"><el-input-number v-model="form.capacity" :min="1" placeholder="不填表示不限" style="width: 180px" /></el-form-item>
        <el-form-item><el-checkbox v-model="form.enabled">启用票种</el-checkbox></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
