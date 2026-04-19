# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_AppServer_Module_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Plans/Codex_AppServer_Module_Architecture.md`
  - `doc/Sessions/Session053.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзадача Stream затрагивает больше 3 файлов, такая задача должна быть разбита на более мелкие и список задач в Stream переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, hash).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке, чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация:** любое изменение архитектуры/логики требует синхронного обновления `todo-plan.md` и связанной документации из `doc/` до коммита.
- Phase завершается на чистом дереве: `./scripts/build-all.sh`, перенос release-артефактов в `doc/tmp/releases/`, фиксация результатов в `doc/Sessions/`.
- `doc/TODO/todo-plan.md` необходимо постоянно обновлять в реальном времени: после каждой подзадачи и каждого коммита.

## Phase 1 — Запуск execution cycle (owner: Codex, updated: 2026-04-19)
### Stream: Документарный старт
1. [DONE] Зафиксировать approved planning-doc, обновление `Docs_Index` и новый active `todo-plan.md`; scope: `doc/SolidWorks-WorkFlow/Plans/Codex_AppServer_Module_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: open codex app-server execution cycle`
2. [TODO] Git Commit: `docs: open codex app-server execution cycle` (hash: TBD)

### Stream: Provider-neutral immediate binding
3. [TODO] Вынести immediate binding из hardcoded provider-id logic в provider capability; scope: `packages/core/src/provider-registry/provider-module-loader.types.ts`, `packages/core/src/provider-registry/provider-descriptor-factory.ts`, `packages/core/src/remote-bridge/handlers/session-provider-session-resolver.ts`; ожидаемый commit message: `refactor: generalize provider immediate binding`
4. [TODO] Git Commit: `refactor: generalize provider immediate binding` (hash: TBD)

## Phase 2 — Parallel module scaffold (owner: Codex, updated: 2026-04-19)
### Stream: Package skeleton
5. [TODO] Создать сборочный scaffold нового пакета app-server; scope: `packages/Codex_AppServer_Module/package.json`, `packages/Codex_AppServer_Module/tsconfig.json`, `packages/Codex_AppServer_Module/src/index.ts`; ожидаемый commit message: `feat: scaffold codex app-server module`
6. [TODO] Git Commit: `feat: scaffold codex app-server module` (hash: TBD)

### Stream: Public adapter baseline
7. [TODO] Добавить совместимый adapter/options surface для Core; scope: `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts`, `packages/Codex_AppServer_Module/src/options/codex-module-options.ts`, `packages/Codex_AppServer_Module/src/types/index.ts`; ожидаемый commit message: `feat: add codex app-server adapter baseline`
8. [TODO] Git Commit: `feat: add codex app-server adapter baseline` (hash: TBD)

## Phase 3 — Transport runtime (owner: Codex, updated: 2026-04-19)
### Stream: App-server process and protocol
9. [TODO] Реализовать запуск процесса, initialize handshake и JSON-RPC client; scope: `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`, `packages/Codex_AppServer_Module/src/app-server/protocol/json-rpc-client.ts`, `packages/Codex_AppServer_Module/src/app-server/protocol/notification-dispatcher.ts`; ожидаемый commit message: `feat: add codex app-server transport core`
10. [TODO] Git Commit: `feat: add codex app-server transport core` (hash: TBD)

### Stream: Thread and turn flow
11. [TODO] Подключить session registry и thread/turn operations; scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`, `packages/Codex_AppServer_Module/src/app-server/session/app-server-session-registry.ts`, `packages/Codex_AppServer_Module/src/app-server/turn/app-server-turn-runner.ts`; ожидаемый commit message: `feat: wire codex app-server thread flow`
12. [TODO] Git Commit: `feat: wire codex app-server thread flow` (hash: TBD)

## Phase 4 — Event normalization and telemetry (owner: Codex, updated: 2026-04-19)
### Stream: Live event mapping
13. [TODO] Нормализовать assistant/reasoning deltas в существующие provider events; scope: `packages/Codex_AppServer_Module/src/app-server/events/app-server-event-normalizer.ts`, `packages/Codex_AppServer_Module/src/app-server/events/assistant-message-buffer.ts`, `packages/Codex_AppServer_Module/src/app-server/events/reasoning-buffer.ts`; ожидаемый commit message: `feat: normalize codex app-server live events`
14. [TODO] Git Commit: `feat: normalize codex app-server live events` (hash: TBD)

### Stream: Replay and usage sync
15. [TODO] Добавить history, telemetry и raw diagnostics layer; scope: `packages/Codex_AppServer_Module/src/app-server/history/thread-history-reader.ts`, `packages/Codex_AppServer_Module/src/app-server/usage/usage-sync.ts`, `packages/Codex_AppServer_Module/src/app-server/diagnostics/raw-jsonrpc-log-store.ts`; ожидаемый commit message: `feat: add codex app-server replay telemetry`
16. [TODO] Git Commit: `feat: add codex app-server replay telemetry` (hash: TBD)

## Phase 5 — Release switch and validation (owner: Codex, updated: 2026-04-19)
### Stream: Build seam switch
17. [TODO] Переключить workspace/build pipeline на новый Codex implementation; scope: `packages/core/package.json`, `scripts/build-codex-module.sh`, `scripts/build-core.sh`; ожидаемый commit message: `build: switch codex module packaging`
18. [TODO] Git Commit: `build: switch codex module packaging` (hash: TBD)

### Stream: Runtime docs and release notes
19. [TODO] Синхронизировать архитектурные и release-доки под app-server line и будущую версию `1.2.22`; scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`; ожидаемый commit message: `docs: prepare 1.2.22 codex app-server release`
20. [TODO] Git Commit: `docs: prepare 1.2.22 codex app-server release` (hash: TBD)

### Stream: Release build
21. [TODO] Выполнить таргетные сборки затронутых пакетов, затем `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, зафиксировать release-line `1.2.22` и обновить `todo-plan.md`; scope: `packages/Codex_AppServer_Module`, `packages/core`, `release manifests/versioned artifacts`; ожидаемый commit message: `build: release 1.2.22`
22. [TODO] Git Commit: `build: release 1.2.22` (hash: TBD)
