<template>
  <view class="container publish-page">
    <view v-if="categoriesLoading" class="state-card">版块加载中...</view>
    <view v-else-if="categoriesError" class="state-card error-state" role="alert" aria-live="assertive">
      <text>{{ categoriesError }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新加载论坛版块" @click="loadCategories" @keyup.enter="loadCategories" @keyup.space.prevent="loadCategories">重新加载</view>
    </view>
    <view class="form-card">
      <view class="field">
        <text class="label">版块</text>
        <picker :disabled="categoriesLoading || !!categoriesError" :range="categories" range-key="name" @change="pickCategory">
          <view class="picker-value">{{ selectedCategory?.name || "请选择版块" }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">标题</text>
        <input v-model="form.title" class="input" maxlength="120" cursor-spacing="24" confirm-type="next" aria-label="帖子标题" placeholder="写一个清楚的标题" />
      </view>
      <view class="field">
        <text class="label">内容</text>
        <textarea v-model="form.content" class="textarea" maxlength="5000" cursor-spacing="24" aria-label="帖子内容" placeholder="分享活动体验、课程问题、公益想法或共修记录" />
      </view>
      <view class="field">
        <text class="label">标签</text>
        <input v-model="form.tagsText" class="input" maxlength="200" cursor-spacing="24" aria-label="帖子标签" placeholder="用逗号分隔，例如：茶道,共修" />
      </view>
      <view class="field">
        <text class="label">图片地址</text>
        <textarea v-model="form.imagesText" class="textarea small" maxlength="2000" cursor-spacing="24" aria-label="帖子图片地址" placeholder="可选，每行一个图片 URL" />
      </view>
      <view class="button block" role="button" tabindex="0" :aria-disabled="!canSubmit" :aria-busy="submitting" :class="{ disabled: !canSubmit }" @click="submit" @keyup.enter="submit" @keyup.space.prevent="submit">{{ submitting ? "提交中" : "提交帖子" }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";

const categories = ref<any[]>([]);
const categoryIndex = ref(0);
const submitting = ref(false);
const categoriesLoading = ref(false);
const categoriesError = ref("");
const routeCategoryId = ref(0);
const routeActivityId = ref(0);
const categoriesLoadGuard = createTenantLoadGuard();
const form = reactive({ title: "", content: "", tagsText: "", imagesText: "" });
const selectedCategory = computed(() => categories.value[categoryIndex.value] || null);
const canSubmit = computed(() => !submitting.value && !categoriesLoading.value && !categoriesError.value && !!selectedCategory.value?.id);

onLoad((options: any) => {
  routeCategoryId.value = Number(options?.categoryId || 0);
  routeActivityId.value = Number(options?.activityId || 0);
});

onShow(loadCategories);

async function loadCategories() {
  const token = categoriesLoadGuard.begin();
  categoriesLoading.value = true;
  categoriesError.value = "";
  try {
    const rows = await request<any[]>("/public/forum/categories");
    if (!categoriesLoadGuard.isCurrent(token)) return;
    categories.value = rows;
    const index = categories.value.findIndex((item) => item.id === routeCategoryId.value);
    categoryIndex.value = index >= 0 ? index : 0;
  } catch (error: any) {
    if (categoriesLoadGuard.isCurrent(token)) categoriesError.value = error?.message || "论坛版块加载失败，请重新加载后再发布。";
  } finally {
    if (categoriesLoadGuard.isCurrent(token)) categoriesLoading.value = false;
  }
}

function pickCategory(event: any) {
  categoryIndex.value = Number(event.detail.value || 0);
}

function parseList(value: string, limit: number) {
  return String(value || "")
    .split(/[\n,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

async function submit() {
  if (!canSubmit.value) return;
  if (!selectedCategory.value?.id) return uni.showToast({ title: "请选择版块", icon: "none" });
  if (!form.title.trim()) return uni.showToast({ title: "请输入标题", icon: "none" });
  if (!form.content.trim()) return uni.showToast({ title: "请输入内容", icon: "none" });
  submitting.value = true;
  try {
    await ensureUser();
    const result = await request<any>("/public/forum/topics", {
      method: "POST",
      data: {
        categoryId: selectedCategory.value.id,
        title: form.title.trim(),
        content: form.content.trim(),
        tags: parseList(form.tagsText, 10),
        images: parseList(form.imagesText, 9),
        activityId: routeActivityId.value || undefined
      }
    });
    uni.showToast({ title: result?.message || "已提交", icon: "none" });
    const topicId = result?.topic?.id;
    setTimeout(() => {
      uni.redirectTo({ url: withTenantCode(topicId && result?.topic?.status === "approved" ? `/pages/forum/detail?id=${topicId}` : "/pages/forum/index") });
    }, 600);
  } catch (error: any) {
    if (error?.message) uni.showToast({ title: error.message, icon: "none" });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.publish-page { width:100%; max-width:760px; min-height:100vh; margin:0 auto; box-sizing:border-box; padding:calc(24rpx + env(safe-area-inset-top)) 24rpx calc(80rpx + env(safe-area-inset-bottom)); overflow-wrap:anywhere; }
.form-card { display:grid; gap:22rpx; padding:24rpx; border-radius:20rpx; background:#fff; box-shadow:0 4rpx 20rpx rgba(0,0,0,0.04); }
.field { display:grid; gap:10rpx; }
.label { color:#333; font-size:27rpx; font-weight:900; }
.input, .picker-value { height:74rpx; display:flex; align-items:center; padding:0 20rpx; border-radius:16rpx; background:#f8fafc; color:#333; font-size:26rpx; }
.textarea { width:100%; min-height:260rpx; box-sizing:border-box; padding:18rpx 20rpx; border-radius:16rpx; background:#f8fafc; color:#333; font-size:26rpx; line-height:1.6; }
.textarea.small { min-height:150rpx; }
.button.disabled { opacity:.65; }
.state-card { display:grid; gap:12rpx; margin-bottom:18rpx; padding:22rpx 24rpx; border-radius:8px; background:#fff; color:#667085; font-size:25rpx; line-height:1.55; }
.state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-retry { width:max-content; color:#C43D3D; font-weight:900; }
</style>
