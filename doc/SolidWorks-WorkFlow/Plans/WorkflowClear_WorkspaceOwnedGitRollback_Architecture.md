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

## 11. What Must Be Removed

The implementation must remove or retire these hybrid rollback mechanisms:

- `workflow-runtime-slice-snapshot.ts`
- `captureWorkflowRuntimeSlices`
- `restoreWorkflowRuntimeSlices`
- runtime-slice restore tests as rollback authority
- manual external session pruning after Clear
- ad hoc recoverable dirty-tree exceptions for normal workflow state
- stage-specific Clear cleanup lists except as Git pathspecs for `git clean`

The only allowed rollback primitives are Git primitives plus temporary pausing/resuming of writers.

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
