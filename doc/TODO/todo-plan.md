# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "local-models-workflow-warmup-hotfix-2026-06-23",
  "branch": "main",
  "baseHead": "dbebb0a76",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/LocalModels_WorkflowWarmup_Hotfix_Planning.md",
  "currentTaskId": "phase1.stream2.task2",
  "expectedCommitMessage": "build: release v1.2.595",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/LocalModels_WorkflowWarmup_Hotfix_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Modules/LocalModels.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

## Правила выполнения (Execution Rules)
- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each task touches no more than 3 files except release build/version artifacts.
- Each implementation task is followed by its own `Git Commit: ...`.
- Release build is confirmed by the user request: "сделай фикс и пересобери релиз".

## Phase 1 - Local Models warmup hotfix (owner: Codex, updated: 2026-06-23)
### Stream: Runtime fix
1. [DONE] `phase1.stream1.task1` Defer Local Models workflow-agent startup warmup, lower default workflow context to 8192, and update the Local Models contract docs.
   - scope: `packages/core/src/local-models/**, doc/SolidWorks-WorkFlow/Modules/LocalModels.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/LocalModels_WorkflowWarmup_Hotfix_Planning.md`
   - expected commit: `fix(local-models): defer workflow warmup`
2. [DONE] `phase1.stream1.commit1` Git Commit: `fix(local-models): defer workflow warmup` (hash: self)

### Stream: Release Build
3. [DONE] `phase1.stream2.task1` Prepare release notes for v1.2.595.
   - scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`
   - expected commit: `docs: prepare v1.2.595 release notes`
4. [DONE] `phase1.stream2.commit1` Git Commit: `docs: prepare v1.2.595 release notes` (hash: self)
5. [IN_PROGRESS] `phase1.stream2.task2` Build release v1.2.595.
   - scope: `package.json, package-lock.json, packages/**/package.json, packages/**/package-lock.json, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`
   - expected commit: `build: release v1.2.595`
6. [TODO] `phase1.stream2.commit2` Git Commit: `build: release v1.2.595` (hash: TBD)

### Stream: User Workflow Acceptance Testing
7. [TODO] `phase1.stream3.task1` Provide VSIX and retest instructions.
   - scope: `doc/TODO/todo-plan.md`
   - expected commit: `test: hand off v1.2.595 local models warmup fix`
8. [TODO] `phase1.stream3.commit1` Git Commit: `test: hand off v1.2.595 local models warmup fix` (hash: TBD)

### Stream: Scope Closeout
9. [TODO] `phase1.stream4.task1` Close scope after user acceptance.
   - scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**`
   - expected commit: `docs: close local models warmup hotfix scope`
10. [TODO] `phase1.stream4.commit1` Git Commit: `docs: close local models warmup hotfix scope` (hash: TBD)
