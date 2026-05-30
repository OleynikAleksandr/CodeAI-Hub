# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "questionnaire-autoscroll-2026-05-30",
  "branch": "main",
  "baseHead": "cf7c49e1e",
  "lastRecordedCommit": "838e336ce",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md",
  "currentTaskId": "dialog-reasoning-scroll",
  "expectedCommitMessage": "fix: re-pin session dialog scroll after reasoning translation grows bubble",
  "debt": {
    "expectedCommitMessage": "fix: re-pin session dialog scroll after reasoning translation grows bubble",
    "preCommitHead": "838e336ce",
    "stage": "commit_pending",
    "taskId": "dialog-reasoning-scroll"
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
14. [PENDING] Git Commit: `fix: re-pin session dialog scroll after reasoning translation grows bubble` (hash: TBD)

### Stream: Input Unlock Timing (from 1.2.407 retest)
15. [TODO] `input-unlock-premature` Fix: the user input field unlocks before the agent turn actually finishes. With Claude/Opus the dialog is still visually streaming the agent's last messages (and the final orchestrator/system gate bubble with the "Подтверждаю" button has not appeared yet), but the input is already editable and sendable. The unlock trigger likely fires on an early feedback/stream event instead of the true end-of-turn (stream complete AND the system gate bubble rendered) — scope: TBD (input lock state / turn-completion trigger, provider-specific for Claude); expected commit: `fix: unlock input only after agent turn fully completes`
16. [TODO] Git Commit: `fix: unlock input only after agent turn fully completes` (hash: TBD)
17. [TODO] `input-lock-managed-phases` Enhancement: in agent-to-orchestrator managed phases (e.g. the Diagram Modules step) keep the user input locked through all intermediate agent messages and unlock only when the final system/orchestrator gate bubble with the "Подтверждаю" button appears — scope: TBD (managed-phase input gating); expected commit: `feat: keep input locked through managed agent-orchestrator phases until gate`
18. [TODO] Git Commit: `feat: keep input locked through managed agent-orchestrator phases until gate` (hash: TBD)

### Stream: Tooling Verification
19. [TODO] `retest-fixes-verify` Build webview and run webview typecheck for the retest fixes — scope: `webview build`

### Stream: Release Build
20. [TODO] `release-docs-408` Update README and CHANGELOG to 1.2.408 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.408 release notes`
21. [TODO] Git Commit: `docs: prepare 1.2.408 release notes` (hash: TBD)
22. [TODO] `release-build-408` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.408 release`
23. [TODO] Git Commit: `chore: build 1.2.408 release` (hash: TBD)
24. [TODO] `release-vsix-408` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.408 vsix`
25. [TODO] Git Commit: `chore: package 1.2.408 vsix` (hash: TBD)

### Stream: User Visual Acceptance Testing
26. [TODO] `release-acceptance-408` Hand off `codeai-hub-1.2.408.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate

### Stream: Scope Closeout
27. [TODO] `scope-closeout` Reserved post-closeout handoff anchor — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, planning-doc disposition`
