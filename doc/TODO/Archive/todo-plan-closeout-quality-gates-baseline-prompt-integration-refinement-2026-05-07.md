# Plan Closeout: quality-gates-baseline-prompt-integration-refinement-2026-05-07

**Created:** 2026-05-07T08:22:41.480Z
**Acceptance:** User accepted closing the Quality Gates prompt refinement scope on 2026-05-07; remaining Phase 7 plannedRequiredAfterIntegration nuance transfers to the next managed workspace lifecycle scope.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase8.stream1.task1
**Expected Commit:** chore: close quality gates prompt refinement scope
**Last Recorded Commit:** 668d545d0
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Baseline_Prompt_Integration_Refinement.md

## Active Plan Copy

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "quality-gates-baseline-prompt-integration-refinement-2026-05-07",
  "branch": "main",
  "baseHead": "3aae676a7",
  "lastRecordedCommit": "668d545d0",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Baseline_Prompt_Integration_Refinement.md",
  "currentTaskId": "phase8.stream1.task1",
  "expectedCommitMessage": "chore: close quality gates prompt refinement scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Baseline_Prompt_Integration_Refinement.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowStep_PromptTesting_Methodology.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Baseline_Prompt_Integration_Refinement.md`
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
- Релизная Phase не закрывает scope: после сборки VSIX пользователь запускает live retest `Quality Gates Baseline`, а feedback становится новым fix stream или acceptance gate.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-07)

### Stream: Planning Document

1. [DONE] `phase0.stream1.task1` Create the planning document for Quality Gates prompt/integration refinement, register it in docs navigation, and open the active execution plan (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Baseline_Prompt_Integration_Refinement.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: plan quality gates prompt integration refinement`).
2. [DONE] Git Commit: `docs: plan quality gates prompt integration refinement` (hash: 306ec3d55)

## Phase 1 — Compact Quality Gates Step Front (owner: Codex, updated: 2026-05-07)

### Stream: Prompt And Contract Audit

1. [DONE] `phase1.stream1.task1` Compact the Quality Gates bundled prompt and contract so duplicate phase rules are removed and the two-phase draft/integration boundary is concrete (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md`, `packages/agents/quality-gates-agent/assets/quality-gates-contract.md`; expected commit: `fix: compact quality gates step front`).
2. [DONE] Git Commit: `fix: compact quality gates step front` (hash: 21a7e0764)

### Stream: Runtime Prompt Pack De-Duplication

3. [DONE] `phase1.stream2.task1` Remove or shorten conflicting runtime phase guidance for `quality_gates` so the rendered first prompt does not repeat bundled instructions (scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`; expected commit: `fix: dedupe quality gates prompt pack`).
4. [DONE] Git Commit: `fix: dedupe quality gates prompt pack` (hash: 24dc67127)

## Phase 2 — Prompt Contract Tests (owner: Codex, updated: 2026-05-07)

### Stream: Rendered Prompt Coverage

1. [DONE] `phase2.stream1.task1` Add targeted tests for Quality Gates first prompt rendering: compact two-phase boundary, Ultracite/Knip/source-size hooks, integration plan fields, and no duplicate phase narratives (scope: `packages/core/src/templates/bundled-templates.test.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`; expected commit: `test: cover quality gates prompt contract`).
2. [DONE] Git Commit: `test: cover quality gates prompt contract` (hash: d075b02d5)

### Stream: Artifact Contract Validation

3. [DONE] `phase2.stream2.task1` Tighten validation expectations for `quality-gates.json` so advisory/planned/not-integrated gates cannot masquerade as active blockers without integration paths (scope: `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.ts`, `packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts`; expected commit: `test: validate quality gates contract consistency`).
4. [DONE] Git Commit: `test: validate quality gates contract consistency` (hash: cc8712baf)

## Phase 3 — SSOT Sync And Targeted Verification (owner: Codex, updated: 2026-05-07)

### Stream: Documentation Sync

1. [DONE] `phase3.stream1.task1` Promote implemented Quality Gates behavior into SSOT docs without copying the full prompt text (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Baseline_Prompt_Integration_Refinement.md`; expected commit: `docs: sync quality gates prompt refinement ssot`).
2. [DONE] Git Commit: `docs: sync quality gates prompt refinement ssot` (hash: 84e7d610a)

### Stream: Targeted Builds

3. [DONE] `phase3.stream2.task1` Run targeted template, Core, and Project Manager tests/builds for changed prompt and validation surfaces; fix failures within touched files only (scope: `packages/core`, `src/client/project-manager`, root scripts; expected commit: `test: verify quality gates prompt refinement`).
4. [DONE] Git Commit: `test: verify quality gates prompt refinement` (hash: e0a61899f)

## Phase 4 — Release Build (owner: Codex, updated: 2026-05-07)

### Stream: Release Notes Preparation

1. [DONE] `phase4.stream1.task1` Prepare release metadata for the next VSIX before version bump (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare quality gates prompt refinement release notes`).
2. [DONE] Git Commit: `docs: prepare quality gates prompt refinement release notes` (hash: 69ea0e5ed)

### Stream: Release Package

3. [DONE] `phase4.stream2.task1` Build the new release package with the standard release pipeline and record produced artifacts (scope: `package.json`, `package-lock.json`, release artifacts under `doc/tmp/releases/`; expected commit: `chore: build quality gates prompt refinement release`).
4. [DONE] Git Commit: `chore: build quality gates prompt refinement release` (hash: 5a1b66b38)

## Phase 5 — User Workflow Acceptance Testing (owner: Oleksandr + Codex, updated: 2026-05-07)

### Stream: User Retest

1. [DONE] `phase5.stream1.task1` Deliver the built VSIX to the user and wait for live retest of `Quality Gates Baseline` draft artifacts, acceptance, and post-acceptance gate integration behavior (scope: release VSIX, user test workspace; expected commit: `test: record quality gates prompt refinement retest`).
2. [DONE] Git Commit: `test: record quality gates prompt refinement retest` (hash: 7a3d03ac7)

### Stream: Retest Fixes If Needed

3. [DONE] `phase5.stream2.task1` Make the Quality Gates prompt stack-neutral while preserving universal architecture gates and same-session integration wording (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md`, `packages/agents/quality-gates-agent/assets/quality-gates-contract.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `fix: address quality gates retest feedback`).
4. [DONE] Git Commit: `fix: address quality gates retest feedback` (hash: 8128e66c9)
5. [DONE] `phase5.stream2.task2` Add targeted regression coverage for stack-neutral tooling selection and strict command-map contract shape (scope: `packages/core/src/templates/quality-gates-bundled-templates.test.ts`, `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.ts`, `packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts`; expected commit: `test: cover quality gates retest fixes`).
6. [DONE] Git Commit: `test: cover quality gates retest fixes` (hash: 4906ef12a)

## Phase 6 — Retest Fix Release Build (owner: Codex, updated: 2026-05-07)

### Stream: Release Notes Preparation

1. [DONE] `phase6.stream1.task1` Prepare release metadata for the next VSIX after Quality Gates retest fixes (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare quality gates retest fix release notes`).
2. [DONE] Git Commit: `docs: prepare quality gates retest fix release notes` (hash: 4a8259ac3)

### Stream: Release Package

3. [DONE] `phase6.stream2.task1` Build the new retest-fix release package with the standard release pipeline and record produced artifacts (scope: `package.json`, `package-lock.json`, release manifests; expected commit: `chore: build quality gates retest fix release`).
4. [DONE] Git Commit: `chore: build quality gates retest fix release` (hash: 668d545d0)

## Phase 7 — Phase 2 Retest Prompt Follow-Up (owner: Codex, updated: 2026-05-07)

### Stream: Planned Blocker Contract Clarification

1. [BLOCKED] `phase7.stream1.task1` Clarify the Quality Gates prompt/contract so `plannedRequiredAfterIntegration` cannot duplicate ids already listed in `requiredBefore*`, and so Phase 1 draft agents know to leave it empty when required arrays already express post-integration blockers. Blocked by explicit user decision on 2026-05-07 to close this scope and transfer the nuance into the next managed workspace lifecycle scope (scope: `packages/agents/quality-gates-agent/assets/quality-gates-prompt.md`, `packages/agents/quality-gates-agent/assets/quality-gates-contract.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `fix: clarify quality gates planned blocker contract`).
2. [BLOCKED] Git Commit: `fix: clarify quality gates planned blocker contract` (hash: transferred to next scope)
3. [BLOCKED] `phase7.stream1.task2` Add regression coverage for the clarified planned-required contract and validator alignment. Blocked by explicit user decision on 2026-05-07 to close this scope and transfer the nuance into the next managed workspace lifecycle scope (scope: `packages/core/src/templates/quality-gates-bundled-templates.test.ts`, `packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts`; expected commit: `test: cover quality gates planned blocker contract`).
4. [BLOCKED] Git Commit: `test: cover quality gates planned blocker contract` (hash: transferred to next scope)

### Stream: Retest Fix Release

5. [BLOCKED] `phase7.stream2.task1` Prepare and build the next VSIX after planned blocker contract clarification. Blocked by explicit user decision on 2026-05-07 to close this scope and transfer remaining follow-up into the next managed workspace lifecycle scope (scope: `README.md`, `CHANGELOG.md`, `package.json`, `package-lock.json`, release manifests; expected commit: `chore: build quality gates planned blocker release`).
6. [BLOCKED] Git Commit: `chore: build quality gates planned blocker release` (hash: transferred to next scope)

## Phase 8 — Scope Closeout (owner: Codex, updated: 2026-05-07)

### Stream: Closeout After User Acceptance

1. [IN_PROGRESS] `phase8.stream1.task1` After explicit user acceptance, archive/close the active todo plan and decide the final disposition of the planning document (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/Quality_Gates_Baseline_Prompt_Integration_Refinement.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `chore: close quality gates prompt refinement scope`).
2. [TODO] Git Commit: `chore: close quality gates prompt refinement scope` (hash: TBD)
````
