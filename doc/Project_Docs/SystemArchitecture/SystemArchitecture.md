# Архитектура системы CodeAI-Hub

**Состояние:** релиз 1.1.166 (08.11.2025) — Gemini CLI 0.11.x поддерживается из коробки, далее продолжаем работу над владением core/портами и автоостановкой.

## Обзор
CodeAI-Hub — автономная платформа управления AI-сессиями. VS Code расширение рассматривается как один из клиентов, подключающийся к общему ядру. Основная логика, оркестрация, хранение конфигурации и мульти-модульность вынесены в отдельный сервис, который можно запускать и обновлять независимо от оболочки редактора. Все дополнительные модули и SDK подгружаются из публичных источников во время установки или при старте, что освобождает VSIX от тяжёлых бинарников и позволяет автоматически поддерживать актуальные версии.

## Компоненты системы
- **Автономное ядро** — Node.js сервис, теперь упакованный как JS-бандл + официальный Node 20 runtime. В dev-сборках скрипты (`scripts/build-core.sh`) кладут ядро в `~/.codeai-hub/core/<platform>/<version>/`, а манифест (`assets/core/manifest.json`) указывает на `file://$HOME/.codeai-hub/releases/`. Extension запускает ядро командой `<runtime>/node/bin/node <app>/dist/index.js`, пробрасывая переменные окружения и пути к провайдерам; результаты установки фиксируются в `~/.codeai-hub/state/runtime-registry.json`, поэтому и VSIX, и launcher используют один и тот же `current`-указатель и не требуют ручной «перелинковки» после обновления. В релизах манифест переключается обратно на GitHub Releases, а orchestrator теперь поднимается только при появлении первого клиента и немедленно завершает работу после ухода последнего, сверяя версию через `/api/v1/health`.
- **Грациозное завершение** — перед запуском новой версии extension/launcher отправляют `POST /api/v1/shutdown`, ждут освобождения порта и при необходимости добивают PID (`/api/v1/health` возвращает его). Если порт 8080 занят, менеджер перебирает пул (8080 → 8081 → … → 8092), фиксирует выбор в `runtime-registry.json` (`network.corePort`) и пробрасывает `CORE_PORT`, чтобы остальные клиенты автоматически подключались к верному сокету.
- **Логирование и окружение**: `CodeAIHubLauncher` пишет события в `~/.codeai-hub/logs/launcher/launcher.log`, перед запуском дописывает `node/bin` из установленного core в `PATH`, а оркестратор выводит JSON-записи в `~/.codeai-hub/logs/core/core.log` (путь задаётся `CODEAI_CORE_LOG_FILE`). Провайдерные модули сохраняют потоковые jsonl-журналы по схеме `~/.codeai-hub/logs/<provider>/sdk-<provider>-<sessionId>.jsonl`, причём в файл уходит только неизменённый SDK-поток — никаких промежуточных фильтров или дублей. Gemini-адаптер продолжает дублировать каждый CLI chunk как `raw_event`, чтобы подготовить унифицированный парсер; нормализованные `norm-` файлы добавим только после появления враперов. Лаунчер читает `config/config.json` и фиксирует `workspacePath`, прокидывая его в `CLAUDE_WORKSPACE_PATH/CODEX_WORKSPACE_PATH/GEMINI_WORKSPACE_PATH`, поэтому даже при перезапуске ядра вне VS Code нормализованные JSONL попадают в каталоги рабочего проекта, а не в fallback `~`.
- **Клиентские интерфейсы**: webview VS Code, локальный CEF клиент, облачный/Mobile UI. Все они подключаются к ядру через HTTP/WebSocket API (Remote Bridge). Маковский лаунчер сохраняет геометрию через `setFrameAutosaveName("CodeAIHubMainWindow")`, а слой `window_state_persistence` служит миграцией со старого формата. Начиная с версии 1.1.95 лаунчер сам проверяет наличие запущенного core и, при необходимости, стартует bundled Node runtime, поэтому автономный интерфейс больше не зависит от активированного расширения.
- **Session snapshot API**: `/api/v1/status` и стартовый `core:state` содержат только метаданные сессий (идентификатор, провайдер, статус биндинга). История сообщений больше не хранится в оперативной памяти ядра и не передаётся в UI — повторное отображение читает унифицированные JSONL логи.
- **Изоляция провайдеров**: Remote Bridge оборачивает операции `createSession`/`sendMessage`/`closeSession` в try/catch. Любая ошибка CLI переводит соответствующий провайдер в `inactive`, помечает активные сессии как `failed`, пишет предупреждение в `/api/v1/status`, но не завершает orchestrator и не трогает остальные провайдеры.
- **Unified session storage (v1.1.152)**: `@codeai-hub/unified-session` пишет по одному файлу на `providerSessionId` в структуре `~/.codeai-hub/sessions/{workspaceSlug}/{providerId}/{sessionId}.jsonl`. Формат минималистичный — `session-open`, далее последовательность `message` с полями `timestamp`, `provider`, `messageId`, `role`, `content`, и финальное `session-close`. Дополнительные метаданные (workspaceSlug, core session UUID и т.п.) удалены, чтобы облегчить синхронизацию и ускорить чтение `/api/v1/sessions/:id/history`.
- **Провайдерные модули**: устанавливаются в `~/.codeai-hub/providers/<stack>/<version>/`. В dev-режиме сборочные скрипты сразу публикуют туда архивы, чтобы VSIX ничего не качал извне; официальные SDK/CLI подтягиваются при запуске через npm или инсталляторы.
  Codex и Claude больше не отправляют служебные slash-команды сразу после старта — они ждут первого реального сообщения, а момент получения `thread_id` транслируется событием `session:binding`, чтобы UI мгновенно обновлял Session ID.
- **Пайплайн статусов загрузки**: `RuntimeStatusReporter` в ядре собирает прогресс (boot, установка компонентов, готовность провайдеров), RemoteBridge ретранслирует `core:loading-status`, а webview/CEF рендерят человеко-понятные сообщения с подсказкой о первом запуске.
- **FileDropService**: новый сервис ядра повторно использует платформенные скрипты (AppleScript для Finder, PowerShell для Explorer, xclip для Linux), кеширует последнюю выборку и отдаёт пути через REST-эндпоинт `/api/v1/file-drop`. Благодаря этому Input Panel standalone-клиента вставляет пути к файлам так же, как webview (Shift+drop, мультивставка, clipboard fallback).
- **Привязка сессий**: RemoteBridge транслирует событие `session:binding` при создании и смене идентификатора провайдера. Состояние (`pending`, `ready`, `failed`) и фактический `providerSessionId` попадают в Info Panel webview/CEF, что позволяет сразу видеть, удалось ли SDK подтвердить сессию и какой ID назначен.
- **Внешние пользовательские инструменты**: например, `@google/gemini-cli`, `@google/gemini-cli-core`, `@anthropic-ai/sdk`. Пользователь ставит их у себя (инсталляторы ядра лишь проверяют наличие и версию), а вендорные части модулей хранят только необходимый runtime (`gemini-cli-core`, Node runtime и пр.).
- **macOS меню**: лаунчер CEF создаёт системное меню `Edit` с командами Copy/Paste/Select All, поэтому стандартные шорткаты работают в standalone окне без костылей.
- **Thinking settings**: UI сохраняет параметры Claude thinking tokens в `~/.codeai-hub/settings/claude.json`, а core передаёт путь в модуль, чтобы каждая сессия использовала актуальный лимит.

## Текущие версии
- VSIX: `codeai-hub` 1.1.150
- Autономное ядро: `@codeai-hub/core` 1.1.150
- Claude module: 1.1.150
- Codex module: 1.1.150
- Gemini module: 1.1.150 (CommonJS bridge → ESM tooling)

## Структура артефактов
```
~/.codeai-hub/
├── core/
│   └── darwin-arm64/
│       └── 1.1.150/
│           ├── node/           # официальный Node 20 runtime
│           ├── app/            # JS-бандл core + tarballs зависимостей
│           └── install.json
├── providers/
│   ├── claude/1.1.150/
│   ├── codex/1.1.150/
│   └── gemini/1.1.150/
│       ├── dist/
│       │   ├── index.js
│       │   ├── installer/
│       │   ├── runtime/
│       │   └── vendor/node_modules/@google/gemini-cli-core
│       └── install.json
├── settings/
│   └── claude.json
└── releases/
    ├── CodeAIHubLauncher-macos-arm64-1.1.150.tar.bz2
    ├── claude-module-1.1.150.tar.bz2
    ├── codex-module-1.1.150.tar.bz2
    ├── gemini-module-1.1.150.tar.bz2
    └── codeai-hub-core-darwin-arm64-1.1.150.tar.bz2
```

## Провайдеры
### Claude и Codex
- Сборка остаётся CommonJS; тарболы публикуются через `npm pack` и укладываются в ядро.
- Инсталляторы диагностируют наличие пользовательских инструментов (для Codex пока мок), workspace и токенов, а также передают прогресс через `reporter.progress` (добавлено в 0.1.8 / 0.1.2).

### Gemini (актуальный статус)
- Модуль остаётся CommonJS (`@codeai-hub/gemini-module@0.3.5`), но `cli-bridge` использует динамический `import()` через runtime-обёртку (`Function("return import(specifier);")`), чтобы тянуть ESM-пакеты пользовательского инструмента в Node 20 без `ERR_REQUIRE_ESM`.
- Инсталлятор подготавливает только `@google/gemini-cli-core` (устанавливая зависимости через `npm install --omit=dev` внутри `vendor/node_modules/@google/gemini-cli-core`). Сам инструмент (`@google/gemini-cli`) остаётся глобальной зависимостью пользователя; `cli-bridge` ищет его в `PATH`, учитывает кастомные npm prefix (`npm config prefix`, `.npm-global`, и т.д.) и валидирует версию.
- Метаданные `cli-bridge.json` фиксируют источник (`npm`), ожидаемую версию и путь к обнаруженной установке. При инициализации дополнительно записывается фактическая версия и локация, а `reporter.progress` сообщает на UI о загрузке и развёртывании (с флагом `firstRun`).

## Манифесты
Все manifests (`assets/core/manifest.json`, `assets/providers/gemini/manifest.json` и др.) в dev-сборках указывают на `file://$HOME/.codeai-hub/releases/…`. Перед релизом их необходимо переключить обратно на GitHub Releases. Это позволяет разработке работать без сети и без лишних загрузок.

## TODO / Next Steps
- Пройти e2e (fresh VSIX → ручная установка CLI пользователем → запуск сессии Gemini) и задокументировать результат.
- Добавить health-check провайдера в ядре (валидируем наличие CLI и зависимостей до старта сессии).
- Обновить telemetry checklist и automation для мониторинга версий CLI.

## Module Documentation
- Launcher CEF: `doc/Project_Docs/Stacks/Launcher_CEF_Module.md`
- Core Orchestrator: `doc/Project_Docs/Stacks/CoreOrchestrator.md`
- Claude Provider: `doc/Project_Docs/Stacks/Claude.md`
- Codex Provider: `doc/Project_Docs/Stacks/Codex_SDK_Module.md`
- Gemini Provider: `doc/Project_Docs/Stacks/Gemini_CLI_Module.md`
