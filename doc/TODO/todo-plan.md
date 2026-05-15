# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "preliminary-and-diagram-modules-runtime-orchestration-2026-05-15",
  "branch": "codex/managed-orchestration-rewrite",
  "baseHead": "652a4b821",
  "lastRecordedCommit": "e3be434bf",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Preliminary_And_Diagram_Modules_Runtime_Orchestration_Planning_RU.md",
  "currentTaskId": "diagram-plan-lifecycle-repair.phase17.runtime.task1",
  "expectedCommitMessage": "fix: commit diagram modules accepted subturns",
  "debt": {
    "expectedCommitMessage": "fix: commit diagram modules accepted subturns",
    "preCommitHead": "e3be434bf",
    "stage": "commit_pending",
    "taskId": "diagram-plan-lifecycle-repair.phase17.runtime.task1"
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
- Цель scope: перевести все пять trunk steps на новый orchestrator-owned runtime contract: provider-direct `Description`, provider-direct `Virtual Simulation`, managed Type A/B/Persistent `Diagram Modules`, managed-dispatch `Application Skeleton`, managed-dispatch `Quality Gates`.
- `Application Skeleton` и `Quality Gates` подключаются к новому orchestrator-owned dispatch boundary в этом scope до release build.
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
18. [DONE] Git Commit: `feat: show diagram modules managed orchestration state` (hash: 544e7d7fb)

19. [DONE] `prelim-diagram-runtime.phase3.tests.task1` Add regression coverage for the visible three-step flow: Description session visibility, Virtual Simulation start visibility, Diagram Modules managed session start, user-review acceptance, and persistent return open projection; include the start service because the fail-closed expectation is enforced below the UI card (scope: `src/client/project-manager/services/workflow-state-client.test.ts, src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/services/workflow-step-start-service.gating.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.ts`; expected commit: `test: cover first trunk orchestration flow`).
20. [DONE] Git Commit: `test: cover first trunk orchestration flow` (hash: 56cf937fa)

## Phase 4 — Tooling Verification (owner: Codex, updated: 2026-05-15)

### Stream: Targeted Verification

21. [DONE] `prelim-diagram-runtime.phase4.verify.task1` Run targeted Core and Project Manager builds/tests for the first three orchestrated steps and record exact evidence here before release preparation (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify first trunk orchestration flow`).
22. [DONE] Git Commit: `docs: verify first trunk orchestration flow` (hash: 21f2486a5)

Expected verification commands:

- `npm run build:core`
- targeted `node --test` for new `packages/core/dist/managed-workflow-orchestration/**/*.test.js`
- targeted session/workflow-state handler tests touched by runtime dispatch
- `npm run typecheck:webview`
- targeted Project Manager tests touched by stage cards/session restore
- `npm run build:webview`
- `npm run plan:validate`

Verification evidence recorded 2026-05-15:

- `npm run build:core` — PASS.
- `npm run typecheck:webview` — PASS.
- `node --test packages/core/dist/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-state-machine.test.js packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-plan-store.test.js` — PASS, 17 tests.
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.js packages/core/dist/remote-bridge/handlers/session-request-handler.documentation-rollover.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-managed-state.test.js` — PASS, 10 tests.
- `npx tsx --test src/client/project-manager/services/workflow-state-client.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts src/client/project-manager/components/layout/main-area-panel-content.test.ts` — PASS, 17 tests.
- `npm run build:webview` — PASS.
- `npm run plan:validate` — PASS.

## Phase 5 — Scope Expansion For Remaining Technical Steps (owner: Codex, updated: 2026-05-15)

### Stream: Active Plan Extension

23. [DONE] `remaining-technical-runtime.phase0.plan.task1` Expand this active scope after explicit user confirmation so Application Skeleton and Quality Gates are connected to the new orchestrator before release build (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: expand scope to remaining technical stage orchestration`).
24. [DONE] Git Commit: `docs: expand scope to remaining technical stage orchestration` (hash: 60a11e925)

## Phase 6 — Remaining Technical Step Managed Dispatch (owner: Codex, updated: 2026-05-15)

### Stream: Runtime Policy

25. [DONE] `remaining-technical-runtime.phase1.policy.task1` Move Application Skeleton and Quality Gates controllers from preview-only to managed dispatch and update public facade/projection expectations (scope: `packages/core/src/managed-workflow-orchestration/steps/application-skeleton-step-controller.ts, packages/core/src/managed-workflow-orchestration/steps/quality-gates-step-controller.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `feat: enable remaining technical managed dispatch policies`).
26. [DONE] Git Commit: `feat: enable remaining technical managed dispatch policies` (hash: eb0d10680)

27. [DONE] `remaining-technical-runtime.phase1.runtime.task1` Route Application Skeleton and Quality Gates session creation/message dispatch through managed dispatch instead of preview rewrite blockers (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts`; expected commit: `feat: route remaining technical stages through managed dispatch`).
28. [DONE] Git Commit: `feat: route remaining technical stages through managed dispatch` (hash: f0b88bc07)

### Stream: Project Manager Launch

29. [DONE] `remaining-technical-runtime.phase2.pm.task1` Allow Project Manager start service to launch Application Skeleton and Quality Gates only when their managed policy is `managed_dispatch`, preserving upstream gating and existing-session reuse (scope: `src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/services/workflow-step-start-service.gating.test.ts, src/client/project-manager/services/workflow-state-client.test.ts`; expected commit: `feat: launch remaining technical stages through managed dispatch`).
30. [DONE] Git Commit: `feat: launch remaining technical stages through managed dispatch` (hash: 41c404b32)

### Stream: Verification Repair

31. [DONE] `remaining-technical-runtime.phase3.repair.task1` Align the managed-workspace remote-bridge regression test with the new managed dispatch contract for Application Skeleton and Quality Gates after verification exposed stale preview-boundary expectations (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`; expected commit: `test: align managed workspace dispatch expectation`).
32. [DONE] Git Commit: `test: align managed workspace dispatch expectation` (hash: f04cbddb5)

### Stream: Verification

33. [DONE] `remaining-technical-runtime.phase3.verify.task1` Run targeted Core and Project Manager verification for all five trunk steps and record evidence before release preparation (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify full trunk orchestration flow`).
34. [DONE] Git Commit: `docs: verify full trunk orchestration flow` (hash: 92250ece1)

Verification evidence recorded 2026-05-15 after connecting all five trunk steps:

- `npm run build:core` — PASS.
- `npm run typecheck:webview` — PASS.
- `node --test packages/core/dist/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-state-machine.test.js packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-plan-store.test.js` — PASS, 17 tests.
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.rewrite-blocker.test.js packages/core/dist/remote-bridge/handlers/session-request-handler.documentation-rollover.test.js packages/core/dist/remote-bridge/handlers/workflow-state-service-managed-state.test.js` — PASS, 9 tests.
- `npx tsx --test src/client/project-manager/services/workflow-state-client.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts src/client/project-manager/components/layout/main-area-panel-content.test.ts` — PASS, 17 tests.
- `npm run build:webview` — PASS.
- `npm run plan:validate` — PASS.

## Phase 7 — Release Build (owner: Codex + User, updated: 2026-05-15)

### Stream: Release Build Confirmation

33. [DONE] `prelim-diagram-runtime.phase5.release-confirmation.task1` User explicitly confirmed release build and requested Application Skeleton / Quality Gates orchestration connection before build; release preparation remains blocked until remaining technical step verification is complete (scope: user workflow; expected commit: not required).

### Stream: Release Preparation And Build

35. [DONE] `prelim-diagram-runtime.phase5.release.task1` After remaining technical step verification, update release-facing docs for the future version before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare full trunk orchestration release`).
36. [DONE] Git Commit: `docs: prepare full trunk orchestration release` (hash: a7bf5dedd)

Release preparation evidence recorded 2026-05-15:

- Current package version before release scripts: `1.2.257`.
- Future release version prepared in release-facing docs: `1.2.258`.
- `README.md` current-release banner updated to full trunk managed workflow dispatch.
- `CHANGELOG.md` release entry `1.2.258` added with verification summary.

37. [DONE] `prelim-diagram-runtime.phase5.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/*/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build full trunk orchestration release`).
38. [DONE] Git Commit: `chore: build full trunk orchestration release` (hash: 183c0a8e2)

Build-all evidence recorded 2026-05-15:

- `./scripts/build-all.sh` — PASS.
- Unified generated version: `1.2.258`.
- Updated package/version manifests for root package, provider modules, Core, shared packages, UI, and CEF launcher.
- Release tarballs staged in `doc/tmp/releases/`: `claude-module-1.2.258.tar.bz2`, `codex-module-1.2.258.tar.bz2`, `gemini-module-1.2.258.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.258.tar.bz2`, `vscode-webview-1.2.258.tar.bz2`, `project-manager-1.2.258.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.258.tar.bz2`.

39. [DONE] `prelim-diagram-runtime.phase5.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record full trunk orchestration release`).
40. [DONE] Git Commit: `docs: record full trunk orchestration release` (hash: 145865ed5)

Release package evidence recorded 2026-05-15:

- `./scripts/build-release.sh --use-current-version` — PASS.
- Required release-build output observed: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, `VSIX runtime package surface verified`.
- VSIX package: `codeai-hub-1.2.258.vsix` (`47M`).
- Runtime tarballs staged in `doc/tmp/releases/`: `claude-module-1.2.258.tar.bz2`, `codex-module-1.2.258.tar.bz2`, `gemini-module-1.2.258.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.258.tar.bz2`, `vscode-webview-1.2.258.tar.bz2`, `project-manager-1.2.258.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.258.tar.bz2`.
- Advisory release warnings: markdown link checker reported 17 planning-document anchor issues; package size warning reported `48M`. Neither warning blocked packaging or runtime surface verification.

## Phase 8 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

41. [BLOCKED] `prelim-diagram-runtime.phase6.user-acceptance.task1` User installs the release and verifies: Description session is visible after submit, Virtual Simulation start card appears after Description completion, Diagram Modules starts a managed provider session instead of preview placeholder, Application Skeleton and Quality Gates start through managed dispatch instead of preview placeholders, Core opens user-led review after valid artifacts, and user acceptance opens persistent return state (scope: user workflow; expected commit: not required). Result: release 1.2.258 passed Description and Virtual Simulation, but Diagram Modules stopped after the first `product-parts.index.md` turn because Core did not create the managed workspace scaffold, did not run post-turn managed arbitration, and did not dispatch the next Product Part continuation prompt.

## Phase 9 — Diagram Modules Continuation Repair (owner: Codex, updated: 2026-05-15)

### Stream: Scenario Contract Repair

42. [DONE] `diagram-runtime-repair.phase9.plan.task1` Update the active plan and planning sources so Diagram Modules Phase 1 is explicitly a multi-turn Core-led Type A sequence with startup scaffold, Product Part continuation prompts, and user-led review only after the last Product Part is accepted (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Preliminary_And_Diagram_Modules_Runtime_Orchestration_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md`; expected commit: `docs: plan diagram modules continuation repair`).
43. [DONE] Git Commit: `docs: plan diagram modules continuation repair` (hash: f0e12b7e5)

### Stream: Runtime Scaffold And Subturns

44. [DONE] `diagram-runtime-repair.phase9.scaffold.task1` Add a new Managed Workflow scaffold installer owned by the orchestration cluster and call it when Diagram Modules starts, creating `doc/TODO`, stage plans, workspace plan, plan script, hooks, and package scripts before the provider turn begins (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-scaffold-installer.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`; expected commit: `feat: scaffold managed workspace on diagram modules start`).
45. [DONE] Git Commit: `feat: scaffold managed workspace on diagram modules start` (hash: 467a8ecad)

46. [DONE] `diagram-runtime-repair.phase9.subturn.task1` Replace aggregate-only Diagram Modules validation with subturn-aware planning: index validation accepts the index alone, extracts Product Part ids, resolves the next missing Product Part target, and emits localized Core/user messages when all Product Parts are ready for review (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-validator.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.ts`; expected commit: `feat: model diagram modules managed subturns`).
47. [DONE] Git Commit: `feat: model diagram modules managed subturns` (hash: a56774e49)

48. [DONE] `diagram-runtime-repair.phase9.post-turn.task1` Wire managed post-turn arbitration into provider `turn_completed`: after message flush Core validates the current Diagram Modules subturn, persists the managed decision, appends visible Core feedback, and dispatches the next Product Part continuation prompt instead of leaving the session silent (scope: `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts`; expected commit: `feat: arbitrate diagram modules turns after provider completion`).
49. [DONE] Git Commit: `feat: arbitrate diagram modules turns after provider completion` (hash: 51bfbd9ae)

### Stream: Verification

50. [DONE] `diagram-runtime-repair.phase9.verify.task1` Run targeted Core verification for the Diagram Modules scaffold and post-turn continuation flow, then record exact evidence before asking for release-build confirmation (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify diagram modules continuation repair`).
51. [DONE] Git Commit: `docs: verify diagram modules continuation repair` (hash: dd87e5299)

Verification evidence recorded 2026-05-15:

- `npm run build:core` — PASS.
- `node --test packages/core/dist/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.js packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.js packages/core/dist/remote-bridge/handlers/session-provider-event-router.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.js` — PASS, 16 tests.
- `npm run plan:validate` — PASS.

Repair coverage:

- Diagram Modules start creates managed workspace scaffold before provider dispatch.
- Index-only Diagram Modules subturn is accepted as a valid subturn and produces the next Product Part continuation prompt.
- Provider `turn_completed` waits for message flush, runs normal turn arbitration, then invokes managed workflow continuation arbitration.

## Phase 10 — Release Build Reconfirmation (owner: User, updated: 2026-05-15)

### Stream: Release Build Confirmation

52. [DONE] `diagram-runtime-repair.phase10.release-confirmation.task1` After the repair stream and targeted verification pass, ask the user for a separate explicit confirmation before preparing release metadata or running release build scripts (scope: user workflow; expected commit: not required). Result: User explicitly confirmed release build for the Diagram Modules continuation repair.

## Phase 11 — Release Build (owner: Codex, updated: 2026-05-15)

### Stream: Release Preparation And Build

53. [DONE] `diagram-runtime-repair.phase11.release.task1` Update release-facing docs for the future version before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare diagram modules continuation repair release`).
54. [DONE] Git Commit: `docs: prepare diagram modules continuation repair release` (hash: affecc5ba)

Release preparation evidence recorded 2026-05-15:

- Current package version before release scripts: `1.2.258`.
- Future release version prepared in release-facing docs: `1.2.259`.
- `README.md` current-release banner updated to Diagram Modules continuation repair.
- `CHANGELOG.md` release entry `1.2.259` added with verification summary.

55. [DONE] `diagram-runtime-repair.phase11.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/*/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build diagram modules continuation repair release`).
56. [DONE] Git Commit: `chore: build diagram modules continuation repair release` (hash: 682f39f8c)

Build-all evidence recorded 2026-05-15:

- `./scripts/build-all.sh` — PASS.
- Unified generated version: `1.2.259`.
- Updated package/version manifests for root package, provider modules, Core, shared packages, UI, and CEF launcher.
- Release tarballs staged in `doc/tmp/releases/`: `claude-module-1.2.259.tar.bz2`, `codex-module-1.2.259.tar.bz2`, `gemini-module-1.2.259.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.259.tar.bz2`, `vscode-webview-1.2.259.tar.bz2`, `project-manager-1.2.259.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.259.tar.bz2`.

57. [DONE] `diagram-runtime-repair.phase11.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record diagram modules continuation repair release`).
58. [DONE] Git Commit: `docs: record diagram modules continuation repair release` (hash: 1f10dde37)

Release package evidence recorded 2026-05-15:

- `./scripts/build-release.sh --use-current-version` — PASS.
- Required release-build output observed: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, `VSIX runtime package surface verified`.
- VSIX package: `codeai-hub-1.2.259.vsix` (`47M`).
- Runtime tarballs staged in `doc/tmp/releases/`: `claude-module-1.2.259.tar.bz2`, `codex-module-1.2.259.tar.bz2`, `gemini-module-1.2.259.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.259.tar.bz2`, `vscode-webview-1.2.259.tar.bz2`, `project-manager-1.2.259.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.259.tar.bz2`.
- Advisory release warnings: markdown link checker reported 17 planning-document anchor issues; package size warning reported `48M`. Neither warning blocked packaging or runtime surface verification.

## Phase 12 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

59. [BLOCKED] `diagram-runtime-repair.phase12.user-acceptance.task1` User installs the release and verifies: Description and Virtual Simulation still pass, Diagram Modules start creates the managed workspace scaffold, Core dispatches Product Part continuation prompts after provider turns, and Core opens User-Led Review only after the last Product Part is accepted (scope: user workflow; expected commit: not required). Result: release 1.2.259 passed the first Diagram Modules index turn and dispatched the `project-manager` Product Part continuation, but Core did not create the managed stage/TODO scaffold at Diagram Modules start, then rejected `product-parts/project-manager.md` with `Product Part artifact has invalid heading` and left the provider/user session idle instead of dispatching an executable repair prompt.

## Phase 13 — Diagram Modules Runtime Repair (owner: Codex, updated: 2026-05-15)

### Stream: Failure Intake

60. [DONE] `diagram-runtime-repair.phase13.plan.task1` Record the failed release 1.2.259 acceptance and expand the active repair scope for Diagram Modules startup scaffold creation plus invalid Product Part repair dispatch (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Preliminary_And_Diagram_Modules_Runtime_Orchestration_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md`; expected commit: `docs: plan diagram modules scaffold repair dispatch fix`).
61. [DONE] Git Commit: `docs: plan diagram modules scaffold repair dispatch fix` (hash: 8040a6367)

### Stream: Runtime Repair

62. [DONE] `diagram-runtime-repair.phase13.scaffold.task1` Fix Diagram Modules start so Core installs the managed workspace scaffold in the actual `session:create` runtime path before the first provider prompt, and cover the created stage TODO/workspace plan structure in regression tests (scope: `packages/core/src/managed-workflow-orchestration/managed-workflow-scaffold-installer.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.ts, packages/core/src/remote-bridge/remote-bridge-session-create-router.test.ts`; expected commit: `fix: create diagram modules managed scaffold on start`).
63. [DONE] Git Commit: `fix: create diagram modules managed scaffold on start` (hash: baa7d29af)

64. [DONE] `diagram-runtime-repair.phase13.repair-prompt.task1` Fix Product Part rejection handling so invalid current artifacts produce a provider-visible repair prompt with the exact target/diagnostics instead of only a passive Core message, and align heading validation/prompt copy with the accepted Product Part contract (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.test.ts`; expected commit: `fix: dispatch diagram modules repair prompts`).
65. [DONE] Git Commit: `fix: dispatch diagram modules repair prompts` (hash: dad89d17f)

### Stream: Verification

66. [DONE] `diagram-runtime-repair.phase13.verify.task1` Run targeted Core verification for Diagram Modules scaffold creation, Product Part validation, and provider repair-prompt dispatch, then record exact evidence before asking for release-build confirmation (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify diagram modules scaffold repair dispatch fix`).
67. [DONE] Git Commit: `docs: verify diagram modules scaffold repair dispatch fix` (hash: bf65854dd)

Verification evidence recorded 2026-05-15:

- `npm run build:core` — PASS.
- `node --test packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-runtime-core.test.js packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.js` — PASS, 15 tests.
- `npm run plan:validate` — PASS.

Repair coverage:

- `session:create` now installs the managed workspace scaffold before provider dispatch for `diagram_modules`: `doc/TODO/workspace.plan.md`, `doc/TODO/stages/diagram-modules/todo-plan.md`, `scripts/plan-orchestrator/plan-cli.mjs`, `.husky/pre-commit`, and plan scripts.
- Invalid current Product Part validation now sends a provider-visible repair prompt with the exact target path, deterministic diagnostics, and required `# Product Part: <part-id>` heading instead of only a passive Core message.
- Product Part continuation prompts now include the required heading contract before the agent writes each Product Part artifact.

## Phase 14 — Release Build Reconfirmation (owner: User, updated: 2026-05-15)

### Stream: Release Build Confirmation

68. [DONE] `diagram-runtime-repair.phase14.release-confirmation.task1` After the repair stream and targeted verification pass, ask the user for a separate explicit confirmation before preparing release metadata or running release build scripts (scope: user workflow; expected commit: not required). Result: User explicitly confirmed release build for the Diagram Modules scaffold and repair-prompt fix.

## Phase 15 — Release Build (owner: Codex, updated: 2026-05-15)

### Stream: Release Preparation And Build

69. [DONE] `diagram-runtime-repair.phase15.release.task1` After explicit release-build confirmation, update release-facing docs for the future version before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare diagram modules scaffold repair release`).
70. [DONE] Git Commit: `docs: prepare diagram modules scaffold repair release` (hash: ed0788384)

Release preparation evidence recorded 2026-05-15:

- Current package version before release scripts: `1.2.259`.
- Future release version prepared in release-facing docs: `1.2.260`.
- `README.md` current-release banner updated to Diagram Modules scaffold and repair-prompt fix.
- `CHANGELOG.md` release entry `1.2.260` added with verification summary.

71. [DONE] `diagram-runtime-repair.phase15.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/*/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build diagram modules scaffold repair release`).
72. [DONE] Git Commit: `chore: build diagram modules scaffold repair release` (hash: 984309c62)

Build-all evidence recorded 2026-05-15:

- `./scripts/build-all.sh --allow-dirty` — PASS. Dirty tree allowance was limited to the active `doc/TODO/todo-plan.md` post-commit task transition; no code/package paths were dirty before build start.
- Unified generated version: `1.2.260`.
- Updated package/version manifests for root package, provider modules, Core, shared packages, UI, and CEF launcher.
- Release tarballs staged in `doc/tmp/releases/`: `claude-module-1.2.260.tar.bz2`, `codex-module-1.2.260.tar.bz2`, `gemini-module-1.2.260.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.260.tar.bz2`, `vscode-webview-1.2.260.tar.bz2`, `project-manager-1.2.260.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.260.tar.bz2`.

73. [DONE] `diagram-runtime-repair.phase15.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record diagram modules scaffold repair release`).
74. [DONE] Git Commit: `docs: record diagram modules scaffold repair release` (hash: e0d1a7795)

Release package evidence recorded 2026-05-15:

- `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS. Dirty tree allowance was limited to the active `doc/TODO/todo-plan.md` post-commit task transition; no code/package paths were dirty before build start.
- Required release-build output observed: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, `VSIX runtime package surface verified`.
- VSIX package: `codeai-hub-1.2.260.vsix` (`47M`; script package-size check reported `48M`).
- Runtime tarballs staged in `doc/tmp/releases/`: `claude-module-1.2.260.tar.bz2`, `codex-module-1.2.260.tar.bz2`, `gemini-module-1.2.260.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.260.tar.bz2`, `vscode-webview-1.2.260.tar.bz2`, `project-manager-1.2.260.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.260.tar.bz2`.
- Advisory release warnings: markdown link checker reported 17 planning-document anchor issues; package size warning reported `48M`. Neither warning blocked packaging or runtime surface verification.

## Phase 16 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

75. [BLOCKED] `diagram-runtime-repair.phase16.user-acceptance.task1` User installs the repaired release and verifies: Diagram Modules start creates managed stage/TODO scaffold, valid index dispatches Product Part continuations, invalid Product Part attempts trigger provider-visible repair prompts, valid Product Parts continue through the sequence, and Core opens User-Led Review only after the last Product Part is accepted (scope: user workflow; expected commit: not required). **BLOCKED 2026-05-15:** release `1.2.260` fixed scaffold creation, Product Part continuations, repair dispatch, and the final Core review message, but Core did not advance the managed workspace/stage plans after accepted subturns. Test workspace `doc/TODO/stages/diagram-modules/todo-plan.md` stayed on the initial `index.task1`, no Product Part microtasks/commit boundaries were created, and Phase 2 user review was not represented in the stage plan.

## Phase 17 — Diagram Modules Managed Plan Lifecycle Repair (owner: Codex, updated: 2026-05-15)

### Stream: Runtime Plan Ownership

76. [DONE] `diagram-plan-lifecycle-repair.phase17.plan.task1` Document the `1.2.260` acceptance finding and open a repair stream for Core-owned Diagram Modules stage-plan advancement, managed commit boundaries, and user-review phase creation (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Preliminary_And_Diagram_Modules_Runtime_Orchestration_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md`; expected commit: `docs: plan diagram modules managed plan lifecycle repair`).
77. [DONE] Git Commit: `docs: plan diagram modules managed plan lifecycle repair` (hash: 1f03e44f3)

78. [DONE] `diagram-plan-lifecycle-repair.phase17.controller.task1` Add a Core-owned Diagram Modules stage-plan controller that commits accepted Type A subturns, records real hashes, injects the next Product Part microtask, and opens the Phase 2 review task after the final Product Part (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts`; expected commit: `feat: advance diagram modules managed stage plan`).
79. [DONE] Git Commit: `feat: advance diagram modules managed stage plan` (hash: e3be434bf)

80. [DONE] `diagram-plan-lifecycle-repair.phase17.runtime.task1` Wire the stage-plan controller into Diagram Modules post-turn arbitration so continuation/user-review messages are sent only after the accepted subturn commit boundary succeeds; include a regression for index -> Product Part -> review plan movement (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.test.ts`; expected commit: `fix: commit diagram modules accepted subturns`).
81. [PENDING] Git Commit: `fix: commit diagram modules accepted subturns` (hash: TBD)

82. [TODO] `diagram-plan-lifecycle-repair.phase17.verify.task1` Run targeted Core builds/tests for Diagram Modules validation, scaffold, stage-plan advancement, and runtime post-turn arbitration; record exact evidence before release preparation (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify diagram modules managed plan lifecycle repair`).
83. [TODO] Git Commit: `docs: verify diagram modules managed plan lifecycle repair` (hash: TBD)

## Phase 18 — Scope Closeout (owner: Codex, updated: 2026-05-15)

### Stream: Close Plan After User Acceptance

84. [TODO] `prelim-diagram-runtime.phase18.closeout.task1` After explicit user acceptance, archive this todo plan and dispose planning documents according to the plan lifecycle rules (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close full trunk orchestration scope`).
85. [TODO] Git Commit: `docs: close full trunk orchestration scope` (hash: TBD)
