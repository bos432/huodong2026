<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ensureUser, fetchMyProfile, updateMyProfile, uploadMyAvatar, withTenantCode } from "../../api";
import AppBottomNav from "../../components/AppBottomNav.vue";
import WechatPhoneBindSheet from "../../components/WechatPhoneBindSheet.vue";

const profile = ref<any>(null);
const nickname = ref("");
const avatarUrl = ref("");
const saving = ref(false);
const loading = ref(true);
const uploadingWechatAvatar = ref(false);
const phoneBindVisible = ref(false);

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

function chooseLocalAvatar() {
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

async function chooseWechatAvatar(event: any) {
  if (uploadingWechatAvatar.value) return;
  const filePath = String(event?.detail?.avatarUrl || "");
  if (!filePath) {
    uni.showToast({ title: "未选择微信头像", icon: "none" });
    return;
  }
  uploadingWechatAvatar.value = true;
  try {
    uni.showLoading({ title: "上传中" });
    const uploaded = await uploadMyAvatar(filePath);
    avatarUrl.value = uploaded.url;
    profile.value = await fetchMyProfile();
    uni.showToast({ title: "微信头像已更新", icon: "success" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "上传失败", icon: "none" });
  } finally {
    uploadingWechatAvatar.value = false;
    uni.hideLoading();
  }
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

function openPhoneBind() {
  phoneBindVisible.value = true;
}

function closePhoneBind() {
  phoneBindVisible.value = false;
}

async function handlePhoneBound(profileData: any) {
  phoneBindVisible.value = false;
  profile.value = profileData;
  await load();
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
            <!-- #ifdef MP-WEIXIN -->
            <button class="mini-button wechat-button" open-type="chooseAvatar" :class="{ disabled: uploadingWechatAvatar }" @chooseavatar="chooseWechatAvatar">{{ uploadingWechatAvatar ? "上传中" : "微信头像" }}</button>
            <!-- #endif -->
            <view class="mini-button" @click="chooseLocalAvatar">上传头像</view>
          </view>
        </view>
        <view class="field">
          <view class="label">昵称</view>
          <!-- #ifdef MP-WEIXIN -->
          <input v-model="nickname" type="nickname" class="input" maxlength="40" placeholder="填写昵称" />
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <input v-model="nickname" class="input" maxlength="40" placeholder="填写昵称" />
          <!-- #endif -->
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

      <view v-if="!profile?.phone" class="card security-entry phone-entry" @click="openPhoneBind">
        <view>
          <view class="entry-title">微信授权绑定手机号</view>
          <view class="sub">小程序端可一键绑定微信手机号，用于报名、下单和会员权益。</view>
        </view>
        <view class="arrow">绑定</view>
      </view>
    </template>

    <WechatPhoneBindSheet
      :visible="phoneBindVisible"
      title="绑定手机号"
      message="绑定后可继续报名、下单、使用余额和会员权益。"
      @close="closePhoneBind"
      @bound="handlePhoneBound"
    />

    <AppBottomNav current-path="/pages/user/my" />
  </view>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 160rpx;
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 40%, #f4eadc 100%);
  color: #263d3c;
}

.hero,
.card {
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.hero {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  background:
    linear-gradient(135deg, rgba(33, 75, 78, 0.96), rgba(129, 55, 48, 0.9)),
    #214b4e;
  color: #fffaf2;
}

.avatar,
.avatar.fallback {
  width: 112rpx;
  height: 112rpx;
  flex: 0 0 auto;
  border-radius: 50%;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1e3d0;
  color: #8b4a3e;
  font-size: 38rpx;
  font-weight: 950;
}

.hero .fallback {
  background: rgba(255, 250, 242, 0.18);
  color: #fffaf2;
}

.name {
  font-size: 36rpx;
  font-weight: 950;
}

.sub,
.muted {
  color: #7f7467;
  font-size: 25rpx;
  line-height: 1.5;
}

.hero .sub {
  color: rgba(255, 250, 242, 0.76);
}

.card {
  padding: 26rpx;
  margin-bottom: 20rpx;
}

.field {
  display: grid;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.label {
  color: #263d3c;
  font-size: 27rpx;
  font-weight: 900;
}

.avatar-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18rpx;
}

.small-avatar {
  width: 78rpx;
  height: 78rpx;
  border-radius: 50%;
}

.mini-button {
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: #f1e3d0;
  color: #8b4a3e;
  font-size: 25rpx;
  font-weight: 900;
  line-height: 1.4;
  margin: 0;
  border: 0;
}

.mini-button::after {
  border: 0;
}

.mini-button.wechat-button {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.mini-button.disabled {
  opacity: .58;
}

.input {
  height: 82rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.45);
  border-radius: 18rpx;
  background: #fbf7ef;
  color: #263d3c;
  font-size: 27rpx;
}

.button {
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: #b84435;
  color: #fffaf2;
  font-size: 28rpx;
  font-weight: 950;
}

.button.disabled {
  opacity: .55;
}

.security-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.entry-title {
  color: #263d3c;
  font-size: 31rpx;
  font-weight: 950;
}

.arrow {
  flex: 0 0 auto;
  color: #4a6b8a;
  font-size: 25rpx;
  font-weight: 900;
}
</style>
