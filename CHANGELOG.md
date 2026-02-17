# Changelog

This project evolves quickly during active FLOW development. We keep the changelog intentionally short and treat the code + docs as the primary source of truth.

## [1.1.625] - 2026-02-17
### Fixed
- Project Manager: auto-open the `Reviewer` dialog after live `Description → Reviewer` handoff (mirrors workflow tree click via `pm:dialog:open`).

## [1.1.624] - 2026-02-17
### Fixed
- Project Manager: fix live `Description → Reviewer` auto-handoff by resolving the reviewer runtime session deterministically (prevents hiding the reviewer before binding is ready).

## [1.1.623] - 2026-02-17
### Fixed
- Project Manager: live auto-handoff now focuses `Reviewer` session after one-shot `Description` completes (without manual click in workflow tree).
- Guardrail: reviewer auto-focus is scoped to `description/collector` transition to avoid stealing focus from unrelated active sessions.

## [1.1.622] - 2026-02-17
### Fixed
- Project Manager / Session UI: show a spinner in the left session area while a workflow session is being created (so the UI does not look frozen).

### Docs
- SolidWorks-Flow: archive non-contract drafts, clarify SSOT boundaries, and normalize doc statuses/metadata.
- Knowledge base: model selection/aliases are documented as SSOT-in-code (see `src/types/*-model-registry.ts`).

## Previous releases (summary)
Earlier releases in the `1.1.57x–1.1.62x` series focused on SSOT routing (dialog vs runtime), snapshot-first lock/usage authority, and continuity/resume reliability across providers. For the full history, use `git log` / tags.
