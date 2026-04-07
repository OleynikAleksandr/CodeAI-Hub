# Project Manager Left Sidebar Active Stage Sync Architecture

**Status:** Archived after implementation complete (2026-04-07)
**Created:** 2026-04-07
**Owner:** Oleksandr + Codex
**Scope:** Align the Project Manager left sidebar with the canonical `activeStage` so the selected workflow step is visibly highlighted and only the active stage branch stays expanded.

---

## 1. Problem

The Project Manager already has one canonical workflow-stage route:

- toolbar clicks;
- left-tree stage/session/artifact clicks;
- startup auto-select.

That route now converges on `activeStage`, so the toolbar, session route, and right panel stay aligned.

However, the left sidebar still lacks a visible notion of the currently selected stage:

- the toolbar highlights the active step;
- the left tree can dispatch stage changes but does not highlight the selected step;
- stage expansion is driven by local `expandedNodes` state instead of the active workflow route;
- multiple stage branches can remain open even when they are not the current UI focus.

This leaves a visible UX gap: the left tree is interactive but does not show the current stage truth.

---

## 2. Product Decision

For the current PM UX, the left sidebar must become an `activeStage`-driven accordion.

### 2.1. Selected step visibility

The left tree must visibly mark the currently selected workflow step.

The visual treatment does not need pixel-identical reuse of the toolbar styles, but it must read as the same semantic state:

- this is the active workflow step right now;
- this step is the one controlling the visible session/artifact surface.

### 2.2. Expansion rule

Exactly one workflow stage branch may be expanded at a time:

- the active stage is expanded;
- all non-active stages are collapsed;
- children (artifacts, sessions) are rendered only for the active stage branch.

The workspace root may stay expanded as today. The accordion rule applies to workflow stages under the workspace root.

### 2.3. Event source does not matter

The left tree must react the same way regardless of how the stage was chosen:

- toolbar click;
- stage click in the tree;
- artifact click in the tree;
- session click in the tree;
- workspace startup auto-select.

Every route already converges through `pm:stage:activated`; the left tree must subscribe to that canonical route instead of maintaining its own parallel selection truth.

---

## 3. Non-Goals

This scope does not:

- redesign the workspace picker above the tree;
- change right-panel artifact rules;
- change session restore rules or startup-stage rules;
- persist manual expansion state for inactive stages;
- introduce multi-expand tree behavior;
- redefine workflow completion/blocking/outdated status semantics.

---

## 4. Core Architecture Decisions

### 4.1. Selection and workflow status are different concepts

The current tree node status is derived from workflow progress (`todo`, `blocked`, `active`, `outdated`, `draft`).

That status must stay responsible for workflow-state markers only.

The new "currently selected stage" state must be modeled separately from workflow progress so the code does not overload `TreeStatus` with two unrelated meanings:

- workflow progress/status;
- current UI selection.

Expected direction:

- keep workflow status markers as-is;
- add a dedicated selected-stage flag or modifier for stage rows.

### 4.2. Stage expansion must derive from canonical stage routing

`WorkspaceTree` currently owns local `expandedNodes`, which is acceptable for the workspace root but not for workflow-stage truth.

For stage nodes:

- expanded/collapsed state must derive from the active stage;
- switching stage must immediately collapse the previous branch and expand the new one;
- startup `description` selection must automatically expand the `Description` branch.

### 4.3. Left tree must listen to shared stage activation

`MainArea` already listens to `pm:stage:activated` and converts it into the active tool.

The left tree needs the same canonical signal so external stage changes are reflected even when the click originated elsewhere.

Because `workspace-tree.tsx` is already close to the project file-size guardrail, the active-stage listener/sync logic should be extracted into a small helper or hook rather than expanding the component indefinitely.

### 4.4. Styling must remain additive

The selected-step highlight must be additive to existing status markers:

- blocked/outdated/todo markers stay visible;
- the selected stage gets an additional selected visual wrapper/background/text treatment;
- child rows may remain visually simpler; the requirement is explicit for the stage row itself.

---

## 5. Implementation Boundary

Primary implementation area:

- `src/client/project-manager/components/layout/workspace-tree.tsx`
- `src/client/project-manager/components/layout/workspace-tree-model.ts`
- `src/client/project-manager/components/layout/use-workspace-tree-active-stage.ts` (new helper/hook expected)
- `packages/ui/project-manager/styles.css`

Regression/documentation area:

- `src/client/project-manager/components/layout/workflow-navigation.test.ts`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`

---

## 6. Acceptance Criteria

1. When the user selects a stage from the toolbar, the same stage becomes highlighted in the left tree.
2. When the user selects a stage, artifact, or session from the left tree, the corresponding stage row stays highlighted afterward.
3. Only the active stage branch is expanded; all other workflow stage branches are collapsed.
4. On workspace open/switch/reconnect, the left tree starts with only `Description` expanded.
5. Workflow progress markers (blocked/outdated/etc.) remain visible and are not replaced by the selected-state styling.
6. No second browser-local or tree-local stage truth is introduced alongside `activeStage`.

---

## 7. Suggested Execution Streams

1. Introduce a dedicated active-stage sync helper for the left tree and keep selection separate from workflow status.
2. Convert stage branch visibility into an `activeStage`-driven accordion and add selected-stage styling.
3. Update workflow navigation docs and regression coverage so the left sidebar is explicitly part of the stage-sync contract.
