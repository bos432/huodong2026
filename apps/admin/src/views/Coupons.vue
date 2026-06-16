<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Edit, Plus, Refresh } from "@element-plus/icons-vue";
import { api } from "../api";

const rows = ref<any[]>([]);
const activities = ref<any[]>([]);
const loading = ref(false);
const dialog = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  activityId: undefined as number | undefined,
  code: "",
  name: "",
  discountType: "fixed" as "fixed" | "percent",
  discountValue: 0,
  minAmount: 0,
  usageLimit: undefined as number | undefined,
  enabled: true,
  startsAt: "",
  endsAt: ""
});

async function loadActivities() {
  const result = await api.get<any, any>("/admin/activities", { params: { page: 1, pageSize: 100 } });
  activities.value = Array.isArray(result) ? result : result.items || [];
}

async function loadCoupons() {
  rows.value = await api.get<any, any[]>("/admin/coupons");
}

async function load() {
  loading.value = true;
  try {
    await Promise.all([loadCoupons(), loadActivities()]);
  } catch (error: any) {
    ElMessage.error(error.message || "加载优惠码失败");
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { activityId: undefined, code: "", name: "", discountType: "fixed", discountValue: 0, minAmount: 0, usageLimit: undefined, enabled: true, startsAt: "", endsAt: "" });
  dialog.value = true;
}

function dateText(value?: string | null) {
  return value ? value.slice(0, 19).replace("T", " ") : "";
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, {
    activityId: row.activity?.id,
    code: row.code,
    name: row.name,
    discountType: row.discountType,
    discountValue: Number(row.discountValue),
    minAmount: Number(row.minAmount),
    usageLimit: row.usageLimit || undefined,
    enabled: row.enabled,
    startsAt: dateText(row.startsAt),
    endsAt: dateText(row.endsAt)
  });
  dialog.value = true;
}

function validate() {
  if (!form.code.trim()) return "请填写优惠码";
  if (!/^[A-Za-z0-9_-]+$/.test(form.code.trim())) return "优惠码只能包含字母、数字、下划线和短横线";
  if (!form.name.trim()) return "请填写优惠名称";
  if (!["fixed", "percent"].includes(form.discountType)) return "优惠类型不正确";
  if (Number(form.discountValue) <= 0) return "优惠值必须大于 0";
  if (form.discountType === "percent" && Number(form.discountValue) > 100) return "折扣比例不能超过 100";
  if (Number(form.minAmount || 0) < 0) return "使用门槛不能小于 0";
  if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) return "结束时间必须晚于开始时间";
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
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      discountValue: Number(form.discountValue),
      minAmount: Number(form.minAmount || 0),
      usageLimit: form.usageLimit || undefined,
      activityId: form.activityId || undefined,
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || undefined
    };
    if (editingId.value) await api.patch(`/admin/coupons/${editingId.value}`, payload);
    else await api.post("/admin/coupons", payload);
    ElMessage.success("优惠码已保存");
    dialog.value = false;
    loadCoupons();
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    saving.value = false;
  }
}

function discountText(row: any) {
  return row.discountType === "percent" ? `${Number(row.discountValue).toFixed(0)} 折` : `减 ¥${Number(row.discountValue).toFixed(2)}`;
}

function money(value: string | number | undefined) {
  return Number(value || 0).toFixed(2);
}

function timeRange(row: any) {
  const start = dateText(row.startsAt);
  const end = dateText(row.endsAt);
  if (!start && !end) return "长期有效";
  return `${start || "不限"} 至 ${end || "不限"}`;
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>优惠码管理</h2>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建优惠码</el-button>
      </div>
    </div>

    <div class="table-card">
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无优惠码">
        <el-table-column prop="code" label="优惠码" width="150" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column label="活动限定" min-width="240" show-overflow-tooltip><template #default="{ row }">{{ row.activity?.title || "全活动通用" }}</template></el-table-column>
        <el-table-column label="优惠" width="130"><template #default="{ row }">{{ discountText(row) }}</template></el-table-column>
        <el-table-column label="门槛" width="120"><template #default="{ row }">¥{{ money(row.minAmount) }}</template></el-table-column>
        <el-table-column label="用量" width="120"><template #default="{ row }">{{ row.usedCount }} / {{ row.usageLimit || "不限" }}</template></el-table-column>
        <el-table-column label="有效期" min-width="260"><template #default="{ row }">{{ timeRange(row) }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="120" fixed="right"><template #default="{ row }"><el-button size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button></template></el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialog" width="640px" :title="editingId ? '编辑优惠码' : '新建优惠码'">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="优惠码" required><el-input v-model="form.code" placeholder="如：EARLYBIRD" /></el-form-item>
          <el-form-item label="名称" required><el-input v-model="form.name" placeholder="如：早鸟优惠" /></el-form-item>
          <el-form-item label="优惠类型"><el-select v-model="form.discountType"><el-option label="固定金额" value="fixed" /><el-option label="折扣比例" value="percent" /></el-select></el-form-item>
          <el-form-item label="优惠值" required><el-input-number v-model="form.discountValue" :min="0" :precision="form.discountType === 'fixed' ? 2 : 0" /></el-form-item>
          <el-form-item label="使用门槛"><el-input-number v-model="form.minAmount" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="总次数"><el-input-number v-model="form.usageLimit" :min="1" placeholder="不填不限" /></el-form-item>
          <el-form-item class="full" label="限定活动"><el-select v-model="form.activityId" clearable filterable style="width: 100%"><el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="开始时间"><el-date-picker v-model="form.startsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
          <el-form-item label="结束时间"><el-date-picker v-model="form.endsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
          <el-form-item><el-checkbox v-model="form.enabled">启用优惠码</el-checkbox></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialog=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; gap: 10px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
.full { grid-column: 1 / -1; }
@media (max-width: 760px) { .form-grid { grid-template-columns: 1fr; } }
</style>
