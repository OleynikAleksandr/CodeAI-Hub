# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension that unifies multiple AI providers behind a single, type-safe experience. The project enforces strict quality and architecture rules through Ultracite, keeping the codebase ready for multi-agent orchestration.

## Current Release — v1.1.281
- **Autonomous Core + TTL**: the core orchestrator runs as a long‑lived service managed by Core Supervisor; a configurable idle TTL (`CORE_SHUTDOWN_GRACE_MS`) controls when the core auto‑shuts down after the last client disconnects, and `/api/v1/status` exposes a `core.ttl` block with remaining time and activity timestamps.
- **Supervisor‑driven startup**: VS Code and CLI no longer spawn `node dist/index.js` directly. Instead they call Core Supervisor (`@codeai-hub/core-supervisor`, CLI `codeai-core`), which selects the installed runtime under `~/.codeai-hub/core/<platform>/<version>/` and starts it with aligned environment variables (`CORE_HOST/CORE_PORT/CORE_MANAGED_MODE`, `*_WORKSPACE_PATH`, `*_MODULE_PATH`).
- **Provider filesystem registry**: the core discovers Claude/Codex/Gemini modules from `~/.codeai-hub/providers/<provider>/<version>/` and marks them `active/inactive/degraded` without crashing the process when a provider is missing or misconfigured; UI surfaces these statuses in the provider picker.
- **VS Code + Launcher attach‑only**: both the extension and the CEF launcher call `attachToRunningCore()` before starting anything new; if the running core matches the manifest version, they simply attach and restore sessions instead of reinstalling providers or rebooting the core.
- **Launcher startup fallback**: the CEF launcher prefers `codeai-core start` to bootstrap the core, but if the Supervisor CLI is not present in `PATH`, it falls back to launching the installed runtime directly via `<runtime>/node/bin/node app/dist/index.js`, using the same environment as the CLI and extension.
- **Session UI refresh**: the session view pins tabs/info/status rails, scrolls exclusively inside the dialog panel, auto-scrolls to the latest message unless the user scrolls up, renders Markdown (bold, lists, links) directly from JSONL history with consistent spacing, and collapses consecutive reasoning chunks into a single compact “Thinking” card.
- **Thinking readability polish**: reasoning pills use a shared Markdown renderer that strips emphasis/bold when in "thinking" mode and add a 6 px buffer below expanded content, so Claude/Codex/Gemini all display ultra-light reasoning text without overlapping the following assistant card.
- **Artifacts kept in sync**: `./scripts/build-all.sh` bumps versions across workspaces, rebuilds providers/core/launcher/VSIX, updates manifests and emits a consistent set of offline artifacts.

- **Artifact bundle**
- VSIX: `codeai-hub-1.1.281.vsix`
- Launcher: `CodeAIHubLauncher-macos-arm64-1.1.281.tar.bz2`
- Core: `codeai-hub-core-darwin-arm64-1.1.281.tar.bz2`
- Providers: `claude-module-1.1.281.tar.bz2`, `codex-module-1.1.281.tar.bz2`, `gemini-module-1.1.281.tar.bz2`

## Features
- **Unified provider orchestration**: launch Claude, Codex, or Gemini sessions from an identical picker; the dialog surfaces connection state, enforces one-provider selection, and reminds you to install/authenticate matching CLIs.
- **Persistent standalone UI**: the macOS launcher (CEF) stores window position and size in real time, so the web client reopens exactly where you left it—even across monitor changes.
- **Offline-first packaging**: manifests point to the local `~/.codeai-hub/releases/` cache, and build scripts publish fresh tarballs for core, launcher, and provider modules without relying on GitHub downloads.
- **Provider readiness**: users install and configure CLI tools themselves (see the guide below); upcoming diagnostics and status toggles are outlined in `doc/TODO/todo-plan_.md`.
- **Quality guardrails**: Ultracite architecture rules, jscpd duplication scans, ts-prune export checks, and Biome formatting run through Lefthook to keep the codebase healthy.

## Getting Started
```bash
git clone https://github.com/OleynikAleksandr/CodeAI-Hub.git
cd CodeAI-Hub
npm install
```

Перед запуском прочитайте [Provider Setup Guide](doc/Project_Docs/knowledge/ProviderSetupGuide.md) и установите/аутентифицируйте необходимые CLI под своей учётной записью.

## Development Workflow
1. **Install dependencies**
   ```bash
   npm install
   npm run setup:hooks    # optional: installs lefthook locally
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
Always use the unified script to generate a release:
```bash
./scripts/build-all.sh
```
The script performs:
- enforces a clean git tree, bumps versions across root and workspaces and syncs manifests;
- wipes the local `~/.codeai-hub/{core,providers,cef-launcher,releases}` caches before rebuilding;
- rebuilds provider modules, core runtime, CEF launcher и VSIX, прогоняя архитектурные/линт чекеры;
- копирует свежие tar.bz2 артефакты в `doc/tmp/releases/` и оставляет итоговый VSIX в корне репозитория.

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
media/web-client/            Standalone web client shell (HTML + bundled app.js + macOS launcher assets).
src/core/webview-module/     HTML scaffold that injects the webview assets.
src/extension-module/        Extension host micro-classes.
src/extension.ts             Entry point registering the webview provider.
src/client/ui/src/app-host/ Hooks that coordinate the session host and provider picker.
src/client/ui/src/components/action-bar/ React implementation of the quick-action bar.
src/client/ui/src/components/settings/ Modular settings UI with reusable parts.
scripts/                     Quality and release automation.
doc/                         Architecture and knowledge base (ignored in VSIX).
```

## License
License information will be added in a future update. Until then, treat the repository as proprietary and request permission before redistribution.
