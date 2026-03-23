# Product Parts Index

## Metadata
- Version: 1
- Stage: diagram_modules
- Revision: 00000000
- Updated: 2026-03-23T00:00:00Z

## Product Parts

### Product Part: example-ide-shell
- Id: example-ide-shell
- Title: IDE Shell
- Purpose: Gives the user an entry point into the product from the IDE.
- Status: planned
Notes:
Keep the top-level order meaningful. Runtime uses this list to build the skeleton and decide generation order.

### Product Part: example-local-runtime
- Id: example-local-runtime
- Title: Local Runtime
- Purpose: Runs the main orchestration and workspace processing logic.
- Status: planned
Notes:
Each continuation turn should materialize only one target Product Part file under `product-parts/<part-id>.md`.

## Assumptions / Open Questions
- Start with the smallest honest set of top-level Product Parts.
- Keep ids stable and deterministic across iterations.
- Use staged statuses only: `planned`, `in_progress`, `generated`, `reviewed`.

<!--
Authoring checklist before finalizing:
- Header stays exactly '# Product Parts Index'
- Every '### Product Part: ...' entry has matching Id, Title, and Purpose
- Status reflects only the staged flow, not implementation readiness
- Order should match the intended generation/review sequence
-->
