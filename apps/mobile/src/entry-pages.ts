import { reactive, ref } from "vue";
import { request } from "./api";
import { reviewSafeData } from "./review-safe-text";
import { createTenantLoadGuard } from "./tenant-load-guard";

export type EntryPageConfig = {
  eyebrow: string;
  title: string;
  copy: string;
  sectionTitle: string;
  items: string[];
  formTitle?: string;
  submitText?: string;
  successMessage?: string;
  primaryActionText?: string;
  secondaryActionText?: string;
  flowTitle?: string;
  flowItems?: string[];
  joinTitle?: string;
};

const defaults: Record<string, EntryPageConfig> = {
  brandStory: {
    eyebrow: "慢π · 品牌故事",
    title: "把传统文化，做成可体验、可参与、可持续运营的现代活动空间。",
    copy: "慢π连接活动、共修、公益与本地服务，让每一座城市都能拥有自己的文化空间。",
    primaryActionText: "申请成为院长",
    secondaryActionText: "了解帮扶计划",
    sectionTitle: "我们相信",
    items: ["文化要落到日常：不是只停留在口号里，而是变成一次晨读、一次分享、一次共修和一段长期陪伴。", "空间要能运营：活动获客、内容服务、报名收款、退款审核、参与者服务都应该有清晰后台承接。", "善意要可追踪：公益帮扶、参与者成长和本地资源连接，都需要被记录、被服务、被持续改进。"],
    flowTitle: "一套完整的慢π闭环",
    flowItems: ["品牌认知", "活动体验", "内容参与", "共修打卡", "公益帮扶", "本地慢π"],
    joinTitle: "你可以如何参与"
  },
  deanRecruit: {
    eyebrow: "院长招募",
    title: "招募一批真正愿意把慢π服务落在本地的人。",
    copy: "院长不是普通代理，而是本地活动空间的负责人：组织活动、服务参与者、链接主理人和公益资源。",
    sectionTitle: "适合谁",
    items: ["有本地文化空间或稳定社群", "愿意长期做好活动服务", "能服务参与者并维护当地口碑", "认同慢π品牌与公益理念"],
    formTitle: "提交院长申请",
    submitText: "提交院长申请",
    successMessage: "院长招募申请已进入后台，我们会尽快联系你。"
  },
  ambassadorApply: {
    eyebrow: "大使申请",
    title: "把你的热爱，变成能被更多人看见的文化服务。",
    copy: "适合讲师、主理人、内容创作者、社群组织者申请成为慢π大使。",
    sectionTitle: "你将参与",
    items: ["内容共创", "活动共办", "品牌露出", "参与者服务", "公益参与", "长期成长"],
    formTitle: "提交大使申请",
    submitText: "提交大使申请",
    successMessage: "大使申请已进入后台，我们会尽快联系你。"
  },
  aidApply: {
    eyebrow: "帮扶申请",
    title: "让需要帮助的人和愿意做事的项目，被看见、被连接、被持续服务。",
    copy: "个人可申请活动帮扶/公益名额，项目方可提交公益项目合作需求。",
    sectionTitle: "申请类型",
    items: ["个人活动帮扶", "公益项目合作", "活动名额支持", "本地资源连接"],
    formTitle: "提交帮扶申请",
    submitText: "提交帮扶申请",
    successMessage: "帮扶申请已进入后台，我们会尽快联系你核实信息。"
  }
};

export function useEntryPageConfig(key: keyof typeof defaults) {
  const config = reactive<EntryPageConfig>({ ...defaults[key], items: [...defaults[key].items], flowItems: [...(defaults[key].flowItems || [])] });
  const loading = ref(false);
  const error = ref("");
  const loadGuard = createTenantLoadGuard();

  async function load() {
    const token = loadGuard.begin();
    loading.value = true;
    error.value = "";
    try {
      const landing = reviewSafeData(await request<any>("/public/ambassador/landing"));
      if (!loadGuard.isCurrent(token)) return false;
      const remote = landing?.setting?.config?.entryPages?.[key] || {};
      Object.assign(config, { ...remote });
      config.items = Array.isArray(remote.items) && remote.items.length ? remote.items : [...defaults[key].items];
      config.flowItems = Array.isArray(remote.flowItems) && remote.flowItems.length ? remote.flowItems : [...(defaults[key].flowItems || [])];
      return true;
    } catch (loadError: any) {
      if (loadGuard.isCurrent(token)) error.value = loadError?.message || "页面配置加载失败";
      return false;
    } finally {
      if (loadGuard.isCurrent(token)) loading.value = false;
    }
  }

  return { config, loading, error, load };
}
