# 慢π最终用户体验与上线运营实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以已确认的慢π HTML 预览和产品规格为用户端基线，完成现有 H5/微信小程序、主理人工作台和运营后台的视觉与业务闭环验收，并仅在所有外部及生产门禁有可信证据时宣布可上线运营。

**Architecture:** 保持当前 uni-app + Vue 3、NestJS 模块化单体、共享契约、现有 API/路由/数据库和工作台边界；先统一正式 H5/小程序呈现，不复制预览中的静态 mock 作为真实业务。之后按主理人供给、真实活动履约、通知/资金、运营治理、发布验收分别推进。生产环境每次只触碰经证实属于慢π的目标资源，不停机或改动其他服务。

**Tech Stack:** uni-app/Vue 3/TypeScript/Vitest；NestJS/TypeORM/Vitest；Vue 3/Vite 管理后台；Node.js 22；微信开发者工具；生产 API/H5 运维脚本与健康检查。

**Spec:** `E:\2027\AI全自动开发1.0\UI\manpi-design-spec.md`、`E:\2027\AI全自动开发1.0\UI\manpi-style-preview.html`、`docs\慢π与ap融合完整开发总方案.md`、`E:\2027\AI全自动开发1.0\UI\慢π-完整开发命令.md`。

## Global Constraints

- 慢π品牌气质为真实、克制、温暖、松弛、专业、年轻、长期主义；不得引入粗门品牌资产、颜色、文案、图片或伪造运营数据。
- 保持 API、旧页面路由、旧分享链接、租户隔离和现有数据库技术栈兼容；不进行无关重构或破坏性数据迁移。
- Demo/mock 必须明确标识且不能生成真实报名、支付、通知、签到、评价、用户或履约记录。
- 不将配置完成、上传成功或人工输入摘要等同于外部验收；真实支付保持关闭，直到独立预检和新鲜真实证据通过。
- 不读取/输出密钥，不把密钥写入聊天、Git、普通日志或验收摘要。
- 未获得针对具体外部副作用的动作级确认，不执行生产部署、支付/退款、通知发送、微信上传/审核/发布或不可逆数据操作。
- 尊重脏工作树；不得覆盖或清理现存用户改动、构建产物、截图和数据。

---

### Task 1: 正式用户端 UI 与已确认 HTML 样张统一

**Files:**
- Modify: `apps/mobile/src/styles/tokens.css`
- Modify: `apps/mobile/src/components/layout/MobileShell.vue`
- Modify: `apps/mobile/src/components/home/ActivityCard.vue`
- Modify: `apps/mobile/src/pages/home/index.vue`
- Modify: `apps/mobile/src/pages/activity/detail.vue`
- Modify: `apps/mobile/src/pages/checkin/index.vue`
- Modify: `apps/mobile/src/pages/prototype/message.vue`
- Modify: `apps/mobile/src/pages/prototype/me.vue`
- Modify: `apps/mobile/src/components/layout/PublishEntrySheet.vue`
- Test: existing mobile contract tests plus focused visual contract specs

- [ ] Build visual mismatch ledger from approved preview: tokens, card/image ratios, information hierarchy, tab bar, publish surface, demo labels, host-entry surface, safe area.
- [ ] Add focused contract tests for corrected agreed mismatch before each production-facing style edit; run to prove the assertion catches current code.
- [ ] Apply tokens and component/page-scoped styling without replacing real-data state logic or route behavior. (In progress: detail demo-disabled CTA neutralized against legacy global theme; publish entry uses readable full-width rows.)
- [x] Run targeted mobile tests, all mobile tests, H5 and mp-weixin builds under Node 22. (2026-10-13: 46 files/129 tests pass; H5 and mp-weixin builds pass.)
- [ ] Run rendered browser QA at 415×781 plus a narrow common viewport; inspect screenshots, tab routes, publish sheet, search/filter/sort, activity detail and console errors/warnings. (Partial: isolated local browser verified home→detail id=1→back, itinerary guest state, message demo copy, publish sheet, detail disabled CTA; console clean. Browser viewport override did not produce requested CSS viewport, so exact 415×781 is not claimed.)
- [ ] Save a mismatch/QA report to `E:\2027\AI全自动开发1.0\UI\manpi-design-qa.md`; do not mark passed while any P0/P1/P2 remains.

### Task 2: 真实活动供给与主理人履约闭环

**Files:**
- Inspect/modify only as evidence requires: `apps/mobile/src/pages/admin/activity/*`, `apps/admin/src/views/Activities.vue`, `apps/admin/src/views/Organizers.vue`, `apps/api/src/modules/admin/admin.service.ts`, activity/organizer DTOs, lifecycle services, focused specs.
- Evidence: role-scoped acceptance artifacts under `docs/release/` and `E:\2027\AI全自动开发1.0\UI\`.

- [ ] Verify role matrix and existing create/draft/submit/review/return/resubmit/publish/edit/registration/check-in lifecycle against current API and UI.
- [ ] Add failing tests only for demonstrated gaps; fix backend authorization/state enforcement before relying on UI visibility.
- [ ] Run end-to-end local/preproduction tests with dedicated test tenant and retain test records; never seed fake production users, hosts, bookings or reviews.
- [ ] Verify ordinary user sees only published, eligible real activities and that demo activities cannot register/pay.

### Task 3: 报名、订单、支付/退款与交易对账验收

**Files:**
- Inspect/modify only as evidence requires: activity registration/order/payment/refund modules, `apps/api/src/shared/payment-preflight.ts`, `apps/api/src/modules/admin/payment-settings.service.ts`, finance admin views and integration specs.

- [ ] Prove idempotency, seat locking, callback signature/amount checks, order transitions, refund query/callback, ledger/reconciliation, audit logs and payment-off switch using automated tests.
- [ ] Keep production payment disabled while merchant credentials/certificates or fresh external preflight evidence are incomplete.
- [ ] After owner performs safe credential entry and confirms a specific external test window, run a low-value preproduction payment/refund and verify callback/reconciliation evidence without exposing secrets.
- [ ] Never use manual readiness evidence text as a substitute for transaction proof.

### Task 4: 消息、Worker、签到、活动空间、记录和评价

**Files:**
- Inspect/modify only as evidence requires: notification provider/schedule/worker modules, `apps/mobile/src/pages/checkin/*`, registration, activity-space/review APIs and focused specs.

- [ ] Verify queue claim/idempotency/retry/dead-letter/expiry behavior; inspect outstanding production jobs before any replay.
- [ ] Verify subscription template/config prerequisites and obtain user/device receipt evidence in the target mini-program; no real outbound sends without action-time approval.
- [ ] Verify reminder, registration, payment/refund and post-event scenes map to correct tenant and activity states.
- [ ] Verify actual registration-bound check-in, activity record, photo/experience privacy, review eligibility and moderation; local slow-experience mock remains separate.

### Task 5: 运营治理、权限、安全和数据合规

**Files:**
- Inspect/modify only as evidence requires: `apps/admin/src/views/*`, `apps/api/src/modules/admin/*`, permissions, audit, privacy/content governance and release readiness specs.

- [ ] Test platform admin, city/operator, merchant/host, finance, check-in staff and ordinary member isolation and authorization.
- [ ] Validate user agreement/privacy/refund/disclaimer, reporting and takedown flow, upload validation/private OSS authorization, secret redaction, audit coverage, backup restore and rollback.
- [ ] Configure only after owner-supplied values are entered into approved secure backend fields; never infer a passing status from config presence.

### Task 6: Node 22 release candidate and production go/no-go

**Files:**
- Update only after the preceding gates: `E:\2027\AI全自动开发1.0\UI\manpi-release-readiness.md`, `docs/慢π上线验收操作清单.md`, release evidence/manifest files.

- [ ] Run Node 22 full verification: runtime audit, API/mobile tests, preflight guards, API/admin/H5/mp-weixin builds, artifact security and acceptance suites.
- [ ] Perform actual target mini-program DevTools and real-device checks; verify domain allowlists, login, share, location/map, upload and notification behavior.
- [ ] Recheck database/files/static backups, target-only deployment scope, health/worker state, version IDs, monitoring and rollback drill.
- [ ] Deploy only the approved candidate with action-specific user approval; verify the exact release commit, H5/admin/API/worker compatibility and no unrelated services changed.
- [ ] Complete the agreed test-merchant gray window and observe errors, payment/refund, notifications, booking, check-in and support paths; expand only after explicit go/no-go approval.
- [ ] Mark ready only when every launch blocker has direct evidence; otherwise publish the exact blockers and safe current operating mode.

### 2026-10-13 continuation evidence

#### Isolated database and authenticated H5 acceptance

- Added scripts/acceptance-manpi-member-inbox-host.mjs using a new, dedicated local MariaDB data directory/database and loopback ports. Repository .env files are not loaded; external payment/notification providers and scheduled workers are disabled. The harness only shuts down the database/app instances it creates.
- Real MariaDB exposed ER_DROP_INDEX_FK during notification index rollback; migration now restores a supporting userId index before removing the composite index when InnoDB has adopted it for the foreign key. Regression verified red/green.
- Real concurrent HTTP submissions with different business keys initially produced two applications. Host check/create now runs under a user row lock in a single transaction using its own repository. Rebuilt API real concurrency test passes with one success and one rejection.
- Final isolated HTTP/database evidence passes: authenticated submission/replay, owner/tenant isolation, review-service writeback without volunteer conversion, separate workspace grants/revocation, delivered-site inbox/read idempotency/persistence, migration rollback/reapply record preservation. Evidence in .local-logs/manpi-member-acceptance-1791849697749/result.json; no production changes or external sends.
- Final API 275 files/1428 tests and build pass. H5 browser actually logged in two isolated fixture accounts, verified unread→read persistence, reviewed/pending application states, real profile empty state, logout cleanup and no account data mixing; runtime error/warn zero on checked flows.
- Screenshot revealed legacy guofeng !important colors on host application despite correct backend theme. Organizer-mode aliases now resolve those colors to the approved/current primary; computed background verified from rgb(56,97,81) to rgb(185,83,63). Other legacy routes/configurations preserved. Screenshots saved under UI/qa-20261013; viewport 520x292 remains partial evidence, not mobile/WeChat acceptance.
- Production deployment, real merchant payment/refund and notification receipts, exact mobile and WeChat device checks remain incomplete. Production rollback should retain additive columns while restoring code, rather than deleting ownership/read values as the fresh local rollback exercise does.

#### Member inbox and host application ownership

- Formal message tab now loads public announcements and authenticated, tenant-scoped site notifications; server readAt is persisted idempotently. Notification projection excludes provider secrets/diagnostics. Migration 1788653700000 is pending actual database execution.
- Host application state now comes from authenticated `/public/me/host-application`, replacing device-local pending markers. Host submissions bind owner and tenant scope; business-key replay rejects foreign ownership. Existing unbound applications are not linked by phone. Migration 1788653800000 is pending actual database execution.
- Application review and workspace permission are distinct. Existing authorized workspace access is scoped to the active tenant or platform admin. Host review no longer creates volunteer/ambassador profiles or partner contracts. Admin recruitment view identifies host_apply explicitly.
- Final Node 22.14.0 verification: API 275 files/1427 tests and build pass; mobile 49 files/139 tests, H5/mp-weixin builds and artifact checks pass; admin typecheck/build pass (dependency annotation and chunk-size build warnings remain).
- Browser verified guest host application login target and profile publish open/close without changing the profile URL; zero runtime error/warn on these flows. Screenshots saved under UI/qa-20261013. No authenticated submission/review/read-persistence E2E or exact mobile viewport acceptance yet.
- No production deployment, migration, service restart or payment configuration change in this continuation. Production backend parameter entry/upload/save/check and release-readiness center already exist; missing credentials and external receipts remain distinct gates.

#### Additional verified continuation

- Personal center now reads real profile/registration endpoints, clears previous data on load, binds requests to user/token/tenant, and invalidates on hide/unload. Guest login routes, privacy page, about dialog verified through browser without submitting authentication. Signed-in API/render/logout flows remain pending actual E2E acceptance.
- Added a registration projection reusing journey rules: attendance requires checked-in/completed; cancelled/refunded/missed rows do not become participation records; optional missing review eligibility remains unknown. Unit tests cover these rules.
- Fixed profile row CSS stretching IconGlyph roots to ~146px: only text views now grow, verified icon widths ~18px and ~15px. Final mobile run: 48 files/137 tests; final H5/mp-weixin builds pass on Node 22.14.0. Screenshots under UI/qa-20261013. No production deployment in this continuation.

- Fixed default runtime theme to approved Manpi colors while preserving explicit tenant overrides; runtime test verified old green fails before the change and new colors pass after it.
- Profile host entry now opens the current MobileShell publish sheet without relaunching home. Browser verified open/close and unchanged tenant-bearing profile URL; scroll restoration is not independently accepted yet.
- Node 22.14.0 explicitly verified: mobile 47 files/131 tests; API 270 files/1413 tests; H5 and mp-weixin builds; mini-program artifact check pass. The earlier API Node 22 attribution was not sufficiently verified; this rerun supersedes it.
- Production payment settings UI exists and has merchant/AppID/callback values; missing secret/certificate fields and real transaction evidence remain blockers. New UI changes are local only. Screenshot saved under UI/qa-20261013/profile-publish-in-place.png; actual browser viewport 520x292, not exact mobile acceptance.

- Fixed `me.vue` experience timestamp formatting to use the shared cross-platform Shanghai formatter. Added a contract test; verified red before fix and green after.
- Fixed demo-disabled activity CTA styling against legacy global `!important` theme: primary action uses Manpi clay; non-actionable demo state is neutral. Detail contract verified red before implementation and green after; browser computed style confirmed neutral background/text/border.
- Reworked publish entry from cramped three-column tiles to readable full-width rows. Contract verified red then green; local browser confirmed all three options render full width and remain reachable.
- Node 22.14.0: mobile 46 files/129 tests pass; API 270 files/1413 tests pass; H5 and mp-weixin builds pass; preflight guards and mp-weixin artifact dependency check pass.
- Browser smoke at isolated localhost port 5184: home card → detail id=1 → browser back; itinerary tab guest state; messages all marked demo; publish entry opens; activity demo booking CTA disabled. Browser error/warn log empty. A 415×781 override was rendered as an unrelated ~168×317 CSS viewport and screenshot channel was inconsistent, so no exact-device visual pass is claimed.
- Live read-only production readiness on 2026-10-13: API/database/embedded worker up, `ready=true`; 5 optional notification warnings. Production release still reports commit `a94528f4`, build 2026-10-08. No deployment or restart performed.
- `npm run prelaunch:online-showcase` is NO-GO: missing real-payment smoke evidence; mall payment smoke evidence older than 168 hours; API_BASE resolves to localhost; live admin login validation returns 401. Release-readiness UI remains 1/6 accepted with payment config absent, callbacks and device acceptance external-pending, subscription messages absent, test fixtures placeholders.
- Remaining production gates require owner/external actions: secure merchant certificate/APIv3 setup, fresh payment/refund and mall-route tests, actual callback configuration, mini-program real-device and subscription receipt evidence, real test account/order fixtures, target-only backup/deployment/gray window/rollback. Production payment remains disabled.

#### Host submission retry lifecycle continuation

- Reproduced rejected reapplication replaying its original business key, and applicant form/retry identity surviving account or tenant changes, by executing the page script in behavioral tests.
- Successful POST ends the attempt; failed network retries keep the attempt. Account/tenant changes clear form and attempt. Late responses from another account or hidden page cannot show success/error notices; hidden successful responses still end their original attempt.
- Mobile 50 files/145 tests passed. Node 22.14.0 H5/mp-weixin builds and mp-weixin artifact checks passed. Updated isolated database harness adds rejected→fresh-key reapplication and requires interactive stdin for --serve.
- Live admin parameter forms already deployed and usable. Latest candidate UI/API is still not deployed. Commercial gates remain incomplete; do not treat saved parameters as acceptance.
- That implementation boundary has since been completed in the candidate: authenticated owner/tenant journals, private encrypted media, manual public moderation, privacy reversal/deletion, author revision-bound editing, public browsing, and reuse of existing publication keyword/sanction rules. This remains separate from ExperienceFeedback and activity attendance; see later QA evidence rather than treating it as deployed.
- Fresh isolated MariaDB/HTTP acceptance passed including rejected reapplication; evidence .local-logs/manpi-member-acceptance-1791850789405/result.json. Test process exited normally and no external providers were enabled.

#### Journal governance candidate verification

- Reused global/current-tenant all/community ContentKeywordRule and ContentUserSanction at public submission and approval. Private drafts remain writable; withdrawal/deletion remain possible. Changed masking rules cannot silently rewrite content after a reviewer has loaded it.
- API 278 files / 1452 tests passed; Node 22 API build and module dependency compilation passed. Mobile 55 files / 170 tests passed; H5/mp-weixin final builds and artifact checks passed.
- Real isolated MariaDB/HTTP evidence: .local-logs/manpi-member-acceptance-1791857275882/result.json. Covers global rejection, foreign-city isolation, masking, changed-policy review rejection, sanctions and safe privacy reversal/delete. The harness exited normally with productionChanged=false and externalProvidersEnabled=false.
- Latest candidate is not deployed. Current launch work remains full fresh-schema migration verification, precise mobile and media/device acceptance, commercial activity path, target-only backup/deployment/gray/rollback, and actual payment/refund/notification receipts. Existing admin parameter-entry/save/upload is the supported configuration path; saved credentials alone do not meet acceptance.

#### Fresh migration chain verification

- Reproduced empty-database migration failure: the earliest release migration assumes notifications already exists. Added a frozen, empty-database-only InitialApplicationSchema1780480000000 rather than enabling production synchronize.
- Existing deployments with core tables are left untouched; partial unknown schemas fail explicitly. Schema inspection is restricted to the current DATABASE(). Baseline rollback refuses to drop business data.
- A new empty isolated database applied all 216 release migrations with synchronize disabled, then passed the member/host/inbox/journal HTTP acceptance. Evidence: .local-logs/manpi-member-acceptance-1791858069996/result.json.
- A separate copied-database upgrade passed with users schema and account count unchanged by baseline execution. Evidence: .local-logs/manpi-member-acceptance-1791858292272/result.json.
- API 279 files / 1456 tests, API build, module wiring and migration guard passed. Test services exited, production unchanged. Full activity commercial-path acceptance, visual/media/device acceptance, target-only production backup/deployment/gray/rollback and actual payment/notification receipts remain open.

#### Free activity lifecycle and live release inventory

- Isolated HTTP/database acceptance passed host draft/platform publication approval/free registration review/check-in/activity completion/member review, capacity waitlisting and ownership/tenant/privacy protections. Evidence: .local-logs/manpi-member-acceptance-1791858806041/result.json. No real payment or outbound notification tested.
- Live public release endpoints still label API/H5 a94528f4 and admin a94528f4+admin-qr-20261012; latest candidate not deployed. API/database and embedded worker report up. Existing patches may share the baseline version label.
- User requires all launch parameters to be entered/uploaded/saved in admin. Preserve this configuration path and keep configuration presence separate from external acceptance evidence.
- BaoTa terminal page opened, but execution output was unavailable. No production mutation in this inspection. Target backup/deployment/rollback and real provider/device gates remain outstanding.

- Cancellation/waitlist continuation passed on an isolated database: owner cancellation releases capacity, cancelled signup cannot obtain a ticket, platform promotion preserves ownership/review state, full-capacity/foreign-tenant/repeated promotion rejected. Evidence: .local-logs/manpi-member-acceptance-1791859369024/result.json; services exited normally.
- API/H5/admin rebuilt using Node 22.14.0; module and artifact guards passed. Admin third-party annotation/chunk-size warnings remain. Source archive and 1306 artifact hashes saved under .local-logs/production-release/candidate-20261013; deployable=false.
- Production assembly now rejects dirty Git source instead of silently labeling new edits with the old baseline SHA. The rejection was actually verified. This does not solve the release identity yet: reviewed snapshot identity, production execution access/current patches, backup, pending migrations and rollback must be completed before deploy.
