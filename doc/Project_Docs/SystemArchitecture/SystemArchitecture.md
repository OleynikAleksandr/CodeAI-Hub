# Архитектура системы CodeAI-Hub

**Состояние:** релиз 1.1.375 (01.01.2026) — Idea Collector получает универсальный контракт из Core API (`/api/v1/orchestrator/idea-contract`), контракт v2 добавляет `readiness`/`handoff_for_spec`, а schema хранится в `~/.codeai-hub/templates/full-development-flow/idea/idea-collector-schema.json`. Контракт/шаблон явно поддерживают `приложение`/`кластер` и фиксируют правило Flow: для multi-module инициатив `Spec.md`/`Plan.md` создаются **по модулю**. Для ссылок на существующие документы в интервью UI поддерживает прикрепление файлов из workspace (команда `/read ...`), а Core читает их через `POST /api/v1/orchestrator/workspace-file`. Core сохраняет `.codeai-hub/full-development-flow/idea/idea.md` и `.codeai-hub/full-development-flow/idea/virtual-simulation.md` в workspace через `POST /api/v1/orchestrator/idea-artifact`. VS Code Webview и CEF Launcher загружают интерфейс из независимых пакетов (`~/.codeai-hub/packages/ui/**`). Launcher поддерживает независимые окна для Web Client и Project Manager. Гейты качества унифицированы через Husky и скрипты `build-all.sh` / `build-release.sh`. Также UI при реконнекте просит Supervisor гарантировать, что Core запущен; ошибки провайдера отображаются как system сообщения.

## Обзор
CodeAI-Hub — автономная платформа управления AI-сессиями. VS Code расширение рассматривается как один из клиентов, подключающийся к общему ядру. Основная логика, оркестрация, хранение конфигурации и мульти-модульность вынесены в отдельный сервис, который можно запускать и обновлять независимо от оболочки редактора. Все дополнительные модули, SDK и теперь UI-компоненты подгружаются из публичных источников (или локального кеша) во время установки или при старте.

## Компоненты системы
- **Автономное ядро** — Node.js сервис (`@codeai-hub/core@1.1.334`), упакованный как JS‑бандл + официальный Node 20 runtime. В dev/локальных сборках скрипт `scripts/build-core.sh` кладёт ядро в `~/.codeai-hub/core/<platform>/<version>/`, а манифест (`assets/core/manifest.json`) указывает на локальный cache `file://$HOME/.codeai-hub/releases/`. Core Supervisor (`@codeai-hub/core-supervisor`, CLI `codeai-core`) выбирает установленный runtime, запускает его через `<runtime>/node/bin/node <app>/dist/index.js`, пробрасывая `CORE_HOST/CORE_PORT/CORE_MANAGED_MODE`, рабочий каталог (`CLAUDE_WORKSPACE_PATH`, `CODEX_WORKSPACE_PATH`, `GEMINI_WORKSPACE_PATH`) и пути к провайдерам (`*_MODULE_PATH` под `~/.codeai-hub/providers/**`). Результаты установки и выбранный порт фиксируются в `~/.codeai-hub/state/runtime-registry.json`.
- **UI Bundles (v1.1.334)** — интерфейсы вынесены из VSIX в отдельные пакеты:
    - `vscode-webview`: React-приложение для панели VS Code.
    - `web-client`: Статическая сборка для CEF Launcher (Web Client).
    - `project-manager`: Статическая сборка для CEF Launcher (Project Manager).
    Устанавливаются в `~/.codeai-hub/packages/ui/<bundleId>/<version>/` с созданием symlink `current`. Extension host при старте проверяет манифест `assets/ui/manifest.json` и распаковывает недостающие версии.
- **TTL и graceful shutdown** — ядро имеет явную TTL/idle‑модель: параметр `CORE_SHUTDOWN_GRACE_MS` задаёт интервал ожидания после ухода последнего клиента. Пока есть WebSocket‑клиенты, ядро работает бесконечно; после ухода последнего клиента отсчитывается TTL, по истечении которого инициируется `POST /api/v1/shutdown`.
- **Порты и владение ядром** — `CorePortManager` и Supervisor используют `runtime-registry.json` (`network.corePort`) как единый источник порта. Перед стартом клиенты вызывают `detectRunning()`: если версия ядра совпадает с ожидаемой, VS Code и лаунчер просто attach‑ятся к живому orchestrator’у.
- **Sticky клиенты и автопереподключение** — VS Code расширение держит невидимое WebSocket‑подключение (`CoreKeepAlive`) к `RemoteBridge`, поэтому ядро остаётся активным, даже если webview свернуто.
- **Provider version telemetry** — `ProviderVersionService` читает версии CLI/SDK через глобальный npm (`npm list -g`/`npm view`) и отдаёт их в Settings UI вместе с latest.
- **Claude defaults** — `~/.codeai-hub/settings/settings.json` теперь хранит `providers.claude.defaultModel`; extension synchronizes this file with `CLAUDE_SETTINGS_PATH`/`CLAUDE_DEFAULT_MODEL`, core passes the alias into `ClaudeWorkspaceOptions`, and the Claire SDK re-reads the JSON before each `query` so new Claude sessions honor the selected alias and thinking tokens without hardcoding a full model ID.
- **Логирование и окружение**: `CodeAIHubLauncher` пишет события в `~/.codeai-hub/logs/launcher/launcher.log`. Orchestrator выводит JSON‑записи в `~/.codeai-hub/logs/core/core.log`. VS Code extension ведёт `~/.codeai-hub/logs/extension/extension.log`.
- **Клиентские интерфейсы**: webview VS Code, локальный CEF клиент. Все они подключаются к ядру через HTTP/WebSocket API (Remote Bridge).
- **Session snapshot API**: `/api/v1/status` и стартовый `core:state` содержат только метаданные сессий. История сообщений читается из JSONL логов.
- **Изоляция провайдеров**: Remote Bridge оборачивает операции в try/catch. Ошибка CLI переводит провайдер в `inactive`, не роняя ядро.
- **Unified session storage**: `@codeai-hub/unified-session` пишет по одному файлу на `providerSessionId` в структуре `~/.codeai-hub/sessions/{workspaceSlug}/{providerId}/{sessionId}.jsonl`.
- **Провайдерные модули**: устанавливаются в `~/.codeai-hub/providers/<stack>/<version>/`.
- **Пайплайн статусов загрузки**: `RuntimeStatusReporter` в ядре собирает прогресс, RemoteBridge ретранслирует `core:loading-status`.
- **FileDropService**: сервис ядра отдаёт пути через REST-эндпоинт `/api/v1/file-drop`, обеспечивая работу Drag & Drop в standalone-клиенте.
- **Привязка сессий**: RemoteBridge транслирует событие `session:binding` при создании и смене идентификатора провайдера.
- **Внешние пользовательские инструменты**: `@google/gemini-cli`, `@google/gemini-cli-core`, `@anthropic-ai/claude-agent-sdk`, `@openai/codex`, `@openai/codex-sdk` устанавливаются глобально в npm prefix и могут автообновляться при старте ядра (если включено в настройках).
- **macOS меню**: лаунчер CEF создаёт системное меню `Edit` с командами Copy/Paste/Select All.
- **Thinking settings**: UI сохраняет параметры Claude thinking tokens в `~/.codeai-hub/settings/settings.json` (legacy `claude.json` мигрируется).

## Текущие версии
- VSIX: `codeai-hub` 1.1.375
- Автономное ядро: `@codeai-hub/core` 1.1.375
- UI Bundles: 1.1.375
- Claude module: 1.1.375
- Codex module: 1.1.375
- Gemini module: 1.1.375

## Структура артефактов
```
~/.codeai-hub/
├── core/
│   └── darwin-arm64/
│       └── 1.1.375/
│           ├── node/
│           ├── app/
│           └── install.json
├── packages/
│   ├── launcher/
│   │   └── macos-arm64/1.1.375/
│   └── ui/
│       ├── vscode-webview/
│       │   ├── 1.1.375/
│       │   └── current -> 1.1.375
│       ├── web-client/
│       │   ├── 1.1.375/
│       │   └── current -> 1.1.375
│       └── project-manager/
│           ├── 1.1.375/
│           └── current -> 1.1.375
├── providers/
│   ├── claude/1.1.375/
│   ├── codex/1.1.375/
│   └── gemini/1.1.375/
├── settings/
│   ├── claude.json          # legacy thinking settings migrated to settings.json
│   └── settings.json        # current source of truth for providers.{claude,codex,gemini}
└── releases/
    ├── CodeAIHubLauncher-macos-arm64-1.1.375.tar.bz2
    ├── vscode-webview-1.1.375.tar.bz2
    ├── web-client-1.1.375.tar.bz2
    ├── project-manager-1.1.375.tar.bz2
    ├── claude-module-1.1.375.tar.bz2
    ├── codex-module-1.1.375.tar.bz2
    ├── gemini-module-1.1.375.tar.bz2
    └── codeai-hub-core-darwin-arm64-1.1.375.tar.bz2
```

## Провайдеры
### Claude и Codex
- Сборка остаётся CommonJS; тарболы публикуются через `npm pack` и укладываются в ядро.
- Инсталляторы диагностируют наличие пользовательских инструментов.

### Gemini (актуальный статус)
- Модуль остаётся CommonJS, но `cli-bridge` использует динамический `import()` для ESM-пакетов.
- Инсталлятор обеспечивает глобальную установку `@google/gemini-cli` и `@google/gemini-cli-core` и может обновлять их до latest через Auto Update Service.

## Манифесты
Во всех текущих dev-сборках и внутренних релизах manifests (`assets/core/manifest.json`, `assets/ui/manifest.json` и др.) указывают на локальный cache `file://$HOME/.codeai-hub/releases/…`.

## Recent Changes (v1.1.367 - 2025-12-30)
- **Idea Collector contract delivery**: Core отдаёт `/api/v1/orchestrator/idea-contract`, UI не читает локальные шаблоны напрямую; schema хранится в `~/.codeai-hub/templates/full-development-flow/idea/idea-collector-schema.json`.
- **Universal Idea contract**: template/schema/prompt обновлены под `idea_type`, адаптивное интервью и запрет длинных документов в диалоге.
- **Release 1.1.367**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.367.

## Recent Changes (v1.1.366 - 2025-12-30)
- **Idea Collector spec readiness**: шаблон/контракт теперь требуют UI/UX, триггеры, сущности и архитектурный контур для Spec.md.
- **Codex thinking output**: native reasoning снова показывается, RU summary добавляется поверх для structured outputs.
- **Release 1.1.366**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.366.

## Recent Changes (v1.1.361 - 2025-12-29)
- **Idea Collector UX**: системное сообщение подтверждает старт агента и просит дождаться первого вопроса.
- **Idea Collector contract**: шаблон Idea.md включён в schema; finalize требует ключевые секции и `coverage_percent >= 80`.
- **Release 1.1.361**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.361.

## Recent Changes (v1.1.360 - 2025-12-29)
- **Idea Collector flow**: Flow Wizard запускает guided conversation для Codex и Claude (Claude Agent SDK Structured Outputs), structured output возвращает `suggested_response` и артефакты.
- **Release 1.1.360**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.360.

## Recent Changes (v1.1.359 - 2025-12-27)
- **Codex summary alignment**: `reasoning_summary_ru` максимально приближается к native reasoning по содержанию и объёму (без chain-of-thought).
- **Release 1.1.359**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.359.

## Recent Changes (v1.1.358 - 2025-12-27)
- **Codex summary prompt**: structured output инструкции префиксуются, чтобы получать непустой RU summary (пустая строка только при невозможности).
- **Release 1.1.358**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.358.

## Recent Changes (v1.1.357 - 2025-12-27)
- **Codex schema requirement**: `reasoning_summary_ru` обязателен (может быть пустой строкой), иначе structured output schema отклоняется и ответы не приходят.
- **Release 1.1.357**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.357.

## Recent Changes (v1.1.356 - 2025-12-27)
- **Codex structured outputs**: native reasoning скрывается; `answer` стримится из JSON, RU thinking summary выводится отдельным thinking-блоком. См. `doc/Project_Docs/Stacks/Codex_Thinking_RU_Summary_Structured_Outputs.md`.
- **Release 1.1.356**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.356.

## Recent Changes (v1.1.339 - 2025-12-23)
- **Claude default model pipeline**: `settings.json` → `CLAUDE_SETTINGS_PATH`/`CLAUDE_DEFAULT_MODEL` → Core config → Claude SDK (re-read before each `query`) обеспечивает применение выбранного alias и thinking-настроек, а сборка 1.1.339 публикует свежие `codeai-hub-1.1.339.vsix`, `Core`, `Launcher` и provider tarball’ы.
- **Release 1.1.339**: packaging done via `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, lots recorded in `doc/tmp/releases/` and release doc.

## Recent Changes (v1.1.338 - 2025-12-23)
- **Claude Default model selector**: новый блок в Settings → Claude рендерит карточки из `CLAUDE_MODEL_ALIASES` (`src/types/claude-model-registry.ts`) и переиспользует `shared-model-card-styles.ts` (`src/client/ui/src/components/settings/shared-model-card-styles.ts`) для border/hover/selected цветов, `tabIndex={-1}` rows, `role="radio"` и `outline: none`/`boxShadow: none`, что делает оформление идентичным карточкам Codex и соответствует рекомендациям из `doc/Knowledge/css-border-shorthand-react-inline-styles.md`. Выбранный alias (`default/sonnet`, `opus`, `haiku`) сохраняется в `providers.claude.defaultModel`, копируется в `CLAUDE_SETTINGS_PATH`/`CLAUDE_DEFAULT_MODEL`, и Core/Claude module используют alias при старте сессий.

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
- Codex Thinking Summary: `doc/Project_Docs/Stacks/Codex_Thinking_RU_Summary_Structured_Outputs.md`
- Gemini Provider: `doc/Project_Docs/Stacks/Gemini_CLI_Module.md`
