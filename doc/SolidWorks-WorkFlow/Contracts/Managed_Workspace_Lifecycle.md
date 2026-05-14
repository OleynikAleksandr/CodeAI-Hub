# Managed Workspace Lifecycle

**Status:** Suspended during Managed Workflow Orchestration rewrite  
**Updated:** 2026-05-14  
**Owner:** Oleksandr + Codex

## Boundary

The previous workspace lifecycle contract is not active in the current codebase.
It is retained only as a named historical contract until the replacement
orchestration cluster is designed and implemented.

Active runtime behavior during the rewrite:

- workflow step cards must not bootstrap child plans, hook shims, workflow
  ledgers, provider feedback loops, or automatic stage transitions through this
  contract;
- provider sessions must not be started from this contract;
- read-model APIs and Project Manager refresh paths must stay side-effect free;
- artifacts may be viewed and edited only through the ordinary step/session
  surfaces that remain available;
- any future workspace lifecycle must be introduced by the new cluster design
  and covered by fresh tests and SSOT documentation.

## Non-Goals During Rewrite

This suspended contract does not define:

- Git ownership;
- task generation;
- hook installation or regeneration;
- provider repair feedback;
- automatic continuation;
- next-stage release;
- release packaging behavior.

## Replacement Rule

Before the new Managed Workflow Orchestration cluster can rely on a workspace
lifecycle, a new active contract must replace this suspended placeholder and be
linked from `doc/SolidWorks-WorkFlow/Docs_Index.md`.
