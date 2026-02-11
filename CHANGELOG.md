## [1.1.557] - 2026-02-11
### Fixed
- Gemini: tool-calls CLI теперь разрешают доступ к workspace (`includeDirectories` включает `workspacePath`), чтобы `read_file`/`write_file` корректно работали с `.codeai-hub/**` артефактами (например, `description.md`).

### Added
- Release artifacts: собран `codeai-hub-1.1.557.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.556] - 2026-02-11
### Added
- Gemini: добавлены настройки session continuity: `contextWindowTokenLimit` (default `300000`) и `remainingPercentThreshold` (default `30`).
- Gemini: token usage нормализован в `token_usage` (`used/limit`) на основе `usageMetadata.totalTokenCount`.
- Release artifacts: собран `codeai-hub-1.1.556.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.555] - 2026-02-10
### Added
- Release artifacts: собран `codeai-hub-1.1.555.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

### Changed
- Release-only rebuild: изменений кода относительно `1.1.554` нет (нужен отдельный номер версии для чистой проверки установки).

## [1.1.554] - 2026-02-10
### Fixed
- Settings: при отсутствии `~/.codeai-hub/settings/settings.json` Core/Extension теперь сохраняют дефолтный snapshot на диск, чтобы UI мог корректно отображать модели по умолчанию (например, `gpt-5.2-codex (medium)`).

### Added
- Release artifacts: собран `codeai-hub-1.1.554.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.553] - 2026-02-10
### Fixed
- Core: flow-node continuity resume больше не может оставить UI навсегда заблокированным после `resume_timeout`/`resume_failed` (лок снимается, pending очищается).
- Core: resume bootstrap prompt ужесточен, чтобы агент не выполнял работу до ack `Ready to continue working.`.

### Added
- Release artifacts: собран `codeai-hub-1.1.553.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.552] - 2026-02-10
### Changed
- Session UI: debug summary теперь показывает проценты в скобках: `#1 (78%) | #2 (81%)`.
- Session UI (Claude): в имени модели отображается состояние Thinking (`thinking on/off`).

### Added
- Release artifacts: собран `codeai-hub-1.1.552.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.551] - 2026-02-10
### Changed
- Session UI: строка статуса теперь показывает `Tokens: <used> (<percent>%)` без `/<max>`, и визуально сильнее разделяет `Models` и `Tokens` (увеличены пробелы вокруг `|`).

### Added
- Release artifacts: собран `codeai-hub-1.1.551.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.550] - 2026-02-10
### Fixed
- Launcher Session DnD: нативный CEF bridge теперь использует `CefDragData::GetFilePaths()` (полный путь вместо имени файла).

### Added
- Release artifacts: собран `codeai-hub-1.1.550.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.549] - 2026-02-10
### Fixed
- Session DnD (Project Manager / launcher runtime): вместо ненадежного угадывания dropped paths через selection/clipboard теперь используется нативный CEF bridge, который получает реальные пути файлов из drag-data и отправляет их в Session input по запросу.
- Project Manager (launcher): drop файла без Shift больше не заменяет SPA на картинку/файл (предотвращена дефолтная навигация Chromium/CEF).
- Clipboard: вставка file-link (`file://...`) и VS Code uri-list теперь нормализуется в путь и вставляется в input как file-path ссылка.

### Added
- CEF launcher bridge: `window.codeaiLauncher.requestFileDrop()` (перехват `codeai://file-drop`) для вставки путей dropped-файлов напрямую в UI.
- Release artifacts: собран `codeai-hub-1.1.549.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.548] - 2026-02-10
### Fixed
- Session DnD (Project Manager / launcher runtime): устранён сценарий, при котором drop-overlay показывался, но file-path ссылки не вставлялись в input после отпускания мыши.
- Drag-drop message handler: при наличии `codeaiBridgeConfig.httpUrl` включён приоритетный HTTP fallback transport (`POST/DELETE /api/v1/file-drop`) независимо от bridge-shim, чтобы не уходить в нерабочий `postMessage`-контур launcher runtime.
- File-drop fallback capture: добавлен короткий retry-цикл чтения `/api/v1/file-drop` для стабилизации захвата путей при тайминговом лаге между drop event и snapshot в Core.

### Added
- Regression contract test расширен под launcher-priority fallback + retry contract (`message-handler.test.ts`), webview/project-manager bundles пересобраны под обновлённый runtime.
- Release artifacts: собран `codeai-hub-1.1.548.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.547] - 2026-02-10
### Fixed
- Session DnD (Project Manager / launcher runtime): восстановлен fallback вставки file-path ссылок в input при `Shift + drag-and-drop`, когда VS Code bridge недоступен.
- Drag-drop message handler: добавлен HTTP fallback transport к Core API (`POST/DELETE /api/v1/file-drop`) для захвата и очистки dropped paths вне webview-контекста VS Code.

### Added
- Regression contract test для launcher fallback (`message-handler.test.ts`) и пересборка webview/project-manager bundle под новый runtime контур.
- Release artifacts: собран `codeai-hub-1.1.547.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.546] - 2026-02-10
### Changed
- Documentation sync release: обновлены архитектурные и стековые документы `doc/SolidWorks-Flow` под актуальный runtime/UI/launcher контур и текущий релиз.

### Added
- Release artifacts: собран `codeai-hub-1.1.546.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.545] - 2026-02-10
### Fixed
- Session UI: правый блок лимитов в `Session ID Bar` стал читаемее — label `5 houers`/`weekly` переведены на `9px`, уменьшены зазоры (`gap: 1px`, `column-gap: 6px`) при сохранении фиксированной высоты плашки `32px`.
- Session UI: подсказочные/инфоплашки (`ID`, `Press Enter to send...`, `Models/Tokens`, debug summary справа) выровнены по единому цвету `rgba(140, 140, 140, 1)`.

### Added
- Release artifacts: собран `codeai-hub-1.1.545.vsix` и обновлены локальные tarball-пакеты (`core`, `launcher`, `ui`, `providers`) через `build-all`/`build-release`.

## [1.1.544] - 2026-02-10
### Added
- Session UI: возвращена отдельная `Session ID Bar` между табами и диалогом; слева отображается `ID: <8-char-prefix>-...`, справа добавлены placeholder лимиты (`5 houers`, `weekly`) с прогресс-барами `80x4`.

### Changed
- Session UI: `Session ID Bar` зафиксирована по высоте `32px` (высота таба), layout выровнен по каноническому style-source (`media/session-view.css` + shared SessionView components).

## [1.1.538] - 2026-02-09
### Fixed
- Gemini reviewer continuity: `description/reviewer` auto-start now stays on preferred `geminiCli` provider when resume-path is available, instead of dropping to Claude fallback due to missing adapter resume contract.
- Description prompt-pack: removed clarification/wait-for-approval instruction that conflicted with one-shot/no-resume description session contract.

### Added
- Gemini provider resume contract: `GeminiProviderAdapter.resumeSession(...)` + `GeminiSessionManager` CLI resume wiring (`argv.resume`) with regression coverage for reviewer provider selection and fallback diagnostics.

## [1.1.537] - 2026-02-09
### Fixed
- Launcher installer: reuse existing installation now requires runtime integrity checks for required launcher artifacts; on macOS this includes `Chromium Embedded Framework.framework/Chromium Embedded Framework`, preventing broken installs that fail with `Failed to load CEF framework`.
- Launcher installer: legacy-to-primary migration now guards against symlink self-copy scenarios, preventing partial payload corruption during concurrent/legacy install transitions.

### Added
- New launcher runtime integrity module to centralize platform-specific required file checks for install/reuse validation.

## [1.1.536] - 2026-02-09
### Fixed
- Gemini provider runtime: устранено падение инициализации на `@google/gemini-cli-core@0.27.x` (`ERR_MODULE_NOT_FOUND` для `nonInteractiveToolExecutor`); `cli-bridge` теперь выбирает совместимый backend (`legacy_non_interactive` или `scheduler_fallback`).
- Gemini installer/provider diagnostics: module-layout compatibility ошибки теперь классифицируются отдельно от auth/login и проходят через post-update self-check.

### Added
- Gemini tool execution facade (`GeminiToolExecutorFacade`) для единого execution path между legacy и новым layout CLI Core.
- Regression тесты на loader fallback и unified tool execution в `Gemini_Module`.

## [1.1.535] - 2026-02-09
### Fixed
- Core: после `resume_ready` rollover pending-флаги и lock-контексты для source/target очищаются, target lifecycle нормализуется в `resume_in_place` перед первым обычным turn.
- Core/PM/UI: устранён post-bootstrap relock на первом обычном turn target-сессии; больше нет повторного `resuming`-залипания после успешного bootstrap unlock.

### Added
- Core regression на реальный порядок `assistant -> turn_completed` после rollover с проверкой отсутствия post-resume relock.
- PM/UI regression тесты на сценарий `resume_ready -> first normal turn` без повторного `blocked(resuming)` placeholder.

## [1.1.534] - 2026-02-09
### Fixed
- Core: после `turn_completed` разблокировка ввода запрещена, пока не получено явное post-turn решение контекста для текущего turn; добавлено обязательное состояние `context_check_pending`.
- Claude/Core/PM: устранён transient unlock-gap между `turn_completed` и поздним token-usage/context решением; PM удерживает `blocked`, пока не получен canonical unlock (`no_rollover_needed` или `resume_ready`).

### Added
- Core и PM regression тесты на строгий dual-confirmation unlock gate (`turn_completed` + explicit context decision) без сценария `blocked -> idle -> blocked`.
- Архитектурные документы дополнены инвариантами Phase 115 для post-turn арбитрации и `context_check_pending`.

## [1.1.533] - 2026-02-08
### Fixed
- Core: `turn_completed` больше не может эмитить `idle` до завершения async flow-node continuity arbitration по тому же provider event.
- Core/PM: устранён transient `unlock -> relock` между source session final turn и rollover bootstrap, когда threshold-trigger приходит асинхронно.

### Added
- Core regression: тест на atomic turn-end dual-gate (`turn_completed` ждёт завершения rollover arbitration перед unlock-решением).
- Architecture docs: зафиксирован Phase 114 инвариант атомарной арбитрации `turn_completed` + continuity threshold.

## [1.1.532] - 2026-02-08
### Fixed
- Core/PM: устранён unlock-gap после `turn_completed` при context-threshold rollover — `idle/no_rollover_needed` не эмитятся, если rollover уже pending/in-flight; PM удерживает `blocked` для `resume_via_rollover` до terminal `resume_ready`.

### Added
- Runtime snapshot contract: `continuityLockTransition.rolloverPending` добавлен как явный сигнал rollover-in-progress для PM/UI.
- Regression tests: Core/PM покрытие на запрет transient `blocked -> idle -> blocked` при старте rollover после terminal turn.

## [1.1.531] - 2026-02-08
### Fixed
- Core/PM: отключен session runtime watchdog auto-idle по умолчанию (раньше 120s), чтобы PM/UI не разблокировали ввод в середине долгих/"тихих" turn (например, в Description collector) до реального завершения turn.

### Added
- Core: regression test, подтверждающий что `SessionRuntime` по умолчанию не выполняет auto-idle по таймауту без явной конфигурации.

## [1.1.530] - 2026-02-08
### Fixed
- Core/PM: internal workflow dispatch теперь эмитит `turn_state=running`, предотвращая преждевременную разблокировку ввода в PM (например, в Description collector) до фактического завершения turn.

### Added
- Core regression tests: покрытие turn-state lifecycle для internal сообщений (running emission + idle rollback при ошибке отправки).

## [1.1.529] - 2026-02-08
### Fixed
- Project Manager: восстановлена видимость `Description` session в центральной панели до появления `reviewerSessionId` (forced-hide больше не применяется преждевременно).
- PM visibility guard: принудительное скрытие description-сессий снова включается только после фактического handoff к reviewer.

### Added
- PM regression check: тест на guard `!reviewerSessionId` в `reviewer-session-visibility`.

## [1.1.528] - 2026-02-08
### Added
- Core/PM snapshot contract: добавлены `resumeMode`, `finalTurnCompleted` и `terminalLockReason` как обязательные сигналы lifecycle для input lock arbitration.
- PM/UI regression coverage: тесты на bootstrap-gate (`resume_via_rollover`) и terminal no-resume lock invariants до разрешённого unlock.

### Fixed
- Core: `resume_in_place` теперь unlock'ится только по dual-gate (`final turn completed` + `no_rollover_needed`), без промежуточного `idle/unlocked` окна.
- Core: `resume_via_rollover` unlock переносится строго на первый bootstrap assistant answer (`resume_ready`); `resume_failed|resume_timeout` не выполняют unlock.
- PM/UI: terminal collector (`no_resume`) отображается как read-only и не может преждевременно вернуться в editable state.

## [1.1.525] - 2026-02-08
### Added
- Core/PM snapshot contract: добавлены transition lock поля `continuityLockReason` и `continuityLockTransition` для handoff lifecycle collector -> reviewer.
- Core runtime tests: покрытие continuity transition metadata в `WorkspaceRuntimeFacade` и публикации lock transition через `SessionRequestHandler`.
- PM/UI non-regression: тесты на strict pipeline split (`workspace:snapshot` vs `session:stream`) и handoff lock удержание до финального reviewer snapshot.

### Fixed
- Core: `workspace:snapshot` теперь публикует continuity transition metadata вместе с lock state, чтобы исключить transient unlock-gap на auto reviewer handoff.
- PM: input lock вычисляется только из snapshot transition contract; `session:stream` больше не может менять lock/connection state.
- UI: `SessionView` убрал legacy rollover эвристики и использует snapshot-derived lock state.

## [1.1.524] - 2026-02-08
### Added
- Core: `workspace-runtime` модуль (`WorkspaceStore`, `SessionRuntime`, `WorkspaceRuntimeFacade`) с sharded state и snapshot-first delivery.
- Core/PM wire protocol: `workspace:select`, `workspace:select:ack`, `workspace:snapshot`, `workspace:snapshot:request`, `command:error`.
- PM snapshot store: client-side `selectionId/sequence` gating для atomic workspace switch и stale snapshot ignore.
- Core watchdog: heartbeat-driven timeout rollback для `turn_state` в `idle`, чтобы исключить вечный `running`.

### Fixed
- PM: workspace switch и resume path теперь блокируются до `workspace:select:ack(status=applied)`.
- PM: input lock/unlock берётся из `workspace:snapshot`; `token-usage-stream` больше не меняет `connectionState`/continuity lock из `session:stream`.
- Core bridge: routing `workspace:select` синхронизирует per-client scope и ingress guard для out-of-scope `session:*` команд.
- Legacy cleanup: `workspace:scope:set` fallback убран из runtime-пути PM; Phase 104 legacy path задокументирован и помечен deprecated в Core.

## [1.1.523] - 2026-02-07
### Fixed
- PM/Core bridge: `session:*` delivery теперь строго scoped по выбранному `workspacePath` (absolute path), устранены cross-workspace ghost events.
- Project Manager: автофокус/рендер/отправка сообщений в out-of-scope сессии заблокированы (active-session reconciliation + hard send guard).
- Project Manager/Core ordering: `workspace:scope:set` + `workspace:scope:ack` handshake выполняется до `workspace-activate` и перед resume/create.
- Reconnect/restart path: сохранена совместимость reopen/resume из дерева workspace после рестарта Core/компьютера.
- Core: accepted user submit now emits immediate `turn_state=running` before provider `sendMessage`, removing provider-specific late-lock windows.
- Core: provider send failure now rolls back session state to `turn_state=idle`, preventing stuck input lock after send errors.
- PM: terminal continuity unlock (`resume_ready|resume_failed|resume_timeout`) now clears stale rollover pending (`resume_sent`) and restores idle state.
- UI: `SessionView` rollover-pending predicate now respects terminal continuity unlock (no stuck `blocked` after unlock).
- Core continuity templates: normalized internal ACK to `Ready to continue working.` in all create/resume templates.
- Session UI: virtual conversation suppresses internal ACK variants including markdown backtick-wrapped legacy token.
- Core: turn-end continuity arbitration now decides rollover before `turn_state=idle`, preventing `unlock -> relock` gaps on threshold crossings.
- Core: server-side guard rejects sends in source session while continuity rollover is pending (`continuity_rollover_pending`).
- PM: rollover pending phases (`start` ... `resume_sent`) keep snapshot state blocked until continuity unlock is observed.
- UI: `SessionView`/`InputPanel` use an effective continuity lock predicate that also respects rollover-pending state.
- Flow-node continuity rollover: added explicit `continuity_lock` stream lifecycle (`locked`/`unlocked`) to remove the input unlock gap between `new_session_created` and bootstrap completion of the new session.
- Core: deterministic continuity unlock on bootstrap completion/failure plus timeout fallback (`resume_ready`, `resume_failed`, `resume_timeout`).
- PM/UI: `token-usage-stream` now applies `continuity_lock` state and preserves blocked input semantics during session switch.
- Session UI: input placeholder + queue behavior aligned with active continuity lock state.
- Session UI: eliminated lock-copy desync (`disabled` and wait-copy now use unified lock branch).
- Continuity templates/UI filter: internal ACK standardized to `Ready to continue working.` (legacy token remains suppressed).
- Session UI: wait-copy color aligned with active provider tab palette (`alpha: 0.70`).
- Session UI: removed experimental Matrix Rain input lock background due rendering regressions; restored stable input panel visuals.

### Added
- Core regression tests for workspace-scoped bridge delivery and `workspace:scope:ack` handshake contract.
- PM/Core non-regression tests for restart reopen/resume path (`workspace-activate` + reviewer visibility).
- Core regression tests for immediate `running` lock emission and `idle` rollback on provider send failure.
- PM/UI regression tests for provider-agnostic immediate lock parity (`turn_state=running` handling + running placeholder contract).
- PM/UI regression tests for terminal unlock release (`resume_sent + continuity_lock(unlocked)`) and internal ACK suppression variants.
- Core regression tests for turn-end atomicity: no idle before continuity lock on rollover start; old-session send guard coverage.
- PM/UI regression tests for rollover-pending blocked state and continuity-lock disabled fieldset behavior in `InputPanel`.
- Core regression test covering continuity lock sequence across old->new session rollover.
- PM/UI regression tests for continuity lock handling (`token-usage-stream`) and continuity placeholder behavior in `InputPanel`.

## [1.1.516] - 2026-02-06
### Fixed
- Session UI: removed the standalone rails banner `Agent is working. Please wait.` while preserving input-panel queue/lock behavior.
- Claude debug logs: filtered `sdk:stream_event` noise for `event.type=content_block_delta`, keeping `sdk:result` and other lifecycle-relevant records.

### Added
- Claude module regression test covering SDK log filtering (`content_block_delta` suppressed, `result` still logged).

## [1.1.514] - 2026-02-06
### Fixed
- Core continuity: emit deterministic stream-only handoff lifecycle markers (`handoff_state=start|ready`) with explicit unlock path.
- Session UI: derive working-strip state from canonical turn markers (`turn_state`, handoff lifecycle, queued-send) to prevent stale "Agent is working" after final assistant message.
- Session UI: input/send lock is now tied only to handoff lifecycle; `turn_state=idle` always unlocks user input.

### Added
- Targeted regression tests for `idle after blocked` and `handoff start/ready` working-strip lifecycle.

## [1.1.502] - 2026-02-03
### Added
- Codex: Settings → Session Continuity threshold (default: 30% remaining) for future auto wrap/handoff trigger.

## [1.1.501] - 2026-02-03
### Fixed
- Webview: default background set to `rgb(24, 24, 24)` (common extension webview background).

## [1.1.500] - 2026-02-02
### Fixed
- Webview: Settings-only landing page background now uses VS Code theme variables (no hard-coded black).

## [1.1.499] - 2026-02-02
### Fixed
- Webview: Settings overlay is full-size (fixed CSS precedence in `session-view.css` which loads after `main-view.css`).

## [1.1.498] - 2026-02-02
### Fixed
- Webview: Settings panel now uses full Webview area (no centered overlay) and preserves vertical scrolling.

## [1.1.497] - 2026-02-02
### Added
- Core: persisted workflow `lastActive` snapshot in `.codeai-hub/<workspaceSlug>/workflow/state.json` and exposed via `GET /api/v1/orchestrator/workflow-state`.
- Core: `POST /api/v1/orchestrator/workspace-activate` to attach watcher for selected workspace and trigger core-driven resume.
- Project Manager: trigger `workspace-activate` on workspace selection (Core becomes the single resume authority).

### Fixed
- Core: validate resume providerSessionId against workspaceKey (derived from workspacePath) with fallback scan, preventing cross-workspace resume.
- Core: workspace activation resume no longer requires `sessionKind`; normalizes `runSlug`.

## [1.1.493] - 2026-02-01
### Fixed
- Core: restore unified-session dialog history across Core restarts and multi-workspace runs (per-session workspace scoping + fallback bucket scan).

## [1.1.492] - 2026-02-01
### Fixed
- Core: persist last-known token usage in continuity (`chain.json`) and restore on session binding (no extra state files).

## [1.1.482] - 2026-02-01
### Added
- Claude: real-time context window usage reporting (tokens `used / total` + `remaining%`) for sessions.
- Claude: Settings → Session Continuity threshold (default: 30% remaining) to auto-trigger session wrap/handoff.

### Changed
- Session UI: token percent now shows **remaining** context window percentage.

## [1.1.481] - 2026-02-01
### Fixed
- Project Manager: анкета описания остаётся редактируемой до отправки (при возврате в workspace не открывается как read-only `questionnaire.md`).

## [1.1.480] - 2026-02-01
### Fixed
- Docs: исправлена ссылка на Provider Setup Guide в README.

### Removed
- Webview/Project Manager: удалён неиспользуемый Session Todo UI и связанная проводка.
- Extension: удалены неиспользуемые helper API (provider installer stubs, UI update checker, legacy CEF launcher helpers).

## [1.1.479] - 2026-01-23
### Fixed
- Project Manager: при смене workspace автоматически выбираются последние сессия и артефакт.

## [1.1.478] - 2026-01-23
### Fixed
- Project Manager: после Add Workspace новый workspace автоматически становится активным.

## [1.1.477] - 2026-01-23
### Added
- Project Manager: macOS Finder folder picker для Add Workspace в CEF (fallback ручного ввода пути сохранён).
- Project Manager: авто-открытие анкеты описания для пустого workspace.

### Fixed
- Project Manager: сброс артефакта и состояния анкеты при смене workspace.
- Scripts: build CEF launcher читает версию из manifest.

## [1.1.476] - 2026-01-23
### Added
- Project Manager: Add workspace (CEF-safe) + multi-workspace switching по `workspace.slug`.
- Project Manager: best-effort worktree init через `POST /api/v1/orchestrator/workspace-session` (создаёт `.codeai-hub/<workspaceSlug>/`).

### Changed
- Core: registry workspace теперь хранит стабильный `slug` (миграция старых записей и детерминированная уникализация).

## [1.1.475] - 2026-01-23
### Fixed
- Core: `/api/v1/orchestrator/workflow-events` теперь отражает события workflow watcher (включая `workflow.artifact.written` с `filePath`).
- Project Manager: авто-обновление открытого артефакта при изменении файла на диске (в т.ч. `.codeai-hub/.../description/Final_Description.md`).

## [1.1.474] - 2026-01-22
### Fixed
- Session UI: show `Description <Provider>` for Description agent sessions; align Project Manager tree labels with tabs.

## [1.1.473] - 2026-01-22
### Fixed
- Core: defer continuity chain creation until the first outbound message (avoid extra continuity roots on passive open).

## [1.1.468] - 2026-01-21
### Fixed
- Core: workflow-state принимает `workspacePath` для чтения description/continuity после рестарта Core.
- Project Manager: передает `workspacePath` в workflow-state polling для быстрого восстановления дерева.
- Project Manager: ускорен initial refresh workflow-state (3s до первого ответа, затем 10/15s).

## [1.1.467] - 2026-01-21
### Fixed
- Project Manager: align artifact viewer typography with session dialogs.

## [1.1.466] - 2026-01-21
### Fixed
- Project Manager: lock description questionnaire after submission (read-only markdown).
- Project Manager: hide Description Agent session once Reviewer session is created.
- Project Manager: reduce artifact viewer font size.

## [1.1.464] - 2026-01-21
### Fixed
- VS Code Webview: prevent empty duplicate session when core rebroadcasts `session:created` (e.g. resume click while binding is pending).

### Changed
- VS Code Webview: Settings-only mode (sessions/chats handled in Project Manager).

### Removed
- Legacy web-client UI bundle and build pipeline.

## [1.1.463] - 2026-01-21
### Fixed
- Project Manager: prevent duplicate session windows when clicking Description Agent session before first provider response (dedupe rebroadcasted `session:created`).

## [1.1.462] - 2026-01-21
### Fixed
- Project Manager: dedupe repeated resume clicks while binding is pending.
- Project Manager: Description branch shows a single latest artifact (questionnaire → draft → final).
- Project Manager: auto-open `description.md`/`Final_Description.md` when they appear (hides questionnaire when draft/final exists).
- Project Manager: tree labels for Reviewer and Description Agent sessions.
- Core: prevent `description.sessionKind` regression from reviewer → collector.

## [1.1.459] - 2026-01-21
### Fixed
- Project Manager: resume/focus by `providerId + providerSessionId` without duplicates.
- Project Manager: close hides session locally (no Core delete).
- Project Manager: load JSONL history immediately after `session:created`.

## [1.1.457] - 2026-01-20

### Fixed
- Description workflow: auto-start Reviewer after `description.md` is written; bundled `reviewer-prompt.md` template.

## [1.1.456] - 2026-01-20

### Fixed
- **Description Agent prompt**: bundled template now enforces one-shot generation (no chat questions); questions belong to Reviewer stage.

## [1.1.455] - 2026-01-20

### Added
- **Session Continuity**: handoff chains with persisted reports and workflow-state API exposure.
- **Workflow Tree**: persisted Description branch (questionnaire/draft/final + session ref) and downstream OUTDATED on edits.
- **Project Manager**: continuity chain nodes, Description branch + Continue, and OUTDATED status in tree.

### Changed
- **Runs removal**: workflow artifacts now file-first without `runs/`, initiatives storage drops runs/currentRunId.

## [1.1.454] - 2026-01-19

### Fixed
- **Questionnaire Curator**: ignores provider `user_input` events (prevents writing the curator prompt into `questionnaire.md`), trims the initial Description Agent prompt from the session transcript, and skips invalid append blocks.

## [1.1.453] - 2026-01-19

### Fixed
- **Questionnaire Curator**: запись в анкету по `initiativeSlug` (ожидаемый `.codeai-hub/<workspaceSlug>/...`) и очистка вывода от эха промпта/JSON.

### Changed
- **Curator prompt**: запрет эха входных секций (metadata/questionnaire/transcript).

## [1.1.452] - 2026-01-19

### Changed
- **Questionnaire Curator**: использует session JSONL из `.codeai-hub/sessions` вместо run transcript; ответ куратора читается как сырой Markdown без маркеров.
- **Prompt**: упрощены правила вывода для куратора (без `BEGIN_APPEND/END_APPEND`).

### Fixed
- **Core**: удалены остаточные вызовы записи run transcript.

## [1.1.451] - 2026-01-19

### Added
- **Questionnaire Curator (description)**: авто-дописание `## Clarifications log` в `questionnaire.md` после финализации (`ok/approve/утверждаю`) на основе `transcript.jsonl`.
- **Run transcript**: сохранение диалога в `.codeai-hub/<workspaceSlug>/<stage>/runs/<runSlug>/transcript.jsonl` для последующей обработки.
- **Curator template**: новый template `questionnaire-curator.md` для генерации append-блока.

### Fixed
- **Gemini session routing**: устранены расхождения sessionId (alias promotion), из-за которых первое сообщение не попадало в сессию.
- **Gemini idea workflow**: корректный auto-run model label (включая чтение default model из настроек), чтобы runSlug создавался и промпт уходил в провайдера.
- **Gemini permissions**: разрешено чтение `~/.codeai-hub/templates` и `~/.codeai-hub/codeai-hub`, нормализован workspacePath; включены YOLO tools для write/edit.

## [1.1.444] - 2026-01-18

### Fixed
- **Workflow templates**: формулировки “следующий шаг” выровнены под последовательность `Description → Virtual Simulation → Module Diagram → Interface Map`.
- **Sessions UI**: длинные строки/URL и code blocks больше не вылезают за границы сообщений (перенос/скролл).

### Verified
- **Workflow prompts**: Codex + Claude корректно читают входные файлы по путям (path-first, без `/read`) и пишут `description.md` в file-first runs.

## [1.1.443] - 2026-01-18

### Changed
- **Workflow prompts**: для стадий file-first агенты больше не просят `/read`, а читают файлы напрямую средствами провайдера.
- **Claude**: расширен список доступных директорий для чтения (включая домашнюю директорию пользователя) при `bypassPermissions`.
- **Build scripts**: добавлен флаг `--allow-dirty` для `build-all.sh`/`build-release.sh` (опционально; по умолчанию требования “clean tree” сохранены).

## [1.1.442] - 2026-01-18

### Changed
- **Workflow prompt pack (path-first)**: Project Manager больше не инлайнит анкету/шаблон в стартовый промпт; в prompt pack передаются пути, агент читает файлы сам.
- **Core**: полностью удалён auto-attach (workspace files + pre_read_documents), Core отправляет провайдеру ровно пользовательский текст.
- **Workflow prompts**: file-first промпты упрощены (без JSON-инструкций, фокус на чтение файлов и запись артефакта).

## [1.1.441] - 2026-01-18

### Changed
- **Workflow prompts (file-first)**: обновлены промпты для Description/Virtual Simulation/Diagrams — без structured output, с явной записью файла по целевому пути.
- **Workflow templates**: schema-шаблоны для workflow стадий удалены из bundled templates; template sync больше не архивирует legacy-папки.
