# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension + standalone Project Manager (CEF) that unifies multiple AI providers behind a single, type-safe orchestration layer.

- SolidWorks-WorkFlow docs index: `doc/SolidWorks-WorkFlow/Docs_Index.md`
- System SSOT: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Session input lock SSOT: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Bug registry: `doc/BugRegistry.md`

## Current Release — v1.1.730
- Universal provider usage limits: `Claude`, `Codex`, and `Gemini` now use a shared module in `packages/core`, where the live provider surface is the primary source and provider-specific fallbacks remain secondary.
- Codex live-source migration: usage limits are read through `runtime payload -> app-server account/rateLimits/read -> rollout JSONL fallback`, without a mandatory dependency on PTY/TUI `/status`.
- WebSocket replay hardening: stateful `usage_limits` signals are replayed after websocket connect and after workspace scope changes, so `Codex` limits are not lost in `Project Manager` / `Session UI` during late attach or rebind.
- Gemini dialog segmentation: `Gemini_Module` now flushes assistant segments on every `finished` event and no longer duplicates them with a final aggregate block when segmented replies were already emitted through dialog history.
- Flow-node continuity turn boundary: threshold-trigger continuity for document/workflow nodes can no longer interrupt an active user one-shot turn on the first `token_usage`; rollover is allowed only after `turn_completed` or by trailing usage in pending post-turn arbitration.
- Release validation on March 15, 2026: a manual smoke test for the `Gemini` document node confirmed that in `v1.1.730` the active one-shot turn finishes completely before continuity handoff/bootstrap begins.
- Session UI hardening: usage limits are now cached by the canonical `providerScopeKey`, and the `Session ID bar` renders provider-aware labels from the shared snapshot instead of the old hardcoded `session/weekly`.
- Diagnostics: the shared usage-limits facade and `Codex` integration now expose source-aware diagnostics for `cache_hit`, `fresh_read`, `fallback_cached`, and `unavailable`, making refresh/fallback behavior easier to investigate.
- Description cleanup baseline: the product remains on the canonical `questionnaire.md` -> `Final_Description.md` flow without legacy `↻ Restart attempt` semantics and without the old `description.md` label in the tree/main area.
- Core/runtime baseline: active artifact persistence remains on the canonical `/api/v1/orchestrator/artifact-upsert`; obsolete restart-era transport does not return to the stable line.
- Documentation governance: before `doc/TODO/todo-plan.md`, every new scope must first live in `doc/SolidWorks-WorkFlow/Plans/`, while implemented SSOT remains only in `System/`, `Clusters/`, `Modules/`, and `Contracts/`.
- Agent instructions: `AGENTS.md` is the only git-tracked source of instructions; local `GEMINI.md` and `.claude/CLAUDE.md` are reduced to short redirect files.
- Release pipeline: local `build-all` must raise the unified version to `1.1.730` and rebuild provider/core/ui/launcher artifacts on top of that baseline.

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

Before starting, read `doc/SolidWorks-WorkFlow/Docs_Index.md` and follow the SSOT contracts in `doc/SolidWorks-WorkFlow/Contracts/` (especially `Contracts/Workflow_CLI.md`) to configure provider CLIs and SDKs.

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
