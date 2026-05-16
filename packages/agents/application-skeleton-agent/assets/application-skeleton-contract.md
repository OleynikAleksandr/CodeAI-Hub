# Application Skeleton Contract Reference

## Canonical Files
- `application-skeleton.md`: human-readable technical scaffold decision record and materialization checklist.
- `application-skeleton-map.json`: machine-readable mapping from Development Tree ownership to production code paths and materialization state.

## Step Outcome
- Application Skeleton materialization must produce a code-ready locally installed project foundation, not only a Product Part folder map.
- The step owns stack, package/workspace layout, deterministic install metadata, local clean install execution, minimal source/facade entrypoints, and successful build/typecheck/smoke script execution needed before implementation agents can write code and Quality Gates can run.
- The step owns concrete framework/runtime baseline decisions for visible implementation surfaces such as Project Manager, launcher, desktop shell, webview, frontend, VS Code extension UI, mobile client, browser client, and API server.
- The step does not own quality-gate product selection or integration. Ultracite, Biome, ESLint, Playwright, Vitest, dependency scanners, secret scanners, hooks, CI policy, and similar gate tooling belong to Quality Gates Baseline.
- The agent must not materialize while any stack, runtime, package, build, test, source-layout, or first-wave entrypoint ambiguity remains unresolved.
- The user-visible review artifact is `application-skeleton.md`. JSON is a machine-readable mirror, not the discussion surface. Markdown records the proposed and agreed project foundation: recommendations, incorporated user corrections, answered decisions, agreement status, and unresolved decision status.
- All clarification, questions, and discussion happen in dialogue. A question written into Markdown or `application-skeleton-map.json` is not considered asked.
- The materialized filesystem must mirror the Project Manager Development Tree: Product Parts remain Product Part roots, Clusters remain under their owning Product Part, Cluster Modules remain under their owning Cluster, and standalone Modules remain under their owning Product Part.

## Rewrite Boundary
- Application Skeleton must not assume that child plans, plan scripts, hooks, or automatic commit ownership exist from the `Diagram Modules` entrypoint.
- Git, hooks, workspace plan state, active stage todo-plan state, plan scripts, workflow lifecycle ledgers, and upstream read-only policy are not skeleton materialization output.
- If lifecycle controls are missing or broken, report runtime preflight failure. Do not create, reinstall, repair, rename, or replace them in this stage.

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
  "projectFoundation": {
    "installCommand": "npm ci",
    "requiredScripts": ["build", "typecheck", "test:smoke"],
    "configFiles": [".gitignore", "tsconfig.json"],
    "firstWaveEntrypoints": [
      "product-parts/product-part-id/src/index.ts"
    ]
  },
  "openQuestions": [],
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
- `projectFoundation` must describe the accepted implementation foundation: install command, required scripts, config files, workspace/package layout decisions, and first-wave source/facade entrypoints.
- `openQuestions` must be an array. It must be empty before materialization. Any non-empty entry blocks materialization and must be asked to the user in dialogue.
- When `openQuestions` is non-empty, `application-skeleton.md` must not become a questionnaire. It should record the current proposed/agreed foundation state and make clear that confirmation is not ready until dialogue decisions are resolved, without listing the questions as Markdown prompts.
- User-facing prose in Markdown and `openQuestions` must use the artifact prose language from the runtime language contract. Canonical headings, JSON field names, ids, statuses, paths, and code tokens remain structural and are not localized.
- Product Part entries must use `partId`, Cluster entries must use `clusterId`, and Module entries must use `moduleId`. Do not replace these canonical fields with a generic `id`.
- `productParts` must be a nested tree, not a flat list. The top-level `productParts` array may contain only Product Part entries. Cluster entries must appear only inside their owning Product Part `clusters` array. Cluster-owned Module entries must appear only inside their owning Cluster `modules` array. Standalone Module entries must appear only inside their owning Product Part `standaloneModules` array.
- Every generated Product Part must have a mapping or an explicit deferred disposition.
- Every mapped path must be relative, normalized, and inside the workspace.
- `sourceRoot` must point to the production source/scaffold root and must not point under `.codeai-hub/`.
- Unless the user explicitly accepts another root, `sourceRoot` must be `product-parts` and every Product Part root must be `product-parts/<product-part-id>`.
- The production filesystem tree must preserve the Project Manager Development Tree hierarchy exactly. Do not flatten, rename, regroup, or split Product Parts, Clusters, or Modules to fit a framework convention.
- Explicit upstream technology hints, such as named shell, launcher, runtime, framework, package format, or deployment target, must be treated as strong baseline evidence and either used in the recommended baseline or explicitly explained as a rejected alternative.
- If upstream artifacts include shell, UI, frontend, desktop, webview, launcher, extension UI, mobile client, browser client, or API server surfaces, `stack.frameworks` must include concrete recommended framework/runtime decisions for those surfaces, or `openQuestions` must include a framework/shell-specific dialogue question with the recommended option first.
- Do not represent unresolved framework decisions as accepted prose such as "frameworks are not selected", "not fixed", "pending", "TBD", "unknown", or equivalent wording.
- Do not split Product Part roots across implementation-category folders such as `apps/`, `packages/`, or `extensions/` when the Development Tree is organized by Product Part.
- Clustered module paths must be nested under their owning cluster path: `<productPartPath>/clusters/<cluster-id>/modules/<module-id>`.
- Standalone modules must use `standaloneModules`; do not mix cluster-owned modules into a Product Part-level `modules` array.
- Package manifests/workspace entries should exist only at the root workspace and Product Part roots unless the accepted contract explicitly declares a Cluster or Module as its own package.
- `node_modules` and other install outputs must not be listed as materialized output, but tracked package metadata and lockfiles must be sufficient for a deterministic clean install.
- `node_modules` and other install outputs must not be committed or listed as `materializedPaths`, but they must exist locally after materialization when the selected package manager creates them. For npm foundations, `npm ci` must be executed and root `node_modules` must exist before readiness is claimed.
- Root `.gitignore` must exist after materialization and must ignore dependency install outputs and build outputs. For npm/TypeScript foundations it must cover `node_modules/` and package `dist/` outputs before `npm ci`, build, typecheck, or smoke commands are reported as successful readiness evidence.
- Build outputs such as `dist/`, `build/`, `coverage/`, framework caches, generated maps, and package output files must not be committed and must not be listed in `materializedPaths`.
- When TypeScript is selected, a tracked TypeScript config must exist after materialization.
- Required build/typecheck/smoke scripts must point to real config and source targets. They must not pass only because no source files or compiler targets exist.
- Every script listed in `projectFoundation.requiredScripts` must be executed successfully after the clean install. For npm foundations, run these as `npm run <script>` from the workspace root.
- First-wave implementation packages must expose minimal source entrypoints/facades after materialization so later quality gates validate real targets.
- `accepted` must stay `false` until the user explicitly accepts the skeleton.
- `materialized` must stay `false` until the workspace filesystem skeleton has actually been created.
- `materializationState` must be one of `not_started`, `in_progress`, `materialized`, `failed`, or `outdated`.
- `accepted: true` without `materialized: true` means the contract is accepted but downstream work is still blocked.
- Materialized Product Part, Cluster, and Module directories must contain tracked `README.md` placeholders or other tracked files; empty directories are not Git-tracked and do not count as committed materialization.
- `materializedPaths` must list real workspace files or directories created or verified during post-acceptance materialization, including tracked placeholders needed to preserve empty scaffold folders in Git.
- `deferredMaterialization` must explain any mapped folder or scaffold element that was intentionally not created.
- After materialization, `application-skeleton.md` must describe the current materialized state and must not keep draft-only/future-tense claims such as "will be created after confirmation".
- Before the final materialization response, the stage must leave the materialized artifacts and the local development environment ready for runtime/user review. Do not stage, commit, advance plans, or claim completion beyond readiness.
- The final materialization response must name the successful clean install command and required script commands. If any install/build/typecheck/smoke command fails, the response must report the failure and the map must not claim `materialized: true`.
- Quality gate commands may be mentioned only as downstream examples. The dedicated Quality Gates stage owns current-tooling research, accepted command contract, dependencies for gate tools, hook wiring, CI policy, and gate integration.
