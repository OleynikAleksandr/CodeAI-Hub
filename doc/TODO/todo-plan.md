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

1. [DONE] Open planning/todo scope and register Spark visible-reasoning follow-up bug; scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Spark_Reasoning_Summary_Config_1.2.97.md`, `doc/TODO/todo-plan.md`, `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: plan codex spark summary config fix`
2. [DONE] Git Commit: `docs: plan codex spark summary config fix` (hash: `647c441df`)
3. [DONE] Add Spark-safe provider-home summary config materialization before app-server startup and lock non-Spark runtime summary behavior with a regression test; scope: `packages/Codex_AppServer_Module/src/app-server/process/codex-provider-home-config.ts`, `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`, `packages/Codex_AppServer_Module/src/app-server/process/codex-provider-home-config.test.ts`, `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.test.ts`; expected commit message: `fix: enable spark reasoning summary via provider config`; result: provider-home `config.toml` now materializes `model_reasoning_summary = "auto" | "none"` from shared Codex settings before app-server startup, Spark `turn/start.summary` remains omitted, and a non-Spark runtime regression test confirms `gpt-5.5` still receives `summary: "detailed"`
4. [DONE] Git Commit: `fix: enable spark reasoning summary via provider config` (hash: `31d1159b7`)
5. [DONE] Update Codex module SSOT docs for Spark config-level summary behavior; scope: `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: document spark summary config path`; result: Codex flags now document Spark's provider-home summary path and non-Spark per-turn summary preservation
6. [DONE] Git Commit: `docs: document spark summary config path` (hash: `b20adf514`)
7. [DONE] Update SystemArchitecture and bug record for Spark config-level summary behavior; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/BugRegistry.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: close spark summary bug record`; result: SystemArchitecture now describes non-Spark turn summary plus Spark provider-home summary split, and `BUG-2026-04-27-02` is closed for release `1.2.97`
8. [DONE] Git Commit: `docs: close spark summary bug record` (hash: `dc1806272`)
9. [DONE] Prepare release docs for `1.2.97`; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: prepare codex spark summary config release`; result: README current release and CHANGELOG now target `1.2.97` before version bump automation
10. [DONE] Git Commit: `docs: prepare codex spark summary config release` (hash: `9747cf8e5`)
11. [IN_PROGRESS] Build release `1.2.97`; scope: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, `doc/tmp/releases/`, `doc/TODO/todo-plan.md`; expected commit message: `chore: build codex spark summary config release`; result so far: `./scripts/build-all.sh` completed and produced provider/core/UI/CEF tarballs for `1.2.97`
12. [TODO] Git Commit: `chore: build codex spark summary config release` (hash: TBD)
