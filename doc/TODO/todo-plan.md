# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "development-tree-lead-contract-orchestration-implementation-2026-05-22",
  "branch": "main",
  "baseHead": "ab59a2447",
  "lastRecordedCommit": "f9f36e1aa",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_ProjectApplicationContractOrchestrator_Planning_RU.md",
  "currentTaskId": "phase8.stream70.task11",
  "expectedCommitMessage": "refactor: remove legacy workflow git rollback facade",
  "debt": {
    "expectedCommitMessage": "refactor: remove legacy workflow git rollback facade",
    "preCommitHead": "f9f36e1aa",
    "stage": "commit_pending",
    "taskId": "phase8.stream70.task11"
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
105. [DONE] Git Commit: `docs: prepare workflow clear undo release` (hash: bc5742366)
106. [DONE] `phase8.stream16.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.328 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build workflow clear undo release`).
107. [DONE] Git Commit: `chore: build workflow clear undo release` (hash: e310849c1)
108. [DONE] `phase8.stream16.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-1.2.328.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package workflow clear undo vsix`).
109. [DONE] Git Commit: `chore: package workflow clear undo vsix` (hash: 27d7817ee)
110. [BLOCKED] `phase8.stream16.task4` User installs the generated v1.2.328 VSIX and verifies workflow step Clear uses persistent undo behavior for Description, Virtual Simulation and downstream Development Tree cleanup (scope: user workflow acceptance; no commit expected). Result: User retest on 2026-05-23 showed Clear does not restore the Description questionnaire/editor state as the first restartable step artifact.

### Stream: Workflow Clear Hard Undo Regression
111. [DONE] `phase8.stream17.task1` Make workflow step Clear preserve the Description questionnaire baseline while reversing generated downstream artifacts from the undo ledger, and cover the stale description-state projection with regression tests (scope: `packages/core/src/workflow/undo/workflow-step-undo-ledger.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts`; expected commit: `fix: restore questionnaire on workflow clear`).
112. [DONE] Git Commit: `fix: restore questionnaire on workflow clear` (hash: 9e683d046)
113. [DONE] `phase8.stream17.task2` Record workspace-file writes as persistent undo events so questionnaire edits and generated workflow files have restart-safe reverse operations (scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts, packages/core/src/remote-bridge/handlers/workspace-file-service.test.ts, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `feat: record workspace file writes in undo ledger`).
114. [DONE] Git Commit: `feat: record workspace file writes in undo ledger` (hash: 35e42a618)
115. [DONE] `phase8.stream17.task3` Run targeted workflow clear undo validation and core build after hard-undo fixes (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted hard-undo validation passed: workspace-file undo recording, workflow clear undo regressions, artifact upsert coverage and @codeai-hub/core build all passed.
116. [DONE] `phase8.stream17.task4` Wait for explicit user confirmation before building the next replacement release after hard-undo fixes (scope: release confirmation gate; no commit expected). Result: User explicitly requested a new release build for workflow hard undo on 2026-05-23.

### Stream: Release Build — Workflow Clear Hard Undo
117. [DONE] `phase8.stream18.task1` Update release-facing docs for the v1.2.329 workflow clear hard undo build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow hard undo release`).
118. [DONE] Git Commit: `docs: prepare workflow hard undo release` (hash: 156ce056f)
119. [DONE] `phase8.stream18.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.329 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build workflow hard undo release`).
120. [DONE] Git Commit: `chore: build workflow hard undo release` (hash: e1699d256)
121. [DONE] `phase8.stream18.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-1.2.329.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package workflow hard undo vsix`).
122. [DONE] Git Commit: `chore: package workflow hard undo vsix` (hash: 33d972c4a)
123. [BLOCKED] `phase8.stream18.task4` User installs the generated v1.2.329 VSIX and verifies workflow step Clear returns Description to an editable questionnaire and reverses downstream workflow actions from the persistent undo ledger (scope: user workflow acceptance; no commit expected). Blocked: user retest showed orphaned `Final_Description.md`, empty continuity directories, stale user-space session files and stale Project Manager questionnaire session cache after Clear.

### Stream: Workflow Clear Exact Revert Regression
126. [DONE] `phase8.stream19.task1` Make workflow step Clear combine persisted undo with fallback stage cleanup, remove empty continuity state instead of rewriting empty indexes, and delete user-space session files for cleared workflow stages even when continuity has already been pruned (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-continuity-support.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts`; expected commit: `fix: remove orphaned workflow clear state`).
127. [DONE] Git Commit: `fix: remove orphaned workflow clear state` (hash: ac6212258)
128. [DONE] `phase8.stream19.task2` Make Project Manager reload the Description questionnaire through a fresh workspace session when the cached session was cleared, preserving the existing filled questionnaire file instead of rendering an empty form (scope: `src/client/project-manager/services/description-questionnaire-service.ts, src/client/project-manager/services/description-questionnaire-service.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: reload questionnaire after workflow clear`).
129. [DONE] Git Commit: `fix: reload questionnaire after workflow clear` (hash: a5b5e4115)
130. [DONE] `phase8.stream19.task3` Run targeted validation for Core workflow clear exact-revert behavior and Project Manager questionnaire reload after Clear (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Core build passed; `workflow-step-clear-service.undo` regression tests passed; Project Manager questionnaire stale-session refresh test passed; `typecheck:webview`, `build:webview` and `build:project-manager` passed.
131. [BLOCKED] `phase8.stream19.task4` Wait for explicit user confirmation before building the next replacement release after exact-revert Clear fixes (scope: release confirmation gate; no commit expected). Blocked: user requested a real centralized undo module instead of continuing with per-path fixes.

### Stream: Workflow Mutation Journal Runtime
134. [DONE] `phase8.stream20.task1` Add a Core-owned workflow mutation journal runtime that snapshots workflow/user-space mutation scopes before and after an action, derives file/directory diffs and appends undo entries without per-writer manual path lists (scope: `packages/core/src/workflow/undo/workflow-step-undo-ledger.ts, packages/core/src/workflow/undo/workflow-mutation-journal-runtime.ts, packages/core/src/workflow/undo/workflow-mutation-journal-runtime.test.ts`; expected commit: `feat: add workflow mutation journal runtime`).
135. [DONE] Git Commit: `feat: add workflow mutation journal runtime` (hash: 48f705a8e)
136. [DONE] `phase8.stream20.task2` Wire mutation journal runtime into central Core workflow mutation boundaries for workspace-session creation, workspace-file writes, artifact upserts and session message turns (scope: `packages/core/src/remote-bridge/handlers/workspace-session-service.ts, packages/core/src/remote-bridge/handlers/http-api-session-routes.ts, packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `feat: capture workflow mutations centrally`).
137. [DONE] Git Commit: `feat: capture workflow mutations centrally` (hash: e5cfb014e)
138. [DONE] `phase8.stream20.task3` Wire mutation journal runtime into workspace-file writes and harden directory undo replay so created directory entries do not recursively delete preserved checkpoint files (scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts, packages/core/src/workflow/undo/workflow-step-undo-ledger.ts, packages/core/src/remote-bridge/handlers/workspace-file-service.test.ts`; expected commit: `feat: capture workspace file mutations`).
139. [DONE] Git Commit: `feat: capture workspace file mutations` (hash: d6da28361)
140. [DONE] `phase8.stream20.task4` Document the centralized workflow undo invariant in the architecture SSOT (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: define centralized workflow undo journal`).
141. [DONE] Git Commit: `docs: define centralized workflow undo journal` (hash: 0e2492906)
142. [DONE] `phase8.stream20.task5` Run targeted validation for Core mutation journal, workflow clear undo, Project Manager questionnaire reload and affected builds before release packaging (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Core build passed; mutation journal runtime, workspace-file undo and workflow-step clear undo tests passed; Project Manager questionnaire stale-session refresh test passed; `typecheck:webview`, `build:webview` and `build:project-manager` passed.
143. [DONE] `phase8.stream20.task6` Update release-facing docs for the next centralized workflow undo release before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare centralized workflow undo release`).
144. [DONE] Git Commit: `docs: prepare centralized workflow undo release` (hash: 27b0f0573)
145. [DONE] `phase8.stream20.task7` Run `./scripts/build-all.sh --allow-dirty`, verify tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build centralized workflow undo release`).
146. [DONE] Git Commit: `chore: build centralized workflow undo release` (hash: bf3235a9e)
147. [DONE] `phase8.stream20.task8` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package centralized workflow undo vsix`).
148. [DONE] Git Commit: `chore: package centralized workflow undo vsix` (hash: 0e5a85fdb)
149. [BLOCKED] `phase8.stream20.task9` User installs the generated centralized workflow undo VSIX and verifies Clear returns workspace/user-space exactly to the pre-step state (scope: user workflow acceptance; no commit expected). Blocked: user retest showed clearing Description still leaves Project Manager without the questionnaire/read-model state, proving journal-only undo is not sufficient.

### Stream: Workflow Step Checkpoint Restore
152. [DONE] `phase8.stream21.task1` Add a Core-owned workflow step checkpoint module with explicit contract, facade, store and restart-safe exact restore coverage (scope: `packages/core/src/workflow/step-checkpoint/workflow-step-checkpoint-facade.ts, packages/core/src/workflow/step-checkpoint/workflow-step-checkpoint-store.ts, packages/core/src/workflow/step-checkpoint/workflow-step-checkpoint-store.test.ts`; expected commit: `feat: add workflow step checkpoint restore`).
153. [DONE] Git Commit: `feat: add workflow step checkpoint restore` (hash: daaac7232)
154. [DONE] `phase8.stream21.task2` Wire checkpoint capture into workflow step start boundaries and make Clear prefer checkpoint restore before legacy journal cleanup while documenting the module boundary (scope: `packages/core/src/remote-bridge/handlers/workspace-session-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `feat: restore workflow clear from checkpoints`).
155. [DONE] Git Commit: `feat: restore workflow clear from checkpoints` (hash: b439e6a26)
156. [DONE] `phase8.stream21.task3` Add Clear checkpoint restore regression coverage for Description questionnaire restart state and downstream workspace/user-space cleanup (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts, packages/core/src/workflow/step-checkpoint/workflow-step-checkpoint-store.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover workflow checkpoint clear restore`).
157. [DONE] Git Commit: `test: cover workflow checkpoint clear restore` (hash: 5e6464c95)
158. [DONE] `phase8.stream21.task4` Run targeted checkpoint restore validation for Core clear behavior, Description questionnaire restart state and affected builds (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted checkpoint restore validation passed: Core build, checkpoint facade tests, workflow clear checkpoint/ledger regressions, mutation journal tests, workspace-file undo tests, Project Manager questionnaire refresh test, webview typecheck/build and Project Manager build all passed.
159. [DONE] `phase8.stream21.task5` Update release-facing docs for the next checkpoint restore release before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow checkpoint restore release`).
160. [DONE] Git Commit: `docs: prepare workflow checkpoint restore release` (hash: 46071a6ae)
161. [DONE] `phase8.stream21.task6` Run `./scripts/build-all.sh --allow-dirty`, verify tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build workflow checkpoint restore release`).
162. [DONE] Git Commit: `chore: build workflow checkpoint restore release` (hash: a74c5e3da)
163. [DONE] `phase8.stream21.task7` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package workflow checkpoint restore vsix`).
164. [DONE] Git Commit: `chore: package workflow checkpoint restore vsix` (hash: bb2dfbaf4)
165. [BLOCKED] `phase8.stream21.task8` User installs the generated checkpoint restore VSIX and verifies clearing Description returns the filled questionnaire/editor state and removes downstream workspace/user-space mutations (scope: user workflow acceptance; no commit expected). Blocked: user retest showed Clear leaves stale unified session files under the workspace-path session slug and provider-native Codex session JSONL files.

### Stream: Workflow Clear Session Trace Cleanup
166. [DONE] `phase8.stream22.task1` Make workflow step Clear collect and delete session traces before checkpoint restore, including workspace-path unified session roots and provider-native Codex/Claude session files linked by continuity provider session id (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-session-cleanup.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts`; expected commit: `fix: clear workflow session traces after checkpoint restore`).
167. [DONE] Git Commit: `fix: clear workflow session traces after checkpoint restore` (hash: d371c6998)
168. [DONE] `phase8.stream22.task2` Make workflow step checkpoints capture both initiative-slug and workspace-path user-space session roots for exact future restores (scope: `packages/core/src/workflow/step-checkpoint/workflow-step-checkpoint-store.ts, packages/core/src/workflow/step-checkpoint/workflow-step-checkpoint-store.test.ts, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `fix: checkpoint workspace path session roots`).
169. [DONE] Git Commit: `fix: checkpoint workspace path session roots` (hash: 5186bb6bc)
170. [DONE] `phase8.stream22.task3` Run targeted validation for workflow clear session trace cleanup and checkpoint root restore behavior (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Core build passed; workflow clear undo/session cleanup tests and workflow checkpoint restore tests passed.
171. [DONE] `phase8.stream22.task4` Wait for explicit user confirmation before building the next replacement release after session trace cleanup (scope: release confirmation gate; no commit expected). Result: user explicitly requested a new release build on 2026-05-23.

### Stream: Release Build — Workflow Session Trace Cleanup
172. [DONE] `phase8.stream23.task1` Update release-facing docs for the v1.2.332 workflow session trace cleanup build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow session cleanup release`).
173. [DONE] Git Commit: `docs: prepare workflow session cleanup release` (hash: f67df67ff)
174. [DONE] `phase8.stream23.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.332 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build workflow session cleanup release`).
175. [DONE] Git Commit: `chore: build workflow session cleanup release` (hash: f6e8dd8ad)
176. [DONE] `phase8.stream23.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package workflow session cleanup vsix`).
177. [DONE] Git Commit: `chore: package workflow session cleanup vsix` (hash: 16ae45f30)
178. [BLOCKED] `phase8.stream23.task4` User installs the generated v1.2.332 VSIX and verifies clearing Description removes workspace/user-space mutations, unified session files and provider-native session files (scope: user workflow acceptance; no commit expected). Blocked: user retest showed Codex provider-native translation JSONL files remain under `~/.codeai-hub/providers/codex/home/sessions`.

### Stream: Workflow Clear Codex Native Translation Cleanup
179. [DONE] `phase8.stream24.task1` Make workflow step Clear remove Codex provider-native workflow sessions by `session_meta.payload.id` and disposable Codex translation-native sessions that are not present in continuity (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-session-cleanup.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-session-cleanup.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: clear codex native translation sessions`).
180. [DONE] Git Commit: `fix: clear codex native translation sessions` (hash: 2bfc659ea)
181. [DONE] `phase8.stream24.task2` Run targeted validation for Codex provider-native workflow/translation session cleanup and Core build (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Core build passed; workflow-step clear session cleanup and clear undo tests passed.
182. [DONE] `phase8.stream24.task3` Wait for explicit user confirmation before building the next replacement release after Codex native translation cleanup (scope: release confirmation gate; no commit expected). Result: user explicitly requested a new release build on 2026-05-23.

### Stream: Release Build — Codex Native Translation Cleanup
183. [DONE] `phase8.stream25.task1` Update release-facing docs for the v1.2.333 Codex native translation cleanup build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare codex native cleanup release`).
184. [DONE] Git Commit: `docs: prepare codex native cleanup release` (hash: 222079007)
185. [DONE] `phase8.stream25.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.333 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build codex native cleanup release`).
186. [DONE] Git Commit: `chore: build codex native cleanup release` (hash: 41157ab5d)
187. [DONE] `phase8.stream25.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package codex native cleanup vsix`).
188. [DONE] Git Commit: `chore: package codex native cleanup vsix` (hash: 6c41ed621)
189. [BLOCKED] `phase8.stream25.task4` User installs the generated v1.2.333 VSIX and verifies clearing Description removes Codex provider-native workflow and translation JSONL files (scope: user workflow acceptance; no commit expected). Blocked: user retest showed Clear removes files but Project Manager keeps stale read-model/UI projection: Description does not reopen questionnaire, Virtual Simulation still references missing Description output, and sidebar indicators remain stale.

### Stream: Workflow Clear Read Model Resync
190. [DONE] `phase8.stream26.task1` Sanitize Core Description read model after checkpoint restore so missing `Final_Description.md` and removed session traces cannot be projected back into Project Manager (scope: `packages/core/src/workflow/description/description-step-store.ts, packages/core/src/workflow/description/description-step-store.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: sanitize clear workflow read model`).
191. [DONE] Git Commit: `fix: sanitize clear workflow read model` (hash: 1bf0a6d27)
192. [DONE] `phase8.stream26.task2` Make Project Manager invalidate workflow artifact availability immediately after Clear so sidebar and selected artifact projection re-probe deleted downstream files (scope: `src/client/project-manager/components/layout/use-workspace-tree-clear-menu.tsx, src/client/project-manager/components/layout/use-artifact-availability.ts, src/client/project-manager/components/layout/workspace-tree-clear-menu.test.ts`; expected commit: `fix: refresh project manager after workflow clear`).
193. [DONE] Git Commit: `fix: refresh project manager after workflow clear` (hash: c5c6c7647)
194. [BLOCKED] `phase8.stream26.task3` Run targeted validation for Core Description projection and Project Manager Clear refresh behavior (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Blocked: real workspace validation showed `description-step.json` may be absent after Clear while `questionnaire.md` remains, so Core must hydrate the Description read model from the questionnaire file itself.
195. [TODO] `phase8.stream26.task4` Wait for explicit user confirmation before building the next replacement release after workflow Clear read-model resync fixes (scope: release confirmation gate; no commit expected).

### Stream: Workflow Clear Questionnaire Fallback
196. [DONE] `phase8.stream27.task1` Hydrate Core Description read model from existing `questionnaire.md` when `description-step.json` is absent after Clear (scope: `packages/core/src/workflow/description/description-step-store.ts, packages/core/src/workflow/description/description-step-store.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: restore description questionnaire read model`).
197. [DONE] Git Commit: `fix: restore description questionnaire read model` (hash: 89130528a)
198. [DONE] `phase8.stream27.task2` Rerun targeted validation for real-workspace Description projection, workflow clear regressions, Core build and Project Manager refresh behavior (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Core build passed; DescriptionStepStore, workflow clear undo and Codex native session cleanup tests passed; real workspace projection now returns `questionnaire.md` without stale `Final_Description.md` or session refs; Project Manager typecheck, webview build and Project Manager build passed; Clear refresh source assertions passed.
199. [DONE] `phase8.stream27.task3` Wait for explicit user confirmation before building the next replacement release after questionnaire fallback fixes (scope: release confirmation gate; no commit expected). Result: user explicitly requested a new release build on 2026-05-23.

### Stream: Release Build — Workflow Clear Read Model Resync
200. [DONE] `phase8.stream28.task1` Update release-facing docs for the v1.2.334 workflow Clear read-model resync build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow clear read model release`).
201. [DONE] Git Commit: `docs: prepare workflow clear read model release` (hash: ca690e283)
202. [DONE] `phase8.stream28.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.334 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build workflow clear read model release`).
203. [DONE] Git Commit: `chore: build workflow clear read model release` (hash: 25410019f)
204. [DONE] `phase8.stream28.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package workflow clear read model vsix`).
205. [DONE] Git Commit: `chore: package workflow clear read model vsix` (hash: f07ae9cf4)
206. [BLOCKED] `phase8.stream28.task4` User installs the generated v1.2.334 VSIX and verifies clearing Description returns Project Manager to the editable questionnaire, removes stale sidebar indicators and does not show missing downstream artifacts (scope: user workflow acceptance; no commit expected). Blocked: user retest showed Project Manager immediately renders `questionnaire.md` as text after Clear and only switches to the editable questionnaire after an Artifacts/Help refresh.

### Stream: Workflow Clear Immediate Questionnaire Editor
207. [DONE] `phase8.stream29.task1` Make Project Manager treat a questionnaire-only Description snapshot after Clear as a hard session downgrade so the editable questionnaire opens immediately without a manual header refresh (scope: `src/client/project-manager/components/layout/use-main-area-workflow-state.ts, src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: show questionnaire editor after workflow clear`).
208. [DONE] Git Commit: `fix: show questionnaire editor after workflow clear` (hash: dbaea9732)
209. [DONE] `phase8.stream29.task2` Run targeted Project Manager validation for immediate questionnaire editor restoration after workflow Clear (scope: `src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: source regression test, `npm run typecheck:webview`, `npm run build:webview`, `npm run build:project-manager` and `npm run plan:validate` passed.
210. [DONE] `phase8.stream29.task3` Wait for explicit user confirmation before building the next replacement release after immediate questionnaire editor restoration (scope: release confirmation gate; no commit expected). Result: user explicitly requested a new release build on 2026-05-23.

### Stream: Release Build — Immediate Questionnaire Editor
211. [DONE] `phase8.stream30.task1` Update release-facing docs for the v1.2.335 immediate questionnaire editor build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare immediate questionnaire editor release`).
212. [DONE] Git Commit: `docs: prepare immediate questionnaire editor release` (hash: b97c9b7cb)
213. [DONE] `phase8.stream30.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.335 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build immediate questionnaire editor release`).
214. [DONE] Git Commit: `chore: build immediate questionnaire editor release` (hash: a113af0bb)
215. [DONE] `phase8.stream30.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package immediate questionnaire editor vsix`).
216. [DONE] Git Commit: `chore: package immediate questionnaire editor vsix` (hash: 7bae26102)
217. [BLOCKED] `phase8.stream30.task4` User installs the generated v1.2.335 VSIX and verifies clearing Description immediately returns the right panel to the editable questionnaire without manual refresh (scope: user workflow acceptance; no commit expected). Blocked: user retest reached Diagram Modules acceptance, but Core blocked completion on internal workflow undo/checkpoint files (`workflow/checkpoints/description.json`, `workflow/undo-ledger.json`) instead of treating them as Core runtime metadata.

### Stream: Workflow Undo Metadata Dirty Gate
218. [DONE] `phase8.stream31.task1` Classify workflow undo ledger and checkpoint files as Core-owned runtime metadata in the managed terminal acceptance gate so Diagram Modules acceptance does not ask the user to handle internal undo files (scope: `packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: ignore workflow undo metadata in managed gate`).
219. [DONE] Git Commit: `fix: ignore workflow undo metadata in managed gate` (hash: d6c6fe34f)
220. [DONE] `phase8.stream31.task2` Classify workflow undo ledger and checkpoint files as volatile Core metadata in the technical-stage dirty read model so left sidebar/progress does not mark workflow stages dirty after restart (scope: `packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.ts, packages/core/src/remote-bridge/handlers/technical-stage-dirty-gate.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: ignore workflow undo metadata in technical gate`).
221. [DONE] Git Commit: `fix: ignore workflow undo metadata in technical gate` (hash: 8cc401923)
222. [DONE] `phase8.stream31.task3` Run targeted Core validation for dirty-gate classification and affected managed workflow acceptance behavior (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: managed terminal dirty classifier tests, technical-stage dirty gate tests, Diagram Modules review acceptance tests and `npm run build --workspace @codeai-hub/core` passed.
223. [DONE] `phase8.stream31.task4` Wait for explicit user confirmation before building the next replacement release after workflow undo metadata dirty-gate fix (scope: release confirmation gate; no commit expected). Result: user explicitly requested a new release build on 2026-05-23.

### Stream: Release Build — Workflow Undo Metadata Dirty Gate
224. [DONE] `phase8.stream32.task1` Update release-facing docs for the v1.2.336 workflow undo metadata dirty-gate build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow undo metadata gate release`).
225. [DONE] Git Commit: `docs: prepare workflow undo metadata gate release` (hash: 088e9e535)
226. [DONE] `phase8.stream32.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.336 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build workflow undo metadata gate release`).
227. [DONE] Git Commit: `chore: build workflow undo metadata gate release` (hash: f278cee00)
228. [DONE] `phase8.stream32.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package workflow undo metadata gate vsix`).
229. [DONE] Git Commit: `chore: package workflow undo metadata gate vsix` (hash: 8b8d693ec)
230. [BLOCKED] `phase8.stream32.task4` User installs the generated v1.2.336 VSIX and verifies Diagram Modules acceptance is not blocked by workflow checkpoint/undo metadata (scope: user workflow acceptance; no commit expected). Blocked: user retest reached Quality Gates research review and Core accepted a `quality-gates-research.md` file missing the canonical `# Quality Gates Research` heading, while Project Manager correctly showed a parser error.

### Stream: Quality Gates Research Heading Validation
231. [DONE] `phase8.stream33.task1` Enforce the canonical `# Quality Gates Research` markdown heading in the Core-owned Quality Gates research validator and add a regression test for localized/wrong headings (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-research-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-research-first-boundary.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: validate quality gates research heading`).
232. [DONE] Git Commit: `fix: validate quality gates research heading` (hash: 1faf930c3)
233. [DONE] `phase8.stream33.task2` Explain the new research heading diagnostic in the Core repair prompt so the agent repairs the markdown title instead of reaching user review with a PM-only parser error (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-research-first-boundary.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: explain quality gates research heading repair`).
234. [DONE] Git Commit: `fix: explain quality gates research heading repair` (hash: a4eb6cda1)
235. [DONE] `phase8.stream33.task3` Run targeted validation for Quality Gates research boundary, repair prompt behavior and Core build (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted Quality Gates validation passed: research-first boundary, Quality Gates validator/review-decision flow and @codeai-hub/core build all passed; wrong or localized research markdown headings now block Core user review with an agent repair prompt.
236. [DONE] `phase8.stream33.task4` Wait for explicit user confirmation before building the next replacement release after Quality Gates research heading validation (scope: release confirmation gate; no commit expected). Result: User explicitly requested a new release build for Quality Gates research heading validation on 2026-05-23.

### Stream: Release Build — Quality Gates Research Heading Validation
237. [DONE] `phase8.stream34.task1` Update release-facing docs for the v1.2.337 Quality Gates research heading validation build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates research heading release`).
238. [DONE] Git Commit: `docs: prepare quality gates research heading release` (hash: 797293562)
239. [DONE] `phase8.stream34.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.337 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build quality gates research heading release`).
240. [DONE] Git Commit: `chore: build quality gates research heading release` (hash: ff8ce953a)
241. [DONE] `phase8.stream34.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package quality gates research heading vsix`).
242. [DONE] Git Commit: `chore: package quality gates research heading vsix` (hash: b1dec780c)
243. [BLOCKED] `phase8.stream34.task4` User installs the generated v1.2.337 VSIX and verifies Quality Gates research artifacts missing `# Quality Gates Research` stay in Core repair instead of opening user review (scope: user workflow acceptance; no commit expected). Blocked: user retest showed workflow step Clear for Quality Gates leaves the workspace/read-model inconsistent; `application-skeleton-map.json` exists on disk, but a post-Clear mechanism reports it as not found and Git is left dirty.

### Stream: Git-Backed Workflow Clear From Diagram Modules
244. [DONE] `phase8.stream35.task1` Add a Core-owned Git-backed workflow rollback module that resolves the pre-stage commit boundary for `diagram_modules` and later workflow stages, restores tracked workspace state through Git and leaves the Git worktree clean after rollback (scope: `packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.ts, packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.test.ts, doc/TODO/todo-plan.md`; expected commit: `feat: add git backed workflow rollback`).
245. [DONE] Git Commit: `feat: add git backed workflow rollback` (hash: f022d5cff)
246. [DONE] `phase8.stream35.task2` Wire workflow step Clear to use Git-backed rollback for `diagram_modules`, `application_skeleton` and `quality_gates`, while keeping session/runtime cleanup separate from tracked workspace rollback (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: clear managed workflow stages through git`).
247. [DONE] Git Commit: `fix: clear managed workflow stages through git` (hash: 91077cc0d)
248. [DONE] `phase8.stream35.task3` Document the Git-backed Clear invariant for technical workflow stages in the architecture SSOT (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: define git backed workflow clear`).
249. [DONE] Git Commit: `docs: define git backed workflow clear` (hash: e3b2ece31)
250. [DONE] `phase8.stream35.task4` Fix the TypeScript managed-stage narrowing found by the Core build before validation can pass (scope: `packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.ts, doc/TODO/todo-plan.md`; expected commit: `fix: narrow managed git rollback stage`).
251. [DONE] Git Commit: `fix: narrow managed git rollback stage` (hash: b068f07f3)
252. [DONE] `phase8.stream35.task5` Run targeted validation for Git-backed workflow rollback, workflow Clear service, Quality Gates restart state and Core build (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted validation passed: Git rollback and workflow Clear tests 8/8, @codeai-hub/core build, and plan validation.
253. [DONE] `phase8.stream35.task6` Wait for explicit user confirmation before building the next replacement release after Git-backed workflow Clear fixes (scope: release confirmation gate; no commit expected). Result: User explicitly requested a new release build for Git-backed workflow Clear on 2026-05-23.

### Stream: Release Build — Git-Backed Workflow Clear
254. [DONE] `phase8.stream36.task1` Update release-facing docs for the v1.2.338 Git-backed workflow Clear build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare git backed workflow clear release`).
255. [DONE] Git Commit: `docs: prepare git backed workflow clear release` (hash: cd0703a1a)
256. [DONE] `phase8.stream36.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.338 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build git backed workflow clear release`).
257. [DONE] Git Commit: `chore: build git backed workflow clear release` (hash: dd4e97e03)
258. [DONE] `phase8.stream36.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package git backed workflow clear vsix`).
259. [DONE] Git Commit: `chore: package git backed workflow clear vsix` (hash: e75b5fbb0)
260. [BLOCKED] `phase8.stream36.task4` User installs the generated v1.2.338 VSIX and verifies managed workflow Clear from Diagram Modules onward uses Git rollback and preserves upstream artifacts/read-models (scope: user workflow acceptance; no commit expected). Blocked: user retest found that the Quality Gates Research first prompt must explicitly prioritize AI-agent-oriented gate tooling and end the research artifact with recommended tools to carry into the contract.

### Stream: Quality Gates Research Recommendation Prompt
261. [DONE] `phase8.stream37.task1` Strengthen the Quality Gates first research prompt to prioritize AI-agent-oriented gate tools and require final contract recommendations in the research artifact (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts, packages/core/src/templates/quality-gates-bundled-templates.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: strengthen quality gates research prompt`).
262. [DONE] Git Commit: `fix: strengthen quality gates research prompt` (hash: 80333deef)
263. [DONE] `phase8.stream37.task2` Run targeted validation for Quality Gates bundled prompt sync and Core build (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted validation passed: Quality Gates bundled prompt test 3/3, asset/bundle sync, @codeai-hub/core build, and plan validation.
264. [BLOCKED] `phase8.stream37.task3` Wait for explicit user confirmation before building the next replacement release after the Quality Gates research prompt fix (scope: release confirmation gate; no commit expected). Blocked: user added one more Quality Gates requirement before release: the 500-line microclass/source-file policy must become a mandatory executable gate.

### Stream: Quality Gates Mandatory Size Policy
265. [DONE] `phase8.stream38.task1` Require the Quality Gates prompt to carry the 500-line source/class policy into the research recommendations and contract integration scope (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `fix: require quality gates size policy prompt`).
266. [DONE] Git Commit: `fix: require quality gates size policy prompt` (hash: b9407d248)
267. [DONE] `phase8.stream38.task2` Add a Core validator policy that rejects integrated Quality Gates contracts without a required executable 500-line source/class gate (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-required-size-policy.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts, doc/TODO/todo-plan.md`; expected commit: `fix: validate quality gates size policy`).
268. [DONE] Git Commit: `fix: validate quality gates size policy` (hash: 3eb4f04bf)
269. [DONE] `phase8.stream38.task3` Cover the mandatory size policy in Quality Gates prompt and validator tests (scope: `packages/core/src/templates/quality-gates-bundled-templates.test.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates size policy`).
270. [DONE] Git Commit: `test: cover quality gates size policy` (hash: df1c9ff9a)
271. [DONE] `phase8.stream38.task4` Run targeted validation for Quality Gates prompt, validator, and Core build (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted validation passed: Quality Gates prompt and validator tests 11/11, @codeai-hub/core build, and plan validation.
272. [BLOCKED] `phase8.stream38.task5` Wait for explicit user confirmation before building the next replacement release after the mandatory Quality Gates size policy fix (scope: release confirmation gate; no commit expected). Blocked: user retest found Clear after Virtual Simulation still fails for managed Git-backed workflow stages.

### Stream: Git-Backed Clear Boundary Coverage
273. [DONE] `phase8.stream39.task1` Extend Git-backed Clear boundary and cleanup coverage for Diagram Modules materialized `development_tree` state and Application Skeleton generated product-parts residue (scope: `packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.ts, packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: cover diagram modules git clear boundary`).
274. [DONE] Git Commit: `fix: cover diagram modules git clear boundary` (hash: 99ee042b2)
275. [DONE] `phase8.stream39.task2` Cover the Core workflow Clear service path for Diagram Modules Git rollback from the Project Manager command surface (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover diagram modules clear service rollback`).
276. [DONE] Git Commit: `test: cover diagram modules clear service rollback` (hash: 1af801f16)
277. [DONE] `phase8.stream39.task3` Run targeted validation for Git rollback, workflow Clear service and Core build (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted validation passed: Git rollback and workflow Clear service tests 6/6, @codeai-hub/core build, and plan validation.
278. [BLOCKED] `phase8.stream39.task4` Wait for explicit user confirmation before building the next replacement release after Diagram Modules Clear boundary fix (scope: release confirmation gate; no commit expected). Blocked: user retest found Quality Gates contract Markdown with `# Quality Gates Contract` passed Core validation while Project Manager correctly requires `# Quality Gates Baseline`.

### Stream: Quality Gates Contract Heading Validation
279. [DONE] `phase8.stream40.task1` Require Core Quality Gates validation to reject contract Markdown that does not start with the exact `# Quality Gates Baseline` heading, matching the Project Manager artifact parser (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: require quality gates baseline heading`).
280. [DONE] Git Commit: `fix: require quality gates baseline heading` (hash: b68a8e80b)
281. [DONE] `phase8.stream40.task2` Update the Quality Gates repair prompt so agents repair the Markdown heading to `# Quality Gates Baseline` only, not the looser `# Quality Gates` form (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: repair quality gates baseline heading`).
282. [DONE] Git Commit: `fix: repair quality gates baseline heading` (hash: 151c73601)
283. [DONE] `phase8.stream40.task3` Run targeted validation for Quality Gates heading rejection, repair prompt guidance, Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted validation passed: Quality Gates heading/research/stage-plan tests 14/14, @codeai-hub/core build, and plan validation.
284. [DONE] `phase8.stream40.task4` Wait for explicit user confirmation before building the next replacement release after Quality Gates contract heading validation (scope: release confirmation gate; no commit expected). Result: user explicitly requested a new release build on 2026-05-24.

### Stream: Release Build — Quality Gates Baseline Validation
285. [DONE] `phase8.stream41.task1` Update release-facing docs for the v1.2.339 Quality Gates baseline validation build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates baseline validation release`).
286. [DONE] Git Commit: `docs: prepare quality gates baseline validation release` (hash: c78fef0e9)
287. [DONE] `phase8.stream41.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.339 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build quality gates baseline validation release`). Result: `./scripts/build-all.sh --allow-dirty` completed successfully for v1.2.339; provider/core/UI/launcher tarballs were created under `doc/tmp/releases/`.
288. [DONE] Git Commit: `chore: build quality gates baseline validation release` (hash: 42057ccfe)
289. [DONE] `phase8.stream41.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package quality gates baseline validation vsix`). Result: VSIX `codeai-hub-1.2.339.vsix` built successfully at 4.7M; SHA256 `84f9e910228b773552a396ca6778d95903b7809a15598497fe2b964df2c3f8d7`; SDK exclusions, local artefact validation, markdown links, duplication check and VSIX runtime package surface checks passed.
290. [DONE] Git Commit: `chore: package quality gates baseline validation vsix` (hash: 0a004b133)
291. [BLOCKED] `phase8.stream41.task4` User installs the generated v1.2.339 VSIX and verifies Quality Gates contract heading validation, repair prompt behavior, and managed Clear boundary coverage (scope: user workflow acceptance; no commit expected). Blocked: user retest found that after clearing Description, rerunning it, and opening Virtual Simulation, Project Manager loses the Description session/provider projection and falls back to Claude/Opus instead of Codex/Spark even though Core continuity has the new Description chain.

### Stream: Description Clear Restart Provider Projection
292. [DONE] `phase8.stream42.task1` Make Virtual Simulation provider preselection inherit from the latest Description continuity chain when `description.primarySession` is absent after Clear/restart (scope: `src/client/project-manager/services/workflow-provider-resolver.ts, src/client/project-manager/services/workflow-provider-resolver.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: inherit description provider from continuity`).
293. [DONE] Git Commit: `fix: inherit description provider from continuity` (hash: d357b2330)
294. [DONE] `phase8.stream42.task2` Restore Description session navigation intent from the latest Description continuity chain when `description.primarySession` is absent (scope: `src/client/project-manager/components/shared/stage-confirmation-card-workflow.ts, src/client/project-manager/components/shared/stage-confirmation-card.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: restore description session from continuity`).
295. [DONE] Git Commit: `fix: restore description session from continuity` (hash: bea230644)
296. [DONE] `phase8.stream42.task3` Restore Description sidebar tree projection from the latest Description continuity chain when `description.primarySession` is absent (scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts, src/client/project-manager/components/shared/stage-confirmation-card.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: restore description tree session from continuity`).
297. [DONE] Git Commit: `fix: restore description tree session from continuity` (hash: 4ad8b42a3)
298. [DONE] `phase8.stream42.task4` Run targeted Project Manager tests, webview typecheck/build and plan validation for Description Clear restart provider/session projection (scope: `src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: targeted Project Manager workflow/provider tests passed; `npm run typecheck:webview`, `npm run build:webview`, `npm run build:project-manager`, and `npm run plan:validate` passed.
299. [DONE] `phase8.stream42.task5` Wait for explicit user confirmation before building the next replacement release after Description Clear restart projection fix (scope: release confirmation gate; no commit expected). Result: user explicitly requested a new release build on 2026-05-24

### Stream: Release Build — Description Clear Restart Projection
300. [DONE] `phase8.stream43.task1` Update release-facing docs for the v1.2.340 Description Clear restart projection build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare description restart projection release`).
301. [DONE] Git Commit: `docs: prepare description restart projection release` (hash: 199189796)
302. [DONE] `phase8.stream43.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.340 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build description restart projection release`). Result: `./scripts/build-all.sh --allow-dirty` completed v1.2.340; provider, Core, CEF launcher, vscode-webview and project-manager tarball artifacts were created under `doc/tmp/releases/`.
303. [DONE] Git Commit: `chore: build description restart projection release` (hash: cff27fe5d)
304. [DONE] `phase8.stream43.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package description restart projection vsix`). Result: VSIX `codeai-hub-1.2.340.vsix` built successfully at 4.7M; SHA256 `bf76160c8bbcfe1f14536b1789aefbf23002ba9cb6a054d74465d7f5db4b5cda`; SDK exclusions, local artefact validation, markdown links, duplication check and VSIX runtime package surface checks passed.
305. [DONE] Git Commit: `chore: package description restart projection vsix` (hash: 487f63c0e)
306. [BLOCKED] `phase8.stream43.task4` User installs the generated v1.2.340 VSIX and verifies Description Clear restart preserves Description session projection and Virtual Simulation provider/model inheritance (scope: user workflow acceptance; no commit expected). Blocked: user retest found Quality Gates initial prompt still targets `quality-gates.md`, so the agent skips the mandatory `quality-gates-research.md` first artifact and Core repeatedly rejects repairs.

### Stream: Quality Gates Research-First Prompt Contract
307. [DONE] `phase8.stream44.task1` Make the initial Quality Gates prompt pack target the research artifact instead of the contract artifact, and verify the prompt no longer instructs initial `quality-gates.md` creation (scope: `packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.ts, packages/core/src/remote-bridge/handlers/workflow-prompt-pack-service.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: target quality gates research first`).
308. [DONE] Git Commit: `fix: target quality gates research first` (hash: 56a856137)
309. [DONE] `phase8.stream44.task2` Add explicit inline Markdown and JSON skeletons for Quality Gates research and contract phases to the bundled agent prompt source (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `fix: embed quality gates research templates`).
310. [DONE] Git Commit: `fix: embed quality gates research templates` (hash: 6c933d44d)
311. [DONE] `phase8.stream44.task3` Add bundled prompt regression coverage for the exact research heading, research JSON skeleton, contract heading, and phase separation (scope: `packages/core/src/templates/quality-gates-bundled-templates.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates research templates`).
312. [DONE] Git Commit: `test: cover quality gates research templates` (hash: 073775c98)
313. [DONE] `phase8.stream44.task4` Tighten Quality Gates repair prompts and stage plan wording so research-phase repairs target only research artifacts and never ask for contract artifacts before research user acceptance (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-research-first-boundary.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: scope quality gates research repairs`).
314. [DONE] Git Commit: `fix: scope quality gates research repairs` (hash: ffe7f8af4)
315. [DONE] `phase8.stream44.task5` Align Quality Gates stage-plan wording with the research-only first pass without changing managed state semantics (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model.ts, doc/TODO/todo-plan.md`; expected commit: `fix: describe quality gates research task`).
316. [DONE] Git Commit: `fix: describe quality gates research task` (hash: 6507f477b)
317. [DONE] `phase8.stream44.task6` Run targeted Core prompt/Quality Gates tests, Core build, webview build, and plan validation for the research-first prompt fix (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: targeted Quality Gates prompt/repair tests, Core build, webview build, and plan validation passed
318. [DONE] `phase8.stream44.task7` Update release-facing docs for the v1.2.341 Quality Gates research-first prompt build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates research prompt release`).
319. [DONE] Git Commit: `docs: prepare quality gates research prompt release` (hash: 28158e795)
320. [DONE] `phase8.stream44.task8` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.341 tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build quality gates research prompt release`). Result: `./scripts/build-all.sh --allow-dirty` completed successfully for v1.2.341; provider/core/UI/launcher tarballs were created under `doc/tmp/releases/`.
321. [DONE] Git Commit: `chore: build quality gates research prompt release` (hash: bcd2fff70)
322. [DONE] `phase8.stream44.task9` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package quality gates research prompt vsix`). Result: `codeai-hub-1.2.341.vsix` built successfully at 4.7M; SHA-256 `2d77f537f4d2bafac601915d311fd4afa2e5fefd7778390c2167e45a563ca50f`; SDK exclusions and runtime package surface checks passed.
323. [DONE] Git Commit: `chore: package quality gates research prompt vsix` (hash: 2b69e165d)
324. [BLOCKED] `phase8.stream44.task10` User installs the generated v1.2.341 VSIX and verifies Quality Gates starts with valid `# Quality Gates Research` artifacts before contract drafting (scope: user workflow acceptance; no commit expected). Blocked: user retest confirmed the research artifact shape is now correct, but `quality-gates-research.md` content is written in English instead of the user-facing chat language.

### Stream: Quality Gates Research Artifact Localization
325. [DONE] `phase8.stream45.task1` Add an explicit Quality Gates prompt requirement that `quality-gates-research.md` user-facing prose is written in the same language the agent uses with the user, while JSON field names and stable identifiers remain canonical (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `fix: localize quality gates research artifact`).
326. [DONE] Git Commit: `fix: localize quality gates research artifact` (hash: 365a0e212)
327. [DONE] `phase8.stream45.task2` Add bundled prompt regression coverage for the research artifact language rule (scope: `packages/core/src/templates/quality-gates-bundled-templates.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates research artifact language`).
328. [DONE] Git Commit: `test: cover quality gates research artifact language` (hash: 1ec5f98c6)
329. [DONE] `phase8.stream45.task3` Run targeted Quality Gates prompt/template tests and Core plan validation after the localization prompt fix (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Quality Gates bundled prompt and workflow prompt-pack tests passed; plan validation passed
330. [BLOCKED] `phase8.stream45.task4` Prepare release-facing docs and build a replacement VSIX only after explicit release build confirmation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md, package versions, release artifacts`; expected commit: pending confirmation). Blocked: user retest found the Quality Gates contract repair prompt let the agent convert planned required gates into advisory/non-blocking gates and touch research artifacts during contract repair.

### Stream: Quality Gates Planned Required Contract Repair
331. [DONE] `phase8.stream46.task1` Enforce planned required gate semantics in Core validation and repair prompts so `plannedRequiredAfterIntegration` gates remain active, integration-required, and contract-only repairs target only contract artifacts (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-planned-required-validator.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts, doc/TODO/todo-plan.md`; expected commit: `fix: enforce quality gates planned required semantics`).
332. [DONE] Git Commit: `fix: enforce quality gates planned required semantics` (hash: 59ed559d7)
333. [DONE] `phase8.stream46.task2` Tighten the bundled Quality Gates contract template so draft contracts cannot describe planned required gates as advisory/non-blocking before integration (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `fix: clarify quality gates draft contract template`).
334. [DONE] Git Commit: `fix: clarify quality gates draft contract template` (hash: 81cb88619)
335. [DONE] `phase8.stream46.task3` Add regression tests for planned required gate validation, contract-only repair targets, and bundled prompt wording (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-planned-required-validator.test.ts, packages/core/src/templates/quality-gates-bundled-templates.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates planned required repair`).
336. [DONE] Git Commit: `test: cover quality gates planned required repair` (hash: f72705098)
337. [DONE] `phase8.stream46.task4` Run targeted Quality Gates tests, Core build, webview build, and plan validation after the planned-required fix (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: 18 targeted Quality Gates/prompt tests passed; Core build, webview build, and plan validation passed
338. [DONE] `phase8.stream46.task5` Update release-facing docs for the replacement Quality Gates planned-required build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates planned required release`).
339. [DONE] Git Commit: `docs: prepare quality gates planned required release` (hash: e14c8d2bd)
340. [DONE] `phase8.stream46.task6` Run `./scripts/build-all.sh --allow-dirty`, verify next-version tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build quality gates planned required release`). Result: v1.2.342 provider/core/UI/launcher tarballs were created under `doc/tmp/releases/`.
341. [DONE] Git Commit: `chore: build quality gates planned required release` (hash: 15b98823d)
342. [DONE] `phase8.stream46.task7` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package quality gates planned required vsix`). Result: `codeai-hub-1.2.342.vsix` built successfully at 4.7M; SHA-256 `751f1747eb192affbfe340fcc73caa1b684c7ce2a9280c9cb571d55f6d88da92`; SDK exclusions, local artefact validation, markdown links, duplication check and package surface checks passed.
343. [DONE] Git Commit: `chore: package quality gates planned required vsix` (hash: 4bee77e91)
344. [BLOCKED] `phase8.stream46.task8` User installs the generated replacement VSIX and verifies Quality Gates contract drafting keeps planned required gates active/integration-required and contract repairs do not touch research artifacts (scope: user workflow acceptance; no commit expected). Blocked: user retest found repeated Quality Gates integration repairs with opaque `missing_required_size_policy_gate` diagnostics; Core recognizes the required 500-line size policy through implicit searchable text instead of a structured policy contract.

### Stream: Quality Gates Structured Size Policy Repair
345. [DONE] `phase8.stream47.task1` Add a structured Quality Gates size policy contract and explicit repair diagnostics so the agent can satisfy `missing_required_size_policy_gate` without guessing aliases or filenames (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-required-size-policy.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-prompt-builder.ts, doc/TODO/todo-plan.md`; expected commit: `fix: structure quality gates size policy contract`).
346. [DONE] Git Commit: `fix: structure quality gates size policy contract` (hash: 2d91c6f24)
347. [DONE] `phase8.stream47.task2` Update the Quality Gates bundled prompt template so draft/integration agents create explicit `policy.type: "source_size_limit"`, `maxLines: 500`, and `appliesTo` metadata for the mandatory size gate (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `fix: document quality gates size policy template`).
348. [DONE] Git Commit: `fix: document quality gates size policy template` (hash: 2a3cdc614)
349. [DONE] `phase8.stream47.task3` Add regression coverage for structured size policy validation, explanatory repair prompts, and bundled prompt wording (scope: `packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-required-size-policy.test.ts, packages/core/src/templates/quality-gates-bundled-templates.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover quality gates size policy diagnostics`).
350. [DONE] Git Commit: `test: cover quality gates size policy diagnostics` (hash: 474e677ad)
351. [DONE] `phase8.stream47.task4` Run targeted Quality Gates tests, Core build, webview build, and plan validation after the structured size policy fix (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: 17 targeted Quality Gates/prompt tests passed; Core build, webview build, and plan validation passed
### Stream: Managed Workflow Clear Availability
352. [DONE] `phase8.stream48.task1` Restore Clear command availability for managed workflow steps starting with Diagram Modules, preserving Core-owned clear/undo semantics and Project Manager as UI-only caller (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: restore managed workflow clear availability`).
353. [DONE] Git Commit: `fix: restore managed workflow clear availability` (hash: d69205235)
354. [DONE] `phase8.stream48.task2` Run targeted Clear availability validation plus affected Core/Project Manager builds after the managed workflow Clear fix (scope: affected package tests/builds, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: 11 targeted Clear tests passed; Core build, webview typecheck, webview build, Project Manager build, and plan validation passed

### Stream: Release Build — Quality Gates Size Policy And Clear Availability
355. [DONE] `phase8.stream47.task5` Update release-facing docs for the replacement Quality Gates structured size policy and managed Clear availability build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates size policy release`).
356. [DONE] Git Commit: `docs: prepare quality gates size policy release` (hash: 216181341)
357. [DONE] `phase8.stream47.task6` Run `./scripts/build-all.sh --allow-dirty`, verify next-version tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build quality gates size policy release`). Result: v1.2.343 tarballs created under `doc/tmp/releases/` for providers, Core, launcher, VS Code webview, and Project Manager.
358. [DONE] Git Commit: `chore: build quality gates size policy release` (hash: 15ce41ff4)
359. [DONE] `phase8.stream47.task7` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package quality gates size policy vsix`). Result: `codeai-hub-1.2.343.vsix` created at 4.7M; SHA-256 `2709ad7d2d5ad156fb618b492693a7cf428fc5a10ef1151a3afd56723daa89ba`.
360. [DONE] Git Commit: `chore: package quality gates size policy vsix` (hash: c925a55df)
361. [BLOCKED] `phase8.stream47.task8` User installs the generated replacement VSIX and verifies Quality Gates integration no longer loops on `missing_required_size_policy_gate` and Clear works from Diagram Modules onward (scope: user workflow acceptance; no commit expected). Result: user acceptance found that Clear works, but Core leaves cleared/downstream managed workflow steps green in the left sidebar.

### Stream: Managed Clear Stage Marker Reset
362. [DONE] `phase8.stream49.task1` Reset Core-owned managed workflow completion/unlock markers for the cleared workflow stage and every downstream managed stage so Project Manager receives grey/todo statuses from the workflow snapshot after Clear (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear*, doc/TODO/todo-plan.md`; expected commit: `fix: reset managed clear stage markers`).
363. [DONE] Git Commit: `fix: reset managed clear stage markers` (hash: 7c08427e2)
364. [DONE] `phase8.stream49.task2` Run targeted Clear status reset tests plus affected Core/Project Manager builds after the managed marker reset fix (scope: affected package tests/builds, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: 11 targeted Clear tests passed; Core build, webview typecheck, webview build, Project Manager build, and plan validation passed
365. [DONE] `phase8.stream49.task3` User confirms whether to build a replacement release after the Clear marker reset fix (scope: release confirmation gate; no commit expected). Result: User requested a replacement release build for Clear marker reset verification

### Stream: Release Build — Clear Marker Reset
366. [DONE] `phase8.stream50.task1` Update release-facing docs for the Clear marker reset replacement build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare clear marker reset release`).
367. [DONE] Git Commit: `docs: prepare clear marker reset release` (hash: 999c92a63)
368. [DONE] `phase8.stream50.task2` Run `./scripts/build-all.sh --allow-dirty`, verify next-version tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build clear marker reset release`). Result: v1.2.344 tarballs created under `doc/tmp/releases/` for providers, Core, launcher, VS Code webview, and Project Manager.
369. [DONE] Git Commit: `chore: build clear marker reset release` (hash: 69b718042)
370. [DONE] `phase8.stream50.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package clear marker reset vsix`). Result: `codeai-hub-1.2.344.vsix` created at 4.7M; SHA-256 `6cc5b5099bf7562c5be6cd194a4e07e3e22348a8f72fdd35f580357b8d5c0fe7`.
371. [DONE] Git Commit: `chore: package clear marker reset vsix` (hash: be29fd801)
372. [BLOCKED] `phase8.stream50.task4` User installs the generated replacement VSIX and verifies Clear resets cleared/downstream left-sidebar markers to grey (scope: user workflow acceptance; no commit expected). Result: marker reset works in v1.2.344 so far, but user acceptance found cluster-owned workflow nodes need to render before module nodes in the Development Tree.

### Stream: Cluster Workflow Node Ordering
373. [DONE] `phase8.stream51.task1` Project cluster-owned workflow operation nodes from Core snapshots so the cluster has its own first steps before modules (scope: `packages/core/src/development-tree/development-tree-types.ts, packages/core/src/development-tree/development-tree-operation-nodes.ts, packages/core/src/development-tree/development-tree-state-facade.ts`; expected commit: `feat: project cluster workflow operations`).
374. [DONE] Git Commit: `feat: project cluster workflow operations` (hash: ae823ca49)
375. [DONE] `phase8.stream51.task2` Parse and place cluster workflow operation nodes before module nodes in Project Manager without changing existing tree styling (scope: `src/client/project-manager/services/workflow-state-development-tree-client.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`; expected commit: `fix: place cluster workflow before modules`).
376. [DONE] Git Commit: `fix: place cluster workflow before modules` (hash: f2651cafe)
377. [DONE] `phase8.stream51.task3` Add regression coverage for cluster operation parsing and ordering before modules (scope: `src/client/project-manager/services/workflow-state-client.test.ts, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes-progress.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover cluster workflow ordering`).
378. [DONE] Git Commit: `test: cover cluster workflow ordering` (hash: 0205eca61)
379. [DONE] `phase8.stream51.task4` Run targeted Core/Project Manager tests and builds for cluster workflow node ordering (scope: `packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: targeted Project Manager parser/tree tests passed; Core build, webview typecheck, Project Manager build, and plan validation passed.
380. [DONE] `phase8.stream51.task5` User confirms whether to build a replacement release after cluster workflow node ordering is verified (scope: release confirmation gate; no commit expected). Result: User requested a replacement release build on 2026-05-24 after cluster workflow node ordering verification.

### Stream: Release Build — Cluster Workflow Node Ordering
381. [DONE] `phase8.stream52.task1` Update release-facing docs for the v1.2.345 cluster workflow node ordering build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare cluster workflow ordering release`).
382. [DONE] Git Commit: `docs: prepare cluster workflow ordering release` (hash: 567e4d42f)
383. [DONE] `phase8.stream52.task2` Run `./scripts/build-all.sh --allow-dirty`, verify next-version tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build cluster workflow ordering release`). Result: `./scripts/build-all.sh --allow-dirty` completed successfully for v1.2.345; provider/core/UI/launcher tarballs were created under `doc/tmp/releases/`.
384. [DONE] Git Commit: `chore: build cluster workflow ordering release` (hash: ae984c081)
385. [DONE] `phase8.stream52.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package cluster workflow ordering vsix`). Result: `codeai-hub-1.2.345.vsix` built successfully at 4.7M; SHA-256 `423ce269601995ae5e7ba89a376c20bc2dd892be17ccb3a58e08432a69ca7171`; SDK exclusions, local artefact validation, markdown links, duplication check and VSIX runtime package surface checks passed.
386. [DONE] Git Commit: `chore: package cluster workflow ordering vsix` (hash: a0a9c3d60)
387. [BLOCKED] `phase8.stream52.task4` User installs the generated v1.2.345 VSIX and verifies cluster workflow nodes render before module nodes while preserving existing tree lines and styling (scope: user workflow acceptance; no commit expected). Blocked: user retest found clearing Quality Gates can leave tracked Quality Gates artifacts deleted in Git status instead of creating a Git rollback commit, which then blocks restart with a misleading `application-skeleton-map.json not found` message.

### Stream: Managed Clear Git Rollback Enforcement
388. [DONE] `phase8.stream53.task1` Stop managed workflow Clear from falling back to path deletion when a Git-managed rollback boundary is missing for Diagram Modules, Application Skeleton, or Quality Gates (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: require git rollback for managed clear`).
389. [DONE] Git Commit: `fix: require git rollback for managed clear` (hash: a12247cad)
390. [DONE] `phase8.stream53.task2` Run targeted managed Clear rollback tests plus Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted managed Clear rollback tests, Core build, and plan validation passed.
391. [DONE] `phase8.stream53.task3` Build replacement release after managed Clear rollback enforcement (scope: release confirmation already provided by user; expected commit: no commit expected). Result: release work split into the v1.2.346 replacement build stream.

### Stream: Release Build — Managed Clear Git Rollback Enforcement
392. [DONE] `phase8.stream54.task1` Update release-facing docs for the v1.2.346 managed Clear rollback enforcement build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed clear rollback release`).
393. [DONE] Git Commit: `docs: prepare managed clear rollback release` (hash: 421557f59)
394. [DONE] `phase8.stream54.task2` Run `./scripts/build-all.sh --allow-dirty`, verify next-version tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build managed clear rollback release`). Result: `./scripts/build-all.sh --allow-dirty` completed successfully for v1.2.346; provider/core/UI/launcher tarballs were created under `doc/tmp/releases/`.
395. [DONE] Git Commit: `chore: build managed clear rollback release` (hash: bcd148e18)
396. [DONE] `phase8.stream54.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output and record release artifacts (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: package managed clear rollback vsix`). Result: `codeai-hub-1.2.346.vsix` built successfully at 4.7M; SHA-256 `4ee08f05f3a6fcdda08088a6c587f081c395000fae69bb6980277f66b77945e4`; SDK exclusions, local artefact validation, markdown links, duplication check and VSIX runtime package surface checks passed.
397. [DONE] Git Commit: `chore: package managed clear rollback vsix` (hash: e4ff233e1)
398. [BLOCKED] `phase8.stream54.task4` User installs the generated v1.2.346 VSIX and verifies managed Clear on Quality Gates does not delete tracked stage files when Git rollback boundary is missing (scope: user workflow acceptance; no commit expected). Blocked: user testing found Application Skeleton still delegates deterministic npm/TypeScript materialization mechanics to the provider agent, causing repeated repair attempts around `npm ci`, lockfile bootstrap, and devDependency installation.

### Stream: Core-Owned Application Skeleton Materializer
399. [DONE] `phase8.stream55.task1` Add a Core-owned Application Skeleton scaffold materializer and call it after draft acceptance instead of dispatching npm/TypeScript materialization to the provider agent (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, doc/TODO/todo-plan.md`; expected commit: `feat: materialize application skeleton in core`).
400. [DONE] Git Commit: `feat: materialize application skeleton in core` (hash: ece411cf5)
401. [DONE] `phase8.stream55.task2` Align Core runtime materialization prompt, gitignore output, and validator expectations with Core-owned bootstrap mechanics so agents only draft/revise contracts, not npm scaffold execution (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: clarify core-owned application skeleton materialization`).
402. [DONE] Git Commit: `fix: clarify core-owned application skeleton materialization` (hash: cb08f1b38)
403. [DONE] `phase8.stream55.task3` Sync the bundled Application Skeleton agent prompt and contract reference with the Core-owned materialization boundary (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md, packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md, packages/core/src/templates/bundled-templates.ts, packages/core/src/templates/application-skeleton-bundled-templates.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: sync core-owned application skeleton agent prompt`).
404. [DONE] Git Commit: `fix: sync core-owned application skeleton agent prompt` (hash: 4e5ff1747)
405. [DONE] `phase8.stream55.task4` Add targeted regression coverage for Core-owned Application Skeleton materialization after user acceptance (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover core application skeleton materializer`).
406. [DONE] Git Commit: `test: cover core application skeleton materializer` (hash: 908dfc547)
407. [DONE] `phase8.stream55.task5` Run targeted Application Skeleton materializer tests plus Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted Application Skeleton materializer tests passed (14 node:test subtests), packages/core build passed, and plan validation passed.

### Stream: Workflow Clear Git Undo Repair
408. [DONE] `phase8.stream56.task1` Diagnose and repair Core-owned workflow Clear so Diagram Modules and downstream managed stages execute Git rollback/path cleanup and reset workflow state from Core truth (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts`; expected commit: `fix: repair workflow clear git rollback`).
409. [DONE] Git Commit: `fix: repair workflow clear git rollback` (hash: 12769d4eb)
410. [DONE] `phase8.stream56.task2` Repair downstream workspace/session cleanup coverage for Virtual Simulation clearing after generated downstream steps (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service*.test.ts, packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.ts`; expected commit: `fix: restore workflow clear undo cleanup`).
411. [DONE] Git Commit: `fix: restore workflow clear undo cleanup` (hash: 53bdd8f8f)
412. [DONE] `phase8.stream56.task3` Run targeted Clear/Undo tests plus Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Clear/Undo targeted tests, Core build, and plan validation passed

### Stream: Release Build v1.2.347
413. [DONE] `phase8.stream57.task1` Prepare release notes for the Clear/Undo repair release before version bump (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.347`).
414. [DONE] Git Commit: `docs: prepare release 1.2.347` (hash: d852c603c)
415. [DONE] `phase8.stream57.task2` Run `./scripts/build-all.sh` for v1.2.347 and commit generated package version/release artifact changes (scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/TODO/todo-plan.md`; expected commit: `chore: build release 1.2.347 artifacts`).
416. [DONE] Git Commit: `chore: build release 1.2.347 artifacts` (hash: db8621895)
417. [DONE] `phase8.stream57.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and leave scope active for user workflow acceptance (scope: release packaging output, `doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Release build v1.2.347 completed: build-all and build-release passed, VSIX codeai-hub-1.2.347.vsix created at 4.7M

### Stream: Application Skeleton Materialization Config Alignment
418. [DONE] `phase8.stream58.task1` Align Core-owned Application Skeleton materializer output with validator config-file contract so accepted materialization cannot write a materialized summary and then reject itself for missing root `tsconfig.json` (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-core-materializer.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: align application skeleton materializer config files`).
419. [DONE] Git Commit: `fix: align application skeleton materializer config files` (hash: 4713ad9f4)
420. [DONE] `phase8.stream58.task2` Run targeted Application Skeleton materializer/validator tests plus Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Application Skeleton materializer/validator tests and @codeai-hub/core build passed after root tsconfig alignment

### Stream: Release Build — Application Skeleton Materializer Alignment
421. [DONE] `phase8.stream59.task1` Update release-facing docs for the v1.2.348 Application Skeleton materializer alignment build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton materializer release`).
422. [DONE] Git Commit: `docs: prepare application skeleton materializer release` (hash: ec92aafe5)
423. [BLOCKED] `phase8.stream59.task2` Run `./scripts/build-all.sh`, verify next-version tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build application skeleton materializer release`). Blocked: user intentionally interrupted the v1.2.348 build and requested a new release number instead of reusing the partial build.
424. [TODO] Git Commit: `chore: build application skeleton materializer release` (hash: TBD)
425. [TODO] `phase8.stream59.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and leave scope active for user workflow acceptance (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: no commit expected).

### Stream: Replacement Release Build — Application Skeleton Materializer Alignment
426. [DONE] `phase8.stream60.task1` Update release-facing docs for the v1.2.349 Application Skeleton materializer alignment rebuild after the interrupted v1.2.348 build (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: folded into `chore: build application skeleton materializer rerelease` because the interrupted v1.2.348 build already left version/manifest files dirty).
427. [DONE] Git Commit: `docs: prepare application skeleton materializer rerelease` (hash: folded into build commit)
428. [DONE] `phase8.stream60.task2` Run `./scripts/build-all.sh --allow-dirty`, verify v1.2.349 tarball output and record release artifacts (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build application skeleton materializer rerelease`).
429. [DONE] Git Commit: `chore: build application skeleton materializer rerelease` (hash: 3a420fde5)
430. [DONE] `phase8.stream60.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output, and leave scope active for user workflow acceptance (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Release build v1.2.349 completed: build-all and build-release passed, VSIX codeai-hub-1.2.349.vsix created at 4.7M

### Stream: Managed Clear State Isolation
431. [DONE] `phase8.stream61.task1` Separate Core-owned workflow last-active state from Diagram Modules subturn progress, keep managed Application Skeleton progress snapshots consistent after Core materialization/final review, and make managed Clear rollback robust for Diagram Modules/Application Skeleton restart (scope: `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts, packages/core/src/remote-bridge/handlers/diagram-modules-progress.test.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/managed-workflow-ledger-git-boundary.ts, packages/core/src/remote-bridge/handlers/application-skeleton-managed-decision-persister.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-stage-paths.ts, packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.ts, packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: separate workflow progress state and managed clear rollback`).
432. [DONE] Git Commit: `fix: separate workflow progress state and managed clear rollback` (hash: 109a1f240)
433. [DONE] `phase8.stream61.task2` Run targeted Clear/Application Skeleton state tests plus Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted Git rollback/Clear/Application Skeleton session action tests passed; @codeai-hub/core build, architecture check, and plan validation passed.

### Stream: Release Build — Managed Clear State Isolation
434. [DONE] `phase8.stream62.task1` Update release-facing docs for the v1.2.350 managed Clear state isolation build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed clear state isolation release`).
435. [DONE] Git Commit: `docs: prepare managed clear state isolation release` (hash: 6eaa375f3)
436. [DONE] `phase8.stream62.task2` Run `./scripts/build-all.sh --allow-dirty`, verify next-version tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build managed clear state isolation release`).
437. [DONE] Git Commit: `chore: build managed clear state isolation release` (hash: bab35bd3b)
438. [DONE] `phase8.stream62.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output, and leave scope active for user workflow acceptance (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Release 1.2.350 built: build-all and build-release completed, VSIX codeai-hub-1.2.350.vsix created

### Stream: Diagram Modules Clear Managed Scaffold Rollback
439. [DONE] `phase8.stream63.task1` Repair Diagram Modules Clear so Git rollback returns app-created workspaces to the post-Virtual-Simulation state, removing managed scaffold folders/files such as `.git`, `.husky`, `doc`, `scripts`, and root package files when Core created them for Diagram Modules (scope: `packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.ts, packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: clear diagram modules managed scaffold`).
440. [DONE] Git Commit: `fix: clear diagram modules managed scaffold` (hash: 55a15f0ff)
441. [DONE] `phase8.stream63.task2` Run targeted Git rollback tests plus Core build and plan validation for the Diagram Modules scaffold-clear fix (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted Git rollback regression tests passed; @codeai-hub/core build passed; plan validation passed

### Stream: Application Skeleton Markdown Validation Relaxation
442. [DONE] `phase8.stream64.task1` Relax Core Application Skeleton draft validation so Markdown prose wording cannot block user review when the machine-readable JSON contract is safe and complete; keep hard gates for stage identity, required sections, JSON lifecycle, paths, tree shape, and foundation fields (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-framework-baseline-validator.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: relax application skeleton markdown validation`).
443. [DONE] Git Commit: `fix: relax application skeleton markdown validation` (hash: cdefdc21a)
444. [DONE] `phase8.stream64.task2` Run targeted Application Skeleton validator tests plus Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted Application Skeleton validator tests passed; @codeai-hub/core build passed; plan validation passed

### Stream: Release Build — Managed Clear Scaffold Rollback
445. [DONE] `phase8.stream65.task1` Update release-facing docs for the v1.2.351 managed Clear scaffold rollback and Application Skeleton validation relaxation build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare managed clear scaffold release`).
446. [DONE] Git Commit: `docs: prepare managed clear scaffold release` (hash: fba500144)
447. [DONE] `phase8.stream65.task2` Run `./scripts/build-all.sh --allow-dirty`, verify next-version tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build managed clear scaffold release`).
448. [DONE] Git Commit: `chore: build managed clear scaffold release` (hash: dced3a3fd)
449. [DONE] `phase8.stream65.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output, and leave scope active for user workflow acceptance (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Release 1.2.351 built: build-all and build-release completed, VSIX codeai-hub-1.2.351.vsix created at 4.7M, SHA-256 bc2016bb231b3510d00d9ef3042b1c5460bc63e692a5b4c94a88d2df7d437db8

### Stream: Acceptance Remediation — Clear Last Active State
450. [DONE] `phase8.stream66.task1` Reset workflow `lastActive` after Clear so app-created workspaces rolled back from Diagram Modules point to the latest existing upstream artifact instead of a cleared future stage (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-last-active.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts`; expected commit: `fix: reset clear last active stage`).
451. [DONE] Git Commit: `fix: reset clear last active stage` (hash: 0c28e3184)
452. [DONE] `phase8.stream66.task2` Run targeted Clear last-active regression tests plus Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Clear Git rollback regression tests passed, including stale Diagram Modules `lastActive` reset to Virtual Simulation when Git metadata is absent; @codeai-hub/core build passed; plan validation passed.

### Stream: Release Build — Clear Last Active Reset
453. [DONE] `phase8.stream67.task1` Update release-facing docs for the v1.2.352 Clear last-active reset build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare clear last active release`).
454. [DONE] Git Commit: `docs: prepare clear last active release` (hash: d0d3559bf)
455. [DONE] `phase8.stream67.task2` Run `./scripts/build-all.sh --allow-dirty`, verify next-version tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build clear last active release`).
456. [DONE] Git Commit: `chore: build clear last active release` (hash: 1d258313d)
457. [DONE] `phase8.stream67.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output, and leave scope active for user workflow acceptance (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Release 1.2.352 built: build-all and build-release completed, VSIX codeai-hub-1.2.352.vsix created at 4.7M, SHA-256 62cb0c556dc6ffe018de828d39e23117b8cc7bd4c6ea04d06ed0aec2962c03b3

### Stream: Quality Gates Terminal Git Cleanliness
458. [DONE] `phase8.stream68.task1` Repair the Quality Gates terminal Git boundary so formatter/runtime residue from accepted upstream managed artifacts is handled by Core before completion instead of leaving a dirty workspace blocker (scope: `packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.ts, packages/core/src/managed-workflow-orchestration/managed-terminal-dirty-classifier.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: clean quality gates terminal residue`).
459. [DONE] Git Commit: `fix: clean quality gates terminal residue` (hash: 8ba228c2b)
460. [DONE] `phase8.stream68.task2` Run targeted managed terminal dirty-boundary validation plus Core build and plan validation (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Targeted managed terminal dirty-boundary validation passed: @codeai-hub/core build, managed-terminal-dirty-classifier regression test, and plan validation completed.

### Stream: Release Build — Quality Gates Terminal Residue
461. [DONE] `phase8.stream69.task1` Update release-facing docs for the v1.2.353 Quality Gates terminal residue build before build-all (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare quality gates terminal residue release`).
462. [DONE] Git Commit: `docs: prepare quality gates terminal residue release` (hash: b4ac86e4a)
463. [DONE] `phase8.stream69.task2` Run `./scripts/build-all.sh --allow-dirty`, verify next-version tarball output and record release artifacts (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: build quality gates terminal residue release`).
464. [DONE] Git Commit: `chore: build quality gates terminal residue release` (hash: 9c20fe86b)
465. [DONE] `phase8.stream69.task3` Run `./scripts/build-release.sh --use-current-version --allow-dirty`, verify VSIX output, and leave scope active for user workflow acceptance (scope: `codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: no commit expected). Result: Release 1.2.353 built: build-all and build-release completed, VSIX codeai-hub-1.2.353.vsix created at 4.7M, SHA-256 24f4a1f1683cd93a41ee832df4582602408186882f4a2d2d4066ae63d6cf6ab6.
466. [DONE] `phase8.stream69.task4` Record the completed v1.2.353 VSIX build result in the active plan before user workflow acceptance (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record quality gates terminal residue release`).
467. [DONE] Git Commit: `docs: record quality gates terminal residue release` (hash: 178fbaab8)

### Stream: Workflow Clear Git Boundary Architecture Reset
468. [DONE] `phase8.stream70.task1` Create the Core-owned Git boundary Clear architecture planning document and reopen the active scope after v1.2.353 Clear acceptance failed (scope: `doc/SolidWorks-WorkFlow/Plans/WorkflowClear_GitBoundaryRollback_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan git boundary clear architecture`).
469. [DONE] Git Commit: `docs: plan git boundary clear architecture` (hash: 867fe12df)
470. [DONE] `phase8.stream70.task2` Audit the legacy Clear/Undo implementation and split removal work into microtasks that preserve the Project Manager Clear button/menu contract (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: plan legacy clear undo cleanup`).
471. [DONE] Git Commit: `docs: plan legacy clear undo cleanup` (hash: a514ea094)
472. [DONE] `phase8.stream70.task3` Remove mutation-journal capture from session/message workflow write paths while preserving the normal write/session behavior (scope: `packages/core/src/remote-bridge/handlers/workspace-session-service.ts, packages/core/src/remote-bridge/handlers/http-api-session-routes.ts, packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `refactor: remove workflow mutation journal captures`).
473. [DONE] Git Commit: `refactor: remove workflow mutation journal captures` (hash: cff4d87fc)
474. [DONE] `phase8.stream70.task4` Remove undo-ledger recording from artifact upsert, workspace file write, and development-tree materialization paths (scope: `packages/core/src/remote-bridge/handlers/http-api-artifact-upsert-service.ts, packages/core/src/remote-bridge/handlers/workspace-file-service.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-structurator-facade.ts`; expected commit: `refactor: remove workflow undo ledger writes`).
475. [DONE] Git Commit: `refactor: remove workflow undo ledger writes` (hash: c944057c8)
476. [DONE] `phase8.stream70.task5` Replace the legacy Clear backend with an explicit unavailable Core response that keeps request validation and the Project Manager endpoint contract for the future Git-boundary implementation, and delete the helper modules that become `check:knip` unused in the same green intermediate (scope: `packages/core/src/remote-bridge/handlers, src/client/project-manager/services/workflow-step-clear-client.ts`; scope exception reason: the plan orchestrator stages deleted files through the handlers directory, and no green intermediate exists after backend replacement because `check:knip` immediately flags the newly unused helper modules; expected commit: `refactor: disable legacy workflow clear backend`).
477. [DONE] Git Commit: `refactor: disable legacy workflow clear backend` (hash: 75194e639)
482. [DONE] `phase8.stream70.task8` Delete obsolete Clear behavior tests that asserted checkpoint/undo/git-rollback fallback semantics (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-service.undo.test.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.checkpoint-cleanup.test.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.git-rollback.test.ts`; expected commit: `test: remove legacy clear rollback tests`).
483. [DONE] Git Commit: `test: remove legacy clear rollback tests` (hash: 13a6e68c1)
484. [DONE] `phase8.stream70.task9` Delete the workflow undo and step-checkpoint modules after all runtime imports are gone, and update the workspace-file write test so it asserts direct file writes instead of undo-ledger side effects (scope: `packages/core/src/workflow/undo, packages/core/src/workflow/step-checkpoint, packages/core/src/remote-bridge/handlers/workspace-file-service.test.ts`; scope exception reason: deleting the undo module has no green intermediate while the workspace-file test imports its ledger store and the step-checkpoint module imports the undo stage type; expected commit: `refactor: remove workflow undo module`).
485. [DONE] Git Commit: `refactor: remove workflow undo module` (hash: f9f36e1aa)
488. [DONE] `phase8.stream70.task11` Delete the obsolete stage-bound Git rollback facade that predated the Core-owned boundary registry architecture (scope: `packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.ts, packages/core/src/workflow/git-rollback/workflow-git-rollback-facade.test.ts`; expected commit: `refactor: remove legacy workflow git rollback facade`).
489. [PENDING] Git Commit: `refactor: remove legacy workflow git rollback facade` (hash: TBD)
490. [TODO] `phase8.stream70.task12` Run targeted Core verification after legacy Clear/Undo removal and record the result before asking for the next release-build gate (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify legacy clear undo cleanup`).
491. [TODO] Git Commit: `test: verify legacy clear undo cleanup` (hash: TBD)

## Phase 9 — Scope Closeout (owner: Codex, updated: 2026-05-22)

### Stream: Scope Closeout
150. [TODO] `phase9.stream1.task1` Close implementation scope after explicit user acceptance, archive todo-plan and update Docs_Index if follow-up documents move (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree lead contract implementation`).
151. [TODO] Git Commit: `docs: close development tree lead contract implementation` (hash: TBD)
