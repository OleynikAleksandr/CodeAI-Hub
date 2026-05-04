# Plan Orchestrator Closeout Replacement — Architecture

**Status:** accepted follow-up for execution planning on 2026-05-04
**Owner:** Process automation / Plan Orchestrator closeout lifecycle
**Scope:** fix the closeout behavior so a completed execution scope does not leave the full finished plan as the active `doc/TODO/todo-plan.md`; the active path must become a short terminal `NONE` handoff template, and the complete finished plan must live in a tracked archive.

## 1. Problem

The deferred verification scope closed successfully at the machine-state level:

- `executionScopeStatus` became `NONE`;
- `currentTaskId` and `expectedCommitMessage` became `null`;
- debt was cleared;
- planning source moved to `Plans/Archive`;
- a closeout archive snapshot was created.

However, the active `doc/TODO/todo-plan.md` still contains the full completed plan. This is confusing because the active path looks like an active execution file even though its machine state says `NONE`.

The plan template also repeated `AGENTS.md` in `Read this context before implementation`. That is redundant because `AGENTS.md` is supplied as session instruction on every session start.

## 2. Target Behavior

When a plan is closed:

- the complete finished plan must be preserved in a tracked archive under `doc/TODO/Archive/`;
- `doc/TODO/todo-plan.md` must be replaced with a short terminal `NONE` template;
- the template must include enough information to show there is no active scope and where the latest archived closeout lives;
- the template must not list `AGENTS.md` in `Read this context before implementation`;
- `npm run plan:status` and `npm run plan:validate` must remain green after closeout;
- `plan:closeout` must be idempotent.

## 3. Implementation Strategy

Add a small closeout template generator inside the Plan Orchestrator closeout module.

`runPlanCloseout` should:

1. validate the active plan and acceptance evidence;
2. move/disposition the planning source;
3. create or update the tracked closeout archive with the full active plan copy;
4. update docs index references where applicable;
5. replace `doc/TODO/todo-plan.md` with the terminal `NONE` handoff template.

The existing post-commit closeout guard may still finalize commit hash and terminal state after `plan:commit`. The replacement template must be compatible with that finalization path.

## 4. Template Contract

The terminal active template should contain:

- `codeai-plan-state` with `executionScopeStatus: "NONE"`;
- `currentTaskId: null`;
- `expectedCommitMessage: null`;
- `debt: null`;
- latest `lastRecordedCommit`;
- archived planning source path;
- closeout archive path;
- instructions to start a new scope from `SystemArchitecture.md` and `Docs_Index.md`.

It must not contain:

- full completed phase/task history;
- stale `Execution Scope Status: ACTIVE` prose;
- `AGENTS.md` inside `Read this context before implementation`.

## 5. Acceptance Criteria

- Fixture tests prove `plan:closeout` replaces active `todo-plan.md` with the terminal template.
- Fixture tests prove the full completed plan remains in the tracked closeout archive.
- Fixture tests prove the terminal template does not contain `AGENTS.md` in the context pack.
- Dogfood evidence records the replacement behavior.
- Final `npm run plan:status` and `npm run plan:validate` are green.
