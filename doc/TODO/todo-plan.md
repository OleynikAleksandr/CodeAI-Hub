# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "preliminary-and-diagram-modules-runtime-orchestration-2026-05-15",
  "branch": "codex/managed-orchestration-rewrite",
  "baseHead": "652a4b821",
  "lastRecordedCommit": "99e2b6e33",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Preliminary_And_Diagram_Modules_Runtime_Orchestration_Planning_RU.md",
  "currentTaskId": "prelim-diagram-runtime.phase3.pm.task1",
  "expectedCommitMessage": "feat: show diagram modules managed orchestration state",
  "debt": {
    "expectedCommitMessage": "feat: show diagram modules managed orchestration state",
    "preCommitHead": "99e2b6e33",
    "stage": "commit_pending",
    "taskId": "prelim-diagram-runtime.phase3.pm.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Preliminary_And_Diagram_Modules_Runtime_Orchestration_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Orchestration_Cluster_Planning.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Execution Rules

- **Required reading before each implementation fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача затрагивает не более 3 файлов, кроме явно указанной регистрационной задачи, где TypeScript export/registry/test должны быть атомарны для `knip`.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Commit выполняется через `npm run plan:commit -- "<expected commit message>"`; hooks не обходить.
- Цель scope: перевести первые три trunk steps на новый orchestrator-owned runtime contract: provider-direct `Description`, provider-direct `Virtual Simulation`, managed Type A/B/Persistent `Diagram Modules`.
- `Application Skeleton` и `Quality Gates` остаются preview/fail-closed до следующих scope.
- Release build нельзя выполнять до отдельного подтверждения пользователя на сборку релиза.

## Phase 0 — Scope Registration (owner: Codex, updated: 2026-05-15)

### Stream: Active Plan

1. [DONE] `prelim-diagram-runtime.phase0.plan.task1` Create the planning source and active todo-plan for connecting Description, Virtual Simulation, and Diagram Modules to the new orchestration cluster; update Docs Index away from the archived kernel planning path (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Preliminary_And_Diagram_Modules_Runtime_Orchestration_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan preliminary and diagram modules orchestration`).
2. [DONE] Git Commit: `docs: plan preliminary and diagram modules orchestration` (hash: 9c818b558)

## Phase 1 — Orchestrator Runtime Contract For The First Three Steps (owner: Codex, updated: 2026-05-15)

### Stream: Public Contract And Step Policy

3. [DONE] `prelim-diagram-runtime.phase1.contract.task1` Extend public managed workflow contracts so registered steps can return provider-direct, preview-boundary, or managed-dispatch start decisions without callers importing controller internals (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-contracts.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.ts`; expected commit: `feat: add managed workflow start decisions`).
4. [DONE] Git Commit: `feat: add managed workflow start decisions` (hash: e3ead5a8d)

5. [DONE] `prelim-diagram-runtime.phase1.steps.task1` Update the first three step controllers so Description and Virtual Simulation are explicit provider-direct controllers and Diagram Modules exposes managed dispatch metadata, required artifact targets, and phase table through the registry; include facade/registry expectations because this is an observable registration-policy task (scope: `packages/core/src/managed-workflow-orchestration/steps/description-step-controller.ts, packages/core/src/managed-workflow-orchestration/steps/virtual-simulation-step-controller.ts, packages/core/src/managed-workflow-orchestration/steps/diagram-modules-step-controller.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-step-registry.test.ts`; expected commit: `feat: describe first trunk step orchestration policies`).
6. [DONE] Git Commit: `feat: describe first trunk step orchestration policies` (hash: 3419a3481)

### Stream: Runtime Dispatch Boundary

7. [DONE] `prelim-diagram-runtime.phase1.runtime.task1` Route workflow session starts and user-message routing through the facade start decision: provider-direct steps continue existing provider transport, preview-only technical steps keep fail-closed Core message sessions, and Diagram Modules receives managed dispatch instead of preview placeholder or rewrite-blocked message dispatch (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts`; expected commit: `feat: route first trunk steps through managed workflow starts`).
8. [DONE] Git Commit: `feat: route first trunk steps through managed workflow starts` (hash: d1f5a7d0a)

## Phase 2 — Diagram Modules Managed Phase Execution (owner: Codex, updated: 2026-05-15)

### Stream: Core-Gated Prompt And Snapshot

9. [DONE] `prelim-diagram-runtime.phase2.prompt.task1` Add a Diagram Modules managed prompt builder that composes inline upstream artifacts, target paths, and no-Git/no-plan agent instructions for Phase 1 (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.ts, packages/core/src/managed-workflow-orchestration/index.ts`; expected commit: `feat: add diagram modules managed prompt builder`).
10. [DONE] Git Commit: `feat: add diagram modules managed prompt builder` (hash: a9b3e5e42)

11. [DONE] `prelim-diagram-runtime.phase2.snapshot.task1` Persist and project Diagram Modules managed phase snapshot for Phase 1 start and existing-session restore so PM can reopen the same managed session instead of showing a start card; include the cluster index export because the test consumes this through the public cluster boundary (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-plan-store.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-read-model-projector.ts, packages/core/src/managed-workflow-orchestration/index.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `feat: persist diagram modules managed phase snapshot`).
12. [DONE] Git Commit: `feat: persist diagram modules managed phase snapshot` (hash: b72322863)

### Stream: Validation And Review Transition

13. [DONE] `prelim-diagram-runtime.phase2.validation.task1` Connect Diagram Modules artifact validation to provider-turn completion through the new facade, using existing deterministic artifact/progress validators without reviving retired child-plan mutators; include the public contract because the validation method is a facade API (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-validator.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-contracts.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.ts`; expected commit: `feat: validate diagram modules managed turns`).
14. [DONE] Git Commit: `feat: validate diagram modules managed turns` (hash: 8ffc06d9d)

15. [DONE] `prelim-diagram-runtime.phase2.review.task1` Add Type B user-intent classification for Diagram Modules review messages: accept opens persistent return, revision routes to provider, ambiguous text receives Core clarification (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-user-intent-classifier.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-state-machine.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-state-machine.test.ts`; expected commit: `feat: add diagram modules user review transitions`).
16. [DONE] Git Commit: `feat: add diagram modules user review transitions` (hash: 99e2b6e33)

## Phase 3 — Project Manager Projection And Regression Coverage (owner: Codex, updated: 2026-05-15)

### Stream: PM Surface

17. [DONE] `prelim-diagram-runtime.phase3.pm.task1` Update Project Manager workflow state consumption so Description/Virtual Simulation remain provider-direct, Diagram Modules managed phases are visible, and Application Skeleton/Quality Gates remain preview/fail-closed; include the start service because the parsed `managed_dispatch` policy must be accepted by launch gating (scope: `src/client/project-manager/services/workflow-state-client.ts, src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/components/shared/stage-confirmation-card.tsx`; expected commit: `feat: show diagram modules managed orchestration state`).
18. [PENDING] Git Commit: `feat: show diagram modules managed orchestration state` (hash: TBD)

19. [TODO] `prelim-diagram-runtime.phase3.tests.task1` Add regression coverage for the visible three-step flow: Description session visibility, Virtual Simulation start visibility, Diagram Modules managed session start, user-review acceptance, and persistent return open projection (scope: `src/client/project-manager/components/layout/main-area-panel-content.test.ts, src/client/project-manager/services/workflow-step-start-service.gating.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.ts`; expected commit: `test: cover first trunk orchestration flow`).
20. [TODO] Git Commit: `test: cover first trunk orchestration flow` (hash: TBD)

## Phase 4 — Tooling Verification (owner: Codex, updated: 2026-05-15)

### Stream: Targeted Verification

21. [TODO] `prelim-diagram-runtime.phase4.verify.task1` Run targeted Core and Project Manager builds/tests for the first three orchestrated steps and record exact evidence here before release preparation (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify first trunk orchestration flow`).
22. [TODO] Git Commit: `docs: verify first trunk orchestration flow` (hash: TBD)

Expected verification commands:

- `npm run build:core`
- targeted `node --test` for new `packages/core/dist/managed-workflow-orchestration/**/*.test.js`
- targeted session/workflow-state handler tests touched by runtime dispatch
- `npm run typecheck:webview`
- targeted Project Manager tests touched by stage cards/session restore
- `npm run build:webview`
- `npm run plan:validate`

## Phase 5 — Release Build (owner: Codex + User, updated: 2026-05-15)

### Stream: Release Build Confirmation

23. [TODO] `prelim-diagram-runtime.phase5.release-confirmation.task1` Ask the user for explicit release build confirmation after implementation and tooling verification pass; do not prepare release notes or run build scripts before confirmation (scope: user workflow; expected commit: not required).

### Stream: Release Preparation And Build

24. [TODO] `prelim-diagram-runtime.phase5.release.task1` After explicit confirmation, update release-facing docs for the future version before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare first trunk orchestration release`).
25. [TODO] Git Commit: `docs: prepare first trunk orchestration release` (hash: TBD)
26. [TODO] `prelim-diagram-runtime.phase5.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: version manifests/package files generated by release script + `doc/TODO/todo-plan.md`; expected commit: `chore: build first trunk orchestration release`).
27. [TODO] Git Commit: `chore: build first trunk orchestration release` (hash: TBD)
28. [TODO] `prelim-diagram-runtime.phase5.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record first trunk orchestration release`).
29. [TODO] Git Commit: `docs: record first trunk orchestration release` (hash: TBD)

## Phase 6 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

30. [TODO] `prelim-diagram-runtime.phase6.user-acceptance.task1` User installs the release and verifies: Description session is visible after submit, Virtual Simulation start card appears after Description completion, Diagram Modules starts a managed provider session instead of preview placeholder, Core opens user-led review after valid artifacts, and user acceptance opens persistent return state (scope: user workflow; expected commit: not required).

## Phase 7 — Scope Closeout (owner: Codex, updated: 2026-05-15)

### Stream: Close Plan After User Acceptance

31. [TODO] `prelim-diagram-runtime.phase7.closeout.task1` After explicit user acceptance, archive this todo plan and dispose planning documents according to the plan lifecycle rules (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close first trunk orchestration scope`).
32. [TODO] Git Commit: `docs: close first trunk orchestration scope` (hash: TBD)
