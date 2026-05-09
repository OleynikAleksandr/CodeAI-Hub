# Plan Closeout: diagram-modules-core-orchestrated-subturns

**Created:** 2026-05-09T09:55:02.856Z
**Acceptance:** User explicitly requested closing the previous cycle before creating the next planning document on 2026-05-09.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** diagram-modules-subturns.phase9.task1
**Expected Commit:** docs: close diagram modules subturn orchestration
**Last Recorded Commit:** e26ca8d90
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Diagram_Modules_Core_Orchestrated_Subturns.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "diagram-modules-core-orchestrated-subturns",
  "branch": "main",
  "baseHead": "10023c564",
  "lastRecordedCommit": "e26ca8d90",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Diagram_Modules_Core_Orchestrated_Subturns.md",
  "currentTaskId": "diagram-modules-subturns.phase9.task1",
  "expectedCommitMessage": "docs: close diagram modules subturn orchestration",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Diagram_Modules_Core_Orchestrated_Subturns.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Diagram_Modules_Core_Orchestrated_Subturns.md`
  - `doc/Claude_Diagram_Modules_Provider_Audit.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this Context Pack is the recovery source for the current execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation task touches no more than 3 files/packages. If discovery shows wider scope, split the task before editing.
- Each implementation task is followed by a separate `Git Commit` item.
- Quality gates run through Husky hooks on commit.
- Do not run release build automation until the user explicitly confirms release assembly.
- Core state machine and executable validators are the primary correctness mechanism; provider prompts are only the second layer.
- Diagram Modules must progress as Core-orchestrated one-artifact subturns: index first, then one Product Part per provider turn, then aggregate acceptance.

## Phase 1 - Core Subturn Progress Model (owner: Codex, updated: 2026-05-09)

### Stream: Progress Snapshot And Recovery

1. [DONE] `diagram-modules-subturns.phase1.task1` Add a Diagram Modules subturn progress model that distinguishes index, active Product Part, accepted Product Parts, expected artifact path, and last validation diagnostics (scope: `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`, optional new Core handler helper, focused Core progress test; expected commit: `fix: model diagram modules subturn progress`).
2. [DONE] Git Commit: `fix: model diagram modules subturn progress` (hash: dc36a2ca8)
3. [DONE] `diagram-modules-subturns.phase1.task2` Persist and recover active Diagram Modules expected artifact state for managed workspaces so restarts resume the same subturn instead of restarting aggregate validation (scope: managed workflow control-plane helper, workflow-state handler, focused recovery test; expected commit: `fix: persist diagram modules subturn state`).
4. [DONE] Git Commit: `fix: persist diagram modules subturn state` (hash: a9936238c)

## Phase 2 - Provider Prompt Contract (owner: Codex, updated: 2026-05-09)

### Stream: One-Artifact Provider Turns

5. [DONE] `diagram-modules-subturns.phase2.task1` Change the initial Diagram Modules prompt contract so the provider creates only `product-parts.index.md` and stops for Core feedback (scope: Diagram Modules prompt asset, prompt pack builder, prompt builder test; expected commit: `fix: start diagram modules with index-only prompt`).
6. [DONE] Git Commit: `fix: start diagram modules with index-only prompt` (hash: 510fcc717)
7. [DONE] `diagram-modules-subturns.phase2.task2` Add Core continuation prompts for accepted previous artifact and next single Product Part target (scope: prompt continuation builder, workflow step start/continue service, focused prompt test; expected commit: `fix: continue diagram modules one product part at a time`).
8. [DONE] Git Commit: `fix: continue diagram modules one product part at a time` (hash: 1804462ef)
9. [DONE] `diagram-modules-subturns.phase2.task3` Add repair-turn prompt text with fresh validation snapshot metadata and exact diagnostics for the current expected artifact (scope: acceptance feedback service, Diagram Modules feedback tests, prompt/feedback shared types if needed; expected commit: `fix: send diagram modules repair diagnostics by artifact`).
10. [DONE] Git Commit: `fix: send diagram modules repair diagnostics by artifact` (hash: ede0267aa)

## Phase 3 - Core Post-Turn Orchestration (owner: Codex, updated: 2026-05-09)

### Stream: Fresh Validation And Stale Feedback Suppression

11. [DONE] `diagram-modules-subturns.phase3.task1` Move Diagram Modules accept/repair/continue decisions to a fresh post-provider-turn validation boundary and suppress feedback whose snapshot no longer matches current HEAD/progress (scope: workflow-state service, managed documentation commit helper, focused stale feedback test; expected commit: `fix: validate diagram modules subturns after provider turns`).
12. [DONE] Git Commit: `fix: validate diagram modules subturns after provider turns` (hash: 63a51b572)
13. [DONE] `diagram-modules-subturns.phase3.task2` Keep session input locked while Core validation, managed commit, queued feedback, or queued continuation turn is pending (scope: session provider event router, turn completion handler, lock-state tests; expected commit: `fix: lock diagram modules core continuation turns`).
14. [DONE] Git Commit: `fix: lock diagram modules core continuation turns` (hash: 58db718c2)

## Phase 4 - UI Projection And Claude Stream Cleanup (owner: Codex, updated: 2026-05-09)

### Stream: User-Visible Stage Progress

15. [DONE] `diagram-modules-subturns.phase4.task1` Project Diagram Modules subturn progress into stage UI/development tree so pending, active, accepted, and repair Product Part nodes are visible (scope: workflow-state client types, development tree projection/UI component, focused UI test; expected commit: `feat: show diagram modules subturn progress`).
16. [DONE] Git Commit: `feat: show diagram modules subturn progress` (hash: 370cf1738)
17. [DONE] `diagram-modules-subturns.phase4.task2` Coalesce or filter Claude live thinking/text fragments so one-character partial chunks are not rendered as standalone dialog cards (scope: Claude content stream handler, Claude stream event/router test, session dialog fixture if needed; expected commit: `fix: coalesce claude live stream fragments`).
18. [DONE] Git Commit: `fix: coalesce claude live stream fragments` (hash: 4c9a83495)

## Phase 5 - Documentation And Targeted Verification (owner: Codex, updated: 2026-05-09)

### Stream: SSOT Sync

19. [DONE] `diagram-modules-subturns.phase5.task1` Update SSOT documentation for Core-orchestrated Diagram Modules subturns, provider prompt responsibilities, fresh validation, and input-lock ownership (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Diagram_Modules_Core_Orchestrated_Subturns.md`; expected commit: `docs: document diagram modules subturn orchestration`).
20. [DONE] Git Commit: `docs: document diagram modules subturn orchestration` (hash: 2aa9d2e51)

### Stream: Targeted Verification

21. [DONE] `diagram-modules-subturns.phase5.task2` Run focused Core/Claude/UI tests and affected builds for subturn orchestration; record evidence in the planning document (scope: `packages/core`, `packages/Claude_Module`, `src/client/project-manager`, planning document; expected commit: `test: verify diagram modules subturn orchestration`).
22. [DONE] Git Commit: `test: verify diagram modules subturn orchestration` (hash: b09dec934)

## Phase 6 - Release Build Confirmation (owner: Codex/User, updated: 2026-05-09)

### Stream: Release Gate

23. [DONE] `diagram-modules-subturns.phase6.task1` Stop after implementation and targeted verification; ask the user whether to assemble a new release (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Diagram_Modules_Core_Orchestrated_Subturns.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: record diagram modules subturn release decision`).
24. [DONE] Git Commit: `docs: record diagram modules subturn release decision` (hash: e0aec8fa9)

## Phase 7 - Release Build (owner: Codex, updated: 2026-05-09)

### Stream: Release Assembly

25. [DONE] `diagram-modules-subturns.phase7.task1` Prepare README and CHANGELOG for the next release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare diagram modules subturn release`).
26. [DONE] Git Commit: `docs: prepare diagram modules subturn release` (hash: 9f7b16826)
27. [DONE] `diagram-modules-subturns.phase7.task2` Run release automation and verify VSIX/tarball outputs (scope: `package.json`, workspace package manifests, `package-lock.json`, `doc/tmp/releases/`; expected commit: `chore: build diagram modules subturn release artifacts`).
28. [DONE] Git Commit: `chore: build diagram modules subturn release artifacts` (hash: 14aa6fad5)

## Phase 8 - User Workflow Acceptance Testing (owner: User/Codex, updated: 2026-05-09)

### Stream: Retest

29. [DONE] `diagram-modules-subturns.phase8.task1` Record the Claude retest failure where Core sent both legacy aggregate failure feedback and subturn continuation, then route the scope into a targeted fix stream (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Diagram_Modules_Core_Orchestrated_Subturns.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: route diagram modules subturn retest failure`).
30. [DONE] Git Commit: `docs: route diagram modules subturn retest failure` (hash: bc8846f68)

### Stream: Claude Retest Fixes

31. [DONE] `diagram-modules-subturns.phase8.task2` Suppress legacy Diagram Modules aggregate failure feedback while Core is in a pending single-artifact subturn, including the stage-owned dirty managed commit gate (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts`, `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts`; expected commit: `fix: suppress diagram modules pending subturn aggregate feedback`).
32. [DONE] Git Commit: `fix: suppress diagram modules pending subturn aggregate feedback` (hash: f4be2c74a)
33. [DONE] `diagram-modules-subturns.phase8.task3` Harden Diagram Modules continuation prompts so a provider treats the current Core target as authoritative over any previous aggregate feedback or already-written sibling files (scope: `src/client/project-manager/services/diagram-modules-continuation-prompt.ts`, `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts`, planning document; expected commit: `fix: harden diagram modules continuation turns`).
34. [DONE] Git Commit: `fix: harden diagram modules continuation turns` (hash: ac01a2994)

### Stream: Post-Retest Release Assembly

35. [DONE] `diagram-modules-subturns.phase8.task4` Prepare README and CHANGELOG for the post-retest release after explicit user confirmation (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare diagram modules claude retest release`).
36. [DONE] Git Commit: `docs: prepare diagram modules claude retest release` (hash: 919d30719)
37. [DONE] `diagram-modules-subturns.phase8.task5` Run release automation and verify VSIX/tarball outputs (scope: `package.json`, workspace package manifests, `package-lock.json`, `doc/tmp/releases/`; expected commit: `chore: build diagram modules claude retest release artifacts`).
38. [DONE] Git Commit: `chore: build diagram modules claude retest release artifacts` (hash: e26ca8d90)

## Phase 9 - Scope Closeout (owner: Codex, updated: 2026-05-09)

### Stream: Closeout

39. [IN_PROGRESS] `diagram-modules-subturns.phase9.task1` Close scope only after explicit user acceptance, archive the active plan, and dispose planning documents according to closeout rules (scope: `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close diagram modules subturn orchestration`).
40. [TODO] Git Commit: `docs: close diagram modules subturn orchestration` (hash: TBD)
41. [TODO] `diagram-modules-subturns.phase9.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: close diagram modules subturn orchestration`).
````
