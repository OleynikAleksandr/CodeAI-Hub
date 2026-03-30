# Gemini Post-Tool Terminal Leg Architecture

**Status:** Draft / Discussion
**Created:** 2026-03-30
**Owner:** Oleksandr
**Scope:** Пост-релизный инцидент `1.1.848`, где Gemini создаёт `Final_Description.md`, но turn всё равно падает на nested post-tool stalled follow-up

---

## 1. Контекст

Релиз `1.1.848` закрыл первый класс проблем Gemini:

- translated `thinking` больше не считаются terminal answer;
- recoverable `turn_failed` materialize-ится в history;
- `Final_Description.md` теперь уже может создаваться.

Но пост-релизная проверка на шаге `Description` выявила новый остаточный кейс:

- provider session: `3a6fb414-22d4-4a43-a7f9-7e5f5cb92d07`
- logical session: `a7e0598e-8fee-410d-8cf2-7ba28d4457d8`
- raw log: `~/.codeai-hub/logs/gemini/sdk-gemini-3a6fb414-22d4-4a43-a7f9-7e5f5cb92d07.jsonl`
- dialog history: `~/.codeai-hub/sessions/.../gemini-a7e0598e-8fee-410d-8cf2-7ba28d4457d8-description.jsonl`

Новый таймлайн:

1. Gemini публикует `thinking` и короткие user-visible progress-сообщения.
2. Gemini читает `questionnaire.md` и шаблон.
3. Gemini пишет содержимое в `Final_Description.md` через `write_file`.
4. `Final_Description.md` реально materialize-ится в workspace.
5. После tool execution Gemini не публикует ни финальный follow-up answer, ни вопросы пользователю.
6. Через 60 секунд Core завершает turn как stalled / recoverable failure.

Пользовательская проблема теперь выглядит иначе:

- артефакт уже создан;
- значит это не прежний кейс “не дошёл до file-first materialization”;
- но последний assistant response не выглядит terminal ответом turn-а;
- система всё равно сообщает `Provider turn failed: Gemini stream stalled after 60s without progress.`

Ключевая гипотеза пользователя для этого scope:

- `60s` может быть слишком мало именно для nested post-tool follow-up у Gemini;
- но просто наличие user-visible текста до `write_file` не означает, что turn уже реально завершился.

---

## 2. Подтверждённые факты

### 2.1. `Final_Description.md` создаётся успешно

В отличие от предыдущего инцидента:

- `Final_Description.md` существует в workspace;
- `description-step.json` уже содержит `finalPath`;
- timestamp обновления соответствует моменту `write_file`.

Следствие:

- цепочка до file materialization уже рабочая;
- текущий failure path расположен после successful tool execution.

### 2.2. Последний user-visible assistant text является progress-сообщением, а не terminal answer

В dialog history перед timeout виден текст вида:

- “Сейчас я сформирую первый черновик `Final_Description.md`...”

Этот ответ:

- публикуется до `write_file`;
- описывает следующий шаг, а не итог turn-а;
- по смыслу является progress/status update, а не финальным ответом агента.

Следствие:

- heuristic “любой non-thinking assistant segment уже terminal” недостаточен;
- pre-tool progress output нельзя автоматически трактовать как completion сигнaл для всей tool chain.

### 2.3. Current `assistantSegmentsEmitted > 0` heuristic слишком грубый

Текущая логика `1.1.848` считает сигналом terminality:

- любой `dialog_message` с `role === "assistant"` и без `tag === "thinking"`.

Но она не различает:

1. progress assistant output в leg, который ещё породил `tool_call_request`;
2. terminal assistant output в последнем leg без последующих tool calls.

Следствие:

- same-turn fix для `thinking` был правильным, но остаётся semantic gap для tool-producing legs.

### 2.4. Post-tool stall происходит уже на nested leg

По raw log:

- `write_file` приходит на leg с `traceId: ff12b9164225a34a`;
- затем stream перестаёт давать новые raw events;
- `core.log` фиксирует timeout ровно через 60 секунд.

Следствие:

- проблема сидит в nested post-tool follow-up;
- root cause не в отсутствии progress before tool;
- root cause не в translation side-channel.

### 2.5. Нынешний relaxed stalled policy не срабатывает в observed run

В `core.log` отсутствует warning вида:

- `Gemini stalled after terminal answer; treating turn as completed`

Следствие:

- observed run не проходит через уже добавленный completion path;
- значит нам нужен новый contract для tool-chain terminal leg, а не только предыдущий fix для thoughts.

---

## 3. Цели

### 3.1. Обязательные цели

1. Разделить `progress assistant output` и `terminal-leg assistant answer`.
2. Зафиксировать, что assistant text из leg с `tool_call_request` сам по себе не завершает весь turn.
3. Сделать stalled policy для Gemini чувствительной к post-tool context.
4. Увеличить шанс, что Gemini успеет выдать follow-up после successful tool execution.
5. Сохранить explicit failure, если terminal-leg answer так и не появился.

### 3.2. Не цели этого этапа

- Не менять semantics для Claude и Codex.
- Не убирать Gemini thought translation.
- Не считать сам факт `write_file` достаточным completion signal.
- Не ослаблять stall watchdog глобально для всех Gemini turn-ов без разделения initial leg vs post-tool leg.

---

## 4. Предлагаемые архитектурные решения

### 4.1. Turn chain / leg model

Каждый `runTurn()` трактуется как отдельный **leg** внутри общей `processTurns()` chain.

Новый принцип:

- если leg породил хотя бы один `tool_call_request`, то этот leg считается **non-terminal leg**;
- assistant output из такого leg допустим как progress/status message;
- но completion всей цепочки может быть подтверждён только output-ом из **terminal leg**, то есть из leg, который завершается без новых tool requests.

### 4.2. Новый terminal-leg contract

Для Gemini:

- **Thinking** не является terminal answer.
- **Progress assistant output** из non-terminal leg не является terminal answer.
- **Terminal-leg assistant answer** — это non-thinking assistant output последнего leg в tool chain, после которого больше нет tool requests.

Следствие:

- observed Description run из `1.1.848` не должен считаться завершённым только потому, что до `write_file` Gemini сказал “сейчас сформирую черновик”.

### 4.3. Chain-aware stalled outcome

При stalled timeout:

1. Если завис **initial leg** без terminal-leg answer:
   - outcome = `turn_failed`

2. Если завис **post-tool leg**, но terminal-leg answer ещё не было:
   - outcome всё ещё = `turn_failed`
   - но timeout window может быть больше, чем для initial leg

3. Если terminal-leg answer уже был, а после него возник late silent tail:
   - outcome может быть `turn_completed`

Ключевой смысл:

- chain-aware logic не должна auto-complete observed кейс из `1.1.848`;
- она должна отделить его от truly completed answer-then-stall path.

### 4.4. Adaptive Gemini watchdog for post-tool legs

Нужна Gemini-specific политика timeout:

- базовое окно можно сохранить для initial leg;
- для nested post-tool legs нужно отдельное, более длинное окно;
- минимальная цель: не обрывать follow-up после successful `write_file` тем же коротким окном, что и стартовый turn.

Это решение согласуется с observed поведением Gemini:

- tool execution + follow-up reasoning может занимать дольше initial response phase;
- особенно на `thinkingLevel = high`.

### 4.5. Logging and observability

Для диагностики следующих прогонов нужно явно логировать:

- stalled timeout phase: `initial` vs `post_tool`
- tool-chain depth
- был ли уже зафиксирован terminal-leg answer
- был ли текущий assistant output progress-only leg output

Это нужно, чтобы следующий инцидент можно было различить без повторного ручного forensic чтения всех JSONL.

---

## 5. Тестовая матрица

Нужно покрыть как минимум:

1. `progress text -> write_file -> nested stall`
   - expected: не считается terminal completion автоматически
   - timeout должен следовать post-tool policy

2. `progress text -> write_file -> delayed final answer`
   - expected: turn completes successfully, если final answer успевает прийти в расширенное post-tool окно

3. `thoughts-only stall`
   - expected: recoverable failure

4. `terminal-leg answer -> late silent tail`
   - expected: allowed completion path

---

## 6. Решение для реализации

Принять новый contract:

- terminality для Gemini должна определяться не наличием любого assistant text, а наличием **terminal-leg answer**;
- post-tool legs должны иметь отдельную stalled policy;
- progress/status output до tool completion не должен скрывать реальную незавершённость turn-а.
