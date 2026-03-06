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
1. [DONE] Ввести `outboundAttemptId` в PM `dialog:send` path и протащить его через bridge message types, чтобы у каждой отправки был единый correlation key с самого клика `Send`; `dialog:send` payload теперь содержит отдельный `outboundAttemptId`, сгенерированный в PM до отправки в Core bridge (scope: `src/client/project-manager/services/dialog-api.ts`, `src/client/project-manager/core-stream-message-types.ts`, `packages/core/src/remote-bridge/types.ts`; actual commit: `feat(trace): add outbound attempt id to dialog send contract`).
2. [DONE] Git Commit: `feat(trace): add outbound attempt id to dialog send contract` (hash: `82682d06`)
3. [DONE] Добавить Core bridge trace для событий `received/scope_resolved/chain_resolved/session_resolved/ack`, чтобы путь PM -> Core больше не был "чёрным ящиком"; новый file-backed trace пишет JSONL в `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`, а `RemoteBridge` и `SessionRequestHandler` фиксируют ключевые этапы разрешения submit до `ack` (scope: `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/telemetry/`; actual commit: `feat(core): add dialog send trace log`).
4. [DONE] Git Commit: `feat(core): add dialog send trace log` (hash: `8015c9c4`)

### Stream 1: Core handler trace
1. [DONE] Протрассировать в Core граничные точки `handleMessage`: вход, local history append start/success/failure, adapter dispatch start/success/failure; писать их в `~/.codeai-hub/logs/core/dialog-send-trace.jsonl` в JSONL-формате. Внутренний trace-context для `dialog:send` теперь проходит через `handleMessage`, но срезается до provider dispatch, чтобы `outboundAttemptId` не утекал в Codex turn options (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/telemetry/`; actual commit: `feat(core): trace outbound message handling stages`).
2. [DONE] Git Commit: `feat(core): trace outbound message handling stages` (hash: `1d3074bd`)
3. [DONE] Добавить regression tests на Core trace schema и гарантировать, что при падении на каждом из этапов последняя успешная точка видна в логах; harness теперь проверяет success path, history append failure и adapter dispatch failure, а также отсутствие утечки internal trace-context в provider turn options (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `packages/core/src/telemetry/`; actual commit: `test(core): cover dialog send trace stages`).
4. [DONE] Git Commit: `test(core): cover dialog send trace stages` (hash: `0c20df56`)

### Stream 2: Codex transport trace
1. [DONE] Протащить `outboundAttemptId` в Codex adapter/SDK manager/message processor и логировать его в `processor.enqueue/dequeue/turn.begin/run_streamed.begin/first_event` внутри существующего `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`; для фактической доставки добавлен минимальный codex-only bridge на Core стыке, который вкладывает internal key в provider turn options и снимается в `CodexProviderAdapter` до SDK `runOptions`, так что correlation проходит до transport trace, но не утекает в `thread.runStreamed(...)` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/Codex_Module/src/provider/codex-provider-adapter.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`; actual commit: `feat(codex): correlate outbound attempts in sdk trace`).
2. [DONE] Git Commit: `feat(codex): correlate outbound attempts in sdk trace` (hash: `1e2dc939`)
3. [DONE] Расширить patched `codex exec` trace событиями `child.spawned/stdin_write_started/stdin_write_finished/stdout_first_line/child.exit/child.killed`, чтобы стало видно точное место смерти submit внутри transport path; `message-processor` теперь вкладывает временный internal transport trace callback в `runOptions`, а patched `codex exec` снимает его до CLI и пишет boundary events в existing session log, включая ранний abort path без unhandled rejection. Отдельная правка `session-logger.ts` не понадобилась, потому что существующий `logSDKEvent(...)` уже достаточен как sink для этих событий (scope: `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`; actual commit: `feat(codex): trace child process send boundaries`).
4. [DONE] Git Commit: `feat(codex): trace child process send boundaries` (hash: `3bed35fe`)

### Stream 3: PM diagnostics visibility and tests
1. [DONE] Добавить PM trace событий `clicked/ws_dispatched/ack_received/history_refresh_requested/history_refresh_result`, но писать их не в браузерный файл, а в Core trace через существующий bridge path; для этого добавлен PM-side trace helper, generic outbound queue support для служебного `dialog:trace`, registration attempt на `dialog-api` уровне и core bridge handler, который пишет `pm.dialog_send.*` в уже существующий `~/.codeai-hub/logs/core/dialog-send-trace.jsonl` (scope: `src/client/project-manager/services/dialog-api.ts`, `src/client/project-manager/services/dialog-send-trace-client.ts`, `src/client/project-manager/services/outgoing-message-queue.ts`, `src/client/project-manager/api.ts`, `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/index.ts`; actual commit: `feat(pm): trace dialog send lifecycle to core log`).
2. [DONE] Git Commit: `feat(pm): trace dialog send lifecycle to core log` (hash: `21e6feeb`)
3. [DONE] Добавить PM/Core regression tests, которые проверяют сквозную трассировку одного `outboundAttemptId` через click -> core ack -> history refresh; PM runtime test вынесен в отдельный файл, чтобы не нарушить лимит 300 строк, а core-side regression добавлен в `RemoteBridge` test, потому что именно там живёт `dialog:trace` handler (scope: `src/client/project-manager/components/sessions/dialog-send-trace-client.test.ts`, `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`, `packages/core/src/remote-bridge/index.test.ts`; actual commit: `test(pm): cover outbound attempt trace flow`).
4. [DONE] Git Commit: `test(pm): cover outbound attempt trace flow` (hash: `a09aadda`)

### Stream 4: SSOT sync and targeted verification
1. [DONE] Синхронизировать SSOT и docs index после реализации: diagnostics contract теперь явно описывает bridge message `dialog:trace`, PM lifecycle events `pm.dialog_send.*`, Codex child-boundary events `outbound.child.*` и SSOT-логи `~/.codeai-hub/logs/core/dialog-send-trace.jsonl` + `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`; синхронизированы `SystemArchitecture.md`, `Docs_Index.md`, `Modules/Codex.md` и сам diagnostics contract (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`; actual commit: `docs(trace): sync workflow submit diagnostics contract`).
2. [DONE] Git Commit: `docs(trace): sync workflow submit diagnostics contract` (hash: `b626e192`)
3. [DONE] Прогнать таргетные проверки затронутых контуров: `npm run build:project-manager`, `npm run build:core`, `npm run build --workspace=@codeai-hub/codex-module`, `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler.test.ts packages/core/src/remote-bridge/index.test.ts src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts src/client/project-manager/components/sessions/dialog-send-trace-client.test.ts`; дополнительно двумя inline harness-проверками подтверждено, что один `outboundAttemptId` проходит через `processor.enqueue/dequeue/turn.begin/run_streamed.begin/first_event`, а fake child process даёт ожидаемую boundary-цепочку `stdin_write_started -> child.spawned -> stdin_write_finished -> stdout_first_line -> child.killed -> child.exit` (scope: `packages/core/`, `packages/Codex_Module/`, `src/client/project-manager/`; actual commit: `test(trace): verify workflow submit diagnostics chain`).
4. [DONE] Git Commit: `test(trace): verify workflow submit diagnostics chain` (hash: `0650fafb`)

### Stream 5: Release build по инструкции
1. [DONE] Перед релизом актуализировать документы под финальную версию: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`, `SystemArchitecture.md` и diagnostics contract; версия релиза отражена в `README.md`/`CHANGELOG.md`, а SSOT уточняет, что `v1.1.716` — первая release line с обязательным end-to-end diagnostics trail для workflow submit path (scope: `README.md`, `CHANGELOG.md`, `doc/`; actual commit: `docs(release): sync workflow submit diagnostics notes`).
2. [DONE] Git Commit: `docs(release): sync workflow submit diagnostics notes` (hash: `54e17edb`)
3. [DONE] На чистом дереве выполнен `./scripts/build-all.sh` без флагов; unified version поднята до `1.1.716`, пересобраны provider/core/ui/launcher артефакты, а локальные tarball'ы обновлены в `~/.codeai-hub/releases/` под diagnostics release line (scope: release pipeline, all packages; actual commit: `chore(release): build-all v1.1.716 workflow submit diagnostics`).
4. [DONE] Git Commit: `chore(release): build-all v1.1.716 workflow submit diagnostics` (hash: `b7a2e71f`)
5. [TODO] На чистом дереве выполнить `./scripts/build-release.sh --use-current-version` без флагов; проверить строки `Verifying SDK exclusions`, `Removing dev dependencies before packaging...`, `✅ Package created` и зафиксировать артефакты релиза (scope: release pipeline, VSIX packaging; expected commit: `chore(release): build-release v1.1.716 workflow submit diagnostics`).
6. [TODO] Git Commit: `chore(release): build-release v1.1.716 workflow submit diagnostics` (hash: TBD)
7. [TODO] Обновить `doc/Sessions/Session066.md`, заархивировать завершённый `todo-plan.md` в `doc/TODO/Archive/` и открыть следующий план только после успешного релиза и чистого дерева (scope: `doc/Sessions/`, `doc/TODO/`; expected commit: `docs(session): record workflow submit diagnostics release`).
8. [TODO] Git Commit: `docs(session): record workflow submit diagnostics release` (hash: TBD)
