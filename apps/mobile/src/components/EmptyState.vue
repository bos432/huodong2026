<template>
  <view class="empty-state" :class="[`empty-state--${variant}`, { 'empty-state--compact': compact }]" :role="variant === 'error' ? 'alert' : 'status'" :aria-live="variant === 'error' ? 'assertive' : 'polite'">
    <view class="empty-state-illustration" :class="`empty-state-illustration--${variant}`" aria-hidden="true">
      <view class="empty-state-orbit" />
      <view class="empty-state-art" :class="`empty-state-art--${variant}`"><view class="empty-state-art-piece" /><view class="empty-state-art-detail" /></view>
      <text class="empty-state-symbol">{{ resolvedIcon }}</text>
    </view>
    <view class="empty-state-copy">
      <text class="empty-state-title">{{ resolvedTitle }}</text>
      <text v-if="resolvedDescription" class="empty-state-description">{{ resolvedDescription }}</text>
    </view>
    <view v-if="actionText" class="empty-state-action app-press" role="button" tabindex="0" :aria-label="actionText" @click="$emit('action')" @keyup.enter="$emit('action')" @keyup.space.prevent="$emit('action')">{{ actionText }}</view>
  </view>
</template>
<script setup lang="ts">
import { computed } from "vue";

type EmptyVariant = "default" | "activity" | "error" | "success" | "payment" | "waitlist" | "ended" | "space" | "checkin" | "review" | "social" | "order" | "service";

const props = withDefaults(defineProps<{
  icon?: string;
  text?: string;
  title?: string;
  description?: string;
  actionText?: string;
  variant?: EmptyVariant;
  compact?: boolean;
}>(), { variant: "default", actionText: "", compact: false });

defineEmits<{ action: [] }>();

const presets: Record<EmptyVariant, { icon: string; title: string; description: string }> = {
  default: { icon: "π", title: "这里暂时没有内容", description: "稍后再来看看。" },
  activity: { icon: "日", title: "近期没有可报名活动", description: "主办方发布新活动后，会第一时间显示在这里。" },
  error: { icon: "!", title: "内容加载失败", description: "请检查网络后重试。" },
  success: { icon: "✓", title: "操作成功", description: "相关信息已经保存。" },
  payment: { icon: "￥", title: "支付已完成", description: "订单状态会自动更新，请留意活动通知。" },
  waitlist: { icon: "候", title: "已加入候补", description: "名额释放后，主办方会按规则联系你。" },
  ended: { icon: "毕", title: "活动已结束", description: "可以查看活动回顾，或发现下一场活动。" },
  space: { icon: "间", title: "活动空间", description: "公告、签到和参与信息会集中在这里。" },
  checkin: { icon: "到", title: "等待签到", description: "活动开始后，主办方会开放签到。" },
  review: { icon: "评", title: "写下活动感受", description: "真实的体验反馈，会帮助下一位参与者做决定。" },
  social: { icon: "连", title: "完善社交资料", description: "填写你愿意公开的信息，拓展真实的活动连接。" },
  order: { icon: "单", title: "暂无订单", description: "报名活动后，订单和报名记录会显示在这里。" },
  service: { icon: "问", title: "需要帮助吗", description: "联系客服或查看常见问题。" }
};

const preset = computed(() => presets[props.variant] || presets.default);
const resolvedIcon = computed(() => props.icon || preset.value.icon);
const resolvedTitle = computed(() => props.title || props.text || preset.value.title);
const resolvedDescription = computed(() => props.description || (props.text ? "" : preset.value.description));
</script>

<style scoped>
.empty-state { display: grid; justify-items: center; gap: 12rpx; padding: 56rpx 28rpx; color: var(--app-text-muted); text-align: center; }
.empty-state-copy { display: grid; gap: 8rpx; justify-items: center; min-width: 0; }
.empty-state-illustration { position: relative; width: 116rpx; height: 116rpx; display: grid; place-items: center; margin-bottom: 4rpx; border: 2rpx solid var(--app-primary); border-radius: 36% 64% 54% 46% / 46% 42% 58% 54%; background: var(--app-primary-soft); color: var(--app-primary); transform: rotate(-5deg); }
.empty-state-orbit { position: absolute; inset: 14rpx; border: 1rpx solid currentColor; border-radius: 50%; opacity: .34; }
.empty-state-art { position: relative; z-index: 1; width: 56rpx; height: 56rpx; transform: rotate(5deg); opacity: .9; }
.empty-state-art-piece, .empty-state-art-detail { position: absolute; display: block; box-sizing: border-box; border-color: currentColor; }
.empty-state-art-piece { left: 10rpx; top: 10rpx; width: 36rpx; height: 36rpx; border: 3rpx solid currentColor; border-radius: 10rpx; }
.empty-state-art-detail { right: 2rpx; top: 2rpx; width: 12rpx; height: 12rpx; border-radius: 50%; background: currentColor; }
.empty-state-symbol { position: absolute; z-index: 2; transform: rotate(5deg); font-size: 0; font-weight: 850; }
.empty-state-title { color: var(--app-text); font-size: 30rpx; font-weight: 800; line-height: 1.35; }
.empty-state-description { max-width: 560rpx; color: var(--app-text-muted); font-size: 24rpx; line-height: 1.6; }
.empty-state-action { min-height: 62rpx; display: flex; align-items: center; margin-top: 6rpx; padding: 0 24rpx; border-radius: 8rpx; background: var(--app-primary); color: #fff; font-size: 24rpx; font-weight: 800; }
.empty-state--error .empty-state-illustration { border-color: var(--app-danger); background: var(--app-danger-soft); color: var(--app-danger); }
.empty-state--success .empty-state-illustration, .empty-state--payment .empty-state-illustration { border-color: var(--app-success); background: var(--app-success-soft); color: var(--app-success); }
.empty-state--waitlist .empty-state-illustration, .empty-state--ended .empty-state-illustration { border-color: var(--app-warning); background: var(--app-warning-soft); color: var(--app-warning); }
.empty-state-illustration--activity .empty-state-art-piece { height: 30rpx; top: 16rpx; border-radius: 6rpx; box-shadow: inset 0 8rpx 0 -5rpx currentColor; }
.empty-state-illustration--activity .empty-state-art-detail { width: 8rpx; height: 8rpx; right: 13rpx; top: 28rpx; box-shadow: 14rpx 0 0 currentColor; }
.empty-state-illustration--error .empty-state-art-piece { width: 8rpx; height: 34rpx; left: 24rpx; top: 9rpx; border: 0; border-radius: 8rpx; background: currentColor; transform: rotate(14deg); }
.empty-state-illustration--error .empty-state-art-detail { right: 17rpx; top: 43rpx; width: 8rpx; height: 8rpx; }
.empty-state-illustration--success .empty-state-art-piece { width: 38rpx; height: 22rpx; left: 9rpx; top: 17rpx; border-width: 0 0 5rpx 5rpx; border-style: solid; border-radius: 0; transform: rotate(-45deg); }
.empty-state-illustration--success .empty-state-art-detail, .empty-state-illustration--payment .empty-state-art-detail { display: none; }
.empty-state-illustration--payment .empty-state-art-piece { width: 38rpx; height: 42rpx; left: 9rpx; top: 7rpx; border-radius: 5rpx; box-shadow: inset 0 10rpx 0 -7rpx currentColor; }
.empty-state-illustration--payment .empty-state-art-piece::after { position: absolute; left: 8rpx; right: 8rpx; bottom: 10rpx; height: 3rpx; content: ""; background: currentColor; box-shadow: 0 -8rpx 0 currentColor; }
.empty-state-illustration--waitlist .empty-state-art-piece { border-radius: 50%; }
.empty-state-illustration--waitlist .empty-state-art-piece::after { position: absolute; left: 16rpx; top: 7rpx; width: 3rpx; height: 14rpx; content: ""; background: currentColor; transform-origin: bottom; transform: rotate(28deg); }
.empty-state-illustration--waitlist .empty-state-art-detail { right: 17rpx; top: 27rpx; width: 3rpx; height: 3rpx; }
.empty-state-illustration--ended .empty-state-art-piece { width: 42rpx; height: 28rpx; left: 7rpx; top: 18rpx; border-width: 3rpx 3rpx 0; border-radius: 42rpx 42rpx 0 0; }
.empty-state-illustration--ended .empty-state-art-detail { right: 20rpx; top: 12rpx; width: 16rpx; height: 3rpx; border-radius: 0; background: currentColor; }
.empty-state-illustration--space .empty-state-art-piece { width: 36rpx; height: 44rpx; left: 10rpx; top: 6rpx; border-radius: 18rpx 18rpx 4rpx 4rpx; }
.empty-state-illustration--space .empty-state-art-detail { right: 21rpx; top: 26rpx; width: 7rpx; height: 7rpx; }
.empty-state-illustration--checkin .empty-state-art-piece { width: 30rpx; height: 30rpx; left: 13rpx; top: 8rpx; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); }
.empty-state-illustration--checkin .empty-state-art-detail { right: 23rpx; top: 20rpx; width: 8rpx; height: 8rpx; background: var(--app-surface); }
.empty-state-illustration--review .empty-state-art-piece { width: 42rpx; height: 30rpx; left: 7rpx; top: 11rpx; border-radius: 12rpx; }
.empty-state-illustration--review .empty-state-art-detail { right: 12rpx; top: 23rpx; width: 6rpx; height: 6rpx; box-shadow: -12rpx 0 0 currentColor, 12rpx 0 0 currentColor; }
.empty-state-illustration--social .empty-state-art-piece { width: 12rpx; height: 12rpx; left: 7rpx; top: 22rpx; border-radius: 50%; background: currentColor; border: 0; box-shadow: 30rpx -16rpx 0 currentColor, 30rpx 16rpx 0 currentColor; }
.empty-state-illustration--social .empty-state-art-detail { left: 17rpx; top: 26rpx; width: 28rpx; height: 3rpx; border-radius: 3rpx; background: currentColor; transform: rotate(-28deg); box-shadow: 0 10rpx 0 currentColor; }
.empty-state-illustration--order .empty-state-art-piece { width: 34rpx; height: 44rpx; left: 11rpx; top: 6rpx; border-radius: 4rpx; box-shadow: inset 0 10rpx 0 -7rpx currentColor; }
.empty-state-illustration--order .empty-state-art-detail { left: 19rpx; top: 29rpx; width: 18rpx; height: 3rpx; border-radius: 0; background: currentColor; box-shadow: 0 8rpx 0 currentColor; }
.empty-state-illustration--service .empty-state-art-piece { width: 44rpx; height: 34rpx; left: 6rpx; top: 10rpx; border-radius: 18rpx; }
.empty-state-illustration--service .empty-state-art-detail { right: 16rpx; top: 22rpx; width: 5rpx; height: 5rpx; box-shadow: -10rpx 0 0 currentColor, 10rpx 0 0 currentColor; }
.empty-state--compact { display: flex; align-items: center; justify-items: initial; gap: 14rpx; padding: 22rpx 0; text-align: left; }
.empty-state--compact .empty-state-illustration { flex: 0 0 64rpx; width: 64rpx; height: 64rpx; margin: 0; border-width: 1rpx; }
.empty-state--compact .empty-state-orbit { inset: 8rpx; }
.empty-state--compact .empty-state-art { transform: scale(.72) rotate(5deg); }
.empty-state--compact .empty-state-copy { flex: 1; justify-items: initial; gap: 4rpx; }
.empty-state--compact .empty-state-title { font-size: 25rpx; }
.empty-state--compact .empty-state-description { max-width: none; font-size: 21rpx; line-height: 1.45; }
.empty-state--compact .empty-state-action { flex: 0 0 auto; min-height: 52rpx; margin: 0 0 0 auto; padding: 0 16rpx; font-size: 21rpx; }
</style>
