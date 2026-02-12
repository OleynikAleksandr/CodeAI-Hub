# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension that unifies multiple AI providers behind a single, type-safe experience. The project enforces strict quality and architecture rules through Ultracite, keeping the codebase ready for multi-agent orchestration.

## Current Release — v1.1.574
- **Session ID Bar reset time UX fix (Phase 148)**: подписи лимитов `session/weekly` теперь показывают reset-время в локальной timezone пользователя и в читабельном формате `Resets Feb 12 at 6pm` (без сырого ISO `...Z`).
- **Claude usage limits panel recovery (Phase 147)**: восстановлено заполнение `session/weekly` в `Session ID Bar` после Claude turn (включая Reviewer) за счёт поддержки `anthropic-ratelimit-unified-5h/7d-utilization` в parser-е лимитов.
- **Claude usage limits probe diagnostics log**: добавлен отдельный JSONL лог `~/.codeai-hub/logs/claude/usage-limits-probe.jsonl`, чтобы видеть каждый probe-запрос лимитов, HTTP status, ratelimit headers и parsed snapshot/null.
- **Workflow reviewer auto-start hotfix**: в Core исправлен bind workflow watcher для `session:create` с `workspacePath + initiativeSlug`; после записи `description.md` снова автоматически создаётся reviewer-сессия.
- **Claude OAuth keychain parsing hotfix**: OAuth token reader для platform-store сначала извлекает `accessToken` из JSON payload (`claudeAiOauth.accessToken`), и только затем использует raw-token fallback, что устраняет `401 Invalid bearer token` в provider-home preflight.
- **Claude provider-home OAuth bootstrap (Phase 146)**: перед первой рабочей Claude-сессией Core выполняет preflight non-interactive probe в `HOME=~/.codeai-hub/providers/claude/home`; при фейле делает retry после refresh токена и только потом поднимает явный login-hint.
- **Claude OAuth env injection**: в runtime Claude-процессов автоматически пробрасывается `CLAUDE_CODE_OAUTH_TOKEN` (с безопасным fallback-резолвингом), чтобы убрать `Not logged in · Please run /login` при provider-home запуске.
- **Claude provider home isolation**: Claude Code CLI запускается с `HOME=~/.codeai-hub/providers/claude/home/`, поэтому сессии/транскрипты пишутся в `~/.codeai-hub/providers/claude/home/.claude/projects/*` и не смешиваются с терминальными `~/.claude/*`.
- **Claude auth state symlink**: auth-файл `~/.codeai-hub/providers/claude/home/.claude.json` теперь линкуется на `~/.claude.json` (на Windows используется fallback copy), чтобы provider-home не дублировал OAuth state.
- **Codex auth/config symlinks**: файлы `~/.codeai-hub/providers/codex/home/{auth.json,config.toml}` теперь линкуются на `~/.codex/{auth.json,config.toml}` (на Windows используется fallback copy), сохраняя единый источник auth/config.
- **Claude usage limits (Phase 144)**: лимиты `session/weekly` теперь читаются из `anthropic-ratelimit-unified-5h-*` / `7d-*` headers через lightweight probe к `https://api.anthropic.com/v1/messages` (`oauth-2025-04-20`), без slash-команды `/usage`, при сохранении прежнего UI-контракта `usage_limits`.
- **Legacy template cleanup (Phase 141)**: extension activation больше не устанавливает legacy-шаблоны `full-development-flow/idea/*` в `~/.codeai-hub/templates/`, чтобы на чистой установке не появлялся хвост старой архитектуры.
- **Codex model update**: дефолтная модель обновлена на `gpt-5.3-codex` (вместо `gpt-5.2-codex`) в Settings/Core.
- **Description workflow cleanup**: полностью удалён внутренний `Questionnaire Curator` (авто-запуск дополнительной provider-сессии после `ok/approve`), чтобы убрать лишние `sdk-gemini-*.jsonl` и побочные дописывания в анкету.
- **RU language contract (Description/Reviewer)**: в шаблоны `Description Agent` и `Reviewer Agent` добавлено явное требование вести диалог и формировать артефакты только на русском языке; fallback reviewer prompt в Core синхронизирован с тем же правилом.
- **Gemini workspace tool access**: Gemini CLI теперь включает `workspacePath` в `includeDirectories`, поэтому tool-calls (`read_file`/`write_file`) могут читать/писать workspace артефакты (фиксит `Path not in workspace` и пустой `description.md`).
- **Settings continuity inputs**: пороги continuity (% и Gemini tokens) вводятся вручную (без spinner-стрелок) с контролем пределов на blur/Enter.
- **Gemini stream errors**: ошибки из Gemini теперь отображаются человеко-читаемо (извлекается nested `error.message`), вместо `[object Object]`.
- **Session header tokens formatting**: `Tokens: <used> (<percent>%)` (без `/<max>`), увеличены пробелы вокруг `|` между Models и Tokens.
- **Default settings persistence**: при чистой установке создается `~/.codeai-hub/settings/settings.json` с дефолтами, поэтому Session UI сразу показывает полный label модели (например, `gpt-5.3-codex (medium)`), а не только `codex`.
- **Gemini token continuity**: добавлены настройки `contextWindowTokenLimit` (default `300000`) и `remainingPercentThreshold` (default `30%`); Gemini эмитит `token_usage` (`used/limit`) на основе `usageMetadata.totalTokenCount`.
- **Flow continuity (Core)**: при `resume_timeout/resume_failed` UI больше не зависает на `Agent is resuming your session…`; лок снимается и rollover pending очищается.
- **Session status panel debug summary**: проценты теперь показываются в скобках: `#1 (78%) | #2 (81%)`.
- **Claude model label**: для всех Claude моделей отображается состояние Thinking: `thinking on/off`.
- **Claude default model**: в settings используется явный alias `sonnet` (без legacy `default`), и в Session UI отображается `Sonnet`.
- **Launcher file path drop**: drag-drop в CEF использует `CefDragData::GetFilePaths()` (вставляется полный путь, а не display name).
- **Phase 130 launcher native file-drop fix**: CEF launcher теперь получает реальные пути dropped-файлов из drag-data и вставляет их в Session input по `Shift + drag-and-drop` через нативный bridge `window.codeaiLauncher.requestFileDrop()` (без зависимости от clipboard/selection).
- **Launcher drop navigation guard**: drop файла без Shift в Project Manager больше не заменяет интерфейс на содержимое файла.
- **Clipboard file-link paste**: вставка `file://...` и VS Code uri-list нормализуется в путь и вставляется как file-path ссылка.
- **Phase 129 launcher DnD hardening**: для Project Manager (launcher runtime) fallback маршрут принудительно использует Core HTTP transport при наличии `codeaiBridgeConfig.httpUrl` и добавляет короткий retry-цикл для захвата dropped paths через `POST /api/v1/file-drop`, чтобы устранить сценарий с отображением drop-overlay без вставки путей.
- **Phase 128 launcher DnD recovery**: восстановлен fallback `Shift + drag-and-drop` для Session input в Project Manager (launcher runtime) — при отсутствии VS Code bridge модуль читает/очищает dropped paths через Core API `/api/v1/file-drop`.
- **Phase 126 Session UI typography tune**: для `Session ID Bar` повышена читаемость правого блока лимитов (`5 houers`, `weekly`) — label `9px`, уменьшены зазоры (`gap: 1px`, `column-gap: 6px`) при сохранении фиксированной высоты плашки `32px`.
- **Session hint color unification**: тексты `ID`-плашки, `Press Enter to send...`, `Models/Tokens` и правый debug summary переведены на единый цвет `rgba(140, 140, 140, 1)`.
- **Release packaging**: собран и проверен артефакт `codeai-hub-1.1.574.vsix` вместе с обновлёнными tarball в `~/.codeai-hub/releases/`.
- **Phase 119 Gemini reviewer resume integration**: `GeminiProviderAdapter` теперь поддерживает `resumeSession`, `GeminiSessionManager` прокидывает `argv.resume`, и reviewer в ветке `description/reviewer` сохраняет preferred Gemini provider при доступном resume-path вместо fallback на Claude.
- **Description one-shot prompt contract fix**: из prompt-pack удалена инструкция про уточняющие вопросы/ожидание `OK/approve`, чтобы контракт не конфликтовал с one-shot/no-resume поведением description-сессии.
- **Phase 118 launcher runtime integrity hotfix**: installer теперь валидирует целостность launcher runtime перед reuse (включая macOS CEF framework binary), а legacy→primary migration защищена от self-copy через symlink-path; это устраняет сценарий `Failed to load CEF framework` в Project Manager после повреждённой/частичной установки.
- **Phase 117 Gemini runtime compatibility hotfix**: Gemini provider теперь корректно инициализируется на `@google/gemini-cli-core` layout ветках `0.17.x` и `0.27.x`; при отсутствии legacy `nonInteractiveToolExecutor` автоматически включается `scheduler_fallback`, ошибки module-compatibility диагностируются отдельно от auth.
- **Phase 116 rollover lifecycle normalization hotfix**: после `resume_ready` Core очищает rollover pending-флаги source/target, переводит target в `resume_in_place`, и первый обычный turn завершается без повторного `resuming` lock.
- **Phase 115 strict dual-confirmation unlock gate**: после `turn_completed` ввод остаётся заблокированным до явного post-turn context decision (`no_rollover_needed|rollover_required`) в этом же турне; устранён transient `unlock -> relock` при асинхронных usage-событиях.
- **Phase 113 rollover unlock guard hotfix**: после `turn_completed` Core больше не снимает input lock, если rollover уже pending/in-flight; PM/UI дополнительно удерживают `blocked` до terminal `resume_ready` без transient unlock-gap.
- **Phase 112 watchdog disable hotfix**: отключен session runtime watchdog auto-idle по умолчанию, чтобы PM не снимал блокировку ввода в середине долгих/"тихих" turn до реального завершения turn.
- **Phase 111 internal workflow lock fix**: internal workflow dispatch теперь эмитит `turn_state=running`, поэтому ввод в PM не разблокируется до завершения turn (включая Description collector и reviewer bootstrap).
- **Phase 110 visibility hotfix**: исправлено преждевременное скрытие `Description` session в PM до определения `reviewerSessionId`; сессия снова стабильно видна сразу после отправки анкеты.
- **Workspace Runtime MVP**: добавлен модуль Core `workspace-runtime` (sharded store + facade + snapshot builder) с `workspace:select`/`workspace:snapshot` протоколом.
- **Snapshot-first lock authority**: блокировка ввода в PM теперь server-driven из `workspace:snapshot` (`turnState` + `continuityLockActive`), без зависимости от одиночных `session:stream` terminal-событий.
- **Phase 107 lock transition contract**: snapshot расширен полями `continuityLockReason` и `continuityLockTransition.awaitingBootstrapTurn`, чтобы убрать unlock-gap между collector artifact write и reviewer bootstrap.
- **Phase 109 resume-mode contract**: Core/PM/UI синхронизированы по `resumeMode` (`no_resume|resume_in_place|resume_via_rollover`), dual-gate unlock (`no_rollover_needed`) и bootstrap gate (`resume_ready`) без premature unlock.
- **Strict PM pipeline split**: `workspace:snapshot` стал единственным источником lock/connection lifecycle; `session:stream` оставлен только для token usage и контента.
- **Watchdog auto-idle**: отключен по умолчанию; turn lifecycle определяется только явными provider lifecycle событиями (без таймаутного принудительного `idle`).
- **Scope sync hardening**: ingress guard для `session:create|session:message|session:delete` и scoped delivery привязаны к `workspace:select` (legacy `workspace:scope:set` оставлен только как deprecated transition path в Core).
- **Regression coverage**: добавлены targeted тесты Core/PM для routing `workspace:select`, snapshot-driven lock и ack-gating в switch/resume path.

## Release Candidate — Phase 103 (Core-first Immediate Input Lock Parity)
- **Immediate lock parity**: Core эмитит `turn_state=running` сразу на accepted submit до `adapter.sendMessage` (provider-agnostic для Claude/Codex/Gemini).
- **Send-error rollback**: при ошибке `sendMessage` Core откатывает состояние в `turn_state=idle`, не допуская stuck input lock.
- **Provider lifecycle compatibility**: поздние provider `turn_started` события остаются идемпотентным подтверждением уже активного running-state.
- **Regression coverage**: добавлены Core тесты на immediate-running и rollback, PM/UI тесты на parity блокировки сразу после submit.

## Features
- **Unified provider orchestration**: launch Claude, Codex, or Gemini sessions from an identical picker; the dialog surfaces connection state, enforces one-provider selection, and reminds you to install/authenticate matching CLIs.
- **Idea Collector flow**: Codex and Claude sessions can launch a guided idea collection flow that produces structured Idea.md drafts.
- **Persistent standalone UI**: the macOS launcher (CEF) stores window position and size in real time, so Project Manager reopens exactly where you left it—even across monitor changes.
- **Offline-first packaging**: manifests point to the local `~/.codeai-hub/releases/` cache, and build scripts publish fresh tarballs for core, launcher, and provider modules without relying on GitHub downloads.
- **Provider readiness**: users install and configure CLI tools themselves (see the guide below); upcoming diagnostics and status toggles are outlined in `doc/TODO/todo-plan.md`.
- **Quality guardrails**: Ultracite architecture rules, jscpd duplication scans, ts-prune export checks, and Biome formatting are orchestrated through Husky pre-commit/pre-push hooks to keep the codebase healthy.

## Getting Started
```bash
git clone https://github.com/OleynikAleksandr/CodeAI-Hub.git
cd CodeAI-Hub
npm install
```

Перед запуском прочитайте [Provider Setup Guide](doc/SolidWorks-Flow/knowledge/guides/ProviderSetupGuide.md) и установите/аутентифицируйте необходимые CLI под своей учётной записью.

## Development Workflow
1. **Install dependencies**
   ```bash
   npm install
   npm run setup:hooks    # installs Husky git hooks
   ```
2. **Implement changes** in `src/` and `packages/**`, keeping files under 300 lines and leaning on micro-classes plus facades.
3. **Run quality checks** before committing:
   ```bash
   npm run quality        # architecture gate + Ultracite lint
   npm run check:tsprune  # detect unused exports
   npm run compile        # ensure TypeScript builds cleanly
   ```
4. **Commit**; the pre-commit hook reruns the same gates automatically.

## Building a Release
Always use the split build pipeline to generate a release:
```bash
./scripts/build-all.sh
./scripts/build-release.sh --use-current-version
```
`build-all.sh`:
- enforces a clean git tree, bumps versions across root and workspaces and syncs manifests;
- wipes the local `~/.codeai-hub/{core,providers,cef-launcher,releases}` caches before rebuilding;
- rebuilds provider modules, core runtime, CEF launcher and UI bundles, прогоняя архитектурные/линт чекеры;
- копирует свежие tar.bz2 артефакты в `doc/tmp/releases/`.

`build-release.sh --use-current-version`:
- требует чистый git tree перед стартом;
- прогоняет финальные гейты (архитектура, type-check, compile, SDK exclusions, advisory link/dup checks);
- временно удаляет dev-зависимости и создаёт VSIX (оставляя `codeai-hub-<version>.vsix` в корне), затем восстанавливает dev-deps.

По завершении обновляйте README, CHANGELOG, SystemArchitecture и `doc/TODO/todo-plan.md`, фиксируйте релиз коммитом `feat: vX.Y.Z - <summary>` и пушьте в `main`.

### Verifying the core runtime
```bash
# Ensure the orchestrator is running
curl http://127.0.0.1:8080/api/v1/health

# Optional: inspect active sessions / providers
curl http://127.0.0.1:8080/api/v1/status | jq .
```

## Repository Layout
```
media/                       Bundled webview assets (CSS + JS) shipped with the extension.
media/react-chat.js          React bundle generated by the webview build script.
src/core/webview-module/     HTML scaffold that injects the webview assets.
src/extension-module/        Extension host micro-classes.
src/extension.ts             Entry point registering the webview provider.
src/client/ui/src/app-host/ Hooks that coordinate the session host and provider picker.
src/client/ui/src/components/action-bar/ React implementation of the quick-action bar.
scripts/                     Quality and release automation.
doc/                         Architecture and knowledge base (ignored in VSIX).
```

## License
License information will be added in a future update. Until then, treat the repository as proprietary and request permission before redistribution.
