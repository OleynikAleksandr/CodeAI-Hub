# Архитектура Claude Stop/Resume и Live Thinking Streaming

**Status:** Accepted (2026-04-16)
**Created:** 2026-04-16
**Updated:** 2026-04-16
**Owner:** Oleksandr + Codex
**Scope:** Два связанных дефекта в `Claude` provider path: падение core после `Stop`/`Continue` и запаздывающий показ `Thinking`, когда reasoning доходит до UI только финальным монолитным блоком вместо живого incremental stream.

**Связанные документы:**

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`

---

## 1. Проблема

В текущем `Claude` runtime одновременно проявились два дефекта одного класса: provider path не доводит корректно до конца промежуточные состояния turn lifecycle.

**Дефект A: `Stop` прерывает turn, но может уронить core.**

Подтверждённый сценарий:

1. Пользователь нажимает `Stop` в `Project Manager`.
2. Claude SDK штатно прерывает активный поток и возвращает `error_during_execution` / `terminal_reason=aborted_streaming`.
3. После shutdown late error продолжает идти по `session.eventEmitter.emit("error", ...)`.
4. У Claude adapter не было собственного error-bridge.
5. Если listener уже снят, Node получает `ERR_UNHANDLED_ERROR`, и core падает.

Пользовательский requirement:

- `Stop` должен останавливать только текущий turn, а не убивать core.
- Следующее сообщение пользователя должно идти в resume той же workflow session.

**Дефект B: `Claude Thinking` приходит в UI слишком поздно и большими пачками.**

Подтверждённый сценарий:

1. Во время длинного reasoning пользователь видит только working-state.
2. Затем в диалог падает большой англоязычный блок `Thinking`.
3. Только после этого запускается нарезка и перевод.

Проблема не в нашей нарезке thinking-плашек. Нарезка нужна и должна сохраниться. Проблема в том, что `Claude` path почти не использует upstream `thinking_delta` и просыпается только на финальном собранном `thinking` block.

---

## 2. Подтверждённые факты

### 2.1. `Stop` сам по себе уже работает корректно на уровне SDK

По диагностическим логам Claude SDK:

- interrupt фиксируется как user-driven;
- SDK возвращает `error_during_execution`;
- `terminal_reason=aborted_streaming` является ожидаемым outcome активного остановленного turn-а.

Следовательно, корневая проблема была не в самом interrupt, а в том, как CodeAI Hub обрабатывал late error после shutdown.

### 2.2. Late error path у Claude был асимметричен относительно Codex

В текущем коде на момент расследования:

- `packages/Claude_Module/src/messaging/message-processor.ts` эмитил `error` даже после shutdown;
- `packages/Claude_Module/src/provider/claude-provider-adapter.ts` не мостил `session.eventEmitter.on("error", ...)` в adapter payload;
- `closeSession()` снимал listeners, после чего late `error` мог стать unhandled.

### 2.3. Current `Claude` thinking routing слишком поздний

`packages/Claude_Module/src/messaging/claude-stream-event-router.ts` сейчас:

- игнорирует semantic use of `content_block_delta/thinking_delta`;
- эмитит visible thinking из финального `message.message.content`;
- хранит только связь `sessionId -> thinking messageId`, но не ведёт incremental buffer/dedupe state.

Итог: пользователь ждёт молчащий UI, хотя upstream поток уже мог присылать reasoning частями.

### 2.4. Нужный runtime contract уже существует в других контурах

- `Codex` reasoning у нас уже живёт incremental path-ом и тем самым показывает правильный UX-pattern.
- Shared runtime translation уже умеет работать source-first, поверх append-only visible thinking bubbles.
- Контракт unified dialog требует append-only историю, а не patch-in-place одного сообщения.

---

## 3. Цели

### 3.1. Обязательные цели

1. Сделать `Stop` безопасным для core: late provider errors после shutdown не должны приводить к process crash.
2. Сохранить возможность `Stop -> Continue` в той же workflow/continuity цепочке.
3. Начать принимать `Claude thinking` из `content_block_delta/thinking_delta` как live signal.
4. Сохранять текущую модель `режем thinking на readable blocks и постепенно переводим`.
5. Исключить дублирование, когда финальный собранный `thinking` block приходит поверх уже показанных live chunks.
6. Сохранить append-only unified dialog contract и Core-owned translation overlay path.

### 3.2. Не цели этого scope

- Не убирать существующую нарезку thinking bubble-ов.
- Не переводить thinking внутри provider до показа пользователю.
- Не патчить существующие dialog messages in place.
- Не переделывать целиком continuity threshold logic.
- Не использовать provider-native JSONL или SDK logs как source of truth для UI истории.

---

## 4. Архитектурное решение

### 4.1. Stop/Resume hardening

`SDKMessageProcessor` становится shutdown-aware для error emission:

- после `session.turnQueue.shutdownRequested === true` late processing/dispatch/processor errors больше не эмитятся в session error channel;
- active stream failure до shutdown продолжает пробрасываться как normal provider error;
- `ClaudeProviderAdapter` получает явный error-bridge, симметричный Codex path.

Это делает `aborted_streaming` допустимым terminal outcome текущего прерванного turn-а, а не фатальным crash trigger.

### 4.2. Новый live-thinking buffer façade

Для `Claude` нужен отдельный микро-модуль, а не наращивание giant logic в router:

- новый файл: `packages/Claude_Module/src/messaging/claude-thinking-live-buffer.ts`;
- ответственность: per-session/per-message accumulation состояния live thinking;
- вход: `messageId`, native `thinking_delta`, финальный assembled `thinking`;
- выход: готовые к emission readable append-only chunks.

Buffer хранит:

- текущий `providerMessageId`;
- накопленный native thinking text;
- уже materialized visible tail;
- границы flush для human-readable chunk emission.

### 4.3. Claude stream router как semantic ingress

`ClaudeStreamEventRouter` становится владельцем маршрутизации следующих событий:

- `content_block_start`
- `content_block_delta` с `thinking_delta`
- `content_block_stop`
- `message_delta.stop_reason`
- `message_stop`
- финальный `assistant/result`

Router не должен ждать финальный `message.content`, если уже есть достаточный readable delta chunk для показа пользователю.

### 4.4. Сохранение существующей модели chunking

Visible UI contract остаётся прежним:

- роль: `assistant`
- тег: `thinking`
- delivery model: append-only `dialog_message`

Текущий `claude-thinking-dialog-emitter.ts` и его readable split policy не удаляются. Новый buffer подаёт туда не один монолитный финальный блок, а ранние накопленные readable segments.

### 4.5. Finalization and dedupe

Когда позднее приходит финальный assembled `thinking` block:

1. Router сравнивает финальный native text с тем, что уже накоплено и materialized через delta path.
2. Если это superset уже показанного текста, эмитится только unseen tail.
3. Если delta path не было вовсе, используется текущий fallback: эмит финального блока целиком.
4. После `message_stop/result/shutdown` buffer очищается.

Это устраняет задвоение reasoning после финализации.

### 4.6. Translation boundary остаётся в Core

Новый live-thinking path не меняет translation ownership:

- provider эмитит source-first visible thinking;
- Core асинхронно переводит каждую видимую thinking bubble;
- canonical transcript остаётся native-only;
- `localizedContent` продолжает жить в overlay sidecar.

Критический инвариант: provider не должен переиспользовать один и тот же visible message identity для всех delta chunks. Иначе Core overlay будет перетирать перевод старых кусков новыми.

---

## 5. Структура файлов

Целевой implementation split для этого scope:

- `packages/Claude_Module/src/messaging/message-processor.ts`
  shutdown-safe error routing после `Stop`
- `packages/Claude_Module/src/provider/claude-provider-adapter.ts`
  adapter-level bridge для session error channel
- `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`
  semantic live-thinking ingress и finalization orchestration
- `packages/Claude_Module/src/messaging/claude-thinking-live-buffer.ts`
  новый буфер/фасад для incremental thinking state
- `packages/Claude_Module/src/messaging/claude-stream-event-router.test.ts`
  dedicated regression coverage для delta, flush, dedupe
- `packages/Claude_Module/src/messaging/message-processor.test.ts`
  regression coverage для `Stop`/shutdown error suppression

---

## 6. Проверка

### 6.1. Автоматические проверки

- `npx tsx --test packages/Claude_Module/src/messaging/message-processor.test.ts`
- `npx tsx --test packages/Claude_Module/src/messaging/claude-stream-event-router.test.ts`
- `npx tsc -p tsconfig.webview.json --pretty false --noEmit`
- `npm run lint`

### 6.2. Ручные сценарии

1. `Stop -> Continue`
   Core не падает, поле ввода освобождается, следующее сообщение идёт в продолжение той же workflow session.
2. Длинный `Claude thinking`
   Появляются промежуточные thinking bubbles до прихода полного финального блока.
3. Финализация thinking
   После завершения turn нет дубля уже показанных reasoning fragments.
4. Session rollover после лимита контекста
   После перехода в новую provider session live thinking продолжает идти incremental path-ом и перевод не ждёт монолитный блок.

---

## 7. Execution split

Execution должен идти в таком порядке:

1. Сначала закрыть crash path вокруг `Stop` и зафиксировать regression tests.
2. Затем поднять live `thinking_delta` ingestion и буфер readable flush.
3. Потом закрыть dedupe/finalization для финального assembled thinking.
4. После этого синхронизировать SSOT и собрать отдельный bugfix release для пользовательского retest.
