# Стек Claude для CodeAI-Hub

**Версия стека:** 1.1.514  
**Обновлено:** 2026-02-06  
**Статус:** Active (one-shot session model)

## Обзор
`@codeai-hub/claude-module` — провайдерный модуль Claude для Core. Начиная с Phase 98 модуль работает в **one-shot turn model**:
- один turn = один `query(...)` запуск;
- очередь turn-ов FIFO (user + internal continuity);
- lifecycle-события turn (`turn_started`, `turn_completed`, `turn_failed`) эмитятся детерминированно;
- resume использует тот же `providerSessionId` через `options.resume` без `forkSession`.

Цель модели: parity с Codex orchestration при сохранении Claude-specific SDK опций и continuity-контракта Core/UI.

## Контракт с Core
Модуль реализует стандартный provider-контракт CodeAI-Hub:
- `initialize()`
- `createSession(workspacePath?)`
- `resumeSession(providerSessionId, workspacePath?)`
- `sendMessage(sessionId, content, turnOptions?)`
- `closeSession(sessionId)`
- `subscribe(sessionId, listener)`

Source-of-truth привязки сессии:
- `providerSessionId` берётся из SDK stream-сообщений (`session_id`).
- File discovery (`session-file-discovery`) не является binding-источником и используется только как best-effort диагностика.

## Ключевые компоненты
- `ClaudeProviderAdapter` (`packages/Claude_Module/src/provider/claude-provider-adapter.ts`)
  - фасад модуля для Core;
  - подписки/роутинг событий;
  - alias-резолвинг при promotion `temp -> real sessionId`.

- `ClaudeSDKManager` (`packages/Claude_Module/src/sdk/claude-sdk-manager.ts`)
  - инициализация SDK/CLI;
  - сборка query options на turn;
  - создание/resume провайдерных сессий;
  - применение full-access runtime флагов.

- `SDKMessageProcessor` (`packages/Claude_Module/src/messaging/message-processor.ts`)
  - обработка stream-сообщений SDK;
  - эмиссия `assistant`, `dialog_message(thinking)`, `stream_event`;
  - lifecycle turn-событий;
  - token usage refresh pipeline.

- `SDKSessionManager` + lifecycle (`packages/Claude_Module/src/session/*`)
  - реестр активных сессий;
  - контроллеры очереди turn-ов;
  - shutdown/cleanup.

- `SDKSessionLoggerFacade` (`packages/Claude_Module/src/logging/sdk-session-logger.ts`)
  - JSONL-логирование в `~/.codeai-hub/logs/claude/`;
  - append-safe поведение при resume/rebind.

- `ClaudeContextUsageReader` (`packages/Claude_Module/src/sdk/claude-context-usage-reader.ts`)
  - чтение `/context` usage snapshot для `token_usage` stream events.

## One-shot lifecycle
1. Core создаёт hub session (временный id).
2. `sendMessage` ставит turn в очередь и запускает отдельный `query(...)` для этого turn.
3. На старте turn эмитится `turn_started`.
4. Во время обработки публикуются:
   - `assistant` сообщения,
   - `dialog_message` (`thinking`),
   - `stream_event` (`structured_output`, `token_usage`).
5. По финальному SDK `result` эмитится `turn_completed`; при ошибке — `turn_failed`.
6. При получении реального `session_id` происходит promotion `temp -> real` с `sessionIdChanged`.
7. Для resumed session все turn-ы используют `options.resume=<providerSessionId>`.

## Continuity-совместимость
- Internal continuity prompts (`sendInternalMessage` из Core) проходят через ту же очередь turn-ов.
- Internal turn-ы не должны засорять user-facing диалоговые события.
- Handoff lifecycle (`handoff:start`/`handoff:ready`) живёт на Core уровне как `session:stream` события.

## Runtime flags (must keep)
При формировании turn options модуль сохраняет рабочие флаги полного доступа:
- `permissionMode: "bypassPermissions"`
- `allowDangerouslySkipPermissions: true`
- `additionalDirectories`
- `settingSources`
- `environment`
- `pathToClaudeCodeExecutable`
- `includePartialMessages`
- `model` + thinking + output schema (если запрошены)

## Хранение и логи
- Settings: `~/.codeai-hub/settings/settings.json`
- Provider sessions: `~/.codeai-hub/sessions/<workspace>/<provider>/<providerSessionId>.jsonl`
- Claude logs: `~/.codeai-hub/logs/claude/sdk-claude-<sessionId>.jsonl`

Требование: при resume/rebind для того же `providerSessionId` лог **дописывается**, а не переинициализируется с truncate.

## Ошибки и диагностика
- Ошибки SDK/stream пробрасываются в provider error channel (`stream_error`/`error`).
- Ошибки обработчика turn не должны ломать очередь всей сессии.
- Context usage read failures логируются как warning и не блокируют turn completion.
