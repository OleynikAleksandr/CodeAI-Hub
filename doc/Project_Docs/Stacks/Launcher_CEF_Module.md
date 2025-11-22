# Launcher CEF Module

## Overview
CodeAI Hub uses a dedicated Chromium Embedded Framework (CEF) launcher to run the standalone web client outside VS Code. The launcher ships as a platform-specific binary (`CodeAIHubLauncher`) and is coupled with the official CEF minimal runtime published by Spotify CDN. The extension downloads, installs, and upgrades the launcher automatically based on `assets/launcher/manifest.json`.

- **Current launcher version:** `CodeAIHubLauncher` 1.1.300 (macOS arm64)
- **CEF distribution:** minimal build `141.0.10+g1d65b0d+chromium-141.0.7390.123`
- **Bundle output:** `~/.codeai-hub/cef-launcher/<platform>/<version>/`

## Runtime Delivery
1. On activation the extension calls `ensureCefRuntime` and `ensureLauncherInstalled`.
2. The manifest entry (`baseUrl` → `file:///Users/oleksandroliinyk/.codeai-hub/releases/`) is resolved to a tarball (`CodeAIHubLauncher-macos-arm64-1.1.300.tar.bz2`).
3. The archive is downloaded or reused from the local cache, verified via SHA-1 and unpacked into `~/.codeai-hub/cef-launcher/darwin-arm64/1.1.300/`.
4. Installation metadata is written to `install.json`, and downloads are mirrored under `downloads/` for reuse.
5. The extension generates `config/config.json` next to the binary, preserving any existing keys and updating `uiRoot`, `entry`, `url`, `generatedAt`.
6. Launch relies on `CodeAIHubLauncher.app/Contents/MacOS/CodeAIHubLauncher` with arguments `--config=<path>` `--url=file://...` `--use-alloy-style`.

## Configuration & Autosave
- On macOS the launcher calls `setFrameAutosaveName(@"CodeAIHubMainWindow")`. Window geometry is handled by AppKit and stored in `~/Library/Preferences/com.codeaihub.launcher.plist`.
- Legacy coordinates (`CodeAIHubStandaloneWindowState`) are migrated once and then ignored.
- The launcher reads `config/config.json` for:
  - `uiRoot` — absolute path to `media/web-client/dist`
  - `entry` — `index.html`
  - `url` — resolved `file://` URL (fallback until dedicated scheme is shipped)
  - Optional user-provided keys (proxy, diagnostics) remain untouched.

## File Layout
```
~/.codeai-hub/
  cef-launcher/
    manifest.json
    darwin-arm64/
      1.1.300/
        CodeAIHubLauncher.app
        config/
          config.json
        install.json
      downloads/
        CodeAIHubLauncher-macos-arm64-1.1.300.tar.bz2
  releases/
    CodeAIHubLauncher-macos-arm64-1.1.300.tar.bz2
```

## Build & Release Pipeline
- `scripts/build-cef-launcher.sh --launcher-version <semver>` assembles the launcher, stages it under `~/.codeai-hub/cef-launcher/<platform>/<version>/`, produces a tarball in `doc/tmp/releases/`, and updates the manifest + local caches.
- The script downloads the official CEF minimal archive, configures the project via CMake, and copies required frameworks/resources (macOS bundles include helper apps).
- After running the script the manifest must be committed, and the tarball relocated to the release storage referenced by `baseUrl`.
- Unified release script `scripts/build-all.sh` поднимает версии core/launcher/провайдеров/VSIX и гарантирует, что `CodeAIHubLauncher-macos-arm64-<version>.tar.bz2` и `codeai-hub-core-darwin-arm64-<version>.tar.bz2` синхронизированы с текущим релизом.

## Integration Checklist
- Ensure the launcher version in `assets/launcher/manifest.json` matches the packaged tarball.
- Verify `config/config.json` retains user settings after regenerations (size, custom keys).
- Confirm `defaults read com.codeaihub.launcher NSWindow\ Frame\ CodeAIHubMainWindow` updates when resizing the standalone window.
- Provide shortcuts via `shortcut-manager`: `.app` on macOS, `.lnk` on Windows, `.desktop` on Linux (future work).
- Keep CEF ICU & framework files alongside the bundle; the launcher validates their presence before spawn.

## Local Web Client specifics
- The launcher serves the static React bundle from `media/web-client/dist/`.
- JS environment reuses `initializeStandaloneEnvironment` to emulate VS Code API. Messages flow through the stub bridge until Remote UI Bridge is enabled.
- When started without a pre-running core, the launcher first attempts to invoke the Supervisor CLI (`codeai-core start --host … --port …`); if the CLI is not available in `PATH`, it falls back to launching the core runtime directly via `<runtime>/node/bin/node app/dist/index.js`, using the same environment variables as the extension/CLI.
- DevTools can be toggled via CLI flag (add `--devtools` when launching manually).

## Future Work
- Publish launcher binaries for macOS x64, Windows x64/arm64, Linux x64 with the same manifest layout.
- Migrate from `file://` to custom `codeaihub://` scheme and enable remote bridge mode.
- Automate signing and distribution once public release infrastructure is ready.
