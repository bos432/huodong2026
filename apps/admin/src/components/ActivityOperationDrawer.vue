<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Delete, Refresh } from '@element-plus/icons-vue';
import { api } from '../api';
import { canAccess } from '../permissions';
import { formatShanghaiDateTime } from '../date-time';

const props = defineProps<{ activityId: number | null }>();
const emit = defineEmits<{ close: [] }>();
const data = ref<any>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
let generation = 0;
const canSave = computed(() => canAccess(['finance.manage']) && canAccess(['finance.view']));
const money = (fen: number) => (Number(fen || 0) / 100).toFixed(2);
async function load() {
  const id = props.activityId; const token = ++generation;
  data.value = null; error.value = ''; if (!id) return;
  loading.value = true;
  try { const result = await api.get<any, any>(`/admin/activities/${id}/operation`); if (token === generation) data.value = result; }
  catch (e: any) { if (token === generation) error.value = e.message || '台账加载失败'; }
  finally { if (token === generation) loading.value = false; }
}
watch(() => props.activityId, load, { immediate: true });
async function save() {
  if (!data.value || saving.value || !canSave.value) return;
  saving.value = true;
  try {
    data.value = await api.put<any, any>(`/admin/activities/${props.activityId}/operation`, { revision: data.value.revision, plan: data.value.plan });
    ElMessage.success('台账已保存');
  } catch (e: any) { ElMessage.error(e.message || '保存失败'); }
  finally { saving.value = false; }
}
function close() { if (!saving.value) { generation++; emit('close'); } }
</script>

<template>
  <el-drawer :model-value="Boolean(activityId)" title="活动经营台账" size="min(880px, 100vw)" :before-close="close" :close-on-click-modal="!saving">
    <div v-if="loading" role="status">台账加载中...</div>
    <el-alert v-else-if="error" :title="error" type="error" :closable="false"><el-button :icon="Refresh" @click="load">重试</el-button></el-alert>
    <template v-else-if="data">
      <h3>{{ data.title }}</h3>
      <el-alert v-if="data.isTest" title="测试活动：以下是测试口径，不作为正式经营业绩" type="warning" :closable="false" />
      <p class="note">以下为经营估算，非会计报表。自营计入净票款；合作模式仅计入手工登记的平台服务收入。收入退回请扣减原收入并在备注说明。</p>
      <div class="totals">
        <span>净票款<strong>{{ money(data.summary.ticketNetFen) }} 元</strong></span>
        <span>经营收入<strong>{{ money(data.summary.incomeFen) }} 元</strong></span>
        <span>实际成本<strong>{{ money(data.summary.costsFen) }} 元</strong></span>
        <span>贡献收益<strong>{{ money(data.summary.contributionFen) }} 元</strong></span>
      </div>
      <p class="note">汇总基于最近保存版本；未含未登记成本、税费及待退款项。票款实收 {{ money(data.summary.ticketGrossFen) }} 元，已完成退款 {{ money(data.summary.refundFen) }} 元。</p>
      <el-form label-position="top" :disabled="!canSave || saving">
        <div class="form-row">
          <el-form-item label="经营模式"><el-select v-model="data.plan.mode"><el-option label="自营活动" value="self"/><el-option label="合作 / 撮合活动" value="partner"/></el-select></el-form-item>
          <el-form-item label="负责人"><el-input v-model="data.plan.owner" maxlength="80" /></el-form-item>
          <el-form-item label="成本预算（元）"><el-input-number :model-value="data.plan.budgetFen / 100" :precision="2" :min="0" :max="100000000" @update:model-value="data.plan.budgetFen = Math.round(Number($event || 0) * 100)" /></el-form-item>
          <el-form-item label="目标经营收入（元）"><el-input-number :model-value="data.plan.targetRevenueFen / 100" :precision="2" :min="0" :max="100000000" @update:model-value="data.plan.targetRevenueFen = Math.round(Number($event || 0) * 100)" /></el-form-item>
        </div>
        <h4>实际收支</h4>
        <p class="note">成本填写场地、物料、人员、推广、支付通道费等。收入填写服务费、赞助等；自营票款已自动计入，请勿重复登记。</p>
        <div v-for="(entry, index) in data.plan.entries" :key="index" class="entry-row">
          <el-select v-model="entry.kind" aria-label="收支类型" @change="entry.channelId = null"><el-option label="成本" value="cost"/><el-option label="其他收入" value="income"/></el-select>
          <el-input v-model="entry.label" maxlength="120" placeholder="条目名称" aria-label="条目名称"/>
          <el-input-number :model-value="entry.amountFen / 100" :min="0" :max="100000000" :precision="2" aria-label="金额（元）" @update:model-value="entry.amountFen = Math.round(Number($event || 0) * 100)"/>
          <el-select v-if="entry.kind === 'cost'" v-model="entry.channelId" clearable placeholder="非渠道成本" aria-label="成本归属渠道" @clear="entry.channelId = null"><el-option :value="0" label="未归因 / 自然访问"/><el-option v-for="channel in data.channels" :key="channel.id" :value="channel.id" :label="channel.name"/></el-select>
          <span v-else />
          <el-button :icon="Delete" title="移除此收支条目" aria-label="移除此收支条目" @click="data.plan.entries.splice(index, 1)" />
        </div>
        <el-button :icon="Plus" :disabled="data.plan.entries.length >= 100" @click="data.plan.entries.push({ kind: 'cost', label: '', amountFen: 0 })">添加收支</el-button>
        <h4>交付检查</h4>
        <div class="checklist"><el-checkbox v-for="item in data.plan.checklist" :key="item.label" v-model="item.done">{{ item.label }}</el-checkbox></div>
        <el-form-item label="结算、异常及复盘备注"><el-input v-model="data.plan.note" type="textarea" :rows="4" maxlength="2000" show-word-limit /></el-form-item>
      </el-form>
      <h4>渠道投入与付费结果</h4>
      <p class="note">仅归属渠道的成本参与测算。净票款不等于平台利润；免费单、全额退款及取消/拒绝的报名不计入有效付费用户。同一商家首次有效付费按付款时间、订单号顺序归属，不代表广告的因果效果。</p>
      <el-alert v-if="!data.channelMetrics.fullCustomerHistoryVisible" title="当前活动数据范围受限，首次付费用户及获客成本不展示" type="info" :closable="false"/>
      <el-table :data="data.channelMetrics.rows" empty-text="暂无渠道数据">
        <el-table-column prop="name" label="渠道" min-width="120" />
        <el-table-column label="投入（元）" width="100"><template #default="{row}">{{ money(row.costFen) }}</template></el-table-column>
        <el-table-column label="净票款（元）" width="110"><template #default="{row}">{{ money(row.netTicketFen) }}</template></el-table-column>
        <el-table-column prop="paidUsers" label="有效付费人数" width="115" />
        <el-table-column label="首次付费人数" width="115"><template #default="{row}">{{ row.newPaidUsers ?? '-' }}</template></el-table-column>
        <el-table-column label="每位付费用户成本" width="140"><template #default="{row}">{{ row.costPerPaidUserFen === null ? '-' : money(row.costPerPaidUserFen) }}</template></el-table-column>
        <el-table-column label="获客成本（元）" width="120"><template #default="{row}">{{ row.costPerNewPaidUserFen === null ? '-' : money(row.costPerNewPaidUserFen) }}</template></el-table-column>
        <el-table-column prop="freeOrders" label="免费单" width="75" />
        <el-table-column prop="fullyRefundedOrders" label="全退单" width="75" />
        <el-table-column prop="unknownPaidAtCount" label="付款时间缺失" width="110" />
      </el-table>
      <p class="note">未分配到渠道的成本：{{ money(data.channelMetrics.unallocatedCostFen) }} 元；渠道分析已排除 {{ data.channelMetrics.excludedTestOrders }} 笔测试账号订单。没有有效分母或付款时间不完整时显示“-”。</p>
      <el-collapse><el-collapse-item title="历史保存记录" name="history">
        <div v-for="version in data.versions" :key="version.revision"><strong>V{{ version.revision }} · {{ version.updatedBy }} · {{ formatShanghaiDateTime(version.createdAt, '-', true) }}</strong><pre>{{ JSON.stringify(version.plan, null, 2) }}</pre></div>
      </el-collapse-item></el-collapse>
    </template>
    <template #footer><el-button :disabled="saving" :icon="Refresh" @click="load">重新加载</el-button><el-button :disabled="saving" @click="close">关闭</el-button><el-button v-if="canSave" type="primary" :loading="saving" :disabled="!data || loading" @click="save">保存台账</el-button></template>
  </el-drawer>
</template>

<style scoped>
.note{color:#667085;font-size:13px;line-height:1.6}.totals{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding:16px 0;border-bottom:1px solid #e5e7eb}.totals strong{display:block;margin-top:8px;color:#0f766e}.form-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.entry-row{display:grid;grid-template-columns:100px minmax(100px,1fr) 150px 150px 36px;gap:8px;margin-bottom:12px}.checklist{display:grid;margin-bottom:20px}.checklist :deep(.el-checkbox){white-space:normal;height:auto;min-height:32px}.checklist :deep(.el-checkbox__label){white-space:normal}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}@media(max-width:760px){.totals{grid-template-columns:repeat(2,minmax(0,1fr))}.entry-row{grid-template-columns:1fr 1fr}.form-row{grid-template-columns:1fr}}
</style>
