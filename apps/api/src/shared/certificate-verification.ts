type CertificateVerificationSource = {
  certificateNo?: string | null;
  name?: string | null;
  templateKey?: string | null;
  holderName?: string | null;
  serviceHours?: string | number | null;
  level?: string | null;
  threshold?: number | null;
  status?: string | null;
  issuedAt?: Date | string | null;
  revokedAt?: Date | string | null;
  businessSnapshot?: Record<string, unknown> | null;
};

export function maskCertificateHolderName(value: unknown) {
  const name = String(value || "").trim();
  if (!name) return null;
  if (name.length === 1) return "*";
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}`;
}

export function certificateVerificationView(certificate: CertificateVerificationSource, fallbackHolderName?: unknown) {
  const active = certificate.status !== "revoked";
  const snapshot = certificate.businessSnapshot || {};
  const course = active && certificate.templateKey === "course_completion"
    ? {
        title: String(snapshot.courseTitle || "").trim() || null,
        issuerName: String(snapshot.issuerName || "").trim() || null,
        completionProgress: Number.isFinite(Number(snapshot.completionProgress)) ? Number(snapshot.completionProgress) : null,
        requireAssessmentPass: snapshot.requireAssessmentPass === true
      }
    : null;
  return {
    certificateNo: certificate.certificateNo || null,
    name: certificate.name || null,
    templateKey: certificate.templateKey || null,
    holderName: active ? maskCertificateHolderName(certificate.holderName || fallbackHolderName) : null,
    serviceHours: Number(certificate.serviceHours || 0),
    level: certificate.level || null,
    threshold: certificate.threshold ?? null,
    status: active ? "active" : "revoked",
    issuedAt: certificate.issuedAt || null,
    revokedAt: certificate.revokedAt || null,
    course,
    verify: { valid: active, revoked: !active }
  };
}
