# Архитектура системы CodeAI-Hub

## Обзор
CodeAI-Hub — автономная платформа управления AI-сессиями. VS Code расширение рассматривается как один из клиентов, подключающийся к общему ядру. Основная логика, оркестрация, хранение конфигурации и мульти-модульность вынесены в отдельный сервис, который можно запускать и обновлять независимо от оболочки редактора. Все дополнительные модули и SDK подгружаются из публичных источников во время установки или при старте, что освобождает VSIX от тяжёлых бинарников и позволяет автоматически поддерживать актуальные версии.

## Компоненты системы
- **Автономное ядро** — Node.js сервис, теперь упакованный как JS-бандл + официальный Node 20 runtime. В dev-сборках скрипты (`scripts/build-core.sh`) кладут ядро в `~/.codeai-hub/core/<platform>/<version>/`, а манифест (`assets/core/manifest.json`) указывает на `file://$HOME/.codeai-hub/releases/`. Extension запускает ядро командой `<runtime>/node/bin/node <app>/dist/index.js`, пробрасывая переменные окружения и пути к провайдерам. В релизах манифест переключается обратно на GitHub Releases.
- **Клиентские интерфейсы**: webview VS Code, локальный CEF клиент, облачный/Mobile UI. Все они подключаются к ядру через HTTP/WebSocket API (Remote Bridge). Маковский лаунчер теперь использует `window_state_persistence` + `window_state_tracker`, чтобы мгновенно сохранять размер и позицию окна — повторный запуск восстанавливает layout без рывков.
- **Провайдерные модули**: устанавливаются в `~/.codeai-hub/providers/<stack>/<version>/`. В dev-режиме сборочные скрипты сразу публикуют туда архивы, чтобы VSIX ничего не качал извне; официальные SDK/CLI подтягиваются при запуске через npm или инсталляторы.
- **Внешние зависимые CLI/SDK**: например, `@google/gemini-cli`, `@google/gemini-cli-core`, `@anthropic-ai/sdk`. Установка происходит автоматически при первом запуске соответствующего модуля, версии и контрольные суммы фиксируются в метаданных.

## Текущие версии
- VSIX: `codeai-hub` 1.1.79
- Autonomное ядро: `@codeai-hub/core` 0.2.21
- Claude module: 0.1.7
- Codex module: 0.1.1
- Gemini module: 0.3.1 (CommonJS bridge -> ESM CLI)

## Структура артефактов
```
~/.codeai-hub/
├── core/
│   └── darwin-arm64/
│       └── 0.2.21/
│           ├── node/           # официальный Node 20 runtime
│           ├── app/            # JS-бандл core + tarballs зависимостей
│           └── install.json
├── providers/
│   ├── claude/0.1.7/
│   ├── codex/0.1.1/
│   └── gemini/0.3.1/
│       ├── dist/
│       │   ├── index.js
│       │   ├── installer/
│       │   ├── runtime/
│       │   └── vendor/node_modules/@google/{gemini-cli,gemini-cli-core}
│       └── install.json
└── releases/
    ├── codeai-hub-core-darwin-arm64-0.2.21.tar.bz2
    ├── CodeAIHubLauncher-macos-arm64-1.0.46.tar.bz2
    └── gemini-module-0.3.1.tar.bz2
```

## Провайдеры
### Claude и Codex
- Сборка остаётся CommonJS; тарболы публикуются через `npm pack` и укладываются в ядро.
- Инсталляторы проверяют наличие CLI/SDK (для Codex пока мок), workspace и токены.

### Gemini (актуальный статус)
- Модуль остаётся CommonJS (`@codeai-hub/gemini-module@0.3.1`), но `cli-bridge` использует динамический `import()` через runtime-обёртку (`Function("return import(specifier);")`), чтобы тянуть ESM-пакеты CLI в Node 20 без `ERR_REQUIRE_ESM`.
- Инсталлятор после скачивания tarball запускает `npm install --omit=dev` внутри `vendor/node_modules/@google/{gemini-cli,gemini-cli-core}`, поэтому их зависимости (`yargs`, `@opentelemetry/*`, и др.) оказываются на месте до старта провайдера.
- Метаданные `cli-bridge.json` фиксируют источник (`npm`), версию модуля и время подготовки. Первый запуск занимает ~30 сек из-за npm, последующие читают готовый кэш.

## Манифесты
Все manifests (`assets/core/manifest.json`, `assets/providers/gemini/manifest.json` и др.) в dev-сборках указывают на `file://$HOME/.codeai-hub/releases/…`. Перед релизом их необходимо переключить обратно на GitHub Releases. Это позволяет разработке работать без сети и без лишних загрузок.

## TODO / Next Steps
- Пройти e2e (fresh VSIX → автоматическая установка CLI → запуск сессии Gemini) и задокументировать результат.
- Добавить health-check провайдера в ядре (валидируем наличие CLI и зависимостей до старта сессии).
- Обновить telemetry checklist и automation для мониторинга версий CLI.
