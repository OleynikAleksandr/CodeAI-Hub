# Managed Workspace Lifecycle From Diagram Modules

**Status:** In implementation.
**Created:** 2026-05-07
**Owner:** Oleksandr + Codex
**Scope:** turn the workspace into a Core-managed Git/plan/hook lifecycle as soon as `Diagram Modules` starts; make downstream filesystem stages recoverable, revision-aware, and script-governed instead of agent-memory-governed.

## 1. Problem

The current trunk becomes filesystem-heavy too late for the existing continuity model:

- `Diagram Modules` can be a long user-review session, but it is also the first stage where stable architecture graph decisions appear.
- `Application Skeleton` and `Quality Gates Baseline` work with real files, but the project lifecycle baseline (`git`, `todo-plan.md`, hooks, plan scripts) does not exist yet in generated workspaces.
- Provider native compaction can help as a fallback, but it is not a product-owned recovery mechanism.
- If the user later returns to `Diagram Modules` and changes modules/clusters, downstream skeleton/gates/development work needs a controlled revision diff and migration plan.

The main risk is giving agents responsibility for process discipline. Agents should make engineering decisions. Core should own the strict, scriptable lifecycle.

## 2. Core Decision

When the user starts `Diagram Modules`, Core must put the workspace into **managed mode** before the agent receives the first turn.

Managed mode creates one Git-controlled workspace lifecycle, not separate workflow/project repositories:

```text
<user-workspace>/
  .git/
  .husky/
  scripts/plan-orchestrator/
  doc/TODO/todo-plan.md
  .codeai-hub/
    workflow/        tracked control plane
    runtime/         ignored machine runtime
    logs/            ignored diagnostics
    cache/           ignored cache
  <application files appear later>
```

This avoids a dual-repo design and keeps every user-visible workflow revision, skeleton change, quality gate integration, and future refactor under one commit history.

## 3. Ownership Boundaries

Core owns:

- managed workspace bootstrap;
- `git init` when missing;
- Plan Orchestrator scripts and minimal package scripts or stack-neutral command shims;
- hooks installation;
- `.codeai-hub/workflow` tracked control plane;
- ignored runtime/cache/log folders;
- lifecycle validation, repair, drift detection, and deterministic hook regeneration;
- stage transition gates;
- upstream freeze after `Diagram Modules` starts;
- revision diff classification and downstream migration task generation.

Agents own:

- semantic architecture decisions inside their stage;
- draft/update of stage artifacts;
- implementation of requested product/code changes;
- Quality Gates gate selection and gate script content, but not lifecycle hook ownership.

Quality Gates agent may propose and create gate scripts/manifests. Core validates the manifest and regenerates hook wiring deterministically.

## 4. Stage Lifecycle

### 4.1 Description and Virtual Simulation

These remain pre-managed document stages.

After `Diagram Modules` starts, both become read-only baselines:

- sessions and artifacts remain viewable;
- user cannot send new messages into those agents;
- no direct upstream mutation is allowed.

If the user wants a product-level change after this point, it becomes an **Upstream Change Request** routed through `Diagram Modules`, producing a new diagram revision. Hard reset/new workflow remains an explicit separate action.

### 4.2 Diagram Modules

`Diagram Modules` is the managed-mode entrypoint.

Before starting the agent, Core:

1. initializes managed workspace lifecycle;
2. creates baseline `doc/TODO/todo-plan.md`;
3. installs minimal hooks;
4. creates `.codeai-hub/workflow` tracked structure;
5. creates the initial adoption commit for Core-owned lifecycle files and accepted upstream evidence;
6. freezes `Description` and `Virtual Simulation`;
7. injects a short workflow discipline block into the first prompt.

The adoption commit is Core-owned and happens before the agent sees the first
turn. This keeps `Diagram Modules` as the first editable managed stage while
giving that agent a clean Git status and a real commit history. Later
`Application Skeleton` and `Quality Gates` sessions may reconcile the baseline,
but they must not inherit uncommitted Description, Virtual Simulation, or
lifecycle setup files as work they supposedly created.

The first prompt should not teach a large process manual. It should say: read `doc/TODO/todo-plan.md`, keep changes scoped to the current task, update workflow artifacts, and use the managed commit flow.

### 4.3 Application Skeleton

`Application Skeleton` receives an already managed workspace.
Core must still run managed workspace preflight/reconciliation before starting the provider session, because the `Diagram Modules` session may have been created by an older release, the baseline may have drifted, or the user may have repaired/changed files between stages.

It does not create git, hooks, or plan scripts. It only:

- updates/extends the current plan when the user asks for skeleton changes;
- writes `application-skeleton-map.json` and human-readable rationale;
- materializes the accepted project skeleton under the same Git repo;
- commits through the plan workflow.

### 4.4 Quality Gates Baseline

`Quality Gates` receives the same managed workspace.
Core must also run managed workspace preflight/reconciliation before starting this provider session so Quality Gates never starts from a missing or broken Git/hooks/plan baseline.

It should:

- select stack-specific gates;
- create gate scripts/configs/manifests;
- report active vs advisory vs planned gates;
- leave hook ownership to Core.

Core then validates the gate manifest and regenerates hooks from a Hook Registry. This prevents agents from hand-editing lifecycle wiring unpredictably.

The open follow-up from the previous Quality Gates scope is carried here: `plannedRequiredAfterIntegration` must not duplicate ids already listed in `requiredBefore*`.

### 4.5 Development Tree

Development Tree sessions start only after:

- accepted Diagram revision exists;
- accepted Application Skeleton revision exists;
- integrated Quality Gates manifest exists;
- managed workspace lifecycle validates cleanly.

Development agents receive warnings and blockers from Core validators, not from memory-heavy prompt discipline alone.

## 5. Revision Model

The workflow must become revision-based:

```text
diagramRevision N
  -> skeletonRevision N
  -> qualityGatesRevision N
  -> developmentTreeRevision N
```

When the user revises `Diagram Modules`, Core stores a new revision and computes a graph diff.

Diff classes:

- `added`: create downstream skeleton/gates/development tasks for new ids;
- `changed`: create refactor tasks for affected contracts, paths, gates, and drafts;
- `removed`: create removal/deprecation tasks and orphan checks;
- `renamed/moved`: use stable id mapping; do not treat as delete+add when identity is preserved.

This requires stable ids in Diagram Modules artifacts for Product Part, Cluster, Module, and Facade boundaries. Display names and paths may change; ids must persist.

## 6. Tracked `.codeai-hub/workflow`

Tracked control plane:

```text
.codeai-hub/workflow/
  README.md
  index.json
  revisions/
    diagram-modules/
    application-skeleton/
    quality-gates/
  artifacts/
  checks/
  migrations/
```

Ignored machine state:

```text
.codeai-hub/runtime/
.codeai-hub/logs/
.codeai-hub/cache/
```

Rules:

- tracked workflow files must have schemas/versions where possible;
- large generated artifacts should be chunked and indexed;
- 500-line architecture discipline should apply to human-authored workflow docs and scripts; machine JSON artifacts may be chunked instead of manually refactored.

## 7. Hooks and Gates

Initial hooks at `Diagram Modules` start must be minimal:

- `commit-msg`: expected commit message from `todo-plan.md`;
- `pre-commit`: plan validation + workflow artifact schema validation;
- `post-commit`: advance plan state;
- `post-checkout`: advisory/debt check;
- `pre-push`: block push on broken/debt state.

Quality gates are layered later through a Core-owned Hook Registry:

```text
quality-gates manifest -> Core validation -> generated hook sections
```

Agents must not be the owner of hook structure.

## 8. Rollover and Recovery

Native provider auto-compact remains a fallback only.

Primary recovery after `Diagram Modules` starts:

1. new session reads `doc/TODO/todo-plan.md`;
2. runs `plan:status`;
3. reads current Context Pack only;
4. continues current task.

Core should lower rollover thresholds for managed filesystem stages and must not start long filesystem/research turns when lifecycle state is missing or blocked.

## 9. Reconciler

Core needs a Project Lifecycle Reconciler.

It may auto-fix deterministic, Core-owned drift:

- missing hooks;
- missing plan scripts;
- missing `.codeai-hub/workflow` directories;
- missing ignored runtime/cache/log entries;
- missing package scripts or stack-neutral lifecycle shims;
- hook registry output out of date.

It must block or create plan tasks for semantic drift:

- new source root;
- package manager change;
- new application subproject;
- removed/renamed module path;
- gate policy change that cannot be inferred safely.

## 10. Validation and Test Checklist

Short user-facing retest list after release:

1. Start a fresh workspace and run `Description` + `Virtual Simulation`.
2. Start `Diagram Modules`; verify Core initializes Git, hooks, `doc/TODO/todo-plan.md`, and `.codeai-hub/workflow` before agent work.
3. Try sending messages to `Description` / `Virtual Simulation` after `Diagram Modules` starts; they must be read-only.
4. In `Diagram Modules`, ask for a module/cluster change; verify plan stream is updated and commit workflow is enforced.
5. Start `Application Skeleton`; verify it receives existing managed lifecycle and does not create process infrastructure itself.
6. Start `Quality Gates`; verify it creates gate manifest/scripts and Core-owned hook registry wires gates.
7. Return to `Diagram Modules`, add/remove/rename a module; verify revision diff and downstream migration tasks.
8. Force or simulate session rollover after `Diagram Modules`; verify recovery starts from `todo-plan.md`, not legacy reports.

Live retest note for `v1.2.173`: step 3 exposed a Project Manager defect. After `Diagram Modules` starts, `Description` renders hardcoded English read-only copy and `Virtual Simulation` can still show an editable session. The follow-up fix stream must localize the read-only placeholder and apply it consistently to both upstream stages.

Live retest note for `v1.2.182`: managed workspace ledger commits are created, and `Application Skeleton` can materialize a workspace skeleton, but two downstream blockers remain before `Quality Gates Baseline` can be reliable:

- Core does not fully own stage handoff. The next stage can inherit stale active-plan metadata, and agents may try to repair Core-owned `workspace.plan.md` / workflow control files manually.
- `Quality Gates Baseline` can remain blocked even when `.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton-map.json` exists. The observed case was a contract mismatch: the Application Skeleton artifact used canonical `id` fields, while Core validation required `partId`, `clusterId`, and `moduleId`, and the UI collapsed the validation failure into a misleading `application-skeleton-map.json not found` message.
- Managed child plans still lose semantic traceability: repeated Diagram Modules commits can be recorded with generic task text, and the child plan commit line can keep `hash: included-in-commit` instead of the real artifact commit hash. `workspace.plan.md` must remain the Core ledger, but the active child plan also needs enough semantic and hash data for direct recovery inside a stage.

Implementation note: commit `155c6d5ca` intentionally handled the semantic stage ledger as one generated-shim contract. The same generated `plan-cli.mjs` change backfills the real artifact commit hash, derives semantic summaries from staged files, and stores `changedFiles` / `summary` in `workspace.plan.md`.

Workspace ledger entries now carry enough detail for Core-owned recovery: artifact commit hash, full hash, stage, child plan path, task id, commit message, semantic summary, and changed files. This keeps `workspace.plan.md` as the master ledger while preserving readable child plans for stage-local continuation.

Live retest note for `v1.2.174`: upstream read-only behavior is confirmed, including `Virtual Simulation`. Application Skeleton activation still does not create or reconcile the managed Git baseline in the user workspace. Root cause to verify in the fix stream: Project Manager starts workflow stages through the generic `session:create` route, while the `v1.2.174` bootstrap fix covered only the `createSessionForWorkflow` gateway path.

Live retest note for `v1.2.175`: Application Skeleton activation now creates the managed workspace baseline in the correct workspace root, including `.git`, hooks, package scripts, `doc/TODO/todo-plan.md`, and `.codeai-hub/workflow`. Follow-up defect: the installed `scripts/plan-orchestrator/plan-cli.mjs` shim fails on `npm run plan:status` because its state parser does not strip the fenced JSON block when the block starts with a leading newline. This means hooks would fail even though the filesystem baseline exists.

Local smoke note for `v1.2.176`: release build completed with VSIX `codeai-hub-1.2.176.vsix`, runtime tarballs copied to `doc/tmp/releases/`, and VSIX `extension/package.json` reports version `1.2.176`. The targeted fixes cover fenced plan-state parsing, stage-aware managed plan seeding for `Application Skeleton` / `Quality Gates`, and Application Skeleton prompt/contract requirements for Git-tracked placeholders plus `npm run plan:commit -- "feat: materialize application skeleton"` before the final materialization response. User retest should verify Application Skeleton now commits materialized files and Quality Gates unlocks from a clean managed workspace.

Local smoke note for `v1.2.177`: release build completed with VSIX `codeai-hub-1.2.177.vsix`, runtime tarballs copied to `doc/tmp/releases/`, and VSIX `extension/package.json` reports version `1.2.177`. A compiled-Core smoke workspace verified `git config --local core.hooksPath` returns `.husky`, `.gitignore` contains `.DS_Store`, and `npm run plan:status` still seeds Application Skeleton with `Expected Commit: feat: materialize application skeleton`. User retest should verify the same preflight facts in a fresh Project Manager workspace before accepting the Application Skeleton materialization contract.

Live retest note for `v1.2.177`: managed bootstrap at `Application Skeleton`
creates the expected files, but it is too late. Because `Diagram Modules` is the
first stage users can return to for architecture refactoring, Core must create
and commit the managed lifecycle baseline before the first `Diagram Modules`
agent turn. `Application Skeleton` must then receive a clean Git tree and commit
only its own draft/materialization artifacts.

Live retest note for `v1.2.178`: `Diagram Modules` now starts with the correct
Core-owned adoption commit and the agent commits `product-parts.index.md` through
the managed flow. Two follow-up defects remain. First, the generated
`plan-cli.mjs` shim validates `post-commit` but does not record the commit hash
or move the active task forward. Second, live runtime session state under
`.codeai-hub/<workspaceSlug>/continuity/` and
`.codeai-hub/<workspaceSlug>/workflow/state.json` remains tracked/dirty after
the turn. Those files are runtime state, not accepted workflow artifacts, and
must be ignored or snapshot-managed separately so the next stage does not inherit
uncommitted Core noise.

Local smoke note for `v1.2.179`: release build completed with VSIX
`codeai-hub-1.2.179.vsix`, and VSIX `extension/package.json` reports version
`1.2.179`. Targeted managed-lifecycle smoke passed for ignored runtime state,
Diagram Modules adoption commit, technical-stage managed preflight, and generated
`plan:commit` advancement that leaves a temporary workspace clean after commit.

Live retest note for `v1.2.179`: the same-workspace retest confirms the managed
Git tree stays clean after the Diagram Modules artifact commit, runtime
continuity/workflow state is ignored, hooks are executable, and
`doc/TODO/todo-plan.md` advances to the next Diagram Modules task. Follow-up
polish: commit ledger lines currently record `hash: included-in-commit` instead
of the actual short commit hash. This is not blocking for clean Git or recovery,
but it should be fixed so the managed ledger is audit-grade.

Design correction after the `v1.2.179` retest: a stage plan cannot reliably
record the actual hash of the same commit that contains that hash line, because
changing the line changes the commit hash. The durable solution is a Core-owned
workspace master ledger plus child plans:

- `doc/TODO/workspace.plan.md` is Core-owned and records active stage, child plan
  links, accepted commits, revision ids, blockers, and downstream invalidation.
- `doc/TODO/stages/<stage>/todo-plan.md` is the active plan for each workflow
  stage, such as Diagram Modules or Application Skeleton.
- later implementation plans mirror the materialized ownership tree under
  `doc/TODO/product-parts/<part>/.../todo-plan.md`.

Agents may read the workspace ledger but should only work inside the child plan
assigned by Core. Core remains the owner of cross-stage status and real commit
hash bookkeeping.

The same retest also exposed an unmanaged visual sidecar:
`.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json`. This file is
runtime-owned layout state, not an agent semantic artifact, so Core must prevent
it from leaving dirty Git state after graph regeneration.

Live retest note for `v1.2.180`: the managed TODO tree is created and the
Diagram Modules layout sidecar is correctly ignored, but Core still creates and
uses root `doc/TODO/todo-plan.md` as the active ledger. That contradicts the
corrected tree contract above: managed workflow agents must work from the
stage child plan under `doc/TODO/stages/<stage>/todo-plan.md`, while
`doc/TODO/workspace.plan.md` remains the Core-owned recovery ledger. Fresh
managed user workspaces must not create root `doc/TODO/todo-plan.md`.

Live retest note for `v1.2.181`: the root stage plan creation was removed from
the main generated plan tree and managed prompts, but the Core-owned workspace
ledger still behaves like a static bootstrap document. The generated
`plan-cli.mjs` advances only the active child plan and leaves
`doc/TODO/workspace.plan.md` without accepted commit history. The next hotfix
must make the workspace ledger record each managed stage commit and must remove
the remaining old root-plan assumptions from the session-create coverage.

## 11. Implementation Strategy

The refactor must be incremental:

1. First document contracts and stage ownership.
2. Add managed workspace bootstrap in Core behind a narrow stage gate.
3. Add minimal workflow validators before enabling hook registry.
4. Freeze upstream stages only after bootstrap is proven.
5. Add revision snapshots and diff planner.
6. Move Application Skeleton and Quality Gates prompts to the new lifecycle contract.
7. Add hook registry and Quality Gates manifest integration.
8. Release and test with real agent sessions.

Do not make Core a general-purpose file watcher that mutates arbitrary app files. Core should validate and reconcile known contracts only.

## 12. SSOT Sync

Phase 1 promotes this plan into the durable workflow/system SSOT:

- `WorkflowSteps_Overview.md` defines `Diagram Modules` as managed-mode entrypoint and freezes `Description` / `Virtual Simulation` after that boundary.
- `SystemArchitecture.md` separates repository-local CodeAI Hub hooks from managed user workspace lifecycle hooks and records `todo-plan.md` recovery as the primary managed-stage continuity path.
