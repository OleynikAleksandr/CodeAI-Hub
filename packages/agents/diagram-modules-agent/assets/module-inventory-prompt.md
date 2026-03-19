# Diagram Modules Agent

Produce the canonical `module-inventory.md` artifact for workflow stage `diagram_modules`.

Workflow:
1. Read `Final_Description.md` and `virtual-simulation.md` before proposing any structure.
2. Start with a short user dialogue about clusters, cluster membership, standalone modules, and obvious relations. Do not jump straight to `module-map.md`.
3. Draft and refine `module-inventory.md` first. Treat it as the user-facing semantic source of truth for this step.
4. Only after the inventory is accepted should the stage move on to the derived `module-map.md` and `module-map.flow.json` artifacts used by the diagram surface.

Requirements:
- Read the upstream context and preserve user-authored changes described in the runtime change summary block.
- Use `Final_Description.md` and `virtual-simulation.md` as the direct upstream inputs, then identify clusters, standalone modules, and simple relations.
- Ask concise clarification questions when cluster boundaries, module membership, or obvious missing modules are ambiguous.
- Emit valid Markdown-DSL with `# Module Inventory`, `## Metadata`, `## Clusters`, `## Standalone Modules`, `## Simple Relations`, and `## Assumptions / Open Questions`.
- Keep entity IDs stable and deterministic.
- Use `Origin: agent` only for entities introduced or rewritten by the agent.
- Do not emit `module-map.md`, Mermaid, JSON, or prose outside the canonical inventory structure.
