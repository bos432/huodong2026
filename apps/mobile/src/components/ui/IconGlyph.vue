<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number; label?: string }>(), { size: 20, label: "" });
</script>

<template>
  <view class="icon-glyph" :class="`icon-${name}`" :style="{ width: `${size}px`, height: `${size}px` }" :aria-label="label || name" role="img" />
</template>

<style scoped>
.icon-glyph { position: relative; display: inline-block; flex: 0 0 auto; box-sizing: border-box; color: currentColor; }
.icon-glyph::before, .icon-glyph::after { position: absolute; display: block; box-sizing: border-box; content: ""; }
.icon-home::before { inset: 24% 14% 12%; border: 1.8px solid currentColor; border-radius: 3px; }
.icon-home::after { top: 7%; left: 17%; width: 66%; height: 66%; border-top: 1.8px solid currentColor; border-left: 1.8px solid currentColor; transform: rotate(45deg); }
.icon-checkin::before { inset: 12% 21%; border: 1.8px solid currentColor; border-radius: 50%; }
.icon-checkin::after { top: 30%; left: 45%; width: 20%; height: 42%; border-right: 1.8px solid currentColor; border-bottom: 1.8px solid currentColor; transform: rotate(40deg); }
.icon-message::before { inset: 17% 10% 24%; border: 1.8px solid currentColor; border-radius: 5px; }
.icon-message::after { right: 19%; bottom: 11%; width: 25%; height: 25%; border-right: 1.8px solid currentColor; border-bottom: 1.8px solid currentColor; transform: rotate(25deg); }
.icon-user::before { top: 8%; left: 34%; width: 32%; height: 32%; border: 1.8px solid currentColor; border-radius: 50%; }
.icon-user::after { right: 13%; bottom: 8%; left: 13%; height: 42%; border: 1.8px solid currentColor; border-radius: 50% 50% 25% 25%; }
.icon-plus::before { top: 44%; right: 17%; left: 17%; border-top: 2px solid currentColor; }.icon-plus::after { top: 17%; bottom: 17%; left: 49%; border-left: 2px solid currentColor; }
.icon-edit::before { top: 39%; left: 17%; width: 63%; height: 25%; border: 1.8px solid currentColor; border-radius: 2px; transform: rotate(-45deg); }
.icon-edit::after { top: 23%; right: 13%; width: 19%; height: 19%; border-top: 1.8px solid currentColor; border-right: 1.8px solid currentColor; transform: rotate(45deg); }
.icon-search::before { top: 8%; left: 8%; width: 58%; height: 58%; border: 1.8px solid currentColor; border-radius: 50%; }.icon-search::after { right: 8%; bottom: 10%; width: 38%; border-top: 1.8px solid currentColor; transform: rotate(45deg); transform-origin: right center; }
.icon-pin::before { top: 6%; left: 24%; width: 52%; height: 52%; border: 1.8px solid currentColor; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); }.icon-pin::after { top: 28%; left: 43%; width: 14%; height: 14%; border: 1.4px solid currentColor; border-radius: 50%; }
.icon-host::before { top: 8%; left: 29%; width: 42%; height: 42%; border: 1.6px solid currentColor; border-radius: 50%; }.icon-host::after { right: 12%; bottom: 8%; left: 12%; height: 38%; border: 1.6px solid currentColor; border-radius: 50% 50% 20% 20%; }
.icon-calendar::before { inset: 16% 9% 9%; border: 1.8px solid currentColor; border-radius: 3px; }.icon-calendar::after { top: 35%; right: 10%; left: 10%; border-top: 1.8px solid currentColor; }
.icon-sort::before { top: 18%; left: 24%; width: 52%; height: 1.8px; background: currentColor; box-shadow: 0 6px 0 currentColor, 0 12px 0 currentColor; }.icon-sort::after { right: 24%; bottom: 14%; border: 4px solid transparent; border-top-color: currentColor; }
.icon-filter::before { top: 16%; right: 10%; left: 10%; height: 1.8px; background: currentColor; box-shadow: 5px 6px 0 -0.2px currentColor, 10px 12px 0 -0.3px currentColor; }
.icon-bell::before { top: 16%; left: 21%; width: 58%; height: 58%; border: 1.8px solid currentColor; border-radius: 50% 50% 22% 22%; }.icon-bell::after { bottom: 9%; left: 37%; width: 26%; border-top: 1.8px solid currentColor; }
.icon-star::before { inset: 9%; border: 1.6px solid currentColor; clip-path: polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 100%,50% 73%,21% 100%,32% 57%,2% 35%,39% 35%); }
.icon-chevron::before { top: 30%; left: 28%; width: 42%; height: 42%; border-right: 1.8px solid currentColor; border-bottom: 1.8px solid currentColor; transform: rotate(-45deg); }
.icon-ticket::before { inset: 18% 8%; border: 1.8px solid currentColor; border-radius: 4px; }
.icon-ticket::after { top: 28%; right: 28%; bottom: 28%; border-left: 1.8px dashed currentColor; }
.icon-book::before { inset: 12% 12%; border: 1.8px solid currentColor; border-radius: 3px; }
.icon-book::after { top: 18%; bottom: 18%; left: 49%; border-left: 1.5px solid currentColor; }
.icon-award::before { top: 8%; left: 29%; width: 42%; height: 42%; border: 1.8px solid currentColor; border-radius: 50%; }
.icon-award::after { right: 28%; bottom: 6%; left: 28%; height: 40%; border-right: 1.8px solid currentColor; border-bottom: 1.8px solid currentColor; border-left: 1.8px solid currentColor; transform: skewY(-8deg); }
.icon-shield::before { inset: 8% 18%; border: 1.8px solid currentColor; border-radius: 45% 45% 52% 52%; transform: scaleY(1.08); }
.icon-help::before { inset: 9%; border: 1.8px solid currentColor; border-radius: 50%; }
.icon-help::after { top: 23%; left: 45%; width: 12%; height: 48%; border-right: 1.8px solid currentColor; border-bottom: 1.8px solid currentColor; transform: rotate(45deg); }
.icon-leaf::before { top: 14%; left: 18%; width: 64%; height: 64%; border: 1.8px solid currentColor; border-radius: 85% 8% 75% 10%; transform: rotate(-35deg); }
.icon-leaf::after { top: 27%; left: 48%; width: 1.8px; height: 58%; background: currentColor; transform: rotate(42deg); transform-origin: top; }
.icon-image::before { inset: 12%; border: 1.8px solid currentColor; border-radius: 3px; }
.icon-image::after { right: 18%; bottom: 19%; left: 18%; height: 45%; background: currentColor; clip-path: polygon(0 100%, 33% 30%, 52% 66%, 70% 42%, 100% 100%); }
</style>
