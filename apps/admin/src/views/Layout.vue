<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { CopyDocument, Grid, Key, SwitchButton, View } from "@element-plus/icons-vue";
import { api } from "../api";
import H5QrDialog from "../components/H5QrDialog.vue";
import { AdminRole, canAccess, canAccessScope, currentRole, currentTenantCode, currentTenantName, isPlatformAdmin, permissions, roleOptions } from "../permissions";
import { copyToClipboard, h5PreviewUrl, openH5Preview } from "../h5-preview";

const route = useRoute();
const router = useRouter();
const passwordDialogVisible = ref(false);
const h5QrDialogVisible = ref(false);
const changingPassword = ref(false);
const passwordForm = reactive({ oldPassword: "", newPassword: "", confirmPassword: "" });
const roleLabel = computed(() => roleOptions.find((item) => item.value === currentRole())?.label || "管理员");
const shellTitle = computed(() => (isPlatformAdmin() ? "平台超级管理后台" : `${currentTenantName() || "商家"}管理后台`));
const currentH5PreviewUrl = computed(() => h5PreviewUrl(isPlatformAdmin() ? "" : currentTenantCode()));
const currentH5PreviewLabel = computed(() => (isPlatformAdmin() ? "平台H5" : "商家H5"));
const menuGroups = [
  {
    index: "platform",
    icon: "OfficeBuilding",
    label: "平台总控",
    scope: "platform",
    items: [
      { index: "/dashboard", icon: "DataAnalysis", label: "全局数据看板", roles: permissions.operation, scope: "any" },
      { index: "/analytics", icon: "TrendCharts", label: "数据中心", roles: permissions.overview, scope: "any" },
      { index: "/tenants", icon: "OfficeBuilding", label: "商家/代理列表", roles: permissions.superAdmin, scope: "platform" },
      { index: "/admins", icon: "UserFilled", label: "商家账号", roles: permissions.superAdmin, scope: "any" },
      { index: "/tenants?mode=permissions", icon: "Setting", label: "权限配置", roles: permissions.superAdmin, scope: "platform" },
      { index: "/activities?status=pending_approval", icon: "Calendar", label: "活动审核", roles: permissions.operation, scope: "any" },
      { index: "/announcements", icon: "Bell", label: "公告监管", roles: permissions.operation, scope: "platform" },
      { index: "/homepage-builder", icon: "Grid", label: "H5全局装修", roles: permissions.operation, scope: "platform" }
    ]
  },
  {
    index: "platform-operation",
    icon: "Tickets",
    label: "运营监管",
    scope: "platform",
    items: [
      { index: "/registrations", icon: "Tickets", label: "全局报名", roles: permissions.registrationView, scope: "platform" },
      { index: "/activities?status=all", icon: "Calendar", label: "全部活动", roles: permissions.activityView, scope: "platform" }
    ]
  },
  {
    index: "platform-finance",
    icon: "Wallet",
    label: "财务监管",
    scope: "platform",
    items: [
      { index: "/orders", icon: "Wallet", label: "全局订单", roles: permissions.finance, scope: "platform" },
      { index: "/finance", icon: "CreditCard", label: "全局对账", roles: permissions.finance, scope: "platform" },
      { index: "/charity", icon: "Coin", label: "公益池", roles: permissions.overview, scope: "platform" },
      { index: "/agents", icon: "Shop", label: "商家收款账户", roles: permissions.superAdmin, scope: "platform" }
    ]
  },
  {
    index: "overview",
    icon: "DataAnalysis",
    label: "商家概览",
    scope: "tenant",
    items: [
      { index: "/dashboard", icon: "DataAnalysis", label: "数据看板", roles: permissions.overview },
      { index: "/analytics", icon: "TrendCharts", label: "数据中心", roles: permissions.overview },
      { index: "/funnels", icon: "TrendCharts", label: "活动漏斗", roles: permissions.operation },
      { index: "/recaps", icon: "PieChart", label: "活动复盘", roles: permissions.operation }
    ]
  },
  {
    index: "activity",
    icon: "Calendar",
    label: "活动运营",
    scope: "tenant",
    items: [
      { index: "/activities", icon: "Calendar", label: "活动管理", roles: permissions.activityView },
      { index: "/categories", icon: "CollectionTag", label: "分类管理", roles: permissions.operation },
      { index: "/announcements", icon: "Bell", label: "公告管理", roles: permissions.operation },
      { index: "/homepage-builder", icon: "Grid", label: "首页装修", roles: permissions.operation },
      { index: "/notifications", icon: "Message", label: "通知中心", roles: permissions.operation },
      { index: "/reviews", icon: "ChatDotRound", label: "评价管理", roles: permissions.operation }
    ]
  },
  {
    index: "registration",
    icon: "Tickets",
    label: "报名与现场",
    scope: "tenant",
    items: [
      { index: "/registrations", icon: "Tickets", label: "报名管理", roles: permissions.registrationView },
      { index: "/waitlists", icon: "List", label: "候补管理", roles: permissions.operation },
      { index: "/check-in", icon: "Finished", label: "签到核销", roles: permissions.checkIn }
    ]
  },
  {
    index: "trade",
    icon: "Wallet",
    label: "票务与财务",
    scope: "tenant",
    items: [
      { index: "/ticket-types", icon: "Sell", label: "票种管理", roles: permissions.operation },
      { index: "/coupons", icon: "Discount", label: "优惠码", roles: permissions.operation },
      { index: "/agents", icon: "Shop", label: "收款方式", roles: permissions.paymentAccountView },
      { index: "/agent-settlements", icon: "Money", label: "代理结算", roles: permissions.finance },
      { index: "/orders", icon: "Wallet", label: "订单管理", roles: permissions.finance },
      { index: "/finance", icon: "CreditCard", label: "财务对账", roles: permissions.finance }
    ]
  },
  {
    index: "user",
    icon: "User",
    label: "用户与会员",
    scope: "tenantOrPlatformAdmin",
    items: [
      { index: "/members", icon: "User", label: "会员管理", roles: permissions.operation, scope: "tenantOrPlatformAdmin" },
      { index: "/tags", icon: "PriceTag", label: "用户标签", roles: permissions.operation, scope: "tenant" }
    ]
  },
  {
    index: "charity",
    icon: "Coin",
    label: "公益运营",
    scope: "tenant",
    items: [
      { index: "/charity", icon: "Coin", label: "公益池", roles: permissions.overview }
    ]
  },
  {
    index: "system",
    icon: "Tools",
    label: "系统与安全",
    scope: "any",
    items: [
      { index: "/system-settings", icon: "Tools", label: "系统设置", roles: permissions.superAdmin, scope: "platform" },
      { index: "/system-settings", icon: "Tools", label: "运营设置", roles: permissions.superAdmin, scope: "tenant" },
      { index: "/tenant-profile", icon: "Shop", label: "商家资料", roles: permissions.superAdmin, scope: "tenant" },
      { index: "/config-check", icon: "Monitor", label: "上线体检", roles: permissions.superAdmin, scope: "platform" },
      { index: "/ops-routine", icon: "List", label: "运营巡检", roles: permissions.superAdmin, scope: "platform" },
      { index: "/admins", icon: "UserFilled", label: "员工账号", roles: permissions.superAdmin, scope: "tenant" },
      { index: "/operation-logs", icon: "Document", label: "操作日志", roles: permissions.superAdmin, scope: "any" },
      { index: "/admin-login-logs", icon: "Key", label: "登录日志", roles: permissions.superAdmin, scope: "platform" },
      { index: "/h5-code-logs", icon: "Lock", label: "验证码日志", roles: permissions.superAdmin, scope: "platform" }
    ]
  }
];
const visibleMenuGroups = computed(() =>
  menuGroups
    .filter((group) => canAccessScope(group.scope as any))
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccess(item.roles) && canAccessScope((item as any).scope)) }))
    .filter((group) => group.items.length)
);
const defaultOpeneds = computed(() => visibleMenuGroups.value.map((group) => group.index));

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
  openH5Preview(isPlatformAdmin() ? "" : currentTenantCode());
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
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_username");
  localStorage.removeItem("admin_role");
  localStorage.removeItem("admin_tenant_id");
  localStorage.removeItem("admin_tenant_name");
  localStorage.removeItem("admin_tenant_code");
  localStorage.removeItem("admin_tenant_settings");
  router.push("/login");
}
</script>

<template>
  <el-container class="shell">
    <el-aside width="248px" class="aside">
      <div class="brand">{{ shellTitle }}</div>
      <el-menu router :default-active="route.fullPath" :default-openeds="defaultOpeneds" background-color="#162033" text-color="#d8dee9" active-text-color="#ffffff" unique-opened>
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
        <span>{{ shellTitle }} · {{ roleLabel }}</span>
        <div class="header-actions">
          <el-button :icon="View" @click="openCurrentH5Preview">打开{{ currentH5PreviewLabel }}</el-button>
          <el-button :icon="CopyDocument" @click="copyCurrentH5PreviewUrl">复制{{ currentH5PreviewLabel }}</el-button>
          <el-button :icon="Grid" @click="openCurrentH5QrDialog">{{ currentH5PreviewLabel }}二维码</el-button>
          <el-button :icon="Key" @click="openPasswordDialog">修改密码</el-button>
          <el-button :icon="SwitchButton" @click="logout">退出</el-button>
        </div>
      </el-header>
      <el-main><router-view /></el-main>
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
.brand { height: 60px; display: flex; align-items: center; padding: 0 20px; color: #fff; font-size: 20px; font-weight: 700; }
.header { background: #fff; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.header > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 10px; }
.el-menu { border-right: 0; }
:deep(.el-sub-menu__title) { height: 46px; color: #b7c2d6; font-weight: 700; }
:deep(.el-sub-menu__title:hover), :deep(.el-menu-item:hover) { background-color: #1e2b43; }
:deep(.el-menu-item) { height: 42px; padding-left: 44px !important; }
:deep(.el-menu-item.is-active) { background: #243653; font-weight: 700; }
</style>
