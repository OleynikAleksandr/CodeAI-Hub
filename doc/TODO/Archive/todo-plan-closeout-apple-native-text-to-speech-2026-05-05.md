# Plan Closeout: apple-native-text-to-speech-2026-05-05

**Created:** 2026-05-06T06:55:25.650Z
**Acceptance:** User accepted release 1.2.155: Speak works, Russian voice works and quality is acceptable.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase6.stream2.task1
**Expected Commit:** docs: close apple text to speech scope
**Last Recorded Commit:** 2f39240e5
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Text_To_Speech_Architecture.md

## Active Plan Copy

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "apple-native-text-to-speech-2026-05-05",
  "branch": "main",
  "baseHead": "508033a11",
  "lastRecordedCommit": "2f39240e5",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Text_To_Speech_Architecture.md",
  "currentTaskId": "phase6.stream2.task1",
  "expectedCommitMessage": "docs: close apple text to speech scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Text_To_Speech_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html`
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

### Stream: Apple Native Text-to-Speech Design Intake

1. [DONE] `phase1.stream1.task1` Create Apple Native Text-to-Speech planning document and active execution plan; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Text_To_Speech_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: plan apple native text to speech`
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan apple native text to speech` (hash: 0fc36d8f8)

## Phase 2 - Native Speech Helper MVP (owner: Codex, updated: 2026-05-05)

### Stream: Swift Helper Surface

1. [DONE] `phase2.stream1.task1` Add Swift package/helper scaffold for Apple native text-to-speech with JSON stdin/stdout command contract; scope: `native/apple-speech-helper/`, `scripts/build-apple-speech-helper.sh`; expected commit: `feat: add apple speech helper scaffold`
2. [DONE] `phase2.stream1.commit1` Git Commit: `feat: add apple speech helper scaffold` (hash: 6f7a2d8c4)
3. [DONE] `phase2.stream1.task2` Implement helper commands `preflight`, `voices`, `speak`, and `stop` using AVSpeechSynthesizer with provider-independent rate input; scope: `native/apple-speech-helper/Sources/`, `native/apple-speech-helper/Tests/`; expected commit: `feat: implement apple text to speech helper`
4. [DONE] `phase2.stream1.commit2` Git Commit: `feat: implement apple text to speech helper` (hash: 2d90edd61)

## Phase 3 - Core Speech Runtime Integration (owner: Codex, updated: 2026-05-05)

### Stream: Core Speech Service

1. [DONE] `phase3.stream1.task1` Add Core-owned speech service and helper resolver that runs packaged Apple speech helper and exposes speak/stop state; scope: `packages/core/src/session-speech/`, `packages/core/src/remote-bridge/handlers/session-speech-request-handler.ts`; expected commit: `feat: add core text to speech service`
2. [DONE] `phase3.stream1.commit1` Git Commit: `feat: add core text to speech service` (hash: 0a1aa3b71)
3. [DONE] `phase3.stream1.task2` Add websocket contracts and routing for `session:speech:speak-message`, `session:speech:stop`, and `session:speech:state`; scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`, `src/client/project-manager/services/project-manager-api.ts`; expected commit: `feat: wire text to speech transport`
4. [DONE] `phase3.stream1.commit2` Git Commit: `feat: wire text to speech transport` (hash: 1a58d7ce5)

## Phase 4 - Settings And Bubble UX (owner: Codex, updated: 2026-05-05)

### Stream: Speech Rate Settings

1. [DONE] `phase4.stream1.task1` Add persisted `general.textToSpeech.rate` settings model with default `1.0`, clamped `0.75-2.0`, and save/load normalization; scope: `src/client/ui/src/components/settings/settings-state-model.ts`, `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-helpers.ts`; expected commit: `feat: add text to speech rate setting`
2. [DONE] `phase4.stream1.commit1` Git Commit: `feat: add text to speech rate setting` (hash: 835a7eb0a)
3. [DONE] `phase4.stream1.task2` Add General Settings rate slider and localized labels; scope: `src/client/ui/src/components/settings/general-settings.tsx`, `packages/localization/assets/localization/source/en/ui_interface.json`, `packages/localization/assets/localization/source/en/ui_helper_text.json`; expected commit: `feat: expose text to speech rate control`
4. [DONE] `phase4.stream1.commit2` Git Commit: `feat: expose text to speech rate control` (hash: e8730c169)

### Stream: Message Bubble Speak Control

1. [DONE] `phase4.stream2.task1` Add always-visible semi-transparent provider-styled speak button beside the bubble provider label for assistant and thinking messages; scope: `src/client/ui/src/session/dialog-panel.tsx`, `media/session-view.css`; expected commit: `feat: add provider styled speak button to messages`
2. [DONE] `phase4.stream2.commit1` Git Commit: `feat: add provider styled speak button to messages` (hash: d1c6587d7)
3. [DONE] `phase4.stream2.task2` Wire button actions to Core speech transport using message-model visible text, active speaking state, and stop behavior; scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/dialog-panel.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`; expected commit: `feat: wire message speak actions`
4. [DONE] `phase4.stream2.commit2` Git Commit: `feat: wire message speak actions` (hash: 33c0d824d)

## Phase 5 - Packaging, SSOT Sync, And Verification (owner: Codex, updated: 2026-05-05)

### Stream: Runtime Packaging

1. [DONE] `phase5.stream1.task1` Package Apple speech helper into Core runtime and verify VSIX package surface includes the helper; scope: `scripts/build-core.sh`, `scripts/build-release.sh`, `scripts/build-apple-speech-helper.sh`; expected commit: `fix: package apple speech helper binary`
2. [DONE] `phase5.stream1.commit1` Git Commit: `fix: package apple speech helper binary` (hash: 802a98152)

### Stream: Documentation Sync

1. [DONE] `phase5.stream2.task1` Promote implemented Text-to-Speech contracts into SSOT docs after code lands; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit: `docs: sync apple text to speech ssot`
2. [DONE] `phase5.stream2.commit1` Git Commit: `docs: sync apple text to speech ssot` (hash: d272d1adf)

### Stream: Tooling Verification

1. [DONE] `phase5.stream3.task1` Run targeted helper, Core, webview, and bubble UI tests/builds: Swift helper fixture tests for empty stdin, malformed command, `preflight`, `voices`, rate clamp, and opt-in live `speak/stop`; Core helper resolver/transport tests; UI bubble render/action tests for normal and thinking bubbles; settings rate persistence tests; scope: `native/apple-speech-helper`, `packages/core`, `src/client/ui`, `src/client/project-manager`; expected commit: `test: verify apple text to speech integration`
2. [DONE] `phase5.stream3.commit1` Git Commit: `test: verify apple text to speech integration` (hash: e9c2460ce)

### Stream: Release Build

1. [DONE] `phase5.stream4.task1` Prepare release metadata for the next VSIX before version bump; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare apple text to speech release metadata`
2. [DONE] `phase5.stream4.commit1` Git Commit: `docs: prepare apple text to speech release metadata` (hash: bf0d196c1)
3. [DONE] `phase5.stream4.task2` Run `./scripts/build-all.sh`, verify runtime tarballs, and commit release automation outputs; scope: release package manifests, runtime manifests, generated bundles, release artifacts; expected commit: `chore: build apple text to speech release bundle`
4. [DONE] `phase5.stream4.commit2` Git Commit: `chore: build apple text to speech release bundle` (hash: 33a1a6cc7)
5. [DONE] `phase5.stream4.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and record release evidence; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Text_To_Speech_Architecture.md`, release artifacts; expected commit: `docs: record apple text to speech release build`
6. [DONE] `phase5.stream4.commit3` Git Commit: `docs: record apple text to speech release build` (hash: c2835e79b)

## Phase 6 - User Workflow Acceptance And Closeout (owner: User + Codex, updated: 2026-05-05)

### Stream: User Acceptance Fix - Speech WebSocket Validation

1. [DONE] `phase6.stream0.task1` Fix Core incoming WebSocket validation so `session:speech:speak-message` and `session:speech:stop` reach the speech router, with regression coverage for accepted and malformed payloads; scope: `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts`, `packages/core/src/remote-bridge/handlers/incoming-message-validator.test.ts`; expected commit: `fix: allow text to speech websocket commands`
2. [DONE] `phase6.stream0.commit1` Git Commit: `fix: allow text to speech websocket commands` (hash: 55ae68c61)

### Stream: Hotfix Release Build - Speech WebSocket Validation

1. [DONE] `phase6.stream0b.task1` Prepare release metadata for Text-to-Speech websocket validation hotfix; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare text to speech websocket hotfix release`
2. [DONE] `phase6.stream0b.commit1` Git Commit: `docs: prepare text to speech websocket hotfix release` (hash: 68f719630)
3. [DONE] `phase6.stream0b.task2` Run `./scripts/build-all.sh`, verify runtime tarballs, and commit release automation outputs for `1.2.154`; scope: release package manifests, runtime manifests, generated bundles, release artifacts; expected commit: `chore: build text to speech websocket hotfix release`
4. [DONE] `phase6.stream0b.commit2` Git Commit: `chore: build text to speech websocket hotfix release` (hash: e7e63ceb7)
5. [DONE] `phase6.stream0b.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and record hotfix release evidence; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Text_To_Speech_Architecture.md`, release artifacts; expected commit: `docs: record text to speech websocket hotfix release`
6. [DONE] `phase6.stream0b.commit3` Git Commit: `docs: record text to speech websocket hotfix release` (hash: a16dc919c)

### Stream: User Acceptance Fix - Speech Text Language Detection

1. [DONE] `phase6.stream0c.task1` Make Apple Text-to-Speech infer voice language from the bubble text when UI/Core does not provide an explicit language, with regression coverage for Russian Cyrillic text resolving to `ru-RU`; scope: `native/apple-speech-helper/Sources/AppleSpeechHelper/main.swift`, `native/apple-speech-helper/Sources/AppleSpeechHelper/HelperContracts.swift`, `native/apple-speech-helper/Tests/AppleSpeechHelperTests/AppleSpeechHelperFixtureTests.swift`; expected commit: `fix: infer apple speech language from text`
2. [DONE] `phase6.stream0c.commit1` Git Commit: `fix: infer apple speech language from text` (hash: e80c28ea2)

### Stream: Hotfix Release Build - Speech Language Detection

1. [DONE] `phase6.stream0d.task1` Prepare release metadata for Text-to-Speech language detection hotfix; scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: prepare text to speech language detection release`
2. [DONE] `phase6.stream0d.commit1` Git Commit: `docs: prepare text to speech language detection release` (hash: c1a5d0220)
3. [DONE] `phase6.stream0d.task2` Run `./scripts/build-all.sh`, verify runtime tarballs, and commit release automation outputs for `1.2.155`; scope: release package manifests, runtime manifests, generated bundles, release artifacts; expected commit: `chore: build text to speech language detection release`
4. [DONE] `phase6.stream0d.commit2` Git Commit: `chore: build text to speech language detection release` (hash: b55f3791a)
5. [DONE] `phase6.stream0d.task3` Run `./scripts/build-release.sh --use-current-version`, verify VSIX output, and record language detection hotfix release evidence; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Text_To_Speech_Architecture.md`, release artifacts; expected commit: `docs: record text to speech language detection release`
6. [DONE] `phase6.stream0d.commit3` Git Commit: `docs: record text to speech language detection release` (hash: a4d201a1e)

### Stream: User Workflow Acceptance Testing

1. [DONE] `phase6.stream1.task1` User verifies provider-styled speak buttons on normal and thinking bubbles, rate changes, and stop behavior from the release VSIX; scope: user workflow acceptance; no commit expected Result: User accepted release 1.2.155: Speak works, Russian voice works and quality is acceptable.
2. [DONE] `phase6.stream1.task2` Record accepted workflow evidence and any final doc notes; scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Apple_Native_Text_To_Speech_Architecture.md`; expected commit: `docs: record apple text to speech acceptance`
3. [DONE] `phase6.stream1.commit2` Git Commit: `docs: record apple text to speech acceptance` (hash: 2f39240e5)

### Stream: Scope Closeout

1. [IN_PROGRESS] `phase6.stream2.task1` After explicit user acceptance, archive active plan, dispose planning document to Archive or SSOT, update Docs Index, and leave terminal NONE handoff; scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close apple text to speech scope`
2. [TODO] `phase6.stream2.commit1` Git Commit: `docs: close apple text to speech scope` (hash: TBD)
````
