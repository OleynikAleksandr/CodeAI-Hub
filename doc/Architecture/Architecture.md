# Архитектура CodeAI-Hub (черновик)

**Версия:** 0.1.4 (draft)
**Последнее обновление:** 2025-10-17
**Статус:** Архитектурный ориентир (исходная структура)

---

## Назначение документа

Этот документ — стартовая точка для каждой сессии разработки. Он фиксирует архитектурную картину и ключевые принципы без описания текущего хода работ. Детальные планы, статусы и шаги оформляются в других артефактах:
- **SystemArchitecture.md** — обзор всей системы (UI, core, приватные стеки, Remote Bridge).
- **Module TODO Plans** — по каждому модулю составляется отдельный план с фазами и задачами, где отслеживается прогресс. Завершённые планы архивируются в Session Reports (например, `Provider Registry & Session Orchestrator Foundation` закрыт после релиза 0.0.12), активный план — `Type Safety Hardening (Remove any)` (`doc/TODO/todo-plan.md`).
- **Session Reports** — краткий журнал каждой сессии с ссылками на коммиты и выполненные работы.

CodeAI-Hub — модульное расширение VS Code с единым webview-интерфейсом и реестром AI-провайдеров. Фронтенд наследует ключевые паттерны из проекта `claude-code-fusion`, расширяя их для мультипровайдерного сценария: несколько провайдеров, общее управление сессиями и унифицированный формат сообщений.

Документ описывает открытые (open source) слои расширения и их место в общей архитектуре: UI, extension-слой и core-слой, обеспечивающие платформу для подключаемых стеков провайдеров.

## Архитектурные принципы

1. **Модульность** — UI разбивается на фасады и микроклассы < 300 строк.
2. **Фасады состояния** — каждый крупный блок (AppChat, DialogRenderer, Input) имеет единую точку входа.
3. **Изоляция сессий** — каждое окно диалога независимое, поддерживается мультисессионность.
4. **Реиспользование** — базовые компоненты/хуки реиспользуются из `claude-code-fusion`, при этом расширяются адаптерами для провайдеров.
5. **Расширяемость** — UI готов к подстановке новых типов сообщений (tool_use, telemetry, wizard steps).

## Структура слоёв

```
UI Layer (React)          → src/webview/ui/src/
Extension Layer (VS Code) → src/extension-module/
Core Layer (Services)     → src/core/
Stacks (Private)          → приватные модули провайдеров
```

### Webview bundling and assets
- Build: `npm run webview:build:copy` (Vite → `src/webview/ui/dist` → copy to `media/webview/`).
- Entrypoints: `media/webview/chat.js`, `media/webview/index.css`.
- Extension HTML: генерируется `WebviewHtmlGenerator` (micro-class), подключающий двухрядный тулбар (`media/mainView.*`) и React-бандл `media/react-chat.*`.
- Icons: `media/icon.png` (package.json `icon`) and `media/icon.svg`.
- Imported core/types used by UI: `src/core/assistant-response-formatter-module/**`, `src/types/*.ts`.

UI слой остаётся в open source репозитории и работает с унифицированным контрактом; слои Extension/Core обеспечивают мост между UI и модулями провайдеров.

---

## Встраивание в архитектуру системы

- **UI Layer** образует верхний уровень из раздела «UI-оболочка VS Code» системного документа и отвечает за визуализацию диалогов, визардов и управления сессиями.
- **Extension Layer** соответствует «Ядру-оркестратору» на уровне VS Code API: регистрирует команды, управляет жизненным циклом webview, передаёт события в core и принимает результаты.
- **Core Layer** реализует «Общие сервисы» и «Реестр провайдеров»: хранение конфигураций, логирование, workflow-координаторы, мост к удалённому UI (в дальнейшем). 
- **Stacks (Private)** — внешние по отношению к open source части модули провайдеров, подключаемые через реестр; их архитектуры описываются в `doc/Project_Docs/Stacks/*`.

Такое разбиение позволяет держать UI и базовую инфраструктуру открытыми, а провайдер-специфичную логику — в закрытых релизах. Конкретные этапы разработки определяются в соответствующих Module TODO Plans.

---

## UI Layer — ключевые модули

### app-chat-module
- **AppChatFacade** — главный координатор UI, хранит глобальное состояние и события провайдеров.
- **SessionTabManager** — управляет вкладками сессий, обновляет UI при переключении провайдера.
- **SessionWaitingIndicatorBridge** — транслирует состояние ожидания (пульсация) для фоновых сессий.
- **AppChatStateManager** — использует `vscode.setState` для сохранения открытых вкладок и глобальных флагов.
- **SessionTabs** — React-компонент вкладок, адаптирован под мультипровайдерный контекст (значки провайдера, статус подключения).

### session-interface-module
- **SessionInterfaceFacade** — монтируется только для активной сессии, передаёт идентификатор провайдера.
- **Компоненты:** DialogManager, TodosManager, InputManager, StatusManager, SessionStateManager, SessionStateContainer, SessionUserActions, SessionMessageRouter.
- Модуль интегрирует провайдер-специфичные тулзы через реестр, не изменяя базовый рендер.

### dialog-renderer-module
- **DialogRendererFacade** — отвечает за потоковый рендер сообщений и авто-прокрутку.
- **Компоненты:** MessageBlock, UserMessageRenderer, AssistantMessageRenderer, ToolUseMessageRenderer, FinalIndicator, SessionHeader, ContentFormatter, FormattedMarkdownRenderer, RendererRegistry.
- **Hooks:** `useDialogMessages`, `useFinalIndicatorState`. Добавлены адаптеры для провайдеров, чтобы поддержать их собственные события (`thinking`, `system` и др.).

### tool-use-renderer-module
- **ToolUseRendererFacade** — фасад отображения карточек инструментов.
- **Компоненты:** ToolUseMessageRenderer, ToolUseCard, ToolUseHeader, ToolUseRendererRegistry, DefaultToolUseRenderer, специализированные `*ToolRenderer`.
- Реестр расширен событиями других провайдеров; поддерживаются кастомные цвета/иконки.

### доп. UI модули
- **dialog-block-module** — композиция блока диалога, адаптирована под режим сравнения провайдеров.
- **input-block-module** — ввод сообщений, выбор провайдера/режима, подсказки лимитов.
- **status-block-module** — индикаторы статуса (кредиты, тип провайдера, состояние подключения Remote Bridge).
- **todos-block-module** — UI для TODO и структурированных задач.
- **session-tabs-component** — стили и логика вкладок с провайдерными бейджами.
- **drag-drop-module** — обработка drag&drop файлов, добавлены события маршрутизации к провайдерам.

---

## Extension Layer — актуальные фасады

- **ViewProviderFacade** (`src/extension-module/micro-classes/ViewProviderFacade.ts`) — регистрирует webview (`codeaiHub.controlCenter`), использует `WebviewProvider` и поднимает `MessageProviderRefactored`.
- **WebviewProvider** — создаёт HTML через `WebviewHtmlGenerator`, настраивает CSP и маршрутизирует сообщения между вебвью и backend-частью.
- **CommandRegistrar** — регистрирует команды `codeai-hub.openControlCenter` и `codeai-hub.openSettings`, прокидывает `ui:showSettings` в webview.
- **MessageProviderRefactored** — facade-координатор, создаёт `MessageProviderMessageHandler`, логирует ключевые события в `OutputChannel` (`CodeAI Hub`), проксирует сообщения между webview и orchestrator, публикует `provider:*` события в UI.
- **MessageProviderMessageHandler** (`src/extension-module/micro-classes/MessageProviderMessageHandler.ts`) — микрокласс с маршрутизацией команд (`ui:userInput`, `draft:*`, `settings:*`, drag & drop), управляющий сессиями и взаимодействием с orchestrator.
- **SessionManager** — in-memory + workspace-state стор для сессий (создание, восстановление, сохранение диалогов, статусные апдейты).
- **SettingsManager** — хранит и отдаёт настройки Thinking Mode через `globalState`, обеспечивает обработку `settings:load/save/reset`.
- **FileOperationsFacade** — координирует drag & drop и черновики: работает с `FileDropHandler` и `DraftOperationsHandler`, форматирует пути и отдаёт их webview, сохраняет текстовые черновики вне workspace.

Extension-слой остаётся тонким: тяжелая логика SDK пока заменена заглушками, но структура фасадов сохранена для дальнейшего подключения реальных провайдеров.

---

### Completed Modules

- **Webview Shell & Extension Facade Recovery** — реализовано в релизах `0.0.7–0.0.10`: восстановлены React webview, фасады расширения, drag & drop и релизный pipeline.
- **Provider Registry & Session Orchestrator Foundation** — реализовано в фазах `0–3`: введён `ProviderRegistryFacade`, draft-контракт провайдера, orchestrator событий и подключён заглушечный `ClaudeProviderStub`.

---

## Core Layer — сервисы

- **ProviderRegistryFacade** — хранит метаданные доступных модулей, обеспечивает загрузку приватных пакетов и публикацию возможностей (`capabilities`). Дескриптор провайдера включает `id`, `displayName`, `contractVersion`, capability-флаги (`supportsStreaming`, `supportsResume`, `supportsTools`, `supportsFileDrop`), сведения о зависимостях (CLI/SDK) и `runtimeStatus` (installed, authenticated, версия). *(На текущей фазе заменён stub-слоем; реальные провайдеры будут подключены позже.)* 
- **SessionOrchestratorFacade** — координирует диалоговые сессии, хранит активные `ProviderModule`, подписывается на emitter (`stream_event`, `assistant`, `system`, `result`, `user_input`, `sessionIdChanged`) и проксирует события в extension-слой.
- **SettingsServiceFacade** — управляет конфигурациями (user/workspace/globalStorage), валидирует параметры, обеспечивает хранение путей к данным провайдеров.
- **SecretsFacade** — проксирует доступ к VS Code Secret Storage / системным keychain для токенов и API-ключей.
- **LogPipelineFacade** — собирает логи, телеметрию событий и ошибки, в том числе запросы к CLI/SDK.
- **WorkflowEngineFacade** — площадка для визардов и составных сценариев (multi-agent, spec planning), взаимодействует с несколькими провайдерами параллельно.
- **RemoteBridgeCoordinator** *(roadmap)* — готовится к интеграции с Remote UI Bridge, синхронизирует события с удалёнными клиентами.
- **FilePathFacade** — новый кластер для захвата путей при drag & drop (микроклассы `FilePathCache`, `ClipboardHandler`, `PlatformFileHandler`); предоставляется extension-слою через `FileOperationsFacade`.
- **DraftFileManager** — файловый менеджер черновиков (`~/.claude/codeai-hub/drafts`), гарантирует сохранение текста ввода между перезапусками и переключениями сессий, используется `DraftOperationsHandler`.
- **ClaudeProviderStub** *(stub)* — реализует draft-контракт провайдера (lifecycle + emitter), эмулирует ответы и используется orchestrator'ом до подключения реального Claude SDK.

Core-слой — центральный узел, к которому подключаются как UI, так и приватные стеки.

---

### Provider Contract Draft *(Phase 0 — design skeleton)*

- **Lifecycle operations**: `initialize/installOrUpdate`, `checkAuth`, `createSession`, `resumeSession`, `sendMessage`, `stopSession`, `killSession`. Каждому вызову сопутствуют типизированные ошибки и метаданные (версия SDK, длительность операции).
- **Session channel**: `createSession` возвращает временный ID и emitter/observable для событий `stream_event`, `assistant`, `system`, `result`, `user_input`, `sessionIdChanged`, `error`. После получения реального идентификатора провайдер обязан инициировать `sessionIdChanged`.
- **Capabilities & metadata**: каждый модуль публикует `contractVersion`, capability-флаги (`supportsStreaming`, `supportsResume`, `supportsTools`, `supportsFileDrop`) и сведения о зависимостях (CLI, SDK, пути логов).
- **Resume contract**: `resumeSession(oldId)` создаёт новое подключение, транслирует поток истории и гарантирует `sessionIdChanged`; orchestrator переносит подписки без переключения UI.
- **Error model**: унифицированные коды (`NotInstalled`, `NotAuthenticated`, `ProcessCrashed`, `RateLimited`) плюс поле `providerHint` для пользовательских подсказок, транслируемое в status-block.

---

### Orchestrator Event Flow *(Phases 2–3)*

- `SessionOrchestratorFacade` подписывается на emitter `ProviderModule` и кеширует активные хендлы (`ProviderSessionHandle`).
- События транслируются в extension через IPC: `provider:sessionEvent`, `provider:sessionError`, `provider:sessionIdChanged`.
- `MessageProviderRefactored` использует `providerBySession` mapping для отправки `SessionMessageRequest` и fallback'ов при отсутствии capabilities.
- Заглушечный `ClaudeProviderStub` эмулирует `user_input` и `assistant` события, подтверждая контракт до интеграции реального SDK.

---

## Интеграция с приватными стеками

- Реестр провайдеров загружает приватные модули (Claude, Codex, Gemini) и регистрирует их контракты (`installOrUpdate`, `configure`, `startSession`, `streamEvents`, `stopSession`, `capabilities`).
- Core-слой преобразует события в унифицированные DTO, понятные UI, и обратно — команды пользователя в вызовы API провайдера.
- Extension-слой следит за наличием модулей: если стек недоступен (не установлен или истёк триал), UI информируется через статус и предлагает решения (установка, переавторизация).
- Подсистема обновлений проверяет версии CLI/SDK и приватных модулей при старте и по расписанию, инициируя автоматический апдейт без вмешательства пользователя.

---

## Remote UI Bridge и мультиинтерфейсы

- **Remote UI Bridge** живёт в core-слое и формирует HTTP/WebSocket канал, через который UI события транслируются во внешние клиенты (браузер, Electron, второе окно VS Code). Этот блок соответствует системному элементу «Remote UI Bridge (HTTP/WebSocket)».
- **RemoteClientManager** принимает подключения спутниковых клиентов, аутентифицированных TOTP/токенами, и подписывает их на события выбранных сессий.
- **Multi-Interface Coordinator** позволяет отображать одну и ту же сессию одновременно в нескольких UI: основной webview, вспомогательный браузер, мобильный вид. Он синхронизирует состояния вкладок, индикаторов и tool_use карточек.
- **UI Side Adapter** в webview экспортирует события (state update, streaming chunk, wizard step) в Remote UI Bridge. Для внешнего UI используются легковесные бандлы (React/Preact) с тем же контрактом сообщений, что и основное вебвью.
- **Security & Limits**: core слой ограничивает количество одновременных подключений, следит за тайм-аутами, маскирует секреты в событиях и предоставляет механизмы отключения отдельных клиентов.

Эта подсистема — ключевое отличие CodeAI-Hub от `claude-code-fusion`: UI проектируется сразу как мультиинтерфейсный, а не только как webview внутри VS Code. Подробности реализации фиксируются в профильном Module TODO Plan, когда начинается работа над Remote Bridge.

---

## Управление зависимостями и конфигурацией

- CLI и SDK провайдеров устанавливаются глобально; core хранит сведения о версиях и инициирует обновления, когда доступен новый релиз.
- Настройки расширения (включая лимиты токенов, режимы stream/thinking, пути к хранилищам) агрегируются из VS Code settings и передаются в стек.
- Данные провайдеров (JSONL истории, вложения, черновики) хранятся в отдельных namespaces и синхронизируются через Persistence/API модули стеков.
- Ошибки и предупреждения из стеков транслируются в UI; пользователь получает рекомендации (повторная авторизация, переключение провайдера, перезапуск VS Code).
- Лимиты тарифов мониторятся core-слоем; уведомления отображаются в status-block и в глобальном notifications-дисплее UI.

---

## Механика потокового рендера (Streaming Mode)

Потоковое отображение сообщений использует связку `MessageProviderRefactored → StreamingWordEmitter → useDialogMessages`. Архитектура повторяет `claude-code-fusion`, но расширена для поддержки нескольких источников:
- Каждый провайдер отдаёт события через адаптер, который нормализует типы (`assistant`, `tool`, `system`, `status`).
- StreamingWordEmitter гарантирует корректный Markdown поток, игнорируя inline форматирование при разборе.
- UI поддерживает параллельные потоки (несколько вкладок), обновления синхронно проксируются через `flushSync`.

---

## Персистентность сессий

- **AppChatStateManager** сохраняет вкладки, активного провайдера и глобальные флаги.
- В релизе 0.0.14 добавлена нормализация сохранённого состояния (авто-конвертация объектных `sessions` и отсутствующего счётчика в валидный массив), чтобы восстановление работало даже при устаревших снепшотах `vscode.getState`.
- **DraftManager** (0.0.15) работает через типизированный контракт `draft:save/load/clear`, автогарантирует корректный ответ `draft:loaded` и выводит устаревшие слушатели.
- **SessionStateManager** хранит состояние каждой сессии (draft, history pointers) через `vscode.getState` и локальные JSON-хранилища.
- При старте расширение восстанавливает сессии из унифицированного контракта; для стека Claude используется JSONL, для других будет добавлена поддержка их форматов Resume.

---

## Следующие шаги для документа

1. Добавить диаграмму потоков (UI ↔ Extension ↔ Core ↔ Stacks) с привязкой к контрактам.
2. Добавить диаграмму по Remote UI Bridge и мультиинтерфейсам, включая топологию клиентов.
3. Расширить раздел WorkflowEngineFacade примерами визардов и multi-agent сценариев.
