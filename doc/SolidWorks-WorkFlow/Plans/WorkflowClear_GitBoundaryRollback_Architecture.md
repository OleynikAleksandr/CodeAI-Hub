# Workflow Clear Git Boundary Rollback Architecture

## Status

Planning document. This is not SSOT until implementation is complete and the stable decisions are moved into the canonical `System/`, `Clusters/`, `Modules/`, or `Contracts/` documents.

## Problem

The current workflow step `Clear` implementation combines several overlapping rollback mechanisms:

- persistent undo ledger;
- mutation journal runtime;
- workflow step checkpoints;
- fallback path deletion;
- managed Git rollback for only some technical stages;
- ad hoc session trace cleanup;
- last-active state repair after cleanup.

This model is fragile. The v1.2.353 user retest showed the concrete failure mode: clearing `Virtual Simulation` removed the stage files and downstream files, but the persisted `.codeai-hub/<workspace>/workflow/state.json` still pointed `lastActive.stage` to the deleted `virtual_simulation` artifact.

The root architectural issue is that `Clear` tries to infer and reverse many effects after the fact. It should instead restore the workspace to an explicit Core-owned pre-step boundary.

## Architecture Decision

Core must own a single managed Git history for CodeAI Hub workspaces.

The same managed Git history is used for:

- context recovery and readable development history;
- deterministic workflow rollback boundaries;
- managed technical-stage commits;
- future agent/session recovery after context loss.

There is no second rollback Git for CodeAI-managed workspaces. Git ownership already belongs to Core in managed workflow code. Agents and users do not stage or commit; Core executes managed commits and records hashes.

## Boundary Commit Model

Core creates one rollback boundary before each workflow step starts:

- `codeai-boundary: Description`
- `codeai-boundary: Virtual Simulation`
- `codeai-boundary: Diagram Modules`
- `codeai-boundary: Application Skeleton`
- `codeai-boundary: Quality Gates`

The first boundary is created during workspace activation, before the user fills or sends the Description questionnaire.

Each boundary commit records the exact pre-step state. If no file changed yet, Core may create an empty boundary commit. The commit itself is still the durable rollback anchor.

## Boundary Registry

Core keeps a small registry that maps workflow stage ids to boundary commits.

Required fields:

- workspace slug;
- stage id;
- stage label;
- boundary commit hash;
- created timestamp;
- boundary commit message;
- rollback scope version;
- external user-space slice descriptors, if any.

The registry must survive rollback. Core may store it in Git refs, a Core-owned file that is repaired after restore, or both. The restore operation must read the target boundary before it mutates the worktree.

## Clear Semantics

When the user clears a workflow step:

1. Core resolves the selected stage id.
2. Core reads the boundary commit for that stage.
3. Core restores the workspace to that boundary.
4. Core removes/prunes boundary records for the cleared stage and downstream stages.
5. Core resets in-memory workflow state and Project Manager projections from the restored filesystem.
6. Core reports a deterministic result to Project Manager.

Clear must not infer stage cleanup by deleting known folders, replaying undo ledger entries, or patching stale state after cleanup.

## User-Space Scope

Not every file produced by CodeAI Hub lives inside the current workspace.

Core must not roll back entire global directories such as:

- `~/.codeai-hub/settings`;
- `~/.codeai-hub/providers`;
- `~/.codeai-hub/logs`;
- `~/.codeai-hub/localization`.

Those roots are global application state and may be shared by many workspaces.

Instead, Core tracks only per-workspace or per-session user-space slices required for workflow rollback:

- unified session JSONL files for the active workspace/session;
- translation overlay JSONL files for the active workspace/session;
- provider-native session files referenced by continuity for the active workspace/session;
- workspace-specific entries under `~/.codeai-hub/state`, if any;
- workspace-specific entries under `~/.codeai-hub/data`, if any after inventory.

The preferred implementation is a Core-owned mirror/snapshot of those slices inside the workspace managed history, or an equivalent boundary registry entry with exact restore instructions. Global provider binaries, settings, localization catalogs, and logs are not stage rollback state.

## Deprecated Mechanisms

The following mechanisms are deprecated for workflow stage `Clear`:

- `packages/core/src/workflow/undo/**`;
- `packages/core/src/workflow/step-checkpoint/**`;
- mutation journal capture in session/workspace write paths;
- fallback path deletion as the primary stage rollback mechanism;
- stage-specific last-active repair after cleanup;
- session cleanup that attempts to reconstruct scope without a boundary registry.

During migration, UI entry points remain:

- Project Manager Clear context menu;
- destructive confirmation popup;
- Core HTTP endpoint shape for Clear requests.

The endpoint may temporarily fail closed with a clear migration error rather than pretending that legacy cleanup is still correct.

## Migration Strategy

### Phase A: Planning And Cleanup

1. Record this architecture planning document.
2. Audit legacy Clear/Undo code paths and split removal into microtasks.
3. Remove checkpoint, undo ledger, mutation journal, fallback cleanup, and old rollback helpers that conflict with Git boundary ownership.
4. Keep the Project Manager Clear UI and Core endpoint contract.
5. Leave a narrow Core endpoint implementation that fails closed or delegates only to the new boundary service when available.

### Phase B: Git Boundary Implementation

1. Introduce a Core workflow boundary service/facade.
2. Create/verify managed Git on workspace activation.
3. Create `Description` boundary before questionnaire work starts.
4. Create a boundary before every workflow step start.
5. Store stage-to-boundary mapping in a restart-safe registry.
6. Implement Clear as restore-to-boundary plus registry pruning.
7. Add focused tests for Description, Virtual Simulation, Diagram Modules, Application Skeleton, and Quality Gates rollback.

## Acceptance Criteria

- Clearing `Virtual Simulation` restores persisted `workflow/state.json` to a pre-Virtual-Simulation state instead of leaving `lastActive.stage = virtual_simulation`.
- Clearing any stage removes all downstream workspace artifacts by restoring a boundary, not by path enumeration.
- Managed technical stages no longer need a separate Git rollback path from provider-direct stages.
- The legacy undo ledger and checkpoint modules are gone or unreachable.
- Project Manager Clear UX remains available.
- Agents still see a readable Git history with explicit boundary commits.

