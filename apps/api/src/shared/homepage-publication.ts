import { HomepageDecorationSnapshotRow } from "../entities/homepage-decoration-version.entity";

const publicSingletonTypes = new Set(["bottom_nav", "my_page", "inner_pages"]);

export function homepageSectionIsPublicCandidate(section: Pick<HomepageDecorationSnapshotRow, "type" | "enabled">) {
  return section.enabled !== false || publicSingletonTypes.has(section.type);
}

export function homepagePublicationScopeKey(tenantId?: number | null) {
  return tenantId ? `tenant:${tenantId}` : "platform";
}

export function cloneHomepageSnapshot(sections: HomepageDecorationSnapshotRow[]) {
  return sections.map((section) => ({
    ...section,
    config: { ...(section.config || {}) },
    layout: { ...(section.layout || {}) }
  }));
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonicalJson(item)]));
}

export function homepageSnapshotChanged(published: HomepageDecorationSnapshotRow[] | null | undefined, draft: HomepageDecorationSnapshotRow[]) {
  if (!published) return draft.length > 0;
  return JSON.stringify(canonicalJson(published)) !== JSON.stringify(canonicalJson(draft));
}
