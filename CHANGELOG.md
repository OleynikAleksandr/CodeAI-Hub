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
