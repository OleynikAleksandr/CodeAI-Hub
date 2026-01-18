# Архитектура системы CodeAI-Hub

**Состояние:** релиз 1.1.444 (18.01.2026) — path-first + file-first workflow prompts (без `/read`), выровненный порядок шагов и исправления Sessions UI (перенос текста). Верификация: Codex + Claude корректно читают входные файлы по путям и пишут `description.md` в runs.

## Важно: добавление новых модулей (Build/Release)
- Любой новый пакет/модуль, который должен попадать в релизные артефакты (Core runtime, провайдерные tarball’ы, UI bundles, launcher), обязан быть подключён к pipeline сборки: либо через отдельный `scripts/build-<module>.sh`, который вызывается из `scripts/build-all.sh`, либо через прямое добавление в существующие скрипты (`scripts/build-all.sh`/`scripts/build-*.sh`).
- Если модуль подключается как workspace `file:` dependency и не пакуется через `npm pack`, его нужно **явно включить внутрь runtime** (копирование в артефакт + валидные пути/ссылки), иначе на чистой машине будет `MODULE_NOT_FOUND` и `GET /api/v1/health` не поднимется.
- Gate перед релизом для новых модулей: сборка артефакта + ручная проверка старта (минимум `curl http://127.0.0.1:<port>/api/v1/health`).


## Обзор
CodeAI-Hub — автономная платформа управления AI-сессиями. VS Code расширение рассматривается как один из клиентов, подключающийся к общему ядру. Основная логика, оркестрация, хранение конфигурации и мульти-модульность вынесены в отдельный сервис, который можно запускать и обновлять независимо от оболочки редактора. Все дополнительные модули, SDK и теперь UI-компоненты подгружаются из публичных источников (или локального кеша) во время установки или при старте.

## Компоненты системы
- **Автономное ядро** — Node.js сервис (`@codeai-hub/core@1.1.444`), упакованный как JS‑бандл + официальный Node 20 runtime. В dev/локальных сборках скрипт `scripts/build-core.sh` кладёт ядро в `~/.codeai-hub/core/<platform>/<version>/`, а манифест (`assets/core/manifest.json`) указывает на локальный cache `file://$HOME/.codeai-hub/releases/`. Core Supervisor (`@codeai-hub/core-supervisor`, CLI `codeai-core`) выбирает установленный runtime, запускает его через `<runtime>/node/bin/node <app>/dist/index.js`, пробрасывая `CORE_HOST/CORE_PORT/CORE_MANAGED_MODE`, рабочий каталог (`CLAUDE_WORKSPACE_PATH`, `CODEX_WORKSPACE_PATH`, `GEMINI_WORKSPACE_PATH`) и пути к провайдерам (`*_MODULE_PATH` под `~/.codeai-hub/providers/**`). Результаты установки и выбранный порт фиксируются в `~/.codeai-hub/state/runtime-registry.json`.
- **UI Bundles (v1.1.444)** — интерфейсы вынесены из VSIX в отдельные пакеты:
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
- VSIX: `codeai-hub` 1.1.444
- Автономное ядро: `@codeai-hub/core` 1.1.444
- UI Bundles: 1.1.444
- Claude module: 1.1.444
- Codex module: 1.1.444
- Gemini module: 1.1.444
- Agent Shared: `@codeai-hub/agent-shared` 1.1.387
- Description Agent: `@codeai-hub/description-agent` 1.1.387
- Virtual Simulation Agent: `@codeai-hub/virtual-simulation-agent` 1.1.387
- Diagram Modules Agent: `@codeai-hub/diagram-modules-agent` 1.1.387
- Diagram Facades Agent: `@codeai-hub/diagram-facades-agent` 1.1.387
- Spec Creator: `@codeai-hub/spec-creator` 1.1.387 (skeleton)

## Структура артефактов
```
~/.codeai-hub/
├── core/
│   └── darwin-arm64/
│       └── 1.1.444/
│           ├── node/
│           ├── app/
│           └── install.json
├── packages/
│   ├── launcher/
│   │   └── macos-arm64/1.1.444/
│   └── ui/
│       ├── vscode-webview/
│       │   ├── 1.1.444/
│       │   └── current -> 1.1.444
│       ├── web-client/
│       │   ├── 1.1.444/
│       │   └── current -> 1.1.444
│       └── project-manager/
│           ├── 1.1.444/
│           └── current -> 1.1.444
├── providers/
│   ├── claude/1.1.444/
│   ├── codex/1.1.444/
│   └── gemini/1.1.444/
├── settings/
│   ├── claude.json          # legacy thinking settings migrated to settings.json
│   └── settings.json        # current source of truth for providers.{claude,codex,gemini}
└── releases/
    ├── CodeAIHubLauncher-macos-arm64-1.1.444.tar.bz2
    ├── vscode-webview-1.1.444.tar.bz2
    ├── web-client-1.1.444.tar.bz2
    ├── project-manager-1.1.444.tar.bz2
    ├── claude-module-1.1.444.tar.bz2
    ├── codex-module-1.1.444.tar.bz2
    ├── gemini-module-1.1.444.tar.bz2
    └── codeai-hub-core-darwin-arm64-1.1.444.tar.bz2
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

## Recent Changes (v1.1.442 - 2026-01-18)
- **Workflow prompt pack (path-first)**: Project Manager отправляет короткий стартовый промпт с путями к анкете/шаблону/целевому файлу; агент читает файлы сам.
- **Core**: полностью удалён auto-attach (workspace files + pre_read_documents), в провайдер уходит ровно пользовательский текст.
- **Workflow prompts**: file-first промпты стадий упрощены (без JSON-инструкций, фокус на чтение файлов и запись артефакта).

## Recent Changes (v1.1.441 - 2026-01-18)
- **Workflow prompts (file-first)**: обновлены промпты стадий Description/Virtual Simulation/Diagrams — без structured output, запись в файл по целевому пути.
- **Workflow templates cleanup**: удалены schema-шаблоны для workflow стадий, template sync больше не архивирует legacy-папки.
- **Project Manager**: fallback prompt выровнен под file-first, outputSchema не отправляется для workflow стадий.

## Recent Changes (v1.1.440 - 2026-01-18)
- **Workflow file-first**: Core больше не применяет `outputSchema` для workflow стадий; Project Manager отправляет single-turn prompt pack (инструкция + анкета + шаблон + target path).
- **Workflow gates runner**: добавлен модуль запуска гейтов по событию `workflow.stage.completed` с эмиссией `workflow.gate.*` событий.
- **Codex/Claude structured output**: `question*` слоты в `artifacts[]` трактуются как вопросы и не отправляются в artifact-upsert; слоты фильтруются по schema allowlist.

## Recent Changes (v1.1.444 - 2026-01-18)
- **Workflow templates**: формулировки “следующий шаг” выровнены под последовательность `Description → Virtual Simulation → Module Diagram → Interface Map`.
- **Sessions UI**: длинные строки/URL и code blocks больше не вылезают за границы сообщений (перенос/скролл).

## Recent Changes (v1.1.443 - 2026-01-18)
- **Workflow prompts**: file-first промпты больше не просят `/read`, а читают файлы напрямую средствами провайдера.
- **Claude**: при `bypassPermissions` добавлена домашняя директория пользователя в `additionalDirectories` (для чтения шаблонов из `~/.codeai-hub/templates/**`).
- **Build scripts**: добавлен флаг `--allow-dirty` для `build-all.sh`/`build-release.sh` (опционально; по умолчанию требования “clean tree” сохранены).

## Recent Changes (v1.1.439 - 2026-01-18)
- **Codex turn timeout**: Codex-модуль прерывает зависшие ответы при отсутствии событий > 180s, чтобы UI не зависал без ответа.

## Recent Changes (v1.1.438 - 2026-01-18)
- **Workflow schema enforcement (legacy)**: Core подмешивает stage `outputSchema` для structured-output workflow-сессий и на finalize требует `artifacts[]` (minItems=1), чтобы `artifact-upsert` срабатывал даже при отсутствии schema со стороны UI. Для file-first стадий v1.1.440 `outputSchema` больше не применяется — Core удаляет её из `turnOptions`.

## Recent Changes (v1.1.431 - 2026-01-17)
- **Project Manager**: Description workflow-сессия работает в Project Manager (Sessions слева), анкета Description — в Artifacts справа.
- **Storage**: runs path обновлён на `.codeai-hub/003cworkspaceSlug003e/description/runs/003crunSlug003e/...` (без `initiatives/`).

## Recent Changes (v1.1.432 - 2026-01-17)
- **Project Manager**: окно Sessions отображает UI 1:1 как `vscode-webview` (tabs + dialog + TODO + input + status).

## Recent Changes (v1.1.433 - 2026-01-17)
- **Project Manager (legacy)**: stage `description` follow-up сообщения отправлялись с Description schema, финализация сохраняла `artifacts[]` вместо вывода markdown в чат.
- **Claude module**: structured output корректно эмитит `suggested_response` и `artifacts[]` из `result` payload.

## Recent Changes (v1.1.435 - 2026-01-17)
- **Claude module**: structured output из `result` нормализуется в `stream_event`, чтобы артефакты сохранялись через `artifact-upsert` и UI показывал краткий ответ.

## Recent Changes (v1.1.434 - 2026-01-17)
- **vscode-webview (legacy)**: stage `description` сообщения отправлялись с Description schema, а `artifacts[]` сохранялись даже после перезапуска UI.

## Recent Changes (v1.1.430 - 2026-01-17)
- **Project Manager provider picker**: анкета Description отправляется в Description workflow с явным `providerId`, выбранным пользователем.

## Recent Changes (v1.1.429 - 2026-01-16)
- **Default provider selection**: Core выбирает первый активный провайдер с доступным адаптером при `session:create`, чтобы запуск workflow шагов не зависел от порядка списка провайдеров.

## Recent Changes (v1.1.388 - 2026-01-06)
- **Agent Packages architecture**: Extracted `@codeai-hub/description-agent`, `@codeai-hub/virtual-simulation-agent`, `@codeai-hub/diagram-modules-agent`, `@codeai-hub/diagram-facades-agent` into standalone npm packages with facade pattern.
- **Description agent migration**: Contract building, parsing, and artifact paths moved to `DescriptionAgentFacade`.
- **Spec Creator skeleton**: Package structure with placeholder assets (schema, prompt, template) ready for future implementation.
- **Agent Shared package**: Common utilities (`schema-utils`, `contract-utils`, `types`) extracted to `@codeai-hub/agent-shared`.

## Recent Changes (v1.1.387 - 2026-01-05)
- **Workflow slim output**: Structured Output возвращает оценку готовности и умные вопросы, не дублируя анкету.

## Recent Changes (v1.1.386 - 2026-01-05)
- **Questionnaire auto-attach**: шаблонные пути `<...>` в prompt игнорируются, чтобы анкета прикреплялась при single-turn submit.

## Recent Changes (v1.1.385 - 2026-01-05)
- **Questionnaire submit**: первый submit отправляется одним turn'ом, без раннего ответа провайдера.
- **Pre-read auto-attach**: Core извлекает `pre_read_documents` из анкеты и прикрепляет перед анкетой.
- **Auto-attach limits**: лимит на файл поднят до 300 KB, добавлен общий бюджет вложений.

## Recent Changes (v1.1.384 - 2026-01-05)
- **Questionnaire inputs**: подсказки/примеры отображаются под вопросами, поля ввода не содержат шаблонный текст.
- **Release artefacts**: `doc/tmp/releases/` сохраняет UI tarballs (`vscode-webview`, `web-client`, `project-manager`) вместе с core/providers/launcher.

## Recent Changes (v1.1.383 - 2026-01-05)
- **Description questionnaire UX**: добавлены секция документов для чтения, подробные пояснения, отмена и возобновление заполнения.
- **Template authority**: Core на старте синхронизирует bundled-шаблоны и перезаписывает локальные правки в папках `~/.codeai-hub/templates/{description,virtual_simulation,diagram_modules,diagram_facades}/`.
- **Release 1.1.383**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.383.

## Recent Changes (v1.1.382 - 2026-01-05)
- **Codex thread binding safety**: global startup lock сериализует первый turn до получения `thread.started` и bind `thread_id`; после bind перепривязки игнорируются.
- **Codex state isolation**: дефолтный `CODEX_HOME` для CodeAI Hub = `~/.codeai-hub/providers/codex/home` (с миграцией `auth.json`/`config.toml` из `~/.codex` при отсутствии).
- **Release 1.1.382**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.382.

## Recent Changes (v1.1.381 - 2026-01-04)
- **Description prompt template**: bundled prompt устанавливается при старте расширения и применяется для анкетного этапа.
- **Architecture-aware Description stage**: prompt включает кластерно‑модульный подход (фасады, новые модули вместо правок, микро‑классы).
- **Release 1.1.381**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.381.

## Recent Changes (v1.1.380 - 2026-01-04)
- **Description Questionnaire UI**: анкета открывается отдельным экраном и использует templateMarkdown из Core.
- **Questionnaire persistence**: ответы сохраняются в `.codeai-hub/.../description/questionnaire.md` через `POST /api/v1/orchestrator/workspace-file-write`.
- **Description intake**: анкета отправляется как путь к файлу (auto-attach), без публикации полного текста в диалоге.
- **Release 1.1.380**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.380.

## Recent Changes (v1.1.367 - 2025-12-30)
- **Workflow contract delivery**: Core отдаёт `/api/v1/orchestrator/description-contract` и `/api/v1/orchestrator/virtual-simulation-contract`, UI не читает локальные шаблоны напрямую; prompt/template хранятся в `~/.codeai-hub/templates/<stage>/`.
- **Workflow contract set**: template/prompt обновлены под stage-specific требования, адаптивное интервью и запрет длинных документов в диалоге.
- **Release 1.1.367**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.367.

## Recent Changes (v1.1.366 - 2025-12-30)
- **Description spec readiness**: шаблон/контракт теперь требуют UI/UX, триггеры, сущности и архитектурный контур для Spec.md.
- **Codex thinking output**: native reasoning снова показывается; structured outputs не требуют отдельного RU summary поля.
- **Release 1.1.366**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.366.

## Recent Changes (v1.1.361 - 2025-12-29)
- **Description UX**: системное сообщение подтверждает старт агента и просит дождаться первого вопроса.
- **Description contract (legacy)**: шаблон description.md включался в schema; finalize требовал ключевые секции и `coverage_percent >= 80`.
- **Release 1.1.361**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.361.

## Recent Changes (v1.1.360 - 2025-12-29)
- **Description workflow flow**: Flow Wizard запускает guided conversation для Codex и Claude (Claude Agent SDK Structured Outputs), structured output возвращает `suggested_response` и артефакты.
- **Release 1.1.360**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.360.

## Recent Changes (v1.1.359 - 2025-12-27)
- **Codex thinking alignment**: structured outputs больше не завязаны на отдельное RU summary поле; thinking опирается на native reasoning (если доступен).
- **Release 1.1.359**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.359.

## Recent Changes (v1.1.358 - 2025-12-27)
- **Codex structured output prompt**: упрощённый префикс для JSON-ответа (без требования RU summary).
- **Release 1.1.358**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.358.

## Recent Changes (v1.1.357 - 2025-12-27)
- **Codex structured output schema**: дефолтный schema больше не требует RU summary (минимум `{ answer }`), кастомные схемы задаются UI/Flow контрактом.
- **Release 1.1.357**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.357.

## Recent Changes (v1.1.356 - 2025-12-27)
- **Codex structured outputs**: `answer` стримится из JSON; thinking отображается из native reasoning (если доступен), без RU summary через отдельное поле.
- **Release 1.1.356**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.356.

## Recent Changes (v1.1.339 - 2025-12-23)
- **Claude default model pipeline**: `settings.json` → `CLAUDE_SETTINGS_PATH`/`CLAUDE_DEFAULT_MODEL` → Core config → Claude SDK (re-read before each `query`) обеспечивает применение выбранного alias и thinking-настроек, а сборка 1.1.339 публикует свежие `codeai-hub-1.1.339.vsix`, `Core`, `Launcher` и provider tarball’ы.
- **Release 1.1.339**: packaging done via `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, lots recorded in `doc/tmp/releases/` and release doc.

## Recent Changes (v1.1.338 - 2025-12-23)
- **Claude Default model selector**: новый блок в Settings → Claude рендерит карточки из `CLAUDE_MODEL_ALIASES` (`src/types/claude-model-registry.ts`) и переиспользует `shared-model-card-styles.ts` (`src/client/ui/src/components/settings/shared-model-card-styles.ts`) для border/hover/selected цветов, `tabIndex={-1}` rows, `role="radio"` и `outline: none`/`boxShadow: none`, что делает оформление идентичным карточкам Codex и соответствует рекомендациям из `doc/Knowledge/css-border-shorthand-react-inline-styles.md`. Выбранный alias (`default/sonnet`, `opus`, `haiku`) сохраняется в `providers.claude.defaultModel`, копируется в `CLAUDE_SETTINGS_PATH`/`CLAUDE_DEFAULT_MODEL`, и Core/Claude module используют alias при старте сессий.

## TODO / Next Steps
- Пройти e2e (fresh VSIX → ручная установка CLI пользователем → запуск сессии Gemini) и задокументировать результат (если ещё не зафиксировано).
- Добавить health-check провайдера в ядре.
- Обновить telemetry checklist.

## Module Documentation
- Agent Packages: `doc/Project_Docs/AgentPackages_Architecture.md`
- UI Modules: `doc/Project_Docs/Stacks/UI_Modules.md`
- Launcher CEF: `doc/Project_Docs/Stacks/Launcher_CEF_Module.md`
- Core Orchestrator: `doc/Project_Docs/Stacks/CoreOrchestrator.md`
- Claude Provider: `doc/Project_Docs/Stacks/Claude.md`
- Codex Provider: `doc/Project_Docs/Stacks/Codex_SDK_Module.md`
- Codex Thinking: `doc/Knowledge/Контролируемое отображение размышлений в Codex.md`
- Gemini Provider: `doc/Project_Docs/Stacks/Gemini_CLI_Module.md`
