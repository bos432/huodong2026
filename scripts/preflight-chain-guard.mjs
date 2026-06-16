import fs from "node:fs";

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const scripts = packageJson.scripts || {};
const preflight = scripts.preflight || "";
const preflightGuards = scripts["test:preflight-guards"] || "";
const guardFiles = fs
  .readdirSync("scripts")
  .filter((file) => /^preflight-.+-guard\.mjs$/.test(file))
  .sort();
const guardCommands = preflightGuards.match(/node scripts\/preflight-[\w-]+-guard\.mjs/g) || [];

check(preflight.includes("npm run test:preflight-guards"), "package.json preflight must run test:preflight-guards before the release preflight.");
check(preflight.includes("node scripts/preflight.mjs"), "package.json preflight must still run scripts/preflight.mjs.");
check(
  preflight.indexOf("npm run test:preflight-guards") < preflight.indexOf("node scripts/preflight.mjs"),
  "package.json preflight must run guards before scripts/preflight.mjs."
);
check(
  preflightGuards.startsWith("node scripts/preflight-chain-guard.mjs"),
  "package.json test:preflight-guards must run the chain guard first."
);

for (const file of guardFiles) {
  check(
    preflightGuards.includes(`node scripts/${file}`),
    `package.json test:preflight-guards must run ${file}.`
  );
}

for (const command of guardCommands) {
  const file = command.replace("node scripts/", "");
  check(guardFiles.includes(file), `package.json test:preflight-guards references missing guard file: ${file}.`);
}

check(
  guardCommands.length === guardFiles.length,
  "package.json test:preflight-guards must include each preflight guard exactly once."
);

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight chain guard covers package scripts.");
}
