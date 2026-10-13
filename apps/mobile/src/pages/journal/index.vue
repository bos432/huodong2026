<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow, onHide, onUnload } from "@dcloudio/uni-app";
import type { PublicSlowExperienceRecord } from "@activity/shared";
import MobileShell from "../../components/layout/MobileShell.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import { getCurrentTenantCode, withTenantCode } from "../../api";
import { mobileTabRoute } from "../../mobile-tab-routes";
import { formatShanghaiDateTime } from "../../tenant-load-guard";
import { loadPublicExperiences, loadPublicExperience } from "../../slow-experience-client";
import { parseJournalId } from "../../journal-route";
import "../../styles/tokens.css";

const records = ref<PublicSlowExperienceRecord[]>([]);
const selected = ref<PublicSlowExperienceRecord | null>(null);
const recordId = ref(0);
const invalidId = ref(false);
const loading = ref(false);
const error = ref("");
const unavailable = ref(false);
const more = ref(false);
const photoErrors = ref<number[]>([]);
let page = 1;
let sequence = 0;
async function load(append = false) {
  if (invalidId.value) {
    unavailable.value = true;
    error.value = "这页手记的链接无效，请返回列表重新选择。";
    return;
  }
  if (append && (loading.value || !more.value)) return;
  const current = ++sequence;
  const tenantCode = getCurrentTenantCode();
  const isCurrent = () => current === sequence && tenantCode === getCurrentTenantCode();
  const nextPage = append ? page + 1 : 1;
  loading.value = true; error.value = ""; unavailable.value = false;
  if (!append) { records.value = []; selected.value = null; more.value = false; photoErrors.value = []; }
  try {
    if (recordId.value) {
      const result = await loadPublicExperience(tenantCode, recordId.value);
      if (isCurrent()) selected.value = result;
    } else {
      const result = await loadPublicExperiences(tenantCode, nextPage);
      if (!isCurrent()) return;
      records.value = append ? [...records.value, ...result.filter(row => !records.value.some(item => item.id === row.id))] : result;
      more.value = result.length === 20; page = nextPage;
    }
  } catch (failure) {
    if (!isCurrent()) return;
    unavailable.value = (failure as { statusCode?: number })?.statusCode === 404;
    error.value = unavailable.value ? "作者可能已转为私密，或这页手记尚未公开。" : failure instanceof Error ? failure.message : "城市手记暂时无法加载，请重试";
  } finally { if (isCurrent()) loading.value = false; }
}
function open(record: PublicSlowExperienceRecord) { uni.navigateTo({ url: withTenantCode(`/pages/journal/index?id=${record.id}`) }); }
function preview(record: PublicSlowExperienceRecord) { if (record.photoUrl) uni.previewImage({ urls: [record.photoUrl] }); }
function back() { if (getCurrentPages().length > 1) uni.navigateBack(); else uni.reLaunch({ url: withTenantCode(mobileTabRoute("checkin")) }); }
function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") { if (tab !== "publish") uni.reLaunch({ url: withTenantCode(mobileTabRoute(tab)) }); }
function invalidate() { sequence += 1; loading.value = false; records.value = []; selected.value = null; }
onLoad(query => { const id = parseJournalId(query?.id); invalidId.value = id === null; recordId.value = id || 0; });
onShow(() => { void load(); });
onHide(invalidate); onUnload(invalidate);
</script>

<template>
  <MobileShell active-tab="checkin" @tab="selectTab">
    <view class="journal-page">
      <view class="journal-heading"><button class="back-button" aria-label="返回上一页" @click="back"><IconGlyph name="chevron" :size="18" label="返回" /></button><view class="heading-copy"><text class="eyebrow">SLOWPI / CITY JOURNALS</text><text class="page-title">{{ recordId ? '一页城市手记' : '城市手记' }}</text><text class="page-note">{{ recordId ? '认真看见，也给日常留一点余地。' : '看看别人停下脚步时，看见了什么。' }}</text></view></view>
      <view v-if="loading && !records.length" class="state" role="status"><text>正在寻找城市里的慢时间…</text></view>
      <view v-else-if="error" class="state" role="alert"><IconGlyph name="book" :size="28" label="手记状态" /><text class="state-title">{{ unavailable ? '手记不存在或已撤回公开' : '城市手记暂不可用' }}</text><text class="state-copy">{{ error }}</text><button class="primary-button" @click="unavailable ? back() : load()">{{ unavailable ? '返回' : '重新加载' }}</button></view>
      <view v-else-if="selected" class="journal-detail">
        <text class="record-date">{{ formatShanghaiDateTime(selected.createdAt, '记录时间未知') }} · 城市观察</text>
        <view v-if="selected.photoUrl" class="photo-region"><image v-if="!photoErrors.includes(selected.id)" class="detail-photo" :src="selected.photoUrl" mode="widthFix" role="button" tabindex="0" aria-label="查看城市手记照片" @click="preview(selected)" @keyup.enter="preview(selected)" @error="photoErrors.push(selected.id)" /><button v-else class="text-button" @click="load()">照片暂不可用，刷新重试</button></view>
        <text class="record-title">{{ selected.discovery }}</text><text v-if="selected.lightNote" class="record-copy">{{ selected.lightNote }}</text><text class="record-copy">{{ selected.feeling }}</text><text class="detail-footnote">一份个人的城市观察，不是活动评价或签到记录。</text>
      </view>
      <template v-else>
        <view v-if="!records.length" class="state"><IconGlyph name="book" :size="28" label="暂无公开手记" /><text class="state-title">这座城市，还在等一页手记</text><text class="state-copy">审核通过的公开记录会出现在这里，私密手记只留给作者自己。</text></view>
        <view v-for="record in records" :key="record.id" class="journal-card" role="button" tabindex="0" :aria-label="`阅读城市手记：${record.discovery}`" @click="open(record)" @keyup.enter="open(record)" @keyup.space.prevent="open(record)">
          <image v-if="record.photoUrl && !photoErrors.includes(record.id)" class="card-photo" :src="record.photoUrl" mode="aspectFill" @error="photoErrors.push(record.id)" /><view class="card-copy"><text class="record-date">{{ formatShanghaiDateTime(record.createdAt, '记录时间未知') }}</text><text class="card-title">{{ record.discovery }}</text><text class="card-description">{{ record.feeling }}</text><view class="read-row"><text>读这一页</text><IconGlyph name="chevron" :size="14" label="阅读" /></view></view>
        </view>
        <button v-if="more" class="text-button" :disabled="loading" @click="load(true)">{{ loading ? '正在加载…' : '查看更多城市手记' }}</button>
      </template>
    </view>
  </MobileShell>
</template>

<style scoped>
.journal-page{padding:20px 14px 28px;color:var(--mp-text-primary)}.journal-heading{display:flex;gap:12px;align-items:flex-start;margin-bottom:24px}.heading-copy{min-width:0;flex:1}.back-button{display:grid;place-items:center;min-width:40px;min-height:40px;margin:0;padding:0;background:transparent;transform:rotate(180deg);color:var(--mp-brand-primary)}.back-button::after,.text-button::after,.primary-button::after{border:0}.eyebrow{display:block;font-size:10px;font-weight:700;color:var(--mp-brand-primary)}.page-title{display:block;margin-top:8px;font-size:24px;font-weight:800}.page-note{display:block;margin-top:7px;font-size:12px;line-height:1.6;color:var(--mp-text-muted)}
.state{display:grid;justify-items:center;gap:12px;padding:36px 18px;text-align:center;font-size:12px;color:var(--mp-text-muted)}.state-title{font-size:15px;font-weight:700;color:var(--mp-text-primary)}.state-copy{line-height:1.7}.primary-button{min-height:44px;margin:0;padding:0 16px;border-radius:8px;background:var(--mp-brand-primary);color:#fff;font-size:12px;display:flex;align-items:center}.text-button{min-height:44px;padding:8px 12px;margin:10px auto 0;background:transparent;color:var(--mp-brand-primary);font-size:12px}
.journal-card{margin-bottom:16px;overflow:hidden;border:1px solid var(--mp-border);border-radius:8px;background:var(--mp-bg-surface)}.card-photo{width:100%;height:200px}.card-copy{padding:16px}.record-date{display:block;font-size:10px;color:var(--mp-text-muted);line-height:1.5}.card-title{display:block;margin-top:10px;font-size:16px;font-weight:700;line-height:1.6;overflow-wrap:anywhere}.card-description{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin-top:7px;font-size:12px;line-height:1.7;color:var(--mp-text-secondary)}.read-row{display:flex;align-items:center;justify-content:space-between;margin-top:14px;font-size:11px;color:var(--mp-brand-primary)}
.journal-detail{padding:18px 0}.photo-region{margin:18px 0}.detail-photo{width:100%;border-radius:8px}.record-title{display:block;margin-top:22px;font-size:20px;font-weight:700;line-height:1.6;overflow-wrap:anywhere}.record-copy{display:block;margin-top:18px;font-size:14px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--mp-text-secondary)}.detail-footnote{display:block;margin-top:30px;padding-top:16px;border-top:1px solid var(--mp-border);font-size:11px;line-height:1.7;color:var(--mp-text-muted)}
</style>
