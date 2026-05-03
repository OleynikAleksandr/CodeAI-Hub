# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Execution Scope Status:** ACTIVE
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md` accepted rev1
- **Branch:** `main`
- **Target outcome:** Plan Orchestrator replaces manual session-report recovery and manual `todo-plan.md` progress/hash updates with deterministic scripts and hook enforcement.
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `.husky/pre-commit`
  - `.husky/commit-msg`
  - `.husky/pre-push`
  - `scripts/check-commit-message.sh`
  - `package.json`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Recovery Pack

- **Current phase/stream/task:** Phase 1 / Stream 1 / Task 1.
- **Next action:** implement read-only plan state parser.
- **Last completed commit in this cycle:** none yet.
- **Important constraint:** пока Plan Orchestrator не реализован и `AGENTS.md` не изменён, текущий cycle использует старую технологию session reports.
- **Do not implement before approval:** planning-doc уже утверждён пользователем 2026-05-03; реализацию можно начинать с Phase 1.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase. В каждой Phase некоторое количество Stream, в каждом Stream — микрозадачи.
- Каждая микрозадача должна затрагивать не более 3 файлов. Если по факту разработки задача разрастается — её нужно разбить на более мелкие и список задач переписать до реализации.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Cluster-modular / minimal-touch invariant:** новую логику добавлять в новые micro-scripts / helpers; существующие hook-файлы трогать только как thin delegation к новым скриптам.
- **No manual bypass:** пока Orchestrator не включён, обычные Husky gates не обходить. После Phase 3 direct `git commit` будет блокироваться для active plan.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, staged formatting.
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`.
  - После Phase 3 в hooks добавляются `plan:hook:*`.
- **Таргетные проверки** перед закрытием Stream/Phase: focused Node tests для `scripts/plan-orchestrator`, `npm run plan:validate`, `npm run check:architecture`, `npm run lint`, `npm run check:knip`.
- **Real-time документация:** изменения process lifecycle требуют синхронного обновления `AGENTS.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md` и planning-doc/SSOT, указанных в задачах.
- **Release Build:** перед релизной сборкой обновить README.md и CHANGELOG.md на будущую версию = текущая версия из `package.json` + 1. Затем выполнить release checklist из AGENTS.md.
- **Постоянное обновление:** до внедрения Plan Orchestrator статусы и hash обновляются вручную по старому процессу; после внедрения — только через `npm run plan:*`.
- **Финальные Stream обязательны:** `Release Build`, `User Visual Acceptance Testing`, `Scope Closeout`.

---

## Phase 1 — Read-only Plan Parser And Validator (owner: Codex, updated: 2026-05-03)

### Stream 1 — Plan State Parser

1. [TODO] Создать parser/types для machine-owned `codeai-plan-state` block: `scripts/plan-orchestrator/plan-state-types.mjs`, `scripts/plan-orchestrator/plan-state-parser.mjs`, `scripts/plan-orchestrator/plan-state-parser.test.mjs`; покрыть valid/missing/malformed JSON block and schema version checks (scope: 3 files; expected commit: `feat: add plan state parser`).
2. [TODO] Git Commit: `feat: add plan state parser` (hash: TBD)
3. [TODO] Создать read-only validator core: `scripts/plan-orchestrator/plan-validator.mjs`, `scripts/plan-orchestrator/plan-git-state.mjs`, `scripts/plan-orchestrator/plan-validator.test.mjs`; проверить statuses, unique task ids, paired Git Commit items, branch/head binding, and debt absence in normal mode (scope: 3 files; expected commit: `feat: add plan state validator`).
4. [TODO] Git Commit: `feat: add plan state validator` (hash: TBD)
5. [TODO] Добавить CLI entrypoint and npm scripts: `scripts/plan-orchestrator/plan-cli.mjs`, `package.json`, `package-lock.json`; команды `plan:status` and `plan:validate` пока read-only and non-hook blocking (scope: 3 files; expected commit: `feat: add plan status and validate commands`).
6. [TODO] Git Commit: `feat: add plan status and validate commands` (hash: TBD)

### Stream 2 — Read-only Verification And Docs

1. [TODO] Запустить focused проверки `node --test scripts/plan-orchestrator/*.test.mjs`, `npm run plan:status`, `npm run plan:validate`; обновить `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md` если parser/validator contract уточнился (scope: tests + 1 planning-doc if needed; expected commit: `test: verify plan parser and validator`).
2. [TODO] Git Commit: `test: verify plan parser and validator` (hash: TBD)

---

## Phase 2 — Commit Transaction And Repair (owner: Codex, updated: 2026-05-03)

### Stream 3 — Markdown State Updates

1. [TODO] Создать markdown updater для task/commit transitions: `scripts/plan-orchestrator/plan-markdown-updater.mjs`, `scripts/plan-orchestrator/plan-task-locator.mjs`, `scripts/plan-orchestrator/plan-markdown-updater.test.mjs`; поддержать task DONE, commit PENDING/DONE, hash insertion, next task IN_PROGRESS (scope: 3 files; expected commit: `feat: add plan markdown updater`).
2. [TODO] Git Commit: `feat: add plan markdown updater` (hash: TBD)

### Stream 4 — Plan Commit Transaction

1. [TODO] Реализовать transaction/debt primitives: `scripts/plan-orchestrator/plan-debt.mjs`, `scripts/plan-orchestrator/plan-transaction.mjs`, `scripts/plan-orchestrator/plan-transaction.test.mjs`; debt file path `.git/codeai-plan-debt`, JSON payload with task id, expected message, pre-commit head and transaction stage (scope: 3 files; expected commit: `feat: add plan transaction debt state`).
2. [TODO] Git Commit: `feat: add plan transaction debt state` (hash: TBD)
3. [TODO] Реализовать `plan:commit` orchestration: `scripts/plan-orchestrator/plan-commit.mjs`, `scripts/plan-orchestrator/plan-commit.test.mjs`, `scripts/plan-orchestrator/plan-cli.mjs`; validate staged scope, run `git commit -m`, read hash, finalize plan, remove debt (scope: 3 files; expected commit: `feat: add plan commit orchestrator`).
4. [TODO] Git Commit: `feat: add plan commit orchestrator` (hash: TBD)

### Stream 5 — Repair Command

1. [TODO] Реализовать `plan:repair`: `scripts/plan-orchestrator/plan-repair.mjs`, `scripts/plan-orchestrator/plan-repair.test.mjs`, `scripts/plan-orchestrator/plan-cli.mjs`; support commit-succeeded/hash-missing, pending commit, next pointer missing, and unsafe BLOCKED fallback (scope: 3 files; expected commit: `feat: add plan repair command`).
2. [TODO] Git Commit: `feat: add plan repair command` (hash: TBD)

---

## Phase 3 — Hook Enforcement (owner: Codex, updated: 2026-05-03)

### Stream 6 — Pre-commit And Commit-msg Guards

1. [TODO] Добавить pre-commit plan guard: `scripts/plan-orchestrator/plan-hook-pre-commit.mjs`, `.husky/pre-commit`, `scripts/plan-orchestrator/plan-hook-pre-commit.test.mjs`; guard runs before architecture/lint gates and blocks debt/direct commit/scope mismatch (scope: 3 files; expected commit: `feat: enforce plan state before commit`).
2. [TODO] Git Commit: `feat: enforce plan state before commit` (hash: TBD)
3. [TODO] Добавить commit-msg plan guard while preserving Claude co-author cleanup: `scripts/plan-orchestrator/plan-hook-commit-msg.mjs`, `.husky/commit-msg`, `scripts/check-commit-message.sh`; exact expected message check and allowed Orchestrator transaction context (scope: 3 files; expected commit: `feat: enforce plan commit messages`).
4. [TODO] Git Commit: `feat: enforce plan commit messages` (hash: TBD)

### Stream 7 — Post-commit And Pre-push Guards

1. [TODO] Добавить post-commit finalization hook: `scripts/plan-orchestrator/plan-hook-post-commit.mjs`, `.husky/post-commit`, `scripts/plan-orchestrator/plan-hook-post-commit.test.mjs`; hook finalizes Orchestrator transaction, never amends and never creates commits (scope: 3 files; expected commit: `feat: finalize plan state after commit`).
2. [TODO] Git Commit: `feat: finalize plan state after commit` (hash: TBD)
3. [TODO] Добавить pre-push plan consistency guard: `scripts/plan-orchestrator/plan-hook-pre-push.mjs`, `.husky/pre-push`, `scripts/plan-orchestrator/plan-hook-pre-push.test.mjs`; guard runs before duplication/link checks and blocks debt/inconsistent active state/branch mismatch (scope: 3 files; expected commit: `feat: enforce plan state before push`).
4. [TODO] Git Commit: `feat: enforce plan state before push` (hash: TBD)

---

## Phase 4 — Snapshots, Closeout, And Process Docs (owner: Codex, updated: 2026-05-03)

### Stream 8 — Snapshots And Closeout Commands

1. [TODO] Реализовать `plan:snapshot`: `scripts/plan-orchestrator/plan-snapshot.mjs`, `scripts/plan-orchestrator/plan-snapshot.test.mjs`, `scripts/plan-orchestrator/plan-cli.mjs`; write tracked snapshots under `doc/TODO/Snapshots/` with timestamp/branch/lastRecordedCommit (scope: 3 files; expected commit: `feat: add plan snapshot command`).
2. [TODO] Git Commit: `feat: add plan snapshot command` (hash: TBD)
3. [TODO] Реализовать `plan:closeout`: `scripts/plan-orchestrator/plan-closeout.mjs`, `scripts/plan-orchestrator/plan-closeout.test.mjs`, `scripts/plan-orchestrator/plan-cli.mjs`; require explicit user acceptance text, archive active plan, reset `doc/TODO/todo-plan.md`, print docs requiring commit (scope: 3 files; expected commit: `feat: add plan closeout command`).
4. [TODO] Git Commit: `feat: add plan closeout command` (hash: TBD)

### Stream 9 — AGENTS And Template Migration

1. [TODO] Обновить process documentation: `AGENTS.md`, `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; remove session reports as active recovery mechanism, install plan-first recovery, add new `todo-plan.md` template and Plan Orchestrator commands (scope: 3 docs; expected commit: `docs: document plan-first session recovery`).
2. [TODO] Git Commit: `docs: document plan-first session recovery` (hash: TBD)

---

## Phase 5 — Active Plan Tracking Decision (owner: Codex, updated: 2026-05-03)

### Stream 10 — Ignored Active Plan Migration

1. [TODO] Подготовить ignored active plan transition: `.gitignore`, `doc/TODO/Snapshots/README.md`, `scripts/plan-orchestrator/plan-validator.mjs`; add ignore rule for active `doc/TODO/todo-plan.md`, keep snapshots/archive tracked, validator requires snapshots/closeout when active plan is ignored (scope: 3 files; expected commit: `feat: support ignored active todo plan`).
2. [TODO] Git Commit: `feat: support ignored active todo plan` (hash: TBD)
3. [TODO] Выполнить tracking migration: `doc/TODO/todo-plan.md`, `doc/TODO/Snapshots/README.md`, `.gitignore`; use `git rm --cached doc/TODO/todo-plan.md` only after safeguards pass, leave local active plan present and reset-state reproducible (scope: 3 paths; expected commit: `chore: untrack active todo plan state`).
4. [TODO] Git Commit: `chore: untrack active todo plan state` (hash: TBD)

---

## Phase 6 — End-to-End Verification (owner: Codex, updated: 2026-05-03)

### Stream 11 — Orchestrator E2E Tests

1. [TODO] Добавить end-to-end dry-run harness for Plan Orchestrator: `scripts/plan-orchestrator/plan-e2e-harness.mjs`, `scripts/plan-orchestrator/plan-e2e.test.mjs`, `package.json`; simulate direct commit block, `plan:commit`, crash debt, `plan:repair`, pre-push debt block (scope: 3 files; expected commit: `test: cover plan orchestrator e2e workflow`).
2. [TODO] Git Commit: `test: cover plan orchestrator e2e workflow` (hash: TBD)
3. [TODO] Финальная targeted verification: `node --test scripts/plan-orchestrator/*.test.mjs`, `npm run plan:status`, `npm run plan:validate`, `npm run check:architecture`, `npm run lint`, `npm run check:knip`; update `doc/TODO/todo-plan.md` and planning-doc with final evidence if needed (scope: tests + ≤2 docs; expected commit: `test: verify plan orchestrator implementation`).
4. [TODO] Git Commit: `test: verify plan orchestrator implementation` (hash: TBD)

---

## Phase 7 — Release And Acceptance (owner: Codex + Oleksandr, updated: 2026-05-03)

### Stream 12 — Release Build

1. [TODO] Перед релизной сборкой определить будущую версию из текущего `package.json` + 1; обновить `README.md` и `CHANGELOG.md` на будущую версию; обновить связанные docs if needed (scope: 2 release docs + docs if needed; expected commit: `docs: prepare plan orchestrator release`).
2. [TODO] Git Commit: `docs: prepare plan orchestrator release` (hash: TBD)
3. [TODO] На clean tree запустить `./scripts/build-all.sh`; проверить fresh tarball'ы в `~/.codeai-hub/releases/` and `doc/tmp/releases/`; зафиксировать version/manifest changes (scope: command + generated release artifacts; expected commit: `chore: bump release manifests for plan orchestrator`).
4. [TODO] Git Commit: `chore: bump release manifests for plan orchestrator` (hash: TBD)
5. [TODO] Запустить `./scripts/build-release.sh --use-current-version`; проверить `Step 7: Verifying SDK exclusions`, `Step 7.5: Validating local artefacts`, `Removing dev dependencies before packaging`, `✅ Package created`; записать VSIX path and keep scope ACTIVE until user retest (scope: release command + todo/session docs; expected commit: `docs: record plan orchestrator release build`).
6. [TODO] Git Commit: `docs: record plan orchestrator release build` (hash: TBD)

### Stream 13 — User Visual Acceptance Testing

1. [TODO] Пользователь устанавливает VSIX релиза Plan Orchestrator и проверяет обычный development flow: старт новой сессии с чтения `doc/TODO/todo-plan.md`, active recovery without session report, `plan:status` clarity, and expected next action.
2. [TODO] Пользователь проверяет commit workflow: попытка direct `git commit` при ACTIVE plan блокируется, `npm run plan:commit -- "<message>"` двигает task/commit/hash/current pointer автоматически.
3. [TODO] Пользователь проверяет failure behavior: simulated/forced debt blocks next commit/push and `npm run plan:repair` restores consistent plan state.
4. [TODO] Пользователь даёт explicit acceptance или failed-retest feedback; результат фиксируется в `doc/TODO/todo-plan.md` and old-style session report until Plan Orchestrator closeout replaces it (scope: docs; expected commit: `docs: record plan orchestrator visual acceptance`).
5. [TODO] Git Commit: `docs: record plan orchestrator visual acceptance` (hash: TBD)

### Stream 14 — Scope Closeout

1. [BLOCKED] После explicit user acceptance выполнить closeout по текущему старому процессу или, если Plan Orchestrator уже accepted enough, через `npm run plan:closeout`: archive active plan, update planning-doc disposition, update `Docs_Index.md`, reset active plan state (scope: docs; expected commit: `docs: archive plan orchestrator scope`).
2. [TODO] Git Commit: `docs: archive plan orchestrator scope` (hash: TBD)
3. [TODO] Создать final session report по старому процессу только если `AGENTS.md` migration ещё не принята в установленном релизе; иначе closeout report belongs to archived plan snapshot, not `doc/Sessions/`.

---

## Notes

- Phase 5 может быть перенесена после release, если ignored active plan migration окажется слишком рискованной для первого Plan Orchestrator релиза.
- Если hook enforcement мешает текущему development workflow, временно разрешается advisory mode, но только через явный плановый task and commit.
