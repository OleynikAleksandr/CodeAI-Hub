# Стек Claude для CodeAI-Hub

**Status:** Active (one-shot + provider-home auth bootstrap + ratelimit usage probe)
**Updated:** 2026-02-17 (release 1.1.622)
**Stack Version:** 1.1.622
**Owner:** Oleksandr + Codex

## Обзор
`@codeai-hub/claude-module` — провайдерный модуль Claude для Core. Актуальный runtime-контур сочетает:
- one-shot turn execution (`query(...)` на каждый turn);
- FIFO очередь turn-ов (user + internal continuity);
- deterministic lifecycle (`turn_started`, `turn_completed`, `turn_failed`);
- resume через `options.resume=<providerSessionId>` без fork;
- изоляцию сессий в provider-home и preflight auth gate перед первой рабочей сессией.

## Контракт с Core
Модуль реализует стандартный provider-контракт:
- `initialize()`
- `createSession(workspacePath?)`
- `resumeSession(providerSessionId, workspacePath?)`
- `sendMessage(sessionId, content, turnOptions?)`
- `closeSession(sessionId)`
- `subscribe(sessionId, listener)`

Source-of-truth привязки сессии:
- `providerSessionId` берётся из SDK stream-сообщений (`session_id`);
- file discovery используется только как best-effort диагностика для контекстных readers.

## Ключевые компоненты
- `ClaudeProviderAdapter` (`packages/Claude_Module/src/provider/claude-provider-adapter.ts`)
  - фасад модуля для Core;
  - lifecycle bind/alias routing;
  - preflight bootstrap вызов перед первой рабочей сессией.

- `SDKAuthManager` (`packages/Claude_Module/src/auth/sdk-auth-manager.ts`)
  - provider-home auth state/link migration;
  - OAuth token bootstrap (env -> credentials files -> platform stores);
  - `CLAUDE_CODE_OAUTH_TOKEN` injection в runtime env;
  - non-interactive preflight probe + retry и явный recovery hint.

- `ClaudeSDKManager` (`packages/Claude_Module/src/sdk/claude-sdk-manager.ts`)
  - инициализация SDK/CLI;
  - сборка query options (`env`, `model`, thinking, output schema);
  - создание/resume провайдерных сессий.

- `SDKMessageProcessor` (`packages/Claude_Module/src/messaging/message-processor.ts`)
  - обработка stream-сообщений SDK;
  - turn lifecycle;
  - token/context/usage refresh pipeline.

- `ClaudeContextUsageReader` (`packages/Claude_Module/src/sdk/claude-context-usage-reader.ts`)
  - чтение `/context` snapshot для `token_usage`.

- `ClaudeUsageLimitsReader` (`packages/Claude_Module/src/sdk/claude-usage-limits-reader.ts`)
  - lightweight probe в `https://api.anthropic.com/v1/messages` (`anthropic-beta: oauth-2025-04-20`);
  - парсинг headers `anthropic-ratelimit-unified-5h-*` и `anthropic-ratelimit-unified-7d-*`;
  - эмит `usage_limits` в прежнем UI-контракте (`session` + `weekly all models`).

## Auth + Runtime окружение (Phase 146)
### Provider-home
Claude запускается с:
- `HOME=~/.codeai-hub/providers/claude/home`
- `CLAUDE_USE_CLI_AUTH=true`
- `CLAUDE_SUBSCRIPTION_MODE=true`
- `CLAUDE_CODE_OAUTH_TOKEN=<resolved token>` (если доступен)

Терминальный пользовательский `HOME` не меняется и продолжает писать сессии в `~/.claude/*`.

### Auth bootstrap порядок
1. Проверка/линковка auth state (`.claude.json`) в provider-home.
2. Миграция `~/.claude/.credentials.json` в provider-home (если нужно).
3. OAuth token resolution с fallback-приоритетом:
   - env `CLAUDE_CODE_OAUTH_TOKEN`;
   - provider-home credentials file;
   - legacy credentials file;
   - platform store (`security`/Keychain на macOS, `secret-tool` на Linux, Credential Manager best-effort на Windows).
4. Preflight non-interactive probe в provider-home.
5. При фейле: refresh token bootstrap + повторный probe.
6. При повторном фейле: явный recovery-hint
   `HOME=~/.codeai-hub/providers/claude/home claude login`.

## One-shot lifecycle
1. Core создаёт hub session (временный id).
2. `sendMessage` ставит turn в очередь и запускает отдельный `query(...)`.
3. На старте turn эмитится `turn_started`.
4. В процессе публикуются `assistant`, `dialog_message(thinking)`, `stream_event`.
5. Финал: `turn_completed` или `turn_failed`.
6. При первом реальном `session_id` выполняется promotion `temp -> real`.
7. Для resumed session каждый turn идёт через `options.resume=<providerSessionId>`.

## Хранение и логи
- Settings: `~/.codeai-hub/settings/settings.json`
- Claude provider-home sessions: `~/.codeai-hub/providers/claude/home/.claude/projects/<workspaceSlug>/<sessionId>.jsonl`
- Терминальные Claude sessions (вне CodeAI Hub): `~/.claude/projects/<workspaceSlug>/<sessionId>.jsonl`
- Claude SDK logs: `~/.codeai-hub/logs/claude/sdk-claude-<sessionId>.jsonl`
- Unified session history (UI): `~/.codeai-hub/sessions/<workspaceKey>/claudeCodeCli/<dialogId>.jsonl`, где `<workspaceKey>` = `sanitize(workspacePath)`. Это отдельный слой хранения, который Core использует для восстановления истории сообщений в Project Manager.
  - `providerSessionId` используется для resume, но имя файла истории должно быть стабильным `dialogId` (1.1.585+), иначе после rollover/resume история распадается на сегменты.

## Диагностика
- Ошибки SDK/stream пробрасываются в provider error channel.
- Ошибки context/usage readers не блокируют turn completion (warning-only).
- Preflight auth ошибки возвращают user-facing recovery hint для provider-home login.

## Continuity Rollover Smoke Checklist (Phase 152)
1. Выполнить обычный Claude turn из Project Manager.
2. Форсировать trigger continuity (например временно поднять remaining% threshold для быстрого теста).
3. Убедиться, что Core отправляет internal `Create Report` в ту же provider session (resume), и до создания новой сессии появляется отчёт на диске.
4. Если handoff отчёт не появляется:
   - Core должен выполнить retry (без создания новой provider session).
   - После 2 неуспешных попыток UI не должен зависать в `Agent is working… Please wait.`: input разблокирован, а placeholder показывает `Continuity failed: <reason: error>`.
