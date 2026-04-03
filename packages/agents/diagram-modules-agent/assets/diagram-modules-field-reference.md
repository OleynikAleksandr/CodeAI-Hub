# Diagram Modules Field Reference

The staged artifacts for this step consist of:
- `product-parts.index.md` — an ordered list of Product Parts with Id, Title, Purpose, and Status.
- `product-parts/<part-id>.md` — one ownership subtree per Product Part: Identity, Purpose, Owned Clusters, Standalone Modules, Simple Relations, Assumptions / Open Questions.

The runtime builds the visual Module Graph from these staged artifacts separately. The layout sidecar is not a semantic artifact.

General rules:
- the staged artifacts must reflect the full and coherent composition of the system at the current model level;
- if a top-level ownership contour is already clear, materialize it as a `Product Part` instead of hiding it in `Notes` or in a decorative `Cluster`;
- do not replace the architecture with a list of folders, packages, or class names.

## Product Part

Fields in `product-parts.index.md`:
- `Id`: a stable kebab-case identifier. It must match the heading `### Product Part: <part-id>`.
- `Title`: a user-readable name of the top-level product block.
- `Purpose`: one short line explaining why this top-level block exists.
- `Status`: staged flow status: `planned`, `in_progress`, `generated`, `reviewed`.

`Product Part` is the top level of the product in this DSL. It answers the question "is this a separate major part of the system?" rather than "which role label should we assign to it?".

## Cluster (inside the product-part file)

Format inside `product-parts/<part-id>.md`:

```markdown
### `cluster-id`

**Purpose:** one short line describing the role of this subsystem.

| `module-id` | `kind` | Responsibility |
| --- | --- | --- |
| `example-module` | `service` | One-line responsibility |
```

Rules:
- `Cluster` is a formal subsystem container, not a loose topic label or folder grouping;
- use `Cluster` only where there is a real subsystem made of several modules;
- do not create decorative clusters that only repeat a label without real modules;
- do not use loose analytical labels such as `core`, `shared`, `utils`, `services`, `stores`, or `adapters` unless they are justified by the upstream product context.

## Module (inside the product-part file)

Modules are described in tables inside Owned Clusters or Standalone Modules sections:

```markdown
| `module-id` | `kind` | Responsibility |
| --- | --- | --- |
| `example-module` | `service` | One-line responsibility |
```

Fields:
- `module-id`: a stable kebab-case identifier;
- `kind`: a required DSL classifier; one of `service`, `library`, `adapter`, `gateway`, `store`, `external`. It is a secondary classification, so do not derive the architecture from `kind`;
- `Responsibility`: one short line describing the main responsibility of the module.

Rules:
- `Module` is the smallest standalone functional boundary that still makes sense to the user;
- a standalone module should stay outside clusters until there is a real subsystem reason to group it there;
- prefer one standalone module over a fake cluster if a real subsystem boundary has not appeared yet;
- if several peer integrations share one contract but still do not form a real subsystem boundary, model them as peer modules rather than as an artificial cluster.

## Simple Relations (inside the product-part file)

Format:

```markdown
| From | To | Type | Label |
| --- | --- | --- | --- |
| `module-a` | `module-b` | sync-call | edge-label |
```

Fields:
- `From` / `To`: module IDs;
- `Type`: one of `sync-call`, `async-event`, `shared-data`, `config-ref`;
- `Label`: an optional edge label.

Rules:
- keep relations simple and sparse;
- if two clusters interact, capture that through a concrete module-to-module relation;
- do not turn staged artifacts into a full dependency graph.
