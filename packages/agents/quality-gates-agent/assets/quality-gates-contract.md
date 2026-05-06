# Quality Gates Contract Reference

## Canonical Files
- `quality-gates.md`: human-readable verification baseline.
- `quality-gates.json`: machine-readable gate command contract.

## JSON Shape
```json
{
  "schema": "codeai-quality-gates-v1",
  "accepted": false,
  "reviewState": "draft",
  "integrated": false,
  "integrationState": "not_started",
  "projectProfile": {
    "domain": "inferred-project-domain",
    "languages": ["inferred-language"],
    "repositoryShape": "single-package | monorepo | other",
    "packagingTarget": "inferred-target-or-null"
  },
  "toolingCandidatesConsidered": [],
  "commands": {
    "build": {
      "id": "build",
      "proposedCommand": "<stack-specific build command>",
      "category": "build",
      "status": "active",
      "baseline": ["minimal", "recommended", "strict"],
      "blockingIn": ["beforeModuleExecution", "beforePush", "beforeRelease"]
    },
    "architecture": {
      "id": "architecture",
      "proposedCommand": "<stack-specific architecture validation command>",
      "category": "architecture",
      "status": "active",
      "baseline": ["minimal", "recommended", "strict"],
      "blockingIn": ["beforeModuleExecution", "beforeCommit", "beforePush", "beforeRelease"]
    },
    "coverage": {
      "id": "coverage",
      "proposedCommand": "<stack-specific coverage command>",
      "category": "coverage",
      "status": "plannedAfterMaterialization",
      "baseline": ["strict"],
      "blockingIn": ["beforeRelease"]
    }
  },
  "variants": {
    "minimal": {
      "blocking": [],
      "advisory": [],
      "deferred": []
    },
    "recommended": {
      "blocking": [],
      "advisory": [],
      "deferred": []
    },
    "strict": {
      "blocking": [],
      "advisory": [],
      "deferred": []
    }
  },
  "selectedBaseline": "recommended",
  "requiredBeforeModuleExecution": ["build", "architecture"],
  "requiredBeforeCommit": ["architecture"],
  "requiredBeforePush": ["build", "architecture"],
  "requiredBeforeRelease": ["build", "architecture"],
  "advisory": [],
  "deferredUntilMaterialization": [],
  "plannedRequiredAfterMaterialization": [],
  "integratedPaths": [],
  "deferredIntegration": [],
  "openDecisions": [],
  "acceptance": {
    "accepted": false,
    "userConfirmationRequired": true
  }
}
```

## Validation Rules
- `commands` must be an object.
- Each command entry should separate stable identity from execution details with `id`, `proposedCommand`, `status`, `baseline`, and `blockingIn`.
- Supported statuses are `active`, `plannedAfterMaterialization`, `deferred`, and `advisory`.
- Required command names must refer to keys in `commands`.
- Active required command names must have `status: "active"` and must belong to `selectedBaseline`.
- `integrated` must stay `false` until the accepted gate baseline has actually been written into the materialized workspace skeleton.
- `integrationState` must be one of `not_started`, `in_progress`, `integrated`, `failed`, or `outdated`.
- `accepted: true` without `integrated: true` means the gate baseline is accepted but Development Tree sessions are still blocked.
- `integratedPaths` must list real workspace paths created or verified during post-acceptance gate integration.
- `deferredIntegration` must explain any accepted gate/tooling file that was intentionally not created.
- Strict-only gates must not be listed in active required arrays unless `selectedBaseline` is `strict`.
- Deferred, advisory, or planned-after-materialization command names must not be listed as active required blockers.
- The contract must reference the accepted skeleton source roots or package roots in `quality-gates.md`.
- `accepted` must stay `false` until the user explicitly accepts the gate baseline.
- The contract must contain enough project profile context for future agents to understand why the selected gates fit this skeleton.
- The contract must identify the selected baseline when multiple variants are present.
- A gate that requires user confirmation must stay `advisory` or `plannedAfterMaterialization` until confirmed.
- Future implementation agents must be able to cite this contract without inventing build or test commands.
