<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { api } from "../api";

const route = useRoute();
const router = useRouter();
const token = computed(() => String(route.query.token || ""));
const loading = ref(true);
const saving = ref(false);
const invite = ref<any>(null);
const form = reactive({ password: "", confirmPassword: "" });

function passwordError() {
  if (form.password.length < 10) return "密码至少需要 10 位";
  if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password)) return "密码需要包含大小写字母和数字";
  if (form.password !== form.confirmPassword) return "两次输入的密码不一致";
  return "";
}

async function load() {
  if (!token.value) { loading.value = false; return; }
  try { invite.value = await api.get(`/admin/auth/invitations/${encodeURIComponent(token.value)}`); }
  catch (error: any) { ElMessage.error(error.message || "邀请无效"); }
  finally { loading.value = false; }
}

async function accept() {
  const error = passwordError();
  if (error) return ElMessage.error(error);
  saving.value = true;
  try {
    await api.post("/admin/auth/invitations/accept", { token: token.value, password: form.password });
    ElMessage.success("账号已开通，请登录");
    router.replace("/login");
  } catch (error: any) { ElMessage.error(error.message || "接受邀请失败"); }
  finally { saving.value = false; }
}

onMounted(load);
</script>

<template>
  <main class="invite-page" v-loading="loading">
    <section class="invite-panel">
      <h1>开通后台账号</h1>
      <el-result v-if="!loading && !invite" icon="error" title="邀请无效或已过期"><template #extra><el-button @click="router.push('/login')">返回登录</el-button></template></el-result>
      <template v-else-if="invite">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="账号">{{ invite.username }}</el-descriptions-item>
          <el-descriptions-item label="所属机构">{{ invite.tenant?.name || "平台" }}</el-descriptions-item>
          <el-descriptions-item label="有效期至">{{ String(invite.expiresAt).replace('T', ' ').slice(0, 16) }}</el-descriptions-item>
        </el-descriptions>
        <el-form label-position="top" @keyup.enter="accept">
          <el-form-item label="设置密码"><el-input v-model="form.password" type="password" show-password autocomplete="new-password" /></el-form-item>
          <el-form-item label="确认密码"><el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" /></el-form-item>
          <el-button type="primary" :loading="saving" @click="accept">开通账号</el-button>
        </el-form>
      </template>
    </section>
  </main>
</template>

<style scoped>
.invite-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #edf2f7; }
.invite-panel { width: min(440px, 100%); background: #fff; border: 1px solid #dde4ee; border-radius: 8px; padding: 28px; }
h1 { margin: 0 0 20px; font-size: 24px; }
.el-form { margin-top: 20px; }
.el-button { width: 100%; }
</style>
