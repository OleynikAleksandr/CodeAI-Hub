# Local Models LM Studio Streaming Transport — Planning (RU)

**Status:** Active planning source
**Created:** 2026-06-19
**Owner:** Oleksandr + ZCode
**Scope owner doc:** `doc/TODO/todo-plan.md` (plan id: `local-models-lmstudio-streaming-transport-2026-06-19`)

## 1) Goal

Починить падение провайдера Local Models на тяжёлых локальных моделях (Qwen3 27B MLX и аналогичных reasoning-моделях). Конкретный инцидент — шаг `Description` workflow с локальной моделью через LM Studio завершился ошибкой:

```
Provider turn failed: LM Studio native chat request failed: fetch failed (Headers Timeout Error)
```

Фикс должен быть root-cause, а не повышением таймаута.

## 2) Current Empirical Baseline

Лог инцидента:
`/Users/oleksandroliinyk/VSCODE/FinderWidget-Test01/.codeai-hub/finderwidget-test01/runtime/sessions/unified/localModels/localmodels-6e123072-6963-4ae4-9c69-a97c909db2e3-description.jsonl`

Между отправкой промпта (08:48:57) и ошибкой (08:50:09) прошло ~72 с. Часть этого интервала съел синхронный `lms load` 27B-модели (`spawnSync`, context 16384, таймаут 120 c), но сам провал — на HTTP-запросе.

Root cause установлен по коду (`packages/core/src/local-models/`):

- `LocalModelsProviderAdapter.#complete()` шлёт `POST /api/v1/chat` с захардкоженным `stream: false` (`local-models-provider-adapter.ts:303`).
- LM Studio при non-streaming chat **не отдаёт HTTP response headers**, пока полностью не сгенерирует ответ.
- Для Qwen3 27B на MLX с тяжёлым промптом шага Description генерация идёт минуты → низовой `undici` `headersTimeout` (дефолт Node 22.17.0) срабатывает раньше, чем наш `REQUEST_TIMEOUT_MS` (300 c, `AbortController` — это **другой** таймаут на application-уровне).
- В репо **нет** `setGlobalDispatcher`/`headersTimeout`/`NODE_OPTIONS`; core запускается через `spawn` без `execArgv`. Повышение `headersTimeout` без streaming бессмысленно — оно лишь откладывает зависание без обратной связи.

Тот же риск присутствует на translation path: `LmStudioLocalTranslationEngine.translate()` шлёт `POST /v1/chat/completions` с `stream: false` (`local-models-facade.ts:363`). Для тяжёлых reasoning-моделей это та же неисправность.

## 3) Подход (Streaming — root fix)

При `stream: true` LM Studio мгновенно отдаёт response headers + событие `chat.start` (или первый кадр OpenAI-SSE для `/v1/chat/completions`) ещё до начала генерации. Затем идут чанки `message.delta` / `data: {choices:[{delta}]}`, а финальный кадр содержит агрегированный результат, структура которого идентична non-streaming ответу (`chat.end.result` для native chat; `data: [DONE]` + накопленные deltas для OpenAI-completions).

Следствия:
- Заголовки приходят мгновенно → `HeadersTimeoutError` исчезает.
- `bodyTimeout` undici (300 c) обнуляется каждым чанком.
- Существующие текстовые парсеры (`parseNativeChatText`, `parseChatCompletionText`) переиспользуются почти без изменений.
- Контракт adapter не меняется: эмитятся ровно `turn_started → assistant → turn_completed` (терминальные). Streaming добавляет **только надёжность transport-уровня**, без новых provider-event-контрактов, UI-изменений или settings-ключей.

## 4) Architecture / Boundary

Все изменения строго аддитивны внутри `packages/core/src/local-models/`. Закрытый модуль `GLM_Module` НЕ трогается (его `readSseDataFrames` найден при поиске существующего SSE-ридера, но LM-Studio-специфичный ридер держится локально — Ponytail: не плодить обобщённость и не ломать закрытый модуль).

Реализация разбита на 4 фазы (каждая ≤ 3 файлов):

### Phase 1 — SSE-ридер для LM Studio (новый файл + тест)
- `local-models-sse-reader.ts`: чтение `response.body` через WHATWG `getReader()` (идиома уже есть в репо — `glm-opencode-turn-stream.ts:142`), буферизация по `\n\n`, разрез `data:`-кадров, извлечение финального assistant-текста из `chat.end.result` (native) и из накопленных deltas + `[DONE]` (OpenAI-completions). Переиспользование `parseNativeChatText` / `parseChatCompletionText`.
- `local-models-sse-reader.test.ts`: кадры через границу чанка; `chat.end` с текстом; reasoning-only без финального message (→ reject); соединение закрылось без терминального event.

### Phase 2 — Adapter: workflow-agent path на streaming
- `local-models-provider-adapter.ts`: `stream: false` → `stream: true` в теле `/api/v1/chat`; замена `response.json()` + `parseNativeChatText` на streaming-ридер. `REQUEST_TIMEOUT_MS` (300 c) остаётся как потолок всей генерации. Diagnostics для `!response.ok` (body) сохраняется.
- `local-models-provider-adapter.test.ts`: mock `fetchImplementation` теперь возвращает `Response` с SSE-`body` (по образцу GLM_Native adapter-тестов), а не `json()`. Все текущие assertions (`turn_started → assistant → turn_completed`, URL `/api/v1/chat`, модель-идентификатор, non-OK/reasoning-only/fetch-cause diagnostics) сохраняются.

### Phase 3 — Facade: translation path на streaming
- `local-models-facade.ts`: `stream: false` → `stream: true` в `buildPayload()`; `translate()` читает streaming-ридер вместо `response.json()`.
- `local-models-facade.test.ts`: тест `sends OpenAI-compatible translation requests through LM Studio` — body теперь `stream: true`, ответ — SSE-stream. Fallback-контракт (`lmstudio_non_ok` / `lmstudio_empty_response` / `lmstudio_request_failed`) сохраняется.

### Phase 4 — Документация + scope closeout
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`: упомянуть streaming transport для LM Studio (workflow-agent + translation).
- `doc/SolidWorks-WorkFlow/Docs_Index.md`: обновить ссылку на этот planning-doc.
- Финальные Stream: `Tooling Verification`, `User Workflow Acceptance Testing`, `Scope Closeout` (только после явного acceptance).

## 5) Что НЕ делаем (YAGNI / Ponytail)

- НЕ вводим `setGlobalDispatcher` / `headersTimeout` override — не нужно при streaming, лишний слой.
- НЕ вводим новый settings-ключ / VS Code `contributes.configuration` — требования нет.
- НЕ выносим `readSseDataFrames` в shared и НЕ трогаем `GLM_Module` — закрытый модуль, лишняя обобщённость.
- НЕ добавляем streaming progress events в provider-контракт — фикс чисто transport-level.
- НЕ трогаем `lms load` synchronous timeout — не root cause.
- НЕ собираем релиз автоматически — Release Build Confirmation Gate (отдельное явное подтверждение пользователя).

## 6) References

- `packages/core/src/local-models/local-models-provider-adapter.ts` (workflow-agent path, `/api/v1/chat`)
- `packages/core/src/local-models/local-models-facade.ts` (translation path, `/v1/chat/completions`)
- `packages/core/src/local-models/local-models-runtime-load-manager.ts` (load/TT   L/profile — не трогается)
- `packages/GLM_OpenCode_Module/src/provider/glm-opencode-turn-stream.ts:142` (референс идиомы `getReader()`)
- LM Studio Streaming Events docs: `https://lmstudio.ai/docs/developer/rest/streaming-events`
