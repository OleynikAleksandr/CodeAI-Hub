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

Release note: the semantic-ledger hotfix is intentionally bundled into the next full managed-workspace release together with stage handoff and Application Skeleton completion fixes, because a release that only improves ledger readability would still leave `Quality Gates Baseline` blocked.

Stage handoff defect: Core must switch the managed workspace ledger to the requested filesystem stage before the first provider message. If `Application Skeleton` or `Quality Gates Baseline` starts while `workspace.plan.md.activeStage` still points at a previous stage, the agent receives an invalid recovery target and may try to edit Core-owned lifecycle files by hand. The fix belongs in Core preflight/reconciliation, not in agent prompt workarounds.

Release note: the stage-handoff hotfix is also bundled into the next full managed-workspace release after the Application Skeleton completion gate fix, because handoff alone does not unblock `Quality Gates Baseline` when skeleton materialization validation rejects an otherwise present map artifact.

Application Skeleton completion gate defect: live `v1.2.182` testing showed that `application-skeleton-map.json` can exist with `accepted: true`, `materialized: true`, and a real `product-parts/**` filesystem, while Core still blocks `Quality Gates Baseline`. The observed mismatch was identifier shape: the map used canonical `id` fields for Product Parts, Clusters, and Modules, while Core validation required duplicate `partId`, `clusterId`, and `moduleId` fields. The UI then reported the blocker as `application-skeleton-map.json not found`, which hides the real validation failure.

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

Release delivery note for `v1.2.183`: combined managed lifecycle hotfix release
is built as `codeai-hub-1.2.183.vsix`. The release includes Core-owned stage
handoff before Application Skeleton / Quality Gates, stage-correct child plan
prompts, semantic accepted-commit ledger entries, canonical Application Skeleton
`id` validation, and malformed workflow-state recovery coverage.

User retest checklist for `v1.2.183`:

- Fresh Diagram Modules start creates `.git`, hooks, `doc/TODO/workspace.plan.md`,
  and `doc/TODO/stages/diagram-modules/todo-plan.md`, without root
  `doc/TODO/todo-plan.md` in the managed user workspace.
- Diagram Modules materialization commits leave the workspace clean and record
  real commit hashes plus semantic summaries in `workspace.plan.md`.
- Application Skeleton launch switches `workspace.plan.md.activeStage` and
  `activePlanPath` before the agent prompt, so the agent sees the
  application-skeleton child plan from the first turn.
- Materialized Application Skeleton artifacts with canonical `id` fields unlock
  Quality Gates; validation failures must not be displayed as a missing
  `application-skeleton-map.json`.
- Quality Gates launch switches to the quality-gates child plan in the same
  session flow, without asking for a separate Development Tree session.

Live retest note for `v1.2.183`: the handoff and child-plan setup worked through
Quality Gates, but the Quality Gates agent finished Phase 2 without executing
`npm run plan:commit -- "feat: integrate quality gates baseline"`. The workspace
was left dirty with `package.json`, `package-lock.json`, `tools/gates/**`,
`.codeai-hub/<workspaceSlug>/quality_gates/**`, and a normalized upstream
`virtual_simulation/virtual-simulation.md`; the child plan stayed
`IN_PROGRESS` with `hash: TBD`, and `doc/TODO/workspace.plan.md` still recorded
Application Skeleton as the last accepted commit.

Core then unlocked Development Tree from the dirty `quality-gates.json` content
because `readDevelopmentTreeBootstrapGate` only required Application Skeleton
materialized plus `quality-gates.json.integrated === true`. This proves the
missing transaction gate: a downstream stage must not unlock from dirty artifact
state alone. It must require accepted managed lifecycle evidence for
`quality_gates`, including a recorded accepted commit in `workspace.plan.md`,
clean Git, and green artifact validation.

Release delivery note for `v1.2.184`: quality transaction hotfix release is
built as `codeai-hub-1.2.184.vsix`. The release tightens the Quality Gates
prompt so the agent must stage artifacts, run
`npm run plan:commit -- "feat: integrate quality gates baseline"`, verify
`npm run plan:status`, and keep Git clean before claiming integration. Core now
keeps Development Tree locked until Quality Gates has an accepted commit entry in
`doc/TODO/workspace.plan.md`, the quality-gates child plan has advanced beyond
the integration task, no child-plan debt exists, and `git status --short` is
clean.

User retest checklist for `v1.2.184`:

- Quality Gates must not finish with only dirty `quality-gates.json.integrated`
  state; the managed commit must be present first.
- `doc/TODO/stages/quality-gates/todo-plan.md` must advance past
  `quality-gates.stream1.task1`, with the commit lifecycle no longer left at
  `hash: TBD`.
- `doc/TODO/workspace.plan.md.acceptedCommits` must contain an entry with
  `stage: quality_gates`, `planPath:
  doc/TODO/stages/quality-gates/todo-plan.md`, and a non-empty commit hash.
- Development Tree sessions must not be created while Quality Gates artifacts
  are dirty, the child plan is still on task 1, or the workspace ledger has no
  accepted Quality Gates commit.
- After a valid Quality Gates managed commit, the workspace should be clean and
  Development Tree may unlock normally.

Live retest note for `v1.2.184`: Application Skeleton now receives the correct
managed child plan, but its draft/contract negotiation is still modeled as
uncommitted pre-materialization work. The agent can create draft contract files,
discuss them with the user for a long time, revise them, and only run the
managed commit after filesystem materialization. That is too late: the accepted
or revised draft contract is a real workflow artifact and must be recoverable
through the managed ledger before structure generation begins.

The fix should split Application Skeleton into two committed transactions. The
first transaction owns draft contract creation and every substantial contract
revision during user negotiation. The second transaction owns materialized
filesystem structure after the draft contract has an accepted commit, a clean
workspace, and an advanced child plan. This keeps rollover/recovery meaningful
during long contract discussions and prevents draft artifacts plus generated app
structure from collapsing into one oversized commit.

Follow-up retest note for `v1.2.184`: Quality Gates confirms the same
transaction problem. The generated quality-gates child plan has one oversized
task, so the accepted contract artifacts, `package.json`, `package-lock.json`,
and the whole `scripts/gates/*.mjs` baseline were committed together as
`feat: integrate quality gates baseline`. That transaction is recoverable, but
it does not preserve the user-approved gate contract as a separate checkpoint
before integration.

The same run exposed a second ownership defect. After the Quality Gates managed
commit, Core created `.codeai-hub/<workspaceSlug>/development_tree/...` draft
files while the Quality Gates agent was still trying to finish with clean Git.
Those files are downstream Development Tree ownership, not Quality Gates
ownership. The agent incorrectly reasoned about whether it should delete or
commit the generated tree, then reported clean Git even though the workspace
still had untracked Development Tree files. Core must either create those
downstream drafts in a separate Core-owned transaction, or keep them ignored /
uncreated until the Development Tree stage owns them.

Phase 21D is therefore generalized from an Application Skeleton-only prompt fix
to a filesystem-stage transaction fix:

- Application Skeleton: draft contract commits before materialization commits.
- Quality Gates: gate contract commits before package/script integration commits.
- Development Tree bootstrap: Core-owned downstream side effects must not dirty
  the finishing upstream stage or become a decision for the wrong agent.

Release delivery note for `v1.2.185`: filesystem-stage draft lifecycle hotfix
release is built as `codeai-hub-1.2.185.vsix`. The release splits generated
Application Skeleton and Quality Gates child plans into separate draft and
execution transactions, updates both bundled agent prompts to require a clean
managed draft commit before destructive filesystem work, gates Development Tree
unlock on accepted materialization/integration ledger evidence, and stops
workflow-state reads from creating untracked Development Tree draft files as a
side effect while Quality Gates is finishing.

User retest checklist for `v1.2.185`:

- Application Skeleton child plan must start with
  `docs: draft application skeleton contract`, and draft artifacts must be
  committed before user review/materialization.
- After the Application Skeleton draft commit, the child plan must advance to
  expected commit `feat: materialize application skeleton`.
- Quality Gates child plan must start with
  `docs: draft quality gates contract`, and gate contract artifacts must be
  committed before package/script integration.
- After the Quality Gates draft commit, the child plan must advance to expected
  commit `feat: integrate quality gates baseline`.
- Development Tree must stay locked without accepted ledger entries for both
  Application Skeleton materialization and Quality Gates integration.
- Workflow-state reads after Quality Gates must not create untracked
  `.codeai-hub/<workspaceSlug>/development_tree/` files while the Quality Gates
  agent is finalizing.

Live retest note for `v1.2.185`: Description startup can fail before the
managed lifecycle begins. Core logs show `codex app-server spawn error: spawn
codex ENOENT` while Codex provider auto-update is still running. The sequence is
`RemoteBridge started`, UI client connects, Codex auto-update starts, the Codex
app-server is spawned before the CLI update completes, then the update finishes.
The installed CLI is present afterward at `~/.npm-global/bin/codex`, so this is
not a missing permanent dependency; it is a startup race.

Core must not accept provider session creation until provider auto-update and
provider initialization have reached a deterministic ready state. The fix must
keep startup failures visible and recoverable, but it must prevent early
Description/Virtual Simulation traffic from starting Codex against a CLI that is
still being installed.

Release delivery note for `v1.2.186`: provider startup ready-gate hotfix release
is built as `codeai-hub-1.2.186.vsix`. Core now completes provider auto-update
and provider initialization before opening `RemoteBridge`, so Project Manager
cannot create Description/Virtual Simulation sessions against a provider that is
still installing or updating. The release preserves provider startup failure
visibility through the existing initialize/recovery path, but removes the early
UI traffic window that produced `spawn codex ENOENT` in `v1.2.185`.

User retest checklist for `v1.2.186`:

- After installing the VSIX, Project Manager should not allow Description
  session creation until Core startup/provider auto-update has completed.
- Core logs should show provider auto-update and provider initialization before
  `Remote bridge started`.
- Starting a fresh Description session with Codex should not emit
  `codex app-server spawn error: spawn codex ENOENT` while Codex auto-update is
  still running.
- The earlier managed-workspace checks from `v1.2.185` still apply unchanged:
  Application Skeleton draft commit, Quality Gates draft commit, transaction
  gated Development Tree unlock, and no read-only Development Tree side effects
  during Quality Gates finalization.

Clean rebuild delivery note for `v1.2.187`: the provider startup ready-gate
release was rebuilt from scratch with a new version after the user reported that
`v1.2.186` had been built while live testing was still running and runtime files
were overwritten mid-session. The rebuilt package is
`codeai-hub-1.2.187.vsix`, with fresh provider, Core, UI, and launcher tarballs
under `doc/tmp/releases/`.

Process rule added from this incident: after implementation and verification,
release packaging must wait for explicit user confirmation when the user is
still running live workflow tests. Fix streams can be prepared and committed,
but `build-all.sh` / `build-release.sh` must not run until the user confirms the
test window is clear.

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
