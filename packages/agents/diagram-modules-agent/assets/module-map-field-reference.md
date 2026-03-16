# Module Map Field Reference

Module fields:
- `Id`: stable kebab-case identifier.
- `Kind`: one of `service`, `library`, `adapter`, `gateway`, `store`, `external`.
- `Title`: human-readable module name.
- `Responsibility`: single-line responsibility summary.
- `Cluster`: optional logical group.
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
