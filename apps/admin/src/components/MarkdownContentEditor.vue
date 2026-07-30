<script setup lang="ts">
import { computed, ref } from "vue";
import { Document, Edit, Link, List, Picture, Upload } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { markdownToRichTextHtml } from "@activity/shared";
import { api } from "../api";

const props = withDefaults(defineProps<{
  modelValue: string;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
  templates?: Array<{ label: string; content: string }>;
}>(), {
  disabled: false,
  rows: 9,
  placeholder: "输入内容，或使用上方工具栏排版",
  templates: () => []
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const inputRef = ref<any>();
const uploading = ref(false);
const previewHtml = computed(() => markdownToRichTextHtml(props.modelValue));

function setValue(value: string) {
  emit("update:modelValue", value);
}

function textarea() {
  return inputRef.value?.textarea || inputRef.value?.$el?.querySelector?.("textarea");
}

function insertInline(prefix: string, suffix = "", placeholder = "") {
  const element = textarea();
  if (!element) {
    setValue(props.modelValue + (props.modelValue ? "\n" : "") + prefix + placeholder + suffix);
    return;
  }
  const start = element.selectionStart ?? props.modelValue.length;
  const end = element.selectionEnd ?? start;
  const selected = props.modelValue.slice(start, end) || placeholder;
  setValue(props.modelValue.slice(0, start) + prefix + selected + suffix + props.modelValue.slice(end));
  requestAnimationFrame(() => {
    element.focus();
    element.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
  });
}

function insertBlock(block: string) {
  const text = props.modelValue.trimEnd();
  setValue(text + (text ? "\n\n" : "") + block);
}

function isSafeContentUrl(value: string, image = false) {
  const url = value.trim();
  if (/^https?:\/\//i.test(url) || /^\/uploads\//i.test(url)) return true;
  return !image && /^mailto:/i.test(url);
}

async function insertLink() {
  try {
    const { value } = await ElMessageBox.prompt("请输入链接地址", "插入链接", {
      inputValue: "https://",
      confirmButtonText: "插入",
      cancelButtonText: "取消",
      inputValidator: (input) => isSafeContentUrl(String(input || "")) || "只允许 HTTP(S)、站内上传地址或 mailto 链接"
    });
    if (value) insertInline("[", "](" + String(value).trim() + ")", "链接文字");
  } catch {
    // Canceling the dialog is an expected edit action.
  }
}

async function insertImageUrl() {
  try {
    const { value } = await ElMessageBox.prompt("请输入图片地址", "插入图片", {
      inputValue: "https://",
      confirmButtonText: "插入",
      cancelButtonText: "取消",
      inputValidator: (input) => isSafeContentUrl(String(input || ""), true) || "只允许 HTTP(S) 或站内上传地址"
    });
    if (value) insertBlock("![图片说明](" + String(value).trim() + ")");
  } catch {
    // Canceling the dialog is an expected edit action.
  }
}

async function uploadImage(file: File) {
  if (uploading.value || props.disabled) return false;
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    ElMessage.error("请上传 JPG、PNG、WebP 或 GIF 图片");
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error("图片不能超过 5MB");
    return false;
  }
  uploading.value = true;
  try {
    const payload = new FormData();
    payload.append("file", file);
    const result = await api.post<any, { url?: string }>("/admin/uploads/images", payload, { headers: { "Content-Type": "multipart/form-data" } });
    if (!result?.url) throw new Error("上传成功但未返回图片地址");
    insertBlock("![图片](" + result.url + ")");
    ElMessage.success("图片已插入内容");
  } catch (error: any) {
    ElMessage.error(error.message || "上传图片失败");
  } finally {
    uploading.value = false;
  }
  return false;
}

function applyTemplate(content: string) {
  if (props.modelValue.trim()) {
    insertBlock(content);
    return;
  }
  setValue(content);
}
</script>

<template>
  <div class="markdown-editor">
    <div class="editor-toolbar" aria-label="内容排版工具">
      <el-button size="small" :icon="Document" :disabled="disabled" @click="insertBlock('## 小标题')">标题</el-button>
      <el-button size="small" :icon="Edit" :disabled="disabled" @click="insertInline('**', '**', '重点内容')">加粗</el-button>
      <el-button size="small" :icon="List" :disabled="disabled" @click="insertBlock('- 列表项')">列表</el-button>
      <el-button size="small" :disabled="disabled" @click="insertBlock('1. 编号项目')">编号</el-button>
      <el-button size="small" :disabled="disabled" @click="insertBlock('> 提示内容')">提示</el-button>
      <el-button size="small" :disabled="disabled" @click="insertBlock('---')">分隔线</el-button>
      <el-button size="small" :icon="Link" :disabled="disabled" @click="insertLink">链接</el-button>
      <el-button size="small" :icon="Picture" :disabled="disabled" @click="insertImageUrl">图片地址</el-button>
      <el-upload :show-file-list="false" :disabled="disabled || uploading" :before-upload="uploadImage">
        <el-button size="small" :icon="Upload" :loading="uploading" :disabled="disabled || uploading">上传图片</el-button>
      </el-upload>
      <el-dropdown v-if="templates.length" trigger="click" @command="applyTemplate">
        <el-button size="small" :disabled="disabled">插入排版模板</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="item in templates" :key="item.label" :command="item.content">{{ item.label }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div class="editor-workbench">
      <el-input ref="inputRef" :model-value="modelValue" class="editor-source" type="textarea" :rows="rows" :disabled="disabled" :placeholder="placeholder" maxlength="50000" show-word-limit resize="vertical" @update:model-value="setValue" />
      <div class="editor-preview" aria-live="polite">
        <div class="preview-heading">用户端预览</div>
        <div v-if="modelValue.trim()" class="preview-body" v-html="previewHtml"></div>
        <el-empty v-else description="开始输入后显示排版预览" :image-size="64" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor { width: 100%; display: grid; gap: 10px; }
.editor-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px; border: 1px solid #dfe5ec; border-radius: 8px; background: #f8fafc; }
.editor-workbench { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(300px, .9fr); gap: 12px; align-items: stretch; }
.editor-source { min-width: 0; }
.editor-preview { min-height: 258px; border: 1px solid #dfe5ec; border-radius: 8px; overflow: hidden; background: #ffffff; }
.preview-heading { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; color: #667085; font-size: 13px; font-weight: 700; }
.preview-body { padding: 14px; }
@media (max-width: 900px) { .editor-workbench { grid-template-columns: 1fr; } }
</style>
