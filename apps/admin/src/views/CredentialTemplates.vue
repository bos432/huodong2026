<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Clock, Refresh, Upload } from "@element-plus/icons-vue";
import { api } from "../api";
import { canAccess } from "../permissions";

type TemplateConfig = {
  title: string; englishTitle: string; description: string; detailLabel: string; issuerName: string; statement: string;
  primaryColor: string; accentColor: string; textColor: string; backgroundColor: string; borderColor: string;
  logoText: string; logoUrl: string | null; backgroundImageUrl: string | null; sealUrl: string | null; signatureUrl: string | null;
  numberPrefix: string; publicHolderMode: "masked" | "full" | "hidden";
};
type TemplateRow = {
  templateKey: string; label: string; draftConfig: TemplateConfig; publishedVersion: number; publishedAt: string | null;
  effectiveSource: "tenant" | "platform" | "default"; effectiveVersion: number; hasUnpublishedChanges: boolean;
};

const loading = ref(false);
const saving = ref(false);
const publishing = ref(false);
const previewing = ref(false);
const uploading = ref("");
const rows = ref<TemplateRow[]>([]);
const activeKey = ref("");
const previewSvg = ref("");
const historyVisible = ref(false);
const versions = ref<any[]>([]);
const publishNote = ref("");
const form = reactive<TemplateConfig>({
  title: "", englishTitle: "", description: "", detailLabel: "", issuerName: "", statement: "",
  primaryColor: "#315c4c", accentColor: "#b98b5d", textColor: "#475467", backgroundColor: "#eef5f0", borderColor: "#a4bda9",
  logoText: "慢π", logoUrl: null, backgroundImageUrl: null, sealUrl: null, signatureUrl: null, numberPrefix: "MPC", publicHolderMode: "masked"
});
const canManage = computed(() => canAccess(["certificate_template.manage"]));
const active = computed(() => rows.value.find((item) => item.templateKey === activeKey.value) || null);
const sourceText = computed(() => ({ tenant: "当前商家", platform: "平台模板", default: "系统默认" }[active.value?.effectiveSource || "default"]));
const assetFields = [
  { key: "logoUrl", label: "Logo 图片" },
  { key: "backgroundImageUrl", label: "背景图片" },
  { key: "sealUrl", label: "印章图片" },
  { key: "signatureUrl", label: "签名图片" }
] as const;

function assignForm(config: TemplateConfig) {
  Object.assign(form, JSON.parse(JSON.stringify(config)));
}

async function load() {
  loading.value = true;
  try {
    rows.value = await api.get<any, TemplateRow[]>("/admin/credential-templates");
    if (!activeKey.value || !rows.value.some((item) => item.templateKey === activeKey.value)) activeKey.value = rows.value[0]?.templateKey || "";
    const row = rows.value.find((item) => item.templateKey === activeKey.value);
    if (row) assignForm(row.draftConfig);
  } catch (error: any) {
    ElMessage.error(error.message || "证书模板加载失败");
  } finally {
    loading.value = false;
  }
}

async function preview() {
  if (!activeKey.value) return;
  previewing.value = true;
  try {
    const result = await api.post<any, any>(`/admin/credential-templates/${activeKey.value}/preview`, { config: form });
    previewSvg.value = result.svg || "";
  } catch (error: any) {
    ElMessage.error(error.message || "模板预览失败");
  } finally {
    previewing.value = false;
  }
}

async function saveDraft() {
  saving.value = true;
  try {
    const updated = await api.put<any, TemplateRow>(`/admin/credential-templates/${activeKey.value}/draft`, { config: form });
    const index = rows.value.findIndex((item) => item.templateKey === activeKey.value);
    if (index >= 0) rows.value[index] = updated;
    assignForm(updated.draftConfig);
    await preview();
    ElMessage.success("草稿已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "草稿保存失败");
  } finally {
    saving.value = false;
  }
}

async function publish() {
  await ElMessageBox.confirm("发布后仅影响新发证书，已发证书继续使用原版本。确认发布？", "发布证书模板", { type: "warning" });
  publishing.value = true;
  try {
    await api.put(`/admin/credential-templates/${activeKey.value}/draft`, { config: form });
    const updated = await api.post<any, TemplateRow>(`/admin/credential-templates/${activeKey.value}/publish`, { note: publishNote.value });
    const index = rows.value.findIndex((item) => item.templateKey === activeKey.value);
    if (index >= 0) rows.value[index] = updated;
    publishNote.value = "";
    assignForm(updated.draftConfig);
    ElMessage.success(`模板 v${updated.publishedVersion} 已发布`);
  } catch (error: any) {
    ElMessage.error(error.message || "模板发布失败");
  } finally {
    publishing.value = false;
  }
}

async function openHistory() {
  versions.value = await api.get<any, any[]>(`/admin/credential-templates/${activeKey.value}/versions`);
  historyVisible.value = true;
}

async function restore(version: number) {
  await ElMessageBox.confirm(`将 v${version} 恢复为当前草稿？线上已发布版本不会改变。`, "恢复历史版本");
  const updated = await api.post<any, TemplateRow>(`/admin/credential-templates/${activeKey.value}/versions/${version}/restore`);
  const index = rows.value.findIndex((item) => item.templateKey === activeKey.value);
  if (index >= 0) rows.value[index] = updated;
  assignForm(updated.draftConfig);
  historyVisible.value = false;
  await preview();
  ElMessage.success("历史版本已恢复为草稿");
}

async function uploadAsset(file: File, field: typeof assetFields[number]["key"]) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
    ElMessage.error("仅支持 5MB 内的 JPG、PNG、WebP 或 GIF 图片");
    return false;
  }
  uploading.value = field;
  const data = new FormData();
  data.append("file", file);
  try {
    const result = await api.post<any, { url: string }>("/admin/uploads/images", data, { headers: { "Content-Type": "multipart/form-data" } });
    form[field] = result.url;
    await preview();
  } catch (error: any) {
    ElMessage.error(error.message || "图片上传失败");
  } finally {
    uploading.value = "";
  }
  return false;
}

watch(activeKey, async () => {
  const row = active.value;
  if (!row) return;
  assignForm(row.draftConfig);
  await preview();
});
let previewTimer: number | undefined;
watch(form, () => {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(preview, 350);
}, { deep: true });
onMounted(load);
</script>

<template>
  <div class="template-page" v-loading="loading">
    <header class="page-header">
      <div><h1>证书模板</h1><p>平台与商家分级维护，已发证书按发布版本固化。</p></div>
      <div class="header-actions">
        <el-button :icon="Clock" @click="openHistory">版本历史</el-button>
        <el-button :icon="Refresh" :loading="previewing" @click="preview">刷新预览</el-button>
        <el-button type="primary" plain :disabled="!canManage" :loading="saving" @click="saveDraft">保存草稿</el-button>
        <el-button type="primary" :disabled="!canManage" :loading="publishing" @click="publish">发布</el-button>
      </div>
    </header>

    <div class="workspace">
      <nav class="template-nav" aria-label="证书模板类型">
        <button v-for="item in rows" :key="item.templateKey" :class="{ active: item.templateKey === activeKey }" @click="activeKey = item.templateKey">
          <span>{{ item.label }}</span>
          <small>v{{ item.publishedVersion }}<i v-if="item.hasUnpublishedChanges">草稿待发布</i></small>
        </button>
      </nav>

      <main class="editor">
        <div class="status-line">
          <el-tag size="small">{{ sourceText }}</el-tag>
          <span>当前生效 v{{ active?.effectiveVersion || 0 }}</span>
          <span v-if="active?.publishedAt">最近发布 {{ new Date(active.publishedAt).toLocaleString("zh-CN") }}</span>
        </div>
        <el-tabs>
          <el-tab-pane label="文字内容">
            <el-form label-position="top" class="form-grid">
              <el-form-item label="中文标题"><el-input v-model="form.title" maxlength="80" show-word-limit /></el-form-item>
              <el-form-item label="英文标题"><el-input v-model="form.englishTitle" maxlength="120" /></el-form-item>
              <el-form-item label="证书内容名称"><el-input v-model="form.detailLabel" maxlength="40" /></el-form-item>
              <el-form-item label="发证单位"><el-input v-model="form.issuerName" maxlength="100" /></el-form-item>
              <el-form-item label="说明" class="wide"><el-input v-model="form.description" maxlength="180" show-word-limit /></el-form-item>
              <el-form-item label="声明" class="wide"><el-input v-model="form.statement" type="textarea" :rows="2" maxlength="220" show-word-limit /></el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="视觉样式">
            <div class="color-grid">
              <label v-for="item in [
                ['primaryColor','主色'],['accentColor','强调色'],['textColor','文字色'],['backgroundColor','背景色'],['borderColor','边框色']
              ]" :key="item[0]"><span>{{ item[1] }}</span><el-color-picker v-model="(form as any)[item[0]]" /><el-input v-model="(form as any)[item[0]]" /></label>
            </div>
            <el-form label-position="top" class="form-grid top-gap">
              <el-form-item label="Logo 文字"><el-input v-model="form.logoText" maxlength="12" /></el-form-item>
              <el-form-item label="证书编号前缀"><el-input v-model="form.numberPrefix" :disabled="activeKey === 'charity_contribution'" maxlength="12" /></el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="图片素材">
            <div class="asset-list">
              <div v-for="asset in assetFields" :key="asset.key" class="asset-row">
                <div class="asset-preview"><img v-if="form[asset.key]" :src="form[asset.key] || ''" :alt="asset.label" /><span v-else>未设置</span></div>
                <div class="asset-control"><strong>{{ asset.label }}</strong><el-input v-model="form[asset.key]" clearable placeholder="/uploads/... 或 https://..." /></div>
                <el-upload :show-file-list="false" :disabled="!canManage || Boolean(uploading)" :before-upload="(file: File) => uploadAsset(file, asset.key)">
                  <el-button :icon="Upload" :loading="uploading === asset.key">上传</el-button>
                </el-upload>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="公开与发布">
            <el-form label-position="top">
              <el-form-item label="公开验真姓名显示">
                <el-radio-group v-model="form.publicHolderMode">
                  <el-radio-button value="masked">脱敏显示</el-radio-button>
                  <el-radio-button value="hidden">完全隐藏</el-radio-button>
                  <el-radio-button value="full">完整显示</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-alert v-if="form.publicHolderMode === 'full'" type="warning" :closable="false" title="公开验真页和公开证书图片将展示完整姓名，请确认已取得用户授权。" />
              <el-form-item label="本次发布说明" class="top-gap"><el-input v-model="publishNote" maxlength="300" show-word-limit placeholder="记录本次模板调整内容" /></el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </main>

      <aside class="preview-panel">
        <div class="preview-title"><strong>成品预览</strong><span>1200 × 840</span></div>
        <div class="preview-canvas" v-loading="previewing"><div v-if="previewSvg" v-html="previewSvg"></div><el-empty v-else description="暂无预览" /></div>
      </aside>
    </div>

    <el-drawer v-model="historyVisible" title="发布版本历史" size="min(520px, 94vw)">
      <el-timeline v-if="versions.length">
        <el-timeline-item v-for="item in versions" :key="item.id" :timestamp="new Date(item.createdAt).toLocaleString('zh-CN')" placement="top">
          <div class="version-item"><strong>版本 v{{ item.version }}</strong><p>{{ item.note || "无发布说明" }}</p><span>{{ item.publishedBy?.username || "系统" }}</span><el-button link type="primary" :disabled="!canManage" @click="restore(item.version)">恢复为草稿</el-button></div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="尚未发布过版本" />
    </el-drawer>
  </div>
</template>

<style scoped>
.template-page { min-width: 0; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
.page-header h1 { margin: 0 0 6px; font-size: 24px; }
.page-header p { margin: 0; color: #667085; }
.header-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.workspace { display: grid; grid-template-columns: 190px minmax(340px, 1fr) minmax(400px, 1.1fr); border: 1px solid #e4e7ed; min-height: 680px; background: #fff; }
.template-nav { padding: 12px; border-right: 1px solid #e4e7ed; background: #f8fafb; }
.template-nav button { width: 100%; border: 0; border-left: 3px solid transparent; background: transparent; padding: 12px 10px; text-align: left; cursor: pointer; color: #344054; }
.template-nav button.active { border-left-color: #16836f; background: #fff; color: #126655; }
.template-nav span, .template-nav small { display: block; }
.template-nav small { margin-top: 5px; color: #667085; }
.template-nav i { display: block; margin-top: 3px; color: #b54708; font-style: normal; }
.editor { min-width: 0; padding: 18px; border-right: 1px solid #e4e7ed; overflow: auto; }
.status-line { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; color: #667085; font-size: 13px; margin-bottom: 10px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
.form-grid .wide { grid-column: 1 / -1; }
.color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.color-grid label { display: grid; grid-template-columns: 80px 34px 1fr; align-items: center; gap: 8px; color: #475467; font-size: 14px; }
.top-gap { margin-top: 18px; }
.asset-list { display: grid; gap: 14px; }
.asset-row { display: grid; grid-template-columns: 72px 1fr auto; gap: 12px; align-items: center; }
.asset-preview { width: 72px; height: 54px; display: grid; place-items: center; border: 1px dashed #cfd6df; color: #98a2b3; font-size: 12px; overflow: hidden; }
.asset-preview img { width: 100%; height: 100%; object-fit: contain; }
.asset-control { min-width: 0; }
.asset-control strong { display: block; margin-bottom: 6px; font-size: 14px; }
.preview-panel { min-width: 0; padding: 18px; background: #f3f6f5; }
.preview-title { display: flex; justify-content: space-between; color: #475467; margin-bottom: 12px; }
.preview-title span { font-size: 12px; }
.preview-canvas { aspect-ratio: 10 / 7; width: 100%; display: grid; place-items: center; background: #dfe5e3; overflow: hidden; }
.preview-canvas :deep(svg) { width: 100%; height: 100%; }
.version-item p { margin: 8px 0; color: #475467; }
.version-item span { color: #667085; font-size: 13px; margin-right: 12px; }
@media (max-width: 1180px) {
  .workspace { grid-template-columns: 170px 1fr; }
  .preview-panel { grid-column: 1 / -1; border-top: 1px solid #e4e7ed; }
  .preview-canvas { max-width: 760px; margin: 0 auto; }
}
@media (max-width: 700px) {
  .page-header { flex-direction: column; }
  .header-actions { justify-content: flex-start; }
  .workspace { display: block; }
  .template-nav { display: flex; overflow-x: auto; border-right: 0; border-bottom: 1px solid #e4e7ed; }
  .template-nav button { flex: 0 0 145px; }
  .editor { border-right: 0; padding: 14px; }
  .form-grid, .color-grid { grid-template-columns: 1fr; }
  .asset-row { grid-template-columns: 56px 1fr; }
  .asset-row :deep(.el-upload) { grid-column: 2; }
  .asset-preview { width: 56px; height: 48px; }
  .preview-panel { padding: 12px; }
}
</style>
