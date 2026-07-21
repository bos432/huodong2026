import { createHash } from "crypto";

export type CharityContributionCertificateStatus = "active" | "adjusted" | "reversed";

export function isCharityContributionCertificateEligible(input: {
  certificateEligible?: boolean;
  direction?: string;
  type?: string;
  amountFen?: number | string;
}) {
  return Boolean(input.certificateEligible && input.direction === "credit" && input.type === "charity_accrual" && Number(input.amountFen || 0) > 0);
}

export function charityContributionCertificateNo(input: {
  id: number;
  idempotencyKey?: string | null;
  entryHash?: string | null;
  createdAt: Date | string;
}) {
  const date = new Date(input.createdAt);
  const datePart = Number.isNaN(date.getTime()) ? "00000000" : date.toISOString().slice(0, 10).replace(/-/g, "");
  const signature = createHash("sha256").update(`${input.id}:${input.idempotencyKey}:${input.entryHash || "legacy"}`).digest("hex").slice(0, 8).toUpperCase();
  return `MPCG${datePart}-${String(input.id).padStart(6, "0")}-${signature}`;
}

export function charityContributionCertificateStatus(originalFen: number, currentFen: number): CharityContributionCertificateStatus {
  if (currentFen <= 0) return "reversed";
  return currentFen < originalFen ? "adjusted" : "active";
}

export function maskCharityContributionHolder(value: string) {
  const text = String(value || "").trim();
  if (!text) return "公益参与者";
  if (/^1\d{10}$/.test(text)) return `${text.slice(0, 3)}****${text.slice(-4)}`;
  if (/^用户\d+$/u.test(text)) return "用户***";
  const characters = Array.from(text);
  if (characters.length === 1) return "*";
  if (characters.length === 2) return `${characters[0]}*`;
  return `${characters[0]}${"*".repeat(Math.min(characters.length - 2, 2))}${characters.at(-1)}`;
}
