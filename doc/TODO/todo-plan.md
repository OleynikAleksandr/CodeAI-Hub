# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "questionnaire-autoscroll-2026-05-30",
  "branch": "main",
  "baseHead": "cf7c49e1e",
  "lastRecordedCommit": "cf7c49e1e",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md",
  "currentTaskId": "autoscroll-impl",
  "expectedCommitMessage": "feat: auto-scroll questionnaire to next unfilled section or submit",
  "debt": {
    "expectedCommitMessage": "feat: auto-scroll questionnaire to next unfilled section or submit",
    "preCommitHead": "cf7c49e1e",
    "stage": "commit_pending",
    "taskId": "autoscroll-impl"
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
2. [PENDING] Git Commit: `feat: auto-scroll questionnaire to next unfilled section or submit` (hash: TBD)

### Stream: Tooling Verification
3. [TODO] `autoscroll-verify` Build webview and run webview typecheck for the questionnaire auto-scroll change — scope: `webview build`
