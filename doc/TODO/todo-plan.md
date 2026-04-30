# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Planning_Intake.md`
- **Read this context before implementation/planning:**
  - `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Planning_Intake.md` — active intake for the next provider scope.
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — global invariants, especially effective model identity and provider invocation profile boundaries.
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md` — Claude provider SSOT.
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md` — status chips and picker UI contract implemented for Codex, no-op for Claude/Gemini until provider strategy exists.
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md` — session binding and next-turn identity SSOT.
  - `doc/SolidWorks-WorkFlow/Plans/Claude_Agent_SDK_Capabilities_Analysis.md` — Claude SDK capability research.
  - `doc/SolidWorks-WorkFlow/Plans/CrossProvider_Common_Capabilities.md` — shared/provider-specific capability boundary.
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_StatusPanel_ModelSwitch_Architecture.md` — accepted Codex precedent and final `summary = "none"` Spark lesson.
  - `doc/TODO/Archive/todo-plan-codex-status-panel-model-switch.md` — implemented Codex execution sequence, including failed retests and final hotfix path.
- Только этот список является источником документов для восстановления контекста текущего planning cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым planning/code фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Этот todo-plan является planning-intake scope, а не implementation scope.
- В следующей сессии сначала создается полный planning-doc для Claude: `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md`.
- Только после user approval полного Claude planning-doc этот intake todo заменяется детальным implementation todo-plan с фазами, stream'ами, release build, user visual acceptance testing и scope closeout.
- До approval полного Claude planning-doc кодовые изменения в Claude/Core/UI не выполняются.
- Каждая задача оформляется парой пунктов: (1) действие, (2) `Git Commit: ...`.

## Phase 1 — Claude Status Panel Switch Planning (owner: next session, updated: 2026-04-30)

### Stream A — Context recovery and Claude planning-doc

1. [TODO] Read the Context Pack and recover the accepted Codex switch architecture, especially: Core session binding, applied-config source=`session_binding`, Status Panel picker wiring, and the final Spark `summary = "none"` lesson. Scope: docs only; commit message: N/A.
2. [TODO] Create `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md` with Claude-native strategy, evidence requirements, capability registry shape, same-session vs resume/new-session decision, Core/UI reuse points, risks, and non-goals. Scope: 1 planning doc; commit message: `docs: draft claude status panel model switch architecture`.
3. [TODO] Git Commit: `docs: draft claude status panel model switch architecture` (hash: TBD)

### Stream B — User approval and implementation todo slicing

1. [TODO] Review the Claude planning-doc with the user and incorporate corrections until it is explicitly approved. Scope: planning doc only; commit message: `docs: approve claude status panel model switch plan`.
2. [TODO] Git Commit: `docs: approve claude status panel model switch plan` (hash: TBD)
3. [TODO] Replace this planning-intake todo with a full implementation `doc/TODO/todo-plan.md` derived from the approved Claude planning-doc. The implementation plan must include microtasks, separate commit items after every microtask, targeted verification, `Release Build`, `User Visual Acceptance Testing`, and `Scope Closeout`. Scope: todo-plan only; commit message: `docs: open claude status panel model switch implementation plan`.
4. [TODO] Git Commit: `docs: open claude status panel model switch implementation plan` (hash: TBD)
