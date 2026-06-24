# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "benchmark-reference-bundles-folder-2026-06-24",
  "branch": "main",
  "baseHead": "1a754bc24",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Backlog/README.md",
  "currentTaskId": "benchmark-reference-bundles.phase1.closeout.task1",
  "expectedCommitMessage": "docs: close benchmark reference bundle grouping",
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
- Move benchmark/reference bundles under `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/`.
- Keep raw benchmark scripts/logs in `doc/tmp/prototypes/`.
- Run `npm run plan:validate` before each `npm run plan:commit -- "<Expected Commit>"`.

## Phase 1 - Benchmark Reference Bundle Grouping (owner: Codex, updated: 2026-06-24)

### Stream: Move reference bundles

1. [DONE] `benchmark-reference-bundles.phase1.move.task1` Move the instruction-stack experiment bundle and provider prompt/tool capture bundle into `Backlog/Benchmarks/`, then update live and archive references to the new paths (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Modules/Claude.md, doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md, doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Plans/Backlog/**, doc/SolidWorks-WorkFlow/ProviderPromptsAndTools/**, **Provider Home Base Instruction**`; expected commit: `docs: move benchmark reference bundles`).
2. [DONE] `benchmark-reference-bundles.phase1.move.commit1` Git Commit: `docs: move benchmark reference bundles` (hash: self)

### Stream: Verification and closeout

3. [IN_PROGRESS] `benchmark-reference-bundles.phase1.closeout.task1` Validate the plan, verify moved paths, and write the closeout archive (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/todo-plan-closeout-benchmark-reference-bundles-folder-2026-06-24.md`; expected commit: `docs: close benchmark reference bundle grouping`).
4. [TODO] `benchmark-reference-bundles.phase1.closeout.commit1` Git Commit: `docs: close benchmark reference bundle grouping` (hash: TBD)
5. [TODO] `benchmark-reference-bundles.phase1.post-closeout-handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
