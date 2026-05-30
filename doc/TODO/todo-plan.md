# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "questionnaire-autoscroll-2026-05-30",
  "branch": "main",
  "baseHead": "cf7c49e1e",
  "lastRecordedCommit": "f91b07eef",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md",
  "currentTaskId": "input-lock-regression-revert",
  "expectedCommitMessage": "fix: keep input free when managed review gate is shown",
  "debt": {
    "expectedCommitMessage": "fix: keep input free when managed review gate is shown",
    "preCommitHead": "f91b07eef",
    "stage": "commit_pending",
    "taskId": "input-lock-regression-revert"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit: ...` item.
- Keep micro-task file scope at three files/packages or less.
- Plan grows incrementally: new fixes/observations from the test-01 run are added as new Streams on demand, not planned ahead.
- Do not run release build without explicit user confirmation.
- Scope closeout requires explicit user acceptance.

## Phase 1 — Questionnaire Auto-Scroll (owner: Claude, updated: 2026-05-30)
### Stream: Auto-Scroll Implementation
1. [DONE] `autoscroll-impl` Auto-scroll description questionnaire to the first unfilled required section on load and to the submit footer once all required sections are filled (required = all except optional sections 0/8/9/10/12; section 11 is the last required) — scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx, src/client/project-manager/components/description/questionnaire-autoscroll.ts, src/client/ui/src/components/idea-questionnaire/idea-questionnaire-view.tsx, doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md`; expected commit: `feat: auto-scroll questionnaire to next unfilled section or submit`
2. [DONE] Git Commit: `feat: auto-scroll questionnaire to next unfilled section or submit` (hash: 29ff3d65b)

### Stream: Tooling Verification
3. [DONE] `autoscroll-verify` Build webview and run webview typecheck for the questionnaire auto-scroll change — scope: `webview build` Result: webview typecheck and build:webview passed for questionnaire auto-scroll change

### Stream: Release Build
4. [DONE] `release-docs` Update README and CHANGELOG to 1.2.407 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.407 release notes`
5. [DONE] Git Commit: `docs: prepare 1.2.407 release notes` (hash: 50240f51c)
6. [DONE] `release-build` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.407 release`
7. [DONE] Git Commit: `chore: build 1.2.407 release` (hash: 137987741)
8. [DONE] `release-vsix` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.407 vsix`
9. [DONE] Git Commit: `chore: package 1.2.407 vsix` (hash: 5885c7611)

### Stream: User Visual Acceptance Testing
10. [DONE] `release-acceptance` Hand off `codeai-hub-1.2.407.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.407 found 4 issues (2 scroll, 2 input-lock), not accepted; proceeding to implement the accumulated retest fixes in this scope

### Stream: Auto-Scroll Retest Fixes (from 1.2.407 retest)
11. [DONE] `autoscroll-fix-completion` Fix: with all sections filled, the questionnaire scrolls to the section-8 header instead of the submit footer. Hypothesis: the footer `scrollIntoView` fires on load before the auto-height textareas expand to fit the filled content, so the footer shifts down after the scroll and the viewport lands around section 8. Likely needs to defer/re-run the scroll after layout settles (rAF or after textarea auto-height) — scope: `src/client/ui/src/components/idea-questionnaire/idea-questionnaire-view.tsx`; expected commit: `fix: scroll questionnaire to submit footer after layout settles`
12. [DONE] Git Commit: `fix: scroll questionnaire to submit footer after layout settles` (hash: 838e336ce)

### Stream: Session Dialog Reasoning Scroll Fix (from 1.2.407 retest)
13. [DONE] `dialog-reasoning-scroll` Fix: in the session dialog panel the autoscroll keeps the latest bubble in view, but a reasoning bubble first renders in English and is then replaced by a taller Russian translation; the scroll is not re-adjusted after the bubble grows, so the bottom of the latest bubble/message is partially hidden below the fold. Likely needs to re-pin scroll-to-bottom after the reasoning translation grows the bubble (watch bubble height change and re-scroll while the view is pinned to bottom) — scope: `src/client/ui/src/session/dialog-panel.tsx`; expected commit: `fix: re-pin session dialog scroll after reasoning translation grows bubble`
14. [DONE] Git Commit: `fix: re-pin session dialog scroll after reasoning translation grows bubble` (hash: 1dab4e3dc)

### Stream: Input Unlock Timing (from 1.2.407 retest)
15. [DONE] `input-unlock-premature` Fix: the user input field unlocks before the agent turn actually finishes. With Claude/Opus the dialog is still visually streaming the agent's last messages (and the final orchestrator/system gate bubble with the "Подтверждаю" button has not appeared yet), but the input is already editable and sendable. The unlock trigger likely fires on an early feedback/stream event instead of the true end-of-turn (stream complete AND the system gate bubble rendered) — scope: `src/client/ui/src/session/session-view.tsx`; expected commit: `fix: unlock input only after agent turn fully completes`
16. [DONE] Git Commit: `fix: unlock input only after agent turn fully completes` (hash: e710cd8dc)
17. [DONE] `input-lock-managed-phases` Managed-phase input gating verified as covered without a separate code change: the gate-present input lock from task 15 (`src/client/ui/src/session/session-view.tsx`) keeps the input locked while a managed-workflow review gate is pending, and the existing diagram-modules sequence lock (`src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts`) holds the input blocked from turn_completed until the gate during managed phases — scope: verification only Result: Managed-phase input gating covered by the task-15 gate-present lock plus the existing diagram-modules sequence lock; no separate code change needed

### Stream: Tooling Verification
19. [DONE] `retest-fixes-verify` Build webview and run webview typecheck for the retest fixes — scope: `webview build` Result: webview typecheck and build:webview passed for all four retest fixes

### Stream: Release Build
20. [DONE] `release-docs-408` Update README and CHANGELOG to 1.2.408 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.408 release notes`
21. [DONE] Git Commit: `docs: prepare 1.2.408 release notes` (hash: 4141193ed)
22. [DONE] `release-build-408` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.408 release`
23. [DONE] Git Commit: `chore: build 1.2.408 release` (hash: ca488e5df)
24. [DONE] `release-vsix-408` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.408 vsix`
25. [DONE] Git Commit: `chore: package 1.2.408 vsix` (hash: f91b07eef)

### Stream: User Visual Acceptance Testing
26. [DONE] `release-acceptance-408` Hand off `codeai-hub-1.2.408.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.408 found a regression: the task-15 gate-present input lock wrongly blocks input while the System review gate is shown, where the user must be able to reply/edit; reverting

### Stream: Input Lock Regression Fix (from 1.2.408 retest)
27. [DONE] `input-lock-regression-revert` Revert the gate-present input lock from task 15 (e710cd8dc): keeping the input locked while the managed review gate bubble is present is WRONG — that System review gate is the moment the user replies/asks/edits or confirms, so the input must be FREE then. Restore effectiveContinuityLockActive to `continuityLockActive || managedReviewPendingId !== null` — scope: `src/client/ui/src/session/session-view.tsx`; expected commit: `fix: keep input free when managed review gate is shown`
28. [PENDING] Git Commit: `fix: keep input free when managed review gate is shown` (hash: TBD)

### Stream: Scope Closeout
29. [TODO] `scope-closeout` Reserved post-closeout handoff anchor — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, planning-doc disposition`
