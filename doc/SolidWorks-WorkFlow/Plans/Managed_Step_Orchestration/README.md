# Managed Step Orchestration Planning

**Status:** active planning folder.
**Purpose:** collect the current design work for managed workflow step orchestration before it becomes implementation scope.

This folder is the working area for scenario-level contracts of managed documentation steps:

- `Diagram_Modules_Scenario.md`
- `Application_Skeleton_Scenario.md`

Quality Gates Baseline follows after these two scenarios are accepted.

## Core Invariant

Every provider-visible Core instruction that asks an agent to continue, repair, revise, or retry a managed step must be represented in the tracked stage plan as a managed microtask with the next paired `Git Commit:` item before the message is sent.

The commit may contain artifact changes or tracked attempt evidence, but the attempt must not disappear into ignored runtime state or provider session logs only.

## Planning Rules

- Step scenarios are scripted per workflow step. Shared principles are allowed, but the orchestrator must encode the state machine for each step explicitly.
- Future phases are not pre-seeded as large static TODO blocks. Core creates the next executable microtask when the previous result determines it.
- A completed managed step keeps a post-completion user-return revision phase. That phase is not a handoff anchor.
- Handoff to the next workflow step is a workspace lifecycle/ledger transition and must not replace the source step's post-completion revision surface.
