# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-runtime-contract-conformance",
  "branch": "main",
  "baseHead": "70f3622e4",
  "lastRecordedCommit": "e58e1056c",
  "planningSource": "user-observed Application Skeleton Codex retest on 2026-05-10 + WorkflowSteps_Overview.md SSOT lines 66-86, 82, 248-267, 333-342",
  "currentTaskId": "runtime-contract.phase0.task5",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user-observed Application Skeleton Codex retest on 2026-05-10 (workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`, session `d02eea13-821e-4f8a-a70e-112a6c44ba4e`) + SSOT clauses already documented in `WorkflowSteps_Overview.md` lines 66–86, 82, 248–267, 333–342.
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Workspace_Lifecycle_From_Diagram_Modules.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Все runtime-уровневые фиксы должны соответствовать существующему SSOT `WorkflowSteps_Overview.md`; новые контракты не вводятся, существующие — не пересматриваются без отдельного solution-track.
- Managed documentation agents continue to only report content readiness; runtime conformance work touches Core/Project Manager/Codex adapter, not provider asset prompts.
- Do not use `--no-verify`.

## Pending Planning Discussion

Implementation phases добавляются в этот active plan **после** обсуждения и acceptance planning document под `doc/SolidWorks-WorkFlow/Plans/` (предполагаемое имя — `Managed_Workflow_Runtime_Contract_Conformance.md`, финальное имя согласуется с пользователем). Planning document должен покрыть:

- gap analysis vs `WorkflowSteps_Overview.md` lines 66–86, 82, 248–267, 333–342 (one entry per missing/leaking clause);
- разбиение runtime conformance работы на streams (предварительный набор: post-turn arbitration re-execution, corrective-feedback text cleanup, `handoff to user phase` decision form, Phase 2 materialization commit handler, Codex CLI session writer audit records, regression coverage);
- ownership boundaries (какие clusters/modules в Core/PM/adapter затрагиваются и каких контрактов касаются);
- regression/integration test surface;
- release/closeout стратегию.

Until планы интегрированы, активной задачей остаётся только `runtime-contract.phase0.task1` (открытие active plan для intake).

## Phase 0 — Scope Intake (owner: Codex, updated: 2026-05-10)

### Stream: Plan Activation

1. [DONE] `runtime-contract.phase0.task1` Open the new active plan for managed workflow runtime contract conformance (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open managed workflow runtime contract conformance plan`).
2. [DONE] Git Commit: `docs: open managed workflow runtime contract conformance plan` (hash: b3d782e28)
3. [DONE] `runtime-contract.phase0.task2` Hold scope ACTIVE for planning document discussion; advance only after the planning document is accepted and converted into implementation phases (scope: chat/process observation only; expected commit: not required).
4. [DONE] `runtime-contract.phase0.task3` Adopt the current runtime conformance planning documents into the active planning scope before Plans folder cleanup (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md, doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md, doc/TODO/todo-plan.md`; expected commit: `docs: adopt runtime conformance planning docs`).
5. [DONE] Git Commit: `docs: adopt runtime conformance planning docs` (hash: a3a25d69a)
6. [DONE] `runtime-contract.phase0.task4` Archive closed Development Tree Phase 1 planning document and update planning navigation (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Phase1_UserStartedDocumentation.md, doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Phase1_UserStartedDocumentation.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: archive closed development tree phase 1 plan`).
7. [DONE] Git Commit: `docs: archive closed development tree phase 1 plan` (hash: e58e1056c)
8. [DONE] `runtime-contract.phase0.task5` Keep scope ACTIVE while parallel runtime conformance planning documents are revised and reviewed (scope: chat/process observation only; no commit required). Result: closed by explicit user request so the next agent can cut a fresh implementation plan from the reviewed runtime conformance planning documents.
9. [TODO] `runtime-contract.phase0.task6` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
