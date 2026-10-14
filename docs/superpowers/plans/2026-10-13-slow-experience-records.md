# Slow Experience Records Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to execute the approved record lifecycle with evidence after each boundary.

**Goal:** Replace device-local demonstration notes with account-owned private records, moderated public sharing, and revocable photos while preserving the approved UI.

**Architecture:** Add a slow-experience module to the modular monolith. Use existing public member authentication, tenant resolution, administrative role guards and encrypted private-document storage. Do not convert journals into attendance, payment, rating or challenge-completion records.

**Tech Stack:** NestJS, TypeORM/MariaDB, Node 22, Vue/UniApp, existing private-file encryption.

**Spec:** ../UI/manpi-design-spec.md and approved private/public-review decisions in this thread; docs/superpowers/plans/2026-10-13-manpi-final-ui-and-launch.md.

## Constraints

- Preserve approved clay/paper/ink tokens and existing route behavior.
- Bind every private read/write to authenticated owner and exact tenant scope.
- Public records require explicit submission and administrator approval; editing published content returns it to pending review.
- No automatic migration of unowned device-local notes into an account.
- No production payment, notifications, publication or unrelated server changes during local tests.
- Photos use encrypted private storage; no public upload URL or raw file reference in record responses. Short photo grants must be expiry-bound and rechecked against current record visibility/deletion.
- Moderation changes record an actor and state transition in the same transaction. Administrator approval must identify the content revision it reviewed.

## Tasks

- [ ] Backend: add record/event entities, additive migration, ownership/tenant-safe CRUD, idempotent create, pending/approved/rejected review, private reversal and deletion. Register entities in API runtime and migration data source.
- [ ] Media: validate image contents and malware scan, store encrypted photo under a dedicated namespace, generate limited photo grants, check active record and current visibility on every photo request.
- [ ] API and admin: add DTO-validated member/public/admin endpoints with existing authentication and role boundaries; add moderation list and review UI.
- [ ] Mobile: retain composer layout, replace local demo save with authenticated server save/photo upload, show retry states, private/public-request status and personal record gallery. Keep legacy local notes clearly separate without implicit owner assignment.
- [ ] Acceptance: unit and concurrency tests; fresh MariaDB migration/down/up and authenticated HTTP scenarios for two users/two tenants, moderation, revoke/delete, expired and tampered media grants. Browser save/photo/review/view/revoke flows at actual mobile widths.
- [ ] Release: all builds/artifact checks, back up private media along with database, deploy only complete candidate and verify exact release plus rollback without dropping additive tables.

## File Ownership

- apps/api/src/entities/slow-experience-record.entity.ts: record.
- apps/api/src/entities/slow-experience-event.entity.ts: moderation audit event.
- apps/api/src/modules/slow-experience/: service, DTO, controllers, tests and module.
- apps/api/src/migrations/1788653900000-SlowExperienceRecords.ts: additive tables.
- apps/api/src/shared/private-asset-token.ts: dedicated record-photo purpose.
- apps/mobile/src/pages/checkin/detail.vue and pages/prototype/me.vue: composer and personal gallery integration.
- apps/admin/src/views/: review surface linked from existing content governance.

## Current Evidence (Not a Completion Claim)

- Backend entities, additive migration, service, DTOs and API controllers implemented. Uses existing encrypted private documents rather than the public OSS image proxy; privacy withdrawal and deletion revoke public grants by checking current record state.
- Dedicated media purpose and policy/service/permission tests pass. API full suite 278 files/1442 tests passed after regenerating the operation guide catalog for 225 tables. API build passed before the following wiring fix.
- Actual startup exposed missing AdminUserRepository in the new module's RolesGuard. Added AdminUser to the module's TypeORM feature registration; rebuild and database-free dependency compilation passed, followed by actual authenticated HTTP acceptance.
- Harness now sets abortOnError:false so startup errors are surfaced and resources shut down normally. It confines encrypted photo data and synthetic encryption keys to its private test directory. Real photo/moderation/revoke HTTP assertions are present but have not passed yet.
- Isolated MariaDB upgrade/HTTP acceptance passed: .local-logs/manpi-member-acceptance-1791854016938/result.json. Covers authenticated save/replay/concurrency, account/tenant isolation, encrypted photo read, stale-review rejection, real administrator review, public visibility withdrawal and deletion revocation. Copied accepted test databases use additive migrations instead of destructive schema synchronization. Fresh-schema journal acceptance and browser acceptance remain open.
- Admin moderation page and permission-scoped routes/menu added at /slow-experiences; build and rendered interaction verification tracked separately. Mobile cloud integration remains open. No new deployment, payment enablement or production database change.

## Authenticated UI Progress

- Mobile composer now creates authenticated records (single multipart request when a photo is supplied), preserves network retry identity and guards account/tenant/hidden-page races. Personal center uses an independent CloudExperienceGallery with paginated account reads, moderation feedback, privacy withdrawal and confirmed deletion. Existing unowned local demos are not imported.
- Browser acceptance on isolated API 3018/mobile 5190/admin 5191 passed text save -> private view -> public request -> admin approval -> owner approved view -> private reversal -> resubmission -> rejection with reason -> owner feedback -> deletion cancel/confirm -> empty state. Four main tabs respond; error/warn logs empty. Actual viewport 490x370, not exact reference dimensions.
- Mobile 53 files/159 tests pass. Node 22 H5/mp-weixin builds and final mini-program artifact checks pass. Admin build passed before the browser run. Screenshot evidence: ../UI/qa-20261013-cloud.
- Outstanding: user-facing public journal browsing, record editing, actual photo chooser/camera/device acceptance, content-governance integration, fresh database journal migrations, exact visual acceptance, deployment and commercial external gates.
