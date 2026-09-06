<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Delete, Refresh } from '@element-plus/icons-vue';
import { api } from '../api';
import { canAccess } from '../permissions';

const props = defineProps<{ activityId: number | null }>();
const emit = defineEmits<{ close: []; changed: [] }>();
const data = ref<any>(null);
const title = ref('');
const sessions = ref<Array<{ startTime: Date | null; endTime: Date | null; registrationDeadline: Date | null; location: string }>>([]);
const loading = ref(false); const saving = ref(false); const error = ref('');
let generation = 0;
const canManage = computed(() => canAccess(['activity.manage']));
const status: Record<string, string> = { draft: '草稿', open: '报名中', closed: '已下架', cancelled: '已取消', ended: '已结束', pending_approval: '待审核', rejected: '已驳回' };
const format = (v: string) => new Date(v).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
async function load() {
  const token = ++generation; data.value = null; error.value = ''; sessions.value = [];
  if (!props.activityId) return;
  loading.value = true;
  try { const result = await api.get<any, any>(`/admin/activities/${props.activityId}/series`); if (token === generation) { data.value = result; title.value = result.title; } }
  catch (e: any) { if (token === generation) error.value = e.message || '系列加载失败'; }
  finally { if (token === generation) loading.value = false; }
}
watch(() => props.activityId, load, { immediate: true });
function add() {
  if (sessions.value.length >= 12) return;
  const previous = sessions.value.at(-1)?.startTime || data.value?.sessions.at(-1)?.startTime || new Date();
  const start = new Date(Math.max(+new Date(previous), Date.now()) + 7 * 86400000);
  sessions.value.push({ startTime: start, endTime: new Date(+start + 120 * 60000), registrationDeadline: new Date(+start - 86400000), location: data.value?.sessions[0]?.location || '' });
}
async function save() {
  if (!data.value || saving.value || !canManage.value) return;
  if (!sessions.value.length) return ElMessage.warning('请先添加场次');
  if (sessions.value.some(s => !s.startTime || !s.endTime || !s.registrationDeadline || !s.location.trim())) return ElMessage.warning('请填写各场的时间与地点');
  saving.value = true;
  try {
    const result = await api.post<any, any>(`/admin/activities/${props.activityId}/series`, { title: title.value.trim(), revision: data.value.revision, sessions: sessions.value.map(s => ({ ...s, startTime: s.startTime!.toISOString(), endTime: s.endTime!.toISOString(), registrationDeadline: s.registrationDeadline!.toISOString() })) });
    data.value = result; sessions.value = []; emit('changed'); ElMessage.success(`已创建${result.createdActivityIds.length}场草稿`);
  } catch (e: any) { ElMessage.error(e.message || '创建失败'); }
  finally { saving.value = false; }
}
function close() { if (!saving.value) { generation++; emit('close'); } }
</script>

<template>
  <el-drawer :model-value="Boolean(activityId)" title="系列活动排期" size="min(860px,100vw)" :before-close="close" :close-on-click-modal="!saving">
    <div v-if="loading" role="status">系列加载中...</div>
    <el-alert v-else-if="error" :title="error" type="error" :closable="false"><el-button :icon="Refresh" @click="load">重试</el-button></el-alert>
    <template v-else-if="data">
      <h3>{{ data.title }}</h3>
      <el-table :data="data.sessions" empty-text="暂无场次">
        <el-table-column prop="title" label="场次" min-width="160" />
        <el-table-column label="开始时间" min-width="170"><template #default="{ row }">{{ format(row.startTime) }}</template></el-table-column>
        <el-table-column label="状态" width="90"><template #default="{ row }">{{ status[row.status] || row.status }}</template></el-table-column>
        <el-table-column prop="capacity" label="名额" width="65" />
      </el-table>
      <template v-if="canManage">
        <h4>新增场次</h4>
        <p class="series-note">新场次保存为草稿，独立报名与名额。票种、群二维码、地图坐标和优先报名时段不复制；详情中的旧日期、价格及场地描述须逐场核对后发布。</p>
        <el-form label-position="top" :disabled="saving">
          <el-form-item label="系列名称"><el-input v-model="title" maxlength="120" /></el-form-item>
          <div v-for="(session, index) in sessions" :key="index" class="session-row">
            <strong>新场次 {{ index + 1 }}</strong><el-button :icon="Delete" title="移除此场次" aria-label="移除此场次" @click="sessions.splice(index, 1)" />
            <el-form-item label="开始（北京时间）"><el-date-picker v-model="session.startTime" type="datetime" /></el-form-item>
            <el-form-item label="结束（北京时间）"><el-date-picker v-model="session.endTime" type="datetime" /></el-form-item>
            <el-form-item label="报名截止（北京时间）"><el-date-picker v-model="session.registrationDeadline" type="datetime" /></el-form-item>
            <el-form-item label="活动地点"><el-input v-model="session.location" maxlength="255" /></el-form-item>
          </div>
          <el-button :icon="Plus" :disabled="sessions.length >= 12" @click="add">添加场次</el-button>
        </el-form>
      </template>
    </template>
    <template #footer><el-button :disabled="saving" :icon="Refresh" @click="load">重新加载</el-button><el-button :disabled="saving" @click="close">关闭</el-button><el-button v-if="canManage" :loading="saving" :disabled="!data || !sessions.length" type="primary" @click="save">创建场次草稿</el-button></template>
  </el-drawer>
</template>

<style scoped>
.series-note{font-size:13px;line-height:1.6;color:#667085}.session-row{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;padding:16px 0;border-top:1px solid #e5e7eb}.session-row>button{justify-self:end}.session-row :deep(.el-date-editor){width:100%}@media(max-width:600px){.session-row{grid-template-columns:1fr}}
</style>
