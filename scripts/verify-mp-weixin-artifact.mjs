import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const artifactRoot = path.resolve(root, "apps/mobile/dist/build/mp-weixin");
const forbidden = /\b(window|document|ScrollTrigger)\b/;
const ignored = new Set([path.join("common", "vendor.js")]);

if (!fs.existsSync(artifactRoot)) {
  console.error(`ERR mp-weixin artifact is missing: ${artifactRoot}`);
  process.exit(1);
}

const matches = [];
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(filename);
    else if (/\.(?:js|wxml|json)$/.test(entry.name) && !ignored.has(path.relative(artifactRoot, filename))) {
      const source = fs.readFileSync(filename, "utf8");
      if (forbidden.test(source)) matches.push(path.relative(root, filename));
    }
  }
}
visit(artifactRoot);

if (matches.length) {
  for (const filename of matches) console.error(`ERR browser-only token leaked into mp-weixin artifact: ${filename}`);
  process.exit(1);
}

console.log("OK   mp-weixin artifact has no project-level window/document/ScrollTrigger dependency.");
