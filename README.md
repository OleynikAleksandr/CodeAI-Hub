# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension that unifies multiple AI providers behind a single, type-safe experience. The project enforces strict quality and architecture rules through Ultracite, keeping the codebase ready for multi-agent orchestration.

## Current Release — v1.1.529
- **Phase 110 visibility hotfix**: исправлено преждевременное скрытие `Description` session в PM до определения `reviewerSessionId`; сессия снова стабильно видна сразу после отправки анкеты.
- **Workspace Runtime MVP**: добавлен модуль Core `workspace-runtime` (sharded store + facade + snapshot builder) с `workspace:select`/`workspace:snapshot` протоколом.
- **Snapshot-first lock authority**: блокировка ввода в PM теперь server-driven из `workspace:snapshot` (`turnState` + `continuityLockActive`), без зависимости от одиночных `session:stream` terminal-событий.
- **Phase 107 lock transition contract**: snapshot расширен полями `continuityLockReason` и `continuityLockTransition.awaitingBootstrapTurn`, чтобы убрать unlock-gap между collector artifact write и reviewer bootstrap.
- **Phase 109 resume-mode contract**: Core/PM/UI синхронизированы по `resumeMode` (`no_resume|resume_in_place|resume_via_rollover`), dual-gate unlock (`no_rollover_needed`) и bootstrap gate (`resume_ready`) без premature unlock.
- **Strict PM pipeline split**: `workspace:snapshot` стал единственным источником lock/connection lifecycle; `session:stream` оставлен только для token usage и контента.
- **Watchdog terminal rollback**: в Core включён session runtime watchdog с heartbeat, чтобы `running` состояние не могло залипнуть бесконечно при потере terminal markers.
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

Перед запуском прочитайте [Provider Setup Guide](doc/Project_Docs/knowledge/guides/ProviderSetupGuide.md) и установите/аутентифицируйте необходимые CLI под своей учётной записью.

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
