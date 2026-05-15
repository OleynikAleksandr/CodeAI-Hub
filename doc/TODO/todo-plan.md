# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-orchestration-kernel-runtime-2026-05-15",
  "branch": "codex/managed-orchestration-rewrite",
  "baseHead": "ba5d1041e",
  "lastRecordedCommit": "a5a8b9aaa",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md",
  "currentTaskId": "managed-orchestration-kernel.phase2.steps.task2",
  "expectedCommitMessage": "feat: register quality gates managed workflow controller",
  "debt": {
    "expectedCommitMessage": "feat: register quality gates managed workflow controller",
    "preCommitHead": "a5a8b9aaa",
    "stage": "commit_pending",
    "taskId": "managed-orchestration-kernel.phase2.steps.task2"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
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

- **Required reading before each implementation fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Commit выполняется через `npm run plan:commit -- "<expected commit message>"`; hooks не обходить.
- Цель scope: реализовать первый визуально проверяемый срез нового `Managed Workflow Orchestration` cluster: кластерный contract/facade, общий kernel, step modules skeleton, runtime boundary и Project Manager projection.
- Этот scope не обязан довести `Diagram Modules`, `Application Skeleton`, `Quality Gates` до end-to-end выполнения. Его релиз должен показать, что новый кластер подключён к runtime/UI вместо старого legacy orchestration path, и готов принимать следующие step-specific plans.
- Кластер обязан проектироваться расширяемым: новые managed steps подключаются через registry/controller contract, а не через отдельные ad hoc runtime ветки.
- Release build нельзя выполнять до отдельного подтверждения пользователя на сборку релиза.

## Phase 0 — Scope Registration (owner: Codex, updated: 2026-05-15)

### Stream: Active Plan

1. [DONE] `managed-orchestration-kernel.phase0.plan.task1` Create this active implementation todo-plan for the first combined kernel + runtime-boundary release of the new Managed Workflow Orchestration cluster (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: start managed workflow orchestration kernel runtime plan`).
2. [DONE] Git Commit: `docs: start managed workflow orchestration kernel runtime plan` (hash: 9393ade90)

## Phase 1 — Cluster Contract And Facade Boundary (owner: Codex, updated: 2026-05-15)

### Stream: Architecture Contract

3. [DONE] `managed-orchestration-kernel.phase1.contract.task1` Add the canonical Cluster SSOT for `Managed Workflow Orchestration`, including facade boundary, module map, extension contract for future steps, and runtime ownership rules (scope: `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: define managed workflow orchestration cluster contract`).
4. [DONE] Git Commit: `docs: define managed workflow orchestration cluster contract` (hash: d27169b06)

### Stream: Facade Skeleton

5. [DONE] `managed-orchestration-kernel.phase1.facade.task1` Create the package-local cluster folder, public facade class, public contract types, and core entrypoint export without runtime side effects (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-contracts.ts, packages/core/src/managed-workflow-orchestration/index.ts, packages/core/src/index.ts`; expected commit: `feat: add managed workflow orchestration facade`).
6. [DONE] Git Commit: `feat: add managed workflow orchestration facade` (hash: ad649651b)

7. [DONE] `managed-orchestration-kernel.phase1.facade.task2` Add facade construction/unit tests that prove remote-bridge code can depend only on the facade and public contracts (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-contracts.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover managed workflow orchestration facade`).
8. [DONE] Git Commit: `test: cover managed workflow orchestration facade` (hash: 5a783d3b3)

## Phase 2 — Kernel State Model And Step Registry (owner: Codex, updated: 2026-05-15)

### Stream: Typed Kernel

9. [DONE] `managed-orchestration-kernel.phase2.types.task1` Add typed managed workflow events, snapshots, decisions, effects, and public type exports used by the pure state machine (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-events.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-snapshot.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-effects.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-contracts.ts`; expected commit: `feat: add managed workflow orchestration state types`).
10. [DONE] Git Commit: `feat: add managed workflow orchestration state types` (hash: 2fbe51047)

11. [DONE] `managed-orchestration-kernel.phase2.state-machine.task1` Implement the pure `ManagedWorkflowStateMachine` with reusable Type A, Type B, persistent-return, and blocked-preview transitions but no file writes, provider calls, or Git commands (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-state-machine.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-phase-contracts.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-state-machine.test.ts`; expected commit: `feat: add managed workflow state machine kernel`).
12. [DONE] Git Commit: `feat: add managed workflow state machine kernel` (hash: 2f02de26f)

### Stream: Step Registry And Controllers

13. [DONE] `managed-orchestration-kernel.phase2.registry.task1` Add the generic step-controller contract and registry that can register any number of future managed steps without changing runtime dispatch code (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-step-controller.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-step-registry.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-step-registry.test.ts`; expected commit: `feat: add managed workflow step registry`).
14. [DONE] Git Commit: `feat: add managed workflow step registry` (hash: b61d57c53)

15. [DONE] `managed-orchestration-kernel.phase2.steps.task1` Add initial Diagram Modules and Application Skeleton step-controller modules that expose phase metadata and preview blocking decisions only (scope: `packages/core/src/managed-workflow-orchestration/steps/diagram-modules-step-controller.ts, packages/core/src/managed-workflow-orchestration/steps/application-skeleton-step-controller.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-step-registry.ts`; expected commit: `feat: register initial managed workflow step controllers`).
16. [DONE] Git Commit: `feat: register initial managed workflow step controllers` (hash: a5a8b9aaa)

17. [DONE] `managed-orchestration-kernel.phase2.steps.task2` Add Quality Gates step-controller module and tests proving all three technical trunk steps are registered through the same extension contract (scope: `packages/core/src/managed-workflow-orchestration/steps/quality-gates-step-controller.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-step-registry.test.ts, packages/core/src/managed-workflow-orchestration/index.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-step-registry.ts`; expected commit: `feat: register quality gates managed workflow controller`).
18. [PENDING] Git Commit: `feat: register quality gates managed workflow controller` (hash: TBD)

## Phase 3 — Store, Audit, Commit Boundary, And Recovery Kernel (owner: Codex, updated: 2026-05-15)

### Stream: Durable Kernel Services

19. [TODO] `managed-orchestration-kernel.phase3.store.task1` Implement a minimal `ManagedWorkflowPlanStore` abstraction for current-state persistence and read-only snapshot reconstruction without reviving retired child-plan mutation logic (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-plan-store.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-ledger-types.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-plan-store.test.ts`; expected commit: `feat: add managed workflow plan store abstraction`).
20. [TODO] Git Commit: `feat: add managed workflow plan store abstraction` (hash: TBD)

21. [TODO] `managed-orchestration-kernel.phase3.audit.task1` Add `ManagedWorkflowAuditLog` and tests for Core decisions, effects, blockers, provider-visible messages, and recovery actions (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-audit-log.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-audit-log.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-effects.ts`; expected commit: `feat: add managed workflow audit log`).
22. [TODO] Git Commit: `feat: add managed workflow audit log` (hash: TBD)

23. [TODO] `managed-orchestration-kernel.phase3.commit.task1` Add a fail-closed `ManagedWorkflowCommitTransaction` boundary that records intended commit decisions but refuses pseudo-hashes and does not yet perform step commits (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-commit-transaction.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-commit-transaction.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-effects.ts`; expected commit: `feat: add managed workflow commit transaction boundary`).
24. [TODO] Git Commit: `feat: add managed workflow commit transaction boundary` (hash: TBD)

25. [TODO] `managed-orchestration-kernel.phase3.recovery.task1` Add baseline `ManagedWorkflowRecoveryArbiter` decisions for wait-user, wait-provider, retry-provider, blocked, and panic-stop states (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-recovery-arbiter.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-recovery-arbiter.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-snapshot.ts`; expected commit: `feat: add managed workflow recovery arbiter baseline`).
26. [TODO] Git Commit: `feat: add managed workflow recovery arbiter baseline` (hash: TBD)

## Phase 4 — Runtime Boundary Integration (owner: Codex, updated: 2026-05-15)

### Stream: Provider And Runtime Gateway

27. [TODO] `managed-orchestration-kernel.phase4.provider-gateway.task1` Add provider-neutral `ManagedWorkflowProviderGateway` preview boundary that can produce visible Core messages but cannot yet dispatch step work to providers (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-provider-gateway.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-core-message.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-provider-gateway.test.ts`; expected commit: `feat: add managed workflow provider gateway preview`).
28. [TODO] Git Commit: `feat: add managed workflow provider gateway preview` (hash: TBD)

29. [TODO] `managed-orchestration-kernel.phase4.runtime.task1` Route managed technical stage starts through `ManagedWorkflowOrchestrationFacade` so Diagram Modules/Application Skeleton/Quality Gates use the new preview boundary instead of a generic fail-closed message (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.ts`; expected commit: `feat: route managed stage starts through orchestration facade`).
30. [TODO] Git Commit: `feat: route managed stage starts through orchestration facade` (hash: TBD)

31. [TODO] `managed-orchestration-kernel.phase4.runtime.task2` Persist the new Core-authored preview messages into the managed session/event feed so user-visible boundary diagnostics survive refresh/restart (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-audit-log.ts`; expected commit: `feat: persist managed workflow core boundary messages`).
32. [TODO] Git Commit: `feat: persist managed workflow core boundary messages` (hash: TBD)

## Phase 5 — Project Manager Projection And Visual Control Point (owner: Codex, updated: 2026-05-15)

### Stream: Read Model Projection

33. [TODO] `managed-orchestration-kernel.phase5.readmodel.task1` Add read-only `ManagedWorkflowReadModelProjector` and expose preview status in workflow-state snapshots without commits/provider dispatch (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-read-model-projector.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `feat: project managed workflow preview state`).
34. [TODO] Git Commit: `feat: project managed workflow preview state` (hash: TBD)

35. [TODO] `managed-orchestration-kernel.phase5.pm.task1` Update Project Manager technical stage surfaces to show the new orchestration preview boundary, current registered controller, and user-facing reason that step execution is waiting for the next step-specific release (scope: `src/client/project-manager/components/shared/stage-confirmation-card.tsx, src/client/project-manager/components/layout/main-area-panel-content.tsx, src/client/project-manager/services/workflow-state-client.ts`; expected commit: `feat: show managed workflow orchestration preview in project manager`).
36. [TODO] Git Commit: `feat: show managed workflow orchestration preview in project manager` (hash: TBD)

37. [TODO] `managed-orchestration-kernel.phase5.pm.task2` Add UI/service tests for the visual control point: managed technical stages show new cluster status, no legacy accept/continue controls, and session restore prefers the existing boundary session (scope: `src/client/project-manager/services/workflow-step-start-service.gating.test.ts, src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts, src/client/project-manager/components/shared/stage-confirmation-card.test.tsx`; expected commit: `test: cover managed workflow preview projection`).
38. [TODO] Git Commit: `test: cover managed workflow preview projection` (hash: TBD)

## Phase 6 — Tooling Verification (owner: Codex, updated: 2026-05-15)

### Stream: Targeted Verification

39. [TODO] `managed-orchestration-kernel.phase6.verify.task1` Run targeted core and Project Manager builds/tests for the new cluster boundary and record exact verification evidence in this plan (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify managed workflow kernel runtime slice`).
40. [TODO] Git Commit: `docs: verify managed workflow kernel runtime slice` (hash: TBD)

Expected verification commands:

- `npm run build:core`
- targeted `node --test` for new `packages/core/dist/managed-workflow-orchestration/*.test.js`
- targeted workflow-state/session-request tests touched by the runtime boundary
- `npm run build:web-client` or the current Project Manager build command used by this repo
- `npm run typecheck:webview` if Project Manager/shared UI types are touched
- `npm run plan:validate`

## Phase 7 — Release Build (owner: Codex + User, updated: 2026-05-15)

### Stream: Release Build Confirmation

41. [TODO] `managed-orchestration-kernel.phase7.release-confirmation.task1` Ask the user for explicit release build confirmation after implementation and tooling verification pass; do not prepare release notes or run build scripts before confirmation (scope: user workflow; expected commit: not required).

### Stream: Release Preparation And Build

42. [TODO] `managed-orchestration-kernel.phase7.release.task1` After explicit confirmation, update release-facing docs for the future version before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed workflow kernel runtime release`).
43. [TODO] Git Commit: `docs: prepare managed workflow kernel runtime release` (hash: TBD)
44. [TODO] `managed-orchestration-kernel.phase7.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: generated package/version files + `doc/TODO/todo-plan.md`; expected commit: `chore: build managed workflow kernel runtime release`).
45. [TODO] Git Commit: `chore: build managed workflow kernel runtime release` (hash: TBD)
46. [TODO] `managed-orchestration-kernel.phase7.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed workflow kernel runtime release`).
47. [TODO] Git Commit: `docs: record managed workflow kernel runtime release` (hash: TBD)

## Phase 8 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

48. [TODO] `managed-orchestration-kernel.phase8.user-acceptance.task1` User installs the release and verifies the visible control point: technical stages route through the new `Managed Workflow Orchestration` cluster preview, existing main functions still work, no legacy managed continuation/acceptance behavior returns, and any bugs are reported as a follow-up stream instead of closing this scope (scope: user workflow; expected commit: not required).

## Phase 9 — Scope Closeout (owner: Codex, updated: 2026-05-15)

### Stream: Close Plan After User Acceptance

49. [TODO] `managed-orchestration-kernel.phase9.closeout.task1` Archive this implementation plan after explicit user acceptance and leave the repository ready for the next step-specific orchestration plan, likely Diagram Modules end-to-end (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed workflow kernel runtime scope`).
50. [TODO] Git Commit: `docs: close managed workflow kernel runtime scope` (hash: TBD)
51. [TODO] `managed-orchestration-kernel.phase9.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: chat/process observation only; expected commit: not required).
