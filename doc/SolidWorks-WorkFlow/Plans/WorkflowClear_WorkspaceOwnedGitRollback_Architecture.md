# Workflow Clear: Workspace-Owned Git Rollback Capsule

Status: Planning draft  
Created: 2026-05-25  
Updated: 2026-05-25
Owner: Core Orchestrator  
Reason: release `1.2.359` proved that the current hybrid Clear implementation is not a real Git rollback.

## 1. Problem

The accepted architecture was supposed to replace Clear/Undo with Git commits. The implementation drifted into a hybrid model:

- Git boundary commits restore part of the workspace.
- `runtime-slices` copy selected external session files into the workspace.
- `restoreWorkflowRuntimeSlices` manually copies them back into `~/.codeai-hub`.
- `cleanPaths` manually deletes selected workspace paths.
- Project Manager/workflow watchers then recreate projection files such as `workflow/state.json` and `description-step.json`.

This is not equivalent to `git reset --hard <hash> && git clean`. It creates two sources of rollback truth: Git history and Core-owned projection/restore code.

The new architecture must remove that split. If a file must roll back with a workflow step, it must be written under the Git-controlled workspace capsule before it is created or changed.

## 2. Core Decision

Each workspace owns a Git-controlled runtime capsule:

```text
<workspace>/
  .git/
  .codeai-hub/
    <workspaceSlug>/
      workflow/
      description/
      virtual_simulation/
      diagram_modules/
      application_skeleton/
      quality_gates/
      runtime/
        settings/
          settings.json
          effective-settings.snapshot.json
        sessions/
          unified/
        providers/
          codex/
            home/
          claude/
            home/
          gemini/
            home/
          kimi/
            home/
        project-manager/
        localization/
        logs/
          native-request-capture/
        tmp/
```

Only this workspace-owned capsule is rollback state. Core must route all workflow-specific mutable files there before a session starts.

Accepted refinement after architecture review:

- Every workspace gets its own provider home on workspace open.
- Every workspace gets its own `settings.json`.
- Global app settings become a seed/default, not live workflow truth.
- Shared provider binaries stay global; provider runtime state moves into the workspace.
- Deleting a workspace deletes its sessions, provider homes, settings, temporary files and rollback history together.

Clear becomes a Git transaction:

```text
pause workspace writers/watchers
git reset --hard <boundaryHash>
git clean -fd
rebuild in-memory read models from files
resume workspace writers/watchers
assert git status --porcelain is empty
```

No manual restore of external folders is allowed. `git clean` is allowed because it is part of standard Git rollback, not a parallel restore system.

## 3. Answer To External Folder Question

Git cannot cleanly track arbitrary files outside the repository as if they were inside it.

Options:

- Symlink: Git tracks the link, not the target contents. This does not solve rollback.
- Multiple repos: each external folder would need its own Git repo and synchronized commits. This recreates multi-source rollback.
- Submodules/worktrees: too heavy and still require orchestration across several repos.
- Copy snapshots: this is the current `runtime-slices` mistake.

The simpler and stronger solution is to move workspace-specific mutable state into the workspace-owned capsule. Global installed binaries, release caches, shared templates and app logs stay outside rollback.

## 4. External State Inventory

This inventory is based on the current `~/.codeai-hub` layout observed on 2026-05-25.

### Must Move Into Workspace Capsule

These are workflow-specific and must be controlled by the workspace Git repo:

| Current root | New workspace-owned root | Notes |
|---|---|---|
| `~/.codeai-hub/settings/settings.json` | `.codeai-hub/<slug>/runtime/settings/settings.json` | Workspace-owned settings are the source of truth for model choices, reasoning/thinking levels, localization policy, response policy, Project Manager preferences and future workspace-specific options. The global file is only a seed/default for new workspaces. |
| `~/.codeai-hub/sessions/<workspaceKey>/**` | `.codeai-hub/<slug>/runtime/sessions/unified/**` | Unified dialog/session history. |
| `~/.codeai-hub/providers/codex/home/**` | `.codeai-hub/<slug>/runtime/providers/codex/home/**` | Codex native sessions, shell snapshots, workspace-scoped memory and state indexes. Auth/secret files are ignored or provided by a global auth bridge. |
| `~/.codeai-hub/providers/claude/home/**` | `.codeai-hub/<slug>/runtime/providers/claude/home/**` | Claude project/session state tied to this workspace. Auth/secret files are ignored or provided by a global auth bridge. |
| `~/.codeai-hub/providers/kimi/home/**` | `.codeai-hub/<slug>/runtime/providers/kimi/home/**` | Workspace-specific Kimi managed-agent state and generated runtime profile files. |
| No current `~/.codeai-hub/providers/gemini/home`; current Gemini writes to `~/.gemini/**` | `.codeai-hub/<slug>/runtime/providers/gemini/home/.gemini/**` | Gemini needs a new per-workspace home. `~/.codeai-hub/providers/gemini/cli` stays global. Gemini settings, temp, history, chats, memory, commands, skills and policies must resolve under the workspace provider home for workflow sessions. |
| `~/.codeai-hub/logs/native-request-capture/**` | `.codeai-hub/<slug>/runtime/logs/native-request-capture/**` | Only if Capture Workbench artifacts influence workflow state or debugging artifacts shown to the user. General diagnostics stay global. |
| `~/.codeai-hub/data/project-manager/**` workflow-affecting Local Storage | `.codeai-hub/<slug>/runtime/project-manager/**` or workspace settings | Browser profile data must not be workflow truth. Any Project Manager setting that changes behavior must move into workspace settings/Core-owned state. |
| `~/.codeai-hub/localization/**` workspace-generated overlays | `.codeai-hub/<slug>/runtime/localization/**` | Global catalogs/cache can stay global; workspace effective localization state follows workspace settings. |
| `<workspace>/.codeai-hub/state/task-timers.json` | `.codeai-hub/<slug>/runtime/state/task-timers.json` or `.codeai-hub/<slug>/workflow/task-timers.json` | Existing non-slug workspace state should move under the capsule so all workspace runtime state has one root. |

Implementation foundation: Core owns the deterministic path contract in
`packages/core/src/workflow/runtime/workspace-runtime-capsule.ts`. All later
settings/session/provider-home migrations must use that resolver instead of
reconstructing `.codeai-hub/<slug>/runtime/**` paths locally.

### Must Stay Global And Outside Rollback

These are application installation/cache concerns, not workflow rollback state:

| Root | Reason |
|---|---|
| `~/.codeai-hub/core/**` | Installed Core runtime versions. |
| `~/.codeai-hub/providers/<provider>/<version>/**` | Installed provider module binaries. |
| `~/.codeai-hub/providers/gemini/cli/**` | Installed Gemini CLI bundle. Runtime home/session state must not be stored here. |
| `~/.codeai-hub/packages/**` | Installed UI/launcher packages. |
| `~/.codeai-hub/cef-launcher/**` and `~/.codeai-hub/cef/**` | Runtime binaries and browser framework. |
| `~/.codeai-hub/releases/**` | Release cache. |
| `~/.codeai-hub/templates/**` | Global template source installed by release. |
| `~/.codeai-hub/logs/core/**`, `logs/extension/**`, `logs/launcher/**` | Diagnostics only; logs should not affect rollback. |
| `~/.codeai-hub/localization/catalogs/**`, `localization/cache/**`, `localization/metadata.json` | Shared materialized catalogs/cache unless a generated bundle is explicitly workspace-scoped. |
| `~/.codeai-hub/state/runtime-registry.json` | Installed runtime registry. |
| `~/.codeai-hub/state/projects.json` | Global workspace list/last-active registry. It can point to workspaces, but it is not rollback state for any one workspace. |
| `~/.codeai-hub/ui/registry.json` | Installed UI bundle registry. |
| Chromium/CEF caches under `~/.codeai-hub/data/project-manager/**` | Browser implementation cache/profile. If a value affects workflow behavior, migrate it out of the browser profile into Core/workspace settings. |

## 5. Workspace Settings Ownership

`settings.json` is workspace-owned in the new architecture.

```text
<workspace>/.codeai-hub/<slug>/runtime/settings/settings.json
```

The old global settings file:

```text
~/.codeai-hub/settings/settings.json
```

becomes only a default seed for a new workspace. It must not be the live settings source for an already-opened workspace.

Workspace settings include:

- provider default model choices
- Codex reasoning effort by model
- Claude thinking settings
- Gemini thinking level by model
- Kimi default model
- provider selection preferences
- response policy
- localization categories and engines
- Project Manager UI/workflow preferences
- future workflow behavior flags that must not leak across workspaces

Settings have two classes:

- rollback-governed settings that affect workflow output and must be tracked by Git
- private per-workspace UI preferences that may survive Clear and should live in an ignored workspace-local preferences file

The default assumption is tracked workspace settings. A setting is ignored only when it is explicitly classified as private UI state and cannot change workflow outputs.

Workspace open behavior:

```text
openWorkspace:
  resolve workspace slug
  create workspace capsule root
  create capsule .gitignore before any provider files are written
  if runtime/settings/settings.json is missing:
    copy normalized global defaults into workspace settings
  load Project Manager/Core settings from workspace settings
  seed Description questionnaire baseline
  commit codeai-boundary: Description
```

Switching Project Manager to another workspace must reload settings from that workspace through Core. The settings UI writes to the active workspace settings file, not to the global file.

Core must not rely on one process-global settings path for workflow behavior. Any request/session that can be scoped to a workspace must resolve settings by workspace identity. Environment variables can seed the initial Core process, but they are not the authority after a workspace is active.

Global settings may still exist for:

- initial defaults for newly-created workspaces
- global update policy
- global language/bootstrap defaults before any workspace is selected
- migration from old installs

## 6. Required Runtime Routing

Provider adapters must receive a workspace-specific runtime home before creating a provider session:

```text
CODEAI_WORKSPACE_ROOT=<workspace>
CODEAI_WORKSPACE_SLUG=<slug>
CODEAI_WORKSPACE_HOME=<workspace>/.codeai-hub/<slug>/runtime
CODEAI_WORKSPACE_SETTINGS=<workspace>/.codeai-hub/<slug>/runtime/settings/settings.json
CODEAI_PROVIDER_HOME=<workspace>/.codeai-hub/<slug>/runtime/providers/<provider>/home
CODEAI_SESSION_HOME=<workspace>/.codeai-hub/<slug>/runtime/sessions
```

Provider-specific examples:

- Codex: set `CODEX_HOME` and any native session root to `.codeai-hub/<slug>/runtime/providers/codex/home`.
- Claude: set `CODEAI_CLAUDE_HOME`/provider `HOME` and project/session root to `.codeai-hub/<slug>/runtime/providers/claude/home`.
- Gemini: create `.codeai-hub/<slug>/runtime/providers/gemini/home` and make Gemini resolve `homedir()/.gemini` there for workflow sessions.
- Kimi: set managed-agent home to `.codeai-hub/<slug>/runtime/providers/kimi/home`.

If a provider cannot route its mutable session state into the capsule, it cannot participate in Git-backed workflow Clear.

Important process boundary: provider homes cannot be implemented by mutating `process.env.HOME` in a shared long-lived Core process when multiple workspaces/providers may be active. Providers that rely on `homedir()` must run in an isolated subprocess with the correct `HOME`, or the provider adapter must inject a home/storage resolver. Gemini is the current critical case because its storage uses `homedir()/.gemini`.

## 7. Auth And Secret Boundary

Workspace provider homes will contain rollback state, but they must not commit secrets.

Rules:

- Seed `.gitignore` before the first Description boundary commit.
- Ignore provider auth tokens, OAuth files, keychain caches, `.env` files, browser credential stores and other secret material under provider homes.
- Do not ignore broad provider directories such as `runtime/providers/codex/home/**`, because that would hide session state from Git rollback.
- Use provider-specific ignore rules and tests to prove that session files are tracked while secrets are not.
- Use a global auth vault/bridge to make providers usable across workspaces without forcing login for every workspace.
- `git clean -fd` is used for Clear; ignored auth files survive by design. Do not use `git clean -fdx` for workflow Clear.
- Use `.git/info/exclude` or a capsule-local `.gitignore` for OS metadata such as `.DS_Store`; do not let metadata files block clean-tree checks.

The auth bridge is outside rollback. It can copy, link, or mint ignored credentials into a workspace provider home at workspace open/session start. The copied ignored credentials must not become workflow truth.

## 8. Project Manager Data Ownership

Project Manager must be a projection over Core/workspace state, not an owner of workflow truth.

`~/.codeai-hub/data/project-manager/**` is currently a Chromium/CEF user data directory. It contains cache, cookies, local storage, browser databases and component caches. This should not be relied on for rollback.

Target behavior:

- Project Manager reads the active workspace settings from Core.
- Project Manager writes behavior-changing settings through Core into workspace `runtime/settings/settings.json`.
- On workspace switch, Project Manager reloads settings/model selections/localization from the new workspace.
- Browser-local UI cache can remain global or become per-workspace, but it must be disposable and rebuildable.
- If Capture Workbench or native request artifacts are workflow-relevant, they are written under `runtime/logs/native-request-capture`.

## 9. Boundary Contract

Every workflow stage has a boundary, including provider-direct stages.

```text
openWorkspace:
  seed Description questionnaire baseline
  git init if needed
  commit codeai-boundary: Description

startStep(stage):
  assert no active writer for workspace
  assert git status --porcelain is empty
  commit codeai-boundary: <Stage>
  start stage bootstrap
  dispatch provider

acceptStep(stage):
  commit codeai-step: <Stage> accepted
  assert git status --porcelain is empty

clearStep(stage):
  pause writers/watchers
  locate boundary hash from Git history
  git reset --hard <boundaryHash>
  git clean -fd
  rebuild read model from files
  resume writers/watchers
  assert git status --porcelain is empty
```

Boundary lookup must not depend only on a tracked `boundaries.json` file that can itself be pruned by reset. Git history is the source of truth. A tracked boundary ledger may exist as a projection, but it must be rebuildable from commit messages.

## 10. Description Baseline

Clear Description should return the workspace to a sendable Description questionnaire, not to a broken empty state.

Therefore the `codeai-boundary: Description` commit must include:

- `description/questionnaire.md`
- `runtime/settings/settings.json`
- capsule `.gitignore`
- any minimal Core-owned state needed to render that questionnaire
- no provider output and no user answer/result

After Clear Description, Core must not write untracked `description-step.json` or `workflow/state.json`. If those files are needed to render the UI, they belong in the Description boundary baseline and must be tracked.

## 11. Legacy Clear/Undo Code Removal Audit

This section is intentionally implementation-oriented. The next planning
document must be able to turn every line below into small tasks without
rediscovering the old rollback system.

### 11.1 Removal Principle

The current implementation is not one rollback system. It is a mixture of at
least four systems:

- Git boundary commits and `git reset --hard`.
- `runtime-slices`, which copy selected external files into the workspace and
  later copy them back into `~/.codeai-hub` / `~/.gemini`.
- path-scoped cleanup through `cleanPaths`, which manually deletes only the
  paths the current code remembered to list.
- Core/Project Manager projections that can rewrite files such as
  `workflow/state.json` and `description-step.json` after rollback.

The target implementation must remove the side channels. Clear is allowed to
use only these rollback primitives:

1. stop or quiesce active workspace writers;
2. `git reset --hard <boundaryHash>`;
3. full-worktree `git clean -fd` from the workspace root, with narrow
   `.gitignore` rules for secrets and caches;
4. rebuild in-memory/read-model projections from tracked workspace state;
5. assert `git status --porcelain` is empty.

There must be no manual copy-back, no manual prune, and no stage-specific delete
list pretending to complete Git rollback.

### 11.2 Delete Completely

These files and concepts should disappear from production code:

- `packages/core/src/workflow/boundary/workflow-runtime-slice-snapshot.ts`
- `packages/core/src/workflow/boundary/workflow-runtime-slice-snapshot.test.ts`
- `captureWorkflowRuntimeSlices`
- `restoreWorkflowRuntimeSlices`
- `WorkflowRuntimeSliceSession`
- `WorkflowRuntimeSliceManifest`
- `runtime-slices/manifest.json`

Reason: this module exists only because workflow sessions and provider-native
state currently live outside the workspace Git repository. After the runtime
capsule exists, those files are ordinary tracked or ignored workspace files.
Keeping `runtime-slices` would preserve the broken hybrid model and would make
future failures hard to reason about.

Concrete follow-up edits:

- Remove imports from
  `packages/core/src/workflow/boundary/workflow-boundary-facade.ts`.
- Remove imports and result fields from
  `packages/core/src/workflow/boundary/workflow-step-commit-facade.ts`.
- Replace test expectations in
  `packages/core/src/workflow/boundary/workflow-step-commit-facade.test.ts`,
  `packages/core/src/workflow/boundary/workflow-boundary-facade.test.ts`, and
  `packages/core/src/remote-bridge/handlers/session-request-handler-preliminary-routing.test.ts`.

Completion check:

```bash
rg "runtime-slices|WorkflowRuntimeSlice|captureWorkflowRuntimeSlices|restoreWorkflowRuntimeSlices" packages src
```

must return nothing except archived historical docs if those are intentionally
kept.

### 11.3 Rewrite, Do Not Preserve As-Is

`packages/core/src/workflow/boundary/workflow-boundary-facade.ts`

- Remove `cleanPaths` from `WorkflowBoundaryRestoreParams`.
- Remove `DEFAULT_CLEAN_PATHS`.
- Remove `restoreWorkflowRuntimeSlices`.
- Remove normal-flow dirty exceptions such as recoverable Description bootstrap
  state; those files must either be in the boundary commit or rebuilt in memory.
- Keep the high-level responsibility: create a step boundary and restore to a
  step boundary.
- Replace the current restore body with a coordinator call that performs:
  stop/quiesce, reset hard, full clean, projection rebuild, clean-tree assert.

`packages/core/src/workflow/boundary/workflow-boundary-git.ts`

- Keep low-level Git primitives if useful: init, status, stage, commit, reset,
  log lookup.
- Replace `cleanPaths(...)` with a full-worktree clean operation. It must not
  accept arbitrary stage cleanup lists.
- Keep macOS metadata handling only as preflight hygiene; it must not become a
  rollback side channel.
- Add or expose a boundary-commit lookup based on Git history, not
  `boundaries.json` as the primary authority.

`packages/core/src/workflow/boundary/workflow-boundary-registry.ts`

- Retire it as rollback authority.
- If the UI still needs a ledger, make it a rebuildable projection from Git log
  messages and tracked workflow state.
- Remove `codeai-boundary-registry` as a required commit in the Clear algorithm.

`packages/core/src/workflow/boundary/workflow-boundary-model.ts`

- Keep `codeai-boundary: <Stage>` and `codeai-clear: <Stage>` message builders.
- Remove or demote `codeai-boundary-registry: <Stage>` once the registry stops
  being authority.
- Add stable parse/build helpers for Git-log boundary lookup if they do not
  already exist.

`packages/core/src/workflow/boundary/workflow-step-commit-facade.ts`

- Remove `ensureLocalStateIgnored`; workflow state must not require editing the
  root `.gitignore` during step acceptance.
- Remove runtime-slice capture.
- Commit accepted workspace artifacts and tracked capsule state directly.
- Fail if accepted-step commit leaves a dirty tree.
- The result should report Git commit data and dirty-state diagnostics, not
  runtime-slice counts.

`packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts`

- Keep the endpoint and request/response contract shape for Project Manager.
- Replace `restoreBoundary + clearRuntimeSessions + resetWorkflowState` with a
  Core-owned `WorkflowClearCoordinator`.
- The coordinator may stop active sessions and pause watchers before Git reset,
  but it must not delete or restore session files manually.
- Downstream sessions disappear because they live in the workspace capsule and
  Git reset/clean removes them.

`packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`

- Move workspace runtime capsule bootstrap before the Description boundary.
- The Description boundary must include the sendable questionnaire, workspace
  settings seed, capsule `.gitignore`, and minimal tracked state needed by the
  UI.
- Do not recreate untracked `description-step.json` or `workflow/state.json`
  after Description Clear.

`packages/core/src/remote-bridge/handlers/workspace-session-service.ts`

- Ensure every stage boundary is created before stage bootstrap, scaffold
  install, provider session creation, or Project Manager session creation.
- Move `prepareWorkflowStageDirectories` responsibilities into the runtime
  capsule/boundary coordinator if directories are needed before rendering.

`packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts`
and related session preflight files

- Route workflow session creation through the boundary coordinator.
- No websocket `session:create` preflight may create scaffold, session files, or
  provider homes before the target stage boundary exists.
- Important related files include
  `session-request-handler-session-resolution.ts`,
  `session-request-handler-preliminary-review-committer.ts`, and
  `session-request-handler-managed-review-decisions.ts`.

`packages/core/src/remote-bridge/handlers/workflow-state-service.ts` and
projection helpers

- Identify every writer of `.codeai-hub/<slug>/workflow/state.json`,
  `.codeai-hub/<slug>/description/description-step.json`, progress files,
  indexes, and hydrated read models.
- Each file must be either tracked as part of the boundary/accepted-step history
  or rebuilt without dirtying Git after Clear.
- Tests that currently allow projection side effects after Clear must be
  rewritten to assert a clean tree.

### 11.4 Managed Workflow Git Boundary Consolidation

The managed workflow currently has a second Git abstraction that can diverge
from workflow boundary Git behavior:

- `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-managed-git-boundary.ts`
- `packages/core/src/managed-workflow-orchestration/diagram-modules/managed-workflow-ledger-git-boundary.ts`
- `packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts`

This must be consolidated into the same workspace Git timeline service used by
Description, Virtual Simulation and Clear.

Known consumers that need constructor/DI migration:

- `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.ts`
- `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-repair-controller.ts`
- `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.ts`
- `packages/core/src/managed-workflow-orchestration/managed-workflow-scaffold-installer.ts`
- `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.ts`
- `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts`

Migration rule: managed workflow commits may keep their managed commit messages
and output filtering, but the actual Git status/stage/commit/reset/clean
operations must come from one shared workspace Git service. There must not be a
separate Diagram Modules Git queue that can disagree with the Clear boundary
queue.

### 11.5 Keep, But Retarget

These are not old rollback mechanisms and should remain:

- `src/client/project-manager/services/workflow-step-clear-client.ts`
- `src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx`
- `src/client/project-manager/components/layout/workspace-tree-model.ts`
- `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`
- `packages/core/src/remote-bridge/handlers/http-api-router.ts`

The Project Manager button and popup menu are the user surface for Clear. They
should be retargeted to the new Core-owned Git rollback coordinator, not
removed. The UI should also make the destructive semantics explicit: untracked
non-ignored files created after the selected boundary can be removed by
`git clean -fd`.

Development-tree Clear may remain fail-closed until development-node rollback
has its own boundary design. Do not implement a second manual cleanup path for
development-tree nodes.

### 11.6 Tests To Remove Or Replace

Remove or rewrite tests that prove the old hybrid system:

- runtime-slice capture/restore tests;
- tests that expect `.codeai-hub/<slug>/runtime-slices/manifest.json`;
- tests that pass custom `cleanPaths` to Clear;
- tests that allow manual external session pruning as success criteria;
- tests that accept dirty projection files after Description Clear.

Replace them with tests that prove the new invariant:

- Description activation creates a Git repository and a sendable Description
  boundary with tracked questionnaire/settings/baseline state.
- Starting Virtual Simulation creates `codeai-boundary: Virtual Simulation`
  before any stage bootstrap/provider work.
- Starting Diagram Modules creates `codeai-boundary: Diagram Modules` before
  managed scaffold, session, provider home, or progress files appear.
- Accepted-step commit tracks all rollback-relevant capsule files and ends clean.
- Clear Diagram Modules performs reset plus full clean and removes Diagram
  Modules scaffold/session/provider state.
- Clear Virtual Simulation works even after Diagram Modules was cleared.
- Clear Description returns to a sendable questionnaire and clean tree.
- No workflow session file is created under global
  `~/.codeai-hub/sessions/**`, `~/.codeai-hub/providers/*/home/**`, or
  `~/.gemini/**`.

### 11.7 Suggested Microtask Slices For The Next TODO Plan

The next execution plan should keep each task within three files where possible:

1. Add `WorkspaceRuntimeCapsule` path resolver and capsule `.gitignore`
   contract.
   Scope candidates: new capsule module, capsule test, architecture doc.
2. Move per-workspace settings bootstrap to the capsule.
   Scope candidates: settings bootstrap service, workspace activation service,
   focused tests.
3. Delete `workflow-runtime-slice-snapshot.ts` and its test.
   Scope candidates: snapshot file, snapshot test, one compile-fix consumer.
4. Rewrite accepted-step commit to direct capsule commits.
   Scope candidates: `workflow-step-commit-facade.ts`,
   `workflow-step-commit-facade.test.ts`, boundary model if result types change.
5. Rewrite boundary restore to pure Git rollback.
   Scope candidates: `workflow-boundary-facade.ts`,
   `workflow-boundary-git.ts`, `workflow-boundary-facade.test.ts`.
6. Replace boundary registry authority with Git-log lookup/projection.
   Scope candidates: `workflow-boundary-registry.ts`,
   `workflow-boundary-model.ts`, boundary facade tests.
7. Rewrite Clear endpoint around `WorkflowClearCoordinator`.
   Scope candidates: `workflow-step-clear-service.ts`,
   `workflow-step-clear-service.test.ts`, session stop/pause helper if needed.
8. Move workspace activation to boundary-after-baseline order.
   Scope candidates: `workspace-activate-service.ts`,
   `workspace-activate-service.test.ts`, capsule bootstrap helper.
9. Move stage session creation to boundary-before-bootstrap order.
   Scope candidates: `workspace-session-service.ts`,
   `workspace-session-service.test.ts`, websocket workflow-session test.
10. Move unified session storage into the workspace capsule.
    Scope candidates: `packages/core/src/unified-session/storage.ts`, dialog
    history/list service tests, session-request handler integration test.
11. Move Codex workflow home into the workspace capsule.
    Scope candidates: provider registry/session resolver, Codex home resolver,
    provider home tests.
12. Move Claude workflow home into the workspace capsule while keeping auth
    bridge outside Git.
    Scope candidates: Claude provider home, auth home bridge tests, provider
    registry wiring.
13. Move Gemini workflow home into the workspace capsule.
    Scope candidates: Gemini CLI root resolver, module loader/home resolver,
    Gemini tests that currently point at `~/.gemini`.
14. Move Kimi managed-agent home into the workspace capsule.
    Scope candidates: Kimi managed profile, provider registry wiring, Kimi
    tests.
15. Consolidate managed Git helper into the shared workspace Git service.
    Scope candidates: `diagram-modules-managed-git-boundary.ts`,
    `managed-workflow-ledger-git-boundary.ts`, one controller test.
16. Migrate remaining managed workflow controllers from
    `DiagramModulesManagedGitBoundary` to shared Git timeline.
    Scope candidates: at most three controllers per task.
17. Retarget Project Manager Clear UI to new response/error semantics.
    Scope candidates: clear client, clear menu hook, clear menu tests.
18. Add end-to-end rollback regression.
    Scope candidates: one integration test file plus test fixtures/helpers.

### 11.8 Final Cleanup Gates

Before implementation is considered ready for release, these searches must be
clean or intentionally limited to archived docs:

```bash
node scripts/check-workflow-rollback-architecture.mjs
rg "runtime-slices|WorkflowRuntimeSlice|captureWorkflowRuntimeSlices|restoreWorkflowRuntimeSlices" packages src
rg "cleanPaths|DEFAULT_CLEAN_PATHS" packages/core/src
rg "codeai-boundary-registry" packages/core/src
rg "DiagramModulesManagedGitBoundary" packages/core/src
rg "homedir\\(\\).*\\.codeai-hub.*sessions|SESSION_ROOT = path.join\\(homedir\\(\\), \"\\.codeai-hub\", \"sessions\"" packages/core/src
```

The executable guard is wired through `scripts/check-architecture.sh`. It fails
on removed rollback mechanisms and keeps transitional exceptions explicit:
legacy Description continuity-root promotion and the remaining managed
controller `DiagramModulesManagedGitBoundary` construction points are allowlisted
until those adapters are fully collapsed into the shared Git boundary service.

Release acceptance for this redesign must include a real workspace workflow
test, not only unit tests: `Description -> Virtual Simulation -> Diagram
Modules -> Clear Diagram Modules -> Clear Virtual Simulation -> Clear
Description`, with clean Git after each boundary, accepted step and Clear.

## 12. Implementation Phases

1. Add a `WorkspaceRuntimeCapsule` module that resolves all workspace-owned runtime paths and owns capsule `.gitignore`.
2. Move workspace settings ownership into `runtime/settings/settings.json`; use global settings only as seed/default.
3. Route Project Manager behavior-changing state through Core/workspace settings; remove workflow truth from browser Local Storage.
4. Route unified sessions and dialog history readers/writers into `runtime/sessions/unified`.
5. Route Codex provider home/session roots into `runtime/providers/codex/home` with secret-safe ignore rules.
6. Route Claude provider home/session roots into `runtime/providers/claude/home` with secret-safe ignore rules.
7. Create and route Gemini provider home into `runtime/providers/gemini/home`; isolate subprocess/home resolver so Gemini does not write to `~/.gemini`.
8. Route Kimi managed-agent home into `runtime/providers/kimi/home`.
9. Route workspace capture artifacts and workspace localization overlays into `runtime/logs` and `runtime/localization` where they affect workflow behavior.
10. Replace separate provider-direct and managed stage start paths with one `WorkflowStepBoundaryCoordinator`.
11. Ensure every stage creates `codeai-boundary: <Stage>` before bootstrap/provider work.
12. Replace `runtime-slices` rollback with direct Git-tracked capsule commits.
13. Replace `boundaries.json` as lookup authority with Git-history lookup; keep it only as rebuildable UI projection.
14. Rewrite Clear to stop active workspace sessions, pause writers, run `git reset --hard`, run `git clean -fd`, rebuild projections from tracked files, and assert clean Git.
15. Add end-to-end tests for `Description -> Virtual Simulation -> Diagram Modules -> Clear Diagram Modules -> Clear Virtual Simulation -> Clear Description`.

## 13. Missing-Risk Checklist

These are the points most likely to break the solution if forgotten:

- **Process-global `HOME`:** Gemini and some provider SDK paths use `homedir()`. Per-workspace homes require subprocess isolation or injectable storage roots; mutating `process.env.HOME` in Core is not safe.
- **Secrets vs rollback state:** provider homes must be Git-controlled for sessions but must not commit auth. `.gitignore` must be narrow and tested.
- **SQLite/WAL files:** Codex native state currently includes sqlite and WAL files. Before accepted-step commits and Clear, provider writers must be quiesced or storage must be configured so tracked session state is stable.
- **Live session dirtiness:** active provider turns may dirty the tree. The invariant is: boundary starts on clean tree, accepted step ends with a commit, next step never starts dirty, Clear stops active writers first.
- **Project Manager Local Storage:** any setting or state that changes workflow behavior must not live only in Chromium profile data.
- **Global settings readers:** every code path reading `~/.codeai-hub/settings/settings.json` for workflow behavior must be changed to read the active workspace settings.
- **Process-global Core config:** a single Core process may serve more than one workspace over time. Workspace settings and provider homes must be resolved per workspace/session, not cached once from environment at Core startup.
- **Gemini global `.gemini`:** workflow Gemini sessions must not create `~/.gemini/tmp`, `~/.gemini/history`, `~/.gemini/settings.json` changes, or project registries outside the workspace provider home.
- **Boundary ordering:** Description boundary must be after baseline questionnaire/settings/gitignore seed, and every later stage boundary must be before stage bootstrap/scaffold/provider session creation.
- **Projection files:** `workflow/state.json`, `description-step.json`, indexes and read models must either be tracked baseline/accepted-step files or rebuildable in memory without dirtying Git after Clear.
- **Watchers after reset:** file watchers must pause around Clear and rebuild from disk after reset; they must not rewrite stale state into the restored tree.
- **Native session retention:** old native and unified sessions after a cleared boundary are not needed. They must disappear through Git reset/clean because they live in the capsule.
- **Workspace deletion:** deleting a workspace should remove provider homes, sessions, settings and rollback history. Only the global projects registry may need best-effort pruning of stale entries.
- **Large caches:** provider caches, model caches, browser caches and tmp folders must be ignored or global. Only files required for workflow recovery/rollback are tracked.
- **Manual untracked user files:** `git clean -fd` deletes untracked non-ignored files created after a boundary. The product must either commit accepted user/workflow files before Clear can target them, or show an explicit destructive-operation warning.
- **Settings rollback semantics:** model/workflow settings are part of the development timeline and roll back with Git. UI-only per-workspace preferences that should survive Clear need an explicit ignored storage location.
- **Template references:** global templates may seed prompts, but provider-visible prompts and workflow artifacts must contain the required inline contracts; rollback must not depend on reading mutable global templates.
- **macOS metadata:** `.DS_Store` and similar files must be ignored/cleaned before boundary checks so they cannot block a clean tree.

## 14. Acceptance Criteria

- `git log --oneline` contains a boundary commit for every workflow stage that has started.
- `git status --porcelain` is empty after each stage start, acceptance, and Clear.
- Clear Diagram Modules removes Diagram Modules artifacts, managed scaffold, and provider/unified sessions created after Diagram Modules boundary.
- Clear Virtual Simulation works because `codeai-boundary: Virtual Simulation` exists.
- Clear Description returns to a sendable questionnaire.
- No workflow rollback behavior depends on copying files from or to global `~/.codeai-hub` folders.
- No provider-native workflow session files are created outside `.codeai-hub/<slug>/runtime/providers/**` for a workspace-bound workflow session.
- No unified workflow session files are created under `~/.codeai-hub/sessions/**`.
- No Gemini workflow session writes to `~/.gemini/**`.
- Changing model/settings/localization in one workspace does not affect any other workspace.
- Project Manager shows settings for the active workspace and reloads them on workspace switch.
- Provider auth remains usable but is not committed into workspace Git.
- Clear uses `git reset --hard <boundaryHash>` and `git clean -fd` only; there is no manual restore/prune side channel for rollback.
