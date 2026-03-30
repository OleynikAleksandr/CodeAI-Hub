# Gemini Stalled Turn And Terminal Answer Architecture

**Status:** Draft / Discussion
**Created:** 2026-03-30
**Owner:** Oleksandr
**Scope:** Инцидент Gemini Description turn, который визуально обрывается на translated thoughts и не materialize-ит `Final_Description.md`

---

## 1. Контекст

В текущем Gemini runtime зафиксирован инцидент на шаге `Description`:

- Gemini получает задачу создать `Final_Description.md`;
- делает `read_file` по анкете и шаблону;
- публикует несколько `thinking`-сообщений;
- не создаёт `Final_Description.md`;
- спустя 60 секунд Core завершает turn как stalled / recoverable failure.

Пользовательская проблема выглядит так:

- turn визуально заканчивается на размышлениях;
- в истории не видно явного финального ответа агента;
- в истории также не видно нормального terminal failure-сообщения;
- пользователь получает ощущение, что Gemini "оборвался на полуслове".

Ключевая пользовательская гипотеза для этого scope:

- `thinking` не может считаться окончанием turn;
- перевод мыслей в наш JSONL-диалог не должен влиять на terminality turn;
- для Gemini решение о том, завершать ли turn после таймаута как `turn_completed` или как `turn_failed`, должно зависеть от того, пришёл ли реальный финальный ответ агента, а не только мысли.

---

## 2. Подтверждённые факты

### 2.1. Факты по логам инцидента

Из runtime-логов:

- provider session: `9c98d951-2b30-4a2c-881f-a5c0c64957bb`
- logical session: `a77479c9-00a6-485d-9819-0347c77f1f04`
- raw Gemini log: `~/.codeai-hub/logs/gemini/sdk-gemini-9c98d951-2b30-4a2c-881f-a5c0c64957bb.jsonl`
- dialog history: `~/.codeai-hub/sessions/.../gemini-a77479c9-00a6-485d-9819-0347c77f1f04-description.jsonl`

Наблюдаемый таймлайн:

1. Gemini публикует несколько `thought`.
2. Gemini публикует короткое user-visible сообщение "я начинаю читать анкету".
3. Gemini запрашивает два tool call `read_file`.
4. В raw provider log появляется `finished`.
5. Позже появляется новый блок `thought` с новым `traceId`, но без финального ответа и без записи `Final_Description.md`.
6. Через 60 секунд без дальнейшего progress Core фиксирует stalled turn и эмитит recoverable failure.

### 2.2. `finished` в raw Gemini stream не равен завершению всего turn

В установленном `@google/gemini-cli-core` событие `Finished` эмитится при наличии `finishReason` в отдельном response chunk, но сам stream после этого не обязан завершиться немедленно.

Следствие:

- последовательность `tool_call_request -> finished -> later thoughts` допустима;
- raw `finished` нельзя использовать как единственный terminal signal нашего turn lifecycle.

### 2.3. Core сейчас убивает turn по stalled watchdog

Текущий Gemini stalled watchdog:

- timeout по умолчанию: 60s;
- если `iterator.next()` не отдаёт следующий event за окно watchdog, Core бросает ошибку `Gemini stream stalled after 60s without progress.`

Следствие:

- текущий обрыв вызван именно watchdog path;
- root cause визуального инцидента не в том, что turn был корректно завершён ответом, а затем "плохо отрисован";
- turn реально завершился как recoverable failure.

### 2.4. `Final_Description.md` не materialize-ится вообще

В project workspace Gemini отсутствует:

- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

Следствие:

- проблема не в потере уже созданного файла;
- Gemini не доходит до file-first materialization.

### 2.5. Translated thoughts сейчас попадают в историю как `assistant`

Текущая реализация Gemini thought translation:

- переводит `thought` в русский;
- пишет результат как `dialog_message` с `role: "assistant"` и `tag: "thinking"`.

Следствие:

- history/UI видит мысли как assistant-сообщения special-case типа;
- это смешивает "настоящий ответ агента" и "thinking side-channel" на уровне terminality heuristics и пользовательского восприятия.

### 2.6. Подсчёт streamed assistant segments сейчас не отделяет thinking от финального ответа

`assistantSegmentsEmitted` увеличивается для любого `dialog_message` с `role === "assistant"`, даже если это translated thought с `tag: "thinking"`.

Следствие:

- наличие только translated thoughts уже выглядит как будто assistant что-то "ответил";
- fallback aggregate assistant emit может быть пропущен;
- terminal answer contract размывается.

### 2.7. `turn_failed` не materialize-ится в dialog history

Сейчас recoverable `turn_failed` уходит в `session:error` / stream path, но не дописывается как обычное history message в unified dialog/session JSONL.

Следствие:

- после reload пользователь видит только последние мысли;
- явный terminal failure не фиксируется рядом с ними;
- инцидент визуально выглядит как "turn оборвался на размышлениях".

### 2.8. Gemini thinking profile усиливает риск silent gap

В пользовательских settings для `gemini-3-flash-preview` установлен `thinkingLevel = high`, а bootstrapper для `gemini-3*` включает `includeThoughts: true`.

Следствие:

- длительная фаза размышления после tool calls для Gemini является ожидаемым поведением;
- фикс должен учитывать именно Gemini-specific post-tool thinking gap, а не исходить из предположения, что после tool response сразу придёт финальный answer chunk.

---

## 3. Цели

### 3.1. Обязательные цели

1. Для Gemini зафиксировать отдельный contract: turn не может считаться завершённым только по `thinking`.
2. Развести три разных уровня событий:
   - raw provider events;
   - side-channel thinking translation;
   - terminal user-visible assistant answer.
3. Сделать stalled-turn outcome зависимым от наличия terminal answer:
   - если terminal answer не было, timeout = `turn_failed`;
   - если terminal answer уже был, поздний silent gap не должен переигрывать turn в failure.
4. Убедиться, что thinking translation не влияет на terminality и не подменяет финальный ответ.
5. Сделать recoverable failure видимым в dialog history.

### 3.2. Не цели этого этапа

- Не менять terminality semantics для Claude и Codex.
- Не убирать Gemini thought translation как feature.
- Не переделывать весь unified dialog transport.
- Не решать здесь общий multi-provider contract "что считать завершением turn" для всех провайдеров.

---

## 4. Предлагаемые архитектурные решения

### 4.1. Gemini-only terminal answer contract

Для Gemini вводится отдельное понятие:

- **Terminal answer** = user-visible assistant output, который не является `thinking` и представляет финальный ответ текущего turn-а.

Не являются terminal answer:

- raw `thought`;
- translated thought;
- `system` / `warning` / `tool_call_*` события;
- сам по себе raw provider `finished`;
- факт materialization файла без user-visible assistant answer.

Примечание:

- file write остаётся важным product signal, но не заменяет финальный ответ агента в рамках этой пользовательской гипотезы.

### 4.2. Разделение raw provider finish и нашего terminal completion

Новый принцип:

- `raw finished seen` означает только то, что Gemini upstream прислал chunk с `finishReason`;
- `turn_completed` на нашей стороне разрешён только после подтверждённого terminal answer contract;
- `turn_failed` остаётся обязательным исходом, если terminal answer так и не появился.

### 4.3. Timeout outcome policy для Gemini

При stalled watchdog:

1. Если terminal answer ещё не был зафиксирован:
   - outcome = `turn_failed`
   - это явный recoverable failure.

2. Если terminal answer уже был зафиксирован:
   - поздний silent gap не должен ломать уже завершённый turn;
   - runtime должен best-effort закрыть stream и завершить turn как completed.

3. Если пришли только thoughts и translated thoughts:
   - это не completion;
   - `turn_completed` запрещён.

### 4.4. Translation isolation

Thinking translation должен стать чистым side-channel:

- не участвует в `assistantSegmentsEmitted`;
- не является основанием для suppress/fallback логики финального ответа;
- не влияет на stalled watchdog decision;
- может приходить с задержкой и не должен менять terminal state задним числом.

### 4.5. History visibility contract

После recoverable Gemini stall пользователь должен видеть в истории:

- либо terminal assistant answer и затем normal completion;
- либо явный terminal failure/system message, если финального ответа не было.

Недопустимо состояние:

- в истории есть только translated thoughts;
- нет ни финального ответа, ни сообщения об explicit failure.

---

## 5. Контуры изменений

### 5.1. Gemini runtime

Ключевые контуры:

- `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`
- `packages/Gemini_Module/src/session/gemini-turn-runner.ts`
- `packages/Gemini_Module/src/session/gemini-session-manager.ts`
- `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`

Ожидаемая ответственность:

- отделить `thinking` от terminal answer;
- ввести Gemini-specific completion state;
- привязать watchdog outcome к этому state.

### 5.2. Core history / UI visibility

Ключевые контуры:

- `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`

Ожидаемая ответственность:

- materialize-ить recoverable `turn_failed` в историю достаточно явно, чтобы после reload пользователь видел terminal outcome.

### 5.3. Tests

Минимальные regression scenarios:

1. **Thoughts-only stall**
   - есть только thoughts / translated thoughts;
   - terminal answer отсутствует;
   - outcome = `turn_failed`;
   - `turn_completed` отсутствует.

2. **Answer-then-stall**
   - финальный assistant answer уже был emitted;
   - потом stream замолчал;
   - outcome остаётся completed.

3. **Tool-followup with long thinking**
   - после tool calls Gemini публикует thoughts;
   - перевод мыслей не завершает turn;
   - решение зависит только от terminal answer presence.

4. **History visibility**
   - recoverable failure остаётся видимым в session/dialog history.

---

## 6. Критерии приёмки

1. Gemini turn больше не может визуально "заканчиваться размышлениями" без явного terminal outcome.
2. `thinking` и translated thoughts не считаются финальным ответом.
3. Если финального ответа не было, stalled timeout всегда приводит к explicit failure.
4. Если финальный ответ уже был, поздний silent gap не ломает completed turn.
5. Пользователь после reload видит либо финальный ответ, либо явное failure-сообщение, а не только набор thoughts.

---

## 7. Открытые вопросы

1. Нужно ли для Gemini дополнительно логировать отдельный marker `terminal_answer_seen`, чтобы future incidents читались по логам без реконструкции из history?
2. Нужно ли считать file materialization дополнительным "supporting signal" для post-answer completion policy, или на этом этапе достаточно только user-visible terminal answer?
3. Нужно ли для Gemini увеличить watchdog timeout после tool execution, или достаточно корректно различать `answer-seen` / `answer-not-seen`?
