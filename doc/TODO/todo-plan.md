# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-cluster-contract-subagent-orchestration-2026-06-08",
  "branch": "main",
  "baseHead": "b90dba86c",
  "lastRecordedCommit": "c852b522b",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md",
  "currentTaskId": "development-tree-cluster-contract.phase36.projected-live-refresh-verify.task1",
  "expectedCommitMessage": "test: verify projected cluster live state builds",
  "debt": {
    "expectedCommitMessage": "test: verify projected cluster live state builds",
    "preCommitHead": "c852b522b",
    "stage": "commit_pending",
    "taskId": "development-tree-cluster-contract.phase36.projected-live-refresh-verify.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the recovery context source for this execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation task must touch no more than 3 files/packages.
- Every implementation task is followed by a separate `Git Commit: ...` item.
- Use `npm run plan:commit -- "<expected commit message>"` for normal commit workflow.
- Do not bypass Husky hooks or quality gates.
- Keep `SystemArchitecture.md`, `WorkflowSteps_Overview.md`, `CoreOrchestrator.md`, and `Project_Manager.md` synchronized when behavior changes.
- Release build is not automatic. Ask the user before release notes, version bump, `build-all.sh`, or `build-release.sh`.
- Final scope goal: a working FinderWidget flow where accepted `DevelopmentOrderPlan.v2` opens the first cluster-contract sub-agent for `note-selection-cluster`, creates and validates cluster specification/facade artifacts, returns the result through lead Product Part coordination, and exposes the state in Project Manager.

## Phase 0 - Scope Intake (owner: Codex, updated: 2026-06-08)

### Stream: Active Plan Setup

1. [DONE] `development-tree-cluster-contract.phase0.plan.task1` Create the active execution plan for Development Tree cluster-contract sub-agent orchestration (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: start cluster contract subagent orchestration plan`).
2. [DONE] Git Commit: `docs: start cluster contract subagent orchestration plan` (hash: f5dbcd7a4)

## Phase 1 - DevelopmentOrderPlan.v2 Contract (owner: Codex, updated: 2026-06-08)

### Stream: Core-Readable Order Plan

3. [DONE] `development-tree-cluster-contract.phase1.contract.task1` Add the `DevelopmentOrderPlan.v2` parser/validator contract for required briefs, qualified node ids, waves, locked nodes, and first-wave unlockability (scope: `packages/core/src/development-tree/product-part-workflow/development-order-plan-v2-contract.ts, packages/core/src/development-tree/product-part-workflow/development-order-plan-v2-contract.test.ts, packages/core/src/remote-bridge/handlers/product-part-development-order-plan-turn-controller.ts`; expected commit: `feat: validate development order plan v2`).
4. [DONE] Git Commit: `feat: validate development order plan v2` (hash: 90cb0bf37)
5. [DONE] `development-tree-cluster-contract.phase1.prompt.task1` Update the lead Product Part order-plan assignment so the agent writes `DevelopmentOrderPlan.v2` markdown plus JSON unlock contract instead of the v1 recommendation shape (scope: `packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `feat: request development order plan v2`).
6. [DONE] Git Commit: `feat: request development order plan v2` (hash: 0a1b1b8ab)

## Phase 2 - Lead Product Part Coordination State (owner: Codex, updated: 2026-06-08)

### Stream: Downstream Coordination Instead Of Immediate Return

7. [DONE] `development-tree-cluster-contract.phase2.lead-plan.task1` Change lead Product Part managed plan advancement so accepted `DevelopmentOrderPlan.v2` opens a downstream coordination phase and moves `User Return And Revisions` to the final assembled/paused Product Part boundary (scope: `packages/core/src/development-tree/product-part-workflow/product-part-development-brief-plan-writer.ts, packages/core/src/remote-bridge/handlers/product-part-development-order-plan-review-controller.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts`; expected commit: `feat: keep lead product part in downstream coordination`).
8. [DONE] Git Commit: `feat: keep lead product part in downstream coordination` (hash: 578bf28e7)
9. [DONE] `development-tree-cluster-contract.phase2.unlock-state.task1` Persist accepted order-plan unlock state for first-wave cluster/standalone module nodes, including locked reasons for later module nodes (scope: `packages/core/src/development-tree/product-part-workflow/development-order-plan-unlock-state.ts, packages/core/src/remote-bridge/handlers/product-part-development-order-plan-review-controller.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts`; expected commit: `feat: persist development order unlock state`).
10. [DONE] Git Commit: `feat: persist development order unlock state` (hash: 2318c01ce)

## Phase 3 - Cluster Sub-Agent Worktree Bootstrap (owner: Codex, updated: 2026-06-08)

### Stream: Worktree And Managed Plan Scaffolding

11. [DONE] `development-tree-cluster-contract.phase3.worktree.task1` Add Development Tree sub-agent worktree/branch creation support for cluster-contract nodes, with deterministic branch/worktree naming from Product Part and cluster ids (scope: `packages/core/src/development-tree/node-bootstrap/development-tree-node-worktree-service.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-worktree-service.test.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.ts`; expected commit: `feat: create development tree cluster worktrees`).
12. [DONE] Git Commit: `feat: create development tree cluster worktrees` (hash: 343846e8f)
13. [DONE] `development-tree-cluster-contract.phase3.cluster-plan.task1` Create the Core-owned managed plan writer for cluster-contract sub-agents, including specification/facade draft, review, merge-ready, and return/revision phases (scope: `packages/core/src/development-tree/cluster-workflow/cluster-contract-plan-writer.ts, packages/core/src/development-tree/cluster-workflow/cluster-contract-plan-writer.test.ts, doc/TODO/todo-plan.md`; expected commit: `feat: write cluster contract managed plans`).
14. [DONE] Git Commit: `feat: write cluster contract managed plans` (hash: e144a238f)
15. [DONE] `development-tree-cluster-contract.phase3.bootstrap.task1` Bootstrap the first unlocked cluster-contract sub-agent from accepted order-plan unlock state, creating its worktree, managed plan, and provider session without opening module agents yet (scope: `packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.ts, packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.ts`; expected commit: `feat: bootstrap cluster contract subagents`).
16. [DONE] Git Commit: `feat: bootstrap cluster contract subagents` (hash: 42042271d)

## Phase 4 - Cluster Contract Artifact Lifecycle (owner: Codex, updated: 2026-06-08)

### Stream: Prompt, Draft Commit, And Review

17. [DONE] `development-tree-cluster-contract.phase4.prompt.task1` Add the cluster-contract first prompt builder with inline Product Part brief, accepted order-plan context, skeleton/gates constraints, and explicit artifact targets for `ClusterSpecification` and `ClusterFacadeContract` markdown/json files (scope: `packages/core/src/development-tree/cluster-workflow/cluster-contract-prompt-builder.ts, packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.ts, packages/core/src/development-tree/cluster-workflow/cluster-contract-prompt-builder.test.ts`; expected commit: `feat: build cluster contract subagent prompts`).
18. [DONE] Git Commit: `feat: build cluster contract subagent prompts` (hash: 44dc4ff20)
19. [DONE] `development-tree-cluster-contract.phase4.turn.task1` Add the cluster-contract turn controller that validates generated specification/facade artifacts, commits them inside the cluster worktree, and opens the user/lead review gate (scope: `packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.test.ts`; expected commit: `feat: open cluster contract review`).
20. [DONE] Git Commit: `feat: open cluster contract review` (hash: 56d5211ab)
21. [DONE] `development-tree-cluster-contract.phase4.review.task1` Add cluster-contract review handling so ordinary user/lead messages request sub-agent revisions while explicit acceptance records a merge-ready result and summary for lead Product Part coordination (scope: `packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.test.ts`; expected commit: `feat: accept cluster contract review results`).
22. [DONE] Git Commit: `feat: accept cluster contract review results` (hash: dd6dd11bd)

## Phase 5 - Lead Coordination And Merge (owner: Codex, updated: 2026-06-08)

### Stream: Result Summary And Mainline Merge

23. [DONE] `development-tree-cluster-contract.phase5.lead-summary.task1` Feed accepted cluster-contract summaries back into the lead Product Part coordination plan so the lead agent can accept, reject, or request revisions at node level (scope: `packages/core/src/development-tree/product-part-workflow/lead-product-part-coordination-service.ts, packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.ts, packages/core/src/development-tree/product-part-workflow/lead-product-part-coordination-service.test.ts`; expected commit: `feat: summarize cluster contract results for lead coordination`).
24. [DONE] Git Commit: `feat: summarize cluster contract results for lead coordination` (hash: 8733bb0ea)
25. [DONE] `development-tree-cluster-contract.phase5.merge.task1` Add Core-owned merge for accepted cluster-contract worktree results back into the main workspace with merge evidence, clean Git assertions, and node-level rollback boundary metadata (scope: `packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.ts, packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.test.ts`; expected commit: `feat: merge accepted cluster contract worktrees`).
26. [DONE] Git Commit: `feat: merge accepted cluster contract worktrees` (hash: cba34ebfa)
27. [DONE] `development-tree-cluster-contract.phase5.advance.task1` Advance the lead Product Part coordination graph after cluster-contract merge, marking `note-selection-cluster` merged and keeping module nodes locked until the accepted cluster contract can unlock the next module-contract wave (scope: `packages/core/src/development-tree/product-part-workflow/development-order-plan-unlock-state.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.test.ts`; expected commit: `feat: advance lead coordination after cluster merge`).
28. [DONE] Git Commit: `feat: advance lead coordination after cluster merge` (hash: 83b46cae4)

## Phase 6 - Project Manager Coordination Projection (owner: Codex, updated: 2026-06-08)

### Stream: One Visible Product Part Graph

29. [DONE] `development-tree-cluster-contract.phase6.core-readmodel.task1` Expose Product Part coordination graph state through the Core workflow-state read model, including unlocked/running/review/merge-ready/merged/locked node statuses and worktree references (scope: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`; expected commit: `feat: expose product part coordination graph state`).
30. [DONE] Git Commit: `feat: expose product part coordination graph state` (hash: f82c427c1)
31. [DONE] `development-tree-cluster-contract.phase6.pm-ui.task1` Render the Product Part coordination graph in Project Manager and route cluster-contract node actions to Core while keeping sub-agent technical state hidden by default (scope: `src/client/project-manager/services/workflow-state-development-tree-client.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`; expected commit: `feat: show cluster contract coordination graph`).
32. [DONE] Git Commit: `feat: show cluster contract coordination graph` (hash: 6bb6727b6)

## Phase 7 - Documentation Sync (owner: Codex, updated: 2026-06-08)

### Stream: SSOT Updates

33. [DONE] `development-tree-cluster-contract.phase7.docs.task1` Synchronize SSOT documentation for `DevelopmentOrderPlan.v2`, lead Product Part downstream coordination, cluster-contract sub-agent worktrees, user-visible Product Part graph, and node-level rollback gates (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit: `docs: describe cluster contract subagent orchestration`).
34. [DONE] Git Commit: `docs: describe cluster contract subagent orchestration` (hash: 31f4e0859)
35. [DONE] `development-tree-cluster-contract.phase7.pm-docs.task1` Document the Project Manager projection and user workflow for one Product Part coordination surface with optional sub-agent detail drill-in (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe product part coordination projection`).
36. [DONE] Git Commit: `docs: describe product part coordination projection` (hash: 5486d541c)

## Phase 8 - Tooling Verification (owner: Codex, updated: 2026-06-08)

### Stream: Targeted Verification

37. [DONE] `development-tree-cluster-contract.phase8.verify.task1` Run targeted Core and Project Manager verification for order-plan v2 validation, first-wave cluster bootstrap, cluster artifact review, worktree merge, and coordination graph projection (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify cluster contract subagent orchestration`).
38. [DONE] Git Commit: `test: verify cluster contract subagent orchestration` (hash: d57bfd3eb)

Verification evidence:
- `npm run build --workspace packages/core` passed.
- `node --test ...development-order-plan-v2-contract.test.js ...product-part-development-brief-turn-controller.test.js ...cluster-contract-agent-bootstrapper.test.js ...cluster-contract-prompt-builder.test.js ...cluster-contract-turn-controller.test.js ...cluster-contract-review-controller.test.js ...development-tree-node-merge-service.test.js ...development-tree-snapshot.test.js` passed: 22/22 tests.
- `npm run typecheck:webview` passed.
- `npm run build:project-manager` passed.

## Phase 9 - Release Build (owner: Codex, updated: 2026-06-08)

### Stream: Release Build Confirmation

39. [DONE] `development-tree-cluster-contract.phase9.release-confirm.task1` Ask the user for explicit confirmation before preparing release notes, bumping versions, running `build-all.sh`, or packaging VSIX (scope: user workflow; expected commit: none). Result: release build explicitly confirmed by user request for this scope

### Stream: Release After Confirmation

40. [DONE] `development-tree-cluster-contract.phase9.release-notes.task1` Prepare release notes for the next version after explicit release confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare cluster contract subagent release notes`).
41. [DONE] Git Commit: `docs: prepare cluster contract subagent release notes` (hash: 24435a9b8)
42. [DONE] `development-tree-cluster-contract.phase9.release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint cluster contract subagent release build state`).
43. [DONE] Git Commit: `docs: checkpoint cluster contract subagent release build state` (hash: 94cb9c6a9)
44. [DONE] `development-tree-cluster-contract.phase9.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare cluster contract subagent unified release artifacts`).
45. [DONE] Git Commit: `build: prepare cluster contract subagent unified release artifacts` (hash: 3d9bb86d1)
46. [DONE] `development-tree-cluster-contract.phase9.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package cluster contract subagent vsix release`).
47. [DONE] Git Commit: `build: package cluster contract subagent vsix release` (hash: 8adc151a0)

## Phase 10 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-08)

### Stream: FinderWidget Cluster Contract Retest

48. [BLOCKED] `development-tree-cluster-contract.phase10.user.task1` User installs the release and retests FinderWidget end-to-end: accepted lead `DevelopmentOrderPlan.v2` opens the `note-selection-cluster` cluster-contract sub-agent, the agent creates `ClusterSpecification` and `ClusterFacadeContract` markdown/json artifacts, Core validates and commits them, acceptance returns a merge-ready result to lead Product Part coordination, Core merges the worktree result, and Project Manager shows the Product Part coordination graph with cluster merged and module nodes still locked until the next wave (scope: user workflow; expected commit: none). Blocker: 2026-06-08 retest showed rejected lead `DevelopmentOrderPlan.draft.json` only emits `managed-workflow-validation`; no internal repair prompt is dispatched back to the agent.

### Stream: Lead Order Plan Repair Continuation

49. [DONE] `development-tree-cluster-contract.phase10.repair-continuation.task1` Dispatch an internal repair prompt when lead Product Part `DevelopmentOrderPlan.v2` validation fails instead of settling after the Core refusal message (scope: `packages/core/src/remote-bridge/handlers/product-part-development-order-plan-turn-controller.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, doc/TODO/todo-plan.md`; expected commit: `fix: continue lead order plan repair after validation failure`).
50. [DONE] Git Commit: `fix: continue lead order plan repair after validation failure` (hash: 4cd5b724e)
51. [DONE] `development-tree-cluster-contract.phase10.repair-test.task1` Add targeted regression coverage for the lead order-plan validation repair continuation path (scope: `packages/core/src/remote-bridge/handlers/product-part-development-order-plan-turn-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify lead order plan repair continuation`).
52. [DONE] Git Commit: `test: verify lead order plan repair continuation` (hash: b2ce4bf1e)
53. [DONE] `development-tree-cluster-contract.phase10.release-confirm.task1` Ask the user for explicit confirmation before building the next regression-fix release (scope: user workflow; expected commit: none). Result: user explicitly confirmed regression-fix release build

### Stream: Regression Fix Release

54. [DONE] `development-tree-cluster-contract.phase10.release-notes.task1` Prepare release notes for the lead order-plan repair continuation regression fix (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare lead order plan repair release notes`).
55. [DONE] Git Commit: `docs: prepare lead order plan repair release notes` (hash: 6a0074c1d)
56. [DONE] `development-tree-cluster-contract.phase10.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the regression-fix release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare lead order plan repair release artifacts`).
57. [DONE] Git Commit: `build: prepare lead order plan repair release artifacts` (hash: 310b10602)
58. [DONE] `development-tree-cluster-contract.phase10.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output for the regression-fix release (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package lead order plan repair vsix release`).
59. [DONE] Git Commit: `build: package lead order plan repair vsix release` (hash: bd8c1e7f6)
60. [BLOCKED] `development-tree-cluster-contract.phase10.user-retest.task1` User installs the regression-fix release and retests the FinderWidget lead order-plan repair flow through cluster-contract sub-agent startup (scope: user workflow; expected commit: none). Blocker: 2026-06-08 retest showed the repair continuation works, but the initial lead `DevelopmentOrderPlan.v2` assignment still contains an incomplete node-id example, so the agent first writes invalid standalone module ids and only succeeds after Core repair.

### Stream: Lead Order Plan Initial Prompt Repair

61. [DONE] `development-tree-cluster-contract.phase10.initial-prompt.task1` Clarify the initial lead `DevelopmentOrderPlan.v2` assignment prompt with exact cluster, cluster-module, and standalone-module node id shapes before repair is needed (scope: `packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.ts, doc/TODO/todo-plan.md`; expected commit: `fix: clarify lead order plan initial prompt node ids`).
62. [DONE] Git Commit: `fix: clarify lead order plan initial prompt node ids` (hash: edddee5c5)
63. [DONE] `development-tree-cluster-contract.phase10.initial-prompt-test.task1` Add targeted regression coverage proving the initial lead order-plan prompt includes standalone-module node guidance and a parseable v2 example (scope: `packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.prompt.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify lead order plan initial prompt node ids`).
64. [DONE] Git Commit: `test: verify lead order plan initial prompt node ids` (hash: a8bbedab6)
65. [DONE] `development-tree-cluster-contract.phase10.next-release-confirm.task1` Ask the user for explicit confirmation before building the next initial-prompt regression-fix release (scope: user workflow; expected commit: none). Result: user explicitly confirmed continuing fixes and building the next release.

### Stream: Accepted Order Plan First Wave Bootstrap

66. [DONE] `development-tree-cluster-contract.phase10.order-plan-wave-signal.task1` Return a typed first-wave bootstrap signal when lead `DevelopmentOrderPlan.v2` review acceptance materializes unlock-state (scope: `packages/core/src/remote-bridge/handlers/product-part-development-order-plan-review-controller.ts, doc/TODO/todo-plan.md`; expected commit: `fix: signal order plan first wave bootstrap`).
67. [DONE] Git Commit: `fix: signal order plan first wave bootstrap` (hash: 91229c20c)
68. [DONE] `development-tree-cluster-contract.phase10.order-plan-wave-handler.task1` Route Product Part managed review acceptance through a helper that dispatches internal lead prompts and starts first-wave cluster bootstrap when the typed signal is present (scope: `packages/core/src/remote-bridge/handlers/product-part-managed-review-decision-handler.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, doc/TODO/todo-plan.md`; expected commit: `fix: handle product part first wave bootstrap`).
69. [DONE] Git Commit: `fix: handle product part first wave bootstrap` (hash: 4563691f3)
70. [DONE] `development-tree-cluster-contract.phase10.order-plan-wave-gateway.task1` Wire the Development Tree agent gateway into user-review session actions so cluster-contract worktrees and sessions can be created after order-plan acceptance (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts, packages/core/src/remote-bridge/handlers/session-request-handler.ts, doc/TODO/todo-plan.md`; expected commit: `fix: wire order plan first wave bootstrap gateway`).
71. [DONE] Git Commit: `fix: wire order plan first wave bootstrap gateway` (hash: 620882b5a)
72. [DONE] `development-tree-cluster-contract.phase10.order-plan-wave-test.task1` Add targeted regression coverage proving Product Part order-plan acceptance creates the unlocked cluster-contract session and sends the first cluster prompt (scope: `packages/core/src/remote-bridge/handlers/product-part-managed-review-decision-handler.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify cluster wave starts after order plan acceptance`).
73. [DONE] Git Commit: `test: verify cluster wave starts after order plan acceptance` (hash: b1721b877)

### Stream: Final Regression Fix Release

74. [DONE] `development-tree-cluster-contract.phase10.final-release-notes.task1` Prepare release notes for the lead order-plan initial prompt and first-wave bootstrap regression fixes after explicit release confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare lead order plan wave bootstrap release notes`).
75. [DONE] Git Commit: `docs: prepare lead order plan wave bootstrap release notes` (hash: 9b4a01aeb)
76. [DONE] `development-tree-cluster-contract.phase10.final-release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint lead order plan wave bootstrap release build state`).
77. [DONE] Git Commit: `docs: checkpoint lead order plan wave bootstrap release build state` (hash: 0dbf72a28)
78. [DONE] `development-tree-cluster-contract.phase10.final-build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the final regression-fix release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare lead order plan wave bootstrap release artifacts`).
79. [DONE] Git Commit: `build: prepare lead order plan wave bootstrap release artifacts` (hash: f3d5c06d2)
80. [DONE] `development-tree-cluster-contract.phase10.final-vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output for the final regression-fix release (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package lead order plan wave bootstrap vsix release`).
81. [DONE] Git Commit: `build: package lead order plan wave bootstrap vsix release` (hash: 3feaa4654)

## Phase 11 - Final Release Acceptance Testing (owner: user, updated: 2026-06-08)

### Stream: Lead Order Plan First Wave Retest

82. [BLOCKED] `development-tree-cluster-contract.phase11.final-user-retest.task1` User installs release `1.2.473` and retests the FinderWidget lead Product Part workflow: after accepted `DevelopmentOrderPlan.v2`, Core must start the first unlocked cluster-contract wave, create the cluster worktree/session, show the cluster agent first prompt, and keep the main Product Part session available for coordination (scope: user workflow; expected commit: none). Blocker: 2026-06-08 retest showed the first cluster-contract wave starts, but the new worktree session falls back to unsupported Codex model `gpt-5.3-codex` and the provider rejects the first turn.

### Stream: Codex Model Binding Regression Fix

83. [DONE] `development-tree-cluster-contract.phase11.codex-model-registry.task1` Remove unsupported Codex model `gpt-5.3-codex` from active/default registries used by settings and runtime model resolution (scope: `src/types/codex-model-registry.ts, packages/core/src/config/provider-defaults-resolver.ts, packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts`; expected commit: `fix: remove unsupported codex model from defaults`).
84. [DONE] Git Commit: `fix: remove unsupported codex model from defaults` (hash: 8f469293f)
85. [DONE] `development-tree-cluster-contract.phase11.codex-model-profile.task1` Remove unsupported Codex model `gpt-5.3-codex` from runtime capabilities and model invocation compatibility profiles (scope: `packages/Codex_AppServer_Module/src/types/codex-model-capabilities.ts, packages/core/src/model-invocation/model-invocation-profile-resolver.ts, doc/TODO/todo-plan.md`; expected commit: `fix: align codex model profiles with supported models`).
86. [DONE] Git Commit: `fix: align codex model profiles with supported models` (hash: 39df62d2f)
87. [DONE] `development-tree-cluster-contract.phase11.codex-runtime-fallback.task1` Replace remaining active runtime fallback defaults that can still select unsupported `gpt-5.3-codex` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts`; expected commit: `fix: remove unsupported codex runtime fallbacks`).
88. [DONE] Git Commit: `fix: remove unsupported codex runtime fallbacks` (hash: 623a795a5)
89. [DONE] `development-tree-cluster-contract.phase11.codex-capture-selection.task1` Replace Project Manager native capture defaults and typed tests that still use unsupported `gpt-5.3-codex` (scope: `src/client/project-manager/components/capture-workbench/selection-bar.tsx, src/client/project-manager/components/capture-workbench/model-reasoning-selectors.tsx, src/client/project-manager/components/settings/native-request-capture-runner.test.ts`; expected commit: `fix: remove unsupported codex capture selection`).
90. [DONE] Git Commit: `fix: remove unsupported codex capture selection` (hash: a833c4850)
91. [DONE] `development-tree-cluster-contract.phase11.workflow-model-boundary.task1` Allow workflow-created sessions to receive an inherited model binding instead of always resolving settings from the target workspace (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-callbacks.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-types.ts`; expected commit: `fix: pass inherited model through workflow session creation`).
92. [DONE] Git Commit: `fix: pass inherited model through workflow session creation` (hash: c88dfab2e)
93. [DONE] `development-tree-cluster-contract.phase11.downstream-model-binding.task1` Make automatically bootstrapped cluster-contract sessions pass the accepted Product Part session model binding into workflow session creation (scope: `packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.ts, packages/core/src/remote-bridge/handlers/product-part-managed-review-decision-handler.ts, packages/core/src/remote-bridge/handlers/product-part-managed-review-decision-handler.test.ts`; expected commit: `fix: inherit product part model for cluster contract sessions`).
94. [DONE] Git Commit: `fix: inherit product part model for cluster contract sessions` (hash: 6d1c98f0d)
95. [DONE] `development-tree-cluster-contract.phase11.codex-settings-migration.task1` Migrate persisted Codex settings away from unsupported `gpt-5.3-codex` defaults and stale reasoning entries (scope: `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts, packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: migrate unsupported codex model settings`).
96. [DONE] Git Commit: `fix: migrate unsupported codex model settings` (hash: 4ed702f77)
97. [DONE] `development-tree-cluster-contract.phase11.product-part-coordination-commit-pair.task1` Ensure lead Product Part Downstream Coordination todo-plan entries are commit-backed and existing accepted plans are repaired when Core advances to Phase 5 (scope: `packages/core/src/development-tree/product-part-workflow/product-part-development-brief-plan-writer.ts, packages/core/src/remote-bridge/handlers/product-part-development-order-plan-review-controller.ts, doc/TODO/todo-plan.md`; expected commit: `fix: add product part coordination commit pair`).
98. [DONE] Git Commit: `fix: add product part coordination commit pair` (hash: c6bd69623)
99. [DONE] `development-tree-cluster-contract.phase11.product-part-clear-worktrees.task1` Remove downstream Development Tree worktrees when Clear&Do restarts a Product Part root node (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-product-part-restart.ts, packages/core/src/remote-bridge/handlers/product-part-worktree-cleanup.ts, doc/TODO/todo-plan.md`; expected commit: `fix: clear product part downstream worktrees`).
100. [DONE] Git Commit: `fix: clear product part downstream worktrees` (hash: d85a411ae)
101. [DONE] `development-tree-cluster-contract.phase11.product-part-clear-worktree-root.task1` Prune the top-level workspace `.worktrees` directory when Product Part Clear&Do removes the last downstream worktree (scope: `packages/core/src/remote-bridge/handlers/product-part-worktree-cleanup.ts, doc/TODO/todo-plan.md`; expected commit: `fix: prune empty product part worktree roots`).
102. [DONE] Git Commit: `fix: prune empty product part worktree roots` (hash: 4b3aeeb12)
103. [DONE] `development-tree-cluster-contract.phase11.downstream-model-build.task1` Run targeted builds/tests for Codex model registry cleanup, Product Part coordination plan repair, Product Part Clear&Do worktree cleanup, and downstream cluster-contract model inheritance (scope: `packages/core, packages/Codex_AppServer_Module, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify product part restart workflow`).
104. [DONE] Git Commit: `test: verify product part restart workflow` (hash: 0b11377d2)

## Phase 12 - Regression Fix Release Build (owner: Codex, updated: 2026-06-08)

### Stream: Release Build Confirmation

105. [DONE] `development-tree-cluster-contract.phase12.release-confirm.task1` User explicitly confirmed release build for the downstream model binding, Product Part coordination plan, and Clear&Do worktree cleanup fixes; prepare release notes, bump versions, run `build-all.sh`, and package VSIX (scope: user workflow; expected commit: none). Result: User explicitly confirmed the regression-fix release build in chat; release tasks will proceed.

### Stream: Release After Confirmation

106. [DONE] `development-tree-cluster-contract.phase12.release-notes.task1` Prepare release notes for the downstream model binding, Product Part coordination plan, and Clear&Do worktree cleanup fixes (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare product part restart release notes`).
107. [DONE] Git Commit: `docs: prepare product part restart release notes` (hash: 84f17ad76)
108. [DONE] `development-tree-cluster-contract.phase12.release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint product part restart release build state`).
109. [DONE] Git Commit: `docs: checkpoint product part restart release build state` (hash: 6bcd2a7eb)
110. [DONE] `development-tree-cluster-contract.phase12.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `build: prepare product part restart release artifacts`).
111. [DONE] Git Commit: `build: prepare product part restart release artifacts` (hash: b48819d3c)
112. [DONE] `development-tree-cluster-contract.phase12.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package product part restart vsix release`).
113. [DONE] Git Commit: `build: package product part restart vsix release` (hash: 11d85f15a)

Release evidence:
- `./scripts/build-release.sh --use-current-version` passed for `1.2.474`.
- Output VSIX: `codeai-hub-1.2.474.vsix` (5.0M).
- Required release markers observed: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`.

### Stream: Release Handoff

114. [DONE] `development-tree-cluster-contract.phase12.release-handoff.task1` Commit the active plan transition from release packaging to user retest before scope closeout can begin (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint product part restart user retest state`).
115. [DONE] Git Commit: `docs: checkpoint product part restart user retest state` (hash: 4fa4ea5d9)

## Phase 13 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-08)

### Stream: Product Part Restart Retest

116. [BLOCKED] `development-tree-cluster-contract.phase13.user-retest.task1` User installs release `1.2.474` and retests Product Part Clear&Do plus downstream cluster-contract startup: unsupported `gpt-5.3-codex` must not be selected, downstream sessions must inherit the Product Part model, lead Phase 5 must include a paired Git Commit line, and clearing a Product Part must remove stale downstream worktrees before recreating sessions (scope: user workflow; expected commit: none). Blocker: 2026-06-08 retest showed the cluster-contract session was created inside the worktree and inherited the model, but it was not projected into the main workspace UI/session list, the cluster worktree retained dirty/untracked managed todo/continuity state after draft review, the worktree root path reads like an artifact folder (`.../contract/`) rather than an independent worktree, and Cluster/Module ClearUndo does not remove the downstream worktree/projection or reset the graph icon to empty.

## Phase 14 - Cluster Node Visibility And Rollback Regression Fix (owner: Codex, updated: 2026-06-08)

### Stream: Retest Failure Intake

117. [DONE] `development-tree-cluster-contract.phase14.plan.task1` Add the retest failure scope for cluster session projection, cluster worktree clean Git boundaries, clearer worktree root naming, and Cluster/Module ClearUndo semantics (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint cluster node rollback regression plan`).
118. [DONE] Git Commit: `docs: checkpoint cluster node rollback regression plan` (hash: 9c98674eb)

### Stream: Cluster Session Main Workspace Projection

119. [DONE] `development-tree-cluster-contract.phase14.main-projection.task1` Persist cluster-contract session projection in the main workspace when Core bootstraps a downstream worktree session, including node id, stage, worktree path, branch, session id, and inherited model binding (scope: `packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.ts, packages/core/src/development-tree/product-part-workflow, packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.ts`; expected commit: `fix: project cluster sessions into main workspace`).
120. [DONE] Git Commit: `fix: project cluster sessions into main workspace` (hash: 4153f455b)
121. [DONE] `development-tree-cluster-contract.phase14.main-projection-readmodel.task1` Expose projected downstream sessions through the Core workflow-state/dialog projection so Project Manager can show/open cluster sessions from the main Product Part coordination surface (scope: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts, packages/core/src/remote-bridge/handlers/dialog-list-service.ts, packages/core/src/remote-bridge/handlers/development-tree-projected-session.test.ts`; expected commit: `fix: expose projected cluster sessions`).
122. [DONE] Git Commit: `fix: expose projected cluster sessions` (hash: dabbf0ad0)

### Stream: Clean Worktree Ledger Boundary

123. [DONE] `development-tree-cluster-contract.phase14.worktree-ledger.task1` Ensure cluster-contract worktree draft review leaves its managed todo-plan and required coordination metadata committed or intentionally ignored, so the worktree is clean after Core opens review (scope: `packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.ts, packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: commit cluster contract review ledger`).
124. [DONE] Git Commit: `fix: commit cluster contract review ledger` (hash: bc9cf9f3d)

### Stream: Worktree Root Naming

125. [DONE] `development-tree-cluster-contract.phase14.worktree-naming.task1` Rename new downstream worktree roots away from artifact-like `.../contract/` suffixes while keeping existing Product Part cleanup compatible with legacy paths (scope: `packages/core/src/development-tree/node-bootstrap/development-tree-node-worktree-service.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-worktree-service.test.ts`; expected commit: `fix: clarify cluster worktree root paths`).
126. [DONE] Git Commit: `fix: clarify cluster worktree root paths` (hash: e84a56a4d)

### Stream: Cluster And Module ClearUndo

127. [DONE] `development-tree-cluster-contract.phase14.node-clearundo-core.task1` Add Core-owned ClearUndo handling for downstream cluster/module Development Tree nodes: remove the node worktree through Git, delete native/unified session traces and continuity/projection records, and reset node status to empty/unstarted in the main Product Part coordination state (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-development-tree-node.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-product-part-restart.ts`; expected commit: `fix: clear downstream development tree nodes`).
128. [DONE] Git Commit: `fix: clear downstream development tree nodes` (hash: a2173ba78)
129. [DONE] `development-tree-cluster-contract.phase14.node-clearundo-ui.task1` Wire Project Manager cluster/module clear targets to the Core node ClearUndo response so cleared nodes render with an empty icon instead of a stale yellow/in-progress state (scope: `src/client/project-manager/services/workflow-step-clear-client.ts, src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx, src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts`; expected commit: `fix: clear downstream node markers in project manager`).
130. [DONE] Git Commit: `fix: clear downstream node markers in project manager` (hash: 4f65f4285)
131. [DONE] `development-tree-cluster-contract.phase14.node-clearundo-test.task1` Add targeted regression coverage for cluster/module ClearUndo removing worktrees, deleting projected sessions, pruning traces, and returning the graph node to an unstarted state (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-development-tree-node.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-development-tree-node.test.ts`; expected commit: `test: verify downstream node clearundo`).
132. [DONE] Git Commit: `test: verify downstream node clearundo` (hash: e558a6f04)

## Phase 15 - Tooling Verification (owner: Codex, updated: 2026-06-08)

### Stream: Regression Verification

133. [DONE] `development-tree-cluster-contract.phase15.verify.task1` Run targeted builds/tests for cluster projection visibility, clean worktree ledger boundary, renamed worktree roots, and cluster/module ClearUndo rollback behavior (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify cluster node rollback workflow`).
134. [DONE] Git Commit: `test: verify cluster node rollback workflow` (hash: 6f52c606b)
135. [DONE] `development-tree-cluster-contract.phase15.release-confirm.task1` Ask the user for explicit confirmation before building the next regression-fix release for cluster node visibility and ClearUndo (scope: user workflow; expected commit: none). Result: user explicitly confirmed release build for cluster node visibility, clean worktree ledger, clearer worktree roots, and Cluster/Module ClearUndo fixes.

Verification evidence:
- `npm run build --workspace packages/core` passed.
- `npm run typecheck:webview` passed.
- `npm run build:project-manager` passed.
- `node --test ...cluster-contract-agent-bootstrapper.test.js ...development-tree-projected-session.test.js ...cluster-contract-turn-controller.test.js` passed: 3/3 tests.
- `node --test ...development-tree-node-worktree-service.test.js ...workflow-step-clear-development-tree-node.test.js ...workflow-step-clear-service.test.js` passed: 9/9 tests.

### Stream: Release After Confirmation

136. [DONE] `development-tree-cluster-contract.phase15.release-notes.task1` Prepare release notes for the cluster node rollback regression fixes after explicit release confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare cluster node rollback release notes`).
137. [DONE] Git Commit: `docs: prepare cluster node rollback release notes` (hash: 1cc0121bc)
138. [DONE] `development-tree-cluster-contract.phase15.release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint cluster node rollback release build state`).
139. [DONE] Git Commit: `docs: checkpoint cluster node rollback release build state` (hash: 6cc5cb6d4)
140. [DONE] `development-tree-cluster-contract.phase15.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `build: prepare cluster node rollback release artifacts`).
141. [DONE] Git Commit: `build: prepare cluster node rollback release artifacts` (hash: 2d4ba9adf)
142. [DONE] `development-tree-cluster-contract.phase15.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package cluster node rollback vsix release`).
143. [DONE] Git Commit: `build: package cluster node rollback vsix release` (hash: c6ae4316e)

## Phase 16 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-08)

### Stream: Cluster Node Rollback Retest

144. [BLOCKED] `development-tree-cluster-contract.phase16.user-retest.task1` User installs the release and retests FinderWidget downstream cluster startup plus Cluster/Module ClearUndo: cluster sessions must show in Project Manager, cluster review must leave clean worktree Git status, new worktree roots must use `cluster-contracts/<cluster>`, and clearing a cluster node must remove the worktree and return the graph marker to empty/todo while main Git stays clean (scope: user workflow; expected commit: none). Result: release `1.2.475` creates the cluster worktree and agent artifacts, but Project Manager opens the projected cluster session with empty history because Core reads dialog history only from the main workspace runtime; the cluster `todo-plan.md` also remains untracked in the worktree.

### Stream: Projected Cluster Dialog Regression

145. [DONE] `development-tree-cluster-contract.phase16.projected-dialog-history.task1` Route projected cluster dialog history through the node worktree runtime so Project Manager can render the sub-agent JSONL instead of an empty main-workspace projection (scope: `packages/core/src/remote-bridge/handlers/dialog-list-service.ts, packages/core/src/remote-bridge/handlers/dialog-history-service.ts, doc/TODO/todo-plan.md`; expected commit: `fix: read projected cluster dialogs from worktrees`).
146. [DONE] Git Commit: `fix: read projected cluster dialogs from worktrees` (hash: fdad471ba)
147. [DONE] `development-tree-cluster-contract.phase16.cluster-plan-ledger.task1` Ensure cluster contract bootstrap commits the newly created cluster `todo-plan.md` before the sub-agent starts so the node worktree is tracked and clean from the first boundary (scope: `packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.ts, packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: commit cluster contract todo plan ledger`).
148. [DONE] Git Commit: `fix: commit cluster contract todo plan ledger` (hash: bb5c35e7e)
149. [DONE] `development-tree-cluster-contract.phase16.projected-dialog-tests.task1` Add regression coverage for worktree-backed projected dialog history and untracked cluster todo-plan ledger commits, then run targeted core tests/builds (scope: `packages/core/src/remote-bridge/handlers/development-tree-projected-session.test.ts, packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify projected cluster dialog regression`).
150. [DONE] Git Commit: `test: verify projected cluster dialog regression` (hash: c4ac5ef7b)

## Phase 17 - Release Build (owner: Codex, updated: 2026-06-08)

### Stream: Release Build Confirmation

151. [DONE] `development-tree-cluster-contract.phase17.release-confirm.task1` User explicitly confirmed release build for the projected cluster dialog history and cluster todo-plan ledger fixes (scope: user workflow; expected commit: none). Result: user explicitly asked to build the next release after regression fixes.

### Stream: Release After Confirmation

152. [DONE] `development-tree-cluster-contract.phase17.release-notes.task1` Prepare release notes for the projected cluster dialog history and cluster todo-plan ledger fixes (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare projected cluster dialog release notes`).
153. [DONE] Git Commit: `docs: prepare projected cluster dialog release notes` (hash: 50760e32b)
154. [DONE] `development-tree-cluster-contract.phase17.release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint projected cluster dialog release build state`).
155. [DONE] Git Commit: `docs: checkpoint projected cluster dialog release build state` (hash: e5637c2d4)
156. [DONE] `development-tree-cluster-contract.phase17.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `build: prepare projected cluster dialog release artifacts`).
157. [DONE] Git Commit: `build: prepare projected cluster dialog release artifacts` (hash: 688e21df2)
158. [DONE] `development-tree-cluster-contract.phase17.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package projected cluster dialog vsix release`).
159. [DONE] Git Commit: `build: package projected cluster dialog vsix release` (hash: 66a1df000)
160. [DONE] `development-tree-cluster-contract.phase17.release-handoff.task1` Commit the active plan transition from release packaging to user retest before scope closeout can begin (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint projected cluster dialog user retest state`).
161. [DONE] Git Commit: `docs: checkpoint projected cluster dialog user retest state` (hash: 597db2526)

## Phase 18 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-08)

### Stream: Projected Cluster Dialog Retest

162. [BLOCKED] `development-tree-cluster-contract.phase18.user-retest.task1` User installs the release and retests FinderWidget downstream cluster startup: selecting `note-selection-cluster` must open the real worktree-backed cluster session history instead of an empty projected shell, cluster bootstrap must track its managed `todo-plan.md`, and Product Part/Cluster ClearUndo must keep main and worktree Git status clean (scope: user workflow; expected commit: none). Result: release `1.2.476` starts the cluster sub-agent and writes artifacts, but Project Manager opens the cluster node with an empty dialog because the main projection uses the runtime session UUID while the real worktree continuity dialog id is provider-prefixed; the cluster managed `todo-plan.md` also remains untracked because Git boundary staging drops deep explicit paths when global exclude pathspecs are appended.

### Stream: Projected Dialog Identity Regression

163. [DONE] `development-tree-cluster-contract.phase18.projected-dialog-identity.task1` Resolve projected cluster dialog identity from the worktree continuity index so Project Manager opens the real provider-backed dialog id and history file (scope: `packages/core/src/remote-bridge/handlers/dialog-list-service.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts, packages/core/src/remote-bridge/handlers/development-tree-projected-session.test.ts`; expected commit: `fix: resolve projected cluster dialog identity`).
164. [DONE] Git Commit: `fix: resolve projected cluster dialog identity` (hash: 73d1271d1)
165. [DONE] `development-tree-cluster-contract.phase18.git-boundary-pathspec.task1` Fix WorkflowBoundaryGit staging for deep explicit managed-plan paths so cluster worktree ledger commits include `doc/TODO/.../clusters/.../todo-plan.md` (scope: `packages/core/src/workflow/boundary/workflow-boundary-git.ts, packages/core/src/workflow/boundary/workflow-boundary-git.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: stage explicit workflow boundary paths`).
166. [DONE] Git Commit: `fix: stage explicit workflow boundary paths` (hash: 42792d46e)
167. [DONE] `development-tree-cluster-contract.phase18.projected-dialog-verify.task1` Run targeted Core tests/builds for projected cluster dialog identity and workflow boundary path staging (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify projected cluster dialog identity`).
168. [DONE] Git Commit: `test: verify projected cluster dialog identity` (hash: 8221a7981)

Verification evidence:
- `npm run build --workspace packages/core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/development-tree-projected-session.test.js packages/core/dist/workflow/boundary/workflow-boundary-git.test.js packages/core/dist/remote-bridge/handlers/cluster-contract-turn-controller.test.js` passed: 3/3 tests.

### Stream: Release After Confirmation

169. [DONE] `development-tree-cluster-contract.phase18.release-notes.task1` Prepare release notes for the projected cluster dialog identity and explicit path staging fixes after the user's explicit release request (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare projected cluster identity release notes`).
170. [DONE] Git Commit: `docs: prepare projected cluster identity release notes` (hash: 4e9b167d7)
171. [DONE] `development-tree-cluster-contract.phase18.release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint projected cluster identity release build state`).
172. [DONE] Git Commit: `docs: checkpoint projected cluster identity release build state` (hash: a33cacc4c)
173. [DONE] `development-tree-cluster-contract.phase18.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `build: prepare projected cluster identity release artifacts`).
174. [DONE] Git Commit: `build: prepare projected cluster identity release artifacts` (hash: bcc74830a)
175. [DONE] `development-tree-cluster-contract.phase18.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package projected cluster identity vsix release`).
176. [DONE] Git Commit: `build: package projected cluster identity vsix release` (hash: 67de16e7a)
177. [DONE] `development-tree-cluster-contract.phase18.release-handoff.task1` Commit the active plan transition from release packaging to user retest before scope closeout can begin (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint projected cluster identity user retest state`).
178. [DONE] Git Commit: `docs: checkpoint projected cluster identity user retest state` (hash: c0d99882d)

## Phase 19 - Scope Closeout (owner: Codex, updated: 2026-06-08)

### Stream: Closeout After Acceptance

179. [TODO] `development-tree-cluster-contract.phase19.closeout.task1` After explicit user acceptance, archive this plan and decide disposition for `DevelopmentTree_ProductPartSubagentOrchestration.md` and related SSOT updates (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`; expected commit: `docs: close cluster contract subagent orchestration scope`).
180. [TODO] Git Commit: `docs: close cluster contract subagent orchestration scope` (hash: TBD)
181. [TODO] `development-tree-cluster-contract.phase19.closeout.anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.

## Phase 20 - Cluster ClearUndo Worktree Cleanup Regression (owner: Codex, updated: 2026-06-09)

### Stream: Git Worktree Container Cleanup

182. [DONE] `development-tree-cluster-contract.phase20.worktree-container-cleanup.task1` Ensure downstream Cluster/Module ClearUndo removes the selected node worktree through Git and cleans the `*.worktrees` container when no registered worktrees remain (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-development-tree-node.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-development-tree-node.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: remove cleared node worktree containers`).
183. [DONE] Git Commit: `fix: remove cleared node worktree containers` (hash: ba9020bbc)
184. [DONE] `development-tree-cluster-contract.phase20.worktree-container-verify.task1` Run targeted Core build/tests for downstream node ClearUndo worktree cleanup and record evidence before release confirmation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify cleared node worktree cleanup`).
185. [DONE] Git Commit: `test: verify cleared node worktree cleanup` (hash: bcc9010d1)
186. [TODO] `development-tree-cluster-contract.phase20.release-confirm.task1` Await explicit user confirmation before building the next regression release for Cluster ClearUndo worktree cleanup (scope: user workflow; expected commit: none).

Verification evidence:
- `npx ultracite check packages/core/src/remote-bridge/handlers/workflow-step-clear-development-tree-node.ts packages/core/src/remote-bridge/handlers/workflow-step-clear-development-tree-node.test.ts` passed.
- `npm run build --workspace packages/core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/workflow-step-clear-development-tree-node.test.js` passed and verifies `*.worktrees` is removed after cluster ClearUndo when no registered worktrees remain.

## Phase 21 - Cluster Bootstrap Main Ledger Cleanliness Regression (owner: Codex, updated: 2026-06-09)

### Stream: Bootstrap Session Ledger Commit

187. [DONE] `development-tree-cluster-contract.phase21.bootstrap-session-ledger.task1` Commit the main workspace unlock-state update that records cluster session/worktree metadata during downstream bootstrap so later cluster review merge starts from clean Git (scope: `packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.ts, packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: commit cluster bootstrap session state`).
188. [DONE] Git Commit: `fix: commit cluster bootstrap session state` (hash: e2e9437ec)
189. [DONE] `development-tree-cluster-contract.phase21.bootstrap-session-ledger-verify.task1` Run targeted Core build/tests for cluster bootstrap ledger cleanliness and record evidence before release confirmation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify cluster bootstrap session state commit`).
190. [DONE] Git Commit: `test: verify cluster bootstrap session state commit` (hash: 05cc2343b)
191. [TODO] `development-tree-cluster-contract.phase21.release-confirm.task1` Await explicit user confirmation before building the next regression release for cluster bootstrap and ClearUndo worktree cleanup fixes (scope: user workflow; expected commit: none).

Verification evidence:
- `npx ultracite check packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.ts packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.ts` passed.
- `npm run build --workspace packages/core` passed.
- `node --test packages/core/dist/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.js` passed and verifies cluster bootstrap commits both the worktree managed plan and the main workspace unlock-state session ledger.

## Phase 22 - Projected Cluster Dialog Review Gate Regression (owner: Codex, updated: 2026-06-09)

### Stream: Worktree-Scoped Projected Dialog Hydration

192. [DONE] `development-tree-cluster-contract.phase22.projected-dialog-worktree.task1` Preserve projected cluster dialog `worktreePath` in Project Manager and open/restore the dialog against the node worktree instead of the main workspace so review history and input state hydrate correctly (scope: `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.ts, src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts, src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`; expected commit: `fix: open projected cluster dialogs in worktrees`).
193. [DONE] Git Commit: `fix: open projected cluster dialogs in worktrees` (hash: e792e18a5)
194. [DONE] `development-tree-cluster-contract.phase22.projected-dialog-worktree-test.task1` Add targeted Project Manager regression coverage for worktree-backed projected dialog bootstrap/restore and active review gate rendering (scope: `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts, src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify projected cluster dialog worktree hydration`).
195. [DONE] Git Commit: `test: verify projected cluster dialog worktree hydration` (hash: 6b2cb12ae)
196. [DONE] `development-tree-cluster-contract.phase22.projected-dialog-verify.task1` Run targeted Project Manager/Core build checks for projected cluster dialog hydration before release confirmation (scope: `src/client/project-manager, packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify projected cluster dialog review gate`).
197. [DONE] Git Commit: `test: verify projected cluster dialog review gate` (hash: f3cfcb156)
198. [DONE] `development-tree-cluster-contract.phase22.release-confirm.task1` Await explicit user confirmation before building the next regression release for projected cluster dialog review gates, bootstrap ledger commits, and Cluster ClearUndo worktree cleanup (scope: user workflow; expected commit: none). Result: user explicitly requested the fix and a new release in chat on 2026-06-09.

Verification evidence:
- `npm run build --workspace packages/core` passed.
- `npm run typecheck:webview` passed.
- `npm run build:project-manager` passed.
- `npx tsx --test src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts` passed: 23/23 tests, including projected worktree dialog identity and managed review confirm rendering.

## Phase 23 - Regression Fix Release Build (owner: Codex, updated: 2026-06-09)

### Stream: Release After Confirmation

199. [DONE] `development-tree-cluster-contract.phase23.release-notes.task1` Prepare release notes for projected cluster review gate, bootstrap ledger, and Cluster ClearUndo worktree cleanup fixes after explicit release confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare projected cluster review release notes`).
200. [DONE] Git Commit: `docs: prepare projected cluster review release notes` (hash: a6527ad72)
201. [DONE] `development-tree-cluster-contract.phase23.release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint projected cluster review release build state`).
202. [DONE] Git Commit: `docs: checkpoint projected cluster review release build state` (hash: e37abf839)
203. [DONE] `development-tree-cluster-contract.phase23.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `build: prepare projected cluster review release artifacts`).
204. [DONE] Git Commit: `build: prepare projected cluster review release artifacts` (hash: ec84bb899)
205. [DONE] `development-tree-cluster-contract.phase23.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package projected cluster review vsix release`).
206. [DONE] Git Commit: `build: package projected cluster review vsix release` (hash: 6e31b734f)
207. [DONE] `development-tree-cluster-contract.phase23.release-handoff.task1` Commit the active plan transition from release packaging to user retest before scope closeout can begin (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint projected cluster review user retest state`).
208. [DONE] Git Commit: `docs: checkpoint projected cluster review user retest state` (hash: f6ecbcaec)

## Phase 24 - Top-Down Contract Ownership Documentation (owner: Codex, updated: 2026-06-09)

### Stream: Contract Artifact Semantics

209. [DONE] `development-tree-cluster-contract.phase24.contract-ownership-docs.task1` Document that Product Part, Cluster, Standalone Module, and Module agents define concrete pre-code facade/function contracts top-down instead of letting lower agents invent boundaries (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: clarify top down contract ownership`).
210. [DONE] Git Commit: `docs: clarify top down contract ownership` (hash: f7ca93af8)

## Phase 25 - Contract Ownership Review (owner: user, updated: 2026-06-09)

### Stream: Next Scope Decision

211. [DONE] `development-tree-cluster-contract.phase25.contract-ownership-review.task1` User reviews the top-down contract ownership rule and decides the next implementation scope for prompt/schema/validator enforcement (scope: user workflow; expected commit: none). Result: User approved implementation of top-down contract seed and concrete pre-code contract enforcement.

## Phase 26 - Development Order Contract Seeds (owner: Codex, updated: 2026-06-09)

### Stream: Lead Product Part Contract Seeds

212. [DONE] `development-tree-cluster-contract.phase26.order-plan-seeds.task1` Extend `DevelopmentOrderPlan.v2` parser/validator with downstream `contractSeeds` for cluster and standalone-module nodes, including required consumer, input, output, status/error, and blocking question fields (scope: `packages/core/src/development-tree/product-part-workflow/development-order-plan-v2-contract.ts, packages/core/src/development-tree/product-part-workflow/development-order-plan-v2-contract.test.ts, doc/TODO/todo-plan.md`; expected commit: `feat: validate development order contract seeds`).
213. [DONE] Git Commit: `feat: validate development order contract seeds` (hash: e505fd4d0)
214. [DONE] `development-tree-cluster-contract.phase26.lead-prompt-seeds.task1` Update the lead Product Part `DevelopmentOrderPlan.v2` assignment prompt and regression tests so the lead agent must write concrete downstream contract seeds for clusters and standalone modules (scope: `packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-review-controller.prompt.test.ts, doc/TODO/todo-plan.md`; expected commit: `feat: request downstream contract seeds`).
215. [DONE] Git Commit: `feat: request downstream contract seeds` (hash: bc05d351e)

## Phase 27 - Downstream Contract Seed Propagation (owner: Codex, updated: 2026-06-09)

### Stream: Cluster Contract Sub-Agent Assignment

216. [DONE] `development-tree-cluster-contract.phase27.unlock-state-seeds.task1` Persist accepted downstream contract seeds in Product Part unlock-state so Core can pass the parent-defined boundary into opened Cluster/Standalone Module worktrees (scope: `packages/core/src/development-tree/product-part-workflow/development-order-plan-unlock-state.ts, packages/core/src/remote-bridge/handlers/product-part-development-order-plan-review-controller.ts, packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.test.ts`; expected commit: `feat: persist downstream contract seeds`).
217. [DONE] Git Commit: `feat: persist downstream contract seeds` (hash: 04972622f)
218. [DONE] `development-tree-cluster-contract.phase27.cluster-prompt-seeds.task1` Update the Cluster Contract sub-agent prompt so it receives the Product Part contract seed and must produce concrete pre-code facade/module-boundary artifacts instead of abstract descriptions (scope: `packages/core/src/development-tree/cluster-workflow/cluster-contract-prompt-builder.ts, packages/core/src/development-tree/node-bootstrap/cluster-contract-agent-bootstrapper.ts, packages/core/src/development-tree/cluster-workflow/cluster-contract-prompt-builder.test.ts`; expected commit: `feat: pass contract seeds to cluster agents`).
219. [DONE] Git Commit: `feat: pass contract seeds to cluster agents` (hash: 15766618f)

## Phase 28 - Concrete Contract Validation (owner: Codex, updated: 2026-06-09)

### Stream: Pre-Code Artifact Gates

220. [DONE] `development-tree-cluster-contract.phase28.cluster-contract-validation.task1` Strengthen cluster contract review validation so `ClusterFacadeContract.draft.json` must contain concrete facade class/file/method/DTO/result-union/module-boundary fields before Core opens review (scope: `packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.ts, packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `feat: validate concrete cluster facade contracts`).
221. [DONE] Git Commit: `feat: validate concrete cluster facade contracts` (hash: d2f612158)
222. [DONE] `development-tree-cluster-contract.phase28.verification.task1` Run targeted Core tests/builds for contract seeds, lead prompt requirements, downstream seed propagation, cluster prompt requirements, and concrete contract validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify top down contract orchestration`).
223. [DONE] Git Commit: `test: verify top down contract orchestration` (hash: 6459d8358)

Verification evidence:
- `npx ultracite check ...development-order-plan-v2-contract.ts ...product-part-development-brief-review-controller.ts ...development-order-plan-unlock-state.ts ...cluster-contract-agent-bootstrapper.ts ...cluster-contract-prompt-builder.ts ...cluster-contract-turn-controller.ts` passed for the targeted files.
- `npm run build --workspace packages/core` passed.
- `node --test ...development-order-plan-v2-contract.test.js ...product-part-development-brief-review-controller.prompt.test.js ...cluster-contract-agent-bootstrapper.test.js ...cluster-contract-prompt-builder.test.js ...cluster-contract-turn-controller.test.js` passed: 11/11 tests.

## Phase 29 - Release Build Confirmation (owner: user, updated: 2026-06-09)

### Stream: Release Decision

224. [DONE] `development-tree-cluster-contract.phase29.release-confirm.task1` Await explicit user confirmation before preparing release notes, bumping versions, running `build-all.sh`, or packaging a VSIX for the top-down contract orchestration fixes (scope: user workflow; expected commit: none). Result: User explicitly confirmed release build for top-down contract orchestration fixes.

## Phase 30 - Top-Down Contract Orchestration Release Build (owner: Codex, updated: 2026-06-09)

### Stream: Release After Confirmation

225. [DONE] `development-tree-cluster-contract.phase30.release-notes.task1` Prepare release notes for top-down contract seeds, concrete Cluster Facade Contract validation, and cluster prompt propagation after explicit release confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare top down contract orchestration release notes`).
226. [DONE] Git Commit: `docs: prepare top down contract orchestration release notes` (hash: dcf64c36f)
227. [DONE] `development-tree-cluster-contract.phase30.release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint top down contract orchestration release build state`).
228. [DONE] Git Commit: `docs: checkpoint top down contract orchestration release build state` (hash: 4cbfc0046)
229. [DONE] `development-tree-cluster-contract.phase30.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `build: prepare top down contract orchestration release artifacts`).
230. [DONE] Git Commit: `build: prepare top down contract orchestration release artifacts` (hash: 6130709ea)
231. [DONE] `development-tree-cluster-contract.phase30.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package top down contract orchestration vsix release`).
232. [DONE] Git Commit: `build: package top down contract orchestration vsix release` (hash: fb882d523)
233. [DONE] `development-tree-cluster-contract.phase30.release-handoff.task1` Commit the active plan transition from release packaging to user retest before scope closeout can begin (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint top down contract orchestration user retest state`).
234. [DONE] Git Commit: `docs: checkpoint top down contract orchestration user retest state` (hash: 61f5d8d5f)

## Phase 31 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-09)

### Stream: Top-Down Contract Orchestration Retest

235. [DONE] `development-tree-cluster-contract.phase31.retest-state-repair.task1` Repair the release handoff plan-state after the post-commit closeout-boundary guard blocked automatic advancement, keeping the scope active for user retest instead of terminal closeout (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: repair top down contract release retest state`).
236. [DONE] Git Commit: `docs: repair top down contract release retest state` (hash: d2da425b7)
237. [BLOCKED] `development-tree-cluster-contract.phase31.user-retest.task1` User installs release `1.2.479` and retests the FinderWidget lead Product Part flow: accepted `DevelopmentOrderPlan.v2` must contain downstream `contractSeeds`, the first cluster sub-agent prompt must receive the Product Part contract seed, and Core must reject abstract cluster contracts until concrete facade class/file/method/DTO/result-union/module-boundary fields are present (scope: user workflow; expected commit: none). Blocker: 2026-06-09 retest showed Core correctly rejects abstract cluster contract artifacts, but the cluster validation failure settles after the Core diagnostics instead of dispatching an internal repair prompt back to the sub-agent, leaving Project Manager with a stale working input state.

## Phase 32 - Cluster Contract Repair Continuation Regression (owner: Codex, updated: 2026-06-09)

### Stream: Cluster Validation Repair Loop

238. [DONE] `development-tree-cluster-contract.phase32.cluster-repair-continuation.task1` Dispatch an internal repair prompt when cluster-contract artifact validation fails instead of settling after the Core refusal message (scope: `packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.ts, packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: continue cluster contract repair after validation failure`).
239. [DONE] Git Commit: `fix: continue cluster contract repair after validation failure` (hash: a1925214b)
240. [DONE] `development-tree-cluster-contract.phase32.cluster-repair-verify.task1` Run targeted Core tests/builds for the cluster-contract validation repair continuation and record evidence before the next release build (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify cluster contract repair continuation`).
241. [DONE] Git Commit: `test: verify cluster contract repair continuation` (hash: c5be0ac6f)
242. [DONE] `development-tree-cluster-contract.phase32.release-confirm.task1` Await explicit user confirmation before building the next regression release for cluster-contract validation repair continuation (scope: user workflow; expected commit: none). Result: User explicitly requested fixing the cluster validation repair dead-end and building a new release.

Verification evidence:
- `npx ultracite check packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.ts packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.test.ts` passed.
- `npm run build --workspace packages/core` passed.
- `node --test packages/core/dist/remote-bridge/handlers/cluster-contract-turn-controller.test.js` passed: 2/2 tests, including invalid facade JSON returning a Core repair continuation prompt.

## Phase 33 - Cluster Contract Repair Release Build (owner: Codex, updated: 2026-06-09)

### Stream: Release After Confirmation

243. [DONE] `development-tree-cluster-contract.phase33.release-notes.task1` Prepare release notes for the cluster-contract validation repair continuation after explicit release confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare cluster contract repair release notes`).
244. [DONE] Git Commit: `docs: prepare cluster contract repair release notes` (hash: 3f5b9eafd)
245. [DONE] `development-tree-cluster-contract.phase33.release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint cluster contract repair release build state`).
246. [DONE] Git Commit: `docs: checkpoint cluster contract repair release build state` (hash: ec10a5831)
247. [DONE] `development-tree-cluster-contract.phase33.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, doc/TODO/todo-plan.md`; expected commit: `build: prepare cluster contract repair release artifacts`).
248. [DONE] Git Commit: `build: prepare cluster contract repair release artifacts` (hash: ee756d5e3)
249. [DONE] `development-tree-cluster-contract.phase33.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package cluster contract repair vsix release`).
250. [DONE] Git Commit: `build: package cluster contract repair vsix release` (hash: 82803b102)
251. [DONE] `development-tree-cluster-contract.phase33.release-handoff.task1` Commit the active plan transition from release packaging to user retest before scope closeout can begin (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint cluster contract repair user retest state`).
252. [DONE] Git Commit: `docs: checkpoint cluster contract repair user retest state` (hash: 2ae469b49)

## Phase 34 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-09)

### Stream: Cluster Contract Repair Retest

253. [BLOCKED] `development-tree-cluster-contract.phase34.user-retest.task1` User installs release `1.2.480` and retests the FinderWidget cluster-contract flow: when Core rejects incomplete `ClusterFacadeContract.draft.json`, it must post diagnostics and automatically continue the same cluster sub-agent with a repair prompt instead of leaving Project Manager locked at a stale working input state (scope: user workflow; expected commit: none). Blocker: backend repair loop succeeds and accepts the cluster draft, but Project Manager keeps the projected worktree dialog on an early message slice and leaves the input in `working` because live turn-state/history refresh is not bound to the worktree-backed session identity.

## Phase 35 - Scope Closeout (owner: Codex, updated: 2026-06-09)

### Stream: Closeout After Acceptance

254. [TODO] `development-tree-cluster-contract.phase35.closeout.task1` After explicit user acceptance of the fixed release, archive this plan and decide disposition for `DevelopmentTree_ProductPartSubagentOrchestration.md`, `DevelopmentTree_BranchWorkflow_Architecture.md`, and related SSOT updates (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`; expected commit: `docs: close top down contract orchestration scope`).
255. [TODO] Git Commit: `docs: close top down contract orchestration scope` (hash: TBD)
256. [TODO] `development-tree-cluster-contract.phase35.closeout.anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.

## Phase 36 - Projected Cluster Dialog Live Refresh Regression (owner: Codex, updated: 2026-06-09)

### Stream: Worktree Live State Projection

257. [DONE] `development-tree-cluster-contract.phase36.projected-live-refresh.task1` Refresh projected cluster dialogs from their worktree runtime identity so live `turn_state`/workspace snapshots unlock the visible dialog and tail-history updates are fetched while the sub-agent continues or settles (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-callbacks.ts, src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts, src/client/project-manager/components/sessions/turn-state-stream.ts`; expected commit: `fix: refresh projected cluster dialog live state`).
258. [DONE] Git Commit: `fix: refresh projected cluster dialog live state` (hash: b56cb513c)
259. [DONE] `development-tree-cluster-contract.phase36.projected-live-refresh-test.task1` Add targeted Project Manager/Core regression coverage for projected worktree dialog live refresh and provider-session turn-state fallback (scope: `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts, src/client/project-manager/components/sessions/turn-state-stream.test.ts, packages/core/src/remote-bridge/session-stream-contracts.ts`; expected commit: `test: verify projected cluster dialog live refresh`).
260. [DONE] Git Commit: `test: verify projected cluster dialog live refresh` (hash: c852b522b)
261. [DONE] `development-tree-cluster-contract.phase36.projected-live-refresh-verify.task1` Run targeted Project Manager and Core build/tests for projected worktree dialog live refresh before asking for release confirmation (scope: `src/client/project-manager, packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify projected cluster live state builds`).
262. [PENDING] Git Commit: `test: verify projected cluster live state builds` (hash: TBD)
263. [TODO] `development-tree-cluster-contract.phase36.release-confirm.task1` Await explicit user confirmation before building the next regression release for projected cluster dialog live refresh (scope: user workflow; expected commit: none).

Verification evidence:
- `npm run build --workspace packages/core` passed.
- `npm run build:project-manager` passed.
- `npm run typecheck:webview` passed.
- `npx tsx --test src/client/project-manager/components/sessions/turn-state-stream.test.ts src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts` passed: 23/23 tests, including projected provider-session turn-state targeting and dialog tail-history refresh.
