# Quality Gates Contract Reference

## Canonical Files
- `quality-gates.md`: human-readable verification baseline.
- `quality-gates.json`: machine-readable gate command contract.

## JSON Shape
```json
{
  "schema": "codeai-quality-gates-v1",
  "accepted": false,
  "commands": {
    "build": "npm run build",
    "typecheck": "npm run typecheck",
    "lint": "npm run lint",
    "formatCheck": "npm run format:check",
    "test": "npm test"
  },
  "requiredBeforeModuleExecution": ["build", "typecheck", "lint", "test"],
  "requiredBeforeCommit": ["typecheck", "lint", "formatCheck"],
  "unavailable": [],
  "notes": []
}
```

## Validation Rules
- `commands` must be an object.
- Required command names must refer to keys in `commands` or to explicit unavailable/deferred entries.
- The contract must reference the accepted skeleton source roots or package roots in `quality-gates.md`.
- `accepted` must stay `false` until the user explicitly accepts the gate baseline.
- Future implementation agents must be able to cite this contract without inventing build or test commands.
