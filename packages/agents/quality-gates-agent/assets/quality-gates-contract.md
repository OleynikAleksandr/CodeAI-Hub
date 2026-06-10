# Quality Gates Contract Reference

## Canonical Files

- `quality-gates.md`: human-readable gate baseline, tooling rationale, integration plan, open decisions, and acceptance checklist.
- `quality-gates.json`: machine-readable command and integration contract for Core and future workflow/node agents.

## Project Hook Boundary

- The orchestration rewrite boundary does not provide automatic commit ownership or child-plan handoff.
- Quality Gates may create or update accepted gate scripts, configs, package scripts, dev dependencies, CI/update files, `quality-gates.json` manifest fields, and the Quality Gates hook wiring required by accepted `requiredBeforeCommit` / `requiredBeforePush` arrays.
- Preserve existing project hook commands such as `plan:validate`. Append Quality Gates hook wiring instead of replacing the hook.
- During Phase 3, required Quality Gates hook calls are agent-owned materialization. They must not be left as deferred to another actor.
- Hook wiring evidence must show that the command of every gate in the accepted `requiredBeforeCommit` / `requiredBeforePush` arrays is reachable from the matching hook, directly or through package scripts the hook calls (aggregate commands count as wiring).

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
- `integratedPaths` must not omit `.husky/pre-commit` / `.husky/pre-push` while `integrated: true` if required hook scopes are non-empty.
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
- `accepted: true` is written only after explicit user/runtime acceptance; the agent must not flip this flag during draft or review.
- `integrated: true` requires actual filesystem integration plus smoke evidence.
- `integrated: true` requires explicit lifecycle hook wiring for every non-empty required hook scope.
- `integrated: true` is invalid if required hook wiring is described as deferred to another actor.
- Future agents must be able to run or cite gate commands without inventing missing scripts.
