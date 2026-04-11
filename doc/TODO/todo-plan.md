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

### Stream: Confirmation Card Component + Main Area Integration

1. [DONE] Create `src/client/project-manager/components/shared/stage-confirmation-card.tsx`: component with upstream artifact info helpers, start logic via WorkflowStepStartService, localized texts (ui_interface / user_guidance / system_feedback categories), existing PM CSS classes. Scope: 1 new file.
2. [DONE] Update `main-area.tsx`: destructure `snapshot` from `useWorkflowStateSnapshot()`, add `handleStepStarted` callback, pass new props to `MainAreaSessionContent`. Scope: 1 file.
3. [DONE] Update `main-area-panel-content.tsx`: extend `SessionContentProps`, add confirmation card branch for idle VS/DM stages without existing session, import `hasExistingStageSession` + `StageConfirmationCard`. Scope: 1 file.
4. [DONE] Run targeted builds: `npm run build:webview` + `npm run typecheck:webview` — both green.
5. [DONE] Git Commit: `feat: add stage confirmation card for trunk workflow step launch` (hash: 3c3462713)
6. [DONE] Update documentation: todo-plan.md, README, CHANGELOG for v1.1.935.
7. [DONE] Git Commit: `docs: align README and CHANGELOG with v1.1.935` (hash: TBD)
8. [TODO] Release build: `build-all.sh` + `build-release.sh`.
