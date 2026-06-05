# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-formal-verification-phase-2026-06-05",
  "branch": "main",
  "baseHead": "2e7f35a14",
  "lastRecordedCommit": "80878d1a8",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md",
  "currentTaskId": "phase9.stream2.task2",
  "expectedCommitMessage": "test: align quality gates prompt taxonomy assertions",
  "debt": {
    "expectedCommitMessage": "test: align quality gates prompt taxonomy assertions",
    "preCommitHead": "80878d1a8",
    "stage": "commit_pending",
    "taskId": "phase9.stream2.task2"
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
32. [PENDING] `phase9.stream2.commit2` Git Commit: `test: align quality gates prompt taxonomy assertions` (hash: TBD)
33. [TODO] `phase9.stream3.task1` Hand the repaired Quality Gates prompt taxonomy and release artifact back for user workflow acceptance retest (scope: user workflow acceptance; expected commit: none).

## Phase 10 - Scope Closeout (owner: Codex, updated: 2026-06-05)

### Stream: Closeout

34. [TODO] `phase10.stream1.task1` Close this scope only after explicit user acceptance; archive the active plan and dispose the planning source without touching the Development Tree branch workflow architecture document (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/QualityGates_FormalVerification_Phase_Planning.md`; expected commit: `docs: close quality gates formal verification scope`).
35. [TODO] `phase10.stream1.commit1` Git Commit: `docs: close quality gates formal verification scope` (hash: TBD)
