# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-context-bundles-and-microtasks",
  "branch": "main",
  "baseHead": "1c304bdac",
  "lastRecordedCommit": "775b41943",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md",
  "currentTaskId": "managed-workflow-context.phase14b.task3",
  "expectedCommitMessage": "chore: build managed sequencing release artifacts",
  "debt": {
    "expectedCommitMessage": "chore: build managed sequencing release artifacts",
    "preCommitHead": "775b41943",
    "stage": "commit_pending",
    "taskId": "managed-workflow-context.phase14b.task3"
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
50. [PENDING] Git Commit: `chore: build managed sequencing release artifacts` (hash: TBD)
51. [TODO] `managed-workflow-context.phase14b.task4` User retests the follow-up release with Claude Diagram Modules to confirm strict Product Part extraction and one-at-a-time task exposure (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Context_Bundles_And_Microtasks.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record managed sequencing release retest`).
52. [TODO] Git Commit: `docs: record managed sequencing release retest` (hash: TBD)

## Phase 15 - Scope Closeout (owner: Codex, updated: 2026-05-09)

### Stream: Closeout

53. [TODO] `managed-workflow-context.phase15.task1` Close the scope only after explicit user acceptance, archive the active plan, and dispose planning documents according to closeout rules (scope: `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed workflow context bundles`).
54. [TODO] Git Commit: `docs: close managed workflow context bundles` (hash: TBD)
55. [TODO] `managed-workflow-context.phase15.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: close managed workflow context bundles`).
