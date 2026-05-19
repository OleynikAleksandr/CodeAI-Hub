# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-codex-provider-experiment-planning-2026-05-19",
  "branch": "main",
  "baseHead": "ddebe437a",
  "lastRecordedCommit": "ddebe437a",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Kimi_Codex_Provider_Experiment_Planning_RU.md",
  "currentTaskId": "phase0-kimi-codex-planning-intake",
  "expectedCommitMessage": "docs: plan kimi codex provider experiment",
  "debt": {
    "expectedCommitMessage": "docs: plan kimi codex provider experiment",
    "preCommitHead": "ddebe437a",
    "stage": "commit_pending",
    "taskId": "phase0-kimi-codex-planning-intake"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Kimi_Codex_Provider_Experiment_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading перед каждым фиксом:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача должна затрагивать не более 3 файлов/пакетов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Гейты через Husky не обходить.
- Для реализации `kimi-codex` сначала доказать Codex App Server compatibility с Kimi OpenAI-compatible endpoint; без evidence нельзя добавлять полноценный provider surface.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-19)
### Stream: Kimi-Codex Planning Source
1. [DONE] `phase0-kimi-codex-planning-intake` Создать planning-документ для экспериментального провайдера `kimi-codex`, который использует Codex App Server и GPT 5.5 instruction/flag profile для Kimi 2.6, и добавить его в Docs Index — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Kimi_Codex_Provider_Experiment_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan kimi codex provider experiment`.
2. [PENDING] Git Commit: `docs: plan kimi codex provider experiment` (hash: TBD)

## Phase 1 — User Planning Acceptance (owner: User, updated: 2026-05-19)
### Stream: Planning Review
1. [TODO] `phase1-kimi-codex-planning-review` Пользователь проверяет planning-документ и подтверждает, начинать ли implementation scope или скорректировать архитектуру до нарезки задач — scope: без изменения файлов; expected commit: none.

## Phase 2 — Future Implementation Plan Draft (owner: Codex, updated: 2026-05-19)
### Stream: Feasibility Spike
1. [TODO] `phase2-kimi-codex-feasibility-plan` После acceptance развернуть implementation todo-plan: Kimi-Codex provider-home, Codex App Server custom provider config, minimal thread/start + turn/start probe — scope: ≤3 файлов/пакетов на каждую microtask; expected commit: TBD.
2. [TODO] Git Commit: `TBD after planning acceptance` (hash: TBD)

### Stream: Provider Runtime Shell
1. [TODO] `phase2-kimi-codex-runtime-shell-plan` После successful spike добавить provider facade/adapter shell, descriptor/loader registration, model capability registry и packaging slices — scope: ≤3 файлов/пакетов на каждую microtask; expected commit: TBD.
2. [TODO] Git Commit: `TBD after feasibility spike` (hash: TBD)

### Stream: Core UI Integration
1. [TODO] `phase2-kimi-codex-core-ui-plan` После runtime shell добавить Settings, start cards, status-line identity, provider inheritance, diagnostics и documentation updates — scope: ≤3 файлов/пакетов на каждую microtask; expected commit: TBD.
2. [TODO] Git Commit: `TBD after runtime shell` (hash: TBD)

## Phase 3 — Required Final Streams For Future Implementation (owner: Codex + User, updated: 2026-05-19)
### Stream: Release Build Confirmation Gate
1. [TODO] `phase3-kimi-codex-release-confirmation` После targeted verification отдельно запросить подтверждение пользователя на release build — scope: без изменения файлов; expected commit: none.

### Stream: User Workflow Acceptance Testing
1. [TODO] `phase3-kimi-codex-user-acceptance` Пользователь сравнивает native `Kimi` и `Kimi-Codex` на одинаковом workflow step после релиза — scope: без изменения файлов; expected commit: none.

### Stream: Scope Closeout
1. [TODO] `phase3-kimi-codex-closeout` После явного acceptance архивировать active plan, disposition planning source и обновить Docs Index — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Plans, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close kimi codex provider experiment scope`.
2. [TODO] Git Commit: `docs: close kimi codex provider experiment scope` (hash: TBD)
3. [TODO] `phase3-kimi-codex-post-closeout-anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle. Scope: handoff only; expected commit: none.
