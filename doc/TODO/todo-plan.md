# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plans-backlog-intake-2026-06-01",
  "branch": "main",
  "baseHead": "1add4fc4f",
  "lastRecordedCommit": "1a1ee49d9",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md",
  "currentTaskId": "phase74.stream1.task1",
  "expectedCommitMessage": "fix: materialize workflow clear registry projection",
  "debt": {
    "expectedCommitMessage": "fix: materialize workflow clear registry projection",
    "preCommitHead": "1a1ee49d9",
    "stage": "commit_pending",
    "taskId": "phase74.stream1.task1"
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
76. [DONE] Git Commit: `test: verify product part bootstrap timing` (hash: b32001f8e)

## Phase 44 - Release 1.2.441 Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

77. [DONE] `phase44.stream1.task1` Prepare release docs for version 1.2.441 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.441`). Result: README and CHANGELOG now describe release 1.2.441 as the Quality Gates-owned Product Part Development Brief handoff fix.
78. [DONE] Git Commit: `docs: prepare release 1.2.441` (hash: 059c254d7)

## Phase 45 - Release 1.2.441 Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

79. [DONE] `phase45.stream1.task1` Run the release build flow and record the resulting VSIX/tarball artifacts for version 1.2.441 (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.441`). Result: `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX created at `codeai-hub-1.2.441.vsix`; release tarballs created in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
80. [DONE] Git Commit: `chore: build release 1.2.441` (hash: 921902dce)

## Phase 46 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

81. [DONE] `phase46.stream1.task1` User installs/tests release 1.2.441 and verifies Product Part Development Brief files are not created during Diagram Modules closure, then are created after Quality Gates Baseline completion (scope: `doc/TODO/todo-plan.md`). Result: Release 1.2.441 passed the bootstrap timing retest: Product Part brief bootstrap starts after Quality Gates, and three Product Part agent sessions are created. Follow-up defects remain: agent outputs are not Core-accepted/committed, Product Part todo-plans do not advance to review, brief metadata remains agentTouched:false, workflow state regresses, and start prompts are not auditable.

## Phase 47 - Product Part Agent Handoff Repair (owner: Codex, updated: 2026-06-02)

### Stream: Agent Output Acceptance And Managed Commits

82. [DONE] `phase47.stream1.task1` Add Core-owned acceptance for completed Product Part Development Brief agent turns: detect the Product Part stage, validate that all `agent-fill` blocks are filled, stage the changed brief/continuity files, commit the accepted draft, and advance that Product Part `todo-plan.md` from Phase 1 to user review (scope: `packages/core/src/remote-bridge/handlers/**, packages/core/src/development-tree/node-bootstrap/**, doc/TODO/todo-plan.md`; expected commit: `fix: accept product part brief agent outputs`).
83. [DONE] Git Commit: `fix: accept product part brief agent outputs` (hash: 734ac1f67)
84. [DONE] `phase47.stream1.task2` Correct Product Part brief metadata after agent edits: set/derive `agentTouched: true`, keep draft status explicit, and avoid leaving filled briefs looking like untouched generated templates (scope: `packages/core/src/development-tree/**, packages/core/src/remote-bridge/handlers/**, doc/TODO/todo-plan.md`; expected commit: `fix: mark product part briefs touched by agents`).
85. [DONE] Git Commit: `fix: mark product part briefs touched by agents` (hash: 2f9d4a844)

### Stream: Workflow State And Session Audit

86. [DONE] `phase47.stream2.task1` Prevent Development Tree Product Part session updates from regressing `.codeai-hub/<workspace>/workflow/state.json` to an older Documentation Tree stage; preserve the correct last active stage after Quality Gates handoff and Product Part bootstrap (scope: `packages/core/src/remote-bridge/handlers/**, packages/core/src/workflow/**, doc/TODO/todo-plan.md`; expected commit: `fix: preserve workflow state during product part sessions`).
87. [DONE] Git Commit: `fix: preserve workflow state during product part sessions` (hash: cf1061d64)
88. [DONE] `phase47.stream2.task2` Persist the Product Part agent start prompt as an auditable visible session message/event so the user can inspect the exact Core assignment for each Product Part session, not only the agent's responses (scope: `packages/core/src/development-tree/node-bootstrap/**, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/unified-session/**, doc/TODO/todo-plan.md`; expected commit: `fix: persist product part agent start prompts`).
89. [DONE] Git Commit: `fix: persist product part agent start prompts` (hash: 6d79e75e9)

### Stream: Regression Coverage

90. [DONE] `phase47.stream3.task1` Add focused regression coverage for the complete post-Quality Gates Product Part handoff: bootstrap happens after Quality Gates, three Product Part agents can fill drafts, Core commits accepted outputs, Product Part todo-plans advance to review, workflow state does not regress, and start prompts are visible in session history (scope: `packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-last-active-resolver.test.ts, packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover product part brief handoff lifecycle`).
91. [DONE] Git Commit: `test: cover product part brief handoff lifecycle` (hash: a5453df66)

## Phase 48 - Tooling Verification (owner: Codex, updated: 2026-06-02)

### Stream: Targeted Checks

92. [DONE] `phase48.stream1.task1` Run targeted Core build/tests for Product Part handoff repair after implementation and record results before any release build decision (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify product part handoff repair`). Result: `npm run plan:validate`, `npm run build --workspace=@codeai-hub/core`, `product-part-development-brief-turn-controller.test.js`, `workflow-state-last-active-resolver.test.js`, and the NodeAgentSessionBootstrapper prompt persistence subtest passed.
93. [DONE] Git Commit: `test: verify product part handoff repair` (hash: 574d004db)

## Phase 49 - Release 1.2.442 Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

94. [DONE] `phase49.stream1.task1` Prepare release docs for version 1.2.442 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.442`). Result: README and CHANGELOG describe release 1.2.442 as the Product Part agent handoff repair.
95. [DONE] Git Commit: `docs: prepare release 1.2.442` (hash: ec0405939)

## Phase 50 - Release 1.2.442 Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

96. [DONE] `phase50.stream1.task1` Run the release build flow and record the resulting VSIX/tarball artifacts for version 1.2.442 (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.442`). Result: `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX created at `codeai-hub-1.2.442.vsix`; release tarballs created in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
97. [DONE] Git Commit: `chore: build release 1.2.442` (hash: 960884aaf)

## Phase 51 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

98. [BLOCKED] `phase51.stream1.task1` User installs/tests release 1.2.442 with the simplified project flow and verifies Product Part agent outputs are committed, Product Part todo-plans move to review, start prompts are visible, and workflow state does not regress (scope: `doc/TODO/todo-plan.md`). Result: retest found a provider picker regression: Project Manager can keep the stale `starting`/unavailable Claude provider snapshot even after Core reports `claudeCodeCli` as active through `/api/v1/status`.

## Phase 52 - Provider Warmup Snapshot Repair (owner: Codex, updated: 2026-06-02)

### Stream: Core State Broadcast

99. [DONE] `phase52.stream1.task1` Ensure Core broadcasts a fresh `core:state` provider snapshot after startup warmup completes, so Project Manager provider rows move from `starting`/unavailable to active without requiring a reload (scope: `packages/core/src/remote-bridge/index.ts, packages/core/src/remote-bridge/remote-bridge-provider-state-broadcast.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: broadcast provider state after warmup`). Result: RemoteBridge now rebroadcasts Core state on provider status events and the final ready status, so clients connected during warmup receive the post-warmup active provider snapshot.
100. [DONE] Git Commit: `fix: broadcast provider state after warmup` (hash: 6c9af7801)

## Phase 53 - Tooling Verification (owner: Codex, updated: 2026-06-02)

### Stream: Targeted Checks

101. [DONE] `phase53.stream1.task1` Run plan validation, focused provider-state broadcast test, and Core build after the provider warmup snapshot repair (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify provider warmup snapshot repair`). Result: `npm run plan:validate`, `node --test packages/core/dist/remote-bridge/remote-bridge-provider-state-broadcast.test.js`, and `npm run build --workspace=@codeai-hub/core` passed.
102. [DONE] Git Commit: `test: verify provider warmup snapshot repair` (hash: 031f37539)

## Phase 54 - Release Build Confirmation (owner: Oleksandr, updated: 2026-06-02)

### Stream: Release Confirmation

103. [DONE] `phase54.stream1.task1` Await explicit user confirmation before preparing/building the next release after the provider warmup snapshot repair (scope: `doc/TODO/todo-plan.md`). Result: user explicitly requested a new release build.

## Phase 55 - Release 1.2.443 Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

104. [DONE] `phase55.stream1.task1` Prepare release docs for version 1.2.443 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.443`). Result: README and CHANGELOG describe release 1.2.443 as the provider warmup snapshot repair.
105. [DONE] Git Commit: `docs: prepare release 1.2.443` (hash: 40e9efebe)

## Phase 56 - Release 1.2.443 Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

106. [DONE] `phase56.stream1.task1` Run the release build flow and record the resulting VSIX/tarball artifacts for version 1.2.443 (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.443`). Result: `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX created at `codeai-hub-1.2.443.vsix`; release tarballs created in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
107. [DONE] Git Commit: `chore: build release 1.2.443` (hash: 7b4803ef5)

## Phase 57 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

108. [BLOCKED] `phase57.stream1.task1` User installs/tests release 1.2.443 and verifies Claude provider rows move from warmup/starting to active after Core startup, then continues the simplified FinderWidget workflow (scope: `doc/TODO/todo-plan.md`). Result: release 1.2.443 passed the provider warmup retest, but Product Part agent orchestration exposed follow-up defects: Product Part prompts used `en/en` instead of global `ru/ru`, draft artifacts and agent replies were English, Product Part start prompts were persisted as `system` messages instead of user-visible user turns, and the Workspace continuity index could remain dirty after accepted Product Part brief commits.

## Phase 58 - Product Part Agent Language And Session Repair (owner: Codex, updated: 2026-06-02)

### Stream: Language Source And Start Prompt Role

109. [DONE] `phase58.stream1.task1` Make Product Part agent bootstrap resolve chat/artifact languages from the global localization settings source already used by translation policy, not from workspace-local provider settings; verify `ru/ru` appears in the first prompt when global settings define Russian (scope: `packages/core/src/config/provider-settings-snapshot.ts, packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts, packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts`; expected commit: `fix: use global language settings for product part agents`). Result: Product Part prompt bootstrap now uses the same global-localization overlay as translation policy; focused bootstrapper tests confirm reasoning/artifact languages resolve from `CODEAI_GLOBAL_SETTINGS_PATH`.
110. [DONE] Git Commit: `fix: use global language settings for product part agents` (hash: 77f8a5f84)
111. [DONE] `phase58.stream1.task2` Persist Product Part agent start prompts as auditable `user` messages while keeping Core acceptance/status messages as system feedback (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core-start-prompt-role.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: persist product part start prompts as user turns`). Result: Development Tree Product Part start prompts now persist through `appendDialogMessage` with `role: "user"` while Core acceptance messages remain system feedback; focused runtime-core regression test passed.
112. [DONE] Git Commit: `fix: persist product part start prompts as user turns` (hash: 8df8e7331)

### Stream: Managed Ledger Cleanliness

113. [DONE] `phase58.stream2.task1` Ensure accepted Product Part brief handoff does not leave `.codeai-hub/<workspace>/continuity/index.json` dirty after Core commits accepted draft and advances the Product Part todo-plan (scope: `packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.ts, packages/core/src/remote-bridge/handlers/product-part-development-brief-turn-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: commit product part continuity ledger updates`). Result: Product Part ledger advancement now includes the continuity index when present; focused handoff test confirms a dirty continuity index is committed and the workspace is clean after Core acceptance.
114. [DONE] Git Commit: `fix: commit product part continuity ledger updates` (hash: 464d297f4)

## Phase 59 - Product Part Agent Repair Verification (owner: Codex, updated: 2026-06-02)

### Stream: Targeted Checks

115. [DONE] `phase59.stream1.task1` Run plan validation plus focused Core tests/builds for Product Part language, prompt role, and ledger-clean handoff before release preparation (scope: `doc/TODO/todo-plan.md, packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core-start-prompt-role.test.ts`; expected commit: `test: verify product part language and ledger repair`). Result: `npm run plan:validate`, Product Part prompt language bootstrapper test, Product Part start-prompt role test, Product Part brief handoff ledger-clean test, and `npm run build --workspace=@codeai-hub/core` passed; the start-prompt role regression test now avoids `import.meta` so it compiles under the current Core CommonJS build.
116. [DONE] Git Commit: `test: verify product part language and ledger repair` (hash: 1df0b0988)

## Phase 60 - Release 1.2.444 Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

117. [DONE] `phase60.stream1.task1` Prepare release docs for version 1.2.444 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.444`). Result: README and CHANGELOG describe release 1.2.444 as the Product Part agent language, visible start-prompt, and continuity-ledger cleanliness repair.
118. [DONE] Git Commit: `docs: prepare release 1.2.444` (hash: 00eafd142)

## Phase 61 - Release 1.2.444 Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

119. [DONE] `phase61.stream1.task1` Run the release build flow and record the resulting VSIX/tarball artifacts for version 1.2.444 (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.444`). Result: `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX created at `codeai-hub-1.2.444.vsix`; release tarballs created in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
120. [DONE] Git Commit: `chore: build release 1.2.444` (hash: b3d8e68ab)

## Phase 62 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

121. [BLOCKED] `phase62.stream1.task1` User installs/tests release 1.2.444 and verifies Product Part prompts use global `ru/ru`, draft prose and agent replies are Russian, Product Part start prompts appear as user turns, and Product Part handoff leaves no dirty continuity ledger (scope: `doc/TODO/todo-plan.md`). Result: retest exposed a long-standing Clear/Undo defect: workflow clear removes in-memory sessions only, leaving unified and provider-native runtime session files from cleared/downstream steps.

## Phase 63 - Workflow Clear Runtime Session Cleanup (owner: Codex, updated: 2026-06-02)

### Stream: Unified And Native Session Files

122. [DONE] `phase63.stream1.task1` Extend workflow Clear/Undo so it removes downstream unified session histories plus provider-native session files for real provider ids (`codexCli`, `claudeCodeCli`, `geminiCli`, `glmClaudeCode`) without deleting provider auth/settings/cache files; add focused regression coverage (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear*, doc/TODO/todo-plan.md`; expected commit: `fix: clear workflow runtime session files`).
123. [DONE] Git Commit: `fix: clear workflow runtime session files` (hash: cd34a5d08)

## Phase 64 - Release Build Confirmation (owner: Oleksandr, updated: 2026-06-02)

### Stream: Release Confirmation

124. [DONE] `phase64.stream1.task1` Await explicit user confirmation before preparing/building the next release with the Clear/Undo runtime session cleanup fix (scope: `doc/TODO/todo-plan.md`). Result: user explicitly requested a new release build.

## Phase 65 - Release 1.2.445 Preparation (owner: Codex, updated: 2026-06-02)

### Stream: Release Docs

125. [DONE] `phase65.stream1.task1` Prepare release docs for version 1.2.445 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.445`).
126. [DONE] Git Commit: `docs: prepare release 1.2.445` (hash: 5b8177422)

## Phase 66 - Release 1.2.445 Build (owner: Codex, updated: 2026-06-02)

### Stream: Build Artifacts

127. [DONE] `phase66.stream1.task1` Run the release build flow and record the resulting VSIX/tarball artifacts for version 1.2.445 (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.445`).
128. [DONE] Git Commit: `chore: build release 1.2.445` (hash: de92c0dc7)

## Phase 67 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-02)

### Stream: User Retest

129. [BLOCKED] `phase67.stream1.task1` User installs/tests release 1.2.445 and verifies Clear/Undo removes downstream unified and provider-native runtime session histories without deleting provider auth/settings/cache files (scope: `doc/TODO/todo-plan.md`). Result: retest showed unified workflow histories still accumulate under `.codeai-hub/<workspaceSlug>/runtime/sessions/unified/<provider>/` after Clear/Undo; current cleanup depends too much on live runtime session registry and does not aggressively prune old workspace-local provider native session histories.

## Phase 68 - Workflow Clear Runtime History Repair (owner: Codex, updated: 2026-06-03)

### Stream: Workspace Runtime Cleanup

130. [DONE] `phase68.stream1.task1` Make workflow Clear/Undo prune all workflow unified history files and all provider-native session history files inside the workspace runtime capsule, independent of live runtime session registry, while preserving auth/settings/cache files (scope: `packages/core/src/remote-bridge/handlers/workflow-step-clear-runtime-cleanup.ts, packages/core/src/remote-bridge/handlers/workflow-step-clear-service.runtime-cleanup.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: clear workflow runtime history files`).
131. [DONE] Git Commit: `fix: clear workflow runtime history files` (hash: a535a8f61)
132. [DONE] `phase68.stream1.task2` Sync Workflow Clear documentation with the no-continuity runtime history cleanup behavior (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/TODO/todo-plan.md`; expected commit: `docs: clarify workflow clear session cleanup`).
133. [DONE] Git Commit: `docs: clarify workflow clear session cleanup` (hash: b60c46f5d)

## Phase 69 - Runtime Cleanup Verification (owner: Codex, updated: 2026-06-03)

### Stream: Targeted Checks

134. [DONE] `phase69.stream1.task1` Run plan validation, focused runtime cleanup regression test, and affected Core build after the Clear/Undo cleanup repair (scope: `doc/TODO/todo-plan.md`). Result: Result: npm run plan:validate passed; npm run build --workspace=@codeai-hub/core passed; focused compiled runtime cleanup test passed and confirms workflow unified histories plus provider-native session history containers are pruned while unrelated unified history and auth/settings/cache files are preserved.

## Phase 70 - Release Build Confirmation (owner: Oleksandr, updated: 2026-06-03)

### Stream: Release Confirmation

135. [DONE] `phase70.stream1.task1` Await explicit user confirmation before preparing/building the next release with the corrected Clear/Undo runtime history cleanup behavior (scope: `doc/TODO/todo-plan.md`). Result: user explicitly requested a new release build.

## Phase 71 - Release 1.2.446 Preparation (owner: Codex, updated: 2026-06-03)

### Stream: Release Docs

136. [DONE] `phase71.stream1.task1` Prepare release docs for version 1.2.446 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.446`).
137. [DONE] Git Commit: `docs: prepare release 1.2.446` (hash: 98dd05531)

## Phase 72 - Release 1.2.446 Build (owner: Codex, updated: 2026-06-03)

### Stream: Build Artifacts

138. [DONE] `phase72.stream1.task1` Run the release build flow and record the resulting VSIX/tarball artifacts for version 1.2.446 (scope: `doc/TODO/todo-plan.md, package.json, package-lock.json, packages/**/package.json, src/client/ui/package.json, src/client/project-manager/package.json, assets/**/manifest.json, scripts/**, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.446`).
139. [DONE] Git Commit: `chore: build release 1.2.446` (hash: 1a1ee49d9)

## Phase 73 - User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-06-03)

### Stream: User Retest

140. [BLOCKED] `phase73.stream1.task1` User installs/tests release 1.2.446 on a clean FinderWidget workspace and verifies Clear/Undo removes workflow unified histories plus provider-native session histories while preserving provider auth/settings/cache files (scope: `doc/TODO/todo-plan.md`). Result: retest showed Clear/Undo still leaves unified and provider-native Codex session histories because the rollback clear commit can fail after reset when `.codeai-hub/<workspaceSlug>/workflow/boundaries.json` is absent at the target boundary.

## Phase 74 - Workflow Clear Registry Projection Repair (owner: Codex, updated: 2026-06-03)

### Stream: Rollback Projection

141. [DONE] `phase74.stream1.task1` Ensure Workflow Clear/Undo materializes the pruned workflow boundary registry projection before the clear commit, so rollback does not fail on a missing `boundaries.json` pathspec and runtime session cleanup can run (scope: `packages/core/src/workflow/boundary/workflow-rollback-coordinator.ts, packages/core/src/workflow/boundary/workflow-boundary-clear-registry-projection.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: materialize workflow clear registry projection`).
142. [PENDING] Git Commit: `fix: materialize workflow clear registry projection` (hash: TBD)

## Phase 75 - Runtime Cleanup Verification (owner: Codex, updated: 2026-06-03)

### Stream: Targeted Checks

143. [TODO] `phase75.stream1.task1` Run plan validation, focused boundary rollback/runtime cleanup regression tests, and affected Core build after the registry projection repair (scope: `doc/TODO/todo-plan.md`).

## Phase 41 - Scope Closeout (owner: Codex, updated: 2026-06-02)

### Stream: Closeout

70. [TODO] `phase41.stream1.task1` After explicit user acceptance, archive this active `todo-plan.md` closeout snapshot and leave `DevelopmentTree_BranchWorkflow_Architecture.md` as the active root planning source or record its final disposition (scope: `doc/TODO/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close development tree product part bootstrap scope`).
71. [TODO] Git Commit: `docs: close development tree product part bootstrap scope` (hash: TBD)
72. [TODO] `phase41.stream1.task2` Reserved post-closeout handoff anchor (scope: `doc/TODO/todo-plan.md`).
