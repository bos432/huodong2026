<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { CopyDocument, Grid, Key, SwitchButton, View } from "@element-plus/icons-vue";
import { api } from "../api";
import H5QrDialog from "../components/H5QrDialog.vue";
import { AdminRole, canAccess, canAccessScope, clearStoredAdminSession, currentRole, currentTenantCode, currentTenantName, currentTenantSettings, isPlatformAdmin, roleOptions, setStoredAdminSession } from "../permissions";
import { copyToClipboard, h5PreviewUrl, openH5Preview } from "../h5-preview";
import { menuGroups, tenantQuickLinks, tenantScopedRoutePaths } from "../navigation/admin-menu";

const route = useRoute();
const router = useRouter();
const passwordDialogVisible = ref(false);
const h5QrDialogVisible = ref(false);
const changingPassword = ref(false);
const passwordForm = reactive({ oldPassword: "", newPassword: "", confirmPassword: "" });
const platformTenants = ref<Array<{ id: number; name?: string; code?: string; enabled?: boolean }>>([]);
const selectedPlatformTenantId = ref(Number(localStorage.getItem("admin_selected_tenant_id") || 0));
const shellBrand = ref<{ adminTitle?: string; brandName?: string; brandLogoUrl?: string }>({});
const tenantSettings = computed(() => currentTenantSettings());
const roleLabel = computed(() => roleOptions.find((item) => item.value === currentRole())?.label || "管理员");
const shellTitle = computed(() => {
  if (shellBrand.value.adminTitle) return shellBrand.value.adminTitle;
  if (isPlatformAdmin()) return "平台超级管理后台";
  return `${currentTenantName() || shellBrand.value.brandName || "商家"}管理后台`;
});
const roleCapabilityText = computed(() => {
  const role = currentRole();
  if (isPlatformAdmin()) return "平台超管：可管理全平台商家、活动、订单、公益池、系统安全，并拥有会员余额调整权限。";
  if (role === AdminRole.Operator) {
    if (canAccess(["activity.manage", "registration.manage", "homepage.manage", "member.manage"])) return "运营账号：可管理活动、报名、会员和装修营销；不处理余额调整等平台资产操作。";
    if (canAccess(["mall.product.manage", "mall.order.view", "mall.finance.view"])) return "商城运营账号：可管理授权店铺的商品、订单、售后和商城经营数据。";
    return "运营账号：当前仅显示已授权的后台功能。";
  }
  if (role === AdminRole.Finance) return "财务账号：可查看订单财务、确认线下收款、处理退款和对账；不编辑活动内容。";
  if (role === AdminRole.CheckInStaff) return "签到账号：用于现场查询报名和签到核销；不显示审核、收款和活动编辑操作。";
  return "商家管理员：只管理本商家数据，可配置活动、报名、员工账号和经营设置。";
});
const selectedPlatformTenant = computed(() => platformTenants.value.find((tenant) => tenant.id === selectedPlatformTenantId.value));
const selectedPlatformTenantCode = computed(() => selectedPlatformTenant.value?.code || "");
const selectedScopeName = computed(() => (selectedPlatformTenant.value ? selectedTenantLabel(selectedPlatformTenant.value) : "平台视角"));
const currentH5PreviewUrl = computed(() => h5PreviewUrl(isPlatformAdmin() ? selectedPlatformTenantCode.value : currentTenantCode()));
const currentH5PreviewLabel = computed(() => (isPlatformAdmin() ? (selectedPlatformTenant.value ? "商家H5" : "平台H5") : "商家H5"));
const visibleTenantQuickLinks = computed(() => tenantQuickLinks.filter((item) => !mallMenuDisabled(item)));
const visibleMenuGroups = computed(() =>
  menuGroups
    .filter((group) => canAccessScope(group.scope as any))
    .map((group) => ({ ...group, items: group.items.filter((item) => canShowMenuItem(item)) }))
    .filter((group) => group.items.length)
);

function canShowMenuItem(item: { roles?: string[]; scope?: string; index?: string; requiresMallEnabled?: boolean }) {
  return canAccess(item.roles) && canAccessScope(item.scope as any) && !mallMenuDisabled(item);
}

function mallMenuDisabled(item: { path?: string; index?: string; requiresMallEnabled?: boolean }) {
  if (isPlatformAdmin()) return false;
  const target = item.path || item.index || "";
  const mallScoped = target.startsWith("/mall-") || Boolean(item.requiresMallEnabled);
  return mallScoped && !tenantSettings.value.mallEnabled;
}

async function refreshCurrentAdminContext() {
  try {
    const admin = await api.get<any, any>("/admin/auth/me");
    if (!admin) return;
    setStoredAdminSession(admin);
    if ((route.meta.roles && !canAccess(route.meta.roles as string[])) || !canAccessScope(route.meta.scope as any)) {
      router.replace(visibleMenuGroups.value[0]?.items[0]?.index || "/login");
    }
  } catch {
    // Keep the current session usable; individual pages will surface request errors.
  }
}

async function loadPlatformTenants() {
  if (!isPlatformAdmin()) return;
  try {
    platformTenants.value = await api.get<any, any[]>("/admin/tenants");
    if (selectedPlatformTenantId.value && !platformTenants.value.some((tenant) => tenant.id === selectedPlatformTenantId.value)) {
      selectedPlatformTenantId.value = 0;
      localStorage.removeItem("admin_selected_tenant_id");
    }
  } catch (error: any) {
    ElMessage.error(error.message || "加载商家列表失败");
  }
}

async function loadShellBrand() {
  try {
    const setting = await api.get<any, any>("/admin/settings/operation");
    const theme = setting?.pageTheme || {};
    shellBrand.value = {
      adminTitle: String(theme.adminTitle || ""),
      brandName: String(theme.brandName || ""),
      brandLogoUrl: String(theme.brandLogoUrl || "")
    };
  } catch {
    shellBrand.value = {};
  }
}

function selectedTenantLabel(tenant: { name?: string; code?: string; enabled?: boolean }) {
  const base = `${tenant.name || tenant.code || "未命名商家"}${tenant.code ? `（${tenant.code}）` : ""}`;
  return tenant.enabled === false ? `${base} · 已停用` : base;
}

function scopedQueryForTenant() {
  const nextQuery = { ...route.query };
  if (selectedPlatformTenantId.value) nextQuery.tenantId = String(selectedPlatformTenantId.value);
  else delete nextQuery.tenantId;
  return nextQuery;
}

function syncSelectedTenantToRoute() {
  if (!isPlatformAdmin() || !tenantScopedRoutePaths.has(route.path)) return;
  const nextTenantId = selectedPlatformTenantId.value ? String(selectedPlatformTenantId.value) : undefined;
  const currentTenantId = typeof route.query.tenantId === "string" ? route.query.tenantId : undefined;
  if (currentTenantId === nextTenantId) return;
  router.replace({ path: route.path, query: scopedQueryForTenant() });
}

function handleSelectedTenantChanged() {
  if (selectedPlatformTenantId.value) localStorage.setItem("admin_selected_tenant_id", String(selectedPlatformTenantId.value));
  else localStorage.removeItem("admin_selected_tenant_id");
  syncSelectedTenantToRoute();
}

function goTenantQuickLink(path: string) {
  router.push({ path, query: scopedQueryForTenant() });
}

function menuItemLabel(item: { index: string; label: string }) {
  const role = currentRole();
  if (role === AdminRole.Finance && item.index === "/dashboard") return "财务概览";
  if (role === AdminRole.CheckInStaff && item.index === "/activities") return "活动列表";
  if (role === AdminRole.CheckInStaff && item.index === "/registrations") return "报名查询";
  return item.label;
}

function validatePassword(password: string) {
  if (password.length < 10) return "新密码至少需要 10 位";
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) return "新密码需要包含大小写字母和数字";
  return "";
}

function openPasswordDialog() {
  Object.assign(passwordForm, { oldPassword: "", newPassword: "", confirmPassword: "" });
  passwordDialogVisible.value = true;
}

function openCurrentH5Preview() {
  openH5Preview(isPlatformAdmin() ? selectedPlatformTenantCode.value : currentTenantCode());
}

async function copyCurrentH5PreviewUrl() {
  await copyToClipboard(currentH5PreviewUrl.value);
  ElMessage.success(`${currentH5PreviewLabel.value}链接已复制`);
}

function openCurrentH5QrDialog() {
  h5QrDialogVisible.value = true;
}

async function changePassword() {
  if (!passwordForm.oldPassword) return ElMessage.error("请输入当前密码");
  const passwordError = validatePassword(passwordForm.newPassword);
  if (passwordError) return ElMessage.error(passwordError);
  if (passwordForm.newPassword !== passwordForm.confirmPassword) return ElMessage.error("两次输入的新密码不一致");
  changingPassword.value = true;
  try {
    await api.post("/admin/auth/change-password", {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    });
    ElMessage.success("密码已修改，请重新登录");
    passwordDialogVisible.value = false;
    logout();
  } catch (error: any) {
    ElMessage.error(error.message || "修改密码失败");
  } finally {
    changingPassword.value = false;
  }
}

function logout() {
  clearStoredAdminSession();
  router.push("/login");
}

onMounted(() => {
  refreshCurrentAdminContext();
  loadShellBrand();
  loadPlatformTenants();
  syncSelectedTenantToRoute();
});

watch(
  () => route.path,
  () => syncSelectedTenantToRoute()
);
</script>

<template>
  <el-container class="shell">
    <el-aside width="248px" class="aside">
      <div class="brand">
        <img v-if="shellBrand.brandLogoUrl" class="brand-logo" :src="shellBrand.brandLogoUrl" alt="Logo" />
        <span>{{ shellTitle }}</span>
      </div>
      <el-menu router :default-active="route.fullPath" background-color="#162033" text-color="#d8dee9" active-text-color="#ffffff" unique-opened>
        <el-sub-menu v-for="group in visibleMenuGroups" :key="group.index" :index="group.index">
          <template #title>
            <el-icon><component :is="group.icon" /></el-icon>
            <span>{{ group.label }}</span>
          </template>
          <el-menu-item v-for="item in group.items" :key="item.index" :index="item.index">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ menuItemLabel(item) }}</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-title">
          <span>{{ shellTitle }} · {{ roleLabel }}</span>
          <small>{{ roleCapabilityText }}</small>
        </div>
        <div class="header-actions">
          <div v-if="isPlatformAdmin()" class="tenant-switcher">
            <span>查看范围</span>
            <el-select v-model="selectedPlatformTenantId" filterable placeholder="平台视角" @change="handleSelectedTenantChanged">
              <el-option label="平台视角" :value="0" />
              <el-option v-for="tenant in platformTenants" :key="tenant.id" :label="selectedTenantLabel(tenant)" :value="tenant.id" />
            </el-select>
          </div>
          <el-dropdown v-if="isPlatformAdmin()" trigger="click" @command="goTenantQuickLink">
            <el-button>进入{{ selectedScopeName }}</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="item in visibleTenantQuickLinks" :key="item.path" :command="item.path">{{ item.label }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button :icon="View" @click="openCurrentH5Preview">打开{{ currentH5PreviewLabel }}</el-button>
          <el-button :icon="CopyDocument" @click="copyCurrentH5PreviewUrl">复制{{ currentH5PreviewLabel }}</el-button>
          <el-button :icon="Grid" @click="openCurrentH5QrDialog">{{ currentH5PreviewLabel }}二维码</el-button>
          <el-button :icon="Key" @click="openPasswordDialog">修改密码</el-button>
          <el-button :icon="SwitchButton" @click="logout">退出</el-button>
        </div>
      </el-header>
      <el-main :class="{ 'homepage-builder-main': route.path === '/homepage-builder' }"><router-view /></el-main>
    </el-container>
  </el-container>

  <H5QrDialog
    v-model="h5QrDialogVisible"
    :title="`${currentH5PreviewLabel}二维码`"
    :scope-name="shellTitle"
    :url="currentH5PreviewUrl"
  />

  <el-dialog v-model="passwordDialogVisible" title="修改密码" width="420px" destroy-on-close>
    <el-form label-position="top" @keyup.enter="changePassword">
      <el-form-item label="当前密码" required>
        <el-input v-model="passwordForm.oldPassword" type="password" show-password autocomplete="current-password" />
      </el-form-item>
      <el-form-item label="新密码" required>
        <el-input v-model="passwordForm.newPassword" type="password" show-password autocomplete="new-password" maxlength="80" />
      </el-form-item>
      <el-form-item label="确认新密码" required>
        <el-input v-model="passwordForm.confirmPassword" type="password" show-password autocomplete="new-password" maxlength="80" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="passwordDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="changingPassword" @click="changePassword">保存并重新登录</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.shell { min-height: 100vh; }
.aside { background: #162033; overflow-x: hidden; }
.brand { height: 60px; display: flex; align-items: center; gap: 10px; padding: 0 20px; color: #fff; font-size: 20px; font-weight: 700; }
.brand span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.brand-logo { width: 34px; height: 34px; object-fit: contain; border-radius: 10px; background: rgba(255,255,255,0.12); padding: 3px; flex: 0 0 auto; }
.header { background: #fff; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.header-title { min-width: 0; display: grid; gap: 3px; }
.header-title span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.header-title small { color: #64748b; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 10px; }
.tenant-switcher { display: flex; align-items: center; gap: 8px; color: #475569; font-size: 12px; }
.tenant-switcher .el-select { width: 220px; }
.homepage-builder-main { overflow: visible; }
.el-menu { border-right: 0; }
:deep(.el-sub-menu__title) { height: 46px; color: #b7c2d6; font-weight: 700; }
:deep(.el-sub-menu__title:hover), :deep(.el-menu-item:hover) { background-color: #1e2b43; }
:deep(.el-menu-item) { height: 42px; padding-left: 44px !important; }
:deep(.el-menu-item.is-active) { background: #243653; font-weight: 700; }

@media (max-width: 768px) {
  .shell { display: block; }
  .aside { width: 100% !important; overflow-x: auto; }
  .brand { height: 52px; padding: 0 14px; font-size: 17px; }
  .el-menu { display: flex; min-width: max-content; }
  :deep(.el-sub-menu) { flex: 0 0 auto; }
  :deep(.el-sub-menu__title), :deep(.el-menu-item) { height: 40px; padding: 0 14px !important; }
  :deep(.el-sub-menu .el-menu) { position: static; display: block; min-width: 180px; }
  .header { height: auto; min-height: 56px; padding: 10px 12px; align-items: flex-start; flex-wrap: wrap; }
  .header-title { width: 100%; }
  .header-actions { width: 100%; justify-content: flex-start; gap: 8px; }
  .tenant-switcher { width: 100%; align-items: flex-start; flex-wrap: wrap; }
  .tenant-switcher .el-select { width: min(260px, 100%); }
  :deep(.el-main) { padding: 12px; min-width: 0; overflow-x: hidden; }
}
</style>

