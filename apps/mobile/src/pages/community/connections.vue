<template>
  <view class="connections-page">
    <view class="connections-nav"><button @click="goBack" aria-label="返回">返回</button><text>同行连接</text><button @click="load(true)" :disabled="loading || busy > 0">刷新</button></view>
    <scroll-view scroll-x class="connection-tabs"><view class="tab-track"><button v-for="tab in tabs" :key="tab.key" :class="{ selected: view === tab.key }" :disabled="busy > 0" @click="choose(tab.key)">{{ tab.label }}</button></view></scroll-view>
    <view v-if="loading && !rows.length" class="connection-state" role="status">申请加载中...</view>
    <view v-else-if="error" class="connection-state error" role="alert"><text>{{ error }}</text><button @click="load(true)">重试</button></view>
    <view v-else-if="!rows.length" class="connection-state">暂无连接记录</view>
    <view v-for="row in rows" :key="row.id" class="connection-row">
      <view class="connection-heading"><text class="connection-name">{{ row.displayName }}</text><text class="connection-status">{{ statusText(row) }}</text></view>
      <text class="connection-intent">{{ intents[row.intent] || '同行申请' }} · {{ row.incoming ? '收到的申请' : '发出的申请' }}</text>
      <text class="connection-date">{{ formatDate(row.requestedAt) }}</text>
      <view class="connection-actions">
        <button v-if="row.otherUserId" :disabled="busy > 0" @click="openCard(row.otherUserId)">查看名片</button>
        <button v-for="action in row.actions" :key="action" :class="{ primary: action === 'accept', danger: action === 'block' }" :disabled="busy > 0 || loading" @click="act(row, action)">{{ busy === row.id ? '处理中' : actionLabels[action] }}</button>
      </view>
    </view>
    <button v-if="rows.length < total" class="load-more" :disabled="loading || busy > 0" @click="load(false)">{{ loading ? '加载中' : '加载更多' }}</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow, onHide } from '@dcloudio/uni-app';
import { ensureUser, request, withTenantCode } from '../../api';
import { guardCurrentPageFeature, loadFeatureGates } from '../../feature-gates';
import { createTenantLoadGuard, formatShanghaiDateTime } from '../../tenant-load-guard';
const tabs = [{ key: 'all', label: '全部' }, { key: 'incoming', label: '待我确认' }, { key: 'outgoing', label: '我发出的' }, { key: 'connected', label: '已连接' }, { key: 'blocked', label: '已屏蔽' }];
const intents: Record<string, string> = { activity: '一起参加活动', reading: '阅读交流', collaboration: '合作探讨' };
const actionLabels: Record<string, string> = { accept: '同意', decline: '婉拒', withdraw: '撤回', disconnect: '解除连接', block: '屏蔽', unblock: '解除屏蔽' };
const rows = ref<any[]>([]); const view = ref('all'); const page = ref(0); const total = ref(0); const loading = ref(false); const error = ref(''); const busy = ref(0);
const guard = createTenantLoadGuard();
let actionGeneration = 0;
const formatDate = (value: string) => formatShanghaiDateTime(value);
function statusText(row: any) { return row.status === 'pending' ? (row.incoming ? '待我确认' : '待对方确认') : ({ accepted: '已连接', declined: '未建立连接', withdrawn: '已撤回', disconnected: '连接已解除', blocked: '已屏蔽', unavailable: '暂不可用', expired: '已过期' } as Record<string, string>)[row.status] || '状态更新中'; }
onShow(async () => { await loadFeatureGates(true); if (guardCurrentPageFeature()) await load(true); });
onHide(() => { guard.invalidate(); actionGeneration++; busy.value = 0; rows.value = []; page.value = 0; total.value = 0; });
async function load(reset: boolean) {
  const token = guard.begin(); const target = reset ? 1 : page.value + 1; loading.value = true; error.value = '';
  if (reset) { rows.value = []; page.value = 0; total.value = 0; }
  try {
    await ensureUser(); if (!guard.isCurrent(token)) return;
    const result = await request<any>(`/public/me/social-connections?page=${target}&view=${view.value}`);
    if (!guard.isCurrent(token)) return;
    rows.value = reset ? result.items : [...rows.value, ...result.items]; total.value = result.total; page.value = result.page;
  } catch (e: any) { if (guard.isCurrent(token)) error.value = e?.message || '申请加载失败'; }
  finally { if (guard.isCurrent(token)) loading.value = false; }
}
function choose(key: string) { if (view.value === key) return; view.value = key; void load(true); }
async function act(row: any, action: string) {
  if (busy.value || loading.value) return;
  const actionToken = ++actionGeneration;
  const tenantToken = guard.begin(); busy.value = row.id;
  try {
    const content = action === 'accept' ? '同意在当前商家范围建立同行连接，不会公开手机号或微信号。' : action === 'unblock' ? '解除屏蔽不会自动恢复原有连接。' : action === 'block' ? '屏蔽对方在当前商家的连接申请，并解除当前连接。' : `确认${actionLabels[action]}？`;
    const confirmed = await new Promise<boolean>(resolve => uni.showModal({ title: actionLabels[action], content, success: result => resolve(Boolean(result.confirm)), fail: () => resolve(false) }));
    if (!confirmed || !guard.isCurrent(tenantToken)) return;
    await request(`/public/me/social-connections/${row.id}/actions`, { method: 'POST', data: { action, revision: row.revision } });
    if (!guard.isCurrent(tenantToken)) return;
    uni.showToast({ title: '已更新', icon: 'none' }); await load(true);
  } catch (e: any) { if (guard.isCurrent(tenantToken)) { error.value = e?.message || '操作失败，请刷新'; } }
  finally { if (actionToken === actionGeneration) busy.value = 0; }
}
function openCard(userId: number) { uni.navigateTo({ url: withTenantCode(`/pages/community/card?userId=${userId}`) }); }
function goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: withTenantCode('/pages/user/my') }) }); }
</script>

<style scoped>
.connections-page{min-height:100vh;background:var(--app-page-bg,#f5f7f7);color:var(--app-text,#16252d);padding:0 24rpx calc(32rpx + env(safe-area-inset-bottom));box-sizing:border-box;overflow-wrap:anywhere}.connections-nav{display:grid;grid-template-columns:100rpx 1fr 100rpx;gap:12rpx;align-items:center;min-height:96rpx;text-align:center;font-size:30rpx;font-weight:700}.connections-nav button{font-size:26rpx;margin:0;padding:0;border:0;background:transparent;color:#0f766e}.connections-nav button::after{border:0}.connection-tabs{width:100%;white-space:nowrap;margin-bottom:24rpx}.tab-track{display:inline-flex;gap:12rpx}.tab-track button{font-size:24rpx;margin:0;padding:0 20rpx;min-height:64rpx;background:#fff;border-radius:12rpx;color:#526169}.tab-track .selected{background:#0f766e;color:white}.connection-row{margin-bottom:16rpx;padding:24rpx;background:white;border:1rpx solid #dfe6e6;border-radius:16rpx}.connection-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:16rpx}.connection-name{min-width:0;flex:1;font-size:29rpx;font-weight:700}.connection-status{font-size:23rpx;color:#79521c;flex:none}.connection-intent,.connection-date{display:block;color:#66767a;font-size:24rpx;margin-top:12rpx;line-height:1.5}.connection-date{font-size:22rpx}.connection-actions{display:flex;flex-wrap:wrap;gap:12rpx;margin-top:20rpx}.connection-actions button{font-size:24rpx;min-height:64rpx;margin:0;padding:0 20rpx;border-radius:12rpx;background:#f1f5f5;color:#283e42}.connection-actions .primary{background:#0f766e;color:white}.connection-actions .danger{color:#a62934;background:#fff2f3}.connection-state{padding:40rpx 24rpx;text-align:center;color:#66767a;font-size:27rpx}.connection-state.error{color:#a62934}.load-more{font-size:26rpx;border-radius:12rpx;margin-top:16rpx;background:white}@media(min-width:900px){.connections-page{max-width:760px;margin:0 auto}}
</style>
