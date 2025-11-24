# Архитектура системы CodeAI-Hub

**Состояние:** релиз 1.1.302 (24.11.2025) — UI Modularization Complete. VS Code Webview и CEF Launcher загружают интерфейс из независимых пакетов (`~/.codeai-hub/packages/ui/**`), устанавливаемых при старте. VSIX облегчен, а `scripts/build-ui-bundle.sh` формирует отдельные tar.bz2 для `vscode-webview` и `web-client`.

## Обзор
CodeAI-Hub — автономная платформа управления AI-сессиями. VS Code расширение рассматривается как один из клиентов, подключающийся к общему ядру. Основная логика, оркестрация, хранение конфигурации и мульти-модульность вынесены в отдельный сервис, который можно запускать и обновлять независимо от оболочки редактора. Все дополнительные модули, SDK и теперь UI-компоненты подгружаются из публичных источников (или локального кеша) во время установки или при старте.

## Компоненты системы
- **Автономное ядро** — Node.js сервис (`@codeai-hub/core@1.1.302`), упакованный как JS‑бандл + официальный Node 20 runtime. В dev/локальных сборках скрипт `scripts/build-core.sh` кладёт ядро в `~/.codeai-hub/core/<platform>/<version>/`, а манифест (`assets/core/manifest.json`) указывает на локальный cache `file://$HOME/.codeai-hub/releases/`. Core Supervisor (`@codeai-hub/core-supervisor`, CLI `codeai-core`) выбирает установленный runtime, запускает его через `<runtime>/node/bin/node <app>/dist/index.js`, пробрасывая `CORE_HOST/CORE_PORT/CORE_MANAGED_MODE`, рабочий каталог (`CLAUDE_WORKSPACE_PATH`, `CODEX_WORKSPACE_PATH`, `GEMINI_WORKSPACE_PATH`) и пути к провайдерам (`*_MODULE_PATH` под `~/.codeai-hub/providers/**`). Результаты установки и выбранный порт фиксируются в `~/.codeai-hub/state/runtime-registry.json`.
- **UI Bundles (v1.1.302)** — интерфейсы вынесены из VSIX в отдельные пакеты:
    - `vscode-webview`: React-приложение для панели VS Code.
    - `web-client`: Статическая сборка для CEF Launcher.
    Устанавливаются в `~/.codeai-hub/packages/ui/<bundleId>/<version>/` с созданием symlink `current`. Extension host при старте проверяет манифест `assets/ui/manifest.json` и распаковывает недостающие версии.
- **TTL и graceful shutdown** — ядро имеет явную TTL/idle‑модель: параметр `CORE_SHUTDOWN_GRACE_MS` задаёт интервал ожидания после ухода последнего клиента. Пока есть WebSocket‑клиенты, ядро работает бесконечно; после ухода последнего клиента отсчитывается TTL, по истечении которого инициируется `POST /api/v1/shutdown`.
- **Порты и владение ядром** — `CorePortManager` и Supervisor используют `runtime-registry.json` (`network.corePort`) как единый источник порта. Перед стартом клиенты вызывают `detectRunning()`: если версия ядра совпадает с ожидаемой, VS Code и лаунчер просто attach‑ятся к живому orchestrator’у.
- **Sticky клиенты и автопереподключение** — VS Code расширение держит невидимое WebSocket‑подключение (`CoreKeepAlive`) к `RemoteBridge`, поэтому ядро остаётся активным, даже если webview свернуто.
- **Provider version telemetry** — `HomeViewMessageRouter` передаёт `extensionPath` в `SettingsMessageHandler`, а `ProviderVersionService` использует его для чтения манифестов.
- **Логирование и окружение**: `CodeAIHubLauncher` пишет события в `~/.codeai-hub/logs/launcher/launcher.log`. Orchestrator выводит JSON‑записи в `~/.codeai-hub/logs/core/core.log`. VS Code extension ведёт `~/.codeai-hub/logs/extension/extension.log`.
- **Клиентские интерфейсы**: webview VS Code, локальный CEF клиент. Все они подключаются к ядру через HTTP/WebSocket API (Remote Bridge).
- **Session snapshot API**: `/api/v1/status` и стартовый `core:state` содержат только метаданные сессий. История сообщений читается из JSONL логов.
- **Изоляция провайдеров**: Remote Bridge оборачивает операции в try/catch. Ошибка CLI переводит провайдер в `inactive`, не роняя ядро.
- **Unified session storage**: `@codeai-hub/unified-session` пишет по одному файлу на `providerSessionId` в структуре `~/.codeai-hub/sessions/{workspaceSlug}/{providerId}/{sessionId}.jsonl`.
- **Провайдерные модули**: устанавливаются в `~/.codeai-hub/providers/<stack>/<version>/`.
- **Пайплайн статусов загрузки**: `RuntimeStatusReporter` в ядре собирает прогресс, RemoteBridge ретранслирует `core:loading-status`.
- **FileDropService**: сервис ядра отдаёт пути через REST-эндпоинт `/api/v1/file-drop`, обеспечивая работу Drag & Drop в standalone-клиенте.
- **Привязка сессий**: RemoteBridge транслирует событие `session:binding` при создании и смене идентификатора провайдера.
- **Внешние пользовательские инструменты**: `@google/gemini-cli`, `@google/gemini-cli-core`, `@anthropic-ai/sdk` ставятся пользователем или подтягиваются инсталляторами.
- **macOS меню**: лаунчер CEF создаёт системное меню `Edit` с командами Copy/Paste/Select All.
- **Thinking settings**: UI сохраняет параметры Claude thinking tokens в `~/.codeai-hub/settings/claude.json`.

## Текущие версии
- VSIX: `codeai-hub` 1.1.302
- Автономное ядро: `@codeai-hub/core` 1.1.302
- UI Bundles: 1.1.302
- Claude module: 1.1.300
- Codex module: 1.1.300
- Gemini module: 1.1.300

## Структура артефактов
```
~/.codeai-hub/
├── core/
│   └── darwin-arm64/
│       └── 1.1.302/
│           ├── node/
│           ├── app/
│           └── install.json
├── packages/
│   ├── launcher/
│   │   └── macos-arm64/1.1.302/
│   └── ui/
│       ├── vscode-webview/
│       │   ├── 1.1.302/
│       │   └── current -> 1.1.302
│       └── web-client/
│           ├── 1.1.302/
│           └── current -> 1.1.302
├── providers/
│   ├── claude/1.1.300/
│   ├── codex/1.1.300/
│   └── gemini/1.1.300/
├── settings/
│   └── claude.json
└── releases/
    ├── CodeAIHubLauncher-macos-arm64-1.1.302.tar.bz2
    ├── vscode-webview-1.1.302.tar.bz2
    ├── web-client-1.1.302.tar.bz2
    ├── claude-module-1.1.300.tar.bz2
    ├── codex-module-1.1.300.tar.bz2
    ├── gemini-module-1.1.300.tar.bz2
    └── codeai-hub-core-darwin-arm64-1.1.302.tar.bz2
```

## Провайдеры
### Claude и Codex
- Сборка остаётся CommonJS; тарболы публикуются через `npm pack` и укладываются в ядро.
- Инсталляторы диагностируют наличие пользовательских инструментов.

### Gemini (актуальный статус)
- Модуль остаётся CommonJS, но `cli-bridge` использует динамический `import()` для ESM-пакетов.
- Инсталлятор подготавливает `@google/gemini-cli-core`.

## Манифесты
Во всех текущих dev-сборках и внутренних релизах manifests (`assets/core/manifest.json`, `assets/ui/manifest.json` и др.) указывают на локальный cache `file://$HOME/.codeai-hub/releases/…`.

## TODO / Next Steps
- Пройти e2e (fresh VSIX → ручная установка CLI пользователем → запуск сессии Gemini) и задокументировать результат.
- Добавить health-check провайдера в ядре.
- Обновить telemetry checklist.

## Module Documentation
- UI Modules: `doc/Project_Docs/Stacks/UI_Modules.md`
- Launcher CEF: `doc/Project_Docs/Stacks/Launcher_CEF_Module.md`
- Core Orchestrator: `doc/Project_Docs/Stacks/CoreOrchestrator.md`
- Claude Provider: `doc/Project_Docs/Stacks/Claude.md`
- Codex Provider: `doc/Project_Docs/Stacks/Codex_SDK_Module.md`
- Gemini Provider: `doc/Project_Docs/Stacks/Gemini_CLI_Module.md`
