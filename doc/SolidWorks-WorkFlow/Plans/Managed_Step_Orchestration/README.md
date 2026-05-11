# Managed Step Orchestration Planning

**Status:** active planning folder.
**Purpose:** collect the current design work for managed workflow step orchestration before it becomes implementation scope.

This folder is the working area for scenario-level contracts of managed documentation steps that are still being planned or implemented.

It keeps the still-useful planning sources that led to the current managed workflow implementation and will be used by the next `Quality Gates Baseline` planning intake:

- `Managed_Workspace_Lifecycle_From_Diagram_Modules.md`
- `Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md`

The superseded top-level `Application_Skeleton_Phase_B_Orchestration.md` plan was removed from active planning because it encoded the wrong static Application Skeleton phase model. The accepted replacement is archived as `Plans/Archive/Managed_Step_Orchestration_Application_Skeleton_Scenario_1.2.238.md`.

`Diagram Modules` is accepted and archived at `Plans/Archive/Managed_Step_Orchestration_Diagram_Modules_Scenario_1.2.229.md`.

`Application Skeleton` is accepted in release `1.2.238` and archived at:

- `Plans/Archive/Managed_Step_Orchestration_Application_Skeleton_Architecture_1.2.238.md`
- `Plans/Archive/Managed_Step_Orchestration_Application_Skeleton_Scenario_1.2.238.md`

Quality Gates Baseline follows as the next managed-step planning scope. Its planning document should explicitly reuse the Diagram Modules and Application Skeleton lifecycle lessons, but it must not reopen those closed implementation scopes.

## Core Invariant

Every provider-visible Core instruction that asks an agent to continue, repair, revise, or retry a managed step must be represented in the tracked stage plan as a managed microtask with the next paired `Git Commit:` item before the message is sent.

The commit may contain artifact changes or tracked attempt evidence, but the attempt must not disappear into ignored runtime state or provider session logs only.

## Planning Rules

- Step scenarios are scripted per workflow step. Shared principles are allowed, but the orchestrator must encode the state machine for each step explicitly.
- Future phases are not pre-seeded as large static TODO blocks. Core creates the next executable microtask when the previous result determines it.
- A completed managed step keeps a post-completion user-return revision phase. That phase is not a handoff anchor.
- Handoff to the next workflow step is a workspace lifecycle/ledger transition and must not replace the source step's post-completion revision surface.
