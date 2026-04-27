# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_Progress_Updates_Instruction_Tuning_1.2.85.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Plans/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream — микро-задачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки конкретная подзадача Stream затрагивает больше 3 файлов, такая задача должна быть разбита на более мелкие и список задач в Stream переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с релевантным описанием; после коммита хеш и статус сразу заносятся сюда.
- Phase завершается на чистом дереве: запускаем `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, фиксируем артефакты и session report.
- **Real-time Документация:** изменения runtime-инструкций должны синхронно обновлять Codex module SSOT и этот todo-plan до коммита.

## Phase 1 — Codex progress update instruction tuning and release (owner: Codex, updated: 2026-04-27)

### Stream: Planning
1. [DONE] Create planning-doc and active todo-plan for experimental Codex progress-update wording — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Progress_Updates_Instruction_Tuning_1.2.85.md`, `doc/TODO/todo-plan.md`; commit: `docs: plan codex progress update instruction tuning`
2. [TODO] Git Commit: `docs: plan codex progress update instruction tuning` (hash: TBD)

### Stream: Prompt tuning
3. [TODO] Replace ambiguous `short commentary messages` wording with ordinary user-visible assistant chat messages — scope: `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts`, `doc/SolidWorks-WorkFlow/Plans/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`; commit: `fix: clarify codex progress update visibility`
4. [TODO] Git Commit: `fix: clarify codex progress update visibility` (hash: TBD)

### Stream: Release 1.2.85
5. [TODO] Prepare release notes for `1.2.85` before build-all — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare codex progress update release notes`
6. [TODO] Git Commit: `docs: prepare codex progress update release notes` (hash: TBD)
7. [TODO] Run release build stream: `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX and release artifacts — scope: release scripts/generated artifacts; commit: `chore: build codex progress update release`
8. [TODO] Git Commit: `chore: build codex progress update release` (hash: TBD)
9. [TODO] Close active planning/todo scope and create session report — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_Progress_Updates_Instruction_Tuning_1.2.85.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Progress_Updates_Instruction_Tuning_1.2.85.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-phase1-codex-progress-updates-1.2.85.md`, `doc/Sessions/Session013.md`; commit: `docs: close codex progress update release`
10. [TODO] Git Commit: `docs: close codex progress update release` (hash: TBD)
