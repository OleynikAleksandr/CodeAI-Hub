# Changelog

This project evolves quickly during active FLOW development. We keep the changelog intentionally short and treat the code + docs as the primary source of truth.

## [1.1.622] - 2026-02-17
### Fixed
- Project Manager / Session UI: show a spinner in the left session area while a workflow session is being created (so the UI does not look frozen).

### Docs
- SolidWorks-Flow: archive non-contract drafts, clarify SSOT boundaries, and normalize doc statuses/metadata.
- Knowledge base: model selection/aliases are documented as SSOT-in-code (see `src/types/*-model-registry.ts`).

## Previous releases (summary)
Earlier releases in the `1.1.57x–1.1.62x` series focused on SSOT routing (dialog vs runtime), snapshot-first lock/usage authority, and continuity/resume reliability across providers. For the full history, use `git log` / tags.
