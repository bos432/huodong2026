export type FixtureInput = {
  kind: string;
  label: string;
  maskedIdentifier: string;
  status?: string;
  notes?: string;
};

const STATUSES = new Set(["planned", "ready", "passed", "failed"]);

export function normalizeFixtureInput(body: Record<string, unknown>): Required<FixtureInput> {
  const kind = text(body.kind, 32);
  const label = text(body.label, 160);
  const maskedIdentifier = text(body.maskedIdentifier, 160);
  if (!kind || !label || !maskedIdentifier) throw new Error("测试夹具需要类型、名称和脱敏标识");
  if (!maskedIdentifier.includes("*") || /^\d+$/.test(maskedIdentifier)) throw new Error("测试夹具只能填写脱敏标识");
  const status = text(body.status, 24) || "planned";
  if (!STATUSES.has(status)) throw new Error("测试夹具状态无效");
  return { kind, label, maskedIdentifier, status, notes: text(body.notes, 500) };
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
