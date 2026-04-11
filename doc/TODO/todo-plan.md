# Plan: Stage Confirmation Card

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/StageConfirmationCard_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/StageConfirmationCard_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

## Execution Rules
- **Required reading:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each subtask touches max 3 files.
- Each subtask is paired with a Git Commit line.
- **Gates (auto via Husky):** `pre-commit` runs architecture check, lint, knip, format.
- **Targeted builds:** `npm run build:webview`, `npm run typecheck:webview`.

## Phase 1 — Stage Confirmation Card (owner: Claude, updated: 2026-04-11)

### Stream: Confirmation Card Component + Main Area Integration — DONE

1. [DONE] Create `stage-confirmation-card.tsx` (hash: 3c3462713)
2. [DONE] Fix hardcoded `startupStage="description"` → dynamic prop (hash: 1437eab0e)
3. [DONE] Prop-based session intent replaces event-based startup (hash: dd4ec40af)
4. [DONE] Derived viewMode eliminates session view flashing (hash: 8a8ec1685)
5. [DONE] Neutral empty state text (hash: fbf6269f1)
6. [DONE] Smooth fade transition on confirmation card start (hash: 57d7293aa)
7. [DONE] Eliminate session view jitter from workflow state polling (hash: 57695362e)
8. [DONE] Pass session intent via props after confirmation card start (hash: ad44efa40)

### Stream: Open issues for next session

1. [TODO] Button spinner not visible — CSS class `pm-confirmation-card__start-btn--starting` specificity raised but still not rendering in production. Investigate whether the CSS file is loaded in correct order or whether `pm-provider-picker__button` padding override still wins.
2. [TODO] Test full Start→fade→session flow end-to-end after fix ad44efa40. Previous release (v1.1.940) had the card fade out but session not appearing without manual stage switching. v1.1.942 should fix this via prop-based intent.
3. [TODO] Update `SystemArchitecture.md` and `WorkflowSteps_Overview.md` with confirmation card boundary notes.
4. [TODO] Session report for this session.
