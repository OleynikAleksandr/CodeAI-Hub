# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "audit-automation-cleanup-part1-2026-06-15",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "8928ccf31",
  "lastRecordedCommit": "7ee184cf3",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/AuditAutomationCleanup_Part1_Planning.md",
  "currentTaskId": "phase1.stream5a.task1",
  "expectedCommitMessage": "chore: update gemini cli dependencies",
  "debt": {
    "expectedCommitMessage": "chore: update gemini cli dependencies",
    "preCommitHead": "7ee184cf3",
    "stage": "commit_pending",
    "taskId": "phase1.stream5a.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/AuditAutomationCleanup_Part1_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Keep each microtask to no more than 3 files, excluding `doc/TODO/todo-plan.md`.
- Every implementation task is followed by a separate `Git Commit: ...` item.
- Use `npm run plan:commit -- "<expected commit message>"`; do not bypass hooks.
- Release build is out of scope for this part unless the user explicitly asks for it.

## Phase 1 - Audit Automation Part 1 (owner: Codex, updated: 2026-06-15)

### Stream: Plan Setup

1. [DONE] `phase1.stream1.task1` Create the accepted audit automation part 1 planning source and active execution plan. (scope: `doc/SolidWorks-WorkFlow/Plans/AuditAutomationCleanup_Part1_Planning.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan audit automation cleanup`)
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan audit automation cleanup` (hash: 54caeab06)

### Stream: Automatic Gates

3. [DONE] `phase1.stream2.task1` Add low-noise automatic checks for audit gaps: runtime security audit, workspace duplication guard, and CI coverage for duplicate/link/security checks. (scope: `package.json, .github/workflows/ci.yml, .husky/pre-push`; expected commit: `chore: automate audit gap checks`)
4. [DONE] `phase1.stream2.commit1` Git Commit: `chore: automate audit gap checks` (hash: 8ca09ba4c)

### Stream: Runtime Security Patch

5. [DONE] `phase1.stream3.task1` Patch low-risk Core runtime dependency advisories without changing provider internals. (scope: `packages/core/package.json, package-lock.json`; expected commit: `fix: patch core runtime dependencies`)
6. [DONE] `phase1.stream3.commit1` Git Commit: `fix: patch core runtime dependencies` (hash: 137d50576)

### Stream: Manual Cleanup

7. [DONE] `phase1.stream4.task1` Remove stale tracked TODO zip archive residue. (scope: `.gitignore, doc/TODO/Archive.zip`; expected commit: `chore: remove stale todo archive zip`)
8. [DONE] `phase1.stream4.commit1` Git Commit: `chore: remove stale todo archive zip` (hash: 8b4a8c2fa)
9. [DONE] `phase1.stream4.task2` Remove two audit noise patterns from source without changing behavior. (scope: `packages/Claude_Module/src/installer/sdk-installer.ts, src/client/project-manager/api.ts`; expected commit: `chore: remove audit noise patterns`)
10. [DONE] `phase1.stream4.commit2` Git Commit: `chore: remove audit noise patterns` (hash: aef381ca5)
11. [DONE] `phase1.stream4.task3` Trim redundant Knip entry config hints. (scope: `knip.json`; expected commit: `chore: trim knip audit config`)
12. [DONE] `phase1.stream4.commit3` Git Commit: `chore: trim knip audit config` (hash: f21b25265)

### Stream: Tooling Verification

13. [DONE] `phase1.stream5.task1` Run targeted verification for the changed gates and touched packages. (scope: `package.json, packages/core/package.json, package-lock.json`; expected commit: `test: verify audit automation cleanup`)
14. [DONE] `phase1.stream5.commit1` Git Commit: `test: verify audit automation cleanup` (hash: 7ee184cf3)

### Stream: Gemini Dependency Correction

15. [DONE] `phase1.stream5a.task1` Align repository Gemini CLI/Core dev dependencies with the installed provider version 0.46.0. (scope: `package.json, packages/Gemini_Module/package.json, package-lock.json`; expected commit: `chore: update gemini cli dependencies`)
16. [PENDING] `phase1.stream5a.commit1` Git Commit: `chore: update gemini cli dependencies` (hash: TBD)
17. [TODO] `phase1.stream5a.task2` Restore the Gemini compatibility layer for the 0.46.0 internal package layout. (scope: `packages/Gemini_Module/src/runtime/gemini-cli-compat-types.d.ts, packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts`; expected commit: `fix: restore gemini cli 0.46 compatibility`)
18. [TODO] `phase1.stream5a.commit2` Git Commit: `fix: restore gemini cli 0.46 compatibility` (hash: TBD)

### Stream: Release Build

19. [TODO] `phase1.stream5b.task1` Prepare release documentation for version 1.2.520 before rebuilding artifacts. (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.520 release notes`)
20. [TODO] `phase1.stream5b.commit1` Git Commit: `docs: prepare 1.2.520 release notes` (hash: TBD)
21. [TODO] `phase1.stream5b.task2` Run the confirmed release build and keep generated release artifacts. (scope: `package.json, package-lock.json, packages/**/package.json, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.520`)
22. [TODO] `phase1.stream5b.commit2` Git Commit: `chore: build release 1.2.520` (hash: TBD)

### Stream: User Workflow Acceptance Testing

23. [TODO] `phase1.stream6.task1` Report results and wait for explicit user acceptance. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record audit cleanup acceptance`)
24. [TODO] `phase1.stream6.commit1` Git Commit: `docs: record audit cleanup acceptance` (hash: TBD)

### Stream: Scope Closeout

25. [TODO] `phase1.stream7.task1` Close the accepted scope and archive planning state after user acceptance. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close audit automation cleanup scope`)
26. [TODO] `phase1.stream7.commit1` Git Commit: `docs: close audit automation cleanup scope` (hash: TBD)
