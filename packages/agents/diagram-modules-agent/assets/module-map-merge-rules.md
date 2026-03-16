# Module Map Merge Rules

When the runtime provides a change summary:
- Preserve entities added by the user unless there is an explicit contradiction in the latest upstream context.
- Preserve field-level edits made by the user on existing entities.
- Do not silently recreate modules or relations removed by the user.
- If the agent needs to reintroduce a removed entity, explain the justification in `Notes` or `Rationale`.
- Prefer extending the existing graph over rewriting IDs or reshaping user-owned boundaries.
