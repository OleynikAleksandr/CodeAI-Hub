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
- Перед следующим flag experiment нужен no-flag observability baseline: native capture `.jsonl` / `.md` обязан сам содержать provider-home rollout context, без ручного поиска второго файла.
- **Commit**: после зеленых gates — Git Commit с максимально релевантным описанием; `todo-plan.md` обновляется сразу после коммита с hash/status.
- Stream закрывается только после проверки лога пользователем и решения `works` / `partial` / `no-op` / `rejected` / `unsafe`.
- Phase закрывается на чистом дереве и с актуальным `doc/Sessions/SessionXXX.md`.

## Phase 0 — Codex Instruction Stack Scope Bootstrap (owner: Codex, updated: 2026-04-25)

### Stream: Planning And Recovery Context

1. [DONE] Create Codex-specific planning doc, active TODO plan, and Docs Index entry — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit message: `docs: plan codex instruction stack flag tests`
2. [DONE] Git Commit: `docs: plan codex instruction stack flag tests` (hash: `2532b0e4c`)
3. [DONE] Create Session004 recovery report for the active Codex scope — scope: `doc/Sessions/Session004.md`; commit message: `docs: record codex instruction stack session setup`
4. [DONE] Session report is maintained as ignored filesystem recovery artifact per session lifecycle; no git commit required until closeout policy changes (hash: N/A)

## Phase 1 — X8 Disable Project AGENTS Discovery (owner: Codex, updated: 2026-04-25)

### Stream: Diagnostic Flag X8

1. [DONE] Add diagnostic-only `thread/start.config.project_doc_max_bytes = 0` for Codex native capture — scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`, `doc/TODO/todo-plan.md`; verification: `npm run build --workspace=@codeai-hub/codex-app-server-module`, `node --test packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`; commit message: `test: add codex project doc max bytes capture flag`
2. [DONE] Git Commit: `test: add codex project doc max bytes capture flag` (hash: `6c3755d5f`)
3. [DONE] Prepare X8 release notes for future version `1.2.71` — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit message: `docs: prepare codex project doc flag release notes`
4. [DONE] Git Commit: `docs: prepare codex project doc flag release notes` (hash: `53e5b151e`)
5. [DONE] Build a new release package for X8 retest and record VSIX/tarball paths — scope: release-generated version files, `doc/TODO/todo-plan.md`; release target: `1.2.71`; artifacts: `codeai-hub-1.2.71.vsix`, `doc/tmp/releases/codex-module-1.2.71.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.71.tar.bz2`, `doc/tmp/releases/project-manager-1.2.71.tar.bz2`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit message: `chore: build codex project doc flag test release`
6. [DONE] Git Commit: `chore: build codex project doc flag test release` (hash: `15340d0ac`)
7. [DONE] Analyze user-provided X8 native capture logs and classify result — result: `works` for disabling project `AGENTS.md` discovery; evidence: `thread/start.request.config.project_doc_max_bytes = 0`, `instructionSources: []`, provider-home `turn_context.user_instructions.length = 0`, native tools hash unchanged; scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`, `doc/TODO/todo-plan.md`; commit message: `docs: record codex project doc flag evidence`
8. [DONE] Git Commit: `docs: record codex project doc flag evidence` (hash: `df8d4529e`)

Note: X8 is historical evidence only. Per user decision after reviewing the artifact shape, the active path resets to a no-flag observability baseline before any further instruction-stack flag tests.

## Phase 2 — Full Codex Capture Observability Baseline (owner: Codex, updated: 2026-04-25)

### Stream: Provider-Home Rollout Context In Capture

1. [DONE] Remove the diagnostic X8 `project_doc_max_bytes = 0` flag and embed provider-home rollout JSONL into the Codex native capture artifact — scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`, `doc/TODO/todo-plan.md`; verification: `npm run build --workspace=@codeai-hub/codex-app-server-module`, `node --test packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`; commit message: `fix: record codex provider home rollout context`
2. [DONE] Git Commit: `fix: record codex provider home rollout context` (hash: `91e3dfd0f`)
3. [DONE] Prepare release notes for future version `1.2.72` — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit message: `docs: prepare codex capture context release notes`
4. [DONE] Git Commit: `docs: prepare codex capture context release notes` (hash: `91e3dfd0f`)
5. [DONE] Build a new no-flag baseline release package for full capture retest and record VSIX/tarball paths — scope: release-generated version files, `doc/TODO/todo-plan.md`; release target: `1.2.72`; artifacts: `codeai-hub-1.2.72.vsix`, `doc/tmp/releases/codex-module-1.2.72.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.72.tar.bz2`, `doc/tmp/releases/project-manager-1.2.72.tar.bz2`, `doc/tmp/releases/vscode-webview-1.2.72.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.2.72.tar.bz2`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit message: `chore: build codex full capture baseline release`
6. [DONE] Git Commit: `chore: build codex full capture baseline release` (hash: `eea3056ac`)
7. [DONE] Analyze user-provided no-flag baseline capture logs and verify markdown/jsonl include `codex_provider_home_rollout_context` with full `AGENTS.md` / `turn_context.user_instructions` — result: `works`; evidence: `thread/start.request` has no `config`, `instructionSources` includes project `AGENTS.md`, markdown line `168` has `codex_provider_home_rollout_context`, line `236` has `# AGENTS.md instructions`, line `288` has `turn_context.user_instructions`, length `20885`, sha256 `5beabb3ca4f216b6f77d7b356454f7c42a289bf8da09d4510bb4cd74de210f39`; scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`, `doc/TODO/todo-plan.md`; commit message: `docs: record codex full capture baseline evidence`
8. [DONE] Git Commit: `docs: record codex full capture baseline evidence` (hash: `bc10e36ad`)

## Phase 3 — X8 Disable Project AGENTS With Full Capture Evidence (owner: Codex, updated: 2026-04-25)

### Stream: Diagnostic Flag X8 Retake

1. [DONE] Add diagnostic-only `thread/start.config.project_doc_max_bytes = 0` again, now with embedded provider-home rollout context available in the same capture artifact — scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`, `doc/TODO/todo-plan.md`; verification: `npm run build --workspace=@codeai-hub/codex-app-server-module`, `node --test packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`; commit message: `test: add codex project doc max bytes full capture flag`
2. [DONE] Git Commit: `test: add codex project doc max bytes full capture flag` (hash: `f098e3165`)
3. [DONE] Prepare release notes for future version `1.2.73` — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit message: `docs: prepare codex full capture project doc flag release notes`
4. [DONE] Git Commit: `docs: prepare codex full capture project doc flag release notes` (hash: `8937c24fb`)
5. [DONE] Build a new release package for X8 full-capture retest and record VSIX/tarball paths — scope: release-generated version files, `doc/TODO/todo-plan.md`; release target: `1.2.73`; artifacts: `codeai-hub-1.2.73.vsix`, `doc/tmp/releases/codex-module-1.2.73.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.73.tar.bz2`, `doc/tmp/releases/project-manager-1.2.73.tar.bz2`, `doc/tmp/releases/vscode-webview-1.2.73.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.2.73.tar.bz2`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit message: `chore: build codex full capture project doc flag release`
6. [DONE] Git Commit: `chore: build codex full capture project doc flag release` (hash: `9d02e3044`)
7. [DONE] Analyze user-provided X8 full-capture logs and verify markdown/jsonl include `config.project_doc_max_bytes = 0`, `instructionSources: []`, and embedded `codex_provider_home_rollout_context` with empty/no project `turn_context.user_instructions` — result: `works`; evidence: `2026-04-25T09-28-41-532Z-codex-native-request.md` line `58` has `project_doc_max_bytes = 0`, line `95` has `instructionSources: []`, line `169` has `codex_provider_home_rollout_context`; provider-home rollout line `5` has `turn_context` with no `user_instructions`; project `AGENTS.md` text absent from embedded rollout; scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`, `doc/TODO/todo-plan.md`; commit message: `docs: record codex full capture project doc flag evidence`
8. [IN_PROGRESS] Git Commit: `docs: record codex full capture project doc flag evidence` (hash: TBD)

## Phase 4 — X2 Developer Instructions (owner: Codex, updated: 2026-04-25)

### Stream: Diagnostic Flag X2

1. [TODO] Add diagnostic-only `thread/start.developerInstructions` after the X8 full-capture retest is verified — scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, focused test file if required, `doc/TODO/todo-plan.md`; commit message: `test: add codex developer instructions capture flag`
2. [TODO] Git Commit: `test: add codex developer instructions capture flag` (hash: TBD)
3. [TODO] Build a new release package for X2 retest and record VSIX/tarball paths — scope: release metadata docs, `doc/TODO/todo-plan.md`; commit message: `chore: build codex developer instructions test release`
4. [TODO] Git Commit: `chore: build codex developer instructions test release` (hash: TBD)
5. [TODO] Analyze user-provided X2 native capture logs and classify result — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`, `doc/TODO/todo-plan.md`; commit message: `docs: record codex developer instructions evidence`
6. [TODO] Git Commit: `docs: record codex developer instructions evidence` (hash: TBD)

## Phase 5 — Next Flag Selection (owner: Codex, updated: 2026-04-25)

### Stream: Evidence-Gated Continuation

1. [TODO] Based on X8/X2 evidence, choose the next single flag or minimal combination (`X3`, `X1`, or fallback) and rewrite this Phase into concrete microtasks — scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`; commit message: `docs: select next codex instruction stack flag`
2. [TODO] Git Commit: `docs: select next codex instruction stack flag` (hash: TBD)
