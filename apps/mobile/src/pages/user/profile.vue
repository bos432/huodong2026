<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ensureUser, fetchMyProfile, updateMyProfile, uploadMyAvatar, withTenantCode } from "../../api";
import AppBottomNav from "../../components/AppBottomNav.vue";

const profile = ref<any>(null);
const nickname = ref("");
const avatarUrl = ref("");
const saving = ref(false);
const loading = ref(true);

function displayName() {
  return profile.value?.nickname || profile.value?.phone || `用户${profile.value?.id || ""}`;
}

async function load() {
  loading.value = true;
  try {
    await ensureUser();
    profile.value = await fetchMyProfile();
    nickname.value = profile.value.nickname || "";
    avatarUrl.value = profile.value.avatarUrl || "";
  } finally {
    loading.value = false;
  }
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: async (res) => {
      const filePath = res.tempFilePaths[0];
      if (!filePath) return;
      try {
        uni.showLoading({ title: "上传中" });
        const uploaded = await uploadMyAvatar(filePath);
        avatarUrl.value = uploaded.url;
        profile.value = await fetchMyProfile();
        uni.showToast({ title: "头像已更新", icon: "success" });
      } catch (error: any) {
        uni.showToast({ title: error.message || "上传失败", icon: "none" });
      } finally {
        uni.hideLoading();
      }
    }
  });
}

async function save() {
  if (nickname.value.trim().length > 40) {
    uni.showToast({ title: "昵称不能超过 40 个字", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    profile.value = await updateMyProfile({ nickname: nickname.value.trim(), avatarUrl: avatarUrl.value.trim() });
    uni.showToast({ title: "资料已保存", icon: "success" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "保存失败", icon: "none" });
  } finally {
    saving.value = false;
  }
}

function goSecurity() {
  uni.navigateTo({ url: withTenantCode("/pages/user/security") });
}

onMounted(load);
</script>

<template>
  <view class="profile-page">
    <view v-if="loading" class="card muted">加载中...</view>
    <template v-else>
      <view class="hero">
        <image v-if="avatarUrl" class="avatar" :src="avatarUrl" mode="aspectFill" />
        <view v-else class="avatar fallback">{{ displayName().slice(0, 1) }}</view>
        <view>
          <view class="name">{{ displayName() }}</view>
          <view class="sub">{{ profile?.phone || "未绑定手机号" }} · {{ profile?.memberLevel?.name || "普通会员" }}</view>
        </view>
      </view>

      <view class="card">
        <view class="field">
          <view class="label">头像</view>
          <view class="avatar-row">
            <image v-if="avatarUrl" class="small-avatar" :src="avatarUrl" mode="aspectFill" />
            <view v-else class="small-avatar fallback">{{ displayName().slice(0, 1) }}</view>
            <view class="mini-button" @click="chooseAvatar">上传头像</view>
          </view>
        </view>
        <view class="field">
          <view class="label">昵称</view>
          <input v-model="nickname" class="input" maxlength="40" placeholder="填写昵称" />
        </view>
        <view class="button" :class="{ disabled: saving }" @click="save">{{ saving ? "保存中..." : "保存资料" }}</view>
      </view>

      <view class="card security-entry" @click="goSecurity">
        <view>
          <view class="entry-title">账号安全</view>
          <view class="sub">修改手机号、设置或修改 H5 登录密码</view>
        </view>
        <view class="arrow">进入</view>
      </view>
    </template>

    <AppBottomNav current-path="/pages/user/my" />
  </view>
</template>

<style scoped>
.profile-page { min-height: 100vh; padding: 24rpx 24rpx 160rpx; background: var(--page-bg-layer, #f4f6f8); color: var(--text-color, #111827); }
.hero, .card { border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.hero { display: flex; align-items: center; gap: 22rpx; padding: 30rpx; margin-bottom: 20rpx; }
.avatar, .avatar.fallback { width: 112rpx; height: 112rpx; border-radius: 999px; flex: 0 0 auto; }
.fallback { display: flex; align-items: center; justify-content: center; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-size: 38rpx; font-weight: 950; }
.name { font-size: 36rpx; font-weight: 950; }
.sub, .muted { color: var(--muted-color, #667085); font-size: 25rpx; line-height: 1.5; }
.card { padding: 26rpx; margin-bottom: 20rpx; }
.field { display: grid; gap: 12rpx; margin-bottom: 24rpx; }
.label { color: var(--text-color, #111827); font-size: 27rpx; font-weight: 900; }
.avatar-row { display: flex; align-items: center; gap: 18rpx; }
.small-avatar { width: 78rpx; height: 78rpx; border-radius: 999px; }
.mini-button { padding: 14rpx 22rpx; border-radius: 999px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-size: 25rpx; font-weight: 900; }
.input { height: 82rpx; padding: 0 20rpx; border-radius: 6px; background: #f8fafc; font-size: 27rpx; }
.button { height: 84rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: var(--primary-color, #0f766e); color: #fff; font-size: 28rpx; font-weight: 950; }
.button.disabled { opacity: .55; }
.security-entry { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.entry-title { font-size: 31rpx; font-weight: 950; }
.arrow { flex: 0 0 auto; color: var(--primary-color, #0f766e); font-size: 25rpx; font-weight: 900; }
</style>
