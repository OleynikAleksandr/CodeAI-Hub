# План разработки (Development TODO Plan)

## Closeout Snapshot Note

- Snapshot type: accepted mixed Plan Orchestrator workflow closeout.
- User acceptance commit: `be4c67664 docs: record mixed orchestrator workflow acceptance`.
- Closeout disposition: this tracked archive preserves the ignored active plan state before the closeout commit finalizes `phase6.stream1.task1`.
- Planning source archived at `doc/SolidWorks-WorkFlow/Plans/Archive/Plan_Orchestrator_Architecture.md`.

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "mixed-orchestrator-test-2026-05-04",
  "branch": "main",
  "baseHead": "03ddd1984",
  "lastRecordedCommit": "be4c67664",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Plan_Orchestrator_Architecture.md",
  "currentTaskId": "phase6.stream1.task1",
  "expectedCommitMessage": "docs: close mixed orchestrator test plan",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Execution Scope Status:** ACTIVE
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Plan_Orchestrator_Architecture.md`
- **Branch:** `main`
- **Target outcome:** тестовая next-session проверка Plan Orchestrator на смешанном workflow: часть задач закрывается через `plan:complete` без Git commit, часть задач закрывается через `plan:commit` с hash/debt/post-commit автоматикой.
- **Out of scope:** product runtime, VSIX/release build, provider modules, Project Manager UI, любые изменения вне тестовых docs и `scripts/plan-orchestrator/`.
- **Read this context before implementation:**
  - `AGENTS.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Plan_Orchestrator_Architecture.md`
  - `.husky/pre-commit`
  - `.husky/commit-msg`
  - `.husky/post-commit`
  - `scripts/plan-orchestrator/`
  - `package.json`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Recovery Pack

- **Current phase/stream/task:** Phase 1 / Stream 1 / Task 1.
- **Next action:** в следующей сессии стартовать только из этого файла, не читать legacy session-report archive (removed), выполнить Phase 1 no-commit checks через `npm run plan:complete`, затем перейти к commit tasks.
- **Last completed commit in previous cycle:** `03ddd1984 docs: add development tree skeleton planning draft`
- **Important constraint:** active `todo-plan.md` is ignored local machine-managed state; tracked history появляется только через отдельные test docs и их commits.

## Правила выполнения (Execution Rules)

- Active `doc/TODO/todo-plan.md` is ignored local machine-managed state.
- Use `npm run plan:status`, `npm run plan:validate`, `npm run plan:complete -- "<result>"`, `npm run plan:commit -- "<expected commit message>"`, and `npm run plan:repair`.
- Do not use `git commit --no-verify`.
- Do not read legacy session-report archive (removed) for recovery.
- If `.git/codeai-plan-debt` exists, run `npm run plan:repair` before continuing.
- Each implementation task touches no more than 3 files.
- For no-commit/user-check tasks, close the current task with `npm run plan:complete -- "<short result>"`.
- For commit tasks, make only the scoped file changes, stage them, then run `npm run plan:commit -- "<expected commit message>"`.

---

## Phase 1 — No-Commit Recovery Checks (owner: Codex, updated: 2026-05-04)

### Stream 1 — Session Recovery Without Git Commit

1. [DONE] `phase1.stream1.task1` Start the next Codex session from `doc/TODO/todo-plan.md` only; confirm `Execution Scope Status: ACTIVE`, current task, and no legacy session-report archive (removed) recovery (scope: commands + chat observation only; expected commit: not required). Result: Recovered from active todo-plan only; legacy session-report archive (removed) recovery was not used; status and validate checks are green.
2. [DONE] `phase1.stream1.task2` Run `npm run plan:status` and `npm run plan:validate`; confirm `Expected Commit: none`, `Debt: none`, and validation OK (scope: commands only; expected commit: not required). Result: plan:status and plan:validate are OK; Expected Commit is none; Debt is none.
3. [DONE] `phase1.stream1.task3` Confirm `plan:complete` advanced task1 and task2 without creating Git commits or changing `lastRecordedCommit` (scope: commands only; expected commit: not required). Result: plan:complete advanced task1 and task2; HEAD and lastRecordedCommit stayed at 03ddd1984; no Git status output.

## Phase 2 — Commit Workflow Check A (owner: Codex, updated: 2026-05-04)

### Stream 1 — Recovery Evidence Commit

1. [DONE] `phase2.stream1.task1` Create or update `doc/TODO/OrchestratorTest/session-recovery-check.md` with Phase 1 observations and command summaries (scope: `doc/TODO/OrchestratorTest/session-recovery-check.md`; expected commit: `test: record orchestrator recovery check`).
2. [DONE] `phase2.stream1.commit1` Git Commit: `test: record orchestrator recovery check` (hash: 948da2db4)
3. [DONE] `phase2.stream1.task2` Run `npm run plan:status` after commit and confirm `lastRecordedCommit` equals the new hash, the current task advanced, and debt is none (scope: commands only; expected commit: not required). Result: After recovery-check commit, lastRecordedCommit equals HEAD 948da2db4; current task advanced to phase2.stream1.task2; debt is none; validation OK.

## Phase 3 — Mixed Commit And No-Commit Checks (owner: Codex, updated: 2026-05-04)

### Stream 1 — Commit Workflow Evidence

1. [DONE] `phase3.stream1.task1` Create or update `doc/TODO/OrchestratorTest/commit-workflow-check.md` with commit workflow observations: staged scoped change, `plan:commit`, post-commit hash update, and debt state (scope: `doc/TODO/OrchestratorTest/commit-workflow-check.md`; expected commit: `test: record orchestrator commit workflow check`).
2. [DONE] `phase3.stream1.commit1` Git Commit: `test: record orchestrator commit workflow check` (hash: d455bd560)
3. [DONE] `phase3.stream1.task2` Run `npm run plan:validate` after the second commit and confirm mixed workflow state remains valid (scope: commands only; expected commit: not required). Result: After second plan:commit, plan:validate is OK; lastRecordedCommit equals HEAD d455bd560; debt is none; mixed workflow state remains valid.
4. [DONE] `phase3.stream1.task3` Report in chat whether the mixed no-commit/commit workflow is acceptable or whether a new bugfix stream is needed (scope: chat/process observation only; expected commit: not required). Result: Reported that the mixed no-commit/commit workflow is acceptable after the OrchestratorTest ignore-rule fix; no new bugfix stream is needed now.

## Phase 4 — Tooling Verification (owner: Codex, updated: 2026-05-04)

### Stream 1 — Orchestrator Tooling Verification

1. [DONE] `phase4.stream1.task1` Run `node --test scripts/plan-orchestrator/*.test.mjs`, `npm run plan:status`, and `npm run plan:validate`; record the verification result via `plan:complete` (scope: commands only; expected commit: not required). Result: Tooling verification passed: node --test scripts/plan-orchestrator/*.test.mjs returned 27/27 passing; plan:status OK; plan:validate OK; debt is none.

## Phase 5 — User Workflow Acceptance Testing (owner: Codex + Oleksandr, updated: 2026-05-04)

### Stream 1 — Mixed Workflow Acceptance

1. [DONE] `phase5.stream1.task1` User reviews next-session mixed workflow output and gives explicit acceptance or failed-retest feedback; record the result in `doc/TODO/OrchestratorTest/mixed-workflow-acceptance.md` (scope: `doc/TODO/OrchestratorTest/mixed-workflow-acceptance.md`; expected commit: `docs: record mixed orchestrator workflow acceptance`).
2. [DONE] `phase5.stream1.commit1` Git Commit: `docs: record mixed orchestrator workflow acceptance` (hash: be4c67664)

## Phase 6 — Scope Closeout (owner: Codex + Oleksandr, updated: 2026-05-04)

### Stream 1 — Test Plan Closeout

1. [IN_PROGRESS] `phase6.stream1.task1` After explicit acceptance, archive or replace this test plan and update related docs only if needed (scope: `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/Plan_Orchestrator_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close mixed orchestrator test plan`).
2. [TODO] `phase6.stream1.commit1` Git Commit: `docs: close mixed orchestrator test plan` (hash: TBD)
3. [TODO] `phase6.stream1.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another test cycle (scope: chat/process observation only; expected commit: not required).
