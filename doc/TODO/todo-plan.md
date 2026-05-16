# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-quality-gates-foundation-planning-2026-05-16",
  "branch": "main",
  "baseHead": "96b9651c8",
  "lastRecordedCommit": "96b9651c8",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_ProjectFoundation_Planning_RU.md",
  "currentTaskId": "foundation-planning.phase0.docs.task1",
  "expectedCommitMessage": "docs: plan skeleton and quality gates foundation upgrades",
  "debt": {
    "expectedCommitMessage": "docs: plan skeleton and quality gates foundation upgrades",
    "preCommitHead": "96b9651c8",
    "stage": "commit_pending",
    "taskId": "foundation-planning.phase0.docs.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_ProjectFoundation_Planning_RU.md`
- **Companion planning source:** `doc/SolidWorks-WorkFlow/Plans/QualityGates_WorkingBaseline_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the recovery context for this planning/documentation intake cycle.

## Execution Rules

- This scope is documentation/planning only. Do not edit product code.
- Create exactly two planning documents that capture the discussed Application Skeleton and Quality Gates Baseline lifecycle upgrades.
- Do not start implementation planning beyond these documents until the user accepts or revises them.
- Use `npm run plan:commit -- "<expected commit message>"` for the tracked documentation change; do not bypass hooks.

## Phase 0 — Planning Documents Intake (owner: Codex, updated: 2026-05-16)

### Stream: Agent Responsibility Split

1. [DONE] `foundation-planning.phase0.docs.task1` Create planning documents for Application Skeleton installable project foundation and Quality Gates real working baseline, including prompt outcomes, user-question gates, parser requirements, and responsibility boundaries (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_ProjectFoundation_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/QualityGates_WorkingBaseline_Planning_RU.md`; expected commit: `docs: plan skeleton and quality gates foundation upgrades`).
2. [PENDING] Git Commit: `docs: plan skeleton and quality gates foundation upgrades` (hash: TBD)

## Phase 1 — User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-16)

### Stream: Planning Review

3. [TODO] `foundation-planning.phase1.acceptance.task1` User reviews the two planning documents and either accepts them as the basis for a future implementation scope or requests changes. Scope: user workflow acceptance only; expected commit: none.

## Phase 2 — Scope Closeout (owner: Codex, updated: 2026-05-16)

### Stream: Closeout

4. [TODO] `foundation-planning.phase2.closeout.task1` After explicit user acceptance, archive or disposition this planning intake scope and update index/disposition only if needed (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close skeleton and quality gates foundation planning`).
5. [TODO] Git Commit: `docs: close skeleton and quality gates foundation planning` (hash: TBD)
6. [TODO] `foundation-planning.phase2.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle. Scope: handoff only; expected commit: none.
