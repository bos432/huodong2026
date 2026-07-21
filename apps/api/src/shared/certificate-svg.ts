import type { Certificate } from "../entities/certificate.entity";
import { CredentialTemplateConfig, defaultCredentialTemplate, normalizeCredentialTemplate } from "./credential-template";

export interface CertificateSvgInput {
  certificate: Pick<Certificate, "id" | "name" | "certificateNo" | "templateKey" | "serviceHours" | "threshold" | "status" | "issuedAt">;
  displayName: string;
  template?: CredentialTemplateConfig | null;
}

export function escapeCertificateSvg(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fitCertificateText(value: unknown, maxCharacters: number) {
  const characters = Array.from(String(value ?? "").trim());
  return characters.length <= maxCharacters ? characters.join("") : `${characters.slice(0, Math.max(maxCharacters - 1, 1)).join("")}…`;
}

function image(url: string | null, x: number, y: number, width: number, height: number, opacity = 1) {
  return url ? `<image href="${escapeCertificateSvg(url)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" opacity="${opacity}"/>` : "";
}

export function renderCertificateSvg({ certificate, displayName, template }: CertificateSvgInput) {
  const config = normalizeCredentialTemplate(certificate.templateKey, template || defaultCredentialTemplate(certificate.templateKey));
  const issuedAt = certificate.issuedAt ? new Date(certificate.issuedAt) : new Date();
  const issuedDate = Number.isNaN(issuedAt.getTime()) ? "" : issuedAt.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });
  const safeTitle = escapeCertificateSvg(fitCertificateText(certificate.name, 28));
  const safeName = escapeCertificateSvg(fitCertificateText(displayName || "获证人", 18));
  const safeDate = escapeCertificateSvg(issuedDate);
  const safeNo = escapeCertificateSvg(fitCertificateText(certificate.certificateNo || `MP-CERT-${certificate.id}`, 46));
  const safeHours = escapeCertificateSvg(Number(certificate.serviceHours || 0).toFixed(1));
  const revoked = certificate.status === "revoked";
  const safeStatus = revoked ? "已撤销" : "有效";
  const courseCertificate = certificate.templateKey === "course_completion";
  const detail = courseCertificate
    ? `${config.detailLabel}：${certificate.threshold || 100}% · 状态：${safeStatus}`
    : `${config.detailLabel}：${safeHours} 小时 · 状态：${safeStatus}`;
  const watermark = revoked ? '<text x="600" y="470" text-anchor="middle" fill="#b42318" fill-opacity="0.12" font-size="148" font-weight="800" transform="rotate(-18 600 470)">已撤销</text>' : "";
  const logo = config.logoUrl
    ? image(config.logoUrl, 552, 84, 96, 96)
    : `<circle cx="600" cy="132" r="42" fill="${config.primaryColor}"/><text x="600" y="147" text-anchor="middle" fill="#ffffff" font-size="30" font-weight="800">${escapeCertificateSvg(config.logoText)}</text>`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="840" viewBox="0 0 1200 840" style="max-width:100%;height:auto;display:block">
  <rect width="1200" height="840" fill="${config.backgroundColor}"/>
  ${image(config.backgroundImageUrl, 0, 0, 1200, 840, 0.22)}
  <rect x="46" y="46" width="1108" height="748" rx="18" fill="#ffffff" fill-opacity="0.94" stroke="${config.primaryColor}" stroke-width="8"/>
  <rect x="70" y="70" width="1060" height="700" rx="12" fill="none" stroke="${config.borderColor}" stroke-width="3"/>
  <path d="M108 116h180M912 116h180M108 752h180M912 752h180" stroke="${config.accentColor}" stroke-width="5"/>
  ${logo}
  <text x="600" y="242" text-anchor="middle" fill="${config.primaryColor}" font-size="58" font-weight="800">${escapeCertificateSvg(fitCertificateText(config.title, 18))}</text>
  <text x="600" y="302" text-anchor="middle" fill="${config.textColor}" font-size="23">${escapeCertificateSvg(fitCertificateText(config.englishTitle, 52))}</text>
  ${watermark}
  <text x="600" y="362" text-anchor="middle" fill="${config.textColor}" font-size="27">兹授予</text>
  <text x="600" y="438" text-anchor="middle" fill="#101828" font-size="52" font-weight="800">${safeName}</text>
  <text x="600" y="496" text-anchor="middle" fill="${config.textColor}" font-size="25">${escapeCertificateSvg(fitCertificateText(config.description, 38))}</text>
  <text x="600" y="552" text-anchor="middle" fill="${config.primaryColor}" font-size="34" font-weight="800">${safeTitle}</text>
  <text x="600" y="600" text-anchor="middle" fill="${config.textColor}" font-size="23">${escapeCertificateSvg(fitCertificateText(detail, 46))}</text>
  <text x="600" y="642" text-anchor="middle" fill="${config.accentColor}" font-size="20">${escapeCertificateSvg(fitCertificateText(config.statement, 54))}</text>
  <line x1="322" y1="672" x2="878" y2="672" stroke="${config.borderColor}" stroke-width="2"/>
  ${image(config.signatureUrl, 760, 620, 150, 70)}
  ${image(config.sealUrl, 920, 590, 120, 120, 0.9)}
  <text x="164" y="716" fill="${config.textColor}" font-size="21">发放日期：${safeDate}</text>
  <text x="1036" y="716" text-anchor="end" fill="${config.textColor}" font-size="21">证书编号：${safeNo}</text>
  <text x="600" y="752" text-anchor="middle" fill="${config.textColor}" font-size="20">发证单位：${escapeCertificateSvg(fitCertificateText(config.issuerName, 36))}</text>
</svg>`;
  const filenameBase = String(certificate.name || "certificate").replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "_").trim().slice(0, 80) || "certificate";
  return { filename: `${filenameBase}.svg`, svg };
}

export interface CharityContributionSvgInput {
  certificateNo: string;
  holderName: string;
  contributionAmount: number;
  sourceTitle: string;
  orderNo?: string | null;
  issuedAt: Date | string;
  status: "active" | "adjusted" | "reversed";
  template?: CredentialTemplateConfig | null;
}

export function renderCharityContributionSvg(input: CharityContributionSvgInput) {
  const config = normalizeCredentialTemplate("charity_contribution", input.template || defaultCredentialTemplate("charity_contribution"));
  const issuedAt = new Date(input.issuedAt);
  const issuedDate = Number.isNaN(issuedAt.getTime()) ? "" : issuedAt.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });
  const statusText = input.status === "reversed" ? "已冲正" : input.status === "adjusted" ? "已调整" : "有效";
  const holderName = escapeCertificateSvg(fitCertificateText(input.holderName || "公益参与者", 18));
  const sourceTitle = escapeCertificateSvg(fitCertificateText(input.sourceTitle || "公益金计划", 30));
  const orderNo = input.orderNo ? escapeCertificateSvg(fitCertificateText(input.orderNo, 34)) : "";
  const certificateNo = escapeCertificateSvg(fitCertificateText(input.certificateNo, 46));
  const watermark = input.status === "reversed" ? '<text x="600" y="500" text-anchor="middle" fill="#b42318" fill-opacity="0.08" font-size="126" font-weight="800" transform="rotate(-16 600 500)">已冲正</text>' : "";
  const logo = config.logoUrl
    ? image(config.logoUrl, 552, 84, 96, 96)
    : `<circle cx="600" cy="132" r="42" fill="${config.primaryColor}"/><text x="600" y="147" text-anchor="middle" fill="#ffffff" font-size="30" font-weight="800">${escapeCertificateSvg(config.logoText)}</text>`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="840" viewBox="0 0 1200 840" style="max-width:100%;height:auto;display:block">
  <rect width="1200" height="840" fill="${config.backgroundColor}"/>
  ${image(config.backgroundImageUrl, 0, 0, 1200, 840, 0.22)}
  <rect x="46" y="46" width="1108" height="748" rx="18" fill="#ffffff" fill-opacity="0.94" stroke="${config.primaryColor}" stroke-width="8"/>
  <rect x="70" y="70" width="1060" height="700" rx="12" fill="none" stroke="${config.borderColor}" stroke-width="3"/>
  <path d="M108 116h180M912 116h180M108 752h180M912 752h180" stroke="${config.accentColor}" stroke-width="5"/>
  ${logo}
  <text x="600" y="242" text-anchor="middle" fill="${config.primaryColor}" font-size="58" font-weight="800">${escapeCertificateSvg(fitCertificateText(config.title, 18))}</text>
  <text x="600" y="302" text-anchor="middle" fill="${config.textColor}" font-size="23">${escapeCertificateSvg(fitCertificateText(config.englishTitle, 52))}</text>
  ${watermark}
  <text x="600" y="358" text-anchor="middle" fill="${config.textColor}" font-size="27">记录</text>
  <text x="600" y="430" text-anchor="middle" fill="#101828" font-size="50" font-weight="800">${holderName}</text>
  <text x="600" y="486" text-anchor="middle" fill="${config.textColor}" font-size="25">${escapeCertificateSvg(fitCertificateText(config.description, 38))}</text>
  <text x="600" y="544" text-anchor="middle" fill="${config.primaryColor}" font-size="36" font-weight="800">${escapeCertificateSvg(config.detailLabel)} ¥${escapeCertificateSvg(input.contributionAmount.toFixed(2))}</text>
  <text x="600" y="590" text-anchor="middle" fill="${config.textColor}" font-size="22">${sourceTitle} · 状态：${statusText}</text>
  <text x="600" y="632" text-anchor="middle" fill="${config.accentColor}" font-size="19">${escapeCertificateSvg(fitCertificateText(config.statement, 58))}</text>
  ${image(config.signatureUrl, 760, 620, 150, 70)}
  ${image(config.sealUrl, 920, 590, 120, 120, 0.9)}
  <text x="164" y="684" fill="${config.textColor}" font-size="20">日期：${escapeCertificateSvg(issuedDate)}</text>
  ${orderNo ? `<text x="1036" y="684" text-anchor="end" fill="${config.textColor}" font-size="20">订单：${orderNo}</text>` : ""}
  <text x="600" y="724" text-anchor="middle" fill="${config.textColor}" font-size="19">凭证编号：${certificateNo}</text>
  <text x="600" y="754" text-anchor="middle" fill="${config.textColor}" font-size="19">发证单位：${escapeCertificateSvg(fitCertificateText(config.issuerName, 36))}</text>
</svg>`;
  return { filename: `公益贡献凭证-${input.certificateNo}.svg`, svg };
}
