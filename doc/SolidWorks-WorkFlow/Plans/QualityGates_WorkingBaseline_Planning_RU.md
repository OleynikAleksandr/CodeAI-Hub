# Quality Gates Working Baseline Planning

**Status:** Accepted deferred planning source for the later Quality Gates implementation scope
**Owner:** Oleksandr / Codex
**Created:** 2026-05-16
**Scope:** future modification of the `Quality Gates Baseline` managed agent and Core validation so the step researches, proposes, accepts, and integrates real working quality gates for the already materialized project foundation.

## 1. Problem Statement

The observed test workspace showed that `Quality Gates Baseline` can produce an impressive-looking contract while still leaving required gates abstract, planned, or vacuously passing. The generated baseline included scripts and hooks, but several gates were not actually enforceable:

- some commands were implemented as planned placeholders;
- `typecheck` passed because there were no TypeScript source files;
- `build-compile` passed because there was no compile target;
- the gate set primarily validated folder structure and placeholder documents;
- modern tooling choices were not researched or proposed to the user;
- Ultracite was not discovered or proposed even though it is relevant to a TypeScript/Node monorepo quality baseline.

This is not a sufficient endpoint for the Quality Gates step. After this step, implementation agents must be able to write code, commit it, and immediately receive real feedback from the selected gates.

## 2. Responsibility Boundary

`Quality Gates Baseline` starts after `Application Skeleton` has produced an installable project foundation. It should not compensate for a missing project environment by creating abstract gates around empty folders.

Its responsibilities are:

- inspect the materialized project foundation and selected stack;
- research current quality-gate tooling for that stack using internet access where allowed by the managed workflow;
- propose modern gate options with tradeoffs;
- ask the user any required selection or policy questions;
- materialize only accepted gates;
- ensure required gates are 100% executable in the current repository;
- wire accepted gates into commit/push/module-execution lifecycle;
- provide Core-readable evidence that the gates really ran.

It does not own the core project stack choices that should already be settled by `Application Skeleton`, except when a quality tool requires a policy decision that does not alter the foundation architecture.

## 3. Required First-Prompt Outcome

The Core-owned first prompt for `Quality Gates Baseline` must state the desired outcome briefly and explicitly. Suggested wording:

> Analyze the accepted Application Skeleton project foundation, research current quality-gate tooling for its languages, frameworks, package manager, and runtime model, then propose a concrete working quality baseline. Do not materialize anything while tooling choices, policies, or required setup details remain ambiguous. After user acceptance, integrate only executable gates: required gates must run successfully now, fail on real violations, and be wired into the managed commit/push/module-execution lifecycle with Core-validated evidence.

The first prompt must include the accepted Application Skeleton artifacts inline, including the project foundation decisions and materialized file/package map.

## 4. Research Requirement

The agent must perform an explicit current-tooling research pass before forming the proposal. For TypeScript/Node/Electron/VS Code Extension/npm monorepos, this research should include modern candidates such as:

- Ultracite / Biome-based quality presets;
- ESLint / Prettier alternatives when project needs exceed a preset;
- TypeScript compiler and project references;
- Vitest or Node test runner for unit/smoke tests;
- Playwright where UI/browser workflows are in scope;
- circular dependency and dependency graph tooling;
- unused code/dependency tools such as Knip-like checks where appropriate;
- secret scanning and dependency audit tools;
- package-manager reproducibility checks;
- CI integration options if the user wants remote enforcement.

The exact tool list must be based on current information, not stale model memory. When a specific tool has up-to-date installation or configuration requirements, the agent must verify them from primary or official sources where possible.

## 5. Proposal Before Materialization

Before any file changes, the agent must produce a user-facing proposal with:

- detected project foundation summary;
- candidate gate families;
- recommended baseline;
- minimal / recommended / strict variants where useful;
- exact commands that will become required;
- expected files to be created or modified;
- tradeoffs in speed, strictness, setup cost, and future maintenance;
- questions that must be answered before materialization.

The proposal must distinguish required, advisory, deferred, and rejected gates. A required gate cannot be a placeholder.

## 6. User Question Gate

The agent has no permission to materialize quality gates while any material decision is unresolved. It must ask the user until the path is single and unambiguous.

Examples of blocking questions:

- Should the project use Ultracite as the primary lint/format preset, or another toolchain?
- Should type-aware linting be enabled immediately, knowing it can be slower?
- Which test runner is accepted for the first implementation wave?
- Should Playwright be installed now or deferred until UI surfaces exist?
- Which hooks are mandatory: pre-commit, pre-push, commit-msg, CI, or module-execution only?
- Should format-fix run automatically in hooks, or should hooks only check?
- Which gates are allowed to be advisory because they are too slow or depend on future code?
- What is the required maximum local feedback time?

If documentation for a selected tool is incomplete or ambiguous, the agent must ask the user instead of guessing hidden policy.

## 7. Materialization Requirements

After user acceptance, `Quality Gates Baseline` must integrate real working gates. Required gates must be executable immediately in the current repository.

Expected materialization outputs include:

- root scripts for every required gate;
- tool config files for the accepted gate stack;
- package dependencies/devDependencies and lockfile updates;
- hook wiring for the accepted lifecycle points;
- module-execution gate wiring where implementation agents are blocked by the baseline;
- smoke tests or minimal test targets where test gates are required;
- typecheck/build commands that run against actual project config and source targets;
- documentation of accepted, advisory, deferred, and rejected gates;
- machine-readable quality-gates artifact that records commands, blocking phases, evidence, and unresolved items.

If a gate cannot be made executable yet, it must not be listed as required. It must be advisory/deferred with a reason and must not block Development Tree implementation.

## 8. What Must Not Happen

The agent must not:

- mark a planned gate as required;
- implement required gates as "planned gate is not enforced";
- let typecheck/build pass only because there are no source files or targets when the skeleton foundation requires them;
- create gates that validate only empty folders and placeholder documents;
- skip current-tooling research;
- ignore relevant modern tools such as Ultracite when the stack makes them plausible candidates;
- silently choose a quality toolchain without user acceptance;
- materialize while questions remain open;
- unlock implementation if required gate commands do not actually run.

## 9. Core Parser And Validator Requirements

Core must add canonical parsers/validators for the upgraded `Quality Gates Baseline` artifact contract. The parser must fail the step when the gate baseline is incomplete or only nominally integrated.

Required validation dimensions:

- quality-gates artifact schema validity;
- accepted gate variants and selected baseline are explicit;
- unresolved-question list is empty before materialization;
- every required gate has a concrete command;
- every required command exists in package scripts or an equivalent executable path;
- required commands have been executed and evidence is recorded;
- no required gate reports placeholder status such as planned, advisory, deferred, not integrated, or not enforced;
- hook/module-execution wiring matches the selected blocking phases;
- dependencies/config files needed by selected tools are present;
- lockfile reflects installed gate tooling;
- typecheck/build/test gates run against real targets where the selected foundation requires such targets;
- advisory/deferred gates are explicitly non-blocking and include reasons.

Core must not unlock Development Tree implementation just because `quality-gates.json` says `integrated: true`. It must unlock only after the canonical parser confirms that the selected required gates are materially installed, executable, and evidenced.

## 10. Expected Managed Lifecycle Change

The future managed lifecycle should split `Quality Gates Baseline` into at least these phases:

1. Inspect accepted Application Skeleton foundation.
2. Research current quality tooling for the exact stack.
3. Produce gate proposal and variants.
4. User review and question resolution.
5. Accepted materialization of selected gate baseline.
6. Core validation by canonical parser plus actual command evidence.
7. Commit boundary only after validation passes.
8. Unlock Development Tree implementation only when required gates are real and executable.

This makes Quality Gates the final enforcement boundary before code-writing agents begin implementation.

## 11. Acceptance Criteria For This Planning Direction

The direction is accepted when we agree that:

- `Quality Gates Baseline` must start from a real installable project foundation;
- it must research current tooling before proposal;
- it must propose options and obtain user acceptance before materialization;
- every required gate must be executable now, not planned;
- Core must validate command existence, execution evidence, and absence of placeholder required gates;
- future implementation work can use this document as the basis for a concrete active `todo-plan.md`.
