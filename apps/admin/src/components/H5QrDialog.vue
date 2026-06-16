<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import QRCode from "qrcode";
import { copyToClipboard } from "../h5-preview";

const props = defineProps<{
  modelValue: boolean;
  title?: string;
  scopeName?: string;
  url: string;
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
});
const qrDataUrl = ref("");
const loading = ref(false);
const dialogTitle = computed(() => props.title || "H5 预览二维码");
const scopeLabel = computed(() => props.scopeName || "当前 H5");

async function generateQrCode() {
  if (!props.modelValue || !props.url) return;
  loading.value = true;
  try {
    qrDataUrl.value = await QRCode.toDataURL(props.url, {
      errorCorrectionLevel: "M",
      width: 260,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" }
    });
  } catch (error: any) {
    qrDataUrl.value = "";
    ElMessage.error(error?.message || "二维码生成失败");
  } finally {
    loading.value = false;
  }
}

async function copyUrl() {
  await copyToClipboard(props.url);
  ElMessage.success("H5 链接已复制");
}

function downloadQrCode() {
  if (!qrDataUrl.value) return;
  const link = document.createElement("a");
  link.href = qrDataUrl.value;
  link.download = `${scopeLabel.value.replace(/[\\/:*?"<>|\\s]+/g, "-") || "h5"}-qrcode.png`;
  link.click();
}

watch(() => [props.modelValue, props.url], generateQrCode, { immediate: true });
</script>

<template>
  <el-dialog v-model="visible" :title="dialogTitle" width="380px" destroy-on-close>
    <div class="qr-dialog" v-loading="loading">
      <strong>{{ scopeLabel }}</strong>
      <div class="qr-frame">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="H5 预览二维码" />
        <span v-else>暂无二维码</span>
      </div>
      <p>{{ url }}</p>
    </div>
    <template #footer>
      <el-button @click="copyUrl">复制链接</el-button>
      <el-button type="primary" :disabled="!qrDataUrl" @click="downloadQrCode">下载二维码</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.qr-dialog { display: grid; gap: 12px; justify-items: center; text-align: center; }
.qr-dialog strong { color: #111827; font-size: 16px; }
.qr-frame { width: 280px; height: 280px; display: grid; place-items: center; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.qr-frame img { width: 260px; height: 260px; object-fit: contain; }
.qr-frame span { color: #98a2b3; }
.qr-dialog p { width: 100%; margin: 0; padding: 8px 10px; border-radius: 6px; background: #f8fafc; color: #475467; font-size: 12px; line-height: 1.5; word-break: break-all; }
</style>
