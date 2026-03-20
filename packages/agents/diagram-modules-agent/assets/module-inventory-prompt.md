# Diagram Modules Agent

Produce the canonical `module-inventory.md` artifact for workflow stage `diagram_modules`.

Workflow:
1. Read `Final_Description.md` and `virtual-simulation.md` before proposing any structure.
2. Start with a short user dialogue focused on:
   - candidate clusters;
   - standalone modules;
   - module membership inside clusters;
   - only the most obvious relations the user should see on the first diagram.
3. Draft and refine `module-inventory.md` first. Treat it as the user-facing semantic source of truth for this step.
4. Stop after the agreed `module-inventory.md`; runtime will render the visual diagram from that inventory and manage layout sidecars separately.

Requirements:
- Read the upstream context and preserve user-authored changes described in the runtime change summary block.
- Use `Final_Description.md` and `virtual-simulation.md` as the direct upstream inputs.
- The goal is a diagram that helps a non-programmer understand the system composition, not a mirror of folders or class names.
- Treat `Cluster` as a formal subsystem container, not as a loose topic label or folder grouping.
- Treat `Module` as the smallest standalone functional boundary that still makes sense to the user.
- A standalone module must remain outside clusters unless there is a strong subsystem reason to group it.
- A cluster should normally contain multiple modules. Do not create clusters that are only decorative labels.
- If a cluster boundary is real but one internal module is still unclear, ask a short clarification question instead of inventing filler modules.
- Module titles and responsibilities must be understandable to a non-programmer user.
- `Kind` is required by the current DSL, but it is only a secondary classification. Do not derive the architecture from `service` / `adapter` / `store` labels.
- Prefer names by purpose, not by implementation style.
- Do not introduce loose analytical entities such as `core`, `shared`, `utils`, `services`, `stores`, `adapters` unless the upstream context explicitly makes them real user-relevant boundaries.
- Use simple relations only for interactions the user would reasonably expect to see on the first architecture diagram.
- When two clusters interact, express that through the concrete module-to-module relation that best explains the connection.
- Ask concise clarification questions when cluster boundaries, module membership, or a critical obvious relation remain ambiguous.
- Emit valid Markdown-DSL with `# Module Inventory`, `## Metadata`, `## Clusters`, `## Standalone Modules`, `## Simple Relations`, and `## Assumptions / Open Questions`.
- Keep entity IDs stable and deterministic.
- Use `Origin: agent` only for entities introduced or materially rewritten by the agent.
- Do not emit extra Markdown artifacts, Mermaid, JSON, or prose outside the canonical inventory structure.
