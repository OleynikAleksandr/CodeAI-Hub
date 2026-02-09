# Core Orchestrator Module

## Overview
Core Orchestrator — автономный Node.js сервис (`@codeai-hub/core@1.1.538`, Node 20 runtime) обрабатывающий все сессии, провайдерные модули и клиенты CodeAI Hub. Ядро запускается через Core Supervisor (CLI `codeai-core`) или вспомогательные скрипты, но продолжает работать после закрытия VS Code и лаунчера и предоставляет HTTP/WebSocket API для всех интерфейсов (webview, CEF‑клиент, будущие удалённые клиенты).

- **Исполняемый путь:** `~/.codeai-hub/core/<platform>/<version>/`
- **Runtime:** комплектный Node 20 + бандл `app/dist/index.js`
- **Основные каталоги в `~/.codeai-hub`:**
  - `core/<platform>/<version>/` — установленный runtime ядра (Node + JS‑бандл)
  - `providers/<name>/<version>/` — распакованные провайдерные модули (Claude/Codex/Gemini)
  - `logs/` — логи ядра (`logs/core/core.log`), провайдеров и клиентов (`logs/extension`, `logs/launcher`)
  - `sessions/`, `drafts/`, `workflows/` — персистентные данные
  - `state/runtime-registry.json` — registry версий и выбранных портов

## Архитектура
- **Remote UI Bridge** — HTTP/WebSocket шлюз (`/api/v1/health`, `/api/v1/status`, `/api/v1/sessions/:id/history`, WebSocket `/api/v1/stream`), раздаёт состояние ядра, список сессий и статусы провайдеров, а также принимает команды от UI.
- **Provider Registry** — загружает провайдерные модули (Claude/Codex/Gemini) из файлового реестра `~/.codeai-hub/providers/**` и/или override‑переменных окружения, отслеживает их статус (`active/inactive/degraded`). Ошибки инициализации не валят ядро: провайдер помечается как `inactive`/`degraded`, а подробная диагностика отдаётся через `/api/v1/status`.
- **Session Manager** — управляет жизненным циклом сессий: создание, стриминг, история JSONL, черновики, восстановление после перезапуска.
- **Workflow Layer** — обрабатывает визарды и multi-agent сценарии, опираясь на унифицированные DTO провайдеров.
- **Config & Secrets Service** — хранит настройки, пути к CLI, секреты (взаимодействие с VS Code SecretStorage/OS keychain).
- **Telemetry & Diagnostics** — ведёт журналы (`core.log`, `providers/<name>.log`, `bridge.log`), отдаёт диагностические события клиентам. Начиная с 1.1.281 Supervisor всегда прокидывает переменную `CODEAI_CORE_LOG_FILE`, поэтому экземпляры, запущенные из VSIX/launcher, снова пишут JSON‑логи в `~/.codeai-hub/logs/core/core.log` так же, как автономное ядро. Релиз 1.1.300 дополнил цепочку: `CoreProcessManager` в extension host жёстко приводит `supervisorLogger` к `string`, чтобы каналы VS Code/launcher отображали текст без `[object Object]` шумов.

## Старт и обновления
1. Скрипты сборки (`scripts/build-core.sh`, `scripts/build-all.sh`) кладут установленный runtime в `~/.codeai-hub/core/<platform>/<version>/` и обновляют `assets/core/manifest.json` и `~/.codeai-hub/releases/*.tar.bz2`.
2. При запуске VS Code или лаунчера Core Supervisor (CLI `codeai-core`) выбирает runtime по манифесту/реестру, запускает процесс `node app/dist/index.js`, прокидывая `CORE_HOST/CORE_PORT/CORE_MANAGED_MODE`, пути к рабочему каталогу (`CLAUDE_WORKSPACE_PATH`, `CODEX_WORKSPACE_PATH`, `GEMINI_WORKSPACE_PATH`) и `*_MODULE_PATH` для провайдеров.
3. Во время запуска ядро валидирует целостность файлов, поднимает RemoteBridge и ProviderRegistry, инициализирует провайдеры и публикует состояние через `/api/v1/status` (включая `core.ttl` и список провайдеров).
4. При выходе новой версии `scripts/build-all.sh` поднимает unified версию, пересобирает core/провайдеры/лаунчер/UI‑bundles и обновляет манифесты, а `scripts/build-release.sh` собирает VSIX. Клиенты переезжают на новый runtime через Supervisor, а старые версии остаются доступными для отката.

## API
- **HTTP**
  - `GET /api/v1/health` — базовый статус ядра (версия, pid, uptime, количество активных WebSocket‑клиентов, режим управления).
  - `GET /api/v1/status` — расширенный статус: блок `core` (версия, TTL, состояние клиентов), список провайдеров с их статусами и диагностикой, список сессий и их метаданные.
  - `GET /api/v1/sessions/:id/history` — история сообщений сессии из unified‑session storage.
  - `POST /api/v1/shutdown` — запрос на graceful shutdown ядра.
- **WebSocket (`/api/v1/stream`)**
  - События: `core:state` (снимок состояния ядра и сессий при подключении), `core:loading-status` (прогресс инициализации), `session:*` (создание, обновления, история), `provider:status`.
  - Команды отправляются через HTTP+WebSocket‑мост из UI (создание/удаление сессий, отправка сообщений) и проксируются в Session Manager/ProviderRegistry.

## Хранилище и безопасность
- Данные располагаются в `~/.codeai-hub/` под пользователем, права на запись не эскалируются.
- Секреты (API-ключи) хранятся в keychain/SecretStorage; ядро получает только временные токены и защищённые пути.
- Сессии сохраняются в JSONL (resume), черновики и рабочие файлы — в изолированных директориях с префиксом провайдера.
- Поддерживаются резервные копии manifest/конфигов для отката.

## Мониторинг и восстановление
- Логи ротируются и доступны пользователю в UI (через Diagnostics панель).
- При сбое провайдера Registry помечает его как `inactive`, отправляет событие клиентам и предлагает перезапуск.
- Команда `module:refresh` инициирует переустановку (используется расширением и CLI менеджерами провайдеров).

## Зависимости и сборка
- Исходный код находится в `packages/core/`.
- Сборка выполняется скриптом `scripts/build-core.sh`, который компилирует TypeScript, пакует зависимости и добавляет официальный runtime Node 20.
- При выпуске нового ядра необходимо обновить версию в `packages/core/package.json`, собрать бандл, обновить манифест и опубликовать архив в `~/.codeai-hub/releases/` (или внешний storage).

## Взаимодействие с провайдерами
- Registry ожидает CommonJS интерфейс `GeminiProviderAdapter`, `ClaudeProviderAdapter`, `CodexProviderAdapter`.
- Каждый модуль обязан предоставить `initialize`, `createSession`, `sendMessage`, `closeSession`, `subscribe`.
- Статус провайдера транслируется на UI; при ошибке инициализации (`ERR_REQUIRE_ESM` и т.п.) модуль отключается, но ядро продолжает работу.

## План развития
- Расширить доставку ядра на остальные платформы (darwin-x64, linux-x64, win32-x64) с тем же workflow.
- Добавить health-check провайдеров перед подключением клиентов.
- Интегрировать Telemetry upload (опционально) и дополнительные диагностические команды (`core:collectLogs`).
