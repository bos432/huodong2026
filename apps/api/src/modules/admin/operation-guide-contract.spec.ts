import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function entityTableNames() {
  const dir = path.join(repoRoot, "apps/api/src/entities");
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".entity.ts"))
    .flatMap((file) => {
      const source = fs.readFileSync(path.join(dir, file), "utf8");
      const match = source.match(/@Entity\(["']([^"']+)["']\)/);
      return match ? [match[1]] : [];
    })
    .sort();
}

function generatedTableNames() {
  return [...read("apps/admin/src/generated/database-table-catalog.ts").matchAll(/"name": "([^"]+)"/g)].map((match) => match[1]).sort();
}

describe("operation guide contract", () => {
  it("keeps the generated database catalog synchronized with every API entity", () => {
    const generated = read("apps/admin/src/generated/database-table-catalog.ts");
    const allowedAbbreviations = new Set(["H5", "SKU"]);
    const unexpectedEnglish = [...generated.matchAll(/"meaning": "([^"]+)"/g)]
      .flatMap((match) => match[1].match(/[A-Z][A-Z0-9]*/g) || [])
      .filter((token) => !allowedAbbreviations.has(token));

    expect(generatedTableNames()).toEqual(entityTableNames());
    expect(generatedTableNames().length).toBeGreaterThan(190);
    expect(unexpectedEnglish).toEqual([]);
    expect(generated).toContain('"meaning": "商城地址相关业务数据。"');
    expect(generated).toContain('"meaning": "资金风险告警相关业务数据。"');
    expect(generated).toContain('"meaning": "广告主相关业务数据。"');
    expect(generated).toContain('"meaning": "首页发布相关业务数据。"');
  });

  it("allows system viewers to read while keeping command copy managed", () => {
    const router = read("apps/admin/src/router.ts");
    const menu = read("apps/admin/src/navigation/admin-menu.ts");
    const page = read("apps/admin/src/views/OperationGuide.vue");

    expect(router).toContain('{ path: "operation-guide", component: OperationGuide, meta: { roles: ["system.view"], scope: "platform" } }');
    expect(menu).toContain('{ index: "/operation-guide", icon: "Guide", label: "运维教程", roles: ["system.view"], scope: "platform" }');
    expect(page).toContain('const canCopyCommands = computed(() => canAccess(["system.manage"]))');
    expect(page).toContain('v-if="!canCopyCommands"');
    expect(page).toContain('v-if="canCopyCommands"');
  });

  it("guards high-risk copies and preserves the active section per account", () => {
    const page = read("apps/admin/src/views/OperationGuide.vue");
    const clipboard = read("apps/admin/src/h5-preview.ts");

    expect(page).toContain("risk?: \"high\"");
    expect(page).toContain('block.risk === "high"');
    expect(page).toContain('.then(() => true).catch(() => false)');
    expect(page).toContain("if (!confirmed) return");
    expect(page).toContain("guideStateKey");
    expect(page).toContain("watch(activeSection");
    expect(page).toContain('import { copyToClipboard } from "../h5-preview"');
    expect(page).toContain("await copyToClipboard(commandText(block))");
    expect(clipboard).toContain("textarea.focus()");
    expect(clipboard).toContain("textarea.setSelectionRange(0, textarea.value.length)");
    expect(clipboard).toContain('document.execCommand("copy")');
    expect(clipboard).toContain('if (!copied) throw new Error("Clipboard copy failed")');
  });

  it("keeps deployed H5 previews on the active web origin", () => {
    const preview = read("apps/admin/src/h5-preview.ts");

    expect(preview).toContain('String(import.meta.env.VITE_H5_ORIGIN || "").trim()');
    expect(preview).toContain('port === "5174"');
    expect(preview).toContain('`${protocol}//${hostname}:5173`');
    expect(preview).toContain("return origin;");
    expect(preview).not.toContain(":5273");
  });

  it("uses the verified PM2 path and exposes database search", () => {
    const page = read("apps/admin/src/views/OperationGuide.vue");

    expect(page).toContain("/www/server/nodejs/v22.22.3/lib/node_modules/pm2/bin/pm2");
    expect(page).not.toContain("/www/server/nodejs/v22.22.3/bin/pm2");
    expect(page).toContain("filteredDatabaseTables");
    expect(page).toContain('placeholder="搜索表名、业务或注意事项"');
    expect(page).toContain("generatedDatabaseTables");
    expect(page).toContain(".page > * { min-width: 0; }");
    expect(page).toContain(":deep(.guide-tabs .el-tabs__content)");
    expect(page).toContain("@media (max-width: 640px)");
    expect(page).toContain(".database-filters { grid-template-columns: minmax(0, 1fr); }");
  });
});
