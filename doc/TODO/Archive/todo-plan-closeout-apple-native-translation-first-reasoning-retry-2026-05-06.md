# Plan Closeout: apple-native-translation-first-reasoning-retry-2026-05-06

**Created:** 2026-05-06T09:49:47.528Z
**Acceptance:** User accepted release 1.2.156: first reasoning bubble translation retry fix is confirmed.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase4.stream2.task1
**Expected Commit:** docs: close apple native translation retry scope
**Last Recorded Commit:** 0451fa69f
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_First_Reasoning_Retry_Architecture.md

## Active Plan Copy

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "apple-native-translation-first-reasoning-retry-2026-05-06",
  "branch": "main",
  "baseHead": "5cea2c810",
  "lastRecordedCommit": "0451fa69f",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_First_Reasoning_Retry_Architecture.md",
  "currentTaskId": "phase4.stream2.task1",
  "expectedCommitMessage": "docs: close apple native translation retry scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_First_Reasoning_Retry_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase. В каждой Phase есть Stream, в каждом Stream есть микро-задачи.
- Каждая микро-задача должна затрагивать не более 3 файлов/пакетов.
- Каждая микро-задача оформляется парой пунктов: реализация/изменения и отдельный следующий пункт `Git Commit: ...`.
- Если по факту разработки задача затрагивает больше 3 файлов, сначала разбить ее на меньшие задачи и обновить этот plan.
- Husky hooks нельзя обходить через `--no-verify`.
- Для штатного commit workflow использовать `npm run plan:commit -- "<expected commit message>"`.
- Изменения архитектуры/логики синхронно отражать в соответствующих SSOT-документах до коммита.
- Release/Tooling и User Acceptance streams не закрывать без фактической проверки и явного acceptance пользователя.

## Phase 1 - Planning Intake (owner: Codex, updated: 2026-05-06)

### Stream: Apple Native Translation Retry Design Intake

1. [DONE] `phase1.stream1.task1` Create hotfix planning document and active execution plan; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_First_Reasoning_Retry_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: plan apple native translation retry`
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan apple native translation retry` (hash: 6865743ac)

## Phase 2 - Translation Retry Implementation (owner: Codex, updated: 2026-05-06)

### Stream: Apple Native Retry Guard

1. [DONE] `phase2.stream1.task1` Add bounded retry for transient Apple Native `notInstalled` runtime fallback and regression tests; scope: `packages/translation/src/apple-native-translation-engine.ts`, `packages/translation/src/apple-native-translation-engine.test.ts`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`; expected commit: `fix: retry transient apple native translation failures`
2. [DONE] `phase2.stream1.commit1` Git Commit: `fix: retry transient apple native translation failures` (hash: 2b7b0df70)

## Phase 3 - Tooling Verification And Release (owner: Codex, updated: 2026-05-06)

### Stream: Tooling Verification

1. [DONE] `phase3.stream1.task1` Run targeted translation package tests/builds and record verification evidence; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_First_Reasoning_Retry_Architecture.md`; expected commit: `docs: record apple native translation retry verification`
2. [DONE] `phase3.stream1.commit1` Git Commit: `docs: record apple native translation retry verification` (hash: a7f8bc7ff)

### Stream: Release Build

1. [DONE] `phase3.stream2.task1` Prepare release metadata for the Apple Native Translation retry hotfix; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare apple native translation retry release`
2. [DONE] `phase3.stream2.commit1` Git Commit: `docs: prepare apple native translation retry release` (hash: 636671d31)
3. [DONE] `phase3.stream2.task2` Run `./scripts/build-all.sh`, verify runtime tarballs, and commit release automation outputs; scope: release package manifests, runtime manifests, generated bundles, release artifacts; expected commit: `chore: build apple native translation retry release`
4. [DONE] `phase3.stream2.commit2` Git Commit: `chore: build apple native translation retry release` (hash: c1d35edb5)
5. [DONE] `phase3.stream2.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and record release evidence; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_First_Reasoning_Retry_Architecture.md`, release artifacts; expected commit: `docs: record apple native translation retry release`
6. [DONE] `phase3.stream2.commit3` Git Commit: `docs: record apple native translation retry release` (hash: 847a52d8a)

## Phase 4 - User Workflow Acceptance And Closeout (owner: User + Codex, updated: 2026-05-06)

### Stream: User Workflow Acceptance Testing

1. [DONE] `phase4.stream1.task1` User verifies the first reasoning bubble translates in a fresh Codex session from the release VSIX; scope: user workflow acceptance; no commit expected Result: User accepted release 1.2.156: first reasoning bubble translation retry fix is confirmed.
2. [DONE] `phase4.stream1.task2` Record accepted workflow evidence and any final doc notes; scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_First_Reasoning_Retry_Architecture.md`; expected commit: `docs: record apple native translation retry acceptance`
3. [DONE] `phase4.stream1.commit2` Git Commit: `docs: record apple native translation retry acceptance` (hash: 0451fa69f)

### Stream: Scope Closeout

1. [IN_PROGRESS] `phase4.stream2.task1` After explicit user acceptance, archive active plan, dispose planning document to Archive, update Docs Index if needed, and leave terminal NONE handoff; scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close apple native translation retry scope`
2. [TODO] `phase4.stream2.commit1` Git Commit: `docs: close apple native translation retry scope` (hash: TBD)
````
