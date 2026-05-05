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
- The runtime `Workflow runtime language contract` is authoritative for user-facing prose language.
- Descriptive prose in this artifact follows the configured `Artifacts for the User` language, not the language of examples or internal instructions.
- Keep Product Part names/titles, DSL headers, field names, ids, file names, and staged status tokens exactly as defined by the staged contract.
- Keep Cluster / Module canonical names in English when they are referenced from this artifact or surrounding staged context.
- Translate only descriptive prose such as purposes, notes, assumptions / open questions, and other free-text content where the contract allows prose.

Canonical authoring rules:
- Title line must be exactly `# Product Parts Index`
- Every entry uses `### Product Part: <part-id>` header
- Each entry must have Id, Title, Purpose, and Status fields
- Part IDs use lowercase-kebab-case
- Status reflects staged flow only, not implementation readiness
- Runtime uses this list to build the skeleton and decide generation order
- Each continuation turn materializes only one target Product Part file under `product-parts/<part-id>.md`

Patch-friendly authoring contract:
- Keep this Markdown as UTF-8 text with LF line endings and no trailing spaces.
- Keep exactly one blank line around generated/comment or runtime `agent-fill` blocks when they are present.
- If a runtime draft contains `<!-- agent-fill -->`, replace only the sentinel line `_CODEAI_AGENT_FILL_SENTINEL: replace this line with draft content._` inside that block.
- Do not rewrite generated/comment blocks while filling user-facing prose.
-->
