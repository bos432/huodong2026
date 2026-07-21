<template>
  <view class="detail-page">
    <view v-if="pageLoading" class="page-state" role="status" aria-live="polite">订单详情加载中...</view>
    <view v-else-if="loadError" class="page-state error-state" role="alert" aria-live="assertive">
      <text>{{ loadError }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新加载商城订单详情" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重新加载</view>
    </view>
    <template v-else-if="order">
    <view v-if="groupLoadWarning" class="page-state warning-state" role="status" aria-live="polite">
      <text>{{ groupLoadWarning }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新同步拆单信息" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重新同步拆单信息</view>
    </view>
    <view v-if="actionError" class="page-state error-state" role="alert" aria-live="assertive"><text>{{ actionError }}</text><view class="state-retry" role="button" tabindex="0" aria-label="关闭订单操作错误" @click="actionError = ''" @keyup.enter="actionError = ''" @keyup.space.prevent="actionError = ''">知道了</view></view>
    <view v-if="paymentNotice" class="page-state success-state" role="status" aria-live="polite">{{ paymentNotice }}</view>
    <view class="status-card">
      <text class="status">{{ statusText(order.status) }}</text>
      <text class="status-tip">{{ statusTip(order) }}</text>
      <text class="store-name">履约店铺：{{ merchantName(order) }}</text>
      <text class="order-no">{{ order.orderNo }}</text>
    </view>

    <view v-if="sameGroupOrders.length > 1" class="card checkout-group-card">
      <text class="section-title">跨店拆单</text>
      <text class="muted">本次结算已按店铺拆成 {{ sameGroupOrders.length }} 个子订单，请逐个查看付款、发货和售后状态。</text>
      <view
        v-for="item in sameGroupOrders"
        :key="item.id"
        class="group-order-row"
        :class="{ current: isCurrentGroupOrder(item) }"
        role="button"
        tabindex="0"
        :aria-label="`查看${merchantName(item)}订单${item.orderNo}`"
        @click="goGroupOrder(item)"
        @keyup.enter="goGroupOrder(item)"
        @keyup.space.prevent="goGroupOrder(item)"
      >
        <view class="group-order-main">
          <text class="line">{{ merchantName(item) }}<text v-if="isCurrentGroupOrder(item)" class="current-pill">当前</text></text>
          <text class="muted">{{ item.orderNo }} · {{ paymentText(item.paymentMethod) }}</text>
        </view>
        <view class="group-order-side">
          <text class="status">{{ statusText(item.status) }}</text>
          <text class="price">¥{{ money(item.amount) }}</text>
        </view>
      </view>
      <view v-if="groupPaymentTasks.length" class="payment-task-list">
        <text class="section-title">支付任务</text>
        <view v-for="task in groupPaymentTasks" :key="task.orderId || task.orderNo" class="payment-task-row">
          <view class="group-order-main">
            <text class="line">{{ task.merchantName || "商城店铺" }}</text>
            <text class="muted">{{ task.paymentRouteText || task.paymentMethodText }} · {{ task.receiverText || task.collectionModeText }}</text>
            <text v-if="task.disabledReason || task.combineBlockedReason" class="warning">{{ task.disabledReason || task.combineBlockedReason }}</text>
            <text v-else-if="task.nextAction" class="muted">{{ task.nextAction }}</text>
          </view>
          <view class="group-order-side">
            <text class="status">{{ task.statusText || statusText(task.status) }}</text>
            <text class="price">¥{{ money(task.amount) }}</text>
          </view>
        </view>
        <text v-if="useUnifiedGroupPayment" class="group-payment-tip">本结算组由平台统一收款，一次支付覆盖全部待付款子订单。</text>
      </view>
    </view>

    <view class="card">
      <text class="section-title">订单进度</text>
      <view class="timeline">
        <view v-for="step in progressSteps" :key="step.label" class="step" :class="{ active: step.active }">
          <view class="dot"></view>
          <view>
            <text class="line">{{ step.label }}</text>
            <text class="muted">{{ step.time || step.tip }}</text>
          </view>
        </view>
      </view>
      <text v-if="order.closeReason" class="warning">关闭原因：{{ order.closeReason }}</text>
      <text v-if="order.expiresAt && ['pending_payment','pending_confirm'].includes(order.status)" class="deadline">处理截止：{{ dateText(order.expiresAt) }}，超时系统将自动关闭并释放库存</text>
    </view>

    <view v-if="order.groupBuyTeams?.length" class="card group-card">
      <text class="section-title">拼团信息</text>
      <view v-for="team in order.groupBuyTeams" :key="team.teamNo" class="group-box">
        <view class="group-head">
          <text class="line">{{ team.title || "拼团活动" }}</text>
          <text class="group-status" :class="team.teamStatus">{{ groupBuyTeamStatusText(team.teamStatus) }}</text>
        </view>
        <text class="muted">团号：{{ team.teamNo }}</text>
        <text class="muted">成团进度：{{ Number(team.paidPeople || 0) }} / {{ Number(team.minPeople || 2) }} 人</text>
        <text v-if="team.endsAt" class="muted">截止时间：{{ dateText(team.endsAt) }}</text>
      </view>
    </view>

    <view class="card">
      <text class="section-title">收货信息</text>
      <text class="line">{{ address.receiverName }} {{ address.receiverPhone }}</text>
      <text class="muted">{{ [address.province, address.city, address.district, address.detail].filter(Boolean).join(" ") }}</text>
    </view>

    <view class="card">
      <text class="section-title">商品明细</text>
      <view v-for="item in order.items || []" :key="item.id" class="item-row">
        <image v-if="item.coverUrl" class="cover" :src="item.coverUrl" mode="aspectFill" />
        <view class="item-info">
          <text class="item-name">{{ item.productTitle }}</text>
          <text class="muted">{{ item.skuName }} × {{ item.quantity }}</text>
          <text v-if="item.review" class="review-state">评价：{{ reviewText(item.review.status) }}</text>
          <text v-if="item.review?.appendContent" class="muted">追评（{{ appendReviewText(item.review.appendStatus) }}）：{{ item.review.appendContent }}</text>
          <text v-else-if="item.review?.status === 'approved'" class="review-link" @click.stop="appendReviewItem(item)">追加评价</text>
          <text v-else-if="order.status === 'completed'" class="review-link" @click.stop="reviewItem(item)">评价商品</text>
        </view>
        <text class="price">¥{{ money(item.totalAmount) }}</text>
      </view>
      <view class="amount-row">
        <text>支付方式：{{ paymentText(order.paymentMethod) }}</text>
        <text class="amount">¥{{ money(order.amount) }}</text>
      </view>
      <view v-if="Number(order.discountAmount || 0) > 0" class="amount-row subtle-row">
        <text>优惠抵扣</text>
        <text>-¥{{ money(order.discountAmount) }}</text>
      </view>
      <view v-if="Number(order.pointsUsed || 0) > 0" class="amount-row subtle-row">
        <text>积分抵扣</text>
        <text>{{ order.pointsUsed }} 分 · -¥{{ money(order.pointsDiscountAmount) }}</text>
      </view>
      <view v-if="order.promotionCode" class="amount-row subtle-row">
        <text>推广码</text>
        <text>{{ order.promotionCode }}</text>
      </view>
      <text v-if="order.buyerRemark" class="muted remark">买家备注：{{ order.buyerRemark }}</text>
    </view>

    <view v-if="order.shipments?.length" class="card">
      <text class="section-title">物流信息</text>
      <text class="muted">已发 {{ order.shippedQuantity || 0 }} / {{ orderTotalQuantity(order) }} 件</text>
      <view v-for="shipment in order.shipments" :key="shipment.id" class="shipment-row">
        <view class="row"><text class="line">{{ shipment.expressCompany || "快递" }} {{ shipment.expressNo }}</text><text class="shipment-status">{{ shipment.status === "delivered" ? "已签收" : shipment.status === "cancelled" ? "已取消" : "运输中" }}</text></view>
        <text class="muted">{{ shipmentItemText(shipment) }}</text>
        <view class="logistics-actions">
          <text class="logistics-link" @click="goLogistics">查看物流</text>
          <text class="logistics-link muted-action" @click="copyExpressNo(shipment.expressNo)">复制单号</text>
          <text v-if="shipment.status === 'shipped'" class="logistics-link" @click="confirmShipmentReceived(shipment)">确认该包裹</text>
        </view>
      </view>
    </view>
    <view v-else-if="order.expressNo" class="card">
      <text class="section-title">物流信息</text>
      <text class="line">{{ order.expressCompany || "快递" }} {{ order.expressNo }}</text>
      <view class="logistics-actions"><text class="logistics-link" @click="goLogistics">查看物流</text><text class="logistics-link muted-action" @click="copyExpressNo(order.expressNo)">复制单号</text></view>
    </view>

    <view v-if="order.refunds?.length" class="card refund-card">
      <text class="section-title">售后记录</text>
      <view v-for="refund in order.refunds" :key="refund.id" class="after-sale-case">
        <view class="row"><text class="line">{{ refundTypeText(refund.type) }} · {{ refundText(refund.status) }}</text><text>{{ refund.type === 'exchange' ? '换货' : `¥${money(refund.amount)}` }}</text></view>
        <text class="muted">{{ refund.refundNo }} · {{ refund.refundProgressText }}</text>
        <text class="muted">{{ refundSummaryText(refund) || "暂无说明" }}</text>
        <view v-for="item in refund.items || []" :key="item.id" class="refund-item-summary"><text>{{ item.itemSnapshot?.productTitle || "商品" }} {{ item.itemSnapshot?.skuName || "" }}</text><text>× {{ item.requestedQuantity }}</text></view>
        <view v-if="refund.returnAddressSnapshot" class="return-address"><text class="muted">退货地址</text><text>{{ addressText(refund.returnAddressSnapshot) }}</text></view>
        <text v-if="refund.returnExpressNo" class="muted">寄回物流：{{ refund.returnExpressCompany || "快递" }} {{ refund.returnExpressNo }}</text>
        <text v-if="refund.exchangeShipment" class="muted">换货物流：{{ refund.exchangeShipment.expressCompany || "快递" }} {{ refund.exchangeShipment.expressNo }}</text>
        <view v-if="refund.images?.length" class="image-list refund-images">
          <image v-for="image in refund.images" :key="image" class="proof-image" :src="image" mode="aspectFill" @click="previewImages(refund.images, image)" />
        </view>
        <view v-if="refund.messages?.length" class="refund-messages">
          <view v-for="message in refund.messages" :key="message.id" class="refund-message"><text>{{ message.actorName || actorText(message.actorType) }}</text><text class="muted">{{ message.content }}</text></view>
        </view>
        <view class="logistics-actions">
          <text v-if="canAddRefundMessage(refund)" class="logistics-link" role="button" tabindex="0" aria-label="补充售后材料" @click="openRefundAction(refund, 'message')" @keyup.enter="openRefundAction(refund, 'message')" @keyup.space.prevent="openRefundAction(refund, 'message')">补充材料</text>
          <text v-if="refund.status === 'awaiting_buyer_return'" class="logistics-link" role="button" tabindex="0" aria-label="填写寄回物流" @click="openRefundAction(refund, 'return')" @keyup.enter="openRefundAction(refund, 'return')" @keyup.space.prevent="openRefundAction(refund, 'return')">填写寄回物流</text>
          <text v-if="canRequestIntervention(refund)" class="logistics-link" role="button" tabindex="0" aria-label="申请平台介入" @click="openRefundAction(refund, 'intervention')" @keyup.enter="openRefundAction(refund, 'intervention')" @keyup.space.prevent="openRefundAction(refund, 'intervention')">申请平台介入</text>
          <text v-if="refund.status === 'exchange_shipped' && refund.exchangeShipment?.status === 'shipped'" class="logistics-link" role="button" tabindex="0" aria-label="确认换货收货" @click="confirmShipmentReceived(refund.exchangeShipment)" @keyup.enter="confirmShipmentReceived(refund.exchangeShipment)" @keyup.space.prevent="confirmShipmentReceived(refund.exchangeShipment)">确认换货收货</text>
        </view>
      </view>
    </view>

    <view class="action-bar">
      <button v-if="useUnifiedGroupPayment" :disabled="!!activeAction" @click="payCheckoutGroupWechat">{{ activeAction === 'pay-group-wechat' ? '处理中...' : '统一微信支付' }}</button>
      <button v-if="useUnifiedGroupPayment" class="ghost" :disabled="!!activeAction" @click="refreshCheckoutGroupPaymentStatus">{{ activeAction === 'group-payment-status' ? '查询中...' : '刷新整组支付' }}</button>
      <button v-if="useUnifiedGroupPayment" class="ghost" :disabled="!!activeAction" @click="closeCheckoutGroupPayment">{{ activeAction.startsWith('close-group-payment') ? '关闭中...' : '关闭整组支付' }}</button>
      <button v-if="!useUnifiedGroupPayment && order.status === 'pending_payment' && order.paymentMethod === 'balance'" :disabled="!!activeAction" @click="payBalance">{{ activeAction === 'pay-balance' ? '支付中...' : '继续支付' }}</button>
      <button v-if="!useUnifiedGroupPayment && order.status === 'pending_payment' && order.paymentMethod === 'wechat'" :disabled="!!activeAction" @click="payWechat">{{ activeAction === 'pay-wechat' ? '处理中...' : '继续微信支付' }}</button>
      <button v-if="!useUnifiedGroupPayment && order.status === 'pending_payment' && order.paymentMethod === 'wechat'" class="ghost" :disabled="!!activeAction" @click="refreshPaymentStatus">{{ activeAction === 'payment-status' ? '查询中...' : '刷新支付状态' }}</button>
      <button v-if="!useUnifiedGroupPayment && order.status === 'pending_payment'" class="ghost" :disabled="!!activeAction" @click="closePaymentOrder">{{ activeAction.startsWith('close-payment') ? '关闭中...' : '关闭支付订单' }}</button>
      <button v-if="['pending_payment','pending_confirm'].includes(order.status)" class="ghost" :disabled="!!activeAction" @click="cancelOrder">{{ activeAction.startsWith('cancel-order') ? '取消中...' : '取消订单' }}</button>
      <button v-if="order.status === 'shipped'" :disabled="!!activeAction" @click="confirmReceived">{{ activeAction.startsWith('confirm-order') ? '确认中...' : '确认收货' }}</button>
      <button v-if="canRequestRefund" :disabled="refundSubmitting || !!activeAction" @click="requestRefund">{{ refundSubmitting ? "提交中..." : "申请售后" }}</button>
      <text v-else-if="refundActionTip" class="refund-action-tip">{{ refundActionTip }}</text>
    </view>

    <view v-if="reviewDialogVisible" class="review-mask" @click.self="closeReviewDialog">
      <view class="review-panel">
        <view class="review-head">
          <text class="section-title">{{ reviewForm.mode === 'append' ? '追加评价' : '评价商品' }}</text>
          <text class="muted">{{ reviewForm.productTitle }}</text>
        </view>
        <view v-if="reviewForm.mode !== 'append'" class="rating-row">
          <text v-for="star in 5" :key="star" class="rating-star" role="radio" tabindex="0" :aria-checked="reviewForm.rating === star" :aria-label="`${star}星评价`" :class="{ active: star <= reviewForm.rating }" @click="reviewForm.rating = star" @keyup.enter="reviewForm.rating = star" @keyup.space.prevent="reviewForm.rating = star">★</text>
        </view>
        <textarea v-model="reviewForm.content" maxlength="2000" cursor-spacing="24" aria-label="商品评价内容" :placeholder="reviewForm.mode === 'append' ? '请补充后续使用体验' : '请写下真实体验，提交后需后台审核展示'" />
        <view class="image-list">
          <view v-for="(image, index) in reviewForm.images" :key="image" class="review-image-tile">
            <image :src="image" mode="aspectFill" />
            <text class="remove-image" @click="removeReviewImage(index)">删除</text>
          </view>
          <view v-if="reviewForm.images.length < 6" class="add-image" role="button" tabindex="0" aria-label="添加评价图片" @click="chooseReviewImages" @keyup.enter="chooseReviewImages" @keyup.space.prevent="chooseReviewImages">{{ uploadingReviewImage ? "上传中..." : "+ 添加晒图" }}</view>
        </view>
        <view class="review-actions">
          <button class="ghost" @click="closeReviewDialog">取消</button>
          <button :disabled="!!activeAction" aria-label="提交商品评价" @click="submitReview">{{ activeAction === 'review' ? '提交中...' : '提交评价' }}</button>
        </view>
      </view>
    </view>

    <view v-if="refundDialogVisible" class="review-mask" @click.self="closeRefundDialog">
      <view class="review-panel">
        <view class="review-head">
          <text class="section-title">申请售后</text>
          <text class="muted">请说明问题，可上传商品照片、物流截图或沟通凭证，便于后台快速处理。</text>
        </view>
        <picker :range="refundTypeOptions" range-key="label" :value="refundTypeIndex" @change="changeRefundType"><view class="form-select">售后类型：{{ refundTypeText(refundForm.type) }}</view></picker>
        <view class="refund-item-picker">
          <view v-for="item in refundForm.items" :key="item.orderItemId" class="refund-item-row">
            <view><text>{{ item.productTitle }}</text><text class="muted">{{ item.skuName }} · 可售后 {{ item.remainingQuantity }} 件</text></view>
            <input v-model.number="item.quantity" type="number" :disabled="item.remainingQuantity <= 0" />
          </view>
        </view>
        <input v-if="refundForm.type !== 'exchange'" v-model="refundForm.amount" type="digit" maxlength="12" cursor-spacing="24" aria-label="退款金额" placeholder="退款金额" />
        <textarea v-model="refundForm.reason" maxlength="2000" cursor-spacing="24" aria-label="退款或退货原因" placeholder="请填写退款/退货原因" />
        <view class="image-list">
          <view v-for="(image, index) in refundForm.images" :key="image" class="review-image-tile">
            <image :src="image" mode="aspectFill" @click="previewImages(refundForm.images, image)" />
            <text class="remove-image" @click="removeRefundImage(index)">删除</text>
          </view>
          <view v-if="refundForm.images.length < 6" class="add-image" role="button" tabindex="0" aria-label="添加售后凭证" @click="chooseRefundImages" @keyup.enter="chooseRefundImages" @keyup.space.prevent="chooseRefundImages">{{ uploadingRefundImage ? "上传中..." : "+ 添加凭证" }}</view>
        </view>
        <view class="review-actions">
          <button class="ghost" :disabled="refundSubmitting" @click="closeRefundDialog">取消</button>
          <button :disabled="refundSubmitting" aria-label="提交售后申请" @click="submitRefund">{{ refundSubmitting ? "提交中..." : "提交售后" }}</button>
        </view>
      </view>
    </view>

    <view v-if="refundActionVisible" class="review-mask" @click.self="closeRefundAction">
      <view class="review-panel">
        <view class="review-head"><text class="section-title">{{ refundActionTitle }}</text><text class="muted">{{ activeRefund?.refundNo }}</text></view>
        <template v-if="refundActionMode === 'return'">
          <input v-model="refundActionForm.expressCompany" maxlength="80" cursor-spacing="24" aria-label="快递公司" placeholder="快递公司" />
          <input v-model="refundActionForm.expressNo" maxlength="80" cursor-spacing="24" confirm-type="next" aria-label="退货物流单号" placeholder="退货物流单号" />
        </template>
        <textarea v-model="refundActionForm.content" maxlength="2000" cursor-spacing="24" aria-label="售后补充说明" :placeholder="refundActionMode === 'return' ? '退货备注（选填）' : '请填写说明'" />
        <view v-if="refundActionMode !== 'return'" class="image-list">
          <view v-for="(image, index) in refundActionForm.images" :key="image" class="review-image-tile"><image :src="image" mode="aspectFill" /><text class="remove-image" @click="refundActionForm.images.splice(index, 1)">删除</text></view>
          <view v-if="refundActionForm.images.length < 6" class="add-image" role="button" tabindex="0" aria-label="添加售后补充凭证" @click="chooseRefundActionImages" @keyup.enter="chooseRefundActionImages" @keyup.space.prevent="chooseRefundActionImages">{{ uploadingRefundImage ? "上传中..." : "+ 添加凭证" }}</view>
        </view>
        <view class="review-actions"><button class="ghost" :disabled="!!activeAction" aria-label="取消售后操作" @click="closeRefundAction">取消</button><button :disabled="!!activeAction" aria-label="提交售后补充操作" @click="submitRefundAction">{{ activeAction === 'refund-action' ? '提交中...' : '提交' }}</button></view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request, uploadMallRefundImage, uploadMallReviewImage, withTenantCode } from "../../api";
import { handleMallWechatPayResult, preferredMallWechatPaymentScene } from "../../mall-payment";
import { createTenantLoadGuard } from "../../tenant-load-guard";

const orderId = ref(0);
const order = ref<any | null>(null);
const pageLoading = ref(true);
const loadError = ref("");
const groupLoadWarning = ref("");
const activeAction = ref("");
const actionError = ref("");
const paymentNotice = ref("");
const loadGuard = createTenantLoadGuard();
const reviewDialogVisible = ref(false);
function orderTotalQuantity(value: any) { return Number(value?.totalQuantity || 0) || (value?.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0); }
function shipmentItemText(shipment: any) { return (shipment?.items || []).map((item: any) => `${item.itemSnapshot?.productTitle || "商品"} × ${item.quantity}`).join("；"); }
const refundDialogVisible = ref(false);
const refundActionVisible = ref(false);
const refundActionMode = ref<"message" | "return" | "intervention">("message");
const activeRefund = ref<any>(null);
const uploadingReviewImage = ref(false);
const uploadingRefundImage = ref(false);
const reviewForm = ref<any>({ mode: "create", reviewId: 0, orderItemId: 0, productTitle: "", rating: 5, content: "", images: [] });
const refundForm = ref<any>({ type: "refund_only", amount: "", reason: "", images: [], items: [] });
const refundActionForm = ref<any>({ expressCompany: "", expressNo: "", content: "", images: [] });
const refundSubmitting = ref(false);
const refundBusinessKey = ref("");
const refundTypeOptions = [{ label: "仅退款", value: "refund_only" }, { label: "退货退款", value: "return_refund" }, { label: "换货", value: "exchange" }];
const refundTypeIndex = computed(() => Math.max(refundTypeOptions.findIndex((item) => item.value === refundForm.value.type), 0));
const refundActionTitle = computed(() => refundActionMode.value === "return" ? "填写寄回物流" : refundActionMode.value === "intervention" ? "申请平台介入" : "补充售后材料");
const groupOrders = ref<any[]>([]);
const checkoutGroup = ref<any | null>(null);
const address = computed(() => order.value?.addressSnapshot || {});
const canRequestRefund = computed(() => canSubmitRefund(order.value));
const refundActionTip = computed(() => refundActionText(order.value));
const sameGroupOrders = computed(() => {
  const groupNo = order.value?.checkoutGroup?.groupNo;
  if (!groupNo) return [];
  return groupOrders.value.filter((item) => item.checkoutGroup?.groupNo === groupNo);
});
const groupPaymentTasks = computed(() => Array.isArray(checkoutGroup.value?.paymentTasks) ? checkoutGroup.value.paymentTasks : []);
const useUnifiedGroupPayment = computed(() => {
  if (!checkoutGroup.value?.id || checkoutGroup.value.paymentMethod !== "wechat" || checkoutGroup.value.status !== "pending_payment") return false;
  const tasks = groupPaymentTasks.value;
  return tasks.length > 1 && tasks.every((task: any) => task.canCombinePayment && !task.requiresSeparatePayment && task.status === "pending_payment");
});
const progressSteps = computed(() => {
  const value = order.value || {};
  const status = value.status;
  return [
    { label: "提交订单", active: true, time: dateText(value.createdAt), tip: "订单已创建" },
    { label: "确认收款", active: ["paid", "shipped", "completed", "refund_pending", "refunded"].includes(status) || Boolean(value.paidAt), time: dateText(value.paidAt), tip: value.paymentMethod === "offline" ? "等待后台确认线下收款" : value.paymentMethod === "wechat" ? "等待微信支付回调" : "等待余额支付" },
    { label: "商家发货", active: ["shipped", "completed"].includes(status) || Boolean(value.shippedAt), time: dateText(value.shippedAt), tip: "等待商家填写物流" },
    { label: "订单完成", active: status === "completed" || Boolean(value.completedAt), time: dateText(value.completedAt), tip: "等待用户确认收货" }
  ];
});
function money(value: any) { return Number(value || 0).toFixed(2); }
function statusText(value: string) { return ({ pending_payment: "待付款", pending_confirm: "待确认收款", paid: "待发货", shipped: "待收货", completed: "已完成", refund_pending: "售后中", refunded: "已退款", closed: "已关闭" } as any)[value] || value || "订单详情"; }
function paymentText(value: string) { return ({ wechat: "微信支付", balance: "余额支付", offline: "线下收款" } as any)[value] || value; }
function refundText(value: string) { return ({ pending: "待审核", awaiting_buyer_return: "待寄回", returning: "退货运输中", awaiting_merchant_receipt: "待商家收货", awaiting_exchange_shipment: "待寄换货商品", exchange_shipped: "换货已发出", platform_intervening: "平台介入", processing: "退款处理中", approved: "已完成", rejected: "已拒绝", failed: "退款失败", cancelled: "已取消" } as any)[value] || value; }
function refundTypeText(value: string) { return ({ refund_only: "仅退款", return_refund: "退货退款", exchange: "换货" } as any)[value] || value; }
function actorText(value: string) { return ({ user: "买家", merchant: "商家", platform: "平台", system: "系统" } as any)[value] || value; }
function addressText(value: any) { return [value?.receiverName, value?.receiverPhone, value?.province, value?.city, value?.district, value?.detail].filter(Boolean).join(" "); }
function groupBuyTeamStatusText(value: string) { return ({ forming: "组团中", success: "已成团", failed: "未成团" } as any)[value] || value || "-"; }
function refundProviderText(value: any) {
  return `${value.refundChannelText || "退款处理"} · ${value.refundProgressText || "处理中"}`;
}
function refundSummaryText(value: any) {
  if (!value) return "";
  if (value.status === "rejected" && value.userReviewRemark) return value.userReviewRemark;
  return value.reason || value.refundProgressText || value.userReviewRemark || "";
}
function reviewText(value: string) { return ({ pending: "待审核", approved: "已展示", rejected: "未通过" } as any)[value] || value; }
function dateText(value: string) { return value ? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)).replaceAll("/", "-") : ""; }
function merchantName(value: any) { return value?.merchant?.name || value?.tenant?.name || "商城店铺"; }
function canSubmitRefund(value: any) {
  return ["paid", "shipped", "completed"].includes(value?.status) && (value?.items || []).some((item: any) => remainingAfterSaleQty(item) > 0);
}
function refundActionText(value: any) {
  const status = value?.refund?.status;
  if (status === "pending") return "售后待审核，请等待后台处理";
  if (status === "processing") return "退款处理中，请等待支付渠道结果";
  if (status === "approved") return "售后已完成，不能重复申请";
  if (status === "failed") return "退款异常，后台正在处理";
  if (status === "rejected") return "售后已拒绝，可重新申请";
  return "";
}
function refundStatusTip(value: any) {
  const status = value?.refund?.status;
  if (status === "pending") return "售后已提交，等待后台审核。";
  if (status === "processing") return "退款已提交支付渠道，请等待到账结果。";
  if (status === "failed") return "退款处理异常，后台财务会重试或联系处理，请勿重复申请。";
  if (status === "approved") return "售后已完成，款项已按支付方式处理。";
  if (status === "rejected") return "售后未通过，如仍有问题可补充原因后重新申请。";
  return "";
}
function isCurrentGroupOrder(value: any) { return Number(value?.id || 0) === Number(orderId.value || 0); }
function goGroupOrder(value: any) {
  if (!value?.id || isCurrentGroupOrder(value)) return;
  uni.redirectTo({ url: withTenantCode(`/pages/user/mall-order-detail?id=${value.id}`) });
}
function statusTip(value: any) {
  const status = value?.status;
  const refundTip = refundStatusTip(value);
  if (refundTip) return refundTip;
  if (status === "pending_payment") return value.paymentMethod === "wechat" ? "请完成微信支付；支付回调成功后订单会自动进入待发货。" : "请完成余额支付；取消后库存会释放。";
  if (status === "pending_confirm") return "线下收款订单已提交，等待后台财务确认。";
  if (status === "paid" && value.fulfillmentStatus === "partial_shipped") return `商家已部分发货（${value.shippedQuantity || 0}/${orderTotalQuantity(value)} 件），剩余商品发出后订单进入待收货。`;
  if (status === "paid") return "收款已确认，等待商家发货。";
  if (status === "shipped") return "商品已发出，请核对物流并在收到后确认。";
  if (status === "completed") return "订单已完成，可作为财务和履约记录留存。";
  if (status === "refund_pending") return "售后申请审核中，请等待后台处理。";
  if (status === "refunded") return "售后已处理完成。";
  if (status === "closed") return value.closeReason ? `订单已关闭：${value.closeReason}` : "订单已关闭。";
  return "商城订单详情";
}
async function load() {
  const token = loadGuard.begin();
  pageLoading.value = true;
  loadError.value = "";
  groupLoadWarning.value = "";
  order.value = null;
  groupOrders.value = [];
  checkoutGroup.value = null;
  try {
    if (!orderId.value) throw new Error("缺少订单ID");
    await ensureUser();
    const detail = await request<any>(`/public/me/mall/orders/${orderId.value}`);
    if (!loadGuard.isCurrent(token)) return;
    if (!detail?.id) throw new Error("订单不存在或无权查看");
    order.value = detail;
    const groupNo = detail.checkoutGroup?.groupNo;
    if (!groupNo) return;
    try {
      const [rows, group] = await Promise.all([
        request<any[]>("/public/me/mall/orders"),
        request<any>(`/public/me/mall/checkout-groups/${detail.checkoutGroup.id}`)
      ]);
      if (loadGuard.isCurrent(token) && order.value?.id === detail.id) {
        groupOrders.value = rows.filter((item) => item.checkoutGroup?.groupNo === groupNo);
        checkoutGroup.value = group;
      }
    } catch (error: any) {
      if (loadGuard.isCurrent(token)) groupLoadWarning.value = error?.message || "跨店拆单信息暂未同步，当前订单仍可继续查看。";
    }
  } catch (error: any) {
    if (!loadGuard.isCurrent(token)) return;
    order.value = null;
    loadError.value = error?.message || "订单详情加载失败，请稍后重试。";
  } finally {
    if (loadGuard.isCurrent(token)) pageLoading.value = false;
  }
}

async function runOrderAction(key: string, errorText: string, handler: () => Promise<void>) {
  if (activeAction.value) return;
  const context = { tenantCode: getCurrentTenantCode(), orderId: Number(order.value?.id || 0) };
  activeAction.value = key;
  actionError.value = "";
  try {
    assertOrderActionContext(context);
    await handler();
    if (getCurrentTenantCode() !== context.tenantCode) throw new Error("当前城市已变化，请重新查看订单");
  } catch (error: any) {
    actionError.value = error?.message || errorText;
  } finally {
    activeAction.value = "";
  }
}

function confirmOrderAction(key: string, options: { title: string; content: string; confirmText: string }, errorText: string, handler: () => Promise<void>) {
  if (activeAction.value) return;
  const context = { tenantCode: getCurrentTenantCode(), orderId: Number(order.value?.id || 0) };
  activeAction.value = `${key}-prompt`;
  actionError.value = "";
  uni.showModal({
    ...options,
    success: async (res) => {
      if (!res.confirm) {
        activeAction.value = "";
        return;
      }
      activeAction.value = key;
      try {
        assertOrderActionContext(context);
        await handler();
        if (getCurrentTenantCode() !== context.tenantCode) throw new Error("当前城市已变化，请重新查看订单");
      } catch (error: any) {
        actionError.value = error?.message || errorText;
      } finally {
        activeAction.value = "";
      }
    },
    fail: () => { activeAction.value = ""; }
  });
}

function assertOrderActionContext(context: { tenantCode: string; orderId: number }) {
  if (!context.orderId || getCurrentTenantCode() !== context.tenantCode || Number(order.value?.id || 0) !== context.orderId || Number(orderId.value || 0) !== context.orderId) throw new Error("当前城市或订单已变化，请重新操作");
}

function confirmReceived() {
  confirmOrderAction("confirm-order", { title: "确认订单收货", content: "确认全部商品均已收到且无异常？", confirmText: "确认收到" }, "确认失败", async () => {
    await request(`/public/me/mall/orders/${orderId.value}/confirm-received`, { method: "POST" });
    uni.showToast({ title: "已确认收货", icon: "none" });
    await load();
  });
}
async function payBalance() {
  await runOrderAction("pay-balance", "支付失败", async () => {
    await request(`/public/mall/orders/${orderId.value}/pay/balance`, { method: "POST" });
    uni.showToast({ title: "支付成功", icon: "none" });
    await load();
  });
}
async function payWechat() {
  await runOrderAction("pay-wechat", "发起微信支付失败", async () => {
    const pay = await request<any>(`/public/mall/orders/${orderId.value}/pay/wechat`, { method: "POST", data: { paymentScene: preferredMallWechatPaymentScene() } });
    const redirected = await handleMallWechatPayResult(pay);
    if (redirected) return;
    await load();
  });
}
async function payCheckoutGroupWechat() {
  await runOrderAction("pay-group-wechat", "发起跨店统一支付失败", async () => {
    const groupId = Number(checkoutGroup.value?.id || 0);
    if (!groupId || !useUnifiedGroupPayment.value) throw new Error("结算组状态已变化，请重新加载订单");
    const pay = await request<any>(`/public/mall/checkout-groups/${groupId}/pay/wechat`, { method: "POST", data: { paymentScene: preferredMallWechatPaymentScene() } });
    const redirected = await handleMallWechatPayResult(pay);
    if (redirected) return;
    await load();
  });
}
async function refreshCheckoutGroupPaymentStatus() {
  await runOrderAction("group-payment-status", "查询跨店支付状态失败", async () => {
    const groupId = Number(checkoutGroup.value?.id || 0);
    if (!groupId) throw new Error("缺少跨店结算组信息");
    const result = await request<any>(`/public/me/mall/checkout-groups/${groupId}/payment-status`);
    paymentNotice.value = result.nextAction || result.statusText || "跨店支付状态已刷新";
    await load();
  });
}
function closeCheckoutGroupPayment() {
  confirmOrderAction("close-group-payment", { title: "关闭整组支付", content: "系统会关闭整组支付并释放所有待付款子订单的库存、优惠券和积分。", confirmText: "确认关闭" }, "关闭跨店支付失败", async () => {
    const groupId = Number(checkoutGroup.value?.id || 0);
    if (!groupId || !useUnifiedGroupPayment.value) throw new Error("结算组状态已变化，请重新加载订单");
    const result = await request<any>(`/public/me/mall/checkout-groups/${groupId}/payment-close`, { method: "POST" });
    paymentNotice.value = result.statusText || "跨店支付已关闭";
    await load();
  });
}
function confirmShipmentReceived(shipment: any) {
  confirmOrderAction(`confirm-shipment-${shipment.id}`, { title: "确认包裹收货", content: `确认已收到 ${shipment.expressCompany || "快递"} ${shipment.expressNo}？`, confirmText: "确认收到" }, "确认失败", async () => {
    await request(`/public/me/mall/orders/${orderId.value}/shipments/${shipment.id}/confirm-received`, { method: "POST" });
    uni.showToast({ title: "包裹已确认", icon: "none" });
    await load();
  });
}
async function refreshPaymentStatus() {
  await runOrderAction("payment-status", "查询支付状态失败", async () => {
    const result = await request<any>(`/public/me/mall/orders/${orderId.value}/payment-status`);
    paymentNotice.value = result.nextAction || (result.status === "success" ? "支付已确认" : result.status === "closed" ? "渠道订单已关闭" : "暂未支付");
    await load();
  });
}
function closePaymentOrder() {
  confirmOrderAction("close-payment", { title: "关闭支付订单", content: "系统会先关闭支付渠道订单，再释放库存、优惠券和积分。", confirmText: "确认关闭" }, "关闭支付订单失败", async () => {
    const result = await request<any>(`/public/me/mall/orders/${orderId.value}/payment-close`, { method: "POST" });
    paymentNotice.value = result.statusText || "支付订单已关闭";
    await load();
  });
}
function cancelOrder() {
  confirmOrderAction("cancel-order", { title: "取消订单", content: "取消后会释放商品库存，订单不可继续支付。", confirmText: "确认取消" }, "取消失败", async () => {
    await request(`/public/me/mall/orders/${orderId.value}/cancel`, { method: "POST" });
    uni.showToast({ title: "订单已取消", icon: "none" });
    await load();
  });
}
function requestRefund() {
  if (activeAction.value || refundSubmitting.value) return;
  if (!canRequestRefund.value) {
    uni.showToast({ title: refundActionTip.value || "当前订单不能申请售后", icon: "none" });
    return;
  }
  refundForm.value = { type: "refund_only", amount: money(order.value.amount), reason: "", images: [], items: (order.value.items || []).map((item: any) => ({ orderItemId: item.id, productTitle: item.productTitle, skuName: item.skuName, remainingQuantity: remainingAfterSaleQty(item), quantity: remainingAfterSaleQty(item) > 0 ? 1 : 0 })) };
  refundBusinessKey.value = `after-sale:${orderId.value}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  refundDialogVisible.value = true;
}
function remainingAfterSaleQty(item: any) {
  const occupied = (order.value.refunds || []).filter((refund: any) => !["rejected", "cancelled"].includes(refund.status)).flatMap((refund: any) => refund.items || []).filter((row: any) => Number(row.orderItemId) === Number(item.id)).reduce((sum: number, row: any) => sum + Number(row.requestedQuantity || 0), 0);
  return Math.max(Number(item.quantity || 0) - occupied, 0);
}
function changeRefundType(event: any) {
  const option = refundTypeOptions[Number(event.detail.value || 0)] || refundTypeOptions[0];
  refundForm.value.type = option.value;
  if (option.value === "exchange") refundForm.value.amount = "0.00";
}
function canAddRefundMessage(refund: any) { return !["approved", "rejected", "cancelled"].includes(refund?.status); }
function canRequestIntervention(refund: any) { return ["pending", "awaiting_buyer_return", "returning", "awaiting_merchant_receipt", "awaiting_exchange_shipment", "exchange_shipped", "failed"].includes(refund?.status) && !refund?.platformInterventionRequested; }
function openRefundAction(refund: any, mode: "message" | "return" | "intervention") { activeRefund.value = refund; refundActionMode.value = mode; refundActionForm.value = { expressCompany: "", expressNo: "", content: "", images: [] }; refundActionVisible.value = true; }
function closeRefundAction() { refundActionVisible.value = false; activeRefund.value = null; }
function goLogistics() {
  uni.navigateTo({ url: withTenantCode(`/pages/mall/logistics?id=${orderId.value}`) });
}
function copyExpressNo(expressNo?: string) {
  uni.setClipboardData({ data: expressNo || order.value.expressNo || "", success: () => uni.showToast({ title: "单号已复制", icon: "none" }) });
}
function reviewItem(item: any) {
  reviewForm.value = { mode: "create", reviewId: 0, orderItemId: item.id, productTitle: item.productTitle || "商城商品", rating: 5, content: "", images: [] };
  reviewDialogVisible.value = true;
}
function appendReviewItem(item: any) {
  reviewForm.value = { mode: "append", reviewId: item.review.id, orderItemId: item.id, productTitle: item.productTitle || "商城商品", rating: item.review.rating || 5, content: "", images: [] };
  reviewDialogVisible.value = true;
}
function appendReviewText(status?: string) {
  return ({ pending: "待审核", approved: "已展示", rejected: "未通过" } as Record<string, string>)[status || ""] || "已提交";
}
function closeReviewDialog() {
  reviewDialogVisible.value = false;
}
function removeReviewImage(index: number) {
  reviewForm.value.images.splice(index, 1);
}
function closeRefundDialog() {
  refundDialogVisible.value = false;
}
function removeRefundImage(index: number) {
  refundForm.value.images.splice(index, 1);
}
function previewImages(images: string[], current: string) {
  uni.previewImage({ urls: images, current });
}
async function chooseReviewImages() {
  if (uploadingReviewImage.value) return;
  const remaining = Math.max(6 - reviewForm.value.images.length, 0);
  if (!remaining) return;
  try {
    const chosen = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => uni.chooseImage({ count: remaining, sizeType: ["compressed"], success: resolve, fail: reject }));
    const files = (chosen.tempFilePaths || []).slice(0, remaining);
    uploadingReviewImage.value = true;
    for (const filePath of files) {
      const uploaded = await uploadMallReviewImage(filePath);
      if (uploaded.url) reviewForm.value.images.push(uploaded.url);
    }
    if (files.length) uni.showToast({ title: "晒图已上传", icon: "none" });
  } catch (error: any) {
    if (!String(error?.errMsg || "").includes("cancel")) uni.showToast({ title: error.message || "上传失败", icon: "none" });
  } finally {
    uploadingReviewImage.value = false;
  }
}
async function chooseRefundImages() {
  if (uploadingRefundImage.value) return;
  const remaining = Math.max(6 - refundForm.value.images.length, 0);
  if (!remaining) return;
  try {
    const chosen = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => uni.chooseImage({ count: remaining, sizeType: ["compressed"], success: resolve, fail: reject }));
    const files = (chosen.tempFilePaths || []).slice(0, remaining);
    uploadingRefundImage.value = true;
    for (const filePath of files) {
      const uploaded = await uploadMallRefundImage(filePath);
      if (uploaded.url) refundForm.value.images.push(uploaded.url);
    }
    if (files.length) uni.showToast({ title: "凭证已上传", icon: "none" });
  } catch (error: any) {
    if (!String(error?.errMsg || "").includes("cancel")) uni.showToast({ title: error.message || "上传失败", icon: "none" });
  } finally {
    uploadingRefundImage.value = false;
  }
}
async function submitRefund() {
  if (refundSubmitting.value) return;
  const reason = String(refundForm.value.reason || "").trim();
  if (!reason) return uni.showToast({ title: "请填写售后原因", icon: "none" });
  refundSubmitting.value = true;
  try {
    const items = refundForm.value.items.filter((item: any) => Number(item.quantity || 0) > 0).map((item: any) => ({ orderItemId: item.orderItemId, quantity: Math.min(Math.max(Math.trunc(Number(item.quantity || 0)), 1), item.remainingQuantity) }));
    if (!items.length) return uni.showToast({ title: "请至少选择一个售后商品", icon: "none" });
    await request(`/public/me/mall/orders/${orderId.value}/refund-request`, {
      method: "POST",
      data: {
        type: refundForm.value.type,
        reason,
        amount: refundForm.value.type === "exchange" ? 0 : Number(refundForm.value.amount || 0),
        businessKey: refundBusinessKey.value,
        items,
        images: refundForm.value.images.map((item: string) => String(item || "").trim()).filter(Boolean)
      }
    });
    uni.showToast({ title: "售后已提交", icon: "none" });
    closeRefundDialog();
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  } finally {
    refundSubmitting.value = false;
  }
}
async function chooseRefundActionImages() {
  if (uploadingRefundImage.value) return;
  const remaining = Math.max(6 - refundActionForm.value.images.length, 0);
  if (!remaining) return;
  try {
    const chosen = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => uni.chooseImage({ count: remaining, sizeType: ["compressed"], success: resolve, fail: reject }));
    uploadingRefundImage.value = true;
    for (const filePath of (chosen.tempFilePaths || []).slice(0, remaining)) {
      const uploaded = await uploadMallRefundImage(filePath);
      if (uploaded.url) refundActionForm.value.images.push(uploaded.url);
    }
  } catch (error: any) {
    if (!String(error?.errMsg || "").includes("cancel")) uni.showToast({ title: error.message || "上传失败", icon: "none" });
  } finally { uploadingRefundImage.value = false; }
}
async function submitRefundAction() {
  if (!activeRefund.value?.id || activeAction.value) return;
  const isReturn = refundActionMode.value === "return";
  if (isReturn && !String(refundActionForm.value.expressNo || "").trim()) return uni.showToast({ title: "请填写退货物流单号", icon: "none" });
  if (!isReturn && !String(refundActionForm.value.content || "").trim()) return uni.showToast({ title: "请填写说明", icon: "none" });
  activeAction.value = "refund-action";
  try {
    if (isReturn) {
      await request(`/public/me/mall/refunds/${activeRefund.value.id}/return-shipment`, { method: "POST", data: { expressCompany: refundActionForm.value.expressCompany, expressNo: refundActionForm.value.expressNo, remark: refundActionForm.value.content } });
    } else {
      const content = String(refundActionForm.value.content || "").trim();
      const path = refundActionMode.value === "intervention" ? "intervention" : "messages";
      await request(`/public/me/mall/refunds/${activeRefund.value.id}/${path}`, { method: "POST", data: { content, images: refundActionForm.value.images } });
    }
    uni.showToast({ title: "已提交", icon: "none" });
    closeRefundAction();
    await load();
  } catch (error: any) { uni.showToast({ title: error.message || "提交失败", icon: "none" }); }
  finally { activeAction.value = ""; }
}
async function submitReview() {
  if (activeAction.value) return;
  const content = String(reviewForm.value.content || "").trim();
  if (!content) return uni.showToast({ title: "请填写评价内容", icon: "none" });
  activeAction.value = "review";
  try {
    const images = reviewForm.value.images.map((item: string) => String(item || "").trim()).filter(Boolean);
    if (reviewForm.value.mode === "append") await request(`/public/me/mall/reviews/${reviewForm.value.reviewId}/append`, { method: "POST", data: { content, images } });
    else await request("/public/me/mall/reviews", { method: "POST", data: { orderItemId: reviewForm.value.orderItemId, rating: reviewForm.value.rating, content, images } });
    uni.showToast({ title: reviewForm.value.mode === "append" ? "追评已提交，待审核" : "评价已提交，待审核", icon: "none" });
    closeReviewDialog();
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  } finally {
    activeAction.value = "";
  }
}
onLoad((query) => { orderId.value = Number(query?.id || 0); });
onShow(() => { void load(); });
</script>

<style scoped>
.detail-page { min-height:100vh; box-sizing:border-box; padding:24rpx 24rpx calc(140rpx + env(safe-area-inset-bottom)); background:#f8fafc; }
.page-state { display:grid; gap:14rpx; margin-bottom:18rpx; padding:24rpx; border-radius:8px; background:#fff; color:#64748b; font-size:25rpx; line-height:1.6; }
.page-state.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.page-state.warning-state { border:1rpx solid #fed7aa; background:#fffaf0; color:#9a3412; }
.page-state.success-state { border:1rpx solid #bbf7d0; background:#f0fdf4; color:#15803d; }
.state-retry { width:max-content; color:#9a3412; font-weight:900; }
.status-card { padding:34rpx; border-radius:30rpx; background:linear-gradient(135deg,#7c2d12,#ea580c); color:#fff; margin-bottom:20rpx; display:grid; gap:10rpx; }
.status { font-size:38rpx; font-weight:900; }
.status-tip { font-size:26rpx; line-height:1.45; opacity:.92; }
.store-name { width:fit-content; padding:8rpx 14rpx; border-radius:999rpx; background:rgba(255,255,255,.16); color:#fff; font-size:23rpx; font-weight:900; }
.order-no { font-size:24rpx; opacity:.82; }
.card { background:#fff; border-radius:26rpx; padding:24rpx; margin-bottom:18rpx; box-shadow:0 12rpx 30rpx rgba(15,23,42,.06); }
.section-title { display:block; font-size:30rpx; font-weight:900; color:#1f2937; margin-bottom:16rpx; }
.line { display:block; color:#1f2937; font-size:28rpx; font-weight:800; line-height:1.5; }
.muted { display:block; color:#64748b; font-size:25rpx; line-height:1.5; }
.timeline { display:grid; gap:18rpx; }
.step { display:flex; gap:16rpx; opacity:.48; }
.step.active { opacity:1; }
.dot { width:18rpx; height:18rpx; margin-top:12rpx; border-radius:999px; background:#cbd5e1; flex:0 0 auto; }
.step.active .dot { background:#c2410c; box-shadow:0 0 0 8rpx #ffedd5; }
.warning { display:block; margin-top:18rpx; padding:14rpx; border-radius:16rpx; background:#fff7ed; color:#9a3412; font-size:24rpx; line-height:1.45; }
.deadline { display:block; margin-top:18rpx; padding:14rpx; border-radius:16rpx; background:#ecfeff; color:#0f766e; font-size:24rpx; font-weight:800; line-height:1.45; }
.checkout-group-card { border:1rpx solid rgba(14,116,144,.14); background:linear-gradient(180deg,#ffffff,#f8fafc); }
.group-order-row { margin-top:16rpx; padding:18rpx; border-radius:22rpx; border:1rpx solid #e2e8f0; background:#fff; display:flex; justify-content:space-between; align-items:center; gap:18rpx; }
.group-order-row.current { border-color:#fed7aa; background:#fff7ed; }
.group-order-main { flex:1; min-width:0; }
.group-order-side { display:grid; justify-items:end; gap:6rpx; flex:0 0 auto; }
.payment-task-list { display:grid; gap:14rpx; margin-top:22rpx; padding-top:22rpx; border-top:1rpx solid #e2e8f0; }
.payment-task-row { display:flex; justify-content:space-between; align-items:flex-start; gap:18rpx; padding:18rpx; background:#f8fafc; }
.group-payment-tip { display:block; padding:14rpx 16rpx; background:#ecfdf5; color:#047857; font-size:24rpx; font-weight:800; overflow-wrap:anywhere; }
.current-pill { margin-left:10rpx; padding:4rpx 12rpx; border-radius:999rpx; background:#9a3412; color:#fff; font-size:21rpx; font-weight:900; vertical-align:middle; }
.group-card { border:1rpx solid rgba(194,65,12,.12); }
.group-box { display:grid; gap:8rpx; padding:18rpx; border-radius:22rpx; background:linear-gradient(135deg,#fff7ed,#fff); border:1rpx solid #ffedd5; }
.group-box + .group-box { margin-top:14rpx; }
.group-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14rpx; }
.group-head .line { flex:1; }
.group-status { flex:0 0 auto; padding:8rpx 16rpx; border-radius:999rpx; background:#f1f5f9; color:#475569; font-size:23rpx; font-weight:900; }
.group-status.forming { background:#ecfeff; color:#0f766e; }
.group-status.success { background:#dcfce7; color:#166534; }
.group-status.failed { background:#fee2e2; color:#991b1b; }
.item-row { display:flex; gap:16rpx; align-items:center; padding:16rpx 0; border-bottom:1rpx solid #f1f5f9; }
.cover { width:110rpx; height:110rpx; border-radius:18rpx; background:#fed7aa; }
.item-info { flex:1; min-width:0; }
.item-name { display:block; color:#1f2937; font-size:27rpx; font-weight:900; }
.review-link { display:inline-flex; width:fit-content; margin-top:10rpx; padding:8rpx 16rpx; border-radius:999rpx; background:#fff7ed; color:#9a3412; font-size:24rpx; font-weight:900; }
.review-state { display:block; margin-top:8rpx; color:#9a3412; font-size:24rpx; font-weight:800; }
.price { color:#c2410c; font-weight:900; }
.amount-row { display:flex; justify-content:space-between; align-items:center; margin-top:18rpx; color:#64748b; font-size:25rpx; }
.amount { color:#c2410c; font-size:36rpx; font-weight:900; }
.remark { margin-top:12rpx; }
.refund-card { border:1rpx solid rgba(194,65,12,.16); }
.after-sale-case { padding:20rpx 0; border-top:1rpx solid #e2e8f0; display:grid; gap:8rpx; }
.after-sale-case:first-of-type { border-top:0; }
.after-sale-case .row { display:flex; justify-content:space-between; align-items:center; gap:16rpx; }
.refund-item-summary { display:flex; justify-content:space-between; gap:16rpx; padding:10rpx 14rpx; background:#f8fafc; color:#334155; font-size:24rpx; }
.return-address { padding:14rpx; background:#fff7ed; color:#7c2d12; font-size:24rpx; }
.refund-messages { display:grid; gap:8rpx; margin-top:8rpx; }
.refund-message { padding:12rpx 14rpx; border-left:6rpx solid #c2410c; background:#f8fafc; font-size:24rpx; }
.refund-item-picker { display:grid; gap:12rpx; margin:16rpx 0; }
.refund-item-row { display:flex; justify-content:space-between; align-items:center; gap:16rpx; padding:14rpx; background:#f8fafc; }
.refund-item-row > view { flex:1; min-width:0; }
.refund-item-row input { width:110rpx; text-align:center; background:#fff; border:1rpx solid #cbd5e1; padding:10rpx; box-sizing:border-box; }
.form-select { padding:18rpx; border:1rpx solid #cbd5e1; color:#334155; font-size:26rpx; }
.refund-images { margin-top:16rpx; }
.proof-image { width:140rpx; height:140rpx; border-radius:18rpx; background:#f1f5f9; }
.shipment-row { margin-top:16rpx; padding:18rpx 0; border-top:1rpx solid #e2e8f0; }
.shipment-row .row { display:flex; justify-content:space-between; align-items:flex-start; gap:16rpx; }
.shipment-status { flex:0 0 auto; color:#0f766e; font-size:24rpx; font-weight:900; }
.logistics-actions { display:flex; gap:18rpx; margin-top:14rpx; }
.logistics-link { display:inline-flex; padding:10rpx 20rpx; border-radius:999rpx; background:#ecfeff; color:#0f766e; font-size:24rpx; font-weight:900; }
.logistics-link.muted-action { background:#f1f5f9; color:#475569; }
.action-bar { position:fixed; left:0; right:0; bottom:0; padding:18rpx 28rpx 34rpx; background:#fff; display:flex; justify-content:flex-end; gap:16rpx; box-shadow:0 -10rpx 30rpx rgba(15,23,42,.08); }
.refund-action-tip { display:flex; align-items:center; padding:0 20rpx; border-radius:999rpx; background:#fff7ed; color:#9a3412; font-size:25rpx; font-weight:900; }
button { margin:0; border-radius:999px; background:#9a3412; color:#fff; font-size:27rpx; font-weight:900; }
button.ghost { background:#f1f5f9; color:#475569; }
.review-mask { position:fixed; inset:0; z-index:20; background:rgba(15,23,42,.46); display:flex; align-items:flex-end; }
.review-panel { width:100%; max-height:82vh; overflow:auto; padding:30rpx 28rpx 44rpx; border-radius:34rpx 34rpx 0 0; background:#fff; box-sizing:border-box; }
.review-head { margin-bottom:16rpx; }
.rating-row { display:flex; gap:12rpx; margin:10rpx 0 20rpx; }
.rating-star { color:#cbd5e1; font-size:48rpx; line-height:1; }
.rating-star.active { color:#f59e0b; }
.image-list { display:flex; gap:14rpx; flex-wrap:wrap; margin-top:18rpx; }
.review-image-tile { position:relative; width:150rpx; height:150rpx; border-radius:20rpx; overflow:hidden; background:#f1f5f9; }
.review-image-tile image { width:100%; height:100%; display:block; }
.remove-image { position:absolute; right:8rpx; top:8rpx; padding:4rpx 10rpx; border-radius:999rpx; background:rgba(15,23,42,.72); color:#fff; font-size:22rpx; font-weight:900; }
.add-image { width:150rpx; height:150rpx; display:flex; align-items:center; justify-content:center; box-sizing:border-box; border:1rpx dashed #fdba74; border-radius:20rpx; background:#fff7ed; color:#9a3412; font-size:25rpx; font-weight:900; text-align:center; }
.review-actions { display:flex; justify-content:flex-end; gap:16rpx; margin-top:22rpx; }
@media (min-width:760px) { .detail-page { width:760px; margin:0 auto; } .action-bar { width:760px; left:50%; right:auto; transform:translateX(-50%); box-sizing:border-box; } }
</style>
