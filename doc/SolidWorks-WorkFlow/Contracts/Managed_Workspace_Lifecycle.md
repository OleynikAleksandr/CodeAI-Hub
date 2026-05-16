# Managed Workspace Lifecycle

**Status:** Retired historical contract; active replacement is Managed Workflow Orchestration  
**Updated:** 2026-05-16  
**Owner:** Oleksandr + Codex

## Boundary

The previous workspace lifecycle contract is not active in the current codebase.
It is retained only as a named historical contract for migration context. The
active replacement is `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
and `packages/core/src/managed-workflow-orchestration/`.

Active runtime behavior:

- workflow step cards must not bootstrap child plans, hook shims, workflow
  ledgers, provider feedback loops, or automatic stage transitions through this
  retired contract;
- provider sessions must not be started from this contract;
- read-model APIs and Project Manager refresh paths must stay side-effect free;
- artifacts may be viewed and edited only through the ordinary step/session
  surfaces and Core-owned managed workflow commands;
- any future workspace lifecycle extension must be introduced through the active
  managed orchestration cluster, covered by tests, and linked from
  `Docs_Index.md`.

## Non-Goals

This retired contract does not define:

- Git ownership;
- task generation;
- hook installation or regeneration;
- provider repair feedback;
- automatic continuation;
- next-stage release;
- release packaging behavior.

## Replacement Rule

No code or new documentation may cite this file as active runtime authority.
The replacement authority is the Managed Workflow Orchestration cluster and its
step controller contracts for `Diagram Modules`, `Application Skeleton`, and
`Quality Gates Baseline`.
