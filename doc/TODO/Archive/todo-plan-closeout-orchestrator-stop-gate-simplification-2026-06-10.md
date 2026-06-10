# Plan Closeout: orchestrator-stop-gate-simplification-2026-06-10

**Created:** 2026-06-10T15:06:21.038Z
**Acceptance:** User accepted release 1.2.486 retest and closeout: Quality Gates Baseline reached Persistent User Return; no-stop dual outcome, repair-limit continuation, and name-agnostic gate validation passed the workflow retest.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** orchestrator-stop-gate.phase10.closeout.task1
**Expected Commit:** docs: close orchestrator stop gate simplification plan
**Last Recorded Commit:** d026a9da4
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_OrchestratorStopGateSimplification.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "orchestrator-stop-gate-simplification-2026-06-10",
  "branch": "main",
  "baseHead": "8be648655",
  "lastRecordedCommit": "d026a9da4",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_OrchestratorStopGateSimplification.md",
  "currentTaskId": "orchestrator-stop-gate.phase10.closeout.task1",
  "expectedCommitMessage": "docs: close orchestrator stop gate simplification plan",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_OrchestratorStopGateSimplification.md`
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
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_OrchestratorStopGateSimplification.md`
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

## Session Handoff Notes (2026-06-10, release 1.2.486 built and delivered)

- Release `codeai-hub-1.2.486.vsix` is in the repository root; the 1.2.486 tarball set is in `doc/tmp/releases/` and `~/.codeai-hub/releases/`. The build was explicitly authorized by the user ("Принимаем эту модель, делай соответствующий фикс и после этого собери новый релиз для моих тестов"). The plan now waits on the Phase 9A retest round 2 (`orchestrator-stop-gate.phase9a.user-retest.task1`, the renumbered round-2 item).
- 1.2.486 contains two fixes: (1) Phase 9A repair-limit accept continuation - Confirm on the limit gate commits accepted-as-is state and continues the stage for Quality Gates / Diagram Modules / Application Skeleton, revision text dispatches a user-corrections repair prompt, unmatched confirms release the input; (2) Phase 9B name-agnostic Quality Gates validation - contract command is the single machine truth, reachability replaces name reconstruction, hook runs prove verification, templates/diagnostics rewritten (see `quality-gates-command-reachability.ts`, `quality-gates-diagnostics-explainer.ts`).
- Retest focus for 1.2.486: Quality Gates Baseline end to end - integration must pass with agent-chosen script names (run-1 naming `qg-*` ids included); if the repair limit is reached, Confirm must continue to formal verification without manual intervention. On success the user said the same entity-level principle will be reviewed for the remaining managed steps (likely a new planning intake after this scope closes).
- Old notes for 1.2.485 below remain for history.

- Release `codeai-hub-1.2.485.vsix` is in the repository root; the full 1.2.485 tarball set is in `doc/tmp/releases/` and `~/.codeai-hub/releases/`. The release build was explicitly pre-authorized by the user in this session; the plan now waits on Phase 9 user retest feedback.
- Phase 9 retest focus: FinderWidget flow from Quality Gates Baseline through Product Part and `note-selection-cluster`. Expected behavior: dirty Git auto-commits (managed step commit + `chore: preserve workspace changes`) and never stops; no "Core cannot continue" cards anywhere; the input never stays on "agent is working" after a Core gate (arbitration time box 120s, optimistic review lock TTL 60s); repair loops open the review gate after 3 attempts instead of looping.
- Known pre-existing red tests, NOT regressions of this scope (verified present on pre-implementation commit `88fb8e621`): `Application Skeleton validator accepts materialized scaffold when declared paths exist`, `DiagramModulesManagedGitBoundary excludes generated outputs from managed commits`, `managed workflow facade accepts valid Diagram Modules provider turns`, `Diagram Modules validation accepts an index-only subturn and requests the first Product Part` (managed-orchestration suite), plus 3 model-binding emission tests in `session-request-handler.test.js`. Candidates for `doc/BugRegistry.md` through a future plan task.
- Build procedure note: `build-all.sh` and `build-release.sh` require a clean tree while the active plan's machine advance keeps `doc/TODO/todo-plan.md` dirty. This cycle used `git stash push doc/TODO/todo-plan.md` -> build -> `git stash pop` -> `npm run plan:commit`. Direct `git commit` remains blocked by the plan pre-commit guard.
- On user acceptance: complete Phase 9 via `npm run plan:complete -- "<result>"`, then run Phase 10 closeout (archive the todo plan, decide the stop-gate planning doc disposition, keep both Development Tree planning documents active). On reported failures: keep the scope ACTIVE and add an investigation stream before any fixes.
- **Phase 9 retest result (2026-06-10): defect found — repair-limit accept gate is a dead end.** Quality Gates integration exhausted 3 repair attempts, Core correctly raised the repair-limit review gate (`buildRepairLimitReviewMessage`, tag `managed-workflow-user-review`), but the user's Confirm produced no continuation. Root cause: the limit branch in `session-request-handler-managed-workflow-turn.ts` only appends the gate message and settles; the stage plan stays on the open repair task (`quality-gates.phase3.repair.task4` after advance-past-limit), so `isQualityGatesReviewOpen` (review-task-prefix check in `managed-review-state-readers.ts`) returns false, every review-decision handler declines, and `handleManagedReviewConfirmAction` falls through to a silent `managed_review_gate_unhandled` session error. The same gap exists for Diagram Modules and Application Skeleton repair-limit gates. Evidence: FinderWidget-Test01 stage plan stuck on `quality-gates.phase3.repair.task4` / expected commit "attempt 4", session transcript ends at the gate message with no post-confirm events. Fix scope is Phase 9A below.

## Phase 1 - Stop-Gate Audit (owner: Codex, updated: 2026-06-10)

### Stream: Orchestrator Blocker Inventory

1. [DONE] `orchestrator-stop-gate.phase1.audit.task1` Record the new stop-gate policy, archive the superseded cluster-contract retest plan snapshot, and open the active blocker audit plan with links to all influencing planning/system documents (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/TODO/Archive/todo-plan-superseded-development-tree-cluster-contract-subagent-orchestration-2026-06-10.md, doc/TODO/todo-plan.md`; expected commit: `docs: audit orchestrator stop gates`).
2. [DONE] Git Commit: `docs: audit orchestrator stop gates` (hash: ef6767245)
3. [DONE] `orchestrator-stop-gate.phase1.audit.task2` Audit hard blocker call sites across managed workflow controllers, workflow boundary Git, Development Tree sub-agent controllers, Project Manager lock state, and plan-orchestrator commit boundaries; classify each blocker as keep, auto-fix, warning, or repair-prompt (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`; expected commit: `docs: classify orchestrator blocker policy`).
4. [DONE] Git Commit: `docs: classify orchestrator blocker policy` (hash: ca151e1bf)

## Phase 2 - No-Stop Policy Adoption And Dirty Git Elimination (owner: Codex, updated: 2026-06-10)

### Stream: No-Stop Policy Documentation

5. [DONE] `orchestrator-stop-gate.phase2.policy-docs.task1` Rewrite the stop-gate planning source to the accepted no-stop dual-outcome policy: every Core settlement ends as agent repair/continuation dispatch or as a button gate, informational stop cards are forbidden, dirty Git is always auto-committed with two-basket classification and preserve commits, destructive operations are preceded by auto-commit, repair loops are bounded with accept-with-warning degradation, and the silent-stop audit findings (swallowed dispatch errors, settled turns without dispatch, unprotected plan parsing, unbounded repair attempts, stale UI locks) are recorded in the blocker matrix (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/TODO/todo-plan.md`; expected commit: `docs: adopt no-stop dual outcome policy`).
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
47. [DONE] Git Commit: `docs: prepare stop gate simplification release notes` (hash: e254b81ab)
48. [DONE] `orchestrator-stop-gate.phase8.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare stop gate simplification release artifacts`).
49. [DONE] Git Commit: `build: prepare stop gate simplification release artifacts` (hash: 8655f2c09)
50. [DONE] `orchestrator-stop-gate.phase8.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, .vscodeignore, package-lock.json, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `build: package stop gate simplification vsix release`).
51. [DONE] Git Commit: `build: package stop gate simplification vsix release` (hash: 1892b3dd8)

## Phase 9 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-10)

### Stream: FinderWidget Retest

52. [DONE] `orchestrator-stop-gate.phase9.user-retest.task1` User installs the release and retests the workflow from Quality Gates Baseline through Product Part, cluster-contract sub-agent creation, Clear/Undo rebootstrap, dirty Git auto-commit, and Project Manager dialog/input behavior (scope: user workflow; expected commit: none). Result: Retest on 1.2.485 found a defect: Quality Gates repair-limit gate appeared correctly after 3 attempts, but user Confirm produced no continuation (stage plan stuck on quality-gates.phase3.repair.task4, review handlers declined, silent managed_review_gate_unhandled). Fix scope opened as Phase 9A.

## Phase 9A - Repair-Limit Accept Continuation (owner: Codex, updated: 2026-06-10)

Investigation summary: the repair-limit review gate violates the no-stop dual outcome invariant — it presents a user action (Confirm / describe corrections) that no handler can apply, because the stage plan is still on the open repair task instead of a recognizable review state. Accept must close the open repair task as accepted-as-is, advance the stage plan, commit, and dispatch the next-phase continuation; revision text must dispatch the open repair attempt with the user corrections.

### Stream: Repair-Limit Accept Continuation Fix

53. [DONE] `orchestrator-stop-gate.phase9a.fix.task1` Add the Quality Gates repair-limit acceptance module: parse the open repair attempt from the stage plan state, accept-as-is closes the open repair task with an accepted-as-is disposition, advances the stage plan to the next phase task (contract review after draft, formal verification after integration, persistent return after verification) and commits the managed ledger; expose the user-corrections repair prompt builder; covered by a module test (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-repair-limit-acceptance.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-repair-limit-acceptance.test.ts`; expected commit: `fix: continue quality gates after repair limit accept`).
54. [DONE] Git Commit: `fix: continue quality gates after repair limit accept` (hash: 666e3ed42)
55. [DONE] `orchestrator-stop-gate.phase9a.fix.task1b` Route the repair-limit review decision through the new continuation: when the Quality Gates review prefix is closed but the stage plan sits on a repair attempt above the limit, accept triggers the accept-as-is continuation (review handoff after draft, verification dispatch after integration, persistent return after verification) and revision text dispatches the user-corrections repair prompt; widen the review-decision gateway type to the Development Tree gateway required by the persistent-return handoff, and expose the controller-owned git boundary through a thin accept-as-is delegate (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts, packages/core/src/remote-bridge/handlers/quality-gates-review-decision-flow.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts`; expected commit: `fix: route repair limit confirm to continuation`).
56. [DONE] Git Commit: `fix: route repair limit confirm to continuation` (hash: 08b2f372f)
57. [DONE] `orchestrator-stop-gate.phase9a.fix.task2` Add the same repair-limit acceptance continuation for Diagram Modules: accept commits residue, closes the open repair task as accepted-as-is, advances the stage plan to user review, and commits the ledger; revision dispatches the user-corrections repair prompt; route all managed-stage repair-limit confirms through a single dispatcher ahead of the per-stage review handlers (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.ts, packages/core/src/remote-bridge/handlers/managed-stage-repair-limit-review.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts`; expected commit: `fix: continue diagram modules after repair limit accept`).
58. [DONE] Git Commit: `fix: continue diagram modules after repair limit accept` (hash: e77f1e0f7)
59. [DONE] `orchestrator-stop-gate.phase9a.fix.task3` Add the same repair-limit acceptance continuation for Application Skeleton draft and materialization repair cycles: accept commits residue, closes the open repair task as accepted-as-is, advances to contract review (draft) or the final user review (materialization), and routes through the managed-stage dispatcher; the ledger git boundary is obtained through the allowlisted factory (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-repair-limit-acceptance.ts, packages/core/src/remote-bridge/handlers/managed-stage-repair-limit-review.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance.ts`; expected commit: `fix: continue application skeleton after repair limit accept`).
60. [DONE] Git Commit: `fix: continue application skeleton after repair limit accept` (hash: fe6b7356e)
61. [DONE] `orchestrator-stop-gate.phase9a.fix.task4` Replace the silent `managed_review_gate_unhandled` session error with a released-input Core message that names the unmatched state and offers the concrete recovery action, so an unmatched review confirm can never end as an invisible dead end (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts, packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.managed-review.test.ts`; expected commit: `fix: release input on unhandled review confirm`).
62. [DONE] Git Commit: `fix: release input on unhandled review confirm` (hash: 477d9d3d7)
63. [DONE] `orchestrator-stop-gate.phase9a.fix.task5` Add targeted regression tests proving repair-limit accept continues the workflow for the three managed stages and that revision feedback dispatches the open repair attempt (scope: `packages/core/src/remote-bridge/handlers/managed-stage-repair-limit-review.test.ts`; expected commit: `test: verify repair limit acceptance continuation`).
64. [DONE] Git Commit: `test: verify repair limit acceptance continuation` (hash: bf18b759d)
65. [DONE] `orchestrator-stop-gate.phase9a.fix.task6` Sync the repair-limit acceptance continuation behavior into the Core SSOT invariants and the stop-gate planning document blocker matrix (scope: `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md, doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe repair limit acceptance continuation`).
66. [DONE] Git Commit: `docs: describe repair limit acceptance continuation` (hash: 4ce55c5d4)

### Stream: Release Rebuild Confirmation

67. [DONE] `orchestrator-stop-gate.phase9a.release-confirm.task1` Ask the user for explicit confirmation before preparing release notes, bumping versions, running `build-all.sh`, or packaging VSIX for the repair-limit fix release (scope: user workflow; expected commit: none). Result: User accepted the name-agnostic validation model and explicitly approved the release build after the Phase 9B fixes (message: 'Принимаем эту модель, делай соответствующий фикс и после этого собери новый релиз для моих тестов').

## Phase 9B - Name-Agnostic Quality Gates Validation (owner: Codex, updated: 2026-06-10)

Accepted model: the orchestrator validates only what affects downstream quality - every required gate has an executable command, the command resolves, and it is reachable from the matching lifecycle hook (directly or transitively through package scripts). Script names, qg:* prefixes, aggregate scripts, and direct-vs-transitive hook wiring stop being rejection reasons; verification proves enforcement by running the hooks themselves. Root cause: run 1 named gates `qg-*`, the template formula `qg:<gate-id>` and the validator canonicalization (`qg-` stripped) could never agree, and diagnostics never named the expected key - three blind repairs, guaranteed limit.

### Stream: Name-Agnostic Gate Validation

68. [DONE] `orchestrator-stop-gate.phase9b.fix.task1` Add the gate command reachability module and rewrite hook diagnostics name-agnostically: read each required gate command from the contract (`commands[gateId].proposedCommand`/`command`), require a non-empty command, resolve `npm run X` references against `package.json` transitively, and report gate commands not reachable from the matching `.husky` hook instead of reconstructing canonical script names (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-command-reachability.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.test.ts`; expected commit: `fix: validate gate commands name agnostically`).
69. [DONE] Git Commit: `fix: validate gate commands name agnostically` (hash: 4dfd90dc3)
70. [DONE] `orchestrator-stop-gate.phase9b.fix.task1b` Align the existing validator integration expectations with the new entity diagnostics so the suite stays green between micro-commits (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts`; expected commit: `test: align validator expectations with entity diagnostics`).
71. [DONE] Git Commit: `test: align validator expectations with entity diagnostics` (hash: 1bad868a4)
72. [DONE] `orchestrator-stop-gate.phase9b.fix.task2` Make verification evidence and planned-gate runner evidence contract-driven: verification requirements become hook runs (`sh .husky/pre-commit`, `sh .husky/pre-push`) plus contract commands for module-execution gates, with aggregate scripts accepted only as optional alternatives; planned-gate runner evidence detection uses the contract command instead of canonical script names (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-consistency-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-command-reachability.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.test.ts`; expected commit: `fix: verify gates by contract commands`).
73. [DONE] Git Commit: `fix: verify gates by contract commands` (hash: e8ea45310)
74. [DONE] `orchestrator-stop-gate.phase9b.fix.task3` Rewrite the stage prompts and diagnostics texts to the name-agnostic contract: integration prompt requires a working reachable command per required gate and downgrades `qg:*` naming to a style recommendation, the size-policy hint stops prescribing same-name scripts, and the new entity diagnostics name the exact unreachable command (scope: `packages/core/src/managed-workflow-orchestration/quality-gates, packages/core/src/templates, packages/agents/quality-gates-agent/assets`; expected commit: `fix: teach prompts name agnostic gate wiring`).
75. [DONE] Git Commit: `fix: teach prompts name agnostic gate wiring` (hash: b138bd446)
76. [DONE] `orchestrator-stop-gate.phase9b.fix.task4` Add the run-1 regression test: a contract whose gate ids carry a `qg-` prefix and whose package scripts use arbitrary names must pass integration validation when commands are reachable, and verification must accept hook-run evidence without aggregate scripts (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-name-agnostic-validation.test.ts`; expected commit: `test: verify name agnostic gate validation`).
77. [DONE] Git Commit: `test: verify name agnostic gate validation` (hash: 971cab3ab)
78. [DONE] `orchestrator-stop-gate.phase9b.fix.task5` Sync the name-agnostic validation model into the Core SSOT invariants and the stop-gate planning document validation-pressure section (scope: `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md, doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/TODO/todo-plan.md`; expected commit: `docs: describe name agnostic gate validation`).
79. [DONE] Git Commit: `docs: describe name agnostic gate validation` (hash: 8d28d06bd)
80. [DONE] `orchestrator-stop-gate.phase9a.release-notes.task1` Prepare release notes for the repair-limit acceptance fix release after explicit confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare repair limit acceptance release notes`).
81. [DONE] Git Commit: `docs: prepare repair limit acceptance release notes` (hash: 8fd7868b3)
82. [DONE] `orchestrator-stop-gate.phase9a.build-all.task1` Run `./scripts/build-all.sh` to bump packages and build provider/core/UI/launcher artifacts for the release (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: prepare repair limit acceptance release artifacts`).
83. [DONE] Git Commit: `build: prepare repair limit acceptance release artifacts` (hash: 348ac1027)
84. [DONE] `orchestrator-stop-gate.phase9a.vsix.task1` Run `./scripts/build-release.sh --use-current-version` and verify VSIX package output (scope: `codeai-hub-*.vsix, doc/tmp/releases/**, package-lock.json, doc/TODO/todo-plan.md`; expected commit: `build: package repair limit acceptance vsix release`).
85. [DONE] Git Commit: `build: package repair limit acceptance vsix release` (hash: d026a9da4)

### Stream: FinderWidget Retest Round 2

86. [DONE] `orchestrator-stop-gate.phase9a.user-retest.task1` User installs the rebuilt release and retests the Quality Gates flow end to end: integration passes with agent-chosen script names as long as gate commands are reachable from hooks, and if the repair limit is ever reached, Confirm commits the accepted-as-is state and the workflow continues to the next phase without manual intervention (scope: user workflow; expected commit: none). Result: User accepted release 1.2.486 retest: Quality Gates Baseline reached Persistent User Return; no-stop repair/verification lifecycle worked without dead-end stops.

## Phase 10 - Scope Closeout (owner: Codex, updated: 2026-06-10)

### Stream: Plan And Planning Doc Disposition

87. [IN_PROGRESS] `orchestrator-stop-gate.phase10.closeout.task1` After explicit user acceptance, archive the completed todo plan and decide final disposition for the stop-gate planning document without archiving the two active Development Tree planning documents (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_OrchestratorStopGateSimplification.md, doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_OrchestratorStopGateSimplification.md`; expected commit: `docs: close orchestrator stop gate simplification plan`).
88. [TODO] Git Commit: `docs: close orchestrator stop gate simplification plan` (hash: TBD)
````
