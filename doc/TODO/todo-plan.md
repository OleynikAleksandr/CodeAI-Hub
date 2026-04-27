# Development TODO Plan

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_Spark_Reasoning_Summary_Config_1.2.97.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Codex_Spark_Reasoning_Summary_Config_1.2.97.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/BugRegistry.md`
- Only this list is the context source for the current execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Every implementation task must touch no more than 3 files. If implementation proves wider, split before editing.
- Every implementation task is followed by a separate `Git Commit` item.
- Do not bypass Husky hooks or quality gates.
- Do not manually edit package versions; release scripts own version bumps.
- Keep docs synchronized in the same commit when logic changes.

## Phase 1 - Spark Summary Config Compatibility (owner: Codex, updated: 2026-04-27)

### Stream: Spark config-level summary without non-Spark regression

1. [IN_PROGRESS] Open planning/todo scope and register Spark visible-reasoning follow-up bug; scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Spark_Reasoning_Summary_Config_1.2.97.md`, `doc/TODO/todo-plan.md`, `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: plan codex spark summary config fix`
2. [TODO] Git Commit: `docs: plan codex spark summary config fix` (hash: TBD)
3. [TODO] Add Spark-safe provider-home summary config materialization before app-server startup; scope: `packages/Codex_AppServer_Module/src/app-server/process/codex-provider-home-config.ts`, `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`, `packages/Codex_AppServer_Module/src/app-server/process/codex-provider-home-config.test.ts`; expected commit message: `fix: enable spark reasoning summary via provider config`
4. [TODO] Git Commit: `fix: enable spark reasoning summary via provider config` (hash: TBD)
5. [TODO] Update Codex SSOT docs and bug record for Spark config-level summary behavior; scope: `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: document spark summary config path`
6. [TODO] Git Commit: `docs: document spark summary config path` (hash: TBD)
7. [TODO] Prepare and build release `1.2.97`; scope: `README.md`, `CHANGELOG.md`, `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, `doc/tmp/releases/`; expected commit message: `chore: build codex spark summary config release`
8. [TODO] Git Commit: `chore: build codex spark summary config release` (hash: TBD)
