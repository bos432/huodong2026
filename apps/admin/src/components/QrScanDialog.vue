<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { Html5Qrcode } from "html5-qrcode";

const emit = defineEmits<{
  (event: "close"): void;
  (event: "scan", code: string): void;
}>();

const scannerId = "qr-scanner-element";
const visible = ref(true);
const scanning = ref(false);
const error = ref("");
let scanner: Html5Qrcode | null = null;

onMounted(async () => {
  try {
    scanner = new Html5Qrcode(scannerId, { verbose: false });
    scanning.value = true;
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText: string) => {
        stopScan();
        emit("scan", decodedText);
      },
      () => {}
    );
  } catch (err: any) {
    error.value = err?.message || "???????";
    scanning.value = false;
  }
});

function stopScan() {
  scanner?.stop().catch(() => {});
  scanning.value = false;
}

function close() {
  stopScan();
  visible.value = false;
  emit("close");
}

function handleManualEntry() {
  close();
}

onUnmounted(() => {
  stopScan();
});
</script>

<template>
  <div v-if="visible" class="scan-mask" @click.self="close">
    <div class="scan-dialog">
      <div class="scan-header">
        <strong>????</strong>
        <span class="scan-close" @click="close">??</span>
      </div>
      <div class="scan-body">
        <div v-if="error" class="scan-error">{{ error }}</div>
        <div v-else-if="!scanning" class="scan-error">??????…</div>
        <div :id="scannerId" class="scanner-frame" />
        <p class="scan-hint">???????????????</p>
      </div>
      <div class="scan-footer">
        <span class="scan-link" @click="handleManualEntry">????</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scan-mask {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
}
.scan-dialog {
  width: min(480px, 90vw);
  background: #fff; border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 24px 48px rgba(0,0,0,0.2);
}
.scan-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #e5e7eb;
}
.scan-header strong { font-size: 16px; color: #111827; }
.scan-close { color: #64748b; cursor: pointer; font-size: 14px; }
.scan-close:hover { color: #111827; }
.scan-body { padding: 24px; text-align: center; }
.scanner-frame {
  width: 100%; aspect-ratio: 1; max-width: 360px;
  margin: 0 auto; border-radius: 8px; overflow: hidden;
  background: #f1f5f9;
}
.scan-error { padding: 40px 16px; color: #dc2626; font-size: 14px; }
.scan-hint { margin-top: 14px; color: #64748b; font-size: 13px; }
.scan-footer { padding: 14px 24px; text-align: center; border-top: 1px solid #e5e7eb; }
.scan-link { color: #0f766e; cursor: pointer; font-size: 14px; }
.scan-link:hover { text-decoration: underline; }
</style>