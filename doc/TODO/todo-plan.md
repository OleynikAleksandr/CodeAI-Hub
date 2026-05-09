# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-context-bundles-and-microtasks",
  "branch": "main",
  "baseHead": "1c304bdac",
  "lastRecordedCommit": "ba22041e1",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md",
  "currentTaskId": "managed-workflow-context.phase14k.task3",
  "expectedCommitMessage": "test: verify event-driven managed continuation",
  "debt": {
    "expectedCommitMessage": "test: verify event-driven managed continuation",
    "preCommitHead": "ba22041e1",
    "stage": "commit_pending",
    "taskId": "managed-workflow-context.phase14k.task3"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
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

1. [DONE] `managed-workflow-context.phase1.task1` Draft the planning document for managed workflow context bundles, rollover autocompact, no-link prompt rules, and stage-level microtask orchestration across Diagram Modules and following managed stages (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: draft managed workflow context bundles plan`).
2. [DONE] Git Commit: `docs: draft managed workflow context bundles plan` (hash: ca9dc9897)

## Phase 2 - User Workflow Acceptance Testing (owner: User/Codex, updated: 2026-05-09)

### Stream: Planning Review

3. [DONE] `managed-workflow-context.phase2.task1` Review the new planning document with the user and record approved adjustments before implementation begins (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed workflow planning acceptance`).
4. [DONE] Git Commit: `docs: record managed workflow planning acceptance` (hash: f0605d714)

## Phase 3 - Implementation Planning Handoff (owner: Codex, updated: 2026-05-09)

### Stream: Execution Slicing

5. [DONE] `managed-workflow-context.phase3.task1` Convert the accepted architecture into implementation streams with <=3-file microtasks, targeted verification, and release gate tasks (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: slice managed workflow context implementation`).
6. [DONE] Git Commit: `docs: slice managed workflow context implementation` (hash: 47741b690)

## Phase 4 - Prompt And Rollover Audit (owner: Codex, updated: 2026-05-09)

### Stream: Current Surface Map

7. [DONE] `managed-workflow-context.phase4.task1` Audit current first-turn prompt sources, continuation prompts, and rollover envelopes for Diagram Modules, Application Skeleton, Quality Gates, and Development Tree node sessions; record exact Core entry points and tests to update (scope: `src/client/project-manager/services`, `packages/core/src/remote-bridge/handlers`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `docs: audit managed workflow prompt and rollover surfaces`).
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

29. [DONE] `managed-workflow-context.phase11.task1` Run focused Core and Project Manager tests for documentation rollover bundles, Diagram Modules microtask commits, Application Skeleton microtasks, Quality Gates microtasks, and Development Tree node context bundles; record evidence in the planning document (scope: `packages/core`, `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `test: verify managed workflow context bundles`).
30. [DONE] Git Commit: `test: verify managed workflow context bundles` (hash: b0aa67034)
31. [DONE] `managed-workflow-context.phase11.task2` Run affected package/client builds after targeted tests and record the exact commands and results in the planning document (scope: `packages/core`, `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `test: build managed workflow context changes`).
32. [DONE] Git Commit: `test: build managed workflow context changes` (hash: b0a4259d4)

## Phase 12 - Release Build Confirmation (owner: Codex/User, updated: 2026-05-09)

### Stream: Release Gate

33. [DONE] `managed-workflow-context.phase12.task1` Stop after implementation and targeted verification; ask the user whether to assemble a new release before changing README/CHANGELOG or running release automation (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed workflow release decision`).
34. [DONE] Git Commit: `docs: record managed workflow release decision` (hash: 91f51eff0)

## Phase 13 - Release Build (owner: Codex, updated: 2026-05-09)

### Stream: Release Assembly

35. [DONE] `managed-workflow-context.phase13.task1` Prepare README and CHANGELOG for the next release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare managed workflow context release`).
36. [DONE] Git Commit: `docs: prepare managed workflow context release` (hash: 470bc1124)
37. [DONE] `managed-workflow-context.phase13.task2` Run release automation and verify VSIX/tarball outputs for the managed workflow context bundle release (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`; expected commit: `chore: build managed workflow context release artifacts`).
38. [DONE] Git Commit: `chore: build managed workflow context release artifacts` (hash: 3bf766008)

## Phase 14 - User Workflow Acceptance Testing (owner: User/Codex, updated: 2026-05-09)

### Stream: Release Retest

39. [BLOCKED] `managed-workflow-context.phase14.task1` User retests the new release across the managed workflow, with specific attention to Claude Diagram Modules, Application Skeleton, Quality Gates, Development Tree sessions, rollover behavior, visible Core feedback ordering, and input locking; blocked on Diagram Modules stage-plan overexposure and Product Part id over-parsing found during Claude retest (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed workflow release retest`).
40. [BLOCKED] Git Commit: `docs: record managed workflow release retest` (hash: TBD; blocked by retest defect)

## Phase 14A - Rollover Retest Fixes (owner: Codex, updated: 2026-05-09)

### Stream: Sequential Managed Product Parts

41. [DONE] `managed-workflow-context.phase14a.task1` Fix managed stage-plan synthesis so Diagram Modules extracts Product Part ids only from canonical index headers and exposes only the current Product Part microtask, opening the next one only after the previous accepted commit; audit the pattern for later managed stages (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.ts`, `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix: sequence managed product part tasks`).
42. [DONE] Git Commit: `fix: sequence managed product part tasks` (hash: feb8dfdca)
43. [DONE] `managed-workflow-context.phase14a.task2` Run focused Core regression for managed plan sequencing and record retest blocker evidence before a future release decision (scope: `packages/core`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `test: verify managed product part sequencing`).
44. [DONE] Git Commit: `test: verify managed product part sequencing` (hash: bd1ee2681)

## Phase 14B - Release Build Confirmation (owner: Codex/User, updated: 2026-05-09)

### Stream: Sequencing Fix Release Gate

45. [DONE] `managed-workflow-context.phase14b.task1` Stop after the managed Product Part sequencing fix and ask the user whether to assemble a new release before changing README/CHANGELOG or running release automation (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed sequencing release decision`).
46. [DONE] Git Commit: `docs: record managed sequencing release decision` (hash: 901ae132b)
47. [DONE] `managed-workflow-context.phase14b.task2` Prepare README and CHANGELOG for the managed Product Part sequencing follow-up release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare managed sequencing release`).
48. [DONE] Git Commit: `docs: prepare managed sequencing release` (hash: 775b41943)
49. [DONE] `managed-workflow-context.phase14b.task3` Run release automation and verify VSIX/tarball outputs for the managed Product Part sequencing fix (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `chore: build managed sequencing release artifacts`).
50. [DONE] Git Commit: `chore: build managed sequencing release artifacts` (hash: 113acbec8)
51. [DONE] `managed-workflow-context.phase14b.task4` User retests the follow-up release with Claude Diagram Modules to confirm strict Product Part extraction and one-at-a-time task exposure; result: failed because Core emitted aggregate Product Part feedback, advanced the next target after a failed managed commit, and rejected Product Part index status updates as outside the active allowlist (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed sequencing release retest`).
52. [DONE] Git Commit: `docs: record managed sequencing release retest` (hash: 6c661d5ab)

## Phase 14C - Product Part Acceptance Repair (owner: Codex, updated: 2026-05-09)

### Stream: Target-Scoped Acceptance

53. [DONE] `managed-workflow-context.phase14c.task1` Fix Diagram Modules Product Part acceptance feedback so a failed managed commit does not emit an accepted continuation or advance the next target, and Product Part subturn failures report only the current target rather than aggregate 1/4 state (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts`, `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts`, `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts`; expected commit: `fix: gate product part continuation on commit acceptance`).
54. [DONE] Git Commit: `fix: gate product part continuation on commit acceptance` (hash: ef8aa9c95)
55. [DONE] `managed-workflow-context.phase14c.task2` Fix managed commit ownership for Diagram Modules Product Part turns so Core-owned index status updates are included with the current Product Part commit while sibling Product Part files remain rejected (scope: `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `fix: allow product part index status commits`).
56. [DONE] Git Commit: `fix: allow product part index status commits` (hash: 6ed656c15)
57. [DONE] `managed-workflow-context.phase14c.task3` Run focused Core regressions for Product Part target-scoped acceptance, managed commit allowlists, and managed plan sequencing; stop before release build confirmation (scope: `packages/core`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `test: verify product part acceptance repair`).
58. [DONE] Git Commit: `test: verify product part acceptance repair` (hash: 2fac9fd76)

## Phase 14D - Product Part Acceptance Release (owner: Codex/User, updated: 2026-05-09)

### Stream: Release Assembly

59. [DONE] `managed-workflow-context.phase14d.task1` Record explicit user confirmation to assemble a release for the Product Part acceptance repair stream before changing release notes or running release automation (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record product part acceptance release decision`).
60. [DONE] Git Commit: `docs: record product part acceptance release decision` (hash: 74ec8f12d)
61. [DONE] `managed-workflow-context.phase14d.task2` Prepare README and CHANGELOG for the Product Part acceptance repair release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare product part acceptance release`).
62. [DONE] Git Commit: `docs: prepare product part acceptance release` (hash: a99795475)
63. [DONE] `managed-workflow-context.phase14d.task3` Run release automation and verify VSIX/tarball outputs for the Product Part acceptance repair (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`; expected commit: `chore: build product part acceptance release artifacts`).
64. [DONE] Git Commit: `chore: build product part acceptance release artifacts` (hash: 4fe24d1f9)
65. [DONE] `managed-workflow-context.phase14d.task4` User retests the Product Part acceptance repair release with Claude Diagram Modules to confirm target-scoped feedback, blocked continuation on failed managed commit, and Product Part index status commit ownership; result: failed on prompt no-link leakage and split Core/PM managed messaging ownership, so repair streams 14E and 14F were added (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record product part acceptance release retest`).
66. [DONE] Git Commit: `docs: record product part acceptance release retest` (hash: 6bd34b715)

## Phase 14E - Description Prompt No-Link Repair (owner: Codex, updated: 2026-05-09)

### Stream: Retest Feedback Intake

67. [DONE] `managed-workflow-context.phase14e.task1` Remove provider-visible file paths from the Description first prompt when questionnaire/template content is already embedded, including relative questionnaire path, absolute questionnaire path, and absolute template path; provider prompts must give text, not instructions or incentives to read those files again (scope: `src/client/project-manager/services`, prompt builder tests, `doc/TODO/todo-plan.md`; expected commit: `fix: remove description prompt file paths`).
68. [DONE] Git Commit: `fix: remove description prompt file paths` (hash: 09457e3d1)
69. [DONE] `managed-workflow-context.phase14e.task2` Remove provider-visible `Final_Description.md` relative and absolute paths from the Virtual Simulation first prompt when the final description text is already embedded; provider prompts must not invite the agent to re-read the source file (scope: `src/client/project-manager/services`, prompt builder tests, `doc/TODO/todo-plan.md`; expected commit: `fix: remove virtual simulation prompt file paths`).
70. [DONE] Git Commit: `fix: remove virtual simulation prompt file paths` (hash: 77130d84d)
71. [DONE] `managed-workflow-context.phase14e.task3` Verify Description and Virtual Simulation prompt no-link behavior and record retest evidence before the next release decision (scope: `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `test: verify prompt no-link contracts`).
72. [DONE] Git Commit: `test: verify prompt no-link contracts` (hash: 3001c6afc)

## Phase 14F - Managed Workflow Core-Only Agent Messaging Repair (owner: Codex, updated: 2026-05-09)

### Stream: Retest Feedback Intake

73. [DONE] `managed-workflow-context.phase14f.task1` Remove Project Manager as a sender of managed workflow provider messages: PM may refresh/read state and send user intents to Core, but only Core may send automatic Diagram Modules/Product Part continuation, repair, failure, or wait messages to the agent between turns (scope: `src/client/project-manager/components/sessions`, `src/client/project-manager/services`, focused PM orchestration tests; expected commit: `fix: remove pm managed workflow agent messaging`).
74. [DONE] Git Commit: `fix: remove pm managed workflow agent messaging` (hash: e572b9056)
75. [DONE] `managed-workflow-context.phase14f.task2` Move Diagram Modules Product Part continuation decisions into Core as a single atomic boundary after validation and managed commit: Core emits exactly one provider-visible message per boundary, either repair/failure/wait or accepted next-target continuation, never both (scope: `packages/core/src/remote-bridge/handlers`, `packages/core/src/remote-bridge/handlers/*diagram*test*`, `doc/TODO/todo-plan.md`; expected commit: `fix: make core own diagram modules continuation`).
76. [DONE] Git Commit: `fix: make core own diagram modules continuation` (hash: e46536bff)
77. [DONE] `managed-workflow-context.phase14f.task3` Model Diagram Modules as two ownership phases without splitting the existing automatic generation phase: Phase 1 remains a Core/agent-owned automatic conversation that creates the Product Parts index/graph and materializes every Product Part under Core-owned continuation; after all Product Parts are accepted, Phase 1 completes and the agent stops. Phase 2 is user-owned review/editing, where each user turn that changes Product Parts, clusters, modules, names, or descriptions is opened by Core as its own microtask and commit boundary (scope: `packages/core/src/managed-workspace`, `packages/core/src/remote-bridge/handlers`, stage-plan tests; expected commit: `fix: add diagram modules user review phase`).
78. [DONE] Git Commit: `fix: add diagram modules user review phase` (hash: 0e695055f)
79. [DONE] `managed-workflow-context.phase14f.task4` Verify managed workflow messaging ownership and Diagram Modules phase boundaries: PM sends no automatic provider messages, Core emits one authoritative message per Product Part boundary during Phase 1, aggregate completion stops for user continuation, and Phase 2 user turns become independent Core-tracked microtasks with UI input/locks reflecting Core state only (scope: `packages/core`, `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `test: verify core-only managed workflow messaging`).
80. [DONE] Git Commit: `test: verify core-only managed workflow messaging` (hash: a85109893)

## Phase 14G - Release Build (owner: Codex, updated: 2026-05-09)

### Stream: Core-Only Messaging Release Assembly

81. [DONE] `managed-workflow-context.phase14g.task1` Prepare README and CHANGELOG for the next core-only managed workflow messaging release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: prepare core-only messaging release`).
82. [DONE] Git Commit: `docs: prepare core-only messaging release` (hash: 34479e1cc)
83. [DONE] `managed-workflow-context.phase14g.task2` Run release automation and verify VSIX/tarball outputs for the core-only managed workflow messaging fix (scope: `package.json`, `package-lock.json`, `doc/tmp/releases/`, `doc/TODO/todo-plan.md`; expected commit: `chore: build core-only messaging release artifacts`).
84. [DONE] Git Commit: `chore: build core-only messaging release artifacts` (hash: fab90291f)
85. [DONE] `managed-workflow-context.phase14g.task3` Hand off the built release for user workflow retesting and keep scope active until explicit acceptance (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: hand off core-only messaging release`).
86. [DONE] Git Commit: `docs: hand off core-only messaging release` (hash: 54fa80962)
87. [DONE] `managed-workflow-context.phase14g.task4` User retests release `1.2.211`, with focus on Claude Diagram Modules Core-only continuation, absence of contradictory PM/Core messages, Product Part Phase 1 automation, and user-owned Phase 2 review handoff (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record core-only messaging release retest`).
88. [DONE] Git Commit: `docs: record core-only messaging release retest` (hash: 177a889d9)

## Phase 14H - Continuation Turn Boundary Repair (owner: Codex, updated: 2026-05-09)

### Stream: Turn Boundary Ordering And Input Lock

89. [DONE] `managed-workflow-context.phase14h.task1` Fix Diagram Modules Core continuation dispatch so accepted next-target messages wait for a fully settled provider turn boundary and cannot appear between chunks of the previous assistant response (scope: `packages/core/src/remote-bridge/handlers`, focused Core session/feedback ordering tests; expected commit: `fix: defer core continuation until turn boundary settles`).
90. [DONE] Git Commit: `fix: defer core continuation until turn boundary settles` (hash: 61dc46571)
91. [DONE] `managed-workflow-context.phase14h.task2` Keep Project Manager input locked across Core continuation handoff and the following managed provider turn, including the case where a continuation is queued but the previous assistant turn is still flushing visible text (scope: `src/client/project-manager/components/sessions`, focused PM input-lock tests; expected commit: `fix: keep input locked during managed continuation handoff`).
92. [DONE] Git Commit: `fix: keep input locked during managed continuation handoff` (hash: 07b4ba24a)
93. [DONE] `managed-workflow-context.phase14h.task3` Verify turn-boundary-safe continuation ordering for Claude Diagram Modules and record focused Core/Project Manager evidence before the next release decision (scope: `packages/core`, `src/client/project-manager`, `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `test: verify managed continuation turn boundaries`).
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
110. [PENDING] Git Commit: `test: verify event-driven managed continuation` (hash: TBD)

## Phase 15 - Scope Closeout (owner: Codex, updated: 2026-05-09)

### Stream: Closeout

111. [TODO] `managed-workflow-context.phase15.task1` Close the scope only after explicit user acceptance, archive the active plan, and dispose planning documents according to closeout rules (scope: `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed workflow context bundles`).
112. [TODO] Git Commit: `docs: close managed workflow context bundles` (hash: TBD)
113. [TODO] `managed-workflow-context.phase15.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: close managed workflow context bundles`).
