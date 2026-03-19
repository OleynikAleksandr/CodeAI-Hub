# Module Inventory Merge Rules

When the runtime provides a change summary:
- Preserve clusters, modules, and relations added by the user unless there is an explicit contradiction in the latest upstream context.
- Preserve user-modified purpose, responsibility, membership, and ownership fields on existing inventory entities.
- Do not silently recreate modules or relations removed by the user.
- If a removed cluster, module, or relation must return, explain the justification in `Notes` or `Rationale`.
- Prefer extending the existing inventory over rewriting IDs or reshaping user-owned boundaries.
