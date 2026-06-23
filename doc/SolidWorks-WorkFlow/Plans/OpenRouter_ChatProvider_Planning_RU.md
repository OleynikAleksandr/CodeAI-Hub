# OpenRouter Chat Provider — Planning Doc

**Статус:** draft for user review  
**Дата:** 2026-06-23  
**Цель:** добавить OpenRouter как отдельного провайдера для обычного чата, ревью и анализа в CodeAI Hub.

## 1. Назначение

OpenRouter Provider нужен как provider для общего общения: workspace chat, обсуждение кода, ревью, анализ документов и эксперименты с моделями OpenRouter. На первом этапе это не managed workflow provider для этапов `Description` / `Diagram Modules` / `Quality Gates`.

Главный принцип: CodeAI Hub сохраняет управление сессией, историей, выбранной моделью, Settings и UI. OpenRouter используется как модельный backend через его HTTP API.

## 2. Почему API, а не Agent SDK

Для MVP выбираем прямой OpenRouter API:

- он дает максимальный контроль над моделью, request body, streaming, routing и обработкой ошибок;
- он не навязывает свой agent loop, state, tool approval и orchestration поверх Core;
- его проще встроить в текущий контракт provider/modelBinding/settings;
- он позволяет реализовать live search по каталогу моделей и сохранять точный slug модели.

OpenRouter Agent SDK не является каталогом готовых hosted agents. Это SDK для запуска agent loop поверх OpenRouter-моделей: instructions, tools, state/context, stop conditions, streaming и approval. Это полезно позже для отдельного режима `OpenRouter Agent Mode`, но для обычного чата сейчас лишнее, потому что Core уже владеет session lifecycle и tool orchestration.

## 3. User Need

В Settings провайдера пользователь должен иметь возможность:

- сохранить OpenRouter API key;
- начать вводить название, автора или точный slug модели;
- сразу видеть список совпадений из OpenRouter catalog;
- выбрать найденную модель из списка;
- сохранить точный OpenRouter model id/slug как default для новых chat sessions.

OpenRouter website остается главным местом для глубокого просмотра каталога, фильтров и категорий. В CodeAI Hub нужен только практичный live-search picker, который помогает найти и сохранить правильный slug.

## 4. Non-Goals MVP

- Не добавлять OpenRouter в managed workflow stages.
- Не включать OpenRouter server tools (`web_search`, `subagent`, `advisor`, `fusion`, `apply_patch`) по умолчанию.
- Не тащить Agent SDK как зависимость.
- Не хранить полный каталог OpenRouter в репозитории.
- Не строить сложный marketplace UI внутри Settings.
- Не переносить категории/фильтры сайта OpenRouter в Settings.
- Не добавлять отдельную кнопку проверки модели: поиск сам показывает совпадения.
- Не делать silent fallback на другую модель, если пользователь явно выбрал конкретный slug.

## 5. API Surface

Минимальный runtime:

- `GET /api/v1/models` — получить публичный каталог моделей.
- `GET /api/v1/models/user` — получить доступные пользователю модели, если API key это поддерживает.
- `POST /api/v1/chat/completions` — обычный и streaming chat completion.

Settings:

- `apiKey`: хранится в пользовательских Settings/secret storage, не в tracked файлах.
- `baseUrl`: advanced поле, default `https://openrouter.ai/api/v1`.
- `defaultModel`: точный OpenRouter model id/slug, например `anthropic/claude-sonnet-4`, `openai/gpt-4.1-mini` или `deepseek/deepseek-chat-v3-0324:free`.
- `catalogCache`: runtime-only cache на время открытия Settings; source of truth остается OpenRouter.

Request headers:

- `Authorization: Bearer <OPENROUTER_API_KEY>`;
- `HTTP-Referer` и `X-Title` можно добавить как optional идентификацию приложения, но не делать их критичными для MVP.

## 6. Settings UX MVP

В Project Manager Settings добавить карточку/provider section `OpenRouter`:

- masked API key field;
- model search input;
- DOM-owned result list с найденными моделями;
- selected model row: `id`, display name, context length, free/paid marker, краткая pricing/metadata строка.

Поведение поиска:

- при фокусе поля или открытии OpenRouter tab каталог грузится лениво через `/api/v1/models`;
- при наличии API key можно дополнительно грузить `/api/v1/models/user`;
- ввод фильтрует fetched catalog локально по `id`, `canonical_slug`, `name`, `description`;
- точное совпадение `id` или `canonical_slug` всегда показывается первым;
- пользователь выбирает модель кликом по строке результата;
- если каталог недоступен, Settings показывает ошибку и не подменяет выбранную модель.

UI constraint: не использовать native `<select>` для большого списка. Нужен DOM-owned searchable listbox, чтобы избежать CEF/macOS проблем и нормально работать с тысячами моделей.

## 7. Runtime Chat Contract

- Provider id: `openRouter`.
- Settings default влияет только на новые chat sessions.
- При создании chat session Core записывает `session.modelBinding.modelId = <openrouter slug>`.
- Существующая сессия продолжает использовать свой bound model, даже если Settings поменялись.
- Adapter отправляет в OpenRouter точный `model` из binding.
- Если пользователь выбрал конкретную модель, OpenRouter provider не должен незаметно заменить ее локально. Исключение — пользователь сам выбрал OpenRouter router model, например `openrouter/auto` или `openrouter/free`.
- Streaming chunks мапятся в существующий assistant live text flow.
- Usage и actual routed model, если OpenRouter возвращает их в ответе, показываются в status panel как telemetry, но не меняют bound model.

## 8. Минимальная архитектура реализации

Сохраняем текущий pattern direct HTTP provider, похожий по границам на `glmNative` и `localModels`.

Ожидаемые зоны изменения для будущего implementation scope:

- Core provider adapter: OpenRouter request/streaming/error handling.
- Core settings schema/defaults: `providers.openRouter`.
- Project Manager Settings UI: provider section, live catalog search and exact slug selection.
- Provider/model picker surfaces for standalone chat creation.
- Targeted tests around settings normalization, live search ordering, request body and SSE parsing.

Не вводить новый общий abstraction layer для "OpenAI-compatible providers" в MVP. Если позже появится второй-третий совместимый backend с одинаковой болью, тогда можно вынести общий helper.

## 9. Implementation Slicing Draft

Будущий `todo-plan.md` после acceptance можно нарезать так:

### Phase 1 — Core Transport

1. Добавить OpenRouter runtime adapter и SSE reader — scope: `packages/core/src/open-router/**`.
2. Зарегистрировать provider id, capability и settings defaults — scope: `packages/core/src/**` до 3 файлов.

### Phase 2 — Settings And Catalog

1. Добавить settings contract для `providers.openRouter` — scope: shared/core settings files до 3 файлов.
2. Добавить catalog fetch/live-search bridge — scope: core + UI bridge до 3 файлов.
3. Добавить Project Manager Settings section — scope: PM Settings components/styles до 3 файлов.

### Phase 3 — Chat Entry Points

1. Подключить OpenRouter к standalone chat provider picker — scope: chat start/picker files до 3 файлов.
2. Пробросить selected model slug в `session.modelBinding` — scope: Core session creation files до 3 файлов.

### Phase 4 — Verification

1. Unit/regression tests for live search ordering, settings persistence and request body.
2. Targeted builds: affected core package and Project Manager/webview build.
3. User Workflow Acceptance Testing with real OpenRouter API key and at least one free model.

### Phase 5 — Scope Closeout

После user acceptance перенести stable behavior в SSOT docs, архивировать planning doc и закрыть active todo plan.

## 10. Acceptance Criteria

- В Settings можно ввести OpenRouter API key.
- В Settings можно начать вводить имя/slug и сразу увидеть список совпадений из OpenRouter catalog.
- Точное совпадение slug показывается первым и выбирается кликом без отдельной кнопки проверки.
- Для новой chat session Core сохраняет точный OpenRouter model slug как effective model identity.
- Chat streaming работает через `/api/v1/chat/completions`.
- При точном выборе модели нет локального silent fallback.
- Agent SDK не используется в MVP.

## 11. Follow-Ups After MVP

- Optional OpenRouter routing controls: `only`, `ignore`, `sort`, `allow_fallbacks`, `require_parameters`, `max_price`.
- Optional OpenRouter server tools per chat profile, но только после явного UI/permission contract.
- Optional `OpenRouter Agent Mode` на базе Agent SDK как отдельный режим, если нужен agent loop с tools/state внутри OpenRouter SDK.
- Optional presets support, если пользователь захочет сохранять OpenRouter-side routing/model profiles.
