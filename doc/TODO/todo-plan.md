# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Settings_General_Footer_And_Codex_Models_1.2.84.md`
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
- Таргетные сборки выполняются вручную для затронутого пакета/клиента, если это нужно для проверки.
- `doc/TODO/todo-plan.md` обновляется после каждой подзадачи и после каждого коммита.

## Phase 1 — Settings footer and Codex model catalog (owner: Codex, updated: 2026-04-27)

### Stream: Planning Baseline

1. [DONE] Create planning-doc and active todo-plan — scope: `doc/SolidWorks-WorkFlow/Plans/Settings_General_Footer_And_Codex_Models_1.2.84.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: plan settings footer and codex models`
2. [DONE] Git Commit: `docs: plan settings footer and codex models` (hash: `03294c7a7`)

### Stream: Settings General Footer

3. [DONE] Fix Settings shell footer scroll boundary — scope: `src/client/ui/src/components/settings-view.tsx`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/TODO/todo-plan.md`; expected commit message: `fix: keep settings footer anchored during scroll`
4. [DONE] Git Commit: `fix: keep settings footer anchored during scroll` (hash: `fcd0accda`)

### Stream: Codex Model Catalog

5. [DONE] Add Codex UI/shared model catalog entries in requested order — scope: `src/types/codex-model-registry.ts`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/TODO/todo-plan.md`; expected commit message: `feat: add codex gpt 5.2 and spark models`
6. [DONE] Git Commit: `feat: add codex gpt 5.2 and spark models` (hash: `b213bdc59`)
7. [DONE] Accept new Codex model IDs in Core settings defaults — scope: `packages/core/src/config/provider-defaults-resolver.ts`, `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts`, `doc/TODO/todo-plan.md`; expected commit message: `fix: accept new codex models in core settings`
8. [TODO] Git Commit: `fix: accept new codex models in core settings` (hash: TBD)
