export type ActivityListStatus = "all" | "open" | "full" | "ended";

export type ActivityListFilters = {
  categoryId: number | "all";
  status: ActivityListStatus;
  keyword: string;
};

export function normalizeActivityListStatus(status: ActivityListStatus, archiveEnabled: boolean) {
  const archiveBlocked = status === "ended" && !archiveEnabled;
  return {
    status: archiveBlocked ? "all" as const : status,
    archiveBlocked
  };
}

export function resetActivityListFilters(_filters: ActivityListFilters): ActivityListFilters {
  return { categoryId: "all", status: "all", keyword: "" };
}
