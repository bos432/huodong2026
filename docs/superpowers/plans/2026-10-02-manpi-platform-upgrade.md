# 慢π全平台 UI 与产品升级实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有业务、API、数据库、多租户和生产兼容性的前提下，完成慢π用户端、管理后台、API、Worker、真实外部能力和灰度发布的可验证升级。

**Architecture:** 采用模块化单体渐进重构。保留现有 Controller、页面路由和数据库实体作为兼容边界，按活动、报名、订单、通知、会员、社区和分析逐步拆分内部服务；异步通知、订单生命周期、退款同步、会员召回和活动结束运营由独立 `activity-worker` 承担。

**Tech Stack:** Vue 3、uni-app、Element Plus、NestJS、TypeORM、MySQL、GSAP（仅 H5/后台安全使用）、微信开发者工具、PM2/Nginx。

**Spec:** `docs/superpowers/specs/2026-10-02-manpi-platform-upgrade-design.md`

## Global Constraints

- 以“发现活动 → 报名 → 支付 → 参加 → 签到 → 评价/分享 → 再次报名”的活动闭环为最高优先级。
- 全部保持兼容，只做增量扩展和内部模块重构。
- 不改变现有数据库、历史数据、公开 API 路径、主要响应结构、页面路由、后台菜单、多租户隔离和权限规则。
- 不删除、清理或回滚已有测试数据；不触碰其他站点、生产数据库或无关租户。
- 微信端不能依赖 `window`、`document`、DOM 或 ScrollTrigger。
- 只动画 `transform` 和 `opacity`，组件卸载时清理动画上下文，并支持减弱动效。
- 不使用伪造报名人数、虚假头像、未经审核的社交证明或无业务意义的装饰动效。
- 真实短信、微信订阅消息、正式支付、正式退款、对象存储、生产 Worker 和微信真机不能用本地 mock 结果替代。
- 每项外部能力记录环境、租户、账号、时间、请求 ID、外部响应、后台记录、用户端表现和结论。
- 每个任务完成后运行对应测试，并在 `docs/任务执行记录.md` 追加任务、结果、证据和未完成边界。

---

## Task 1: 固化基线、契约和发布证据

**Files:**
- Create: `docs/baselines/2026-10-02-platform-baseline.md`
- Create: `docs/baselines/2026-10-02-api-contract-inventory.md`
- Modify: `docs/任务执行记录.md`
- Test: `scripts/preflight.mjs`, `scripts/doctor.mjs`, existing test/build scripts

**Interfaces:**
- Consumes: current route tables, API controllers, package scripts, existing preflight and readiness checks.
- Produces: a versioned baseline listing builds, tests, routes, external capability state, and tenant/permission invariants for Tasks 2–9.

- [ ] **Step 1: Capture the current repository and version baseline**

Run from `E:\2027\AI全自动开发1.0\活动报名-重编排工作副本`:

```powershell
git status --short
git rev-parse HEAD
npm run doctor
npm run build
npm run build:mobile:mp-weixin
npm test -- --runInBand
npm run preflight
```

Write the command, exit code, commit hash, and known external-capability warnings into `docs/baselines/2026-10-02-platform-baseline.md`. Do not change production configuration while capturing the baseline.

- [ ] **Step 2: Inventory public routes and compatibility surfaces**

Record the current user routes from `apps/mobile/src/pages.json`, admin routes from `apps/admin/src/router.ts`, admin menu paths from `apps/admin/src/navigation/admin-menu.ts`, and public/admin controller paths under `apps/api/src/modules`. Mark each route as `must remain compatible`; do not rename or remove a route in later tasks.

- [ ] **Step 3: Record tenant and permission invariants**

Use the existing tenant and permission acceptance scripts to capture the current expected behavior:

```powershell
npm run acceptance:tenant-permissions
npm run acceptance:admin-account-permissions
npm run acceptance:notification-permissions
npm run acceptance:operation-settings
```

Append tenant isolation, admin scope, notification scope, and operation-setting results to the baseline.

- [ ] **Step 4: Verify the baseline is reviewable**

检索两个基线文档中的空白占位标记，结果必须没有未填写项。Append the evidence and any pre-existing warnings to `docs/任务执行记录.md`.

---

## Task 2: Complete the shared UI state and motion system

**Files:**
- Modify: `apps/mobile/src/styles.css`
- Modify: `apps/admin/src/styles.css`
- Modify: `apps/mobile/src/components/EmptyState.vue`
- Modify: `apps/mobile/src/motion/motion.ts`
- Modify: `apps/mobile/src/motion/entrance.ts`
- Modify: `apps/mobile/src/motion/bottom-sheet.ts`
- Modify: `apps/mobile/src/motion/media.ts`
- Modify: `apps/mobile/src/motion/platform-adapter.ts`
- Modify: `apps/admin/src/main.ts` or the existing Element Plus theme entry
- Test: `apps/mobile/src/motion/*.spec.ts`, `apps/mobile/src/components/EmptyState.spec.ts`, existing mobile/admin build checks

**Interfaces:**
- Consumes: baseline token names and existing page components.
- Produces: stable design tokens, reusable status states, and platform-safe motion helpers used by Tasks 3–5.

- [ ] **Step 1: Add failing tests for platform-safe motion behavior**

Add tests that assert the motion adapter returns a no-op or CSS-safe fallback when `window`/DOM is unavailable, and that reduced-motion input disables entrance animation. The tests must run in the existing mobile test setup without importing a browser-only module.

- [ ] **Step 2: Implement the adapter and cleanup contract**

Expose these functions from `apps/mobile/src/motion/platform-adapter.ts`:

```ts
export type MotionOptions = { reducedMotion?: boolean; duration?: number; delay?: number };
export function runMotion(target: unknown, options?: MotionOptions): { cancel(): void };
export function isMotionSupported(): boolean;
```

Implement H5/browser animation with the existing GSAP integration only when safe. Implement the mini-program fallback with a no-op/CSS-compatible result. Every caller must receive a `cancel()` handle and call it in `onUnmounted`.

- [ ] **Step 3: Normalize tokens and common state components**

Use one token set for `--mp-color-primary`, `--mp-color-title`, `--mp-color-price`, `--mp-color-danger`, `--mp-space-8`, `--mp-space-12`, `--mp-space-16`, `--mp-space-24`, and `--mp-radius-card`. Ensure admin Element Plus primary/danger variables map to the same semantic colors without forcing mobile density onto the admin.

- [ ] **Step 4: Add complete loading, empty, error, retry and submitting states**

Update `EmptyState.vue` and its consumers so activity, order, payment, waitlist, activity-space, review, social, customer-service and generic error states each have a stable title, action, icon/illustration slot, and no text overflow. Do not add fake data to fill an empty state.

- [ ] **Step 5: Verify the shared layer**

Run:

```powershell
npm run build:admin
npm run build:mobile:h5
npm run build:mobile:mp-weixin
npm test -- --runInBand
```

For the mini-program build, inspect the generated JavaScript for `window.` and `document.` references introduced by the motion layer; any new reference is a failure.

---

## Task 3: Harden the user activity discovery and decision flow

**Files:**
- Modify: `apps/mobile/src/pages/index/index.vue`
- Modify: `apps/mobile/src/pages/activity/list.vue`
- Modify: `apps/mobile/src/pages/activity/detail.vue`
- Modify: `apps/mobile/src/components/ActivityPreviewRow.vue`
- Modify: `apps/mobile/src/pages.json` only when a compatibility-preserving route metadata change is required
- Test: existing activity acceptance scripts; add focused tests beside the affected page/composable files

**Interfaces:**
- Consumes: Task 2 tokens/state components and existing public activity APIs.
- Produces: a consistent home/list/detail flow with real status, price, location, capacity, tenant and ended-activity rules.

- [ ] **Step 1: Write failing coverage for ended-activity and tenant rules**

Add focused tests for these cases:

```text
报名中/即将开始活动可以进入首页主推和日期流；
已结束活动不会进入首页主推；
无可报名活动显示空态而不是结束活动；
用户通过个人记录或活动回顾仍能进入已结束活动；
切换租户后活动、分类、装修和报名状态不复用旧租户数据。
```

- [ ] **Step 2: Normalize home and list view models**

Create or reuse one local view-model mapper so home, list and preview cards all consume `PublicActivitySummary` fields: `id`, `title`, `coverUrl`, `startTime`, `endTime`, `location`, `priceLabel`, `status`, `registrationCount`, `capacity`, `remainingCapacity`, and `tenant`. Keep API response shapes unchanged at the request boundary.

- [ ] **Step 3: Implement the decision-first information hierarchy**

Render home as city/search/merchant switcher, featured activity, horizontal categories, date-grouped feed, and history/review entry. Render detail in the fixed order cover, status, date/time, location, price, remaining capacity, organizer. Derive the bottom CTA from the actual booking/order state instead of page-local text conditions.

- [ ] **Step 4: Add robust loading, pagination and retry behavior**

Ensure a failed first request keeps the page usable with retry, incremental loading cannot issue duplicate requests, and changing tenant/search/category resets the correct cursor without leaving old cards on screen.

- [ ] **Step 5: Verify responsive and route behavior**

Run:

```powershell
npm run acceptance:activity-lifecycle-pricing
npm run browser:activity-responsive
npm run build:mobile:h5
npm run build:mobile:mp-weixin
```

Check 375px, 390px and 760px screenshots for overflow, CTA overlap, date wrapping and fixed bottom-bar stability.

---

## Task 4: Stabilize registration, payment, order, space and post-event content

**Files:**
- Modify: `apps/mobile/src/pages/activity/register.vue`
- Modify: `apps/mobile/src/pages/activity/space.vue`
- Modify: `apps/mobile/src/pages/user/my.vue`
- Modify: `apps/mobile/src/pages/user/activity-reviews.vue`
- Modify: `apps/api/src/modules/v1/v1.service.ts`
- Modify: `apps/api/src/modules/reliability/post-event-automation.service.ts`
- Test: `scripts/activity-commerce-acceptance.mjs`, `scripts/refund-business-job-acceptance.mjs`, `scripts/content-governance-acceptance.mjs`, `scripts/acceptance-social-connections.mjs`

**Interfaces:**
- Consumes: Task 3 status model and current registration/order/review APIs.
- Produces: an end-to-end booking and fulfillment flow with post-event content gates and accurate personal records.

- [ ] **Step 1: Add failing tests for idempotent registration and order reuse**

Cover duplicate submit, existing unpaid order reuse, payment cancel, payment failure retry, sold-out waitlist, review access only after a real registration, and activity-space access denied for unrelated users.

- [ ] **Step 2: Implement the three-step registration state machine**

Keep existing fields and API payloads. Add explicit client states `editing`, `validating`, `submitting`, `payment_pending`, `success`, `waitlist`, `review_pending`, and `error`. Disable the submit action only during the request and restore it after a deterministic response.

- [ ] **Step 3: Preserve order and payment idempotency**

At the API boundary, reuse the existing valid unpaid order for the same user/activity/ticket instead of creating a second order. Ensure payment and refund callbacks use the platform transaction ID as the idempotency key and return the already-applied result for duplicates.

- [ ] **Step 4: Gate activity space and post-event content**

Allow announcements, masked member summary, Q&A, check-in, controlled group QR, customer service and sharing only after the existing access check. Expose review/photo/insight actions only when the API supplies a valid registration record and the activity is complete; retain moderation and report states.

- [ ] **Step 5: Verify the complete user flow**

Run:

```powershell
npm run acceptance:activity-commerce
npm run acceptance:refund-business-jobs
npm run acceptance:content-governance
npm run acceptance:social-connections
npm run smoke:community-sharing
npm run build
npm run build:mobile:mp-weixin
```

Record any limitation involving real payment, refund, SMS, subscription messages or object storage as an external-environment limitation, not as a passing production result.

---

## Task 5: Finish the admin operations and governance surfaces

**Files:**
- Modify: `apps/admin/src/views/Activities.vue`
- Modify: `apps/admin/src/views/Notifications.vue`
- Modify: `apps/admin/src/views/SystemSettings.vue`
- Modify: `apps/admin/src/navigation/admin-menu.ts`
- Modify: `apps/admin/src/styles.css`
- Modify: related admin shared components under `apps/admin/src/components/`
- Test: `scripts/operation-settings-permission-acceptance.mjs`, `scripts/notification-permission-acceptance.mjs`, `scripts/content-governance-acceptance.mjs`, `scripts/miniprogram-release-permission-acceptance.mjs`

**Interfaces:**
- Consumes: Task 2 design tokens and Task 4 status/automation contracts.
- Produces: an operational dashboard, ordered activity editor, release checks, notification center and audit-safe content controls without changing menus or permissions.

- [ ] **Step 1: Add failing permission and visibility cases**

Test platform administrators, tenant administrators and operator roles against activity publishing, refund review, notification toggles, tenant switching, over-review mode, mini-program release settings, content hiding and audit-log access.

- [ ] **Step 2: Implement actionable operations workbench sections**

Render pending work, activity operations, orders/refunds, notification failures, Worker backlog, membership/recall and city operations. Each metric must link to a filtered action list; remove or hide metrics that have no corresponding data source or action.

- [ ] **Step 3: Complete activity editor publish checks and upload states**

Keep the existing form fields and tabs. Add visual groups for basic information, cover/share, time/location, capacity/price, detail/rules, and activity space. Block publish on missing title/cover/valid time/location/valid price or invalid deadline; show non-blocking suggestions for missing highlights, refund rules, organizer information and customer service. Upload cover, QR and detail images with progress, failure and retry.

- [ ] **Step 4: Make decoration ordering and preview authoritative**

Persist module order, variant, quantity and history visibility with tenant/version/operator metadata. Show “top to bottom is user display order” in the editor and use the real mobile rendering component or the same normalized data mapper in preview.

- [ ] **Step 5: Separate notification channels and dangerous controls**

Show site notification, SMS and WeChat subscription message as independent channel states. A channel is not “sent” without template, authorization/configuration and a real provider response. Add impact text and confirmation to destructive actions such as hiding content, bulk refund, disabling a notification scene, changing default merchant or enabling over-review mode.

- [ ] **Step 6: Verify admin behavior**

Run:

```powershell
npm run acceptance:operation-settings
npm run acceptance:notification-permissions
npm run acceptance:content-governance
npm run acceptance:miniprogram-release
npm run build:admin
```

Use at least two tenant contexts and two roles. Confirm old menu URLs still resolve.

---

## Task 6: Expand shared contracts and introduce bounded API modules

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json`
- Modify: `apps/mobile/src/types/` or the existing request/type modules
- Modify: `apps/admin/src/types/` or the existing request/type modules
- Create: `apps/api/src/modules/activity/activity.service.ts`
- Create: `apps/api/src/modules/registration/registration.service.ts`
- Create: `apps/api/src/modules/commerce/commerce.service.ts`
- Create: `apps/api/src/modules/notification/notification.service.ts`
- Modify: `apps/api/src/modules/v1/v1.service.ts` to delegate through compatibility adapters
- Test: `apps/api/src/modules/*/*.spec.ts`, `packages/shared` build tests, existing API suite

**Interfaces:**
- Consumes: Task 1 route/contract inventory and Task 4/5 status rules.
- Produces: typed public summaries and bounded services while preserving old Controller signatures and response envelopes.

- [ ] **Step 1: Add failing type and compatibility tests**

Assert that `PublicActivitySummary`, `PublicRegistrationSummary`, `PublicOrderSummary`, `PublicNotificationRecord`, `TenantContext` and `MemberSnapshot` exclude private credentials and preserve required public fields. Add a controller-level test that the existing endpoint envelope is unchanged when the new service is used.

- [ ] **Step 2: Define the shared public contracts**

Add the named interfaces to `packages/shared/src/index.ts`. Keep status fields as existing string unions/enums. Never place TypeORM entities, access tokens, raw phone numbers, payment credentials or provider secrets in shared public contracts.

- [ ] **Step 3: Implement the first bounded services**

Move only read/decision logic that has clear boundaries: public activity summary and registration/order decision checks. Services must accept an explicit tenant context and return domain results or typed errors; they must not silently infer a different tenant.

- [ ] **Step 4: Add compatibility delegation**

Change `v1.service.ts` to call the bounded services while retaining method names, controller routes and response mapping. Keep the old code path behind an explicit internal compatibility adapter until tests and tenant acceptance pass.

- [ ] **Step 5: Reduce untyped request usage in touched screens**

Replace `request<any>` only in the activity, registration, order, notification and tenant-switching paths touched by this plan. Use typed success/error envelopes and preserve runtime validation for server responses.

- [ ] **Step 6: Verify contracts and API build**

Run from the repository root:

```powershell
npm run build:shared
npm run build:api
npm test -- --runInBand
npm run acceptance:tenant-permissions
npm run acceptance:activity-commerce
```

If API `rootDir` rejects a direct source import from shared, use the built declaration/package boundary and document the reason in `docs/任务执行记录.md`.

---

## Task 7: Complete Worker production governance and automatic operation

**Files:**
- Modify: `apps/api/src/worker.ts`
- Modify: `apps/api/src/worker-config.ts`
- Modify: `apps/api/src/worker-heartbeat.ts`
- Modify: `apps/api/src/modules/reliability/post-event-automation.service.ts`
- Modify: the existing business-job registry and notification provider modules under `apps/api/src/`
- Create: focused Worker idempotency/dead-letter tests beside existing Worker specs
- Modify: `deploy/` PM2/Nginx/environment templates only for the activity-worker process
- Test: `apps/api/src/worker-config.spec.ts`, `apps/api/src/worker-heartbeat.spec.ts`, `apps/api/src/modules/reliability/notification-automation-suite.spec.ts`

**Interfaces:**
- Consumes: Task 6 typed notification and tenant contracts, existing business job registry.
- Produces: independently startable Worker with heartbeat, locks, retry/backoff, dead letters, manual retry and no duplicate API scheduler loops.

- [ ] **Step 1: Add failing tests for task lifecycle**

Cover queued-to-processing locking, successful completion, retry with increasing `nextRunAt`, terminal dead-letter after maximum attempts, tenant mismatch rejection, Worker restart recovery, and duplicate delivery returning the prior result.

- [ ] **Step 2: Normalize task identity and context**

Every job payload must contain `taskId`, `tenantId`, `scene`, `idempotencyKey`, `requestId`, `attempt`, and `nextRunAt`. Reject a job missing tenant or idempotency context before provider execution.

- [ ] **Step 3: Implement bounded retry and dead-letter behavior**

Classify provider failures into retryable and terminal errors. Retry with bounded exponential backoff, persist the last error, and move terminal/exhausted jobs to a visible dead-letter state. Manual retry must reuse the same idempotency key.

- [ ] **Step 4: Keep API and Worker responsibilities separate**

Ensure external business scheduler flags disable duplicate scans in API processes while readiness still reports API health and Worker heartbeat separately. API requests create/claim tasks; Worker performs asynchronous delivery and lifecycle work.

- [ ] **Step 5: Add production process and readiness checks**

Add the Worker process to the existing PM2/deploy templates without changing other sites. Verify `npm run wait:worker-ready` observes a fresh heartbeat and fails when the heartbeat is stale.

- [ ] **Step 6: Verify Worker behavior**

Run from `E:\2027\AI全自动开发1.0\活动报名-重编排工作副本\apps\api` when invoking Vitest directly:

```powershell
npm exec vitest run src/modules/reliability/notification-automation-suite.spec.ts src/worker-config.spec.ts src/worker-heartbeat.spec.ts
```

Then run `npm run build:api`, `npm run wait:worker-ready`, and the business-job acceptance suite. Do not claim provider delivery success unless a real provider response is recorded.

---

## Task 8: Validate real external capabilities in isolated test scope

**Files:**
- Modify: `deploy/.env.production.example` or the existing documented environment template
- Modify: `docs/operations/real-capability-acceptance.md`
- Modify: `docs/任务执行记录.md`
- Test: `scripts/real-payment-smoke-result.mjs`, `scripts/notification-permission-acceptance.mjs`, object-storage smoke/health checks, existing readiness scripts

**Interfaces:**
- Consumes: Task 7 Worker and Task 5 notification configuration screens.
- Produces: evidence-backed configuration and a clear pass/blocked status for SMS, WeChat subscription messages, payment, refund and object storage.

- [ ] **Step 1: Define the isolated test tenant and accounts**

Use only a designated test tenant and test users. Record tenant code, account roles and test IDs in the acceptance document; never use an unrelated tenant or production customer record.

- [ ] **Step 2: Verify object storage**

Upload a non-sensitive test image and QR asset, verify private/public access policy as intended, retrieve the object through the application, then delete only the named test object. Record provider response, application URL, permission result and cleanup result.

- [ ] **Step 3: Verify SMS and WeChat subscription messages**

Check template IDs, provider credentials, tenant scene switches and user authorization. Trigger one registration-success test and one activity-change test. Compare provider response, notification record, Worker task and user receipt. A missing authorization/template is a blocked external prerequisite, not a code pass.

- [ ] **Step 4: Verify payment and refund**

Use the approved sandbox or designated test merchant flow. Verify one payment success, one payment cancellation/failure retry, one refund request and one duplicate callback. Confirm order/refund state and idempotency without using real customer money unless the user explicitly provides an approved production test procedure.

- [ ] **Step 5: Update environment/readiness evidence**

Run `npm run preflight`, `npm run wait:api-ready`, and `npm run wait:worker-ready`. Record configuration warnings without exposing secrets. The result must distinguish `configured`, `tested`, `provider-confirmed`, and `not available`.

---

## Task 9: Run tri-platform acceptance, gray release and rollback drill

**Files:**
- Create: `docs/release/2026-10-02-platform-release-checklist.md`
- Create: `docs/release/2026-10-02-rollback-drill.md`
- Modify: `docs/任务执行记录.md`
- Test: `npm run build`, `npm run build:mobile:mp-weixin`, `npm run preflight`, browser acceptance scripts, `npm run drill:rollback:api`, `npm run drill:rollback:static`

**Interfaces:**
- Consumes: all previous task outputs, production environment evidence, PM2/deploy templates and existing release guards.
- Produces: release evidence, tri-platform acceptance results, a completed rollback drill, and an explicit list of any external prerequisite that prevents formal operation.

- [ ] **Step 1: Run the full local release gate**

```powershell
npm run build
npm run build:mobile:mp-weixin
npm test -- --runInBand
npm run preflight
npm run browser:activity-responsive
npm run browser:activity-commerce
```

Archive command output and record the commit hash in the release checklist.

- [ ] **Step 2: Validate H5 and admin at all target widths**

Use the local server and browser acceptance flow to inspect home, list, detail, registration, activity space, my, orders, admin activities, notifications and system settings at 375px, 390px and 760px. Record screenshots or links to the captured evidence and note console errors, overflow or fixed-bar issues.

- [ ] **Step 3: Validate the mini-program build and experience version**

Import the generated mini-program output into the WeChat Developer Tools, verify legal request domains, compile, run login/activity/registration/space/my/order flows, upload an experience version and record the version/build hash. Then repeat the core flow on a real device; do not treat H5 as a substitute.

- [ ] **Step 4: Execute a controlled gray release**

Back up database and static artifacts, start the new API and Worker processes, run readiness checks, enable the feature for the designated test tenant, observe payment/refund/notification/queue metrics, and only then expand the tenant scope. Keep the old path and feature flag available during observation.

- [ ] **Step 5: Execute and record rollback**

Run:

```powershell
npm run drill:rollback:api
npm run drill:rollback:static
```

Verify old API/static artifacts are reachable, failed tasks and logs remain available, and no order/registration/notification data is deleted. Record the exact rollback trigger and recovery time.

- [ ] **Step 6: Publish the final release decision**

Mark each requirement as `通过`, `外部前置未满足`, or `失败`. The system may be called ready for formal operation only when all core activity, permission, tenant, notification, payment/refund, object storage, Worker, mini-program and rollback evidence is `通过`.

---

## Review Checkpoints

- After Task 1: review the baseline and compatibility inventory before UI or API changes.
- After Task 4: review the complete activity loop before adding further membership/social scope.
- After Task 6: review public contracts and old API response snapshots before migrating more services.
- After Task 7: review Worker failure behavior and production process boundaries before external provider testing.
- After Task 9: review the release checklist and explicit external limitations before any formal launch decision.

## Suggested Execution Order

Execute Tasks 1–4 first to protect and complete the activity loop. Execute Task 5 in parallel only after the shared UI token names are stable. Execute Tasks 6–7 after the user-facing contracts are verified. Execute Tasks 8–9 only in the designated test/production procedure and never infer success from local mocks.

## Self-Review Coverage

- UI tokens, common states and motion: Task 2.
- Home/list/detail/ended activity behavior: Task 3.
- Registration, payment, refund, space, check-in, review and content: Task 4.
- Admin editor, decoration, notifications, permissions and governance: Task 5.
- Shared contracts and modular API compatibility: Task 6.
- Worker idempotency, retry, dead-letter, heartbeat and deployment: Task 7.
- SMS, WeChat subscription, payment, refund and object storage evidence: Task 8.
- H5, admin, mini-program, real-device, gray release and rollback: Task 9.
