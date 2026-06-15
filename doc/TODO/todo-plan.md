# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-order-plan-agent-fill-validator-hotfix-2026-06-15",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "eb246daab",
  "lastRecordedCommit": "391402f72",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentOrderPlan_AgentFill_Validator_Hotfix.md",
  "currentTaskId": "phase1.stream8.task1",
  "expectedCommitMessage": "docs: record order plan stop unlock verification",
  "debt": {
    "expectedCommitMessage": "docs: record order plan stop unlock verification",
    "preCommitHead": "391402f72",
    "stage": "commit_pending",
    "taskId": "phase1.stream8.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentOrderPlan_AgentFill_Validator_Hotfix.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit` item.
- Keep each implementation task scoped to no more than 3 files.
- Use `npm run plan:commit -- "<expected commit message>"` for planned commits.
- Do not bypass Husky hooks or quality gates.
- Do not build a release without explicit user confirmation.

## Phase 1 - Development Order Plan Validator Hotfix (owner: Codex, updated: 2026-06-15)

### Stream: Plan Setup

1. [DONE] `phase1.stream1.task1` Create the accepted hotfix planning source and active execution plan. (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentOrderPlan_AgentFill_Validator_Hotfix.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan development order validator hotfix`)
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan development order validator hotfix` (hash: 7ea43491c)

### Stream: Validator Fix

3. [DONE] `phase1.stream2.task1` Fix DevelopmentOrderPlan Markdown completion validation and repair diagnostics. (scope: `packages/core/src/remote-bridge/handlers/product-part-development-order-plan-turn-controller.ts`; expected commit: `fix: allow filled order plan agent-fill blocks`)
4. [DONE] `phase1.stream2.commit1` Git Commit: `fix: allow filled order plan agent-fill blocks` (hash: b594c308b)

### Stream: Regression Tests

5. [DONE] `phase1.stream3.task1` Add focused regression coverage for filled agent-fill wrappers and sentinel residue. (scope: `packages/core/src/remote-bridge/handlers/product-part-development-order-plan-turn-controller.test.ts`; expected commit: `test: cover order plan markdown completion validation`)
6. [DONE] `phase1.stream3.commit1` Git Commit: `test: cover order plan markdown completion validation` (hash: b275017c8)

### Stream: Tooling Verification

7. [DONE] `phase1.stream4.task1` Run targeted tests and Core build after the fix. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record order plan validator verification`)
    - Evidence 2026-06-15: `npx tsx --test packages/core/src/remote-bridge/handlers/product-part-development-order-plan-turn-controller.test.ts` passed 3/3 tests.
    - Evidence 2026-06-15: `npm run build --workspace=@codeai-hub/core` passed.
8. [DONE] `phase1.stream4.commit1` Git Commit: `docs: record order plan validator verification` (hash: 27b95aa23)

### Stream: Stop Unlock Scope Expansion

9. [DONE] `phase1.stream5.task1` Capture the user-reported stop/unlock deadlock and expand this hotfix scope before release. (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentOrderPlan_AgentFill_Validator_Hotfix.md`; expected commit: `docs: expand order plan stop unlock scope`)
10. [DONE] `phase1.stream5.commit1` Git Commit: `docs: expand order plan stop unlock scope` (hash: 47df9f759)

### Stream: Stop Unlock Fix

11. [DONE] `phase1.stream6.task1` Fix Stop handling so a stopped managed repair turn releases session input. (scope: `packages/core/src/remote-bridge/handlers/**`; expected commit: `fix: unlock stopped managed repair sessions`)
12. [DONE] `phase1.stream6.commit1` Git Commit: `fix: unlock stopped managed repair sessions` (hash: 856a9f6ab)

### Stream: Stop Unlock Regression Tests

13. [DONE] `phase1.stream7.task1` Add focused regression coverage for Stop releasing input in managed repair sessions. (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.stop.test.ts`; expected commit: `test: cover stopped managed repair unlock`)
14. [DONE] `phase1.stream7.commit1` Git Commit: `test: cover stopped managed repair unlock` (hash: 391402f72)

### Stream: Combined Tooling Verification

15. [DONE] `phase1.stream8.task1` Run targeted tests and Core build for the validator and stop/unlock fixes. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record order plan stop unlock verification`)
    - Evidence 2026-06-15: `npx tsx --test packages/core/src/remote-bridge/handlers/product-part-development-order-plan-turn-controller.test.ts packages/core/src/remote-bridge/handlers/session-request-handler.stop.test.ts` passed 6/6 tests.
    - Evidence 2026-06-15: `npm run build --workspace=@codeai-hub/core` passed.
16. [PENDING] `phase1.stream8.commit1` Git Commit: `docs: record order plan stop unlock verification` (hash: TBD)

### Stream: Release Build

17. [TODO] `phase1.stream9.task1` Build the confirmed release after both fixes are verified. (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.524`)
18. [TODO] `phase1.stream9.commit1` Git Commit: `chore: build release 1.2.524` (hash: TBD)

### Stream: User Workflow Acceptance Testing

19. [TODO] `phase1.stream10.task1` Report release results and wait for user acceptance. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record order plan stop unlock acceptance`)
20. [TODO] `phase1.stream10.commit1` Git Commit: `docs: record order plan stop unlock acceptance` (hash: TBD)

### Stream: Scope Closeout

21. [TODO] `phase1.stream11.task1` Close the accepted scope and archive planning state after user acceptance. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close order plan validator hotfix scope`)
22. [TODO] `phase1.stream11.commit1` Git Commit: `docs: close order plan validator hotfix scope` (hash: TBD)
23. [TODO] `phase1.stream11.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
