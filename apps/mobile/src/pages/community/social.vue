<template>
  <view class="social-page has-custom-nav">
    <view class="social-nav"><button class="nav-back" aria-label="返回上一页" @click="goBack">返回</button><text class="nav-title">社交拓展</text><button v-if="mine" class="nav-action" aria-label="编辑拓展资料" @click="editProfile">编辑</button><text v-else class="nav-action" /></view>

    <view class="social-hero app-enter">
      <text class="hero-kicker">同城连接</text>
      <text class="hero-title">认识值得一起做事的人</text>
      <text class="hero-copy">资料审核通过后才会公开；联系方式不会展示，先关注、再在线建立连接。</text>
      <view class="hero-actions">
        <button class="hero-button app-press" @click="editProfile">{{ mine ? "完善拓展资料" : "创建同行档案" }}</button>
        <button v-if="mine?.status === 'approved'" class="hero-button secondary app-press" @click="openCard">我的名片</button>
        <button class="hero-button secondary app-press" @click="openConnections">连接申请</button>
      </view>
    </view>

    <view v-if="mine" class="profile-status app-enter">
      <view><text class="status-title">我的拓展资料</text><text class="status-copy">{{ statusCopy }}</text></view>
      <text class="status-badge" :class="mine.status">{{ statusText }}</text>
    </view>

    <view class="directory-head app-enter"><view><text class="section-title">发现同城伙伴</text><text class="section-copy">按行业、城市或合作方向查找</text></view></view>
    <view class="search-row app-enter"><input v-model="keyword" name="socialSearch" aria-label="搜索行业、城市或合作方向" autocomplete="off" confirm-type="search" placeholder="搜索行业、城市或合作方向" @confirm="loadProfiles" /><button class="search-action" aria-label="搜索拓展伙伴" @click="loadProfiles">搜索</button></view>

    <view v-if="loading" class="state" role="status" aria-live="polite">正在加载拓展伙伴…</view>
    <view v-else-if="error" class="state error" role="alert" aria-live="assertive"><text>{{ error }}</text><button class="retry" aria-label="重新加载拓展伙伴" @click="loadProfiles">重新加载</button></view>
    <view v-else-if="!profiles.length" class="state empty"><text class="empty-title">暂时没有匹配的伙伴</text><text>完善并提交你的资料，审核后即可被同城伙伴发现。</text></view>

    <view v-else class="profile-list">
      <view v-for="(item, index) in profiles" :key="item.id" class="profile-card app-stagger" :style="{ '--motion-delay': `${index * 42}ms` }">
        <view class="profile-head">
          <image v-if="item.avatarUrl" class="avatar" :src="item.avatarUrl" mode="aspectFill" />
          <view v-else class="avatar avatar-fallback">{{ item.displayName.slice(0, 1) }}</view>
          <view class="identity"><text class="name">{{ item.displayName }}</text><text class="role">{{ [item.roleTitle, item.industry, item.city].filter(Boolean).join(" · ") || "慢π活动伙伴" }}</text></view>
          <button v-if="!item.mine" class="follow app-press" :class="{ active: item.following, disabled: followingId === item.userId }" @click="toggleFollow(item)">{{ followingId === item.userId ? "处理中" : item.following ? "已关注" : "关注" }}</button>
        </view>
        <text class="intro">{{ item.introduction }}</text>
        <view class="resource-block"><text class="resource-label">我能提供</text><view class="tags"><text v-for="tag in item.offers" :key="`o-${tag}`" class="tag offer">{{ tag }}</text></view></view>
        <view class="resource-block"><text class="resource-label">希望认识</text><view class="tags"><text v-for="tag in item.needs" :key="`n-${tag}`" class="tag need">{{ tag }}</text></view></view>
        <button v-if="!item.mine" class="connection-request" :disabled="requestingConnection" @click="requestConnection(item)">申请同行</button>
      </view>
    </view>
    <view class="page-space" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow, onHide } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode, getCurrentTenantCode, getUserToken } from "../../api";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";
import { createTenantLoadGuard } from '../../tenant-load-guard';

const mine = ref<any>(null);
const profiles = ref<any[]>([]);
const keyword = ref("");
const loading = ref(true);
const error = ref("");
const followingId = ref(0);
const requestingConnection = ref(false);
const profileGuard = createTenantLoadGuard(); const mineGuard = createTenantLoadGuard(); let showGeneration = 0;
const statusText = computed(() => mine.value?.status === "approved" ? mine.value?.visible === false ? '仅自己可见' : "已展示" : mine.value?.status === "rejected" ? "需修改" : "审核中");
const statusCopy = computed(() => mine.value?.status === "approved" ? mine.value?.visible === false ? '当前未公开展示。' : "其他伙伴已经可以看到你的公开资料。" : mine.value?.status === "rejected" ? mine.value.reviewRemark || "请修改资料后重新提交。" : "平台审核通过后会在当前商家范围内展示。" );

onShow(async () => {
  const generation = ++showGeneration; mine.value = null; profiles.value = [];
  await loadFeatureGates(true);
  if (generation !== showGeneration || !guardCurrentPageFeature()) return;
  try { await ensureUser(); if (generation === showGeneration) await Promise.all([loadMine(), loadProfiles()]); } catch (e: any) { if (generation === showGeneration) { if (!String(e?.message || "").includes("请先完成")) error.value = e?.message || "社交拓展加载失败"; loading.value = false; } }
});
onHide(() => { showGeneration++; profileGuard.invalidate(); mineGuard.invalidate(); mine.value = null; profiles.value = []; });

async function loadMine() { const token = mineGuard.begin(); const result = await request('/public/me/social-profile'); if (mineGuard.isCurrent(token)) mine.value = result; }
async function loadProfiles() { const token = profileGuard.begin(); loading.value = true; error.value = ""; try { const query = keyword.value.trim() ? `?keyword=${encodeURIComponent(keyword.value.trim())}` : ""; const rows = await request<any[]>(`/public/social/profiles${query}`); if (profileGuard.isCurrent(token)) profiles.value = Array.isArray(rows) ? rows : []; } catch (e: any) { if (profileGuard.isCurrent(token)) error.value = e?.message || "拓展伙伴加载失败"; } finally { if (profileGuard.isCurrent(token)) loading.value = false; } }
async function toggleFollow(item: any) { if (!item?.userId || followingId.value) return; followingId.value = item.userId; try { const result = await request<any>(`/public/community/users/${item.userId}/follow`, { method: "POST" }); item.following = Boolean(result.following); uni.showToast({ title: item.following ? "已关注" : "已取消关注", icon: "none" }); } catch (e: any) { uni.showToast({ title: e?.message || "操作失败", icon: "none" }); } finally { followingId.value = 0; } }
function editProfile() { uni.navigateTo({ url: withTenantCode("/pages/community/social-profile") }); }
function openCard() { uni.navigateTo({ url: withTenantCode("/pages/community/card") }); }
function openConnections() { uni.navigateTo({ url: withTenantCode('/pages/community/connections') }); }
async function requestConnection(item: any) {
  if (requestingConnection.value) return;
  if (mine.value?.status !== 'approved' || mine.value?.visible === false) return uni.showToast({ title: '请先完善并公开已审核资料', icon: 'none' });
  requestingConnection.value = true;
  const tenantCode = getCurrentTenantCode(); const userToken = getUserToken(); const generation = showGeneration;
  try {
    const index = await new Promise<number>(resolve => uni.showActionSheet({ itemList: ['一起参加活动', '阅读交流', '合作探讨'], success: result => resolve(result.tapIndex), fail: () => resolve(-1) }));
    if (index < 0 || tenantCode !== getCurrentTenantCode() || userToken !== getUserToken() || generation !== showGeneration) return;
    const result = await request<any>('/public/me/social-connections', { method: 'POST', data: { targetUserId: item.userId, intent: ['activity', 'reading', 'collaboration'][index] } });
    if (generation === showGeneration && tenantCode === getCurrentTenantCode() && userToken === getUserToken()) uni.showModal({ title: result.status === 'accepted' ? '已建立连接' : '申请待确认', content: result.incoming ? '对方已有申请，请在连接申请中选择是否同意。' : '可在连接申请中查看状态。联系方式不会公开。', showCancel: false });
  } catch (e: any) { uni.showToast({ title: e?.message || '申请失败', icon: 'none' }); }
  finally { requestingConnection.value = false; }
}
function goBack() { uni.navigateBack(); }
</script>

<style scoped>
.connection-request{margin:22rpx 0 0 auto;min-height:62rpx;width:180rpx;border-radius:12rpx;background:#0f766e;color:#fff;font-size:24rpx}
.social-page{min-height:100vh;padding-bottom:env(safe-area-inset-bottom);background:#f4f7f5;color:#15251b;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.social-nav{height:92rpx;display:grid;grid-template-columns:100rpx 1fr 100rpx;align-items:center;padding:0 28rpx;background:#fff}.nav-back,.nav-action{width:auto;min-height:64rpx;margin:0;padding:0;border:0;background:transparent;color:#08753f;font-size:26rpx;line-height:64rpx}.nav-back{text-align:left}.nav-action{text-align:right}.nav-back::after,.nav-action::after,.search-action::after,.retry::after{border:0}.nav-title{text-align:center;font-size:30rpx;font-weight:900}.social-hero{padding:42rpx 32rpx 36rpx;background:#153d2a;color:#fff}.hero-kicker,.hero-title,.hero-copy{display:block}.hero-kicker{font-size:23rpx;color:#aef0c4;font-weight:800}.hero-title{max-width:620rpx;margin-top:14rpx;font-size:40rpx;line-height:1.28;font-weight:950}.hero-copy{margin-top:18rpx;font-size:25rpx;line-height:1.65;color:rgba(255,255,255,.78)}.hero-button{width:220rpx;min-height:76rpx;margin:26rpx 0 0;padding:0;border:0;border-radius:8rpx;background:#baf3cb;color:#123522;font-size:27rpx;font-weight:900}.hero-button::after,.follow::after{border:0}.profile-status{display:flex;align-items:center;justify-content:space-between;gap:20rpx;padding:24rpx 28rpx;background:#fff;border-bottom:1rpx solid #e4ebe7}.status-title,.status-copy{display:block}.status-title{font-size:27rpx;font-weight:900}.status-copy{margin-top:7rpx;font-size:22rpx;line-height:1.45;color:#728078}.status-badge{flex:none;padding:8rpx 12rpx;border-radius:6rpx;background:#fff4d8;color:#996100;font-size:22rpx;font-weight:800}.status-badge.approved{background:#e8f8ed;color:#08753f}.status-badge.rejected{background:#fff0ef;color:#b42318}.directory-head{padding:32rpx 28rpx 16rpx}.section-title,.section-copy{display:block}.section-title{font-size:32rpx;font-weight:950}.section-copy{margin-top:7rpx;color:#77847d;font-size:23rpx}.search-row{display:flex;align-items:center;gap:12rpx;margin:0 28rpx 20rpx;padding:10rpx 12rpx 10rpx 22rpx;border:1rpx solid #dbe5df;border-radius:8rpx;background:#fff}.search-row input{flex:1;height:62rpx;font-size:25rpx}.search-action{width:auto;min-height:56rpx;margin:0;padding:0 18rpx;border:0;border-radius:6rpx;background:#e9f8ee;color:#08753f;font-size:24rpx;font-weight:800;line-height:56rpx}.profile-list{display:grid;gap:16rpx;padding:0 28rpx}.profile-card{padding:26rpx;border:1rpx solid #e0e8e3;border-radius:8rpx;background:#fff}.profile-head{display:flex;align-items:center;gap:16rpx}.avatar{width:82rpx;height:82rpx;flex:none;border-radius:50%;background:#e7f4eb}.identity{min-width:0;flex:1}.name,.role{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.name{font-size:29rpx;font-weight:900}.role{margin-top:6rpx;color:#728078;font-size:22rpx}.follow{min-width:112rpx;min-height:60rpx;margin:0;padding:0 16rpx;border:0;border-radius:8rpx;background:#143d29;color:#fff;font-size:23rpx;font-weight:800}.follow.active{background:#edf3ef;color:#5f6f66}.follow.disabled{opacity:.55}.intro{display:block;margin-top:20rpx;color:#43534a;font-size:25rpx;line-height:1.65}.resource-block{display:grid;grid-template-columns:116rpx 1fr;gap:12rpx;margin-top:18rpx}.resource-label{padding-top:7rpx;color:#74827a;font-size:22rpx}.tags{display:flex;flex-wrap:wrap;gap:9rpx}.tag{padding:7rpx 11rpx;border-radius:6rpx;font-size:21rpx}.tag.offer{background:#e9f8ee;color:#08753f}.tag.need{background:#fff4e5;color:#a45d00}.state{display:grid;gap:14rpx;margin:0 28rpx;padding:34rpx;border-radius:8rpx;background:#fff;color:#718078;font-size:25rpx;text-align:center}.state.error{color:#b42318}.retry{width:auto;min-height:56rpx;margin:0;padding:0;border:0;background:transparent;color:#08753f;font-weight:900;line-height:56rpx}.empty-title{color:#26382e;font-size:28rpx;font-weight:900}.page-space{height:36rpx}@media(min-width:900px){.social-page{max-width:760px;margin:0 auto}}
.social-page{background:var(--app-page-bg);color:var(--app-text)}
.hero-actions{display:flex;flex-wrap:wrap;gap:14rpx;margin-top:26rpx}.hero-actions .hero-button{margin:0}.hero-button.secondary{background:rgba(255,255,255,.12);color:#fff;border:1rpx solid rgba(255,255,255,.6)}.hero-button.secondary::after{border:0}
.avatar-fallback{display:grid;place-items:center;color:#08753f;font-weight:900}
.social-nav{border-bottom:1rpx solid var(--app-border)}
.nav-title{font-weight:850}
.social-hero{margin:20rpx 28rpx 0;padding:36rpx 30rpx;border-radius:16rpx;background:#16252d}
.hero-title{font-size:38rpx;line-height:1.32;font-weight:900}
.hero-button{border-radius:12rpx;background:#fff;color:#16252d}
.profile-status{margin:16rpx 28rpx 0;padding:24rpx;border:1rpx solid var(--app-border);border-radius:16rpx}
.search-row,.profile-card,.state{border-color:var(--app-border);border-radius:16rpx;box-shadow:none}
.follow{border-radius:12rpx;background:#16252d}
</style>
