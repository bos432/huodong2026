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
  <div class="page">
    <div class="toolbar"><h2>签到核销</h2></div>
    <div class="table-card check-card">
      <el-form label-position="top" @keyup.enter="submit">
        <el-form-item label="签到码" required>
          <el-input v-model="form.code" size="large" placeholder="扫码后粘贴，或手动输入签到码" autofocus />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" placeholder="可填写现场备注" /></el-form-item>
        <div class="actions">
          <el-button type="primary" size="large" :icon="Finished" :loading="loading" @click="submit">核销签到</el-button>
          <el-button size="large" :icon="RefreshLeft" @click="reset">清空</el-button>
        </div>
      </el-form>

      <el-descriptions v-if="result" class="result" title="最近核销" border :column="1">
        <el-descriptions-item label="活动">{{ result.registration?.activity?.title || "-" }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ result.registration?.user?.phone || result.registration?.user?.nickname || "-" }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ formatTime(result.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
    <QrScanDialog v-if="scanDialogVisible" @scan="onScan" @close="scanDialogVisible = false" />
</template>

<style scoped>
.check-card { max-width: 720px; }
.actions { display: flex; gap: 10px; }
.result { margin-top: 22px; }
</style>
