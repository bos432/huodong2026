<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import type { PublicSlowExperienceRecord } from "@activity/shared";
import IconGlyph from "../ui/IconGlyph.vue";
import { withTenantCode } from "../../api";
import { formatShanghaiDateTime } from "../../tenant-load-guard";
import { captureExperienceAccount, experienceAccountIsCurrent, loadCloudExperiences, changeCloudExperienceVisibility, deleteCloudExperience, cloudVisibilityLabel } from "../../slow-experience-client";

const records = ref<PublicSlowExperienceRecord[]>([]);
const guest = ref(false);
const loading = ref(false);
const error = ref("");
const more = ref(false);
const acting = ref<number | null>(null);
const photoErrors = ref<number[]>([]);
let page = 1;
let sequence = 0;
let actionSequence = 0;
let visible = true;
async function load(append = false) {
  if (append && (loading.value || !more.value)) return;
  visible = true;
  const account = captureExperienceAccount();
  const current = ++sequence;
  const nextPage = append ? page + 1 : 1;
  const isCurrent = () => visible && current === sequence && account !== null && experienceAccountIsCurrent(account);
  guest.value = !account;
  error.value = "";
  if (!append) { records.value = []; more.value = false; photoErrors.value = []; }
  if (!account) { loading.value = false; return; }
  loading.value = true;
  try {
    const rows = await loadCloudExperiences(account, nextPage);
    if (!isCurrent()) return;
    records.value = append ? [...records.value, ...rows.filter(row => !records.value.some(existing => existing.id === row.id))] : rows;
    more.value = rows.length === 20;
    page = nextPage;
  } catch (failure) {
    if (isCurrent()) error.value = failure instanceof Error ? failure.message : "手记暂时无法同步，请重试";
  } finally { if (current === sequence) loading.value = false; }
}
function invalidate() { visible = false; sequence += 1; actionSequence += 1; loading.value = false; acting.value = null; records.value = []; }
function compose() { uni.navigateTo({ url: withTenantCode("/pages/checkin/detail?id=1") }); }
function edit(record: PublicSlowExperienceRecord) { uni.navigateTo({ url: withTenantCode(`/pages/checkin/detail?id=1&recordId=${record.id}`) }); }
function browse() { uni.navigateTo({ url: withTenantCode("/pages/journal/index") }); }
function login() { uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${encodeURIComponent('/pages/prototype/me')}`) }); }
function preview(record: PublicSlowExperienceRecord) { if (record.photoUrl) uni.previewImage({ urls: [record.photoUrl] }); }
function act(record: PublicSlowExperienceRecord, action: "delete" | "private" | "public_review") {
  if (acting.value !== null || loading.value) return;
  const account = captureExperienceAccount();
  if (!account) { login(); return; }
  const current = ++actionSequence;
  const isCurrent = () => visible && current === actionSequence && experienceAccountIsCurrent(account);
  uni.showModal({
    title: action === "delete" ? "删除这页手记？" : action === "private" ? "转为仅自己可见？" : "申请公开这页手记？",
    content: action === "delete" ? "文字与照片将从账号中删除，无法撤销。" : action === "private" ? "转为私密后，其他用户将无法查看这页手记和照片。" : "文字和照片将在审核通过后公开。请确认不含他人的隐私信息。",
    confirmText: action === "delete" ? "删除" : "确认", confirmColor: "#B9533F",
    success: async ({ confirm }) => {
      if (!confirm || !isCurrent()) return;
      acting.value = record.id;
      try {
        if (action === "delete") await deleteCloudExperience(account, record.id);
        else await changeCloudExperienceVisibility(account, record, action);
        if (!isCurrent()) return;
        uni.showToast({ title: action === "delete" ? "手记已删除" : action === "private" ? "已转为私密" : "已提交公开审核", icon: "none" });
        await load();
      } catch (failure) {
        if (isCurrent()) error.value = failure instanceof Error ? failure.message : "操作失败，请重试";
      } finally { if (current === actionSequence) acting.value = null; }
    }
  });
}
onMounted(() => { void load(); });
onBeforeUnmount(invalidate);
defineExpose({ load, invalidate });
</script>

<template>
  <view class="cloud-experiences">
    <view class="gallery-heading"><view><text class="gallery-title">慢体验记录</text><text class="gallery-note">账号手记 · 不计入活动签到或评价</text></view><button class="text-action" @click="compose">写一页手记</button></view>
    <button class="text-action" @click="browse">看看城市里的公开手记</button>
    <view v-if="guest" class="gallery-empty"><IconGlyph name="book" :size="26" label="城市手记" /><text class="empty-title">把慢时间留在自己的账号里</text><text>登录后保存和回看自己的文字与照片。</text><button class="primary-action" @click="login">登录查看手记</button></view>
    <template v-else>
      <view v-if="error" class="gallery-error" role="alert"><text>{{ error }}</text><button class="gallery-retry" :disabled="loading || acting !== null" @click="load()">重新同步</button></view>
      <view v-if="loading && !records.length" class="gallery-empty" role="status"><text>正在同步你的手记…</text></view>
      <view v-else-if="!error && !records.length" class="gallery-empty"><IconGlyph name="book" :size="26" label="暂无手记" /><text class="empty-title">还没有慢体验记录</text><text>留意一次光线，写下一点感受，给以后的自己看。</text><button class="primary-action" @click="compose">开始一页城市手记</button></view>
      <view v-for="record in records" :key="record.id" class="cloud-record">
        <view class="record-meta"><text>{{ formatShanghaiDateTime(record.createdAt, '记录时间未知') }}</text><text>{{ cloudVisibilityLabel(record) }}</text></view>
        <view v-if="record.photoUrl" class="record-media"><image v-if="!photoErrors.includes(record.id)" class="record-image" :src="record.photoUrl" mode="aspectFill" role="button" tabindex="0" aria-label="查看手记照片" @click="preview(record)" @keyup.enter="preview(record)" @error="photoErrors.push(record.id)" /><button v-else class="text-action" :disabled="loading" @click="load()">照片暂不可用，刷新重试</button></view>
        <text class="record-discovery">{{ record.discovery }}</text><text v-if="record.lightNote" class="record-copy">{{ record.lightNote }}</text><text class="record-copy">{{ record.feeling }}</text>
        <text v-if="record.moderationStatus === 'rejected' && record.reviewRemark" class="review-remark">审核反馈：{{ record.reviewRemark }}</text>
        <view class="record-actions"><button class="text-action" :disabled="acting !== null || loading" @click="edit(record)">编辑</button><button class="text-action" :disabled="acting !== null || loading" @click="act(record, record.visibility === 'private' ? 'public_review' : 'private')">{{ record.visibility === 'private' ? '申请公开' : '转为私密' }}</button><button class="text-action" :disabled="acting !== null || loading" @click="act(record, 'delete')">{{ acting === record.id ? '处理中…' : '删除' }}</button></view>
      </view>
      <button v-if="more" class="text-action load-more" :disabled="loading || acting !== null" @click="load(true)">{{ loading ? '正在加载…' : '查看更多手记' }}</button>
    </template>
  </view>
</template>

<style scoped>
.cloud-experiences{margin:14px;padding:18px;border:1px solid var(--mp-border);border-radius:var(--mp-radius-card,16px);background:var(--mp-bg-surface)}
.gallery-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.gallery-heading>view{min-width:0}.gallery-title{display:block;font-size:16px;font-weight:800;color:var(--mp-text-primary)}.gallery-note{display:block;margin-top:5px;font-size:10px;line-height:1.5;color:var(--mp-text-muted)}
.text-action{margin:0;padding:4px 8px;min-height:40px;background:transparent;color:var(--mp-brand-primary-dark);font-size:11px;line-height:1.5;display:flex;align-items:center;justify-content:center}.text-action::after,.primary-action::after{border:0}
.gallery-empty{display:grid;justify-items:center;gap:10px;padding:24px 0;color:var(--mp-text-muted);font-size:12px;text-align:center;line-height:1.6}.empty-title{font-size:14px;font-weight:700;color:var(--mp-text-primary)}.primary-action{margin:3px 0 0;min-height:44px;padding:0 16px;border-radius:10px;background:var(--mp-brand-primary);color:white;display:flex;align-items:center;font-size:12px}
.cloud-record{padding-top:18px;margin-top:18px;border-top:1px solid var(--mp-border)}.record-meta{display:flex;justify-content:space-between;gap:10px;font-size:10px;color:var(--mp-text-muted);line-height:1.5;flex-wrap:wrap}.record-media{margin-top:12px}.record-image{width:100%;height:180px;border-radius:8px}.record-discovery{display:block;margin-top:12px;color:var(--mp-text-primary);font-size:14px;font-weight:700;line-height:1.6;overflow-wrap:anywhere}.record-copy{display:block;margin-top:7px;color:var(--mp-text-secondary);font-size:12px;white-space:pre-wrap;line-height:1.7;overflow-wrap:anywhere}.record-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:8px}.review-remark,.gallery-error{color:var(--mp-danger);font-size:11px;line-height:1.6}.review-remark{display:block;margin-top:10px}.gallery-error{padding:12px 0}.gallery-retry{min-height:44px;margin-top:8px;font-size:12px}.load-more{margin:10px auto 0}
</style>
