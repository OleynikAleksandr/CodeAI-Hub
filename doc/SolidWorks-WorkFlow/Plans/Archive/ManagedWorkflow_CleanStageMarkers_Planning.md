# Managed Workflow Clean Stage Markers Planning

**Status:** Active planning source for execution scope `managed-workflow-clean-stage-markers-2026-05-17`.
**Opened:** 2026-05-17.
**Owner:** Core / Project Manager boundary.

## Problem

Managed workflow stage markers are not deterministic enough for the user-facing Project Manager tree.
The left marker beside each workflow step must show only three states:

- gray: the step has not started;
- yellow: Core has started the step by opening the first step session / sending the first provider prompt;
- green: the step is fully complete and has reached the terminal user-return/revision boundary.

Current behavior mixes Core state, filesystem artifact existence, review readiness, progress hydration, and UI-side status mapping.
That makes some stages look complete too early, miss the yellow state, or oscillate after reload.

The same execution cycle also exposed a second boundary defect: managed technical steps can reach the apparent terminal state while Git is still dirty.
The dirty residue was observed in the test workspace after Application Skeleton and Diagram Modules/Quality Gates flows.

## Root Causes

1. Project Manager marker rendering currently uses more than the explicit Core stage status. Artifact existence and review readiness can affect the marker outcome.
2. Core workflow state hydration derives some step statuses from side effects rather than explicit start/completion events.
3. Description and Virtual Simulation do not use managed stage todo-plans, so they need an explicit started-session signal for the yellow state.
4. Managed technical stages can write runtime metadata and sidecar artifacts after the semantic stage commit boundary.
5. Some managed generated files are provider prompt targets but are not in the corresponding managed commit allowlist.
6. Quality-gate and formatter output can touch files outside a narrow stage-owned path set.

## Target Contract

### Marker Contract

Core is the owner of the trunk stage status shown by Project Manager.
Project Manager must render the marker from the Core-provided status without reclassifying it from local artifact availability.

The only marker states are:

- `idle` -> gray;
- `in_progress` -> yellow;
- `completed` -> green;
- `invalid` / `outdated` / blocked states may keep their existing explicit warning visuals, but they must not be used as a replacement completion signal.

Yellow trigger:

- For every step, Core marks the step `in_progress` when it starts the step session / dispatches the first prompt to the provider.
- For `Description` and `Virtual Simulation`, this is the missing behavior to add.

Green trigger:

- For managed technical stages with stage todo-plans, Core marks `completed` only after creating the terminal `### Stream: User Return And Revisions` boundary.
- For `Description` and `Virtual Simulation`, existing completion logic remains the green trigger.

### Clean Git Completion Contract

Core must not publish green completion for a managed technical stage while a dirty Git tree remains from that stage.
At the terminal user-return/revision boundary Core performs a dirty-tree checkpoint:

1. read `git status --porcelain`;
2. classify changed paths into stage-owned, Core runtime-owned, known gate/formatter residue, or unclassified residue;
3. commit classified residue using a Core-owned managed commit;
4. block terminal completion and next-stage transition if any unclassified residue remains.

The agent must never be asked to decide or run Git commits for this boundary.
If the user approves committing unclassified residue, Project Manager sends a structured command to Core.
Core rechecks the current dirty snapshot, stages only the approved paths, commits them, and resumes the terminal transition.

## Implementation Plan

1. Add or reuse a small Core helper for managed terminal dirty-tree classification. Keep it file-size safe and testable.
2. Extend managed stage commit allowlists for known stage sidecars, including Diagram Modules `module-map.flow.json`.
3. Wire the terminal checkpoint into managed stage completion/user-return creation. Green marker emission must happen after this checkpoint succeeds.
4. Adjust Core workflow state projection so trunk marker status comes from explicit start/completion signals.
5. Add Description and Virtual Simulation yellow-on-session-start behavior without changing their existing green completion path.
6. Simplify Project Manager tree marker mapping so the marker is not promoted by artifact availability.
7. Add focused tests for dirty residue classification and marker status projection/rendering.

## Non-Goals

- No release build in this scope unless explicitly requested later.
- No broad redesign of managed workflow plans.
- No manual bypass of plan commits or hooks.
- No UI-only workaround that hides a Core state problem.

## Acceptance Criteria

- A not-started step shows a gray marker.
- A step turns yellow as soon as Core starts its first session/prompt.
- A managed technical step turns green only after the terminal `User Return And Revisions` stream exists and the Git tree is clean or Core has committed all classified residue.
- Description and Virtual Simulation gain the yellow state but keep their existing green completion behavior.
- Application Skeleton, Diagram Modules, and Quality Gates leave no stage-owned uncommitted residue at step transition.
- Unclassified dirty files block the transition and require an explicit Core command path from Project Manager/user approval.
