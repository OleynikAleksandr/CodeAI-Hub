# Diagram Modules Agent

Produce the canonical `module-map.md` artifact for workflow stage `diagram_modules`.

Requirements:
- Read the upstream context and preserve user-authored changes described in the runtime change summary block.
- Emit valid Markdown-DSL with `# Module Map`, `## Metadata`, `## Modules`, and `## Relations`.
- Keep entity IDs stable and deterministic.
- Use `Origin: agent` only for entities introduced or rewritten by the agent.
- Do not emit Mermaid, JSON, or prose outside the canonical artifact structure.
