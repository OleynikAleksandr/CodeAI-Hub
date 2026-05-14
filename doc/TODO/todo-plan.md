# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-orchestration-legacy-cleanup-implementation-2026-05-14",
  "branch": "codex/managed-orchestration-rewrite",
  "baseHead": "4be3373b1",
  "lastRecordedCommit": "e3980a598",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md",
  "currentTaskId": "managed-orchestration-cleanup.phase10.servicing-audit.task3",
  "expectedCommitMessage": "docs: mark claude provider audit historical",
  "debt": {
    "expectedCommitMessage": "docs: mark claude provider audit historical",
    "preCommitHead": "e3980a598",
    "stage": "commit_pending",
    "taskId": "managed-orchestration-cleanup.phase10.servicing-audit.task3"
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
64. [DONE] Git Commit: `refactor: disable quality gates continuation dispatcher` (hash: b49bef6e3)
65. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task4` Collapse `ManagedWorkflowPostTurnService` to the minimal fail-closed boundary so old arbitration, repair, continuation, revision, commit, and provider-dispatch internals are no longer present behind a disabled flag; delete the now-unused premature-materialization reader and review-revision injection helper exposed by that collapse (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-premature-materialization-validator.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: collapse managed post-turn service to fail-closed boundary`).
66. [DONE] Git Commit: `refactor: collapse managed post-turn service to fail-closed boundary` (hash: e1a2abdd3)
67. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task5` Rewrite stale repair/revision tests around disabled no-op behavior and remove the stale post-turn max-lines allowlist entry exposed by the post-turn collapse (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-repair-orchestration.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-user-return-revision.test.ts, packages/core/src/remote-bridge/handlers/diagram-modules-repair-orchestration.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-repair-orchestration.test.ts, scripts/check-architecture-rules/max-lines-debt-allowlist.txt, doc/TODO/todo-plan.md`; expected commit: `test: remove legacy repair and revision assertions`).
68. [DONE] Git Commit: `test: remove legacy repair and revision assertions` (hash: 6cd40aae8)
69. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task6` Remove dormant managed workspace orchestrator helpers and tests that only preserved the old generated plan-orchestrator scaffold after runtime ownership was disabled (scope: `packages/core/src/managed-workspace/*orchestrator*, packages/core/src/managed-workspace/*plan-mutator*, packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/managed-workspace/managed-workspace-bootstrapper*, packages/core/src/managed-workspace/managed-workspace-reconciler*, packages/core/src/managed-workspace/managed-workspace-validator*, packages/core/src/managed-workspace/managed-hook-registry*, packages/core/src/remote-bridge/handlers/quality-gates-progress.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove dormant managed workspace orchestrator helpers`).
70. [DONE] Git Commit: `refactor: remove dormant managed workspace orchestrator helpers` (hash: 8fbac2277)
71. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task7` Rewrite the remaining Quality Gates revision/accept-contract tests found by the final audit so they assert fail-closed no-op behavior instead of legacy task injection or acceptance side effects (scope: `packages/core/src/remote-bridge/handlers/quality-gates-user-return-revision.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-accept-contract-runner.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove remaining quality gates legacy assertions`).
72. [DONE] Git Commit: `test: remove remaining quality gates legacy assertions` (hash: b8192e9c7)
73. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task8` Rewrite remaining Application Skeleton continuation tests around the current no-op dispatcher and blocked typed-acceptance flow (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove application skeleton continuation assertions`).
74. [DONE] Git Commit: `test: remove application skeleton continuation assertions` (hash: 6162c05d8)
75. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task9` Rewrite remaining workflow-state and Diagram Modules feedback tests around disabled provider feedback/continuation dispatch (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: remove workflow feedback continuation assertions`).
76. [DONE] Git Commit: `test: remove workflow feedback continuation assertions` (hash: c21749643)
77. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task10` Remove Application Skeleton accept-contract action from PM UI during the rewrite (scope: `src/client/project-manager/components/application-skeleton/application-skeleton-panel.tsx, src/client/project-manager/components/application-skeleton/application-skeleton-accept-contract-button.tsx, src/client/project-manager/components/application-skeleton/application-skeleton-accept-contract-button.test.tsx, doc/TODO/todo-plan.md`; expected commit: `refactor: remove application skeleton accept action UI`).
78. [DONE] Git Commit: `refactor: remove application skeleton accept action UI` (hash: 6218c65c9)
79. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task11` Remove Quality Gates accept-contract action from PM UI during the rewrite (scope: `src/client/project-manager/components/quality-gates/quality-gates-panel.tsx, src/client/project-manager/components/quality-gates/quality-gates-accept-contract-button.tsx, src/client/project-manager/components/quality-gates/quality-gates-accept-contract-button.test.tsx, doc/TODO/todo-plan.md`; expected commit: `refactor: remove quality gates accept action UI`).
80. [DONE] Git Commit: `refactor: remove quality gates accept action UI` (hash: c382a9dbd)
81. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task12` Remove PM accept-contract transport client after the UI actions are gone (scope: `src/client/project-manager/services/managed-stage-accept-contract-client.ts, src/client/project-manager/services/managed-stage-accept-contract-client.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove managed accept contract client`).
82. [DONE] Git Commit: `refactor: remove managed accept contract client` (hash: cb1990576)
83. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task13` Remove Core accept-contract HTTP route surface during the rewrite (scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts, packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.ts, packages/core/src/remote-bridge/handlers/http-api-managed-stage-accept-contract.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove managed accept contract http endpoint`).
84. [DONE] Git Commit: `refactor: remove managed accept contract http endpoint` (hash: 852dc8119)
85. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task14` Remove typed accept-contract routing from message dispatch tests and runtime entrypoint (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-typed-acceptance-router.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove typed managed accept routing`).
86. [DONE] Git Commit: `refactor: remove typed managed accept routing` (hash: afa1d69e8)
87. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task15` Remove remaining inert accept-contract runtime option plumbing after typed routing is gone (scope: `packages/core/src/remote-bridge/remote-bridge-bootstrap.ts, packages/core/src/remote-bridge/remote-bridge-bootstrap.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-types.ts, packages/core/src/remote-bridge/handlers/session-request-handler-types.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove managed accept option plumbing`).
88. [DONE] Git Commit: `refactor: remove managed accept option plumbing` (hash: b11f81949)
89. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task16` Remove provider-facing Core-owned commit/continuation promises from runtime feedback helper text (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-contract-feedback.ts, packages/core/src/remote-bridge/handlers/quality-gates-contract-feedback.ts, packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.ts, packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts, packages/core/src/remote-bridge/handlers/managed-git-stage-gate.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove legacy managed feedback text`).
90. [DONE] Git Commit: `refactor: remove legacy managed feedback text` (hash: 77df17e75)
91. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task17` Remove old Core-owned managed lifecycle promises from bundled provider templates and synchronized agent assets (scope: `packages/agents/diagram-modules-agent/assets/diagram-modules-prompt.md, packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md, packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md, packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/agents/quality-gates-agent/assets/quality-gates-contract.md, packages/core/src/templates/bundled-templates.ts, packages/core/src/templates/*bundled-templates.test.ts, doc/TODO/todo-plan.md`; expected commit: `docs: remove legacy managed lifecycle provider templates`).
92. [DONE] Git Commit: `docs: remove legacy managed lifecycle provider templates` (hash: c88aba0ce)
93. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task18` Mark active SSOT docs that old managed commit ownership and workspace lifecycle contracts are suspended during the rewrite (scope: `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md, doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md, doc/TODO/todo-plan.md`; expected commit: `docs: mark legacy managed lifecycle contracts suspended`).
94. [DONE] Git Commit: `docs: mark legacy managed lifecycle contracts suspended` (hash: e4f6f7e0f)
95. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task19` Run the final codebase grep/test audit for legacy managed orchestrator activation paths, record the residual active tails found by audit, and expand the cleanup stream before the final audit can pass (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record legacy orchestrator tail audit`).
96. [DONE] Git Commit: `docs: record legacy orchestrator tail audit` (hash: 1380aef8b)
97. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task20` Remove residual post-turn accept-command recognition/method surface from the disabled managed post-turn boundary and aligned tests (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts, packages/core/src/remote-bridge/remote-bridge-bootstrap.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove managed accept post-turn surface`).
98. [DONE] Git Commit: `refactor: remove managed accept post-turn surface` (hash: 09691f1a0)
99. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task21` Delete standalone accept-contract helper modules and stale helper tests after all runtime/UI routes are gone (scope: `packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-handler.test.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/managed-stage-accept-contract-runner.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-accept-contract-runner.ts, packages/core/src/remote-bridge/handlers/quality-gates-accept-contract-runner.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-acceptance-writer.ts, packages/core/src/remote-bridge/handlers/application-skeleton-acceptance-writer.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-acceptance-writer.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: delete managed accept contract helpers`).
100. [DONE] Git Commit: `refactor: delete managed accept contract helpers` (hash: b5c3c87d9)
101. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task22` Remove legacy managed lifecycle wording from prompt-pack and documentation continuation envelopes (scope: `src/client/project-manager/services/prompt-pack-builder.ts, src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-documentation-continuation-envelope.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-continuation.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove legacy continuation prompt wording`).
102. [DONE] Git Commit: `refactor: remove legacy continuation prompt wording` (hash: 516edb7cf)
103. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task23` Suspend remaining active Workflow Steps overview legacy lifecycle narrative and align feedback wording tests with rewrite-boundary language (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.test.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.application-skeleton.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-committed-evidence.ts, doc/TODO/todo-plan.md`; expected commit: `docs: suspend workflow steps legacy lifecycle narrative`).
104. [DONE] Git Commit: `docs: suspend workflow steps legacy lifecycle narrative` (hash: 2a3adb033)
105. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task24` Remove legacy acceptance-commit read-model fields from Application Skeleton and Quality Gates progress snapshots (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-progress.ts, packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-progress.ts, packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.ts, packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-contract-guard.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove legacy acceptance commit progress state`).
106. [DONE] Git Commit: `refactor: remove legacy acceptance commit progress state` (hash: 5665aa6b7)
107. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task25` Run the second codebase grep/test audit, record that final audit still cannot pass, and expand the cleanup stream for the remaining runtime/docs tails found by subagents (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record final legacy orchestrator audit`).
108. [DONE] Git Commit: `docs: record final legacy orchestrator audit` (hash: 6c3e5e6c1)
109. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task26` Delete the disabled managed post-turn service boundary and remove its bootstrap/workflow-state wiring (scope: `packages/core/src/remote-bridge/remote-bridge-bootstrap.ts, packages/core/src/remote-bridge/remote-bridge-bootstrap.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-continuation.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: delete managed post-turn service`).
110. [DONE] Git Commit: `refactor: delete managed post-turn service` (hash: 874657eb6)
111. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task27` Delete disabled continuation/feedback/repair/revision/managed-documentation helper surfaces and stale tests that only preserve old orchestration API names (scope: `packages/core/src/remote-bridge/handlers/*continuation-dispatcher*.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback*.ts, packages/core/src/remote-bridge/handlers/*repair-orchestration*.ts, packages/core/src/remote-bridge/handlers/*revision-injection*.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction*.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit*.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-user-return-revision.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-user-return-revision.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-progress-refresh.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-review-turn-classifier.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: delete legacy managed helper surfaces`).
112. [DONE] Git Commit: `refactor: delete legacy managed helper surfaces` (hash: 7cc4c9180)
113. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task28` Remove managed context bundle runtime/API/client prompt injection surface and keep rollover continuation generic during rewrite (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.test.ts, packages/core/src/remote-bridge/handlers/managed-context-bundle-http-handler.ts, packages/core/src/remote-bridge/handlers/managed-context-bundle-http-handler.test.ts, packages/core/src/remote-bridge/handlers/http-api-router.ts, packages/core/src/remote-bridge/handlers/session-request-handler-documentation-continuation-envelope.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-continuation.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts, src/client/project-manager/services/managed-workflow-initial-context.ts, src/client/project-manager/services/managed-workflow-initial-context.test.ts, src/client/project-manager/services/description-submit-service.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove managed context bundle surface`).
114. [DONE] Git Commit: `refactor: remove managed context bundle surface` (hash: 017ed3555)
115. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task29` Remove legacy managed core event parsing and accepted-commit transaction evidence from workflow events/read-model bootstrap gates (scope: `packages/core/src/remote-bridge/handlers/workflow-events-service.ts, src/client/project-manager/services/workflow-events-client.ts, packages/core/src/remote-bridge/handlers/workflow-state-committed-evidence.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: remove managed event and accepted commit evidence`).
116. [DONE] Git Commit: `refactor: remove managed event and accepted commit evidence` (hash: a5257e793)
117. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task30` Suspend remaining active docs/contract references found by subagents outside Workflow Steps Overview (scope: `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md, doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md, doc/TODO/todo-plan.md`; expected commit: `docs: suspend remaining managed orchestration references`).
118. [DONE] Git Commit: `docs: suspend remaining managed orchestration references` (hash: e26b7e5c9)
119. [DONE] `managed-orchestration-cleanup.phase9.runtime-audit.task31` Run the final codebase grep/test audit again, remove the last stale comment-only legacy evidence references, delete dead managed-workspace/workflow-revision/audit/repair helper modules, remove retired workspace-plan paths from runtime payloads/gates, suspend active SSOT/doc leftovers found by subagents, neutralize remaining technical-stage rewrite blocker names, and record only intentional suspended/history references (scope: `assets/localization/source/en/ui_interface.json, src/client/project-manager/services/workflow-state-helpers.ts, src/client/project-manager/services/workflow-state-client.ts, src/client/project-manager/services/workflow-events-client.ts, src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts, src/client/project-manager/components/layout/workspace-tree.tsx, src/client/project-manager/components/layout/main-area-panel-content.tsx, src/client/project-manager/components/layout/main-area-panel-content.test.ts, src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts, src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts, packages/core/src/flow-node-continuity/flow-node-continuity-facade.ts, packages/core/src/flow-node-continuity/flow-node-continuity-facade.test.ts, packages/core/src/flow-node-continuity/flow-node-continuity-types.ts, packages/core/src/remote-bridge/types.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.test.ts, packages/core/src/remote-bridge/remote-bridge-bootstrap.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate*.ts, packages/core/src/remote-bridge/handlers/managed-git-stage-gate*.ts, packages/core/src/remote-bridge/handlers/quality-gates-progress.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.ts, packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-continuation.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.*.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-rewrite-boundary.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-projection-side-effects.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-continuation.test.ts, packages/core/src/remote-bridge/handlers/*contract-guard*.ts, packages/core/src/remote-bridge/handlers/*contract-feedback*.ts, packages/core/src/remote-bridge/handlers/*review-turn-classifier*.ts, packages/core/src/remote-bridge/handlers/*repair-attempt-evidence*.ts, packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines*.ts, packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts, packages/core/src/managed-workspace/*, packages/core/src/workflow-revisions/*, packages/core/src/unified-session/storage.ts, packages/core/src/unified-session/storage.test.ts, doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/System/WorkflowStep_PromptTesting_Methodology.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Application_Skeleton_Phase1_Contract_Bootstrap_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md, doc/TODO/todo-plan.md`; expected commit: `docs: record clean legacy orchestrator audit`).
120. [DONE] Git Commit: `docs: record clean legacy orchestrator audit` (hash: e12f7378e)

Verification for task 71:

- `npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/quality-gates-user-return-revision.test.js packages/core/dist/remote-bridge/handlers/quality-gates-accept-contract-runner.test.js` passed.
- `npm run plan:validate` passed.

Verification for task 73:

- `npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.js packages/core/dist/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.js` passed.

Verification for task 75:

- `npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.js packages/core/dist/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.js` passed.

Verification for task 77:

- `npm run build:project-manager` passed.
- `npm run typecheck:webview` passed.
- `rg -n "ApplicationSkeletonAcceptContractButton|application-skeleton-accept-contract-button|Accept Contract" src/client/project-manager/components/application-skeleton` returned no matches.

Verification for task 79:

- `npm run build:project-manager` passed.
- `npm run typecheck:webview` passed.
- `rg -n "QualityGatesAcceptContractButton|quality-gates-accept-contract-button|Accept Contract|acceptQualityGatesContract|quality-gates-accept-contract" src/client/project-manager/components/quality-gates` returned no matches.

Verification for task 81:

- `npm run build:project-manager` passed.
- `npm run typecheck:webview` passed.
- `rg -n "managed-stage-accept-contract-client|acceptApplicationSkeletonContract|acceptQualityGatesContract|managed-stage-accept-contract|quality-gates-accept-contract" src/client/project-manager` returned no matches.

Verification for task 83:

- `npm run build:core` passed.
- `rg -n "managed-stage-accept-contract|quality-gates-accept-contract|handleApplicationSkeletonAcceptContract|handleQualityGatesAcceptContract|http-api-managed-stage-accept-contract" packages/core/src/remote-bridge/handlers/http-api-router.ts packages/core/src/remote-bridge/handlers` now returns only remaining disabled runner/service references, not HTTP route or handler references.

Verification for task 85:

- `npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/managed-stage-accept-contract-handler.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-runtime-core.test.js` passed.
- `rg -n "application-skeleton-typed-acceptance-router|routeManagedTypedAcceptance|typed acceptance router" packages/core/src` returned no matches.

Verification for task 87:

- `npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/remote-bridge-bootstrap.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-runtime-core.test.js` passed.
- `rg -n "handleManagedAcceptContractCommand|ApplicationSkeletonAcceptContractDecision" packages/core/src/remote-bridge/remote-bridge-bootstrap.ts packages/core/src/remote-bridge/handlers/session-request-handler.ts packages/core/src/remote-bridge/handlers/session-request-handler-runtime-types.ts packages/core/src/remote-bridge/handlers/session-request-handler-types.ts packages/core/src/remote-bridge/remote-bridge-bootstrap.test.ts` returned no matches.

Verification for task 89:

- `npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/managed-git-stage-gate.test.js packages/core/dist/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.js` passed.
- `rg -n "Core-owned|Core owns|managed lifecycle|managed commit|Core acceptance commit|Core-injected integration prompt|plan advancement|repair task|revision task|Wait for Core|managed plan|continuation prompt|downstream unlock|committed before user review" packages/core/src/remote-bridge/handlers/application-skeleton-contract-feedback.ts packages/core/src/remote-bridge/handlers/quality-gates-contract-feedback.ts packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.ts packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts packages/core/src/remote-bridge/handlers/managed-git-stage-gate.test.ts` returned no matches.

Verification for task 91:

- `node scripts/generate-bundled-templates.js` regenerated `packages/core/src/templates/bundled-templates.ts` from the updated agent assets.
- `npm run build:core` passed.
- `node --test packages/core/dist/templates/diagram-modules-bundled-templates.test.js packages/core/dist/templates/application-skeleton-bundled-templates.test.js packages/core/dist/templates/quality-gates-bundled-templates.test.js` passed.
- `rg -n "Core-owned|Core owns|managed lifecycle|managed commit|Core acceptance commit|Core-injected integration prompt|plan advancement|repair task|revision task|Wait for Core|managed plan|continuation prompt|downstream unlock|accept-contract|Accept Contract|managed-stage-accept-contract|quality-gates-accept-contract|docs: accept|user review unlock|owned by Core|Core acceptance|Core structural|Core-injected|Core reports|Core confirms|Core has|managed draft commit|managed workspace lifecycle|managed context|managed lifecycle hooks|managed lifecycle baseline|pending regeneration" packages/agents/diagram-modules-agent/assets/diagram-modules-prompt.md packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md packages/agents/quality-gates-agent/assets/quality-gates-prompt.md packages/agents/quality-gates-agent/assets/quality-gates-contract.md packages/core/src/templates/diagram-modules-bundled-templates.test.ts packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts packages/core/src/templates/bundled-templates.ts` returned no matches.

Verification for task 93:

- `npm run check:links` passed.
- `npm run plan:validate` passed.
- `rg -n "docs: accept quality gates contract|Core-owned acceptance commit|managed commit|plan advancement|downstream unlock|managed-stage-accept-contract|accept-contract|continue_active_microtask|managed\\.core\\.message|Core has not yet finalized|post-commit validation|child-plan commit|provider-visible repair feedback|automatic continuation after a provider turn|Core acceptance is an active loop|expected commit metadata" doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md doc/SolidWorks-WorkFlow/Contracts/Managed_Workspace_Lifecycle.md doc/SolidWorks-WorkFlow/System/SystemArchitecture.md doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md` returned no matches.

Verification for task 95:

- Initial final-audit grep confirmed that deleted generated lifecycle/orchestrator helpers are gone: `rg -n "ManagedPlanOrchestrator|ManagedPlanOrchestratorInstaller|ManagedWorkspaceBootstrapper|ManagedWorkspaceReconciler|ManagedWorkspaceValidator|ManagedWorkspaceAdoptionCommitter|ManagedWorkspaceLifecycleCommitter|managed-plan-orchestrator|managed-.*plan-mutator|managed-todo-tree|managed-hook-registry|DefaultManagedWorkspaceLifecycle|requiresManagedWorkspaceLifecycle|application-skeleton-typed-acceptance-router|managed-stage-accept-contract-client|http-api-managed-stage-accept-contract" packages/core/src src/client/project-manager scripts packages/agents --glob '!**/dist/**'` returned no matches.
- The same audit found residual active tails that must be removed before closeout: disabled accept-contract helper modules/tests, post-turn accept-recognition surface, legacy prompt-pack/continuation wording, old Workflow Steps overview lifecycle narrative, and acceptance-commit read-model fields.
- Follow-up tasks 97-108 were added to remove those residual tails and run the final audit again.

Verification for task 97:

- `npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/managed-workflow-post-turn-service.test.js packages/core/dist/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.js packages/core/dist/remote-bridge/remote-bridge-bootstrap.test.js packages/core/dist/remote-bridge/handlers/application-skeleton-end-to-end.test.js packages/core/dist/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.js` passed.
- `rg -n "recognizeManagedContractAcceptancePhrase|recognizeManagedAcceptanceForStage|handleContractAcceptance|handleApplicationSkeletonAcceptContractCommand|handleQualityGatesAcceptContractCommand|Accept Contract" packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.quality-gates.test.ts packages/core/src/remote-bridge/remote-bridge-bootstrap.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.ts` returned no matches.

Verification for task 99:

- `npm run build:core` passed.
- `npm run check:knip` passed with existing configuration hints only.
- `rg -n "managed-stage-accept-contract|quality-gates-accept-contract|application-skeleton-acceptance-writer|quality-gates-acceptance-writer|writeApplicationSkeletonAcceptance|writeQualityGatesAcceptance|Accept Contract|acceptApplicationSkeletonContract|acceptQualityGatesContract|handleManagedAcceptContractCommand|routeManagedTypedAcceptance|ApplicationSkeletonAcceptContractButton|QualityGatesAcceptContractButton|recognizeManagedAcceptance|recognizeManagedContractAcceptance|handleApplicationSkeletonAcceptContractCommand|handleQualityGatesAcceptContractCommand" packages/core/src src/client/project-manager packages/agents --glob '!**/dist/**'` returned no matches.

Verification for task 101:

- `npm run build:core`, `npm run build:project-manager`, and `npm run typecheck:webview` passed.
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler.documentation-continuation.test.js packages/core/dist/remote-bridge/handlers/session-request-handler.documentation-rollover.test.js` passed.
- `npx tsx --test src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts` passed.
- `rg -n "Core acceptance|Core-injected|continue_active_microtask|managed microtask|Core sends|Core feedback|Core-orchestrated|Core-checkable|Core context bundle|Managed output target rule|managed workflow state|Core marks|Core-owned managed phases|Lifecycle reminder" src/client/project-manager/services/prompt-pack-builder.ts src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-documentation-continuation-envelope.ts packages/core/src/remote-bridge/handlers/session-request-handler.documentation-continuation.test.ts packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts` returned only negative assertion strings in tests.

Verification for task 103:

- `npm run build:core` passed.
- `npm run check:links` passed.
- `node --test packages/core/dist/remote-bridge/handlers/workflow-agent-acceptance-feedback.application-skeleton.test.js packages/core/dist/remote-bridge/handlers/quality-gates-feedback-action-lines.test.js` passed.
- `rg -n 'release `1\\.2\\.249`|release `1\\.2\\.250`|Phase orchestration pilot|Acceptance Commit Policy|PM Accept Contract|/managed-stage-accept-contract|typed acceptance|Core-owned acceptance commit|Core acceptance commit|Core-injected|Phase 3 continuation|managed commit flow|terminal managed commit|accepted managed lifecycle|Core owns staging' doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.test.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.application-skeleton.test.ts packages/core/src/remote-bridge/handlers/workflow-state-committed-evidence.ts` returned no active legacy lifecycle matches.

Verification for task 105:

- `npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/application-skeleton-progress.test.js packages/core/dist/remote-bridge/handlers/quality-gates-progress.test.js packages/core/dist/remote-bridge/handlers/quality-gates-feedback-action-lines.test.js packages/core/dist/remote-bridge/handlers/quality-gates-contract-guard.test.js packages/core/dist/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.js packages/core/dist/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.js` passed.
- `npm run check:knip` passed with existing configuration hints only.
- `rg -n "acceptanceCommitted|ACCEPTANCE_COMMIT_MESSAGE|docs: accept application skeleton contract|docs: accept quality gates contract" packages/core/src/remote-bridge/handlers/application-skeleton-progress.ts packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts packages/core/src/remote-bridge/handlers/quality-gates-progress.ts packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.ts packages/core/src/remote-bridge/handlers/quality-gates-feedback-action-lines.test.ts packages/core/src/remote-bridge/handlers/quality-gates-contract-guard.test.ts packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.ts packages/core/src/remote-bridge/handlers/quality-gates-continuation-dispatcher.test.ts` returned no matches.

Verification for task 107:

- Runtime audit still found legacy managed orchestration surfaces that are fail-closed/no-op but not clean removal: disabled post-turn service wiring, continuation dispatchers, provider feedback gateway, repair/revision injection runners, managed documentation commit transaction helpers, managed context bundle API/client injection, managed core workflow-event parsing, acceptedCommits terminal evidence, and rollout guardrail docs that still described the old lifecycle as active.
- Follow-up tasks 109-120 were added before user acceptance so final audit can pass only after those tails are removed or explicitly suspended as history/future planning.
- `npm run plan:validate` passed after expanding the stream.

Verification for task 109:

- `npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/remote-bridge-bootstrap.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-managed-state.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-managed-continuation.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.js` passed.
- `npm run check:knip` passed with existing configuration hints only.
- `rg -n "developmentTreeAgentSessions|handleManagedWorkflowPostTurn|managedPostTurnService|ManagedWorkflowPostTurnService|managed-workflow-post-turn-service" packages/core/src/remote-bridge packages/core/src --glob '!**/dist/**'` returned no matches.

Verification for task 111:

- `npm run build:core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/application-skeleton-progress.test.js packages/core/dist/remote-bridge/handlers/quality-gates-progress.test.js packages/core/dist/remote-bridge/handlers/quality-gates-feedback-action-lines.test.js packages/core/dist/remote-bridge/handlers/quality-gates-contract-guard.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-managed-state.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.js` passed.
- `npm run check:knip` passed with existing configuration hints only.
- `rg -n "WorkflowAgentAcceptanceFeedback|WorkflowAgentAcceptanceFeedbackGateway|sendDiagramModulesContinuationIfReady|sendApplicationSkeletonContinuationIfReady|sendQualityGatesContinuationIfReady|runApplicationSkeletonRepairOrchestration|runDiagramModulesRepairOrchestration|runQualityGatesRepairOrchestration|runApplicationSkeletonRevisionInjection|runQualityGatesRevisionInjection|ManagedDocumentationCommitTransaction|commitManagedDocumentationStageIfReady|quality-gates-review-turn-classifier|managed-documentation-commit" packages/core/src src/client/project-manager packages/agents --glob '!**/dist/**'` returned no matches.

Verification for task 119:

- Independent subagent audits found no active legacy path that commits, sends continuation/feedback, or starts old stage orchestration. The extra dormant helper/writer tails they flagged were removed in this task.
- Clean source/dist grep returned no matches for deleted legacy surfaces: managed context bundle, managed core events, acceptedCommits terminal evidence, acceptance feedback gateway, post-turn service, continuation dispatchers, repair/revision injection runners, managed documentation commit transaction, workflow revisions, managed audit writer, and old contract repair helpers.
- Remaining broad `managed` references in runtime are unrelated capture-workbench/provider config terminology or negative template guards; old orchestration owner surfaces return no source/dist matches.
- `npm run build:core` passed after a clean `packages/core/dist` rebuild.
- `npm run typecheck:webview` passed.
- `node --test packages/core/dist/remote-bridge/handlers/technical-stage-dirty-gate.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-rewrite-boundary.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-projection-side-effects.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.js packages/core/dist/remote-bridge/handlers/session-request-handler.documentation-continuation.test.js packages/core/dist/remote-bridge/handlers/session-request-handler.documentation-rollover.test.js packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js packages/core/dist/remote-bridge/remote-bridge-bootstrap.test.js packages/core/dist/flow-node-continuity/flow-node-continuity-facade.test.js packages/core/dist/unified-session/storage.test.js` passed.
- `npx tsx --test src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts src/client/project-manager/components/layout/main-area-panel-content.test.ts src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts` passed.
- `npm run format:fix`, `npm run lint`, `npm run check:knip`, `npm run check:links`, `npm run check:dup`, `npm run compile`, and `npm run plan:validate` passed.

## Phase 10 — Servicing Tail Audit And Release Rebuild (owner: Codex, updated: 2026-05-14)

### Stream: Servicing Tail Audit

121. [DONE] `managed-orchestration-cleanup.phase10.servicing-audit.task1` Remove stale active SSOT/index references that still describe the deleted managed workspace lifecycle as a live contract (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: remove servicing legacy orchestration references`).
122. [DONE] Git Commit: `docs: remove servicing legacy orchestration references` (hash: 971d3f56b)
123. [DONE] `managed-orchestration-cleanup.phase10.servicing-audit.task2` Clean release-facing/readme and architecture-debt wording so servicing files do not present old managed step orchestration as current behavior (scope: `README.md, CHANGELOG.md, scripts/check-architecture-rules/max-lines-debt-allowlist.txt`; expected commit: `docs: prepare clean servicing audit release`).
124. [DONE] Git Commit: `docs: prepare clean servicing audit release` (hash: e3980a598)

Verification for task 123:

- `README.md` was pruned to the current verification release section so old managed-release summaries are no longer presented in the first-page release surface.
- `CHANGELOG.md` now records the servicing-tail audit boundary and explicitly marks older cleanup-era entries as release history only, not active runtime contracts.
- `scripts/check-architecture-rules/max-lines-debt-allowlist.txt` no longer references the old Application Skeleton orchestration pilot.
- `scripts/plan-orchestrator/**` was audited as repo-local plan lifecycle tooling consumed by `npm run plan:*` and `.husky/*`, not the retired user-workspace managed step orchestrator.
- `rg -n "Previous release: v1\\.2|Application Skeleton Phase B orchestration pilot" README.md scripts/check-architecture-rules/max-lines-debt-allowlist.txt` returned no matches.
- `rg -n "managed-plan-orchestrator|ManagedPlanOrchestrator|ManagedWorkflowPostTurnService|WorkflowAgentAcceptanceFeedback|managed-stage-accept-contract|quality-gates-accept-contract|application-skeleton-typed-acceptance|ManagedDocumentationCommitTransaction|commitManagedDocumentationStageIfReady|managed-context-bundle|acceptedCommits|workflow-revisions|managed-audit|DefaultManagedWorkspaceLifecycle|ManagedWorkspaceBootstrapper|ManagedWorkspaceReconciler|ManagedWorkspaceValidator|managed-todo-tree|managed-hook-registry|managed-.*plan-mutator" packages/core/src src/client/project-manager packages/agents scripts --glob '!**/dist/**' --glob '!scripts/plan-orchestrator/*.test.mjs'` returned no matches.
- `npm run plan:validate` passed.
125. [DONE] `managed-orchestration-cleanup.phase10.servicing-audit.task3` Mark the unarchived Claude Diagram Modules provider audit as historical so active doc-root no longer appears to require deleted managed runtime files (scope: `doc/Claude_Diagram_Modules_Provider_Audit.md, doc/TODO/todo-plan.md`; expected commit: `docs: mark claude provider audit historical`).
126. [PENDING] Git Commit: `docs: mark claude provider audit historical` (hash: TBD)

Verification for task 125:

- `doc/Claude_Diagram_Modules_Provider_Audit.md` now starts with a historical-only status block explaining that the managed workflow runtime paths named there were removed or suspended during the 2026-05-14 cleanup.
- `rg -n "^\\*\\*Status:\\*\\* Historical audit only|managed-workflow-post-turn-service|workflow-agent-acceptance-feedback|managed-documentation-commit-transaction" doc/Claude_Diagram_Modules_Provider_Audit.md` returns the historical status and only the archived report's evidence path references, not active contract wording.
- `npm run plan:validate` passed.

### Stream: Release Rebuild

127. [TODO] `managed-orchestration-cleanup.phase10.release-rebuild.task1` Run `./scripts/build-all.sh` for the next clean rebuild version and commit generated version/manifest release outputs (scope: release-generated package/version manifests and `doc/tmp/releases/**`; expected commit: `chore: build clean servicing audit release`).
128. [TODO] Git Commit: `chore: build clean servicing audit release` (hash: TBD)
129. [TODO] `managed-orchestration-cleanup.phase10.release-rebuild.task2` Run `./scripts/build-release.sh --use-current-version`, verify the new VSIX/tarballs, and record release handoff evidence (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record clean servicing audit release`).
130. [TODO] Git Commit: `docs: record clean servicing audit release` (hash: TBD)

## Phase 11 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-14)

### Stream: User Acceptance

131. [TODO] `managed-orchestration-cleanup.phase11.user-acceptance.task1` User installs the clean rebuild release, confirms the cleaned codebase compiles/runs, and verifies that the removed managed step orchestration no longer drives the formed workflow steps (scope: user workflow; expected commit: not required).

## Phase 12 — Scope Closeout (owner: Codex, updated: 2026-05-14)

### Stream: Close Cleanup Scope

132. [TODO] `managed-orchestration-cleanup.phase12.closeout.task1` Archive this cleanup implementation plan after explicit user acceptance and leave the repository ready for the next `Managed Workflow Orchestration` cluster implementation plan (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Orchestration_Cleanup_Preparation_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed orchestration cleanup implementation`).
133. [TODO] Git Commit: `docs: close managed orchestration cleanup implementation` (hash: TBD)
134. [TODO] `managed-orchestration-cleanup.phase12.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: chat/process observation only; expected commit: not required).
