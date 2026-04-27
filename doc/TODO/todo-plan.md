# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Settings_Footer_Codex_Models_Release_1.2.84.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream несколько микро-задач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту разработки конкретная подзадача затрагивает больше 3 файлов, задача должна быть разбита на более мелкие.
- Gates через Husky hooks не обходить.
- Release stream должен быть последним stream плана.
- `doc/TODO/todo-plan.md` обновляется после каждой подзадачи и после каждого коммита.

## Phase 1 — Release 1.2.84 (owner: Codex, updated: 2026-04-27)

### Stream: Release Planning

1. [DONE] Create release planning-doc and active todo-plan — scope: `doc/SolidWorks-WorkFlow/Plans/Settings_Footer_Codex_Models_Release_1.2.84.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: plan settings footer codex models release`
2. [DONE] Git Commit: `docs: plan settings footer codex models release` (hash: `020e97898`)

### Stream: Release Documentation

3. [DONE] Prepare `README.md` and `CHANGELOG.md` for future release `1.2.84` — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: prepare 1.2.84 release notes`
4. [TODO] Git Commit: `docs: prepare 1.2.84 release notes` (hash: TBD)

### Stream: Release Build

5. [TODO] Run release build pipeline for `1.2.84` — scope: release scripts/artifacts, `doc/TODO/todo-plan.md`; expected commit message: `chore: build settings footer codex models release`
6. [TODO] Git Commit: `chore: build settings footer codex models release` (hash: TBD)
7. [TODO] Close release scope and archive planning/todo docs — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Settings_Footer_Codex_Models_Release_1.2.84.md`, `doc/TODO/Archive/todo-plan-phase1-settings-footer-codex-models-release-1.2.84.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: close settings footer codex models release`
8. [TODO] Git Commit: `docs: close settings footer codex models release` (hash: TBD)
