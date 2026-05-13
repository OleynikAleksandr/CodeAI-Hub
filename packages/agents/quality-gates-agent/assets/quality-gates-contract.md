# Quality Gates Contract Reference

## Canonical Files

- `quality-gates.md`: human-readable gate baseline, tooling rationale, integration plan, open decisions, and acceptance checklist.
- `quality-gates.json`: machine-readable command and integration contract for Core and future workflow/node agents.

## Managed Hook Boundary

- Core owns git setup, the lifecycle baseline inside `.husky` hooks, plan scripts, workspace plan state, active stage todo-plan state, and workflow lifecycle ledgers.
- Quality Gates may create or update accepted gate scripts, configs, package scripts, dev dependencies, CI/update files, `quality-gates.json` manifest fields, and the Quality Gates hook wiring required by accepted `requiredBeforeCommit` / `requiredBeforePush` arrays.
- Preserve Core lifecycle commands such as `plan:validate`. Append Quality Gates hook wiring instead of replacing the hook.
- Hook wiring evidence must include direct `npm run qg:<gate>` calls for every gate id in the accepted `requiredBeforeCommit` / `requiredBeforePush` arrays. Aggregate commands such as `npm run qg:before-commit` / `npm run qg:before-push` may exist as convenience commands, but they are not sufficient evidence by themselves.

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
      "plannedIntegrationPaths": ["package.json", "format/lint config"]
    }
  },
  "requiredBeforeCommit": [],
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

- `commands` must be an object/map keyed by gate id. Do not write it as an array.
- `desiredStatus`: `active`, `planned`, `deferred`, or `advisory`.
- `availability`: `executable`, `not_integrated`, `unavailable`, or `needs_user_decision`.
- `integrationRequired` is `true` when scripts/configs/hooks/devDependencies still need to be created.
- `plannedIntegrationPaths` names the future files or config surfaces Phase 3 will touch.
- `integratedPaths` names real paths created or verified during Phase 3.
- `integratedPaths` must include `.husky/pre-commit` or `.husky/pre-push` when non-empty required hook scopes are wired.
- `deferredIntegration` explains advisory, deferred, or non-required infrastructure intentionally skipped during Phase 3. It must not contain gate ids that remain in required arrays.
- Concrete tools must be selected from user preference, project evidence, or stack-specific research. Otherwise keep the gate category and mark availability as `needs_user_decision`.
- Source files and classes must stay <= 500 lines for every generated product; 400-500 lines is near-limit reporting.

## Validation Rules

- `commands` must be a JSON object keyed by id, not an array.
- Required gate ids must exist in `commands`.
- Advisory gates must not have `blockingIn` phases.
- Deferred or planned gates must not appear in active required arrays.
- A not-integrated active gate must include `integrationRequired: true` and non-empty `plannedIntegrationPaths`.
- `plannedRequiredAfterIntegration` must not duplicate ids already listed in `requiredBeforeCommit`, `requiredBeforeModuleExecution`, `requiredBeforePush`, or `requiredBeforeRelease`.
- Selected tools must appear in tooling rationale, command entries, and planned integration paths.
- `accepted: true` is written by Core after the `docs: accept quality gates contract` commit; the agent must not flip this flag during draft or review.
- `acceptanceCommitted: true` is written by Core after the acceptance commit lands; it gates the Phase 3 integration continuation.
- `integrated: true` requires actual filesystem integration plus smoke evidence.
- `integrated: true` requires explicit lifecycle hook wiring for every non-empty required hook scope.
- Future agents must be able to run or cite gate commands without inventing missing scripts.
