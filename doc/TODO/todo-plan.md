# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "backlog-benchmarks-folder-2026-06-24",
  "branch": "main",
  "baseHead": "2ee1460b1",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Backlog/README.md",
  "currentTaskId": "backlog-benchmarks.phase1.closeout.task1",
  "expectedCommitMessage": "docs: close backlog benchmarks folder cleanup",
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
  - `doc/SolidWorks-WorkFlow/Plans/Backlog/README.md`
- Only this list is the document source for restoring this execution cycle's context.

## Execution Rules

- Documentation-only cleanup.
- Move durable benchmark summaries under `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/`.
- Keep raw benchmark scripts/logs in `doc/tmp/prototypes/`.
- Run `npm run plan:validate` before each `npm run plan:commit -- "<Expected Commit>"`.

## Phase 1 - Backlog Benchmark Folder Cleanup (owner: Codex, updated: 2026-06-24)

### Stream: Move benchmark summaries

1. [DONE] `backlog-benchmarks.phase1.move.task1` Move benchmark summary documents into the Backlog `Benchmarks/` folder and update the Backlog freshness map (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Backlog/**`; expected commit: `docs: group backlog benchmark summaries`).
2. [DONE] `backlog-benchmarks.phase1.move.commit1` Git Commit: `docs: group backlog benchmark summaries` (hash: self)
3. [DONE] `backlog-benchmarks.phase1.references.task1` Update index and cross-document links to the moved benchmark summaries (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/Backlog/Provider_Instruction_Profile_Calibration_GLM_Kimi_RU.md`; expected commit: `docs: update backlog benchmark references`).
4. [DONE] `backlog-benchmarks.phase1.references.commit1` Git Commit: `docs: update backlog benchmark references` (hash: self)

### Stream: Verification and closeout

5. [IN_PROGRESS] `backlog-benchmarks.phase1.closeout.task1` Validate the plan, verify moved paths, and write the closeout archive (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/todo-plan-closeout-backlog-benchmarks-folder-2026-06-24.md`; expected commit: `docs: close backlog benchmarks folder cleanup`).
6. [TODO] `backlog-benchmarks.phase1.closeout.commit1` Git Commit: `docs: close backlog benchmarks folder cleanup` (hash: TBD)
7. [TODO] `backlog-benchmarks.phase1.post-closeout-handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
