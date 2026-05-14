# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-orchestration-legacy-cleanup-implementation-2026-05-14",
  "branch": "codex/managed-orchestration-rewrite",
  "baseHead": "4be3373b1",
  "lastRecordedCommit": "8b65265f5",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md",
  "currentTaskId": "managed-orchestration-cleanup.phase9.runtime-audit.task3",
  "expectedCommitMessage": "refactor: disable quality gates continuation dispatcher",
  "debt": {
    "expectedCommitMessage": "refactor: disable quality gates continuation dispatcher",
    "preCommitHead": "8b65265f5",
    "stage": "commit_pending",
    "taskId": "managed-orchestration-cleanup.phase9.runtime-audit.task3"
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
22. [DONE] Git Commit: `refactor: remove legacy managed revision runners` (hash: d0a2a24fa)

Verification for task 21:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- Revision injection runner entrypoints now return without mutating stage plans.

23. [DONE] `managed-orchestration-cleanup.phase4.postturn.task5` Disable legacy Application Skeleton and Quality Gates accept-contract side-effect runners while preserving pure decision/read-model contracts until PM cleanup (scope: `packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/quality-gates-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/quality-gates-acceptance-writer.ts`; expected commit: `refactor: remove legacy managed accept-contract runners`).
24. [DONE] Git Commit: `refactor: remove legacy managed accept-contract runners` (hash: 4b7761c42)

Verification for task 23:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- Accept-contract runner entrypoints now reject without injecting acceptance task pairs, patching artifacts, appending audit, marking sessions accepted, or dispatching post-turn handling.

## Phase 5 — Clean Read Model And Test Tail (owner: Codex, updated: 2026-05-14)

### Stream: Read-Only Projection

25. [DONE] `managed-orchestration-cleanup.phase5.readmodel.task1` Clean workflow-state/read-model references so remaining PM projection is read-only and does not trigger legacy commits or provider messages (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: make managed workflow read model fail closed`).
26. [DONE] Git Commit: `refactor: make managed workflow read model fail closed` (hash: 64c160a69)

Verification for task 25:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `node --test packages/core/dist/remote-bridge/handlers/workflow-state-service-managed-state.test.js` passed.
- Workflow-state reads no longer emit development tree snapshot side effects, and post-turn handoff from the read-model service is fail-closed without provider dispatch.

### Stream: Legacy Tests And Allowlist Debt

27. [DONE] `managed-orchestration-cleanup.phase5.tests.task1` Rewrite managed installer and Application Skeleton shim tests so they assert disabled legacy orchestration instead of generated plan CLI/script behavior (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-application-skeleton.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove legacy managed orchestration assertions`).
28. [DONE] Git Commit: `test: remove legacy managed orchestration assertions` (hash: 36625cd89)

Verification for task 27:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `node --test packages/core/dist/managed-workspace/managed-plan-orchestrator-installer.test.js packages/core/dist/managed-workspace/managed-plan-orchestrator-shim-application-skeleton.test.js` passed.
- Managed installer and Application Skeleton shim tests now assert disabled legacy CLI/hooks/package-script behavior instead of generated shim control flow.

29. [DONE] `managed-orchestration-cleanup.phase5.tests.task2` Rewrite Diagram Modules and Quality Gates shim tests so they no longer assert generated plan CLI control flow (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-shim-diagram-modules.test.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove legacy managed shim assertions`).
30. [DONE] Git Commit: `test: remove legacy managed shim assertions` (hash: a6d66b605)

Verification for task 29:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `node --test packages/core/dist/managed-workspace/managed-plan-orchestrator-shim-diagram-modules.test.js packages/core/dist/managed-workspace/managed-plan-orchestrator-shim-quality-gates.test.js` passed.
- Diagram Modules and Quality Gates shim tests now assert disabled legacy CLI/hooks behavior while keeping stage plan metadata readable.

31. [DONE] `managed-orchestration-cleanup.phase5.tests.task3` Rewrite post-turn managed service tests so they assert fail-closed disabled orchestration instead of legacy dispatch/repair/revision paths (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove legacy managed post-turn assertions`).
32. [DONE] Git Commit: `test: remove legacy managed post-turn assertions` (hash: a72e025ca)

Verification for task 31:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `node --test packages/core/dist/remote-bridge/handlers/managed-workflow-post-turn-service.test.js packages/core/dist/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.js` passed.
- Post-turn service tests now assert fail-closed provider-dispatch and accept-contract behavior instead of repair/revision orchestration side effects.

33. [DONE] `managed-orchestration-cleanup.phase5.tests.task4` Rewrite managed commit and accept-contract runner tests around fail-closed cleanup behavior (scope: `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.test.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove legacy managed commit assertions`).
34. [DONE] Git Commit: `test: remove legacy managed commit assertions` (hash: d4123639b)

Verification for task 33:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `node --test packages/core/dist/remote-bridge/handlers/managed-documentation-commit-transaction.test.js packages/core/dist/remote-bridge/handlers/managed-stage-accept-contract-runner.test.js` passed.
- Commit transaction and Application Skeleton accept-contract runner tests now assert fail-closed/no-side-effect behavior instead of managed staging, commit, acceptance write, audit, or dispatch side effects.

35. [DONE] `managed-orchestration-cleanup.phase5.tests.task5` Rewrite Application Skeleton and Diagram Modules repair commit tests around no-op progress refresh behavior (scope: `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.application-skeleton-repair.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.diagram-modules-repair.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove legacy managed repair commit assertions`).
36. [DONE] Git Commit: `test: remove legacy managed repair commit assertions` (hash: 584b3e84e)

Verification for task 35:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `node --test packages/core/dist/remote-bridge/handlers/workflow-state-managed-documentation-commit.application-skeleton-repair.test.js packages/core/dist/remote-bridge/handlers/workflow-state-managed-documentation-commit.diagram-modules-repair.test.js` passed.
- Application Skeleton and Diagram Modules repair commit tests now assert read-only progress refresh and no transaction invocation.

37. [DONE] `managed-orchestration-cleanup.phase5.tests.task6` Rewrite Quality Gates repair and base managed commit tests around fail-closed no-op behavior (scope: `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.quality-gates-repair.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove legacy managed quality commit assertions`).
38. [DONE] Git Commit: `test: remove legacy managed quality commit assertions` (hash: ffe8e47aa)

Verification for task 37:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `node --test packages/core/dist/remote-bridge/handlers/workflow-state-managed-documentation-commit.quality-gates-repair.test.js packages/core/dist/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.js` passed.
- Quality Gates repair and base managed commit tests now assert read-only progress refresh and no transaction invocation.

39. [DONE] `managed-orchestration-cleanup.phase5.tests.task7` Rewrite Diagram Modules transaction and progress refresh tests around blocked transaction/read-only refresh behavior (scope: `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.diagram-modules.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-progress-refresh.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove legacy managed transaction repair assertions`).
40. [DONE] Git Commit: `test: remove legacy managed transaction repair assertions` (hash: 7b702d1cc)

Verification for task 39:

- `npm run build:core` passed.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `node --test packages/core/dist/remote-bridge/handlers/managed-documentation-commit-transaction.diagram-modules.test.js packages/core/dist/remote-bridge/handlers/workflow-state-managed-progress-refresh.test.js` passed.
- Diagram Modules transaction tests now assert dirty classification with blocked transaction behavior, and progress-refresh tests assert stale read-model refresh without invoking the disabled transaction.

41. [DONE] `managed-orchestration-cleanup.phase5.tests.task8` Remove stale architecture max-line allowlist entries and stale active-path docs references left by deleted legacy files (scope: `scripts/check-architecture-rules/max-lines-debt-allowlist.txt, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: remove legacy managed orchestration references`).
42. [DONE] Git Commit: `docs: remove legacy managed orchestration references` (hash: c1d51c958)

Verification for task 41:

- `./scripts/check-architecture.sh` passed; the stale `managed-plan-orchestrator-installer.test.ts` max-line allowlist entry is gone.
- `npm run lint` passed.
- `npm run check:knip` passed.
- `npm run check:links` passed.
- `Docs_Index.md` now lists the active cluster planning document as design input for the next implementation cycle, with an explicit note that it is not active legacy runtime ownership.

## Phase 6 — Tooling Verification (owner: Codex, updated: 2026-05-14)

### Stream: Build And Static Checks

43. [DONE] `managed-orchestration-cleanup.phase6.verify.task1` Run final targeted build and static checks: `npm run build:core`, `npm run build:project-manager`, `npm run typecheck:webview`, `npm run check:knip`, `npm run check:links`, `npm run check:dup`; record results in this plan (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify managed orchestration cleanup`).
44. [DONE] Git Commit: `docs: verify managed orchestration cleanup` (hash: c5bf6f01a)

Verification for task 43:

- `npm run build:core` passed.
- `npm run build:project-manager` passed.
- `npm run typecheck:webview` passed.
- `npm run check:knip` passed.
- `npm run check:links` passed.
- `npm run check:dup` passed with 2.76% duplicated lines, under the 3% threshold.
- `git status --short` after verification shows only this active plan update.

## Phase 7 — Release Build Verification (owner: Codex, updated: 2026-05-14)

### Stream: Release Preparation And Build

45. [DONE] `managed-orchestration-cleanup.phase7.release-prep.task1` Prepare release documentation for the managed orchestration cleanup verification build (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.253 managed cleanup release`).
46. [DONE] Git Commit: `docs: prepare 1.2.253 managed cleanup release` (hash: def09270c)
47. [DONE] `managed-orchestration-cleanup.phase7.pre-release-verify.task1` Run pre-release validation before packaging: `npm run lint`, `npm run build:core`, `npm run build:project-manager`, `npm run typecheck:webview`, `npm run check:knip`, `npm run check:links`, `npm run check:dup`; record results in this plan (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record 1.2.253 pre-release verification`).
48. [DONE] Git Commit: `docs: record 1.2.253 pre-release verification` (hash: 00a1fa8b0)

Verification for task 47:

- `npm run lint` passed.
- `npm run build:core` passed.
- `npm run build:project-manager` passed.
- `npm run typecheck:webview` passed.
- `npm run check:knip` passed.
- `npm run check:links` passed.
- `npm run check:dup` passed with 2.76% duplicated lines, under the 3% threshold.

49. [DONE] `managed-orchestration-cleanup.phase7.release-build.task1` Run unified release artifact build with the active plan state intentionally present, then record the generated provider/core/UI/launcher tarballs (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.253 release artifacts`).
50. [DONE] Git Commit: `chore: build 1.2.253 release artifacts` (hash: 78d8eba7c)

Verification for task 49:

- `./scripts/build-all.sh --allow-dirty` passed with only the machine-managed active plan state dirty before the build.
- Unified version advanced from `1.2.252` to `1.2.253`.
- Generated tarballs were copied to `doc/tmp/releases/`:
  - `claude-module-1.2.253.tar.bz2`
  - `codex-module-1.2.253.tar.bz2`
  - `gemini-module-1.2.253.tar.bz2`
  - `codeai-hub-core-darwin-arm64-1.2.253.tar.bz2`
  - `CodeAIHubLauncher-macos-arm64-1.2.253.tar.bz2`
  - `vscode-webview-1.2.253.tar.bz2`
  - `project-manager-1.2.253.tar.bz2`

51. [DONE] `managed-orchestration-cleanup.phase7.vsix-build.task1` Run final VSIX package build for the current release version and record the generated package path (scope: `packages/core/src/templates/bundled-templates.ts, .vscodeignore, doc/TODO/todo-plan.md`; expected commit: `chore: package 1.2.253 release`).
52. [DONE] Git Commit: `chore: package 1.2.253 release` (hash: 7b1d2f82f)

Verification for task 51:

- `./scripts/build-release.sh --use-current-version --allow-dirty` passed with only the machine-managed active plan state dirty before packaging.
- Release validation completed: bundled template coverage, webview build, architecture check, `tsc --noEmit`, `npm run compile`, SDK exclusion verification, local artifact validation, markdown links, duplication check, production dependency prune, VSIX packaging, VSIX runtime package surface verification, and package-size verification.
- Required release log markers were present: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
- Generated VSIX: `codeai-hub-1.2.253.vsix` (48M).

## Phase 8 — Clean Release Rebuild (owner: Codex, updated: 2026-05-14)

### Stream: Clean Rebuild

53. [DONE] `managed-orchestration-cleanup.phase8.clean-rebuild-docs.task1` Prepare release documentation for the clean managed orchestration cleanup rebuild under a new version (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.254 clean cleanup release`).
54. [DONE] Git Commit: `docs: prepare 1.2.254 clean cleanup release` (hash: d32a35321)
55. [DONE] `managed-orchestration-cleanup.phase8.clean-rebuild-artifacts.task1` Remove stale local release outputs, run a fresh unified release artifact build, and record the generated provider/core/UI/launcher tarballs (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.254 clean release artifacts`).
56. [DONE] Git Commit: `chore: build 1.2.254 clean release artifacts` (hash: 7c774e603)

Verification for task 55:

- Removed stale local release outputs before rebuilding: `doc/tmp/releases`, `codeai-hub-1.2.253.vsix`, and any stale `codeai-hub-1.2.254.vsix`.
- `./scripts/build-all.sh --allow-dirty` passed with only the machine-managed active plan state dirty before the build.
- `build-all.sh` cleaned `~/.codeai-hub/releases`, provider runtime outputs, Core runtime output, and CEF launcher output before producing the new artifacts.
- Unified version advanced from `1.2.253` to `1.2.254`.
- Generated clean rebuild tarballs were copied to `doc/tmp/releases/`:
  - `claude-module-1.2.254.tar.bz2`
  - `codex-module-1.2.254.tar.bz2`
  - `gemini-module-1.2.254.tar.bz2`
  - `codeai-hub-core-darwin-arm64-1.2.254.tar.bz2`
  - `CodeAIHubLauncher-macos-arm64-1.2.254.tar.bz2`
  - `vscode-webview-1.2.254.tar.bz2`
  - `project-manager-1.2.254.tar.bz2`

57. [DONE] `managed-orchestration-cleanup.phase8.clean-vsix-build.task1` Run final VSIX package build for the clean rebuild version and record the generated package path (scope: `packages/core/src/templates/bundled-templates.ts, .vscodeignore, doc/TODO/todo-plan.md`; expected commit: `chore: package 1.2.254 clean release`).
58. [DONE] Git Commit: `chore: package 1.2.254 clean release` (hash: 2ece914ee)

Verification for task 57:

- `./scripts/build-release.sh --use-current-version --allow-dirty` passed with only the machine-managed active plan state dirty before packaging.
- Release validation completed: bundled template coverage, webview build, architecture check, `tsc --noEmit`, `npm run compile`, SDK exclusion verification, local artifact validation, markdown links, duplication check, production dependency prune, VSIX packaging, VSIX runtime package surface verification, and package-size verification.
- Required release log markers were present: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `Package created`.
- Generated clean rebuild VSIX: `codeai-hub-1.2.254.vsix` (48M).

## Phase 9 — Legacy Tail Audit Cleanup (owner: Codex, updated: 2026-05-14)

### Stream: Runtime Preflight Tail

59. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task1` Remove the router-level managed workspace lifecycle preflight found by audit so managed documentation stages cannot bootstrap/commit old lifecycle state before the fail-closed session boundary (scope: `packages/core/src/remote-bridge/remote-bridge-session-create-router.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: block managed lifecycle preflight during rewrite`).
60. [DONE] Git Commit: `fix: block managed lifecycle preflight during rewrite` (hash: 0410b4911)
61. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task2` Remove the now-unreachable default managed workspace lifecycle from workflow session startup, rewrite its tests around the fail-closed contract, rename the remaining stage predicate to rewrite-blocker semantics, and delete the unused lifecycle/adoption commit helpers exposed by that removal (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.ts, packages/core/src/managed-workspace/managed-workspace-adoption-committer.ts, packages/core/src/managed-workspace/managed-workspace-lifecycle-committer.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove default managed lifecycle startup tail`).
62. [DONE] Git Commit: `refactor: remove default managed lifecycle startup tail` (hash: 8b65265f5)
63. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task3` Disable the remaining Quality Gates provider continuation dispatcher so all managed-stage continuation dispatchers are no-op during the rewrite (scope: `packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: disable quality gates continuation dispatcher`).
64. [PENDING] Git Commit: `refactor: disable quality gates continuation dispatcher` (hash: TBD)
65. [TODO] `managed-orchestration-cleanup.phase9.runtime-audit.task4` Run the final codebase grep/test audit for legacy managed orchestrator activation paths and record the remaining intentional inactive/history-only references (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record legacy orchestrator tail audit`).
66. [TODO] Git Commit: `docs: record legacy orchestrator tail audit` (hash: TBD)

## Phase 10 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-14)

### Stream: User Acceptance

67. [TODO] `managed-orchestration-cleanup.phase10.user-acceptance.task1` User installs the clean rebuild release, confirms the cleaned codebase compiles/runs, and verifies that the removed managed step orchestration no longer drives the formed workflow steps (scope: user workflow; expected commit: not required).

## Phase 11 — Scope Closeout (owner: Codex, updated: 2026-05-14)

### Stream: Close Cleanup Scope

68. [TODO] `managed-orchestration-cleanup.phase11.closeout.task1` Archive this cleanup implementation plan after explicit user acceptance and leave the repository ready for the next `Managed Workflow Orchestration` cluster implementation plan (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed orchestration cleanup implementation`).
69. [TODO] Git Commit: `docs: close managed orchestration cleanup implementation` (hash: TBD)
70. [TODO] `managed-orchestration-cleanup.phase11.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: chat/process observation only; expected commit: not required).
