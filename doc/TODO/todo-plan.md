# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "local-models-prompt-controls-2026-06-24",
  "branch": "main",
  "baseHead": "6cd9e8b9d",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/LocalModels_SystemPrompt_Override_Planning.md",
  "currentTaskId": "phase3.stream1.task1",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/LocalModels_SystemPrompt_Override_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/LocalModels.md`
  - `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Intent_Normalizer_Module_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/claude-instruction-analysis/Claude_My_System_Prompt.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task changes no more than the listed scope.
- Use `npm run plan:validate` before planned commits.
- Use `npm run plan:commit -- "<expected commit message>"` for planned commits.
- Release build confirmation was given by the user on 2026-06-24: "Оформляй, меняй, собирай новый релиз и потом сделаем новый тест."

## Phase 1 - Scope Setup (owner: Codex, updated: 2026-06-24)

### Stream: Planning

1. [DONE] `phase1.stream1.task1` Create the planning source and active execution plan for Local Models prompt controls (scope: `doc/SolidWorks-WorkFlow/Plans/LocalModels_SystemPrompt_Override_Planning.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan local models prompt controls`).
2. [DONE] Git Commit: `docs: plan local models prompt controls` (hash: self)

## Phase 2 - Implementation (owner: Codex, updated: 2026-06-24)

### Stream: Prompt Controls

1. [DONE] `phase2.stream1.task1` Add native Local Models prompt override support and set workflow-agent temperature to 0.3 (scope: `packages/core/src/local-models/local-models-prompt-controls.ts, packages/core/src/local-models/local-models-provider-adapter.ts, packages/core/src/local-models/local-models-provider-adapter.prompt-controls.test.ts`; expected commit: `feat: add local models native prompt controls`).
2. [DONE] Git Commit: `feat: add local models native prompt controls` (hash: self)
3. [DONE] `phase2.stream1.task2` Apply the same prompt controls to the workspace artifact tool path (scope: `packages/core/src/local-models/local-models-workflow-artifact-tool.ts, packages/core/src/local-models/local-models-provider-adapter.tools.test.ts`; expected commit: `feat: apply local models prompt controls to tools`).
4. [DONE] Git Commit: `feat: apply local models prompt controls to tools` (hash: self)
5. [DONE] `phase2.stream1.task3` Document Local Models prompt controls in SSOT docs (scope: `doc/SolidWorks-WorkFlow/Modules/LocalModels.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: document local models prompt controls`).
6. [DONE] Git Commit: `docs: document local models prompt controls` (hash: self)

## Phase 3 - Tooling Verification (owner: Codex, updated: 2026-06-24)

### Stream: Targeted Checks

1. [IN_PROGRESS] `phase3.stream1.task1` Run targeted Local Models tests and `npm run build --workspace @codeai-hub/core` (scope: `verification`).

## Phase 4 - Release And Acceptance (owner: Codex, updated: 2026-06-24)

### Stream: Release Build

1. [TODO] `phase4.stream1.task1` Prepare README and CHANGELOG for release 1.2.605 before running release scripts (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.605 release notes`).
2. [TODO] Git Commit: `docs: prepare 1.2.605 release notes` (hash: TBD)
3. [TODO] `phase4.stream1.task2` Run release build scripts and commit generated version state (scope: `package.json, package-lock.json, packages/**/package.json, assets/launcher/manifest.json`; expected commit: `chore: build 1.2.605 release`).
4. [TODO] Git Commit: `chore: build 1.2.605 release` (hash: TBD)

### Stream: User Workflow Acceptance Testing

1. [TODO] `phase4.stream2.task1` User installs release 1.2.605 and confirms Local Models prompt-control retest can proceed (scope: `user workflow`).

### Stream: Scope Closeout

1. [TODO] `phase4.stream3.task1` Close the Local Models prompt-control scope after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/LocalModels_SystemPrompt_Override_Planning.md, doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close local models prompt controls`).
2. [TODO] Git Commit: `docs: close local models prompt controls` (hash: TBD)
3. [TODO] `phase4.stream3.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`).
