<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import QRCode from "qrcode";
import { copyToClipboard } from "../h5-preview";

const props = defineProps<{
  modelValue: boolean;
  activity: any | null;
  tenantName?: string;
  url: string;
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
});
const canvasRef = ref<HTMLCanvasElement | null>(null);
const posterDataUrl = ref("");
const loading = ref(false);
const title = computed(() => props.activity?.title || "活动海报");
const scopeName = computed(() => props.tenantName || props.activity?.tenant?.name || props.activity?.tenant?.code || "七维文化");

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function money(value?: string | number) {
  const amount = Number(value || 0);
  return amount > 0 ? `¥${amount.toFixed(2)}` : "免费报名";
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const chars = Array.from(text || "");
  let line = "";
  let lineCount = 0;
  for (const char of chars) {
    const nextLine = line + char;
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      lineCount += 1;
      const isLastLine = lineCount >= maxLines;
      ctx.fillText(isLastLine ? `${line.slice(0, Math.max(0, line.length - 1))}...` : line, x, y);
      if (isLastLine) return y + lineHeight;
      line = char;
      y += lineHeight;
    } else {
      line = nextLine;
    }
  }
  if (line && lineCount < maxLines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function loadImage(src?: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null) {
  const x = 52;
  const y = 74;
  const width = 796;
  const height = 430;
  drawRoundRect(ctx, x, y, width, height, 28);
  ctx.save();
  ctx.clip();
  if (image) {
    const scale = Math.max(width / image.width, height / image.height);
    const sw = width / scale;
    const sh = height / scale;
    const sx = (image.width - sw) / 2;
    const sy = (image.height - sh) / 2;
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, "#f7f2e8");
    gradient.addColorStop(0.48, "#dbeafe");
    gradient.addColorStop(1, "#dcfce7");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "rgba(17,24,39,0.72)";
    ctx.font = "bold 46px sans-serif";
    ctx.fillText("七维文化", x + 44, y + 120);
    ctx.font = "28px sans-serif";
    ctx.fillText("城市活动与课程报名", x + 44, y + 170);
  }
  const shade = ctx.createLinearGradient(x, y + 260, x, y + height);
  shade.addColorStop(0, "rgba(15,23,42,0)");
  shade.addColorStop(1, "rgba(15,23,42,0.44)");
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

async function renderPoster() {
  if (!props.modelValue || !props.activity || !props.url) return;
  await nextTick();
  const canvas = canvasRef.value;
  if (!canvas) return;
  loading.value = true;
  try {
    const width = 900;
    const height = 1400;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f6f1e7";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    drawRoundRect(ctx, 30, 34, 840, 1332, 30);
    ctx.fill();

    const [cover, qrDataUrl] = await Promise.all([
      loadImage(props.activity.coverUrl),
      QRCode.toDataURL(props.url, { errorCorrectionLevel: "M", width: 270, margin: 2, color: { dark: "#111827", light: "#ffffff" } })
    ]);
    drawCover(ctx, cover);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 44px sans-serif";
    let y = drawWrappedText(ctx, title.value, 74, 585, 752, 62, 3);

    ctx.fillStyle = "#7c2d12";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(money(props.activity.price), 74, y + 38);
    y += 86;

    ctx.fillStyle = "#334155";
    ctx.font = "28px sans-serif";
    ctx.fillText(`时间：${formatTime(props.activity.startTime)}`, 74, y);
    y += 48;
    y = drawWrappedText(ctx, `地点：${props.activity.location || "-"}`, 74, y, 752, 44, 2) + 8;
    ctx.fillText(`主办：${scopeName.value}`, 74, y);

    ctx.fillStyle = "#f8fafc";
    drawRoundRect(ctx, 64, 985, 772, 286, 24);
    ctx.fill();
    const qrImage = await loadImage(qrDataUrl);
    if (qrImage) ctx.drawImage(qrImage, 92, 1018, 220, 220);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText("扫码查看活动详情", 348, 1065);
    ctx.fillStyle = "#64748b";
    ctx.font = "24px sans-serif";
    drawWrappedText(ctx, "报名、付款、签到和活动通知均以 H5 页面为准。", 348, 1112, 420, 38, 3);
    ctx.font = "20px sans-serif";
    drawWrappedText(ctx, props.url, 348, 1222, 420, 28, 2);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "22px sans-serif";
    ctx.fillText("七维文化城市合伙人运营 SaaS", 74, 1324);
    posterDataUrl.value = canvas.toDataURL("image/png");
  } catch (error: any) {
    posterDataUrl.value = "";
    ElMessage.error(error?.message || "活动海报生成失败");
  } finally {
    loading.value = false;
  }
}

async function copyUrl() {
  await copyToClipboard(props.url);
  ElMessage.success("活动 H5 链接已复制");
}

function downloadPoster() {
  if (!posterDataUrl.value) return;
  const safeTitle = String(title.value).replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 40) || "activity";
  const link = document.createElement("a");
  link.href = posterDataUrl.value;
  link.download = `${safeTitle}-poster.png`;
  link.click();
}

watch(() => [props.modelValue, props.url, props.activity?.id], renderPoster, { immediate: true });
</script>

<template>
  <el-dialog v-model="visible" title="活动推广海报" width="440px" destroy-on-close>
    <div class="poster-dialog" v-loading="loading">
      <canvas ref="canvasRef" class="poster-canvas" />
      <p>{{ url }}</p>
    </div>
    <template #footer>
      <el-button @click="copyUrl">复制链接</el-button>
      <el-button type="primary" :disabled="!posterDataUrl" @click="downloadPoster">下载海报</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.poster-dialog { display: grid; gap: 12px; justify-items: center; text-align: center; }
.poster-canvas { width: 300px; aspect-ratio: 9 / 14; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8fafc; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12); }
.poster-dialog p { width: 100%; margin: 0; padding: 8px 10px; border-radius: 6px; background: #f8fafc; color: #475467; font-size: 12px; line-height: 1.5; word-break: break-all; }
</style>
