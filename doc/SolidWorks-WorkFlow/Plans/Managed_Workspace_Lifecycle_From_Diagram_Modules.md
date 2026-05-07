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
5. freezes `Description` and `Virtual Simulation`;
6. injects a short workflow discipline block into the first prompt.

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
