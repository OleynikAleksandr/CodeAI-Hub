# Quality Gates Contract Reference

## Canonical Files

- `quality-gates.md`: human-readable gate baseline, tooling rationale, integration plan, open decisions, and acceptance checklist.
- `quality-gates.json`: machine-readable command and integration contract for Core and future Development Tree agents.

## JSON Shape

```json
{
  "schema": "codeai-quality-gates-v1",
  "accepted": false,
  "integrated": false,
  "integrationState": "not_started",
  "selectedBaseline": "recommended",
  "projectProfile": {
    "languages": ["TypeScript"],
    "packageManager": "npm",
    "repositoryShape": "workspace-monorepo-with-product-parts-root",
    "sourceRoots": ["product-parts"]
  },
  "commands": {
    "format-check": {
      "id": "format-check",
      "proposedCommand": "npm run format:check",
      "desiredStatus": "active",
      "availability": "not_integrated",
      "integrationRequired": true,
      "baseline": ["minimal", "recommended", "strict"],
      "blockingIn": ["beforeCommit"],
      "plannedIntegrationPaths": ["package.json", "ultracite config"]
    }
  },
  "requiredBeforeCommit": ["format-check"],
  "requiredBeforeModuleExecution": [],
  "requiredBeforePush": [],
  "requiredBeforeRelease": [],
  "advisory": [],
  "deferred": [],
  "plannedRequiredAfterIntegration": ["format-check"],
  "integratedPaths": [],
  "deferredIntegration": [],
  "verification": []
}
```

## Field Rules

- `desiredStatus`: `active`, `planned`, `deferred`, or `advisory`.
- `availability`: `executable`, `not_integrated`, `unavailable`, or `needs_user_decision`.
- `integrationRequired` is `true` when scripts/configs/hooks/devDependencies still need to be created.
- `plannedIntegrationPaths` names the future files or config surfaces Phase 2 will touch.
- `integratedPaths` names real paths created or verified during Phase 2.
- `deferredIntegration` explains accepted gate infrastructure intentionally skipped during Phase 2.

## Validation Rules

- Required gate ids must exist in `commands`.
- Advisory gates must not have `blockingIn` phases.
- Deferred or planned gates must not appear in active required arrays.
- A not-integrated active gate must include `integrationRequired: true` and non-empty `plannedIntegrationPaths`.
- User-selected tools must appear in tooling rationale, command entries, and planned integration paths.
- `accepted: true` requires explicit user acceptance.
- `integrated: true` requires actual filesystem integration plus smoke evidence.
- Future agents must be able to run or cite gate commands without inventing missing scripts.
