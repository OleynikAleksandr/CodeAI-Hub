# Product Parts Index

## Product Parts

### Product Part: example-ide-shell
- Id: example-ide-shell
- Title: IDE Shell
- Purpose: Gives the user an entry point into the product from the IDE.
- Status: planned

### Product Part: example-local-runtime
- Id: example-local-runtime
- Title: Local Runtime
- Purpose: Runs the main orchestration and workspace processing logic.
- Status: planned

## Assumptions / Open Questions

- Start with the smallest honest set of top-level Product Parts.
- Keep ids stable and deterministic across iterations.
- Use staged statuses only: `planned`, `in_progress`, `generated`, `reviewed`.
- Order should match the intended generation/review sequence.

<!--
Language rule:
- Runtime may require user-facing values in this artifact to follow the configured `Artifacts for the User` language.
- Keep DSL headers, field names, ids, and staged status tokens exactly as defined by the staged contract.
- Translate only free-text user-facing values such as titles, purposes, notes, and other descriptive content where the contract allows free prose.

Canonical authoring rules:
- Title line must be exactly `# Product Parts Index`
- Every entry uses `### Product Part: <part-id>` header
- Each entry must have Id, Title, Purpose, and Status fields
- Part IDs use lowercase-kebab-case
- Status reflects staged flow only, not implementation readiness
- Runtime uses this list to build the skeleton and decide generation order
- Each continuation turn materializes only one target Product Part file under `product-parts/<part-id>.md`
-->
