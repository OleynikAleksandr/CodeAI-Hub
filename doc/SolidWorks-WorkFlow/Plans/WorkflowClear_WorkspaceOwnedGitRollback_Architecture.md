# Workflow Clear: Workspace-Owned Git Rollback Capsule

Status: Planning draft  
Created: 2026-05-25  
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
        sessions/
        providers/
        project-manager/
        settings/
        localization/
      tmp/
      logs/
```

Only this workspace-owned capsule is rollback state. Core must route all workflow-specific mutable files there before a session starts.

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

### Must Move Into Workspace Capsule

These are workflow-specific and must be controlled by the workspace Git repo:

| Current root | New workspace-owned root | Notes |
|---|---|---|
| `~/.codeai-hub/sessions/<workspaceKey>/**` | `.codeai-hub/<slug>/runtime/sessions/unified/**` | Unified dialog/session history. |
| `~/.codeai-hub/providers/codex/home/sessions/**` | `.codeai-hub/<slug>/runtime/providers/codex/home/sessions/**` | Codex native sessions for this workspace. |
| `~/.codeai-hub/providers/codex/home/memories/**` | `.codeai-hub/<slug>/runtime/providers/codex/home/memories/**` | Only workspace-scoped memory; global memory remains global. |
| `~/.codeai-hub/providers/codex/home/shell_snapshots/**` | `.codeai-hub/<slug>/runtime/providers/codex/home/shell_snapshots/**` | If referenced by provider sessions. |
| `~/.codeai-hub/providers/codex/home/tmp/**` | `.codeai-hub/<slug>/runtime/providers/codex/home/tmp/**` or ignored capsule tmp | Include only if needed to resume/replay; otherwise ignore. |
| `~/.codeai-hub/providers/claude/home/.claude/projects/<workspaceKey>/**` | `.codeai-hub/<slug>/runtime/providers/claude/home/.claude/projects/<workspaceKey>/**` | Claude project/session state tied to this workspace. |
| `~/.codeai-hub/providers/claude/home/.claude/sessions/**` | `.codeai-hub/<slug>/runtime/providers/claude/home/.claude/sessions/**` | Workspace-specific Claude sessions. |
| `~/.codeai-hub/providers/kimi/home/**` | `.codeai-hub/<slug>/runtime/providers/kimi/home/**` | Workspace-specific Kimi managed-agent state. |
| `~/.codeai-hub/providers/gemini/**` and `~/.gemini/tmp/**` | `.codeai-hub/<slug>/runtime/providers/gemini/**` | Only Gemini session/chat state; installed CLI stays global. |
| `~/.codeai-hub/data/project-manager/<workspaceKey>/**` | `.codeai-hub/<slug>/runtime/project-manager/**` | Project Manager state that changes workflow behavior. |
| Workspace-specific settings overrides | `.codeai-hub/<slug>/runtime/settings/**` | Only settings that affect this workspace/session. |
| Workflow localization output for this workspace | `.codeai-hub/<slug>/runtime/localization/**` | Only generated workspace-specific localization overlays. |

### Must Stay Global And Outside Rollback

These are application installation/cache concerns, not workflow rollback state:

| Root | Reason |
|---|---|
| `~/.codeai-hub/core/**` | Installed Core runtime versions. |
| `~/.codeai-hub/providers/<provider>/<version>/**` | Installed provider module binaries. |
| `~/.codeai-hub/packages/**` | Installed UI/launcher packages. |
| `~/.codeai-hub/cef-launcher/**` and `~/.codeai-hub/cef/**` | Runtime binaries and browser framework. |
| `~/.codeai-hub/releases/**` | Release cache. |
| `~/.codeai-hub/templates/**` | Global template source installed by release. |
| `~/.codeai-hub/logs/**` | Diagnostics only; logs should not affect rollback. |
| `~/.codeai-hub/localization/cache/**` | Shared cache unless explicitly workspace-scoped. |
| Global app settings | User preference, not workflow product state. |

## 5. Required Runtime Routing

Provider adapters must receive a workspace-specific runtime home before creating a provider session:

```text
CODEAI_WORKSPACE_HOME=<workspace>/.codeai-hub/<slug>/runtime
CODEAI_PROVIDER_HOME=<workspace>/.codeai-hub/<slug>/runtime/providers/<provider>/home
CODEAI_SESSION_HOME=<workspace>/.codeai-hub/<slug>/runtime/sessions
```

Provider-specific examples:

- Codex: set Codex home/session root to `.codeai-hub/<slug>/runtime/providers/codex/home`.
- Claude: set Claude project/session root to `.codeai-hub/<slug>/runtime/providers/claude/home`.
- Gemini: set Gemini temp/session root to `.codeai-hub/<slug>/runtime/providers/gemini/home` where the CLI allows it; otherwise wrap/copy is not accepted as rollback truth and the provider is blocked for managed workflow until routable.
- Kimi: set managed-agent home to `.codeai-hub/<slug>/runtime/providers/kimi/home`.

If a provider cannot route its mutable session state into the capsule, it cannot participate in Git-backed workflow Clear.

## 6. Boundary Contract

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

## 7. Description Baseline

Clear Description should return the workspace to a sendable Description questionnaire, not to a broken empty state.

Therefore the `codeai-boundary: Description` commit must include:

- `description/questionnaire.md`
- any minimal Core-owned state needed to render that questionnaire
- no provider output and no user answer/result

After Clear Description, Core must not write untracked `description-step.json` or `workflow/state.json`. If those files are needed to render the UI, they belong in the Description boundary baseline and must be tracked.

## 8. What Must Be Removed

The implementation must remove or retire these hybrid rollback mechanisms:

- `workflow-runtime-slice-snapshot.ts`
- `captureWorkflowRuntimeSlices`
- `restoreWorkflowRuntimeSlices`
- runtime-slice restore tests as rollback authority
- manual external session pruning after Clear
- ad hoc recoverable dirty-tree exceptions for normal workflow state
- stage-specific Clear cleanup lists except as Git pathspecs for `git clean`

The only allowed rollback primitives are Git primitives plus temporary pausing/resuming of writers.

## 9. Implementation Phases

1. Add a `WorkspaceRuntimeCapsule` module that resolves all workspace-owned runtime paths.
2. Route Project Manager workspace state and unified sessions into the capsule.
3. Route Codex provider home/session roots into the capsule.
4. Route Claude, Gemini and Kimi mutable session homes into the capsule or mark provider workflow use blocked until routeable.
5. Replace separate provider-direct and managed stage start paths with one `WorkflowStepBoundaryCoordinator`.
6. Ensure every stage creates `codeai-boundary: <Stage>` before bootstrap/provider work.
7. Replace `runtime-slices` rollback with direct Git-tracked capsule commits.
8. Replace `boundaries.json` as lookup authority with Git-history lookup; keep it only as rebuildable UI projection.
9. Rewrite Clear to pause writers, run `git reset --hard`, run `git clean -fd`, rebuild projections from tracked files, and assert clean Git.
10. Add end-to-end tests for `Description -> Virtual Simulation -> Diagram Modules -> Clear Diagram Modules -> Clear Virtual Simulation -> Clear Description`.

## 10. Acceptance Criteria

- `git log --oneline` contains a boundary commit for every workflow stage that has started.
- `git status --porcelain` is empty after each stage start, acceptance, and Clear.
- Clear Diagram Modules removes Diagram Modules artifacts, managed scaffold, and provider/unified sessions created after Diagram Modules boundary.
- Clear Virtual Simulation works because `codeai-boundary: Virtual Simulation` exists.
- Clear Description returns to a sendable questionnaire.
- No workflow rollback behavior depends on copying files from or to global `~/.codeai-hub` folders.
- No provider-native workflow session files are created outside `.codeai-hub/<slug>/runtime/providers/**` for a workspace-bound workflow session.
