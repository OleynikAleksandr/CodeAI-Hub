# Local Models LM Studio Live Assistant Streaming — Planning (RU)

**Status:** Active planning source
**Created:** 2026-06-19
**Owner:** Oleksandr + ZCode
**Scope owner doc:** `doc/TODO/todo-plan.md` (plan id: `local-models-lmstudio-live-assistant-streaming-2026-06-19`)

## 1) Goal

Добавить **живой инкрементальный стрим** assistant-ответа в провайдер Local Models (LM Studio) для workflow-agent path. Сейчас, несмотря на HTTP-streaming transport (фикс из прошлого scope), адаптер **буферизует** полный ответ и эмитит один терминальный `assistant` event целиком — пользователь ждёт ~4.5 минуты для Qwen3 27B и видит ответ весь сразу. Цель: assistant-текст должен появляться в UI порционно, по мере генерации.

## 2) Current Empirical Baseline

После релиза `1.2.550` шаг `Description` с Qwen3 27B MLX через LM Studio отработал без `Headers Timeout Error`, но ответ пришёл одним блоком:
- `.codeai-hub/finderwidget-test01/runtime/sessions/unified/localModels/localmodels-9dee5f60-...-description.jsonl` — `turn_started` → один `assistant` event с полным текстом (~4.5 мин wall-clock) → `turn_completed`.

Root cause буферизации (по коду `packages/core/src/local-models/`):
- `readLmStudioNativeChatResult()` в `local-models-sse-reader.ts:49-74` **игнорирует** все `message.delta`-кадры и ждёт только терминальный `chat.end`, возвращая `parsed.result`.
- `LocalModelsProviderAdapter.sendMessage()` (`local-models-provider-adapter.ts:210-257`) эмитит ровно три event-а: `turn_started` → один `assistant` (полный текст из `#complete()`) → `turn_completed`. Внутри `#complete()` (`:289-344`) **нет emit-вызовов** во время чтения стрима.

## 3) Подход (Live assistant streaming — Ponytail-minimal)

Контракт live-стрима в CodeAI Hub **провайдер-нейтральный** (подтверждено исследованием):
- во время генерации эмитится серия `assistant` events с **`tag: "live"`** (по одному на каждый чанк);
- в конце — один финальный `assistant` event **без** `live` (полный текст).

Core/UI pipeline уже всё поддерживает:
- `session-provider-event-router.ts:252` маршрутизирует `assistant` events одинаково для всех провайдеров;
- `session-request-handler-event-messages.ts:180-260` (broadcast) провайдер-нейтральный;
- `resolveLiveAssistantTailDedupe` (`session-request-handler-live-tail-dedupe.ts:24-42`) склеивает последовательные live-чанки в одну карточку и отрезает перекрытие с финальным non-live `assistant` (чтобы финал не дублировал уже показанный текст);
- translation overlay для `localModels` — no-op (нет в allowlist `resolveTranslationProviderId`), лишней нагрузки не будет.

Новая UI-логика, новые settings-ключи, новые provider-event-контракты — НЕ нужны. Это чисто adapter-level изменение.

## 4) Architecture / Boundary

Все изменения внутри `packages/core/src/local-models/`. Закрытые модули (GLM_Module и др.) НЕ трогаются.

Реализация (2 фазы, каждая ≤ 3 файлов):

### Phase 1 — SSE-ридер: callback для message.delta
- `local-models-sse-reader.ts`: `readLmStudioNativeChatResult(response, onDelta?)` — добавить опциональный callback, вызываемый для каждого `message.delta`-кадра с incremental text. Терминальный `chat.end.result` по-прежнему возвращает финальный payload (для parseNativeChatText). Поле incremental text в LM Studio native SSE — `content` на `message.delta` events (подтверждено тестом `local-models-sse-reader.test.ts:62`).
- `local-models-sse-reader.test.ts`: добавить тесты на onDelta-callback (вызывается для каждого message.delta, не вызывается для chat.end/прочих, кадры через границу).

### Phase 2 — Adapter: emit live assistant chunks
- `local-models-provider-adapter.ts`: в `#complete()` передать onDelta-callback, который эмитит `assistant` event с `tag: "live"` для каждого чанка (по образцу `glm-native-provider-adapter.ts:291-296`). После возврата финального `result` — существующий emit финального `assistant` без `live` остаётся (resolveLiveAssistantTailDedupe отрежет перекрытие). `turn_started` / `turn_completed` без изменений.
- `local-models-provider-adapter.test.ts`: mock fetchImplementation возвращает SSE-stream с несколькими `message.delta` + финальным `chat.end`; assertions: события `[turn_started, assistant@live × N, assistant (final), turn_completed]`; URL `/api/v1/chat`, модель-идентификатор, diagnostics (non-OK/reasoning-only/fetch-cause) сохраняются.

### Финальные Stream (по AGENTS.md §4)
- `Tooling Verification` (build @codeai-hub/core + local-models tests + lint/knip);
- `User Workflow Acceptance Testing` (retest шага Description — должен появиться живой стрим assistant-текста);
- `Release Build` (новый VSIX 1.2.551 — только после явного подтверждения пользователя);
- `Scope Closeout` (только после явного acceptance; **обязательно** включить reserved post-closeout anchor task — lesson learned из прошлого scope, иначе post-commit hook падает на `assertExplicitCloseoutBoundary`).

## 5) Что НЕ делаем (YAGNI / Ponytail)

- НЕ делаем reasoning/thinking overlay — отложено; сначала проверим assistant live-stream, потом решим отдельно.
- НЕ трогаем translation path (`/v1/chat/completions` в facade) — служебный перевод коротких фрагментов, live-stream пользователю не нужен.
- НЕ вводим новые settings-ключи / VS Code `contributes.configuration`.
- НЕ трогаем закрытые модули (GLM_Module и др.).
- НЕ добавляем token_usage emission (не требуется для live-stream).
- НЕ собираем релиз автоматически — Release Build Confirmation Gate.

## 6) References

- `packages/core/src/local-models/local-models-provider-adapter.ts` (`#complete`, `/api/v1/chat`)
- `packages/core/src/local-models/local-models-sse-reader.ts` (`readLmStudioNativeChatResult`)
- `packages/GLM_Module/src/provider/glm-native-provider-adapter.ts:291-296` (референс live-emit идиомы)
- `packages/core/src/remote-bridge/handlers/session-request-handler-live-tail-dedupe.ts` (live-tail dedupe контракт)
- LM Studio Streaming Events docs: `https://lmstudio.ai/docs/developer/rest/streaming-events`
