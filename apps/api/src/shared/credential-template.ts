import type { CertificateTemplateKey } from "../entities/certificate.entity";

export type CredentialTemplateKey = CertificateTemplateKey | "charity_contribution";
export type PublicHolderMode = "masked" | "full" | "hidden";

export type CredentialTemplateConfig = {
  title: string;
  englishTitle: string;
  description: string;
  detailLabel: string;
  issuerName: string;
  statement: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  logoText: string;
  logoUrl: string | null;
  backgroundImageUrl: string | null;
  sealUrl: string | null;
  signatureUrl: string | null;
  numberPrefix: string;
  publicHolderMode: PublicHolderMode;
};

export const credentialTemplateKeys: CredentialTemplateKey[] = [
  "charity_contribution",
  "charity_ambassador",
  "volunteer_service",
  "city_builder",
  "course_completion"
];

const defaults: Record<CredentialTemplateKey, CredentialTemplateConfig> = {
  charity_contribution: {
    title: "公益贡献凭证", englishTitle: "CHARITABLE CONTRIBUTION RECORD", description: "通过订单参与公益金计划，形成公益贡献", detailLabel: "公益贡献", issuerName: "慢π公益计划", statement: "平台从订单收入中按规则计提，非用户额外捐款或公益捐赠票据", primaryColor: "#315c4c", accentColor: "#b98b5d", textColor: "#475467", backgroundColor: "#eef5f0", borderColor: "#a4bda9", logoText: "慢π", logoUrl: null, backgroundImageUrl: null, sealUrl: null, signatureUrl: null, numberPrefix: "MPCG", publicHolderMode: "masked"
  },
  charity_ambassador: {
    title: "公益大使证书", englishTitle: "CERTIFICATE OF RECOGNITION", description: "感谢你参与公益服务与城市共建", detailLabel: "荣誉称号", issuerName: "慢π公益计划", statement: "以行动连接善意，让公益持续发生", primaryColor: "#8b4a3e", accentColor: "#b98b5d", textColor: "#263d3c", backgroundColor: "#f7f1e8", borderColor: "#d8b98c", logoText: "慢π", logoUrl: null, backgroundImageUrl: null, sealUrl: null, signatureUrl: null, numberPrefix: "MPCA", publicHolderMode: "masked"
  },
  volunteer_service: {
    title: "志愿服务证书", englishTitle: "CERTIFICATE OF RECOGNITION", description: "感谢你参与公益服务与城市共建", detailLabel: "服务时长", issuerName: "慢π志愿服务中心", statement: "谨以此证记录你的志愿服务与真诚付出", primaryColor: "#8b4a3e", accentColor: "#b98b5d", textColor: "#263d3c", backgroundColor: "#f7f1e8", borderColor: "#d8b98c", logoText: "慢π", logoUrl: null, backgroundImageUrl: null, sealUrl: null, signatureUrl: null, numberPrefix: "MPCB", publicHolderMode: "masked"
  },
  city_builder: {
    title: "城市共建证书", englishTitle: "CERTIFICATE OF RECOGNITION", description: "感谢你参与城市共建与公共服务", detailLabel: "服务时长", issuerName: "慢π城市共建计划", statement: "共同建设更有温度的城市生活", primaryColor: "#315c4c", accentColor: "#b98b5d", textColor: "#263d3c", backgroundColor: "#eef5f0", borderColor: "#a4bda9", logoText: "慢π", logoUrl: null, backgroundImageUrl: null, sealUrl: null, signatureUrl: null, numberPrefix: "MPCC", publicHolderMode: "masked"
  },
  course_completion: {
    title: "课程结业证书", englishTitle: "CERTIFICATE OF COMPLETION", description: "已达到课程学习与考核要求", detailLabel: "完成要求", issuerName: "慢π学习中心", statement: "愿学习沉淀为持续成长的力量", primaryColor: "#315c4c", accentColor: "#b98b5d", textColor: "#263d3c", backgroundColor: "#f7f1e8", borderColor: "#d8b98c", logoText: "慢π", logoUrl: null, backgroundImageUrl: null, sealUrl: null, signatureUrl: null, numberPrefix: "CRS", publicHolderMode: "masked"
  }
};

export function defaultCredentialTemplate(key: CredentialTemplateKey): CredentialTemplateConfig {
  return { ...defaults[key] };
}

function text(value: unknown, fallback: string, max: number) {
  const normalized = String(value ?? "").trim();
  return (normalized || fallback).slice(0, max);
}

function color(value: unknown, fallback: string) {
  const normalized = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : fallback;
}

function assetUrl(value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (/^(?:https:\/\/|\/uploads\/|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(normalized)) return normalized.slice(0, 200000);
  return null;
}

export function normalizeCredentialTemplate(key: CredentialTemplateKey, value: unknown): CredentialTemplateConfig {
  const base = defaultCredentialTemplate(key);
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const holderMode = String(input.publicHolderMode || base.publicHolderMode);
  return {
    title: text(input.title, base.title, 80),
    englishTitle: text(input.englishTitle, base.englishTitle, 120),
    description: text(input.description, base.description, 180),
    detailLabel: text(input.detailLabel, base.detailLabel, 40),
    issuerName: text(input.issuerName, base.issuerName, 100),
    statement: text(input.statement, base.statement, 220),
    primaryColor: color(input.primaryColor, base.primaryColor),
    accentColor: color(input.accentColor, base.accentColor),
    textColor: color(input.textColor, base.textColor),
    backgroundColor: color(input.backgroundColor, base.backgroundColor),
    borderColor: color(input.borderColor, base.borderColor),
    logoText: text(input.logoText, base.logoText, 12),
    logoUrl: assetUrl(input.logoUrl),
    backgroundImageUrl: assetUrl(input.backgroundImageUrl),
    sealUrl: assetUrl(input.sealUrl),
    signatureUrl: assetUrl(input.signatureUrl),
    numberPrefix: text(input.numberPrefix, base.numberPrefix, 12).toUpperCase().replace(/[^A-Z0-9]/g, "") || base.numberPrefix,
    publicHolderMode: ["masked", "full", "hidden"].includes(holderMode) ? holderMode as PublicHolderMode : base.publicHolderMode
  };
}

export function credentialTemplateLabel(key: CredentialTemplateKey) {
  return ({ charity_contribution: "公益贡献凭证", charity_ambassador: "公益大使证书", volunteer_service: "志愿服务证书", city_builder: "城市共建证书", course_completion: "课程结业证书" })[key];
}
