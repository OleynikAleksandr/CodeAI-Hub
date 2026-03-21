# Module Inventory Field Reference

Inventory sections:
- `Module Inventory`: the semantic source of truth for this step. Runtime layout is derived separately and must not replace the inventory.
- `Clusters`: formal subsystem containers that contain related modules and should appear as containers on the user-facing diagram.
- `Standalone Modules`: formal modules that do not belong to any cluster and should appear as separate nodes.
- `Simple Relations`: sparse direct links the user already expects to see before diagramming. Prefer only the interactions that explain the visible system shape.
- `Assumptions / Open Questions`: unresolved boundary, naming, or ownership issues.

Inventory-level guidance:
- The inventory should reflect the full and non-contradictory system composition at the level of the current model.
- If a top-level product contour is visible but the current DSL cannot express it directly, preserve the real cluster/module structure and record that contour in `Notes`, `Rationale`, or `Assumptions / Open Questions` instead of inventing a decorative cluster.
- Do not mirror folders, packages, or class names as if they were the architecture.

Cluster fields:
- `Id`: stable kebab-case identifier.
- `Purpose`: one-line purpose statement in user-readable language.
- `Modules`: ordered list of module IDs in the cluster.
- `Notes`: optional multiline clarification. Use this to explain the cluster boundary, top-level ownership limitation, or user-approved rationale, not to dump implementation detail.

Module fields:
- `Id`: stable kebab-case identifier.
- `Kind`: required DSL classifier; currently one of `service`, `library`, `adapter`, `gateway`, `store`, `external`. Treat it as a secondary tooling/rendering hint, not as the main architectural meaning.
- `Title`: human-readable module name by purpose, not by implementation style.
- `Responsibility`: single-line responsibility summary in user-readable language.
- `Cluster`: optional parent cluster identifier. Omit for standalone modules.
- `Inputs` / `Outputs`: optional lists of consumed or emitted data.
- `Spec Target`: optional relative path to a detailed spec.
- `Contract Targets`: optional list of contract paths.
- `Code Targets`: optional list of source paths.
- `Origin`: `agent`, `user`, or `merged`.
- `Status`: `proposed`, `accepted`, or `deprecated`.
- `Notes` / `Rationale`: optional multiline text blocks.

Cluster / module guidance:
- Treat `Cluster` as a formal subsystem container, not as a loose topic label or hidden ownership workaround.
- Treat `Module` as the smallest standalone functional boundary that still makes sense to the user.
- A standalone module must remain outside clusters unless there is a real subsystem reason to group it.
- Do not create decorative clusters that only repeat a label without real internal modules.
- Do not use loose analytical labels such as `core`, `shared`, `utils`, `services`, `stores`, `adapters` unless they are explicitly justified by upstream product context.
- Prefer one standalone module over a fake cluster when no real subsystem container exists yet.
- If several peer integrations share a contract but do not yet form a true subsystem boundary, model them as peer modules instead of inventing a cluster.

Relation fields:
- `Id`: deterministic `<from>__<type>__<to>` identifier.
- `From` / `To`: module IDs.
- `Type`: one of `sync-call`, `async-event`, `shared-data`, `config-ref`.
- `Label`: optional edge label.
- `Criticality`: optional `high`, `medium`, or `low`.
- `Origin`, `Status`, `Notes`: same semantics as module fields.

Relation guidance:
- Keep relations simple and sparse.
- If two clusters interact, use the concrete module-to-module relation that best explains why the clusters are connected.
- Do not turn the inventory into a full dependency graph.
