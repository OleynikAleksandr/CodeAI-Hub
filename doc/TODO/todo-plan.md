# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "benchmark-script-entrypoints-2026-06-24",
  "branch": "main",
  "baseHead": "b4674c9c1",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/",
  "currentTaskId": "benchmark-script-entrypoints.phase1.closeout.task1",
  "expectedCommitMessage": "docs: close benchmark script entrypoint cleanup",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Intent_Normalizer_Module_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Coding_Model_Benchmark_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Documentation_Planning_Model_Benchmark_RU.md`

## Правила выполнения (Execution Rules)

- Каждая задача затрагивает только документацию benchmark-сводок и active plan.
- Каждая задача закрывается отдельной строкой `Git Commit: ...`.
- Перед коммитом выполнить `npm run plan:validate`.

## Phase 1 — Benchmark Script Links (owner: Codex, updated: 2026-06-24)

### Stream: Script Entrypoints

1. [DONE] `benchmark-script-entrypoints.phase1.docs.task1` Add clear `Benchmark Script` sections near the top of the three benchmark documents with primary script paths and run commands (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Intent_Normalizer_Module_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Coding_Model_Benchmark_RU.md, doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Documentation_Planning_Model_Benchmark_RU.md`; expected commit: `docs: add benchmark script entrypoints`).
2. [DONE] Git Commit: `docs: add benchmark script entrypoints` (hash: self)
3. [DONE] `benchmark-script-entrypoints.phase1.prompt-link.task1` Rename the calibrated GLM/Kimi prompt label in the coding benchmark and link it to the exact prompt file (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Coding_Model_Benchmark_RU.md`; expected commit: `docs: clarify benchmark prompt source link`).
4. [DONE] Git Commit: `docs: clarify benchmark prompt source link` (hash: self)
5. [IN_PROGRESS] `benchmark-script-entrypoints.phase1.closeout.task1` Close this documentation cleanup scope after verifying the links are visible (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/todo-plan-closeout-benchmark-script-entrypoints-2026-06-24.md`; expected commit: `docs: close benchmark script entrypoint cleanup`).
6. [TODO] Git Commit: `docs: close benchmark script entrypoint cleanup` (hash: TBD)
7. [TODO] `benchmark-script-entrypoints.phase1.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: `doc/TODO/todo-plan.md`; expected commit: none).
