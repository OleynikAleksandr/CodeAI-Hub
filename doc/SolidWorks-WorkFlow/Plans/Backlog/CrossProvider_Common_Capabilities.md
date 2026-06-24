# Пересечение возможностей Claude Agent SDK и Codex App Server: что безопасно внедрять в CodeAI Hub

**Date:** 2026-04-19
**Updated:** 2026-05-01
**Status:** Research / Decision-making document (документ для принятия решений)
**Source type:** Синтез двух provider-документов, актуализированный после полного перехода Codex на App Server и проверки механизмов стартовых инструкций.
**Scope:** Выделить **только те возможности, которые одинаково доступны** через Codex App Server и через Claude Agent SDK — чтобы в едином UI-слое CodeAI Hub можно было внедрять именно их, без риска расхождения UX между провайдерами.

**Current implementation note (2026-05-01):** первый практический кандидат из этого документа уже частично реализован: workflow-agent startup profile применяется для Claude и Codex, а Codex documentation tool profile валидирован в release `1.2.82`. Этот файл остаётся active research/backlog для следующих общих возможностей (tool/action UI, session lifecycle, MCP/custom tools, usage/error discovery). Текущие runtime-инварианты см. в `Modules/Claude.md`, `Modules/Codex.md`, `Modules/Codex_ProviderInvocationFlags.md` и `System/SystemArchitecture.md`.

**Связанные документы:**
- [Codex App Server — анализ возможностей](./Codex_AppServer_Capabilities_Analysis.md)
- [Claude Agent SDK — анализ возможностей](./Claude_Agent_SDK_Capabilities_Analysis.md)

---

## Планы внедрения общих возможностей

Этот блок — практический shortlist того, что мы пока не используем или используем частично, но можем внедрять как общий механизм для Claude и Codex без ломки единого UX.

### План 0. Динамические инструкции workflow-агентов

Это самый важный общий следующий шаг.

Нужно ввести provider-neutral `WorkflowInstructionProfile` для каждого workflow step (`Description`, `Virtual Simulation`, `Diagram Modules`, далее development tree). Один profile должен содержать:

- короткий общий harness-блок CodeAI Hub;
- step-specific developer/system рамку;
- список разрешённых источников контекста;
- флаги отключения нерелевантного provider-noise;
- путь к первому user template из `~/.codeai-hub/templates/...`.

Mapping по провайдерам:

- **Claude**: `systemPrompt` + `settingSources: []`; подробный template шага остаётся первым user prompt.
- **Codex**: `thread/start.baseInstructions` / `thread/resume.baseInstructions`, `thread/start.developerInstructions` / `thread/resume.developerInstructions`; при необходимости config/profile flags (`project_doc_max_bytes = 0`, `[skills] include_instructions = false`, отключение нерелевантных app/env blocks). Подробный template шага также остаётся первым user prompt.

Skills не являются основным механизмом stage-specific поведения в нашем workflow. Они полезны универсальному агенту, который сам выбирает навык, но CodeAI Hub уже создаёт отдельного агента под конкретный шаг.

Для tool-enabled режимов нельзя просто вырезать provider harness. В profile должен быть минимальный общий блок про инструменты, permissions, sandbox и ожидаемый формат вывода; иначе мы улучшим релевантность инструкций ценой потери правил исполнения.

### План 1. Tool/action UI

Следующий видимый выигрыш: единый слой для tool calls, command output, file changes и approvals.

- Codex: `commandExecution`, `fileChange`, `permissions/requestApproval`, `turn/diff/updated`.
- Claude: `tool_use`, `SDKToolProgressMessage`, `SDKLocalCommandOutputMessage`, `PreToolUse` / `PermissionRequest`.

Цель: один UI-контракт `AgentActionItem` для терминала, diff-viewer, approval cards и audit log.

### План 2. Жизненный цикл сессий

Общий слой сессий можно расширять без provider lock-in:

- список и чтение истории;
- fork;
- rollback/rewind;
- compact;
- rename;
- metadata/usage/errors.

Это должно лечь в общий Session Sidebar, а provider-specific механика останется внутри адаптеров.

### План 3. MCP и custom tools

Оба провайдера поддерживают MCP и client-side/custom tools, но API разные. Правильная абстракция — не «пробросить сырой MCP», а завести общий registry инструментов CodeAI Hub и provider-specific adapters.

### План 4. Usage, errors, model discovery

Нужно перестать хардкодить поведение в UI:

- модели брать из runtime discovery, где это возможно;
- usage/rate limits приводить к общим категориям;
- provider-specific errors маппить в единый набор (`ContextWindow`, `UsageLimit`, `Unauthorized`, `Network`, `Sandbox`, `Execution`, `Other`).

### План 5. Отложенное

Skills, plugins/marketplaces, review mode, realtime/voice, subagents, background tasks и provider hook internals не должны быть первым этапом. Их можно использовать под капотом или вынести в provider-specific advanced settings, но не как базовый единый UX.

---

## 0. Зачем этот документ нужен (самое важное)

В CodeAI Hub **единый пользовательский интерфейс** для всех провайдеров. Пользователь видит один и тот же чат, один и тот же блок настроек, одну и ту же боковую панель сессий, одни и те же карточки подтверждений — независимо от того, с какой моделью он сейчас работает. Провайдер отличается только цветом некоторых плашек и, возможно, незначительными нюансами поведения.

Это сознательная архитектурная ставка. Между провайдерами и пользователем **стоит наш собственный абстракционный слой** — он нормализует события, приводит разные протоколы к одному внутреннему контракту, хранит состояние сессий в общем формате.

Отсюда вытекает главное правило:

> Нет смысла внедрять «богатую» фичу для одного провайдера, если у другого провайдера её нет. Иначе в UI появятся кнопки, которые работают только на Claude, или панели, которые заполняются только для Codex. Пользователь увидит неконсистентный продукт, где половина функционала зависит от текущего выбора модели.

Поэтому в **едином UX-слое** имеет смысл поддерживать только те возможности, которые есть **и у Claude Agent SDK, и у Codex App Server** — даже если реализации под капотом отличаются.

Фичи, которые есть только у одного провайдера, можно (при желании) использовать на его «внутренней кухне» — например, как источник метаданных или оптимизацию — но они не должны проникать в UI как видимая пользователю возможность.

---

## 1. Методология

Для каждой возможности мы задаём четыре вопроса:

1. **Есть ли аналог у Codex App Server?**
2. **Есть ли аналог у Claude Agent SDK?**
3. **Насколько близки реализации? (1:1 / близко / концептуально)**
4. **Можно ли ввести единую абстракцию в нашем ядре?**

По результатам фича попадает в одну из четырёх категорий:

- **Сильное пересечение** — оба провайдера поддерживают напрямую, UX идентичен. Безопасно внедрять в UI.
- **Частичное пересечение** — концепт совпадает, но детали расходятся. Внедрять можно с осторожностью и внутренним mapping-слоем.
- **Только Codex** — в единый UX брать нельзя. Либо убираем, либо переводим в «advanced» настройки с маркировкой «только для Codex».
- **Только Claude** — аналогично, с маркировкой «только для Claude».

Отдельно — заметка про будущих провайдеров: этот документ фиксирует пересечение текущей Claude/Codex пары. Любой новый live provider требует отдельной capability-аудит вставки перед тем, как его возможности попадут в единый UX.

---

## 2. Сильное пересечение — что безопасно внедрять прямо сейчас

Это базис «общий знаменатель», на который мы можем строить единый UX.

### 2.0. Scoped стартовые инструкции workflow-агентов

**Описание простым языком**: каждый workflow step получает не «общего ассистента», а отдельного агента с релевантной стартовой рамкой. Первый user prompt остаётся подробным заданием шага, а provider-level инструкции только убирают конфликтующий шум и фиксируют границы роли.

- Codex App Server: `thread/start.baseInstructions`, `thread/resume.baseInstructions`, `thread/start.developerInstructions`, `thread/resume.developerInstructions`; дополнительно config/profile flags вроде `project_doc_max_bytes = 0`, `[skills] include_instructions = false`, `include_environment_context`, `include_permissions_instructions`, `include_apps_instructions`.
- Claude Agent SDK: `systemPrompt` + `settingSources: []`; опционально `systemPrompt` preset/append, но для узких workflow-агентов предпочтительнее короткий custom prompt.
- Совместимость: **сильное пересечение по цели, разные API**.
- Внедрять: **первым**. Это не UI-фича, но она влияет на качество всех workflow-шагов и снижает риск конфликта между широкими системными инструкциями провайдера и конкретным первым запросом пользователя.
- Ограничение: при включённых инструментах profile обязан сохранить минимальные tool/sandbox/permission/output правила, а не только step-specific задачу.

### 2.1. Базовый жизненный цикл сессии

**Описание простым языком**: создать разговор, дать ему идентификатор, возобновить позже, прервать в середине.

- Codex App Server: `thread/start`, `thread/resume`, `turn/start`, `turn/interrupt`.
- Claude Agent SDK: `query({ sessionId, resume, ... })`, `Query.interrupt()`.
- Совместимость: **1:1**.
- Внедрять: **уже внедрено** — это ядро текущего провайдер-контракта.

### 2.2. Стриминг текстового ответа и reasoning

**Описание простым языком**: показывать ответ модели и её внутренние рассуждения по мере того, как они генерируются, а не ждать целиком.

- Codex App Server: `item/agentMessage/delta`, `item/reasoning/summaryTextDelta`, `item/reasoning/textDelta`.
- Claude Agent SDK: `SDKPartialAssistantMessage` (`type: "stream_event"`) с `content_block_delta` для `text_delta` и `thinking_delta`.
- Совместимость: **близко** (разные имена событий, но идентичная семантика).
- Внедрять: **уже внедрено**.

### 2.3. Ветвление сессии (fork)

**Описание простым языком**: создать копию разговора на определённой точке, чтобы попробовать другой путь, не теряя исходный.

- Codex App Server: `thread/fork` (передаём `threadId`, получаем новый `threadId` с копией истории).
- Claude Agent SDK: `forkSession: true` в опциях `query()`.
- Совместимость: **1:1**.
- Внедрять: кнопка «Fork conversation» в UI сессии.

### 2.4. Откат (rewind / rollback) — возврат к точке в истории

**Описание простым языком**: Undo-кнопка, отменяющая последние шаги агента.

- Codex App Server: `thread/rollback` (откатывает последние N turn'ов).
- Claude Agent SDK: `rewindFiles(userMessageId)` + `resumeSessionAt: messageUuid`. В паре это даёт и откат файлов, и продолжение с конкретной точки истории.
- Совместимость: **близко по цели, разное по механике**. Codex откатывает turn'ы как единицу, Claude — по конкретному сообщению, плюс отдельно умеет откатывать файлы.
- Внедрять: в UI единая кнопка «Undo N steps», внутри — разный вызов в зависимости от провайдера. Потребует абстракции в ядре.

### 2.5. Компактация контекста

**Описание простым языком**: когда разговор становится длинным, автоматически или по команде сжать старую часть в сводку.

- Codex App Server: `thread/compact/start` (асинхронная компактация).
- Claude Agent SDK: автоматическая + управляемая, `SDKCompactBoundaryMessage` с `trigger: "manual" | "auto"`, `PreCompact` hook.
- Совместимость: **концептуально**. Codex — явный запрос, Claude — больше автомат + hook. Но пользовательский UX «мы сжали историю» — один.
- Внедрять: индикатор «история сжата» + опциональная ручная кнопка «Compact now».

### 2.6. Список сохранённых сессий с метаданными

**Описание простым языком**: боковая панель «мои разговоры», с именами, датами, первой репликой.

- Codex App Server: `thread/list` с фильтрами (`modelProviders`, `sourceKinds`, `archived`, `cwd`), курсорной пагинацией, сортировкой.
- Claude Agent SDK: `listSessions({ dir, limit, includeWorktrees })`. Метаданные `SDKSessionInfo`: `sessionId`, `summary`, `lastModified`, `fileSize`, `customTitle`, `firstPrompt`, `gitBranch`, `cwd`, `tag`, `createdAt`.
- Совместимость: **близко** (оба дают список, оба дают метаданные).
- Внедрять: полноценная боковая панель сессий с фильтрами и поиском.

### 2.7. Чтение истории без возобновления

**Описание простым языком**: посмотреть, что было в сессии, не прогревая её в память.

- Codex App Server: `thread/read` с `includeTurns: true`.
- Claude Agent SDK: `getSessionMessages(sessionId)` + `getSessionInfo(sessionId)`.
- Совместимость: **1:1**.
- Внедрять: «превью сессии» при наведении на карточку в боковой панели.

### 2.8. Именование и теги сессии

**Описание простым языком**: дать разговору человекочитаемое имя и, возможно, теги для группировки.

- Codex App Server: `thread/name/set` + уведомление `thread/name/updated`.
- Claude Agent SDK: `renameSession(sessionId, title)` + `tagSession(sessionId, tag | null)`.
- Совместимость: **1:1** для имени, **только Claude** для тегов (у Codex тегов нет, но архивность есть).
- Внедрять: переименование гарантированно, теги — можно сделать как Claude-специфичное расширение, но именно в UI выставлять единообразно.

### 2.9. Extended thinking / reasoning effort

**Описание простым языком**: модель может перед ответом «подумать глубже». Управляется уровнем усилий.

- Codex App Server: в turn overrides — `effort` (`low` / `medium` / `high` / `xhigh`) и `summary` (`auto` / `concise` / `detailed` / `none`).
- Claude Agent SDK: `thinking: { type, max_tokens }` + `effort: "low" | "medium" | "high" | "xhigh" | "max"` + runtime `setMaxThinkingTokens()`.
- Совместимость: **1:1** по уровням `low`/`medium`/`high`/`xhigh` (Claude ещё имеет `max`).
- Внедрять: **уже внедрено** — у нас есть `reasoningEffort` в Claude и его аналог в Codex.

### 2.10. Structured output (JSON schema)

**Описание простым языком**: попросить модель вернуть ответ в виде конкретной структуры, по нашей схеме.

- Codex App Server: `outputSchema` в опциях `turn/start`.
- Claude Agent SDK: `outputFormat: { type: "json_schema", schema }`.
- Совместимость: **1:1**.
- Внедрять: **уже частично внедрено** — у нас есть `outputSchema` в Claude и соответствующий механизм для Codex.

### 2.11. Rate limits и usage tracking

**Описание простым языком**: показывать, сколько использовано токенов, сколько потрачено денег, сколько осталось до сброса лимита.

- Codex App Server: `account/rateLimits/read`, уведомления `account/rateLimits/updated`, `thread/tokenUsage/updated` с текущей статистикой turn'а; бакеты `currentSession` + `currentWeekAllModels`.
- Claude Agent SDK: `SDKRateLimitEvent`, `SDKResultMessage.usage` (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`), `total_cost_usd`, `modelUsage` per-модель.
- Совместимость: **близко**. Оба дают токены и предупреждения, у Codex есть account-level rate limits с `resetsAt`, у Claude — более точный cost в USD.
- Внедрять: единый виджет «использование» с progress-bar по bucket'ам, живой обновляющийся.

### 2.12. Выбор модели и runtime-переключение

**Описание простым языком**: переключить модель в процессе разговора — без создания новой сессии.

- Codex App Server: `model` в turn overrides (per-turn override).
- Claude Agent SDK: `query.setModel(model)` (runtime) + `fallbackModel` в опциях.
- Совместимость: **близко**. Codex меняет модель per-turn, Claude может менять во время сессии.
- Внедрять: выпадающий список моделей в заголовке чата.

### 2.13. Discovery: какие модели и команды доступны

**Описание простым языком**: не хардкодить список моделей и команд в коде клиента, а получать его от провайдера.

- Codex App Server: `model/list`, `experimentalFeature/list`, `collaborationMode/list`.
- Claude Agent SDK: `Query.supportedModels()`, `Query.supportedCommands()`, `Query.supportedAgents()`, `SDKSystemMessage` с полным списком при init.
- Совместимость: **близко**. Оба дают списки на runtime. Детали метаданных отличаются.
- Внедрять: динамический список моделей в UI, автокомплит slash-команд.

### 2.14. MCP (Model Context Protocol)

**Описание простым языком**: подключение внешних инструментов (GitHub, базы, Slack, Jira и т.п.) по стандарту MCP.

- Codex App Server: `mcpServerStatus/list`, `mcpServer/oauth/login`, `config/mcpServer/reload`, `mcpServer/tool/call`, `mcpServer/resource/read`, `mcpServer/startupStatus/updated`.
- Claude Agent SDK: `mcpServers` в опциях (stdio / SSE / HTTP / SDK in-process), `allowedTools` с wildcards `mcp__server__*`, runtime `mcpServerStatus()` / `reconnectMcpServer()` / `toggleMcpServer()` / `setMcpServers()`.
- Совместимость: **сильное пересечение**. Оба поддерживают stdio-процессы и HTTP, оба управляют через конфиг и runtime-операции.
- Внедрять: полноценный UI управления MCP-серверами (список, статус, вкл/выкл, переподключить).

### 2.15. Подтверждения (approvals) для инструментов

**Описание простым языком**: показывать пользователю карточки «можно выполнить команду X?», «можно изменить файл Y?» — с кнопками allow/deny.

- Codex App Server: `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`, ответы `accept` / `acceptForSession` / `decline` / `cancel` / `amendExecPolicy`, подтверждение `serverRequest/resolved`.
- Claude Agent SDK: `PreToolUse` hook → `permissionDecision: "allow" | "deny" | "ask"`, `permissionMode`, `allowedTools`/`disallowedTools`, `canUseTool` custom function, `PermissionRequest` hook, `AskUserQuestion` tool для интерактива.
- Совместимость: **близко**. Концептуально идентично: server спрашивает клиента, клиент отвечает. Расширения (acceptForSession у Codex, deny с updatedInput у Claude) совпадают по UX.
- Внедрять: единые карточки подтверждения, унифицированные кнопки.

### 2.16. Вызовы инструментов с потоковым выводом

**Описание простым языком**: когда агент запускает терминальную команду или правит файл — пользователь видит процесс в реальном времени.

- Codex App Server: `item/commandExecution` + `item/commandExecution/outputDelta`, `item/fileChange` + `item/fileChange/outputDelta`.
- Claude Agent SDK: `tool_use` блоки в `SDKAssistantMessage.content`, `SDKToolProgressMessage`, `SDKLocalCommandOutputMessage`. Для `Bash` — потоковый вывод, для `Write`/`Edit` — результат патча.
- Совместимость: **близко**. Оба дают tool-start → tool-output → tool-completed. Разные форматы, но UX один.
- Внедрять: терминал-панель + diff-viewer как часть чата.

### 2.17. Веб-поиск и web-fetch

**Описание простым языком**: агент сам ищет в интернете, когда это нужно.

- Codex App Server: `webSearch` item type.
- Claude Agent SDK: built-in tools `WebSearch` и `WebFetch`.
- Совместимость: **1:1 по UX**. Результат: агент показывает источники, цитаты, ссылки.
- Внедрять: «веб-источники» в отдельном блоке чата.

### 2.18. Просмотр изображений

**Описание простым языком**: агент может принять изображение на вход и описать его, а также может показать картинку в ответе.

- Codex App Server: `imageView` item type + типы ввода `image` (URL) и `localImage` (локальный путь).
- Claude Agent SDK: изображения в `ContentBlock[]` сообщения (`type: "image"`).
- Совместимость: **1:1 по UX**.
- Внедрять: drag-drop картинок в input, inline-превью в чате.

### 2.19. Вопросы пользователю (interactive clarification)

**Описание простым языком**: агент спрашивает пользователя уточняющий вопрос с вариантами ответов, прежде чем продолжить.

- Codex App Server: `tool/requestUserInput` (experimental) — 1-3 вопроса, каждый с опцией `isOther` для свободного ввода.
- Claude Agent SDK: built-in tool `AskUserQuestion` — multiple-choice с кастомным форматом превью.
- Совместимость: **1:1 по UX**.
- Внедрять: модальная форма с радио-кнопками + свободный ввод.

### 2.20. Custom tools со стороны клиента

**Описание простым языком**: мы можем дать агенту наши собственные инструменты, которые исполняются в нашем приложении (а не во внешнем процессе).

- Codex App Server: `dynamicToolCall` items (experimental) — client-executed tools.
- Claude Agent SDK: `tool()` + `createSdkMcpServer()` — in-process MCP server с custom tools, типизованные через Zod.
- Совместимость: **близко** (Claude зрелее по API, но концепт один).
- Внедрять: наш собственный «зоопарк» инструментов, унифицированный.

### 2.21. Структурированные ошибки

**Описание простым языком**: разные категории ошибок — разные UX в ответ.

- Codex App Server: `codexErrorInfo`: `ContextWindowExceeded`, `UsageLimitExceeded`, `HttpConnectionFailed`, `ResponseStreamConnectionFailed`, `ResponseStreamDisconnected`, `ResponseTooManyFailedAttempts`, `BadRequest`, `Unauthorized`, `SandboxError`, `InternalServerError`, `Other` + опционально `httpStatusCode`.
- Claude Agent SDK: subtype ошибки в `SDKResultMessage`: `error_max_turns`, `error_during_execution`, `error_max_budget_usd`, `error_max_structured_output_retries` + `permission_denials: SDKPermissionDenial[]`.
- Совместимость: **близко**. Коды разные, но категории «превышен лимит», «ошибка выполнения», «нет авторизации», «проблема сети» присутствуют у обоих.
- Внедрять: единый mapping из кода провайдера в внутреннюю категорию, с разными текстами и кнопками действий для каждой.

### 2.22. Auto-completion / pre-warming

**Описание простым языком**: ускорить первый ответ после запуска клиента.

- Codex App Server: long-lived процесс — по умолчанию всегда «прогрет».
- Claude Agent SDK: `startup()` → `WarmQuery.query()` — отдельная API для pre-warming.
- Совместимость: **концептуально**. У Codex это естественное свойство архитектуры, у Claude — отдельный вызов. UX один.
- Внедрять: фоново прогревать SDK при запуске приложения.

### 2.23. Скиллы (skills)

**Описание простым языком**: именованный набор инструкций/знаний, доступный агенту.

- Codex App Server: `skills/list`, `skills/config/write`, skill item в turn input.
- Claude Agent SDK: Agent Skills через `settingSources` (`.claude/skills/*/SKILL.md`) или programmatic.
- Совместимость: **концептуально**. Разные места хранения (Codex — через API, Claude — через filesystem), но UX «подключить скилл к сессии» один.
- Внедрять: **не как основной workflow-механизм**. Для наших специализированных шагов скиллы не нужны как router поведения, потому что агент уже создаётся под конкретную задачу. Их можно оставить как опциональное расширение сессии: список скиллов в advanced-настройках с чек-боксами.

---

## 3. Частичное пересечение — внедрять с оговорками

Фичи, где концепция совпадает, но реализации расходятся достаточно, чтобы требовать внутреннего mapping-слоя.

### 3.1. План действий агента

- Codex App Server: first-class `turn/plan/updated` + `plan` item type.
- Claude Agent SDK: нет протокольного события, но есть built-in tool `TodoWrite`, через который агент сам ведёт чек-лист.
- Внедрять: **можно**, но в UI единая панель «План», которая заполняется:
  - у Codex — из notifications `turn/plan/updated`;
  - у Claude — через перехват `tool_use` вызовов `TodoWrite`.

### 3.2. Live diff изменённых файлов

- Codex App Server: first-class `turn/diff/updated` — готовый unified diff, обновляется live.
- Claude Agent SDK: нет отдельного события diff, но из `tool_use` вызовов `Write` и `Edit` можно самим собирать diff (знаем old file state + знаем предлагаемую правку).
- Внедрять: **можно**, но нужно написать нормализатор «tool_use → aggregated diff» на стороне Claude. У Codex — сразу бери.

### 3.3. Per-turn overrides параметров

- Codex App Server: все параметры turn'а перекрываются через `turn/start` overrides: `model`, `effort`, `personality`, `cwd`, `sandboxPolicy`, `summary`, `collaborationMode`, `outputSchema`.
- Claude Agent SDK: часть параметров — на уровне опций `query()` (фиксируется при создании сессии); часть — через runtime-методы `Query` (`setModel`, `setPermissionMode`, `setMaxThinkingTokens`).
- Внедрять: UI «настройки для следующего сообщения», внутри — разный вызов. Параметры должны быть пересечением: `model`, `effort`, `permissionMode` (≈ sandboxPolicy).

### 3.4. Sandbox / ограничения доступа

- Codex App Server: подробные политики `readOnly` / `workspaceWrite` / `externalSandbox` / `dangerFullAccess` / `restricted` с `readableRoots` + платформенные дефолты (macOS Seatbelt).
- Claude Agent SDK: упрощённое — `additionalDirectories`, `permissionMode`, `sandbox: SandboxSettings` (не детализировано публично), настройки через Bash-разрешения.
- Внедрять: **можно** базовый режим (read-only / full-access) как общий знаменатель; детальные политики оставить только в Codex-advanced.

### 3.5. Settings / конфигурация на уровне проекта

- Codex App Server: `config/read`, `config/value/write`, `config/batchWrite`, `configRequirements/read` (MDM).
- Claude Agent SDK: `settingSources` (`user` / `project` / `local`) + `.claude/settings.json`.
- Внедрять: **можно** базовое — чтение проектных настроек. Writeback через UI — только при желании тянуть это в продукт как отдельную фичу «редактор конфига».

### 3.6. Файловые операции как первоклассная поверхность

- Codex App Server: `fs/readFile`, `fs/writeFile`, `fs/createDirectory`, `fs/getMetadata`, `fs/readDirectory`, `fs/remove`, `fs/copy`, `fs/watch`, `fs/unwatch`, `fs/changed`.
- Claude Agent SDK: через built-in tools `Read` / `Write` / `Edit` / `Glob` внутри агентного цикла. Отдельного API для «просто читай файл как клиент» у Claude нет.
- Внедрять: **с осторожностью**. Filesystem-operations вне турна — уникальная фича Codex. В Claude-провайдере их можно эмулировать через синтетические turn'ы с `Bash` или `Read`, но это overhead. Лучше оставить как низкоуровневый API без UI-экспозиции.

### 3.7. Команды вне турна (ad-hoc shell)

- Codex App Server: `command/exec`, `command/exec/write`, `command/exec/resize`, `command/exec/terminate`, `command/exec/outputDelta` — полноценный API исполнения команд под sandboxPolicy **вне** сессии с агентом.
- Claude Agent SDK: `Bash` built-in tool **внутри** агентной сессии.
- Внедрять: **нет смысла** в единый UI — это управляющая операция, не пользовательская фича. Для фоновых служебных команд — использовать Codex API на его стороне, для Claude — делать собственную инфраструктуру.

### 3.8. Управление плагинами / расширениями

- Codex App Server: `plugin/list`, `plugin/read`, `plugin/install`, `plugin/uninstall`, `marketplace/add`, `app/list`.
- Claude Agent SDK: `plugins: SdkPluginConfig[]` — локальные пути к плагинам, `SDKPluginInstallMessage` статусы.
- Внедрять: **можно** базовый установочный UI, но marketplace-surface есть только у Codex — оставить как Codex-специфичную вкладку.

---

## 4. Только Codex App Server — в единый UX не берём

Ниже — возможности, которых **нет** в Claude Agent SDK (или они принципиально отличаются по модели). Их внедрение как видимую UI-фичу сломает контракт единого UX.

- **Review mode** (`review/start` + `enteredReviewMode`/`exitedReviewMode` items + inline/detached delivery) — у Claude нет протокольного review-mode. У него можно эмулировать через отдельного subagent с `code-reviewer`-промптом, но это другая операционная модель.
- **Turn steer** (`turn/steer`) — добавить ввод в in-flight turn. У Claude есть streaming input, но это для создания сессии с самого начала, не для «вклиниться в идущий turn».
- **Архивация сессий** (`thread/archive` / `thread/unarchive`) — Claude не знает про архивность; теги могут заменить концепцию частично.
- **Multi-client подписки** (`thread/unsubscribe`, `thread/closed`, `thread/loaded/list`) — Claude: `persistSession` управляет только диском, не подписками.
- **Thread shellCommand вне sandbox** (`thread/shellCommand`) — выполнить shell от имени пользователя с полным доступом. У Claude нет аналога — все команды идут через `Bash` tool под permission-контролем.
- **Thread inject_items** (`thread/inject_items`) — программная вставка айтемов в тред. У Claude ближайший аналог — streaming input с `isSynthetic: true`, но это не инъекция.
- **Background terminals cleanup** (`thread/backgroundTerminals/clean`) — Codex-специфично.
- **ChatGPT OAuth** (`chatgpt` + `chatgptAuthTokens` auth modes) — Anthropic **запрещает** 3rd-party сервисам использовать claude.ai OAuth. У Claude принципиально нет аналога.
- **`account/sendAddCreditsNudgeEmail`** — нажать «пополните кредиты» по email. Не переносимо.
- **Realtime / voice** (`thread/realtime/*` — audio, transcript, SDP) — Claude Agent SDK не имеет встроенного realtime-surface в библиотеке.
- **Windows Sandbox setup** (`windowsSandbox/setupStart`/`setupCompleted`) — Codex-специфично.
- **External agent config migration** (`externalAgentConfig/detect`/`import`) — специфичная фича миграции с других агентов.
- **Feedback upload** (`feedback/upload`) — встроенный канал фидбэка.
- **Rate-limit bucket**-semantics (`currentSession` + `currentWeekAllModels` + `resetsAt`) — у Claude другой механизм (по API key), без week-level bucket'а.
- **Skill/mention input items как first-class** (`{ type: "skill" | "mention" }`) — Claude инжектирует скиллы через system prompt, не как item в turn.

### Что с этим делать

Большинство этих фич либо инфраструктурные (feedback, migration, windows setup), либо привязаны к OAuth-модели OpenAI. В едином UX они либо не нужны, либо их UX-эквивалент реализуем через другие механизмы (например, feedback можно делать своим).

Если бы мы всё-таки хотели «Review mode» в UI — его можно было бы делать как **кнопку, которая работает по-разному**:
- на Codex — через `review/start`;
- на Claude — через спавн отдельного сабагента с `code-reviewer` prompt.

Но в общем случае — это не сильное пересечение, и его стоит отложить.

---

## 5. Только Claude Agent SDK — в единый UX не берём

Возможности, которых нет у Codex App Server:

- **Claude hook pipeline как SDK callback-система** — у Claude есть расширенный набор hooks с blocking/modify/additionalContext semantics внутри SDK. У Codex тоже появились lifecycle hooks (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `Stop`), но это filesystem/config hooks App Server/CLI, а не тот же programmatic callback API. В единый UX не нужно выставлять «hooks» как пользовательскую фичу; использовать их стоит только внутри provider adapter.
- **Субагенты с собственным контекстом** (`agents: AgentDefinition`, built-in `Agent` tool, `parent_tool_use_id`) — у Codex есть `collaborationMode` (концептуально похоже, но разная модель).
- **File checkpointing** как отдельная фича (`enableFileCheckpointing` + `rewindFiles` с возможностью `dryRun`) — у Codex есть `thread/rollback`, но он откатывает turn'ы, не файлы.
- **`maxBudgetUsd`** — остановка по стоимости в долларах. У Codex нет аналога.
- **`maxTurns`** — ограничение числа итераций. У Codex есть interrupt, но не явное ограничение.
- **`fallbackModel`** — резервная модель. У Codex нет.
- **Prompt suggestions** (`promptSuggestions: true`, `SDKPromptSuggestionMessage`) — встроенный auto-continue.
- **Plan mode** (`permissionMode: "plan"`) — встроенный режим планирования без исполнения.
- **Bedrock / Vertex / Azure** как auth-провайдеры — очевидно Claude-специфично.
- **Worktree lifecycle hooks** — специфично для git worktree работы.
- **`startup()` → `WarmQuery`** pre-warming — Codex-процесс сам по себе long-lived.
- **`outputStyle`** (в `SDKSystemMessage`) — форматирование вывода.
- **Background tasks API** (`SDKTaskStartedMessage` / `ProgressMessage` / `NotificationMessage`, `stopTask(taskId)`) — у Codex нет отдельного task-surface.
- **Memory** (`CLAUDE.md`) — специфика Claude.

### Что с этим делать

Большинство из этого не нужно тянуть в единый UX — они либо инфраструктурные (fallback model, hooks для логирования), либо Claude-специфичные по природе (Bedrock auth).

Отдельно стоит **`maxBudgetUsd`** и **`maxTurns`** — это реально полезные ограничители. Их можно:
- на Claude — использовать напрямую;
- на Codex — эмулировать на нашей стороне (считать потраченный `tokenUsage` и прерывать turn при достижении порога).

Это вполне оправданно для продуктов с ограничением стоимости. Решение о внедрении — отдельный вопрос, но не в UI.

---

## 6. Заметка про будущих провайдеров

Этот документ больше не обещает parity для удалённых provider modules. Если в CodeAI Hub добавляется новый live provider, его SDK/API сначала получает отдельный capabilities analysis по той же структуре, что Claude/Codex, и только затем меняет общий UX contract.

> В единый UX-слой CodeAI Hub внедряем только пересечение всех активных workflow providers.

Для каждой фичи из раздела 2 перед расширением UX нужно отдельно проверить её наличие у нового provider'а. Если её нет — либо держим фичу provider-internal, либо откладываем unified UX до появления аналога, либо явно выводим provider-specific limitation только после отдельного product decision.

---

## 7. Сводная дорожная карта для единого UX

Ниже — приоритизированный список того, что **имеет смысл внедрять в CodeAI Hub** с учётом того, что это работает и у Claude, и у Codex (то есть UX будет согласованным).

### Уровень 0. Динамические инструкции workflow

0. **`WorkflowInstructionProfile`** — единый объект для описания стартовой рамки workflow step.
1. **Provider mapping**:
   - Claude: `systemPrompt` + `settingSources: []`.
   - Codex: `baseInstructions` + `developerInstructions` + config toggles.
2. **Prompt diagnostics** — debug-лог фактического instruction stack для каждого provider/step.
3. **No skills routing by default** — skills остаются advanced extension, а не механизм выбора поведения workflow-агента.

### Уровень 1. Уже внедрено

- Создание / возобновление / прерывание сессии.
- Потоковый ответ + reasoning / thinking.
- Extended thinking effort.
- Structured output через JSON schema.
- Базовый usage / rate limits.

### Уровень 2. Ближайший видимый выигрыш (высокая отдача)

1. **Обработка tool_use блоков** в обоих провайдерах + единое отображение в UI (сейчас мы этого не делаем для Claude вообще).
2. **Подтверждения инструментов** — единая UI-карточка для command approvals / file change approvals (Codex: server-initiated; Claude: PreToolUse hook).
3. **Терминал и diff-viewer** как вложенные блоки чата (Codex: `commandExecution`/`fileChange` items; Claude: `tool_use` + `Bash`/`Write`/`Edit`).
4. **Боковая панель сессий** с именами, первой репликой, фильтрами (Codex: `thread/list`; Claude: `listSessions`).
5. **Rename / tag сессии** (Codex: `thread/name/set`; Claude: `renameSession`/`tagSession`).
6. **Разные UX для разных ошибок** — mapping провайдер-специфичных кодов в единые категории (`ContextWindow`, `UsageLimit`, `Network`, `Unauthorized`, `SandboxError`).

### Уровень 3. Экосистема инструментов

7. **MCP-servers management** — панель «добавить / включить / отключить / переподключить» (оба провайдера поддерживают полноценно).
8. **Custom tools** (in-process) — наш zoo инструментов (Codex: `dynamicToolCall`; Claude: `tool()` + `createSdkMcpServer()`).
9. **AskUserQuestion / tool/requestUserInput** — модальная форма интерактивного уточнения.

### Уровень 4. UX сессий

10. **Fork** (Codex: `thread/fork`; Claude: `forkSession`).
11. **Rollback / rewind** (Codex: `thread/rollback`; Claude: `rewindFiles` + `resumeSessionAt`).
12. **Compact boundary** — индикатор в чате «история сжата».
13. **Discovery моделей** — динамический список в UI вместо хардкода.
14. **Web search / web fetch** результаты как inline-блок.
15. **Изображения на вход и в ответе**.

### Уровень 5. Частичные (требуют абстракции в ядре)

16. **Plan display** — панель «план действий» (Codex: `turn/plan/updated`; Claude: перехват `TodoWrite` tool-use).
17. **Live diff aggregation** — единый diff-viewer (Codex: `turn/diff/updated`; Claude: агрегировать из `Write`/`Edit`).
18. **Per-turn overrides UI** — «настроить следующее сообщение» (model + effort + permissionMode, как пересечение).
19. **Sandbox modes UI** — базовый переключатель read-only / full-access.

### Уровень 6. Отложенное (только при отдельном решении)

20. **Skills** — единый UI списка скиллов.
21. **Plugins / marketplaces** — установка расширений.
22. **maxBudgetUsd / maxTurns** — защитные ограничители (Codex-эмуляция на нашей стороне).
23. **Review mode** — с разной реализацией за провайдер.

### Что НЕ берём

- Realtime / voice — только Codex.
- Windows Sandbox setup — только Codex.
- External agent migration — только Codex.
- Provider hook internals как UI-surface — не берём. У обоих провайдеров есть hook-like механизмы, но они разные по API и должны оставаться внутри adapter layer.
- ChatGPT OAuth — только Codex, API запрещён для Anthropic.
- Bedrock/Vertex/Azure auth — только Claude.
- Memory (`CLAUDE.md`) / Agent Skills из filesystem — Claude-specific discovery; для нашего workflow по умолчанию выключено через `settingSources: []`.
- Turn steer / thread/shellCommand / inject_items — только Codex.
- File checkpointing (как отдельная фича с dry-run) — только Claude.

Эти возможности можно использовать «под капотом», но не выставлять в UI, чтобы не ломать единство UX между провайдерами.

---

## 8. Ссылки

### 8.1. Внутренние документы

- [Codex App Server — анализ возможностей](./Codex_AppServer_Capabilities_Analysis.md)
- [Claude Agent SDK — анализ возможностей](./Claude_Agent_SDK_Capabilities_Analysis.md)

### 8.2. Официальные источники

**Anthropic / Claude Agent SDK:**
- Overview: https://code.claude.com/docs/en/agent-sdk/overview
- TypeScript reference: https://code.claude.com/docs/en/agent-sdk/typescript
- Hooks: https://code.claude.com/docs/en/agent-sdk/hooks
- MCP: https://code.claude.com/docs/en/agent-sdk/mcp
- Subagents: https://code.claude.com/docs/en/agent-sdk/subagents
- Permissions: https://code.claude.com/docs/en/agent-sdk/permissions
- Sessions: https://code.claude.com/docs/en/agent-sdk/sessions
- Custom tools: https://code.claude.com/docs/en/agent-sdk/custom-tools
- Agent Skills: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview

**OpenAI / Codex App Server:**
- App Server docs: https://developers.openai.com/codex/app-server
- Config reference: https://developers.openai.com/codex/config-reference
- AGENTS.md instructions: https://developers.openai.com/codex/guides/agents-md
- Hooks: https://developers.openai.com/codex/hooks
- App Server README (GitHub): https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md
- Anthropic Engineering blog «Building agents with the Claude Agent SDK»: https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
- OpenAI Engineering blog «Unlocking the Codex harness»: https://openai.com/index/unlocking-the-codex-harness/

### 8.3. Экосистема MCP

- Spec: https://modelcontextprotocol.io/docs/getting-started/intro
- Официальные MCP-серверы: https://github.com/modelcontextprotocol/servers

---

## 9. Итог одной строкой

Claude Agent SDK и Codex App Server имеют очень широкое **концептуальное пересечение**: оба дают управляемые стартовые инструкции, полноценный agentic-цикл с MCP, approvals, tool streaming, session management, structured output, extended thinking, usage tracking, fork/rollback, compact и web-search. Первый общий шаг после перехода Codex на App Server — внедрить `WorkflowInstructionProfile`, который для Claude раскладывается в `systemPrompt` + `settingSources: []`, а для Codex — в `baseInstructions` + `developerInstructions` + config toggles. После этого в единый UI стоит выводить только пересечение возможностей, чтобы переключение провайдера не ломало пользователю привычный продукт. Provider-specific surface остаётся внутренней оптимизацией adapter layer или откладывается до полноценного аналога у всех активных провайдеров.
