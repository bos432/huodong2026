<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, getUserId, getUserToken, request } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import AppBottomNav from "../../components/AppBottomNav.vue";
import WechatPhoneBindSheet from "../../components/WechatPhoneBindSheet.vue";
import { reviewSafeText } from "../../review-safe-text";
import { formatShanghaiDateTime } from "../../tenant-load-guard";

const wallet = ref<any | null>(null);
const rows = ref<any[]>([]);
const loading = ref(true);
const loadError = ref("");
const phoneBindVisible = ref(false);
const loadedContextKey = ref("");
const loadGuard = createTenantLoadGuard();

const creditAmount = computed(() => rows.value.filter((item) => item.direction !== "debit" && item.type !== "balance_unfreeze").reduce((sum, item) => sum + Number(item.amount || 0), 0));
const debitAmount = computed(() => rows.value.filter((item) => item.direction === "debit" && item.type !== "balance_freeze").reduce((sum, item) => sum + Number(item.amount || 0), 0));

async function load() {
  const loadToken = loadGuard.begin();
  let requestedUserId = getUserId();
  let requestedUserToken = getUserToken();
  const isCurrentContext = () => loadGuard.isCurrent(loadToken)
    && getUserId() === requestedUserId
    && getUserToken() === requestedUserToken;
  const initialContextKey = `${loadToken.tenantCode}:${getUserId() || "guest"}`;
  if (loadedContextKey.value && loadedContextKey.value !== initialContextKey) {
    wallet.value = null;
    rows.value = [];
  }
  loading.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    if (!loadGuard.isCurrent(loadToken)) return;
    requestedUserId = getUserId();
    requestedUserToken = getUserToken();
    const contextKey = `${loadToken.tenantCode}:${requestedUserId}`;
    if (loadedContextKey.value && loadedContextKey.value !== contextKey) {
      wallet.value = null;
      rows.value = [];
    }
    const profile = await request<any>("/public/me/profile");
    if (!isCurrentContext()) return;
    if (!profile?.phone) {
      phoneBindVisible.value = true;
      wallet.value = null;
      rows.value = [];
      loadedContextKey.value = contextKey;
      return;
    }
    phoneBindVisible.value = false;
    const [walletDetail, transactions] = await Promise.all([
      request<any>("/public/me/wallet"),
      request<any[]>("/public/me/wallet/transactions")
    ]);
    if (!isCurrentContext()) return;
    if (!walletDetail || typeof walletDetail !== "object" || !Array.isArray(transactions)) {
      throw new Error("余额数据格式异常，请重新加载");
    }
    wallet.value = walletDetail;
    rows.value = transactions;
    loadedContextKey.value = contextKey;
  } catch (error: any) {
    if (!isCurrentContext()) return;
    wallet.value = null;
    rows.value = [];
    loadError.value = reviewSafeText(error?.message || "余额信息加载失败");
  } finally {
    if (isCurrentContext()) loading.value = false;
  }
}

function closePhoneBindPanel() {
  phoneBindVisible.value = false;
}

async function handlePhoneBound() {
  phoneBindVisible.value = false;
  await load();
}

function money(value: string | number | undefined | null) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value: string) {
  return formatShanghaiDateTime(value);
}

function walletTypeText(type: string) {
  const map: Record<string, string> = {
    admin_recharge: "后台充值",
    admin_deduct: "后台扣减",
    admin_adjust: "余额调整",
    gift_grant: "发放赠送金",
    gift_revoke: "扣回赠送金",
    balance_freeze: "资金冻结",
    balance_unfreeze: "资金解冻",
    balance_pay: "余额支付",
    refund_return: "退款返还"
  };
  return map[type] || type || "余额变动";
}

function walletAmountText(item: any) {
  const prefix = item.direction === "debit" ? "-" : "+";
  return `${prefix}¥${money(item.amount)}`;
}

onShow(() => { void load(); });
</script>

<template>
  <view class="wallet-page">
    <view v-if="loading" class="card loading-card" role="status" aria-live="polite">余额信息加载中...</view>
    <view v-else-if="loadError" class="card error-card" role="alert" aria-live="assertive">
      <view class="section-title">余额加载失败</view>
      <view class="empty error-copy">{{ loadError }}</view>
      <view class="retry-button" role="button" tabindex="0" aria-label="重新加载余额信息" @click="load" @keyup.enter="load" @keyup.space="load">重新加载</view>
    </view>
    <template v-else>
    <view class="hero">
      <view>
        <view class="label">账户余额</view>
        <view class="amount">¥{{ money(wallet?.availableBalance) }}</view>
      </view>
      <view class="pill">余额明细</view>
    </view>

    <view class="stats">
      <view><text>累计充值</text><strong>¥{{ money(wallet?.totalRecharge) }}</strong></view>
      <view><text>累计消费</text><strong>¥{{ money(wallet?.totalSpent) }}</strong></view>
      <view><text>冻结金额</text><strong>¥{{ money(wallet?.frozenBalance) }}</strong></view>
      <view><text>可用赠送金</text><strong>¥{{ money(wallet?.giftBalance) }}</strong></view>
      <view><text>冻结赠送金</text><strong>¥{{ money(wallet?.frozenGiftBalance) }}</strong></view>
      <view><text>本页收入</text><strong>¥{{ money(creditAmount) }}</strong></view>
      <view><text>本页支出</text><strong>¥{{ money(debitAmount) }}</strong></view>
    </view>

    <view class="card">
      <view class="section-title">流水记录</view>
      <view v-if="!rows.length" class="empty" role="status">暂无余额流水。后台充值、余额支付或退款返还后会显示在这里。</view>
      <view v-for="item in rows" v-else :key="item.id" class="flow-item">
        <view>
          <view class="flow-title">{{ walletTypeText(item.type) }}</view>
          <view class="flow-time">{{ formatTime(item.createdAt) }}</view>
          <view v-if="item.remark" class="flow-remark">{{ item.remark }}</view>
        </view>
        <view class="flow-right" :class="{ debit: item.direction === 'debit' }">
          <view>{{ walletAmountText(item) }}</view>
          <text>余额 ¥{{ money(item.balanceAfter) }}</text>
          <text v-if="Number(item.giftAfter || 0) || Number(item.frozenGiftAfter || 0)">赠送金 ¥{{ money(item.giftAfter) }} / 冻结 ¥{{ money(item.frozenGiftAfter) }}</text>
        </view>
      </view>
    </view>
    </template>

    <AppBottomNav current-path="/pages/user/my" />
    <WechatPhoneBindSheet
      :visible="phoneBindVisible"
      title="查看余额前绑定手机号"
      message="余额充值、抵扣和退款返还需要手机号作为会员身份凭证。"
      close-text="稍后查看"
      @close="closePhoneBindPanel"
      @bound="handlePhoneBound"
    />
  </view>
</template>

<style scoped>
.wallet-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 160rpx;
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 40%, #f4eadc 100%);
  color: #263d3c;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  padding: 36rpx 30rpx;
  border-radius: 30rpx;
  background:
    linear-gradient(135deg, rgba(33, 75, 78, 0.96), rgba(129, 55, 48, 0.9)),
    #214b4e;
  color: #fffaf2;
  box-shadow: 0 18rpx 46rpx rgba(36, 60, 60, 0.18);
}

.label {
  color: rgba(255, 250, 242, 0.72);
  font-size: 25rpx;
  font-weight: 800;
}

.amount {
  margin-top: 12rpx;
  font-size: 58rpx;
  line-height: 1;
  font-weight: 950;
}

.pill {
  flex: 0 0 auto;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 250, 242, 0.14);
  color: rgba(255, 250, 242, 0.9);
  font-size: 24rpx;
  font-weight: 900;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin: 22rpx 0;
}

.stats view {
  min-width: 0;
  display: grid;
  gap: 8rpx;
  padding: 22rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.46);
  border-radius: 22rpx;
  background: rgba(255, 252, 246, 0.94);
  box-shadow: 0 10rpx 26rpx rgba(72, 55, 38, 0.06);
}

.stats text,
.flow-time,
.flow-remark,
.empty {
  color: #7f7467;
  font-size: 24rpx;
  line-height: 1.45;
}

.stats strong {
  color: #8b4a3e;
  font-size: 30rpx;
}

.card {
  padding: 26rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}
.error-card { margin-top:0; border-color:#fecaca; background:#fff7f7; }
.loading-card { color:#7f7467; text-align:center; }
.error-copy { padding:10rpx 0 18rpx; color:#b91c1c; text-align:left; }
.retry-button { width:fit-content; padding:12rpx 20rpx; border-radius:8px; background:#8b4a3e; color:#fff; font-size:24rpx; font-weight:900; }

.section-title {
  margin-bottom: 12rpx;
  color: #263d3c;
  font-size: 31rpx;
  font-weight: 950;
}

.empty {
  padding: 36rpx 0;
  text-align: center;
}

.flow-item {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  padding: 22rpx 0;
  border-top: 1rpx solid rgba(218, 204, 184, 0.72);
}

.flow-item:first-of-type {
  border-top: 0;
}

.flow-title {
  color: #263d3c;
  font-size: 28rpx;
  font-weight: 900;
}

.flow-time,
.flow-remark {
  margin-top: 6rpx;
}

.flow-right {
  flex: 0 0 auto;
  display: grid;
  gap: 6rpx;
  justify-items: end;
  color: #3f745b;
  font-size: 29rpx;
  font-weight: 950;
}

.flow-right.debit {
  color: #b84435;
}

.flow-right text {
  color: #8f8172;
  font-size: 22rpx;
  font-weight: 700;
}
</style>
