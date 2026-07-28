export type MemberOrderSnapshot = {
  contextKey: string;
  registrations: any[];
  courses: any[];
  courseOrders: any[];
  warning: string;
  loadedAt: number;
};

const MAX_AGE_MS = 60_000;
let snapshot: MemberOrderSnapshot | null = null;

export function readMemberOrderSnapshot(contextKey: string) {
  if (!snapshot || snapshot.contextKey !== contextKey) return null;
  if (Date.now() - snapshot.loadedAt > MAX_AGE_MS) return null;
  return snapshot;
}

export function writeMemberOrderSnapshot(value: Omit<MemberOrderSnapshot, "loadedAt">) {
  snapshot = {
    ...value,
    registrations: [...value.registrations],
    courses: [...value.courses],
    courseOrders: [...value.courseOrders],
    loadedAt: Date.now()
  };
}

export function clearMemberOrderSnapshot(contextKey?: string) {
  if (!contextKey || snapshot?.contextKey === contextKey) snapshot = null;
}
