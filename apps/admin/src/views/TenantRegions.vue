<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";

type Tenant = { id: number; code: string; name: string; region?: string | null; enabled?: boolean };
type TenantRegion = {
  id: number;
  tenant: Tenant;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  exclusive: boolean;
  priority: number;
  enabled: boolean;
  remark?: string | null;
};

const tenants = ref<Tenant[]>([]);
const rows = ref<TenantRegion[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const filters = reactive({ tenantId: 0 });
const form = reactive({
  tenantId: 0,
  province: "",
  city: "",
  district: "",
  name: "",
  latitude: 0,
  longitude: 0,
  radiusMeters: 5000,
  exclusive: true,
  priority: 0,
  enabled: true,
  remark: ""
});

const selectedTenant = computed(() => tenants.value.find((item) => item.id === form.tenantId));

function tenantLabel(tenant?: Tenant | null) {
  if (!tenant) return "未选择商家";
  const region = tenant.region ? `${tenant.region} · ` : "";
  return `${region}${tenant.name}（${tenant.code}）`;
}

function resetForm(row?: TenantRegion) {
  editingId.value = row?.id || null;
  Object.assign(form, {
    tenantId: row?.tenant?.id || filters.tenantId || tenants.value[0]?.id || 0,
    province: row?.province || "",
    city: row?.city || "",
    district: row?.district || "",
    name: row?.name || "",
    latitude: row?.latitude || 0,
    longitude: row?.longitude || 0,
    radiusMeters: row?.radiusMeters || 5000,
    exclusive: row?.exclusive ?? true,
    priority: row?.priority || 0,
    enabled: row?.enabled ?? true,
    remark: row?.remark || ""
  });
}

async function load() {
  loading.value = true;
  try {
    const params = filters.tenantId ? { tenantId: filters.tenantId } : {};
    const [tenantRows, regionRows] = await Promise.all([api.get<any, Tenant[]>("/admin/tenants"), api.get<any, TenantRegion[]>("/admin/tenant-regions", { params })]);
    tenants.value = tenantRows;
    rows.value = regionRows;
  } catch (error: any) {
    ElMessage.error(error.message || "加载区域保护失败");
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: TenantRegion) {
  resetForm(row);
  dialogVisible.value = true;
}

function validateForm() {
  if (!form.tenantId) return "请选择商家/代理";
  if (!form.name.trim()) return "请填写区域名称";
  if (!Number.isFinite(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90) return "纬度范围应为 -90 到 90";
  if (!Number.isFinite(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180) return "经度范围应为 -180 到 180";
  if (!Number.isFinite(Number(form.radiusMeters)) || Number(form.radiusMeters) < 100 || Number(form.radiusMeters) > 200000) return "保护半径应为 100 米到 200 公里";
  return "";
}

async function save() {
  const error = validateForm();
  if (error) return ElMessage.error(error);
  saving.value = true;
  try {
    const payload = { ...form, name: form.name.trim(), province: form.province.trim(), city: form.city.trim(), district: form.district.trim(), remark: form.remark.trim() };
    if (editingId.value) await api.patch(`/admin/tenant-regions/${editingId.value}`, payload);
    else await api.post("/admin/tenant-regions", payload);
    ElMessage.success("区域保护已保存");
    dialogVisible.value = false;
    await load();
  } catch (err: any) {
    ElMessage.error(err.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function remove(row: TenantRegion) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.name}」？删除后该区域不再参与定位分发。`, "删除区域保护", { type: "warning" });
    await api.delete(`/admin/tenant-regions/${row.id}`);
    ElMessage.success("已删除");
    await load();
  } catch (error: any) {
    if (error !== "cancel") ElMessage.error(error.message || "删除失败");
  }
}

function mapUrl(row: TenantRegion) {
  return `https://uri.amap.com/marker?position=${row.longitude},${row.latitude}&name=${encodeURIComponent(row.name)}`;
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="hero">
      <div>
        <span>REGIONAL PROTECTION</span>
        <h2>区域保护</h2>
        <p>用于“用户打开 H5/小程序后，根据定位自动匹配当前区域商家/代理”。排他区域会阻止不同商家的服务圈重叠，避免招商和订单归属冲突。</p>
      </div>
      <el-button type="primary" @click="openCreate">新增区域</el-button>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="配置提示"
      description="经纬度可在高德/腾讯地图搜索门店或城市中心后复制。第一版使用中心点 + 半径匹配；复杂街道边界、多边形围栏可作为下一阶段升级。"
    />

    <el-card shadow="never">
      <div class="toolbar">
        <el-select v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" @change="load">
          <el-option :value="0" label="全部商家/代理" />
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-button @click="load">刷新</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column label="区域" min-width="210">
          <template #default="{ row }">
            <strong>{{ row.name }}</strong>
            <small>{{ [row.province, row.city, row.district].filter(Boolean).join(" / ") || "未填行政区" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="商家/代理" min-width="230">
          <template #default="{ row }">{{ tenantLabel(row.tenant) }}</template>
        </el-table-column>
        <el-table-column label="定位范围" min-width="180">
          <template #default="{ row }">
            <div>{{ row.latitude }}, {{ row.longitude }}</div>
            <small>半径 {{ row.radiusMeters }} 米</small>
          </template>
        </el-table-column>
        <el-table-column label="规则" width="180">
          <template #default="{ row }">
            <el-tag :type="row.exclusive ? 'danger' : 'info'">{{ row.exclusive ? "排他保护" : "允许重叠" }}</el-tag>
            <el-tag class="ml" type="success">优先级 {{ row.priority }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" tag="a" :href="mapUrl(row)" target="_blank">看地图</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑区域保护' : '新增区域保护'" width="680px" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="商家/代理" required>
          <el-select v-model="form.tenantId" filterable placeholder="请选择商家">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
          </el-select>
          <small v-if="selectedTenant">当前将把定位命中的用户分发给：{{ tenantLabel(selectedTenant) }}</small>
        </el-form-item>
        <div class="grid">
          <el-form-item label="省"><el-input v-model="form.province" placeholder="例如：重庆市" /></el-form-item>
          <el-form-item label="市"><el-input v-model="form.city" placeholder="例如：重庆市" /></el-form-item>
          <el-form-item label="区县"><el-input v-model="form.district" placeholder="例如：铜梁区" /></el-form-item>
        </div>
        <el-form-item label="区域名称" required><el-input v-model="form.name" placeholder="例如：铜梁核心服务区" /></el-form-item>
        <div class="grid">
          <el-form-item label="纬度 latitude" required><el-input-number v-model="form.latitude" :precision="6" :step="0.000001" :min="-90" :max="90" /></el-form-item>
          <el-form-item label="经度 longitude" required><el-input-number v-model="form.longitude" :precision="6" :step="0.000001" :min="-180" :max="180" /></el-form-item>
          <el-form-item label="保护半径（米）" required><el-input-number v-model="form.radiusMeters" :step="500" :min="100" :max="200000" /></el-form-item>
        </div>
        <div class="grid">
          <el-form-item label="排他保护"><el-switch v-model="form.exclusive" active-text="开启" inactive-text="关闭" /></el-form-item>
          <el-form-item label="优先级"><el-input-number v-model="form.priority" :min="-999" :max="999" /></el-form-item>
          <el-form-item label="启用状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        </div>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" placeholder="合同区域、运营说明、边界备注等" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { display: grid; gap: 16px; }
.hero { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 22px; border-radius: 18px; background: linear-gradient(135deg, #11352f, #22604f 58%, #d39a42); color: #fff; box-shadow: 0 16px 40px rgba(17,53,47,.18); }
.hero span { font-size: 12px; letter-spacing: .16em; opacity: .72; }
.hero h2 { margin: 6px 0 8px; font-size: 26px; }
.hero p { margin: 0; max-width: 780px; color: rgba(255,255,255,.86); line-height: 1.7; }
.toolbar { display: flex; gap: 10px; margin-bottom: 14px; }
.toolbar .el-select { width: 320px; }
strong { display: block; color: #0f172a; }
small { display: block; margin-top: 4px; color: #64748b; line-height: 1.5; }
.ml { margin-left: 6px; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
:deep(.el-input-number) { width: 100%; }
@media (max-width: 900px) {
  .hero, .toolbar { align-items: stretch; flex-direction: column; }
  .toolbar .el-select { width: 100%; }
  .grid { grid-template-columns: 1fr; }
}
</style>
