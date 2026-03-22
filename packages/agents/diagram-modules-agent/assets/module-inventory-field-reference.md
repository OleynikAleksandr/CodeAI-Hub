# Module Inventory Field Reference

Inventory sections:
- `Module Inventory`: the semantic source of truth for this step. Runtime layout is derived separately and must not replace the inventory.
- `Product Parts`: top-level ownership layers. Nested `Cluster` blocks and standalone `Module` blocks must live inside their owning product part.
- `Simple Relations`: sparse direct links the user already expects to see before diagramming. Prefer only the interactions that explain the visible system shape.
- `Assumptions / Open Questions`: unresolved boundary, naming, or ownership issues.

Inventory-level guidance:
- The inventory should reflect the full and non-contradictory system composition at the level of the current model.
- Product Parts are first-class DSL entities. If a top-level ownership contour is already known, materialize it as a `Product Part` instead of hiding it in `Notes` or a decorative cluster.
- Each `Product Part` must keep its `Clusters` and `Standalone Modules` fields in exact sync with the nested blocks inside that product part.
- Do not fall back to flat legacy inventories when the ownership contours are already known.
- Do not mirror folders, packages, or class names as if they were the architecture.

Product Part fields:
- `Id`: stable kebab-case identifier that must match the `### Product Part: ...` header.
- `Title`: human-readable product part name.
- `Purpose`: one-line user-readable explanation of what this top-level part exists for.
- `Clusters`: ordered list of cluster IDs nested inside this product part. Must exactly match the nested `### Cluster:` blocks.
- `Standalone Modules`: ordered list of module IDs that live directly in this product part outside clusters. Must exactly match the nested standalone `### Module:` blocks.
- `Notes`: optional multiline clarification. Use this to explain ownership rationale, not to hide missing nested blocks.

`Product Part` is the top-level part of the product in this DSL. It answers the question: "is this a separate large part of the system?" rather than "what role label should it receive?".

Cluster fields:
- `Id`: stable kebab-case identifier.
- `Title`: human-readable cluster name.
- `Purpose`: one-line purpose statement in user-readable language.
- `Product Part`: owning product part ID. Must match the surrounding product part block.
- `Modules`: ordered list of module IDs in the cluster.
- `Notes`: optional multiline clarification. Use this to explain the cluster boundary or user-approved rationale, not to dump implementation detail.

Module fields:
- `Id`: stable kebab-case identifier.
- `Kind`: required DSL classifier; currently one of `service`, `library`, `adapter`, `gateway`, `store`, `external`. Treat it as a secondary tooling/rendering hint, not as the main architectural meaning.
- `Title`: human-readable module name by purpose, not by implementation style.
- `Responsibility`: single-line responsibility summary in user-readable language.
- `Product Part`: owning product part ID. Required for both cluster members and standalone modules.
- `Cluster`: optional parent cluster identifier. Omit only for standalone modules that live directly in a product part.
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
- A standalone module must still be listed in the owning product part `Standalone Modules` field.
- A cluster member must declare both the correct `Product Part` and the correct `Cluster`.
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
