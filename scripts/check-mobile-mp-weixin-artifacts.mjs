import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(root, process.env.MP_WEIXIN_DIST || "apps/mobile/dist/build/mp-weixin");

function filesAt(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesAt(fullPath);
    return entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

function vueFilesAt(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return vueFilesAt(fullPath);
    return entry.name.endsWith(".vue") ? [fullPath] : [];
  });
}

function checkComponentWxssSelectors() {
  const componentRoot = path.join(root, "apps", "mobile", "src", "components");
  const unsupported = [];
  const bareNativeSelector = /(^|[,>+~\s])(image|button|text)(?=[:\s,{.#\[])/gm;
  const attributeSelector = /\[(?:disabled|open-type|data-[\w-]+|aria-[\w-]+)\]/g;

  for (const file of vueFilesAt(componentRoot)) {
    const source = fs.readFileSync(file, "utf8");
    for (const style of source.matchAll(/<style\s+scoped[^>]*>([\s\S]*?)<\/style>/g)) {
      const css = style[1];
      for (const match of css.matchAll(bareNativeSelector)) {
        unsupported.push(`${path.relative(root, file)}: unsupported scoped WXSS tag selector '${match[2]}'`);
      }
      for (const match of css.matchAll(attributeSelector)) {
        unsupported.push(`${path.relative(root, file)}: unsupported scoped WXSS attribute selector '${match[0]}'`);
      }
    }
  }

  if (unsupported.length) {
    console.error("mp-weixin component WXSS compatibility check failed:\n" + unsupported.join("\n"));
    process.exit(1);
  }
}

if (!fs.existsSync(output)) throw new Error(`mp-weixin output does not exist: ${output}`);

const retiredArtifacts = ["shanghai-date.js"];
const stale = retiredArtifacts.filter((file) => fs.existsSync(path.join(output, file)));
if (stale.length) {
  console.error(`mp-weixin output contains stale retired artifacts: ${stale.join(", ")}`);
  process.exit(1);
}

const missing = [];
for (const file of filesAt(output)) {
  const content = fs.readFileSync(file, "utf8");
  for (const match of content.matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
    const request = match[1];
    const target = path.resolve(path.dirname(file), request.endsWith(".js") ? request : `${request}.js`);
    if (!fs.existsSync(target)) missing.push(`${path.relative(output, file)} -> ${request}`);
  }
}

if (missing.length) {
  console.error("mp-weixin artifact dependency check failed:\n" + missing.join("\n"));
  process.exit(1);
}

checkComponentWxssSelectors();

console.log("mp-weixin artifact dependency check passed.");
