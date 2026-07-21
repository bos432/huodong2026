export function courseAvailableToUser(status: string, owned: boolean) {
  return status === "published" || owned;
}

export function protectedCourseLesson<T extends Record<string, any>>(lesson: T, canAccess: boolean) {
  if (canAccess) return { ...lesson, locked: false };
  return { ...lesson, videoUrl: null, audioUrl: null, attachmentUrl: null, attachmentName: null, content: null, locked: true };
}
