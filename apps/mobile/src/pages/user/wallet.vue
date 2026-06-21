<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ensureUser, request } from "../../api";
import AppBottomNav from "../../components/AppBottomNav.vue";

const wallet = ref<any | null>(null);
const rows = ref<any[]>([]);
const loading = ref(true);

const creditAmount = computed(() => rows.value.filter((item) => item.direction !== "debit").reduce((sum, item) => sum + Number(item.amount || 0), 0));
const debitAmount = computed(() => rows.value.filter((item) => item.direction === "debit").reduce((sum, item) => sum + Number(item.amount || 0), 0));

async function load() {
  loading.value = true;
  try {
    await ensureUser();
    const [walletDetail, transactions] = await Promise.all([
      request<any>("/public/me/wallet").catch(() => null),
      request<any[]>("/public/me/wallet/transactions").catch(() => [])
    ]);
    wallet.value = walletDetail;
    rows.value = transactions;
  } finally {
    loading.value = false;
  }
}

function money(value: string | number | undefined | null) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function walletTypeText(type: string) {
  const map: Record<string, string> = {
    admin_recharge: "后台充值",
    admin_deduct: "后台扣减",
    admin_adjust: "余额调整",
    balance_pay: "余额支付",
    refund_return: "退款返还"
  };
  return map[type] || type || "余额变动";
}

function walletAmountText(item: any) {
  const prefix = item.direction === "debit" ? "-" : "+";
  return `${prefix}¥${money(item.amount)}`;
}

onMounted(load);
</script>

<template>
  <view class="wallet-page">
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
      <view><text>本页收入</text><strong>¥{{ money(creditAmount) }}</strong></view>
      <view><text>本页支出</text><strong>¥{{ money(debitAmount) }}</strong></view>
    </view>

    <view class="card">
      <view class="section-title">流水记录</view>
      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="!rows.length" class="empty">暂无余额流水。后台充值、余额支付或退款返还后会显示在这里。</view>
      <view v-for="item in rows" v-else :key="item.id" class="flow-item">
        <view>
          <view class="flow-title">{{ walletTypeText(item.type) }}</view>
          <view class="flow-time">{{ formatTime(item.createdAt) }}</view>
          <view v-if="item.remark" class="flow-remark">{{ item.remark }}</view>
        </view>
        <view class="flow-right" :class="{ debit: item.direction === 'debit' }">
          <view>{{ walletAmountText(item) }}</view>
          <text>余额 ¥{{ money(item.balanceAfter) }}</text>
        </view>
      </view>
    </view>

    <AppBottomNav current-path="/pages/user/my" />
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
