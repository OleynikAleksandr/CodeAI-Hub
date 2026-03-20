# Module Inventory Merge Rules

When the runtime provides a change summary:
- Preserve clusters, modules, and relations added by the user unless there is an explicit contradiction in the latest upstream context.
- Preserve user-modified purpose, responsibility, membership, and ownership fields on existing inventory entities.
- Preserve user-approved subsystem boundaries from `Final_Description.md` and `virtual-simulation.md` unless the latest upstream context explicitly changes them.
- Do not silently recreate modules or relations removed by the user.
- Do not silently convert standalone modules into cluster members or move modules between clusters without a clear upstream reason.
- Do not silently recreate decorative clusters or loose analytical labels removed by the user.
- If a removed cluster, module, or relation must return, explain the justification in `Notes` or `Rationale`.
- Prefer extending the existing inventory over rewriting IDs or reshaping user-owned boundaries.
- When a boundary is still ambiguous, keep the existing user-approved structure and record the ambiguity in `Assumptions / Open Questions` instead of forcing a new grouping.
