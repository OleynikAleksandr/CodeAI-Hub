# Plan Orchestrator Runtime Guardrails Hotfix

**Status:** active implementation planning
**Created:** 2026-05-07

## Problem

Live dogfooding exposed two unsafe plan-orchestrator behaviors:

1. A failed `plan:commit` can leave a commit-pending debt state that is only recoverable if the agent manually notices and runs `plan:repair`.
2. A plan can accidentally contain an orphan `IN_PROGRESS` task outside `currentTaskId`; after a later commit, the post-commit updater may find no valid next task and move the scope to terminal `NONE` without explicit user acceptance.

Both cases are unacceptable in Core-managed workflow sessions. The orchestrator must fail loudly, keep recovery deterministic, and never silently close an execution scope.

## Required Fix

- Active plans must have exactly one non-commit `IN_PROGRESS` task, and it must match `currentTaskId`.
- Post-commit advancement must refuse implicit terminal closeout unless the next task is the explicit reserved post-closeout anchor.
- Plan CLI failures must print an actionable recovery hint so an agent can repair or stop instead of hanging the workflow.

## Verification

- Targeted plan-orchestrator tests for validator, markdown updater, and CLI/recovery behavior.
- `npm run plan:validate`
- No release build until the user explicitly confirms packaging.

## Test Evidence

2026-05-07 targeted verification passed:

- `node --test scripts/plan-orchestrator/plan-validator.test.mjs`
- `node --test scripts/plan-orchestrator/plan-markdown-updater.test.mjs`
- `node --test scripts/plan-orchestrator/plan-repair.test.mjs`
- `npm exec -- tsx --test packages/core/src/managed-workspace/managed-workspace-validator.test.ts`
- `npm exec -- tsx --test packages/core/src/provider-registry/provider-descriptor-factory.test.ts`
- `npm exec -- tsx --test packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.test.ts`
- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts`
- `npm run plan:validate`

2026-05-07 follow-up verification passed after live Quality Gates retest:

- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts`
- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`
- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`
- `npm exec -- tsx --test packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts`
- `npm exec -- tsx --test packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.test.ts`
- `npm run plan:validate`

## Retest Finding

2026-05-08 live managed workspace retest reached Quality Gates integration, but
Core only blocked Development Tree bootstrap when hook integration validation
failed. The runtime must send actionable acceptance feedback back to the owning
Quality Gates workflow session so the agent can repair the missing lifecycle
hook wiring in the same stage instead of leaving the user with a silent
downstream lock.

2026-05-08 acceptance feedback verification passed:

- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`
- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts`
- `npm run plan:validate`

2026-05-08 managed stage feedback parity verification passed:

- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`
- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts`
- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts`
- `npm run plan:validate`

2026-05-08 Quality Gates aggregate hook follow-up verification passed:

- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts packages/core/src/templates/quality-gates-bundled-templates.test.ts packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts`
- `npm run plan:validate`
- Live retest workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4` evaluates to `qualityGatesProgress.integrated: true` and `developmentTreeBootstrapGate.unlocked: true` with aggregate `qg:before-commit` / `qg:before-push` hook wiring.

2026-05-08 repair-aware managed feedback verification passed:

- `npm exec -- tsx --test packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`
- `npm run plan:validate`
