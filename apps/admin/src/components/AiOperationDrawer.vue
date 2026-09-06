<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, CopyDocument } from '@element-plus/icons-vue';
import { api } from '../api';
import { copyToClipboard } from '../h5-preview';
import { formatShanghaiDateTime } from '../date-time';
const props = defineProps<{ activityId: number | null }>();
const emit = defineEmits<{ close: [] }>();
const mode = ref('activity_copy'); const question = ref(''); const preview = ref<any>(null); const history = ref<any[]>([]);
const loading = ref(false); const generating = ref(false); const consent = ref(false); const error = ref(''); const requestKey = ref('');
const awaitingKey = ref('');
let generation = 0;
const labels: Record<string, string> = { activity_copy: '活动文案', reply: '客服回复建议', recap: '复盘建议' };
function clearPreview() { preview.value = null; consent.value = false; requestKey.value = ''; }
watch([mode, question], clearPreview);
async function load() {
  const token = ++generation; if (!props.activityId) return;
  loading.value = true; error.value = '';
  try { const result = await api.get<any, any>(`/admin/activities/${props.activityId}/ai-drafts`); if (token === generation) { history.value = result.items; const pending = history.value.find(row => row.requestKey === awaitingKey.value); if (pending && pending.status !== 'pending') awaitingKey.value = ''; } }
  catch (e: any) { if (token === generation) error.value = e.message || '草稿记录加载失败'; }
  finally { if (token === generation) loading.value = false; }
}
watch(() => props.activityId, () => { clearPreview(); awaitingKey.value = ''; history.value = []; void load(); }, { immediate: true });
async function prepare() {
  if (!props.activityId || loading.value || generating.value) return;
  if (awaitingKey.value) return ElMessage.warning('请先查询上一次请求的状态');
  const token = ++generation; loading.value = true; error.value = ''; consent.value = false;
  try {
    const result = await api.post(`/admin/activities/${props.activityId}/ai-drafts/preview`, { mode: mode.value, question: question.value });
    if (token === generation) { preview.value = result; requestKey.value = crypto.randomUUID(); }
  } catch (e: any) { if (token === generation) error.value = e.message || '预览失败'; }
  finally { if (token === generation) loading.value = false; }
}
async function generate() {
  if (!preview.value?.configured || !consent.value || generating.value || awaitingKey.value || !props.activityId) return;
  generating.value = true; error.value = '';
  awaitingKey.value = requestKey.value;
  try {
    const result = await api.post<any, any>(`/admin/activities/${props.activityId}/ai-drafts`, { mode: mode.value, question: question.value, previewHash: preview.value.previewHash, requestKey: requestKey.value, consent: true }, { timeout: 65000 });
    if (result.status !== 'pending') awaitingKey.value = '';
    await load();
    if (result.status === 'succeeded') ElMessage.success('草稿已生成，尚未采纳或发布');
    else if (result.status === 'failed') error.value = result.error || '生成失败';
    else error.value = '请求正在处理，可刷新记录查看结果；不要重复新建请求。';
  } catch (e: any) { error.value = e.message || '请求未确认完成，请先刷新记录，不要立即重复生成。'; }
  finally { generating.value = false; consent.value = false; }
}
async function copy(text: string) { try { await copyToClipboard(text); ElMessage.success('草稿已复制，请核对后再粘贴到编辑器'); } catch { ElMessage.error('复制失败'); } }
async function abandonWait() { try { await ElMessageBox.confirm('上次请求可能仍被服务商处理或已计费。放弃等待不会取消服务商任务，新建请求可能重复计费。', '放弃等待', { type: 'warning', confirmButtonText: '明确放弃等待', cancelButtonText: '继续查询' }); awaitingKey.value = ''; clearPreview(); } catch { /* Keep waiting. */ } }
function close() { if (!generating.value) { generation++; emit('close'); } }
</script>

<template>
  <el-drawer :model-value="Boolean(activityId)" title="AI运营草稿" size="min(860px,100vw)" :before-close="close" :close-on-click-modal="!generating">
    <el-alert title="AI结果仅供人工核对，不会自动发布、修改活动或发送客服消息" type="info" :closable="false" />
    <el-form class="draft-form" label-position="top" :disabled="generating || loading">
      <el-form-item label="草稿类型"><el-radio-group v-model="mode"><el-radio-button v-for="(label,key) in labels" :key="key" :value="key">{{ label }}</el-radio-button></el-radio-group></el-form-item>
      <el-form-item label="补充要求或待回复问题"><el-input v-model="question" type="textarea" :rows="3" maxlength="1000" show-word-limit placeholder="不要填写用户身份、联系方式、支付凭据或密钥" /></el-form-item>
      <el-button type="primary" :loading="loading" @click="prepare">预览发送内容</el-button>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <section v-if="preview" class="preview-band">
      <h4>发送内容确认</h4>
      <p>服务：{{ preview.providerHost || '未配置' }} · 模型：{{ preview.model || '未配置' }}</p>
      <el-alert v-if="preview.simulation" title="本地模拟服务：仅用于联调，不代表真实AI生成质量" type="warning" :closable="false" />
      <pre>{{ JSON.stringify(preview.source, null, 2) }}</pre>
      <p class="note">这是将发送的完整业务资料，不包含报名人列表。自动脱敏不能代替人工核对，请确认没有不应发送的内容。每账号24小时最多 {{ preview.dailyLimit }} 次，服务商可能按调用收费；失败和超时也不保证未计费。</p>
      <el-alert v-if="!preview.configured" :title="preview.configurationMessage" type="warning" :closable="false" />
      <el-checkbox v-model="consent" :disabled="!preview.configured || generating">确认将上述资料发送给该AI服务，并接受可能产生的调用费用</el-checkbox>
      <div class="confirm-actions"><el-button :disabled="!consent || !preview.configured || generating || Boolean(awaitingKey)" :loading="generating" type="primary" @click="generate">确认生成草稿</el-button></div>
    </section>
    <div class="history-head"><h4>最近生成记录</h4><el-button :icon="Refresh" :disabled="generating || loading" @click="load">查询状态</el-button></div>
    <el-button v-if="awaitingKey && !generating" type="warning" @click="abandonWait">放弃等待</el-button>
    <p v-if="!history.length" class="note">暂无生成记录</p>
    <section v-for="draft in history" :key="draft.id" class="draft-record">
      <div class="record-head"><strong>{{ labels[draft.mode] || draft.mode }} · {{ draft.status === 'succeeded' ? '待人工核对' : draft.status === 'pending' ? '处理中' : '失败' }}</strong><el-button v-if="draft.text" :icon="CopyDocument" @click="copy(draft.text)">复制草稿</el-button></div>
      <p class="note">{{ draft.providerHost }} · {{ draft.model }} · {{ formatShanghaiDateTime(draft.createdAt, '-', true) }}{{ draft.simulation ? ' · 本地模拟' : '' }}</p>
      <pre v-if="draft.text">{{ draft.text }}</pre><p v-if="draft.error" class="error">{{ draft.error }}</p>
    </section>
  </el-drawer>
</template>

<style scoped>
.draft-form{margin:22px 0}.preview-band,.draft-record{padding:16px 0;border-bottom:1px solid #dfe6e7}.note{color:#657579;font-size:13px;line-height:1.6}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.6;background:#f5f7f8;padding:16px}.history-head,.record-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.history-head{margin-top:24px}.confirm-actions{margin-top:14px}.error{color:#b42318}:deep(.el-checkbox){white-space:normal;height:auto;line-height:1.5}:deep(.el-checkbox__label){white-space:normal}:deep(.el-radio-group){display:flex;flex-wrap:wrap}
</style>
