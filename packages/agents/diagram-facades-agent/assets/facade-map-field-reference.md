# Facade Map Field Reference

Facade fields:
- `Id`: stable kebab-case identifier.
- `Module`: parent module ID from `module-map.md`.
- `Kind`: currently `class`.
- `Visibility`: `public` or `internal`.
- `Methods`: optional list of facade method signatures.
- `Ports`: optional list in `In/Out: <type> from/to <target>` format.
- `Contract Targets`: optional contract file paths.
- `Code Targets`: optional source file paths.
- `Origin`: `agent`, `user`, or `merged`.
- `Status`: `proposed`, `accepted`, or `deprecated`.
- `Notes` / `Rationale`: optional multiline text blocks.

Facade relation fields:
- `Id`: deterministic `<from>__<type>__<to>` identifier.
- `From` / `To`: facade IDs.
- `Type`: one of `sync-call`, `async-event`, `shared-data`, `config-ref`.
- `Label`: optional edge label.
- `Origin`, `Status`, `Notes`: same semantics as facade fields.
