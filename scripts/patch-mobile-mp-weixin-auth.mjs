import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configuredDist = process.env.MP_WEIXIN_DIST || "apps/mobile/dist/build/mp-weixin";
const projectPath = isAbsolute(configuredDist) ? resolve(configuredDist) : resolve(repoRoot, configuredDist);
const appJsonPath = join(projectPath, "app.json");
const appMiniappPath = join(projectPath, "app.miniapp.json");

function readJson(file, fallback = {}) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${file} JSON parse failed: ${error?.message || error}`);
  }
}

function writeJsonIfChanged(file, before, next) {
  const beforeText = before === undefined ? "" : `${JSON.stringify(before, null, 2)}\n`;
  const nextText = `${JSON.stringify(next, null, 2)}\n`;
  if (beforeText !== nextText) writeFileSync(file, nextText, "utf8");
}

function objectValue(record, key) {
  const value = record[key];
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  const next = {};
  record[key] = next;
  return next;
}

function authorizeType() {
  const value = Number(process.env.WECHAT_MINIAPP_AUTHORIZE_TYPE ?? 1);
  return [0, 1, 2].includes(value) ? value : 1;
}

function adaptWxLogin() {
  return String(process.env.WECHAT_MINIAPP_ADAPT_WX_LOGIN || "false").toLowerCase() === "true";
}

if (!existsSync(appJsonPath)) {
  throw new Error(`mp-weixin app.json not found: ${appJsonPath}. Run npm --prefix apps/mobile run build:mp-weixin first.`);
}

const appJsonBefore = readJson(appJsonPath);
const appJson = structuredClone(appJsonBefore);
objectValue(appJson, "miniApp").useAuthorizePage = true;
writeJsonIfChanged(appJsonPath, appJsonBefore, appJson);

const appMiniappBefore = existsSync(appMiniappPath) ? readJson(appMiniappPath) : undefined;
const appMiniapp = structuredClone(appMiniappBefore || {});
const identity = objectValue(appMiniapp, "identityServiceConfig");
identity.authorizeMiniprogramType = authorizeType();
identity.miniprogramLoginPath = String(process.env.WECHAT_MINIAPP_LOGIN_PATH || "__default__");
identity.adaptWxLogin = adaptWxLogin();
writeJsonIfChanged(appMiniappPath, appMiniappBefore, appMiniapp);

console.log("Patched mp-weixin auth config:");
console.log(`- ${appJsonPath}: miniApp.useAuthorizePage=true`);
console.log(`- ${appMiniappPath}: authorizeMiniprogramType=${identity.authorizeMiniprogramType}, adaptWxLogin=${identity.adaptWxLogin}`);
