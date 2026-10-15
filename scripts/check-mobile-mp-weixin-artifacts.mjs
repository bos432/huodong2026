import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

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

const appConfig = JSON.parse(fs.readFileSync(path.join(output, "app.json"), "utf8"));
const subpackageRoots = (appConfig.subPackages || appConfig.subpackages || [])
  .map((pack) => `${pack.root.replace(/\/$/, "")}/`);
function mainPackageBytes(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const filename = path.join(directory, entry.name);
    const relative = path.relative(output, filename).split(path.sep).join("/");
    if (subpackageRoots.some((root) => `${relative}/`.startsWith(root))) return total;
    return total + (entry.isDirectory() ? mainPackageBytes(filename) : fs.statSync(filename).size);
  }, 0);
}
const mainBytes = mainPackageBytes(output);
if (mainBytes > 2 * 1024 * 1024) {
  throw new Error(`mp-weixin main package exceeds 2 MiB: ${mainBytes} bytes`);
}
console.log(`mp-weixin main package: ${mainBytes} bytes / 2097152`);

// Inspect the effective export, not the fallback string also present in the bundle.
const apiModule = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.join(output, "api-base.js"), "utf8"),
  { exports: apiModule.exports, module: apiModule }, { timeout: 1000 });
const apiUrl = new URL(apiModule.exports.API_BASE);
if (apiUrl.protocol !== "https:" || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash
  || apiUrl.hostname === "localhost" || /^[\d.]+$/.test(apiUrl.hostname) || apiUrl.hostname.includes(":")) {
  throw new Error("mp-weixin requires a public HTTPS API domain; refusing to upload this build");
}
console.log(`mp-weixin request domain: ${apiUrl.origin}`);

const retiredArtifacts = ["shanghai-date.js"];
const stale = retiredArtifacts.filter((file) => fs.existsSync(path.join(output, file)));
if (stale.length) {
  console.error(`mp-weixin output contains stale retired artifacts: ${stale.join(", ")}`);
  process.exit(1);
}

const missing = [];
const crossPackage = [];
function packageOwner(filename) {
  const relative = path.relative(output, filename).split(path.sep).join("/");
  return subpackageRoots.find((root) => relative.startsWith(root)) || "";
}
for (const file of filesAt(output)) {
  const content = fs.readFileSync(file, "utf8");
  for (const match of content.matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
    const request = match[1];
    const target = path.resolve(path.dirname(file), request.endsWith(".js") ? request : `${request}.js`);
    if (!fs.existsSync(target)) missing.push(`${path.relative(output, file)} -> ${request}`);
    const targetPackage = packageOwner(target);
    if (targetPackage && targetPackage !== packageOwner(file)) {
      crossPackage.push(`${path.relative(output, file)} -> ${request}`);
    }
  }
}

if (crossPackage.length) {
  console.error("mp-weixin synchronous dependency crosses subpackage boundary:\n" + crossPackage.join("\n"));
  process.exit(1);
}

if (missing.length) {
  console.error("mp-weixin artifact dependency check failed:\n" + missing.join("\n"));
  process.exit(1);
}

checkComponentWxssSelectors();

console.log("mp-weixin artifact dependency check passed.");
