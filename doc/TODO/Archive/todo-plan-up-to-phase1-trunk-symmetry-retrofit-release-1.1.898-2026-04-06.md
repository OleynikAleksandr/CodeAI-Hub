# Development TODO Plan

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Workflow_Step_Symmetry_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
  - `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Workflow_Step_Symmetry_Architecture.md`
- This archived plan keeps the execution-cycle context pack that was active during the `1.1.898` trunk symmetry retrofit wave.

## Execution Rules
- **Required reading (read before each fix):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Scope of this plan: retrofit all released trunk workflow steps so `Description`, `Virtual Simulation`, `Diagram Modules`, and `Foundation Envelope` use one canonical startup truth, one step-passport model, formal restart regression coverage, and a packaged release validation.
- Each micro-task must stay within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs and this plan in real time after every micro-task.
- Release stream is mandatory because the user validates packaged VSIX builds, not only local source changes.

## Phase 1 — Workflow Step Symmetry Retrofit (owner: Codex, updated: 2026-04-06)

### Stream: Planning And Scope
1. [DONE] Tighten `Workflow_NewStep_Rollout_Guardrails.md` so released trunk steps must share one canonical step-passport, one startup truth chain, and one retrofit/self-heal law for stale workspace metadata; scope: `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`; expected commit message: `docs(system): codify workflow step symmetry guardrails`
2. [DONE] Git Commit: `docs(system): codify workflow step symmetry guardrails` (hash: `622432b63`)
3. [DONE] Create the trunk-step symmetry planning intake and register it in `doc/SolidWorks-WorkFlow/Docs_Index.md`; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Workflow_Step_Symmetry_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs(plans): define workflow step symmetry retrofit`
4. [DONE] Git Commit: `docs(plans): define workflow step symmetry retrofit` (hash: `73e022e0f`)

### Stream: Core Startup Truth
1. [DONE] Build one canonical trunk startup snapshot that reconciles workflow-state, last-active, continuity, and artifact presence into the same active-step read model; scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-last-active-resolver.ts`, `packages/core/src/workflow/state/workflow-last-active-store.ts`; expected commit message: `feat(workflow-state): build canonical trunk startup snapshot`
2. [DONE] Git Commit: `feat(workflow-state): build canonical trunk startup snapshot` (hash: `822ad84bb`)
3. [DONE] Persist repaired active-step truth back into canonical state when legacy workspace metadata is stale or behind the latest confirmed trunk step; scope: `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`, `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/workflow/runtime/workflow-runtime.test.ts`; expected commit message: `fix(workflow-state): self-heal stale active step`
4. [DONE] Git Commit: `fix(workflow-state): self-heal stale active step` (hash: `ead8e0ea0`)

### Stream: Continuity And Dialog Symmetry
1. [DONE] Align dialog list/open restore with the canonical startup step truth so trunk-step reopen always resolves the history-backed dialog for the selected step; scope: carried forward from the `1.1.896` continuity baseline, revalidated during this retrofit via `packages/core/src/remote-bridge/handlers/foundation-envelope-continuity-restore.test.ts`; expected commit message: `fix(continuity): align dialog restore with startup truth`
2. [DONE] Git Commit: `fix(continuity): align dialog restore with startup truth` (hash: baseline `91d1aef0b`)
3. [DONE] Keep continuity duplicate handling and latest-step handoff deterministic under restart/backfill scenarios for the whole trunk chain; scope: carried forward from the `1.1.896` continuity baseline, revalidated green in this wave without extra source delta; expected commit message: `fix(continuity): preserve history-backed trunk restore`
4. [DONE] Git Commit: `fix(continuity): preserve history-backed trunk restore` (hash: baseline `91d1aef0b`)

### Stream: PM Startup And Route Symmetry
1. [DONE] Make workspace-open auto-select derive stage/artifact selection from the canonical trunk startup snapshot instead of local heuristics; scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`; expected commit message: `fix(pm): use canonical startup stage selection`
2. [DONE] Git Commit: `fix(pm): use canonical startup stage selection` (hash: `274852040`)
3. [DONE] Align session-panel startup restore and runtime dialog resolution with the same stage/session/artifact truth chain across all trunk entry paths; scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/components/layout/use-stage-panel-sync.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`; expected commit message: `fix(pm): unify startup session restore`
4. [DONE] Git Commit: `fix(pm): unify startup session restore` (hash: `0c2183346`)

### Stream: Regression Coverage
1. [DONE] Add core tests for trunk-step startup snapshot symmetry, stale last-active repair, and cold-start status hydration for late trunk steps; scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`, `packages/core/src/workflow/state/workflow-last-active-store.test.ts`; expected commit message: `test(workflow-state): cover trunk startup symmetry`
2. [DONE] Git Commit: `test(workflow-state): cover trunk startup symmetry` (hash: `d23d0147b`)
3. [DONE] Add PM tests for startup auto-select and session/artifact route symmetry across the released trunk chain; scope: `src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`, `src/client/project-manager/components/sessions/runtime-session-auto-select.test.ts`; expected commit message: `test(pm): guard trunk startup symmetry`
4. [DONE] Git Commit: `test(pm): guard trunk startup symmetry` (hash: `90cbcb477`)
5. [DONE] Run targeted symmetry verification and record the concrete results in this plan; scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record trunk symmetry verification`
   Verification target: `node --test --import tsx packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts packages/core/src/workflow/state/workflow-last-active-store.test.ts`
   Verification target: `node --test --import tsx src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts src/client/project-manager/components/sessions/project-manager-session-view.test.tsx src/client/project-manager/components/sessions/runtime-session-auto-select.test.ts`
   Verification target: `npm run build --workspace=@codeai-hub/core`
   Verification target: `npm run build:project-manager`
   Verification result: PASS — core tests `5/5`, PM tests `9/9`, continuity baseline test `2/2`, `@codeai-hub/core` build green, `build:project-manager` green.
6. [DONE] Git Commit: `docs(todo): record trunk symmetry verification` (hash: `c8f2f41b7`)

### Stream: Release Build
1. [DONE] Update release-facing docs for the trunk-step symmetry retrofit from a clean pre-build tree; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(release): prepare trunk symmetry release notes`
2. [DONE] Git Commit: `docs(release): prepare trunk symmetry release notes` (hash: `e23cfb315`)
3. [DONE] Run `./scripts/build-all.sh` on a clean tree and assemble the next patch release artifacts for the trunk-step symmetry retrofit; scope: versioned manifests, package versions, `package-lock.json`, release caches; expected commit message: `build(release): publish trunk symmetry retrofit release`
4. [DONE] Git Commit: `build(release): publish trunk symmetry retrofit release` (hash: `726fc7c74`)
   Release-tail note: final `build-release.sh` exposed stale PM fixtures that still missed required `lastActive`; corrected in `test(pm): align lastActive workflow fixtures` (`a81fd0341`) before the successful VSIX packaging rerun.
5. [DONE] Run `./scripts/build-release.sh --use-current-version`, archive the completed execution plan, and record the release closeout; scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session053.md`; expected commit message: `docs(session): record trunk symmetry retrofit release`
   Release result: PASS — `./scripts/build-release.sh --use-current-version` completed for `1.1.898`, including `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, and VSIX runtime package-surface verification.
6. [DONE] Git Commit: `docs(session): record trunk symmetry retrofit release` (hash: `69f5285d5`)
