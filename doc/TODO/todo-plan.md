# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
  - `doc/Sessions/Session065.md`
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Release stream закрывается только на чистом дереве и строго по `Release Build Checklist`.

---

## Phase 292 — Workflow submit diagnostics trace for Codex (owner: Oleksandr, updated: 2026-03-06)

### Stream 0: PM/Core correlation id
1. [TODO] Ввести `outboundAttemptId` в PM `dialog:send` path и протащить его через bridge message types, чтобы у каждой отправки был единый correlation key с самого клика `Send` (scope: `src/client/project-manager/services/dialog-api.ts`, `src/client/project-manager/core-stream-message-types.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit: `feat(trace): add outbound attempt id to dialog send contract`).
2. [TODO] Git Commit: `feat(trace): add outbound attempt id to dialog send contract` (hash: TBD)
3. [TODO] Добавить Core bridge trace для событий `received/scope_resolved/chain_resolved/session_resolved/ack`, чтобы путь PM -> Core больше не был "чёрным ящиком" (scope: `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/telemetry/`; expected commit: `feat(core): add dialog send trace log`).
4. [TODO] Git Commit: `feat(core): add dialog send trace log` (hash: TBD)

### Stream 1: Core handler trace
1. [TODO] Протрассировать в Core граничные точки `handleMessage`: вход, local history append start/success/failure, adapter dispatch start/success/failure; писать их в `~/.codeai-hub/logs/core/dialog-send-trace.jsonl` в JSONL-формате (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/telemetry/`; expected commit: `feat(core): trace outbound message handling stages`).
2. [TODO] Git Commit: `feat(core): trace outbound message handling stages` (hash: TBD)
3. [TODO] Добавить regression tests на Core trace schema и гарантировать, что при падении на каждом из этапов последняя успешная точка видна в логах (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `packages/core/src/telemetry/`; expected commit: `test(core): cover dialog send trace stages`).
4. [TODO] Git Commit: `test(core): cover dialog send trace stages` (hash: TBD)

### Stream 2: Codex transport trace
1. [TODO] Протащить `outboundAttemptId` в Codex adapter/SDK manager/message processor и логировать `enqueue/dequeue/turn.begin/run_streamed.begin/first_event` в существующий `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl` (scope: `packages/Codex_Module/src/provider/codex-provider-adapter.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit: `feat(codex): correlate outbound attempts in sdk trace`).
2. [TODO] Git Commit: `feat(codex): correlate outbound attempts in sdk trace` (hash: TBD)
3. [TODO] Расширить patched `codex exec` trace событиями `child.spawned/stdin_write_started/stdin_write_finished/stdout_first_line/child.exit/child.killed`, чтобы стало видно точное место смерти submit внутри transport path (scope: `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`, `packages/Codex_Module/src/logging/session-logger.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit: `feat(codex): trace child process send boundaries`).
4. [TODO] Git Commit: `feat(codex): trace child process send boundaries` (hash: TBD)

### Stream 3: PM diagnostics visibility and tests
1. [TODO] Добавить PM trace событий `clicked/ws_dispatched/ack_received/history_refresh_requested/history_refresh_result`, но писать их не в браузерный файл, а в Core trace через существующий bridge path (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`; expected commit: `feat(pm): trace dialog send lifecycle to core log`).
2. [TODO] Git Commit: `feat(pm): trace dialog send lifecycle to core log` (hash: TBD)
3. [TODO] Добавить PM/Core regression tests, которые проверяют сквозную трассировку одного `outboundAttemptId` через click -> core ack -> history refresh (scope: `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `test(pm): cover outbound attempt trace flow`).
4. [TODO] Git Commit: `test(pm): cover outbound attempt trace flow` (hash: TBD)

### Stream 4: SSOT sync and targeted verification
1. [TODO] Синхронизировать SSOT и docs index после реализации: новый diagnostics contract, `SystemArchitecture.md`, `Docs_Index.md`, `Modules/Codex.md`, а также явно описать, что SSOT-логи диагностики лежат в `~/.codeai-hub/logs/core/dialog-send-trace.jsonl` и `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl` (scope: `doc/SolidWorks-WorkFlow/System/`, `doc/SolidWorks-WorkFlow/Modules/`, `doc/SolidWorks-WorkFlow/Contracts/`; expected commit: `docs(trace): sync workflow submit diagnostics contract`).
2. [TODO] Git Commit: `docs(trace): sync workflow submit diagnostics contract` (hash: TBD)
3. [TODO] Прогнать таргетные проверки затронутых контуров: Core, Codex module, PM tests; вручную сверить, что по искусственно воспроизведённому stalled-turn кейсу из логов читается точная последняя успешная точка (scope: `packages/core/`, `packages/Codex_Module/`, `src/client/project-manager/`; expected commit: `test(trace): verify workflow submit diagnostics chain`).
4. [TODO] Git Commit: `test(trace): verify workflow submit diagnostics chain` (hash: TBD)

### Stream 5: Release build по инструкции
1. [TODO] Перед релизом актуализировать документы под финальную версию: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`, `SystemArchitecture.md` и diagnostics contract; версия релиза должна быть отражена в документах до запуска сборки (scope: `README.md`, `CHANGELOG.md`, `doc/`; expected commit: `docs(release): sync workflow submit diagnostics notes`).
2. [TODO] Git Commit: `docs(release): sync workflow submit diagnostics notes` (hash: TBD)
3. [TODO] На чистом дереве выполнить `./scripts/build-all.sh` без флагов; если сборка падает, исправления вносить и повторно запускать только этот скрипт (scope: release pipeline, all packages; expected commit: `chore(release): build-all v1.1.716 workflow submit diagnostics`).
4. [TODO] Git Commit: `chore(release): build-all v1.1.716 workflow submit diagnostics` (hash: TBD)
5. [TODO] На чистом дереве выполнить `./scripts/build-release.sh --use-current-version` без флагов; проверить строки `Verifying SDK exclusions`, `Removing dev dependencies before packaging...`, `✅ Package created` и зафиксировать артефакты релиза (scope: release pipeline, VSIX packaging; expected commit: `chore(release): build-release v1.1.716 workflow submit diagnostics`).
6. [TODO] Git Commit: `chore(release): build-release v1.1.716 workflow submit diagnostics` (hash: TBD)
7. [TODO] Обновить `doc/Sessions/Session066.md`, заархивировать завершённый `todo-plan.md` в `doc/TODO/Archive/` и открыть следующий план только после успешного релиза и чистого дерева (scope: `doc/Sessions/`, `doc/TODO/`; expected commit: `docs(session): record workflow submit diagnostics release`).
8. [TODO] Git Commit: `docs(session): record workflow submit diagnostics release` (hash: TBD)
