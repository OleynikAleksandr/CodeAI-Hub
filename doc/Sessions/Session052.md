# Session 052 — PM startup restore SSOT release

**Date:** 2026-04-06 09:15 (CEST)
**Branch:** main
**Version:** 1.1.897

---

# 1. Work Done in This Session

## Work summary
- Fixed PM cold-start restore so the session panel no longer reopens stale browser-local dialog intents and instead follows the canonical workflow-state + continuity path.
- Removed browser-local startup restore for PM session views and reset startup state to runtime until a live PM dialog-open event arrives.
- Added cold-start `diagram_modules` status hydration from the canonical progress snapshot so completed work no longer comes back as false `todo` after restart.
- Updated `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md` to formalize the single-source startup restore model for PM.
- Rewrote and shortened `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`, preserving only the rollout rules that prevent continuity/status-source regressions when adding a new workflow step.
- Updated `README.md` and `CHANGELOG.md` for release `1.1.897`.
- Verified the PM/workflow fixes with `node --test --import tsx packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`, `node --test --import tsx src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`, `npm run build --workspace=@codeai-hub/core`, and `npm run build:project-manager`.
- Ran `./scripts/build-all.sh`, published refreshed provider/core/UI/launcher artefacts for `1.1.897`, and produced `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.897.vsix`.
- Ran `./scripts/build-release.sh --use-current-version` successfully and verified the expected release checkpoints: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, and `✅ Package created`.

## Git commits
(IMPORTANT: This list is required so the next session can restore context via `git show`)
- `8c7a97d4a fix(pm): align startup restore with workflow state`
- `36ff023af docs(system): tighten workflow rollout guardrails`
- `f0de8307c docs(release): prepare 1.1.897 notes`
- `b1b645c20 build(release): publish workflow restore ssot release`
- `TBD - this commit docs(session): record 1.1.897 workflow restore release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`
6. `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
7. `doc/TODO/todo-plan.md`
8. `doc/Sessions/Session052.md` (THIS REPORT)

## Plans for next session
- Validate `1.1.897` against the real PM restart scenario where stale browser-local restore previously masked the true last workflow stage.
- If restart behavior is stable, continue only from a newly approved scope and keep PM startup restore on the canonical workflow-state + continuity path.
- When rolling out any new workflow step, treat `Workflow_NewStep_Rollout_Guardrails.md` and `ProjectManager_WorkflowNavigation_SSOT.md` as hard SSOT constraints.
