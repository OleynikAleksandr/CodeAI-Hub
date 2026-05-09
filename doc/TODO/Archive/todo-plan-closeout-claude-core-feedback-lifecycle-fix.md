# Plan Closeout: claude-core-feedback-lifecycle-fix

**Created:** 2026-05-09T06:42:02.730Z
**Acceptance:** User approved Diagram Modules Core-Orchestrated Subturns planning document and requested archiving the old active todo-plan before creating a new implementation plan.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** claude-core-feedback.phase10.task1
**Expected Commit:** docs: close claude core feedback lifecycle fix
**Last Recorded Commit:** 092e110a8
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Core_Feedback_Lifecycle_Fix.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-core-feedback-lifecycle-fix",
  "branch": "main",
  "baseHead": "8eb5a8582a601c0ea82bad704fb51c3983e4998d",
  "lastRecordedCommit": "092e110a8",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Core_Feedback_Lifecycle_Fix.md",
  "currentTaskId": "claude-core-feedback.phase10.task1",
  "expectedCommitMessage": "docs: close claude core feedback lifecycle fix",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Core_Feedback_Lifecycle_Fix.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Core_Feedback_Lifecycle_Fix.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_Core_Orchestrated_Subturns.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this Context Pack is the recovery source for the current execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation task touches no more than 3 files.
- Each implementation task is followed by a separate `Git Commit` item.
- Quality gates run through Husky hooks on commit.
- Do not run release build automation until the user explicitly confirms release assembly.

## Phase 1 - Planning Intake (owner: Codex, updated: 2026-05-08)

### Stream: Scope Setup

1. [DONE] `claude-core-feedback.phase1.task1` Create planning source and active TODO plan for Claude/Core feedback lifecycle fix (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Core_Feedback_Lifecycle_Fix.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: plan claude core feedback lifecycle fix`).
2. [DONE] Git Commit: `docs: plan claude core feedback lifecycle fix` (hash: 80b5f2aba)

## Phase 2 - Diagram Modules Diagnostics (owner: Codex, updated: 2026-05-08)

### Stream: Validation Reasons

3. [DONE] `claude-core-feedback.phase2.task1` Preserve per-part Diagram Modules validation diagnostics in progress snapshots and tests (scope: `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`, `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`; expected commit: `fix: report diagram modules validation diagnostics`).
4. [DONE] Git Commit: `fix: report diagram modules validation diagnostics` (hash: 7b67cf6ac)
5. [DONE] `claude-core-feedback.phase2.task2` Update Diagram Modules acceptance feedback to separate semantic failures from Core-owned dirty gates (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts`, `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`, `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts`; expected commit: `fix: clarify managed diagram modules feedback`).
6. [DONE] Git Commit: `fix: clarify managed diagram modules feedback` (hash: f1dee76ab)

## Phase 3 - Post-Turn Lock And Ordering (owner: Codex, updated: 2026-05-08)

### Stream: Core Feedback Turn Lifecycle

7. [DONE] `claude-core-feedback.phase3.task1` Keep session input locked while Core post-turn acceptance feedback is pending (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-turn-completion.ts`, `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`, related test file; expected commit: `fix: lock sessions during core feedback turns`).
8. [DONE] Git Commit: `fix: lock sessions during core feedback turns` (hash: 34c4f4c66)
9. [DONE] `claude-core-feedback.phase3.task2` Ensure deferred Core user messages are appended before next reasoning stream is surfaced in the UI path (scope: `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`, related test file; expected commit: `fix: order deferred core feedback before reasoning`).
10. [DONE] Git Commit: `fix: order deferred core feedback before reasoning` (hash: 9afb177e8)

## Phase 4 - Verification And Release Gate (owner: Codex, updated: 2026-05-08)

### Stream: Targeted Verification

11. [DONE] `claude-core-feedback.phase4.task1` Run targeted Core tests and affected builds for feedback lifecycle changes (scope: `packages/core`, `src/client/project-manager`; expected commit: `test: verify claude core feedback lifecycle`).
12. [DONE] Git Commit: `test: verify claude core feedback lifecycle` (hash: b8c9d2a7c)

### Stream: Release Build Confirmation

13. [DONE] `claude-core-feedback.phase4.task2` Stop and ask the user whether to assemble a release build after fixes are committed (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record claude core feedback lifecycle verification`).
14. [DONE] Git Commit: `docs: record claude core feedback lifecycle verification` (hash: 82d8b7384)

### Stream: Release Build

15. [DONE] `claude-core-feedback.phase4.task3` Prepare v1.2.204 README and CHANGELOG release notes before release automation (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare 1.2.204 claude core feedback release`).
16. [DONE] Git Commit: `docs: prepare 1.2.204 claude core feedback release` (hash: bc14ee350)
17. [DONE] `claude-core-feedback.phase4.task4` Run release automation for v1.2.204 and verify VSIX/tarball outputs (scope: `package.json`, workspace package manifests, `package-lock.json`, `doc/tmp/releases/`; expected commit: `chore: build 1.2.204 release artifacts`).
18. [DONE] Git Commit: `chore: build 1.2.204 release artifacts` (hash: 138df8fa8)

## Phase 5 - Retest Feedback Repair (owner: Codex, updated: 2026-05-08)

### Stream: Managed Progress Freshness

19. [DONE] `claude-core-feedback.phase5.task1` Refresh managed stage progress and Git status before sending Core acceptance feedback so stale workflow-state polls cannot reject already-written Diagram Modules artifacts (scope: `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts`, related focused test; expected commit: `fix: refresh managed progress before feedback`).
20. [DONE] Git Commit: `fix: refresh managed progress before feedback` (hash: 9b2ca27de)

## Phase 6 - Stale Feedback Release (owner: Codex, updated: 2026-05-08)

### Stream: Release Build

21. [DONE] `claude-core-feedback.phase6.task1` Prepare v1.2.205 README and CHANGELOG release notes for stale managed progress feedback fix (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare 1.2.205 stale feedback release`).
22. [DONE] Git Commit: `docs: prepare 1.2.205 stale feedback release` (hash: 4a21fabda)
23. [DONE] `claude-core-feedback.phase6.task2` Run release automation for v1.2.205 and verify VSIX/tarball outputs (scope: `package.json`, workspace package manifests, `package-lock.json`, `doc/tmp/releases/`; expected commit: `chore: build 1.2.205 release artifacts`).
24. [DONE] Git Commit: `chore: build 1.2.205 release artifacts` (hash: b03d865b3)

### Stream: User Workflow Acceptance Testing

25. [DONE] `claude-core-feedback.phase6.task3` Record failed user retest feedback on Claude managed workflow sessions and route the scope into comparative audit (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record claude core feedback lifecycle acceptance`).
26. [TODO] Git Commit: `docs: record claude core feedback lifecycle acceptance` (hash: TBD)

## Phase 7 - Comparative Provider Audit (owner: Codex, updated: 2026-05-09)

### Stream: Claude vs Codex Diagram Modules Audit

27. [DONE] `claude-core-feedback.phase7.task1` Compare Claude and Codex Diagram Modules sessions, stage artifacts, todo-plan/Git state, provider prompts, and core/provider code paths; write the audit report (scope: `doc/Claude_Diagram_Modules_Provider_Audit.md`; expected commit: `docs: audit claude diagram modules provider lifecycle`).
28. [DONE] Git Commit: `docs: audit claude diagram modules provider lifecycle` (hash: 0ef32d35c)

## Phase 8 - Core-Orchestrated Diagram Modules Planning (owner: Codex, updated: 2026-05-09)

### Stream: Architecture Planning

29. [DONE] `claude-core-feedback.phase8.task1` Write the planning document for refactoring Diagram Modules into Core-orchestrated one-artifact provider subturns (scope: `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_Core_Orchestrated_Subturns.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: plan diagram modules core orchestrated subturns`).
30. [DONE] Git Commit: `docs: plan diagram modules core orchestrated subturns` (hash: 6f6e0daf6)

## Phase 9 - Refactor Decision Gate (owner: Codex, updated: 2026-05-09)

### Stream: User Workflow Acceptance Testing

31. [DONE] `claude-core-feedback.phase9.task1` Wait for user decision on the Diagram Modules Core-orchestrated refactor planning document before implementation (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record diagram modules orchestration planning approval`).
32. [DONE] Git Commit: `docs: record diagram modules orchestration planning approval` (hash: 092e110a8)

## Phase 10 - Acceptance And Closeout (owner: Codex, updated: 2026-05-09)

### Stream: Scope Closeout

33. [IN_PROGRESS] `claude-core-feedback.phase10.task1` Close scope after explicit user acceptance and archive planning artifacts (scope: `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close claude core feedback lifecycle fix`).
34. [TODO] Git Commit: `docs: close claude core feedback lifecycle fix` (hash: TBD)
35. [TODO] `claude-core-feedback.phase10.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: close claude core feedback lifecycle fix`).
````
