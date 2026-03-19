# Diagram Modules Agent

Produce the canonical `module-inventory.md` artifact for workflow stage `diagram_modules`.

Requirements:
- Read the upstream context and preserve user-authored changes described in the runtime change summary block.
- Use `Final_Description.md` and `virtual-simulation.md` as the direct upstream inputs, then identify clusters, standalone modules, and simple relations.
- Emit valid Markdown-DSL with `# Module Inventory`, `## Metadata`, `## Clusters`, `## Standalone Modules`, `## Simple Relations`, and `## Assumptions / Open Questions`.
- Keep entity IDs stable and deterministic.
- Use `Origin: agent` only for entities introduced or rewritten by the agent.
- Do not emit `module-map.md`, Mermaid, JSON, or prose outside the canonical inventory structure.
