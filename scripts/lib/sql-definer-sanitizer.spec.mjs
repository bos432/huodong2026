import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { createSqlDefinerSanitizer } from "./sql-definer-sanitizer.mjs";

async function sanitize(chunks) {
  const output = [];
  for await (const chunk of Readable.from(chunks).pipe(createSqlDefinerSanitizer())) output.push(chunk);
  return Buffer.concat(output).toString("utf8");
}

test("removes a mysqldump definer while preserving the trigger", async () => {
  const sql = "/*!50003 CREATE*/ /*!50017 DEFINER=`activity`@`%`*/ /*!50003 TRIGGER `audit` BEFORE INSERT ON `rows` FOR EACH ROW SET NEW.id = 1 */;;\n";
  assert.equal(
    await sanitize([sql]),
    "/*!50003 CREATE*/  /*!50003 TRIGGER `audit` BEFORE INSERT ON `rows` FOR EACH ROW SET NEW.id = 1 */;;\n"
  );
});

test("removes a definer split across stream chunks", async () => {
  const chunks = ["CREATE /*!50017 DE", "FINER=`legacy`@`localhost`", "*/ TRIGGER x;\nSELECT 1;\n"];
  assert.equal(await sanitize(chunks), "CREATE  TRIGGER x;\nSELECT 1;\n");
});

test("rejects a truncated definer clause", async () => {
  await assert.rejects(sanitize(["CREATE /*!50017 DEFINER=`activity`@`%`"]), /Malformed mysqldump DEFINER clause/);
});
