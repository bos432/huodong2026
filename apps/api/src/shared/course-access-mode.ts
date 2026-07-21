export function memberCanAccessCourse(input: { accessMode?: string; requiredLevelSort?: number | null; memberLevelSort?: number | null; benefits?: Array<{ key?: string }> | null }) {
  if (input.accessMode !== "member") return false;
  if (input.benefits?.some((item) => item?.key === "course_access")) return true;
  const required = Number(input.requiredLevelSort || 0);
  const current = Number(input.memberLevelSort ?? -1);
  return current >= required;
}

export function normalizedCourseCompletionThreshold(value: unknown) {
  return Math.min(Math.max(Math.trunc(Number(value || 100)), 1), 100);
}
