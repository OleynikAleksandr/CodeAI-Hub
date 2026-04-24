# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Native_Request_Capture_Workflow_Scenarios_1.2.66.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Native_Request_Capture_Workflow_Scenarios_1.2.66.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Native_Request_Capture_AppPath_Tuning_1.2.65.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Provider_Native_Request_Capture_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream, в каждом Stream несколько микрозадач.
- Каждая подзадача должна затрагивать не более 3 файлов/пакетов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Если фактический scope подзадачи превышает 3 файла/пакета, задача разбивается и этот план обновляется до коммита.
- Gates запускаются через Husky на commit/push. Ручные targeted builds запускаются для затронутых пакетов.
- Real-time документация обновляется в том же коммите, что и код, если меняется архитектура/контракт.
- Phase завершается на чистом дереве после release build.

## Phase 1 — Workflow Scenario Native Capture (owner: Codex, updated: 2026-04-24)

### Stream: Planning Bootstrap

1. [DONE] Создать planning-документ и active todo-plan для workflow scenario native capture — scope: `doc/SolidWorks-WorkFlow/Plans/Native_Request_Capture_Workflow_Scenarios_1.2.66.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: plan workflow scenario native capture`.
2. [DONE] Git Commit: `docs: plan workflow scenario native capture` (hash: `18ef92ad5`)

### Stream: PM Scenario Prompt Source

3. [DONE] Добавить Project Manager resolver, который строит capture prompt через существующий `buildWorkflowPromptPack` для `Description`, `Virtual Simulation`, `Diagram Modules` — scope: `src/client/project-manager/services/native-request-capture-scenario-prompt.ts`, `src/client/project-manager/services/description-submit-service.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat: build workflow capture prompts from project manager`.
4. [DONE] Git Commit: `feat: build workflow capture prompts from project manager` (hash: `53019e013`)

5. [DONE] Протянуть `scenarioId/scenarioPrompt` через Project Manager API без роста `api.ts` за лимит 500 строк — scope: `src/client/project-manager/api.ts`, `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/components/settings/native-request-capture-runner.ts`; expected commit: `feat: send workflow scenario capture payloads`.
6. [DONE] Git Commit: `feat: send workflow scenario capture payloads` (hash: `53019e013`)

### Stream: Settings Scenario UI

7. [DONE] Добавить scenario selector в shared Settings -> General native capture card и состояние active scenario — scope: `src/client/ui/src/components/settings/native-request-capture-card.tsx`, `native-request-capture-state.ts`, `use-settings-state-support.ts`; expected commit: `feat: add native capture workflow scenario selector`.
8. [DONE] Git Commit: `feat: add native capture workflow scenario selector` (hash: `b88e6f29c`)

9. [DONE] Протянуть selector в VS Code webview state и Project Manager settings state — scope: `src/client/ui/src/components/settings/use-settings-state.ts`, `src/client/project-manager/components/settings/use-project-manager-settings-state.ts`, `src/client/ui/src/components/settings/general-settings.tsx`; expected commit: `feat: route native capture scenario from settings`.
10. [DONE] Git Commit: `feat: route native capture scenario from settings` (hash: `b88e6f29c`)

### Stream: Core And Provider Prompt Threading

11. [DONE] Расширить Core command contract и writer metadata под scenario id/label/prompt source — scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`, `packages/core/src/provider-network-capture/native-request-capture-facade.ts`; expected commit: `feat: pass workflow prompts into native capture`.
12. [DONE] Git Commit: `feat: pass workflow prompts into native capture` (hash: `6e38f845a`)

13. [DONE] Передать workflow prompt в Claude/Codex diagnostics вместо probe fallback — scope: `packages/core/src/provider-registry/provider-module-loader.types.ts`, `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`; expected commit: `feat: use workflow prompt in provider capture diagnostics`.
14. [DONE] Git Commit: `feat: use workflow prompt in provider capture diagnostics` (hash: `6e38f845a`)

### Stream: Codex Full Turn Capture

15. [DONE] Обновить WebSocket capture: писать несколько client frames и завершать на useful Codex turn frame — scope: `packages/core/src/provider-network-capture/native-request-capture-proxy.ts`, `packages/core/src/provider-network-capture/native-request-capture-websocket-session.ts`, tests; expected commit: `fix: capture codex full turn websocket frame`.
16. [DONE] Git Commit: `fix: capture codex full turn websocket frame` (hash: `5f80d1632`)

17. [DONE] Обновить writer primary-request selection для Codex: выбирать non-empty input/full turn frame — scope: `packages/core/src/provider-network-capture/native-request-capture-writer.ts`, tests; expected commit: `fix: prefer codex full turn in capture markdown`.
18. [DONE] Git Commit: `fix: prefer codex full turn in capture markdown` (hash: `5f80d1632`)

### Stream: Docs And Release

19. [DONE] Синхронизировать SSOT docs под workflow scenario capture — scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`; expected commit: `docs: document workflow scenario native capture`.
20. [IN_PROGRESS] Git Commit: `docs: document workflow scenario native capture` (hash: TBD)

21. [TODO] Обновить Claude docs при изменении provider capture prompt threading — scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: close workflow scenario capture docs`.
22. [TODO] Git Commit: `docs: close workflow scenario capture docs` (hash: TBD)

23. [TODO] Подготовить release notes для будущей версии `1.2.66` — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs: prepare workflow scenario capture release`.
24. [TODO] Git Commit: `docs: prepare workflow scenario capture release` (hash: TBD)

25. [TODO] Выполнить release build `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, затем закрыть todo/archive/session — scope: release artifacts, `doc/TODO/Archive/`, `doc/Sessions/`; expected commit: `chore: package workflow scenario capture release`.
26. [TODO] Git Commit: `chore: package workflow scenario capture release` (hash: TBD)
