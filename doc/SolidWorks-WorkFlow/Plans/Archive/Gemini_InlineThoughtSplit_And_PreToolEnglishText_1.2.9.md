# Gemini Inline-Thought Split + Pre-Tool English Text Handling — 1.2.9

## Проблема

1.2.8 retest (2026-04-17) прошёл по Stop/Resume корректно (подробно в `Session042.md`), но выявил две дополнительные проблемы с Gemini assistant output:

### Bug A — inline `[Thought: true]` marker в post-tool follow-up

В post-tool-call follow-up turn Gemini SDK иногда стримит "thought-like" summary и финальный ответ в ОДНОМ `content`-потоке с литеральным разделителем:

```
**
Finalizing the Description Step** I've incorporated the last round of user feedback into
`Final_Description.md`. This includes details about...
foundation for what's to come.
[Thought: true]Я завершил подготовку `Final_Description.md`...
Работа над описанием завершена.
```

В SDK log этого turn'а **ни одного `ptype=thought` event'а** — только `content` events. Наш `gemini-assistant-event-normalizer.ts` конкатенирует все content chunks и эмитит одним assistant bubble'ом. Пользователь видит в dialog'е гибрид английской thought-summary + `[Thought: true]` token + русский финальный ответ.

### Bug B — English pre-tool progress text без перевода

Первый или второй ответ после получения system-инструкции (начало сессии) от Gemini часто бывает коротким английским прогрессом типа:

```
I will read the questionnaire and the template to understand the product idea and the required document structure.
```

Это pre-tool status text — сам turn заканчивается `tool_call_request` (напр. `read_file`). SDK эмитит его как `content` events без сопровождающих `thought` events. Наш роутер трактует как финальный assistant reply и показывает пользователю английский текст посреди русского диалога.

Пользователь подтвердил (2026-04-17): "это, как правило, первый или второй ответ после получения запроса инструкции от ядра. В середине я такого не видел." — то есть happens at session start, не random middle-of-session.

## Решение

### Stream 2 — Bug A splitter

В `gemini-assistant-event-normalizer.ts` `handleFinishedEvent` (или при финализации turn'а): перед emit финального assistant bubble сканируем `assistantSegment` на литерал `/\[Thought:\s*(true|false)\]/`. Если найден:
- Часть ДО маркера → route через существующий `thoughtTranslator` (точно так же как `handleThoughtEvent`) и emit как `tag: "thinking"` bubble с `{ subject: "", description: <pre-marker-text> }`.
- Часть ПОСЛЕ маркера → emit как обычный assistant bubble.
- Если пре-маркер пустой / только whitespace → пропускаем только emit финала.
- Если пост-маркер пустой → эмитим pre-marker как thinking, assistant bubble пропускаем (пользователь не видит финала — это странно, но соответствует тому что прислал провайдер).

Это независимо от того, были ли отдельные `thought` events в этом turn'е — чисто пост-обработка текста.

### Stream 3 — Bug B pre-tool non-target-language heuristic

Расширяем `TurnAccumulator`: флаг `hasPreToolContent: boolean` (устанавливается в true если content events собираются до первого `tool_call_request`). При первом `tool_call_request` этого turn'а фиксируем snapshot текущего `currentAssistantChunks.join("")` как "pre-tool segment" + сбрасываем `currentAssistantChunks`.

При финализации turn'а: если есть non-empty pre-tool segment И `messagesForTheUserLanguage` из `runtimeTurnConfig` указывает на non-Latin script (ru/uk/bg/sr/mk/be/mn/kk для Cyrillic, плюс zh/ja/ko для CJK, ar для Arabic, etc.) И текст не содержит ни одного символа из этого script range → reclassify pre-tool segment как thinking (через `thoughtTranslator`, `tag: "thinking"`).

Простейший script-detection (start): map `ru/uk/bg/sr/mk/be/ky/kk/mn/tg/ab` → Cyrillic `U+0400..U+04FF + U+0500..U+052F`. Если target в этом списке и в pre-tool text нет cyrillic chars → heuristic fires.

Для target=`en` heuristic не fires никогда (нельзя надёжно детектить "не-english" через unicode).

Edge-case: pre-tool text в target language (e.g. русский прогресс "Сейчас прочитаю анкету") — heuristic НЕ fires, текст остаётся как обычный assistant bubble. OK по мнению user'а (он такое в retest не видел, но если и встретится — выглядит нормально).

## Scope boundaries

- Не трогаем Claude и Codex — у них другая pre-tool mechanics (Claude имеет `claude-thought-translation-adapter.ts`; Codex использует rollout который разделяет reasoning от text).
- Не трогаем Gemini turn runner — segment-boundary tracking полностью в accumulator.
- Не меняем provider-native chat file на диске — мы меняем только то, что эмитится в наш dialog.

## Tests (Stream 4)

Добавляем в `message-processor.test.ts` или новый spec-файл два сценария:
1. **Bug A:** emit content events формата "X\n[Thought: true]Y" → assert два dialog_message'а (thinking=X, assistant=Y). И второй сценарий где маркер отсутствует → один assistant bubble с объединённым text'ом (backward compat).
2. **Bug B:** create accumulator с `runtimeTurnConfig.messagesForTheUserLanguage="ru"`, emit content events `"I will read the questionnaire"` → `tool_call_request` event → `finished` → assert pre-tool chunks emitted as thinking bubble, no final assistant bubble from the pre-tool segment. Control: same with target `"en"` → emitted as assistant (heuristic off). Control: same with target `"ru"` but content="Я прочту анкету" → emitted as assistant (content contains Cyrillic).

## Release

1.2.9 — fix-only, без diagnostic cycle. Обе quirk'и statically traceable.
