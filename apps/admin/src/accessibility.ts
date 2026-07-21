function compactText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tableContext(table: HTMLElement) {
  const dialog = table.closest<HTMLElement>('[role="dialog"][aria-label]');
  const dialogLabel = compactText(dialog?.getAttribute("aria-label"));
  if (dialogLabel) return dialogLabel;

  const scope = table.closest<HTMLElement>(".table-card, .el-card, .el-tab-pane, section");
  const scopedHeading = compactText(scope?.querySelector<HTMLElement>("h2, h3, h4, .el-card__header")?.textContent);
  if (scopedHeading) return scopedHeading;

  const pageHeading = compactText(document.querySelector<HTMLElement>("main h2")?.textContent);
  return pageHeading || "后台数据";
}

export function labelAdminTables() {
  const tables = [...document.querySelectorAll<HTMLElement>(".el-table")];
  const groups = new Map<string, HTMLElement[]>();
  for (const table of tables) {
    if (table.hasAttribute("aria-label") && table.dataset.autoAriaLabel !== "true") continue;
    const context = tableContext(table);
    groups.set(context, [...(groups.get(context) || []), table]);
  }
  for (const [context, rows] of groups) {
    rows.forEach((table, index) => {
      table.setAttribute("aria-label", `${context}数据表${rows.length > 1 ? ` ${index + 1}` : ""}`);
      table.dataset.autoAriaLabel = "true";
    });
  }
}

export function observeAdminTables() {
  labelAdminTables();
  const observer = new MutationObserver(() => labelAdminTables());
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
