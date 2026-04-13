# Codex Thinking Translation Diagnostics — Planning Doc

**Status:** Draft for execution
**Created:** 2026-04-13 20:19 CEST
**Owner:** Oleksandr + Codex

---

## 1. Problem statement

В workspace `CodeAI-Hub codex 5.4` reasoning для Codex пришёл в UI частично на английском и частично на русском.

Уже подтверждено:

- native provider rollout отдал `17` отдельных `agent_reasoning` событий;
- Core перенёс их в unified session JSONL как `17` отдельных thinking messages без потери порядка и без преждевременной склейки;
- overlay translations были записаны только для `4/17` message ids;
- для остальных `13/17` Core зафиксировал `Session translation returned non-translated result` с `status = fallback` и `errorCode = empty_translation`.

Значит текущий узкий diagnostic scope лежит не в `native rollout -> unified JSONL`, а внутри участка:

`thinking message append -> translation dispatch -> translation result -> overlay append -> translation patch broadcast`.

---

## 2. Goal of this scope

Добавить достаточно детальное диагностическое логирование в Core, чтобы следующий воспроизводимый прогон однозначно ответил на вопросы:

1. какой именно thinking message был поставлен на translation path;
2. был ли он признан translation candidate или отфильтрован policy/dispatcher;
3. какой engine / target language / timeout были применены;
4. что именно вернул translation facade;
5. был ли overlay записан в `*.translations.jsonl`;
6. был ли translation patch отправлен в websocket broadcast;
7. если цепочка прервалась, на каком шаге это произошло и с какими correlation fields.

---

## 3. Diagnostic boundary

Диагностика должна оставаться узкой и не менять runtime contract thinking translation.

Разрешённые изменения:

- additive logging only;
- correlation fields в существующих логах;
- логирование только для user-visible dialog messages, особенно для `assistant + tag=thinking`.

Нельзя в этом scope:

- менять policy выбора translation engine;
- менять aggregation/merge поведение UI;
- менять provider rollout parsing;
- менять message ids или storage format `*.jsonl`.

---

## 4. Trace points to instrument

### 4.1 Message append path

Фиксировать момент, когда Core получил и записал dialog message:

- `sessionId`
- `messageId`
- `role`
- `tag`
- `contentLength`
- `preview`

Для thinking-path отдельно фиксировать, что сообщение стало translation candidate.

### 4.2 Translation dispatch path

Фиксировать:

- policy decision (`enabled`, `engineId`, `targetLanguage`);
- start translation;
- final translation result (`translated` / `fallback` / `skipped`);
- `sourceHash`;
- translated length, если translation состоялся;
- `errorCode`, если translation не состоялся.

### 4.3 Overlay persistence path

Фиксировать:

- начало записи overlay;
- успешную запись overlay;
- отправку `session:message_translation` и `dialog:message_translation`.

---

## 5. Target files

Планируемый минимальный write scope:

- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`
- `packages/core/src/session-translation/session-translation-facade.ts`
- `packages/core/src/unified-session/storage.ts`

---

## 6. Verification

После instrumentation должно быть возможно воспроизвести thinking translation path и увидеть в `~/.codeai-hub/logs/core/core.log` полный trace для одного `messageId`.

Минимальный DoD:

- Core package собирается;
- логи пишутся без изменения transport contracts;
- следующий manual repro может показать, где именно отваливаются те `13/17` reasoning translations.
