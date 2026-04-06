# Development TODO Plan

## Execution Rules
- **Required reading (read before each fix):**
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
  - `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`
  - `doc/SolidWorks-WorkFlow/Plans/Workflow_Step_Symmetry_Architecture.md`
- Scope of this plan: retrofit all released trunk workflow steps so `Description`, `Virtual Simulation`, `Diagram Modules`, and `Foundation Envelope` use one canonical startup truth, one step-passport model, formal restart regression coverage, and a packaged release validation.
- Each micro-task must stay within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs and this plan in real time after every micro-task.
- Release stream is mandatory because the user validates packaged VSIX builds, not only local source changes.

## Phase 1 — Workflow Step Symmetry Retrofit (owner: Codex, updated: 2026-04-06)

### Stream: Planning And Scope
1. [DONE] Tighten `Workflow_NewStep_Rollout_Guardrails.md` so released trunk steps must share one canonical step-passport, one startup truth chain, and one retrofit/self-heal law for stale workspace metadata; scope: `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`; expected commit message: `docs(system): codify workflow step symmetry guardrails`
2. [DONE] Git Commit: `docs(system): codify workflow step symmetry guardrails` (hash: `622432b63`)
3. [DONE] Create the trunk-step symmetry planning intake and register it in `doc/SolidWorks-WorkFlow/Docs_Index.md`; scope: `doc/SolidWorks-WorkFlow/Plans/Workflow_Step_Symmetry_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs(plans): define workflow step symmetry retrofit`
4. [DONE] Git Commit: `docs(plans): define workflow step symmetry retrofit` (hash: `73e022e0f`)

### Stream: Core Startup Truth
1. [TODO] Build one canonical trunk startup snapshot that reconciles workflow-state, last-active, continuity, and artifact presence into the same active-step read model; scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts`, `packages/core/src/workflow/state/workflow-last-active-store.ts`; expected commit message: `feat(workflow-state): build canonical trunk startup snapshot`
2. [TODO] Git Commit: `feat(workflow-state): build canonical trunk startup snapshot` (hash: TBD)
3. [TODO] Persist repaired active-step truth back into canonical state when legacy workspace metadata is stale or behind the latest confirmed trunk step; scope: `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`, `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/workflow/runtime/workflow-runtime.test.ts`; expected commit message: `fix(workflow-state): self-heal stale active step`
4. [TODO] Git Commit: `fix(workflow-state): self-heal stale active step` (hash: TBD)

### Stream: Continuity And Dialog Symmetry
1. [TODO] Align dialog list/open restore with the canonical startup step truth so trunk-step reopen always resolves the history-backed dialog for the selected step; scope: `packages/core/src/remote-bridge/handlers/dialog-list-service.ts`, `packages/core/src/remote-bridge/handlers/dialog-open-service.ts`, `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`; expected commit message: `fix(continuity): align dialog restore with startup truth`
2. [TODO] Git Commit: `fix(continuity): align dialog restore with startup truth` (hash: TBD)
3. [TODO] Keep continuity duplicate handling and latest-step handoff deterministic under restart/backfill scenarios for the whole trunk chain; scope: `packages/core/src/remote-bridge/handlers/session-request-handler-continuity-root.ts`, `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`, `packages/core/src/remote-bridge/handlers/foundation-envelope-continuity-restore.test.ts`; expected commit message: `fix(continuity): preserve history-backed trunk restore`
4. [TODO] Git Commit: `fix(continuity): preserve history-backed trunk restore` (hash: TBD)

### Stream: PM Startup And Route Symmetry
1. [TODO] Make workspace-open auto-select derive stage/artifact selection from the canonical trunk startup snapshot instead of local heuristics; scope: `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`, `src/client/project-manager/components/layout/use-stage-panel-sync.ts`; expected commit message: `fix(pm): use canonical startup stage selection`
2. [TODO] Git Commit: `fix(pm): use canonical startup stage selection` (hash: TBD)
3. [TODO] Align session-panel startup restore and runtime dialog resolution with the same stage/session/artifact truth chain across all trunk entry paths; scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.ts`; expected commit message: `fix(pm): unify startup session restore`
4. [TODO] Git Commit: `fix(pm): unify startup session restore` (hash: TBD)

### Stream: Regression Coverage
1. [TODO] Add core tests for trunk-step startup snapshot symmetry, stale last-active repair, and cold-start status hydration for late trunk steps; scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`, `packages/core/src/workflow/state/workflow-last-active-store.test.ts`; expected commit message: `test(workflow-state): cover trunk startup symmetry`
2. [TODO] Git Commit: `test(workflow-state): cover trunk startup symmetry` (hash: TBD)
3. [TODO] Add PM tests for startup auto-select and session/artifact route symmetry across the released trunk chain; scope: `src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`, `src/client/project-manager/components/sessions/runtime-session-auto-select.test.ts`; expected commit message: `test(pm): guard trunk startup symmetry`
4. [TODO] Git Commit: `test(pm): guard trunk startup symmetry` (hash: TBD)
5. [TODO] Run targeted symmetry verification and record the concrete results in this plan; scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record trunk symmetry verification`
   Verification target: `node --test --import tsx packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts packages/core/src/workflow/state/workflow-last-active-store.test.ts`
   Verification target: `node --test --import tsx src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts src/client/project-manager/components/sessions/project-manager-session-view.test.tsx src/client/project-manager/components/sessions/runtime-session-auto-select.test.ts`
   Verification target: `npm run build --workspace=@codeai-hub/core`
   Verification target: `npm run build:project-manager`
6. [TODO] Git Commit: `docs(todo): record trunk symmetry verification` (hash: TBD)

### Stream: Release Build
1. [TODO] Update release-facing docs for the trunk-step symmetry retrofit from a clean pre-build tree; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(release): prepare trunk symmetry release notes`
2. [TODO] Git Commit: `docs(release): prepare trunk symmetry release notes` (hash: TBD)
3. [TODO] Run `./scripts/build-all.sh` on a clean tree and assemble the next patch release artifacts for the trunk-step symmetry retrofit; scope: versioned manifests, package versions, `package-lock.json`, release caches; expected commit message: `build(release): publish trunk symmetry retrofit release`
4. [TODO] Git Commit: `build(release): publish trunk symmetry retrofit release` (hash: TBD)
5. [TODO] Run `./scripts/build-release.sh --use-current-version`, archive the completed execution plan, and record the release closeout; scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session053.md`; expected commit message: `docs(session): record trunk symmetry retrofit release`
6. [TODO] Git Commit: `docs(session): record trunk symmetry retrofit release` (hash: TBD)
