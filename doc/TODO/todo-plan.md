# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-formal-verification-phase-2026-06-05",
  "branch": "main",
  "baseHead": "2e7f35a14",
  "lastRecordedCommit": "2893e16e7",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md",
  "currentTaskId": "phase9.stream8.task2",
  "expectedCommitMessage": "docs: prepare release 1.2.458 notes",
  "debt": {
    "expectedCommitMessage": "docs: prepare release 1.2.458 notes",
    "preCommitHead": "2893e16e7",
    "stage": "commit_pending",
    "taskId": "phase9.stream8.task2"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- Required reading before each implementation fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Keep this scope limited to the Quality Gates Baseline managed lifecycle and formal verification before persistent return.
- Do not edit `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md` in this cycle.
- Each implementation task must touch no more than 3 files. If more files are needed, split the task before editing.
- Commit every completed implementation task through `npm run plan:commit -- "<expected commit message>"`.
- Do not run release packaging unless the user explicitly confirms a release build.

## Phase 1 - Quality Gates Formal Verification Planning (owner: Codex, updated: 2026-06-05)

### Stream: Plan Intake

1. [DONE] `phase1.stream1.task1` Record the accepted architecture direction for adding a formal Quality Gates verification phase before persistent return (scope: `doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan quality gates formal verification phase`).
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan quality gates formal verification phase` (hash: 493285524)

## Phase 2 - Stage Plan Lifecycle (owner: Codex, updated: 2026-06-05)

### Stream: Phase Model And Plan Generation

3. [DONE] `phase2.stream1.task1` Add the Quality Gates formal verification task id, Phase 4 plan append path, and Phase 5 persistent return numbering (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts`; expected commit: `feat: add quality gates formal verification phase model`).
4. [DONE] `phase2.stream1.commit1` Git Commit: `feat: add quality gates formal verification phase model` (hash: 5f03941d2)

### Stream: Phase Prompting

5. [DONE] `phase2.stream2.task1` Update Quality Gates runtime/asset prompting so Phase 3 no longer claims terminal completion and agents know Phase 4 formal verification is required, then sync the bundled prompt source (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts, packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts`; expected commit: `feat: prompt quality gates formal verification`).
6. [DONE] `phase2.stream2.commit1` Git Commit: `feat: prompt quality gates formal verification` (hash: 38824295b)
7. [DONE] `phase2.stream2.task2` Add formal bundled-template assertions for the Quality Gates Phase 4 verification prompt contract (scope: `packages/core/src/templates/quality-gates-bundled-templates.test.ts`; expected commit: `test: assert quality gates formal verification prompting`).
8. [DONE] `phase2.stream2.commit2` Git Commit: `test: assert quality gates formal verification prompting` (hash: e4add429d)

## Phase 3 - Core Verification Contract (owner: Codex, updated: 2026-06-05)

### Stream: Hook Command Resolution

9. [DONE] `phase3.stream1.task1` Add Core-owned static resolution for hook `npm run <script>` commands and tests that reject missing package scripts (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-formal-verification-runner.test.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts`; expected commit: `feat: validate quality gate hook commands`).
10. [DONE] `phase3.stream1.commit1` Git Commit: `feat: validate quality gate hook commands` (hash: 2b51f27db)

### Stream: Verification Evidence

11. [DONE] `phase3.stream2.task1` Extend Quality Gates JSON validation for `verificationState` and command evidence, including stale or missing evidence diagnostics (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-consistency-validator.ts`; expected commit: `feat: require quality gates verification evidence`).
12. [DONE] `phase3.stream2.commit1` Git Commit: `feat: require quality gates verification evidence` (hash: 3328ff051)
13. [DONE] `phase3.stream2.task2` Align existing Quality Gates validator prompt expectations with the formal verification persistent return wording (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts`; expected commit: `test: align quality gates verification return prompt`).
14. [DONE] `phase3.stream2.commit2` Git Commit: `test: align quality gates verification return prompt` (hash: a40fcfa80)

## Phase 4 - Orchestration And Handoff (owner: Codex, updated: 2026-06-05)

### Stream: Managed Turn Flow

15. [DONE] `phase4.stream1.task1` Add the Core continuation prompt for Phase 4 verification, route successful Phase 3 integration into that verification continuation, then route verified Phase 4 output into Phase 5 persistent return (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates.test.ts`; expected commit: `feat: gate quality gates completion on formal verification`).
16. [DONE] `phase4.stream1.commit1` Git Commit: `feat: gate quality gates completion on formal verification` (hash: f1f7cc822)

### Stream: Read Model And Bootstrap Guard

17. [DONE] `phase4.stream2.task1` Keep Project Manager/read-model and Development Tree unlock blocked until Quality Gates verification is valid, not only integrated (scope: `packages/core/src/remote-bridge/handlers/quality-gates-progress.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`; expected commit: `fix: require verified quality gates before development tree unlock`).
18. [DONE] `phase4.stream2.commit1` Git Commit: `fix: require verified quality gates before development tree unlock` (hash: 444f78e47)

## Phase 5 - Documentation Sync (owner: Codex, updated: 2026-06-05)

### Stream: SSOT Updates

19. [DONE] `phase5.stream1.task1` Update canonical workflow/managed orchestration docs for the new Quality Gates Phase 4/Phase 5 lifecycle and verification authority (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: document quality gates formal verification lifecycle`).
20. [DONE] `phase5.stream1.commit1` Git Commit: `docs: document quality gates formal verification lifecycle` (hash: 85083f58b)

## Phase 6 - Tooling Verification (owner: Codex, updated: 2026-06-05)

### Stream: Targeted Verification

21. [DONE] `phase6.stream1.task1` Run targeted tests for Quality Gates orchestration plus `npm run plan:validate`, `npm run build --workspace=@codeai-hub/core`, and any failing diagnostic commands required by the touched files (scope: verification commands and `doc/TODO/todo-plan.md`; expected commit: none). Result: targeted tests 31/31 passed and `npm run plan:validate` passed; `npm run build --workspace=@codeai-hub/core` exposed a missing Quality Gates `verified` fixture now tracked by Phase 6 repair.

### Stream: Build Fixture Repair

22. [DONE] `phase6.stream2.task1` Align the technical root progress projection test fixture with the new Quality Gates verification read-model field found by core build (scope: `packages/core/src/remote-bridge/handlers/technical-root-progress-projection.test.ts`; expected commit: `test: align quality gates progress fixture with verification state`).
23. [DONE] `phase6.stream2.commit1` Git Commit: `test: align quality gates progress fixture with verification state` (hash: 2ee778029)

## Phase 7 - Release Notes Preparation (owner: Codex, updated: 2026-06-05)

### Stream: Release Metadata

24. [DONE] `phase7.stream1.task1` Update release-facing README/CHANGELOG metadata for the confirmed `1.2.454` release before version bump/build scripts run (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.454 notes`).
25. [DONE] `phase7.stream1.commit1` Git Commit: `docs: prepare release 1.2.454 notes` (hash: 5e89dbe2f)

## Phase 8 - Release Build (owner: Codex, updated: 2026-06-05)

### Stream: Build And Package

26. [DONE] `phase8.stream1.task1` Run the confirmed release build flow: ensure clean tree, run `./scripts/build-all.sh`, verify produced tarballs, run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and record results (scope: `package.json, package-lock.json, packages/core/package.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/Kimi_Module/package.json, packages/localization/package.json, packages/translation/package.json, packages/initiatives/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/providers/glm-claude-code/manifest.json, assets/providers/kimi/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.454`).
27. [DONE] `phase8.stream1.commit1` Git Commit: `chore: build release 1.2.454` (hash: 447926e4c)

## Phase 9 - User Workflow Acceptance Testing (owner: User, updated: 2026-06-05)

### Stream: User Acceptance

28. [BLOCKED] `phase9.stream1.task1` Hand the implemented Quality Gates formal verification lifecycle and release artifact back for user workflow acceptance and wait for explicit acceptance or failure report (scope: user workflow acceptance; expected commit: none). Failure report: provider-visible Quality Gates prompt uses `Phase 1A` / `Phase 1B`, while the Core-owned stage plan uses Phase 1 / Phase 2.

### Stream: Acceptance Repair

29. [DONE] `phase9.stream2.task1` Remove misleading provider-visible `Phase 1A` / `Phase 1B` taxonomy from Quality Gates prompts and runtime artifact-mode guidance while keeping Core-owned Phase numbering intact (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.ts, packages/core/src/templates/bundled-templates.ts`; expected commit: `fix: clarify quality gates prompt phase taxonomy`).
30. [DONE] `phase9.stream2.commit1` Git Commit: `fix: clarify quality gates prompt phase taxonomy` (hash: 80878d1a8)
31. [DONE] `phase9.stream2.task2` Update bundled Quality Gates prompt and workflow prompt-pack tests so they assert research/draft pass terminology instead of provider-visible `Phase 1A` / `Phase 1B` (scope: `packages/core/src/templates/quality-gates-bundled-templates.test.ts, packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.test.ts`; expected commit: `test: align quality gates prompt taxonomy assertions`).
32. [DONE] `phase9.stream2.commit2` Git Commit: `test: align quality gates prompt taxonomy assertions` (hash: d32d38449)
33. [BLOCKED] `phase9.stream3.task1` Hand the repaired Quality Gates prompt taxonomy and release artifact back for user workflow acceptance retest (scope: user workflow acceptance; expected commit: none). Failure report: release 1.2.454 still uses the old provider-visible `Phase 1A` / `Phase 1B` prompt, Core prompt envelopes are inconsistent across Quality Gates turns, context-window rollover repair prompts do not carry a full phase resume envelope, and integration repair success incorrectly ends the stage without opening Phase 4 Formal Quality Gates Verification or Phase 5 Persistent Quality Gates User Return.

### Stream: Acceptance Failure Repair

34. [DONE] `phase9.stream4.task1` Route successful Quality Gates integration repair through the same Phase 4 formal verification continuation as the initial Phase 3 integration path and fail closed before terminal completion (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts`; expected commit: `fix: route quality gates repair success to verification`).
35. [DONE] `phase9.stream4.commit1` Git Commit: `fix: route quality gates repair success to verification` (hash: 6f6b7a8c3)
36. [DONE] `phase9.stream4.task2` Add a Core-owned Quality Gates Phase 1 startup envelope with the active stage todo-plan path and assert that the initial prompt no longer relies on legacy subphase wording (scope: `packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.ts, packages/core/src/remote-bridge/handlers/workflow-prompt-pack-quality-gates-envelope.ts, packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.test.ts`; expected commit: `fix: add quality gates startup phase envelope`).
37. [DONE] `phase9.stream4.commit2` Git Commit: `fix: add quality gates startup phase envelope` (hash: f3c4cfbb3)
38. [DONE] `phase9.stream4.task3` Standardize Quality Gates Phase 2, Phase 3, and repair continuation prompts with explicit phase names, active stage todo-plan path, and zero-context resume guidance (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.phase-envelope.test.ts`; expected commit: `fix: standardize quality gates continuation prompts`).
39. [DONE] `phase9.stream4.commit3` Git Commit: `fix: standardize quality gates continuation prompts` (hash: 60e00b842)
40. [DONE] `phase9.stream4.task4` Update release-facing metadata for the confirmed 1.2.455 retest build before version bump/build scripts run (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.455 notes`).
41. [DONE] `phase9.stream4.commit4` Git Commit: `docs: prepare release 1.2.455 notes` (hash: 678819c95)
42. [DONE] `phase9.stream4.task5` Run the confirmed release build flow for the retest build: ensure clean tree, run `./scripts/build-all.sh`, verify produced tarballs, run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and record results (scope: `package.json, package-lock.json, packages/core/package.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/Kimi_Module/package.json, packages/localization/package.json, packages/translation/package.json, packages/initiatives/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/providers/glm-claude-code/manifest.json, assets/providers/kimi/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.455`).
43. [DONE] `phase9.stream4.commit5` Git Commit: `chore: build release 1.2.455` (hash: 1bff05a76)

### Stream: Release 455 Repair

44. [DONE] `phase9.stream5.task1` Keep managed Core validation active across repeated internal continuations so terminal duplicate filtering cannot suppress a post-repair Quality Gates validation turn (scope: `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts, packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts`; expected commit: `fix: keep managed continuations validating after repair`).
45. [DONE] `phase9.stream5.commit1` Git Commit: `fix: keep managed continuations validating after repair` (hash: 03431f78a)
46. [DONE] `phase9.stream5.task2` Add a regression that reproduces the Quality Gates verification failure -> Phase 3 repair -> repeated Phase 4 continuation chain before user return (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates-repair-chain.test.ts`; expected commit: `test: cover quality gates verification repair chain`).
47. [DONE] `phase9.stream5.commit2` Git Commit: `test: cover quality gates verification repair chain` (hash: 3406a6874)
48. [DONE] `phase9.stream5.task3` Update release-facing metadata for the confirmed 1.2.456 retest build before version bump/build scripts run (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.456 notes`).
49. [DONE] `phase9.stream5.commit3` Git Commit: `docs: prepare release 1.2.456 notes` (hash: 9a774ea88)
50. [DONE] `phase9.stream5.task4` Run the confirmed release build flow for the 1.2.456 retest build: ensure managed-plan release state is recorded, run `./scripts/build-all.sh`, verify produced tarballs, run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and record results (scope: `package.json, package-lock.json, packages/core/package.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/Kimi_Module/package.json, packages/localization/package.json, packages/translation/package.json, packages/initiatives/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/providers/glm-claude-code/manifest.json, assets/providers/kimi/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.456`).
51. [DONE] `phase9.stream5.commit4` Git Commit: `chore: build release 1.2.456` (hash: 88ac25c54)

### Stream: Provider Runtime Dirty Gate Repair

54. [DONE] `phase9.stream6.task1` Classify provider runtime scratch/session backup residue as volatile for the technical pre-start dirty gate so Quality Gates is not blocked by stale provider files after clear undo/restart (scope: `packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.ts, packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: ignore provider runtime residue in technical dirty gate`).
55. [DONE] `phase9.stream6.commit1` Git Commit: `fix: ignore provider runtime residue in technical dirty gate` (hash: 8f1e8da67)
56. [DONE] `phase9.stream6.task2` Correct the Project Manager start-card dirty-state wording so workspace dirty cleanup is not rendered as a specific upstream artifact cleanup when dirty files still block a step (scope: `src/client/project-manager/components/shared/stage-confirmation-card.tsx, src/client/project-manager/components/shared/stage-confirmation-card-workflow.ts, src/client/project-manager/components/shared/stage-confirmation-card.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: label workspace dirty gate separately from artifacts`).
57. [DONE] `phase9.stream6.commit2` Git Commit: `fix: label workspace dirty gate separately from artifacts` (hash: 248404e46)
58. [DONE] `phase9.stream6.task3` Run focused verification for the provider runtime dirty gate and start-card wording changes before deciding whether a new release build is needed (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify provider runtime dirty gate repair`).
59. [DONE] `phase9.stream6.commit3` Git Commit: `test: verify provider runtime dirty gate repair` (hash: 1e9be8c44)

### Stream: Persistent Return Repair

60. [DONE] `phase9.stream7.task1` Fix Quality Gates repair advancement so a valid post-verification repair with `nextAction: open_persistent_return` creates/advances the persistent return plan boundary instead of rewinding the stage plan pointer to an old review task (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-paths.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts`; expected commit: `fix: open quality gates persistent return after verified repair`).
61. [DONE] `phase9.stream7.commit1` Git Commit: `fix: open quality gates persistent return after verified repair` (hash: e12b2e9c8)
62. [DONE] `phase9.stream7.task2` Route rejected Phase 4 verification attempts through a Phase 4 repair dispatch prompt instead of the Phase 3 integration repair envelope (scope: `packages/core/src/remote-bridge/handlers/quality-gates-repair-prompt-dispatch.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates-repair-chain.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: dispatch quality gates verification repair prompt`).
63. [DONE] `phase9.stream7.commit2` Git Commit: `fix: dispatch quality gates verification repair prompt` (hash: 020f5c69a)
64. [DONE] `phase9.stream7.task3` Add regression coverage for a Quality Gates Phase 4 verification rejection followed by a valid repair that must open Phase 5 Persistent Quality Gates User Return and keep the stage plan pointer on the return boundary (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-verification-repair.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.quality-gates-repair-chain.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates verified repair persistent return`).
65. [DONE] `phase9.stream7.commit3` Git Commit: `test: cover quality gates verified repair persistent return` (hash: 4fc686051)
66. [DONE] `phase9.stream7.task4` Run targeted Quality Gates orchestration tests and core build after the persistent-return repair (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify quality gates persistent return repair`).
67. [DONE] `phase9.stream7.commit4` Git Commit: `test: verify quality gates persistent return repair` (hash: defca4e37)
68. [DONE] `phase9.stream7.task5` Update release-facing metadata for the confirmed next retest build before version bump/build scripts run (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.457 notes`).
69. [DONE] `phase9.stream7.commit5` Git Commit: `docs: prepare release 1.2.457 notes` (hash: e7940c77b)
70. [DONE] `phase9.stream7.task6` Run the confirmed release build flow for the 1.2.457 retest build and record produced artifacts (scope: `package.json, package-lock.json, packages/core/package.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/Kimi_Module/package.json, packages/localization/package.json, packages/translation/package.json, packages/initiatives/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/providers/glm-claude-code/manifest.json, assets/providers/kimi/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.457`).
71. [DONE] `phase9.stream7.commit6` Git Commit: `chore: build release 1.2.457` (hash: cc5d21912)

### Stream: Verification Evidence Gate Relaxation

72. [DONE] `phase9.stream8.task1` Relax Quality Gates Phase 4 verification evidence validation so Core hard-gates the executable surface, accepts aggregate/hook evidence, and does not loop on evidence JSON shape alone (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-consistency-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator-runner-evidence.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: relax quality gates verification evidence gate`).
73. [DONE] `phase9.stream8.commit1` Git Commit: `fix: relax quality gates verification evidence gate` (hash: 2893e16e7)
74. [DONE] `phase9.stream8.task2` Update release-facing metadata for the confirmed 1.2.458 retest build before version bump/build scripts run (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.458 notes`).
75. [PENDING] `phase9.stream8.commit2` Git Commit: `docs: prepare release 1.2.458 notes` (hash: TBD)
76. [TODO] `phase9.stream8.task3` Run the confirmed release build flow for the 1.2.458 retest build and record produced artifacts (scope: `package.json, package-lock.json, packages/core/package.json, packages/Claude_Module/package.json, packages/Codex_AppServer_Module/package.json, packages/Gemini_Module/package.json, packages/Kimi_Module/package.json, packages/localization/package.json, packages/translation/package.json, packages/initiatives/package.json, packages/unified-session/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/claude/manifest.json, assets/providers/codex/manifest.json, assets/providers/gemini/manifest.json, assets/providers/glm-claude-code/manifest.json, assets/providers/kimi/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.458`).
77. [TODO] `phase9.stream8.commit3` Git Commit: `chore: build release 1.2.458` (hash: TBD)

## Phase 10 - Scope Closeout (owner: Codex, updated: 2026-06-05)

### Stream: Closeout

78. [TODO] `phase10.stream1.task1` Close this scope only after explicit user acceptance; archive the active plan and dispose the planning source without touching the Development Tree branch workflow architecture document (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md`; expected commit: `docs: close quality gates formal verification scope`).
79. [TODO] `phase10.stream1.commit1` Git Commit: `docs: close quality gates formal verification scope` (hash: TBD)
