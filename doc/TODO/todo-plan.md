# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "preliminary-and-diagram-modules-runtime-orchestration-2026-05-15",
  "branch": "codex/managed-orchestration-rewrite",
  "baseHead": "652a4b821",
  "lastRecordedCommit": "6a62b6fa1",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Preliminary_And_Diagram_Modules_Runtime_Orchestration_Planning_RU.md",
  "currentTaskId": "diagram-plan-lifecycle-repair.phase42.verify.task1",
  "expectedCommitMessage": "docs: verify diagram modules index dirty repair",
  "debt": {
    "expectedCommitMessage": "docs: verify diagram modules index dirty repair",
    "preCommitHead": "6a62b6fa1",
    "stage": "commit_pending",
    "taskId": "diagram-plan-lifecycle-repair.phase42.verify.task1"
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
81. [DONE] Git Commit: `fix: commit diagram modules accepted subturns` (hash: 89cdf7317)

82. [DONE] `diagram-plan-lifecycle-repair.phase17.verify.task1` Run targeted Core builds/tests for Diagram Modules validation, scaffold, stage-plan advancement, and runtime post-turn arbitration; record exact evidence before release preparation (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify diagram modules managed plan lifecycle repair`).
83. [DONE] Git Commit: `docs: verify diagram modules managed plan lifecycle repair` (hash: 357a475aa)

Verification evidence recorded 2026-05-15:

- `npm run build:core` — PASS.
- `node --test packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-runtime-core.test.js packages/core/dist/remote-bridge/remote-bridge-session-create-router.test.js packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.js packages/core/dist/managed-workflow-orchestration/managed-workflow-orchestration-facade.test.js` — PASS, 17 tests.
- `npm run plan:validate` — PASS.
- Covered behavior: greenfield workspace without `.git` is initialized by Core; accepted index subturn commits managed scaffold/index and opens the next Product Part microtask; accepted final Product Part commits before opening Phase 2 user review in `doc/TODO/stages/diagram-modules/todo-plan.md`; runtime continuation/review messages are emitted only after the managed commit boundary succeeds.

## Phase 18 — Release Build Gate For Managed Plan Lifecycle Repair (owner: Codex + User, updated: 2026-05-15)

### Stream: Release Confirmation Gate

84. [DONE] `diagram-plan-lifecycle-repair.phase18.release-gate.task1` Add the required post-repair release gate and retest path before closeout; closeout remains blocked until a new release is built and explicitly accepted by the user (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open diagram modules managed plan lifecycle release gate`).
85. [DONE] Git Commit: `docs: open diagram modules managed plan lifecycle release gate` (hash: a96ea4965)

86. [DONE] `diagram-plan-lifecycle-repair.phase18.release-confirmation.task1` Stop for explicit user confirmation before preparing release notes, running `build-all.sh`, or packaging a new VSIX for the managed plan lifecycle repair (scope: user workflow; expected commit: none). Result: User explicitly confirmed release build for the Diagram Modules managed plan lifecycle repair.

## Phase 19 — Release Build (owner: Codex, updated: 2026-05-15)

### Stream: Release Preparation And Build

87. [DONE] `diagram-plan-lifecycle-repair.phase19.release.task1` After explicit release-build confirmation, update release-facing docs for the future version before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare diagram modules managed plan lifecycle release`).
88. [DONE] Git Commit: `docs: prepare diagram modules managed plan lifecycle release` (hash: 4fc3d08fd)

Release preparation evidence recorded 2026-05-15:

- Current package version before release scripts: `1.2.260`.
- Future release version prepared in release-facing docs: `1.2.261`.
- `README.md` current-release banner updated to the Diagram Modules managed plan lifecycle fix.
- `CHANGELOG.md` release entry `1.2.261` added with verification summary.

89. [DONE] `diagram-plan-lifecycle-repair.phase19.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/*/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build diagram modules managed plan lifecycle release`).
90. [DONE] Git Commit: `chore: build diagram modules managed plan lifecycle release` (hash: ea709a612)

Release build-all evidence recorded 2026-05-15:

- `./scripts/build-all.sh --allow-dirty` - PASS. Dirty tree allowance was limited to the active `doc/TODO/todo-plan.md` post-commit task transition; no code/package paths were dirty before build start.
- Unified generated version: `1.2.261`.
- Generated release archives in `doc/tmp/releases/`: `claude-module-1.2.261.tar.bz2`, `codex-module-1.2.261.tar.bz2`, `gemini-module-1.2.261.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.261.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.261.tar.bz2`, `vscode-webview-1.2.261.tar.bz2`, `project-manager-1.2.261.tar.bz2`.
- Updated package versions and managed release manifests to `1.2.261`.

91. [DONE] `diagram-plan-lifecycle-repair.phase19.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record diagram modules managed plan lifecycle release`).
92. [DONE] Git Commit: `docs: record diagram modules managed plan lifecycle release` (hash: 2209d1dd0)

Release VSIX evidence recorded 2026-05-15:

- `./scripts/build-release.sh --use-current-version --allow-dirty` - PASS. Dirty tree allowance was limited to the active `doc/TODO/todo-plan.md` post-commit task transition; no code/package paths were dirty before build start.
- Required release-build output observed: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, `VSIX runtime package surface verified`.
- VSIX package: `codeai-hub-1.2.261.vsix` (`47M`; script package-size check reported `48M`).
- Release runtime archives remain available in `doc/tmp/releases/` for version `1.2.261`.
- Advisory warnings observed: 17 pre-existing markdown anchor issues in planning documents and package-size warning over 20MB.

## Phase 20 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

93. [DONE] `diagram-plan-lifecycle-repair.phase20.user-acceptance.task1` User installs the rebuilt release and verifies: Diagram Modules start creates managed scaffold, each accepted index/Product Part subturn receives a real Git commit and stage-plan hash, next Product Part microtasks are injected, Phase 2 user review appears in `doc/TODO/stages/diagram-modules/todo-plan.md`, and continuation/review messages appear only after the managed commit boundary succeeds (scope: user workflow; expected commit: none). Result: Release 261 user retest found a Diagram Modules managed commit blocker: transient .git/index.lock stopped Core before the commit boundary, and Core/system messages need localization through Messages for the User.

## Phase 21 — Release 261 Retest Blocker Intake (owner: Codex, updated: 2026-05-15)

### Stream: Repair Planning

94. [DONE] `diagram-plan-lifecycle-repair.phase21.retest-blocker.task1` Record release 261 retest failure and open bounded repair streams for Diagram Modules managed Git lock recovery and Core message localization (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open diagram modules managed boundary repair stream`).
95. [DONE] Git Commit: `docs: open diagram modules managed boundary repair stream` (hash: bd341d526)

## Phase 22 — Diagram Modules Managed Git Boundary Recovery (owner: Codex, updated: 2026-05-15)

### Stream: Git Lock Retry And Commit Boundary

96. [DONE] `diagram-plan-lifecycle-repair.phase22.git-boundary.task1` Add a workspace-scoped managed Git boundary with retry/backoff for transient `.git/index.lock` failures and keep Diagram Modules continuation blocked until the commit hash is recorded (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-managed-git-boundary.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts`; expected commit: `fix: retry diagram modules managed git lock boundary`).
97. [DONE] Git Commit: `fix: retry diagram modules managed git lock boundary` (hash: 865986248)

## Phase 23 — Core Message Localization (owner: Codex, updated: 2026-05-15)

### Stream: Messages For The User Pipeline

98. [DONE] `diagram-plan-lifecycle-repair.phase23.localization-policy.task1` Extend session translation policy so Core/system dialog messages resolve target language from Settings > General > Messages for the User instead of the reasoning category (scope: `packages/core/src/session-translation/session-translation-policy-resolver.ts, packages/core/src/session-translation/session-translation-policy-resolver.test.ts, packages/core/src/session-translation/session-translation-dispatcher.ts`; expected commit: `feat: add messages-for-user session translation policy`).
99. [DONE] Git Commit: `feat: add messages-for-user session translation policy` (hash: 6863d2c1a)

100. [DONE] `diagram-plan-lifecycle-repair.phase23.localization-runtime.task1` Route Core/system dialog messages through the session translation overlay while preserving source text, message ids, tags, and persisted translation patches (scope: `packages/core/src/session-translation/session-translation-facade.ts, packages/core/src/session-translation/session-translation-facade.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts`; expected commit: `feat: translate core system dialog messages`).
101. [DONE] Git Commit: `feat: translate core system dialog messages` (hash: daa8074d4)

102. [DONE] `diagram-plan-lifecycle-repair.phase23.diagram-core-messages.task1` Replace Diagram Modules Core visible status/blocker strings with localization-ready message builders and avoid blind translation of DSL paths, ids, headings, or embedded prompt instructions (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.test.ts`; expected commit: `feat: localize diagram modules core workflow messages`).
103. [DONE] Git Commit: `feat: localize diagram modules core workflow messages` (hash: d7c3998b0)

## Phase 24 — Documentation And Tooling Verification (owner: Codex, updated: 2026-05-15)

### Stream: Architecture Sync And Targeted Checks

104. [DONE] `diagram-plan-lifecycle-repair.phase24.docs.task1` Document the managed Git boundary retry contract and Core message localization policy in system workflow docs (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: document managed boundary and core message localization`).
105. [DONE] Git Commit: `docs: document managed boundary and core message localization` (hash: 3e370e974)

106. [DONE] `diagram-plan-lifecycle-repair.phase24.verify.task1` Run targeted core/session translation tests plus `npm run build:core` and record evidence before release gate (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify managed boundary and localization repair`).
107. [DONE] Git Commit: `docs: verify managed boundary and localization repair` (hash: 8ffd89a1a)

Verification evidence recorded 2026-05-15:

- `npm run build:core` — PASS.
- `node --test packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.js packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.js packages/core/dist/session-translation/session-translation-policy-resolver.test.js packages/core/dist/session-translation/session-translation-facade.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-event-messages.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-runtime-core.test.js` — PASS, 24 tests.
- `npm run plan:validate` — PASS.
- Covered behavior: transient Diagram Modules managed `.git/index.lock` retries, persistent lock blocks without plan advancement, Core/system messages use the `Messages for the User` session translation policy, source dialog content remains unchanged while overlays persist localized patches, and Diagram Modules continuation/review messages are emitted after the managed commit boundary.

## Phase 25 — Release Build Confirmation For Managed Boundary Repair (owner: Codex + User, updated: 2026-05-15)

### Stream: Release Build Confirmation

108. [DONE] `diagram-plan-lifecycle-repair.phase25.release-confirmation.task1` Stop for explicit user confirmation before preparing release notes, running `build-all.sh`, or packaging a new VSIX for the managed boundary and localization repair (scope: user workflow; expected commit: none). Result: User explicitly confirmed release build for the managed boundary and localization repair.

## Phase 26 — Release Build (owner: Codex, updated: 2026-05-15)

### Stream: Release Preparation And Build

109. [DONE] `diagram-plan-lifecycle-repair.phase26.release.task1` After explicit release-build confirmation, update release-facing docs for the future version before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed boundary and localization release`).
110. [DONE] Git Commit: `docs: prepare managed boundary and localization release` (hash: 318fc1220)

Release preparation recorded 2026-05-15:

- Current package version before release scripts: `1.2.261`.
- Future release version prepared in release-facing docs: `1.2.262`.
- `README.md` current-release banner updated to the managed Git boundary and Core message localization repair.
- `CHANGELOG.md` release entry `1.2.262` added with verification summary.

111. [DONE] `diagram-plan-lifecycle-repair.phase26.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/*/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build managed boundary and localization release`).
112. [DONE] Git Commit: `chore: build managed boundary and localization release` (hash: 8ee9ad8b7)

Release build-all evidence recorded 2026-05-15:

- `./scripts/build-all.sh --allow-dirty` — PASS. Dirty input was limited to the active plan transition for this release task.
- Unified generated version: `1.2.262`.
- Generated release archives in `doc/tmp/releases/`: `claude-module-1.2.262.tar.bz2`, `codex-module-1.2.262.tar.bz2`, `gemini-module-1.2.262.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.262.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.262.tar.bz2`, `vscode-webview-1.2.262.tar.bz2`, `project-manager-1.2.262.tar.bz2`.
- Updated package versions and managed release manifests to `1.2.262`.

113. [DONE] `diagram-plan-lifecycle-repair.phase26.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed boundary and localization release`).
114. [DONE] Git Commit: `docs: record managed boundary and localization release` (hash: b9be3b90f)

Release VSIX evidence recorded 2026-05-15:

- `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS. Dirty input was limited to the active plan transition for this release task.
- Verified release-script milestones: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `VSIX runtime package surface verified`.
- Advisory release-script diagnostics: `check:links` reported 17 existing broken Markdown anchors in managed-step planning docs; the release script treated them as advisory and completed.
- VSIX package: `codeai-hub-1.2.262.vsix` (`47M`; script package-size check reported `48M`).
- Release runtime archives remain available in `doc/tmp/releases/` for version `1.2.262`.

## Phase 27 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

115. [DONE] `diagram-plan-lifecycle-repair.phase27.user-acceptance.task1` User installs the rebuilt release and verifies: transient Git lock during Diagram Modules managed commit boundary retries instead of stopping the stage, persistent lock reports a localized Core blocker, Core/system dialog messages use the selected Messages for the User language, and Product Part continuation resumes only after a recorded commit hash (scope: user workflow; expected commit: none). Result: Release 262 passed the functional retest; user reported only cosmetic follow-up issues for Diagram Modules sidebar marker timing and Core/system message card styling.

## Phase 28 — Release 262 Cosmetic Repair (owner: Codex, updated: 2026-05-15)

### Stream: Sidebar Marker And Core Message Card

116. [DONE] `diagram-plan-lifecycle-repair.phase28.cosmetic-plan.task1` Record the release 262 cosmetic findings and open bounded implementation streams before scope closeout (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open release 262 cosmetic repair stream`).
117. [DONE] Git Commit: `docs: open release 262 cosmetic repair stream` (hash: c35e144e6)

118. [DONE] `diagram-plan-lifecycle-repair.phase28.sidebar-marker.task1` Keep the Diagram Modules sidebar marker orange while Product Part turns are still in progress and switch it to green only when Core opens the user-review phase (scope: `src/client/project-manager/components/layout/workspace-tree-model.ts, src/client/project-manager/components/layout/workspace-tree-model.test.ts`; expected commit: `fix: keep diagram modules marker active until review`).
119. [DONE] Git Commit: `fix: keep diagram modules marker active until review` (hash: 5553f3933)

120. [DONE] `diagram-plan-lifecycle-repair.phase28.system-card.task1` Render Core/system dialog messages in their own subtle card with symmetric dialog-panel side offsets matching the larger assistant-card side offset (scope: `src/client/ui/src/session/dialog-panel.tsx, media/session-view.css, src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts`; expected commit: `fix: style core system dialog messages as cards`).
121. [DONE] Git Commit: `fix: style core system dialog messages as cards` (hash: 141e3989f)

122. [DONE] `diagram-plan-lifecycle-repair.phase28.verify.task1` Run targeted Core/PM UI checks for the marker and system-card fixes and record evidence before the next release gate (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify release 262 cosmetic repair`).
123. [DONE] Git Commit: `docs: verify release 262 cosmetic repair` (hash: 9b789c7a0)

Release 262 cosmetic repair verification evidence recorded 2026-05-15:

- `npx tsx --test src/client/project-manager/components/layout/workspace-tree-model.test.ts src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts` — PASS (9 tests; React SSR `useLayoutEffect` warning expected for static DialogPanel render tests).
- `npm run typecheck:webview` — PASS.
- `npm run build:webview` — PASS (`webview bundle generated successfully`).
- `npm run plan:validate` — PASS.

## Phase 29 — Release 263 Build (owner: Codex, updated: 2026-05-15)

### Stream: Release Preparation And Build

124. [DONE] `diagram-plan-lifecycle-repair.phase29.release.task1` After explicit user release-build confirmation, update release-facing docs for the future cosmetic release before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 263 cosmetic update`).
125. [DONE] Git Commit: `docs: prepare release 263 cosmetic update` (hash: 4ab225b1a)

Release 263 preparation target:

- User explicitly requested the new release after the release 262 cosmetic fixes.
- Current package version before release scripts: `1.2.262`.
- Future release version prepared in release-facing docs: `1.2.263`.
- Release payload: Diagram Modules sidebar marker timing fix and Core/system dialog message card styling.

126. [DONE] `diagram-plan-lifecycle-repair.phase29.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/*/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build release 263 cosmetic update`).
127. [DONE] Git Commit: `chore: build release 263 cosmetic update` (hash: b4f449860)

Release build-all evidence recorded 2026-05-15:

- `./scripts/build-all.sh --allow-dirty` — PASS. Dirty input was limited to the active plan transition for this release task.
- Unified generated version: `1.2.263`.
- Generated release archives in `doc/tmp/releases/`: `claude-module-1.2.263.tar.bz2`, `codex-module-1.2.263.tar.bz2`, `gemini-module-1.2.263.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.263.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.263.tar.bz2`, `vscode-webview-1.2.263.tar.bz2`, `project-manager-1.2.263.tar.bz2`.
- Updated package versions and managed release manifests to `1.2.263`.

128. [DONE] `diagram-plan-lifecycle-repair.phase29.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record release 263 cosmetic handoff`).
129. [DONE] Git Commit: `docs: record release 263 cosmetic handoff` (hash: 8fb6f6fdd)

Release VSIX evidence recorded 2026-05-15:

- `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS. Dirty input was limited to the active plan transition for this release task.
- Verified release-script milestones: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `VSIX runtime package surface verified`.
- Advisory release-script diagnostics: `check:links` reported 17 existing broken Markdown anchors in managed-step planning docs; the release script treated them as advisory and completed. Package-size warning remained expected for the current VSIX surface over 20MB.
- VSIX package: `codeai-hub-1.2.263.vsix` (`47M`; script package-size check reported `48M`).
- Release runtime archives remain available in `doc/tmp/releases/` for version `1.2.263`.

## Phase 30 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

130. [DONE] `diagram-plan-lifecycle-repair.phase30.user-acceptance.task1` User installs the rebuilt release and verifies the Diagram Modules sidebar marker stays orange until Core opens user review, then switches green, and Core/system dialog messages render in their own subtle cards with symmetric side offsets (scope: user workflow; expected commit: none). Result: release `1.2.263` fixed the system-message card styling but regressed the workflow marker completion rule: `Description`, `Virtual Simulation`, and `Diagram Modules` stayed yellow after the last accepted provider/Core turn.

## Phase 31 — Release 263 Marker Boundary Repair (owner: Codex, updated: 2026-05-15)

### Stream: Workflow Marker Completion Trigger

131. [DONE] `diagram-plan-lifecycle-repair.phase31.marker-boundary.task1` Restore workflow marker completion semantics so provider-direct `Description` and `Virtual Simulation` turn green once their draft artifact exists, while managed `Diagram Modules` stays orange until Core opens the user-review/aggregate-ready phase (scope: `src/client/project-manager/components/layout/workspace-tree-model.ts, src/client/project-manager/components/layout/workspace-tree.tsx, src/client/project-manager/components/layout/workspace-tree-model.test.ts`; expected commit: `fix: restore workflow marker review boundary`).
132. [DONE] Git Commit: `fix: restore workflow marker review boundary` (hash: be23e4f28)

133. [DONE] `diagram-plan-lifecycle-repair.phase31.verify.task1` Run targeted Project Manager marker tests plus webview typecheck/build and record evidence before the next release gate (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify workflow marker review boundary`).
134. [DONE] Git Commit: `docs: verify workflow marker review boundary` (hash: 97fa011ea)

Marker boundary repair verification evidence recorded 2026-05-15:

- `npx tsx --test src/client/project-manager/components/layout/workspace-tree-model.test.ts` — PASS (4 tests).
- `npm run typecheck:webview` — PASS.
- `npm run build:webview` — PASS (`webview bundle generated successfully`).
- `npm run plan:validate` — PASS.

## Phase 32 — Release 264 Build (owner: Codex, updated: 2026-05-15)

### Stream: Release Preparation And Build

135. [DONE] `diagram-plan-lifecycle-repair.phase32.release.task1` After explicit user release-build confirmation, update release-facing docs for the future marker-boundary fix before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 264 marker boundary fix`).
136. [DONE] Git Commit: `docs: prepare release 264 marker boundary fix` (hash: 33c967bc3)

Release 264 preparation target:

- User explicitly requested the new release after the workflow marker boundary fix.
- Current package version before release scripts: `1.2.263`.
- Future release version prepared in release-facing docs: `1.2.264`.
- Release payload: root workflow marker completion semantics for `Description`, `Virtual Simulation`, and `Diagram Modules`.

137. [DONE] `diagram-plan-lifecycle-repair.phase32.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/*/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build release 264 marker boundary fix`).
138. [DONE] Git Commit: `chore: build release 264 marker boundary fix` (hash: 559b27702)

Release build-all evidence recorded 2026-05-15:

- `./scripts/build-all.sh --allow-dirty` — PASS. Dirty input was limited to the active plan transition for this release task.
- Unified generated version: `1.2.264`.
- Generated release archives in `doc/tmp/releases/`: `claude-module-1.2.264.tar.bz2`, `codex-module-1.2.264.tar.bz2`, `gemini-module-1.2.264.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.264.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.264.tar.bz2`, `vscode-webview-1.2.264.tar.bz2`, `project-manager-1.2.264.tar.bz2`.
- Updated package versions and managed release manifests to `1.2.264`.

139. [DONE] `diagram-plan-lifecycle-repair.phase32.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record release 264 marker boundary handoff`).
140. [DONE] Git Commit: `docs: record release 264 marker boundary handoff` (hash: 6888c075a)

Release VSIX evidence recorded 2026-05-15:

- `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS. Dirty input was limited to the active plan transition for this release task.
- Verified release-script milestones: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `VSIX runtime package surface verified`.
- Advisory release-script diagnostics: `check:links` reported 17 existing broken Markdown anchors in managed-step planning docs; the release script treated them as advisory and completed. Package-size warning remained expected for the current VSIX surface over 20MB.
- VSIX package: `codeai-hub-1.2.264.vsix` (`47M`; script package-size check reported `48M`).
- Release runtime archives remain available in `doc/tmp/releases/` for version `1.2.264`.

## Phase 33 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

141. [BLOCKED] `diagram-plan-lifecycle-repair.phase33.user-acceptance.task1` User installs the rebuilt release and verifies `Description` and `Virtual Simulation` turn green after their draft artifacts are created, while `Diagram Modules` stays orange during Product Part turns and turns green only after Core opens user review (scope: user workflow; expected commit: none). **BLOCKED 2026-05-15:** release `1.2.264` fixed `Description` and `Virtual Simulation`; `Diagram Modules` still stays yellow after Core opens user review, and `Application Skeleton` remains blocked with `product-parts.index.md not found` even though the filesystem artifacts are valid.

## Phase 34 — Release 264 Diagram Modules Review Snapshot Repair (owner: Codex, updated: 2026-05-15)

### Stream: Acceptance Finding

142. [DONE] `diagram-plan-lifecycle-repair.phase34.snapshot-refresh.task1` Record the release `1.2.264` acceptance finding and open a bounded repair stream for stale Project Manager workflow snapshots after the Diagram Modules Core user-review handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open release 264 workflow snapshot refresh repair`).
143. [DONE] Git Commit: `docs: open release 264 workflow snapshot refresh repair` (hash: a43ae6776)

### Stream: Project Manager Snapshot Refresh

144. [DONE] `diagram-plan-lifecycle-repair.phase34.snapshot-refresh.task2` Make Project Manager workflow-state subscriptions emit when derived progress/gating changes even if the root `updatedAt` timestamp is unchanged, so Diagram Modules review readiness and Application Skeleton gating refresh after Core handoff (scope: `src/client/project-manager/services/workflow-state-store.ts, src/client/project-manager/services/workflow-state-change-token.ts, src/client/project-manager/services/workflow-state-change-token.test.ts`; expected commit: `fix: refresh workflow state on derived gate changes`).
145. [DONE] Git Commit: `fix: refresh workflow state on derived gate changes` (hash: bd9046e49)

### Stream: Verification

146. [DONE] `diagram-plan-lifecycle-repair.phase34.verify.task1` Run targeted Project Manager tests/build for the derived workflow-state refresh path and record exact evidence before release consideration (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify release 264 workflow snapshot refresh repair`).
147. [DONE] Git Commit: `docs: verify release 264 workflow snapshot refresh repair` (hash: bbf7b685a)

Verification evidence recorded 2026-05-15:

- `npx tsx --test src/client/project-manager/services/workflow-state-change-token.test.ts src/client/project-manager/components/layout/workspace-tree-model.test.ts src/client/project-manager/services/workflow-step-start-service.gating.test.ts` — PASS, 14 tests.
- `npm run typecheck:webview` — PASS.
- `npm run build:webview` — PASS (`webview bundle generated successfully`).
- Confirmed against the release `1.2.264` test workspace: the filesystem projection for `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4` returns `diagramModulesProgress.aggregateReady: true` after all Product Parts are present, so the repaired PM store now emits the derived readiness/gating change even when root `updatedAt` is unchanged.

## Phase 35 — Release Build Gate For Workflow Snapshot Refresh Repair (owner: Codex + User, updated: 2026-05-15)

### Stream: Release Confirmation Gate

148. [DONE] `diagram-plan-lifecycle-repair.phase35.release-gate.task1` Stop for explicit user confirmation before preparing release notes, running `build-all.sh`, or packaging a new VSIX for the workflow snapshot refresh repair (scope: user workflow; expected commit: none). Result: User explicitly confirmed release build for the workflow snapshot refresh repair.

## Phase 36 — Release 265 Build (owner: Codex, updated: 2026-05-15)

### Stream: Release Preparation And Build

149. [DONE] `diagram-plan-lifecycle-repair.phase36.release.task1` After explicit release-build confirmation, update release-facing docs for the future workflow snapshot refresh fix before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 265 workflow snapshot refresh fix`).
150. [DONE] Git Commit: `docs: prepare release 265 workflow snapshot refresh fix` (hash: b980ac108)

Release 265 preparation target:

- User explicitly requested the new release after the workflow snapshot refresh fix.
- Current package version before release scripts: `1.2.264`.
- Future release version prepared in release-facing docs: `1.2.265`.
- Release payload: Project Manager emits workflow-state updates when derived Diagram Modules readiness and Application Skeleton gating change without a root `updatedAt` mutation.

151. [DONE] `diagram-plan-lifecycle-repair.phase36.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/*/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build release 265 workflow snapshot refresh fix`).
152. [DONE] Git Commit: `chore: build release 265 workflow snapshot refresh fix` (hash: 86ea025d2)

Release build-all evidence recorded 2026-05-15:

- `./scripts/build-all.sh --allow-dirty` — PASS. Dirty input was limited to the active plan transition for this release task.
- Unified generated version: `1.2.265`.
- Generated release archives in `doc/tmp/releases/`: `claude-module-1.2.265.tar.bz2`, `codex-module-1.2.265.tar.bz2`, `gemini-module-1.2.265.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.265.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.265.tar.bz2`, `vscode-webview-1.2.265.tar.bz2`, `project-manager-1.2.265.tar.bz2`.
- Updated package versions and managed release manifests to `1.2.265`.

153. [DONE] `diagram-plan-lifecycle-repair.phase36.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record release 265 workflow snapshot refresh handoff`).
154. [DONE] Git Commit: `docs: record release 265 workflow snapshot refresh handoff` (hash: 67c08bba2)

Release VSIX evidence recorded 2026-05-15:

- `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS. Dirty input was limited to the active plan transition for this release task.
- Verified release-script milestones: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `VSIX runtime package surface verified`.
- Advisory release-script diagnostics: `check:links` reported 17 existing broken Markdown anchors in managed-step planning docs; the release script treated them as advisory and completed. Package-size warning remained expected for the current VSIX surface over 20MB.
- VSIX package: `codeai-hub-1.2.265.vsix` (`47M`; script package-size check reported `48M`).
- Release runtime archives remain available in `doc/tmp/releases/` for version `1.2.265`.

## Phase 37 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

155. [BLOCKED] `diagram-plan-lifecycle-repair.phase37.user-acceptance.task1` User installs the rebuilt release and verifies `Diagram Modules` turns green after Core opens user review and `Application Skeleton` becomes available from `product-parts.index.md` without a stale blocked card (scope: user workflow; expected commit: none). **BLOCKED 2026-05-15:** release `1.2.265` correctly turns `Diagram Modules` green after Core opens user review, but the managed stage plan creates `diagram-modules.phase2.review.task1` with `expected commit: none` and no paired `Git Commit` item, leaving the Core-owned review handoff outside the required microtask/commit-pair contract.

## Phase 38 — Diagram Modules Review Boundary Repair (owner: Codex, updated: 2026-05-15)

### Stream: Acceptance Finding

156. [DONE] `diagram-plan-lifecycle-repair.phase38.review-boundary.task1` Record the release `1.2.265` Diagram Modules review-plan finding and open a bounded repair stream for the missing review commit partner and managed ledger dirty-gate behavior (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open diagram modules review boundary repair`).
157. [DONE] Git Commit: `docs: open diagram modules review boundary repair` (hash: 5d323c317)

### Stream: Stage Plan Contract

158. [DONE] `diagram-plan-lifecycle-repair.phase38.review-boundary.task2` Make the Diagram Modules Phase 2 user-review handoff a commit-backed managed microtask with an explicit paired `Git Commit` line in the generated stage plan (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts`; expected commit: `fix: add diagram modules review commit partner`).
159. [DONE] Git Commit: `fix: add diagram modules review commit partner` (hash: 9846fc6b1)

160. [DONE] `diagram-plan-lifecycle-repair.phase38.review-boundary.task3` Keep Core-managed workspace/stage plan ledger updates out of technical-stage dirty gating so a completed Diagram Modules aggregate can unlock Application Skeleton even when only review-ledger metadata is dirty (scope: `packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.ts, packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.test.ts`; expected commit: `fix: ignore managed plan ledger in technical dirty gate`).
161. [DONE] Git Commit: `fix: ignore managed plan ledger in technical dirty gate` (hash: 9e7795072)

### Stream: Verification

162. [DONE] `diagram-plan-lifecycle-repair.phase38.verify.task1` Run targeted Core tests/build for the Diagram Modules review commit partner and technical-stage dirty-gate repair, then record exact evidence before any release consideration (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify diagram modules review boundary repair`).
163. [DONE] Git Commit: `docs: verify diagram modules review boundary repair` (hash: b32494ffd)

Verification evidence recorded 2026-05-15:

- `npm run build:core` — PASS.
- `node --test packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.js packages/core/dist/remote-bridge/handlers/technical-stage-dirty-gate.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-runtime-core.test.js` — PASS, 16 tests.
- `npm run plan:validate` — PASS.
- Covered behavior: Diagram Modules Phase 2 user review now gets an explicit `Git Commit: docs: open diagram modules user review` partner in `doc/TODO/stages/diagram-modules/todo-plan.md`; the review handoff state carries a non-null `expectedCommitMessage`; Core-managed `doc/TODO/workspace.plan.md` and stage todo-plan ledger dirt no longer makes the technical-stage dirty gate block Application Skeleton after Diagram Modules aggregate readiness.

## Phase 39 — Release Build Gate For Review Boundary Repair (owner: Codex + User, updated: 2026-05-15)

### Stream: Release Confirmation Gate

164. [DONE] `diagram-plan-lifecycle-repair.phase39.release-gate.task1` Stop for explicit user confirmation before preparing release notes, running `build-all.sh`, or packaging a new VSIX for the Diagram Modules review boundary repair (scope: user workflow; expected commit: none). Result: User explicitly confirmed release build for the Diagram Modules review boundary repair.

## Phase 40 — Release 266 Build (owner: Codex, updated: 2026-05-15)

### Stream: Release Preparation And Build

165. [DONE] `diagram-plan-lifecycle-repair.phase40.release.task1` After explicit release-build confirmation, update release-facing docs for the future review-boundary fix before build scripts mutate package versions (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 266 review boundary fix`).
166. [DONE] Git Commit: `docs: prepare release 266 review boundary fix` (hash: 5d1741d48)

Release 266 preparation target:

- User explicitly requested the new release after the Diagram Modules review-boundary fix.
- Current package version before release scripts: `1.2.265`.
- Future release version prepared in release-facing docs: `1.2.266`.
- Release payload: Diagram Modules Phase 2 user review receives a paired managed `Git Commit` item, and Core-managed `doc/TODO` ledger dirt no longer blocks `Application Skeleton` after Diagram Modules aggregate readiness.

167. [DONE] `diagram-plan-lifecycle-repair.phase40.release.task2` Run `./scripts/build-all.sh`, capture generated version/tarball evidence, and record release handoff details in this plan (scope: `assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/**/manifest.json, assets/ui/manifest.json, package.json, package-lock.json, packages/*/package.json, doc/TODO/todo-plan.md`; expected commit: `chore: build release 266 review boundary fix`).
168. [DONE] Git Commit: `chore: build release 266 review boundary fix` (hash: 4656bf3ef)

Release build-all evidence recorded 2026-05-15:

- `./scripts/build-all.sh --allow-dirty` — PASS. Dirty input was limited to the active plan transition for this release task.
- Unified generated version: `1.2.266`.
- Generated release archives in `doc/tmp/releases/`: `claude-module-1.2.266.tar.bz2`, `codex-module-1.2.266.tar.bz2`, `gemini-module-1.2.266.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.266.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.266.tar.bz2`, `vscode-webview-1.2.266.tar.bz2`, `project-manager-1.2.266.tar.bz2`.
- Updated package versions and managed release manifests to `1.2.266`.

169. [DONE] `diagram-plan-lifecycle-repair.phase40.release.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX/tarballs, and record final artifact paths for user installation/testing (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record release 266 review boundary handoff`).
170. [DONE] Git Commit: `docs: record release 266 review boundary handoff` (hash: 59925087e)

Release VSIX evidence recorded 2026-05-15:

- `./scripts/build-release.sh --use-current-version --allow-dirty` — PASS. Dirty input was limited to the active plan transition for this release task.
- Verified release-script milestones: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `VSIX runtime package surface verified`.
- Advisory release-script diagnostics: `check:links` reported 17 existing broken Markdown anchors in managed-step planning docs; the release script treated them as advisory and completed. Package-size warning remained expected for the current VSIX surface over 20MB.
- VSIX package: `codeai-hub-1.2.266.vsix` (`47M`; script package-size check reported `48M`).
- Release runtime archives remain available in `doc/tmp/releases/` for version `1.2.266`.

## Phase 41 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-15)

### Stream: User Acceptance

171. [BLOCKED] `diagram-plan-lifecycle-repair.phase41.user-acceptance.task1` User installs the rebuilt release and verifies Diagram Modules creates the Phase 2 review task with a paired `Git Commit` line, remains green after Core opens user review, and Application Skeleton is available when only Core-managed review ledger metadata is dirty (scope: user workflow; expected commit: none). **BLOCKED 2026-05-15:** release `1.2.266` creates the paired Phase 2 review `Git Commit` line, but `Diagram Modules` still stays yellow and `Application Skeleton` remains blocked. The test workspace shows `.codeai-hub/**/diagram_modules/product-parts.index.md` dirty after Product Part materialization because the agent updates Product Part statuses from `planned` to `generated` after the initial index commit and Core does not include the index in later Product Part managed commits.

## Phase 42 — Diagram Modules Index Dirty Repair (owner: Codex, updated: 2026-05-15)

### Stream: Acceptance Finding

172. [DONE] `diagram-plan-lifecycle-repair.phase42.index-dirty.task1` Record the release `1.2.266` acceptance finding and open bounded repair streams for Diagram Modules index re-staging and technical-stage dirty-gate non-technical metadata filtering (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open diagram modules index dirty repair`).
173. [DONE] Git Commit: `docs: open diagram modules index dirty repair` (hash: 0e62c6f51)

### Stream: Managed Commit Boundary

174. [DONE] `diagram-plan-lifecycle-repair.phase42.index-dirty.task2` Include `product-parts.index.md` in every accepted Diagram Modules managed commit so agent status updates made during Product Part materialization cannot leave the aggregate index dirty at user-review handoff (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts`; expected commit: `fix: commit diagram modules index status updates`).
175. [DONE] Git Commit: `fix: commit diagram modules index status updates` (hash: d2e0a1459)

176. [DONE] `diagram-plan-lifecycle-repair.phase42.index-dirty.task3` Filter provider-direct upstream artifacts, continuity state, workspace runtime state, and `.DS_Store` files out of technical-stage dirty gating so only real technical-stage rewrite dirt can block Application Skeleton (scope: `packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.ts, packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.test.ts`; expected commit: `fix: ignore nontechnical workflow metadata in dirty gate`).
177. [DONE] Git Commit: `fix: ignore nontechnical workflow metadata in dirty gate` (hash: 6a62b6fa1)

### Stream: Verification

178. [DONE] `diagram-plan-lifecycle-repair.phase42.verify.task1` Run targeted Core tests/build for Diagram Modules index commit coverage and technical-stage dirty-gate metadata filtering, then record exact evidence before release consideration (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify diagram modules index dirty repair`).

Verification evidence recorded 2026-05-15:
- `npm run build:core` — PASS.
- `node --test packages/core/dist/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.js packages/core/dist/remote-bridge/handlers/technical-stage-dirty-gate.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-runtime-core.test.js` — PASS (16 tests).
- `npm run plan:validate` — PASS.
- Covered behavior: accepted Diagram Modules Product Part commits now stage the aggregate `product-parts.index.md` together with the Product Part artifact, so Product Part status changes from `planned` to `generated` cannot leave the Diagram Modules aggregate dirty at the user-review handoff.
- Covered behavior: technical-stage dirty gating now filters nontechnical workflow/runtime metadata (`.DS_Store`, continuity files, provider-direct Description and Virtual Simulation artifacts, workspace workflow state, and managed ledgers) so `Application Skeleton` is blocked only by real technical-stage content dirt.
179. [PENDING] Git Commit: `docs: verify diagram modules index dirty repair` (hash: TBD)

## Phase 43 — Release Build Gate For Index Dirty Repair (owner: Codex + User, updated: 2026-05-15)

### Stream: Release Confirmation Gate

180. [TODO] `diagram-plan-lifecycle-repair.phase43.release-gate.task1` Stop for explicit user confirmation before preparing release notes, running `build-all.sh`, or packaging a new VSIX for the Diagram Modules index dirty repair (scope: user workflow; expected commit: none).

## Phase 44 — Scope Closeout (owner: Codex, updated: 2026-05-15)

### Stream: Close Plan After User Acceptance

181. [TODO] `diagram-plan-lifecycle-repair.phase44.closeout.task1` After explicit user acceptance, archive this todo plan and dispose planning documents according to the plan lifecycle rules (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close full trunk orchestration scope`).
182. [TODO] Git Commit: `docs: close full trunk orchestration scope` (hash: TBD)
