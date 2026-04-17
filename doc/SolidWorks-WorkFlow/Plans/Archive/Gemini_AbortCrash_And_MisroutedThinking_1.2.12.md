# Gemini Abort-Crash Suppression + Mis-Routed Thinking Reroute 1.2.12 — Planning Doc

## 1. Problem

Retest 1.2.11 на Gemini 3.1 Pro Preview + `thinkingLevel=high` выявил два различных бага, оба — наша вина (native `gemini` CLI на тех же model+thinking не падает и показывает UX корректно).

### Bug A — Core crash от AbortError
Core падает с uncaughtException когда cli-core `GeminiClient.processTurn` сам себе делает `controller.abort()` в branch `loopDetectedAbort` (line 539 client.js). Node-fetch background fetch-а получает abort signal, бросает AbortError через EventTarget, и этот Promise rejection не попадает в наш `runTurn` try/catch — он в отдельном async contexte внутри cli-core. У нас в `packages/core/src/index.ts` стоит только info-only `uncaughtExceptionMonitor`, без actual `uncaughtException` handler'а → default Node = crash.

Native CLI обходит это иначе: его `submitQuery` имеет внешний try/catch вокруг всего stream-processing с явной игноркой `error.name === "AbortError"` + loop-detection сразу конвертируется в UI-level диалог.

### Bug B — Mis-routed thinking → assistant bubble
Gemini 3.1 Pro + `thinkingLevel=high` на больших prompt'ах (Description Agent + questionnaire) эмитит свой internal meta-prompt (`sthought\n`, `CRITICAL INSTRUCTION 1:`, `Related tools:`, `Plan:`, `Drafting the content...`) через **`Content` events**, а не `Thought` events. Наш normalizer корректно следует SDK-сигналу и пишет это как assistant bubble. В UI и в `Final_Description.md` overlay пользователь видит 10k+ char блок английского meta-prompt.

Native CLI получает те же Content events — но у них UX scroll-back'овый, отдельного "assistant message with source-of-truth" у них нет, поэтому проблема не проявлена в той же форме.

Pre-existing quirk модели, не регрессия релизов. Может быть исправлен Google в будущих версиях 3.1 Pro; до тех пор мы фильтруем на своей стороне.

## 2. Solution

### A. uncaughtException handler для Gemini AbortError (crash-safety)
Добавить в `packages/core/src/index.ts` `process.on("uncaughtException", handler)`:
- Если `error instanceof Error && error.name === "AbortError" && stack.includes("@google/gemini-cli-core")` → log warning + **return** (swallow).
- Всё остальное: log fatal + rethrow (default Node crash, сохраняет safety для реальных bug'ов).

Pattern заимствован у native CLI но адаптирован под daemon-процесс (у нас нет exit — продолжаем работу).

### B. Mis-routed thinking detector в Gemini assistant normalizer
Расширить `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`:
- Новый helper `hasMisroutedThinkingPrefix(text)`: проверяет, начинается ли накопленный assistant segment (после trim) с одного из маркеров: `sthought`, `CRITICAL INSTRUCTION`, `Related tools:`, `Plan:\n`, `Drafting the content`.
- В `handleFinishedEvent`: перед эмитом финального assistant bubble — если accumulated segment hasMisroutedThinkingPrefix → весь segment маршрутизируется через существующий `emitInlineThoughtAsThinking` helper (тот же путь, что используется для inline `[Thought: true]` split в 1.2.9 и pre-tool heuristic).
- Heuristic применяется ПОСЛЕ Bug A splitter и Bug B pre-tool heuristic (чтобы не конфликтовать с уже существующими reroute-правилами).

## 3. Structure

Никаких новых классов. Два файла меняются:
- `packages/core/src/index.ts` — добавить `process.on("uncaughtException", ...)` handler.
- `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` — helper + проверка в `handleFinishedEvent`.

## 4. Contracts

- **Invariant 7** (Provider dialog segment preservation) Gemini branch: расширить — mis-routed thinking prefixes (`sthought`, `CRITICAL INSTRUCTION`, etc.) обнаруженные в начале `Content` event stream маршрутизируются через thought-translator overlay, как и inline `[Thought: true]` marker + pre-tool non-target-language heuristic.
- **New Invariant (30)** — "Provider uncaughtException safety": Core имеет process-level uncaughtException handler, который selectively suppresses AbortError из embed'нутых provider SDK stack'ов (в частности `@google/gemini-cli-core`), сохраняя crash-safety для реальных bug'ов. Это необходимо потому, что embed'нутые provider SDK держат background Promise chains параллельно нашему turn runner, и их internal abort не попадает в наш try/catch.

## 5. Release

1.2.12 VSIX + tarballs. Hygiene-критичный релиз (устраняет crash), retest пользователем на том же Gemini 3.1 Pro + thinking=high.

## 6. Out of scope

- Adaptive watchdog per thinking level.
- Полностью подавить "выпендривание" Gemini — это Google's fix. Мы только reroute'им правильно в UI.
- Tests на uncaughtException handler — невозможно без симуляции реального node-fetch abort error.
