# Application Skeleton Contract Reference

## Canonical Files
- `application-skeleton.md`: human-readable technical scaffold decision record and materialization checklist.
- `application-skeleton-map.json`: machine-readable mapping from Development Tree ownership to production code paths and materialization state.

## Managed Workspace Boundary
- Application Skeleton must assume the managed workspace lifecycle already exists from the `Diagram Modules` entrypoint.
- Git, hooks, `doc/TODO/workspace.plan.md`, active child plans under `doc/TODO/stages/<stage>/todo-plan.md`, plan scripts, `.codeai-hub/workflow`, workflow revision ledgers, and upstream read-only policy are Core-owned lifecycle controls, not skeleton materialization output.
- If lifecycle controls are missing or broken, report runtime/Core preflight failure. Do not create, reinstall, repair, rename, or replace them in this stage.

## JSON Shape
```json
{
  "schema": "codeai-application-skeleton-v1",
  "accepted": false,
  "reviewState": "draft",
  "materialized": false,
  "materializationState": "not_started",
  "workspaceRoot": ".",
  "repoShape": "single-package | monorepo | other",
  "packageManager": "npm | pnpm | yarn | uv | pip | cargo | other",
  "stack": {
    "languages": ["language-id"],
    "frameworks": ["framework-id"],
    "runtimes": ["runtime-id"]
  },
  "sourceRoot": "product-parts",
  "productParts": [
    {
      "partId": "product-part-id",
      "codePath": "product-parts/product-part-id",
      "clusters": [
        {
          "clusterId": "cluster-id",
          "codePath": "product-parts/product-part-id/clusters/cluster-id",
          "modules": [
            {
              "moduleId": "module-id",
              "codePath": "product-parts/product-part-id/clusters/cluster-id/modules/module-id"
            }
          ]
        }
      ],
      "standaloneModules": [
        {
          "moduleId": "module-id",
          "codePath": "product-parts/product-part-id/modules/module-id"
        }
      ]
    }
  ],
  "materializedPaths": [],
  "deferredMaterialization": [],
  "notes": []
}
```

## Validation Rules
- `productParts` must be an array.
- `reviewState` must be `draft`, `accepted`, or `materialized`; it must not be `null`.
- `stack.languages`, `stack.frameworks`, and `stack.runtimes` must be arrays. Do not replace them with scalar fields such as `stack.language`, `stack.framework`, or `stack.runtime`.
- Product Part entries must use `partId`, Cluster entries must use `clusterId`, and Module entries must use `moduleId`. Do not replace these canonical fields with a generic `id`.
- Every generated Product Part must have a mapping or an explicit deferred disposition.
- Every mapped path must be relative, normalized, and inside the workspace.
- `sourceRoot` must point to the production source/scaffold root and must not point under `.codeai-hub/`.
- Unless the user explicitly accepts another root, `sourceRoot` must be `product-parts` and every Product Part root must be `product-parts/<product-part-id>`.
- Explicit upstream technology hints, such as named shell, launcher, runtime, framework, package format, or deployment target, must be treated as strong baseline evidence and either used in the recommended baseline or explicitly explained as a rejected alternative.
- Do not split Product Part roots across implementation-category folders such as `apps/`, `packages/`, or `extensions/` when the Development Tree is organized by Product Part.
- Clustered module paths must be nested under their owning cluster path: `<productPartPath>/clusters/<cluster-id>/modules/<module-id>`.
- Standalone modules must use `standaloneModules`; do not mix cluster-owned modules into a Product Part-level `modules` array.
- Package manifests/workspace entries should exist only at the root workspace and Product Part roots unless the accepted contract explicitly declares a Cluster or Module as its own package.
- `accepted` must stay `false` until the user explicitly accepts the skeleton.
- `materialized` must stay `false` until the workspace filesystem skeleton has actually been created.
- `materializationState` must be one of `not_started`, `in_progress`, `materialized`, `failed`, or `outdated`.
- `accepted: true` without `materialized: true` means the contract is accepted but downstream work is still blocked.
- Materialized Product Part, Cluster, and Module directories must contain tracked `README.md` placeholders or other tracked files; empty directories are not Git-tracked and do not count as committed materialization.
- `materializedPaths` must list real workspace files or directories created or verified during post-acceptance materialization, including tracked placeholders needed to preserve empty scaffold folders in Git.
- `deferredMaterialization` must explain any mapped folder or scaffold element that was intentionally not created.
- After materialization, `application-skeleton.md` must describe the current materialized state and must not keep draft-only/future-tense claims such as "will be created after confirmation".
- Before the final materialization response, the stage must leave the materialized artifacts ready for Core acceptance. Core owns staging, the managed commit, post-commit validation, and downstream unlock.
- Quality gate commands may be proposed in Markdown, but the dedicated Quality Gates stage owns the accepted command contract and gate integration.
