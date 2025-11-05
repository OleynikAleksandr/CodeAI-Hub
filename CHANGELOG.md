# Changelog

All notable changes to this project will be documented in this file.

# Changelog

All notable changes to this project will be documented in this file.

## [1.1.142] - 2025-11-04
### Changed
- Session dialog cards now render provider-specific shells: user сообщения смещены вправо, плашки Claude/Codex/Gemini получают фирменные фоны и метки, reasoning блок `Thinking` скрыт по умолчанию и разворачивается по клику.

### Build
- VSIX → `codeai-hub-1.1.142.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.142.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.142.tar.bz2`
- Providers → `claude-module-1.1.142.tar.bz2`, `codex-module-1.1.142.tar.bz2`, `gemini-module-1.1.142.tar.bz2`

## [1.1.141] - 2025-11-04
### Fixed
- Claude sessionId promotion now happens as soon as the SDK emits the first message; the redundant 1s JSONL polling delay has been removed.

### Build
- VSIX → `codeai-hub-1.1.141.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.141.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.141.tar.bz2`
- Providers → `claude-module-1.1.141.tar.bz2`, `codex-module-1.1.141.tar.bz2`, `gemini-module-1.1.141.tar.bz2`

## [1.1.140] - 2025-11-04
### Added
- Settings view now renders horizontal tabs for `Claude`, `Codex`, `Gemini`, and `General`, with the Claude tab hosting thinking controls.

### Fixed
- Changing the maximum thinking tokens flips `Save Changes` to active, guaranteeing that new limits persist into the next Claude session.

### Build
- VSIX → `codeai-hub-1.1.140.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.140.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.140.tar.bz2`
- Providers → `claude-module-1.1.140.tar.bz2`, `codex-module-1.1.140.tar.bz2`, `gemini-module-1.1.140.tar.bz2`

## [1.1.138] - 2025-11-04
### Fixed
- Claude врапер теперь отправляет в Dialog Panel только текст ассистента и отдельные thinking блоки — структурные массивы SDK больше не попадают в журнал и UI.
- Gemini уже скрывал tool-эвенты; релиз подтверждает единый `user → thinking → assistant` поток для всех провайдеров.

### Build
- VSIX → `codeai-hub-1.1.138.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.138.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.138.tar.bz2`
- Providers → `claude-module-1.1.138.tar.bz2`, `codex-module-1.1.138.tar.bz2`, `gemini-module-1.1.138.tar.bz2`

## [1.1.136] - 2025-11-04
### Fixed
- Remote Bridge перестал ретранслировать `system`/`result` события провайдеров, поэтому Claude больше не показывает init-пакеты и дубли ответов в Dialog Panel.
- Gemini врапер фильтрует сервисные сообщения (tool requests/results), оставляя только `assistant` и нормализованные `dialog_message` блоки, так что в UI остаётся чистый `user → thinking → assistant` поток.

### Build
- VSIX → `codeai-hub-1.1.136.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.136.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.136.tar.bz2`
- Providers → `claude-module-1.1.136.tar.bz2`, `codex-module-1.1.136.tar.bz2`, `gemini-module-1.1.136.tar.bz2`

## [1.1.134] - 2025-11-04
### Added
- Dialog Panel now получает нормализованные `user/thinking/assistant` сообщения от Claude, Codex и Gemini, поэтому первые шаги диалога сразу отображаются в UI и сохраняются в JSONL.
- Claude/Codex/Gemini враперы поднимают reasoning-чунки в единый формат `dialog_message`, готовя поток для SIM-переводов.
- Добавлен стек-документ `ServiceIntelligenceModule.md`, описывающий архитектуру Service Intelligence Module (SIM) и цели Phase A.

### Build
- VSIX → `codeai-hub-1.1.134.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.134.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.134.tar.bz2`
- Providers → `claude-module-1.1.134.tar.bz2`, `codex-module-1.1.134.tar.bz2`, `gemini-module-1.1.134.tar.bz2`

## [1.1.132] - 2025-11-04
### Changed
- Provider loggers now persist only the untouched SDK stream under `~/.codeai-hub/logs/<provider>/sdk-<provider>-<sessionId>.jsonl`, removing duplicate `assistant/system/result` events and reserving `norm-*` files for the future unified wrappers.

### Build
- VSIX → `codeai-hub-1.1.132.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.132.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.132.tar.bz2`
- Providers → `claude-module-1.1.132.tar.bz2`, `codex-module-1.1.132.tar.bz2`, `gemini-module-1.1.132.tar.bz2`

## [1.1.130] - 2025-11-04
### Fixed
- Rebuilt Claude и Codex модули: дистрибутивы больше не содержат авто-команды `/context` и `/status`, поэтому сессии стартуют только после первого пользовательского сообщения even in packaged releases.

### Build
- VSIX → `codeai-hub-1.1.130.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.130.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.130.tar.bz2`
- Providers → `claude-module-1.1.130.tar.bz2`, `codex-module-1.1.130.tar.bz2`, `gemini-module-1.1.130.tar.bz2`

## [1.1.128] - 2025-11-04
### Changed
- Codex и Claude провайдеры больше не выполняют автоматические slash-команды при создании сессии; реальные threadId подставляются только после первого пользовательского сообщения через событие `session:binding`.
- SystemArchitecture и Codex stack docs обновлены: UI видит временные ID до handoff, Info панель перестраивается сразу после прихода реального идентификатора; Gemini продолжает сообщать ID немедленно.

### Build
- VSIX → `codeai-hub-1.1.128.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.128.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.128.tar.bz2`
- Providers → `claude-module-1.1.128.tar.bz2`, `codex-module-1.1.128.tar.bz2`, `gemini-module-1.1.128.tar.bz2`

## [1.1.127] - 2025-11-03
### Changed
- Core `/api/v1/status` и `core:state` больше не возвращают историю сообщений: UI при рефреше опирается только на live-поток и готовится читать унифицированные JSONL.
- Session store пересоздаёт снапшоты без встроенных сообщений, а документация `UnifiedSessionArchitecture.md` и SystemArchitecture обновлены под новую схему.

### Build
- VSIX → `codeai-hub-1.1.127.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.127.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.127.tar.bz2`
- Providers → `claude-module-1.1.127.tar.bz2`, `codex-module-1.1.127.tar.bz2`, `gemini-module-1.1.127.tar.bz2`

## [1.1.125] - 2025-11-03
### Added
- Settings view now exposes "Claude Thinking Settings" и сохраняет выбранный лимит thinking tokens в общий конфиг.
- Claude модуль читает настройки перед запуском запроса и отключает частичное стриминг-поведение.

### Build
- VSIX → `codeai-hub-1.1.125.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.125.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.125.tar.bz2`
- Providers → `claude-module-1.1.125.tar.bz2`, `codex-module-1.1.125.tar.bz2`, `gemini-module-1.1.125.tar.bz2`

## [1.1.124] - 2025-11-03
### Changed
- Webview и standalone клиент больше не добавляют placeholder и служебные сообщения напрямую из SDK — интерфейс ждёт нормализованный поток.

### Added
- Gemini модуль пишет каждый CLI event в JSONL без фильтрации, подготавливая унифицированный парсер логов.
- Обновлены архитектурные документы и TODO-план под фазу исследования SDK и нормализацию timeline.

### Build
- VSIX → `codeai-hub-1.1.124.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.124.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.124.tar.bz2`
- Providers → `claude-module-1.1.124.tar.bz2`, `codex-module-1.1.124.tar.bz2`, `gemini-module-1.1.124.tar.bz2`

## [1.1.123] - 2025-11-02
### Added
- Unified build pipeline `scripts/build-all.sh` пересобирает core/launcher/VSIX/провайдеры одним запуском и синхронизирует версии.

### Fixed
- macOS лаунчер добавляет меню Edit с Copy/Paste/Select All, поэтому Command-шорткаты работают нативно в standalone UI.
- Clipboard обработчик вынесен в общий модуль: Command+C/V и Superwhisper вставляют текст прямо в caret, textarea автоматически подстраивает высоту.

### Build
- VSIX → `codeai-hub-1.1.123.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.1.123.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-1.1.123.tar.bz2`
- Providers → `claude-module-1.1.123.tar.bz2`, `codex-module-1.1.123.tar.bz2`, `gemini-module-1.1.123.tar.bz2`

## [1.1.121] - 2025-11-02
### Fixed
- macOS лаунчер создаёт системное меню с командами Copy/Paste/Select All, благодаря чему Command-шорткаты работают в standalone CEF окне.
- Clipboard handlers объединены в модуль: вставка Superwhisper и Command+C/V обновляют caret и высоту textarea без перехватов контекстного меню.

### Build
- VSIX → `codeai-hub-1.1.121.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.0.53.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-0.2.30.tar.bz2`
- Providers → `claude-module-0.1.10.tar.bz2`, `codex-module-0.1.5.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.120] - 2025-11-02
### Fixed
- Standalone Input Panel использует отдельный модуль обработчиков clipboard: Command+C/V и Superwhisper работают без обходных меню, textarea синхронизирует высоту сразу после вставки.

### Build
- VSIX → `codeai-hub-1.1.120.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.30.tar.bz2`
- Providers → `claude-module-0.1.10.tar.bz2`, `codex-module-0.1.5.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.118] - 2025-11-02
### Fixed
- Standalone Input Panel корректно обрабатывает скорость Superwhisper и комбинации Command+V — текст из буфера вставляется прямо в caret, высота textarea обновляется автоматически.

### Changed
- FileDropService и RemoteBridge 0.2.30 продолжают обслуживать drag & drop/clipboard через `/api/v1/file-drop`, сохраняя паритет webview и standalone клиентов.

### Build
- VSIX → `codeai-hub-1.1.118.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.30.tar.bz2`
- Providers → `claude-module-0.1.10.tar.bz2`, `codex-module-0.1.5.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.117] - 2025-11-02
### Added
- Standalone Input Panel поддерживает drag & drop так же, как webview: FileDropService ядра преобразует все источники в текстовые пути и передаёт их в UI.

### Changed
- RemoteBridge 0.2.30 публикует REST-эндпоинты `/api/v1/file-drop`, кеширует выборку Finder/Explorer и синхронизирует её с клиентами.

### Build
- VSIX → `codeai-hub-1.1.117.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.30.tar.bz2`
- Providers → `claude-module-0.1.10.tar.bz2`, `codex-module-0.1.5.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.115] - 2025-11-02
### Fixed
- Core 0.2.29 сразу помечает Gemini-сессии как `ready`, поэтому Info Panel больше не зависает на сообщении ожидания.

### Build
- VSIX → `codeai-hub-1.1.115.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.29.tar.bz2`
- Providers → `claude-module-0.1.10.tar.bz2`, `codex-module-0.1.5.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.114] - 2025-11-02
### Fixed
- Gemini сессии отмечаются как `ready` сразу после запуска, поэтому Info Panel больше не застревает в состоянии ожидания.

### Build
- VSIX → `codeai-hub-1.1.114.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.28.tar.bz2`
- Providers → `claude-module-0.1.10.tar.bz2`, `codex-module-0.1.5.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.113] - 2025-11-02
### Fixed
- Webview message dispatcher теперь проксирует события `session:binding`, поэтому Info Panel мгновенно показывает подтверждённый `sessionId` без смены фокуса.

### Build
- VSIX → `codeai-hub-1.1.113.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.28.tar.bz2`
- Providers → `claude-module-0.1.10.tar.bz2`, `codex-module-0.1.5.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.112] - 2025-11-02
### Fixed
- Info Panel обновляется мгновенно — RemoteBridge после подтверждения `sessionId` рассылает актуальный `core:state`, поэтому UI не требует ручного рефреша.
- Claude и Codex адаптеры буферизуют события `sessionIdChanged`, чтобы первые ответы SDK не терялись при переименовании сессии.

### Build
- VSIX → `codeai-hub-1.1.112.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.28.tar.bz2`
- Providers → `claude-module-0.1.10.tar.bz2`, `codex-module-0.1.5.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.110] - 2025-11-02
### Fixed
- Info Panel теперь всегда ждёт подтверждённый `sessionId` Claude/Codex — временные UUID не попадают в UI, статус остаётся `pending` до финального ответа SDK.
- RemoteBridge фильтрует события `sessionIdChanged`, `realSessionId` и строковые уведомления провайдеров, чтобы обновлять привязку только по реальному идентификатору.
- SDK-адаптеры Claude/Codex буферизуют события `sessionIdChanged`, поэтому даже ранние ответы SDK доставляются в RemoteBridge после подписки.

### Build
- VSIX → `codeai-hub-1.1.110.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.27.tar.bz2`
- Providers → `claude-module-0.1.10.tar.bz2`, `codex-module-0.1.5.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.109] - 2025-11-02
### Fixed
- Info Panel больше не показывает временные идентификаторы сессий от Claude/Codex; статус остаётся `pending`, пока SDK не подтвердит реальный `sessionId`.
- RemoteBridge корректно обрабатывает события `realSessionId` и строковые уведомления провайдера, чтобы менять привязку только при финальном идентификаторе.

### Build
- VSIX → `codeai-hub-1.1.109.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.26.tar.bz2`
- Providers → `claude-module-0.1.9.tar.bz2`, `codex-module-0.1.4.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.107] - 2025-11-02
### Fixed
- Info Panel больше не показывает временные идентификаторы сессий от Claude/Codex; статус остаётся `pending`, пока SDK не подтвердит реальный `sessionId`.
- RemoteBridge корректно обрабатывает события `realSessionId` и строковые уведомления провайдера, чтобы менять привязку только при финальном идентификаторе.

### Build
- VSIX → `codeai-hub-1.1.107.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.25.tar.bz2`
- Providers → `claude-module-0.1.9.tar.bz2`, `codex-module-0.1.4.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.106] - 2025-11-02
### Added
- RemoteBridge теперь транслирует событие `session:binding`, синхронизируя реальный `providerSessionId` и состояние привязки (`pending`, `ready`, `failed`) между core, extension host и UI.
- Info Panel в webview/CEF отображает текущий статус сессии и полный `sessionId`, что упрощает отладку CLI и выявление неуспешных запусков.

### Build
- VSIX → `codeai-hub-1.1.106.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.24.tar.bz2`
- Providers → `claude-module-0.1.9.tar.bz2`, `codex-module-0.1.4.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.105] - 2025-11-02
### Changed
- Codex provider автоматически выполняет `/status` после старта, моментально продвигая `sessionId` и инициализируя логи без временных файлов.

### Build
- VSIX → `codeai-hub-1.1.105.vsix`
- Providers → `claude-module-0.1.9.tar.bz2`, `codex-module-0.1.4.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.104] - 2025-11-02
### Fixed
- Gemini CLI configuration now loads extension overrides correctly by passing the actual enabled extensions list to `loadCliConfig`, preventing session creation failures in standalone and VS Code.

### Build
- VSIX → `codeai-hub-1.1.104.vsix`
- Providers → `claude-module-0.1.9.tar.bz2`, `codex-module-0.1.3.tar.bz2`, `gemini-module-0.3.8.tar.bz2`

## [1.1.103] - 2025-11-02
### Fixed
- Gemini sessions resume creation in standalone/core: ExtensionEnablementManager now initialises correctly without expecting a config directory argument.

### Build
- VSIX → `codeai-hub-1.1.103.vsix`
- Providers → `claude-module-0.1.9.tar.bz2`, `codex-module-0.1.3.tar.bz2`, `gemini-module-0.3.7.tar.bz2`

## [1.1.102] - 2025-11-02
### Changed
- Provider SDK loggers now create files only after receiving the real session identifier and switch to the `<provider>-<sessionId>.jsonl` naming pattern, eliminating transient `session-*` artifacts.
- Codex streaming emits assistant chunks via `item.updated` events, so UI and diagnostics receive incremental responses.
- Gemini module writes structured jsonl logs alongside Claude/Codex and promotes session IDs fetched from the CLI bridge.
- Development toolchain upgraded to Ultracite 6.1.0 / Biome 1.9 ruleset for linting consistency.

### Build
- VSIX → `codeai-hub-1.1.102.vsix`
- Providers → `claude-module-0.1.9.tar.bz2`, `codex-module-0.1.3.tar.bz2`, `gemini-module-0.3.6.tar.bz2`

## [1.1.100] - 2025-11-01
### Fixed
- Standalone launcher now boots the core orchestrator automatically, so the web client overlay clears even when VS Code stays closed.
- Launcher and core emit logs to `~/.codeai-hub/logs/{launcher,core}/`, simplifying standalone diagnostics.
- Runtime discovery skips transient cache directories, so the launcher always picks a real `install.json` runtime instead of `downloads`.
- Launcher prepends the bundled `node/bin` directory to `PATH`, что даёт доступ к `npm` и восстанавливает инициализацию Claude/Codex при автономном запуске.

### Build
- VSIX → `codeai-hub-1.1.100.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.0.52.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-0.2.23.tar.bz2`
- Providers → `claude-module-0.1.8.tar.bz2`, `codex-module-0.1.2.tar.bz2`, `gemini-module-0.3.5.tar.bz2`

## [1.1.94] - 2025-11-01
### Changed
- Startup overlay now rotates calm, pre-scripted status lines until the core finishes; the UI unlocks instantly with no lingering “ready” banner.
- Core/bootstrap scripts stop using VS Code progress notifications, so all feedback is surfaced only inside the webview overlay.
- Provider/core build scripts target `~/.codeai-hub/releases/`, trimming old versions and cleaning staging folders automatically during development builds.

### Build
- VSIX → `codeai-hub-1.1.94.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.22.tar.bz2`
- Providers → `claude-module-0.1.8.tar.bz2`, `codex-module-0.1.2.tar.bz2`, `gemini-module-0.3.5.tar.bz2`

## [1.1.91] - 2025-11-01
### Added
- Runtime status reporter streams boot/install/provider milestones from the core to RemoteBridge, giving the webview overlay precise updates instead of a generic spinner.
- Claude, Codex, and Gemini installers emit structured progress events (0.1.8 / 0.1.2 / 0.3.5), including first-run hints when components are being downloaded for the first time.

### Changed
- RemoteBridge now broadcasts `core:loading-status` over WebSocket; the React overlay renders multi-line status text with muted detail lines and stays locked until the final “ready” phase.
- Core orchestrator starts the bridge before provider initialization so users can see progress immediately, and the UI headline has been rewritten in plain language (no CLI/SDK wording).

### Build
- VSIX → `codeai-hub-1.1.91.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.22.tar.bz2`
- Providers → `claude-module-0.1.8.tar.bz2`, `codex-module-0.1.2.tar.bz2`, `gemini-module-0.3.5.tar.bz2`

## [1.1.89] - 2025-11-01
### Fixed
- Gemini sessions no longer crash during startup: the provider ships a version-agnostic enablement manager and tolerates newer `@google/gemini-cli` builds.

### Added
- Core bridge overlay blocks ActionBar until the first provider snapshot arrives and shows retry messaging when the socket reconnects mid-launch.

### Changed
- Gemini module bumped to 0.3.4 with an extended PATH/npm prefix search plus diagnostics logging for the resolved CLI location.
- Documentation refreshed (README, Architecture, SystemArchitecture, Gemini stack) to match the restored Gemini workflow.

### Build
- VSIX → `codeai-hub-1.1.89.vsix`
- Core → `codeai-hub-core-darwin-arm64-0.2.21.tar.bz2`
- Providers → `claude-module-0.1.7.tar.bz2`, `codex-module-0.1.1.tar.bz2`, `gemini-module-0.3.4.tar.bz2`

## [1.1.88] - 2025-11-01
### Fixed
- Gemini sessions launch again: the bridge now supplies a no-op extension enablement manager to `loadCliConfig`, matching the latest `@google/gemini-cli` contract and unblocking session startup.

### Added
- Startup overlay still clears on the first WebSocket handshake and shows retry messaging if the core restarts mid-launch.

### Build
- VSIX → `codeai-hub-1.1.88.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.0.48.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-0.2.21.tar.bz2`
- Providers → `claude-module-0.1.7.tar.bz2`, `codex-module-0.1.1.tar.bz2`, `gemini-module-0.3.4.tar.bz2`

## [1.1.87] - 2025-11-01
### Added
- Startup overlay now unblocks as soon as the WebSocket connects and shows clear "Retrying…" messaging while the core is still warming up, so first-run installs no longer look frozen.
- Fallback provider catalogue is bundled in the webview, letting the picker render immediately even if the first `/status` fetch is delayed or intercepted by a service worker.

### Changed
- Gemini provider continues shipping as `@codeai-hub/gemini-module@0.3.3`; CLI discovery covers PATH binaries, custom npm prefixes (`npm config prefix`, `.npm-global`), and keeps recording the resolved location for diagnostics.
- Documentation (Architecture/SystemArchitecture/Stacks) refreshed to match the new UX flow.

### Build
- VSIX → `codeai-hub-1.1.87.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.0.48.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-0.2.21.tar.bz2`
- Providers → `claude-module-0.1.7.tar.bz2`, `codex-module-0.1.1.tar.bz2`, `gemini-module-0.3.3.tar.bz2`

## [1.1.86] - 2025-10-31
### Added
- Webview overlay that surfaces core initialization progress, disables session actions until the backend is ready, and keeps retrying with clear messaging when the core is unreachable.

### Changed
- Gemini provider now ships as `@codeai-hub/gemini-module@0.3.3`, staging only `@google/gemini-cli-core` and automatically detecting the user-installed `@google/gemini-cli` via PATH/NPM prefixes (including custom global directories).
- Documentation and manifests updated to reflect the new startup UX and Gemini detection flow.

### Build
- VSIX → `codeai-hub-1.1.86.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.0.48.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-0.2.21.tar.bz2`
- Providers → `claude-module-0.1.7.tar.bz2`, `codex-module-0.1.1.tar.bz2`, `gemini-module-0.3.3.tar.bz2`

## [1.1.84] - 2025-10-31
### Changed
- Gemini provider no longer bundles a private copy of `@google/gemini-cli`; the installer now stages only `@google/gemini-cli-core` while the runtime discovers the user-installed CLI and validates its version.
- Updated Gemini documentation and system architecture notes to reflect user-managed CLI installs and the new vendor layout.

### Build
- VSIX → `codeai-hub-1.1.84.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.0.48.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-0.2.21.tar.bz2`
- Providers → `claude-module-0.1.7.tar.bz2`, `codex-module-0.1.1.tar.bz2`, `gemini-module-0.3.2.tar.bz2`

## [1.1.83] - 2025-10-31
### Added
- Provider setup guide (`doc/Project_Docs/knowledge/ProviderSetupGuide.md`) outlining manual installation and authentication steps for Claude, Codex, and Gemini CLI tools.

### Changed
- macOS launcher bumped to 1.0.48 and now relies on AppKit autosave instead of custom Objective-C state trackers.
- Architecture/SystemArchitecture docs consolidated with module-specific pages in `doc/Project_Docs/Stacks/`; legacy TODO plans cleaned up and replaced with `todo-plan_.md` for upcoming work.
- README refreshed with manual provider requirements and updated artifact list for v1.1.83.

### Build
- VSIX → `codeai-hub-1.1.83.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.0.48.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-0.2.21.tar.bz2`
- Providers → `claude-module-0.1.7.tar.bz2`, `codex-module-0.1.1.tar.bz2`, `gemini-module-0.3.1.tar.bz2`

## [1.1.79] - 2025-10-31
### Added
- macOS launcher now persists window position and size via the new `WindowStatePersistence`/`WindowStateTracker` Objective-C modules, keeping future multi-window layouts viable.

### Changed
- Provider picker enforces single-provider selection with radio buttons, adds a CLI readiness reminder, and standardises card labels for Claude, Codex, and Gemini across VS Code and the standalone client.
- Session tabs now derive provider titles from shared defaults, so extension and standalone sessions render identical captions.
- Launcher build script writes `install.json` metadata automatically; README and supporting docs were refreshed for release 1.1.79.

### Build
- VSIX → `codeai-hub-1.1.79.vsix`
- Launcher → `CodeAIHubLauncher-macos-arm64-1.0.46.tar.bz2`
- Core → `codeai-hub-core-darwin-arm64-0.2.21.tar.bz2`
- Providers → `claude-module-0.1.7.tar.bz2`, `codex-module-0.1.1.tar.bz2`, `gemini-module-0.3.1.tar.bz2`

## [1.1.73] - 2025-10-30
### Fixed
- Gemini provider no longer throws `ERR_REQUIRE_ESM`: the bridge loads `@google/gemini-cli` and `@google/gemini-cli-core` via an asynchronous dynamic `import()` helper while keeping the module surface CommonJS-friendly for the core orchestrator.

### Changed
- Gemini installer now installs CLI dependencies (`npm install --omit=dev`) inside `vendor/node_modules`, guaranteeing that `yargs`, `@opentelemetry/*`, and other runtime packages are present before the provider boots.
- Provider registry, remote bridge, and installer facades were polished to satisfy Ultracite rules (organized imports, simplified arrow returns, consistent formatting).

### Build
- VSIX → `codeai-hub-1.1.73.vsix`
- Core v0.2.21 → `codeai-hub-core-darwin-arm64-0.2.21.tar.bz2`
- Gemini Module v0.3.1 → `gemini-module-0.3.1.tar.bz2`

## [1.1.32] - 2025-10-28
### Changed
- Gemini provider now keeps CLI sessions alive between messages, automatically restarts crashed processes, and records the actual Gemini session id coming from the CLI.
- Core orchestrator rebuilt as v0.2.10 so the bundled snapshot matches the new Gemini module logic.
- VSIX updated to ship Gemini module v0.1.3 and point the manifest to the new tarball.
### Build
- VSIX → `codeai-hub-1.1.32.vsix`
- Core v0.2.10 → `codeai-hub-core-darwin-arm64-0.2.10.tar.bz2`
- Gemini Module v0.1.3 → `gemini-module-0.1.3.tar.bz2`

## [1.1.31] - 2025-10-28
### Changed
- Rebuilt `@codeai-hub/gemini-module` as v0.1.2 so the installer accepts missing OAuth credentials, emits warnings, and continues initialization.
- Repackaged the core orchestrator (v0.2.9) to bundle the refreshed Gemini adapter and updated manifests, preventing the runtime from loading outdated snapshot code.
### Build
- VSIX → `codeai-hub-1.1.31.vsix`
- Core v0.2.9 → `codeai-hub-core-darwin-arm64-0.2.9.tar.bz2`
- Gemini Module v0.1.2 → `gemini-module-0.1.2.tar.bz2`

## [1.1.27] - 2025-10-28
### Added
- Introduced `@codeai-hub/gemini-module` (installer, session manager, message processor, provider adapter) and exposed Gemini in the provider selector across webview and CEF clients.
### Changed
- `ProviderRegistry` now downgrades providers to `inactive` when CLI detection or credential validation fails, so the core keeps running and the UI shows connection status badges.
### Build
- Packaging pipeline pending — VSIX/Core/Module artifacts will be published together with the 1.1.27 release bundle.

## [1.1.26] - 2025-10-27
### Fixed
- Reduced `src/extension-module/cef/runtime-files.ts` to 299 lines so the architecture gate passes after the installer refactor and reran the release packaging workflow end-to-end.

### Build
- VSIX → `codeai-hub-1.1.26.vsix` (core/launcher/providers remain `0.2.7` / `1.0.43` / `0.1.7` / `0.1.1`)

## [1.1.25] - 2025-10-27
### Changed
- Refactored the core and launcher installers into dedicated helper modules, keeping each file within the 300-line architecture limit and improving readability.
- Unified artifact downloads: `downloadFile` now prefers local caches, handles redirects, and surfaces actionable error messages for offline-first flows.
- Updated the Codex and Claude modules to match Ultracite requirements (no `public`, no barrel exports, explicit dependency containers) and emitted richer logging.

### Build
- VSIX → `codeai-hub-1.1.25.vsix`
- Core v0.2.7 → `codeai-hub-core-darwin-arm64-0.2.7.tar.bz2`
- Claude Module v0.1.7 → `claude-module-0.1.7.tar.bz2`
- Codex Module v0.1.1 → `codex-module-0.1.1.tar.bz2`

## [1.1.23] - 2025-10-27
### Added
- Подключён Codex SDK: новый модуль `packages/Codex_Module` (инсталлятор, auth manager, session/message processor) и интеграция в Core/RemoteBridge/UI. Provider picker теперь предлагает `codexCli`, а события Codex корректно отображаются в интерфейсе.
- Добавлен knowledge-base документ `doc/Project_Docs/knowledge/Local_Artifacts_Workflow.md`, описывающий офлайн-цикл сборки и обязательный к прочтению перед началом сессии. Architecture/SystemArchitecture обновлены с ссылкой на него.
- Новый helper `src/client/ui/src/core-bridge/server-message-handler.ts` сократил размер файла `core-bridge.ts` и упростил переиспользование логики разбора сообщений.

### Changed
- Все установщики (CEF/runtime/launcher/Claude/Codex) сначала ищут артефакты в `~/.codeai-hub/**/downloads/` и `~/.codeai-hub/releases/`, лишь затем обращаются к CDN/GitHub. Ошибки скачивания теперь указывают конкретный компонент.
- Скрипты сборки (`build-core.sh`, `build-claude-module.sh`, `build-codex-module.sh`, `build-cef-launcher.sh`) автоматически копируют архивы в локальный кеш и выводят путь до него. Пакеты Claude/Core/Codex обновлены до 0.1.6 / 0.2.6 / 0.1.0.
- README обновлён новым релизом, а `.gitignore` разрешает отслеживать скрипты.

### Build
- Core v0.2.6 → `codeai-hub-core-darwin-arm64-0.2.6.tar.bz2`
- Claude Module v0.1.6 → `claude-module-0.1.6.tar.bz2`
- Codex Module v0.1.0 → `codex-module-0.1.0.tar.bz2`
- Launcher v1.0.43 → `CodeAIHubLauncher-macos-arm64-1.0.43.tar.bz2`
- VSIX → `codeai-hub-1.1.23.vsix`

## [1.1.16] - 2025-10-26
### Fixed
- Claude Module теперь передаёт SDK абсолютный путь до установленного CLI (`~/.npm-global/bin/claude` на Unix, `%APPDATA%\npm\claude.cmd` на Windows). Благодаря этому процесс `claude-agent-sdk` запускается через обычный `claude` бинарь с shebang, а не через `pkg`-runtime Node 18, что устраняет ошибку `ERR_REQUIRE_ESM` при старте Claude Code.
- `SDKInstaller` корректно вычисляет глобальный префикс npm (`.npm-global`, `%APPDATA%\npm`) и проверяет наличие как `sdk.mjs`, так и самого CLI перед инициализацией.

### Build
- Claude Module v0.1.5 → `claude-module-0.1.5.tar.bz2`
- Core v0.2.5 → `codeai-hub-core-darwin-arm64-0.2.5.tar.bz2`
- VSIX → `codeai-hub-1.1.16.vsix`

## [1.1.15] - 2025-10-26
### Fixed
- Core теперь использует тот же slug проекта, что и Claude Code CLI (с ведущим дефисом), поэтому SDK повторно использует существующий каталог `~/.claude/projects/-Users-...` вместо создания нового пути без дефиса.
- Из селектора провайдеров убраны фиктивные записи Codex/Gemini — отображается только активный Claude Agent SDK.

### Build
- Core v0.2.4 → `codeai-hub-core-darwin-arm64-0.2.4.tar.bz2`
- VSIX → `codeai-hub-1.1.15.vsix`

## [1.1.14] - 2025-10-26
### Fixed
- Claude provider теперь загружает точный `sdk.mjs` внутри `@anthropic-ai/claude-agent-sdk`, поэтому core больше не падает с `ERR_UNSUPPORTED_DIR_IMPORT` при инициализации SDK.

### Build
- Claude Module v0.1.3 → `claude-module-0.1.3.tar.bz2`
- Core v0.2.3 → `codeai-hub-core-darwin-arm64-0.2.3.tar.bz2`
- VSIX → `codeai-hub-1.1.14.vsix`

## [1.1.13] - 2025-10-26
### Added
- `assets/core/manifest.json` и `assets/providers/claude/manifest.json` теперь всегда используют `https://github.com/.../releases/latest/download/`, поэтому новое расширение автоматически подтягивает свежие бинарники независимо от номера релиза.
- Инструкция `doc/Project_Docs/knowledge/Инструкция_по_созданию_релизов.md` обновлена: базовый URL всегда `latest`, а не конкретный тег.

### Build
- VSIX → `codeai-hub-1.1.13.vsix` (переупаковка с новым манифестом)

## [1.1.12] - 2025-10-26
### Changed
- Обновлены manifest-строки для core/Claude module в VSIX 1.1.12 после пересборки (без функциональных изменений в коде).

### Build
- VSIX → `codeai-hub-1.1.12.vsix`

## [1.1.11] - 2025-10-26
### Added
- CEF manifest внутри VSIX теперь использует URL-encoded имена архивов (`%2B`), что устраняет 404 при скачивании.

### Build
- VSIX → `codeai-hub-1.1.11.vsix`

## [1.1.9] - 2025-10-26
### Added
- Automated release pipeline for Claude Module/Core VSIX: `build-claude-module.sh`, `build-core.sh`, and `build-release.sh` теперь сами повышают версии, вычищают старые артефакты и публикуют свежие архивы в `doc/tmp/releases/` (остаются только `CodeAIHubLauncher-macos-arm64`, `codeai-hub-core-darwin-arm64-<ver>` и `claude-module-<ver>`).
- `assets/providers/claude/manifest.json` + новый установщик в VSIX гарантируют скачивание Claude Module при первом запуске и установку в `~/.codeai-hub/providers/claude/<version>/`.

### Changed
- Core стартует с `CLAUDE_MODULE_PATH`, считанным из `~/.codeai-hub/providers/claude/latest`, поэтому горячие обновления провайдера не требуют пересборки ядра.
- Manifestы ядра/провайдера указывают на релиз `v1.1.9`, чтобы все бинарники поднимались из одного GitHub Release.

### Build
- Claude Module v0.1.1 → `claude-module-0.1.1.tar.bz2`
- Core v0.2.1 → `codeai-hub-core-darwin-arm64-0.2.1.tar.bz2`
- VSIX → `codeai-hub-1.1.9.vsix`

## [1.1.8] - 2025-10-26
### Added
- **Claude provider module**: New `packages/Claude_Module` workspace delivers the Claude Agent SDK integration (installer, auth, session lifecycle, streaming processor, JSONL logger).
- **Core Claude adapter**: ProviderRegistry now boots a `ClaudeProviderAdapter` which initializes the SDK, handles `/context` bootstrapping, and exposes `create/send/subscribe/close`.
- **Streaming events**: RemoteBridge and Claude module propagate real-time `stream_event` payloads plus assistant/system/result messages to all connected clients.

### Changed
- **Core config/env**: The extension now exports `CLAUDE_WORKSPACE_PATH` when launching the core; the orchestrator slugifies it for `.claude/projects/<slug>` access.
- **Remote bridge**: WebSocket handling is fully async, provider bindings are tracked per session, and all outgoing messages come from live Claude responses instead of mock timers.
- **Logging**: Claude sessions are persisted under `~/.codeai-hub/logs/claude/session-*.jsonl`, with automatic renames once the real `claudeSessionId` is resolved.

### Build
- Core bumped to **v0.2.0** (pkg target `codeai-hub-core-<platform>-0.2.0.tar.bz2`).
- Release will be packaged as `codeai-hub-1.1.8.vsix` via `./scripts/build-release.sh 1.1.8`.

## [1.1.7] - 2025-10-26
### Added
- **Session deletion sync**: Closing a session in one UI (webview or CEF) now instantly removes it from all connected clients.
- **Core v0.1.1**: Added `SessionManager.deleteSession()` method to handle session removal.
- **RemoteBridge events**: Added `session:delete` incoming handler and `session:deleted` broadcast event.
- **UI handlers**: Both webview and standalone clients now handle `session:deleted` events and update their local state.
- **Release documentation**: Created comprehensive release build guide in `doc/Project_Docs/knowledge/Инструкция_по_созданию_релизов.md` covering Core, Extension, and Launcher versioning workflows.

### Fixed
- Core archive packaging now correctly contains `codeai-hub-core` binary (without platform suffix) to match installer expectations.
- TypeScript import compatibility fixed by switching from `import with { type: "json" }` to `require()` for package.json in CommonJS modules.

### Build
- Release packaged as `codeai-hub-1.1.7.vsix` via `./scripts/build-release.sh 1.1.7`
- Core binary: `codeai-hub-core-darwin-arm64-0.1.1.tar.bz2` (SHA-1: `fa946f1b8bdcd42ab8c3a3f539cb7f3f69b1c522`)
- Launcher unchanged: `CodeAIHubLauncher-macos-arm64-1.0.43.tar.bz2`

## [1.1.6] - 2025-10-25
### Added
- **Autonomous core orchestrator**: Extension now downloads and launches `codeai-hub-core` automatically on first run.
- **Dual-client synchronization**: VS Code webview and standalone CEF client both connect to same local core (`:8080`, WS `/api/v1/stream`).
- **Core installers**: Added `CoreInstaller` and `LauncherInstaller` with manifest-based download, SHA-1 verification, and mirror fallback.
- **Session/message broadcast**: Sessions and messages created in one client appear instantly in the other.

### Changed
- Updated CSP to allow `http://127.0.0.1:8080` HTTP/WebSocket connections for core communication.
- Reorganized core bridge architecture with `core-bridge.ts` handling all WebSocket communication.

### Known Issues
- Session deletion does not propagate between clients (fixed in v1.1.7).

### Build
- Release packaged as `codeai-hub-1.1.6.vsix` via `./scripts/build-release.sh 1.1.6`
- Core binary: `codeai-hub-core-darwin-arm64-0.1.0.tar.bz2`
- Launcher: `CodeAIHubLauncher-macos-arm64-1.0.43.tar.bz2`

## [1.0.43] - 2025-10-24
### Build
- Smoke-built `codeai-hub-1.0.43.vsix` via `./scripts/build-release.sh 1.0.43` and refreshed launcher archive `CodeAIHubLauncher-macos-arm64-1.0.43.tar.bz2` to verify toolchain updates.

## [1.0.41] - 2025-10-24
### Changed
- Follow HTTP redirects when downloading launchers so GitHub CDN 302 responses no longer break installation.

### Build
- Release packaged as `codeai-hub-1.0.41.vsix` via `./scripts/build-release.sh 1.0.41` (paired with `CodeAIHubLauncher-macos-arm64-1.0.41.tar.bz2`).

## [1.0.40] - 2025-10-24
### Changed
- Download the CEF runtime and launcher during extension activation, ensuring the web client button launches without additional waits.
- Removed bundled binaries from the VSIX so it only carries the extension code and UI assets; large launchers stay in GitHub Releases.
- Updated launcher delivery documentation and manifests to reference the new `CodeAIHubLauncher-macos-arm64-1.0.40.tar.bz2` artifact.

### Build
- Release packaged as `codeai-hub-1.0.40.vsix` via `./scripts/build-release.sh 1.0.40` (pair with `CodeAIHubLauncher-macos-arm64-1.0.40.tar.bz2`).

## [1.0.39] - 2025-10-24
### Fixed
- Resolved the macOS launcher crash caused by missing ICU/resource paths and re-enabled multi-process mode by removing the `--single-process` flag.
- Pointed the launcher manifest at the GitHub release archive and added SHA-1 verification for downloaded tarballs.

### Build
- Release packaged as `codeai-hub-1.0.39.vsix` via `./scripts/build-release.sh 1.0.39` (paired with `CodeAIHubLauncher-macos-arm64.tar.bz2`).

# [1.0.35] - 2025-10-22
### Added
- Shared the webview React UI with a standalone static web client bundle and exposed the `UI Outside` launcher command.
- Automatically create OS-specific web client shortcuts (Windows `.lnk`, macOS `.app` launcher, Linux `.desktop`) during activation.
- Added runtime diagnostics and default VS Code theming tokens so the standalone web client matches the in-editor appearance.

### Build
- Release packaged as `codeai-hub-1.0.35.vsix` via `./scripts/build-release.sh 1.0.35`.

# [1.0.24] - 2025-10-21
### Changed
- Matched the Session Status panel font size with the TODO block (11 px) so all session chrome text feels consistent.

### Build
- Release packaged as `codeai-hub-1.0.24.vsix` via `./scripts/build-release.sh 1.0.24`.

# [1.0.23] - 2025-10-21
### Changed
- Reduced the Session TODO header and item font sizes by 1px to further compress panel height while keeping counters legible.

### Build
- Release packaged as `codeai-hub-1.0.23.vsix` via `./scripts/build-release.sh 1.0.23`.

# [1.0.22] - 2025-10-21
### Changed
- Added an inline toggle to show only active tasks in the Session TODO list and collapse completed items.
- Tightened the Session TODO header spacing so the panel height matches the refreshed chrome.

### Build
- Release packaged as `codeai-hub-1.0.22.vsix` via `./scripts/build-release.sh 1.0.22`.

# [1.0.21] - 2025-10-21
### Changed
- Aligned the new Info Panel with the status block layout, keeping the shared 56px rail while leaving a placeholder row for future metadata.
- Finalised the provider picker overlay polish so the session grid stays hidden whenever the chooser is open.

### Build
- Release packaged as `codeai-hub-1.0.21.vsix` via `./scripts/build-release.sh 1.0.21`.

# [1.0.20] - 2025-10-21
### Added
- Introduced the Info Panel scaffold between the session tabs and dialog to host forthcoming runtime insights.

### Build
- Release packaged as `codeai-hub-1.0.20.vsix` via `./scripts/build-release.sh 1.0.20`.

# [1.0.19] - 2025-10-21
### Changed
- Retinted inactive session tabs to `#1D2F48`, improving contrast against the refreshed shell.

### Build
- Release packaged as `codeai-hub-1.0.19.vsix` via `./scripts/build-release.sh 1.0.19`.

# [1.0.18] - 2025-10-21
### Changed
- Restyled the provider picker to use the darker `#242A2F` backdrop and hide the live session chrome while the dialog is active, preventing layout flicker.

### Build
- Release packaged as `codeai-hub-1.0.18.vsix` via `./scripts/build-release.sh 1.0.18`.

# [1.0.17] - 2025-10-20
### Changed
- Ported the top action row to the `ActionBar` React component so it shares state with the provider picker and no longer depends on static HTML.
- Restored the “Create your first session” helper when no sessions are open and aligned the empty container with the refreshed chrome.
- Centralised button colour tokens in `media/main-view.css` (`--color-steelblue-*`, `--color-cornflowerblue`, `--color-deepskyblue`) to keep hover/active states consistent across the action bar and provider picker.

### Build
- Release packaged as `codeai-hub-1.0.17.vsix` via `./scripts/build-release.sh 1.0.17`.

# [1.0.16] - 2025-10-20
### Changed
- Introduced interim styling updates for the action bar buttons ahead of the React port.

### Build
- Release packaged as `codeai-hub-1.0.16.vsix` via `./scripts/build-release.sh 1.0.16`.

# [1.0.15] - 2025-10-20
### Changed
- Polished the session chrome: unified the shell background (`rgba(31, 31, 31, 1)`), flattened Action Bar gaps, introduced dual-tone rails (`#56595C → #18191B`) and synced the webview HTML scaffold with the new palette.
- Reworked the provider picker footer so the selection status sits on the left while `Cancel` and `Start session` stay grouped on the right; locked the session panel grid to a single column regardless of viewport width.

### Build
- Release packaged as `codeai-hub-1.0.15.vsix` via `./scripts/build-release.sh 1.0.15`.

# [1.0.14] - 2025-10-20
### Changed
- Eliminated gutters around the Action Bar and session region, aligning the chrome flush with the container edges.
- Tweaked Action Bar button styling so the highlighted state matches the rest of the palette when inactive.

### Build
- Release packaged as `codeai-hub-1.0.14.vsix` via `./scripts/build-release.sh 1.0.14`.

## [1.0.13] - 2025-10-19
### Fixed
- Restored the darker inactive session tab palette (`rgba(21, 21, 21, 1)` fill with `rgba(0, 0, 0, 1)` border) while keeping the refreshed active tab colours.

### Build
- Release packaged as `codeai-hub-1.0.13.vsix` via `./scripts/build-release.sh 1.0.13`.

## [1.0.12] - 2025-10-19
### Changed
- Unified the session palette: tabs plus dialog, TODO, input, and status panels now share a `rgba(40, 41, 42, 1)` background with `rgba(67, 68, 70, 1)` borders.

### Build
- Release packaged as `codeai-hub-1.0.12.vsix` via `./scripts/build-release.sh 1.0.12`.

## [1.0.11] - 2025-10-19
### Changed
- Removed the dedicated background fill from the empty session container so the base `session-region` color shows through.

### Build
- Release packaged as `codeai-hub-1.0.11.vsix` via `./scripts/build-release.sh 1.0.11`.

## [1.0.10] - 2025-10-19
### Changed
- Matched the empty state card background with the primary session region color to eliminate the darker inset block.

### Build
- Release packaged as `codeai-hub-1.0.10.vsix` via `./scripts/build-release.sh 1.0.10`.

## [1.0.9] - 2025-10-19
### Added
- Migrated the Input Panel to a CSS-based component with orange focus state, auto-resize, and Shift+drop overlay borrowed from Claude Code Fusion.
- Introduced a reusable `modules/drag-drop-module` cluster (facade, handler, processor, message bridge) for webview drag-and-drop.
- Added `file-operations/file-operations-facade.ts` and the core `file-path-module` (cache, clipboard, platform handler) to service `grabFilePathFromDrop`.

### Changed
- Extended the home view message router to route new commands and rely on `FileOperationsFacade` instead of deprecated message providers.
- Restyled `session-view` input container classes to remove inline styles and align focus colors with the new design tokens.

### Build
- Release packaged as `codeai-hub-1.0.9.vsix` via `./scripts/build-release.sh 1.0.9`.

## [1.0.8] - 2025-10-19
### Changed
- Rebuilt the home action bar into a dedicated section with a unified `37,37,40` background and consistent padding.
- Refactored the session layout so `DialogPanel` consumes remaining vertical space while TODO, Input, and Status panels keep 8px spacing and fixed stacking.
- Simplified session tab labels to provider abbreviations with compact multi-line rendering.

### Build
- Release packaged as `codeai-hub-1.0.8.vsix` via `./scripts/build-release.sh 1.0.8`.

## [1.0.7] - 2025-10-19
### Changed
- Updated session tabs to 32px height with new active/inactive colours, hover states, and compact provider labels.
- Applied consistent panel styling across dialog, TODO, input, and status sections, aligning the close button hover behaviour.

### Build
- Release packaged as `codeai-hub-1.0.7.vsix`.

## [1.0.6] - 2025-10-18
### Added
- Session host hooks for provider picker state, session storage, settings visibility, and webview message handling.
- Modular settings experience built from `SettingsHeader`, `SettingsFooter`, and `useSettingsState`, plus reusable thinking controls.

### Changed
- Home view message router split into focused handler modules with explicit serialization helpers.
- Architecture check script now reports counts for files over 300 lines and in the 250–300 line warning zone.

### Build
- Release packaged as `codeai-hub-1.0.6.vsix` via `./scripts/build-release.sh 1.0.6`.

## [1.0.5] - 2025-10-18
### Added
- Complete migration of the settings modal, including thinking mode controls and message routing.

### Build
- Release packaged as `codeai-hub-1.0.5.vsix`.

## [1.0.4] - 2025-10-18
### Added
- Session interface shell from Claude Code Fusion with tabs, dialog renderer, status, TODO, and input components.

### Build
- Release packaged as `codeai-hub-1.0.4.vsix`.

## [1.0.2] - 2025-10-18
### Added
- Initial static webview shell with two rows of quick action buttons.
- Extension host scaffolding (`HomeViewProvider`, message router, HTML generator).
- Project README and changelog documentation.

### Changed
- Packaging flow now excludes local documentation and tooling through `.vscodeignore`.

### Build
- Release packaged exclusively via `./scripts/build-release.sh 1.0.2`.

## [1.0.0] - 2025-10-18
### Added
- Repository bootstrap with Ultracite configuration, quality scripts, and project documentation.

[1.0.41]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.41
[1.0.40]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.40
[1.0.39]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.39
[1.0.24]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.24
[1.0.23]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.23
[1.0.22]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.22
[1.0.21]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.21
[1.0.20]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.20
[1.0.19]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.19
[1.0.18]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.18
[1.0.9]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.9
[1.0.10]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.10
[1.0.11]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.11
[1.0.12]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.12
[1.0.13]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.13
[1.0.8]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.8
[1.0.7]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.7
[1.0.6]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.6
[1.0.5]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.5
[1.0.4]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.4
[1.0.2]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.2
[1.0.0]: https://github.com/OleynikAleksandr/CodeAI-Hub/releases/tag/v1.0.0
## [1.1.6] - 2025-10-25
### Added
- Autonomous core bootstrap: the extension now downloads/verifies `codeai-hub-core` binaries from GitHub Releases, launches the process, and exposes its health/status HTTP endpoints.
- Remote UI bridge: both the VS Code webview and the standalone CEF client talk to the core over WebSocket, so new sessions/messages stay in sync.

### Fixed
- Updated all installer manifests (CEF, launcher, core) to follow redirects and use the Release mirrors so GitHub CDN hiccups no longer break activation.
- Relaxed the webview CSP to allow `http://127.0.0.1` HTTP/WS connections; the UI can now reach the local core without hacks.

### Known Issues
- Deleting a session inside the VS Code webview does **not** yet broadcast to the standalone client. Creation and messaging are synchronized, but deletion events will be addressed in Phase 11 follow-up.

### Build
- Release packaged as `codeai-hub-1.1.6.vsix` via `./scripts/build-release.sh 1.1.6` (paired with `CodeAIHubLauncher-macos-arm64-1.0.43.tar.bz2` and `codeai-hub-core-darwin-arm64-0.1.0.tar.bz2`).
