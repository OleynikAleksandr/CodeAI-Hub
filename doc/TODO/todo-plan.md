# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-materialization-and-sidebar-implementation-2026-05-20",
  "branch": "main",
  "baseHead": "bde34814f",
  "lastRecordedCommit": "512a79926",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_LeftSidebar_Phase1_Planning_RU.md",
  "currentTaskId": "phase2.stream1.task2",
  "expectedCommitMessage": "feat: materialize development tree artifact workspace",
  "debt": {
    "expectedCommitMessage": "feat: materialize development tree artifact workspace",
    "preCommitHead": "512a79926",
    "stage": "commit_pending",
    "taskId": "phase2.stream1.task2"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_LeftSidebar_Phase1_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_LeftSidebar_Phase1_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Implementation_Lifecycle_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase, Stream и микро-задач.
- Каждая подзадача должна затрагивать не более 3 tracked файлов.
- Каждая tracked подзадача оформляется парой пунктов: реализация/изменения и `Git Commit: ...`.
- Гейты запускаются штатно через Husky и `npm run plan:commit -- "<expected commit message>"`.
- Targeted builds выполняются перед закрытием затронутого Stream/Phase.
- Release Build Confirmation Gate: перед release notes/version bump/build scripts нужно отдельно получить подтверждение пользователя.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 1 — Implementation Plan Open (owner: Codex, updated: 2026-05-20)

### Stream: Planning Intake
1. [DONE] `phase1.stream1.task1` Open the implementation execution plan for Core-owned Development Tree materialization and left sidebar projection refactoring (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open development tree materialization implementation`).
2. [DONE] Git Commit: `docs: open development tree materialization implementation` (hash: 7e76d164f)

## Phase 2 — Core Artifact Workspace Materializer (owner: Codex, updated: 2026-05-20)

### Stream: Materialized Directory Plan
3. [DONE] `phase2.stream1.task1` Extend Development Tree filesystem path planning for `.codeai-hub/<slug>/development_tree/materialized/product-parts/...`, including module-level `workers/` and `integration/` folders (scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-paths.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.ts`; expected commit: `feat: plan development tree artifact workspace`).
4. [DONE] Git Commit: `feat: plan development tree artifact workspace` (hash: 512a79926)
5. [DONE] `phase2.stream1.task2` Extend filesystem application/orphan summarization for artifact workspace directories without deleting populated orphan content (scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-applier.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-orphan-registry.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade.test.ts`; expected commit: `feat: materialize development tree artifact workspace`).
6. [PENDING] Git Commit: `feat: materialize development tree artifact workspace` (hash: TBD)

### Stream: Diagram Modules Acceptance Hook
7. [TODO] `phase2.stream2.task1` Wire the Development Tree artifact materializer into the Core-owned Diagram Modules acceptance lifecycle, not Project Manager and not Application Skeleton (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts, packages/core/src/managed-workflow-orchestration/steps/diagram-modules-step-controller.ts`; expected commit: `feat: materialize development tree after diagram acceptance`).
8. [TODO] Git Commit: `feat: materialize development tree after diagram acceptance` (hash: TBD)

## Phase 3 — Core Read Model Contract (owner: Codex, updated: 2026-05-20)

### Stream: Snapshot Operation Nodes
9. [TODO] `phase3.stream1.task1` Extend Core Development Tree node types and state facade with operation node children, artifact workspace paths, and backward-compatible snapshot output (scope: `packages/core/src/development-tree/development-tree-types.ts, packages/core/src/development-tree/development-tree-state-facade.ts, packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts`; expected commit: `feat: expose development tree operation nodes`).
10. [TODO] Git Commit: `feat: expose development tree operation nodes` (hash: TBD)
11. [TODO] `phase3.stream1.task2` Keep code mirror projection Application Skeleton-owned while exposing optional code workspace path only when available (scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-production-path-applier.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`; expected commit: `feat: separate development tree artifact and code paths`).
12. [TODO] Git Commit: `feat: separate development tree artifact and code paths` (hash: TBD)

## Phase 4 — Project Manager Projection Rendering (owner: Codex, updated: 2026-05-20)

### Stream: PM Snapshot Parsing
13. [TODO] `phase4.stream1.task1` Parse Core-owned operation nodes and materialization fields in Project Manager workflow state client without adding filesystem scans (scope: `src/client/project-manager/services/workflow-state-development-tree-client.ts, src/client/project-manager/services/workflow-state-client.test.ts, src/client/project-manager/components/layout/workspace-tree-model.ts`; expected commit: `feat: parse development tree operation projection`).
14. [TODO] Git Commit: `feat: parse development tree operation projection` (hash: TBD)

### Stream: PM Tree Rendering
15. [TODO] `phase4.stream2.task1` Render nested `Module -> Module / Facade Specification -> Implementation -> Worker/Integration` nodes from Core snapshot (scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes-progress.test.ts`; expected commit: `feat: render development tree workflow nodes`).
16. [TODO] Git Commit: `feat: render development tree workflow nodes` (hash: TBD)
17. [TODO] `phase4.stream2.task2` Update PM tree row rendering/type markers/styles for operation node indentation, wrapped long labels, and stable wider sidebar behavior matching the prototype (scope: `src/client/project-manager/components/layout/workspace-tree.tsx, src/client/project-manager/components/layout/workspace-tree-type-marker.tsx, packages/ui/project-manager/styles.css`; expected commit: `feat: style development tree workflow nodes`).
18. [TODO] Git Commit: `feat: style development tree workflow nodes` (hash: TBD)

### Stream: PM Routing And Disposition
19. [TODO] `phase4.stream3.task1` Route selected operation nodes to their own Sessions/Artifacts surfaces and add raw Core-owned orphan disposition command payloads (scope: `src/client/project-manager/components/layout/main-area-panel-content.tsx, src/client/project-manager/components/layout/development-tree-node-start-card.tsx, src/client/project-manager/services/workflow-state-client.ts`; expected commit: `feat: route development tree operation nodes`).
20. [TODO] Git Commit: `feat: route development tree operation nodes` (hash: TBD)

## Phase 5 — Documentation And Verification (owner: Codex, updated: 2026-05-20)

### Stream: SSOT Sync
21. [TODO] `phase5.stream1.task1` Sync SSOT documentation for Core-owned Development Tree materialization, PM projection-only boundary, and Application Skeleton-owned code mirror (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; expected commit: `docs: sync development tree materialization architecture`).
22. [TODO] Git Commit: `docs: sync development tree materialization architecture` (hash: TBD)

### Stream: Tooling Verification
23. [TODO] `phase5.stream2.task1` Run targeted verification for affected Core and Project Manager packages (scope: `packages/core, src/client/project-manager, packages/ui/project-manager`; expected commit: no commit expected).

### Stream: Release Build
24. [TODO] `phase5.stream3.task1` After separate explicit user confirmation, update release docs for the next version and run the release build checklist (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, doc/tmp/releases/`; expected commit: `docs: prepare release notes for development tree materialization`).
25. [TODO] Git Commit: `docs: prepare release notes for development tree materialization` (hash: TBD)
26. [TODO] `phase5.stream3.task2` After release-doc commit and clean tree, run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then record build artifacts and release evidence (scope: release artifacts and versioned manifests; expected commit: `chore: build development tree materialization release`).
27. [TODO] Git Commit: `chore: build development tree materialization release` (hash: TBD)

### Stream: User Visual Acceptance Testing
28. [TODO] `phase5.stream4.task1` User installs/retests the release and accepts the Development Tree materialization/sidebar behavior (scope: user visual acceptance; no commit expected).

### Stream: Scope Closeout
29. [TODO] `phase5.stream5.task1` Close implementation scope after explicit user acceptance, archive todo-plan and update planning-doc disposition/index references (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree materialization implementation`).
30. [TODO] Git Commit: `docs: close development tree materialization implementation` (hash: TBD)
31. [TODO] `phase5.stream5.task2` Reserved post-closeout handoff anchor (scope: terminal NONE transition; no commit expected).
