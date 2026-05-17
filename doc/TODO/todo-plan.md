# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "diagram-modules-row-aware-auto-layout-2026-05-17",
  "branch": "main",
  "baseHead": "39e4388a7",
  "lastRecordedCommit": "f9227f49a",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DiagramModules_RowAwareAutoLayout_Planning.md",
  "currentTaskId": "diagram-row-layout.phase4.release292.docs.task1",
  "expectedCommitMessage": "docs: prepare 1.2.292 release",
  "debt": {
    "expectedCommitMessage": "docs: prepare 1.2.292 release",
    "preCommitHead": "f9227f49a",
    "stage": "commit_pending",
    "taskId": "diagram-row-layout.phase4.release292.docs.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_RowAwareAutoLayout_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_DevTreeParser_And_AutoFitZoom_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_AutoFitZoom_NaturalWidthHotfix_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_TwoColumnModuleTable_Cleanup_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules

- Scope: make Diagram Modules CSS Grid auto layout row-aware so default placement does not exceed three horizontal module-card slots across adjacent clusters and standalone modules.
- Do not change Diagram Modules semantic artifact formats.
- Do not reintroduce React Flow or JS pixel placement.
- Manual `module-map.flow.json` sidecar overrides remain authoritative.
- Each implementation task must touch no more than 3 files unless this plan is first split into smaller tasks.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks. Do not bypass hooks.
- Release build requires separate explicit user confirmation.

## Phase 0 - Planning Intake (owner: Codex, updated: 2026-05-17)

### Stream: Active Scope Creation

1. [DONE] `diagram-row-layout.phase0.plan.task1` Create the planning source, register it in Docs_Index, and open the active todo-plan (scope: `doc/SolidWorks-WorkFlow/Plans/DiagramModules_RowAwareAutoLayout_Planning.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan diagram module row-aware layout`).
2. [DONE] Git Commit: `docs: plan diagram module row-aware layout` (hash: ce4c40cc7)

## Phase 1 - Row-Aware Auto Layout (owner: Codex, updated: 2026-05-17)

### Stream: Default Layout Algorithm

3. [DONE] `diagram-row-layout.phase1.layout.task1` Add row-aware Diagram Modules auto layout and regression coverage for the three-module horizontal row budget (scope: `src/client/project-manager/components/diagram-editor/**, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `fix: cap diagram module row auto layout`).
4. [DONE] Git Commit: `fix: cap diagram module row auto layout` (hash: 40620b901)

### Stream: Project Manager Contract Docs

5. [DONE] `diagram-row-layout.phase1.docs.task1` Mirror the row-aware auto layout contract in Project Manager documentation (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/TODO/todo-plan.md`; expected commit: `docs: document diagram row auto layout`).
6. [DONE] Git Commit: `docs: document diagram row auto layout` (hash: bf22e18e7)

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-05-17)

### Stream: Targeted Checks

7. [DONE] `diagram-row-layout.phase2.verify.task1` Run targeted Diagram Modules layout tests plus webview typecheck/build and record results (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify diagram row auto layout`).
   - Verification 2026-05-17: `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.test.ts` passed 11/11.
   - Verification 2026-05-17: `npm run typecheck:webview` passed.
   - Verification 2026-05-17: `npm run build:webview` passed.
8. [DONE] Git Commit: `test: verify diagram row auto layout` (hash: daab00599)

## Phase 3 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-17)

### Stream: Diagram Retest

9. [BLOCKED] `diagram-row-layout.phase3.acceptance.task1` User retests Diagram Modules visual layout in Project Manager and confirms automatic rows no longer overflow the right panel for adjacent clusters/modules (scope: user workflow acceptance only; expected commit: none). Result: User clarified on 2026-05-17 that the horizontal budget applies to actual module cards across one row regardless of cluster/standalone boundaries, and reported that `targetAspectRatio` does not visibly change auto layout.

### Stream: Retest Fixes

10. [DONE] `diagram-row-layout.phase3.fix.task1` Enforce the row module budget for actual auto module slots and make Product Part aspect-ratio choices visibly affect auto column selection (scope: `src/client/project-manager/components/diagram-editor/**`; expected commit: `fix: enforce diagram row module budget`).
11. [DONE] Git Commit: `fix: enforce diagram row module budget` (hash: 6ac43b9ea)

### Stream: Retest Documentation

12. [DONE] `diagram-row-layout.phase3.docs.task1` Update the Diagram Modules visual-shell SSOT with the clarified actual-module row budget and aspect-ratio behavior (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: clarify diagram row budget`).
13. [DONE] Git Commit: `docs: clarify diagram row budget` (hash: 63488ea77)

### Stream: Retest Verification

14. [DONE] `diagram-row-layout.phase3.verify.task1` Re-run targeted layout tests and webview checks after the retest fix (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify diagram row budget fix`).
    - Verification 2026-05-17: `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.test.ts` passed 13/13, including aspect-ratio visibility and explicit Product Part columns with auto cluster row capping.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
    - Verification 2026-05-17: `npm run build:webview` passed.
15. [DONE] Git Commit: `test: verify diagram row budget fix` (hash: bab253b3c)

### Stream: Diagram Retest

16. [BLOCKED] `diagram-row-layout.phase3.acceptance.task2` User retests Diagram Modules visual layout again and confirms the clarified row budget and aspect-ratio behavior (scope: user workflow acceptance only; expected commit: none). Result: User reported on 2026-05-17 that the detached Diagram Modules window opens with the current graph but does not live-refresh when later Product Parts materialize in the main Project Manager workflow.

### Stream: Detached Diagram Live Refresh

17. [DONE] `diagram-row-layout.phase3.detach.task1` Subscribe the detached Diagram Modules view to workflow-state changes so newly materialized Product Parts reload without closing and reopening the detached window (scope: `src/client/project-manager/components/diagram-editor/detached-diagram-view.tsx, src/client/project-manager/components/diagram-editor/detached-diagram-view.test.ts`; expected commit: `fix: refresh detached diagram view`).
18. [DONE] Git Commit: `fix: refresh detached diagram view` (hash: 70a0603bf)

### Stream: Detached Diagram Docs

19. [DONE] `diagram-row-layout.phase3.detach.docs.task1` Document the detached Diagram Modules live-refresh contract in the Project Manager and system workflow SSOT (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/TODO/todo-plan.md`; expected commit: `docs: document detached diagram refresh`).
20. [DONE] Git Commit: `docs: document detached diagram refresh` (hash: 6995e9d64)

### Stream: Detached Diagram Verification

21. [DONE] `diagram-row-layout.phase3.detach.verify.task1` Re-run targeted detached/layout tests and webview checks after the detached refresh fix (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify detached diagram refresh`).
    - Verification 2026-05-17: `npx tsx --test src/client/project-manager/components/diagram-editor/detached-diagram-view.test.ts` passed 1/1.
    - Verification 2026-05-17: `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.test.ts` passed 13/13.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
    - Verification 2026-05-17: `npm run build:webview` passed.
22. [DONE] Git Commit: `test: verify detached diagram refresh` (hash: e665d93ff)

### Stream: Detached Diagram Retest

23. [DONE] `diagram-row-layout.phase3.detach.acceptance.task1` User retests the detached Diagram Modules popup and confirms that newly materialized Product Parts appear without closing and reopening the detached window (scope: user workflow acceptance only; expected commit: none). Result: User accepted the scope for release build on 2026-05-17 by requesting a new release.

## Phase 4 - Release Build (owner: Codex, updated: 2026-05-17)

### Stream: Release Preparation

24. [DONE] `diagram-row-layout.phase4.release.docs.task1` Update release notes for v1.2.291 before version bump/build so packaged README/CHANGELOG match the release identity (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.291 release`).
25. [DONE] Git Commit: `docs: prepare 1.2.291 release` (hash: b3a536e49)

### Stream: Release Automation

26. [DONE] `diagram-row-layout.phase4.release.buildall.task1` Run `./scripts/build-all.sh` for v1.2.291 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.291 artifacts`).
    - Verification 2026-05-17: `./scripts/build-all.sh --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Generated release artifacts: `claude-module-1.2.291.tar.bz2`, `codex-module-1.2.291.tar.bz2`, `gemini-module-1.2.291.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.291.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.291.tar.bz2`, `vscode-webview-1.2.291.tar.bz2`, `project-manager-1.2.291.tar.bz2`.
27. [DONE] Git Commit: `chore: build release 1.2.291 artifacts` (hash: e73894660)
28. [DONE] `diagram-row-layout.phase4.release.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.291 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.291 vsix`).
    - Verification 2026-05-17: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; dirty input was the active plan-state file from the previous post-commit transition.
    - Release package: `codeai-hub-1.2.291.vsix` (48M on disk, script-reported package size 49M).
    - Release script confirmed: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, `VSIX runtime package surface verified`, and `Release build complete`.
29. [DONE] Git Commit: `chore: package release 1.2.291 vsix` (hash: 37d56fc61)

### Stream: User Visual Acceptance Testing

30. [BLOCKED] `diagram-row-layout.phase4.release.acceptance.task1` User installs and retests v1.2.291 release package for Diagram Modules row budget, aspect-ratio behavior, and detached live refresh (scope: user visual acceptance only; expected commit: none). Result: User reported on 2026-05-17 that a single cluster stretches to the full Product Part width, producing huge horizontal gaps between module cards and excess empty space to cluster boundaries.

### Stream: Release Retest Compact Layout Fix

31. [DONE] `diagram-row-layout.phase4.compact.task1` Make Diagram Modules cluster/module grid sizing compact so single clusters do not stretch module spacing across the viewport (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx, src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx`; expected commit: `fix: compact diagram module spacing`).
32. [DONE] Git Commit: `fix: compact diagram module spacing` (hash: 856fb2a5c)

### Stream: Release Retest Compact Layout Docs

33. [DONE] `diagram-row-layout.phase4.compact.docs.task1` Document the compact spacing contract for Diagram Modules visual layout (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/TODO/todo-plan.md`; expected commit: `docs: document compact diagram spacing`).
34. [DONE] Git Commit: `docs: document compact diagram spacing` (hash: 96225dee5)

### Stream: Release Retest Compact Layout Verification

35. [DONE] `diagram-row-layout.phase4.compact.verify.task1` Run targeted compact layout tests plus webview typecheck/build after the spacing fix (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify compact diagram spacing`).
    - Verification 2026-05-17: `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx` passed 3/3.
    - Verification 2026-05-17: `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.test.ts` passed 13/13.
    - Verification 2026-05-17: `npm run typecheck:webview` passed.
    - Verification 2026-05-17: `npm run build:webview` passed.
36. [DONE] Git Commit: `test: verify compact diagram spacing` (hash: f9227f49a)

### Stream: User Visual Acceptance Testing

37. [DONE] `diagram-row-layout.phase4.compact.acceptance.task1` User retests Diagram Modules visual layout after the compact spacing fix and confirms single-cluster rows no longer stretch module gaps or overflow the visible panel (scope: user visual acceptance only; expected commit: none). Result: User accepted the compact spacing fix for release on 2026-05-17 by requesting a new release.

### Stream: Compact Fix Release Preparation

38. [DONE] `diagram-row-layout.phase4.release292.docs.task1` Update release notes for v1.2.292 before version bump/build so packaged README/CHANGELOG include the compact spacing fix (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.292 release`).
39. [PENDING] Git Commit: `docs: prepare 1.2.292 release` (hash: TBD)

### Stream: Compact Fix Release Automation

40. [TODO] `diagram-row-layout.phase4.release292.buildall.task1` Run `./scripts/build-all.sh` for v1.2.292 and record generated provider/core/UI/launcher tarball artifacts (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.292 artifacts`).
41. [TODO] Git Commit: `chore: build release 1.2.292 artifacts` (hash: TBD)
42. [TODO] `diagram-row-layout.phase4.release292.vsix.task1` Run `./scripts/build-release.sh --use-current-version` for v1.2.292 and record the generated VSIX package (scope: VSIX package, release artifacts, `doc/TODO/todo-plan.md`; expected commit: `chore: package release 1.2.292 vsix`).
43. [TODO] Git Commit: `chore: package release 1.2.292 vsix` (hash: TBD)

### Stream: User Visual Acceptance Testing

44. [TODO] `diagram-row-layout.phase4.release292.acceptance.task1` User installs and retests v1.2.292 release package for Diagram Modules compact spacing, row budget, aspect-ratio behavior, and detached live refresh (scope: user visual acceptance only; expected commit: none).

## Phase 5 - Scope Closeout (owner: Codex, updated: 2026-05-17)

### Stream: Closeout

45. [TODO] `diagram-row-layout.phase5.closeout.task1` After explicit user acceptance, archive the active todo-plan, resolve the planning document disposition, and update Docs_Index if needed (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close diagram row auto layout scope`).
46. [TODO] Git Commit: `docs: close diagram row auto layout scope` (hash: TBD)
47. [TODO] `diagram-row-layout.phase5.closeout.anchor` Reserved post-closeout handoff anchor (scope: none; expected commit: none).
