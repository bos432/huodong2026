export type PublicActivityMediaInput = {
  coverUrl?: string | null;
  sections?: Array<{ imageUrl?: string | null }> | null;
};

export type PublicAttendeeInput = {
  id: number;
  nickname?: string | null;
  avatarUrl?: string | null;
  checkedIn?: boolean;
};

export function buildPublicActivityGallery(input: PublicActivityMediaInput) {
  const values = [input.coverUrl, ...(input.sections || []).map((section) => section.imageUrl)];
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].slice(0, 12);
}

export function toPublicAttendee(input: PublicAttendeeInput) {
  return {
    id: input.id,
    name: input.nickname?.trim() || "参与者",
    avatarUrl: input.avatarUrl || null,
    checkedIn: Boolean(input.checkedIn)
  };
}
