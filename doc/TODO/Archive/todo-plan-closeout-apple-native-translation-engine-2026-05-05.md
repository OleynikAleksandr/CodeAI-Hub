# Plan Closeout: apple-native-translation-engine-2026-05-05

**Created:** 2026-05-05T18:14:50.812Z
**Acceptance:** User accepted CodeAI Hub 1.2.152 Apple Native workflow: settings save works, translation quality is excellent, and speed is near realtime.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase6.stream2.task1
**Expected Commit:** docs: close apple native translation scope
**Last Recorded Commit:** efe5c96dc
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_Engine_Architecture.md

## Active Plan Copy

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "apple-native-translation-engine-2026-05-05",
  "branch": "main",
  "baseHead": "92f5b92f0",
  "lastRecordedCommit": "efe5c96dc",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_Engine_Architecture.md",
  "currentTaskId": "phase6.stream2.task1",
  "expectedCommitMessage": "docs: close apple native translation scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_Engine_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
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

## Phase 1 - Planning Intake (owner: Codex, updated: 2026-05-05)

### Stream: Apple Native Design Intake

1. [DONE] `phase1.stream1.task1` Create Apple Native Translation planning document and active execution plan; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_Engine_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: plan apple native translation engine`
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan apple native translation engine` (hash: 4e35114da)

## Phase 2 - Native Helper MVP (owner: Codex, updated: 2026-05-05)

### Stream: Swift Helper Surface

1. [DONE] `phase2.stream1.task1` Add Swift package/helper scaffold for Apple native translation CLI with JSON stdin/stdout contract; scope: `native/apple-translation-helper/`, `scripts/`; expected commit: `feat: add apple translation helper scaffold`
2. [DONE] `phase2.stream1.commit1` Git Commit: `feat: add apple translation helper scaffold` (hash: 7580ad96e)
3. [DONE] `phase2.stream1.task2` Implement helper commands `preflight`, `availability`, `translate`, and `translateBatch`; scope: `native/apple-translation-helper/`; expected commit: `feat: implement apple translation helper commands`
4. [DONE] `phase2.stream1.commit2` Git Commit: `feat: implement apple translation helper commands` (hash: c6471e8ac)
5. [DONE] `phase2.stream1.task3` Add helper unit/fixture tests for installed, supported-not-installed, unsupported, and translation errors; scope: `native/apple-translation-helper/Tests/`, `native/apple-translation-helper/Package.swift`; expected commit: `test: cover apple translation helper preflight`
6. [DONE] `phase2.stream1.commit3` Git Commit: `test: cover apple translation helper preflight` (hash: bed178111)

## Phase 3 - Translation Engine Integration (owner: Codex, updated: 2026-05-05)

### Stream: Shared Translation Engine

1. [DONE] `phase3.stream1.task1` Register `apple-native` as an optional translation engine in the shared/Core translation runtime; scope: `packages/translation/`, `packages/core/src/translation/`; expected commit: `feat: register apple native translation engine`
2. [DONE] `phase3.stream1.commit1` Git Commit: `feat: register apple native translation engine` (hash: cc839218e)
3. [DONE] `phase3.stream1.task2` Add engine language catalog and fail-closed language support checks for Localization; scope: `packages/localization/src/language-catalog.ts`, `packages/localization/src/language-catalog-service.ts`, `packages/localization/src/localization-materializer.ts`; expected commit: `feat: expose apple native translation catalog`
4. [DONE] `phase3.stream1.commit2` Git Commit: `feat: expose apple native translation catalog` (hash: f5bed3c25)
5. [DONE] `phase3.stream1.task3` Add runtime diagnostics and fallback result mapping for helper readiness failures; scope: `packages/translation/`, `packages/core/src/session-translation/`; expected commit: `feat: surface apple translation readiness failures`
6. [DONE] `phase3.stream1.commit3` Git Commit: `feat: surface apple translation readiness failures` (hash: d8979df25)

## Phase 4 - Settings UX And Preflight Guidance (owner: Codex, updated: 2026-05-05)

### Stream: Settings Readiness UX

1. [DONE] `phase4.stream1.task1` Add Apple Native option to `UI Translation Engine` and `Reasoning Translation Engine` selectors only when platform preflight allows it; scope: `src/client/ui/src/components/settings/`, `src/client/project-manager/components/settings/`; expected commit: `feat: add apple native engine settings option`
2. [DONE] `phase4.stream1.commit1` Git Commit: `feat: add apple native engine settings option` (hash: 5e09a1074)
3. [DONE] `phase4.stream1.task2` Add user-facing readiness messages for macOS update, Xcode/helper setup, and missing Translation Languages packs; scope: `packages/localization/assets/localization/source/en/`, `packages/localization/src/`; expected commit: `feat: add apple translation readiness copy`
4. [DONE] `phase4.stream1.commit2` Git Commit: `feat: add apple translation readiness copy` (hash: 08c830c02)
5. [DONE] `phase4.stream1.task3` Block Settings save for unavailable `apple-native` selections and expose a `Recheck` action; scope: `src/client/ui/src/components/settings/`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`; expected commit: `feat: block unavailable apple translation settings`
6. [DONE] `phase4.stream1.commit3` Git Commit: `feat: block unavailable apple translation settings` (hash: d20f537df)

## Phase 5 - SSOT Sync And Verification (owner: Codex, updated: 2026-05-05)

### Stream: Documentation Sync

1. [DONE] `phase5.stream1.task1` Promote implemented Apple Native engine contracts into SSOT docs after code lands; scope: `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: sync apple native translation ssot`
2. [DONE] `phase5.stream1.commit1` Git Commit: `docs: sync apple native translation ssot` (hash: 699788ef1)

### Stream: Tooling Verification

1. [DONE] `phase5.stream2.task1` Run targeted builds/tests for helper, translation, localization, Core, and settings surfaces; scope: `native/apple-translation-helper`, `packages/translation`, `packages/localization`, `packages/core`, `src/client/ui`; expected commit: `test: verify apple native translation integration`
2. [DONE] `phase5.stream2.commit1` Git Commit: `test: verify apple native translation integration` (hash: 7f9d68f1a)

### Stream: Release Build

1. [DONE] `phase5.stream3.task1` Prepare release metadata for the next VSIX before version bump; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare apple native release metadata`
2. [DONE] `phase5.stream3.commit1` Git Commit: `docs: prepare apple native release metadata` (hash: 858566c9a)
3. [DONE] `phase5.stream3.task2` Run `./scripts/build-all.sh`, verify runtime tarballs, and commit release automation outputs for version `1.2.150`; scope: release package manifests, runtime manifests, generated bundles, release artifacts; expected commit: `chore: build apple native release bundle`
4. [DONE] `phase5.stream3.commit2` Git Commit: `chore: build apple native release bundle` (hash: 4c08f0196)
5. [DONE] `phase5.stream3.task3` Package the Apple Translation helper binary into the Core runtime and enforce release validation; scope: `scripts/build-core.sh`, `scripts/build-release.sh`; expected commit: `fix: package apple translation helper binary`
6. [DONE] `phase5.stream3.commit3` Git Commit: `fix: package apple translation helper binary` (hash: cbcac2d35)
7. [DONE] `phase5.stream3.task4` Prepare release metadata for version `1.2.151` after Apple helper packaging fix; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare apple native release 1.2.151 metadata`
8. [DONE] `phase5.stream3.commit4` Git Commit: `docs: prepare apple native release 1.2.151 metadata` (hash: 1707d1de2)
9. [DONE] `phase5.stream3.task5` Run `./scripts/build-all.sh`, verify runtime tarballs, and commit release automation outputs for version `1.2.151`; scope: release package manifests, runtime manifests, generated bundles, release artifacts; expected commit: `chore: build apple native release 1.2.151 bundle`
10. [DONE] `phase5.stream3.commit5` Git Commit: `chore: build apple native release 1.2.151 bundle` (hash: 8f85870fd)
11. [DONE] `phase5.stream3.task6` Run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and record release evidence; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_Engine_Architecture.md`, release artifacts; expected commit: `docs: record apple native release build`
12. [DONE] `phase5.stream3.commit6` Git Commit: `docs: record apple native release build` (hash: 85c6ab313)

## Phase 6 - User Workflow Acceptance And Closeout (owner: User + Codex, updated: 2026-05-05)

### Stream: Acceptance Bug Fix - Apple Settings Save

1. [DONE] `phase6.stream0.task1` Diagnose and fix the `Save changes` rejection when both translation engines are `Apple Native - On-Device` and Russian localization is selected for all non-label categories; scope: `packages/translation/src/apple-native-translation-engine.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, focused verification; expected commit: `fix: resolve packaged apple translation helper`
2. [DONE] `phase6.stream0.commit1` Git Commit: `fix: resolve packaged apple translation helper` (hash: 989edd562)
3. [DONE] `phase6.stream0.task2` Prepare release metadata for version `1.2.152` after the settings save fix; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare apple native settings save retest metadata`
4. [DONE] `phase6.stream0.commit2` Git Commit: `docs: prepare apple native settings save retest metadata` (hash: 4e851feba)
5. [DONE] `phase6.stream0.task3` Run `./scripts/build-all.sh`, verify runtime tarballs, and commit release automation outputs for version `1.2.152`; scope: release package manifests, runtime manifests, generated bundles, release artifacts; expected commit: `chore: build apple native settings save retest bundle`
6. [DONE] `phase6.stream0.commit3` Git Commit: `chore: build apple native settings save retest bundle` (hash: 938b04913)
7. [DONE] `phase6.stream0.task4` Run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and record retest evidence; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_Engine_Architecture.md`, release artifacts; expected commit: `docs: record apple native settings save retest release`
8. [DONE] `phase6.stream0.commit4` Git Commit: `docs: record apple native settings save retest release` (hash: a77233ec8)

### Stream: User Workflow Acceptance Testing

1. [DONE] `phase6.stream1.task1` User verifies selecting `Apple Native - On-Device` for UI and Reasoning translation, missing-pack guidance, and successful local `en/ru/uk` translation from the next VSIX after the settings save fix; scope: user workflow acceptance; no commit expected Result: User accepted CodeAI Hub 1.2.152 Apple Native workflow: settings save works, translation quality is excellent, and speed is near realtime.
2. [DONE] `phase6.stream1.task2` Record accepted workflow evidence and any final doc notes; scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Translation_Engine_Architecture.md`; expected commit: `docs: record apple native translation acceptance`
3. [DONE] `phase6.stream1.commit2` Git Commit: `docs: record apple native translation acceptance` (hash: efe5c96dc)

### Stream: Scope Closeout

1. [IN_PROGRESS] `phase6.stream2.task1` After explicit user acceptance, archive active plan, dispose planning document to Archive or SSOT, update Docs Index, and leave terminal NONE handoff; scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close apple native translation scope`
2. [TODO] `phase6.stream2.commit1` Git Commit: `docs: close apple native translation scope` (hash: TBD)
````
