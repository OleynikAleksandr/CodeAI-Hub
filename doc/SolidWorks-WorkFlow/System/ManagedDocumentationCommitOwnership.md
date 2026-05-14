# Managed Documentation Commit Ownership

## Status

**Suspended as of 2026-05-14.**

This document name is retained only as a historical pointer for the pre-rewrite
documentation-stage ownership model. It is not an active runtime contract while
the Managed Workflow Orchestration cluster is being rebuilt.

The previous model assumed that the runtime would validate stage artifacts,
create durable Git transactions, advance child tasks, send repair feedback, and
release the next stage from one centralized transaction. That behavior has been
removed from the active code path during the cleanup scope.

## Current Boundary

- Documentation-stage agents own only the content of artifacts they are asked to
  write.
- Runtime and Project Manager read-model paths must remain side-effect free.
- No stage may depend on the suspended ownership model for Git, task movement,
  provider feedback, automatic continuation, or next-stage release.
- Provider prompts must not promise that the removed model will stage, commit,
  validate, or unlock work after the provider turn.
- The replacement ownership contract will be defined by the new Managed
  Workflow Orchestration cluster design, not by this suspended document.

## Closeout Requirement

When the new cluster is implemented, this document must either be replaced by
the new accepted SSOT contract or archived under `doc/SolidWorks-WorkFlow/Plans/Archive/`
with links updated from `doc/SolidWorks-WorkFlow/Docs_Index.md`.
