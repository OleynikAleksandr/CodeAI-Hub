# Claude Module — One-Shot Session Architecture (Codex Parity)

**Status:** Approved (execution baseline for Phase 98)
**Updated:** 2026-02-06
**Owner:** Oleksandr + Codex

---

## 1) Problem

Текущий `Claude_Module` работает в режиме streaming input (`query(prompt: AsyncGenerator<SDKUserMessage>)`) и держит long-lived query process на сессию.

После серии rollback-итераций требуется перейти на схему, аналогичную `Codex_Module`:
- one-shot turn execution (один user turn = один `query(...)` запуск);
- детерминированная очередь turn-ов;
- единый контракт lifecycle событий (`turn_started`, `turn_completed`, `turn_failed`);
- полная совместимость с Core Session Continuity и UI Virtual Conversation.

Критично:
- сохранить все флаги полного доступа и текущие runtime-настройки;
- не потерять логирование;
- при `resume` не создавать новый provider-session JSONL, а продолжать текущую session history.

---

## 2) Goals

1. Перевести Claude integration на one-shot обработку turn-ов по аналогии с Codex queue/processor model.
2. Сохранить текущий контракт событий для Core/UI:
- `turn_started` / `turn_completed` / `turn_failed`;
- `assistant`, `dialog_message(thinking)`, `stream_event(token_usage)`, `stream_error`.
3. Сохранить полный доступ и рабочие флаги Claude SDK:
- `permissionMode: "bypassPermissions"`
- `allowDangerouslySkipPermissions: true`
- `additionalDirectories`
- `settingSources`
- `environment`
- `pathToClaudeCodeExecutable`
- `includePartialMessages`
- `model`, thinking options, output schema.
4. Обеспечить resume без форка новой сессии:
- использовать `options.resume=<sessionId>`;
- не использовать `forkSession=true`;
- provider session jsonl должен дописываться в текущую сессию.
5. Сохранить/улучшить логирование:
- логи Claude продолжают писаться в `~/.codeai-hub/logs/claude/`;
- без потери записей на resume/rebind;
- без ротации в новый файл при том же `providerSessionId`.
6. Зафиксировать source-of-truth для session binding:
- источник `providerSessionId` только из SDK stream событий;
- `session-file-discovery` не влияет на binding и используется только как best-effort диагностика.
7. Сохранить compatibility с turn/handoff контрактом Core/UI:
- one-shot Claude обязан эмитить `turn_started`/`turn_completed`/`turn_failed` в детерминированной последовательности;
- continuity handoff (`handoff:start`/`handoff:ready`) остаётся stream-only и не попадает в user-facing диалог.

---

## 3) Non-goals

1. Не менять Core continuity orchestration (`FlowNodeContinuityFacade`, rollover templates, report watcher).
2. Не менять UI/Project Manager контракты сверх необходимых адаптаций.
3. Не менять release/versioning flow.

---

## 4) External SDK Contract (Claude Agent SDK)

Опираемся на `@anthropic-ai/claude-agent-sdk@0.2.34`:

1. One-shot: `query({ prompt: string, options })`.
2. Resume existing session: `options.resume = <sessionId>`.
3. Не форкать resume: не включать `forkSession` (по умолчанию false).
4. Каноничный источник `session_id`: stream messages (`system/init`, `assistant`, `result`, etc.).
5. Streaming input control requests (`interrupt/setModel/...`) не требуются для one-shot архитектуры.

---

## 5) Target Runtime Model

### 5.1 Session model

Для каждой hub-сессии Claude:
- хранится очередь user/internal turn-ов;
- в каждый момент времени выполняется максимум 1 turn;
- каждый turn создаёт отдельный `query(...)` iterator;
- iterator читается до завершения (`result`/ошибка/abort), затем берётся следующий turn.

### 5.2 Provider session identity

1. Первый turn новой сессии:
- стартуем с временным hub id (`temp_*`),
- как только приходит реальный `session_id`, делаем promotion `temp -> real`.

2. Resume:
- `createResumedSession(workspace, providerSessionId)`;
- все следующие turn-ы используют `options.resume=providerSessionId`;
- идентификатор остаётся стабильным, новый provider jsonl не создаётся.

### 5.3 Continuity compatibility invariants

1. На каждый user-visible turn должен быть ровно один lifecycle завершения (`turn_completed` или `turn_failed`).
2. `turn_completed` эмитится после финального `result` SDK.
3. `token_usage` обновляется после `result` без изменения публичного event shape.
4. Internal continuity prompts (`sendInternalMessage` из Core) не должны ломать очередь и не должны засорять user-facing stream.
5. Повторный `resume` той же сессии не должен создавать новый provider session id и не должен приводить к перезаписи существующего лог-файла.

---

## 6) Module Changes (high level)

### 6.1 `session/*`

- Сохранить существующий `SDKSessionManager`, но перевести его роль на очередь turn-ов (как в Codex).
- Убрать зависимость от единого долгоживущего `messageGenerator/queryInstance` как primary transport.

### 6.2 `sdk/claude-sdk-manager.ts`

- Убрать ленивый старт long-lived query на первую отправку.
- На каждый `sendMessage` ставить turn в queue у `SDKMessageProcessor`.
- Собирать `query` options per turn (сохранить все текущие flags).
- Resume always uses `resume=<providerSessionId>` (no fork).

### 6.3 `messaging/message-processor.ts`

- Добавить consumeQueue/processTurn по аналогии с Codex.
- Перенести lifecycle accounting pending turn-ов на turn-context, а не на messageGenerator.
- Сохранять текущую обработку:
- assistant text extraction;
- structured output parsing;
- thinking extraction;
- token usage refresh.

### 6.4 `messaging/session-file-discovery.ts`

- Убрать как source of truth для session id.
- Session ID берём из SDK events.
- Допускается оставить файл только как best-effort diagnostics utility (без влияния на binding).

### 6.5 `logging/sdk-session-logger.ts`

- Убрать truncate-on-start для уже существующей committed session.
- При resume/rebind в тот же `providerSessionId` лог дописывается (`append`) в существующий файл.
- Rename/temp promotion не должны приводить к потере накопленного буфера.

---

## 7) Event Contract Matrix (must stay stable)

1. Core-facing lifecycle:
- `turn_started`
- `turn_completed`
- `turn_failed`

2. Dialog messages:
- `assistant`
- `dialog_message` (`thinking`)

3. Stream events:
- `stream_event` with `data.kind=token_usage`
- `stream_event` with `data.kind=structured_output`

4. Errors:
- `stream_error`
- `error` through adapter error channel

---

## 8) Risks & Mitigations

1. Риск: race между user turn и internal continuity turn.
- Mitigation: единая FIFO queue и explicit `internal` flag.

2. Риск: duplicate lifecycle events.
- Mitigation: per-turn lifecycle state machine (`started`, `ended`).

3. Риск: потеря логов при session promotion/resume.
- Mitigation: append-safe logger semantics + targeted tests.

4. Риск: разрыв continuity из-за смены provider session id.
- Mitigation: source-of-truth only from SDK `session_id`, deterministic promotion logic.

---

## 9) Verification Strategy

Обязательные проверки перед merge:
1. Unit tests (Claude message processor/session/logger) на:
- one-shot queue order,
- lifecycle событий,
- resume reuses same provider session id,
- no new jsonl on resume.
2. Контрактные проверки с Core continuity:
- rollover внутренний prompt проходит через internal turn без UI-регрессии,
- `turn_state` в Core остаётся корректным.
3. QA smoke:
- Claude session -> resume -> continuity rollover -> resume segment.

---

## 10) Acceptance Criteria

1. Claude работает в one-shot turn model (без streaming input prompt generator).
2. Все continuity сценарии работают без изменений Core контрактов.
3. Все ключевые флаги полного доступа сохранены.
4. Логи Claude продолжают писаться; resume не создаёт новый session jsonl и не обнуляет лог.
5. Поведение сессий Claude функционально аналогично схеме Codex, с учётом специфики Claude SDK.
