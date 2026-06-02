# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plans-backlog-intake-2026-06-01",
  "branch": "main",
  "baseHead": "1add4fc4f",
  "lastRecordedCommit": "4a66b274f",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "phase43.stream1.task1",
  "expectedCommitMessage": "test: verify product part bootstrap timing",
  "debt": {
    "expectedCommitMessage": "test: verify product part bootstrap timing",
    "preCommitHead": "4a66b274f",
    "stage": "commit_pending",
    "taskId": "phase43.stream1.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Plans/README.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- Only this list is the source for restoring context in this execution cycle.

## Execution Rules

- Required reading before code/design edits: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md` when the change touches facade/class/module boundaries.
- Keep `doc/SolidWorks-WorkFlow/Plans/` root reserved for the current active planning document plus directory metadata.
- Important but not-started planning sources belong in `doc/SolidWorks-WorkFlow/Plans/Backlog/`, not in `Plans/Archive/`.
- Completed historical planning sources remain in `doc/SolidWorks-WorkFlow/Plans/Archive/`.
- Use `npm run plan:commit -- "<expected commit message>"` for commit-managed tasks.

## Phase 1 - Plans Backlog Intake (owner: Codex, updated: 2026-06-01)

### Stream: Root Planning Shelf

1. [DONE] `phase1.stream1.task1` Reorganize `Plans/` root so the current active planning source remains in root while deferred/reference planning documents move to `Plans/Backlog/`; update navigation and path references (scope: `doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: organize active plans backlog`).
2. [DONE] Git Commit: `docs: organize active plans backlog` (hash: 1ad80e095)

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-06-01)

### Stream: Documentation Checks

3. [DONE] `phase2.stream1.task1` Run `npm run plan:validate` and targeted path/link spot checks for moved planning documents (scope: `doc/TODO/todo-plan.md`). Result: plan:validate passed; check:links passed; root Plans contains only README.md plus DevelopmentTree_BranchWorkflow_Architecture.md as the active working planning document

## Phase 3 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-01)

### Stream: User Acceptance

4. [DONE] `phase3.stream1.task1` User reviews the `Plans/` shelf model and accepts or requests adjustments before scope closeout (scope: `doc/TODO/todo-plan.md`). Result: User accepted the Plans shelf model and requested continuing with the active Development Tree planning source.

## Phase 4 - Development Tree Module Workflow Revision (owner: Codex, updated: 2026-06-01)

### Stream: Module Session And Worker Visibility

5. [DONE] `phase4.stream1.task1` Revise `DevelopmentTree_BranchWorkflow_Architecture.md` to reflect the one module-agent session model, artifact/user-review phases, interactive Implementation TODO Plan, read-only worker sessions, and MVP responsibility split between Core and the module agent; update the docs index summary for this active planning source (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: revise development tree module workflow`).
6. [DONE] Git Commit: `docs: revise development tree module workflow` (hash: 3c0ca1e3c)

## Phase 5 - Tooling Verification (owner: Codex, updated: 2026-06-01)

### Stream: Documentation Checks

7. [DONE] `phase5.stream1.task1` Run `npm run plan:validate` and `npm run check:links` after the architecture revision (scope: `doc/TODO/todo-plan.md`). Result: plan:validate passed; check:links passed after Development Tree architecture revision.

## Phase 6 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-01)

### Stream: User Acceptance

8. [DONE] `phase6.stream1.task1` User reviews the revised Development Tree branch workflow architecture and accepts or requests adjustments before scope closeout (scope: `doc/TODO/todo-plan.md`). Result: User requested adjustment: add Git Commit rows after each implementation microtask, define whether module agent or worker commits, and define worker workspace isolation rules.

## Phase 7 - Module Worker Commit Policy Revision (owner: Codex, updated: 2026-06-01)

### Stream: Commit And Workspace Policy

9. [DONE] `phase7.stream1.task1` Update `DevelopmentTree_BranchWorkflow_Architecture.md` with the Implementation TODO Plan microtask/Git Commit pairing, pre-commit Quality Gates behavior, module-agent commit ownership, worker sandbox/workspace rules, and parallel execution constraints (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: add module worker commit policy`).
10. [DONE] Git Commit: `docs: add module worker commit policy` (hash: 2774bf6b6)

## Phase 8 - Tooling Verification (owner: Codex, updated: 2026-06-01)

### Stream: Documentation Checks

11. [DONE] `phase8.stream1.task1` Run `npm run plan:validate` and `npm run check:links` after the worker commit policy revision (scope: `doc/TODO/todo-plan.md`). Result: plan:validate passed; check:links passed after module worker commit policy revision.

## Phase 9 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-01)

### Stream: User Acceptance

12. [DONE] `phase9.stream1.task1` User reviews the revised Development Tree branch workflow architecture and accepts or requests adjustments before scope closeout (scope: `doc/TODO/todo-plan.md`). Result: User accepted the revised Development Tree architecture and requested implementation of the module-node display change plus a new release build.

## Phase 10 - Module Development Tree Display Fix (owner: Codex, updated: 2026-06-02)

### Stream: Core Snapshot Projection

13. [DONE] `phase10.stream1.task1` Stop Core from projecting module phase/operation rows (`Module / Facade Specification`, `Implementation`, nested `Workers`, `Integration`) under module nodes while keeping Product Part / Cluster / Module rows intact; update the focused Core snapshot test and SSOT note (scope: `packages/core/src/development-tree/development-tree-operation-nodes.ts, packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`; expected commit: `fix: hide module operation rows in development tree`).
14. [DONE] Git Commit: `fix: hide module operation rows in development tree` (hash: 90b753bb4)

## Phase 11 - Documentation Sync (owner: Codex, updated: 2026-06-02)

### Stream: Sidebar Projection SSOT

15. [DONE] `phase11.stream1.task1` Update remaining SSOT/module docs so Project Manager and UI bundle documentation no longer describe module operation rows as the active Development Tree projection (scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: sync module tree projection docs`).
16. [DONE] Git Commit: `docs: sync module tree projection docs` (hash: 8c90402bf)

## Phase 12 - Tooling Verification (owner: Codex, updated: 2026-06-02)

### Stream: Targeted Checks

17. [DONE] `phase12.stream1.task1` Run targeted Core/Project Manager checks after the module tree display fix, including plan validation and affected builds/tests where available (scope: `doc/TODO/todo-plan.md`). Result: plan:validate passed; build:core passed; build:project-manager passed; build:webview passed; typecheck:webview passed; DevelopmentTreeStateFacade metadata test passed.

## Phase 13 - Release Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

18. [DONE] `phase13.stream1.task1` Prepare release docs for the next version requested by the user before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.437`).
19. [DONE] Git Commit: `docs: prepare release 1.2.437` (hash: a85e4d606)

## Phase 14 - Release Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

20. [DONE] `phase14.stream1.task1` Run the release build flow requested by the user and record the resulting VSIX/tarball artifacts (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.437`).
21. [DONE] Git Commit: `chore: build release 1.2.437` (hash: add7eb910)

## Phase 15 - User Visual Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

22. [DONE] `phase15.stream1.task1` User installs/tests the release and verifies module nodes no longer show module phase/operation children in the Development Tree (scope: `doc/TODO/todo-plan.md`). Result: User installed and tested release 1.2.437; module operation rows are hidden as expected in the Development Tree.

## Phase 16 - Development Tree Filesystem Scaffolding Fix (owner: Codex, updated: 2026-06-02)

### Stream: Core Planner

23. [DONE] `phase16.stream1.task1` Stop Core from creating legacy `workers/` and `integration/` operation directories in both materialized Development Tree and `doc/TODO/stages/development-tree` scaffolding when a fresh tree is generated (scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-paths.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.ts`; expected commit: `fix: simplify development tree filesystem scaffolding`).
24. [DONE] Git Commit: `fix: simplify development tree filesystem scaffolding` (hash: 446f0b521)

## Phase 17 - Documentation Sync (owner: Codex, updated: 2026-06-02)

### Stream: Scaffolding Model

25. [DONE] `phase17.stream1.task1` Update Development Tree documentation so filesystem scaffolding matches the compact tree model: product parts, clusters, modules, and right-panel artifacts instead of operation subfolders (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: sync development tree scaffolding model`).
26. [DONE] Git Commit: `docs: sync development tree scaffolding model` (hash: 2449d053d)

## Phase 18 - Tooling Verification (owner: Codex, updated: 2026-06-02)

### Stream: Targeted Checks

27. [DONE] `phase18.stream1.task1` Run targeted Development Tree planner tests and affected Core build/plan validation after the scaffolding fix (scope: `doc/TODO/todo-plan.md`). Result: plan:validate passed; @codeai-hub/core build passed; development-tree filesystem path planner dist test passed.

## Phase 19 - Cluster Development Tree Display Fix (owner: Codex, updated: 2026-06-02)

### Stream: Core Snapshot Projection

28. [DONE] `phase19.stream1.task1` Stop Core from projecting cluster operation rows (`Workers`, `Integration`) under cluster nodes while keeping Product Part / Cluster / Module rows and lead Product Part orchestration rows intact (scope: `packages/core/src/development-tree/development-tree-operation-nodes.ts, packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: hide cluster operation rows in development tree`).
29. [DONE] Git Commit: `fix: hide cluster operation rows in development tree` (hash: 66c25dd22)

## Phase 20 - Documentation Sync (owner: Codex, updated: 2026-06-02)

### Stream: Compact Cluster Projection

30. [DONE] `phase20.stream1.task1` Update Development Tree documentation so cluster workflow details are right-panel artifacts/states, not left-tree operation rows or pre-created operation folders (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md, doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md, doc/TODO/todo-plan.md`; expected commit: `docs: sync cluster tree projection model`).
31. [DONE] Git Commit: `docs: sync cluster tree projection model` (hash: 33ba6ee02)

## Phase 21 - Tooling Verification (owner: Codex, updated: 2026-06-02)

### Stream: Targeted Checks

32. [DONE] `phase21.stream1.task1` Run targeted Development Tree snapshot/planner tests and affected Core/Project Manager builds after the cluster projection fix (scope: `doc/TODO/todo-plan.md`). Result: plan:validate passed; @codeai-hub/core build passed; build:project-manager passed; build:webview passed; typecheck:webview passed; DevelopmentTreeStateFacade metadata test passed; DevelopmentTree filesystem path planner test passed.

## Phase 22 - Release Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

33. [DONE] `phase22.stream1.task1` Prepare release docs for version 1.2.438 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.438`).
34. [DONE] Git Commit: `docs: prepare release 1.2.438` (hash: 746bee17b)

## Phase 23 - Release Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

35. [DONE] `phase23.stream1.task1` Run the release build flow requested by the user and record the resulting VSIX/tarball artifacts for version 1.2.438 (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.438`).
36. [DONE] Git Commit: `chore: build release 1.2.438` (hash: fe87505e4)

## Phase 24 - User Visual Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

37. [DONE] `phase24.stream1.task1` User installs/tests release 1.2.438 and verifies cluster nodes no longer show `Workers`/`Integration`, module nodes stay compact, and freshly regenerated Development Tree scaffolding has no pre-created operation folders (scope: `doc/TODO/todo-plan.md`). Result: User tested release 1.2.438; compact cluster/module Development Tree projection and fresh scaffolding are accepted.

## Phase 25 - Lead Product Part Orchestration Planning (owner: Codex, updated: 2026-06-02)

### Stream: Contract Graph Model

38. [DONE] `phase25.stream1.task1` Inspect current Development Tree orchestration implementation and move the archived lead Product Part / Contract Graph workflow model into the active Development Tree planning document as the next real branch orchestration layer (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: add lead product part orchestration model`).
39. [DONE] Git Commit: `docs: add lead product part orchestration model` (hash: 433f26dc1)

## Phase 26 - Product Part Coordination Scenario (owner: Codex, updated: 2026-06-02)

### Stream: Accepted Product Part Workflow

40. [DONE] `phase26.stream1.task1` Replace the over-engineered mandatory Contract Graph framing with the accepted Product Part coordination scenario: every Product Part gets a Development Brief, only the lead Product Part creates the Core-readable Development Order Plan, and missing information is handled through clarification phases rather than a separate Open Questions artifact (scope: `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md, doc/TODO/todo-plan.md`; expected commit: `docs: record product part coordination scenario`).
41. [DONE] Git Commit: `docs: record product part coordination scenario` (hash: a6ce3349b)

## Phase 27 - Product Part Brief Plan Artifacts (owner: Codex, updated: 2026-06-02)

### Stream: Managed Stage Plans

42. [DONE] `phase27.stream1.task1` Add a Core writer and focused coverage for `doc/TODO/stages/development-tree/product-parts/<part-id>/todo-plan.md` Product Part Development Brief plans (scope: `packages/core/src/development-tree/product-part-workflow/**, packages/core/src/development-tree/product-part-workflow/**/*.test.ts`; expected commit: `feat: create product part brief stage plans`).
43. [DONE] Git Commit: `feat: create product part brief stage plans` (hash: 39d3dc725)

## Phase 28 - Product Part Brief Prompt Artifacts (owner: Codex, updated: 2026-06-02)

### Stream: First Agent Prompt

44. [DONE] `phase28.stream1.task1` Rename the Product Part draft template/readiness rule and first agent message to `Product Part Development Brief` instead of the older generic part description wording (scope: `packages/core/src/development-tree/node-bootstrap/draft-template-registry.ts, packages/core/src/development-tree/node-bootstrap/draft-readiness-classifier.ts, packages/core/src/development-tree/node-bootstrap/node-first-message-builder.ts`; expected commit: `feat: define product part brief prompts`).
45. [DONE] Git Commit: `feat: define product part brief prompts` (hash: 6e088af57)
46. [DONE] `phase28.stream1.task2` Expose the renamed Product Part Development Brief artifact through the Development Tree read-model and focused snapshot coverage (scope: `packages/core/src/development-tree/development-tree-state-facade.ts, packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts, packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`; expected commit: `feat: expose product part brief artifacts`).
47. [DONE] Git Commit: `feat: expose product part brief artifacts` (hash: 6e2908ba8)
48. [DONE] `phase28.stream1.task3` Update draft generation/readiness focused tests for the renamed Product Part Development Brief artifact (scope: `packages/core/src/development-tree/node-bootstrap/draft-template-registry.test.ts, packages/core/src/development-tree/node-bootstrap/draft-readiness-classifier.test.ts, packages/core/src/development-tree/node-bootstrap/draft-writer.test.ts`; expected commit: `test: update product part brief draft coverage`).
49. [DONE] Git Commit: `test: update product part brief draft coverage` (hash: 2b8aade06)
50. [DONE] `phase28.stream1.task4` Update first prompt/session bootstrap focused tests for Product Part Development Brief naming (scope: `packages/core/src/development-tree/node-bootstrap/node-first-message-builder.test.ts, packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts, packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.test.ts`; expected commit: `test: update product part brief prompt coverage`).
51. [DONE] Git Commit: `test: update product part brief prompt coverage` (hash: 748599d54)

## Phase 29 - Product Part Agent Bootstrap Wiring (owner: Codex, updated: 2026-06-02)

### Stream: Core Orchestration

52. [DONE] `phase29.stream1.task1` Wire Core to create Product Part brief plans and start Product Part agent sessions after Development Tree materialization, while keeping Cluster/Module agents locked for later waves (scope: `packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.ts, packages/core/src/remote-bridge/handlers/development-tree-product-part-agent-bootstrap.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/remote-bridge-bootstrap.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-development-tree-bootstrap.test.ts`; expected commit: `feat: bootstrap product part brief agents`).
53. [DONE] Git Commit: `feat: bootstrap product part brief agents` (hash: f44eddd44)

## Phase 30 - Tooling Verification (owner: Codex, updated: 2026-06-02)

### Stream: Targeted Checks

54. [DONE] `phase30.stream1.task1` Run plan validation plus targeted Core tests/builds for Product Part Development Brief plan/session bootstrap (scope: `doc/TODO/todo-plan.md`). Result: plan:validate passed; @codeai-hub/core build passed; ProductPartDevelopmentBrief plan writer, workflow-state bootstrap, node bootstrap, read-model, prompt, draft/readiness focused dist tests passed; no PartDescription.draft.md references remain in packages/core/src

## Phase 31 - Release Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

55. [DONE] `phase31.stream1.task1` Prepare release docs for version 1.2.439 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.439`).
56. [DONE] Git Commit: `docs: prepare release 1.2.439` (hash: 7e40b0f1a)

## Phase 32 - Release Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

57. [DONE] `phase32.stream1.task1` Run the release build flow requested by the user and record the resulting VSIX/tarball artifacts for version 1.2.439 (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.439`). Result: `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX created at `codeai-hub-1.2.439.vsix`; release tarballs copied to `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
58. [DONE] Git Commit: `chore: build release 1.2.439` (hash: d374832b0)

## Phase 33 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

59. [BLOCKED] `phase33.stream1.task1` User installs/tests release 1.2.439, regenerates the Development Tree, and verifies that Product Part todo plans are created and Product Part agent sessions start for Product Part Development Brief work only (scope: `doc/TODO/todo-plan.md`). Result: release 1.2.439 failed user retest; legacy `Lead Product Part Orchestration` / Contract Graph operation rows appeared in the sidebar and only the lead Product Part was reliably materialized before bootstrap.

## Phase 35 - Release 1.2.440 Regression Fix (owner: Codex, updated: 2026-06-02)

### Stream: Product Part Bootstrap Regression

60. [DONE] `phase35.stream1.task1` Remove legacy Lead Product Part Orchestration / Contract Graph projection and materialize top Product Part folders for every Product Part before Product Part Development Brief bootstrap (scope: `packages/core/src/development-tree/development-tree-operation-nodes.ts, packages/core/src/development-tree/development-tree-state-facade.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.ts`; expected commit: `fix: compact product part development tree bootstrap`).
61. [DONE] Git Commit: `fix: compact product part development tree bootstrap` (hash: 9e2af19df)
62. [DONE] `phase35.stream1.task2` Update focused Core/UI regression tests and Development Tree node start routing so Product Part nodes can start without the removed Contract Graph gate (scope: `packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts, packages/core/src/development-tree/filesystem-structurator/development-tree-filesystem-path-planner.test.ts, packages/core/src/remote-bridge/remote-bridge-development-tree-node-command-router.ts, packages/core/src/remote-bridge/remote-bridge-development-tree-node-command-router.test.ts, src/client/project-manager/components/layout/development-tree-node-start-card.tsx, src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes-progress.test.ts, src/client/project-manager/services/workflow-state-client.test.ts`; expected commit: `test: cover compact product part bootstrap regression`).
63. [DONE] Git Commit: `test: cover compact product part bootstrap regression` (hash: 6bec804ec)

## Phase 36 - Release 1.2.440 Build Confirmation (owner: Oleksandr, updated: 2026-06-02)

### Stream: Release Confirmation

64. [DONE] `phase36.stream1.task1` Await explicit user confirmation before preparing and building release 1.2.440 for retesting the compact Product Part Development Tree bootstrap fix (scope: `doc/TODO/todo-plan.md`). Result: user confirmed release build.

## Phase 38 - Release 1.2.440 Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

65. [DONE] `phase38.stream1.task1` Prepare release docs for version 1.2.440 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.440`).
66. [DONE] Git Commit: `docs: prepare release 1.2.440` (hash: 5cc3dd321)

## Phase 39 - Release 1.2.440 Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

67. [DONE] `phase39.stream1.task1` Run the release build flow and record the resulting VSIX/tarball artifacts for version 1.2.440 (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.440`). Result: `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX created at `codeai-hub-1.2.440.vsix`; release tarballs copied to `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
68. [DONE] Git Commit: `chore: build release 1.2.440` (hash: eab839dfc)

## Phase 40 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

69. [BLOCKED] `phase40.stream1.task1` User installs/tests release 1.2.440, regenerates the Development Tree, and verifies that the sidebar contains only Product Part / Cluster / Module rows while Product Part Development Brief plans/sessions start for every Product Part (scope: `doc/TODO/todo-plan.md`). Result: release 1.2.440 failed retest; Core created `ProductPartDevelopmentBrief.draft.md` files while closing Diagram Modules, so the Diagram Modules dirty gate blocked completion with Development Tree files that should be created after Quality Gates Baseline.

## Phase 42 - Product Part Bootstrap Timing Fix (owner: Codex, updated: 2026-06-02)

### Stream: Quality Gates Handoff

73. [DONE] `phase42.stream1.task1` Move Product Part Development Brief bootstrap from workflow-state read side effects to the accepted Quality Gates terminal handoff, and cover the Diagram Modules dirty-gate regression (scope: `packages/core/src/remote-bridge/handlers/**, packages/core/src/remote-bridge/remote-bridge-bootstrap.ts, packages/core/src/managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller.ts, packages/core/src/development-tree/**`; expected commit: `fix: defer product part brief bootstrap until quality gates`). Result: workflow-state read is now side-effect free for Product Part Brief bootstrap; accepted Quality Gates terminal handoff now materializes Development Tree Product Part brief plans/drafts, starts Product Part agent sessions through the workflow session gateway, and commits the bootstrap artifacts with `docs: bootstrap product part development briefs`.
74. [DONE] Git Commit: `fix: defer product part brief bootstrap until quality gates` (hash: 4a66b274f)

## Phase 43 - Product Part Bootstrap Verification (owner: Codex, updated: 2026-06-02)

### Stream: Targeted Checks

75. [DONE] `phase43.stream1.task1` Run focused Core tests/builds for Development Tree bootstrap timing and Quality Gates handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify product part bootstrap timing`). Result: `npm run build --workspace=@codeai-hub/core`, `npm run plan:validate`, and focused compiled Node tests for workflow-state/Product Part bootstrap/Quality Gates handoff passed with 13/13 tests.
76. [PENDING] Git Commit: `test: verify product part bootstrap timing` (hash: TBD)

## Phase 44 - Release 1.2.441 Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

77. [TODO] `phase44.stream1.task1` Prepare release docs for version 1.2.441 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.441`).
78. [TODO] Git Commit: `docs: prepare release 1.2.441` (hash: TBD)

## Phase 45 - Release 1.2.441 Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

79. [TODO] `phase45.stream1.task1` Run the release build flow and record the resulting VSIX/tarball artifacts for version 1.2.441 (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.441`).
80. [TODO] Git Commit: `chore: build release 1.2.441` (hash: TBD)

## Phase 46 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

81. [TODO] `phase46.stream1.task1` User installs/tests release 1.2.441 and verifies Product Part Development Brief files are not created during Diagram Modules closure, then are created after Quality Gates Baseline completion (scope: `doc/TODO/todo-plan.md`).

## Phase 41 - Scope Closeout (owner: Codex, updated: 2026-06-02)

### Stream: Closeout

70. [TODO] `phase41.stream1.task1` After explicit user acceptance, archive this active `todo-plan.md` closeout snapshot and leave `DevelopmentTree_BranchWorkflow_Architecture.md` as the active root planning source or record its final disposition (scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree product part bootstrap scope`).
71. [TODO] Git Commit: `docs: close development tree product part bootstrap scope` (hash: TBD)
72. [TODO] `phase41.stream1.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`).
