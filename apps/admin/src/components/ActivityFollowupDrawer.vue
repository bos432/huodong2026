<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Refresh, Edit } from '@element-plus/icons-vue';
import { api } from '../api';
import { canAccess } from '../permissions';
const props = defineProps<{ activityId: number | null }>();
const emit = defineEmits<{ close: [] }>();
const data = ref<any>(null); const loading = ref(false); const saving = ref(false); const error = ref(''); const page = ref(1); const editing = ref(false);
let generation = 0;
const canManage = computed(() => canAccess(['registration.manage']));
const kindNames: Record<string, string> = { feedback: '参与反馈', next_activity: '下期活动', return_visit: '再次回访' };
const states: Record<string, string> = { pending: '待跟进', done: '已完成', declined: '本项不再联系' };
const form = reactive({ registrationId: 0 as number | string, assigneeId: 0, kind: 'feedback', status: 'pending', dueAt: null as Date | null, outcome: '', revision: 0 });
const format = (v: string) => new Date(v).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
async function load() {
  const token = ++generation; error.value = ''; if (!props.activityId) { data.value = null; return; }
  loading.value = true;
  try { const result = await api.get<any, any>(`/admin/activities/${props.activityId}/followups`, { params: { page: page.value } }); if (token === generation) data.value = result; }
  catch (e: any) { if (token === generation) { error.value = e.message || '跟进加载失败'; data.value = null; } }
  finally { if (token === generation) loading.value = false; }
}
watch(() => props.activityId, () => { page.value = 1; editing.value = false; data.value = null; void load(); }, { immediate: true });
function edit(row?: any) {
  Object.assign(form, row ? { ...row, dueAt: new Date(row.dueAt) } : { registrationId: 0, assigneeId: data.value?.assignees[0]?.id || 0, kind: 'feedback', status: 'pending', dueAt: new Date(Date.now() + 86400000), outcome: '', revision: 0 });
  editing.value = true;
}
async function save() {
  if (saving.value || !canManage.value) return;
  if (!form.dueAt) return ElMessage.warning('请选择到期时间');
  saving.value = true;
  try { await api.put(`/admin/activities/${props.activityId}/followups`, { registrationId: Number(form.registrationId), assigneeId: form.assigneeId, kind: form.kind, status: form.status, outcome: form.outcome, dueAt: form.dueAt.toISOString(), revision: form.revision }); editing.value = false; await load(); ElMessage.success('跟进已保存'); }
  catch (e: any) { ElMessage.error(e.message || '保存失败'); }
  finally { saving.value = false; }
}
function close() { if (!saving.value) { generation++; emit('close'); } }
</script>

<template>
  <el-drawer :model-value="Boolean(activityId)" title="活动后跟进" size="min(860px,100vw)" :before-close="close" :close-on-click-modal="!saving">
    <div v-if="loading" role="status">跟进加载中...</div>
    <el-alert v-else-if="error" :title="error" type="error" :closable="false"><el-button @click="load" :icon="Refresh">重试</el-button></el-alert>
    <template v-else-if="data">
      <h3>{{ data.title }}</h3>
      <el-alert v-if="data.isTest" title="测试活动与测试后续报名，不计正式业绩" type="warning" :closable="false" />
      <p class="note">内部跟进记录，不会自动向用户发送消息。实际联系前须核对用户意愿与通知偏好，不填写身份证、健康信息等无关敏感资料。</p>
      <el-alert v-if="!data.ready" title="活动尚未结束或已取消，暂不创建跟进" type="info" :closable="false" />
      <el-button v-if="canManage" :icon="Plus" :disabled="!data.ready || saving" @click="edit()">新建跟进</el-button>
      <el-table :data="data.items" empty-text="暂无跟进任务">
        <el-table-column prop="registrationId" label="报名编号" width="95" />
        <el-table-column label="类型" width="100"><template #default="{ row }">{{ kindNames[row.kind] }}</template></el-table-column>
        <el-table-column label="负责人" min-width="100"><template #default="{ row }">{{ data.assignees.find((a: any) => a.id === row.assigneeId)?.name || `账号${row.assigneeId}` }}</template></el-table-column>
        <el-table-column label="到期" min-width="165"><template #default="{ row }">{{ format(row.dueAt) }}<span v-if="row.status === 'pending' && new Date(row.dueAt).getTime() < Date.now()" class="overdue"> · 已逾期</span></template></el-table-column>
        <el-table-column label="状态" width="120"><template #default="{ row }">{{ states[row.status] }}</template></el-table-column>
        <el-table-column label="结果" prop="outcome" min-width="150" />
        <el-table-column label="后续报名 / 付费" width="140"><template #default="{row}">{{ row.subsequent.registrations }} / {{ row.subsequent.paidActivities }}</template></el-table-column>
        <el-table-column v-if="canManage" label="操作" width="80"><template #default="{ row }"><el-button :icon="Edit" aria-label="编辑跟进" title="编辑跟进" :disabled="saving || !data.ready" @click="edit(row)" /></template></el-table-column>
      </el-table>
      <p class="note">后续结果为本活动结束后30天内、当前账号可见的同商家其他活动。付费数排除免费、全退、取消和拒绝报名；不代表跟进导致了成交。</p>
      <el-pagination v-model:current-page="page" :total="data.total" :page-size="50" layout="prev,pager,next" @current-change="load" />
      <el-form v-if="editing" class="followup-form" label-position="top" :disabled="saving">
        <div class="fields">
          <el-form-item label="报名编号"><el-select v-model="form.registrationId" filterable allow-create default-first-option :disabled="form.revision > 0" placeholder="选择或输入已签到报名编号"><el-option v-for="item in data.candidates" :key="item.id" :value="item.id" :label="`#${item.id} ${item.name}`" /></el-select></el-form-item>
          <el-form-item label="跟进类型"><el-select v-model="form.kind" :disabled="form.revision > 0"><el-option v-for="(label, key) in kindNames" :key="key" :label="label" :value="key" /></el-select></el-form-item>
          <el-form-item label="负责人"><el-select v-model="form.assigneeId"><el-option v-for="owner in data.assignees" :key="owner.id" :label="owner.name" :value="owner.id" /></el-select></el-form-item>
          <el-form-item label="到期时间"><el-date-picker v-model="form.dueAt" type="datetime" /></el-form-item>
          <el-form-item label="状态"><el-select v-model="form.status"><el-option v-for="(label, key) in states" :key="key" :label="label" :value="key" /></el-select></el-form-item>
        </div>
        <el-form-item label="结果与后续事项"><el-input v-model="form.outcome" type="textarea" :rows="3" maxlength="1000" show-word-limit /></el-form-item>
        <el-button @click="editing = false">取消编辑</el-button><el-button type="primary" :loading="saving" @click="save">保存跟进</el-button>
      </el-form>
    </template>
    <template #footer><el-button :icon="Refresh" :disabled="saving" @click="load">刷新</el-button><el-button :disabled="saving" @click="close">关闭</el-button></template>
  </el-drawer>
</template>

<style scoped>
.note{color:#667085;font-size:13px;line-height:1.6}.followup-form{padding-top:20px;margin-top:20px;border-top:1px solid #e5e7eb}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.fields :deep(.el-date-editor){width:100%}.overdue{color:#b42318}@media(max-width:600px){.fields{grid-template-columns:1fr}}
</style>
