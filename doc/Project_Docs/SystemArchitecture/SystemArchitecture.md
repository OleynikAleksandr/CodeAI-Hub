# Архитектура системы CodeAI-Hub

**Состояние:** релиз 1.1.402 (11.01.2026) — session:created содержит initiativeSlug/runSlug/stage, поэтому анкета открывается и создаётся в корректной папке; auto-runs создают новый run `NNN-<model>` на старте стадии, а артефакты Flow живут в `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/<stage>/...`; Action Bar использует только Initiative (run selector удалён). Для Description UI предлагает выбрать новый вариант или существующий run по `runSlug`. Пути анкеты и артефактов в UI вычисляются по контексту сессии (`initiativeSlug`/`runSlug`), без статических default-путей. UI session records сохраняют initiativeSlug/runSlug/stage, а анкета и артефакты не записываются без этого контекста. Усилена безопасность Codex-сессий: первый turn сериализован до bind `thread_id` (startup lock), после bind любые попытки перепривязки игнорируются (lock-on-first-turn). Анкета идеи расширена (секция документов для чтения, подробные пояснения, отмена/возобновление), а подсказки/примеры отображаются под вопросами (поля ввода остаются пустыми). Первый submit анкеты отправляется одним turn'ом, а документы из `pre_read_documents` auto-attach'ятся перед анкетой; auto-attach игнорирует шаблонные пути `<...>` из prompt, чтобы `questionnaire.md` прикреплялся детерминированно. Structured Output Idea Collector переведён на slim-контракт: в ответе есть оценка готовности (`assessment`) и 1–3 умных вопроса (`questions`) без дублирования анкеты, а финальные документы возвращаются только на `finalize`. Core синхронизирует bundled‑шаблоны и перезаписывает локальные правки в `~/.codeai-hub/templates/full-development-flow/idea/`. Idea Collector использует bundled prompt с архитектурными принципами (кластерно‑модульный подход) уже на этапе идеи. Анкетирование остаётся основой: UI получает templateMarkdown через `/api/v1/orchestrator/idea-contract`, создаёт `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/questionnaire.md`, сохраняет ответы через `POST /api/v1/orchestrator/workspace-file-write` и отправляет путь через auto-attach вместо публикации полного текста. При каждом сохранении анкеты Core обновляет `lastQuestionnaireAt` в `run.json`, чтобы отслеживать последнюю заполненную версию. При создании нового run Core копирует `questionnaire.md` из run с максимальным `lastQuestionnaireAt`, чтобы новые варианты стартовали с актуальной анкеты. UI при выборе существующего run передаёт `runSlug` в `session:create`; если `runSlug` передан, auto-run не создаётся, а сессия привязывается к указанному run. Ответы на уточнения агента автоматически дописываются в `questionnaire.md` и синхронизируются в `.codeai-hub/initiatives/<initiativeSlug>/idea/questionnaire.md`. Для повторных запусков UI сохраняет копию анкеты в `.codeai-hub/initiatives/<initiativeSlug>/idea/questionnaire.md` и подставляет её в новый run, если анкета там отсутствует. Контракт v2 по‑прежнему хранит schema в `~/.codeai-hub/templates/full-development-flow/idea/idea-collector-schema.json`, поддерживает `приложение`/`кластер` и фиксирует правило Flow: для multi-module инициатив `Spec.md`/`Plan.md` создаются **по модулю**. Для ссылок на существующие документы UI поддерживает `/read ...`, а Core читает их через `POST /api/v1/orchestrator/workspace-file`. Также Core поддерживает auto-attach: при явных триггерах в сообщении (например, «прочитай/изучи/ознакомься») содержимое 1–3 текстовых файлов из workspace (до 300KB/файл, общий бюджет 1.2 MB; allowlist расширений) прикрепляется автоматически, пути можно указывать где угодно в сообщении/на отдельных строках (без `/read`). Core сохраняет артефакты Idea в `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/` (Idea.md + virtual-simulation.md) через `POST /api/v1/orchestrator/idea-artifact`. VS Code Webview и CEF Launcher загружают интерфейс из независимых пакетов (`~/.codeai-hub/packages/ui/**`). Launcher поддерживает независимые окна для Web Client и Project Manager. Гейты качества унифицированы через Husky и скрипты `build-all.sh` / `build-release.sh`. Также UI при реконнекте просит Supervisor гарантировать, что Core запущен; ошибки провайдера отображаются как system сообщения. Также UI переведён в плоскость Flow: Action Bar содержит 5 кнопок старта (Simple Chat/Idea/Spec/Plan/Execute) и открывает выбор провайдера; Flow шаги доступны только для Codex/Claude. Над Action Bar добавлена строка выбора Initiative (без run selector); Flow-кнопки доступны при выбранной инициативе, а run создаётся автоматически при старте стадии (формат `NNN-<model>`). Core получил HTTP endpoints `/api/v1/orchestrator/initiatives` и `/api/v1/orchestrator/initiatives/:initiativeSlug/runs` (workspacePath обязателен и прокидывается через `__CODEAI_CORE_CONFIG`). Back в provider picker для стартов из Action Bar закрывает выбор провайдера и не возвращает к Flow wizard. Стадия Idea (UI: Description) теперь фиксирует модульную декомпозицию (микро‑модули + фасады) и черновые стрелки зависимостей, а построение диаграмм вынесено в будущие шаги Module Diagram / Interface Map. Core runtime now bundles `@codeai-hub/initiatives` to prevent release-time `MODULE_NOT_FOUND`.

## Важно: добавление новых модулей (Build/Release)
- Любой новый пакет/модуль, который должен попадать в релизные артефакты (Core runtime, провайдерные tarball’ы, UI bundles, launcher), обязан быть подключён к pipeline сборки: либо через отдельный `scripts/build-<module>.sh`, который вызывается из `scripts/build-all.sh`, либо через прямое добавление в существующие скрипты (`scripts/build-all.sh`/`scripts/build-*.sh`).
- Если модуль подключается как workspace `file:` dependency и не пакуется через `npm pack`, его нужно **явно включить внутрь runtime** (копирование в артефакт + валидные пути/ссылки), иначе на чистой машине будет `MODULE_NOT_FOUND` и `GET /api/v1/health` не поднимется.
- Gate перед релизом для новых модулей: сборка артефакта + ручная проверка старта (минимум `curl http://127.0.0.1:<port>/api/v1/health`).


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
- VSIX: `codeai-hub` 1.1.402
- Автономное ядро: `@codeai-hub/core` 1.1.402
- UI Bundles: 1.1.402
- Claude module: 1.1.402
- Codex module: 1.1.402
- Gemini module: 1.1.402
- Agent Shared: `@codeai-hub/agent-shared` 1.1.402
- Idea Collector: `@codeai-hub/idea-collector` 1.1.402
- Spec Creator: `@codeai-hub/spec-creator` 1.1.402 (skeleton)

## Структура артефактов
```
~/.codeai-hub/
├── core/
│   └── darwin-arm64/
│       └── 1.1.402/
│           ├── node/
│           ├── app/
│           └── install.json
├── packages/
│   ├── launcher/
│   │   └── macos-arm64/1.1.402/
│   └── ui/
│       ├── vscode-webview/
│       │   ├── 1.1.402/
│       │   └── current -> 1.1.402
│       ├── web-client/
│       │   ├── 1.1.402/
│       │   └── current -> 1.1.402
│       └── project-manager/
│           ├── 1.1.402/
│           └── current -> 1.1.402
├── providers/
│   ├── claude/1.1.402/
│   ├── codex/1.1.402/
│   └── gemini/1.1.402/
├── settings/
│   ├── claude.json          # legacy thinking settings migrated to settings.json
│   └── settings.json        # current source of truth for providers.{claude,codex,gemini}
└── releases/
    ├── CodeAIHubLauncher-macos-arm64-1.1.402.tar.bz2
    ├── vscode-webview-1.1.402.tar.bz2
    ├── web-client-1.1.402.tar.bz2
    ├── project-manager-1.1.402.tar.bz2
    ├── claude-module-1.1.402.tar.bz2
    ├── codex-module-1.1.402.tar.bz2
    ├── gemini-module-1.1.402.tar.bz2
    └── codeai-hub-core-darwin-arm64-1.1.402.tar.bz2
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

## Recent Changes (v1.1.388 - 2026-01-06)
- **Agent Packages architecture**: Extracted `@codeai-hub/idea-collector` and `@codeai-hub/spec-creator` into standalone npm packages with facade pattern.
- **Idea Collector migration**: Contract building (329→18 lines), parsing (65→25 lines), and artifact paths moved to `IdeaCollectorFacade`.
- **Spec Creator skeleton**: Package structure with placeholder assets (schema, prompt, template) ready for future implementation.
- **Agent Shared package**: Common utilities (`schema-utils`, `contract-utils`, `types`) extracted to `@codeai-hub/agent-shared`.

## Recent Changes (v1.1.387 - 2026-01-05)
- **Idea Collector slim output**: Structured Output возвращает оценку готовности и умные вопросы, не дублируя анкету.

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
- **Idea questionnaire UX**: добавлены секция документов для чтения, подробные пояснения, отмена и возобновление заполнения.
- **Idea template authority**: Core на старте синхронизирует bundled-шаблоны и перезаписывает локальные правки в папке `~/.codeai-hub/templates/full-development-flow/idea/`.
- **Release 1.1.383**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.383.

## Recent Changes (v1.1.382 - 2026-01-05)
- **Codex thread binding safety**: global startup lock сериализует первый turn до получения `thread.started` и bind `thread_id`; после bind перепривязки игнорируются.
- **Codex state isolation**: дефолтный `CODEX_HOME` для CodeAI Hub = `~/.codeai-hub/providers/codex/home` (с миграцией `auth.json`/`config.toml` из `~/.codex` при отсутствии).
- **Release 1.1.382**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.382.

## Recent Changes (v1.1.381 - 2026-01-04)
- **Idea Collector prompt template**: bundled prompt устанавливается при старте расширения и применяется для анкетного этапа.
- **Architecture-aware Idea stage**: prompt включает кластерно‑модульный подход (фасады, новые модули вместо правок, микро‑классы).
- **Release 1.1.381**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.381.

## Recent Changes (v1.1.380 - 2026-01-04)
- **Idea Questionnaire UI**: анкета открывается отдельным экраном и использует templateMarkdown из Core.
- **Questionnaire persistence**: ответы сохраняются в `.codeai-hub/.../idea/questionnaire.md` через `POST /api/v1/orchestrator/workspace-file-write`.
- **Idea Collector intake**: анкета отправляется как путь к файлу (auto-attach), без публикации полного текста в диалоге.
- **Release 1.1.380**: артефакты VSIX/launcher/core/UI и provider tarballs обновлены до 1.1.380.

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
- Agent Packages: `doc/Project_Docs/AgentPackages_Architecture.md`
- UI Modules: `doc/Project_Docs/Stacks/UI_Modules.md`
- Launcher CEF: `doc/Project_Docs/Stacks/Launcher_CEF_Module.md`
- Core Orchestrator: `doc/Project_Docs/Stacks/CoreOrchestrator.md`
- Claude Provider: `doc/Project_Docs/Stacks/Claude.md`
- Codex Provider: `doc/Project_Docs/Stacks/Codex_SDK_Module.md`
- Codex Thinking Summary: `doc/Project_Docs/Stacks/Codex_Thinking_RU_Summary_Structured_Outputs.md`
- Gemini Provider: `doc/Project_Docs/Stacks/Gemini_CLI_Module.md`
