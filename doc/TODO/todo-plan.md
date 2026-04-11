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

1. [TODO] Create `src/client/project-manager/components/shared/stage-confirmation-card.tsx`: component with upstream artifact info helpers, start logic via WorkflowStepStartService, localized texts, existing PM CSS classes. Scope: 1 new file.
2. [TODO] Git Commit: `feat: add stage confirmation card component` (hash: TBD)
3. [TODO] Update `main-area.tsx`: destructure `snapshot` from `useWorkflowStateSnapshot()`, add `handleStepStarted` callback, pass new props to `MainAreaSessionContent`. Scope: 1 file.
4. [TODO] Update `main-area-panel-content.tsx`: extend `SessionContentProps`, add confirmation card branch for idle VS/DM stages without existing session. Scope: 1 file.
5. [TODO] Git Commit: `feat: integrate stage confirmation card into main area panels` (hash: TBD)
6. [TODO] Run targeted builds: `npm run build:webview` + `npm run typecheck:webview`. Fix if needed.
7. [TODO] Git Commit: `fix: ...` (hash: TBD, only if build fixes needed)
8. [TODO] Update documentation: `SystemArchitecture.md` (add confirmation card boundary note), `WorkflowSteps_Overview.md` (update VS/DM start mechanism), `todo-plan.md` status.
9. [TODO] Git Commit: `docs: update architecture and workflow docs for confirmation card` (hash: TBD)
