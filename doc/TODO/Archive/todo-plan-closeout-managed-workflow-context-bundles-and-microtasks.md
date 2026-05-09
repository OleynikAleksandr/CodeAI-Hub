# Plan Closeout: managed-workflow-context-bundles-and-microtasks

**Created:** 2026-05-09T16:37:06.171Z
**Acceptance:** User accepted v1.2.215 managed workflow fixes after successful Claude Diagram Modules retest; SSOT documentation was synchronized in commit 477108017 before closeout.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** managed-workflow-context.phase15.task1
**Expected Commit:** docs: close managed workflow context bundles
**Last Recorded Commit:** 477108017
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-context-bundles-and-microtasks",
  "branch": "main",
  "baseHead": "1c304bdac",
  "lastRecordedCommit": "477108017",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md",
  "currentTaskId": "managed-workflow-context.phase15.task1",
  "expectedCommitMessage": "docs: close managed workflow context bundles",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Diagram_Modules_Core_Orchestrated_Subturns.md`
  - `doc/Claude_Diagram_Modules_Provider_Audit.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this Context Pack is the recovery source for the current execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation task touches no more than 3 files/packages. If discovery shows wider scope, split the task before editing.
- Each implementation task is followed by a separate `Git Commit` item.
- Quality gates run through Husky hooks on commit.
- Do not run release build automation until the user explicitly confirms release assembly.
- Core must treat provider prompts as text bundles, not link lists, unless a bounded truncation/fallback mode explicitly says otherwise.
- Rollover sessions must be richer than first sessions: they carry the original source artifact text plus workspace plan, stage plan, plan status, current target context, accepted commits, and the last visible assistant message.
- Managed documentation stages must progress by Core-owned microtasks and managed commits, not by aggregate provider turns that hide intermediate acceptance boundaries.

## Phase 1 - Planning Document (owner: Codex, updated: 2026-05-09)

### Stream: Draft Architecture Plan

1. [DONE] `managed-workflow-context.phase1.task1` Draft the planning document for managed workflow context bundles, rollover autocompact, no-link prompt rules, and stage-level microtask orchestration across Diagram Modules and following managed stages (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: draft managed workflow context bundles plan`).
2. [DONE] Git Commit: `docs: draft managed workflow context bundles plan` (hash: ca9dc9897)

## Phase 2 - User Workflow Acceptance Testing (owner: User/Codex, updated: 2026-05-09)

### Stream: Planning Review

3. [DONE] `managed-workflow-context.phase2.task1` Review the new planning document with the user and record approved adjustments before implementation begins (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed workflow planning acceptance`).
4. [DONE] Git Commit: `docs: record managed workflow planning acceptance` (hash: f0605d714)

## Phase 3 - Implementation Planning Handoff (owner: Codex, updated: 2026-05-09)

### Stream: Execution Slicing

5. [DONE] `managed-workflow-context.phase3.task1` Convert the accepted architecture into implementation streams with <=3-file microtasks, targeted verification, and release gate tasks (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: slice managed workflow context implementation`).
6. [DONE] Git Commit: `docs: slice managed workflow context implementation` (hash: 47741b690)

## Phase 4 - Prompt And Rollover Audit (owner: Codex, updated: 2026-05-09)

### Stream: Current Surface Map

7. [DONE] `managed-workflow-context.phase4.task1` Audit current first-turn prompt sources, continuation prompts, and rollover envelopes for Diagram Modules, Application Skeleton, Quality Gates, and Development Tree node sessions; record exact Core entry points and tests to update (scope: `src/client/project-manager/services`, `packages/core/src/remote-bridge/handlers`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `docs: audit managed workflow prompt and rollover surfaces`).
8. [DONE] Git Commit: `docs: audit managed workflow prompt and rollover surfaces` (hash: c08614a6d)

## Phase 5 - Managed Context Bundle Foundation (owner: Codex, updated: 2026-05-09)

### Stream: Core Bundle Model

9. [DONE] `managed-workflow-context.phase5.task1` Add a reusable managed workflow context bundle model and collector for embedded source artifacts, workspace plan text, active stage plan text, plan status, current target, accepted commits, and diagnostics (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-documentation-continuation-envelope.ts`; expected commit: `fix: add managed workflow context bundle model`).
10. [DONE] Git Commit: `fix: add managed workflow context bundle model` (hash: c3cdcbcc3)
11. [DONE] `managed-workflow-context.phase5.task2` Replace documentation rollover path instructions with embedded managed context bundle rendering and explicit fallback-only input paths (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-documentation-continuation-envelope.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.documentation-continuation.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-flow-node-rollover.ts`; expected commit: `fix: embed managed context on documentation rollover`).
12. [DONE] Git Commit: `fix: embed managed context on documentation rollover` (hash: e53734078)

## Phase 6 - Diagram Modules Microtask Boundaries (owner: Codex, updated: 2026-05-09)

### Stream: Product Part Tasks And Commits

13. [DONE] `managed-workflow-context.phase6.task1` Make Diagram Modules stage-plan synthesis create a real task and Git Commit pair for the accepted index and for each Product Part read from `product-parts.index.md` (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.ts`, `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`, focused Core test; expected commit: `fix: plan diagram modules product parts as microtasks`).
14. [DONE] Git Commit: `fix: plan diagram modules product parts as microtasks` (hash: baaa38471)
15. [DONE] `managed-workflow-context.phase6.task2` Move Diagram Modules managed commits from aggregate-ready to accepted current-artifact boundaries while preserving repair feedback and input-lock ownership (scope: `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts`, `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts`, focused Core test; expected commit: `fix: commit diagram modules accepted microtasks`).
16. [DONE] Git Commit: `fix: commit diagram modules accepted microtasks` (hash: 382d244b4)

## Phase 7 - Application Skeleton Context And Microtasks (owner: Codex, updated: 2026-05-09)

### Stream: Skeleton Stage Contract

17. [DONE] `managed-workflow-context.phase7.task1` Ensure Application Skeleton initial and rollover prompts embed the accepted Diagram Modules source text they need, including Product Part index and Product Part artifacts, without provider-visible input links (scope: `src/client/project-manager/services/workflow-source-artifact-descriptors.ts`, `src/client/project-manager/services/prompt-pack-builder.ts`, focused Project Manager prompt test; expected commit: `fix: embed diagram modules context for application skeleton`).
18. [DONE] Git Commit: `fix: embed diagram modules context for application skeleton` (hash: 9087b75e2)
19. [DONE] `managed-workflow-context.phase7.task2` Split Application Skeleton managed stage progress into real Core-owned microtasks and commits for the draft artifact and any materialized skeleton targets or bounded target groups (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-progress.ts`, `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.ts`, focused Core test; expected commit: `fix: plan application skeleton managed microtasks`).
20. [DONE] Git Commit: `fix: plan application skeleton managed microtasks` (hash: a591107f9)

## Phase 8 - Quality Gates Context And Microtasks (owner: Codex, updated: 2026-05-09)

### Stream: Gates Stage Contract

21. [DONE] `managed-workflow-context.phase8.task1` Ensure Quality Gates initial and rollover prompts embed accepted Application Skeleton artifact and map context without provider-visible input links (scope: `src/client/project-manager/services/workflow-source-artifact-descriptors.ts`, `src/client/project-manager/services/prompt-pack-builder.ts`, focused Project Manager prompt test; expected commit: `fix: embed application skeleton context for quality gates`).
22. [DONE] Git Commit: `fix: embed application skeleton context for quality gates` (hash: 11f469b64)
23. [DONE] `managed-workflow-context.phase8.task2` Split Quality Gates managed stage progress into concrete gate/integration microtasks with exact repair diagnostics and managed commit boundaries (scope: `packages/core/src/remote-bridge/handlers/quality-gates-progress.ts`, `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.ts`, focused Core test; expected commit: `fix: plan quality gates managed microtasks`).
24. [DONE] Git Commit: `fix: plan quality gates managed microtasks` (hash: eb40249a9)

## Phase 9 - Development Tree Context Bundles (owner: Codex, updated: 2026-05-09)

### Stream: Node Session Contract

25. [DONE] `managed-workflow-context.phase9.task1` Apply no-link embedded context bundles to Development Tree Product Part, Cluster, and Module documentation sessions, including node-local rollover target context (scope: `src/client/project-manager/services`, `packages/core/src/development-tree`, focused Development Tree session test; expected commit: `fix: embed development tree node context bundles`).
26. [DONE] Git Commit: `fix: embed development tree node context bundles` (hash: e3a0e8063)

## Phase 10 - SSOT Documentation Sync (owner: Codex, updated: 2026-05-09)

### Stream: Architecture Documentation

27. [DONE] `managed-workflow-context.phase10.task1` Update canonical SSOT documentation for managed context bundles, no-link provider prompts, rollover autocompact, stage todo-plan order contracts, and microtask commit boundaries (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`, `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`; expected commit: `docs: document managed workflow context bundles`).
28. [DONE] Git Commit: `docs: document managed workflow context bundles` (hash: a2c86561d)

## Phase 11 - Tooling Verification (owner: Codex, updated: 2026-05-09)

### Stream: Targeted Tests And Builds

29. [DONE] `managed-workflow-context.phase11.task1` Run focused Core and Project Manager tests for documentation rollover bundles, Diagram Modules microtask commits, Application Skeleton microtasks, Quality Gates microtasks, and Development Tree node context bundles; record evidence in the planning document (scope: `packages/core`, `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `test: verify managed workflow context bundles`).
30. [DONE] Git Commit: `test: verify managed workflow context bundles` (hash: b0aa67034)
31. [DONE] `managed-workflow-context.phase11.task2` Run affected package/client builds after targeted tests and record the exact commands and results in the planning document (scope: `packages/core`, `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `test: build managed workflow context changes`).
32. [DONE] Git Commit: `test: build managed workflow context changes` (hash: b0a4259d4)

## Phase 12 - Release Build Confirmation (owner: Codex/User, updated: 2026-05-09)

### Stream: Release Gate

33. [DONE] `managed-workflow-context.phase12.task1` Stop after implementation and targeted verification; ask the user whether to assemble a new release before changing README/CHANGELOG or running release automation (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed workflow release decision`).
34. [DONE] Git Commit: `docs: record managed workflow release decision` (hash: 91f51eff0)

## Phase 13 - Release Build (owner: Codex, updated: 2026-05-09)

### Stream: Release Assembly

35. [DONE] `managed-workflow-context.phase13.task1` Prepare README and CHANGELOG for the next release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare managed workflow context release`).
36. [DONE] Git Commit: `docs: prepare managed workflow context release` (hash: 470bc1124)
37. [DONE] `managed-workflow-context.phase13.task2` Run release automation and verify VSIX/tarball outputs for the managed workflow context bundle release (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`; expected commit: `chore: build managed workflow context release artifacts`).
38. [DONE] Git Commit: `chore: build managed workflow context release artifacts` (hash: 3bf766008)

## Phase 14 - User Workflow Acceptance Testing (owner: User/Codex, updated: 2026-05-09)

### Stream: Release Retest

39. [BLOCKED] `managed-workflow-context.phase14.task1` User retests the new release across the managed workflow, with specific attention to Claude Diagram Modules, Application Skeleton, Quality Gates, Development Tree sessions, rollover behavior, visible Core feedback ordering, and input locking; blocked on Diagram Modules stage-plan overexposure and Product Part id over-parsing found during Claude retest (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed workflow release retest`).
40. [BLOCKED] Git Commit: `docs: record managed workflow release retest` (hash: TBD; blocked by retest defect)

## Phase 14A - Rollover Retest Fixes (owner: Codex, updated: 2026-05-09)

### Stream: Sequential Managed Product Parts

41. [DONE] `managed-workflow-context.phase14a.task1` Fix managed stage-plan synthesis so Diagram Modules extracts Product Part ids only from canonical index headers and exposes only the current Product Part microtask, opening the next one only after the previous accepted commit; audit the pattern for later managed stages (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.ts`, `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: sequence managed product part tasks`).
42. [DONE] Git Commit: `fix: sequence managed product part tasks` (hash: feb8dfdca)
43. [DONE] `managed-workflow-context.phase14a.task2` Run focused Core regression for managed plan sequencing and record retest blocker evidence before a future release decision (scope: `packages/core`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `test: verify managed product part sequencing`).
44. [DONE] Git Commit: `test: verify managed product part sequencing` (hash: bd1ee2681)

## Phase 14B - Release Build Confirmation (owner: Codex/User, updated: 2026-05-09)

### Stream: Sequencing Fix Release Gate

45. [DONE] `managed-workflow-context.phase14b.task1` Stop after the managed Product Part sequencing fix and ask the user whether to assemble a new release before changing README/CHANGELOG or running release automation (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed sequencing release decision`).
46. [DONE] Git Commit: `docs: record managed sequencing release decision` (hash: 901ae132b)
47. [DONE] `managed-workflow-context.phase14b.task2` Prepare README and CHANGELOG for the managed Product Part sequencing follow-up release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare managed sequencing release`).
48. [DONE] Git Commit: `docs: prepare managed sequencing release` (hash: 775b41943)
49. [DONE] `managed-workflow-context.phase14b.task3` Run release automation and verify VSIX/tarball outputs for the managed Product Part sequencing fix (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `chore: build managed sequencing release artifacts`).
50. [DONE] Git Commit: `chore: build managed sequencing release artifacts` (hash: 113acbec8)
51. [DONE] `managed-workflow-context.phase14b.task4` User retests the follow-up release with Claude Diagram Modules to confirm strict Product Part extraction and one-at-a-time task exposure; result: failed because Core emitted aggregate Product Part feedback, advanced the next target after a failed managed commit, and rejected Product Part index status updates as outside the active allowlist (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed sequencing release retest`).
52. [DONE] Git Commit: `docs: record managed sequencing release retest` (hash: 6c661d5ab)

## Phase 14C - Product Part Acceptance Repair (owner: Codex, updated: 2026-05-09)

### Stream: Target-Scoped Acceptance

53. [DONE] `managed-workflow-context.phase14c.task1` Fix Diagram Modules Product Part acceptance feedback so a failed managed commit does not emit an accepted continuation or advance the next target, and Product Part subturn failures report only the current target rather than aggregate 1/4 state (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts`, `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts`, `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts`; expected commit: `fix: gate product part continuation on commit acceptance`).
54. [DONE] Git Commit: `fix: gate product part continuation on commit acceptance` (hash: ef8aa9c95)
55. [DONE] `managed-workflow-context.phase14c.task2` Fix managed commit ownership for Diagram Modules Product Part turns so Core-owned index status updates are included with the current Product Part commit while sibling Product Part files remain rejected (scope: `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `fix: allow product part index status commits`).
56. [DONE] Git Commit: `fix: allow product part index status commits` (hash: 6ed656c15)
57. [DONE] `managed-workflow-context.phase14c.task3` Run focused Core regressions for Product Part target-scoped acceptance, managed commit allowlists, and managed plan sequencing; stop before release build confirmation (scope: `packages/core`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `test: verify product part acceptance repair`).
58. [DONE] Git Commit: `test: verify product part acceptance repair` (hash: 2fac9fd76)

## Phase 14D - Product Part Acceptance Release (owner: Codex/User, updated: 2026-05-09)

### Stream: Release Assembly

59. [DONE] `managed-workflow-context.phase14d.task1` Record explicit user confirmation to assemble a release for the Product Part acceptance repair stream before changing release notes or running release automation (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record product part acceptance release decision`).
60. [DONE] Git Commit: `docs: record product part acceptance release decision` (hash: 74ec8f12d)
61. [DONE] `managed-workflow-context.phase14d.task2` Prepare README and CHANGELOG for the Product Part acceptance repair release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare product part acceptance release`).
62. [DONE] Git Commit: `docs: prepare product part acceptance release` (hash: a99795475)
63. [DONE] `managed-workflow-context.phase14d.task3` Run release automation and verify VSIX/tarball outputs for the Product Part acceptance repair (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `chore: build product part acceptance release artifacts`).
64. [DONE] Git Commit: `chore: build product part acceptance release artifacts` (hash: 4fe24d1f9)
65. [DONE] `managed-workflow-context.phase14d.task4` User retests the Product Part acceptance repair release with Claude Diagram Modules to confirm target-scoped feedback, blocked continuation on failed managed commit, and Product Part index status commit ownership; result: failed on prompt no-link leakage and split Core/PM managed messaging ownership, so repair streams 14E and 14F were added (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record product part acceptance release retest`).
66. [DONE] Git Commit: `docs: record product part acceptance release retest` (hash: 6bd34b715)

## Phase 14E - Description Prompt No-Link Repair (owner: Codex, updated: 2026-05-09)

### Stream: Retest Feedback Intake

67. [DONE] `managed-workflow-context.phase14e.task1` Remove provider-visible file paths from the Description first prompt when questionnaire/template content is already embedded, including relative questionnaire path, absolute questionnaire path, and absolute template path; provider prompts must give text, not instructions or incentives to read those files again (scope: `src/client/project-manager/services`, prompt builder tests, `doc/TODO/todo-plan.md`; expected commit: `fix: remove description prompt file paths`).
68. [DONE] Git Commit: `fix: remove description prompt file paths` (hash: 09457e3d1)
69. [DONE] `managed-workflow-context.phase14e.task2` Remove provider-visible `Final_Description.md` relative and absolute paths from the Virtual Simulation first prompt when the final description text is already embedded; provider prompts must not invite the agent to re-read the source file (scope: `src/client/project-manager/services`, prompt builder tests, `doc/TODO/todo-plan.md`; expected commit: `fix: remove virtual simulation prompt file paths`).
70. [DONE] Git Commit: `fix: remove virtual simulation prompt file paths` (hash: 77130d84d)
71. [DONE] `managed-workflow-context.phase14e.task3` Verify Description and Virtual Simulation prompt no-link behavior and record retest evidence before the next release decision (scope: `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `test: verify prompt no-link contracts`).
72. [DONE] Git Commit: `test: verify prompt no-link contracts` (hash: 3001c6afc)

## Phase 14F - Managed Workflow Core-Only Agent Messaging Repair (owner: Codex, updated: 2026-05-09)

### Stream: Retest Feedback Intake

73. [DONE] `managed-workflow-context.phase14f.task1` Remove Project Manager as a sender of managed workflow provider messages: PM may refresh/read state and send user intents to Core, but only Core may send automatic Diagram Modules/Product Part continuation, repair, failure, or wait messages to the agent between turns (scope: `src/client/project-manager/components/sessions`, `src/client/project-manager/services`, focused PM orchestration tests; expected commit: `fix: remove pm managed workflow agent messaging`).
74. [DONE] Git Commit: `fix: remove pm managed workflow agent messaging` (hash: e572b9056)
75. [DONE] `managed-workflow-context.phase14f.task2` Move Diagram Modules Product Part continuation decisions into Core as a single atomic boundary after validation and managed commit: Core emits exactly one provider-visible message per boundary, either repair/failure/wait or accepted next-target continuation, never both (scope: `packages/core/src/remote-bridge/handlers`, `packages/core/src/remote-bridge/handlers/*diagram*test*`, `doc/TODO/todo-plan.md`; expected commit: `fix: make core own diagram modules continuation`).
76. [DONE] Git Commit: `fix: make core own diagram modules continuation` (hash: e46536bff)
77. [DONE] `managed-workflow-context.phase14f.task3` Model Diagram Modules as two ownership phases without splitting the existing automatic generation phase: Phase 1 remains a Core/agent-owned automatic conversation that creates the Product Parts index/graph and materializes every Product Part under Core-owned continuation; after all Product Parts are accepted, Phase 1 completes and the agent stops. Phase 2 is user-owned review/editing, where each user turn that changes Product Parts, clusters, modules, names, or descriptions is opened by Core as its own microtask and commit boundary (scope: `packages/core/src/managed-workspace`, `packages/core/src/remote-bridge/handlers`, stage-plan tests; expected commit: `fix: add diagram modules user review phase`).
78. [DONE] Git Commit: `fix: add diagram modules user review phase` (hash: 0e695055f)
79. [DONE] `managed-workflow-context.phase14f.task4` Verify managed workflow messaging ownership and Diagram Modules phase boundaries: PM sends no automatic provider messages, Core emits one authoritative message per Product Part boundary during Phase 1, aggregate completion stops for user continuation, and Phase 2 user turns become independent Core-tracked microtasks with UI input/locks reflecting Core state only (scope: `packages/core`, `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `test: verify core-only managed workflow messaging`).
80. [DONE] Git Commit: `test: verify core-only managed workflow messaging` (hash: a85109893)

## Phase 14G - Release Build (owner: Codex, updated: 2026-05-09)

### Stream: Core-Only Messaging Release Assembly

81. [DONE] `managed-workflow-context.phase14g.task1` Prepare README and CHANGELOG for the next core-only managed workflow messaging release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: prepare core-only messaging release`).
82. [DONE] Git Commit: `docs: prepare core-only messaging release` (hash: 34479e1cc)
83. [DONE] `managed-workflow-context.phase14g.task2` Run release automation and verify VSIX/tarball outputs for the core-only managed workflow messaging fix (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`, `doc/TODO/todo-plan.md`; expected commit: `chore: build core-only messaging release artifacts`).
84. [DONE] Git Commit: `chore: build core-only messaging release artifacts` (hash: fab90291f)
85. [DONE] `managed-workflow-context.phase14g.task3` Hand off the built release for user workflow retesting and keep scope active until explicit acceptance (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: hand off core-only messaging release`).
86. [DONE] Git Commit: `docs: hand off core-only messaging release` (hash: 54fa80962)
87. [DONE] `managed-workflow-context.phase14g.task4` User retests release `1.2.211`, with focus on Claude Diagram Modules Core-only continuation, absence of contradictory PM/Core messages, Product Part Phase 1 automation, and user-owned Phase 2 review handoff (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record core-only messaging release retest`).
88. [DONE] Git Commit: `docs: record core-only messaging release retest` (hash: 177a889d9)

## Phase 14H - Continuation Turn Boundary Repair (owner: Codex, updated: 2026-05-09)

### Stream: Turn Boundary Ordering And Input Lock

89. [DONE] `managed-workflow-context.phase14h.task1` Fix Diagram Modules Core continuation dispatch so accepted next-target messages wait for a fully settled provider turn boundary and cannot appear between chunks of the previous assistant response (scope: `packages/core/src/remote-bridge/handlers`, focused Core session/feedback ordering tests; expected commit: `fix: defer core continuation until turn boundary settles`).
90. [DONE] Git Commit: `fix: defer core continuation until turn boundary settles` (hash: 61dc46571)
91. [DONE] `managed-workflow-context.phase14h.task2` Keep Project Manager input locked across Core continuation handoff and the following managed provider turn, including the case where a continuation is queued but the previous assistant turn is still flushing visible text (scope: `src/client/project-manager/components/sessions`, focused PM input-lock tests; expected commit: `fix: keep input locked during managed continuation handoff`).
92. [DONE] Git Commit: `fix: keep input locked during managed continuation handoff` (hash: 07b4ba24a)
93. [DONE] `managed-workflow-context.phase14h.task3` Verify turn-boundary-safe continuation ordering for Claude Diagram Modules and record focused Core/Project Manager evidence before the next release decision (scope: `packages/core`, `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `test: verify managed continuation turn boundaries`).
94. [DONE] Git Commit: `test: verify managed continuation turn boundaries` (hash: 1925fcc05)

## Phase 14I - Release Build (owner: Codex, updated: 2026-05-09)

### Stream: Managed Continuation Boundary Release

95. [DONE] `managed-workflow-context.phase14i.task1` Prepare README and CHANGELOG for the managed continuation boundary release after explicit user authorization to assemble a new release without waiting for another confirmation (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed continuation boundary release`).
96. [DONE] Git Commit: `docs: prepare managed continuation boundary release` (hash: 58d8b35d3)
97. [DONE] `managed-workflow-context.phase14i.task2` Run release automation and verify VSIX/tarball outputs for the managed continuation boundary fix (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`, `doc/TODO/todo-plan.md`; expected commit: `chore: build managed continuation boundary release artifacts`).
98. [DONE] Git Commit: `chore: build managed continuation boundary release artifacts` (hash: 0b503c65c)
99. [DONE] `managed-workflow-context.phase14i.task3` Hand off the built managed continuation boundary release for user workflow retesting and keep scope active until explicit acceptance (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: hand off managed continuation boundary release`).
100. [DONE] Git Commit: `docs: hand off managed continuation boundary release` (hash: 9a727e8da)

## Phase 14J - Prompt Artifact Path Cleanup (owner: Codex, updated: 2026-05-09)

### Stream: Provider Prompt No-Link Cleanup

101. [DONE] `managed-workflow-context.phase14j.task1` Remove provider-visible input artifact paths from initial workflow prompts, including Diagram Modules, Application Skeleton, and Quality Gates, while keeping embedded source text as the authority for each turn (scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: remove diagram modules prompt artifact paths`).
102. [DONE] Git Commit: `fix: remove diagram modules prompt artifact paths` (hash: d82bed088)
103. [DONE] `managed-workflow-context.phase14j.task2` Remove provider-visible target/input artifact paths from managed rollover continuation envelopes and verify rollover prompts stay text-bundle based (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-documentation-continuation-envelope.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.documentation-continuation.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: remove rollover prompt artifact paths`).
104. [DONE] Git Commit: `fix: remove rollover prompt artifact paths` (hash: c31b51a99)

## Phase 14K - Provider Terminal Turn Boundary Repair (owner: Codex, updated: 2026-05-09)

### Stream: Event-Driven Continuation Boundary

105. [DONE] `managed-workflow-context.phase14k.task1` Fix Claude turn completion so `turn_completed` is emitted only after the provider stream reaches the terminal turn boundary, not on an early `result` message that can precede final visible assistant chunks (scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/message-processor.test.ts`; expected commit: `fix: complete claude turns at stream boundary`).
106. [DONE] Git Commit: `fix: complete claude turns at stream boundary` (hash: a2d7d7d61)
107. [DONE] `managed-workflow-context.phase14k.task2` Remove the timer-based Core managed continuation wait path and keep continuation dispatch tied to provider `turn_completed`/new-turn ownership only (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-managed-continuation-boundary.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: remove timed managed continuation wait`).
108. [DONE] Git Commit: `fix: remove timed managed continuation wait` (hash: ba22041e1)
109. [DONE] `managed-workflow-context.phase14k.task3` Remove stale dispatcher/test expectations for quiet-window settling and verify Diagram Modules continuation starts only from the provider-completed turn event path (scope: `packages/core/src/remote-bridge/handlers/diagram-modules-continuation-dispatcher.ts`, `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `test: verify event-driven managed continuation`).
110. [DONE] Git Commit: `test: verify event-driven managed continuation` (hash: 3ad0d45af)

## Phase 14L - Release Build (owner: Codex, updated: 2026-05-09)

### Stream: Event-Driven Continuation Release

111. [DONE] `managed-workflow-context.phase14l.task1` Prepare README and CHANGELOG for the event-driven continuation boundary release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: prepare event-driven continuation release`).
112. [DONE] Git Commit: `docs: prepare event-driven continuation release` (hash: 13f275433)
113. [DONE] `managed-workflow-context.phase14l.task2` Run release automation and verify VSIX/tarball outputs for the event-driven continuation boundary fix (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`, `doc/TODO/todo-plan.md`; expected commit: `chore: build event-driven continuation release artifacts`).
114. [DONE] Git Commit: `chore: build event-driven continuation release artifacts` (hash: 0b9fd3518)
115. [DONE] `managed-workflow-context.phase14l.task3` Hand off the built event-driven continuation release for user workflow retesting and keep scope active until explicit acceptance (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: hand off event-driven continuation release`).
116. [DONE] Git Commit: `docs: hand off event-driven continuation release` (hash: 7da3c7da2)

## Phase 14M - Claude Diagram Modules Retest Repair (owner: Codex, updated: 2026-05-09)

### Stream: Terminal Turn And Target Path

117. [DONE] `managed-workflow-context.phase14m.task1` Fix Claude turn completion so native `assistant` messages with `stop_reason: "end_turn"` complete the provider turn after the final visible response even when no separate `result` message is emitted (scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/messaging/message-processor.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: complete claude turns on assistant end turn`).
118. [DONE] Git Commit: `fix: complete claude turns on assistant end turn` (hash: 7389db33e)
119. [DONE] `managed-workflow-context.phase14m.task1b` Apply the Claude assistant `end_turn` provider implementation and regression test that were intentionally scoped by task1 but not included in its plan-only commit (scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/messaging/message-processor.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: apply claude assistant end turn completion`).
120. [DONE] Git Commit: `fix: apply claude assistant end turn completion` (hash: fbd530085)
121. [DONE] `managed-workflow-context.phase14m.task2` Re-emphasize the exact write target for initial workflow prompts at the end of the provider prompt without reintroducing input-document read paths, so managed agents write under `.codeai-hub/<workspaceSlug>/...` instead of a sibling folder (scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: keep workflow output target in prompt tail`).
122. [DONE] Git Commit: `fix: keep workflow output target in prompt tail` (hash: 42ea31ffa)
123. [DONE] `managed-workflow-context.phase14m.task2b` Add explicit relative output target guidance to documentation rollover envelopes for all workflow stages, including managed-stage canonical artifact paths without reintroducing input-document read paths (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-documentation-continuation-envelope.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.documentation-continuation.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: keep rollover output targets explicit`).
124. [DONE] Git Commit: `fix: keep rollover output targets explicit` (hash: fed1d9351)
125. [DONE] `managed-workflow-context.phase14m.task2c` Remove managed-plan file-read and plan-status command instructions from bundled managed agent prompts, preserving Core-embedded workspace plan text, active stage todo-plan text, and plan status as the single context source (scope: `packages/agents/*/assets`, `packages/core/src/templates`, `doc/TODO/todo-plan.md`; expected commit: `fix: remove managed plan read instructions from agent prompts`).
126. [DONE] Git Commit: `fix: remove managed plan read instructions from agent prompts` (hash: 74c288c72)
127. [DONE] `managed-workflow-context.phase14m.task2d` Apply the managed prompt read-instruction cleanup to the bundled agent assets and template registry after the preceding plan-only commit (scope: `packages/agents/*/assets`, `packages/core/src/templates`, `doc/TODO/todo-plan.md`; expected commit: `fix: apply managed prompt read instruction cleanup`).
128. [DONE] Git Commit: `fix: apply managed prompt read instruction cleanup` (hash: 164a1d2f7)
129. [DONE] `managed-workflow-context.phase14m.task3` Run focused Claude provider, Project Manager prompt, rollover envelope, and bundled managed prompt regressions for the retest failure and record the outcome before release assembly (scope: `packages/Claude_Module`, `src/client/project-manager`, `packages/core`, `packages/agents`, `doc/TODO/todo-plan.md`; expected commit: `test: verify claude managed retest repair`).
    - Evidence 2026-05-09: `npm run build --workspace packages/Claude_Module && npm test --workspace packages/Claude_Module` passed (18 tests).
    - Evidence 2026-05-09: focused prompt/rollover/template tests passed (18 tests) after rerun; the first parallel attempt failed only because Claude build temporarily removed `dist/index.js` while Core tests imported it.
    - Evidence 2026-05-09: generated prompt scan for Description, Virtual Simulation, Diagram Modules, Application Skeleton, and Quality Gates initial/rollover prompts found no legacy `Target path (...)`, input-document relative/absolute path labels, `read doc/TODO...`, or `npm run plan:status` instructions.
    - Evidence 2026-05-09: `npm run build --workspace packages/core` and `npm run typecheck:webview` passed.
130. [DONE] Git Commit: `test: verify claude managed retest repair` (hash: 7d460068d)
131. [DONE] `managed-workflow-context.phase14m.task4` Prepare README and CHANGELOG for the Claude managed retest repair release after the user's explicit release request (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: prepare claude managed retest repair release`).
132. [DONE] Git Commit: `docs: prepare claude managed retest repair release` (hash: 5226bc8b1)
133. [DONE] `managed-workflow-context.phase14m.task5` Run release automation and verify VSIX/tarball outputs for the Claude managed retest repair (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`, `doc/TODO/todo-plan.md`; expected commit: `chore: build claude managed retest repair release artifacts`).
134. [DONE] Git Commit: `chore: build claude managed retest repair release artifacts` (hash: 3c710d67f)
135. [DONE] `managed-workflow-context.phase14m.task6` Hand off the built release for user retesting and keep scope active until explicit acceptance (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: hand off claude managed retest repair release`).
    - Release 2026-05-09: VSIX ready at `codeai-hub-1.2.214.vsix` (47 MB).
    - Release 2026-05-09: tarballs ready in `doc/tmp/releases/` for Claude, Codex, Gemini, Core darwin-arm64, CEF launcher macos-arm64, vscode-webview, and project-manager v1.2.214.
    - Retest focus: Claude Diagram Modules first index turn completion, exact `.codeai-hub/<workspaceSlug>/...` writes, absence of provider-visible input-document path labels, and managed prompt behavior that relies on Core-embedded plan context instead of reading plan files.
136. [DONE] Git Commit: `docs: hand off claude managed retest repair release` (hash: e0b5f104d)

## Phase 14N - Managed Continuation Ordering Repair (owner: Codex, updated: 2026-05-09)

### Stream: Provider Message Flush And Core Continuation Gate

137. [DONE] `managed-workflow-context.phase14n.task1` Make SDK `turn_completed` the single Core-owned trigger for managed acceptance: serialize provider turn completion after emitted assistant/dialog messages, move managed commit/feedback/continuation out of workflow-state read paths, and invoke managed acceptance only from the Core post-turn pipeline after turn arbitration (scope: `packages/core/src/remote-bridge/handlers`, `packages/core/src/remote-bridge/remote-bridge-bootstrap.ts`, focused Core tests; expected commit: `fix: serialize provider turn completion after messages`).
138. [DONE] Git Commit: `fix: serialize provider turn completion after messages` (hash: 2a541c94d)
139. [DONE] `managed-workflow-context.phase14n.task2` Verify managed continuation ordering against the Claude Diagram Modules interleaving regression and record evidence before release assembly (scope: `packages/core`, `doc/TODO/todo-plan.md`; expected commit: `test: verify managed continuation ordering`).
140. [DONE] Git Commit: `test: verify managed continuation ordering` (hash: e1fcf94ae)

## Phase 14O - Managed Continuation Commit Repair (owner: Codex, updated: 2026-05-09)

### Stream: Persist Implementation Files

141. [DONE] `managed-workflow-context.phase14o.task1` Persist the managed continuation ordering implementation files that were left unstaged by the previous plan transaction, keeping Core post-turn continuation ownership in code and focused tests (scope: `packages/core/src/remote-bridge/handlers`, `packages/core/src/remote-bridge/remote-bridge-bootstrap.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: persist managed continuation ordering implementation`).
142. [DONE] Git Commit: `fix: persist managed continuation ordering implementation` (hash: 7a97fff8d)

## Phase 14P - Core Workflow Contract Boundary Documentation (owner: Codex, updated: 2026-05-09)

### Stream: Canonical Workflow Contracts

143. [DONE] `managed-workflow-context.phase14p.task1` Document the Core Runtime workflow contract boundary discovered during Claude managed-stage testing and make Workflow Steps Overview mandatory context next to System Architecture in future todo-plan templates (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`, `AGENTS.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: document core workflow contract boundary`).
144. [DONE] Git Commit: `docs: document core workflow contract boundary` (hash: 5079897ea)

## Phase 14Q - Core Workflow Contract Documentation Commit Repair (owner: Codex, updated: 2026-05-09)

### Stream: Persist Canonical Documents

145. [DONE] `managed-workflow-context.phase14q.task1` Persist the canonical Workflow Steps Overview and AGENTS template edits that define Core Runtime as a contract-owned Product Part boundary (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`, `AGENTS.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: persist core workflow contract docs`).
146. [DONE] Git Commit: `docs: persist core workflow contract docs` (hash: 26a4bd4ec)

## Phase 14R - Plan Orchestrator Commit Boundary Repair (owner: Codex, updated: 2026-05-09)

### Stream: Current Task Scope As Commit SSOT

147. [DONE] `managed-workflow-context.phase14r.task1` Add a reusable Plan Orchestrator scope boundary that parses current task scope, compares dirty/staged Git paths against it, and reports out-of-scope files deterministically (scope: `scripts/plan-orchestrator/plan-scope-boundary.mjs, scripts/plan-orchestrator/plan-scope-boundary.test.mjs, doc/TODO/todo-plan.md`; expected commit: `feat: add plan commit scope boundary`).
148. [DONE] Git Commit: `feat: add plan commit scope boundary` (hash: 6e0e60329)
149. [DONE] `managed-workflow-context.phase14r.task2` Make `plan:commit` collect dirty files through the current task scope boundary and stage allowed files itself instead of relying on manual Git staging (scope: `scripts/plan-orchestrator/plan-commit.mjs, scripts/plan-orchestrator/plan-commit.test.mjs, doc/TODO/todo-plan.md`; expected commit: `fix: let plan commit stage scoped files`).
150. [DONE] Git Commit: `fix: let plan commit stage scoped files` (hash: 806b2d797)
151. [DONE] `managed-workflow-context.phase14r.task3` Enforce the same task scope boundary in the pre-commit transaction guard so manually staged out-of-scope files cannot bypass the orchestrator (scope: `scripts/plan-orchestrator/plan-hook-pre-commit.mjs, scripts/plan-orchestrator/plan-hook-pre-commit.test.mjs, doc/TODO/todo-plan.md`; expected commit: `fix: block out-of-scope staged plan files`).
152. [DONE] Git Commit: `fix: block out-of-scope staged plan files` (hash: a45b48013)

## Phase 14S - Release Build And Next Session Retest (owner: Codex, updated: 2026-05-09)

### Stream: Release Assembly

153. [DONE] `managed-workflow-context.phase14s.task1` Prepare release metadata for v1.2.215 and record that the next session starts with user testing of this release (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed workflow contract release`).
154. [DONE] Git Commit: `docs: prepare managed workflow contract release` (hash: 05a72e2a0)
155. [DONE] `managed-workflow-context.phase14s.task2` Build v1.2.215 release artifacts for next-session testing and record generated VSIX/tarball paths for handoff (scope: `package.json, package-lock.json, packages/**/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build managed workflow contract release`).
156. [DONE] Git Commit: `chore: build managed workflow contract release` (hash: 3f17208ee)
157. [DONE] `managed-workflow-context.phase14s.task3` Record next-session user workflow testing handoff for v1.2.215: install `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.215.vsix` and retest Claude Diagram Modules turn ordering, provider-visible prompt paths, Plan Orchestrator scoped commits, and managed release handoff behavior (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record managed workflow contract retest handoff`).
158. [DONE] Git Commit: `docs: record managed workflow contract retest handoff` (hash: 9278797e2)

## Phase 14T - User Workflow Acceptance Testing (owner: User/Codex, updated: 2026-05-09)

### Stream: Next Session Retest

159. [DONE] `managed-workflow-context.phase14t.task1` Next session starts here: install `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.2.215.vsix` and test the managed workflow fixes before any closeout. Retest focus: Claude Diagram Modules turn ordering, provider-visible prompt paths, Plan Orchestrator scoped commits, Core post-turn continuation, and release handoff behavior. Result: User accepted v1.2.215 Diagram Modules retest: Core-owned post-turn acceptance, managed commits, and continuation sequencing are working; proceed to documentation sync before closeout.

## Phase 14U - SSOT Documentation Sync (owner: Codex, updated: 2026-05-09)

### Stream: Managed Workflow Architecture Docs

160. [DONE] `managed-workflow-context.phase14u.task1` Review and update SolidWorks workflow SSOT documents related to agents, workflow steps, managed workspace lifecycle, Core-owned post-turn acceptance, provider prompt boundaries, and Plan Orchestrator scoped commits before scope closeout (scope: `doc/SolidWorks-WorkFlow/**`, `doc/TODO/todo-plan.md`; expected commit: `docs: sync managed workflow ssot`).
161. [DONE] Git Commit: `docs: sync managed workflow ssot` (hash: 477108017)

## Phase 15 - Scope Closeout (owner: Codex, updated: 2026-05-09)

### Stream: Closeout

162. [IN_PROGRESS] `managed-workflow-context.phase15.task1` Close the scope only after explicit user acceptance, archive the active plan, and dispose planning documents according to closeout rules (scope: `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed workflow context bundles`).
163. [TODO] Git Commit: `docs: close managed workflow context bundles` (hash: TBD)
164. [TODO] `managed-workflow-context.phase15.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: close managed workflow context bundles`).
````
