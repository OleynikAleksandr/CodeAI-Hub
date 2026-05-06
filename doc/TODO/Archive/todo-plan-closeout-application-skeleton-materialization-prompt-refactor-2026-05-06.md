# План разработки (Development TODO Plan)

**Archived:** 2026-05-06 after release `1.2.170`.
**Disposition:** Scope accepted by user, release built, and planning document moved to `doc/SolidWorks-WorkFlow/Plans/Archive/Application_Skeleton_Materialization_Prompt_Refactor.md`.

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-materialization-prompt-refactor-2026-05-06",
  "branch": "main",
  "baseHead": "29ca0e92b",
  "lastRecordedCommit": "bd50bab58",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Application_Skeleton_Materialization_Prompt_Refactor.md",
  "currentTaskId": "phase6.stream1.task1",
  "expectedCommitMessage": "chore: close application skeleton materialization scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Application_Skeleton_Materialization_Prompt_Refactor.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowStep_PromptTesting_Methodology.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase, в каждой Phase несколько Stream, в каждом Stream микро-задачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Если подзадача фактически затрагивает больше 3 файлов, она должна быть разбита до выполнения.
- Гейты запускаются штатно через `npm run plan:commit -- "<expected commit message>"`.
- Каждый новый `doc/TODO/todo-plan.md` содержит финальные Stream: `Release Build`, `User Workflow Acceptance Testing`, `Scope Closeout`.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-06)

### Stream: Planning Document

1. [DONE] `phase0.stream1.task1` Create the planning document for Application Skeleton prompt/materialization refactor and register it in docs navigation (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Application_Skeleton_Materialization_Prompt_Refactor.md`, `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan application skeleton materialization prompt refactor`).
2. [DONE] Git Commit: `docs: plan application skeleton materialization prompt refactor` (hash: b289591e5)

## Phase 1 — Application Skeleton Materialization Direction (owner: Codex, updated: 2026-05-06)

### Stream: Agent Prompt And Contract Direction

1. [DONE] `phase1.stream1.task1` Change Application Skeleton agent instructions from contract-only completion to two-phase draft plus post-acceptance filesystem materialization (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md`, `packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md`, `packages/core/src/templates/source/model-invocation-templates.json`; expected commit: `fix: make application skeleton materialization-first`).
2. [DONE] Git Commit: `fix: make application skeleton materialization-first` (hash: d915472da)

### Stream: Application Skeleton State Contract

3. [DONE] `phase1.stream2.task1` Teach Core Application Skeleton progress to distinguish draft, accepted, materializing, materialized, failed, and outdated states from `application-skeleton-map.json` (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-progress.ts`, `packages/core/src/remote-bridge/handlers/quality-gates-progress.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; expected commit: `fix: track application skeleton materialization state`).
4. [DONE] Git Commit: `fix: track application skeleton materialization state` (hash: 095cd0c02)

### Stream: Downstream Unlock Rules

5. [DONE] `phase1.stream3.task1` Change Quality Gates and Development Tree unlock logic so accepted skeleton without `materialized=true` is not enough to start downstream work (scope: `packages/core/src/development-tree/filesystem-structurator/development-tree-production-path-applier.ts`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`; expected commit: `fix: gate downstream work on materialized skeleton`).
6. [DONE] Git Commit: `fix: gate downstream work on materialized skeleton` (hash: 37b6784f7)

### Stream: Application Skeleton UI State

7. [DONE] `phase1.stream4.task1` Update Project Manager UI copy and stage help so users see the difference between draft contract, accepted contract, and materialized filesystem skeleton (scope: `src/client/project-manager/components/application-skeleton/application-skeleton-help.tsx`, `src/client/project-manager/components/application-skeleton/application-skeleton-panel.tsx`, `src/client/project-manager/components/shared/stage-confirmation-card-workflow.ts`; expected commit: `fix: show application skeleton materialization state`).
8. [DONE] Git Commit: `fix: show application skeleton materialization state` (hash: 2032dc3b0)

## Phase 2 — Prompt Test And Correction Loop (owner: Codex, updated: 2026-05-06)

### Stream: Prompt Contract Tests

1. [DONE] `phase2.stream1.task1` Add targeted tests that assert the Application Skeleton prompt requires post-acceptance materialization and forbids production file writes before acceptance (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md`, `packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md`, `packages/core/src/templates/bundled-templates.test.ts`; expected commit: `test: cover application skeleton materialization prompt`).
2. [DONE] Git Commit: `test: cover application skeleton materialization prompt` (hash: 08b6410e4)

### Stream: Live Prompt Retest Fixes

3. [DONE] `phase2.stream2.task1` Run a focused local prompt/static verification pass, inspect the rendered first prompt/template payload, and patch the Application Skeleton prompt if the agent boundary is still ambiguous (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md`, `packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Application_Skeleton_Materialization_Prompt_Refactor.md`; expected commit: `fix: refine application skeleton materialization prompt after test`).
4. [DONE] Git Commit: `fix: refine application skeleton materialization prompt after test` (hash: cad198ba5)

### Stream: Quality Gates Follow-On Boundary

5. [DONE] `phase2.stream3.task1` Align Quality Gates prompt with the new skeleton lifecycle: it starts only after materialized skeleton and integrates gates after explicit acceptance (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md`, `packages/agents/quality-gates-agent/assets/quality-gates-contract.md`, `src/client/project-manager/components/quality-gates/quality-gates-help.tsx`; expected commit: `fix: align quality gates with materialized skeleton`).
6. [DONE] Git Commit: `fix: align quality gates with materialized skeleton` (hash: 0529e41c2)

## Phase 3 — Targeted Verification (owner: Codex, updated: 2026-05-06)

### Stream: Core And UI Tests

1. [DONE] `phase3.stream1.task1` Run targeted Core and Project Manager tests for Application Skeleton progress, Quality Gates unlock, and Development Tree lock behavior; fix failures within touched files only (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`, `packages/core/src/templates/bundled-templates.test.ts`; expected commit: `test: verify application skeleton materialization gates`).
2. [DONE] Git Commit: `test: verify application skeleton materialization gates` (hash: 374a178b9)

### Stream: Build Verification

3. [DONE] `phase3.stream2.task1` Run targeted package/client builds and typechecks for changed surfaces before release preparation (scope: `packages/core`, `src/client/project-manager`, root scripts; expected commit: `chore: verify application skeleton materialization builds`).
4. [DONE] Git Commit: `chore: verify application skeleton materialization builds` (hash: 0b5b29ffd)

## Phase 4 — Release Build (owner: Codex, updated: 2026-05-06)

### Stream: Release Notes Preparation

1. [DONE] `phase4.stream1.task1` Prepare release metadata for the next VSIX by updating user-facing release notes before version bump (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`; expected commit: `docs: prepare application skeleton materialization release notes`).
2. [DONE] Git Commit: `docs: prepare application skeleton materialization release notes` (hash: d054658e1)

### Stream: Release Package

3. [DONE] `phase4.stream2.task1` Build the new release package with the standard release pipeline and record produced artifacts (scope: `package.json`, `package-lock.json`, release artifacts under `doc/tmp/releases/`; expected commit: `chore: build application skeleton materialization release`).
4. [DONE] Git Commit: `chore: build application skeleton materialization release` (hash: 714a870bf)

## Phase 5 — User Workflow Acceptance Testing (owner: Oleksandr + Codex, updated: 2026-05-06)

### Stream: User Retest

1. [DONE] `phase5.stream1.task1` Deliver the built VSIX to the user and wait for live workflow retest of Application Skeleton draft, acceptance, materialization, Quality Gates unlock, and Development Tree lock behavior (scope: release VSIX, user test workspace; expected commit: `test: record application skeleton materialization user retest`).
2. [DONE] Git Commit: `test: record application skeleton materialization user retest` (hash: e5dae7c80)

### Stream: Retest Fixes If Needed

3. [DONE] `phase5.stream2.task1` If user retest finds a blocker, add a narrow investigation/fix stream before closeout; otherwise leave this task as not needed during closeout (scope: TBD after retest; expected commit: `fix: address application skeleton materialization retest feedback`).
4. [DONE] Git Commit: `fix: address application skeleton materialization retest feedback` (hash: a3282b923)

### Stream: Prompt Fix Retest Release

5. [DONE] `phase5.stream3.task1` Prepare release metadata for the next VSIX that includes the discovery-first Application Skeleton prompt fix (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare application skeleton prompt retest release notes`).
6. [DONE] Git Commit: `docs: prepare application skeleton prompt retest release notes` (hash: 8827a1c33)
7. [DONE] `phase5.stream3.task2` Build the new VSIX with the standard release pipeline for user retest (scope: `package.json`, `package-lock.json`, release manifests; expected commit: `chore: build application skeleton prompt retest release`).
8. [DONE] Git Commit: `chore: build application skeleton prompt retest release` (hash: d613d0477)

### Stream: Runtime Prompt Pack Retest Fixes

9. [DONE] `phase5.stream4.task1` Remove conflicting legacy Application Skeleton runtime phase guidance so the first turn remains discovery-first and draft-only (scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`; expected commit: `fix: refine application skeleton runtime prompt pack`).
10. [DONE] Git Commit: `fix: refine application skeleton runtime prompt pack` (hash: 81de51135)
11. [DONE] `phase5.stream4.task2` Inline available Description, Virtual Simulation, Product Parts index, and generated Product Part files into the Application Skeleton first-turn prompt (scope: `src/client/project-manager/services/description-submit-service.ts`, `src/client/project-manager/services/workflow-source-artifact-descriptors.ts`, `src/client/project-manager/services/workflow-source-artifact-descriptors.test.ts`; expected commit: `fix: include application skeleton source artifacts`).
12. [DONE] Git Commit: `fix: include application skeleton source artifacts` (hash: b81baed3d)
13. [DONE] `phase5.stream4.task3` Tighten Application Skeleton bundled prompt and contract semantics for production source roots and clustered vs standalone module paths (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md`, `packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `fix: tighten application skeleton path contract`).
14. [DONE] Git Commit: `fix: tighten application skeleton path contract` (hash: 11c970677)
15. [DONE] `phase5.stream4.task4` Cover the stricter Application Skeleton path contract in bundled template tests (scope: `packages/core/src/templates/application-skeleton-bundled-templates.test.ts`; expected commit: `test: cover application skeleton path contract`).
16. [DONE] Git Commit: `test: cover application skeleton path contract` (hash: af8472d54)
17. [DONE] `phase5.stream4.task5` Prepare release metadata for the next VSIX that includes the runtime prompt pack retest fixes (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare application skeleton prompt pack release notes`).
18. [DONE] Git Commit: `docs: prepare application skeleton prompt pack release notes` (hash: c50b516c5)
19. [DONE] `phase5.stream4.task6` Build the new VSIX with the standard release pipeline for user retest (scope: `package.json`, `package-lock.json`, release manifests; expected commit: `chore: build application skeleton prompt pack release`).
20. [DONE] Git Commit: `chore: build application skeleton prompt pack release` (hash: a113a99af)

### Stream: Application Skeleton JSON Contract Shape

21. [DONE] `phase5.stream5.task1` Tighten Application Skeleton prompt and contract so draft/materialized JSON uses canonical machine-readable shape and the production filesystem mirrors Development Tree under `product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>` (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md`, `packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `fix: tighten application skeleton json contract shape`).
22. [DONE] Git Commit: `fix: tighten application skeleton json contract shape` (hash: b61424202)
23. [DONE] `phase5.stream5.task2` Cover canonical JSON shape requirements in bundled template tests (scope: `packages/core/src/templates/application-skeleton-bundled-templates.test.ts`; expected commit: `test: cover application skeleton json contract shape`).
24. [DONE] Git Commit: `test: cover application skeleton json contract shape` (hash: baa268327)
25. [DONE] `phase5.stream5.task3` Prepare a new VSIX retest release if the JSON contract shape fix is implemented after user feedback (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare application skeleton json contract release notes`).
26. [DONE] Git Commit: `docs: prepare application skeleton json contract release notes` (hash: bb56090ac)
27. [DONE] `phase5.stream5.task4` Build the new VSIX with the standard release pipeline for user retest after JSON contract shape tightening (scope: `package.json`, `package-lock.json`, release manifests; expected commit: `chore: build application skeleton json contract release`).
28. [DONE] Git Commit: `chore: build application skeleton json contract release` (hash: 0c143a0e8)

### Stream: User Stack Decision Refinement

29. [DONE] `phase5.stream6.task1` Tighten Application Skeleton prompt so an explicit user replacement of a stack decision is treated as the final decision for that baseline and does not open a new detail-question loop before acceptance/materialization confirmation (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md`, `packages/core/src/templates/bundled-templates.ts`, `packages/core/src/templates/application-skeleton-bundled-templates.test.ts`; expected commit: `fix: respect user stack decision in application skeleton prompt`).
30. [DONE] Git Commit: `fix: respect user stack decision in application skeleton prompt` (hash: 3d37b308a)

### Stream: First Prompt Compaction

31. [DONE] `phase5.stream7.task1` Compact the Application Skeleton first prompt while preserving universal behavior for any application and adding a stricter post-materialization stale-draft cleanup rule (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md`, `packages/core/src/templates/bundled-templates.ts`, `packages/core/src/templates/application-skeleton-bundled-templates.test.ts`; expected commit: `fix: compact application skeleton first prompt`).
32. [DONE] Git Commit: `fix: compact application skeleton first prompt` (hash: c08a32ee1)

### Stream: Compact Prompt Retest Release

33. [DONE] `phase5.stream8.task1` Prepare release metadata for the next VSIX containing the compact Application Skeleton prompt and stale-draft cleanup rule (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare application skeleton compact prompt release notes`).
34. [DONE] Git Commit: `docs: prepare application skeleton compact prompt release notes` (hash: 2e611ff61)
35. [DONE] `phase5.stream8.task2` Build the new VSIX with the standard release pipeline for user retest of Application Skeleton agent behavior, artifacts, and filesystem structure (scope: `package.json`, `package-lock.json`, release manifests; expected commit: `chore: build application skeleton compact prompt release`).
36. [DONE] Git Commit: `chore: build application skeleton compact prompt release` (hash: 869e0e99b)

### Stream: Technology Inference Retest Fix

37. [DONE] `phase5.stream9.task1` Refine Application Skeleton prompt and contract so upstream shell/launcher technology hints influence the baseline, default `sourceRoot` remains `product-parts`, and final responses are localized by meaning rather than fixed English literals (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md`, `packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md`, `packages/core/src/templates/application-skeleton-bundled-templates.test.ts`; expected commit: `fix: refine application skeleton technology inference`).
38. [DONE] Git Commit: `fix: refine application skeleton technology inference` (hash: 3844e1b84)
39. [DONE] `phase5.stream9.task2` Prepare release metadata for the next VSIX containing the technology inference prompt fix (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare application skeleton technology inference release notes`).
40. [DONE] Git Commit: `docs: prepare application skeleton technology inference release notes` (hash: 062711dcd)
41. [DONE] `phase5.stream9.task3` Build the new VSIX with the standard release pipeline for user retest after technology inference prompt fix (scope: `package.json`, `package-lock.json`, release manifests; expected commit: `chore: build application skeleton technology inference release`).
42. [DONE] Git Commit: `chore: build application skeleton technology inference release` (hash: c91349b95)

### Stream: Application Skeleton Validation Gate

43. [DONE] `phase5.stream10.task1` Record the automation-first principle in the always-read agent instructions so repeatable workflow-state problems prefer scripts, validators, hooks, or gates over prompt-only enforcement (scope: `AGENTS.md`; expected commit: `docs: record automation-first validation principle`).
44. [DONE] Git Commit: `docs: record automation-first validation principle` (hash: b75202e01)
45. [DONE] `phase5.stream10.task2` Add Application Skeleton artifact/filesystem validation so observed materialization cannot unlock Quality Gates while Markdown, JSON, and declared paths disagree (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-progress.ts`, `packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts`, `packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts`; expected commit: `fix: validate application skeleton materialized artifacts`).
46. [DONE] Git Commit: `fix: validate application skeleton materialized artifacts` (hash: 7bd4a0221)
47. [DONE] `phase5.stream10.task3` Prepare release metadata for the next VSIX containing the Application Skeleton validation gate (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare application skeleton validation gate release notes`).
48. [DONE] Git Commit: `docs: prepare application skeleton validation gate release notes` (hash: e54bd21a2)
49. [DONE] `phase5.stream10.task4` Build the new VSIX with the standard release pipeline for user retest of Application Skeleton validation behavior (scope: `package.json`, `package-lock.json`, release manifests; expected commit: `chore: build application skeleton validation gate release`).
50. [DONE] Git Commit: `chore: build application skeleton validation gate release` (hash: e1117b15e)

### Stream: Standalone Module Validation Gate

51. [DONE] `phase5.stream11.task1` Extend Application Skeleton materialization validation so Product Part-level `standaloneModules` are checked like clustered modules (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts`, `packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts`; expected commit: `fix: validate application skeleton standalone modules`).
52. [DONE] Git Commit: `fix: validate application skeleton standalone modules` (hash: 3803127ce)
53. [DONE] `phase5.stream11.task2` Prepare release metadata for the standalone module validation fix (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare standalone module validation release notes`).
54. [DONE] Git Commit: `docs: prepare standalone module validation release notes` (hash: 67508d169)
55. [DONE] `phase5.stream11.task3` Build the new VSIX with the standard release pipeline for user retest after standalone module validation fix (scope: `package.json`, `package-lock.json`, release manifests; expected commit: `chore: build standalone module validation release`).
56. [DONE] Git Commit: `chore: build standalone module validation release` (hash: 17e3615b7)

### Stream: Identifier Field Validation Gate

57. [DONE] `phase5.stream12.task1` Require canonical Application Skeleton identifier fields in the contract and materialization validator: Product Parts use `partId`, Clusters use `clusterId`, and Modules use `moduleId` (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md`, `packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts`, `packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts`; expected commit: `fix: validate application skeleton identifier fields`).
58. [DONE] Git Commit: `fix: validate application skeleton identifier fields` (hash: 509a4d778)
59. [DONE] `phase5.stream12.task2` Add focused regression coverage for missing canonical identifier fields in materialized Application Skeleton maps (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts`; expected commit: `test: cover application skeleton identifier validation`).
60. [DONE] Git Commit: `test: cover application skeleton identifier validation` (hash: 4d0ec607e)
61. [DONE] `phase5.stream12.task3` Prepare release metadata for the identifier validation fix (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare skeleton identifier validation release notes`).
62. [DONE] Git Commit: `docs: prepare skeleton identifier validation release notes` (hash: 3d461d68a)
63. [DONE] `phase5.stream12.task4` Build the new VSIX with the standard release pipeline and push the committed release to GitHub for user retest (scope: `package.json`, `package-lock.json`, release manifests; expected commit: `chore: build skeleton identifier validation release`).
64. [DONE] Git Commit: `chore: build skeleton identifier validation release` (hash: bd50bab58)

## Phase 6 — Scope Closeout (owner: Codex, updated: 2026-05-06)

### Stream: Closeout

1. [IN_PROGRESS] `phase6.stream1.task1` After explicit user acceptance, archive/close the active todo plan and decide the final disposition of the planning document (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/Application_Skeleton_Materialization_Prompt_Refactor.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `chore: close application skeleton materialization scope`).
2. [TODO] Git Commit: `chore: close application skeleton materialization scope` (hash: TBD)
