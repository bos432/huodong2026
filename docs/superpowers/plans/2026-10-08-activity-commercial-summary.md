# Activity Commercial Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add an auditable, read-only commercial summary to activity recap without changing existing order, payment, refund, tenant, or settlement behavior.

**Architecture:** Reuse the existing activity funnel as the canonical source for paid and refunded amounts. A small pure policy module calculates platform fee, organizer commission, net collection, and payable amount in fen. The existing recap API exposes the calculated summary and the existing Recaps page renders it with explicit test-data and configuration statuses.

**Tech Stack:** NestJS/TypeScript, TypeORM query services, Vitest, Vue 3, Element Plus.

**Spec:** `docs/项目分析报告-慢π-20261008.md`

## Global Constraints

- Preserve existing order, payment, refund, registration, tenant, and agent settlement behavior.
- Test activities and test users must not be counted as formal operating performance.
- Never expose secrets or infer a completed real settlement from a calculation preview.
- Keep tenant and analytics permission checks on the existing recap route.
- No mobile app changes, database migration, deployment, or external payment calls in this phase.

---

### Task 1: Add the commercial settlement policy

**Files:**
- Create: `apps/api/src/shared/activity-commercial-policy.ts`
- Create: `apps/api/src/shared/activity-commercial-policy.spec.ts`

**Interfaces:**
- `ActivityCommercialAmountInput`
- `ActivityCommercialAmounts`
- `calculateActivityCommercialAmounts(input): ActivityCommercialAmounts`
- `normalizeCommercialRateToBps(value, label): number`

- [x] **Step 1: Write failing tests** for integer-fen calculations, percentage/ratio normalization, invalid rates, negative refunds, and zero-data behavior.
- [x] **Step 2: Run the focused Vitest file** and confirm it fails because the module does not exist.
- [x] **Step 3: Implement the smallest pure calculation module** using the existing `settlementBpsAmountFen` rounding rule.
- [x] **Step 4: Run the focused tests** and confirm they pass.
- [x] **Step 5: Run the existing settlement policy tests** to verify no regression.

### Task 2: Enrich the activity recap response

**Files:**
- Modify: `apps/api/src/modules/v1/v1.service.ts`
- Create: `apps/api/src/modules/admin/activity-commercial-summary.spec.ts`

**Interfaces:**
- `activityRecap()` gains `commercialSummary` with `reportingScope`, `grossCollectedFen`, `refundFen`, `netCollectedFen`, `platformFeeFen`, `organizerCommissionFen`, `organizerPayableFen`, `platformFeeBps`, `organizerCommissionBps`, `settlementStatus`, and `settlementMessage`.

- [x] **Step 1: Write a source-level regression test** asserting the recap service calls the pure policy and returns an explicit test-scope status.
- [x] **Step 2: Run the test and confirm it fails.**
- [x] **Step 3: Implement a private recap helper** that reads only existing tenant/agent configuration, calculates the summary from `funnel.grossAmountFen` and `funnel.refundAmountFen`, and marks missing configuration as not ready.
- [x] **Step 4: Add the summary to both live and historical snapshots** without changing existing fields.
- [x] **Step 5: Run the focused API tests and build.**

### Task 3: Render the commercial summary in the admin recap

**Files:**
- Modify: `apps/admin/src/views/Recaps.vue`
- Modify: `apps/api/src/modules/admin/menu-integrity.spec.ts` only if an existing integrity assertion needs the new section.

- [x] **Step 1: Add a failing source-level UI assertion** for the commercial summary labels and test-scope warning.
- [x] **Step 2: Run the assertion and confirm it fails.**
- [x] **Step 3: Add a compact commercial summary section** showing gross, refunds, net, platform fee, organizer payable, and status; label test scope and do not present the preview as paid settlement.
- [x] **Step 4: Run the admin type-check/build.**

### Task 4: Verify and document

**Files:**
- Modify: `docs/任务执行记录.md`
- Modify: `docs/项目分析报告-慢π-20261008.md` only if the current-state section needs an update.

- [x] **Step 1: Run focused API tests, full API build, admin build, and `git diff --check`.**
- [x] **Step 2: Inspect the diff and confirm only the scoped files changed.**
- [x] **Step 3: Record the exact commands, results, and remaining external blockers.**
- [x] **Step 4: Do not deploy until external payment, refund, notification, and real-device evidence exists.**
