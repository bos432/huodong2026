<template>
  <view class="space-page has-custom-nav">
    <view v-if="loading" class="space-state">活动空间加载中...</view>
    <view v-else-if="error" class="space-state error"><text>{{ error }}</text><text class="retry" @click="load">重新加载</text></view>
    <template v-else-if="space">
      <view class="space-hero app-enter">
        <image v-if="space.activity.coverUrl" :src="space.activity.coverUrl" mode="aspectFill" class="hero-cover app-media-motion" />
        <view class="hero-shade" />
        <view class="hero-copy"><text class="hero-kicker">已报名活动 · {{ activityStage.label }}</text><text class="hero-title">{{ space.activity.title }}</text><text class="hero-meta">{{ formatTime(space.activity.startTime) }} · {{ space.activity.location }}</text></view>
      </view>

      <view class="member-strip app-enter" style="animation-delay: 82ms">
        <view><text class="strip-number">{{ activityStage.primary }}</text><text>{{ activityStage.secondary }}</text></view>
        <view class="avatar-stack"><template v-for="(person, index) in space.participants.slice(0, 5)" :key="`${person.nickname}-${index}`"><image v-if="person.avatarUrl" :src="person.avatarUrl" mode="aspectFill" /><view v-else class="avatar-placeholder">慢</view></template></view>
      </view>

      <view class="space-section app-enter" style="animation-delay: 118ms">
        <view class="section-head"><text>活动公告</text><text class="section-note">主办方发布</text></view>
        <template v-if="space.announcements.length"><view v-for="(item, index) in space.announcements" :key="item.id" class="announcement app-stagger" :style="{ '--motion-delay': `${index * 42}ms` }"><view class="announcement-title"><text v-if="item.pinned" class="pin">置顶</text>{{ item.title }}</view><text class="announcement-content">{{ item.content }}</text><text class="announcement-time">{{ formatTime(item.publishAt || item.createdAt) }}</text></view></template>
        <view v-else class="empty">主办方暂未发布公告，活动变更会在这里同步。</view>
      </view>

      <view class="space-section app-enter" style="animation-delay: 150ms">
        <view class="section-head"><text>参与成员</text><text class="section-note">仅向已确认参与者展示</text></view>
        <view v-if="space.participants.length" class="participants"><view v-for="(person, index) in space.participants" :key="`${person.nickname}-${index}`" class="participant app-stagger" :style="{ '--motion-delay': `${index * 42}ms` }"><image v-if="person.avatarUrl" :src="person.avatarUrl" mode="aspectFill" /><view v-else class="avatar-placeholder">慢</view><text>{{ person.nickname }}</text><text v-if="person.checkedIn" class="checked">已签到</text></view></view>
        <view v-else class="empty">暂时还没有可展示的参与成员</view>
      </view>

      <view class="space-section app-enter" style="animation-delay: 184ms">
        <view class="section-head"><text>活动问答</text><text class="ask app-press" @click="openComposer">提问</text></view>
        <view v-if="space.posts.length" class="post-list"><view v-for="(post, index) in space.posts" :key="post.id" class="post app-stagger" :style="{ '--motion-delay': `${index * 42}ms` }"><view class="post-head"><image v-if="post.user.avatarUrl" :src="post.user.avatarUrl" mode="aspectFill" /><view v-else class="avatar-placeholder">慢</view><text>{{ post.user.nickname }}</text><text v-if="post.mine && post.status === 'pending'" class="pending">审核中</text><text class="post-time">{{ formatTime(post.createdAt) }}</text><text v-if="!post.mine" class="report app-press" @click="reportPost(post)">举报</text></view><text class="post-content">{{ post.content }}</text><text v-if="post.adminReply" class="reply">主办方回复：{{ post.adminReply }}</text></view></view>
        <view v-else class="empty">还没有问题，先向主办方提问吧</view>
      </view>

      <view class="space-section action-section app-enter" style="animation-delay: 218ms">
        <view class="section-head"><text>现场与服务</text></view>
        <view class="action-grid">
          <view class="action-cell app-press" @click="openLocation"><text>地点导航</text><text>{{ space.activity.location || "待确认" }}</text></view>
          <view v-if="space.checkIn.available" class="action-cell app-press" @click="openCheckIn"><text>签到码</text><text>活动当天出示</text></view>
          <!-- #ifdef MP-WEIXIN -->
          <button v-if="shareInvite?.code" class="action-cell share-action" open-type="share"><text>分享活动</text><text>邀请朋友一起参加</text></button>
          <view v-else class="action-cell app-press" @click="prepareShare"><text>生成邀请</text><text>生成后可分享给朋友</text></view>
          <button class="action-cell contact app-press" open-type="contact" :session-from="customerServiceSession"><text>联系客服</text><text>咨询活动安排</text></button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <view class="action-cell app-press" @click="copyActivityLink"><text>{{ shareInvite?.code ? "复制邀请链接" : "生成邀请" }}</text><text>分享给朋友</text></view>
          <view class="action-cell contact app-press" @click="goService"><text>联系客服</text><text>查看主办方联系方式</text></view>
          <!-- #endif -->
        </view>
      </view>

      <view v-if="space.activity.groupQrCodeUrl" class="space-section group-card"><view class="section-head"><text>活动群</text><text class="section-note">长按二维码识别</text></view><image v-if="!groupQrImageError" :src="space.activity.groupQrCodeUrl" mode="aspectFit" class="group-qr" show-menu-by-longpress="true" @click="previewGroupQr" @error="groupQrImageError = true" /><view v-else class="empty">群二维码加载失败，请在报名详情查看主办方联系方式。</view></view>
      <view class="page-space" />
    </template>
    <TabBar current="activity" />

    <view v-if="composerVisible" class="composer-mask" @click.self="composerVisible = false"><view class="composer app-sheet-enter"><text class="composer-title">提出问题</text><textarea v-model="draft" maxlength="1000" placeholder="活动安排、现场准备等问题都可以写在这里" auto-height /><view class="composer-actions"><text class="app-press" @click="composerVisible = false">取消</text><text class="submit app-press" @click="submitPost">发布</text></view></view></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onHide, onLoad, onShow, onUnload, onShareAppMessage, onShareTimeline } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import TabBar from "../../components/TabBar.vue";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare, showMiniProgramShareMenu } from "../../share";

const id = ref(0); const space = ref<any>(null); const shareInvite = ref<any>(null); const loading = ref(true); const error = ref(""); const composerVisible = ref(false); const draft = ref(""); const groupQrImageError = ref(false); const stageNow = ref(Date.now());
let stageTimer: ReturnType<typeof setInterval> | undefined;
const customerServiceSession = computed(() => JSON.stringify({ source: "activity_space", activityId: id.value }));
const activityStage = computed(() => {
  const start = new Date(space.value?.activity?.startTime || 0).getTime();
  const end = new Date(space.value?.activity?.endTime || 0).getTime();
  const now = stageNow.value;
  if (Number.isFinite(end) && end > 0 && now >= end) return { label: "活动已结束", primary: "回顾中", secondary: "可查看活动记录与评价" };
  if (Number.isFinite(start) && start > now) {
    const minutes = Math.max(1, Math.ceil((start - now) / 60000));
    const primary = minutes >= 1440 ? `${Math.ceil(minutes / 1440)} 天后` : minutes >= 60 ? `${Math.ceil(minutes / 60)} 小时后` : `${minutes} 分钟后`;
    return { label: "等待出发", primary, secondary: `${space.value?.stats?.participantCount || 0} 位已确认参与` };
  }
  return { label: "活动进行中", primary: "进行中", secondary: `${space.value?.stats?.participantCount || 0} 位已确认参与` };
});
const shareOptions = { title: () => space.value?.activity?.title || "慢π活动", path: () => id.value ? `/pages/activity/detail?id=${id.value}${shareInvite.value?.code ? `&inviteCode=${encodeURIComponent(shareInvite.value.code)}` : ""}` : "/pages/activity/list", imageUrl: () => space.value?.activity?.coverUrl || "" };
onShareAppMessage(() => defaultMiniProgramShare(shareOptions));
onShareTimeline(() => defaultMiniProgramTimelineShare(shareOptions));
function startStageClock() { stopStageClock(); stageNow.value = Date.now(); stageTimer = setInterval(() => { stageNow.value = Date.now(); }, 30000); }
function stopStageClock() { if (stageTimer) clearInterval(stageTimer); stageTimer = undefined; }
onLoad((query) => { id.value = Number(query?.id || 0); }); onShow(() => { showMiniProgramShareMenu(); startStageClock(); if (id.value) void load(); }); onHide(stopStageClock); onUnload(stopStageClock);
async function load() { if (!id.value) { error.value = "活动参数不正确"; loading.value = false; return; } loading.value = true; error.value = ""; try { await ensureUser(); space.value = await request(`/public/activities/${id.value}/space`); } catch (e: any) { error.value = e?.message || "活动空间加载失败"; } finally { loading.value = false; } }
function formatTime(value: string) { if (!value) return "待确认"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value).replace("T", " ").slice(5, 16) : `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; }
function openComposer() { composerVisible.value = true; }
async function submitPost() { const content = draft.value.trim(); if (!content || !id.value) return uni.showToast({ title: "请填写问题", icon: "none" }); try { const post = await request(`/public/activities/${id.value}/space/posts`, { method: "POST", data: { content } }); space.value.posts.unshift(post); draft.value = ""; composerVisible.value = false; uni.showToast({ title: "已提交审核", icon: "success" }); } catch (e: any) { uni.showToast({ title: e?.message || "发布失败", icon: "none" }); } }
function reportPost(post: any) { uni.showActionSheet({ itemList: ["广告或垃圾信息", "不友善内容", "虚假或误导信息", "泄露个人隐私"], success: async ({ tapIndex }) => { const reasons = ["广告或垃圾信息", "不友善内容", "虚假或误导信息", "泄露个人隐私"]; try { const result: any = await request(`/public/activities/${id.value}/space/posts/${post.id}/report`, { method: "POST", data: { reason: reasons[tapIndex] } }); uni.showToast({ title: result.idempotent ? "已举报过" : "举报已提交", icon: "none" }); } catch (e: any) { uni.showToast({ title: e?.message || "举报失败", icon: "none" }); } } }); }
function openCheckIn() { uni.navigateTo({ url: withTenantCode(`/pages/user/registration?id=${space.value.checkIn.registrationId}`) }); }
function openLocation() { const item = space.value?.activity; if (item?.locationLatitude && item?.locationLongitude) { uni.openLocation({ latitude: Number(item.locationLatitude), longitude: Number(item.locationLongitude), name: item.title, address: item.location }); return; } if (item?.locationMapUrl) { uni.setClipboardData({ data: item.locationMapUrl, success: () => uni.showToast({ title: "地点链接已复制", icon: "none" }) }); return; } uni.showToast({ title: "主办方暂未提供地图坐标", icon: "none" }); }
function previewGroupQr() { const url = String(space.value?.activity?.groupQrCodeUrl || "").trim(); if (!url || groupQrImageError.value) return; uni.previewImage({ current: url, urls: [url] }); }
function goService() { uni.navigateTo({ url: withTenantCode("/pages/service/index") }); }
async function prepareShare() {
  if (!id.value || shareInvite.value) return;
  try {
    await ensureUser();
    shareInvite.value = await request(`/public/activities/${id.value}/share-poster`, { method: "POST", data: {} });
    showMiniProgramShareMenu();
    uni.showToast({ title: "邀请已生成", icon: "success" });
  } catch (e: any) { uni.showToast({ title: e?.message || "生成邀请失败", icon: "none" }); }
}
async function copyActivityLink() {
  await prepareShare();
  if (!shareInvite.value?.code) return;
  const url = withTenantCode(`/pages/activity/detail?id=${id.value}&inviteCode=${encodeURIComponent(shareInvite.value.code)}`);
  uni.setClipboardData({ data: url, success: () => uni.showToast({ title: "邀请链接已复制", icon: "success" }) });
}
</script>

<style scoped>
.space-page{min-height:100vh;background:#f6f8f7;padding-bottom:120rpx;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.space-state{margin:28rpx;padding:28rpx;border-radius:8rpx;background:#fff;color:#667085}.space-state.error{color:#b91c1c}.retry{display:block;margin-top:12rpx;color:#08753f;font-weight:800}.space-hero{height:360rpx;position:relative;overflow:hidden;background:#143a27}.hero-cover,.hero-shade{position:absolute;inset:0;width:100%;height:100%}.hero-shade{background:linear-gradient(180deg,rgba(10,29,20,.12),rgba(10,29,20,.78))}.hero-copy{position:absolute;left:30rpx;right:30rpx;bottom:30rpx;display:grid;gap:8rpx;color:#fff}.hero-kicker{font-size:var(--app-font-helper);font-weight:800;color:#b8f5cb}.hero-title{font-size:38rpx;line-height:1.25;font-weight:950}.hero-meta{font-size:var(--app-font-helper);color:rgba(255,255,255,.84)}.member-strip{display:flex;align-items:center;justify-content:space-between;gap:18rpx;margin:0 24rpx;padding:24rpx;border-radius:8rpx;background:#fff;transform:translateY(-18rpx);box-shadow:0 8rpx 22rpx rgba(23,48,36,.06);font-size:var(--app-font-helper);color:#617168}.strip-number{display:block;color:#102c1c;font-size:34rpx;font-weight:950}.avatar-stack{display:flex;align-items:center;padding-right:10rpx}.avatar-stack image{width:50rpx;height:50rpx;margin-left:-10rpx;border:3rpx solid #fff;border-radius:50%;background:#eafbf1}.space-section{margin:0 24rpx 16rpx;padding:24rpx;border:1rpx solid #e2eae6;border-radius:8rpx;background:#fff}.section-head{display:flex;align-items:center;justify-content:space-between;gap:16rpx;margin-bottom:18rpx;color:#13241a;font-size:29rpx;font-weight:900}.section-note{color:#85928b;font-size:var(--app-font-helper);font-weight:500}.ask{color:#08753f;font-size:var(--app-font-helper)}.announcement{padding:18rpx 0;border-top:1rpx solid #edf1ee}.announcement:first-of-type{border-top:0;padding-top:0}.announcement-title{color:#20352a;font-size:25rpx;font-weight:850}.pin{margin-right:8rpx;padding:3rpx 7rpx;border-radius:4rpx;background:#eafbf1;color:#08753f;font-size:var(--app-font-caption)}.announcement-content,.announcement-time{display:block;margin-top:9rpx;color:#687871;font-size:var(--app-font-helper);line-height:1.55}.announcement-time{color:#96a39c;font-size:var(--app-font-caption)}.participants{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18rpx}.participant{min-width:0;display:grid;justify-items:center;gap:7rpx;color:#44554d;font-size:var(--app-font-caption);text-align:center}.participant image{width:76rpx;height:76rpx;border-radius:50%;background:#eafbf1}.participant text{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.participant .checked{color:#078347;font-size:var(--app-font-caption)}.post-list{display:grid;gap:18rpx}.post{padding:18rpx;border-radius:8rpx;background:#f7faf8}.post-head{display:flex;align-items:center;gap:10rpx;min-width:0;color:#35463d;font-size:var(--app-font-helper);font-weight:800}.post-head image{width:42rpx;height:42rpx;border-radius:50%;background:#eafbf1}.post-time{margin-left:auto;color:#95a199;font-size:var(--app-font-caption);font-weight:500}.report{color:#a56a00;font-size:var(--app-font-caption)}.post-content,.reply{display:block;margin-top:12rpx;color:#33443c;font-size:var(--app-font-helper);line-height:1.6}.reply{padding:12rpx;border-radius:6rpx;background:#eafbf1;color:#08753f;font-size:var(--app-font-helper)}.empty{padding:18rpx;border-radius:6rpx;background:#f7faf8;color:#84918a;font-size:var(--app-font-helper)}.action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12rpx}.action-cell{min-height:100rpx;display:grid;align-content:center;gap:7rpx;margin:0;padding:16rpx;border:0;border-radius:8rpx;background:#f1faf4;color:#193a27;font-size:24rpx;text-align:left;line-height:1.35}.action-cell text:last-child{color:#78877f;font-size:var(--app-font-helper)}.action-cell.contact{font-family:inherit}.group-card{text-align:center}.group-card .section-head{text-align:left}.group-qr{width:300rpx;height:300rpx;border-radius:8rpx;background:#f6f8f7}.page-space{height:30rpx}.composer-mask{position:fixed;inset:0;z-index:20;display:flex;align-items:flex-end;background:rgba(15,23,42,.46)}.composer{width:100%;padding:30rpx;box-sizing:border-box;border-radius:18rpx 18rpx 0 0;background:#fff}.composer-title{display:block;color:#13241a;font-size:30rpx;font-weight:900}.composer textarea{width:100%;min-height:180rpx;margin-top:20rpx;padding:16rpx;box-sizing:border-box;border-radius:8rpx;background:#f6f8f7;color:#26382e;font-size:25rpx}.composer-actions{display:flex;justify-content:flex-end;gap:34rpx;margin-top:22rpx;color:#64736b;font-size:26rpx}.composer-actions .submit{color:#08753f;font-weight:900}
.pending{padding:3rpx 7rpx;border-radius:4rpx;background:#fff2d9;color:#a45d00;font-size:var(--app-font-caption)}.avatar-placeholder{display:grid;place-items:center;background:#eafbf1;color:#08753f;font-size:var(--app-font-caption);font-weight:900}.avatar-stack .avatar-placeholder{width:50rpx;height:50rpx;margin-left:-10rpx;border:3rpx solid #fff;border-radius:50%}.participant .avatar-placeholder{width:76rpx;height:76rpx;border-radius:50%}.post-head .avatar-placeholder{width:42rpx;height:42rpx;border-radius:50%}
</style>
