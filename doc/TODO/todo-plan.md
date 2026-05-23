# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-lead-contract-orchestration-implementation-2026-05-22",
  "branch": "main",
  "baseHead": "ab59a2447",
  "lastRecordedCommit": "1f653c14e",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md",
  "currentTaskId": "phase8.stream16.task1",
  "expectedCommitMessage": "docs: prepare workflow clear undo release",
  "debt": {
    "expectedCommitMessage": "docs: prepare workflow clear undo release",
    "preCommitHead": "1f653c14e",
    "stage": "commit_pending",
    "taskId": "phase8.stream16.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md`
- **Release build confirmation:** user explicitly requested implementation and a new release build on 2026-05-22.
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-validator.ts`
  - `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`
  - `packages/core/src/development-tree/development-tree-types.ts`
  - `packages/core/src/development-tree/development-tree-state-facade.ts`
  - `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.ts`
  - `packages/core/src/development-tree/development-tree-operation-nodes.ts`
  - `packages/core/src/remote-bridge/remote-bridge-development-tree-node-command-router.ts`
  - `src/client/project-manager/services/workflow-state-development-tree-client.ts`
  - `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`
  - `src/client/project-manager/components/layout/development-tree-node-start-card.tsx`
- Only this list is the recovery context for this implementation cycle.

## Правила выполнения (Execution Rules)

- **Required reading before each code fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation task touches no more than 3 tracked files/packages unless the task is split first.
- Each tracked task is paired with a separate `Git Commit: ...` item.
- Architecture changes must update the relevant `doc/SolidWorks-WorkFlow/**` document in the same commit.
- Quality gates run through Husky via `npm run plan:commit -- "<expected commit message>"`.
- Targeted verification is required for touched packages before their stream is closed.
- Release build is authorized by the user for this cycle, but scope remains `ACTIVE` after release until user acceptance testing completes.
- Scope Closeout runs only after explicit post-release user acceptance.

## Phase 1 — Plan Setup (owner: Codex, updated: 2026-05-22)

### Stream: Implementation Plan Setup
1. [DONE] `phase1.stream1.task1` Create the implementation todo plan based on the archived Lead Product Part Contract Orchestrator planning document and real code inspection (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open development tree lead contract implementation`).
2. [DONE] Git Commit: `docs: open development tree lead contract implementation` (hash: db537ec8e)

## Phase 2 — Diagram Modules Lead Contract (owner: Codex, updated: 2026-05-22)

### Stream: Diagram Modules Artifact Contract
3. [DONE] `phase2.stream1.task1` Add parsing/validation support for `leadProductPartId` and `productPartLeadershipOrder` in Diagram Modules index artifacts (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-validator.ts, packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts, packages/core/src/remote-bridge/handlers/diagram-modules-progress.test.ts`; expected commit: `feat: validate diagram modules leadership order`).
4. [DONE] Git Commit: `feat: validate diagram modules leadership order` (hash: 3636357cf)

### Stream: Diagram Modules Prompt Contract
5. [DONE] `phase2.stream2.task1` Update Diagram Modules prompt/tests so the agent must declare lead Product Part and Product Part leadership order in the accepted index artifact (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.ts, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`; expected commit: `docs: require diagram modules leadership order prompt`).
6. [DONE] Git Commit: `docs: require diagram modules leadership order prompt` (hash: fb3e000f4)

## Phase 3 — Development Tree Read Model And Materialization (owner: Codex, updated: 2026-05-22)

### Stream: Snapshot Metadata
7. [DONE] `phase3.stream1.task1` Extend Development Tree snapshot types/read model with `leadProductPartId`, leadership order metadata and node lock reasons (scope: `packages/core/src/development-tree/development-tree-types.ts, packages/core/src/development-tree/development-tree-state-facade.ts, packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts`; expected commit: `feat: project development tree leadership metadata`).
8. [DONE] Git Commit: `feat: project development tree leadership metadata` (hash: b96461b76)

### Stream: Filesystem Materialization
9. [DONE] `phase3.stream2.task1` Materialize lead orchestration folders/placeholders in `.codeai-hub` and `doc/TODO/stages/development-tree` while preserving Product Part leadership order (scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-paths.ts`; expected commit: `feat: materialize lead contract orchestration folders`).
10. [DONE] Git Commit: `feat: materialize lead contract orchestration folders` (hash: 3e3545ca2)

### Stream: Operation Nodes
11. [DONE] `phase3.stream3.task1` Add Lead Product Part Orchestration operation nodes for Contract Graph, Cross-Part Contracts, Shared Interfaces and Execution Waves (scope: `packages/core/src/development-tree/development-tree-operation-nodes.ts, packages/core/src/development-tree/development-tree-state-facade.ts, packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts`; expected commit: `feat: add lead contract operation nodes`).
12. [DONE] Git Commit: `feat: add lead contract operation nodes` (hash: 17ed00acc)

## Phase 4 — Start Gating And Prompt Foundations (owner: Codex, updated: 2026-05-22)

### Stream: Core Node Start Gate
13. [DONE] `phase4.stream1.task1` Enforce Core-side Development Tree node start rules so only lead orchestration is startable before frozen Contract Graph/wave assignment (scope: `packages/core/src/remote-bridge/remote-bridge-development-tree-node-command-router.ts, packages/core/src/remote-bridge/remote-bridge-development-tree-node-command-router.test.ts, packages/core/src/development-tree/development-tree-types.ts`; expected commit: `feat: gate development tree node starts by contract wave`).
14. [DONE] Git Commit: `feat: gate development tree node starts by contract wave` (hash: 3af0a006e)

### Stream: Prompt Pack And Research Artifact Schema
15. [DONE] `phase4.stream2.task1` Add initial Core-owned types/contracts for agent prompt pack enforcement and per-agent research artifacts (scope: `packages/core/src/development-tree/development-tree-types.ts, packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts, packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts`; expected commit: `feat: add development tree agent research contracts`).
16. [DONE] Git Commit: `feat: add development tree agent research contracts` (hash: b25d303ec)

## Phase 5 — Project Manager Projection (owner: Codex, updated: 2026-05-22)

### Stream: Client Read Model
17. [DONE] `phase5.stream1.task1` Extend Project Manager Development Tree client parser/types for lead metadata, operation locks and research/contract review nodes (scope: `src/client/project-manager/services/workflow-state-development-tree-client.ts, src/client/project-manager/services/workflow-state-client.test.ts`; expected commit: `feat: parse development tree leadership metadata`).
18. [DONE] Git Commit: `feat: parse development tree leadership metadata` (hash: 5bc8983f7)

### Stream: Sidebar Projection
19. [DONE] `phase5.stream2.task1` Render lead Product Part first, locked non-lead nodes and lead orchestration children in the left sidebar (scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes-progress.test.ts`; expected commit: `feat: show lead contract orchestration in sidebar`).
20. [DONE] Git Commit: `feat: show lead contract orchestration in sidebar` (hash: 962332d7c)

### Stream: Node Start Card UX
21. [DONE] `phase5.stream3.task1` Show locked reason and disable node start UI for non-startable Development Tree nodes (scope: `src/client/project-manager/components/layout/development-tree-node-start-card.tsx, src/client/project-manager/components/layout/main-area-panel-content.tsx, src/client/project-manager/components/layout/main-area-panel-content.test.ts`; expected commit: `feat: explain locked development tree nodes`).
22. [DONE] Git Commit: `feat: explain locked development tree nodes` (hash: 08453143e)

## Phase 6 — Verification (owner: Codex, updated: 2026-05-22)

### Stream: Targeted Builds
23. [DONE] `phase6.stream1.task1` Run targeted verification for touched packages and clients: core build/tests, webview typecheck, Project Manager build (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: --help

### Stream: Tooling Verification
24. [DONE] `phase6.stream2.task1` Run plan validation, link checker and final quality diagnostics before release preparation (scope: `doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted builds, plan validation, link check and architecture diagnostics completed.

## Phase 7 — Release Build (owner: Codex, updated: 2026-05-22)

### Stream: Release Docs
25. [DONE] `phase7.stream1.task1` Update release-facing docs for the next version before build-all, as required by the release checklist (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare development tree orchestration release`).
26. [DONE] Git Commit: `docs: prepare development tree orchestration release` (hash: f66c53aff)

### Stream: Release Build
27. [DONE] `phase7.stream2.task1` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, CHANGELOG.md, README.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build development tree orchestration release`).
28. [DONE] Git Commit: `chore: build development tree orchestration release` (hash: ff75189bb)

## Phase 8 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-22)

### Stream: User Retest
29. [BLOCKED] `phase8.stream1.task1` User installs the generated v1.2.323 VSIX and verifies Diagram Modules acceptance creates the lead-first Development Tree, locks non-lead nodes, exposes Lead Product Part Orchestration and preserves materialized folders; Quality Gates creates the research artifact first, offers only research-capable providers, and shows Research/Contract artifact buttons (scope: user workflow acceptance; no commit expected). Blocked: user requested workflow step clear remediation before final acceptance.

### Stream: Acceptance Remediation — Quality Gates Research Gate
30. [DONE] `phase8.stream2.task1` Add Core-owned Quality Gates research artifact contract, validator phase, stage plan transition and prompt repair messages before draft contract creation (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/**, packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/**`; expected commit: `feat: add quality gates research artifact gate`).
31. [DONE] Git Commit: `feat: add quality gates research artifact gate` (hash: 1a9a2c21c)
32. [DONE] `phase8.stream3.task1` Gate Quality Gates provider choices to research-capable providers, enable supported search tooling and expose Research/Contract artifact buttons in Project Manager (scope: `packages/Claude_Module/src/**, packages/Codex_AppServer_Module/src/**, src/client/project-manager/**`; expected commit: `feat: require research capable quality gates providers`).
33. [DONE] Git Commit: `feat: require research capable quality gates providers` (hash: f2ff64bab)
34. [DONE] `phase8.stream4.task1` Run targeted validation for Quality Gates research flow, provider gating and Project Manager artifacts UI (scope: `packages/core, packages/Claude_Module, packages/Codex_AppServer_Module, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted validation completed: Core build and Quality Gates tests passed; Claude/Codex provider builds and tests passed; Project Manager build, webview typecheck, provider gating and artifact header mode tests passed.
35. [DONE] `phase8.stream5.task1` Update release-facing docs for the replacement v1.2.323 build after explicit release confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates research remediation release`).
36. [DONE] Git Commit: `docs: prepare quality gates research remediation release` (hash: f346bde3f)
37. [DONE] `phase8.stream5.task2` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build quality gates research remediation release`). Result: v1.2.323 tarballs copied to `doc/tmp/releases/`; VSIX `codeai-hub-1.2.323.vsix` built successfully at 4.5M with SDK exclusions and package surface checks passing.
38. [DONE] Git Commit: `chore: build quality gates research remediation release` (hash: 0c7c47f65)

### Stream: Acceptance Remediation — Workflow Step Clear Action
39. [DONE] `phase8.stream6.task1` Add a focused plan for Core-owned workflow step clear action with PM context menu trigger and confirmation (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan workflow step clear action`).
40. [DONE] Git Commit: `docs: plan workflow step clear action` (hash: b476d190e)
41. [DONE] `phase8.stream6.task2` Add Core-owned clear endpoint/service that removes selected workflow step artifacts, continuity records and downstream state from workspace and user-space locations (scope: `packages/core/src/remote-bridge/handlers/**, packages/core/src/workflow/state/**, packages/core/src/remote-bridge/handlers/**.test.ts`; expected commit: `feat: clear workflow step artifacts from core`).
42. [DONE] Git Commit: `feat: clear workflow step artifacts from core` (hash: 09b43087f)
43. [DONE] `phase8.stream6.task3` Add Project Manager API/service and sidebar right-click menu with English `Clear` command plus destructive confirmation before calling Core (scope: `src/client/project-manager/services/**, src/client/project-manager/components/layout/**`; expected commit: `feat: add sidebar workflow clear action`).
44. [DONE] Git Commit: `feat: add sidebar workflow clear action` (hash: 2210d8931)
45. [DONE] `phase8.stream6.task4` Run targeted validation for Core clear behavior and Project Manager sidebar context menu (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Core build and workflow-step-clear service tests passed; webview typecheck, webview build, Project Manager build and sidebar clear menu tests passed.
46. [DONE] `phase8.stream6.task6` Extend Core clear action to delete matching user-space unified session history and translation overlay files under `~/.codeai-hub/sessions` for selected steps and downstream continuity chains (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.test.ts`; expected commit: `feat: clear workflow user-space session files`).
47. [DONE] Git Commit: `feat: clear workflow user-space session files` (hash: 4b2feb5f5)
48. [DONE] `phase8.stream6.task5` Wait for explicit user confirmation before building a replacement release for the clear action (scope: release confirmation gate; no commit expected). Result: user explicitly requested a new release build on 2026-05-22.

### Stream: Release Build — Workflow Step Clear Action
49. [DONE] `phase8.stream7.task1` Update release-facing docs for the replacement workflow step clear build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow step clear release`).
50. [DONE] Git Commit: `docs: prepare workflow step clear release` (hash: da578f1cc)
51. [DONE] `phase8.stream7.task2` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build workflow step clear release`). Result: v1.2.324 tarballs copied to `doc/tmp/releases/`; VSIX `codeai-hub-1.2.324.vsix` built successfully at 4.5M with SDK exclusions, local artefact validation, markdown links, duplication check and package surface checks passing.
52. [DONE] Git Commit: `chore: build workflow step clear release` (hash: 2ddb3b14a)
53. [BLOCKED] `phase8.stream7.task3` User installs the generated replacement VSIX and verifies workflow step clear behavior from the Project Manager sidebar (scope: user workflow acceptance; no commit expected). Blocked: user requested a new replacement release number before final acceptance.

### Stream: Replacement Release Build — Workflow Step Clear Action
54. [DONE] `phase8.stream8.task1` Update release-facing docs for the v1.2.325 replacement workflow step clear build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow step clear rerelease`).
55. [DONE] Git Commit: `docs: prepare workflow step clear rerelease` (hash: 9636f5c44)
56. [DONE] `phase8.stream8.task2` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build workflow step clear rerelease`). Result: v1.2.325 tarballs copied to `doc/tmp/releases/`; VSIX `codeai-hub-1.2.325.vsix` built successfully at 4.5M with SDK exclusions, local artefact validation, markdown links, duplication check and package surface checks passing.
57. [DONE] Git Commit: `chore: build workflow step clear rerelease` (hash: 43b619b2c)
58. [BLOCKED] `phase8.stream8.task3` User installs the generated v1.2.325 replacement VSIX and verifies workflow step clear behavior from the Project Manager sidebar (scope: user workflow acceptance; no commit expected). Blocked: user reported Diagram Modules orchestrator repair prompts during release retest before final acceptance.

### Stream: Acceptance Remediation — Diagram Modules Repair Flow
59. [DONE] `phase8.stream9.task1` Stop Diagram Modules Product Part continuation when the Product Parts index has leadership metadata diagnostics, and cover the repair target with a regression test (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-validator.ts, packages/core/src/remote-bridge/handlers/diagram-modules-progress.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: target diagram modules index repairs`).
60. [DONE] Git Commit: `fix: target diagram modules index repairs` (hash: 761c3904e)
61. [DONE] `phase8.stream9.task2` Keep provider repair prompts inline but replace Core-visible Diagram Modules validation transcript messages with compact user-facing notices (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: compact diagram modules repair notices`).
62. [DONE] Git Commit: `fix: compact diagram modules repair notices` (hash: 867f3864a)
63. [DONE] `phase8.stream9.task3` Run targeted validation for Diagram Modules repair targeting and compact transcript behavior (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Core build passed; Diagram Modules validator/progress and runtime-core managed workflow tests passed for index repair targeting and compact Core-visible validation notices.
64. [BLOCKED] `phase8.stream9.task4` Wait for explicit user confirmation before building another replacement release for Diagram Modules repair flow (scope: release confirmation gate; no commit expected). Blocked: user reported missing Diagram Modules leadership selection guidance in the initial Core prompt/template before release confirmation.

### Stream: Acceptance Remediation — Diagram Modules Leadership Prompt
65. [DONE] `phase8.stream10.task1` Add explicit Core-owned Diagram Modules leadership selection rules and regression coverage for the initial prompt (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: teach diagram modules leadership metadata`).
66. [DONE] Git Commit: `fix: teach diagram modules leadership metadata` (hash: 78c79df68)
67. [DONE] `phase8.stream10.task2` Add Product Parts index metadata example to the source template and regenerated bundled template (scope: `packages/agents/diagram-modules-agent/assets/product-parts-index-template.md, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `fix: include diagram modules leadership index template`).
68. [DONE] Git Commit: `fix: include diagram modules leadership index template` (hash: 11dcac01c)
69. [DONE] `phase8.stream10.task3` Run targeted validation for Diagram Modules leadership prompt/template behavior (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Core build passed; Diagram Modules prompt/template/progress tests passed; generated initial prompt now contains leadership selection rules plus Product Parts index metadata template.
70. [BLOCKED] `phase8.stream10.task4` Wait for explicit user confirmation before building another replacement release for Diagram Modules leadership remediation (scope: release confirmation gate; no commit expected). Blocked: the actual first provider prompt for Diagram Modules is built from the bundled agent instruction asset, which still lacks leadership guidance.
71. [DONE] `phase8.stream10.task5` Add lead Product Part selection rules to the Diagram Modules agent instruction asset and regenerated bundled template (scope: `packages/agents/diagram-modules-agent/assets/diagram-modules-prompt.md, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `fix: teach diagram modules agent prompt leadership order`).
72. [DONE] Git Commit: `fix: teach diagram modules agent prompt leadership order` (hash: dbdea07df)
73. [DONE] `phase8.stream10.task6` Add Core workflow prompt pack regression coverage for Diagram Modules leadership guidance in the first provider prompt (scope: `packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover diagram modules leadership prompt pack`).
74. [DONE] Git Commit: `test: cover diagram modules leadership prompt pack` (hash: 5fd661624)
75. [DONE] `phase8.stream10.task7` Run targeted validation for Diagram Modules first prompt and managed prompt leadership behavior (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Core build passed; workflow prompt pack, Diagram Modules managed prompt builder, bundled template sync, progress/validator tests passed; generated first Diagram Modules provider prompt contains leadership fields, leadership rules and index metadata template.
76. [BLOCKED] `phase8.stream10.task8` Wait for explicit user confirmation before building another replacement release for Diagram Modules leadership remediation (scope: release confirmation gate; no commit expected). Blocked: user reported a native Project Manager crash when opening the workflow step Clear action from the sidebar context menu.

### Stream: Acceptance Remediation — Workflow Clear Context Menu Crash
77. [DONE] `phase8.stream11.task1` Replace native `window.confirm` in the sidebar Clear action with an in-app confirmation menu and suppress native context-menu events earlier (scope: `src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx, src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: avoid native clear confirmation crash`).
78. [DONE] Git Commit: `fix: avoid native clear confirmation crash` (hash: b7b910544)
79. [DONE] `phase8.stream11.task2` Run targeted validation for Project Manager sidebar Clear context menu behavior (scope: `src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Project Manager sidebar Clear context menu validation passed: typecheck:webview, build:webview, build:project-manager and workspace-tree-clear-menu tests passed.
80. [DONE] `phase8.stream11.task3` Wait for explicit user confirmation before building another replacement release for workflow clear crash remediation (scope: release confirmation gate; no commit expected). Result: User explicitly requested a new test release build for workflow clear crash remediation on 2026-05-23.

### Stream: Release Build — Workflow Clear Context Menu Crash
81. [DONE] `phase8.stream12.task1` Update release-facing docs for the v1.2.326 workflow clear crash remediation build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow clear crash release`).
82. [DONE] Git Commit: `docs: prepare workflow clear crash release` (hash: a2cc14849)
83. [DONE] `phase8.stream12.task2` Run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, verify VSIX/tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**, *.vsix`; expected commit: `chore: build workflow clear crash release`). Result: v1.2.326 tarballs copied to `doc/tmp/releases/`; VSIX `codeai-hub-1.2.326.vsix` built successfully at 4.5M with SDK exclusions, local artefact validation, markdown links, duplication check and package surface checks passing.
84. [DONE] Git Commit: `chore: build workflow clear crash release` (hash: e5b6172ef)

### Stream: Acceptance Remediation — Quality Gates And Clear Menu Regression
85. [DONE] `phase8.stream13.task1` Restore Project Manager Quality Gates Research/Contract artifact header modes and make the sidebar Clear menu open from the right-button mouse-down path while keeping the in-app confirmation flow (scope: `src/client/project-manager/components/layout/stage-artifact-mode.ts, src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx, doc/TODO/todo-plan.md`; expected commit: `fix: restore quality gates artifact modes and clear menu`).
86. [DONE] Git Commit: `fix: restore quality gates artifact modes and clear menu` (hash: 0c9d0a65b)
87. [DONE] `phase8.stream13.task2` Add regression coverage for Quality Gates header modes and sidebar Clear menu right-click opening (scope: `src/client/project-manager/components/layout/stage-artifact-mode.test.ts, src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates artifact modes and clear menu`).
88. [DONE] Git Commit: `test: cover quality gates artifact modes and clear menu` (hash: d63535252)
89. [DONE] `phase8.stream13.task3` Enforce Quality Gates research-first provider prompt and managed validation boundary so the first agent pass creates only the research report for user/Core review (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/**, packages/core/src/managed-workflow-orchestration/quality-gates/**, packages/core/src/remote-bridge/handlers/*quality-gates*.*, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, doc/TODO/todo-plan.md`; expected commit: `fix: enforce quality gates research first boundary`).
90. [DONE] Git Commit: `fix: enforce quality gates research first boundary` (hash: 6cc0ccdec)
91. [DONE] `phase8.stream13.task4` Run targeted validation for Quality Gates research boundary and Project Manager sidebar/header regressions (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Quality Gates research-first boundary tests, validator tests, bundled template tests, review-decision flow test, Project Manager artifact mode/menu tests, Core build, webview typecheck, webview build and Project Manager build passed.
92. [DONE] `phase8.stream13.task5` Wait for explicit user confirmation before building another replacement release for Quality Gates and Clear menu remediation (scope: release confirmation gate; no commit expected). Result: user explicitly requested a new release build on 2026-05-23.

### Stream: Release Build — Quality Gates And Clear Menu Regression
93. [DONE] `phase8.stream14.task1` Update release-facing docs for the v1.2.327 Quality Gates research-first and Clear menu replacement build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates clear regression release`).
94. [DONE] Git Commit: `docs: prepare quality gates clear regression release` (hash: d796e6807)
95. [DONE] `phase8.stream14.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.327 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build quality gates clear regression release`).
96. [DONE] Git Commit: `chore: build quality gates clear regression release` (hash: 01b7b712b)
97. [DONE] `phase8.stream14.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX output and record release artifacts (scope: `codeai-hub-1.2.327.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package quality gates clear regression vsix`). Result: VSIX `codeai-hub-1.2.327.vsix` built successfully at 4.5M with SDK exclusions, local artefact validation, markdown links, duplication check and package surface checks passing.
98. [DONE] Git Commit: `chore: package quality gates clear regression vsix` (hash: 8efd85881)
99. [BLOCKED] `phase8.stream14.task4` User installs the generated v1.2.327 VSIX and verifies Quality Gates research-first flow, Research/Contract artifact buttons, and sidebar Clear menu behavior from Project Manager (scope: user workflow acceptance; no commit expected). Blocked: user reported that workflow step Clear deletes Description input questionnaire while leaving continuity/index records; Clear must become persistent undo-ledger based.

### Stream: Acceptance Remediation — Workflow Step Persistent Undo
100. [DONE] `phase8.stream15.task1` Add a Core-owned persistent workflow step undo ledger, record generated artifacts/directories from provider artifact upserts and Development Tree materialization, and make Clear reverse ledger entries while pruning continuity index/user-space sessions and preserving Description questionnaire fallback behavior (scope: `packages/core/src/workflow/undo/**, packages/core/src/remote-bridge/handlers/workflow-step-clear*.ts, packages/core/src/remote-bridge/handlers/http-api-artifact-*.ts, packages/core/src/remote-bridge/handlers/http-api-system-routes.ts, packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade.test.ts`; expected commit: `feat: add workflow step undo ledger`).
101. [DONE] Git Commit: `feat: add workflow step undo ledger` (hash: 1f653c14e)
102. [DONE] `phase8.stream15.task2` Run targeted validation for workflow clear undo ledger, artifact upsert recording and Development Tree materialization recording (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted workflow undo validation passed: artifact upsert, Development Tree materialization and workflow clear undo tests passed; core build passed.
103. [DONE] `phase8.stream15.task3` Wait for explicit user confirmation before building another replacement release for persistent workflow clear undo behavior (scope: release confirmation gate; no commit expected). Result: User explicitly requested a new release build for persistent workflow clear undo behavior on 2026-05-23.

### Stream: Release Build — Workflow Step Persistent Undo
104. [DONE] `phase8.stream16.task1` Update release-facing docs for the v1.2.328 workflow clear persistent undo build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow clear undo release`).
105. [PENDING] Git Commit: `docs: prepare workflow clear undo release` (hash: TBD)
106. [TODO] `phase8.stream16.task2` Run `./scripts/build-all.sh`, verify v1.2.328 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build workflow clear undo release`).
107. [TODO] Git Commit: `chore: build workflow clear undo release` (hash: TBD)
108. [TODO] `phase8.stream16.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX output and record release artifacts (scope: `codeai-hub-1.2.328.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package workflow clear undo vsix`).
109. [TODO] Git Commit: `chore: package workflow clear undo vsix` (hash: TBD)
110. [TODO] `phase8.stream16.task4` User installs the generated v1.2.328 VSIX and verifies workflow step Clear uses persistent undo behavior for Description, Virtual Simulation and downstream Development Tree cleanup (scope: user workflow acceptance; no commit expected).

## Phase 9 — Scope Closeout (owner: Codex, updated: 2026-05-22)

### Stream: Scope Closeout
111. [TODO] `phase9.stream1.task1` Close implementation scope after explicit user acceptance, archive todo-plan and update Docs_Index if follow-up documents move (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree lead contract implementation`).
112. [TODO] Git Commit: `docs: close development tree lead contract implementation` (hash: TBD)
