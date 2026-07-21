import fs from "node:fs";
import path from "node:path";

const viewDirectory = path.resolve("apps/admin/src/views");
const failures = [];
const safeRenderHelpers = ["maskPhone(", "maskedPhone(", "displayPhone(", "attendeePhone(", "revealedPhones", "phoneMasked"];

function isSensitivePhoneProperty(property) {
  return /(^|\.)(phone|mobile)$/i.test(property) || /(^|\.)(contactPhone|receiverPhone)$/i.test(property);
}

for (const filename of fs.readdirSync(viewDirectory).filter((name) => name.endsWith(".vue"))) {
  const file = path.join(viewDirectory, filename);
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const match of line.matchAll(/<el-table-column\b[^>]*\bprop=(['"])([^'"]+)\1[^>]*>/g)) {
      if (isSensitivePhoneProperty(match[2])) {
        failures.push(`${path.relative(process.cwd(), file)}:${index + 1} directly renders sensitive phone property ${match[2]}.`);
      }
    }

    for (const match of line.matchAll(/{{([\s\S]*?)}}/g)) {
      const expression = match[1];
      const referencesSensitivePhone = /\b(?:row|item|currentOrder|drawerRow|selectedOrder|detail)(?:[\w?.[\]]*)\.(?:phone|mobile|contactPhone|receiverPhone)\b/i.test(expression);
      if (referencesSensitivePhone && !safeRenderHelpers.some((helper) => expression.includes(helper))) {
        failures.push(`${path.relative(process.cwd(), file)}:${index + 1} renders a phone field without an approved masking or reveal helper.`);
      }
    }
  });
}

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   admin privacy guard blocks direct personal phone rendering in table and template output.");
}
