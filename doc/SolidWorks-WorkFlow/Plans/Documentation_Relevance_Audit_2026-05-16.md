# Documentation Relevance Audit — 2026-05-16

**Status:** active audit planning source.
**Owner:** Oleksandr + Codex.
**Scope:** verify `doc/SolidWorks-WorkFlow/**` against the current codebase and the accepted managed workflow release `1.2.274`.

## Goals

1. Confirm active SSOT documents describe the current implemented architecture, not retired Project Manager-owned or generated-orchestrator behavior.
2. Move completed planning artifacts into `Plans/Archive/` and keep active `Plans/` limited to future or deferred work.
3. Promote implemented scenario and contract details into active `System/`, `Clusters/`, `Modules/`, and `Contracts/` documents where they are now code truth.
4. Keep historical/archived documents as history, but prevent `Docs_Index.md` and active folder README files from presenting closed planning waves as active.

## Current Code Truth To Preserve

- Project Manager is a replaceable client projection, not a workflow authority.
- Core / Managed Workflow Orchestration owns stage state, prompt/template composition, parser/validation truth, workflow gating, repair diagnostics, and managed commit lifecycle.
- Diagram Modules, Application Skeleton, and Quality Gates are implemented as Core-owned managed workflow stages.
- Description and Virtual Simulation remain provider-direct steps, but start/read-model/session restoration policy is still Core-owned.
- Release `1.2.274` fixed Application Skeleton active-session projection and prompt production-root ambiguity.

## Audit Method

- Inventory files under `doc/SolidWorks-WorkFlow/**`.
- Search for stale active references to completed planning docs, Project Manager-owned parser/backend wording, preview-only managed steps, and retired generated-orchestrator language.
- Cross-check current code ownership with `packages/core/src/managed-workflow-orchestration/**`, `packages/core/src/remote-bridge/handlers/**`, and Project Manager projection files.
- Edit active SSOT docs in small commits and archive completed planning sources separately.

## Out Of Scope

- Release build.
- New runtime behavior.
- Archiving genuinely open future planning docs for Development Tree branch workflows, capture workbench, or provider capability analysis.
