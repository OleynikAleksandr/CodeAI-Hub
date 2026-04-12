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

### Stream: Localization & Open Issues (updated: 2026-04-12)

1. [DONE] Add confirmation card localization keys to source dictionaries + fix `confirm_warning` to use `{upstreamStage}` template variable (hash: 9a21948d6)
2. [DONE] Move keys from legacy to approved source dictionaries (hash: 07f27e16e)
3. [DONE] Add §4.5 Source Dictionary File Map to localization boundary contract (hash: 57ab76b9a)
4. [DONE] Add approved dictionary file map to invariant 16 in SystemArchitecture (hash: 23975c67c)
5. [TODO] Button spinner not visible — CSS class `pm-confirmation-card__start-btn--starting` specificity raised but still not rendering in production.
6. [TODO] Test full Start→fade→session flow end-to-end.
7. [TODO] Update `WorkflowSteps_Overview.md` with confirmation card boundary notes.

### Stream: Session Restore on Workspace Open (updated: 2026-04-12)

1. [DONE] Auto-select retry when first snapshot has no session (hash: 43b44b05d)
2. [DONE] WorkflowStateStore emit on chains count change (hash: 43b44b05d)
3. [DONE] Prevent retry dialog:list:result from overwriting loaded messages (hash: 0998d319a)
4. [DONE] Memoize artifact panel to prevent right-panel jitter during agent responses (hash: 627bd5444)
5. [DONE] Remove all diagnostic logs (hash: 627bd5444)
