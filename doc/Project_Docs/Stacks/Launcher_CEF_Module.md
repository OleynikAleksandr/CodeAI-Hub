# Launcher CEF Module

## Overview
CodeAI Hub uses a dedicated Chromium Embedded Framework (CEF) launcher to run the standalone web client outside VS Code. The launcher ships as a platform-specific binary (`CodeAIHubLauncher`) and is coupled with the official CEF minimal runtime published by Spotify CDN. The extension downloads, installs, and upgrades the launcher automatically based on `assets/launcher/manifest.json`.

- **Current launcher version:** `CodeAIHubLauncher` 1.1.419 (macOS arm64)
- **CEF distribution:** minimal build `141.0.10+g1d65b0d+chromium-141.0.7390.123`
- **Primary install path:** `~/.codeai-hub/packages/launcher/<platform>/<version>/`
- **Legacy fallback:** `~/.codeai-hub/cef-launcher/<platform>/<version>/` (mirrored for backward compatibility)
- **Release cache:** `~/.codeai-hub/releases/CodeAIHubLauncher-<platform>-<version>.tar.bz2`

## Runtime Delivery
1. On activation the extension calls `ensureCefRuntime` and `ensureLauncherInstalled`.
2. The manifest entry (`baseUrl` → `file:///Users/oleksandroliinyk/.codeai-hub/releases/`) resolves to a tarball (`CodeAIHubLauncher-macos-arm64-1.1.419.tar.bz2`).
3. The archive is downloaded or reused from the local cache, verified via SHA-1 and unpacked into `~/.codeai-hub/packages/launcher/darwin-arm64/1.1.419/`.
4. Installation metadata is written to `install.json`, and downloads are mirrored under `downloads/` for reuse.
5. The extension generates `config/config.json` (Web Client) and `config/project-manager.json` (Project Manager) next to the binary, preserving any existing keys and updating `uiRoot`, `entry`, `url`, `generatedAt`, `workspacePath`.
6. The legacy path (`~/.codeai-hub/cef-launcher/...`) is symlinked or copied to keep older tooling working.
7. Launch relies on `CodeAIHubLauncher.app/Contents/MacOS/CodeAIHubLauncher` with arguments `--config=<path>` `--url=file://...` `--use-alloy-style`.

## Configuration & Autosave
- On macOS the launcher calls `setFrameAutosaveName(@"CodeAIHubMainWindow")`. Window geometry is handled by AppKit and stored in `~/Library/Preferences/com.codeaihub.launcher.plist`.
- Legacy coordinates (`CodeAIHubStandaloneWindowState`) are migrated once and then ignored.
- The launcher reads `config/config.json` (or `config/project-manager.json`) for:
  - `uiRoot` — absolute path to `~/.codeai-hub/packages/ui/<bundle>/current`
  - `entry` — `index.html`
  - `url` — resolved `file://` URL
  - Optional user-provided keys (proxy, diagnostics) remain untouched.

## Multi-Instance Architecture
To run multiple independent applications (Web Client + Project Manager), each instance uses a unique User Data Directory.
- **Web Client:** `~/.codeai-hub/data/web-client`
- **Project Manager:** `~/.codeai-hub/data/project-manager`

On macOS we use a Thin Bundle + Binary Copy strategy:
1. The base launcher is installed under `~/.codeai-hub/packages/launcher/...`.
2. When launching an app, the extension creates a lightweight `.app` wrapper in `~/.codeai-hub/apps/`.
3. The `CodeAIHubLauncher` binary is copied into the wrapper (`Contents/MacOS/<AppName>`).
4. `Info.plist` is generated with a unique `CFBundleIdentifier` (e.g., `com.codeaihub.web-client`).
5. The OS treats each wrapper as a distinct app, so window state persists independently.

## File Layout
```
~/.codeai-hub/
  packages/
    launcher/
      darwin-arm64/
        1.1.419/
          CodeAIHubLauncher.app
          config/
            config.json
            project-manager.json
          install.json
        current -> 1.1.419
    ui/
      web-client/
        1.1.419/
        current -> 1.1.419
      project-manager/
        1.1.419/
        current -> 1.1.419
  cef-launcher/
    darwin-arm64/
      1.1.419/  (legacy mirror)
  releases/
    CodeAIHubLauncher-macos-arm64-1.1.419.tar.bz2
```

## Build & Release Pipeline
- `scripts/build-cef-launcher.sh --launcher-version <semver>` assembles the launcher, stages it under `~/.codeai-hub/cef-launcher/<platform>/<version>/`, produces a tarball in `~/.codeai-hub/releases/`, and updates the manifest + local caches.
- `scripts/build-all.sh` orchestrates the launcher build as part of the unified release; during runtime the extension installs the launcher into `packages/launcher/**` and mirrors the legacy path if needed.

## Future Plans
- **Remote Bridge**: полноценная поддержка удаленного подключения (сейчас stub).
- **Auto-Update**: механизм самообновления лаунчера без перезапуска UI.
- **Native Menu**: расширение нативного меню (сейчас только базовое).
