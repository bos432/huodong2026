import assert from "node:assert/strict";
import fs from "node:fs";

const files = ["apps/admin/vite.config.ts", "apps/mobile/vite.config.ts"];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /process\.env\.VITE_DEV_API_PROXY/);
  assert.match(source, /https?:\/\/127\.0\.0\.1:3000/);
  assert.doesNotMatch(source, /https?:\/\/localhost:18080/);
}

console.log(`Dev proxy config passed for ${files.length} Vite configs.`);
