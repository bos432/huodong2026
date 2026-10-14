# 慢π生产运营版本受控发布计划

> **For agentic workers:** Execute this plan task by task with a verification checkpoint after each task. Preserve the candidate worktree and its staged merge state until its contents have been reviewed.

**Goal:** 将已审查的慢π API、后台和 H5 同一版本发布到生产，使页面、登录/消息/个人中心链路可验证，并让短信和支付能由授权管理员在后台填写、保存、测试和按门禁启用。

**Architecture:** 在隔离候选工作树中审查并固定源代码版本，使用锁文件构建 API/Admin/H5，并将其与仅允许活动项目 API、静态目录和发布脚本的校验器一起封装成带哈希清单的 release bundle。服务器先备份数据库、当前构建和配置，再确认数据库无未审查待迁移项；只重建 `rdchaimen666com` 项目的 `activity-api` 容器，写入 Admin/H5 静态目录，不重启 Nginx、MySQL、Redis 或其它容器。发布后检查 API 提交号、健康状态、启动页、首页、消息、个人中心和后台配置入口；失败时恢复 API、静态目录与环境配置，保留数据库迁移状态和备份。

**Tech Stack:** Git worktree, Node.js 22, npm lockfiles, NestJS/Vitest, Vue/Vite, UniApp H5, Docker Compose, MySQL migrations, Aliyun ECS Workbench.

**Spec:** `docs/superpowers/plans/2026-10-13-manpi-final-ui-and-launch.md`; active user requirement: final system ready for operation, with no impact to other server services.

## Global Constraints

- Production Compose project must be `rdchaimen666com`; the only recreated container is `/activity-api` (Compose service `api`).
- The live API host port is 3000; port 18080 belongs to Nginx. API readiness response wraps health data under `data`.
- Do not run a database migration unless the live pending list is an exact reviewed subset and the migration is required by this release. Expected release migrations are `deploy-migrations.mjs`; current production read-only inspection showed all required H5 migrations already applied.
- Never print, copy, or place credentials in chat, command output, release archives, or logs. Leave real payment disabled; SMS and payment become operational only after an authorized administrator enters provider credentials in the backend and the backend's live check succeeds.
- Do not run write-oriented production smoke tests, reset/delete production records, change security groups, or restart unrelated containers.
- Keep rollback artifacts and database backup until post-release verification is complete.

---

### Task 1: Establish and review the candidate source snapshot

**Files:**
- Review staged and unstaged candidate changes under `apps/api`, `apps/admin`, `apps/mobile`, `packages/shared`, `scripts`, and `deploy`.
- Create/update this plan at `docs/superpowers/plans/2026-10-14-operational-release.md`.

- [ ] Record `git status --short`, merge parent IDs, and the staged/unstaged diff counts without changing them.
- [ ] Compare non-whitespace diffs against the production baseline and identify every migration, API contract, deployment script, and launch-screen change included in the candidate.
- [ ] Exclude lockfile installation noise and local `node_modules`, build output, private credentials, and temporary artifacts from the release commit.
- [ ] Confirm all current database changes required by this version are already present in production, or explicitly list and review any genuinely pending migration before proceeding.

**Gate:** A reviewer can identify the exact candidate commit and every production-facing change; no unresolved conflict or unexplained migration remains.

### Task 2: Correct and lock the production deployment contract

**Files:**
- `scripts/deploy-scoped-release.mjs`
- `scripts/deploy-runtime.mjs`
- `scripts/deploy-migrations.mjs`
- `scripts/deploy-docker-flow.spec.mjs`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`

- [ ] Point Docker readiness and rollback probes at `http://127.0.0.1:3000/api/health/ready`, unwrap `body.data`, and require the candidate commit and embedded worker readiness.
- [ ] Keep Docker ownership checks for project `rdchaimen666com`, API container `activity-api`, Nginx static mounts inside the project webroot, and unchanged unrelated-container inventory.
- [ ] Verify the reviewed migration allowlist against the production read-only migration list; reject unknown, duplicate, or out-of-order migrations. With the observed current database state, require zero pending migrations.
- [ ] Pin UniApp's peer dependency to Vite `5.2.8` and verify `npm ci` succeeds from `apps/mobile/package-lock.json` without force flags.
- [ ] Run deployment policy, migration policy, Docker rollback, API and mobile tests.

**Gate:** Node 22 release-policy tests pass, mobile lockfile installation is reproducible, and a test proves no command restarts `activity-nginx`, `activity-mysql`, Redis, or unrelated containers.

### Task 3: Build one immutable release candidate

**Files:**
- `apps/api/dist/**`
- `apps/admin/dist/**`
- `apps/mobile/dist/build/h5/**`
- `scripts/assemble-scoped-release.mjs`
- `scripts/release-metadata.mjs`

- [ ] Use Node 22 and lockfiles to build API, Admin, and H5 from the same reviewed source commit.
- [ ] Run the full API test suite and relevant H5 launch-screen, navigation, message, profile, admin payment/SMS settings, and deployment tests.
- [ ] Verify each static `version.json` identifies the reviewed source commit and that the H5 entry references existing hashed assets.
- [ ] Commit only reviewed source and plan changes; rebuild after the final commit so every artifact reports that exact commit.
- [ ] Assemble a release bundle with SHA-256 manifest and verify the archive contents contain only API/Admin/H5 assets, required covers, and scoped release scripts.

**Gate:** All three builds and required tests pass; release archive and manifest agree on source commit and file hashes; no credentials or `node_modules` are present.

### Task 4: Prepare production backup and prove deployment target

**Production actions:** Aliyun ECS `i-j6c2byx7kjyfueoxpwzc`, project `rdchaimen666com`.

- [ ] Transfer the reviewed release archive to the activity system's private release directory and verify its SHA-256 against the local manifest.
- [ ] Run scoped `prepare`; verify database identity, exact pending migration list, API container ownership, and Nginx static mount targets.
- [ ] Require successful compressed database backup plus previous API/Admin/H5/config backup before any production change.
- [ ] Confirm `prepare` has not restarted or recreated any container and has not written application rows or run migrations.

**Gate:** The release is staged, backups pass integrity checks, migration pending list is empty (or exactly reviewed), and unrelated container IDs/start times are unchanged.

### Task 5: Publish and verify the live operating system

- [ ] Run scoped `migrate` only if the reviewed pending list is non-empty; otherwise record zero applied migrations.
- [ ] Run scoped `publish`; it may recreate only `activity-api` and replace only Admin/H5 static files mounted from the activity project.
- [ ] Verify `https://rd.chaimen666.com/api/health/ready` reports ready, the exact candidate commit, database up, and worker ready.
- [ ] Verify `/version.json` for H5 and `/admin/version.json` for Admin report the same candidate commit.
- [ ] In a browser, inspect the launch screen, home, message inbox, profile and activity detail; in the Admin UI, confirm SMS and platform payment settings load with secrets masked and save/test controls available.
- [ ] Recheck all container IDs, start times and restart counts. `activity-nginx`, `activity-mysql`, Redis and unrelated services must be unchanged.
- [ ] Keep real payment disabled. Do not claim SMS login/payment is live until an administrator has entered real provider credentials and the backend's actual provider test and payment preflight pass.

**Gate:** Public routes, backend readiness, matching release IDs, admin configuration UI, and no-impact container inventory are all directly verified.

### Task 6: Roll back on a failed release gate and retain evidence

- [ ] If any health, commit, UI or unrelated-container check fails, stop the release and run only the scoped rollback for this release ID.
- [ ] Verify the prior API commit, static assets and environment configuration are restored; do not revert database migrations or remove the backup.
- [ ] Re-run readiness and unrelated-container inventory checks, then record exact evidence and the remaining blocker.
- [ ] On successful verification, preserve the database and artifact rollback package through the agreed observation period; do not delete production test data.

**Gate:** Either the candidate release passes every Task 5 condition, or the prior live version is restored and healthy with all backups retained.
