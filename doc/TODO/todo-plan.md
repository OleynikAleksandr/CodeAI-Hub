# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md` — draft planning-doc for user review, seeded by `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Planning_Intake.md`.
- **Read this context before implementation/planning:**
  - `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md` — active draft architecture for Claude Status Panel model/thinking switch.
  - `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Planning_Intake.md` — handoff/intake that opened this planning scope.
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
- Этот todo-plan остается planning-control scope, а не implementation scope.
- До явного user approval `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md` кодовые изменения в Claude/Core/UI не выполняются.
- После approval этот planning-control todo заменяется детальным implementation todo-plan с фазами, stream'ами, release build, user visual acceptance testing и scope closeout.
- Каждая задача оформляется парой пунктов: (1) действие, (2) `Git Commit: ...`.
- Если будущая implementation задача затронет больше 3 файлов, она должна быть разбита на микрозадачи до коммита.

## Phase 1 — Claude Status Panel Switch Planning (owner: Codex, updated: 2026-05-01)

### Stream A — Context recovery and draft planning-doc

1. [DONE] Read the Context Pack and recover the accepted Codex switch architecture, especially: Core session binding, applied-config `source="session_binding"`, Status Panel picker wiring, and the final Spark `summary = "none"` lesson. Scope: docs only; commit message: N/A.
2. [DONE] Create `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md` with Claude-native strategy, evidence requirements, capability registry shape, same-session vs resume/new-session decision, Core/UI reuse points, risks, and non-goals. Scope: 1 planning doc; commit message: `docs: draft claude status panel model switch architecture`.
3. [TODO] Git Commit: `docs: draft claude status panel model switch architecture` (hash: TBD)

### Stream B — User review and planning-doc approval

1. [TODO] Review `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md` with the user. Required decisions before approval:
   - accept or revise the baseline same-session strategy through next-turn `Session.modelBinding` + Claude SDK `query(..., resume, model, thinking)`;
   - accept or revise provider-specific public command `session:claude:model-switch` instead of generic `session:model-switch`;
   - decide how strict the implementation must be about the pre-turn Core restart gap inherited from Codex;
   - decide whether `xhigh` must be supported end-to-end or hidden from Claude picker until proven.
   Scope: planning doc only; commit message: `docs: approve claude status panel model switch plan`.
2. [TODO] Apply user corrections to the planning-doc until explicit approval is reached. Scope: planning doc only; commit message: `docs: approve claude status panel model switch plan`.
3. [TODO] Git Commit: `docs: approve claude status panel model switch plan` (hash: TBD)

### Stream C — Implementation todo slicing after approval

1. [BLOCKED: waiting for user approval] Replace this planning-control `doc/TODO/todo-plan.md` with a full implementation plan derived from the approved Claude planning-doc. The implementation plan must include microtasks, separate commit items after every microtask, targeted verification, `Release Build`, `User Visual Acceptance Testing`, and `Scope Closeout`. Scope: todo-plan only; commit message: `docs: open claude status panel model switch implementation plan`.
2. [BLOCKED: waiting for user approval] Git Commit: `docs: open claude status panel model switch implementation plan` (hash: TBD)
