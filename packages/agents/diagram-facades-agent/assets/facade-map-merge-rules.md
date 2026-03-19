# Facade Map Merge Rules

When the runtime provides a change summary:
- Preserve facades and relations added by the user.
- Preserve user-modified method signatures, ports, labels, and ownership metadata.
- Do not silently recreate removed facades or relations.
- If a removed facade must return, justify it explicitly in `Notes` or `Rationale`.
- Keep facade ownership aligned with the current `module-inventory.md` instead of inventing new module IDs.
