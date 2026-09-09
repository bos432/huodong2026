<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Close, CopyDocument, Grid, Key, Menu as MenuIcon, SwitchButton, View } from "@element-plus/icons-vue";
import { api } from "../api";
import H5QrDialog from "../components/H5QrDialog.vue";
import { AdminRole, canAccess, canAccessScope, clearStoredAdminSession, currentRole, currentTenantCode, currentTenantName, currentTenantSettings, isPlatformAdmin, isPlatformScopedAdmin, roleOptions, setStoredAdminSession } from "../permissions";
import { copyToClipboard, h5PreviewUrl, openH5Preview } from "../h5-preview";
import { adminFeatureGateForPath, readStoredFeatureGates, writeStoredFeatureGates } from "../feature-gates";
import { menuGroups, tenantQuickLinks, tenantScopedRoutePaths } from "../navigation/admin-menu";
import { observeAdminTables } from "../accessibility";
import { playAdminPageMotion } from "../motion";

const route = useRoute();
const router = useRouter();
const passwordDialogVisible = ref(false);
const h5QrDialogVisible = ref(false);
const mobileMenuVisible = ref(false);
const mainContent = ref<HTMLElement | { $el?: HTMLElement } | null>(null);
const changingPassword = ref(false);
const passwordForm = reactive({ oldPassword: "", newPassword: "", confirmPassword: "" });
const platformTenants = ref<Array<{ id: number; name?: string; code?: string; enabled?: boolean }>>([]);
const selectedPlatformTenantId = ref(Number(localStorage.getItem("admin_selected_tenant_id") || 0));
const shellBrand = ref<{ adminTitle?: string; brandName?: string; brandLogoUrl?: string }>({});
const featureGates = ref(readStoredFeatureGates());
let stopTableObserver: (() => void) | null = null;
let stopPageMotion: (() => void) | null = null;
const tenantSettings = computed(() => currentTenantSettings());
const roleLabel = computed(() => roleOptions.find((item) => item.value === currentRole())?.label || "管理员");
const shellTitle = computed(() => {
  if (shellBrand.value.adminTitle) return shellBrand.value.adminTitle;
  if (isPlatformAdmin()) return "平台超级管理后台";
  if (isPlatformScopedAdmin()) return "平台运营后台";
  return `${currentTenantName() || shellBrand.value.brandName || "商家"}管理后台`;
});
const roleCapabilityText = computed(() => {
  const role = currentRole();
  if (isPlatformAdmin()) return "平台超管：可管理全平台商家、活动、订单、公益池、系统安全，并拥有会员余额调整权限。";
  if (isPlatformScopedAdmin()) return "平台运营账号：当前仅显示已授权的平台功能，数据范围不下沉到任何商家。";
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
const currentH5PreviewUrl = computed(() => h5PreviewUrl(isPlatformScopedAdmin() ? selectedPlatformTenantCode.value : currentTenantCode()));
const currentH5PreviewLabel = computed(() => (isPlatformScopedAdmin() ? (selectedPlatformTenant.value ? "商家H5" : "平台H5") : "商家H5"));
const visibleTenantQuickLinks = computed(() => tenantQuickLinks.filter((item) => !mallMenuDisabled(item) && !featureMenuDisabled(item)));
const visibleMenuGroups = computed(() =>
  menuGroups
    .filter((group) => canAccessScope(group.scope as any))
    .map((group) => ({ ...group, items: group.items.filter((item) => canShowMenuItem(item)) }))
    .filter((group) => group.items.length)
);
const currentPageLabel = computed(() => menuGroups.flatMap((group) => group.items).find((item) => item.index === route.path)?.label || "后台页面");
const pageAnnouncement = computed(() => `已进入${currentPageLabel.value}`);

function canShowMenuItem(item: { roles?: string[]; scope?: string; index?: string; requiresMallEnabled?: boolean }) {
  return canAccess(item.roles) && canAccessScope(item.scope as any) && !mallMenuDisabled(item) && !featureMenuDisabled(item);
}

function mallMenuDisabled(item: { path?: string; index?: string; requiresMallEnabled?: boolean }) {
  if (isPlatformAdmin()) return false;
  const target = item.path || item.index || "";
  const mallScoped = target.startsWith("/mall-") || Boolean(item.requiresMallEnabled);
  return mallScoped && !tenantSettings.value.mallEnabled;
}

function featureMenuDisabled(item: { path?: string; index?: string }) {
  if (isPlatformScopedAdmin()) return false;
  const target = item.path || item.index || "";
  const gate = adminFeatureGateForPath(target);
  return Boolean(gate && featureGates.value[gate] === false);
}

function redirectIfCurrentFeatureDisabled() {
  if (isPlatformAdmin() || !featureMenuDisabled({ index: route.path })) return;
  const fallback = visibleMenuGroups.value[0]?.items[0]?.index || "/login";
  if (fallback !== route.fullPath) router.replace(fallback);
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
    const setting = canAccess(["operation_settings.view"]) ? await api.get<any, any>("/admin/settings/operation") : null;
    const code = currentTenantCode();
    const publicSetting = isPlatformAdmin() ? null : await api.get<any, any>(`/public/settings/operation${code ? `?tenantCode=${encodeURIComponent(code)}` : ""}`).catch(() => null);
    const theme = (setting || publicSetting)?.pageTheme || {};
    shellBrand.value = {
      adminTitle: String(theme.adminTitle || ""),
      brandName: String(theme.brandName || ""),
      brandLogoUrl: String(theme.brandLogoUrl || "")
    };
    if (isPlatformAdmin()) {
      featureGates.value = writeStoredFeatureGates(setting?.launchConfig?.featureGates);
    } else {
      featureGates.value = writeStoredFeatureGates(publicSetting?.launchConfig?.featureGates);
    }
    redirectIfCurrentFeatureDisabled();
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

function syncSelectedTenantToRoute(preferRoute = true) {
  if (!isPlatformAdmin() || !tenantScopedRoutePaths.has(route.path)) return;
  if (preferRoute && route.query.tenantId !== undefined) {
    const requestedTenantId = typeof route.query.tenantId === 'string' ? Number(route.query.tenantId) : Number.NaN;
    if (!Number.isSafeInteger(requestedTenantId) || requestedTenantId <= 0) return;
    selectedPlatformTenantId.value = requestedTenantId;
    localStorage.setItem('admin_selected_tenant_id', String(requestedTenantId));
    if (!platformTenants.value.some(tenant => tenant.id === requestedTenantId)) void loadPlatformTenants();
    return;
  }
  const nextTenantId = selectedPlatformTenantId.value ? String(selectedPlatformTenantId.value) : undefined;
  const currentTenantId = typeof route.query.tenantId === "string" ? route.query.tenantId : undefined;
  if (currentTenantId === nextTenantId) return;
  router.replace({ path: route.path, query: scopedQueryForTenant() });
}

function handleSelectedTenantChanged() {
  if (selectedPlatformTenantId.value) localStorage.setItem("admin_selected_tenant_id", String(selectedPlatformTenantId.value));
  else localStorage.removeItem("admin_selected_tenant_id");
  syncSelectedTenantToRoute(false);
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
  openH5Preview(isPlatformScopedAdmin() ? selectedPlatformTenantCode.value : currentTenantCode());
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

function focusMainContent() {
  const target = mainContent.value instanceof HTMLElement ? mainContent.value : mainContent.value?.$el;
  target?.focus({ preventScroll: true });
}

function playCurrentPageMotion() {
  stopPageMotion?.();
  const target = mainContent.value instanceof HTMLElement ? mainContent.value : mainContent.value?.$el;
  stopPageMotion = playAdminPageMotion(target?.querySelector("[data-admin-page]") || null);
}

onMounted(() => {
  refreshCurrentAdminContext();
  loadShellBrand();
  loadPlatformTenants();
  syncSelectedTenantToRoute();
  stopTableObserver = observeAdminTables();
  nextTick(playCurrentPageMotion);
});

onBeforeUnmount(() => {
  stopTableObserver?.();
  stopPageMotion?.();
});

watch(
  () => [route.path, route.query.tenantId],
  async () => {
    mobileMenuVisible.value = false;
    syncSelectedTenantToRoute();
    await nextTick();
    focusMainContent();
    playCurrentPageMotion();
  }
);
</script>

<template>
  <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ pageAnnouncement }}</p>
  <el-container class="shell">
    <div class="mobile-nav">
      <div class="mobile-brand">
        <img v-if="shellBrand.brandLogoUrl" class="brand-logo" :src="shellBrand.brandLogoUrl" alt="Logo" />
        <span>{{ shellTitle }}</span>
      </div>
      <el-button class="mobile-menu-button" :icon="MenuIcon" circle title="打开主导航" aria-label="打开主导航" @click="mobileMenuVisible = true" />
    </div>
    <el-aside width="248px" class="aside">
      <div class="brand">
        <img v-if="shellBrand.brandLogoUrl" class="brand-logo" :src="shellBrand.brandLogoUrl" alt="Logo" />
        <span v-else class="brand-seal" aria-hidden="true">慢</span>
        <div class="brand-copy"><strong>{{ shellBrand.brandName || '慢π' }}</strong><small :title="shellTitle">{{ shellTitle }}</small></div>
      </div>
      <el-menu router :default-active="route.path" background-color="#f7f9f5" text-color="#5e6b61" active-text-color="#386151" unique-opened>
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
      <div class="five-elements" aria-hidden="true"><span>金</span><span>木</span><span>水</span><span>火</span><span>土</span></div>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-title">
          <span>{{ shellTitle }} · {{ roleLabel }}</span>
          <small :title="roleCapabilityText">{{ isPlatformAdmin() ? selectedScopeName : currentTenantName() }}</small>
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
          <el-tooltip :content="`复制${currentH5PreviewLabel}链接`"><el-button :icon="CopyDocument" :aria-label="`复制${currentH5PreviewLabel}链接`" :title="`复制${currentH5PreviewLabel}链接`" @click="copyCurrentH5PreviewUrl" /></el-tooltip>
          <el-tooltip :content="`${currentH5PreviewLabel}二维码`"><el-button :icon="Grid" :aria-label="`${currentH5PreviewLabel}二维码`" :title="`${currentH5PreviewLabel}二维码`" @click="openCurrentH5QrDialog" /></el-tooltip>
          <el-tooltip content="修改密码"><el-button :icon="Key" aria-label="修改密码" title="修改密码" @click="openPasswordDialog" /></el-tooltip>
          <el-tooltip content="退出登录"><el-button :icon="SwitchButton" aria-label="退出登录" title="退出登录" @click="logout" /></el-tooltip>
        </div>
      </el-header>
      <el-main ref="mainContent" tabindex="-1" :aria-label="pageAnnouncement" :class="{ 'homepage-builder-main': route.path === '/homepage-builder' }">
        <router-view v-slot="{ Component }">
          <Transition name="admin-page" mode="out-in">
            <div data-admin-page :key="route.fullPath"><component :is="Component" /></div>
          </Transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>

  <el-drawer v-model="mobileMenuVisible" direction="ltr" size="min(320px, 86vw)" :with-header="false" class="mobile-menu-drawer">
    <div class="drawer-head">
      <div class="mobile-brand">
        <img v-if="shellBrand.brandLogoUrl" class="brand-logo" :src="shellBrand.brandLogoUrl" alt="Logo" />
        <span>{{ shellTitle }}</span>
      </div>
      <el-button :icon="Close" circle title="关闭主导航" aria-label="关闭主导航" @click="mobileMenuVisible = false" />
    </div>
    <el-menu router :default-active="route.path" background-color="#f7f9f5" text-color="#5e6b61" active-text-color="#386151" unique-opened @select="mobileMenuVisible = false">
      <el-sub-menu v-for="group in visibleMenuGroups" :key="`mobile-${group.index}`" :index="`mobile-${group.index}`">
        <template #title>
          <el-icon><component :is="group.icon" /></el-icon>
          <span>{{ group.label }}</span>
        </template>
        <el-menu-item v-for="item in group.items" :key="`mobile-${item.index}`" :index="item.index">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ menuItemLabel(item) }}</span>
        </el-menu-item>
      </el-sub-menu>
    </el-menu>
  </el-drawer>

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
.sr-only { position: fixed; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.mobile-nav { display: none; }
.aside { background: #f7f9f5; border-right: 1px solid #d6dfd5; overflow-x: hidden; }
.brand { height: 82px; display: flex; align-items: center; gap: 11px; padding: 0 20px; color: #28332d; font-size: 20px; font-weight: 700; }
.brand-copy { min-width: 0; display: grid; gap: 5px; }
.brand-copy strong { font-family: "STSong", "SimSun", serif; font-size: 27px; }
.brand-copy span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.brand-copy small { color: #707a73; font-size: 11px; font-weight: 400; overflow-wrap: anywhere; }
.brand span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.brand-logo { width: 36px; height: 40px; object-fit: contain; border: 3px double #a33d36; border-radius: 2px; background: #fff; padding: 3px; flex: 0 0 auto; }
.brand-seal { display: grid; place-items: center; width: 34px; height: 39px; border: 3px double #a33d36; color: #a33d36; font: 23px "STSong", "SimSun", serif; flex-shrink: 0; }
.five-elements { display: flex; gap: 10px; padding: 24px 22px; }
.five-elements span { display: grid; place-items: center; width: 24px; height: 26px; border: 1px solid currentColor; font: 14px "STSong", "SimSun", serif; color: #9b813e; }
.five-elements span:nth-child(2) { color: #386151; }
.five-elements span:nth-child(3) { color: #526f79; }
.five-elements span:nth-child(4) { color: #a33d36; }
.five-elements span:nth-child(5) { color: #857456; }
.header { height: auto; min-height: 68px; padding: 12px 24px; background: #fff; border-bottom: 1px solid #e2e7e1; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
.header-title { min-width: 0; display: grid; gap: 3px; }
.header-title span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: "STSong", "SimSun", "Noto Serif CJK SC", serif; font-size: 16px; }
.header-title small { color: #707a73; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.header-actions :deep(.el-button + .el-button) { margin-left: 0; }
:deep(.el-main) { min-width: 0; padding: 0; background: #fff; }
.tenant-switcher { display: flex; align-items: center; gap: 8px; color: #475569; font-size: 12px; }
.tenant-switcher .el-select { width: 220px; }
.homepage-builder-main { overflow: visible; }
.admin-page-enter-active,
.admin-page-leave-active { transition: opacity 180ms ease, transform 180ms cubic-bezier(.2, .7, .2, 1); }
.admin-page-enter-from { opacity: 0; transform: translateY(8px); }
.admin-page-leave-to { opacity: 0; transform: translateY(-4px); }
.el-menu { border-right: 0; background: transparent !important; }
:deep(.el-sub-menu__title) { height: 46px; color: #68756b; font-weight: 700; }
:deep(.el-sub-menu__title:hover), :deep(.el-menu-item:hover) { background-color: #eaf1e8; }
:deep(.el-menu-item) { height: 42px; padding-left: 44px !important; color: #5e6b61; }
:deep(.el-menu-item.is-active) { background: #e1ece0; color: #386151; border-left: 3px solid #a33d36; font-weight: 700; }
.drawer-head { min-height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; color: #28332d; background: #f7f9f5; border-bottom: 1px solid #d6dfd5; }
.mobile-brand { min-width: 0; display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 700; }
.mobile-brand span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:global(.mobile-menu-drawer .el-drawer__body) { padding: 0; background: #f7f9f5; overflow-y: auto; }
:global(.mobile-menu-drawer .el-menu) { border-right: 0; }

@media (max-width: 768px) {
  .shell { display: block; }
  .mobile-nav { height: 54px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 12px 0 14px; color: #28332d; background: #f7f9f5; border-bottom: 1px solid #d6dfd5; }
  .mobile-nav .mobile-brand { flex: 1; }
  .mobile-menu-button { flex: 0 0 auto; }
  .aside { display: none; }
  .header { height: auto; min-height: 56px; padding: 10px 12px; align-items: flex-start; flex-wrap: wrap; }
  .header-title { width: 100%; }
  .header-actions { width: 100%; justify-content: flex-start; gap: 8px; }
  .tenant-switcher { width: 100%; align-items: flex-start; flex-wrap: wrap; }
  .tenant-switcher .el-select { width: min(260px, 100%); }
  :deep(.el-main) { padding: 12px; min-width: 0; overflow-x: hidden; }
}
</style>

