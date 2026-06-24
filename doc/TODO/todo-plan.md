# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "backlog-benchmark-docs-folder-2026-06-24",
  "branch": "main",
  "baseHead": "8bcbd2b7a",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Backlog/README.md",
  "currentTaskId": "backlog-benchmark-docs.phase1.closeout.task1",
  "expectedCommitMessage": "docs: close benchmark-related backlog grouping",
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
- Move benchmark/capture experiment planning documents under `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/`.
- Keep raw benchmark scripts/logs in `doc/tmp/prototypes/`.
- Run `npm run plan:validate` before each `npm run plan:commit -- "<Expected Commit>"`.

## Phase 1 - Benchmark-Related Backlog Grouping (owner: Codex, updated: 2026-06-24)

### Stream: Move benchmark-related docs

1. [DONE] `backlog-benchmark-docs.phase1.move.task1` Move the intent normalizer and capture workbench planning documents into `Backlog/Benchmarks/`, then update live Backlog and Docs_Index references (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Backlog/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: move benchmark-related backlog docs`).
2. [DONE] `backlog-benchmark-docs.phase1.move.commit1` Git Commit: `docs: move benchmark-related backlog docs` (hash: self)

### Stream: Verification and closeout

3. [IN_PROGRESS] `backlog-benchmark-docs.phase1.closeout.task1` Validate the plan, verify moved paths, and write the closeout archive (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/todo-plan-closeout-backlog-benchmark-docs-folder-2026-06-24.md`; expected commit: `docs: close benchmark-related backlog grouping`).
4. [TODO] `backlog-benchmark-docs.phase1.closeout.commit1` Git Commit: `docs: close benchmark-related backlog grouping` (hash: TBD)
5. [TODO] `backlog-benchmark-docs.phase1.post-closeout-handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
