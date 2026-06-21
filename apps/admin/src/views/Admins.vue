<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, Key, Plus, Refresh, Search, Switch, UserFilled } from "@element-plus/icons-vue";
import { useRoute } from "vue-router";
import { api } from "../api";
import { AdminRole, availablePermissionGroups, defaultPermissionsForRole, isPlatformAdmin, normalizePermissionList, roleOptions } from "../permissions";

type AdminRow = {
  id: number;
  username: string;
  role: string;
  permissions?: string[];
  assignedPermissions?: string[] | null;
  tenantId?: number | null;
  tenant?: { id: number; name: string; code: string } | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type TenantRow = { id: number; name: string; code: string; enabled: boolean };

type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasDefaultAdminEnabled?: boolean;
};

const rows = ref<AdminRow[]>([]);
const tenants = ref<TenantRow[]>([]);
const memberRows = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const memberLoading = ref(false);
const memberDialog = ref(false);
const editDialog = ref(false);
const editingAdmin = ref<AdminRow | null>(null);
const total = ref(0);
const hasDefaultAdmin = ref(false);
const route = useRoute();
const tenantStaffRoles = [AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff];
const visibleRoleOptions = computed(() => (isPlatformAdmin() ? roleOptions : roleOptions.filter((role) => tenantStaffRoles.includes(role.value))));
const defaultCreateRole = computed(() => (isPlatformAdmin() ? AdminRole.SuperAdmin : AdminRole.Operator));
const form = reactive({ username: "", password: "", role: defaultCreateRole.value, tenantId: undefined as number | undefined, permissions: [] as string[] });
const editForm = reactive({ role: defaultCreateRole.value, tenantId: undefined as number | undefined, enabled: true, permissions: [] as string[] });
const filters = reactive({ keyword: "", role: "", enabled: "", tenantId: undefined as number | undefined, includeSmoke: false, page: 1, pageSize: 20 });
const memberKeyword = ref("");
const selectedTenant = computed(() => tenants.value.find((tenant) => tenant.id === form.tenantId));
const accountScopePreview = computed(() => {
  if (!isPlatformAdmin()) return "本商家员工账号";
  if (!form.tenantId) return "平台管理员账号";
  return `商家后台账号：${selectedTenant.value?.name || "已选商家"}`;
});
const accountScopeHint = computed(() => {
  if (!isPlatformAdmin()) return "该账号只能登录本商家后台，数据会自动限定在当前商家。";
  if (!form.tenantId) return "未选择商家时会创建平台账号，可按所选角色访问全平台后台。";
  if (form.role === AdminRole.SuperAdmin) return "选择商家后，超级管理员会作为该商家的商家管理员登录，仅能管理该商家数据。";
  return "选择商家后，该账号登录时只看到所选商家的数据和对应角色菜单。";
});
const createPermissionGroups = computed(() => availablePermissionGroups(Boolean(form.tenantId) || !isPlatformAdmin()));
const editPermissionGroups = computed(() => availablePermissionGroups(Boolean(editForm.tenantId) || !isPlatformAdmin()));
const createPermissionCount = computed(() => form.permissions.length);
const editPermissionCount = computed(() => editForm.permissions.length);

function queryParams() {
  return {
    keyword: filters.keyword.trim() || undefined,
    role: filters.role || undefined,
    enabled: filters.enabled || undefined,
    tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined,
    includeSmoke: filters.includeSmoke ? "true" : "false",
    page: filters.page,
    pageSize: filters.pageSize
  };
}

async function loadTenants() {
  if (!isPlatformAdmin()) return;
  tenants.value = await api.get<any, TenantRow[]>("/admin/tenants");
}

async function load() {
  loading.value = true;
  try {
    const result = await api.get<any, PageResult<AdminRow>>("/admin/admins", { params: queryParams() });
    rows.value = result.items || [];
    total.value = result.total || 0;
    hasDefaultAdmin.value = Boolean(result.hasDefaultAdminEnabled);
  } finally {
    loading.value = false;
  }
}

function search() {
  filters.page = 1;
  load();
}

function applyTenantFromRoute() {
  if (!isPlatformAdmin()) return;
  const tenantId = Number(route.query.tenantId || 0);
  if (!Number.isFinite(tenantId) || tenantId <= 0) return;
  form.tenantId = tenantId;
  filters.tenantId = tenantId;
}

function validatePassword(password: string) {
  if (password.length < 10) return "密码至少需要 10 位";
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) return "密码需要包含大小写字母和数字";
  return "";
}

function roleLabel(role: string) {
  return roleOptions.find((item) => item.value === role)?.label || role;
}

function resetCreatePermissions() {
  form.permissions = defaultPermissionsForRole(form.role, Boolean(form.tenantId) || !isPlatformAdmin());
}

function resetEditPermissions() {
  editForm.permissions = defaultPermissionsForRole(editForm.role, Boolean(editForm.tenantId) || !isPlatformAdmin());
}

function groupKeys(group: { items: readonly { key: string }[] }) {
  return group.items.map((item) => item.key);
}

function selectAllCreatePermissions() {
  form.permissions = createPermissionGroups.value.flatMap((group) => groupKeys(group));
}

function selectAllEditPermissions() {
  editForm.permissions = editPermissionGroups.value.flatMap((group) => groupKeys(group));
}

async function submit() {
  if (!form.username.trim()) return ElMessage.error("请填写账号");
  if (!visibleRoleOptions.value.some((role) => role.value === form.role)) return ElMessage.error("当前后台只能创建运营、财务或签到员工账号");
  const passwordError = validatePassword(form.password);
  if (passwordError) return ElMessage.error(passwordError);
  saving.value = true;
  try {
    await api.post("/admin/admins", {
      username: form.username,
      password: form.password,
      role: form.role,
      tenantId: isPlatformAdmin() ? form.tenantId || undefined : undefined,
      permissions: normalizePermissionList(form.permissions)
    });
    Object.assign(form, { username: "", password: "", role: defaultCreateRole.value, tenantId: undefined, permissions: defaultPermissionsForRole(defaultCreateRole.value, !isPlatformAdmin()) });
    ElMessage.success(isPlatformAdmin() ? "已创建管理员" : "已创建员工账号");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "创建失败");
  } finally {
    saving.value = false;
  }
}

async function openMemberDialog() {
  memberDialog.value = true;
  await searchMembers();
}

async function searchMembers() {
  memberLoading.value = true;
  try {
    memberRows.value = await api.get<any, any[]>("/admin/members", { params: { keyword: memberKeyword.value.trim() || undefined } });
  } finally {
    memberLoading.value = false;
  }
}

function useMember(row: any) {
  const phone = row?.user?.phone || "";
  if (!phone) return ElMessage.warning("该会员没有手机号，不能作为登录账号");
  form.username = phone;
  memberDialog.value = false;
  ElMessage.success("已带入会员手机号，可继续选择角色并设置密码");
}

async function resetPassword(row: AdminRow) {
  const { value } = await ElMessageBox.prompt(`为 ${row.username} 设置新密码`, "重置密码", {
    inputType: "password",
    inputPlaceholder: "至少 10 位，包含大小写字母和数字",
    confirmButtonText: "确认重置",
    cancelButtonText: "取消"
  });
  const passwordError = validatePassword(value || "");
  if (passwordError) return ElMessage.error(passwordError);
  await api.post(`/admin/admins/${row.id}/password`, { password: value });
  ElMessage.success("密码已重置");
  await load();
}

function openEdit(row: AdminRow) {
  editingAdmin.value = row;
  Object.assign(editForm, {
    role: row.role as AdminRole,
    tenantId: row.tenant?.id || undefined,
    enabled: row.enabled,
    permissions: normalizePermissionList(row.assignedPermissions || row.permissions || defaultPermissionsForRole(row.role, Boolean(row.tenant?.id) || !isPlatformAdmin()))
  });
  editDialog.value = true;
}

async function saveEdit() {
  if (!editingAdmin.value) return;
  if (!visibleRoleOptions.value.some((role) => role.value === editForm.role)) return ElMessage.error("当前后台不能设置该角色");
  try {
    await api.patch(`/admin/admins/${editingAdmin.value.id}`, {
      role: editForm.role,
      tenantId: isPlatformAdmin() ? editForm.tenantId || undefined : undefined,
      enabled: editForm.enabled,
      permissions: normalizePermissionList(editForm.permissions)
    });
    ElMessage.success("管理员已更新");
    editDialog.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  }
}

async function toggleStatus(row: AdminRow) {
  const next = !row.enabled;
  if (!next) {
    await ElMessageBox.confirm(`确认禁用管理员 ${row.username}？禁用后该账号不能再登录。`, "禁用管理员", {
      type: "warning",
      confirmButtonText: "确认禁用",
      cancelButtonText: "取消"
    });
  }
  await api.post(`/admin/admins/${row.id}/status`, { enabled: next });
  ElMessage.success(next ? "管理员已启用" : "管理员已禁用");
  await load();
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

watch(() => route.query.tenantId, (value) => {
  if (isPlatformAdmin() && value === undefined) {
    form.tenantId = undefined;
    filters.tenantId = undefined;
  } else {
    applyTenantFromRoute();
  }
  search();
});

onMounted(() => {
  applyTenantFromRoute();
  resetCreatePermissions();
  load();
  loadTenants();
});

watch(() => [form.role, form.tenantId], resetCreatePermissions);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h2>管理员</h2>
        <p class="subtitle">{{ isPlatformAdmin() ? "给平台和商家创建后台账号；选择商家后，超级管理员即为该商家的管理员。" : "管理本商家的员工后台账号。" }}</p>
      </div>
      <el-button :icon="Refresh" @click="load">刷新</el-button>
    </div>

    <el-alert v-if="hasDefaultAdmin" class="risk-alert" type="warning" show-icon :closable="false" title="默认 admin 账号仍处于启用状态，上线前请重置强密码或禁用。" />

    <div class="table-card create-card">
      <el-form inline>
        <el-form-item label="账号" required><el-input v-model="form.username" maxlength="40" /></el-form-item>
        <el-button :icon="UserFilled" @click="openMemberDialog">从会员选择</el-button>
        <el-form-item label="密码" required><el-input v-model="form.password" type="password" show-password maxlength="80" /></el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="form.role" class="role-select">
            <el-option v-for="role in visibleRoleOptions" :key="role.value" :label="role.label" :value="role.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isPlatformAdmin()" label="所属商家">
          <el-select v-model="form.tenantId" clearable filterable class="tenant-select" placeholder="平台账号">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name}（${tenant.code}）`" :value="tenant.id">
              <div class="tenant-option">
                <span>{{ tenant.name }}（{{ tenant.code }}）</span>
                <el-tag v-if="!tenant.enabled" size="small" type="info">已停用</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-button type="primary" :icon="Plus" :loading="saving" @click="submit">{{ isPlatformAdmin() ? "新增管理员" : "新增员工账号" }}</el-button>
      </el-form>
      <el-alert v-if="isPlatformAdmin()" class="scope-alert" type="info" show-icon :closable="false" :title="accountScopePreview" :description="accountScopeHint" />
      <div class="permission-card">
        <div class="permission-head">
          <strong>细粒度权限</strong>
          <span>已选 {{ createPermissionCount }} 项</span>
          <el-button size="small" @click="resetCreatePermissions">按角色默认</el-button>
          <el-button size="small" @click="selectAllCreatePermissions">全选可用权限</el-button>
        </div>
        <div class="permission-groups">
          <div v-for="group in createPermissionGroups" :key="group.group" class="permission-group">
            <div class="permission-group-title">{{ group.group }}</div>
            <el-checkbox-group v-model="form.permissions">
              <el-checkbox v-for="item in group.items" :key="item.key" :label="item.key">{{ item.label }}</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>
      <div class="role-help">
        <span v-for="role in visibleRoleOptions" :key="role.value"><strong>{{ role.label }}</strong>：{{ role.description }}</span>
      </div>
    </div>

    <el-dialog v-model="memberDialog" width="760px" title="从会员选择账号">
      <el-form inline class="filters">
        <el-form-item label="会员">
          <el-input v-model="memberKeyword" clearable placeholder="手机号/昵称" style="width: 240px" @keyup.enter="searchMembers" @clear="searchMembers" />
        </el-form-item>
        <el-button type="primary" :icon="Search" @click="searchMembers">搜索</el-button>
      </el-form>
      <el-table :data="memberRows" stripe v-loading="memberLoading" empty-text="暂无会员">
        <el-table-column label="会员" min-width="180">
          <template #default="{ row }">{{ row.user.nickname || row.user.phone || `用户${row.user.id}` }}</template>
        </el-table-column>
        <el-table-column label="手机号" width="150">
          <template #default="{ row }">{{ row.user.phone || "-" }}</template>
        </el-table-column>
        <el-table-column label="等级" width="130">
          <template #default="{ row }">{{ row.level?.name || "普通会员" }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110">
          <template #default="{ row }"><el-button size="small" type="primary" @click="useMember(row)">选择</el-button></template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="memberDialog=false">关闭</el-button>
      </template>
    </el-dialog>

    <div class="table-card">
      <el-form class="filters" inline>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="搜索账号或角色" style="width: 220px" @keyup.enter="search" @clear="search" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filters.role" clearable style="width: 170px" @change="search">
            <el-option v-for="role in roleOptions" :key="role.value" :label="role.label" :value="role.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.enabled" clearable style="width: 120px" @change="search">
            <el-option label="启用" value="true" />
            <el-option label="禁用" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isPlatformAdmin()" label="商家">
          <el-select v-model="filters.tenantId" clearable filterable style="width: 220px" @change="search">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name}（${tenant.code}）`" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="filters.includeSmoke" @change="search">显示烟测账号</el-checkbox>
        </el-form-item>
        <el-button type="primary" :icon="Search" @click="search">筛选</el-button>
      </el-form>

      <el-table :data="rows" stripe v-loading="loading" empty-text="暂无管理员">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="账号" min-width="180">
          <template #default="{ row }">
            <span>{{ row.username }}</span>
            <el-tag v-if="row.username === 'admin'" type="warning" size="small" class="default-tag">默认</el-tag>
            <el-tag v-if="row.username.startsWith('smoke_')" type="info" size="small" class="default-tag">烟测</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="150"><template #default="{ row }">{{ roleLabel(row.role) }}</template></el-table-column>
        <el-table-column label="权限" width="130">
          <template #default="{ row }">
            <el-tag type="info">{{ (row.permissions || []).length }} 项</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="所属商家" min-width="180">
          <template #default="{ row }">
            <div class="account-scope">
              <span>{{ row.tenant?.name || "平台" }}</span>
              <el-tag size="small" :type="row.tenant ? 'success' : 'warning'">{{ row.tenant ? "商家后台" : "平台账号" }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "禁用" }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="更新时间" width="170"><template #default="{ row }">{{ formatTime(row.updatedAt) }}</template></el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" :icon="Key" @click="resetPassword(row)">重置密码</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" :icon="Switch" @click="toggleStatus(row)">
              {{ row.enabled ? "禁用" : "启用" }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="search"
          @current-change="load"
        />
      </div>
    </div>

    <el-dialog v-model="editDialog" width="520px" title="编辑管理员">
      <el-form label-position="top">
        <el-form-item label="账号">
          <el-input :model-value="editingAdmin?.username" disabled />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width: 100%">
            <el-option v-for="role in visibleRoleOptions" :key="role.value" :label="role.label" :value="role.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isPlatformAdmin()" label="所属商家">
          <el-select v-model="editForm.tenantId" clearable filterable style="width: 100%" placeholder="平台账号">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name}（${tenant.code}）`" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="editForm.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item label="细粒度权限">
          <div class="permission-card dialog-permission-card">
            <div class="permission-head">
              <strong>已选 {{ editPermissionCount }} 项</strong>
              <el-button size="small" @click="resetEditPermissions">按角色默认</el-button>
              <el-button size="small" @click="selectAllEditPermissions">全选可用权限</el-button>
            </div>
            <div class="permission-groups">
              <div v-for="group in editPermissionGroups" :key="group.group" class="permission-group">
                <div class="permission-group-title">{{ group.group }}</div>
                <el-checkbox-group v-model="editForm.permissions">
                  <el-checkbox v-for="item in group.items" :key="item.key" :label="item.key">{{ item.label }}</el-checkbox>
                </el-checkbox-group>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <el-alert type="info" show-icon :closable="false" title="管理员账号不建议物理删除" description="如果添加错了，建议改角色、改所属商家，或禁用账号，这样操作日志和历史记录还能追溯。" />
      <template #footer>
        <el-button @click="editDialog=false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px; }
.subtitle { margin: 6px 0 0; color: #64748b; font-size: 14px; }
.risk-alert { margin-bottom: 16px; }
.create-card { margin-bottom: 16px; }
.filters { margin-bottom: 12px; }
.default-tag { margin-left: 8px; }
.role-select { width: 180px; }
.tenant-select { width: 220px; }
.tenant-option, .account-scope { display: flex; align-items: center; gap: 8px; }
.tenant-option { justify-content: space-between; }
.scope-alert { margin-top: 10px; }
.role-help { color: #64748b; font-size: 12px; }
.role-help { display: grid; gap: 6px; margin-top: 10px; line-height: 1.5; }
.permission-card { margin-top: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc; padding: 12px; width: 100%; }
.dialog-permission-card { margin-top: 0; max-height: 420px; overflow: auto; }
.permission-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; color: #334155; }
.permission-head span { color: #64748b; font-size: 12px; margin-right: auto; }
.permission-groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.permission-group { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
.permission-group-title { font-weight: 700; color: #111827; margin-bottom: 8px; }
.permission-group :deep(.el-checkbox-group) { display: grid; gap: 6px; }
.permission-group :deep(.el-checkbox) { margin-right: 0; height: auto; white-space: normal; }
.pagination { display: flex; justify-content: flex-end; padding-top: 16px; }
@media (max-width: 900px) { .permission-groups { grid-template-columns: 1fr; } }
</style>
