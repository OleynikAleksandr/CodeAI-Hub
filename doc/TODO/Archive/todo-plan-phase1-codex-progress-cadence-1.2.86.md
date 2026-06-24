# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Progress_Updates_Cadence_Tuning_1.2.86.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- Phase завершается на чистом дереве: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, фиксация артефактов и session report.
- **Real-time Документация:** изменения runtime-инструкций должны синхронно обновлять Codex module SSOT и этот todo-plan до коммита.

## Phase 1 — Codex progress update cadence tuning and release (owner: Codex, updated: 2026-04-27)

### Stream: Planning
1. [DONE] Create planning-doc and active todo-plan for Codex progress-update cadence tuning — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Progress_Updates_Cadence_Tuning_1.2.86.md`, `doc/TODO/todo-plan.md`; commit: `docs: plan codex progress cadence tuning`
2. [DONE] Git Commit: `docs: plan codex progress cadence tuning` (hash: `20751a137`)

### Stream: Prompt cadence
3. [DONE] Strengthen Progress Updates cadence rule with 30-second and 3-5 work-cycle fallback — scope: `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts`, `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`; commit: `fix: tighten codex progress update cadence`
4. [DONE] Git Commit: `fix: tighten codex progress update cadence` (hash: `16e7c4e6a`)

### Stream: Release 1.2.86
5. [DONE] Prepare release notes for `1.2.86` before build-all — scope: `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare codex progress cadence release notes`
6. [DONE] Git Commit: `docs: prepare codex progress cadence release notes` (hash: `23a93bff5`)
7. [DONE] Run `./scripts/build-all.sh` for `1.2.86` — scope: release scripts/generated artifacts, package/manifests, `doc/TODO/todo-plan.md`; commit: `chore: build codex progress cadence release`
8. [DONE] Git Commit: `chore: build codex progress cadence release` (hash: `a68019bb1`)
9. [DONE] Run `./scripts/build-release.sh --use-current-version` and verify VSIX/release artifacts — scope: release packaging output, `doc/TODO/todo-plan.md`; commit: `chore: package codex progress cadence vsix`
10. [DONE] Git Commit: `chore: package codex progress cadence vsix` (hash: `8892e5ffa`)
11. [DONE] Close active planning/todo scope and create session report — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Progress_Updates_Cadence_Tuning_1.2.86.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/Archive/todo-plan-phase1-codex-progress-cadence-1.2.86.md`, `legacy session report (removed)`; commit: `docs: close codex progress cadence release`
12. [DONE] Git Commit: `docs: close codex progress cadence release` (hash: recorded in `legacy session report (removed)`)
