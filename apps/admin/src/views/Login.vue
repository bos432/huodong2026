<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Unlock } from "@element-plus/icons-vue";
import { api } from "../api";
import { setStoredAdminSession } from "../permissions";

const router = useRouter();
const form = reactive({ username: "", password: "" });
async function submit() {
  if (!form.username.trim()) return ElMessage.error("请输入用户名");
  if (!form.password) return ElMessage.error("请输入密码");
  try {
    const data = await api.post<any, { token: string; admin?: { username: string; role: string; tenantId?: number | null; permissions?: string[]; tenant?: { code?: string; name?: string; settings?: Record<string, unknown> } | null } }>("/admin/auth/login", form);
    localStorage.setItem("admin_token", data.token);
    if (data.admin) {
      setStoredAdminSession(data.admin);
    }
    router.push(data.admin?.tenantId ? "/dashboard" : "/tenants");
  } catch (error: any) {
    ElMessage.error(error.message);
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <h1>活动报名后台</h1>
      <el-form label-position="top" @keyup.enter="submit">
        <el-form-item label="用户名"><el-input v-model="form.username" autocomplete="username" placeholder="请输入管理员账号" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" type="password" show-password autocomplete="current-password" placeholder="请输入密码" /></el-form-item>
        <el-button type="primary" size="large" :icon="Unlock" @click="submit">登录</el-button>
      </el-form>
    </section>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; background: #edf2f7; }
.login-panel { width: 360px; background: #fff; border: 1px solid #dde4ee; border-radius: 8px; padding: 28px; }
h1 { margin: 0 0 24px; font-size: 24px; }
.el-button { width: 100%; }
</style>
