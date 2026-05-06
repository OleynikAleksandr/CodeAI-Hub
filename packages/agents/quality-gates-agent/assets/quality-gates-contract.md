# Quality Gates Contract Reference

## Canonical Files
- `quality-gates.md`: human-readable verification baseline.
- `quality-gates.json`: machine-readable gate command contract.

## JSON Shape
```json
{
  "schema": "codeai-quality-gates-v1",
  "accepted": false,
  "projectProfile": {
    "domain": "inferred-project-domain",
    "languages": ["inferred-language"],
    "repositoryShape": "single-package | monorepo | other",
    "packagingTarget": "inferred-target-or-null"
  },
  "toolingCandidatesConsidered": [],
  "commands": {
    "build": {
      "command": "<stack-specific build command>",
      "category": "build",
      "blocking": true
    },
    "architecture": {
      "command": "<stack-specific architecture validation command>",
      "category": "architecture",
      "blocking": true
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
  "openDecisions": [],
  "acceptance": {
    "accepted": false,
    "userConfirmationRequired": true
  }
}
```

## Validation Rules
- `commands` must be an object.
- Required command names must refer to keys in `commands`.
- Deferred or unavailable command names must not be listed as active required blockers.
- The contract must reference the accepted skeleton source roots or package roots in `quality-gates.md`.
- `accepted` must stay `false` until the user explicitly accepts the gate baseline.
- The contract must contain enough project profile context for future agents to understand why the selected gates fit this skeleton.
- The contract must identify the selected baseline when multiple variants are present.
- Future implementation agents must be able to cite this contract without inventing build or test commands.
