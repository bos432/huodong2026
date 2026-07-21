import fs from "node:fs";
import path from "node:path";
import { API_BASE, auth, loginPlatformAdmin } from "./online-showcase-lib.mjs";

const confirmed = process.env.ACCEPTANCE_DEAD_LETTER_ARCHIVE_CONFIRM === "true";
const output = path.resolve(
  process.env.ACCEPTANCE_DEAD_LETTER_ARCHIVE_RESULT ||
    path.join(".local-logs", `acceptance-dead-letter-archive-${Date.now()}`, "result.json")
);

async function request(route, token, options = {}) {
  const response = await fetch(`${API_BASE}${route}`, {
    ...options,
    headers: { ...(token ? auth(token) : {}), ...(options.headers || {}) }
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok || payload?.code !== 0) {
    throw new Error(`${options.method || "GET"} ${route} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

async function listDeadLetters(token) {
  const items = [];
  let page = 1;
  while (true) {
    const result = await request(`/admin/business-jobs?status=dead_letter&page=${page}&pageSize=100`, token);
    items.push(...result.items);
    if (items.length >= Number(result.total || 0)) return items;
    page += 1;
  }
}

function selectAcceptanceFixtures(rows) {
  const forcedFailureKeys = new Set(
    rows
      .filter(
        (row) =>
          row.type === "notification.deliver" &&
          /^notification:\d+$/.test(String(row.idempotencyKey || "")) &&
          /Mock provider forced failure/i.test(String(row.lastError || ""))
      )
      .map((row) => row.idempotencyKey)
  );
  return rows.filter(
    (row) =>
      String(row.type || "").startsWith("acceptance.") ||
      (row.type === "notification.deliver" && forcedFailureKeys.has(row.idempotencyKey))
  );
}

async function main() {
  const platform = await loginPlatformAdmin();
  const before = await listDeadLetters(platform.token);
  const candidates = selectAcceptanceFixtures(before);
  const result = {
    status: confirmed ? "running" : "dry_run",
    confirmed,
    checkedAt: new Date().toISOString(),
    beforeCount: before.length,
    candidateCount: candidates.length,
    candidates: candidates.map((row) => ({
      id: Number(row.id),
      tenantId: Number(row.tenantId),
      type: row.type,
      idempotencyKey: row.idempotencyKey,
      lastError: row.lastError
    })),
    archived: []
  };

  if (confirmed) {
    for (const row of candidates) {
      const archived = await request(`/admin/business-jobs/${row.id}/cancel`, platform.token, { method: "POST" });
      if (archived.status !== "cancelled") throw new Error(`Business job ${row.id} did not become cancelled`);
      result.archived.push({ id: Number(row.id), operationApplied: archived.operationApplied === true });
    }
    const after = await listDeadLetters(platform.token);
    const archivedIds = new Set(result.archived.map((row) => row.id));
    const stillActive = after.filter((row) => archivedIds.has(Number(row.id)));
    if (stillActive.length) throw new Error(`Archived jobs still in dead_letter: ${stillActive.map((row) => row.id).join(",")}`);
    result.status = "passed";
    result.afterCount = after.length;
    result.finishedAt = new Date().toISOString();
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ status: result.status, beforeCount: result.beforeCount, candidateCount: result.candidateCount, archivedCount: result.archived.length, afterCount: result.afterCount, resultFile: output }, null, 2));
  if (!confirmed && candidates.length) {
    console.log("Dry run only. Set ACCEPTANCE_DEAD_LETTER_ARCHIVE_CONFIRM=true to archive the listed acceptance fixtures.");
  }
}

main().catch((error) => {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify({ status: "failed", confirmed, error: error instanceof Error ? error.stack : String(error), finishedAt: new Date().toISOString() }, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
});
