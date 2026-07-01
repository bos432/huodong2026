<script setup lang="ts">
import { reactive, ref } from "vue";
import { Camera, Finished, RefreshLeft } from "@element-plus/icons-vue";
import QrScanDialog from "../components/QrScanDialog.vue";
import { ElMessage } from "element-plus";
import { api } from "../api";

const form = reactive({ code: "", remark: "" });
const scanDialogVisible = ref(false);
const loading = ref(false);
const result = ref<any>(null);

async function submit() {
  if (!form.code.trim()) {
    ElMessage.warning("请输入签到码");
    return;
  }
  loading.value = true;
  try {
    result.value = await api.post<any, any>("/admin/check-ins", { code: form.code.trim(), remark: form.remark.trim() || undefined });
    ElMessage.success("签到核销成功");
    form.code = "";
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    loading.value = false;
  }
}

function onScan(code: string) {
  form.code = code;
  scanDialogVisible.value = false;
  submit();
}

function openScanner() {
  scanDialogVisible.value = true;
}

function reset() {
  form.code = "";
  form.remark = "";
  result.value = null;
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}
</script>

<template>
  <div class="page check-page">
    <div class="toolbar check-toolbar">
      <div>
        <h2>签到核销</h2>
        <p>现场模式：粘贴核销码或扫码后直接核销。</p>
      </div>
      <el-button :icon="Camera" size="large" @click="openScanner">扫码</el-button>
    </div>
    <div class="table-card check-card">
      <el-form label-position="top" @keyup.enter="submit">
        <el-form-item label="签到码" required>
          <el-input v-model="form.code" class="code-input" size="large" placeholder="扫码后粘贴，或手动输入签到码" autofocus />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" placeholder="可填写现场备注" /></el-form-item>
        <div class="actions">
          <el-button size="large" :icon="Camera" @click="openScanner">扫码</el-button>
          <el-button type="primary" size="large" :icon="Finished" :loading="loading" @click="submit">核销签到</el-button>
          <el-button size="large" :icon="RefreshLeft" @click="reset">清空</el-button>
        </div>
      </el-form>

      <el-descriptions v-if="result" class="result" title="最近核销" border :column="1">
        <el-descriptions-item label="活动">{{ result.registration?.activity?.title || "-" }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ result.registration?.user?.nickname || "-" }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ result.registration?.user?.phone || "-" }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ formatTime(result.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
    <QrScanDialog v-if="scanDialogVisible" @scan="onScan" @close="scanDialogVisible = false" />
</template>

<style scoped>
.check-page { min-width: 0; }
.check-toolbar { align-items: flex-start; gap: 12px; }
.check-toolbar p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
.check-card { width: min(720px, 100%); max-width: 720px; min-width: 0; box-sizing: border-box; }
.code-input { width: 100%; }
:deep(.el-input), :deep(.el-input__wrapper) { width: 100%; min-width: 0; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; }
.result { margin-top: 22px; }

@media (max-width: 768px) {
  .check-toolbar { display: grid; grid-template-columns: 1fr; }
  .check-card { width: 100%; padding: 14px; }
  .actions { display: grid; grid-template-columns: 1fr; }
  .actions .el-button { width: 100%; margin-left: 0; }
}
</style>
