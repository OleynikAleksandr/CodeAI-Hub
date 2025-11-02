# Архитектура системы CodeAI-Hub

## Обзор
CodeAI-Hub — автономная платформа управления AI-сессиями. VS Code расширение рассматривается как один из клиентов, подключающийся к общему ядру. Основная логика, оркестрация, хранение конфигурации и мульти-модульность вынесены в отдельный сервис, который можно запускать и обновлять независимо от оболочки редактора. Все дополнительные модули и SDK подгружаются из публичных источников во время установки или при старте, что освобождает VSIX от тяжёлых бинарников и позволяет автоматически поддерживать актуальные версии.

## Компоненты системы
- **Автономное ядро** — Node.js сервис, теперь упакованный как JS-бандл + официальный Node 20 runtime. В dev-сборках скрипты (`scripts/build-core.sh`) кладут ядро в `~/.codeai-hub/core/<platform>/<version>/`, а манифест (`assets/core/manifest.json`) указывает на `file://$HOME/.codeai-hub/releases/`. Extension запускает ядро командой `<runtime>/node/bin/node <app>/dist/index.js`, пробрасывая переменные окружения и пути к провайдерам. В релизах манифест переключается обратно на GitHub Releases.
- **Логирование и окружение**: `CodeAIHubLauncher` пишет события в `~/.codeai-hub/logs/launcher/launcher.log`, перед запуском дописывает `node/bin` из установленного core в `PATH`, а оркестратор выводит JSON-записи в `~/.codeai-hub/logs/core/core.log` (путь задаётся `CODEAI_CORE_LOG_FILE`). Провайдерные модули сохраняют потоковые jsonl-журналы по схеме `~/.codeai-hub/logs/<provider>/<provider>-<sessionId>.jsonl` после получения реального идентификатора сессии, поэтому временных файлов с префиксом `session-` больше не появляется.
- **Клиентские интерфейсы**: webview VS Code, локальный CEF клиент, облачный/Mobile UI. Все они подключаются к ядру через HTTP/WebSocket API (Remote Bridge). Маковский лаунчер сохраняет геометрию через `setFrameAutosaveName("CodeAIHubMainWindow")`, а слой `window_state_persistence` служит миграцией со старого формата. Начиная с версии 1.1.95 лаунчер сам проверяет наличие запущенного core и, при необходимости, стартует bundled Node runtime, поэтому автономный интерфейс больше не зависит от активированного расширения.
- **Провайдерные модули**: устанавливаются в `~/.codeai-hub/providers/<stack>/<version>/`. В dev-режиме сборочные скрипты сразу публикуют туда архивы, чтобы VSIX ничего не качал извне; официальные SDK/CLI подтягиваются при запуске через npm или инсталляторы.
- **Пайплайн статусов загрузки**: `RuntimeStatusReporter` в ядре собирает прогресс (boot, установка компонентов, готовность провайдеров), RemoteBridge ретранслирует `core:loading-status`, а webview/CEF рендерят человеко-понятные сообщения с подсказкой о первом запуске.
- **FileDropService**: новый сервис ядра повторно использует платформенные скрипты (AppleScript для Finder, PowerShell для Explorer, xclip для Linux), кеширует последнюю выборку и отдаёт пути через REST-эндпоинт `/api/v1/file-drop`. Благодаря этому Input Panel standalone-клиента вставляет пути к файлам так же, как webview (Shift+drop, мультивставка, clipboard fallback).
- **Привязка сессий**: RemoteBridge транслирует событие `session:binding` при создании и смене идентификатора провайдера. Состояние (`pending`, `ready`, `failed`) и фактический `providerSessionId` попадают в Info Panel webview/CEF, что позволяет сразу видеть, удалось ли SDK подтвердить сессию и какой ID назначен.
- **Внешние пользовательские инструменты**: например, `@google/gemini-cli`, `@google/gemini-cli-core`, `@anthropic-ai/sdk`. Пользователь ставит их у себя (инсталляторы ядра лишь проверяют наличие и версию), а вендорные части модулей хранят только необходимый runtime (`gemini-cli-core`, Node runtime и пр.).

## Текущие версии
- VSIX: `codeai-hub` 1.1.117
- Autономное ядро: `@codeai-hub/core` 0.2.30
- Claude module: 0.1.10
- Codex module: 0.1.5
- Gemini module: 0.3.8 (CommonJS bridge → ESM tooling)

## Структура артефактов
```
~/.codeai-hub/
├── core/
│   └── darwin-arm64/
│       └── 0.2.30/
│           ├── node/           # официальный Node 20 runtime
│           ├── app/            # JS-бандл core + tarballs зависимостей
│           └── install.json
├── providers/
│   ├── claude/0.1.10/
│   ├── codex/0.1.5/
│   └── gemini/0.3.8/
│       ├── dist/
│       │   ├── index.js
│       │   ├── installer/
│       │   ├── runtime/
│       │   └── vendor/node_modules/@google/gemini-cli-core
│       └── install.json
└── releases/
    ├── codeai-hub-core-darwin-arm64-0.2.30.tar.bz2
    ├── CodeAIHubLauncher-macos-arm64-1.0.52.tar.bz2
    └── gemini-module-0.3.8.tar.bz2
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
