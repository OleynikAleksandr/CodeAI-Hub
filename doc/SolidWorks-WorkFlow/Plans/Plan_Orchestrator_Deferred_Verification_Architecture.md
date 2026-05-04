# Plan Orchestrator Deferred Verification — Architecture

**Status:** accepted draft for execution planning on 2026-05-04
**Owner:** Process automation / Git hooks / Codex execution lifecycle
**Scope:** verify and harden the deferred Plan Orchestrator capabilities that were explicitly left outside the accepted MVP: lifecycle closeout/replacement guard, pre-push plan guard, snapshot automation, generic closeout automation, and branch-switch advisory hooks.

## 1. Problem

The accepted MVP proved plan-first recovery, `plan:complete`, `plan:commit`, debt repair, and manual closeout. The following deferred safety nets remain unverified:

- lifecycle closeout boundary and replacement guard;
- generic `plan:closeout`;
- snapshot automation for ignored active plans;
- pre-push plan guard;
- branch-switch / rewrite advisory hooks.

These capabilities protect longer execution cycles from local-state loss, accidental pushes with inconsistent plan state, and branch/head drift.

## 2. Verification Strategy

Each deferred capability must be tested in isolation first, preferably through fixture repositories or command-level tests, and then dogfooded in this repository only when the local behavior is deterministic.

The execution plan must keep changes scoped to no more than three files per implementation task. Evidence files under `doc/TODO/OrchestratorTest/*.md` are tracked and explicitly unignored.

## 3. Capability Contracts

### 3.1 Lifecycle closeout/replacement guard

The orchestrator must not leave an accepted closed scope in `ACTIVE` state.

When a final closeout commit or no-commit completion reaches the end of a plan
or a reserved post-closeout handoff anchor, the updater must:

- mark the executed closeout item `DONE`;
- mark the reserved handoff item `DONE` when present;
- set `executionScopeStatus` to `NONE`;
- set `currentTaskId` to `null`;
- set `expectedCommitMessage` to `null`;
- keep `debt` cleared.

Agents must not create or replace a new `doc/TODO/todo-plan.md` while the
previous plan is still `ACTIVE`. A future `plan:closeout` / `plan:init` pair
should make this non-bypassable for ignored active plans.

Unfinished work must not be marked `DONE` just to close a scope. Until
additional terminal statuses are implemented, unfinished work must be left
`BLOCKED` with a reason or handled by a supported closeout command.

### 3.2 Pre-push plan guard

The guard should block push attempts when:

- `.git/codeai-plan-debt` exists;
- active plan validation fails;
- plan branch does not match the current Git branch.

It should allow push attempts when:

- plan status is `NONE`;
- active plan is valid, branch matches, and debt is none.

Existing `check:dup` and `check:links` must continue to run after the plan guard passes.

### 3.3 Snapshot automation

`plan:snapshot` should create tracked historical evidence without changing the active task pointer.

It must:

- refuse to run when plan validation fails;
- refuse to run when debt exists;
- write a non-ignored tracked snapshot path;
- include current task, `lastRecordedCommit`, recovery pack, and a short result note.

### 3.4 Generic closeout

`plan:closeout` should automate the manual closeout that was proven in the MVP test.

It must:

- require explicit user acceptance evidence;
- create or update a tracked archive snapshot;
- move or disposition the planning source;
- update docs index references when paths change;
- refuse to run with open debt or invalid plan;
- be idempotent enough to avoid duplicate closeout artifacts on retry.

### 3.5 Branch-switch advisory hooks

Branch hooks are advisory-first. They should not destructively mutate plan state unless a safe transition is provable.

They should detect:

- checkout to a branch that does not match active plan state;
- merge/rewrite scenarios where `lastRecordedCommit` is no longer reachable;
- stale active plan bindings after returning to a branch.

The initial implementation may write warnings or a blocked reason, but must provide clear recovery commands.

## 4. Acceptance Criteria

- All new command/hook behavior has focused tests.
- Fixture tests cover success and failure states for each deferred capability.
- Dogfood evidence is recorded in `doc/TODO/OrchestratorTest/`.
- `npm run plan:status` and `npm run plan:validate` remain green after each phase.
- The final scope is accepted by the user and archived through the closeout path selected by this cycle.
