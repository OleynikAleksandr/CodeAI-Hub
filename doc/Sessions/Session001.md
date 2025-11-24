# Session 001 — Autonomous Core & Supervisor Stabilization

**Дата:** 18 ноября 2025  
**Время:** _(заполнить)_ (Madrid, UTC+1)  
**Ветка:** main  
**Версия:** 1.1.266 → 1.1.267

---

## Обязательные документы к прочтению перед следующей сессией

1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` — актуальная системная архитектура (Autonomous Core, Supervisor, файловый реестр провайдеров, TTL/idle модель).
2. `doc/Project_Docs/Stacks/CoreOrchestrator.md` — stack-док по ядру (`@codeai-hub/core`), HTTP/WebSocket API и Unified Session Storage.
3. `doc/Project_Docs/Stacks/Launcher_CEF_Module.md` — stack-док по CEF Launcher и его взаимодействию с ядром и Supervisor.
4. `doc/Architecture/Architecture.md` — архитектура VS Code расширения (Extension Host Layer, webview, интеграция с Core Supervisor).
5. `doc/Project_Docs/UnifiedSessionArchitecture.md` — архитектура унифицированного хранилища сессий (для последующей стабилизации).
6. `AGENTS.md` — правила микрозадач, гейты качества и регламенты релизов.

---

## Что было сделано в этой сессии

### 1. Выравнивание старта ядра через Core Supervisor

- **Файлы:**  
  - `packages/core-supervisor/src/index.ts`  
  - `packages/core/src/provider-registry/index.ts`
- **Изменения:**
  - Core Supervisor (`@codeai-hub/core-supervisor`, CLI `codeai-core`) теперь:
    - предпочитает установленный runtime ядра в `~/.codeai-hub/core/<platform>/<version>/` и запускает его через `<runtime>/node/bin/node app/dist/index.js` с `cwd = app`;
    - выравнивает окружение старта с ручным скриптом `codeai-core-control.js`: прокидывает `CORE_HOST/CORE_PORT/CORE_MANAGED_MODE`, `CLAUDE_WORKSPACE_PATH/CODEX_WORKSPACE_PATH/GEMINI_WORKSPACE_PATH`, `CODEX_SKIP_GIT_REPO_CHECK` и `*_MODULE_PATH` (`~/.codeai-hub/providers/<provider>/<version>`);
    - при отсутствии установленного runtime падает обратно на старт `@codeai-hub/core/dist/index.js` (dev‑сценарий).
  - Provider Registry в ядре:
    - больше не валит процесс при отсутствии `@codeai-hub/gemini-module` или некорректном экспорте — Gemini помечается `inactive`/`degraded` с диагностикой, а ядро остаётся в состоянии `running`;
    - отдаёт статусы провайдеров через `/api/v1/status` для корректного отображения в UI.

### 2. Надёжный запуск ядра из CEF Launcher

- **Файлы:**  
  - `packages/cef-launcher/src/core_launcher.cc`  
  - `doc/Project_Docs/Stacks/Launcher_CEF_Module.md`
- **Изменения:**
  - Launcher на macOS при старте теперь:
    - сначала пытается запустить ядро через Supervisor CLI (`codeai-core start --host … --port …`);
    - если `codeai-core` отсутствует в `PATH` или `posix_spawnp` возвращает ошибку, выполняет fallback: запускает установленный core runtime напрямую через `<runtime>/node/bin/node app/dist/index.js`, используя то же окружение (`CORE_HOST/CORE_PORT`, `*_WORKSPACE_PATH`, `*_MODULE_PATH`);
    - по‑прежнему использует `/api/v1/status` для health‑проверок и не выполняет самовольный рестарт ядра.
  - Документация по лаунчеру обновлена под версию `CodeAIHubLauncher` 1.1.267 и новый сценарий старта ядра.

### 3. Релизы 1.1.266 и 1.1.267 (core, провайдеры, лаунчер, VSIX)

- **Скрипты:**  
  - `./scripts/build-all.sh`  
  - `./scripts/build-core.sh`  
  - `./scripts/build-cef-launcher.sh`
- **Результаты:**
  - Выполнены последовательные релизы:
    - 1.1.266 — выравнивание окружения Supervisor с CLI‑скриптом, толерантность к отсутствию Gemini‑модуля.
    - 1.1.267 — fallback‑старт ядра из лаунчера при отсутствии `codeai-core` в `PATH`.
  - Обновлены версии и манифесты:
    - `package.json`, `packages/*/package.json` → 1.1.267;  
    - `assets/core/manifest.json`, `assets/launcher/manifest.json`, `assets/providers/*/manifest.json`.
  - Собраны артефакты (лежат в `doc/tmp/releases` и `~/.codeai-hub/releases`):
    - VSIX: `codeai-hub-1.1.267.vsix`  
    - Core: `codeai-hub-core-darwin-arm64-1.1.267.tar.bz2`  
    - Launcher: `CodeAIHubLauncher-macos-arm64-1.1.267.tar.bz2`  
    - Providers: `claude-module-1.1.267.tar.bz2`, `codex-module-1.1.267.tar.bz2`, `gemini-module-1.1.267.tar.bz2`.

### 4. Синхронизация архитектурной документации

- **Файлы:**  
  - `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`  
  - `doc/Architecture/Architecture.md`  
  - `doc/Project_Docs/Stacks/CoreOrchestrator.md`  
  - `doc/Project_Docs/Stacks/Launcher_CEF_Module.md`  
  - `README.md`, `CHANGELOG.md`
- **Изменения:**
  - SystemArchitecture обновлён под Autonomous Core 1.1.267 (TTL, Supervisor, файловый реестр провайдеров, attach‑only клиенты, релизный pipeline).
  - Architecture.md обновлён под новый bootstrap ядра через Supervisor (Extension Host больше не запускает `node dist/index.js` напрямую).
  - CoreOrchestrator.md превратился в основной stack‑док по ядру: структура каталога `~/.codeai-hub`, RemoteBridge, ProviderRegistry, Unified Session Storage, API и сборка.
  - Launcher_CEF_Module.md синхронизирован с текущей реализацией лаунчера 1.1.267 и его взаимодействием с Supervisor/core.
  - README/CHANGELOG обновлены: текущий релиз — 1.1.267, описаны основные изменения по Autonomous Core и лаунчеру.
  - Исторический дизайн-док `doc/AutonomousCore_Architecture.md` удалён после переноса сути в stack‑доки и SystemArchitecture.

### 5. Структура отчётов сессий

- Создан архив существующих отчётов в `doc/Sessions/Archive/Original/SessionXXX.md` и агрегированный файл `doc/Sessions/Archive/Sessions_Archive_001.md`.
- Текущий отчёт этой сессии хранится как `doc/Sessions/Session001.md` и считается стартовым для новой фазы проекта на архитектуре Autonomous Core 1.1.267.

---

## План на следующую сессию

1. **Unified Session Stabilization:**
   - Перейти к `doc/Project_Docs/UnifiedSessionArchitecture.md`, сверить текущую реализацию unified-session storage с документом и довести реализацию/доки до полностью синхронного состояния.
   - При необходимости перенести ключевые части архитектуры unified-session в отдельный stack-док и зачистить устаревшие design-черновики.
2. **Phase 6.a / 7 актуализация todo-plan:**
   - Обновить `doc/TODO/todo-plan.md` под фактически выполненную работу по Autonomous Core 1.1.266–1.1.267 (Supervisor, TTL, лаунчер) и зафиксировать хеши релизных коммитов в соответствующих фазах/стримах.
3. **Диагностика и UI-доработки:**
   - При необходимости уточнить отображение количества клиентов ядра в UI (`Clients` из `/api/v1/health`/`/status`), чтобы избегать путаницы для пользователя, и документировать это поведение в SystemArchitecture/CoreOrchestrator.

### Git commits (ключевые для этой сессии)

- `059ca99` — `fix(core-supervisor): prefer installed core runtime`
- `bea8494` — `feat: v1.1.265 - core supervisor runtime alignment`
- `c3193fe` — `fix(core): tolerate missing gemini module`
- `bea30f8` — `fix(core-supervisor): align env with core control script`
- `3fd9675` — `feat: v1.1.266 - supervisor env alignment and gemini tolerance`
- `cdc6e7b` — `fix(cef-launcher): fallback to direct core start if supervisor cli missing`
- `930790f` — `feat: v1.1.267 - cef launcher fallback core startup`
- `b84f77a` — `docs: sync architecture docs for autonomous core 1.1.267`
- `7e98d45` — `docs: merge autonomous core design into core orchestrator stack`
