# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-final-review-gate-2026-05-18",
  "branch": "main",
  "baseHead": "3f3896ecd",
  "lastRecordedCommit": "38e4c0422",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_FinalReviewGate_Planning.md",
  "currentTaskId": "application-skeleton-final-review.phase4.retest-fix.core.task1",
  "expectedCommitMessage": "fix: route application skeleton final acceptance to quality gates",
  "debt": {
    "expectedCommitMessage": "fix: route application skeleton final acceptance to quality gates",
    "preCommitHead": "38e4c0422",
    "stage": "commit_pending",
    "taskId": "application-skeleton-final-review.phase4.retest-fix.core.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_FinalReviewGate_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_FinalReviewGate_Planning.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- Scope: fix `Application Skeleton` final materialization boundary so Core opens a user review gate before completing the stage and unlocking `Quality Gates`.
- Core remains workflow authority: PM renders the system-card button and submits intent only.
- Do not add Project Manager-owned acceptance state or direct client plan mutation.
- Keep microtasks to no more than 3 files each.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks. Do not bypass hooks.
- Release build requires separate explicit user confirmation.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-05-18)

### Stream: Active Scope Creation

1. [DONE] `application-skeleton-final-review.phase0.plan.task1` Create planning source, register it in Docs_Index, and open the active todo-plan (scope: `doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_FinalReviewGate_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan application skeleton final review gate`).
2. [DONE] Git Commit: `docs: plan application skeleton final review gate` (hash: 290219e42)

## Phase 1 - Core Final Gate Lifecycle (owner: Codex, updated: 2026-05-18)

### Stream: Stage Plan Completion Boundary

3. [DONE] `application-skeleton-final-review.phase1.lifecycle.task1` Defer Application Skeleton completed-stage ledger/unlock until explicit final user acceptance and expose final-review state helpers (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-model.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-review-intent.ts, doc/TODO/todo-plan.md`; expected commit: `fix: defer application skeleton completion until final review`).
4. [DONE] Git Commit: `fix: defer application skeleton completion until final review` (hash: d3bb293a4)

### Stream: Core Handoff And Review Actions

5. [DONE] `application-skeleton-final-review.phase1.handlers.task1` Emit a final Application Skeleton user-review card after materialization and route final accept/revision decisions through Core (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder.ts, doc/TODO/todo-plan.md`; expected commit: `fix: open application skeleton final review gate`).
6. [DONE] Git Commit: `fix: open application skeleton final review gate` (hash: e5d265532)

### Stream: Core Regression Tests

7. [DONE] `application-skeleton-final-review.phase1.tests.task1` Cover post-materialization review, final acceptance unlock, and final revision behavior for Application Skeleton (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover application skeleton final review gate`).
8. [DONE] Git Commit: `test: cover application skeleton final review gate` (hash: a2327cf44)

## Phase 2 - Documentation And Verification (owner: Codex, updated: 2026-05-18)

### Stream: SSOT Documentation

9. [DONE] `application-skeleton-final-review.phase2.docs.task1` Document the Application Skeleton post-materialization user review gate in managed workflow SSOT docs (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_FinalReviewGate_Planning.md, doc/TODO/todo-plan.md`; expected commit: `docs: document application skeleton final review gate`).
10. [DONE] Git Commit: `docs: document application skeleton final review gate` (hash: 8962d0a66)

### Stream: Tooling Verification

11. [DONE] `application-skeleton-final-review.phase2.verify.task1` Run targeted Core tests and record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify application skeleton final review gate`).
    - Verification results (2026-05-18): `npx tsc --noEmit --pretty false -p packages/core/tsconfig.json` passed; `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts` passed (`12/12`).
12. [DONE] Git Commit: `test: verify application skeleton final review gate` (hash: e6d13c13e)

## Phase 3 - Release Build (owner: Codex, updated: 2026-05-18)

### Stream: Release Build Confirmation

13. [DONE] `application-skeleton-final-review.phase3.release.gate.task1` Ask the user for explicit release build confirmation before preparing release notes or running release scripts (scope: user confirmation only; expected commit: none). Result: User explicitly confirmed release build on 2026-05-18.

### Stream: Release Build

14. [DONE] `application-skeleton-final-review.phase3.release.docs.task1` Update release-facing README/CHANGELOG for v1.2.303 before the version bump/build so the VSIX contains the Application Skeleton final review gate release notes (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.303`).
15. [DONE] Git Commit: `docs: prepare release 1.2.303` (hash: 507d418d8)
16. [DONE] `application-skeleton-final-review.phase3.release.buildall.task1` Run `./scripts/build-all.sh` for v1.2.303 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/*/manifest.json, assets/providers/*/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.303 artifacts`).
    - Verification 2026-05-18: `./scripts/build-all.sh --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated artifacts in `doc/tmp/releases/`: `claude-module-1.2.303.tar.bz2`, `codex-module-1.2.303.tar.bz2`, `gemini-module-1.2.303.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.303.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.303.tar.bz2`, `vscode-webview-1.2.303.tar.bz2`, `project-manager-1.2.303.tar.bz2`.
17. [DONE] Git Commit: `chore: build release 1.2.303 artifacts` (hash: d9a9bf992)
18. [DONE] `application-skeleton-final-review.phase3.release.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.303 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.303 vsix`).
    - Verification 2026-05-18: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Output confirmed `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `✅ Package created`.
    - VSIX: `codeai-hub-1.2.303.vsix` (`48M`, sha256 `81f80294f7c6bed21ce32e180a097a97d7e5ede4a15425ad23156fcc16d16e7a`).
19. [DONE] Git Commit: `chore: package release 1.2.303 vsix` (hash: 38e4c0422)

## Phase 4 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-18)

### Stream: User Retest

20. [BLOCKED] `application-skeleton-final-review.phase4.acceptance.task1` User installs/retests the release and confirms Application Skeleton shows the final `Подтверждаю` gate before Quality Gates unlocks (scope: user workflow acceptance only; expected commit: none). Result: v1.2.303 retest failed on 2026-05-18; final `Подтверждаю` still leaves the user in the Application Skeleton dialog with a completion message instead of moving to the Quality Gates card.

### Stream: Retest Failure Fix

21. [DONE] `application-skeleton-final-review.phase4.retest-fix.core.task1` Emit a Core-owned stage activation event after final Application Skeleton acceptance and stop appending the stale Application Skeleton persistent-return message (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts, packages/core/src/remote-bridge/types.ts, doc/TODO/todo-plan.md`; expected commit: `fix: route application skeleton final acceptance to quality gates`).
22. [PENDING] Git Commit: `fix: route application skeleton final acceptance to quality gates` (hash: TBD)
23. [TODO] `application-skeleton-final-review.phase4.retest-fix.client.task1` Route the Project Manager stage-activation bridge event to the existing Quality Gates card navigation and cover the regression (scope: `src/client/project-manager/components/layout/main-area.tsx, src/client/project-manager/components/layout/workflow-navigation.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover application skeleton final acceptance navigation`).
24. [TODO] Git Commit: `test: cover application skeleton final acceptance navigation` (hash: TBD)
25. [TODO] `application-skeleton-final-review.phase4.release.gate.task1` Ask the user for explicit corrective release confirmation before preparing v1.2.304 release notes or running release scripts (scope: user confirmation only; expected commit: none).

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-05-18)

### Stream: Scope Closeout

26. [TODO] `application-skeleton-final-review.phase5.closeout.task1` After explicit user acceptance, archive the active todo-plan, resolve the planning document disposition, and update Docs_Index if needed (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close application skeleton final review gate scope`).
27. [TODO] Git Commit: `docs: close application skeleton final review gate scope` (hash: TBD)
