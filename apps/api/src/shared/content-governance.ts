type KeywordRule = {
  keyword: string;
  matchMode: "contains" | "exact";
  action: "review" | "reject" | "mask";
  replacement?: string | null;
};

export function screenGovernedContent(input: string, rules: KeywordRule[]) {
  let text = input;
  let requiresReview = false;
  const matches: string[] = [];
  for (const rule of rules) {
    const keyword = String(rule.keyword || "").trim();
    if (!keyword) continue;
    const matched = rule.matchMode === "exact" ? text.trim() === keyword : text.toLowerCase().includes(keyword.toLowerCase());
    if (!matched) continue;
    matches.push(keyword);
    if (rule.action === "reject") return { text, requiresReview: false, rejected: true, matches };
    if (rule.action === "review") requiresReview = true;
    if (rule.action === "mask") {
      const replacement = rule.replacement || "*".repeat(Math.min(keyword.length, 12));
      text = text.replace(new RegExp(escapeRegExp(keyword), "gi"), replacement);
    }
  }
  return { text, requiresReview, rejected: false, matches };
}

export function sanctionApplies(input: { status: string; scope: string; startsAt: Date; endsAt?: Date | null }, scope: "community" | "forum", now = new Date()) {
  return input.status === "active" && (input.scope === "all" || input.scope === scope) && input.startsAt.getTime() <= now.getTime() && (!input.endsAt || input.endsAt.getTime() > now.getTime());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
