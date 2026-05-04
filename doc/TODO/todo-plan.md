# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Execution Scope Status:** ACTIVE
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md` accepted rev2
- **Branch:** `main`
- **Target outcome:** локальный Plan Orchestrator для нашей работы в обычном Codex workflow: новый `AGENTS.md`, scripts under `scripts/plan-orchestrator/`, automatic `pre-commit` / `post-commit` plan-state handling.
- **Out of scope:** product runtime, VSIX/release build, `build-all.sh`, `build-release.sh`, app integration, provider modules, Project Manager UI, pre-push enforcement, snapshot/closeout automation commands beyond what is needed for this local workflow MVP.
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md`
  - `.husky/pre-commit`
  - `.husky/commit-msg`
  - `scripts/check-commit-message.sh`
  - `package.json`
  - `AGENTS.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Recovery Pack

- **Current phase/stream/task:** Phase 2 / Stream 3 / Task 1.
- **Next action:** implement markdown updater for task/commit transitions.
- **Last completed commit in this cycle:** `f7a964c82 feat: add plan status and validate commands`
- **Important constraint:** пока Plan Orchestrator не реализован и `AGENTS.md` не изменён, текущий cycle использует старую технологию session reports.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md`
- Каждая микрозадача должна затрагивать не более 3 файлов. Если задача разрастается — разбить её до реализации.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Scope boundary:** это repo/process tooling, а не фича приложения. Не менять runtime/app packages unless a test utility absolutely requires package scripts.
- **Hook boundary:** MVP wires `pre-commit` and `post-commit`; `commit-msg` may be touched only to preserve/compose existing message cleanup with plan message validation if needed. `pre-push` is out of this MVP.
- **No product release boundary:** README/CHANGELOG version bump, VSIX packaging and release tarballs are out of scope.
- **Финальные Stream обязательны:** `Tooling Verification`, `User Workflow Acceptance Testing`, `Scope Closeout`.

---

## Phase 1 — Local Plan State Parser And Validator (owner: Codex, updated: 2026-05-03)

### Stream 1 — Parser Foundation

1. [DONE] Обновить planning-doc на accepted rev2 с narrowed MVP scope: `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; зафиксировать, что scope = `AGENTS.md` + scripts + `pre-commit`/`post-commit`, без release/app integration/pre-push/snapshot automation. Verification: `git diff --check`; Husky pre-commit passed with existing near-limit warnings only (scope: 3 docs; expected commit: `docs: narrow plan orchestrator automation scope`).
2. [DONE] Git Commit: `docs: narrow plan orchestrator automation scope` (hash: 788ed3ec4)
3. [DONE] Уточнить context pack for local tooling scope: remove product SSOT required reads (`SystemArchitecture`, facade contract, `Docs_Index`) and keep only planning/hook/script/package/`AGENTS.md` context. Verification: Husky pre-commit passed with existing near-limit warnings only (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: trim plan orchestrator context pack`).
4. [DONE] Git Commit: `docs: trim plan orchestrator context pack` (hash: 9c433c463)
5. [DONE] Создать parser/types для machine-owned `codeai-plan-state` block: `scripts/plan-orchestrator/plan-state-types.mjs`, `scripts/plan-orchestrator/plan-state-parser.mjs`, `scripts/plan-orchestrator/plan-state-parser.test.mjs`; покрыть valid/missing/malformed JSON block and schema version checks. Verification: `node --test scripts/plan-orchestrator/plan-state-parser.test.mjs`; Husky pre-commit passed with existing near-limit warnings only (scope: 3 files; expected commit: `feat: add plan state parser`).
6. [DONE] Git Commit: `feat: add plan state parser` (hash: f654ad055)

### Stream 2 — Validator And Status

1. [DONE] Создать read-only validator and git-state helper: `scripts/plan-orchestrator/plan-validator.mjs`, `scripts/plan-orchestrator/plan-git-state.mjs`, `scripts/plan-orchestrator/plan-validator.test.mjs`; проверить statuses, current task, paired Git Commit item, branch/head binding and debt absence in normal mode. Verification: `node --test scripts/plan-orchestrator/plan-state-parser.test.mjs scripts/plan-orchestrator/plan-validator.test.mjs`; Husky pre-commit passed with existing near-limit warnings only (scope: 3 files; expected commit: `feat: add plan state validator`).
2. [DONE] Git Commit: `feat: add plan state validator` (hash: 3089a68d6)
3. [DONE] Добавить CLI entrypoint and npm scripts: `scripts/plan-orchestrator/plan-cli.mjs`, `package.json`, `package-lock.json`; команды `plan:status` and `plan:validate` read-only. Verification: `node --test scripts/plan-orchestrator/plan-state-parser.test.mjs scripts/plan-orchestrator/plan-validator.test.mjs`; `npm run plan:status` reports expected `PLAN_STATE_BLOCK_MISSING` until AGENTS/template migration adds the machine state block; Husky pre-commit passed with existing near-limit warnings only (scope: 2 files; expected commit: `feat: add plan status and validate commands`).
4. [DONE] Git Commit: `feat: add plan status and validate commands` (hash: f7a964c82)

---

## Phase 2 — Pre/Post Commit Automation (owner: Codex, updated: 2026-05-03)

### Stream 3 — Plan State Updates And Debt

1. [TODO] Создать markdown updater для task/commit transitions: `scripts/plan-orchestrator/plan-markdown-updater.mjs`, `scripts/plan-orchestrator/plan-task-locator.mjs`, `scripts/plan-orchestrator/plan-markdown-updater.test.mjs`; поддержать task DONE, commit PENDING/DONE, hash insertion, next task IN_PROGRESS (scope: 3 files; expected commit: `feat: add plan markdown updater`).
2. [TODO] Git Commit: `feat: add plan markdown updater` (hash: TBD)
3. [TODO] Реализовать transaction/debt primitives: `scripts/plan-orchestrator/plan-debt.mjs`, `scripts/plan-orchestrator/plan-transaction.mjs`, `scripts/plan-orchestrator/plan-transaction.test.mjs`; debt file path `.git/codeai-plan-debt`, JSON payload with task id, expected message, pre-commit head and transaction stage (scope: 3 files; expected commit: `feat: add plan transaction debt state`).
4. [TODO] Git Commit: `feat: add plan transaction debt state` (hash: TBD)

### Stream 4 — Pre-commit Guard

1. [TODO] Добавить pre-commit plan guard: `scripts/plan-orchestrator/plan-hook-pre-commit.mjs`, `.husky/pre-commit`, `scripts/plan-orchestrator/plan-hook-pre-commit.test.mjs`; guard runs before existing architecture/lint gates and blocks debt/direct commit/scope mismatch while preserving existing checks (scope: 3 files; expected commit: `feat: enforce plan state before commit`).
2. [TODO] Git Commit: `feat: enforce plan state before commit` (hash: TBD)
3. [TODO] Если pre-commit не может reliably validate commit message, добавить minimal commit-msg composition: `scripts/plan-orchestrator/plan-hook-commit-msg.mjs`, `.husky/commit-msg`, `scripts/check-commit-message.sh`; сохранить Claude co-author cleanup and add exact expected message validation (scope: 3 files; expected commit: `feat: enforce plan commit messages`).
4. [TODO] Git Commit: `feat: enforce plan commit messages` (hash: TBD)

### Stream 5 — Post-commit Finalization And Repair

1. [TODO] Добавить post-commit finalization hook: `scripts/plan-orchestrator/plan-hook-post-commit.mjs`, `.husky/post-commit`, `scripts/plan-orchestrator/plan-hook-post-commit.test.mjs`; hook writes current commit hash, advances plan state, never amends and never creates commits (scope: 3 files; expected commit: `feat: finalize plan state after commit`).
2. [TODO] Git Commit: `feat: finalize plan state after commit` (hash: TBD)
3. [TODO] Реализовать `plan:repair` for debt recovery: `scripts/plan-orchestrator/plan-repair.mjs`, `scripts/plan-orchestrator/plan-repair.test.mjs`, `scripts/plan-orchestrator/plan-cli.mjs`; support commit-succeeded/hash-missing, pending commit, next pointer missing, and unsafe BLOCKED fallback (scope: 3 files; expected commit: `feat: add plan repair command`).
4. [TODO] Git Commit: `feat: add plan repair command` (hash: TBD)

---

## Phase 3 — AGENTS.md Migration (owner: Codex, updated: 2026-05-03)

### Stream 6 — Plan-first Instructions

1. [TODO] Обновить `AGENTS.md` и docs: `AGENTS.md`, `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; remove session reports as active recovery mechanism, install plan-first recovery, add new `todo-plan.md` template and Plan Orchestrator commands (scope: 3 docs; expected commit: `docs: document plan-first session recovery`).
2. [TODO] Git Commit: `docs: document plan-first session recovery` (hash: TBD)

---

## Phase 4 — Tooling Verification And User Acceptance (owner: Codex + Oleksandr, updated: 2026-05-03)

### Stream 7 — Tooling Verification

1. [TODO] Запустить full local tooling verification без product packaging: `node --test scripts/plan-orchestrator/*.test.mjs`, `npm run plan:status`, `npm run plan:validate`, `npm run check:architecture`, `npm run lint`, `npm run check:knip`; записать результаты в `doc/TODO/todo-plan.md` (scope: commands + todo-plan; expected commit: `test: verify plan orchestrator local tooling`).
2. [TODO] Git Commit: `test: verify plan orchestrator local tooling` (hash: TBD)
3. [TODO] Провести controlled dogfood scenario in fixture repo: direct commit block, post-commit hash write, forced debt, `plan:repair`; не менять product runtime/app code (scope: test fixture + todo-plan; expected commit: `test: dogfood plan orchestrator commit hooks`).
4. [TODO] Git Commit: `test: dogfood plan orchestrator commit hooks` (hash: TBD)

### Stream 8 — User Workflow Acceptance Testing

1. [TODO] Пользователь проверяет Plan Orchestrator как repo/process tooling, без установки VSIX: старт новой сессии с чтения `doc/TODO/todo-plan.md`, active recovery without session report, `plan:status` clarity, expected next action.
2. [TODO] Пользователь проверяет commit workflow: direct `git commit` при ACTIVE plan блокируется, normal commit path через hooks updates plan automatically after commit, debt repair works.
3. [TODO] Пользователь даёт explicit acceptance или failed-retest feedback по удобству и надёжности workflow; результат фиксируется в `doc/TODO/todo-plan.md` using current old-style process until new process is accepted (scope: docs; expected commit: `docs: record plan orchestrator workflow acceptance`).
4. [TODO] Git Commit: `docs: record plan orchestrator workflow acceptance` (hash: TBD)

### Stream 9 — Scope Closeout

1. [BLOCKED] После explicit user acceptance archive active plan, update planning-doc disposition, update `Docs_Index.md`, reset active plan state. Пока Plan Orchestrator не принят в рабочем процессе, closeout выполняется старой технологией (scope: docs; expected commit: `docs: archive plan orchestrator scope`).
2. [TODO] Git Commit: `docs: archive plan orchestrator scope` (hash: TBD)
3. [TODO] Создать final session report по старому процессу только если `AGENTS.md` migration ещё не принята в рабочем процессе; иначе closeout report belongs to archived plan snapshot, not `doc/Sessions/`.
