# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "backlog-docs-cleanup-2026-06-24",
  "branch": "main",
  "baseHead": "6d7826ade",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Backlog/README.md",
  "currentTaskId": "backlog-docs.phase1.promote-benchmarks.task1",
  "expectedCommitMessage": "docs: promote model benchmark summaries to backlog",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Backlog/README.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Plans/Intent_Normalizer_Module_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Provider_Instruction_Profile_Calibration_GLM_Kimi_RU.md`
  - `doc/tmp/prototypes/Coding_Model_Benchmark_RU.md`
  - `doc/tmp/prototypes/Documentation_Planning_Model_Benchmark_RU.md`
- Only this list is the document source for restoring this execution cycle's context.

## Execution Rules

- Keep this scope documentation-only.
- Keep raw benchmark scripts and logs in `doc/tmp/prototypes/`; move only durable summary/planning documents into `Plans/Backlog/`.
- Mark benchmark results as exploratory when the exact system prompt/tool stack was not frozen before comparison.
- Each task is followed by a separate `Git Commit: ...` line.
- Run `npm run plan:validate` before each `npm run plan:commit -- "<Expected Commit>"`.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-06-24)

### Stream: Accepted cleanup scope

1. [DONE] `backlog-docs.phase0.plan.task1` Create the active documentation-cleanup todo-plan and move the intent normalizer / provider instruction calibration planning docs from active Plans into Backlog (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Intent_Normalizer_Module_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Provider_Instruction_Profile_Calibration_GLM_Kimi_RU.md, doc/SolidWorks-WorkFlow/Plans/Backlog/**`; expected commit: `docs: move model planning docs to backlog`).
2. [DONE] `backlog-docs.phase0.plan.commit1` Git Commit: `docs: move model planning docs to backlog` (hash: self)

## Phase 1 - Backlog Document Placement (owner: Codex, updated: 2026-06-24)

### Stream: Promote benchmark summaries

3. [IN_PROGRESS] `backlog-docs.phase1.promote-benchmarks.task1` Promote the coding and documentation benchmark summary reports from ignored tmp into Backlog while leaving raw scripts/logs in `doc/tmp/prototypes/` (scope: `doc/tmp/prototypes/Coding_Model_Benchmark_RU.md, doc/tmp/prototypes/Documentation_Planning_Model_Benchmark_RU.md, doc/SolidWorks-WorkFlow/Plans/Backlog/**, doc/TODO/todo-plan.md`; expected commit: `docs: promote model benchmark summaries to backlog`).
4. [TODO] `backlog-docs.phase1.promote-benchmarks.commit1` Git Commit: `docs: promote model benchmark summaries to backlog` (hash: TBD)

## Phase 2 - Backlog Audit And Index (owner: Codex, updated: 2026-06-24)

### Stream: Backlog freshness map

5. [TODO] `backlog-docs.phase2.audit.task1` Add a concise Backlog README/freshness map and update Docs_Index entries for the moved documents (scope: `doc/SolidWorks-WorkFlow/Plans/Backlog/README.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: audit backlog planning documents`).
6. [TODO] `backlog-docs.phase2.audit.commit1` Git Commit: `docs: audit backlog planning documents` (hash: TBD)

### Stream: Verification and closeout

7. [TODO] `backlog-docs.phase2.verify.task1` Run plan validation and a targeted link/path check for the moved Backlog documents (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: verify backlog document cleanup`).
8. [TODO] `backlog-docs.phase2.verify.commit1` Git Commit: `docs: verify backlog document cleanup` (hash: TBD)
