import { reactive } from "vue";
import { request } from "./api";

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
    eyebrow: "七维书院 · 品牌故事",
    title: "把传统文化，做成可学习、可体验、可持续运营的现代书院。",
    copy: "七维书院连接课程、活动、共修、公益与本地服务，让每一座城市都能拥有自己的学习空间。",
    primaryActionText: "申请成为院长",
    secondaryActionText: "了解帮扶计划",
    sectionTitle: "我们相信",
    items: ["文化要落到日常：不是只停留在口号里，而是变成一次晨读、一节课、一次共修和一段长期陪伴。", "书院要能运营：活动获客、课程交付、报名收款、退款审核、学员服务都应该有清晰后台承接。", "善意要可追踪：公益帮扶、学员成长和本地资源连接，都需要被记录、被服务、被持续改进。"],
    flowTitle: "一套完整的书院闭环",
    flowItems: ["品牌认知", "活动体验", "课程学习", "共修打卡", "公益帮扶", "本地书院"],
    joinTitle: "你可以如何参与"
  },
  deanRecruit: {
    eyebrow: "院长招募",
    title: "招募一批真正愿意把书院开在本地的人。",
    copy: "院长不是普通代理，而是本地学习空间的负责人：组织活动、服务学员、链接老师和公益资源。",
    sectionTitle: "适合谁",
    items: ["有本地文化空间或稳定社群", "愿意长期做课程与活动交付", "能服务学员并维护当地口碑", "认同七维书院品牌与公益理念"],
    formTitle: "提交院长申请",
    submitText: "提交院长申请",
    successMessage: "院长招募申请已进入后台，我们会尽快联系你。"
  },
  ambassadorApply: {
    eyebrow: "大使申请",
    title: "把你的热爱，变成能被更多人看见的文化服务。",
    copy: "适合讲师、主理人、内容创作者、社群组织者申请成为七维文化大使。",
    sectionTitle: "你将参与",
    items: ["课程共创", "活动共办", "品牌露出", "学员服务", "公益参与", "长期成长"],
    formTitle: "提交大使申请",
    submitText: "提交大使申请",
    successMessage: "大使申请已进入后台，我们会尽快联系你。"
  },
  aidApply: {
    eyebrow: "帮扶申请",
    title: "让需要帮助的人和愿意做事的项目，被看见、被连接、被持续服务。",
    copy: "个人可申请学习帮扶/公益名额，项目方可提交公益项目合作需求。",
    sectionTitle: "申请类型",
    items: ["个人学习帮扶", "公益项目合作", "课程/活动名额支持", "本地资源连接"],
    formTitle: "提交帮扶申请",
    submitText: "提交帮扶申请",
    successMessage: "帮扶申请已进入后台，我们会尽快联系你核实信息。"
  }
};

export function useEntryPageConfig(key: keyof typeof defaults) {
  const config = reactive<EntryPageConfig>({ ...defaults[key], items: [...defaults[key].items], flowItems: [...(defaults[key].flowItems || [])] });

  async function load() {
    try {
      const landing = await request<any>("/public/ambassador/landing");
      const remote = landing?.setting?.config?.entryPages?.[key] || {};
      Object.assign(config, { ...remote });
      config.items = Array.isArray(remote.items) && remote.items.length ? remote.items : [...defaults[key].items];
      config.flowItems = Array.isArray(remote.flowItems) && remote.flowItems.length ? remote.flowItems : [...(defaults[key].flowItems || [])];
    } catch {
      // Keep local defaults so the public page still opens if config loading fails.
    }
  }

  return { config, load };
}
