# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-orchestration-legacy-cleanup-implementation-2026-05-14",
  "branch": "codex/managed-orchestration-rewrite",
  "baseHead": "4be3373b1",
  "lastRecordedCommit": "0ff3ac7d2",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md",
  "currentTaskId": "managed-orchestration-cleanup.phase4.postturn.task4",
  "expectedCommitMessage": "refactor: remove legacy managed revision runners",
  "debt": {
    "expectedCommitMessage": "refactor: remove legacy managed revision runners",
    "preCommitHead": "0ff3ac7d2",
    "stage": "commit_pending",
    "taskId": "managed-orchestration-cleanup.phase4.postturn.task4"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase2_Contract_Review_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase3_4_Materialization_And_User_Return_Open_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Quality_Gates_Managed_Orchestration_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md`
  - `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Commit выполняется через `npm run plan:commit -- "<expected commit message>"`; hooks не обходить.
- Цель scope: очистить кодовую базу от старого managed orchestration ownership, не меняя содержательную модель шагов `Diagram Modules`, `Application Skeleton`, `Quality Gates`.
- До появления нового кластера managed documentation runtime paths должны fail closed / disabled, а не продолжать старый сценарий.
- Release build в этом scope не выполняется. Финальная проверка — tooling verification.

## Phase 0 — Scope Registration (owner: Codex, updated: 2026-05-14)

### Stream: Active Plan

1. [DONE] `managed-orchestration-cleanup.phase0.plan.task1` Create this active implementation todo-plan for legacy managed orchestration cleanup (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: start managed orchestration cleanup implementation`).
2. [DONE] Git Commit: `docs: start managed orchestration cleanup implementation` (hash: 0b5ae8fe4)

## Phase 1 — Baseline And Legacy Inventory (owner: Codex, updated: 2026-05-14)

### Stream: Inventory

3. [DONE] `managed-orchestration-cleanup.phase1.inventory.task1` Run baseline diagnostics and record the legacy owner kill list in this plan before code removal (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: inventory legacy managed orchestration owners`).
4. [DONE] Git Commit: `docs: inventory legacy managed orchestration owners` (hash: 7dbb61723)

### Inventory Findings (2026-05-14)

Baseline:

- `npm install` restored missing local dependencies; no tracked package files changed.
- First direct `npm run build:core` failed because workspace dependency declarations/build outputs were missing in the local checkout.
- After `npm run compile` and explicit workspace dependency builds for `@codeai-hub/unified-session`, `@codeai-hub/initiatives`, `@codeai-hub/claude-module`, `@codeai-hub/codex-app-server-module`, and `@codeai-hub/gemini-module`, `npm run build:core` passed.
- Current dirty tracked file before this inventory commit: `doc/TODO/todo-plan.md` only.

Protect / do not delete in this cleanup:

- repo-local `scripts/plan-orchestrator/**` and package scripts used by this repository's development lifecycle;
- stack-neutral managed workspace bootstrap/manifest/path/drift/facade helpers unless a later task proves they mutate managed documentation step transitions;
- artifact validators/progress readers that remain read-only after legacy orchestration writers are removed.

Delete / replace legacy transition owners:

- generated user-workspace scenario path: `managed-plan-orchestrator-shim-source.ts`, mutators for Diagram Modules / Application Skeleton / Quality Gates, and installer wiring that writes generated scenario logic;
- post-turn transition owner: `managed-workflow-post-turn-service.ts`;
- Core commit owner: `managed-documentation-commit-transaction.ts` and `workflow-state-managed-documentation-commit.ts`;
- provider continuation/repair/acceptance feedback owner: `workflow-agent-acceptance-feedback.ts`, `*-continuation-dispatcher.ts`, `*-repair-orchestration.ts`, `*-revision-injection-runner.ts`, `*accept-contract*` runners/handlers/client surfaces when they only invoke the legacy path;
- tests that assert deleted generated-script, mutator, post-turn, commit, or provider feedback behavior as active product behavior.

Initial grep evidence:

- `included-in-commit` still exists in `managed-plan-orchestrator-shim-source.ts` and generated-shim tests; it must be gone by cleanup end.
- `ManagedWorkflowPostTurnService` is constructed from `workflow-state-service.ts`, so the first runtime cutoff must prevent this service from sending provider messages or committing before deeper deletion.
- Project Manager accept-contract buttons/clients are part of the old user acceptance command path and must either be disabled during rewrite or removed when the legacy accept-contract API is removed.

## Phase 2 — Temporary Fail-Closed Boundary (owner: Codex, updated: 2026-05-14)

### Stream: Managed Runtime Disablement

5. [DONE] `managed-orchestration-cleanup.phase2.failclosed.task1` Add a minimal managed-workflow rewrite-in-progress blocker at the session/start boundary so managed documentation steps do not enter legacy orchestration (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: fail closed managed workflow session startup during rewrite`).
6. [DONE] Git Commit: `fix: fail closed managed workflow session startup during rewrite` (hash: f73630d8b)

Verification for task 5:

- `npm run build --workspace=@codeai-hub/unified-session && npm run build --workspace=@codeai-hub/initiatives && npm run build --workspace=@codeai-hub/claude-module && npm run build --workspace=@codeai-hub/codex-app-server-module && npm run build --workspace=@codeai-hub/gemini-module && npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.js` passed.

7. [DONE] `managed-orchestration-cleanup.phase2.failclosed.task2` Disable old post-turn managed arbitration and acceptance dispatch paths behind the same blocker without touching step artifact semantics (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, doc/TODO/todo-plan.md`; expected commit: `fix: disable legacy managed post-turn orchestration`).
8. [DONE] Git Commit: `fix: disable legacy managed post-turn orchestration` (hash: af6b31760)

Verification for task 7:

- `npm run build --workspace=@codeai-hub/unified-session && npm run build --workspace=@codeai-hub/initiatives && npm run build --workspace=@codeai-hub/claude-module && npm run build --workspace=@codeai-hub/codex-app-server-module && npm run build --workspace=@codeai-hub/gemini-module && npm run build:core` passed.
- Existing legacy post-turn tests are intentionally not updated in this task; they assert the old orchestration path and are scheduled for removal/rewrite in Phase 5 after the writers are removed.

## Phase 3 — Remove Generated Scenario And Plan-Mutator Ownership (owner: Codex, updated: 2026-05-14)

### Stream: Generated Orchestrator Removal

9. [DONE] `managed-orchestration-cleanup.phase3.generated.task1` Remove generated plan CLI shim runtime and installer wiring that injects old managed scenario logic into user workspaces (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove legacy managed plan shim generation`).
10. [DONE] Git Commit: `refactor: remove legacy managed plan shim generation` (hash: 03653b83e)

Verification for task 9:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `managed-plan-orchestrator-shim-source.ts` no longer exports or builds `createPlanCliShim`; it is reduced to a temporary removal marker so the next cleanup step can delete mutator ownership without introducing unused-export debt.
- Remaining `plan-cli.mjs` references are legacy tests/hook-registry tails and are intentionally left for Phase 5 cleanup after the mutator and post-turn writers are removed.

11. [DONE] `managed-orchestration-cleanup.phase3.generated.task2` Remove Application Skeleton and Quality Gates generated plan-mutator shim ownership after startup/post-turn paths are fail-closed (scope: `packages/core/src/managed-workspace/managed-application-skeleton-plan-mutator.ts, packages/core/src/managed-workspace/managed-quality-gates-plan-mutator.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts`; expected commit: `refactor: remove legacy managed plan mutators`).
12. [DONE] Git Commit: `refactor: remove legacy managed plan mutators` (hash: 8ecbb95f0)

Verification for task 11:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- Diagram Modules shim mutator remains as the next dedicated cleanup task because its generated-shim helper is still directly asserted by `managed-diagram-modules-plan-mutator.test.ts`.

13. [DONE] `managed-orchestration-cleanup.phase3.generated.task3` Remove Diagram Modules generated plan-mutator shim ownership and its shim-only assertion while preserving direct Product Part/repair helper behavior until read-model cleanup (scope: `packages/core/src/managed-workspace/managed-diagram-modules-plan-mutator.ts, packages/core/src/managed-workspace/managed-diagram-modules-plan-mutator.test.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts`; expected commit: `refactor: remove legacy diagram modules plan mutator shim`).
14. [DONE] Git Commit: `refactor: remove legacy diagram modules plan mutator shim` (hash: c402cb64d)

Verification for task 13:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `node --test packages/core/dist/managed-workspace/managed-diagram-modules-plan-mutator.test.js` passed.

## Phase 4 — Remove Post-Turn Commit And Feedback Ownership (owner: Codex, updated: 2026-05-14)

### Stream: Commit And Feedback Writers

15. [DONE] `managed-orchestration-cleanup.phase4.postturn.task1` Remove legacy managed documentation commit transaction and workflow-state commit helper ownership (scope: `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts, packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts`; expected commit: `refactor: remove legacy managed commit ownership`).
16. [DONE] Git Commit: `refactor: remove legacy managed commit ownership` (hash: b63883d9c)

Verification for task 15:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `ManagedDocumentationCommitTransaction.commitAcceptedStage` is now fail-closed and no longer stages files or invokes `npm run plan:commit`; `commitManagedDocumentationStageIfReady` refreshes read-only progress only.

17. [DONE] `managed-orchestration-cleanup.phase4.postturn.task2` Remove legacy provider feedback and continuation dispatch helpers for managed orchestration (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts, packages/core/src/remote-bridge/handlers/diagram-modules-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.ts`; expected commit: `refactor: remove legacy managed feedback dispatchers`).
18. [DONE] Git Commit: `refactor: remove legacy managed feedback dispatchers` (hash: aa561b306)

Verification for task 17:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- Provider feedback and continuation dispatcher entrypoints are retained for compile compatibility but no longer resolve sessions or send provider messages.

19. [DONE] `managed-orchestration-cleanup.phase4.postturn.task3` Disable legacy managed repair orchestration runners for Diagram Modules, Application Skeleton, and Quality Gates without deleting validator/read-model helpers (scope: `packages/core/src/remote-bridge/handlers/diagram-modules-repair-orchestration.ts, packages/core/src/remote-bridge/handlers/application-skeleton-repair-orchestration.ts, packages/core/src/remote-bridge/handlers/quality-gates-repair-orchestration.ts`; expected commit: `refactor: remove legacy managed repair runners`).
20. [DONE] Git Commit: `refactor: remove legacy managed repair runners` (hash: 0ff3ac7d2)

Verification for task 19:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- Repair orchestration entrypoints now return `noop` and no longer write repair tasks or evidence files.

21. [DONE] `managed-orchestration-cleanup.phase4.postturn.task4` Disable legacy managed revision injection runners after repair runners are fail-closed (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-revision-injection-runner.ts, packages/core/src/remote-bridge/handlers/quality-gates-revision-injection-runner.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove legacy managed revision runners`).
22. [PENDING] Git Commit: `refactor: remove legacy managed revision runners` (hash: TBD)

Verification for task 21:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- Revision injection runner entrypoints now return without mutating stage plans.

23. [TODO] `managed-orchestration-cleanup.phase4.postturn.task5` Disable legacy Application Skeleton and Quality Gates accept-contract side-effect runners while preserving pure decision/read-model contracts until PM cleanup (scope: `packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/quality-gates-accept-contract-runner.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove legacy managed accept-contract runners`).
24. [TODO] Git Commit: `refactor: remove legacy managed accept-contract runners` (hash: TBD)

## Phase 5 — Clean Read Model And Test Tail (owner: Codex, updated: 2026-05-14)

### Stream: Read-Only Projection

25. [TODO] `managed-orchestration-cleanup.phase5.readmodel.task1` Clean workflow-state/read-model references so remaining PM projection is read-only and does not trigger legacy commits or provider messages (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: make managed workflow read model fail closed`).
26. [TODO] Git Commit: `refactor: make managed workflow read model fail closed` (hash: TBD)

### Stream: Legacy Tests And Allowlist Debt

27. [TODO] `managed-orchestration-cleanup.phase5.tests.task1` Remove or rewrite tests that only assert the deleted generated-script and post-turn orchestration paths (scope: `packages/core/src/managed-workspace/*.test.ts, packages/core/src/remote-bridge/handlers/*managed*.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove legacy managed orchestration assertions`).
28. [TODO] Git Commit: `test: remove legacy managed orchestration assertions` (hash: TBD)
29. [TODO] `managed-orchestration-cleanup.phase5.tests.task2` Remove stale architecture max-line allowlist entries and stale active-path docs references left by deleted legacy files (scope: `scripts/check-architecture-rules/max-lines-debt-allowlist.txt, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: remove legacy managed orchestration references`).
30. [TODO] Git Commit: `docs: remove legacy managed orchestration references` (hash: TBD)

## Phase 6 — Tooling Verification (owner: Codex, updated: 2026-05-14)

### Stream: Build And Static Checks

31. [TODO] `managed-orchestration-cleanup.phase6.verify.task1` Run final targeted build and static checks: `npm run build:core`, `npm run build:project-manager`, `npm run typecheck:webview`, `npm run check:knip`, `npm run check:links`, `npm run check:dup`; record results in this plan (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify managed orchestration cleanup`).
32. [TODO] Git Commit: `docs: verify managed orchestration cleanup` (hash: TBD)

## Phase 7 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-14)

### Stream: User Acceptance

33. [TODO] `managed-orchestration-cleanup.phase7.user-acceptance.task1` User reviews cleanup result and confirms the codebase is ready for the next new-cluster implementation planning cycle (scope: user workflow; expected commit: not required).

## Phase 8 — Scope Closeout (owner: Codex, updated: 2026-05-14)

### Stream: Close Cleanup Scope

34. [TODO] `managed-orchestration-cleanup.phase8.closeout.task1` Archive this cleanup implementation plan after explicit user acceptance and leave the repository ready for the next `Managed Workflow Orchestration` cluster implementation plan (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed orchestration cleanup implementation`).
35. [TODO] Git Commit: `docs: close managed orchestration cleanup implementation` (hash: TBD)
36. [TODO] `managed-orchestration-cleanup.phase8.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: chat/process observation only; expected commit: not required).
