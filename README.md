# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension + standalone Project Manager (CEF) that unifies multiple AI providers behind a single, type-safe orchestration layer.

- SolidWorks-WorkFlow docs index: `doc/SolidWorks-WorkFlow/Docs_Index.md`
- System SSOT: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Session input lock SSOT: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Bug registry: `doc/BugRegistry.md`

## Current Release — v1.1.730
- Universal provider usage limits: `Claude`, `Codex` и `Gemini` теперь работают через единый shared module в `packages/core`, где live provider surface является primary source, а provider-specific fallback остаётся только запасным путём.
- Codex live-source migration: usage limits читаются по цепочке `runtime payload -> app-server account/rateLimits/read -> rollout JSONL fallback`, без обязательной зависимости от PTY/TUI `/status`.
- WebSocket replay hardening: stateful `usage_limits` signals теперь реплеятся после websocket connect и после смены workspace scope, поэтому `Codex` лимиты не должны теряться в `Project Manager` / `Session UI` при позднем attach/rebind.
- Gemini dialog segmentation: `Gemini_Module` теперь флашит assistant segments на каждом `finished` и больше не дублирует их одним финальным aggregate block, если segmented replies уже были отданы через dialog history.
- Flow-node continuity turn boundary: threshold-trigger continuity для document/workflow nodes больше не может прервать активный user one-shot turn на первом `token_usage`; rollover разрешён только после `turn_completed` или по trailing usage уже в pending post-turn arbitration.
- Session UI hardening: usage limits теперь кэшируются по canonical `providerScopeKey`, а `Session ID bar` показывает provider-aware labels из shared snapshot вместо старого hardcoded `session/weekly`.
- Diagnostics: shared usage-limits facade и `Codex` integration теперь отдают source-aware diagnostics для `cache_hit`, `fresh_read`, `fallback_cached` и `unavailable`, что упрощает разбор refresh/fallback поведения.
- Description cleanup baseline: продукт по-прежнему работает на canonical `questionnaire.md` -> `Final_Description.md` flow без legacy `↻ Restart attempt` semantics и без старого `description.md` label в tree/main-area.
- Core/runtime baseline: active artifact persistence остаётся на canonical `/api/v1/orchestrator/artifact-upsert`; obsolete restart-era transport не возвращается в stable line.
- Documentation governance: перед `doc/TODO/todo-plan.md` новый scope теперь обязан сначала жить в `doc/SolidWorks-WorkFlow/Plans/`, а реализованный SSOT остаётся только в `System/`, `Clusters/`, `Modules/`, `Contracts/`.
- Agent instructions: единственный git-tracked источник правил — `AGENTS.md`; локальные `GEMINI.md` и `.claude/CLAUDE.md` сведены к коротким redirect-файлам.
- Release pipeline: локальный `build-all` должен поднять unified version до `1.1.730` и пересобрать provider/core/ui/launcher артефакты уже поверх этого baseline.

Previous releases (summary): the `1.1.57x–1.1.719` series focused on SSOT routing (dialog vs runtime), snapshot-first lock/usage authority, continuity/resume reliability across providers, Virtual Simulation workflow, Diagram Modules / Facades workflow, workflow handoff UX, panel sync in Project Manager, and later PM hydration/workflow-state experiments that are intentionally not part of this stable baseline release.

## Features
- **Unified provider orchestration**: launch Claude, Codex, or Gemini sessions from an identical picker; the dialog surfaces connection state, enforces one-provider selection, and reminds you to install/authenticate matching CLIs.
- **Idea Collector flow**: Codex and Claude sessions can launch a guided idea collection flow that produces structured Idea.md drafts.
- **Persistent standalone UI**: the macOS launcher (CEF) stores window position and size in real time, so Project Manager reopens exactly where you left it—even across monitor changes.
- **Offline-first packaging**: manifests point to the local `~/.codeai-hub/releases/` cache, and build scripts publish fresh tarballs for core, launcher, and provider modules without relying on GitHub downloads.
- **Quality guardrails**: Ultracite architecture rules, jscpd duplication scans, ts-prune export checks, and Biome formatting are orchestrated through Husky pre-commit/pre-push hooks.

## Getting Started
```bash
git clone https://github.com/OleynikAleksandr/CodeAI-Hub.git
cd CodeAI-Hub
npm install
```

Перед запуском прочитайте `doc/SolidWorks-WorkFlow/Docs_Index.md` и следуйте SSOT-контрактам из `doc/SolidWorks-WorkFlow/Contracts/` (в частности `Contracts/Workflow_CLI.md`) для настройки провайдерных CLI/SDK.

## Development Workflow
1. Install dependencies
   ```bash
   npm install
   npm run setup:hooks    # installs Husky git hooks
   ```
2. Implement changes in `src/` and `packages/**` (micro-classes + facades; keep files under 300 lines).
3. Run quality checks before committing:
   ```bash
   npm run quality        # architecture gate + Ultracite lint
   npm run check:tsprune  # detect unused exports
   npm run compile        # ensure TypeScript builds cleanly
   ```

## Building a Release
```bash
./scripts/build-all.sh
./scripts/build-release.sh --use-current-version
```

## Repository Layout
```
media/                       Bundled webview assets (CSS + JS) shipped with the extension.
media/react-chat.js          React bundle generated by the webview build script.
src/core/webview-module/     HTML scaffold that injects the webview assets.
src/extension-module/        Extension host micro-classes.
src/extension.ts             Entry point registering the webview provider.
scripts/                     Quality and release automation.
doc/                         Architecture and knowledge base.
```

## License
License information will be added in a future update. Until then, treat the repository as proprietary and request permission before redistribution.
