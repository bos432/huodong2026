<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import type { PublicSlowExperienceRecord } from "@activity/shared";
import { api } from "../api";

type ReviewRecord = PublicSlowExperienceRecord & { tenantId: number | null };
const records = ref<ReviewRecord[]>([]);
const loading = ref(false);
const error = ref("");
const page = ref(1);
const acting = ref<number | null>(null);
let sequence = 0;
async function load() {
  const current = ++sequence;
  loading.value = true;
  error.value = "";
  try {
    const result = await api.get<any, ReviewRecord[]>("/admin/slow-experiences", { params: { page: page.value } });
    if (current === sequence) records.value = result;
  } catch (failure) {
    if (current === sequence) { records.value = []; error.value = failure instanceof Error ? failure.message : "加载失败，请重试"; }
  } finally { if (current === sequence) loading.value = false; }
}
async function review(record: ReviewRecord, status: "approved" | "rejected") {
  if (acting.value !== null) return;
  let remark = "";
  try {
    if (status === "rejected") {
      const answer = await ElMessageBox.prompt("填写原因，帮助用户修改后重新申请公开。", "拒绝公开申请", {
        inputType: "textarea", inputValidator: value => Boolean(value?.trim()) && value.trim().length <= 1000 || "请填写 1 至 1000 字的原因",
        confirmButtonText: "确认拒绝", cancelButtonText: "取消"
      });
      remark = answer.value.trim();
    } else {
      await ElMessageBox.confirm("确认这版文字和照片适合公开展示？", "通过公开审核", { confirmButtonText: "确认通过", cancelButtonText: "取消" });
    }
  } catch { return; }
  acting.value = record.id;
  try {
    await api.patch(`/admin/slow-experiences/${record.id}/review`, { status, revision: record.revision, remark });
    ElMessage.success(status === "approved" ? "已通过公开审核" : "已拒绝公开申请");
    await load();
  } catch (failure) {
    ElMessage.error(failure instanceof Error ? failure.message : "审核失败，请刷新后重试");
    await load();
  } finally { acting.value = null; }
}
function changePage(delta: number) { page.value += delta; void load(); }
onMounted(load);
</script>

<template>
  <div class="slow-review-page">
    <header class="page-header"><h2>慢体验公开审核</h2><el-button :icon="Refresh" :loading="loading" :disabled="acting !== null" @click="load">刷新</el-button></header>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <div v-loading="loading" class="review-list">
      <el-empty v-if="!loading && !error && !records.length" description="暂无待审核的公开申请" />
      <article v-for="record in records" :key="record.id" class="review-item">
        <header><strong>手记 #{{ record.id }}</strong><el-tag type="warning">待审核 · 版本 {{ record.revision }}</el-tag><span>{{ record.tenantId ? `商家 #${record.tenantId}` : '平台' }}</span></header>
        <dl><dt>城市发现</dt><dd>{{ record.discovery }}</dd><dt>今天的一束光</dt><dd>{{ record.lightNote || '用照片记录' }}</dd><dt>此刻的感受</dt><dd>{{ record.feeling }}</dd></dl>
        <el-image v-if="record.photoUrl" class="record-photo" :src="record.photoUrl" :preview-src-list="[record.photoUrl]" preview-teleported fit="contain"><template #error><span>照片链接已失效，请刷新后查看</span></template></el-image>
        <footer><span>{{ new Date(record.updatedAt).toLocaleString('zh-CN') }}</span><el-button :disabled="acting !== null || loading" @click="review(record, 'rejected')">拒绝</el-button><el-button type="primary" :loading="acting === record.id" :disabled="acting !== null || loading" @click="review(record, 'approved')">通过公开</el-button></footer>
      </article>
    </div>
    <nav class="review-pagination" aria-label="审核队列分页"><el-button :disabled="page === 1 || loading || acting !== null" @click="changePage(-1)">上一页</el-button><span>第 {{ page }} 页</span><el-button :disabled="records.length < 20 || loading || acting !== null" @click="changePage(1)">下一页</el-button></nav>
  </div>
</template>

<style scoped>
.page-header,.review-item header,.review-item footer,.review-pagination{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.page-header{justify-content:space-between;margin-bottom:20px}.page-header h2{margin:0}
.review-list{min-height:180px}.review-item{border-bottom:1px solid var(--el-border-color);padding:24px 0}
.review-item header span,.review-item footer span{color:var(--el-text-color-secondary);font-size:13px}.review-item footer span{margin-right:auto}
dl{margin:16px 0}dt{font-weight:600;font-size:13px;margin-top:14px}dd{margin:6px 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7}
.record-photo{width:100%;max-width:420px;height:280px;margin-bottom:16px}.review-pagination{justify-content:flex-end;margin-top:20px}
</style>
