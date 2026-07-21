import fs from "node:fs";
import path from "node:path";

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const read = (file) => fs.readFileSync(file, "utf8");
const page = read("apps/admin/src/views/OperationGuide.vue");
const router = read("apps/admin/src/router.ts");
const menu = read("apps/admin/src/navigation/admin-menu.ts");
const clipboard = read("apps/admin/src/h5-preview.ts");
const adminPackage = JSON.parse(read("apps/admin/package.json"));
const generated = read("apps/admin/src/generated/database-table-catalog.ts");

check(adminPackage.scripts?.prebuild?.includes("generate-operation-guide-catalog.mjs"), "admin prebuild must regenerate the operation guide database catalog.");
check(router.includes('{ path: "operation-guide", component: OperationGuide, meta: { roles: ["system.view"], scope: "platform" } }'), "operation guide route must allow system viewers.");
check(menu.includes('{ index: "/operation-guide", icon: "Guide", label: "运维教程", roles: ["system.view"], scope: "platform" }'), "operation guide menu must allow system viewers.");
for (const value of ["canCopyCommands", "system.manage", "copyingTitle", "block.risk", ".catch(() => false)", "filteredDatabaseTables", "guideStateKey"]) {
  check(page.includes(value), `operation guide missing ${value}.`);
}
for (const value of [".page > * { min-width: 0; }", ":deep(.guide-tabs .el-tabs__content)", "@media (max-width: 640px)", ".database-filters { grid-template-columns: minmax(0, 1fr); }"])
  check(page.includes(value), `operation guide responsive layout missing ${value}.`);
check(page.includes('import { copyToClipboard } from "../h5-preview"'), "operation guide must use the shared clipboard fallback.");
check(page.includes("await copyToClipboard(commandText(block))"), "operation guide command copy must use the shared clipboard fallback.");
for (const value of ['catch {', "textarea.focus()", "textarea.setSelectionRange(0, textarea.value.length)", 'document.execCommand("copy")', 'if (!copied) throw new Error("Clipboard copy failed")'])
  check(clipboard.includes(value), `shared clipboard fallback missing ${value}.`);
check(page.includes("/www/server/nodejs/v22.22.3/lib/node_modules/pm2/bin/pm2"), "operation guide must use the verified PM2 binary path.");
check(!page.includes("/www/server/nodejs/v22.22.3/bin/pm2"), "operation guide still contains the invalid PM2 binary path.");
const generatedNames = [...generated.matchAll(/"name": "([^"]+)"/g)].map((match) => match[1]).sort();
const allowedCatalogAbbreviations = new Set(["H5", "SKU"]);
const unexpectedCatalogEnglish = [...generated.matchAll(/"meaning": "([^"]+)"/g)]
  .flatMap((match) => match[1].match(/[A-Z][A-Z0-9]*/g) || [])
  .filter((token) => !allowedCatalogAbbreviations.has(token));
const entityNames = fs.readdirSync("apps/api/src/entities")
  .filter((file) => file.endsWith(".entity.ts"))
  .flatMap((file) => {
    const match = read(path.join("apps/api/src/entities", file)).match(/@Entity\(["']([^"']+)["']\)/);
    return match ? [match[1]] : [];
  })
  .sort();
check(JSON.stringify(generatedNames) === JSON.stringify(entityNames), `operation guide database catalog mismatch: generated=${generatedNames.length}, entities=${entityNames.length}.`);
check(unexpectedCatalogEnglish.length === 0, `operation guide database catalog contains untranslated tokens: ${[...new Set(unexpectedCatalogEnglish)].join(", ")}.`);
for (const expectedMeaning of ["商城地址相关业务数据。", "资金风险告警相关业务数据。", "广告主相关业务数据。", "首页发布相关业务数据。"])
  check(generated.includes(`"meaning": "${expectedMeaning}"`), `operation guide database catalog missing natural label: ${expectedMeaning}`);

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`OK   operation guide guard covers permissions, high-risk copy confirmation, PM2 path and ${generatedNames.length} entity tables.`);
}
