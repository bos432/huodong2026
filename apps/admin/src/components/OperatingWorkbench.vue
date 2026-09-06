<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Refresh, ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { api } from '../api';
import { canAccess } from '../permissions';
const router = useRouter();
const data = ref<any>(null); const loading = ref(false); const error = ref(''); const weekStart = ref('');
const money = (value: number) => (Number(value || 0) / 100).toFixed(2);
const dateText = (value: string) => new Date(value).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
const kinds: Record<string, string> = { feedback: '参与反馈', next_activity: '下期活动', return_visit: '再次回访' };
async function load() {
  loading.value = true; error.value = '';
  try { data.value = await api.get('/admin/operations/workbench', { params: weekStart.value ? { weekStart: weekStart.value } : {} }); }
  catch (e: any) { error.value = e.message || '经营周报加载失败'; data.value = null; }
  finally { loading.value = false; }
}
function shiftWeek(days: number) {
  if (!data.value?.week || loading.value) return;
  const date = new Date(`${data.value.week.date}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  weekStart.value = date.toISOString().slice(0, 10); void load();
}
onMounted(load);
</script>

<template>
  <section class="operating-workbench">
    <div class="band-header"><h3>开通检查与经营周报</h3><el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button></div>
    <p v-if="loading" role="status">正在汇总...</p>
    <el-alert v-else-if="error" :title="error" type="error" :closable="false" />
    <template v-else-if="data && !data.selectTenant">
      <div class="launch-list">
        <div v-for="stage in data.stages" :key="stage.key" class="launch-row"><span>{{ stage.title }}</span><el-tag :type="stage.configured ? 'success' : 'warning'">{{ stage.configured ? '已有配置' : '待完善' }}</el-tag><el-button v-if="stage.canOpen" link type="primary" @click="router.push(stage.path)">查看</el-button></div>
      </div>
      <p class="footnote">配置存在不代表已完成认证或实测。真实支付退款、通知到达和首场活动履约需另行验收。</p>
      <div class="band-header"><h4>周报 · {{ data.week.date }} 起的一周{{ data.week.complete ? '' : '（进行中）' }}</h4><div><el-button :icon="ArrowLeft" aria-label="上一周" title="上一周" :disabled="loading" @click="shiftWeek(-7)"/><el-button :icon="ArrowRight" aria-label="下一周" title="下一周" :disabled="loading || !data.week.complete" @click="shiftWeek(7)"/></div></div>
      <dl class="week-metrics"><div><dt>计划开始活动</dt><dd>{{ data.weekly.scheduledActivities }}</dd></div><div><dt>新增报名</dt><dd>{{ data.weekly.newRegistrations }}</dd></div><div><dt>签到人次</dt><dd>{{ data.weekly.checkIns }}</dd></div><div><dt>免费订单</dt><dd>{{ data.weekly.freeOrders }}</dd></div></dl>
      <dl v-if="data.weekly.financial" class="week-metrics financial"><div><dt>本周票款收款</dt><dd>{{ money(data.weekly.financial.receivedFen) }} 元</dd></div><div><dt>本周已完成退款</dt><dd>{{ money(data.weekly.financial.refundedFen) }} 元</dd></div><div><dt>票款净流入</dt><dd>{{ money(data.weekly.financial.netCashFen) }} 元</dd></div></dl>
      <p class="footnote">按北京时间自然周统计；已排除 {{ data.weekly.excludedTestActivities }} 场本周测试排期，报名和票款指标排除测试活动与测试账号。此为经营口径，不用于财务对账。票款净流入不等于平台利润；退款按完成时间计入。</p>
      <template v-if="data.tasks.length"><h4>待跟进事项</h4><div v-for="task in data.tasks" :key="task.id" class="task-row"><span>{{ kinds[task.kind] }} · 活动 #{{ task.activityId }}</span><time>{{ dateText(task.dueAt) }}</time><el-button v-if="canAccess(['activity.view'])" link type="primary" @click="router.push(`/activities?followupActivityId=${task.activityId}`)">处理</el-button></div></template>
      <h4>活动准备</h4><div v-for="activity in data.firstActivities" :key="activity.id" class="task-row"><span>{{ activity.title }}</span><el-button v-if="canAccess(['activity.view'])" link type="primary" @click="router.push(`/activities?activityId=${activity.id}`)">检查活动</el-button></div><p v-if="!data.firstActivities.length" class="footnote">尚无正式活动草稿</p>
    </template>
  </section>
</template>

<style scoped>
.operating-workbench{padding:20px 0;margin-bottom:22px;border-bottom:1px solid #dce4e4}.band-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.band-header h3,.band-header h4{margin:0;font-size:17px}.launch-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}.launch-row,.task-row{display:flex;align-items:center;gap:12px;min-height:44px;padding:8px 0;border-bottom:1px solid #edf0f0}.launch-row>span:first-child,.task-row>span:first-child{flex:1;min-width:0;overflow-wrap:anywhere}.week-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:12px 0}.week-metrics dt{font-size:13px;color:#657374}.week-metrics dd{margin:8px 0 0;font-size:22px;font-weight:700;color:#176d65}.financial{grid-template-columns:repeat(3,minmax(0,1fr))}.footnote{font-size:13px;color:#67767a;line-height:1.6}.task-row time{font-size:13px;color:#657374}@media(max-width:760px){.launch-list{grid-template-columns:1fr}.week-metrics,.financial{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
