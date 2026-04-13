# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension + standalone Project Manager (CEF) that unifies multiple AI providers behind a single, type-safe orchestration layer.

- SolidWorks-WorkFlow docs index: `doc/SolidWorks-WorkFlow/Docs_Index.md`
- System SSOT: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Session input lock SSOT: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Bug registry: `doc/BugRegistry.md`

## Current Release — v1.1.969
- **Auto-select diagnostics routed into file logs**: standalone Project Manager now forwards usage-limits investigation events into Core-owned file logging, so the restore/bootstrap trace is captured in `~/.codeai-hub/logs/core/core.log`.
- **Refresh decision visibility in Core**: Core now records whether a manual usage-limits refresh found a runtime session, found a bound provider session id, and was actually dispatched to the provider adapter.
- **Diagnostic-only release**: this build is for isolating the auto-select usage-limits race after workspace open; it does not claim a behavioural fix yet.

### 1.1.968 (previous)
- **Dialog-session usage limits restored**: Project Manager dialog-mode sessions now trigger the same live `Session ID + Usage Limits` refresh path as runtime sessions, so limits render again on active workflow stage screens.
- **Live quota readers remain authoritative**: Codex, Claude, and Gemini limits continue to come from their provider-specific live quota/HTML readers, not from SDK usage logs or stale browser state.
- **Provider-global behavior retained**: sessions that use the same provider still converge to one provider-global usage scope (`claude:global`, `codex:global`, `gemini:global`) across workflow steps.

### 1.1.967 (previous)
- **Provider-global usage limits**: sessions that use the same provider now converge to a shared provider-global usage scope (`claude:global`, `codex:global`, `gemini:global`) instead of diverging by provider session id.
- **No stale usage-limits cache**: `Session ID + Usage Limits` no longer hydrates from persistent browser cache and now renders only from live snapshot state after refresh.
- **Legacy scope migration on restore**: restored workflow sessions with old session-specific usage-limit scope keys are normalized into the provider-global contract as soon as fresh limits arrive.

### 1.1.966 (previous)
- **Session-scoped usage limits refresh**: `Session ID + Usage Limits` now refreshes against the real active session context (`sessionId + providerId + providerSessionId`) instead of a provider-wide synthetic bucket.
- **Cold-start and stage-switch coverage**: usage limits refresh now reruns when Project Manager restores the active workflow session on workspace open and when the user switches to another workflow step/session.
- **Immediate rerender path**: Core broadcasts manual refresh results back into the concrete runtime `sessionId`, so the active snapshot updates immediately through the normal `session:stream -> snapshots -> rerender` flow.

### 1.1.922 (previous)
- **Sidecar v2 persists layout params**: `module-map.flow.json` schema bumped to `version: 2` with a new `layoutParams` section holding per-ProductPart (`columns`, `targetAspectRatio`) and per-Cluster (`moduleColumns`) CSS Grid overrides. Right-click selections now survive diagram reload, PM restart, and cross-window sidecar sync.
- **Backwards compatible with v1**: existing `module-map.flow.json` files from `1.1.921` still load without errors; missing `layoutParams` fall back to defaults, and on first context-menu edit the sidecar is upgraded to v2 automatically.
- **Enum-guarded parser**: invalid `columns` / `targetAspectRatio` / `moduleColumns` values are dropped per entry instead of failing the whole sidecar, so hand-edited files degrade gracefully to defaults.

### 1.1.921 (previous)
- **React Flow removed**: `@xyflow/react` dependency deleted; ProductPart cards render in single-column CSS Grid with native scroll.
- **CSS Grid at all levels**: ProductParts, Clusters, and Modules all use browser-native CSS Grid — zero JS layout code.
- **Right-click context menu** for ProductPart (columns, aspect ratio) and Cluster (module columns) layout overrides — in-memory only until Sidecar v2 in 1.1.922.
- **Cmd/Ctrl+scroll zoom** with smooth sensitivity; Cmd/Ctrl+0 resets to 100%; clickable zoom badge.
- **Edges between modules removed** from the diagram canvas.

Previous releases (summary): `1.1.800–1.1.917` — CSS Grid layout engine replacing the iterative settle-loop (~1350 lines deleted), standalone file-link query decode hotfixes, left-sidebar active-stage sync, temporary `Description`-first workspace startup, workflow-state startup SSOT alignment, Diagram Modules canonical English naming under localized prose, Codex raw-rollout dialog semantics, Codex empty-terminal answer recovery, the short-lived `Foundation Envelope` rollout later retired in `1.1.906`, the heuristic-only Diagram Modules boundary wave in `1.1.907–1.1.915`, and earlier localization/provider/release stabilization waves.

## Features
- **Unified provider orchestration**: launch Claude, Codex, or Gemini sessions from an identical picker; the dialog surfaces connection state, enforces one-provider selection, and reminds you to install/authenticate matching CLIs.
- **Description-first workflow**: the first guided workflow step is `Description`, producing `questionnaire.md` and `Final_Description.md` as the canonical entry into `Virtual Simulation`.
- **Persistent standalone UI**: the macOS launcher (CEF) stores window position and size in real time, so Project Manager reopens exactly where you left it—even across monitor changes.
- **Offline-first packaging**: manifests point to the local `~/.codeai-hub/releases/` cache, build scripts publish fresh tarballs for core, launcher, and provider modules without relying on GitHub downloads, and the shipped VSIX excludes repository-only Husky hook helpers.
- **Quality guardrails**: Ultracite architecture rules, jscpd duplication scans, knip dead-code detection, and Biome formatting are orchestrated through Husky pre-commit/pre-push hooks.

## Getting Started
```bash
git clone https://github.com/OleynikAleksandr/CodeAI-Hub.git
cd CodeAI-Hub
nvm use
npm install
```

Before starting, read `doc/SolidWorks-WorkFlow/Docs_Index.md` and follow the SSOT contracts in `doc/SolidWorks-WorkFlow/Contracts/` (especially `Contracts/Workflow_CLI.md`) to configure provider CLIs and SDKs.

## Development Workflow
1. Install dependencies
   ```bash
   npm install
   npm run setup:hooks    # installs Husky git hooks
   ```
2. Implement changes in `src/` and `packages/**` (micro-classes + facades; keep files under 500 lines).
3. Run quality checks before committing:
   ```bash
   npm run quality        # architecture gate + Ultracite lint
   npm run check:knip     # detect unused files/exports
   npm run compile        # ensure TypeScript builds cleanly
   ```

## Public CI
- GitHub Actions now runs a minimal public CI baseline on every push to `main` and on every pull request.
- The workflow enforces the same root quality gates used as the local baseline: `npm run check:architecture`, `npm run lint`, `npm run check:knip`, and `npm run compile`.
- The root `compile` gate now builds `@codeai-hub/translation`, `@codeai-hub/localization`, and `@codeai-hub/core-supervisor` before browser/root type-check, so clean GitHub runners do not depend on pre-existing workspace `dist/` folders.
- Local Husky hooks remain the fastest feedback path; CI is the public verification surface, not a replacement for the local release ritual.

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
This repository is currently distributed as `UNLICENSED`. Source is visible for audit and development collaboration, but redistribution requires explicit permission from the repository owner.
