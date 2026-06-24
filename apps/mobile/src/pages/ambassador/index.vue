<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { request } from "../../api";

type Faq = { question: string; answer: string };
type CaseItem = { id: number; name: string; field?: string; avatarUrl?: string; metrics?: string; quote?: string };

const loading = ref(false);
const submitting = ref(false);
const submitted = ref(false);
const cases = ref<CaseItem[]>([]);
const config = reactive<any>({
  heroTitle: "",
  heroSubtitle: "",
  heroCopy: "",
  ctaText: "立即申请，锁定早鸟名额",
  originalPrice: "2999",
  earlyBirdPrice: "999",
  quotaText: "",
  refundText: "",
  customerWechat: "",
  customerPhone: "",
  backgroundImageUrl: "",
  painPoints: [] as string[],
  solutionItems: [] as string[],
  benefits: [] as string[],
  requirements: [] as string[],
  faqs: [] as Faq[]
});
const form = reactive({ name: "", phone: "", city: "", expertise: "", experience: "", wechat: "", source: "", channelCode: "" });

const heroStyle = computed(() => {
  const image = String(config.backgroundImageUrl || "").trim();
  return image ? { backgroundImage: `linear-gradient(115deg, rgba(33, 32, 29, 0.86), rgba(95, 32, 27, 0.62)), url(${image})` } : {};
});

function assignLanding(data: any) {
  const incoming = data?.setting?.config || {};
  Object.assign(config, {
    ...incoming,
    painPoints: normalizeList(incoming.painPoints),
    solutionItems: normalizeList(incoming.solutionItems),
    benefits: normalizeList(incoming.benefits),
    requirements: normalizeList(incoming.requirements),
    faqs: normalizeFaqs(incoming.faqs)
  });
  cases.value = Array.isArray(data?.cases) ? data.cases : [];
}

function normalizeList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || "")).filter(Boolean) : [];
}

function normalizeFaqs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({ question: item?.question || "", answer: item?.answer || "" })).filter((item) => item.question && item.answer);
}

async function load() {
  loading.value = true;
  try {
    assignLanding(await request<any>("/public/ambassador/landing"));
  } catch (error: any) {
    uni.showToast({ title: error.message || "页面加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function scrollToForm() {
  uni.pageScrollTo({ selector: ".application-form", duration: 260 });
}

function validate() {
  if (!form.name.trim()) return "请填写姓名";
  if (!/^1\d{10}$/.test(form.phone.trim())) return "请填写正确手机号";
  if (!form.city.trim()) return "请填写城市";
  if (!form.expertise.trim()) return "请填写擅长领域";
  if (!form.experience.trim()) return "请填写经验介绍";
  if (!form.wechat.trim()) return "请填写微信号";
  return "";
}

async function submit() {
  const message = validate();
  if (message) return uni.showToast({ title: message, icon: "none" });
  submitting.value = true;
  try {
    await request("/public/ambassador/applications", { method: "POST", data: { ...form } });
    submitted.value = true;
    uni.showModal({ title: "申请已提交", content: "我们会尽快与你联系，沟通文化大使入驻细节。", showCancel: false });
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
onLoad((options: any) => {
  form.source = String(options?.source || "").trim();
  form.channelCode = String(options?.channelCode || options?.channel || "").trim();
});
</script>

<template>
  <view class="ambassador-page">
    <view class="hero" :style="heroStyle">
      <view class="hero-inner">
        <text class="seal">慢π · 英雄帖</text>
        <text class="hero-title">{{ config.heroTitle }}</text>
        <text class="hero-subtitle">{{ config.heroSubtitle }}</text>
        <text class="hero-copy">{{ config.heroCopy }}</text>
        <button class="cta" @click="scrollToForm">{{ config.ctaText }}</button>
      </view>
    </view>

    <view class="section dark-section">
      <text class="section-kicker">这人懂我</text>
      <text class="section-title">你是不是也有这种感觉</text>
      <view class="pain-list">
        <view v-for="item in config.painPoints" :key="item" class="pain-item">{{ item }}</view>
      </view>
      <text class="bridge">你缺的不是才华，而是一个能帮你把才华产品化、品牌化的舞台。</text>
    </view>

    <view class="section">
      <text class="section-kicker">我们不一样</text>
      <text class="section-title">慢π「文化大使」计划</text>
      <text class="section-desc">我们不招员工，我们找共创者。你负责内容与热爱，我们负责把路径铺清楚。</text>
      <view class="feature-list">
        <view v-for="(item, index) in config.solutionItems" :key="item" class="feature-item">
          <text class="feature-no">0{{ index + 1 }}</text>
          <text>{{ item }}</text>
        </view>
      </view>
    </view>

    <view v-if="cases.length" class="section cases-section">
      <text class="section-kicker">真实案例</text>
      <text class="section-title">他们已经开始了第二曲线</text>
      <view class="case-list">
        <view v-for="item in cases" :key="item.id" class="case-card">
          <image v-if="item.avatarUrl" class="case-avatar" :src="item.avatarUrl" mode="aspectFill" />
          <view v-else class="case-avatar placeholder">{{ item.name.slice(0, 1) }}</view>
          <view class="case-body">
            <text class="case-name">{{ item.name }}<text v-if="item.field" class="case-field"> · {{ item.field }}</text></text>
            <text v-if="item.metrics" class="case-metrics">{{ item.metrics }}</text>
            <text v-if="item.quote" class="case-quote">“{{ item.quote }}”</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section benefit-section">
      <text class="section-kicker">钱和面子都有</text>
      <text class="section-title">成为文化大使，你将获得</text>
      <view class="benefit-list">
        <view v-for="(item, index) in config.benefits" :key="item" class="benefit-item">
          <text class="benefit-index">{{ index + 1 }}</text>
          <text>{{ item }}</text>
        </view>
      </view>
    </view>

    <view class="section price-section">
      <text class="section-kicker">现在就上车</text>
      <text class="section-title">成为文化大使，需要什么条件</text>
      <view class="require-list">
        <view v-for="item in config.requirements" :key="item" class="require-item">{{ item }}</view>
      </view>
      <view class="price-panel">
        <text class="quota">{{ config.quotaText }}</text>
        <view class="price-line">
          <text class="old-price">原价 {{ config.originalPrice }} 元/年</text>
          <text class="new-price">早鸟价 {{ config.earlyBirdPrice }} 元/年</text>
        </view>
        <text class="refund">{{ config.refundText }}</text>
        <button class="cta wide" @click="scrollToForm">{{ config.ctaText }}</button>
      </view>
    </view>

    <view v-if="config.faqs.length" class="section">
      <text class="section-kicker">最后疑虑</text>
      <text class="section-title">常见问题</text>
      <view class="faq-list">
        <view v-for="item in config.faqs" :key="item.question" class="faq-item">
          <text class="faq-q">Q：{{ item.question }}</text>
          <text class="faq-a">A：{{ item.answer }}</text>
        </view>
      </view>
    </view>

    <view class="section application-form">
      <text class="section-kicker">提交申请</text>
      <text class="section-title">锁定你的早鸟名额</text>
      <view class="form-card">
        <input v-model="form.name" class="input" placeholder="姓名" :disabled="submitted" />
        <input v-model="form.phone" class="input" placeholder="手机号" type="number" maxlength="11" :disabled="submitted" />
        <input v-model="form.city" class="input" placeholder="所在城市" :disabled="submitted" />
        <input v-model="form.expertise" class="input" placeholder="擅长领域，例如书法 / 教育 / 传统文化" :disabled="submitted" />
        <textarea v-model="form.experience" class="textarea" placeholder="简单介绍你的经验、资源或想做的课程方向" :disabled="submitted" />
        <input v-model="form.wechat" class="input" placeholder="微信号" :disabled="submitted" />
        <button class="cta wide" :loading="submitting" :disabled="submitting || submitted" @click="submit">{{ submitted ? "已提交，等待联系" : config.ctaText }}</button>
        <text v-if="config.customerWechat || config.customerPhone" class="contact">客服：{{ config.customerWechat || config.customerPhone }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.ambassador-page {
  min-height: 100vh;
  background: #f7f2e8;
  color: #28251f;
  padding-bottom: env(safe-area-inset-bottom);
}
.hero {
  min-height: 92vh;
  display: flex;
  align-items: center;
  background:
    linear-gradient(115deg, rgba(33, 32, 29, 0.92), rgba(114, 33, 26, 0.66)),
    radial-gradient(circle at 78% 18%, rgba(199, 155, 82, 0.28), transparent 30%),
    linear-gradient(135deg, #2d2a25, #6d211d);
  background-size: cover;
  background-position: center;
  padding: 48rpx 38rpx 92rpx;
}
.hero-inner {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  max-width: 760rpx;
}
.seal,
.section-kicker {
  color: #a83c31;
  font-size: 24rpx;
  font-weight: 700;
}
.hero .seal {
  color: #f0d7a0;
}
.hero-title {
  color: #fff8e8;
  font-size: 64rpx;
  font-weight: 800;
  line-height: 1.12;
}
.hero-subtitle {
  color: #f2dca8;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.35;
}
.hero-copy {
  color: rgba(255, 248, 232, 0.88);
  font-size: 30rpx;
  line-height: 1.65;
}
.cta {
  margin: 12rpx 0 0;
  width: fit-content;
  min-width: 310rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 6rpx;
  background: linear-gradient(135deg, #b53a2f, #821e19);
  color: #fff8e8;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 18rpx 40rpx rgba(112, 27, 21, 0.28);
}
.cta.wide {
  width: 100%;
}
.section {
  padding: 64rpx 34rpx;
  background: #f7f2e8;
}
.dark-section {
  background: #25231f;
  color: #fff8e8;
}
.section-title {
  display: block;
  margin-top: 12rpx;
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.3;
}
.section-desc,
.bridge {
  display: block;
  margin-top: 20rpx;
  color: #776b5d;
  font-size: 28rpx;
  line-height: 1.7;
}
.dark-section .bridge {
  color: #f0d7a0;
}
.pain-list,
.feature-list,
.benefit-list,
.require-list,
.faq-list,
.case-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 32rpx;
}
.pain-item {
  border: 1px solid rgba(240, 215, 160, 0.28);
  padding: 24rpx;
  color: rgba(255, 248, 232, 0.88);
  font-size: 28rpx;
  line-height: 1.65;
}
.feature-item,
.benefit-item,
.require-item,
.faq-item,
.case-card,
.form-card,
.price-panel {
  border: 1px solid rgba(130, 93, 55, 0.18);
  border-radius: 8rpx;
  background: rgba(255, 252, 244, 0.82);
  padding: 28rpx;
}
.feature-item {
  display: flex;
  gap: 18rpx;
  font-size: 29rpx;
  line-height: 1.65;
}
.feature-no,
.benefit-index {
  color: #a83c31;
  font-weight: 800;
}
.case-card {
  display: flex;
  gap: 22rpx;
}
.case-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 56rpx;
  flex: none;
}
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #8f2d26;
  color: #fff8e8;
  font-size: 42rpx;
  font-weight: 800;
}
.case-body {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.case-name {
  font-size: 30rpx;
  font-weight: 800;
}
.case-field,
.case-metrics {
  color: #a83c31;
}
.case-quote,
.benefit-item,
.require-item,
.faq-a {
  color: #5f5549;
  font-size: 28rpx;
  line-height: 1.7;
}
.price-panel {
  margin-top: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.quota {
  color: #a83c31;
  font-size: 28rpx;
  font-weight: 700;
}
.price-line {
  display: flex;
  align-items: baseline;
  gap: 18rpx;
  flex-wrap: wrap;
}
.old-price {
  color: #8f8374;
  text-decoration: line-through;
  font-size: 26rpx;
}
.new-price {
  color: #8b221d;
  font-size: 44rpx;
  font-weight: 900;
}
.refund {
  color: #5f5549;
  font-size: 26rpx;
}
.faq-q {
  display: block;
  color: #28251f;
  font-size: 29rpx;
  font-weight: 800;
  margin-bottom: 10rpx;
}
.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 88rpx;
  border: 1px solid rgba(130, 93, 55, 0.22);
  border-radius: 6rpx;
  padding: 0 24rpx;
  margin-bottom: 18rpx;
  background: #fffdf8;
  color: #28251f;
  font-size: 28rpx;
}
.textarea {
  height: 168rpx;
  padding-top: 22rpx;
  line-height: 1.6;
}
.contact {
  display: block;
  margin-top: 18rpx;
  text-align: center;
  color: #776b5d;
  font-size: 26rpx;
}
button::after {
  border: none;
}
</style>
