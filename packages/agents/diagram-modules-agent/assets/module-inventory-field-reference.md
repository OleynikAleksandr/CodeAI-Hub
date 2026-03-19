# Module Inventory Field Reference

Inventory sections:
- `Clusters`: logical groups that contain related modules.
- `Standalone Modules`: modules that do not belong to any cluster.
- `Simple Relations`: direct links the user already expects to see before diagramming.
- `Assumptions / Open Questions`: unresolved scope, naming, or ownership issues.

Cluster fields:
- `Id`: stable kebab-case identifier.
- `Purpose`: one-line purpose statement.
- `Modules`: ordered list of module IDs in the cluster.
- `Notes`: optional multiline clarification.

Module fields:
- `Id`: stable kebab-case identifier.
- `Kind`: one of `service`, `library`, `adapter`, `gateway`, `store`, `external`.
- `Title`: human-readable module name.
- `Responsibility`: single-line responsibility summary.
- `Cluster`: optional parent cluster identifier. Omit for standalone modules.
- `Inputs` / `Outputs`: optional lists of consumed or emitted data.
- `Spec Target`: optional relative path to a detailed spec.
- `Contract Targets`: optional list of contract paths.
- `Code Targets`: optional list of source paths.
- `Origin`: `agent`, `user`, or `merged`.
- `Status`: `proposed`, `accepted`, or `deprecated`.
- `Notes` / `Rationale`: optional multiline text blocks.

Relation fields:
- `Id`: deterministic `<from>__<type>__<to>` identifier.
- `From` / `To`: module IDs.
- `Type`: one of `sync-call`, `async-event`, `shared-data`, `config-ref`.
- `Label`: optional edge label.
- `Criticality`: optional `high`, `medium`, or `low`.
- `Origin`, `Status`, `Notes`: same semantics as module fields.
