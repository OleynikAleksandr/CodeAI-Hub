# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-order-plan-agent-fill-validator-hotfix-2026-06-15",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "eb246daab",
  "lastRecordedCommit": "0a4d5409d",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentOrderPlan_AgentFill_Validator_Hotfix.md",
  "currentTaskId": "phase1.stream19.task1",
  "expectedCommitMessage": "docs: record visible dialog translation verification",
  "debt": {
    "expectedCommitMessage": "docs: record visible dialog translation verification",
    "preCommitHead": "0a4d5409d",
    "stage": "commit_pending",
    "taskId": "phase1.stream19.task1"
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
16. [DONE] `phase1.stream8.commit1` Git Commit: `docs: record order plan stop unlock verification` (hash: 1975f9ee7)

### Stream: Release Build

17. [DONE] `phase1.stream9.task1` Prepare release notes for the confirmed 1.2.524 release before version bump/build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.524 release notes`)
18. [DONE] `phase1.stream9.commit1` Git Commit: `docs: prepare 1.2.524 release notes` (hash: 9d035065a)
19. [DONE] `phase1.stream9.task2` Build the confirmed release after both fixes are verified. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.524`)
    - Evidence 2026-06-15: `./scripts/build-all.sh --allow-dirty` passed for `1.2.524`; dirty input was the active `doc/TODO/todo-plan.md` post-commit transition state.
    - Evidence 2026-06-15: `./scripts/build-release.sh --use-current-version --allow-dirty` passed for `1.2.524`, including SDK exclusions, local artefact validation, markdown links, duplication advisory check, production dependency pruning, VSIX package creation and VSIX runtime package surface verification.
    - VSIX: `codeai-hub-1.2.524.vsix`, sha256 `6d6e392a68c746e7abb430a9a7cb3a374794efae21eac22df69525f6dbf3893d`.
    - Tarballs in `doc/tmp/releases/`: `claude-module-1.2.524.tar.bz2`, `codex-module-1.2.524.tar.bz2`, `gemini-module-1.2.524.tar.bz2`, `glm-claude-code-module-1.2.524.tar.bz2`, `kimi-module-1.2.524.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.524.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.524.tar.bz2`, `vscode-webview-1.2.524.tar.bz2`, `project-manager-1.2.524.tar.bz2`.
20. [DONE] `phase1.stream9.commit2` Git Commit: `chore: build release 1.2.524` (hash: 7344528a3)

### Stream: Stale Thinking Stop Unlock Scope Expansion

21. [DONE] `phase1.stream10.task1` Capture the user-reported stale-thinking input lock after Stop and expand this hotfix scope for all workflow steps before acceptance. (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentOrderPlan_AgentFill_Validator_Hotfix.md`; expected commit: `docs: expand stale thinking stop unlock scope`)
22. [DONE] `phase1.stream10.commit1` Git Commit: `docs: expand stale thinking stop unlock scope` (hash: 609d10aa6)

### Stream: Stale Thinking Stop Unlock Fix

23. [DONE] `phase1.stream11.task1` Fix shared input-state derivation so a stopped stale thinking bubble cannot keep any step input locked. (scope: `src/client/ui/src/session/session-view.tsx`; expected commit: `fix: unlock stopped stale thinking sessions`)
24. [DONE] `phase1.stream11.commit1` Git Commit: `fix: unlock stopped stale thinking sessions` (hash: 37a85a109)

### Stream: Stale Thinking Stop Unlock Regression Tests

25. [DONE] `phase1.stream12.task1` Add focused UI regression coverage for stage-neutral stale thinking after Stop. (scope: `src/client/ui/src/session/session-view.test.tsx`; expected commit: `test: cover stopped stale thinking unlock`)
26. [DONE] `phase1.stream12.commit1` Git Commit: `test: cover stopped stale thinking unlock` (hash: 06aec0757)

### Stream: Stale Thinking Stop Unlock Verification

27. [DONE] `phase1.stream13.task1` Run targeted UI tests and webview type-check for the stale thinking Stop unlock fix. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record stale thinking stop unlock verification`)
    - Evidence 2026-06-16: `npx tsx --test src/client/ui/src/session/session-view.test.tsx src/client/ui/src/session/input-panel.test.tsx` passed 19/19 tests.
    - Evidence 2026-06-16: `npm run typecheck:webview` passed.
28. [DONE] `phase1.stream13.commit1` Git Commit: `docs: record stale thinking stop unlock verification` (hash: 22e92f073)

### Stream: Follow-up Release Notes

29. [DONE] `phase1.stream14.task1` Prepare release notes for the confirmed 1.2.525 release before version bump/build. (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.525 release notes`)
30. [DONE] `phase1.stream14.commit1` Git Commit: `docs: prepare 1.2.525 release notes` (hash: 64ca3c082)

### Stream: Follow-up Release Build

31. [DONE] `phase1.stream15.task1` Build the next release after explicit user confirmation. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.525`)
    - Evidence 2026-06-16: `./scripts/build-all.sh --allow-dirty` passed for `1.2.525`; dirty input was the active `doc/TODO/todo-plan.md` post-commit transition state.
    - Evidence 2026-06-16: `./scripts/build-release.sh --use-current-version --allow-dirty` passed for `1.2.525`, including architecture, type-check, compile, SDK exclusions, local artefact validation, markdown links, duplication advisory check, production dependency pruning, VSIX package creation and VSIX runtime package surface verification.
    - VSIX: `codeai-hub-1.2.525.vsix`, sha256 `b6775c06084e8a6d9097123ebd7d7d15916759b2d852a21d9791103cb700d5ab`.
    - Tarballs in `doc/tmp/releases/`: `claude-module-1.2.525.tar.bz2`, `codex-module-1.2.525.tar.bz2`, `gemini-module-1.2.525.tar.bz2`, `glm-claude-code-module-1.2.525.tar.bz2`, `kimi-module-1.2.525.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.525.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.525.tar.bz2`, `vscode-webview-1.2.525.tar.bz2`, `project-manager-1.2.525.tar.bz2`.
32. [DONE] `phase1.stream15.commit1` Git Commit: `chore: build release 1.2.525` (hash: ed7801107)

### Stream: Visible Dialog Translation Scope Expansion

33. [DONE] `phase1.stream16.task1` Capture the user-reported Kimi Description English pre-tool update and Core-generated user-role dialog localization gap before acceptance. (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/DevelopmentOrderPlan_AgentFill_Validator_Hotfix.md`; expected commit: `docs: expand visible dialog translation scope`)
34. [DONE] `phase1.stream16.commit1` Git Commit: `docs: expand visible dialog translation scope` (hash: 5a255fedd)

### Stream: Visible Dialog Translation Fix

35. [DONE] `phase1.stream17.task1` Allow ordinary visible assistant messages and Core-generated deferred user-role messages to enter the existing reasoning translation pipeline. (scope: `packages/core/src/session-translation/session-translation-dispatcher.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`; expected commit: `fix: translate visible dialog updates`)
36. [DONE] `phase1.stream17.commit1` Git Commit: `fix: translate visible dialog updates` (hash: 7383b9dd8)

### Stream: Visible Dialog Translation Regression Tests

37. [DONE] `phase1.stream18.task1` Add focused Core regression coverage for ordinary assistant messages and deferred Core user-role messages using the reasoning translation overlay. (scope: `packages/core/src/session-translation/session-translation-facade.test.ts, packages/core/src/session-translation/session-translation-dispatcher.test.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts`; expected commit: `test: cover visible dialog translation`)
38. [DONE] `phase1.stream18.commit1` Git Commit: `test: cover visible dialog translation` (hash: 0a4d5409d)

### Stream: Visible Dialog Translation Verification

39. [DONE] `phase1.stream19.task1` Run targeted Core translation tests and Core build for the visible dialog localization fix. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record visible dialog translation verification`)
    - Evidence 2026-06-16: `npx tsx --test packages/core/src/session-translation/session-translation-facade.test.ts packages/core/src/session-translation/session-translation-dispatcher.test.ts packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts` passed 15/15 tests.
    - Evidence 2026-06-16: `npm run build --workspace=@codeai-hub/core` passed.
40. [PENDING] `phase1.stream19.commit1` Git Commit: `docs: record visible dialog translation verification` (hash: TBD)

### Stream: Follow-up Release Build

41. [TODO] `phase1.stream20.task1` Build the next release after explicit user confirmation. (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.526`)
42. [TODO] `phase1.stream20.commit1` Git Commit: `chore: build release 1.2.526` (hash: TBD)

### Stream: User Workflow Acceptance Testing

43. [TODO] `phase1.stream21.task1` Report visible dialog translation release results and wait for user acceptance. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record visible dialog translation acceptance`)
44. [TODO] `phase1.stream21.commit1` Git Commit: `docs: record visible dialog translation acceptance` (hash: TBD)

### Stream: Scope Closeout

45. [TODO] `phase1.stream22.task1` Close the accepted scope and archive planning state after user acceptance. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close order plan validator hotfix scope`)
46. [TODO] `phase1.stream22.commit1` Git Commit: `docs: close order plan validator hotfix scope` (hash: TBD)
47. [TODO] `phase1.stream22.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
