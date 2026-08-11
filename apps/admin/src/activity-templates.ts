import { FieldType } from "@activity/shared";

type ActivityFieldPreset = {
  label: string;
  type: FieldType;
  required: boolean;
  sortOrder: number;
  options: Array<{ label: string; value: string }>;
};

type ActivitySectionPreset = {
  type: string;
  title: string;
  content: string;
  imageUrl: string;
  sortOrder: number;
};

export type ActivityTemplate = {
  id: string;
  name: string;
  description: string;
  title: string;
  capacity: number;
  fields: ActivityFieldPreset[];
  sections: ActivitySectionPreset[];
  notice: string;
  eligibilityRules?: Record<string, unknown>;
};

const basicFields = (): ActivityFieldPreset[] => [
  { label: "姓名", type: FieldType.Text, required: true, sortOrder: 1, options: [] },
  { label: "手机号", type: FieldType.Phone, required: true, sortOrder: 2, options: [] },
  { label: "备注", type: FieldType.Remark, required: false, sortOrder: 3, options: [] }
];

const basicSections = (audience: string, agenda: string): ActivitySectionPreset[] => [
  { type: "highlights", title: "活动亮点", content: "- 主题分享与现场交流\n- 可带走的实用方法\n- 与同频伙伴面对面沟通", imageUrl: "", sortOrder: 1 },
  { type: "audience", title: "适合人群", content: audience, imageUrl: "", sortOrder: 2 },
  { type: "agenda", title: "活动流程", content: agenda, imageUrl: "", sortOrder: 3 },
  { type: "faq", title: "常见问题", content: "- 请提前 10 分钟到场签到。\n- 如需取消，请在活动开始前按报名须知操作。\n- 具体交通与入场说明以活动通知为准。", imageUrl: "", sortOrder: 4 }
];

export const activityTemplates: ActivityTemplate[] = [
  {
    id: "parent-child",
    name: "亲子共读",
    description: "亲子阅读、手作和家庭成长活动，默认包含儿童年龄与同行人信息。",
    title: "亲子共读成长活动",
    capacity: 20,
    fields: [
      ...basicFields().slice(0, 2),
      { label: "孩子姓名", type: FieldType.Text, required: true, sortOrder: 3, options: [] },
      { label: "孩子年龄", type: FieldType.Number, required: true, sortOrder: 4, options: [] },
      { label: "过敏或注意事项", type: FieldType.Remark, required: false, sortOrder: 5, options: [] }
    ],
    sections: basicSections("- 3-12 岁儿童及家长\n- 希望一起阅读、交流和动手实践的家庭", "1. 签到入场\n2. 绘本共读\n3. 亲子互动\n4. 分享与合影"),
    notice: "## 报名须知\n\n1. 请由监护人陪同孩子到场。\n2. 如有过敏或特殊需求，请在报名备注中说明。\n3. 请提前 10 分钟签到，活动开始后请保持安静参与。",
    eligibilityRules: { allowCompanions: true, maxCompanions: 1 }
  },
  {
    id: "reading",
    name: "读书会",
    description: "阅读分享、主题讨论和城市书房活动，默认收集行业与分享意向。",
    title: "主题读书会",
    capacity: 30,
    fields: [
      ...basicFields().slice(0, 2),
      { label: "职业/行业", type: FieldType.Text, required: false, sortOrder: 3, options: [] },
      { label: "想讨论的问题", type: FieldType.Remark, required: false, sortOrder: 4, options: [] }
    ],
    sections: basicSections("- 对本期主题感兴趣的朋友\n- 愿意交流阅读感受与实践问题的人", "1. 签到与破冰\n2. 主理人导读\n3. 小组讨论\n4. 自由分享与合影"),
    notice: "## 报名须知\n\n1. 建议提前阅读本期指定内容。\n2. 请准时到场，迟到请安静入座。\n3. 现场照片仅用于活动回顾，如不愿出镜请提前告知主办方。"
  },
  {
    id: "salon",
    name: "主题沙龙",
    description: "品牌交流、行业沙龙和嘉宾对谈，默认收集身份与交流诉求。",
    title: "主题交流沙龙",
    capacity: 50,
    fields: [
      ...basicFields().slice(0, 2),
      { label: "机构/公司", type: FieldType.Text, required: false, sortOrder: 3, options: [] },
      { label: "职务", type: FieldType.Text, required: false, sortOrder: 4, options: [] },
      { label: "希望交流的话题", type: FieldType.Remark, required: false, sortOrder: 5, options: [] }
    ],
    sections: basicSections("- 对主题有实践经验或明确问题的从业者\n- 希望建立行业连接的朋友", "1. 来宾签到\n2. 嘉宾主题分享\n3. 圆桌对谈\n4. 自由交流"),
    notice: "## 报名须知\n\n1. 名额有限，请确认能到场后再报名。\n2. 现场交流请尊重他人隐私和知识产权。\n3. 以主办方最终通知的时间、地点为准。"
  },
  {
    id: "training",
    name: "培训课程",
    description: "线下培训、公开课和工作坊，默认收集基础信息与学习目标。",
    title: "线下实战培训课",
    capacity: 40,
    fields: [
      ...basicFields().slice(0, 2),
      { label: "所在行业", type: FieldType.Text, required: false, sortOrder: 3, options: [] },
      { label: "学习目标", type: FieldType.Remark, required: true, sortOrder: 4, options: [] }
    ],
    sections: basicSections("- 希望系统学习相关主题的参与者\n- 愿意完成练习并参与讨论的朋友", "1. 签到与开场\n2. 核心内容讲解\n3. 案例练习\n4. 问答与行动计划"),
    notice: "## 报名须知\n\n1. 请携带可记录的设备或笔记本。\n2. 课程资料和签到安排以活动通知为准。\n3. 付费活动退款规则请以活动详情为准。"
  },
  {
    id: "outdoor",
    name: "户外同行",
    description: "徒步、研学和城市漫游，默认加强紧急联系人与风险提示。",
    title: "城市户外同行活动",
    capacity: 25,
    fields: [
      ...basicFields().slice(0, 2),
      { label: "紧急联系人", type: FieldType.Text, required: true, sortOrder: 3, options: [] },
      { label: "紧急联系人电话", type: FieldType.Phone, required: true, sortOrder: 4, options: [] },
      { label: "健康或装备说明", type: FieldType.Remark, required: false, sortOrder: 5, options: [] }
    ],
    sections: basicSections("- 身体状况适合本次活动强度的参与者\n- 能遵守集合、领队和安全要求的朋友", "1. 集合签到\n2. 安全说明\n3. 分段同行\n4. 终点签到与合影"),
    notice: "## 安全须知\n\n1. 请按活动要求准备饮水、服装和必要装备。\n2. 请如实填写健康和紧急联系人信息。\n3. 如遇恶劣天气或不可抗力，以主办方通知为准。"
  },
  {
    id: "charity",
    name: "公益志愿",
    description: "公益服务、社区共建和志愿招募，默认收集可服务时间和技能。",
    title: "社区公益志愿服务",
    capacity: 60,
    fields: [
      ...basicFields().slice(0, 2),
      { label: "可服务时段", type: FieldType.SingleChoice, required: true, sortOrder: 3, options: [{ label: "全天", value: "all_day" }, { label: "上午", value: "morning" }, { label: "下午", value: "afternoon" }] },
      { label: "可提供的技能", type: FieldType.Remark, required: false, sortOrder: 4, options: [] }
    ],
    sections: basicSections("- 认同活动目标并愿意投入服务时间的志愿者\n- 能遵守现场岗位安排的参与者", "1. 集合签到\n2. 岗位培训\n3. 分组服务\n4. 服务记录与复盘"),
    notice: "## 志愿服务须知\n\n1. 请准时签到并服从现场岗位安排。\n2. 服务过程中请保护服务对象的隐私。\n3. 如不能参加，请尽早取消报名，方便主办方补位。"
  }
];
