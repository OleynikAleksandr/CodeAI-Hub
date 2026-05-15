# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-orchestration-kernel-runtime-2026-05-15",
  "branch": "codex/managed-orchestration-rewrite",
  "baseHead": "ba5d1041e",
  "lastRecordedCommit": "074606317",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Managed_Workflow_Orchestration_Cluster_Planning.md",
  "currentTaskId": "managed-orchestration-kernel.phase9.readmodel.task1",
  "expectedCommitMessage": "feat: project preliminary workflow orchestration state",
  "debt": {
    "expectedCommitMessage": "feat: project preliminary workflow orchestration state",
    "preCommitHead": "074606317",
    "stage": "commit_pending",
    "taskId": "managed-orchestration-kernel.phase9.readmodel.task1"
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
18. [DONE] Git Commit: `feat: register quality gates managed workflow controller` (hash: 5914a30fd)

## Phase 3 — Store, Audit, Commit Boundary, And Recovery Kernel (owner: Codex, updated: 2026-05-15)

### Stream: Durable Kernel Services

19. [DONE] `managed-orchestration-kernel.phase3.store.task1` Implement a minimal `ManagedWorkflowPlanStore` abstraction for current-state persistence and read-only snapshot reconstruction without reviving retired child-plan mutation logic (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-plan-store.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-ledger-types.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-plan-store.test.ts`; expected commit: `feat: add managed workflow plan store abstraction`).
20. [DONE] Git Commit: `feat: add managed workflow plan store abstraction` (hash: 860c04bb4)

21. [DONE] `managed-orchestration-kernel.phase3.audit.task1` Add `ManagedWorkflowAuditLog` and tests for Core decisions, effects, blockers, provider-visible messages, and recovery actions (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-audit-log.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-audit-log.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-effects.ts`; expected commit: `feat: add managed workflow audit log`).
22. [DONE] Git Commit: `feat: add managed workflow audit log` (hash: 7fcdcfa16)

23. [DONE] `managed-orchestration-kernel.phase3.commit.task1` Add a fail-closed `ManagedWorkflowCommitTransaction` boundary that records intended commit decisions but refuses pseudo-hashes and does not yet perform step commits (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-commit-transaction.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-commit-transaction.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-effects.ts`; expected commit: `feat: add managed workflow commit transaction boundary`).
24. [DONE] Git Commit: `feat: add managed workflow commit transaction boundary` (hash: 33c27f80e)

25. [DONE] `managed-orchestration-kernel.phase3.recovery.task1` Add baseline `ManagedWorkflowRecoveryArbiter` decisions for wait-user, wait-provider, retry-provider, blocked, and panic-stop states (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-recovery-arbiter.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-recovery-arbiter.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-snapshot.ts`; expected commit: `feat: add managed workflow recovery arbiter baseline`).
26. [DONE] Git Commit: `feat: add managed workflow recovery arbiter baseline` (hash: f42a5fb08)

## Phase 4 — Runtime Boundary Integration (owner: Codex, updated: 2026-05-15)

### Stream: Provider And Runtime Gateway

27. [DONE] `managed-orchestration-kernel.phase4.provider-gateway.task1` Add provider-neutral `ManagedWorkflowProviderGateway` preview boundary that can produce visible Core messages but cannot yet dispatch step work to providers (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-provider-gateway.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-core-message.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-provider-gateway.test.ts`; expected commit: `feat: add managed workflow provider gateway preview`).
28. [DONE] Git Commit: `feat: add managed workflow provider gateway preview` (hash: 697503b60)

29. [DONE] `managed-orchestration-kernel.phase4.runtime.task1` Route managed technical stage starts through `ManagedWorkflowOrchestrationFacade` so Diagram Modules/Application Skeleton/Quality Gates use the new preview boundary instead of a generic fail-closed message (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.ts`; expected commit: `feat: route managed stage starts through orchestration facade`).
30. [DONE] Git Commit: `feat: route managed stage starts through orchestration facade` (hash: c321a5067)

31. [DONE] `managed-orchestration-kernel.phase4.runtime.task2` Persist the new Core-authored preview messages into the managed session/event feed so user-visible boundary diagnostics survive refresh/restart (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts, packages/core/src/remote-bridge/handlers/session-request-handler.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-audit-log.ts`; expected commit: `feat: persist managed workflow core boundary messages`).
32. [DONE] Git Commit: `feat: persist managed workflow core boundary messages` (hash: bf3ff3dbe)

## Phase 5 — Project Manager Projection And Visual Control Point (owner: Codex, updated: 2026-05-15)

### Stream: Read Model Projection

33. [DONE] `managed-orchestration-kernel.phase5.readmodel.task1` Add read-only `ManagedWorkflowReadModelProjector` and expose preview status in workflow-state snapshots without commits/provider dispatch (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-read-model-projector.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `feat: project managed workflow preview state`).
34. [DONE] Git Commit: `feat: project managed workflow preview state` (hash: 218fba394)

35. [DONE] `managed-orchestration-kernel.phase5.pm.task1` Update Project Manager technical stage surfaces to show the new orchestration preview boundary, current registered controller, and user-facing reason that step execution is waiting for the next step-specific release (scope: `src/client/project-manager/components/shared/stage-confirmation-card.tsx, src/client/project-manager/components/layout/main-area-panel-content.tsx, src/client/project-manager/services/workflow-state-client.ts`; expected commit: `feat: show managed workflow orchestration preview in project manager`).
36. [DONE] Git Commit: `feat: show managed workflow orchestration preview in project manager` (hash: 49f218020)

37. [DONE] `managed-orchestration-kernel.phase5.pm.task2` Add UI/service tests for the visual control point: managed technical stages show new cluster status, no legacy accept/continue controls, and session restore prefers the existing boundary session (scope: `src/client/project-manager/services/workflow-step-start-service.gating.test.ts, src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts, src/client/project-manager/components/shared/stage-confirmation-card.test.ts`; expected commit: `test: cover managed workflow preview projection`).
38. [DONE] Git Commit: `test: cover managed workflow preview projection` (hash: 87f640717)

## Phase 6 — Tooling Verification (owner: Codex, updated: 2026-05-15)

### Stream: Targeted Verification

39. [DONE] `managed-orchestration-kernel.phase6.verify.task1` Run targeted core and Project Manager builds/tests for the new cluster boundary and record exact verification evidence in this plan; verify providerless boundary snapshot typing discovered during typecheck (scope: `doc/TODO/todo-plan.md, src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; expected commit: `docs: verify managed workflow kernel runtime slice`).
40. [DONE] Git Commit: `docs: verify managed workflow kernel runtime slice` (hash: 5574cc648)

Expected verification commands:

- `npm run build:core`
- targeted `node --test` for new `packages/core/dist/managed-workflow-orchestration/*.test.js`
- targeted workflow-state/session-request tests touched by the runtime boundary
- `npm run build:web-client` or the current Project Manager build command used by this repo
- `npm run typecheck:webview` if Project Manager/shared UI types are touched
- `npm run plan:validate`

Verification evidence recorded 2026-05-15:

- `npm run build:core` — passed.
- `node --test packages/core/dist/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-state-machine.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-step-registry.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-plan-store.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-audit-log.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-commit-transaction.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-recovery-arbiter.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-provider-gateway.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-managed-state.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js` — 27 tests passed.
- `npm run build:project-manager` — passed.
- `npx tsx --test src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts src/client/project-manager/components/shared/stage-confirmation-card.test.ts` — 26 tests passed.
- `npm run typecheck:webview` — passed after correcting the boundary snapshot fixture to omit providerSessionId instead of using `null`.
- `npm run plan:validate` — passed.

## Phase 7 — Release Build (owner: Codex + User, updated: 2026-05-15)

### Stream: Release Build Confirmation

41. [DONE] `managed-orchestration-kernel.phase7.release-confirmation.task1` Ask the user for explicit release build confirmation after implementation and tooling verification pass; do not prepare release notes or run build scripts before confirmation (scope: user workflow; expected commit: not required). Result: confirmed by the user request to continue through release build without pauses.

### Stream: Release Preparation And Build

42. [DONE] `managed-orchestration-kernel.phase7.release.task1` After explicit confirmation, update release-facing docs for the future version before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed workflow kernel runtime release`).
43. [DONE] Git Commit: `docs: prepare managed workflow kernel runtime release` (hash: 26d102cb3)
44. [DONE] `managed-orchestration-kernel.phase7.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/core/package.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/localization/package.json, packages/translation/package.json, packages/initiatives/package.json, packages/unified-session/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build managed workflow kernel runtime release`).
45. [DONE] Git Commit: `chore: build managed workflow kernel runtime release` (hash: 0bdb372cb)
46. [DONE] `managed-orchestration-kernel.phase7.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed workflow kernel runtime release`).
47. [DONE] Git Commit: `docs: record managed workflow kernel runtime release` (hash: c46d10caf)

`build-all.sh` evidence recorded 2026-05-15:

- Command: `./scripts/build-all.sh --allow-dirty`; dirty input was limited to the active plan state advanced by `plan:commit`.
- Unified version prepared: `1.2.256`.
- Version files updated to `1.2.256`: root package, core, Claude, Codex, Gemini, localization, translation, initiatives, unified-session, and launcher manifest.
- Release cache and `doc/tmp/releases` contain:
  - `claude-module-1.2.256.tar.bz2`
  - `codex-module-1.2.256.tar.bz2`
  - `gemini-module-1.2.256.tar.bz2`
  - `codeai-hub-core-darwin-arm64-1.2.256.tar.bz2`
  - `CodeAIHubLauncher-macos-arm64-1.2.256.tar.bz2`
  - `vscode-webview-1.2.256.tar.bz2`
  - `project-manager-1.2.256.tar.bz2`

`build-release.sh` evidence recorded 2026-05-15:

- Command: `./scripts/build-release.sh --use-current-version --allow-dirty`; dirty input was limited to the active plan state advanced by `plan:commit`.
- Release version used: `1.2.256`.
- Required release checks passed: architecture guard, root type-check, compile, SDK exclusions, local artefact validation, markdown links, duplication check, VSIX package surface verification.
- VSIX produced: `codeai-hub-1.2.256.vsix` (47M on disk, script summary: 48M).
- Release tarballs remain available in `doc/tmp/releases/` and `/Users/oleksandroliinyk/.codeai-hub/releases/`.

## Phase 8 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

48. [DONE] `managed-orchestration-kernel.phase8.user-acceptance.task1` User installs the release and verifies the visible control point: technical stages route through the new `Managed Workflow Orchestration` cluster preview, existing main functions still work, no legacy managed continuation/acceptance behavior returns, and any bugs are reported as a follow-up stream instead of closing this scope (scope: user workflow; expected commit: not required). Result: v1.2.256 acceptance found a blocking UI/orchestration ownership regression. Description can complete and produce `Final_Description.md`, but Project Manager hides the Description session and Virtual Simulation start card behind a false read-only placeholder because `managedWorkflowPreview.active` is treated as a downstream lock signal instead of a visual preview signal.

## Phase 9 — Preliminary Workflow Orchestration Integration (owner: Codex, updated: 2026-05-15)

### Stream: Scope Extension

49. [DONE] `managed-orchestration-kernel.phase9.scope.task1` Convert the failed v1.2.256 user acceptance into a focused two-phase follow-up: integrate Description and Virtual Simulation into the new orchestrator as provider-direct preliminary steps, remove duplicated start/read-only decisions from UI/service code, then rebuild a retest release (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan preliminary workflow orchestration integration`).
50. [DONE] Git Commit: `docs: plan preliminary workflow orchestration integration` (hash: c2d9637fc)

### Stream: Step Contract And Registry

51. [DONE] `managed-orchestration-kernel.phase9.contract.task1` Add explicit start policy metadata, create provider-direct preliminary controllers, register all five workflow trunk steps, and keep Core preview boundary decisions limited to technical `core_preview_boundary` stages. This task intentionally absorbs the former registry-only slice because `knip` requires new controller files to be live-referenced before commit (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-contracts.ts, packages/core/src/managed-workflow-orchestration/index.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-step-registry.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.ts, packages/core/src/managed-workflow-orchestration/steps/description-step-controller.ts, packages/core/src/managed-workflow-orchestration/steps/virtual-simulation-step-controller.ts`; expected commit: `feat: add preliminary workflow step controllers`).
52. [DONE] Git Commit: `feat: add preliminary workflow step controllers` (hash: 074606317)

### Stream: Read Model And State Ownership

55. [DONE] `managed-orchestration-kernel.phase9.readmodel.task1` Project orchestrator-owned state for all five trunk steps, including provider-direct stages, technical boundary stages, and real read-only upstream stages computed from downstream workflow state instead of preview availability (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-read-model-projector.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `feat: project preliminary workflow orchestration state`).
56. [PENDING] Git Commit: `feat: project preliminary workflow orchestration state` (hash: TBD)

### Stream: Project Manager Consumption

57. [TODO] `managed-orchestration-kernel.phase9.pm.task1` Replace Project Manager's local preview-as-lock predicate with the orchestrator read-only projection so Description sessions and Virtual Simulation start cards stay visible until a real downstream technical step starts (scope: `src/client/project-manager/services/workflow-state-client.ts, src/client/project-manager/components/layout/main-area-panel-content.tsx, src/client/project-manager/services/workflow-state-client.test.ts`; expected commit: `fix: consume orchestrator read-only projection`).
58. [TODO] Git Commit: `fix: consume orchestrator read-only projection` (hash: TBD)
59. [TODO] `managed-orchestration-kernel.phase9.pm.task2` Route preliminary step start metadata and existing-session lookup through orchestrator-owned stage metadata while preserving current Description/Virtual Simulation provider-direct session transport (scope: `src/client/project-manager/components/layout/workflow-stage-tool-routing.ts, src/client/project-manager/components/shared/stage-confirmation-card-workflow.ts, src/client/project-manager/services/workflow-step-start-service.ts`; expected commit: `feat: route preliminary step starts through orchestrator metadata`).
60. [TODO] Git Commit: `feat: route preliminary step starts through orchestrator metadata` (hash: TBD)

### Stream: Regression Coverage

61. [TODO] `managed-orchestration-kernel.phase9.tests.task1` Add Project Manager regression coverage proving completed Description still shows/restores its session, Virtual Simulation card appears after Description completion, and technical stages still show the managed preview boundary (scope: `src/client/project-manager/components/layout/main-area-panel-content.test.ts, src/client/project-manager/services/workflow-step-start-service.gating.test.ts, src/client/project-manager/components/shared/stage-confirmation-card.test.ts`; expected commit: `test: cover preliminary workflow orchestration visibility`).
62. [TODO] Git Commit: `test: cover preliminary workflow orchestration visibility` (hash: TBD)
63. [TODO] `managed-orchestration-kernel.phase9.tests.task2` Add Core regression coverage proving Description and Virtual Simulation are registered provider-direct steps that do not create Core preview boundary sessions, while technical stages still do (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `test: cover provider-direct preliminary step policy`).
64. [TODO] Git Commit: `test: cover provider-direct preliminary step policy` (hash: TBD)

## Phase 10 — Release Build For Preliminary Workflow Retest (owner: Codex + User, updated: 2026-05-15)

### Stream: Tooling Verification

65. [TODO] `managed-orchestration-kernel.phase10.verify.task1` Run targeted Core and Project Manager builds/tests for the preliminary-step integration and record exact evidence before release preparation (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify preliminary workflow orchestration fix`).
66. [TODO] Git Commit: `docs: verify preliminary workflow orchestration fix` (hash: TBD)

### Stream: Release Preparation And Build

67. [TODO] `managed-orchestration-kernel.phase10.release.task1` Update release-facing docs for the future retest version before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare preliminary workflow orchestration release`).
68. [TODO] Git Commit: `docs: prepare preliminary workflow orchestration release` (hash: TBD)
69. [TODO] `managed-orchestration-kernel.phase10.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: generated package/version files + `doc/TODO/todo-plan.md`; expected commit: `chore: build preliminary workflow orchestration release`).
70. [TODO] Git Commit: `chore: build preliminary workflow orchestration release` (hash: TBD)
71. [TODO] `managed-orchestration-kernel.phase10.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record preliminary workflow orchestration release`).
72. [TODO] Git Commit: `docs: record preliminary workflow orchestration release` (hash: TBD)

## Phase 11 — User Workflow Acceptance And Scope Closeout (owner: User + Codex, updated: 2026-05-15)

### Stream: User Acceptance

73. [TODO] `managed-orchestration-kernel.phase11.user-acceptance.task1` User installs the retest release and verifies Description session visibility, Virtual Simulation start card visibility after Description completion, technical preview boundary behavior for Diagram Modules/Application Skeleton/Quality Gates, and absence of retired managed continuation behavior (scope: user workflow; expected commit: not required).

### Stream: Close Plan After User Acceptance

74. [TODO] `managed-orchestration-kernel.phase11.closeout.task1` Archive this implementation plan after explicit user acceptance and leave the repository ready for the next step-specific orchestration plan, likely Diagram Modules end-to-end (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed workflow kernel runtime scope`).
75. [TODO] Git Commit: `docs: close managed workflow kernel runtime scope` (hash: TBD)
76. [TODO] `managed-orchestration-kernel.phase11.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: chat/process observation only; expected commit: not required).
