# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-cluster-contract-subagent-orchestration-2026-06-08",
  "branch": "main",
  "baseHead": "b90dba86c",
  "lastRecordedCommit": "42042271d",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md",
  "currentTaskId": "development-tree-cluster-contract.phase4.prompt.task1",
  "expectedCommitMessage": "feat: build cluster contract subagent prompts",
  "debt": {
    "expectedCommitMessage": "feat: build cluster contract subagent prompts",
    "preCommitHead": "42042271d",
    "stage": "commit_pending",
    "taskId": "development-tree-cluster-contract.phase4.prompt.task1"
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
18. [PENDING] Git Commit: `feat: build cluster contract subagent prompts` (hash: TBD)
19. [TODO] `development-tree-cluster-contract.phase4.turn.task1` Add the cluster-contract turn controller that validates generated specification/facade artifacts, commits them inside the cluster worktree, and opens the user/lead review gate (scope: `packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.test.ts`; expected commit: `feat: open cluster contract review`).
20. [TODO] Git Commit: `feat: open cluster contract review` (hash: TBD)
21. [TODO] `development-tree-cluster-contract.phase4.review.task1` Add cluster-contract review handling so ordinary user/lead messages request sub-agent revisions while explicit acceptance records a merge-ready result and summary for lead Product Part coordination (scope: `packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.test.ts`; expected commit: `feat: accept cluster contract review results`).
22. [TODO] Git Commit: `feat: accept cluster contract review results` (hash: TBD)

## Phase 5 - Lead Coordination And Merge (owner: Codex, updated: 2026-06-08)

### Stream: Result Summary And Mainline Merge

23. [TODO] `development-tree-cluster-contract.phase5.lead-summary.task1` Feed accepted cluster-contract summaries back into the lead Product Part coordination plan so the lead agent can accept, reject, or request revisions at node level (scope: `packages/core/src/development-tree/product-part-workflow/lead-product-part-coordination-service.ts, packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.ts, packages/core/src/development-tree/product-part-workflow/lead-product-part-coordination-service.test.ts`; expected commit: `feat: summarize cluster contract results for lead coordination`).
24. [TODO] Git Commit: `feat: summarize cluster contract results for lead coordination` (hash: TBD)
25. [TODO] `development-tree-cluster-contract.phase5.merge.task1` Add Core-owned merge for accepted cluster-contract worktree results back into the main workspace with merge evidence, clean Git assertions, and node-level rollback boundary metadata (scope: `packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.ts, packages/core/src/remote-bridge/handlers/cluster-contract-review-controller.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-merge-service.test.ts`; expected commit: `feat: merge accepted cluster contract worktrees`).
26. [TODO] Git Commit: `feat: merge accepted cluster contract worktrees` (hash: TBD)
27. [TODO] `development-tree-cluster-contract.phase5.advance.task1` Advance the lead Product Part coordination graph after cluster-contract merge, marking `note-selection-cluster` merged and keeping module nodes locked until the accepted cluster contract can unlock the next module-contract wave (scope: `packages/core/src/development-tree/product-part-workflow/development-order-plan-unlock-state.ts, packages/core/src/development-tree/product-part-workflow/lead-product-part-coordination-service.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts`; expected commit: `feat: advance lead coordination after cluster merge`).
28. [TODO] Git Commit: `feat: advance lead coordination after cluster merge` (hash: TBD)

## Phase 6 - Project Manager Coordination Projection (owner: Codex, updated: 2026-06-08)

### Stream: One Visible Product Part Graph

29. [TODO] `development-tree-cluster-contract.phase6.core-readmodel.task1` Expose Product Part coordination graph state through the Core workflow-state read model, including unlocked/running/review/merge-ready/merged/locked node statuses and worktree references (scope: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`; expected commit: `feat: expose product part coordination graph state`).
30. [TODO] Git Commit: `feat: expose product part coordination graph state` (hash: TBD)
31. [TODO] `development-tree-cluster-contract.phase6.pm-ui.task1` Render the Product Part coordination graph in Project Manager and route cluster-contract node actions to Core while keeping sub-agent technical state hidden by default (scope: `src/client/project-manager/components/layout/workspace-tree.tsx, src/client/project-manager/services/workflow-state-client.ts, src/client/project-manager/components/layout/workspace-tree.test.tsx`; expected commit: `feat: show cluster contract coordination graph`).
32. [TODO] Git Commit: `feat: show cluster contract coordination graph` (hash: TBD)

## Phase 7 - Documentation Sync (owner: Codex, updated: 2026-06-08)

### Stream: SSOT Updates

33. [TODO] `development-tree-cluster-contract.phase7.docs.task1` Synchronize SSOT documentation for `DevelopmentOrderPlan.v2`, lead Product Part downstream coordination, cluster-contract sub-agent worktrees, user-visible Product Part graph, and node-level rollback gates (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit: `docs: describe cluster contract subagent orchestration`).
34. [TODO] Git Commit: `docs: describe cluster contract subagent orchestration` (hash: TBD)
35. [TODO] `development-tree-cluster-contract.phase7.pm-docs.task1` Document the Project Manager projection and user workflow for one Product Part coordination surface with optional sub-agent detail drill-in (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe product part coordination projection`).
36. [TODO] Git Commit: `docs: describe product part coordination projection` (hash: TBD)

## Phase 8 - Tooling Verification (owner: Codex, updated: 2026-06-08)

### Stream: Targeted Verification

37. [TODO] `development-tree-cluster-contract.phase8.verify.task1` Run targeted Core and Project Manager verification for order-plan v2 validation, first-wave cluster bootstrap, cluster artifact review, worktree merge, and coordination graph projection (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify cluster contract subagent orchestration`).
38. [TODO] Git Commit: `test: verify cluster contract subagent orchestration` (hash: TBD)

## Phase 9 - Release Build (owner: Codex, updated: 2026-06-08)

### Stream: Release Build Confirmation

39. [TODO] `development-tree-cluster-contract.phase9.release-confirm.task1` Ask the user for explicit confirmation before preparing release notes, bumping versions, running `build-all.sh`, or packaging VSIX (scope: user workflow; expected commit: none).

### Stream: Release After Confirmation

40. [TODO] `development-tree-cluster-contract.phase9.release-notes.task1` Prepare release notes for the next version after explicit release confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare cluster contract subagent release notes`).
41. [TODO] Git Commit: `docs: prepare cluster contract subagent release notes` (hash: TBD)
42. [TODO] `development-tree-cluster-contract.phase9.release-state.task1` Commit the active plan transition to the clean-tree build-all task before running the release script (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: checkpoint cluster contract subagent release build state`).
43. [TODO] Git Commit: `docs: checkpoint cluster contract subagent release build state` (hash: TBD)
44. [TODO] `development-tree-cluster-contract.phase9.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare cluster contract subagent unified release artifacts`).
45. [TODO] Git Commit: `build: prepare cluster contract subagent unified release artifacts` (hash: TBD)
46. [TODO] `development-tree-cluster-contract.phase9.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package cluster contract subagent vsix release`).
47. [TODO] Git Commit: `build: package cluster contract subagent vsix release` (hash: TBD)

## Phase 10 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-08)

### Stream: FinderWidget Cluster Contract Retest

48. [TODO] `development-tree-cluster-contract.phase10.user.task1` User installs the release and retests FinderWidget end-to-end: accepted lead `DevelopmentOrderPlan.v2` opens the `note-selection-cluster` cluster-contract sub-agent, the agent creates `ClusterSpecification` and `ClusterFacadeContract` markdown/json artifacts, Core validates and commits them, acceptance returns a merge-ready result to lead Product Part coordination, Core merges the worktree result, and Project Manager shows the Product Part coordination graph with cluster merged and module nodes still locked until the next wave (scope: user workflow; expected commit: none).

## Phase 11 - Scope Closeout (owner: Codex, updated: 2026-06-08)

### Stream: Closeout After Acceptance

49. [TODO] `development-tree-cluster-contract.phase11.closeout.task1` After explicit user acceptance, archive this plan and decide disposition for `DevelopmentTree_ProductPartSubagentOrchestration.md` and related SSOT updates (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`; expected commit: `docs: close cluster contract subagent orchestration scope`).
50. [TODO] Git Commit: `docs: close cluster contract subagent orchestration scope` (hash: TBD)
51. [TODO] `development-tree-cluster-contract.phase11.closeout.anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
