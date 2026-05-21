# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-materialization-and-sidebar-implementation-2026-05-20",
  "branch": "main",
  "baseHead": "bde34814f",
  "lastRecordedCommit": "78f4714e6",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_LeftSidebar_Phase1_Planning_RU.md",
  "currentTaskId": "phase8.stream2.task2",
  "expectedCommitMessage": "chore: build vsix size hotfix release",
  "debt": {
    "expectedCommitMessage": "chore: build vsix size hotfix release",
    "preCommitHead": "78f4714e6",
    "stage": "commit_pending",
    "taskId": "phase8.stream2.task2"
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
6. [DONE] Git Commit: `feat: materialize development tree artifact workspace` (hash: a9018b572)

### Stream: Diagram Modules Acceptance Hook
7. [DONE] `phase2.stream2.task1` Wire the Development Tree artifact materializer into the Core-owned Diagram Modules acceptance lifecycle, not Project Manager and not Application Skeleton (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts, packages/core/src/managed-workflow-orchestration/steps/diagram-modules-step-controller.ts`; expected commit: `feat: materialize development tree after diagram acceptance`).
8. [DONE] Git Commit: `feat: materialize development tree after diagram acceptance` (hash: 8557614f5)

## Phase 3 — Core Read Model Contract (owner: Codex, updated: 2026-05-20)

### Stream: Snapshot Operation Nodes
9. [DONE] `phase3.stream1.task1` Extend Core Development Tree node types and state facade with operation node children, artifact workspace paths, and backward-compatible snapshot output (scope: `packages/core/src/development-tree/development-tree-types.ts, packages/core/src/development-tree/development-tree-operation-nodes.ts, packages/core/src/development-tree/development-tree-state-facade.ts, packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts`; expected commit: `feat: expose development tree operation nodes`).
10. [DONE] Git Commit: `feat: expose development tree operation nodes` (hash: 9d5487835)
11. [DONE] `phase3.stream1.task2` Keep code mirror projection Application Skeleton-owned while exposing optional code workspace path only when available (scope: `packages/core/src/development-tree/development-tree-types.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-production-path-applier.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`; expected commit: `feat: separate development tree artifact and code paths`).
12. [DONE] Git Commit: `feat: separate development tree artifact and code paths` (hash: 7984ab5cc)

## Phase 4 — Project Manager Projection Rendering (owner: Codex, updated: 2026-05-20)

### Stream: PM Snapshot Parsing
13. [DONE] `phase4.stream1.task1` Parse Core-owned operation nodes and materialization fields in Project Manager workflow state client without adding filesystem scans (scope: `src/client/project-manager/services/workflow-state-development-tree-client.ts, src/client/project-manager/services/workflow-state-client.test.ts, src/client/project-manager/components/layout/workspace-tree-model.ts`; expected commit: `feat: parse development tree operation projection`).
14. [DONE] Git Commit: `feat: parse development tree operation projection` (hash: db60de52b)

### Stream: PM Tree Rendering
15. [DONE] `phase4.stream2.task1` Render nested `Module -> Module / Facade Specification -> Implementation -> Worker/Integration` nodes from Core snapshot (scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes-progress.test.ts`; expected commit: `feat: render development tree workflow nodes`).
16. [DONE] Git Commit: `feat: render development tree workflow nodes` (hash: 3ef3f7a84)
17. [DONE] `phase4.stream2.task2` Update PM tree row rendering/type markers/styles for operation node indentation, wrapped long labels, and stable wider sidebar behavior matching the prototype (scope: `src/client/project-manager/components/layout/workspace-tree.tsx, src/client/project-manager/components/layout/workspace-tree-type-marker.tsx, packages/ui/project-manager/styles.css`; expected commit: `feat: style development tree workflow nodes`).
18. [DONE] Git Commit: `feat: style development tree workflow nodes` (hash: 779c601f5)

### Stream: PM Routing And Disposition
19. [DONE] `phase4.stream3.task1` Route selected operation nodes to their own Sessions/Artifacts surfaces and add raw Core-owned orphan disposition command payloads (scope: `src/client/project-manager/components/layout/main-area-panel-content.tsx, src/client/project-manager/components/layout/development-tree-node-start-card.tsx, src/client/project-manager/components/layout/main-area-utils.ts`; expected commit: `feat: route development tree operation nodes`).
20. [DONE] Git Commit: `feat: route development tree operation nodes` (hash: faf9af6bb)

## Phase 5 — Documentation And Verification (owner: Codex, updated: 2026-05-20)

### Stream: SSOT Sync
21. [DONE] `phase5.stream1.task1` Sync SSOT documentation for Core-owned Development Tree materialization, PM projection-only boundary, and Application Skeleton-owned code mirror (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; expected commit: `docs: sync development tree materialization architecture`).
22. [DONE] Git Commit: `docs: sync development tree materialization architecture` (hash: 174d5c2f1)

### Stream: Tooling Verification
23. [DONE] `phase5.stream2.task1` Run targeted verification for affected Core and Project Manager packages (scope: `packages/core, src/client/project-manager, packages/ui/project-manager`; expected commit: no commit expected). Result: --help

### Stream: Release Build
24. [DONE] `phase5.stream3.task1` After separate explicit user confirmation, update release docs for the next version and run the release build checklist (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, doc/tmp/releases/`; expected commit: `docs: prepare release notes for development tree materialization`).
25. [DONE] Git Commit: `docs: prepare release notes for development tree materialization` (hash: 755f9ee57)
26. [DONE] `phase5.stream3.task2` After release-doc commit and clean tree, run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then record build artifacts and release evidence (scope: `assets/**/manifest.json, package.json, package-lock.json, packages/**/package.json, doc/tmp/releases/`; expected commit: `chore: build development tree materialization release`).
27. [DONE] Git Commit: `chore: build development tree materialization release` (hash: dbde8cce3)

### Stream: User Visual Acceptance Testing
28. [BLOCKED] `phase5.stream4.task1` User installs/retests the release and accepts the Development Tree materialization/sidebar behavior (scope: user visual acceptance; no commit expected). Blocked by acceptance defect: Diagram Modules materialized `.codeai-hub/<workspace>/development_tree/` but did not mirror `doc/TODO/stages/development-tree/...`, and the sidebar did not expose the agreed tree shape by default.

## Phase 6 — Acceptance Defect Fixes (owner: Codex, updated: 2026-05-21)

### Stream: Diagram Modules Development Tree Mirror
29. [DONE] `phase6.stream1.task1` Materialize the same accepted Development Tree folder shape into `doc/TODO/stages/development-tree/...` during the Core-owned Diagram Modules materialization step (scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-paths.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.ts`; expected commit: `feat: mirror development tree todo stage workspace`).
30. [DONE] Git Commit: `feat: mirror development tree todo stage workspace` (hash: 092a30ebb)
31. [DONE] `phase6.stream1.task2` Expand the first Development Tree Product Part/Cluster in the left sidebar when Core snapshot data appears so module operation nodes are visible like the accepted prototype (scope: `src/client/project-manager/components/layout/workspace-tree.tsx, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts, src/client/project-manager/components/layout/workspace-tree-development-expansion.test.ts`; expected commit: `feat: reveal development tree workflow nodes in sidebar`).
32. [DONE] Git Commit: `feat: reveal development tree workflow nodes in sidebar` (hash: ad5b6f827)
33. [DONE] `phase6.stream1.task3` Run targeted Core/Project Manager verification after acceptance defect fixes (scope: `packages/core, src/client/project-manager, packages/ui/project-manager`; expected commit: no commit expected). Result: targeted verification passed; materialized doc/TODO/stages/development-tree mirror in CodeAI-Hub codex 5.4 test workspace

### Stream: User Visual Acceptance Retest
34. [BLOCKED] `phase6.stream2.task1` User installs/retests the fixed release and accepts the Development Tree materialization/sidebar behavior (scope: user visual acceptance; no commit expected). Blocked by acceptance defect: cluster nodes have their own contract/facade session but the materialized tree did not create cluster-level `workers/` and `integration/` artifact folders.

### Stream: Cluster Operation Folder Fix
35. [DONE] `phase6.stream3.task1` Add cluster-level `workers/` and `integration/` artifact folders to both `.codeai-hub/<workspace>/development_tree/materialized/...` and `doc/TODO/stages/development-tree/...` materialization plans (scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.ts`; expected commit: `feat: add cluster operation artifact folders`).
36. [DONE] Git Commit: `feat: add cluster operation artifact folders` (hash: 8194bdcf3)
37. [DONE] `phase6.stream3.task2` Run targeted Core materializer verification and re-materialize the test workspace cluster operation folders (scope: `packages/core, /Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`; expected commit: no commit expected). Result: targeted Core materializer verification passed; re-materialized cluster workers and integration folders in CodeAI-Hub codex 5.4

### Stream: User Visual Acceptance Retest 2
38. [BLOCKED] `phase6.stream4.task1` User installs/retests the fixed release and accepts the Development Tree materialization/sidebar behavior (scope: user visual acceptance; no commit expected). Blocked until the acceptance-fix release is built and installed.

## Phase 7 — Acceptance Fix Release Build (owner: Codex, updated: 2026-05-21)

### Stream: Release Build
39. [DONE] `phase7.stream1.task1` After explicit user confirmation, update release docs for the next version covering Development Tree acceptance fixes (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release notes for development tree acceptance fixes`).
40. [DONE] Git Commit: `docs: prepare release notes for development tree acceptance fixes` (hash: 6b4878658)
41. [DONE] `phase7.stream1.task2` After release-doc commit and clean tree, run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then record build artifacts and release evidence (scope: `assets/**/manifest.json, package.json, package-lock.json, packages/**/package.json, doc/tmp/releases/`; expected commit: `chore: build development tree acceptance fix release`).
42. [DONE] Git Commit: `chore: build development tree acceptance fix release` (hash: 8c5c8ffbb)

### Stream: User Visual Acceptance Retest 3
43. [BLOCKED] `phase7.stream2.task1` User installs/retests the new acceptance-fix release and accepts the Development Tree materialization/sidebar behavior (scope: user visual acceptance; no commit expected). Blocked by packaging defect: VSIX grew to ~49M because local Swift `.build` artefacts under `native/apple-*-helper/` were included in the extension package.

## Phase 8 — VSIX Packaging Hotfix Release (owner: Codex, updated: 2026-05-21)

### Stream: VSIX Package Surface Guard
47. [DONE] `phase8.stream1.task1` Exclude local native Swift helper build outputs from VSIX packaging and add a release guard that fails if native build/cache artefacts leak into the packaged extension (scope: `.vscodeignore, scripts/build-release.sh`; expected commit: `fix: exclude native swift build artifacts from vsix`).
48. [DONE] Git Commit: `fix: exclude native swift build artifacts from vsix` (hash: 9c92f828a)

### Stream: Hotfix Release Build
49. [DONE] `phase8.stream2.task1` Update release docs for the next hotfix version covering the VSIX package-size fix (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release notes for vsix size hotfix`).
50. [DONE] Git Commit: `docs: prepare release notes for vsix size hotfix` (hash: 78f4714e6)
51. [DONE] `phase8.stream2.task2` Run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, verify the VSIX no longer contains native Swift build artefacts, then record build artifacts and release evidence (scope: `assets/**/manifest.json, package.json, package-lock.json, packages/**/package.json, doc/tmp/releases/`; expected commit: `chore: build vsix size hotfix release`).
52. [PENDING] Git Commit: `chore: build vsix size hotfix release` (hash: TBD)

### Stream: User Visual Acceptance Retest 4
53. [TODO] `phase8.stream3.task1` User installs/retests the VSIX package-size hotfix release and accepts the Development Tree materialization/sidebar behavior plus release package size (scope: user visual acceptance; no commit expected).

### Stream: Scope Closeout
44. [TODO] `phase5.stream5.task1` Close implementation scope after explicit user acceptance, archive todo-plan and update planning-doc disposition/index references (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree materialization implementation`).
45. [TODO] Git Commit: `docs: close development tree materialization implementation` (hash: TBD)
46. [TODO] `phase5.stream5.task2` Reserved post-closeout handoff anchor (scope: terminal NONE transition; no commit expected).
