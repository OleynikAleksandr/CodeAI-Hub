# Gemini Post-Tool Watchdog Bump 1.2.14 — Planning Doc

## 1. Problem

Retest 1.2.13 на Gemini 3.1 Pro Preview + `thinkingLevel=high`. После первой отправки пользовательского prompt:
- 18:08:07 — session_start
- 18:09:28 — Gemini завершил initial leg c 2 × `tool_call_request` (`read_file` для Final_Description + questionnaire) + `finished reason=STOP`
- Core выполнил tool_calls, отправил results в Gemini → стартовал post-tool leg
- **18:11:28** — ровно через 120с тишины post-tool leg'а `DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS` срезал turn: `Provider turn failed: Gemini stream stalled after 120s without progress.`

В 1.2.11 initial leg был поднят 60→240с, post-tool оставлен на 120с с аргументом "follow-up legs уже учитывают nested reasoning, 120с хватит". Retest показывает — **аргумент неверный**. Gemini 3.1 Pro + high thinking может silent'ить в post-tool leg'е >120с (deep reasoning после tool results), как и в initial leg'е.

## 2. Solution

Поднять `DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS` с 120_000 до 240_000. Симметрично initial leg'у. Pre-existing per-session override `postToolStalledTurnWatchdogMs` сохраняется.

Адаптивный per-thinking-level watchdog всё ещё deferred — сначала оба leg'а с фиксированным потолком 240с, потом если понадобится — per-level.

## 3. Structure

Одна константа в одном файле. Без новых классов.

## 4. Contracts

Invariant 7 (Provider dialog segment preservation, Gemini branch) + `Modules/Gemini.md` stalled-turn bullet обновляются: оба leg'а (initial + post-tool) теперь 240_000ms.

## 5. Release

1.2.14 VSIX + tarballs. Hygiene-критичный fix (устраняет false-positive watchdog kill на реальном Gemini 3.1 Pro + high).

## 6. Out of scope

- Adaptive per thinking level (deferred second time; если 240/240 окажется достаточно — не делаем вообще).
- Не трогаем `MISROUTED_THINKING_PREFIXES`, `uncaughtException` handler — они отдельные contracts, работают.
