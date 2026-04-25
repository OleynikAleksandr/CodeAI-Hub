# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`
  - `doc/SolidWorks-WorkFlow/Plans/Provider_Instruction_Stack_Tuning_Tests.md`
  - `doc/SolidWorks-WorkFlow/Plans/Codex_AppServer_Capabilities_Analysis.md`
  - `doc/SolidWorks-WorkFlow/Plans/CrossProvider_Common_Capabilities.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream — микрозадачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту разработки конкретная подзадача Stream затрагивает больше 3 файлов, задача должна быть разбита на более мелкие и список задач в Stream переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Ручной прогон этих команд обычно не нужен, кроме диагностики.
- После каждого нового Codex flag experiment обязателен новый релизный пакет для пользовательского retest.
- После каждого пользовательского retest Codex анализирует `.jsonl`, `.md` и provider-home rollout JSONL, затем фиксирует результат в этом плане.
- **Commit**: после зеленых gates — Git Commit с максимально релевантным описанием; `todo-plan.md` обновляется сразу после коммита с hash/status.
- Stream закрывается только после проверки лога пользователем и решения `works` / `partial` / `no-op` / `rejected` / `unsafe`.
- Phase закрывается на чистом дереве и с актуальным `doc/Sessions/SessionXXX.md`.

## Phase 0 — Codex Instruction Stack Scope Bootstrap (owner: Codex, updated: 2026-04-25)

### Stream: Planning And Recovery Context

1. [DONE] Create Codex-specific planning doc, active TODO plan, and Docs Index entry — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit message: `docs: plan codex instruction stack flag tests`
2. [IN_PROGRESS] Git Commit: `docs: plan codex instruction stack flag tests` (hash: TBD)
3. [TODO] Create Session004 recovery report for the active Codex scope — scope: `doc/Sessions/Session004.md`; commit message: `docs: record codex instruction stack session setup`
4. [TODO] Git Commit: `docs: record codex instruction stack session setup` (hash: TBD)

## Phase 1 — X8 Disable Project AGENTS Discovery (owner: Codex, updated: 2026-04-25)

### Stream: Diagnostic Flag X8

1. [TODO] Add diagnostic-only `thread/start.config.project_doc_max_bytes = 0` for Codex native capture — scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, focused test file if required, `doc/TODO/todo-plan.md`; commit message: `test: add codex project doc max bytes capture flag`
2. [TODO] Git Commit: `test: add codex project doc max bytes capture flag` (hash: TBD)
3. [TODO] Build a new release package for X8 retest and record VSIX/tarball paths — scope: release metadata docs, `doc/TODO/todo-plan.md`; commit message: `chore: build codex project doc flag test release`
4. [TODO] Git Commit: `chore: build codex project doc flag test release` (hash: TBD)
5. [TODO] Analyze user-provided X8 native capture logs and classify result — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`, `doc/TODO/todo-plan.md`; commit message: `docs: record codex project doc flag evidence`
6. [TODO] Git Commit: `docs: record codex project doc flag evidence` (hash: TBD)

## Phase 2 — X2 Developer Instructions (owner: Codex, updated: 2026-04-25)

### Stream: Diagnostic Flag X2

1. [TODO] Add diagnostic-only `thread/start.developerInstructions` after X8 result is known — scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, focused test file if required, `doc/TODO/todo-plan.md`; commit message: `test: add codex developer instructions capture flag`
2. [TODO] Git Commit: `test: add codex developer instructions capture flag` (hash: TBD)
3. [TODO] Build a new release package for X2 retest and record VSIX/tarball paths — scope: release metadata docs, `doc/TODO/todo-plan.md`; commit message: `chore: build codex developer instructions test release`
4. [TODO] Git Commit: `chore: build codex developer instructions test release` (hash: TBD)
5. [TODO] Analyze user-provided X2 native capture logs and classify result — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`, `doc/TODO/todo-plan.md`; commit message: `docs: record codex developer instructions evidence`
6. [TODO] Git Commit: `docs: record codex developer instructions evidence` (hash: TBD)

## Phase 3 — Next Flag Selection (owner: Codex, updated: 2026-04-25)

### Stream: Evidence-Gated Continuation

1. [TODO] Based on X8/X2 evidence, choose the next single flag or minimal combination (`X3`, `X1`, or fallback) and rewrite this Phase into concrete microtasks — scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`; commit message: `docs: select next codex instruction stack flag`
2. [TODO] Git Commit: `docs: select next codex instruction stack flag` (hash: TBD)
