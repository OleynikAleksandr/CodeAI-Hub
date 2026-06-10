# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "orchestrator-stop-gate-simplification-2026-06-10",
  "branch": "main",
  "baseHead": "8be648655",
  "lastRecordedCommit": "38460f7af",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md",
  "currentTaskId": "orchestrator-stop-gate.phase8.release-notes.task1",
  "expectedCommitMessage": "docs: prepare stop gate simplification release notes",
  "debt": {
    "expectedCommitMessage": "docs: prepare stop gate simplification release notes",
    "preCommitHead": "38460f7af",
    "stage": "commit_pending",
    "taskId": "orchestrator-stop-gate.phase8.release-notes.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md`
- **Related active planning documents:**
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md`
  - `doc/TODO/Archive/todo-plan-superseded-development-tree-cluster-contract-subagent-orchestration-2026-06-10.md`
- **Code surfaces that influence this plan:**
  - `packages/core/src/workflow/boundary/`
  - `packages/core/src/managed-workflow-orchestration/`
  - `packages/core/src/remote-bridge/handlers/`
  - `src/client/project-manager/`
  - `scripts/plan-orchestrator/`
- Only this list is the recovery context source for this execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Keep `DevelopmentTree_BranchWorkflow_Architecture.md` and `DevelopmentTree_ProductPartSubagentOrchestration.md` active; update them when the new stop-gate policy changes Development Tree architecture, but do not archive or delete them in this scope.
- Each implementation task must touch no more than 3 files/packages.
- Every implementation task is followed by a separate `Git Commit: ...` item.
- Use `npm run plan:commit -- "<expected commit message>"` for normal commit workflow.
- Do not bypass Husky hooks or quality gates.
- **No-stop dual outcome invariant:** every Core settlement of a managed turn, validation, commit boundary, or internal error must end in exactly one of two outcomes: (1) a repair/continuation prompt dispatched to the agent, or (2) a button gate with a concrete user action. An informational message that stops development without an attached action is a defect, never an accepted behavior.
- **Outcome hierarchy:** silent deterministic self-repair first, agent dispatch second, button gate last. Button gates are reserved for user acceptance/confirmation, irreversible intent, provider unavailability, and repair-limit exhaustion on Core-required machine fields.
- **Dirty Git is never a stop and never a question:** Core always auto-commits with two-basket classification — workflow/step-owned paths go into the managed step commit, everything else goes into a separate `chore: preserve workspace changes` commit. Destructive operations (rollback, Clear/Undo) are always preceded by an auto-commit so user work cannot be lost by construction.
- **Bounded repair loops:** repair dispatch attempts per artifact are limited (3); on exhaustion, agent-readable artifacts are accepted with a recorded warning and the workflow continues, while Core-required machine fields surface a button gate (retry / continue as is / roll back step).
- Release build is not automatic. Ask the user before release notes, version bump, `build-all.sh`, or `build-release.sh`.

## Phase 1 - Stop-Gate Audit (owner: Codex, updated: 2026-06-10)

### Stream: Orchestrator Blocker Inventory

1. [DONE] `orchestrator-stop-gate.phase1.audit.task1` Record the new stop-gate policy, archive the superseded cluster-contract retest plan snapshot, and open the active blocker audit plan with links to all influencing planning/system documents (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/TODO/Archive/todo-plan-superseded-development-tree-cluster-contract-subagent-orchestration-2026-06-10.md, doc/TODO/todo-plan.md`; expected commit: `docs: audit orchestrator stop gates`).
2. [DONE] Git Commit: `docs: audit orchestrator stop gates` (hash: ef6767245)
3. [DONE] `orchestrator-stop-gate.phase1.audit.task2` Audit hard blocker call sites across managed workflow controllers, workflow boundary Git, Development Tree sub-agent controllers, Project Manager lock state, and plan-orchestrator commit boundaries; classify each blocker as keep, auto-fix, warning, or repair-prompt (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`; expected commit: `docs: classify orchestrator blocker policy`).
4. [DONE] Git Commit: `docs: classify orchestrator blocker policy` (hash: ca151e1bf)

## Phase 2 - No-Stop Policy Adoption And Dirty Git Elimination (owner: Codex, updated: 2026-06-10)

### Stream: No-Stop Policy Documentation

5. [DONE] `orchestrator-stop-gate.phase2.policy-docs.task1` Rewrite the stop-gate planning source to the accepted no-stop dual-outcome policy: every Core settlement ends as agent repair/continuation dispatch or as a button gate, informational stop cards are forbidden, dirty Git is always auto-committed with two-basket classification and preserve commits, destructive operations are preceded by auto-commit, repair loops are bounded with accept-with-warning degradation, and the silent-stop audit findings (swallowed dispatch errors, settled turns without dispatch, unprotected plan parsing, unbounded repair attempts, stale UI locks) are recorded in the blocker matrix (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/TODO/todo-plan.md`; expected commit: `docs: adopt no-stop dual outcome policy`).
6. [DONE] Git Commit: `docs: adopt no-stop dual outcome policy` (hash: acd132702)
7. [DONE] `orchestrator-stop-gate.phase2.policy-docs.task2` Synchronize the no-stop dual-outcome policy into both active Development Tree planning documents: rewrite their stop-gate sections to the two allowed outcomes, replace dirty-git user-stop language with two-basket auto-commit, and fix the duplicated section numbering in the sub-agent orchestration document (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`; expected commit: `docs: sync no-stop policy into development tree plans`).
8. [DONE] Git Commit: `docs: sync no-stop policy into development tree plans` (hash: 88fb8e621)

### Stream: Workflow-Owned Auto Commit

9. [DONE] `orchestrator-stop-gate.phase2.dirty-git.task1` Replace the unclassified dirty-file blocker in the managed terminal boundary with two-basket auto-commit: stage/Core-owned residue stays in the managed step commit while unclassified paths are committed separately as `chore: preserve workspace changes` instead of stopping the user (scope: `packages/core/src/managed-workflow-orchestration/managed-terminal-clean-git-boundary.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.ts`; expected commit: `fix: preserve commit unclassified dirty files`).
10. [DONE] Git Commit: `fix: preserve commit unclassified dirty files` (hash: 6b5184648)
11. [DONE] `orchestrator-stop-gate.phase2.dirty-git.task2` Remove user-facing dirty Git stops from workflow boundary creation and accepted-step commits: run the two-basket auto-commit before boundary anchors and after accepted steps so no dirty-tree state surfaces as a user stop (scope: `packages/core/src/workflow/boundary`; expected commit: `fix: auto-close workflow dirty git boundaries`).
12. [DONE] Git Commit: `fix: auto-close workflow dirty git boundaries` (hash: f66b7eb31)
13. [DONE] `orchestrator-stop-gate.phase2.dirty-git.task3` Add regression coverage for Quality Gates restart with workflow-owned script changes and for unclassified user files so Core commits (step + preserve) and continues instead of asking the user how to handle dirty files (scope: `packages/core/src/managed-workflow-orchestration/quality-gates, packages/core/src/workflow/boundary, doc/TODO/todo-plan.md`; expected commit: `test: verify workflow dirty git auto commit`).
14. [DONE] Git Commit: `test: verify workflow dirty git auto commit` (hash: 7815382aa)

## Phase 3 - Silent Stop Elimination (owner: Codex, updated: 2026-06-10)

### Stream: Legacy Red Boundary Tests

15. [DONE] `orchestrator-stop-gate.phase3.red-tests.task1` Diagnose and repair the three legacy red boundary tests on main: rewrite "refuses dirty provider session transcripts" to the no-stop preserve-commit behavior, and fix or rewrite the failing rollback coordinator expectations ("preserves mutable settings outside Clear rollback", "removes future workflow session histories through Git"), fixing rollback code if the tests expose real defects (scope: `packages/core/src/workflow/boundary`; expected commit: `fix: repair legacy red boundary tests`).
16. [DONE] Git Commit: `fix: repair legacy red boundary tests` (hash: 23544b3dc)

### Stream: Guaranteed Continuation Delivery

17. [DONE] `orchestrator-stop-gate.phase3.delivery.task1` Make agent continuation dispatch awaited and failure-handled: remove the fire-and-forget swallow in managed internal continuation dispatch and convert managed turn-completion handler failures in the provider event router into an agent repair dispatch or button gate instead of a silently settled turn (scope: `packages/core/src/remote-bridge/handlers/managed-internal-continuation-dispatch.ts, packages/core/src/remote-bridge/handlers/managed-internal-continuation-dispatch.test.ts, packages/core/src/remote-bridge/handlers/session-provider-event-*`; expected commit: `fix: guarantee agent continuation delivery`).
18. [DONE] Git Commit: `fix: guarantee agent continuation delivery` (hash: 68185d4e7)
19. [DONE] `orchestrator-stop-gate.phase3.delivery.task2` Dispatch repair prompts on settled managed turns: every non-review `nextAction` (including quality gates `repair_integration`/`repair_verification` paths) must send the prepared repair prompt to the agent instead of settling without dispatch (scope: `packages/core/src/remote-bridge/handlers, packages/core/src/managed-workflow-orchestration/quality-gates`; expected commit: `fix: dispatch repair prompts on settled turns`).
20. [DONE] Git Commit: `fix: dispatch repair prompts on settled turns` (hash: 147c439ed)

### Stream: Error Containment

21. [DONE] `orchestrator-stop-gate.phase3.containment.task1` Contain workflow boundary errors in session handlers: wrap the managed stage preparation (`ensureBoundary`/scaffold/draft-open) in workflow session creation so thrown errors produce a session with a released-input Core message instead of an unhandled crash; session resolution and managed review decision handlers were verified already contained (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.ts`; expected commit: `fix: contain boundary errors into agent repair`).
22. [DONE] Git Commit: `fix: contain boundary errors into agent repair` (hash: 951206e3a)
23. [DONE] `orchestrator-stop-gate.phase3.containment.task2` Contain managed plan parse and file I/O failures in Development Tree turn controllers (cluster contract, product part brief, development order plan, review controllers): corrupted or missing plan state must produce an agent repair dispatch or deterministic plan re-bootstrap, never an unhandled crash that leaves the dialog hanging (scope: `packages/core/src/remote-bridge/handlers`; expected commit: `fix: contain plan parse failures in turn controllers`).
24. [DONE] Git Commit: `fix: contain plan parse failures in turn controllers` (hash: d65e968bd)

### Stream: Managed Plan State Auto-Repair

25. [DONE] `orchestrator-stop-gate.phase3.plan-repair.task1` Auto-repair managed stage plan state on `plan_mismatch`, expected-commit drift, and `commit_failed` when Git plus managed state make the safe transition inferable, and replace the remaining "Core cannot continue" cards with agent repair dispatch (scope: `packages/core/src/managed-workflow-orchestration, packages/core/src/remote-bridge/handlers`; expected commit: `fix: auto repair managed stage plan state`).
26. [DONE] Git Commit: `fix: auto repair managed stage plan state` (hash: 3f0bf5af6)

### Stream: Bounded Repair Loops

27. [DONE] `orchestrator-stop-gate.phase3.repair-limits.task1` Bound managed repair loops: cap repair dispatch attempts per artifact (3), then degrade gracefully — accept agent-readable artifacts with a recorded warning and continue, or raise a button gate (retry / continue as is / roll back step) only when Core-required machine fields are missing (scope: `packages/core/src/managed-workflow-orchestration, packages/core/src/remote-bridge/handlers`; expected commit: `fix: bound repair loops with graceful degradation`).
28. [DONE] Git Commit: `fix: bound repair loops with graceful degradation` (hash: 6104a6817)

## Phase 4 - Validation Pressure Reduction (owner: Codex, updated: 2026-06-10)

### Stream: Hard Gate To Warning Conversion

29. [DONE] `orchestrator-stop-gate.phase4.validators.task1` Downgrade non-critical managed artifact validation failures to continuation-with-warning: Application Skeleton draft markdown structure codes become warnings carried into user review instead of repair rejections (Core reads only the machine JSON for the next action); deeper per-field splits for Diagram Modules and Quality Gates stay hard until user testing shows recoverable cases, since their machine artifacts are the next-step inputs (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton, doc/TODO/todo-plan.md`; expected commit: `fix: downgrade noncritical managed validators`).
30. [DONE] Git Commit: `fix: downgrade noncritical managed validators` (hash: 9ca918275)
31. [DONE] `orchestrator-stop-gate.phase4.development-tree.task1` Apply the no-stop policy to the Cluster Contract flow: idempotent no-staged turns advance to review instead of blocking, blocked messages either confirm the dispatched repair prompt or release the input with a re-validate instruction, and the Application Skeleton warning regression test is stabilized; Product Part order-plan softening is deferred until user testing shows a recoverable case (scope: `packages/core/src/remote-bridge/handlers/cluster-contract-turn-controller.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator-warnings.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: soften development tree contract blockers`).
32. [DONE] Git Commit: `fix: soften development tree contract blockers` (hash: c407dd833)

## Phase 5 - Project Manager Lock Semantics (owner: Codex, updated: 2026-06-10)

### Stream: Truthful User Input State

33. [DONE] `orchestrator-stop-gate.phase5.ui-lock.task1` Ensure Project Manager releases the input on every Core gate event: managed input gate `active: false` unlocks regardless of the lock reason (prefix-based managed-lock detection protects only non-managed bootstrap locks), so Core validation, review, warning, repair-ready, and bookkeeping states never leave a stale "agent is working" lock (scope: `src/client/project-manager/components/sessions/turn-state-stream.ts, doc/TODO/todo-plan.md`; expected commit: `fix: release input on core gates`).
34. [DONE] Git Commit: `fix: release input on core gates` (hash: 096ad06dd)
35. [DONE] `orchestrator-stop-gate.phase5.ui-lock.task2` Eliminate stale lock dead ends: expire the local managed-review pending lock when no Core ack arrives, unlock on `active: false` gate events regardless of reason, time-box the managed turn-completion arbitration so a hung handler cannot hold "agent is working" forever, and reconcile lock state from Core snapshots on reconnect (scope: `src/client/project-manager/components/sessions, packages/core/src/remote-bridge/handlers, doc/TODO/todo-plan.md`; expected commit: `fix: expire stale managed input locks`).
36. [DONE] Git Commit: `fix: expire stale managed input locks` (hash: 4ff8da9b5)
37. [DONE] `orchestrator-stop-gate.phase5.ui-lock-test.task1` Add a targeted Project Manager stream regression test proving that a managed input gate `active: false` event releases unknown managed lock reasons without force, so stale working locks cannot regress; cluster worktree and review-flow lock behavior is covered by the existing gate tests in the same suite (scope: `src/client/project-manager/components/sessions/turn-state-stream.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify core gate input release`).
38. [DONE] Git Commit: `test: verify core gate input release` (hash: 5551fd75d)

## Phase 6 - Documentation Sync (owner: Codex, updated: 2026-06-10)

### Stream: Architecture Update

39. [DONE] `orchestrator-stop-gate.phase6.docs.task1` Synchronize the implemented no-stop policy into the Core SSOT invariants (dual outcome, awaited dispatch with retry, 120s arbitration time box, bounded repair with review-gate degradation, two-basket dirty Git auto-commit); both Development Tree planning documents were already synchronized by the Phase 2 policy commits and verified unchanged (scope: `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe simplified orchestrator stop gates`).
40. [DONE] Git Commit: `docs: describe simplified orchestrator stop gates` (hash: 992690261)
41. [DONE] `orchestrator-stop-gate.phase6.pm-docs.task1` Document Project Manager lock/projection behavior for Core gates and attached worktree runtime roots (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe truthful core gate ui state`).
42. [DONE] Git Commit: `docs: describe truthful core gate ui state` (hash: 65a124aea)

## Phase 7 - Tooling Verification (owner: Codex, updated: 2026-06-10)

### Stream: Targeted Verification

43. [DONE] `orchestrator-stop-gate.phase7.verify.task1` Run targeted Core and Project Manager tests/builds for dirty Git auto-commit (step + preserve), guaranteed continuation delivery, contained errors, softened validators, Development Tree sub-agent flow, projected worktree sessions, and UI lock release/expiry, including silent-path tests where a failing handler must still produce an agent dispatch or button gate. Result: core build green; 133/137 core suite tests green with 4 pre-existing failures outside this scope (model-binding emission, diagram facade validation, dist exclusion) verified present before this scope on commit 88fb8e621; webview typecheck and bundle green; PM gate lock tests 9/9 (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify orchestrator stop gate simplification`).
44. [DONE] Git Commit: `test: verify orchestrator stop gate simplification` (hash: 38460f7af)

## Phase 8 - Release Build Confirmation (owner: Codex, updated: 2026-06-10)

### Stream: Release Permission

45. [DONE] `orchestrator-stop-gate.phase8.release-confirm.task1` Ask the user for explicit confirmation before preparing release notes, bumping versions, running `build-all.sh`, or packaging VSIX (scope: user workflow; expected commit: none). Result: User explicitly pre-authorized the release build in this session: 'доведи все до самого конца и собери новый релиз для моих тестов'.

### Stream: Release After Confirmation

46. [DONE] `orchestrator-stop-gate.phase8.release-notes.task1` Prepare release notes for the stop-gate simplification release after explicit confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare stop gate simplification release notes`).
47. [PENDING] Git Commit: `docs: prepare stop gate simplification release notes` (hash: TBD)
48. [TODO] `orchestrator-stop-gate.phase8.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare stop gate simplification release artifacts`).
49. [TODO] Git Commit: `build: prepare stop gate simplification release artifacts` (hash: TBD)
50. [TODO] `orchestrator-stop-gate.phase8.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package stop gate simplification vsix release`).
51. [TODO] Git Commit: `build: package stop gate simplification vsix release` (hash: TBD)

## Phase 9 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-10)

### Stream: FinderWidget Retest

52. [TODO] `orchestrator-stop-gate.phase9.user-retest.task1` User installs the release and retests the workflow from Quality Gates Baseline through Product Part, cluster-contract sub-agent creation, Clear/Undo rebootstrap, dirty Git auto-commit, and Project Manager dialog/input behavior (scope: user workflow; expected commit: none).

## Phase 10 - Scope Closeout (owner: Codex, updated: 2026-06-10)

### Stream: Plan And Planning Doc Disposition

53. [TODO] `orchestrator-stop-gate.phase10.closeout.task1` After explicit user acceptance, archive the completed todo plan and decide final disposition for the stop-gate planning document without archiving the two active Development Tree planning documents (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md`; expected commit: `docs: close orchestrator stop gate simplification plan`).
54. [TODO] Git Commit: `docs: close orchestrator stop gate simplification plan` (hash: TBD)
