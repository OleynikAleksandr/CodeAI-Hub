# Development TODO Plan

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Progress_Update_NonTerminal_1.2.95.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Progress_Update_NonTerminal_1.2.95.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/BugRegistry.md`
- Only this list is the context source for the current execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Every task must touch no more than 3 files. If implementation proves wider, split the task before editing.
- Every implementation task is followed by a separate `Git Commit` item.
- Do not bypass Husky hooks or quality gates.
- Do not manually edit package versions; release scripts own version bumps.
- Keep docs synchronized in the same commit when logic changes.

## Phase 1 - Non-Terminal Codex Progress Guard (owner: Codex, updated: 2026-04-27)

### Stream: Provider-level prompt rule

1. [DONE] Archive completed provider SDK log-removal scope and create the approved 1.2.95 planning/todo cycle; scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-phase4-provider-sdk-logs-removal-1.2.94.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Progress_Update_NonTerminal_1.2.95.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Provider_SDK_Logs_Removal_Refactor_1.2.94.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: start codex progress guard scope`
2. [DONE] Git Commit: `docs: start codex progress guard scope` (hash: `6474ade50`)
3. [DONE] Add a short non-terminal progress-update rule to the shared Codex workflow prompt and synced prompt artifact; scope: `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts`, `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md`; expected commit message: `fix: keep codex progress updates non-terminal`; result: prompt sections match and `npm run build --workspace @codeai-hub/codex-app-server-module` passed
4. [DONE] Git Commit: `fix: keep codex progress updates non-terminal` (hash: `145382b74`)
5. [DONE] Update Codex SSOT / Docs Index and verify no Description templates changed; scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: record codex progress update guard`; result: Codex module SSOT and Docs Index updated, tracked Description templates have no diff
6. [DONE] Git Commit: `docs: record codex progress update guard` (hash: `cdedac02e`)
7. [DONE] Prepare release docs for `1.2.95`; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: prepare codex progress guard release`; result: README current release and changelog updated to `1.2.95`
8. [DONE] Git Commit: `docs: prepare codex progress guard release` (hash: `4e557d65b`)
9. [DONE] Build release with normal version bump; scope: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, `doc/tmp/releases/`; expected commit message: `chore: build codex progress guard release`; result: `./scripts/build-all.sh` completed and produced `1.2.95` provider/core/UI/launcher tarballs; `./scripts/build-release.sh --use-current-version` passed with SDK exclusions verified, dev dependencies pruned before packaging, and `codeai-hub-1.2.95.vsix` created
10. [DONE] Git Commit: `chore: build codex progress guard release` (hash: `b914a0f3c`)

## Phase 2 - Codex Spark Summary Compatibility (owner: Codex, updated: 2026-04-27)

### Stream: Omit unsupported `summary` for Spark

1. [DONE] Register `BUG-2026-04-27-01` and document the active Spark `reasoning.summary` failure; scope: `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: track codex spark summary bug`; result: bug entry opened from user-provided provider error
2. [DONE] Git Commit: `docs: track codex spark summary bug` (hash: `87fc7d22a`)
3. [DONE] Omit `turn/start.summary` for `gpt-5.3-codex-spark` in normal runtime and native capture while preserving summary behavior for other Codex models; scope: `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-params.ts`, `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`; expected commit message: `fix: omit codex summary for spark`; result: normal runtime and native capture now omit `summary` only for `gpt-5.3-codex-spark`, while other models still receive the shared settings `summary`
4. [DONE] Git Commit: `fix: omit codex summary for spark` (hash: `8d4ff9c24`)
5. [DONE] Add regression tests and update SSOT docs for Spark summary omission; scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.test.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`, `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover codex spark summary omission`; result: normal runtime and native capture regression tests assert `summary` is omitted for `gpt-5.3-codex-spark`
6. [DONE] Git Commit: `test: cover codex spark summary omission` (hash: `b17ebd7c8`)
7. [DONE] Omit explicit `model_reasoning_summary` for `gpt-5.3-codex-spark` in Codex translation runtime while keeping it for other Codex translation models; scope: `packages/translation/src/codex-translation-runtime-home-facade.ts`, `packages/translation/src/codex-translation-runtime-home-facade.test.ts`, `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`, `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit message: `fix: omit codex translation summary for spark`; result: Spark translation temp `config.toml` no longer writes `model_reasoning_summary`, while non-Spark translation configs still write `model_reasoning_summary = "none"`
8. [DONE] Git Commit: `fix: omit codex translation summary for spark` (hash: `923e5983f`)
9. [DONE] Prepare and build release `1.2.96`; scope: `README.md`, `CHANGELOG.md`, `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, `doc/tmp/releases/`; expected commit message: `chore: build codex spark summary release`; result: release docs prepared for `1.2.96`, `BUG-2026-04-27-01` marked FIXED for `1.2.96`, `./scripts/build-all.sh` produced `1.2.96` provider/core/UI/launcher tarballs, and `./scripts/build-release.sh --use-current-version` passed with SDK exclusions verified, dev dependencies pruned before packaging, and `codeai-hub-1.2.96.vsix` created
10. [DONE] Git Commit: `chore: build codex spark summary release` (hash: `6792cd844`, actual message: `chore: prepare 1.2.96 release build`)
